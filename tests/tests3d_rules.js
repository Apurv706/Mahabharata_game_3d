/* The rules of the 3D game's own tests that are steered, checked in Node with no page:
   the race with free steering (js/ui/tests3d/race.js) and the herd (js/ui/tests3d/herd.js).
     node tests/tests3d_rules.js            (exit 1 on a failure) */
"use strict";
const fs = require("fs"), path = require("path");
const window = { K: { UI: { games: {} } } };
for (const f of ["js/ui/play.js", "js/ui/tests3d/race.js", "js/ui/tests3d/herd.js"]) { const p = path.join(__dirname, "..", f); if (fs.existsSync(p)) new Function("window", fs.readFileSync(p, "utf8"))(window); }
const U = window.K.UI, D = U.ROAD;
let fails = 0, n = 0, seed = 1;
const ok = (cond, what) => { n++; if (cond) console.log("ok   " + what); else { fails++; console.log("FAIL " + what); } };
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---- 1. The race
const CH = { vehicle: "chariot", obstacles: ["rock", "wreck"], hull: 3, speed: 3.2 }, KARNA = { rival: "Karna", vehicle: "chariot", obstacles: ["rock", "wreck"] };
function drive(cfg, power, how, sd, o2) {   // how: "see" steers round everything it can see; "still" never steers
  seed = sd; const o = Object.assign(U.raceSetup3(cfg, power), { who: cfg.rival || "" }, o2 || {}), R = U.raceRules3(o, rng, cfg.vehicle), dt = 1 / 60, edge = D.W - R.half; let xT = 0, steer = 0;
  for (let i = 0; i < 9000 && !R.over; i++) {
    R.step(dt, steer); if (how === "still") continue;
    const m = R.half + 0.3, ahead = R.obs.filter((ob) => !ob.hit && ob.x > D.AT - 6 && ob.x < 100).sort((a, b) => a.x - b.x).slice(0, 2); let want = xT;
    const lvl = o.contact && Math.abs(R.rival - R.dist) < 3, bad = (v) => lvl && Math.abs(v - R.rx) < 2 * R.half + 0.4;
    if (ahead.length && Math.abs(ahead[0].ox - want) < ahead[0].r + m) { const ob = ahead[0], nx = ahead[1], c = [ob.ox - ob.r - m, ob.ox + ob.r + m].filter((v) => Math.abs(v) <= edge); const cost = (v) => Math.abs(v - R.x) + (nx && Math.abs(nx.ox - v) < nx.r + m ? 1.5 : 0) + (bad(v) ? 2.5 : 0); if (c.length) want = c.sort((a, b) => cost(a) - cost(b))[0]; }
    xT = want; steer = clamp((xT - (R.x + R.vx * 0.2)) * 1.6, -1, 1);
    if (o.whip && !R.obs.some((ob) => !ob.hit && ob.x > D.AT && Math.abs(ob.ox - R.x) < ob.r + R.half + 0.5)) R.whip();
  }
  return R;
}
{
  const a = drive(CH, 5, "see", 11), b = drive(CH, 5, "see", 11);
  ok(a.outcome === b.outcome && a.hits === b.hits && a.t === b.t, "the race: the same seed runs the same race (" + a.outcome + ", " + a.hits + " hits)");
  let wins = 0, hits = 0, lost = 0; for (let sd = 1; sd <= 40; sd++) { const R = drive(CH, 5, "see", sd * 17); if (R.outcome === "win") wins++; hits += R.hits; }
  for (let sd = 1; sd <= 40; sd++) if (drive(CH, 5, "still", sd * 17).outcome === "lose") lost++;
  ok(wins >= 32, "a driver who steers round what is in the road comes through (" + wins + " of 40 won, " + (hits / 40).toFixed(1) + " hits a race)");
  ok(lost >= 34, "one who never steers does not (" + lost + " of 40 lost)");
  for (const [nm, cfg] of [["boat", { vehicle: "boat", obstacles: ["wave", "rock"], hull: 3 }], ["on foot", { vehicle: "foot", obstacles: ["rock", "fire"], hull: 3, speed: 3 }]]) { let w = 0; for (let sd = 1; sd <= 40; sd++) if (drive(cfg, 5, "see", sd * 13).outcome !== "lose") w++; ok(w >= 34, nm + ": the road can always be got through (" + w + " of 40 not lost)"); }
  // A chariot does not jump sideways: the team must swing round first.
  { seed = 3; const o = U.raceSetup3(CH, 5); o.gap = 99; const R = U.raceRules3(o, rng, "chariot"); for (let i = 0; i < 6; i++) R.step(1 / 60, 1); const early = R.x; for (let i = 0; i < 54; i++) R.step(1 / 60, 1);
    ok(early < 0.06 && R.x > 2.2, "a chariot answers the rein with a turn, not a jump (" + early.toFixed(3) + " m after a tenth of a second, " + R.x.toFixed(1) + " m after a second)");
    const Rf = U.raceRules3(Object.assign(U.raceSetup3({ vehicle: "foot" }, 5), { gap: 99 }), rng, "foot"); for (let i = 0; i < 6; i++) Rf.step(1 / 60, 1);
    ok(Rf.x > early * 3, "a runner sidesteps sooner than a chariot turns (" + Rf.x.toFixed(2) + " m in the same tenth)"); }
  // Thrown from lock to lock at speed, the car slides, and sliding costs pace; under the whip it slides more.
  { const slide = (whip) => { seed = 5; const o = Object.assign(U.raceSetup3(KARNA, 5), { gap: 99, contact: false }); const R = U.raceRules3(o, rng, "chariot"); let worst = 0, slow = 1; if (whip) R.whip(); for (let i = 0; i < 20; i++) R.step(1 / 60, 1); for (let i = 0; i < 20; i++) { R.step(1 / 60, -1); worst = Math.max(worst, R.skid); slow = Math.min(slow, R.speed() / (o.base * (whip ? 2 : 1))); } return [worst, slow]; };
    const [s0, v0] = slide(false), [s1, v1] = slide(true);
    ok(s1 > 0.3 && v1 < 0.97 && s1 > s0, "thrown from lock to lock the car slides and loses pace, more under the whip (slide " + s0.toFixed(2) + " plain, " + s1.toFixed(2) + " whipped; pace down to " + Math.round(v1 * 100) + "%)"); }
  // The rails: driven hard into the edge, you are slowed, not carried off the road.
  { seed = 9; const o = Object.assign(U.raceSetup3(CH, 5), { gap: 99 }); const R = U.raceRules3(o, rng, "chariot"); let rails = 0, out = 0; for (let i = 0; i < 240; i++) { for (const e of R.step(1 / 60, 1)) if (e.type === "rails") rails++; out = Math.max(out, Math.abs(R.x)); }
    ok(rails >= 1 && out <= D.W - R.half + 1e-6, "the rail stops you at the road's edge and costs you pace (" + rails + " scrapes, never past " + out.toFixed(2) + " m)"); }
  // A thing struck squarely is a hit; brushed, a clip.
  { const pass = (off) => { seed = 2; const o = Object.assign(U.raceSetup3(CH, 5), { gap: 99 }); const R = U.raceRules3(o, rng, "chariot"); R.obs.push({ ox: off, r: 0.6, kind: "rock", x: 60, over: 0 }); const got = []; for (let i = 0; i < 200; i++) for (const e of R.step(1 / 60, 0)) if (e.type === "hit" || e.type === "clip") got.push(e.type); return got.join(","); };
    ok(pass(0) === "hit" && pass(0.6 + 0.8 - 0.1) === "clip" && pass(0.6 + 0.8 + 0.1) === "", "a thing met squarely is a hit, one a wheel only brushes is a clip, one a hand's breadth clear is neither"); }
  // Against Karna: wheels that touch throw both cars apart; with the whip the race can be won.
  { let wins = 0, clashes = 0; for (let sd = 1; sd <= 30; sd++) { const R = drive(KARNA, 5, "see", sd * 29); if (R.outcome === "win") wins++; }
    seed = 4; const o = Object.assign(U.raceSetup3(KARNA, 5), { gap: 99 }); const R = U.raceRules3(o, rng, "chariot"); R.rx = 1.2; R.rTo = 1.2; R.rWander = 99; let how = null, vx = 0; for (let i = 0; i < 120 && !how; i++) { R.rival = R.dist; for (const e of R.step(1 / 60, 0.6)) if (e.type === "clash") { how = e.how; vx = R.vx; } }
    ok(wins >= 24, "against Karna a driver who steers and uses the whip wins (" + wins + " of 30)");
    ok(how === "clash" && vx < -2, "wheels that touch throw the cars apart (" + how + ", you thrown left at " + (-vx).toFixed(1) + " m/s)"); }
}

