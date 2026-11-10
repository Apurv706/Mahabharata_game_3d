/* Vows that matter (PRD §18.12): the friends who want you to break a vow, from the start, and the
   ways back (one heavy penance a life, and a scene with a friend you lost). These scenes come before
   a scene every road reaches (K.BEFORE), each only when it applies. */
(function (K) {
  "use strict";
  const friendIs = (S, ids) => [].concat(ids).includes(S.friend);
  const lostAlive = (S) => (S.lostFriends || []).find((x) => !S.dead.includes(x.who) && !(S.flags || []).includes("mend_tried_" + x.who));
  const atonable = (S) => S.vows.find((v) => v.broken && !v.released && !v.atoned);

  K.scenes([
    // Never to lie: your friend asks you to lie for them at court.
    {
      id: "v_word", when: (S) => K.hasVow("never_lie", S) && !!S.friend, skipTo: "a3_rajasuya", next: "a3_rajasuya", away: true,
      act: 3, age: 28, art: "scene_dice_question", place: "The king's court", caption: "A word before the court",
      title: "Swear it for me",
      body: (S) => friendIs(S, "duryodhana")
        ? ["One of Duryodhana's men has beaten a farmer half to death over a boundary stone. The farmer's family has come to the king's court. Duryodhana finds you in the corridor before the hearing.",
          { speaker: "Duryodhana", line: "You were on the road that evening. Say the farmer struck first. They will believe you. Everyone knows you never lie." }]
        : ["A steward is accused of theft, and {friend} was with him that night, at a secret dice table.",
          ["\"Say he was with you,\" {friend} whispers. \"Everyone knows you never lie.\"", null]],
      choices: [
        { id: "lie", t: "Swear what your friend asks", tags: ["lie"], fx: (S) => ({ bond: { [S.friend]: 2 }, duty: { conscience: -1 } }),
          text: "You say it in a clear voice, and the court believes you. Your friend squeezes your arm afterwards." },
        { id: "truth", t: "Tell only what you saw", check: { attr: "wisdom", skill: "statecraft", dc: 8,
          pass: { fx: { duty: { conscience: 1 } }, text: "You tell the truth of what you saw, and nothing more. Your friend's name is never spoken." },
          fail: { fx: (S) => ({ bond: { [S.friend]: -1 } }), text: "You tell the truth, and the court asks one more question than you hoped. Your friend's name comes out." } },
          hint: "Honest persuasion" },
        { id: "refuse", t: "Refuse to lie", fx: (S) => ({ bond: Object.assign({ [S.friend]: -2 }, S.friend === "duryodhana" ? { vidura: 1 } : { yudhishthira: 1 }), duty: { conscience: 1 } }),
          text: (S) => S.friend === "duryodhana" ? "Duryodhana laughs without any warmth and walks away. That evening Vidura pours you a cup of water himself." : "{friend} lets go of your arm. Later, Yudhishthira finds you on the steps and sits beside you for a while, without saying why." }
      ]
    },
    // Never to retreat: your friend is down, and the only way out is back.
    {
      id: "v_hold", when: (S) => K.hasVow("never_retreat", S) && !!S.friend && !S.dead.includes(S.friend), skipTo: "a5_charu", next: "a5_charu", away: true,
      act: 5, age: 42, art: "scene_raid", place: "A camp in the forest", caption: "Raiders at the river crossing",
      title: "Fall back",
      body: ["Raiders cross the river. {friend} goes down beside you with a spear in the thigh.",
        ["\"Carry me back to the trees,\" {friend} gasps. You swore never to fall back.", null]],
      choices: [
        { id: "carry", t: "Carry your friend back", tags: ["retreat"], fx: (S) => ({ bond: { [S.friend]: 2 }, memory: [S.friend, "You carried me out of the river crossing, and broke your vow to do it."] }),
          text: "You get {friend} over your shoulder and run. Your vow is broken, and your friend is alive." },
        { id: "hold", t: "Hold, and shout for help", check: { attr: "might", skill: "mace", dc: 8,
          pass: { fx: { attr: { command: 1 } }, text: "You stand in the water and do not move, and others drag {friend} back to the trees." },
          fail: { fx: (S) => ({ bond: { [S.friend]: -2 }, injury: "leg" }), text: "You hold, and a raider's axe takes you across the leg. Someone gets {friend} to the trees, late." } },
          hint: "A test of might" },
        { id: "stand", t: "Fight over your friend", fx: (S) => ({ bond: { [S.friend]: -1 }, duty: { conscience: 1 } }),
          text: "You stand over {friend} until the raiders run. \"You would have let me bleed for your vow,\" {friend} says afterwards." }
      ]
    },
    // Never to strike the unarmed: your friend wants a captive silenced.
    {
      id: "v_captive", when: (S) => K.hasVow("spare_unarmed", S) && !!S.friend && !S.dead.includes(S.friend) && !(S.lostFriends || []).some((x) => x.who === S.friend), skipTo: "a5_karna_secret", next: "a5_karna_secret", away: true,
      act: 5, age: 43, art: "scene_secret", place: "A camp at night", caption: "A spy, bound at the wrists",
      title: "Before he talks",
      body: ["A boy spy is caught at the camp's edge. He has seen where everyone sleeps.",
        ["\"It has to be done,\" {friend} says, \"and it has to be you.\"", null]],
      choices: [
        { id: "strike", t: "Do it", tags: ["strike_unarmed"], fx: (S) => ({ bond: { [S.friend]: 1 }, duty: { conscience: -3 }, memory: [S.friend, "You did the thing no one else would do, at the edge of the camp."] }),
          text: "It is quick, and it is not clean. Your hands do not feel washed for a long time." },
        { id: "free", t: "Let him go", fx: (S) => ({ bond: { [S.friend]: -2 }, rep: { common: 1 }, duty: { conscience: 1 } }),
          text: "The boy runs, and you move everyone over the hills before dawn. {friend} does not speak to you for three days." },
        { id: "keep", t: "Keep him bound", check: { attr: "grace", skill: "stealth", dc: 7,
          pass: { fx: { duty: { conscience: 1 } }, text: "For a month he walks bound in the column, and when you let him go there is nothing left to tell. He thanks you." },
          fail: { fx: (S) => ({ bond: { [S.friend]: -1 } }), text: "On the fourth night he slips his rope and is gone. {friend} does not speak to you for the rest of the march." } },
          hint: "A test of stealth" }
      ]
    },
    // Never to strike Karna: your friend wants you to loose at him, open in the ford.
    {
      id: "v_ford", when: (S) => K.hasVow("spare_karna", S) && ["arjuna", "bhima", "charu"].includes(S.friend) && !S.dead.includes(S.friend) && !S.dead.includes("karna"), skipTo: "a5_karna_secret", next: "a5_karna_secret", away: true,
      act: 5, age: 43, art: "scene_cattle", place: "A ford, at the end of the hidden year", caption: "Karna in the river",
      title: "Open in the ford",
      body: ["At a ford, Karna's chariot is stuck, and his back is to you.",
        ["\"Now!\" {friend} shouts. \"He will never be this open again. Loose!\"", null]],
      choices: [
        { id: "loose", t: "Loose at Karna", tags: ["strike_karna"], fx: (S) => ({ bond: { [S.friend]: 1 } }),
          text: "Your arrow takes him in the shoulder. He turns in the water and looks straight at you, and you will see that look for the rest of your life." },
        { id: "banner", t: "Shoot his banner instead", check: { attr: "aim", skill: "archery", dc: 8,
          pass: { fx: { duty: { conscience: 1 } }, text: "The elephant-rope banner falls into the river, and Karna's raid turns back. {friend} buys you a drink that night." },
          fail: { fx: (S) => ({ bond: { [S.friend]: -1 } }), text: "Your arrow goes wide of the banner, and the chariot lurches out of the ford and away. {friend} says nothing, loudly." } },
          hint: "A test of aim" },
        { id: "lower", t: "Lower your bow", fx: (S) => ({ bond: { [S.friend]: -1, karna: 1 } }),
          text: "You lower your bow, and Karna nods to you once as his chariot passes. {friend} stares at you as if you were a stranger." }
      ]
    },
    // The way back from a broken vow: one heavy penance in a life.
    {
      id: "v_penance", when: (S) => !!atonable(S) && !S.penanceDone, skipTo: "a5_side", next: "a5_side", away: true,
      act: 5, age: 44, art: "scene_ashram", place: "An ashram in the hills", caption: "A season of fasting",
      enter: (S) => ({ set: { penanceVow: atonable(S).id } }),
      title: "The penance",
      body: (S) => [["Before the armies gather, you go up into the hills to an old ashram, where the sage there will hear what you did. You swore “{vow!}”, and broke it.", { vow: K.VOWS[S.penanceVow].name }],
        "He tells you what it costs: a season of fasting and silence, sleeping on the ground, while the world goes to war without you for a while. It will not mend the vow. It may lift the shame."],
      choices: [
        { id: "atone", t: "Do the penance", fx: (S) => ({ penance: S.penanceVow }),
          text: "You come down out of the hills thinner, quieter and somehow lighter. Some people look at you differently." },
        { id: "not", t: "Go back down", text: "You go back down the hill. The sage does not seem surprised." }
      ]
    },
    // The way back to a friend you lost: only through a scene with that friend.
    {
      id: "v_mend", when: (S) => !!lostAlive(S), skipTo: "a5_side", next: "a5_side", away: true,
      act: 5, age: 44, art: "scene_journey", place: "A road before the war", caption: "An old friend, on the road",
      enter: (S) => ({ set: { mendWho: lostAlive(S).who } }),
      title: "The road back",
      body: (S) => [["Before the war, you hear that {who} is camped half a day's ride away.", { who: K.PEOPLE[S.mendWho].name }],
        "You have not spoken since the friendship ended. You could ride over. You could also not."],
      choices: [
        { id: "go", t: (S) => ["Ride over and find {who}", { who: K.PEOPLE[S.mendWho].name }], check: { attr: "wisdom", dc: 8, bonus: (S) => (S.penanceDone ? 1 : 0),
          pass: { fx: (S) => { const w = S.mendWho; return { reconcile: w, flag: "mend_tried_" + w, memory: [w, "You rode half a day to find me before the war. I had been hoping you would."] }; },
            text: "You find the camp at dusk, and neither of you says sorry. By the time the fire burns down you are laughing together." },
          fail: { fx: (S) => ({ flag: "mend_tried_" + S.mendWho }), text: "You find the camp at dusk and are given a place by the fire. No one asks you to stay." } },
          hint: "Doing penance first would help" },
        { id: "no", t: "Let it be", fx: (S) => ({ flag: "mend_tried_" + S.mendWho }), text: "You ride on toward the war. You think about it more than you expected to." }
      ]
    }
  ]);
  K.BEFORE.a3_rajasuya = ["v_word"];
  K.BEFORE.a5_charu = ["v_hold"];
  K.BEFORE.a5_karna_secret = ["v_captive", "v_ford"];
  K.BEFORE.a5_side = ["v_penance", "v_mend"];
})(window.K = window.K || {});
