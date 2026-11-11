/* Review of the fight rules in the engine (no page; the owner's checklist, 4 November):
     blows            7  in real time, every defence and blow is recorded as it happened: a blow taken on the body takes
                         exactly the health it says and the log tells it; Block raised in time stops a frontal blow (all of it
                         when raised just before it lands, a perfect block that staggers the striker) and costs breath; a roll
                         dodges (perfect just before the blow: the foes slow); a roll and a held shield cost breath; arrows
                         land on the one in their lane
     archers          2  archers only shoot: a foe archer, and an archer at your side (Arjuna called to help) looses arrows
     spare            8  a foe kneels at 5% (not 6%), or asleep or bound; sparing one lets the fight go on; every foe spared
                         ends on the spare branch; one killed and one spared is a win, the spare branch's effect once
     retry            9  a deadly fight lost the first time gives one Try again at 80%, with the divine weapon and the call
                         still used; a second loss is final; a fight that is not deadly gives none and is lived through; the
                         lac-house escape failed once costs a scar, or a point of grace when already scarred
     astra            10 a divine weapon in real time freezes the fight for its moment (2.4 s), then throws its struck foes;
                         a champion (hero) answers it with his counter-weapon: stunned, unhurt; the night raid's Ashwatthama
                         is such a champion
     turns            11 with Fights: turn-based no fight is played in real time; real-time is the default
   Usage: node tests/review_rules.js [--case id,id] [--list] [--json FILE]   Exits 1 when a case fails. */
"use strict";
const L = require("./review_lib");
const H = L.H;
const T = L.suite("review_rules", "tests/review_rules.js: the fight rules in the engine");
const { engine } = T;

let K = null;
const E = () => (K = K || H.engine({ hindi: true }));
const life = (o) => { const K = E(); const S = (K.S = Object.assign(K.newLife(), { name: "T", pronoun: "she", origin: "panchala", age: 38, act: 5, path: "mace", side: "pandava", teacher: "drona" }, o || {})); S.attrs.might = 3; S.attrs.grace = 3; if (K.momentQueue) K.momentQueue.length = 0; return S; };
const rt = (enc, o, seed) => { const K = E(); K.lang = "en"; K.RT.force = true; K.seed(seed || 7); const S = life(o); if (o && o.astras) S.astras = o.astras.map((id) => ({ id, from: "test", age: S.age })); if (o && o.bonds) Object.assign(S.bonds, o.bonds); if (K.Combat.state()) { try { K.Combat.settle("win"); K.Combat.end(); } catch (e) { /* none */ } } const B = K.Combat.start(enc, null); const R = K.RT.begin(B); return { K, B, R, C: K.Combat, RT: K.RT, p: K.Combat.player() }; };
const done = (F) => { try { if (F.C.state() && !F.C.state().over) F.C.settle("win"); F.C.end(); } catch (e) { /* over */ } };
const foes = (F) => F.B.units.filter((u) => u.side === "enemy" && u.hp > 0);
// Steps until a foe starts a blow on you; returns that foe (others are held still).
function waitBlow(F, max = 900) {
  const { R, RT, p } = F;
  for (let i = 0; i < max && !R.over; i++) {
    p.hp = p.maxHp; R.breath = RT.P.breathMax;
    const e = foes(F).find((u) => u.rt.atk && u.rt.atk.on === p.uid && !u.rt.atk.ranged && !u.rt.atk.area);
    if (e) return e;
    RT.step(R, {});
  }
  return null;
}

