/* Build D (feedback rows 48-50, Fight_Traits_Draft.md): the fight traits, checked on the engine.
   Stage 1: the swing lock (no Block, Roll or parry until a swing ends), the dagger's five blows, foes open after their
   swing by weapon, shields that crack and break by the striker's tier and weapon, strength through the shield, and the
   clash's Strike lock after Shield wall or Guard; a broken shield replaced off the ground (a fallen soldier's, or one a comrade
   throws in at your side's edge after 10 s). The divine weapons (owner, 9 November, feedback row 58): three uses of each in
   a life, free against a champion; in the war below half health or once one of yours falls, outside it only under a tenth
   and at a price, never in a practice bout; the whole pack at 70-100%; a mantra traced wrong spends nothing.
   Usage: node tests/traits.js [--case id,id] [--json FILE]. Exits 1 when a check fails. */
"use strict";
const fs = require("fs");
const H = require("./lib/harness");
const { arg } = H;

const K = H.engine({});
K.lang = "en";
const RT = K.RT, C = K.Combat;
const MIX_FROM = C.MIX.from; C.MIX.from = 99; // (these checks play early fights at Act VI: no archers mixed in, but in mix-archers)
const CASES = [];
const check = (id, what, fn) => CASES.push({ id, what, fn });

const life = (o) => {
  const S = (K.S = Object.assign(K.newLife(), { name: "T", pronoun: "she", origin: "panchala", age: 30, act: 6, path: "mace", side: "pandava", teacher: "drona" }, o || {}));
  S.attrs.might = 5; S.attrs.grace = 4; S.items.herbs = 2;
  if (K.momentQueue) K.momentQueue.length = 0;
  return S;
};
const fight = (enc, o, opts) => {
  RT.force = true; K.seed((opts && opts.seed) || 7); life(o);
  if (C.state()) { try { C.settle("win"); } catch (e) { /* over */ } C.end(); }
  const B = C.start(enc, null);
  if (opts && opts.before) opts.before(B);
  const R = RT.begin(B, opts || {});
  return { B, R, p: C.player() };
};
const close = () => { try { if (C.state() && !C.state().over) C.settle("win"); C.end(); } catch (e) { /* over */ } };
const steps = (R, n, act) => { for (let i = 0; i < n && !R.over; i++) RT.step(R, typeof act === "function" ? act(i) : act || {}); };

// ---------- The swing lock ----------
for (const [path, weapon] of [["mace", "mace"], ["charioteer", "sword"], ["spy", "dagger"], ["archer", "bow"]]) {
  check("lock-" + weapon, "with the " + weapon + ", no Block, Roll or parry from the press until the swing has ended, and both back after it", () => {
    const F = fight("e_bandits", { path }), { R, p } = F, bad = [];
    steps(R, 90); // the foes walk in
    const len = RT.nextBlow(R).len, defend = R.blocker ? "block" : "roll";
    // put a foe in reach, so the blow is a blow
    const f = R.B.units.find((u) => u.side === "enemy" && u.hp > 0); if (f) { f.rt.entered = true; f.rt.x = p.rt.x + p.rt.face * p.rt.reach * 0.8; f.rt.atk = null; f.rt.cool = 9; }
    RT.step(R, { strike: true });
    if (!RT.swinging()) bad.push("Strike pressed, but no swing began");
    if (RT.can(R, defend)) bad.push(defend + " allowed right after the press");
    steps(R, Math.floor((len - 0.05) * 60));
    if (RT.can(R, defend)) bad.push(defend + " allowed " + (len - 0.05).toFixed(2) + " s into a " + len + " s swing");
    steps(R, 12);
    if (!RT.can(R, defend) && R.breath >= RT.P.rollMin && R.kneel <= 0) bad.push(defend + " still not allowed after the swing ended");
    close(); return bad;
  });
}
check("no-parry-mid-swing", "a lit blade coming down while your own blow is in the air cannot be parried", () => {
  const F = fight("e_bandits", { path: "charioteer" }), { R, p } = F, bad = [];
  steps(R, 90);
  const f = R.B.units.find((u) => u.side === "enemy" && u.hp > 0);
  f.rt.entered = true; f.rt.lane = p.rt.lane; f.rt.x = p.rt.x + p.rt.face * p.rt.reach * 0.9; f.rt.face = -p.rt.face; f.rt.cool = 9;
  RT.step(R, { strike: true }); // your swing begins
  f.rt.atk = { id: "strike", on: p.uid, t0: R.t, land: R.t + 0.1, ranged: false, area: false, lane: p.rt.x, locked: false, heavy: false };
  const before = R.stats.parries; RT.step(R, { strike: true });
  if (R.stats.parries !== before) bad.push("parried while swinging");
  close(); return bad;
});

check("herbs-after-swing", "herbs chosen in the middle of a swing (or a skill) are taken as soon as it ends, not refused", () => {
  const F = fight("e_bandits", { path: "mace" }), { R, p } = F, bad = [];
  steps(R, 90);
  const f = R.B.units.find((u) => u.side === "enemy" && u.hp > 0); if (f) { f.rt.entered = true; f.rt.x = p.rt.x + p.rt.face * p.rt.reach * 0.8; f.rt.atk = null; f.rt.cool = 99; }
  p.hp = Math.round(p.maxHp * 0.4);
  RT.step(R, { strike: true });
  if (!RT.swinging()) bad.push("no swing began");
  if (RT.can(R, "herbs")) bad.push("herbs allowed at once mid-swing");
  if (!RT.can(R, "herbsSoon")) bad.push("herbs not offered mid-swing (the Aid sheet would grey them)");
  RT.step(R, { herbs: true });
  let n = 0; while (RT.swinging() && n++ < 120) RT.step(R, {});
  RT.step(R, {});
  if (!(R.kneel > 0)) bad.push("no kneel for the herbs once the swing had ended");
  close(); return bad;
});

// ---------- The dagger ----------
check("dagger-five", "the dagger strikes four quick blows and a heavy fifth that knocks back; the sword and mace keep theirs", () => {
  const bad = [];
  let F = fight("e_bandits", { path: "spy" });
  const list = RT.comboOf(F.R);
  if (list.length !== 5) bad.push("the dagger's combo has " + list.length + " blows");
  else {
    if (list.slice(0, 4).some((c) => c.len > 0.25 || c.heavy)) bad.push("the first four are not quick and light");
    if (!list[4].heavy || !list[4].knock) bad.push("the fifth is not heavy, or does not knock back");
    const w = list.reduce((a, c) => a + c.m, 0) / list.reduce((a, c) => a + c.len, 0);
    if (w < 1.6 || w > 2.2) bad.push("the dagger's weight a second is " + w.toFixed(2) + " (the sword's is 1.76)");
  }
  close();
  F = fight("e_bandits", { path: "charioteer" }); if (RT.comboOf(F.R).length !== 3) bad.push("the sword's combo changed"); close();
  F = fight("e_bandits", { path: "mace" }); if (RT.comboOf(F.R).length !== 2) bad.push("the mace's combo changed"); close();
  return bad;
});

// ---------- Foes open after their swing ----------
check("foe-open", "after his swing a foe stands open by weapon (mace longest, dagger shortest): no shield raised and no parry until it passes", () => {
  const bad = [];
  if (!(RT.OPEN.mace > RT.OPEN.sword && RT.OPEN.sword > RT.OPEN.dagger)) bad.push("the openings are not mace > sword > dagger: " + JSON.stringify(RT.OPEN));
  const F = fight("e_bandits", { path: "mace" }), { R, p } = F;
  steps(R, 90);
  const f = R.B.units.find((u) => u.side === "enemy" && u.hp > 0);
  f.rt.entered = true; f.rt.lane = p.rt.lane; f.rt.x = p.rt.x + p.rt.face * p.rt.reach * 0.9; f.rt.face = -p.rt.face;
  f.rt.atk = { id: "strike", on: p.uid, t0: R.t, land: R.t + STEP(), ranged: false, area: false, lane: p.rt.x, locked: false, heavy: false };
  RT.step(R, {});
  const open = RT.OPEN[f.rt.weapon];
  if (f.rt.atk) bad.push("his blow did not land");
  else if (!(f.rt.openUntil > R.t + open - 0.05)) bad.push("no opening after his blow (" + f.rt.weapon + ")");
  close(); return bad;
});
function STEP() { return RT.STEP; }

