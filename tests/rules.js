/* The rules of vows, divine weapons, friendships and moments (PRD §18.12), checked directly on the engine.
   Usage: node tests/rules.js */
global.window = global; global.K = {};
const G = require("path").join(__dirname, "..", "js") + "/";
["engine/i18n","engine/core","engine/flow","engine/abilities","engine/combat","content/world","content/tests","content/act1","content/roots","content/act2","content/act3","content/act4","content/act5","content/act6a","content/act6b","content/command","content/act7","content/events","content/vows","content/astras"].forEach((f) => require(G + f + ".js"));
K.save = () => true; K.emit = () => {};
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } else console.log("ok  ", m); };
const fresh = (o) => { K.S = Object.assign(K.newLife(), { name: "T", origin: "suta", age: 20, act: 3 }, o || {}); K.momentQueue.length = 0; return K.S; };
// 1. Vow prices
let S = fresh(); S.vows.push({ id: "never_lie", broken: false }); S.bonds.yudhishthira = 6; S.bonds.vidura = 5;
K.apply({ vowBreak: "never_lie" });
ok(S.bonds.yudhishthira === 3 && S.bonds.vidura === 2, "never_lie broken: watchers -3");
ok(S.curses.some((c) => c.id === "wheel"), "never_lie broken: wheel curse");
S = fresh(); S.vows.push({ id: "celibacy", broken: false }); S.attrs.wisdom = 4; K.apply({ vowBreak: "celibacy" });
ok(S.attrs.wisdom === 3 && S.flags.includes("no_blessing"), "celibacy broken: wisdom -1, no blessing");
S = fresh(); S.vows.push({ id: "never_retreat", broken: false }); K.apply({ vowBreak: "never_retreat" });
ok(S.flags.includes("company_shaken"), "never_retreat broken: company shaken");
// 2. Friendship ends below 3
S = fresh({ friend: "bhima" }); S.bonds.bhima = 4; S.vows.push({ id: "never_retreat", broken: false });
K.apply({ vowBreak: "never_retreat" });
ok(S.friend === null && S.lostFriends[0].who === "bhima" && S.moments.some((m) => m.kind === "farewell"), "a watcher friend below 3 walks away, with a farewell");
// spare_karna breaks the friendship at once
S = fresh({ friend: "karna" }); S.bonds.karna = 9; S.vows.push({ id: "spare_karna", broken: false }); K.apply({ vowBreak: "spare_karna" });
ok(S.friend === null && S.bonds.karna === 0, "striking Karna under the vow ends the friendship");
// 3. Weapon conditions
S = fresh({ teacher: "drona" }); K.apply({ boon: "astra", astraFrom: "teacher" });
ok(S.astra.from === "drona" && S.moments.some((m) => m.kind === "astra" && m.from === "drona"), "astra from Drona, with its moment");
K.breakTags(["strike_unarmed"]);
ok(!S.boons.includes("astra") && S.astra.broken, "Drona takes the weapon back when the condition is broken");
S = fresh(); K.apply({ boon: "astra", astraFrom: "penance" }); K.breakTags(["strike_unarmed"]);
ok(S.boons.includes("astra") && S.curses.some((c) => c.id === "astra_condition"), "penance weapon stays, its mantra will fail");
S = fresh({ teacher: "hermit" }); K.apply({ boon: "astra", astraFrom: "mauni" }); K.apply({ flag: "betrayed_hermit" });
ok(!S.boons.includes("astra"), "telling who taught you breaks Mauni's condition");
// 4. My word
S = fresh({ act: 5 }); S.vows.push({ id: "never_lie", broken: false });
const sc = { id: "x", choices: [] }, c = { id: "c", check: { attr: "wisdom", skill: "statecraft", dc: 99, pass: { text: "P" }, fail: { text: "F" } } };
let r = K.choose(sc, c); ok(r.check.pass && r.check.word, "My word: a statecraft test passes without a roll");
r = K.choose(sc, c); ok(!r.check.pass && !r.check.word, "My word: only once in each act");
ok(K.merits({ attr: "wisdom", skill: "statecraft" }).n >= 1, "honest persuasion +1 under the vow");
// 5. Preview of a breaking choice
S = fresh({ friend: "arjuna" }); S.bonds.arjuna = 5; S.vows.push({ id: "spare_unarmed", broken: false });
const pv = K.preview({ tags: ["strike_unarmed"], fx: {} }).map((x) => x[1]).join(" | ");
ok(/Breaks vow/.test(pv) && /will not forgive it/.test(pv) && /Ends your friendship with Arjuna/.test(pv), "preview names the vow, the watchers and the friendship: " + pv);
// 6. A spared foe returns the favour
S = fresh(); S.vows.push({ id: "spare_unarmed", broken: false }); S.spared = 1;
K.ENCOUNTERS.t_enc = { id: "t_enc", lethal: true, lose: {} };
const o = K.combatOutcome("t_enc", "lose", "next_scene");
ok(S.alive && S.flags.includes("saved_by_spared") && o.next === "next_scene", "a spared soldier drags you out once");
// 7. Penance and reconciliation
S = fresh(); S.vows.push({ id: "never_lie", broken: false }); S.bonds.vidura = 6; K.apply({ vowBreak: "never_lie" }); K.apply({ penance: "never_lie" });
ok(S.penanceDone === "never_lie" && !S.curses.some((c) => c.id === "wheel" && !c.fired) && S.bonds.vidura === 5, "penance lifts the price");
S = fresh(); S.lostFriends = [{ who: "bhima" }]; S.bonds.bhima = 1; K.apply({ reconcile: "bhima" });
ok(S.friend === "bhima" && S.bonds.bhima >= 4 && !S.lostFriends.length, "a lost friend can come back");
// 8. Moments for teacher, marriage, vow, company; none for a twice-failed Charu
S = fresh(); K.apply({ set: { teacher: "kripa" } }); K.apply({ set: { spouse: "madhavi" } }); K.apply({ vowTake: "never_lie" }); K.apply({ flag: "role_command" });
ok(["teacher", "marriage", "vow", "company"].every((k) => S.moments.some((m) => m.kind === k)), "teacher, marriage, vow and company moments");
S = fresh(); K.apply({ set: { friend: "charu" }, flag: "missed_lamp_twice" });
ok(!S.moments.some((m) => m.kind === "friend"), "no friendship moment for Charu after two failed tries");
// 9. Before-scenes
S = fresh({ friend: "charu", act: 3 }); S.vows.push({ id: "never_lie", broken: false });
ok(K.resolveScene("a3_rajasuya").id === "v_word", "the lie scene comes before the Rajasuya when it applies");
S.seen.push("v_word"); ok(K.resolveScene("a3_rajasuya").id === "a3_rajasuya", "and only once");
// 10. A gift grows after fifteen years kept
S = fresh({ age: 20 }); S.vows.push({ id: "spare_unarmed", broken: false, age: 19 });
const n1 = K.merits({ attr: "grace", skill: "stealth" }).n; S.age = 35;
ok(n1 === 1 && K.merits({ attr: "grace", skill: "stealth" }).n === 2, "the common people's warnings grow after fifteen years kept");
// 11. The Karna pull comes before Karna's secret, after the captive scene
S = fresh({ friend: "bhima", act: 5 }); S.vows.push({ id: "spare_karna", broken: false }); S.seen.push("v_captive");
ok(K.resolveScene("a5_karna_secret").id === "v_ford", "the ford scene comes when the vow and a Pandava friend apply");
// 12. Rising to command and holding fights (PRD §18.3)
S = fresh({ act: 6, age: 44 }); S.flags.push("role_command");
ok(K.rankOf(S) === "role_command", "a company leader's rank");
S.flags.push("role_division", "role_council"); ok(K.rankOf(S) === "role_council", "the highest rank wins");
S = fresh({ act: 6, age: 44, side: "pandava" }); S.flags.push("role_command"); S.attrs.command = 5; S.record.won = 3; S.record.last = "won";
ok(K.resolveScene("a6_bhishma").id === "cmd_promotion_1", "the promotion comes before Bhishma's fall");
S = fresh({ act: 6, age: 44, side: "pandava", path: "strategist" }); S.flags.push("role_command", "role_division");
let HB = K.Combat.start("hold_duryodhana", () => {}); const hero = HB.units.find((u) => u.hero);
hero.hp = Math.round(hero.maxHp * 0.12); let low = hero.hp, guard = 0;
while (!HB.over && guard++ < 300) { const t = HB.units.find((u) => u.side === "enemy" && u.hp > 0 && u.hero) || HB.units.find((u) => u.side === "enemy" && u.hp > 0); K.Combat.act("strike", t.uid); low = Math.min(low, hero.hp); }
ok(low >= Math.round(hero.maxHp * 0.1) - 1, "a champion in a holding fight cannot be brought below a tenth: " + low + "/" + hero.maxHp);
ok(HB.over === "lose" || HB.round > 8, "a holding fight is won only by outlasting it (" + HB.over + " at round " + HB.round + ")");
S = fresh({ act: 6, age: 44, side: "kaurava" }); S.flags.push("role_command", "role_division", "council_flank", "council_flank_chariot");
ok(K.resolveScene("a6_day17").id !== "hold_bhima_offer", "choosing the chariot flank keeps Bhima's charge away");
S = fresh({ act: 6, age: 44 }); S.flags.push("line_broken"); K.Combat.start("e_last_stand", () => {});
ok(!S.flags.includes("line_broken"), "a broken line is paid for in the next deadly fight, once");
// 19. Tapas (§18.8): a point an act for each kept vow, two for celibacy; a broken vow halves it
S = fresh({ act: 3, tapas: 0 }); S.vows.push({ id: "never_lie", broken: false }, { id: "celibacy", broken: false });
K.SCENES.zz_next = { id: "zz_next", act: 4, age: 24, body: ["x"], choices: [] }; K.go("zz_next");
ok(S.tapas === 3, "tapas +1 for a kept vow and +2 for celibacy at the turn of an act (" + S.tapas + ")");
S.tapas = 9; K.apply({ vowBreak: "never_lie" });
ok(S.tapas === 4, "a broken vow halves tapas (" + S.tapas + ")");
S = fresh({ tapas: 19 }); K.apply({ tapas: 5 }); ok(S.tapas === 20, "tapas holds at 20");
ok(K.preview({ fx: { tapas: -3 } }).some((x) => /Costs 3 tapas/.test(x[1])), "preview: Costs n tapas");
// 20. Named weapons: granted, a moment with the name; a condition broken costs by the giver
S = fresh(); K.apply({ astraGrant: { id: "varuna", from: "lake_sage" } });
ok(S.astras.length === 1 && S.moments.some((m) => m.kind === "astra" && m.which === "varuna"), "Varunastra granted, with its named moment");
K.breakTags(["lie"]);
ok(!S.astras.length, "the sage of the lake takes the Varunastra back after a lie");
S = fresh(); K.apply({ astraGrant: { id: "agneya", from: "fire_altar" } }); K.breakTags(["strike_unarmed"]);
ok(S.astras.length === 1 && S.astras[0].broken && S.curses.some((c) => c.id === "astra_condition"), "the fire's Agneyastra stays, its mantra cursed");
S = fresh({ boons: ["astra"] }); S.astra = { from: "penance" }; K.migrate && K.migrate(S);
ok(S.boons.includes("astra") && Array.isArray(S.astras), "an old save with boons:[astra] still holds its weapon");
// 21. Raksha and sanjivani each undo one death
S = fresh(); K.apply({ charge: { raksha: 1, sanjivani: 1 } });
K.apply({ die: true }); ok(S.alive && S.charges.raksha === 0 && S.charges.sanjivani === 1 && S.injuries.includes("scar"), "the raksha sutra undoes a death");
K.apply({ die: true }); ok(S.alive && S.charges.sanjivani === 0, "then the sanjivani root undoes one");
K.apply({ die: true }); ok(!S.alive, "and the third death holds");
// 22. Antardhana: a failed stealth check passes, once an act
S = fresh({ act: 5, boons: ["antardhana"] });
const sneak = { id: "s", check: { attr: "grace", skill: "stealth", dc: 99, pass: { text: "P" }, fail: { text: "F" } } };
r = K.choose({ id: "y", choices: [] }, sneak); ok(r.check.pass && S.vanishedAct === 5, "Antardhana turns a failed stealth check into a pass");
r = K.choose({ id: "y", choices: [] }, sneak); ok(!r.check.pass, "only once in an act");
// 23. Soma: +2 for a day, then -1 for the next day, then as before
S = fresh(); S.attrs.might = 4; S.attrs.aim = 1; S.attrs.grace = 1; S.attrs.wisdom = 1; S.attrs.command = 1;
S.attrs.might += 2; S.soma = { attr: "might", until: S.log.length + 3 };
for (let i = 0; i < 3; i++) { S.log.push("t" + i); K.somaTick(S, {}); }
ok(S.attrs.might === 3, "soma wears off into a day of weakness (" + S.attrs.might + ")");
for (let i = 0; i < 3; i++) { S.log.push("u" + i); K.somaTick(S, {}); }
ok(S.attrs.might === 4 && !S.soma, "then strength is as before");
// 24. At most two weapon quests offered in a life
S = fresh({ act: 5, astraOffers: 2 }); S.attrs.might = 5;
ok(!["w_fire", "w_dive", "w_riddle", "w_naga"].some((id) => K.test(K.SCENES[id].when, S)), "no third weapon quest");
S.astraOffers = 1; ok(K.test(K.SCENES.w_fire.when, S), "a second quest can still come");
// 25. The kavacha leaves one breath in a lethal fight
S = fresh({ act: 6, age: 40, side: "pandava" }); S.charges = { kavacha: 1 };
K.ENCOUNTERS.t_war = { id: "t_war", lethal: true, enemies: [{ name: "Soldier", hp: 30, atk: 99, def: 0 }], win: {}, lose: {} };
K.Combat.start("t_war", () => {}); { const B = K.Combat.state ? K.Combat.state() : null; const P = K.Combat.player(), E = B ? B.units.find((u) => u.side === "enemy") : null;
  if (E) { P.hp = 5; B.defNow = null; B.hit(E, P, 1); ok(P.hp === 1 && S.charges.kavacha === 0, "the kavacha leaves one breath after a killing blow"); B.hit(E, P, 1); ok(P.hp === 0, "and only once"); }
  else ok(false, "kavacha: no fight state to test on"); }
// 26. Friends who come to help (engine/friends.js)
require(G + "engine/friends.js");
S = fresh({ friend: "bhima", act: 3, age: 24 }); S.bonds.bhima = 6; S.bonds.karna = 8;
ok(K.friendsNear(S).join() === "karna,bhima", "a bond of 7, or a friend for life at 5, can come: " + K.friendsNear(S).join());
S.side = "pandava"; ok(!K.friendsNear(S).includes("karna"), "Karna does not come once you stand with the Pandavas");
S = fresh({ friend: "arjuna", act: 5, age: 36 }); S.bonds.arjuna = 9;
ok(!K.friendsNear(S).length, "Arjuna is away in the middle exile years");
S.age = 43; S.bonds.bhima = 9; ok(!K.friendsNear(S).length, "no prince comes in the hidden year");
S.age = 42; ok(K.friendsNear(S).includes("bhima"), "Bhima comes before the hidden year");
S = fresh({ friend: "charu" }); S.bonds.charu = 7; S.lostFriends = [{ who: "charu" }];
ok(!K.friendsNear(S).length, "a friendship that ended reaches no one");
S = fresh({ friend: "charu" }); S.bonds.charu = 7;
const h = K.friendHelp(S, { lethal: false }); ok(h.unit && h.who === "charu" && h.unit.def === 0, "Charu comes, with no armour");
// A friend hurt in a fight carries a scar; Charu can die in a deadly one.
K.friendAfter({ over: "win", enc: { lethal: false }, units: [{ side: "ally", called: true, person: "charu", hp: 5, maxHp: 34 }] }, S);
ok(S.flags.includes("scar_charu") && S.memories.some((m) => m.who === "charu"), "a friend hurt for you carries a scar, and remembers");
K.friendAfter({ over: "lose", enc: { lethal: true }, units: [{ side: "ally", called: true, person: "charu", hp: 0, maxHp: 34 }] }, S);
ok(S.dead.includes("charu"), "Charu falls in a deadly fight you called them into");
// 27. Assist never changes the engine: with the setting off, step mode is asked for as before
// With the assist off, a fight played by chance (no step mode) resolves blows exactly as before: same seed, same log.
const runFight = () => { K.seed(7); S = fresh({ act: 3, age: 24, path: "archer" }); K.Combat.stepNext = false; const B = K.Combat.start("e_bandits", () => {}); for (let i = 0; i < 12 && !B.over; i++) K.Combat.act("strike"); const out = B.log.map((l) => l.key || l.raw).join("|"); K.Combat.end(); return out; };
ok(runFight() === runFight(), "the same fight plays the same way twice: assist off changes nothing in the engine");
// 28. The night the lac house burns (§18.2)
S = fresh({ act: 3 });
ok(K.resolveScene("a3_fuse").id === "a3_fire", "the cellar scene is skipped by someone who does not know the plot");
S = fresh({ act: 3, teacher: "vidura" });
ok(K.resolveScene("a3_fuse").id === "a3_fuse", "a pupil of Vidura gets the cellar scene");
const fuse = K.SCENES.a3_fuse, fire = K.SCENES.a3_fire;
K.choose(fuse, fuse.choices.find((x) => x.id === "warn"));
ok(S.flags.includes("warned_pandavas") && S.flags.includes("bhima_debt"), "warning the Pandavas leaves Bhima in your debt");
S = fresh({ act: 3, teacher: "vidura" }); K.choose(fuse, fuse.choices.find((x) => x.id === "silent"));
ok(!S.flags.includes("bhima_debt"), "silence earns no debt");
S = fresh({ act: 3, teacher: "vidura" }); K.choose(fuse, fuse.choices.find((x) => x.id === "cut"), "win");
ok(S.flags.includes("cut_fuses") && S.flags.includes("bhima_debt"), "cutting the oil lines: cut_fuses and bhima_debt");
const run = fire.choices.find((x) => x.id === "run");
S = fresh({ act: 3, teacher: "vidura" }); S.flags.push("warned_pandavas"); S.scene = "a3_fire"; S.seen.push("a3_fire");
{ const r1 = K.choose(fire, run, "lose");
  ok(S.alive && r1.retry && r1.next === "a3_fire" && S.tryAgain && S.injuries.includes("scar") && !S.flags.includes("died_in_fire"), "a deadly test: the first failed escape is survived, burnt (a scar), with one more try");
  const rows = K.choiceList(fire);
  ok(rows.length === 1 && rows[0].c.id === "run" && rows[0].c.again && rows[0].c.t === "Try again" && /does not let go/.test(rows[0].c.trial.stakes[1]), "the scene then offers only \"Try again\", with the last chance's stakes");
  K.go("a3_fire");
  ok(K.S.scene === "a3_fire" && K.resumed === K.visit, "the second try comes back to the same scene, as a return (its page whole)");
  const r2 = K.choose(fire, rows[0].c, "lose");
  ok(!S.alive && S.flags.includes("died_in_fire") && !r2.retry && !S.tryAgain && r2.next === "end_death", "a deadly test: a second failure is death"); }
