/* Bodies under the physics engine (js/g3/ragdoll.js on cannon-es, js/vendor/cannon-es.min.js), checked with no page: a
   standing man is built from where his joints are, struck in several ways, and followed until the engine leaves him
   lying. The engine uses no chance of its own, so the same blow gives the same fall on every run.
     node tests/ragdoll.js            (exit 1 on a failure) */
"use strict";
const fs = require("fs"), path = require("path"), ROOT = path.join(__dirname, "..");
const win = { K: { G3: {} } };
win.CANNON = new Function(fs.readFileSync(path.join(ROOT, "js/vendor/cannon-es.min.js"), "utf8") + ";return CANNON;")();
new Function("window", fs.readFileSync(path.join(ROOT, "js/g3/ragdoll.js"), "utf8"))(win);
const P = win.K.G3.phys, C = win.CANNON, H = 1 / 60, DEG = Math.PI / 180;
P.TUNE.adapt = false;   // (the engine finds how much it can carry from this machine's speed: here it is held at six men, so the checks are the same everywhere)
let fails = 0, n = 0;
const check = (ok, what) => { n++; if (!ok) { fails++; console.log("FAIL " + what); } else if (process.argv.includes("-v")) console.log("ok   " + what); };

// A man standing at ease at (x, z), facing yaw, of size s: where the figure's joints are (js/g3/figure.js).
function standing(x, z, s, yaw) {
  s = s || 1; yaw = yaw || 0; const at = {}, c = Math.cos(yaw), sn = Math.sin(yaw), q = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
  const put = (k, lx, ly, lz) => { at[k] = { p: [x + (lx * c + lz * sn) * s, ly * s, z + (-lx * sn + lz * c) * s], q: q.slice() }; };
  put("P", 0, 0.92, 0); put("T", 0, 0.92, 0); put("H", 0, 1.47, 0);
  for (const [sd, sx] of [["L", 1], ["R", -1]]) { put("a" + sd, sx * 0.23, 1.41, 0); put("e" + sd, sx * 0.23, 1.12, 0); put("w" + sd, sx * 0.23, 0.82, 0); put("l" + sd, sx * 0.1, 0.92, 0); put("k" + sd, sx * 0.1, 0.47, 0); put("f" + sd, sx * 0.1, 0.05, 0); }
  return { s, at };
}
const va = new C.Vec3(), vb = new C.Vec3();
function gap(r) { let g = 0; for (const j of r.joints) { if (!j.pivotA) continue; j.bodyA.pointToWorldFrame(j.pivotA, va); j.bodyB.pointToWorldFrame(j.pivotB, vb); g = Math.max(g, va.distanceTo(vb)); } return g; }
// How far a knee or an elbow is bent (degrees; less than nought: bent the wrong way), and how far its two parts' hinge lines have come apart.
function hinge(r, up, low, fwd) {
  const A = r.b[up], B = r.b[low], d = new C.Vec3(0, -1, 0), a = new C.Vec3(), b = new C.Vec3(), x = new C.Vec3(1, 0, 0), xa = new C.Vec3(), xb = new C.Vec3(), cr = new C.Vec3();
  A.vectorToWorldFrame(d, a); B.vectorToWorldFrame(d, b); A.vectorToWorldFrame(x, xa); B.vectorToWorldFrame(x, xb);
  a.cross(b, cr); const ang = Math.atan2(cr.dot(xa) * fwd, a.dot(b)) / DEG;   // (about the hinge line, which runs to his left: a knee's turn about it is the bend itself, an elbow's is the bend the other way)
  return { bend: ang, askew: Math.acos(Math.max(-1, Math.min(1, xa.dot(xb)))) / DEG };
}
function run(o, opt) {
  opt = opt || {}; P.open(); if (opt.before) opt.before();
  const r = P.rag(standing(0, 0, opt.s || 1, 0), o); let t = 0, wide = 0, top = 0, high = 0, low = 9;
  while (!r.frozen && t < 14) { if (opt.each) opt.each(t, r); P.step(H); t += H; wide = Math.max(wide, gap(r)); top = Math.max(top, r.speed || 0); for (const k of P.PARTS) { high = Math.max(high, r.b[k].position.y); low = Math.min(low, r.b[k].position.y); } }
  return { r, t, wide, top, high, low, ys: P.PARTS.map((k) => r.b[k].position.y), x: r.b.P.position.x, z: r.b.P.position.z };
}

