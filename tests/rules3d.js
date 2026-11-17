/* The rules of the 3D fights (js/ui/battle/sim.js), checked in Node with no page: the same seed plays the same fight;
   the line of soldiers is raised where it should be and nowhere else, fights its own men, never decides a fight and
   is gone from the roll before the story reads it; the dream overwhelms and still ends; the close views' way of
   moving keeps your face to the foe; a lost deadly fight is offered once more.
     node tests/rules3d.js            (exit 1 on a failure) */
"use strict";
const boot = require("./lib/boot.js");
let fails = 0, n = 0;
const ok = (cond, what) => { n++; if (cond) console.log("ok   " + what); else { fails++; console.log("FAIL " + what); } };

function life(K, o) {
  const S = K.newLife(); o = o || {};
  Object.assign(S, { name: "Test", origin: "hastinapura", pronoun: "he", temperament: "bold", heirloom: "bow", path: o.path === undefined ? "mace" : o.path, side: o.side === undefined ? "pandava" : o.side });
  S.act = o.act || 6; S.age = o.age || 44; S.attrs = { might: 4, aim: 4, grace: 4, wisdom: 4, command: 4 };
  S.skills = { archery: 0, mace: 5, chariot: 0, statecraft: 0, healing: 0, stealth: 0, lore: 0 }; S.items = { herbs: 2 }; if (S.act >= 6) S.flags.push("role_front");
  K.S = S; return S;
}
const fresh = (seed) => boot({ seed });
function play(K, id, o) { // a whole fight by the bot; returns the last state
  o = o || {}; const C = K.Combat, R3 = K.RT3;
  let B = C.start(id, null), R = R3.begin(B, { noLine: o.noLine });
  let guard = 0; while (!R.over && guard++ < 60 * 200) { if (o.each) o.each(R, B); R3.step(R, o.act ? o.act(R) : R3.bot(R, {})); }
  return { R, B, C, R3 };
}

// 1. The same seed plays the same fight.
{
  const run = () => { const K = fresh(31); life(K); const { R } = play(K, "e_day1"); const out = [R.over, R.t.toFixed(2), Math.round(K.Combat.player() ? K.Combat.player().hp : -1)].join("/"); K.Combat.end(); return out; };
  const a = run(), b = run();
  ok(a === b, "the same seed plays the same fight (" + a + ")");
}

// 2. Where the line is raised.
{
  const K = fresh(5), C = K.Combat, R3 = K.RT3;
  const lineOf = (id, o) => { life(K, o); const B = C.start(id, null), R = R3.begin(B, {}); const L = B.units.filter((u) => u.line); const r = { R, mine: L.filter((u) => u.side === "ally").length, theirs: L.filter((u) => u.side === "enemy").length }; R3.accept && 0; C.settle("flee"); C.end(); return r; };
  const war = lineOf("e_day1");
  ok(war.mine === 4 && war.theirs === 4, "a war battle has a line: four soldiers of each host (" + war.mine + "/" + war.theirs + ")");
  const raid = lineOf("e_cattle", { act: 5, age: 36, side: null });
  ok(raid.mine === 2 && raid.theirs === 2, "a raid has a smaller one: two of each (" + raid.mine + "/" + raid.theirs + ")");
  for (const [id, why, o] of [["cross_e_duel", "a duel"], ["e_spar", "sparring", { act: 2, age: 18, side: null }], ["fs_sk_range", "a special kind of fight"], ["e_last_stand", "the boy in the wheel"], ["e_ugra", "a fair's wrestling", { act: 1, age: 13, side: null, path: null }], ["e_raid", "one man in the sleeping camp"]]) {
    const r = lineOf(id, o); ok(!r.R.line && r.mine + r.theirs === 0, why + " has no line (" + id + ")");
  }
}

// 3. The line fights its own men, takes no part in the turn-taking against you, and never decides the fight.
{
  const K = fresh(9); life(K);
  const C = K.Combat, R3 = K.RT3, B = C.start("e_day1", null), R = R3.begin(B, {});
  const me = C.player().uid;
  let own = 0, onMe = 0, maxAtOnce = 0;
  for (let i = 0; i < 60 * 12 && !R.over; i++) {
    R3.step(R, { mx: 0, mz: 1 }); // you walk away from it all
    for (const u of B.units) if (u.line && u.side === "enemy" && u.hp > 0 && u.g && u.g.atk) { const t = B.units.find((x) => x.uid === u.g.atk.on); if (t && t.line) own++; else if (t && t.uid === me) onMe++; }
    maxAtOnce = Math.max(maxAtOnce, R3.attacking(R));
  }
  ok(own > 0, "soldiers of the line strike at the men of the other line (" + own + " steps of wind-up)");
  ok(onMe === 0 || own > onMe * 4, "and leave you alone while their own men stand (" + onMe + " steps at you)");
  ok(maxAtOnce <= 2, "no more than two blows are wound up at you at once (" + maxAtOnce + ")");
  ok(R3.count(R) === B.units.filter((u) => u.side === "enemy" && !u.line && u.hp > 0).reduce((s, u) => s + (u.plural ? Math.max(1, Math.ceil(u.g.bodies * u.hp / u.maxHp)) : 1), 0), "the count of foes left is of the named only");
  // The named fall: the fight is won though soldiers of the other line still stand.
  for (const u of B.units) if (u.side === "enemy" && !u.line) u.hp = 0;
  const standing = B.units.filter((u) => u.line && u.side === "enemy" && u.hp > 0).length;
  for (let i = 0; i < 4 && !R.over; i++) R3.step(R, {});
  ok(R.over === "win" && standing > 0, "when the named fall the fight is won, with " + standing + " of their line still standing");
  ok(!B.units.some((u) => u.line) && R.lineOff && R.lineOff.length >= 8, "the line is off the roll when the fight is settled (" + (R.lineOff || []).length + " set aside)");
  const done = C.end();
  ok(done && done.over === "win" && !done.units.some((u) => u.line), "the story reads a fight with only its own units");
}

// 4. With no man of your line left, a soldier turns on you.
{
  const K = fresh(12); life(K);
  const C = K.Combat, R3 = K.RT3, B = C.start("e_day1", null), R = R3.begin(B, {}), me = C.player().uid;
  for (const u of B.units) if (u.line && u.side === "ally") u.hp = 0;
  R.line.more = [0, 0]; // (and none come on)
  let onMe = 0;
  for (let i = 0; i < 60 * 14 && !R.over; i++) { R3.step(R, {}); const p = C.player(); p.hp = p.maxHp; for (const u of B.units) if (u.line && u.side === "enemy" && u.hp > 0 && u.g && u.g.tgt === me) onMe++; }
  ok(onMe > 0, "with your line down, their soldiers turn on you and yours");
  C.settle("flee"); C.end();
}

// 5. The dream overwhelms, and ends.
{
  const K = fresh(4); life(K, { act: 1, age: 6, side: null, path: null });
  let most = 0, sent = 0;
  const a = play(K, "e_dream", { each: (R, B) => { most = Math.max(most, B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.g && u.g.entered).length); sent = R.line ? R.line.sent[1] : 0; } });
  ok(a.R.line && a.R.line.dream, "the dream has its own line");
  ok(a.R.over === "lose" || a.R.over === "win", "the dream ends without a second try (" + a.R.over + " at " + a.R.t.toFixed(0) + " s)");
  ok(sent >= 2 && most >= 5, "more come out of the dust the longer you stand (" + sent + " sent, " + most + " on the field at once)");
  K.Combat.end();
  // Holding to the end is possible: one who cannot be hurt is still standing when it breaks.
  const K2 = fresh(4); life(K2, { act: 1, age: 6, side: null, path: null });
  const b = play(K2, "e_dream", { each: () => { const p = K2.Combat.player(); p.hp = p.maxHp; } });
  ok(b.R.over === "win" && Math.abs(b.R.t - K2.RT3.LINE.dreamSecs) < 1.5, "one who is still standing at " + K2.RT3.LINE.dreamSecs + " s has held (" + b.R.over + " at " + b.R.t.toFixed(1) + " s)");
  const done = K2.Combat.end(); ok(done && done.over === "win", "and the story is told the dream broke");
}

// 6. The close views: stepping sideways keeps your face to the one you fight.
{
  const K = fresh(7); life(K);
  const C = K.Combat, R3 = K.RT3, B = C.start("cross_e_duel", null), R = R3.begin(B, {}), p = C.player();
  const foe = B.units.find((u) => u.side === "enemy");
  const off = (strafe) => { let worst = 0; for (let i = 0; i < 90; i++) { p.hp = p.maxHp; R3.step(R, { mx: 1, mz: 0, strafe, look: 0 }); if (i > 30 && foe.hp > 0) { const want = Math.atan2(foe.g.x - p.g.x, foe.g.z - p.g.z); let d = want - p.g.a; d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); worst = Math.max(worst, d); } } return worst; };
  const plain = off(false), close = off(true);
  ok(close < 0.5 && plain > 0.7, "moving sideways in a close view you still face your foe (off by " + close.toFixed(2) + " rad; from above you turn with your feet, " + plain.toFixed(2) + ")");
  C.settle("flee"); C.end();
}

// 7. A deadly fight lost is offered once more, with a fresh line; a second loss stands.
{
  const K = fresh(3); life(K);
  const C = K.Combat, R3 = K.RT3; let B = C.start("e_day1", null), R = R3.begin(B, {});
  C.player().hp = 0; for (let i = 0; i < 3 && !R.over; i++) R3.step(R, {});
  ok(R.over === "retry", "a deadly fight lost is offered once more");
  R = R3.retry(R); B = R.B;
  ok(!R.over && R.tries === 1 && B.units.filter((u) => u.line).length === 8, "the second try starts with the line whole");
  C.player().hp = 0; for (let i = 0; i < 3 && !R.over; i++) R3.step(R, {});
  ok(R.over === "lose", "a second loss stands");
  C.end();
}

// 8. Holding fights still count their time, line or no line.
{
  const K = fresh(2); life(K);
  const C = K.Combat, R3 = K.RT3, B = C.start("hold_karna", null), R = R3.begin(B, {});
  const t0 = R3.timeLeft(R);
  ok(t0 > 20 && t0 < 120, "a holding fight shows its time (" + Math.round(t0) + " s)");
  C.settle("flee"); C.end();
}