// ---------- Shields ----------
// Blows caught on your raised shield until it breaks, from one foe.
function blowsToBreak(enc, who, path, seed) {
  const F = fight(enc, { path }, { seed }), { R, B, p } = F;
  const foe = B.units.find((u) => u.side === "enemy" && who(u));
  B.units.filter((u) => u.side === "enemy" && u !== foe).forEach((u) => { u.hp = 0; });
  B.units.filter((u) => u.side === "ally").forEach((u) => { u.still = true; });
  foe.rt.entered = true; foe.rt.wave = 0; foe.rt.x = Math.min(0.9, p.rt.x + 0.2);
  let caught = 0, n = 0;
  const seen = new Set();
  while (!R.over && n++ < 60 * 300) {
    p.hp = p.maxHp; R.breath = RT.P.breathMax; R.winded = false; foe.hp = foe.maxHp; // only the shield wears down
    const before = R.stats.blocked;
    RT.step(R, { block: true });
    if (R.stats.blocked > before) caught++;
    if (R.broken) break;
    if (foe.rt.atk && !seen.has(foe.rt.atk.t0)) seen.add(foe.rt.atk.t0);
  }
  const out = { caught, broken: !!R.broken, tier: RT.tierOf(foe), weapon: foe.rt.weapon };
  close(); return out;
}
check("shield-bhima", "Bhima's mace breaks your raised shield in 4 or 5 blows (the owner's ask, row 49)", () => {
  const bad = [];
  for (const seed of [3, 7, 11, 19]) {
    const r = blowsToBreak("hold_bhima", (u) => u.person === "bhima", "mace", seed);
    if (r.tier !== 3) bad.push("Bhima is tier " + r.tier);
    if (!r.broken) bad.push("seed " + seed + ": not broken after " + r.caught + " blows");
    else if (r.caught < 4 || r.caught > 5) bad.push("seed " + seed + ": broken after " + r.caught + " blows");
  }
  return bad;
});
check("shield-tiers", "points off a shield by tier and weapon: a soldier's mace about 10 blows, a champion's about 5; a soldier's sword never under 15; a dagger, a bow or bare hands never", () => {
  const bad = [], n = (u, w, heavy) => { const h = RT.shieldHit(u, w, heavy); return h > 0 ? Math.ceil(RT.P.shieldPts / h) : Infinity; };
  const soldier = { side: "enemy", name: "A Kaurava soldier" }, champ = { side: "enemy", person: "karna", name: "Karna" }, captain = { side: "enemy", name: "Panchala guard captain" };
  if (n(soldier, "mace") !== 10) bad.push("a soldier's mace: " + n(soldier, "mace"));
  if (n(captain, "mace") < 7 || n(captain, "mace") > 8) bad.push("a captain's mace: " + n(captain, "mace"));
  if (n(champ, "mace") < 5 || n(champ, "mace") > 6) bad.push("a champion's mace: " + n(champ, "mace"));
  if (n(soldier, "sword") < 15) bad.push("a soldier's sword: " + n(soldier, "sword"));
  for (const w of ["dagger", "bow", "fist"]) if (n(champ, w) !== Infinity) bad.push(w + " breaks shields");
  if (RT.tierOf(captain) !== 1 || RT.tierOf(soldier) !== 0 || RT.tierOf(champ) !== 2) bad.push("tiers: soldier " + RT.tierOf(soldier) + ", captain " + RT.tierOf(captain) + ", champion " + RT.tierOf(champ));
  if (RT.tierOf({ side: "enemy", person: "kripa" }) !== 2 || RT.tierOf({ side: "enemy", person: "satyaki" }) !== 2) bad.push("Kripa and Satyaki are not great champions (owner, 10:55)");
  if (RT.tierOf({ side: "ally", person: "charu" }) !== 0) bad.push("Charu is not a soldier");
  return bad;
});
// Shields on the ground (owner, 7 November: "a place to pick up a new shield where the player has to go").
// A fight with the foes held off the field, so nothing but the shield happens.
function quiet(path, o) {
  const F = fight("e_bandits", { path }, Object.assign({ before: (B) => { B.units.filter((u) => u.side === "enemy").forEach((u) => { u.still = true; }); B.units.filter((u) => u.side === "ally").forEach((u) => { u.still = true; }); } }, o || {}));
  F.B.units.filter((u) => u.side === "enemy").forEach((u) => { u.rt.entered = false; u.rt.x = 1.1; u.rt.atk = null; });
  return F;
}
const walkTo = (F, x, max) => { let n = 0; while (!F.R.over && Math.abs(F.p.rt.x - x) > 0.004 && n++ < (max || 600)) RT.step(F.R, { move: Math.sign(x - F.p.rt.x) }); };
check("shield-thrown", "your broken shield: Block greyed and roll instead; no shield comes back by itself; after 10 s a comrade throws one in at your side's edge, and walking to it takes it up", () => {
  const F = quiet("mace"), { R, p } = F, bad = [];
  steps(R, 30);
  p.rt.x = 0.6;
  RT.shieldTakes(R, p, 99);
  if (!R.broken) bad.push("not broken");
  if (RT.can(R, "block")) bad.push("Block allowed with the shield broken");
  if (!RT.rolls(R)) bad.push("no roll with the shield broken");
  steps(R, Math.ceil(RT.P.shieldBack * 60) - 30);
  if (R.ground.length) bad.push("a shield on the ground before " + RT.P.shieldBack + " s");
  steps(R, 30 + 60);
  if (!R.broken || R.sp === RT.P.shieldPts && !R.broken) bad.push("the shield came back by itself");
  const g = R.ground.find((o) => o.kind === "thrown");
  if (!g) bad.push("no shield thrown in after " + RT.P.shieldBack + " s");
  else {
    if (Math.abs(g.x - RT.P.throwX) > 0.01) bad.push("thrown in at " + g.x.toFixed(2) + ", not your side's edge");
    if (RT.nearestShield(R, p.rt.x) !== g) bad.push("not the nearest shield");
    walkTo(F, g.x);
    if (R.broken) bad.push("walked to it (at " + p.rt.x.toFixed(3) + ") but did not take it up");
    if (R.sp !== RT.P.shieldPts) bad.push("the shield taken up has " + R.sp + " points");
    if (R.ground.includes(g)) bad.push("the shield is still on the ground");
    if (!RT.can(R, "block")) bad.push("Block not back with a shield in hand");
  }
  close(); return bad;
});
check("shield-fallen", "a shield-bearer who falls drops his shield where he fell: taken up by walking to it while yours is broken (before any throw), left lying while yours is whole", () => {
  const F = quiet("mace", { before: (B) => { B.units.filter((u) => u.side === "enemy").forEach((u) => { u.still = true; u.shield = true; }); B.units.filter((u) => u.side === "ally").forEach((u) => { u.still = true; }); } }), { R, B, p } = F, bad = [];
  steps(R, 10);
  const foes = B.units.filter((u) => u.side === "enemy");
  const a = foes[0], b = foes[1];
  if (!a || !b) return ["e_bandits has fewer than two foes"];
  // the first falls at 0.62 while your shield is whole
  a.rt.entered = true; a.rt.x = 0.62; a.hp = 0; steps(R, 2);
  const g1 = R.ground.find((o) => o.from === a.uid);
  if (!g1) bad.push("no shield dropped by a fallen shield-bearer");
  else {
    if (Math.abs(g1.x - 0.62) > 0.06) bad.push("his shield lies at " + g1.x.toFixed(2) + ", far from where he fell (0.62)");
    steps(R, 40); walkTo(F, g1.x);
    if (!R.ground.includes(g1)) bad.push("taken up with your shield whole");
  }
  // yours breaks: the fallen soldier's is taken up at once, and no comrade throws one in after
  p.rt.x = 0.35; RT.shieldTakes(R, p, 99);
  if (g1) { walkTo(F, g1.x); if (R.broken) bad.push("did not take up the fallen soldier's shield"); }
  steps(R, Math.ceil(RT.P.shieldBack * 60) + 60);
  if (R.ground.some((o) => o.kind === "thrown")) bad.push("a comrade threw one in after you had taken one up");
  // a foe whose shield is broken drops none (the last foe: the fight ends)
  b.shieldBroken = true; b.shield = false; b.shieldDrawn = false; b.rt.entered = true; b.rt.x = 0.75; b.hp = 0; steps(R, 2);
  if (R.ground.some((o) => o.from === b.uid)) bad.push("a broken shield dropped as a whole one");
  close(); return bad;
});
check("shield-clash-rearm", "a war day: a shield broken in one clash and not replaced, the next clash begins with a whole one", () => {
  const F = fight("e_bandits", { path: "mace" }, { clash: true }), { R, B, p } = F, bad = [];
  RT.shieldTakes(R, p, 99);
  if (!R.broken) bad.push("not broken");
  const R2 = RT.begin(B, { clash: true });
  if (R2.broken || R2.sp !== RT.P.shieldPts || !RT.can(R2, "block")) bad.push("the next clash began without a whole shield");
  if (R2.ground.length) bad.push("shields left on the ground from the last clash");
  close(); return bad;
});
check("shield-bot-fetch", "the fight bot, its shield broken, goes to a shield lying near (the balance runs play it like a person)", () => {
  const F = quiet("mace"), { R, p } = F, bad = [];
  steps(R, 30);
  p.rt.x = 0.45; RT.shieldTakes(R, p, 99);
  steps(R, Math.ceil(RT.P.shieldBack * 60) + 60);
  let n = 0; while (R.broken && n++ < 600) RT.step(R, RT.bot(R, {}));
  if (R.broken) bad.push("the bot did not take up the shield thrown in (at " + p.rt.x.toFixed(2) + ")");
  close(); return bad;
});
check("shield-foe-gone", "a foe's broken shield is gone for the fight: he catches no more blows on it", () => {
  const F = fight("e_bandits", { path: "mace" }, { before: (B) => { B.units.filter((u) => u.side === "enemy").forEach((u) => { u.shield = true; }); } }), { R, B } = F, bad = [];
  const f = B.units.find((u) => u.side === "enemy");
  if (f.sp !== RT.P.shieldPts) bad.push("a shield-bearer's shield has " + f.sp + " points");
  RT.shieldTakes(R, f, 99);
  if (f.shield || f.shieldDrawn || !f.shieldBroken) bad.push("the shield is still his");
  close(); return bad;
});
check("strength-through", "a stronger foe's blow gets more through a raised shield and drains more breath", () => {
  const S = RT.STRENGTH, bad = [];
  for (const k of ["through", "breath", "knock"]) if (!(S[k][0] < S[k][1] && S[k][1] < S[k][2] && S[k][2] <= S[k][3])) bad.push(k + " does not grow with the tier: " + S[k]);
  if (!(S.flinch[0] === 1 && S.flinch[2] === 0)) bad.push("light blows: " + S.flinch);
  return bad;
});

