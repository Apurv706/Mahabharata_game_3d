/* War storylines (PRD 18.13): Yuyutsu's call: the only way to change sides (#1).
   Before the first arrow Yudhishthira calls across the field that anyone may still change sides, and
   Yuyutsu, Dhritarashtra's son, crosses to the Pandavas. Every life at the war meets the call on the
   first morning (cross_call, before a6_day1):
   - on the Kaurava side you may cross with him, if you get out of your own line: the men beside you (from the
     tents, the tent guards) try to stop you, a fight (cross_e_escape, owner 10 November: "Make it a fight").
     Beaten, you are dragged back and stay a Kaurava, marked (tried_to_cross, watched_by_own): no rank, the
     front rank, a spearman of your own side at your back, court duty and Kuru standing down. Not deadly.
     Won: S.side becomes "pandava" and everything keyed by side
     follows it (the war days, letters, the map's camp). Every bond on the side you left falls by 3 and
     a friend for life there ends at once; crossing counts as retreat. The new side gives you a place,
     not trust: no rank (every role_ and council_ flag goes, a commander's company with them, and you
     fight as role_front; healers and bards keep their work), and no call for help (crossed_untrusted)
     while the new side suspects you are a spy (suspected_spy, with crossed_untrusted for K.warHelp).
     A guard sleeps across your tent door (cross_watched). You prove yourself (proved(): trust, the call
     for help, and rank again: a commander who left a company behind is given one, company_given_back,
     and command.js's promotions follow) by any of:
       - killing the man your old side sends on the second morning (proven_duel). Sparing him feeds the
         suspicion, unless you can explain it to Dhrishtadyumna (cross_explain, statecraft: proven_spared);
       - the truth before Yudhishthira on the third night (cross_truth, a retort test): something true
         about the army you left. Bonds there fall by 1, and conscience by 1 for the men it kills (proven_truth);
       - the fourth night, when a real spy copies the array and you are blamed (cross_spy, a notice test):
         remember the man well enough and he is caught (proven_spy).
     Not proven by the fourth night, you are suspected for the war (suspected_war): no rank, no call for
     help, the worst postings, a spearman two paces behind you, and a line in the telling.
     Flags: crossed_lines, crossed_to_pandava;
   - on the Pandava side you may call your sibling across (a test of statecraft against their loyalty):
     if they come they fight beside you for the war (S.calledAcross, K.warAllies); either way they
     remember. A friend for life on the other side (Karna, Duryodhana) can be called, and will not come:
     canon;
   - or stand still. Those in the healers' tents only watch.
   On the second morning (cross_duel) your old side sends someone to bring you back or kill you: Ugra
   if he stood beside you, else Kanaka, a comrade of your old company. A caller whose sibling came
   fights beside them against the riders sent after them (cross_called).
   Scenes and encounters begin with cross_. The ending "The one who crossed" is in act7.js. */