// ---- the engine, and one body ----
check(P.ok && typeof C.World === "function", "the physics engine is loaded");
{ P.open(); const r = P.rag(standing(0, 0, 1, 0), {}); let m = 0; for (const k of P.PARTS) m += r.b[k].mass;
  check(P.PARTS.length === 11 && r.joints.filter((j) => j.pivotA).length === 10, "a body is eleven parts and ten joints");
  check(Math.abs(m - 75.4) < 0.5, "a man of ordinary size weighs 75 kg (" + m.toFixed(1) + ")");
  const big = P.rag(standing(4, 0, 1.2, 0), {}); let mb = 0; for (const k of P.PARTS) mb += big.b[k].mass;
  check(Math.abs(mb / m - 1.728) < 0.01, "a man a fifth taller weighs 1.73 times as much (" + (mb / m).toFixed(2) + ")");
  check(P.live() === 2, "the engine is carrying two bodies"); P.close(); check(P.live() === 0 && r.frozen, "closing the world lets go of them"); }
{ P.open(); check(P.step(H) === 0, "nothing is reckoned while nothing is loose"); }

// ---- five blows ----
const BLOWS = { crumple: {}, light: { v: [0, 0, -1.4], push: [0, 0.3, -1.5] }, heavy: { v: [0, 0, -3.3], push: [0, 1.9, -2.6], spin: 1.5 }, side: { v: [-3.3, 0, 0], push: [-2.6, 1.9, 0], spin: -1.2 }, swept: { v: [1, 0, 0], push: [3, 1.2, 0], low: true } };
const res = {};
for (const name in BLOWS) {
  const R = (res[name] = run(BLOWS[name])), r = R.r;
  check(!r.broke, name + ": the body never goes wrong");
  check(r.frozen && R.t < P.TUNE.life + 0.1, name + ": it lies still within " + P.TUNE.life + " s (" + R.t.toFixed(2) + ")");
  check(Math.min(...R.ys) > 0.02 && R.low > -0.02, name + ": no joint is ever under the ground (lowest " + R.low.toFixed(3) + ")");
  check(Math.max(...R.ys) < 0.8, name + ": at rest nothing stands higher than a sitting man (" + Math.max(...R.ys).toFixed(2) + ")");
  check(R.wide < 0.08, name + ": no joint comes apart by more than 8 cm in the fall (" + (R.wide * 100).toFixed(1) + ")");
  check(gap(r) < 0.02, name + ": at rest every joint is whole (" + (gap(r) * 100).toFixed(1) + " cm)");
  for (const sd of ["L", "R"]) { const k = hinge(r, "l" + sd, "k" + sd, 1), e = hinge(r, "a" + sd, "e" + sd, -1);
    check(k.bend > -10 && k.bend < 150 && k.askew < 14, name + ": the " + sd + " knee bends only backward (" + k.bend.toFixed(0) + " degrees, " + k.askew.toFixed(0) + " askew)");
    check(e.bend > -10 && e.bend < 156 && e.askew < 14, name + ": the " + sd + " elbow bends only forward (" + e.bend.toFixed(0) + " degrees, " + e.askew.toFixed(0) + " askew)"); }
  check(R.top < 16, name + ": no part is ever faster than 16 m/s (" + R.top.toFixed(1) + ")");
}
check(res.heavy.z < -1.6 && Math.abs(res.heavy.z) > Math.abs(res.light.z) + 0.5, "a heavy blow from in front throws him further back than a light one (" + (-res.heavy.z).toFixed(1) + " m and " + (-res.light.z).toFixed(1) + " m)");
check(res.light.z < -0.3, "a light blow from in front sends him backward");
check(res.side.x < -1.2, "a heavy blow from his left sends him to his right (" + (-res.side.x).toFixed(1) + " m)");
check(Math.hypot(res.crumple.x, res.crumple.z) < 1.3, "with no blow he goes down about where he stood (" + Math.hypot(res.crumple.x, res.crumple.z).toFixed(2) + " m)");
{ const again = run(BLOWS.heavy); check(Math.abs(again.x - res.heavy.x) < 1e-9 && Math.abs(again.z - res.heavy.z) < 1e-9 && Math.abs(again.t - res.heavy.t) < 1e-9, "the same blow gives the same fall"); }