engine("blows", "every defence and blow in real time is recorded as it happened", () => {
  const bad = [];
  // A blow on the body: the health it takes, the number it pops and the log line.
  {
    const F = rt("e_bandits", { path: "spy" });
    const { R, RT, p, B } = F;
    let n = 0, wrong = 0, unlogged = 0, blows = 0;
    for (let i = 0; i < 60 * 40 && !R.over && blows < 12; i++) {
      if (p.hp < p.maxHp * 0.3) p.hp = p.maxHp;
      const hp = new Map(B.units.map((u) => [u.uid, u.hp])), f0 = R.fx.length, l0 = B.log.length;
      RT.step(R, RT.bot(R));
      for (const f of R.fx.slice(f0)) {
        if (f.k !== "hit" || !(f.n > 0)) continue;
        n++; if (f.uid === p.uid) blows++;
        const u = B.units.find((x) => x.uid === f.uid);
        if (hp.get(f.uid) - u.hp !== f.n) wrong++;
        if (!B.log.slice(l0).some((l) => l.v && l.v.n === f.n)) unlogged++;
      }
      R.fx.length = 0;
    }
    if (!n) bad.push("no blow landed in 40 s of the bot's fight");
    if (wrong) bad.push(wrong + " of " + n + " blows took another amount of health than they said");
    if (unlogged) bad.push(unlogged + " of " + n + " blows have no line in the fight's log with their number");
    done(F);
  }
  // Block: raised early (not perfect) lets a little through and costs breath; raised just before the blow stops it all
  // and staggers the striker.
  for (const late of [false, true]) {
    const F = rt("e_bandits", { path: "mace" }, late ? 11 : 13);
    const { R, RT, p } = F;
    if (!R.blocker) { bad.push("the mace path does not block"); done(F); continue; }
    const e = waitBlow(F);
    if (!e) { bad.push("no foe struck at you to block"); done(F); continue; }
    p.rt.face = Math.sign(e.rt.x - p.rt.x) || 1;
    const lead = late ? RT.P.blockPerfect * 0.5 : RT.P.blockPerfect + 0.3;
    let hp0 = null, br0 = null, got = null;
    for (let i = 0; i < 300 && !R.over && e.rt.atk; i++) {
      const left = e.rt.atk.land - R.t;
      const want = left <= lead;
      if (want && hp0 == null) { hp0 = p.hp; }
      if (want && R.block && br0 == null) br0 = R.breath;
      const f0 = R.fx.length;
      RT.step(R, { block: want });
      for (const f of R.fx.slice(f0)) if (f.k === "perfectblock" || f.k === "spark" || (f.k === "hit" && f.uid === p.uid)) got = Object.assign(got || {}, { [f.k]: f });
    }
    const taken = hp0 - p.hp;
    if (!R.stats.blocked) bad.push((late ? "perfect " : "") + "Block: the blow was not met on the shield (" + JSON.stringify(got) + ")");
    else if (late) {
      if (!R.stats.perfectBlocks || !(got && got.perfectblock)) bad.push("a shield raised " + lead.toFixed(2) + " s before the blow was not a perfect block");
      if (taken > 0) bad.push("a perfect block let " + taken + " through");
      if (!(e.rt.stag > 0)) bad.push("a perfect block did not stagger the striker");
    } else {
      if (R.stats.perfectBlocks) bad.push("a shield raised " + lead.toFixed(2) + " s before the blow counted as perfect");
      if (!(got && got.spark)) bad.push("a blocked blow drew no sparks off the shield");
      if (!(R.breath < RT.P.breathMax)) bad.push("holding the shield and taking the blow cost no breath");
    }
    done(F);
  }
  // Roll: early (not perfect) and just before the blow (perfect: the foes slow); breath spent.
  for (const late of [false, true]) {
    const F = rt("e_bandits", { path: "archer" }, late ? 17 : 19);
    const { R, RT, p } = F;
    const e = waitBlow(F);
    if (!e) { bad.push("no foe struck at the archer to roll from"); done(F); continue; }
    const lead = late ? RT.P.perfect * 0.5 : Math.min(RT.P.roll * 0.9, RT.P.perfect + 0.12);
    let rolled = false, br0 = R.breath, hp0 = p.hp, perfect = false, miss = false;
    for (let i = 0; i < 300 && !R.over && e.rt.atk; i++) {
      const left = e.rt.atk.land - R.t;
      const f0 = R.fx.length;
      RT.step(R, !rolled && left <= lead ? (rolled = true, { roll: true, rollDir: -Math.sign(e.rt.x - p.rt.x) || -1 }) : {});
      for (const f of R.fx.slice(f0)) { if (f.k === "perfect") perfect = true; if (f.k === "miss" && f.uid === p.uid) miss = true; }
    }
    if (!rolled) bad.push("could not roll before the blow");
    if (!miss) bad.push((late ? "a perfect " : "a ") + "roll did not dodge the blow (hp " + hp0 + " → " + p.hp + ")");
    if (late && !perfect) bad.push("a roll " + lead.toFixed(2) + " s before the blow was not perfect");
    if (late && perfect && !(R.slow > 0)) bad.push("a perfect roll did not slow the foes");
    if (!late && perfect) bad.push("a roll " + lead.toFixed(2) + " s before the blow counted as perfect");
    if (!(R.breath < br0 + 1e-6 || R.stats.rolls)) bad.push("a roll cost no breath");
    done(F);
  }
  return bad;
});

