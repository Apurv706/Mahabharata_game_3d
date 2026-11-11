/* Dash balance: runs the wheel dash's own rules (U.dashRules in game/js/ui/play.js) with a bot at
   four levels of skill and four levels of the player's stats, for both sides: driving in behind
   Abhimanyu ("open") and keeping the wheel shut ("close"). It reports how often each wins, comes
   close and loses, and fails if the dash is out of the bands below.
   The bot looks again every so often (a person's reaction time), with some error in where it thinks
   an opening will be; between looks it steers for what it last decided. Driving in, it picks the
   opening of the next ring it can reach when it gets there, and cracks the whip (or not) when lined
   up. Keeping it shut, it turns the ring whichever way puts the openings furthest from the chariots
   about to arrive.
   Usage: node tests/dash_balance.js [runs per cell] [--assist] */
const fs = require("fs");
const path = require("path");
const N = parseInt(process.argv[2] || "1000", 10);
const ASSIST = process.argv.includes("--assist");
const window = { K: { UI: { games: {} } } };
new Function("window", fs.readFileSync(path.join(__dirname, "..", "js", "ui", "play.js"), "utf8"))(window);
const U = window.K.UI, D = U.DASH, TAU = Math.PI * 2;

let seed = 7;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// see: mean and spread of the time between looks (s); err: error (along the ring, units) in where it
// thinks an opening (or a chariot) will be; whip: never, whenever lined up, or now and then.
// press: how far out (as a share) it holds a steering press, which it plans at each look and does
// not correct until the next (a person lets go a moment late, or early); focus: how many of the
// chariots about to arrive it keeps in mind at once.
const SKILL = {
  novice: { see: 0.5, sd: 0.15, err: 9, press: 0.45, whip: "never", focus: 1 },
  poor: { see: 0.4, sd: 0.12, err: 7, press: 0.35, whip: "never", focus: 1 },
  fair: { see: 0.32, sd: 0.08, err: 5, press: 0.25, whip: "some", focus: 2 },
  good: { see: 0.24, sd: 0.05, err: 3, press: 0.15, whip: "lined", focus: 3 }
};
const POWERS = [3, 6, 9, 12];

function open(power, sk) {
  const o = U.dashSetup({ mode: "open" }, power, ASSIST), R = U.dashRules(o, rng), dt = 1 / 60;
  let look = 0, target = null, press = 0, dir = 0;
  while (!R.over && R.t < 120) {
    const m = R.me;
    look -= dt; press -= dt;
    if (look <= 0 && m.passed < D.RINGS.length) {
      look = Math.max(0.08, sk.see + gauss() * sk.sd);
      const g = R.rings[m.passed], cr = R.contact(m.passed), spd = D.VR * (m.boost > 0 ? 2 : 1), tc = Math.max(0, (m.r - cr) / spd) + Math.max(0, m.stun);
      let best = null, bestReach = null;
      for (let k = 0; k < g.n; k++) {
        const ga = g.phi + (k * TAU) / g.n + (g.v / g.r) * tc, d = R.wrap(ga - m.a), need = (Math.abs(d) * m.r) / D.SIDE;
        if (best === null || Math.abs(d) < Math.abs(best)) best = d;
        if (need <= tc * 0.9 && (bestReach === null || Math.abs(d) < Math.abs(bestReach))) bestReach = d;
      }
      const d = bestReach !== null ? bestReach : best;
      target = m.a + d + (gauss() * sk.err) / g.r;
      // the whip: when the opening is lined up now and will still be when it gets there
      const lined = R.off(g, m.a) < g.half - D.WIDE - 2 && Math.abs(d) * g.r < 3;
      if (sk.whip === "lined" && lined && m.r - cr > 8) R.whip();
      else if (sk.whip === "some" && lined && rng() < 0.3) R.whip();
      // the press it plans: long enough to get there at full steering, give or take
      const e = R.wrap(target - m.a) * m.r;
      dir = Math.abs(e) > 1.5 ? Math.sign(e) : 0;
      press = dir ? Math.max(0.04, (Math.abs(e) / D.SIDE + D.SIDE / D.SIDE_ACC / 2) * (1 + gauss() * sk.press)) : 0;
    }
    R.step(dt, press > 0 ? dir : 0);
  }
  return R;
}

