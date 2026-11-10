/* War storylines (PRD 18.13): The lake (#8) and Iravan (#2).
   Scenes here come before the war days through K.BEFORE, each only when it applies.
   - Iravan (day 8, before the tenth day): Pandava players with a naga tie (the serpent-noose, taught
     by the naga they healed on the riverbank) ride beside Arjuna's son by Ulupi against Shakuni's
     horse, a holding fight of six rounds. At dusk he is dead (the rakshasa Alambusha, canon), and his
     body can be carried across the field to the river under fire (a stealth test). Done, and once in
     the war a naga of Ulupi's people answers a call for help (K.nagaHelp, read by K.warHelp).
   - The lake (day 18, after the last battle, before the duel): spies, scouts and Duryodhana's friends
     search the reeds of Dvaipayana at dusk before the hunters do (a noticing test); fight in the reeds
     after dark, beside Ashwatthama, Kripa and Kritavarma or against them (they cannot be killed); then
     tell the Pandavas, keep silent, or warn him to flee. He never runs, the hunters always tell, and
     the duel is fought as written. Losing the fight out of your depth is a death; a Pandava seen
     warning him, out of their depth, spends the duel in a cell.
   Flags: iravan_fought, naga_regard, naga_answered; lake_first / lake_late, lake_with_three /
   lake_vs_three / lake_hid, lake_held / lake_fell / lake_fled, lake_ash_trust / lake_ash_cold,
   lake_spared, lake_told / lake_silent / lake_warned, lake_warn_seen. */