(function (K) {
  "use strict";

  Object.assign(K.PEOPLE, { kanaka: { name: "Kanaka", canon: false }, yuyutsu: { name: "Yuyutsu", canon: true } });
  // A sibling who came across at your call fights beside you (K.warAllies, act6a.js).
  Object.assign(K.UNITS, {
    dev: () => ({ name: "Dev", hp: 44, atk: 7, def: 2, abilities: ["strike", "guard"], person: "dev" }),
    devi: () => ({ name: "Devi", hp: 40, atk: 7, def: 2, abilities: ["strike", "arrows"], person: "devi" })
  });

  const has = (S, f) => S.flags.includes(f);
  const crossed = (S) => has(S, "crossed_lines");
  K.crossedLines = crossed;
  const sibName = (S) => (S.sibling && K.PEOPLE[S.sibling] ? K.PEOPLE[S.sibling].name : "your sibling");
  const sibAlive = (S) => !!S.sibling && !S.dead.includes(S.sibling);
  // A friend for life on the Kaurava side: Karna or Duryodhana. Neither crosses (canon).
  const friendK = (S) => (S.friend === "karna" || S.friend === "duryodhana") && !S.dead.includes(S.friend) && S.bonds[S.friend] >= 3;
  // Who serves the Kuru throne, for the bonds that fall when you leave it.
  const KAURAVA = ["duryodhana", "karna", "dushasana", "drona", "kripa", "bhishma", "ashwatthama", "shakuni", "vikarna", "bhurishravas", "jayadratha", "shalya", "kritavarma"];
  // The one your old side sends after you: Ugra, if he stood beside you, else a comrade of your company.
  // Settled when the second morning comes (S.crossFoe), so the telling still names him afterwards.
  const duelFoe = (S) => S.crossFoe || (has(S, "ugra_left_behind") && !S.dead.includes("ugra") ? "ugra" : "kanaka");
  const foeName = (S) => (duelFoe(S) === "ugra" ? "Ugra" : "Kanaka");

  // What crossing costs, as one effect, so the choice can show it before you choose.
  function crossFx(S) {
    const tents = has(S, "role_healer") || has(S, "role_bard");
    const bond = {}, flag = ["crossed_lines", "crossed_to_pandava", "crossed_untrusted", "suspected_spy"].concat(tents ? [] : ["role_front"]);
    // An ordinary soldier until the new side trusts you: no company, no chariot, no division, no council.
    const unflag = S.flags.filter((f) => /^(role_|council_)/.test(f) && !["role_front", "role_healer", "role_bard"].includes(f));
    const people = KAURAVA.slice();
    // Vasu, sent to a Kaurava division last night, stays in it (war_child.js reads vasu_away).
    if (S.child === "vasu" && !S.dead.includes("vasu") && has(S, "vasu_away")) {
      people.push("vasu"); flag.push("vasu_left_behind"); unflag.push("vasu_away");
      for (const f of S.flags) if (f.startsWith("child_cmd_")) unflag.push(f);
    }
    if (K.ugraAlly && K.ugraAlly(S)) { people.push("ugra"); flag.push("ugra_left_behind"); }
    if (sibAlive(S) && has(S, "sibling_same_side")) { people.push(S.sibling); unflag.push("sibling_same_side"); flag.push("sibling_other_side_set", "sibling_left_behind"); }
    else if (sibAlive(S) && has(S, "sibling_other_side_set")) { unflag.push("sibling_other_side_set"); flag.push("sibling_joined"); }
    for (const w of people) if (S.bonds[w] != null && !S.dead.includes(w)) bond[w] = -3;
    // A friend for life on the side you leave: the friendship ends at once (core.js says farewell).
    const f = S.friend;
    if (f && KAURAVA.includes(f) && S.spouse !== f && !S.dead.includes(f)) bond[f] = -Math.max(3, (S.bonds[f] ?? 3) - 2);
    if (has(S, "role_command")) flag.push("company_left");
    return { set: { side: "pandava" }, unflag, flag, bond, duty: { court: -3 }, rep: { kuru: -3, pandava: 1 },
      memory: ["all", "You crossed the field on the first morning of the war, behind Yuyutsu."],
      journal: "On the first morning of the war you answered Yudhishthira's call and crossed the field to the Pandavas, behind Yuyutsu." };
  }
  // ---------- Suspicion, and proving yourself ----------
  const suspected = (S) => has(S, "suspected_spy");
  // Proven: suspicion clears, the call for help answers again, and rank opens again.
  const rankBack = (S) => (has(S, "company_left") && !has(S, "role_command") ? ["role_command", "company_given_back"] : []);
  function proved(S, how) {
    const rank = rankBack(S);
    return { unflag: ["crossed_untrusted", "suspected_spy"].concat(rank.length ? ["role_front"] : []), flag: ["crossed_trusted", "proven_" + how].concat(rank) };
  }
  const SUSPECTED = { flag: "suspected_war", journal: "The Pandavas never stopped suspecting you of spying for the Kauravas. A spearman followed you two paces behind, to the end of the war." };
  const TRUTH = [
    { line: "\"Which flank of the Kaurava array is weakest?\"", replies: ["\"The left, where Kritavarma's men join the Madras. The join is loose.\"", "\"None of them. The grandsire sets the array.\"", "\"I was a spearman. Nobody told me.\""] },
    { line: "\"Where does the grandsire keep his reserve of chariots?\"", replies: ["\"Behind the hill with the dead tree, out of sight of your scouts.\"", "\"Close to his own chariot, I suppose.\"", "\"I would not know.\""] },
    { line: "\"Why did you cross?\"", replies: ["\"Because you called, and it was true, and I heard it.\"", "\"Because you will win.\"", "\"Yuyutsu went. Why not me?\""] }
  ];
  const SPY_THINGS = ["A groom's bucket", "Ink on his fingers", "Sandals too good for a groom", "A cloak worn inside out", "A burn on his left hand", "Mud to the knees",
    "A tally-stick at his belt", "A shaved head", "A torn ear", "A copper armlet", "A limp in the right leg"];

  // Out of your own line: the men beside you try to stop you (cross_e_escape); this is told once you are free of them.
  const fromTents = (S) => has(S, "role_healer") || has(S, "role_bard");
  const crossText = (S) => {
    const v = S.child === "vasu" && !S.dead.includes("vasu");
    if (v && has(S, "vasu_with_you")) return "You leave them in the dust and walk on. Vasu catches up before you are halfway and walks beside you, and the whole field watches the two of you cross.";
    if (v && has(S, "vasu_in_camp")) return "You leave them in the dust and walk on, and the whole field watches you cross. That night Vasu finds his way over from the Kaurava camp and does not ask why.";
    if (v && has(S, "vasu_away")) return "You leave them in the dust and walk on. You pass the division Vasu went to last night, and he does not look at you.";
    if (fromTents(S)) return "You leave the guards in the dust and walk out onto the empty ground. The whole field watches you cross, and the Pandava line opens a gap for you and closes behind you.";
    return "You leave them in the dust and walk on. The Pandava line opens for you and closes behind you.";
  };
  // Beaten, dragged back: still a Kaurava, and marked. No rank (the front rank; healers and bards keep their work, under
  // guard), court duty and Kuru standing down.
  function dragged(S) {
    const tents = fromTents(S);
    const unflag = tents ? [] : S.flags.filter((f) => /^(role_|council_)/.test(f) && !["role_front", "role_healer", "role_bard"].includes(f));
    return { unflag, flag: ["tried_to_cross", "watched_by_own"].concat(tents ? [] : ["role_front"]), duty: { court: -2 }, rep: { kuru: -2 },
      memory: ["all", "You tried to cross to the Pandavas on the first morning, and your own side dragged you back."],
      journal: "On the first morning of the war you tried to cross the field behind Yuyutsu. Your own side dragged you back, and has watched you ever since." };
  }

  K.scenes([
    {
      id: "cross_call", act: 6, age: 44, war: true, when: (S) => !!S.side, skipTo: "a6_day1", next: "a6_day1",
      art: "scene_yuyutsu_crossing", place: "Kurukshetra · the first morning", caption: "One man crossing the empty ground",
      title: "The call across the field",
      witness: [
        "Yudhishthira calls across the field: anyone may still change sides. Only Yuyutsu, a son of Dhritarashtra, crosses."
      ],
      body: (S) => (S.side === "kaurava"
        ? ["The call still stands.",
          S.friend && KAURAVA.includes(S.friend) ? { memory: "{friend} is somewhere behind you in this army." } : null,
          K.hasVow("never_retreat", S) ? { aside: "You swore never to retreat. Walking out of your own line counts." } : null]
        : S.side !== "pandava" ? ["From the healers' tents you watch him go. By evening both sides will be bringing you their wounded."]
        : [sibAlive(S) && has(S, "sibling_other_side_set") ? ["Across the field, under the Kaurava banners, is {who}. The call still stands.", { who: sibName(S) }] : null]),
      choices: (S) => (S.side !== "kaurava" && S.side !== "pandava" ? [{ id: "tents", t: "Go back to the tents", text: "You go back to the tents and lay out the bandages." }]
        : S.side === "kaurava" ? [
        { id: "cross", t: "Cross to the Pandavas", tags: ["retreat"], combat: "cross_e_escape", hint: "Your own side will try to stop you" },
        { id: "stay", t: "Stay in your place", fx: { duty: { court: 1 } }, text: "You stay. Beside you, someone lets out a breath." }
      ] : [
        sibAlive(S) && has(S, "sibling_other_side_set") ? { id: "call", t: ["Call across the field to {who}", { who: sibName(S) }], hint: "A test of wits",
          check: { attr: "wisdom", skill: "statecraft", dc: 10,
            // Their loyalty: a promise and a close bond make it easier; a quarrel harder.
            bonus: (S2) => (has(S2, "sibling_promise") ? 1 : 0) + ((S2.bonds[S2.sibling] ?? 0) >= 8 ? 1 : 0) - (has(S2, "sibling_quarrel") ? 1 : 0),
            pass: { fx: (S2) => ({ set: { calledAcross: S2.sibling }, unflag: "sibling_other_side_set", flag: ["called_across", "called_across_came"], bond: { [S2.sibling]: 2 },
                memory: [S2.sibling, "You called me across on the first morning, and I came."], journal: { src: "On the first morning of the war you called {who} across the field, and {who} came.", p: { who: sibName(S2) } } }),
              text: (S2) => ["{who} hands the spear to the next soldier and walks out of the Kaurava line to stand beside you.", { who: sibName(S2) }] },
            fail: { fx: (S2) => ({ flag: "called_across", bond: { [S2.sibling]: 1 }, memory: [S2.sibling, "You called me across on the first morning. I could not come, and I have not forgotten that you asked."] }),
              text: (S2) => ["{who} raises a hand, lowers it, and stays where {who} is.", { who: sibName(S2) }] } } } : null,
        friendK(S) ? { id: "call_friend", t: ["Call across the field to {who}", { who: K.PEOPLE[S.friend].name }], hint: "He will not come. He will remember",
          fx: { flag: "called_friend_across", memory: [S.friend, "You called me across on the first morning, as if I were Yuyutsu."] },
          text: S.friend === "karna" ? "Karna lifts his bow to you, once, and does not move." : "Duryodhana laughs once and turns his chariot away." } : null,
        { id: "welcome", t: "Make room for Yuyutsu beside you", fx: { duty: { conscience: 1 }, flag: "welcomed_yuyutsu" }, text: "He takes the place, thanks you, and says nothing else all morning. He keeps looking back at his brothers' banners." },
        { id: "still", t: "Go back to your place", fx: { duty: { court: 1 } }, text: "You take your place. The conches begin." }
      ].filter(Boolean))
    },
    {
      // The first evening: the new side says what it thinks you are.
      id: "cross_watched", act: 6, age: 44, war: true, when: (S) => crossed(S) && suspected(S), skipTo: "a6_day1", next: "a6_day1",
      art: "battle_night", place: "Kurukshetra · the Pandava camp, the first evening", caption: "A guard at the tent door", title: "Watched",
      travel: "You crossed the open ground behind Yuyutsu. The Pandava camp gave you a place to sleep, and no one spoke to you.",
      body: ["Dhrishtadyumna comes to your fire with two spearmen.",
        { speaker: "Dhrishtadyumna", line: "Nobody here knows you. Men have been sent across before." }],
      choices: [{ id: "bear", t: "Let them watch. You will show them", fx: { journal: "On your first night in the Pandava camp Dhrishtadyumna set a guard on your tent. They think you may be a spy." },
        text: "You lie awake a long time, listening to the guard breathe." }]
    },
    {
      // The second morning: the old side sends someone to bring you back, or not.
      id: "cross_duel", act: 6, age: 44, war: true, when: crossed, skipTo: "a6_day1", next: "a6_day1",
      art: "fight_between_lines", place: "Kurukshetra · between the lines, the second morning", caption: "Open ground, and both armies watching",
      title: "Between the lines",
      enter: (S) => ({ set: { crossFoe: duelFoe(S) } }),
      body: (S) => [
        duelFoe(S) === "ugra" ? "On the second morning a big man with a miller's shoulders walks out of the Kaurava line and stops halfway across. It is Ugra, the miller's son, who stood in the line beside you yesterday morning."
          : "Kanaka, who shared your fire on the march, walks out of the Kaurava line.",
        duelFoe(S) === "ugra" ? { speaker: "Ugra", line: "I waited thirty years to stand next to you, and you stood there one morning. Come back, or come out here." }
          : { speaker: "Kanaka", line: "They sent me to bring you back. Or not. Come out." },
        has(S, "crossed_untrusted") ? { aside: "No one on this side of the field knows you yet. No one will come if you call." } : null
      ],
      choices: [
        { id: "meet", t: "Walk out and meet him", combat: "cross_e_duel", hint: "A deadly fight" }
      ]
    },
    {
      // The second morning, for one who called a sibling across and was answered.
      id: "cross_called", act: 6, age: 44, war: true, when: (S) => has(S, "called_across_came") && !!S.calledAcross && !S.dead.includes(S.calledAcross), skipTo: "a6_day1", next: "a6_day1",
      art: "fight_between_lines", place: "Kurukshetra · the second morning", caption: "Riders from the Kaurava line",
      title: "Riders from the other side",
      body: (S) => [["Kaurava riders come for {who}: walk back, or be carried.", { who: sibName(S) }]],
      choices: [{ id: "stand", t: (S) => ["Stand beside {who} and fight them", { who: sibName(S) }], combat: "cross_e_called" }]
    },
    {
      // The second evening: sparing the man your old side sent looks like a spy's mercy.
      id: "cross_explain", act: 6, age: 44, war: true, when: (S) => crossed(S) && suspected(S) && has(S, "spared_crossing_duel"), skipTo: "a6_day1", next: "a6_day1",
      art: "battle_night", place: "Kurukshetra · the Pandava camp, the second evening", caption: "Dhrishtadyumna at your fire", title: "A spy's mercy",
      body: ["You beat the man your old side sent, and let him go home.",
        { speaker: "Dhrishtadyumna", line: "A spy would have spared him. Why did you?" }],
      choices: (S) => [
        { id: "explain", t: "Tell him why", hint: "A test of wits",
          check: { attr: "wisdom", skill: "statecraft", dc: 10,
            pass: { fx: (S2) => proved(S2, "spared"), text: "\"He will tell them that the one who crossed could have killed him and did not,\" you say. Dhrishtadyumna sends the guard away." },
            fail: { fx: { flag: "suspicion_deepened" }, text: "Every reason you give sounds like one a spy would give. Dhrishtadyumna hears you out, and leaves the guard where he is." } } },
        { id: "silent", t: "Say nothing", fx: { flag: "suspicion_deepened" }, text: "He waits. Then he goes, and the guard stays." }
      ]
    },
    {
      // The third night: the truth before the king who never lies.
      id: "cross_truth", act: 6, age: 44, war: true, when: (S) => crossed(S) && suspected(S), skipTo: "a6_day1", next: "a6_day1",
      art: "scene_war_council", place: "Kurukshetra · Yudhishthira's tent, the third night", caption: "Three questions", title: "Before Yudhishthira",
      body: (S) => ["You are brought to Yudhishthira's tent.",
        has(S, "suspicion_deepened") ? { aside: "Dhrishtadyumna reminds the king that you let the man your old side sent walk home." } : null,
        { speaker: "Yudhishthira", line: "Tell me something true about the army you left, something a spy would never give away." }],
      choices: [
        { id: "tell", t: "Tell him the Kaurava plans", game: "retort", hint: "A test of wits",
          trial: { attr: "wisdom", skill: "statecraft", rounds: TRUTH, stage: "stage_battlefield_night", cast: ["yudhishthira"],
            rules: "Answer true and plain before the lamp burns down. Two of three.",
            stakes: ["Yudhishthira believes you.", "Yudhishthira cannot tell, and the guard stays at your tent."] },
          win: { fx: (S) => { const bond = {}; for (const w of KAURAVA) if (S.bonds[w] != null && !S.dead.includes(w)) bond[w] = -1;
              return Object.assign(proved(S, "truth"), { bond, duty: { conscience: -1 }, journal: "Before Yudhishthira you told the truth about the Kaurava array. The next morning men died where you said they would be." }); },
            text: "\"That is true,\" Yudhishthira says, \"and it cost you something to say.\" The next morning Bhima's men are waiting where you said." },
          lose: { fx: { flag: "truth_doubted" }, text: "You tell the truth, and it comes out wrong, too quick and then too slow. Yudhishthira looks at you a long time and says he cannot tell." } },
        { id: "refuse", t: "Refuse", fx: { duty: { conscience: 1 }, flag: "refused_to_inform" },
          text: "\"I crossed to fight beside you,\" you say, \"not to sell them.\" The guard stays." }
      ]
    },
    {
      // The fourth night: a real spy, and you are blamed. The last chance before the suspicion sets.
      id: "cross_spy", act: 6, age: 44, war: true, when: (S) => crossed(S) && suspected(S), skipTo: "a6_day1", next: "a6_day1",
      art: "battle_night", place: "Kurukshetra · the Pandava camp, the fourth night", caption: "A copied array", title: "A thief in the camp",
      body: ["Someone has copied tomorrow's array from Dhrishtadyumna's tent, and the camp blames you.",
        "Last night you saw a man by the horse lines going the wrong way."],
      choices: [
        { id: "remember", t: "Describe the man", game: "notice", hint: "A test of what you notice",
          trial: { attr: "wisdom", skill: "statecraft", stage: "stage_supply_camp_night", things: SPY_THINGS, count: 5,
            lookLine: "Remember the man by the horse lines. You have {n} seconds.", ask: "Which of these did the man have?",
            rules: "Before the lamp burns down, say what you saw of the man. Two right of three.",
            stakes: ["The man is found.", "Nobody is found, and the camp keeps its eyes on you."] },
          win: { fx: (S) => Object.assign(proved(S, "spy"), { journal: "In the Pandava camp you found the spy everyone took you for: a groom who had been Shakuni's man for ten years." }),
            text: "They find him at dawn among the grooms, with the copied array in his bucket. Dhrishtadyumna takes the guard off your tent himself." },
          lose: { fx: SUSPECTED, text: "Nobody is found, and neither is the copied array. From now on there is always a Panchala spearman two paces behind you." } },
        { id: "wait", t: "Say nothing", fx: SUSPECTED,
          text: "Nobody is found. From now on a Panchala spearman is always two paces behind you." }
      ]
    }
  ]);

  // ---------- The fights ----------
  // The first morning: out of your own line (owner, 10 November: "Make it a fight"). The men either side of you, with
  // the captain of your file shouting at them; from the tents, the tent guards. Not deadly: beaten, you are dragged back.
  K.encounter({
    id: "cross_e_escape", mix: false, title: "Out of the line", art: "fight_between_lines", caption: "Your own side at your back", lethal: false,
    allies: [], flee: null,
    callHelp: () => ({ text: "You shout for help. It is your own side holding you back, and the Pandava line is too far away to hear." }),
    // Three of them (owner, 10 November, 23:05: "Harder crossing fight"; with two the bot crossed 95% of the time).
    intro: (S) => (fromTents(S) ? "Three of the tent guards run out after you. \"Back! Nobody leaves the tents!\""
      : "The captain of your file is shouting. The men either side of you and the one behind turn their spears on you."),
    enemies: (S) => (fromTents(S)
      ? [K.foe("Tent guard", 2), K.foe("Tent guard", 2), K.foe("Tent guard", 2)]
      : [K.foe("Kaurava spearman", 3), K.foe("Kaurava spearman", 2), K.foe("Kaurava spearman", 2)]),
    win: { fx: (S) => crossFx(S), text: crossText },
    lose: { fx: dragged, text: (S) => (fromTents(S) ? "The guards drag you back to the tents by the arms. From now on one of them sits at the door while you work."
      : "They drag you back into the line by the arms. The captain puts you in the front rank, with a spearman at your back.") }
  });
  K.encounter({
    id: "cross_e_duel", title: "Between the lines", art: "fight_between_lines", caption: "Both armies watching", lethal: true, curse: true,
    allies: [], spare: true, flee: null,
    // Your first deadly fight on the new side: no one answers.
    callHelp: () => ({ text: "You shout for help. Behind you the Pandava line hears it, and no one moves. They are waiting to see what you are." }),
    intro: (S) => (duelFoe(S) === "ugra" ? "Ugra comes on the way he did at the fair, head down. Neither army makes a sound." : "Kanaka circles you once, the way you both learned on the march. Neither army makes a sound."),
    enemies: (S) => (duelFoe(S) === "ugra"
      ? [K.foe("Ugra, the miller's son", 6, { abilities: ["strike", "heavy"], person: "ugra", hp: 80, atk: 10 })]
      : [K.foe("Kanaka", 5, { abilities: ["strike", "heavy", "guard"] })]),
    win: { fx: (S) => ({ die: duelFoe(S), flag: ["won_crossing_duel"].concat(proved(S, "duel").flag), unflag: proved(S, "duel").unflag, journal: { src: "On the second morning of the war your old side sent {who} to bring you back. You killed him between the lines, with both armies watching.", p: { who: foeName(S) } } }),
      text: (S) => (duelFoe(S) === "ugra" ? "Ugra goes down in the open ground and does not get up. Behind you the Pandava line shouts, the first time for you."
        : "Kanaka goes down between the lines and does not get up. Behind you the Pandava line shouts, the first time for you.") },
    spare: { fx: (S) => ({ flag: "spared_crossing_duel", duty: { conscience: 1 }, bond: duelFoe(S) === "ugra" ? { ugra: 2 } : {}, journal: { src: "On the second morning of the war you beat {who}, whom your old side sent after you, and let him walk home.", p: { who: foeName(S) } } }),
      text: "You step back and let him go. By evening both camps know that you could have killed him and did not." },
    lose: { fx: { flag: "lost_crossing_duel" }, deathText: "{They} crossed the field at Yuyutsu's call, and fell between the lines on the second morning, with both armies watching.",
      text: (S) => (S.alive ? "You go down between the lines, and hands drag you back to the Pandava line. You wake in a tent that is not yours yet." : null) }
  });
  K.encounter({
    id: "cross_e_called", title: "Riders from the other side", art: "fight_between_lines", caption: "The second morning", lethal: true, curse: true,
    allies: (S) => K.warAllies(S), spare: true, callHelp: K.warHelp,
    intro: (S) => ["The riders come at {who} first. You get there before they do.", { who: sibName(S) }],
    // The captain at 4, not 5 (6 November): at 5 this deadly fight was the hardest live one in the war, won 76% of the time
    // in the full check against 90% for guarding the king, and the life test lost it four times out of four. The rider at 3
    // too (6 November, later): with the captain at 4 the war replays still lost it 2 times in 3 on phones (a life ended there),
    // and in simulation it stayed below guarding the king (mean of five paths 57% against 69%; now 79%).
    enemies: [K.foe("Kaurava rider", 3, { abilities: ["strike", "heavy"] }), K.foe("Kaurava riders' captain", 4, { abilities: ["strike", "heavy", "guard"] })],
    flee: { tags: ["retreat"], fx: (S) => ({ flag: ["sibling_other_side_set", "sibling_taken_back"], unflag: "called_across_came", set: { calledAcross: null }, bond: { [S.sibling]: -2 } }),
      text: (S) => ["You fall back. The riders take {who} back across the field between two horses.", { who: sibName(S) }] },
    win: { fx: (S) => ({ bond: { [S.sibling]: 1 }, flag: "kept_called_across", journal: { src: "On the second morning you fought beside {who} against the riders sent to take {who} back.", p: { who: sibName(S) } } }),
      text: (S) => ["The last rider turns his horse and goes. {who} is breathing hard beside you, and laughing.", { who: sibName(S) }] },
    spare: { fx: (S) => ({ bond: { [S.sibling]: 1 }, duty: { conscience: 1 }, flag: "kept_called_across" }), text: "You let the captain ride back to tell them. Nobody else comes." },
    lose: { deathText: "{They} called {their} own kin across the field on the first morning, and fell the next day keeping them there.",
      text: (S) => (S.alive ? ["You go down under the horses. When you wake, you are in the healers' tent, and {who} is sitting beside you.", { who: sibName(S) }] : null) }
  });
  // Their paintings, tall on upright screens (ui/battle.js reads this map).
  Object.assign(K.COMMAND_FIGHT_BG = K.COMMAND_FIGHT_BG || {}, { cross_e_escape: "fight_between_lines", cross_e_duel: "fight_between_lines", cross_e_called: "fight_between_lines" });

  // ---------- Where the scenes come ----------
  K.BEFORE.a6_day1 = (K.BEFORE.a6_day1 || []).concat(["cross_call", "cross_watched", "cross_duel", "cross_explain", "cross_called", "cross_truth", "cross_spy"]);

  // ---------- Where it matters most, the war remembers you crossed ----------
  const said = (id, line) => {
    const sc = K.SCENES[id], body = sc && sc.body;
    if (!sc) return;
    sc.body = (S) => [].concat(K.val(body, S) || [], crossed(S) && K.val(line, S) ? [{ memory: K.val(line, S) }] : []);
  };
  said("a6_day1", (S) => (has(S, "suspected_war") ? "They post you where the line is thinnest, and a Panchala spearman stands two paces behind you all day. He is not there to guard your back."
    : has(S, "company_given_back") ? "Once they trusted you, Dhrishtadyumna sent for you. He had a company of Panchala spearmen with no one to lead it, and now they are yours."
    : has(S, "role_healer") || has(S, "role_bard") ? "You work in the Pandava tents now. The men you tend still go quiet when they learn where you came from."
      : "You fight under Pandava banners now, as a common spearman. The men beside you still go quiet when you come to the fire."));
  said("a6_bhishma", "Nine days ago you walked out of his army. When you tell him your name, he only nods.");
  said("a6_duryodhana", "He knows you. You stood in his line on the first morning, and he saw you walk out of it.");
  said("a6_capture", (S) => (has(S, "suspected_war") ? "The spearman is still two paces behind you. You have stopped turning round to look." : null));
  said("a6_day16", (S) => (has(S, "suspected_war") ? "Your shadow has stopped pretending to watch anything but you." : null));
  said("a6_day18", "Across the field are men you marched to Kurukshetra with. Eighteen days ago you stood in their line.");
  // One who tried to cross and was dragged back: the Kauravas watch them.
  const saidTried = (id, line) => {
    const sc = K.SCENES[id], body = sc && sc.body;
    if (!sc) return;
    sc.body = (S) => [].concat(K.val(body, S) || [], has(S, "tried_to_cross") && !crossed(S) && K.val(line, S) ? [{ memory: K.val(line, S) }] : []);
  };
  saidTried("a6_day1", (S) => (fromTents(S) ? "A guard sits at the door of your tent all day. He is not there for the wounded."
    : "They put you in the front rank, and a spearman of your own side stands two paces behind you all day. He is not there to guard your back."));
  saidTried("a6_duryodhana", "He knows you. On the first morning you tried to walk out of his line.");

  // ---------- What the telling says ----------
  // The bards' name for one who crossed: kindly or not, by conscience and by how the war ended for them.
  (K.TELL_HOOKS = K.TELL_HOOKS || []).push((S, t, h) => {
    if (crossed(S)) {
      const kind = S.duty.conscience >= 6;
      t.push(kind ? (S.alive ? "The bards call {them} the one who crossed, and they say it kindly. {They} heard Yudhishthira's call on the first morning and walked into it."
        : "The bards call {them} the one who crossed, and they say it gently. {They} answered Yudhishthira's call and did not live to be thanked for it.")
        : (S.alive ? "The bards call {them} the one who crossed, and they do not say it kindly. {They} changed sides on the first morning and came out of the war on the winning one."
          : "The bards call {them} the one who crossed. Neither army sang for {them}."));
      if (h("won_crossing_duel")) t.push(["On the second morning {they} killed {who}, whom {their} old side sent after {them}, between the lines.", { who: foeName(S) }]);
      else if (h("spared_crossing_duel")) t.push(["On the second morning {they} beat {who}, whom {their} old side sent after {them}, and let him walk home.", { who: foeName(S) }]);
    }
    else if (h("tried_to_cross")) t.push("On the first morning {they} tried to cross to the Pandavas behind Yuyutsu. The Kauravas dragged {them} back, and watched {them} to the end of the war.");
    if (h("vasu_left_behind")) t.push("When {they} crossed, {their} son Vasu stayed in the Kaurava ranks and fought the war on the other side.");
    if (h("proven_spared")) t.push("{They} talked Dhrishtadyumna round, when sparing that man made the Pandavas sure {they} {were} a spy.");
    else if (h("proven_truth")) t.push("Before Yudhishthira {they} told the truth about the army {they} had left, and men died of it.");
    else if (h("proven_spy")) t.push("In the Pandava camp {they} found the spy that everyone took {them} for.");
    else if (h("suspected_war")) t.push("The Pandavas never trusted {them}. To the end of the war a spearman walked two paces behind {them}.");
    if (h("company_given_back")) t.push("Once the Pandavas trusted {them}, they gave {them} a company of {their} own.");
    if (h("called_across_came")) t.push(["On the first morning {they} called {who} across the field, and {who} came.", { who: sibName(S) }]);
    else if (h("sibling_taken_back")) t.push(["On the first morning {they} called {who} across the field. The next day riders took {who} back.", { who: sibName(S) }]);
    else if (h("called_across")) t.push(["On the first morning {they} called {who} across the field, and {who} could not come.", { who: sibName(S) }]);
  });
})(window.K = window.K || {});