// ---- 2. The herd
{
  const H = U.HERD;
  function work(how, sd, o) {   // how: "herd" (U.herdBot), "rush" (run straight at the nearest), "still"
    seed = sd; const R = U.herdRules(Object.assign({ need: 6, lose: 3, secs: 70, calm: 0.4 }, o || {}), rng), dt = 1 / 60; let hx = 0, hz = 6, hv = 0;
    for (let i = 0; i < 60 * 200 && !R.over; i++) { let tx = hx, tz = hz, v = 0;
      if (how === "herd") { const b = U.herdBot(R, hx, hz); tx = b.x; tz = b.z; v = b.v; }
      else if (how === "rush") { let best = null, bd = 99; for (const c of R.cows) if (!c.gone) { const d = Math.hypot(c.x - hx, c.z - hz); if (d < bd) { bd = d; best = c; } } if (best) { tx = best.x; tz = best.z; v = 4.6; } }
      const dx = tx - hx, dz = tz - hz, l = Math.hypot(dx, dz); if (l > 0.05 && v > 0) { hx += (dx / l) * v * dt; hz += (dz / l) * v * dt; hv = v; } else hv = 0;
      hx = clamp(hx, -H.X, H.X); hz = clamp(hz, -H.Z, H.Z); R.step(dt, hx, hz, hv); }
    return R; }
  const a = work("herd", 21), b = work("herd", 21);
  ok(a.outcome === b.outcome && a.t === b.t && a.got === b.got, "the herd: the same seed runs the same drive (" + a.outcome + " in " + a.t.toFixed(0) + " s)");
  let wins = 0, t = 0, bolts = 0; for (let i = 0; i < 30; i++) { const R = work("herd", 300 + i * 37); if (R.outcome === "win") wins++; t += R.t; bolts += R.spooks; }
  ok(wins >= 27 && t / 30 < 55, "a herder who works from behind and comes at them gently brings the herd across in time (" + wins + " of 30, " + (t / 30).toFixed(0) + " s of 70, " + (bolts / 30).toFixed(1) + " bolts a drive)");
  let lost = 0, rb = 0; for (let i = 0; i < 30; i++) { const R = work("rush", 300 + i * 37); if (R.outcome !== "win") lost++; rb += R.spooks; }
  ok(lost >= 27 && rb / 30 > 10, "one who runs at them scatters them and fails (" + lost + " of 30 not won, " + (rb / 30).toFixed(0) + " bolts a drive)");
  { const R = work("still", 5, { secs: 40 }); ok(R.got === 0 && R.lost === 0 && R.spooks === 0, "left alone they stay at grass: none crosses, none bolts, and none walks into deep water"); }
  // One cow, come at two ways.
  { const one = (v) => { seed = 8; const R = U.herdRules({ need: 1, secs: 99 }, rng); for (const c of R.cows) if (c.i) c.gone = "x"; const c = R.cows[0]; c.x = 5; c.z = 0; c.vx = c.vz = 0; let hz = 7; for (let i = 0; i < 60 * 6; i++) { hz = Math.max(c.z + 2.0, hz - v / 60); R.step(1 / 60, c.x, hz, v); } return { spooks: R.spooks, z: c.z }; };   /* (one cow on open ground, clear of all water; need 1, so the drive does not end for want of beasts) */
    const walk = one(1.8), run = one(4.6);
    ok(walk.spooks === 0 && walk.z < -1 && run.spooks >= 1, "walk up to a cow and she moves off (" + (-walk.z).toFixed(1) + " m, no bolt); run at her and she bolts"); }
  // Under a herder's pressure they close up: a herd, not nine beasts.
  { seed = 31; const R = U.herdRules({ need: 6, secs: 99 }, rng); const spread = () => { const g = R.centre(); let s = 0, n = 0; for (const c of R.cows) if (!c.gone) { s += Math.hypot(c.x - g.x, c.z - g.z); n++; } return s / n; }; const s0 = spread(); let hx = -10.5, hz = 0; for (let i = 0; i < 60 * 14 && !R.over; i++) { const bt = U.herdBot(R, hx, hz), dx = bt.x - hx, dz = bt.z - hz, l = Math.hypot(dx, dz) || 1; hx += (dx / l) * bt.v / 60; hz += (dz / l) * bt.v / 60; R.step(1 / 60, hx, hz, bt.v); }
    ok(spread() < s0 * 0.75, "worked from behind, the scattered beasts close up into one herd (spread " + s0.toFixed(1) + " m to " + spread().toFixed(1) + " m)"); }
}

console.log("\n" + (fails ? fails + " of " + n + " FAILED" : "all " + n + " passed"));
process.exit(fails ? 1 : 0);