(function (K) {
  "use strict";
  const warring = (S) => S.side === "pandava" || S.side === "kaurava";
  const has = (S, f) => S.flags.includes(f);

  Object.assign(K.PEOPLE, {
    iravan: { name: "Iravan", canon: true }, ulupi: { name: "Ulupi", canon: true },
    kritavarma: { name: "Kritavarma", canon: true }, naga: { name: "Ulupi's naga", canon: false }
  });
  // Shadow puppets (puppet.js loads after the content, so they join on the first scene, as in episodes.js).
  // Ashwatthama already has his own figure in battle.js; Kripa has one in puppet.js.
  const PUPPETS = {
    iravan: { pronoun: "he", palette: ["#b9783f", "#2f5a3a", "#3b6fb0"], headgear: "mukuta", item: "sword", stage: "adult", size: 1.05 },
    kritavarma: { pronoun: "he", palette: ["#b0703c", "#2c4c86", "#d9a53a"], headgear: "peacock", item: "bow", stage: "adult" },
    naga: { pronoun: "he", palette: ["#8a9466", "#2f5a3a", "#9fb07a"], headgear: "band", item: "spear", stage: "adult" }
  };
  K.on("scene", () => { if (K.PUPPETS && !K.PUPPETS.iravan) Object.assign(K.PUPPETS, PUPPETS); });

  // Out of your depth in a fight: below K.PERIL_MIN in the attribute and skill your path fights with
  // (the same pair combat.js builds your blows from). Then losing the reeds fight is a death.
  K.lakeDeep = (S = K.S) => {
    const P = (K.PATHS && K.PATHS[S.path]) || { stat: "might", skill: "mace" };
    return K.attr(P.stat, S) + (S.skills[P.skill] || 0) + K.merits({ attr: P.stat, skill: P.skill }, S).n < K.PERIL_MIN;
  };
  const DANGER = "Danger: failing could cost your life", HOLD = "Won by standing";

  // ---------- The naga who answers once ----------
  K.UNITS.naga = () => ({ name: "Ulupi's naga", hp: 130, atk: 11, def: 3, abilities: ["strike", "heavy"], person: "naga" });
  // Read first by K.warHelp (act6a.js) and by the reeds fights below: once in the war, for one who
  // carried Iravan to the river. The flag is set only when the naga actually comes (run).
  // Only in a deadly fight (a holding fight or a sparring bout is not what the promise was for).
  const deadly = () => { const B = K.Combat && K.Combat.state && K.Combat.state(); return !B || !B.enc || !!B.enc.lethal; };
  K.nagaHelp = (S = K.S) => (has(S, "naga_regard") && !has(S, "naga_answered") && deadly() ? {
    unit: K.UNITS.naga(S), stay: 3,
    text: "The wet ground at your feet stirs, and one of Ulupi's nagas rises out of it, as was promised at the river.",
    run: () => K.apply({ flag: "naga_answered", journal: "Once in the war you shouted for help, and one of Ulupi's nagas came, as was promised at the river." })
  } : null);

  // ---------- Iravan (day 8) ----------
  const nagaTie = (S) => (S.astras || []).some((a) => a.id === "nagapasha" && !a.broken) || has(S, "khandava_nagas") || has(S, "led_the_cobra"); // the naga healed on the riverbank (astras.js w_naga)
  // How you are tied to Iravan's day (war_reach.js): "own" (a naga tie), "company", "friend", "letter", or null.
  K.tieIravan = (S = K.S) => (S.side === "pandava" && !has(S, "captive") ? K.reachTie(S, "iravan", nagaTie(S)) : null);
  const IRAVAN = { name: "Iravan", hp: 150, atk: 12, def: 3, abilities: ["strike", "heavy", "arrows"], person: "iravan" };
  const NAGAS = { name: "Naga warriors", plural: true, hp: 70, atk: 7, def: 2, abilities: ["strike", "guard"] };
  K.encounter({
    id: "e_iravan", title: "Beside Iravan", art: "war_bhishma", caption: "Shakuni's horse", lethal: false, curse: true, hold: 6,
    holdText: "The Gandhara horse wheel away and do not come back.", allies: [IRAVAN, NAGAS], spare: false, flee: { tags: ["retreat"] }, callHelp: K.warHelp,
    enemies: [K.foe("Gandhara horseman", 4), K.foe("Gandhara horseman", 3), K.foe("Gandhara rider-captain", 4, { abilities: ["strike", "heavy"] })],
    intro: "Iravan laughs as the Gandhara horse come on. \"Six charges,\" he says. \"Be here for all six.\"",
    beats: [
      { round: 2, text: "The horse come on in a wedge, with Shakuni's brothers at its point.", run: (B) => B.living("friends").forEach((u) => B.status(u, "guard", 1)) },
      { round: 4, text: "Iravan cuts down one of Shakuni's brothers, then another. The naga warriors close round him like water.", run: (B) => B.living("enemy").forEach((u) => B.status(u, "weakened", 2)) }
    ],
    win: { fx: { journal: "On the eighth day you fought beside Iravan, Arjuna's son by the naga princess, and held against Shakuni's horse." }, text: "Five of Shakuni's brothers lie in the dust in front of Iravan. He grips your arm, grinning, and is gone into the press again." },
    lose: { fx: {}, text: "A horse goes over you. The naga warriors drag you clear, and Iravan rides on without you." },
    flee: { fx: {}, text: "You pull back out of the charge. Iravan does not." }
  });
  const CARRY = { id: "carry", t: "Carry Iravan to the river", game: "sneak", hint: "A test of stealth",
    trial: { twist: "clouds", attr: "grace", skill: "stealth", stage: "stage_field_to_river", trips: 1, spots: 2, watch: "soldier", verb: "Carry",
      help: "Hold to carry him forward. Stop when a fire-arrow lights the ground near you.", tally: "Toward the river: {d} of {n} · Seen: {s} of {m}", made: "The river.", spotted: "A fire-arrow lands close. You go flat over him.",
      rules: "Move while the archers' light is elsewhere; lie still when it comes near.",
      stakes: ["You bring him to his mother's people.", "The arrows pin you down until the nagas come for him themselves."] },
    win: { fx: { flag: "naga_regard", bond: { arjuna: 1 }, memory: ["ulupi", "You carried my son to the river under the Kaurava arrows."], journal: "On the eighth day you carried Iravan's body across the field to the river, where his mother's people took him." },
      next: "wl_iravan_river", text: "You reach the shallows with him in the last of the light." },
    lose: { fx: {}, text: "Fire-arrows pin you down until full dark. When you reach the river, the nagas take him from your arms and do not look at you." } };

  // ---------- The lake (day 18) ----------
  const dFriend = (S) => S.friend === "duryodhana" || (S.bonds.duryodhana || 0) >= 5;
  // How you are tied to the lake (war_reach.js): "own" (a spy, a scout or Duryodhana's friend), or a
  // Pandava company sent to search, a friend, the word at dusk. (No Kaurava company is left by then.)
  K.tieLake = (S = K.S) => (warring(S) && !has(S, "captive") ? K.reachTie(S, "lake", S.path === "spy" || (S.skills.stealth || 0) >= 2 || dFriend(S), S.side === "pandava") : null);
  const lakeWhen = (S) => !!K.tieLake(S);
  // The signs in the reeds (the noticing test asks which of these were there).
  const SIGNS = ["Reeds bent toward the water", "A gold armlet in the mud", "Footprints going into the lake", "A torn royal umbrella", "Blood on a reed stem", "Herons that will not land",
    "A hunter's snare", "Wet silk on a stone", "A broken mace strap", "Bubbles where no fish rise", "A crushed lotus", "A sandal with a gold buckle",
    "A dead horse in the shallows", "A boat pulled up on the bank", "A cold cooking fire", "Three sets of chariot tracks"];
  const SEARCH = { id: "search", t: "Search the reeds first", game: "notice", hint: "A test of what you notice",
    trial: { attr: "wisdom", skill: "stealth", stage: "stage_lake_reeds", count: 7, things: SIGNS, lookLine: "Look along the bank. You have {n} seconds.", ask: "Which of these did you see in the reeds?",
      rules: "Look along the bank once, then say what you saw. Two right of three.",
      stakes: ["You find the place before the hunters do.", "The hunters find it first, and run for the Pandava camp."] },
    win: { fx: { flag: "lake_first" }, text: "The signs lead you to the water's edge. No hunter has been here yet." },
    lose: { fx: { flag: "lake_late" }, text: "By the time you find the place, the hunters have been and gone, running for the Pandava camp." } };

  // The three at the water: beside you (Kaurava side, or Duryodhana's friend), or against you (they
  // cannot be killed: a holding fight, so they are never brought below a tenth).
  const ASH = { name: "Ashwatthama", hp: 160, atk: 12, def: 3, abilities: ["strike", "heavy", "arrows"], person: "ashwatthama" };
  const KRIPA = { name: "Kripa", hp: 120, atk: 9, def: 3, abilities: ["strike", "heavy"], person: "kripa" };
  const KRITA = { name: "Kritavarma", hp: 120, atk: 9, def: 3, abilities: ["strike", "arrows"], person: "kritavarma" };
  const reedsHelp = (S) => K.nagaHelp(S) || { text: "You shout for help. The reeds swallow your voice." };
  const twin = (def, deathText) => {
    K.encounter(Object.assign({}, def));
    K.encounter(Object.assign({}, def, { id: def.id + "_deep", lethal: true, lose: Object.assign({}, def.lose, { deathText }) }));
  };
  twin({
    id: "e_lake_hold", title: "The water's edge", art: "fight_lake_reeds_night", caption: "Fire-baskets on the bank", lethal: false, curse: true, hold: 5,
    holdText: "The torches turn back into the reeds. The scouts have seen enough.", allies: [ASH, KRIPA, KRITA], spare: false, flee: { tags: ["retreat"], fx: { flag: ["lake_fled", "lake_ash_cold"] }, text: "You fall back into the reeds. When it is over Ashwatthama finds you there: \"I saw.\"" },
    callHelp: reedsHelp, enemies: [K.foe("Pandava scout", 4), K.foe("Pandava scout", 4), K.foe("Panchala archer", 4, { abilities: ["strike", "arrows"] })],
    intro: "The torches come on through the reeds. Ashwatthama draws his sword. \"Until they turn back,\" he says. \"Not one step nearer the water.\"",
    beats: [{ round: 3, text: "Kritavarma kicks over a fire-basket, and the reeds between you and the scouts go up in flame.", run: (B) => B.living("enemy").forEach((u) => B.status(u, "weakened", 2)) }],
    win: { fx: { flag: ["lake_held", "lake_ash_trust"], journal: "On the last night you held the water's edge at Dvaipayana beside Ashwatthama, Kripa and Kritavarma." },
      text: "Ashwatthama wipes his sword on the reeds. \"Four of us held the water tonight. I will remember who.\"" },
    lose: { fx: { flag: ["lake_fell", "lake_ash_cold"], injury: "scar" }, text: "You go down in the mud. When you can see again the scouts are gone, and Ashwatthama is going back to the water." }
  }, "{They} fell in the reeds at Dvaipayana on the last night, holding the water's edge beside Ashwatthama, Kripa and Kritavarma.");
  const hero = (u, atk) => Object.assign({}, u, { hp: 600, atk, hero: true });
  twin({
    id: "e_lake_three", title: "Three at the water", art: "fight_lake_reeds_night", caption: "Fire-baskets on the bank", lethal: false, hard: true, curse: true, hold: 4,
    holdText: "Kripa lowers his sword first, and the three turn back to the water.", spare: false, flee: { tags: ["retreat"], fx: { flag: "lake_fled" }, text: "You get away through the reeds before they can close on you." },
    callHelp: reedsHelp, allies: [{ name: "Your fellow scouts", plural: true, hp: 50, atk: 6, def: 2, abilities: ["strike", "arrows"] }],
    enemies: [hero(ASH, 8), hero(KRIPA, 5), hero(KRITA, 5)],
    intro: "Three men who have lived through eighteen days of this war turn from the water to face you. You cannot beat them. Hold on until you can get away.",
    beats: [
      { round: 2, text: "Kripa calls to Ashwatthama to let the scouts go. Ashwatthama does not hear him.", run: (B) => { const a = B.living("enemy").find((u) => u.person === "ashwatthama"); if (a) B.status(a, "inspired", 2); } },
      { round: 3, text: "A cloud slides across the moon. In the sudden dark he loses you for a breath.", run: (B) => B.living("player").forEach((u) => B.status(u, "evade", 1)) }
    ],
    win: { fx: { flag: "lake_held", journal: "On the last night you stood against Ashwatthama, Kripa and Kritavarma in the reeds, and got away with what you saw." }, text: "You get away through the reeds with what you saw." },
    lose: { fx: { flag: ["lake_fell", "lake_spared"], injury: "scar" }, text: "Ashwatthama's sword is at your throat when Kripa catches his arm. \"Not tonight.\"" }
  }, "{They} went into the reeds at Dvaipayana as a scout on the last night, and Ashwatthama found {them} there.");

  // Warning him, for a Pandava: seen by a hunter or not. Out of your depth and seen, Bhima's men hold
  // you until the duel is over (a cell: tests.js x_captive, then the scene after the duel).
  const WARNED = { bond: { duryodhana: 3 }, flag: "lake_warned", memory: ["duryodhana", "You told me to run. I would not, and you stayed to see it."], journal: "On the last day you knelt at the lake and told Duryodhana to run. He would not." };
  const TOLD = { rep: { pandava: 2 }, flag: "lake_told", memory: ["duryodhana", "You stood on the bank with them when they called me out of the water."], journal: "On the last day you found where Duryodhana lay hidden in the lake, and told the Pandavas." };
  const TELL = { t: "Tell the Pandavas", locked: "The hunters were there before you.",
    text: "Yudhishthira hears you out and sends for his brothers. The hunters come in with the same news, and are paid anyway." };
  const WARN_TEXT = "His voice comes up through the water: \"When they come, I will come up and fight. I want one friend to see it.\"";
  // Seen: Pandava reputation -3 either way; out of your depth (the odds under even), Bhima's men also
  // hold you until the duel is over (the peril above), and you do not see it.
  const WARN_CHECK = { attr: "grace", skill: "stealth", dc: 8,
    pass: { fx: { flag: "saw_duel" }, text: WARN_TEXT } };
  WARN_CHECK.fail = { fx: (S) => ({ rep: { pandava: -3 }, flag: K.checkOdds(WARN_CHECK, S) < 0.5 ? "lake_warn_seen" : ["lake_warn_seen", "saw_duel"] }), text: () => WARN_SEEN };
  const WARN_SEEN = "He says he will come up and fight when they come. A hunter in the reeds has seen you, and by moonset the Pandava camp knows.";

  K.scenes([
    // ---------- Iravan ----------
    {
      id: "wl_iravan", act: 6, age: 44, away: true, war: true, when: (S) => !!K.tieIravan(S), skipTo: "a6_bhishma", next: "a6_bhishma",
      art: "war_bhishma", place: "Kurukshetra · day 8", caption: "Naga warriors in the Pandava line", title: "Iravan",
      body: (S) => [
        "Iravan, Arjuna's son by the naga princess Ulupi, rides along the line with his naga warriors.",
        K.tieIravan(S) !== "own" ? K.tieLine(S, K.tieIravan(S), {
          company: "Your company's orders came at first light: ride on Iravan's flank, and keep Shakuni's horse off it.",
          friend: "{who} asked you here last night, and here you are.", letter: "You came because of what was said at the fire last night." }) :
        { memory: (S.astras || []).some((a) => a.id === "nagapasha" && !a.broken) ? "The nagas know your name. Years ago you drew a hunter's arrow out of one of them on a riverbank." : has(S, "khandava_nagas") ? "The nagas know your name. When the Khandava forest burned, a naga family came out of the smoke in your line, and Takshaka's people do not forget it." : "The nagas know your name. When you were a child you gave milk to a cobra in the well-house and led it out to the fields unharmed, and the serpent folk do not forget a kindness." },
        { speaker: "Iravan", line: K.tieIravan(S) === "own" ? "Shakuni's horse is coming at my part of the field. My mother's people say you are a friend to them. Ride with us." : "Shakuni's horse is coming. I need every rider." }
      ],
      choices: [
        { id: "ride", t: "Ride beside Iravan", img: "p_iravan", combat: "e_iravan", next: "wl_iravan_body", fx: { flag: "iravan_fought", bond: { iravan: 2 } }, hint: HOLD },
        { id: "line", t: "Keep your place", fx: {}, next: "wl_iravan_body", text: "Iravan raises a hand and rides on. All morning you hear his war cry far down the field." }
      ]
    },
    {
      id: "wl_iravan_body", act: 6, age: 44, away: true, war: true, next: "a6_bhishma",
      art: "stage_field_to_river", place: "Kurukshetra · the eighth day, at dusk", caption: "The field between you and the river", title: "Iravan's body",
      enter: { die: "iravan" },
      body: [
        "At dusk word comes: the rakshasa Alambusha has killed Iravan with sorcery.",
        "Ulupi's people wait for him at the river, and Kaurava archers shoot at anything that moves."
      ],
      choices: [CARRY, { id: "leave", t: "Leave him for the pyres", fx: {}, text: "Someone else carries him, or no one does. In the morning the naga warriors are gone from the field." }]
    },
    {
      id: "wl_iravan_river", act: 6, age: 44, away: true, war: true, next: "a6_bhishma",
      art: "scene_iravan_river", place: "The river, the night of the eighth day", caption: "Ulupi's people at the water", title: "The river",
      body: [
        "Naga women come out of the shallows with lamps and take Iravan.",
        { speaker: "A naga woman", line: "Call once in this war, and one of us will come." }
      ],
      choices: [{ id: "go", t: "Leave him with his mother's people", fx: {}, text: "When you look back from the bank, the lamps are out on the water and the bier is gone." }]
    },

    // ---------- The lake ----------
    {
      id: "wl_lake", act: 6, age: 44, away: true, war: true, when: lakeWhen, skipTo: "a6_duryodhana", next: "wl_lake_reeds",
      art: "stage_lake_reeds", place: "Dvaipayana lake · the eighteenth day, at dusk", caption: "Reeds higher than a man", title: "The lake in the reeds",
      body: (S) => [
        "When the fighting stops, Duryodhana is gone, on foot, toward the lake.",
        S.side === "pandava" ? "You are one of Yudhishthira's scouts. Hunters are looking too, for gold."
          : "Ashwatthama, Kripa and Kritavarma are looking for him. So are hunters, for gold.",
        K.tieLine(S, K.tieLake(S), { company: "Your company is one of those sent out to search the lake country.", friend: "{who} asked you to come, and is somewhere in the reeds behind you.", letter: "You came on the word that went round the camp at dusk." })
      ],
      choices: [SEARCH, { id: "leave", t: "Leave it to others", fx: {}, next: "a6_duryodhana", text: "You let the others search. By moonrise someone has found him." }]
    },
    {
      id: "wl_lake_reeds", act: 6, age: 44, away: true, war: true, next: "wl_lake_found",
      art: "fight_lake_reeds_night", place: "Dvaipayana lake, after dark", caption: "Fire-baskets on the bank", title: "The fight in the reeds",
      body: (S) => [
        S.side === "kaurava" ? "Ashwatthama, Kripa and Kritavarma talk to the still water. Pandava scouts are closing in."
          : "At the water's edge, Ashwatthama, Kripa and Kritavarma stand guard over the still water.",
        S.side === "pandava" && dFriend(S) ? { memory: "Duryodhana is under that water. You could go down and stand with the three instead." } : null
      ],
      choices: (S) => {
        const deep = K.lakeDeep(S), hint = deep ? DANGER : HOLD;
        return [
          S.side === "kaurava" || dFriend(S) ? { id: "stand", t: "Stand with Ashwatthama", img: "p_ashwatthama", combat: deep ? "e_lake_hold_deep" : "e_lake_hold", hint,
            fx: S.side === "pandava" ? { flag: "lake_with_three", rep: { pandava: -2 } } : { flag: "lake_with_three" } } : null,
          S.side === "pandava" ? { id: "scout", t: "Go in with the scouts", combat: deep ? "e_lake_three_deep" : "e_lake_three", hint, fx: { flag: "lake_vs_three" } } : null,
          { id: "hide", t: "Hide in the reeds", fx: (S2) => ({ flag: S2.side === "kaurava" ? ["lake_hid", "lake_ash_cold"] : "lake_hid" }),
            text: (S2) => (S2.side === "kaurava" ? "You keep down in the reeds. When the torches have gone, Ashwatthama looks at the place where you lay, and says nothing." : "You keep down in the reeds while the others go in. Not all of them come back.") }
        ].filter(Boolean);
      }
    },
    {
      id: "wl_lake_found", act: 6, age: 44, away: true, war: true, next: "a6_duryodhana",
      art: "fight_lake_reeds_night", place: "Dvaipayana lake, after dark", caption: "Still water under the fire-baskets", title: "Under the water",
      body: (S) => [
        "Duryodhana is under the water, bound there by a spell. He can hear every word on the bank.",
        has(S, "lake_late") ? "The hunters have already gone, running for the Pandava camp with the news." : "The hunters are coming."
      ],
      choices: [
        // Told by a Kaurava, it is also a betrayal of your own king.
        Object.assign({ id: "tell", req: (S) => S.side !== "kaurava" && has(S, "lake_first"), showIf: (S) => S.side !== "kaurava", fx: TOLD }, TELL),
        Object.assign({ id: "tell_k", req: (S) => S.side === "kaurava" && has(S, "lake_first"), showIf: { side: "kaurava" }, fx: Object.assign({ duty: { court: -3 } }, TOLD) }, TELL),
        { id: "silent", t: "Say nothing to anyone", fx: { flag: "lake_silent" }, text: "You keep his secret. The hunters do not." },
        { id: "warn", t: "Tell him to run", req: { side: "kaurava" }, fx: Object.assign({}, WARNED, { flag: ["lake_warned", "saw_duel"] }), text: WARN_TEXT },
        { id: "warn_p", t: "Tell him to run", req: (S) => S.side === "pandava" && dFriend(S), fx: WARNED, hint: "A hunter may see you",
          peril: { kind: "prison", by: "Bhima's men", place: "A pen behind the Pandava lines", then: "a6_duryodhana", waitThen: "a6_duryodhana",
            text: "Getting up from the water, you see a hunter in the reeds. Before you are out of them, Bhima's men have your arms behind your back.",
            journal: "You were seen warning Duryodhana at the lake, and Bhima's men held you until the duel was over." },
          check: WARN_CHECK }
      ],
      after: (S) => [
        "Yudhishthira taunts Duryodhana up out of the lake, and Bhima steps forward to meet him.",
        // His last words: said here, unless you will sit with him after the duel (act6b.js a6_duryodhana says it there).
        has(S, "lake_told") && !K.test(K.SCENES.a6_duryodhana.when, S) ? { memory: "He comes up out of the water and sees you on the bank among them. Dying, he says your name with theirs." } : null,
        has(S, "lake_warned") && has(S, "saw_duel") ? { memory: "Before the first blow he looks along the bank, and finds you there, as he asked." } : null
      ]
    }
  ]);

  // What the lake leaves for the scenes after it (act6b.js): Duryodhana's last words, and how
  // Ashwatthama comes to you on the night of the raid.
  K.lakeLines = {
    dying: (S) => (has(S, "lake_told") ? { memory: "He saw you on the bank with them. \"I will tell the gods your name,\" he says." }
      : has(S, "lake_warned") && has(S, "saw_duel") ? { memory: "You told him to run, and he would not. He is glad you saw it." }
      : has(S, "lake_warned") ? { memory: "You told him to run, and he would not. Someone has told him Bhima's men held you through the duel, and he laughs." } : null),
    raid: (S) => (S.side === "kaurava"
      ? (has(S, "lake_told") ? { memory: "He knows who brought the Pandavas to the lake. He asks you anyway. There is no one else." }
        : has(S, "lake_ash_trust") ? { memory: "He has not forgotten the reeds. \"Four of us held the water,\" he says. \"Be one of the four again.\"" }
        : has(S, "lake_ash_cold") ? { memory: "He saw you in the reeds. He asks anyway, and does not look at you while he does." } : null)
      : has(S, "lake_with_three") ? { memory: "A few hours ago you stood beside him in the reeds." }
      : has(S, "lake_vs_three") ? { memory: "You know that sword. You saw it by the fire-baskets in the reeds, a few hours ago." } : null)
  };

  // The reeds and the Iravan fight stand on their own paintings, tall on upright screens (battle.js).
  Object.assign(K.COMMAND_FIGHT_BG, { e_iravan: "fight_war_field", e_lake_hold: "fight_lake_reeds_night", e_lake_hold_deep: "fight_lake_reeds_night", e_lake_three: "fight_lake_reeds_night", e_lake_three_deep: "fight_lake_reeds_night" });

  // Where they come: Iravan on the eighth day, before the ninth night and the tenth day (so first in
  // the list); the lake after the last battle, before Duryodhana lies dying.
  // Canon (4): Iravan has fallen by the tenth day in every life, whether or not you were near him.
  const bh = K.SCENES.a6_bhishma;
  if (bh) bh.enter = Object.assign({}, bh.enter, { die: [].concat((bh.enter && bh.enter.die) || [], "iravan") });
  K.BEFORE.a6_bhishma = ["wr_word_iravan", "wl_iravan"].concat(K.BEFORE.a6_bhishma || []); // the word the night before (war_reach.js)
  K.BEFORE.a6_duryodhana = (K.BEFORE.a6_duryodhana || []).concat(["wr_word_lake", "wl_lake"]);

  // ---------- What the telling says ----------
  (K.TELL_HOOKS = K.TELL_HOOKS || []).push((S, t, h) => {
    if (h("naga_regard")) t.push("On the eighth day {they} carried Iravan, Arjuna's son by the naga princess, to the river under the Kaurava arrows, and the nagas remembered it.");
    else if (h("iravan_fought")) t.push("On the eighth day {they} rode beside Iravan, Arjuna's son by the naga princess, against Shakuni's horse.");
    if (h("naga_answered")) t.push("Once, when {they} shouted for help, a naga came up out of the river country to stand beside {them}.");
    if (h("lake_ash_trust")) t.push("On the last night {they} held the water's edge with Ashwatthama, Kripa and Kritavarma, all that was left of eleven armies.");
    if (h("lake_vs_three") && h("lake_held")) t.push("On the last night {they} stood against Ashwatthama, Kripa and Kritavarma in the reeds, and lived to tell it.");
    if (h("lake_told")) t.push("{They} brought the Pandavas to the lake where Duryodhana hid, and he named {them} in his last words.");
    if (h("lake_warned")) t.push("At the lake {they} told Duryodhana to run. He would not, and asked {them} to stand witness.");
    if (h("lake_silent")) t.push("{They} found Duryodhana's hiding place in the reeds and told no one. The hunters told for {them}.");
  });
})(window.K = window.K || {});
