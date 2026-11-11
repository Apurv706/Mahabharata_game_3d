/* Real-time fights without a page: plays one fight (or every real-time fight) with the bot on a fresh
   grown-up life of each path and reports outcomes and how long they took (simulated seconds).
   Usage: node tests/rtsim.js [fights=all] [lives per path=10] */
const fs = require("fs");
const path = require("path");
const G = path.join(__dirname, "..");
global.window = global; global.K = {};
const html = fs.readFileSync(path.join(G, "index.html"), "utf8");
for (const src of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((s) => /js\/(engine|content)\//.test(s))) (0, eval)(fs.readFileSync(path.join(G, src), "utf8"));
K.UI = { esc: (s) => s }; K.save = () => true;
const only = process.argv[2] && process.argv[2] !== "all" ? process.argv[2].split(",") : null;
const N = parseInt(process.argv[3] || "10", 10);
const ids = only || [...K.RT.IDS].filter((id) => K.ENCOUNTERS[id]);
const res = {};
for (const id of ids) for (const pathId of Object.keys(K.PATHS)) for (let i = 0; i < N; i++) {
  K.seed(1000 + i * 31 + pathId.length);
  const S = (K.S = K.newLife()); S.name = "T"; S.path = pathId; S.age = 25; S.act = 6; S.side = "pandava";
  S.attrs.might = 2 + (i % 3); S.attrs.grace = 2 + ((i + 1) % 3); S.skills[K.PATHS[pathId].skill] = 2; S.items.herbs = 2;
  const out = K.RT.autoplay(id);
  const rec = K.RT.log[K.RT.log.length - 1];
  const r = (res[id] = res[id] || { win: 0, n: 0, t: 0, tries: 0, cap: 0, maxAtk: 0 });
  r.n++; if (out === "win" || out === "spare") r.win++; r.t += rec.t; if (rec.tries > 1) r.tries++; if (rec.capped) r.cap++; r.maxAtk = Math.max(r.maxAtk, rec.maxAtk);
}
for (const [id, r] of Object.entries(res)) console.log(id.padEnd(16) + " won " + Math.round(r.win / r.n * 100) + "%  mean " + (r.t / r.n).toFixed(1) + " s  retried " + r.tries + "  capped " + r.cap + "  max attacking " + r.maxAtk);
