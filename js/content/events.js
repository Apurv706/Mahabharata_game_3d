/* Chance events. Five places in each life hold an event slot; at the first visit one of its events
   is drawn, or nothing happens (about one time in three), so no two lives meet the same small things.
   A slot is named like a scene: other scenes point their `next` at it (flow.js K.slot). */
(function (K) {
  "use strict";
  K.slot("s_child", { pool: ["ev_snake", "ev_bard"], then: "a1_poison" });
  K.slot("s_youth", { pool: ["ev_horses", "ev_deer"], then: "a2_spar" });
  K.slot("s_court", { pool: ["ev_lamps", "ev_flood"], then: "a3_rajasuya" });
  K.slot("s_exile", { pool: ["ev_riddle", "ev_bandits"], then: "a5_forest_boon" });
  K.slot("s_late", { pool: ["ev_teacher", "ev_letter"], then: "a5_matsya" });

  K.scenes([
    // ---------- Childhood ----------
    {
      id: "ev_snake", act: 1, art: "ev_snake", place: (S) => K.childPlace(S), caption: "The well-house at noon",
      title: "A cobra in the well-house",
      body: ["A cobra lives in the well-house. Your uncle has found a stick."],
      choices: [
        { id: "milk", t: "Lure it out with milk",
          check: { attr: "grace", skill: "stealth", dc: 6,
            pass: { fx: { rep: { common: 1 }, attr: { grace: 1 }, flag: "led_the_cobra" }, text: "It drinks, and considers you for a long moment, and flows away into the millet. The women sing your name at the well for a week." },
            fail: { fx: { lose: "herbs" }, text: "It strikes at your hand as you run. A dry bite, the healer says, but the family's herbs go on it all the same." } } },
        { id: "charmer", t: "Fetch the snake-charmer", fx: { duty: { family: 1 }, skill: { lore: 1 } },
          text: "He sings it into a basket and lets it go in the forest. On the way home he teaches you the song." },
        { id: "stick", t: "Hand your uncle the stick", fx: { attr: { might: 1 }, duty: { conscience: -1 } },
          text: "It is quick. Your grandmother does not speak to either of you until the next full moon." }
      ],
      next: "a1_poison"
    },
    {
      id: "ev_bard", act: 1, art: "ev_bard", place: (S) => K.childPlace(S), caption: "Under the village banyan",
      title: "A bard under the banyan",
      body: ["A wandering bard sings under the village banyan tonight."],
      choices: [
        { id: "listen", t: "Listen to the end", fx: { skill: { lore: 1 }, flag: "loved_stories" },
          text: "You fall asleep before the nectar rises out of the sea. You dream of it for years." },
        { id: "learn", t: "Ask him to teach you a verse",
          check: { attr: "wisdom", skill: "lore", dc: 6,
            pass: { fx: { skill: { lore: 1 }, attr: { wisdom: 1 } }, text: "He teaches you one verse, and the trick of remembering a hundred more by hanging each one on a door of a house you know." },
            fail: { fx: {}, text: "He laughs, kindly. \"Come back when your voice breaks.\"" } } },
        { id: "pockets", t: "Pick the audience's pockets", fx: { skill: { stealth: 1 }, duty: { conscience: -1 }, rep: { common: -1 } },
          text: "You come home with three coppers and a ring. The bard saw you, and only sang a little louder." }
      ],
      next: "a1_poison"
    },

    // ---------- Youth ----------
    {
      id: "ev_horses", act: 2, art: "ev_horses", place: "The horse fair by the river road", caption: "Northern horses at the river road",
      title: "The grey mare",
      body: ["Horse-traders have a grey mare no one can go near."],
      choices: [
        { id: "gentle", t: "Try to gentle the grey mare",
          check: { attr: "grace", skill: "chariot", dc: 7,
            pass: { fx: { skill: { chariot: 1 }, rep: { common: 1 }, flag: "grey_mare", journal: "At the horse fair you gentled a grey mare no one else could touch." }, text: "By evening she eats from your hand. The traders sell her to you for the price of a meal." },
            fail: { fx: { lose: "herbs" }, text: "She throws you into the fence. The traders rub your bruises with your own herbs." } } },
        { id: "haggle", t: "Haggle for a sound horse", fx: { skill: { statecraft: 1 }, duty: { family: 1 } },
          text: "You beat the price down by a third and come home leading a bay gelding with kind eyes. Your father pretends not to be impressed." },
        { id: "watch", t: "Watch how the traders lie", fx: { attr: { wisdom: 1 } },
          text: "Every trader lies differently. By evening you can tell who is lying about what, and you wish you could not." }
      ],
      next: "a2_spar"
    },
    {
      id: "ev_deer", act: 2, art: "ev_deer", place: "The forest", caption: "A clearing in the forest",
      title: "The wounded doe",
      body: [
        "You find a wounded doe. A prince's hunting party is close behind."
      ],
      choices: [
        { id: "bind", t: "Bind the wound",
          check: { attr: "wisdom", skill: "healing", dc: 7,
            pass: { fx: { skill: { healing: 1 }, rep: { sages: 1 }, flag: "saved_doe" }, text: "She lies still under your hands, then stands and is gone. An old woman gathering wood says the forest will remember." },
            fail: { fx: { duty: { conscience: 1 } }, text: "You do what you can. She dies with her head in your lap." } } },
        { id: "hide", t: "Hide her trail", fx: { skill: { stealth: 1 }, rep: { kuru: -1 } },
          text: "You drag a branch across the blood. The horns go past, and fade." },
        { id: "call", t: "Call the hunters", fx: { rep: { kuru: 1 }, duty: { court: 1 } },
          text: "A young lord thanks you, and tosses you a coin, and does not look at the deer." }
      ],
      next: "a2_spar"
    },

    // ---------- Young adult ----------
    {
      id: "ev_lamps", act: 3, art: "ev_lamps", place: "The city, on the new-moon night", caption: "Lamps on every wall",
      title: "The night of lamps",
      body: ["On the night of lamps you have a hundred clay lamps and a little oil."],
      choices: [
        { id: "river", t: "Float them for your dead", fx: { duty: { family: 1 }, attr: { wisdom: 1 } },
          text: "The river carries some of them a long way. You watch until the last one goes out." },
        { id: "potters", t: "Give your oil to the poor lane", fx: { rep: { common: 2 }, duty: { conscience: 1 } },
          text: "The potters' lane is the brightest in the city that night. Nobody knows why, except the potters." },
        { id: "dice", t: "Play dice with the nobles", fx: { rep: { kuru: 1 }, skill: { statecraft: 1 }, flag: "gambled_lamps" },
          text: "You lose a little and win a little, and learn who at court owes what to whom." }
      ],
      next: "a3_rajasuya"
    },
    {
      id: "ev_flood", act: 3, art: "ev_flood", place: (S) => K.homePlace(S), caption: "The river over its banks",
      title: "The river rises",
      body: ["The river floods the low quarter to the rooftops."],
      choices: [
        { id: "boat", t: "Take a boat into the low quarter",
          check: { attr: "might", skill: "chariot", dc: 7,
            pass: { fx: { rep: { common: 2 }, duty: { conscience: 1 }, flag: "flood_boat", journal: "In the flood year you rowed the low quarter out of the water." }, text: "You make eleven trips. On the last the boat goes over, and you swim a child to the temple roof on your back." },
            fail: { fx: { injury: "scar" }, text: "The current takes the boat on the first trip and a beam opens your arm. Someone else pulls you out." } } },
        { id: "organise", t: "Open the high town's doors", fx: { skill: { statecraft: 1 }, attr: { command: 1 }, rep: { common: 1 } },
          text: "You go from house to house until every family on the hill has taken in a family from the river." },
        { id: "grain", t: "Save your family's grain first", fx: { duty: { family: 2 }, rep: { common: -1 } },
          text: "Your family eats well that winter. Your neighbours notice." }
      ],
      next: "a3_rajasuya"
    },

    // ---------- The exile years ----------
    {
      id: "ev_riddle", act: 5, art: "ev_riddle", place: "A road in the dry season", caption: "An ascetic by the road",
      title: "The ascetic's riddle",
      body: [
        "An ascetic by the road asks: what, once given, can never be taken back?"
      ],
      choices: [
        { id: "word", t: "\"Your word\"", fx: { rep: { sages: 1 }, attr: { wisdom: 1 }, item: { herbs: 2 } },
          text: "\"Yes,\" he says, and gives you two bundles of roots. \"For the war. You will need them.\"" },
        { id: "gift", t: "\"A gift\"", fx: {}, text: "\"A gift can be taken back,\" he says. \"Ask any king.\"" },
        { id: "life", t: "\"A life\"", fx: { flag: "riddle_life" }, text: "\"Lives are given back all the time,\" he says, smiling. \"Ask the river.\"" },
        { id: "walk", t: "Walk on", fx: {} }
      ],
      next: "a5_forest_boon"
    },
    {
      id: "ev_bandits", act: 5, art: "ev_bandits", place: "Where the road narrows", caption: "Five men in the trees",
      title: "Bandits on the road",
      body: ["Five thin men with farm tools block the road."],
      choices: [
        { id: "fight", t: "Draw your weapon", combat: "e_bandits" },
        { id: "feed", t: "Give them your food", fx: { duty: { conscience: 2 } },
          text: "The one in front weeps. The king's men took their village's grain, for the war everyone says is coming." },
        { id: "hire", t: "Hire them",
          check: { attr: "command", skill: "statecraft", dc: 8,
            pass: { fx: { rep: { common: 2 }, attr: { command: 1 }, flag: "hired_bandits", journal: "On the road you turned five starving bandits into the most loyal workers you ever had." }, text: "They have nothing to lose. A year later they are the most loyal people you know." },
            fail: { fx: { lose: { what: "heirloom", at: "bandits" } }, text: (S) => (S.heirloomLost && S.heirloomLost.at === "bandits" ? "They laugh. Then they rob you anyway, slowly and politely, and the one who was shaking takes your {heirloom!}." : "They laugh. Then they rob you anyway, slowly and politely.") } } }
      ],
      next: "a5_forest_boon"
    },
    {
      id: "ev_teacher", act: 5, when: (S) => S.teacher && S.teacher !== "self", skipTo: "a5_matsya",
      art: "ev_teacher", place: "Your teacher's house", caption: "A lamp by a sickbed",
      title: "Your teacher is ill",
      body: ["{teacher} is very ill and asking for students."],
      choices: [
        { id: "go", t: "Go and nurse {teacher}", fx: { duty: { teacher: 2 }, skill: { healing: 1 } },
          text: "You sit up through eleven nights. On the twelfth the fever breaks, and {teacher} looks at you and says, \"Still here?\"" },
        { id: "send", t: "Send a physician", fx: { duty: { teacher: 1 } },
          text: "The physician comes back with a message: thank you, and come yourself next time." },
        { id: "stay", t: "Send your regrets", fx: { duty: { teacher: -1 } } }
      ],
      next: "a5_matsya"
    },
    {
      id: "ev_letter", act: 5, art: "ev_letter", place: (S) => K.homePlace(S), caption: "A palm-leaf letter",
      title: "A letter from home",
      body: (S) => [
        S.flags.includes("moved_capital") ? "Your parents went back to {origin} when your father's working years were done." : null,
        "A letter from your mother in {origin}: when are you coming home?",
        !S.kin ? null
          : K.kinElder(S) ? { memory: ["She writes that {kin} died in the cold season, still asking after you.", { kin: S.kin }] }
          : S.kinRole === "mother" ? { memory: "At the bottom, in a hand that shakes more than it used to, she asks you to come before she is too old to know your face." }
          : { memory: ["At the bottom, in another hand you know at once: {kin} asks to see you before {kin} is too old to know your face.", { kin: S.kin }] }],
      choices: [
        { id: "go", t: "Go home for the rains", fx: { duty: { family: 2, court: -1 } },
          text: "The roof gets mended. Your father tells the same three stories every night." },
        { id: "write", t: "Send money and a long letter", fx: { duty: { family: 1 } } },
        { id: "here", t: "Write that your place is here", fx: { duty: { family: -1, court: 1 } } }
      ],
      next: "a5_matsya"
    }
  ]);

  K.encounter({
    id: "e_bandits", mix: false, title: "Bandits on the road", // (no archer among them, row 47: starving men with farm tools; the checks' standard bout)
    art: "ev_bandits", caption: "Farm tools against your weapon", lethal: false,
    intro: "They come at you all at once, badly.",
    enemies: [K.foe("Hungry bandit", 2, { hp: 24 }), K.foe("Hungry bandit", 1, { hp: 20 })],
    win: { fx: { rep: { common: -1 } }, text: "They scatter into the trees. The last one to run is no older than sixteen." },
    lose: { fx: { item: { herbs: -1 } }, text: "They take your purse and your sandals, and apologise." }
  });
})(window.K = window.K || {});