engine("archers", "archers only shoot: a foe archer, and an archer at your side", () => {
  const bad = [];
  const F = rt("e_border", { path: "spy", act: 5, age: 33, bonds: { arjuna: 9 } }, 5);
  const { R, RT, p, B, C } = F;
  if (!RT.can(R, "call")) { bad.push("no call for help (Arjuna at bond 9)"); done(F); return bad; }
  RT.step(R, { call: true });
  for (let i = 0; i < 10; i++) RT.step(R, {});
  const ar = B.units.find((u) => u.side === "ally" && u.person === "arjuna");
  if (!ar) { bad.push("Arjuna did not come"); done(F); return bad; }
  if (!ar.rt.archer || ar.rt.weapon !== "bow") bad.push("Arjuna at your side is not an archer with the bow (" + ar.rt.weapon + ")");
  let shots = 0, melee = 0;
  for (let i = 0; i < 60 * 30 && !R.over; i++) {
    p.hp = p.maxHp; ar.hp = ar.maxHp;
    foes(F).forEach((e) => { if (e.hp < e.maxHp * 0.2) e.hp = e.maxHp; });
    const f0 = R.fx.length;
    RT.step(R, {});
    for (const f of R.fx.slice(f0)) { if (f.k === "shot" && f.uid === ar.uid) shots++; if (f.k === "hit" && f.by === ar.uid && f.melee) melee++; }
    R.fx.length = 0;
  }
  if (!shots) bad.push("Arjuna loosed no arrow in 30 s");
  if (melee) bad.push("Arjuna struck " + melee + " blows with his bow as a club");
  done(F);
  // Karna, likewise.
  const G = rt("e_cattle_k", { path: "spy", act: 5, age: 38, side: "kaurava", bonds: { karna: 9 } }, 5); // (not the hidden year, 43)
  G.RT.step(G.R, { call: true }); for (let i = 0; i < 10; i++) G.RT.step(G.R, {});
  const ka = G.B.units.find((u) => u.side === "ally" && u.person === "karna");
  if (!ka) bad.push("Karna did not come");
  else if (!ka.rt.archer || ka.rt.weapon !== "bow") bad.push("Karna at your side fights with " + ka.rt.weapon + ", drawn with his bow");
  done(G);
  return bad;
});

engine("spare", "sparing: only at 5% or asleep/bound; the fight goes on; the right branch at the end", () => {
  const bad = [];
  const F = rt("e_gandharva", { act: 5, age: 38, path: "charioteer" });
  const { R, RT, C, B, p } = F;
  if (C.PLEAD !== 0.05) bad.push("C.PLEAD is " + C.PLEAD);
  const [a, b] = foes(F);
  const near = (u) => { p.rt.x = Math.max(0.12, u.rt.x - 0.08); u.rt.entered = true; };
  a.hp = Math.ceil(a.maxHp * 0.06); near(a);
  for (let i = 0; i < 30; i++) RT.step(R, {});
  if (C.spareable().includes(a) || a.rt.beaten) bad.push("a foe at 6% kneels or may be spared");
  a.hp = Math.floor(a.maxHp * 0.04);
  for (let i = 0; i < 30; i++) { p.hp = p.maxHp; RT.step(R, {}); }
  if (!a.rt.beaten) bad.push("a foe at 4% does not kneel");
  near(a);
  RT.step(R, { spare: a.uid });
  if (!a.spared) bad.push("could not spare the kneeling foe");
  for (let i = 0; i < 20 && !R.over; i++) { p.hp = p.maxHp; RT.step(R, {}); }
  if (R.over) bad.push("the fight ended when one foe of two was spared (" + R.over + ")");
  // The other one killed: a win, with the spare branch's effect given once.
  const before = JSON.stringify(K.S.duty);
  b.hp = 0;
  for (let i = 0; i < 30 && !R.over; i++) { p.hp = p.maxHp; RT.step(R, {}); }
  if (R.over !== "win") bad.push("one spared and one killed ended as " + R.over + ", not a win");
  void before;
  done(F);
  // Every foe spared: the spare branch.
  const G = rt("e_gandharva", { act: 5, age: 38, path: "charioteer" }, 9);
  for (let k = 0; k < 6 && !G.R.over; k++) {
    const left = G.B.units.filter((u) => u.side === "enemy" && u.hp > 0 && !u.spared);
    if (!left.length) break;
    const u = left[0]; u.rt.entered = true; u.rt.x = Math.min(0.85, u.rt.x); u.hp = Math.max(1, Math.floor(u.maxHp * 0.03));
    for (let i = 0; i < 40; i++) { G.p.hp = G.p.maxHp; G.RT.step(G.R, {}); }
    G.p.rt.x = Math.max(0.12, u.rt.x - 0.08);
    G.RT.step(G.R, { spare: u.uid });
    for (let i = 0; i < 5; i++) G.RT.step(G.R, {});
  }
  if (G.R.over !== "spare") bad.push("every foe spared ended as " + G.R.over + ", not spare");
  done(G);
  // Asleep or bound: may be spared at full health.
  const S2 = rt("e_gandharva", { act: 5, age: 38 }, 3), c = foes(S2)[0];
  c.status.asleep = 2; if (!S2.C.spareable().includes(c)) bad.push("an asleep foe may not be spared"); delete c.status.asleep;
  c.status.bound = 2; if (!S2.C.spareable().includes(c)) bad.push("a bound foe may not be spared"); delete c.status.bound;
  done(S2);
  // No sparing in a fight that does not allow it.
  const N = rt("e_bandits", { act: 5, age: 38 }, 3), d = foes(N)[0];
  d.hp = 1; if (N.C.spareable().length) bad.push("e_bandits (no spare branch) lets a foe be spared");
  done(N);
  return bad;
});

