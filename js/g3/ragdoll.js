/* Bodies under a real physics engine.

   The fight's rules (js/ui/battle/sim.js) decide who is struck, thrown and killed, by a reckoning that comes out the
   same on every machine. What a body then DOES is given to cannon-es (js/vendor/cannon-es.min.js, MIT licence): a man
   who is killed, or taken off his feet, becomes eleven rigid parts (hips, trunk, head, upper arms, forearms, thighs,
   shins) joined where his joints are. Each joint turns only as far as a joint turns: a knee and an elbow on one line
   and one way, a shoulder and a hip inside a cone, the spine and the neck a little. The parts have their weights
   (75 kg for a man of ordinary size), fall under gravity, strike the ground, each other, other bodies, the living, the
   chariots and the elephants, and lie where that leaves them. What he let go of falls and turns the same way.

   Nothing here changes who wins: the rules never read a body's place back from the engine.

     P.open()                a world for one fight (ground at y = 0)        P.close()
     P.step(dt)              the engine goes forward by dt seconds
     P.rag(frames, o)        a body from where its joints are (plain numbers: tests/ragdoll.js builds one with no page)
     P.take(figure, o)       the same, from a figure (js/g3/figure.js) as it stands this moment
     P.put(figure, dt)       the engine's body written back into the figure (figure.js calls this from its own update)
     P.rise(figure, secs)    the figure is given back to its poses, and comes out of the fall over secs
     P.mover(id, o)          something the bodies cannot move, that moves them: a living man, a chariot, an elephant
     P.thing(o)              one loose rigid thing (a dropped mace, a shield)
*/
(function (K) {
  "use strict";
  const C = window.CANNON, G = (K.G3 = K.G3 || {});
  const P = (G.phys = { ok: !!C, tally: { made: 0, left: 0, broke: 0, refused: 0, things: 0 } });   // (tally: what the engine has been given and what became of it, since the page opened)
  if (!C) return;
  const V = C.Vec3, DEG = Math.PI / 180;
  // hz: the engine's steps a second; sub: the most steps in one frame; iter: the solver's passes over the joints and
  // contacts each step; fric, bounce: the ground and the bodies; lin, ang: what the air and a body's own stiffness take
  // from a part's speed and spin each second; most: how many bodies the engine carries at once (one more, and the one
  // that has lain longest is left as it lies); life: the longest a body is carried (s); calm, vCalm, wCalm: a body all of
  // whose parts are slower than vCalm (m/s) and wCalm (rad/s) for calm seconds is left as it lies; self: its own parts
  // strike each other (an arm does not pass through the chest).
  const TUNE = (P.TUNE = { hz: 60, sub: 6, iter: 14, grav: 9.81, fric: 0.85, bounce: 0.04, lin: 0.06, ang: 0.55, most: 6, life: 7, calm: 0.5, vCalm: 0.3, wCalm: 1.6, self: true });
  const PARTS = (P.PARTS = ["P", "T", "H", "aL", "aR", "eL", "eR", "lL", "lR", "kL", "kR"]);
  const UP = (P.UP = { T: "P", H: "T", aL: "T", aR: "T", eL: "aL", eR: "aR", lL: "P", lR: "P", kL: "lL", kR: "lR" });
  const MASS = { P: 11, T: 24, H: 5, aL: 3, aR: 3, eL: 2.2, eR: 2.2, lL: 8, lR: 8, kL: 4.5, kR: 4.5 };   // (kg, a man of ordinary size)
  const GROUND = 1, MOVER = 2, PART = 4, THING = 8;
  const X = new V(1, 0, 0), Y = new V(0, 1, 0), DOWN = new V(0, -1, 0);
  const unit = (x, y, z) => { const v = new V(x, y, z); v.normalize(); return v; };

  // A joint: the two parts meet at one point, and lines fixed in each are kept within an angle of each other.
  class Joint extends C.PointToPointConstraint {
    constructor(a, pa, b, pb, force) { super(a, pa, b, pb, force); this.collideConnected = false; this.force = force; this.lims = []; this.hinge = null; }
    // (the equation pushes one way only: back inside the angle, never out to it)
    limit(va, vb, angle) { const e = new C.RotationalEquation(this.bodyA, this.bodyB, { maxForce: this.force }); e.maxForce = 0; e.minForce = -this.force; e.maxAngle = angle; this.equations.push(e); this.lims.push({ e, va, vb }); return this; }
    // (an elbow, a knee: the two parts turn about one line, fixed in both)
    hingeOn(axis) { const o = { maxForce: this.force }, r1 = new C.RotationalEquation(this.bodyA, this.bodyB, o), r2 = new C.RotationalEquation(this.bodyA, this.bodyB, o); this.equations.push(r1, r2); this.hinge = { axis, r1, r2, wa: new V(), wb: new V() }; return this; }
    update() {
      super.update(); const A = this.bodyA, B = this.bodyB;
      for (const l of this.lims) { A.vectorToWorldFrame(l.va, l.e.axisA); B.vectorToWorldFrame(l.vb, l.e.axisB); }
      const h = this.hinge; if (h) { A.vectorToWorldFrame(h.axis, h.wa); B.vectorToWorldFrame(h.axis, h.wb); h.wa.tangents(h.r1.axisA, h.r2.axisA); h.r1.axisB.copy(h.wb); h.r2.axisB.copy(h.wb); }
    }
  }
  // A cone about a line that is not the limb's own at rest: the limb's sideways line is carried to where it would lie with
  // the limb on the cone's middle, and held near that too, so the limb cannot be wrung round on itself.
  const _q = new C.Quaternion();
  function socket(j, mid, cone, twist) { _q.setFromVectors(DOWN, mid); const side = new V(); _q.vmult(X, side); j.limit(mid, DOWN, cone); j.limit(side, X, twist); }

  let W = null;
  P.world = () => W;
  P.open = function () {
    P.close();
    const world = new C.World({ gravity: new V(0, -TUNE.grav, 0), allowSleep: true });
    world.solver.iterations = TUNE.iter; world.defaultContactMaterial.friction = TUNE.fric; world.defaultContactMaterial.restitution = TUNE.bounce;
    const ground = new C.Body({ mass: 0, shape: new C.Plane(), collisionFilterGroup: GROUND, collisionFilterMask: PART | THING });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(ground);
    const slick = new C.Material("mover"); world.addContactMaterial(new C.ContactMaterial(world.defaultMaterial, slick, { friction: 0.08, restitution: 0.12 }));   // (a body slides off a flank or a wheel-guard: it is not carried along on the front of a car)
    W = { world, ground, slick, rags: [], movers: new Map(), things: [], lumps: [], t: 0, steps: 0, made: 0, left: 0 };
    return W;
  };
  P.close = function () { if (!W) return; for (const r of W.rags) r.frozen = true; for (const t of W.things) t.done = true; W = null; };
  // How many bodies the engine is carrying now.
  P.live = () => (W ? W.rags.length : 0);

  function ball(body, x, y, z, r) { body.addShape(new C.Sphere(r), new V(x, y, z)); }
  // Balls along a bone, from the joint to where the bone ends (in the part's own frame): [how far along, how thick].
  function chain(body, end, s, list) { for (const [t, r] of list) ball(body, end.x * t, end.y * t, end.z * t, r * s); }

  // frames: { s: the body's size (1: a grown man, 1.72 m), at: { P: { p: [x, y, z], q: [x, y, z, w] }, T, H, aL, aR,
  // eL, eR, lL, lR, kL, kR: where each joint is and how it is turned, in the world; wL, wR, fL, fR: where the wrists
  // and ankles are, if known } }.
  // o.v: the speed the whole body has (m/s); o.push: more of it, given most to the head and trunk and least to the feet
  // (a blow high on the body: it goes over); o.low: given most to the legs instead (swept off his feet); o.spin: a
  // turn about the upright (rad/s); o.alive: he is only down, and will be given back to his poses (P.rise).
  P.rag = function (frames, o) {
    if (!W) return null; o = o || {};
    if (W.rags.length >= TUNE.most) { // the one that has lain longest is left as it lies; if none has lain a second, this one is not taken
      let old = null; for (const r of W.rags) if (!r.alive && (r.age > 1 || o.alive) && (!old || r.age > old.age)) old = r;   // (a living man thrown down comes before the dead)
      if (!old) { P.tally.refused++; return null; } freeze(old);
    }
    const s = frames.s || 1, at = frames.at, b = {}, world = W.world, m3 = s * s * s;
    const rag = { b, joints: [], age: 0, calm: 0, frozen: false, alive: !!o.alive, s, id: ++W.made, hit: 0 };
    for (const k of PARTS) { const f = at[k];
      const body = (b[k] = new C.Body({ mass: MASS[k] * m3, position: new V(f.p[0], f.p[1], f.p[2]), quaternion: new C.Quaternion(f.q[0], f.q[1], f.q[2], f.q[3]), linearDamping: TUNE.lin, angularDamping: TUNE.ang, allowSleep: false,
        collisionFilterGroup: PART, collisionFilterMask: GROUND | MOVER | PART | THING }));
      body.rag = rag; body.part = k; }
    const loc = (k, p, d) => { const out = new V(); if (p) b[k].pointToLocalFrame(new V(p[0], p[1], p[2]), out); else out.set(d[0] * s, d[1] * s, d[2] * s); return out; };
    const near = (k, key, d) => { const e = at[key] ? loc(k, at[key].p) : null, l = e ? e.length() : 0, want = Math.hypot(d[0], d[1], d[2]) * s; return e && l > want * 0.6 && l < want * 1.5 ? e : loc(k, null, d); };
    // The parts' shapes: balls, which meet the ground and each other cheaply and never catch on an edge.
    ball(b.P, 0, -0.02 * s, 0, 0.125 * s); ball(b.P, 0.09 * s, -0.05 * s, 0, 0.1 * s); ball(b.P, -0.09 * s, -0.05 * s, 0, 0.1 * s);
    ball(b.T, 0, 0.2 * s, 0, 0.125 * s); ball(b.T, 0, 0.39 * s, 0.01 * s, 0.145 * s);
    for (const sd of ["L", "R"]) { const sh = loc("T", at["a" + sd].p); ball(b.T, sh.x * 0.7, sh.y * 0.96, sh.z, 0.085 * s); }
    { const hs = frames.hs || 1; ball(b.H, 0, 0.125 * s * hs, 0.012 * s, 0.105 * s * hs); }
    for (const sd of ["L", "R"]) {
      chain(b["a" + sd], loc("a" + sd, at["e" + sd].p), s, [[0.28, 0.056], [0.78, 0.05]]);
      { const end = near("e" + sd, "w" + sd, [0, -0.3, 0]); chain(b["e" + sd], end, s, [[0, 0.047], [0.3, 0.046], [0.74, 0.04], [1.2, 0.045]]); }
      chain(b["l" + sd], loc("l" + sd, at["k" + sd].p), s, [[0.16, 0.086], [0.52, 0.078], [0.88, 0.064]]);
      { const end = near("k" + sd, "f" + sd, [0, -0.44, 0]); chain(b["k" + sd], end, s, [[0, 0.062], [0.3, 0.06], [0.7, 0.05], [1, 0.046]]); ball(b["k" + sd], end.x, end.y - 0.02 * s, end.z + 0.11 * s, 0.04 * s); }
    }
    for (const k of PARTS) world.addBody(b[k]);
    // The joints. At rest every part's frame lies square with the body (x to its left, y up, z the way it faces), so
    // the same line named in two parts is one line when he stands at ease.
    const J = (ka, kb) => { const A = b[ka], B = b[kb], pa = new V(); A.pointToLocalFrame(B.position, pa); const j = new Joint(A, pa, B, new V(0, 0, 0), 1e6); world.addConstraint(j); rag.joints.push(j); return j; };
    J("P", "T").limit(unit(0, Math.cos(8 * DEG), Math.sin(8 * DEG)), Y, 32 * DEG).limit(X, X, 30 * DEG);     // the spine: further forward than back; a little twist
    J("T", "H").limit(Y, Y, 40 * DEG).limit(X, X, 48 * DEG);                                               // the neck
    for (const sd of ["L", "R"]) { const sx = sd === "L" ? 1 : -1;
      socket(J("T", "a" + sd), unit(0.7 * sx, -0.62, 0.35), 84 * DEG, 100 * DEG);                           // the shoulder: a wide cone, out, down and a little forward
      { const f = 71 * DEG; J("a" + sd, "e" + sd).hingeOn(X).limit(unit(0, -Math.cos(f), Math.sin(f)), DOWN, f + 2 * DEG); }   // the elbow: straight to 144 degrees, forward only
      socket(J("P", "l" + sd), unit(0.16 * sx, -1, 0.45), 58 * DEG, 66 * DEG);                              // the hip: further forward than back or out
      { const f = 68 * DEG; J("l" + sd, "k" + sd).hingeOn(X).limit(unit(0, -Math.cos(f), -Math.sin(f)), DOWN, f + 2 * DEG); }  // the knee: straight to 138 degrees, back only
    }
    if (!TUNE.self) { // (its own parts pass through each other: each pair is named to the engine as joined)
      for (let i = 0; i < PARTS.length; i++) for (let k = i + 1; k < PARTS.length; k++) { if (UP[PARTS[k]] === PARTS[i] || UP[PARTS[i]] === PARTS[k]) continue; const c = new C.Constraint(b[PARTS[i]], b[PARTS[k]], { collideConnected: false }); c.update = () => {}; world.addConstraint(c); rag.joints.push(c); } }
    // How it is going.
    const v = o.v || [0, 0, 0], pu = o.push || [0, 0, 0], HI = { H: 1.15, T: 1, aL: 0.9, aR: 0.9, eL: 0.8, eR: 0.8, P: 0.5, lL: 0.28, lR: 0.28, kL: 0.08, kR: 0.08 }, LO = { H: 0.1, T: 0.25, aL: 0.2, aR: 0.2, eL: 0.2, eR: 0.2, P: 0.55, lL: 0.9, lR: 0.9, kL: 1.15, kR: 1.15 };
    for (const k of PARTS) { const w = (o.low ? LO : HI)[k]; b[k].velocity.set(v[0] + pu[0] * w, v[1] + pu[1] * w, v[2] + pu[2] * w); }
    if (o.spin) { const c = b.P.position; for (const k of PARTS) { const p = b[k].position; b[k].velocity.x += o.spin * (p.z - c.z); b[k].velocity.z -= o.spin * (p.x - c.x); b[k].angularVelocity.y = o.spin; } }
    // (what struck it hardest, for the eye and the ear: the view asks rag.hit and sets it back to nought)
    b.T.addEventListener("collide", (e) => { const n = Math.abs(e.contact.getImpactVelocityAlongNormal()); if (n > rag.hit) { rag.hit = n; rag.hitBy = e.body && e.body.rag && e.body.rag !== rag ? "body" : e.body && e.body.mover ? "mover" : "ground"; } });
    // Struck by a car or an elephant, he begins under it (the rules count the meeting from the car's middle, and its team
    // is before that): for the first moments it passes over him, and does not carry him off in its teeth.
    const lp = new V(); rag.under = [];
    for (const m of W.movers.values()) { if (m.kind !== "car" && m.kind !== "elephant") continue; m.body.pointToLocalFrame(b.P.position, lp);
      if (Math.abs(lp.x) < 1.5 && lp.z > (m.kind === "car" ? -1.5 : -2.5) && lp.z < (m.kind === "car" ? 4.2 : 3.4)) for (const k of PARTS) { const c = new C.Constraint(b[k], m.body, { collideConnected: false, wakeUpBodies: false }); c.update = () => {}; world.addConstraint(c); rag.under.push(c); } }
    W.rags.push(rag); P.tally.made++; return rag;
  };
  function unbuild(r) { if (!W || r.out) return; r.out = true; for (const j of r.joints) W.world.removeConstraint(j); for (const c of r.under) W.world.removeConstraint(c); r.under.length = 0; for (const k of PARTS) W.world.removeBody(r.b[k]); const i = W.rags.indexOf(r); if (i >= 0) W.rags.splice(i, 1); }
  // Left as it lies: the engine lets go of it, and it keeps the place and the shape it has.
  function freeze(r) { if (r.frozen) return; r.frozen = true; for (const k of PARTS) { const b = r.b[k]; b.interpolatedPosition.copy(b.position); b.interpolatedQuaternion.copy(b.quaternion); }
    if (W && !r.alive && !r.broke) { // where it lies it is still in the way of what falls after it: three balls that nothing moves (hips, chest, head), for the last twelve bodies left
      const lump = new C.Body({ mass: 0, collisionFilterGroup: GROUND, collisionFilterMask: PART | THING }), s = r.s, c = new V();
      lump.addShape(new C.Sphere(0.13 * s), r.b.P.position.clone()); r.b.T.pointToWorldFrame(new V(0, 0.36 * s, 0), c); lump.addShape(new C.Sphere(0.14 * s), c.clone()); r.b.H.pointToWorldFrame(new V(0, 0.12 * s, 0), c); lump.addShape(new C.Sphere(0.1 * s), c.clone());
      W.world.addBody(lump); W.lumps.push(lump); while (W.lumps.length > 12) W.world.removeBody(W.lumps.shift()); }
    unbuild(r); if (W) W.left++; P.tally.left++; if (r.broke) P.tally.broke++; }
  P.freeze = freeze;
  // A man only thrown down is still where the rules have him, near enough: the whole body is drawn toward that place as
  // by a wind, harder the further it has gone from it (the rules slide him over the ground; the engine throws him).
  P.lead = function (r, x, z, dt) {
    if (!r || r.frozen || !(dt > 0)) return; const p = r.b.P.position; let ax = (x - p.x) * 16, az = (z - p.z) * 16; const a = Math.hypot(ax, az); if (a > 22) { ax *= 22 / a; az *= 22 / a; }
    for (const k of PARTS) { const b = r.b[k]; b.velocity.x += ax * dt; b.velocity.z += az * dt; }
  };
  // A blow on a body the engine has: its trunk and hips are given so much more speed (m/s), and the rest goes with them.
  P.shove = function (r, x, y, z) { if (!r || r.frozen) return; for (const k of ["T", "P", "H"]) { const b = r.b[k], w = k === "T" ? 1 : 0.6; b.velocity.x += x * w; b.velocity.y += y * w; b.velocity.z += z * w; } r.calm = 0; };
  // He was only down, and now he is killed where he lies: the engine keeps him, with what the blow adds.
  P.kill = function (r, push) { if (!r || r.frozen) return false; r.alive = false; r.age = 0; r.calm = 0; if (push) for (const k of PARTS) { const b = r.b[k]; b.velocity.x += push[0]; b.velocity.y += push[1]; b.velocity.z += push[2]; } return true; };
  P.drop = function (r) { if (r) { r.frozen = true; unbuild(r); } };

  // Something the bodies cannot move, that moves them. o: { kind: "man" | "car" | "elephant", x, z, a (the way it faces),
  // vx, vz (m/s), s (size) }. Called every frame with where the thing now is; P.unmover(id) when it is gone.
  P.mover = function (id, o) {
    if (!W) return; let m = W.movers.get(id);
    if (!m) { const body = new C.Body({ mass: 0, type: C.Body.KINEMATIC, material: W.slick, collisionFilterGroup: MOVER, collisionFilterMask: PART | THING }), s = o.s || 1; body.mover = id;
      const at = (r, x, y, z) => body.addShape(new C.Sphere(r), new V(x, y, z));
      if (o.kind === "car") { body.addShape(new C.Box(new V(0.8, 0.45, 1.0)), new V(0, 0.95, 0)); for (const x of [-0.5, 0.5]) { at(0.6, x, 1.15, 3.1); at(0.62, x, 1.15, 2.2); at(0.5, x, 1.1, 1.45); } }   // the car, from the axle up (its wheels go over what lies on the ground), and the two horses before it, rounded, so that a body is turned aside by a shoulder
      else if (o.kind === "elephant") { for (const z of [-1.2, 0, 1.2]) at(1.1, 0, 1.9, z); at(0.8, 0, 1.9, 2.3); for (const x of [-0.6, 0.6]) for (const z of [-1.2, 1.2]) at(0.4, x, 0.45, z); }   // its barrel, its head, and its four feet, which kick aside what lies in their way
      else at(0.27 * s, 0, 1.02 * s, 0);   // a man standing: his trunk, which a body thrown at him strikes; his feet step over what lies on the ground
      W.world.addBody(body); m = { body, kind: o.kind }; W.movers.set(id, m); body.position.set(o.x, o.y || 0, o.z); }
    const b = m.body; let vx = o.vx || 0, vz = o.vz || 0;
    if (o.dt > 0) { vx = (o.x - b.position.x) / o.dt; vz = (o.z - b.position.z) / o.dt; const l = Math.hypot(vx, vz); if (l > 14) { vx *= 14 / l; vz *= 14 / l; } }   // (its speed is how far it has come since the last frame; being set down somewhere else is not a blow)
    b.position.set(o.x, o.y || 0, o.z); b.velocity.set(vx, 0, vz); if (o.a != null) b.quaternion.setFromAxisAngle(Y, o.a);
  };
  P.unmover = function (id) { if (!W) return; const m = W.movers.get(id); if (!m) return;
    for (const r of W.rags) if (r.under.length) { for (let i = r.under.length - 1; i >= 0; i--) if (r.under[i].bodyB === m.body) { W.world.removeConstraint(r.under[i]); r.under.splice(i, 1); } }
    W.world.removeBody(m.body); W.movers.delete(id); };

  // One loose rigid thing: a box. o: { p, q (where it is and how turned), half: [x, y, z] (half its length each way, in
  // its own frame), off: [x, y, z] (the box's middle from the thing's own origin), m (kg), v, w (its speed and spin),
  // life (s) }. Returns { p, q (where it is now), rest (true once it lies still), done }.
  P.thing = function (o) {
    if (!W) return null;
    const body = new C.Body({ mass: o.m || 2, position: new V(o.p[0], o.p[1], o.p[2]), quaternion: new C.Quaternion(o.q[0], o.q[1], o.q[2], o.q[3]), linearDamping: 0.05, angularDamping: 0.25, allowSleep: true, sleepSpeedLimit: 0.25, sleepTimeLimit: 0.6,
      collisionFilterGroup: THING, collisionFilterMask: GROUND | MOVER | PART });
    const h = o.half, off = o.off || [0, 0, 0]; body.addShape(new C.Box(new V(Math.max(0.012, h[0]), Math.max(0.012, h[1]), Math.max(0.012, h[2]))), new V(off[0], off[1], off[2]));
    if (o.v) body.velocity.set(o.v[0], o.v[1], o.v[2]); if (o.w) body.angularVelocity.set(o.w[0], o.w[1], o.w[2]);
    const th = { body, age: 0, life: o.life || 8, rest: false, done: false, hit: 0, p: body.interpolatedPosition, q: body.interpolatedQuaternion };
    body.addEventListener("collide", (e) => { const n = Math.abs(e.contact.getImpactVelocityAlongNormal()); if (n > th.hit) th.hit = n; });
    W.world.addBody(body); W.things.push(th); P.tally.things++;
    while (W.things.length > 20) unthing(W.things[0]);   // (the oldest goes)
    return th;
  };
  function unthing(th) { if (!W) return; const i = W.things.indexOf(th); if (i >= 0) W.things.splice(i, 1); if (!th.out) { th.out = true; W.world.removeBody(th.body); } th.done = true; }
  P.unthing = unthing;

  // The engine goes forward. Nothing is reckoned while nothing is loose.
  P.step = function (dt) {
    if (!W) return 0; W.t += dt;
    let busy = W.rags.length > 0; if (!busy) for (const t of W.things) if (!t.rest) { busy = true; break; }
    if (!busy || !(dt > 0)) { if (dt > 0) for (let i = W.things.length - 1; i >= 0; i--) { const t = W.things[i]; t.age += dt; if (t.age > t.life) unthing(t); } return 0; }
    const h = 1 / TUNE.hz, world = W.world, t0 = world.stepnumber;
    world.step(h, Math.min(dt, h * TUNE.sub), TUNE.sub);
    const n = world.stepnumber - t0; W.steps += n;
    for (let i = W.rags.length - 1; i >= 0; i--) { const r = W.rags[i]; r.age += dt;
      let vm = 0, wm = 0, bad = false; for (const k of PARTS) { const b = r.b[k], v = b.velocity.length(), w = b.angularVelocity.length(); if (v > vm) vm = v; if (w > wm) wm = w; if (!(v < 60) || !(b.position.y > -1) || !(b.position.y < 30)) bad = true; }
      r.speed = vm; if (r.under.length && r.age > 0.9) { for (const c of r.under) world.removeConstraint(c); r.under.length = 0; }
      if (bad) { r.broke = true; freeze(r); continue; }   // (never seen in the tests; a body that has gone wrong is left, not followed)
      if (r.age > 1.6) { const k = Math.min(1, (r.age - 1.6) / 2.4); for (const key of PARTS) { r.b[key].linearDamping = TUNE.lin + 0.3 * k; r.b[key].angularDamping = TUNE.ang + 0.35 * k; } }   // (it settles: a body does not twitch for ever)
      r.calm = vm < TUNE.vCalm && wm < TUNE.wCalm ? r.calm + dt : 0;
      if (r.alive ? r.age > TUNE.life : r.calm > TUNE.calm || r.age > TUNE.life) freeze(r);
    }
    for (let i = W.things.length - 1; i >= 0; i--) { const t = W.things[i]; t.age += dt; if (!t.rest && (t.body.sleepState === C.Body.SLEEPING || t.age > 5)) { t.rest = true; t.body.interpolatedPosition.copy(t.body.position); t.body.interpolatedQuaternion.copy(t.body.quaternion); t.out = true; world.removeBody(t.body); } if (t.age > t.life) unthing(t); }
    return n;
  };

  // ---------- A figure given to it (js/g3/figure.js) ----------
  const T3 = window.THREE;
  if (!T3) return;
  const _p = new T3.Vector3(), _s = new T3.Vector3(), _qa = new T3.Quaternion(), _qb = new T3.Quaternion(), _qc = new T3.Quaternion(), _e = new T3.Euler();
  function framesOf(f) {
    f.root.updateMatrixWorld(true); const at = {}; let s = 1;
    for (const k of PARTS.concat(["wL", "wR", "fL", "fR"])) { const j = f.j[k]; if (!j) continue; j.matrixWorld.decompose(_p, _qa, _s); at[k] = { p: [_p.x, _p.y, _p.z], q: [_qa.x, _qa.y, _qa.z, _qa.w] }; if (k === "P") s = _s.y; }
    return { s, at, hs: f.model ? 1 : Math.min(1.5, f.j.H.scale.y) };
  }
  // The figure, as it stands this moment, is given to the engine. Null if the engine would not take it (it is carrying
  // all it can): the figure then falls by its own poses, as it did before there was an engine.
  P.take = function (f, o) {
    if (!W || !f || !f.j || !f.j.P || !f.j.kL) return null;
    if (f.rag && !f.rag.frozen) P.drop(f.rag);
    const r = P.rag(framesOf(f), o); if (!r) return null;
    f.rag = r; r.out2 = null; f.fallTo = 0; f.spin = 0; f.action = null; return r;
  };
  // The engine's body written into the figure. 0: the figure is its own; 1: the engine has it; 2: it lies as the engine
  // left it; 3: it is coming back out of the fall to its poses (the figure sets its pose first, and P.blend lays the
  // fall over it).
  P.put = function (f, dt) {
    const r = f.rag; if (!r) return 0;
    if (r.rise) return 3;
    if (r.frozen) { if (r.alive) return 1; r.lain = (r.lain || 0) + (dt || 0); return 2; }
    const b = r.b, j = f.j, pp = b.P.interpolatedPosition;
    f.root.position.x = pp.x; f.root.position.z = pp.z;
    f.tilt.rotation.set(0, 0, 0); f.tilt.position.set(0, 0, 0); f.tilt.updateWorldMatrix(true, false);
    j.P.position.copy(f.tilt.worldToLocal(_p.set(pp.x, pp.y, pp.z)));
    f.tilt.matrixWorld.decompose(_p, _qa, _s); _qa.invert();
    const q = (k) => { const c = b[k].interpolatedQuaternion; return _qc.set(c.x, c.y, c.z, c.w); };
    j.P.quaternion.copy(_qa).multiply(q("P"));
    for (const k of PARTS) { const up = UP[k]; if (!up) continue; const c = b[up].interpolatedQuaternion; _qb.set(-c.x, -c.y, -c.z, c.w); j[k].quaternion.copy(_qb).multiply(q(k)); }
    if (j.cL) j.cL.quaternion.identity(); if (j.cR) j.cR.quaternion.identity();
    return 1;
  };
  // He gets up: the engine lets go, and over secs the figure goes from how it lay to what its poses ask.
  P.rise = function (f, secs) {
    const r = f.rag; if (!r || r.rise) return;
    if (!r.frozen) { for (const k of PARTS) { const b = r.b[k]; b.interpolatedPosition.copy(b.position); b.interpolatedQuaternion.copy(b.quaternion); } }
    P.put(f, 0);
    const from = {}; for (const k of PARTS) from[k] = f.j[k].quaternion.clone();
    f.tilt.updateWorldMatrix(true, false); const at = f.j.P.getWorldPosition(new T3.Vector3()), tq = f.j.P.getWorldQuaternion(new T3.Quaternion());
    r.frozen = true; unbuild(r); r.rise = { t: 0, secs: secs || 0.5, from, at, tq };
  };
  // (figure.js, after its own pose is set: what is left of the fall is laid over it)
  P.blend = function (f, dt) {
    const r = f.rag, u = r && r.rise; if (!u) return;
    u.t += dt; const k = Math.min(1, u.t / u.secs), w = 1 - k * k * (3 - 2 * k), j = f.j;
    if (w <= 0) { f.rag = null; return; }
    f.tilt.updateWorldMatrix(true, false);
    f.tilt.worldToLocal(_p.copy(u.at)); j.P.position.lerp(_p, w);
    f.tilt.matrixWorld.decompose(_p, _qa, _s); _qa.invert().multiply(u.tq); j.P.quaternion.slerp(_qa, w);
    for (const key of PARTS) if (key !== "P") j[key].quaternion.slerp(u.from[key], w);
  };
  P.free = function (f) { if (f && f.rag) { P.drop(f.rag); f.rag = null; } };

  // ---------- What a man lets go of ----------
  // P.loose(obj, vel, spin, o): obj (anywhere in the scene) is let go with a speed (m/s) and a spin (rad/s). It is a box
  // the size of itself: it turns in the air, strikes the ground and whatever lies there, and comes to rest as its own
  // shape leaves it (a mace on its side, a shield flat or rocking on its rim). After o.life seconds (8) it shrinks away.
  const _box = new T3.Box3(), _b2 = new T3.Box3(), _m = new T3.Matrix4(), _inv = new T3.Matrix4(), loose = [];
  P.loose = function (obj, vel, spin, o) {
    if (!W || !obj || !G.fxRoot) return null; o = o || {};
    obj.updateWorldMatrix(true, true); _inv.copy(obj.matrixWorld).invert(); _box.makeEmpty();
    obj.traverse((c) => { if (!c.isMesh || !c.geometry) return; if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); _b2.copy(c.geometry.boundingBox).applyMatrix4(_m.multiplyMatrices(_inv, c.matrixWorld)); _box.union(_b2); });
    if (_box.isEmpty()) return null;
    G.fxRoot.attach(obj); obj.matrixWorld.decompose(_p, _qa, _s);
    const half = _box.getSize(new T3.Vector3()).multiply(_s).multiplyScalar(0.5), mid = _box.getCenter(new T3.Vector3()).multiply(_s);
    const th = P.thing({ p: [_p.x, Math.max(_p.y, 0.05), _p.z], q: [_qa.x, _qa.y, _qa.z, _qa.w], half: [half.x, half.y, half.z], off: [mid.x, mid.y, mid.z], m: o.m || 2.5, v: [vel.x, vel.y, vel.z], w: spin ? [spin.x, spin.y, spin.z] : null, life: o.life || 8 });
    if (!th) return null;
    th.obj = obj; th.s0 = obj.scale.x; loose.push(th); return th;
  };
  function looseFrame() {
    for (let i = loose.length - 1; i >= 0; i--) { const th = loose[i], obj = th.obj;
      if (!obj.parent) { unthing(th); loose.splice(i, 1); continue; }
      if (!th.frozen) { obj.position.set(th.p.x, th.p.y, th.p.z); obj.quaternion.set(th.q.x, th.q.y, th.q.z, th.q.w); if (th.rest) th.frozen = true; }
      if (th.age > th.life - 0.6) obj.scale.setScalar(th.s0 * Math.max(0.02, (th.life - th.age) / 0.6));
      if (th.done) { if (obj.parent) obj.parent.remove(obj); if (G.dispose) G.dispose(obj); loose.splice(i, 1); } }
  }
  { const step0 = P.step; P.step = function (dt) { const n = step0(dt); looseFrame(); return n; }; }
  { const close0 = P.close; P.close = function () { for (const th of loose) { th.done = true; if (th.obj.parent) th.obj.parent.remove(th.obj); if (G.dispose) G.dispose(th.obj); } loose.length = 0; close0(); }; }
})(window.K = window.K || {});
