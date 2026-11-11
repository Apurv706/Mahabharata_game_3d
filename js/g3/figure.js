/* Figures: every person in the game as a jointed 3D body, built from the same "look" the 2D leather puppets used
   (K.puppetSpec for you, K.PUPPETS for the epic's people: skin, cloth and trim colours, headgear, beard, what they carry,
   how big they stand), so Arjuna is still the one in white with the blue-gemmed crown and Bhima still the broad one.
     const f = G.figure(spec);  G.actors.add(f.root);  f.pose("ready");  f.act("slash", 0.5);  f.update(dt, t)
   A body faces +Z. Joints are plain groups turned by pose tables (degrees); poses blend, a walk cycle rides on the
   distance covered, and one-shot actions (a cut, a thrust, a loosed arrow) are short keyframe runs timed by the caller,
   so a blow on screen lands exactly when the fight's rules say it lands. */
(function (K) {
  "use strict";
  const T = window.THREE, G = K.G3;
  if (!T) return;
  const V3 = T.Vector3, PI = Math.PI, D = PI / 180, B = () => new G.Builder();
  const GOLD = 0xd9a53a, STEEL = 0xc9ccd2, WOOD = 0x6a4628, DARK = 0x1c120c;

  // ---------- Weapons and things held (grip at the origin, the weapon running out along +Z) ----------
  function held(kind, col) {
    const b = B(); b.ao = 0.9; let tip = 0.8;
    const along = (g, z, c, c2) => b.geo(g.rotateX(PI / 2), 0, 0, z, 0, 0, 0, c, c2);
    switch (kind) {
      case "sword": case "woodsword": {
        const blade = kind === "woodsword" ? 0x9a7a4a : STEEL;
        along(new T.CylinderGeometry(0.022, 0.022, 0.2, 5), 0.0, WOOD); b.box(0.2, 0.035, 0.05, 0, -0.017, 0.11, kind === "woodsword" ? WOOD : GOLD);
        along(new T.BoxGeometry(0.075, 0.82, 0.018), 0.55, blade, kind === "woodsword" ? 0xb09060 : 0xeef0f4); along(new T.ConeGeometry(0.04, 0.12, 4), 1.02, blade); tip = 1.05; break;
      }
      case "dagger": along(new T.CylinderGeometry(0.02, 0.02, 0.14, 5), 0, WOOD); b.box(0.12, 0.03, 0.04, 0, -0.015, 0.08, GOLD); along(new T.BoxGeometry(0.055, 0.34, 0.014), 0.27, STEEL, 0xeef0f4); along(new T.ConeGeometry(0.03, 0.1, 4), 0.49, STEEL); tip = 0.52; break;
      case "mace": along(new T.CylinderGeometry(0.03, 0.035, 1.05, 6), 0.42, 0x7a5a36); b.sph(0.14, 0, 0, 1.0, col || GOLD, 1, 7); for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; b.geo(new T.BoxGeometry(0.04, 0.04, 0.24), Math.cos(a) * 0.125, Math.sin(a) * 0.125, 1.0, 0, 0, a, G.shade(col || GOLD, 0.8)); } along(new T.ConeGeometry(0.06, 0.13, 6), 1.19, col || GOLD); along(new T.CylinderGeometry(0.05, 0.05, 0.06, 6), -0.12, GOLD); tip = 1.2; break;
      case "club": along(new T.CylinderGeometry(0.1, 0.03, 1.05, 6), 0.4, 0x6a4a2e, 0x8a6a46); tip = 0.95; break;
      case "hammer": along(new T.CylinderGeometry(0.028, 0.028, 0.75, 5), 0.3, WOOD); b.box(0.14, 0.14, 0.3, 0, -0.07, 0.66, 0x55565c); tip = 0.8; break;
      case "staff": along(new T.CylinderGeometry(0.028, 0.032, 1.9, 5), 0.3, 0x7a5a36); tip = 1.25; break;
      case "spear": along(new T.CylinderGeometry(0.022, 0.026, 2.3, 5), 0.5, 0x7a5a36); along(new T.ConeGeometry(0.055, 0.3, 4), 1.8, STEEL); along(new T.CylinderGeometry(0.04, 0.04, 0.05, 5), 1.63, GOLD); b.box(0.02, 0.1, 0.16, 0, -0.05, 1.5, 0xc8402c); tip = 1.95; break;
      case "whip": along(new T.CylinderGeometry(0.018, 0.022, 0.7, 5), 0.3, WOOD); b.rod(0, 0, 0.65, 0, -0.5, 1.0, 0.008, 0x3a2414, 3); tip = 0.7; break;
      case "scroll": along(new T.CylinderGeometry(0.04, 0.04, 0.34, 6), 0.05, 0xe8dcc0); tip = 0.2; break;
      case "bowl": b.geo(new T.SphereGeometry(0.11, 8, 4, 0, PI * 2, PI / 2, PI / 2), 0, 0.06, 0.08, 0, 0, 0, 0xb5793a); tip = 0.2; break;
      case "lute": b.sph(0.14, 0, 0, 0.1, 0x8a5a2c, 0.6); along(new T.CylinderGeometry(0.02, 0.025, 0.7, 5), 0.5, WOOD); tip = 0.8; break;
      case "flute": along(new T.CylinderGeometry(0.014, 0.014, 0.5, 5), 0.1, 0xc9a24e); tip = 0.35; break;
      case "torch": along(new T.CylinderGeometry(0.03, 0.025, 0.8, 5), 0.3, WOOD); b.sph(0.07, 0, 0, 0.72, 0x2a1a10); tip = 0.75; break;
      case "dice": b.box(0.05, 0.05, 0.12, 0, -0.02, 0.06, 0xf0e6cc); tip = 0.1; break;
      default: return null;
    }
    const m = b.mesh(); m.userData.tip = tip; m.userData.kind = kind; return m;
  }
  // A bow, held by the left hand: its limbs run along ±Z of the hand so that it stands upright when the arm is held out.
  function bow(col) {
    const g = new T.Group(), b = B(); b.ao = 0.9;
    const pts = []; for (let i = 0; i <= 10; i++) { const a = -1.15 + (i / 10) * 2.3; pts.push(new V3(0, -Math.cos(a) * 0.36 + 0.14, Math.sin(a) * 0.78)); }
    b.geo(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 14, 0.022, 5), 0, 0, 0, 0, 0, 0, col || 0x8a5a2c, 0xc9a24e);
    b.cyl(0.03, 0.03, 0.14, 0, -0.29, 0, GOLD, 6, 0, PI / 2);
    g.add(b.mesh());
    const sg = new T.BufferGeometry().setFromPoints([pts[0].clone(), new V3(0, 0.0, 0), pts[10].clone()]);
    const str = new T.Line(sg, G.keep(new T.LineBasicMaterial({ color: 0xf2e6c8 })));
    g.add(str); g.userData.string = str; g.userData.ends = [pts[0].clone(), pts[10].clone()];
    const ar = G.arrowMesh(1.0); ar.rotation.x = PI / 2; ar.visible = false; g.add(ar); g.userData.arrow = ar; // the arrow on the string, seen while it is drawn
    g.scale.setScalar(1.2); // the long bow of the epic's archers: as tall as the man, its arrow drawn back to the ear
    return g;
  }
  // Pull the string back by d (0 at rest … 1 at the ear); an arrow lies on it while it is drawn.
  function drawBow(bw, d) { if (bw.userData.d === d) return; bw.userData.d = d; const P = bw.userData.string.geometry.attributes.position; P.setXYZ(1, 0, d * PULL, 0); P.needsUpdate = true; const a = bw.userData.arrow; if (a) { a.visible = d > 0.04; a.position.set(0, d * PULL - 0.47, 0); } }
  const PULL = 0.68;
  function shield(col, trim, kind) {
    const b = B(); b.ao = 0.85;
    if (kind === "hide") { // a foot soldier's: hide stretched on cane, painted with a band of his host's colour, a boss of horn
      const hide = 0x8a6238;
      b.geo(new T.SphereGeometry(0.4, 10, 4, 0, PI * 2, 0, PI / 2.7).rotateZ(-PI / 2).scale(0.36, 1, 1), 0.05, 0, 0, 0, 0, 0, hide, G.shade(hide, 1.25));
      b.geo(new T.CircleGeometry(0.365, 12).rotateY(-PI / 2), 0.105, 0, 0, 0, 0, 0, G.shade(hide, 0.55));
      b.torus(0.25, 0.04, 0.15, 0, 0, col || 0x7a3a2a, 0, PI / 2, 0, 14); b.torus(0.355, 0.02, 0.11, 0, 0, G.shade(hide, 0.6), 0, PI / 2, 0, 14); b.sph(0.065, 0.19, 0, 0, 0xd8cdb0, 1, 6);
      return b.mesh();
    }
    b.geo(new T.SphereGeometry(0.42, 12, 5, 0, PI * 2, 0, PI / 2.6).rotateZ(-PI / 2).scale(0.42, 1, 1), 0.05, 0, 0, 0, 0, 0, col || 0x7a3a2a, G.shade(col || 0x7a3a2a, 1.3));
    b.geo(new T.CircleGeometry(0.385, 14).rotateY(-PI / 2), 0.11, 0, 0, 0, 0, 0, G.shade(col || 0x7a3a2a, 0.6));
    b.torus(0.37, 0.025, 0.115, 0, 0, trim || GOLD, 0, PI / 2, 0, 16); b.sph(0.08, 0.2, 0, 0, trim || GOLD);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; b.sph(0.022, 0.16, Math.sin(a) * 0.24, Math.cos(a) * 0.24, trim || GOLD, 1, 5); } // studs
    return b.mesh();
  }
  G.held = held; G.bow = bow;
  // An arrow lying along +Z, its head at the origin's far end (used by fights and tests).
  G.arrowMesh = function (len) {
    len = len || 0.85; const b = B(); b.ao = 1;
    b.geo(new T.CylinderGeometry(0.012, 0.012, len, 4).rotateX(PI / 2), 0, 0, 0, 0, 0, 0, 0xe6c98c);
    b.geo(new T.ConeGeometry(0.03, 0.1, 4).rotateX(PI / 2), 0, 0, len / 2 + 0.04, 0, 0, 0, 0xdcd7c8);
    b.box(0.07, 0.005, 0.14, 0, 0, -len / 2 + 0.06, 0xc8402c); b.box(0.005, 0.07, 0.14, 0, -0.035, -len / 2 + 0.06, 0xc8402c);
    const m = b.mesh(G.mat.vcDouble, true); m.geometry.userData.keep = false; return m;
  };

  // ---------- Poses (degrees). Keys: P hips, T torso, H head, aL/aR shoulders, eL/eR elbows, wL/wR hands, lL/lR thighs,
  // kL/kR knees, y hips' height. A number is a turn about X; a list is [x, y, z]. The character's right is -X. ----------
  const REST = { P: [0, 0, 0], T: [0, 0, 0], H: [0, 0, 0], aL: [0, 0, 7], aR: [0, 0, -7], eL: -10, eR: -10, wL: [0, 0, 0], wR: [0, 0, 0], lL: [0, 0, 0], lR: [0, 0, 0], kL: 0, kR: 0, y: 0 };
  const POSES = {
    stand: {},
    // On guard: the left foot leads (the shield side), knees bent, weight a little back, the weapon hand by the hip with the blade up and forward.
    ready: { P: [0, -24, 0], T: [8, 10, 0], H: [0, 14, 0], lL: [-26, 0, 6], kL: 30, lR: [18, 0, -8], kR: 34, y: -0.1, aR: [-30, 0, -20], eR: -86, wR: [26, 0, 0], aL: [-42, 0, 10], eL: -62 },
    // The mace at rest: its head up over the right shoulder, the left hand ready to join the right on the haft.
    readyMace: { P: [0, -22, 0], T: [6, 8, 0], H: [0, 14, 0], lL: [-24, 0, 8], kL: 30, lR: [18, 0, -10], kR: 34, y: -0.11, aR: [-48, 0, -14], eR: -108, wR: [-22, 0, 0], aL: [-46, 0, -16], eL: -84 },
    readyBow: { P: [0, -18, 0], T: [4, 6, 0], lL: [-16, 0, 4], kL: 12, lR: [12, 0, -4], kR: 14, y: -0.03, aL: [-42, 0, 8], eL: -30, aR: [-20, 0, -12], eR: -60 },
    readySpear: { P: [0, -24, 0], T: [10, 10, 0], lL: [-22, 0, 4], kL: 20, lR: [18, 0, -4], kR: 24, y: -0.06, aR: [-18, 0, -20], eR: -78, wR: [62, 0, 0], aL: [-48, 0, 6], eL: -40 },
    readyFist: { P: [0, -16, 0], T: [12, 6, 0], lL: [-20, 0, 6], kL: 22, lR: [14, 0, -6], kR: 26, y: -0.07, aR: [-52, 0, -18], eR: -105, aL: [-58, 0, 16], eL: -100 },
    block: { P: [0, -30, 0], T: [14, 18, 0], lL: [-30, 0, 6], kL: 40, lR: [20, 0, -8], kR: 42, y: -0.16, aL: [-58, -84, 0], eL: -104, aR: [-16, 0, -26], eR: -70, wR: [20, 0, 0], H: [10, 12, 0] },
    aim: { P: [0, -48, 0], T: [0, -40, 0], H: [0, 80, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [0, -2, 90], eL: 0, wL: [0, 90, 0], aR: [-42, 32, -111], eR: -143 },
    aimLoose: { P: [0, -48, 0], T: [0, -40, 0], H: [0, 80, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [0, -2, 90], eL: 0, wL: [0, 90, 0], aR: [-50, -7, -119], eR: -137 },
    throwBack: { P: [0, -30, 0], T: [-12, -30, 0], lL: [-18, 0, 4], kL: 10, lR: [14, 0, -4], kR: 16, aR: [-150, 0, -30], eR: -85, aL: [-70, 0, 10], eL: -20 },
    sit: { y: -0.66, lL: [-84, 0, 44], kL: 138, lR: [-84, 0, -44], kR: 138, T: [4, 0, 0], aL: [-28, 0, 16], eL: -52, aR: [-28, 0, -16], eR: -52 },
    sitThink: { y: -0.66, lL: [-84, 0, 44], kL: 138, lR: [-84, 0, -44], kR: 138, T: [10, 0, 0], H: [12, 0, 0], aL: [-28, 0, 16], eL: -52, aR: [-46, 0, -6], eR: -132 },
    sitPlay: { y: -0.66, lL: [-84, 0, 44], kL: 138, lR: [-84, 0, -44], kR: 138, T: [22, 0, 0], H: [8, 0, 0], aL: [-24, 0, 16], eL: -60, aR: [-62, 0, -4], eR: -40 },
    // Standing easy before a fight: the chest out, the weapon low at the side.
    proud: { T: [-5, 0, 0], H: [-3, 0, 0], aR: [-10, 0, -14], eR: -30, wR: [24, 0, 0], aL: [-6, 0, 16], eL: -16, lL: [0, 0, 5], lR: [0, 0, -5] },
    kneel: { y: -0.4, lL: [-88, 0, 0], kL: 92, lR: [8, 0, 0], kR: 104, T: [8, 0, 0], aL: [-30, 0, 8], eL: -50, aR: [-12, 0, -8], eR: -30 },
    plead: { y: -0.47, lL: [-4, 0, 6], kL: 100, lR: [-4, 0, -6], kR: 100, T: [14, 0, 0], H: [16, 0, 0], aL: [-50, 0, -24], eL: -112, aR: [-50, 0, 24], eR: -112 },
    herbs: { y: -0.4, lL: [-88, 0, 0], kL: 92, lR: [8, 0, 0], kR: 104, T: [16, 0, 0], H: [18, 0, 0], aL: [-36, 0, 6], eL: -92, aR: [-56, 0, 10], eR: -128 },
    namaste: { H: [10, 0, 0], T: [6, 0, 0], aL: [-50, 0, -24], eL: -114, aR: [-50, 0, 24], eR: -114 },
    bow: { T: [42, 0, 0], H: [20, 0, 0], aL: [-50, 0, -24], eL: -114, aR: [-50, 0, 24], eR: -114, y: -0.03 },
    cheer: { T: [-6, 0, 0], H: [-14, 0, 0], aL: [-168, 0, 22], eL: -16, aR: [-168, 0, -22], eR: -16 },
    slump: { T: [26, 0, 0], H: [30, 0, 0], y: -0.04, kL: 14, kR: 14, lL: [-6, 0, 0], lR: [-6, 0, 0], aL: [10, 0, 5], aR: [10, 0, -5], eL: -6, eR: -6 },
    shame: { T: [14, 0, 0], H: [38, 0, 0], aL: [6, 0, 4], aR: [6, 0, -4], eL: -4, eR: -4 },
    think: { H: [8, -12, 0], T: [4, 0, 0], aR: [-44, 0, -4], eR: -136, aL: [-18, 0, -18], eL: -80 },
    talk: { T: [3, 0, 0], aR: [-34, 0, -14], eR: -78, aL: [-6, 0, 8], eL: -22 },
    point: { T: [2, 10, 0], aR: [-86, 0, -8], eR: -6, aL: [0, 0, 8], eL: -14 },
    offer: { T: [10, 0, 0], H: [6, 0, 0], aL: [-42, 0, 4], eL: -62, aR: [-42, 0, -4], eR: -62 },
    hold: { T: [14, 0, 0], H: [10, 0, 0], y: -0.05, kL: 14, kR: 14, aL: [-64, 0, 0], eL: -30, aR: [-64, 0, 0], eR: -30 },
    carry: { aL: [-158, 0, 28], eL: -64, aR: [-158, 0, -28], eR: -64, H: [-4, 0, 0] },
    sneak: { y: -0.2, T: [30, 0, 0], H: [-22, 0, 0], lL: [-36, 0, 4], kL: 62, lR: [-10, 0, -4], kR: 58, aL: [-18, 0, 36], eL: -52, aR: [-18, 0, -36], eR: -52 },
    freeze: { y: -0.3, T: [38, 0, 0], H: [-28, 0, 0], lL: [-48, 0, 6], kL: 84, lR: [-20, 0, -6], kR: 80, aL: [-30, 0, 20], eL: -90, aR: [-30, 0, -20], eR: -90 },
    brace: { y: -0.14, T: [22, 0, 0], H: [-10, 0, 0], lL: [-32, 0, 6], kL: 38, lR: [24, 0, -6], kR: 28, aL: [-72, 0, 10], eL: -36, aR: [-72, 0, -10], eR: -36 },
    push: { y: -0.18, T: [34, 0, 0], H: [-16, 0, 0], lL: [-40, 0, 6], kL: 30, lR: [36, 0, -6], kR: 20, aL: [-84, 0, 6], eL: -8, aR: [-84, 0, -6], eR: -8 },
    drive: { y: -0.04, kL: 12, kR: 12, lL: [-6, 0, 6], lR: [-6, 0, -6], T: [8, 0, 0], aL: [-58, 0, 2], eL: -42, aR: [-58, 0, -2], eR: -42 },
    ride: { lL: [-42, 0, 36], kL: 66, lR: [-42, 0, -36], kR: 66, T: [6, 0, 0], aL: [-50, 0, 2], eL: -50, aR: [-50, 0, -2], eR: -50 },
    cast: { T: [-10, 0, 0], H: [-22, 0, 0], aL: [-152, 0, 34], eL: -14, aR: [-152, 0, -34], eR: -14, y: 0.02 },
    stagger: { T: [-24, 0, 10], H: [-16, 0, 0], y: -0.06, kL: 20, kR: 10, lL: [10, 0, 0], lR: [-14, 0, 0], aL: [-40, 0, 50], eL: -30, aR: [-30, 0, -55], eR: -40 },
    down: { T: [0, 0, 0], H: [0, 20, 0], aL: [-10, 0, 62], eL: -24, aR: [-6, 0, -48], eR: -40, lL: [-8, 0, 12], kL: 14, lR: [4, 0, -10], kR: 30 },
    sleep: { H: [0, 30, 0], aL: [-4, 0, 14], eL: -70, aR: [-4, 0, -10], eR: -30, lL: [-6, 0, 6], kL: 20, lR: [-2, 0, -4], kR: 8 },
    roll: { y: -0.5, T: [70, 0, 0], H: [40, 0, 0], lL: [-110, 0, 6], kL: 130, lR: [-110, 0, -6], kR: 130, aL: [-70, 0, 10], eL: -110, aR: [-70, 0, -10], eR: -110 },
    swim: { T: [-10, 0, 0], H: [-30, 0, 0], aL: [-170, 0, 12], eL: -8, aR: [-170, 0, -12], eR: -8, lL: [8, 0, 4], lR: [-8, 0, -4], kL: 12, kR: 12 },
    climb: { T: [14, 0, 0], aL: [-120, 0, 10], eL: -60, aR: [-60, 0, -10], eR: -90, lL: [-50, 0, 0], kL: 70, lR: [10, 0, 0], kR: 20 },
    clasp: { T: [4, 0, 0], aR: [-62, 0, 8], eR: -30, aL: [0, 0, 8], eL: -14 },
    write: { y: -0.66, lL: [-84, 0, 44], kL: 138, lR: [-84, 0, -44], kR: 138, T: [24, 0, 0], H: [22, 0, 0], aL: [-40, 0, 6], eL: -50, aR: [-50, 0, 6], eR: -60 }
  };
  G.POSES = POSES;
  // One-shot actions. A blow is three poses: coiled (the wind-up, held while the mark on the ground fills), landed, and
  // carried through. Its timing is worked out when it starts (f.act): however long the wind-up, the strike itself is a
  // short, accelerating snap that ends exactly on the moment the rules say the blow lands. The body does what a body
  // does (checked against written technique, docs/Fighting_Moves.md): the hips wind back and then turn into the blow,
  // the weapon moves first and the lead foot lunges under it, the rear leg straightens to drive, and the arm carries
  // through before the guard comes back. `land` is the share of the whole act at which it lands; `strike` its seconds.
  const GUARD = { aL: [-30, -80, 0], eL: [-96, 0, 0] }, STANCES = new Set(["ready", "readyMace", "readySpear"]);
  const LUNGE = { lL: [-46, 0, 5], kL: 54, lR: [30, 0, -6], kR: 6, y: -0.13, z: 0.2 }, BACK = { lL: [-24, 0, 6], kL: 16, lR: [10, 0, -8], kR: 40, y: -0.09, z: -0.05 };
  const W = (a, b) => Object.assign({}, a, b);
  const ACTS = {
    // A descending cut from the right shoulder, the hips turning it in (the forehand).
    slash: { land: 0.5, strike: 0.12,
      coil: W(BACK, { P: [0, -40, 0], T: [-4, -24, 0], H: [0, 40, 0], aR: [-84, 0, -30], eR: -122, wR: [66, 0, 0], aL: [-52, 0, 4], eL: -58 }),
      hit: W(LUNGE, { P: [0, 20, 0], T: [14, 26, 0], H: [0, -26, 0], aR: [-64, 0, 30], eR: -10, wR: [50, 0, 0], aL: [-20, 0, 22], eL: -76 }),
      follow: W(LUNGE, { P: [0, 30, 0], T: [20, 36, 0], H: [0, -34, 0], aR: [-34, 0, 40], eR: -20, wR: [68, 0, 0], aL: [-14, 0, 26], eL: -80, y: -0.15 }) },
    // The backhand that answers it, from the left shoulder across to the right.
    slash2: { land: 0.5, strike: 0.12,
      coil: W(BACK, { P: [0, 16, 0], T: [2, 30, 0], H: [0, -20, 0], aR: [-76, 0, 60], eR: -116, wR: [18, 0, 0], aL: [-30, 0, 20], eL: -70, y: -0.08, z: 0 }),
      hit: W(LUNGE, { P: [0, -20, 0], T: [12, -26, 0], H: [0, 30, 0], aR: [-70, 0, -46], eR: -8, wR: [48, 0, 0], aL: [-36, 0, 14], eL: -64, kL: 44, y: -0.1, z: 0.14 }),
      follow: W(LUNGE, { P: [0, -30, 0], T: [14, -36, 0], H: [0, 40, 0], aR: [-44, 0, -62], eR: -22, wR: [62, 0, 0], aL: [-40, 0, 10], eL: -60, kL: 46, y: -0.11, z: 0.15 }) },
    // The heavy blow: both hands above the head, the whole body dropping into the cut.
    heavy: { land: 0.55, strike: 0.14,
      coil: W(BACK, { P: [0, -12, 0], T: [-16, -6, 0], H: [8, 12, 0], aR: [-166, 0, 12], eR: -64, wR: [-18, 0, 0], aL: [-166, 0, -12], eL: -64, y: -0.03, z: -0.07 }),
      hit: W(LUNGE, { P: [0, 6, 0], T: [32, 6, 0], H: [-14, -6, 0], aR: [-60, 0, 12], eR: -8, wR: [52, 0, 0], aL: [-60, 0, -12], eL: -10, kL: 60, y: -0.18, z: 0.22 }),
      follow: W(LUNGE, { P: [0, 8, 0], T: [40, 8, 0], H: [-18, -8, 0], aR: [-40, 0, 10], eR: -10, wR: [66, 0, 0], aL: [-40, 0, -10], eL: -12, kL: 64, y: -0.21, z: 0.23 }) },
    // A spear thrust: the point goes first, the body follows, the lead foot lands last.
    thrust: { land: 0.5, strike: 0.13,
      coil: W(BACK, { P: [0, -36, 0], T: [4, -22, 0], H: [0, 44, 0], aR: [30, 0, -18], eR: -104, wR: [76, 0, 0], aL: [-54, 0, 4], eL: -32 }),
      hit: W(LUNGE, { P: [0, 12, 0], T: [18, 24, 0], H: [-6, -28, 0], aR: [-80, 0, 6], eR: -4, wR: [84, 0, 0], aL: [-72, 0, -6], eL: -28, kL: 62, y: -0.16, z: 0.27 }),
      follow: W(LUNGE, { P: [0, 8, 0], T: [16, 18, 0], H: [-6, -22, 0], aR: [-62, 0, 2], eR: -34, wR: [86, 0, 0], aL: [-64, 0, -2], eL: -36, kL: 56, y: -0.15, z: 0.22 }) },
    // The mace brought over from behind the back, both hands on the haft, the knees sinking under it.
    smash: { land: 0.56, strike: 0.15,
      coil: W(BACK, { P: [0, -14, 0], T: [-18, -10, 0], H: [10, 16, 0], aR: [-152, 0, 6], eR: -104, wR: [-34, 0, 0], aL: [-150, 0, -16], eL: -98, y: -0.02, z: -0.08 }),
      hit: W(LUNGE, { P: [0, 4, 0], T: [36, 4, 0], H: [-16, -4, 0], aR: [-58, 0, 10], eR: -6, wR: [58, 0, 0], aL: [-58, 0, -12], eL: -10, lL: [-48, 0, 8], kL: 66, lR: [28, 0, -10], kR: 14, y: -0.22, z: 0.18 }),
      follow: W(LUNGE, { P: [0, 4, 0], T: [44, 4, 0], H: [-20, -4, 0], aR: [-40, 0, 8], eR: -8, wR: [68, 0, 0], aL: [-40, 0, -10], eL: -12, lL: [-48, 0, 8], kL: 70, lR: [28, 0, -10], kR: 16, y: -0.25, z: 0.19 }) },
    // The mace swung level from the right, the hips throwing it round through everyone in reach.
    sweep: { land: 0.52, strike: 0.15,
      coil: { P: [0, -38, 0], T: [2, -34, 0], H: [0, 62, 0], aR: [0, 0, -88], eR: -40, wR: [90, 0, 0], aL: [-56, 0, -30], eL: -64, lL: [-22, 0, 12], kL: 26, lR: [12, 0, -14], kR: 36, y: -0.12, z: -0.03 },
      hit: { P: [0, 6, 0], T: [8, 8, 0], H: [0, -12, 0], aR: [0, 88, -84], eR: -8, wR: [86, 0, 0], aL: [-44, 0, 40], eL: -52, lL: [-34, 0, 14], kL: 44, lR: [24, 0, -14], kR: 18, y: -0.16, z: 0.1 },
      follow: { P: [0, 30, 0], T: [10, 34, 0], H: [0, -56, 0], aR: [0, 128, -80], eR: -18, wR: [74, 0, 0], aL: [-40, 0, 48], eL: -56, lL: [-34, 0, 14], kL: 46, lR: [26, 0, -14], kR: 20, y: -0.17, z: 0.1 } },
    // A dagger's quick straight stab.
    stab: { land: 0.45, strike: 0.09,
      coil: W(BACK, { P: [0, -32, 0], T: [4, -18, 0], H: [0, 36, 0], aR: [-8, 0, -12], eR: -120, wR: [66, 0, 0], aL: [-50, 0, 6], eL: -70, y: -0.1 }),
      hit: W(LUNGE, { P: [0, 10, 0], T: [14, 22, 0], H: [0, -22, 0], aR: [-80, 0, 8], eR: -6, wR: [82, 0, 0], aL: [-24, 0, 20], eL: -84, kL: 46, y: -0.11, z: 0.15 }),
      follow: W(LUNGE, { P: [0, 6, 0], T: [12, 14, 0], H: [0, -14, 0], aR: [-58, 0, 2], eR: -40, wR: [78, 0, 0], aL: [-30, 0, 18], eL: -80, kL: 42, y: -0.1, z: 0.12 }) },
    // A straight right hand, thrown from the hips.
    punch: { land: 0.45, strike: 0.09,
      coil: W(BACK, { P: [0, -30, 0], T: [6, -22, 0], H: [0, 40, 0], aR: [-26, 0, -18], eR: -126, aL: [-62, 0, 14], eL: -98, y: -0.11 }),
      hit: W(LUNGE, { P: [0, 16, 0], T: [14, 30, 0], H: [0, -34, 0], aR: [-84, 0, 10], eR: -4, aL: [-40, 0, 20], eL: -118, kL: 44, y: -0.12, z: 0.14 }),
      follow: W(LUNGE, { P: [0, 10, 0], T: [12, 18, 0], H: [0, -20, 0], aR: [-60, 0, 0], eR: -70, aL: [-52, 0, 18], eL: -104, kL: 40, y: -0.11, z: 0.11 }) },
    hammer: { land: 0.5, strike: 0.12,
      coil: { aR: [-150, 0, -10], eR: -74, wR: [-10, 0, 0], T: [-8, 0, 0] }, hit: { aR: [-50, 0, 0], eR: -18, wR: [40, 0, 0], T: [22, 0, 0], y: -0.06 }, follow: { aR: [-44, 0, 0], eR: -22, wR: [46, 0, 0], T: [24, 0, 0], y: -0.07 } },
    throw: { land: 0.55, strike: 0.11,
      coil: W(BACK, { P: [0, -40, 0], T: [-12, -30, 0], H: [0, 50, 0], aR: [-150, 0, -30], eR: -88, aL: [-70, 0, 10], eL: -24 }), hit: W(LUNGE, { P: [0, 20, 0], T: [18, 28, 0], H: [0, -30, 0], aR: [-72, 0, 14], eR: -6, aL: [-10, 0, 20], eL: -50 }), follow: W(LUNGE, { P: [0, 30, 0], T: [26, 36, 0], H: [0, -36, 0], aR: [-30, 0, 24], eR: -16, aL: [0, 0, 22], eL: -50 }) },
    // The shot whole (written shot cycle: nock, raise, draw to the corner of the mouth with the elbow high, hold,
    // loose, and the string hand carried back under the ear while the bow arm stays up): phases of the whole act.
    shoot: { land: 0.88, bow: [0.3, 0.72], keys: [
      [0, { P: [0, -30, 0], T: [2, -16, 0], H: [0, 44, 0], lL: [-8, 0, 10], kL: 8, lR: [6, 0, -10], kR: 10, y: -0.02, aL: [-21, -41, 29], eL: -68, wL: [0, 0, 0], aR: [-144, 36, -40], eR: -93 }],
      [0.24, { P: [0, -30, 0], T: [2, -16, 0], H: [0, 44, 0], lL: [-8, 0, 10], kL: 8, lR: [6, 0, -10], kR: 10, y: -0.02, aL: [-21, -41, 29], eL: -68, wL: [0, 0, 0], aR: [-89, 41, 45], eR: -21 }],
      [0.36, { P: [0, -40, 0], T: [0, -30, 0], H: [0, 66, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [-6, -12, 76], eL: -14, wL: [0, 70, 0], aR: [-70, 38, -40], eR: -60 }],
      [0.72, { P: [0, -48, 0], T: [0, -40, 0], H: [0, 80, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [0, -2, 90], eL: 0, wL: [0, 90, 0], aR: [-42, 32, -111], eR: -143 }],
      [0.88, { P: [0, -48, 0], T: [0, -40, 0], H: [0, 80, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [0, -2, 90], eL: 0, wL: [0, 90, 0], aR: [-43, 30, -112], eR: -144 }],
      [0.93, { P: [0, -48, 0], T: [0, -40, 0], H: [0, 80, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [0, -4, 88], eL: -2, wL: [0, 90, 0], aR: [-50, -7, -119], eR: -137 }],
      [1, { P: [0, -44, 0], T: [0, -34, 0], H: [0, 72, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [0, -6, 82], eL: -6, wL: [0, 90, 0], aR: [-50, -10, -112], eR: -128 }]] },
    // A quick shot, the arrow already on the string.
    loose: { land: 0.62, bow: [0, 0.5], keys: [
      [0, { P: [0, -40, 0], T: [0, -30, 0], H: [0, 66, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [-6, -12, 76], eL: -14, wL: [0, 70, 0], aR: [-70, 38, -40], eR: -60 }],
      [0.5, { P: [0, -48, 0], T: [0, -40, 0], H: [0, 80, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [0, -2, 90], eL: 0, wL: [0, 90, 0], aR: [-42, 32, -111], eR: -143 }],
      [0.62, { P: [0, -48, 0], T: [0, -40, 0], H: [0, 80, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [0, -2, 90], eL: 0, wL: [0, 90, 0], aR: [-43, 30, -112], eR: -144 }],
      [0.72, { P: [0, -48, 0], T: [0, -40, 0], H: [0, 80, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [0, -4, 88], eL: -2, wL: [0, 90, 0], aR: [-50, -7, -119], eR: -137 }],
      [1, { P: [0, -40, 0], T: [0, -28, 0], H: [0, 62, 0], lL: [-4, 0, 13], kL: 6, lR: [2, 0, -13], kR: 8, y: -0.02, aL: [-4, -10, 74], eL: -12, wL: [0, 80, 0], aR: [-60, 10, -80], eR: -110 }]] },
    grab: { land: 0.5, keys: [[0, { aR: [-60, 0, -40], eR: -50, aL: [-60, 0, 40], eL: -50, T: [10, 0, 0] }], [0.5, { aR: [-80, 0, 16], eR: -24, aL: [-80, 0, -16], eL: -24, T: [26, 0, 0], y: -0.1 }], [1, { aR: [-60, 0, -8], eR: -60, aL: [-60, 0, 8], eL: -60, T: [14, 0, 0] }]] },
    // The weapon thrown up across the body to meet a blow, the weight sinking under it.
    parry: { land: 0.3, keys: [[0, { aR: [-70, 0, 20], eR: -90, T: [4, 10, 0], wR: [-10, 0, 0], y: 0 }], [0.3, { aR: [-112, 0, 40], eR: -74, T: [-6, 26, 0], wR: [-34, 0, 44], y: -0.07 }], [1, { aR: [-50, 0, -10], eR: -74, T: [6, 6, 0], wR: [0, 0, 0], y: 0 }]] },
    // Struck: the trunk and head thrown back, the arms flung open, the knees giving for a moment.
    hit: { land: 0.2, keys: [[0, { T: [0, 0, 0], H: [0, 0, 0], y: 0 }], [0.2, { T: [-24, 0, 12], H: [-22, 0, 8], y: -0.07 }], [0.5, { T: [-12, 0, 6], H: [-8, 0, 2], y: -0.04 }], [1, { T: [0, 0, 0], H: [0, 0, 0], y: 0 }]] },
    nod: { land: 0.4, keys: [[0, { H: [0, 0, 0] }], [0.4, { H: [22, 0, 0] }], [1, { H: [0, 0, 0] }]] },
    wave: { land: 0.5, keys: [[0, { aR: [-150, 0, -30], eR: -30 }], [0.25, { aR: [-150, 0, -10], eR: -50 }], [0.5, { aR: [-150, 0, -40], eR: -20 }], [0.75, { aR: [-150, 0, -10], eR: -50 }], [1, { aR: [-150, 0, -30], eR: -30 }]] },
    // The weapon raised and shaken at the foe: a challenge.
    taunt: { land: 0.5, keys: [[0, { aR: [-60, 0, -20], eR: -80, T: [0, 0, 0], H: [0, 0, 0] }], [0.3, { aR: [-160, 0, -24], eR: -30, wR: [-20, 0, 0], T: [-10, 0, 0], H: [-12, 0, 0] }], [0.5, { aR: [-166, 0, -10], eR: -44, wR: [-30, 0, 0], T: [-12, 0, 0], H: [-14, 0, 0] }], [0.7, { aR: [-160, 0, -28], eR: -26, wR: [-16, 0, 0], T: [-10, 0, 0], H: [-12, 0, 0] }], [1, { aR: [-60, 0, -20], eR: -80, T: [0, 0, 0], H: [0, 0, 0] }]] }
  };
  G.ACTS = ACTS;
  const JOINTS = ["P", "T", "H", "aL", "aR", "eL", "eR", "wL", "wR", "lL", "lR", "kL", "kR"];
  const vec = (v) => (typeof v === "number" ? [v, 0, 0] : v);
  function fillPose(out, src) { for (const k of JOINTS) { const v = vec(src[k] != null ? src[k] : REST[k]); const o = out[k]; o[0] = v[0]; o[1] = v[1]; o[2] = v[2]; } out.y = src.y != null ? src.y : 0; out.z = src.z || 0; return out; }
  const blank = () => { const o = { y: 0, z: 0 }; for (const k of JOINTS) o[k] = [0, 0, 0]; return o; };
  // A whole pose from a base and the joints a blow names (y and z as they are given).
  function overlay(out, base, part) { fillPose(out, base); for (const k in part) { if (k === "y" || k === "z") out[k] = part[k]; else { const v = vec(part[k]), o = out[k]; o[0] = v[0]; o[1] = v[1]; o[2] = v[2]; } } return out; }
  function copyPose(a, b) { for (const k of JOINTS) { a[k][0] = b[k][0]; a[k][1] = b[k][1]; a[k][2] = b[k][2]; } a.y = b.y; a.z = b.z; return a; }
  function mixPose(out, a, b, u) { for (const k of JOINTS) { const o = out[k], x = a[k], y = b[k]; o[0] = x[0] + (y[0] - x[0]) * u; o[1] = x[1] + (y[1] - x[1]) * u; o[2] = x[2] + (y[2] - x[2]) * u; } out.y = a.y + (b.y - a.y) * u; out.z = a.z + (b.z - a.z) * u; return out; }

  // ---------- The body ----------
  const STAGE = { child: [0.62, 1.4], youth: [0.9, 1.16], adult: [1, 1.1], elder: [0.97, 1.1] };
  const HAIR = { child: DARK, youth: DARK, adult: DARK, elder: 0xb8b2a6 };
  function headMesh(sp, skin, hair, cloth, trim, she) {
    const b = B(); b.ao = 0.9;
    b.cyl(0.055, 0.065, 0.1, 0, 0, 0, skin, 7);
    b.sph(0.125, 0, 0.2, 0, skin, 1.12, 10, 0.95, 1.0);
    b.geo(new T.SphereGeometry(0.134, 10, 7, 0, PI * 2, 0, PI * 0.5).scale(0.98, 1.1, 1.03), 0, 0.212, -0.02, -0.62, 0, 0, hair); // the hair, set back off the face
    const gearH = sp.gear || [];
    for (const sx of [-1, 1]) {
      b.sph(0.026, sx * 0.047, 0.214, 0.099, 0xf6f0e4, 0.82, 6);                                  // the white of the eye
      if (!sp.blind) b.sph(0.0145, sx * 0.047, 0.213, 0.1195, 0x140c08, 1, 6);                    // (a blind king's eyes are shown without)
      b.geo(new T.BoxGeometry(0.054, 0.012, 0.02), sx * 0.048, 0.249, 0.106, 0, 0, sx * -0.14, sp.stage === "elder" ? hair : DARK); // the brow
      b.sph(0.03, sx * 0.122, 0.2, 0.0, skin, 1.2);
    }
    b.box(0.026, 0.045, 0.03, 0, 0.165, 0.118, G.shade(skin, 0.93));
    if (!sp.beard) b.box(0.052, 0.011, 0.02, 0, 0.126, 0.108, 0x7a2f22);                            // the mouth
    if (sp.eye) b.box(0.06, 0.04, 0.02, 0.046, 0.2, 0.118, 0x140c08);
    if (gearH.includes("blindfold")) b.cyl(0.131, 0.131, 0.055, 0, 0.188, 0, 0xf2ece0, 10);        // Gandhari's bandage, folded many times over her eyes
    // Hair beyond the cap: long and loose, a braid down the back, matted locks, or standing stiff.
    if (sp.hair === "long") b.geo(new T.BoxGeometry(0.21, 0.27, 0.05), 0, 0.07, -0.118, 0.14, 0, 0, hair);
    else if (sp.hair === "braid") { b.sph(0.07, 0, 0.2, -0.125, hair, 1, 6); b.rod(0, 0.14, -0.13, 0, -0.42, -0.17, 0.04, hair, 5, 0.022); b.sph(0.03, 0, -0.44, -0.17, 0xb2432a, 1, 5); }
    else if (sp.hair === "matted") { for (const sx of [-1, 0, 1]) b.rod(sx * 0.07, 0.2, -0.11, sx * 0.09, -0.08, -0.15, 0.032, hair, 5, 0.018); }
    else if (sp.hair === "up") { for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; b.geo(new T.ConeGeometry(0.035, 0.2, 4), Math.sin(a) * 0.06, 0.4, Math.cos(a) * 0.06 - 0.02, Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35, hair); } b.geo(new T.ConeGeometry(0.04, 0.24, 4), 0, 0.44, -0.02, 0, 0, 0, hair); }
    const beardCol = hair;
    if (sp.beard === "long") { b.geo(new T.ConeGeometry(0.1, 0.36, 7).rotateX(PI), 0, 0.0, 0.07, 0.12, 0, 0, 0xf0ece2); b.sph(0.1, 0, 0.13, 0.05, 0xf0ece2, 0.7, 7, 1, 0.9); }
    else if (sp.beard === "forked") { for (const sx of [-1, 1]) b.geo(new T.ConeGeometry(0.045, 0.22, 5).rotateX(PI), sx * 0.04, 0.03, 0.09, 0.1, 0, sx * 0.14, beardCol); b.sph(0.09, 0, 0.13, 0.05, beardCol, 0.6, 7, 1, 0.9); }
    else if (sp.beard) { b.sph(0.095, 0, 0.125, 0.045, beardCol, 0.72, 7, 1, 0.92); }
    else if (!she && sp.stage !== "child" && sp.stage !== "youth") b.box(0.07, 0.014, 0.02, 0, 0.142, 0.118, hair); // a moustache
    if (she) { b.sph(0.085, 0, 0.19, -0.13, hair, 1, 7); b.rod(0, 0.12, -0.13, 0, -0.34, -0.15, 0.04, hair, 5, 0.02); b.sph(0.016, 0, 0.255, 0.122, 0xc0392b); for (const sx of [-1, 1]) b.sph(0.022, sx * 0.13, 0.155, 0.0, GOLD); }
    const hg = sp.headgear, top = 0.33;
    if (hg === "crown" || hg === "kirita" || hg === "mukuta") {
      const cr = sp.crown || {}, tall = (hg === "mukuta" ? 0.55 : 1) * (cr.tall || 1), gcol = cr.white ? 0xe8e8ee : GOLD, r = cr.broad ? 0.135 : 0.118;
      b.cyl(r * 1.02, r, 0.05, 0, 0.27, 0, cr.trim || trim, 10); b.cyl(r * 0.72, r, 0.2 * tall, 0, 0.31, 0, gcol, 10, 0, 0, 0, G.shade(gcol, 1.25));
      b.cone(r * 0.5, 0.12 * tall, 0, 0.31 + 0.2 * tall, 0, gcol, 8); b.sph(0.025, 0, 0.31 + 0.32 * tall, 0, Array.isArray(cr.gem) ? cr.gem[0] : cr.gem || 0xb2432a);
      const gems = Array.isArray(cr.gem) ? cr.gem : [cr.gem || 0xb2432a];
      gems.forEach((gm, i) => { const a = (i - (gems.length - 1) / 2) * 0.5; b.sph(0.022, Math.sin(a) * r * 0.98, 0.36, Math.cos(a) * r * 0.98, gm); });
    } else if (hg === "jata") { b.sph(0.075, 0, top + 0.035, -0.02, hair, 1.15, 7); b.cyl(0.05, 0.06, 0.03, 0, top - 0.02, -0.02, trim, 7); }
    else if (hg === "band") { b.cyl(0.131, 0.131, 0.035, 0, 0.245, -0.005, trim, 10); }
    else if (hg === "turban") { // thick coils of cloth, wound one above another, with the end tucked up
      const hc = sp.hat || cloth; b.dome(0.136, 0, 0.215, -0.005, G.shade(hc, 0.9), 0.95, 9);
      for (let i = 0; i < 3; i++) b.torus(0.122 - i * 0.026, 0.046, 0, 0.268 + i * 0.05, -0.006, i % 2 ? G.shade(hc, 0.86) : hc, PI / 2, 0, 0, 10);
      b.sph(0.055, 0.035, 0.41, 0.012, hc, 0.9, 6); b.cyl(0.139, 0.139, 0.022, 0, 0.243, -0.004, sp.hatTrim || trim, 10);
      if (sp.chin) { b.torus(0.118, 0.012, 0, 0.17, 0.0, G.shade(hc, 0.9), 0, 0, 0, 10); } // tied under the chin
    }
    else if (hg === "helmet" || hg === "crest") { b.dome(0.142, 0, 0.215, -0.005, sp.hat && hg === "crest" ? 0x8a6a3a : 0x8a7248, 1.05, 10); b.cyl(0.146, 0.146, 0.03, 0, 0.215, -0.005, 0x6a5232, 10); if (hg === "crest") b.box(0.03, 0.14, 0.26, 0, 0.33, -0.02, sp.hat || 0xa3302a); else b.cone(0.03, 0.09, 0, 0.36, 0, 0x8a7248, 5); }
    else if (hg === "capfeather") { b.dome(0.14, 0, 0.225, -0.01, sp.hat || 0x5d3b2a, 0.9, 9); b.geo(new T.ConeGeometry(0.028, 0.26, 4), 0.09, 0.4, -0.05, -0.3, 0, -0.3, 0xe8e0d0); }
    else if (hg === "peacock") { b.cyl(0.131, 0.131, 0.035, 0, 0.25, -0.005, GOLD, 10); b.geo(new T.SphereGeometry(0.06, 6, 5).scale(0.5, 2.1, 0.2), 0.03, 0.44, 0.0, 0, 0, -0.18, 0x2f8a6a, 0x3a5ac0); b.sph(0.022, 0.045, 0.5, 0.012, 0x2a3a9a); }
    else if (hg === "feather") { b.cyl(0.131, 0.131, 0.03, 0, 0.25, -0.005, trim, 10); b.geo(new T.ConeGeometry(0.03, 0.28, 4), -0.04, 0.42, -0.08, -0.35, 0, 0.1, 0xc9a066); }
    else if (hg === "scarf") { b.geo(new T.SphereGeometry(0.142, 9, 6, 0, PI * 2, 0, PI * 0.6).scale(1, 1.05, 1.03), 0, 0.2, -0.008, -0.2, 0, 0, sp.hat || 0x7a4a2a); }
    if ((sp.gear || []).includes("earrings")) for (const sx of [-1, 1]) b.sph(0.034, sx * 0.135, 0.15, 0.005, GOLD);
    if ((sp.gear || []).includes("browgem")) b.sph(0.022, 0, 0.262, 0.118, 0x9ad0ff);
    return b.mesh();
  }
  function torsoMesh(sp, skin, cloth, trim, she, wide) {
    const b = B(); b.ao = 0.86;
    const gear = sp.gear || [], armour = sp.armour || gear.includes("cuirass") || gear.includes("scale");
    const top = she || sp.stage === "child" && sp.pronoun === "she" ? cloth : skin;
    const chest = armour ? (sp.armour ? 0xe2b040 : gear.includes("scale") ? 0xc9a24e : 0x8a6a3a) : top;
    b.geo(new T.CylinderGeometry(0.2 * wide, 0.165 * wide, 0.3, 10, 1).translate(0, 0.15, 0).scale(1, 1, 0.62), 0, 0.0, 0, 0, 0, 0, she ? skin : top);
    b.geo(new T.CylinderGeometry(0.235 * wide, 0.2 * wide, 0.28, 10, 1).translate(0, 0.14, 0).scale(1, 1, 0.66), 0, 0.27, 0, 0, 0, 0, chest, armour ? G.shade(chest, 1.25) : null);
    b.geo(new T.SphereGeometry(0.1, 7, 5).scale(1, 0.7, 1), -0.25 * wide, 0.5, 0, 0, 0, 0, armour ? chest : top); b.geo(new T.SphereGeometry(0.1, 7, 5).scale(1, 0.7, 1), 0.25 * wide, 0.5, 0, 0, 0, 0, armour ? chest : top);
    if (sp.armour) b.sph(0.07, 0, 0.42, 0.14, 0xfff0a0, 1, 8); // the sun on Karna's breastplate
    if (armour) { // shoulder pieces, and the plates or scales in rows
      for (const sx of [-1, 1]) b.geo(new T.SphereGeometry(0.115, 7, 4, 0, PI * 2, 0, PI / 2).scale(1.1, 0.6, 1.05), sx * 0.26 * wide, 0.5, 0, 0, 0, sx * -0.3, G.shade(chest, 1.18));
      const rows = gear.includes("scale") ? 4 : 2; for (let i = 0; i < rows; i++) b.geo(new T.CylinderGeometry(0.238 * wide - i * 0.008, 0.236 * wide - i * 0.008, 0.012, 10, 1).scale(1, 1, 0.67), 0, 0.5 - (i + 0.5) * (0.24 / rows), 0, 0, 0, 0, G.shade(chest, 0.72));
    }
    if (gear.includes("thread")) { b.geo(new T.BoxGeometry(0.02, 0.7, 0.014), -0.03, 0.27, 0.152, 0, 0, 0.64, 0xf6f0e2); b.geo(new T.BoxGeometry(0.02, 0.7, 0.014), -0.03, 0.27, -0.152, 0, 0, -0.64, 0xf6f0e2); } // the sacred thread, from the left shoulder
    if (gear.includes("garland")) { b.torus(0.15, 0.026, 0, 0.4, 0.07, sp.garland || 0xf4ecd8, 1.05, 0, 0, 12); for (let i = 0; i < 5; i++) b.sph(0.03, Math.sin((i - 2) * 0.5) * 0.13, 0.3 + Math.abs(i - 2) * 0.035, 0.15, i % 2 ? 0xf2c14a : sp.garland || 0xf4ecd8, 1, 5); }
    if (gear.includes("deerskin")) { // a skin worn over the left shoulder, as those who go to the forest wear
      b.geo(new T.BoxGeometry(0.2, 0.68, 0.03), 0.045, 0.27, 0.148, 0, 0, 0.62, 0x9a6a3a); b.geo(new T.BoxGeometry(0.2, 0.68, 0.03), 0.045, 0.27, -0.148, 0, 0, -0.62, 0x8a5c30);
      for (const [dx, dy] of [[0.08, 0.4], [0.0, 0.3], [-0.07, 0.18], [0.05, 0.22]]) b.sph(0.02, dx, dy, 0.166, 0xe8dcc0, 0.4, 5);
    }
    if (gear.includes("bands") && !armour) { for (const sgn of [1, -1]) { b.geo(new T.BoxGeometry(0.06, 0.62, 0.02), 0, 0.3, 0.15, 0, 0, sgn * 0.7, cloth); b.geo(new T.BoxGeometry(0.06, 0.62, 0.02), 0, 0.3, -0.15, 0, 0, -sgn * 0.7, cloth); } b.geo(new T.CylinderGeometry(0.2 * wide, 0.19 * wide, 0.06, 10, 1).scale(1, 1, 0.66), 0, 0.16, 0, 0, 0, 0, cloth); } // cloth bands crossed on the chest and bound at the waist
    if (!armour && !she && sp.stage !== "child" && !gear.includes("deerskin") && !gear.includes("bands") && !gear.includes("bare")) { // the upper cloth, across from the left shoulder
      b.geo(new T.BoxGeometry(0.11, 0.66, 0.03), 0.02, 0.27, 0.142, 0, 0, 0.66, cloth); b.geo(new T.BoxGeometry(0.11, 0.66, 0.03), 0.02, 0.27, -0.142, 0, 0, -0.66, cloth);
      b.box(0.1, 0.03, 0.34, 0.2 * wide, 0.53, 0, cloth);
    }
    if (she) { b.geo(new T.BoxGeometry(0.13, 0.7, 0.03), 0.03, 0.26, 0.15, 0, 0, 0.62, trim); b.box(0.12, 0.5, 0.03, 0.16, 0.06, -0.15, trim); }
    if (!she || true) b.torus(0.105, 0.012, 0, 0.5, 0.045, trim, PI / 2.3, 0, 0, 12); // a necklace
    if (gear.includes("quivers") || sp.item === "bow") { b.geo(new T.CylinderGeometry(0.055, 0.045, 0.5, 6), -0.1, 0.36, -0.2, 0.25, 0, 0.25, 0x6a4628); for (let i = 0; i < 3; i++) b.box(0.012, 0.1, 0.05, -0.17 + i * 0.03, 0.6, -0.24, 0xc8402c); }
    if (gear.includes("waterpot")) b.sph(0.07, 0.2, 0.02, 0.08, 0xb5793a);
    b.geo(new T.CylinderGeometry(0.175 * wide, 0.19 * wide, 0.1, 10, 1).scale(1, 1, 0.68), 0, 0.02, 0, 0, 0, 0, trim); // the waist band
    return b.mesh();
  }
  function limb(len, r0, r1, col, col2, extra) {
    const b = B(); b.ao = 0.9;
    b.cyl(r1, r0, len, 0, -len, 0, col2 == null ? col : col2, 7, 0, 0, 0, col);
    b.sph(r0 * 1.02, 0, 0, 0, col, 1, 6);
    if (extra) extra(b);
    return b.mesh();
  }

  let BLOB_GEO = null, BLOB_MAT = null, TRAIL_MAT = null;
  const TRAIL_N = 9;
  G.figure = function (spec, opt) {
    const sp = Object.assign({ stage: "adult", pronoun: "he", palette: ["#c27a44", "#8a3a2a", "#e2b55a"] }, spec || {}); opt = opt || {};
    const [sc, headK] = STAGE[sp.stage] || STAGE.adult, she = sp.pronoun === "she";
    const size = sc * (sp.size || 1) * (sp.big ? 1.04 : 1), wide = (sp.big ? 1.2 : 1) * (she ? 0.88 : 1) * (sp.stage === "child" ? 0.92 : 1);
    const skin = new T.Color(sp.palette[0]).getHex(), cloth = new T.Color(sp.palette[1]).getHex(), trim = new T.Color(sp.palette[2]).getHex();
    const hair = sp.hairCol ? new T.Color(sp.hairCol).getHex() : sp.stage === "elder" ? (sp.beard === "long" || sp.white || (sp.crown && sp.crown.white) ? 0xf0ece2 : HAIR.elder) : DARK;
    const f = { spec: sp, size, root: new T.Group(), j: {}, cur: blank(), tgt: blank(), base: "stand", speed: 0, phase: Math.random() * 6, fall: 0, fallTo: 0, fallDir: 1, action: null, talk: false, look: null, alive: true, rate: 10, spin: 0 };
    const body = new T.Group(); body.scale.setScalar(size); f.root.add(body); f.body = body;
    const tilt = new T.Group(); body.add(tilt); f.tilt = tilt; // falls and rolls turn here, about the feet
    const hips = new T.Group(); hips.position.y = 0.92; tilt.add(hips); f.j.P = hips;
    const torso = new T.Group(); hips.add(torso); f.j.T = torso;
    torso.add(torsoMesh(sp, skin, cloth, trim, she, wide));
    const head = new T.Group(); head.position.y = 0.55; head.scale.setScalar(headK); torso.add(head); f.j.H = head;
    head.add(headMesh(sp, skin, hair, cloth, trim, she));
    const long = she || sp.stage === "elder" || sp.headgear === "crown" || sp.headgear === "jata"; // a long garment or a short one
    const armCol = she ? cloth : skin, gear = sp.gear || [];
    for (const s of ["L", "R"]) {
      const sx = s === "L" ? 1 : -1;
      const sh = new T.Group(); sh.position.set(sx * 0.255 * wide, 0.49, 0); torso.add(sh); f.j["a" + s] = sh;
      sh.add(limb(0.29, 0.072, 0.058, skin, she ? cloth : null, (b) => { if (!she && sp.stage !== "child") b.cyl(0.067, 0.067, 0.035, 0, -0.14, 0, trim, 7); }));
      const el = new T.Group(); el.position.y = -0.29; sh.add(el); f.j["e" + s] = el;
      el.add(limb(0.26, 0.058, 0.046, skin, null, (b) => { b.sph(0.056, 0, -0.3, 0, skin, 1.1, 6); if (gear.includes("bracer") || sp.armour || gear.includes("scale")) b.cyl(0.056, 0.062, 0.14, 0, -0.22, 0, trim, 7); else if (gear.includes("bangles")) { for (let i = 0; i < 3; i++) b.cyl(0.054, 0.054, 0.022, 0, -0.27 + i * 0.032, 0, i === 1 ? GOLD : 0xf6f0e4, 8); } else b.cyl(0.051, 0.051, 0.025, 0, -0.24, 0, trim, 7); }));
      const ha = new T.Group(); ha.position.y = -0.3; el.add(ha); f.j["w" + s] = ha;
      const hip = new T.Group(); hip.position.set(sx * 0.1 * wide, 0, 0); hips.add(hip); f.j["l" + s] = hip;
      hip.add(limb(0.45, 0.105 * (she ? 1.12 : 1), 0.08, cloth, G.shade(cloth, 0.9)));
      const kn = new T.Group(); kn.position.y = -0.45; hip.add(kn); f.j["k" + s] = kn;
      kn.add(limb(0.42, 0.075 * (long ? 1.15 : 1), 0.05, long ? cloth : skin, long ? G.shade(cloth, 0.84) : null, (b) => { if (long) b.cyl(0.062, 0.062, 0.03, 0, -0.4, 0, trim, 7); b.box(0.085, 0.06, 0.22, 0, -0.47, 0.05, long ? skin : G.shade(skin, 0.9)); }));
    }
    { const b = B(); b.ao = 0.9; b.geo(new T.CylinderGeometry(0.19 * wide, 0.21 * wide, 0.2, 10, 1).scale(1, 1, 0.72), 0, -0.06, 0, 0, 0, 0, cloth); b.box(0.1, 0.36, 0.035, 0, -0.5, 0.125, trim, 0, 0.05); if (gear.includes("sash")) b.box(0.08, 0.5, 0.03, 0.12, -0.6, 0.12, trim); hips.add(b.mesh()); }
    f.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    if (!opt.noBlob) { // a soft dark patch under the feet: it holds the figure to the ground whether or not the sun casts shadows
      f.blob = new T.Mesh(BLOB_GEO || (BLOB_GEO = G.keep(new T.CircleGeometry(0.62, 14).rotateX(-PI / 2))), BLOB_MAT || (BLOB_MAT = G.keep(new T.MeshBasicMaterial({ map: G.tex("glow"), color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false, fog: false }))));
      f.blob.position.y = 0.03; f.blob.scale.setScalar(size * (sp.big ? 1.2 : 1)); f.blob.renderOrder = 1; f.root.add(f.blob);
    }
    fillPose(f.cur, POSES.stand); fillPose(f.tgt, POSES.stand);

    // What is held. item: a weapon name or null; the bow goes to the left hand, a shield to the left forearm.
    f.setItem = function (item) {
      if (f.item) { f.item.parent.remove(f.item); G.dispose(f.item); f.item = null; }
      if (f.bow) { f.bow.parent.remove(f.bow); G.dispose(f.bow); f.bow = null; }
      f.itemKind = item || null;
      if (item === "bow") { f.bow = bow(); f.bow.position.set(0, 0.25, 0.03); f.bow.rotation.set(0.12, 0, 0.16); f.j.wL.add(f.bow); }
      else { const m = held(item, sp.maceCol); if (m) { m.position.set(0, -0.03, 0.02); m.castShadow = true; f.j.wR.add(m); f.item = m; } }
      return f;
    };
    f.setShield = function (on, col, kind) {
      if (f.shield) { f.shield.parent.remove(f.shield); G.dispose(f.shield); f.shield = null; }
      if (on) { f.shield = shield(col || cloth, trim, kind); f.shield.position.set(0.07, -0.16, 0); f.shield.castShadow = true; f.j.eL.add(f.shield); }
      return f;
    };
    f.drawBow = (d) => { if (f.bow) { f.autoDraw = false; drawBow(f.bow, d); } };
    // Where the weapon's tip (or the bow hand) is in the world, for arrows, sparks and trails.
    f.tip = function (out) { out = out || new V3(); if (f.item) { out.set(0, 0, f.item.userData.tip); f.item.localToWorld(out); } else if (f.bow) { out.set(0, 0, 0); f.bow.localToWorld(out); } else { out.set(0, -0.06, 0); f.j.wR.localToWorld(out); } return out; };
    f.headPos = function (out) { out = out || new V3(); out.set(0, 0.22, 0); f.j.H.localToWorld(out); return out; };
    f.chest = function (out) { out = out || new V3(); out.set(0, 0.36, 0); f.j.T.localToWorld(out); return out; };
    f.setItem(opt.item !== undefined ? opt.item : sp.item);
    if (gear.includes("shield") || gear.includes("buckler") || opt.shield) f.setShield(true, opt.shieldCol);

    f.pose = function (name, snap) { f.base = POSES[name] ? name : "stand"; if (snap) { compute(0, 0); copyTo(f.cur, f.tgt); apply(); } return f; };
    // A one-shot: name, how long it lasts (s), and optionally how far through it starts.
    f.act = function (name, dur, from) {
      const A = ACTS[name]; if (!A) return f;
      const a = (f.action = { A, name, t: (from || 0) * dur, dur: Math.max(0.05, dur) });
      if (A.coil) { // a blow: the coil is reached early and held; the strike is a short snap that ends on the landing
        const base = POSES[f.base] || POSES.stand;
        a.tL = A.land * a.dur; a.tS = a.tL - Math.min(A.strike || 0.13, a.tL * 0.62); a.tC = Math.min(a.tS * 0.72, 0.3); a.tF = Math.min(a.dur, a.tL + Math.min(0.15, (a.dur - a.tL) * 0.55));
        const sh = f.shield ? GUARD : null; // (a shield stays across the front: the blow is the right arm's)
        a.snap = copyPose(blank(), f.cur); a.coil = overlay(blank(), base, sh ? W(A.coil, sh) : A.coil); a.hit = overlay(blank(), base, sh ? W(A.hit, sh) : A.hit); a.follow = overlay(blank(), base, sh ? W(A.follow || A.hit, sh) : A.follow || A.hit);
      }
      return f;
    };
    f.acting = () => !!f.action;
    f.place = function (x, z, ry) { f.root.position.set(x, f.root.position.y, z); if (ry != null) { f.root.rotation.y = ry; f.face = ry; } return f; };
    f.face = 0;
    f.turnTo = function (ry) { f.face = ry; return f; };
    f.lookAt = function (x, z) { f.face = Math.atan2(x - f.root.position.x, z - f.root.position.z); return f; };
    // Go down (and stay), or get up. dir: 1 falls on the back, -1 on the face.
    f.drop = function (on, dir) { f.fallTo = on ? 1 : 0; if (dir) f.fallDir = dir; return f; };

    const k1 = blank(), k2 = blank();
    function copyTo(a, b) { copyPose(a, b); }
    function compute(dt, t) {
      const tg = f.tgt;
      fillPose(tg, POSES[f.base] || POSES.stand);
      if (f.shield && STANCES.has(f.base)) { tg.aL[0] = GUARD.aL[0]; tg.aL[1] = GUARD.aL[1]; tg.aL[2] = GUARD.aL[2]; tg.eL[0] = GUARD.eL[0]; }
      // The walk: legs and (when the hands are free) arms ride on the distance covered.
      const sp2 = Math.min(1, f.speed / 3.2), moving = f.speed > 0.15 && f.fall < 0.2;
      if (moving) {
        // (the stride a swing of A degrees covers, so feet do not skate: one cycle is two steps)
        const A = 22 + 26 * sp2, stride = 4 * 0.87 * size * Math.sin(A * D);
        f.phase += dt * Math.max(2.4, (6.283 * f.speed) / stride);
        const s = Math.sin(f.phase), c = Math.cos(f.phase), Kn = 34 + 34 * sp2, crouch = tg.y < -0.1;
        tg.lL[0] += A * s; tg.lR[0] -= A * s; tg.kL[0] += Kn * Math.max(0, -c) + (crouch ? 0 : 4); tg.kR[0] += Kn * Math.max(0, c) + (crouch ? 0 : 4);
        tg.y -= Math.abs(s) * 0.022 * (1 + sp2); tg.T[1] += 5 * s; tg.T[0] += 4 + 8 * sp2;
        if (f.base === "stand" || f.base === "carry0") { const Ba = 18 + 24 * sp2; tg.aL[0] += -Ba * s; tg.aR[0] += Ba * s; tg.eL[0] = -14 - 46 * sp2; tg.eR[0] = -14 - 46 * sp2; }
      } else if (f.fall < 0.2) { const br = Math.sin(t * 1.6 + f.phase); tg.T[0] += br * 1.2; tg.aL[2] += br * 0.8; tg.aR[2] -= br * 0.8; }
      if (f.talk && f.fall < 0.2) { const w = Math.sin(t * 2.6 + f.phase), w2 = Math.sin(t * 1.7 + f.phase * 2); if (f.base === "stand" || f.base === "talk") { tg.aR[0] = -36 + w * 10; tg.aR[2] = -14 + w2 * 8; tg.eR[0] = -74 + w * 22; tg.H[0] += w2 * 4; tg.T[0] += 3; } else tg.H[0] += w2 * 5; }
      if (f.look && f.fall < 0.2) { const a = Math.atan2(f.look.x - f.root.position.x, f.look.z - f.root.position.z) - f.root.rotation.y, d = Math.atan2(Math.sin(a), Math.cos(a)) / D; tg.H[1] += G.clamp(d, -62, 62) * 0.8; }
      // Going down: the knees give first, the body folds, and only then does it go over.
      if (f.fall > 0) { const b = Math.sin(Math.min(1, f.fall * 1.5) * PI), dn = POSES.down, m = Math.min(1, f.fall * 1.6); overlay(k1, dn, {}); mixPose(tg, tg, k1, m); tg.kL[0] += 64 * b; tg.kR[0] += 48 * b; tg.lL[0] -= 30 * b; tg.lR[0] -= 18 * b; tg.y -= 0.24 * b; tg.T[0] += 22 * b * f.fallDir; tg.H[0] += 16 * b * f.fallDir; }
      f.exact = false;
      let drawn = f.base === "aim" ? 1 : 0;
      if (f.action && f.action.A.coil) {
        const a = f.action; a.t += dt;
        if (a.t >= a.dur) f.action = null;
        else {
          const t2 = a.t; let u;
          if (t2 < a.tC) { u = t2 / Math.max(1e-3, a.tC); mixPose(tg, a.snap, a.coil, 1 - (1 - u) * (1 - u)); }
          else if (t2 < a.tS) { u = (t2 - a.tC) / Math.max(1e-3, a.tS - a.tC); copyPose(tg, a.coil); const w = Math.sin(u * PI) * 2.2; tg.T[0] -= w; tg.aR[0] -= w * 1.5; tg.y -= 0.012 * u; } // held, tightening
          else if (t2 < a.tL) { u = (t2 - a.tS) / Math.max(1e-3, a.tL - a.tS); mixPose(tg, a.coil, a.hit, u * u * u); }               // the snap, gathering speed
          else if (t2 < a.tF) { u = (t2 - a.tL) / Math.max(1e-3, a.tF - a.tL); mixPose(tg, a.hit, a.follow, 1 - (1 - u) * (1 - u)); }
          else { u = (t2 - a.tF) / Math.max(1e-3, a.dur - a.tF); copyPose(k2, tg); mixPose(tg, a.follow, k2, u * u * (3 - 2 * u)); }
          f.exact = true;
        }
      } else if (f.action) {
        const a = f.action; a.t += dt;
        const p = a.t / a.dur, ks = a.A.keys;
        if (a.A.bow && p < 1) drawn = p < a.A.bow[0] ? 0 : p < a.A.bow[1] ? (p - a.A.bow[0]) / (a.A.bow[1] - a.A.bow[0]) : p < a.A.land ? 1 : 0;
        if (p >= 1) f.action = null;
        else {
          let i = 0; while (i < ks.length - 2 && p > ks[i + 1][0]) i++;
          const u = G.clamp((p - ks[i][0]) / Math.max(1e-4, ks[i + 1][0] - ks[i][0]), 0, 1), e = u * u * (3 - 2 * u), A0 = ks[i][1], A1 = ks[i + 1][1];
          for (const key in A0) {
            if (key === "y") { tg.y += A0.y + ((A1.y || 0) - A0.y) * e; continue; }
            const v0 = vec(A0[key]), v1 = vec(A1[key] != null ? A1[key] : A0[key]), o = tg[key];
            // the legs keep their stance: an action moves the trunk and arms, and adds to the hips' turn
            if (key === "P") { o[1] += v0[1] + (v1[1] - v0[1]) * e - (POSES[f.base] && POSES[f.base].P ? POSES[f.base].P[1] : 0); continue; }
            o[0] = v0[0] + (v1[0] - v0[0]) * e; o[1] = v0[1] + (v1[1] - v0[1]) * e; o[2] = v0[2] + (v1[2] - v0[2]) * e;
          }
        }
      }
      if (f.bow && f.autoDraw !== false) drawBow(f.bow, drawn);
    }
    function apply() {
      const c = f.cur, j = f.j;
      for (const k of JOINTS) j[k].rotation.set(c[k][0] * D, c[k][1] * D, c[k][2] * D);
      j.P.position.y = 0.92 + c.y; j.P.position.z = c.z;
      // Going down: once the knees have given, the whole body goes over about the feet until it lies along the ground.
      const fl = f.fall, over = fl < 0.3 ? 0 : (fl - 0.3) / 0.7, go = over * over * (3 - 2 * over);
      tilt.rotation.x = -go * (PI / 2) * f.fallDir + f.spin; tilt.position.y = go * 0.11 + (f.spin ? 0.5 * Math.abs(Math.sin(f.spin / 2)) * 1.1 : 0);
    }
    f.update = function (dt, t) {
      compute(dt, t);
      const k = f.exact ? 1 : 1 - Math.exp(-(f.action ? 26 : f.rate) * dt), c = f.cur, tg = f.tgt;
      for (const key of JOINTS) { const a = c[key], b = tg[key]; a[0] += (b[0] - a[0]) * k; a[1] += (b[1] - a[1]) * k; a[2] += (b[2] - a[2]) * k; }
      c.y += (tg.y - c.y) * k; c.z += (tg.z - c.z) * k;
      if (f.fall !== f.fallTo) f.fall = f.fallTo > f.fall ? Math.min(f.fallTo, f.fall + dt * 1.7) : Math.max(f.fallTo, f.fall - dt * 2.2);
      // Turn toward the facing asked for, the short way round.
      let d = f.face - f.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      f.root.rotation.y += d * (1 - Math.exp(-(f.turnRate || 12) * dt));
      apply();
      if (f.trails || f.trail) { f.root.updateWorldMatrix(true, true); trail(dt); }
    };
    // The streak of a weapon through its blow: a ribbon between where the weapon was and where it is, fading behind it.
    const tipA = new V3(), tipB = new V3();
    function trail(dt) {
      const a = f.action, on = f.trails && f.item && a && a.tS != null && a.t >= a.tS - 0.03 && a.t <= a.tF + 0.02;
      if (!on && !(f.trail && f.trail.n)) return;
      if (!f.trail) {
        const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(new Float32Array(TRAIL_N * 6), 3)); g.setAttribute("color", new T.BufferAttribute(new Float32Array(TRAIL_N * 6), 3));
        const idx = []; for (let i = 0; i < TRAIL_N - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } g.setIndex(idx);
        const m = new T.Mesh(g, TRAIL_MAT || (TRAIL_MAT = G.keep(new T.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false }))));
        m.frustumCulled = false; m.renderOrder = 4; G.fxRoot.add(m); f.trail = { m, pts: [], n: 0 };
      }
      const tr = f.trail;
      if (on) { tipA.set(0, 0, f.item.userData.tip); f.item.localToWorld(tipA); tipB.set(0, 0, f.item.userData.tip * 0.42); f.item.localToWorld(tipB); tr.pts.unshift([tipA.x, tipA.y, tipA.z, tipB.x, tipB.y, tipB.z, 1]); if (tr.pts.length > TRAIL_N) tr.pts.pop(); }
      const P = tr.m.geometry.attributes.position, Cc = tr.m.geometry.attributes.color; let live = 0;
      for (let i = 0; i < TRAIL_N; i++) {
        const p = tr.pts[Math.min(i, tr.pts.length - 1)];
        if (!p) { P.setXYZ(i * 2, 0, -9, 0); P.setXYZ(i * 2 + 1, 0, -9, 0); continue; }
        if (i < tr.pts.length) { p[6] -= dt * 4.5; if (p[6] > 0) live++; }
        const k = Math.max(0, p[6]) * (1 - i / TRAIL_N) * 0.55;
        P.setXYZ(i * 2, p[0], p[1], p[2]); P.setXYZ(i * 2 + 1, p[3], p[4], p[5]); Cc.setXYZ(i * 2, k, k * 0.92, k * 0.7); Cc.setXYZ(i * 2 + 1, k * 0.25, k * 0.22, k * 0.16);
      }
      if (!live && !on) tr.pts.length = 0;
      tr.n = tr.pts.length; tr.m.visible = tr.n > 1; P.needsUpdate = true; Cc.needsUpdate = true;
    }
    f.dispose = function () { if (f.trail) { G.fxRoot.remove(f.trail.m); f.trail.m.geometry.dispose(); f.trail = null; } if (f.root.parent) f.root.parent.remove(f.root); G.dispose(f.root); };
    apply();
    return f;
  };

  // The look of the player now, and of anyone else by id (the epic's people; unknown ids are plain townsfolk).
  G.lookOf = function (id, S) {
    S = S || K.S;
    if (id === "me") return K.puppetSpec(S);
    if (id === "vasu") return { pronoun: "he", palette: ["#b8743f", "#3f6b3a", "#e2b55a"], stage: S && S.age >= 40 ? "youth" : "child", item: S && S.age >= 40 ? "sword" : null };
    if (id === "ugra") return Object.assign({}, K.PUPPETS.ugra, { stage: S && S.age >= 20 ? "adult" : "youth", item: null });
    if (K.PUPPETS[id]) return K.UI.puppetFor(id, S);
    return EXTRAS[id] || null;
  };
  // People the story names who have no look of their own in the 2D game, and the ordinary folk of every scene.
  const EXTRAS = {
    // (Draupadi: "her complexion was dark, and her locks were blue and curly"; Gandhari bandaged her own eyes; the king is blind.)
    draupadi: { pronoun: "she", palette: ["#6e4226", "#b2432a", "#e2b55a"], stage: "adult", headgear: "mukuta", hair: "long", hairCol: "#16182e", size: 1.02 },
    sairindhri: { pronoun: "she", palette: ["#6e4226", "#2a2422", "#6a5a48"], stage: "adult", hairCol: "#16182e", size: 1.02 }, // in Virata's house: "a single piece of a black and dirty though costly cloth", the braid hidden
    kunti: { pronoun: "she", palette: ["#c08a5a", "#efe6cc", "#b49054"], stage: "elder" },
    gandhari: { pronoun: "she", palette: ["#c48450", "#4f6178", "#d6c6a2"], stage: "elder", gear: ["blindfold"] },
    dhritarashtra: { pronoun: "he", palette: ["#b8703b", "#5e2430", "#e2b55a"], stage: "elder", headgear: "crown", crown: { gem: "#b2432a", tall: 1.1 }, beard: true, size: 1.1, blind: true },
    // Arjuna in the year of hiding: "decked in the ornaments of women, and wearing large ear-rings and beautiful
    // conch-bracelets overlaid with gold", "a braid to hang down from my head". Bhima at the bride-choice, as a brahmin.
    brihannala: { pronoun: "she", palette: ["#7a4a2a", "#b2432a", "#e2b55a"], stage: "adult", hair: "braid", gear: ["earrings", "bangles"], item: "bow", size: 1.14 },
    bhima_brahmin: { pronoun: "he", palette: ["#a8622f", "#efe6cf", "#c9a24e"], stage: "adult", headgear: "jata", hair: "matted", gear: ["thread", "deerskin"], item: "club", big: true, size: 1.25 },
    bhurishravas: { pronoun: "he", palette: ["#b8703b", "#7a1f2a", "#e2b55a"], stage: "adult", headgear: "crown", crown: { gem: "#2f7d55", tall: 0.9 }, gear: ["cuirass"], item: "sword", size: 1.1 },
    kritavarma: { pronoun: "he", palette: ["#9a5a30", "#2c4c86", "#e2b55a"], stage: "adult", headgear: "crown", crown: { gem: "#2c4c86", tall: 0.85 }, gear: ["cuirass"], item: "bow", size: 1.08 },
    vrishasena: { pronoun: "he", palette: ["#c9813f", "#b2432a", "#f3d27a"], stage: "youth", headgear: "mukuta", gear: ["cuirass"], item: "bow" },
    iravan: { pronoun: "he", palette: ["#7a5a3a", "#2a4a3a", "#c9d27a"], stage: "youth", headgear: "mukuta", item: "sword" },
    yudhamanyu: { pronoun: "he", palette: ["#c98a52", "#2d5aa0", "#e2b55a"], stage: "adult", headgear: "mukuta", gear: ["cuirass"], item: "bow" },
    uttamaujas: { pronoun: "he", palette: ["#c98a52", "#2d5aa0", "#e2b55a"], stage: "adult", headgear: "mukuta", gear: ["cuirass"], item: "sword" },
    // The foot soldier of the line: bare to the waist under crossed bands of cloth, a thick coiled turban tied under the chin.
    footman: { pronoun: "he", palette: ["#9e6a40", "#6e3026", "#b39255"], headgear: "turban", chin: true, gear: ["bands"], item: "spear", stage: "adult" },
    virata: { pronoun: "he", palette: ["#c47d45", "#2f7d55", "#d9c27a"], stage: "elder", headgear: "crown", crown: { gem: "#2f7d55", tall: 0.9 }, beard: true },
    uttara: { pronoun: "he", palette: ["#c47d45", "#2f7d55", "#d9c27a"], stage: "youth", headgear: "mukuta", item: "bow" },
    vikarna: { pronoun: "he", palette: ["#b8703b", "#7a1f2a", "#e2b55a"], stage: "adult", headgear: "mukuta", item: "sword" },
    madhavi: { pronoun: "she", palette: ["#b47a4a", "#3f6b5a", "#e2b55a"], stage: "adult" },
    revat: { pronoun: "he", palette: ["#b06c3c", "#7a5232", "#d8b77a"], stage: "adult", headgear: "band", item: "whip" },
    bhadra: { pronoun: "he", palette: ["#9e6a40", "#6e3026", "#b39255"], stage: "elder", headgear: "helmet", gear: ["cuirass"], item: "spear", beard: true },
    sudatta: { pronoun: "he", palette: ["#c9905a", "#d79a2b", "#8a3a2a"], stage: "elder", headgear: "turban", hat: "#d79a2b", big: true },
    haridatta: { pronoun: "he", palette: ["#b47a48", "#d9c9a6", "#a3302a"], stage: "elder", headgear: "turban", hat: "#a3302a", beard: true },
    sage: { pronoun: "he", palette: ["#b88352", "#d98a3a", "#8a6a3a"], stage: "elder", headgear: "jata", beard: "long", item: "staff" },
    mother: { pronoun: "she", palette: ["#b9743f", "#8a2f3a", "#e2b55a"], stage: "adult" },
    father: { pronoun: "he", palette: ["#b9743f", "#6f3a24", "#e2b55a"], stage: "adult", headgear: "band" },
    grandmother: { pronoun: "she", palette: ["#b9743f", "#b9a27c", "#9a8a6a"], stage: "elder" },
    townsman: { pronoun: "he", palette: ["#b0703f", "#8a5a3a", "#c9a066"], stage: "adult", headgear: "band" },
    townswoman: { pronoun: "she", palette: ["#b47a4a", "#a34a5a", "#d9c27a"], stage: "adult" },
    child: { pronoun: "he", palette: ["#b9743f", "#b2432a", "#e2b55a"], stage: "child" },
    girl: { pronoun: "she", palette: ["#b9743f", "#2f7d55", "#e2b55a"], stage: "child" },
    bandit: { pronoun: "he", palette: ["#9c6a42", "#6b5a3a", "#a8875a"], headgear: "scarf", hat: "#7a4a2a", item: "club", stage: "adult", size: 0.95 },
    archer: { pronoun: "he", palette: ["#9e6a40", "#5d3b2a", "#9f8250"], headgear: "capfeather", hat: "#5d3b2a", gear: ["bracer"], item: "bow", stage: "adult" },
    rider: { pronoun: "he", palette: ["#a8703f", "#6e3026", "#c9a24e"], headgear: "crest", hat: "#a3302a", gear: ["cuirass"], item: "sword", stage: "adult", size: 1.04 },
    champion: { pronoun: "he", palette: ["#b8703b", "#7a1f2a", "#e2b55a"], headgear: "crest", hat: "#e2b55a", gear: ["scale"], item: "mace", stage: "adult", size: 1.1, big: true },
    gandharva: { pronoun: "he", palette: ["#9fb07a", "#2f5a3a", "#d9c27a"], headgear: "feather", item: "spear", stage: "adult" },
    rakshasa: { pronoun: "he", palette: ["#5a4a4a", "#2a1a1a", "#b2432a"], headgear: "band", item: "club", stage: "adult", big: true, size: 1.12 },
    naga: { pronoun: "he", palette: ["#6a8a6a", "#2a4a3a", "#c9d27a"], headgear: "band", item: "spear", stage: "adult" },
    common: { pronoun: "he", palette: ["#9c6a42", "#6b5a3a", "#a8875a"], item: "staff", stage: "adult" },
    dancer: { pronoun: "she", palette: ["#c08a5a", "#b2432a", "#e2b55a"], stage: "adult", headgear: "mukuta" },
    king: { pronoun: "he", palette: ["#b8703b", "#5a2a6a", "#e2b55a"], stage: "adult", headgear: "crown", crown: { gem: "#8a5aa0" }, beard: true },
    priest: { pronoun: "he", palette: ["#c9905a", "#efe6cf", "#c9a24e"], stage: "elder", headgear: "jata", beard: true },
    yaksha: { pronoun: "he", palette: ["#7aa0b0", "#2a4a5a", "#d9e27a"], stage: "adult", headgear: "crown", crown: { gem: "#7ad0e0", white: true }, size: 1.3 }
  };
  G.EXTRAS = EXTRAS;
})(window.K = window.K || {});
