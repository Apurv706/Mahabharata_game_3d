/* Reaching more lives (PRD reach, 2 Nov): how a life is tied to each war storyline, the word the
   night before, the war-day map, and small ties seeded in Acts III and IV. Loaded before the
   storyline files, which read these helpers and hang the scenes below in their own K.BEFORE lists.

   Ties, strongest first (K.reachTie):
   - "own": the storyline's special entrance (Panchala-born carry their own king, and so on);
   - "company": a company leader or division officer whose company still stands is posted there by
     the morning's orders;
   - "friend": a friend at your side asked you along the night before (wr_word_*);
   - "letter": you went on the word that went round the camp (wr_word_*);
   - "general": you chose that part of the field on the morning's map (wr_map_*).
   The opening scene says in one line how a weaker tie brought you (K.tieLine). Only fighters (front
   line, a chariot or a company) are drawn in by a weaker tie.
   Where: the word before Iravan's day (8) and the lake (18); the map on the morning of day 14
   (Bhurishravas and the Shakti) and, for the Pandavas, day 15 (the two kings and Drona's chariot).
   Flags: friend_<story>, heard_<story>, spot_<story>, stayed_<story> (story: iravan, lake, bhuri,
   shakti, kings, drona). Seeds: met_satyaki (the swayamvara), saw_vrishasena (Anga, before the dice). */