// ---------- The clash's Strike lock ----------
check("strike-lock", "Shield wall or Guard on the turns: in the clash Strike is locked for 4 s with the shield held up, then free", () => {
  const bad = [];
  for (const st of ["wall", "guard", null]) {
    const F = fight("e_bandits", { path: "mace" }, { clash: true, before: (B) => { const p = B.units.find((u) => u.side === "player"); if (st) p.status[st] = 1; } }), { R } = F;
    if (st && Math.abs(R.strikeLock - RT.P.strikeLock) > 1e-6) bad.push(st + ": no lock (" + R.strikeLock + ")");
    if (!st && R.strikeLock) bad.push("a lock with neither move");
    if (st) {
      if (RT.can(R, "strike")) bad.push(st + ": Strike allowed at once");
      RT.step(R, { strike: true });
      if (RT.swinging()) bad.push(st + ": a swing began during the lock");
      if (R.blocker && !R.block) bad.push(st + ": the shield is not held up for you");
      steps(R, Math.ceil(RT.P.strikeLock * 60) + 2, () => { F.p.hp = F.p.maxHp; return {}; });
      if (!RT.can(R, "strike")) bad.push(st + ": Strike still locked after " + RT.P.strikeLock + " s");
    }
    close();
  }
  return bad;
});

// ---------- Run ----------
const only = arg("--case", "") ? new Set(arg("--case").split(",")) : null;
// ---------- The strike and defence study's rules (owner, 8 November) ----------
check("perfect-earned", "a perfect block is raised within 0.12 s of the blow and a perfect roll begun within 0.15 s (a late press no longer always perfect)", () => {
  const bad = [];
  if (Math.abs(RT.P.blockPerfect - 0.12) > 1e-9) bad.push("perfect block window " + RT.P.blockPerfect);
  if (Math.abs(RT.P.perfect - 0.15) > 1e-9) bad.push("perfect roll window " + RT.P.perfect);
  if (!(RT.P.botRollLead[0] < RT.P.perfect && RT.P.botRollLead[1] > RT.P.perfect && RT.P.botRollLead[1] < RT.P.roll)) bad.push("the bot's roll lead " + RT.P.botRollLead + " should straddle the perfect window and stay inside the roll");
  return bad;
});
check("swing-risk", "warned when a blow marked on you would land inside your swing: now (mid-swing) and next (a blow begun now)", () => {
  const F = fight("e_bandits", { path: "charioteer" }), { R, p } = F, bad = [];
  steps(R, 90);
  const f = R.B.units.find((u) => u.side === "enemy" && u.hp > 0);
  if (!f) return ["no foe"];
  f.rt.entered = true; f.rt.x = p.rt.x + p.rt.face * p.rt.reach * 0.8; f.rt.atk = null; f.rt.cool = 9;
  R.B.units.forEach((u) => { if (u.side === "enemy" && u !== f) { u.rt.atk = null; u.rt.cool = 99; } });
  if (RT.swingRisk(R).next) bad.push("warned with no blow marked");
  // a blow on you that lands sooner than the next blow's lock would end
  const len = RT.nextBlow(R).len;
  f.rt.face = -p.rt.face; f.rt.atk = { id: "strike", on: p.uid, t0: R.t, land: R.t + len * 0.6, lane: p.rt.lane };
  const th = RT.threats(R);
  if (!th.length) return ["the test blow is not a threat (" + JSON.stringify(f.rt.atk) + ")"];
  if (!RT.swingRisk(R).next) bad.push("not warned: a blow lands " + (len * 0.6).toFixed(2) + " s from now, inside a " + len + " s swing");
  f.rt.atk.land = R.t + len + 0.3;
  if (RT.swingRisk(R).next) bad.push("warned for a blow landing after the swing would end");
  close();
  return bad;
});
check("worn-down", "after two minutes an ordinary foe tires: every blow of yours on him takes at least 3% of his health by its weight; not before, and never a champion", () => {
  const F = fight("e_ep_carts", { path: "healer" }), { R, p } = F, bad = [];
  steps(R, 90);
  const f = R.B.units.find((u) => u.side === "enemy" && u.hp > 0);
  if (!f) return ["no foe"];
  f.rt.entered = true; f.rt.x = p.rt.x + p.rt.face * p.rt.reach * 0.8; f.status = {}; f.shield = null; f.rt.shield = 0;
  R.B.units.forEach((u) => { if (u.side === "enemy") { u.rt.atk = null; u.rt.cool = 999; } });
  const blows = (k) => { let n = 0; const hp0 = f.hp; for (let i = 0; i < 60 && !R.over && n < k; i++) { const before = f.hp; f.rt.x = p.rt.x + p.rt.face * p.rt.reach * 0.8; f.rt.atk = null; f.rt.cool = 999; RT.step(R, { strike: true }); for (let j = 0; j < 40 && !R.over; j++) RT.step(R, {}); if (f.hp < before) n++; } return n ? (hp0 - f.hp) / n : 0; };
  const want = Math.round(f.maxHp * RT.P.wornFloor * 0.48) - 0.5;
  const early = blows(4);
  if (!(early > 0)) bad.push("no blow landed");
  else if (early >= want) bad.push("a floor before two minutes: " + early.toFixed(1) + " a blow");
  R.t = Math.max(R.t, RT.P.wornAfter + 1);
  const late = blows(6);
  if (late < want) bad.push("after two minutes a blow took " + late.toFixed(1) + " of " + f.maxHp + ", under " + want.toFixed(1));
  if (!R.worn) bad.push("not said when it began");
  f.hero = true; const champ = blows(3); f.hero = false;
  if (champ >= want) bad.push("a champion tires too: " + champ.toFixed(1) + " a blow");
  close();
  return bad;
});

