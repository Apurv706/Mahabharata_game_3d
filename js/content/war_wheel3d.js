/* The wheel in the earth (docs/Gameplay_Ideas.md Part 3; owner 13 November: "Make it a fight"). The seventeenth day.
   Karna's left wheel has gone into the ground to the axle and he is down beside it with his bow on the deck of the car.
   Until now that was a page of choices. Now you go in, and what the page asked is asked there, with what each answer
   will cost you written under it. The page that follows shows only what you did, with the same effects as before, and
   does not ask again.
     Pandava (kw_e_close): his guards lock shields in front of him. Close on him and the story asks: strike him at the
       wheel, or shout to Arjuna to wait. Take the first and you have a count to get a blow in on a man who is unarmed
       and has his back to you.
     Kaurava (kw_e_guard): he is behind you, and the Pandava foot are coming for him: keep them off. Reach the wheel
       and he asks for your shoulder. With your hands on the rim you cannot guard, and Arjuna's arrows find whoever is
       there. At the last, with the crescent arrow on the string, you may stand over him, and not survive it.
   Nothing in the day changes: when the count is out the arrow comes, and the fight shows it. Without the cards (a fight
   that could only be played in 2D, or one lost before they came) the page after asks as it always did.
   The cards and the wheel are battle/sim.js (enc.wheel3, enc.asks3) and battle/view.js.
   Flags, set by the 3D view as you answer: wheel3d_obey / wheel3d_miss / wheel3d_refuse; stand3d_obey / stand3d_refuse;
   wheel3d_peril (you took the wheel out of your depth: going down after that is the old page's death). Set by the
   fight's end: kw_won / kw_lost / kw_fled. */