// ---- many at once ----
{ P.open(); const rs = []; for (let i = 0; i < (P.TUNE.parts / 11); i++) { const a = (i / (P.TUNE.parts / 11)) * Math.PI * 2; rs.push(P.rag(standing(Math.sin(a) * 1.4, Math.cos(a) * 1.4, 1, a + Math.PI), { v: [-Math.sin(a) * 3, 0, -Math.cos(a) * 3], push: [-Math.sin(a) * 2, 1.5, -Math.cos(a) * 2] })); }
  check(rs.every(Boolean) && P.live() === (P.TUNE.parts / 11), "the engine carries " + (P.TUNE.parts / 11) + " bodies at once");
  check(P.rag(standing(9, 9, 1, 0), {}) === null, "one more is not taken while none of them has lain a second");
  let t = 0, ms = 0, worst = 0, steps = 0; while (t < 1.2) { const a = Date.now(); steps += P.step(H); const d = Date.now() - a; ms += d; worst = Math.max(worst, d); t += H; }
  const extra = P.rag(standing(9, 9, 1, 0), {}); check(!!extra && P.live() <= (P.TUNE.parts / 11) && rs.some((r) => r.frozen), "after that, one more is taken, and the one that has lain longest is left as it lies");
  const alive = P.rag(standing(-9, 9, 1, 0), { alive: true }); check(!!alive && P.live() <= (P.TUNE.parts / 11), "a living man thrown down is always taken");
  while (t < 12) { const a = Date.now(); steps += P.step(H); const d = Date.now() - a; ms += d; worst = Math.max(worst, d); t += H; }
  check(rs.every((r) => r.frozen && !r.broke), "six thrown into each other all come to rest, none gone wrong");
  check(rs.every((r) => P.PARTS.every((k) => r.b[k].position.y > 0.02 && r.b[k].position.y < 1.1)), "and lie on the ground or on each other");
  check(ms / steps < 12, "a step with six bodies costs " + (ms / steps).toFixed(2) + " ms on this machine (worst " + worst + ")");
  console.log("      six bodies: " + (ms / steps).toFixed(2) + " ms a step, worst " + worst + " ms"); }

{ // one falls where another already lies
  P.open(); const first = P.rag(standing(0, 0, 1, 0), { push: [0, 0.3, 1] }); let t = 0; while (!first.frozen && t < 10) { P.step(H); t += H; }
  const at = first.b.T.position, second = P.rag(standing(at.x, at.z - 0.5, 1, 0), { push: [0, 0.3, 1] }); t = 0; while (!second.frozen && t < 10) { P.step(H); t += H; }
  const lowest = Math.min(...["P", "T", "H"].map((k) => Math.hypot(second.b[k].position.x - first.b[k].position.x, second.b[k].position.y - first.b[k].position.y, second.b[k].position.z - first.b[k].position.z)));
  check(P.world().lumps.length === 2 && !second.broke && second.frozen, "a body left lying is still in the way of the next");
  check(lowest > 0.12, "one that falls where another lies does not lie inside it (their nearest hips, chests or heads are " + (lowest * 100).toFixed(0) + " cm apart)"); }