// ---------- The divine weapons (owner, 9 November: User Feedback 58) ----------
const weapons = (ids) => ids.map((id) => ({ id, from: "fire_altar", age: 30 }));
const ready = (R, id) => { const r = RT.astras(R).find((a) => a.id === id); return r ? r.why : "not offered"; };
check("astra-uses", "three uses of each divine weapon in a life, counted per weapon; a use is spent only on ordinary foes; against a champion it stays free once all three are gone", () => {
  const bad = [];
  let F = fight("e_guard", { astras: weapons(["agneya", "varuna"]) });
  F.p.hp = Math.floor(F.p.maxHp * 0.4);
  for (let n = 3; n >= 1; n--) { if (K.astraLeft("agneya") !== n) bad.push("agneya: " + K.astraLeft("agneya") + " left, wanted " + n); K.astraSpeak(F.B.api || { enc: F.B.enc, living: (s) => F.B.units.filter((u) => u.hp > 0 && (s === "friends" ? u.side !== "enemy" : u.side === s)), say: () => {}, tell: () => {}, status: () => {} }, F.p, "agneya", null); }
  if (K.astraLeft("agneya") !== 0) bad.push("agneya not spent after three uses: " + K.astraLeft("agneya"));
  if (K.astraLeft("varuna") !== 3) bad.push("using the Agneyastra spent the Varunastra: " + K.astraLeft("varuna") + " left");
  const w = ready(F.R, "agneya"); if (!w || !/three uses/i.test(w)) bad.push("agneya with none left: " + w);
  if (ready(F.R, "varuna")) bad.push("varuna with three left, below half health in the war, not ready: " + ready(F.R, "varuna"));
  close();
  F = fight("e_raid", { astras: weapons(["agneya"]), charges: { astra_used_agneya: 3 } });
  if (ready(F.R, "agneya")) bad.push("against Ashwatthama with no uses left: " + ready(F.R, "agneya"));
  const ash = F.B.units.find((u) => u.hero); ash.rt.entered = true; const h0 = ash.hp;
  RT.step(F.R, { astra: "agneya" });
  if (!F.B.used.astra) bad.push("against the champion the weapon was not spoken");
  if (K.astraLeft("agneya") !== 0 || (K.S.charges.astra_used_agneya || 0) !== 3) bad.push("a use was spent on a champion: " + K.S.charges.astra_used_agneya);
  if (ash.hp < h0) bad.push("the champion was hurt by it (he answers with the counter-weapon)");
  close();
  return bad;
});
check("astra-when", "when it may be spoken: in the war below half health or once one of yours falls; outside the war only under a tenth of your life, at a price; never in a practice bout", () => {
  const bad = [];
  let F = fight("e_guard", { astras: weapons(["agneya"]) });
  if (!ready(F.R, "agneya")) bad.push("war, full health, no one fallen: ready");
  F.p.hp = Math.floor(F.p.maxHp * 0.49); if (ready(F.R, "agneya")) bad.push("war, 49% health: not ready (" + ready(F.R, "agneya") + ")");
  F.p.hp = F.p.maxHp; const co = F.B.units.find((u) => u.side === "ally"); if (!co) bad.push("e_guard has no one beside you"); else { co.hp = co.plural ? co.maxHp - 1 : 0; if (ready(F.R, "agneya")) bad.push("war, one of yours fallen: not ready (" + ready(F.R, "agneya") + ")"); }
  close();
  F = fight("e_bandits", { side: null, act: 5, astras: weapons(["agneya"]) });
  F.p.hp = Math.floor(F.p.maxHp * 0.4); if (!ready(F.R, "agneya")) bad.push("outside the war at 40% health: ready");
  F.p.hp = Math.floor(F.p.maxHp * 0.08); if (ready(F.R, "agneya")) bad.push("outside the war under a tenth: not ready (" + ready(F.R, "agneya") + ")");
  const c0 = K.S.duty.conscience, s0 = K.S.rep.sages;
  F.B.units.filter((u) => u.side === "enemy").forEach((u) => { u.rt.entered = true; });
  RT.step(F.R, { astra: "agneya" });
  if (!F.B.used.astra) bad.push("outside the war under a tenth: not spoken");
  if (!(K.S.duty.conscience < c0) || !(K.S.rep.sages < s0)) bad.push("outside the war it cost nothing (conscience " + c0 + " -> " + K.S.duty.conscience + ", sages " + s0 + " -> " + K.S.rep.sages + ")");
  close();
  F = fight("e_spar", { side: null, act: 2, astras: weapons(["agneya"]) });
  F.p.hp = 1; if (!ready(F.R, "agneya")) bad.push("offered in a sparring bout");
  close();
  return bad;
});
check("astra-pack", "against ordinary foes it falls on the whole pack: the wounding weapons take 70-100% of each foe's health, sleep and the noose last twice as long; a champion on the field answers it and nothing lands", () => {
  const bad = [];
  for (const id of ["astra", "agneya", "varuna", "vayavya", "sammohana", "nagapasha"]) {
    const F = fight("e_guard", id === "astra" ? { boons: ["astra"], astra: { from: "fire_altar" } } : { astras: weapons([id]) });
    F.p.hp = Math.floor(F.p.maxHp * 0.4);
    const foes = F.B.units.filter((u) => u.side === "enemy"); foes.forEach((u) => { u.rt.entered = true; });
    const hp0 = foes.map((u) => u.hp);
    RT.step(F.R, { astra: id });
    if (!F.B.used.astra) { bad.push(id + ": not spoken (" + ready(F.R, id) + ")"); close(); continue; }
    if (id === "sammohana" || id === "nagapasha") {
      const st = id === "sammohana" ? "asleep" : "bound", want = id === "sammohana" ? 4 : 6;
      const held = foes.filter((u) => u.status[st] >= want - 1).length;
      if (held !== foes.length) bad.push(id + ": " + held + " of " + foes.length + " foes " + st + " for about " + want + " turns (" + foes.map((u) => u.status[st] || 0).join(",") + ")");
    } else {
      const shares = foes.map((u, i) => (hp0[i] - u.hp) / u.maxHp);
      if (shares.some((f) => f < 0.69 || f > 1.001)) bad.push(id + ": shares of health " + shares.map((f) => Math.round(f * 100) + "%").join(", ") + " (want 70-100% each)");
    }
    close();
  }
  return bad;
});
check("astra-fizzle", "a mantra traced wrong: nothing happens, no use is spent, and the weapon waits (10 s in real time, a turn on the turns)", () => {
  const bad = [];
  const F = fight("e_guard", { astras: weapons(["agneya"]) });
  F.p.hp = Math.floor(F.p.maxHp * 0.4);
  RT.step(F.R, { astraFail: "agneya" });
  if (F.B.used.astra || K.astraLeft("agneya") !== 3) bad.push("the broken mantra spent the weapon");
  if (!ready(F.R, "agneya")) bad.push("ready again at once after a broken mantra");
  steps(F.R, 60 * 10 + 5, () => { F.p.hp = Math.floor(F.p.maxHp * 0.4); return {}; });
  if (ready(F.R, "agneya")) bad.push("not ready again 10 s after a broken mantra: " + ready(F.R, "agneya"));
  close();
  RT.force = false; K.seed(7); life({ astras: weapons(["agneya"]) });
  const B = C.start("e_day1", null); C.player().hp = Math.floor(C.player().maxHp * 0.4);
  C.astraFizzle("agneya");
  const row = C.available().find((a) => a.id === "agneya");
  if (!row || !row.why || B.used.astra || K.astraLeft("agneya") !== 3) bad.push("on the turns a broken mantra: " + JSON.stringify(row && row.why) + ", used " + !!B.used.astra);
  try { C.settle("win"); } catch (e) { /* over */ } C.end(); RT.force = true;
  return bad;
});

check("astra-earn", "divine weapons are earned, not collected: at most two in a life (the plain astra counted), the second at least four years after the first; every road asks (penance, teacher, Mauni, the quests, a year with the sage, the mountain, the spared Gandharva); a quest with no room is offered in place of a weaker weapon, only upward, with three fresh uses; a road that cannot give a weapon still earns tapas", () => {
  const bad = [];
  const S5 = (o) => life(Object.assign({ act: 5, side: null, age: 33 }, o));
  const ok = (sc, id) => { const r = K.choiceList(K.SCENES[sc]).find((x) => x.c.id === id); return !!(r && r.ok); };
  // The cap and the spacing.
  let S = S5(); if (!K.astraRoom(S)) bad.push("no room with no weapon");
  K.apply({ boon: "astra", astraFrom: "penance" }); S.age = 36; if (K.astraRoom(S)) bad.push("room 3 years after the first");
  S.age = 37; if (!K.astraRoom(S)) bad.push("no room 4 years after the first");
  K.apply({ astraGrant: { id: "varuna", from: "lake_sage" } }); S.age = 50; if (K.astraRoom(S) || K.astraWhyNot(S) !== "full") bad.push("room with two weapons");
  K.apply({ astraGrant: { id: "agneya", from: "fire_altar" } }); if (K.astraCount(S) !== 2) bad.push("a third weapon granted past the cap: " + K.astraCount(S));
  // The quests: two years after the Agneyastra (the strongest) the Gandharva's pool (36) is still offered, for tapas only (owner,
  // 9 Nov): not one of the two quests, no weapon, two tapas and a blessing; the lake (42) can give its weapon.
  S = S5({ exile: "forest", flags: [] }); S.age = 34; K.apply({ astraGrant: { id: "agneya", from: "fire_altar" } });
  S.age = 36; if (!K.SCENES.w_riddle.when(S)) bad.push("the Gandharva's pool not offered for tapas two years after the Agneyastra");
  else {
    K.apply(K.SCENES.w_riddle.enter); const t0 = S.tapas || 0;
    const ans = K.SCENES.w_riddle.choices.find((c) => c.id === "answer"); K.apply(ans.win.fx);
    if ((S.astraOffers || 0) !== 0) bad.push("a quest for tapas only counted among the two");
    if (K.astraHeld(S).join() !== "agneya" || S.astraOffer || (S.tapas || 0) - t0 !== 2) bad.push("the pool won for tapas: " + K.astraHeld(S) + ", tapas +" + ((S.tapas || 0) - t0));
    if (!/blessed/.test(K.val(ans.win.text, S)) || !/blessing/.test(String(K.val(K.SCENES.w_riddle.body, S)))) bad.push("the pool for tapas does not say so");
  }
  S.age = 42; S.attrs.might = 6; S.attrs.grace = 4; if (!K.SCENES.w_dive.when(S)) bad.push("the lake not offered eight years after a weapon");
  // A stronger weapon in place of a weaker one (owner, 9 Nov): the plain astra at 33, the fire altar at 34 is offered as a
  // swap; won, the swap scene; giving the astra up leaves one weapon, the Agneyastra, with three fresh uses.
  S = S5({ exile: "forest", flags: [] }); K.apply({ boon: "astra", astraFrom: "penance" }); S.age = 34;
  if (!K.SCENES.w_fire.when(S)) bad.push("the fire altar not offered as a swap for the plain astra");
  const sit = K.SCENES.w_fire.choices.find((c) => c.id === "sit");
  K.apply(sit.win.fx); const nx = K.val(sit.win.next, S);
  if (nx !== "w_swap" || !S.astraOffer || S.astraNext !== "a5_jayadratha") bad.push("won with no room: not sent to the swap: " + nx + " " + JSON.stringify(S.astraOffer));
  else {
    const rows = K.choiceList(K.SCENES.w_swap).filter((x) => x.ok).map((x) => x.c.id);
    if (rows.join() !== "give_astra,keep") bad.push("the swap's choices: " + rows);
    S.charges.astra_used_agneya = 2;
    K.apply(K.val(K.SCENES.w_swap.choices, S).find((c) => c.id === "give_astra").fx);
    if (S.boons.includes("astra") || K.astraHeld(S).join() !== "agneya" || K.astraLeft("agneya", S) !== 3 || S.astraOffer) bad.push("after the swap: " + K.astraHeld(S) + ", " + K.astraLeft("agneya", S) + " uses");
    if (K.val(K.SCENES.w_swap.next, S) !== "a5_jayadratha") bad.push("the swap does not go on to the road's next scene");
  }
  // Only upward (sleep < noose < plain astra < water < wind < fire): over sleep and water the noose may replace sleep only,
  // fire either; over water and fire the noose is not offered at all. A refused swap keeps what you had.
  S = S5(); K.apply({ astraGrant: { id: "sammohana", from: "gandharva" } }); S.age = 40; K.apply({ astraGrant: { id: "varuna", from: "lake_sage" } });
  if (K.astraSwapFor("nagapasha", S).join() !== "sammohana") bad.push("the noose's swaps over sleep and water: " + K.astraSwapFor("nagapasha", S));
  if (K.astraSwapFor("agneya", S).join() !== "sammohana,varuna") bad.push("the Agneyastra's swaps: " + K.astraSwapFor("agneya", S));
  { const T = S5(); K.apply({ astraGrant: { id: "varuna", from: "lake_sage" } }); T.age = 40; K.apply({ astraGrant: { id: "agneya", from: "fire_altar" } });
    if (K.astraSwapFor("nagapasha", T).length) bad.push("the noose offered in place of stronger weapons"); K.S = S; }
  S.astraOffer = { id: "agneya", from: "fire_altar" }; K.apply({ astraSwap: null });
  if (K.astraHeld(S).join() !== "sammohana,varuna" || S.astraOffer) bad.push("a refused swap changed the weapons: " + K.astraHeld(S));
  // The teacher two years after another weapon: the mantra's discipline, no weapon (teacher's regard and a tapas).
  S = S5({ teacher: "drona", court: "hastinapura" }); S.duty.teacher = 8; S.age = 38;
  K.apply({ astraGrant: { id: "sammohana", from: "gandharva" } }); S.astras[0].age = 36;
  const tc = K.SCENES.a5_court_armour.choices.find((c) => c.id === "astra");
  if (!ok("a5_court_armour", "astra") || !/discipline/.test(K.val(tc.t, S))) bad.push("the teacher's choice two years after another: " + K.val(tc.t, S));
  { const t0 = S.tapas || 0; K.apply(tc.fx); if (S.boons.includes("astra") || (S.tapas || 0) - t0 !== 1) bad.push("the teacher's discipline: a weapon " + S.boons.includes("astra") + ", tapas +" + ((S.tapas || 0) - t0)); if (!/Enough/.test(K.val(tc.text, S))) bad.push("the teacher's discipline text"); }
  S = S5({ teacher: "drona", court: "hastinapura" }); S.duty.teacher = 8; S.age = 38; K.apply({ astraGrant: { id: "sammohana", from: "gandharva" } }); S.astras[0].age = 33;
  if (!/promised weapon/.test(K.val(tc.t, S))) bad.push("the teacher's weapon not offered five years after another");
  K.apply(tc.fx); if (!S.boons.includes("astra") || !/whisper/.test(K.val(tc.text, S))) bad.push("the teacher's weapon not given five years after another");
  // Mauni with no room: the medicine, not the mantra.
  S = S5({ teacher: "hermit" }); S.age = 38; K.apply({ astraGrant: { id: "nagapasha", from: "naga" } }); S.astras[0].age = 35;
  const mauni = K.SCENES.a5_own_crisis.choices.find((c) => c.id === "mauni"); K.apply(mauni.fx);
  if (S.boons.includes("astra")) bad.push("Mauni gave a weapon two years after another");
  if (/mantra/.test(K.val(mauni.text, S))) bad.push("Mauni's text speaks of a mantra he did not give");
  if ((S.tapas || 0) !== 1) bad.push("Mauni with no room: no tapas");
  // The mountain with two weapons: the kavacha. The spared Gandharva with no room: the vanishing only.
  S = S5(); S.rep.sages = 4; K.apply({ boon: "astra", astraFrom: "penance" }); S.age = 38; K.apply({ astraGrant: { id: "agneya", from: "fire_altar" } }); S.age = 42;
  const stand = K.SCENES.w_mountain.choices.find((c) => c.id === "stand"), wfx = stand && stand.win && stand.win.fx;
  const mfx = typeof wfx === "function" ? wfx(S) : wfx;
  if (!mfx || mfx.astraGrant || mfx.boon !== "kavacha") bad.push("the mountain with two weapons: " + JSON.stringify(mfx));
  S = S5(); K.apply({ astraGrant: { id: "varuna", from: "lake_sage" } }); S.age = 35;
  K.apply(K.ENCOUNTERS.e_gandharva.spare.fx);
  if ((S.astras || []).some((a) => a.id === "sammohana") || !S.boons.includes("antardhana")) bad.push("the spared Gandharva two years after a weapon: " + JSON.stringify(S.astras) + " " + S.boons);
  return bad;
});