(function (K) {
  "use strict";
  const has = (S, f) => S.flags.includes(f);
  const d17 = K.SCENES.a6_day17; if (!d17 || !Array.isArray(d17.choices)) return;
  const ORIG = {}; for (const c of d17.choices) ORIG[c.id] = c; // the page's own answers, as they have always been (the cards show their costs, and the page after applies them)
  const ART = { art: "war_day17", caption: "A chariot wheel sinks into the earth" };
  const WHEEL_DEATH = "{They} jumped down to help Karna lift his sunken wheel, and fell in the dust beside it.";

  // ---------- The page: the two ways in ----------
  const CLOSE = { id: "close", t: "Go in at his car with the men closing on it", req: { side: "pandava" }, combat: "kw_e_close", noAfter: true };
  const GUARD = { id: "guard", t: "Get to his wheel", req: { side: "kaurava" }, combat: "kw_e_guard", noAfter: true };
  d17.choices = (S) => { const out = []; let p = false, k = false;
    for (const c of Object.values(ORIG)) {
      if (c.id === "shoot" || c.id === "call") { if (!p) { out.push(CLOSE); p = true; } }
      else if (c.id === "wheel" || c.id === "stand") { if (!k) { out.push(GUARD); k = true; } }
      else out.push(c); }
    return out; };

  // ---------- The fights ----------
  const KARNA_FOE = () => K.foe("Karna, at the wheel", 10, { abilities: [], hero: true, person: "karna", hp: 900, atk: 0, still: true });
  const KARNA_OURS = () => ({ name: "Karna, at the wheel", hp: 170, atk: 0, def: 3, abilities: ["guard"], person: "karna", still: true });
  K.encounter(Object.assign({
    id: "kw_e_close", title: "Karna's wheel", hold: 6, hard: true, lethal: false, spare: false, mix: false, wheel3: "karna", plan3: "wall",
    allies: (S) => K.warAllies(S), callHelp: K.warHelp, flee: { tags: ["retreat"] },
    intro: "His guards have seen what you have seen, and they get between. Behind their shields he has his back to the whole field and both hands on the rim.",
    holdText: "Behind you a bowstring sounds, once.",
    enemies: [KARNA_FOE(), K.foe("Karna's wheel-guard", 4, { abilities: ["strike", "guard", "heavy"] }), K.foe("Karna's wheel-guard", 4, { abilities: ["strike", "guard", "heavy"] }),
      K.foe("Anga spearman", 3), K.foe("Anga spearman", 3), K.foe("Anga archer", 3, { abilities: ["strike", "arrows"] })],
    beats: [
      { round: 2, text: "\"Wait,\" Karna calls across the field. \"The wheel. One moment, by the law we both keep.\"" },
      { round: 5, text: "Krishna says something to Arjuna. You cannot hear what. You see Arjuna's bow come up." }
    ],
    asks3: [{ on: "karna", near: 6.5, round: 3, task: "strike", secs: 20, flag: "wheel3d", from: "karna", title: "Karna, at the wheel",
      text: "He does not look round. His bow is on the deck of his car, and both his hands are on the rim. You are close enough.",
      yes: "Strike him at the wheel", no: "Shout to Arjuna to wait", cost: { yes: () => ORIG.shoot, no: () => ORIG.call },
      taken: "He is unarmed, and his back is to you.", goal: "Reach Karna",
      obey: "It lands between his shoulders. He does not let go of the wheel.", miss: "His guards keep you off him.",
      refuse: "\"Wait!\" you shout across the field. \"Let him free it!\" You cannot tell whether Arjuna heard." }],
    win: { next: "kw_after", fx: { flag: "kw_won" }, text: "The shields in front of him are gone. Nothing stands between Karna and Arjuna's car." },
    lose: { next: "kw_after", fx: { flag: "kw_lost" }, text: "You go down among his guards, and are pulled clear by the heels." },
    flee: { next: "kw_after", tags: ["retreat"], fx: { flag: "kw_fled" }, text: "You pull back from his car." }
  }, ART));
  K.encounter(Object.assign({
    id: "kw_e_guard", title: "At Karna's wheel", kind: "escort", escort: "Karna, at the wheel", hold: 7, hard: true, lethal: false, spare: false, mix: false, wheel3: "karna",
    allies: (S) => K.warAllies(S).concat([KARNA_OURS()]), callHelp: K.warHelp, flee: { tags: ["retreat"] },
    intro: "You are down from your car and running. The Pandava foot have seen him too, and they are nearer than you thought.",
    holdText: "Across the field a bowstring sounds, once.",
    enemies: [K.foe("Panchala swordsman", 4, { abilities: ["strike", "guard"] }), K.foe("Panchala swordsman", 4, { abilities: ["strike", "guard"] }), K.foe("Pandava spearman", 4), K.foe("Pandava spearman", 4),
      K.foe("Panchala archer", 4, { abilities: ["strike", "arrows"] })],
    beats: [
      { round: 3, text: "\"Wait,\" Karna calls across the field. \"One moment, by the law we both keep.\" Nobody on the other side answers him." },
      { round: 5, text: "The wheel has not moved. He has stopped calling out." }
    ],
    asks3: [
      { on: "karna", at: "wheel", near: 3, round: 2, task: "heave", secs: 26, need: 6, flag: "wheel3d", from: "karna", title: "Karna",
        text: "\"Your shoulder,\" Karna says, without looking up. \"Here, under the hub.\" The Pandava foot are still coming.",
        yes: "Put your shoulder to the wheel", no: "Keep them off him", cost: { yes: () => Object.assign({}, ORIG.wheel, { fx: { bond: { karna: 2 } } }) },
        peril: (S) => K.inPeril(ORIG.wheel, S),
        taken: "Get to the wheel and stay at it. You cannot guard with your hands on the rim.", goal: "Heave at the wheel",
        obey: "The wheel moves. It moves too slowly.", miss: "The earth will not give it back.", refuse: "You stay between him and their spears." },
      { on: "karna", round: 7, task: null, end: "win", flag: "stand3d", from: "arjuna", title: "The crescent arrow",
        text: "Across the field Arjuna has an arrow on the string with a head like the new moon. Karna has seen it. He has not let go of the wheel.",
        yes: "Stand over Karna", no: "Stay where you are", cost: { yes: () => ORIG.stand }, doom: "You will not survive this",
        obey: "You step in front of him.", refuse: "You stay where you are." }
    ],
    win: { next: "kw_after", fx: { flag: "kw_won" }, text: "None of them got past you to him. It was never going to be one of them." },
    lose: { next: "kw_after", fx: (S) => (has(S, "wheel3d_peril") ? (S.deathAt = { art: ART.art, caption: ART.caption, act: S.act }, { die: true, deathText: WHEEL_DEATH, flag: ["kw_lost", "peril_death", "died_with_karna"] }) : { flag: "kw_lost" }),
      text: (S) => (has(S, "wheel3d_peril") ? "The arrows come from across the field, and they do not care whose hands are on the wheel." : "You go down a spear's length from the wheel, and the fight goes over you.") },
    flee: { next: "kw_after", tags: ["retreat"], fx: { flag: "kw_fled" }, text: "You pull back from his wheel. He does not look up to see you go." }
  }, ART));

  // ---------- The page after: what you did, and then what is written ----------
  const did = (S, pre) => ["obey", "miss", "refuse"].find((k) => has(S, pre + "_" + k)) || null;
  const as = (c, t, more) => Object.assign({}, c, { t }, more || {});
  K.scene(Object.assign({
    id: "kw_after", act: 6, age: 44, war: true, away: true, canon: true, place: "Kurukshetra · day 17", title: "Karna",
    body: (S) => { const w = did(S, "wheel3d"), lost = has(S, "kw_lost"), fled = has(S, "kw_fled");
      if (S.side === "kaurava") return [has(S, "stand3d_obey") ? "You are standing in front of him. Behind you he says your name, once."
        : lost ? "You are down in the dust, a spear's length from the wheel." : fled ? "From where you have pulled back to, you can still see him at the wheel."
        : w === "obey" ? "The rim has come up a hand's breadth out of the earth. Karna's shoulder is beside yours."
        : w === "miss" ? "The wheel has not moved. Your hands are open and bleeding."
        : "The Pandava foot have drawn back out of reach. Karna has not stopped heaving at the rim."];
      return [lost ? "You are on your back among his guards, and the sky over the two chariots is very bright." : fled ? "From where you have pulled back to, you can still see him at the wheel."
        : w === "obey" ? "Karna is down on one knee by the wheel. He has not turned to see who it was."
        : w === "refuse" ? "Your shout is still in the air. Arjuna has not lowered his bow, and he has not loosed."
        : w === "miss" ? "His guards kept you off him. He is still at the wheel."
        : "The men round his car are gone. Karna is still at the wheel, with his bow on the deck. Arjuna has not loosed."]; },
    choices: (S) => { const w = did(S, "wheel3d"), lost = has(S, "kw_lost"), fled = has(S, "kw_fled");
      if (S.side === "kaurava") {
        if (has(S, "stand3d_obey")) return [as(ORIG.stand, "You stood over Karna to the end", { hint: null })];
        if (fled) return [{ id: "pull", t: "You pulled back from his wheel", fx: { flag: "left_karna" } }];
        if (lost) return [as(ORIG.watch, "You saw the end from the ground")];
        if (w === "obey") return [{ id: "wheel", t: "You put your shoulder to the wheel", fx: { bond: { karna: 2 }, flag: "lifted_wheel" }, text: "The wheel moves. It moves too slowly." }];
        if (w === "miss") return [{ id: "wheel", t: "You put your shoulder to the wheel", fx: { bond: { karna: 1 } }, text: "The earth will not give it back." }];
        if (w === "refuse") return [{ id: "kept", t: "You kept them off him", fx: { bond: { karna: 2 }, flag: "guarded_karna_wheel", journal: "On the seventeenth day you kept the Pandava foot off Karna while he fought to free his wheel." } }];
        return [ORIG.wheel, ORIG.stand, ORIG.watch]; } // (no card was answered: the page asks, as it always did)
      if (fled) return [as(ORIG.watch, "You watched from where you had pulled back to")];
      if (lost) return [as(ORIG.watch, "You saw the end from the ground")];
      if (w === "obey") return [as(ORIG.shoot, "You struck Karna at the wheel", S.path === "archer" ? null : { fx: Object.assign({}, ORIG.shoot.fx, { flag: ["shot_karna", "struck_karna"], journal: "On the seventeenth day you struck Karna from behind while he was lifting his chariot wheel." }) })];
      if (w === "refuse") return [as(ORIG.call, "You shouted to Arjuna to wait")];
      if (w === "miss") return [as(ORIG.watch, "You went for him, and did not reach him")];
      return [ORIG.shoot, ORIG.call, ORIG.watch]; },
    after: d17.after, next: "a6_day18"
  }, ART));

  // ---------- What the telling says ----------
  (K.TELL_HOOKS = K.TELL_HOOKS || []).push((S, t, h) => {
    if (h("guarded_karna_wheel")) t.push("On the seventeenth day {they} kept the Pandava foot off Karna while he fought to free his wheel.");
  });
})(window.K = window.K || {});
