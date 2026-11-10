/* Act V — The exile years (13-year time skip, ages 31–44). Three roads, then the incognito year. PRD §6. */
(function (K) {
  "use strict";
  // Where your spouse stands when the sides are drawn up, and what it costs to stand elsewhere.
  function spouseView(S) {
    const sp = S.spouse;
    if (!sp || S.dead.includes(sp)) return null;
    if (sp === "madhavi") return { side: "neutral", line: "Madhavi has already packed her herbs. She is going to the healers' tents, whoever wins, and she asks you to come with her." };
    if (sp === "revat") return { side: "pandava", line: "Revat has oiled the chariot axle every night for a week. \"They asked for five villages,\" Revat says. \"Drive for the ones who asked.\"" };
    if (sp === "charu") return S.court === "hastinapura"
      ? { side: "kaurava", line: "Charu says the king whose salt you eat is the king you fight for, and that is the end of it." }
      : { side: "pandava", line: "Charu says that anyone who asks for five villages and is refused should get the whole kingdom, and spits." };
    return null;
  }
  function withSpouse(S, side, fx) {
    const v = spouseView(S);
    if (v && v.side !== side) Object.assign(fx, { bond: { [S.spouse]: -1 }, memory: [S.spouse, "You chose a different side from the one I asked you to."] });
    return fx;
  }
  const forest = { exile: "forest" }, court = { exile: "court" }, own = { exile: "own" };

  K.scenes([
    {
      id: "a5_child", act: 5, age: 31, art: "origin", place: (S) => K.homePlace(S),
      title: "Vasu",
      body: (S) => [
        S.spouse ? "Your son Vasu was born two years before the dice game. He is three now, and already climbing everything." : "You took in an orphan boy, Vasu. He is three now.",
        "How will you raise him?"
      ],
      choices: [
        { id: "warrior", t: "As a warrior", fx: { set: { child: "vasu" }, setBond: { vasu: 6 }, duty: { family: 1 }, flag: "vasu_warrior", journal: "You raised Vasu to be a warrior." },
          text: "By six he can hold a wooden sword the right way round. By eight he hits back." },
        { id: "gentle", t: "To be kind first", fx: { set: { child: "vasu" }, setBond: { vasu: 7 }, duty: { family: 1, conscience: 1 }, flag: "vasu_gentle", journal: "You raised Vasu to be kind before he was brave." },
          text: "He brings home every hurt bird and stray dog in the village. When the other boys fight, he is the one who stops them." },
        { id: "craft", t: "In your own craft", fx: { set: { child: "vasu" }, setBond: { vasu: 6 }, duty: { family: 2 }, flag: "vasu_craft", journal: "You taught Vasu your own craft." },
          text: "He sits at your elbow while you work, and by ten his hands know half of what yours do. He will never need a sword to eat." }
      ],
      next: "s_exile"
    },

    // ---------- The forest road ----------
    {
      id: "a5_forest_boon", when: forest, skipTo: "a5_court_raid", travel: "You follow the Pandavas into exile, north to the hermitages.",
      act: 5, age: 33, place: "An ashram on the upper Ganga", art: "scene_ashram", plate: ["#3e8c72", "#6f8fd8"], caption: "A hermitage in the mountains",
      title: "A season at the ashram", hideLocked: true,
      body: ["You spend a season at a forest ashram. What do you ask of it?"],
      choices: [
        // With no room for another weapon (core.js K.astraRoom: two at most, years apart), the penance earns tapas instead.
        { id: "astra", t: (S) => (K.astraRoom(S) ? "Do penance for a divine weapon" : "Do a season of penance"),
          check: { attr: "wisdom", skill: "lore", dc: 8,
            pass: { fx: (S) => (K.astraRoom(S) ? { boon: "astra", astraFrom: "penance", journal: "After a season of penance you were granted the Indrastra, Indra's weapon." } : { tapas: 2, flag: "penance_blessed", journal: "You kept a season of penance at the ashram. No weapon came; something steadier did." }),
              text: (S) => (S.flags.includes("penance_blessed") ? "On the last night of the season the fire speaks, but not a mantra: you carry enough already. You come away steadier than any weapon could make you." : "On the last night of the season, a voice in the fire gives you the mantra of the Indrastra, Indra's thunder. You can call it once in any battle.") },
            fail: { fx: { attr: { wisdom: 1 } }, text: "No weapon comes. But you leave the ashram quieter and clearer than you arrived." } } },
        { id: "heal", t: "Learn from the healers", fx: { boon: "healing_hands", skill: { healing: 1 }, journal: "The ashram's healers taught you their remedies." } },
        { id: "serve", t: "Serve the sages", req: { any: [{ flag: "kind_to_sage" }, { rep: ["sages", 5] }] }, locked: "The sages do not know you yet.", fx: { boon: "foresight", rep: { sages: 1 }, journal: "An old sage blessed you with foresight." },
          text: "On the last day the oldest sage touches your forehead. \"You were kind to one of us once, on a dusty road.\"" },
        { id: "hunt", t: "Hunt for the camp", fx: { skill: { archery: 1 }, rep: { pandava: 1 }, bond: { bhima: 1 } } }
      ],
      next: "a5_jayadratha"
    },
    {
      id: "a5_jayadratha", when: forest, skipTo: "a5_court_raid",
      act: 5, age: 35, canon: true, place: "The Kamyaka forest", travel: "The Pandavas' camp moves to the Kamyaka forest, and you move with it.", art: "scene_jayadratha", plate: ["#3e8c72", "#c0472f"], caption: "An empty hermitage",
      title: "Jayadratha",
      witness: ["King Jayadratha finds Draupadi alone at the hermitage and carries her off in his chariot."],
      body: ["You hear her shout first."],
      choices: [
        { id: "chase", t: "Go after the chariot", combat: "e_jayadratha" },
        { id: "run", t: "Run to find Bhima and Arjuna", fx: { bond: { bhima: 1 }, rep: { pandava: 1 } }, text: "You find them by the river and point the way. Bhima is already running before you finish." },
        { id: "guard", t: "Guard the hermitage", fx: { rep: { sages: 1 } } }
      ],
      after: ["The Pandavas let Jayadratha go, and he wins a boon: one day to hold back every Pandava but Arjuna."],
      next: "a5_yaksha"
    },
    {
      id: "a5_yaksha", when: forest, skipTo: "a5_court_raid",
      act: 5, age: 42, canon: true, place: "A lake in the forest", to: "dvaita", travel: "The camp moves on to the Dvaita forest. The dry season comes.", art: "scene_lake", plate: ["#6f8fd8", "#16131f"], caption: "A still lake in the heat",
      title: "The lake of questions",
      witness: [
        "Four brothers drink from the lake without answering the voice, and fall as if dead."
      ],
      body: ["You are as thirsty as they were."],
      choices: [
        { id: "drink", t: "Drink", fx: { attr: { might: -1 } }, text: "Darkness, and then you are lying on the bank in the evening, alive, with a strange heaviness in your limbs that never quite leaves." },
        Object.assign(K.testChoice("a5_yaksha", "answer", K.YAKSHA), { noAfter: false })
      ],
      after: ["The voice was Dharma himself, and he gives back Yudhishthira's brothers."],
      next: "a5_yaksha_again"
    },
    {
      id: "a5_yaksha_again", when: K.retryWhen("a5_yaksha", ["answer"]), skipTo: "a5_charu",
      act: 5, age: 42, place: "A lake in the forest", to: "dvaita", art: "stage_forest_lake", caption: "The voice waits",
      title: "The voice waits", body: ["The voice is still waiting. There will not be a third time."],
      choices: [
        Object.assign(K.retryChoice("a5_yaksha", "answer", K.YAKSHA), { trial: Object.assign({}, K.YAKSHA.trial, { stakes: K.YAKSHA.retryStakes, rounds: K.YAKSHA_AGAIN }) }),
        { id: "drink", t: "Drink", fx: { attr: { might: -1 } }, text: "Darkness, and then you are lying on the bank in the evening, alive, with a strange heaviness in your limbs that never quite leaves." }
      ],
      next: "a5_charu"
    },

    // ---------- The court road ----------
    {
      id: "a5_court_raid", when: court, skipTo: "a5_own_life",
      act: 5, age: 33, canon: true, place: "The edge of the Dvaita forest", travel: "Duryodhana rides out to the Dvaita forest to count his cattle, and to gloat. The court goes with him.", art: "scene_cattle", plate: ["#d4a84b", "#3e8c72"], caption: "Royal tents near the forest",
      title: "The cattle count",
      witness: ["Duryodhana rides out to gloat over the exiled Pandavas. Gandharvas ambush his camp, and Karna's line breaks."],
      body: ["Duryodhana is being dragged off in chains."],
      choices: [
        { id: "fight", t: "Fight the Gandharvas", combat: "e_gandharva" },
        { id: "pandavas", t: "Run to the Pandavas for help", fx: { rep: { pandava: 1 }, bond: { yudhishthira: 1, duryodhana: -1 } }, text: "Yudhishthira hears you out and sends Arjuna and Bhima at once. \"He is still our cousin,\" he says." },
        { id: "flee", t: "Get out", tags: ["retreat"], fx: { duty: { court: -1 } } }
      ],
      after: ["Arjuna and Bhima free Duryodhana on Yudhishthira's orders."],
      next: "a5_vikarna"
    },
    {
      id: "a5_court_armour", when: court, skipTo: "a5_own_life",
      act: 5, age: 38, canon: true, place: "The river at dawn", to: "hastinapura", art: "scene_armour", plate: ["#e5872e", "#6f8fd8"], caption: "Karna at his morning prayers",
      title: "Karna's armour",
      witness: ["An old brahmin, said to be Indra in disguise, asks Karna for the armour he was born with."],
      body: (S) => [S.bonds.karna >= 6 ? { memory: "You have known Karna for most of your life. You know he already knows." } : null],
      choices: [
        { id: "warn", t: "Warn Karna it is a trick", fx: { bond: { karna: 2 }, memory: ["karna", "You tried to save his armour."] },
          text: "Karna knows who the brahmin is and cuts the armour from his body anyway. In return he gets a spear that can kill anyone, once." },
        { id: "watch", t: "Watch in silence", fx: {} },
        // With no room for another weapon (core.js K.astraRoom), the teacher gives the mantra's discipline instead: regard and tapas.
        { id: "astra", t: (S) => (K.astraRoom(S) ? "Ask {teacher} for the promised weapon" : "Ask {teacher} for the mantra's discipline"), req: { teacher: ["drona", "kripa"], duty: ["teacher", 5] },
          locked: "Your teacher must think you have earned it.",
          fx: (S) => (K.astraRoom(S) ? { boon: "astra", astraFrom: "teacher", duty: { teacher: 1 }, journal: "{teacher} taught you to call the Indrastra, Indra's weapon." } : { duty: { teacher: 1 }, tapas: 1, journal: "{teacher} gave you no weapon, and taught you the discipline of the mantra instead." }),
          text: (S) => (S.astra && S.astra.from === S.teacher && S.astra.age === S.age && S.boons.includes("astra") ? "{teacher} weighs you up in silence, then teaches you the mantra of the Indrastra in a whisper. \"Never against someone who cannot fight back,\" he says."
            : "{teacher} looks at the weapons you already carry. \"Enough. Learn to hold what you have.\" He teaches you instead how to keep a mantra still in you until the hour it is needed.") }
      ],
      next: "a5_charu"
    },

    // ---------- Your own road ----------
    {
      id: "a5_own_life", when: own, skipTo: "a5_charu",
      act: 5, age: 33, art: "origin", place: (S) => K.homePlace(S),
      title: "A life of your own",
      body: (S) => [
        "Far from the courts, the years are your own.",
        S.flags.includes("debt_refused") ? { memory: "Sudatta the moneylender has been patient. Now his men have fenced off your family's field." } : null,
        "How do you make your living?"
      ],
      choices: [
        { id: "trade", t: "Trade along the rivers", fx: { skill: { statecraft: 1 }, attr: { command: 1 } },
          text: "Three seasons on the river boats, salt down and cloth up. You learn to read a merchant's face faster than his scales." },
        { id: "heal", t: "Open a healer's house", fx: { skill: { healing: 2 }, rep: { common: 1 } },
          text: "Within a year there is a line at your door every morning, and people from three villages away know your name." },
        { id: "teach", t: "Teach the village children to fight", fx: { skill: { [ "mace" ]: 1 }, attr: { might: 1 }, rep: { common: 1 } },
          text: "Every dawn a line of children with sticks waits in the square. When raiders come through the next winter, the village is ready for them." },
        { id: "sudatta", t: "Take your field back from Sudatta", req: { flag: "debt_refused" }, combat: "e_sudatta" }
      ],
      next: "a5_forge"
    },
    {
      id: "a5_own_crisis", when: own, skipTo: "a5_charu",
      act: 5, age: 38, art: "origin", place: (S) => K.homePlace(S),
      title: "The fever year",
      body: ["A fever comes up the river. Half the village is sick, and the granary is low."],
      choices: [
        { id: "tend", t: "Tend the sick yourself",
          check: { attr: "wisdom", skill: "healing", dc: 8,
            pass: { fx: { rep: { common: 3 }, duty: { conscience: 1 }, journal: "You nursed your village through the fever year." }, text: "You lose eleven people. Without you it would have been many more." },
            fail: { fx: { rep: { common: 1 } }, text: "You do everything you can. The fever takes its own count." } } },
        { id: "grain", t: "Ride for grain", fx: { skill: { chariot: 1 }, rep: { common: 2 } } },
        { id: "mauni", t: "Find Mauni in the forest", req: { teacher: "hermit", noFlag: "betrayed_hermit" }, locked: "",
          // The mantra only when there is room for another weapon (core.js K.astraRoom); the medicine always.
          fx: (S) => (K.astraRoom(S) ? { boon: "astra", astraFrom: "mauni", rep: { common: 1 }, journal: "Mauni gave you medicine for the village, and the Indrastra for what was coming." } : { rep: { common: 1 }, tapas: 1, journal: "Mauni gave you medicine for the village." }),
          text: (S) => (S.astra && S.astra.from === "mauni" && S.boons.includes("astra") ? "Mauni gives you roots for the fever and, before you leave, the mantra of the Indrastra. \"You kept my secret. Keep this one too.\"" : "Mauni gives you roots for the fever. \"You kept my secret,\" he says, and goes back into the trees.") }
      ],
      next: "a5_charu"
    },

    // ---------- A bond that asks something of you ----------
    {
      id: "a5_charu", when: (S) => (S.friend === "charu" || S.spouse === "charu") && !S.dead.includes("charu"), skipTo: "s_late",
      act: 5, art: "scene_smith", place: (S) => K.homePlace(S), caption: "A forge at dawn",
      title: "The old smith",
      body: (S) => [
        "Word comes from home: Charu's father, old Kesava, is dying.",
        S.spouse === "charu" ? "Charu is already packing, and does not ask whether you will come. Charu never asks." : "Charu has not sent for you."
      ],
      choices: [
        { id: "go", t: "Go home to Charu", fx: { bond: { charu: 2 }, duty: { family: 1 }, flag: "sat_with_kesava", memory: ["charu", "You came home when my father was dying."] },
          text: "On his last morning old Kesava puts his hammer in your hands without a word. Charu holds the lamp." },
        { id: "send", t: "Send word you cannot come", fx: { bond: { charu: -2 }, memory: ["charu", "You did not come when my father died."] },
          text: "Charu's answer comes back with the same boy, one line long. \"I know.\"" }
      ],
      next: "s_late"
    },

    // ---------- Everyone: the incognito year ----------
    {
      id: "a5_matsya", act: 5, age: 43, canon: true, art: "scene_virata", place: "King Virata's court, Matsya", travel: "In the thirteenth year, the road leads to King Virata's court in Matsya.", caption: "The lake country of Matsya",
      title: "The hidden year",
      witness: [
        "The Kauravas raid King Virata's cattle, hoping to flush out the hidden Pandavas. Arjuna hides there as Brihannala, a dance teacher."
      ],
      // Where you are when the raid comes depends on the road you took (K.raidGroup): the Pandavas'
      // people are in Matsya, the Kuru court is called to ride, and everyone else hears it from afar.
      body: (S) => {
        const g = K.raidGroup(S);
        if (g === "matsya") return [S.origin === "matsya" ? { memory: "This is your home. Those are your neighbours' herds." } : "You are in Matsya when the raid comes. You have been here most of the year, quietly, near the people you followed into exile."];
        if (g === "kuru") return ["Duryodhana calls every sword at court to ride on Matsya, to draw the hidden Pandavas out.",
          S.origin === "matsya" ? { memory: "Matsya is your homeland. Those are your neighbours' herds." } : null];
        return ["You hear of the raid late. The same week brings trouble here too."];
      },
      choices: [
        { id: "defend", t: "Ride out with Prince Uttara", req: (S) => K.raidGroup(S) === "matsya", combat: "e_cattle" },
        { id: "raid", t: "Ride with Duryodhana against Matsya", req: (S) => K.raidGroup(S) === "kuru", combat: "e_cattle_k" },
        { id: "refuse", t: "Refuse to ride", req: (S) => K.raidGroup(S) === "kuru",
          fx: { rep: { kuru: -2 }, bond: { duryodhana: -2 }, duty: { court: -2, conscience: 2 }, flag: ["refused_raid", "imprisoned"], memory: ["duryodhana", "You refused to ride with him against Matsya."], journal: "You refused to ride against Matsya. Duryodhana had you thrown in the prison yard." },
          text: "Duryodhana smiles. \"Then you can wait for us here,\" he says, and his guards are already moving." },
        { id: "secret", t: "Recognise Brihannala, and keep quiet", req: (S) => K.raidGroup(S) === "matsya",
          check: { attr: "wisdom", skill: "stealth", dc: 8,
            pass: { fx: { bond: { arjuna: 2 }, flag: "kept_arjuna_secret", journal: "You recognised Arjuna in Matsya and kept his secret." }, text: "You know that walk, even in bangles. Arjuna puts a finger to his lips, and you say nothing." },
            fail: { fx: {}, text: "Brihannala is just a dance teacher to you. Later you will feel a fool." } } },
        { id: "home", t: "Stay home", req: (S) => K.raidGroup(S) === "local" },
        { id: "stay", t: "Stay out of it", req: (S) => K.raidGroup(S) === "matsya" }
      ],
      after: ["Brihannala is Arjuna, and he drives the whole Kaurava force home alone."],
      next: "a5_herd"
    },
    {
      id: "a5_karna_secret", when: { any: [{ flag: "left_arena" }, { bond: ["karna", 7] }] }, skipTo: "a5_side",
      act: 5, age: 44, canon: true, place: "The river at dusk", to: "hastinapura", art: "scene_birth", plate: ["#e5872e", "#16131f"], caption: "The river where a basket once floated",
      title: "The secret of Karna's birth",
      witness: [
        "Krishna tells Karna the truth: he is Kunti's firstborn, the eldest Pandava. Karna will not leave Duryodhana."
      ],
      body: (S) => [
        S.flags.includes("left_arena") ? { memory: "You have known about the basket on the river since you were seventeen. Karna never knew you knew." } : { memory: "Karna tells you all of it that night. He has not told anyone else." }
      ],
      choices: [
        { id: "tell", t: "Tell him it changes nothing", req: { flag: "left_arena" }, fx: { bond: { karna: 2 }, memory: ["karna", "You knew who he was all along, and stayed his friend."] },
          text: "Karna laughs, for the first time in weeks. \"Then you are the only one in the world who has not changed their mind about me today.\"" },
        { id: "urge", t: "Urge him to take the crown", fx: { bond: { karna: -1 }, duty: { conscience: 1 } }, text: "\"And be remembered as the man who betrayed his only friend for a throne?\" he says. \"No.\"" },
        { id: "stand", t: "Stand with him, whatever he decides", fx: { bond: { karna: 2 }, flag: "pledged_to_karna" } }
      ],
      after: ["Kunti asks Karna herself, and he promises to kill no Pandava except Arjuna."],
      next: "a5_side"
    },
    {
      id: "a5_side", act: 5, age: 44, canon: true, art: "scene_envoy", place: "Hastinapura", travel: "Krishna comes to Hastinapura as the Pandavas' envoy, and the whole kingdom gathers to hear him.", caption: "Thirteen years, gone",
      title: "Not a needle's point",
      witness: [
        "Duryodhana refuses even five villages. Both sides gather at Kurukshetra."
      ],
      body: (S) => [
        S.teacher === "balarama" ? { memory: "Balarama has gone on pilgrimage rather than fight. He asked you to do the same." } : null,
        S.child === "vasu" && !S.dead.includes("vasu") ? "Vasu is sixteen. He will follow wherever you go." : null,
        spouseView(S) ? { memory: spouseView(S).line } : null,
        "Which side are you on?"
      ],
      choices: [
        { id: "pandava", t: "Fight for the Pandavas", fx: (S) => withSpouse(S, "pandava", { set: { side: "pandava" }, rep: { pandava: 2 }, duty: { court: S.court === "hastinapura" ? -4 : 1, teacher: S.teacher === "balarama" ? -4 : 0 }, journal: "You chose to fight for the Pandavas." }) },
        { id: "kaurava", t: "Fight for Duryodhana", fx: (S) => withSpouse(S, "kaurava", { set: { side: "kaurava" }, rep: { kuru: 2 }, duty: { court: S.court === "indraprastha" ? -4 : 1, teacher: S.teacher === "balarama" ? -4 : 0 }, journal: "You chose to fight for Duryodhana and the Kuru throne." }) },
        { id: "neither", t: "Refuse to fight; serve the healers", fx: (S) => withSpouse(S, "neutral", { set: { side: "neutral" }, rep: { sages: 2, common: 1 }, skill: { healing: 1 }, journal: "You refused to fight, and went to serve in the healers' tents." }) },
        // A secret you hold can be spent. This one cannot change the story, and the story makes sure of it.
        { id: "secret", t: "Tell Arjuna who Karna is", req: (S) => (S.flags.includes("left_arena") || S.seen.includes("a5_karna_secret")) && !S.flags.includes("tried_secret"),
          fx: { flag: "tried_secret", bond: { krishna: 1 }, memory: ["krishna", "You nearly told Arjuna the truth about Karna. Krishna asked you not to."], journal: "You set out to tell Arjuna the truth about Karna. Krishna stopped you on the road." },
          text: "Krishna is waiting on the road to Arjuna's tent. \"Not from you. Karna has already chosen; let him keep his choice.\"",
          hint: "A secret you could spend", next: "a5_side" }
      ],
      next: "a6_eve"
    }
  ]);

  K.encounter({
    id: "e_jayadratha", title: "After Jayadratha's chariot", art: "scene_jayadratha", caption: "Sindhu guards on the forest road", lethal: false,
    intro: "Two of Jayadratha's guards turn their horses to block the path.",
    enemies: [K.foe("Sindhu guard", 3), K.foe("Sindhu archer", 2, { abilities: ["strike", "arrows"] })],
    win: { fx: { rep: { pandava: 2 }, bond: { draupadi: 1, bhima: 1 }, journal: "You cut through Jayadratha's rearguard when he carried Draupadi off." }, text: "The guards break. Ahead, you can hear Bhima roaring." },
    lose: { fx: { injury: "scar" }, text: "They leave you in the dust. Bhima runs past you without stopping." }
  });
  K.encounter({
    id: "e_gandharva", title: "The Gandharva ambush", art: "scene_cattle", caption: "Forest warriors in the royal camp", lethal: false, hard: true,
    enemies: [K.foe("Gandharva warrior", 3), K.foe("Gandharva warrior", 2)],
    win: { fx: { bond: { duryodhana: 2 }, rep: { kuru: 1 } }, text: "You hold your corner of the camp, but Duryodhana has already been carried off." },
    lose: { fx: { bond: { duryodhana: 1 } }, text: "They knock you down and leave you. At least you stayed." }
  });
  K.encounter({
    id: "e_sudatta", title: "Sudatta's men", art: "battle_field", caption: "A fence across your family's field", lethal: false,
    enemies: [K.foe("A hired club-man", 2), K.foe("A hired club-man", 1)],
    win: { fx: { unflag: "debt_refused", flag: "field_reclaimed", rep: { common: 1 }, duty: { family: 1 } }, text: "Sudatta's men leave and do not come back. The village brings sweets." },
    lose: { fx: { duty: { family: -1 } }, text: "They keep the field. You keep your pride, more or less." }
  });
  K.encounter({
    id: "e_cattle", title: "The cattle raid on Matsya", art: "battle_cattle", caption: "Dust over the grazing grounds", lethal: false,
    enemies: [K.foe("Kaurava horseman", 3), K.foe("Kaurava archer", 2, { abilities: ["strike", "arrows"] })],
    win: { fx: { rep: { pandava: 2, common: 1 }, bond: { arjuna: 1 }, journal: "You fought beside Prince Uttara when the Kauravas raided Matsya." }, text: "The raiders on your flank turn back. Ahead, one chariot is driving the whole Kaurava army before it." },
    lose: { fx: {}, text: "You are unhorsed. From the ground you watch one chariot drive the whole Kaurava army before it." }
  });
  K.encounter({
    id: "e_cattle_k", title: "Raiding Matsya's herds", art: "battle_cattle", caption: "A lone chariot comes for you", lethal: false, hard: true,
    intro: "Matsya's cowherds fight harder than anyone expected. Then the arrows start coming from a single chariot.",
    enemies: [K.foe("Matsya cowherd", 2), { name: "Brihannala's chariot", hp: 140, atk: 12, def: 4, abilities: ["strike", "arrows"] }],
    win: { fx: { rep: { kuru: 1 } }, text: "Somehow you hold. Around you the rest of the army is running." },
    lose: { fx: { rep: { kuru: 1 }, journal: "At Matsya you were routed, with the whole Kaurava army, by a single chariot." }, text: "Like everyone else, you wake up in the grass, unhurt and stripped of your upper cloth, while the chariot drives away with the herds." }
  });
})(window.K = window.K || {});