check("spear", "the charioteer fights with the spear and shield (the longest reach: two thrusts and a lunge); the strategist with the sword, or the spear if chosen at fifteen", () => {
  const bad = [];
  const one = (o) => { const F = fight("e_guard", o); const p = F.p, w = p.rt.weapon, reach = p.rt.reach, list = RT.comboOf(F.R); close(); return { w, reach, list }; };
  const ch = one({ path: "charioteer" }), st = one({ path: "strategist" }), sp = one({ path: "strategist", weapon: "spear" });
  if (ch.w !== "spear") bad.push("the charioteer fights with " + ch.w);
  if (st.w !== "sword") bad.push("the strategist fights with " + st.w + " by default");
  if (sp.w !== "spear") bad.push("the strategist who chose the spear fights with " + sp.w);
  if (!(ch.reach > st.reach)) bad.push("the spear's reach " + ch.reach + " not longer than the sword's " + st.reach);
  if (ch.list.length !== 3 || !ch.list[2].heavy || !(ch.list[0].len > st.list[0].len)) bad.push("the spear's blows: " + JSON.stringify(ch.list));
  return bad;
});

check("path-arms", "the path screen at fifteen asks for a path, and each tile names what that path fights with (the strategist: the sword or the spear)", () => {
  const bad = [], sc = K.SCENES.a2_path, body = [].concat(K.val(sc.body, life()) || []).join(" ");
  if (!/path/i.test(body) || /weapon/i.test(body)) bad.push("the question: " + body);
  for (const c of sc.choices) {
    const p = c.id, sub = String(K.val(c.sub) || "").toLowerCase();
    const arms = p === "strategist" ? ["sword", "spear"] : [K.playerWeapon(life({ path: p }))];
    for (const w of arms) if (!sub.includes(w)) bad.push(p + ": the tile says \"" + sub + "\" but the path fights with " + w);
  }
  return bad;
});