// ---- what the bodies cannot move ----
{ const free = run({ v: [0, 0, 5], push: [0, 1, 1] }), stopped = run({ v: [0, 0, 5], push: [0, 1, 1] }, { before: () => P.mover("m", { kind: "man", x: 0, z: 1.1 }) });
  check(stopped.z < free.z - 0.5, "a body thrown at a standing man is stopped by him (" + stopped.z.toFixed(1) + " m, and " + free.z.toFixed(1) + " m with no one there)"); }
{ // a body lying on the ground, and a car driven over it at 7 m/s: the wheels go over it
  P.open(); const r = P.rag(standing(0, 0, 1, 0), { push: [0, 0.3, 1.2], alive: true }); let t = 0; while (t < 4 && !(t > 1 && P.PARTS.every((k) => r.b[k].position.y < 0.45))) { P.step(H); t += H; }   // (alive: the engine keeps him while the car comes)
  const z0 = r.b.P.position.z, lying = P.PARTS.every((k) => r.b[k].position.y < 0.45) && !r.frozen;
  for (let z = -9; z < 12; z += 7 * H) { P.mover("car", { kind: "car", x: 0, z, a: 0, dt: H }); P.step(H); }
  check(lying && Math.abs(r.b.P.position.z - z0) < 0.6, "a car driven over a man lying on the ground does not carry him off (moved " + Math.abs(r.b.P.position.z - z0).toFixed(2) + " m)"); }
{ // a man run down: he begins under the team, and is let go
  P.open(); P.mover("car", { kind: "car", x: 0, z: -1.6, a: 0 }); const r = P.rag(standing(0, 0, 1, 0), { v: [0.6, 0, 3], push: [0.4, 1.2, 1] });
  check(r.under.length === 11, "a man run down by a car begins under it, and it lets him go");
  let t = 0, z = -1.6; while (!r.frozen && t < 10) { z += 7 * H; P.mover("car", { kind: "car", x: 0, z, a: 0, dt: H }); P.step(H); t += H; }
  check(!r.broke && r.frozen && r.b.P.position.z < 6 && r.top !== Infinity, "and he is left on the ground behind it, not carried off (he lies " + r.b.P.position.z.toFixed(1) + " m on; the car is " + z.toFixed(0) + " m on)"); }
{ // an elephant walks into a man who has just been thrown down
  const R = run({ v: [0, 0, 1] }, { each: (t) => P.mover("el", { kind: "elephant", x: 0, z: -5 + t * 3, a: 0, dt: H }) });
  check(!R.r.broke && R.r.frozen, "a body an elephant walks through comes to rest, not gone wrong"); }

// ---- a man only thrown down ----
{ P.open(); const r = P.rag(standing(0, 0, 1, 0), { v: [0, 0, 3], push: [0, 1.5, 2], alive: true }); let t = 0; while (t < 1.6) { P.lead(r, 2, 1, H); P.step(H); t += H; }
  check(!r.frozen, "a living man thrown down is not left lying while he is down");
  check(Math.hypot(r.b.P.position.x - 2, r.b.P.position.z - 1) < 0.7, "he is drawn to where the rules have him (" + Math.hypot(r.b.P.position.x - 2, r.b.P.position.z - 1).toFixed(2) + " m from it)");
  check(P.kill(r, [0, 1, 2]) && !r.alive, "killed where he lies, the engine keeps him"); while (!r.frozen && t < 12) { P.step(H); t += H; } check(r.frozen && !r.broke, "and leaves him lying"); }

