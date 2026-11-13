/* War storylines (PRD 18.13): The Samshaptakas: the oath to the death (#3).
   Scenes here come before the war days through K.BEFORE, each only when it applies.
   Kaurava side: on the night of the eleventh day the Trigarta brothers and their men swear to fight
   Arjuna until he dies or they do, to draw him away from Yudhishthira. You may swear with them: a
   fourth vow above the limit of three (K.VOWS.samshaptaka.overLimit, core.js vowTake), for this war
   only. While it holds: +2 attack, +1 defence (combat.js); tapas +3 when sworn. Its price: you hold
   in front of Arjuna's chariot every day he comes for the sworn men. Chosen here as two days: the
   twelfth (the first challenge) and the sixteenth (Karna's first day in command, when Arjuna turns on
   the Samshaptakas again). Arjuna does not fall, so the oath ends with the war (released after the
   eighteenth day). Withdrawing breaks it (the withdraw_oath tag, core.js vowBreak: every watcher's
   bond -3), and the telling names you oath-breaker. Falling with the oath on you is its own ending,
   "The oath to the death" (act7.js); story mode carries you off with a wound, the oath kept.
   Pandava side: while Arjuna is drawn south, you are in the crescent array that holds Drona's eagle
   off the king: an army battle for those with a company, the horn beside Bhima for anyone. If it
   breaks where you stand, a holding fight at Yudhishthira's chariot follows (Drona; Satyajit falls,
   as he does in the epic, and the king is never taken).
   Flags: samshaptaka, oath_held_12, oath_held_16, oath_withdrew, oath_carried_off, broke_samshaptaka
   (core.js); crescent_held, crescent_broke, king_held_12, king_guard_broke. */
