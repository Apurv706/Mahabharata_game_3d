// Every fight of the game, played by the bot in the 3D simulation: outcomes, length, and the win rate per fight.
//   node tests/fights.js [runs=12] [seed=11] [filter-regex] [--story]
const boot = require("./lib/boot.js");
const runs = +process.argv[2] || 12, seed = +process.argv[3] || 11, filter = process.argv[4] && !process.argv[4].startsWith("--") ? new RegExp(process.argv[4]) : null, story = process.argv.includes("--story");
const K = boot({ seed });
const PATHS = Object.keys(K.PATHS);
// A plausible life for a fight: its act's age and stats (as the 2D game's fighter ladder grows them), a path, a side.
const ACT_OF = (id) => (/^e_(ugra|dream)/.test(id) ? 1 : /^e_(spar|panchala|border|bandits)/.test(id) ? 2 : /^e_kings/.test(id) ? 3 : /^e_(sudatta)/.test(id) ? 4 : /^e_(gandharva|jayadratha|cattle)/.test(id) ? 5 : 6);
function life(id, path, i) {
  const S = K.newLife(), act = ACT_OF(id);
  Object.assign(S, { name: "Test", origin: "hastinapura", pronoun: i % 2 ? "she" : "he", temperament: "bold", heirloom: "bow", path: act >= 2 ? path : null, side: act >= 6 ? (i % 2 ? "kaurava" : "pandava") : null, storyMode: story });
  K.S = S; K.fighterGrow ? 0 : 0;
  const g = { 1: [13, 3, 3, 2, 1], 2: [18, 3, 4, 3, 4], 3: [25, 3, 4, 4, 4], 4: [30, 3, 4, 4, 5], 5: [36, 3, 4, 4, 5], 6: [44, 4, 4, 4, 5] }[act];
  S.act = act; S.age = g[0]; S.attrs = { might: g[1], aim: g[3], grace: g[2], wisdom: g[3], command: g[3] };
  const P = K.PATHS[S.path] || {};
  S.skills = { archery: 0, mace: 1, chariot: 0, statecraft: 0, healing: 0, stealth: 0, lore: 0 }; if (P.skill) S.skills[P.skill] = g[4];
  S.items = { herbs: 2 }; if (act >= 6) S.flags.push("role_front");
  return S;
}
const rows = [];
for (const enc of Object.values(K.ENCOUNTERS)) {
  if (filter && !filter.test(enc.id)) continue;
  const r = { id: enc.id, n: 0, win: 0, lose: 0, other: 0, t: 0, retry: 0, hp: 0, err: null, byPath: {} };
  for (let i = 0; i < runs; i++) {
    const path = PATHS[i % PATHS.length];
    try {
      life(enc.id, path, i);
      const out = K.RT3.autoplay(enc.id, {}), rec = K.RT3.log[K.RT3.log.length - 1];
      r.n++; r.t += rec.t; r.hp += rec.hp; if (rec.tries > 1) r.retry++;
      if (out === "win" || out === "spare") { r.win++; (r.byPath[path] = r.byPath[path] || [0, 0])[0]++; } else if (out === "lose") r.lose++; else r.other++;
      (r.byPath[path] = r.byPath[path] || [0, 0])[1]++;
      if (rec.capped) r.capped = (r.capped || 0) + 1;
    } catch (e) { r.err = String(e.stack || e).split("\n").slice(0, 3).join(" | "); break; }
  }
  rows.push(r);
}
let bad = 0;
for (const r of rows) {
  if (r.err) { bad++; console.log("ERROR " + r.id + ": " + r.err); continue; }
  const pct = Math.round((100 * r.win) / Math.max(1, r.n));
  console.log((r.id + "                    ").slice(0, 20) + " win " + String(pct).padStart(3) + "%  " + String(Math.round(r.t / r.n)).padStart(3) + "s  hp " + String(Math.round(r.hp / r.n)).padStart(3) + "%  retry " + r.retry + (r.capped ? "  CAPPED " + r.capped : "") + (r.other ? "  other " + r.other : "") +
    "  " + Object.entries(r.byPath).map(([p, [w, n]]) => p.slice(0, 3) + ":" + w + "/" + n).join(" "));
}
const all = rows.filter((r) => !r.err);
console.log("\nfights " + rows.length + "  errors " + bad + "  mean win " + Math.round(all.reduce((s, r) => s + (100 * r.win) / Math.max(1, r.n), 0) / Math.max(1, all.length)) + "%  mean length " + Math.round(all.reduce((s, r) => s + r.t / Math.max(1, r.n), 0) / Math.max(1, all.length)) + "s");
process.exit(bad ? 1 : 0);