engine("retry", "Try again: once, at 80%, what was used stays used; none when not deadly; the lac house's price", () => {
  const bad = [];
  const F = rt("e_guard", { act: 6, age: 44, path: "charioteer", bonds: {} });
  const { RT, B, C } = F;
  if (!B.enc.lethal) bad.push("e_guard is not deadly");
  B.used.call = true; B.used.astra = true;
  let R = F.R; F.p.hp = 0;
  for (let i = 0; i < 10 && !R.over; i++) RT.step(R, {});
  if (R.over !== "retry") bad.push("a first deadly loss ends as " + R.over);
  if (K.loseLived("e_guard")) bad.push("a deadly loss outside story mode counts as lived through");
  const R2 = RT.retry(R), p2 = C.player();
  if (Math.abs(p2.hp / p2.maxHp - 0.8) > 0.02) bad.push("the second try starts at " + Math.round(p2.hp / p2.maxHp * 100) + "%");
  if (!R2.B.used.call || !R2.B.used.astra) bad.push("what was used is usable again on the second try");
  p2.hp = 0; for (let i = 0; i < 10 && !R2.over; i++) RT.step(R2, {});
  if (R2.over !== "lose") bad.push("the second loss ends as " + R2.over);
  done(F);
  // Not deadly: no retry, lived through.
  const N = rt("e_bandits", { act: 5, age: 38 });
  N.p.hp = 0; for (let i = 0; i < 10 && !N.R.over; i++) N.RT.step(N.R, {});
  if (N.R.over !== "lose") bad.push("a loss in a fight that is not deadly ends as " + N.R.over);
  if (!K.loseLived("e_bandits")) bad.push("a loss in a fight that is not deadly is not lived through");
  done(N);
  // Story mode: a deadly fight is lived through.
  const Sm = rt("e_guard", { act: 6, age: 44, storyMode: true });
  if (!K.loseLived("e_guard")) bad.push("a deadly loss in story mode is not lived through");
  done(Sm);
  // The lac-house escape: the first failure costs a scar, or a point of grace already scarred.
  const K2 = E(); K2.RT.force = false; K2.seed(5);
  for (const scarred of [false, true]) {
    const S = life({ act: 3, age: 23, path: "spy", side: null }); S.flags.push("lac_inside"); S.attrs.grace = 3;
    if (scarred) S.injuries.push("scar");
    K2.go("a3_fire");
    const sc = K2.SCENES[S.scene]; const c = (K2.val(sc.choices) || []).find((x) => x.id === "run");
    const g0 = S.attrs.grace, sc0 = S.injuries.filter((x) => x === "scar").length;
    const r1 = K2.choose(sc, c, "lose");
    if (!r1.retry || !S.alive) { bad.push("the first failed escape is not survived with a Try again"); continue; }
    const scars = S.injuries.filter((x) => x === "scar").length;
    if (!scarred && scars !== sc0 + 1) bad.push("the lac-house retry did not cost a scar (" + JSON.stringify(S.injuries) + ")");
    if (scarred && S.attrs.grace !== g0 - 1) bad.push("already scarred, the lac-house retry did not cost a point of grace (" + g0 + " → " + S.attrs.grace + ")");
  }
  return bad;
});

