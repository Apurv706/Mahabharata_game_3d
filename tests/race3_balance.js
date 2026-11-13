/* The free-steering race's balance (rules: js/ui/tests3d/race.js), beside the lane race it replaces in the 3D game.
   A bot drives at four levels of skill (the same four as tests/race_balance.js: how long it takes to notice a thing in
   the road, how often it never notices, how often it answers a cut, whether it keeps clear of the rival, how it uses
   the whip). It steers for the nearest clear way round what it has noticed, looking two things ahead.
   Printed: how often it wins (close finishes in brackets) against Karna, and through a road with no rival, with the lane
   race's own figures beside them, so the new race can be kept about as hard as the old.
   Usage: node tests/race3_balance.js [races per cell] */
const fs = require("fs"), path = require("path");
const N = parseInt(process.argv[2] || "600", 10);
const window = { K: { UI: { games: {} } } };
for (const f of ["js/ui/play.js", "js/ui/tests3d/race.js"]) new Function("window", fs.readFileSync(path.join(__dirname, "..", f), "utf8"))(window);
const U = window.K.UI, D = U.ROAD;
let seed = 1;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SKILL = {
  novice: { see: 1.0, sd: 0.35, slip: 0.5, dodge: 0.35, careful: 0.2, whip: "lazy", sloppy: 0.5 },
  poor: { see: 0.85, sd: 0.3, slip: 0.35, dodge: 0.5, careful: 0.3, whip: "lazy", sloppy: 0.35 },
  fair: { see: 0.6, sd: 0.22, slip: 0.2, dodge: 0.75, careful: 0.6, whip: "ready", sloppy: 0.2 },
  good: { see: 0.42, sd: 0.14, slip: 0.08, dodge: 0.95, careful: 0.9, whip: "smart", sloppy: 0.08 }
};
const KARNA = { attr: "grace", skill: "chariot", rival: "Karna", vehicle: "chariot", obstacles: ["rock", "wreck"] };
const ROADS = { "chariot, no rival": { vehicle: "chariot", obstacles: ["rock", "wreck"], hull: 3, speed: 3.2 }, "boat in the storm": { vehicle: "boat", obstacles: ["wave", "rock"], hull: 3 },
  "on foot, storm": { vehicle: "foot", obstacles: ["rock", "fire"], hull: 3, speed: 3 }, "on foot, arrows": { vehicle: "foot", obstacles: ["arrow", "fire"], hull: 3, speed: 2.4 }, "night road": { vehicle: "chariot", obstacles: ["wreck", "fire"], hull: 3, speed: 3.5 } };

