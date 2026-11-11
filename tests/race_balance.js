/* Race balance: runs the chariot race's own rules (U.raceRules in game/js/ui/play.js) with a bot
   driver at four levels of skill and reports how often it beats Karna, with the race as it was
   (no whip, no contact) and as it is now (the whip and chariot contact).
   The bot sees each thing in the road after a reaction time and now and then misses one; it steers
   to the clearest lane, and may or may not keep out of Karna's lane, dodge his cuts, and use the
   whip (never, whenever it is ready, or only when the road ahead is clear).
   Result (2000 races a cell): with Karna at his old speed (3.25) the whip wins 98-100% of races for
   every bot, since twice the speed a fifth of the time is about a fifth faster on average, far more
   than the few percent the race was ever won by. With RIVAL_CONTACT = 3.5 a bot that uses the whip
   wins about as often as before (93% against 94% over all cells; the weakest bot 74-84% against
   72-93%), while one that never uses it now mostly finishes close or loses (17%).
   Usage: node tests/race_balance.js [races per cell]; RIVAL=3.6 node tests/race_balance.js tries
   another speed for Karna, and HZ=144 another refresh rate (the outcome barely moves between 30 and 144). */
const fs = require("fs");
const path = require("path");
const N = parseInt(process.argv[2] || "2000", 10);
const window = { K: { UI: { games: {} } } };
new Function("window", fs.readFileSync(path.join(__dirname, "..", "js", "ui", "play.js"), "utf8"))(window);
const U = window.K.UI;
if (process.env.RIVAL) U.RACE.RIVAL_CONTACT = +process.env.RIVAL; // try another speed for Karna

let seed = 1;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// see: mean and spread of the time to notice something (s); slip: share of things never noticed;
// whip: how it uses the whip (lazy: up to 4 s after it is ready). dodge: chance of answering a cut in time; careful: chance that it keeps out of Karna's lane when level.
const SKILL = {
  novice: { see: 1.0, sd: 0.35, slip: 0.5, dodge: 0.35, careful: 0.2, whip: "lazy" },
  poor: { see: 0.85, sd: 0.3, slip: 0.35, dodge: 0.5, careful: 0.3, whip: "lazy" },
  fair: { see: 0.6, sd: 0.22, slip: 0.2, dodge: 0.75, careful: 0.6, whip: "ready" },
  good: { see: 0.42, sd: 0.14, slip: 0.08, dodge: 0.95, careful: 0.9, whip: "smart" }
};
const KARNA = { attr: "grace", skill: "chariot", rival: "Karna", vehicle: "chariot", obstacles: ["rock", "wreck"], cast: ["karna"] };

function race(power, sk, rules, whipUse) {
  const o = Object.assign(U.raceSetup(KARNA, power), { who: "Karna" });
  if (rules === "old") { o.whip = false; o.contact = false; o.rivalV = U.raceSetup(Object.assign({}, KARNA, { vehicle: "boat" }), power).rivalV; }
  const R = U.raceRules(o, rng), dt = 1 / (+process.env.HZ || 60); // HZ: the screen's refresh rate
  const seen = new Map(); // obstacle → when the bot notices it (Infinity: never)
  let busy = 0, dodgeAt = -1, lazy = -1;
  const heeds = rng() < sk.careful; // keeps out of Karna's lane when level, this race
  const react = () => Math.max(0.15, sk.see + gauss() * sk.sd);
  const clear = (lane) => { let d = 999; for (const ob of R.obs) if (ob.lane === lane && ob.x > 8 && seen.get(ob) <= R.t) d = Math.min(d, ob.x); return d; };
  const level = () => Math.abs(R.rival - R.dist) < U.RACE.LEVEL;
  const intoKarna = (lane) => o.contact && level() && lane === R.rLane;
  for (let i = 0; i < 100 / dt && !R.over; i++) {
    for (const e of R.step(dt)) {
      if (e.type === "spawn") seen.set(e.o, rng() < sk.slip ? Infinity : R.t + react());
      if (e.type === "warn" && rng() < sk.dodge) dodgeAt = R.t + Math.min(react(), 0.6);
      if (e.type === "cut" || e.type === "clash") dodgeAt = -1;
    }
    if (R.over) break;
    if (busy > 0) { busy -= dt; continue; }
    // Answer a cut: away from Karna, or the whip to get clear of him at the rails.
    if (dodgeAt >= 0 && R.t >= dodgeAt && R.cut > 0) {
      dodgeAt = -1;
      const away = R.lane + Math.sign(R.lane - R.rLane);
      if (away >= 0 && away <= 2 && clear(away) > 40) { R.move(away - R.lane); busy = 0.15; continue; }
      if (whipUse !== "never" && R.whip()) continue;
    }
    // Steer: stay while the lane is clear well ahead, else move to the clearer neighbour.
    const here = clear(R.lane);
    if (here < 60) {
      const opts = [R.lane - 1, R.lane + 1].filter((l) => l >= 0 && l <= 2 && !(heeds && intoKarna(l)));
      const best = opts.sort((a, b) => clear(b) - clear(a))[0];
      if (best != null && clear(best) > here + 8) { R.move(best - R.lane); busy = 0.15; continue; }
    }
    // The whip: at once when it is ready, a while after it is ready, or when the road ahead is clear.
    if (whipUse === "lazy" && R.cool <= 0 && R.boost <= 0) { if (lazy < 0) lazy = R.t + rng() * 4; if (R.t >= lazy && R.whip()) lazy = -1; }
    if (whipUse === "ready" || (whipUse === "smart" && here > 100 && R.slow <= 0)) R.whip();
  }
  race.hits += R.hits; race.n++;
  return R.outcome || "lose";
}

const POWERS = [2, 4, 6, 8];
const pct = (n) => String(Math.round((n / N) * 100)).padStart(3) + "%";
const rows = [["old rules", "old", "never"], ["new, no whip", "new", "never"], ["new, whip", "new", null]];
console.log("Wins against Karna (close finishes in brackets), " + N + " races each. RIVAL_CONTACT = " + U.RACE.RIVAL_CONTACT);
console.log("".padEnd(22) + POWERS.map((p) => ("power " + p).padStart(14)).join(""));
const total = {}, hits = {};
race.hits = 0; race.n = 0;
for (const [skn, sk] of Object.entries(SKILL)) {
  for (const [label, rules, use] of rows) {
    const whipUse = use || sk.whip;
    let line = (skn + ", " + label + (use ? "" : " (" + whipUse + ")")).padEnd(22);
    for (const p of POWERS) {
      seed = 12345 + p * 7919;
      let w = 0, c = 0;
      for (let i = 0; i < N; i++) { const r = race(p, sk, rules, whipUse); if (r === "win") w++; else if (r === "close") c++; }
      line += (pct(w) + " (" + pct(c).trim() + ")").padStart(14);
      hits[label] = (hits[label] || 0) + race.hits; race.hits = 0; race.n = 0;
      total[label] = (total[label] || 0) + w;
    }
    console.log(line);
  }
}
const cells = Object.keys(SKILL).length * POWERS.length * N;
console.log("Overall: " + rows.map(([label]) => label + " " + Math.round((total[label] / cells) * 100) + "%").join(" · "));
console.log("Hits per race: " + rows.map(([label]) => label + " " + (hits[label] / cells).toFixed(1)).join(" · "));