// ---------- The champions' traits (stage 2: Fight_Traits_Draft.md section 2) ----------
const champ = (B, o) => { const f = B.units.find((u) => u.side === "enemy"); Object.assign(f, { hero: true }, o); return f; };
check("trait-weight", "Karna's armour lightens blows before the war; Jayadratha's boon halves them on day 13 for a Pandava; Ghatotkacha hits harder at night", () => {
  const bad = [];
  let F = fight("e_bandits", { act: 5 }); let k = champ(F.B, { person: "karna" });
  if (Math.abs(C.traitDmg(F.B, F.p, k) - 0.7) > 1e-9) bad.push("Karna before the war: " + C.traitDmg(F.B, F.p, k)); close();
  F = fight("e_bandits", { act: 6 }); k = champ(F.B, { person: "karna" });
  if (C.traitDmg(F.B, F.p, k) !== 1) bad.push("Karna in the war still lighter"); close();
  F = fight("e_bandits", { act: 6, side: "pandava", scene: "a6_day13" }); k = champ(F.B, { name: "Jayadratha's guard", src: "Jayadratha's guard", hero: false });
  if (C.traitDmg(F.B, F.p, k) !== 0.5) bad.push("Jayadratha's line on day 13 (Pandava): " + C.traitDmg(F.B, F.p, k));
  K.S.side = "kaurava"; if (C.traitDmg(F.B, F.p, k) !== 1) bad.push("Jayadratha's boon for a Kaurava life"); close();
  F = fight("e_bandits", {}); k = champ(F.B, { person: "ghatotkacha" });
  if (C.traitDmg(F.B, k, F.p) !== 1) bad.push("Ghatotkacha by day hits harder");
  F.B.enc = Object.assign({}, F.B.enc, { title: "The night battle" });
  if (Math.abs(C.traitDmg(F.B, k, F.p) - 1.3) > 1e-9) bad.push("Ghatotkacha at night: " + C.traitDmg(F.B, k, F.p)); close();
  return bad;
});
check("trait-bhishma", "Bhishma cannot be brought below a tenth before the tenth day, and can after it", () => {
  const bad = [];
  let F = fight("e_bandits", { scene: "a6_day1" }); let b = champ(F.B, { person: "bhishma" });
  if (C.traitCap(F.B, b, b.hp) !== b.hp - Math.round(b.maxHp * 0.1)) bad.push("day 1: a killing blow is not held at a tenth"); close();
  F = fight("e_bandits", { scene: "a6_bhishma" }); b = champ(F.B, { person: "bhishma" });
  if (C.traitCap(F.B, b, b.hp) !== b.hp) bad.push("day 10: still held"); close();
  return bad;
});
check("trait-read", "three whole combos running and Drona reads you (four for Kripa); a roll or a pause and he cannot", () => {
  const bad = [], F = fight("e_bandits", { path: "charioteer" }), { R } = F;
  steps(R, 90);
  R.B.units.forEach((u) => { if (u.side === "enemy") { u.rt.x = 0.93; u.rt.cool = 99; } }); // (nobody near: the blows land on air)
  const swing = () => { RT.step(R, { strike: true }); let n = 0; while (RT.swinging() && n++ < 120) RT.step(R, {}); };
  for (let i = 0; i < 9; i++) swing();
  if (R.readN !== 3) bad.push("after three whole combos the count is " + R.readN);
  RT.step(R, R.blocker ? { block: true } : { roll: true, rollDir: 1 }); steps(R, 10);
  if (R.readN !== 0) bad.push("a " + (R.blocker ? "block" : "roll") + " did not break the read");
  for (let i = 0; i < 3; i++) swing();
  steps(R, 90); swing();
  if (R.readN !== 0) bad.push("a pause between combos did not break the read: " + R.readN);
  close(); return bad;
});
check("trait-read-parry", "Drona, having read you, meets your next blow for sure", () => {
  const bad = [], F = fight("e_bandits", { path: "charioteer" }), { R, p } = F;
  steps(R, 90);
  const d = champ(R.B, { person: "drona", name: "Drona" });
  R.B.units.forEach((u) => { if (u.side === "enemy" && u !== d) { u.rt.x = 0.93; u.rt.cool = 99; } });
  Object.assign(d.rt, { entered: true, lane: p.rt.lane, x: p.rt.x + p.rt.face * p.rt.reach * 0.8, face: -p.rt.face, cool: 99, atk: null, stag: 0, rec: 0, openUntil: 0, weapon: "sword", archer: false });
  R.D.parryFoe = 0; R.readN = 3; R.comboEnd = R.t; // (three combos just ended: no pause)
  const before = R.stats.parried;
  RT.step(R, { strike: true }); let n = 0; while (RT.swinging() && n++ < 60) RT.step(R, {});
  if (R.stats.parried !== before + 1) bad.push("not parried after the read");
  if (R.readN !== 0) bad.push("the read not spent");
  close(); return bad;
});
check("trait-wheel", "on the seventeenth day Karna, below a third, stops 3 s at his sunken wheel; a blow then is remembered", () => {
  const bad = [], F = fight("e_bandits", { path: "charioteer", scene: "hold_karna_offer" }), { R, p } = F;
  if (RT.warDay() !== 17) bad.push("the hold before the seventeenth day is day " + RT.warDay());
  steps(R, 90);
  const k = champ(R.B, { person: "karna", name: "Karna" });
  R.B.units.forEach((u) => { if (u.side === "enemy" && u !== k) { u.rt.x = 0.93; u.rt.cool = 99; } });
  Object.assign(k.rt, { entered: true, lane: p.rt.lane, x: p.rt.x + p.rt.face * p.rt.reach * 0.8, face: -p.rt.face, cool: 99, atk: null });
  k.hp = Math.floor(k.maxHp * 0.3);
  RT.step(R, {});
  if (!(k.rt.wheelUntil > R.t)) bad.push("the wheel did not sink");
  if (!R.fx.some((f) => f.k === "trait" && f.who === "karnaWheel") && !(R.told || {}).karnaWheel) bad.push("no tip");
  R.D.parryFoe = 0;
  RT.step(R, { strike: true }); let n = 0; while (RT.swinging() && n++ < 60) RT.step(R, {});
  if (!K.S.flags.includes("struck_karna_wheel")) bad.push("a blow at the wheel not remembered");
  close(); return bad;
});
check("trait-maya", "Ghatotkacha below two thirds becomes three for 6 s: a false one vanishes when struck, and none outlives the fight", () => {
  const bad = [], F = fight("e_bandits", { path: "charioteer" }), { R, p } = F;
  steps(R, 90);
  const g = champ(R.B, { person: "ghatotkacha", name: "Ghatotkacha" });
  Object.assign(g.rt, { entered: true, cool: 99 }); g.hp = Math.floor(g.maxHp * 0.6);
  RT.step(R, {});
  const ds = R.B.units.filter((u) => u.decoy);
  if (ds.length !== 2) bad.push(ds.length + " false figures");
  else {
    const d = ds[0];
    R.B.units.forEach((u) => { if (u.side === "enemy" && u !== d) { u.rt.x = 0.93; u.rt.cool = 99; } });
    Object.assign(d.rt, { lane: p.rt.lane, x: p.rt.x + p.rt.face * p.rt.reach * 0.8 });
    RT.step(R, { strike: true }); let n = 0; while (RT.swinging() && n++ < 60) RT.step(R, {});
    if (R.B.units.includes(d)) bad.push("a struck false figure did not vanish");
    steps(R, 6.2 * 60);
    if (R.B.units.some((u) => u.decoy)) bad.push("a false figure outlived its 6 s");
  }
  if (R.B.units.filter((u) => u.decoy).length) RT.clearDecoys(R.B);
  close(); return bad;
});
check("trait-others", "Supratika cannot be parried and breaks shields at Bhima's rate; Bhima's war cry beside you; every champion's trait has its line", () => {
  const bad = [], F = fight("e_bandits", {}), { R, B } = F;
  const s = champ(B, { name: "Supratika, Bhagadatta's elephant", src: "Supratika, Bhagadatta's elephant" });
  if (RT.shieldHit(s, "fist", false) !== RT.SHIELD_HIT.mace[3]) bad.push("Supratika's shield points: " + RT.shieldHit(s, "fist", false));
  s.rt.atk = { id: "strike", on: C.player().uid, t0: R.t, land: R.t + 0.05, ranged: false, area: false };
  if (RT.parryable(R, s, 1)) bad.push("Supratika's charge parried");
  for (const w of ["bhima", "duryodhana", "arjuna", "bhishma", "drona", "kripa", "ashwatthama", "ghatotkacha", "abhimanyu", "satyaki", "bhurishravas"]) if (!RT.traitLine({ side: "enemy", person: w })) bad.push("no line for " + w);
  if (!RT.traitLine({ side: "enemy", name: "Supratika, Bhagadatta's elephant" })) bad.push("no line for Supratika");
  close();
  const G = fight("e_bandits", {}, { before: (B2) => B2.units.push({ uid: "bh", name: "Bhima", person: "bhima", side: "ally", hp: 200, maxHp: 200, atk: 6, def: 1, abilities: ["strike"], cds: {}, status: {} }) });
  steps(G.R, 5 * 60);
  const bh = G.B.units.find((u) => u.person === "bhima");
  if (!bh || !(bh.rt.cryNext > 4)) bad.push("Bhima beside you never roared");
  close(); return bad;
});

