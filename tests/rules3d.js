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

console.log("\n" + (fails ? fails + " of " + n + " FAILED" : "all " + n + " passed"));
process.exit(fails ? 1 : 0);
