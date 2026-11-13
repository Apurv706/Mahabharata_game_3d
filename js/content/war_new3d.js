/* New story lines made for the 3D fights (docs/Gameplay_Ideas.md, Part 4). Each is an interlude inside a day whose
   end the epic has already fixed: you can do well or badly, and it can cost you, but the named men end the day
   where the Mahabharata puts them.
     Over Bhima (Pandava side, day 14): Karna has beaten Bhima down and, for his word to Kunti, ridden on. Bhima
       lies stunned by his broken car and lesser men come for the trophy. Stand over him until he rises. Their
       champion charges and may call you out (enc.plan3 "charge"); Bhima is drawn lying behind you (enc.fallen).
     The banner-bearer (either side, day 15): the man with your division's banner falls, and you take it up
       (enc.bearer: battle/sim.js bearerStep). While it stands your side holds. */
(function (K) {
  "use strict";
  const onField = (S) => ["role_front", "role_chariot", "role_command", "role_division"].some((f) => S.flags.includes(f)) && !S.flags.includes("company_broken");

  K.encounter({
    id: "new_over_bhima", title: "Over Bhima", caption: "Until he rises", hold: 6, hard: true, lethal: false, spare: false, plan3: "charge", fallen: "bhima",
    allies: K.warAllies, callHelp: K.warHelp, art: "war_day14", flee: { tags: ["retreat"], fx: { flag: "left_bhima" }, text: "You fall back. Others run in to drag Bhima clear, and two of them do not come out again." },
    enemies: [K.foe("Kalinga captain", 8, { abilities: ["strike", "heavy"], hp: 520, atk: 8 }), K.foe("Kalinga axeman", 4, { abilities: ["strike", "heavy"] }), K.foe("Kalinga spearman", 3), K.foe("Kalinga spearman", 3)],
    intro: "Bhima lies by the wreck of his car with his eyes open and nothing in them. The men of Kalinga have seen it. Whoever brings Duryodhana that mace will be rich for life.",
    holdText: "Behind you something very large gets to its knees, and then to its feet. The men of Kalinga look past you, and begin to walk backwards.",
    win: { fx: { flag: "stood_over_bhima", bond: { bhima: 2 }, rep: { pandava: 1 }, journal: "On the fourteenth day, when Karna had beaten Bhima down and ridden on, you stood over him until he rose." },
      next: "new_bhima_rises", text: "The last of them is still backing away when you hear him move." },
    lose: { fx: { flag: "bhima_dragged", injury: "scar" }, text: "They go over you. Satyaki's car comes through the dust a moment later and scatters them, and Bhima is lifted into it. You are carried off after him." }
  });
  K.encounter({
    id: "new_banner", title: "The banner", caption: "While it stands", hold: 6, hard: true, lethal: false, spare: false, bearer: true,
    allies: K.warAllies, callHelp: K.warHelp, art: "war_day15", flee: { tags: ["retreat"], fx: { flag: "banner_dropped" }, text: "You plant the staff and go back. It stands a moment by itself, and then it does not." },
    enemies: [K.foe("Chariot-warrior", 6, { abilities: ["strike", "arrows"] }), K.foe("Veteran swordsman", 5, { abilities: ["strike", "guard"] }), K.foe("Spearman", 3), K.foe("Spearman", 3)],
    intro: "The staff is heavier than it looks and the cloth pulls like a sail. Every man of your division can see it, and so can every man of theirs.",
    holdText: "The horns blow the recall along the whole line. The banner is still up, and your arm has forgotten how to let go of it.",
    win: { fx: { flag: "bore_banner", rep: { common: 1 }, duty: { court: 1 }, journal: "On the fifteenth day your division's banner-bearer fell, and you carried the banner until the horns blew." },
      next: "new_banner_dusk", text: "The lines draw apart. You are still holding it." },
    lose: { fx: { flag: "banner_fell", injury: "scar" }, text: "The staff is cut through above your hand. The cloth comes down over you, and the division breaks before anyone can raise it." }
  });

  const offer = (id, title, enc, when, skipTo, art, place, body, hold, decline) => K.scene({
    id, act: 6, age: 44, war: true, away: true, canon: false, art, place, caption: "A moment in the day", title, when, skipTo, next: skipTo, body,
    choices: [{ id: "hold", t: hold, combat: enc, hint: "Won by standing" }, { id: "decline", t: decline[0], fx: { duty: { conscience: -1 } }, text: decline[1] }]
  });
  offer("new_over_bhima_offer", "Bhima is down", "new_over_bhima", (S) => S.side === "pandava" && onField(S) && !S.dead.includes("bhima"), "a6_day14", "scene_bhima_down", "Kurukshetra · day 14, afternoon",
    ["Karna has fought Bhima to a standstill, broken his car under him, and touched him on the shoulder with the tip of his bow. Then, for a reason no one on the field knows, he has ridden on.", "Bhima is on the ground beside the wreck. A company of Kalinga foot has turned toward him."],
    "Stand over him", ["Shout for the chariots, and keep your place", "The chariots come, late. Bhima lives, as he must. Three of the men who ran to him do not."]);
  offer("new_banner_offer", "The banner falls", "new_banner", (S) => S.side !== "neutral" && onField(S), "a6_day16", "scene_banner_falls", "Kurukshetra · day 15, noon",
    ["The man who carries your division's banner takes an arrow through the throat and sits down, quite slowly, with the staff still upright in his hands.", "For a breath nobody moves. Then the staff begins to lean."],
    "Catch it", ["Leave it to the man beside you", "The man beside you catches it. He carries it for the rest of the day, and for the rest of his life he is the man who did."]);

  // After each, won: its own painting (the artist's first batch, 12 November).
  const after = (id, title, art, place, next, body) => K.scene({ id, act: 6, age: 44, war: true, away: true, canon: false, art, place, caption: "A moment in the day", title, next, skipTo: next, body, choices: [{ id: "on", t: "Go on", fx: {} }] });
  after("new_bhima_rises", "He rises", "scene_bhima_rises", "Kurukshetra · day 14, afternoon", "a6_day14", ["Bhima picks up his mace as if it weighed nothing. He does not thank you. He asks which way Karna went."]);
  after("new_banner_dusk", "Dusk", "scene_banner_dusk", "Kurukshetra · day 15, dusk", "a6_day16", ["A boy of the camp comes to take the staff from you at dusk. He has to open your fingers one at a time."]);

  const before = (id, pre) => { K.BEFORE[id] = (K.BEFORE[id] || []).concat(pre); };
  before("a6_day14", ["new_over_bhima_offer"]);
  before("a6_day16", ["new_banner_offer"]);
})(window.K = window.K || {});
