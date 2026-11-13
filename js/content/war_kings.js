/* War storylines (PRD 18.13): Bhurishravas (#4) and your king falls (#6).
   Scenes here come before the war days through K.BEFORE, each only when it applies. Ids begin kb_
   (Bhurishravas, day 14) and kf_ (the kings, day 15).

   Who meets Bhurishravas: fighters on either side (front line, a chariot or a company; healers and
   bards stay in the tents) who are Yadava (born in Mathura or serving Dwaraka), lead a company
   (role_command), or are close to Satyaki (bond 4 or more). On the Kaurava side, also the Kuru court's
   own fighters (serving Hastinapura): Bhurishravas is a Kuru, of Bahlika's house, and the old court's
   levies stand in his division.
   Who meets the kings' fall: Pandava-side players born in Panchala or Matsya, or serving Drupada's or
   Virata's court (the court served comes first). The moment Dhrishtadyumna goes for Drona is also
   met by Drona's own students on either side.

   Canon is untouched: Arjuna's arrow takes Bhurishravas's arm and Satyaki beheads him; Drona kills
   Drupada and Virata, and Dhrishtadyumna kills Drona as he sits. The player holds, tries, carries,
   looks away, and is remembered for it.
   Flags: kb_held_full / kb_held_short / kb_fell_back, kb_tried_stop, kb_held_arms, kb_looked_away,
   kb_carried_body, kb_left_body, kb_said_*; kf_carried_king, kf_rode_with_dhrishta, kf_broke_debt,
   kf_tried_stop_d, kf_kept_away, kf_stood_between, kf_let_it_happen, kf_took_word, kf_stayed.
   Second pass (2 Nov): every Pandava fighter is ordered to ride with Satyaki through the Kaurava army
   on day 14 (kb_ride); riding leads on to Bhurishravas, refusing keeps you by Yudhishthira. On day 15
   every Pandava on the field meets the cry "Ashwatthama is dead" (kf_cry), which is a lie for the vow
   never to lie. The night debate moves to the night of day 15 and argues both deaths.
   Flags: kb_rode, kb_ride_through, kb_stayed_king, kf_cried, kf_silent, kf_ash_knows.
   S.kbRide: how fresh Satyaki is when Bhurishravas finds him (2 fresh, 1 worn, 0 spent).
   S.kbHeld: the rounds Bhurishravas was held off Satyaki (0 to 6). S.missed: scenes passed by while
   away from the camp (a ride home), which K.BEFORE no longer offers (engine/flow.js). */
