/* Random lives played through the engine alone (no page): every choice through K.choose and every
   fight through K.combatOutcome, as the interface does. Fast (a few thousand lives a minute), so it can
   run in CI. Checks what the page tests cannot reach:
   - a saved life comes back from K.cleanLife unchanged (save codes are cleaned before use);
   - Continue resumes on the scene that was saved (it is never skipped or replaced);
   - no text shows an unfilled {token};
   - nobody fights on both sides of the same battle, and a friend called for help is not already there;
   - nothing throws, and every life ends.
   By default a real-time fight (PRD §18.15) is played by engine/realtime.js's bot for its outcome
   instead of a random one, and each is checked to end with a proper outcome; RT=0 (or --turns) gives
   every fight a random outcome as on the turns.
   Usage: node tests/lives.js [lives=400] [seed=1] [--turns] */
const fs = require("fs");
const path = require("path");
const G = path.join(__dirname, "..");
global.window = global; global.K = {};
const html = fs.readFileSync(path.join(G, "index.html"), "utf8");
for (const src of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((s) => /js\/(engine|content)\//.test(s))) {
  (0, eval)(fs.readFileSync(path.join(G, src), "utf8") + "\n//# sourceURL=" + src);
}
K.UI = { esc: (s) => s };
(0, eval)(fs.readFileSync(path.join(G, "js/ui/map.js"), "utf8")); // K.locOf, used by the homeland helpers
K.save = () => true;
const RTM = process.env.RT !== "0" && !process.argv.includes("--turns"); // real-time by default (RT=0 or --turns: every fight on the turns)
K.RT.force = RTM;
let rtFights = 0;
const rtStats = {}, tbStats = {}, rtPath = {};
if (RTM && process.env.PARAMS) Object.assign(K.RT.P, JSON.parse(process.env.PARAMS));
if (RTM && process.env.TUNE) K.RT.TUNE = JSON.parse(require("fs").readFileSync(process.env.TUNE, "utf8"));

const N = parseInt(process.argv[2] || "400", 10), SEED = parseInt(process.argv[3] || "1", 10);
const problems = new Map();
const add = (k, v) => { const m = problems.get(k) || new Map(); m.set(v, (m.get(v) || 0) + 1); problems.set(k, m); };
const pick = (a) => a[Math.floor(K.rng() * a.length)];
const TOK = /\{(\w+)(!?)(?::[^}]*)?\}/;
const txt = (s, where) => { if (s == null || s === "") return; let out; try { out = K.text(s); } catch (e) { add("text throws", where + ": " + e.message); return; } if (typeof out === "string" && TOK.test(out)) add("unfilled token", where + ": " + out.slice(0, 120)); };
const blocks = (b, where) => { for (const x of [].concat(K.val(b) || []).filter(Boolean)) { if (typeof x === "string" || Array.isArray(x)) txt(x, where); else if (x.line) txt(x.line, where); else if (x.memory) txt(x.memory, where); else if (x.aside) txt(x.aside, where); } };
const sorted = (v) => (Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v);
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
const unitName = (u, S) => { const x = typeof u === "string" && K.UNITS && K.UNITS[u] ? K.UNITS[u](S) : u; return x && (x.person || x.name); };

