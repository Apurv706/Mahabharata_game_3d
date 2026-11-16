/* How much a fight asks of the player (review of 16 November). Every fight is played in the 3D rules, with no page,
   by five kinds of player, on the same lives and seeds tests/fights.js uses:
     careful      the game's own fighter: reads most blows, guards and rolls, uses the path skill, herbs, help, weapons
     no-aids      the same hands, but no path skill, no herbs, no call for help, no divine weapon
     striker      never guards or rolls: walks up and strikes, and still uses skill and aids
     bare-striker never guards or rolls, and uses nothing: walk up and strike
     idle         does nothing at all
   If a striker wins a fight nearly as often as a careful player, defence is not needed in it; if bare-striker does too,
   nothing is. If idle lasts long, the fight puts little pressure on.
   Usage: node tools/review/fight_depth.js [runs=14] [seed=11] [filter-regex] [--json FILE] */
"use strict";
const path = require("path"), fs = require("fs");
const boot = require(path.join(__dirname, "..", "..", "tests", "lib", "boot.js"));
const runs = +process.argv[2] || 14, seed = +process.argv[3] || 11, filter = process.argv[4] && !process.argv[4].startsWith("--") ? new RegExp(process.argv[4]) : null;
const JSON_OUT = (() => { const i = process.argv.indexOf("--json"); return i > 0 ? process.argv[i + 1] : ""; })();
const K = boot({ seed }), R3 = K.RT3, C = K.Combat, P = R3.P;
const PATHS = Object.keys(K.PATHS);
const ACT_OF = (id) => (/^e_(ugra|dream)/.test(id) ? 1 : /^e_(spar|panchala|border|bandits)/.test(id) ? 2 : /^e_kings/.test(id) ? 3 : /^e_(sudatta)/.test(id) ? 4 : /^e_(gandharva|jayadratha|cattle)/.test(id) ? 5 : 6);
function life(id, pth, i) {   // the same plausible life tests/fights.js gives each fight
  const S = K.newLife(), act = ACT_OF(id);
  Object.assign(S, { name: "Test", origin: "hastinapura", pronoun: i % 2 ? "she" : "he", temperament: "bold", heirloom: "bow", path: act >= 2 ? pth : null, side: act >= 6 ? (i % 2 ? "kaurava" : "pandava") : null, storyMode: false });
  K.S = S;
  const g = { 1: [13, 3, 3, 2, 1], 2: [18, 3, 4, 3, 4], 3: [25, 3, 4, 4, 4], 4: [30, 3, 4, 4, 5], 5: [36, 3, 4, 4, 5], 6: [44, 4, 4, 4, 5] }[act];
  S.act = act; S.age = g[0]; S.attrs = { might: g[1], aim: g[3], grace: g[2], wisdom: g[3], command: g[3] };
  const PP = K.PATHS[S.path] || {};
  S.skills = { archery: 0, mace: 1, chariot: 0, statecraft: 0, healing: 0, stealth: 0, lore: 0 }; if (PP.skill) S.skills[PP.skill] = g[4];
  S.items = { herbs: 2 }; if (act >= 6) S.flags.push("role_front");
  S.fought = { [act]: 4 };
  return S;
}
const seedOf = (id, i) => { let h = 2166136261 ^ seed; for (let k = 0; k < id.length; k++) { h ^= id.charCodeAt(k); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000003) * 31 + i * 7919 + 1; };
const AIDS = { skill: 1, herbs: 1, call: 1, astra: 1 };
const STYLES = { careful: {}, "no-aids": { noAids: true }, striker: { blind: true }, "bare-striker": { blind: true, noAids: true }, idle: { idle: true } };
function act(R, st) {
  if (st.idle) return R.offer ? { duel: "no" } : {};
  const th = R3.threats, can = R3.can, as = R3.astras;
  if (st.blind) R3.threats = () => [];
  if (st.noAids) { R3.can = (r, w) => (AIDS[w] ? false : can(r, w)); R3.astras = () => []; }
  let a; try { a = R3.bot(R, {}); } finally { R3.threats = th; R3.can = can; R3.astras = as; }
  return a;
}
function play(encId, st) {
  let B = C.start(encId, null), R = R3.begin(B, {});
  const run = () => { let guard = 0; while (!R.over && guard++ < 60 * (P.cap + 30)) R3.step(R, act(R, st)); };
  run(); let total = R.t, tries = 1;
  if (R.over === "retry") { R = R3.retry(R); B = R.B; run(); total += R.t; tries = 2; }
  const p = C.player(), hp = Math.round(100 * p.hp / p.maxHp), first = tries === 1 ? R.t : total - R.t;
  const done = C.end();
  return { out: done ? done.over : R.over, t: total, tries, hp, first };
}
const rows = [];
for (const enc of Object.values(K.ENCOUNTERS)) {
  if (filter && !filter.test(enc.id)) continue;
  const r = { id: enc.id, act: ACT_OF(enc.id), hard: !!enc.hard, lethal: !!enc.lethal };
  for (const [name, st] of Object.entries(STYLES)) {
    const x = { n: 0, win: 0, t: 0, hp: 0, retry: 0 };
    for (let i = 0; i < runs; i++) {
      K.seed(seedOf(enc.id, i)); life(enc.id, PATHS[i % PATHS.length], i);
      try { const o = play(enc.id, st); x.n++; if (o.out === "win" || o.out === "spare") x.win++; x.t += o.t; x.hp += o.hp; if (o.tries > 1) x.retry++; } catch (e) { x.err = String(e.message).slice(0, 80); break; }
    }
    r[name] = { win: Math.round(100 * x.win / Math.max(1, x.n)), secs: Math.round(x.t / Math.max(1, x.n)), hp: Math.round(x.hp / Math.max(1, x.n)), retry: x.retry, err: x.err };
  }
  rows.push(r);
  console.log((r.id + "                    ").slice(0, 19) + Object.keys(STYLES).map((s) => (s.slice(0, 7) + " " + String(r[s].win).padStart(3) + "% " + String(r[s].secs).padStart(3) + "s hp" + String(r[s].hp).padStart(3)).padEnd(26)).join(""));
}
const mean = (f) => Math.round(rows.reduce((a, r) => a + f(r), 0) / Math.max(1, rows.length));
const sum = {};
for (const s of Object.keys(STYLES)) sum[s] = { win: mean((r) => r[s].win), secs: mean((r) => r[s].secs), hpLeft: mean((r) => r[s].hp), fightsNeverLost: rows.filter((r) => r[s].win === 100).length, fightsWonHalfOrMore: rows.filter((r) => r[s].win >= 50).length };
console.log("\n" + rows.length + " fights, " + runs + " runs each");
for (const [s, v] of Object.entries(sum)) console.log(s.padEnd(13) + JSON.stringify(v));
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ runs, seed, sum, rows }, null, 1));