// ---- riders ----
// (a car at the origin, facing +z; its man stands on the deck, 0.86 m up)
function rider(o, secs) { P.open(); P.mover("car", { kind: "car", x: 0, z: 0, a: 0 }); const at = standing(0, 0, 1, 0).at; for (const k in at) at[k].p[1] += 0.86; const r = P.rag({ s: 1, at }, Object.assign({ car: "car" }, o)); let t = 0; while (!r.frozen && t < (secs || 12)) { P.step(H); t += H; } return r; }
const inCar = (r) => { const p = r.b.P.position; return Math.abs(p.x) < 0.85 && Math.abs(p.z) < 1.05 && p.y > 0.8; }, onGround = (r) => P.PARTS.every((k) => r.b[k].position.y < 0.6);
{ const r = rider({}); check(r.frozen && !r.broke && inCar(r), "a rider killed with no blow goes down on the deck of his car (hips " + r.b.P.position.y.toFixed(2) + " m up)");
  check(!!P.world().movers.get("car").deck && (r.b.P.collisionFilterMask & 2) === 0, "the car has a floor and rails for him, and neither its outside nor a team standing through it moves him"); }
{ // another car's team standing through his car (the rules keep cars 2.5 m apart; a car and its team are 5 m long): it does not hold a dead man up on his feet
  P.open(); P.mover("car", { kind: "car", x: 0, z: 0, a: 0 }); P.mover("other:team", { kind: "team", n: 2, x: 0.3, z: -2.6, a: 0 }); const at = standing(0, 0, 1, 0).at; for (const k in at) at[k].p[1] += 0.86;
  const r = P.rag({ s: 1, at }, { car: "car" }); let t = 0; while (!r.frozen && t < 10) { P.step(H); t += H; } check(r.frozen && r.b.H.position.y < 1.9 && r.b.P.position.y < 1.3, "a team standing through his car does not hold a dead rider up (hips " + r.b.P.position.y.toFixed(2) + " m, head " + r.b.H.position.y.toFixed(2) + ")"); }
{ const r = rider({ v: [-1.2, 0.8, 0], push: [-2.2, 0.8, 0] }); check(r.frozen && !r.broke && onGround(r) && r.b.P.position.x < -0.9, "a rider struck from his left by a blade goes over the rail and lies on the ground beside the car (" + (-r.b.P.position.x).toFixed(1) + " m out)"); }
{ const r = rider({ v: [0, 2.2, -2.4], push: [0, 1.2, -2.4] }); check(r.frozen && !r.broke && onGround(r) && r.b.P.position.z < -2, "a rider struck by a heavy blow from in front is thrown clear behind it (" + (-r.b.P.position.z).toFixed(1) + " m)"); }
{ // only thrown down, in a car that runs, turns and stops: he stays in it
  P.open(); let z = 0, v = 6, t = 0, out = 0; P.mover("car", { kind: "car", x: 0, z: 0, a: 0 }); P.mover("car", { kind: "car", x: 0, z: 0.1, a: 0, dt: H }); z = 0.1;
  const at = standing(0, z, 1, 0).at; for (const k in at) at[k].p[1] += 0.86; const r = P.rag({ s: 1, at }, { car: "car", alive: true, push: [1.5, 1, -2] });
  check(Math.abs(r.b.T.velocity.z - 6) < 2.6, "a rider has the speed of the car he rides in (" + r.b.T.velocity.z.toFixed(1) + " m/s of its 6)");
  while (t < 3) { if (t > 0.5) v = Math.max(0, v - 30 * H); z += v * H; P.mover("car", { kind: "car", x: 0, z, a: t * 0.5, dt: H }); P.lead(r, 0, z, H); P.step(H); t += H; const p = r.b.P.position; if (Math.abs(p.x) > 1.05 || Math.abs(p.z - z) > 1.25 || p.y < 0.8) out++; }
  check(out === 0 && !r.frozen && !r.broke, "a rider only thrown down stays in his car while it runs, turns and stops");
  check(P.kill(r, [-2.6, 1.6, 0]) && (r.b.P.collisionFilterMask & 32) === 0, "killed where he lies, the walls no one sees let go of him"); t = 0; while (!r.frozen && t < 10) { P.step(H); t += H; }
  check(r.frozen && !r.broke, "and he comes to rest, in the car or out of it"); }