(function (K) {
  "use strict";

  Object.assign(K.PEOPLE, {
    satyaki: { name: "Satyaki", canon: true }, bhurishravas: { name: "Bhurishravas", canon: true },
    drupada: { name: "Drupada", canon: true }, virata: { name: "Virata", canon: true }, dhrishtadyumna: { name: "Dhrishtadyumna", canon: true }
  });
  // Bhurishravas needs a figure of his own in the fight (puppet.js loads after the content, so he
  // joins on the first scene). Satyaki's figure lives in K.PUPPETS itself (ui/puppet.js).
  const PUPPETS = {
    bhurishravas: { pronoun: "he", headgear: "crown", crown: { gem: "#2f7d55", tall: 0.9, trim: "#6b4a2a" }, palette: ["#c08a56", "#efe6cf", "#c9a24e"], beard: true, item: "sword", stance: "proud", stage: "adult", size: 1.1 }
  };

  const has = (S, f) => S.flags.includes(f);
  const fighter = (S) => ["role_front", "role_chariot", "role_command"].some((f) => has(S, f));
  const yadava = (S) => S.origin === "mathura" || S.court === "dwaraka";
  const nearBhurishravas = (S) => fighter(S) && (
    S.side === "pandava" ? has(S, "role_command") || yadava(S) || (S.bonds.satyaki || 0) >= 4
      : S.side === "kaurava" ? has(S, "role_command") || yadava(S) || S.court === "hastinapura" : false);
  // Day 14's order to ride with Satyaki reaches every Pandava fighter. Those who ride meet
  // Bhurishravas; those who stay with Yudhishthira do not. The Kaurava side keeps the old rules.
  const pandavaFighter = (S) => S.side === "pandava" && fighter(S);
  // How you are tied to Bhurishravas's day (war_reach.js): every Pandava fighter has the order to ride;
  // on the Kaurava side "own" (above), or a company, or the spot chosen on the morning's map.
  K.tieBhuri = (S = K.S) => (S.side === "pandava" ? (pandavaFighter(S) ? "own" : null) : S.side === "kaurava" ? K.reachTie(S, "bhuri", nearBhurishravas(S)) : null);
  const meetsDrag = (S) => (S.side === "pandava" ? has(S, "kb_rode") : !!K.tieBhuri(S));
  const ride = (S) => (S.kbRide != null ? S.kbRide : 1);
  const onField = (S) => S.side === "pandava" && !has(S, "role_healer") && !has(S, "role_bard");
  const HOLD = 6; // the most rounds before Arjuna's arrow comes
  const held = (S) => (S.kbHeld != null ? S.kbHeld : has(S, "kb_held_full") ? HOLD : 2);

  // Your king: the court you serve, else the land you were born in.
  const KINGS = { drupada: { who: "Drupada", home: "Kampilya" }, virata: { who: "Virata", home: "Viratanagara" } };
  const BY_LAND = { panchala: "drupada", matsya: "virata" };
  const homeKing = (S) => BY_LAND[S.court] || BY_LAND[S.origin] || null;
  // Or a king you served: Drupada's great bow strung at Kampilya, Virata's herd or court in the hidden year.
  const kingOf = (S) => homeKing(S) || (has(S, "strung_great_bow") ? "drupada" : has(S, "turned_herd") || has(S, "kept_false_name") ? "virata" : null);
  // How you are tied to the kings' fall (war_reach.js): "own" (your king), "company", or "general" (the map).
  K.tieKings = (S = K.S) => (S.side === "pandava" ? K.reachTie(S, "kings", !!kingOf(S)) : null);
  const KP = (S) => KINGS[kingOf(S)] || KINGS.drupada;
  const pupil = (S) => S.teacher === "drona";
  const nearDrona = (K.nearDrona = (S = K.S) => (S.side === "pandava" && (S.seen.includes("kf_fall") || pupil(S) || has(S, "spot_drona"))) || (S.side === "kaurava" && pupil(S)));

  // A test of your strongest kind: a hand on the sword arm (Might and Mace) or a voice that carries
  // (Command and Statecraft).
  const strongest = (S) => (K.attr("might", S) + (S.skills.mace || 0) >= K.attr("command", S) + (S.skills.statecraft || 0) ? { attr: "might", skill: "mace" } : { attr: "command", skill: "statecraft" });

  K.scenes([
    // ---------- Day 14: Bhurishravas ----------
    {
      id: "kb_ride", act: 6, age: 44, war: true, away: true, when: pandavaFighter, skipTo: "a6_day14", next: "a6_day14",
      art: "war_day14", place: "Kurukshetra · day 14", caption: "Yudhishthira's order",
      title: "Ride with Satyaki",
      body: (S) => ["No word has come from Arjuna since dawn. Yudhishthira sends for you.",
        { speaker: "Yudhishthira", line: "Satyaki is going through to find him. Ride with him." },
        has(S, "met_satyaki") ? { memory: "Satyaki knows your face from Drupada's hall, the day of the swayamvara." } : null],
      choices: [
        { id: "ride", t: "Ride with Satyaki", combat: "e_kb_ride", fx: { flag: "kb_rode" }, hint: "Ride well, and he arrives fresher" },
        { id: "stay", t: "Stay and guard Yudhishthira",
          fx: { flag: "kb_stayed_king", duty: { court: 1 }, bond: { satyaki: -2, yudhishthira: 1 }, memory: ["satyaki", "You stayed behind with the king the day I rode for Arjuna."], journal: "On the fourteenth day you stayed to guard Yudhishthira when Satyaki rode through the Kaurava army." },
          text: "Satyaki rides alone, and you stand at Yudhishthira's wheel all day. By evening the army knows what happened to Satyaki when he got through." }
      ]
    },
    {
      id: "kb_drag", act: 6, age: 44, war: true, away: true, when: meetsDrag, skipTo: "a6_day14", next: "a6_day14",
      art: "fight_war_field", place: "Kurukshetra · day 14", caption: (S) => (S.side === "kaurava" ? "The Yadava guard closing in" : "Bhurishravas over Satyaki"),
      title: (S) => (S.side === "kaurava" ? "The Yadava guard" : "Satyaki in the dust"),
      body: (S) => (S.side === "kaurava"
        ? ["Bhurishravas has Satyaki down, and Satyaki's Yadava guard is closing in.",
          K.tieLine(S, K.tieBhuri(S), { general: "You chose his part of the field this morning, and so you are near when it happens." })]
        : [has(S, "kb_rode") ? (ride(S) >= 2 ? "At noon Satyaki's horses go down under him, past the last of the Kaurava lines. He is on his feet at once, sword out, and that is when Bhurishravas finds him."
              : "At noon Satyaki's horses go down under him. He has fought every line twice, and he can barely lift his sword when Bhurishravas finds him.")
            : "At noon, Bhurishravas catches Satyaki with his horses dead.",
          "Bhurishravas drags Satyaki by the hair, sword raised."]),
      choices: [
        { id: "hold", t: "Hold Bhurishravas off", req: { side: "pandava" }, combat: "e_kb_hold", hint: "Each round held saves Satyaki pain" },
        { id: "through", t: "Cut through to Bhurishravas", req: { side: "kaurava" }, combat: "e_kb_guard", hint: "Won by getting through, not by killing" }
      ]
    },
    {
      id: "kb_sits", act: 6, age: 44, war: true, away: true, art: "scene_bhurishravas", place: "Kurukshetra · day 14", caption: "A seat of arrows on the open field",
      title: "Bhurishravas sits down",
      body: (S) => {
        const n = held(S);
        return S.side === "kaurava"
          ? ["Bhurishravas sits on his arrows facing the sun, his arm in the dust. Satyaki has a sword.",
            "You run, and Satyaki's sword comes down before you are halfway."]
          : ["Arjuna's arrow has cut off Bhurishravas's arm. He sits down on his arrows, facing the sun, to wait for death.",
            { memory: n >= 5 ? "Satyaki gets up with nothing worse than a cut scalp. You held long enough for that." : n >= 2 ? "Satyaki gets up bleeding from the head and the shoulder. It could have been worse." : "Satyaki gets up at last with his scalp opened and his shoulder cut through. You could not hold long enough." },
            "Satyaki picks up a sword.",
            has(S, "kb_rode") ? { speaker: "Satyaki", line: ride(S) >= 2 ? "I came through seven divisions today for Arjuna. No man drags me by the hair and lives." : "Seven divisions. I came through seven divisions for Arjuna, and this old man thought I was his to drag." } : null,
            K.hasVow("spare_unarmed", S) ? { aside: "You swore never to strike the unarmed." } : null];
      },
      choices: (S) => {
        if (S.side === "kaurava") return [
          { id: "carry", t: "Carry his body back to his men", fx: { rep: { kuru: 1 }, duty: { court: 1 }, flag: "kb_carried_body", memory: ["all", "You came for Bhurishravas, and carried him back to his own lines."], journal: "On the fourteenth day you came too late to save Bhurishravas, and carried him back to his own lines." },
            text: "You and two of his men carry him back to the Kuru lines on a broken chariot board. They will remember who came." },
          { id: "leave", t: "Leave him", fx: { flag: "kb_left_body" }, text: "You leave him in the dust with his arrows. Someone else will carry him." }
        ];
        const st = strongest(S);
        return [
          { id: "stop", t: st.attr === "might" ? "Catch Satyaki's sword arm" : "Call out to Satyaki that the man is at prayer",
            fx: { duty: { conscience: 2 }, bond: { satyaki: -3 }, rep: { sages: 1 }, flag: "kb_tried_stop", memory: ["yudhishthira", "You tried to stop Satyaki's sword when Bhurishravas sat at prayer."], journal: "On the fourteenth day you tried to stop Satyaki from killing Bhurishravas at his prayer." },
            check: Object.assign({ dc: 9 }, st, {
              pass: { fx: { flag: "kb_stayed_a_breath" }, text: "For a breath Satyaki stops, and Bhurishravas finishes his prayer. Then Satyaki strikes." },
              fail: { text: "Satyaki goes past you as if you were not there. The sword comes down." } }) },
          { id: "arms", t: "Hold him for Satyaki", tags: ["strike_unarmed"], fx: { duty: { conscience: -2 }, bond: { satyaki: 3 }, flag: "kb_held_arms", journal: "On the fourteenth day you held Bhurishravas's arm while Satyaki killed him at his prayer." },
            text: "You hold his one arm, and he does not fight you. Satyaki strikes." },
          { id: "away", t: "Look away", fx: { flag: "kb_looked_away" }, text: "You look at the ground. You hear it anyway." }
        ];
      },
      after: ["Satyaki says he swore long ago to kill any man who struck him on the ground."],
      next: "a6_day14"
    },
    // The night of day 15, at the council or around the fire: both camps argue about two deaths on two
    // days, and what you did in each is quoted back at you. For anyone who did either.
    {
      id: "kb_debate", act: 6, age: 44, war: true, away: true, when: (S) => S.seen.includes("kb_sits") || S.seen.includes("kf_drona") || has(S, "kf_cried"), skipTo: "a6_day16", next: "a6_day16",
      art: (S) => (has(S, "role_council") ? "scene_war_council" : "battle_night"), place: "The camp, the night of day 15", caption: (S) => (has(S, "role_council") ? "The war council" : "Around the fire"),
      title: "Was it dharma?",
      body: (S) => [
        has(S, "role_council") ? "Late in the night the torches burn down. The council sits anyway, and before anyone speaks of tomorrow, it argues about two deaths: Bhurishravas at his prayer yesterday, and Drona with his bow on his knees today."
          : "Around the fire they argue about two deaths: Bhurishravas at prayer, and Drona with his bow laid down.",
        S.side === "kaurava" ? { speaker: "One of Bhurishravas's men", line: "A man at prayer, and an old man tricked by a lie. Put that in your songs." }
          : S.seen.includes("kb_sits") ? { speaker: "Satyaki", line: "He dragged me by the hair while I lay on the ground. I swore long ago what I would do to the man who did that." }
          : { speaker: "Dhrishtadyumna", line: "He killed my father this morning. Ask me again whether it was dharma." },
        has(S, "kb_held_arms") ? { memory: "Someone says that you held the old man's arm for Satyaki. Nobody answers for you." }
          : has(S, "kb_tried_stop") ? { memory: "Someone says that you tried to stop Satyaki. Everyone looks at you, and Satyaki looks longest." }
          : has(S, "kb_looked_away") ? { memory: "Someone says you were there. \"What did you see?\" You saw the ground." }
          : has(S, "kb_carried_body") ? { memory: "\"You came for him,\" one of his men says to you. \"We saw.\"" }
          : has(S, "kb_left_body") ? { memory: "\"You were there,\" one of his men says to you. \"You left him in the dust.\"" } : null,
        has(S, "kf_rode_with_dhrishta") ? { memory: "Someone says you rode at Dhrishtadyumna's wheel to Drona's chariot." }
          : has(S, "kf_tried_stop_d") ? { memory: "Someone says you caught at Dhrishtadyumna's arm. He does not look at you." }
          : has(S, "kf_stood_between") ? { memory: "Someone says you stood between Drona and the sword, and has your scar to prove it." }
          : has(S, "kf_let_it_happen") ? { memory: "Someone says you were ten paces from your teacher, and did not move." }
          : has(S, "kf_cried") ? { memory: "Someone says you shouted it with the rest: Ashwatthama is dead." }
          : has(S, "kf_silent") ? { memory: "Someone says you would not shout it, when the whole line did." } : null
      ],
      choices: (S) => {
        const d14 = S.seen.includes("kb_sits"), d15 = S.seen.includes("kf_drona") || has(S, "kf_cried");
        return [
          { id: "adharma", t: "Neither was dharma",
            fx: S.side === "kaurava" ? { duty: { conscience: 1 }, rep: { sages: 1, kuru: -1 }, flag: "kb_said_adharma" }
              : { duty: { conscience: 1 }, rep: { sages: 1 }, bond: Object.assign({}, d14 ? { satyaki: -1 } : {}, d15 ? { dhrishtadyumna: -1 } : {}), flag: "kb_said_adharma" },
            text: S.side === "kaurava" ? "\"Bhurishravas dragged a fallen man by the hair, and Drona led the wheel that killed a boy. None of it was dharma.\""
              : "\"A man at prayer, and an old man tricked into laying down his bow. None of it was dharma.\" Somebody leaves the fire." },
          S.side === "kaurava"
            ? { id: "murder", t: "They were murdered, and the Pandavas will answer for it", fx: { duty: { court: 1 }, rep: { kuru: 1 }, flag: "kb_said_murder" }, text: "His men beat their spear-butts on the ground. By morning the whole army is saying it." }
            : { id: "war", t: "They had no claim to mercy", fx: { duty: { court: 1 }, bond: Object.assign({}, d14 ? { satyaki: 1 } : {}, d15 ? { dhrishtadyumna: 1 } : {}), flag: "kb_said_war" }, text: "A few of them nod at you. Nobody else says anything for a while." },
          { id: "silent", t: "Say nothing", fx: {}, text: "You say nothing. The argument goes round without you, and comes back, and goes round again." }
        ];
      }
    },

    // ---------- Day 15: your king falls ----------
    {
      id: "kf_reach", act: 6, age: 44, war: true, away: true, when: (S) => !!K.tieKings(S), skipTo: "a6_day15", next: "a6_day15",
      art: "war_capture", place: "Kurukshetra · day 15", caption: "Two white parasols",
      title: (S) => (kingOf(S) === "virata" ? "Virata's parasol" : "Drupada's parasol"),
      body: (S) => ["Drona drives at the Panchala and Matsya lines. Drupada and Virata ride out to meet him.",
        K.tieLine(S, K.tieKings(S), { company: "Your company was posted to the Panchala lines before dawn. Drupada is not your king, but his men are yours today.",
          general: "You came to the Panchala lines this morning by choice. Drupada is not your king, and nobody here knows your name." }),
        ["You are a hundred paces behind {who}.", { who: KP(S).who }]],
      choices: (S) => [{ id: "reach", t: homeKing(S) ? "Cut through to your king" : "Cut through to the kings", combat: "e_kf_reach", hint: "Won by getting through, not by killing" }]
    },
    {
      id: "kf_fall", act: 6, age: 44, war: true, away: true, art: "scene_kings_fall", place: "Kurukshetra · day 15", caption: "A white parasol in the dust",
      title: "The king falls",
      body: (S) => ["Drona's arrows find the two old kings. Drupada falls, then Virata.",
        ["{who} is dead when you reach him. The arrows are still coming.", { who: KP(S).who }]],
      choices: [{ id: "carry", t: "Carry him off the field", game: "steady", hint: "A test of strength",
        trial: { attr: "might", skill: "mace", stage: "fight_war_field", verb: "Carry", secs: 16,
          help: "Hold to take his weight; let go when you stagger. Keep your feet over the glow until you reach the line.", tally: "Back to the line: {c}% · {s} seconds",
          wonLine: "You lay him down behind your own line.", nearLine: "Ten paces short, an arrow takes you in the shoulder.", lostLine: "An arrow takes you in the shoulder, and you go down under him.",
          rules: (S) => ["Hold to take {who}'s weight; ease off when you stagger.", { who: KP(S).who }],
          stakes: ["You bring him back to his own people, and nothing touches you.", "An arrow finds you on the way. You still bring him back."] },
        win: { fx: (S) => ({ flag: "kf_carried_king", rep: { common: 1 }, journal: { src: "On the fifteenth day you carried {who} from the field under Drona's arrows.", p: { who: KP(S).who } } }),
          text: "You lay him down behind your own line. His charioteer's boy is there, and covers his face with the edge of his own cloth." },
        // A failure costs a wound, never the body: you still bring him back.
        lose: { fx: (S) => ({ flag: "kf_carried_king", injury: "arm", journal: { src: "On the fifteenth day you carried {who} from the field under Drona's arrows, and took an arrow doing it.", p: { who: KP(S).who } } }),
          text: "An arrow goes into your shoulder, and you go down under him. You bring him the rest of the way with one arm." } }],
      next: "a6_day15"
    },
    // The cry, before the half-truth: Bhima's elephant is dead, and the whole Pandava line is told to
    // shout that Ashwatthama is. Shouting it is a lie (the vow never to lie breaks with its full price).
    // Drona falls either way: only Yudhishthira's word makes him believe it (a6_day15).
    {
      id: "kf_cry", act: 6, age: 44, war: true, away: true, when: onField, skipTo: "a6_day15", next: "a6_day15",
      art: "war_day15", place: "Kurukshetra · day 15", caption: "An elephant named Ashwatthama",
      title: "Ashwatthama is dead",
      // Ashwatthama hears who tried to stop Satyaki's sword the day before his father died.
      enter: (S) => (has(S, "kb_tried_stop") ? { flag: "kf_ash_knows", memory: ["ashwatthama", "You tried to stop Satyaki's sword when Bhurishravas sat at prayer, the day before my father died."] } : null),
      body: (S) => ["Bhima kills an elephant named Ashwatthama and roars that Ashwatthama is dead.",
        { speaker: "Dhrishtadyumna", line: "Shout it, all of you!" },
        pupil(S) ? { memory: "Drona taught you everything you know." } : null,
        K.hasVow("never_lie", S) ? { aside: "You swore never to lie." } : null],
      choices: (S) => [
        { id: "cry", t: "Shout it: Ashwatthama is dead", tags: ["lie"],
          fx: { flag: ["spread_the_lie", "kf_cried"], bond: { dhrishtadyumna: 2 }, rep: { pandava: 1 }, duty: pupil(S) ? { conscience: -2, teacher: -4 } : { conscience: -2 },
            journal: pupil(S) ? "On the fifteenth day you shouted that Ashwatthama was dead, at your own teacher, and saw his face when he heard it." : "On the fifteenth day you helped spread the half-truth that killed Drona." },
          text: pupil(S) ? "You shout it with the rest. Across the field Drona's head turns toward the sound, and you will see his face for the rest of your life."
            : "You shout it with the whole line until your throat is raw. Dhrishtadyumna rides past and strikes your shield with his sword, for joy." },
        { id: "silent", t: "Stay silent", fx: pupil(S) ? { duty: { conscience: 1 }, flag: ["refused_lie", "kf_silent"], memory: ["dhrishtadyumna", "You would not shout it when your teacher was the one to hear it."] }
            : { duty: { conscience: 1 }, flag: ["refused_lie", "kf_silent"], memory: ["bhima", "You would not shout it with the rest of us."] },
          text: pupil(S) ? "You keep your mouth shut. Dhrishtadyumna sees it as he rides past, and looks at you the way he looks at Drona's men."
            : "You keep your mouth shut while the whole line shouts. Bhima sees it from the top of the dead elephant, and he does not forget it." }
      ]
    },
    // The moment Dhrishtadyumna goes for Drona, after the half-truth (a6_day15).
    {
      id: "kf_drona", act: 6, age: 44, war: true, away: true, when: nearDrona, skipTo: "a6_day16", next: "a6_day16",
      art: "war_day15", place: "Kurukshetra · day 15", caption: "Drona with his bow laid down",
      title: "Dhrishtadyumna's sword",
      body: (S) => {
        const warned = S.log.includes("a6_day15:warn");
        return S.side === "kaurava"
          ? [warned ? "You rode to his chariot to tell him his son was alive, and he did not hear you. Now he lays his bow across his knees and closes his eyes, and you are ten paces away."
              : "You reach Drona as he lays his bow across his knees and closes his eyes.",
            "Dhrishtadyumna is coming on foot with a sword.",
            { memory: "Drona taught you everything you know." }]
          : [warned ? "You told him his son was alive, and he did not hear you. Now he has laid his bow across his knees and closed his eyes." : "Drona has laid his bow across his knees and closed his eyes.",
            "Dhrishtadyumna jumps down with a sword, his father's blood still on his armour.",
            pupil(S) ? { memory: "Drona taught you everything you know." } : null];
      },
      choices: (S) => {
        if (S.side === "kaurava") return [
          { id: "step", t: "Step in front of your teacher", fx: { duty: { teacher: 3, court: 1 }, flag: "kf_stood_between" },
            peril: { kind: "death", flag: "died_for_drona", art: "war_day15", caption: "Drona with his bow laid down", text: "His sword does not stop for you.",
              spareText: "His sword opens you from shoulder to hip. You wake in the healers' tents with a scar you will carry all your life.",
              deathText: "{They} stepped between Dhrishtadyumna's sword and Drona, {their} teacher, on the fifteenth day." },
            check: { attr: "might", skill: "mace", dc: 9,
              pass: { fx: { bond: { ashwatthama: 2 }, memory: ["ashwatthama", "You stood between my father and the sword."] }, text: "A shoulder, the flat of the sword, and you are in the dust and he is past you. You hear it from the ground." },
              fail: { fx: { injury: "arm" }, text: "His sword opens your arm to the bone, and he is past you before you hit the ground." } } },
          { id: "let", t: "Let it happen", fx: { duty: { teacher: -2, conscience: -1 }, flag: "kf_let_it_happen" }, text: "You do not move. Afterwards you cannot say why, and nobody asks." }
        ];
        // Drona's students feel this hardest: riding with him breaks the teacher's debt for good, and
        // Drona takes back the weapon he gave (its condition: never against one who cannot fight back).
        const p = pupil(S), takes = p && S.astra && S.astra.from === "drona" && !S.astra.broken && S.boons.includes("astra");
        const st = strongest(S);
        return [
          { id: "ride", t: "Ride with him", fx: Object.assign({ duty: p ? { conscience: -1, teacher: -10 } : { conscience: -1 }, bond: { dhrishtadyumna: 1 }, flag: p ? ["kf_rode_with_dhrishta", "kf_broke_debt"] : "kf_rode_with_dhrishta",
            journal: p ? "On the fifteenth day you rode with Dhrishtadyumna to your own teacher's chariot, and broke your debt to Drona for good." : "On the fifteenth day you rode with Dhrishtadyumna to Drona's chariot." }, takes ? { astraBreak: true } : {}),
            hint: p ? (takes ? "Your debt to Drona is broken for good, and he takes back the weapon he gave you" : "Your debt to Drona is broken for good") : null,
            text: "You ride at his wheel to Drona's chariot, and see him climb up into it. The old man does not open his eyes." },
          { id: "stop", t: st.attr === "might" ? "Catch Dhrishtadyumna's arm" : "Call out to Dhrishtadyumna to let the old man be",
            fx: { duty: p ? { conscience: 2, teacher: 2 } : { conscience: 2 }, bond: { dhrishtadyumna: -2 }, flag: "kf_tried_stop_d", journal: "On the fifteenth day you tried to stop Dhrishtadyumna's sword when Drona sat unarmed." },
            check: Object.assign({ dc: 9 }, st, has(S, "kb_held_arms") ? {
              pass: { fx: { flag: "kf_saw_drona_go" }, text: "\"Yesterday you held an old man's arm for Satyaki,\" he says, and stops for one breath. In it you see that Drona's face is already empty, and then he pulls free." },
              fail: { text: "\"Yesterday you held an old man's arm for Satyaki,\" he says, and shakes you off and climbs into the chariot." } } : {
              pass: { fx: { flag: "kf_saw_drona_go" }, text: "He stops for one breath, and the old man's face is already empty. Then Dhrishtadyumna pulls free and climbs into the chariot." },
              fail: { text: "He goes past you without turning his head, and climbs into the chariot." } }) },
          { id: "away", t: "Keep away", fx: { flag: "kf_kept_away" }, text: "You turn your horse away. Behind you the shouting changes, and you know it is done." }
        ];
      },
      after: ["Ashwatthama hears how his father died and swears the Pandavas will pay."]
    },
    // That night the king's household asks you to take word home. Going means missing the rest of
    // the night in the camp; the war's road picks up again on the sixteenth day.
    {
      id: "kf_word", act: 6, age: 44, war: true, away: true, when: (S) => S.seen.includes("kf_fall") && !!homeKing(S), skipTo: "a6_day16", next: "a6_day16",
      art: "scene_letter_camp", place: "The camp, the night of day 15", caption: "The king's ring in a cloth",
      title: "Word for home",
      body: (S) => [["{who}'s old steward brings you the king's ring.", { who: KP(S).who }],
        ["\"Take it home to the queen in {home},\" he says.", { home: KP(S).home }]],
      choices: (S) => [
        { id: "home", t: ["Take the ring home to {home}", { home: KP(S).home }], hint: "You will miss the night in camp",
          fx: { duty: { family: 2 }, flag: "kf_took_word", journal: { src: "On the night of the fifteenth day you took {who}'s ring home to the queen in {home}.", p: { who: KP(S).who, home: KP(S).home } } },
          resolve: (S2) => { const list = K.BEFORE.a6_day16 || [], i = list.indexOf("kf_word"); return { set: { missed: (Array.isArray(S2.missed) ? S2.missed : []).concat(list.slice(i + 1).filter((id) => !S2.seen.includes(id))) } }; },
          text: "You ride through the night and put the ring in the queen's hand. By the time you are back, the sixteenth day has begun." },
        { id: "stay", t: "Stay with the army", fx: { duty: { court: 1 }, flag: "kf_stayed" }, text: "The steward nods and goes to find a runner. You stay where the king left you." }
      ]
    }
  ]);

  // ---------- Encounters ----------
  // Arjuna's arrow comes from very far away: Arjuna himself is never near enough to answer a call.
  const nearHelp = (S) => (S.friend === "arjuna" && !S.dead.includes("arjuna") ? { text: "You shout for Arjuna. He is far across the field, cutting his way toward Jayadratha, and his chariot does not turn." } : K.warHelp(S));
  const ARM = "an arrow from far across the field takes off his arm, sword and all.";
  // The ride: a holding fight through the Kaurava divisions, with Satyaki at your side. How well you
  // ride sets how worn out he is when Bhurishravas finds him (S.kbRide, counted when the fight ends).
  const SATYAKI = () => ({ name: "Satyaki", hp: 70, atk: 9, def: 3, abilities: ["strike", "heavy"], person: "satyaki", armed: true });
  const RIDE = 5;
  K.encounter({
    id: "e_kb_ride", title: "Through the Kaurava army", art: "fight_war_chariot", caption: "Five rounds to Arjuna's dust", hold: RIDE, hard: true, lethal: false, curse: true,
    allies: (S) => [SATYAKI()].concat(K.warAllies(S).slice(0, 1)), callHelp: K.warHelp, spare: false, flee: null,
    holdText: "Far ahead, over the heads of the last line, you see the dust of Arjuna's chariot.",
    intro: "Satyaki goes into the Kaurava array as if it were water. You ride at his left wheel, and the lines close behind you both.",
    enemies: [K.foe("Kuru chariot-archers", 5, { plural: true, abilities: ["strike", "arrows"], hp: 260, atk: 6 }), K.foe("Kamboja horsemen", 4, { plural: true, abilities: ["strike", "heavy"], hp: 220, atk: 6 })],
    beats: [
      { round: 2, text: "Drona himself bars the road. Satyaki bows to him from the chariot and goes round him. \"Teacher, I have no time today.\"", run: (B) => B.living("player").forEach((u) => B.status(u, "inspired", 1)) },
      { round: 4, text: "Satyaki's horses are lathered and his sword arm is slowing. \"Keep up,\" he says again, and this time he is saying it to himself.",
        run: (B) => B.units.filter((u) => u.person === "satyaki" && u.hp > 0).forEach((u) => B.status(u, "exposed", 1)) }
    ],
    win: { next: "kb_drag", fx: { flag: "kb_ride_through", bond: { satyaki: 2 }, journal: "On the fourteenth day you rode with Satyaki through the Kaurava army to find Arjuna." }, text: "You break the last line together, and Satyaki laughs, out of breath. Then his horses stumble." },
    lose: { next: "kb_drag", fx: { journal: "On the fourteenth day you tried to ride with Satyaki through the Kaurava army, and fell behind." }, text: "They pull you off his wheel. Satyaki goes on alone, and by the time you catch him up he has fought every line twice." }
  });
  K.kbRideCount = (B) => {
    if (!B || !B.over || B._kr || !B.enc || B.enc.id !== "e_kb_ride") return;
    B._kr = true;
    const sat = B.units.find((u) => u.person === "satyaki");
    K.S.kbRide = B.over === "win" ? (sat && sat.hp >= sat.maxHp / 2 ? 2 : 1) : B.round - 1 >= 3 ? 1 : 0;
  };
  K.on("combat", K.kbRideCount);
  K.encounter({
    id: "e_kb_hold", title: "Over Satyaki", art: "fight_war_field", caption: "Six rounds at most", hold: HOLD, hard: true, lethal: false, curse: true, plan3: "charge", fallen: "satyaki", // (in 3D: he charges and may call you out; Satyaki lies behind you)
    allies: (S) => K.warAllies(S), callHelp: nearHelp, spare: false,
    holdText: "From very far away, an arrow is already in the air.",
    intro: "Bhurishravas lets go of Satyaki's hair and turns his sword on you. Behind you, Satyaki tries to get up, and cannot.",
    enemies: (S) => [K.foe("Bhurishravas", 9, { abilities: ["strike", "heavy"], hero: true, person: "bhurishravas", hp: 800, atk: has(S, "kb_rode") ? [8, 7, 6][ride(S)] : 7 }), K.foe("Kuru spearman", 3)],
    beats: [
      { round: 3, text: "Behind you Satyaki gets to one knee and shouts your name. Your arm remembers what it is for.", run: (B) => B.living("player").forEach((u) => B.status(u, "inspired", 1)) },
      { round: 5, text: "Bhurishravas fights the old way, without a wasted step, and he is not tired yet.", run: (B) => B.living("player").forEach((u) => B.status(u, "exposed", 1)) }
    ],
    win: { next: "kb_sits", fx: { flag: "kb_held_full", bond: { satyaki: 3 }, journal: "On the fourteenth day you held Bhurishravas off Satyaki until Arjuna's arrow came." }, text: "You are still standing over Satyaki when " + ARM },
    lose: { next: "kb_sits", fx: (S) => ({ flag: "kb_held_short", bond: { satyaki: Math.floor(held(S) / 2) } }), text: "You go down beside Satyaki. As Bhurishravas lifts his sword again, " + ARM },
    flee: { tags: ["retreat"], next: "kb_sits", fx: (S) => ({ flag: "kb_fell_back", bond: { satyaki: Math.floor(held(S) / 2) - 1 } }), text: "You fall back. As Bhurishravas lifts his sword over Satyaki, " + ARM }
  });
  K.encounter({
    id: "e_kb_guard", title: "Satyaki's Yadava guard", art: "fight_war_field", caption: "Five rounds to get through", hold: 5, hard: true, lethal: false, curse: true,
    allies: (S) => K.warAllies(S), callHelp: K.warHelp, spare: false, flee: null,
    holdText: "The Yadava shields part. You are through.",
    intro: "The Yadavas lock their shields across your road. Beyond them, in the dust, Bhurishravas still has Satyaki down.",
    enemies: [K.foe("Satyaki's Yadava guard", 5, { plural: true, abilities: ["strike", "guard", "heavy"], hp: 300, atk: 6 }), K.foe("Yadava archers", 4, { plural: true, abilities: ["strike", "arrows"], hp: 180, atk: 5 })],
    win: { next: "kb_sits", text: "You come through the last of the guard as " + ARM },
    lose: { next: "kb_sits", fx: { injury: "scar" }, text: "They throw you back twice. When you get through at last, bleeding, " + ARM }
  });
  K.encounter({
    id: "e_kf_reach", title: "Through Drona's division", art: "fight_between_lines", caption: "Five rounds to the parasols", hold: 5, hard: true, lethal: false, curse: true,
    allies: (S) => K.warAllies(S), callHelp: K.warHelp, spare: false, flee: null,
    holdText: "The chariots in front of you give way.",
    intro: "Drona's chariots wheel between you and the two white parasols. Every one of them has the same order: keep the kings alone.",
    enemies: [K.foe("Chariot-warriors of the Kuru host", 5, { plural: true, abilities: ["strike", "arrows"], hp: 260, atk: 6 }), K.foe("Kaurava spearman", 4, { abilities: ["strike", "heavy"] })],
    beats: [{ round: 3, text: "Ahead, Drona's arrows are falling around the white parasols like rain on a pond.", run: (B) => B.living("player").forEach((u) => B.status(u, "inspired", 1)) }],
    win: { next: "kf_fall", text: "The last chariot in your way slews aside, and the ground ahead is open." },
    lose: { next: "kf_fall", fx: { injury: "scar" }, text: "They throw you back twice. You come through the third time with blood in your eyes, and late." }
  });
  // The holding fights stand on the war field's painting, tall on upright screens (ui/battle.js).
  Object.assign(K.COMMAND_FIGHT_BG = K.COMMAND_FIGHT_BG || {}, { e_kb_ride: "fight_war_chariot", e_kb_hold: "fight_war_field", e_kb_guard: "fight_war_field", e_kf_reach: "fight_between_lines" });

  // How long Bhurishravas was held off Satyaki: counted when the fight ends, before its outcome.
  K.kbHoldCount = (B) => {
    if (!B || !B.over || B._kb || !B.enc || B.enc.id !== "e_kb_hold") return;
    B._kb = true;
    K.S.kbHeld = B.over === "win" ? HOLD : Math.max(0, Math.min(HOLD, B.round - 1));
  };
  K.on("combat", K.kbHoldCount);

  K.on("scene", () => {
    const S = K.S;
    if (K.PUPPETS) for (const [id, p] of Object.entries(PUPPETS)) if (!K.PUPPETS[id]) K.PUPPETS[id] = p;
    // Riding against your own teacher breaks the debt for good: nothing raises it again.
    if (has(S, "kf_broke_debt") && S.duty.teacher > 0) S.duty.teacher = 0;
  });

  // ---------- Where the scenes come ----------
  // Day 14: the ride in the morning, Bhurishravas at noon, after the night's council and orders.
  // Day 15: the kings fall in the morning, after the council and dawn array; the cry comes after them.
  // Dhrishtadyumna's sword, the word for home and the night debate come straight after the half-truth,
  // before the night council, the truce at dusk and the sixteenth day's offers.
  const before = (id, list) => { K.BEFORE[id] = (K.BEFORE[id] || []).concat(list); };
  const first = (id, list) => { K.BEFORE[id] = list.concat(K.BEFORE[id] || []); };
  before("a6_day14", ["wr_map_14", "kb_ride", "kb_drag"]); // the morning's map first (war_reach.js)
  before("a6_day15", ["wr_map_15", "kf_reach", "kf_cry"]);
  first("a6_day16", ["kf_drona", "kf_word", "kb_debate"]);
  // The half-truth's closing line (Ashwatthama's oath) waits until Dhrishtadyumna's sword has fallen,
  // for those who are there to see it: kf_drona carries it instead.
  const d15 = K.SCENES.a6_day15;
  if (d15) { const was = d15.after; d15.after = (S) => (nearDrona(S) && !S.seen.includes("kf_drona") ? null : K.val(was, S)); }
  // Those who met the cry have already chosen: the half-truth no longer asks them to shout it, and
  // one who shouted it does not ride to Drona to unsay it.
  const BHIMA_SHOUTS = "Bhima is shouting it, and he wants everyone else shouting it too.";
  if (d15) {
    const body = d15.body, choices = d15.choices;
    d15.body = (S) => [].concat(K.val(body, S) || []).map((b) => (b === BHIMA_SHOUTS && S.seen.includes("kf_cry") ? "The cry has reached Drona's chariot. He lowers his bow, and turns to look for Yudhishthira." : b));
    d15.choices = (S) => {
      const list = [].concat(K.val(choices, S) || []);
      if (!S.seen.includes("kf_cry")) return list;
      return list.filter((c) => !["spread", "refuse"].includes(c.id) && !(c.id === "warn" && has(S, "kf_cried")))
        .concat([{ id: "watch", t: "Watch Drona's chariot", fx: {} }]);
    };
  }
  // The night of the raid: Ashwatthama knows who tried to stop Satyaki's sword.
  const raid = K.SCENES.a6_raid;
  if (raid) {
    const body = raid.body;
    raid.body = (S) => [].concat(K.val(body, S) || [], S.side === "pandava" && has(S, "kf_ash_knows") ? [{ memory: "In the smoke Ashwatthama sees your face and knows it. \"You tried to stop Satyaki's sword,\" he says. \"It changes nothing.\"" }] : []);
  }

  // ---------- What the telling says ----------
  (K.TELL_HOOKS = K.TELL_HOOKS || []).push((S, t, h) => {
    if (h("kb_held_full")) t.push("On the fourteenth day {they} stood over Satyaki against Bhurishravas until Arjuna's arrow came.");
    else if (h("kb_held_short") || h("kb_fell_back")) t.push("On the fourteenth day {they} tried to hold Bhurishravas off Satyaki, and could not hold for long.");
    if (h("kb_tried_stop")) t.push("When Bhurishravas sat down on his arrows to die, {they} tried to stop Satyaki's sword.");
    if (h("kb_held_arms")) t.push("When Bhurishravas sat down on his arrows to die, {they} held his arm for Satyaki.");
    if (h("kb_looked_away")) t.push("{They} {were} there when Satyaki killed Bhurishravas at his prayer, and looked at the ground.");
    if (h("kb_stayed_king")) t.push("On the fourteenth day {they} stayed at Yudhishthira's wheel when Satyaki rode for Arjuna.");
    else if (h("kb_ride_through")) t.push("On the fourteenth day {they} rode with Satyaki through the whole Kaurava army.");
    if (h("kb_carried_body")) t.push("{They} carried Bhurishravas back to his own lines, and his men remembered who came.");
    if (h("kf_carried_king")) t.push(["On the fifteenth day {they} carried {who} from the field under Drona's arrows.", { who: KP(S).who }]);
    if (h("kf_took_word")) t.push(["{They} took {who}'s ring home to the queen in {home}.", { who: KP(S).who, home: KP(S).home }]);
    if (h("kf_silent")) t.push("When the whole line shouted that Ashwatthama was dead, {they} kept silent.");
    if (h("kf_broke_debt")) t.push("When Drona laid down his weapons, {they} rode at Dhrishtadyumna's wheel against {their} own teacher.");
    else if (h("kf_rode_with_dhrishta")) t.push("When Drona laid down his weapons, {they} rode at Dhrishtadyumna's wheel.");
    if (h("kf_tried_stop_d")) t.push("When Drona sat unarmed, {they} tried to stop Dhrishtadyumna's sword.");
    if (h("kf_stood_between") && S.alive) t.push("{They} stepped between Dhrishtadyumna and {their} teacher, and could not stop the sword.");
  });
})(window.K = window.K || {});
