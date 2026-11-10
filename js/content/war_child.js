/* War storylines (PRD 18.13): Your child on the field (#7) and the Shakti spent (#5).
   Scenes here come before the war days through K.BEFORE, each only when it applies.

   Your child on the field. Every life raises Vasu in the exile years (act5.js a5_child); on the eve of
   the war a6_vasu asks where he fights. Those who let him join another company (vasu_away) choose his
   commander here, tie a thread on his wrist (a moment), get two letters from his lines, and on one day
   (11 for the Pandavas, 12 for the Kauravas) his line comes up beside theirs in a fight. What he lived
   through decides his fate: a Pandava child sleeps in the camp on the night of the raid unless he serves
   Satyaki (who was away with Krishna that night, as in the epic) and came through his day unhurt; a
   Kaurava child who was hurt on his day falls on the last day.
   Flags: child_cmd_<satyaki|virata|ashwatthama|bhurishravas>; child_line_held / child_line_broken /
   child_line_left / child_sent_back; child_fell / child_saved (from inside the fight); child_fell_war,
   child_survived_war.

   The Shakti spent (the night of day 14). Kaurava players beside Karna stand against Ghatotkacha in his
   night form (a holding fight that cannot be won), then call Karna, and say one thing to him as
   Duryodhana begs: keep the spear for Arjuna, use it, or nothing. He throws it (a moment drawn in code
   over the painting). His last words to you on day 17 answer what you said. Pandava players near Bhima
   fight through the dark to reach Karna's chariot before he throws, and are too late; then Bhima's grief.
   Flags: shakti_urged_keep / shakti_urged_use / shakti_silent; called_karna_night; reached_karna,
   shakti_tried_stop, sat_with_bhima. */
