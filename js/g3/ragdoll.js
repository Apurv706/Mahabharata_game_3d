/* Bodies under a real physics engine.

   The fight's rules (js/ui/battle/sim.js) decide who is struck, thrown and killed, by a reckoning that comes out the
   same on every machine. What a body then DOES is given to cannon-es (js/vendor/cannon-es.min.js, MIT licence): a man
   who is killed, or taken off his feet, becomes eleven rigid parts (hips, trunk, head, upper arms, forearms, thighs,
   shins) joined where his joints are. Each joint turns only as far as a joint turns: a knee and an elbow on one line
   and one way, a shoulder and a hip inside a cone, the spine and the neck a little. The parts have their weights
   (75 kg for a man of ordinary size), fall under gravity, strike the ground, each other, other bodies, the living, the
   chariots and the elephants, and lie where that leaves them. What he let go of falls and turns the same way. A man
   in a chariot falls on its floor, against its rails, or over them and out. A horse and an elephant are bodies of the
   same kind: a barrel with nearly all the weight, and a neck or a trunk and four legs hung from it.

   Nothing here changes who wins: the rules never read a body's place back from the engine.

     P.open()                a world for one fight (ground at y = 0)        P.close()
     P.step(dt)              the engine goes forward by dt seconds
     P.rag(frames, o)        a man from where his joints are (plain numbers: tests/ragdoll.js builds one with no page)
     P.beast(kind, frames, o)  a horse or an elephant, the same way
     P.take(figure, o)       a man, from a figure (js/g3/figure.js) as it stands this moment
     P.takeBeast(g, kind, o) a beast, from the kit's own (js/g3/kit.js)
     P.put(figure, dt)       the engine's body written back into the figure (figure.js calls this from its own update)
     P.rise(figure, secs)    the figure is given back to its poses, and comes out of the fall over secs
     P.mover(id, o)          something the bodies cannot move, that moves them: a living man, a car, its team, an elephant
     P.thing(o), P.loose()   one loose rigid thing (a dropped mace, a shield, a wheel that rolls)
*/
(function (K) {
  "use strict";
  const C = window.CANNON, G = (K.G3 = K.G3 || {});
  const P = (G.phys = { ok: !!C, tally: { made: 0, left: 0, broke: 0, refused: 0, things: 0, beasts: 0 } });   // (tally: what the engine has been given and what became of it, since the page opened)
  if (!C) return;
  const V = C.Vec3, DEG = Math.PI / 180, NOP = () => {};
  // hz: the engine's steps a second; sub: the most steps in one frame; iter: the solver's passes over the joints and
  // contacts each step; fric, bounce: the ground and the bodies; lin, ang: what the air and a body's own stiffness take
  // from a part's speed and spin each second; life: the longest a body is carried (s); calm, vCalm, wCalm: a body all of
  // whose parts are slower than vCalm (m/s) and wCalm (rad/s) for calm seconds is left as it lies; self: a man's own
  // parts strike each other (an arm does not pass through the chest).
  // How much the engine carries at once is counted in parts (a man is eleven, a horse ten, an elephant twelve). parts:
  // how many it begins with (66: six men); adapt: it then finds its own number from what a step costs on this machine,
  // between partsMin and partsMost, so that a step with a full load takes about `aim` milliseconds. One body more than
  // there is room for, and the one that has lain longest is left as it lies.
  const TUNE = (P.TUNE = { hz: 60, sub: 6, iter: 14, grav: 9.81, fric: 0.85, bounce: 0.04, lin: 0.06, ang: 0.55, parts: 66, partsMin: 33, partsMost: 132, adapt: true, aim: 2, life: 7, calm: 0.5, vCalm: 0.3, wCalm: 1.6, self: true });
  const PARTS = (P.PARTS = ["P", "T", "H", "aL", "aR", "eL", "eR", "lL", "lR", "kL", "kR"]);
  const UP = (P.UP = { T: "P", H: "T", aL: "T", aR: "T", eL: "aL", eR: "aR", lL: "P", lR: "P", kL: "lL", kR: "lR" });
  const MASS = { P: 11, T: 24, H: 5, aL: 3, aR: 3, eL: 2.2, eR: 2.2, lL: 8, lR: 8, kL: 4.5, kR: 4.5 };   // (kg, a man of ordinary size)
  // 17 November (Version 78): each figure's own build. The bodies are sculpted people now, and they differ: Bhima's trunk is a
  // quarter broader than a foot soldier's, Draupadi's limbs a sixth slighter. The engine's body follows: [limbs, trunk],
  // how thick against the ordinary man's (the foot soldier's, 1). A part's weight goes by the square of it (its length
  // is the skeleton's, which the figure's height already scales). Written by tools/blender/phys_table.py from the cast's specs.
  P.BUILDS = /*BUILDS*/{"player_m_child":[0.92,0.93],"player_m_youth":[0.94,0.94],"player_m_adult":[1.0,1.0],"player_m_elder":[0.94,0.95],"player_f_child":[0.83,0.87],"player_f_youth":[0.83,0.88],"player_f_adult":[0.83,0.88],"player_f_elder":[0.84,0.9],"soldier_foot_adult":[1.0,1.0],"soldier_archer_adult":[1.0,1.0],"soldier_charioteer_adult":[1.0,1.0],"soldier_cw_adult":[1.07,1.1],"yudhishthira_child":[0.92,0.93],"yudhishthira_youth":[0.94,0.94],"yudhishthira_adult":[0.92,0.93],"bhima_child":[1.01,1.05],"bhima_youth":[1.02,1.05],"bhima_adult":[1.13,1.26],"arjuna_child":[0.92,0.93],"arjuna_youth":[0.94,0.94],"arjuna_adult":[1.04,1.05],"nakula_child":[0.92,0.93],"nakula_youth":[0.94,0.94],"nakula_adult":[0.96,0.96],"sahadeva_child":[0.92,0.93],"sahadeva_youth":[0.94,0.94],"sahadeva_adult":[0.95,0.94],"draupadi_youth":[0.83,0.88],"draupadi_adult":[0.83,0.88],"krishna_adult":[1.0,1.01],"karna_child":[0.92,0.93],"karna_youth":[1.02,1.05],"karna_adult":[1.04,1.03],"duryodhana_child":[1.01,1.05],"duryodhana_youth":[1.02,1.05],"duryodhana_adult":[1.15,1.31],"bhishma_elder":[1.04,1.07],"drona_elder":[0.95,0.95],"dushasana_child":[1.01,1.05],"dushasana_youth":[1.02,1.05],"dushasana_adult":[1.13,1.25],"shakuni_elder":[0.94,0.95],"ashwatthama_child":[0.92,0.93],"ashwatthama_youth":[0.94,0.94],"ashwatthama_adult":[1.03,1.04],"kripa_elder":[0.94,0.95],"vidura_elder":[0.92,0.93],"dhritarashtra_elder":[1.07,1.31],"gandhari_elder":[0.84,0.9],"kunti_elder":[0.84,0.9],"balarama_adult":[1.12,1.23],"abhimanyu_youth":[0.97,0.95],"ghatotkacha_adult":[1.09,1.16],"drupada_elder":[1.03,1.07],"dhrishtadyumna_youth":[0.94,0.94],"dhrishtadyumna_adult":[1.07,1.1],"shikhandi_adult":[0.96,0.96],"satyaki_adult":[1.09,1.13],"jayadratha_adult":[1.1,1.2],"shalya_adult":[1.07,1.1],"virata_elder":[1.06,1.28],"uttara_adult":[0.97,0.95],"ekalavya_youth":[0.94,0.94],"ekalavya_adult":[1.0,1.0],"charu_adult":[1.02,1.01],"ugra_adult":[1.04,1.09],"mauni_elder":[0.94,0.95],"healer_elder":[0.84,0.9],"bard_adult":[0.97,0.98],"village_child_child":[0.92,0.93],"villager_m_adult":[0.99,0.99],"villager_f_adult":[0.84,0.9],"guard_adult":[1.02,1.01],"raider_adult":[1.05,1.09],"brahmin_adult":[1.0,1.15],"charu_child":[0.92,0.93],"charu_youth":[0.94,0.94],"ugra_child":[1.01,1.05],"ugra_youth":[0.99,1.04]}/*END*/;
  // Who meets whom. A body on the ground meets the ground, what moves (men, cars, teams, elephants), other bodies and
  // loose things. A man killed in a car meets its floor and rails, the ground, other bodies and loose things, and not
  // what moves: he is inside one car, and in a press another's team may be standing through it (the rules keep cars
  // two and a half metres apart, and a car with its team is five long), which held a dead man up on his feet. A man
  // only thrown down in a car meets its floor and rails and walls no one sees, which keep him in it: he is still its
  // rider. A beast meets the ground, what lies there, and other beasts: a horse falling on a man would crush the
  // engine's sums, not the man.
  const GROUND = 1, MOVER = 2, PART = 4, THING = 8, DECK = 16, CAGE = 32, BEAST = 64;
  const LOOSE = GROUND | MOVER | PART | THING, FALLEN = GROUND | DECK | PART | THING, RIDER = GROUND | DECK | CAGE | PART;
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
  // (two bodies named to the engine as joined, with nothing joining them: they pass through each other)
  function pass(a, b) { const c = new C.Constraint(a, b, { collideConnected: false, wakeUpBodies: false }); c.update = NOP; W.world.addConstraint(c); return c; }

  let W = null;
  P.world = () => W;
  P.open = function () {
    P.close();
    const world = new C.World({ gravity: new V(0, -TUNE.grav, 0), allowSleep: true });
    world.solver.iterations = TUNE.iter; world.defaultContactMaterial.friction = TUNE.fric; world.defaultContactMaterial.restitution = TUNE.bounce;
    const ground = new C.Body({ mass: 0, shape: new C.Plane(), collisionFilterGroup: GROUND, collisionFilterMask: PART | THING | BEAST });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(ground);
    const slick = new C.Material("mover"); world.addContactMaterial(new C.ContactMaterial(world.defaultMaterial, slick, { friction: 0.08, restitution: 0.12 }));   // (a body slides off a flank or a wheel-guard: it is not carried along on the front of a car)
    W = { world, ground, slick, rags: [], movers: new Map(), things: [], lumps: [], t: 0, steps: 0, made: 0, left: 0, budget: TUNE.parts, per: 0, perN: 0 };
    return W;
  };
  P.close = function () { if (!W) return; for (const r of W.rags) r.frozen = true; for (const t of W.things) t.done = true; W = null; };
  // How many bodies the engine is carrying now, and how many parts they come to.
  P.live = () => (W ? W.rags.length : 0);
  P.load = () => { let n = 0; if (W) for (const r of W.rags) n += r.keys.length; return n; };

  function ball(body, x, y, z, r) { body.addShape(new C.Sphere(r), new V(x, y, z)); }
  // Balls along a bone, from the joint to where the bone ends (in the part's own frame): [how far along, how thick].
  function chain(body, end, s, list) { for (const [t, r] of list) ball(body, end.x * t, end.y * t, end.z * t, r * s); }
  // Room for so many parts more: the dead who have lain longest are left as they lie until there is. (first: a living
  // man thrown down, who comes before the dead even if they have only just fallen.)
  function room(need, first) {
    let live = P.load();
    while (live + need > W.budget) { let old = null; for (const r of W.rags) if (!r.alive && (r.age > 1 || first) && (!old || r.age > old.age)) old = r; if (!old) return false; live -= old.keys.length; freeze(old); }
    return true;
  }

  // One body from a plan of it. spec: { kind, keys (its parts, a part's parent before it), up (each part's parent),
  // core (the part its weight is in), at (where each joint is: { p, q }), s (its size), mass, shapes(b, loc, s),
  // joints(J, b, loc, s), go(b, o, rag) (how it is going), apart (true: its own parts pass through each other), group,
  // mask, lin, ang, life, lumps(rag) (what is left in the way where it lies) }.
  // o.alive: it is only down, and will be given back (P.rise); o.car: the car (a mover's id) it rides in.
  function build(spec, o) {
    if (!W) return null; o = o || {};
    const keys = spec.keys, at = spec.at, s = spec.s || 1, alive = !!o.alive;
    if (!room(keys.length, alive)) { P.tally.refused++; return null; }
    const car = o.car != null ? W.movers.get(o.car) : null; if (car) deckOf(car);
    const b = {}, world = W.world, m3 = s * s * s, mask = spec.mask || (car ? (alive ? RIDER : FALLEN) : LOOSE);
    const rag = { kind: spec.kind, keys, up: spec.up, core: spec.core, b, joints: [], under: [], own: [], age: 0, calm: 0, frozen: false, alive, s, id: ++W.made, hit: 0, car: car ? o.car : null,
      life: spec.life || TUNE.life, lin: spec.lin != null ? spec.lin : TUNE.lin, ang: spec.ang != null ? spec.ang : TUNE.ang, lumps: spec.lumps || null };
    for (const k of keys) { const f = at[k];
      const body = (b[k] = new C.Body({ mass: spec.mass[k] * m3, position: new V(f.p[0], f.p[1], f.p[2]), quaternion: new C.Quaternion(f.q[0], f.q[1], f.q[2], f.q[3]), linearDamping: rag.lin, angularDamping: rag.ang, allowSleep: false,
        collisionFilterGroup: spec.group || PART, collisionFilterMask: mask }));
      body.rag = rag; body.part = k; }
    const loc = (k, p) => { const out = new V(); b[k].pointToLocalFrame(new V(p[0], p[1], p[2]), out); return out; };
    spec.shapes(b, loc, s);
    // A part's shapes were set out from its joint. The engine takes a body's own place to be where its weight is, so
    // each part is moved to the middle of its balls (each counted by its bulk), and remembers where its joint is from
    // there (jo): a thigh swings from the hip, and a horse's barrel is not a weight at its hooves that rights itself.
    for (const k of keys) { const B = b[k], c = new V(), t = new V(); let m = 0;
      B.shapes.forEach((sh, i) => { const w = sh.radius * sh.radius * sh.radius; m += w; B.shapeOffsets[i].scale(w, t); c.vadd(t, c); }); c.scale(1 / m, c);
      for (const off of B.shapeOffsets) off.vsub(c, off); B.quaternion.vmult(c, t); B.position.vadd(t, B.position); B.previousPosition.copy(B.position); B.interpolatedPosition.copy(B.position); B.initPosition.copy(B.position);
      B.jo = c.negate(); B.updateBoundingRadius(); B.updateMassProperties(); B.aabbNeedsUpdate = true; }
    rag.pt = (k, x, y, z) => { const B = b[k], w = new V(); B.pointToWorldFrame(new V(B.jo.x + (x || 0), B.jo.y + (y || 0), B.jo.z + (z || 0)), w); return w; };   // (a place named from a part's joint, in the world)
    for (const k of keys) world.addBody(b[k]);
    const J = (ka, kb) => { const A = b[ka], B = b[kb], pa = new V(); A.pointToLocalFrame(rag.pt(kb), pa); const j = new Joint(A, pa, B, B.jo.clone(), spec.force || 1e6); world.addConstraint(j); rag.joints.push(j); return j; };
    spec.joints(J, b, loc, s);
    if (spec.apart) for (let i = 0; i < keys.length; i++) for (let k = i + 1; k < keys.length; k++) { if (spec.up[keys[k]] === keys[i] || spec.up[keys[i]] === keys[k]) continue; rag.joints.push(pass(b[keys[i]], b[keys[k]])); }
    spec.go(b, o, rag);
    // (what struck it hardest, for the eye and the ear: the view asks rag.hit and sets it back to nought)
    b[spec.core].addEventListener("collide", (e) => { const n = Math.abs(e.contact.getImpactVelocityAlongNormal()); if (n > rag.hit) { rag.hit = n; rag.hitBy = e.body && e.body.rag && e.body.rag !== rag ? "body" : e.body && e.body.mover ? "mover" : "ground"; } });
    if (car) { const cv = car.body.velocity; for (const k of keys) { b[k].velocity.x += cv.x; b[k].velocity.z += cv.z; } }   // (a rider has the speed of what he rides in)
    else if (spec.kind === "man") { // Struck by a car or an elephant, he begins under it (the rules count the meeting from its middle): for the first moments it passes over him, and does not carry him off in its teeth.
      const lp = new V();
      for (const m of W.movers.values()) { if (m.kind === "man") continue; m.body.pointToLocalFrame(b[spec.core].position, lp);
        const z0 = m.kind === "car" ? -1.5 : m.kind === "team" ? 0.6 : -2.5, z1 = m.kind === "car" ? 1.7 : m.kind === "team" ? 4.4 : 3.4, wx = m.kind === "team" ? (m.n || 2) * 0.5 + 0.6 : 1.5;
        if (Math.abs(lp.x) < wx && lp.z > z0 && lp.z < z1) for (const k of keys) rag.under.push(pass(b[k], m.body)); } }
    W.rags.push(rag); P.tally.made++; return rag;
  }

  // ---------- A man ----------
  // frames: { s: the body's size (1: a grown man, 1.72 m), at: { P: { p: [x, y, z], q: [x, y, z, w] }, T, H, aL, aR,
  // eL, eR, lL, lR, kL, kR: where each joint is and how it is turned, in the world; wL, wR, fL, fR: where the wrists
  // and ankles are, if known } }.
  // o.v: the speed the whole body has (m/s); o.push: more of it, given most to the head and trunk and least to the feet
  // (a blow high on the body: it goes over); o.low: given most to the legs instead (swept off his feet); o.spin: a
  // turn about the upright (rad/s); o.alive: he is only down, and will be given back to his poses (P.rise); o.car: the
  // car he rides in.
  const HI = { H: 1.15, T: 1, aL: 0.9, aR: 0.9, eL: 0.8, eR: 0.8, P: 0.5, lL: 0.28, lR: 0.28, kL: 0.08, kR: 0.08 }, LO = { H: 0.1, T: 0.25, aL: 0.2, aR: 0.2, eL: 0.2, eR: 0.2, P: 0.55, lL: 0.9, lR: 0.9, kL: 1.15, kR: 1.15 };
  P.rag = function (frames, o) {
    const at = frames.at, hs = frames.hs || 1, kl = frames.g ? frames.g[0] : 1, kt = frames.g ? frames.g[1] : 1, mass = {};
    for (const k of PARTS) mass[k] = MASS[k] * (k === "H" ? 1 : k === "P" || k === "T" ? kt * kt : kl * kl);
    return build({ kind: "man", keys: PARTS, up: UP, core: "T", at, s: frames.s || 1, mass, apart: !TUNE.self,
      // The parts' shapes: balls, which meet the ground and each other cheaply and never catch on an edge.
      shapes(b, loc, s) {
        const near = (k, key, d) => { const e = at[key] ? loc(k, at[key].p) : null, l = e ? e.length() : 0, want = Math.hypot(d[0], d[1], d[2]) * s; return e && l > want * 0.6 && l < want * 1.5 ? e : new V(d[0] * s, d[1] * s, d[2] * s); };
        ball(b.P, 0, -0.02 * s, 0, 0.125 * s * kt); ball(b.P, 0.09 * s * kt, -0.05 * s, 0, 0.1 * s * kt); ball(b.P, -0.09 * s * kt, -0.05 * s, 0, 0.1 * s * kt);
        ball(b.T, 0, 0.2 * s, 0, 0.125 * s * kt); ball(b.T, 0, 0.39 * s, 0.01 * s, 0.145 * s * kt);
        for (const sd of ["L", "R"]) { const sh = loc("T", at["a" + sd].p); ball(b.T, sh.x * 0.7, sh.y * 0.96, sh.z, 0.085 * s * kl); }
        ball(b.H, 0, 0.125 * s * hs, 0.012 * s, 0.105 * s * hs);
        for (const sd of ["L", "R"]) {
          chain(b["a" + sd], loc("a" + sd, at["e" + sd].p), s * kl, [[0.28, 0.056], [0.78, 0.05]]);
          { const end = near("e" + sd, "w" + sd, [0, -0.3, 0]); chain(b["e" + sd], end, s * kl, [[0, 0.047], [0.3, 0.046], [0.74, 0.04], [1.2, 0.045]]); }
          chain(b["l" + sd], loc("l" + sd, at["k" + sd].p), s * kl, [[0.16, 0.086], [0.52, 0.078], [0.88, 0.064]]);
          { const end = near("k" + sd, "f" + sd, [0, -0.44, 0]); chain(b["k" + sd], end, s * kl, [[0, 0.062], [0.3, 0.06], [0.7, 0.05], [1, 0.046]]); ball(b["k" + sd], end.x, end.y - 0.02 * s, end.z + 0.11 * s, 0.04 * s * kl); }
        }
      },
      // The joints. At rest every part's frame lies square with the body (x to its left, y up, z the way it faces), so
      // the same line named in two parts is one line when he stands at ease.
      joints(J) {
        J("P", "T").limit(unit(0, Math.cos(8 * DEG), Math.sin(8 * DEG)), Y, 32 * DEG).limit(X, X, 30 * DEG);     // the spine: further forward than back; a little twist
        J("T", "H").limit(Y, Y, 40 * DEG).limit(X, X, 48 * DEG);                                               // the neck
        for (const sd of ["L", "R"]) { const sx = sd === "L" ? 1 : -1;
          socket(J("T", "a" + sd), unit(0.7 * sx, -0.62, 0.35), 84 * DEG, 100 * DEG);                           // the shoulder: a wide cone, out, down and a little forward
          { const f = 71 * DEG; J("a" + sd, "e" + sd).hingeOn(X).limit(unit(0, -Math.cos(f), Math.sin(f)), DOWN, f + 2 * DEG); }   // the elbow: straight to 144 degrees, forward only
          socket(J("P", "l" + sd), unit(0.16 * sx, -1, 0.45), 58 * DEG, 66 * DEG);                              // the hip: further forward than back or out
          { const f = 68 * DEG; J("l" + sd, "k" + sd).hingeOn(X).limit(unit(0, -Math.cos(f), -Math.sin(f)), DOWN, f + 2 * DEG); }  // the knee: straight to 138 degrees, back only
        }
      },
      go(b, o2) {
        const v = o2.v || [0, 0, 0], pu = o2.push || [0, 0, 0];
        for (const k of PARTS) { const w = (o2.low ? LO : HI)[k]; b[k].velocity.set(v[0] + pu[0] * w, v[1] + pu[1] * w, v[2] + pu[2] * w); }
        if (o2.spin) { const c = b.P.position; for (const k of PARTS) { const p = b[k].position; b[k].velocity.x += o2.spin * (p.z - c.z); b[k].velocity.z -= o2.spin * (p.x - c.x); b[k].angularVelocity.y = o2.spin; } }
      },
      // (where he lies he is still in the way of what falls after him: his hips, his chest and his head)
      lumps(r) { const s = r.s; return [[r.pt("P"), 0.13 * s], [r.pt("T", 0, 0.36 * s, 0), 0.14 * s], [r.pt("H", 0, 0.12 * s, 0), 0.1 * s]]; } }, o);
  };

  // ---------- A horse, an elephant ----------
  // frames.at: where each of the beast's joints is (js/g3/kit.js: root, neck, head, leg, shin and hoof FL FR HL HR for
  // a horse; root, trunk, trunkb, trunkc, leg and shin for an elephant). A beast is its barrel, which has nearly all its
  // weight, and what hangs from it: a horse's neck and head, an elephant's trunk in three lengths, and four legs that
  // fold at one joint each. Dead, nothing holds the legs: it comes down on them, and goes over onto its side.
  // o.v: its speed (m/s); o.roll: how fast it is going over (rad/s; + onto its right side); o.spin: about the upright.
  const FOUR = ["FL", "FR", "HL", "HR"], NECK = unit(0, 0.53, 0.44), TR = unit(0, -0.7, 0.22), TB = unit(0, -0.47, 0.14), TC = unit(0, -0.65, 0.22);
  const legsOf = (k0) => FOUR.map((k) => k0 + k), upLegs = (o) => { for (const k of FOUR) { o["leg" + k] = "root"; o["shin" + k] = "leg" + k; } return o; }, massLegs = (o, f, h, sh) => { for (const k of FOUR) { o["leg" + k] = k[0] === "F" ? f : h; o["shin" + k] = sh; } return o; };
  function beastGo(b, o, rag) {
    const v = o.v || [0, 0, 0], c = b.root.position, f = new V(), w = new V(), d = new V(), x = new V(); b.root.vectorToWorldFrame(new V(0, 0, 1), f); f.y = 0; f.normalize();
    w.set(f.x * (o.roll || 0), o.spin || 0, f.z * (o.roll || 0));
    for (const k of rag.keys) { b[k].position.vsub(c, d); w.cross(d, x); b[k].velocity.set(v[0] + x.x, v[1] + x.y, v[2] + x.z); b[k].angularVelocity.copy(w); }
  }
  const beastLumps = (r) => { const out = [], B = r.b.root; B.shapes.forEach((sh, i) => { if (i > 2) return; const c = new V(); B.pointToWorldFrame(B.shapeOffsets[i], c); out.push([c, sh.radius]); }); return out; };
  const BEASTS = {
    horse: (at, s0) => ({ kind: "horse", keys: ["root", "neck"].concat(legsOf("leg"), legsOf("shin")), up: upLegs({ neck: "root" }), core: "root", at, s: s0, apart: true, group: BEAST, mask: GROUND | BEAST, life: 8, ang: 0.5,
      mass: massLegs({ root: 230, neck: 45 }, 18, 26, 9),   // (400 kg)
      shapes(b, loc, s) {
        ball(b.root, 0, 1.32 * s, 0.5 * s, 0.4 * s); ball(b.root, 0, 1.32 * s, -0.05 * s, 0.41 * s); ball(b.root, 0, 1.32 * s, -0.56 * s, 0.4 * s);
        { const hd = loc("neck", at.head.p); chain(b.neck, hd, s, [[0.25, 0.2], [0.7, 0.17]]); ball(b.neck, hd.x, hd.y - 0.1 * s, hd.z + 0.22 * s, 0.14 * s); }
        for (const k of FOUR) { chain(b["leg" + k], loc("leg" + k, at["shin" + k].p), s, [[0.25, 0.1], [0.75, 0.08]]);
          const hf = loc("shin" + k, at["hoof" + k].p); chain(b["shin" + k], hf, s, [[0, 0.075], [0.5, 0.055], [1, 0.06]]); ball(b["shin" + k], hf.x, hf.y - 0.11 * s, hf.z + 0.03 * s, 0.085 * s); }
      },
      joints(J) {
        J("root", "neck").limit(NECK, NECK, 55 * DEG).limit(X, X, 50 * DEG);
        for (const k of FOUR) { J("root", "leg" + k).limit(DOWN, DOWN, 80 * DEG).limit(X, X, 55 * DEG);   // a leg swings far forward and back from the shoulder or the hip, and a little out to the side: dead, it cannot hold the beast up like a post
          const f = 62 * DEG; J("leg" + k, "shin" + k).hingeOn(X).limit(unit(0, -Math.cos(f), -Math.sin(f)), DOWN, f + 6 * DEG); }   // and folds back at the knee or the hock
      },
      go: beastGo, lumps: beastLumps }),
    elephant: (at, s0) => ({ kind: "elephant", keys: ["root", "trunk", "trunkb", "trunkc"].concat(legsOf("leg"), legsOf("shin")), up: upLegs({ trunk: "root", trunkb: "trunk", trunkc: "trunkb" }), core: "root", at, s: s0, apart: true, group: BEAST, mask: GROUND | BEAST, life: 9, lin: 0.05, ang: 0.5, force: 1e7,
      mass: massLegs({ root: 2600, trunk: 60, trunkb: 30, trunkc: 15 }, 140, 140, 90),   // (3.6 tonnes)
      shapes(b, loc, s) {
        ball(b.root, 0, 2.45 * s, -0.9 * s, 1.1 * s); ball(b.root, 0, 2.5 * s, 0.3 * s, 1.15 * s); ball(b.root, 0, 2.9 * s, 1.9 * s, 0.85 * s); ball(b.root, 0, 4.0 * s, -0.2 * s, 0.5 * s);   // its barrel, its head, and the howdah on its back
        chain(b.trunk, loc("trunk", at.trunkb.p), s, [[0.25, 0.26], [0.8, 0.21]]); chain(b.trunkb, loc("trunkb", at.trunkc.p), s, [[0.5, 0.18]]); ball(b.trunkc, 0, -0.25 * s, 0.08 * s, 0.14 * s); ball(b.trunkc, 0, -0.58 * s, 0.2 * s, 0.11 * s);
        for (const k of FOUR) { chain(b["leg" + k], loc("leg" + k, at["shin" + k].p), s, [[0.2, 0.4], [0.75, 0.36]]); chain(b["shin" + k], new V(0, -0.98 * s, 0), s, [[0, 0.37], [0.5, 0.35], [0.66, 0.34]]); }
      },
      joints(J) {
        J("root", "trunk").limit(TR, TR, 55 * DEG).limit(X, X, 50 * DEG); J("trunk", "trunkb").limit(TB, TB, 50 * DEG); J("trunkb", "trunkc").limit(TC, TC, 60 * DEG);
        for (const k of FOUR) { J("root", "leg" + k).limit(DOWN, DOWN, 55 * DEG).limit(X, X, 34 * DEG); const f = 55 * DEG; J("leg" + k, "shin" + k).hingeOn(X).limit(unit(0, -Math.cos(f), -Math.sin(f)), DOWN, f + 4 * DEG); }
      },
      go: beastGo, lumps: beastLumps }),
  };
  P.beast = function (kind, frames, o) { const mk = BEASTS[kind]; if (!mk || !W) return null; const r = build(mk(frames.at, frames.s || 1), o); if (r) P.tally.beasts++; return r; };
  P.BEAST_JOINTS = { horse: ["root", "neck", "head"].concat(legsOf("leg"), legsOf("shin"), legsOf("hoof")), elephant: ["root", "trunk", "trunkb", "trunkc"].concat(legsOf("leg"), legsOf("shin")) };

  function unbuild(r) { if (!W || r.out) return; r.out = true; for (const j of r.joints) W.world.removeConstraint(j); for (const c of r.under) W.world.removeConstraint(c); for (const c of r.own) W.world.removeConstraint(c); r.under.length = 0; r.own.length = 0; for (const k of r.keys) W.world.removeBody(r.b[k]); const i = W.rags.indexOf(r); if (i >= 0) W.rags.splice(i, 1); }
  // Left as it lies: the engine lets go of it, and it keeps the place and the shape it has.
  function freeze(r) { if (r.frozen) return; r.frozen = true; for (const k of r.keys) { const b = r.b[k]; b.interpolatedPosition.copy(b.position); b.interpolatedQuaternion.copy(b.quaternion); }
    if (W && !r.alive && !r.broke && r.lumps) { // where it lies it is still in the way of what falls after it: balls that nothing moves, for the last twelve bodies left
      const lump = new C.Body({ mass: 0, collisionFilterGroup: GROUND, collisionFilterMask: PART | THING | BEAST }); for (const [c, rad] of r.lumps(r)) lump.addShape(new C.Sphere(rad), c);
      W.world.addBody(lump); W.lumps.push(lump); while (W.lumps.length > 12) W.world.removeBody(W.lumps.shift()); }
    unbuild(r); if (W) W.left++; P.tally.left++; if (r.broke) P.tally.broke++; }
  P.freeze = freeze;
  // A man only thrown down is still where the rules have him, near enough: the whole body is drawn toward that place as
  // by a wind, harder the further it has gone from it (the rules slide him over the ground; the engine throws him).
  P.lead = function (r, x, z, dt) {
    if (!r || r.frozen || !(dt > 0)) return; const p = r.b[r.core === "T" ? "P" : r.core].position; let ax = (x - p.x) * 16, az = (z - p.z) * 16; const a = Math.hypot(ax, az); if (a > 22) { ax *= 22 / a; az *= 22 / a; }
    for (const k of r.keys) { const b = r.b[k]; b.velocity.x += ax * dt; b.velocity.z += az * dt; }
  };
  // A blow on a body the engine has: its trunk and hips are given so much more speed (m/s), and the rest goes with them.
  P.shove = function (r, x, y, z) { if (!r || r.frozen || r.kind !== "man") return; for (const k of ["T", "P", "H"]) { const b = r.b[k], w = k === "T" ? 1 : 0.6; b.velocity.x += x * w; b.velocity.y += y * w; b.velocity.z += z * w; } r.calm = 0; };
  // He was only down, and now he is killed where he lies: the engine keeps him, with what the blow adds. (In a car, the
  // walls no one sees no longer hold him: he may go over the rail.)
  P.kill = function (r, push) { if (!r || r.frozen) return false; r.alive = false; r.age = 0; r.calm = 0; r.fixed = false;
    if (push) for (const k of r.keys) { const b = r.b[k]; b.velocity.x += push[0]; b.velocity.y += push[1]; b.velocity.z += push[2]; }
    if (r.car != null) for (const k of r.keys) r.b[k].collisionFilterMask = FALLEN;
    return true; };
  P.drop = function (r) { if (r) { r.frozen = true; unbuild(r); } };

  // Something the bodies cannot move, that moves them. o: { kind: "man" | "car" | "team" | "elephant", x, z, a (the way
  // it faces), s (a man's size), n (a team's horses), dt (the frame's length: its speed is how far it has come) }.
  // Called every frame with where the thing now is; P.unmover(id) when it is gone.
  P.mover = function (id, o) {
    if (!W) return; let m = W.movers.get(id);
    if (!m) { const body = new C.Body({ mass: 0, type: C.Body.KINEMATIC, material: W.slick, collisionFilterGroup: MOVER, collisionFilterMask: PART | THING }), s = o.s || 1; body.mover = id;
      const at = (r, x, y, z) => body.addShape(new C.Sphere(r), new V(x, y, z));
      if (o.kind === "car") body.addShape(new C.Box(new V(0.8, 0.45, 1.0)), new V(0, 0.95, 0));   // the car, from the axle up: its wheels go over what lies on the ground
      else if (o.kind === "team") { const n = o.n || 2; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 1.0; at(0.5, x, 1.3, 3.05); at(0.5, x, 1.3, 2.4); at(0.47, x, 1.3, 1.78); } }   // the horses before it, rounded, so that a body is turned aside by a shoulder (from where the team is yoked)
      else if (o.kind === "elephant") { for (const z of [-1.0, 0.2, 1.3]) at(1.1, 0, 2.45, z); at(0.85, 0, 2.9, 2.1); for (const x of [-0.68, 0.68]) for (const z of [-1.2, 1.2]) at(0.4, x, 0.45, z); }   // its barrel, its head, and its four feet, which kick aside what lies in their way
      else at(0.27 * s, 0, 1.02 * s, 0);   // a man standing: his trunk, which a body thrown at him strikes; his feet step over what lies on the ground
      W.world.addBody(body); m = { body, kind: o.kind || "man", n: o.n }; W.movers.set(id, m); body.position.set(o.x, o.y || 0, o.z); }
    const b = m.body; let vx = o.vx || 0, vz = o.vz || 0;
    if (o.dt > 0) { vx = (o.x - b.position.x) / o.dt; vz = (o.z - b.position.z) / o.dt; const l = Math.hypot(vx, vz); if (l > 14) { vx *= 14 / l; vz *= 14 / l; } }   // (its speed is how far it has come since the last frame; being set down somewhere else is not a blow)
    b.position.set(o.x, o.y || 0, o.z); b.velocity.set(vx, 0, vz); if (o.a != null) b.quaternion.setFromAxisAngle(Y, o.a);
    if (m.deck) for (const d of [m.deck, m.cage]) { d.position.copy(b.position); d.velocity.copy(b.velocity); d.quaternion.copy(b.quaternion); }
  };
  P.unmover = function (id) { if (!W) return; const m = W.movers.get(id); if (!m) return;
    for (const r of W.rags) for (const list of [r.under, r.own]) for (let i = list.length - 1; i >= 0; i--) if (list[i].bodyB === m.body) { W.world.removeConstraint(list[i]); list.splice(i, 1); }
    W.world.removeBody(m.body); if (m.deck) { W.world.removeBody(m.deck); W.world.removeBody(m.cage); } W.movers.delete(id); };
  P.moving = (id) => !!(W && W.movers.get(id));
  // A car's inside, made when a rider of it is first given to the engine: its floor and its four rails, which the dead
  // meet, and four walls no one sees outside the rails, which keep in a rider who is only thrown down.
  function deckOf(m) {
    if (m.deck) return; const mk = (group, mask) => { const body = new C.Body({ mass: 0, type: C.Body.KINEMATIC, collisionFilterGroup: group, collisionFilterMask: mask }); body.position.copy(m.body.position); body.quaternion.copy(m.body.quaternion); body.velocity.copy(m.body.velocity); return body; };
    const d = (m.deck = mk(DECK, PART | THING)), c = (m.cage = mk(CAGE, PART)), box = (body, hx, hy, hz, x, y, z) => body.addShape(new C.Box(new V(hx, hy, hz)), new V(x, y, z));
    box(d, 0.78, 0.2, 0.98, 0, 0.64, 0);                                               // the floor (its top at 0.84 m)
    box(d, 0.84, 0.33, 0.05, 0, 1.17, 1.0); box(d, 0.84, 0.17, 0.05, 0, 1.01, -1.0);   // the high rail before him and the low one behind
    for (const sx of [-1, 1]) box(d, 0.05, 0.25, 1.0, sx * 0.82, 1.09, 0);              // the rails at his sides
    box(c, 1.4, 1.5, 0.25, 0, 2.34, 1.3); box(c, 1.4, 1.5, 0.25, 0, 2.34, -1.3); for (const sx of [-1, 1]) box(c, 0.25, 1.5, 1.6, sx * 1.12, 2.34, 0);
    W.world.addBody(d); W.world.addBody(c);
  }

  // One loose rigid thing. o: { p, q (where it is and how turned), half: [x, y, z] (a box: half its length each way, in
  // its own frame), off: [x, y, z] (the box's middle from the thing's own origin), or wheel: [radius, half its
  // thickness] (a wheel on its axle, which lies along the thing's own x: it rolls), m (kg), v, w (its speed and spin),
  // life (s) }. Returns { p, q (where it is now), rest (true once it lies still), done }.
  P.thing = function (o) {
    if (!W) return null;
    const body = new C.Body({ mass: o.m || 2, position: new V(o.p[0], o.p[1], o.p[2]), quaternion: new C.Quaternion(o.q[0], o.q[1], o.q[2], o.q[3]), linearDamping: o.wheel ? 0.22 : 0.05, angularDamping: o.wheel ? 0.2 : 0.25, allowSleep: true, sleepSpeedLimit: 0.25, sleepTimeLimit: 0.6,
      collisionFilterGroup: THING, collisionFilterMask: o.wheel ? GROUND | PART : GROUND | MOVER | DECK | PART });
    body.jo = new V(0, 0, 0);
    if (o.wheel) { const q = new C.Quaternion(); q.setFromAxisAngle(new V(0, 0, 1), Math.PI / 2); body.addShape(new C.Cylinder(o.wheel[0], o.wheel[0], o.wheel[1] * 2, 18), new V(0, 0, 0), q); }
    else { const h = o.half, off = o.off || [0, 0, 0], c = new V(off[0], off[1], off[2]), t = new V(); body.addShape(new C.Box(new V(Math.max(0.012, h[0]), Math.max(0.012, h[1]), Math.max(0.012, h[2]))));   // (the body's own place is the middle of the box, where its weight is: a mace turns about its middle, not about its grip)
      body.quaternion.vmult(c, t); body.position.vadd(t, body.position); body.previousPosition.copy(body.position); body.interpolatedPosition.copy(body.position); body.jo = c.negate(); }
    if (o.v) body.velocity.set(o.v[0], o.v[1], o.v[2]); if (o.w) body.angularVelocity.set(o.w[0], o.w[1], o.w[2]);
    const th = { body, age: 0, life: o.life || 8, rest: false, done: false, hit: 0, still: o.wheel ? 9 : 5, wheel: !!o.wheel, q: body.interpolatedQuaternion, at: new V() };
    Object.defineProperty(th, "p", { get() { body.interpolatedQuaternion.vmult(body.jo, th.at); th.at.vadd(body.interpolatedPosition, th.at); return th.at; } });   // (where the thing's own origin is now)
    body.addEventListener("collide", (e) => { const n = Math.abs(e.contact.getImpactVelocityAlongNormal()); if (n > th.hit) th.hit = n; });
    W.world.addBody(body); W.things.push(th); P.tally.things++;
    while (W.things.length > 20) unthing(W.things[0]);   // (the oldest goes)
    return th;
  };
  function unthing(th) { if (!W) return; const i = W.things.indexOf(th); if (i >= 0) W.things.splice(i, 1); if (!th.out) { th.out = true; W.world.removeBody(th.body); } th.done = true; }
  P.unthing = unthing;

  // The engine goes forward. Nothing is reckoned while nothing is loose.
  const clock = typeof performance !== "undefined" ? () => performance.now() : () => Date.now();
  P.step = function (dt) {
    if (!W) return 0; W.t += dt;
    let busy = W.rags.length > 0; if (!busy) for (const t of W.things) if (!t.rest) { busy = true; break; }
    if (!busy || !(dt > 0)) { if (dt > 0) for (let i = W.things.length - 1; i >= 0; i--) { const t = W.things[i]; t.age += dt; if (t.age > t.life) unthing(t); } return 0; }
    const h = 1 / TUNE.hz, world = W.world, t0 = world.stepnumber, load = P.load(), c0 = clock();
    world.step(h, Math.min(dt, h * TUNE.sub), TUNE.sub);
    const n = world.stepnumber - t0; W.steps += n;
    if (TUNE.adapt && n > 0 && load >= 11) { // what a part costs here, learned from every step with a body in it; the engine then carries as many as come to `aim` milliseconds a step
      const per = (clock() - c0) / n / load; W.perN++; W.per += (per - W.per) * (W.perN < 20 ? 1 / W.perN : 0.05);
      if (W.perN >= 30 && W.perN % 15 === 0) { const want = Math.max(TUNE.partsMin, Math.min(TUNE.partsMost, Math.floor(TUNE.aim / Math.max(1e-4, W.per) / 11) * 11)); W.budget += Math.max(-11, Math.min(11, want - W.budget)); } }
    for (let i = W.rags.length - 1; i >= 0; i--) { const r = W.rags[i]; r.age += dt;
      let vm = 0, wm = 0, bad = false; for (const k of r.keys) { const b = r.b[k], v = b.velocity.length(), w = b.angularVelocity.length(); if (v > vm) vm = v; if (w > wm) wm = w; if (!(v < 60) || !(b.position.y > -1) || !(b.position.y < 30)) bad = true; }
      r.speed = vm; if (r.under.length && r.age > 0.9) { for (const c of r.under) world.removeConstraint(c); r.under.length = 0; }
      if (bad) { r.broke = true; freeze(r); continue; }   // (never seen in the tests; a body that has gone wrong is left, not followed)
      if (r.age > 1.6) { const k = Math.min(1, (r.age - 1.6) / 2.4); for (const key of r.keys) { r.b[key].linearDamping = r.lin + 0.3 * k; r.b[key].angularDamping = r.ang + 0.35 * k; } }   // (it settles: a body does not twitch for ever)
      r.calm = vm < TUNE.vCalm && wm < TUNE.wCalm ? r.calm + dt : 0;
      if (r.alive ? r.age > r.life : r.calm > TUNE.calm || r.age > r.life) freeze(r);
    }
    for (let i = W.things.length - 1; i >= 0; i--) { const t = W.things[i]; t.age += dt;
      if (t.wheel && !t.tipped && t.age > 0.8 && t.body.velocity.length() < 1.4) { t.tipped = true; const v = t.body.velocity, l = Math.hypot(v.x, v.z) || 1, k = (i % 2 ? -1 : 1) * 2.8; t.body.angularVelocity.x += (v.x / l) * k; t.body.angularVelocity.z += (v.z / l) * k; }   // (a wheel running free does not stop on its rim: as it slows it leans, and goes over)
      if (!t.rest && (t.body.sleepState === C.Body.SLEEPING || t.age > t.still)) { t.rest = true; t.body.interpolatedPosition.copy(t.body.position); t.body.interpolatedQuaternion.copy(t.body.quaternion); t.out = true; world.removeBody(t.body); } if (t.age > t.life) unthing(t); }
    return n;
  };

  // ---------- A figure given to it (js/g3/figure.js) ----------
  const T3 = window.THREE;
  if (!T3) return;
  const _p = new T3.Vector3(), _s = new T3.Vector3(), _qa = new T3.Quaternion(), _qb = new T3.Quaternion(), _qc = new T3.Quaternion();
  const _jv = new V();
  const jointAt = (B) => { B.interpolatedQuaternion.vmult(B.jo, _jv); _jv.vadd(B.interpolatedPosition, _jv); return _jv; };   // (where a part's joint is now, between the engine's last two steps)
  function framesOf(f) {
    f.root.updateMatrixWorld(true); const at = {}; let s = 1;
    for (const k of PARTS.concat(["wL", "wR", "fL", "fR"])) { const j = f.j[k]; if (!j) continue; j.matrixWorld.decompose(_p, _qa, _s); at[k] = { p: [_p.x, _p.y, _p.z], q: [_qa.x, _qa.y, _qa.z, _qa.w] }; if (k === "P") s = _s.y; }
    return { s, at, hs: f.model ? 1 : Math.min(1.5, f.j.H.scale.y), g: (f.modelKey && P.BUILDS[f.modelKey]) || null };   // (g: this figure's own build)
  }
  // The figure, as it stands this moment, is given to the engine. Null if the engine would not take it (it is carrying
  // all it can): the figure then falls by its own poses, as it did before there was an engine.
  // (o.car: the car he rides in. Thrown down alive in it, he stays its rider: the figure keeps its place on the deck.)
  P.take = function (f, o) {
    if (!W || !f || !f.j || !f.j.P || !f.j.kL) return null;
    if (f.rag && !f.rag.frozen) P.drop(f.rag);
    const r = P.rag(framesOf(f), o); if (!r) return null;
    r.fixed = !!(r.car != null && r.alive);
    f.rag = r; f.fallTo = 0; f.spin = 0; f.action = null; return r;
  };
  // The engine's body written into the figure. 0: the figure is its own; 1: the engine has it; 2: it lies as the engine
  // left it; 3: it is coming back out of the fall to its poses (the figure sets its pose first, and P.blend lays the
  // fall over it).
  P.put = function (f, dt) {
    const r = f.rag; if (!r) return 0;
    if (r.rise) return 3;
    if (r.frozen) { if (r.alive) return 1; r.lain = (r.lain || 0) + (dt || 0); return 2; }
    const b = r.b, j = f.j, pp = jointAt(b.P);
    if (!r.fixed) { const par = f.root.parent; _p.set(pp.x, pp.y, pp.z); if (par) { par.updateWorldMatrix(true, false); par.worldToLocal(_p); } f.root.position.x = _p.x; f.root.position.z = _p.z; }   // (the figure's own place goes with its hips)
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
    if (r.fixed) { const par = f.root.parent; if (par) { par.worldToLocal(at); par.getWorldQuaternion(_qa); tq.premultiply(_qa.invert()); } }   // (a rider: kept in his car's own frame, for the car may move on while he gets up)
    r.frozen = true; unbuild(r); r.rise = { t: 0, secs: secs || 0.5, from, at, tq };
  };
  // (figure.js, after its own pose is set: what is left of the fall is laid over it)
  P.blend = function (f, dt) {
    const r = f.rag, u = r && r.rise; if (!u) return;
    u.t += dt; const k = Math.min(1, u.t / u.secs), w = 1 - k * k * (3 - 2 * k), j = f.j;
    if (w <= 0) { f.rag = null; return; }
    f.tilt.updateWorldMatrix(true, false); _p.copy(u.at); _qb.copy(u.tq);
    if (r.fixed) { const par = f.root.parent; if (par) { par.localToWorld(_p); par.getWorldQuaternion(_qa); _qb.premultiply(_qa); } }
    f.tilt.worldToLocal(_p); j.P.position.lerp(_p, w);
    f.tilt.matrixWorld.decompose(_p, _qa, _s); _qa.invert().multiply(_qb); j.P.quaternion.slerp(_qa, w);
    for (const key of PARTS) if (key !== "P") j[key].quaternion.slerp(u.from[key], w);
  };
  P.free = function (f) { if (f && f.rag) { P.drop(f.rag); f.rag = null; } };

  // ---------- A beast given to it (js/g3/kit.js: G.horse, G.elephant) ----------
  // g: the beast as the kit made it, with its bones. Null if it has none (the plain beast built in code), or the engine
  // has no room: the caller then lays it down as it did before.
  const beasts = [];
  P.takeBeast = function (g, kind, o) {
    const B = g && g.userData && g.userData.bones, names = P.BEAST_JOINTS[kind]; if (!W || !B || !names || names.some((k) => !B[k])) return null;
    g.updateMatrixWorld(true); const at = {}; let s = 1;
    for (const k of names) { B[k].matrixWorld.decompose(_p, _qa, _s); at[k] = { p: [_p.x, _p.y, _p.z], q: [_qa.x, _qa.y, _qa.z, _qa.w] }; if (k === "root") s = _s.y; }
    const r = P.beast(kind, { s, at }, o); if (!r) return null;
    r.obj = g; g.userData.rag = r; beasts.push(r); return r;
  };
  P.freeBeast = function (g) { const r = g && g.userData && g.userData.rag; if (!r) return; P.drop(r); g.userData.rag = null; const i = beasts.indexOf(r); if (i >= 0) beasts.splice(i, 1); };
  function beastFrame() {
    for (let i = beasts.length - 1; i >= 0; i--) { const r = beasts[i], g = r.obj, B = g.userData.bones;
      if (!g.parent || g.userData.rag !== r) { P.drop(r); beasts.splice(i, 1); continue; }
      if (r.frozen && r.written) { beasts.splice(i, 1); continue; }   // (it lies as the engine left it: its bones are not touched again)
      const b = r.b, pp = jointAt(b.root); g.updateWorldMatrix(true, false);
      B.root.position.copy(g.worldToLocal(_p.set(pp.x, pp.y, pp.z)));
      g.matrixWorld.decompose(_p, _qa, _s); _qa.invert();
      const q = (k) => { const c = b[k].interpolatedQuaternion; return _qc.set(c.x, c.y, c.z, c.w); };
      B.root.quaternion.copy(_qa).multiply(q("root"));
      for (const k of r.keys) { const up = r.up[k]; if (!up) continue; const c = b[up].interpolatedQuaternion; _qb.set(-c.x, -c.y, -c.z, c.w); B[k].quaternion.copy(_qb).multiply(q(k)); }
      if (r.frozen) r.written = true; }
  }

  // ---------- What is let go ----------
  // P.loose(obj, vel, spin, o): obj (anywhere in the scene) is let go with a speed (m/s) and a spin (rad/s). It is a box
  // the size of itself: it turns in the air, strikes the ground and whatever lies there, and comes to rest as its own
  // shape leaves it (a mace on its side, a shield flat or rocking on its rim). After o.life seconds (8) it shrinks away.
  // o.wheel: [radius, half its thickness]: it is a wheel on its axle (its own x), and rolls.
  const _box = new T3.Box3(), _b2 = new T3.Box3(), _m = new T3.Matrix4(), _inv = new T3.Matrix4(), loose = [];
  P.loose = function (obj, vel, spin, o) {
    if (!W || !obj || !G.fxRoot) return null; o = o || {};
    obj.updateWorldMatrix(true, true); let half = null, mid = null;
    if (!o.wheel) { _inv.copy(obj.matrixWorld).invert(); _box.makeEmpty();
      obj.traverse((c) => { if (!c.isMesh || !c.geometry) return; if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); _b2.copy(c.geometry.boundingBox).applyMatrix4(_m.multiplyMatrices(_inv, c.matrixWorld)); _box.union(_b2); });
      if (_box.isEmpty()) return null; }
    G.fxRoot.attach(obj); obj.matrixWorld.decompose(_p, _qa, _s);
    if (!o.wheel) { half = _box.getSize(new T3.Vector3()).multiply(_s).multiplyScalar(0.5); mid = _box.getCenter(new T3.Vector3()).multiply(_s); }
    const th = P.thing({ p: [_p.x, Math.max(_p.y, o.wheel ? o.wheel[0] : 0.05), _p.z], q: [_qa.x, _qa.y, _qa.z, _qa.w], half: half && [half.x, half.y, half.z], off: mid && [mid.x, mid.y, mid.z], wheel: o.wheel, m: o.m || 2.5, v: [vel.x, vel.y, vel.z], w: spin ? [spin.x, spin.y, spin.z] : null, life: o.life || 8 });
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
  { const step0 = P.step; P.step = function (dt) { const n = step0(dt); looseFrame(); beastFrame(); return n; }; }
  { const close0 = P.close; P.close = function () { for (const th of loose) { th.done = true; if (th.obj.parent) th.obj.parent.remove(th.obj); if (G.dispose) G.dispose(th.obj); } loose.length = 0; for (const r of beasts) if (r.obj) r.obj.userData.rag = null; beasts.length = 0; close0(); }; }
})(window.K = window.K || {});
