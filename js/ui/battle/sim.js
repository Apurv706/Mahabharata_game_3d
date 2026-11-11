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
    run: 5.3, foeRun: 3.2, archerRun: 2.6, allyRun: 3.7, blockWalk: 0.42,
    turn: 2.4,           // how fast a foe winding up can still turn after you (rad/s); a champion turns faster
    gap: [2.0, 3.4], windup: 0.64, heavyWind: 1.0, track: 0.85, lock: 0.38, meleeLock: 0.18,
    breathMax: 100, rollCost: 30, rollMin: 30, breathRegen: 20, roll: 0.42, rollDist: 3.9, perfect: 0.16,
    retryHp: 0.8,
    blockThrough: 0.08, blockHeavy: 0.35, blockBreaker: 0.55, blockMin: 12, blockDrain: 4.5, blockHit: 10, blockHitHeavy: 18, blockPerfect: 0.14, blockStag: 1.0, blockArc: 1.75,
    maceSmash: 0.82, maceSweep: 0.72, maceHit: 1.1, maceShove: 0.9,
    parry: 0.24, parryStag: 1.0, parryStagMace: 1.4, parryPart: 0.5, parriedBusy: 0.45, parryFoeCd: 2.5,
    fblock: 0.18, fblockLight: 0.15, fblockHeavy: 0.45, fblockRec: 1.0, fblockCd: 1.8,
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
  R3.TUNE = { e_dream: { hp: 0.6, atk: 0.7 }, e_ring: { atk: 0.75 }, e_last_stand: { hp: 0.85, atk: 0.52 }, e_lake_three: { atk: 0.8 }, e_lake_three_deep: { atk: 0.8 }, cross_e_duel: { hp: 1.1, atk: 1.15 }, e_raid: { hp: 1.05 }, e_ash: { hp: 1.05 },
    oath_arjuna_12: { atk: 0.82 }, oath_arjuna_16: { atk: 0.82 }, bh_line9: { atk: 0.82 }, fs_sk_hold: { atk: 0.82 }, fs_d13_break: { atk: 0.82 }, wc_e_reach: { atk: 0.86 }, e_wheel: { atk: 0.92 }, e_day16: { atk: 0.92 } };

  const living = (B, side) => B.units.filter((u) => u.hp > 0 && !u.spared && (side === "friends" ? u.side !== "enemy" : u.side === side));
  const held = (u) => !!(u.status.stun || u.status.asleep || u.status.bound);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rr = (a, b) => a + K.rng() * (b - a);
  const dist = (a, b) => Math.hypot(a.g.x - b.g.x, a.g.z - b.g.z);
  const angTo = (a, b) => Math.atan2(b.g.x - a.g.x, b.g.z - a.g.z);
  const adiff = (a, b) => { const d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); };
  const MELEE = RT.MELEE, RANGED = new Set(["arrows", "aimed", "pin", "volley"]), HEAVY = new Set(["heavy", "crush", "breaker", "aimed"]);
  const isSoldiers = (a) => a.plural && !a.person && !a.called;

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
    if (foe) {
      const t2 = Object.assign({}, RT.IDS.has(B.enc.id) ? RT.TUNE[B.enc.id] : null, R3.TUNE[B.enc.id] || {}), ft = K.S && K.S.fighter ? RT.FIGHTER[B.enc.id] : null;
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
      vx: 0, vz: 0, orbit: K.rng() < 0.5 ? 1 : -1, moving: 0, busy: 0, blow: null
    };
    // The great archers fight from their chariots, as the epic has them: a wider body, a little faster over the ground.
    if (u.side !== "player" && kind === "man" && weapon === "bow" && (/chariot/i.test(n) || ((u.hero || u.person) && K.S && K.S.act >= 6))) { u.g.car = true; u.g.rad = 1.25; u.g.speed *= 1.2; }
    for (const [s, v] of Object.entries(u.status)) if (typeof v === "number") u.g.st[s] = v * ROUND;
    if (foe && (u.shield || u.shieldDrawn) && u.sp == null) u.sp = P.shieldPts;
    if (u.leave != null) { u.g.leaveAt = R.t + Math.max(1, u.leave - B.round) * P.story; delete u.leave; }
  }
  function place(R) {
    const B = R.B, p = C.player(), rad = R.rad;
    p.g.x = 0; p.g.z = rad * 0.34; p.g.a = Math.PI;
    B.units.filter((u) => u.side === "ally").forEach((a, i) => {
      if (a.still) { a.g.x = 0; a.g.z = rad * 0.72; return; }
      const s = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      a.g.x = s * (3.0 + row * 2.2); a.g.z = rad * 0.34 + 0.3 + row * 1.0; a.g.a = Math.PI;
    });
    const foes = B.units.filter((u) => u.side === "enemy" && u.hp > 0), atOnce = Math.max(3, B.enc.atOnce || 3);
    foes.forEach((e, i) => {
      e.g.wave = i < atOnce ? 0 : 1;
      const n = Math.min(foes.length, atOnce), th = n > 1 ? ((i % atOnce) / (n - 1) - 0.5) * 1.3 : 0;
      const r = e.g.kind === "light" ? rad + 5 : e.g.wave ? rad + 3 + (i - atOnce) * 1.5 : e.g.archer ? rad * 0.78 : rad * 0.5;
      e.g.x = Math.sin(th) * r; e.g.z = -Math.cos(th) * r; e.g.a = 0;
      e.g.entered = !e.g.wave;
    });
  }
  R3.begin = function (B, opts) {
    opts = opts || {};
    const kind = K.val(B.enc.kind) || null;
    const R = { B, t: 0, n: 0, seen: 0, sideSeen: {}, over: null, tries: opts.tries || 0, fx: [], shots: [], shotN: 0, slow: 0, doT: ROUND, rad: opts.rad || P.rad,
      orders: { friend: "balanced", soldiers: "defend" }, breath: P.breathMax, combo: 0, comboT: -9, buffer: false, roll: 0, rollT: -9, rdx: 0, rdz: -1, block: false, blockT: -9, winded: false,
      kneel: 0, skillCd: 0, herbCd: 0, salve: null, unseen: 0, double: false, haste: 0, frozen: 0, assist: !!opts.assist, lock: null, kind,
      stats: { blows: 0, hits: 0, rolls: 0, dodged: 0, perfect: 0, blocks: 0, blocked: 0, perfectBlocks: 0, parries: 0, parried: 0, fblocks: 0, taken: 0, maxAtk: 0 },
      skill: null, D: RT.level(K.S), noStrike: kind === "weather", escort: kind === "escort", through: kind === "breakthrough", sp: P.shieldPts, broken: false, spOff: 0, ground: [], gid: 0 };
    B.rt = R;
    B.units.forEach((u) => initUnit(R, u));
    place(R);
    const p = C.player();
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
  const foesIn = (R) => living(R.B, "enemy").filter((e) => e.g.entered);
  function nearestFoe(R, from, max) { let best = null, bd = max || 1e9; for (const e of foesIn(R)) { if (e.g.kind === "light") continue; const d = dist(e, from); if (d < bd) { bd = d; best = e; } } return best; }
  R3.target = function (R) { // whom you are facing: the one locked, while it stands; else the nearest
    const p = C.player(); let t = R.lock && R.B.units.find((u) => u.uid === R.lock && u.hp > 0 && !u.spared && u.g.entered);
    if (!t || t.g.kind === "light") { t = nearestFoe(R, p); R.lock = t ? t.uid : null; }
    return t || null;
  };
  R3.attacking = (R) => living(R.B, "enemy").filter((e) => e.g.atk).length;
  R3.count = (R) => living(R.B, "enemy").reduce((n, e) => n + (e.plural ? Math.max(1, Math.ceil(e.g.bodies * e.hp / e.maxHp)) : 1), 0);
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
    if (a.orders) Object.assign(R.orders, a.orders);
    if (a.withdraw && C.canFlee()) { C.flee(); return; }
    if (a.lock) { const fs = foesIn(R).filter((e) => e.g.kind !== "light").sort((x, y) => dist(x, p) - dist(y, p)); if (fs.length) { const i = fs.findIndex((e) => e.uid === R.lock); R.lock = fs[(i + 1) % fs.length].uid; R.fx.push({ k: "lock", uid: R.lock }); } }
    if (a.lockOn) { const t = B.units.find((u) => u.uid === a.lockOn && u.side === "enemy" && u.hp > 0); if (t) R.lock = t.uid; }
    if (R.block && (!a.block || !R3.can(R, "block"))) lowerShield(R);
    else if (!R.block && a.block && R3.can(R, "block")) raiseShield(R);
    if (a.spare) { const t = R3.spareable(R).find((e) => e.uid === a.spare); if (t) { if (t.g.atk) cancel(t); C.spare(t.uid); R.fx.push({ k: "spared", uid: t.uid }); return; } }
    if (held(p) || R.frozen > 0) return;
    if (a.layDown && R3.can(R, "layDown")) { C.core.use(p, "lay_down", null); R.fx.push({ k: "laydown" }); return; }
    if (a.cover && R3.can(R, "cover")) { C.core.use(p, "cover", null); R.kneelPose = 1.2; R.fx.push({ k: "cover" }); }
    if (a.call && R3.can(R, "call")) { C.core.use(p, "call", null); R.fx.push({ k: "call" }); }
    if (a.astra) {
      const row = R3.astras(R).find((x) => x.id === a.astra && !x.why);
      if (row) {
        B.astraOut = null;
        const before = new Map(B.units.map((u) => [u.uid, u.hp])), t = R3.target(R);
        C.core.use(p, row.id, t ? t.uid : null);
        R.frozen = 2.6;
        const struck = B.units.filter((u) => u.side === "enemy" && u.g && before.get(u.uid) > u.hp), dealt = {};
        struck.forEach((u) => { dealt[u.uid] = before.get(u.uid) - u.hp; });
        R.astraKnock = struck.map((u) => u.uid);
        R.fx.push({ k: "astra", id: row.id, out: B.astraOut, struck: struck.map((u) => u.uid), dealt });
        living(B, "enemy").forEach((e) => { if (e.g.atk && held(e)) cancel(e); });
      }
    }
    if (a.roll && R3.can(R, "roll")) {
      let dx = a.mx || 0, dz = a.mz || 0; const l = Math.hypot(dx, dz);
      if (l < 0.2) { dx = -Math.sin(g.a); dz = -Math.cos(g.a); } else { dx /= l; dz /= l; } // no direction: straight back
      R.roll = P.roll; R.rollT = R.t; R.breath -= P.rollCost; R.stats.rolls++; R.rdx = dx; R.rdz = dz;
      g.busy = 0; g.blow = null; R.buffer = false; R.combo = 0; R.kneel = 0; if (R.block) lowerShield(R);
      R.fx.push({ k: "roll", dx, dz });
    }
    if (a.herbs && R.roll <= 0 && !R.block && R3.can(R, "herbs")) { R.kneel = 1.1; R.buffer = false; R.fx.push({ k: "kneel" }); }
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
  function parry(R) {
    const p = C.player();
    if (!PARRY_WITH.has(p.g.weapon) || swinging(p)) return false;
    const win = P.parry * R.D.perfect + STEP;
    const e = living(R.B, "enemy").filter((x) => R3.parryable(R, x, win)).sort((x, y) => x.g.atk.land - y.g.atk.land)[0];
    if (!e) return false;
    const a = e.g.atk;
    p.g.a = angTo(p, e); p.g.busy = 0.3; R.combo = 0; R.buffer = false;
    if (LIGHT.has(p.g.weapon) && (a.heavy || a.arc === "smash")) { a.part = P.parryPart; R.fx.push({ k: "parry", uid: e.uid, part: true }); return true; }
    R.stats.parries++;
    cancel(e);
    e.g.stag = Math.max(e.g.stag, p.g.weapon === "mace" ? P.parryStagMace : P.parryStag); e.g.rec = 0;
    R.slow = Math.max(R.slow, 0.6);
    R.fx.push({ k: "parry", uid: e.uid });
    return true;
  }
  function foeParries(R, t, heavy) {
    const p = C.player();
    if (!(t.hero || t.person) || t.g.atk || t.g.stag > 0 || t.g.down > 0 || t.g.beaten || t.still || t.g.kind !== "man") return false;
    if (R.t < (t.g.openUntil || 0) || !PARRY_WITH.has(t.g.weapon) || t.g.weapon === "fist" || t.g.archer) return false;
    if (R.t - (t.g.parriedAt || -99) < P.parryFoeCd || Math.abs(adiff(angTo(t, p), t.g.a)) > 1.2) return false;
    if (K.rng() >= (R.D.parryFoe || 0) * (heavy ? 0.5 : 1)) return false;
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
    if (K.rng() >= P.fblock * (R.D.glance || 1) * (heavy ? 0.7 : 1) * (arrow ? 0.7 : 1)) return 1;
    t.g.fblockAt = R.t; R.stats.fblocks++;
    t.g.rec = Math.max(t.g.rec || 0, P.fblockRec * (R.D.rest || 1)); t.g.cool = Math.max(t.g.cool || 0, 0.25);
    R.fx.push({ k: "fblock", uid: t.uid, heavy: !!heavy, arrow: !!arrow });
    if (pts > 0) shieldTakes(R, t, pts);
    return heavy ? P.fblockHeavy : P.fblockLight;
  }
  function shieldTakes(R, u, pts) {
    const mine = u.side === "player", before = mine ? R.sp : u.sp == null ? P.shieldPts : u.sp, after = Math.max(0, before - pts);
    if (mine) R.sp = after; else u.sp = after;
    if (after <= 0) {
      if (mine) { R.broken = true; R.spOff = P.shieldBack; if (R.block) lowerShield(R); }
      else { u.shield = false; u.shieldDrawn = false; u.shieldBroken = true; }
      R.fx.push({ k: "shieldbreak", uid: u.uid, mine });
    } else if (after <= P.shieldPts / 2 && before > P.shieldPts / 2) R.fx.push({ k: "shieldcrack", uid: u.uid, mine });
  }
  function blow(R) {
    const p = C.player(), g = p.g, list = R3.comboOf();
    if (R.t - R.comboT > 0.6 || R.combo >= list.length) R.combo = 0;
    const c = list[R.combo], t = R3.target(R);
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
    const one = (on, m, knock, dt) => { const s = { by: p.uid, side: "player", m, knock, on: on ? on.uid : null, x: g.x, z: g.z, a: on ? angTo(p, on) : g.a, t0: R.t + c.land + dt, v: P.myArrow, heavy: !!c.heavy && !dt, n: ++R.shotN, homing: true, life: 0.7 }; R.shots.push(s); R.fx.push({ k: "shot", uid: p.uid, shot: s, second: !!dt }); };
    one(t1, t2 ? c.m : c.m * P.bowSecond, c.knock || 0, 0);
    one(t2 || t1, c.m * P.bowSecond, 0, P.bowGap);
    g.busy = c.len; R.stats.blows++;
    R.combo = (R.combo + 1) % list.length; R.comboT = R.t + c.len;
    R.fx.push({ k: "blow", n: R.combo, shot: true, land: c.land, len: c.len, heavy: !!c.heavy });
  }
  function raiseShield(R) { const p = C.player(); R.block = true; R.blockT = R.t; R.stats.blocks++; p.g.blow = null; p.g.busy = 0; R.buffer = false; R.combo = 0; faceThreat(R); R.fx.push({ k: "shield", up: true }); }
  function lowerShield(R, winded) { R.block = false; if (winded) { R.winded = true; R.fx.push({ k: "winded" }); } R.fx.push({ k: "shield", up: false }); }
  function faceThreat(R) {
    const p = C.player(), th = R3.threats(R)[0], f = th ? null : R3.target(R);
    if (th) p.g.a = Math.atan2(th.x - p.g.x, th.z - p.g.z); else if (f) p.g.a = angTo(p, f);
  }
  function floored(R, t, d, m) {
    if (!(d > 0) || !t || t.hp <= 0 || !t.maxHp || R.t < P.wornAfter || t.hero || t.person) return d;
    const f = Math.round(t.maxHp * P.wornFloor * m);
    if (d >= f) return d;
    if (!R.worn) { R.worn = true; R.fx.push({ k: "toast", s: "They are tiring: your blows tell more now." }); }
    const more = Math.min(t.hp, f - d); t.hp -= more; return d + more;
  }
  function landBlow(R) {
    const B = R.B, p = C.player(), g = p.g, b = g.blow;
    g.blow = null; R.stats.blows++;
    const reach = g.reach + P.lunge, half = b.c.arc === "sweep" ? P.sweep : g.weapon === "spear" ? 0.6 : 1.0;
    const cands = foesIn(R).filter((e) => e.g.kind !== "light" && dist(e, p) <= reach + e.g.rad - 0.42 && (dist(e, p) < 1 || Math.abs(adiff(angTo(p, e), g.a)) <= half)).sort((x, y) => (x.uid === R.lock ? -1 : 0) - (y.uid === R.lock ? -1 : 0) || dist(x, p) - dist(y, p));
    if (!cands.length) { R.fx.push({ k: "whiffme" }); return; }
    // A mace's sweep carries through everyone in its arc (the first at full weight); every other blow is one man's.
    const ts = b.c.arc === "sweep" ? cands.slice(0, 3) : [cands[0]];
    ts.forEach((t, i) => {
      if (i === 0 && foeParries(R, t, b.c.heavy)) return;
      let m = b.c.m * (i ? 0.6 : 1);
      if (R.double) { m *= 2; R.double = false; }
      const caught = foeBlocks(R, t, b.c.heavy, false, RT.shieldHit(p, g.weapon, b.c.heavy && !b.c.arc));
      m *= caught;
      const d = floored(R, t, B.hit(p, t, m), m);
      R.stats.hits++;
      hitFx(R, t, d, b.c.heavy, p, true, caught < 1);
      if (b.c.knock && t.hp > 0) knock(R, t, angTo(p, t), b.c.knock, false);
      if (b.c.stag && t.hp > 0 && !t.g.atk) t.g.stag = Math.max(t.g.stag, b.c.stag);
      else if (!b.c.heavy && caught === 1 && t.hp > 0 && !t.g.atk && K.rng() < RT.STRENGTH.flinch[RT.tierOf(t)]) t.g.stag = Math.max(t.g.stag, P.lightStag);
      t.g.hits.push(R.t);
    });
  }
  function knock(R, u, ang, d, down) {
    if (u.still || u.g.kind === "elephant" || u.g.kind === "light") return;
    if (down && u.g.atk) cancel(u);
    const k = u.hero || u.person ? 0.6 : 1;
    u.g.vx += Math.sin(ang) * d * 5 * k; u.g.vz += Math.cos(ang) * d * 5 * k;
    if (!u.g.atk) u.g.stag = Math.max(u.g.stag, 0.3);
    if (down) u.g.down = Math.max(u.g.down, 1.2);
  }
  function hitFx(R, t, d, heavy, by, melee, blocked) {
    if (t.g && by && by.g) t.g.lastFrom = { x: by.g.x, z: by.g.z };
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
      case "aimed": { g.busy = 0.5; const s = { by: p.uid, side: "player", id, on: t ? t.uid : null, x: g.x, z: g.z, a: g.a, t0: R.t + 0.28, v: P.myArrow * 1.2, heavy: true, n: ++R.shotN, homing: true, life: 1 }; R.shots.push(s); R.fx.push({ k: "shot", uid: p.uid, shot: s }); break; }
      case "quake": { g.busy = 0.62; const ts = foesIn(R).filter((e) => e.g.kind !== "light" && dist(e, p) <= P.quake + e.g.rad); if (ts.length) { ab.use(B, p, ts); ts.forEach((u) => { hitFx(R, u, 0, true, p, true); if (u.hp > 0) knock(R, u, angTo(p, u), 1.2, true); }); } R.fx.push({ k: "quake", r: P.quake }); break; }
      case "ridedown": { // a charge straight through whoever stands in the way
        const len = 6.5, s = Math.sin(g.a), c = Math.cos(g.a);
        const ts = foesIn(R).filter((e) => { if (e.g.kind === "light") return false; const dx = e.g.x - g.x, dz = e.g.z - g.z, al = dx * s + dz * c; return al > -0.5 && al < len + 0.6 && Math.abs(dx * c - dz * s) < 1.3 + e.g.rad; });
        ts.forEach((u) => { ab.use(B, p, u); hitFx(R, u, 0, true, p, true); if (u.hp > 0) knock(R, u, g.a + (K.rng() < 0.5 ? 1.2 : -1.2), 1.1, true); });
        R.roll = 0.32; R.rollT = -9; R.rdx = s * (len / 0.32) / (P.rollDist / P.roll); R.rdz = c * (len / 0.32) / (P.rollDist / P.roll); g.busy = 0.36; R.dash = true;
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
      move(R, p, R.rdx * (P.rollDist / P.roll) * dt, R.rdz * (P.rollDist / P.roll) * dt, true);
      if (R.roll <= 0) R.dash = false;
    } else if (R.block) { R.breath -= P.blockDrain * dt; if (R.breath <= 0) { R.breath = 0; lowerShield(R, true); } }
    else { R.breath = Math.min(P.breathMax, R.breath + P.breathRegen * dt); if (R.winded && R.breath >= P.rollMin) R.winded = false; }
    if (R.unseen > 0) R.unseen -= dt;
    if (R.kneelPose > 0) R.kneelPose -= dt;
    if (R.broken) { if (R.spOff > 0) { R.spOff -= dt; if (R.spOff <= 0) { const gd = { id: ++R.gid, x: clamp(g.x + rr(-3, 3), -R.rad + 2, R.rad - 2), z: R.rad * 0.55, at: R.t + 0.6 }; R.ground.push(gd); R.fx.push({ k: "shieldthrown", g: gd }); } }
      const gd = R.ground.find((o) => R.t >= o.at && Math.hypot(o.x - g.x, o.z - g.z) <= P.pickup); if (gd && !held(p)) { R.ground.splice(R.ground.indexOf(gd), 1); R.broken = false; R.spOff = 0; R.sp = P.shieldPts; R.fx.push({ k: "shieldup", id: gd.id }); } }
    if (R.skillCd > 0) R.skillCd -= dt;
    if (R.herbCd > 0) R.herbCd -= dt;
    if (R.kneel > 0) { R.kneel -= dt; if (R.kneel <= 0) { C.core.use(p, "herbs", p.uid); delete p.cds.herbs; R.herbCd = 2 * ROUND; R.fx.push({ k: "heal", uid: p.uid }); } return; }
    if (R.salve && R.t >= R.salve.next) { living(B, "friends").filter((u) => !u.still && dist(u, p) <= 5.5).forEach((u) => B.heal(p, u, Math.max(1, Math.round(u.maxHp * 0.28 / 3)))); R.fx.push({ k: "heal", uid: p.uid }); R.salve.left--; R.salve.next = R.t + 1; if (!R.salve.left) R.salve = null; }
    if (g.stepT > 0) { g.stepT -= dt; move(R, p, g.stepX * dt, g.stepZ * dt, false); }
    if (g.blow && R.t >= g.blow.at) landBlow(R);
    if (g.busy > 0) { g.busy -= dt; if (g.busy <= 0 && R.buffer) { R.buffer = false; if (!g.blow) blow(R); } }
    if (held(p) || R.roll > 0) return;
    let mx = a.mx || 0, mz = a.mz || 0; const l = Math.hypot(mx, mz);
    if (l > 0.12 && g.busy <= 0) {
      if (l > 1) { mx /= l; mz /= l; }
      const sp = g.speed * (R.block ? P.blockWalk : 1) * (p.status.weakened ? 0.85 : 1);
      move(R, p, mx * sp * dt, mz * sp * dt, false);
      g.moving = Math.min(1, l) * (R.block ? P.blockWalk : 1);
      if (R.block) faceThreat(R);
      else if (a.strafe) { // the close views: you keep your face to the one you fight, and step round him
        const f = R.through && R.goal ? null : R3.target(R);
        g.a = turnTo(g.a, f && dist(f, p) < 18 ? angTo(p, f) : a.look != null ? a.look : Math.atan2(mx, mz), 12 * dt);
      } else g.a = Math.atan2(mx, mz);
    } else if (R.block) faceThreat(R);
    else if (g.busy <= 0) { const f = R3.target(R); if (f && dist(f, p) < 9) g.a = turnTo(g.a, angTo(p, f), 9 * dt); }
    if (R.through && R.goal && Math.hypot(g.x - R.goal.x, g.z - R.goal.z) <= R.goal.r && !B.enc.cannot) { B.progress = B.enc.reach || 1; R.reached = true; }
  }
  const turnTo = (a, to, max) => a + clamp(adiff(to, a), -max, max);
  // Move a body, kept on the field and out of other bodies (a roll passes through; foes stop you, friends do not).
  function move(R, u, dx, dz, pass) {
    const g = u.g; let x = g.x + dx, z = g.z + dz;
    if (!pass) for (const o of R.B.units) {
      if (o === u || o.hp <= 0 || !o.g || o.spared || (o.side === "enemy" && !o.g.entered) || o.g.kind === "light") continue;
      if (u.side === "player" && o.side !== "enemy" && !o.still) continue;
      if (u.side !== "player" && o.side === "player" && u.side !== "enemy") continue;
      const min = g.rad + o.g.rad + (u.side !== o.side && !(u.side !== "enemy" && o.side !== "enemy") ? 0.25 : 0), ox = x - o.g.x, oz = z - o.g.z, d = Math.hypot(ox, oz);
      if (d < min && d > 1e-4) { x = o.g.x + (ox / d) * min; z = o.g.z + (oz / d) * min; }
    }
    const r = Math.hypot(x, z), lim = R.rad - 0.3;
    if (r > lim && (u.side !== "enemy" || g.entered)) { x *= lim / r; z *= lim / r; }
    g.x = x; g.z = z;
  }

  // ---------- Foes ----------
  function cancel(u) { u.g.atk = null; u.g.cool = Math.max(u.g.cool, 0.6); }
  function targetable(R, f) {
    if (f.hp <= 0) return false;
    if (f.still) return !!R.escort;
    if (f.side === "player") return R.unseen <= 0;
    if (f.called || f.person || !f.plural) return R.orders.friend !== "hold" || dist(f, C.player()) < 2.5;
    return R.orders.soldiers !== "stay";
  }
  function pickTarget(R, e) {
    const fr = living(R.B, "friends").filter((f) => targetable(R, f));
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
    if (ranged && g.archer && t.side === "player" && dist(e, t) <= t.g.reach * 1.15) wind += 0.45; // caught close, he draws slowly
    g.a = angTo(e, t);
    g.atk = { id, on: t.uid, t0: R.t, land: R.t + Math.max(0.3, wind), ranged, area, dir: g.a, locked: false, heavy: HEAVY.has(id) || area || arc === "smash" || g.kind === "elephant", arc,
      r: light ? 2.7 : P.quake, px: light ? t.g.x : null, pz: light ? t.g.z : null };
    if (!ranged && !area && MELEE.has(id) && R.D.feint > 0 && g.kind === "man" && K.rng() < R.D.feint) g.atk.feint = R.t + Math.max(0.3, wind) * 0.8;
    R.stats.maxAtk = Math.max(R.stats.maxAtk, R3.attacking(R));
    R.fx.push({ k: "windup", uid: e.uid, id, heavy: g.atk.heavy, ranged, arc, wind: g.atk.land - R.t });
  }
  function loose(R, e, a) {
    const g = e.g, s = { by: e.uid, side: e.side, id: a.id, on: a.on, x: g.x, z: g.z, a: a.dir, t0: R.t, v: P.arrow, heavy: a.heavy, n: ++R.shotN, at0: a.t0, life: 1.6 };
    R.shots.push(s); R.fx.push({ k: "shot", uid: e.uid, shot: s });
  }
  // Arrows fly: yours find their man; a foe's flies straight down its lane and strikes the first of your side it meets.
  function shotsStep(R) {
    const B = R.B, dt = STEP;
    for (const s of R.shots.slice()) {
      if (R.t < s.t0) continue;
      const by = B.units.find((u) => u.uid === s.by);
      if (s.homing) {
        const t = B.units.find((u) => u.uid === s.on && u.hp > 0 && !u.spared);
        if (t) s.a = Math.atan2(t.g.x - s.x, t.g.z - s.z);
        s.x += Math.sin(s.a) * s.v * dt; s.z += Math.cos(s.a) * s.v * dt; s.life -= dt;
        if (t && Math.hypot(t.g.x - s.x, t.g.z - s.z) <= t.g.rad + 0.5) { R.shots.splice(R.shots.indexOf(s), 1); if (by) myShot(R, by, s, t); continue; }
        if (s.life <= 0 || !t) { R.shots.splice(R.shots.indexOf(s), 1); R.fx.push({ k: "arrive", shot: s, uid: null }); }
        continue;
      }
      s.x += Math.sin(s.a) * s.v * dt; s.z += Math.cos(s.a) * s.v * dt; s.life -= dt;
      const t = living(B, "friends").find((f) => f.g && Math.hypot(f.g.x - s.x, f.g.z - s.z) <= f.g.rad + 0.34 && (targetable(R, f) || f.side === "player"));
      if (t) { R.shots.splice(R.shots.indexOf(s), 1); if (by) resolve(R, by, { id: s.id, on: s.on, heavy: s.heavy, ranged: true, shot: s }, t); continue; }
      if (s.life <= 0 || Math.hypot(s.x, s.z) > R.rad + 6) { R.shots.splice(R.shots.indexOf(s), 1); R.fx.push({ k: "arrive", shot: s, uid: null }); }
    }
  }
  function myShot(R, p, s, t) {
    const B = R.B;
    R.fx.push({ k: "arrive", shot: s, uid: t.uid });
    if (s.m) {
      const mine = p.side === "player", caught = mine ? foeBlocks(R, t, s.heavy, true) : 1;
      const d = mine ? floored(R, t, B.hit(p, t, s.m * caught), s.m * caught) : B.hit(p, t, s.m);
      if (mine) R.stats.hits++;
      hitFx(R, t, d, s.heavy, p, false, caught < 1); t.g.hits.push(R.t);
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
    g.cool = rr(P.gap[0], P.gap[1]) * R.D.rest * (a.heavy ? 1.2 : 1) * (g.archer ? 0.6 : 1) * (g.kind === "light" ? 0.7 : 1);
    const open = (RT.OPEN[g.weapon] != null ? RT.OPEN[g.weapon] : 0.35) + (a.heavy && g.weapon !== "mace" ? 0.15 : 0);
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
    if (R.t - R.rollT <= P.perfect * R.D.perfect + STEP && R.t - R.rollT >= 0) { R.slow = 1.2; R.stats.perfect++; R.fx.push({ k: "perfect" }); }
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
      const breaker = a.id === "breaker";
      sh = perfectBlock ? 0 : (breaker ? P.blockBreaker : a.heavy ? P.blockHeavy : P.blockThrough) * STR.through[tier];
      R.breath -= (perfectBlock ? 0.5 : 1) * (a.heavy || breaker ? P.blockHitHeavy : P.blockHit) * (breaker ? 1.5 : 1) * (a.ranged ? 0.35 : 1) * STR.breath[tier];
      if (perfectBlock) { R.stats.perfectBlocks++; if (!a.ranged) { e.g.stag = Math.max(e.g.stag, P.blockStag); e.g.rec = 0; } R.fx.push({ k: "perfectblock", uid: e.uid }); }
      if (!a.ranged) { const pts = RT.shieldHit(e, e.g.weapon, a.heavy && !a.arc) * (perfectBlock ? 0.5 : 1); if (pts > 0) shieldTakes(R, p, pts); }
      if (R.breath <= 0 && R.block) { R.breath = 0; lowerShield(R, true); }
    } else if (t !== p && isSoldiers(t) && R.orders.soldiers === "defend" && a.on === t.uid) sh = P.shieldSoldiers;
    else if (t === p && R.shield && !R.broken && frontal) sh = P.shieldYou;
    if (a.arc) sh *= P.maceHit;
    if (a.part && t === p) sh *= a.part;
    if (blocked || sh < (a.arc ? P.maceHit : 1)) R.fx.push({ k: "spark", uid: t.uid, block: blocked, arrow: !!a.ranged });
    if (t === p && sh > 0) sh *= (P.vsPath[K.S.path] || 1);
    const doHit = () => { if (a.id === "arrows") B.hit(e, t, 1, { verb: "Arrows rain on {t} for {n}." }); else ab.use(B, e, ab.target === "enemies" ? [t] : t); };
    if (sh > 0) { if (sh !== 1) { const atk = e.atk; e.atk = Math.round(atk * sh * 10) / 10; try { doHit(); } finally { e.atk = atk; } } else doHit(); }
    hitFx(R, t, before - t.hp, a.heavy, e, !a.ranged, blocked);
    if (t === p && before > t.hp) { R.stats.taken += before - t.hp; R.kneel = 0; R.salveStop = true; if (a.heavy && !blocked) { p.g.busy = Math.max(p.g.busy, 0.25 * STR.knock[tier]); p.g.blow = null; } }
    // A mace's sweep, an elephant, a heavy blow from a champion: thrown back.
    if (t.hp > 0 && !perfectBlock && (a.arc === "sweep" || e.g.kind === "elephant" || (a.heavy && tier >= 2 && !a.ranged))) { const d = (e.g.kind === "elephant" ? 2.6 : P.maceShove) * (blocked ? 0.5 : 1) * STR.knock[tier]; t.g.vx += Math.sin(from + Math.PI) * d * 5; t.g.vz += Math.cos(from + Math.PI) * d * 5; }
  }
  function foeStep(R, e, dt) {
    const B = R.B, p = C.player(), g = e.g;
    for (const k of Object.keys(g.cd)) if (g.cd[k] > 0) g.cd[k] -= dt;
    if (g.cool > 0 && !g.atk) g.cool -= dt;
    g.moving = 0;
    if (g.down > 0) { g.down -= dt; return; }
    if (g.stag > 0) { g.stag -= dt; return; }
    if (held(e)) { if (g.atk) cancel(e); return; }
    if (e.still) return;
    if (g.rec > 0) { g.rec -= dt; return; }
    if (!g.entered) { // waiting off the field: the next come on as it thins
      if (foesIn(R).length >= Math.max(3, B.enc.atOnce || 3) && g.wave) return;
      const d = Math.hypot(g.x, g.z); g.x -= (g.x / d) * g.speed * dt; g.z -= (g.z / d) * g.speed * dt; g.moving = 1; g.a = Math.atan2(-g.x, -g.z);
      if (d <= R.rad - 1) { g.entered = true; R.fx.push({ k: "enter", uid: e.uid }); }
      return;
    }
    if (B.enc.spare && e.hp <= e.maxHp * C.PLEAD) { if (!g.beaten) { g.beaten = true; if (g.atk) cancel(e); R.fx.push({ k: "beaten", uid: e.uid }); } return; }
    if (g.atk && g.atk.feint && R.t >= g.atk.feint) { const a = g.atk, w = a.land - a.t0; a.feint = 0; a.t0 = R.t + 0.3; a.land = a.t0 + w; a.feinted = true; R.fx.push({ k: "feint", uid: e.uid }); }
    if (g.atk) {
      const a = g.atk, t = B.units.find((x) => x.uid === a.on);
      const left = a.land - R.t;
      if (t && t.hp > 0 && !a.locked) {
        if (a.area && a.px != null) { if (left > 0.6) { a.px = t.g.x; a.pz = t.g.z; } else a.locked = true; }
        else if (!a.area) {
          // He turns after his mark as he winds up (an arrow's lane follows freely), then commits.
          const want = angTo(e, t), rate = a.ranged ? 9 : P.turn * (e.hero || e.person ? 1.5 : 1) * (a.heavy ? 0.8 : 1);
          a.dir = turnTo(a.dir, want, rate * dt); g.a = a.dir;
          if (left <= (a.ranged ? P.lock : P.meleeLock)) a.locked = true;
        }
      }
      if (left <= 1e-6) landAttack(R, e);
      return;
    }
    let t = B.units.find((x) => x.uid === g.tgt);
    if (!t || !targetable(R, t) || (g.cool <= 0 && K.rng() < 0.02)) { t = pickTarget(R, e); g.tgt = t ? t.uid : null; }
    if (!t) return;
    const d = dist(e, t), ang = angTo(e, t);
    g.a = turnTo(g.a, ang, 6 * dt);
    if (g.kind === "light") { if (g.cool <= 0 && R3.attacking(R) < 2) startAttack(R, e, t); return; }
    const others = living(B, "enemy").filter((o) => o !== e && o.g.atk);
    const spaced = others.every((o) => Math.abs(o.g.atk.land - (R.t + (g.archer ? P.track + P.lock : g.windup))) >= 0.45 * R.D.pair);
    const inRange = g.ranged && (g.archer || d > g.reach * 2.2) ? d <= 19 : d <= hitReach(e) + t.g.rad - 0.42 - 0.12;
    const mayAttack = g.cool <= 0 && R3.attacking(R) < 2 && spaced && onField(R, e);
    if (mayAttack && inRange) { startAttack(R, e, t); return; }
    // Where to stand: an archer keeps his distance; a man with a turn to strike closes; the rest circle and wait.
    const engaged = g.cool <= 0.9 && R3.attacking(R) < 2 && !g.archer;
    let want = g.archer ? g.keep : engaged ? (g.reach * 0.9 + t.g.rad - 0.42) : Math.max(g.reach + 1.4, P.wait);
    let mx = 0, mz = 0;
    if (g.archer) {
      const edge = Math.hypot(g.x, g.z) > R.rad - 1.4;
      if (d < want - 2.2 && !(edge && d < 4)) { mx -= Math.sin(ang); mz -= Math.cos(ang); }
      else if (d > want + 2.5) { mx += Math.sin(ang); mz += Math.cos(ang); }
      mx += Math.cos(ang) * g.orbit * 0.35; mz -= Math.sin(ang) * g.orbit * 0.35;
      if (edge) { mx -= g.x / R.rad * 0.8; mz -= g.z / R.rad * 0.8; }
    } else {
      if (d > want + 0.15) { mx += Math.sin(ang); mz += Math.cos(ang); }
      else if (d < want - 0.5) { mx -= Math.sin(ang) * 0.7; mz -= Math.cos(ang) * 0.7; }
      if (!engaged) { mx += Math.cos(ang) * g.orbit * 0.55; mz -= Math.sin(ang) * g.orbit * 0.55; if (K.rng() < dt * 0.25) g.orbit = -g.orbit; }
    }
    // Keep off each other, so each stands clear on the ground.
    for (const o of living(B, "enemy")) { if (o === e || !o.g.entered) continue; const od = dist(o, e); if (od < 1.7 + o.g.rad) { mx += (g.x - o.g.x) / (od + 0.01) * 0.9; mz += (g.z - o.g.z) / (od + 0.01) * 0.9; } }
    const l = Math.hypot(mx, mz);
    if (l > 0.05) { const sp = g.speed * (engaged ? 1 : 0.55) * Math.min(1, l); move(R, e, (mx / l) * sp * dt, (mz / l) * sp * dt, false); g.moving = Math.min(1, l) * (engaged ? 1 : 0.55); }
  }

  // ---------- Friends and soldiers ----------
  function allyDodge(R, a) { if (isSoldiers(a)) return 0.2; return { balanced: 0.35, guard: 0.25, allout: 0.05, hold: 0.5 }[R.orders.friend] || 0.3; }
  function allyStep(R, a, dt) {
    const B = R.B, p = C.player(), g = a.g;
    g.moving = 0;
    if (a.still) return;
    if (g.down > 0) { g.down -= dt; return; }
    if (held(a)) { g.atk = null; return; }
    if (g.rec > 0) { g.rec -= dt; return; }
    const order = isSoldiers(a) ? R.orders.soldiers : R.orders.friend, hast = R.haste > 0 ? 0.7 : 1;
    if (g.atk) {
      if (R.t >= g.atk.land - 1e-6) {
        const t = B.units.find((x) => x.uid === g.atk.on && x.hp > 0), id = g.atk.id, shot = !!g.atk.ranged; g.atk = null;
        g.cool = rr(1.4, 2.3) * hast * (order === "allout" ? 0.75 : 1); g.rec = 0.3;
        const ab = K.ABILITIES[id];
        if (shot && t) { const s = { by: a.uid, side: a.side, m: order === "allout" ? 1.25 : 1, on: t.uid, x: g.x, z: g.z, a: angTo(a, t), t0: R.t, v: P.myArrow, n: ++R.shotN, homing: true, life: 1 }; R.shots.push(s); R.fx.push({ k: "shot", uid: a.uid, shot: s }); }
        else if (ab.target === "ally") { ab.use(B, a, t); R.fx.push({ k: "heal", uid: t && t.uid }); }
        else if (t && dist(a, t) <= g.reach * 1.25 + P.lunge + t.g.rad) { const before = t.hp; if (order === "allout" && id === "strike") B.hit(a, t, 1.25); else ab.use(B, a, ab.target === "enemies" ? [t] : t); hitFx(R, t, before - t.hp, false, a, MELEE.has(id)); R.fx.push({ k: "swing", uid: a.uid, id }); }
      }
      return;
    }
    if (g.cool > 0) g.cool -= dt;
    for (const k of Object.keys(g.cd)) if (g.cd[k] > 0) g.cd[k] -= dt;
    const foes = foesIn(R).filter((e) => e.g.kind !== "light");
    const low = order === "balanced" && a.hp < a.maxHp * 0.35;
    let gx, gz, foe = null;
    const behind = (k, side) => { gx = p.g.x - Math.sin(p.g.a) * k + Math.cos(p.g.a) * side; gz = p.g.z - Math.cos(p.g.a) * k - Math.sin(p.g.a) * side; };
    const side = (g.sideIdx % 2 ? 1 : -1) * (2.6 + Math.floor(g.sideIdx / 2) * 1.4); // beside you, not behind: clear of the camera
    if (order === "stay" || order === "hold" || low) behind(low ? 2.2 : 1.2, side);
    else {
      if (order === "guard" || order === "defend") foe = foes.filter((e) => dist(e, p) <= Math.max(5, e.g.reach + 3)).sort((x, y) => dist(x, p) - dist(y, p))[0] || null;
      else if (order === "allout") foe = foes.slice().sort((x, y) => dist(x, a) - dist(y, a))[0] || null;
      else foe = foes.slice().sort((x, y) => dist(x, p) - dist(y, p))[0] || null;
      if (foe) { const an = angTo(foe, a), r = g.archer ? 8 : g.reach * 0.9 + foe.g.rad; gx = foe.g.x + Math.sin(an + side * 0.12) * r; gz = foe.g.z + Math.cos(an + side * 0.12) * r; }
      else behind(0.6, side);
    }
    { const pd = dist(a, p); if (pd < 1.15) { gx = g.x + (g.x - p.g.x) / (pd + 0.01) * 1.2; gz = g.z + (g.z - p.g.z) / (pd + 0.01) * 1.2; } } // never standing in you
    const dx = gx - g.x, dz = gz - g.z, d = Math.hypot(dx, dz);
    if (d > 0.25) { const sp = g.speed * Math.min(1, d / 0.8); move(R, a, (dx / d) * sp * dt, (dz / d) * sp * dt, false); g.moving = Math.min(1, d / 0.8); g.a = turnTo(g.a, Math.atan2(dx, dz), 8 * dt); }
    if (foe && d <= 0.6) g.a = turnTo(g.a, angTo(a, foe), 8 * dt);
    const hurt = living(B, "friends").find((f) => !f.still && f.hp / f.maxHp < 0.45 && dist(f, a) < 5);
    if (g.cool <= 0 && hurt && a.abilities.includes("salve") && !(g.cd.salve > 0)) { g.atk = { id: "salve", on: hurt.uid, land: R.t + 0.5, t0: R.t }; g.cd.salve = 3 * ROUND; return; }
    if (order === "stay" || order === "hold" || low || !foe || g.cool > 0) return;
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
      if (u.g.vx || u.g.vz) { move(R, u, u.g.vx * dt, u.g.vz * dt, true); const k = Math.max(0, 1 - 9 * dt); u.g.vx *= k; u.g.vz *= k; if (Math.abs(u.g.vx) + Math.abs(u.g.vz) < 0.05) { u.g.vx = 0; u.g.vz = 0; } const r = Math.hypot(u.g.x, u.g.z); if (r > R.rad - 0.3 && u.g.entered) { u.g.x *= (R.rad - 0.3) / r; u.g.z *= (R.rad - 0.3) / r; } }
    }
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
      if (beat) { B.evented = true; const at = B.log.length; const u = (beat.run && beat.run(B)) || {}; B.log.splice(at, 0, { key: beat.text, u, ev: true }); R.fx.push({ k: "event", at }); }
      else if (B.round === 3 && B.enc.lethal && !B.evented && !B.enc.beats && living(B, "enemy").length) { const at = B.log.length; C.core.fieldEvent(); R.fx.push({ k: "event", at }); }
    }
  }
  function overNow(R) {
    const B = R.B, p = C.player(), enc = B.enc;
    if (B.over) return B.over;
    C.core.amulet(p);
    if (p.hp <= 0) return "lose";
    if (R.through) { if (R.reached) return "win"; if (R.t >= (enc.hold || 4) * P.story) return enc.roundOut || "lose"; if (!living(B, "enemy").length && !enc.cannot) return "win"; return null; }
    { const r2 = B.rule && B.rule.over ? B.rule.over(B) : null; if (r2) return r2; }
    if (!living(B, "enemy").length) return "win";
    if (enc.rounds && R.t >= enc.rounds * P.story) { B.say(enc.roundsText || "You held long enough."); return "win"; }
    if (enc.hold && R.t >= enc.hold * P.story) { B.say(enc.holdText || "You held until the end."); return "win"; }
    if (R.t >= P.cap) { const mine = p.hp / p.maxHp, theirs = living(B, "enemy").reduce((s, e) => s + e.hp / e.maxHp, 0) / Math.max(1, B.units.filter((u) => u.side === "enemy").length); R.capped = true; return mine >= theirs ? "win" : "lose"; }
    return null;
  }
  function joined(R) {
    const p = C.player();
    for (const u of R.B.units) if (!u.g) { initUnit(R, u); if (u.side === "enemy") { const a = K.rng() * TAU; u.g.x = Math.sin(a) * (R.rad + 3); u.g.z = Math.cos(a) * (R.rad + 3); u.g.entered = false; } else { u.g.x = clamp(p.g.x + rr(-2, 2), -R.rad + 1, R.rad - 1); u.g.z = Math.min(R.rad - 0.6, p.g.z + 5); u.g.a = Math.PI; } R.fx.push({ k: "join", uid: u.uid }); }
  }
  // The time left of a fight that is won by standing (a hold, a number of rounds), or null.
  R3.timeLeft = (R) => { const e = R.B.enc, n = e.hold || e.rounds; return n ? Math.max(0, n * P.story - R.t) : null; };

  R3.step = function (R, act) {
    const B = R.B;
    if (R.over) return R;
    act = act || {};
    if (B.over) { R.over = B.over; return R; }
    R.n++;
    if (R.frozen > 0) { // a divine weapon's moment: the fight stands still
      R.frozen -= STEP; if (act.orders) Object.assign(R.orders, act.orders);
      if (R.frozen <= 0) { const p = C.player(); for (const id of R.astraKnock || []) { const u = B.units.find((x) => x.uid === id); if (u && u.g && u.hp > 0) { knock(R, u, angTo(p, u), 2.4, true); u.g.down = Math.max(u.g.down, 2.2); } } R.astraKnock = null; }
      return R;
    }
    joined(R);
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
    for (const u of B.units) if (u.g && u.hp <= 0 && u.g.fell == null) { u.g.fell = R.t; u.g.atk = null; R.fx.push({ k: "fall", uid: u.uid }); if (u.side === "enemy" && (u.shield || u.shieldDrawn) && !u.shieldBroken && R.broken) { const gd = { id: ++R.gid, x: u.g.x, z: u.g.z, at: R.t + 0.5 }; R.ground.push(gd); R.fx.push({ k: "shieldthrown", g: gd }); } }
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
    if (out === "lose" && (B.enc.lethal || (K.S && K.S.fighter)) && !R.tries && !B.over && !R.noRetry) { R.over = "retry"; return; }
    R.over = out;
    if (!B.over) C.settle(out, B.enc.hold || B.enc.rounds ? Math.min((B.enc.hold || B.enc.rounds), Math.floor(R.t / P.story)) : null);
  }
  R3.accept = function (R) { if (R.over !== "retry") return; R.over = "lose"; C.settle("lose"); };
  R3.retry = function (R) {
    if (R.over !== "retry") return R;
    const B = C.start(R.B.enc.id, R.B.onEnd);
    B.say("You get up. One more time.");
    Object.assign(B.used, R.B.used);
    const R2 = R3.begin(B, { tries: R.tries + 1, hp: P.retryHp, assist: R.assist, rad: R.rad });
    R2.orders = Object.assign({}, R.orders);
    return R2;
  };
  // Health back to the turn engine's scale when a fight is settled (what the story reads afterwards).
  R3.unscale = (B) => { for (const u of B.units) { const t = u._tb; if (!t) continue; const f = u.maxHp ? u.hp / u.maxHp : 0; u.maxHp = t.maxHp; u.hp = u.hp > 0 ? Math.max(1, Math.round(f * t.maxHp)) : 0; u.atk = t.atk; delete u._tb; } };

  // ---------- The bot: a person's hands, not a machine's ----------
  // It reads most blows a little late (better with grace), presses one thing at a time with a thumb's gap between.
  const TAPS = ["block", "roll", "herbs", "call", "astra", "spare", "layDown", "cover", "skill", "strike"];
  R3.bot = function (R, opt) {
    opt = opt || {};
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
    else { a.mx = t.g.x - g.x; a.mz = t.g.z - g.z; }
    return a;
  }
  // A whole fight played by the bot: the tests, and any fight without a screen. Returns the outcome.
  R3.log = [];
  R3.autoplay = function (encId, opt) {
    opt = opt || {};
    let B = C.start(encId, null), R = R3.begin(B, { assist: opt.assist });
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