(function (K) {
  "use strict";
  const has = (S, f) => S.flags.includes(f);
  const warring = (S) => S.side === "pandava" || S.side === "kaurava";
  const fighter = (S) => ["role_front", "role_chariot", "role_command"].some((f) => has(S, f));
  const free = (S) => S.alive && warring(S) && fighter(S) && !has(S, "captive") && !(S.captive && S.captive.act === 6);
  const alive = (S, id) => !!id && !S.dead.includes(id);
  const FRIEND_SIDE = { karna: "kaurava", duryodhana: "kaurava", arjuna: "pandava", bhima: "pandava" };

  K.reachCompany = (S) => (has(S, "role_command") || has(S, "role_division")) && !has(S, "company_broken");
  // Who can ask you along: a friend on your side, Charu, your spouse, Ugra beside you, or (for the
  // Pandavas) Satyaki, met at the swayamvara.
  K.reachFriend = (S = K.S) => {
    const f = S.friend;
    if (alive(S, f) && (FRIEND_SIDE[f] ? FRIEND_SIDE[f] === S.side : f === "charu")) return f;
    if (["revat", "charu"].includes(S.spouse) && alive(S, S.spouse)) return S.spouse;
    if (S.side === "pandava" && has(S, "met_satyaki") && (S.bonds.satyaki || 0) >= 4 && alive(S, "satyaki")) return "satyaki";
    if (K.warAllies && K.warAllies(S).includes("ugra")) return "ugra";
    return null;
  };
  K.reachTie = (S, story, own, company = true) => (own ? "own" : !free(S) ? null : company && K.reachCompany(S) ? "company"
    : has(S, "friend_" + story) ? "friend" : has(S, "heard_" + story) ? "letter" : has(S, "spot_" + story) ? "general" : null);
  // One line in the opening scene for a weaker tie: lines = { company, friend, letter, general }.
  K.tieLine = (S, tie, lines) => {
    const l = lines[tie], who = K.reachFriend(S);
    return l ? { memory: [l, { who: who && K.PEOPLE[who] ? K.PEOPLE[who].name : "a friend" }] } : null;
  };

  // ---------- The word the night before (letters and rumours, §18.6) ----------
  // A friend asks you along, or the camp's talk names tomorrow's place. Go, and you are there.
  const word = (story, o) => ({
    id: "wr_word_" + story, act: 6, age: 44, war: true, away: true, when: (S) => o.side(S) && free(S) && !o.tie(S) && !has(S, "stayed_" + story),
    skipTo: o.then, next: o.then, art: o.art, place: o.place, caption: (S) => (K.reachFriend(S) ? "A friend at your fire" : "Talk at the fire"), title: o.title,
    body: (S) => { const f = K.reachFriend(S); return f ? [["{who} finds you at your fire.", { who: K.PEOPLE[f].name }], { speaker: K.PEOPLE[f].name, line: K.val(o.ask, S) }] : [K.val(o.rumour, S)]; },
    choices: [
      { id: "go", t: o.go, fx: (S) => ({ flag: (K.reachFriend(S) ? "friend_" : "heard_") + story }) },
      { id: "stay", t: o.stay, fx: { flag: "stayed_" + story } }
    ]
  });

  // ---------- The war-day map ----------
  // The field from above (stage_vyuha_top: the Kauravas along the top, the Pandavas along the bottom),
  // with a spot for each storyline that day and one for your own place in the line (ui/warmap.js
  // draws the spots over the painting; each is the same as its choice below, which headless runs pick).
  const LINE = (S) => ({ c: "line", label: "Your line", x: 50, y: S.side === "kaurava" ? 14 : 80 });
  const map = (day, o) => ({
    id: "wr_map_" + day, act: 6, age: 44, war: true, away: true, when: (S) => free(S) && o.when(S), skipTo: o.then, next: o.then,
    art: o.art, place: "Kurukshetra · day " + day, caption: "The field this morning", title: "Where will you stand?",
    map: "stage_vyuha_top", spots: (S) => o.spots(S).concat([LINE(S)]), body: o.body,
    choices: (S) => o.choices(S).concat([{ id: "line", t: "Keep your place", fx: {} }])
  });

  K.scenes([
    word("iravan", {
      side: (S) => S.side === "pandava", tie: (S) => K.tieIravan(S), then: "a6_bhishma", art: "battle_night", place: "The camp, the night of day 7", title: "Iravan's flank",
      ask: "Iravan needs riders on his flank tomorrow. Come with me.",
      rumour: "At the fire they say Shakuni's horse will hit Iravan's flank at dawn. Iravan is Arjuna's son by the naga princess, and his riders are few.",
      go: "Ride on Iravan's flank", stay: "Keep your place"
    }),
    word("lake", {
      side: warring, tie: (S) => K.tieLake(S), then: "a6_duryodhana", art: "war_day18", place: "Kurukshetra · the eighteenth day, at dusk", title: "Where is the king?",
      ask: (S) => (S.side === "kaurava" ? "The king is not among the dead. Ashwatthama is looking for him. Come with me." : "Duryodhana is missing. Yudhishthira wants every lake searched. Come with me."),
      rumour: (S) => (S.side === "kaurava" ? "At dusk the word goes round what is left of the camp: the king is not among the dead. Ashwatthama is looking for him."
        : "At dusk the word goes round: Duryodhana is not among the dead, and Yudhishthira wants every lake and thicket searched."),
      go: "Go to the lakes", stay: "Stay with the army"
    }),
    map(14, {
      when: (S) => !K.tieBhuri(S) || !K.tieShakti(S), then: "a6_day14", art: "war_day14",
      body: (S) => (S.side === "kaurava"
        ? ["The order: keep Jayadratha from Arjuna until sunset. Where do you stand today?"]
        : ["Arjuna has sworn Jayadratha dies before sunset. Where do you stand today?"]),
      spots: (S) => (S.side === "kaurava"
        ? [{ c: "bhuri", label: "Bhurishravas", x: 27, y: 50 }, { c: "shakti", label: "Karna's chariot", x: 70, y: 32 }]
        : [{ c: "bhuri", label: "Satyaki's road", x: 28, y: 44 }, { c: "shakti", label: "Ghatotkacha's host", x: 70, y: 60 }]),
      choices: (S) => (S.side === "kaurava"
        ? [{ id: "bhuri", t: "With Bhurishravas, on Satyaki's road", fx: { flag: "spot_bhuri" } },
          { id: "shakti", t: "Near Karna's chariot after dark", fx: { flag: "spot_shakti" } }]
        : [{ id: "bhuri", t: "Ride with Satyaki toward Arjuna", fx: { flag: "spot_bhuri" } },
          { id: "shakti", t: "With Ghatotkacha after dark", fx: { flag: "spot_shakti" } }])
    }),
    map(15, {
      when: (S) => S.side === "pandava" && (!K.tieKings(S) || !K.nearDrona(S)), then: "a6_day15", art: "war_capture",
      body: ["Drona means to break the Panchalas today. Drupada and Virata will ride out to meet him. Where do you stand?"],
      spots: () => [{ c: "kings", label: "The two kings", x: 27, y: 60 }, { c: "drona", label: "Drona's chariot", x: 68, y: 34 }],
      choices: () => [{ id: "kings", t: "Behind the two old kings", fx: { flag: "spot_kings" } },
        { id: "drona", t: "Near Dhrishtadyumna, hunting Drona", fx: { flag: "spot_drona" } }]
    })
  ]);

  // ---------- Ties seeded early (Acts III and IV) ----------
  // Satyaki at Draupadi's swayamvara (he came with Krishna's party): a bond he remembers on the field.
  const sw = K.SCENES.a3_swayamvara;
  if (sw) {
    // The scene shows only its choices; the meeting is told in what comes of each one.
    const enter = sw.enter, SAT = {
      fight: "A young Yadava, Satyaki, puts his back to yours and grins.",
      kings: "A young Yadava, Satyaki, blocks your way for a moment, grins, and tells you his name before he goes to the brahmins.",
      watch: "A young Yadava, Satyaki, stands beside you and tells you his name. Then he goes in to help the brahmins.",
      pass: "Two kings sheathe their swords and walk out with you. So does a young Yadava, Satyaki, who tells you his name.",
      fail: "Nobody listens to you. A young Yadava, Satyaki, pulls you back as the fighting starts, and tells you his name."
    };
    for (const c of sw.choices || []) {
      if (c.check) { if (c.check.pass) c.check.pass.text = SAT.pass; if (c.check.fail) c.check.fail.text = SAT.fail; }
      else if (SAT[c.id] && !c.text) c.text = SAT[c.id];
    }
    sw.enter = (S) => Object.assign({}, K.val(enter, S) || {}, { flag: "met_satyaki", bond: { satyaki: 2 } });
  }
  // Karna's small son, seen in Anga by those near Karna: remembered on the seventeenth day (war_duel.js).
  const nearKarna = (S) => ["anga", "suta"].includes(S.origin) || S.court === "anga" || S.friend === "karna" || has(S, "met_karna_young") || (S.bonds.karna || 0) >= 4;
  const inv = K.SCENES.a4_invite;
  if (inv) {
    const body = inv.body, enter = inv.enter;
    inv.body = (S) => [nearKarna(S) ? { memory: "In Anga last spring you saw Karna carry his small son Vrishasena through the market on his shoulders." } : null].concat(K.val(body, S) || []);
    inv.enter = (S) => Object.assign({}, K.val(enter, S) || {}, nearKarna(S) ? { flag: "saw_vrishasena" } : {});
  }
})(window.K = window.K || {});