const endF = K.composeEnding(S); ok(endF.title === "The burnt house" && endF.art === "end_fire", "the fire death has its own ending");
S = fresh({ act: 3, storyMode: true }); S.flags.push("warned_pandavas"); K.choose(fire, run, "lose");
ok(S.alive && S.flags.includes("lac_burnt"), "story mode: burnt, not killed");
S = fresh({ act: 3 }); S.flags.push("warned_pandavas"); S.lacCarried = 1; K.choose(fire, run, "win");
ok(S.flags.includes("escaped_lac") && S.flags.includes("carried_out_lac"), "carrying a sleeper out is remembered");
ok(K.ENDINGS.some((e) => e.title === "The burnt house" && e.art === "end_fire"), "the burnt house is in the endings list");
// 29. Episodes (content/episodes.js): where they come, keepsakes, the telling
require(G + "content/episodes.js");
S = fresh({ act: 1, age: 6 });
ok(K.resolveScene("a1_first").id === "ep_sibling", "the elder sibling is asked about before the first scene");
K.apply({ set: { sibling: "devi" }, flag: "has_sibling" }); S.seen.push("ep_sibling");
ok(K.resolveScene("a1_first").id === "a1_first", "and only once");
ok(K.BEFORE.a3_rajasuya[0] !== "ep_mentor_vidura" && K.BEFORE.a3_rajasuya.includes("ep_mentor_vidura"), "episodes join the vow scenes before the Rajasuya, after them");
S = fresh(); K.apply({ keepsake: "letter" }); K.apply({ keepsake: "letter" });
ok(S.keepsakes.length === 1 && S.keepsakes[0] === "letter", "a keepsake is kept once");
S = fresh({ act: 6, side: "kaurava" }); K.apply({ flag: ["beat_ugra", "ugra_across"] });
ok(K.resolveScene("a6_day18").id === "a6_day18", "Ugra, beaten fairly at the fair, fights beside you and is never across the field");
ok(K.warAllies(S).includes("ugra"), "... he is in your line");
S = fresh({ act: 6, side: "kaurava" }); K.apply({ flag: ["shamed_ugra", "ugra_across"] });
ok(K.resolveScene("a6_day18").id === "ep_ugra_last", "Ugra, shamed at the fair, meets you across the field on the seventeenth day");
ok(!K.warAllies(S).includes("ugra"), "... and is never in your line");
S = fresh({ act: 7, age: 45, path: "archer", side: "pandava" }); K.apply({ flag: ["carried_false_orders", "bard_wrong"] });
const tl = K.composeEnding(S).telling.map((x) => (Array.isArray(x) ? x[0] : x)).join(" | ");
ok(/false orders across the river/.test(tl) && /^.*They say that /.test(tl), "the telling carries the false orders and the bard's wrong version");
// 30. Saves and save codes (code review, 1 Nov): cleaned before use, never half a choice, Continue stays put
{
  const evil = Object.assign(K.newLife(), { scene: "a1_home", seen: ["a1_home"], temperament: "x\"><img src=x onerror=alert(1)>", injuries: undefined, bonds: { arjuna: "<img src=x>" }, name: 7 });
  delete evil.injuries;
  const code = Buffer.from(unescape(encodeURIComponent(JSON.stringify(evil)))).toString("base64");
  const s2 = K.importCode(code);
  ok(s2.temperament === null && Array.isArray(s2.injuries) && !("arjuna" in s2.bonds) && typeof s2.name === "string", "a hostile save code is cleaned: unknown temperament dropped, missing lists restored, bonds are numbers");
  let msg = ""; try { K.importCode("123"); } catch (e) { msg = e.message; }
  ok(/could not be read/.test(msg), "a save code that is not a life gives the plain message, not a TypeError");
}
S = fresh({ act: 1, age: 6 }); K.go("a1_home");
{
  const sc = K.SCENES[S.scene], c = K.choiceList(sc).find((x) => x.ok).c, before = S.log.length;
  K.choose(sc, c);
  const exported = JSON.parse(decodeURIComponent(escape(Buffer.from(K.exportCode(), "base64").toString("binary"))));
  ok(S.log.length === before + 1 && exported.log.length === before, "the save code on a result page holds the life as the scene opened (the choice is not made twice)");
}
S = fresh({ act: 6, age: 44, side: "pandava" }); K.go("a6_eve"); // reaches w_eve first (its own flag is set on entry)
{
  const at = S.scene, saved = K.cleanLife(JSON.parse(JSON.stringify(S)));
  K.resume(saved);
  ok(at === "w_eve" && K.S.scene === "w_eve", "Continue returns to the scene that was saved, even one whose own flag would skip it");
}
// 31. A slot that draws nothing still plays the scenes that come before its `then` scene
S = fresh();
K.SCENES.zz_then = { id: "zz_then", act: 3, age: 20, body: ["x"], choices: [] }; K.SCENES.zz_pre = { id: "zz_pre", act: 3, age: 20, body: ["x"], choices: [], next: "zz_then" };
K.BEFORE.zz_then = ["zz_pre"]; K.slot("zz_slot", { pool: [], then: "zz_then", none: 1 });
ok(K.resolveScene("zz_slot").id === "zz_pre", "an empty event slot hands on to the scenes before its next scene");
// 32. Soma and Bala give back exactly what they took
S = fresh(); S.attrs.might = 7; S.attrs.aim = 1; S.attrs.grace = 1; S.attrs.wisdom = 1; S.attrs.command = 1;
K.apply(K.SCENES.w_soma.choices.find((c) => c.resolve).resolve(S));
ok(S.attrs.might === 8, "Soma at might 7 reaches the cap of 8");
for (let i = 0; i < 12; i++) { S.log.push("t" + i); K.somaTick(S, {}); }
ok(S.attrs.might === 7 && !S.soma, "... and wears off back to 7, not 6 (" + S.attrs.might + ")");
S = fresh({ act: 5, age: 32, tapas: 5, exile: "forest" }); S.attrs.might = 8; S.attrs.grace = 3;
{ const sc = K.SCENES.a5_forest_boon, c = sc.choices.find((x) => x.id === "bala"); K.choose(sc, c); }
K.SCENES.zz_act6 = { id: "zz_act6", act: 6, age: 44, body: ["x"], choices: [] }; K.go("zz_act6");
ok(S.attrs.might === 8 && S.attrs.grace === 3, "Bala at might 8 wears off without costing a point (might " + S.attrs.might + ", grace " + S.attrs.grace + ")");
// 33. Story fixes
S = fresh({ act: 5, age: 43, exile: "court" }); S.seen.push("a5_matsya");
ok(K.resolveScene("a5_herd").id !== "ep_false_name", "the hidden-year scenes are only for those hiding in Matsya");
S = fresh({ act: 5, age: 43, exile: "forest" }); S.seen.push("a5_matsya", "ep_false_name"); K.apply({ flag: "left_virata" });
ok(!K.test(K.SCENES.ep_kichaka.when, S), "leaving Virata's household keeps you out of the dancing hall");
S = fresh({ act: 6, age: 44, side: "pandava", child: "vasu" }); K.apply({ flag: ["vasu_in_camp", "slowed_ashwatthama"] });
ok(!K.vasuLostInRaid(S), "holding Ashwatthama at the gate saves Vasu, in the raid's lines and in Act VII alike");
ok(K.SCENES.a6_wheel_again && K.SCENES.a6_day13.next === "a6_day14", "the wheel test comes before the day-13 scene, which goes on to day 14");
S = fresh({ act: 7, age: 45, side: "pandava" }); S.vows.push({ id: "vengeance", broken: true, released: true, age: 30 }); K.apply({ vowTake: "vengeance" });
ok(K.hasVow("vengeance", S), "a released vow of vengeance can be sworn again");
S = fresh({ act: 6, age: 44, side: "kaurava" });
{ const sc = K.SCENES.a6_raid || Object.values(K.SCENES).find((x) => (x.choices || []).some && (x.choices || []).some((c) => c.id === "refuse" && /Refuse him/.test(String(c.t)))); const c = sc.choices.find((x) => x.id === "refuse"); K.choose(sc, c); }
ok(S.flags.includes("refused_ashwatthama") && !S.flags.includes("refused_raid"), "refusing the night raid is its own flag, not refusing Matsya");
S = fresh({ act: 5, age: 43, friend: "charu" }); S.vows.push({ id: "spare_unarmed", broken: false, age: 20 }); S.dead.push("charu");
ok(!K.test(K.SCENES.v_captive.when, S), "a dead friend does not ask you to silence a spy");
// 34. A leader's mark: allies turn on the enemy you pick out; Command makes them hit it harder
S = fresh({ act: 6, age: 44, side: "pandava" });
{ const B = K.Combat.start("e_guard", () => {}); ok(!K.Combat.canMark(), "without a command rank there is no mark"); K.Combat.end && K.Combat.end(); }
S = fresh({ act: 6, age: 44, side: "pandava" }); S.flags.push("role_command"); S.attrs.command = 6;
{
  const B = K.Combat.start("e_guard", () => {});
  const foes = B.units.filter((u) => u.side === "enemy");
  const pick = foes[foes.length - 1];
  ok(K.Combat.canMark() && K.Combat.mark(pick.uid) && K.Combat.marked() === pick.uid, "a company leader marks the enemy they pick out");
  ok(B.markBonus === 2, "command 7 or more (6, +1 for age) adds 2 to their blows against the mark (" + B.markBonus + ")");
  for (let i = 0; i < 4 && !B.over && pick.hp > 0; i++) K.Combat.act("guard");
  // Blows that land on every enemy at once (a volley) are left out: only aimed blows choose a target.
  const area = new Set(Object.values(K.ABILITIES).filter((a) => a.target === "enemies" && a.verb).map((a) => a.verb));
  const hits = B.log.filter((l) => l.u && l.u.a && l.u.a.side === "ally" && l.u.t && l.u.t.side === "enemy" && !area.has(l.key) && !/^Arrows rain/.test(l.key));
  ok(hits.length > 0 && hits.every((l) => l.u.t.uid === pick.uid || pick.hp === 0), "those beside you strike only the marked enemy while it stands (" + hits.length + " blows)");
  K.Combat.end && K.Combat.end();
}
// 35. You never grow younger (except waking from the prologue); Continue keeps your age
S = fresh({ act: 5, age: 41 }); S.scene = "w_mountain"; S.seen.push("w_mountain");
{ const sc = K.SCENES.ep_storm; const keep = sc.when; sc.when = null; K.go("ep_storm"); sc.when = keep; }
ok(K.S.age === 41, "a scene written younger than the one before it does not make you younger (" + K.S.age + ")");
S = fresh({ act: 1, age: 44 }); S.scene = "a0_dream"; K.go("a1_home");
ok(K.S.age === 6, "waking from the prologue's dream, you are six (" + K.S.age + ")");
S = fresh({ act: 2, age: 16 }); S.scene = "a2_teacher"; S.seen.push("a2_teacher"); K.go("a2_teacher", true);
ok(K.S.age === 16, "Continue on a scene keeps the age you had there (" + K.S.age + ")");
ok(K.SCENES.w_mountain.age <= 36 && K.SCENES.v_hold.age >= 42 && K.SCENES.ep_mentor_vidura.age >= 29, "the mountain, the river vow and Vidura's scene carry ages in story order");
// 36. The false-name test is a lie; those sworn never to lie have a truthful way through
{ const ch = K.SCENES.ep_false_name.choices; const nerve = ch.find((c) => c.id === "nerve"), truth = ch.find((c) => c.id === "truth");
  ok(nerve && (nerve.tags || []).includes("lie"), "answering the steward with a false name is tagged as a lie");
  S = fresh({ act: 5, age: 43 }); K.apply({ vowTake: "never_lie" });
  ok(K.vowBreaksFor(nerve.tags, S).length === 1, "a vow never to lie is warned of on the false-name test");
  ok(truth && K.test(truth.req, S) && !(truth.tags || []).includes("lie"), "a vow-holder can answer with only true things instead");
  S = fresh({ act: 5, age: 43 });
  ok(!K.test(truth.req, S), "without the vow, the truthful answer is not offered"); }