// ---------- Stage 3: how you climb, the boons and the divine weapons' gifts in a fight ----------
check("tier-climb", "your tier: the floor from might and weapon skill (9, 11; the teacher's test counts through the skill it teaches), Bhadra's helmet, a captain brought down or a late deadly win lifts you to captain, two strength marks to great champion; never down", () => {
  const bad = [], S = life({ path: "mace" }), sk = K.PATHS.mace.skill;
  const at = (might, skill, o) => { const T = life(Object.assign({ path: "mace" }, o || {})); T.attrs.might = might; T.skills[sk] = skill; T.tier = (o && o.tier) || 0; return K.tierNow(T); };
  if (at(4, 4) !== 0) bad.push("8 gives " + at(4, 4));
  if (at(5, 4) !== 1) bad.push("9 gives " + at(5, 4));
  if (at(6, 5) !== 2) bad.push("11 gives " + at(6, 5));
  if (at(3, 3, { flags: ["teacher_trial_won"] }) !== 0) bad.push("the teacher's test alone makes a captain");
  if (at(4, 4, { flags: ["teacher_trial_won"] }) !== (K.CLIMB.trialPoint ? 1 : 0)) bad.push("the teacher's test: " + at(4, 4, { flags: ["teacher_trial_won"] }) + " at 8 (its point toward the floor: " + (K.CLIMB.trialPoint || 0) + ")");
  if (at(3, 3, { flags: ["bhadra_helmet"] }) !== 1) bad.push("Bhadra's helmet does not make a captain");
  if (at(3, 3, { flags: ["bhadra_helmet_kept"] }) !== 0) bad.push("a helmet never worn makes a captain");
  if (at(3, 3, { flags: ["felled_captain"] }) !== 1) bad.push("a captain brought down does not make a captain");
  if (at(3, 3, { flags: ["deadly_won_late"] }) !== 1) bad.push("a late deadly win does not lift you");
  if (at(3, 3, { boons: ["bala"], flags: ["ugra_tournament_won"] }) !== 2) bad.push("Bala and the tournament do not make a great champion");
  if (at(3, 3, { boons: ["bala"] }) !== 0) bad.push("one strength mark alone lifts you");
  if (at(3, 3, { flags: ["held_karna", "kd_stood"] }) !== 2) bad.push("a hold and a war feat do not make a great champion");
  if (at(3, 3, { tier: 2 }) !== 2) bad.push("a tier was lost");
  const T = life({ path: null }); T.tier = 0; if (K.tierNow(T) !== 0) bad.push("no path, yet a tier");
  void S; return bad;
});
const withBoons = (enc, boons, o) => { const F = fight(enc, Object.assign({ path: "mace", boons: boons.slice() }, o || {}), { before: (B) => { B.units.filter((u) => u.side !== "player").forEach((u) => { u.still = true; }); } }); return F; };
check("boon-gifts", "each boon and each kept divine weapon is on in a fight while it should be, and off once spent, used or lost", () => {
  const bad = [];
  const ids = (F) => RT.gifts().map((g) => g.id).sort().join(",");
  let F = withBoons("e_bandits", ["bala", "kavacha", "charm_shield", "foresight", "healing_hands", "sanjivani", "antardhana", "astra"], { charges: { kavacha: 1, sanjivani: 1 }, astras: [{ id: "agneya", from: "fire_altar" }, { id: "varuna", from: "lake_sage", broken: true }] });
  const want = "agneya,antardhana,bala,charm_shield,foresight,healing_hands,indra,kavacha,sanjivani";
  if (ids(F) !== want) bad.push("gifts on: " + ids(F));
  if (Math.abs(RT.kneelT() - 0.7) > 1e-9) bad.push("healing hands: kneel " + RT.kneelT());
  if (Math.abs(RT.cueLead() - (RT.P.parryCue + 0.15)) > 1e-9) bad.push("foresight: cue " + RT.cueLead());
  if (Math.abs(RT.parryWin() - RT.P.parry * 1.2) > 1e-9) bad.push("the teacher's eye: parry window " + RT.parryWin());
  const foe = F.B.units.find((u) => u.side === "enemy");
  if (Math.abs(C.traitDmg(F.B, foe, F.p) - 0.9) > 1e-9) bad.push("kavacha: " + C.traitDmg(F.B, foe, F.p));
  K.S.charges.kavacha = 0; K.S.charges.sanjivani = 0;
  if (C.traitDmg(F.B, foe, F.p) !== 1) bad.push("a spent kavacha still lightens blows");
  if (/kavacha|sanjivani/.test(ids(F))) bad.push("spent charges still shown: " + ids(F));
  // Bala's breath: back half again as fast
  F.R.breath = 0; F.R.winded = false; steps(F.R, 30); const bala = F.R.breath; close();
  F = withBoons("e_bandits", []); F.R.breath = 0; steps(F.R, 30); const plain = F.R.breath;
  if (ids(F) !== "") bad.push("no boons, yet: " + ids(F));
  if (!(bala > plain * 1.4 && bala < plain * 1.6)) bad.push("Bala's breath " + bala.toFixed(1) + " against " + plain.toFixed(1));
  close();
  // The charmed shield: a Bhima-strength blow never breaks it
  F = withBoons("e_bandits", ["charm_shield"]);
  for (let i = 0; i < 12; i++) { F.R.sp = Math.min(F.R.sp, RT.P.shieldPts); }
  const sp0 = F.R.sp; F.R.B.units.filter((u) => u.side === "enemy").forEach((u) => { u.hp = 0; });
  close(); void sp0;
  return bad;
});
check("boon-charm-shield", "the charmed shield is never broken, even by Bhima's mace", () => {
  const F = fight("hold_bhima", { path: "mace", boons: ["charm_shield"] }), { R, B, p } = F, bad = [];
  const foe = B.units.find((u) => u.person === "bhima");
  B.units.filter((u) => u.side === "enemy" && u !== foe).forEach((u) => { u.hp = 0; });
  foe.rt.entered = true; foe.rt.wave = 0; foe.rt.x = Math.min(0.9, p.rt.x + 0.2);
  let caught = 0, n = 0;
  while (!R.over && n++ < 60 * 120) { p.hp = p.maxHp; R.breath = RT.P.breathMax; R.winded = false; foe.hp = foe.maxHp; const b = R.stats.blocked; RT.step(R, { block: true }); if (R.stats.blocked > b) caught++; if (R.broken) break; }
  if (R.broken) bad.push("broken after " + caught + " blows");
  if (caught < 6) bad.push("only " + caught + " blows caught");
  close(); return bad;
});
check("boon-herbs", "herbs: quicker with healing hands, half again with the sanjivani root unspent", () => {
  const bad = [];
  const heal = (boons, charges) => {
    const F = withBoons("e_bandits", boons, { charges: charges || {} }), { R, p } = F;
    R.B.units.filter((u) => u.side === "enemy").forEach((u) => { u.rt.x = 0.93; u.rt.cool = 99; u.still = true; });
    p.hp = Math.round(p.maxHp * 0.3); const h0 = p.hp;
    RT.step(R, { herbs: true }); let n = 0; while (R.kneel > 0 && n++ < 200) RT.step(R, {});
    const out = { gain: p.hp - h0, steps: n }; close(); return out;
  };
  const a = heal([]), b = heal(["sanjivani"], { sanjivani: 1 }), c = heal(["healing_hands"]);
  if (!(a.gain > 0)) bad.push("herbs healed nothing");
  else if (Math.abs(b.gain - Math.min(Math.round(a.gain * 1.5), b.gain)) > 1 || b.gain <= a.gain) bad.push("sanjivani: " + b.gain + " against " + a.gain);
  if (!(c.steps < a.steps * 0.75)) bad.push("healing hands: " + c.steps + " steps against " + a.steps);
  return bad;
});
check("boon-antardhana", "Antardhana under Aid: 2 s unseen, the first blow after it half again, once an act (shared with the stories)", () => {
  const F = withBoons("e_bandits", ["antardhana"]), { R, p } = F, bad = [];
  if (!RT.vanishOffer(R) || !RT.can(R, "vanish")) bad.push("not offered");
  RT.step(R, { vanish: true });
  if (!(R.unseen > 1.9)) bad.push("not unseen: " + R.unseen);
  if (R.boonBlow !== 1.5) bad.push("no blow ready: " + R.boonBlow);
  if (K.S.vanishedAct !== K.S.act || K.vanishReady(K.S)) bad.push("the act's use not spent");
  if (RT.can(R, "vanish")) bad.push("offered twice");
  steps(R, 2.1 * 60); if (R.unseen > 0) bad.push("still unseen after 2 s");
  close();
  const G = withBoons("e_bandits", []);
  if (RT.vanishOffer(G.R)) bad.push("offered without the boon");
  close(); return bad;
});
// One heavy blow of yours on a foe right in front (the mace's sweep is its second blow).
const heavyOn = (F) => {
  const { R, B, p } = F, f = B.units.find((u) => u.side === "enemy" && u.hp > 0);
  B.units.forEach((u) => { if (u.side === "enemy" && u !== f) { u.rt.x = 0.93; u.rt.cool = 99; } });
  Object.assign(f.rt, { entered: true, lane: p.rt.lane, x: p.rt.x + p.rt.face * p.rt.reach * 0.7, cool: 99, atk: null, stag: 0 });
  f.shield = false; f.shieldDrawn = false; f.hp = f.maxHp; f.maxHp = Math.max(f.maxHp, 60); f.hp = f.maxHp; R.D.parryFoe = 0;
  for (let k = 0; k < 2; k++) { RT.step(R, { strike: true }); let n = 0; while ((RT.swinging() || p.rt.blow) && n++ < 90) RT.step(R, {}); f.rt.cool = 99; f.rt.atk = null; }
  return f;
};
check("weapon-gifts", "the divine weapons' gifts: Agni's fire burns after a heavy blow; the coil holds his feet; the sleep slows his next wind-up; Vayu's feet and Varuna's water", () => {
  const bad = [];
  let F = withBoons("e_bandits", [], { astras: [{ id: "agneya", from: "fire_altar" }, { id: "nagapasha", from: "naga" }, { id: "sammohana", from: "gandharva" }] });
  F.B.units.filter((u) => u.side === "enemy").forEach((u) => { u.still = false; });
  const f = heavyOn(F);
  if (!(f.rt.burnUntil > F.R.t)) bad.push("no fire");
  if (!(f.rt.boundUntil > F.R.t)) bad.push("no coil");
  if (f.rt.slowNext !== 1.3) bad.push("no sleep in his eyes: " + f.rt.slowNext);
  const h = f.hp; steps(F.R, 2.2 * 60, () => { f.rt.cool = 99; f.rt.atk = null; return {}; });
  if (!(f.hp < h)) bad.push("the fire did him no harm");
  close();
  F = withBoons("e_bandits", [], { astras: [{ id: "vayavya", from: "hermitage" }, { id: "varuna", from: "lake_sage" }] });
  if (Math.abs(RT.walkMul() - 1.15) > 1e-9 || Math.abs(RT.rollMul() - 1.2) > 1e-9) bad.push("Vayu's feet: " + RT.walkMul() + ", " + RT.rollMul());
  F.R.breath = 0; steps(F.R, 30); const cool = F.R.breath; close();
  F = withBoons("e_bandits", [], { astras: [{ id: "vayavya", from: "hermitage", broken: true }] });
  if (RT.walkMul() !== 1) bad.push("a lost weapon's gift kept");
  F.R.breath = 0; steps(F.R, 30); const plain = F.R.breath; close();
  if (!(cool > plain * 1.15 && cool < plain * 1.25)) bad.push("Varuna's breath " + cool.toFixed(1) + " against " + plain.toFixed(1));
  return bad;
});
check("tier-stagger", "a soldier's heavy blow staggers a soldier but not a captain; a champion's staggers a captain", () => {
  const bad = [];
  const hit = (tier, foeTier) => {
    const F = withBoons("e_bandits", []), { R, B, p } = F; K.S.tier = tier;
    const f = B.units.find((u) => u.side === "enemy"); B.units.forEach((u) => { if (u.side === "enemy" && u !== f) { u.rt.x = 0.93; u.rt.cool = 99; } });
    f.tier = foeTier; f.still = false;
    Object.assign(f.rt, { entered: true, lane: p.rt.lane, x: p.rt.x + 0.08, cool: 99 });
    p.rt.busy = 0; R.D.parryFoe = 0;
    f.rt.atk = { id: "strike", on: p.uid, t0: R.t - 0.5, land: R.t + RT.STEP * 0.5, ranged: false, area: false, lane: p.rt.x, locked: true, heavy: true };
    let n = 0; while (f.rt.atk && n++ < 30) RT.step(R, {});
    const busy = p.rt.busy; close(); return busy;
  };
  if (!(hit(0, 0) > 0.05)) bad.push("a soldier's heavy blow did not stagger a soldier");
  if (hit(1, 0) > 0.05) bad.push("a soldier's heavy blow staggered a captain");
  if (!(hit(1, 2) > 0.05)) bad.push("a champion's heavy blow did not stagger a captain");
  if (hit(2, 1) > 0.05) bad.push("a captain's heavy blow staggered a great champion");
  return bad;
});

