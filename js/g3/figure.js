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
  const CREAM = 0xeee3c6, GOLD = 0xd9a53a, STEEL = 0xc9ccd2, WOOD = 0x6a4628, DARK = 0x1c120c;

  // ---------- Weapons and things held (grip at the origin, the weapon running out along +Z) ----------
  function held(kind, col) {
    const b = B(); b.ao = 0.9; let tip = 0.8;
    const along = (g, z, c, c2) => b.geo(g.rotateX(PI / 2), 0, 0, z, 0, 0, 0, c, c2);
    switch (kind) {
      case "sword": case "woodsword": { // the khadga of the sheets: a broad straight blade swelling toward its point, a gilt guard and pommel, a bound grip
        const wood = kind === "woodsword", blade = wood ? 0x9a7a4a : STEEL;
        b.surf(wood ? "wood" : "rope", 0x3a2414, 0.03); along(new T.CylinderGeometry(0.022, 0.022, 0.2, 6), 0.0, wood ? WOOD : 0x4a3020);
        b.surf(wood ? "wood" : "gold"); b.box(0.2, 0.035, 0.05, 0, -0.017, 0.11, wood ? WOOD : GOLD); if (!wood) { b.sph(0.034, 0, 0, -0.12, GOLD, 1, 6); b.sph(0.022, 0.1, 0, 0.11, 0xf4d67a, 1, 5); b.sph(0.022, -0.1, 0, 0.11, 0xf4d67a, 1, 5); }
        b.surf(wood ? "wood" : "blade", 0x8a9098, 0.075); along(new T.BoxGeometry(0.075, 0.6, 0.018), 0.44, blade, wood ? 0xb09060 : 0xeef0f4); along(new T.BoxGeometry(0.092, 0.24, 0.018), 0.84, blade, wood ? 0xb09060 : 0xeef0f4); along(new T.ConeGeometry(0.048, 0.13, 4), 1.02, blade); b.surf(); tip = 1.05; break;
      }
      case "dagger": b.surf("rope", 0x3a2414, 0.03); along(new T.CylinderGeometry(0.02, 0.02, 0.14, 5), 0, 0x4a3020); b.surf("gold"); b.box(0.12, 0.03, 0.04, 0, -0.015, 0.08, GOLD); b.surf("blade", 0x8a9098, 0.055); along(new T.BoxGeometry(0.055, 0.34, 0.014), 0.27, STEEL, 0xeef0f4); along(new T.ConeGeometry(0.03, 0.1, 4), 0.49, STEEL); b.surf(); tip = 0.52; break;
      case "mace": { // the gada of the sheets: a banded haft, a great flanged head of dark iron bound and capped in gold, tiers and a point above it
        const g1 = col || GOLD, g2 = G.shade(g1, 0.8), IR = 0x4a4a50, IR2 = 0x6a6a72;
        b.surf("rings", g1, 0.2); along(new T.CylinderGeometry(0.027, 0.027, 0.92, 8), 0.36, 0x3a3a40);
        b.surf("gold"); for (let i = 0; i < 4; i++) b.sph(0.046, 0, 0, 0.14 + i * 0.2, i % 2 ? g1 : g2, 1, 8, 1, 0.5);
        b.sph(0.05, 0, 0, -0.11, g1, 1, 8, 1, 0.8); b.sph(0.085, 0, 0, 0.84, g1, 1, 10, 1, 0.5);
        b.surf("iron"); b.sph(0.15, 0, 0, 1.01, IR, 1, 12, 1, 1.05);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; b.sph(0.07, Math.cos(a) * 0.105, Math.sin(a) * 0.105, 1.01, i % 2 ? IR2 : IR, 1, 8, 1, 1.9); }
        b.surf("gold"); b.geo(new T.TorusGeometry(0.168, 0.016, 5, 16), 0, 0, 1.01, 0, 0, 0, g1); b.geo(new T.TorusGeometry(0.12, 0.014, 5, 14), 0, 0, 0.9, 0, 0, 0, g1); b.geo(new T.TorusGeometry(0.12, 0.014, 5, 14), 0, 0, 1.13, 0, 0, 0, g1);
        b.sph(0.105, 0, 0, 1.2, g1, 1, 10, 1, 0.5); b.sph(0.075, 0, 0, 1.27, g2, 1, 8, 1, 0.6); b.sph(0.05, 0, 0, 1.33, g1, 1, 8, 1, 0.7);
        along(new T.ConeGeometry(0.035, 0.12, 8), 1.42, g1); b.surf(); tip = 1.46; break; }
      case "club": b.surf("wood", 0x3a2414, 0.1); along(new T.CylinderGeometry(0.1, 0.03, 1.05, 7), 0.4, 0x6a4a2e, 0x8a6a46); b.surf("iron"); for (let i = 0; i < 3; i++) b.geo(new T.TorusGeometry(0.075 + i * 0.012, 0.012, 4, 10), 0, 0, 0.62 + i * 0.13, 0, 0, 0, 0x55524c); b.surf(); tip = 0.95; break;
      case "hammer": b.surf("wood", 0x3a2414, 0.1); along(new T.CylinderGeometry(0.028, 0.028, 0.75, 6), 0.3, WOOD); b.surf("iron"); b.box(0.14, 0.14, 0.3, 0, -0.07, 0.66, 0x55565c); b.surf(); tip = 0.8; break;
      case "staff": b.surf("wood", 0x3a2414, 0.1); along(new T.CylinderGeometry(0.028, 0.032, 1.9, 6), 0.3, 0x7a5a36); b.surf(); tip = 1.25; break;
      case "spear": b.surf("rings", 0x8a2a20, 0.46); along(new T.CylinderGeometry(0.022, 0.026, 2.3, 6), 0.5, 0x8a6a3e); /* (bamboo, bound in red at its joints) */ b.surf("blade", 0x8a9098, 0.06); along(new T.ConeGeometry(0.058, 0.34, 4), 1.82, STEEL); b.surf("gold"); along(new T.CylinderGeometry(0.04, 0.034, 0.07, 6), 1.63, GOLD); b.sph(0.03, 0, 0, -0.66, GOLD, 1, 5); b.surf("silk"); b.box(0.02, 0.1, 0.16, 0, -0.05, 1.5, 0xc8402c); b.surf(); tip = 1.95; break;
      case "whip": b.surf("rope", 0x3a2414, 0.03); along(new T.CylinderGeometry(0.018, 0.022, 0.7, 5), 0.3, WOOD); b.surf(); b.rod(0, 0, 0.65, 0, -0.5, 1.0, 0.008, 0x3a2414, 3); tip = 0.7; break;
      case "scroll": along(new T.CylinderGeometry(0.04, 0.04, 0.34, 6), 0.05, 0xe8dcc0); tip = 0.2; break;
      case "bowl": b.geo(new T.SphereGeometry(0.11, 8, 4, 0, PI * 2, PI / 2, PI / 2), 0, 0.06, 0.08, 0, 0, 0, 0xb5793a); tip = 0.2; break;
      case "lute": b.sph(0.14, 0, 0, 0.1, 0x8a5a2c, 0.6); along(new T.CylinderGeometry(0.02, 0.025, 0.7, 5), 0.5, WOOD); tip = 0.8; break;
      case "flute": b.surf("rings", 0x6a4a1e, 0.1); along(new T.CylinderGeometry(0.014, 0.014, 0.5, 6), 0.1, 0xc9a24e); b.surf(); tip = 0.35; break;
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
    b.surf("rings", 0xa3302a, 0.2); b.geo(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 18, 0.022, 6), 0, 0, 0, 0, 0, 0, col || 0x8a5a2c, 0xc9a24e); // the limbs: horn and wood, bound with red lac at every span
    b.surf("gold"); b.cyl(0.027, 0.027, 0.14, 0, -0.22, -0.07, GOLD, 6, 0, PI / 2); /* (the bound grip, on the middle of the stave) */ for (const e of [pts[0], pts[10]]) b.sph(0.03, e.x, e.y, e.z, 0xf4d67a, 1, 5); b.surf();
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
      b.surf("rings", col || 0x7a3a2a, 0.15); b.geo(new T.SphereGeometry(0.4, 14, 5, 0, PI * 2, 0, PI / 2.7).rotateZ(-PI / 2).scale(0.36, 1, 1), 0.05, 0, 0, 0, 0, 0, hide, G.shade(hide, 1.25)); b.surf("leather"); // (painted in rings of his host's colour)
      b.geo(new T.CircleGeometry(0.365, 12).rotateY(-PI / 2), 0.105, 0, 0, 0, 0, 0, G.shade(hide, 0.55));
      b.torus(0.355, 0.02, 0.11, 0, 0, G.shade(hide, 0.6), 0, PI / 2, 0, 14); b.surf("iron"); b.sph(0.075, 0.19, 0, 0, 0x8a8880, 1, 7); for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; b.sph(0.018, 0.115, Math.sin(a) * 0.33, Math.cos(a) * 0.33, 0x8a8880, 1, 4); } b.surf();
      return b.mesh();
    }
    b.surf("rings", trim || GOLD, 0.2); b.geo(new T.SphereGeometry(0.42, 16, 6, 0, PI * 2, 0, PI / 2.6).rotateZ(-PI / 2).scale(0.42, 1, 1), 0.05, 0, 0, 0, 0, 0, col || 0x7a3a2a, G.shade(col || 0x7a3a2a, 1.3)); b.surf("leather"); // (a painted face, ringed in gold)
    b.geo(new T.CircleGeometry(0.385, 14).rotateY(-PI / 2), 0.11, 0, 0, 0, 0, 0, G.shade(col || 0x7a3a2a, 0.6));
    b.surf("gold"); b.torus(0.37, 0.025, 0.115, 0, 0, trim || GOLD, 0, PI / 2, 0, 16); b.sph(0.08, 0.2, 0, 0, trim || GOLD);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; b.sph(0.022, 0.16, Math.sin(a) * 0.24, Math.cos(a) * 0.24, trim || GOLD, 1, 5); } // studs
    b.surf(); return b.mesh();
  }
  G.held = held; G.bow = bow;
  // An arrow lying along +Z, its head at the origin's far end (used by fights and tests).
  G.arrowMesh = function (len) {
    len = len || 0.85; const b = B(); b.ao = 1;
    b.surf("rings", 0x8a2a20, 0.28); b.geo(new T.CylinderGeometry(0.012, 0.012, len, 4).rotateX(PI / 2), 0, 0, 0, 0, 0, 0, 0xe6c98c);   // a reed shaft, bound in red below the head and at the nock
    b.surf("blade", 0x8a9098, 0.03); b.geo(new T.ConeGeometry(0.03, 0.1, 4).rotateX(PI / 2), 0, 0, len / 2 + 0.04, 0, 0, 0, 0xdcd7c8);
    b.surf("hair"); b.box(0.07, 0.005, 0.14, 0, 0, -len / 2 + 0.06, 0xc8402c); b.box(0.005, 0.07, 0.14, 0, -0.035, -len / 2 + 0.06, 0xc8402c); b.surf();
    const m = b.mesh(G.mat.vcDouble, true); m.geometry.userData.keep = false; return m;
  };

  // ---------- Poses (degrees). Keys: P hips, T torso, H head, aL/aR shoulders, eL/eR elbows, wL/wR hands, lL/lR thighs,
  // kL/kR knees, y hips' height. A number is a turn about X; a list is [x, y, z]. The character's right is -X. ----------
  const REST = { P: [0, 0, 0], T: [0, 0, 0], H: [0, 0, 0], aL: [0, 0, 7], aR: [0, 0, -7], eL: -10, eR: -10, wL: [0, 0, 0], wR: [0, 0, 0], lL: [0, 0, 0], lR: [0, 0, 0], kL: 0, kR: 0, y: 0 };
  const POSES = {
    stand: {},
    // On guard: the left foot leads (the shield side), knees bent, weight a little back, the weapon hand by the hip with the blade up and forward.
    ready: { P: [0, -24, 0], T: [8, 10, 0], H: [0, 14, 0], lL: [-26, 0, 6], kL: 30, lR: [18, 0, -8], kR: 34, y: -0.1, aR: [-30, 0, -20], eR: -86, wR: [26, 0, 0], aL: [-42, 0, 10], eL: -62 },
    // (The wrist is cocked so the head stands up over the shoulder, not lying back behind it.)
    // The mace at rest: its head up over the right shoulder, the left hand ready to join the right on the haft.
    readyMace: { P: [0, -22, 0], T: [6, 8, 0], H: [0, 14, 0], lL: [-24, 0, 8], kL: 30, lR: [18, 0, -10], kR: 34, y: -0.11, aR: [-56, 0, -14], eR: -100, wR: [38, 0, 0], aL: [-46, 0, -16], eL: -84 },
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
      coil: W(BACK, { P: [0, -12, 0], T: [-12, -6, 0], H: [6, 12, 0], aR: [-166, 0, 12], eR: -30, wR: [50, 0, 0], aL: [-166, 0, -12], eL: -32, y: -0.03, z: -0.07 }), // (arms up and nearly straight, the weapon high and tipped back: not folded down behind the neck)
      hit: W(LUNGE, { P: [0, 6, 0], T: [32, 6, 0], H: [-14, -6, 0], aR: [-60, 0, 12], eR: -8, wR: [52, 0, 0], aL: [-60, 0, -12], eL: -10, kL: 60, y: -0.18, z: 0.22 }),
      follow: W(LUNGE, { P: [0, 8, 0], T: [40, 8, 0], H: [-18, -8, 0], aR: [-40, 0, 10], eR: -10, wR: [66, 0, 0], aL: [-40, 0, -10], eL: -12, kL: 64, y: -0.21, z: 0.23 }) },
    // A spear thrust: the point goes first, the body follows, the lead foot lands last.
    thrust: { land: 0.5, strike: 0.13,
      coil: W(BACK, { P: [0, -36, 0], T: [4, -22, 0], H: [0, 44, 0], aR: [30, 0, -18], eR: -104, wR: [76, 0, 0], aL: [-54, 0, 4], eL: -32 }),
      hit: W(LUNGE, { P: [0, 12, 0], T: [18, 24, 0], H: [-6, -28, 0], aR: [-80, 0, 6], eR: -4, wR: [84, 0, 0], aL: [-72, 0, -6], eL: -28, kL: 62, y: -0.16, z: 0.27 }),
      follow: W(LUNGE, { P: [0, 8, 0], T: [16, 18, 0], H: [-6, -22, 0], aR: [-62, 0, 2], eR: -34, wR: [86, 0, 0], aL: [-64, 0, -2], eL: -36, kL: 56, y: -0.15, z: 0.22 }) },
    // The mace raised high over the head, tipped a little back, both hands on the haft; then down, the knees sinking under it.
    // (It used to hang down behind the back with the elbows folded shut, which no arm with a mace in it does.)
    smash: { land: 0.56, strike: 0.15,
      coil: W(BACK, { P: [0, -14, 0], T: [-12, -10, 0], H: [8, 16, 0], aR: [-165, 0, 8], eR: -28, wR: [58, 0, 0], aL: [-163, 0, -14], eL: -30, y: 0.0, z: -0.08 }),
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
  // ---------- The head ----------
  // One shaped surface from chin to crown (it was a ball for the skull and a ball for the jaw, and where the two met the
  // face looked torn). Its shape is the person's: FACES gives the width of jaw, chin and cheek, how long the lower face is,
  // how the brows sit and how strong the nose is. Hair, stubble and a short beard are the colour of that surface where
  // they grow, so a hairline or a jawline is an edge on the skin and not two shapes fighting.
  const FACES = {
    oval: { jaw: 1.0, chin: 1.0, cheek: 1.0, long: 1.0, brow: 0.05, nose: 1.0 },
    square: { jaw: 1.2, chin: 1.45, cheek: 1.03, long: 0.97, brow: 0.12, nose: 1.05 },
    long: { jaw: 0.93, chin: 0.95, cheek: 0.94, long: 1.16, brow: 0.03, nose: 1.1 },
    round: { jaw: 1.12, chin: 1.25, cheek: 1.09, long: 0.9, brow: 0.0, nose: 0.88 },
    heart: { jaw: 0.84, chin: 0.72, cheek: 1.04, long: 1.0, brow: 0.0, nose: 0.86 },
    broad: { jaw: 1.26, chin: 1.55, cheek: 1.11, long: 0.94, brow: 0.15, nose: 1.18 },
    gaunt: { jaw: 0.88, chin: 0.85, cheek: 0.95, long: 1.12, brow: 0.08, nose: 1.15, hollow: 0.9 },
    hawk: { jaw: 0.86, chin: 0.7, cheek: 0.93, long: 1.1, brow: 0.15, nose: 1.3, hook: 1 }
  };
  const FACE_ANY = ["oval", "square", "long", "round", "oval", "broad"];
  G.FACES = FACES;
  function faceOf(sp, she) {
    if (sp.face && FACES[sp.face]) return FACES[sp.face];
    if (she) return sp.stage === "elder" ? FACES.oval : FACES.heart;
    if (sp.stage === "child" || sp.stage === "youth") return FACES.round;
    if (sp.big) return FACES.broad; if (sp.strong) return FACES.square; if (sp.slim) return FACES.long;
    return FACES[FACE_ANY[G.hash(String(sp.palette) + (sp.headgear || "") + (sp.item || "")) % FACE_ANY.length]];
  }
  function headMesh(sp, skin, hair, cloth, trim, she) {
    const b = B(); b.ao = 0.9;
    const F = faceOf(sp, she), kid = sp.stage === "child" || sp.stage === "youth", gearH = sp.gear || [], EYE = 0.212;
    const Y = (y) => (y < EYE ? EYE + (y - EYE) * F.long : y); // the lower face is longer or shorter by the person
    // Rings from under the chin to the crown: height, half-width, depth to the front, depth to the back.
    const hol = F.hollow || 1, RINGS = [[0.064, 0.026 * F.chin, 0.084, 0.02], [0.077, 0.044 * F.chin, 0.103, 0.04], [0.099, 0.066 * (F.jaw * 0.6 + F.chin * 0.4), 0.115, 0.062], [0.125, 0.085 * F.jaw * hol, 0.12, 0.082],
      [0.152, 0.098 * (F.jaw * 0.5 + F.cheek * 0.5) * hol, 0.122, 0.102], [0.18, 0.109 * F.cheek, 0.1235, 0.116], [EYE, 0.112 * (0.5 + F.cheek * 0.5), 0.123, 0.124], [0.245, 0.111, 0.121, 0.126],
      [0.275, 0.106, 0.114, 0.122], [0.303, 0.092, 0.098, 0.108], [0.325, 0.068, 0.072, 0.082], [0.34, 0.036, 0.038, 0.044]];
    const ringAt = (y0) => { for (let k = 0; k < RINGS.length - 1; k++) if (y0 <= RINGS[k + 1][0]) { const a = RINGS[k], c = RINGS[k + 1], u = Math.max(0, (y0 - a[0]) / (c[0] - a[0])); return [y0, a[1] + (c[1] - a[1]) * u, a[2] + (c[2] - a[2]) * u, a[3] + (c[3] - a[3]) * u]; } return RINGS[RINGS.length - 1]; };
    const front = (x, y0, lift) => { const r = ringAt(y0), q = Math.max(-0.96, Math.min(0.96, x / r[1])); return r[2] * Math.sqrt(1 - q * q) + (lift || 0); }; // where the face's surface is, in front, at (x, height)
    const fh = sp.beard === true ? "full" : sp.beard || sp.whiskers || (!she && (sp.stage === "adult" || sp.stage === "elder" || !sp.stage) ? "stache" : "clean");
    const beardCol = fh === "long" ? 0xf0ece2 : hair, shade = new T.Color(skin).lerp(new T.Color(DARK), 0.4).getHex(), bearded = /^(full|short|long|forked)$/.test(fh), rough = fh === "stubble" || fh === "heavy";
    const hairline = sp.stage === "elder" && !she ? 0.3 : 0.287, covered = /^(turban|helmet|crest|scarf|capfeather)$/.test(sp.headgear || "");
    // What grows where. a is the angle round the head from the front (0) to the back (PI).
    const growth = (y0, a) => { const f = Math.abs(a > PI ? a - PI * 2 : a);
      if (y0 > (f < 0.95 ? hairline : f < 1.75 ? 0.222 - (f - 0.95) * 0.03 : 0.105)) return "hair";
      if ((bearded || rough) && f < 1.8 && y0 < (f < 0.5 ? 0.112 : f < 1.2 ? 0.146 : 0.19 - (1.8 - f) * 0.06)) return "beard";
      if (fh === "goatee" && f < 0.42 && y0 < 0.106) return "beard";
      return "skin"; };
    const SEG = LITE ? 12 : 26, pos = [], col = [], idx = [], c0 = new T.Color();
    const surface = (rings, puff, colour, keep) => { // a closed-over skin of rings; puff lifts it off the head; keep leaves quads out
      const base = pos.length / 3, n = rings.length;
      rings.forEach((r) => { for (let k = 0; k < SEG; k++) { const a = (k / SEG) * PI * 2, sn = Math.sin(a), cs = Math.cos(a), g = growth(r[0], a), pf = typeof puff === "function" ? puff(g, r[0], a) : puff;
        pos.push((r[1] + pf) * sn, Y(r[0]), (cs >= 0 ? r[2] + pf : r[3] + pf) * cs); c0.set(colour(g, r[0], a)); col.push(c0.r, c0.g, c0.b); } });
      for (let r = 0; r < n - 1; r++) for (let k = 0; k < SEG; k++) { const k2 = (k + 1) % SEG, a = ((k + 0.5) / SEG) * PI * 2, ym = (rings[r][0] + rings[r + 1][0]) / 2; if (keep && !keep(ym, a)) continue; const p0 = base + r * SEG + k, p1 = base + (r + 1) * SEG + k, p2 = base + (r + 1) * SEG + k2, p3 = base + r * SEG + k2; idx.push(p0, p2, p1, p0, p3, p2); }
      return base; };
    const cap = (base, n, y0, colr) => { const c = pos.length / 3; pos.push(0, Y(y0), 0); c0.set(colr); col.push(c0.r, c0.g, c0.b); for (let k = 0; k < SEG; k++) { const k2 = (k + 1) % SEG; idx.push(c, base + (n - 1) * SEG + k2, base + (n - 1) * SEG + k); } };
    { const base = surface(RINGS, (g) => (g === "hair" ? 0.007 : g === "beard" && bearded ? (fh === "short" ? 0.005 : 0.012) : 0), (g) => (g === "hair" ? hair : g === "beard" ? (rough ? shade : beardCol) : skin));
      cap(base, RINGS.length, 0.347, covered ? hair : hair);
      const c = pos.length / 3; pos.push(0, Y(0.058), 0.03); c0.set(bearded ? beardCol : rough ? shade : skin); col.push(c0.r, c0.g, c0.b); for (let k = 0; k < SEG; k++) { const k2 = (k + 1) % SEG; idx.push(c, base + k, base + k2); } } // under the chin
    // Cloth on the head made the same way, so it lies on the head: Gandhari's bandage over her eyes, an elder woman's cloth drawn over her hair.
    if (gearH.includes("blindfold")) surface([ringAt(0.19), ringAt(0.2), ringAt(0.224), ringAt(0.236)], (g, y0) => (y0 < 0.195 || y0 > 0.23 ? 0.004 : 0.011), () => 0xf2ece0);
    if (she && sp.stage === "elder") { const vr = [ringAt(0.1), ringAt(0.14), ringAt(0.18), ringAt(EYE), ringAt(0.245), ringAt(0.272), ringAt(0.303), ringAt(0.325), ringAt(0.34)], vb = surface(vr, 0.014, (g, y0) => (y0 < 0.11 ? trim : cloth), (ym, a) => { const f = Math.abs(a > PI ? a - PI * 2 : a); return !(f < 1.25 && ym < 0.268); }); cap(vb, vr.length, 0.362, cloth); }
    // Beards with length are their own shapes, hung from the chin: a full beard's mass, an elder's to the chest, a forked one, a tuft.
    const hang = (x, len, w, d, colr, lean) => { const rows = 6, base = pos.length / 3, top = Y(0.082); for (let r = 0; r <= rows; r++) { const u = r / rows, tw = w * (1 - u * 0.55 - u * u * 0.4), td = d * (1 - u * 0.5 - u * u * 0.42); for (let k = 0; k < SEG; k++) { const a = (k / SEG) * PI * 2; pos.push(x + Math.sin(a) * tw, top - len * u, 0.062 + u * (lean || 0) + Math.cos(a) * td); c0.set(colr); col.push(c0.r, c0.g, c0.b); } }
      for (let r = 0; r < rows; r++) for (let k = 0; k < SEG; k++) { const k2 = (k + 1) % SEG, p0 = base + r * SEG + k, p1 = base + (r + 1) * SEG + k, p2 = base + (r + 1) * SEG + k2, p3 = base + r * SEG + k2; idx.push(p0, p1, p2, p0, p2, p3); } };
    if (fh === "full") hang(0, 0.085, 0.07 * F.jaw, 0.056, beardCol, 0.004);
    else if (fh === "long") hang(0, 0.27, 0.068 * F.jaw, 0.05, beardCol, 0.03);
    else if (fh === "forked") { for (const sx of [-1, 1]) hang(sx * 0.03, 0.17, 0.034, 0.03, beardCol, 0.02); }
    else if (fh === "goatee") hang(0, 0.058, 0.026, 0.024, beardCol, 0.012);
    const hg0 = new T.BufferGeometry(); hg0.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); hg0.setAttribute("color", new T.Float32BufferAttribute(col, 3)); hg0.setIndex(idx); hg0.computeVertexNormals();
    // ---- the features, set on that surface ----
    const ex = 0.046 * (0.6 + F.cheek * 0.4), ez = front(ex, EYE) - 0.0125, lidCol = G.shade(skin, 0.88);
    for (const sx of [-1, 1]) {
      const ry = sx * 0.36, cz = Math.cos(ry), sn = Math.sin(ry), fwd = (d) => [sx * ex + sn * d, ez + cz * d]; // each eye is turned a little outward, to lie on the curve of the face
      b.geo(new T.SphereGeometry(0.0215, 10, 7).scale(1.12, 0.6, 0.6), sx * ex, EYE, ez, 0, ry, 0, 0xf6f0e4);                       // the white of the eye, long rather than round
      if (!sp.blind) { const i1 = fwd(0.0062), i2 = fwd(0.0118), i3 = fwd(0.0165); b.sph(0.0115, i1[0], EYE - 0.0005, i1[1], 0x3a2412, 1, 9); b.sph(0.0064, i2[0], EYE - 0.0005, i2[1], 0x0c0806, 1, 7); b.sph(0.0028, i3[0] + 0.004, EYE + 0.004, i3[1], 0xffffff, 1, 5); } // iris, pupil, a point of light (a blind king's eyes are shown without)
      b.geo(new T.SphereGeometry(0.0226, 10, 5, 0, PI * 2, 0, PI * 0.36).scale(1.14, 0.62, 0.66), sx * ex, EYE, ez, 0.12, ry, 0, lidCol); // the upper lid: the top third only
      { const l = fwd(0.0075); b.geo(new T.SphereGeometry(0.0232, 9, 4).scale(1.14, 0.075, 0.34), l[0], EYE + 0.0088, l[1], 0.1, ry, sx * 0.07, 0x1a100a); } // the lash line, lifting a little at the outer corner
      const bt = sp.stage === "elder" ? 0.8 : F.brow > 0.1 ? 1.25 : she ? 0.75 : 1; // brows: level on a calm face, drawn down toward the nose on a stern one
      b.geo(new T.SphereGeometry(0.029, 9, 5).scale(1.05, 0.2 * bt, 0.36), sx * (ex + 0.002), 0.2445 - F.brow * 0.03, front(ex, 0.2445) - 0.006, 0.1, 0, sx * F.brow, sp.stage === "elder" ? hair : DARK);
      const er = ringAt(0.2)[1];
      if (sp.ears === "pointed") b.geo(new T.ConeGeometry(0.02, 0.085, 5), sx * (er + 0.012), 0.222, -0.004, 0, 0, sx * -0.45, skin); // (a rakshasa's)
      b.geo(new T.SphereGeometry(0.03, 9, 7).scale(0.4, 1.15, 0.78), sx * (er + 0.004), 0.198, -0.004, 0, sx * 0.3, 0, skin); // the ear
    }
    { const n = F.nose, ny = Y(0.166), nz = front(0, 0.166), sk2 = G.shade(skin, 0.95); // the nose: a bridge down from the brow, a tip, and its wings
      b.geo(new T.SphereGeometry(0.016, 8, 6).scale(0.72 * n, 2.0, 0.9 * n), 0, (ny + 0.235) / 2, front(0, 0.2) - 0.004 + (F.hook ? 0.004 : 0), -0.2, 0, 0, sk2);
      b.sph(0.0185 * n, 0, ny - (F.hook ? 0.006 : 0), nz + 0.008 * n, G.shade(skin, 0.93), 0.82, 9, 1.12, 0.95);
      for (const sx of [-1, 1]) b.sph(0.0105 * n, sx * 0.0145 * n, ny - 0.004, nz + 0.0005, G.shade(skin, 0.9), 0.8, 7, 1, 0.9); }
    { const my = Y(0.1265), mz = front(0, 0.1265), mw = she ? 0.9 : 1; // the mouth: an upper lip and a fuller lower one
      if (fh !== "long") { b.sph(0.028 * mw, 0, my + 0.0045, mz - 0.001, 0x8a3526, 0.2, 9, 1, 0.42); b.sph(0.024 * mw, 0, my - 0.0035, mz - 0.0015, she ? 0xa84232 : 0x9a4a36, 0.24, 9, 1, 0.46); } }
    if (sp.eye) b.box(0.06, 0.04, 0.02, 0.046, 0.2, 0.118, 0x140c08);
    // Ear-rings on a grown man; hair standing stiff.
    if (!sp.hair && !she && sp.stage !== "child" && !/^(turban|helmet)$/.test(sp.headgear || "") && !gearH.includes("earrings")) for (const sx of [-1, 1]) b.sph(0.02, sx * (ringAt(0.15)[1] + 0.028), Y(0.152), 0.002, GOLD, 1, 6);
    if (sp.hair === "braid") b.sph(0.07, 0, 0.2, -0.125, hair, 1, 8);
    if (sp.hair === "up") { for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; b.geo(new T.ConeGeometry(0.035, 0.2, 4), Math.sin(a) * 0.06, 0.4, Math.cos(a) * 0.06 - 0.02, Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35, hair); } b.geo(new T.ConeGeometry(0.04, 0.24, 4), 0, 0.44, -0.02, 0, 0, 0, hair); }
    // A moustache: thin, full, or heavy and drooping past the corners of the mouth.
    const sy = Y(0.1425), sz = front(0, 0.1425) + 0.0015;
    const stache = (k, colr, droop) => { for (const sx of [-1, 1]) { b.geo(new T.SphereGeometry(0.025 * k, 8, 5).scale(1, 0.3, 0.42), sx * 0.0205 * k, sy, sz - 0.002, 0, sx * 0.3, sx * -(0.2 + droop * 0.3), colr); if (droop) b.geo(new T.SphereGeometry(0.013 * k, 6, 4).scale(0.7, 1.5, 0.6), sx * 0.045 * k, sy - 0.016, front(0.045 * k, 0.127) - 0.004, 0, 0, sx * -0.3, colr); } };
    if (fh === "long" || fh === "heavy") stache(1.35, beardCol, 1); else if (fh === "full" || fh === "forked") stache(1.2, beardCol, 1); else if (fh === "goatee") stache(1.1, beardCol, 1);
    else if (fh === "short") stache(1.05, beardCol, 0); else if (fh === "stubble") stache(0.85, G.shade(shade, 0.72), 0); else if (fh === "thin") stache(0.8, beardCol, 0); else if (fh === "stache") stache(1.1, beardCol, LITE ? 0 : 1);
    if (she) { b.sph(0.08, 0, 0.19, -0.125, hair, 1, 9); b.sph(0.0125, 0, 0.258, front(0, 0.258) + 0.002, 0xc0392b, 1, 7, 1, 0.5); for (const sx of [-1, 1]) b.sph(0.022, sx * (ringAt(0.15)[1] + 0.03), Y(0.152), 0.0, GOLD); }
    if (she && sp.stage === "elder") { b.box(0.25, 0.34, 0.04, 0, -0.16, -0.15, cloth); b.box(0.25, 0.03, 0.045, 0, -0.17, -0.15, trim); } // the end of her head-cloth, down her back
    const hg = sp.headgear, top = 0.33;
    if (hg === "crown" || hg === "kirita" || hg === "mukuta") {
      const cr = sp.crown || {}, tall = (hg === "mukuta" ? 0.5 : 0.62) * (cr.tall || 1), gcol = cr.white ? 0xe8e8ee : GOLD, r = cr.broad ? 0.142 : 0.131;
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
    else if (hg === "helmet" || hg === "crest") { const hc = hg === "crest" ? 0xa8843e : 0x8f7646, hd = G.shade(hc, 0.72); b.dome(0.142, 0, 0.215, -0.005, hc, 1.05, LITE ? 9 : 16); b.cyl(0.147, 0.147, 0.03, 0, 0.215, -0.005, GOLD, LITE ? 9 : 16); // a bronze cap with a gold band at the brow
      b.box(0.022, 0.085, 0.02, 0, 0.165, 0.143, hd); for (const sx of [-1, 1]) { b.geo(new T.BoxGeometry(0.012, 0.11, 0.075), sx * 0.132, 0.165, 0.04, 0, 0, sx * 0.08, hd); b.sph(0.012, sx * 0.142, 0.19, 0.045, GOLD, 1, 5); } // the nose guard and the cheek pieces
      b.geo(new T.CylinderGeometry(0.15, 0.165, 0.09, LITE ? 8 : 12, 1, true, PI * 0.55, PI * 0.9), 0, 0.165, -0.005, 0, 0, 0, hd); // the guard at the neck
      if (hg === "crest") { for (let k = 0; k < 7; k++) b.geo(new T.BoxGeometry(0.035, 0.11 + Math.sin((k / 6) * PI) * 0.05, 0.05), 0, 0.345 + Math.sin((k / 6) * PI) * 0.035, 0.1 - k * 0.04, -0.2 + k * 0.07, 0, 0, sp.hat || 0xa3302a); b.box(0.02, 0.03, 0.27, 0, 0.3, -0.03, GOLD); } else { b.cone(0.03, 0.1, 0, 0.36, 0, GOLD, 6); b.sph(0.022, 0, 0.42, 0, GOLD, 1, 5); } }
    else if (hg === "capfeather") { b.dome(0.14, 0, 0.225, -0.01, sp.hat || 0x5d3b2a, 0.9, 9); b.geo(new T.ConeGeometry(0.028, 0.26, 4), 0.09, 0.4, -0.05, -0.3, 0, -0.3, 0xe8e0d0); }
    else if (hg === "peacock") { b.cyl(0.131, 0.131, 0.035, 0, 0.25, -0.005, GOLD, 10); b.geo(new T.SphereGeometry(0.06, 6, 5).scale(0.5, 2.1, 0.2), 0.03, 0.44, 0.0, 0, 0, -0.18, 0x2f8a6a, 0x3a5ac0); b.sph(0.022, 0.045, 0.5, 0.012, 0x2a3a9a); }
    else if (hg === "feather") { b.cyl(0.131, 0.131, 0.03, 0, 0.25, -0.005, trim, 10); b.geo(new T.ConeGeometry(0.03, 0.28, 4), -0.04, 0.42, -0.08, -0.35, 0, 0.1, 0xc9a066); }
    else if (hg === "scarf") { b.geo(new T.SphereGeometry(0.142, 9, 6, 0, PI * 2, 0, PI * 0.6).scale(1, 1.05, 1.03), 0, 0.2, -0.008, -0.2, 0, 0, sp.hat || 0x7a4a2a); }
    if ((sp.gear || []).includes("earrings")) for (const sx of [-1, 1]) b.sph(0.034, sx * 0.135, 0.15, 0.005, GOLD);
    if ((sp.gear || []).includes("browgem")) b.sph(0.022, 0, 0.262, 0.118, 0x9ad0ff);
    const hgp = new T.Group(), hm = new T.Mesh(hg0, G.mat.vc); hgp.add(hm); hgp.add(b.mesh());
    return hgp;
  }
  function torsoMesh(sp, skin, cloth, trim, she, wide, accent) { // (cloth may be swapped for the host's colour below)
    const b = B(); b.ao = 0.86;
    const gear = sp.gear || [], armour = sp.armour || gear.includes("cuirass") || gear.includes("scale");
    const top = she || sp.stage === "child" && sp.pronoun === "she" ? cloth : skin;
    const chest = armour ? (sp.armour ? 0xe2b040 : gear.includes("scale") ? 0xc9a24e : 0xae8440) : top;
    // (the trunk itself, the shoulders and the upper cloth are in the skin: see G.figure. Here, what is worn on it.)
    if (sp.armour) b.sph(0.07, 0, 0.42, 0.14, 0xfff0a0, 1, 8); // the sun on Karna's breastplate
    else if (armour && !gear.includes("scale")) { b.geo(new T.CylinderGeometry(0.075, 0.075, 0.02, 12).rotateX(PI / 2), 0, 0.41, 0.156, 0, 0, 0, GOLD); b.sph(0.03, 0, 0.41, 0.165, 0xf4d67a, 1, 6); } // a boss on the breastplate
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
    if (gear.includes("bands") && !armour) { for (const sgn of [1, -1]) { b.geo(new T.BoxGeometry(0.07, 0.62, 0.02), 0, 0.3, 0.15, 0, 0, sgn * 0.7, accent); b.geo(new T.BoxGeometry(0.07, 0.62, 0.02), 0, 0.3, -0.15, 0, 0, -sgn * 0.7, accent); } b.geo(new T.CylinderGeometry(0.2 * wide, 0.19 * wide, 0.06, 10, 1).scale(1, 1, 0.66), 0, 0.16, 0, 0, 0, 0, accent); } // cloth bands crossed on the chest and bound at the waist
    if (!armour && !she && sp.stage !== "child" && !gear.includes("deerskin") && !gear.includes("bands") && !gear.includes("bare") && (sp.stage === "elder" || /^(crown|kirita|mukuta)$/.test(sp.headgear || ""))) b.sph(0.03, 0.17 * wide, 0.535, 0.125, GOLD, 1, 8); // the upper cloth is pinned with a gold brooch
    if (!she || true) b.torus(0.105, 0.012, 0, 0.5, 0.045, trim, PI / 2.3, 0, 0, 12); // a necklace
    if (gear.includes("quivers") || sp.item === "bow") { b.geo(new T.CylinderGeometry(0.055, 0.045, 0.5, 6), -0.1, 0.36, -0.2, 0.25, 0, 0.25, 0x6a4628); for (let i = 0; i < 3; i++) b.box(0.012, 0.1, 0.05, -0.17 + i * 0.03, 0.6, -0.24, 0xc8402c); }
    if (gear.includes("waterpot")) b.sph(0.07, 0.2, 0.02, 0.08, 0xb5793a);
    if (gear.includes("conch")) { b.geo(new T.SphereGeometry(0.055, 8, 6).scale(1, 1.25, 0.9), -0.19 * wide, -0.03, 0.1, 0, 0, 0.5, 0xf8f4ea); b.geo(new T.ConeGeometry(0.04, 0.09, 6), -0.19 * wide - 0.045, -0.085, 0.1, 0, 0, 0.5 + PI, 0xf0e8d8); b.sph(0.016, -0.19 * wide + 0.035, 0.03, 0.1, GOLD, 1, 5); } // his conch, hung at the right hip
    if (gear.includes("plough")) { b.rod(-0.16, -0.05, -0.2, 0.2, 0.86, -0.2, 0.022, WOOD, 5); b.rod(0.2, 0.86, -0.2, 0.3, 0.7, -0.2, 0.026, WOOD, 5); b.geo(new T.ConeGeometry(0.035, 0.16, 4), 0.33, 0.63, -0.2, 0, 0, -2.6, STEEL); } // Balarama's plough, slung across his back
    b.geo(new T.CylinderGeometry(0.2 * wide, 0.222 * wide, 0.14, 10, 1).scale(1, 1, 0.76), 0, -0.03, 0, 0, 0, 0, accent, G.shade(accent, 1.15)); // the sash, broad at the waist
    if (sp.stage !== "child") { b.geo(new T.CylinderGeometry(0.055, 0.055, 0.022, 12).rotateX(PI / 2), 0, 0.04, 0.162 * wide + 0.004, 0, 0, 0, GOLD); b.sph(0.022, 0, 0.04, 0.162 * wide + 0.018, 0xf4d67a, 1, 5); } // and its round clasp
    return b.mesh();
  }
  // A surface held by joints. v(): one point, its colour, and the joints that hold it ([[joint, share], ...]; the four
  // largest are kept). tube(): rings of points one under another, joined into a closed skin. sheet(): a grid of points,
  // for cloth. geometry(): the finished thing, smooth-shaded.
  let LITE = false; // (set while a plainer figure is being built: the rank and file, and those far off)
  function Skin() { this.p = []; this.c = []; this.si = []; this.sw = []; this.ix = []; }
  const _sc = new T.Color();
  Skin.prototype.v = function (x, y, z, col, w) {
    const i = this.p.length / 3; this.p.push(x, y, z); _sc.set(col); this.c.push(_sc.r, _sc.g, _sc.b);
    const ws = w.filter((a) => a[1] > 0.002).sort((a, b) => b[1] - a[1]).slice(0, 4); let sum = 0; for (const a of ws) sum += a[1];
    for (let k = 0; k < 4; k++) { this.si.push(ws[k] ? ws[k][0] : 0); this.sw.push(ws[k] ? ws[k][1] / sum : 0); }
    return i;
  };
  Skin.prototype.tube = function (rings, seg, capTop, capBot) {
    const rows = [];
    for (const r of rings) { const row = [];
      for (let k = 0; k < seg; k++) { const a = (k / seg) * PI * 2, px = r.x + Math.sin(a) * r.rx, pz = (r.z || 0) + Math.cos(a) * r.rz; row.push(this.v(px, r.y, pz, typeof r.col === "function" ? r.col(a) : r.col, r.wf ? r.wf(px, pz, a) : r.w)); }
      rows.push(row); }
    for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg; this.ix.push(rows[i][k], rows[i + 1][k], rows[i + 1][k2], rows[i][k], rows[i + 1][k2], rows[i][k2]); }
    const cap = (r, row, flip) => { const c = this.v(r.x, r.y, r.z || 0, typeof r.col === "function" ? r.col(0) : r.col, r.wf ? r.wf(r.x, r.z || 0, 0) : r.w); for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg; if (flip) this.ix.push(c, row[k2], row[k]); else this.ix.push(c, row[k], row[k2]); } };
    if (capTop) cap(rings[0], rows[0], false);
    if (capBot) cap(rings[rings.length - 1], rows[rows.length - 1], true);
  };
  Skin.prototype.sheet = function (grid, flip) {
    const rows = grid.map((row) => row.map((q) => this.v(q[0], q[1], q[2], q[3], q[4])));
    for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < rows[i].length - 1; k++) { const a = rows[i][k], b = rows[i + 1][k], c = rows[i + 1][k + 1], d = rows[i][k + 1]; if (flip) this.ix.push(a, c, b, a, d, c); else this.ix.push(a, b, c, a, c, d); }
  };
  Skin.prototype.geometry = function () {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(this.p, 3)); g.setAttribute("color", new T.Float32BufferAttribute(this.c, 3));
    g.setAttribute("skinIndex", new T.Uint16BufferAttribute(this.si, 4)); g.setAttribute("skinWeight", new T.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.ix); g.computeVertexNormals(); return g;
  };
  // The hair that hangs below the nape (on a joint of its own, so it swings): to the shoulders on a grown man, long and
  // loose, a braid, or matted locks. Rounded, not slabs. (Hair standing up, or under a turban, has nothing hanging.)
  function hairFall(sp, hair, she) {
    const b = B(); b.ao = 0.9; let any = true;
    if (sp.hair === "loose") { b.sph(0.13, 0, -0.2, -0.03, hair, 1.9, 10, 0.98, 0.34); for (const sx of [-1, 1]) b.sph(0.045, sx * 0.118, -0.12, 0.05, hair, 3.4, 8, 0.8, 0.9); }
    else if (sp.hair === "long") b.sph(0.115, 0, -0.1, -0.035, hair, 1.35, 10, 0.95, 0.34);
    else if (sp.hair === "braid" || (she && !sp.hair)) { b.rod(0, 0.0, -0.045, 0, -0.5, -0.07, 0.036, hair, 7, 0.02); for (let i = 0; i < 5; i++) b.sph(0.034 - i * 0.003, 0, -0.06 - i * 0.095, -0.047 - i * 0.004, hair, 1.25, 7); b.sph(0.026, 0, -0.52, -0.07, 0xb2432a, 1, 6); }
    else if (sp.hair === "matted") { for (const sx of [-1, 0, 1]) b.rod(sx * 0.07, 0.05, -0.02, sx * 0.095, -0.24, -0.06, 0.03, hair, 6, 0.016); }
    else if (!sp.hair && !she && sp.stage !== "child") { b.sph(0.108, 0, -0.035, -0.03, hair, 1.0, 10, 0.98, 0.36); for (const sx of [-1, 1]) b.sph(0.04, sx * 0.1, -0.04, 0.005, hair, 1.5, 7, 0.8, 0.9); }
    else any = false;
    return any ? b.mesh() : null;
  }
  function limb(len, r0, r1, col, col2, extra) {
    const b = B(); b.ao = 0.9;
    b.cyl(r0, r1, len, 0, -len, 0, col2 == null ? col : col2, 8, 0, 0, 0, col);
    b.sph(r0 * 1.02, 0, 0, 0, col, 1, 6);
    if (extra) extra(b);
    return b.mesh();
  }

  let BLOB_GEO = null, BLOB_MAT = null, TRAIL_MAT = null;
  const TRAIL_N = 9;
  G.figure = function (spec, opt) {
    const sp = Object.assign({ stage: "adult", pronoun: "he", palette: ["#c27a44", "#8a3a2a", "#e2b55a"] }, spec || {}); opt = opt || {};
    const [sc, headK] = STAGE[sp.stage] || STAGE.adult, she = sp.pronoun === "she"; LITE = !!opt.lite;
    const MDL = !opt.lite && G.modelFor ? G.modelFor(sp) : null; /* (modelled in Blender from the artist's sheets: js/g3/model.js; its height and frame are its own) */
    const size = sc * (MDL ? MDL.size || 1 : (sp.size || 1) * (sp.big ? 1.04 : 1)), wide = MDL ? MDL.wide : (sp.big ? 1.2 : 1) * (she ? 0.88 : 1) * (sp.stage === "child" ? 0.92 : 1);
    const skin = new T.Color(sp.palette[0]).getHex(), accent = new T.Color(sp.palette[1]).getHex(), trim = new T.Color(sp.palette[2]).getHex();
    // As the 2D game's paintings have it: cream handwoven cotton, bordered and sashed in the wearer's own colour, with gold. A
    // few wear dyed cloth because the text says so (Krishna's yellow silk, Balarama's blue, Ekalavya's black) or as kings do.
    const cloth = sp.dyed ? accent : CREAM;
    const hair = sp.hairCol ? new T.Color(sp.hairCol).getHex() : sp.stage === "elder" ? (sp.beard === "long" || sp.white || (sp.crown && sp.crown.white) ? 0xf0ece2 : HAIR.elder) : DARK;
    const f = { spec: sp, size, root: new T.Group(), j: {}, cur: blank(), tgt: blank(), base: "stand", speed: 0, phase: Math.random() * 6, fall: 0, fallTo: 0, fallDir: 1, action: null, talk: false, look: null, alive: true, rate: 10, spin: 0 };
    const body = new T.Group(); body.scale.setScalar(size); f.root.add(body); f.body = body;
    const tilt = new T.Group(); body.add(tilt); f.tilt = tilt; // falls and rolls turn here, about the feet
    const hips = new T.Group(); hips.position.y = 0.92; tilt.add(hips); f.j.P = hips;
    const torso = new T.Group(); hips.add(torso); f.j.T = torso;
    torso.add(torsoMesh(sp, skin, cloth, trim, she, wide, accent));
    const head = new T.Group(); head.position.y = 0.55; head.scale.setScalar(MDL ? ({ child: 1.2, youth: 0.98 })[sp.stage] || 0.88 : headK); /* (a modelled figure's head is nearer life size, as the artist drew it: about seven heads tall when grown) */ /* (a modelled adult's head is nearer life size) */ torso.add(head); f.j.H = head;
    head.add(headMesh(sp, skin, hair, accent, trim, she));
    // Dress. Nothing here is cut or sewn: the epic's people wear lengths of cloth. The lower cloth (antariya) is wound
    // round the hips, its pleats gathered in front; fighting men and working men draw it up between the legs to the
    // knee, kings, elders and brahmins let it fall to the calf, and women wear it to the ankle under a girdle. The chest
    // is bare but for the upper cloth (uttariya) and ornaments; a sash (kayabandha) is knotted at the hip.
    const gear = sp.gear || [], crowned = /^(crown|kirita|mukuta)$/.test(sp.headgear || "");
    const garb = sp.garb || (she ? "wrap" : sp.stage === "child" ? "short" : sp.stage === "elder" || crowned || sp.headgear === "jata" || gear.includes("thread") ? "long" : "short");
    const rich = crowned || she || !!sp.rich, hipR = 0.108 * (she ? 1.16 : 1), fold = G.shade(cloth, 1.14), dim = G.shade(cloth, 0.86);
    // ---- The body: one skin over the skeleton -------------------------------------------------------------------
    // The joints are the same ones the poses turn. Over them lies a single smooth surface (arms, legs, trunk and the
    // cloth wound on them), each point of it held by the joints near it, so an elbow or a knee bends as flesh does and
    // a lower cloth stretches with a stride instead of two stiff pipes swinging. Ornaments, hands, feet, the head and
    // whatever is carried stay rigid on their joints. Cloth ends and hair hang from joints of their own, which sway.
    const bld = { arm: (sp.big ? 1.3 : sp.strong ? 1.14 : sp.slim ? 0.9 : 1) * (she ? 0.84 : 1) * (sp.stage === "elder" ? 0.92 : 1) * (sp.stage === "child" ? 0.95 : 1), leg: (sp.big ? 1.16 : sp.strong ? 1.07 : sp.slim ? 0.93 : 1) * (she ? 0.94 : 1),
      chest: (sp.strong ? 1.07 : sp.slim ? 0.93 : 1) * wide, waist: (sp.big ? 1.12 : sp.slim ? 0.92 : she ? 0.9 : 1) * wide, hip: wide * (she ? 1.1 : 1) };
    const armour = sp.armour || gear.includes("cuirass") || gear.includes("scale"), plate = sp.armour ? 0xe2b040 : gear.includes("scale") ? 0xc9a24e : 0xae8440;
    const modelled = !!MDL, HY = 0.92, SHX = 0.255 * wide * (modelled ? 0.9 : 1) /* (a modelled hero's shoulders are his own: tools/blender) */, HPX = 0.1 * wide, B_ = { P: 0, T: 1, H: 2, aL: 3, eL: 4, aR: 5, eR: 6, lL: 7, kL: 8, lR: 9, kR: 10, sB: 11, sF: 12, sS: 13 };
    for (const sd of ["L", "R"]) {
      const sx = sd === "L" ? 1 : -1;
      const sh = new T.Group(); sh.position.set(sx * SHX, 0.49, 0); torso.add(sh); f.j["a" + sd] = sh;
      const el = new T.Group(); el.position.y = -0.29; sh.add(el); f.j["e" + sd] = el;
      const ha = new T.Group(); ha.position.y = -0.3; el.add(ha); f.j["w" + sd] = ha;
      const hip = new T.Group(); hip.position.set(sx * HPX, 0, 0); hips.add(hip); f.j["l" + sd] = hip;
      const kn = new T.Group(); kn.position.y = -0.45; hip.add(kn); f.j["k" + sd] = kn;
      { const b = B(); b.ao = 0.94; const ra = 0.066 * bld.arm; // on the upper arm: the armlet (keyura)
        if (sp.stage !== "child") { b.cyl(ra + 0.004, ra + 0.006, 0.036, 0, -0.16, 0, rich ? GOLD : trim, 14); if (rich) b.sph(0.022, 0, -0.14, ra + 0.004, trim, 1, 6); }
        sh.add(b.mesh()); }
      { const b = B(); b.ao = 0.94; const rw = 0.043 * bld.arm; // on the forearm: cuffs and bangles; and the hand
        if (gear.includes("bracer") || sp.armour || gear.includes("scale")) b.cyl(rw + 0.012, rw + 0.004, 0.14, 0, -0.25, 0, trim, 12);
        else if (gear.includes("bangles")) { for (let k = 0; k < 3; k++) b.cyl(rw + 0.006, rw + 0.006, 0.02, 0, -0.275 + k * 0.03, 0, k === 1 ? GOLD : 0xf6f0e4, 12); }
        else if (she) { for (let k = 0; k < 2; k++) b.cyl(rw + 0.005, rw + 0.005, 0.018, 0, -0.268 + k * 0.028, 0, GOLD, 12); }
        else if (rich) b.cyl(rw + 0.008, rw + 0.004, 0.085, 0, -0.275, 0, GOLD, 12); else b.cyl(rw + 0.004, rw + 0.004, 0.022, 0, -0.255, 0, trim, 10);
        const hk = bld.arm > 1.1 ? 1.12 : 1; // the hand: a palm, the fingers curled as one, a thumb
        b.sph(0.043 * hk, 0, -0.325, 0.004, skin, 1.15, 10, 0.62, 0.95); b.sph(0.036 * hk, 0, -0.372, 0.014, skin, 0.95, 9, 0.66, 0.9); b.sph(0.017 * hk, -sx * 0.012, -0.335, 0.04, skin, 1.5, 7, 1, 1);
        el.add(b.mesh()); }
      { const b = B(); b.ao = 0.9; // at the ankle: an anklet; and the foot, bare, with a heel and toes
        if (rich) b.cyl(0.05 * bld.leg, 0.05 * bld.leg, 0.018, 0, -0.405, 0, GOLD, 12);
        if (armour && !LITE) { b.geo(new T.CylinderGeometry(0.072 * bld.leg, 0.052 * bld.leg, 0.3, 8, 1, true, -PI * 0.5, PI), 0, -0.22, 0.004, 0, 0, 0, plate, G.shade(plate, 1.2)); b.cyl(0.074 * bld.leg, 0.074 * bld.leg, 0.02, 0, -0.08, 0.004, GOLD, 8); } // greaves
        const sk2 = G.shade(skin, 0.94); b.sph(0.045, 0, -0.455, -0.012, sk2, 0.9, 9, 0.95, 1.05); b.sph(0.05, 0, -0.47, 0.07, sk2, 0.62, 10, 0.92, 2.0); b.sph(0.042, 0, -0.478, 0.145, sk2, 0.5, 9, 1.05, 1.1);
        kn.add(b.mesh()); }
    }
    if (sp.stage !== "child" && (armour || /^(turban|helmet|crest)$/.test(sp.headgear || ""))) { const b = B(); b.ao = 0.9; // a dagger in its sheath at the right hip
      b.geo(new T.BoxGeometry(0.035, 0.2, 0.02), -0.2 * wide, -0.12, 0.07, 0.15, 0, 0.25, 0x5a3a22); b.geo(new T.BoxGeometry(0.02, 0.07, 0.02), -0.2 * wide + 0.022, 0.01, 0.085, 0.15, 0, 0.25, STEEL); b.sph(0.016, -0.2 * wide + 0.03, 0.05, 0.09, GOLD, 1, 5); b.sph(0.014, -0.2 * wide - 0.026, -0.215, 0.055, GOLD, 1, 5); hips.add(b.mesh()); }
    if (opt.item === "bow" && sp.item !== "bow" && !gear.includes("quiver") && !gear.includes("quivers")) { const b = B(); b.ao = 0.9; // an archer's quiver, across the back
      b.geo(new T.CylinderGeometry(0.05, 0.04, 0.42, 7), -0.08, 0.36, -0.17, 0, 0, 0.42, 0x6a4526); b.geo(new T.CylinderGeometry(0.054, 0.054, 0.03, 7), -0.165, 0.55, -0.17, 0, 0, 0.42, GOLD); for (let k = 0; k < 4; k++) b.geo(new T.BoxGeometry(0.012, 0.12, 0.012), -0.19 - k * 0.012, 0.62 + (k % 2) * 0.012, -0.17 + (k - 1.5) * 0.012, 0, 0, 0.42, k % 2 ? 0xc8402c : 0xe8e0d0); torso.add(b.mesh()); }
    const swB = new T.Group(); swB.position.set(0.2 * wide, 0.52, -0.13); torso.add(swB); f.j.sB = swB; // the end of the upper cloth, down the back
    const swF = new T.Group(); swF.position.set(0, 0.0, 0.13); hips.add(swF); f.j.sF = swF;                // the pleats in front
    const swS = new T.Group(); swS.position.set(0.17 * wide, 0.0, 0.09); hips.add(swS); f.j.sS = swS;      // the sash's ends at the hip
    const swH = new T.Group(); swH.position.set(0, 0.15, -0.085); head.add(swH); f.j.sH = swH;             // hair below the nape
    { const hf = hairFall(sp, hair, she); if (hf) swH.add(hf); }
    {
      const K_ = new Skin(), sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
      const SEG = LITE ? 8 : 14, skinD = G.shade(skin, 0.9);
      // The trunk, crotch to neck. Each ring: height above the hips, half-width, half-depth.
      const cst = armour ? 0.008 : 0, TR = [[-0.19, 0.1 * bld.hip, 0.085], [-0.12, 0.19 * bld.hip, 0.132], [-0.03, 0.2 * bld.hip, 0.136], [0.06, 0.186 * bld.waist, 0.126], [0.15, 0.178 * bld.waist, 0.12], [0.24, 0.2 * bld.chest, 0.134],
        [0.33, 0.224 * bld.chest + cst, 0.146 + cst], [0.42, 0.236 * bld.chest + cst, 0.15 + cst], [0.485, 0.222 * bld.chest + cst, 0.136 + cst], [0.525, 0.16 * wide, 0.105], [0.548, 0.1 * wide, 0.08], [0.565, 0.07, 0.066], [0.6, 0.056, 0.058], [0.66, 0.052, 0.054]];
      const tor = (y) => { for (let k = 0; k < TR.length - 1; k++) if (y <= TR[k + 1][0]) { const a = TR[k], b = TR[k + 1], u = Math.max(0, (y - a[0]) / (b[0] - a[0])); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; } return [TR[TR.length - 1][1], TR[TR.length - 1][2]]; };
      const wT = (y) => { const t = sm(-0.02, 0.15, y), h = sm(0.585, 0.64, y); return [[B_.P, 1 - t], [B_.T, t * (1 - h)], [B_.H, t * h]]; };
      const tcol = (y) => (y < 0.02 ? cloth : armour && y > 0.19 && y < 0.53 ? (y > 0.4 ? G.shade(plate, 1.12) : plate) : she && y > 0.3 && y < 0.5 ? cloth : y < 0.12 ? skinD : skin);
      K_.tube(TR.map(([y, rx, rz]) => ({ x: 0, y: HY + y, z: 0, rx, rz, col: tcol(y), w: wT(y) })), SEG + 2, true, true);
      // The arms: shoulder to wrist, the elbow shared between the two bones.
      for (const sd of ["L", "R"]) { const sx = sd === "L" ? 1 : -1, a = bld.arm, A = B_["a" + sd], E = B_["e" + sd], Y0 = HY + 0.49;
        const AR = [[0.062, 0.03], [0.04, 0.062], [0.0, 0.076], [-0.07, 0.072], [-0.15, 0.064], [-0.22, 0.058], [-0.265, 0.055], [-0.29, 0.056], [-0.315, 0.055], [-0.37, 0.058], [-0.44, 0.052], [-0.52, 0.045], [-0.585, 0.04]];
        K_.tube(AR.map(([y, r]) => { const e = sm(-0.235, -0.345, y), cap = armour && y > -0.02; return { x: sx * (SHX + (y > 0 ? -y * 0.25 : 0)), y: Y0 + y, z: 0, rx: r * a, rz: r * a * (y < -0.3 && y > -0.5 ? 1.06 : 1), col: cap ? plate : y < -0.5 ? skinD : skin, w: [[A, 1 - e], [E, e]] }; }), SEG - 2, true, true); }
      // The legs, bare, hip to ankle.
      for (const sd of ["L", "R"]) { const sx = sd === "L" ? 1 : -1, g = bld.leg, Lg = B_["l" + sd], Kn = B_["k" + sd];
        const LR = [[0.03, 0.07], [-0.02, 0.098], [-0.14, 0.096], [-0.28, 0.082], [-0.39, 0.068], [-0.45, 0.066], [-0.5, 0.062], [-0.57, 0.066], [-0.65, 0.064], [-0.76, 0.05], [-0.86, 0.043]];
        K_.tube(LR.map(([y, r]) => { const k = sm(-0.385, -0.515, y), top = sm(-0.06, 0.03, y); return { x: sx * HPX, y: HY + y, z: y < -0.5 && y > -0.75 ? -0.008 : 0, rx: r * g, rz: r * g * (y < -0.5 && y > -0.72 ? 1.1 : 1), col: y > (garb === "short" ? -0.44 : garb === "wrap" ? -0.78 : -0.6) ? dim : y < -0.7 ? skinD : skin, w: [[B_.P, top * 0.5], [Lg, (1 - k) * (1 - top * 0.5)], [Kn, k]] }; }), SEG - 2, false, true); }
      // The lower cloth. Drawn up between the legs it wraps each thigh to the knee; let fall, it is one length round both
      // legs, to the calf or the ankle, each side of it going with its own leg and the front and back stretching between.
      const hemCol = (u, base) => (u > 0.93 ? accent : u > 0.9 ? GOLD : base);
      if (garb === "short") {
        for (const sd of ["L", "R"]) { const sx = sd === "L" ? 1 : -1, g = bld.leg, Lg = B_["l" + sd];
          const CR = [[0.02, 0.1], [-0.05, 0.116], [-0.18, 0.114], [-0.32, 0.106], [-0.4, 0.103], [-0.415, 0.104], [-0.43, 0.104], [-0.47, 0.105], [-0.474, 0.09]];
          K_.tube(CR.map(([y, r], n) => { const top = sm(-0.1, 0.02, y); return { x: sx * (HPX + 0.004), y: HY + y, z: 0, rx: r * g, rz: r * g * 1.04, col: n >= 6 ? accent : n === 5 ? GOLD : n % 2 ? cloth : dim, w: [[B_.P, top * 0.6], [Lg, 1 - top * 0.6]] }; }), SEG, false, false); }
      } else {
        const end = garb === "wrap" ? -0.83 : -0.66, n = 11, ring = [];
        for (let k = 0; k <= n; k++) { const u = k / n, y = 0.0 + end * u, flare = garb === "wrap" ? 1 + 0.1 * u * u : 1;
          const rx = (0.205 * bld.hip + 0.012) * (1 - 0.1 * sm(0.15, 0.75, u)) * flare, rz = (0.142 + 0.006) * (1 - 0.12 * sm(0.1, 0.7, u)) * flare;
          ring.push({ x: 0, y: HY + y, z: 0.004, rx, rz, col: (a) => hemCol(u, Math.round(a * 9 / PI) % 2 ? cloth : dim),
            wf: (px) => { const side = sm(-HPX * 0.9, HPX * 0.9, px), up = 1 - sm(-0.02, -0.26, -(-y)) , hipW = 1 - sm(0.02, 0.3, u * -end), k2 = sm(0.36, 0.56, -y); return [[B_.P, hipW], [B_.lL, (1 - hipW) * side * (1 - k2)], [B_.kL, (1 - hipW) * side * k2], [B_.lR, (1 - hipW) * (1 - side) * (1 - k2)], [B_.kR, (1 - hipW) * (1 - side) * k2]]; } }); }
        K_.tube(ring, LITE ? 10 : SEG + 6, false, false);
      }
      // The pleats, gathered at the waist in front and falling free: a fan of folds on a joint of its own.
      { const fall = garb === "short" ? 0.4 : garb === "long" ? 0.64 : 0.74, cols = 9, rows = 6, grid = [], y0 = HY - 0.0, z0 = tor(-0.02)[1] + 0.022;
        for (let r = 0; r <= rows; r++) { const u = r / rows, row = []; for (let c = 0; c < cols; c++) { const v = c / (cols - 1) - 0.5, wdt = 0.11 + 0.1 * u;
          row.push([v * wdt, y0 - fall * u, z0 + 0.012 * u + (c % 2 ? 0.014 : 0) * (0.3 + u) - Math.abs(v) * 0.03, u > 0.93 ? accent : u > 0.89 ? GOLD : c % 2 ? fold : cloth, [[B_.P, 1 - sm(0.05, 0.35, u)], [B_.sF, sm(0.05, 0.35, u)]]]); } grid.push(row); }
        K_.sheet(grid); }
      // The sash's two ends, hanging from its knot at the left hip.
      if (!she && sp.stage !== "child") for (const k of [0, 1]) { const len = 0.3 - k * 0.07, grid = [];
        for (let r = 0; r <= 4; r++) { const u = r / 4, row = []; for (let c = 0; c < 3; c++) row.push([0.17 * wide + k * 0.032 + (c - 1) * 0.024 + u * 0.02 * (k ? 1 : -0.4), HY - 0.01 - len * u, 0.105 - k * 0.02 + (c === 1 ? 0.008 : 0) + u * 0.012, u > 0.86 ? GOLD : k ? G.shade(accent, 0.86) : accent, [[B_.P, 1 - sm(0, 0.4, u)], [B_.sS, sm(0, 0.4, u)]]]); grid.push(row); }
        K_.sheet(grid); }
      // The upper cloth. On most it lies broad across the chest from the left shoulder to the right hip and round the
      // back; a teacher's is folded over the shoulder; a woman's goes over her shoulder from her waist. Its end hangs
      // down the back from the shoulder and swings.
      const worn = !armour && sp.stage !== "child" && !gear.includes("deerskin") && !gear.includes("bands") && !gear.includes("bare");
      if (worn) {
        const soldier = /^(turban|helmet)$/.test(sp.headgear || ""), uc = she || soldier ? accent : cloth, edge = uc === accent ? GOLD : accent, folded = gear.includes("thread") && !she;
        const wY = (y) => [[B_.P, 1 - sm(0.0, 0.15, y)], [B_.T, sm(0.0, 0.15, y)]];
        const surf = (x, y, side, lift) => { const [rx, rz] = tor(y), q = Math.max(-0.98, Math.min(0.98, x / rx)); return [x, HY + y, side * (rz * Math.sqrt(1 - q * q) + lift)]; };
        if (!folded) for (const side of [1, -1]) { // front, then back
          const rows = 9, half = she ? 0.085 : 0.115, grid = [];
          for (let r = 0; r <= rows; r++) { const u = r / rows, y = 0.535 - 0.5 * u, xc = 0.185 * wide - 0.34 * wide * u, row = [];
            for (let c = 0; c < 6; c++) { const v = c / 5 - 0.5, x = xc + v * 2 * half * 0.86, yy = y + v * 2 * half * 0.5 * (1 - u * 0.3), p = surf(x, Math.min(0.53, Math.max(0.03, yy)), side, 0.012 + (c % 2) * 0.004);
              row.push([p[0], p[1], p[2], c === 0 ? edge : c % 2 ? uc : G.shade(uc, 0.93), wY(yy)]); } grid.push(row); }
          K_.sheet(grid, side < 0);
        } else { const grid = []; for (let r = 0; r <= 6; r++) { const u = r / 6, y = 0.535 - 0.46 * u, row = []; for (let c = 0; c < 4; c++) { const x = 0.19 * wide + (c - 1.5) * 0.045, p = surf(x, y, 1, 0.014 + (c % 2) * 0.006 + u * 0.01); row.push([p[0], p[1], p[2], u > 0.9 ? accent : c % 2 ? uc : G.shade(uc, 0.93), wY(y)]); } grid.push(row); } K_.sheet(grid); }
        { const grid = []; for (let r = 0; r <= 4; r++) { const a = (r / 4) * PI, row = []; for (let c = 0; c < 4; c++) row.push([0.2 * wide + (c - 1.5) * 0.05, HY + 0.515 + Math.sin(a) * 0.035, Math.cos(a) * 0.135, c % 2 ? uc : G.shade(uc, 0.93), [[B_.T, 1]]]); grid.push(row); } K_.sheet(grid); } // over the shoulder
        { const len = she ? 0.62 : 0.42, grid = []; for (let r = 0; r <= 6; r++) { const u = r / 6, row = []; for (let c = 0; c < 5; c++) { const v = c / 4 - 0.5;
            row.push([0.2 * wide + v * (0.17 + 0.05 * u), HY + 0.52 - len * u, -0.135 - 0.03 * sm(0, 0.3, u) - (c % 2 ? 0.012 : 0) * u, u > 0.9 ? edge : c % 2 ? uc : G.shade(uc, 0.92), [[B_.T, 1 - sm(0.05, 0.4, u)], [B_.sB, sm(0.05, 0.4, u)]]]); } grid.push(row); }
          K_.sheet(grid, true); } // its end, down the back
      }
      const bones = Object.keys(B_).sort((a, b) => B_[a] - B_[b]).map((k) => f.j[k]);
      f.root.updateMatrixWorld(true);
      const mesh = new T.SkinnedMesh(K_.geometry(), G.mat.vcDouble); mesh.frustumCulled = false; body.add(mesh); mesh.updateMatrixWorld(true);
      f.skeleton = new T.Skeleton(bones); mesh.bind(f.skeleton, mesh.matrixWorld); f.skin = mesh;
    }
    f.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    // A hero modelled in Blender wears that model on these same joints; the code-built body stands down (js/g3/model.js).
    if (MDL && G.modelSkin) { f.root.traverse((o) => { if (o.isMesh) o.visible = false; }); G.modelSkin(f, sp, body, Object.assign(MDL.sided ? { red: accent } : {}, sp.wear ? Object.fromEntries(Object.entries(sp.wear).map(([k, v]) => [k, new T.Color(v).getHex()])) : null)); /* (sided: the rank and file wear their army's colour; wear: one model in another's colours) */ }
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
      // (A modelled figure's hand is closed round a haft: the weapon is set in the hollow of that hand, f.gripR / f.gripL from the model, and is a little larger than life, as its hands are.)
      if (item === "bow") { f.bow = bow(); f.bow.rotation.set(0.12, 0, 0.16); if (f.gripL) f.bow.position.copy(f.gripL).sub(new V3(0, -0.22 * f.bow.scale.y, 0).applyEuler(f.bow.rotation)); else f.bow.position.set(0, 0.25, 0.03); /* (the middle of the stave, where its grip is bound, lies in the hollow of the bow hand) */ f.j.wL.add(f.bow); }
      else { const m = held(item, sp.maceCol); if (m) { if (f.gripR) { m.position.copy(f.gripR); m.scale.setScalar(1.12); } else m.position.set(0, -0.03, 0.02); m.castShadow = true; f.j.wR.add(m); f.item = m; } }
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
      { // What hangs, swings, as a weighted cloth does: it is driven by how the body really moved this frame (not by a
        // clock), trails behind a run, is flung out by a turn, swings on past and settles, stays plumb when the body leans,
        // and never passes through what it hangs against (a back cloth cannot swing into the back, nor pleats into the legs).
        const j = f.j, sw = f.sway || (f.sway = { x: f.root.position.x, z: f.root.position.z, a: f.root.rotation.y, vf: 0, b: {} }), h = Math.min(dt, 1 / 30);
        let vx = (f.root.position.x - sw.x) / Math.max(dt, 1e-3), vz = (f.root.position.z - sw.z) / Math.max(dt, 1e-3), yaw = f.root.rotation.y - sw.a; yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw)) / Math.max(dt, 1e-3);
        const sp2 = Math.hypot(vx, vz); if (sp2 > 9) { vx *= 9 / sp2; vz *= 9 / sp2; } // (being set down somewhere else is not a gust)
        sw.x = f.root.position.x; sw.z = f.root.position.z; sw.a = f.root.rotation.y; yaw = Math.max(-6, Math.min(6, yaw));
        const ca = Math.cos(f.root.rotation.y), sa = Math.sin(f.root.rotation.y), vf = vx * sa + vz * ca, vs = vx * ca - vz * sa, kick = Math.max(-4, Math.min(4, vf - sw.vf)); sw.vf = vf;
        const lean = j.T.rotation.x + j.P.rotation.x, roll = j.T.rotation.z + j.P.rotation.z, air = Math.sin(t * 1.3 + f.phase) * 0.012;
        const swing = (name, tx, tz, lo, hi, side, om, zeta, kx) => { const b = j[name], st = sw.b[name] || (sw.b[name] = { vx: 0, vz: 0 });
          st.vx += kx * kick; st.vx += ((tx - b.rotation.x) * om * om - 2 * zeta * om * st.vx) * h; st.vz += ((tz - b.rotation.z) * om * om - 2 * zeta * om * st.vz) * h;
          b.rotation.x += st.vx * h; b.rotation.z += st.vz * h;
          if (b.rotation.x < lo) { b.rotation.x = lo; if (st.vx < 0) st.vx = 0; } else if (b.rotation.x > hi) { b.rotation.x = hi; if (st.vx > 0) st.vx = 0; }
          if (b.rotation.z < -side) { b.rotation.z = -side; st.vz = 0; } else if (b.rotation.z > side) { b.rotation.z = side; st.vz = 0; } };
        const trail = Math.max(-0.2, Math.min(0.62, vf * 0.1)), fling = Math.max(-0.3, Math.min(0.3, -vs * 0.07 + yaw * 0.045));
        swing("sB", -lean * 0.9 + trail + air, -roll * 0.8 + fling, -0.03, 0.9, 0.34, 8.5, 0.5, 0.05);                                       // the upper cloth's end, down the back
        swing("sF", Math.min(j.lL.rotation.x, j.lR.rotation.x, 0) * 0.85 - j.P.rotation.x * 0.8 + Math.min(0, trail * -0.2), -j.P.rotation.z * 0.6 + fling * 0.5, -1.05, 0.05, 0.22, 11, 0.62, 0); // the pleats: the forward thigh carries them
        swing("sS", -j.P.rotation.x * 0.9 + trail * 0.8 + air, -j.P.rotation.z * 0.8 + fling * 1.2, -0.45, 0.7, 0.4, 7.5, 0.42, 0.06);         // the sash's ends
        swing("sH", -(lean + j.H.rotation.x) * 0.9 + trail * 0.75, -(roll + j.H.rotation.z) * 0.8 + fling * 0.8, -0.02, 0.75, 0.3, 10, 0.55, 0.04); // hair
      }
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
    f.dispose = function () { if (f.skeleton) { f.skeleton.dispose(); f.skeleton = null; } if (f.trail) { G.fxRoot.remove(f.trail.m); f.trail.m.geometry.dispose(); f.trail = null; } if (f.root.parent) f.root.parent.remove(f.root); G.dispose(f.root); };
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
    // From the dice hall on Draupadi's hair is unbound and she wears no diadem ("covering her face with her dishevelled hair").
    if (id === "draupadi" && S && S.act >= 5 && EXTRAS.draupadi) return Object.assign({}, EXTRAS.draupadi, { headgear: null, crown: null, hair: "loose" });
    return EXTRAS[id] || null;
  };
  // People the story names who have no look of their own in the 2D game, and the ordinary folk of every scene.
  const EXTRAS = {
    // (Draupadi: "her complexion was dark, and her locks were blue and curly"; Gandhari bandaged her own eyes; the king is blind.)
    draupadi: { model: "draupadi", face: "heart", pronoun: "she", palette: ["#6e4226", "#b2432a", "#e2b55a"], stage: "adult", headgear: "mukuta", hair: "long", hairCol: "#16182e", size: 1.02 },
    sairindhri: { model: "draupadi", look: "disguise", face: "heart", dyed: true, pronoun: "she", palette: ["#6e4226", "#2a2422", "#6a5a48"], stage: "adult", hairCol: "#16182e", size: 1.02 }, // in Virata's house: "a single piece of a black and dirty though costly cloth", the braid hidden
    kunti: { model: "kunti", face: "oval", pronoun: "she", palette: ["#c08a5a", "#efe6cc", "#b49054"], stage: "elder" },
    gandhari: { model: "gandhari", face: "long", pronoun: "she", palette: ["#c48450", "#4f6178", "#d6c6a2"], stage: "elder", gear: ["blindfold"] },
    dhritarashtra: { model: "dhritarashtra", face: "square", pronoun: "he", palette: ["#b8703b", "#5e2430", "#e2b55a"], stage: "elder", headgear: "crown", crown: { gem: "#b2432a", tall: 1.1 }, beard: true, size: 1.1, blind: true },
    // Arjuna in the year of hiding: "decked in the ornaments of women, and wearing large ear-rings and beautiful
    // conch-bracelets overlaid with gold", "a braid to hang down from my head". Bhima at the bride-choice, as a brahmin.
    brihannala: { model: "arjuna", look: "disguise", face: "oval", pronoun: "she", palette: ["#7a4a2a", "#b2432a", "#e2b55a"], stage: "adult", hair: "braid", gear: ["earrings", "bangles"], item: "bow", size: 1.14 },
    bhima_brahmin: { model: "bhima", look: "forest", face: "broad", pronoun: "he", palette: ["#a8622f", "#efe6cf", "#c9a24e"], stage: "adult", headgear: "jata", hair: "matted", gear: ["thread", "deerskin"], item: "club", big: true, size: 1.25 },
    bhurishravas: { model: "soldier_cw", face: "gaunt", pronoun: "he", palette: ["#b8703b", "#7a1f2a", "#e2b55a"], stage: "adult", headgear: "crown", crown: { gem: "#2f7d55", tall: 0.9 }, gear: ["cuirass"], item: "sword", size: 1.1 },
    kritavarma: { model: "soldier_cw", face: "square", pronoun: "he", palette: ["#9a5a30", "#2c4c86", "#e2b55a"], stage: "adult", headgear: "crown", crown: { gem: "#2c4c86", tall: 0.85 }, gear: ["cuirass"], item: "bow", size: 1.08 },
    vrishasena: { model: "soldier_cw", face: "long", pronoun: "he", palette: ["#c9813f", "#b2432a", "#f3d27a"], stage: "youth", headgear: "mukuta", gear: ["cuirass"], item: "bow" },
    iravan: { model: "soldier_cw", face: "heart", pronoun: "he", palette: ["#7a5a3a", "#2a4a3a", "#c9d27a"], stage: "youth", headgear: "mukuta", item: "sword" },
    yudhamanyu: { model: "soldier_cw", pronoun: "he", palette: ["#c98a52", "#2d5aa0", "#e2b55a"], stage: "adult", headgear: "mukuta", gear: ["cuirass"], item: "bow" },
    uttamaujas: { model: "soldier_cw", pronoun: "he", palette: ["#c98a52", "#2d5aa0", "#e2b55a"], stage: "adult", headgear: "mukuta", gear: ["cuirass"], item: "sword" },
    // The foot soldier of the line: bare to the waist under crossed bands of cloth, a thick coiled turban tied under the chin.
    footman: { model: "soldier_charioteer", pronoun: "he", palette: ["#9e6a40", "#6e3026", "#b39255"], headgear: "turban", chin: true, gear: ["bands"], item: "spear", stage: "adult" },
    virata: { model: "virata", face: "round", pronoun: "he", palette: ["#c47d45", "#2f7d55", "#d9c27a"], stage: "elder", headgear: "crown", crown: { gem: "#2f7d55", tall: 0.9 }, beard: true },
    uttara: { model: "uttara", pronoun: "he", palette: ["#c47d45", "#2f7d55", "#d9c27a"], stage: "youth", headgear: "mukuta", item: "bow" },
    vikarna: { model: "soldier_cw", pronoun: "he", palette: ["#b8703b", "#7a1f2a", "#e2b55a"], stage: "adult", headgear: "mukuta", item: "sword" },
    madhavi: { model: "villager_f", pronoun: "she", palette: ["#b47a4a", "#3f6b5a", "#e2b55a"], stage: "adult" },
    revat: { model: "villager_m", pronoun: "he", palette: ["#b06c3c", "#7a5232", "#d8b77a"], stage: "adult", headgear: "band", item: "whip" },
    bhadra: { model: "guard", face: "square", pronoun: "he", palette: ["#9e6a40", "#6e3026", "#b39255"], stage: "elder", headgear: "crest", hat: "#a3302a", gear: ["cuirass"], item: "sword", beard: "short", strong: true }, // captain of the gate guard: a crested veteran, with the sword he strikes with
    sudatta: { model: "villager_m", pronoun: "he", palette: ["#c9905a", "#d79a2b", "#8a3a2a"], stage: "elder", headgear: "turban", hat: "#d79a2b", big: true },
    haridatta: { model: "villager_m", pronoun: "he", palette: ["#b47a48", "#d9c9a6", "#a3302a"], stage: "elder", headgear: "turban", hat: "#a3302a", beard: true },
    sage: { model: "mauni", pronoun: "he", palette: ["#b88352", "#d98a3a", "#8a6a3a"], stage: "elder", headgear: "jata", beard: "long", item: "staff" },
    mother: { model: "villager_f", pronoun: "she", palette: ["#b9743f", "#8a2f3a", "#e2b55a"], stage: "adult" },
    father: { model: "villager_m", pronoun: "he", palette: ["#b9743f", "#6f3a24", "#e2b55a"], stage: "adult", headgear: "band" },
    grandmother: { model: "healer", pronoun: "she", palette: ["#b9743f", "#b9a27c", "#9a8a6a"], stage: "elder" },
    townsman: { model: "villager_m", pronoun: "he", palette: ["#b0703f", "#8a5a3a", "#c9a066"], stage: "adult", headgear: "band" },
    townswoman: { model: "villager_f", pronoun: "she", palette: ["#b47a4a", "#a34a5a", "#d9c27a"], stage: "adult" },
    child: { model: "village_child", pronoun: "he", palette: ["#b9743f", "#b2432a", "#e2b55a"], stage: "child" },
    girl: { model: "player_f", pronoun: "she", palette: ["#b9743f", "#2f7d55", "#e2b55a"], stage: "child" },
    bandit: { model: "raider", pronoun: "he", palette: ["#9c6a42", "#6b5a3a", "#a8875a"], headgear: "scarf", hat: "#7a4a2a", item: "club", stage: "adult", size: 0.95 },
    archer: { model: "soldier_archer", pronoun: "he", palette: ["#9e6a40", "#5d3b2a", "#9f8250"], headgear: "capfeather", hat: "#5d3b2a", gear: ["bracer"], item: "bow", stage: "adult" },
    rider: { model: "soldier_foot", pronoun: "he", palette: ["#a8703f", "#6e3026", "#c9a24e"], headgear: "crest", hat: "#a3302a", gear: ["cuirass"], item: "sword", stage: "adult", size: 1.04 },
    champion: { model: "soldier_cw", pronoun: "he", palette: ["#b8703b", "#7a1f2a", "#e2b55a"], headgear: "crest", hat: "#e2b55a", gear: ["scale"], item: "mace", stage: "adult", size: 1.1, big: true },
    gandharva: { pronoun: "he", palette: ["#9fb07a", "#2f5a3a", "#d9c27a"], headgear: "feather", item: "spear", stage: "adult" },
    rakshasa: { pronoun: "he", palette: ["#5a4a4a", "#2a1a1a", "#b2432a"], headgear: "band", item: "club", stage: "adult", big: true, size: 1.12 },
    naga: { pronoun: "he", palette: ["#6a8a6a", "#2a4a3a", "#c9d27a"], headgear: "band", item: "spear", stage: "adult" },
    common: { model: "villager_m", pronoun: "he", palette: ["#9c6a42", "#6b5a3a", "#a8875a"], item: "staff", stage: "adult" },
    dancer: { model: "player_f", pronoun: "she", palette: ["#c08a5a", "#b2432a", "#e2b55a"], stage: "adult", headgear: "mukuta" },
    king: { model: "jayadratha", look: "court", wear: { cloth: "#5a2a6a", red: "#3a1a4a", cloth2: "#c9a24e" }, pronoun: "he", palette: ["#b8703b", "#5a2a6a", "#e2b55a"], stage: "adult", headgear: "crown", crown: { gem: "#8a5aa0" }, beard: true },
    priest: { model: "brahmin", pronoun: "he", palette: ["#c9905a", "#efe6cf", "#c9a24e"], stage: "elder", headgear: "jata", beard: true },
    yaksha: { pronoun: "he", palette: ["#7aa0b0", "#2a4a5a", "#d9e27a"], stage: "adult", headgear: "crown", crown: { gem: "#7ad0e0", white: true }, size: 1.3 }
  };
  G.EXTRAS = EXTRAS;
})(window.K = window.K || {});