// ---- a horse, an elephant ----
const HORSE = { root: [0, 0, 0], neck: [0, 1.5, 0.6], head: [0, 2.03, 1.04] }, ELE = { root: [0, 0, 0], trunk: [0, 2.72, 2.72], trunkb: [0, 2.02, 2.94], trunkc: [0, 1.55, 3.08] };   // (where the kit's beasts have their joints: js/g3/models/p_horse.js, p_elephant.js)
for (const [k, x, z] of [["FL", -0.19, 0.56], ["FR", 0.19, 0.56], ["HL", -0.19, -0.56], ["HR", 0.19, -0.56]]) { HORSE["leg" + k] = [x, 1.12, z]; HORSE["shin" + k] = [x, 0.57, z < 0 ? -0.68 : 0.56]; HORSE["hoof" + k] = [x, 0.2, z < 0 ? -0.65 : 0.56]; }
for (const [k, x, z] of [["FL", -0.68, 1.2], ["FR", 0.68, 1.2], ["HL", -0.68, -1.2], ["HR", 0.68, -1.2]]) { ELE["leg" + k] = [x, 1.95, z]; ELE["shin" + k] = [x, 0.98, z]; }
function beastAt(J, x, z, yaw) { const at = {}, c = Math.cos(yaw || 0), sn = Math.sin(yaw || 0), q = [0, Math.sin((yaw || 0) / 2), 0, Math.cos((yaw || 0) / 2)]; for (const k in J) { const [lx, ly, lz] = J[k]; at[k] = { p: [x + lx * c + lz * sn, ly, z - lx * sn + lz * c], q: q.slice() }; } return { s: 1, at }; }
function fell(r, secs) { let t = 0, wide = 0, top = 0; while (!r.frozen && t < secs) { P.step(H); t += H; wide = Math.max(wide, gap(r)); top = Math.max(top, r.speed || 0); } const up = new C.Vec3(); r.b.root.vectorToWorldFrame(new C.Vec3(0, 1, 0), up); return { t, wide, top, up: up.y, y: r.b.root.position.y, low: Math.min(...r.keys.map((k) => r.b[k].position.y)) }; }
{ P.open(); const r = P.beast("horse", beastAt(HORSE, 0, 0, 0), { v: [0, 0, 3], roll: 2 }); let m = 0; for (const k of r.keys) m += r.b[k].mass;
  check(r.keys.length === 10 && Math.abs(m - 399) < 1, "a horse is ten parts and weighs 400 kg (" + m.toFixed(0) + ")");
  check(Math.abs(r.b.root.position.y - 1.32) < 0.05, "its barrel's own place is where its weight is, 1.3 m up, not at its hooves (" + r.b.root.position.y.toFixed(2) + ")");
  const f = fell(r, 12); check(r.frozen && !r.broke && f.t < 8.1, "a horse killed at the run comes to rest (" + f.t.toFixed(1) + " s)");
  check(f.y < 0.6 && f.low > 0.02 && f.up < 0.9, "down on the ground and over toward its side (barrel " + f.y.toFixed(2) + " m up, leaning " + Math.round(Math.acos(Math.max(-1, Math.min(1, f.up))) / DEG) + " degrees)");
  check(f.wide < 0.12 && gap(r) < 0.03 && f.top < 16, "with its joints whole (widest " + (f.wide * 100).toFixed(1) + " cm in the fall)"); }
{ P.open(); const r = P.beast("elephant", beastAt(ELE, 0, 0, 0), { v: [0, 0, 1.5], roll: 0.7 }); let m = 0; for (const k of r.keys) m += r.b[k].mass;
  check(r.keys.length === 12 && Math.abs(m - 3625) < 1, "an elephant is twelve parts and weighs 3.6 tonnes (" + m.toFixed(0) + ")");
  const f = fell(r, 14); check(r.frozen && !r.broke, "an elephant killed comes to rest (" + f.t.toFixed(1) + " s)");
  check(f.y < 1.5 && f.low > 0.05 && f.up < 0.5, "down, and over onto its side (barrel " + f.y.toFixed(2) + " m up, leaning " + Math.round(Math.acos(Math.max(-1, Math.min(1, f.up))) / DEG) + " degrees)");
  check(f.wide < 0.3 && gap(r) < 0.06 && f.top < 16, "with its joints whole (widest " + (f.wide * 100).toFixed(1) + " cm in the fall)");
  const man = P.rag(standing(r.b.root.position.x, r.b.root.position.z, 1, 0), {}); let t = 0; while (!man.frozen && t < 10) { P.step(H); t += H; }
  check(man.frozen && !man.broke && Math.hypot(man.b.P.position.x - r.b.root.position.x, man.b.P.position.y - r.b.root.position.y, man.b.P.position.z - r.b.root.position.z) > 0.9, "a man who falls where it lies does not lie inside it"); }
{ // a team of four, going down together
  P.TUNE.parts = 132; P.open(); const rs = []; for (let i = 0; i < 4; i++) rs.push(P.beast("horse", beastAt(HORSE, (i - 1.5) * 1.0, 0, 0), { v: [0, 0, 2], roll: (i < 2 ? 1 : -1) * (1.5 + i * 0.2) }));
  let t = 0; while (rs.some((r) => !r.frozen) && t < 12) { P.step(H); t += H; }
  check(rs.every((r) => r && r.frozen && !r.broke && r.b.root.position.y < 0.9), "a team of four horses goes down together, none gone wrong (" + t.toFixed(1) + " s)"); P.TUNE.parts = 66; }

