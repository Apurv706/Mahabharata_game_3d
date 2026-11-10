/* War storyline (PRD 18.13): Day 17 · the great duel, Arjuna and Karna (#8). Ids begin kd_.

   Who meets it: fighters on day 17 (front line, a chariot or a company; healers and bards stay in the
   tents). Kaurava side: before noon Arjuna kills Karna's son Vrishasena in front of his father; you
   ride at Vrishasena's wheel in a holding fight and keep him alive as long as you can. He falls when
   it ends, however long you held (canon). Karna sees: four rounds or more and his bond rises and his
   last words name it (through K.karnaLastWords, war_child.js); withdrawing early and it falls, and he
   does not look at you again (no warm last words at all). Then the wheel scene, at his side.
   Pandava side: you ride with the Panchala princes Yudhamanyu and Uttamaujas at Arjuna's wheels, a
   holding fight against Kaurava chariots while the two champions trade divine weapons overhead (each
   exchange drawn in code with ui/fx.js astraFx, a counter-weapon clash). Held to the end, and on the
   night of the raid the princes remember you as they die in the camp (canon). Broken, and Arjuna's
   flank lies open for a round: a wound, and your company shaken in its next fight (company_shaken).
   Never offered under the vow never to strike Karna, nor to a division that already held Karna's
   chariot that day (command.js hold_karna).
   Vrishasena and Karna die on day 17 in every life: the wheel scene's witness names Vrishasena for
   those who were not there, and its closing beat is untouched.
   Flags: kd_stood / kd_fell_short / kd_withdrew / kd_kept_line; kd_guard_held / kd_guard_broken /
   kd_guard_declined. S.kdHeld: rounds Vrishasena was kept alive (0 to 6); S.kdGuard: rounds at the wheel. */
