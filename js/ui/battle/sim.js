/* Fights in 3D: the rules (K.RT3). Every fight of the game is fought on open ground now: you run free on a round field,
   foes circle and come in two at a time, each blow is painted on the ground before it lands, and you answer with your
   weapon's own chain of blows, a roll, a shield, a parry, your path's skill, herbs, a friend's help or a divine weapon.

   Like the 2D real-time fights it rides on the turn-based engine (engine/combat.js): K.Combat.start builds the fight
   (your stats, allies, foes, curses, the intro), every blow is K.Combat's own hit through the abilities' own use(), and
   the end is K.Combat.settle then K.combatOutcome, so vows, the kavacha, the amulet, holds, story beats, field events,
   sparing and what a fight leaves behind behave exactly as before. Only space is new: positions are metres on the
   ground (x, z), facings are angles, and a blow's mark is a fan, a ring or a lane instead of a stretch of a line.

   A fixed-step, deterministic simulation (60 steps a second, every chance from K.rng), with no drawing in it:
     R = RT3.begin(B, opts); RT3.step(R, act); R.over → "win" | "lose" | "flee" | "spare" | "retry"
     act: { mx, mz, strike, roll, block (held), skill, herbs, astra: id, call, spare: uid, withdraw, lock, cover, layDown, orders }
   RT3.bot(R) plays as a person would (the tests, the balance runs, and "Meet blows for me"); RT3.autoplay(id) a whole fight. */