// 9. The six orders: how those beside you stand under each.
{
  const K = fresh(4); life(K);
  const C = K.Combat, R3 = K.RT3, B = C.start("e_iravan", null), R = R3.begin(B, {}), p = C.player();
  const mine = () => B.units.filter((u) => u.side === "ally" && u.hp > 0 && !u.line && u.g), dist = (a, b) => Math.hypot(a.g.x - b.g.x, a.g.z - b.g.z);
  const run = (orders, secs) => { R3.step(R, { orders }); for (let i = 0; i < 60 * secs && !R.over; i++) { p.hp = p.maxHp; for (const u of mine()) u.hp = u.maxHp; R3.step(R, {}); } };
  ok(mine().length >= 2, "the fight beside Iravan has comrades to order (" + mine().length + ")");
  run({ friend: "hold", soldiers: "stay", form: "follow" }, 5);
  ok(mine().every((u) => dist(u, p) < 4.5), "Follow me: they are at your heels (" + mine().map((u) => dist(u, p).toFixed(1)).join(", ") + " m)");
  run({ friend: "guard", soldiers: "defend", form: "wall" }, 5);
  { const at = R.orders.at, far = mine().map((u) => Math.hypot(u.g.x - at[0], u.g.z - at[1]));
    ok(at && far.every((d) => d < 4.2), "Stick together and defend: a wall where the order was given (" + far.map((d) => d.toFixed(1)).join(", ") + " m from it)"); }
  run({ friend: "guard", soldiers: "defend", form: "line" }, 6);
  { const a = mine(); ok(a.length < 2 || dist(a[0], a[1]) > 2.4, "Spread across and defend: they stand apart (" + (a.length > 1 ? dist(a[0], a[1]).toFixed(1) : "-") + " m)"); }
  run({ friend: "allout", soldiers: "allout", form: "tight" }, 4);
  { const foe = B.units.find((u) => u.uid === R.lock && u.hp > 0); const a = mine().filter((u) => !u.g.archer);
    ok(!foe || a.every((u) => dist(u, foe) < 6.5), "Stick together and attack: all on the foe you face (" + (foe ? a.map((u) => dist(u, foe).toFixed(1)).join(", ") : "none left") + " m)"); }
  run({ friend: "allout", soldiers: "allout", form: "spread" }, 4);
  ok(R.orders.form === "spread" && !R.over, "Spread across and attack is taken, and the fight goes on");
  run({ friend: "guard", soldiers: "defend", form: null }, 2);
  ok(R.orders.form === null, "Guard me clears the stand");
  C.settle("flee"); C.end();
}

// 10. Divine weapons: a poorly spoken mantra lands softer, common soldiers break and run (and count as beaten), a broken
//     mantra rests the weapon, and a champion's counter is a contest.
{
  const cast = (o) => { const K = fresh(9); const S = life(K, { path: "archer" }); S.astras = [{ id: "agneya", from: "test" }]; S.tapas = 30;
    const C = K.Combat, R3 = K.RT3, B = C.start("e_day1", null), R = R3.begin(B, {}), p = C.player();
    for (let i = 0; i < 120; i++) { p.hp = p.maxHp; R3.step(R, {}); } p.hp = Math.round(p.maxHp * 0.4);
    const foes = () => B.units.filter((u) => u.side === "enemy" && u.g);
    if (o.hero) foes().find((u) => u.hp > 0).hero = true;
    const before = new Map(foes().map((u) => [u.uid, u.hp])), ready = R3.astras(R).some((x) => x.id === "agneya" && !x.why);
    R3.step(R, o.act); const fx = R.fx.slice(); let ended = null, fled = 0;
    for (let i = 0; i < 60 * 7 && !R.over; i++) { p.hp = Math.max(p.hp, 60); R3.step(R, i < 200 && o.hold ? o.hold : {}); for (const e of R.fx) { if (e.k === "clashEnd") ended = e; if (e.k === "fled") fled++; } R.fx.length = 0; }
    const out = { ready, fx, ended, fled, lost: foes().reduce((n, u) => n + Math.max(0, before.get(u.uid) - Math.max(0, u.hp)) * (u.fled ? 0 : 1), 0), a: fx.find((e) => e.k === "astra"), rest: R3.astras(R).find((x) => x.id === "agneya"), uses: K.astraLeft ? K.astraLeft("agneya") : null, hero: foes().find((u) => u.hero), before };
    try { C.settle("flee"); C.end(); } catch (e) {} return out; };
  const full = cast({ act: { astra: "agneya" } }), soft = cast({ act: { astra: "agneya", astraQ: 0.5 } });
  ok(full.ready && full.a && full.a.struck.length > 0, "A mantra joined cleanly lands as it always did");
  const sum = (x) => Object.values(x.a.dealt).reduce((n, v) => n + v, 0);
  ok(soft.a && sum(soft) < sum(full) && soft.a.q === 0.5, "A mantra poorly joined lands softer (" + sum(soft) + " against " + sum(full) + ")");
  ok(full.a.fled.length >= 1 && full.a.fled.length <= 2 && full.fled >= 1 && full.fled <= full.a.fled.length, "Common soldiers break and run, no more than two, and leave the fight (" + full.fled + " of " + full.a.fled.length + ")");
  const broke = cast({ act: { astraBreak: "agneya" } });
  ok(!broke.a && broke.fx.some((e) => e.k === "mantraBroke") && broke.uses === full.uses + 1, "A figure not joined in time breaks the mantra and spends no use of it");
  const draw = cast({ act: { astra: "agneya" }, hero: true }), won = cast({ act: { astra: "agneya" }, hero: true, hold: { clashWin: true } });
  ok(draw.a && draw.a.out.clash && draw.ended && !draw.ended.won, "A champion answers: left alone, the two weapons burn out");
  ok(won.ended && won.ended.won && won.ended.n > 0, "Hold your mantra the longer and a part of your weapon comes through (" + (won.ended && won.ended.n) + ")");
}