// 37. Step-mode fights never wait on nothing: stunned foes lose their turn, fallen foes are passed over
S = fresh({ act: 2, age: 18, path: "archer" }); S.attrs.aim = 8;
{
  const C = K.Combat; const B = C.start("e_bandits", () => {}); B.stepMode = true;
  let stuck = 0;
  for (let r = 0; r < 30 && !B.over; r++) {
    B.units.filter((u) => u.side === "enemy" && u.hp > 0).forEach((u) => { u.status.stun = 1; });
    const acted = C.act("strike", B.units.find((u) => u.side === "enemy" && u.hp > 0).uid);
    if (!acted) { stuck++; break; }
    for (let g = 0; g < 10 && C.foesPending(); g++) C.resolve(null);
  }
  ok(!stuck, "with every foe stunned, your move is always taken and the foes' turns always finish");
  C.end && C.end();
  const B2 = C.start("e_bandits", () => {}); B2.stepMode = true;
  C.act("guard"); // foes are now queued
  B2.units.filter((u) => u.side === "enemy").forEach((u) => { u.hp = u.side === "enemy" && u !== B2.units.find((x) => x.side === "enemy") ? 0 : u.hp; });
  B2.queue = B2.units.filter((u) => u.side === "enemy" && u.hp === 0).map((u) => u.uid);
  ok(!C.foesPending() && B2.queue === null && C.act("strike") === true, "a queue of fallen foes is closed, and it is your turn");
  C.end && C.end();
}
// 38. Your child on the field (war_child.js): the thread on the eve, and a fate decided by what he lived through
["content/episodes", "content/war_reach", "content/war_child"].forEach((f) => require(G + f + ".js"));
{
  const kid = (side, o) => { const S = fresh(Object.assign({ act: 6, age: 44, side, child: "vasu" }, o)); S.flags.push("vasu_away"); return S; };
  S = kid("pandava"); K.go("a6_day1");
  ok(K.S.scene === "wc_child_eve", "a child sent to another company comes to the eve scene first (" + K.S.scene + ")");
  K.choose(K.SCENES.wc_child_eve, K.SCENES.wc_child_eve.choices.find((c) => c.id === "satyaki"));
  ok(S.flags.includes("child_cmd_satyaki") && S.moments.some((m) => m.kind === "child_eve" && m.who === "vasu"), "choosing his commander ties the thread, with its moment");
  S.flags.push("child_line_held");
  ok(!K.childInRaidCamp(S) && !K.vasuLostInRaid(S), "unhurt under Satyaki, he is away from the camp on the night of the raid");
  S.flags.push("child_fell");
  ok(K.childHurt(S) && K.childInRaidCamp(S) && K.vasuLostInRaid(S), "hurt and not got out, he lies in the camp, and dies there unless the raid is stopped");
  S.flags.push("woke_camp"); ok(!K.vasuLostInRaid(S), "waking the camp saves him");
  S = kid("pandava"); S.flags.push("child_cmd_virata", "child_line_held");
  ok(K.childInRaidCamp(S) && K.vasuLostInRaid(S), "under Virata he sleeps in the camp whatever his day was");
  ok(typeof K.SCENES.a6_raid.choices.find((c) => c.id === "wake").hint === "function" && K.val(K.SCENES.a6_raid.choices.find((c) => c.id === "wake").hint, S) === "The only way to reach Vasu", "waking the camp is named as the only way to reach him");
  S = kid("kaurava"); S.flags.push("child_cmd_ashwatthama", "child_line_broken"); K.go("a6_duryodhana");
  ok(K.S.scene === "wc_child_dusk" && S.dead.includes("vasu") && /last day/.test(K.childDeath(S)), "Kaurava side: hurt on his day, he falls on the last day, and the fates say where");
  S = kid("kaurava"); S.flags.push("child_cmd_ashwatthama", "child_line_held"); K.go("a6_duryodhana");
  ok(!S.dead.includes("vasu") && S.flags.includes("child_survived_war"), "Kaurava side: held beside you, he lives");
}
// 39. On his day he goes down; dragging him out, or a friend called in, saves him
{
  const S0 = fresh({ act: 6, age: 44, side: "pandava", child: "vasu", friend: "bhima" }); S0.bonds.bhima = 8; S0.flags.push("vasu_away", "child_cmd_virata");
  let B = K.Combat.start("wc_e_child_line", () => {});
  let v = B.units.find((u) => u.person === "vasu");
  ok(!!v, "Vasu fights beside you on his day");
  v.hp = 0; const h = K.ENCOUNTERS.wc_e_child_line.callHelp(S0);
  ok(h.unit && h.unit.person === "bhima" && /stands over him/.test(K.text(h.text)), "with Vasu down, the friend you call goes to him");
  h.run(B); ok(v.hp > 0 && B.shielded, "and stands over him until he can get up");
  B.over = "win"; K.childFightEnd(B); K.Combat.end();
  ok(S0.flags.includes("child_saved") && !K.childHurt(Object.assign(S0, { flags: S0.flags.concat("child_line_broken") })), "a shielded child counts as saved, even when the line breaks");
  const S1 = fresh({ act: 6, age: 44, side: "kaurava", child: "vasu" }); S1.flags.push("vasu_away", "child_cmd_bhurishravas");
  B = K.Combat.start("wc_e_child_line", () => {}); v = B.units.find((u) => u.person === "vasu"); v.hp = 0; B.over = "win"; K.childFightEnd(B); K.Combat.end();
  ok(S1.flags.includes("child_fell") && K.childHurt(S1), "left where he fell, he is hurt");
}
// 40. The Shakti spent: what you say to Karna on the fourteenth night is what he answers on the seventeenth
{
  const call = K.SCENES.wc_shakti_call, pick = (id) => call.choices.find((c) => c.id === id);
  S = fresh({ act: 6, age: 44, side: "kaurava", friend: "karna", origin: "anga" }); S.bonds.duryodhana = 5;
  ok(K.test(K.SCENES.wc_shakti_k.when, S) && K.resolveScene("a6_day15").id === "wc_shakti_k", "beside Karna, the night of day 14 comes before the dawn");
  const gh = K.ENCOUNTERS.wc_e_ghost.callHelp(S);
  ok(gh.unit && gh.unit.person === "karna" && K.ENCOUNTERS.wc_e_ghost.hold, "against Ghatotkacha's night form you can only hold, and the call brings Karna");
  K.choose(call, pick("use"));
  ok(S.bonds.duryodhana === 7 && S.moments.some((m) => m.kind === "shakti" && m.from === "kaurava"), "urging him to use it: Duryodhana +2, and the spear's moment");
  ok(K.val(K.SCENES.a6_day17.body, S).some((b) => b && b.speaker === "Karna" && /Do not carry that/.test(b.line)), "on day 17 his last words forgive you");
  S = fresh({ act: 6, age: 44, side: "kaurava", friend: "karna" }); K.choose(call, pick("keep"));
  ok(/You were right/.test(K.karnaLastWords(S)), "urging him to keep it: his last words say you were right");
  S = fresh({ act: 6, age: 44, side: "kaurava", friend: "karna" }); S.flags.push("calmed_the_horse"); K.choose(call, pick("silent"));
  ok(/horse in the stable yard/.test(K.karnaLastWords(S)), "silent: his last words are about the horse, from childhood");
  S = fresh({ act: 6, age: 44, side: "kaurava" }); ok(!K.val(K.SCENES.a6_day17.body, S).some((b) => b && b.speaker === "Karna"), "no last words for those who were not there");
  S = fresh({ act: 6, age: 44, side: "pandava", friend: "bhima" });
  ok(K.resolveScene("a6_day15").id === "wc_shakti_p", "beside Bhima's son, the Pandava side tries to reach Karna's chariot");
  K.combatOutcome("wc_e_reach", "win", "wc_shakti_p_fall");
  ok(S.flags.includes("shakti_tried_stop") && S.memories.some((m) => m.who === "bhima"), "the attempt is remembered, by Bhima");
  K.go("wc_shakti_p_fall"); ok(S.moments.some((m) => m.kind === "shakti" && m.from === "pandava"), "the spear still flies, seen from the Pandava side");
}
// 41. War storylines (PRD 18.13): Bhurishravas on day 14 and the kings' fall on day 15 (content/war_kings.js)
require(G + "content/war_kings.js");
{
  const sc = (id) => K.SCENES[id], ch = (id, cid) => K.val(sc(id).choices, K.S).find((c) => c.id === cid);
  const war = (o, flags) => { const s = fresh(Object.assign({ act: 6, age: 44 }, o)); s.flags.push(...(flags || ["role_front"])); return s; };
  S = war({ side: "pandava", origin: "anga", court: "anga" });
  ok(K.test(sc("kb_ride").when, S) && !K.test(sc("kb_drag").when, S), "every Pandava fighter is ordered to ride with Satyaki, and meets Bhurishravas only by riding");
  S.flags.push("kb_rode");
  ok(K.test(sc("kb_drag").when, S), "riding with Satyaki leads to Bhurishravas");
  S = war({ side: "kaurava", origin: "anga", court: "hastinapura" });
  ok(K.test(sc("kb_drag").when, S), "a Kuru court fighter on the Kaurava side is in Bhurishravas's division");
  S = war({ side: "kaurava", origin: "mathura", court: "hastinapura" }, ["role_healer"]);
  ok(!K.test(sc("kb_drag").when, S), "healers stay in the tents");
  // The hold: Bhurishravas is held off Satyaki, never killed, and the rounds held are counted.
  S = war({ side: "pandava", origin: "mathura", path: "archer" }); S.attrs.aim = 6; S.attrs.might = 5;
  {
    const C = K.Combat, B = C.start("e_kb_hold", () => {});
    const bh = B.units.find((u) => u.person === "bhurishravas");
    for (let i = 0; i < 12 && !B.over; i++) C.act(i % 3 === 2 ? "guard" : "strike", bh.uid);
    ok(B.over && bh.hp >= Math.round(bh.maxHp * 0.1) - 1, "Bhurishravas cannot be brought down in the hold (" + bh.hp + " of " + bh.maxHp + ", " + B.over + ")");
    K.kbHoldCount(B);
    ok(S.kbHeld >= 0 && S.kbHeld <= 6 && (B.over !== "win" || S.kbHeld === 6), "the rounds held are counted (" + S.kbHeld + ", " + B.over + ")");
    const r2 = K.combatOutcome("e_kb_hold", B.over, "a6_day14");
    ok(r2.next === "kb_sits" && /takes off his arm/.test(r2.text), "however long you held, Arjuna's arrow takes the arm, and Bhurishravas sits down");
    C.end && C.end();
  }
  // Holding his arm for Satyaki breaks the vow never to strike the unarmed, with its full price.
  S = war({ side: "pandava", origin: "mathura", teacher: "drona" }); S.vows.push({ id: "spare_unarmed", broken: false, age: 20 }); S.bonds.arjuna = 6;
  K.apply({ boon: "astra", astraFrom: "teacher" });
  K.choose(sc("kb_sits"), ch("kb_sits", "arms"));
  ok(S.vows[0].broken && S.bonds.arjuna === 3 && S.bonds.satyaki === 6 && !S.boons.includes("astra"), "holding Bhurishravas's arm breaks the vow (Arjuna -3, Drona's weapon taken back) and Satyaki +3");
  S = war({ side: "pandava", origin: "mathura" }); const c5 = S.duty.conscience;
  K.choose(sc("kb_sits"), ch("kb_sits", "stop"));
  ok(S.duty.conscience === c5 + 2 && S.bonds.satyaki === 0 && S.memories.some((m) => m.who === "yudhishthira") && S.flags.includes("kb_tried_stop"), "trying to stop Satyaki: conscience +2, Satyaki -3, Yudhishthira remembers, pass or fail");
  ok(K.val(sc("kb_sits").choices, war({ side: "kaurava", court: "hastinapura" })).every((c) => ["carry", "leave"].includes(c.id)), "on the Kaurava side you come too late, and can only carry him back");
  // The kings: your court first, then the land you were born in.
  S = war({ side: "pandava", origin: "panchala", court: "indraprastha" });
  ok(K.test(sc("kf_reach").when, S) && K.val(sc("kf_reach").title, S) === "Drupada's parasol", "a Panchala-born Pandava reaches for Drupada");
  S = war({ side: "pandava", origin: "panchala", court: "matsya" });
  ok(K.val(sc("kf_reach").title, S) === "Virata's parasol", "in Virata's service, Virata is your king");
  ok(!K.test(sc("kf_reach").when, war({ side: "kaurava", origin: "panchala" })), "not on the Kaurava side");
  S = war({ side: "pandava", origin: "matsya" });
  K.choose(sc("kf_fall"), sc("kf_fall").choices[0], "lose");
  ok(S.flags.includes("kf_carried_king") && S.injuries.includes("arm"), "failing the carry costs a wound, not the body");
  // Riding with Dhrishtadyumna breaks a student's debt to Drona for good, and Drona takes his weapon back.
  ok(Array.isArray(K.val(sc("a6_day15").after, war({ side: "pandava", origin: "anga" }))), "for everyone else it closes the day as before");
  S = war({ side: "pandava", origin: "panchala", teacher: "drona" }); S.duty.teacher = 7; S.seen.push("kf_fall");
  K.apply({ boon: "astra", astraFrom: "teacher" });
  ok(K.val(sc("a6_day15").after, S) === null, "the half-truth's closing line waits for Dhrishtadyumna's sword");
  K.choose(sc("kf_drona"), ch("kf_drona", "ride"));
  ok(S.duty.teacher === 0 && S.flags.includes("kf_broke_debt") && !S.boons.includes("astra") && S.astra.broken, "riding with Dhrishtadyumna: teacher's debt to 0, Drona's weapon taken back");
  // A Kaurava student who steps between, out of depth: death; in story mode, a scar.
  for (const story of [false, true]) {
    S = war({ side: "kaurava", teacher: "drona", storyMode: story }); S.attrs.might = 1; S.skills.mace = 0;
    const step = ch("kf_drona", "step"), rng = K.rng; K.rng = () => 0;
    ok(K.inPeril(step, S), "stepping between, out of your depth, is perilous");
    K.choose(sc("kf_drona"), step); K.rng = rng;
    ok(story ? S.alive && S.injuries.includes("scar") : !S.alive && /Dhrishtadyumna's sword/.test(S.deathText), story ? "story mode: a scar instead" : "out of your depth: Dhrishtadyumna's sword does not stop");
  }
  // Taking word home: the rest of the night in the camp is passed by, and the road picks up on day 16.
  S = war({ side: "pandava", origin: "panchala" }, ["role_front", "role_division", "role_council"]); S.seen.push("kf_fall", "kf_drona", "kf_word");
  ok(K.resolveScene("a6_day16").id === "kb_debate", "staying, the night debate comes first");
  S.seen.push("kb_debate");
  ok(K.resolveScene("a6_day16").id === "cmd_council_2", "then the night council, before the sixteenth day");
  S.seen.pop();
  K.choose(sc("kf_word"), ch("kf_word", "home"));
  ok(S.flags.includes("kf_took_word") && S.missed.includes("cmd_council_2") && S.missed.includes("kb_debate") && K.resolveScene("a6_day16").id === "a6_day16", "riding home, the night is missed and the war's road goes on at day 16");
}
// 42. War storyline (PRD 18.13): the great duel on day 17 (content/war_duel.js)
require(G + "content/war_duel.js");
{
  const sc = (id) => K.SCENES[id];
  const war = (o, flags) => { const s = fresh(Object.assign({ act: 6, age: 44 }, o)); s.flags.push(...(flags || ["role_front"])); return s; };
  ok(K.BEFORE.a6_day17.includes("kd_son") && K.BEFORE.a6_day17.includes("kd_guard"), "both sides of the duel come before the wheel scene");
  ok(K.test(sc("kd_son").when, war({ side: "kaurava" })) && !K.test(sc("kd_son").when, war({ side: "kaurava" }, ["role_healer"])), "Kaurava fighters ride beside Vrishasena; healers stay in the tents");
  // Holding him: rounds counted; four or more and Karna's bond rises and his last words name it.
  S = war({ side: "kaurava", path: "archer" }); S.attrs.aim = 6; S.attrs.might = 5; S.bonds.karna = 4;
  {
    const C = K.Combat, B = C.start("kd_e_son", () => {});
    ok(B.units.some((u) => u.person === "vrishasena" && u.side === "ally"), "Vrishasena fights beside you");
    const ar = B.units.find((u) => u.person === "arjuna");
    for (let i = 0; i < 14 && !B.over; i++) C.act(i % 3 === 2 ? "guard" : "strike", ar.uid);
    ok(B.over && ar.hp >= Math.round(ar.maxHp * 0.1) - 1, "Arjuna is held off, never brought down (" + B.over + ")");
    K.kdHoldCount(B);
    ok(S.kdHeld >= 0 && S.kdHeld <= 6 && (B.over !== "win" || S.kdHeld === 6), "the rounds held are counted (" + S.kdHeld + ")");
    C.end && C.end();
  }
  S = war({ side: "kaurava" }); S.bonds.karna = 4; S.kdHeld = 6;
  const r1 = K.combatOutcome("kd_e_son", "win", "a6_day17");
  ok(S.bonds.karna === 6 && S.flags.includes("kd_stood") && /Vrishasena's throat/.test(r1.text), "held to the end: Karna +2, and Vrishasena still falls");
  ok(/my son's wheel/.test(K.karnaLastWords(S)) && K.val(sc("a6_day17").body, S).some((b) => b && b.speaker === "Karna"), "his last words name it");
  S.flags.push("shakti_urged_keep");
  ok(/my son.s wheel/.test(K.karnaLastWords(S)[0]) && /keep the spear/.test(K.karnaLastWords(S)[1]) && K.val(sc("a6_day17").body, S).filter((b) => b && b.speaker === "Karna").length === 2, "joined to what you told him on the fourteenth night, one set of last words");
  S = war({ side: "kaurava" }); S.bonds.karna = 4; S.kdHeld = 2; S.flags.push("shakti_urged_keep");
  const r2 = K.combatOutcome("kd_e_son", "flee", "a6_day17");
  ok(S.bonds.karna === 2 && S.flags.includes("kd_withdrew") && /Vrishasena's throat/.test(r2.text), "withdrew early: Karna -2, and Vrishasena still falls");
  ok(K.karnaLastWords(S) === null && !K.val(sc("a6_day17").body, S).some((b) => b && b.speaker === "Karna"), "he does not look at you again: no last words, warm or otherwise");
  S = war({ side: "kaurava" }); S.kdHeld = 5; K.combatOutcome("kd_e_son", "lose", "a6_day17");
  ok(S.flags.includes("kd_stood"), "four rounds or more counts, even if you went down after");
  { const pull = sc("a6_day17").choices.find((c) => c.id === "pull").req, s2 = war({ side: "kaurava" }); const before = K.test(pull, s2); s2.seen.push("kd_son"); ok(!before && K.test(pull, s2), "the way back from his side is for those who were there"); }
  // Vrishasena and Karna die on day 17 in every life: every road through these scenes goes on to the
  // wheel, every outcome of the son's fight ends with him falling, and the wheel's close is untouched.
  for (const id of ["kd_son", "kd_guard"]) ok(sc(id).next === "a6_day17" && sc(id).skipTo === "a6_day17", id + " goes on to the wheel scene");
  for (const o of ["win", "lose", "flee"]) {
    for (const n of [0, 6]) { S = war({ side: "kaurava" }); S.kdHeld = n; const r = K.combatOutcome("kd_e_son", o, "a6_day17"); ok(r.next === "a6_day17" && /Vrishasena's throat/.test(r.text), "Vrishasena falls (" + o + ", held " + n + ")"); }
    S = war({ side: "pandava" }); const r = K.combatOutcome("kd_e_wheel", o, "a6_day17"); ok(r.next === "a6_day17", "the wheel-guard goes on to the wheel (" + o + ")");
  }
  for (const side of ["pandava", "kaurava", "neutral"]) {
    S = war({ side }); const after = K.val(sc("a6_day17").after, S), wit = K.val(sc("a6_day17").witness, S);
    ok(after.some((b) => typeof b === "string" && /Arjuna's arrow takes Karna's life/.test(b)) && wit.some((b) => /Vrishasena/.test(b)), "day 17, " + side + ": Vrishasena falls and Arjuna's arrow takes Karna");
  }
  // The wheel-guard: never under the vow never to strike Karna.
  S = war({ side: "pandava" });
  ok(K.test(sc("kd_guard").when, S), "a Pandava fighter rides at Arjuna's wheel");
  S.vows.push({ id: "spare_karna", broken: false, age: 20 });
  ok(!K.test(sc("kd_guard").when, S), "never under the vow never to strike Karna");
  S = war({ side: "pandava" }); S.seen.push("hold_karna_offer");
  ok(!K.test(sc("kd_guard").when, S), "nor a division that already stood against Karna's chariot that day");
  // Held: the princes remember you on the night of the raid. Broken: a wound, and a shaken company.
  S = war({ side: "pandava" }); K.combatOutcome("kd_e_wheel", "win", "a6_day17");
  ok(K.val(sc("a6_raid").body, S).some((b) => b && /Yudhamanyu/.test(b.memory || "")) && K.val(sc("a6_raid").after, S).some((b) => b && /called your name/.test(b.memory || "")), "held: the Panchala princes remember you on the night of the raid");
  S = war({ side: "pandava" }); K.combatOutcome("kd_e_wheel", "lose", "a6_day17");
  ok(S.flags.includes("kd_guard_broken") && S.flags.includes("company_shaken") && S.injuries.length === 1, "broken: a wound, and the company shaken in its next fight");
  ok(!K.val(sc("a6_raid").after, S).some((b) => b && /called your name/.test(b.memory || "")), "and the princes do not call your name");
}
// 43. War storylines, second pass (content/war_kings.js): the ride with Satyaki on day 14 and the cry on day 15
{
  const sc = (id) => K.SCENES[id], ch = (id, cid) => K.val(sc(id).choices, K.S).find((c) => c.id === cid);
  const war = (o, flags) => { const s = fresh(Object.assign({ act: 6, age: 44 }, o)); s.flags.push(...(flags || ["role_front"])); return s; };
  ok(!K.test(sc("kb_ride").when, war({ side: "pandava" }, ["role_healer"])) && !K.test(sc("kb_ride").when, war({ side: "kaurava" })), "healers and the Kaurava side are not sent with Satyaki");
  // Refusing: Satyaki remembers, and you do not see Bhurishravas.
  S = war({ side: "pandava", origin: "mathura" }, ["role_command"]); S.bonds.satyaki = 4;
  K.choose(sc("kb_ride"), ch("kb_ride", "stay"));
  ok(S.bonds.satyaki === 2 && S.memories.some((m) => m.who === "satyaki") && !K.test(sc("kb_drag").when, S), "staying with Yudhishthira: Satyaki -2, he remembers, and no Bhurishravas, even for a Yadava company leader");
  // The ride: Satyaki fights beside you, and how it goes sets how worn out he is.
  S = war({ side: "pandava", path: "swordsman" }); S.flags.push("kb_rode");
  {
    const C = K.Combat, B = C.start("e_kb_ride", () => {});
    const sat = B.units.find((u) => u.person === "satyaki");
    ok(sat && sat.side !== "enemy", "Satyaki rides beside you as an ally");
    for (let i = 0; i < 14 && !B.over; i++) C.act(i % 3 === 2 ? "guard" : "strike", B.living("enemy")[0] && B.living("enemy")[0].uid);
    K.kbRideCount(B);
    ok([0, 1, 2].includes(S.kbRide), "how worn out Satyaki is, is counted (" + S.kbRide + ", " + B.over + ")");
    C.end && C.end();
    for (const o of ["win", "lose"]) ok(K.combatOutcome("e_kb_ride", o, "a6_day14").next === "kb_drag", "the ride goes on to Bhurishravas (" + o + ")");
  }
  const atk = (n) => { S.kbRide = n; return K.val(K.ENCOUNTERS.e_kb_hold.enemies, S)[0].atk; };
  ok(atk(0) > atk(1) && atk(1) > atk(2), "the more worn out Satyaki is, the harder Bhurishravas hits in the hold");
  ok(K.val(sc("kb_sits").body, S).some((b) => b && b.speaker === "Satyaki"), "Satyaki speaks for himself over Bhurishravas");
  ok(!K.test(sc("kf_cry").when, war({ side: "pandava" }, ["role_healer"])) && K.test(sc("kf_cry").when, war({ side: "pandava" }, ["role_chariot"])), "the cry reaches every Pandava on the field, not the healers' tents");
  // The cry: a lie, with the vow's full price; heavier for Drona's students; Drona falls either way.
  S = war({ side: "pandava", teacher: "drona" }); S.duty.teacher = 6; S.vows.push({ id: "never_lie", broken: false, age: 20 }); S.bonds.dhrishtadyumna = 0;
  K.choose(sc("kf_cry"), ch("kf_cry", "cry"));
  ok(S.vows[0].broken && S.duty.teacher === 2 && S.bonds.dhrishtadyumna === 2 && S.flags.includes("spread_the_lie"), "taking up the cry breaks the vow never to lie, the teacher's debt falls, Dhrishtadyumna +2");
  S.seen.push("kf_cry");
  ok(!K.val(sc("a6_day15").choices, S).some((c) => ["spread", "refuse", "warn"].includes(c.id)) && /Ashwatthama hears how his father died/.test(JSON.stringify(K.val(sc("a6_day15").after, war({ side: "pandava" })))), "the half-truth does not ask again, and Drona still falls");
  S = war({ side: "pandava" }); const c0 = S.duty.conscience;
  K.choose(sc("kf_cry"), ch("kf_cry", "silent"));
  ok(S.duty.conscience === c0 + 1 && S.memories.some((m) => m.who === "bhima") && S.flags.includes("refused_lie"), "staying silent: conscience +1, and Bhima notices");
  // Day 14 comes back on day 15.
  S = war({ side: "pandava", teacher: "drona" }); S.flags.push("kb_held_arms"); S.seen.push("kf_fall");
  ok(/held an old man's arm/.test(JSON.stringify(ch("kf_drona", "stop").check)), "holding Bhurishravas's arm is thrown back at you when you try to stop Dhrishtadyumna");
  S = war({ side: "pandava" }); S.flags.push("kb_tried_stop"); K.go("kf_cry");
  ok(S.memories.some((m) => m.who === "ashwatthama") && K.val(sc("a6_raid").body, S).some((b) => b && /Satyaki's sword/.test(b.memory || "")), "trying to stop Satyaki: Ashwatthama remembers, and says so on the night of the raid");
  // The night debate: two deaths, for anyone who did either.
  S = war({ side: "pandava" }); S.flags.push("kf_cried");
  ok(K.test(sc("kb_debate").when, S) && K.val(sc("kb_debate").body, S).some((b) => b && /shouted it with the rest/.test(b.memory || "")), "the night debate quotes the cry back at you");
  ok(!K.test(sc("kb_debate").when, war({ side: "pandava" })), "and is not for those who did neither");
}
// 44. War storyline (PRD 18.13): Iravan on day 8 (content/war_lake.js)
require(G + "content/war_lake.js");
{
  const sc = (id) => K.SCENES[id], ch = (id, cid) => K.val(sc(id).choices, K.S).find((c) => c.id === cid);
  const war = (o, flags) => { const s = fresh(Object.assign({ act: 6, age: 44 }, o)); s.flags.push(...(flags || ["role_front"])); return s; };
  const naga = (s) => { s.astras = [{ id: "nagapasha", from: "naga", age: 35 }]; return s; };
  ok(K.BEFORE.a6_bhishma.slice(0, 2).join() === "wr_word_iravan,wl_iravan", "Iravan (after the word at the fire) comes before the tenth day");
  ok(K.test(sc("wl_iravan").when, naga(war({ side: "pandava" }))) && !K.test(sc("wl_iravan").when, naga(war({ side: "kaurava" }))) && !K.test(sc("wl_iravan").when, war({ side: "pandava" })),
    "only Pandava players with a naga tie (the serpent-noose from the healed naga) meet Iravan");
  S = naga(war({ side: "pandava" })); S.astras[0].broken = true;
  ok(!K.test(sc("wl_iravan").when, S), "a broken naga condition is no tie");
  // Canon: he dies on day 8 in every life, met or not; riding with him or not, the news comes.
  S = war({ side: "pandava" }); K.apply(sc("a6_bhishma").enter);
  ok(S.dead.includes("iravan"), "Iravan is dead by the tenth day in a life that never met him");
  ok(ch("wl_iravan", "ride").next === "wl_iravan_body" && ch("wl_iravan", "line").next === "wl_iravan_body" && sc("wl_iravan_body").enter.die === "iravan", "both roads hear that he has fallen");
  const E = K.ENCOUNTERS.e_iravan;
  ok(E.hold === 6 && !E.lethal && K.val(E.allies).some((u) => u.person === "iravan"), "the fight beside Iravan: held for six rounds, not deadly, Iravan an ally");
  // The carrying: done, the nagas remember; failed, nothing is lost but their regard.
  S = naga(war({ side: "pandava" })); S.bonds.arjuna = 5;
  let r = K.choose(sc("wl_iravan_body"), ch("wl_iravan_body", "carry"), "win");
  ok(S.flags.includes("naga_regard") && r.next === "wl_iravan_river" && S.memories.some((m) => m.who === "ulupi"), "carried to the river: the nagas remember, Ulupi's people take him");
  S = naga(war({ side: "pandava" })); S.bonds.arjuna = 5; const before = JSON.stringify([S.bonds, S.rep, S.attrs, S.injuries]);
  r = K.choose(sc("wl_iravan_body"), ch("wl_iravan_body", "carry"), "lose");
  ok(!S.flags.includes("naga_regard") && S.alive && JSON.stringify([S.bonds, S.rep, S.attrs, S.injuries]) === before && r.next === "a6_bhishma", "failed: nothing lost but the nagas' regard");
  // The naga answers one call for help, in a deadly war fight, through K.warHelp.
  S = war({ side: "pandava", friend: "bhima" }); S.flags.push("naga_regard");
  {
    const C = K.Combat, B = C.start("hold_duryodhana", () => {});
    ok(!(K.warHelp(S).unit || {}).person || K.warHelp(S).unit.person !== "naga", "not in a holding fight that cannot kill you");
    C.end && C.end();
  }
  {
    const C = K.Combat, B = C.start("e_day18", () => {});
    ok(C.act("call"), "call for help in the last battle");
    ok(B.units.some((u) => u.person === "naga" && u.side !== "enemy") && S.flags.includes("naga_answered"), "a naga of Ulupi's comes, and the promise is spent");
    C.end && C.end();
  }
  ok((K.warHelp(S).unit || {}).person === "bhima", "the next call reaches your friend again, not the naga");
  S.flags.push("iravan_fought"); const t = []; K.TELL_HOOKS.forEach((h) => h(S, t, (f) => S.flags.includes(f)));
  ok(t.some((l) => /carried Iravan/.test(l)) && t.some((l) => /a naga came/.test(l)), "the telling remembers the river and the naga");
}
// 45. War storyline (PRD 18.13): the lake on day 18 (content/war_lake.js)
{
  const sc = (id) => K.SCENES[id], ch = (id, cid) => K.val(sc(id).choices, K.S).find((c) => c.id === cid);
  const war = (o, flags) => { const s = fresh(Object.assign({ act: 6, age: 44 }, o)); s.flags.push(...(flags || ["role_front"])); return s; };
  ok(K.BEFORE.a6_duryodhana.includes("wl_lake"), "the lake comes before Duryodhana lies dying");
  const lw = sc("wl_lake").when;
  S = war({ side: "kaurava" }); S.bonds.duryodhana = 5;
  ok(K.test(lw, war({ side: "pandava", path: "spy" })) && K.test(lw, S) && !K.test(lw, war({ side: "pandava", path: "archer" })) && !K.test(lw, war({ side: "neutral", path: "spy" })),
    "spies, scouts and Duryodhana's friends on either side search the lake; others do not");
  S = war({ side: "pandava", path: "spy" }); r = K.choose(sc("wl_lake"), ch("wl_lake", "search"), "lose");
  ok(S.flags.includes("lake_late") && r.next === "wl_lake_reeds", "lost search: the hunters are first");
  ok(!K.choiceList(sc("wl_lake_found")).find((x) => x.c.id === "tell").ok, "and there is nothing to tell the Pandavas they do not already know");
  // Who stands where in the reeds.
  const ids = (s) => K.val(sc("wl_lake_reeds").choices, s).map((c) => c.id).join(",");
  S = war({ side: "kaurava", path: "spy" }); ok(ids(S) === "stand,hide", "Kaurava: stand with the three, or hide");
  S = war({ side: "pandava", path: "spy" }); ok(ids(S) === "scout,hide", "Pandava: go in with the scouts, or hide");
  S = war({ side: "pandava", path: "spy" }); S.bonds.duryodhana = 6; ok(ids(S) === "stand,scout,hide", "Pandava friend of Duryodhana: may stand with the three");
  ok(K.ENCOUNTERS.e_lake_three.hold && K.val(K.ENCOUNTERS.e_lake_three.enemies).every((u) => u.hero), "the three cannot be killed: a holding fight against champions");
  // Out of your depth, losing the reeds fight is a death (story mode: a scar).
  S = war({ side: "kaurava", path: "spy" }); S.attrs.grace = 1; S.skills.stealth = 0;
  ok(K.lakeDeep(S) && ch("wl_lake_reeds", "stand").combat === "e_lake_hold_deep", "out of your depth: the deadly reeds fight");
  K.combatOutcome("e_lake_hold_deep", "lose", "wl_lake_found");
  ok(!S.alive && /Dvaipayana/.test(S.deathText), "losing it is a death at Dvaipayana");
  S = war({ side: "kaurava", path: "spy", storyMode: true }); S.attrs.grace = 1; S.skills.stealth = 0;
  K.combatOutcome("e_lake_hold_deep", "lose", "wl_lake_found");
  ok(S.alive && S.injuries.includes("scar"), "story mode: a scar");
  S = war({ side: "kaurava", path: "spy" }); K.combatOutcome("e_lake_hold", "win", "wl_lake_found");
  ok(K.lakeLines.raid(S) && /Four of us/.test(K.lakeLines.raid(S).memory), "held beside Ashwatthama: he says so on the night of the raid");
  // The choice: tell, keep silent, warn. Every road goes on to the duel.
  S = war({ side: "pandava", path: "spy" }); S.flags.push("lake_first"); S.rep.pandava = 3;
  r = K.choose(sc("wl_lake_found"), ch("wl_lake_found", "tell"));
  ok(S.rep.pandava === 5 && S.flags.includes("lake_told") && r.next === "a6_duryodhana", "told: Pandava reputation +2, on to the duel");
  S.bonds.duryodhana = 7; ok(/gods your name/.test(K.lakeLines.dying(S).memory), "and Duryodhana names you as he dies");
  S = war({ side: "kaurava", path: "spy" }); S.bonds.duryodhana = 4;
  r = K.choose(sc("wl_lake_found"), ch("wl_lake_found", "warn"));
  ok(S.bonds.duryodhana === 7 && S.flags.includes("saw_duel") && r.next === "a6_duryodhana" && /fight/.test(r.text), "warned: he will not run, bond +3, and you stand witness");
  S = war({ side: "pandava", path: "spy" }); S.bonds.duryodhana = 6; S.attrs.grace = 6; S.skills.stealth = 2;
  r = K.choose(sc("wl_lake_found"), ch("wl_lake_found", "warn_p"));
  ok(r.check.pass && S.flags.includes("saw_duel") && !S.flags.includes("captive"), "a Pandava who warns him unseen stands witness too");
  S = war({ side: "pandava", path: "farmer" }); S.bonds.duryodhana = 6; S.attrs.grace = 0; S.skills.stealth = 0; S.rep.pandava = 5;
  r = K.choose(sc("wl_lake_found"), ch("wl_lake_found", "warn_p"));
  ok(!r.check.pass && S.rep.pandava === 2 && S.flags.includes("captive") && r.next === "x_captive" && S.captive.then === "a6_duryodhana" && !S.flags.includes("saw_duel"),
    "seen warning him, out of your depth: Pandava reputation -3, Bhima's men hold you through the duel");
  ok(!/glad you saw/.test(K.lakeLines.dying(S).memory), "and he knows you did not see it");
  ok(K.val(sc("wl_lake_found").choices).every((c) => !c.next || c.next === "a6_duryodhana") && sc("wl_lake_found").next === "a6_duryodhana" && ch("wl_lake", "leave").next === "a6_duryodhana",
    "canon: whatever you do, he is found and the duel is fought");
}
// 46. The Samshaptakas' oath (PRD 18.13, content/war_oath.js): a fourth vow for one war, its gift, its price, its ending
require(G + "content/war_oath.js");
{
  const war = { act: 6, age: 44, side: "kaurava", path: "warrior" };
  S = fresh(war); ["never_lie", "never_retreat", "spare_unarmed"].forEach((id) => K.apply({ vowTake: id }));
  ok(K.resolveScene("a6_wheel").id === "oath_fire", "after the eleventh day a Kaurava warrior comes to the Samshaptakas' fire");
  const swear = K.SCENES.oath_fire.choices.find((c) => c.id === "swear");
  ok(K.choiceMarks(swear, S).some(([kind, , sum, emb]) => kind === "vow" && emb === "vow_samshaptaka" && /^Kept: .* · Broken: /.test(sum)), "the oath's card carries the vow's emblem, its one line kept and broken on the emblem");
  K.choose(K.SCENES.oath_fire, swear);
  ok(S.vows.length === 4 && K.hasVow("samshaptaka", S) && K.vowsHeld(S) === 3 && S.tapas === 3, "the oath is sworn above the limit of three (tapas +3), and stands outside the count");
  K.apply({ vowTake: "celibacy" });
  ok(!K.hasVow("celibacy", S), "any other vow is still refused past three");
  const p0 = (() => { const keep = S.vows; S.vows = keep.filter((v) => v.id !== "samshaptaka"); const B = K.Combat.start("oath_arjuna_12", () => {}); const r = { atk: B.units[0].atk, def: B.units[0].def }; K.Combat.end(); S.vows = keep; return r; })();
  const B1 = K.Combat.start("oath_arjuna_12", () => {});
  ok(B1.units[0].atk === p0.atk + 2 && B1.units[0].def === p0.def + 1, "while the oath holds: +2 attack, +1 defence");
  ok(B1.enc.lethal && B1.enc.hold === 7 && B1.units.some((u) => u.person === "arjuna" && u.hero) && K.Combat.fleeBreaks().includes("samshaptaka"), "Arjuna's chariot is a deadly hold, and pulling out of it breaks the oath");
  K.Combat.end();
  S.seen.push("oath_fire");
  ok(K.resolveScene("a6_wheel").id === "oath_south", "the sworn face Arjuna's chariot on the twelfth day");
  ok(K.resolveScene("a6_day16").id === "oath_again", "and again on the sixteenth");
  S.flags.push("role_division", "council_flank", "council_flank_chariot");
  ok(!K.test(K.SCENES.hold_arjuna_offer.when, S), "the division's hold against Arjuna is not offered twice to the sworn");
  S.alive = false;
  let e = K.composeEnding(S);
  ok(e.title === "The oath to the death" && e.art === "end_oath", "falling with the oath on you is its own ending");
  ok(K.ENDINGS.some((x) => x.title === "The oath to the death" && x.art === "end_oath"), "it is in the endings list");
  S = fresh(war); K.apply({ vowTake: "samshaptaka" }); S.bonds.duryodhana = 7; S.bonds.karna = 6; S.bonds.drona = 5;
  K.choose(K.SCENES.oath_south, K.SCENES.oath_south.choices.find((c) => c.id === "withdraw"));
  ok(!K.hasVow("samshaptaka", S) && S.flags.includes("broke_samshaptaka") && S.bonds.duryodhana === 4 && S.bonds.karna === 3 && S.bonds.drona === 2, "withdrawing breaks the oath: every watcher's bond -3");
  S.alive = false; e = K.composeEnding(S);
  ok(e.title !== "The oath to the death" && e.telling.some((x) => /oath-breaker/.test(Array.isArray(x) ? x[0] : x)), "an oath-breaker does not get its ending, and the telling names them");
  S = fresh(Object.assign({ storyMode: true }, war)); K.apply({ vowTake: "samshaptaka" });
  K.combatOutcome("oath_arjuna_12", "lose", "a6_wheel");
  ok(S.alive && K.hasVow("samshaptaka", S) && S.flags.includes("oath_carried_off") && S.injuries.length, "story mode: carried off with a wound, the oath kept");
  S = fresh({ act: 6, age: 44, side: "pandava" }); S.flags.push("role_command");
  ok(K.resolveScene("a6_wheel").id === "oath_crescent", "on the Pandava side, the crescent array on the twelfth day");
  const arr = K.SCENES.oath_crescent.choices.find((c) => c.id === "array");
  ok(arr.trial.array === "crescent" && K.test(arr.req, S), "a company leader sets companies on the crescent");
  const rr = K.choose(K.SCENES.oath_crescent, arr, "lose");
  ok(rr.next === "oath_king" && !rr.after && K.ENCOUNTERS.oath_king_hold.hold && K.ENCOUNTERS.oath_king_hold.enemies.some((u) => u.person === "drona"), "if the crescent breaks, a holding fight at the king's chariot follows");
}
// 47. The oath and canon: Arjuna is only ever held, never brought down; the oath is kept to the war's end, when Susharma falls to him
{
  ok(["oath_arjuna_12", "oath_arjuna_16"].every((id) => K.ENCOUNTERS[id].hold && K.ENCOUNTERS[id].enemies.some((u) => u.person === "arjuna" && u.hero)), "Arjuna's chariot is a fight to hold, never to win by killing him");
  S = fresh({ act: 6, age: 44, side: "kaurava", path: "warrior" }); K.apply({ vowTake: "samshaptaka" }); S.seen.push("a6_day18");
  K.oathEnds(K.SCENES.a6_duryodhana, S);
  ok(!K.hasVow("samshaptaka", S) && S.vows.some((v) => v.id === "samshaptaka" && v.released) && S.journal.some((j) => /Susharma/.test(JSON.stringify(j))), "after the eighteenth day the oath is released, kept, and Susharma falls as written");
}
// 60. Arjuna and Bhishma, shown twice (PRD 18.13, content/war_bhishma.js): where the scenes come, and who reaches them
require(G + "content/war_bhishma.js");
{
  const L = K.BEFORE.a6_bhishma, war = (o) => fresh(Object.assign({ act: 6, age: 44, path: "warrior" }, o));
  ok(L.indexOf("bh_day9") > L.indexOf("wl_iravan") && L.indexOf("bh_day9") < L.indexOf("cmd_promotion_1") && L.indexOf("bh_fall") === L.indexOf("ep_shikhandi") + 1,
    "day 9 comes after Iravan and before the ninth night; the fall straight after Shikhandi's charge");
  S = war({ side: "pandava" });
  ok(K.resolveScene("a6_bhishma").id === "bh_day9" && K.SCENES.bh_day9.next === "bh_wheel", "a Pandava fights in the line under Bhishma on the ninth day, then sees the wheel");
  ok(K.SCENES.bh_day9.choices.every((c) => c.combat === "bh_line9") && K.ENCOUNTERS.bh_line9.hold && !K.ENCOUNTERS.bh_line9.lethal, "both choices lead to the holding fight (not deadly)");
  S.seen.push("bh_day9", "bh_wheel");
  ok(K.resolveScene("a6_bhishma").id === "ep_shikhandi", "then Shikhandi's charge on the tenth morning");
  S.seen.push("ep_shikhandi");
  ok(K.resolveScene("a6_bhishma").id === "bh_fall", "then the fall");
  S = war({ side: "kaurava" });
  ok(K.resolveScene("a6_bhishma").id === "bh_guard9", "a Kaurava is in Bhishma's guard on the ninth day");
  S.seen.push("bh_guard9");
  ok(K.resolveScene("a6_bhishma").id === "bh_fall", "and sees him fall on the tenth");
  S = war({ side: "neutral" });
  ok(K.resolveScene("a6_bhishma").id === "a6_bhishma", "the neutral do not see either");
  S = war({ side: "pandava" }); S.flags.push("captive");
  ok(!["bh_day9", "bh_fall"].includes(K.resolveScene("a6_bhishma").id), "nor does a prisoner");
}
// 61. The wheel and the barrage: staged moments; the tent for those close to the brothers; small consequences
{
  const war = (o) => fresh(Object.assign({ act: 6, age: 44, path: "warrior" }, o));
  S = war({ side: "pandava" }); K.apply(K.SCENES.bh_wheel.enter);
  ok(S.moments.some((m) => m.kind === "bh_wheel") && K.MOMENT_KINDS.bh_wheel().play && K.MOMENT_KINDS.bh_wheel().art === "fight_war_field", "the wheel is a moment, staged in code over the field painting");
  S = war({ side: "kaurava" }); K.apply(K.SCENES.bh_fall.enter);
  ok(S.moments.some((m) => m.kind === "bh_fall") && K.MOMENT_KINDS.bh_fall().play && K.MOMENT_KINDS.bh_fall().ms <= 10000, "the barrage is a moment of under ten seconds");
  const tent = K.SCENES.bh_wheel.choices.find((c) => c.id === "tent");
  S = war({ side: "pandava" }); S.bonds.arjuna = 2; S.bonds.yudhishthira = 2;
  ok(!K.test(tent.req, S), "the tent: not for those who are not close to the brothers");
  S.bonds.yudhishthira = 6; const b0 = S.bonds.bhishma ?? 3;
  ok(K.test(tent.req, S), "the tent: for those close to Yudhishthira (or Arjuna)");
  K.choose(K.SCENES.bh_wheel, tent);
  ok(S.flags.includes("bh_heard_shikhandi") && S.bonds.bhishma === b0 + 1 && K.val(K.SCENES.ep_shikhandi.body, S).some((x) => x && x.memory), "he names Shikhandi, and the tenth morning remembers it");
  S = war({ side: "kaurava" }); const k0 = S.bonds.bhishma ?? 3;
  const r = K.choose(K.SCENES.bh_guard9, K.SCENES.bh_guard9.choices.find((c) => c.id === "step"));
  ok(S.flags.includes("bh_stepped_in") && S.bonds.bhishma === k0 + 1 && r.next !== "end_death", "stepping in front of the old man: he moves you aside");
  S = war({ side: "pandava" }); const g0 = S.bonds.bhishma ?? 3;
  K.choose(K.SCENES.bh_fall, K.SCENES.bh_fall.choices.find((c) => c.id === "go"));
  ok(S.flags.includes("bh_went_to_him") && S.bonds.bhishma === g0 + 1 && S.memories.some((m) => m.who === "bhishma"), "going to him as he falls: his bond +1, and a memory");
  ok(!K.val(K.SCENES.a6_bhishma.witness, Object.assign({}, S, { seen: S.seen.concat("bh_fall") })).some((x) => /Arjuna's arrows bring/.test(x)), "the bed of arrows does not tell the fall again to those who saw it");
}
// 62. Canon: Krishna never strikes Bhishma, and Bhishma falls on the tenth day in every life
{
  const ids = ["bh_day9", "bh_wheel", "bh_guard9", "bh_fall"], S0 = fresh({ act: 6, age: 44, side: "pandava", path: "warrior" });
  ok(ids.every((id) => [K.SCENES[id].next].concat(K.val(K.SCENES[id].choices, S0).map((c) => c.next)).every((n) => !n || n === "a6_bhishma" || n === "bh_wheel")), "every road through these scenes leads to the bed of arrows");
  ok(!K.ENCOUNTERS.bh_line9.enemies.some((u) => u.person === "krishna") && K.ENCOUNTERS.bh_line9.enemies.some((u) => u.person === "bhishma" && u.hero) && !JSON.stringify(ids.map((id) => K.SCENES[id].choices.map((c) => c.fx || {}))).includes("\"die\""),
    "Bhishma is only held on the ninth day; no choice kills or spares anyone");
  ok(K.SCENES.bh_fall.choices.every((c) => !c.req) && K.SCENES.a6_bhishma.canon, "whatever you do as he falls, he falls");
}
// 80. War storylines (PRD 18.13 #1): Yuyutsu's call, the only way to change sides
["content/episodes", "content/war_crossing"].forEach((f) => require(G + f + ".js"));
K.UI = K.UI || { esc: (x) => x }; require(G + "ui/map.js");
{
  const KAURAVA_ONLY = ["a6_d13_bow"], canonDead = (S) => S.dead.filter((w) => K.PEOPLE[w] && K.PEOPLE[w].canon);
  S = fresh({ act: 6, age: 44, side: "kaurava", friend: "duryodhana", court: "hastinapura", sibling: "dev", at: "camp_kaurava", storyMode: true });
  Object.assign(S.bonds, { duryodhana: 8, drona: 6, bhishma: 5, arjuna: 4, dev: 6, ugra: 5 });
  S.flags.push("role_command", "beat_ugra", "sibling_same_side"); S.vows.push({ id: "never_retreat", broken: false, age: 30 });
  K.go("a6_day1");
  ok(S.scene === "cross_call", "a fighter meets Yuyutsu's call before the first day (" + S.scene + ")");
  const sc = K.SCENES.cross_call, cross = K.choiceList(sc).map((x) => x.c).find((c) => c.id === "cross");
  const pv = K.preview(cross).map((x) => x[1]).join(" | ") + " | " + K.preview({ fx: K.ENCOUNTERS.cross_e_escape.win.fx(S) }).map((x) => x[1]).join(" | ");
  ok(/Breaks vow: Never to retreat/.test(pv) && /Ends your friendship with Duryodhana/.test(pv), "the crossing says first that it is a retreat and ends a friend for life there: " + pv);
  // Out of the line is a fight now (owner, 10 November): the men beside you, not deadly, no one to call.
  { const E = K.ENCOUNTERS.cross_e_escape, foes = K.val(E.enemies, S);
    ok(cross.combat === "cross_e_escape" && !cross.fx && !E.lethal && foes.length === 3 && foes.every((u) => /Kaurava spearman/.test(u.name)) && !K.val(E.allies, S).length && /your own side/.test(E.callHelp(S).text),
      "crossing is a fight with three spearmen of your own line (owner, 10 November: harder), not deadly, with no one to call"); }
  r = K.choose(sc, cross);
  ok(r.combat === "cross_e_escape" && S.side === "kaurava", "choosing to cross starts the fight, and nothing changes until it is won");
  K.combatOutcome("cross_e_escape", "win", "a6_day1");
  ok(S.side === "pandava" && S.flags.includes("crossed_lines") && S.friend === null && S.moments.some((m) => m.kind === "farewell" && m.who === "duryodhana") && S.moments.some((m) => m.kind === "crossed"), "crossing: the side changes, the friend for life there says farewell, and the crossing has its moment");
  ok(S.bonds.drona === 3 && S.bonds.bhishma === 2 && S.bonds.arjuna === 4 && S.bonds.dev === 3 && S.bonds.ugra === 2, "every bond on the side left falls by 3, and only those");
  ok(K.vowBreaksFor(["retreat"], S).length === 0 && S.vows[0].broken, "crossing broke the vow never to retreat");
  ok(!K.rankOf(S) && !K.warAllies(S).includes("company") && !K.warAllies(S).includes("ugra"), "a commander loses the company, and Ugra no longer stands beside you");
  ok(K.ugraAcross(S) && S.flags.includes("sibling_other_side_set"), "Ugra and the sibling who stood beside you are across the field now");
  ok(/do not know you/.test(String(K.warHelp(S).text)), "on the new side the first call for help reaches no one");
  K.go("a6_day1");
  ok(S.scene === "cross_watched" && S.flags.includes("suspected_spy"), "the first evening: the new side suspects a spy, and sets a guard (" + S.scene + ")");
  const moved = K.travel(K.SCENES.cross_watched, S);
  ok(moved && moved[0] === "camp_kaurava" && moved[1] === "camp_pandava" && S.at === "camp_pandava", "the map marker moves from the Kaurava camp to the Pandava camp (" + moved + ")");
  K.choose(K.SCENES.cross_watched, K.SCENES.cross_watched.choices[0]); K.go("a6_day1");
  ok(S.scene === "cross_duel", "the second morning: the old side sends someone (" + S.scene + ")");
  ok(K.val(K.ENCOUNTERS.cross_e_duel.enemies).some((u) => u.person === "ugra") && K.ENCOUNTERS.cross_e_duel.lethal && /no one moves/.test(K.ENCOUNTERS.cross_e_duel.callHelp(S).text), "Ugra comes for you in a deadly duel with no call for help");
  K.combatOutcome("cross_e_duel", "win", "a6_day1");
  ok(S.dead.includes("ugra") && S.flags.includes("crossed_trusted") && S.flags.includes("proven_duel") && !S.flags.includes("suspected_spy") && K.rankOf(S) === "role_command" && S.flags.includes("company_given_back") && !/do not know you/.test(String(K.warHelp(S).text)), "winning the duel brings trust: the call for help, and rank opens again (a company)");
  // The rest of the war, as one who crossed: no content for the old side, the Pandava camp on the map.
  let at = "a6_day1", old = [], map = [], steps = 0;
  K.go(at);
  while (S.act === 6 && steps++ < 120) {
    const here = K.SCENES[S.scene];
    if (KAURAVA_ONLY.includes(here.id)) old.push(here.id);
    const list = K.choiceList(here).filter((x) => x.ok);
    // A choice for the old side: one its req allows only to a Kaurava.
    const as = (side) => Object.assign({}, S, { side });
    list.forEach((x) => { const r = x.c.req; if (r && K.test(r, as("kaurava")) && !K.test(r, as("pandava"))) old.push(here.id + ":" + x.c.id); });
    const place = String(K.val(here.place, S) || ""), loc = K.locOf(place, S);
    if (/Kurukshetra/.test(place) && loc !== "camp_pandava") map.push(here.id + " " + loc);
    if (!list.length) break;
    const c = list[0].c, r = c.game ? K.choose(here, c, "win") : K.choose(here, c);
    let next = r.next;
    if (r.combat) next = K.combatOutcome(r.combat, "win", r.next).next;
    K.go(next);
  }
  ok(S.act === 7 && !old.length, "one who crossed never meets the old side's content again (" + (old.join(", ") || "none") + ", reached act " + S.act + ")");
  ok(!map.length, "the war's scenes put the marker in the Pandava camp (" + (map.join(", ") || "all") + ")");
  ok(!canonDead(S).some((w) => !["bhishma", "drona", "karna", "abhimanyu", "duryodhana", "dushasana", "jayadratha", "shakuni", "shalya", "iravan", "ghatotkacha", "bhurishravas", "drupada", "virata"].includes(w)), "crossing kills no canon figure the epic does not (" + canonDead(S) + ")");
}
// 80b. Those in the healers' tents watch the call; a child sent to a Kaurava division stays there
S = fresh({ act: 6, age: 44, side: "neutral" }); K.go("a6_day1");
ok(S.scene === "cross_call" && K.choiceList(K.SCENES.cross_call).map((x) => x.c.id).join() === "tents", "the healers' tents see Yuyutsu cross too, and only watch");
S = fresh({ act: 6, age: 44, side: "kaurava", child: "vasu" }); S.bonds.vasu = 7; S.flags.push("vasu_away", "child_cmd_ashwatthama", "role_chariot");
K.go("a6_day1"); K.choose(K.SCENES.cross_call, K.choiceList(K.SCENES.cross_call).find((x) => x.c.id === "cross").c); K.combatOutcome("cross_e_escape", "win", "a6_day1");
ok(S.flags.includes("vasu_left_behind") && !S.flags.includes("vasu_away") && !S.flags.some((f) => f.startsWith("child_cmd_") || f === "role_chariot") && S.bonds.vasu === 4 && !K.test(K.SCENES.wc_child_line.when, S),
  "crossing: Vasu stays in his Kaurava division (bond -3, no Pandava-side scenes of his line), and the chariot is gone");
// 80c. Suspected of spying until proven: the duel (killing, not sparing), the truth before Yudhishthira, or the spy caught; else for the war
const crossNow = (o, flags) => { S = fresh(Object.assign({ act: 6, age: 44, side: "kaurava" }, o)); S.flags.push(...(flags || [])); K.go("a6_day1"); K.choose(K.SCENES.cross_call, K.choiceList(K.SCENES.cross_call).find((x) => x.c.id === "cross").c); K.combatOutcome("cross_e_escape", "win", "a6_day1"); };
const sceneNext = () => { K.go("a6_day1"); return S.scene; };
crossNow({ storyMode: true }, ["role_command"]);
ok(!K.rankOf(S) && S.flags.includes("role_front") && S.flags.includes("company_left"), "crossing: the company is lost, and you fight as a spearman");
r = K.combatOutcome("cross_e_duel", "lose", "a6_day1");
ok(S.alive && S.injuries.includes("scar") && !K.rankOf(S) && S.flags.includes("suspected_spy") && /down between the lines/.test(r.text), "story mode: dragged back with a scar; still suspected, no rank");
K.combatOutcome("e_day1", "win", "a6_bhishma");
ok(S.flags.includes("crossed_untrusted") && /do not know you/.test(String(K.warHelp(S).text)), "a deadly fight won is not proof: the call for help stays closed");
S.seen.push("cross_watched", "cross_duel");
ok(sceneNext() === "cross_truth", "the third night: before Yudhishthira (" + S.scene + ")");
{ const tell = K.SCENES.cross_truth.choices.find((c) => c.id === "tell"); S.bonds.duryodhana = 5; const c0 = S.duty.conscience;
  ok(tell.game === "retort" && tell.trial.rounds.length === 3, "the truth is a retort test of three questions");
  K.choose(K.SCENES.cross_truth, tell, "win");
  ok(S.flags.includes("proven_truth") && !S.flags.includes("suspected_spy") && K.rankOf(S) === "role_command" && S.bonds.duryodhana === 4 && S.duty.conscience === c0 - 1 && !/do not know you/.test(String(K.warHelp(S).text)),
    "the truth believed: suspicion clears, the call for help and the company come back; the old side's bonds -1, conscience -1"); }
ok(sceneNext() === "a6_day1", "the proven skip the fourth night (" + S.scene + ")");
crossNow({}); K.combatOutcome("cross_e_duel", "spare", "a6_day1"); S.seen.push("cross_watched", "cross_duel");
ok(S.flags.includes("suspected_spy") && sceneNext() === "cross_explain", "sparing him feeds the suspicion: Dhrishtadyumna wants a reason (" + S.scene + ")");
S.attrs.wisdom = 9; S.skills.statecraft = 9;
r = K.choose(K.SCENES.cross_explain, K.SCENES.cross_explain.choices(S).find((c) => c.id === "explain"));
ok(r.check.pass && S.flags.includes("proven_spared") && !S.flags.includes("suspected_spy"), "a reason that holds clears it");
crossNow({}); K.combatOutcome("cross_e_duel", "spare", "a6_day1"); S.seen.push("cross_watched", "cross_duel");
K.choose(K.SCENES.cross_explain, K.SCENES.cross_explain.choices(S).find((c) => c.id === "silent"));
K.choose(K.SCENES.cross_truth, K.SCENES.cross_truth.choices.find((c) => c.id === "refuse")); S.seen.push("cross_explain", "cross_truth");
ok(sceneNext() === "cross_spy", "the fourth night: a spy in the camp, and you are blamed (" + S.scene + ")");
{ const rem = K.SCENES.cross_spy.choices.find((c) => c.id === "remember");
  ok(rem.game === "notice" && rem.trial.things.length >= rem.trial.count + 6, "catching him is a notice test, with enough faces to ask about");
  const keep = JSON.parse(JSON.stringify(S));
  K.choose(K.SCENES.cross_spy, rem, "win");
  ok(S.flags.includes("proven_spy") && !S.flags.includes("suspected_spy"), "remember him well and he is caught: proven");
  K.S = S = keep; K.choose(K.SCENES.cross_spy, rem, "lose");
  ok(S.flags.includes("suspected_war") && S.flags.includes("suspected_spy") && /do not know you/.test(String(K.warHelp(S).text)) && sceneNext() === "a6_day1", "not proven by the fourth night: suspected for the war, and no call for help");
  ok(/two paces behind you all day/.test(JSON.stringify(K.val(K.SCENES.a6_day1.body, S))) && /stopped pretending/.test(JSON.stringify(K.val(K.SCENES.a6_day16.body, S))), "the worst posting, and a shadow in later scenes");
  S.alive = false; ok(K.composeEnding(S).telling.some((l) => /never trusted/.test(JSON.stringify(l))), "and the telling says the Pandavas never trusted you"); }
S = fresh({ act: 6, age: 44, side: "kaurava" }); S.flags.push("role_healer");
K.go("a6_day1"); K.choose(K.SCENES.cross_call, K.choiceList(K.SCENES.cross_call).find((x) => x.c.id === "cross").c);
ok(K.val(K.ENCOUNTERS.cross_e_escape.enemies, S).length === 3 && K.val(K.ENCOUNTERS.cross_e_escape.enemies, S).every((u) => /Tent guard/.test(u.name)) && /tent guards/.test(K.val(K.ENCOUNTERS.cross_e_escape.intro, S)), "from the tents, three tent guards try to stop you");
K.combatOutcome("cross_e_escape", "win", "a6_day1");
ok(S.flags.includes("role_healer") && !S.flags.includes("role_front"), "a healer who crosses keeps to the tents");
// 80d. Beaten by your own line: dragged back, still a Kaurava, marked; not dead
S = fresh({ act: 6, age: 44, side: "kaurava", friend: "duryodhana" }); S.bonds.duryodhana = 8; S.flags.push("role_command", "council_kaurava");
{ const c0 = S.duty.court, k0 = S.rep.kuru;
  K.go("a6_day1"); K.choose(K.SCENES.cross_call, K.choiceList(K.SCENES.cross_call).find((x) => x.c.id === "cross").c);
  r = K.combatOutcome("cross_e_escape", "lose", "a6_day1");
  ok(S.alive && S.side === "kaurava" && !S.flags.includes("crossed_lines") && S.flags.includes("tried_to_cross") && S.flags.includes("role_front") && !K.rankOf(S) && !S.flags.includes("council_kaurava")
    && S.duty.court === c0 - 2 && S.rep.kuru === k0 - 2 && S.friend === "duryodhana" && /front rank, with a spearman at your back/.test(r.text), "dragged back: still a Kaurava, alive, no rank (the front rank), court duty and Kuru standing -2");
  K.go("a6_day1");
  ok(S.scene === "a6_day1" && /two paces behind you all day/.test(JSON.stringify(K.val(K.SCENES.a6_day1.body, S))) && /tried to walk out of his line/.test(JSON.stringify(K.val(K.SCENES.a6_duryodhana.body, S))),
    "no crossing scenes follow; day 1 and Duryodhana's last night say you are watched (" + S.scene + ")");
  S.alive = false; ok(K.composeEnding(S).telling.some((l) => /dragged {them} back/.test(JSON.stringify(l))), "the telling says the Kauravas dragged you back and watched you"); }
S = fresh({ act: 6, age: 44, side: "kaurava" }); S.flags.push("role_bard");
K.go("a6_day1"); K.choose(K.SCENES.cross_call, K.choiceList(K.SCENES.cross_call).find((x) => x.c.id === "cross").c); r = K.combatOutcome("cross_e_escape", "lose", "a6_day1");
ok(S.flags.includes("role_bard") && !S.flags.includes("role_front") && /back to the tents/.test(r.text), "a bard dragged back keeps to the tents, under guard");
// 81. Calling someone across, from the Pandava side
S = fresh({ act: 6, age: 44, side: "pandava", sibling: "devi", friend: "duryodhana" }); S.bonds.devi = 6; S.bonds.duryodhana = 7; S.flags.push("sibling_other_side_set");
S.attrs.wisdom = 8; S.skills.statecraft = 6;
K.go("a6_day1");
{
  const sc = K.SCENES[S.scene], ids = K.choiceList(sc).filter((x) => x.ok).map((x) => x.c.id);
  ok(sc.id === "cross_call" && ids.includes("call") && ids.includes("call_friend") && !ids.includes("cross"), "the Pandava side can call a sibling or a friend across, and cannot cross (" + ids + ")");
  K.choose(sc, K.choiceList(sc).find((x) => x.c.id === "call_friend").c);
  ok(S.friend === "duryodhana" && S.memories.some((m) => m.who === "duryodhana") && S.side === "pandava", "Duryodhana will not come (canon), and remembers that you asked");
  S.seen = S.seen.filter((x) => x !== "cross_call"); K.go("a6_day1");
  K.choose(K.SCENES.cross_call, K.choiceList(K.SCENES.cross_call).find((x) => x.c.id === "call").c);
  ok(S.calledAcross === "devi" && !S.flags.includes("sibling_other_side_set") && K.warAllies(S).includes("devi") && S.bonds.devi === 8, "a sibling who comes fights beside you for the war, and the bond rises");
  K.go("a6_day1");
  ok(S.scene === "cross_called" && K.val(K.ENCOUNTERS.cross_e_called.allies).includes("devi"), "the second morning, you fight beside her against the riders sent after her (" + S.scene + ")");
}
S = fresh({ act: 6, age: 44, side: "pandava", sibling: "dev" }); S.bonds.dev = 6; S.flags.push("sibling_other_side_set"); S.attrs.wisdom = 0; S.skills.statecraft = 0;
K.go("a6_day1"); K.choose(K.SCENES.cross_call, K.choiceList(K.SCENES.cross_call).find((x) => x.c.id === "call").c);
ok(!S.calledAcross && S.flags.includes("sibling_other_side_set") && S.memories.some((m) => m.who === "dev" && /not forgotten that you asked/.test(m.src)), "a sibling who will not come remembers that you asked");
// 82. The one who crossed: a death between the lines is its own ending; the telling names it
S = fresh({ act: 6, age: 44, side: "kaurava" }); S.flags.push("lost_to_ugra");
K.go("a6_day1"); K.choose(K.SCENES.cross_call, K.choiceList(K.SCENES.cross_call).find((x) => x.c.id === "cross").c); K.combatOutcome("cross_e_escape", "win", "a6_day1"); K.go("a6_day1");
K.combatOutcome("cross_e_duel", "lose", "a6_day1");
{ const e = K.composeEnding(S);
  ok(!S.alive && e.title === "The one who crossed" && e.art === "end_crossed" && K.ENDINGS.some((x) => x.title === e.title && x.art === "end_crossed"), "falling in the duel between the lines is the ending \"The one who crossed\"");
  ok(e.telling.some((l) => /the one who crossed/.test(String(l))) && /between the lines/.test(S.deathText), "the bards call you the one who crossed"); }
S = fresh({ act: 6, age: 44, side: "pandava" }); K.apply({ die: true, deathText: "x" });
ok(K.composeEnding(S).title !== "The one who crossed", "a death without crossing keeps its own ending");
// 83. The canon lock: nothing in the crossing kills or saves a canon figure
{
  const dies = [];
  for (const foe of ["ugra", "kanaka"]) { const T = fresh({ act: 6, age: 44, side: "pandava", crossFoe: foe }); const w = K.ENCOUNTERS.cross_e_duel.win.fx(T); if (w.die) dies.push(w.die); }
  ok(dies.length === 2 && dies.every((w) => !(K.PEOPLE[w] && K.PEOPLE[w].canon)), "the duel's dead are never canon figures (" + dies + ")");
  const T = fresh({ act: 6, age: 44, side: "kaurava", friend: "karna" }); T.bonds.karna = 9;
  const fx = K.ENCOUNTERS.cross_e_escape.win.fx(T);
  ok(!fx.die && !JSON.stringify(fx).includes("unflag\":[\"dead"), "crossing takes no life and gives none back");
}
// 84. Where it matters most, the war says you crossed; the telling names the child left behind
S = fresh({ act: 6, age: 44, side: "kaurava", child: "vasu", friend: "duryodhana" }); S.bonds.duryodhana = 10; S.bonds.vasu = 6; S.flags.push("vasu_away", "child_cmd_bhurishravas");
K.go("a6_day1"); K.choose(K.SCENES.cross_call, K.choiceList(K.SCENES.cross_call).find((x) => x.c.id === "cross").c); K.combatOutcome("cross_e_escape", "win", "a6_day1");
{ const said = (id) => JSON.stringify(K.val(K.SCENES[id].body, S));
  ok(/common spearman/.test(said("a6_day1")) && /walked out of his army/.test(said("a6_bhishma")) && /walk out of it/.test(said("a6_duryodhana")) && /Eighteen days ago/.test(said("a6_day18")), "day 1, Bhishma's bed, Duryodhana's last night and day 18 each say you crossed");
  S.alive = false; S.flags.push("won_crossing_duel"); S.crossFoe = "kanaka"; S.duty.conscience = 8;
  const t = K.composeEnding(S).telling.map((l) => JSON.stringify(l)).join(" ");
  ok(/say it gently/.test(t) && /son Vasu stayed in the Kaurava ranks/.test(t) && /killed {who}/.test(t), "the telling: the one who crossed (gently, for a good conscience), the duel, and Vasu left behind"); }
// 48. Reaching more lives (PRD reach, content/war_reach.js): a weaker tie draws a fighter in, and the opening line says how
{
  const sc = (id) => K.SCENES[id], ch = (id, cid) => K.val(sc(id).choices, K.S).find((c) => c.id === cid);
  const war = (o, flags) => { const s = fresh(Object.assign({ act: 6, age: 44 }, o)); s.flags.push(...(flags || ["role_front"])); return s; };
  const line = (id) => [].concat(K.val(sc(id).body, K.S)).filter((b) => b && b.memory).map((b) => K.text(b.memory)).join(" ");
  S = war({ side: "pandava", origin: "hastinapura" });
  ok(K.tieIravan(S) === null && K.resolveScene("a6_bhishma").id === "wr_word_iravan", "a Pandava fighter with no naga tie hears the word about Iravan's flank the night before");
  K.choose(sc("wr_word_iravan"), ch("wr_word_iravan", "go"));
  ok(K.tieIravan(S) === "letter" && K.resolveScene("a6_bhishma").id === "wl_iravan" && /fire last night/.test(line("wl_iravan")), "going on the word: Iravan's day opens, and says why you are there");
  S = war({ side: "pandava", origin: "hastinapura", friend: "charu" }); S.seen.push("wl_iravan");
  K.choose(sc("wr_word_iravan"), ch("wr_word_iravan", "go"));
  ok(K.tieIravan(S) === "friend" && /Charu asked you here/.test(line("wl_iravan")), "a friend at your side asks you along, and is named");
  S = war({ side: "pandava", origin: "hastinapura" }); K.choose(sc("wr_word_iravan"), ch("wr_word_iravan", "stay"));
  ok(K.resolveScene("a6_bhishma").id !== "wl_iravan" && K.resolveScene("a6_bhishma").id !== "wr_word_iravan", "staying away: no Iravan, and the word is not asked again");
  S = war({ side: "pandava" }, ["role_command"]);
  ok(K.tieIravan(S) === "company" && K.tieKings(S) === "company" && K.tieLake(S) === "company" && K.tieShakti(S) === "company", "a company leader is posted by the morning's orders");
  ok(K.tieIravan(war({ side: "pandava" }, ["role_healer"])) === null && K.tieKings(war({ side: "pandava" }, ["role_healer"])) === null, "healers are not drawn in by a weaker tie");
  S = war({ side: "kaurava", origin: "hastinapura", court: "dwaraka" }, ["role_command"]); S.court = null; S.origin = "matsya";
  ok(K.tieLake(S) === null, "no Kaurava company is left to search the lake");
  // The map on the fourteenth morning
  S = war({ side: "kaurava", origin: "matsya" });
  ok(K.resolveScene("a6_day14").id === "wr_map_14" && K.val(sc("wr_map_14").spots, S).length === 3, "a Kaurava fighter with no tie sees the field with two places and their own line");
  K.choose(sc("wr_map_14"), ch("wr_map_14", "shakti"));
  ok(K.tieShakti(S) === "general" && !K.tieBhuri(S) && K.resolveScene("a6_day15").id === "wc_shakti_k" && /chose the ground near Karna's chariot/.test(line("wc_shakti_k")), "choosing Karna's chariot: the Shakti's night opens through its general entrance");
  S = war({ side: "kaurava" }, ["role_command"]);
  ok(!K.test(sc("wr_map_14").when, S), "no map for one already posted to both");
  S = war({ side: "pandava", origin: "hastinapura" }); S.seen.push("wc_shakti_p", "kf_cry");
  ok(K.resolveScene("a6_day15").id === "wr_map_15", "the Pandavas' fifteenth morning has its own map");
  K.choose(sc("wr_map_15"), ch("wr_map_15", "kings")); S.seen.push("wr_map_15");
  ok(K.tieKings(S) === "general" && K.resolveScene("a6_day15").id === "kf_reach" && /not your king/.test(line("kf_reach")) && ch("kf_reach", "reach").t === "Cut through to the kings", "choosing the two kings: their fall, and the text owns that Drupada is not your king");
  S.seen.push("kf_fall");
  ok(!K.test(sc("kf_word").when, S), "only someone from home is asked to carry the ring home");
  S = war({ side: "pandava", origin: "hastinapura" }); S.seen.push("wc_shakti_p", "kf_cry"); K.choose(sc("wr_map_15"), ch("wr_map_15", "drona"));
  ok(K.nearDrona(S) && !K.tieKings(S), "standing near Dhrishtadyumna brings you to Drona's fall, not the kings'");
  // Seeds
  S = war({ side: "pandava", origin: "hastinapura" }, ["strung_great_bow"]);
  ok(K.tieKings(S) === "own" && K.val(sc("kf_reach").title, S) === "Drupada's parasol", "the one who strung Drupada's bow is tied to him");
  S = fresh({ act: 3, age: 25 }); const b0 = S.bonds.satyaki || 3; K.go("a3_swayamvara");
  ok(S.flags.includes("met_satyaki") && S.bonds.satyaki === b0 + 2, "Satyaki meets you at the swayamvara (bond +2)");
  S.side = "pandava"; S.flags.push("role_front"); S.act = 6;
  ok(K.reachFriend(S) === "satyaki", "and can ask you along in the war");
  S = fresh({ act: 4, age: 30, origin: "anga" }); K.go("a4_invite");
  ok(S.flags.includes("saw_vrishasena"), "near Karna, you see his small son in Anga");
}
// 49. Reach and canon: a weaker tie changes where you stand, never who dies or when; Part Two's lives on the eve of the war
{
  const sc = (id) => K.SCENES[id];
  ok(sc("wl_iravan_body").enter.die === "iravan" && sc("wl_iravan").choices.every((c) => c.next === "wl_iravan_body"), "Iravan still falls to Alambusha on the eighth day, whoever rode with him");
  ok(["wr_map_14", "wr_map_15", "wr_word_iravan", "wr_word_lake"].every((id) => !sc(id).enter && K.val(sc(id).choices, fresh({ act: 6, side: "pandava" })).every((c) => !c.combat && !c.next)), "the map and the word only choose where you stand");
  const out = require("os").tmpdir() + "/war_lives_test.json";
  require("child_process").execFileSync(process.execPath, [require("path").join(__dirname, "..", "tools", "split", "gen_war.js"), out], { stdio: "ignore" });
  const lives = JSON.parse(require("fs").readFileSync(out, "utf8"));
  global.atob = global.atob || ((x) => Buffer.from(x, "base64").toString("binary"));
  ok(lives.length === 6 && ["pandava", "kaurava"].every((sd) => lives.filter((l) => l.side === sd).length === 3) && lives.every((l) => { const s = K.importCode(l.code); return s.scene === "a6_eve" && s.side === l.side && s.alive; }),
    "Part Two's ready-made war lives: three on each side, each saved on the eve of the war");
}
// 90. Fights of other kinds (PRD fights, content/war_fights.js): the main fights keep their form and length.
// Each main fight of the war, by id: its hold, its rounds, deadly or not, and a hash of its enemies (both
// sides). Only day 17's two fights changed, and only in how they are played (kind "chariot").
require(G + "content/war_fights.js");
{
  const MAIN = "e_day1:0/0/1/ce4q e_guard:0/0/1/19jwq16 e_hunt:0/0/1/1abev2i e_wheel:0/0/1/1nsekju e_last_stand:0/6/1/k1xlai e_ring:0/0/1/rka4y2 e_gate:0/5/1/19hof7u e_road:0/0/1/17rmdfu e_jaya:0/0/1/1j6utpm e_night:0/0/1/vw016y e_dushasana:0/0/1/9axuyy e_day16:0/0/1/olpyve e_day18:0/0/1/1ha74ay e_raid:0/0/1/gug7ii e_ash:0/0/1/gug7ii hold_karna:6/0/0/11li45m hold_duryodhana:8/0/0/svt4qy hold_arjuna:6/0/0/ilpb2i hold_bhima:7/0/0/1hcd696 e_ep_bhishma:0/3/1/1oeefgq e_ep_carts:0/0/0/k7j2kq e_ep_ugra:0/0/1/1ld2l8q wc_e_child_line:0/5/0/1gpuwp5 wc_e_ghost:5/0/0/1c90tai wc_e_reach:0/5/0/1speu6i e_kb_ride:5/0/0/1vwrp3e e_kb_hold:6/0/0/10wpuoa e_kb_guard:5/0/0/16johai e_kf_reach:5/0/0/1pxmwy2 e_iravan:6/0/0/ebos96 e_lake_hold:5/0/0/1b5671m e_lake_hold_deep:5/0/1/1b5671m e_lake_three:4/0/0/1sfqbca e_lake_three_deep:4/0/1/1sfqbca oath_arjuna_12:7/0/1/bbh8cq oath_arjuna_16:7/0/1/k9u9qi oath_king_hold:6/0/0/18ttj4a bh_line9:5/0/0/1jtyiui cross_e_duel:0/0/1/zviave cross_e_called:0/0/1/178mqbu kd_e_son:6/0/0/e7g9xm kd_e_wheel:6/0/0/o241vu".split(" ");
  const h = (s) => { let x = 5381; for (const ch of s) x = ((x * 33) ^ ch.charCodeAt(0)) >>> 0; return x.toString(36); };
  const sig = (id) => { const e = K.ENCOUNTERS[id]; if (!e) return id + ":missing"; const en = ["pandava", "kaurava"].map((sd) => { const s = fresh({ age: 44, act: 6, side: sd }); s.flags.push("role_front"); return (K.val(e.enemies) || []).map((u) => u.name + ":" + u.hp + ":" + u.atk).join(","); }).join(" / ");
    return id + ":" + (e.hold || 0) + "/" + (e.rounds || 0) + "/" + (e.lethal ? 1 : 0) + "/" + h(en); };
  const changed = MAIN.filter((m) => sig(m.split(":")[0]) !== m);
  ok(!changed.length, "the " + MAIN.length + " main fights keep their rounds and enemies" + (changed.length ? " (changed: " + changed.map((m) => m.split(":")[0]).join(", ") + ")" : ""));
  const kinds = MAIN.map((m) => m.split(":")[0]).filter((id) => K.ENCOUNTERS[id].kind);
  ok(kinds.join() === "kd_e_son,kd_e_wheel" && kinds.every((id) => K.ENCOUNTERS[id].kind === "chariot"), "only day 17's two fights are played another way: with the chariot controls");
  const side = Object.keys(K.ENCOUNTERS).filter((id) => /^fs_/.test(id));
  ok(side.length >= 15 && side.every((id) => { const e = K.ENCOUNTERS[id]; return e.hold === 4 && !e.lethal && (K.val(e.beats) || []).length === 1; }), "every side battle is a hold of four rounds with one twist, never deadly (" + side.length + ")");
  // No main scene's fight was swapped for a side battle: side battles come only in their own scenes (and after a broken hold).
  const swapped = Object.values(K.SCENES).filter((sc) => !/^fs_/.test(sc.id) && sc.id !== "hold_broken" && (K.val(sc.choices, fresh({ act: 6, age: 44, side: "pandava" })) || []).some((c) => /^fs_/.test(c.combat || "")));
  ok(!swapped.length && ["a6_day1", "a6_capture", "a6_day13", "a6_day14", "a6_day16", "a6_day18"].every((d) => K.BEFORE[d].some((x) => /^fs_/.test(x))), "the side battles come in scenes of their own before the war days, and replace nothing");
}
// 91. Sprinkled by path, one special kind a war day at most (K.fightKind)
{
  const war = (o) => { const s = fresh(Object.assign({ act: 6, age: 44, side: "pandava" }, o)); s.flags.push("role_front"); return s; };
  const kinds = ["archer", "charioteer", "mace", "healer", "spy", "strategist", "bard"].map((p) => { const s = war({ path: p }); return p + ":" + (K.fightKind(s, 6, "path") || "hold") + "/" + (K.fightKind(s, 11, "path") || "hold"); });
  ok(kinds.join(" ") === "archer:range/range charioteer:chariot/chariot mace:mace/mace healer:carry/escort spy:breakthrough/breakthrough strategist:escort/breakthrough bard:hold/hold", "each path brings its kind: " + kinds.join(" "));
  S = war({ path: "archer" });
  const sk = K.SCENES.fs_sk_6, shown = K.choiceList(sk).filter((x) => x.ok).map((x) => x.c.id);
  ok(shown.join() === "fight_range,leave", "the archer's skirmish is an archery duel, or another company's");
  K.choose(sk, sk.choices.find((c) => c.id === "fight_range"));
  ok(S.flags.includes("fk_6_range") && K.fightKind(S, 6, "weather") === null && K.fightKind(S, 6, "range") === "range" && K.fightKind(S, 3, "weather") === "weather", "once a day has had its special kind, any other fight that day is the plain hold");
}
// 92. Escort: the fight is lost when the one you keep falls
{
  S = fresh({ act: 6, age: 44, side: "pandava" }); S.flags.push("role_front");
  const C = K.Combat, B = C.start("fs_sk_escort", () => {});
  const cart = B.units.find((u) => u.src === "The healers' cart"), p = C.player(); p.hp = p.maxHp = 9999;
  ok(B.rule && cart && cart.side === "ally", "the healers' cart rides with you");
  cart.hp = 0; C.act("guard");
  ok(B.over === "lose", "the cart goes over, and the fight is lost (" + B.over + ")");
  C.end();
}
// 93. Break through: a lane each round, only that lane's foe comes at you; the outer ring of day 13 never opens
{
  S = fresh({ act: 6, age: 44, side: "kaurava" }); S.flags.push("role_front");
  const C = K.Combat; let B = C.start("fs_sk_break", () => {}); let p = C.player(); p.hp = p.maxHp = 9999;
  const lanes = C.available().map((a) => a.id);
  ok(lanes.join() === "lane0,lane1,lane2,herbs" && !C.available().some((a) => a.id === "strike"), "the moves are the three ways through");
  const before = B.acts.length; C.act("lane1");
  ok(B.progress === 2 && B.acts.slice(before).filter((a) => /^e/.test(a.uid)).every((a) => a.uid === "e1"), "through the middle: two lengths, and only the spearmen strike at you");
  C.act("lane2"); C.act("lane0");
  ok(B.over === "win" && B.progress === 5, "through in three rounds: the fight is won (" + B.over + ")");
  C.end();
  S = fresh({ act: 6, age: 44, side: "pandava" }); S.flags.push("role_front");
  B = C.start("fs_d13_break", () => {}); p = C.player(); p.hp = p.maxHp = 9999;
  for (let i = 0; i < 8 && !B.over; i++) C.act("lane1");
  ok(B.over === "win" && B.progress === B.enc.reach - 1 && /sends for Abhimanyu/.test(K.combatOutcome("fs_d13_break", B.over, "a6_day13").text), "the outer ring never opens (canon): you come back, and Yudhishthira sends for Abhimanyu");
  C.end();
}
// 94. Weather it: no striking back; the Narayana weapon passes those who lay down their weapons
{
  S = fresh({ act: 6, age: 44, side: "pandava" }); S.flags.push("role_front");
  const C = K.Combat; let B = C.start("fs_d3_storm", () => {}); let p = C.player(); p.hp = p.maxHp = 9999;
  ok(C.available().map((a) => a.id).sort().join() === "cover,guard,herbs", "under Bhishma's arrows: guard, take cover, herbs, and nothing to strike with");
  for (let i = 0; i < 8 && !B.over; i++) C.act(i % 2 ? "guard" : C.available().find((a) => a.id === "cover").why ? "guard" : "cover");
  ok(B.over === "win", "live through four rounds and it is won (" + B.over + ")");
  C.end();
  B = C.start("fs_d15_narayana", () => {}); p = C.player(); p.hp = p.maxHp = 9999;
  C.act("guard"); C.act("lay_down");
  ok(B.over === "win" && /dragging Bhima down/.test(K.combatOutcome("fs_d15_narayana", "win", "a6_day16").text), "laying down your weapons inside the fight: it passes over you, and Bhima is dragged down (canon)");
  C.end();
  B = C.start("fs_d15_narayana", () => {}); p = C.player(); p.hp = p.maxHp = 9999;
  for (let i = 0; i < 8 && !B.over; i++) C.act("guard");
  ok(B.over === "lose", "stand against it to the end, and it finds you (" + B.over + ")");
  C.end();
}
// 95. The live kinds: without the screen (the tests, or motion off) each is the plain hold it is written as
{
  S = fresh({ act: 6, age: 44, side: "pandava" }); S.flags.push("role_front");
  const C = K.Combat;
  for (const id of ["fs_sk_range", "fs_sk_chariot", "fs_sk_mace", "fs_sk_carry", "fs_d14_chariot", "fs_d16_range", "fs_d18_mace", "fs_carry"]) {
    const B = C.start(id, () => {}), p = C.player(); p.hp = p.maxHp = 9999;
    const plain = !B.rule && !B.mode && C.available().some((a) => a.id === "strike");
    for (let i = 0; i < 10 && !B.over; i++) C.act("guard");
    if (!plain || B.over !== "win") ok(false, id + " is fought as a plain hold (" + B.over + ")");
    C.end();
  }
  ok(true, "the chariot, archery, mace and carrying fights are fought as plain four-round holds under the tests");
  ok(["fs_sk_range", "fs_sk_chariot", "fs_sk_mace", "fs_sk_carry", "fs_d14_chariot", "fs_d16_range", "fs_d18_mace", "fs_carry"].every((id) => { const t = K.val(K.ENCOUNTERS[id].play, S); return t && t.rules && t.stage; }), "and each has its test to be played live: rules and a stage");
}
// 96. Day 17 driven as chariot duels: the same counts, flags and last words as the holding fights
{
  const war = (o) => { const s = fresh(Object.assign({ act: 6, age: 44 }, o)); s.flags.push("role_front"); return s; };
  const C = K.Combat;
  S = war({ side: "kaurava" }); S.bonds.karna = 4;
  let B = C.start("kd_e_son", () => {});
  ok(B.kind === "chariot" && !B.mode && !B.rule, "under the tests Vrishasena's wheel is still the holding fight");
  C.settle("lose", 4); K.kdHoldCount(B);
  const r = K.combatOutcome("kd_e_son", B.over, "a6_day17"); C.end();
  ok(S.kdHeld === 4 && S.flags.includes("kd_stood") && S.bonds.karna === 6 && /Vrishasena's throat/.test(r.text) && /my son's wheel/.test(K.karnaLastWords(S)), "driven at his wheel until four rounds' worth: kd_stood, Karna +2, his last words, and Vrishasena still falls");
  S = war({ side: "kaurava" }); S.bonds.karna = 4;
  B = C.start("kd_e_son", () => {}); C.settle("lose", 2); K.kdHoldCount(B); K.combatOutcome("kd_e_son", B.over, "a6_day17"); C.end();
  ok(S.kdHeld === 2 && S.flags.includes("kd_fell_short") && !S.flags.includes("kd_stood"), "driven off early: fell short, as before");
  S = war({ side: "pandava" });
  B = C.start("kd_e_wheel", () => {}); C.settle("win"); K.kdHoldCount(B); K.combatOutcome("kd_e_wheel", B.over, "a6_day17"); C.end();
  ok(S.kdGuard === 6 && S.flags.includes("kd_guard_held"), "the Kaurava chariots kept off Arjuna's flank: kd_guard_held");
  S = war({ side: "pandava" });
  B = C.start("kd_e_wheel", () => {}); C.settle("lose", 3); K.kdHoldCount(B); K.combatOutcome("kd_e_wheel", B.over, "a6_day17"); C.end();
  ok(S.kdGuard === 3 && S.flags.includes("kd_guard_broken") && S.flags.includes("company_shaken"), "a chariot through to his flank: kd_guard_broken, as before");
  ok(["kd_e_son", "kd_e_wheel"].every((id) => K.ENCOUNTERS[id].play.stage && K.ENCOUNTERS[id].play.vehicle === "chariot") && K.ENCOUNTERS.kd_e_son.play.shield && K.ENCOUNTERS.kd_e_wheel.play.bow && K.ENCOUNTERS.kd_e_wheel.play.knock, "Vrishasena's wheel: arrows to catch; Arjuna's wheel: the bow and contact");
}
// 97. After a broken hold: carry a wounded man out instead of only a scar
{
  S = fresh({ act: 6, age: 44, side: "pandava" }); S.flags.push("role_division", "broke_karna", "company_broken");
  const hb = K.SCENES.hold_broken, c = hb.choices.find((x) => x.id === "carry");
  ok(c && c.combat === "fs_carry" && hb.choices.some((x) => x.id === "back"), "a broken line offers to carry a wounded man out, beside falling back");
  K.combatOutcome("fs_carry", "win", "a6_day17");
  ok(S.flags.includes("fs_carried") && !S.injuries.includes("scar"), "carried out whole: no scar");
  S = fresh({ act: 6, age: 44, side: "pandava" }); K.combatOutcome("fs_carry", "lose", "a6_day17");
  ok(S.flags.includes("fs_carried") && S.injuries.includes("scar"), "an arrow on the way: the scar, and he is still carried out");
}
// 98. Choice cards: no effect line; small signs for a fight, a danger and a vow; hidden locks on the teacher and the ashram
{
  const mk = (c, S) => K.choiceMarks(c, S).map((m) => m[0]).join(",");
  S = fresh({ act: 3, age: 25 });
  ok(mk(K.SCENES.a3_swayamvara.choices.find((c) => c.id === "fight"), S) === "fight" && mk(K.SCENES.a3_swayamvara.choices.find((c) => c.id === "watch"), S) === "", "a fight shows the bow; a plain choice shows no sign");
  ok(mk({ id: "x", check: { attr: "might", dc: 7, pass: {}, fail: { combat: "e_kings" } } }, S) === "fight" && mk({ id: "x", game: "aim", win: {}, lose: { combat: "e_kings" } }, S) === "fight", "a fight behind a test or a game shows the bow too");
  const calm = K.SCENES.a3_swayamvara.choices.find((c) => c.id === "calm");
  S.attrs.command = 0; S.skills.statecraft = 0;
  ok(K.choiceMarks(calm, S).some(([k, l]) => k === "death" && l === "Can cost your life") && mk({ id: "y", peril: { kind: "cell" }, check: { attr: "might", dc: 99 } }, S) === "cell", "a test out of your depth shows a skull for your life, bars for your freedom");
  S.attrs.command = 9; S.skills.statecraft = 9;
  ok(!K.choiceMarks(calm, S).length, "within your depth, no danger sign");
  const vow = K.choiceMarks(K.SCENES.a2_vow.choices.find((c) => c.id === "retreat"), S).find((m) => m[0] === "vow");
  ok(vow && vow[2] === "Kept: +1 attack in every fight · Broken: Bhima, Karna and your company turn from you", "a vow's one line: kept, then broken with who turns from you, once: " + (vow && vow[2]));
  S = fresh({ act: 2, age: 14, origin: "nishada" });
  const t = K.choiceList(K.SCENES.a2_teacher, S);
  ok(t.length && t.every((x) => x.ok), "the teacher's question shows only the teachers you can go to (" + t.map((x) => x.c.id).join(",") + ")");
  S = fresh({ act: 5, age: 33 });
  const a = K.choiceList(K.SCENES.a5_forest_boon, S);
  ok(a.every((x) => x.ok) && !a.some((x) => x.c.id === "serve"), "the ashram hides serving the sages until they know you");
  ok(K.choiceList({ id: "z", hideLocked: true, choices: [{ id: "a", req: { flag: "nope" }, locked: "No." }] }, S).length === 1, "a scene that hides locks never shows nothing");
}
// 99. A choice that would break a vow, a friendship or a weapon's condition carries an icon saying so
{
  S = fresh({ act: 6, age: 44, side: "pandava", friend: "arjuna", teacher: "drona" }); S.vows.push({ id: "spare_unarmed", broken: false, age: 20 }); S.bonds.arjuna = 4;
  const m = K.choiceMarks({ id: "x", t: "x", tags: ["strike_unarmed"], fx: {} }, S).map((x) => x[0]);
  ok(m.includes("breakvow") && m.includes("friend"), "breaking a vow Arjuna watches shows the struck vow and the broken friendship (" + m.join(",") + ")");
  ok(!K.choiceMarks({ id: "y", t: "y", fx: {} }, S).length, "a plain choice shows no icon");
}
// 100. A page already shown comes back whole: the quill writes a scene once per visit. A redraw (a
// closed window, a language switch) or Continue onto a scene already seen shows it at once, and a
// result redrawn is not written again. A new scene is written.
{
  S = fresh({ act: 6, age: 44, side: "pandava" }); S.seen.push("a6_eve"); S.scene = "a6_eve";
  K.go("a6_eve", true);
  ok(K.resumed === K.visit, "Continue onto a scene already seen marks the visit as a return");
  K.go("a6_day1");
  ok(K.resumed === 0, "a new arrival is not a return");
  const fs = require("fs"), path = require("path"), { JSDOM, VirtualConsole } = require("jsdom");
  const GAME = path.join(__dirname, ".."), html = fs.readFileSync(path.join(GAME, "index.html"), "utf8");
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ""), { runScripts: "outside-only", pretendToBeVisual: true, url: "https://localhost/", virtualConsole: new VirtualConsole() });
  const w = dom.window; w.HTMLElement.prototype.scrollIntoView = () => {};
  for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) w.eval(fs.readFileSync(path.join(GAME, m[1]), "utf8"));
  const WK = w.K; WK.headless = true;
  const written = () => w.document.querySelectorAll("#leaf .write").length;
  WK.S = Object.assign(WK.newLife(), { name: "T", origin: "panchala", pronoun: "she", age: 15, act: 2, teacher: "drona" });
  WK.go("a2_path");
  const first = written();
  WK.UI.redraw();
  const redrawn = written();
  ok(first > 0 && redrawn === 0, "a scene is written by the quill once; redrawn in the same visit it is there at once (" + first + " → " + redrawn + ")");
  WK.resume(JSON.parse(JSON.stringify(WK.S)));
  ok(written() === 0, "Continue (a loaded copy of the life) onto the same scene shows it at once");
  Object.assign(WK.S, { age: 8, act: 1 }); WK.go("a1_home");
  w.document.querySelector("#choices .choice").click();
  const res = written(); WK.UI.redraw();
  ok(res > 0 && written() === 0 && w.document.querySelector("#story .picked"), "what came of a choice is written once; redrawn, it is there at once, still after the choice");
  WK.go("a2_teacher");
  ok(written() > 0, "a new scene is written by the quill");
  w.close();
}
// 101. Stars on the weapon that suits you best: three for a clear lead, one each for a tie, none when level
{
  const stars = (attrs) => { S = fresh({ act: 2, age: 15 }); Object.assign(S.attrs, attrs); return K.SCENES.a2_path.choices.map((c) => c.id + ":" + K.val(c.stars, S)).filter((x) => !/:0$/.test(x)).join(","); };
  ok(stars({ aim: 5, might: 3, grace: 3, wisdom: 2, command: 1 }) === "archer:3", "a clear best attribute: three stars on its weapon");
  ok(stars({ aim: 4, might: 3, grace: 2, wisdom: 2, command: 1 }) === "archer:2", "a lead of one: two stars");
  ok(stars({ aim: 4, might: 4, grace: 2, wisdom: 2, command: 1 }) === "archer:1,mace:1", "two attributes level at the top: one star on each weapon");
  ok(stars({ aim: 3, might: 3, grace: 3, wisdom: 3, command: 3 }) === "", "all attributes level: no stars");
}
// 102. The card before a fight (ui/battle.js): never for the dream or a training bout, never under the
// tests; for any other fight it says how it is won and what you can do.
{
  const fs = require("fs"), path = require("path"), { JSDOM, VirtualConsole } = require("jsdom");
  const GAME = path.join(__dirname, ".."), html = fs.readFileSync(path.join(GAME, "index.html"), "utf8");
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ""), { runScripts: "outside-only", pretendToBeVisual: true, url: "https://localhost/", virtualConsole: new VirtualConsole() });
  const w = dom.window; w.HTMLElement.prototype.scrollIntoView = () => {};
  for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) w.eval(fs.readFileSync(path.join(GAME, m[1]), "utf8"));
  const WK = w.K, UI = WK.UI;
  ok(UI.fightBriefSkipped("e_dream") && UI.fightBriefSkipped("e_spar") && !UI.fightBriefSkipped("e_bandits") && !UI.fightBriefSkipped("e_guard"), "no fight briefing for the dream fight or the sparring bout; one for a real fight");
  ok(!UI.fightBriefWanted("e_bandits"), "the fight briefing is skipped under the tests (jsdom)");
  WK.headless = true; WK.RT.force = false; // the turn-based screen's card (a real-time fight under the tests is played by the bot at once)
  WK.S = Object.assign(WK.newLife(), { name: "T", origin: "panchala", pronoun: "she", age: 15, act: 2, teacher: "drona" });
  WK.go("a0_dream"); UI.startBattle("e_dream", () => {});
  const dreamCard = !!w.document.querySelector(".fbrief-wrap, .ftour");
  Object.assign(WK.S, { age: 17 }); WK.go("a2_spar"); UI.startBattle("e_spar", () => {});
  ok(!dreamCard && !w.document.querySelector(".fbrief-wrap, .ftour") && w.document.querySelector("#battle-actions .act"), "the dream fight and the sparring bout open straight on the fight, with no card or tour");
  Object.assign(WK.S, { age: 24, act: 3 }); WK.go("a3_lac"); UI.startBattle("e_bandits", () => {});
  const B = WK.Combat.state();
  ok(UI.fightBriefMode(B) === "melee" && /Bring them all down/.test(UI.fightBriefGoal(B)) && UI.fightBriefActions(B).some((a) => a[0] === "strike") && !w.document.querySelector(".fbrief-wrap"), "a real fight under the tests: no card on screen, but its mode, goal and moves are known");
  WK.Combat.end && WK.Combat.end();
  // The real-time screen on a laptop: without a touch screen, the key strip (no phone controls), whatever the
  // number of layouts; with one (a coarse pointer), the corner controls. touch is a boolean, never undefined.
  if (UI.startRealtime) {
    let coarse = false; w.matchMedia = () => ({ matches: coarse }); w.innerWidth = 1366; w.innerHeight = 657;
    WK.S = Object.assign(WK.newLife(), { name: "T", origin: "panchala", pronoun: "she", age: 30, act: 6, path: "archer" });
    UI.startRealtime("e_guard", () => {});
    const rt = () => w.document.getElementById("rt"), states = [];
    for (let i = 0; i < 3; i++) { w.dispatchEvent(new w.Event("resize")); states.push(rt().classList.contains("wide") && !rt().classList.contains("touch")); }
    coarse = true; w.dispatchEvent(new w.Event("resize"));
    ok(states.every(Boolean) && rt().classList.contains("touch"), "a 1366 laptop without touch keeps the key strip through every layout (" + states + "); a touch laptop gets the corner controls");
  }
  w.close();
}
// 103. Motion is always on: the device's reduce-motion setting is not followed. "Calm motion" (menu,
// off by default) stills things; "Reveal the story line by line" off stops only the line-by-line text.
{
  const fs = require("fs"), path = require("path"), { JSDOM, VirtualConsole } = require("jsdom");
  const GAME = path.join(__dirname, ".."), html = fs.readFileSync(path.join(GAME, "index.html"), "utf8");
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ""), { runScripts: "outside-only", pretendToBeVisual: true, url: "https://localhost/", virtualConsole: new VirtualConsole() });
  const w = dom.window; w.HTMLElement.prototype.scrollIntoView = () => {};
  // A device that asks for reduced motion, seen as a real browser (not the jsdom test harness).
  w.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  Object.defineProperty(w.navigator, "userAgent", { get: () => "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Safari/604.1" });
  for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) w.eval(fs.readFileSync(path.join(GAME, m[1]), "utf8"));
  const WK = w.K, UI = WK.UI, calmClass = () => w.document.documentElement.classList.contains("calm");
  w.localStorage.clear();
  ok(!UI.calm() && UI.motion() && UI.gradual() && !calmClass(), "with the device asking for reduced motion, the game still moves (calm motion is off by default)");
  WK.prefs({ gradual: false });
  ok(UI.motion() && !UI.calm() && !UI.gradual(), "turning off the line-by-line story leaves the puppets, fights and effects moving");
  WK.prefs({ calm: true });
  ok(UI.calm() && !UI.motion() && !UI.gradual() && calmClass(), "calm motion on: nothing moves, and the html element carries the class calm");
  WK.prefs({ calm: false, gradual: true });
  ok(!calmClass() && UI.motion() && UI.gradual(), "calm motion off again: motion and the story's reveal are back");
  WK.S = Object.assign(WK.newLife(), { name: "T", origin: "panchala", pronoun: "she", age: 15, act: 2 });
  UI.openMenu();
  const box = w.document.getElementById("m-calm");
  ok(box && !box.checked && box.closest("label").previousElementSibling.querySelector("#m-gradual"), "the menu has a Calm motion switch, off, beside the line-by-line switch");
  if (box) { box.checked = true; box.dispatchEvent(new w.Event("change")); }
  ok(WK.prefs().calm === true && calmClass(), "ticking Calm motion applies at once");
  w.close();
  const css = ["css/base.css", "css/screens.css"].map((f) => fs.readFileSync(path.join(GAME, f), "utf8")).join("");
  const js = fs.readdirSync(path.join(GAME, "js"), { recursive: true }).filter((f) => /\.js$/.test(f)).map((f) => fs.readFileSync(path.join(GAME, "js", f), "utf8")).join("");
  ok(!/prefers-reduced-motion/.test(css + js + html), "nothing in the game follows prefers-reduced-motion");
}
// 104. Real-time fights (PRD §18.15, engine/realtime.js): behind the developer switch; deterministic;
// one more try for a deadly fight; your side never blocks you and a blow marked on a friend lands on
// you when you stand in its path; at most two foes attack at once; the edges; the same outcomes.
{
  require(G + "engine/realtime.js");
  ["content/war_fights"].forEach((f) => require(G + f + ".js"));
  const RT = K.RT, C = K.Combat;
  const life = (o) => { const S = fresh(Object.assign({ path: "mace", act: 6, age: 30, side: "pandava" }, o || {})); S.attrs.might = 4; S.attrs.grace = 4; S.skills.mace = 3; S.items.herbs = 2; return S; };
  { const realStore = K.store, mem = {}; K.store = { get: (k) => (k in mem ? mem[k] : null), set: (k, v) => { mem[k] = v; return true; }, del: (k) => { delete mem[k]; }, ok: () => true };
    ok(RT.force == null && !RT.old() && RT.on() && RT.wanted("e_bandits") && !RT.wanted("e_day1") && C.shieldsWanted(K.ENCOUNTERS.e_day1), "the real-time fights are on for every player by default, and the war day's turn-based rules too");
    K.prefs({ fights: "turns" }); ok(!RT.on() && !RT.wanted("e_bandits"), "Fights: turn-based in the menu puts every fight on the turns");
    K.prefs({ fights: "realtime", oldFights: true }); ok(!RT.on() && !RT.wanted("e_bandits") && !C.shieldsWanted(K.ENCOUNTERS.e_day1), "the test-only oldFights override brings back the old turn-based fights and rules");
    K.store = realStore; RT.force = false; ok(!RT.on(), "RT.force = false (RT=0 in the headless tests) plays every fight on the turns"); }
  RT.force = true;
  ok(RT.wanted("e_bandits") && RT.wanted("cross_e_duel") && RT.wanted("fs_sk_mace") && !RT.wanted("e_day1") && !RT.wanted("e_dream") && !RT.wanted("e_wheel") && !RT.wanted("fs_sk_range"), "which fights are real-time: the list in §18.15 and the mace duel; the line, the wheel, the dream and the archery duel stay");
  // Determinism: the same seed, the same fight → the same outcome and the same final state.
  const runFp = (id, seed) => { K.seed(seed); life(); const out = RT.autoplay(id); return out + ":" + RT.last.fingerprint + RT.fingerprint(RT.last) + ":" + JSON.stringify(K.S.flags) + K.S.items.herbs; };
  ok(runFp("e_bandits", 77) === runFp("e_bandits", 77) && runFp("e_guard", 5) === runFp("e_guard", 5), "same seed, same fight: same outcome and the same state fingerprint");
  ok(runFp("e_guard", 5) !== runFp("e_guard", 6), "another seed plays another fight");
  // A standard fight ends with its foes dead (fallen, staying down), within the 30-60 s target.
  { let n = 0, t = 0, dead = true;
    for (let i = 0; i < 12; i++) { K.seed(300 + i); life(); const out = RT.autoplay("e_bandits"); const R = RT.last; if (out === "win") { n++; t += R.t; dead = dead && R.B.units.filter((u) => u.side === "enemy").every((u) => u.hp === 0 && u.rt.fell != null); } }
    ok(n >= 6 && dead && t / n >= 30 && t / n <= 60, "a standard real-time fight (the bandits) is won " + n + " times in 12 with every foe fallen, in " + (t / Math.max(1, n)).toFixed(1) + " s on average (30-60 s)"); }
  // Every blow is readable: a wind-up of at least 0.3 s, and the mark is full exactly as it lands.
  { K.seed(9); life(); const B = C.start("e_guard"); const R = RT.begin(B); let minWind = 9, fullAtLand = true, max = 0, edge = true, foeOut = false, atEdge = 1;
    const seen = new Map();
    for (let i = 0; i < 60 * 70 && !R.over; i++) {
      RT.step(R, i < 300 ? { move: -1 } : RT.bot(R));
      if (i === 299) atEdge = C.player().rt.x;
      for (const e of B.units.filter((u) => u.side === "enemy" && u.hp > 0)) {
        const a = e.rt.atk; if (a && !seen.has(a)) { seen.set(a, 1); minWind = Math.min(minWind, a.land - a.t0); }
        if (a && R.t >= a.land - 1e-6 && RT.markOf(R, e).fill < 1) fullAtLand = false;
        if (e.rt.entered && (e.rt.x < 0.03 - 1e-9 || e.rt.x > 0.97 + 1e-9)) foeOut = true;
      }
      max = Math.max(max, RT.attacking(R));
      if (C.player().rt.x < RT.EDGE - 1e-9 || C.player().rt.x > 1 - RT.EDGE + 1e-9) edge = false;
    }
    ok(minWind >= 0.3 && fullAtLand, "every enemy blow winds up at least 0.3 s, and its mark fills to the rim as it lands (shortest " + minWind.toFixed(2) + " s)");
    ok(max <= 2, "at most two foes attack at once");
    ok(edge && !foeOut && Math.abs(atEdge - RT.EDGE) < 1e-9, "you stay a tenth of the field from either edge, and foes stay on the field once in");
    C.end && (R.B.over || C.settle("win")); C.end(); }
  { // Four foes: two at a time come on, the rest wait as the next pack; still never more than two attack at once.
    K.encounter({ id: "t_rt_pack", title: "Pack", realtime: true, lethal: false, enemies: [K.foe("Raider", 2), K.foe("Raider", 2), K.foe("Raider", 2), K.foe("Raider", 1)], win: {}, lose: {} });
    K.seed(4); life(); const B = C.start("t_rt_pack"); const R = RT.begin(B); let max = 0; const c0 = RT.count(R), p0 = RT.packs(R);
    while (!R.over) { RT.step(R, RT.bot(R)); max = Math.max(max, RT.attacking(R)); }
    ok(c0 === 4 && p0.of === 2 && max <= 2, "a fight of four comes in two packs, with a running count; never more than two attack at once"); C.end(); }
  // Block (owner, 4 November): a shield-carrier holds up the shield where the others roll.
  { const rig = (path, seed) => { K.seed(seed); life({ path }); const B = C.start("e_guard"); const R = RT.begin(B); const p = C.player();
      const foes = B.units.filter((u) => u.side === "enemy"); const e = foes[0]; foes.slice(1).forEach((u) => { u.rt.x = 0.97; u.rt.cool = 99; u.rt.entered = false; u.rt.wave = 1; });
      p.rt.x = 0.4; p.rt.lane = 0; p.rt.face = 1; e.rt.x = 0.4 + e.rt.reach * 0.9; e.rt.lane = 0; e.rt.entered = true; e.rt.cool = 99; e.rt.face = -1; return { B, R, p, e }; };
    const strike = (o, act, early, heavy) => { const { R, p, e } = o; e.rt.atk = { id: "strike", on: p.uid, t0: R.t, land: R.t + 0.6, heavy: !!heavy }; e.rt.cool = 99; const hp = p.hp, br = R.breath;
      for (let i = 0; i < 50; i++) { RT.step(R, i >= early ? act : {}); if (!e.rt.atk && i > 37) break; } return { d: hp - p.hp, br: br - R.breath, stag: e.rt.stag }; };
    const A = rig("mace", 61), plain = strike(A, {}, 0); C.settle("win"); C.end();
    const Bk = rig("mace", 61), held = strike(Bk, { block: true }, 0); const blocks = Bk.R.stats.blocked; C.settle("win"); C.end();
    ok(plain.d > 0 && held.d < plain.d * 0.5 && blocks === 1, "Block: a frontal blow on the raised shield is mostly stopped (" + plain.d + " → " + held.d + ")");
    ok(held.br > 0 && Bk.R.block, "Block: the shield held up drains breath, and a blow taken on it more (" + held.br.toFixed(1) + " breath)");
    const Bh = rig("mace", 61); Bh.e.rt.x = 0.4 - Bh.e.rt.reach * 0.9; Bh.e.rt.face = 1; const behind = strike(Bh, { block: true }, 0); C.settle("win"); C.end();
    ok(behind.d >= plain.d * 0.7 || Bh.p.rt.face === -1 && behind.d < plain.d, "Block: the shield turns to meet a blow from behind, or it is not stopped");
    const Pf = rig("mace", 61), perfect = strike(Pf, { block: true }, 30); C.settle("win"); C.end();
    ok(perfect.d === 0 && perfect.stag > 0.3 && Pf.R.stats.perfectBlocks === 1, "Block: raised just as the mark fills, a perfect block: nothing gets through and the striker staggers (" + perfect.stag.toFixed(2) + " s)");
    const W = rig("mace", 61); W.R.breath = RT.P.blockMin + 1; for (let i = 0; i < 60 * 3; i++) RT.step(W.R, { block: true });
    ok(!W.R.block && W.R.winded && !RT.can(W.R, "block"), "Block: out of breath, the shield drops and cannot be raised until the breath comes back"); C.settle("win"); C.end();
    const S = rig("mace", 61); S.R.combo = 0; RT.step(S.R, { block: true }); RT.step(S.R, { block: true, strike: true }); const noBlow = !S.p.rt.blow && S.R.stats.blows === 0;
    const x0 = S.p.rt.x; for (let i = 0; i < 30; i++) RT.step(S.R, { block: true, move: -1 }); const slowDx = Math.abs(S.p.rt.x - x0); C.settle("win"); C.end();
    ok(noBlow && slowDx > 0 && slowDx < S.p.rt.speed * 0.5 * 0.6, "Block: no blow with the shield up; you walk behind it slowly");
    const Ar = rig("archer", 62); ok(!Ar.R.blocker && RT.can(Ar.R, "roll") && !RT.can(Ar.R, "block"), "the archer still rolls (no shield)"); RT.step(Ar.R, { block: true, roll: true, rollDir: -1 }); ok(Ar.R.roll > 0 && !Ar.R.block, "the archer's K rolls"); C.settle("win"); C.end();
    for (const pth of ["healer", "spy", "bard"]) { const D = rig(pth, 63); ok(!D.R.blocker && RT.can(D.R, "roll"), "the " + pth + " still rolls"); C.settle("win"); C.end(); }
    const Ch = rig("charioteer", 64); ok(Ch.R.blocker && !RT.can(Ch.R, "roll") && RT.can(Ch.R, "block"), "the charioteer on foot blocks instead of rolling"); C.settle("win"); C.end();
    // The mace: two big blows, an overhead smash then a side sweep, each with a long wind-up; about the old weight a second.
    const M = rig("mace", 65); const seq = [];
    for (let i = 0; i < 200 && seq.length < 4; i++) { RT.step(M.R, { strike: true }); for (const f of M.R.fx) if (f.k === "blow") seq.push(f); M.R.fx.length = 0; }
    const list = RT.comboOf(M.R), dps = (c) => c.reduce((s, b) => s + b.m, 0) / c.reduce((s, b) => s + b.len, 0); C.settle("win"); C.end();
    ok(list.length === 2 && seq.map((f) => f.arc).join(",") === "smash,sweep,smash,sweep" && list.every((b) => b.land >= 0.3) && list[1].knock > 0, "the mace strikes in two big blows, an overhead smash then a side sweep that knocks back (" + seq.map((f) => f.arc).join(",") + ")");
    const Sw = rig("charioteer", 66); const old = RT.comboOf(Sw.R); C.settle("win"); C.end();
    ok(old.length === 3 && Math.abs(dps(list) - dps(old)) / dps(old) < 0.1, "the mace's weight a second stays within a tenth of the three quick blows' (" + dps(list).toFixed(2) + " vs " + dps(old).toFixed(2) + ")");
    // A foe's mace: the smash and the sweep in turn, wound up longer.
    K.seed(67); life(); const B5 = C.start("fs_sk_mace"); const R5 = RT.begin(B5); const arcs = [];
    for (let i = 0; i < 60 * 40 && !R5.over && arcs.length < 2; i++) { RT.step(R5, RT.bot(R5)); for (const e of B5.units) if (e.side === "enemy" && e.rt && e.rt.atk && e.rt.atk.arc && !arcs.some((a) => a.a === e.rt.atk)) arcs.push({ a: e.rt.atk, w: e.rt.atk.land - e.rt.atk.t0 }); }
    ok(arcs.length === 2 && arcs[0].a.arc !== arcs[1].a.arc && arcs.every((a) => a.w >= RT.P.maceSweep - 1e-6), "a foe's mace: an overhead smash and a side sweep in turn, each wound up at least " + RT.P.maceSweep + " s (" + arcs.map((a) => a.a.arc + " " + a.w.toFixed(2)).join(", ") + ")");
    R5.B.over || C.settle("win"); C.end(); }
  // Archers fight as archers (owner, 4 November): your Strike looses arrows at any range (a half step back when a foe is on
  // top of you), never a sword; a foe archer only shoots.
  { K.seed(71); life({ path: "archer" }); const B = C.start("e_jayadratha"); const R = RT.begin(B); const p = C.player();
    const e = B.units.find((u) => u.side === "enemy" && !u.rt.archer), ar = B.units.find((u) => u.side === "enemy" && u.rt.archer);
    const shots = [], foeMoves = new Set(); let blows = 0;
    B.units.filter((u) => u.side === "enemy").forEach((u) => { u.rt.entered = true; });
    e.rt.x = p.rt.x + 0.5 * RT.BODY; e.rt.lane = p.rt.lane; e.rt.cool = 99; p.rt.face = 1; const x0 = p.rt.x;
    RT.step(R, { strike: true }); for (const f of R.fx) { if (f.k === "shot" && f.uid === p.uid) shots.push(f.shot); if (f.k === "blow") blows++; }
    const stepped = p.rt.x < x0;
    for (let i = 0; i < 60 * 40 && !R.over; i++) { p.hp = p.maxHp; RT.step(R, RT.bot(R)); for (const f of R.fx) { if (f.k === "shot" && f.uid === p.uid) shots.push(f.shot); if (f.k === "blow") blows++; } R.fx.length = 0; for (const u of B.units) if (u.rt && u.rt.archer && u.rt.atk) foeMoves.add(u.rt.atk.id); }
    ok(p.rt.weapon === "bow" && blows === 0 && shots.filter((s) => s.id === "arrows").length >= 6 && shots.filter((s) => s.id === "arrows").every((s) => s.m > 0) && shots.some((s) => s.knock > 0), "the archer's Strike looses arrows (a three-shot combo, the third knocking back), never a sword blow (" + shots.length + " arrows, " + blows + " blows)");
    ok(stepped && shots[0] && shots[0].on === e.uid, "a foe right on top of the archer: half a step back, and the arrow at him");
    ok(ar && ar.rt.weapon === "bow" && foeMoves.size > 0 && [...foeMoves].every((id) => ["arrows", "aimed", "pin", "volley"].includes(id)), "a foe archer only shoots, near or far (" + [...foeMoves].join(",") + ")");
    R.B.over || C.settle("win"); C.end(); }
  // Your side never blocks you; a blow marked on a friend lands on you when you step into its path.
  { K.seed(11); life(); const B = C.start("e_kings"); const R = RT.begin(B);
    const p = C.player(), bh = B.units.find((u) => u.side === "ally"), foe = B.units.find((u) => u.side === "enemy");
    B.units.filter((u) => u.side === "enemy" && u !== foe).forEach((u) => { u.rt.x = 0.97; u.rt.cool = 99; });
    p.rt.x = 0.3; bh.rt.x = 0.36; bh.rt.cool = 99; foe.rt.x = 0.8; foe.rt.cool = 99;
    for (let i = 0; i < 30; i++) RT.step(R, { move: 1 });
    ok(p.rt.x > 0.36 + RT.BODY * 0.2, "you walk through your own side");
    const fx = p.rt.x + 0.2; foe.rt.x = fx; bh.rt.x = fx - RT.BODY * 0.95; p.rt.x = fx - RT.BODY * 0.5; foe.rt.entered = true;
    const bh0 = bh.hp, p0 = p.hp; foe.rt.atk = { id: "strike", on: bh.uid, t0: R.t, land: R.t + 0.5, heavy: false }; foe.rt.face = -1;
    for (let i = 0; i < 40; i++) RT.step(R, {});
    ok(p.hp < p0 && bh.hp === bh0, "a blow marked on a friend lands on you when you stand in its path");
    // Foes block you: you cannot walk through one.
    foe.rt.cool = 99; foe.rt.atk = null; p.rt.x = foe.rt.x - RT.BODY;
    for (let i = 0; i < 60; i++) { foe.rt.lane = p.rt.lane; RT.step(R, { move: 1 }); }
    ok(p.rt.x < foe.rt.x, "a foe in your row blocks your way"); C.settle("win"); C.end(); }
  // An arrow strikes whoever is in its locked lane when it arrives (you, stepping in to cover a friend).
  { K.seed(12); life(); const B = C.start("e_panchala"); const R = RT.begin(B);
    const p = C.player(), ar = B.units.find((u) => /archer/.test(u.src)), cap = B.units.find((u) => u !== ar && u.side === "enemy");
    cap.rt.x = 0.97; cap.rt.cool = 99; ar.rt.x = 0.9; ar.rt.entered = true; ar.rt.cool = 99;
    B.units.push(Object.assign(C.core.makeUnit({ name: "Friend", hp: 40, atk: 3, abilities: ["strike"] }, "ally", 9, B.enc), {})); RT.step(R, {});
    const fr = B.units.find((u) => u.src === "Friend"); fr.rt.x = 0.5; fr.rt.cool = 99; p.rt.x = 0.3;
    ar.rt.atk = { id: "arrows", on: fr.uid, t0: R.t, land: R.t + 0.6, ranged: true, lane: 0.5, locked: false, heavy: false };
    for (let i = 0; i < 20; i++) RT.step(R, {});
    p.rt.x = 0.5; const p0 = p.hp, f0 = fr.hp;
    for (let i = 0; i < 60; i++) RT.step(R, {});
    ok(R.shots.length === 0 && p.hp < p0 && fr.hp === f0, "an arrow is a projectile down its locked lane: it strikes you, who stepped into the lane, not the friend it was aimed at"); C.settle("win"); C.end(); }
  // One more try in a deadly fight, a little hurt; a second loss counts as any loss.
  { K.seed(13); life(); let B = C.start("e_raid"); let R = RT.begin(B); let n = 0;
    while (!R.over && n++ < 60 * 200) RT.step(R, {});
    const first = R.over; const R2 = RT.retry(R);
    const hp = C.player().hp / C.player().maxHp;
    let m = 0; while (!R2.over && m++ < 60 * 200) RT.step(R2, {});
    ok(first === "retry" && R2.tries === 1 && Math.abs(hp - RT.P.retryHp) < 0.02 && R2.over === "lose" && R2.B.over === "lose", "a deadly real-time fight lost: one more try (a little hurt), and the second loss counts");
    C.end();
    K.seed(14); life(); B = C.start("e_bandits"); R = RT.begin(B); n = 0; while (!R.over && n++ < 60 * 300) RT.step(R, {});
    ok(R.over === "lose" && B.over === "lose", "an ordinary fight lost is lost at once (no second try)"); C.end(); }
  // The same outcomes, routed through the turn-based engine's end: withdrawing breaks the vow, sparing spares.
  { K.seed(15); const S = life(); S.vows.push({ id: "never_retreat", broken: false });
    const B = C.start("e_guard"); const R = RT.begin(B); RT.step(R, {}); RT.step(R, { withdraw: true });
    ok(R.over === "flee" && B.over === "flee" && S.vows.find((v) => v.id === "never_retreat").broken && S.flags.includes("company_shaken"), "Withdraw in real time ends the fight as a withdrawal and breaks the vow never to retreat, as on the turns");
    C.end();
    K.seed(16); life(); const B2 = C.start("e_ep_carts"); const R2 = RT.begin(B2); const e = B2.units.find((u) => u.side === "enemy"); e.hp = Math.max(1, Math.floor(e.maxHp * 0.04));
    B2.units.filter((u) => u.side === "enemy" && u !== e).forEach((u) => { u.rt.x = 0.97; u.rt.cool = 99; });
    e.rt.x = C.player().rt.x + RT.BODY; e.rt.entered = true; e.rt.cool = 99; RT.step(R2, {}); RT.step(R2, { spare: e.uid });
    const other = B2.units.find((u) => u.side === "enemy" && u !== e);
    ok(!R2.over && !B2.over && e.spared && C.spareable().length === 0 && RT.threats(R2).every((t) => t.uid !== e.uid), "sparing a beaten foe takes him out of the fight, and the fight goes on against the rest");
    const c0 = K.S.duty.conscience; other.hp = 0; RT.step(R2, {});
    ok(R2.over === "win" && B2.over === "win" && K.S.duty.conscience === Math.min(10, c0 + 1), "the rest killed: the fight is won, the spare branch's fx (conscience +1) applied once (" + c0 + " -> " + K.S.duty.conscience + ")");
    C.end();
    // Every foe spared: the encounter's spare branch.
    K.seed(18); life(); const B3 = C.start("e_ep_carts"); const R3 = RT.begin(B3); RT.step(R3, {});
    const foes3 = B3.units.filter((u) => u.side === "enemy"); foes3.forEach((u) => { u.hp = Math.max(1, Math.floor(u.maxHp * 0.04)); u.rt.entered = true; u.rt.cool = 99; });
    foes3.forEach((u) => { u.rt.x = C.player().rt.x + RT.BODY; RT.step(R3, { spare: u.uid }); });
    ok(R3.over === "spare" && B3.over === "spare" && B3.spared === 2, "every foe spared: the fight ends spared (" + R3.over + ", " + B3.spared + " spared)");
    C.end();
    const o = K.combatOutcome("e_ep_carts", "spare", "x"); ok(o.text === K.ENCOUNTERS.e_ep_carts.spare.text, "and the spare branch's text and effects follow, as on the turns");
    // Only a foe who kneels and asks: a weakened foe still standing cannot be spared (at half, or a fifth, of his health);
    // at 5% or less he kneels (beaten) and pleads (owner, 4 November: not at 30%).
    K.seed(19); life(); const B4 = C.start("e_ep_carts"); const R4 = RT.begin(B4); const f4 = B4.units.find((u) => u.side === "enemy"); f4.rt.entered = true; f4.rt.x = C.player().rt.x + RT.BODY; f4.rt.cool = 99;
    f4.hp = Math.round(f4.maxHp * 0.5); RT.step(R4, {}); let weak = C.spareable().includes(f4) || C.pleads(f4) || !!f4.rt.beaten;
    f4.hp = Math.round(f4.maxHp * 0.2); RT.step(R4, {}); weak = weak || C.spareable().includes(f4) || C.pleads(f4) || !!f4.rt.beaten;
    RT.step(R4, { spare: f4.uid }); const weakSpared = !!f4.spared;
    f4.hp = Math.max(1, Math.floor(f4.maxHp * 0.04)); RT.step(R4, {});
    ok(!weak && !weakSpared && C.pleads(f4) && f4.rt.beaten && RT.spareable(R4).includes(f4), "a foe at half or a fifth of his health fights on and cannot be spared; beaten to 5% he kneels and asks for mercy, and can be");
    const f5 = B4.units.find((u) => u.side === "enemy" && u !== f4);
    if (f5) { f5.hp = f5.maxHp; f5.status.asleep = 2; ok(C.pleads(f5) && C.spareable().includes(f5), "a foe asleep under the Sammohana (or bound) can still be spared whole"); delete f5.status.asleep; }
    C.end();
    // On the turns (the war-day screen): a kneeling foe makes no move, and the Spare move is offered only for him.
    RT.force = false; K.seed(20); life(); const B5 = C.start("e_ep_carts"); const [g1, g2] = B5.units.filter((u) => u.side === "enemy");
    g1.hp = Math.max(1, Math.floor(g1.maxHp * 0.04)); C.act("strike", g2.uid);
    const acted = B5.log.some((l) => l.u && l.u.uid === g1.uid && l.key && /strike|hit|lunge|swing/i.test(l.key));
    ok(C.pleads(g1) && !C.pleads(g2) && C.spareable().length === 1 && C.spareable()[0] === g1 && !g1.intent, "on the turns a kneeling foe pleads and makes no move; only he can be spared");
    C.spare(g1.uid); ok(!B5.over && g1.spared && g2.hp > 0, "on the turns too, sparing him lets the fight go on"); g2.hp = 0; C.act("strike", null);
    ok(B5.over === "win", "and it ends won when the other falls (" + B5.over + ")"); C.end(); RT.force = true; void acted; }
  // Effects that last rounds last about 4 s a round.
  { K.seed(17); life(); const B = C.start("e_bandits"); const R = RT.begin(B); const e = B.units.find((u) => u.side === "enemy");
    B.status(e, "stun", 1); let t0 = R.t; while (e.status.stun && R.t - t0 < 10) RT.step(R, {});
    ok(Math.abs(R.t - t0 - RT.ROUND) < 0.1, "a stun of one round lasts about 4 s"); C.settle("win"); C.end(); }
  // Rows: you in front, your side behind; at rest no two bodies in one row overlap by more than about a quarter.
  { let worst = 9, rows = new Set();
    for (let i = 0; i < 6; i++) { K.seed(500 + i); life(); const B = C.start(i % 2 ? "e_guard" : "t_rt_pack"); const R = RT.begin(B);
      while (!R.over) { RT.step(R, RT.bot(R)); if (R.n % 30) continue;
        // (at rest: not in a blow, nor stepping back from one just landed, rt.rec: with the foes' blows 15% softer on
        // 6 November, a raider that had just lunged was caught a third of a body from the next, for a moment)
        const us = B.units.filter((u) => u.hp > 0 && u.rt && !u.rt.atk && !u.rt.engaged && !u.rt.passing && (u.side !== "enemy" || u.rt.entered) && u.rt.down <= 0 && u.rt.stag <= 0 && !(u.rt.rec > 0));
        us.forEach((u) => rows.add(Math.round(u.rt.lane)));
        for (const a of us) for (const b of us) if (a !== b && a.side === b.side && Math.abs(a.rt.lane - b.rt.lane) < 0.1 && Math.abs(a.rt.lane - Math.round(a.rt.lane)) < 0.05) worst = Math.min(worst, Math.abs(a.rt.x - b.rt.x) / RT.BODY); }
      C.end(); }
    ok(rows.size === 3 && worst >= 0.5, "figures stand in three rows; bodies on one side in one row keep apart (closest " + worst.toFixed(2) + " of a body)"); }
  // A shield wall carried into the clash from the turns (owner, 6 November): for its seconds your side closes up behind
  // you and holds its shields (no blows); then the wall opens and they fight on.
  { K.seed(31); life(); const B = C.start("e_guard"); B.shields = true; const p = C.player();
    B.units.filter((u) => u.side !== "enemy").forEach((u) => { u.status.wall = 1; });
    const R = RT.begin(B), al = B.units.filter((u) => u.side === "ally" && !u.still);
    let struck = 0, far = 0, mx = 0;
    while (R.t < 3.6 && !R.over) { RT.step(R, {}); al.forEach((a) => { if (a.rt.atk) struck++; if (R.t > 1.5) { const d = Math.abs(a.rt.x - p.rt.x) / RT.BODY; mx = Math.max(mx, d); if (d > 0.8) far++; } }); }
    ok(al.length > 0 && !struck && !far, "under a shield wall your side closes up behind you and holds (" + al.length + " beside you, at most " + mx.toFixed(2) + " of a body away, " + struck + " blows)");
    let after = 0; while (R.t < 12 && !R.over) { RT.step(R, {}); al.forEach((a) => { if (a.rt.atk) after++; }); }
    ok(!B.units.some((u) => u.status.wall) && after > 0, "the wall opens after its seconds and they fight on (" + after + ")"); C.settle("win"); C.end(); }
  // A war day's clash keeps the war day's round: its beats are not played again in every clash (they were: in front of
  // Shikhandi your side was made exposed in each clash); and with the first pack fallen, the living stand on the field
  // (they were put off it, and the clash ended at once as "the pack is broken").
  { K.seed(41); life(); const B = C.start("e_ep_bhishma"); B.round = 3; const R = RT.begin(B, { clash: true });
    while (R.t < 12 && !R.over) RT.step(R, {});
    ok(B.round === 3 && !B.units.some((u) => u.side !== "enemy" && u.status.exposed), "a clash keeps the war day's round and plays no beat again (round " + B.round + ")"); C.settle("win"); C.end();
    K.seed(42); life(); const B2 = C.start("t_rt_pack"); B2.units.filter((u) => u.side === "enemy").slice(0, 2).forEach((u) => { u.hp = 0; });
    const R2 = RT.begin(B2, { clash: true }), up = B2.units.filter((u) => u.side === "enemy" && u.hp > 0);
    ok(up.length === 2 && up.every((u) => u.rt.entered && u.rt.x <= 0.97), "with the first pack fallen, the living stand on the field when a clash begins (" + up.map((u) => u.rt.x.toFixed(2)).join(", ") + ")"); C.settle("win"); C.end(); }
  // The parry (owner, 6 November): Strike pressed just before a foe's blade lands on you meets it (no blow lands, he reels);
  // too early it is an ordinary blow and his lands; a dagger only half stops a heavy blow; an arrow is never parried; a named
  // champion meets some of your blows with his own.
  { const duel = (path, o) => { K.seed(33); life({ path }); const B = C.start("e_guard"); const R = RT.begin(B), p = C.player();
      const e = B.units.find((u) => u.side === "enemy");
      B.units.forEach((u) => { if (u !== p && u !== e) { u.still = true; if (u.side === "enemy") { u.rt.entered = false; u.rt.x = 1.1; } } });
      p.rt.x = 0.4; p.rt.face = 1; e.rt.entered = true; e.rt.lane = p.rt.lane; e.rt.x = p.rt.x + e.rt.reach * 0.85; e.rt.face = -1; e.rt.cool = 99;
      if (o.swing) { RT.step(R, { strike: true }); RT.step(R, {}); } // your own blow in the air
      e.rt.atk = Object.assign({ id: "strike", on: p.uid, t0: R.t, land: R.t + (o.land || 0.1), ranged: false, area: false, lane: p.rt.x, locked: false, heavy: false, arc: null }, o.atk || {});
      const hp0 = p.hp; RT.step(R, { strike: true }); const t1 = R.t + 0.8; while (R.t < t1 && !R.over) RT.step(R, {});
      const out = { lost: hp0 - p.hp, stag: e.rt.stag, parries: R.stats.parries, part: R.stats.partParries }; C.settle("win"); C.end(); return out; };
    const a = duel("mace", {}), b = duel("mace", { land: 0.5 }), c = duel("spy", { atk: { heavy: true, id: "heavy" } }), d = duel("charioteer", { atk: { ranged: true, id: "arrows" } });
    ok(a.parries === 1 && a.lost === 0, "Strike just before his blade lands meets it: nothing lands (" + JSON.stringify(a) + ")");
    const sw = duel("mace", { swing: true });
    // (Build D, row 48: a swing is locked until it ends; until 7 November a mace blow in the air was broken off to meet his blade.)
    ok(sw.parries === 0 && sw.lost > 0, "a mace blow still in the air cannot meet his blade: the swing is yours until it ends (" + JSON.stringify(sw) + ")");
    ok(b.parries === 0 && b.lost > 0, "too early, it is an ordinary blow and his lands (" + JSON.stringify(b) + ")");
    ok(c.part === 1 && c.lost > 0, "a dagger only half stops a heavy blow (" + JSON.stringify(c) + ")");
    ok(d.parries === 0 && d.part === 0, "an arrow is never parried (" + JSON.stringify(d) + ")");
    K.seed(35); life({ path: "mace" }); const B = C.start("e_guard"); const R = RT.begin(B), p = C.player(); R.D.parryFoe = 2; // (2: even a heavy blow, met half as often)
    const e = B.units.find((u) => u.side === "enemy"); B.units.forEach((u) => { if (u !== p && u !== e) { u.still = true; if (u.side === "enemy") { u.rt.entered = false; u.rt.x = 1.1; } } });
    e.hero = true; e.rt.weapon = "sword"; e.rt.archer = false; e.rt.entered = true; e.rt.lane = p.rt.lane; p.rt.x = 0.4; e.rt.x = p.rt.x + p.rt.reach * 0.7; e.rt.cool = 99; e.rt.face = -1;
    const h0 = e.hp; RT.step(R, { strike: true }); const t1 = R.t + 0.8; while (R.t < t1 && !R.over) RT.step(R, {});
    ok(R.stats.parried === 1 && e.hp === h0, "a named champion can meet your blow with his own (" + R.stats.parried + ", " + (h0 - e.hp) + " lost)"); C.settle("win"); C.end(); }
  // Foes use their shields (owner, 6 November: "if a foe uses their shield, allow some time before they can strike"): a foe
  // with a shield, facing you and not winding up, catches your blow on it (only a part gets through); while he lowers it he
  // cannot strike, and your next blow in that time is not caught. Winding up a blow of his own, he cannot raise it.
  { const shieldDuel = (glance, o) => { K.seed(37); life({ path: o.path || "mace" }); const B = C.start("e_guard"); const R = RT.begin(B), p = C.player(); R.D.glance = glance;
      const e = B.units.find((u) => u.side === "enemy"); B.units.forEach((u) => { if (u !== p && u !== e) { u.still = true; if (u.side === "enemy") { u.rt.entered = false; u.rt.x = 1.1; } } });
      e.shield = !o.drawn; e.shieldDrawn = !!o.drawn; e.hero = false; e.person = false; e.rt.entered = true; e.rt.lane = p.rt.lane; p.rt.x = 0.4; p.rt.face = 1; e.rt.x = p.rt.x + p.rt.reach * 0.7; e.rt.cool = 99; e.rt.face = -1;
      if (o.winding) e.rt.atk = { id: "strike", on: p.uid, t0: R.t, land: R.t + 3, ranged: false, area: false, lane: p.rt.x, locked: false, heavy: false, arc: null };
      const h0 = e.hp; RT.step(R, { strike: true }); let t1 = R.t + 0.8; while (R.t < t1 && !R.over) RT.step(R, {});
      const out = { lost: h0 - e.hp, fblocks: R.stats.fblocks, struck: false, second: null };
      if (o.opening && out.fblocks === 1) {
        e.rt.cool = 0; let n = 0; while (e.rt.opening && !R.over && n++ < 400) { if (e.rt.atk) out.struck = true; RT.step(R, {}); } out.openFor = n;
        const h1 = e.hp; e.rt.cool = 99; e.rt.atk = null; e.rt.x = p.rt.x + p.rt.reach * 0.7; e.rt.face = -1; e.rt.stag = 0;
        RT.step(R, { strike: true }); t1 = R.t + 0.8; while (R.t < t1 && !R.over) RT.step(R, {});
        out.second = { lost: h1 - e.hp, fblocks: R.stats.fblocks };
      }
      C.settle("win"); C.end(); return out; };
    const plain = shieldDuel(0, {}), caught = shieldDuel(99, { opening: true }), drawn = shieldDuel(99, { drawn: true }), busy = shieldDuel(99, { winding: true });
    ok(plain.fblocks === 0 && caught.fblocks === 1 && caught.lost > 0 && caught.lost <= plain.lost * 0.6, "a foe catches your blow on his shield: only a part gets through (" + caught.lost + " of " + plain.lost + ")");
    ok(caught.second && !caught.struck && caught.second.fblocks === 1 && caught.second.lost > caught.lost, "while he lowers it he cannot strike, and your next blow is not caught (" + JSON.stringify(caught.second) + ")");
    ok(drawn.fblocks === 1, "a sword or spear foe's shield (drawn on every one since 6 November) catches blows too");
    ok(busy.fblocks === 0, "a foe winding up a blow of his own cannot raise his shield"); }
  // Two arrows to a press (owner, 6 November: "we should make the archers stronger"): the second at the next foe in front,
  // or both on a lone foe at RT.P.bowSecond of a blow each.
  { const volley = (two) => { K.seed(41); life({ path: "archer" }); const B = C.start("e_guard"); const R = RT.begin(B), p = C.player();
      const foes = B.units.filter((u) => u.side === "enemy");
      B.units.forEach((u) => { if (u !== p && u.side !== "enemy") u.still = true; });
      foes.forEach((u, i) => { u.rt.entered = i < (two ? 2 : 1); u.rt.cool = 99; u.rt.lane = p.rt.lane; u.rt.x = i < (two ? 2 : 1) ? 0.55 + i * 0.12 : 1.1; u.still = i >= (two ? 2 : 1); });
      p.rt.x = 0.3; p.rt.face = 1;
      RT.step(R, { strike: true }); const shots = R.shots.slice();
      const out = { n: shots.length, on: shots.map((x) => x.on), m: shots.map((x) => x.m), ids: foes.slice(0, 2).map((u) => u.uid) }; C.settle("win"); C.end(); return out; };
    const one = volley(false), two = volley(true);
    ok(one.n === 2 && one.on[0] === one.on[1] && Math.abs(one.m[0] - one.m[1]) < 1e-9 && one.m[0] < 0.62, "an archer looses two arrows a press: on a lone foe both, each lighter (" + JSON.stringify(one) + ")");
    ok(two.n === 2 && two.on[0] === two.ids[0] && two.on[1] === two.ids[1] && two.m[0] > two.m[1], "with two foes in front the second arrow goes to the next one (" + JSON.stringify(two) + ")"); }
  // Every arrow that lands pushes its foe back a little (owner, 6 November: "make the phone archer stronger"), without
  // staggering him.
  { K.seed(43); life({ path: "archer" }); const B = C.start("e_guard"); const R = RT.begin(B), p = C.player();
    const e = B.units.find((u) => u.side === "enemy");
    B.units.forEach((u) => { if (u !== p && u !== e) { u.still = true; if (u.side === "enemy") { u.rt.entered = false; u.rt.x = 1.1; } } });
    e.rt.entered = true; e.rt.cool = 99; e.rt.lane = p.rt.lane; e.rt.x = 0.6; e.still = true; e.hero = false; e.person = false; e.shield = false; e.shieldDrawn = false; p.rt.x = 0.3; p.rt.face = 1;
    const x0 = e.rt.x; RT.step(R, { strike: true }); const t1 = R.t + 0.9; while (R.t < t1 && !R.over) RT.step(R, {});
    ok(e.rt.x > x0 + RT.P.arrowPush * RT.BODY * 1.5 && e.rt.stag <= 0, "an archer's arrows push the foe back a little, without a stagger (" + (e.rt.x - x0).toFixed(3) + ")"); C.settle("win"); C.end(); }
  // You step between rows (a short step); not into a row where a foe stands right beside you; your side makes room.
  { K.seed(21); life(); const B = C.start("e_guard"); const R = RT.begin(B); const p = C.player();
    B.units.filter((u) => u.side === "enemy").forEach((u) => { u.rt.x = 0.97; u.rt.cool = 99; u.rt.wave = 1; u.rt.entered = false; });
    const al = B.units.find((u) => u.side === "ally"); RT.step(R, {});
    const before = Math.round(al.rt.lane); RT.step(R, { row: 1 });
    let n = 0; while (Math.abs(p.rt.lane - 1) > 1e-6 && n++ < 60) RT.step(R, {});
    if (before === 2) { RT.step(R, { row: 1 }); while (Math.abs(p.rt.lane - 2) > 1e-6 && n++ < 60) RT.step(R, {}); n /= 2; }
    for (let i = 0; i < 90; i++) RT.step(R, {});
    ok(n <= 18 && Math.round(al.rt.lane) !== before, "you step into the next row in about a quarter of a second, and a friend standing there moves to another row");
    const f = B.units.find((u) => u.side === "enemy"); f.rt.entered = true; f.rt.x = p.rt.x + 0.03; f.rt.lane = 2; const at = p.rt.lane;
    RT.step(R, { row: 2 - at }); for (let i = 0; i < 30; i++) { f.rt.x = p.rt.x + 0.03; f.rt.lane = 2; RT.step(R, {}); }
    ok(p.rt.lane === at, "you cannot step into a row where a foe stands right beside you"); C.settle("win"); C.end(); }
  // A turn-based war day beside your company: choose your place in the line; later, changing it costs the round.
  { K.seed(31); const S = life(); S.flags.push("role_command");
    const B = C.start("e_day16"); const p = C.player();
    ok(B.place === "middle" && C.setPlace("front") && B.place === "front" && B.round === 1, "a war day with your company: your place in the line, chosen freely before the first round");
    const on = (place) => { B.place = place; let n = 0; const e = B.units.find((u) => u.side === "enemy"); for (let i = 0; i < 400; i++) { const it = C.core.targetsFor(e, K.ABILITIES.strike); if (it === p) n++; } return n / 400; };
    const front = on("front"), mid = on("middle"), flank = on("flank"); B.place = "front";
    ok(front > mid && mid > flank, "the front draws more of the blows than the middle, the flank fewer (" + [front, mid, flank].map((x) => Math.round(x * 100) + "%").join(" / ") + ")");
    C.act("strike", null); const r0 = B.round;
    ok(C.setPlace("flank") && B.round === r0 + 1 && B.place === "flank", "changing place later costs the round");
    C.settle("win"); C.end();
    const realStore = K.store, mem = {}; K.store = { get: (k) => (k in mem ? mem[k] : null), set: (k, v) => { mem[k] = v; return true; }, del: (k) => { delete mem[k]; }, ok: () => true }; K.prefs({ oldFights: true });
    K.seed(31); life().flags.push("role_command"); const B2 = C.start("e_day16");
    ok(!B2.place && !C.setPlace("front"), "under the test-only oldFights override, no place in the line: the war day is as before"); C.settle("win"); C.end(); K.store = realStore; }
  // Shields (PRD §18.15): a shield wall halves every blow on your side for the round and raises their shields; your
  // company raises its shields against a blow marked on them; the player carries one only where the path suits it.
  { K.seed(33); life({ path: "archer" }).flags.push("role_command"); C.stepNext = true;
    const B = C.start("e_day16"); C.stepNext = false; const p = C.player(), co = B.units.find((u) => u.side === "ally" && u.plural), e = B.units.find((u) => u.side === "enemy");
    ok(B.shields && p.abilities.includes("wall") && p.abilities.includes("rally_line"), "a war day with your company: Shield wall and Rally among the moves");
    const blow = (t, setup) => { const hp = t.hp; K.seed(77); if (setup) setup(); B.hit(e, t, 1); const d = hp - t.hp; t.hp = hp; return d; };
    const plain = blow(p), plainCo = blow(co);
    C.act("wall", null);
    const walled = blow(p);
    ok(B.units.filter((u) => u.side !== "enemy" && u.hp > 0).every((u) => u.status.wall) && B.lastShield && B.lastShield.kind === "wall", "Shield wall: everyone on your side behind raised shields for the round");
    ok(walled < plain && Math.abs(walled - Math.max(1, Math.round((plain + p.def) * 0.5 - p.def))) <= 1, "Shield wall halves the blow (" + plain + " → " + walled + ")");
    while (C.foesPending()) C.resolve("miss");
    ok(!p.status.wall, "the shield wall lasts the round only");
    const raised = blow(co, () => { B.plan = { by: e.uid, uid: co.uid }; }); B.plan = null;
    ok(raised < plainCo && B.lastShield && B.lastShield.kind === "raised", "your company raises its shields against a blow marked on them (" + plainCo + " → " + raised + ")");
    C.settle("win"); C.end();
    ok(C.hasShield({ path: "charioteer" }) && C.hasShield({ path: "strategist" }) && C.hasShield({ path: "mace" }) && !C.hasShield({ path: "archer" }) && !C.hasShield({ path: "healer" }) && !C.hasShield({ path: "spy" }) && !C.hasShield({ path: "bard" }), "the player carries a shield on the mace and sword paths (mace, charioteer, strategist), not an archer or a short blade");
    K.seed(34); life({ path: "charioteer" }); const R1 = RT.begin(C.start("e_guard")); const s1 = R1.shield; C.settle("win"); C.end();
    K.seed(34); life({ path: "archer" }); const R2 = RT.begin(C.start("e_guard")); const s2 = R2.shield; C.settle("win"); C.end();
    ok(s1 && !s2, "real time: the charioteer fights with a shield, the archer without");
    K.seed(35); life(); const B3 = C.start("e_last_stand"); const present = () => B3.units.filter((u) => u.side === "enemy" && !u.away && u.hp > 0);
    ok(B3.packs === 2 && present().length === 2 && !present().some((u) => u.hero && B3.units.some((x) => x.side === "enemy" && !x.hero && x.away)), "four foes come in two packs, the named last (" + present().map((u) => u.name).join(", ") + ")");
    present().forEach((u) => { u.hp = 0; }); C.act("strike", null);
    ok(present().length === 2 && B3.packNow === 1 && !B3.over, "a pack beaten: the next comes on, the fight goes on");
    C.settle("win"); C.end(); }
  // Friends follow their orders: all-out fights, hold back stays behind you and does not strike.
  { const run = (order) => { K.seed(41); life(); const B = C.start("e_kings"); const R = RT.begin(B); R.orders.friend = order; const bh = B.units.find((u) => u.side === "ally");
      let dealt = 0; const hit = B.hit; B.hit = function (u, t, m, o) { const d = hit.call(B, u, t, m, o); if (u === bh) dealt += d; return d; };
      for (let i = 0; i < 60 * 20 && !R.over; i++) RT.step(R, RT.bot(R)); C.settle("win"); C.end(); return dealt; };
    const all = run("allout"), hold = run("hold");
    ok(all > 0 && hold === 0, "a friend on all-out fights (" + all + " dealt in 20 s); on hold back he stays behind you and does not strike"); }
  // Your soldiers follow their orders and pass you (you never block your own side; another row is no obstacle):
  // all-out walks past you up to a foe and strikes; defend stays by you and strikes what comes in reach; stay out stays behind.
  { const run = (order) => { K.seed(41); life(); const B = C.start("e_guard"); const R = RT.begin(B); R.orders.soldiers = order;
      const so = B.units.find((u) => u.side === "ally" && u.plural), p = C.player(); let dealt = 0, ahead = -9, far = 0; p.rt.x = 0.15; // (you stand back: the foes, a sword and a bow, come no nearer than their reach)
      const hit = B.hit; B.hit = function (u, t, m, o) { const d = hit.call(B, u, t, m, o); if (u === so) dealt += d; return d; };
      for (let i = 0; i < 60 * 20 && !R.over; i++) { p.hp = p.maxHp; RT.step(R, {}); if (so.hp > 0) { ahead = Math.max(ahead, so.rt.x - p.rt.x); far = Math.max(far, Math.abs(so.rt.x - p.rt.x)); } }
      C.settle("win"); C.end(); return { dealt, ahead, far: far / RT.BODY }; };
    const a = run("allout"), d = run("defend"), st = run("stay");
    ok(a.dealt > 0 && a.ahead > 0, "soldiers on all-out pass you and strike a foe (" + a.dealt + " dealt, " + a.ahead.toFixed(2) + " of the field ahead of you)");
    ok(d.dealt > 0 && d.far <= 2, "soldiers on defend stay by you (within " + d.far.toFixed(1) + " bodies) and strike what comes in reach (" + d.dealt + " dealt)");
    ok(st.dealt === 0 && st.ahead < 0, "soldiers on stay out keep behind you and do not strike"); }
  // A divine weapon in real time takes the share of a foe's health it takes on the turns: 70-100% of each ordinary foe's
  // (owner, 9 November: "most of the pack"). Outside the war it is spoken only under a tenth of your life.
  { const share = (rt) => { K.seed(52); const S = life(); S.astras = [{ id: "agneya", from: "x" }]; const B = C.start("e_bandits"); const R = rt ? RT.begin(B) : null;
      const p = C.player(); p.hp = Math.max(1, Math.floor(p.maxHp * 0.08));
      const foes = B.units.filter((u) => u.side === "enemy"); foes.forEach((u) => { if (rt) { u.rt.entered = true; u.rt.x = 0.6; } });
      const hp0 = foes.map((u) => u.hp);
      if (rt) { RT.step(R, { astra: "agneya" }); } else C.core.use(C.player(), "agneya", null);
      const f = foes.reduce((n, u, i) => n + (hp0[i] - u.hp) / u.maxHp, 0) / foes.length; C.settle("win"); C.end(); return f; };
    const turns = share(false), real = share(true);
    ok(turns >= 0.7 && real >= 0.7 && Math.abs(real - turns) <= 0.3, "a divine weapon takes 70-100% of each ordinary foe's health, in real time as on the turns (" + Math.round(real * 100) + "% / " + Math.round(turns * 100) + "%)"); }
  // Try again: what is used once a battle (the divine weapon, the call for help) stays used in the second try.
  { K.seed(53); const S = life(); S.astras = [{ id: "agneya", from: "x" }]; const B = C.start("e_raid"); const R = RT.begin(B);
    B.units.filter((u) => u.side === "enemy").forEach((u) => { u.rt.entered = true; u.rt.x = 0.6; });
    RT.step(R, { astra: "agneya" }); const used = !!B.used.astra;
    let n = 0; C.player().hp = 1; while (!R.over && n++ < 60 * 200) { C.player().hp = Math.min(C.player().hp, 1); RT.step(R, {}); }
    const R2 = RT.retry(R);
    ok(used && R.over === "retry" && R2.B.used.astra && RT.astras().every((x) => !!x.why), "Try again: the divine weapon used in the first try stays used in the second");
    C.settle("lose"); C.end(); }
  // A figure falls toward the middle of the stage, never off its edge.
  ok(RT.fallDir({ rt: { x: 0.85 } }) === -1 && RT.fallDir({ rt: { x: 0.15 } }) === 1, "the fallen fall toward the middle of the stage");
  // Struck down, he falls away from the one who struck him (the strike and defence study, 8 November), even where his body is
  // nearly half the field long (a phone); back over the striker only when most of him would lie off the field.
  { const len = RT.fallLen;
    const away = [0.3, 0.47].every((L) => { RT.fallLen = L; return RT.fallDir({ rt: { x: 0.55, lastFrom: 0.36 } }) === 1 && RT.fallDir({ rt: { x: 0.45, lastFrom: 0.64 } }) === -1; });
    RT.fallLen = 0.3; const edge = RT.fallDir({ rt: { x: 0.92, lastFrom: 0.7 } }) === -1;
    const once = { rt: { x: 0.55, lastFrom: 0.36 }, hp: 0 }; RT.fallDir(once); once.rt.lastFrom = 0.8; const kept = RT.fallDir(once) === 1;
    RT.fallLen = len;
    ok(away && edge && kept, "the fallen fall away from the blow that felled them, unless that would put most of them off the field; decided once"); }
  RT.force = false;
}
// 120. Act checkpoints (engine/flow.js): a copy of the life at the start of every act, kept compactly;
// going back restores that act's copy, and a death already written stays in the Book of Lives.
{
  const mem = {}; global.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  K.UI = K.UI || {}; if (!K.recordLife) require(G + "ui/lives.js");
  const pk = (a) => a[Math.floor(K.rng() * a.length)];
  // A life played at random (as tests/lives.js does) until it ends; returns the acts it started, after the prologue.
  const play = (seed, story) => {
    K.seed(seed); const L = (K.S = K.newLife()); K.momentQueue.length = 0;
    Object.assign(L, { name: "Ira", pronoun: "she", origin: pk(Object.keys(K.ORIGINS)), temperament: pk(Object.keys(K.TEMPERAMENTS)), heirloom: pk(Object.keys(K.HEIRLOOMS)), storyMode: !!story });
    K.go(K.FIRST_SCENE); const acts = new Set();
    for (let n = 0; n < 700; n++) {
      const sc = K.SCENES[K.S.scene]; if (!sc.prologue && !sc.ending) acts.add(K.S.act);
      if (sc.ending) break;
      const { c } = pk(K.choiceList(sc).filter((x) => x.ok));
      const r = c.game ? K.choose(sc, c, pk(["win", "close", "lose"])) : K.choose(sc, c);
      let next = r.next; if (r.combat) next = K.combatOutcome(r.combat, K.rng() < 0.5 ? "win" : "lose", r.next).next;
      K.go(K.S.alive ? next : "end_death");
    }
    return [...acts].sort();
  };
  let seed = 11, acts;
  for (; seed < 400; seed++) { acts = play(seed); if (!K.S.alive && K.S.act >= 4) break; }
  const cp = K.checkpoints();
  ok(!K.S.alive && cp && cp.id === K.S.lifeId && JSON.stringify(cp.acts.map((a) => a.act)) === JSON.stringify(acts), "a checkpoint for every act the life reached (" + acts.join(",") + "), seed " + seed);
  const stored = mem["kurukshetra.v2.acts"].length, whole = cp.acts.reduce((n, a) => n + JSON.stringify(K.checkpointLife(a.act)).length, 0);
  ok(stored < whole * 0.7, "kept compactly: " + stored + " characters for " + cp.acts.length + " acts (" + whole + " whole)");
  const third = K.checkpointLife(3);
  ok(third && third.act === 3 && K.SCENES[third.scene].act === 3 && third.alive && cp.acts.find((a) => a.act === 3).age === third.age, "the copy of Act III is the life at the start of Act III (" + third.scene + ", age " + third.age + ")");
  const e = K.composeEnding(K.S); K.recordLife(K.S, e);
  const deaths = K.lives().filter((r) => !r.alive).length, died = K.S.act;
  const back = K.backToAct(3);
  ok(back && K.S === back && K.S.alive && K.S.act === 3 && K.S.scene === third.scene && !K.S.recorded, "going back resumes the copy of the life at the start of Act III");
  ok(K.lives().length >= 1 && K.lives().filter((r) => !r.alive).length === deaths && K.lives()[0].title === e.title, "the death stays in the Book of Lives as a death (" + e.title + ")");
  ok(JSON.stringify(K.checkpoints().acts.map((a) => a.act)) === JSON.stringify(acts.filter((a) => a <= 3)) && died > 3, "the acts after it are dropped, to be lived again");
  ok(JSON.parse(mem["kurukshetra.v2.auto"]).scene === third.scene, "the copy becomes the autosave");
  // A save code carrying the acts (the split build's crossing) gives them to the browser that reads it.
  const code = K.exportCode({ acts: true, here: true }); delete mem["kurukshetra.v2.acts"];
  const s2 = K.importCode(code);
  ok(s2.cps === undefined && JSON.stringify(K.checkpoints().acts.map((a) => a.act)) === JSON.stringify(acts.filter((a) => a <= 3)) && K.checkpointLife(3).scene === third.scene, "a code with its acts: the acts are kept where it is read");
  // Unlimited: back again, and again.
  ok(K.backToAct(1) && K.S.act === 1 && K.backToAct(1) && K.S.act === 1, "going back is unlimited");
  // The prologue (a dream of the war) is not an act start; waking into Act I is.
  delete mem["kurukshetra.v2.acts"]; K.S = Object.assign(K.newLife(), { name: "P", origin: "suta" }); K.go(K.FIRST_SCENE);
  ok(!K.checkpoints(), "no checkpoint in the prologue");
  delete global.localStorage;
}
// 121. Every ending is a full-screen moment (ui/ending.js), shown again whole; a death offers the acts.
{
  const fs = require("fs"), path = require("path"), { JSDOM, VirtualConsole } = require("jsdom");
  const GAME = path.join(__dirname, ".."), html = fs.readFileSync(path.join(GAME, "index.html"), "utf8");
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ""), { runScripts: "outside-only", pretendToBeVisual: true, url: "https://localhost/", virtualConsole: new VirtualConsole() });
  const w = dom.window; w.HTMLElement.prototype.scrollIntoView = () => {};
  for (const m of html.matchAll(/<script src="([^"]+)"><\/script>/g)) w.eval(fs.readFileSync(path.join(GAME, m[1]), "utf8"));
  const WK = w.K; WK.headless = true;
  const SET = {
    "The wise elder": { endChoice: "elder" }, Renunciation: { endChoice: "forest" }, "The teller": { endChoice: "teller" }, Vengeance: { endChoice: "vengeance" },
    "The homecoming": { endChoice: "home" }, "Broken survivor": { endChoice: "home", spouse: "madhavi", child: "vasu", dead: ["madhavi", "vasu"] }, "The wanderer": {}, "The banner-bearer": { endChoice: "banner", flags: ["bore_banner"] },
    "Glorious death": { alive: false, vows: [{ id: "never_lie", broken: false }] }, "The oath to the death": { alive: false, vows: [{ id: "samshaptaka", broken: false }] },
    "Fallen at Kurukshetra": { alive: false }, "Into the wheel": { alive: false, flags: ["died_with_abhimanyu"] }, "Against the boy in the wheel": { alive: false, flags: ["fell_to_abhimanyu"] },
    "A life cut short": { alive: false, act: 3, flags: ["peril_death"], deathAt: { act: 3 } }, "Beside Karna": { alive: false, flags: ["died_with_karna"] }, "The burnt house": { alive: false, act: 3, flags: ["died_in_fire"] },
    "The one who crossed": { alive: false, flags: ["lost_crossing_duel"] }
  };
  const shown = [];
  for (const en of WK.ENDINGS) {
    const o = SET[en.title] || {};
    WK.S = Object.assign(WK.newLife(), { name: "T", origin: "panchala", pronoun: "she", age: 44, act: 7, lifeId: "t" + shown.length, flags: [] }, JSON.parse(JSON.stringify(o)));
    WK.go(WK.S.alive ? "end_life" : "end_death");
    const el = w.document.querySelector(".endscreen");
    const title = el && el.querySelector(".es-title").textContent;
    if (title === en.title && el.querySelectorAll(".es-line.on").length === el.querySelectorAll(".es-line").length && w.getComputedStyle(el.querySelector(".es-rest")).display !== "none") shown.push(en.title);
    else console.log("   ending not shown full-screen:", en.title, "got", title);
  }
  ok(shown.length === WK.ENDINGS.length && w.document.querySelectorAll(".endscreen").length === 1, "every ending (" + shown.length + " of " + WK.ENDINGS.length + ") renders as the full-screen ending, its title, its lines and its record");
  const T = WK.endingTouch;
  ok(T("The burnt house").parts === "embers" && T("The burnt house").smoke && T("Beside Karna").wheel && T("The oath to the death").emblem === "vow_samshaptaka" && T("Glorious death").garland && T("Into the wheel").light === "sunset" && T("The homecoming").light === "morning", "the touches drawn in code: embers and smoke, the sinking wheel, the oath's emblem, the garland, sunset in the wheel, morning for the survivors");
  // A death with acts kept: Go back to the start of the act it happened in, and the earlier ones.
  w.localStorage.clear();
  WK.S = Object.assign(WK.newLife(), { name: "T", origin: "panchala", pronoun: "she", age: 22, act: 3, lifeId: "L1" });
  WK.go("a3_kampilya"); // stands in for each act's start
  for (const a of [1, 2, 3]) { WK.S.act = a; WK.S.age = 6 + a * 5; WK.committed = null; WK.checkpoint(WK.S); }
  Object.assign(WK.S, { alive: false, flags: ["died_in_fire"] });
  WK.go("end_death");
  const bs = [...w.document.querySelectorAll(".endscreen .actback")].map((b) => b.dataset.act + ":" + b.querySelector("b").textContent);
  ok(bs.length === 3 && /^3:Go back to the start of Act III$/.test(bs[0]) && bs[1].startsWith("2:") && bs[2].startsWith("1:"), "the death screen: Go back to the start of Act III, then the earlier acts (" + bs.join(" | ") + ")");
  WK.UI.redraw();
  ok(w.document.querySelectorAll(".endscreen").length === 1 && w.document.querySelector(".endscreen.all"), "the ending shown again (a redraw) is there whole, once");
  w.document.querySelector('.endscreen .actback[data-act="2"]').click();
  ok(!w.document.querySelector(".endscreen") && WK.S.alive && WK.S.age === 16 && !WK.S.deathAct && WK.lives().some((r) => r.title === "The burnt house" && !r.alive), "Go back: the ending leaves, the life is the copy kept at the start of Act II, the death is in the Book of Lives (" + [!w.document.querySelector(".endscreen"), WK.S.alive, WK.S.age, WK.lives().length] + ")");
  WK.UI.renderTitle();
  ok(!w.document.querySelector("#btn-acts"), "the title screen has no Start again from an act (owner, 7 November: it is in the Menu)");
  WK.UI.openActs();
  ok(w.document.querySelectorAll(".modal .actback").length === 2, "the list: each act reached by the life as it stands");
  w.close();
}
// Fighter mode (item 21): you fight alone (no friends, company, call for help or divine weapon), every fight
// lost the first time may be tried once more, and the difficulty grows with the act (item 19).
{
  S = fresh({ act: 3, age: 25, side: "pandava", path: "mace" }); S.fighter = true; S.astras = [{ id: "brahmastra" }]; S.boons = ["astra"];
  const B = K.Combat.start("e_kings", null), p = B.units[0];
  ok(!B.units.some((u) => u.side === "ally"), "fighter mode: no one fights beside you (the swayamvara's brahmin stays out)");
  ok(!p.abilities.includes("call"), "fighter mode: no call for help");
  K.Combat.end && (B.over = "lose") && K.Combat.end();
  S.fighter = false;
  const lv = (act, d) => { S.act = act; return K.RT.level(S, d); };
  ok(lv(1, "normal").atk === 1 && lv(6, "normal").atk > lv(3, "normal").atk && lv(7, "normal").feint > 0, "Normal starts gentle and grows act by act to the war");
  ok(lv(6, "easy").atk === 1 && lv(6, "easy").feint === 0, "Easy stays gentle all through");
  ok(lv(1, "hard").atk > lv(1, "normal").atk && lv(6, "hard").rest < lv(6, "normal").rest, "Hard is harder from the start");
  S.storyMode = true; ok(K.RT.difficulty(S) === "easy" || !!process.env.DIFF, "story mode keeps Easy whatever the setting"); S.storyMode = false;
}
// Orders for the day (owner, 6 November; content/war_orders.js): the day's commander, once a battle day, what happened
// since the last orders, and none for one who fights on no side.
{
  require(G + "content/war_orders.js"); const O = K.ORDERS;
  const S = fresh({ act: 6, age: 44, side: "pandava" }); S.alive = true;
  ok(O.due(K.SCENES.a6_day1, S) === 1 && O.chief("pandava", 1) === "dhrishtadyumna" && O.chief("kaurava", 10) === "bhishma" && O.chief("kaurava", 12) === "drona" && O.chief("kaurava", 17) === "karna" && O.chief("kaurava", 18) === "shalya", "orders: the day's commander on each side");
  O.given(6, S);
  ok(!O.due(K.SCENES.a6_day1, S) && O.due(K.SCENES.bh_day9, S) === 9, "orders come once a day (none for the fighting of days 1 to 9, told after day 6)");
  const i = O.info(9, S);
  ok(i.head === "Since your last orders" && i.since.length === 3 && !!i.aim && !!i.you && i.chief.name === "Dhrishtadyumna", "since your last orders: what happened on days 6, 7 and 8, then the day's aim and your orders");
  O.given(9, S); ok(O.info(10, S).head === "Yesterday" && O.info(10, S).since.length === 1 && /Bhishma/.test(O.info(10, S).since[0]), "the day after: yesterday");
  S.side = "kaurava"; ok(O.info(10, S).chief.name === "Bhishma" && /Shikhandi/.test(O.info(10, S).you), "a Kaurava's orders on the tenth day come from Bhishma");
  S.side = "neutral"; ok(!O.due(K.SCENES.a6_day18, S), "no orders for one who fights on no side");
  const missing = Object.keys(O.at).filter((id) => !K.SCENES[id]);
  ok(!missing.length, "every scene that brings orders exists" + (missing.length ? ": " + missing.join(", ") : ""));
  ok([1, 2, 3, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].every((d) => O.DAYS[d].p && O.DAYS[d].k && O.DAYS[d].p.you && O.DAYS[d].k.you) && Object.values(O.at).every((d) => O.DAYS[d] && O.DAYS[d].p), "orders written for both sides on every day that brings them");
}
console.log(fails ? fails + " FAILED" : "all passed"); process.exit(fails ? 1 : 0);
