/* In Arjuna's place (docs/Gameplay_Ideas.md Part 4; owner 13 November: "Krishna drives"). Pandava side, archers, the
   sixteenth day. Arjuna is struck senseless in his car. If the Kaurava line sees the ape banner without an archer under
   it the day is lost, so you stand on his deck with your own bow while Krishna takes the car round the field. You do
   not steer (enc.ride3: battle/sim.js rideStep): you aim, loose and brace until he wakes. Nothing in the epic's day
   changes: he wakes, and the day goes on as it is written. Paintings: the artist's first batch for the 3D story lines. */
(function (K) {
  "use strict";
  const DAY = "a6_day17", PLACE = "Kurukshetra · day 16";
  K.encounter({
    id: "new_arjuna_place", title: "Under the ape banner", caption: "Until he wakes", hold: 6, hard: true, lethal: false, spare: false, ride3: "arjuna", noPlan: true,
    art: "war_day16", flee: null,
    enemies: [K.foe("Trigarta chariot-archer", 5, { abilities: ["strike", "arrows"] }), K.foe("Trigarta chariot-archer", 4, { abilities: ["strike", "arrows"] }), K.foe("Sworn spearman", 3), K.foe("Sworn spearman", 3), K.foe("Sworn swordsman", 3, { abilities: ["strike", "guard"] })],
    intro: "\"Stand where he stood,\" Krishna says, without turning his head. \"Loose when I bring them across your bow. Do not fall out.\"",
    holdText: "Behind your knees someone stirs, and a hand that is not yours closes on the rail.",
    win: { next: "new_arjuna_wakes", fx: { flag: "stood_in_arjunas_car", bond: { arjuna: 2, krishna: 1 }, rep: { pandava: 1 }, journal: "On the sixteenth day, when Arjuna lay senseless in his car, you stood in his place under the ape banner until he woke." },
      text: "The sworn men have not noticed that the arrows from this car were, for a little while, only arrows." },
    lose: { fx: { flag: "fell_from_arjunas_car", injury: "scar" }, text: "An arrow takes you in the shoulder and you go over the rail. Krishna does not stop for you. He cannot. When you are picked up, the ape banner is far off, and there is an archer under it again." }
  });
  K.scene({ id: "new_arjuna_struck", act: 6, age: 44, war: true, away: true, canon: false, art: "scene_arjuna_struck", place: PLACE, caption: "A moment in the day", title: "The car has stopped",
    when: (S) => S.side === "pandava" && S.path === "archer" && !S.dead.includes("arjuna") && !S.flags.includes("company_broken"), skipTo: DAY, next: "new_arjuna_ride",
    body: ["The white horses are standing still. That is the first wrong thing. The second is that the bow Gandiva is lying on the floor of the car.", "Arjuna has slid down against the rail with his eyes shut. Krishna has one hand on the reins and the other on his friend's chest, and he is looking straight at you."],
    choices: [{ id: "take", t: "Climb up", fx: { flag: "took_arjunas_place" }, text: "\"Your own bow,\" Krishna says. \"Not his. No one strings his.\"" },
      { id: "decline", t: "Run for Bhima", fx: { duty: { conscience: -1 } }, text: "By the time you are back with Bhima the car is moving again, and there is an archer in it. You never learn who stood there." }] });
  K.scene({ id: "new_arjuna_ride", act: 6, age: 44, war: true, away: true, canon: false, art: "scene_under_the_ape", place: PLACE, caption: "A moment in the day", title: "Under the ape banner",
    when: (S) => S.flags.includes("took_arjunas_place") && !S.flags.includes("stood_in_arjunas_car") && !S.flags.includes("fell_from_arjunas_car"), skipTo: DAY, next: DAY,
    body: ["The car leaps forward. The banner cracks over your head, and across the field ten thousand men see what they have seen for sixteen days: the white horses, the ape, an archer."],
    choices: [{ id: "stand", t: "Stand up, and draw", combat: "new_arjuna_place", hint: "Krishna drives. You only shoot." }] });
  K.scene({ id: "new_arjuna_wakes", act: 6, age: 44, war: true, away: true, canon: false, art: "scene_arjuna_wakes", place: PLACE, caption: "A moment in the day", title: "He wakes", next: DAY, skipTo: DAY,
    body: ["Arjuna sits up with a hand to his head and asks how long. \"Long enough,\" Krishna says, and holds out the water skin.", "Nobody tells you to get down. You get down. Arjuna looks at the bow in your hand, and then at you, and nods once, the way he might to another archer."],
    choices: [{ id: "on", t: "Go on", fx: {} }] });
  K.BEFORE[DAY] = (K.BEFORE[DAY] || []).concat(["new_arjuna_struck"]);
})(window.K = window.K || {});