// 11. Their plan: each of the three turns the fight once and hands you a task; and the men of your line obey an order.
{
  const run = (plan, bot, seed) => { const K = fresh(seed || 11); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("e_day1", null), R = R3.begin(B, { plan }), ev = [];
    for (let i = 0; i < 60 * 120 && !R.over; i++) { R3.step(R, bot ? R3.bot(R) : (C.player().hp = C.player().maxHp, {})); for (const e of R.fx) { if (/^(turn|taskDone|taskFail|rout|duel|duelWon|duelNo)$/.test(e.k)) ev.push(e.k + (e.kind ? ":" + e.kind : "")); if (e.k === "jostle" && e.uid === C.player().uid) ev.push("ridden"); } R.fx.length = 0; if (!bot && ev.some((x) => /^task|duelNo/.test(x))) break; }
    const out = { R, ev, flags: K.S.flags.slice() }; try { C.settle("flee"); C.end(); } catch (e) {} return out; };
  // (Whether the bot does a task inside its count is a matter of the fight; that the task, done, does what it should is the
  // rule checked here. So the first of three fights in which it is done is the one looked at.)
  const firstOf = (plan, f) => { let r0 = null; for (const sd of [11, 12, 13]) { const r = run(plan, true, sd); r0 = r0 || r; if (f(r)) return r; } return r0; };
  const done = (plan, k) => firstOf(plan, (r) => r.ev.includes("taskDone:" + k));
  // (And the bot takes a challenge only with more than half its health: the same goes for the duel.)
  const wall = done("wall", "capture"), pin = done("pincer", "sarathi"), ch = firstOf("charge", (r) => r.ev.includes("duel"));
  ok(wall.R.plan && wall.ev.includes("turn:capture") && wall.ev.includes("taskDone:capture") && wall.flags.includes("took_vikarna"), "The wall, broken, leaves a man of name cut off from his men: bring him down inside the count and he is taken (" + wall.flags.filter((f) => /^took_/.test(f)).join(",") + ")");
  ok(pin.ev.includes("turn:sarathi") && pin.ev.includes("taskDone:sarathi"), "The pincer shut, his wheel-guards are away: reach his charioteer and the car stands still");
  ok(ch.ev.includes("turn:duel") && ch.ev.includes("duel"), "The champion charges and calls you out: taken, it is single combat");
  const idle = run("wall", false), idle2 = run("pincer", false), idle3 = run("charge", false);
  ok(idle.ev.includes("taskFail:capture") && idle.flags.includes("war_setback") && !idle.flags.some((f) => /^took_/.test(f)) && !idle.R.over, "The man not taken: his men bring him off, they rally, and it costs you the next fight's start");
  ok(idle2.ev.includes("taskFail:sarathi"), "The charioteer not reached: his car rides your man down");
  ok(idle3.ev.includes("duelNo"), "The challenge left unanswered is a refusal");
  // (17 November: a car's team is part of it now, and reaches you five paces before its deck does)
  { const r = [11, 12, 13].map((sd) => run("charge", false, sd)); ok(r.every((x) => x.ev.includes("turn:duel") || x.ev.includes("duelNo")) && !r.some((x) => x.ev.includes("ridden")), "Their champion's charge, in a car, is pulled up short of you: it is a challenge, not a riding-down (three fights, standing still)"); }
  { // Turning and stepping are two things: a turn turns you where you stand; with a foe near, a step to the side is a side-step, slower than going ahead
    const K = fresh(23); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("e_day1", null), R = R3.begin(B, { noPlan: true }), p = C.player(); p.maxHp = p.hp = 99999;
    for (const u of B.units) if (u.side === "enemy" && u.g) { u.g.x = 50; u.g.z = -50; u.g.cool = 99; u.g.speed = 0; }
    const a0 = p.g.a, x0 = p.g.x, z0 = p.g.z; for (let i = 0; i < 30; i++) R3.step(R, { turn: 1 });
    const turned = Math.atan2(Math.sin(p.g.a - a0), Math.cos(p.g.a - a0)), stayed = Math.hypot(p.g.x - x0, p.g.z - z0);
    const foe = B.units.find((u) => u.side === "enemy" && u.g && !u.line && u.hp > 0); foe.g.x = p.g.x; foe.g.z = p.g.z - 3; foe.g.a = 0; R.faceHold = 0;
    for (let i = 0; i < 30; i++) R3.step(R, {}); const face = p.g.a, sx = p.g.x, sz = p.g.z;
    for (let i = 0; i < 30; i++) { foe.g.x = p.g.x; foe.g.z = p.g.z - 3; R3.step(R, { mx: 1, mz: 0 }); }
    const side = Math.hypot(p.g.x - sx, p.g.z - sz), kept = Math.abs(Math.atan2(Math.sin(p.g.a - face), Math.cos(p.g.a - face)));
    for (const u of B.units) if (u.side === "enemy" && u.g) { u.g.x = 50; u.g.z = -50; } const fx = p.g.x, fz = p.g.z; for (let i = 0; i < 30; i++) R3.step(R, { mx: Math.sin(p.g.a), mz: Math.cos(p.g.a) });
    const ahead = Math.hypot(p.g.x - fx, p.g.z - fz);
    ok(turned > 1.2 && stayed < 0.01 && kept < 0.2 && side > 0.3 && side < ahead * 0.9, "Turn and step are two things: a turn left turns you where you stand (" + (turned * 57.3).toFixed(0) + " degrees, moved " + stayed.toFixed(2) + "), a step left with a foe near keeps your face to him (" + (kept * 57.3).toFixed(0) + " degrees) and goes " + side.toFixed(2) + " to " + ahead.toFixed(2) + " ahead");
    try { C.settle("flee"); C.end(); } catch (e) {} }
  { // A host down to two-fifths of its spirit is shaken: said once, undone if they rally, and their men come on slower
    const swings = (low, seed) => { const K = fresh(seed); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("e_day1", null), R = R3.begin(B, { plan: "wall" }), p = C.player(); p.maxHp = p.hp = 99999; let n = 0, said = 0, back = 0, first = null;
      const fx = () => { for (const e of R.fx) { if (e.k === "shaken") said++; if (e.k === "rallied") back++; } R.fx.length = 0; };
      if (low) { R3.spirit(R, -50); const early = !!R.shaken; R3.spirit(R, -15); fx(); const was = !!R.shaken; R3.spirit(R, 25); fx(); first = { early, was, now: !!R.shaken, said, back }; R3.spirit(R, -25); }
      for (let i = 0; i < 60 * 40 && !R.over; i++) { p.hp = p.maxHp; for (const u of B.units) if (u.side !== "enemy" && u.hp > 0) u.hp = u.maxHp; if (low && R.morale.theirs > 35) R3.spirit(R, 35 - R.morale.theirs);
        R3.step(R, {}); for (const e of R.fx) if (e.k === "swing" && B.units.some((u) => u.uid === e.uid && u.side === "enemy")) n++; R.fx.length = 0; }
      const out = { n, first }; try { C.settle("flee"); C.end(); } catch (e) {} return out; };
    // (blows struck in forty seconds are counted over three fights each way: one fight's count moves by a tenth with where a car happens to stand)
    const a = { n: 0 }, b = { n: 0, first: null }; for (const sd of [17, 18, 19]) { a.n += swings(false, sd).n; const r = swings(true, sd); b.n += r.n; b.first = b.first || r.first; } const f = b.first;
    ok(!f.early && f.was && !f.now && f.said === 1 && f.back === 1 && b.n < a.n * 0.92, "A host at two-fifths of its spirit is shaken: said once, undone when they rally, and their men strike less often (" + b.n + " blows in three fights of forty seconds against " + a.n + ")"); }
  const bh = (bot, id, seed) => { const K = fresh(seed || 11); life(K); const C = K.Combat, R3 = K.RT3, B = C.start(id || "bh_line9", null), R = R3.begin(B, {}), ev = [], p = C.player();
    if (bot) { p.maxHp = Math.round(p.maxHp * 1.7); p.hp = p.maxHp; }   // (these checks are of how his way is barred, not of whether this thin life outlasts him: the fight bands watch that)
    for (let i = 0; i < 60 * 150 && !R.over; i++) { if (!bot) p.hp = p.maxHp; R3.step(R, bot ? R3.bot(R) : {}); for (const e of R.fx) if (/^(lineFalls|turn|defended|checked|barred|crossed)$/.test(e.k)) ev.push(e.k); R.fx.length = 0; }
    const out = { over: R.over, ev, t: R.t, plan: R.plan, bh: B.units.find((u) => u.person === "bhishma") }; try { C.end(); } catch (e) {} return out; };
  const stood = bh(false), fought = bh(true);
  ok(stood.ev.filter((x) => x === "lineFalls").length === 3 && stood.ev.includes("turn") && stood.ev.includes("crossed") && stood.over !== "win", "Under Bhishma the line gives way three times; left alone, his car crosses and the line is broken");
  // (There are two ways to bar it: three checks, or his charioteer reached while his wheel-guards are off the wheels. Which a
  // given fight takes depends on where his guards are when he turns, so three fights are fought: all are held with him
  // unbeaten, and at least one is held by the checks.)
  { const runs = [fought, bh(true, null, 12), bh(true, null, 13)], byChecks = runs.filter((r) => r.ev.includes("defended") && r.ev.filter((x) => x === "checked").length === 3);
    ok(runs.every((r) => r.ev.includes("barred") && r.over === "win" && r.bh && r.bh.hp > 0) && byChecks.length >= 1, "Bar his way: the first blow he turns aside, three checks and he turns his car away, unbeaten (" + byChecks.length + " of 3 held by the checks, the rest at his charioteer)"); }
  for (const id of ["oath_king_hold", "hold_bhima", "oath_arjuna_12"]) { const lost = bh(false, id), won = bh(true, id);
    ok(lost.plan && lost.plan.kind === "bhishma" && lost.ev.filter((x) => x === "lineFalls").length === 3 && lost.ev.includes("crossed") && lost.over !== "win" && won.ev.includes("barred") && won.over === "win", id + ": the same shape, the line falls three times, then bar " + (lost.plan && lost.plan.who) + "'s way or he is through"); }
  ok(bh(false, "oath_arjuna_12").plan.noSarathi, "No one lays a hand on Arjuna's charioteer");
  { const K = fresh(7); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("new_banner", null), R = R3.begin(B, {}), p = C.player(); let sway = 0, down = 0;
    for (let i = 0; i < 60 * 4; i++) R3.step(R, {}); const v0 = R.ours && R.ours.v;
    for (let i = 0; i < 60 * 120 && !R.over; i++) { if (i % 90 === 0) { const a = B.units.find((u) => u.side === "ally" && u.hp > 0); if (a) a.hp = 0; else { p.hp = p.maxHp; if (R.ours) R.ours.hp = p.hp; p.hp -= p.maxHp * 0.2; } } R3.step(R, {}); for (const e of R.fx) { if (e.k === "bannerSways") sway++; if (e.k === "bannerDown") down++; } R.fx.length = 0; }
    ok(v0 > 85 && sway >= 2 && down === 1 && R.over === "lose", "The banner-bearer: the banner's bar falls as your men fall, and when it is gone the fight is lost"); try { C.end(); } catch (e) {} }
  // The steps of Abhimanyu's day
  { const run = (hit) => { const K = fresh(9); life(K); K.S.side = "pandava"; const C = K.Combat, R3 = K.RT3, B = C.start("e_last_stand", null), R = R3.begin(B, {}), p = C.player(); p.maxHp = p.hp = 99999; const ev = []; let who = null;
      for (let i = 0; i < 60 * 30 && !R.over; i++) { R3.step(R, {}); if (R.step3 && !who) { who = B.units.find((u) => u.uid === R.step3.uid).person; if (hit) R.step3.hit = true; } for (const e of R.fx) ev.push(e.k); R.fx.length = 0; if (who && !R.step3) break; }
      try { C.end(); } catch (e) {} return { who, ev, held: R.held || 0 }; };
    const a = run(false), b = run(true);
    ok(a.who === "karna" && a.ev.includes("stepOpen") && !a.ev.includes("stepHeld") && a.held === 0 && b.ev.includes("stepHeld") && b.held === 1, "The heart of the wheel: Karna is named before he cuts the bow, and a blow on him in time is counted to you"); }
  { const run = (ans) => { const K = fresh(9); life(K); K.S.side = "kaurava"; const C = K.Combat, R3 = K.RT3, B = C.start("e_ring", null), R = R3.begin(B, {}), p = C.player(); p.maxHp = p.hp = 99999; let how = null, asked = false;
      for (let i = 0; i < 60 * 60 && !R.over && !how; i++) { const act = {}; if (R.offer && R.offer.kind === "order") { asked = true; act.duel = ans; } R3.step(R, act); for (const e of R.fx) if (e.k === "orderDone") how = e.how; R.fx.length = 0; }
      try { C.end(); } catch (e) {} return { asked, how }; };
    const no = run("no"), yes = run("yes");
    ok(no.asked && no.how === "refuse" && yes.asked && yes.how === "miss", "Your stretch of the ring: Drona's order reaches you in the fight; refused it is refused, and taken but not struck it is a miss"); }
  { const K = fresh(7); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("new_over_bhima", null), R = R3.begin(B, {});
    ok(R.plan && R.plan.kind === "charge" && B.enc.fallen === "bhima", "Over Bhima: their champion charges (the plan is fixed), and Bhima lies behind you"); try { C.end(); } catch (e) {} }
  const K = fresh(5); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("e_day1", null), R = R3.begin(B, { noPlan: true }), p = C.player();
  const lineMen = () => B.units.filter((u) => u.side === "ally" && u.line && u.hp > 0 && u.g), far = () => Math.max(...lineMen().map((u) => Math.hypot(u.g.x - p.g.x, u.g.z - p.g.z)));
  const hold = (secs, act) => { R3.step(R, act || {}); for (let i = 0; i < 60 * secs && !R.over; i++) { p.hp = p.maxHp; for (const u of B.units) if (u.side !== "enemy") u.hp = u.maxHp; R3.step(R, {}); } };
  hold(3); const before = far(); hold(6, { orders: { friend: "guard", soldiers: "defend", form: "follow" } }); const after = far();
  ok(lineMen().length >= 2 && after < 4.5 && before > after, "Follow me brings the men of your line to your heels (" + before.toFixed(1) + " m to " + after.toFixed(1) + " m)");
  C.settle("flee"); C.end();
}

// 12. The wheel in the earth (day 17): the story's cards inside the fight, on both sides.
{
  // One fight to its end. ans(i, R): the answer to card i. each(R, B, p): once a step, before it.
  const run = (id, side, ans, each) => { const K = fresh(13); life(K, { side }); const C = K.Combat, R3 = K.RT3, B = C.start(id, null), R = R3.begin(B, {}), p = C.player(); p.maxHp = p.hp = 99999;
    const got = { asked: [], done: {}, taken: [], end: null, hitEarly: false, t: {} }; const k = B.units.find((u) => u.person === "karna");
    for (let i = 0; i < 60 * 90 && !R.over; i++) { const act = (each && each(R, B, p, k, got)) || {};
      if (R.offer && R.offer.kind === "order") { if (!got.asked.includes(R.offer.i)) { got.asked.push(R.offer.i); got.t[R.offer.i] = R.t; } act.duel = ans(R.offer.i, R); }
      R3.step(R, act);
      for (const e of R.fx) { if (e.k === "orderDone") got.done[e.i] = e.how; if (e.k === "orderTaken") got.taken.push(e.i); if (e.k === "wheelEnd") got.end = { stand: !!e.stand, t: R.t }; }
      R.fx.length = 0; }
    const out = { R, B, got, k, over: R.over, karnaHp: k ? k.hp / k.maxHp : 0, apart: k && k.g ? !!k.g.apart : null, wheel: R.wheel }; try { C.end(); } catch (e) {} return out; };
  // Pandava: he is set apart behind his guards; the card comes; refused, he is never touched.
  { const r = run("kw_e_close", "pandava", () => "no");
    ok(r.wheel && r.k && r.k.still && r.got.asked.length === 1 && r.got.done[0] === "refuse" && r.karnaHp === 1 && r.apart === true, "Karna's wheel, Pandava: the card comes in the fight; refused, no blow is ever aimed at him (asked at " + (r.got.t[0] || 0).toFixed(1) + " s)");
    ok(r.over === "win" && r.got.end && !r.got.end.stand, "Karna's wheel, Pandava: when the count is out the arrow comes, and then the fight is over (" + r.over + ")"); }
  // Taken: he can be struck, and one blow is the whole of it.
  { const r = run("kw_e_close", "pandava", () => "yes", (R, B, p, k) => { if (R.order && R.order.state === "doing" && k && k.g) { p.g.x = k.g.x; p.g.z = k.g.z + 1.1; p.g.a = Math.PI; return { strike: true }; } return null; });
    ok(r.got.taken.includes(0) && r.got.done[0] === "obey" && r.karnaHp < 1 && r.karnaHp > 0.5 && r.apart === true, "Karna's wheel, Pandava: taken, a blow of yours lands on him, once, and he is set apart again (he has " + Math.round(r.karnaHp * 100) + "% left)"); }
  { const r = run("kw_e_close", "pandava", () => "yes");
    ok(r.got.done[0] === "miss" || r.got.done[0] === "obey", "Karna's wheel, Pandava: taken and not reached in the count, it is a miss (" + r.got.done[0] + ")"); }
  // Kaurava: keep them off him; the wheel; the last card.
  { const r = run("kw_e_guard", "kaurava", () => "no", (R, B, p, k) => { if (k) k.hp = k.maxHp; return null; });
    ok(r.got.asked.length === 2 && r.got.done[0] === "refuse" && r.got.done[1] === "refuse" && r.over === "win" && r.got.end && !r.got.end.stand, "Karna's wheel, Kaurava: both cards come (the wheel, then the arrow); refused both, you live and the arrow comes (" + r.over + ")"); }
  { let hp0 = 0; const r = run("kw_e_guard", "kaurava", (i) => (i === 0 ? "yes" : "no"), (R, B, p, k) => { if (k) k.hp = k.maxHp; if (R.order && R.order.state === "doing" && R.wheel) { if (!hp0) hp0 = p.hp; p.g.x = R.wheel.x - 1.2; p.g.z = R.wheel.z - 0.4; } return null; });
    ok(r.got.done[0] === "obey", "Karna's wheel, Kaurava: hands on the wheel for the count, and it moves (" + r.got.done[0] + ")"); }
  { const r = run("kw_e_guard", "kaurava", (i) => (i === 0 ? "yes" : "no"), (R, B, p, k) => { if (k) k.hp = k.maxHp; return null; });
    ok(r.got.done[0] === "miss" || r.got.done[0] === "obey", "Karna's wheel, Kaurava: taken, and never at the wheel long enough, the earth keeps it (" + r.got.done[0] + ")"); }
  { const r = run("kw_e_guard", "kaurava", (i) => (i === 1 ? "yes" : "no"), (R, B, p, k) => { if (k) k.hp = k.maxHp; return null; });
    ok(r.got.done[1] === "obey" && r.got.end && r.got.end.stand && r.over === "win" && r.R.stood, "Karna's wheel, Kaurava: stand over him, and the fight ends there with the arrow (the page after is your death)"); }
  { const r = run("kw_e_guard", "kaurava", () => "no", (R, B, p, k) => { if (k && R.t > 6) k.hp = 0; return null; });
    ok(r.over === "lose", "Karna's wheel, Kaurava: let them reach him, and you have failed him (" + r.over + ")"); }
  // The page: the two ways in; and after, only what you did.
  { const K = fresh(2); const S = life(K, { side: "pandava" }); const ids = (sc) => K.val(K.SCENES[sc].choices, S).map((c) => c.id).join(",");
    const a = ids("a6_day17"); S.flags.push("kw_won"); const b = ids("kw_after"); S.flags.push("wheel3d_obey"); const c = K.val(K.SCENES.kw_after.choices, S);
    ok(/^close,guard/.test(a) && /watch/.test(a) && !/shoot|call|wheel|stand/.test(a) && b === "shoot,call,watch" && c.length === 1 && c[0].id === "shoot" && (c[0].tags || []).includes("strike_karna") && c[0].fx.flag.includes("shot_karna"),
      "Karna's wheel: the page offers the two ways in; after a fight with no card answered it asks as it always did; after a card, only what you did, with its old costs");
    S.flags = S.flags.filter((f) => f !== "wheel3d_obey"); S.side = "kaurava"; S.flags.push("stand3d_obey"); const d = K.val(K.SCENES.kw_after.choices, S);
    ok(d.length === 1 && d[0].id === "stand" && d[0].fx.die === true, "Karna's wheel: to stand over him is still to die beside him"); }
}