// ---- how much it carries ----
{ P.open(); check(P.world().budget === 66 && P.load() === 0, "the engine begins with room for six men");
  const h = P.beast("horse", beastAt(HORSE, 0, 0, 0), {}); const e = P.beast("elephant", beastAt(ELE, 6, 0, 0), {}); check(P.load() === 22, "a horse counts as ten parts and an elephant as twelve");
  P.TUNE.adapt = true; P.TUNE.aim = 1e6; for (let i = 0; i < 400; i++) P.step(H); check(P.world().budget === P.TUNE.partsMost || P.live() === 0, "where a step costs little, it finds room for more (" + P.world().budget + " parts)");
  P.open(); P.rag(standing(0, 0, 1, 0), { alive: true }); P.TUNE.aim = 1e-9; for (let i = 0; i < 400; i++) P.step(H); check(P.world().budget === P.TUNE.partsMin, "and where a step costs much, for fewer (" + P.world().budget + ")"); P.TUNE.adapt = false; P.TUNE.aim = 2; }

// ---- what he lets go of ----
{ P.open(); const mace = P.thing({ p: [0, 1.2, 0], q: [0, 0, 0, 1], half: [0.06, 0.45, 0.06], m: 6, v: [1, 2, 0], w: [5, 1, -4] }), shield = P.thing({ p: [1, 1.1, 1], q: [0.3, 0, 0, 0.95], half: [0.3, 0.3, 0.03], m: 4, v: [0, 1, 1], w: [2, 6, 1] });
  let t = 0; while (t < 6 && !(mace.rest && shield.rest)) { P.step(H); t += H; }
  check(mace.rest && shield.rest, "a dropped mace and a shield come to rest (" + t.toFixed(1) + " s)");
  check(mace.p.y > 0.03 && mace.p.y < 0.2 && shield.p.y > 0.01 && shield.p.y < 0.35, "on the ground: the mace on its side, the shield flat or on its rim (" + mace.p.y.toFixed(2) + ", " + shield.p.y.toFixed(2) + ")");
  while (t < 9) { P.step(H); t += H; } check(mace.done && P.world().things.length === 0, "and are cleared away after their time"); }
{ P.open(); const w = P.thing({ p: [0.98, 0.72, 0], q: [0, 0, 0, 1], wheel: [0.72, 0.07], m: 25, v: [0.6, 0.4, 2.8], w: [2.8 / 0.72, 0.3, 0], life: 30 }); let t = 0, far = 0; while (!w.rest && t < 12) { P.step(H); t += H; far = Math.max(far, w.p.z); }
  const ax = new C.Vec3(); w.body.vectorToWorldFrame(new C.Vec3(1, 0, 0), ax);
  check(far > 2 && far < 9, "a wheel that comes off runs on some paces (" + far.toFixed(1) + " m)"); check(w.rest && Math.abs(ax.y) > 0.9 && w.p.y < 0.2, "then leans, goes over, and lies flat (" + t.toFixed(1) + " s)"); }
P.close();
console.log("ragdoll: " + n + " checks, " + (fails ? fails + " failed" : "all passed"));
process.exit(fails ? 1 : 0);