(function (K) {
  "use strict";
  const warring = (S) => S.side === "pandava" || S.side === "kaurava";
  const has = (S, f) => S.flags.includes(f);

  Object.assign(K.PEOPLE, {
    ghatotkacha: { name: "Ghatotkacha", canon: true }, satyaki: { name: "Satyaki", canon: true },
    virata: { name: "King Virata", canon: true }, bhurishravas: { name: "Bhurishravas", canon: true }
  });
  // Shadow puppets for the night's fights (puppet.js loads after the content, so they join on the first scene).
  const PUPPETS = {
    ghatotkacha: { pronoun: "he", palette: ["#6a5560", "#3a1f2a", "#c9a24e"], headgear: "crown", crown: { gem: "#b2432a", broad: true, trim: "#3a1f2a" }, item: "mace", studs: ["#c9a24e"], stance: "broad", big: true, size: 1.35 },
    rakshasa: { pronoun: "he", palette: ["#6e5a62", "#2f2430", "#9a7a5a"], headgear: "jata", item: "club", gear: ["torn"], stance: "stoop", stage: "adult", size: 1.12 }
  };
  K.on("scene", () => { if (K.PUPPETS) for (const k of Object.keys(PUPPETS)) if (!K.PUPPETS[k]) K.PUPPETS[k] = PUPPETS[k]; });

  // ---------- Moments of their own (ui/moments.js reads K.MOMENT_KINDS) ----------
  K.MOMENT_KINDS = K.MOMENT_KINDS || {};
  K.MOMENT_KINDS.child_eve = () => ({ theme: "milestone", title: ["{who} goes to war", { who: "Vasu" }], line: "A red thread on his wrist, tied the night before the first day.", art: "moment_child_eve" });
  // The spear, drawn in code over the painting: a white bolt along the painted streak, a flash, a ring.
  K.MOMENT_KINDS.shakti = (m) => ({ theme: "astra", title: "The Shakti",
    line: m.from === "pandava" ? "The spear kept for Arjuna is spent, and Ghatotkacha falls." : "Karna spends the spear he kept for Arjuna.",
    art: "moment_shakti", playAt: 350,
    play: (el) => {
      const U = K.UI;
      if (!U || !U.astraFx) return;
      const W = window.innerWidth, H = window.innerHeight, up = U.upright();
      const pt = (x, y) => ({ getBoundingClientRect: () => ({ left: x * W, top: y * H, width: 0, height: 0 }) });
      U.astraFx({ kind: "generic", into: el, from: up ? pt(0.84, 0.24) : pt(0.45, 0.1), to: up ? pt(0.42, 0.66) : pt(0.76, 0.56) });
    } });

  // =====================================================================================
  // Your child on the field
  // =====================================================================================
  const CMD = { satyaki: "Satyaki", virata: "King Virata", ashwatthama: "Ashwatthama", bhurishravas: "Bhurishravas" };
  const cmdOf = (S) => Object.keys(CMD).find((k) => has(S, "child_cmd_" + k)) || null;
  const cmdP = (S) => ({ cmd: CMD[cmdOf(S)] || "his captain" });
  const childAway = (S) => S.child === "vasu" && !S.dead.includes("vasu") && has(S, "vasu_away") && warring(S);
  // Hurt on his day: nobody stood beside him, or he went down and nobody got him out.
  K.childHurt = (S) => ["child_fell", "child_line_broken", "child_sent_back", "child_line_left"].some((f) => has(S, f)) && !has(S, "child_saved");
  // Pandava side: asleep in the camp on the night of the raid, unless Satyaki (away with Krishna and the
  // brothers that night) took him along, which he does only for a boy not lying wounded in the tents.
  K.childInRaidCamp = (S) => S.side === "pandava" && S.child === "vasu" && !S.dead.includes("vasu") && has(S, "vasu_away") && !(cmdOf(S) === "satyaki" && !K.childHurt(S));
  { const base = K.vasuLostInRaid; K.vasuLostInRaid = (S) => base(S) || (K.childInRaidCamp(S) && !["woke_camp", "slowed_ashwatthama"].some((f) => has(S, f))); }
  // Where he fell, for the fates (act7.js).
  K.childDeath = (S) => (has(S, "child_fell_war") ? "Vasu fell on the last day, where the last line broke, with your thread still on his wrist." : null);

  const LETTER_1 = {
    satyaki: "On the fifth day Bhurishravas killed Satyaki's ten sons, one after another. Satyaki fought on until dark. He has not said their names since, and we do not say them either.",
    virata: "Prince Uttara fell on the first day, and his brother Shveta the same evening. The king did not weep where we could see him. I keep to the rear, as he says. Mostly.",
    ashwatthama: "Ashwatthama fights like his father, and laughs while he does it. A boy from our lane fell beside me on the third day. I did not know what to do with his things.",
    bhurishravas: "On the fifth day the old king killed ten of Satyaki's sons, one after another, and every one of them was my age. In the evening he said his prayers as usual. I could not."
  };
  const LETTER_2 = {
    satyaki: "Yesterday Bhurishravas had Satyaki down with a foot on his chest. Arjuna's arrow took his arm, and then Satyaki took his head while he sat to pray. Some say it was wrong. Satyaki says: ten sons. I do not know what to say to either of them.",
    virata: "King Virata fell to Drona this morning, and King Drupada beside him. We have no king now. They have put us in the Panchala lines, under Dhrishtadyumna.",
    ashwatthama: "They told Ashwatthama his father was dead, and how. He has not slept since. He says the Pandavas will pay for it, all of them. I am afraid of him for the first time.",
    bhurishravas: "Bhurishravas is dead. Arjuna's arrow took his arm while he fought Satyaki, and then Satyaki took his head while he sat to pray. What is left of us goes into Shalya's line."
  };
  const eveChoice = (id, side, t) => ({ id, t, req: { side }, fx: { flag: "child_cmd_" + id, moment: { kind: "child_eve", who: "vasu" }, bond: { vasu: 1 },
      memory: ["vasu", "You tied a red thread on my wrist the night before the war."], journal: { src: "On the eve of the war you tied a thread on Vasu's wrist and sent him to {cmd}'s division.", p: { cmd: CMD[id] } } },
    text: ["You tie a red thread on his wrist. At first light he walks to {cmd}'s banners, and at the last moment he looks back.", { cmd: CMD[id] }] });

  // On his day, his line beside yours. He goes down in the third round: drag him out, or call, and a friend
  // who comes stands over him. Read when the fight ends (K.childFightEnd), from the units themselves.
  const vasuUnit = (B) => B && B.units.find((u) => u.person === "vasu");
  const childHelp = (S) => {
    const B = K.Combat && K.Combat.state(), v = vasuUnit(B), h = K.warHelp(S);
    if (!v || v.hp > 0 || (B.pulled || {})[v.uid]) return h;
    if (!h.unit) return { text: "You shout for help. No one you trust is near enough to hear, and Vasu is still down." };
    return Object.assign({}, h, { text: ["{who} hears you, and goes to Vasu, and stands over him until he can get up.", { who: K.PEOPLE[h.unit.person] ? K.PEOPLE[h.unit.person].name : h.unit.name }],
      run: (B2) => { const u = vasuUnit(B2); if (u) { u.hp = Math.round(u.maxHp * 0.35); B2.status(u, "guard", 2); } B2.shielded = true; } });
  };
  K.childFightEnd = (B) => {
    if (!B || !B.over || B.childRead || !B.enc || B.enc.id !== "wc_e_child_line") return;
    B.childRead = true;
    const v = vasuUnit(B);
    if (!v) return;
    if (B.shielded || (B.pulled || {})[v.uid]) K.apply({ flag: "child_saved", journal: "When Vasu went down beside you, he was got out of the press in time." });
    else if (v.hp <= 0) K.apply({ flag: "child_fell" });
  };
  K.on("combat", K.childFightEnd);

  K.encounter({
    id: "wc_e_child_line", title: "Beside Vasu's line", art: "war_capture", caption: (S) => (S.side === "kaurava" ? "Day twelve" : "Day eleven"),
    lethal: false, curse: true, rounds: 5, roundsText: "The drive breaks against the two lines, yours and his, and falls back.",
    allies: (S) => K.warAllies(S).filter((a) => a !== "vasu").concat(["vasu"]), callHelp: childHelp, spare: false, flee: { tags: ["retreat"] },
    enemies: (S) => (S.side === "kaurava"
      ? [K.foe("Pandava guard", 4, { abilities: ["strike", "guard", "heavy"] }), K.foe("Panchala archers", 3, { plural: true, abilities: ["strike", "arrows"] })]
      : [K.foe("Drona's chariot-warrior", 4, { abilities: ["strike", "heavy", "arrows"] }), K.foe("Kaurava spearmen", 3, { plural: true })]),
    intro: "Vasu's shield is a hand's breadth from yours. He does not look at you. He is trying very hard not to.",
    beats: [{ round: 3, text: "A chariot comes straight at Vasu's shield-wall. He goes down under the wheels and does not get up.", run: (B) => { const v = vasuUnit(B); if (v && v.hp > 0) v.hp = 0; } }],
    win: { fx: { flag: "child_line_held", bond: { vasu: 1 }, memory: ["vasu", "You held the line beside mine, the day they drove for the king."] }, text: "When the conches sound, both lines are where they were at dawn. Vasu finds you in the dusk and stands beside you." },
    lose: { fx: { flag: "child_line_broken" }, text: "The line breaks. In the dust you lose sight of Vasu's shield, and do not find it again until dark." },
    flee: { fx: { flag: "child_line_left" }, text: "You pull back. His line holds without you, somehow, and he never asks why." }
  });
  Object.assign(K.COMMAND_FIGHT_BG, { wc_e_child_line: "fight_war_chariot" });

  K.scenes([
    {
      id: "wc_child_eve", act: 6, age: 44, war: true, away: true, when: (S) => childAway(S) && !cmdOf(S), skipTo: "a6_day1", next: "a6_day1",
      art: "scene_vasu", place: "Your tent, the night before", caption: "Two captains, one boy", title: "Whose division",
      body: ["Two captains will take Vasu. He asks you to choose."],
      choices: [
        eveChoice("satyaki", "pandava", "Satyaki's"),
        eveChoice("virata", "pandava", "King Virata's"),
        eveChoice("ashwatthama", "kaurava", "Ashwatthama's"),
        eveChoice("bhurishravas", "kaurava", "Bhurishravas's")
      ]
    },
    {
      id: "wc_child_letter_1", act: 6, age: 44, war: true, away: true, when: (S) => childAway(S) && !!cmdOf(S), skipTo: "a6_bhishma", next: "a6_bhishma",
      art: "scene_letter_camp", place: "Your tent, after the ninth day", caption: "A letter in Vasu's hand", title: "A letter from Vasu",
      body: (S) => [["A letter comes from Vasu.", cmdP(S)], { speaker: "Vasu", line: LETTER_1[cmdOf(S)] }],
      choices: [
        { id: "write", t: "Write back tonight", fx: { bond: { vasu: 1 } }, text: "You write more than you mean to, and cross most of it out, and send the rest." },
        { id: "go", t: "Go and see him", fx: { bond: { vasu: 2 }, duty: { court: -1 }, memory: ["vasu", "You walked across the camp in the dark to see me, after the ninth day."] },
          text: "He is asleep with his sandals still on. You sit by him for an hour and go back before he wakes." }
      ]
    },
    {
      id: "wc_child_line", act: 6, age: 44, war: true, away: true, when: (S) => childAway(S) && !!cmdOf(S), skipTo: "a6_capture", next: "a6_capture",
      art: "war_capture", place: (S) => (S.side === "kaurava" ? "Kurukshetra · day 12" : "Kurukshetra · day 11"), caption: "Two lines, side by side", title: "Vasu's line",
      body: (S) => [[S.side === "kaurava" ? "{cmd}'s division comes up on your right." : "{cmd}'s division comes up on your left.", cmdP(S)],
        "In its front rank is Vasu."],
      choices: [
        { id: "hold", t: "Hold the line beside him", combat: "wc_e_child_line", hint: "Won by standing" },
        { id: "send", t: "Send him back to his captain", fx: { flag: "child_sent_back", bond: { vasu: -1 } },
          text: "He goes, red to the ears. That evening he comes to your fire with a cut across his ribs and says it is nothing." }
      ]
    },
    {
      id: "wc_child_letter_2", act: 6, age: 44, war: true, away: true, when: (S) => childAway(S) && !!cmdOf(S), skipTo: "a6_day16", next: "a6_day16",
      art: "scene_letter_camp", place: "Your tent, the night Drona fell", caption: "A second letter, shorter", title: "Vasu's second letter",
      body: (S) => ["A second letter from Vasu.", { speaker: "Vasu", line: LETTER_2[cmdOf(S)] }],
      choices: [
        { id: "write", t: "Write back", fx: { bond: { vasu: 1 } }, text: "Three lines. The last one is about his mother's cooking, because you cannot think what else to say." },
        { id: "keep", t: "Keep it, and send nothing", fx: {}, text: "You fold it into the first one." }
      ]
    },
    {
      // Kaurava side: after the last day. The fate is settled as the scene opens.
      id: "wc_child_dusk", act: 6, age: 44, war: true, away: true, when: (S) => childAway(S) && S.side === "kaurava" && !!cmdOf(S), skipTo: "a6_duryodhana", next: "a6_duryodhana",
      enter: (S) => (K.childHurt(S) ? { die: "vasu", flag: "child_fell_war", journal: "Vasu fell on the last day of the war, where the last line broke." } : { flag: "child_survived_war" }),
      art: "war_day18", place: "Kurukshetra · the last evening", caption: "Looking for one face", title: "After the last day",
      body: (S) => [S.dead.includes("vasu")
        ? "You find Vasu at dusk among the dead, where the last line broke. The red thread is still on his wrist."
        : "At dusk you find Vasu alive, with someone else's blood on him."],
      choices: (S) => (S.dead.includes("vasu")
        ? [{ id: "carry", t: "Carry him to the pyres yourself", fx: { duty: { family: 1 } }, text: "He is heavier than he was at three, and lighter than you thought." },
          { id: "sit", t: "Sit with him until it is dark", fx: { attr: { wisdom: 1 } } }]
        : [{ id: "sit", t: "Sit down beside him", fx: { bond: { vasu: 1 } }, text: "Neither of you says anything for a long time. Then he asks if you are hungry, and you both laugh, and cannot stop." },
          { id: "away", t: "Take him off the field", fx: { duty: { family: 1 } } }])
    }
  ]);

  // The night of the raid: a child asleep in the camp, across it from you, is reached only by waking it.
  const raid = K.SCENES.a6_raid;
  if (raid) {
    const body = raid.body;
    raid.body = (S) => {
      const out = [].concat(K.val(body, S) || []);
      if (S.side === "pandava" && S.child === "vasu" && !S.dead.includes("vasu") && has(S, "vasu_away"))
        out.push({ memory: K.childInRaidCamp(S) ? "Vasu is asleep on the far side of the camp, too far to reach through the fire. Only a shout that wakes the whole camp will reach him." : "Vasu is not in the camp tonight. Satyaki took him along when Krishna led the brothers out to the river." });
      return out;
    };
    const wake = (raid.choices || []).find((c) => c.id === "wake");
    if (wake && !wake.hint) wake.hint = (S) => (K.childInRaidCamp(S) ? "The only way to reach Vasu" : null);
  }

  // =====================================================================================
  // The Shakti spent
  // =====================================================================================
  const karnaNear = (S) => S.side === "kaurava" && !S.dead.includes("karna") &&
    (S.friend === "karna" || ["anga", "suta"].includes(S.origin) || S.court === "anga" || (S.bonds.karna || 0) >= 6 || K.hasVow("spare_karna", S));
  const bhimaNear = (S) => S.side === "pandava" && (S.friend === "bhima" || (S.bonds.bhima || 0) >= 5 || S.exile === "forest");
  // How you are tied to the night of the Shakti (war_reach.js): "own" (near Karna, or near Bhima), or a
  // company posted there for the night, or the spot chosen on the morning's map.
  K.tieShakti = (S = K.S) => (S.side === "kaurava" ? (S.dead.includes("karna") ? null : K.reachTie(S, "shakti", karnaNear(S))) : S.side === "pandava" ? K.reachTie(S, "shakti", bhimaNear(S)) : null);

  K.encounter({
    id: "wc_e_ghost", title: "Ghatotkacha's night host", art: "fight_night_torches", caption: "Under the torches",
    hold: 5, hard: true, lethal: false, curse: true, allies: (S) => K.warAllies(S), spare: false, flee: { tags: ["retreat"] },
    holdText: "You are still standing. Around you, the line is not.",
    intro: "The rakshasas come out of the dark first, and above them the shape bends down over the line like a storm.",
    enemies: [K.foe("Ghatotkacha", 10, { abilities: ["strike", "heavy"], hero: true, person: "ghatotkacha", hp: 900, atk: 7 }),
      K.foe("Rakshasas of the night host", 4, { plural: true, person: "rakshasa", abilities: ["strike", "heavy"] })],
    // The call brings Karna, who is near.
    callHelp: (S) => ({ unit: K.UNITS.karna(S), stay: 2, text: "You shout for Karna. His chariot comes out of the dark, and his arrows go up into the shape and do not come down.", run: () => K.apply({ flag: "called_karna_night" }) }),
    beats: [{ round: 2, text: "Every torch on your side gutters at once. Something laughs, very high up.", run: (B) => B.living("friends").forEach((u) => B.status(u, "weakened", 1)) },
      { round: 4, text: "You cannot tell where the shape is. Your blows pass through it, and its mace does not.", run: (B) => { const p = B.living("player")[0]; if (p) B.status(p, "exposed", 2); } }],
    win: { fx: { flag: "ghost_held" }, text: "The host draws back into the dark to gather itself. The line on either side of you is gone." },
    lose: { fx: { flag: "ghost_broken" }, text: "The host goes over your stretch of the line. You come to on the ground among the dead, still alive." },
    flee: { fx: { flag: "ghost_fled" }, text: "You fall back toward Karna's chariot with everyone else." }
  });
  K.encounter({
    id: "wc_e_reach", title: "Through the dark to Karna", art: "fight_night_torches", caption: "Karna's chariot, across the torches",
    rounds: 5, lethal: false, curse: true, allies: (S) => K.warAllies(S), callHelp: K.warHelp, spare: false, flee: { tags: ["retreat"] },
    roundsText: "You cut through the last of Karna's guard, a spear's length from his wheel.",
    intro: "Between you and Karna's chariot: his guard, and a hundred torches moving.",
    enemies: [K.foe("Karna's chariot-guard", 4, { abilities: ["strike", "guard", "heavy"] }), K.foe("Kaurava torch-bearers", 3, { plural: true })],
    beats: [{ round: 3, text: "Ahead, Duryodhana's chariot is alongside Karna's, and Duryodhana is begging him.", run: () => {} },
      { round: 5, text: "Karna stands up in his chariot with something in his hand brighter than every torch on the field.", run: () => {} }],
    win: { fx: { flag: ["reached_karna", "shakti_tried_stop"], bond: { bhima: 1 }, memory: ["bhima", "You fought through the dark to Karna's chariot to stop the spear, the night my son fell."] }, text: "You are a spear's length from Karna's wheel when his arm comes back." },
    lose: { fx: { flag: "shakti_tried_stop", memory: ["bhima", "You tried to reach Karna's chariot before he threw, the night my son fell."] }, text: "The guard throws you back into the press. Over their heads you see Karna's arm come back." },
    flee: { text: "You pull back into the dark." }
  });
  Object.assign(K.COMMAND_FIGHT_BG, { wc_e_ghost: "fight_night_torches", wc_e_reach: "fight_night_torches" });

  const THROW = "The spear finds Ghatotkacha, and he falls on the Kaurava host like a hill.";
  const urge = (id, t, fx, text) => ({ id, t, fx: Object.assign({ moment: { kind: "shakti", from: "kaurava" } }, fx, { flag: [id === "silent" ? "shakti_silent" : "shakti_urged_" + id].concat(fx.flag || []) }), text });
  K.scenes([
    {
      id: "wc_shakti_k", act: 6, age: 44, war: true, away: true, when: (S) => S.side === "kaurava" && !!K.tieShakti(S), skipTo: "a6_day15", next: "wc_shakti_call",
      art: "fight_night_torches", place: "Kurukshetra · the night of day 14", caption: "The torches going out", title: "Ghatotkacha in the dark",
      body: (S) => ["Past midnight Ghatotkacha, Bhima's rakshasa son, comes as tall as the sky, and the Kaurava line breaks before him.",
        K.tieLine(S, K.tieShakti(S), { company: "Your company was posted beside Karna's chariot for the night.", general: "This morning you chose the ground near Karna's chariot. Tonight it is where the dark comes." }),
        "It is coming toward Karna's chariot."],
      choices: [
        { id: "stand", t: "Stand against it", combat: "wc_e_ghost", hint: "Hold out" },
        { id: "run", t: "Run for Karna's chariot", fx: {}, text: "You run back through the dark toward the one bow on your side the rakshasas are afraid of." }
      ]
    },
    {
      id: "wc_shakti_call", act: 6, age: 44, war: true, away: true, next: "a6_day15",
      art: "fight_night_torches", place: "Kurukshetra · the night of day 14", caption: "Karna's chariot", title: "The spear kept for Arjuna",
      body: (S) => [has(S, "called_karna_night") ? "Karna's chariot is beside you now, and his quiver is nearly empty." : "You reach Karna's chariot as his quiver runs low.",
        "Duryodhana begs Karna to use Indra's spear, kept for Arjuna, or there will be no army by morning.",
        "Karna looks at you."],
      choices: [
        urge("keep", "Keep it for Arjuna", { bond: { duryodhana: -1 }, memory: ["karna", "You told me to keep the spear for Arjuna. You were right."] },
          "Karna hears you. He looks at Duryodhana for a long breath, and then he throws it anyway."),
        urge("use", "Use it, and save the army", { bond: { duryodhana: 2 }, memory: ["karna", "You told me to throw the spear. I would have anyway."] },
          "Karna nods, as if you had said what he was already thinking, and throws."),
        urge("silent", "Say nothing", {}, "Karna does not seem to expect you to speak. He throws.")
      ],
      after: [THROW]
    },
    {
      id: "wc_shakti_p", act: 6, age: 44, war: true, away: true, when: (S) => S.side === "pandava" && !!K.tieShakti(S), skipTo: "a6_day15", next: "wc_shakti_p_fall",
      art: "fight_night_torches", place: "Kurukshetra · the night of day 14", caption: "Torches across the field", title: "To Karna's chariot",
      body: (S) => ["Past midnight Ghatotkacha comes out of the dark, and Karna's division breaks before him.",
        S.exile === "forest" ? { memory: "In the forest years he carried Draupadi over the mountain passes on his shoulders." } : null,
        K.tieLine(S, K.tieShakti(S), { company: "Your company was sent to stand with Ghatotkacha's host for the night.", general: "This morning you chose to stand near Ghatotkacha's host, and the dark has come." }),
        "Duryodhana drives to Karna's chariot, where Karna keeps Indra's spear for Arjuna."],
      choices: [
        { id: "reach", t: "Reach Karna before he throws", combat: "wc_e_reach", hint: "A fight through the dark" },
        { id: "stay", t: "Stay with Ghatotkacha's host", fx: { flag: "shakti_stayed", duty: { court: 1 } }, text: "You stay where the giant's host can see you, and shout the line back together each time it breaks." }
      ]
    },
    {
      id: "wc_shakti_p_fall", act: 6, age: 44, war: true, away: true, next: "a6_day15",
      enter: { moment: { kind: "shakti", from: "pandava" } },
      art: "battle_night", place: "The Pandava camp, before dawn", caption: "A giant on the ground", title: "Bhima's son",
      body: ["The spear finds Ghatotkacha, and he falls on the Kaurava host like a hill.",
        "Bhima sits beside his son. Across the camp Krishna laughs with relief: the spear is spent."],
      choices: [
        { id: "sit", t: "Sit beside Bhima", fx: { bond: { bhima: 2 }, flag: "sat_with_bhima", memory: ["bhima", "You sat with me the night my son fell."] },
          text: "He does not look at you. After a long time he puts his hand on your shoulder, and leaves it there until it is light." },
        { id: "tell", t: "Tell him his son saved Arjuna", fx: { bond: { bhima: 1 } }, text: "\"I know,\" Bhima says without looking up. \"Krishna told me. He was dancing.\"" },
        { id: "line", t: "Go back to the line", fx: { duty: { court: 1 } } }
      ]
    }
  ]);

  // Day 17: Karna's last words to you answer what you said to him on the fourteenth night.
  K.karnaLastWords = (S) => {
    if (has(S, "shakti_urged_keep")) return "You told me to keep the spear for him. You were right. I wanted you to hear me say it.";
    if (has(S, "shakti_urged_use")) return "You told me to throw it. Do not carry that. I would have thrown it if you had said nothing.";
    if (!has(S, "shakti_silent")) return null;
    if (has(S, "calmed_the_horse")) return "Do you remember the horse in the stable yard, the day of the drum? It put its head in your hands. I never learned how you did that.";
    if (has(S, "met_karna_young")) return "Do you remember rubbing down my father's horses, when we were small? I have not been as happy since.";
    return "My father kept horses. When I was small I slept in their stall to be warm. I keep thinking of that.";
  };
  const d17 = K.SCENES.a6_day17;
  if (d17) {
    const body = d17.body;
    d17.body = (S) => {
      const out = [].concat(K.val(body, S) || []), w = S.side === "kaurava" && K.karnaLastWords(S);
      if (w) out.push("This morning, on his way to Arjuna, Karna leaned out of his chariot and said one thing to you. It was the last.", ...[].concat(w).map((line) => ({ speaker: "Karna", line })));
      return out;
    };
  }

  // ---------- Where the scenes come ----------
  const before = (id, list) => { K.BEFORE[id] = (K.BEFORE[id] || []).concat(list); };
  const first = (id, list) => { K.BEFORE[id] = list.concat(K.BEFORE[id] || []); }; // ahead of what other files hung there
  before("a6_day1", ["wc_child_eve"]);
  first("a6_bhishma", ["wc_child_letter_1"]); // the ninth night, before the tenth morning
  before("a6_capture", ["wc_child_line"]);
  first("a6_day16", ["wc_child_letter_2"]);
  first("a6_day15", ["wc_shakti_k", "wc_shakti_p"]); // the night itself, before the council and the dawn array
  before("a6_duryodhana", ["wc_child_dusk"]);

  // ---------- What the telling says ----------
  (K.TELL_HOOKS = K.TELL_HOOKS || []).push((S, t, h) => {
    if (h("shakti_urged_keep")) t.push("On the fourteenth night {they} told Karna to keep the spear for Arjuna, and Karna threw it anyway.");
    else if (h("shakti_urged_use")) t.push("On the fourteenth night {they} told Karna to throw the spear he had kept for Arjuna, and he did.");
    else if (h("shakti_silent")) t.push("On the fourteenth night {they} stood beside Karna when he spent the spear he had kept for Arjuna, and said nothing.");
    if (h("reached_karna")) t.push("On the fourteenth night {they} cut through to Karna's chariot to stop the spear, and came a breath too late.");
    else if (h("shakti_tried_stop")) t.push("On the fourteenth night {they} tried to reach Karna's chariot before he threw, and could not.");
    if (h("sat_with_bhima")) t.push("{They} sat with Bhima the night his son fell.");
    if (cmdOf(S)) {
      if (S.dead.includes("vasu")) t.push("{They} tied a red thread on {their} son's wrist the night before the war, and Vasu did not come home.");
      else if (S.alive) t.push("{They} tied a red thread on {their} son's wrist the night before the war, and Vasu came home wearing it.");
    }
  });
})(window.K = window.K || {});