(function (K) {
  "use strict";
  const has = (S, f) => S.flags.includes(f);
  const fighter = (S) => ["role_front", "role_chariot", "role_command"].some((f) => has(S, f));
  const HOLD = 6;

  Object.assign(K.PEOPLE, { vrishasena: { name: "Vrishasena", canon: true }, yudhamanyu: { name: "Yudhamanyu", canon: true }, uttamaujas: { name: "Uttamaujas", canon: true } });
  const PUPPETS = {
    vrishasena: { pronoun: "he", headgear: "crown", crown: { gem: "#c9a24e", tall: 0.7, trim: "#7a3a1a" }, palette: ["#b8743a", "#e8d6b0", "#c9a24e"], item: "bow", stance: "proud", stage: "adult", size: 1.02 }
  };
  K.on("scene", () => { if (K.PUPPETS) for (const k of Object.keys(PUPPETS)) if (!K.PUPPETS[k]) K.PUPPETS[k] = PUPPETS[k]; });

  const nearSon = (S) => S.side === "kaurava" && fighter(S);
  const wheelGuard = (S) => S.side === "pandava" && fighter(S) && !K.hasVow("spare_karna", S) && !S.seen.includes("hold_karna_offer");
  const stood = (S) => has(S, "kd_stood");

  // ---------- Encounters ----------
  const VRISHA = () => ({ name: "Vrishasena", hp: 120, atk: 10, def: 3, abilities: ["strike", "arrows", "aimed"], person: "vrishasena" });
  const vsUnit = (B) => B && B.units.find((u) => u.person === "vrishasena");
  // Arjuna's arrows come for the son, round after round; he is never brought below a little.
  const atSon = (cut) => (B) => { const v = vsUnit(B); if (v && v.hp > 0) v.hp = Math.max(1, v.hp - Math.round(v.maxHp * cut)); };
  K.encounter({
    id: "kd_e_son", title: "At Vrishasena's wheel", art: "scene_duel_ground", caption: "Six rounds under Arjuna's arrows", hold: HOLD, hard: true, lethal: false, curse: true,
    // Driven as a chariot duel (war_fights.js, ui/fightmodes.js): Arjuna's arrows to catch on your shield
    // before they reach him, the Pandava chariot-guard to clash with. How far you drive is how long you held.
    kind: "chariot",
    play: { attr: "grace", skill: "chariot", stage: "fight_arjuna_chariot", stageTall: "stage_vyuha_top", vehicle: "chariot", rival: "Pandava chariot-guard", shield: true, obstacles: ["arrow"], hull: 4, speed: 3,
      tally: "Arrows caught: {c} · Past you: {m} of {l} · {d}%", help: "Steer into each arrow's lane and take it on your shield: up and down, or the buttons. Space cracks the whip.",
      helpSide: "Steer left and right into each arrow's lane.", rules: "Steer into each arrow's lane and take it on your shield. Four past you, and he is open." },
    allies: (S) => K.warAllies(S).concat([VRISHA(S)]), callHelp: K.warHelp, spare: false, flee: { tags: ["retreat"] },
    holdText: "Arjuna stops shooting. He has seen Karna's chariot turning toward him.",
    intro: "Vrishasena stands up in his chariot and shoots at Arjuna as if Arjuna were any man. Arjuna's arrows start coming back, and they are all for him.",
    enemies: [K.foe("Arjuna, across the field", 10, { abilities: ["arrows", "aimed"], hero: true, person: "arjuna", hp: 900, atk: 6 }), K.foe("Pandava chariot-guard", 4, { abilities: ["strike", "guard", "heavy"] })],
    beats: [
      { round: 2, text: "An arrow takes Vrishasena's charioteer. He drives his own horses one-handed and keeps shooting.", run: atSon(0.2) },
      { round: 4, text: "Vrishasena's bow is cut in his hand. He takes up another.", run: atSon(0.2) },
      { round: 6, text: "Over the noise you hear Karna shouting his son's name from across the field.", run: (B) => B.living("player").forEach((u) => B.status(u, "inspired", 1)) }
    ],
    win: { fx: { flag: "kd_stood", bond: { karna: 2 }, memory: ["karna", "You stood at my son's wheel until the end."], journal: "On the seventeenth day you rode at Vrishasena's wheel against Arjuna's arrows until the end." }, text: "You are still at his wheel when Arjuna's arrow finds Vrishasena's throat. Across the field, Karna sees it happen." },
    lose: { fx: (S) => ((S.kdHeld || 0) >= 4 ? { flag: "kd_stood", bond: { karna: 2 }, memory: ["karna", "You stood at my son's wheel until you could not stand."], journal: "On the seventeenth day you stood at Vrishasena's wheel until you went down." } : { flag: "kd_fell_short" }),
      text: "You go down beside the wheel, and Arjuna's arrow finds Vrishasena's throat. Across the field, Karna sees it happen." },
    flee: { fx: (S) => ((S.kdHeld || 0) >= 4 ? { flag: "kd_stood", bond: { karna: 2 }, memory: ["karna", "You stood at my son's wheel longer than anyone."] } : { flag: "kd_withdrew", bond: { karna: -2 }, journal: "On the seventeenth day you pulled back from Vrishasena's wheel, and Karna saw it." }),
      text: (S) => ((S.kdHeld || 0) >= 4 ? "You pull back when there is nothing left to hold, and Arjuna's arrow finds Vrishasena's throat. Across the field, Karna sees it happen."
        : "You pull back, and Arjuna's arrow finds Vrishasena's throat. Across the field, Karna sees it, and sees who rode away.") }
  });

  // Overhead, the champions' weapons meet, each a counter-weapon clash drawn in code (ui/fx.js).
  const clash = (kind) => () => {
    const U = K.UI;
    if (K.headless || !U || !U.astraFx || typeof window === "undefined") return;
    const W = window.innerWidth, H = window.innerHeight;
    const pt = (x, y) => ({ getBoundingClientRect: () => ({ left: x * W, top: y * H, width: 0, height: 0 }) });
    setTimeout(() => U.astraFx({ kind, clash: true, from: pt(0.12, 0.16), to: pt(0.88, 0.12) }), 300);
  };
  const PRINCES = () => ({ name: "Yudhamanyu and Uttamaujas", plural: true, hp: 90, atk: 8, def: 3, abilities: ["strike", "arrows", "guard"] });
  const BROKEN = (S) => ({ flag: ["kd_guard_broken", "company_shaken"], injury: "scar", journal: "On the seventeenth day the guard at Arjuna's wheel broke where you stood, and his flank lay open." });
  K.encounter({
    id: "kd_e_wheel", title: "At Arjuna's wheel", art: "scene_duel_ground", caption: "Six rounds at the wheel", hold: HOLD, hard: true, lethal: false, curse: true,
    // Driven as a chariot duel (war_fights.js, ui/fightmodes.js): keep pace at his wheel, knock the Kaurava
    // chariots off his flank, shoot when one draws level. The weapons still clash overhead (the beats).
    kind: "chariot",
    play: { attr: "grace", skill: "chariot", stage: "fight_war_chariot", stageTall: "stage_vyuha_top", vehicle: "chariot", rival: "Kaurava chariot-warrior", bow: true, knock: true, turn: 3, obstacles: ["wreck", "fire"],
      tally: "Turned away: {n} of {k} · You: {d}% · {who}: {r}%",
      rules: "Steer into the Kaurava chariots and shoot when one draws level. Turn three away." },
    allies: (S) => K.warAllies(S).concat([PRINCES(S)]), callHelp: K.warHelp, spare: false, flee: { tags: ["retreat"] },
    holdText: "The Kaurava chariots fall back. Above you, Karna's wheel has gone into the earth.",
    intro: "The Kaurava chariots come at the flanks, low and fast, to get under Arjuna's bow. Over your head the air is already burning.",
    enemies: [K.foe("Kaurava chariot-warriors", 5, { plural: true, abilities: ["strike", "arrows", "heavy"], hp: 280, atk: 6 }), K.foe("Karna's flank-riders", 4, { plural: true, abilities: ["strike", "heavy"] })],
    beats: [
      { round: 2, text: "Karna's fire-weapon comes down across the sky, and Arjuna's rain meets it. Steam rolls over the wheels.", run: clash("varuna") },
      { round: 3, text: "A wind out of Karna's bow, and a wind out of Arjuna's. The dust between them stands up like a wall.", run: clash("vayavya") },
      { round: 4, text: "Karna looses the serpent. Krishna drives the horses to their knees, and it takes Arjuna's crown instead of his head.", run: (B) => { clash("nagapasha")(); B.living("friends").forEach((u) => B.status(u, "inspired", 1)); } }
    ],
    win: { fx: { flag: "kd_guard_held", bond: { arjuna: 1 }, journal: "On the seventeenth day you held Arjuna's left wheel beside Yudhamanyu and Uttamaujas through the whole duel." },
      text: "Neither prince is badly hurt. Out on the open ground, Karna is climbing down from his chariot." },
    lose: { fx: BROKEN, text: "You go down, and Arjuna's flank is open for a round. Uttamaujas closes the gap and takes a cut doing it." },
    flee: { fx: BROKEN, text: "You pull back from the wheel and take an arrow in the side getting clear. Uttamaujas closes the gap, and bleeds for it." }
  });
  Object.assign(K.COMMAND_FIGHT_BG = K.COMMAND_FIGHT_BG || {}, { kd_e_son: "scene_duel_ground", kd_e_wheel: "scene_duel_ground" });

  // Rounds held, counted when a fight ends, before its outcome is read.
  K.kdHoldCount = (B) => {
    if (!B || !B.over || B._kd || !B.enc || !["kd_e_son", "kd_e_wheel"].includes(B.enc.id)) return;
    B._kd = true;
    const n = B.over === "win" ? HOLD : Math.max(0, Math.min(HOLD, B.round - 1));
    if (B.enc.id === "kd_e_son") K.S.kdHeld = n; else K.S.kdGuard = n;
  };
  K.on("combat", K.kdHoldCount);

  // ---------- Scenes ----------
  K.scenes([
    {
      id: "kd_son", act: 6, age: 44, war: true, away: true, when: nearSon, skipTo: "a6_day17", next: "a6_day17",
      art: "war_day16", place: "Kurukshetra · day 17", caption: "Karna's son drives out", title: "Vrishasena",
      body: (S) => ["Karna's son Vrishasena drives out to meet Arjuna.",
        S.friend === "karna" || S.origin === "anga" || S.court === "anga" || S.flags.includes("saw_vrishasena") ? { memory: "You have known Vrishasena since he was small enough to ride on Karna's shoulders." } : null],
      choices: [
        { id: "ride", t: "Guard Vrishasena's wheel", combat: "kd_e_son", hint: "Karna will see" },
        { id: "line", t: "Keep your place in the line", fx: { flag: "kd_kept_line" }, text: "You hold your place. From there you see Arjuna's arrow find Vrishasena's throat, and you see Karna see it." }
      ]
    },
    {
      id: "kd_guard", act: 6, age: 44, war: true, away: true, when: wheelGuard, skipTo: "a6_day17", next: "a6_day17",
      art: "scene_duel_ground", place: "Kurukshetra · day 17", caption: "Two chariots, and the ground between", title: "Arjuna's wheels",
      body: ["Arjuna and Karna meet on open ground.",
        "Yudhamanyu waves you up to Arjuna's left wheel."],
      choices: [
        { id: "wheel", t: "Take the left wheel", combat: "kd_e_wheel", hint: "Hold, and the princes are spared" },
        { id: "line", t: "Watch from the line", fx: { flag: "kd_guard_declined" }, text: "Someone else takes the place. You watch the sky over the two chariots catch fire." }
      ]
    }
  ]);

  // ---------- Day 17: the wheel ----------
  const d17 = K.SCENES.a6_day17;
  if (d17) {
    const witness = d17.witness;
    d17.witness = (S) => {
      const w = [].concat(K.val(witness, S) || []);
      return S.seen.includes("kd_son") ? w : ["Before noon, Arjuna kills Karna's son Vrishasena in front of his father."].concat(w);
    };
    const body = d17.body;
    d17.body = (S) => {
      const out = [].concat(K.val(body, S) || []);
      // Where you stand comes before his last words (war_child.js adds them at the end).
      const at = out.findIndex((x) => typeof x === "string" && /^This morning, on his way to Arjuna/.test(x)), put = (x) => (at < 0 ? out.push(x) : out.splice(at, 0, x));
      if (stood(S)) put("You are already at Karna's side. Vrishasena's blood is still on your sleeve.");
      else if (has(S, "kd_withdrew")) put("You are near Karna's chariot. He does not look at you again.");
      if (has(S, "kd_guard_held")) out.push("You are at Arjuna's left wheel, with Yudhamanyu and Uttamaujas.");
      else if (has(S, "kd_guard_broken")) out.push("The princes have closed the gap at Arjuna's wheel without you.");
      return out;
    };
    // At his side, there is a way back for everyone, not only a parent.
    const vasuHome = (S) => S.child === "vasu" && !S.dead.includes("vasu");
    if (Array.isArray(d17.choices) && !d17.choices.some((c) => c.id === "pull"))
      d17.choices.splice(d17.choices.findIndex((c) => c.id === "watch"), 0, { id: "pull", t: "Pull back while you can", req: (S) => S.side === "kaurava" && S.seen.includes("kd_son") && !vasuHome(S), tags: ["retreat"], fx: { flag: "left_karna" } });
  }
  // His last words (war_child.js): standing with his son joins them; walking away silences them.
  {
    const base = K.karnaLastWords || (() => null);
    K.karnaLastWords = (S) => {
      if (has(S, "kd_withdrew")) return null;
      const w = base(S);
      if (!stood(S)) return w;
      const son = "You stood at my son's wheel. I saw you there. Whatever comes now, I saw.";
      return w ? [son, w] : son; // two lines, one farewell (war_child.js shows each)
    };
  }

  // ---------- The night of the raid: the princes remember ----------
  const raid = K.SCENES.a6_raid;
  if (raid) {
    const body = raid.body, after = raid.after;
    raid.body = (S) => {
      const out = [].concat(K.val(body, S) || []);
      if (S.side === "pandava" && has(S, "kd_guard_held")) out.push({ memory: "Yudhamanyu and Uttamaujas are asleep in the Panchala tents. On the seventeenth day you held a wheel together." });
      return out;
    };
    raid.after = (S) => {
      const out = [].concat(K.val(after, S) || []);
      if (S.side === "pandava" && has(S, "kd_guard_held")) out.splice(1, 0, { memory: "Yudhamanyu and Uttamaujas die in the Panchala tents. At dawn one of their men tells you Yudhamanyu called your name when the fire came, the way he did at Arjuna's wheel." });
      return out;
    };
  }

  // ---------- Where the scenes come ----------
  K.BEFORE.a6_day17 = (K.BEFORE.a6_day17 || []).concat(["kd_son", "kd_guard"]);

  // ---------- What the telling says ----------
  (K.TELL_HOOKS = K.TELL_HOOKS || []).push((S, t, h) => {
    if (h("kd_stood")) t.push("On the seventeenth day {they} stood at Vrishasena's wheel against Arjuna's arrows, and Karna saw.");
    else if (h("kd_withdrew")) t.push("On the seventeenth day {they} pulled back from Vrishasena's wheel, and Karna never looked at {them} again.");
    if (h("kd_guard_held")) t.push("{They} held Arjuna's wheel beside the Panchala princes while the sky burned over Karna and Arjuna.");
    else if (h("kd_guard_broken")) t.push("At Arjuna's wheel, on the seventeenth day, the guard broke where {they} stood.");
  });
})(window.K = window.K || {});