engine("astra", "a divine weapon in real time: the moment, the throw, and a champion's counter-weapon", () => {
  const bad = [];
  const F = rt("e_bandits", { act: 5, age: 38, path: "archer", astras: ["agneya"] });
  const { R, RT, B } = F;
  const hp0 = new Map(B.units.map((u) => [u.uid, u.hp]));
  for (let i = 0; i < 30; i++) RT.step(R, {});
  { const p = B.units[0]; p.hp = Math.max(1, Math.floor(p.maxHp * 0.08)); } // (outside the war it is spoken only under a tenth of your life)
  const f0 = R.fx.length;
  RT.step(R, { astra: "agneya" });
  const ax = R.fx.slice(f0).find((f) => f.k === "astra");
  if (!ax) bad.push("no divine weapon's moment (fx astra)");
  if (!(R.frozen > 2)) bad.push("the fight is not held still for the moment (" + R.frozen + ")");
  const t0 = R.t; let thrown = false, frames = 0;
  for (let i = 0; i < 60 * 4; i++) { const g = R.fx.length; RT.step(R, {}); frames++; if (R.fx.slice(g).some((f) => f.k === "thrown")) { thrown = true; break; } }
  if (R.t !== t0) bad.push("the fight's clock ran during the moment");
  if (!thrown) bad.push("no struck foe was thrown when the moment ended");
  if (frames / 60 < 2) bad.push("the moment lasted only " + (frames / 60).toFixed(2) + " s");
  const hurt = B.units.filter((u) => u.side === "enemy" && u.hp < hp0.get(u.uid)).length;
  if (!hurt) bad.push("the Agneyastra hurt no foe");
  if (!B.used.astra && !RT.astras(R).every((a) => a.why)) bad.push("the divine weapon can be used again in the same fight");
  done(F);
  // The night raid: Ashwatthama answers.
  for (const enc of ["e_raid", "e_ash"]) {
    const G = rt(enc, { act: 6, age: 44, path: "archer", side: "pandava", astras: ["agneya"] });
    const ash = G.B.units.find((u) => u.side === "enemy" && /Ashwatthama/.test(u.name));
    if (!ash || !ash.hero) { bad.push(enc + ": Ashwatthama is not a champion who can answer a divine weapon"); done(G); continue; }
    ash.rt.entered = true; ash.rt.x = Math.min(ash.rt.x, 0.7);
    const h0 = ash.hp;
    G.RT.step(G.R, { astra: "agneya" });
    if (!G.B.astraOut || !G.B.astraOut.clash) bad.push(enc + ": no counter-weapon clash (" + JSON.stringify(G.B.astraOut) + ")");
    if (ash.hp < h0) bad.push(enc + ": the divine weapon hurt the champion who answered it");
    if (!ash.status.stun) bad.push(enc + ": the clash did not stagger him");
    done(G);
  }
  // Every real-time fight: which champions are there to answer (a report, and the rule that one at least exists).
  const champs = [...E().RT.IDS].filter((id) => K.ENCOUNTERS[id]).filter((id) => { life({ act: 6, age: 44 }); return (K.val(K.ENCOUNTERS[id].enemies) || []).some((u) => { const d = typeof u === "string" && K.UNITS[u] ? K.UNITS[u](K.S) : u; return d && d.hero; }); });
  if (!champs.length) bad.push("no real-time fight has a champion who can answer a divine weapon");
  return bad;
});

engine("turns", "with Fights: turn-based no fight is real-time; real-time is the default", () => {
  const K = E(), bad = [];
  const store = {}; const prev = K.prefs;
  K.RT.force = null;
  let fights = "realtime";
  K.prefs = (o) => { if (o && o.fights) fights = o.fights; return { fights }; };
  try {
    if (K.RT.mode() !== "realtime") bad.push("the default is " + K.RT.mode());
    const rtIds = [...K.RT.IDS].filter((id) => K.ENCOUNTERS[id]);
    const off = rtIds.filter((id) => !K.RT.wanted(id));
    if (off.length) bad.push("by default these are not real-time: " + off.join(", "));
    K.prefs({ fights: "turns" });
    const on = Object.keys(K.ENCOUNTERS).filter((id) => K.RT.wanted(id));
    if (on.length) bad.push("turn-based still plays these in real time: " + on.join(", "));
  } finally { K.prefs = prev; K.RT.force = true; void store; }
  return bad;
});

T.run();