// 13. The paintings of 13 November: a turn of a fight with its own painting; the leader's face; the banner's two ends.
{
  { const K = fresh(4); life(K, { side: "pandava" }); const C = K.Combat, R3 = K.RT3, B = C.start("e_gate", null), R = R3.begin(B, {}), p = C.player(); p.maxHp = p.hp = 99999;
    for (let i = 0; i < 60 * 12 && !R.over; i++) { R3.step(R, {}); R.fx.length = 0; }
    const row = B.log.find((r) => r && r.ev && r.art);
    ok(row && row.art === "scene_gate_jayadratha" && /boar banner/.test(row.key), "a turn of a fight can carry a painting: at the gate, the wall and the car behind it (" + (row ? row.art : "none") + ")"); try { C.end(); } catch (e) {} }
  { const K = fresh(4); const e = K.ENCOUNTERS.e_last_stand, b = K.val(e.beats).find((x) => x.art3);
    ok(b && b.round === 4 && b.art3 === "scene_abhimanyu_wheel" && K.ENCOUNTERS.fs_d12_elephant.face3 === "p_bhagadatta" && K.SCENES.fs_d12.art === "scene_supratika" && K.SCENES.wc_shakti_k.art === "scene_night_host",
      "the heart of the wheel shows the wheel in his hands; Supratika's page and the night host's have their own paintings, and the old king his face"); }
  { const K = fresh(4); const S = life(K, { side: "pandava" });
    ok(K.ENCOUNTERS.new_banner.lose.next === "new_banner_down" && K.SCENES.new_banner_down.art === "scene_banner_down" && K.SCENES.new_banner_down.next === "a6_day16", "the banner lost has its own page, and the day goes on");
    const ids = () => K.val(K.SCENES.a7_final.choices, S).filter((c) => K.test(c.req, S)).map((c) => c.id);
    const before = ids().includes("banner"); S.flags.push("bore_banner"); const after = ids().includes("banner"); S.endChoice = "banner"; const e = K.composeEnding(S);
    ok(!before && after && e.title === "The banner-bearer" && e.art === "end_banner" && e.telling.some((l) => /stood by your door/.test(String(l))) && K.ENDINGS.some((x) => x.title === e.title && x.art === e.art),
      "one who carried the banner and lived may take it home: its own ending, in the list (" + e.title + ")"); }
}

