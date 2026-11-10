/* Act IV — The fracture: the dice game, in a few short beats (invite, Shakuni's hands, the hall, the robe, exile). PRD §6, §12.
   Draupadi's humiliation is shown through the hall's reaction, never lingered on. The dice never
   involve the player's money or any paid randomness (PRD §13). */
(function (K) {
  "use strict";
  K.scenes([
    {
      id: "a4_invite", act: 4, age: 30, canon: true, art: "scene_dice_hall", place: "Hastinapura", travel: "Duryodhana's new hall is opening in Hastinapura, and everyone is summoned.", caption: "The new assembly hall",
      title: "An invitation to dice",
      witness: ["Yudhishthira is invited to a game of dice in the new hall, and accepts."],
      body: (S) => [
        S.flags.includes("knows_dice_plot") ? { memory: "You heard Shakuni plan this game. You know he cannot lose." } : null,
        "You are thirty. Will you go?"
      ],
      choices: [
        { id: "warn", t: "Warn Yudhishthira", req: { flag: "knows_dice_plot" }, fx: { bond: { yudhishthira: 1 }, rep: { pandava: 1 }, flag: ["warned_yudhishthira", "at_dice"] },
          text: "He thanks you and goes anyway. \"If I am called, I must play.\"", next: "a4_hands" },
        { id: "go", t: "Go to the hall", fx: { flag: "at_dice" }, next: "a4_hands" },
        { id: "stay", t: "Stay away", fx: { flag: "absent_dice", journal: "You stayed away from the dice game." }, next: "a4_household" }
      ],
      next: "a4_hands"
    },
    // The stakes and Draupadi's question, in one scene: Shakuni's hands come first (tests.js), the robe after.
    {
      id: "a4_hall", act: 4, age: 30, canon: true, art: "scene_dice_question", place: "The assembly hall, Hastinapura", caption: "The question no one answers",
      title: "In the hall",
      lamp: { secs: 35, silent: "silent", note: "If the lamp burns out, you said nothing." },
      witness: [
        "Yudhishthira loses everything, then Draupadi. She asks if a man who lost himself could stake her."
      ],
      body: (S) => [S.friend === "duryodhana" ? { memory: "Duryodhana is your oldest friend. He is laughing." } : null],
      choices: [
        { id: "answer", t: "Answer her, as Vikarna does",
          fx: { duty: { conscience: 3, court: -2 }, rep: { pandava: 2, kuru: -2 }, bond: { draupadi: 2, yudhishthira: 1, dushasana: -4 }, flag: ["objected_dice", "enemy_dushasana"], memory: ["dushasana", "You spoke against him in the hall."], journal: "In the dice hall you answered Draupadi's question out loud. Dushasana marked you." } },
        { id: "between", t: "Step between Dushasana and Draupadi",
          peril: { kind: "prison", by: "Duryodhana's guards", place: "The cells below the assembly hall", then: "a4_aftermath",
            text: "Dushasana's guards drag you out of the hall. \"Below,\" Duryodhana says, \"until they learn the king's peace.\"",
            journal: "You stepped between Dushasana and Draupadi, and Duryodhana had you locked away." },
          check: { attr: "might", skill: "mace", dc: 9,
            pass: { fx: { duty: { conscience: 3, court: -3 }, rep: { pandava: 3, kuru: -3 }, bond: { draupadi: 2, bhima: 2, dushasana: -5 }, flag: ["stood_between", "enemy_dushasana"], journal: "You held Dushasana's wrist in the dice hall, for one breath, before the guards pulled you off." }, text: "You catch Dushasana's wrist and hold it for one long breath before the guards drag you back. The hall saw it." },
            fail: { fx: { duty: { conscience: 2 }, rep: { kuru: -2 }, bond: { dushasana: -3 }, injury: "scar", flag: "enemy_dushasana" }, text: "Dushasana's guards throw you to the floor before you reach him. You taste blood on the marble." } } },
        // One plea, to whoever you are closest to: your old friend Duryodhana, or the grandsire.
        { id: "friend", t: "Beg Duryodhana to stop this", req: { friend: "duryodhana" }, locked: "", fx: { bond: { duryodhana: -2 }, duty: { conscience: 2 }, memory: ["duryodhana", "You begged him to stop, in front of everyone."] },
          text: "He looks at you as if he has never seen you before." },
        { id: "bhishma", t: "Beg Bhishma to stop this", req: { not: { friend: "duryodhana" } }, locked: "", fx: { duty: { conscience: 1 }, bond: { bhishma: 1 } }, text: "Bhishma looks at his hands. \"The way of dharma is subtle,\" he says, and says nothing more." },
        { id: "silent", t: "Say nothing", fx: { duty: { conscience: -2, court: 1 }, flag: ["silent_draupadi", "silent_dice"], memory: ["draupadi", "You were in the hall, and you said nothing."] } }
      ],
      next: "a4_robe"
    },
    {
      id: "a4_robe", act: 4, age: 30, canon: true, art: "scene_dice_cloth", place: "The assembly hall, Hastinapura", caption: "The cloth that does not end",
      title: "The cloth that does not end",
      witness: [
        "Dushasana pulls at Draupadi's garment, and it does not end. Bhima swears to break Duryodhana's thigh and drink Dushasana's blood."
      ],
      body: (S) => [(S.bonds.karna || 0) >= 5 ? { aside: "Karna called her a slave. He will not look at you." } : null, "And you?"],
      choices: [
        { id: "vow", t: "Swear your own vow", req: { vowSlot: true }, locked: "You already hold three vows.", fx: { vowTake: "vengeance", flag: "vengeance_dice", bond: { bhima: 1 } } },
        { id: "remember", t: "Remember every face", fx: { skill: { lore: 1 }, flag: "remembered_hall", journal: "You memorised every face in the dice hall: who spoke, who laughed, who looked away." } },
        { id: "away", t: "Look away", fx: { duty: { conscience: -1 } } }
      ],
      after: [
        "Yudhishthira loses one more game, and the Pandavas go into exile for thirteen years."
      ],
      next: "a4_aftermath"
    },
    {
      id: "a4_aftermath", act: 4, age: 30, canon: true, place: "The road out of Hastinapura", art: "scene_exile", plate: ["#5c3361", "#16131f"], caption: "The Pandavas walk into exile",
      title: "Thirteen years",
      witness: ["The Pandavas go into exile for thirteen years."],
      body: (S) => [
        S.flags.includes("absent_dice") || S.flags.includes("left_dice") ? "You hear the story secondhand." : null,
        "What will you do with the thirteen years?"
      ],
      choices: [
        { id: "forest", t: "Follow the Pandavas into exile", fx: { set: { exile: "forest" }, rep: { pandava: 2, kuru: -1 }, duty: { court: -2 }, journal: "You followed the Pandavas into exile." } },
        { id: "court", t: "Stay at court", fx: { set: { exile: "court" }, rep: { kuru: 1 }, duty: { court: 1 }, journal: "You stayed at the Kuru court through the exile years." } },
        { id: "own", t: "Go home and raise a family", fx: { set: { exile: "own" }, duty: { family: 2 }, journal: "You went home to make your own life." } }
      ],
      next: "a5_child"
    }
  ]);
})(window.K = window.K || {});
