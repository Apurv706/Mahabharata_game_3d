/* Combat abilities. Each path (PRD §8) brings three; everyone has Strike and Guard.
   target: "enemy" | "self" | "ally" (any living friend, including self) | "enemies" | "allies" */
(function (K) {
  "use strict";
  const pct = (u, p) => Math.max(1, Math.round(u.maxHp * p));

  K.ABILITIES = {
    strike: { name: "Strike", target: "enemy", cd: 0, desc: "A plain attack with your weapon.", use: (B, u, t) => B.hit(u, t, 1) },
    guard: { name: "Guard", target: "self", cd: 0, desc: "Halve the next blow against you.", use: (B, u) => B.status(u, "guard", 1, "braces behind a shield") },
    herbs: {
      name: "Healing herbs", target: "ally", cd: 2, item: "herbs", desc: "Use one bundle of herbs to restore 30% health.",
      use: (B, u, t) => { K.S.items.herbs = Math.max(0, (K.S.items.herbs || 0) - 1); B.heal(u, t, pct(t, 0.3)); }
    },
    // Shout for a friend, once. Who comes (if anyone) is the fight's to say (enc.callHelp).
    call: {
      name: "Call for help", target: "self", once: true, desc: "Shout for a friend. Once per battle; who comes depends on what you have been to them.",
      use: (B, u) => {
        // Nobody comes twice: a friend already on the field (beside you, or across it) is not called in again.
        const here = new Set(B.units.filter((x) => x.hp > 0 && x.person).map((x) => x.person));
        let h = K.val(B.enc.callHelp === undefined && K.friendHelp ? K.friendHelp(K.S, B.enc, here) : B.enc.callHelp, K.S) || {};
        if (h.unit && h.unit.person && here.has(h.unit.person)) h = { text: ["{who} is already in this fight.", { who: K.personName(h.unit.person) }] };
        if (h.text) B.say(h.text);
        if (h.unit) { const a = B.join(h.unit, h.stay || 2); a.called = true; B.status(a, "inspired", 2); }
        if (h.run) h.run(B);
      }
    },
    // The divine weapons (owner, 9 November, User Feedback 58): against ordinary foes each falls on the whole pack and fells
    // most of it (K.astraFell); a champion meets it with his counter-weapon and nothing lands. Three uses of each in a life,
    // when it may be spoken (K.astraWhy), and the price outside the war: K.astraSpeak.
    astra: {
      name: "Indrastra", target: "enemies", once: true, group: "astra", desc: "Indra's weapon, his thunder: it falls on every ordinary foe. Three uses in a life, once a battle.", // (the plain astra, named 9 Nov)
      use: (B, u, ts) => { if (!K.astraSpeak(B, u, "astra", ts[0])) return; K.astraFell(B, u, ts, "The astra strikes {t} for {n}."); }
    },

    // The named divine weapons (§18.7, content/astras.js fills K.ASTRAS). One mantra a battle, whichever is
    // spoken (group "astra"); against one of the epic's heroes it is met by its counter-weapon in mid-air.
    agneya: { name: "Agneyastra", target: "enemies", once: true, group: "astra", desc: "Fire falls on every foe, and burns on. Once per battle.",
      use: (B, u, ts) => { if (!K.astraSpeak(B, u, "agneya", ts[0])) return; K.astraFell(B, u, ts, "Fire falls on {t} for {n}.", (t) => B.status(t, "burn", 3)); } },
    varuna: { name: "Varunastra", target: "enemies", once: true, group: "astra", desc: "Water: puts out fire, cures burns, and falls on every foe like a wall. Once per battle.",
      use: (B, u, ts) => { if (!K.astraSpeak(B, u, "varuna", ts[0])) return; B.living("friends").forEach((f) => { delete f.status.burn; }); K.astraFell(B, u, ts, "The water strikes {t} like a falling wall, for {n}.", (t) => B.status(t, "stun", 1)); } },
    vayavya: { name: "Vayavyastra", target: "enemies", once: true, group: "astra", desc: "Wind scatters the line: guards broken, every foe thrown back and weakened. Once per battle.",
      use: (B, u, ts) => { if (!K.astraSpeak(B, u, "vayavya", ts[0])) return; ts.forEach((t) => { delete t.status.guard; }); K.astraFell(B, u, ts, "The wind throws {t} back for {n}.", (t) => { B.status(t, "weakened", 2); B.status(t, "stun", 1); }); B.bought = (B.bought || 0) + 2; } },
    sammohana: { name: "Sammohana", target: "enemies", once: true, group: "astra", desc: "Every foe falls asleep for four turns. A sleeping foe can be spared, not killed. Once per battle.",
      use: (B, u, ts) => { if (!K.astraSpeak(B, u, "sammohana", ts[0])) return; ts.forEach((t) => { if (!t.hero) B.status(t, "asleep", 4, "slumps down asleep"); }); } },
    nagapasha: { name: "Nagapasha", target: "enemies", once: true, group: "astra", desc: "The serpent-noose binds every foe for six turns, alive: capture, not a kill. Once per battle.",
      use: (B, u, ts) => { if (!K.astraSpeak(B, u, "nagapasha", ts[0])) return; ts.forEach((t) => { if (!t.hero) B.status(t, "bound", 6, "is bound in the serpent-noose"); }); } },

    // Archer
    aimed: { name: "Aimed shot", target: "enemy", cd: 2, desc: "Take your time. A heavy, precise hit.", use: (B, u, t) => B.hit(u, t, 1.8, { verb: "A long, careful shot hits {t} for {n}." }) },
    volley: { name: "Volley", target: "enemies", cd: 3, desc: "Arrows across the whole line.", use: (B, u, ts) => ts.forEach((t) => B.hit(u, t, 0.7, { verb: "Arrows fall on {t} for {n}." })) },
    pin: { name: "Pinning shot", target: "enemy", cd: 3, desc: "Pin a foe so they lose their next turn.", use: (B, u, t) => { B.hit(u, t, 0.6); B.status(t, "stun", 1, "is pinned in place"); } },

    // Mace fighter
    crush: { name: "Crushing blow", target: "enemy", cd: 2, desc: "A huge swing. May stun.", use: (B, u, t) => { B.hit(u, t, 1.6); if (K.rng() < 0.35) B.status(t, "stun", 1, "staggers"); } },
    roar: { name: "War cry", target: "self", cd: 3, desc: "Draw every enemy's attention and brace.", use: (B, u) => { B.status(u, "taunt", 2, "roars a challenge"); B.status(u, "guard", 1); } },
    quake: { name: "Ground-shaker", target: "enemies", cd: 3, desc: "Hit everyone in reach.", use: (B, u, ts) => ts.forEach((t) => B.hit(u, t, 0.65, { verb: "The blow shakes {t} for {n}." })) },

    // Charioteer
    swerve: { name: "Swerve", target: "self", cd: 2, desc: "Dodge the next attack; your next hit lands harder.", use: (B, u) => { B.status(u, "evade", 1, "swerves the chariot"); B.status(u, "inspired", 2); } },
    ridedown: { name: "Ride them down", target: "enemy", cd: 3, desc: "Drive straight through a foe.", use: (B, u, t) => { B.hit(u, t, 1.4, { verb: "The chariot runs down {t} for {n}." }); if (K.rng() < 0.3) B.status(t, "stun", 1, "is knocked flat"); } },
    rally: { name: "Rally the horses", target: "self", cd: 4, desc: "Recover 20% health and shake off effects.", use: (B, u) => { B.cleanse(u); B.heal(u, u, pct(u, 0.2)); } },

    // Strategist
    command: { name: "Command", target: "ally", cd: 2, needsAlly: true, desc: "An ally attacks at once, hitting harder.", use: (B, u, t) => { if (t === u) return B.hit(u, B.firstEnemy(), 1); B.status(t, "inspired", 2); B.hit(t, B.firstEnemy(), 1.2, { verb: "On your order, {a} hits {t} for {n}." }); } },
    expose: { name: "Read the field", target: "enemy", cd: 2, desc: "Find the gap. The foe takes 40% more damage for 2 turns.", use: (B, u, t) => B.status(t, "exposed", 2, "is exposed") },
    formation: { name: "Close formation", target: "allies", cd: 3, desc: "Every ally guards.", use: (B, u, ts) => ts.forEach((t) => B.status(t, "guard", 1, "closes ranks")) },

    // Healer
    salve: { name: "Herbal salve", target: "ally", cd: 3, desc: "Restore 28% health. No herbs needed.", use: (B, u, t) => B.heal(u, t, pct(t, 0.28)) },
    steady: { name: "Steady hands", target: "ally", cd: 3, desc: "Remove harmful effects and guard.", use: (B, u, t) => { B.cleanse(t); B.status(t, "guard", 1); } },
    nerve: { name: "Nerve strike", target: "enemy", cd: 2, desc: "You know where the body is weak. May stun.", use: (B, u, t) => { B.hit(u, t, 1); if (K.rng() < 0.5) B.status(t, "stun", 1, "goes numb"); } },

    // Spy / envoy
    feint: { name: "Feint", target: "self", cd: 2, desc: "Your next attack is a critical hit.", use: (B, u) => B.status(u, "crit", 1, "feints") },
    vanish: { name: "Vanish into the dust", target: "self", cd: 3, desc: "Avoid the next attack.", use: (B, u) => B.status(u, "evade", 1, "slips out of sight") },
    hamstring: { name: "Hamstring", target: "enemy", cd: 2, desc: "A cut that keeps bleeding for 3 turns.", use: (B, u, t) => { B.hit(u, t, 0.9); B.status(t, "bleed", 3, "is bleeding"); } },

    // Bard
    song: { name: "Battle song", target: "allies", cd: 3, desc: "Allies hit 30% harder for 2 turns.", use: (B, u, ts) => ts.forEach((t) => B.status(t, "inspired", 2)) || B.tell(u.side === "player" ? "You sing, and the line stands taller." : "{a} sings, and the line stands taller.", { a: u }) },
    verse: { name: "Mocking verse", target: "enemy", cd: 2, desc: "The foe hits 30% softer for 2 turns.", use: (B, u, t) => B.status(t, "weakened", 2, "falters at the verse") },
    hymn: { name: "Steadying hymn", target: "allies", cd: 3, desc: "Every ally recovers 10% health.", use: (B, u, ts) => ts.forEach((t) => B.heal(u, t, pct(t, 0.1))) },

    // The war day beside your company (PRD §18.15, behind the developer switch): Shield wall in place of Guard, and Rally.
    // A shield wall lasts the round: every blow on your side is halved (a shield-breaker less so), and the line stays shut.
    wall: { name: "Shield wall", target: "allies", cd: 2, needsAlly: true, desc: "Your soldiers close up behind their shields: every blow this round is halved.",
      use: (B, u, ts) => { ts.forEach((t) => { t.status.wall = Math.max(t.status.wall || 0, 1); }); B.tell("Your soldiers step together and raise their shields, rim over rim."); } },
    rally_line: { name: "Rally", target: "allies", cd: 3, needsAlly: true, desc: "A shout down the line: a little health back, and they hit harder.",
      use: (B, u, ts) => { ts.forEach((t) => { B.heal(u, t, pct(t, 0.08)); B.status(t, "inspired", 2); }); } },

    // Enemy techniques
    heavy: { name: "Heavy blow", target: "enemy", cd: 3, desc: "", use: (B, u, t) => B.hit(u, t, 1.6, { heavy: true, verb: "A heavy blow hits {t} for {n}." }) },
    breaker: { name: "Shield-breaker", target: "enemy", cd: 3, desc: "", use: (B, u, t) => B.hit(u, t, 1.25, { heavy: true, breaks: true, verb: "A shield-breaking blow hits {t} for {n}." }) },
    brace: { name: "Brace", target: "self", cd: 2, desc: "", use: (B, u) => B.status(u, "guard", 1, "braces for your next blow") },
    arrows: { name: "Arrow storm", target: "enemies", cd: 3, desc: "", use: (B, u, ts) => ts.forEach((t) => B.hit(u, t, 0.6, { verb: "Arrows rain on {t} for {n}." })) },
    disarm: { name: "Break the bow", target: "enemy", cd: 4, desc: "", use: (B, u, t) => { B.hit(u, t, 0.8); B.status(t, "weakened", 2, "loses grip on the weapon"); } }
  };

  K.STATUS_TEXT = {
    guard: "Guarding", evade: "Evading", stun: "Stunned", exposed: "Exposed", weakened: "Weakened",
    inspired: "Inspired", bleed: "Bleeding", crit: "Ready to strike", taunt: "Drawing fire", cursed: "Cursed",
    burn: "Burning", asleep: "Asleep", bound: "Bound", wall: "Shield wall"
  };
  // ---------- The divine weapons' rules (owner, 9 November: User Feedback 58) ----------
  // Three uses of each weapon in a life (kept in S.charges as "astra_used_<id>"). Free against a champion, who answers it
  // with his counter-weapon (nothing lands, as before). Against ordinary foes: in the war, ready below half your health or
  // once one of yours has fallen in this fight (a company that has lost men counts); outside the war, only under a tenth
  // of your life, and at the price of conscience and the sages' regard. Never in a practice bout. Still once a battle.
  K.ASTRA_USES = 3;
  const usedKey = (id) => "astra_used_" + id;
  K.astraLeft = (id, S = K.S) => Math.max(0, K.ASTRA_USES - ((((S && S.charges) || {})[usedKey(id)]) || 0));
  K.astraSpend = (id, S = K.S) => { S.charges = S.charges || {}; S.charges[usedKey(id)] = (S.charges[usedKey(id)] || 0) + 1; };
  K.astraWar = (S = K.S) => !!S && (S.side === "pandava" || S.side === "kaurava");
  K.astraSpar = (enc) => !!(enc && (enc.bout || /^x_/.test(enc.id || "")));
  K.isAstra = (id) => id === "astra" || !!(K.ABILITIES[id] && K.ABILITIES[id].group === "astra");
  const up = (u) => u.hp > 0 && !u.away;
  K.astraChampion = (units) => units.some((u) => u.side === "enemy" && up(u) && u.hero);
  K.astraFallen = (units) => units.some((u) => u.side !== "enemy" && u.side !== "player" && (u.hp <= 0 || (u.plural && u.hp < u.maxHp)));
  // Why the weapon cannot be spoken now (null: it can). units: the fight's; p: you.
  K.astraWhy = function (units, enc, p, id, S = K.S) {
    if (K.astraSpar(enc)) return "Not in a practice bout";
    if (K.astraChampion(units)) return null; // a champion: free, at any health
    if (!K.astraLeft(id, S)) return "All three uses spent";
    if (K.astraWar(S)) return p.hp < p.maxHp * 0.5 || K.astraFallen(units) ? null : "Ready below half your health, or once one of yours falls";
    return p.hp < p.maxHp * 0.1 ? null : "Outside the war: only when your life is nearly gone";
  };
  // The same reasons, short, for the small Aid buttons (a phone's Aid row has room for a few words).
  const WHY_SHORT = [["Not in a practice bout", "not in practice"], ["All three uses spent", "all used"], ["Ready below half your health, or once one of yours falls", "below half health"], ["Outside the war: only when your life is nearly gone", "only near death"]];
  K.astraShort = (why) => { if (!why) return why; for (const [l, s] of WHY_SHORT) if (why === l || why === K.tr(l)) return K.tr(s); return why; };
  // Against the ordinary foes it reaches (all of them): 70–100% of each one's health; then(t) for the weapon's own effect.
  K.astraFell = function (B, u, ts, verb, then) {
    ts.forEach((t) => { if (t.hero || t.hp <= 0) return; B.hit(u, t, 1, { frac: 0.7 + 0.3 * K.rng(), pierce: true, verb }); if (then && t.hp > 0) then(t); });
  };
  // Speaking a mantra: the condition's curse, the misuse curse, the hero's counter-weapon, the use spent and the price.
  // Returns false when the weapon did nothing more (the clash, or the failed mantra).
  K.astraSpeak = function (B, u, id, t) {
    const broken = B.enc.lethal && K.S.curses.find((c) => c.id === "astra_condition" && !c.fired);
    if (broken) { K.apply({ fireCurse: "astra_condition", journal: K.CURSES.astra_condition.fireText }); B.say(K.CURSES.astra_condition.fireText); return false; }
    const ts = B.living("enemy");
    const hero = ts.find((e) => e.hero);
    B.astraOut = { uid: (hero || t || ts[0] || {}).uid, kind: id === "astra" ? B.enc.astraKind || "generic" : id, clash: !!hero };
    if (hero) { B.tell("{t} answers with the counter-weapon. The two meet in the air in a blaze of light, and both are gone.", { t: hero }); B.status(hero, "stun", 1); return false; }
    if (u.side === "player") {
      K.astraSpend(id);
      const left = K.astraLeft(id);
      B.say(left ? ["The mantra holds. {n} of 3 uses left.", { n: left }] : "The mantra holds. That was its last use.");
      if (t && !t.armed && !ts.some((e) => e.armed)) {
        B.say("You loose a divine weapon at foes who cannot defend themselves. The sky goes dark. Somewhere, a sage has seen.");
        K.apply({ curse: "astra_misuse", duty: { conscience: -3 }, rep: { sages: -2 }, journal: "You used a divine weapon on someone who could not fight back." });
      } else if (!K.astraWar()) {
        B.say("A weapon of the gods, loosed on common men to save your own life. The sages will hear of it.");
        K.apply({ duty: { conscience: -3 }, rep: { sages: -2 }, journal: "Outside the war, you loosed a divine weapon on common men to save your life." });
      }
    }
    return true;
  };
})(window.K = window.K || {});
