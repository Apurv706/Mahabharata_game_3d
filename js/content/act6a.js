/* Act VI — The war, part 1: the eve of battle to the thirteenth day. PRD §10.
   The Bhagavad Gita is witnessed from a distance, never played (PRD §12.1). Death is a full ending. */
(function (K) {
  "use strict";
  const fighting = { side: ["pandava", "kaurava"] };
  const vasuNear = (S) => S.child === "vasu" && !S.dead.includes("vasu") && S.flags.includes("vasu_with_you");
  K.warAllies = (S) => {
    const a = [S.flags.includes("role_command") && !S.flags.includes("company_broken") ? "company" : "soldiers"]; // a company broken in a holding fight is gone (content/command.js)
    if (vasuNear(S)) a.push("vasu");
    if (S.spouse === "revat" && !S.dead.includes("revat")) a.push("revat");
    if (S.friend === "charu" && !S.dead.includes("charu") && S.side !== "neutral") a.push("charu");
    if (K.ugraAlly(S)) a.push("ugra"); // shaming him outweighs a fair bout
    if (S.calledAcross && !S.dead.includes(S.calledAcross) && K.UNITS[S.calledAcross]) a.push(S.calledAcross); // called across the field on the first morning (war_crossing.js)
    return a;
  };
  // Ugra stands beside those who beat him or lost to him fairly, and across the field from those who
  // shamed him; crossing the lines on the first morning (war_crossing.js) turns that round.
  const crossedLines = (S) => S.flags.includes("crossed_lines");
  K.ugraAlly = (S) => (S.flags.includes("beat_ugra") || S.flags.includes("lost_to_ugra")) && !S.flags.includes("shamed_ugra") && !S.dead.includes("ugra") && !crossedLines(S);
  K.ugraAcross = (S) => !S.dead.includes("ugra") && (S.side === "pandava" || S.side === "kaurava") &&
    (S.flags.includes("shamed_ugra") ? !crossedLines(S) : (S.flags.includes("beat_ugra") || S.flags.includes("lost_to_ugra")) && crossedLines(S));
  const foeSide = (S) => (S.side === "kaurava" ? "Pandava" : "Kaurava");
  // On the eve of the war, a company is not handed out: the army's commander (Bhishma for the
  // Kauravas, Dhrishtadyumna for the Pandavas) sees you set one in the day's array first.
  // A warrior does not hand his life to a driver he has not seen drive.
  const CHARIOT = { t: "Drive a warrior's chariot", req: { side: ["pandava", "kaurava"], skill: ["chariot", 2] }, locked: "You need some skill with a chariot.", game: "race", hint: "He will try you first",
    trial: { attr: "grace", skill: "chariot", kind: "war", stage: "stage_war_road", vehicle: "chariot", obstacles: ["rock", "wreck"], hull: 3, speed: 3.2,
      tally: "Distance: {d}% · Hits: {h} of {l}", bump: "A wheel catches, and the old warrior grabs the rail.", help: "Steer between the carts and the stakes: up and down, or the buttons.",
      rules: "Drive the old warrior down the road without a wheel touching anything.",
      stakes: ["He climbs down and says: tomorrow, at first light.", "He climbs down and says nothing. One more run at dawn."] },
    retryStakes: ["He climbs down and says: tomorrow, at first light.", "He finds another driver, and you take your place in the front line."],
    win: { fx: { flag: "role_chariot", skill: { chariot: 1 }, journal: "On the eve of the war an old warrior rode with you once behind the lines, and chose you as his driver." }, text: "You bring the chariot to a stop at the end of the road. \"First light,\" he says." },
    lose: { fx: {}, text: "A wheel clips a cart, and the old warrior nearly goes over the rail. He climbs down without a word." },
    retryLose: { penalty: 1, fx: { flag: ["role_front", "driver_refused"], journal: "On the eve of the war you were not chosen as a driver. You fought in the front line." }, text: "He finds another driver before the conches sound. You take a spear and find a place in the front line." } };
  const COMMAND = { t: "Command a company", req: { side: ["pandava", "kaurava"], any: [{ path: "strategist" }, { attr: ["command", 4] }] },
    locked: "Needs a strategist or a commander", game: "formation", hint: "A test first",
    trial: { attr: "command", skill: "statecraft", stage: "stage_muster_field_top", cast: (S) => [S.side === "kaurava" ? "bhishma" : "dhrishtadyumna"],
      rules: (S) => (S.side === "kaurava"
        ? "Bhishma names an array and shows it to you once. Then your company comes onto the field, unit by unit: put each on its mark before the drum stops. Then the enemy tests a flank, and you send the reserve. He has just refused Karna a place under him. He will not be kinder to you."
        : "Dhrishtadyumna names an array and shows it to you once. Then your company comes onto the field, unit by unit: put each on its mark before the drum stops. Then the enemy tests a flank, and you send the reserve."),
      stakes: ["A company of your own, under your banner.", "The company goes to someone else. One more chance at dawn."] },
    retryStakes: ["A company of your own, under your banner.", "The company goes to someone else, and you take your place in the front line."],
    win: { fx: { flag: "role_command", attr: { command: 1 }, journal: "On the eve of the war you set your company in the commander's array, and he gave it to you." },
      text: (S) => (S.side === "kaurava" ? "Bhishma watches the last unit find its mark. \"Take them. Bring back as many as you can.\"" : "Dhrishtadyumna watches the last unit find its mark. \"They are yours. Keep them alive.\"") },
    lose: { fx: {}, text: "The commander watches your company stumble into place, says nothing, and turns his horse away." },
    retryLose: { penalty: 1, fx: { flag: ["role_front", "command_refused"], journal: "On the eve of the war the commander gave your company to someone else. You fought in the front line." },
      text: "The company goes to another officer. You take a spear and a place in the front line, with everyone else." } };

  K.scenes([
    {
      id: "a6_eve", act: 6, age: 44, canon: true, war: true, art: "war_eve", place: "Kurukshetra, before the first day", caption: "Two armies facing each other",
      travel: (S) => (S.side === "neutral" ? "The healers go to Kurukshetra, and you go with them." : "You march to Kurukshetra with the army."),
      title: "Before the first arrow",
      witness: [
        "At Kurukshetra, Arjuna lays down his bow, and Krishna talks with him until he takes it up again."
      ],
      enter: { unflag: "imprisoned" },
      body: (S) => [
        S.flags.includes("refused_raid") ? { memory: S.flags.includes("escaped_prison") ? "Duryodhana's men are still looking for the prisoner who went over the wall. Some of them are standing in the same army as you." : "They let you out of the prison yard the day the armies marched. Duryodhana passed you on the road and did not look at you. He has not forgotten Matsya." } : null,
        S.flags.includes("turned_herd") ? { memory: "Prince Uttara rides past and raises a hand to you. He has not forgotten the ford." } : null,
        S.flags.includes("strung_great_bow") ? { memory: "Across the field, the Panchala archers know your face. You strung their king's bow, once." } : null,
        S.side === "neutral" ? "The healers' tents stand behind both armies. You will see everything from there." : "You are forty-four. Where do you stand?"],
      choices: [
        { id: "front", t: "In the front line", req: fighting, fx: { flag: "role_front", duty: { court: 1 } } },
        K.testChoice("a6_eve", "chariot", CHARIOT),
        K.testChoice("a6_eve", "command", COMMAND),
        { id: "healer", t: "In the healers' tents", fx: { flag: "role_healer", skill: { healing: 1 } } },
        { id: "bard", t: "Singing to the troops", req: { path: "bard" }, fx: { flag: "role_bard", skill: { lore: 1 } } }
      ],
      next: "a6_eve_again"
    },
    {
      // The commander gives a second chance at dawn; fail it and you take your place in the line.
      id: "a6_eve_again", when: K.retryWhen("a6_eve", ["command", "chariot"]), skipTo: "a6_vasu",
      act: 6, age: 44, war: true, art: "war_eve", place: "Kurukshetra, before the first day", caption: "Dawn, before the conches",
      title: "Once more, at dawn",
      body: (S) => [S.flags.includes("a6_eve_chariot_again") ? "The old warrior has not found another driver yet. He will ride with you once more before he decides." : S.side === "kaurava" ? "Bhishma will watch you set your company once more." : "Dhrishtadyumna will watch you set your company once more."],
      choices: [K.retryChoice("a6_eve", "command", COMMAND), K.retryChoice("a6_eve", "chariot", CHARIOT), { id: "let", t: "Take your place in the line", fx: { flag: "role_front", duty: { court: 1 } }, text: "You find a place in the front line, among people who do not know your name yet." }],
      next: "a6_vasu"
    },
    {
      // The last test inside the wheel cannot be won: it measures how long you hold the ring open.
      id: "a6_ring_closes", act: 6, age: 44, canon: true, war: true, art: "stage_chakravyuha_top", place: "Inside the Chakravyuha", caption: "The ring closing",
      title: "The ring closes",
      body: ["Abhimanyu fights on with a chariot wheel, and you are at his back.", "Hold a way open for the Pandavas as long as you can."],
      choices: [{ id: "hold", t: "Hold the ring open", game: "rings", hint: "No one has ever held it",
        trial: { attr: "command", skill: "chariot", kind: "war", mode: "last", stage: "stage_chakravyuha_top", cast: ["abhimanyu"],
          rules: "The Kaurava chariots push the rings out of line. Turn them back, as long as you can.",
          stakes: ["There is no winning this. Hold as long as you can.", "There is no winning this. Hold as long as you can."] },
        win: { fx: { flag: "held_ring_open" } }, close: { fx: { flag: "held_ring_open" } }, lose: { fx: { flag: "held_ring_open" } } }],
      after: ["The ring closes on Abhimanyu, and that night Arjuna swears to kill Jayadratha by sunset or walk into fire."],
      next: "a6_fall_in_wheel"
    },
    {
      id: "a6_fall_in_wheel", act: 6, age: 44, canon: true, war: true, art: "end_wheel", place: "Inside the Chakravyuha", caption: "The ring of chariots at sunset",
      title: "Into the wheel",
      body: (S) => [S.flags.includes("held_ring_open") && S.heldRing ? ["You held the ring open for {n} heartbeats. It was not enough. It was never going to be enough.", { n: S.heldRing }] : "You held the ring open as long as anyone could. It was not enough. It was never going to be enough."],
      choices: [{ id: "fall", t: (S) => (S.storyMode ? "Hold on to the last" : "Fall beside him"),
        fx: (S) => (S.storyMode ? { injury: "scar", flag: "dragged_from_wheel", journal: "You fell in the heart of the wheel beside Abhimanyu, and woke in the healers' tents. Someone had dragged you out." }
          : { die: true, flag: "died_with_abhimanyu", deathText: "{They} fell beside Abhimanyu in the heart of the wheel, on the thirteenth day, holding the ring open to the last." }),
        text: (S) => (S.storyMode ? "Something strikes you from behind. You wake in the healers' tents, and no one will say who dragged you out."
          : S.boons.includes("astra") ? "The Indrastra is spent, and its light is gone. There is only the boy at your back, and the wheel in his hands, and then nothing."
          : "There is only the boy at your back, and the wheel in his hands, and then nothing.") }],
      next: "a6_day14"
    },
    {
      // Kaurava side: you held your stretch of the ring against the boy. Then the order comes down.
      id: "a6_d13_bow", act: 6, age: 44, canon: true, war: true, art: "scene_day13", place: "Kurukshetra · day 13", caption: "Drona's order",
      title: "Drona's order",
      body: ["Drona gives the order: \"Cut his bow from behind. Kill his horses. Then he is only a boy.\"", "It reaches you."],
      choices: (S) => { const all = [
        { id: "obey", t: "Do as Drona says", tags: ["strike_unarmed"], fx: { duty: { court: 2, conscience: -4 }, flag: "cut_abhimanyu_bow", memory: ["all", "You were one of those who cut Abhimanyu's bow from behind."], journal: "On the thirteenth day you obeyed Drona and helped cut Abhimanyu's bow from behind." },
          text: "Karna's arrow cuts the bowstring; yours finds a horse. Abhimanyu turns, and sees you." },
        { id: "refuse", t: "Refuse, out loud", fx: { duty: { conscience: 3, court: -3 }, rep: { kuru: -2 }, flag: "refused_bow_order", journal: "On the thirteenth day you refused Drona's order to cut Abhimanyu's bow from behind." },
          text: "\"Not from behind,\" you say. Drona does not look at you, and someone else does it." },
        { id: "miss", t: "Draw, and miss on purpose", fx: { duty: { conscience: 1 }, flag: "missed_on_purpose", journal: "On the thirteenth day you were ordered to shoot Abhimanyu's horses, and missed on purpose." },
          text: "Your arrow goes wide, and no one notices but you. You still think about it when you are old." }
      ];
        const did = ["obey", "refuse", "miss"].find((k) => S.flags.includes("bow3d_" + k)); // (answered in the 3D fight already)
        return did ? [Object.assign({}, all.find((c) => c.id === did), { t: { obey: "You did as Drona said", refuse: "You refused, out loud", miss: "You drew, and did not strike" }[did] })] : all; },
      after: ["Abhimanyu falls, and that night Arjuna swears to kill Jayadratha by sunset or walk into fire."],
      next: "a6_day14"
    },
    {
      id: "a6_vasu", when: { child: "vasu", alive: "vasu" }, skipTo: "a6_day1",
      act: 6, age: 44, war: true, place: "Your tent, the night before", art: "scene_vasu", plate: ["#5c3361", "#16131f"], caption: "A lamp in a tent",
      title: "Vasu asks to ride with you",
      body: (S) => [
        "Vasu is sixteen, with a borrowed shield. He wants to be beside you.",
        S.flags.includes("vasu_gentle") ? { memory: "You raised him to be kind before he was brave. He is trying very hard to be both." } : null
      ],
      choices: [
        { id: "with", t: "Keep him beside you", req: fighting, fx: { flag: "vasu_with_you", bond: { vasu: 1 } } },
        { id: "camp", t: "Order him to stay in camp", fx: { flag: "vasu_in_camp", bond: { vasu: -1 }, duty: { family: 1 } }, text: "He argues, then obeys. The camp is behind the lines and should be safe." },
        { id: "away", t: "Let him join another company", req: fighting, fx: { flag: "vasu_away", attr: { wisdom: 1 } } }
      ],
      next: "a6_day1"
    },
    {
      id: "a6_day1", act: 6, age: 44, canon: true, war: true, art: "war_bhishma", place: "Kurukshetra · days 1 to 9", caption: "Bhishma commands the Kaurava host",
      title: "Nine days of Bhishma",
      witness: ["For nine days Bhishma commands the Kauravas, and no one can stand against him."],
      body: (S) => [
        S.side === "pandava" ? "On the first day Prince Uttara falls." : S.side === "kaurava" ? "On your side, the old man fights like a storm." : "The first wounded reach the tents before noon. By evening there is nowhere left to lay them.",
        S.side !== "neutral" && S.flags.includes("beat_ugra") && K.ugraAlly(S) ? { memory: "In the line beside you stands a big man with a miller's shoulders. Ugra, the miller's son from the spring fair. \"You put me on my back once,\" he says. \"I have waited thirty years to stand next to you instead.\"" } : null,
        S.side !== "neutral" && S.flags.includes("lost_to_ugra") && K.ugraAlly(S) ? { memory: "In the line beside you stands a big man with a miller's shoulders. Ugra, the miller's son from the spring fair. \"You were the only one who ever stood up to me,\" he says. \"You lost. You still stood up. I am with you.\"" } : null,
        S.side !== "neutral" && S.flags.includes("shamed_ugra") && K.ugraAcross(S) ? { memory: "Across the field, under the enemy's banners, there is a big man with a miller's shoulders. Ugra, the miller's son from the spring fair, never forgave the crowd for laughing, or you for making them." } : null,
        // A risk that went wrong long ago comes back: someone else is wearing your heirloom.
        S.heirloomLost && S.heirloomLost.at === "bandits" ? { memory: "Among the levies brought in from the villages, you see a thin man with a farmer's hands, wearing your {heirloom!}. He sees you see it, and looks away." } : null,
        S.heirloomLost && S.heirloomLost.at === "outriders" ? { memory: "A Kaurava captain rides along the line with your {heirloom!} hanging from his belt. He has worn it for twenty-six years. He has no idea whose it was." } : null
      ],
      choices: [
        { id: "fight", t: "Fight in the line", req: fighting, combat: "e_day1" },
        { id: "supply", t: "Guard the supply lines", req: fighting, fx: { duty: { court: 1 }, rep: { common: 1 } } },
        { id: "tend", t: "Work in the healers' tents",
          check: { attr: "wisdom", skill: "healing", dc: 8,
            pass: { fx: { rep: { common: 2, sages: 1 }, skill: { healing: 1 }, journal: "In the first nine days of the war you saved more lives than you could count." }, text: "You stop counting the ones you save. You never stop counting the ones you lose." },
            fail: { fx: { rep: { common: 1 } }, text: "There are too many of them, and too few of you." } } }
      ],
      next: "a6_bhishma"
    },
    {
      id: "a6_bhishma", act: 6, age: 44, canon: true, war: true, place: "Kurukshetra · day 10", art: "scene_arrows", plate: ["#d4a84b", "#2a1c1f"], caption: "A bed of arrows at dusk",
      title: "The bed of arrows",
      witness: [
        "Arjuna's arrows bring Bhishma down onto a bed of arrows, where he waits for his chosen hour."
      ],
      body: ["That night both armies come to see him."],
      choices: [
        { id: "duty", t: "Ask him how to know your duty", fx: { attr: { wisdom: 1 }, bond: { bhishma: 1 }, journal: "On the bed of arrows, Bhishma told you that duty is subtle, and that keeping your word can still lead you into wrong." },
          text: "\"With difficulty,\" he says, and almost smiles. \"I kept my word all my life, and look where it has brought us.\"" },
        { id: "vows", t: "Ask him about your vows", req: (S) => S.vows.length > 0, fx: { duty: { conscience: 1 }, bond: { bhishma: 1 } },
          text: "\"A vow is a promise to the person you will become,\" he says. \"Be careful what you promise them.\"" },
        { id: "water", t: "Bring him water", fx: { bond: { bhishma: 1 }, rep: { sages: 1 } }, text: "He thanks you, but he does not drink. Later Arjuna shoots an arrow into the earth, and a spring of clear water rises to the old man's lips." },
        { id: "away", t: "Stay away", fx: {} }
      ],
      next: "a6_capture"
    },
    {
      id: "a6_capture", act: 6, age: 44, canon: true, war: true, art: "war_capture", place: "Kurukshetra · days 11 and 12", caption: "Drona takes command",
      title: "Take the king alive",
      witness: ["Drona, now commander, tries for two days to take Yudhishthira alive. He fails."],
      body: (S) => [S.side === "pandava" ? "Your company is posted beside the king's chariot." : S.side === "kaurava" ? "Your company is sent to break through to the king's chariot." : "Both days, the fighting is thickest around one chariot. The wounded come from there."],
      choices: [
        { id: "guard", t: "Guard Yudhishthira's chariot", req: { side: "pandava" }, combat: "e_guard" },
        { id: "hunt", t: "Drive for Yudhishthira's chariot", req: { side: "kaurava" }, combat: "e_hunt" },
        { id: "carry", t: "Carry the wounded off the field",
          peril: (S) => ({ kind: "prison", by: S.side === "kaurava" ? "Pandava soldiers" : "Kaurava soldiers", place: "A prisoners' pen behind the enemy's lines", waitThen: "a7_field",
            text: "On the fourth trip a horse goes down on top of you. When you wake, the enemy's camp guards are binding your hands.",
            journal: "Carrying the wounded under fire, you were taken by the enemy." }),
          check: { attr: "grace", skill: "chariot", dc: 8,
            pass: { fx: { rep: { common: 2 }, duty: { conscience: 1 }, journal: "You carried the wounded off the field on the eleventh and twelfth days." }, text: "Seven trips into the dust and back. Seven people who will see their families again." },
            fail: { fx: { injury: "leg" }, text: "On the fourth trip a horse goes down on top of you." } } }
      ],
      next: "a6_wheel"
    },
    {
      id: "a6_day13", act: 6, age: 44, canon: true, war: true, art: "scene_day13", place: "Kurukshetra · day 13", caption: "The wheel formation",
      title: "The wheel formation",
      lamp: (S) => (S.side === "kaurava" ? { secs: 30, silent: "ring", note: "The ring is closing. If the lamp burns out, you will hold your place in it." }
        : S.side === "pandava" ? { secs: 30, silent: "gate", note: "The breach will not stay open. If the lamp burns out, you will be at the gate with the others." } : null),
      witness: (S) => S.side === "kaurava" ? [
        "Drona sets the Chakravyuha while Arjuna is lured away.",
        "Arjuna's son Abhimanyu, sixteen, has broken in alone. The order comes: close in around him."
      ] : [
        "With Arjuna lured away, only his son Abhimanyu knows the way into Drona's wheel, not the way out.",
        "He breaks in. At the breach, Jayadratha holds back everyone who follows."
      ],
      body: (S) => [
        S.side === "pandava" && S.flags.includes("stood_with_karna") ? { memory: "Inside the wheel you glimpse Karna's banner. You remember the arena, and who stood where." } : null,
        S.side === "kaurava" && S.bonds.karna >= 6 ? { memory: "Karna is in the ring. He does not look at you." } : null,
        S.side === "kaurava" && S.flags.includes("stood_with_princes") ? { memory: "You think of Arjuna, whose side you once stood at, and whose son this is." } : null,
        vasuNear(S) ? "Vasu is in the chariot behind yours. He is the same age as Abhimanyu." : null,
        S.flags.includes("role_command") ? (S.side === "kaurava" ? "Your company holds a stretch of the ring. Whatever you do, they will do." : "Your company is behind you, waiting for your word. Whatever you do, they will follow.") : null
      ],
      choices: [
        { id: "ride_in", t: "Follow Abhimanyu in", req: { side: "pandava" }, combat: "e_wheel", noAfter: true, hint: "No way back" },
        { id: "gate", t: "Force the gate", req: { side: "pandava" }, combat: "e_gate" },
        { id: "pull_vasu", t: "Pull back to get Vasu out", req: (S) => S.side === "pandava" && vasuNear(S), tags: ["retreat"],
          fx: { duty: { family: 3 }, bond: { vasu: 3 }, flag: "saved_vasu_d13", journal: "On the thirteenth day you pulled back to save your son." } },
        { id: "ring", t: "Hold the ring as ordered", req: { side: "kaurava" }, combat: "e_ring", noAfter: true, hint: "He has killed everyone in his way",
          fx: { duty: { court: 2 }, flag: "held_the_ring", memory: ["all", "You were part of the ring that closed on the boy."], journal: "On the thirteenth day you held your place in the ring that closed on Abhimanyu." } },
        { id: "refuse", t: "Refuse to close in", req: { side: "kaurava" },
          fx: { duty: { conscience: 3, court: -3 }, rep: { kuru: -2 }, flag: "refused_ring", memory: ["all", "You lowered your bow and would not close in."], journal: "On the thirteenth day you lowered your bow and would not close in on Abhimanyu." } },
        { id: "carry", t: "Carry a wounded boy out", req: { side: "kaurava" }, tags: ["retreat"], fx: { duty: { family: 1, court: -1, conscience: 1 }, flag: "carried_wounded" } },
        { id: "tend", t: "Work the tents", req: { side: "neutral" }, fx: { rep: { common: 1 }, flag: "tended_d13" } }
      ],
      after: ["Abhimanyu falls, and that night Arjuna swears to kill Jayadratha by sunset or walk into fire."],
      next: "a6_day14"
    },
    {
      id: "a6_d13_inside", act: 6, age: 44, canon: true, war: true, art: "scene_day13", place: "Inside the Chakravyuha", caption: "The gap closing behind you",
      title: "Inside the wheel",
      body: (S) => [
        "You are through, and the gap has closed behind you. Abhimanyu fights alone against Drona, Karna and the rest.",
        K.hasVow("never_retreat") ? { aside: "You swore never to retreat." } : null,
        vasuNear(S) ? { memory: "Vasu is somewhere on the other side of that wall of chariots." } : null
      ],
      choices: [
        { id: "stay", t: "Stay beside him to the end", combat: "e_last_stand", noAfter: true, fx: { bond: { arjuna: 3 } } },
        { id: "out", t: "Cut your way out", tags: ["retreat"],
          resolve: (S) => (S.curses.some((c) => !c.fired) ? { fireCurse: "any", injury: "eye", flag: "curse_fired_wheel", journal: "Your curse struck in the wheel. You lost an eye fighting your way out." } : { injury: "arm", journal: "You fought your way out of the wheel with a ruined arm." }),
          text: "You turn the chariot and drive at the weakest part of the wall. You come out the other side bleeding, alone, and alive." }
      ],
      after: ["Abhimanyu falls, and that night Arjuna swears to kill Jayadratha by sunset or walk into fire."],
      next: "a6_day14"
    }
  ]);

  // In any deadly fight of the war you may shout for a friend, once. Your friend for life comes if on
  // your side of the field; under a vow never to strike Karna, Karna answers even across the lines,
  // to stand your enemies off (never against his brothers). A friendship that has ended reaches no one.
  const FRIEND_SIDE = { karna: "kaurava", duryodhana: "kaurava", arjuna: "pandava", bhima: "pandava" };
  K.warHelp = (S) => {
    // One who crossed the lines on the first morning is not trusted until a deadly fight is won (war_crossing.js).
    if (S.flags.includes("crossed_untrusted")) return { text: "You shout for help. The men of your new side hear you, look at each other, and do not come. They do not know you yet." };
    const naga = K.nagaHelp && K.nagaHelp(S); // once in the war, for one who carried Iravan to the river (content/war_lake.js)
    if (naga) return naga;
    const f = S.friend;
    if (f && !S.dead.includes(f) && K.UNITS[f] && FRIEND_SIDE[f] === S.side)
      return { unit: K.UNITS[f](S), stay: 2, text: ["{who} hears you over the din, and comes.", { who: K.PEOPLE[f].name }] };
    if (K.hasVow("spare_karna", S) && !S.dead.includes("karna") && S.side === "pandava")
      return { text: "Karna hears you across the lines. His chariot swings out of the Kaurava ranks and stands between you and your enemies, and none of them will come past him. He raises his bow to you once, and is gone.",
        run: (B) => B.living("enemy").forEach((u) => { if (u.person !== "karna") B.status(u, "weakened", 2); }) };
    if (f && f !== "charu" && !S.dead.includes(f)) return { text: ["You shout for {who}, but {who} is far down the line, in the thick of it.", { who: K.PEOPLE[f].name }] };
    return { text: "You shout for help. In the roar of the battle no one you trust is near enough to hear." };
  };
  const war = (K.warEncounter = (id, title, enemies, extra) => K.encounter(Object.assign({
    id, title, art: "scene_day13", lethal: true, curse: true, allies: K.warAllies, callHelp: K.warHelp,
    flee: { tags: ["retreat"] }, spare: true,
    deathText: "You fell at Kurukshetra."
  }, extra, { enemies })));

  // Something happens on the field once in each deadly fight, as the third round begins (combat.js).
  // Fights draw from the common ones unless they name their own in `events`.
  const each = (B, side, fn) => B.living(side).forEach(fn);
  K.BATTLE_EVENTS = {
    conch: { common: true, text: "A conch sounds behind your line, then a hundred more. Your side takes heart.",
      run: (B) => each(B, "friends", (u) => B.status(u, "inspired", 2)) },
    arrows: { common: true, text: "A cloud of arrows comes down out of the dust, on friend and foe alike.",
      run: (B) => B.units.forEach((u) => { if (u.hp > 1) u.hp = Math.max(1, u.hp - Math.max(1, Math.round(u.maxHp * 0.08))); }) },
    horse: { common: true, text: "A riderless horse bolts through the enemy line, dragging its reins. {t} is caught in the open.",
      run: (B) => { const t = K.pick(B.living("enemy")); B.status(t, "exposed", 2); return { t }; } },
    water: { common: true, text: "A water-carrier runs along your line under the arrows. Everyone drinks.",
      run: (B) => each(B, "friends", (u) => { u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.12)); }) },
    elephant: { common: true, text: "A maddened elephant tears through the press. {t} is thrown down in its path.",
      run: (B) => { const t = K.pick(B.living("enemy")); B.status(t, "stun", 1); return { t }; } },
    bhishma_p: { text: "Far down the line, Bhishma's palm-tree banner turns your way. His arrows fall like rain, and your line bends under them.",
      run: (B) => each(B, "friends", (u) => B.status(u, "weakened", 2)) },
    bhishma_k: { text: "Bhishma's palm-tree banner sweeps down the line. Where the old man passes, the enemy ranks break, and your side surges after him.",
      run: (B) => { each(B, "friends", (u) => B.status(u, "inspired", 2)); each(B, "enemy", (u) => B.status(u, "exposed", 1)); } },
    ghatotkacha_p: { text: "Ghatotkacha, Bhima's giant son, roars out of the dark above the torches. The men in front of you falter and look up.",
      run: (B) => each(B, "enemy", (u) => B.status(u, "weakened", 2)) },
    ghatotkacha_k: { text: "Something huge moves in the dark above the torches, laughing. Ghatotkacha, Bhima's giant son. Your line shrinks from him.",
      run: (B) => each(B, "friends", (u) => B.status(u, "weakened", 2)) },
    smoke: { text: "The tents are burning. Smoke rolls between you, and for a breath he cannot see you.",
      run: (B) => each(B, "player", (u) => B.status(u, "evade", 1)) },
    moon: { text: "A cloud slides across the moon. In the sudden dark he loses you for a breath.",
      run: (B) => each(B, "player", (u) => B.status(u, "evade", 1)) }
  };

  war("e_day1", (S) => "The line holds against the " + foeSide(S) + "s", (S) => [K.ugraAcross(S) ? K.foe("Ugra, the miller's son", 3, { abilities: ["strike", "heavy"] }) : K.foe(foeSide(S) + " spearman", 3), K.foe(foeSide(S) + " chariot-warrior", 4, { abilities: ["strike", "arrows"] })], { art: "war_bhishma",
    caption: "Days one to nine", events: (S) => [S.side === "kaurava" ? "bhishma_k" : "bhishma_p"],
    win: { fx: { duty: { court: 1 }, rep: { common: 1 }, journal: "You survived the first nine days of the war." }, text: "When the conches sound at sunset, you are still standing." },
    lose: { deathText: "You fell in the first days of the war, when Bhishma was still unstoppable." },
    flee: { fx: { duty: { court: -1 } }, text: "You fall back with the broken line. No one blames you but yourself." },
    spare: { fx: { duty: { conscience: 1 } }, text: "You let a wounded enemy crawl away. Someone else will kill him, or no one will." }
  });
  war("e_guard", "Guarding the king", [K.foe("Kaurava chariot-warrior", 4, { abilities: ["strike", "heavy", "arrows"] }), K.foe("Kaurava horseman", 3)], { art: "war_capture",
    caption: "Around Yudhishthira's chariot",
    win: { fx: { bond: { yudhishthira: 2 }, rep: { pandava: 2 }, journal: "You guarded Yudhishthira's chariot when Drona tried to take him alive." }, text: "The attack breaks against your line. Yudhishthira raises a hand to you as his chariot turns." },
    lose: { deathText: "You fell guarding Yudhishthira's chariot on the eleventh day." },
    flee: { fx: { rep: { pandava: -1 } }, text: "You fall back, and others close the gap you left." },
    spare: { fx: { duty: { conscience: 1 } }, text: "You let the last of them go." }
  });
  war("e_hunt", "The drive for the king", [K.foe("Pandava guard", 4, { abilities: ["strike", "guard", "heavy"] }), K.foe("Panchala archer", 3, { abilities: ["strike", "arrows"] })], { art: "war_capture",
    caption: "Yudhishthira's guard",
    win: { fx: { rep: { kuru: 2 }, bond: { duryodhana: 1 } }, text: "You break through the guard, just in time to see Arjuna's chariot arrive and end the attack." },
    lose: { deathText: "You fell trying to take Yudhishthira alive on the twelfth day." },
    flee: { fx: { rep: { kuru: -1 } }, text: "You pull back with the rest of the attack." },
    spare: { fx: { duty: { conscience: 1 } }, text: "You let a wounded guard crawl back to his lines." }
  });
  war("e_wheel", "Into the wheel", [K.foe("Kaurava chariot-warrior", 5, { abilities: ["strike", "heavy", "arrows"] }), K.foe("Sindhu guard", 4)], {
    caption: "Through the breach", flee: null, spare: false,
    win: { next: "a6_d13_inside", fx: { bond: { arjuna: 1 } }, text: "You are through the breach before it closes." },
    lose: { deathText: "You fell in the breach of the Chakravyuha, trying to follow Abhimanyu." }
  });
  // The heart of the wheel: a fight you cannot win, only hold. The epic's beats arrive round by round.
  const abhi = (B) => B.units.find((u) => u.person === "abhimanyu" && u.hp > 0);
  war("e_last_stand", "The heart of the wheel", [
    K.foe("Drona", 9, { abilities: ["strike", "heavy", "arrows"], hero: true, person: "drona" }),
    K.foe("Karna", 9, { abilities: ["strike", "heavy", "arrows"], hero: true, person: "karna" }),
    K.foe("Kripa", 6, { abilities: ["strike", "heavy"], person: "kripa" }),
    K.foe("Ashwatthama", 7, { abilities: ["strike", "heavy", "arrows"], hero: true })
  ], {
    caption: "Inside the Chakravyuha", allies: ["abhimanyu"], rounds: 6, showAstra: true,
    // No one can follow you in: Jayadratha holds the breach (canon). The call is heard, and that is all.
    callHelp: () => ({ text: "You shout for help. Beyond the ring Bhima roars back, but Jayadratha's line holds, and no one comes through.", run: (B) => { const a = abhi(B); if (a) B.status(a, "inspired", 2); } }), roundsText: "The ring tightens. There is no more room to fight in.", flee: null, spare: false,
    intro: "Behind you the gap has closed. Abhimanyu glances back, sees you, and laughs. \"Two of us,\" he says. \"That is twice as many as they thought.\"",
    beats: [
      { round: 2, stop: "karna", text: "On Drona's word, Karna circles behind Abhimanyu and cuts his bowstring with one arrow.", run: (B) => { const a = abhi(B); if (a) { a.abilities = ["strike", "heavy"]; a.atk = Math.round(a.atk * 0.85); } } },
      { round: 3, text: "Abhimanyu's charioteer falls, then his horses. He leaps down with his sword and shield.", run: (B) => { const a = abhi(B); if (a) B.status(a, "exposed", 2); } },
      { round: 4, stop: "drona", text: "Drona shatters Abhimanyu's sword in his hand. He picks up a chariot wheel and swings it like a mace.", run: (B) => { const a = abhi(B); if (a) a.atk = Math.round(a.atk * 0.8); } },
      { round: 5, text: "Six of them close in at once. There is no room left to turn.", run: (B) => B.living("friends").forEach((u) => B.status(u, "weakened", 2)) },
      { round: 6, text: "The wheel in Abhimanyu's hands breaks. He picks up a mace from the ground.", run: (B) => {} }
    ],
    win: { next: "a6_ring_closes", text: "You are still on your feet beside him when the ring of chariots begins to turn inward." },
    lose: { fx: { flag: "died_with_abhimanyu" }, deathText: "{They} fell beside Abhimanyu in the heart of the wheel, on the thirteenth day." }
  });
  // Kaurava side: Abhimanyu comes at your stretch of the ring. That day no one who stood in front of
  // him lived: the fight cannot be won, only fled. A friend may answer your call for a while; an astra
  // is met by its counter, which Arjuna's son knows.
  const KAURAVA_FRIEND = (S) => {
    const ok = (id) => !S.dead.includes(id) && (S.friend === id || (S.bonds[id] || 0) >= 6);
    if (ok("karna")) return { unit: "karna", text: "Karna hears you. His chariot swings out of the ring and comes in at Abhimanyu's flank." };
    if (ok("duryodhana")) return { unit: "duryodhana", text: "Duryodhana hears you over the din and drives his chariot at the boy, roaring." };
    return null;
  };
  const abhiFoe = (B) => B.units.find((u) => u.person === "abhimanyu" && u.side === "enemy");
  war("e_ring", "Your stretch of the ring", [K.foe("Abhimanyu", 12, { abilities: ["strike", "heavy", "arrows"], hero: true, person: "abhimanyu", hp: 900, atk: 22 })], {
    caption: "The boy in the wheel", allies: (S) => K.warAllies(S), spare: false, showAstra: true, injury: "arm",
    // In 3D Drona's order reaches you in the fight itself (owner, 12 Nov: you may do it or refuse it; he falls either way). What you did is
    // carried to the scene after as a flag, and that scene then does not ask again.
    order3: { round: 2, on: "abhimanyu", from: "drona", flag: "bow3d", title: "Drona's order", text: "Drona gives the order: \"Cut his bow from behind. Kill his horses. Then he is only a boy.\" It reaches you.", yes: "Do as Drona says", no: "Refuse, out loud",
      taken: "Get round behind him. One blow, before he turns.", goal: "Strike him from behind", obey: "Your blow lands as Karna's arrow cuts the string. Abhimanyu turns, and sees you.", miss: "You are behind him with your arm drawn back. You do not strike. No one notices but you.", refuse: "Drona does not look at you, and someone else does it." },
    intro: "A sixteen-year-old in a chariot comes at your part of the ring as if it were made of reeds. Behind him, the men who tried to stop him are lying in the dust.",
    callHelp: (S) => {
      const f = KAURAVA_FRIEND(S);
      if (!f) return { text: "You shout for help. In the roar of the wheel no one you trust is near enough to hear." };
      return { unit: K.UNITS[f.unit](S), stay: 2, text: f.text };
    },
    beats: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((r) => ({ round: r,
      text: { 2: "His arrows find your charioteer. You take the reins yourself.", 3: "Duryodhana's son Lakshmana rides in beside you, and falls to Abhimanyu's first arrow.", 4: "He sees you now. Every arrow he looses is meant for you.", 5: "Your bow arm is going numb. He is not even tired.", 6: "Nothing you do slows him." }[r] || "He comes on, faster than anyone can follow.",
      run: (B) => { const a = abhiFoe(B); if (a && r >= 3) a.atk = Math.round(a.atk * 1.3); if (r === 4) B.living("friends").forEach((u) => { if (u.side === "player") B.status(u, "exposed", 2); }); } })),
    win: { next: "a6_d13_bow", text: "Somehow, he turns away from you, toward a weaker stretch of the ring." },
    lose: { next: "a6_d13_bow", fx: { flag: "fell_to_abhimanyu" }, deathText: "{They} fell to Abhimanyu's arrows, holding a stretch of the ring in the Chakravyuha on the thirteenth day." },
    flee: { tags: ["retreat"], next: "a6_d13_bow", fx: { duty: { conscience: 1 }, flag: "left_ring" }, text: "You pull back out of the ring. Others close the gap you leave, and die in it." }
  });
  war("e_gate", "Holding the gate", [K.foe("Jayadratha's guard", 4, { abilities: ["strike", "guard"] }), K.foe("Sindhu archer", 3, { abilities: ["strike", "arrows"] })], {
    caption: "The breach Jayadratha holds", rounds: 5, roundsText: "The gate never opens. But you held your ground in front of it.", spare: false,
    win: { fx: { flag: "could_not_break_through", memory: ["arjuna", "You were among those who could not break through."], journal: "On the thirteenth day you were among those who could not break through." }, text: "Whatever you do, Jayadratha's line does not break today. Nothing would have broken it." },
    lose: { deathText: "You fell at the breach of the Chakravyuha, trying to reach Abhimanyu." },
    flee: { fx: { duty: { conscience: -1 } }, text: "You pull back from the gate." }
  });
})(window.K = window.K || {});