// 14. How bodies move (owner, 13 November: "physics of the game doesnt feel right"): weight in your own body, bodies that
// push, blows that move what they strike, arrows that fly and fall, bodies thrown, cars and elephants that go the way
// they point.
{
  const open = (id, seed, o) => { const K = fresh(seed || 5); life(K, o); const C = K.Combat, R3 = K.RT3, B = C.start(id, null), R = R3.begin(B, { noPlan: true }), p = C.player(); p.maxHp = p.hp = 99999; return { K, C, R3, B, R, p }; };
  const away = (B, keep) => { for (const u of B.units) if (u.g && u.side !== "player" && !keep.includes(u)) { u.g.x = 40; u.g.z = -60; u.g.entered = false; u.g.wave = 9; } };
  { // your own weight
    const { R3, R, p, B } = open("e_day1"); away(B, []); p.g.x = 0; p.g.z = 0; const sp = () => Math.hypot(p.g.wx, p.g.wz), top = p.g.speed;
    R3.step(R, { mx: 1, mz: 0 }); R3.step(R, { mx: 1, mz: 0 }); const early = sp(); let t90 = 0; for (let i = 2; i < 40 && !t90; i++) { R3.step(R, { mx: 1, mz: 0 }); if (sp() >= 0.9 * top) t90 = (i + 1) / 60; }
    for (let i = 0; i < 30; i++) R3.step(R, { mx: 1, mz: 0 }); const x0 = p.g.x; R3.step(R, {}); R3.step(R, {}); const still = sp(); let ts = 0; for (let i = 2; i < 40 && !ts; i++) { R3.step(R, {}); if (sp() < 0.05) ts = (i + 1) / 60; }
    ok(early < 0.4 * top && t90 > 0.1 && t90 <= 0.25 && still > 0.5 && ts > 0.08 && ts <= 0.3 && p.g.x - x0 > 0.15 && p.g.x - x0 < 0.6, "your body has weight: full speed in " + t90.toFixed(2) + " s, not one step; a stop takes " + ts.toFixed(2) + " s and " + (p.g.x - x0).toFixed(2) + " m");
    for (let i = 0; i < 60; i++) R3.step(R, {}); const z0 = p.g.z; R3.step(R, { roll: true, mx: 0, mz: 1 }); const v = []; let k = 0; while (R.roll > 0 && k++ < 60) { const zb = p.g.z; R3.step(R, {}); v.push((p.g.z - zb) * 60); } const d = p.g.z - z0, mean = d / (k / 60);
    ok(Math.abs(d - R3.P.rollDist) < 0.45 && v[0] < 0.8 * mean && Math.max(...v) > 1.12 * mean && v[v.length - 2] < 0.95 * mean, "a roll pushes off, flies and lands: " + d.toFixed(2) + " m, " + v[0].toFixed(1) + " m/s at the push, " + Math.max(...v).toFixed(1) + " at its fastest, " + v[v.length - 2].toFixed(1) + " coming down"); }
  { // weight against weight
    const push = (pick, hold) => { const { R3, R, p, B } = open("e_day1", 9); const o = pick(B); away(B, [o]); p.g.x = 0; p.g.z = 0; o.g.x = 0; o.g.z = -1.2; o.g.entered = true; const z0 = p.g.z, oz = o.g.z;
      for (let i = 0; i < 60; i++) { o.g.cool = 99; o.g.rec = 99; if (o.g.atk) o.g.atk = null; R3.step(R, { mx: 0, mz: -1 }); } return { me: z0 - p.g.z, him: oz - o.g.z, top: p.g.speed }; };
    const foe = push((B) => B.units.find((u) => u.side === "enemy" && u.g && u.g.kind === "man" && !u.line && !u.g.car)), own = push((B) => B.units.find((u) => u.side === "ally" && u.g && !u.line));
    ok(foe.him > 0.3 && foe.me < foe.top * 0.45 && own.me > foe.me * 1.8 && own.him > 1.5, "bodies push: a foe on his feet gives ground slowly (you make " + foe.me.toFixed(1) + " m in a second, " + foe.top.toFixed(1) + " free), and one of your own steps out of your way (" + own.me.toFixed(1) + " m)");
    const { R3, R, p, B } = open("fs_d12_elephant", 3); const el = B.units.find((u) => u.g && u.g.kind === "elephant"); away(B, [el]); el.g.entered = true; el.g.x = 0; el.g.z = -4; el.g.cool = 99; p.g.x = 0; p.g.z = 0; const ez = el.g.z, ex = el.g.x;
    for (let i = 0; i < 60; i++) { el.g.cool = 99; if (el.g.atk) el.g.atk = null; const hx = el.g.x, hz = el.g.z; R3.step(R, { mx: el.g.x - p.g.x, mz: el.g.z - p.g.z }); el.g.x = hx; el.g.z = hz; el.g.cv = 0; }
    ok(Math.hypot(p.g.x - el.g.x, p.g.z - el.g.z) >= el.g.rad + p.g.rad - 0.05, "and no one moves an elephant, or walks into one");
    // (17 November) its head is part of it: from in front you are stopped at its head, not at its shoulder
    const T_ = R3.TEAM; let least = 99;
    for (const [sx, sz] of [[0, 8], [3, 7], [-3, 7], [5, 2.45], [-5, 2.45]]) { p.g.x = el.g.x + sx; p.g.z = el.g.z + sz; p.g.wx = p.g.wz = 0;
      for (let i = 0; i < 150; i++) { el.g.cool = 99; if (el.g.atk) el.g.atk = null; const hx = el.g.x, hz = el.g.z; el.g.ca = 0; el.g.a = 0; R3.step(R, { mx: el.g.x - p.g.x, mz: el.g.z + T_.headZ - p.g.z }); el.g.x = hx; el.g.z = hz; el.g.cv = 0; least = Math.min(least, R3.off(el, p.g.x, p.g.z)); } }
    p.g.x = el.g.x; p.g.z = el.g.z + 8; p.g.wx = p.g.wz = 0; for (let i = 0; i < 150; i++) { el.g.cool = 99; if (el.g.atk) el.g.atk = null; const hx = el.g.x, hz = el.g.z; el.g.ca = 0; el.g.a = 0; R3.step(R, { mx: 0, mz: -1 }); el.g.x = hx; el.g.z = hz; el.g.cv = 0; }
    const front = p.g.z - el.g.z;
    ok(least >= p.g.rad - 0.03 && front >= T_.headZ + T_.headR + p.g.rad - 0.03 && front < T_.headZ + T_.headR + p.g.rad + 0.6, "nor into its head: walked at from five sides you never come inside it, and from in front you are stopped " + front.toFixed(1) + " m from its middle (its shoulder is " + (el.g.rad + p.g.rad).toFixed(1) + ")"); }
  { // wheels
    const slip = (id, pick, secs) => { const K = fresh(7); life(K); const C = K.Combat, R3 = K.RT3, B = C.start(id, null), R = R3.begin(B, {}), p = C.player(), u = B.units.find((x) => x.side === "enemy" && x.g && pick(x)); let nn = 0, sum = 0, w = 0, la = null, dist = 0;
      for (let i = 0; i < 60 * secs && !R.over && u.hp > 0; i++) { p.hp = p.maxHp; const x0 = u.g.x, z0 = u.g.z; R3.step(R, id === "bh_line9" ? {} : R3.bot(R)); const dx = u.g.x - x0, dz = u.g.z - z0, v = Math.hypot(dx, dz) * 60; dist += v / 60;
        if (u.g.ca != null) { if (la != null) w = Math.max(w, Math.abs(Math.atan2(Math.sin(u.g.ca - la), Math.cos(u.g.ca - la))) * 60); la = u.g.ca; }
        // (running free: not in the rush of a great blow, which goes where it was aimed, and not while it is against men who stand fast and will not be moved, which turn it aside as a wall would. Its head is part of it since 17 November, so it is against them more often.)
        const held = (u.g.atk && u.g.atk.dash) || B.units.some((o) => o !== u && o.still && o.g && o.hp > 0 && R3.off(u, o.g.x, o.g.z) - o.g.rad < 0.4);
        if (v > 0.8 && u.g.entered && !(u.g.vx || u.g.vz) && !held) { const a = Math.atan2(dx, dz); nn++; sum += Math.abs(Math.atan2(Math.sin(a - u.g.ca), Math.cos(a - u.g.ca))); } }
      try { C.end(); } catch (e) {} return { deg: nn ? (sum / nn) * 57.3 : 99, w, dist }; };
    const car = slip("bh_line9", (u) => u.g.car, 22), ele = slip("fs_d12_elephant", (u) => u.g.kind === "elephant", 25), P_ = fresh(1).RT3.PHYS;
    ok(car.dist > 12 && car.deg < 3 && car.w <= P_.car.turn + 0.9, "a car goes the way it points: over " + car.dist.toFixed(0) + " m its path is " + car.deg.toFixed(1) + "° off its heading on average, and it never comes round faster than " + (car.w * 57.3).toFixed(0) + "° a second");
    ok(ele.dist > 12 && ele.deg < 4, "an elephant goes the way it points (" + ele.deg.toFixed(1) + "° off, over " + ele.dist.toFixed(0) + " m)"); }
  { // arrows
    const shoot = (after) => { const { R3, R, p, B, C } = open("e_day1", 4, { path: "archer" }); const f = B.units.find((u) => u.side === "enemy" && u.g && u.g.kind === "man" && !u.line && !u.g.car); away(B, [f]); p.g.x = 0; p.g.z = 6; p.g.a = Math.PI; f.g.entered = true; f.maxHp = f.hp = 99999; let hit = null, top = 0, steered = false, a0 = null;
      const drift = (vx) => { f.g.cool = 99; f.g.rec = 99; f.g.atk = null; f.g.wx = vx; f.g.wz = 0; f.g.walkN = R.n + 1; f.g.x += vx / 60; f.g.z = -6; };
      f.g.x = -2; f.g.z = -6; R.lock = f.uid; let loosed = false, vx = 3;
      for (let i = 0; i < 150 && hit === null; i++) { drift(vx); R3.step(R, i === 3 ? { strike: true } : {}); for (const e of R.fx) { if (e.k === "arrive" && e.shot.side === "player") hit = e.uid != null; }
        for (const s of R.shots) if (s.side === "player" && R.t >= s.t0) { if (!loosed) { loosed = true; if (after) vx = after; } top = Math.max(top, s.y); a0 = a0 || {}; if (a0[s.n] == null) a0[s.n] = s.a; else if (Math.abs(s.a - a0[s.n]) > 1e-9) steered = true; } R.fx.length = 0; }
      try { C.end(); } catch (e) {} return { hit, top, steered }; };
    const led = shoot(0), fooled = shoot(-3), F = fresh(1).RT3.FLY;
    ok(led.hit === true && !led.steered && led.top > F.y0 + 0.01, "an arrow is loosed at where a walking man will be, and finds him there; it rises " + ((led.top - F.y0) * 100).toFixed(0) + " cm above the bow at twelve metres (a war bow shoots flat that near) and does not steer");
    ok(fooled.hit === false, "if he turns back once it is in the air, it comes down in the ground where he would have been"); }
  { // blows move bodies
    const { R3, R, p, B, C } = open("e_day1", 6); const f = B.units.find((u) => u.side === "enemy" && u.g && u.g.kind === "man" && !u.line && !u.g.car && !u.hero && !u.person); away(B, [f]); p.g.x = 0; p.g.z = 0; p.g.a = Math.PI; f.g.entered = true; f.g.x = 0; f.g.z = -1.5; f.maxHp = f.hp = 99999; f.sp = 0; f.shield = false; R.lock = f.uid; let landed = 0;
    for (let i = 0; i < 40 && !landed; i++) { f.g.cool = 99; f.g.rec = 99; f.g.atk = null; const z0 = f.g.z; R3.step(R, i === 1 ? { strike: true } : {}); for (const e of R.fx) if (e.k === "hit" && e.uid === f.uid && !e.blocked) landed = 1; R.fx.length = 0; }
    const zHit = f.g.z, st = f.g.stag; for (let i = 0; i < 40; i++) { f.g.cool = 99; f.g.rec = 99; f.g.atk = null; R3.step(R, {}); }
    ok(landed && zHit - f.g.z > 0.06 && zHit - f.g.z < 0.6, "a light blow that lands moves the man it lands on (" + (zHit - f.g.z).toFixed(2) + " m), and does not throw him");
    f.hp = 1; f.g.x = 0; f.g.z = -1.5; p.g.x = 0; p.g.z = 0; let dead = false; for (let i = 0; i < 200 && !dead; i++) { f.g.cool = 99; f.g.rec = 99; f.g.atk = null; if (f.hp > 0) { f.g.x = 0; f.g.z = -1.5; f.hp = 1; } R3.step(R, { strike: true }); dead = f.hp <= 0; R.fx.length = 0; }
    const zd = f.g.z; for (let i = 0; i < 60; i++) R3.step(R, {});
    ok(dead && f.g.thrown && zd - f.g.z > 0.15, "the body of a man killed goes the way the blow went (" + (zd - f.g.z).toFixed(2) + " m)"); try { C.end(); } catch (e) {} }
}

// 15. A spar (13 November: "replace [the strength, push and rhythm tests] with a real spar in the fight engine against a named
// partner"): a bout begun from a test is fought with what you are handed, is not deadly, is short, can be won by fighting
// and is lost by standing still.
{
  const bout = (sp, lifeO, how, sd) => { const K = fresh(sd); const S = life(K, lifeO); S.attrs.might = 3; S.attrs.grace = 3; S.skills.mace = 1; const enc = K.sparEncounter(sp, { power: 4 }); const C = K.Combat, R3 = K.RT3, B = C.start("x_spar", null), R = R3.begin(B, {}); let g = 0;
    const p = C.player(), foe = B.units.find((u) => u.side === "enemy"), info = { enc, moves: p.abilities.slice(), mine: p.g && p.g.weapon, his: foe.g && foe.g.weapon };
    while (!R.over && g++ < 60 * 150) R3.step(R, how === "fight" ? R3.bot(R, {}) : {});
    info.over = R.over; info.t = R.t; try { C.end(); } catch (e) {} return info; };
  const ugra = { person: "ugra", name: "Ugra", arm: "fist" }, kripa = { person: "kripa", name: "Kripa", arm: "woodsword" }, bala = { person: "balarama", name: "Balarama", arm: "mace" };
  const a = bout(ugra, { act: 3, age: 25, path: "mace" }, "fight", 41);
  ok(a.enc.id === "x_spar" && a.enc.lethal === false && a.enc.bout && a.mine === "fist" && a.his === "fist", "a wrestling bout is fought bare-handed by both, and is not deadly (" + a.mine + " against " + a.his + ")");
  ok(a.moves.join(",") === "strike,guard", "bare hands bring a strike and a guard, and none of a mace-fighter's own moves (" + a.moves.join(", ") + ")");
  const b = bout(bala, { act: 3, age: 25, path: "mace" }, "fight", 42), c = bout(kripa, { act: 2, age: 13, path: null }, "fight", 43);
  ok(b.mine === "mace" && b.moves.length > 2 && !b.moves.includes("herbs") && !b.moves.includes("astra"), "with practice maces a mace-fighter has their own moves, but no herbs and no divine weapon (" + b.moves.join(", ") + ")");
  ok(c.mine === "woodsword" && c.his === "woodsword", "Kripa's drill is fought with wooden swords");
  let won = 0, lost = 0, secs = 0; for (let i = 0; i < 6; i++) { const w = bout([ugra, kripa, bala][i % 3], i % 3 === 1 ? { act: 2, age: 14, path: null } : { act: 3, age: 25, path: "mace" }, "fight", 50 + i); if (w.over === "win") won++; secs += w.t; const l = bout([ugra, kripa, bala][i % 3], { act: 3, age: 25, path: "mace" }, "still", 60 + i); if (l.over === "lose") lost++; }
  ok(won >= 5 && secs / 6 < 45, "a bout can be won by fighting, and is short (" + won + " of 6 won, " + Math.round(secs / 6) + " s each)");
  ok(lost === 6, "a bout is lost by standing still (" + lost + " of 6)");
}

