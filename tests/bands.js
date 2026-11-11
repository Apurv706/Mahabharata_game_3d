/* Balance bands: how often each fight is won, in real time (engine/realtime.js's bot) and on the turns (the careful
   player of tests/balance.js), from a fixed seed, against the bands stored in tests/baselines/bands.json. The numbers
   come from tests/lives.js itself (RT=1 RTSTATS=1 COMPARE=1, as the tuning is measured: "node tests/lives.js 3000 11"),
   so they are the ones the tuning was done with. A fight leaves its band, or the overall rate leaves its own, and the
   check fails, naming the fight, its rate and its band.
   Bands: the recorded rate ± max(MARGIN, 3 standard errors) for a fight met at least MIN_N times in the sample (those
   met less are listed but not held to a band); overall ± 4 points. Tiers: quick (400 lives, seed 11), full (2400 lives,
   seed 11).
   Usage: node tests/bands.js [--tier quick|full] [--accept] [--json FILE]
          --accept   records this run's rates as the new bands for that tier (after a deliberate re-tuning). */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const H = require("./lib/harness");
const { arg, has } = H;
const TIER = arg("--tier", "quick");
const SIZE = { quick: { lives: 400, seed: 11 }, full: { lives: 2400, seed: 11 } }[TIER];
if (!SIZE) { console.error("tier must be quick or full"); process.exit(2); }
const BASE = path.join(__dirname, "baselines", "bands.json");
const MARGIN = 0.08, MIN_N = 25, OVERALL = 0.04;
const t0 = Date.now();
const tmp = path.join(H.SCRATCH, "bands-" + TIER + ".json");
fs.mkdirSync(path.dirname(tmp), { recursive: true });
const r = cp.spawnSync(process.execPath, [path.join(__dirname, "lives.js"), String(SIZE.lives), String(SIZE.seed)], { cwd: H.ROOT, encoding: "utf8", env: Object.assign({}, process.env, { RT: "1", RTSTATS: "1", COMPARE: "1", RTJSON: tmp }), maxBuffer: 1 << 26 });
if (!fs.existsSync(tmp)) { console.log("✗ tests/lives.js did not write its numbers (exit " + r.status + ")\n" + (r.stdout || "").slice(-800) + (r.stderr || "").slice(-800)); process.exit(1); }
if (r.status !== 0) console.log("  note: tests/lives.js reported problems (it is a check of its own): " + (r.stdout || "").trim().split("\n").slice(-1)[0]);
const data = JSON.parse(fs.readFileSync(tmp, "utf8"));
const rate = (o) => (o && o.n ? o.w / o.n : null);
const now = { fights: {}, overall: {} };
const ids = new Set(Object.keys(data.rt).concat(Object.keys(data.tb)));
for (const id of ids) now.fights[id] = { rt: data.rt[id] ? { p: rate(data.rt[id]), n: data.rt[id].n } : null, tb: data.tb[id] ? { p: rate(data.tb[id]), n: data.tb[id].n } : null };
const sum = (o) => Object.values(o).reduce((a, x) => [a[0] + x.w, a[1] + x.n], [0, 0]);
for (const k of ["rt", "tb"]) { const [w, n] = sum(data[k]); now.overall[k] = { p: n ? w / n : null, n }; }
const band = (x) => { if (!x || x.p == null) return null; const se = Math.sqrt(Math.max(x.p * (1 - x.p), 0.01) / x.n); const m = Math.max(MARGIN, 3 * se); return { lo: +Math.max(0, x.p - m).toFixed(3), hi: +Math.min(1, x.p + m).toFixed(3), p: +x.p.toFixed(3), n: x.n }; };
const pc = (p) => (p == null ? "-" : Math.round(p * 100) + "%");