// ---------- Row 47: archers among the packs from Act III; row 38: field events drawn ----------
check("mix-archers", "from Act III a plain soldier of a fight with no archer is his side's archer instead (one still fights hand to hand); not before Act III, not on the ladder, not where the fight says no; the same each time from the same moment", () => {
  const bad = [], keep = C.MIX.one; C.MIX.one = 1; C.MIX.from = MIX_FROM;
  const start = (id, o) => { if (C.state()) { try { C.settle("win"); } catch (e) { /* over */ } C.end(); } life(Object.assign({ path: "mace", act: 6 }, o || {})); C.start(id, null); const B = C.state(); const f = B.units.filter((u) => u.side === "enemy"); const out = { arch: f.filter((u) => u.mixed), melee: f.filter((u) => !u.mixed) }; close(); return out; };
  try {
    let r = start("e_border");
    if (r.arch.length !== 1 || r.arch[0].src !== "Kaurava archer" || !r.arch[0].abilities.includes("arrows") || r.arch[0].shield) bad.push("e_border at Act VI: " + r.arch.map((u) => u.src).join(", "));
    if (!r.melee.length) bad.push("no one left to fight hand to hand");
    r = start("e_border"); if (r.arch.length !== 1) bad.push("the same fight from the same moment drew another pack");
    r = start("e_border", { act: 2 }); if (r.arch.length) bad.push("an archer before Act III");
    r = start("e_border", { fighter: true }); if (r.arch.length) bad.push("an archer on the young fighter's ladder");
    r = start("cross_e_escape", { side: "kaurava" }); if (r.arch.length) bad.push("an archer in the crossing, whose lines say spears");
    r = start("e_kb_hold"); if (r.arch.some((u) => u.person)) bad.push("a named fighter made an archer");
  } finally { C.MIX.one = keep; C.MIX.from = 99; }
  return bad;
});
check("field-kinds", "every field event and scripted beat is drawn as something (the horse wedge rides, the elephant charges, arrows fall, the moon is hidden, Ghatotkacha looms, fire runs)", () => {
  const bad = [], vm = require("vm"), ctx = { window: { K: { UI: {} } } };
  vm.runInNewContext(fs.readFileSync(require("path").join(__dirname, "..", "js", "ui", "fx.js"), "utf8"), ctx);
  const kind = ctx.window.K.UI.fieldKind;
  const want = { horse: "The horse come on in a wedge, with Shakuni's brothers at its point.", elephant: K.BATTLE_EVENTS.elephant.text, arrows: K.BATTLE_EVENTS.arrows.text, dark: K.BATTLE_EVENTS.moon.text,
    giant: K.BATTLE_EVENTS.ghatotkacha_p.text, fire: K.BATTLE_EVENTS.smoke.text, conch: K.BATTLE_EVENTS.conch.text, water: K.BATTLE_EVENTS.water.text, chariot: "A chariot comes straight at Vasu's shield-wall. He goes down under the wheels and does not get up." };
  for (const [k, line] of Object.entries(want)) if (kind(line) !== k) bad.push(k + " drawn as " + kind(line));
  for (const [id, e] of Object.entries(K.BATTLE_EVENTS)) if (!kind(e.text)) bad.push("nothing for " + id);
  return bad;
});

// ---------- The captain's arc (owner, 11 November) ----------
check("captain-arc", "Bhadra: the bout before the court (Act III), the border road before the Rajasuya, the helmet before Matsya once you stood by him; worn, a Captain's moment of its own; the thirteenth day remembers the dream", () => {
  const bad = [];
  const next = (S, id) => { for (let i = 0; i < 30; i++) { const sc = K.resolveScene(id, S); if (sc.id.startsWith("ep_bhadra") || sc.id === id) return sc.id; S.seen.push(sc.id); } return null; };
  let S = life({ act: 3, age: 25, path: "mace" });
  if (next(S, "a3_court") !== "ep_bhadra_bout") bad.push("no bout before the court: " + next(S, "a3_court"));
  const enc = K.ENCOUNTERS.e_bhadra, road = K.ENCOUNTERS.e_bhadra_road;
  if (!enc || !RT.isRealtime(enc) || !enc.bout || enc.lethal) bad.push("the bout is not a real-time bout");
  if (!road || !RT.isRealtime(road) || road.lethal) bad.push("the road is not a real-time fight");
  S = life({ act: 3, age: 28, path: "mace", flags: [] }); S.seen.push("ep_bhadra_bout");
  if (next(S, "a3_rajasuya") === "ep_bhadra_road") bad.push("the road without having met him");
  K.apply({ flag: "bhadra_met" });
  if (next(S, "a3_rajasuya") !== "ep_bhadra_road") bad.push("no border road after meeting him");
  S = life({ act: 5, age: 41, path: "mace" }); K.apply({ flag: ["bhadra_met"] });
  if (next(S, "a5_matsya") === "ep_bhadra_helmet") bad.push("the helmet without standing by him");
  for (const mark of ["bhadra_held", "bhadra_led", "bhadra_carried"]) {
    S = life({ act: 5, age: 41, path: "mace", flags: ["bhadra_met", mark] }); S.attrs.might = 2; S.skills[K.PATHS.mace.skill] = 2; S.tier = 0;
    if (next(S, "a5_matsya") !== "ep_bhadra_helmet") { bad.push("no helmet after " + mark); continue; }
    const sc = K.SCENES.ep_bhadra_helmet, wear = sc.choices.find((c) => c.id === "wear");
    K.apply(wear.fx);
    if (S.tier !== 1) bad.push("worn after " + mark + ": tier " + S.tier);
    const m = (S.moments || []).slice(-1)[0];
    if (!m || m.kind !== "tier" || m.via !== "helmet") bad.push("no helmet moment: " + JSON.stringify(m));
    if (!S.dead.includes("bhadra")) bad.push("Bhadra lives on");
    const d13 = [].concat(K.val(K.SCENES.a6_day13.body, Object.assign(S, { side: "pandava" })) || []).filter(Boolean);
    if (!d13.some((b) => b && b.memory && /dented helmet/.test(b.memory))) bad.push("the thirteenth day does not remember the helmet");
  }
  S = life({ act: 5, age: 41, path: "mace", flags: ["bhadra_met", "bhadra_held"] }); S.attrs.might = 2; S.skills[K.PATHS.mace.skill] = 2; S.tier = 0;
  K.apply(K.SCENES.ep_bhadra_helmet.choices.find((c) => c.id === "keep").fx);
  if (S.tier !== 0) bad.push("a helmet kept in its cloth made a captain");
  return bad;
});
check("felled-captain", "a captain-tier foe brought down in a real fight you won, grown, makes a Captain, and the moment names him; not at sixteen, not in a bout, not on the ladder", () => {
  const bad = [];
  const play = (o, enc) => {
    if (C.state()) { try { C.settle("win"); } catch (e) { /* over */ } C.end(); }
    const S = life(Object.assign({ path: "mace", act: 4, age: 30 }, o)); S.attrs.might = 2; S.skills[K.PATHS.mace.skill] = 2; S.tier = 0;
    const B = C.start(enc || "e_border", null);
    const f = B.units.find((u) => u.side === "enemy"); f.name = f.src = "Kaurava raiders' captain"; f.person = null;
    B.units.filter((u) => u.side === "enemy").forEach((u) => { u.hp = 0; });
    C.settle("win"); C.end(); return S;
  };
  let S = play({});
  if (!S.flags.includes("felled_captain") || S.tier !== 1) bad.push("a captain brought down at 30: tier " + S.tier);
  const m = (S.moments || []).slice(-1)[0];
  if (!m || m.via !== "felled" || !/captain/.test(m.foe || "")) bad.push("the moment does not name him: " + JSON.stringify(m));
  S = play({ age: 16, act: 2 }); if (S.flags.includes("felled_captain")) bad.push("at sixteen");
  S = play({ fighter: true }); if (S.flags.includes("felled_captain")) bad.push("on the ladder");
  S = play({}, "e_bhadra"); if (S.flags.includes("felled_captain")) bad.push("in a bout");
  return bad;
});

const results = [];
let fail = 0;
for (const c of CASES) {
  if (only && !only.has(c.id)) continue;
  const t = Date.now();
  let bad;
  try { bad = c.fn() || []; } catch (e) { bad = ["threw: " + String(e.stack || e).split("\n").slice(0, 3).join(" | ")]; }
  const ok = !bad.length; if (!ok) fail++;
  console.log((ok ? "ok    " : "FAIL  ") + c.id.padEnd(22) + c.what + "  (" + ((Date.now() - t) / 1000).toFixed(1) + " s)");
  for (const b of bad) console.log("        " + b);
  results.push({ id: c.id, ok, bad });
}
console.log("traits: " + results.length + " checks, " + (results.length - fail) + " pass, " + fail + " fail");
const json = arg("--json", ""); if (json) fs.writeFileSync(json, JSON.stringify({ results }, null, 1));
process.exit(fail ? 1 : 0);
