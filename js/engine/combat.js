/* Turn-based combat. Commands come in through C.act/flee/spare, so mouse, keys
   and (later) touch gestures all drive the same logic (PRD §9.7). */
(function (K) {
  "use strict";
  const C = (K.Combat = {});
  let B = null;
  const TIMED = ["guard", "evade", "exposed", "weakened", "inspired", "bleed", "taunt", "cursed", "burn", "asleep", "bound", "wall"];
  // Out of the fight for now: stunned, asleep (Sammohana) or bound (Nagapasha).
  const held = (u) => !!(u.status.stun || u.status.asleep || u.status.bound);
  // The log stores events, not sentences: { key, u: { role: unit }, v: { name: value }, crit }.
  // C.line() phrases one in the current language, so switching language rewrites the whole log.
  // Keys are English templates; "{t} ..." lines about the player use a "You ..." key instead.
  const youForm = (phrase) => {
    const [w, ...rest] = phrase.split(" ");
    const m = { is: "are", goes: "go", has: "have", loses: "lose" };
    const fw = m[w] || (w.endsWith("s") ? w.slice(0, -1) : w);
    return [fw, ...rest].join(" ");
  };
  const subjectKey = (u, phrase) => (u.side === "player" ? "You " + youForm(phrase) + "." : "{t} " + phrase + ".");
  const isP = (u) => u && u.side === "player";
  const unitName = (u) => (u.side === "player" ? K.S.name || K.tr("You") : K.text(u.src || u.name));
  // Every grammatical form a sentence might need for one unit. English uses {t}/{a}; the Hindi
  // templates pick the form with the right postposition ({tko} "to", {tne} ergative, {tke} "of").
  function forms(role, u) {
    const o = {};
    if (!u) return o;
    if (isP(u) && K.lang === "hi") Object.assign(o, { [role]: "तुम", [role + "ko"]: "तुम्हें", [role + "ne"]: "तुमने", [role + "ke"]: "तुम्हारे", [role + "ki"]: "तुम्हारी", [role + "par"]: "तुम पर" });
    else if (isP(u)) o[role] = "you";
    else {
      const n = unitName(u);
      // Before a postposition Hindi takes the oblique form: "राजा का अंगरक्षक" becomes "राजा के अंगरक्षक ने".
      const ob = K.lang === "hi" ? n.replace(/ का /g, " के ").replace(/(लुटेरा|ग्वाला|बेटा)$/, (m) => m.slice(0, -1) + "े") : n;
      Object.assign(o, { [role]: n, [role + "ko"]: ob + " को", [role + "ne"]: ob + " ने", [role + "ke"]: ob + " के", [role + "ki"]: ob + " की", [role + "par"]: ob + " पर" });
    }
    return o;
  }
  C.line = function (e) {
    if (typeof e === "string") return K.text(e); // older logs
    if (e.raw) return K.text(e.raw);
    const p = {};
    for (const [role, u] of Object.entries(e.u || {})) Object.assign(p, forms(role, u));
    for (const [k, v] of Object.entries(e.v || {})) p[k] = typeof v === "string" ? K.tr(v) : v;
    let line = K.text(e.key, p);
    if (e.crit) line += " " + K.tr("A critical hit.");
    return line;
  };

  // Enemy template by tier, so encounters stay balanced as the player grows.
  K.foe = (name, tier, extra = {}) => Object.assign({
    name, hp: 14 + tier * 11, atk: Math.round(2 + tier * 1.5), def: tier >= 5 ? 3 : tier >= 3 ? 2 : 1,
    abilities: tier >= 3 ? ["strike", "heavy"] : ["strike"]
  }, extra);

  // A bout with a named partner, begun from a strength or rhythm test that is a contest against a person
  // (ui/tests3d/frame.js). sp: { person, name, arm }; o: { title, stage, caption, power }. A youth's partner is as
  // strong as Ugra at the fair; a grown one as a foe of the act; the better your own measures for the test (power),
  // the less it takes to put the partner down. The encounter is "x_spar": a bout, not deadly, with nothing written
  // on its winning or losing (the test's own outcome is what the story reads), and fought once: a second try at a
  // test is the scene's own to give, at the scene's own price.
  K.sparEncounter = function (sp, o, S = K.S) {
    o = o || {}; const age = S.age || 20, young = age < 18, tier = young ? 1 : Math.max(2, Math.min(5, (S.act || 3) - 1)), base = K.foe(sp.name, tier);
    const k = Math.max(0.75, Math.min(1.2, 1.2 - 0.035 * (o.power || 0))), stage = o.stage || "stage_training_ground";
    const unit = Object.assign(base, { hp: Math.round((age < 12 ? 13 : young ? 16 : base.hp * 0.6) * k * (sp.arm === "mace" ? 1.3 : 1)), atk: age < 12 ? 5 : young ? 7 : Math.round(base.atk * 1.4), person: sp.person, /* (a bout is short: a handful of clean blows either way) */ item: sp.arm, abilities: sp.arm === "mace" && !young ? ["strike", "heavy"] : ["strike"] });
    return K.encounter({ id: "x_spar", title: o.title || "A bout", art: stage, stage, caption: o.caption || "", lethal: false, bout: true, quick: true, once: true, arm: sp.arm, intro: "", enemies: [unit], flee: { tags: [] } });
  };

  function makePlayer(S) {
    const P = (K.PATHS && K.PATHS[S.path]) || { abilities: [], stat: "might", skill: "mace" };
    const might = K.attr("might"), grace = K.attr("grace");
    const hp = 30 + might * 5 + grace * 3 + (S.age >= 18 ? 20 : 0) + (S.skills.mace || 0) * 3;
    let atk = 3 + K.attr(P.stat || "might") + (S.skills[P.skill] || 0);
    if (K.hasVow("never_retreat")) atk += 1 + (S.flags.includes("held_firm") ? 1 : 0); // one more once you have held firm in a deadly fight
    if (K.hasVow("samshaptaka")) atk += 2; // the Samshaptakas' oath, while it holds (content/war_oath.js)
    const rec = K.record(S);
    atk += Math.min(2, Math.floor(rec.won / 3)); // every three fights won, a little more sure of your hand
    if (rec.last === "lost") atk -= 1;            // the last fight still in your mind
    const abilities = ["strike", "guard"].concat(P.abilities || []);
    if (S.boons.includes("astra")) abilities.push("astra");
    for (const a of S.astras || []) if (K.ABILITIES[a.id]) abilities.push(a.id); // the named divine weapons (§18.7)
    abilities.push("herbs");
    // Bhishma's blessing, for a vow of celibacy kept to the war.
    const def = 1 + Math.floor(grace / 2) + (S.flags.includes("bhishma_blessing") && K.hasVow("celibacy", S) ? 1 : 0) + (K.hasVow("samshaptaka", S) ? 1 : 0);
    return { uid: "p", name: S.name || "You", side: "player", hp, maxHp: hp, atk, def, abilities, cds: {}, status: {}, armed: true };
  }
  // Enemies come in a little stronger than their tier says, and more so in a fight marked hard; story
  // mode takes a quarter off. Tuned so an even fight is won about two times in three by a player who
  // guards and defends in time, and a hard one about two times in five (tests/balance.js).
  C.TOUGH = { hp: 2.2, atk: 1.9 };
  C.GLANCE = 0.15; // how often a shield-bearer turns your blow aside, half spent (behind the developer switch)
  C.HARD = { hp: 1.5, atk: 1.35 }; // the hard fights are already built big (Ashwatthama, the lone chariot), so a smaller step
  function makeUnit(def, side, i, enc) {
    const m = side === "enemy" ? (enc && enc.hard ? C.HARD : C.TOUGH) : { hp: 1, atk: 1 };
    const hp = Math.round(def.hp * m.hp * (side === "enemy" && K.S.storyMode ? 0.75 : 1));
    return {
      uid: side[0] + i, name: K.fmt(def.name), src: def.name, side, hp, maxHp: hp, atk: Math.round(def.atk * m.atk * 10) / 10, def: def.def || 1,
      abilities: def.abilities || ["strike"], cds: {}, status: {}, armed: def.armed !== false,
      vowTag: def.vowTag || null, person: def.person || null, note: def.note || null, plural: !!def.plural, hero: !!def.hero, still: !!def.still,
      item: def.item || null, // what this fight draws him holding, over his usual weapon (Ashwatthama in the sleeping camp: a sword)
      shield: def.shield != null ? !!def.shield : !def.hero && !def.person && SHIELDED.test(String(def.name)) && !/archer|bow/i.test(String(def.name)),
      // drawn with a shield (owner, 6 November: every foe with a sword or a spear); only those above turn your blows with it
      // (with the new ones turning blows too, the balance runs lost 15-22 points in the duel between the lines, the drive for
      // the king and the supply camp)
      shieldDrawn: side === "enemy" && C.foeShielded(def)
    };
  }
  // A foe who fights with a sword or a spear carries the round shield too (owner, 6 November: "let's add shields to foes as
  // well"), the named among them: not an archer, a mace, a club or bare hands, nor a thing (a cart, an elephant, the
  // Narayana weapon) or the Gandharvas. The weapon is the one he fights with (RT.weaponOf, which the screens draw).
  // ---------- Mixed packs and more archers (Build D, feedback row 47) ----------
  // From Act III, in a life's story fights (not the young fighter's ladder, a dream, a bout, a storm, an escort or a
  // break-through, or a fight that says mix: false), most packs bring an archer who holds the back and shoots: one of the
  // pack's plain soldiers (not a named fighter, a rider, a champion, a host) is his side's archer instead, while at least one
  // stands to fight hand to hand. In the war a pack of three or more may bring two. Drawn from the fight's own dice, so the
  // same fight from the same moment plays the same way (replays, the recorded lives); fights already bringing an archer keep theirs.
  C.MIX = { from: 3, one: 0.7, two: 0.35, twoFrom: 6 };
  const PLAIN = (u) => u.side === "enemy" && !u.person && !u.hero && !u.plural && !u.still && !u.item && !u.vowTag && !u.mixed &&
    /\s/.test(u.src || "") && !/\{/.test(u.src || "") && (u.abilities || []).some((a) => a === "strike" || a === "heavy") && !(u.abilities || []).some((a) => /arrows|aimed|pin|volley/.test(a)) &&
    !/archer|bow|rider|horse|chariot|elephant|champion|helmet|veteran|captain|torch|scout|gandharva|naga|rakshasa|ghost|host|charioteer|lord|king|prince|brother|son\b/i.test(u.src || "");
  const turnArcher = (u) => {
    const nm = String(u.src).replace(/\s+\S+$/, "") + " archer";
    u.src = nm; u.name = K.fmt(nm); u.abilities = ["strike", "arrows"]; u.shield = false; u.shieldDrawn = false; u.mixed = true;
  };
  C.mixFoes = function (B, S) {
    const enc = B.enc;
    if (!S || S.fighter || (S.act || 0) < C.MIX.from || enc.dream || enc.bout || enc.mix === false || B.rule || B.kind) return;
    const foes = B.units.filter((u) => u.side === "enemy"), packs = {};
    foes.forEach((u) => { const k = u.pack || 0; (packs[k] = packs[k] || []).push(u); });
    const keys = Object.keys(packs).map(Number).sort((a, b) => a - b);
    keys.forEach((k) => {
      const pk = packs[k], plain = pk.filter(PLAIN), shooting = pk.filter((u) => (u.abilities || []).some((a) => /arrows|aimed|pin|volley/.test(a))).length;
      if (shooting || plain.length < 1 || pk.length - 1 < 1) return; // an archer already, or no one plain, or he would stand alone
      let want = K.rng() < C.MIX.one ? 1 : 0;
      if (want && plain.length >= 3 && (S.act || 0) >= C.MIX.twoFrom && K.rng() < C.MIX.two) want = 2;
      want = Math.min(want, pk.length - 1, plain.length);
      plain.slice(plain.length - want).forEach(turnArcher); // the hindmost of them
    });
  };
  C.foeShielded = function (def) {
    const n = String(def.src || def.name || "");
    if (/archer|bow|Gandharva|elephant|\bcart$|Narayana|charioteer/i.test(n) || !K.RT || !K.RT.weaponOf) return false;
    const w = K.RT.weaponOf({ side: "enemy", name: n, src: n, person: def.person || null, item: def.item || null });
    return w === "sword" || w === "spear";
  };
  // Who carries a shield (PRD §18.15): the line's foot soldiers, guards and spearmen, and your own company. Since 6 November
  // every foe with a sword or a spear is drawn with one too (C.foeShielded: riders and the named), without its turning blows. Shields count only behind the developer switch (B.shields).
  const SHIELDED = /soldier|company|spearm|guard\b|veteran|captain|foot\b/i;
  // The player carries a small shield where the path suits it (owner, 4 November): the mace fighter, and a sword (the
  // driver on foot, the commander); not an archer's bow or a short blade (the healer, the spy, the bard). In a
  // real-time fight a shield-carrier blocks with it (RT, "Block") where the others roll.
  // (6 November, owner: the dream's grown fighter, with a sword, carries one too, and blocks.)
  C.SHIELD_PATHS = { mace: true, charioteer: true, strategist: true };
  C.hasShield = (S = K.S) => !!(S && (C.SHIELD_PATHS[S.path] || (B && B.enc && B.enc.dream && S === K.S)));
  const isCompany = (u) => !!(u && u.side === "ally" && u.plural && !u.person && !u.called);

  const living = (side) => B.units.filter((u) => u.hp > 0 && !u.away && (side === "friends" ? u.side !== "enemy" : u.side === side));
  // The next pack comes on (C.packsWanted): at once when the field is clear, else as a round ends with one foe left.
  function nextPack() {
    if (!B.packs || B.packNow >= B.packs - 1) return false;
    B.packNow++;
    const come = B.units.filter((u) => u.side === "enemy" && u.pack === B.packNow);
    come.forEach((u) => { delete u.away; });
    api.tell("Another pack comes at the line.");
    return come.length > 0;
  }
  const foesOf = (u) => living(u.side === "enemy" ? "friends" : "enemy");
  const friendsOf = (u) => living(u.side === "enemy" ? "enemy" : "friends");
  C.player = () => B && B.units.find((u) => u.side === "player");

  const api = {
    say(t) { B.log.push({ raw: t }); },                       // a line of story text (English source)
    tell(key, u, v, crit) { B.log.push({ key, u, v, crit }); }, // a combat event
    // A friend who answers your call joins the fight for a while (leaves after `stay` rounds).
    join(def, stay) { const u = makeUnit(def, "ally", B.units.length, B.enc); if (stay) u.leave = B.round + stay; B.units.push(u); return u; },
    hit(u, t, mult, o = {}) {
      if (!t || t.hp <= 0) return 0;
      if (u.side === "player" && t.vowTag) {
        if (K.vowBreaksFor([t.vowTag]).length) api.tell("You strike {t}. Your vow is broken.", { t });
        K.breakTags([t.vowTag]);
      }
      if (t.status.evade) { delete t.status.evade; api.tell(subjectKey(t, "avoids the attack"), { t }); return 0; }
      // A charmed shield turns the first blow of every fight (§18.7).
      if (isP(t) && u.side === "enemy" && K.S.boons.includes("charm_shield") && !B.charmUsed) { B.charmUsed = true; api.tell("The charmed shield on your arm turns {a}'s first blow aside.", { a: u }); return 0; }
      // A blow aimed at you that you met in time (C.resolve): dodged, blocked, or turned into a counter.
      const def = isP(t) && u.side === "enemy" ? B.defNow : null;
      if (def === "dodge") { api.tell("You dodge {a}'s blow.", { a: u }); B.lastDef = "dodge"; return 0; }
      if (def === "counter") {
        api.tell("You turn {a}'s blow aside and strike back.", { a: u }); B.lastDef = "counter";
        const p = t; B.defNow = null; api.hit(p, u, 0.7); return 0;
      }
      // A divine weapon's share of an ordinary foe's health (abilities.js K.astraFell): no armour, shield or roll of the die.
      if (o.frac) {
        const n = Math.max(1, Math.round(t.maxHp * o.frac));
        t.hp = Math.max(0, t.hp - n);
        B.lastHit = { by: u.uid, on: t.uid, n, crit: false };
        api.tell(o.verb || "You hit {t} for {n}.", { a: u, t }, { n });
        if (t.hp === 0) api.tell(t.side === "enemy" ? "{t} falls." : "{t} is down.", { t });
        return n;
      }
      let dmg = (u.atk + K.roll(4)) * mult;
      // A vow of vengeance: +1 against the one you swore against.
      if (u.side === "player" && t.person && K.hasVow("vengeance") && Object.entries(K.VENGEANCE || {}).some(([f, who]) => K.S.flags.includes(f) && who.includes(t.person))) dmg += mult;
      // A leader's mark: those beside you strike the marked enemy harder, the more so the better you command.
      if (u.side === "ally" && B.mark && t.uid === B.mark) dmg += (B.markBonus || 0) * mult;
      if (def === "block") { dmg *= 0.45; B.lastDef = "block"; }
      if (def === "miss") { dmg *= o.heavy ? 1.15 : 1; B.lastDef = "miss"; }
      if (isP(u) && B.place) dmg *= PLACES[B.place].dmg(t); // your place in the line (C.setPlace)
      // Your company's standing orders (C.setOrder): pressing hits harder and leaves them open; guarding you, softer.
      if (B.order && isCompany(u)) dmg *= B.order === "press" ? 1.3 : B.order === "guardme" ? 0.85 : 1;
      if (B.order && t.side !== "enemy" && u.side === "enemy") dmg *= B.order === "press" && isCompany(t) ? 1.15 : B.order === "fallback" ? 0.75 : 1;
      // Shields (behind the developer switch): a shield wall halves every blow on your side this round; your company
      // raises its shields against a blow marked on them (as a guard does); a shield-bearer turns some of your blows.
      B.lastShield = null;
      if (B.shields && u.side === "enemy" && t.side !== "enemy" && (t.status.wall || (isCompany(t) && t.shield && B.plan && B.plan.uid === t.uid && B.plan.by === u.uid))) {
        dmg *= o.breaks ? 0.85 : 0.5; B.lastShield = { on: t.uid, kind: t.status.wall ? "wall" : "raised" };
      } else if (B.shields && isP(u) && t.side === "enemy" && t.shield && !t.status.guard && K.rng() < C.GLANCE) {
        dmg *= 0.5; B.lastShield = { on: t.uid, kind: "glance" }; api.tell("{t} catches your blow on a shield.", { t });
      }
      if (u.status.inspired) dmg *= 1.3;
      if (u.status.weakened) dmg *= 0.7;
      if (u.status.cursed) dmg *= 0.5;
      dmg -= o.pierce ? 0 : t.def;
      if (t.status.exposed) dmg *= 1.4;
      let crit = false;
      if (u.status.crit || K.rng() < 0.08) { crit = true; dmg *= 1.5; delete u.status.crit; }
      if (t.status.guard) { dmg *= o.breaks ? 0.85 : 0.5; delete t.status.guard; }
      if (B.rt && C.traitDmg) dmg *= C.traitDmg(B, u, t); // a champion's trait, in a real-time fight or a clash (engine/realtime.js)
      dmg = Math.max(1, Math.round(dmg));
      if (B.rt && C.traitCap) dmg = C.traitCap(B, t, dmg);
      // A holding fight (enc.hold): the champion is held, never killed. He is never brought below a tenth.
      if (B.enc.hold && t.hero) dmg = Math.min(dmg, Math.max(0, t.hp - Math.round(t.maxHp * 0.1)));
      // A sage's kavacha: one blow that would have killed you, in the whole war, leaves you standing (§18.7).
      if (isP(t) && dmg >= t.hp && B.enc.lethal && (K.S.charges || {}).kavacha) { K.S.charges.kavacha = 0; dmg = t.hp - 1; api.tell("The blow that should have ended you breaks on the kavacha. It will not do so twice."); }
      t.hp = Math.max(0, t.hp - dmg);
      const key = def === "block" ? "You block, and {a}'s blow still hits you for {n}." : o.verb || (isP(u) ? "You hit {t} for {n}." : isP(t) ? (u.plural ? "{a} hit you for {n}." : "{a} hits you for {n}.") : u.plural ? "{a} hit {t} for {n}." : "{a} hits {t} for {n}.");
      B.lastHit = { by: u.uid, on: t.uid, n: dmg, crit };
      api.tell(key, { a: u, t }, { n: dmg }, crit);
      if (t.hp === 0) api.tell(t.side === "enemy" ? "{t} falls." : isP(t) ? "You fall." : "{t} is down.", { t });
      return dmg;
    },
    heal(u, t, n) {
      if (!t || t.hp <= 0) return;
      const before = t.hp; t.hp = Math.min(t.maxHp, t.hp + n);
      api.tell(subjectKey(t, "recovers {n} health"), { t }, { n: t.hp - before });
    },
    status(t, s, dur, text) {
      if (!t || t.hp <= 0) return;
      t.status[s] = Math.max(t.status[s] || 0, dur);
      if (text) api.tell(subjectKey(t, text), { t });
    },
    cleanse(t) { for (const s of ["stun", "bleed", "weakened", "exposed"]) delete t.status[s]; },
    firstEnemy() { return living("enemy").sort((a, b) => a.hp - b.hp)[0]; },
    living(side) { return living(side); }
  };

  C.start = function (encId, onEnd) {
    const S = K.S, enc = K.ENCOUNTERS[encId];
    if (!enc) throw new Error("Missing encounter: " + encId);
    // A dream fight (the prologue): you fight as the grown warrior you will be, not the child you are.
    const me = makePlayer(S);
    if (enc.dream) { Object.assign(me, enc.dream); me.maxHp = me.hp; me.abilities = (enc.dream.abilities || me.abilities).slice(); }
    B = Object.assign({ enc, units: [me], round: 1, log: [], acts: [], over: null, used: {}, onEnd, bid: Date.now() + ":" + encId }, api);
    // Fighter mode (item 21): you alone, with no friends, company, call for help or divine weapon.
    if (!S.fighter) (K.val(enc.allies) || []).forEach((a, i) => { const d = typeof a === "string" ? K.UNITS[a] && K.UNITS[a](S) : a; if (d) B.units.push(makeUnit(d, "ally", i, enc)); });
    K.val(enc.enemies).forEach((e, i) => B.units.push(makeUnit(e, "enemy", i, enc)));
    // Some fights let you shout for a friend (once), and show the divine weapon even to those who
    // were never given one (greyed: "You were never given a divine weapon").
    // Any fight lets you shout for a friend once; fights without a rule of their own use K.friendHelp.
    { const p = B.units[0]; if (!S.fighter && enc.callHelp !== null && (enc.callHelp || (K.friendHelp && !enc.bout))) p.abilities.push("call"); if (!S.fighter && enc.showAstra && !p.abilities.includes("astra")) p.abilities.push("astra"); }
    // A fight of another kind (content/war_fights.js, enc.kind): an escort, a break-through or weathering a
    // storm rides on the turns (B.rule); a chariot duel, an archery duel, a mace duel or a carry is played
    // live by the screen (B.mode, ui/fightmodes.js) when it asks, and otherwise is fought as a plain hold.
    // A bout begun from a test (K.sparEncounter): what you are handed is what you fight with. Bare hands and borrowed
    // weapons bring a strike and a guard; your path's own moves come only with your path's own kind of weapon. No divine
    // weapon, and no herbs: it is a bout.
    if (enc.arm) { const p = B.units[0], w = K.playerWeapon && S.path ? K.playerWeapon(S) : null, own = enc.arm !== "fist" && (w === enc.arm || (enc.arm === "woodsword" && w === "sword")), P = (K.PATHS && K.PATHS[S.path]) || {};
      p.abilities = ["strike", "guard"].concat(own ? P.abilities || [] : []); }
    { const kind = K.val(enc.kind) || null, FK = kind && K.FIGHT_KINDS ? K.FIGHT_KINDS[kind] : null;
      B.kind = kind; B.rule = FK && FK.turn ? FK : null; B.mode = FK && FK.live && C.liveMode === kind ? kind : null;
      if (B.rule && B.rule.start) B.rule.start(B); }
    B.habit = []; // what you have done lately: enemies learn from it
    if (C.placesWanted && C.placesWanted(enc, B)) { // a war day with your company: your place in the line, standing orders, Shield wall and Rally
      B.place = "middle"; B.order = "line";
      const p = B.units[0]; p.abilities.push("wall", "rally_line");
    }
    B.shields = !!(C.shieldsWanted && C.shieldsWanted(enc, B));
    // Packs (behind the developer switch): three or more foes come two at a time, the named last unless the story
    // says otherwise (enc.packs: lists of enemy indices); the next pack comes on as the field thins.
    if (C.packsWanted && C.packsWanted(enc, B)) {
      const foes = B.units.filter((u) => u.side === "enemy");
      const order = enc.packs ? enc.packs : (() => { const idx = foes.map((u, i) => i).sort((a, b) => (foes[a].hero ? 1 : 0) - (foes[b].hero ? 1 : 0) || a - b), out = []; for (let i = 0; i < idx.length; i += 2) out.push(idx.slice(i, i + 2)); return out; })();
      order.forEach((list, k) => list.forEach((i) => { const u = foes[i]; if (u) { u.pack = k; if (k) u.away = true; } }));
      B.packs = order.length; B.packNow = 0;
    }
    if (C.mixFoes) C.mixFoes(B, S); // from Act III, archers among the packs (Build D, row 47)
    if (S.boons.includes("healing_hands") && (S.items.herbs || 0) < 2) S.items.herbs = 2;
    B.pulled = {};
    // The screen asks for step mode (each blow aimed at you met in time); with timed moments off the
    // blows are met by chance, on kinder odds; under the tests, on the plain odds.
    B.stepMode = !!C.stepNext; B.lenient = !C.stepNext && !K.headless;
    const rec = enc.dream ? {} : K.record(S);
    if (rec.last === "lost") api.say("You remember how your last fight ended. Your hands are not quite steady.");
    else if (rec.last === "won" && rec.won >= 3) api.say("You have won fights before, and your body remembers how.");
    if (enc.intro) api.say(K.val(enc.intro));
    const curse = enc.curse && S.curses.find((c) => !c.fired && c.id !== "astra_condition"); // a broken weapon condition waits for the mantra (abilities.js)
    if (curse) {
      K.apply({ fireCurse: curse.id, journal: K.CURSES[curse.id].fireText });
      api.status(C.player(), "cursed", 3);
      api.say(K.CURSES[curse.id].fireText);
    }
    // A vow never to retreat, broken: your company remembers, in its next fight.
    if (S.flags.includes("company_shaken")) {
      const co = B.units.find((u) => u.side === "ally" && u.plural);
      if (co) { api.status(co, "weakened", 3); api.say("Your company remembers the day you fell back. They look at each other before they look at you."); K.apply({ unflag: "company_shaken" }); }
    }
    // The day's line broke under your orders (content/command.js): the enemy comes in already through.
    if (S.flags.includes("line_broken") && enc.lethal) {
      living("enemy").forEach((u) => api.status(u, "inspired", 2));
      api.say("The enemy is already through the line your division was holding. They come at you with the day's momentum.");
      K.apply({ unflag: "line_broken" });
    }
    planAll();
    K.emit("combat", B);
    return B;
  };
  C.state = () => B;

  function targetsFor(u, ab, uid) {
    const pickFoe = () => {
      const foes = foesOf(u);
      const taunt = foes.find((f) => f.status.taunt);
      if (taunt) return taunt;
      if (u.side === "enemy") { const p = foes.find((f) => f.side === "player"); return p && K.rng() < (B.place ? PLACES[B.place].odds : 0.65) * (B.order === "guardme" && foes.some(isCompany) ? 0.55 : 1) ? p : K.pick(foes); }
      // Those beside you go for the enemy you marked (a leader's order), while it stands; else the weakest.
      const marked = B.mark && foes.find((f) => f.uid === B.mark);
      if (marked) return marked;
      return foes.slice().sort((a, b) => a.hp - b.hp)[0];
    };
    switch (ab.target) {
      case "self": return u;
      case "enemies": return foesOf(u);
      case "allies": return friendsOf(u);
      case "ally": return friendsOf(u).find((f) => f.uid === uid) || friendsOf(u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      default: return foesOf(u).find((f) => f.uid === uid) || pickFoe();
    }
  }

  C.available = function () {
    const p = C.player(), S = K.S;
    const rows = p.abilities.map((id) => {
      const ab = K.ABILITIES[id];
      let why = null;
      if (p.cds[id]) why = K.tr(p.cds[id] === 1 ? "Ready in 1 turn" : "Ready in {n} turns", { n: p.cds[id] });
      if (ab.once && B.used[id]) why = K.tr("Used this battle");
      if (ab.group && B.used[ab.group]) why = K.tr("Used this battle"); // one mantra a battle, whichever weapon
      if (ab.item && !(S.items[ab.item] > 0)) why = K.tr("None left");
      if (id === "astra" && !S.boons.includes("astra")) why = K.tr("You were never given a divine weapon");
      // The divine weapons' rules: three uses each in a life, when it may be spoken (abilities.js K.astraWhy).
      if (!why && K.isAstra(id)) { const w = K.astraWhy(B.units, B.enc, p, id, S); if (w) why = K.tr(w); }
      // Moves that need allies do nothing when you fight alone: the screen tucks them away.
      const idle = (ab.needsAlly || ab.target === "allies") && friendsOf(p).length < 2;
      if (idle) why = K.tr("No ally to command");
      return { id, name: K.tr(ab.name), desc: K.tr(ab.desc), target: ab.target, why, idle, count: ab.item ? S.items[ab.item] || 0 : null };
    });
    return B.rule && B.rule.moves ? B.rule.moves(rows, B) : rows;
  };

  function use(u, id, uid) {
    const ab = K.ABILITIES[id];
    B.acts.push({ uid: u.uid, id, round: B.round }); // for the screen: who moved, and how
    ab.use(B, u, targetsFor(u, ab, uid));
    if (ab.cd) u.cds[id] = ab.cd;
    if (ab.once) B.used[id] = true;
    if (ab.group) B.used[ab.group] = true;
  }

  // What a unit means to do: the same rules for allies (decided on their turn) and enemies (decided
  // a round ahead and shown on their card, so the player can guard, pull a friend clear or strike first).
  // Enemies learn: a player who keeps guarding draws shield-breaking blows; one who keeps hitting the
  // same foe finds it braced; a player low on health, or who has just used herbs, is hunted.
  function decide(u) {
    const specials = u.abilities.filter((id) => id !== "strike" && id !== "guard" && !u.cds[id] && !K.ABILITIES[id].item && !K.ABILITIES[id].needsAlly);
    const hurt = friendsOf(u).find((f) => f.hp / f.maxHp < 0.45);
    if (hurt && u.abilities.includes("salve") && !u.cds.salve) return { id: "salve", uid: hurt.uid };
    const h = (B && B.habit) || [], recent = h.slice(-3);
    const p = foesOf(u).find((f) => f.side === "player");
    if (u.side === "enemy" && recent.filter((x) => x.id === "guard").length >= 2 && !u.cds.breaker) return { id: "breaker", uid: p ? p.uid : null };
    if (u.side === "enemy" && recent.length >= 2 && recent.slice(-2).every((x) => x.uid === u.uid) && !u.status.guard && K.rng() < 0.5) return { id: "brace", uid: null };
    const id = specials.length && K.rng() < 0.5 ? K.pick(specials) : "strike";
    const ab = K.ABILITIES[id];
    let t = ab.target === "enemy" ? targetsFor(u, ab) : null;
    if (u.side === "enemy" && ab.target === "enemy" && p && (p.hp / p.maxHp < 0.4 || (recent.length && recent[recent.length - 1].id === "herbs")) && K.rng() < 0.85) t = p;
    return { id, uid: t ? t.uid : null };
  }
  function planAll() { for (const e of B.units) { if (e.side === "enemy" && e.hp > 0 && !e.spared && !C.pleads(e)) e.intent = decide(e); else delete e.intent; } }
  function aiTurn(u) {
    const it = u.intent;
    delete u.intent;
    if (u.still) return; // a thing to keep whole (an escorted cart) takes no turn
    if (u.status.asleep) { api.tell("{t} sleeps on.", { t: u }); return; }
    if (u.status.bound) { api.tell("{t} strains against the serpent-noose.", { t: u }); return; }
    if (u.status.stun) { delete u.status.stun; api.tell("{t} is stunned and loses the turn.", { t: u }); return; }
    const plan = it && !u.cds[it.id] ? it : decide(u);
    const ab = K.ABILITIES[plan.id];
    let uid = plan.uid;
    B.plan = it && plan === it ? { by: u.uid, uid: it.uid } : null; // a blow marked a round ahead (shields go up for it)
    if (ab.target === "enemy") { const taunt = foesOf(u).find((f) => f.status.taunt); if (taunt) uid = taunt.uid; } // a war cry still draws the blow
    use(u, plan.id, uid);
    B.plan = null;
  }
  // The enemy's next move, for its card: { ab, who } where who is "you", a name, "all" or null.
  C.intent = function (u) {
    if (!B || B.over || !u.intent || u.hp <= 0 || held(u)) return null;
    const ab = K.ABILITIES[u.intent.id];
    let t = null;
    if (ab.target === "enemy") {
      const taunt = foesOf(u).find((f) => f.status.taunt);
      t = taunt || B.units.find((x) => x.uid === u.intent.uid && x.hp > 0) || null;
    } else if (ab.target === "ally") t = B.units.find((x) => x.uid === u.intent.uid) || null;
    return { id: u.intent.id, name: ab.name, target: ab.target, unit: t, heavy: ["heavy", "arrows", "disarm"].includes(u.intent.id) };
  };

  // Once in each deadly fight, as the third round begins, something happens on the field.
  function fieldEvent() {
    B.evented = true;
    const all = K.BATTLE_EVENTS || {};
    const list = (K.val(B.enc.events) || Object.keys(all).filter((id) => all[id].common)).filter((id) => all[id]);
    if (!list.length) return;
    const ev = all[K.pick(list)];
    const at = B.log.length;
    const u = ev.run(B) || {};
    B.log.splice(at, 0, { key: ev.text, u, ev: true });
  }

  // A whole amulet turns aside a killing blow in a deadly fight, once (shared with engine/realtime.js).
  function amulet(p) {
    if (p.hp <= 0 && B.enc.lethal && K.S.flags.includes("amulet_whole")) {
      p.hp = Math.max(1, Math.round(p.maxHp * 0.15));
      K.apply({ unflag: "amulet_whole", flag: "amulet_broken", journal: "Your amulet cracked and turned aside a killing blow." });
      api.say("The amulet at your throat cracks. The killing blow turns aside.");
    }
  }
  function over() {
    const p = C.player();
    amulet(p);
    if (p.hp <= 0) return finish("lose");
    { const r = B.rule && B.rule.over ? B.rule.over(B) : null; if (r) return finish(r); } // a fight of another kind ends on its own terms
    if (!living("enemy").length && !nextPack()) return finish("win");
    if (B.enc.rounds && B.round > B.enc.rounds) { api.say(B.enc.roundsText || "You held long enough."); return finish("win"); }
    // A holding fight is won by standing until the end, not by killing.
    if (B.enc.hold && B.round > B.enc.hold) { api.say(B.enc.holdText || "You held until the end."); return finish("win"); }
    return false;
  }
  function finish(outcome) {
    B.over = outcome;
    const p = C.player();
    // Foes spared while the fight went on (C.spare): the spare branch's fx once if the fight was won, and each one
    // counts for the vow never to strike the unarmed (K.combatOutcome counts the one of a "spare" ending).
    if (B.spared && (outcome === "win" || outcome === "spare")) {
      if (outcome === "win" && B.enc.spare && B.enc.spare.fx) K.apply(B.enc.spare.fx);
      const extra = B.spared - (outcome === "spare" ? 1 : 0);
      if (extra > 0 && K.hasVow && K.hasVow("spare_unarmed", K.S)) K.S.spared = (K.S.spared || 0) + extra;
    }
    if (K.friendAfter) K.friendAfter(B);
    // A captain-tier foe brought down (fallen, or spared at your mercy) in a real fight you won, grown (18 or more): a
    // Captain's milestone (the captain's arc, owner 11 November; core.js K.CLIMB). Not a dream, a bout or the ladder.
    if ((outcome === "win" || outcome === "spare") && !B.enc.dream && !B.enc.bout && !K.S.fighter && (K.S.age || 0) >= 18 && K.RT && K.RT.tierOf && !K.S.flags.includes("felled_captain")) {
      const cap = B.units.find((u) => u.side === "enemy" && (u.hp <= 0 || u.spared || outcome === "spare") && K.RT.tierOf(u) >= 1);
      if (cap) { K.lastFelled = cap.src || cap.name; K.apply({ flag: "felled_captain" }); }
    }
    // A fight won on your last legs can leave a mark for life: any wound in a deadly fight, a scar in
    // any other.
    if (outcome === "win" && !B.enc.lethal && p.hp <= p.maxHp * 0.2 && K.rng() < 0.35 && !K.S.injuries.includes("scar")) {
      K.apply({ injury: "scar", journal: { src: "You won, but not whole: {inj!}.", p: { inj: K.INJURIES.scar.text } } });
      api.tell("You win, but the fight leaves its mark: {inj!}.", null, { inj: K.INJURIES.scar.text });
    }
    if (outcome === "win" && B.enc.lethal && p.hp <= p.maxHp * 0.3 && K.rng() < 0.5) {
      const options = Object.keys(K.INJURIES).filter((id) => id !== "scar" && !K.S.injuries.includes(id));
      if (options.length) {
        const id = K.pick(options);
        K.apply({ injury: id, journal: { src: "You survived the fighting, but not whole: {inj!}.", p: { inj: K.INJURIES[id].text } } });
        api.tell("You survive, but the battle leaves its mark: {inj!}.", null, { inj: K.INJURIES[id].text });
      }
    }
    K.emit("combat", B);
    return true;
  }

  function endRound() {
    for (const u of B.units) {
      if (u.hp > 0 && u.status.burn) { const d = Math.max(1, Math.round(u.maxHp * 0.07)); u.hp = Math.max(0, u.hp - d); api.tell(subjectKey(u, "burns for {n}"), { t: u }, { n: d }); }
      if (u.hp > 0 && u.status.bleed) { const d = Math.max(1, Math.round(u.maxHp * 0.06)); u.hp = Math.max(0, u.hp - d); api.tell(subjectKey(u, "bleeds for {n}"), { t: u }, { n: d }); }
      for (const s of TIMED) if (u.status[s]) { u.status[s]--; if (!u.status[s]) delete u.status[s]; }
      for (const k of Object.keys(u.cds)) if (u.cds[k] > 0) u.cds[k]--;
    }
    B.round++;
    if (B.packs && living("enemy").length <= 1) nextPack();
    if (B.enc.hold && B.round <= B.enc.hold) api.tell("Hold: {n} rounds left.", null, { n: B.enc.hold - B.round + 1 });
    // Friends who came at your call are pulled away by the fighting after a while.
    for (const u of B.units.filter((x) => x.leave && B.round >= x.leave && x.hp > 0)) { api.tell("The press of the fighting carries {t} away from you.", { t: u }); B.units = B.units.filter((x) => x !== u); }
    // A fight can carry its own beats, round by round (the epic's moments in the wheel); otherwise
    // one field event as the third round begins.
    const beat = (K.val(B.enc.beats) || []).find((b) => b.round === B.round);
    if (beat) { B.evented = true; const at = B.log.length; const u = (beat.run && beat.run(B)) || {}; B.log.splice(at, 0, { key: beat.text, u, ev: true }); }
    else if (B.round === 3 && B.enc.lethal && !B.evented && !B.enc.beats && living("enemy").length) fieldEvent();
    planAll();
  }

  // Does this enemy's next move come at you? Then you get a moment to meet it (block, dodge, counter).
  const DAMAGING = ["strike", "heavy", "arrows", "disarm", "breaker"];
  C.threat = function (u) {
    if (!u || u.hp <= 0 || held(u) || !u.intent || !DAMAGING.includes(u.intent.id)) return null;
    const ab = K.ABILITIES[u.intent.id];
    const taunt = foesOf(u).find((f) => f.status.taunt);
    const onMe = ab.target === "enemies" || (taunt ? taunt.side === "player" : (B.units.find((x) => x.uid === u.intent.uid) || {}).side === "player");
    return onMe ? { id: u.intent.id, name: ab.name, heavy: ["heavy", "arrows", "breaker"].includes(u.intent.id), speed: u.intent.id === "arrows" ? 0.85 : u.intent.id === "heavy" ? 1.25 : 1 } : null;
  };
  // Without a player at the keys (the tests), or with timed moments off, the blow is met by chance:
  // the more graceful you are, the better your odds.
  function autoDefense() {
    const g = K.attr("grace"), r = K.rng(), lenient = B && B.lenient;
    const hd = C.humanDefense; // the balance check plays as an attentive player would (tests/balance.js)
    const counter = hd ? hd.counter : 0.06 + g * 0.01, block = hd ? hd.block : (lenient ? 0.5 : 0.32) + g * 0.03;
    return r < counter ? "counter" : r < counter + block ? "block" : "miss";
  }
  function enemyTurn(e, def) {
    B.defNow = C.threat(e) ? def || autoDefense() : null;
    B.lastDef = null;
    aiTurn(e);
    B.defNow = null;
  }
  // The enemies who move this round: in a break-through, only the one in the lane you took.
  // A foe who kneels and asks for mercy (C.pleads, on the new screens) fights no more, as in real time. He kneels only
  // when all but beaten (C.PLEAD: 5% of his health; owner, 4 November: at 30% sparing made the fights too easy), or
  // asleep under the Sammohana or bound in the Nagapasha (those weapons make a foe one to spare). The old screen
  // (oldFights) keeps its 30%.
  C.PLEAD = 0.05;
  const pleadAt = () => (C.spareGoesOn && C.spareGoesOn(B) ? C.PLEAD : 0.3);
  C.pleads = (u) => !!(B && u && u.side === "enemy" && u.hp > 0 && !u.spared && B.enc.spare && C.spareGoesOn && C.spareGoesOn(B) && (u.hp <= u.maxHp * C.PLEAD || u.status.asleep || u.status.bound));
  const acting = () => living("enemy").filter((u) => !(B.rule && B.rule.skip && B.rule.skip(B, u)) && !C.pleads(u));
  function roundEnd() {
    endRound();
    if (over()) return;
    const p = C.player();
    while (!B.over && p.status.stun) {
      delete p.status.stun; api.tell("You are stunned and lose your turn.");
      for (const u of living("ally")) { aiTurn(u); if (over()) return; }
      for (const u of acting()) { enemyTurn(u); if (over()) return; }
      endRound(); if (over()) return;
    }
  }
  function others() {
    for (const a of living("ally")) { if (B.over) return; if (B.order === "fallback" && isCompany(a)) { delete a.intent; continue; } aiTurn(a); if (over()) return; }
    if (B.stepMode) { B.queue = acting().map((e) => e.uid); if (!B.queue.length) roundEnd(); return; }
    for (const e of acting()) { if (B.over) return; enemyTurn(e); if (over()) return; }
    roundEnd();
  }
  // Step mode (the screen asks for it): after your move the enemies come one at a time. C.nextFoe()
  // says who is next and whether the blow is aimed at you; C.resolve(defense) plays that turn.
  C.nextFoe = function () {
    if (!B || B.over || !B.queue) return null;
    while (B.queue.length) {
      const u = B.units.find((x) => x.uid === B.queue[0]);
      if (u && u.hp > 0 && !u.spared && !C.pleads(u)) return { u, threat: C.threat(u) };
      B.queue.shift();
    }
    return null;
  };
  // Enemies still due to move? (Fallen ones are passed over.) A queue that has run out without its
  // round being closed is closed now, so it is always your turn again when no one is left to move.
  C.foesPending = function () {
    if (!B || B.over || !B.queue) return false;
    if (C.nextFoe()) return true;
    B.queue = null;
    if (!over()) roundEnd();
    return false;
  };
  C.resolve = function (def) {
    const n = C.nextFoe();
    if (!n) return;
    B.queue.shift();
    enemyTurn(n.u, def);
    if (!over() && !B.queue.length) { B.queue = null; roundEnd(); }
    K.emit("combat", B);
  };

  // ---------- Your place in the line (PRD §18.15, war days with a company; behind the developer switch) ----------
  // Front: the enemy comes at you more, and your blows land harder. Middle: as before. Flank: fewer blows
  // come at you, and you reach the archers better than the men in front. Before the first move it is
  // chosen freely; later, changing place costs the round. Off (B.place unset) unless C.placesWanted says so.
  const PLACES = {
    front: { odds: 0.8, dmg: () => 1.15, say: "You push through to the front of the line." },
    middle: { odds: 0.65, dmg: () => 1, say: "You take your place in the middle of the line." },
    flank: { odds: 0.45, dmg: (t) => (t && t.abilities && t.abilities.includes("arrows") ? 1.25 : 0.9), say: "You work your way out to the flank." }
  };
  C.PLACES = PLACES;
  C.place = () => (B && B.place) || null;
  C.setPlace = function (place) {
    if (!B || B.over || !B.place || !PLACES[place] || B.place === place || C.foesPending()) return false;
    const free = B.round === 1 && !B.habit.length;
    B.place = place;
    api.tell(PLACES[place].say);
    if (free) { planAll(); K.emit("combat", B); return true; } // before round 1: chosen freely, the coming blows re-aimed
    B.habit.push({ id: "place" });
    if (!over()) others(); // later: it costs the round
    K.emit("combat", B);
    return true;
  };

  // Your company's standing orders (PRD §18.15; with your place in the line): hold the line, guard me, press, fall
  // back. Given at any time, without spending the turn. Hold the line is the fight as before.
  C.ORDERS = {
    line: "Your company holds the line.", guardme: "Your company closes round you, shields towards the blows.",
    press: "Your company presses forward.", fallback: "Your company falls back a step and keeps its shields up."
  };
  C.order = () => (B && B.order) || null;
  C.setOrder = function (o) {
    if (!B || B.over || !B.order || !C.ORDERS[o] || B.order === o) return false;
    B.order = o; api.tell(C.ORDERS[o]); K.emit("combat", B); return true;
  };

  // ---------- A leader's mark ----------
  // With a command rank (content/command.js) and someone fighting beside you, the enemy you pick out is
  // marked: they all turn on it until it falls (no turn spent). Command adds to their blows against it:
  // +1 at 4, +2 at 7.
  C.canMark = () => !!(B && !B.over && K.rankOf && K.rankOf(K.S) && B.units.some((u) => u.side === "ally" && u.hp > 0));
  C.marked = () => (B && B.mark && B.units.some((u) => u.uid === B.mark && u.hp > 0) ? B.mark : null);
  C.mark = function (uid) {
    if (!C.canMark()) return false;
    const t = B.units.find((u) => u.uid === uid && u.side === "enemy" && u.hp > 0);
    if (!t || B.mark === uid) return false;
    B.mark = uid;
    const cmd = K.attr("command");
    B.markBonus = cmd >= 7 ? 2 : cmd >= 4 ? 1 : 0;
    const co = B.units.find((u) => u.side === "ally" && u.plural && u.hp > 0);
    api.tell(co ? "Your company turns on {t}." : "You call out {t}, and those beside you turn on them.", { t });
    K.emit("combat", B);
    return true;
  };

  // Returns false when it is not your turn (the enemies are still moving) or the move is not ready, so
  // the screen can draw what is really happening instead of doing nothing.
  C.act = function (id, uid) {
    if (!B || B.over || C.foesPending()) return false;
    const row = C.available().find((a) => a.id === id);
    if (!row || row.why) return false;
    B.habit.push({ id, uid });
    use(C.player(), id, uid);
    // The clash (prototype, owner 5 November): on a war day the round's blows are fought out in real time for a few
    // seconds (ui/realtime.js U.startClash) instead of the foes' turns; your move above still lands first.
    // No foe left to come at you (a break-through's lane whose foe is already down): no clash, the round closes as turns
    // (the 14 lives, 10 November: an empty clash opened and shut in a second).
    if (B.clashMode && acting().length) { if (!over()) B.clashPending = true; K.emit("combat", B); return true; }
    if (!over()) others();
    K.emit("combat", B);
    return true;
  };
  // After a clash: the round closes as a round of turns would (statuses, packs, the champion), unless the fight is over.
  // A mantra traced wrong (ui/mantra.js) on the turns: nothing happens, no use is spent, and the weapon waits a turn.
  C.astraFizzle = function (id) {
    const p = C.player(); if (!B || !p) return;
    p.cds[id] = Math.max(p.cds[id] || 0, 1);
    api.say("The mantra breaks on your tongue. The weapon does not come.");
    K.emit("combat", B);
  };
  C.clashDone = function () { if (!B) return; B.clashPending = false; if (!over()) roundEnd(); K.emit("combat", B); };
  // A friend who falls can be dragged out of the press. It costs your turn.
  C.fallen = () => (B && !B.over ? B.units.filter((u) => u.side === "ally" && u.person && u.hp <= 0 && !B.pulled[u.uid]) : []);
  C.pull = function (uid) {
    const t = C.fallen().find((u) => u.uid === uid);
    if (!t) return;
    B.pulled[t.uid] = true;
    api.tell("You drag {t} out of the press, behind the chariots.", { t });
    K.apply({ bond: { [t.person]: 1 }, memory: [t.person, "You came back for me when I fell."] });
    others();
    K.emit("combat", B);
  };
  C.canFlee = () => !!(B && B.enc.flee && !B.over);
  C.fleeBreaks = () => (B && B.enc.flee ? K.vowBreaksFor(B.enc.flee.tags || ["retreat"]) : []);
  C.flee = function () {
    if (!C.canFlee()) return;
    K.breakTags(B.enc.flee.tags || ["retreat"]);
    api.tell("You withdraw from the fight.");
    finish("flee");
  };
  // A foe asleep under the Sammohana or bound in the Nagapasha can be spared whole: capture, not a kill.
  C.spareable = () => (B && B.enc.spare && !B.over ? living("enemy").filter((e) => e.hp <= e.maxHp * pleadAt() || e.status.asleep || e.status.bound) : []);
  // Only a foe who kneels and asks for it (C.spareable: beaten to 5% or less (30% on the old screen), or asleep or bound, in a fight where
  // sparing is allowed); the screens draw him kneeling, pleading, with the "Spare" hint. On the new screens
  // (C.spareGoesOn, engine/realtime.js) the fight goes on: the spared foe kneels out of it (u.spared, u.away) and
  // the others fight on; it ends when every foe is down or spared: all spared, the fight's "spare" branch; any
  // killed, "win", with the spare branch's fx applied once (finish). Each spared foe counts for the vow never to
  // strike the unarmed. On the old screen (the test-only oldFights override) sparing one ends the fight, as before.
  C.spare = function (uid) {
    const t = C.spareable().find((e) => e.uid === uid);
    if (!t) return false;
    api.tell("You lower your weapon and let {t} go.", { t });
    if (!(C.spareGoesOn && C.spareGoesOn(B))) { finish("spare"); return true; }
    t.spared = true; t.away = true; t.status = {}; B.spared = (B.spared || 0) + 1;
    if (living("enemy").length || nextPack()) { K.emit("combat", B); return true; }
    finish(B.units.some((u) => u.side === "enemy" && u.hp <= 0) ? "win" : "spare");
    return true;
  };
  // A fight played live by the screen (B.mode) ends here: its outcome, and how many rounds it stood for.
  C.settle = function (outcome, rounds) {
    if (!B || B.over) return;
    if (rounds != null) B.round = rounds + 1;
    finish(outcome);
  };
  // The pieces the real-time fight (engine/realtime.js) shares with the turns, so a fight played live
  // builds its units, deals its blows and ends exactly as a turn-based one does.
  C.core = {
    use: (u, id, uid) => use(u, id, uid),
    targetsFor: (u, ab, uid) => targetsFor(u, ab, uid),
    amulet: (p) => amulet(p),
    fieldEvent: () => fieldEvent(),
    makeUnit: (def, side, i, enc) => makeUnit(def, side, i, enc),
    TIMED
  };
  C.end = function () {
    if (!B || !B.over) return null;
    const done = B;
    B = null;
    return done;
  };
})(window.K = window.K || {});