let lives = 0, ended = 0;
for (let i = 0; i < N; i++) {
  K.seed(SEED * 100003 + i * 7);
  const S = (K.S = K.newLife());
  if (K.momentQueue) K.momentQueue.length = 0;
  S.name = "Ira"; S.pronoun = pick(["she", "he", "they"]);
  S.origin = pick(Object.keys(K.ORIGINS)); S.temperament = pick(Object.keys(K.TEMPERAMENTS)); S.heirloom = pick(Object.keys(K.HEIRLOOMS));
  S.storyMode = K.rng() < 0.15;
  K.apply(K.ORIGINS[S.origin].fx); K.apply(K.TEMPERAMENTS[S.temperament].fx); K.apply(K.HEIRLOOMS[S.heirloom].fx);
  K.apply({ flag: ["origin_" + S.origin, "temper_" + S.temperament, "heir_" + S.heirloom] });
  lives++;
  try { K.go(K.FIRST_SCENE); } catch (e) { add("throws", "start: " + e.message); continue; }
  for (let steps = 0; steps < 700; steps++) {
    const sc = K.SCENES[K.S.scene];
    // Save and Continue at this scene: the cleaned copy is the same life, and it resumes here.
    const saved = JSON.parse(JSON.stringify(K.S));
    let back;
    try { back = K.cleanLife(K.migrate(JSON.parse(JSON.stringify(saved)))); } catch (e) { add("cleanLife throws", sc.id + ": " + e.message); }
    if (back && !same(back, saved)) {
      const diff = Object.keys(saved).filter((k) => JSON.stringify(sorted(saved[k])) !== JSON.stringify(sorted(back[k])));
      add("cleanLife changed a real save", sc.id + ": " + diff.join(",") + (process.env.DBG ? " " + diff.map((k) => JSON.stringify(saved[k]) + " => " + JSON.stringify(back[k])).join(" ; ").slice(0, 300) : ""));
    }
    if (back && K.rng() < 0.08) {
      const live = K.S;
      try { K.resume(back); if (K.S.scene !== sc.id) add("Continue moved to another scene", sc.id + " -> " + K.S.scene); } catch (e) { add("throws", "resume " + sc.id + ": " + e.message); }
      K.S = live;
    }
    if (sc.ending) { try { const e = sc.ending(K.S); (e.telling || []).forEach((l) => txt(l, "telling")); (e.fates || []).forEach((l) => txt(l, "fates")); } catch (e) { add("throws", sc.id + ".ending: " + e.message); } ended++; break; }
    try { blocks(sc.body, sc.id + ".body"); blocks(sc.witness, sc.id + ".witness"); } catch (e) { add("throws", sc.id + ".body: " + e.message); }
    const list = K.choiceList(sc).filter((x) => x.ok);
    if (!list.length) { add("no choice available", sc.id); break; }
    const { c } = pick(list);
    let res;
    try { res = c.game ? K.choose(sc, c, pick(["win", "close", "lose"])) : K.choose(sc, c); } catch (e) { add("throws", sc.id + ":" + c.id + ": " + e.message); break; }
    txt(res.text, sc.id + ":" + c.id + " result");
    try { blocks(res.after, sc.id + ":" + c.id + " after"); } catch (e) { /* not text blocks */ }
    let next = res.next;
    if (res.combat) {
      const enc = K.ENCOUNTERS[res.combat];
      const foes = (K.val(enc.enemies) || []).map((u) => unitName(u, K.S)).filter(Boolean);
      const allies = (K.val(enc.allies) || []).map((u) => unitName(u, K.S)).filter(Boolean);
      for (const a of allies) if (foes.includes(a)) add("fights on both sides", res.combat + ": " + a);
      if (enc.callHelp) { try { const h = enc.callHelp(K.S); const who = h && h.unit && (h.unit.person || h.unit.name); if (who && (foes.includes(who) || allies.includes(who))) add("called friend is already in the fight", res.combat + ": " + who); } catch (e) { add("throws", res.combat + ".callHelp: " + e.message); } }
      let r;
      let out = K.rng() < 0.4 ? "win" : "lose";
      if (RTM && process.env.COMPARE && K.RT.isRealtime(enc)) {
        // The same fight on the turns first, played as tests/balance.js plays it, on a copy of the life.
        const keep = JSON.stringify(K.S), C = K.Combat;
        C.humanDefense = { counter: 0.12, block: 0.5 };
        const B = C.start(res.combat, null);
        for (let i = 0; i < 400 && !B.over; i++) {
          const p = C.player(), rows = C.available().filter((a) => !a.why);
          const heavy = B.units.filter((u) => u.side === "enemy" && u.hp > 0).map(C.threat).filter(Boolean).some((t) => t.heavy);
          const last = B.habit[B.habit.length - 1], has = (id) => rows.find((a) => a.id === id);
          const sp = rows.filter((a) => !["strike", "guard", "herbs"].includes(a.id));
          const id = p.hp < p.maxHp * 0.35 && has("herbs") ? "herbs" : heavy && has("guard") && !(last && last.id === "guard") && p.hp < p.maxHp * 0.7 ? "guard" : sp.length ? sp[0].id : "strike";
          if (!C.act(id, null)) C.act("strike", null);
        }
        const tst = (tbStats[res.combat] = tbStats[res.combat] || { w: 0, n: 0 }); tst.n++; if (B.over === "win" || B.over === "spare") tst.w++;
        C.end(); K.S = JSON.parse(keep);
      }
      if (RTM && K.RT.isRealtime(enc)) {
        try { out = K.RT.autoplay(res.combat, { spare: process.env.RTSTATS ? 0 : 0.3 }); rtFights++; const L = K.RT.log[K.RT.log.length - 1]; const st = (rtStats[L.id] = rtStats[L.id] || { w: 0, n: 0, t: [], tries: 0 }); st.n++; { const pp = (rtPath[K.S.path] = rtPath[K.S.path] || [0, 0]); pp[1]++; if (out === "win" || out === "spare") pp[0]++; } if (out === "win" || out === "spare") st.w++; if ((out === "win" || out === "spare") && L.tries === 1) st.w1 = (st.w1 || 0) + 1; st.t.push(L.t); if (L.tries > 1) st.tries++; } catch (e) { add("throws", res.combat + " real-time: " + e.stack.split("\n").slice(0, 3).join(" | ")); break; }
        if (!["win", "lose", "flee", "spare"].includes(out)) add("real-time fight without an outcome", res.combat + ": " + out);
        if (K.RT.last && K.RT.last.capped) add("real-time fight ran out of time", res.combat);
      }
      try { r = K.combatOutcome(res.combat, out, res.next); } catch (e) { add("throws", res.combat + " outcome: " + e.message); break; }
      txt(r.text, res.combat + " result");
      next = r.next;
    }
    if (!K.S.alive) next = "end_death";
    try { K.go(next); } catch (e) { add("throws", sc.id + ":" + c.id + " -> " + next + ": " + e.message); break; }
  }
}
if (RTM && process.env.RTSTATS && Object.keys(rtPath).length) console.log("  real-time by path: " + Object.entries(rtPath).sort().map(([k, v]) => k + " " + Math.round(v[0] / v[1] * 100) + "%").join(", "));
if (RTM && process.env.RTJSON) require("fs").writeFileSync(process.env.RTJSON, JSON.stringify({ rt: rtStats, tb: tbStats }));
if (RTM && process.env.RTSTATS) {
  let w = 0, n = 0, T = [];
  for (const [id, r] of Object.entries(rtStats).sort()) { w += r.w; n += r.n; T.push(...r.t); const m = r.t.reduce((a, b) => a + b, 0) / r.n; const tb = tbStats[id]; console.log("  " + id.padEnd(16) + String(r.w).padStart(4) + " /" + String(r.n).padStart(4) + "  " + String(Math.round(r.w / r.n * 100)).padStart(3) + "% (first try " + String(Math.round((r.w1 || 0) / r.n * 100)).padStart(3) + "%)  " + m.toFixed(1) + " s  retried " + r.tries + (tb ? "   turns " + Math.round(tb.w / tb.n * 100) + "%" : "")); }
  if (Object.keys(tbStats).length) { let a = 0, b = 0; for (const r of Object.values(tbStats)) { a += r.w; b += r.n; } console.log("  all on the turns: " + Math.round(a / b * 100) + "% won"); }
 const w1 = Object.values(rtStats).reduce((a, r) => a + (r.w1 || 0), 0); let err = 0; for (const [id, r] of Object.entries(rtStats)) if (tbStats[id]) err += r.n * Math.pow((r.w1 || 0) / r.n - tbStats[id].w / tbStats[id].n, 2);
  const grp = (S) => { const g = { even: [0, 0], hard: [0, 0] }; for (const [id, r] of Object.entries(S)) { const e = K.ENCOUNTERS[id], k = e && e.hard ? "hard" : "even"; g[k][0] += r.w; g[k][1] += r.n; } return g; };
  const pc = (x) => (x[1] ? Math.round(x[0] / x[1] * 100) + "%" : "none");
  { const a = grp(rtStats), b = grp(tbStats); console.log("  even fights: real-time " + pc(a.even) + ", turns " + pc(b.even) + " · hard fights: real-time " + pc(a.hard) + ", turns " + pc(b.hard)); }
  console.log("  all real-time: " + Math.round(w / n * 100) + "% won (" + Math.round(w1 / n * 100) + "% at the first try; per-fight gap to the turns " + Math.sqrt(err / n).toFixed(3) + "), mean " + (T.reduce((a, b) => a + b, 0) / T.length).toFixed(1) + " s");
}
let bad = 0;
for (const [k, m] of problems) { bad += [...m.values()].reduce((a, b) => a + b, 0); console.log("✗ " + k + " (" + m.size + " kinds)"); [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([v, n]) => console.log("    " + n + "× " + v)); }
console.log(lives + " lives, " + ended + " reached an ending; " + (bad ? bad + " problems" : "no problems") + (RTM ? "; " + rtFights + " real-time fights played by the bot" : ""));
process.exit(bad || ended < lives ? 1 : 0);