(function (K) {
  "use strict";
  const sworn = (S) => K.hasVow("samshaptaka", S);
  // Not for anyone taken prisoner in the fighting of the eleventh and twelfth days.
  const free12 = (S) => !(S.captive && S.captive.act === 6) && S.alive;
  const companies = (S) => { const a = K.warAllies(S); return [a[0]].concat(a.length > 1 ? ["ally"] : [], ["soldiers"]); };

  // ---------- The vow ----------
  K.VOWS.samshaptaka = {
    // (No proper name in it: the telling writes a vow's name in lower case.)
    name: "An oath to the death", gift: "To fight Arjuna until he falls or you do.",
    keep: "+2 attack and +1 defence while it holds. Sworn with the Samshaptakas for this war only, beyond the limit of three vows.",
    watchers: ["duryodhana", "drona", "karna"],
    price: "Duryodhana, Drona and Karna turn from you, and the tellers name you oath-breaker.", priceShort: "the tellers will name you oath-breaker",
    overLimit: true, place: "scene_samshaptaka_oath", theme: "oath" // its moment: the oath painting, and a theme of its own (moments.js, audio.js)
  };
  K.VOW_TAGS.withdraw_oath = "samshaptaka";
  const WITHDRAW = ["retreat", "withdraw_oath"];

  // ---------- The fights ----------
  // Arjuna's chariot: the holding fight of command.js (its beats and painting), deadly under the oath,
  // and harder: he is hunting the sworn men, not passing by (a careful player holds about three times
  // in four on the twelfth day, two in three on the sixteenth). He is held, never brought down (enc.hold).
  const arjunaHold = (id, day /* the death line */, hold, atk, extra) => K.encounter(Object.assign({}, K.ENCOUNTERS.hold_arjuna, {
    id, hold, lethal: true, injury: "scar",
    enemies: [K.foe("Arjuna", 10, { abilities: ["strike", "arrows", "aimed"], hero: true, person: "arjuna", hp: 900, atk }), K.foe("Pandava chariot-warrior", 5, { abilities: ["strike", "arrows"] })],
    flee: { tags: WITHDRAW, fx: { flag: "oath_withdrew" }, text: "You pull out of the arrows. The sworn men around you see it, and none of them says a word." },
    lose: { fx: (S) => (S.storyMode ? { flag: "oath_carried_off", journal: "Arjuna's arrows brought you down, and your men carried you off the field. You never stepped back, and the oath held." } : null),
      text: (S) => (S.alive ? "An arrow takes you under the collarbone, and your men carry you off. You never stepped back, and the oath holds." : null),
      deathText: day }
  }, extra));
  arjunaHold("oath_arjuna_12", "{They} swore the Samshaptakas' oath on the eleventh night, and fell in front of Arjuna's chariot on the twelfth day, as {they} had sworn.", 7, 11, {
    title: "The sworn men's challenge", caption: "Seven rounds under the arrows",
    intro: "Arjuna's chariot comes down on the sworn men like a hawk on a field of quail. No one has stood in front of it and stayed. You swore you would.",
    holdText: "A rider reaches Arjuna's chariot from the north: the king is in danger. Krishna turns the white horses away. You are still standing.",
    win: { fx: { flag: "oath_held_12", rep: { kuru: 1 }, journal: "On the twelfth day you stood in front of Arjuna's chariot, as you had sworn, until it turned away." },
      text: "He goes north at a gallop, and the sworn men cheer as if they had won. He will be back." }
  });
  arjunaHold("oath_arjuna_16", "{They} swore the Samshaptakas' oath on the eleventh night, and fell in front of Arjuna's chariot on the sixteenth day, as {they} had sworn.", 7, 12, {
    title: "The white horses, again", caption: "Seven rounds",
    intro: "There are fewer of you this time, and he comes straight for the banners he remembers.",
    holdText: "Ashwatthama's conch sounds to the north, and Arjuna turns to answer it. You are still standing.",
    win: { fx: { flag: "oath_held_16", rep: { kuru: 1 }, journal: "On the sixteenth day you stood in front of Arjuna's chariot again, and held." },
      text: "The chariot wheels away north. Around you the sworn men count who is left, and it does not take long." }
  });
  // Pandava side: Drona at Yudhishthira's chariot, when the crescent breaks.
  K.encounter({
    id: "oath_king_hold", title: "The king's chariot", caption: "Six rounds", hold: 6, hard: true, lethal: false, curse: true, spare: false,
    allies: K.warAllies, callHelp: K.warHelp, art: "war_capture", flee: { tags: ["retreat"], text: "You fall back from the chariot. The king's guard closes behind you, thinner than before." },
    enemies: [K.foe("Drona", 10, { abilities: ["strike", "arrows", "heavy"], hero: true, person: "drona", hp: 900, atk: 11 }), K.foe("Kaurava chariot-warrior", 5, { abilities: ["strike", "arrows"] })],
    intro: "Drona himself is coming through the gap. Between him and Yudhishthira there is the king's guard, and you.",
    holdText: "The king's chariot is away through the press. Drona lowers his bow and turns back toward his own lines.",
    beats: [{ round: 2, text: "Satyajit of Panchala drives between Drona and the king. Drona's arrows find him, and he falls.", run: (B) => B.living("enemy").forEach((u) => B.status(u, "inspired", 2)) },
      { round: 5, text: "Behind you the king's charioteer has the horses turned. A little longer.", run: (B) => B.living("friends").forEach((u) => B.status(u, "guard", 1)) }],
    win: { fx: { flag: "king_held_12", bond: { yudhishthira: 2 }, rep: { pandava: 1 }, journal: "On the twelfth day, when the crescent broke, you held Drona off Yudhishthira's chariot until the king was away." },
      text: "Yudhishthira looks back once as his chariot goes. At dusk Arjuna comes back from the south, and finds his brother alive." },
    lose: { fx: { flag: "king_guard_broke", injury: "scar" }, text: "The guard around the chariot breaks, and Yudhishthira gets away through the last gap with Drona's arrows behind him." }
  });
  Object.assign(K.COMMAND_FIGHT_BG, { oath_arjuna_12: "fight_arjuna_chariot", oath_arjuna_16: "fight_arjuna_chariot", oath_king_hold: "fight_war_chariot" });

  const holdChoices = (enc) => [
    { id: "hold", t: "Hold, as you swore", combat: enc, hint: "Won by standing" },
    { id: "withdraw", t: "Pull out of his road", tags: WITHDRAW, fx: { flag: "oath_withdrew" },
      text: "You turn your horses. The sworn men on either side of you watch you go, and close the gap without a word." }
  ];

  K.scenes([
    // ---------- Kaurava: the oath ----------
    {
      id: "oath_fire", act: 6, age: 44, war: true, away: true, when: (S) => S.side === "kaurava" && free12(S) && !S.vows.some((v) => v.id === "samshaptaka"),
      skipTo: "a6_wheel", next: "a6_wheel",
      art: "scene_samshaptaka_oath", place: "The Kaurava camp, the night of the eleventh day", caption: "Grass garlands around a fire",
      title: "The oath of the Samshaptakas",
      body: (S) => ["Susharma of Trigarta and his men, garlanded like the dead, swear by a fire to fight Arjuna to the death.",
        { speaker: "Susharma", line: "While Arjuna fights us, Drona takes the king. There is room at the fire." },
        S.friend === "arjuna" ? { memory: "Arjuna has been your friend since you were ten." } : null],
      choices: [
        { id: "swear", t: "Swear with them", fx: { vowTake: "samshaptaka", tapas: 3, flag: "samshaptaka", journal: "On the eleventh night of the war you swore the Samshaptakas' oath: to fight Arjuna until he fell or you did." },
          resolve: (S) => (S.friend === "arjuna" ? { bond: { arjuna: -2 } } : null), hint: (S) => (K.vowsHeld(S) >= K.MAX_VOWS ? "A fourth vow, allowed for this war only" : null),
          text: "You say the words after Susharma, and someone hangs a garland of grass around your neck. It weighs nothing, and you feel it all night." },
        { id: "watch", t: "Keep your own oaths", text: "You watch them swear. When the fire burns low you go back to your own tent, and do not sleep much." }
      ]
    },
    {
      id: "oath_south", act: 6, age: 44, war: true, away: true, when: (S) => sworn(S) && free12(S), skipTo: "a6_wheel", next: "a6_wheel",
      art: "fight_arjuna_chariot", place: "Kurukshetra · day 12, the south of the field", caption: "The white horses, turning", title: "Arjuna's chariot",
      body: ["The sworn men call Arjuna out, and Krishna turns the white horses toward you."],
      choices: holdChoices("oath_arjuna_12")
    },
    {
      id: "oath_again", act: 6, age: 44, war: true, away: true, when: (S) => sworn(S) && !S.flags.includes("captive"), skipTo: "a6_day16", next: "a6_day16",
      art: "fight_arjuna_chariot", place: "Kurukshetra · day 16", caption: "The sworn men, fewer", title: "He comes again",
      body: (S) => ["Arjuna turns south again, toward what is left of the sworn men.",
        S.flags.includes("oath_held_12") ? "He has seen your banner before. He comes straight at it." : null],
      choices: holdChoices("oath_arjuna_16")
    },

    // ---------- Pandava: the crescent ----------
    {
      id: "oath_crescent", act: 6, age: 44, war: true, away: true, when: (S) => S.side === "pandava" && free12(S), skipTo: "a6_wheel", next: "a6_wheel",
      art: "war_capture", place: "Kurukshetra · day 12", caption: "The crescent array", title: "The crescent",
      body: ["The Trigartas have drawn Arjuna away. Drona's eagle array is coming for the king."],
      choices: [
        { id: "array", t: "Set your companies", req: (S) => S.flags.includes("role_command") && !S.flags.includes("company_broken"), game: "array", hint: "Hold till Arjuna returns",
          trial: { attr: "command", skill: "statecraft", kind: "war", array: "crescent", rounds: 5, stage: "stage_vyuha_top", companies: (S) => companies(S),
            rules: "Put your companies on the marks. Then, each round: hold, strike their flank, give ground, or send the reserve.",
            stakes: ["The crescent holds, and Drona does not reach the king through you.", "The crescent breaks where you stand, and Drona's chariots go through toward the king."] },
          win: { fx: { flag: "crescent_held", duty: { court: 1 }, journal: "On the twelfth day, with Arjuna drawn away south, you held your stretch of the crescent." }, text: "Your stretch of the crescent is where it was at dawn when the eagle draws back." },
          close: { fx: { flag: "crescent_held" }, text: "The crescent bends where you stand, and holds." },
          lose: { fx: { flag: "crescent_broke", duty: { court: -1 } }, next: "oath_king", text: "The horn bends, then breaks. Drona's chariots are through." } },
        { id: "horn", t: "Fight beside Bhima", hint: "A test of might",
          check: { attr: "might", skill: "mace", dc: 8,
            pass: { fx: { flag: "crescent_held", bond: { bhima: 1 } }, text: "Bhima's horn does not bend all day. You are in the thick of it when the conches sound." },
            fail: { fx: { flag: "crescent_broke" }, next: "oath_king", text: "The horn folds under the eagle's charge, and you are thrown clear. When you get up, Drona's chariots are through." } } }
      ],
      after: (S) => (S.flags.includes("crescent_broke") ? null
        : ["Further along the crescent Drona kills Satyajit, but the king is got away in time."])
    },
    {
      id: "oath_king", act: 6, age: 44, war: true, away: true, art: "scene_kings_wheel", place: "Kurukshetra · day 12", caption: "Drona through the gap", title: "The king's chariot",
      body: ["Drona's chariots pour through the gap toward Yudhishthira."],
      choices: [
        { id: "hold", t: "Hold at the king's chariot", combat: "oath_king_hold", hint: "Won by standing" },
        { id: "back", t: "Fall back", tags: ["retreat"], fx: { duty: { court: -1 } }, text: "You fall back with the broken horn. Others reach the king before you, or do not." }
      ],
      next: "a6_wheel"
    }
  ]);

  // The day-16 hold against Arjuna (command.js) is the oath's own fight for the sworn: not offered twice.
  const offer = K.SCENES.hold_arjuna_offer;
  if (offer) { const w = offer.when; offer.when = (S) => !sworn(S) && K.test(w, S); }

  // The oath ends with the war: released (kept) once the eighteenth day is over, for those still alive.
  K.oathEnds = (sc, S = K.S) => {
    if (!S || !S.alive || !sworn(S) || !((S.seen.includes("a6_day18") && sc.id !== "a6_day18") || (sc.act || 0) >= 7)) return;
    K.apply({ vowRelease: "samshaptaka", journal: "On the eighteenth day Arjuna killed Susharma and the last of the Trigartas. The war ended with your oath still on you, unbroken." });
  };
  K.on("scene", (sc) => K.oathEnds(sc));


  // Where the scenes come: the oath on the eleventh night and the twelfth day's fighting, before the
  // night of the twelfth (ep_carts) and the wheel; the second challenge on the sixteenth day.
  K.BEFORE.a6_wheel = ["oath_fire", "oath_south", "oath_crescent"].concat(K.BEFORE.a6_wheel || []);
  K.BEFORE.a6_day16 = (K.BEFORE.a6_day16 || []).concat(["oath_again"]);

  // ---------- What the telling says ----------
  (K.TELL_HOOKS = K.TELL_HOOKS || []).push((S, t, has) => {
    if (has("oath_held_12") && has("oath_held_16")) t.push("Sworn to the death, {they} stood twice in front of Arjuna's chariot, and twice it turned away.");
    else if (has("oath_held_12") || has("oath_held_16")) t.push("Sworn to the death, {they} stood in front of Arjuna's chariot, and it turned away.");
    if (has("oath_carried_off")) t.push("{They} {were} carried off the field with Arjuna's arrow in {them}, and the oath unbroken.");
    if (has("broke_samshaptaka")) t.push("The sworn men of Trigarta called {them} oath-breaker, and the tellers still do.");
    if (has("king_held_12")) t.push("When the crescent broke on the twelfth day, {they} stood at Yudhishthira's chariot until Drona could not reach him.");
    else if (has("crescent_held")) t.push("On the twelfth day, with Arjuna drawn away to the south, {they} held {their} part of the crescent.");
  });
})(window.K = window.K || {});