if (has("--accept")) {
  const all = fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, "utf8")) : { _: "Balance bands (tests/bands.js): per fight, real time (rt) and turns (tb). Rewrite with node tests/bands.js --tier quick|full --accept after a deliberate re-tuning." };
  const t = { lives: SIZE.lives, seed: SIZE.seed, recorded: new Date().toISOString().slice(0, 10), overall: {}, fights: {} };
  for (const k of ["rt", "tb"]) { const o = now.overall[k]; t.overall[k] = o.p == null ? null : { lo: +(o.p - OVERALL).toFixed(3), hi: +(o.p + OVERALL).toFixed(3), p: +o.p.toFixed(3), n: o.n }; }
  for (const [id, f] of Object.entries(now.fights).sort()) t.fights[id] = { rt: f.rt && f.rt.n >= MIN_N ? band(f.rt) : f.rt ? { p: +f.rt.p.toFixed(3), n: f.rt.n } : null, tb: f.tb && f.tb.n >= MIN_N ? band(f.tb) : f.tb ? { p: +f.tb.p.toFixed(3), n: f.tb.n } : null };
  all[TIER] = t;
  fs.mkdirSync(path.dirname(BASE), { recursive: true });
  fs.writeFileSync(BASE, JSON.stringify(all, null, 1));
  console.log("bands recorded for the " + TIER + " tier: real time " + pc(now.overall.rt.p) + ", turns " + pc(now.overall.tb.p) + " over " + Object.keys(now.fights).length + " fights (" + SIZE.lives + " lives, seed " + SIZE.seed + ")");
  process.exit(0);
}
if (!fs.existsSync(BASE) || !JSON.parse(fs.readFileSync(BASE, "utf8"))[TIER]) { console.log("✗ no bands for the " + TIER + " tier: run node tests/bands.js --tier " + TIER + " --accept"); process.exit(1); }
const B = JSON.parse(fs.readFileSync(BASE, "utf8"))[TIER];
if (B.lives !== SIZE.lives || B.seed !== SIZE.seed) console.log("  note: the bands were recorded with " + B.lives + " lives, seed " + B.seed);
const out = [], rows = [];
const inBand = (x, b) => !b || b.lo == null || x == null || (x.p >= b.lo - 1e-9 && x.p <= b.hi + 1e-9);
for (const k of ["rt", "tb"]) { const o = now.overall[k], b = B.overall[k]; if (b && o.p != null && !inBand(o, b)) out.push("overall " + (k === "rt" ? "real time" : "turns") + ": " + pc(o.p) + " (band " + pc(b.lo) + "-" + pc(b.hi) + ", was " + pc(b.p) + ")"); }
for (const [id, f] of Object.entries(now.fights).sort()) {
  const b = B.fights[id] || {};
  for (const k of ["rt", "tb"]) {
    const x = f[k], bb = b[k];
    if (!x) continue;
    if (!bb) { if (x.n >= MIN_N) out.push(id + " " + k + ": no band recorded (a new fight? " + pc(x.p) + " of " + x.n + ")"); continue; }
    if (bb.lo != null && x.n >= MIN_N && !inBand(x, bb)) out.push(id + " " + (k === "rt" ? "real time" : "turns") + ": " + pc(x.p) + " of " + x.n + " (band " + pc(bb.lo) + "-" + pc(bb.hi) + ", was " + pc(bb.p) + ")");
  }
  rows.push("  " + id.padEnd(18) + " real time " + pc(f.rt && f.rt.p).padStart(4) + (f.rt ? " /" + String(f.rt.n).padStart(4) : "      ") + (b.rt && b.rt.lo != null ? " [" + pc(b.rt.lo) + "-" + pc(b.rt.hi) + "]" : "") + "   turns " + pc(f.tb && f.tb.p).padStart(4) + (b.tb && b.tb.lo != null ? " [" + pc(b.tb.lo) + "-" + pc(b.tb.hi) + "]" : ""));
}
for (const id of Object.keys(B.fights)) if (!now.fights[id]) out.push(id + ": in the bands but no life met it this time");
if (has("--table")) rows.forEach((x) => console.log(x));
for (const o of out) console.log("✗ " + o);
console.log("bands (" + TIER + ", " + SIZE.lives + " lives, seed " + SIZE.seed + "): real time " + pc(now.overall.rt.p) + " [" + pc(B.overall.rt && B.overall.rt.lo) + "-" + pc(B.overall.rt && B.overall.rt.hi) + "], turns " + pc(now.overall.tb.p) + " [" + pc(B.overall.tb && B.overall.tb.lo) + "-" + pc(B.overall.tb && B.overall.tb.hi) + "]; " + Object.keys(now.fights).length + " fights, " + (out.length ? out.length + " out of their bands" : "all in their bands") + " (" + ((Date.now() - t0) / 1000).toFixed(1) + " s)");
const JF = arg("--json", ""); if (JF) fs.writeFileSync(JF, JSON.stringify({ tier: TIER, out, overall: now.overall }));
process.exit(out.length ? 1 : 0);