// 16. What each kind of common man can do (owner, 13 November).
{
  const K = fresh(41), C = K.Combat, R3 = K.RT3, P3 = R3.P || {};
  const open = (id, o, lifeO) => { life(K, lifeO); const B = C.start(id, null), R = R3.begin(B, Object.assign({ noLine: true, noPlan: true }, o || {})); return { B, R }; };
  const shut = () => { try { C.settle("flee"); C.end(); } catch (e) {} };
  const only = (B, keep) => { for (const u of B.units) if (u.side !== "player" && u !== keep) { u.hp = 0; if (u.g) u.g.fell = 0; } };
  const ang = (a, b) => Math.atan2(b.g.x - a.g.x, b.g.z - a.g.z);
  // a spearman: run straight at him and his point is set; walk in, or come at his side, and it is not
  const spear = (how) => { const { B, R } = open("e_day1"), p = C.player(), e = B.units.find((u) => u.side === "enemy" && u.g && u.g.cls === "spear" && !u.plural); only(B, e); e.g.entered = true; e.g.wave = 0; e.g.x = 0; e.g.z = -3; e.g.cool = 9; p.g.x = how === "side" ? 7 : 0; p.g.z = how === "side" ? -3 : 5; e.g.a = how === "side" ? 0 : ang(e, p); let set = false, hurt = 0; const hp0 = p.hp;
    for (let i = 0; i < 60 * 3 && !set; i++) { if (how === "side") e.g.a = 0; /* (he looks down the field; you come from his right) */ const dx = e.g.x - p.g.x, dz = e.g.z - p.g.z, l = Math.hypot(dx, dz) || 1, k = how === "walk" ? 0.5 : 1; R3.step(R, { mx: (dx / l) * k, mz: (dz / l) * k }); if (R.fx.some((f) => f.k === "setspear")) set = true; R.fx.length = 0; e.g.cool = 9; }
    if (set) for (let i = 0; i < 30; i++) { const dx = e.g.x - p.g.x, dz = e.g.z - p.g.z, l = Math.hypot(dx, dz) || 1; R3.step(R, { mx: dx / l, mz: dz / l }); R.fx.length = 0; } /* (you are running: you do not stop for his point) */ hurt = hp0 - p.hp; shut(); return { set, hurt, cls: e.g.cls }; };
  const run = spear("run"), walk = spear("walk"), side = spear("side");
  ok(run.set && run.hurt > 0 && !walk.set && !side.set, "A spearman sets his point at a man who runs straight at him and strikes first (" + Math.round(run.hurt) + " taken); walked up to, or come at from the side, he does not");
  // a heavy weapon: its great blow comes through a raised shield and beats it down
  { const { B, R } = open("e_sudatta", null, { act: 3, age: 25, side: null }), p = C.player(); let broke = 0, lowered = 0;
    for (let i = 0; i < 60 * 60 && !R.over && !broke; i++) { p.hp = p.maxHp; R.breath = 100; R3.step(R, { block: true }); if (R.fx.some((f) => f.k === "guardbreak")) { broke++; if (!R.block) lowered++; } R.fx.length = 0; }
    const cl = B.units.filter((u) => u.side === "enemy" && u.g).map((u) => u.g.cls); shut();
    ok(cl.includes("heavy") && broke > 0 && lowered > 0, "A club-man's great blow comes through a raised shield and beats it down (his trade: " + cl.join(",") + ")"); }
  // a skirmisher runs when he is badly hurt, unless he is the last of them
  { const { B, R } = open("e_bandits", null, { act: 2, age: 18, side: null }), fs = B.units.filter((u) => u.side === "enemy" && u.g); fs[0].hp = Math.round(fs[0].maxHp * 0.2); let ran = false;
    for (let i = 0; i < 60 * 6 && !R.over; i++) { C.player().hp = C.player().maxHp; R3.step(R, {}); if (R.fx.some((f) => f.k === "runs" && f.uid === fs[0].uid)) ran = true; R.fx.length = 0; }
    const gone = fs[0].hp <= 0 && !!fs[0].fled; shut();
    const { B: B2, R: R2 } = open("e_bandits", null, { act: 2, age: 18, side: null }), f2 = B2.units.filter((u) => u.side === "enemy" && u.g); only(B2, f2[0]); f2[0].hp = Math.round(f2[0].maxHp * 0.2); let ran2 = false;
    for (let i = 0; i < 60 * 3 && !R2.over; i++) { C.player().hp = C.player().maxHp; R3.step(R2, {}); if (R2.fx.some((f) => f.k === "runs")) ran2 = true; R2.fx.length = 0; } shut();
    ok(fs[0].g.cls === "skirm" && ran && gone && !ran2, "A bandit badly hurt runs, and is out of the fight; the last of them has nowhere to run"); }
  // a captain: when he falls his men reel and their spirit drops
  { const { B, R } = open("new_over_bhima", { noPlan: false, plan: "wall" }), cap = B.units.find((u) => u.side === "enemy" && u.g && u.g.cls === "captain"), m0 = R.morale ? R.morale.theirs : null; let down = null;
    if (cap) { for (const u of B.units) if (u.side === "enemy" && u.g && u !== cap) { u.g.x = cap.g.x + 2; u.g.z = cap.g.z; u.g.entered = true; } cap.hp = 0; for (let i = 0; i < 5; i++) { R3.step(R, {}); const f = R.fx.find((x) => x.k === "captainDown"); if (f) down = f; R.fx.length = 0; } }
    const m1 = R.morale ? R.morale.theirs : null; shut();
    ok(!!cap && !!down && down.n > 0 && m0 != null && m1 < m0, "Their captain down: the men within his call reel (" + (down && down.n) + "), and their host's spirit falls (" + m0 + " to " + Math.round(m1) + ")"); }
  // a shield-man carries his trade's shield
  { const { B } = open("e_kings", null, { act: 3, age: 25, side: null }), g = B.units.filter((u) => u.side === "enemy" && u.g && u.g.cls === "shield"); const all = g.length > 0 && g.every((u) => u.shield && u.sp > 0); shut();
    ok(all, "A bodyguard is a shield-man: he carries a shield that takes blows from the front (" + g.length + " of them)"); }
}

// 17. Your own plan, and what your scouts say of theirs.
{
  const K = fresh(43), C = K.Combat, R3 = K.RT3;
  const open = (st, o) => { const S = life(K, o); if (o && o.statecraft != null) S.skills.statecraft = o.statecraft; const B = C.start("e_day1", null), R = R3.begin(B, { plan: "wall" }); return { B, R }; };
  const shut = () => { try { C.settle("flee"); C.end(); } catch (e) {} };
  { const { R } = open(); const sc = R3.scouts(R), m0 = R.morale.theirs, okSt = R3.stance(R, "flank"), m1 = R.morale.theirs, again = R3.stance(R, "hold"); shut();
    ok(sc && !sc.sure && sc.kinds.length === 2 && sc.kinds.includes("wall") && okSt && R.met && m1 === m0 - 20 && !again, "Scouts without the wit for it name two plans, one of them true; the plan that answers theirs shakes their host (" + m0 + " to " + m1 + "), and is chosen once"); }
  { const { R } = open(null, { statecraft: 5 }); const sc = R3.scouts(R), m0 = R.morale.theirs; R3.stance(R, "centre"); const m1 = R.morale.theirs; shut();
    ok(sc && sc.sure && sc.kinds.length === 1 && sc.kinds[0] === "wall" && !R.met && m1 === m0, "With the wit for it your scouts are sure; a plan that does not answer theirs costs them nothing at the start"); }
  { const { R } = open(); for (let i = 0; i < 60; i++) R3.step(R, {}); const late = R3.stance(R, "flank"); shut(); ok(!late, "Your plan is chosen before the fight, not in it"); }
}

// 18. Each battle of an act is a step harder than the last.
{
  const K = fresh(45), RT = K.RT, C = K.Combat, R3 = K.RT3; const S = life(K);
  const at = (k) => { S.fought = { 6: k }; return RT.heat(S); };
  const h0 = at(0), h4 = at(4), h10 = at(10), h30 = at(30);
  ok(h0 < h4 && Math.abs(h4 - RT.HEAT[6]) < 1e-9 && h10 > h4 && h30 === h10, "The first fight of an act is under the act's old level, the fourth is at it, the tenth over it, and it stops there (" + [h0, h4, h10].map((v) => v.toFixed(2)).join(", ") + ")");
  S.fought = {}; const B = C.start("e_day1", null), R = R3.begin(B, {}); let g = 0; while (!R.over && g++ < 60 * 200) R3.step(R, R3.bot(R, {})); if (R.over === "retry") R3.accept(R); /* (lost at the first try: the loss is taken, and the battle is still one fought) */ C.end();
  ok(S.fought[6] === 1, "A battle fought is counted in the life (" + JSON.stringify(S.fought) + ")");
}

// The named: each man's own fight (16 November).
{
  const K = fresh(5), R3 = K.RT3, SIG = R3.SIG, HERO = R3.HERO, used = {};
  for (const [h, H] of Object.entries(HERO)) for (const id of H.sigs) (used[id] = used[id] || []).push(h);
  ok(Object.values(HERO).every((H) => H.sigs.length && H.sigs.every((id) => SIG[id] && SIG[id].name && SIG[id].say && SIG[id].tip)) && Object.values(used).every((l) => l.length === 1),
    "Every named opponent has a great blow of his own, with a name, a line and a tip, and no two of them share one (" + Object.keys(HERO).length + " men, " + Object.keys(used).length + " blows)");
  // His plain blow is never lighter than the common men's about him.
  const light = [];
  for (const id of ["hold_bhima", "hold_duryodhana", "hold_arjuna", "hold_karna", "wc_e_ghost", "e_kb_hold", "oath_king_hold", "bh_line9", "kd_e_son"]) {
    life(K); K.seed(7); const C = K.Combat, B = C.start(id, null), R = R3.begin(B, {});
    const foes = B.units.filter((u) => u.side === "enemy" && !u.line && u.g), hero = foes.find((u) => u.g.hk), top = Math.max(0, ...foes.filter((u) => !u.g.hk && !u.still).map((u) => u.atk));
    if (!hero || hero.atk < top) light.push(id);
    C.end();
  }
  ok(!light.length, "One of the named strikes at least as hard as the common men about him" + (light.length ? " (not in " + light.join(", ") + ")" : ""));
}
{ // A great blow is called as it begins, has its own mark, and leaves him open; no shield holds one marked so; thrown down, you can neither guard nor roll
  const stage = (how) => { const K = fresh(9); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("hold_bhima", null), R = R3.begin(B, { noLine: true, noPlan: true }), p = C.player(), e = B.units.find((u) => u.person === "bhima");
    for (const u of B.units) if (u.side === "enemy" && u !== e) { u.hp = 0; } for (const u of B.units) if (u.side === "ally") { u.g.x = 30; u.g.z = 30; u.still = true; }
    p.maxHp = p.hp = 100000; e.g.x = 0; e.g.z = -1.2; e.g.entered = true; e.g.role = null; p.g.x = 0; p.g.z = 1.2; e.g.sigAt = 0; e.g.cool = 0; e.g.sigN = 1; R.breath = 100;
    const seen = { sig: 0, mark: null, nb: false, down: 0, open: 0, dmg: 0, noRoll: false, noGuard: false, dodged: R.stats.dodged, broke: 0 }; let began = null;
    for (let i = 0; i < 60 * 12 && seen.open === 0; i++) {
      const a = e.g.atk && e.g.atk.sig ? e.g.atk : null; if (a && !began) { began = a; seen.mark = R3.markOf(R, e).kind; seen.nb = R3.markOf(R, e).nb; }
      const left = a ? a.land - R.t : 9, hp0 = p.hp, act = {};
      if (how === "guard" && a && left < 0.6) act.block = true;
      if (how === "roll" && a && left < 0.12 && left > 0) { act.roll = true; act.mx = 1; act.mz = 0; }
      R3.step(R, act); seen.dmg += hp0 - p.hp;
      for (const x of R.fx) { if (x.k === "sig") seen.sig++; if (x.k === "knocked") { seen.down++; seen.noRoll = !R3.can(R, "roll"); seen.noGuard = !R3.can(R, "block"); } if (x.k === "sigEnd") seen.open = e.g.rec; if (x.k === "guardbreak") seen.broke++; } R.fx.length = 0;
    }
    seen.dodged = R.stats.dodged - seen.dodged; seen.id = began && began.sig.id; try { C.settle("flee"); C.end(); } catch (x) {} return seen; };
  const g = stage("guard"), r = stage("roll");
  ok(g.id === "slam" && g.sig === 1 && g.mark === "ring" && g.nb && g.open >= 1, "Bhima's great blow is called once as it begins, marks a ring no shield holds, and leaves him open after (" + g.open.toFixed(1) + " s)");
  ok(g.dmg > 20 && g.broke === 1 && g.down === 1 && g.noRoll && g.noGuard, "A raised shield does not hold it: it comes through (" + Math.round(g.dmg / 1000) + "% of your health), the guard is beaten down, and thrown down you can neither guard nor roll");
  ok(r.dmg === 0 && r.dodged === 1 && r.down === 0, "Rolled at the moment it lands, it costs nothing");
}
{ // Stand idle and every foe turns on you; Kripa, waiting, turns a blow from the front and answers it
  const K = fresh(21); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("e_day1", null), R = R3.begin(B, {}), p = C.player(); p.maxHp = p.hp = 100000;
  let said = 0; for (let i = 0; i < 60 * 9; i++) { p.hp = p.maxHp; R3.step(R, {}); for (const x of R.fx) if (x.k === "idle") said++; R.fx.length = 0; }
  const foes = B.units.filter((u) => u.side === "enemy" && !u.line && u.hp > 0 && u.g && u.g.entered && u.g.tgt), onMe = foes.filter((u) => u.g.tgt === p.uid).length;
  ok(said === 1 && foes.length > 0 && onMe === foes.length, "Stand idle five seconds and every foe on the field turns on you, said once (" + onMe + " of " + foes.length + ")");
  try { C.settle("flee"); C.end(); } catch (x) {}
}
{
  const K = fresh(23); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("e_lake_three", null), R = R3.begin(B, { noLine: true }), p = C.player(), e = B.units.find((u) => u.person === "kripa"); p.maxHp = p.hp = 100000;
  for (const u of B.units) if (u.side === "enemy" && u !== e) u.hp = 0; for (const u of B.units) if (u.side === "ally") { u.g.x = 30; u.g.z = 30; u.still = true; }
  e.g.x = 0; e.g.z = -0.9; e.g.entered = true; e.g.a = 0; p.g.x = 0; p.g.z = 0.9; p.g.a = Math.PI; e.g.sigAt = 0; e.g.cool = 0; R.lock = e.uid;
  let waited = false, turned = 0, answer = null, hp0 = e.hp;
  for (let i = 0; i < 60 * 8 && !answer; i++) { const w = e.g.counterUntil > R.t; waited = waited || w; R3.step(R, w ? { strike: true } : {}); for (const x of R.fx) if (x.k === "parried") turned++; R.fx.length = 0; if (e.g.atk && e.g.atk.sig && e.g.atk.sig.id === "riposte") answer = e.g.atk; }
  ok(waited && turned === 1 && !!answer && e.hp === hp0, "Kripa waits in his guard: a blow at his front is turned, does him no harm, and is answered at once");
  try { C.settle("flee"); C.end(); } catch (x) {}
}