function free(power, sk, cfg, whipUse, stat) {
  const o = Object.assign(U.raceSetup3(cfg, power), { who: cfg.rival || "" }), R = U.raceRules3(o, rng, cfg.vehicle || "chariot"), dt = 1 / 60;
  const seen = new Map(), heeds = rng() < sk.careful, react = () => Math.max(0.15, sk.see + gauss() * sk.sd), edge = D.W - R.half;
  let dodgeAt = -1, lazy = -1, xT = 0, steer = 0, wobble = 0;
  const level = () => Math.abs(R.rival - R.dist) < U.RACE.LEVEL;
  for (let i = 0; i < 100 / dt && !R.over; i++) {
    for (const e of R.step(dt, steer)) {
      if (e.type === "spawn") seen.set(e.o, rng() < sk.slip ? Infinity : R.t + react());
      if (e.type === "warn" && rng() < sk.dodge) dodgeAt = R.t + Math.min(react(), 0.6);
      if (e.type === "cut" || e.type === "clash") dodgeAt = -1;
    }
    if (R.over) break;
    // Where to be: clear of the next thing it has noticed, on the side that is nearer and that the thing after it leaves open.
    const m = R.half + 0.3 + sk.sloppy * 0.25, ahead = R.obs.filter((ob) => !ob.hit && ob.x > D.AT - 6 && ob.x < 100 && seen.get(ob) <= R.t).sort((a, b) => a.x - b.x).slice(0, 2);
    let want = xT; const bad = (xx) => o.contact && heeds && level() && Math.abs(xx - R.rx) < 2 * R.half + 0.3;
    if (ahead.length && Math.abs(ahead[0].ox - want) < ahead[0].r + m) {
      const ob = ahead[0], nx = ahead[1], c = [ob.ox - ob.r - m, ob.ox + ob.r + m].filter((v) => Math.abs(v) <= edge);
      const cost = (v) => Math.abs(v - R.x) + (nx && Math.abs(nx.ox - v) < nx.r + m ? 1.5 : 0) + (bad(v) ? 2.5 : 0);
      if (c.length) want = c.sort((a, b) => cost(a) - cost(b))[0];
    }
    if (!ahead.length && Math.abs(want) > edge - 0.4) want *= 0.98;                       // drift off the rails when the road is clear
    if (o.contact && heeds && level() && Math.abs(want - R.rx) < 2 * R.half + 0.3 && !ahead.length) want = clamp(R.rx + Math.sign(R.x - R.rx || 1) * (2 * R.half + 0.6), -edge, edge);
    if (dodgeAt >= 0 && R.t >= dodgeAt && R.cut > 0) { dodgeAt = -1; const away = R.x + Math.sign(R.x - R.rx || 1) * 2.2; if (Math.abs(away) <= edge) want = away; else if (whipUse !== "never") R.whip(); }
    xT = want;
    if ((wobble -= dt) <= 0) wobble = 0.5 + rng();                                         // an unsteady hand: the worse the driver, the more it over- and under-steers
    steer = clamp((xT - (R.x + R.vx * 0.2)) * (1.6 + sk.sloppy * 2 * Math.sin(R.t * 3 + wobble)), -1, 1);
    const clearAhead = !R.obs.some((ob) => !ob.hit && ob.x > D.AT && Math.abs(ob.ox - R.x) < ob.r + R.half + 0.5);
    if (whipUse === "lazy" && R.cool <= 0 && R.boost <= 0) { if (lazy < 0) lazy = R.t + rng() * 4; if (R.t >= lazy && R.whip()) lazy = -1; }
    if (whipUse === "ready" || (whipUse === "smart" && clearAhead && R.slow <= 0)) R.whip();
  }
  stat.hits += R.hits; stat.clips += R.clips; stat.n++;
  return R.outcome || "lose";
}
function lanes(power, sk, cfg, whipUse, stat) {   // the lane race, driven as tests/race_balance.js drives it
  const o = Object.assign(U.raceSetup(cfg, power), { who: cfg.rival || "" }), R = U.raceRules(o, rng), dt = 1 / 60, seen = new Map();
  let busy = 0, dodgeAt = -1, lazy = -1; const heeds = rng() < sk.careful, react = () => Math.max(0.15, sk.see + gauss() * sk.sd);
  const clear = (lane) => { let d = 999; for (const ob of R.obs) if (ob.lane === lane && ob.x > 8 && seen.get(ob) <= R.t) d = Math.min(d, ob.x); return d; };
  const level = () => Math.abs(R.rival - R.dist) < U.RACE.LEVEL, intoKarna = (lane) => o.contact && level() && lane === R.rLane;
  for (let i = 0; i < 100 / dt && !R.over; i++) {
    for (const e of R.step(dt)) { if (e.type === "spawn") seen.set(e.o, rng() < sk.slip ? Infinity : R.t + react()); if (e.type === "warn" && rng() < sk.dodge) dodgeAt = R.t + Math.min(react(), 0.6); if (e.type === "cut" || e.type === "clash") dodgeAt = -1; }
    if (R.over) break;
    if (busy > 0) { busy -= dt; continue; }
    if (dodgeAt >= 0 && R.t >= dodgeAt && R.cut > 0) { dodgeAt = -1; const away = R.lane + Math.sign(R.lane - R.rLane); if (away >= 0 && away <= 2 && clear(away) > 40) { R.move(away - R.lane); busy = 0.15; continue; } if (whipUse !== "never" && R.whip()) continue; }
    const here = clear(R.lane);
    if (here < 60) { const opts = [R.lane - 1, R.lane + 1].filter((l) => l >= 0 && l <= 2 && !(heeds && intoKarna(l))); const best = opts.sort((a, b) => clear(b) - clear(a))[0]; if (best != null && clear(best) > here + 8) { R.move(best - R.lane); busy = 0.15; continue; } }
    if (whipUse === "lazy" && R.cool <= 0 && R.boost <= 0) { if (lazy < 0) lazy = R.t + rng() * 4; if (R.t >= lazy && R.whip()) lazy = -1; }
    if (whipUse === "ready" || (whipUse === "smart" && here > 100 && R.slow <= 0)) R.whip();
  }
  stat.hits += R.hits; stat.n++;
  return R.outcome || "lose";
}
const POWERS = [2, 5, 8], pct = (n) => String(Math.round((n / N) * 100)).padStart(3) + "%";
function table(title, cfg) {
  console.log("\n" + title + "  (wins, close in brackets; " + N + " races a cell)"); console.log("".padEnd(20) + POWERS.map((p) => ("power " + p + " lanes").padStart(17) + ("free").padStart(13)).join(""));
  const tot = { lanes: 0, free: 0 }, st = { lanes: { hits: 0, n: 0 }, free: { hits: 0, clips: 0, n: 0 } };
  for (const [skn, sk] of Object.entries(SKILL)) { let line = skn.padEnd(20);
    for (const p of POWERS) for (const [nm, fn] of [["lanes", lanes], ["free", free]]) { seed = 12345 + p * 7919; let w = 0, c = 0; for (let i = 0; i < N; i++) { const r = fn(p, sk, cfg, sk.whip, st[nm]); if (r === "win") w++; else if (r === "close") c++; } tot[nm] += w; line += (pct(w) + " (" + pct(c).trim() + ")").padStart(nm === "lanes" ? 17 : 13); }
    console.log(line); }
  const cells = Object.keys(SKILL).length * POWERS.length * N;
  console.log("overall: lanes " + Math.round((tot.lanes / cells) * 100) + "%, free " + Math.round((tot.free / cells) * 100) + "%;  hits a race: lanes " + (st.lanes.hits / st.lanes.n).toFixed(1) + ", free " + (st.free.hits / st.free.n).toFixed(1) + " (and " + (st.free.clips / st.free.n).toFixed(1) + " clips)");
  return [tot.lanes / cells, tot.free / cells];
}
table("Against Karna (chariot, whip, contact)", KARNA);
for (const [nm, cfg] of Object.entries(ROADS)) table(nm, cfg);
