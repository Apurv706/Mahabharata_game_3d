/* Act VI — The war, part 2: day 14 to the night raid. PRD §10. */
(function (K) {
  "use strict";
  const fighting = { side: ["pandava", "kaurava"] };
  const war = K.warEncounter;
  const vasuAt = (S, where) => S.child === "vasu" && !S.dead.includes("vasu") && S.flags.includes(where);
  // Vasu dies in the night raid unless someone stood in the way (saved him, woke the camp, or held
  // Ashwatthama at the gate). One rule, read by the raid's closing lines and by Act VII.
  K.vasuLostInRaid = (S) => S.side !== "kaurava" && S.child === "vasu" && !S.dead.includes("vasu") &&
    (S.flags.includes("vasu_in_camp") || S.flags.includes("vasu_with_you")) &&
    !["saved_vasu_raid", "woke_camp", "slowed_ashwatthama"].some((f) => S.flags.includes(f));

  K.scenes([
    {
      id: "a6_day14", act: 6, age: 44, canon: true, war: true, art: "war_day14", place: "Kurukshetra · day 14", caption: "A sun that seems to set early",
      title: "Sunset and torches",
      witness: [
        "Arjuna kills Jayadratha before sunset, and the armies fight on into the night."
      ],
      body: (S) => [S.side === "neutral" ? "The tents are lit with torches all night." : null],
      choices: [
        { id: "road", t: "Clear Arjuna's road", req: { side: "pandava" }, combat: "e_road" },
        { id: "jaya", t: "Guard Jayadratha", req: { side: "kaurava" }, combat: "e_jaya" },
        { id: "hold", t: "Hold your ground", req: fighting, fx: { duty: { court: 1 } } },
        { id: "tend", t: "Tend the wounded", req: { side: ["neutral", null, undefined] }, fx: { rep: { common: 1 } } }
      ],
      next: "a6_night"
    },
    {
      id: "a6_day15", act: 6, age: 44, canon: true, war: true, art: "war_day15", place: "Kurukshetra · day 15", caption: "An elephant named Ashwatthama",
      title: "Ashwatthama is dead",
      witness: [
        "Bhima kills an elephant named Ashwatthama and shouts that Ashwatthama, Drona's son, is dead."
      ],
      body: (S) => [
        S.teacher === "drona" ? { memory: "Drona taught you everything you know." } : null,
        S.side === "pandava" ? "Bhima is shouting it, and he wants everyone else shouting it too." : S.side === "kaurava" ? "The rumour races toward Drona's chariot." : "Even in the tents, people are repeating it."
      ],
      choices: [
        { id: "spread", t: "Shout it: Ashwatthama is dead", req: { side: "pandava" }, tags: ["lie"],
          fx: (S) => ({ flag: "spread_the_lie", duty: { teacher: S.teacher === "drona" ? -4 : 0, conscience: -2 }, rep: { pandava: 1 }, journal: "On the fifteenth day you helped spread the half-truth that killed Drona." }) },
        { id: "refuse", t: "Refuse to repeat it", req: { side: "pandava" }, fx: { duty: { conscience: 1 }, flag: "refused_lie" } },
        { id: "warn", t: "Tell Drona his son is alive", req: { any: [{ side: "kaurava" }, { teacher: "drona" }] },
          fx: (S) => ({ duty: { teacher: S.teacher === "drona" ? 3 : 1, court: S.side === "pandava" ? -3 : 1 }, memory: ["drona", "You rode to tell him the truth."], journal: "On the fifteenth day you tried to tell Drona his son was alive." }),
          text: "You reach his chariot and shout it. He looks past you toward Yudhishthira, and does not hear you." },
        { id: "tend", t: "Stay with the wounded", fx: { rep: { common: 1 } } }
      ],
      after: ["Ashwatthama hears how his father died and swears the Pandavas will pay."],
      next: "a6_day16"
    },
    {
      id: "a6_day16", act: 6, age: 44, canon: true, war: true, art: "war_day16", place: "Kurukshetra · day 16", caption: "Karna takes command",
      title: "Bhima's vow",
      witness: ["Karna takes command. Bhima finds Dushasana and keeps the vow he made in the dice hall."],
      body: (S) => [S.flags.includes("enemy_dushasana") ? { memory: "Dushasana never forgot your face from the dice hall. Before Bhima finds him, his men find you." } : null],
      choices: [
        { id: "ambush", t: "Fight Dushasana's men", req: { flag: "enemy_dushasana" }, combat: "e_dushasana" },
        { id: "fight", t: "Fight in the line", req: { side: ["pandava", "kaurava"], noFlag: "enemy_dushasana" }, combat: "e_day16" },
        { id: "tend", t: "Stay with the wounded", req: { noFlag: "enemy_dushasana" }, fx: { rep: { common: 1 } } }
      ],
      next: "a6_day17"
    },
    {
      id: "a6_day17", act: 6, age: 44, canon: true, war: true, art: "war_day17", place: "Kurukshetra · day 17", caption: "A chariot wheel sinks into the earth",
      title: "Karna",
      enter: (S) => (K.hasVow("vengeance") && S.flags.includes("vengeance_dice") ? { vowRelease: "vengeance", flag: "vengeance_answered", journal: "Your vow of vengeance for the dice hall was answered by Bhima's hand." } : null),
      witness: ["Mid-duel, Karna's wheel sinks into the earth. He climbs down to lift it and asks Arjuna to wait."],
      body: (S) => [
        S.bonds.karna >= 6 ? { memory: S.flags.includes("met_karna_young") ? "You have known Karna since you were children." : "You have known Karna since the day in the arena." } : null,
        K.hasVow("spare_karna") ? { aside: "You swore never to raise a weapon against Karna." } : null,
        S.side === "kaurava" ? "Your chariot is the nearest to his." : S.side === "pandava" ? "You are close enough to see his face." : "You are close enough to see his face."
      ],
      choices: [
        { id: "shoot", t: "Shoot Karna at the wheel", req: { side: "pandava" }, tags: ["strike_karna", "strike_unarmed"], fx: { duty: { conscience: -2 }, bond: { arjuna: 1, karna: -3 }, flag: "shot_karna", journal: "On the seventeenth day you shot at Karna while he was lifting his chariot wheel." } },
        { id: "call", t: "Shout to Arjuna to wait", req: { side: "pandava" }, fx: { duty: { conscience: 2 }, bond: { arjuna: -1, karna: 1 }, memory: ["karna", "You called out for a fair fight."] } },
        { id: "wheel", t: "Help Karna lift the wheel", req: { side: "kaurava" },
          peril: { kind: "death", flag: "died_with_karna", art: "war_day17", caption: "A chariot wheel sinks into the earth", text: "The arrows come from across the field, and they do not care whose hands are on the wheel.",
            deathText: "{They} jumped down to help Karna lift his sunken wheel, and fell in the dust beside it." },
          check: { attr: "might", skill: "chariot", dc: 9,
            pass: { fx: { bond: { karna: 2 }, flag: "lifted_wheel" }, text: "The wheel moves. It moves too slowly." },
            fail: { fx: { bond: { karna: 1 } }, text: "The earth will not give it back." } } },
        { id: "stand", t: "Stand over Karna to the end", req: { side: "kaurava" }, fx: { die: true, flag: "died_with_karna", deathText: "You fell beside Karna on the seventeenth day, standing over him as the wheel sank.", bond: { karna: 3 } }, hint: "You will not survive this" },
        { id: "home", t: "Pull back to Vasu", req: (S) => S.side === "kaurava" && S.child === "vasu" && !S.dead.includes("vasu"), tags: ["retreat"], fx: { duty: { family: 2 }, flag: "left_karna" } },
        { id: "watch", t: "Watch, and remember", fx: { flag: "watched_karna" } }
      ],
      after: (S) => [
        "Arjuna's arrow takes Karna's life.",
      ],
      next: "a6_day18"
    },
    {
      id: "a6_day18", act: 6, age: 44, canon: true, war: true, art: "war_day18", place: "Kurukshetra · day 18", caption: "The last day",
      title: "The last day",
      witness: [
        "On the last day Bhima breaks Duryodhana's thigh, striking below the waist against the rules."
      ],
      body: ["The last day."],
      choices: [
        { id: "fight", t: "Fight in the last battle", req: fighting, combat: "e_day18" },
        { id: "lake", t: "Witness the duel at the lake", fx: { flag: "saw_duel" } },
        { id: "tend", t: "Stay with the wounded", fx: { rep: { common: 1 } } }
      ],
      next: "a6_duryodhana"
    },
    {
      id: "a6_duryodhana", when: { any: [{ friend: "duryodhana" }, { bond: ["duryodhana", 7] }] }, skipTo: "a6_raid",
      act: 6, age: 44, war: true, place: "The lakeside, that night", to: "kurukshetra", art: "scene_duryodhana", plate: ["#5c3361", "#2a1c1f"], caption: "A broken king by the water",
      title: "Duryodhana at the lake",
      body: (S) => ["Duryodhana lies dying, his thigh shattered. He sees you.",
        K.lakeLines ? K.lakeLines.dying(S) : null], // what you did at the lake before the duel (content/war_lake.js)
      choices: [
        { id: "comfort", t: "Sit with him", fx: { bond: { duryodhana: 2 }, memory: ["duryodhana", "You sat with him at the end."], journal: "You sat with Duryodhana by the lake as he lay dying." } },
        { id: "truth", t: "Tell him what he did", fx: { duty: { conscience: 2 }, bond: { duryodhana: -2 } }, text: "\"I lived as a king, and I am dying as one,\" he says. \"Which of them can say that?\"" },
        { id: "leave", t: "Leave him to the night", fx: {} }
      ],
      after: ["Before midnight Duryodhana makes Ashwatthama commander of an army of three."],
      next: "a6_raid"
    },
    {
      id: "a6_raid", act: 6, age: 44, canon: true, war: true, place: "The Pandava camp, the night after the last day", art: "scene_raid", plate: ["#c0472f", "#16131f"], caption: "Fire in the sleeping camp",
      title: "The night raid",
      witness: ["The war is over. In the dark, Ashwatthama comes into the sleeping Pandava camp with a sword."],
      body: (S) => [
        S.side === "kaurava" ? "Ashwatthama wants one more sword: yours." : "You wake to screaming.",
        K.lakeLines ? K.lakeLines.raid(S) : null, // the reeds at the lake, a few hours ago (content/war_lake.js)
        S.boons.includes("foresight") && S.side !== "kaurava" ? { memory: "Your foresight woke you a moment before the first scream." } : null,
        S.side !== "kaurava" && (vasuAt(S, "vasu_in_camp") || vasuAt(S, "vasu_with_you")) ? { memory: "Vasu is sleeping three tents away." } : null
      ],
      choices: [
        { id: "vasu", t: "Run to Vasu's tent", req: (S) => S.side !== "kaurava" && (vasuAt(S, "vasu_in_camp") || vasuAt(S, "vasu_with_you")),
          fx: { flag: "saved_vasu_raid", bond: { vasu: 2 }, duty: { family: 2 }, journal: "On the night of the raid you got Vasu out of the burning camp." }, text: "You drag him out under the back of the tent, into the dark, and you do not stop running until the fire is a glow behind you." },
        { id: "wake", t: "Wake the camp", req: { not: { side: "kaurava" } },
          peril: { kind: "death", art: "scene_raid", caption: "Fire in the sleeping camp", text: "Your shout brings someone, but not the help you wanted. Ashwatthama finds you in the smoke.",
            deathText: "{They} tried to wake the sleeping camp on the last night, and Ashwatthama reached {them} first." },
          check: { attr: "command", skill: "statecraft", dc: 8, bonus: (S) => (S.boons.includes("foresight") ? 2 : 0),
            pass: { fx: { rep: { pandava: 2, common: 2 }, flag: "woke_camp", journal: "On the night of the raid your shouting woke enough of the camp to save many lives." }, text: "Your voice carries, and tents empty into the dark. Many who should have died that night live." },
            fail: { resolve: null, fx: { flag: "raid_failed_wake" }, text: "The smoke takes your voice. Too few hear you." } } },
        { id: "gate", t: "Fight Ashwatthama at the gate", req: { not: { side: "kaurava" } }, combat: "e_raid" },
        { id: "nishada", t: "Whistle for the Nishada archers", req: (S) => S.side !== "kaurava" && (S.flags.includes("helped_ekalavya") || S.flags.includes("stood_with_ekalavya")),
          resolve: (S) => (vasuAt(S, "vasu_in_camp") || vasuAt(S, "vasu_with_you") ? { flag: "saved_vasu_raid", bond: { vasu: 1 } } : {}),
          fx: { flag: ["woke_camp", "nishada_came"], rep: { common: 2 }, journal: "On the night of the raid, the Nishada archers came out of the dark when you whistled." },
          text: "Ekalavya's people come out of the trees at the whistle he taught them. Their arrows hold the gate long enough for half the camp to run." },
        { id: "join", t: "Go with Ashwatthama", req: { side: "kaurava" }, tags: ["strike_unarmed"],
          fx: { duty: { conscience: -5 }, rep: { sages: -3, common: -2 }, flag: "joined_raid", journal: "You went into the sleeping Pandava camp with Ashwatthama." } },
        { id: "refuse", t: "Refuse him", req: { side: "kaurava" }, fx: { duty: { conscience: 2 }, flag: "refused_ashwatthama" }, text: "\"Then go home,\" he says, \"and live with that.\"" },
        { id: "stop", t: "Try to stop him", req: { side: "kaurava" }, combat: "e_ash" }
      ],
      after: (S) => [
        "Ashwatthama kills Dhrishtadyumna, Shikhandi and Draupadi's five sons in their sleep.",
        K.vasuLostInRaid(S) ? { curse: "You find Vasu at dawn, in what is left of his tent." } : null
      ],
      next: "a7_field"
    }
  ]);

  const foeSide = (S) => (S.side === "kaurava" ? "Pandava" : "Kaurava");
  war("e_road", "The road to Jayadratha", [K.foe("Kaurava chariot-warrior", 5, { abilities: ["strike", "heavy", "arrows"] }), K.foe("Kaurava horseman", 4)], { art: "war_day14",
    caption: "Day fourteen",
    win: { fx: { bond: { arjuna: 2 }, rep: { pandava: 2 } }, text: "You break a hole in the line, and Arjuna's chariot goes through it like water." },
    lose: { deathText: "You fell on the fourteenth day, clearing the road for Arjuna." },
    flee: { text: "You fall back from the road." }, spare: { fx: { duty: { conscience: 1 } }, text: "You let him go." }
  });
  war("e_jaya", "Guarding Jayadratha", [K.foe("Pandava chariot-warrior", 5, { abilities: ["strike", "heavy", "arrows"] }), K.foe("Pandava footsoldier", 4)], { art: "war_day14",
    caption: "Day fourteen",
    win: { fx: { rep: { kuru: 2 } }, text: "You hold your ground all afternoon, and the sun is still up." },
    lose: { deathText: "You fell on the fourteenth day, guarding Jayadratha." },
    flee: { text: "You fall back toward Jayadratha's hiding place." }, spare: { fx: { duty: { conscience: 1 } }, text: "You let him go." }
  });
  war("e_night", "The night battle", (S) => [K.foe(foeSide(S) + " torch-bearer", 4), K.foe(foeSide(S) + " archer", 4, { abilities: ["strike", "arrows"] })], { art: "battle_night",
    caption: "Torchlight on the field", events: (S) => [S.side === "kaurava" ? "ghatotkacha_k" : "ghatotkacha_p"],
    win: { fx: { journal: "You survived the night battle of the fourteenth day." }, text: "Dawn comes. You are still alive, and you cannot remember most of the night." },
    lose: { deathText: "You fell in the dark on the night of the fourteenth day." },
    flee: { text: "You fall back into the dark." }, spare: { fx: { duty: { conscience: 1 } }, text: "You let him go into the dark." }
  });
  war("e_dushasana", "Dushasana's men", [K.foe("Dushasana's bodyguard", 5, { abilities: ["strike", "heavy"] }), K.foe("Dushasana's bodyguard", 4)], { hard: true, art: "war_day16",
    caption: "Day sixteen",
    win: { fx: { flag: "survived_dushasana", journal: "On the sixteenth day Dushasana sent his men for you, and you survived them." }, text: "His men lie in the dust. Across the field, Bhima has found Dushasana." },
    lose: { deathText: "On the sixteenth day, Dushasana's men found you. He had not forgotten the dice hall." },
    flee: { text: "You escape them in the press of the battle." }, spare: { fx: { duty: { conscience: 1 } }, text: "You let the last of them go." }
  });
  war("e_day16", "The sixteenth day", (S) => [K.foe(foeSide(S) + " chariot-warrior", 5, { abilities: ["strike", "arrows"] }), K.foe(foeSide(S) + " spearman", 4)], { art: "war_day16",
    caption: "Day sixteen",
    win: { fx: { rep: { common: 1 } }, text: "You survive another day." },
    lose: { deathText: "You fell on the sixteenth day." },
    flee: { text: "You fall back." }, spare: { fx: { duty: { conscience: 1 } }, text: "You let him go." }
  });
  war("e_day18", "The last battle", (S) => [K.foe(foeSide(S) + " veteran", 5, { abilities: ["strike", "heavy"] }), K.foe(foeSide(S) + " chariot-warrior", 5, { abilities: ["strike", "arrows"] })], { hard: true, art: "war_day18",
    caption: "Day eighteen",
    win: { fx: { journal: "You survived the eighteenth and last day of the war." }, text: "There is no one left to fight." },
    lose: { deathText: "You fell on the eighteenth day, the last day of the war." },
    flee: { text: "You fall back, for the last time." }, spare: { fx: { duty: { conscience: 1 } }, text: "You let him go. The war is nearly over." }
  });
  war("e_raid", "Ashwatthama at the gate", [{ name: "Ashwatthama", hp: 115, atk: 12, def: 3, abilities: ["strike", "heavy"], hero: true, item: "sword" }], { hard: true, art: "scene_raid",
    caption: "Fire in the camp", allies: [], spare: false, events: ["smoke"],
    win: { fx: { rep: { pandava: 2 }, flag: "slowed_ashwatthama", journal: "You fought Ashwatthama at the gate of the burning camp, and lived." }, text: "He breaks away from you and vanishes into the smoke. You held him for long enough that some got out." },
    lose: { deathText: "You died at the gate of the Pandava camp, fighting Ashwatthama in the dark." },
    flee: { text: "You run, like everyone else." }
  });
  war("e_ash", "Standing in Ashwatthama's way", [{ name: "Ashwatthama", hp: 115, atk: 12, def: 3, abilities: ["strike", "heavy"], hero: true, item: "sword" }], { hard: true, art: "scene_raid",
    caption: "The road to the sleeping camp", allies: [], spare: false, events: ["moon"],
    win: { fx: { duty: { conscience: 3 }, flag: "fought_ashwatthama", journal: "You tried to stop Ashwatthama on the road to the sleeping camp." }, text: "He staggers, then goes around you. You could not stop him, but you slowed him down." },
    lose: { deathText: "You died on the road, trying to stop Ashwatthama from reaching the sleeping camp." },
    flee: { text: "You let him go." }
  });
})(window.K = window.K || {});