(function (K) {
  "use strict";
  const C = K.Combat, RT = K.RT;
  const R3 = (K.RT3 = {});
  const STEP = 1 / 60, ROUND = 4, TAU = Math.PI * 2;
  R3.STEP = STEP;
  // Every fight is on the ground: the turn screens' extras (places in the line, packs by turns, shield rolls) stay off.
  C.placesWanted = () => false; C.shieldsWanted = () => false; C.packsWanted = () => false; C.spareGoesOn = () => true;

  const P = (R3.P = {
    story: 8,            // seconds for each "round" of a fight's story: holds, beats, the field event
    hpFoe: 4.6, hpFriend: 1.55, hpAlly: 3.0, atkFoe: 0.74,
    rad: 13,             // the field's radius (m)
    run: 5.3, turnRate: 3.4, turnHold: 2.5, faceNear: 6, sideWalk: 0.78, backWalk: 0.62, foeRun: 3.2, archerRun: 2.6, allyRun: 3.7, blockWalk: 0.42,
    turn: 2.4,           // how fast a foe winding up can still turn after you (rad/s); a champion turns faster
    gap: [2.0, 3.4], windup: 0.64, heavyWind: 1.0, track: 0.85, lock: 0.38, meleeLock: 0.18,
    breathMax: 100, rollCost: 30, rollMin: 30, breathRegen: 20, roll: 0.42, rollDist: 3.9, perfect: 0.16,
    retryHp: 0.8,
    blockThrough: 0.08, blockHeavy: 0.35, blockBreaker: 0.55, blockMin: 12, blockDrain: 4.5, blockHit: 10, blockHitHeavy: 18, blockPerfect: 0.14, blockStag: 1.0, blockArc: 1.75,
    maceSmash: 0.82, maceSweep: 0.72, maceHit: 1.1, maceShove: 0.9,
    parry: 0.24, parryStag: 1.0, parryStagMace: 1.4, parryPart: 0.5, parriedBusy: 0.45, parryFoeCd: 2.5,
    fblock: 0.18, fblockLight: 0.15, fblockHeavy: 0.45, fblockRec: 1.0, fblockCd: 1.8,
    // What each kind of man can do ("What each kind of man can do", below). A shield-man's shield is up this many times as often
    // (never more than shieldMost of the time), and each blow it catches wears it shieldWear times as fast, so it is soon broken;
    // a spearman sets his point at a man closing faster than setRun (m/s) inside his reach and setReach more, strikes in setWind
    // seconds for setHit times the blow, and needs setCd seconds before he can do it again; a heavy weapon's great blow lets
    // crush of itself through a raised shield and leaves him open crushOpen seconds longer; a skirmisher's blow from behind
    // is backHit times as heavy, and he runs below skirmRun of his strength; a captain's men rest ledRest as long, and reel
    // captainReel seconds when he falls.
    // Your own plan ("Your own plan", below).
    karnaSecond: 0.5,   // (Karna's second arrow follows the first by this long)
    holdBack: 0.7, holdSpirit: 0.8, flankRest: 1.55, centreSpirit: 1.3, centreBack: 1.2, metSpirit: 20, metSecs: 6, scoutSure: 7,
    captureSecs: 24, captiveHp: 0.8, captiveShare: 0.2, captureSpirit: 65, shaken: 40, shakenRest: 1.25,   // (a man to take: the count, his strength beside the common men of the fight, what his taking costs their spirit)
    shieldMan: 1.8, shieldMost: 0.42, shieldWear: 2, setRun: 3.4, setReach: 0.9, setWind: 0.34, setHit: 1.15, setCd: 8, crush: 0.6, crushOpen: 0.3, backHit: 1.25, skirmRun: 0.3, ledRest: 0.82, captainReel: 0.9,
    bowSecond: 0.8, bowGap: 0.09, arrowPush: 0.35, arrow: 23, myArrow: 36, shoot: 17, keep: 8.5,
    fan: 0.95, thrust: 0.5, sweep: 1.75, lunge: 0.55, quake: 3.3, wait: 4.4,
    shieldPts: 10, shieldBack: 9, pickup: 1.0, lightStag: 0.18, mantraRest: 10, shieldYou: 0.85, shieldSoldiers: 0.6,
    wornAfter: 100, wornFloor: 0.03, cap: 240,
    botReact: [0.3, 0.52], botMiss: [0.3, 0.55], botLead: [0, 0.24], botRollLead: [0.07, 0.3], botGap: [0.12, 0.22],
    vsPath: { mace: 0.74, strategist: 0.76, charioteer: 0.84, archer: 0.9, spy: 0.95, bard: 0.92, healer: 1 }
  });
  // How far each weapon reaches, centre to centre (m).
  R3.REACH = { spear: 2.4, mace: 2.0, sword: 1.85, woodsword: 1.85, staff: 1.95, club: 1.75, hammer: 1.6, dagger: 1.45, fist: 1.2, bow: 1.75, tusk: 3.3, fire: 0 };
  // Tuned per fight where the bot's win rate fell far from its neighbours (tests/balance.js): foes' health and blows.
  // Each fight's own tuning in 3D, on top of the 2D game's (RT.TUNE). Set against the bot on all seven paths, with the line
  // of soldiers in the war battles: where the 2D game has a recorded win rate for a fight the 3D rate is kept near it; the
  // ring round Abhimanyu and the dream are meant to be lost by nearly everyone (docs/Balance_3D.md).
  R3.TUNE = { e_bhadra: { hp: 1.3, atk: 1.5 }, e_bhadra_road: { hp: 1.25, atk: 1.3 }, cross_e_escape: { hp: 0.6, atk: 1.0 }, e_ring: { atk: 0.75 }, e_last_stand: { hp: 0.85, atk: 0.53 }, e_lake_three: { atk: 0.8 }, e_lake_three_deep: { atk: 0.8 }, cross_e_duel: { hp: 1.25, atk: 1.4 }, e_raid: { hp: 1.05, atk: 1.03 }, e_ash: { hp: 1.05 },
    oath_arjuna_12: { atk: 0.82 }, oath_arjuna_16: { atk: 0.77 }, bh_line9: { atk: 0.82 }, fs_sk_hold: { atk: 0.74 }, fs_d13_break: { atk: 0.66 }, fs_sk_break: { atk: 0.84 }, fs_sk_escort: { atk: 1.15 }, wc_e_reach: { atk: 0.86 },
    e_wheel: { hp: 1, atk: 1.12 }, e_day16: { hp: 0.85, atk: 0.7 }, e_road: { atk: 1.2 }, oath_king_hold: { atk: 0.96 }, e_cattle_k: { hp: 0.88, atk: 0.8 }, e_iravan: { atk: 0.8 }, e_ep_carts: { hp: 1.08, atk: 1.1 }, e_hunt: { hp: 1.0, atk: 1.25 },
    // (13 November, night: with a man to take where a banner on a pole had ended a war fight in fifteen seconds, and with the trades, these needed easing)
    e_night: { hp: 0.85, atk: 0.9 }, e_lake_hold: { atk: 0.85 }, e_lake_hold_deep: { atk: 0.85 },
    hold_duryodhana: { atk: 0.92 } };

  const living = (B, side) => B.units.filter((u) => u.hp > 0 && !u.spared && (side === "friends" ? u.side !== "enemy" : u.side === side));
  const held = (u) => !!(u.status.stun || u.status.asleep || u.status.bound);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rr = (a, b) => a + K.rng() * (b - a);
  const dist = (a, b) => Math.hypot(a.g.x - b.g.x, a.g.z - b.g.z);
  const angTo = (a, b) => Math.atan2(b.g.x - a.g.x, b.g.z - a.g.z);
  const adiff = (a, b) => { const d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); };
  const MELEE = RT.MELEE, RANGED = new Set(["arrows", "aimed", "pin", "volley"]), HEAVY = new Set(["heavy", "crush", "breaker", "aimed"]);
  const isSoldiers = (a) => a.plural && !a.person && !a.called;

  // ---------- How bodies move ----------
  // (Owner, 13 November: "physics of the game doesnt feel right".) Nothing here starts, stops or turns in an instant,
  // and bodies have weight against each other.
  //   legs    a body's own walking velocity (g.wx, g.wz) goes toward what its legs ask for at the rate its weight
  //           allows, and runs down when they ask for nothing (walk).
  //   wheels  a car or an elephant goes only the way it points (g.ca) at its speed (g.cv): it comes round no tighter
  //           than that speed allows, gathers way slowly and loses it slowly (drive).
  //   weight  where two bodies meet, each gives ground by the other's weight. One set to meet a blow gives little;
  //           staggered or down he gives a lot; your own men step out of your way; no one moves an elephant (move).
  //   blows   every blow that lands moves the body it lands on, a light one a hand's breadth, and what throws a body
  //           back runs out over half a second, not a tenth (knock, nudge, PHYS.fric).
  const PHYS = (R3.PHYS = {
    acc: 30, brake: 38, accFoe: 17, brakeFoe: 24, accSquad: 12, turn: 15,
    car: { acc: 4.6, brake: 7, turn: 2.1, pivot: 0.55, rmin: 2.6 }, ele: { acc: 2.4, brake: 3.6, turn: 1.5, pivot: 0.8, rmin: 1.9 },
    fric: 5.5, knock: 3.9, sep: 4, rollTau: 0.12, rollEase: 0.5
  });
  const wheeled = (u) => !!(u.g && !u.g.ride && (u.g.car || u.g.kind === "elephant"));
  const weight = (u) => (u.still ? 1e6 : u.g.kind === "elephant" ? 40 : u.g.kind === "cart" ? 20 : u.g.car ? 14 : u.g.kind === "squad" ? 3 : u.hero || u.person ? 1.5 : 1);
  const locked = (R, u) => u.g.role === "wall" && !!R.plan && !R.plan.broken; // (shields locked: the wall is one weight)
  const brace = (R, u, by) => { const g = u.g;
    if (u.still) return 1e6;
    if (u.side === "player") return by.side === "ally" ? 1e6 : R.block ? 4.5 : R.roll > 0 ? 0.5 : 2.9; // (your own men do not push you about)
    if (by.side === "player" && u.side === "ally") return 0.15; // (and they step out of your way)
    if (u.hp <= 0 || g.down > 0) return 0.4;
    if (g.stag > 0 || held(u)) return 0.6;
    return locked(R, u) || (R.through && by.side === "player") ? 9 : by.side === "player" ? 4 : 2.9; }; // (one posted to bar your way is set against you, and gives almost nothing)
  function walk(R, u, vx, vz, dt, pass) {
    const g = u.g, me = u.side === "player", going = vx || vz;
    const rate = (going ? (me ? PHYS.acc : g.kind === "squad" ? PHYS.accSquad : PHYS.accFoe) : me ? PHYS.brake * (R.t < (g.landT || 0) ? 0.5 : 1) : PHYS.brakeFoe) * dt; // (out of a roll your feet take longer to stop you)
    const dx = vx - g.wx, dz = vz - g.wz, l = Math.hypot(dx, dz);
    if (l <= rate) { g.wx = vx; g.wz = vz; } else { g.wx += (dx / l) * rate; g.wz += (dz / l) * rate; }
    g.walkN = R.n;
    if (g.wx || g.wz) { const x0 = g.x, z0 = g.z; move(R, u, g.wx * dt, g.wz * dt, !!pass); g.lx = (g.x - x0) / dt; g.lz = (g.z - z0) / dt; } // (g.lx, g.lz: the ground its legs really covered, for the eye: a man leaning on another walks on the spot)
  }
  function drive(R, u, mx, mz, pace, dt) {
    const g = u.g, V = g.kind === "elephant" ? PHYS.ele : PHYS.car;
    if (g.ca == null) g.ca = g.a;
    let wx = mx, wz = mz, l = Math.hypot(wx, wz); if (l > 1e-3) { wx /= l; wz /= l; }
    // (the field's edge is seen coming, and turned along)
    const look = 1.4 + g.cv * 0.7, ax = g.x + Math.sin(g.ca) * look, az = g.z + Math.cos(g.ca) * look, ar = Math.hypot(ax, az), lim = R.rad - g.rad - 0.3;
    if (g.entered && ar > lim) { const k = Math.min(1, (ar - lim) / 1.6); wx = wx * (1 - k) - (ax / ar) * k * 1.5; wz = wz * (1 - k) - (az / ar) * k * 1.5; l = Math.hypot(wx, wz); if (l > 1e-3) { wx /= l; wz /= l; } }
    const off = l > 1e-3 ? adiff(Math.atan2(wx, wz), g.ca) : 0, wmax = Math.min(V.turn, g.cv / V.rmin + V.pivot) * dt;
    g.ca += clamp(off, -wmax, wmax);
    const al = Math.cos(off), want = pace * (al > 0 ? 0.35 + 0.65 * al : 0.35);
    g.cv = Math.max(0, g.cv + clamp(want - g.cv, -V.brake * dt, V.acc * dt));
    g.walkN = R.n; g.wx = Math.sin(g.ca) * g.cv; g.wz = Math.cos(g.ca) * g.cv;
    if (g.cv > 1e-3) { const x0 = g.x, z0 = g.z; move(R, u, g.wx * dt, g.wz * dt, false);
      // (brought up against what will not move, it stalls, and comes round the way it is being turned: it does not slide along it)
      const ddx = g.x - x0, ddz = g.z - z0, fwd = (ddx * Math.sin(g.ca) + ddz * Math.cos(g.ca)) / dt; g.lx = ddx / dt; g.lz = ddz / dt;
      if (fwd < g.cv * 0.6) { g.cv = Math.max(0, fwd); const lat = ddx * Math.cos(g.ca) - ddz * Math.sin(g.ca); if (Math.abs(lat) > 1e-5) g.ca += Math.sign(lat) * (V.pivot + 0.6) * dt; } }
  }
  // (on legs or on wheels, toward (mx, mz) at sp metres a second)
  function goTo(R, u, mx, mz, sp, dt) { if (wheeled(u)) return drive(R, u, mx, mz, sp, dt); const l = Math.hypot(mx, mz); if (l > 1e-3) walk(R, u, (mx / l) * sp, (mz / l) * sp, dt); }
  function shove(R, u, dx, dz) { const g = u.g; if (g.ride) return; let x = g.x + dx, z = g.z + dz; const r = Math.hypot(x, z), lim = R.rad - 0.3; if (r > lim && (u.side !== "enemy" || g.entered)) { x *= lim / r; z *= lim / r; } g.x = x; g.z = z; }
  // A car or an elephant under way does not ease a man aside: it throws him, forward and to the side he was on.
  function jostle(R, by, o, share) {
    const g = by.g, og = o.g; if (!wheeled(by) || !(g.cv > 1.6) || og.kind === "elephant" || og.car || o.still || share < 0.5 || og.jostleT > R.t || (by.side === "enemy") === (o.side === "enemy")) return; // (its own side's men get out of its way; it is the other side's it throws)
    og.jostleT = R.t + 0.8;
    const side = Math.sign(Math.sin(g.ca) * (og.z - g.z) - Math.cos(g.ca) * (og.x - g.x)) || 1, a = g.ca - side * 1.1;
    og.vx += Math.sin(a) * g.cv * 1.4; og.vz += Math.cos(a) * g.cv * 1.4;
    if (o.side !== "player" && !steady(o)) { og.stag = Math.max(og.stag || 0, 0.5); if (og.atk) cancel(o); }
    R.fx.push({ k: "jostle", uid: o.uid, by: by.uid });
  }
  // An arrow is loosed at where its man will be when it gets there, rises, and falls. It does not steer. (from: {x, z};
  // on: the man; v: its speed over the ground; wait: seconds before it leaves the string.) Returns its heading, and the
  // upward speed that brings it down to chest height at that range (R3.fly: gravity, and the height it leaves the bow at).
  const FLY = (R3.FLY = { g: 9.81, y0: 1.45, chest: 1.15 });
  const topOf = (u) => (u.g.kind === "elephant" ? 3.7 : u.g.car ? 2.7 : u.g.down > 0 ? 0.7 : 2.0);
  function aimAt(from, on, v, wait) {
    if (!on || !on.g) return null;
    const ovx = (on.g.wx || 0) + (on.g.vx || 0) * 0.4, ovz = (on.g.wz || 0) + (on.g.vz || 0) * 0.4; let tx = on.g.x, tz = on.g.z, T_ = 0;
    for (let k = 0; k < 3; k++) { T_ = Math.hypot(tx - from.x, tz - from.z) / v; tx = on.g.x + ovx * (T_ + (wait || 0)); tz = on.g.z + ovz * (T_ + (wait || 0)); }
    T_ = Math.max(0.02, Math.hypot(tx - from.x, tz - from.z) / v);
    return { a: Math.atan2(tx - from.x, tz - from.z), vy: (FLY.chest - FLY.y0 + 0.5 * FLY.g * T_ * T_) / T_ };
  }
  const flat = (v, d) => { const T_ = Math.max(0.02, d / v); return (FLY.chest - FLY.y0 + 0.5 * FLY.g * T_ * T_) / T_; }; // (the same for a range with no man at it)
  // The roll: a push off, a flight, a landing. Most of its ground is covered early and you come out of it still moving.
  // rollF(u): the share of the roll's ground covered when the share u of its time has gone (0..1).
  const ROLLC = 1 / (1 - PHYS.rollEase / 2 - PHYS.rollTau + PHYS.rollEase * PHYS.rollTau * PHYS.rollTau);
  const rollF = (u) => { const t = PHYS.rollTau, k = PHYS.rollEase, E = Math.exp(-u / t); return ROLLC * (u - (k * u * u) / 2 - t * (1 - E) + k * t * t * (1 - E) - k * t * u * E); };

  // ---------- The line ----------
  // A war or raid battle is not fought alone in an empty ring: a few soldiers of each host fight inside it, each with his
  // own man, and more come on from the ranks as they fall. They are the engine's own units (every blow is the engine's
  // blow), marked `line`. The fight is still decided by those the story names: when they fall, the line breaks. With no man
  // of your line left to face him, a soldier turns on you. They are taken off the roll before the fight is settled, so the
  // story reads the same fight it always did. Duels, sparring and the special kinds of fight have no line.
  const LINE_ART = /^war_|^fight_war_(field|chariot)|^fight_between_lines|^fight_night_torches|^fight_(arjuna|karna)_chariot|^fight_duryodhana_line|^fight_bhima_charge|^scene_day13|^battle_(night|border|cattle)|^scene_line_broken/;
  const NO_LINE = new Set(["e_last_stand", "cross_e_escape", "cross_e_duel"]);
  // (health on the field's own scale: a pair of them settles it in some twelve seconds, either way)
  R3.LINE = { hpMine: 16, atkMine: 3, hpTheirs: 32, atkTheirs: 5, dreamSecs: 56 };
  R3.lineFor = function (B) {
    const enc = B.enc, art = String(K.val(enc.art) || "");
    if (enc.dream) return { mine: 3, theirs: 3, more: [0, 99], every: 6, dream: true };
    if (K.val(enc.kind) || NO_LINE.has(enc.id) || !LINE_ART.test(art)) return null;
    const foes = B.units.filter((u) => u.side === "enemy"), allies = B.units.filter((u) => u.side === "ally");
    if (foes.length === 1 && !allies.length) return null; // a duel stays a duel
    return /^battle_(border|cattle)/.test(art) ? { mine: 2, theirs: 2, more: [2, 2], every: 9 } : { mine: 4, theirs: 4, more: [4, 4], every: 8 };
  };
  function lineName(R, side) {
    if (R.line.dream) return side === "enemy" ? "A soldier out of the dust" : "A soldier of your line";
    const first = R.B.units.find((u) => u.side === "enemy" && !u.line), n = String((first && (first.src || first.name)) || "");
    const mine = (K.S && K.S.side) || (/Pandava|Panchala|Matsya|Yadava/.test(n) ? "kaurava" : "pandava");
    return (side === "enemy") === (mine === "kaurava") ? "Pandava footsoldier" : "Kaurava spearman";
  }
  function addLine(R, side) {
    const B = R.B, L = R.line, foe = side === "enemy", name = lineName(R, side);
    const u = C.core.makeUnit({ name, hp: 10, atk: foe ? L.atkTheirs : L.atkMine, abilities: ["strike"], shield: false }, side, 200 + L.n++, B.enc);
    u.line = true; u.shield = false; u.shieldDrawn = false; u.lineHp = foe ? L.hpTheirs : L.hpMine;
    u.item = /spearman/.test(name) ? (K.rng() < 0.7 ? "spear" : "sword") : K.rng() < 0.55 ? "sword" : K.rng() < 0.8 ? "spear" : "mace";
    B.units.push(u);
    return u;
  }
  // More come on from the ranks as the line thins; in the dream they come faster and stronger the longer you stand.
  function lineStep(R) {
    const L = R.line; if (!L || R.t < L.next) return;
    const B = R.B, mine = living(B, "ally").filter((u) => u.line).length, theirs = living(B, "enemy").filter((u) => u.line).length;
    L.next = R.t + L.every * (0.8 + K.rng() * 0.4) * (L.dream ? Math.max(0.45, 1 - R.t / 80) : 1);
    const want = L.dream ? Math.min(7, 3 + Math.floor(R.t / 9)) : L.theirs;
    if (theirs < want && L.sent[1] < L.more[1]) { L.sent[1]++; if (L.dream) { L.hpTheirs = Math.round(22 * (1 + L.sent[1] * 0.07)); L.atkTheirs = Math.round(40 * (1 + L.sent[1] * 0.06)) / 10; } addLine(R, "enemy"); }
    if (mine < L.mine && L.sent[0] < L.more[0]) { L.sent[0]++; addLine(R, "ally"); }
  }
  // The engine's roll without the line: what the story reads when the fight is settled.
  function settle(R, out, rounds) { const B = R.B; clearDecoys(B); if (R.line && !R.lineOff) { R.lineOff = B.units.filter((u) => u.line); B.units = B.units.filter((u) => !u.line); } if (!B.over) C.settle(out, rounds); }

  // ---------- What each kind of man can do ----------
  // (owner, 13 November: "each hero should have their own unique characteristics. Even soldiers should have different
  // capabilities.") A named champion has traits of his own (engine/realtime.js). A common man has his trade's:
  //   spear    he sets his point at a man who runs straight at him, and strikes first; from the side he is as slow as any
  //   heavy    a mace, a club, an axe: his great blow comes through a raised shield and beats it down; he is long open after it
  //   skirm    a raider, a bandit, a scout: he works round to your back, strikes harder from there, and runs when badly hurt
  //   captain  while he stands his men rest less between blows and do not hang back; when he falls they reel and lose heart
  //   shield   a guard, a swordsman: most blows from the front fall on his shield, until it is broken or you get round him
  //   archer   he keeps his distance, and draws slowly with a man on top of him (as before)
  const CLASSES = [["captain", /captain|dented helmet/i], ["heavy", /mace champion|club-man|axeman|\bveteran\b/i], ["spear", /spear/i], ["skirm", /raider|bandit|scout|levies|cowherd/i], ["shield", /guard|bodyguard|sentry|swordsman|footsoldier/i]];
  R3.classOf = (u) => { if (!u || u.side !== "enemy" || u.hero || u.person || u.decoy || u.line) return null; /* (the men of the line fight their own men: plain soldiers) */ const n = String(u.src || u.name || ""); if (/elephant|\bcart$|Narayana weapon/i.test(n)) return null; for (const [k, re] of CLASSES) if (re.test(n)) return k; return null; };
  R3.CLASS_LINE = { spear: "Spearmen: they strike first at a man who runs straight at them. Come at their side", heavy: "A heavy weapon: his great blow beats down a raised shield. Roll clear, and strike while he recovers", skirm: "Skirmishers: they work round to your back, and run when they are hurt",
    captain: "A captain: his men do not hang back while he stands. Bring him down first", shield: "Shield-men: blows from the front fall on the shield. Get round them, or break it with a heavy blow", archer: "Archers: they keep their distance, and draw slowly with a man on top of them" };
  R3.CLASS_TAG = { spear: "Strikes first", heavy: "Breaks a guard", skirm: "Goes for your back", captain: "Rallies his men", shield: "Shield in front", archer: "Keeps away" };
  const leads = (c) => !!c.g && (c.g.cls === "captain" || who(c) === "kritavarma");   // (Kritavarma, who led the Narayani host, leads as a captain does)
  const led = (R, e) => living(R.B, "enemy").some((c) => c !== e && leads(c) && !c.g.flee && dist(c, e) < 8);   // a captain within call

  // ---------- Who each unit is, on the ground ----------
  function kindOf(u) {
    const n = String(u.src || u.name);
    if (/Narayana weapon/.test(n)) return "light";
    if (/elephant/i.test(n)) return "elephant";
    if (/\bcart$/i.test(n)) return "cart";
    return u.plural ? "squad" : "man";
  }
  function initUnit(R, u) {
    const B = R.B, foe = u.side === "enemy", kind = kindOf(u);
    const k = foe ? P.hpFoe : u.side === "player" ? P.hpFriend : P.hpAlly;
    u._tb = { hp: u.hp, maxHp: u.maxHp, atk: u.atk };
    u.maxHp = Math.max(1, Math.round(u.maxHp * k)); u.hp = Math.max(0, Math.round(u.hp * k));
    if (u.line) { u.maxHp = u.hp = u.lineHp; if (foe) u.atk = Math.round(u.atk * P.atkFoe * 10) / 10; }
    else if (foe) {
      const t2 = Object.assign({}, RT.IDS.has(B.enc.id) || B.enc.realtime === true ? RT.TUNE[B.enc.id] : null, R3.TUNE[B.enc.id] || {}), ft = K.S && K.S.fighter ? RT.FIGHTER[B.enc.id] : null;
      if (ft) { t2.hp = (t2.hp || 1) * ft; t2.atk = (t2.atk || 1) * ft; }
      if (t2.hp && !(B.enc.hold && u.hero)) { u.maxHp = Math.max(1, Math.round(u.maxHp * t2.hp)); u.hp = Math.max(0, Math.round(u.hp * t2.hp)); }
      u.atk = Math.round(u.atk * P.atkFoe * (t2.atk || 1) * R.D.atk * 10) / 10;
    }
    const ab = u.abilities || [], n = String(u.src || u.name);
    let weapon = u.side === "player" ? RT.weaponOf(u) : kind === "elephant" ? "tusk" : kind === "light" ? "fire" : RT.weaponOf(u);
    const ranged = ab.some((a) => RANGED.has(a));
    const archer = u.side !== "player" && kind !== "elephant" && (kind === "light" || (ranged && (/archer|chariot\b|chariot-|torch|bow/i.test(n) || !ab.some((a) => MELEE.has(a)) || weapon === "bow")));
    if (u.side !== "player" && (kind === "man" || kind === "squad")) { if (archer) weapon = "bow"; else if (weapon === "bow") weapon = "sword"; }
    const i = R.seen++, sideIdx = (R.sideSeen[foe ? "e" : "f"] = (R.sideSeen[foe ? "e" : "f"] || 0) + 1) - 1;
    u.g = {
      kind, x: 0, z: 0, a: foe ? 0 : Math.PI, weapon, reach: R3.REACH[weapon] || 1.8, archer, ranged, keep: archer ? P.keep : 0,
      rad: kind === "elephant" ? 1.9 : kind === "cart" ? 1.3 : kind === "squad" ? 0.95 : 0.42,
      speed: u.side === "player" ? P.run : (foe ? (archer ? P.archerRun : P.foeRun) : P.allyRun) * (kind === "squad" ? 0.92 : kind === "elephant" ? 1.15 : 1),
      windup: Math.max(0.3, (P.windup - Math.min(0.2, (u.atk || 0) * 0.006)) * R.D.wind),
      cool: foe ? rr(0.8, 1.9) : rr(0.3, 0.9), cd: {}, st: {}, down: 0, stag: 0, rec: 0, atk: null, entered: !foe, wave: 0, hits: [], bodies: u.plural ? 3 : 1, idx: i, sideIdx,
      vx: 0, vz: 0, wx: 0, wz: 0, lx: 0, lz: 0, cv: 0, orbit: K.rng() < 0.5 ? 1 : -1, moving: 0, busy: 0, blow: null
    };
    // The great archers fight from their chariots, as the epic has them: a wider body, a little faster over the ground.
    if (u.side !== "player" && !u.still && kind === "man" && weapon === "bow" && (/chariot/i.test(n) || ((u.hero || u.person) && K.S && K.S.act >= 6))) { u.g.car = true; u.g.rad = 1.25; u.g.speed *= 1.2; }
    // In a great man's car (enc.ride3, owner 13 Nov: "Krishna drives"): you stand on the deck with your bow and the charioteer takes the
    // car round the field on his own line. You do not steer: you aim, loose and brace.
    if (u.side === "player" && R.B.enc.ride3) { u.g.car = true; u.g.rad = 1.25; u.g.ride = { th: 0 }; }
    for (const [s, v] of Object.entries(u.status)) if (typeof v === "number") u.g.st[s] = v * ROUND;
    u.g.cls = R3.classOf(u) || (foe && archer && !u.hero && !u.person && !u.line && (kind === "man" || kind === "squad") ? "archer" : null);
    if (u.g.cls === "shield" && !archer) u.shield = true;   // (his trade's own)
    if (u.g.cls === "heavy" && !u.abilities.includes("heavy")) u.abilities = u.abilities.concat("heavy");   // (a club or an axe has a great blow, whoever swings it)
    if (foe && (u.shield || u.shieldDrawn) && u.sp == null) u.sp = P.shieldPts;
    if (u.leave != null) { u.g.leaveAt = R.t + Math.max(1, u.leave - B.round) * P.story; delete u.leave; }
  }
  function place(R) {
    const B = R.B, p = C.player(), rad = R.rad;
    p.g.x = 0; p.g.z = rad * 0.34; p.g.a = Math.PI;
    B.units.filter((u) => u.side === "ally" && !u.line).forEach((a, i) => {
      if (a.still) { a.g.x = 0; a.g.z = rad * 0.72; return; }
      const s = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      a.g.x = s * (3.0 + row * 2.2); a.g.z = rad * 0.34 + 0.3 + row * 1.0; a.g.a = Math.PI;
    });
    const foes = B.units.filter((u) => u.side === "enemy" && u.hp > 0 && !u.line), atOnce = Math.max(3, B.enc.atOnce || 3);
    foes.forEach((e, i) => {
      e.g.wave = i < atOnce ? 0 : 1;
      const n = Math.min(foes.length, atOnce), th = n > 1 ? ((i % atOnce) / (n - 1) - 0.5) * 1.3 : 0;
      const r = e.g.kind === "light" ? rad + 5 : e.g.wave ? rad + 3 + (i - atOnce) * 1.5 : e.g.archer ? rad * 0.78 : rad * 0.5;
      e.g.x = Math.sin(th) * r; e.g.z = -Math.cos(th) * r; e.g.a = 0;
      e.g.entered = !e.g.wave;
    });
    if (R.line) { // the line: man against man down both flanks, clear of the middle where the named fight
      const lane = (k) => (k % 2 ? 1 : -1) * (6.2 + Math.floor(k / 2) * 2.5), deep = R.line.dream ? 1.6 : 0;
      B.units.filter((u) => u.line && u.side === "ally").forEach((u, k) => { u.g.x = lane(k) + rr(-0.4, 0.4); u.g.z = 1.7 + deep + rr(-0.5, 0.5); u.g.a = Math.PI; });
      B.units.filter((u) => u.line && u.side === "enemy").forEach((u, k) => { u.g.x = lane(k) + rr(-0.4, 0.4); u.g.z = -1.9 - deep + rr(-0.5, 0.5); u.g.a = 0; u.g.entered = true; u.g.wave = 0; });
    }
  }
  // ---------- Their plan ----------
  // A war fight is not the same fight every time. The other side comes on in one of three ways, and you are not told
  // which: you read it from how they stand when the fight opens and how they move.
  //   the wall     their foot come on abreast behind locked shields. A blow at the front of the wall does half; from
  //                the side or behind it does more. Fell one and the wall is broken.
  //   the pincer   one hangs back in front of you while two go wide and come in behind.
  //   the charge   their champion comes straight for you while his men hold back and watch.
  // Once in each such fight a horn sounds and it turns, and you are given something to do against a count:
  //   (wall broken)  their banner stands open behind them: reach it and the host breaks; too slow and they rally
  //   (pincer shut)  one of them goes for the comrade beside you: strike him before he cuts your man down
  //   (the charge)   the champion offers single combat: take it and the rest stand off; beat him and they run
  // Fail the task in a fight against one of the epic's named men and the fight is lost. In any other, it costs you:
  // the next war fight is begun hurt. Under it all runs their host's spirit (R.morale): it falls as they fall, as a
  // divine weapon lands, as a task is done; at nothing they break and run, and low, their common men hesitate.
  // In such a fight a blow from behind a man does more and cannot be caught on his shield.
  const tier = (u) => (RT.tierOf ? RT.tierOf(u) : 0), common = (u) => !u.hero && !u.person && !u.decoy && !u.line && tier(u) < 1;
  function planFor(R, opts) {
    const B = R.B, enc = B.enc, rad = R.rad;
    if ((enc.plan === "bhishma" || CROSS[enc.id]) && !opts.noPlan) return bhishmaPlan(R);
    if (opts.noPlan || enc.noPlan || !K.S || K.S.act < 6 || (enc.hold && !HOLD_PLAN[enc.id] && !enc.plan3) || (enc.rounds && !enc.plan3) || enc.dream || R.kind || R.through || R.escort) return;
    const foes = B.units.filter((u) => u.side === "enemy" && u.hp > 0 && !u.line && u.g && !u.still), foot = foes.filter((u) => !u.g.archer && !u.g.car && (u.g.kind === "man" || u.g.kind === "squad")).concat(B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.line && u.g)); // (the named foot, and then the men of their line)
    if (foot.length < 3) return;
    const champ = foes.filter((u) => !u.plural && (u.g.kind === "man") && (u.hero || u.person || tier(u) >= 1 || u.g.car)).sort((a, b) => (b.hero ? 3 : b.person ? 2 : tier(b)) - (a.hero ? 3 : a.person ? 2 : tier(a)))[0] || null;
    const kinds = ["wall", "pincer"].concat(champ ? ["charge"] : []), want = opts.plan || R3.forcePlan || enc.plan3, kind = kinds.includes(want) ? want : kinds[Math.floor(K.rng() * kinds.length)];
    const pl = (R.plan = { kind, big: foes.some((u) => u.hero || u.person), champ: champ ? champ.uid : null, turned: false, n0: foes.length, alive: foes.length, in: 0 });
    R.morale = enc.rounds ? null : { theirs: 100 }; // (a wall the story says will not break has no spirit to break)
    const car = foes.filter((u) => u.g.car && !u.plural).sort((a, b) => (b.hero ? 2 : b.person ? 1 : 0) - (a.hero ? 2 : a.person ? 1 : 0))[0] || null; pl.car = car ? car.uid : null;
    const on = (u, x, z, role) => { u.g.x = x; u.g.z = z; u.g.a = 0; u.g.wave = 0; u.g.entered = true; u.g.role = role; };
    if (kind === "wall") { const w = foot.filter((u) => u !== champ || foot.length < 4).slice(0, 4); pl.wall = w.length; w.forEach((u, i) => { on(u, (i - (w.length - 1) / 2) * 1.5, -rad * 0.4, "wall"); u.g.slot = i - (w.length - 1) / 2; }); }
    else if (kind === "pincer") { const w = foot.filter((u) => u !== champ).concat(champ ? [champ] : []).slice(0, 3); on(w[0], 0, -rad * 0.46, "centre"); on(w[1], rad * 0.62, -rad * 0.42, "wing"); w[1].g.wing = 1; on(w[2], -rad * 0.62, -rad * 0.42, "wing"); w[2].g.wing = -1; }
    else { on(champ, 0, -rad * (champ.g.car ? 0.6 : 0.36), "champ"); foot.filter((u) => u !== champ).slice(0, 4).forEach((u, i) => on(u, (i % 2 ? 1 : -1) * 2.6, -rad * 0.5 - Math.floor(i / 2) * 1.5, "file")); }
    if (car && kind !== "pincer") foot.filter((u) => !u.g.role && u !== car).slice(0, 2).forEach((u, i) => { on(u, car.g.x + (i ? 1.9 : -1.9), car.g.z, "wguard"); u.g.wg = i ? 1 : -1; });
  }
  // The line under Bhishma (the ninth day). It is not a wait under arrows any more. His car makes three passes along
  // your front, loosing as it goes, and at the end of each the line in front of you gives way: men fall, and there is
  // nothing you can do for them. Then he turns his car at the gap where you stand, his wheel-guards beside him, and
  // drives for the far side. That is the battle: bar his way. Every blow or arrow of yours that lands on the car is
  // aimed at his banner; the first he turns aside, as he does; each after it checks the car and throws it back. Three
  // checks, or his charioteer reached while his guards are off the wheels, and he cannot get through: he turns his
  // car away down the line, and you have held. If the car gets past you, he has crossed, and the line is broken.
  // He is not beaten here either way: no one beats him before the tenth day.
  // The same fight is the shape of every day on which one of the great comes at your stretch of the line: Drona
  // driving for Yudhishthira's car, Bhima's charge, Arjuna's car against the sworn men. (Arjuna's charioteer is
  // Krishna: no one lays a hand on him, so against that car there is only the banner.)
  const CROSS = { bh_line9: 1, oath_king_hold: 1, hold_bhima: 1, hold_arjuna: 1, oath_arjuna_12: 1, oath_arjuna_16: 1, hold_karna: 1 }; // (Karna's chariot, pinned: "not to beat him: to be in his way")
  // Plain holds on the war days ("a gap in the line", "the outer ring"...) draw a plan like any other war fight.
  const HOLD_PLAN = { fs_sk_hold: 1, fs_d13_hold: 1, e_iravan: 1, e_kb_guard: 1, e_lake_hold: 1, e_lake_hold_deep: 1 };
  function bhishmaPlan(R) {
    const B = R.B, rad = R.rad, car = B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.g && !u.line && (u.hero || u.person)).sort((a, b) => (b.hero ? 1 : 0) - (a.hero ? 1 : 0))[0]; if (!car) return;
    const foes = B.units.filter((u) => u.side === "enemy" && u.hp > 0 && !u.line && u.g);
    R.plan = { kind: "bhishma", who: who(car) || "", noSarathi: who(car) === "arjuna", big: true, champ: car.uid, car: car.uid, turned: true, n0: foes.length, alive: foes.length, in: 0, pass: 0, side: 1, hits: 0, checks: 0, phase: "pass" };
    R.morale = { theirs: 100 };
    car.g.x = -rad * 0.72; car.g.z = -rad * 0.3; car.g.a = Math.PI / 2; car.g.wave = 0; car.g.entered = true; car.g.role = "bpass";
    B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.line && u.g).slice(0, 2).forEach((u, i) => { u.g.x = car.g.x + (i ? 1.9 : -1.9); u.g.z = car.g.z; u.g.entered = true; u.g.wave = 0; u.g.role = "wguard"; u.g.wg = i ? 1 : -1; });
  }
  // A great warrior's car has two men at its wheels (chakra-raksha). While either stands beside it, a blow at the car
  // from the front or side does less. In the pincer it is these two who are sent round you, which is what leaves the
  // charioteer open when the pincer shuts.
  const wheelGuards = (R) => { const pl = R.plan, c = pl && pl.car && R.B.units.find((u) => u.uid === pl.car); return c && c.hp > 0 ? living(R.B, "enemy").filter((u) => u.g && u.g.role === "wguard" && dist(u, c) < 4.5) : []; };
  // What a man with a part in the plan does this step. True when that was all he does.
  function roleStep(R, e, dt) {
    const B = R.B, p = C.player(), g = e.g, pl = R.plan, wh = wheeled(e), go = (x, z, k) => { const dx = x - g.x, dz = z - g.z, l = Math.hypot(dx, dz); if (l > 0.12) { goTo(R, e, dx, dz, g.speed * k * Math.min(1, wh ? l / 2.5 + 0.3 : l / 0.45), dt); g.moving = Math.min(1, k); } g.a = turnTo(g.a, l > 1.5 ? Math.atan2(dx, dz) : angTo(e, p), 6 * dt); return wh ? Math.max(0, l - 1.3) : l; }; // (a car is "there" a car's length short: it cannot stop on a point)
    if (g.role === "wall") {
      const w = living(B, "enemy").filter((u) => u.g && u.g.role === "wall");
      if (!R.B.enc.rounds /* (a wall the story says cannot be broken that day, Jayadratha's at the gate, closes up and stands) */ && (pl.broken || w.length <= pl.wall - 2 || w.length < 2 || R.t > 30)) { if (!pl.broken) { pl.broken = true; turn(R, "standard"); } g.role = null; g.sx = null; return false; }
      let cx = 0, cz = 0; for (const u of w) { cx += u.g.x; cz += u.g.z; } cx /= w.length; cz /= w.length;
      const nx = p.g.x - cx, nz = p.g.z - cz, nl = Math.hypot(nx, nz) || 1, ux = nx / nl, uz = nz / nl, off = Math.max(0, nl - (g.reach * 0.9 + 0.2)), adv = Math.min(off, 1.15 * dt * 60 * 0.0167 * 60 > 0 ? off : off); void adv;
      g.sx = cx + ux * Math.min(off, 1.2) + uz * g.slot * 1.5; g.sz = cz + uz * Math.min(off, 1.2) - ux * g.slot * 1.5; g.sa = Math.atan2(ux, uz);
      return false; }
    if (g.role === "wing") { const bx = p.g.x, bz = p.g.z + 3.4, out = Math.abs(g.x - p.g.x) < 5.5 && g.z < p.g.z - 1, l = out ? (go(p.g.x + g.wing * 8, g.z + 2, 0.8), 9) : go(bx + g.wing * 4.6, bz, 0.8); if (l < 1.4 || R.t > 14) { g.role = null; pl.in++; if (pl.in >= 2 || R.t > 14) turn(R, "raid"); return false; } return true; } // (wide round your flank first, then in behind)
    if (g.role === "centre") { if (pl.in >= 1 || R.t > 14 || e.hp < e.maxHp * 0.6) { g.role = null; return false; } const a = angTo(p, e); go(p.g.x + Math.sin(a) * 6.5, p.g.z + Math.cos(a) * 6.5, 0.6); return true; }
    if (g.role === "champ") { if (dist(e, p) <= hitReach(e) + 0.5 || R.t > 8) { g.role = null; pl.charged = R.t; return false; } go(p.g.x, p.g.z, 1.75); return true; }
    if (g.role === "file") { if ((pl.charged != null && R.t > pl.charged + 3) || R.t > 11 || e.hp < e.maxHp * 0.7) { g.role = null; return false; } const a = angTo(p, e); go(p.g.x + Math.sin(a) * 7.5, p.g.z + Math.cos(a) * 7.5, 0.5); return true; }
    if (g.role === "ring") { if (!R.duel) { g.role = null; return false; } const c = B.units.find((u) => u.uid === R.duel.uid) || p, a = angTo(c, e); go(c.g.x + Math.sin(a) * 7, c.g.z + Math.cos(a) * 7, 0.7); if (g.atk) cancel(e); return true; }
    if (g.role === "bpass" || g.role === "bcross") {
      if (g.cool <= 0 && !g.atk && onField(R, e) && R.t >= (g.shotAt || 2.5)) { const t = pickTarget(R, e); if (t) { g.shotAt = R.t + (g.role === "bpass" ? 5.5 : 4.5); startAttack(R, e, t); return true; } } // he looses as he drives, and does not stop for long
      if (g.role === "bpass") { const l = go(pl.side * R.rad * 0.72, -R.rad * 0.24, 1.25);
        if (l < 1.6 || R.t - (pl.t0 || 0) > 9) { pl.pass++; pl.side = -pl.side; pl.t0 = R.t; // the end of a pass: the line in front of you gives way
          const fell = living(B, "ally").filter((a) => a.line && a.g).sort((a, b) => a.g.z - b.g.z).slice(0, 2); fell.forEach((a) => { a.hp = 0; }); R.fx.push({ k: "lineFalls", n: pl.pass, fell: fell.map((a) => a.uid) });
          if (pl.pass >= 3) { g.role = "bcross"; pl.phase = "cross"; R.lock = e.uid; g.struck = false; R.task = { kind: "bar", uid: e.uid, until: R.t + 999, held: 0 }; R.fx.push({ k: "turn", kind: "bar", uid: e.uid, task: R.task }); } }
        return true; }
      go(p.g.x * 0.35, R.rad - 1.2, 0.34);
      if (g.z >= R.rad - 2.4) { pl.phase = "crossed"; R.task = null; R.fx.push({ k: "crossed", uid: e.uid }); end(R, "lose"); }
      return true; }
    if (g.role === "wguard") { const c = B.units.find((u) => u.uid === pl.car); if (!c || c.hp <= 0) { g.role = null; return false; }
      if (dist(p, c) < 4.2 || dist(p, e) < 2.6) return false; // you have come at the car: he fights
      { const ca = c.g.ca != null ? c.g.ca : c.g.a; go(c.g.x + Math.cos(ca) * g.wg * 1.9, c.g.z - Math.sin(ca) * g.wg * 1.9, Math.max(1.1, Math.min(1.8, ((c.g.cv || 0) / g.speed) * 1.15))); } return true; } // (they keep to his wheels at whatever pace he drives)
    if (g.role === "raider") { const A = B.units.find((u) => u.uid === g.on); if (!A || A.hp <= 0 || !R.task) { g.role = null; return false; } g.tgt = A.uid; return false; }
    return false;
  }
  // Their captain is down: the common men who stood within his call reel, and hang back a while; their host's spirit falls.
  function captainDown(R, c) { let n = 0; for (const u of living(R.B, "enemy")) if (u.g && common(u) && dist(u, c) < 9) { u.g.stag = Math.max(u.g.stag || 0, P.captainReel); u.g.cool = Math.max(u.g.cool || 0, 1.6); if (u.g.atk) cancel(u); n++; } if (!(R.plan && R.plan.champ === c.uid)) spirit(R, -25); /* (where he was their champion, his fall has already told on their spirit) */ R.fx.push({ k: "captainDown", uid: c.uid, n }); tip(R, "c_captain"); }
  // ---------- A man to take (owner, 13 November: "change the guard the flag or capture the pole to something like capture
  // one of the Kaurava brothers or a small king of the other side: that leads to morale lowering") ----------
  // When their wall is broken it is no longer a banner on a pole that stands open behind it. A man of name is cut off from
  // his men: one of Duryodhana's brothers or a lesser king of his host if you fight for the Pandavas, a prince or a lesser
  // king of theirs if you fight for him. Bring him down inside the count and he is taken, alive, and carried to the rear:
  // their host's spirit falls by captureSpirit (which breaks a host already shaken). Too slow, and his men bring him off,
  // and they rally as they did round a banner saved. No man is taken twice in a life (a flag keeps the names).
  R3.CAPTIVES = {
    pandava: [["vikarna", "Vikarna, a Kaurava prince", "dushasana"], ["susharma", "Susharma, king of Trigarta", "jayadratha"], ["durmukha", "Durmukha, a Kaurava prince", "dushasana"], ["sudakshina", "Sudakshina, king of the Kambojas", "shalya"],
      ["chitrasena", "Chitrasena, a Kaurava prince", "dushasana"], ["vinda", "Vinda, a king of Avanti", "jayadratha"], ["vivimshati", "Vivimshati, a Kaurava prince", "dushasana"], ["brihadbala", "Brihadbala, king of Kosala", "shalya"],
      ["durmarshana", "Durmarshana, a Kaurava prince", "dushasana"], ["anuvinda", "Anuvinda, a king of Avanti", "jayadratha"]],
    kaurava: [["yudhamanyu", "Yudhamanyu, a prince of Panchala", "dhrishtadyumna"], ["dhrishtaketu", "Dhrishtaketu, king of Chedi", "uttara"], ["uttamaujas", "Uttamaujas, a prince of Panchala", "dhrishtadyumna"], ["chekitana", "Chekitana of the Vrishnis", "satyaki"],
      ["shatanika", "Shatanika, a prince of Matsya", "uttara"], ["kuntibhoja", "Kuntibhoja, the old king", "virata"], ["satyajit", "Satyajit, a prince of Panchala", "dhrishtadyumna"], ["purujit", "Purujit, Kunti's brother", "drupada"]]
  };
  R3.captiveFor = (S = K.S) => { const list = S && R3.CAPTIVES[S.side]; if (!list) return null; const f = S.flags || []; const c = list.find((x) => !f.includes("took_" + x[0])); return c ? { id: c[0], name: c[1], look: c[2] } : null; };
  function captive(R, car) {
    const B = R.B, who = B.enc.rounds || B.enc.dream || B.enc.noCaptive ? null : R3.captiveFor(K.S); if (!who) return null;
    const men = B.units.filter((u) => u.side === "enemy" && !u.line && u._tb && !u.hero && !u.person), ref = men.length ? men : B.units.filter((u) => u.side === "enemy" && u._tb && !u.line);
    const least = (f) => (ref.length ? Math.min(...ref.map(f)) : 0);   // (measured against the least of the men of this fight as they stand on this field: what tests you is the count, not his arm)
    const u = C.core.makeUnit({ name: who.name, hp: 20, atk: 6, abilities: ["strike"], shield: false }, "enemy", 300 + (R.capN = (R.capN || 0) + 1), B.enc);
    u.captive = who.id; u.look3 = who.look; u.tier = 0; u.item = "sword"; u.shield = false; u.shieldDrawn = false;   // (a man of rank and a fair fighter, but alone, and there is a count: he carries no shield to hide behind)
    B.units.push(u); initUnit(R, u);
    // (…and where their men are few and each is strong, a share of the whole of them instead: on the road to Jayadratha two
    // men stand, and a third at eight-tenths of the lesser made the fight half as long again and lost the bot one life in three)
    const whole = (f) => ref.reduce((s, m) => s + f(m), 0) * P.captiveShare;
    if (ref.length) { u.maxHp = u.hp = Math.max(1, Math.round(Math.min(least((m) => (m.plural && m.g ? m.maxHp / (m.g.bodies || 1) : m.maxHp)) * P.captiveHp, whole((m) => m.maxHp)))); u.atk = Math.round(Math.min(least((m) => m.atk) * 0.9, whole((m) => m.atk)) * 10) / 10; }
    const g = u.g; g.x = car ? clamp(car.g.x + (car.g.x > 0 ? -2.6 : 2.6), -R.rad + 2, R.rad - 2) : 0; g.z = car ? car.g.z : -R.rad + 2.2; g.a = 0; g.entered = true; g.wave = 0; g.cls = null; g.cool = 1.2;
    return u;
  }
  function rout(R) { if (R.routed || R.B.enc.rounds) return; R.routed = true; let n = 0; for (const u of living(R.B, "enemy")) if (u.g && (common(u) || u.line) && !u.g.car && !u.g.flee) { u.g.flee = R.t + 1.6 + n * 0.15; u.g.burnUntil = 0; u.g.role = null; cancel(u); n++; } if (R.morale) R.morale.theirs = 0; R.fx.push({ k: "rout", n }); }
  // A host whose spirit is down to two-fifths is shaken: every man of theirs is slower to come on again (shakenRest on the
  // rest between his blows) until it rises, so that a man taken tells in the fight at once and not only at the rout.
  function spirit(R, d) { if (!R.morale || R.routed) return; if (d < 0 && R.stance) d *= R.stance === "centre" ? P.centreSpirit : R.stance === "hold" ? P.holdSpirit : 1; R.morale.theirs = clamp(R.morale.theirs + d, 0, 100); if (R.morale.theirs <= 0) return rout(R); const sh = R.morale.theirs <= P.shaken; if (sh !== !!R.shaken) { R.shaken = sh; R.fx.push({ k: sh ? "shaken" : "rallied" }); } }
  // ---------- Your own plan (owner, 13 November: "allow for more strategic thinking"; "have the strategy of foe side and
  // friend side be more visible") ----------
  // Before a war fight that has a plan against you, you choose how your side fights it. Each way has its gain and its
  // price, and each is the answer to one of their three plans:
  //   hold    your men keep close about you: blows that come at your back fall lighter (holdBack); but their host's
  //           spirit falls more slowly (holdSpirit). The answer to the pincer: its wings find your men where your back was.
  //   flank   your men go wide, for their archers and their rear: their archers rest longer between shots (flankRest);
  //           but your men begin the fight away from your side. The answer to the wall: it is taken in the side.
  //   centre  you go straight in with your men at your heels: their spirit falls faster (centreSpirit); but blows at your
  //           back fall harder (centreBack). The answer to the champion's charge: he is met, not waited for.
  // Their plan answered: their spirit begins lower by metSpirit, and the turn's task has metSecs more on its count.
  // What your scouts say of their plan is sure only with the wit for it (wisdom and statecraft together, scoutSure or
  // more): otherwise they name two plans, one of them the true one. How they stand on the field is always the truth.
  R3.spirit = spirit;
  R3.STANCES = ["hold", "flank", "centre"]; R3.ANSWER = { pincer: "hold", wall: "flank", charge: "centre" };
  R3.scouts = function (R) {
    const pl = R.plan; if (!pl || !R3.ANSWER[pl.kind]) return null;
    if (pl.scouts) return pl.scouts;
    const wit = (K.attr ? K.attr("wisdom") || 0 : 0) + ((K.S && K.S.skills && K.S.skills.statecraft) || 0), sure = wit >= P.scoutSure, others = Object.keys(R3.ANSWER).filter((k) => k !== pl.kind);
    return (pl.scouts = { sure, kinds: sure ? [pl.kind] : (K.rng() < 0.5 ? [pl.kind, K.pick(others)] : [K.pick(others), pl.kind]) });
  };
  R3.stance = function (R, id) {
    const pl = R.plan; if (!pl || !R3.ANSWER[pl.kind] || !R3.STANCES.includes(id) || R.stance || R.t > 0.5) return false;
    R.stance = id; R.met = R3.ANSWER[pl.kind] === id;
    if (R.met && R.morale) R.morale.theirs = Math.max(1, R.morale.theirs - P.metSpirit);
    if (id === "flank") { const B = R.B, as = B.units.filter((u) => u.side === "ally" && !u.line && u.g && !u.still); as.forEach((a, i) => { a.g.x = (i % 2 ? 1 : -1) * R.rad * 0.72; a.g.z = -R.rad * (0.05 + 0.12 * Math.floor(i / 2)); }); }   // (wide, and level with their line: on their way round it)
    R.fx.push({ k: "stance", id, met: R.met });
    return true;
  };
  function turn(R, kind) {
    const B = R.B, pl = R.plan, p = C.player(); if (!pl || pl.turned || R.routed) return;
    if (R.t < 9) { pl.pending = kind; return; } pl.turned = true; pl.pending = null; // (never in the first breaths of a fight)
    if (kind === "raid") { const A = living(B, "ally").filter((a) => !a.line && a.g && !a.still).sort((a, b) => (b.person || b.called ? 1 : 0) - (a.person || a.called ? 1 : 0) || dist(a, p) - dist(b, p))[0];
      const r = A && living(B, "enemy").filter((u) => u.g && !u.line && !u.g.archer && !u.g.car && u.g.entered && !u.g.flee).sort((a, b) => dist(a, A) - dist(b, A))[0];
      if (!A || !r) kind = "standard"; else { r.g.role = "raider"; r.g.on = A.uid; R.lock = r.uid; R.task = { kind, uid: r.uid, on: A.uid, until: R.t + 12 }; } }
    const car = pl.car && B.units.find((u) => u.uid === pl.car && u.hp > 0 && u.g);
    // With a great car on the field the tasks are the epic's own: cut down the banner that flies over it (any blow or
    // arrow of yours that lands on the car), or get to its charioteer while its wheel-guards are away.
    if (kind === "raid" && car && R.task) { const on = R.task.on, r0 = B.units.find((u) => u.uid === R.task.uid); if (r0 && r0.g) r0.g.role = null; kind = "sarathi"; R.lock = car.uid; R.task = { kind, uid: car.uid, on, until: R.t + 15, held: 0 }; }
    if (kind === "standard") { const c = captive(R, car); if (c) { kind = "capture"; R.lock = c.uid; R.task = { kind, uid: c.uid, who: c.captive, until: R.t + P.captureSecs }; } }
    if (kind === "standard" && car) { kind = "banner"; car.g.struck = false; R.lock = car.uid; R.task = { kind, uid: car.uid, until: R.t + 18 }; }   // (with no one left to take in this life: the banner over the car, the banner on its pole)
    if (kind === "standard") R.task = { kind, x: 0, z: -R.rad + 1.6, r: 1.9, until: R.t + 18, held: 0 };
    if (kind === "duel") { const c = B.units.find((u) => u.uid === pl.champ); if (!c || c.hp <= 0) return; R.offer = { kind, uid: c.uid, n: 0 }; }
    if (R.met && R.task && R.task.until) R.task.until += P.metSecs;   // (their plan answered: you have longer)
    R.fx.push({ k: "turn", kind, task: R.task || null, uid: R.task ? R.task.uid : pl.champ, on: R.task ? R.task.on : null });
  }
  function taskOver(R, won) {
    const B = R.B, T_ = R.task, pl = R.plan; R.task = null; if (!T_) return;
    R.fx.push({ k: won ? "taskDone" : "taskFail", kind: T_.kind, big: !!pl.big });
    if (won) { const c = B.units.find((u) => u.uid === T_.uid);
      if (T_.kind === "capture") { if (K.S && K.S.flags && !K.S.flags.includes("took_" + T_.who)) K.S.flags.push("took_" + T_.who); for (const u of living(B, "enemy")) if (u.g && common(u)) { u.g.stag = Math.max(u.g.stag || 0, 0.7); u.g.cool = Math.max(u.g.cool || 0, 1.4); } spirit(R, -P.captureSpirit); }
      else if (T_.kind === "standard" || T_.kind === "banner") rout(R);
      else if (T_.kind === "sarathi" && c && c.g) { c.g.speed *= 0.12; c.g.stag = Math.max(c.g.stag || 0, 3); c.g.noDriver = true; cancel(c); spirit(R, -40); }
      else spirit(R, -30);
      return; }
    if (T_.kind === "capture") { const c = B.units.find((u) => u.uid === T_.uid); if (c && c.hp > 0 && c.g) { c.g.flee = R.t + 2.6; c.g.role = null; if (c.g.atk) cancel(c); } }   // (his men bring him off)
    if (T_.kind === "standard" || T_.kind === "banner" || T_.kind === "capture") { for (const u of living(B, "enemy")) if (u.g && common(u)) u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.25)); }
    else { const A = B.units.find((u) => u.uid === T_.on); if (A && A.hp > 0) { A.hp = 0; R.fx.push({ k: "cutDown", uid: A.uid }); } }
    spirit(R, 25);
    if (pl.big) end(R, "lose"); else if (K.S && K.S.flags && !K.S.flags.includes("war_setback")) K.S.flags.push("war_setback");
  }
  // The wheel in the earth (enc.wheel3: a person; the seventeenth day). His car stands with one wheel sunk to the axle
  // and he is down beside it with both hands on the rim, his bow on the deck. He does not fight and is not beaten here:
  // the arrow that ends him is Arjuna's, when the count is out. Across the field from you (he is of the other side) his
  // guards stand between and no blow reaches him until you have chosen to strike him; behind you (he is of yours) he is
  // what you keep whole. R.wheel: where the wheel is, and which way the car stands (the view draws it from this).
  function wheelSetup(R) {
    const B = R.B, enc = B.enc; if (!enc.wheel3) return;
    const k = B.units.find((u) => u.person === enc.wheel3 && u.g); if (!k) return;
    if (k.side === "enemy") { R.wheel = { x: 1.5, z: -R.rad * 0.5, ca: -Math.PI / 2, uid: k.uid }; k.g.x = R.wheel.x; k.g.z = R.wheel.z + 0.85; k.g.a = Math.PI; k.g.apart = true; k.g.entered = true; k.g.wave = 0; k.g.role = null; if (R.plan) R.plan.turned = true; } // (no horn here: the day has its own turn)
    else { R.wheel = { x: k.g.x, z: k.g.z + 0.85, ca: Math.PI / 2, uid: k.uid }; k.g.a = 0; }
    k.g.car = false; k.g.rad = 0.42;
  }
  // What the story asks you in the fight (enc.asks3; enc.order3 is one of these). Each is a card with two answers, and
  // comes at its round, or sooner when you come within `near` metres of the man (or the wheel) it is about. yes may set
  // you a thing to do against a count: task "strike" (the first, Drona's order: land a blow on him), "heave" (stand at
  // the wheel, hands on it, for `need` seconds in all: you cannot guard while you do), or nothing; `end` ends the
  // fight there. How each came out is told to the view (fx orderDone: obey, miss, refuse), which keeps it for the story.
  const asksOf = (enc) => enc.asks3 || (enc.order3 ? [enc.order3] : []);
  const askNow = (R) => (R.order ? asksOf(R.B.enc)[R.order.i] : null);
  const askOpen = (R) => !!R.offer || !!(R.order && (R.order.state === "asked" || R.order.state === "doing"));
  const askAt = (R, a) => (a.at === "wheel" ? R.wheel : null) || (() => { const t = R.B.units.find((u) => u.person === a.on && u.g && u.hp > 0); return t ? t.g : null; })();
  function askStep(R, late) {
    const B = R.B, list = asksOf(B.enc); if (!list.length || R.noPlan || R.over || askOpen(R) || R.frozen > 0 || R.duel) return false;
    R.asked = R.asked || {}; const p = C.player();
    for (let i = 0; i < list.length; i++) { const a = list[i]; if (R.asked[i]) continue;
      const at = askAt(R, a), near = a.near && at && Math.hypot(p.g.x - at.x, p.g.z - at.z) <= a.near;
      if (!(near || (a.round && B.round >= a.round) || late)) continue;
      const t = a.on ? B.units.find((u) => u.person === a.on && u.hp > 0) : null; if (a.on && !t) { R.asked[i] = true; continue; }
      R.asked[i] = true; R.order = { i, uid: t ? t.uid : null, state: "asked", held: 0 }; R.offer = { kind: "order", uid: t ? t.uid : null, n: 0, i }; R.fx.push({ k: "ask", uid: t ? t.uid : null, i }); return true; } // ("ask", not "order": that word is already the mark over a comrade who strikes at your word, and the card never showed while the two shared it)
    return false;
  }
  function askDone(R, how) { const o = R.order, a = askNow(R); if (!o || !a) return; o.state = how; R.heave = false;
    if (a.task === "strike" || !a.task) { const t = R.B.units.find((u) => u.uid === o.uid); if (t && t.g && R.B.enc.wheel3 && t.person === R.B.enc.wheel3) { t.g.apart = true; if (R.lock === t.uid) R.lock = null; } }
    R.fx.push({ k: "orderDone", how, uid: o.uid, i: o.i }); }
  // The banner-bearer (enc.bearer): the man who carried your host's banner is down and you have taken it up. While it
  // stands your side holds. Its bar falls as your men fall and each time you are struck, and rises as theirs fall;
  // at nothing the banner is down and the fight is lost. You fight with one hand (blows at four-fifths weight).
  // The steps of a day the epic has fixed (enc.beats with `stop: person`): for one round the man about to do the
  // thing is named, and a blow of yours on him in that time spoils his stroke. The thing is done all the same (it
  // is written), but the friend it is done to takes heart, and it is counted to you.
  function storyHit(R, t) {
    if (R.step3 && !R.step3.hit && t.uid === R.step3.uid) { R.step3.hit = true; stepClose(R); }
    if (R.order && R.order.state === "doing" && t.uid === R.order.uid && (askNow(R).task || "strike") === "strike") askDone(R, "obey");
  }
  function stepClose(R) {
    const B = R.B, s3 = R.step3; if (!s3) return; R.step3 = null;
    const at = B.log.length, u = (s3.beat.run && s3.beat.run(B)) || {}; B.log.splice(at, 0, { key: s3.beat.text, u, ev: true, art: s3.beat.art3 || null });
    beatItem(R, s3.beat);
    if (s3.hit) { R.held = (R.held || 0) + 1; for (const a of living(B, "ally")) if (!a.line && a.person) { a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.12)); B.status(a, "inspired", 2); } R.fx.push({ k: "stepHeld", uid: s3.uid, n: R.held }); }
    R.fx.push({ k: "event", at });
  }
  // A change of weapon the story makes in a man's hands (beat.item3: [person, item]): seen, and fought with.
  // (item3: [person, what is seen in his hand, the weapon he fights as]; down3: person: his car is lost under him and he fights on foot.)
  function beatItem(R, beat) {
    const dn = beat && beat.down3, d = dn && R.B.units.find((x) => x.person === dn && x.hp > 0 && x.g && x.g.car);
    if (d) { d.g.car = false; d.g.rad = 0.42; d.g.ca = null; R.fx.push({ k: "dismount", uid: d.uid }); }
    const it = beat && beat.item3; if (!it) return; const u = R.B.units.find((x) => x.person === it[0] && x.hp > 0 && x.g); if (!u) return;
    u.g.weapon = it[2] || it[1]; if (it[1] !== "bow") u.g.archer = false; R.fx.push({ k: "item", uid: u.uid, item: it[1], shield: it[3] });
  }
  // The elephant (enc.mahout3): there is no fighting the beast, but come at it from the side, inside its turn, and you
  // can get at the mahout's leg with whatever is in your hand. Three times, and he turns it out of your division.
  function mahoutStep(R) {
    const B = R.B; if (!B.enc.mahout3 || R.over) return; const e = living(B, "enemy").find((u) => u.g && u.g.kind === "elephant"); if (!e) return;
    const p = C.player(), m = R.mahout || (R.mahout = { n: 0, at: 0 }); if (R.t < m.at || p.hp <= 0) return;
    const d = dist(p, e), off = Math.abs(adiff(angTo(e, p), e.g.a));
    if (d <= e.g.rad + 1.5 && off > 1.2) { m.n++; m.at = R.t + 5; e.g.stag = Math.max(e.g.stag || 0, 3.5); cancel(e); R.fx.push({ k: "mahout", uid: e.uid, n: m.n });
      if (m.n >= 3) { B.say("The mahout has had enough. He turns the beast out of your division."); end(R, "win"); } }
  }
  function storyStep(R) {
    mahoutStep(R);
    if (R.step3 && R.t >= R.step3.until) stepClose(R);
    const o = R.order, a = askNow(R);
    if (o && o.state === "doing" && a.task === "heave" && R.wheel) { // hands on the wheel: it counts while you stand at it and do nothing else, and Arjuna's arrows find whoever is there
      const p = C.player(), g = p.g, at = Math.hypot(g.x - R.wheel.x, g.z - R.wheel.z) <= 2.3 && !R.block && !(R.roll > 0) && !g.blow && !g.atk && !(g.stag > 0) && !(g.down > 0) && p.hp > 0;
      R.heave = at;
      if (at) g.a = turnTo(g.a, Math.atan2(R.wheel.x - g.x, R.wheel.z + (R.wheel.ca > 0 ? 1 : -1) - g.z), 9 * STEP); // (you face what you are lifting)
      if (at) { o.held += STEP; o.at = true; if (R.t >= (o.arrowAt || 0)) { if (o.arrowAt) { const n = Math.max(1, Math.round(p.maxHp * 0.055)); p.hp = Math.max(0, p.hp - n); R.stats.taken += n; R.fx.push({ k: "wheelArrow", uid: p.uid, n }); } o.arrowAt = R.t + (o.arrowAt ? 2.8 : 1.6); } }
      if (o.held >= (a.need || 6)) askDone(R, "obey"); }
    if (o && o.state === "doing" && R.t >= o.until) askDone(R, "miss");
    askStep(R, R.wheel && !living(R.B, "enemy").some((u) => !u.line && !u.still)); // (and with no one left between, the question is put at once)
  }
  function bearerStep(R) {
    const B = R.B; if (!(B.enc.bearer || B.enc.nerve3) || R.over) return; /* nerve3: the same bar with no banner in your hand, your own line's nerve */ const p = C.player(), al = living(B, "ally").length, en = living(B, "enemy").length;
    if (!R.ours) { R.ours = { v: 100, al, en, hp: p.hp }; return; }
    const o = R.ours; let d = 0;
    if (al < o.al) d -= 7 * (o.al - al); if (en < o.en) d += 10 * (o.en - en); if (p.hp < o.hp) d -= Math.min(8, 2 + 36 * (o.hp - p.hp) / Math.max(1, p.maxHp));
    o.al = al; o.en = en; o.hp = p.hp;
    if (d) { o.v = clamp(o.v + d, 0, 100); if (d <= -7) R.fx.push({ k: "bannerSways", v: o.v }); }
    if (o.v <= 0 && !o.down) { o.down = true; R.fx.push({ k: "bannerDown" }); B.say(B.enc.bearer ? "The banner goes down, and the line goes with it." : "The line breaks and runs, and you are carried back with it."); end(R, "lose"); }
  }
  function planStep(R) {
    const B = R.B, pl = R.plan, p = C.player(); if (!pl || R.over) return;
    if (pl.pending && R.t >= 9) turn(R, pl.pending);
    if (pl.kind === "bhishma") { const c = B.units.find((u) => u.uid === pl.car), T_ = R.task; if (!c || !T_ || T_.kind !== "bar") return;
      const held = (why) => { pl.phase = "held"; pl.done = true; R.task = null; c.g.role = null; c.g.stag = 3; R.fx.push({ k: "barred", uid: c.uid, why }); B.say(B.enc.holdText || "You held."); end(R, "win"); };
      if (c.g.struck) { c.g.struck = false; pl.hits++;
        if (pl.hits === 1) R.fx.push({ k: "defended", uid: c.uid });
        else if (R.t < (pl.checkAt || 0)) { /* (one check to a breath: a flurry is one blow) */ }
        else { pl.checks++; pl.checkAt = R.t + 1.4; c.g.stag = Math.max(c.g.stag || 0, 1.3); cancel(c); c.g.cv = 0; c.g.vz -= 2.4 * PHYS.fric; /* (thrown back on its haunches: it rolls back two paces, and does not jump there) */ R.fx.push({ k: "checked", uid: c.uid, n: pl.checks }); if (pl.checks >= 3) return held("banner"); } }
      if (!pl.noSarathi && dist(p, c) <= c.g.rad + 1.25 && !wheelGuards(R).length) { T_.held += STEP; if (T_.held >= 1) return held("sarathi"); } else T_.held = Math.max(0, T_.held - STEP);
      return; }
    const foes = living(B, "enemy").filter((u) => !u.line && !u.g.flee), n = foes.length;
    if (n < pl.alive) { const lost = pl.alive - n; pl.alive = n; if (!R.routed) spirit(R, -lost * Math.max(12, 70 / pl.n0)); if (!foes.some((u) => u.uid === pl.champ) && pl.champ && !pl.champDown) { pl.champDown = true; spirit(R, -30); } }
    if (pl.kind === "charge" && !pl.turned && pl.charged != null) { const c = B.units.find((u) => u.uid === pl.champ); if (c && c.hp > 0 && (c.hp <= c.maxHp * 0.65 || R.t > pl.charged + 9) && n > 1) turn(R, "duel"); }
    if (R.duel) { const c = B.units.find((u) => u.uid === R.duel.uid); if (!c || c.hp <= 0) { R.duel = null; R.fx.push({ k: "duelWon" }); rout(R); } }
    const T_ = R.task; if (!T_) return;
    if (T_.kind === "capture") { const c = B.units.find((u) => u.uid === T_.uid); if (!c || c.hp <= 0) { if (c) c.taken = true; taskOver(R, true); } else if (R.t >= T_.until) taskOver(R, false); }
    else if (T_.kind === "banner") { const c = B.units.find((u) => u.uid === T_.uid); if (!c || c.hp <= 0 || c.g.struck) { if (c && c.g) c.g.struck = false; taskOver(R, true); } else if (R.t >= T_.until) taskOver(R, false); }
    else if (T_.kind === "sarathi") { const c = B.units.find((u) => u.uid === T_.uid);
      if (!c || c.hp <= 0) taskOver(R, true); else if (dist(p, c) <= c.g.rad + 1.25) { T_.held += STEP; if (T_.held >= 1) taskOver(R, true); } else { T_.held = Math.max(0, T_.held - STEP); if (R.t >= T_.until) taskOver(R, false); } }
    else if (T_.kind === "standard") { if (Math.hypot(p.g.x - T_.x, p.g.z - T_.z) <= T_.r) { T_.held += STEP; if (T_.held >= 1.5) taskOver(R, true); } else { T_.held = Math.max(0, T_.held - STEP); if (R.t >= T_.until) taskOver(R, false); } } // (stand at it a breath and a half to pull it down)
    else { const r = B.units.find((u) => u.uid === T_.uid), A = B.units.find((u) => u.uid === T_.on);
      if (!r || r.hp <= 0 || r.g.struck) { if (r && r.g) { r.g.role = null; r.g.struck = false; } taskOver(R, true); } else if (!A || A.hp <= 0 || R.t >= T_.until) taskOver(R, false); }
  }
  R3.begin = function (B, opts) {
    opts = opts || {};
    const kind = K.val(B.enc.kind) || null;
    const R = { noPlan: !!opts.noPlan, B, t: 0, n: 0, seen: 0, sideSeen: {}, over: null, tries: opts.tries || 0, fx: [], shots: [], shotN: 0, slow: 0, doT: ROUND, rad: opts.rad || P.rad,
      orders: { friend: "balanced", soldiers: "defend" }, breath: P.breathMax, combo: 0, comboT: -9, buffer: false, roll: 0, rollT: -9, rdx: 0, rdz: -1, block: false, blockT: -9, winded: false,
      kneel: 0, skillCd: 0, herbCd: 0, salve: null, unseen: 0, double: false, haste: 0, frozen: 0, assist: !!opts.assist, lock: null, kind,
      stats: { blows: 0, hits: 0, rolls: 0, dodged: 0, perfect: 0, blocks: 0, blocked: 0, perfectBlocks: 0, parries: 0, parried: 0, fblocks: 0, taken: 0, maxAtk: 0 },
      skill: null, D: RT.level(K.S, null, true), noStrike: kind === "weather", escort: kind === "escort", through: kind === "breakthrough", sp: P.shieldPts, broken: false, spOff: 0, ground: [], gid: 0 };
    B.rt = R;
    const L = opts.noLine ? null : R3.lineFor(B);
    if (L) { R.line = Object.assign({ n: 0, next: L.every, sent: [0, 0] }, R3.LINE, L); if (L.dream) { R.line.hpTheirs = 22; R.line.atkTheirs = 4; R.line.hpMine = 7; R.line.atkMine = 3; } for (let i = 0; i < L.mine; i++) addLine(R, "ally"); for (let i = 0; i < L.theirs; i++) addLine(R, "enemy"); }
    B.units.forEach((u) => initUnit(R, u));
    place(R);
    planFor(R, opts);
    if (opts.stance) R3.stance(R, opts.stance);
    wheelSetup(R);
    const p = C.player();
    if (K.S && K.S.flags && K.S.flags.includes("war_setback") && K.S.act >= 6) { K.S.flags.splice(K.S.flags.indexOf("war_setback"), 1); p.hp = Math.max(1, Math.round(p.hp * 0.88)); R.fx.push({ k: "setback" }); } // (what the last fight's failed task cost)
    if (opts.hp) p.hp = Math.max(1, Math.round(p.maxHp * opts.hp));
    R.shield = !!(C.hasShield && C.hasShield()); R.blocker = R.shield;
    const id = RT.SKILL[K.S.path];
    R.skill = id && p.abilities.includes(id) ? id : null;
    if (B.enc.dream && p.abilities.includes("quake")) R.skill = "quake"; // the dream's grown fighter
    const status = B.status;
    B.status = function (t, s, dur, text) { status.call(B, t, s, dur, text); if (t && t.g && t.hp > 0) t.g.st[s] = Math.max(t.g.st[s] || 0, dur * ROUND); };
    if (R.through) { R.goal = { x: 0, z: -R.rad + 1.2, r: 3.4 }; B.progress = 0; }
    return R;
  };

  // ---------- On the ground ----------
  const onField = (R, u) => Math.hypot(u.g.x, u.g.z) <= R.rad + 0.2;
  const foesIn = (R) => living(R.B, "enemy").filter((e) => e.g.entered && !e.g.apart); // (apart: a man no blow is aimed at, Karna at his wheel until you choose)
  // (a soldier of the line is the nearest only when he is much the nearer: your fight is with the named)
  function nearestFoe(R, from, max) {
    let best = null, bd = max || 1e9, man = null, md = 1e9;
    for (const e of foesIn(R)) { if (e.g.kind === "light") continue; const d = dist(e, from); if (e.line && from.side === "player") { if (d < md && (d < 2.6 && e.g.atk && e.g.atk.on === from.uid || d < (max || 1e9))) { if (e.g.atk && e.g.atk.on === from.uid && d < 2.6) return e; md = d; man = e; } continue; } if (d < bd) { bd = d; best = e; } }
    return best || man; // a soldier of the line only when he is on you, or when none of the named is on the field
  }
  R3.target = function (R) { // whom you are facing: the one locked, while it stands; else the nearest
    const p = C.player(); let t = R.lock && R.B.units.find((u) => u.uid === R.lock && u.hp > 0 && !u.spared && u.g.entered);
    if (t && t.line && R.lockBy !== t.uid) t = null; // (a soldier of the line is kept only while you chose him yourself)
    if (!t || t.g.kind === "light") { t = nearestFoe(R, p); R.lock = t ? t.uid : null; }
    return t || null;
  };
  // (the line's soldiers at their own men are no part of the turn-taking against you)
  R3.attacking = (R) => { const me = C.player().uid; return living(R.B, "enemy").filter((e) => e.g.atk && !(e.line && e.g.atk.on !== me)).length; };
  R3.count = (R) => living(R.B, "enemy").reduce((n, e) => n + (e.line || e.still ? 0 : e.plural ? Math.max(1, Math.ceil(e.g.bodies * e.hp / e.maxHp)) : 1), 0);
  const blowsAtOnce = (R) => (R.line && R.line.dream ? 2 + (R.t > 20 ? 1 : 0) + (R.t > 38 ? 1 : 0) : 2);
  const ready = (id) => { const row = C.available().find((a) => a.id === id); return !!row && !row.why; };
  const swinging = (p) => !!(p && p.g && (p.g.busy > 0 || p.g.blow));
  R3.can = function (R, what) {
    const p = C.player();
    if (!p || R.over || p.hp <= 0) return false;
    switch (what) {
      case "roll": return R.roll <= 0 && R.kneel <= 0 && R.breath >= P.rollMin && !held(p) && R.frozen <= 0;
      case "block": return R.blocker && !R.broken && (R.block || (R.roll <= 0 && R.kneel <= 0 && !R.winded && R.breath >= P.blockMin && !swinging(p))) && !held(p) && R.frozen <= 0;
      case "skill": return !R.noStrike && !!R.skill && R.skillCd <= 0 && R.kneel <= 0 && !held(p);
      case "strike": return !R.noStrike;
      case "herbs": return R.kneel <= 0 && (R.herbCd || 0) <= 0 && p.abilities.includes("herbs") && (K.S.items.herbs || 0) > 0 && p.hp < p.maxHp && !swinging(p);
      case "call": return p.abilities.includes("call") && ready("call");
      case "vanish": return !!(RT.vanishOffer && RT.vanishOffer(R)) && !!K.vanishReady(K.S) && !(R.unseen > 0) && R.kneel <= 0 && R.frozen <= 0;
      case "withdraw": return C.canFlee();
      case "cover": return p.abilities.includes("cover") && ready("cover");
      case "layDown": return p.abilities.includes("lay_down") && !R.B.laidDown;
      default: return false;
    }
  };
  R3.astras = function (R) {
    const p = C.player(); if (!p) return [];
    const rest = R && R.astraRest > R.t ? Math.ceil(R.astraRest - R.t) : 0;
    return C.available().filter((a) => K.isAstra(a.id)).map((a) => (rest && !a.why ? Object.assign({}, a, { why: K.tr("The mantra broke: again in {n} s", { n: rest }) }) : a));
  };
  R3.spareable = (R) => { const p = C.player(); return C.spareable().filter((e) => e.g && dist(p, e) <= 3.2); };

  // ---------- Marks: where a blow will land ----------
  // A fan (a blade's sweep from the striker), a ring (all around a point) or a lane (an arrow's line).
  function fanOf(e, a) {
    const g = e.g, lun = P.lunge;
    if (a.area) return { kind: "ring", x: a.px != null ? a.px : g.x, z: a.pz != null ? a.pz : g.z, r: a.r };
    if (a.ranged) return { kind: "lane", x: g.x, z: g.z, a: a.dir, r: a.len || 30, w: 1.1 };
    const half = a.arc === "sweep" ? P.sweep : g.weapon === "spear" || g.weapon === "staff" || a.id === "ridedown" ? P.thrust : g.weapon === "tusk" ? 0.7 : P.fan;
    return { kind: "fan", x: g.x, z: g.z, a: a.dir, r: g.reach + lun + g.rad - 0.42, half };
  }
  R3.markOf = function (R, e) { const a = e.g.atk; if (!a) return null; const m = fanOf(e, a); m.fill = clamp((R.t - a.t0) / Math.max(1e-3, a.land - a.t0), 0, 1); m.heavy = !!a.heavy; m.locked = !!a.locked; m.on = a.on; m.feint = a.feint > 0; return m; };
  function inside(m, u, pad) {
    const dx = u.g.x - m.x, dz = u.g.z - m.z, d = Math.hypot(dx, dz), r = u.g.rad * 0.6 + (pad || 0);
    if (m.kind === "ring") return d <= m.r + r;
    if (m.kind === "lane") { const s = Math.sin(m.a), c = Math.cos(m.a), along = dx * s + dz * c, off = Math.abs(dx * c - dz * s); return along > -0.3 && along <= m.r && off <= m.w / 2 + r; }
    if (d > m.r + r) return false;
    return d < 0.9 || Math.abs(adiff(Math.atan2(dx, dz), m.a)) <= m.half + 0.12;
  }

  // ---------- You ----------
  // Each weapon's chain of blows (as in the 2D fights): m its weight, land when it lands, len how long it holds you.
  const COMBO = [{ m: 0.62, land: 0.22, len: 0.34 }, { m: 0.62, land: 0.22, len: 0.34 }, { m: 1.05, land: 0.3, len: 0.62, heavy: true, knock: 1.5 }];
  const MACE = [{ m: 1.3, land: 0.4, len: 0.72, heavy: true, arc: "smash", stag: 0.5 }, { m: 1.0, land: 0.34, len: 0.64, heavy: true, arc: "sweep", knock: 2.0 }];
  const BOW = [{ m: 0.62, land: 0.16, len: 0.36, shot: true }, { m: 0.62, land: 0.16, len: 0.36, shot: true }, { m: 1.05, land: 0.26, len: 0.6, heavy: true, knock: 1.5, shot: true }];
  const DAGGER = [0, 1, 2, 3].map(() => ({ m: 0.48, land: 0.15, len: 0.24 })).concat([{ m: 0.95, land: 0.24, len: 0.48, heavy: true, knock: 1.4 }]);
  const SPEAR = [{ m: 0.66, land: 0.24, len: 0.36 }, { m: 0.66, land: 0.24, len: 0.36 }, { m: 1.1, land: 0.3, len: 0.62, heavy: true, knock: 1.8 }];
  const FIST = [{ m: 0.55, land: 0.16, len: 0.28 }, { m: 0.55, land: 0.16, len: 0.28 }, { m: 0.95, land: 0.26, len: 0.52, heavy: true, knock: 1.4 }];
  R3.comboOf = () => { const w = C.player() && C.player().g && C.player().g.weapon; return w === "mace" ? MACE : w === "bow" ? BOW : w === "dagger" ? DAGGER : w === "spear" ? SPEAR : w === "fist" ? FIST : COMBO; };
  R3.nextBlow = (R) => { const list = R3.comboOf(); return list[R.t - R.comboT > 0.6 || R.combo >= list.length ? 0 : R.combo]; };
  const PARRY_WITH = new Set(["sword", "woodsword", "mace", "spear", "staff", "club", "hammer", "dagger", "fist"]), LIGHT = new Set(["dagger", "fist"]);

  function playerAct(R, a) {
    const B = R.B, p = C.player(), g = p.g;
    if (a.orders) { Object.assign(R.orders, a.orders); R.orders.given = true;
      if (a.orders.form) { // a stand is made where the order was given, across the way the enemy lies
        const fs = foesIn(R).filter((e) => e.g.kind !== "light"); let ex = 0, ez = 0; for (const e of fs) { ex += e.g.x; ez += e.g.z; }
        R.orders.at = [g.x, g.z, fs.length ? Math.atan2(ex / fs.length - g.x, ez / fs.length - g.z) : g.a]; } }
    if (a.withdraw && C.canFlee()) { C.flee(); return; }
    if (a.lock) { const fs = foesIn(R).filter((e) => e.g.kind !== "light" && (!e.line || dist(e, p) < 7)).sort((x, y) => dist(x, p) - dist(y, p)); if (fs.length) { const i = fs.findIndex((e) => e.uid === R.lock); R.lock = fs[(i + 1) % fs.length].uid; R.lockBy = R.lock; R.fx.push({ k: "lock", uid: R.lock }); } }
    if (a.lockOn) { const t = B.units.find((u) => u.uid === a.lockOn && u.side === "enemy" && u.hp > 0); if (t) { R.lock = t.uid; R.lockBy = t.uid; } }
    if (R.block && (!a.block || !R3.can(R, "block"))) lowerShield(R);
    else if (!R.block && a.block && R3.can(R, "block")) raiseShield(R);
    if (a.spare) { const t = R3.spareable(R).find((e) => e.uid === a.spare); if (t) { if (t.g.atk) cancel(t); C.spare(t.uid); R.fx.push({ k: "spared", uid: t.uid }); return; } }
    if (held(p) || R.frozen > 0) return;
    if (a.layDown && R3.can(R, "layDown")) { C.core.use(p, "lay_down", null); R.fx.push({ k: "laydown" }); return; }
    if (a.cover && R3.can(R, "cover")) { C.core.use(p, "cover", null); R.kneelPose = 1.2; R.fx.push({ k: "cover" }); }
    if (a.call && R3.can(R, "call")) { C.core.use(p, "call", null); R.fx.push({ k: "call" }); }
    if (a.astraBreak) { R.astraRest = R.t + 6; R.fx.push({ k: "mantraBroke" }); return; } // (the figure was not joined in time: the weapon rests, and no use of it is spent)
    if (a.astra) {
      const row = R3.astras(R).find((x) => x.id === a.astra && !x.why);
      if (row) {
        B.astraOut = null;
        const before = new Map(B.units.map((u) => [u.uid, u.hp])), t = R3.target(R);
        C.core.use(p, row.id, t ? t.uid : null);
        R.frozen = 2.6;
        const struck = B.units.filter((u) => u.side === "enemy" && u.g && before.get(u.uid) > u.hp), dealt = {};
        struck.forEach((u) => { dealt[u.uid] = before.get(u.uid) - u.hp; });
        // A mantra poorly spoken (a.astraQ, 0.5 to 1, from how the figure was joined) lands softer: those still standing
        // get back that share of what it took. It is never stronger than it was.
        const q = a.astraQ == null ? 1 : clamp(a.astraQ, 0.5, 1);
        if (q < 1) struck.forEach((u) => { if (u.hp > 0) { const back = Math.round(dealt[u.uid] * (1 - q)); u.hp = Math.min(u.maxHp, u.hp + back); dealt[u.uid] -= back; } });
        const clash = !!(B.astraOut && B.astraOut.clash), fled = clash || !struck.length ? [] : panic(R, struck);
        if (!clash && struck.length) spirit(R, -20);
        if (clash) R.clash = { uid: B.astraOut.uid, id: row.id, won: false };
        R.astraAfter = { id: row.id, struck: struck.map((u) => u.uid), ang: t ? angTo(p, t) : p.g.a };
        if (clash) R.frozen = 3.6;
        R.fx.push({ k: "astra", id: row.id, out: B.astraOut, struck: struck.map((u) => u.uid), dealt, ang: R.astraAfter.ang, q, fled,
          held: living(B, "enemy").filter((u) => u.g && (u.status.asleep || u.status.bound)).map((u) => u.uid) });
        living(B, "enemy").forEach((e) => { if (e.g.atk && held(e)) cancel(e); });
      }
    }
    if (a.roll && R3.can(R, "roll")) {
      let dx = a.mx || 0, dz = a.mz || 0; const l = Math.hypot(dx, dz);
      if (l < 0.2) { dx = -Math.sin(g.a); dz = -Math.cos(g.a); } else { dx /= l; dz /= l; } // no direction: straight back
      R.roll = R.rollDur = P.roll; R.rollT = R.t; R.breath -= P.rollCost * tireCost(); R.stats.rolls++; R.rdx = dx; R.rdz = dz; R.readN = 0;
      g.busy = 0; g.blow = null; R.buffer = false; R.combo = 0; R.kneel = 0; if (R.block) lowerShield(R);
      R.fx.push({ k: "roll", dx, dz });
    }
    if (a.vanish && R3.can(R, "vanish")) { // Antardhana (a boon): two seconds unseen, and the first blow out of it lands half again as hard; once an act, shared with the stories
      K.S.vanishedAct = K.S.act; R.unseen = 2; R.boonBlow = 1.5; R.fx.push({ k: "unseen" }); R.B.tell("You speak the Gandharva's word and are gone from their eyes.");
      living(R.B, "enemy").forEach((e) => { if (e.g && e.g.atk && e.g.atk.on === p.uid) cancel(e); });
    }
    if (a.herbs && R.roll <= 0 && !R.block && R3.can(R, "herbs")) { R.kneel = RT.kneelT ? RT.kneelT() : 1.1; R.buffer = false; R.fx.push({ k: "kneel" }); }
    if (R.noStrike) return;
    if (a.skill && R3.can(R, "skill") && R.roll <= 0 && !R.block && g.busy <= 0.05) skill(R);
    if (a.strike && R.roll <= 0 && R.kneel <= 0 && !R.block) {
      if (parry(R)) { /* your weapon met his */ }
      else if (g.busy > 0) R.buffer = true;
      else blow(R);
    }
  }
  R3.parryable = function (R, e, win) {
    const a = e.g.atk, p = C.player();
    if (!a || a.ranged || a.area || a.feint || e.hp <= 0 || e.g.kind === "elephant") return false;
    const left = a.land - R.t;
    if (left < -STEP || left > win) return false;
    return inside(fanOf(e, a), p, 0.1) && Math.abs(adiff(angTo(p, e), p.g.a)) < 1.9;
  };
  // ---------- The 2D game's Build D, in these fights (its engine/realtime.js is the reference) ----------
  // The champions' own traits, the tier you have climbed to, your boons and each divine weapon's lasting gift. What changes a
  // blow's weight is in the shared engine (C.traitDmg, C.traitCap) and so is here already; what changes timing, parries,
  // who is struck and what a figure does is mirrored below, with distances in place of the 2D line.
  const who = (u) => (RT.who ? RT.who(u) : null);
  const boon = (b) => !!(RT.boon && RT.boon(b)), kept = (id) => !!(RT.kept && RT.kept(id));
  const indra = () => boon("astra") && !(K.S.astra && K.S.astra.broken);
  const tireCost = () => (boon("bala") ? 0.75 : 1);
  const steady = (t) => who(t) === "kripa" && t.hp < t.maxHp * 0.5; // Kripa does not reel below half his strength
  const tip = (R, key) => { if (RT.traitTip) RT.traitTip(R, key); };
  const traitRest = (R, e) => { const w = who(e); return w === "arjuna" && e.g.archer ? 0.75 : w === "ashwatthama" ? (R.B.enc.id === "e_raid" ? 0.64 : 0.8) : w === "satyaki" ? 0.85 : 1; };
  // Your heavy blow, landed: Agni's fire burns him 2 s; the sleep slows his next wind-up; the coil binds his feet 1.5 s.
  function giftsOnHeavy(R, t, d) {
    if (!t || t.hp <= 0 || !t.g) return;
    if (kept("agneya")) { t.g.burnUntil = R.t + 2; t.g.burnPer = Math.max(1, d) * 0.15; R.fx.push({ k: "burn", uid: t.uid }); }
    if (kept("sammohana")) t.g.slowNext = 1.3;
    if (kept("nagapasha")) t.g.boundUntil = R.t + 1.5;
  }
  // A false Ghatotkacha, struck or his six seconds over, is gone.
  function vanishDecoy(R, d) { const i = R.B.units.indexOf(d); if (i < 0) return; R.B.units.splice(i, 1); R.fx.push({ k: "vanish", uid: d.uid }); }
  const clearDecoys = (B) => { for (let i = B.units.length - 1; i >= 0; i--) if (B.units[i].decoy) B.units.splice(i, 1); };
  // Abhimanyu's blows sweep the next one too, at 0.6.
  function sweepNext(R, e, t) {
    const t2 = R.B.units.filter((x) => x !== t && x.hp > 0 && !x.spared && !x.decoy && x.g && x.g.entered !== false && (x.side === "enemy") === (t.side === "enemy") && dist(x, e) <= e.g.reach + P.lunge + x.g.rad && Math.abs(adiff(angTo(e, x), e.g.a)) < 1.3).sort((x, y) => dist(x, e) - dist(y, e))[0];
    if (!t2) return;
    const before = t2.hp; R.B.hit(e, t2, 0.6); hitFx(R, t2, before - t2.hp, false, e, true, false); tip(R, "abhimanyu");
  }
  // Traits that act on their own: Karna's wheel sinks on the seventeenth day below a third of his strength (he stops 3 s to
  // free it; a blow of yours then is remembered); Ghatotkacha, once a fight below two thirds, becomes three for 6 s.
  function traitStep(R, e) {
    const w = who(e), g = e.g;
    if (w === "karna" && !g.wheeled && RT.warDay && RT.warDay() === 17 && e.hp < e.maxHp / 3 && e.hp > 0) { g.wheeled = true; g.wheelUntil = R.t + 3; if (g.atk) cancel(e); R.fx.push({ k: "wheel", uid: e.uid }); tip(R, "karnaWheel"); }
    if (w === "ghatotkacha" && !g.maya && e.hp < e.maxHp * 0.67 && e.hp > 0 && g.entered !== false) {
      g.maya = true; tip(R, "ghatotkachaMaya");
      for (const sd of [-1, 1]) {
        const d = Object.assign({}, e, { uid: e.uid + (sd < 0 ? "a" : "b"), decoy: R.t + 6, real: e.uid, status: {}, abilities: [], hp: e.hp, cds: {} }); delete d._tb;
        const a = g.a + sd * Math.PI / 2;
        d.g = Object.assign({}, g, { x: clamp(g.x + Math.sin(a) * 2.2, -R.rad + 1, R.rad - 1), z: clamp(g.z + Math.cos(a) * 2.2, -R.rad + 1, R.rad - 1), atk: null, hits: [], cd: {}, maya: true, stag: 0, down: 0, vx: 0, vz: 0 });
        R.B.units.push(d); R.fx.push({ k: "maya", uid: d.uid, from: e.uid });
      }
    }
  }
  R3.gifts = () => (RT.gifts ? RT.gifts() : []);
  function parry(R) {
    const p = C.player();
    if (!PARRY_WITH.has(p.g.weapon) || swinging(p)) return false;
    const win = P.parry * (indra() ? 1.2 : 1) * R.D.perfect + STEP;
    const e = living(R.B, "enemy").filter((x) => who(x) !== "supratika" && R3.parryable(R, x, win)).sort((x, y) => x.g.atk.land - y.g.atk.land)[0];
    if (!e) return false;
    const a = e.g.atk;
    p.g.a = angTo(p, e); p.g.busy = 0.3; R.combo = 0; R.buffer = false;
    if (LIGHT.has(p.g.weapon) && (a.heavy || a.arc === "smash")) { a.part = P.parryPart; R.fx.push({ k: "parry", uid: e.uid, part: true }); return true; }
    R.stats.parries++;
    cancel(e);
    if (!steady(e)) e.g.stag = Math.max(e.g.stag, p.g.weapon === "mace" ? P.parryStagMace : P.parryStag); e.g.rec = 0;
    R.slow = Math.max(R.slow, 0.6);
    R.fx.push({ k: "parry", uid: e.uid });
    return true;
  }
  function foeParries(R, t, heavy) {
    const p = C.player();
    if (!(t.hero || t.person) || t.g.atk || t.g.stag > 0 || t.g.down > 0 || t.g.beaten || t.still || t.g.kind !== "man") return false;
    if (R.t < (t.g.openUntil || 0) || !PARRY_WITH.has(t.g.weapon) || t.g.weapon === "fist" || t.g.archer) return false;
    // Drona reads the same combo used three times running, Kripa four, and meets the next for sure; Duryodhana, Balarama's
    // pupil, meets a mace twice as often; Satyaki a sword or a spear half as often again.
    const w = who(t), read = w === "drona" ? 3 : w === "kripa" ? 4 : 0, sure = read > 0 && (R.readN || 0) >= read;
    if (!sure && R.t - (t.g.parriedAt || -99) < P.parryFoeCd) return false;
    if (Math.abs(adiff(angTo(t, p), t.g.a)) > 1.2) return false;
    const pw = p.g.weapon, more = w === "duryodhana" && pw === "mace" ? 2 : w === "satyaki" && (pw === "sword" || pw === "spear") ? 1.5 : 1;
    if (!sure && K.rng() >= (R.D.parryFoe || 0) * more * (heavy ? 0.5 : 1)) return false;
    if (sure) { R.readN = 0; tip(R, w); } else if (more > 1) tip(R, w);
    t.g.parriedAt = R.t; R.stats.parried++;
    p.g.busy = Math.max(p.g.busy, P.parriedBusy); R.combo = 0; R.buffer = false;
    t.g.cool = Math.min(t.g.cool, 0.25);
    R.fx.push({ k: "parried", uid: t.uid });
    return true;
  }
  function foeBlocks(R, t, heavy, arrow, pts) {
    const p = C.player();
    if (!(t.shield || t.shieldDrawn) || t.hp <= 0 || t.g.atk || t.g.stag > 0 || t.g.down > 0 || t.g.beaten || t.still) return 1;
    if (R.t < (t.g.openUntil || 0) || R.t - (t.g.fblockAt == null ? -99 : t.g.fblockAt) < P.fblockCd) return 1;
    if (Math.abs(adiff(angTo(t, p), t.g.a)) > 1.1) return 1; // only from the front: go round him
    const sm = t.g.cls === "shield" || who(t) === "bhadra";   // (Bhadra, an old soldier: his shield is a soldier's trade too)
    if (K.rng() >= Math.min(sm ? P.shieldMost : 1, P.fblock * (sm ? P.shieldMan : 1) * (R.D.glance || 1)) * (heavy ? 0.7 : 1) * (arrow ? 0.7 : 1)) return 1;
    if (sm) { tip(R, who(t) === "bhadra" ? "bhadra" : "c_shield"); pts *= P.shieldWear; }
    t.g.fblockAt = R.t; R.stats.fblocks++;
    t.g.rec = Math.max(t.g.rec || 0, P.fblockRec * (R.D.rest || 1)); t.g.cool = Math.max(t.g.cool || 0, 0.25);
    R.fx.push({ k: "fblock", uid: t.uid, heavy: !!heavy, arrow: !!arrow });
    if (pts > 0) shieldTakes(R, t, pts);
    return heavy ? P.fblockHeavy : P.fblockLight;
  }
  function shieldTakes(R, u, pts) {
    const mine = u.side === "player"; if (mine && boon("charm_shield")) return; // the charmed shield cannot be broken
    const before = mine ? R.sp : u.sp == null ? P.shieldPts : u.sp, after = Math.max(0, before - pts);
    if (mine) R.sp = after; else u.sp = after;
    if (after <= 0) {
      if (mine) { R.broken = true; R.spOff = P.shieldBack; if (R.block) lowerShield(R); }
      else { u.shield = false; u.shieldDrawn = false; u.shieldBroken = true; }
      R.fx.push({ k: "shieldbreak", uid: u.uid, mine });
    } else if (after <= P.shieldPts / 2 && before > P.shieldPts / 2) R.fx.push({ k: "shieldcrack", uid: u.uid, mine });
  }
  function blow(R) {
    const p = C.player(), g = p.g, list = R3.comboOf();
    if (R.t - R.comboT > 0.6 || R.combo >= list.length) { if (R.combo !== 0) R.readN = 0; R.combo = 0; }
    if (R.combo === 0 && R.t - (R.comboEnd || -9) > 1.0) R.readN = 0; // a pause between combos, and Drona cannot read you
    const c = list[R.combo], t = R3.target(R);
    if (R.combo === 0) { R.readN = (R.readN || 0) + 1; R.comboEnd = R.t + c.len; } // a whole combo, the same again
    // You turn to the one you face when he is near enough to matter, and step in if he is just out of reach.
    if (t && (c.shot || dist(t, p) <= g.reach + 3.2)) g.a = angTo(p, t);
    if (c.shot) return bowShot(R, c, list, t);
    g.busy = c.len; g.blow = { c, at: R.t + c.land, n: R.combo };
    if (t) { const d = dist(t, p), want = g.reach * 0.9 + t.g.rad - 0.42; if (d > want && d < want + 1.6) { g.stepX = Math.sin(g.a) * (d - want) / c.land; g.stepZ = Math.cos(g.a) * (d - want) / c.land; g.stepT = c.land; } }
    R.combo = (R.combo + 1) % list.length; R.comboT = R.t + c.len;
    R.fx.push({ k: "blow", n: g.blow.n, arc: c.arc || null, land: c.land, len: c.len, heavy: !!c.heavy, last: R.combo === 0 });
  }
  function bowShot(R, c, list, t) {
    const p = C.player(), g = p.g, B = R.B;
    const inR = foesIn(R).filter((e) => e.g.kind !== "light" && dist(e, p) <= P.shoot && Math.abs(adiff(angTo(p, e), g.a)) < 1.0).sort((x, y) => dist(x, p) - dist(y, p));
    const t1 = t && inR.includes(t) ? t : inR[0] || null, t2 = inR.find((e) => e !== t1) || null;
    const one = (on, m, knock, dt) => { const am = aimAt(g, on, P.myArrow, c.land + dt), s = { by: p.uid, side: "player", m, knock, on: on ? on.uid : null, x: g.x, z: g.z, y: FLY.y0, a: am ? am.a : g.a, vy: am ? am.vy : flat(P.myArrow, 12), t0: R.t + c.land + dt, v: P.myArrow, heavy: !!c.heavy && !dt, n: ++R.shotN, life: 1.2 }; R.shots.push(s); R.fx.push({ k: "shot", uid: p.uid, shot: s, second: !!dt }); };
    one(t1, t2 ? c.m : c.m * P.bowSecond, c.knock || 0, 0);
    one(t2 || t1, c.m * P.bowSecond, 0, P.bowGap);
    g.busy = c.len; R.stats.blows++;
    R.combo = (R.combo + 1) % list.length; R.comboT = R.t + c.len;
    R.fx.push({ k: "blow", n: R.combo, shot: true, land: c.land, len: c.len, heavy: !!c.heavy });
  }
  function raiseShield(R) { const p = C.player(); R.block = true; R.blockT = R.t; R.stats.blocks++; R.readN = 0; p.g.blow = null; p.g.busy = 0; R.buffer = false; R.combo = 0; faceThreat(R); R.fx.push({ k: "shield", up: true }); }
  function lowerShield(R, winded) { R.block = false; if (winded) { R.winded = true; R.fx.push({ k: "winded" }); } R.fx.push({ k: "shield", up: false }); }
  function faceThreat(R) {
    const p = C.player(), th = R3.threats(R)[0], f = th ? null : R3.target(R);
    if (th) p.g.a = Math.atan2(th.x - p.g.x, th.z - p.g.z); else if (f) p.g.a = angTo(p, f);
  }
  function floored(R, t, d, m) {
    const tn = (RT.TUNE || {})[R.B.enc.id] || {}; // (a fight may say sooner: the crossing's three tire after a minute)
    if (!(d > 0) || !t || t.hp <= 0 || !t.maxHp || R.t < (tn.worn || P.wornAfter) || t.hero || t.person) return d;
    const f = Math.round(t.maxHp * (tn.wornFloor || P.wornFloor) * m);
    if (d >= f) return d;
    if (!R.worn) { R.worn = true; R.fx.push({ k: "toast", s: "They are tiring: your blows tell more now." }); }
    const more = Math.min(t.hp, f - d); t.hp -= more; return d + more;
  }
  function landBlow(R) {
    const B = R.B, p = C.player(), g = p.g, b = g.blow;
    g.blow = null; R.stats.blows++;
    const reach = g.reach + P.lunge, half = b.c.arc === "sweep" ? P.sweep : g.weapon === "spear" ? 0.6 : 0.85; /* (a blow lands on what the weapon is pointed at: a little narrower than it was) */
    const cands = foesIn(R).filter((e) => e.g.kind !== "light" && dist(e, p) <= reach + e.g.rad - 0.42 && (dist(e, p) < 1 || Math.abs(adiff(angTo(p, e), g.a)) <= half)).sort((x, y) => (x.uid === R.lock ? -1 : 0) - (y.uid === R.lock ? -1 : 0) || dist(x, p) - dist(y, p));
    if (!cands.length) { R.fx.push({ k: "whiffme" }); return; }
    // A mace's sweep carries through everyone in its arc (the first at full weight); every other blow is one man's.
    const ts = b.c.arc === "sweep" ? cands.slice(0, 3) : [cands[0]];
    ts.forEach((t, i) => {
      if (t.decoy) { vanishDecoy(R, t); return; } // only an illusion
      if (i === 0 && foeParries(R, t, b.c.heavy)) { nudge(R, p, angTo(t, p), 0.2); return; } // (turned aside: it comes back up your own arm)
      if (t.g.wheelUntil > R.t && !R.struckWheel) { // Karna at his sunken wheel: the story remembers it
        R.struckWheel = true; K.apply({ flag: "struck_karna_wheel", duty: { conscience: -2 }, journal: "On the seventeenth day you struck Karna while he bent to free his sunken wheel." }); if (K.breakTags) K.breakTags(["strike_unarmed"]); }
      let m = b.c.m * (i ? 0.6 : 1);
      if (R.double) { m *= 2; R.double = false; }
      if (R.boonBlow) { m *= R.boonBlow; R.boonBlow = 0; } // the first blow out of Antardhana
      if (B.enc.bearer) m *= 0.8; // (one hand is on the banner's staff)
      const off = R.plan ? Math.abs(adiff(angTo(t, p), t.g.a)) : 0, behind = R.plan && off > 1.75, walled = R.plan && t.g.role === "wall" && !R.plan.broken && off < 1.0 && !b.c.heavy;
      const caught = behind ? 1 : foeBlocks(R, t, b.c.heavy, false, RT.shieldHit(p, g.weapon, b.c.heavy && !b.c.arc));
      m *= caught;
      if (behind) { m *= 1.3; R.fx.push({ k: "flank", uid: t.uid }); } else if (walled) { m *= 0.5; R.fx.push({ k: "walled", uid: t.uid }); }
      if (R.task && t.uid === R.task.uid) t.g.struck = true;
      if (R.plan && t.uid === R.plan.car && !behind && wheelGuards(R).length) { m *= 0.6; R.fx.push({ k: "guarded", uid: t.uid }); } // (his wheel-guards cover him)
      const d = floored(R, t, B.hit(p, t, m), m);
      R.stats.hits++; storyHit(R, t);
      hitFx(R, t, d, b.c.heavy, p, true, caught < 1);
      if (b.c.heavy && caught === 1) giftsOnHeavy(R, t, d);
      if (b.c.knock && t.hp > 0) knock(R, t, angTo(p, t), b.c.knock, false); else nudge(R, t, angTo(p, t), caught < 1 ? 0.1 : 0.24);
      if (steady(t)) { if (b.c.stag || b.c.heavy) tip(R, "kripaSteady"); }
      else if (b.c.stag && t.hp > 0 && !t.g.atk) t.g.stag = Math.max(t.g.stag, b.c.stag);
      else if (!b.c.heavy && caught === 1 && t.hp > 0 && !t.g.atk && K.rng() < RT.STRENGTH.flinch[RT.tierOf(t)]) t.g.stag = Math.max(t.g.stag, P.lightStag);
      t.g.hits.push(R.t);
    });
  }
  // What a divine weapon leaves behind when the light clears. Each is its own: Indra's bolts throw men down where they
  // stand; water carries a whole rank off the way it ran; wind scatters them every way; fire throws no one, but burns on
  // where it fell, and no one can set his feet to strike inside it. (Sleep and the serpent-noose hold without a blow.)
  // Panic. Common soldiers who saw a divine weapon land beside them throw down their spears and run: up to two, never
  // more than half of those still on their feet, never a captain or a named man, never one it holds asleep or bound. (One it struck and did not kill runs as readily as one it missed.) They
  // leave the fight alive and count as beaten (the owner's ruling).
  function panic(R, struck) {
    const B = R.B, p = C.player(), hit = new Set(struck.map((u) => u.uid));
    const pool = living(B, "enemy").filter((u) => u.g && !u.hero && !u.person && !u.decoy && !u.g.car && !(u.status.asleep || u.status.bound) && (RT.tierOf ? RT.tierOf(u) : 0) < 1);
    const n = Math.min(2, Math.floor(pool.length / 2));
    return pool.sort((a, b) => (hit.has(b.uid) ? 1 : 0) - (hit.has(a.uid) ? 1 : 0) || dist(a, p) - dist(b, p)).slice(0, n).map((u) => { u.g.flee = R.t + 1.8; u.g.burnUntil = 0; cancel(u); return u.uid; });
  }
  function astraAfter(R, A) {
    const B = R.B, p = C.player(), us = A.struck.map((id) => B.units.find((x) => x.uid === id)).filter((u) => u && u.g && u.hp > 0);
    if (A.id === "varuna") us.forEach((u) => { knock(R, u, A.ang, 4.2, true); u.g.down = Math.max(u.g.down, 1.4); });
    else if (A.id === "vayavya") us.forEach((u, i) => { knock(R, u, angTo(p, u) + ((i * 0.618) % 1 - 0.5) * 1.5, 3 + ((i * 0.382) % 1) * 2.6, true); u.g.down = Math.max(u.g.down, 1.8); });
    else if (A.id === "agneya") { us.forEach((u) => { knock(R, u, angTo(p, u), 0.9, false); u.g.stag = Math.max(u.g.stag || 0, 0.9); }); R.fires = us.map((u) => ({ x: u.g.x, z: u.g.z, t: 7 })); R.fx.push({ k: "fires", at: R.fires.map((f) => [f.x, f.z]), secs: 7 }); }
    else us.forEach((u) => { knock(R, u, angTo(p, u), 2.4, true); u.g.down = Math.max(u.g.down, 2.2); });
  }
  // Agni's gift, on a foe your heavy blow struck: 0.15 of that blow a second, for 2 s. (Bhishma keeps his tenth before the tenth day.)
  function burnStep(R, dt) {
    for (const u of R.B.units) {
      if (!u.g || !(u.g.burnUntil > R.t - dt) || u.hp <= 0) continue;
      u.g.burnAcc = (u.g.burnAcc || 0) + u.g.burnPer * Math.min(dt, u.g.burnUntil - (R.t - dt));
      if (u.g.burnAcc >= 1) { const n = Math.min(u.hp - (who(u) === "bhishma" && RT.warDay && RT.warDay() < 10 ? Math.round(u.maxHp * 0.1) : 0), Math.floor(u.g.burnAcc)); u.g.burnAcc -= Math.floor(u.g.burnAcc); if (n > 0) { u.hp -= n; R.fx.push({ k: "burnt", uid: u.uid, n }); } }
      if (u.g.burnUntil <= R.t) { u.g.burnUntil = 0; u.g.burnAcc = 0; }
    }
  }
  function fireStep(R, dt) {
    if (!R.fires || !R.fires.length) return;
    for (const f of R.fires) f.t -= dt;
    R.fires = R.fires.filter((f) => f.t > 0);
    for (const u of living(R.B, "enemy")) { if (!u.g || u.g.down > 0) continue; u.g.fireT = (u.g.fireT || 0) - dt;
      if (u.g.fireT <= 0 && R.fires.some((f) => Math.hypot(f.x - u.g.x, f.z - u.g.z) < 1.5)) { u.g.fireT = 1.3; if (u.g.atk) cancel(u); u.g.stag = Math.max(u.g.stag || 0, 0.5); R.fx.push({ k: "scorch", uid: u.uid }); } }
  }
  function knock(R, u, ang, d, down) {
    if (u.still || u.g.kind === "elephant" || u.g.kind === "light") return;
    if (down && u.g.atk) cancel(u);
    const k = (u.hero || u.person ? 0.6 : 1) * (u.g.car ? 0.35 : u.g.kind === "squad" ? 0.7 : 1);
    u.g.vx += Math.sin(ang) * d * PHYS.knock * k; u.g.vz += Math.cos(ang) * d * PHYS.knock * k;
    if (!u.g.atk && !steady(u)) u.g.stag = Math.max(u.g.stag, 0.3);
    if (down) u.g.down = Math.max(u.g.down, 1.2);
  }
  // A blow that lands moves the body it lands on, even when it does not throw him: no stagger, only ground given.
  function nudge(R, u, ang, d) {
    if (!u || !u.g || u.still || u.hp <= 0 || u.g.kind === "elephant" || u.g.kind === "light" || u.g.ride) return;
    const k = (u.hero || u.person ? 0.6 : 1) * (u.g.car ? 0.2 : u.g.kind === "squad" ? 0.7 : 1);
    u.g.vx += Math.sin(ang) * d * PHYS.knock * k; u.g.vz += Math.cos(ang) * d * PHYS.knock * k;
  }
  function hitFx(R, t, d, heavy, by, melee, blocked) {
    if (t.g && by && by.g) t.g.lastFrom = { x: by.g.x, z: by.g.z };
    if (t.g && t.hp <= 0 && d > 0 && by && by.g && !t.g.thrown && !t.still && t.g.kind !== "elephant" && t.g.kind !== "light" && !t.g.car) { // (the body of a man killed goes the way the blow went: far for a heavy one)
      const a = angTo(by, t), v = (heavy ? 4.4 : melee ? 1.9 : 1.2) * (t.g.kind === "squad" ? 0.5 : 1); t.g.thrown = heavy ? 2 : 1; t.g.vx += Math.sin(a) * v; t.g.vz += Math.cos(a) * v; }
    R.fx.push({ k: "hit", uid: t.uid, n: d, heavy: !!heavy, by: by ? by.uid : null, melee: !!melee, blocked: !!blocked });
  }
  function skill(R) {
    const B = R.B, p = C.player(), g = p.g, id = R.skill, ab = K.ABILITIES[id];
    R.skillCd = RT.RECHARGE[id] || 10;
    B.acts.push({ uid: p.uid, id, round: B.round });
    const t = R3.target(R);
    if (t && id !== "ridedown") g.a = angTo(p, t);
    R.fx.push({ k: "skill", id });
    switch (id) {
      case "aimed": { g.busy = 0.5; const am = aimAt(g, t, P.myArrow * 1.2, 0.28), s = { by: p.uid, side: "player", id, on: t ? t.uid : null, x: g.x, z: g.z, y: FLY.y0, a: am ? am.a : g.a, vy: am ? am.vy : flat(P.myArrow * 1.2, 12), t0: R.t + 0.28, v: P.myArrow * 1.2, heavy: true, n: ++R.shotN, sure: 0.9, life: 1.3 }; R.shots.push(s); R.fx.push({ k: "shot", uid: p.uid, shot: s }); break; } // (a shot taken with care: it allows more for the man's moving)
      case "quake": { g.busy = 0.62; const ts = foesIn(R).filter((e) => e.g.kind !== "light" && dist(e, p) <= P.quake + e.g.rad); if (ts.length) { ab.use(B, p, ts); ts.forEach((u) => { hitFx(R, u, 0, true, p, true); if (u.hp > 0) knock(R, u, angTo(p, u), 1.2, true); }); } R.fx.push({ k: "quake", r: P.quake }); break; }
      case "ridedown": { // a charge straight through whoever stands in the way
        const len = 6.5, s = Math.sin(g.a), c = Math.cos(g.a);
        const ts = foesIn(R).filter((e) => { if (e.g.kind === "light") return false; const dx = e.g.x - g.x, dz = e.g.z - g.z, al = dx * s + dz * c; return al > -0.5 && al < len + 0.6 && Math.abs(dx * c - dz * s) < 1.3 + e.g.rad; });
        ts.forEach((u) => { ab.use(B, p, u); hitFx(R, u, 0, true, p, true); if (u.hp > 0) knock(R, u, g.a + (K.rng() < 0.5 ? 1.2 : -1.2), 1.1, true); });
        R.roll = R.rollDur = 0.32; R.rollT = -9; R.rdx = s * (len / 0.32) / (P.rollDist / P.roll); R.rdz = c * (len / 0.32) / (P.rollDist / P.roll); g.busy = 0.36; R.dash = true;
        break;
      }
      case "command": {
        g.busy = 0.4; if (!t) break;
        const allies = living(B, "ally").filter((a) => !a.still);
        if (!allies.length) { B.status(t, "exposed", 1, "is exposed"); if (dist(t, p) <= g.reach + 2.2) { const d = B.hit(p, t, 1.2); hitFx(R, t, d, false, p, true); } R.fx.push({ k: "toast", s: "Read the field" }); break; }
        allies.forEach((a) => { B.status(a, "inspired", 2); const d = B.hit(a, t, 1.2, { verb: "On your order, {a} hits {t} for {n}." }); hitFx(R, t, d, false, a, true); R.fx.push({ k: "order", uid: a.uid, on: t.uid }); });
        break;
      }
      case "salve": g.busy = 0.5; R.salve = { left: 3, next: R.t + 0.5 }; break;
      case "vanish": R.unseen = 1.8; R.double = true; B.tell("You slip out of sight."); living(B, "enemy").forEach((e) => { if (e.g.atk && e.g.atk.on === p.uid) cancel(e); }); break;
      case "song": g.busy = 0.5; ab.use(B, p, living(B, "friends")); R.haste = 2 * ROUND; break;
    }
  }
  function playerStep(R, a) {
    const B = R.B, p = C.player(), g = p.g, dt = STEP;
    g.moving = 0;
    if (R.roll > 0) {
      R.roll -= dt;
      { const far = R.dash ? 1 : RT.rollMul ? RT.rollMul() : 1, T_ = R.rollDur || P.roll, whole = P.rollDist * far * (T_ / P.roll), u1 = clamp(1 - R.roll / T_, 0, 1), u0 = clamp(u1 - dt / T_, 0, 1), d = (rollF(u1) - rollF(u0)) * whole; // (Vayu's gift: a roll carries a fifth further)
        move(R, p, R.rdx * d, R.rdz * d, true);
        if (R.roll <= 0) { const v = (ROLLC * (1 - PHYS.rollEase) * whole) / T_ * 0.45; g.wx = R.rdx * v; g.wz = R.rdz * v; g.landT = R.t + 0.3; } } // (you land still moving: your feet take it up or run it down)
      if (R.roll <= 0) R.dash = false;
    } else if (R.block) { R.breath -= P.blockDrain * tireCost() * dt; if (R.breath <= 0) { R.breath = 0; lowerShield(R, true); } }
    else { R.breath = Math.min(P.breathMax, R.breath + P.breathRegen * (boon("bala") ? 1.5 : 1) * (kept("varuna") ? 1.2 : 1) * dt); if (R.winded && R.breath >= P.rollMin) R.winded = false; }
    if (R.unseen > 0) R.unseen -= dt;
    if (R.kneelPose > 0) R.kneelPose -= dt;
    if (R.broken) { if (R.spOff > 0) { R.spOff -= dt; if (R.spOff <= 0) { const gd = { id: ++R.gid, x: clamp(g.x + rr(-3, 3), -R.rad + 2, R.rad - 2), z: R.rad * 0.55, at: R.t + 0.6 }; R.ground.push(gd); R.fx.push({ k: "shieldthrown", g: gd }); } }
      const gd = R.ground.find((o) => R.t >= o.at && Math.hypot(o.x - g.x, o.z - g.z) <= P.pickup); if (gd && !held(p)) { R.ground.splice(R.ground.indexOf(gd), 1); R.broken = false; R.spOff = 0; R.sp = P.shieldPts; R.fx.push({ k: "shieldup", id: gd.id }); } }
    if (R.skillCd > 0) R.skillCd -= dt;
    if (R.herbCd > 0) R.herbCd -= dt;
    if (R.kneel > 0) { R.kneel -= dt; if (R.kneel <= 0) { const h0 = p.hp; C.core.use(p, "herbs", p.uid); if (boon("sanjivani") && (K.S.charges || {}).sanjivani && p.hp > h0) p.hp = Math.min(p.maxHp, p.hp + Math.round((p.hp - h0) * 0.5)); delete p.cds.herbs; R.herbCd = 2 * ROUND; R.fx.push({ k: "heal", uid: p.uid }); } return; }
    if (R.salve && R.t >= R.salve.next) { living(B, "friends").filter((u) => !u.still && dist(u, p) <= 5.5).forEach((u) => B.heal(p, u, Math.max(1, Math.round(u.maxHp * 0.28 / 3)))); R.fx.push({ k: "heal", uid: p.uid }); R.salve.left--; R.salve.next = R.t + 1; if (!R.salve.left) R.salve = null; }
    if (g.stepT > 0) { g.stepT -= dt; walk(R, p, g.stepX, g.stepZ, dt); }
    if (g.blow && R.t >= g.blow.at) landBlow(R);
    if (g.busy > 0) { g.busy -= dt; if (g.busy <= 0 && R.buffer) { R.buffer = false; if (!g.blow) blow(R); } }
    if (held(p) || R.roll > 0) return;
    // Turning and stepping are two things (owner, 13 November: "turn left and walk left should mean two different
    // things"). a.turn (+1 left, -1 right) turns you where you stand; the stick or the keys move you without turning you
    // whenever a foe is near enough to fight, so a step to the left is a side-step with your face still to him. Once you
    // have turned yourself, your facing is yours for turnHold seconds (or until you choose a foe), and you step in it.
    const tn = clamp(a.turn || 0, -1, 1);
    if (Math.abs(tn) > 0.05 && g.busy <= 0) { g.a += tn * P.turnRate * dt; R.faceHold = R.t + P.turnHold; }
    if (a.lock || a.lockOn) R.faceHold = 0;
    const mine = R.faceHold > R.t;
    let mx = a.mx || 0, mz = a.mz || 0; const l = Math.hypot(mx, mz);
    if (l > 0.12 && g.busy <= 0) {
      if (l > 1) { mx /= l; mz /= l; }
      const rel = Math.abs(adiff(Math.atan2(mx, mz), g.a)), way = rel < 1.05 ? 1 : rel < 2.2 ? P.sideWalk : P.backWalk;   // (a side-step and a step back are slower than going where you face)
      const sp = g.speed * way * (RT.walkMul ? RT.walkMul() : 1) * (R.block ? P.blockWalk : 1) * (p.status.weakened ? 0.85 : 1);
      walk(R, p, mx * sp, mz * sp, dt);
      g.moving = Math.min(1, l) * (R.block ? P.blockWalk : 1);
      if (R.block) faceThreat(R);
      else if (mine) { /* (you step in the facing you chose) */ }
      else if (a.strafe) { // the close views: you keep your face to the one you fight, and step round him
        const f = R.through && R.goal ? null : R3.target(R);
        g.a = turnTo(g.a, f && dist(f, p) < 18 ? angTo(p, f) : a.look != null ? a.look : Math.atan2(mx, mz), 12 * dt);
      } else { const f = R.through && R.goal ? null : R3.target(R); // (from above: with a foe near, your face stays to him and you step; with none, you come round to the way you go, quickly and not in one frame)
        if (f && dist(f, p) < P.faceNear && !a.run) g.a = turnTo(g.a, angTo(p, f), 9 * dt); else g.a = turnTo(g.a, Math.atan2(mx, mz), PHYS.turn * dt); }
    } else if (R.block) faceThreat(R);
    else if (g.busy <= 0 && !mine) { const f = R3.target(R); if (f && dist(f, p) < 9) g.a = turnTo(g.a, angTo(p, f), 9 * dt); }
    if (R.through && R.goal && Math.hypot(g.x - R.goal.x, g.z - R.goal.z) <= R.goal.r && !B.enc.cannot) { B.progress = B.enc.reach || 1; R.reached = true; }
  }
  const turnTo = (a, to, max) => a + clamp(adiff(to, a), -max, max);
  // Move a body, kept on the field and out of other bodies (a roll passes through; where two meet, each gives by the other's weight).
  function rideStep(R, dt) {
    const p = C.player(), g = p && p.g; if (!g || !g.ride || p.hp <= 0) return;
    const a = R.rad * 0.56, b = R.rad * 0.4, c0 = R.rad * 0.06, th = (g.ride.th += 0.36 * dt);
    g.x = a * Math.sin(th); g.z = c0 + b * Math.cos(th); g.ca = Math.atan2(a * Math.cos(th), -b * Math.sin(th)); g.moving = 1;
  }
  function move(R, u, dx, dz, pass) {
    if (u.g.ride) return; // (the charioteer has the reins)
    const g = u.g; let x = g.x + dx, z = g.z + dz;
    if (!pass) for (const o of R.B.units) {
      if (o === u || o.hp <= 0 || !o.g || o.spared || (o.side === "enemy" && !o.g.entered) || o.g.kind === "light") continue;
      if (u.side !== "player" && o.side === "player" && u.side !== "enemy") continue;
      const min = g.rad + o.g.rad + (u.side !== o.side && !(u.side !== "enemy" && o.side !== "enemy") ? 0.25 : 0), ox = x - o.g.x, oz = z - o.g.z, d = Math.hypot(ox, oz);
      if (d < min && d > 1e-4) { // each gives ground by the other's weight (a wall's locked shields push as one)
        const pen = min - d, mu = weight(u) * (locked(R, u) ? 3 : 1), mo = weight(o) * brace(R, o, u), sh0 = mu / (mu + mo), share = sh0 > 0.8 ? 1 : sh0; /* (what is far the heavier is not turned from its way) */
        if (share > 0.004) { const bx = o.g.x, bz = o.g.z; shove(R, o, -(ox / d) * pen * share, -(oz / d) * pen * share); jostle(R, u, o, share); const got = Math.hypot(o.g.x - bx, o.g.z - bz); x += (ox / d) * (pen - got); z += (oz / d) * (pen - got); }
        else { x = o.g.x + (ox / d) * min; z = o.g.z + (oz / d) * min; }
      }
    }
    const r = Math.hypot(x, z), lim = R.rad - 0.3;
    if (r > lim && (u.side !== "enemy" || g.entered)) { x *= lim / r; z *= lim / r; }
    g.x = x; g.z = z;
  }

  // ---------- Foes ----------
  function cancel(u) { u.g.atk = null; u.g.cool = Math.max(u.g.cool, 0.6); }
  function targetable(R, f) {
    if (f.hp <= 0) return false;
    if (f.line) return true;
    if (f.still) return !!R.escort;
    if (f.side === "player") return R.unseen <= 0;
    if (f.called || f.person || !f.plural) return R.orders.friend !== "hold" || dist(f, C.player()) < 2.5;
    return R.orders.soldiers !== "stay";
  }
  function pickTarget(R, e) {
    const all = living(R.B, "friends").filter((f) => targetable(R, f));
    // A soldier of the line takes the nearest man of the other line; with none left standing he turns on you and yours.
    if (e.line) { const man = all.filter((f) => f.line).sort((a, b) => dist(a, e) - dist(b, e))[0]; if (man) return man; }
    const fr = (e.line ? all : all.filter((f) => !f.line)).filter((f) => !(who(e) === "bhishma" && /shikhandi/i.test(String(f.name || "")))); // (Bhishma will not strike Shikhandi)
    const cry = fr.find((f) => f.g && f.g.cryUntil > R.t); if (cry) return cry; // Bhima's war cry draws every blow
    const taunt = fr.find((f) => f.status.taunt); if (taunt) return taunt;
    const cart = R.escort && fr.find((f) => f.still); if (cart && K.rng() < 0.4) return cart;
    const p = fr.find((f) => f.side === "player");
    if (p && (K.rng() < 0.65 || fr.length === 1)) return p;
    return fr.filter((f) => f !== p && !f.still).sort((a, b) => dist(a, e) - dist(b, e))[0] || p || null;
  }
  function chooseMove(R, e, t) {
    const ab = e.abilities, g = e.g, ok = (id) => ab.includes(id) && !(g.cd[id] > 0), d = dist(e, t);
    if (g.kind === "light") return "heavy";
    if (ok("quake") && K.rng() < 0.25 && d <= P.quake) return "quake";
    const rangedIds = ab.filter((id) => RANGED.has(id) && ok(id));
    if (g.archer) return rangedIds.find((id) => id !== "arrows" && K.rng() < 0.3) || (ab.includes("arrows") ? "arrows" : rangedIds[0] || ab.find((id) => RANGED.has(id)) || "arrows");
    const close = d <= g.reach + P.lunge;
    if (rangedIds.length && !close && d > g.reach * 2.2 && K.rng() < 0.6) return rangedIds.find((id) => id !== "arrows" && K.rng() < 0.3) || (ok("arrows") ? "arrows" : rangedIds[0]);
    if ((ok("guard") || ok("brace")) && g.hits.filter((h) => R.t - h < 2).length >= 2 && K.rng() < 0.4) return ok("brace") ? "brace" : "guard";
    const heavy = ab.filter((id) => MELEE.has(id) && id !== "strike" && ok(id));
    if (heavy.length && K.rng() < 0.4) return K.pick(heavy);
    return ab.includes("strike") ? "strike" : ab.find((id) => MELEE.has(id)) || "strike";
  }
  const hitReach = (e) => e.g.reach + P.lunge + e.g.rad - 0.42;
  const ab0 = (e) => (e.abilities.includes("strike") ? "strike" : e.abilities.find((id) => MELEE.has(id)) || "strike");
  function startAttack(R, e, t) {
    const id = chooseMove(R, e, t), ab = K.ABILITIES[id], g = e.g;
    if (!ab) return;
    const ranged = RANGED.has(id), light = g.kind === "light";
    if (!ranged && !light && MELEE.has(id) && dist(e, t) > hitReach(e) + t.g.rad - 0.42) { g.cool = 0.2; return; }
    if (ab.target === "self" || ab.target === "ally" || ab.target === "allies") {
      ab.use(R.B, e, ab.target === "self" || ab.target === "ally" ? e : living(R.B, "enemy"));
      if (id === "brace" || id === "guard") R.fx.push({ k: "brace", uid: e.uid });
      if (ab.cd) g.cd[id] = ab.cd * ROUND;
      g.cool = rr(0.8, 1.4); return;
    }
    const area = id === "quake" || light;
    let wind = ranged ? P.track + P.lock : HEAVY.has(id) || area ? P.heavyWind * R.D.wind : g.windup;
    const arc = !ranged && !area && MELEE.has(id) && g.weapon === "mace" ? ((g.arcN = (g.arcN || 0) + 1) % 2 ? "smash" : "sweep") : null;
    if (arc) wind = Math.max(wind, arc === "smash" ? P.maceSmash : P.maceSweep);
    if (g.kind === "elephant") wind = Math.max(wind, 1.1);
    if (light) wind = 1.5;
    if (who(e) === "satyaki" && !ranged) wind *= 0.85; // a quick blade
    if (g.slowNext) { wind *= g.slowNext; g.slowNext = 0; } // heavy eyes (the sleep's gift): once
    if (ranged && g.archer && t.side === "player" && dist(e, t) <= t.g.reach * 1.15) wind += 0.45; // caught close, he draws slowly
    g.a = angTo(e, t);
    g.atk = { id, on: t.uid, t0: R.t, land: R.t + Math.max(0.3, wind), ranged, area, dir: g.a, locked: false, heavy: HEAVY.has(id) || area || arc === "smash" || g.kind === "elephant", arc,
      r: light ? 2.7 : P.quake, px: light ? t.g.x : null, pz: light ? t.g.z : null };
    if (!ranged && !area && MELEE.has(id) && R.D.feint > 0 && g.kind === "man" && K.rng() < R.D.feint) g.atk.feint = R.t + Math.max(0.3, wind) * 0.8;
    R.stats.maxAtk = Math.max(R.stats.maxAtk, R3.attacking(R));
    R.fx.push({ k: "windup", uid: e.uid, id, heavy: g.atk.heavy, ranged, arc, wind: g.atk.land - R.t });
  }
  function loose(R, e, a) {
    const g = e.g, on = R.B.units.find((u) => u.uid === a.on), s = { by: e.uid, side: e.side, id: a.id, on: a.on, x: g.x, z: g.z, y: FLY.y0 + (g.car ? 0.85 : 0), a: a.dir, vy: flat(P.arrow, on && on.g ? Math.max(3, dist(e, on)) : 10) - (g.car ? 0.85 / Math.max(0.1, (on && on.g ? Math.max(3, dist(e, on)) : 10) / P.arrow) : 0), t0: R.t, v: P.arrow, heavy: a.heavy, n: ++R.shotN, at0: a.t0, life: 1.6 };
    R.shots.push(s); R.fx.push({ k: "shot", uid: e.uid, shot: s });
    // Karna with the bow Vijaya: a second arrow is on the string before the first has landed. It comes down the same lane
    // a breath later, lighter than the first (so one sidestep or one raised shield does not answer both).
    if (who(e) === "karna" && K.S && K.S.act >= 6 && !a.second && !a.area && e.hp > 0) { g.second = { at: R.t + P.karnaSecond, a: Object.assign({}, a, { second: true, part: 0.6 }) }; tip(R, "karnaBow"); }
  }
  // Arrows fly: each rises and falls as its speed and its range make it (s.y, s.vy). Yours is loosed at where your man will
  // be and strikes the first of theirs it meets; a foe's flies down its lane and strikes the first of your side it meets.
  function shotsStep(R) {
    const B = R.B, dt = STEP;
    for (const s of R.shots.slice()) {
      if (R.t < s.t0) continue;
      const by = B.units.find((u) => u.uid === s.by);
      if (s.vy != null) { s.y += s.vy * dt; s.vy -= FLY.g * dt; }
      if (s.side !== "enemy") { // yours and your men's: it flies where it was sent, strikes the first of theirs it meets, or comes down in the ground
        s.x += Math.sin(s.a) * s.v * dt; s.z += Math.cos(s.a) * s.v * dt; s.life -= dt;
        const t = foesIn(R).find((e) => e.g.kind !== "light" && s.y > 0 && s.y < topOf(e) && Math.hypot(e.g.x - s.x, e.g.z - s.z) <= e.g.rad + (e.uid === s.on ? s.sure || 0.5 : 0.28));
        if (t) { R.shots.splice(R.shots.indexOf(s), 1); if (by) myShot(R, by, s, t); continue; }
        if (s.y <= 0 || s.life <= 0 || Math.hypot(s.x, s.z) > R.rad + 8) { R.shots.splice(R.shots.indexOf(s), 1); R.fx.push({ k: "arrive", shot: s, uid: null }); }
        continue;
      }
      s.x += Math.sin(s.a) * s.v * dt; s.z += Math.cos(s.a) * s.v * dt; s.life -= dt;
      const t = living(B, "friends").find((f) => f.g && Math.hypot(f.g.x - s.x, f.g.z - s.z) <= f.g.rad + 0.34 && (targetable(R, f) || f.side === "player"));
      if (t) { R.shots.splice(R.shots.indexOf(s), 1); if (by) resolve(R, by, { id: s.id, on: s.on, heavy: s.heavy, ranged: true, shot: s }, t); continue; }
      if (s.life <= 0 || s.y <= 0 || Math.hypot(s.x, s.z) > R.rad + 6) { R.shots.splice(R.shots.indexOf(s), 1); R.fx.push({ k: "arrive", shot: s, uid: null }); }
    }
  }
  function myShot(R, p, s, t) {
    const B = R.B;
    R.fx.push({ k: "arrive", shot: s, uid: t.uid });
    if (t.decoy) { vanishDecoy(R, t); return; }
    if (s.m) {
      const mine = p.side === "player", caught = mine ? foeBlocks(R, t, s.heavy, true) : 1, bb = mine && R.boonBlow ? R.boonBlow : 1; if (mine) R.boonBlow = 0;
      const d = mine ? floored(R, t, B.hit(p, t, s.m * caught * bb), s.m * caught * bb) : B.hit(p, t, s.m);
      if (mine) { R.stats.hits++; storyHit(R, t); if (s.heavy && caught === 1) giftsOnHeavy(R, t, d); }
      hitFx(R, t, d, s.heavy, p, false, caught < 1); t.g.hits.push(R.t); if (mine && R.task && t.uid === R.task.uid) t.g.struck = true;
      if (s.knock && t.hp > 0) knock(R, t, s.a, s.knock, false);
      else if (mine && t.hp > 0 && d > 0) knock(R, t, s.a, P.arrowPush, false);
      return;
    }
    const before = t.hp; K.ABILITIES[s.id].use(B, p, t); hitFx(R, t, before - t.hp, true, p, false);
  }
  function landAttack(R, e) {
    const a = e.g.atk, ab = K.ABILITIES[a.id], g = e.g, m = fanOf(e, a);
    g.atk = null;
    if (ab.cd && a.id !== "arrows") g.cd[a.id] = ab.cd * ROUND;
    const tr = traitRest(R, e); if (tr < 1) tip(R, who(e));
    g.cool = rr(P.gap[0], P.gap[1]) * R.D.rest * (a.heavy ? 1.2 : 1) * (g.archer ? 0.6 * (R.stance === "flank" ? P.flankRest : 1) : 1) * (g.kind === "light" ? 0.7 : 1) * tr * (common(e) && led(R, e) ? P.ledRest : 1) * (R.shaken && !R.routed ? P.shakenRest : 1);
    const open = ((RT.OPEN[g.weapon] != null ? RT.OPEN[g.weapon] : 0.35) + (a.heavy && g.weapon !== "mace" ? 0.15 : 0)) * (who(e) === "duryodhana" && g.weapon === "mace" ? 0.85 : 1) + (g.cls === "heavy" && a.heavy ? P.crushOpen : 0);
    g.rec = open; g.openUntil = R.t + open;
    R.fx.push({ k: "swing", uid: e.uid, id: a.id, arc: a.arc, area: a.area, x: m.x, z: m.z, r: m.r });
    if (a.ranged) return loose(R, e, a);
    const B = R.B, p = C.player();
    const fr = living(B, "friends").filter((f) => inside(m, f) && (targetable(R, f) || f.side === "player"));
    if (a.area) { // everyone standing in it
      const ts = fr.filter((f) => !(f === p && (R.roll > 0 || R.unseen > 0)));
      if (fr.includes(p) && !ts.includes(p)) dodged(R, e);
      ts.forEach((t) => resolve(R, e, a, t));
      return;
    }
    // The blow lands on you if you stand in its path, else on the one it was meant for, else on whoever is there.
    const t = fr.includes(p) ? p : fr.find((f) => f.uid === a.on) || fr[0] || null;
    if (!t) { if (a.on === p.uid && R.t - R.rollT >= 0 && R.t - R.rollT <= P.roll + STEP) dodged(R, e); else R.fx.push({ k: "whiff", uid: e.uid }); return; }
    resolve(R, e, a, t);
  }
  function dodged(R, e) {
    R.stats.dodged++;
    R.B.tell("You dodge {a}'s blow.", { a: e });
    if (R.t - R.rollT <= P.perfect * R.D.perfect + STEP && R.t - R.rollT >= 0) { R.slow = 1.2; R.stats.perfect++; if (indra()) R.breath = Math.min(P.breathMax, R.breath + P.rollCost * tireCost() * 0.25); R.fx.push({ k: "perfect" }); }
    R.fx.push({ k: "miss", uid: C.player().uid });
  }
  // One blow arriving on one of your side: your roll, your shield, your soldiers' shields, then the hit itself.
  function resolve(R, e, a, t) {
    const B = R.B, ab = K.ABILITIES[a.id], p = C.player();
    if (t === p && (R.roll > 0 || R.unseen > 0)) { if (a.shot) R.fx.push({ k: "arrive", shot: a.shot, uid: null }); return dodged(R, e); }
    if (t.side === "ally" && !t.still && K.rng() < allyDodge(R, t)) { R.fx.push({ k: "miss", uid: t.uid }); if (a.shot) R.fx.push({ k: "arrive", shot: a.shot, uid: null }); return; }
    if (a.shot) R.fx.push({ k: "arrive", shot: a.shot, uid: t.uid });
    const before = t.hp, from = a.shot ? Math.atan2(-Math.sin(a.shot.a), -Math.cos(a.shot.a)) : angTo(t, e);
    let sh = 1, blocked = false, perfectBlock = false;
    const frontal = t === p && Math.abs(adiff(from, p.g.a)) <= P.blockArc / 2 + 0.35;
    const tier = RT.tierOf(e), STR = RT.STRENGTH;
    if (t === p && R.block && frontal) {
      blocked = true; R.stats.blocked++;
      perfectBlock = R.t - R.blockT <= P.blockPerfect * R.D.perfect + STEP;
      const breaker = a.id === "breaker", crush = e.g.cls === "heavy" && a.heavy && !a.ranged;
      sh = perfectBlock ? 0 : (crush ? P.crush : (breaker ? P.blockBreaker : a.heavy ? P.blockHeavy : P.blockThrough) * STR.through[tier]);
      if (crush && !perfectBlock) { R.fx.push({ k: "guardbreak", uid: e.uid }); tip(R, "c_heavy"); a.crushed = true; }
      R.breath -= (perfectBlock ? 0.5 : 1) * (a.heavy || breaker ? P.blockHitHeavy : P.blockHit) * (breaker ? 1.5 : 1) * (a.ranged ? 0.35 : 1) * STR.breath[tier];
      if (perfectBlock) { R.stats.perfectBlocks++; if (indra()) R.breath = Math.min(P.breathMax, R.breath + P.blockMin * tireCost() * 0.25); if (!a.ranged && !steady(e)) { e.g.stag = Math.max(e.g.stag, P.blockStag); e.g.rec = 0; } R.fx.push({ k: "perfectblock", uid: e.uid }); }
      if (!a.ranged) { const pts = RT.shieldHit(e, e.g.weapon, a.heavy && !a.arc) * (perfectBlock ? 0.5 : 1); if (pts > 0) shieldTakes(R, p, pts); }
      if (R.breath <= 0 && R.block) { R.breath = 0; lowerShield(R, true); }
      if (a.crushed && R.block) lowerShield(R, false);   // (beaten down: it must be raised again)
    } else if (t !== p && isSoldiers(t) && R.orders.soldiers === "defend" && a.on === t.uid) sh = P.shieldSoldiers;
    else if (t === p && R.shield && !R.broken && frontal) sh = P.shieldYou;
    if (a.arc) sh *= P.maceHit;
    if (a.part && t === p) sh *= a.part;
    if (t === p && !frontal && R.stance && sh > 0) sh *= R.stance === "hold" ? P.holdBack : R.stance === "centre" ? P.centreBack : 1;   // your own plan: who is at your back
    if (a.set && sh > 0) sh *= P.setHit;                                                     // a set spear: the weight of your own run is in it
    if (e.g.cls === "skirm" && t === p && !frontal && !a.ranged && sh > 0) { sh *= P.backHit; tip(R, "c_skirm"); }   // a skirmisher at your back
    if (blocked || sh < (a.arc ? P.maceHit : 1)) R.fx.push({ k: "spark", uid: t.uid, block: blocked, arrow: !!a.ranged });
    if (t === p && sh > 0) sh *= (P.vsPath[K.S.path] || 1);
    const doHit = () => { if (a.id === "arrows") B.hit(e, t, 1, { verb: "Arrows rain on {t} for {n}." }); else ab.use(B, e, ab.target === "enemies" ? [t] : t); };
    if (sh > 0) { if (sh !== 1) { const atk = e.atk; e.atk = Math.round(atk * sh * 10) / 10; try { doHit(); } finally { e.atk = atk; } } else doHit(); }
    hitFx(R, t, before - t.hp, a.heavy, e, !a.ranged, blocked);
    if (!a.area) nudge(R, t, from + Math.PI, blocked ? (a.heavy ? 0.3 : 0.12) : before > t.hp ? (a.ranged ? 0.14 : a.heavy ? 0.42 : 0.24) : 0); // (you give ground to every blow, a little on your shield)
    { const w = who(e); // after a champion's blow: Bhurishravas's heavy blow knocks you down; Abhimanyu's sweeps the next one too
      if ((w === "bhurishravas" || w === "ugra") && a.heavy && t === p && before > t.hp && !blocked && !perfectBlock) { p.g.busy = Math.max(p.g.busy, 0.6); p.g.blow = null; R.fx.push({ k: "knocked", uid: p.uid }); tip(R, w); }   // (Ugra, the wrestler: his great blow is a throw)
      if (w === "abhimanyu" && !a.ranged && t.hp >= 0) sweepNext(R, e, t); }
    if (a.set && t === p && before > t.hp && !blocked) { p.g.busy = Math.max(p.g.busy, 0.35); p.g.blow = null; R.combo = 0; }   // (run onto a point, you are stopped)
    if (t === p && before > t.hp) { R.stats.taken += before - t.hp; R.kneel = 0; R.salveStop = true; if (a.heavy && !blocked && (!RT.P.strength || tier >= RT.tierOf(p))) { p.g.busy = Math.max(p.g.busy, 0.25 * STR.knock[tier]); p.g.blow = null; } } // (only one of your tier or above staggers you)
    // A mace's sweep, an elephant, a heavy blow from a champion: thrown back.
    if (t.hp > 0 && !perfectBlock && (a.arc === "sweep" || e.g.kind === "elephant" || (a.heavy && tier >= 2 && !a.ranged))) { const d = (e.g.kind === "elephant" ? 2.6 : P.maceShove) * (blocked ? 0.5 : 1) * STR.knock[tier]; t.g.vx += Math.sin(from + Math.PI) * d * PHYS.knock; t.g.vz += Math.cos(from + Math.PI) * d * PHYS.knock; }
  }
  function foeStep(R, e, dt) {
    const B = R.B, p = C.player(), g = e.g;
    if (e.decoy) { if (R.t >= e.decoy || !B.units.some((x) => x.uid === e.real && x.hp > 0)) vanishDecoy(R, e); else if (p && p.g) g.a = turnTo(g.a, angTo(e, p), 6 * dt); return; } // a false Ghatotkacha only stands and looks at you
    if (g.flee) { // he has seen a divine weapon land: he runs, and is out of the fight
      g.a = turnTo(g.a, angTo(p, e), 9 * dt); g.x += Math.sin(g.a) * 5.4 * dt; g.z += Math.cos(g.a) * 5.4 * dt; g.moving = 1; g.atk = null; g.walkN = R.n; g.wx = Math.sin(g.a) * 5.4; g.wz = Math.cos(g.a) * 5.4;
      if (R.t >= g.flee) { e.hp = 0; e.fled = true; R.fx.push({ k: "fled", uid: e.uid }); }
      return; }
    traitStep(R, e);
    if (g.second && R.t >= g.second.at) { const a2 = g.second.a; g.second = null; if (!g.flee && !(g.down > 0) && !(g.stag > 0)) { const on = B.units.find((x) => x.uid === a2.on); if (on && on.hp > 0 && on.g) a2.dir = angTo(e, on); loose(R, e, a2); } }   // (Karna's second arrow)
    if (g.cls === "skirm" && !e.line && !g.role && e.hp > 0 && e.hp <= e.maxHp * P.skirmRun && !B.enc.spare && !B.enc.rounds && !B.enc.hold && living(B, "enemy").filter((x) => !x.line && !x.g.flee).length > 1) { g.flee = R.t + 1.7; if (g.atk) cancel(e); R.fx.push({ k: "runs", uid: e.uid }); tip(R, "c_skirm"); return; }   // (hurt, he has had enough: he is out of the fight; the last man standing has nowhere to run)
    if (g.wheelUntil > R.t) return; // Karna frees his sunken wheel
    if (g.boundUntil > R.t && !g.atk) { g.moving = 0; if (g.cool > 0) g.cool -= dt; return; } // the serpent's coil: his feet are held
    for (const k of Object.keys(g.cd)) if (g.cd[k] > 0) g.cd[k] -= dt;
    if (g.cool > 0 && !g.atk) g.cool -= dt;
    g.moving = 0;
    if (g.down > 0) { g.down -= dt; return; }
    if (g.stag > 0) { g.stag -= dt; return; }
    if (held(e)) { if (g.atk) cancel(e); return; }
    if (e.still) return;
    if (g.rec > 0) { g.rec -= dt; return; }
    if (!g.entered) { // waiting off the field: the next come on as it thins
      if (foesIn(R).filter((x) => !x.line).length >= Math.max(3, B.enc.atOnce || 3) && g.wave) return;
      const d = Math.hypot(g.x, g.z); g.x -= (g.x / d) * g.speed * dt; g.z -= (g.z / d) * g.speed * dt; g.moving = 1; g.a = Math.atan2(-g.x, -g.z); g.walkN = R.n; g.wx = -(g.x / d) * g.speed; g.wz = -(g.z / d) * g.speed; if (wheeled(e)) { g.ca = g.a; g.cv = g.speed; }
      if (d <= R.rad - 1) { g.entered = true; R.fx.push({ k: "enter", uid: e.uid }); }
      return;
    }
    if (B.enc.spare && !e.line && e.hp <= e.maxHp * C.PLEAD) { if (!g.beaten) { g.beaten = true; if (g.atk) cancel(e); R.fx.push({ k: "beaten", uid: e.uid }); } return; }
    if (g.atk && g.atk.feint && R.t >= g.atk.feint) { const a = g.atk, w = a.land - a.t0; a.feint = 0; a.t0 = R.t + 0.3; a.land = a.t0 + w; a.feinted = true; R.fx.push({ k: "feint", uid: e.uid }); }
    if (g.atk) {
      const a = g.atk, t = B.units.find((x) => x.uid === a.on);
      const left = a.land - R.t;
      if (t && t.hp > 0 && !a.locked) {
        if (a.area && a.px != null) { if (left > 0.6) { a.px = t.g.x; a.pz = t.g.z; } else a.locked = true; }
        else if (!a.area) {
          // He turns after his mark as he winds up (an arrow's lane follows freely), then commits.
          const want = angTo(e, t), rate = a.ranged ? 9 : P.turn * (e.hero || e.person ? 1.5 : 1) * (a.heavy ? 0.8 : 1);
          a.dir = turnTo(a.dir, want, rate * dt); if (g.kind === "elephant" && g.ca != null) a.dir = g.ca + clamp(adiff(a.dir, g.ca), -0.6, 0.6); /* (its head swings a little way; the rest is the whole beast coming round) */ g.a = a.dir;
          if (left <= (a.ranged ? P.lock : P.meleeLock)) a.locked = true;
        }
      }
      if (left <= 1e-6) landAttack(R, e);
      else if (g.kind === "elephant" && !e.still) drive(R, e, Math.sin(a.dir), Math.cos(a.dir), 0, dt); // (it comes round on its mark as it winds up)
      else if (g.car && !e.still && !g.role) drive(R, e, g.dmx || 0, g.dmz || 0, (g.dsp || 0) * 0.6, dt); // (a car does not stop for the draw: he looses as it rolls)
      return;
    }
    if (g.role && R.plan && roleStep(R, e, dt)) return;
    if (g.cls === "spear" && !(g.cd.set > 0) && p.hp > 0 && R.unseen <= 0 && R.roll <= 0 && onField(R, e) && !g.role) {   // his point is set at a man who runs straight onto it
      const d0 = dist(e, p), vx = p.g.lx || 0, vz = p.g.lz || 0, sp = Math.hypot(vx, vz), to = angTo(p, e);
      if (sp >= P.setRun && d0 <= hitReach(e) + P.setReach && d0 > 1.0 && (vx * Math.sin(to) + vz * Math.cos(to)) / sp > 0.8 && Math.abs(adiff(angTo(e, p), g.a)) < 0.75) {
        g.cd.set = P.setCd; g.a = angTo(e, p);
        g.atk = { id: ab0(e), on: p.uid, t0: R.t, land: R.t + P.setWind, ranged: false, area: false, dir: g.a, locked: true, heavy: false, arc: null, set: true };
        R.fx.push({ k: "windup", uid: e.uid, id: g.atk.id, heavy: false, ranged: false, arc: null, wind: P.setWind }); R.fx.push({ k: "setspear", uid: e.uid }); tip(R, "c_spear"); return; } }
    if (R.morale && !R.routed && R.morale.theirs < 35 && common(e) && !led(R, e) && g.cool <= 0 && K.rng() < dt * 0.6) g.cool = 1.3; // (a host losing heart: its common men hang back, unless a captain stands by them)
    let t = B.units.find((x) => x.uid === g.tgt);
    if (!t || !targetable(R, t) || (g.cool <= 0 && K.rng() < 0.02 && g.role !== "raider")) { t = pickTarget(R, e); g.tgt = t ? t.uid : null; }
    if (!t) return;
    const d = dist(e, t), ang = angTo(e, t);
    g.a = turnTo(g.a, ang, 6 * dt); if (g.kind === "elephant" && g.ca != null) g.a = g.ca + clamp(adiff(g.a, g.ca), -0.6, 0.6);
    if (g.kind === "light") { if (g.cool <= 0 && R3.attacking(R) < 2) startAttack(R, e, t); return; }
    const own = !!e.line && t.side !== "player"; // a soldier of the line at his own man: no part of the turn-taking against you
    const others = living(B, "enemy").filter((o) => o !== e && o.g.atk && !(o.line && o.g.atk.on !== p.uid));
    const spaced = own || others.every((o) => Math.abs(o.g.atk.land - (R.t + (g.archer ? P.track + P.lock : g.windup))) >= 0.45 * R.D.pair);
    const inRange = g.ranged && (g.archer || d > g.reach * 2.2) ? d <= 19 : d <= hitReach(e) + t.g.rad - 0.42 - 0.12;
    const free = own || R3.attacking(R) < blowsAtOnce(R);
    const mayAttack = g.cool <= 0 && free && spaced && onField(R, e);
    if (mayAttack && inRange && (g.kind !== "elephant" || g.ca == null || Math.abs(adiff(ang, g.ca)) < 0.7)) { startAttack(R, e, t); return; } // (an elephant strikes at what is in front of it)
    // Where to stand: an archer keeps his distance; a man with a turn to strike closes; the rest circle and wait.
    const engaged = (g.cool <= 0.9 && free && !g.archer) || (!!e.captive && !!R.task && R.task.uid === e.uid);   // (a man cut off from his own does not circle and wait his turn: he stands and fights where he is)
    let want = g.archer ? g.keep : engaged ? (g.reach * 0.9 + t.g.rad - 0.42) : Math.max(g.reach + 1.4, P.wait);
    let mx = 0, mz = 0;
    if (g.archer) {
      const edge = Math.hypot(g.x, g.z) > R.rad - 1.4;
      if (d < want - 2.2 && !(edge && d < 4)) { mx -= Math.sin(ang); mz -= Math.cos(ang); }
      else if (d > want + 2.5) { mx += Math.sin(ang); mz += Math.cos(ang); }
      mx += Math.cos(ang) * g.orbit * (g.car ? 1 : 0.35); mz -= Math.sin(ang) * g.orbit * (g.car ? 1 : 0.35); // (a car keeps moving: it wheels round you as he shoots)
      if (edge && !g.car) { mx -= g.x / R.rad * 0.8; mz -= g.z / R.rad * 0.8; }
    } else {
      if (d > want + 0.15) { mx += Math.sin(ang); mz += Math.cos(ang); }
      else if (d < want - 0.5 && g.kind !== "elephant") { mx -= Math.sin(ang) * 0.7; mz -= Math.cos(ang) * 0.7; } // (an elephant does not back off a man)
      if (!engaged && g.cls === "skirm" && t === p && !e.line) {   // waiting his turn, a skirmisher does not circle in front of you: he goes for the ground at your back
        const bx = p.g.x - Math.sin(p.g.a) * 2.6, bz = p.g.z - Math.cos(p.g.a) * 2.6, behind = Math.abs(adiff(angTo(p, e), p.g.a)) > 2.1;
        if (!behind) { const side = adiff(angTo(p, e), p.g.a) >= 0 ? 1 : -1, wx = p.g.x + Math.sin(p.g.a + side * 1.9) * 3.4, wz = p.g.z + Math.cos(p.g.a + side * 1.9) * 3.4, wl = Math.hypot(wx - g.x, wz - g.z) || 1; mx = (wx - g.x) / wl; mz = (wz - g.z) / wl; }   // (round by the side he is already on, out of your weapon's reach)
        else { const bl = Math.hypot(bx - g.x, bz - g.z) || 1; mx = (bx - g.x) / bl * Math.min(1, bl); mz = (bz - g.z) / bl * Math.min(1, bl); }
      } else if (!engaged) { mx += Math.cos(ang) * g.orbit * 0.55; mz -= Math.sin(ang) * g.orbit * 0.55; if (K.rng() < dt * 0.25) g.orbit = -g.orbit; }
    }
    // Keep off each other, so each stands clear on the ground.
    for (const o of living(B, "enemy")) { if (o === e || !o.g.entered) continue; const od = dist(o, e); if (od < 1.7 + o.g.rad) { mx += (g.x - o.g.x) / (od + 0.01) * 0.9; mz += (g.z - o.g.z) / (od + 0.01) * 0.9; } }
    if (g.role === "wall" && g.sx != null) { mx = g.sx - g.x; mz = g.sz - g.z; g.a = turnTo(g.a, g.sa, 6 * dt); const wl = Math.hypot(mx, mz); if (wl > 1) { mx /= wl; mz /= wl; } } // (the wall keeps its line and comes on at a walk)
    const l = Math.hypot(mx, mz);
    if (l > 0.05) { const sp = g.speed * (g.role === "wall" ? 0.6 : g.role === "raider" ? 1.25 : engaged ? 1 : g.car ? 0.62 : g.cls === "skirm" && t === p ? 0.95 : 0.55) * Math.min(1, l); g.dmx = mx; g.dmz = mz; g.dsp = sp; goTo(R, e, mx, mz, sp, dt); g.moving = Math.min(1, l) * (engaged ? 1 : 0.55); }
    else if (g.kind === "elephant") drive(R, e, Math.sin(ang), Math.cos(ang), 0, dt); // (standing, it still comes round to face its man)
  }

  // ---------- Friends and soldiers ----------
  function allyDodge(R, a) { if (isSoldiers(a)) return 0.2; return { balanced: 0.35, guard: 0.25, allout: 0.05, hold: 0.5 }[R.orders.friend] || 0.3; }
  function allyStep(R, a, dt) {
    const B = R.B, p = C.player(), g = a.g;
    g.moving = 0;
    if (who(a) === "bhima" && a.hp > 0 && R.t >= (g.cryNext || 4)) { g.cryUntil = R.t + 3; g.cryNext = R.t + 15; R.fx.push({ k: "cry", uid: a.uid }); tip(R, "bhima"); } // his war cry, every 15 s, turns every foe on him for 3 s
    if (a.still) return;
    if (R.duel && !a.line) { if (g.atk) g.atk = null; const c = B.units.find((u) => u.uid === R.duel.uid) || p, d = dist(a, c); if (d < 7) { const an = angTo(c, a); walk(R, a, Math.sin(an) * g.speed * 0.7, Math.cos(an) * g.speed * 0.7, dt); g.moving = 0.7; } g.a = turnTo(g.a, angTo(a, c), 6 * dt); return; } // (single combat: your men stand off and watch)
    if (g.down > 0) { g.down -= dt; return; }
    if (held(a)) { g.atk = null; return; }
    if (g.rec > 0) { g.rec -= dt; return; }
    const man = a.line ? foesIn(R).filter((e) => e.line).sort((x, y) => dist(x, a) - dist(y, a))[0] || null : null; // a soldier of your line has his own man
    // (Until you give an order, a soldier of your line fights the man in front of him. Once you have given one, the whole
    //  line obeys it like everyone else: the owner found they went on with their own fights whatever he ordered.)
    const obey = !!R.orders.given;
    const order = a.line ? (man && !obey ? "allout" : R.orders.soldiers) : isSoldiers(a) ? R.orders.soldiers : R.orders.friend, hast = R.haste > 0 ? 0.7 : 1;
    if (g.atk) {
      if (R.t >= g.atk.land - 1e-6) {
        const t = B.units.find((x) => x.uid === g.atk.on && x.hp > 0), id = g.atk.id, shot = !!g.atk.ranged; g.atk = null;
        g.cool = rr(1.4, 2.3) * hast * (order === "allout" ? 0.75 : 1); g.rec = 0.3;
        const ab = K.ABILITIES[id];
        if (shot && t) { const am = aimAt(g, t, P.myArrow, 0), s = { by: a.uid, side: a.side, m: order === "allout" ? 1.25 : 1, on: t.uid, x: g.x, z: g.z, y: FLY.y0, a: am.a, vy: am.vy, t0: R.t, v: P.myArrow, n: ++R.shotN, sure: 0.7, life: 1.2 }; R.shots.push(s); R.fx.push({ k: "shot", uid: a.uid, shot: s }); }
        else if (ab.target === "ally") { ab.use(B, a, t); R.fx.push({ k: "heal", uid: t && t.uid }); }
        else if (t && dist(a, t) <= g.reach * 1.25 + P.lunge + t.g.rad) { const before = t.hp; if (order === "allout" && id === "strike") B.hit(a, t, 1.25); else ab.use(B, a, ab.target === "enemies" ? [t] : t); hitFx(R, t, before - t.hp, false, a, MELEE.has(id)); if (who(a) === "abhimanyu" && MELEE.has(id)) sweepNext(R, a, t); R.fx.push({ k: "swing", uid: a.uid, id }); }
      }
      return;
    }
    if (g.cool > 0) g.cool -= dt;
    for (const k of Object.keys(g.cd)) if (g.cd[k] > 0) g.cd[k] -= dt;
    const foes = foesIn(R).filter((e) => e.g.kind !== "light");
    const low = order === "balanced" && a.hp < a.maxHp * 0.35;
    // The six orders (R.orders.form): follow me, guard me; stick together or spread across, to attack or to defend.
    // A soldier of the line who has his own man in front of him finishes that first.
    const form = man && !obey ? null : R.orders.form || null, at = R.orders.at, idx = g.sideIdx || 0, wing = idx % 2 ? 1 : -1, rank = Math.floor(idx / 2);
    let gx, gz, foe = null, post = false;
    const behind = (k, side) => { gx = p.g.x - Math.sin(p.g.a) * k + Math.cos(p.g.a) * side; gz = p.g.z - Math.cos(p.g.a) * k - Math.sin(p.g.a) * side; };
    const side = (g.sideIdx % 2 ? 1 : -1) * (2.6 + Math.floor(g.sideIdx / 2) * 1.4); // beside you, not behind: clear of the camera
    const reachOf = (e) => (g.archer ? 14 : g.reach * 1.05 + P.lunge + e.g.rad - 0.42);
    if (form === "follow" && !low) { // at your heels; they strike only what comes within their reach
      behind(1.5 + rank * 0.9, wing * (1.2 + rank * 0.5)); foe = foes.filter((e) => dist(e, a) <= reachOf(e)).sort((x, y) => dist(x, a) - dist(y, a))[0] || null; post = true; }
    else if ((form === "wall" || form === "line") && at && !low) { // a stand where the order was given: shoulder to shoulder, or strung out across the field
      const gap = form === "wall" ? 1.25 : 3.3, off = wing * (gap * (form === "wall" ? 0.6 : 0.55) + rank * gap), fa = at[2], px = at[0] + Math.sin(fa) * 1.6 + Math.cos(fa) * off, pz = at[1] + Math.cos(fa) * 1.6 - Math.sin(fa) * off;
      gx = px; gz = pz; post = true;
      const zone = form === "wall" ? 0 : 4.2; // strung out, each man goes to meet what comes into his own ground, and then back to his post
      foe = foes.filter((e) => dist(e, a) <= reachOf(e) || Math.hypot(e.g.x - px, e.g.z - pz) <= zone).sort((x, y) => dist(x, a) - dist(y, a))[0] || null;
      if (foe && zone && !g.archer && dist(a, foe) > reachOf(foe)) { const an = angTo(foe, a), r = g.reach * 0.9 + foe.g.rad; gx = foe.g.x + Math.sin(an) * r; gz = foe.g.z + Math.cos(an) * r; }
      if (!foe) g.a = turnTo(g.a, fa, 6 * dt); }
    else if (form === "tight" && !low) { // one body on one foe: the one you face, else the nearest to you
      const mine = R.lock && foes.find((e) => e.uid === R.lock); foe = mine || foes.slice().sort((x, y) => dist(x, p) - dist(y, p))[0] || null;
      if (foe) { const an = angTo(foe, p) + wing * (0.28 + rank * 0.3), r = g.archer ? 8 : g.reach * 0.9 + foe.g.rad; gx = foe.g.x + Math.sin(an) * r; gz = foe.g.z + Math.cos(an) * r; } else behind(0.6, side); }
    else if (form === "spread" && !low) { // each to a foe of his own: the nearest that no comrade has taken
      const free = foes.filter((e) => !(e.g.takenT === R.t && e.g.takenBy !== a.uid)).sort((x, y) => dist(x, a) - dist(y, a))[0] || null; foe = free || foes.slice().sort((x, y) => dist(x, a) - dist(y, a))[0] || null;
      if (foe) { foe.g.takenT = R.t; foe.g.takenBy = a.uid; const an = angTo(foe, a), r = g.archer ? 8 : g.reach * 0.9 + foe.g.rad; gx = foe.g.x + Math.sin(an) * r; gz = foe.g.z + Math.cos(an) * r; } else behind(0.6, side); }
    else if (obey && a.line && !form && !low) { // "Guard me", to the men of your line: a ring round you, and whoever comes at you is theirs
      const an = idx * 2.4; gx = p.g.x + Math.sin(an) * 2.7; gz = p.g.z + Math.cos(an) * 2.7; foe = foes.filter((e) => dist(e, p) <= 5.5).sort((x, y) => dist(x, a) - dist(y, a))[0] || null; post = true; }
    else if (order === "stay" || order === "hold" || low) behind(low ? 2.2 : 1.2, side);
    else {
      const far = (x, from) => dist(x, from) * (x.line ? 2.5 : 1); // those who came with you keep to the named
      if (man) foe = man;
      else if (order === "guard" || order === "defend") foe = foes.filter((e) => dist(e, p) <= Math.max(5, e.g.reach + 3)).sort((x, y) => far(x, p) - far(y, p))[0] || null;
      else if (order === "allout") foe = foes.slice().sort((x, y) => far(x, a) - far(y, a))[0] || null;
      else foe = foes.slice().sort((x, y) => far(x, p) - far(y, p))[0] || null;
      if (foe) { const an = angTo(foe, a), r = g.archer ? 8 : g.reach * 0.9 + foe.g.rad; gx = foe.g.x + Math.sin(an + side * 0.12) * r; gz = foe.g.z + Math.cos(an + side * 0.12) * r; }
      else behind(0.6, side);
    }
    { const pd = dist(a, p); if (pd < 1.15) { gx = g.x + (g.x - p.g.x) / (pd + 0.01) * 1.2; gz = g.z + (g.z - p.g.z) / (pd + 0.01) * 1.2; } } // never standing in you
    const dx = gx - g.x, dz = gz - g.z, d = Math.hypot(dx, dz);
    if (d > 0.25) { const sp = g.speed * Math.min(1, d / 0.8); walk(R, a, (dx / d) * sp, (dz / d) * sp, dt); g.moving = Math.min(1, d / 0.8); g.a = turnTo(g.a, Math.atan2(dx, dz), 8 * dt); }
    if (foe && d <= 0.6) g.a = turnTo(g.a, angTo(a, foe), 8 * dt);
    const hurt = living(B, "friends").find((f) => !f.still && f.hp / f.maxHp < 0.45 && dist(f, a) < 5);
    if (g.cool <= 0 && hurt && a.abilities.includes("salve") && !(g.cd.salve > 0)) { g.atk = { id: "salve", on: hurt.uid, land: R.t + 0.5, t0: R.t }; g.cd.salve = 3 * ROUND; return; }
    if (((order === "stay" || order === "hold") && !post) || low || !foe || g.cool > 0) return;
    if (g.archer ? dist(a, foe) <= 14 : dist(a, foe) <= g.reach * 1.05 + P.lunge + foe.g.rad - 0.42) {
      const ok = (id) => a.abilities.includes(id) && !(g.cd[id] > 0);
      const id = g.archer ? "arrows" : ok("heavy") && K.rng() < 0.3 ? "heavy" : a.abilities.includes("strike") ? "strike" : a.abilities.find((x) => MELEE.has(x)) || "strike";
      if (K.ABILITIES[id].cd) g.cd[id] = K.ABILITIES[id].cd * ROUND;
      g.a = angTo(a, foe);
      g.atk = { id, on: foe.uid, t0: R.t, land: R.t + 0.45 * hast, ranged: !!g.archer };
      R.fx.push({ k: "allywind", uid: a.uid, id, wind: 0.45 * hast, ranged: !!g.archer });
    }
  }

  // ---------- Time ----------
  function clocks(R) {
    const B = R.B, dt = STEP;
    for (const u of B.units) {
      if (!u.g) continue;
      for (const s of Object.keys(u.g.st)) {
        if (!(s in u.status)) { delete u.g.st[s]; continue; }
        u.g.st[s] -= dt;
        if (u.g.st[s] <= 0) { delete u.g.st[s]; delete u.status[s]; }
        else if (s !== "crit") u.status[s] = Math.max(1, Math.ceil(u.g.st[s] / ROUND));
      }
      // what throws a body back wears off quickly
      if (u.g.walkN !== R.n) { if (wheeled(u)) { if (u.g.cv > 0) drive(R, u, 0, 0, 0, dt); } else if (u.g.wx || u.g.wz) walk(R, u, 0, 0, dt, u.hp <= 0); } // (legs asked for nothing run down; a car runs on a little)
      if (u.g.vx || u.g.vz) { move(R, u, u.g.vx * dt, u.g.vz * dt, true); const k = Math.max(0, 1 - PHYS.fric * dt); u.g.vx *= k; u.g.vz *= k; if (Math.abs(u.g.vx) + Math.abs(u.g.vz) < 0.05) { u.g.vx = 0; u.g.vz = 0; } const r = Math.hypot(u.g.x, u.g.z); if (r > R.rad - 0.3 && u.g.entered) { u.g.x *= (R.rad - 0.3) / r; u.g.z *= (R.rad - 0.3) / r; } }
    }
    // Bodies that have ended up in each other (a roll's end, a body thrown back, a press) ease apart, each by the other's weight.
    { const us = B.units.filter((u) => u.g && u.hp > 0 && !u.spared && !u.g.ride && u.g.kind !== "light" && (u.side !== "enemy" || u.g.entered)), cap = PHYS.sep * dt;
      for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) { const a = us[i], b = us[j];
        if ((a.still && b.still) || (R.roll > 0 && (a.side === "player" || b.side === "player"))) continue;
        const dx = b.g.x - a.g.x, dz = b.g.z - a.g.z, d = Math.hypot(dx, dz), min = a.g.rad + b.g.rad; if (d >= min || d < 1e-4) continue;
        const ma = weight(a) * brace(R, a, b), mb = weight(b) * brace(R, b, a), pen = Math.min(min - d, cap), sa = mb / (ma + mb);
        shove(R, a, -(dx / d) * pen * sa, -(dz / d) * pen * sa); shove(R, b, (dx / d) * pen * (1 - sa), (dz / d) * pen * (1 - sa)); } }
    if (R.slow > 0) R.slow -= dt;
    if (R.haste > 0) R.haste -= dt;
    R.doT -= dt;
    if (R.doT <= 0) {
      R.doT += ROUND;
      for (const u of B.units) {
        if (u.hp > 0 && u.status.burn) { const d = Math.max(1, Math.round(u.maxHp * 0.07)); u.hp = Math.max(0, u.hp - d); R.fx.push({ k: "dot", uid: u.uid, n: d, s: "burn" }); }
        if (u.hp > 0 && u.status.bleed) { const d = Math.max(1, Math.round(u.maxHp * 0.06)); u.hp = Math.max(0, u.hp - d); R.fx.push({ k: "dot", uid: u.uid, n: d, s: "bleed" }); }
      }
    }
    for (const u of B.units.filter((x) => x.g && x.g.leaveAt != null && R.t >= x.g.leaveAt && x.hp > 0)) { B.tell("The press of the fighting carries {t} away from you.", { t: u }); B.units = B.units.filter((x) => x !== u); R.fx.push({ k: "leave", uid: u.uid }); }
    const round = 1 + Math.floor(R.t / P.story);
    if (round !== B.round) {
      B.round = round;
      const beat = (K.val(B.enc.beats) || []).find((b) => b.round === B.round);
      const stopper = beat && beat.stop && !R.noPlan ? living(B, "enemy").find((u) => u.g && (u.person === beat.stop || who(u) === beat.stop)) : null;
      if (beat && R.step3) stepClose(R); // (the last one's time is up)
      if (beat && stopper) { B.evented = true; R.step3 = { beat, uid: stopper.uid, until: R.t + P.story - 0.5, hit: false }; R.fx.push({ k: "stepOpen", uid: stopper.uid, what: beat.stopText || "" }); }
      else if (beat) { B.evented = true; const at = B.log.length; const u = (beat.run && beat.run(B)) || {}; B.log.splice(at, 0, { key: beat.text, u, ev: true, art: beat.art3 || null }); R.fx.push({ k: "event", at }); beatItem(R, beat); }
      if (askStep(R)) { /* (a card of the story's: enc.asks3, enc.order3) */ }
      else if (B.round === 3 && B.enc.lethal && !B.evented && !B.enc.beats && living(B, "enemy").length) { const at = B.log.length; C.core.fieldEvent(); R.fx.push({ k: "event", at }); }
    }
  }
  function overNow(R) {
    const B = R.B, p = C.player(), enc = B.enc;
    if (B.over) return B.over;
    C.core.amulet(p);
    if (p.hp <= 0) return "lose";
    if (R.finale) return R.finale === true ? "win" : R.finale; // (the last arrow has flown)
    const named = living(B, "enemy").filter((u) => !u.line && !u.still); // the fight is decided by the named: when they fall, the line breaks (a man who only stands, Karna at his wheel, decides nothing)
    const fin = (out) => { if (enc.wheel3) { R.finale = out; R.frozen = 2.4; R.fx.push({ k: "wheelEnd" }); return null; } return out; }; // (at the wheel the end is Arjuna's arrow, and it is seen)
    if (R.through) { if (R.reached) return "win"; if (R.t >= (enc.hold || 4) * P.story) return enc.roundOut || "lose"; if (!named.length && !enc.cannot) return "win"; return null; }
    { const r2 = B.rule && B.rule.over ? B.rule.over(B) : null; if (r2) return r2; }
    if (!named.length) { if (enc.wheel3) { if (askOpen(R) || asksOf(enc).some((a, i) => !(R.asked || {})[i])) return null; B.say(enc.holdText || "You held until the end."); return fin("win"); } return "win"; } // (at the wheel, with no one left between, the story still asks what it has to ask before the arrow comes)
    if (enc.dream && R.line) { if (R.t >= R.line.dreamSecs) { B.say(enc.roundsText || "You held long enough."); return "win"; } }
    else if (enc.rounds && R.t >= enc.rounds * P.story) { B.say(enc.roundsText || "You held long enough."); return "win"; }
    if (enc.hold && R.t >= enc.hold * P.story && !(R.plan && R.plan.kind === "bhishma")) { if (enc.wheel3 && R.order && R.order.state === "doing") askDone(R, "miss"); B.say(enc.holdText || "You held until the end."); return fin("win"); } // (under Bhishma the fight ends when he is barred or has crossed, not by the count)
    if (R.t >= P.cap) { const mine = p.hp / p.maxHp, theirs = named.reduce((s, e) => s + e.hp / e.maxHp, 0) / Math.max(1, B.units.filter((u) => u.side === "enemy" && !u.line).length); R.capped = true; return mine >= theirs ? "win" : "lose"; }
    return null;
  }
  function joined(R) {
    const p = C.player();
    for (const u of R.B.units) if (!u.g && u.line) { // from the ranks at the field's edge: theirs from the far side, yours from behind you
      initUnit(R, u); const a = (u.side === "enemy" ? Math.PI : 0) + rr(-1.25, 1.25), r = u.side === "enemy" ? R.rad + 2.5 : R.rad - 0.7;
      u.g.x = Math.sin(a) * r; u.g.z = Math.cos(a) * r; u.g.a = u.side === "enemy" ? 0 : Math.PI; u.g.entered = u.side !== "enemy"; u.g.wave = 0; R.fx.push({ k: "join", uid: u.uid, line: true });
    }
    for (const u of R.B.units) if (!u.g) { initUnit(R, u); if (u.side === "enemy") { const a = K.rng() * TAU; u.g.x = Math.sin(a) * (R.rad + 3); u.g.z = Math.cos(a) * (R.rad + 3); u.g.entered = false; } else { u.g.x = clamp(p.g.x + rr(-2, 2), -R.rad + 1, R.rad - 1); u.g.z = Math.min(R.rad - 0.6, p.g.z + 5); u.g.a = Math.PI; } R.fx.push({ k: "join", uid: u.uid }); }
  }
  // The time left of a fight that is won by standing (a hold, a number of rounds), or null.
  R3.timeLeft = (R) => { const e = R.B.enc, n = e.hold || e.rounds; return e.dream && R.line ? Math.max(0, R.line.dreamSecs - R.t) : n ? Math.max(0, n * P.story - R.t) : null; };

  R3.step = function (R, act) {
    const B = R.B;
    if (R.over) return R;
    act = act || {};
    if (B.over) { R.over = B.over; return R; }
    R.n++;
    if (R.offer) { // the champion has offered single combat: the fight waits on your answer (no answer in ten seconds is a refusal)
      const o = R.offer; o.n++; const ans = act.duel || (o.n > 600 ? "no" : null); if (!ans) return R; R.offer = null;
      if (o.kind === "order") { const a = askNow(R), task = a.task === undefined ? "strike" : a.task;
        if (ans !== "yes") askDone(R, "refuse");
        else if (!task) { askDone(R, "obey"); if (a.end) { R.stood = true; if (B.enc.wheel3 && !R.finale) { R.finale = a.end; R.frozen = 2.4; R.fx.push({ k: "wheelEnd", stand: true }); } else end(R, a.end); } }
        else { R.order.state = "doing"; R.order.until = R.t + (a.secs || 12); if (task === "strike") { const t = B.units.find((u) => u.uid === o.uid); if (t && t.g) t.g.apart = false; R.lock = o.uid; } R.fx.push({ k: "orderTaken", uid: o.uid, i: o.i }); } }
      else if (ans === "yes") { R.duel = { uid: o.uid }; R.lock = o.uid; for (const u of living(B, "enemy")) if (u.g && !u.line && u.uid !== o.uid) { u.g.role = "ring"; cancel(u); } R.fx.push({ k: "duel", uid: o.uid }); }
      else { for (const a of living(B, "ally")) if (a.g && !a.line) a.g.cool = Math.max(a.g.cool || 0, 6); spirit(R, 20); R.fx.push({ k: "duelNo", uid: o.uid }); } }
    if (R.frozen > 0) { // a divine weapon's moment: the fight stands still
      R.frozen -= STEP; if (act.orders) { Object.assign(R.orders, act.orders); R.orders.given = true; }
      if (R.clash && act.clashWin) R.clash.won = true;
      if (R.frozen <= 0 && R.clash) { // two weapons met in the air. Whoever kept his mantra the longer has a part of his come through.
        const h = B.units.find((x) => x.uid === R.clash.uid);
        if (R.clash.won && h && h.hp > 0 && h.g) { const floor = who(h) === "bhishma" && RT.warDay && RT.warDay() < 10 ? Math.round(h.maxHp * 0.1) : 1, n = Math.max(0, Math.min(h.hp - floor, Math.round(h.maxHp * 0.08)));
          h.hp -= n; h.g.stag = Math.max(h.g.stag || 0, 2.2); cancel(h); R.fx.push({ k: "clashEnd", won: true, uid: h.uid, n }); }
        else R.fx.push({ k: "clashEnd", won: false, uid: R.clash.uid });
        R.clash = null; R.astraAfter = null; }
      if (R.frozen <= 0 && R.astraAfter) { astraAfter(R, R.astraAfter); R.astraAfter = null; }
      return R;
    }
    joined(R);
    for (const u of B.units) if (u.g) { u.g.lx = 0; u.g.lz = 0; }
    if (R.assist && R.blocker && !R.broken && !act.block && R3.wantBlock(R, 0.14, 0.3)) act = Object.assign({}, act, { block: true });
    playerAct(R, act);
    joined(R);
    if (B.over) { R.over = B.over; return R; }
    R.t += STEP;
    const p = C.player();
    if (R.assist && !R.block && R3.can(R, "roll")) { const th = R3.threats(R).find((x) => x.land - R.t <= 0.12 && x.land - R.t > -0.02); if (th) playerAct(R, { roll: true, mx: p.g.x - th.x, mz: p.g.z - th.z }); }
    playerStep(R, act);
    const fdt = STEP * (R.slow > 0 ? 0.45 : 1);
    for (const a of living(B, "ally")) allyStep(R, a, STEP);
    for (const e of living(B, "enemy").sort((x, y) => (x.g.atk ? 0 : 1) - (y.g.atk ? 0 : 1) || x.g.idx - y.g.idx)) { if (e.g.atk && R.slow > 0) { e.g.atk.land += STEP - fdt; e.g.atk.t0 += STEP - fdt; } foeStep(R, e, fdt); }
    shotsStep(R);
    clocks(R);
    lineStep(R); joined(R); fireStep(R, STEP); burnStep(R, STEP); planStep(R); bearerStep(R); storyStep(R); rideStep(R, STEP);
    for (const u of B.units) if (u.g && u.hp <= 0 && u.g.fell == null) { u.g.fell = R.t; u.g.atk = null; if (u.captive && !u.fled && R.task && R.task.kind === "capture" && R.task.uid === u.uid) u.taken = true; /* (brought down inside the count: he is taken, not killed) */ R.fx.push({ k: u.taken ? "taken" : "fall", uid: u.uid }); if (u.side === "enemy" && leads(u)) captainDown(R, u); if (u.side === "enemy" && (u.shield || u.shieldDrawn) && !u.shieldBroken && R.broken) { const gd = { id: ++R.gid, x: u.g.x, z: u.g.z, at: R.t + 0.5 }; R.ground.push(gd); R.fx.push({ k: "shieldthrown", g: gd }); } }
    const out = overNow(R);
    if (out) end(R, out);
    return R;
  };
  // Blows coming at you (or with you standing in their way), soonest first.
  R3.threats = function (R) {
    const p = C.player(), out = [];
    for (const e of living(R.B, "enemy")) {
      const a = e.g.atk; if (!a || a.feint) continue;
      const m = fanOf(e, a);
      if (a.ranged) { if (a.on === p.uid || inside(m, p)) out.push({ uid: e.uid, land: a.land + dist(e, p) / P.arrow, t0: a.t0, x: e.g.x, z: e.g.z, lane: true, heavy: a.heavy, wind: true }); }
      else if (inside(m, p, 0.25)) out.push({ uid: e.uid, land: a.land, t0: a.t0, x: m.kind === "ring" ? m.x : e.g.x, z: m.kind === "ring" ? m.z : e.g.z, heavy: a.heavy, area: !!a.area });
    }
    for (const s of R.shots) if (s.side === "enemy" && R.t >= s.t0) {
      const dx = p.g.x - s.x, dz = p.g.z - s.z, al = dx * Math.sin(s.a) + dz * Math.cos(s.a), off = Math.abs(dx * Math.cos(s.a) - dz * Math.sin(s.a));
      if (al > 0 && off <= 0.9) out.push({ uid: s.by, land: R.t + al / s.v, t0: s.at0 || s.t0, x: s.x, z: s.z, lane: true, heavy: s.heavy, flying: true });
    }
    return out.sort((a, b) => a.land - b.land);
  };
  R3.wantBlock = (R, lead, hold) => R3.threats(R).some((t) => t.land - R.t <= (R.block ? hold : lead) && t.land - R.t > -0.05);
  function end(R, out) {
    const B = R.B;
    R.lost = out === "lose";
    if (out === "lose" && (B.enc.lethal || (K.S && K.S.fighter)) && !B.enc.once && !R.tries && !B.over && !R.noRetry) { R.over = "retry"; return; }
    R.over = out;
    settle(R, out, B.enc.hold || B.enc.rounds ? Math.min((B.enc.hold || B.enc.rounds), Math.floor(R.t / P.story)) : null);
  }
  R3.accept = function (R) { if (R.over !== "retry") return; R.over = "lose"; settle(R, "lose"); };
  R3.retry = function (R) {
    if (R.over !== "retry") return R;
    const B = C.start(R.B.enc.id, R.B.onEnd);
    B.say("You get up. One more time.");
    Object.assign(B.used, R.B.used);
    const R2 = R3.begin(B, { tries: R.tries + 1, hp: P.retryHp, assist: R.assist, rad: R.rad });
    R2.orders = Object.assign({}, R.orders);
    if (R.stance && !R2.stance) R3.stance(R2, R.stance);   // (the same plan of your own on the second try)
    return R2;
  };
  // Health back to the turn engine's scale when a fight is settled (what the story reads afterwards).
  R3.unscale = (B) => { for (const u of B.units) { const t = u._tb; if (!t) continue; const f = u.maxHp ? u.hp / u.maxHp : 0; u.maxHp = t.maxHp; u.hp = u.hp > 0 ? Math.max(1, Math.round(f * t.maxHp)) : 0; u.atk = t.atk; delete u._tb; } };

  // ---------- The bot: a person's hands, not a machine's ----------
  // It reads most blows a little late (better with grace), presses one thing at a time with a thumb's gap between.
  const TAPS = ["block", "roll", "herbs", "call", "astra", "spare", "layDown", "cover", "skill", "strike"];
  R3.bot = function (R, opt) {
    opt = opt || {};
    if (R.offer) return { duel: R.offer.kind === "order" ? "no" : C.player().hp > C.player().maxHp * 0.5 ? "yes" : "no" };
    if (R.task && R.task.kind === "standard") { const q = C.player().g; return { mx: R.task.x - q.x, mz: R.task.z - q.z }; }
    if (R.task && R.task.kind === "sarathi") { const q = C.player().g, c = R.B.units.find((u) => u.uid === R.task.uid); if (c && c.g) return { mx: c.g.x - q.x, mz: c.g.z - q.z }; }
    const a = wants(R, opt);
    if (!P.botGap || opt.perfect) return a;
    const h = R.hum || (R.hum = { btn: null, next: 0 });
    const want = TAPS.find((k) => a[k]) || (a.mx || a.mz ? "move" : null);
    const hold = want === "block" || want === "move";
    if (want === h.btn && hold) return want === "block" ? { block: true } : { mx: a.mx, mz: a.mz };
    if (R.t < h.next) return h.btn === "block" && R.block ? { block: true } : h.btn === "move" ? { mx: a.mx, mz: a.mz } : {};
    h.btn = want; h.next = R.t + P.botGap[0] + K.rng() * (P.botGap[1] - P.botGap[0]);
    if (!want) return {};
    if (want === "move") return { mx: a.mx, mz: a.mz };
    const out = { [want]: a[want] };
    if (want === "roll") { out.mx = a.mx; out.mz = a.mz; }
    return out;
  };
  function wants(R, opt) {
    const B = R.B, p = C.player(), g = p.g;
    if (!R.bs) { const gr = clamp((K.attr("grace") || 0) / 6, 0, 1); R.bs = { react: P.botReact[1] - (P.botReact[1] - P.botReact[0]) * gr, miss: P.botMiss[1] - (P.botMiss[1] - P.botMiss[0]) * gr, read: {}, lead: {}, called: false }; }
    const bs = R.bs, a = {}, th = R3.threats(R);
    for (const t of th) {
      const key = t.uid + "@" + t.t0;
      if (!(key in bs.read)) bs.read[key] = K.rng() >= bs.miss;
      if (!bs.read[key] || R.t - t.t0 < bs.react) continue;
      const left = t.land - R.t;
      if (R.blocker && !R.broken && !t.area) {
        const lead = bs.lead[key] != null ? bs.lead[key] : (bs.lead[key] = P.botLead[0] + K.rng() * (P.botLead[1] - P.botLead[0]));
        if (left <= (R.block ? 0.45 : lead) && R3.can(R, "block")) { a.block = true; return a; }
        if (R.breath >= P.blockMin || R.block) continue;
      }
      const rl = bs.lead["r" + key] != null ? bs.lead["r" + key] : (bs.lead["r" + key] = P.botRollLead[0] + K.rng() * (P.botRollLead[1] - P.botRollLead[0]));
      if (left <= rl && R3.can(R, "roll")) {
        // across the blow's line, toward open ground
        let dx = t.lane ? Math.cos(Math.atan2(g.x - t.x, g.z - t.z)) : g.x - t.x, dz = t.lane ? -Math.sin(Math.atan2(g.x - t.x, g.z - t.z)) : g.z - t.z;
        if (Math.hypot(g.x + dx, g.z + dz) > Math.hypot(g.x - dx, g.z - dz) && Math.hypot(g.x, g.z) > R.rad * 0.6) { dx = -dx; dz = -dz; }
        a.roll = true; a.mx = dx; a.mz = dz; return a;
      }
    }
    const soon = th.some((t) => t.land - R.t < 0.5 && bs.read[t.uid + "@" + t.t0]);
    if (R3.can(R, "layDown") && (B.enc.mustYield || p.hp < p.maxHp * 0.5)) { a.layDown = true; return a; }
    if (R.noStrike && R3.can(R, "cover") && soon) { a.cover = true; return a; }
    if (p.hp < p.maxHp * 0.36 && R3.can(R, "herbs") && !soon) { a.herbs = true; return a; }
    const foes = foesIn(R).filter((e) => e.g.kind !== "light");
    if (R.through && R.goal && !B.enc.cannot) { // make for the far side, fighting whoever bars the way
      const f0 = foes.filter((e) => dist(e, p) < g.reach + 0.6 && !e.g.beaten).sort((x, y) => dist(x, p) - dist(y, p))[0];
      if (!f0) { a.mx = R.goal.x - g.x; a.mz = R.goal.z - g.z; return a; }
    }
    if (R.noStrike) { const f = nearestFoe(R, p); if (f && dist(f, p) < 6) { a.mx = g.x - f.g.x; a.mz = g.z - f.g.z; if (Math.hypot(g.x, g.z) > R.rad * 0.75) { a.mx = -g.z; a.mz = g.x; } } return a; }
    if (!bs.called && R3.can(R, "call") && (p.hp < p.maxHp * 0.6 || foes.length >= 2)) { bs.called = true; a.call = true; return a; }
    const ast = R3.astras(R).filter((x) => !x.why);
    if (ast.length && !soon && (foes.length >= 2 || p.hp < p.maxHp * 0.5) && !foes.every((e) => e.hero)) { a.astra = ast[0].id; return a; }
    if (opt.spare && C.spareable().length) { const t = R3.spareable(R)[0]; if (t && K.rng() < opt.spare) { a.spare = t.uid; return a; } }
    if (R.blocker && R.broken && !soon) { const gd = R.ground.find((o) => R.t >= o.at && Math.hypot(o.x - g.x, o.z - g.z) < 7); if (gd) { a.mx = gd.x - g.x; a.mz = gd.z - g.z; return a; } }
    // Those still fighting first; then those who kneel (struck down, unless the bot is told to spare).
    const f = R3.target(R);
    if (!f || f.g.beaten) { const nf = foes.filter((e) => !e.g.beaten).sort((x, y) => dist(x, p) - dist(y, p))[0]; if (nf && nf !== f) R.lock = nf.uid; }
    const t = R3.target(R); if (!t) return a;
    const d = dist(t, p), bow = g.weapon === "bow";
    if (R3.can(R, "skill") && !soon) {
      const allies = living(B, "ally").filter((x) => !x.still).length;
      const use = { aimed: d <= 20, quake: foes.some((e) => dist(e, p) <= P.quake), ridedown: d <= 6, command: d <= 9 || allies > 0, salve: p.hp < p.maxHp * 0.75, vanish: d <= g.reach + 0.8, song: allies > 0 || d <= g.reach }[R.skill];
      if (use) { a.skill = true; return a; }
    }
    if (bow) { // an archer keeps away and shoots
      if (d < 5 && Math.hypot(g.x, g.z) < R.rad - 2.5) { a.mx = g.x - t.g.x; a.mz = g.z - t.g.z; return a; }
      if (d <= P.shoot - 1) { a.strike = true; return a; }
      a.mx = t.g.x - g.x; a.mz = t.g.z - g.z; return a;
    }
    const len = R3.nextBlow(R).len, inSwing = th.some((x) => bs.read[x.uid + "@" + x.t0] && x.land - R.t > -0.05 && x.land - R.t < len + 0.12);
    if (d <= g.reach * 0.92 + t.g.rad - 0.42) { if (!inSwing) a.strike = true; }
    else { a.mx = t.g.x - g.x; a.mz = t.g.z - g.z;
      // (a person learns it from the first point he runs onto: after that he walks up to a spearman whose point is free)
      if (R.told && R.told.c_spear && foes.some((e) => e.g.cls === "spear" && !(e.g.cd.set > 0) && dist(e, p) <= hitReach(e) + P.setReach + 1.2 && Math.abs(adiff(angTo(e, p), e.g.a)) < 0.9)) { const l = Math.hypot(a.mx, a.mz) || 1; a.mx = (a.mx / l) * 0.6; a.mz = (a.mz / l) * 0.6; } }
    return a;
  }
  // A whole fight played by the bot: the tests, and any fight without a screen. Returns the outcome.
  R3.log = [];
  R3.autoplay = function (encId, opt) {
    opt = opt || {};
    let B = C.start(encId, null), R = R3.begin(B, { assist: opt.assist, noLine: opt.noLine });
    const play = () => { let guard = 0; while (!R.over && guard++ < 60 * (P.cap + 30)) R3.step(R, R3.bot(R, opt)); };
    play();
    let total = R.t;
    if (R.over === "retry") { R = R3.retry(R); B = R.B; play(); total += R.t; }
    const rec = { id: encId, out: R.over, t: Math.round(total * 10) / 10, tries: R.tries + 1, capped: !!R.capped, hp: Math.round(100 * C.player().hp / C.player().maxHp), stats: R.stats };
    R3.log.push(rec); if (R3.log.length > 4000) R3.log.shift();
    R3.last = R;
    const done = C.end();
    return done ? done.over : R.over;
  };
})(window.K = window.K || {});