function close(power, sk) {
  const o = U.dashSetup({ mode: "close" }, power, ASSIST), R = U.dashRules(o, rng), dt = 1 / 60, M = R.my;
  let look = 0, steer = 0;
  while (!R.over && R.t < 120) {
    look -= dt;
    if (look <= 0) {
      look = Math.max(0.08, sk.see + gauss() * sk.sd);
      const cr = R.contact(), seen = R.cars.filter((c) => c.state === "come").map((c) => ({ a: c.a + (c.v / c.r) * 0.4 + (gauss() * sk.err) / c.r, tc: Math.max(0.15, (c.r - cr) / D.CV) })).filter((c) => c.tc < 4).sort((x, y) => x.tc - y.tc).slice(0, sk.focus); // a person watches the one or two about to arrive
      let bestS = 0, bestP = Infinity;
      for (const s of [0, -1, 1]) {
        const phi = M.phi + (s * D.MY_SPIN * 0.35) / M.r, ring = { r: M.r, n: M.n, phi };
        let p = 0;
        for (const c of seen) p += Math.max(0, M.half + 8 - R.off(ring, c.a)) / c.tc;
        if (p < bestP - 1e-6) { bestP = p; bestS = s; }
      }
      steer = bestS;
    }
    R.step(dt, steer);
  }
  return R;
}

const out = { open: {}, close: {} };
let bad = [];
for (const side of ["open", "close"]) {
  console.log((side === "open" ? "Driving in behind Abhimanyu" : "Keeping the wheel shut") + (ASSIST ? " (assist)" : "") + ": win / close / lose %, " + N + " runs a cell");
  console.log("            " + POWERS.map((p) => ("power " + p).padStart(16)).join(""));
  for (const [name, sk] of Object.entries(SKILL)) {
    const row = [];
    for (const p of POWERS) {
      const n = { win: 0, close: 0, lose: 0 }; let secs = 0, hits = 0;
      for (let i = 0; i < N; i++) { const R = side === "open" ? open(p, sk) : close(p, sk); n[R.outcome]++; secs += R.t; hits += side === "open" ? R.me.hits : R.breaches; }
      const pct = (k) => Math.round((100 * n[k]) / N);
      out[side][name + "@" + p] = { win: pct("win"), close: pct("close"), lose: pct("lose"), secs: +(secs / N).toFixed(1), hits: +(hits / N).toFixed(2) };
      row.push((pct("win") + "/" + pct("close") + "/" + pct("lose")).padStart(16));
    }
    console.log(name.padEnd(12) + row.join(""));
  }
}
// The bands: a fair player of middling stats wins most of the time but not always; a good one nearly
// always; a novice of low stats sometimes. Assist (and story mode) only ever helps.
if (!ASSIST) {
  const w = (side, k) => out[side][k].win;
  for (const side of ["open", "close"]) {
    if (w(side, "fair@6") < 55 || w(side, "fair@6") > 85) bad.push(side + ": a fair player at power 6 wins " + w(side, "fair@6") + "% (55-85)");
    if (w(side, "good@9") < 85) bad.push(side + ": a good player at power 9 wins " + w(side, "good@9") + "% (85+)");
    if (w(side, "novice@3") < 10 || w(side, "novice@3") > 60) bad.push(side + ": a novice at power 3 wins " + w(side, "novice@3") + "% (10-60)");
    if (w(side, "fair@12") < w(side, "fair@3")) bad.push(side + ": more stats should not make it harder");
  }
}
fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "out", "dash_balance.json"), JSON.stringify(out, null, 1));
if (bad.length) { console.log("✗ " + bad.join("\n✗ ")); process.exit(1); }
console.log("✓ the dash is in its bands");