// Weight, and what meets at speed (16 November; owner: "bodies, animals and chariots should have weight and colliding
// should lead to a fall based on mechanics"); weariness ("as player health decreases, their strikes should feel sluggish").
{
  const K = fresh(41); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("hold_arjuna", null), R = R3.begin(B, { noPlan: true }), p = C.player(); p.maxHp = p.hp = 100000;
  const car = B.units.find((u) => u.side === "enemy" && u.g && u.g.car), men = B.units.filter((u) => u.side === "enemy" && u.line && u.g && u.hp > 0), a = men[0], b = men[1];
  const sp = (u) => Math.hypot(u.g.vx, u.g.vz);
  for (const u of [a, car]) { u.g.vx = 0; u.g.vz = 0; R3.knock(R, u, 0, 1.5, false); }
  const va = sp(a), vc = sp(car); a.g.vx = a.g.vz = car.g.vx = car.g.vz = 0; a.g.stag = 0;
  ok(R3.weight(a) === 1 && R3.weight(car) === 14 && va > 5 && vc < va * 0.2 && vc > 0, "The same blow throws a man back " + va.toFixed(1) + " m/s and a chariot " + vc.toFixed(1) + ": each by its weight");
  // one man thrown into another
  // (everyone else off the field, and your own men told to stand where they are put: left free they walked back from wherever chance had set them, a different way each time, and into the middle of what is measured here)
  B.units.forEach((u, i) => { if (u.side !== "player" && u !== a && u !== b && u.g) { u.g.x = 40 + i * 0.37; u.g.z = 40; u.g.entered = u.side !== "enemy" ? u.g.entered : false; if (u.side === "ally") u.still = true; } });
  p.g.x = -9; p.g.z = 9; a.g.x = 0; a.g.z = 0; b.g.x = 1.2; b.g.z = 0; a.g.entered = b.g.entered = true; a.g.stag = b.g.stag = 0; a.g.down = b.g.down = 0; b.g.atk = null; a.g.atk = null;
  a.g.vx = 6; a.g.vz = 0; b.g.vx = 0; b.g.vz = 0; let bumped = null, was = 6;
  for (let i = 0; i < 40 && !bumped; i++) { p.hp = p.maxHp; was = a.g.vx; R3.step(R, { mx: 0.01 }); for (const e of R.fx) if (e.k === "bump" && e.uid === b.uid) bumped = { fell: e.fell, va: a.g.vx, vb: b.g.vx, down: b.g.down, was, n: e.n, n1: e.n1 }; R.fx.length = 0; }
  const slow = 1 - R3.PHYS.fric * R3.STEP;   // (what the ground takes from both in the step they meet)
  ok(!!bumped && bumped.fell && bumped.down > 0.5 && bumped.vb > bumped.va * 2 && Math.abs(bumped.va + bumped.vb - bumped.was * slow) < 0.2, "A man thrown into another takes him off his feet and gives him most of his speed; between them they keep what he had (" + (bumped ? bumped.was.toFixed(1) + " m/s before, " + bumped.va.toFixed(1) + " and " + bumped.vb.toFixed(1) + " after" : "no meeting") + ")");
  ok(!!bumped && bumped.n > 0 && bumped.n1 > 0 && bumped.n <= Math.round(b.maxHp * R3.PHYS.hurtMost) && Math.abs(bumped.n / b.maxHp - bumped.n1 / a.maxHp) < 0.01, "And both pay for it in health, each by what he was given (" + (bumped ? (100 * bumped.n / b.maxHp).toFixed(1) + "% and " + (100 * bumped.n1 / a.maxHp).toFixed(1) + "%" : "") + "; never more than " + Math.round(R3.PHYS.hurtMost * 100) + "% at one meeting)");
  // a chariot under way and a man in its path
  // (17 November: its team is part of it and reaches him first. He stands clear ahead of the horses to begin with; the car is kept to its line and its speed.)
  const front = (u) => { const s = R3.shape(u); return s.len + s.nr; };   // (how far a body reaches before its own middle)
  // (kept to its line: under way, its man has not the reins for the step, so nothing steers it; standing, it is one that stands fast)
  const steady = (u, v) => { u.g.ca = 0; u.g.a = 0; u.g.cv = v; u.g.cw = 0; u.g.cool = 99; u.g.atk = null; u.g.stag = v ? 0.05 : 0; u.still = !v; };
  a.g.x = 40; a.g.z = 41; b.g.x = 41; b.g.z = 41; a.g.entered = b.g.entered = false; a.g.vx = a.g.vz = b.g.vx = b.g.vz = 0;
  car.g.entered = true; car.g.role = null; car.g.x = 0; car.g.z = -9; steady(car, 4.5); p.g.x = 0; p.g.z = car.g.z + front(car) + p.g.rad + 0.25 + 1.3; R.roll = 0; R.downFree = 0; R.downUntil = 0;
  let ram = null;
  for (let i = 0; i < 90 && !ram; i++) { p.hp = p.maxHp; steady(car, 4.5); const gap = p.g.z - car.g.z; R3.step(R, { mx: 0.01 }); for (const e of R.fx) if (e.k === "jostle" && e.uid === p.uid) ram = { fell: e.fell, down: R.downUntil > R.t, noRoll: !R3.can(R, "roll"), carV: car.g.cv, n: e.n, gap }; R.fx.length = 0; }
  ok(!!ram && ram.fell && ram.down && ram.noRoll && ram.carV > 2.5, "A chariot under way takes a man in its path off his feet, and is hardly slowed (" + (ram ? ram.carV.toFixed(1) + " m/s after" : "it never met him") + ")");
  ok(!!ram && ram.n > p.maxHp * 0.03 && ram.n <= p.maxHp * R3.PHYS.hurtMost, "And it costs him health: " + (ram ? Math.round(100 * ram.n / p.maxHp) : 0) + "% of it at that speed");
  ok(!!ram && car.g.team === 4 && ram.gap > 4.5 && ram.gap < front(car) + p.g.rad + 0.5, "It is the team that strikes him: the deck's middle was still " + (ram ? ram.gap.toFixed(1) : "?") + " m short of him");
  { // He is not thrown a second time while he lies there, nor in the breath after he is up
    let again = 0; for (let i = 0; i < 60 && R.t < R.downFree; i++) { p.hp = p.maxHp; steady(car, 4.5); R3.step(R, {}); for (const e of R.fx) if (e.k === "jostle" && e.uid === p.uid) again++; R.fx.length = 0; }
    ok(again === 0, "The car that threw him pushes him on and does not throw him again while he lies there"); }
  { // A standing team: you are stopped at it, it costs you nothing, and from no side do you come inside it
    car.g.wreckT = 0; car.g.down = 0; car.g.jostleT = 0; car.g.x = 0; car.g.z = -6; steady(car, 0); R.downFree = 0; R.downUntil = 0; p.g.vx = p.g.vz = 0; p.g.wx = p.g.wz = 0; p.g.busy = 0; p.hp = p.maxHp;
    const cz = car.g.z, sh = R3.shape(car); p.g.x = 0; p.g.z = cz + front(car) + 4; let hits = 0;
    for (let i = 0; i < 60 * 3; i++) { steady(car, 0); R3.step(R, { mx: 0, mz: -1 }); for (const e of R.fx) { if ((e.k === "jostle" || e.k === "bump" || e.k === "knocked") && (e.uid === p.uid || e.by === p.uid)) hits++; } R.fx.length = 0; }
    const stop = p.g.z - car.g.z, whole = p.hp === p.maxHp; let least = 99;
    for (const [sx, sz] of [[4, 8], [-4, 8], [6, sh.len], [-6, sh.len], [5, 1.5], [-5, 1.5]]) { p.g.x = sx; p.g.z = car.g.z + sz; p.g.wx = p.g.wz = 0;
      for (let i = 0; i < 150; i++) { steady(car, 0); R3.step(R, { mx: sh.nx - p.g.x, mz: sh.nz - p.g.z }); for (const e of R.fx) if ((e.k === "jostle" || e.k === "bump" || e.k === "knocked") && (e.uid === p.uid || e.by === p.uid)) hits++; R.fx.length = 0; least = Math.min(least, R3.off(car, p.g.x, p.g.z)); } }
    ok(stop >= front(car) + p.g.rad - 0.03 && stop < front(car) + p.g.rad + 0.5 && hits === 0 && whole && Math.abs(car.g.z - cz) < 0.6, "You cannot walk through a standing team: walking straight at it you are stopped " + stop.toFixed(1) + " m before the deck's middle (its horses reach " + front(car).toFixed(1) + "), and it costs you nothing");
    ok(least >= p.g.rad - 0.03, "From no side do you come inside the team or the car (nearest: " + least.toFixed(2) + " m from its edge to your middle)"); }
  { // Brushing along the side of a car as it passes is not being ridden down
    car.g.team = 2; car.g.x = 0; car.g.z = -9; steady(car, 4.5); const T_ = R3.TEAM; p.g.x = T_.r + p.g.rad + 0.25 + 0.01; p.g.z = car.g.z + T_.z; p.g.wx = p.g.wz = 0; p.hp = p.maxHp; R.downFree = 0; R.downUntil = 0; let thrown = 0;
    for (let i = 0; i < 80; i++) { steady(car, 4.5); R3.step(R, {}); for (const e of R.fx) if ((e.k === "jostle" || e.k === "knocked") && e.uid === p.uid) thrown++; R.fx.length = 0; }
    ok(thrown === 0 && !(R.downUntil > R.t) && p.hp === p.maxHp && car.g.z > p.g.z + 1 && p.g.x > T_.r + p.g.rad && p.g.x < 2.6, "A car that passes close by does not throw the man it only brushes: he is eased a hand's breadth aside (" + (p.g.x - (T_.r + p.g.rad + 0.26)).toFixed(2) + " m)");
    car.g.team = 4; }
  { // A body thrown against a team pays for it, as against the car
    const sh0 = (car.g.x = 0, car.g.z = -6, steady(car, 0), car.g.bumpT = 0, R3.shape(car));
    p.g.x = -9; p.g.z = 9; a.g.entered = true; a.g.x = sh0.nx + sh0.nr + a.g.rad + 0.35; a.g.z = sh0.nz; a.g.vx = -6; a.g.vz = 0; a.g.bumpT = 0; a.g.down = 0; a.g.stag = 0.8; a.g.wx = a.g.wz = 0; a.hp = a.maxHp; let hit = null;   // (thrown, and not on his own feet: he does not walk off as he flies)
    for (let i = 0; i < 30 && !hit; i++) { steady(car, 0); R3.step(R, {}); for (const e of R.fx) if (e.k === "bump" && e.by === a.uid && e.uid === car.uid) hit = { me: e.me, n1: e.n1, down: a.g.down > 0, x: a.g.x }; R.fx.length = 0; }
    ok(!!hit && hit.me && hit.down && hit.n1 > 0 && hit.x > sh0.nx + sh0.nr - 0.2, "A man thrown against a team stops there, drops and pays for it (" + (hit ? Math.round(100 * hit.n1 / a.maxHp) + "% of his health" : "he went through it") + ")");
    a.g.x = 40; a.g.z = 41; a.g.entered = false; a.g.vx = a.g.vz = 0; }
  { // A man with the side of a car between him and where he is going does not lean on it: he goes round by the nearer end
    car.g.x = 0; car.g.z = -6; steady(car, 0); const sh = R3.shape(car), side = (w) => { b.g.x = car.g.x + car.g.rad + (sh.nr - car.g.rad) * (w / sh.len) + b.g.rad + 0.02; b.g.z = car.g.z + w; b.g.skT = 0; b.g.skId = null; };
    b.g.entered = true; b.hp = b.maxHp; side(0.8); const tail = R3.skirt(R, b, -3, 0); side(sh.len - 0.6); const nose = R3.skirt(R, b, -3, 0); side(sh.len / 2); const along = R3.skirt(R, b, -1.2, -2.75);
    car.g.cv = 3; side(sh.len - 0.6); const coming = R3.skirt(R, b, -3, 0); car.g.cv = 0;
    ok(!!tail && tail[1] < -2.7 && !!nose && nose[1] > 2.7 && along === null && !!coming && coming[1] < -2.7, "A man whose way lies through a car and its team goes round it: by its tail when that is nearer or when it is coming on, by its horses' heads when those are nearer; one already walking along it is left to");
    b.g.x = 41; b.g.z = 41; b.g.entered = false; }
  // a car meets a car
  { const al = B.units.find((u) => u.side === "ally" && u.g && u.hp > 0 && !u.g.car) || B.units.find((u) => u.side === "ally" && u.g && u.hp > 0);
    al.g.car = true; al.g.rad = 1.25; al.g.cv = 0; al.g.ca = Math.PI; al.g.a = Math.PI; al.g.x = 0; al.g.z = 4; al.g.speed = 0; al.g.entered = true; al.g.role = null; al.g.atk = null; al.g.cool = 99; al.still = false; al.maxHp = al.hp = 1000; car.maxHp = car.hp = 1000;
    p.g.x = 0; p.g.z = 13; car.still = false; car.g.x = 0; car.g.z = -8; steady(car, 4.5); car.g.tgt = p.uid; car.g.jostleT = 0; car.g.wreckT = 0; car.g.down = 0; al.g.jostleT = 0; R.downFree = 0; R.downUntil = 0;   // (their horses' heads two and a half metres apart)
    let cr = null; for (let i = 0; i < 120 && !cr; i++) { p.hp = p.maxHp; steady(car, 4.5); al.g.cool = 99; al.g.ca = Math.PI; al.g.a = Math.PI; R3.step(R, { mx: 0.01 }); for (const e of R.fx) if (e.k === "crash") cr = { fell: e.fell, me: e.me, n: e.n, n1: e.n1, a: car.g.wreckT > R.t && car.g.cv === 0, b: al.g.wreckT > R.t, down: car.g.down > 1 }; R.fx.length = 0; }
    ok(!!cr && cr.fell && cr.me && cr.a && cr.b && cr.down && cr.n > 0 && cr.n1 > 0, "A chariot that runs into another at speed stops both dead, throws their men down on the deck, and costs both health (" + (cr ? (cr.n / 10).toFixed(1) + "% and " + (cr.n1 / 10).toFixed(1) + "%" : "they never met") + ")");
    // A car whose man is killed stands where it stopped, in the way of everything from then on: with its team, if they
    // still stand. Brought down by a heavy blow it is wrecked, its team is down, and only the car itself is in the way.
    const T_ = R3.TEAM, set = (u, x) => { u.g.car = true; u.g.rad = 1.25; u.g.team = 2; u.g.entered = true; u.g.x = x; u.g.z = -4; u.g.ca = 0; u.g.a = 0; u.g.cv = 0; u.g.wreckT = 0; u.g.jostleT = 0; u.g.bumpT = 0; u.g.down = 0; u.g.fell = null; u.hp = u.maxHp; u.still = false; };
    car.g.x = 40; car.g.z = 45; car.g.entered = false; set(al, -5); al.g.killHeavy = false; set(b, 5); b.g.killHeavy = true; p.g.x = 0; p.g.z = 12; al.hp = 0; b.hp = 0; R3.step(R, {}); R.fx.length = 0;
    const stood = R.blocks.find((x) => x.uid === al.uid), wreck = R.blocks.find((x) => x.uid === b.uid);
    // (walked at from straight in front of where it stopped, along its own line)
    const walkAt = (k) => { if (!k) return 0; const ex = Math.sin(k.a), ez = Math.cos(k.a); p.g.x = k.x + ex * (T_.z + T_.r + 4); p.g.z = k.z + ez * (T_.z + T_.r + 4); p.g.wx = p.g.wz = 0; p.g.busy = 0; R.downUntil = 0; for (let i = 0; i < 60 * 3; i++) { p.hp = p.maxHp; R3.step(R, { mx: -ex, mz: -ez }); R.fx.length = 0; } return (p.g.x - k.x) * ex + (p.g.z - k.z) * ez; };
    const s1 = walkAt(stood), s2 = walkAt(wreck);
    ok(al.g.wrecked === false && b.g.wrecked === true && !!stood && stood.nl > 0 && !!wreck && wreck.nl === 0 && s1 >= T_.z + T_.r - 0.1 + p.g.rad - 0.03 && s1 < T_.z + T_.r + p.g.rad + 0.3 && s2 > 1.4 && s2 < 1.9,
      "A car whose man is killed stays in the way: with its team still standing you are stopped " + s1.toFixed(1) + " m before its deck's middle; one wrecked by a heavy blow has its team down, and you walk over that ground to the car itself (" + s2.toFixed(1) + " m)"); }
  try { C.settle("flee"); C.end(); } catch (x) {}
}
{
  const K = fresh(43); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("e_spar", null), R = R3.begin(B, {}), p = C.player();
  const full = R3.tire(R), l0 = R3.nextBlow(R).land; p.hp = Math.round(p.maxHp * 0.5); const half = R3.tire(R); p.hp = Math.round(p.maxHp * 0.25); const quarter = R3.tire(R), l1 = R3.nextBlow(R).land; p.hp = 1; const last = R3.tire(R);
  ok(full === 1 && half === 1 && quarter > 1.12 && quarter < 1.18 && last > 1.28 && last <= 1.3 && Math.abs(l1 / l0 - quarter) < 1e-6, "Hurt, your blows are slower: as before with half your health or more, " + Math.round((quarter - 1) * 100) + "% longer at a quarter, " + Math.round((last - 1) * 100) + "% with almost nothing left");
  // and a foe is slower hurt, as you are
  const e = B.units.find((u) => u.side === "enemy" && u.g); e.hp = e.maxHp; const f1 = R3.tireOf(e); e.hp = Math.round(e.maxHp * 0.25); const f2 = R3.tireOf(e); e.g.wind2 = true; const f3 = R3.tireOf(e); e.g.wind2 = false;
  ok(f1 === 1 && f2 > 1.12 && f2 < 1.18 && f3 === 1, "A foe tires as you do: his wind-up and his rest are " + Math.round((f2 - 1) * 100) + "% longer at a quarter of his health (not a man who fights harder hurt)");
  try { C.settle("flee"); C.end(); } catch (x) {}
}
{ // the first blow of the same fight, with the foes whole and with them at a quarter: the same blow, longer in coming
  const first = (share) => { const K = fresh(47); life(K); const C = K.Combat, R3 = K.RT3, B = C.start("e_day1", null), R = R3.begin(B, {}), p = C.player(); p.maxHp = p.hp = 100000; let w = null;
    for (let i = 0; i < 60 * 20 && !w; i++) { for (const u of B.units) if (u.side === "enemy" && u.hp > 0) u.hp = Math.max(1, Math.round(u.maxHp * share)); R3.step(R, { mx: 0.01 }); for (const x of R.fx) if (x.k === "windup" && !w) { const u = B.units.find((q) => q.uid === x.uid); if (u && u.side === "enemy" && !u.line) w = { uid: x.uid, id: x.id, wind: x.wind }; } R.fx.length = 0; }
    try { C.settle("flee"); C.end(); } catch (x) {} return w; };
  const whole = first(1), hurt = first(0.25);
  ok(!!whole && !!hurt && whole.uid === hurt.uid && whole.id === hurt.id && Math.abs(hurt.wind / whole.wind - 1.15) < 0.01, "The same first blow of the same fight takes " + (whole && hurt ? Math.round((hurt.wind / whole.wind - 1) * 100) : "?") + "% longer to wind up from a foe at a quarter of his health");
}

console.log("\n" + (fails ? fails + " of " + n + " FAILED" : "all " + n + " passed"));
process.exit(fails ? 1 : 0);
