/* Act III — Young adult (ages 20–30). PRD §6. */
(function (K) {
  "use strict";
  const pledge = (court) => (S) => ({ set: { court }, duty: { court: 6 - S.duty.court } });

  // The tunnel at Varnavata: Act III's test for those who know of it (the others try the great bow).
  const TUNNEL = { t: "Carry earth from the tunnel", req: { any: [{ teacher: "vidura" }, { path: "spy" }, { friend: ["bhima", "arjuna"] }] }, game: "sneak", hint: "A test of stealth",
    trial: { twist: "turns", attr: "grace", skill: "stealth", verb: "Move", stage: "stage_lac_wall", cast: ["guard"], help: "Hold to creep along the wall with the basket. Stop before the torchlight reaches you.",
      rules: "Carry two baskets of earth out unseen. Seen twice, and you stop for the night.",
      stakes: ["The tunnel grows by a night's digging, and the Pandavas will owe you.", "You have to stop for the night. The miner will try again tomorrow, with or without you."] },
    retryStakes: ["The tunnel grows by a night's digging, and the Pandavas will owe you.", "A guard sees you, and Purochana starts asking questions. It counts as two failures, and it will weigh on every stealth test to come; if your stealth is low, the guard may not stop at questions."],
    win: { fx: { bond: { yudhishthira: 2, bhima: 1 }, rep: { pandava: 2 }, flag: ["helped_tunnel", "act3_tested"], journal: "You helped dig the tunnel under the house at Varnavata." }, text: "Night after night you carry baskets of earth into the dark. No one sees you." },
    lose: { fx: { flag: "act3_tested" }, text: "A torch swings your way, and you crawl back into the dark. \"Tomorrow night,\" the miner whispers." },
    peril: { kind: "death", art: "scene_lac", caption: "The garden of the lac house, at night", text: "The guard does not shout. He takes you for a thief in the dark, and he does not ask questions.",
      deathText: "{They} carried earth out of the tunnel at Varnavata by night, and one of Purochana's guards took {them} for a thief." },
    retryLose: { penalty: 1, fx: { rep: { kuru: -2 }, flag: ["seen_at_tunnel", "tunnel_twice"] }, text: "One of Purochana's guards sees a figure near the house at night. He does not see your face, but he will keep looking." } };

  // The night of the fire: who knows what the house is for, and who is inside it when it burns.
  const KNOWS_PLOT = { any: [{ teacher: "vidura" }, { path: "spy" }, { flag: "helped_tunnel" }, { flag: "smelled_oil" }, { flag: "tried_nishada" }] }; // (owner, 5 November: more players reach the cellar)
  const INSIDE = (S) => S.flags.includes("tried_nishada") || S.flags.includes("helped_tunnel") || S.flags.includes("warned_pandavas") || S.flags.includes("cut_fuses");

  K.scenes([
    {
      id: "a3_secret", when: { flag: "hermit_secret" }, skipTo: "a3_debt",
      act: 3, age: 21, art: "scene_secret", place: "The Kuru assembly hall", caption: "Before the Kuru court",
      title: "Who taught you?",
      body: ["Drona asks, in front of the court, who trained you. Mauni made you promise never to say."],
      choices: [
        { id: "tell", t: "Tell the truth", fx: { duty: { teacher: -3, court: 1 }, rep: { kuru: 1 }, curse: "hermit", flag: "betrayed_hermit", journal: "You told the court who taught you, and broke your promise to Mauni." },
          text: "Drona nods, satisfied. That night a boy brings you three words from the forest, \"At the worst hour\", and you are cursed." },
        { id: "lie", t: "Say you taught yourself", tags: ["lie"], fx: { duty: { teacher: 1, conscience: -1 } } },
        { id: "refuse", t: "Refuse to answer", fx: { rep: { kuru: -2 }, duty: { teacher: 2, court: -2 }, memory: ["drona", "You refused him in open court."] } }
      ],
      next: "a3_debt"
    },
    {
      id: "a3_debt", when: { flag: "debt_owed" }, skipTo: "a3_lac",
      act: 3, age: 21, art: (S) => K.childArt(S), place: (S) => K.childPlace(S),
      title: "The debt comes due",
      body: ["Sudatta the moneylender brings a note your grandfather signed. With interest, it is more than your family owns."],
      choices: [
        { id: "serve", t: "Work it off for a year", fx: { skill: { statecraft: 1 }, duty: { family: 1 }, unflag: "debt_owed", flag: "debt_paid", journal: "You worked a year on Sudatta's caravans to clear your family's debt." } },
        { id: "friend", t: "Ask {friend} for help", req: { has: "friend" },
          resolve: (S) => ({ bond: { [S.friend]: 1 }, unflag: "debt_owed", flag: "debt_paid", memory: [S.friend, "They paid your family's debt without being asked twice."] }) },
        { id: "tear", t: "Tear up the note", fx: { rep: { common: -1 }, duty: { family: -2 }, flag: "debt_refused", journal: "You tore up Sudatta's note. He said he would be patient." }, hint: "Sudatta will be patient" }
      ],
      next: "a3_lac"
    },
    {
      id: "a3_lac", act: 3, age: 23, canon: true, place: "Varnavata", to: "varnavata", travel: "You go to Varnavata for the spring festival.", art: "scene_lac", still: true, plate: ["#e5872e", "#2a1c1f"], caption: "A new house that smells of resin",
      title: "The house at Varnavata",
      witness: [
        "The house of lac is built to burn. Vidura's miner digs a tunnel under it."
      ],
      body: (S) => [
        S.teacher === "vidura" ? "The miner needs someone to carry earth out at night, unseen." : null
      ],
      choices: [
        Object.assign(K.testChoice("a3_lac", "dig", TUNNEL), { locked: "Only Vidura's people know about the tunnel." }),
        { id: "warn", t: "Warn the Nishada woman and her sons", fx: (S) => ({ duty: { conscience: 2 }, flag: "tried_nishada", memory: ["all", "You tried to wake the family who died at Varnavata."], rep: S.origin === "nishada" ? { common: 2 } : {} }),
          text: "They drank deep at Kunti's feast and do not wake, however hard you shake them." },
        { id: "tell", t: "Tell Duryodhana people are talking", req: { friend: "duryodhana" }, fx: { bond: { duryodhana: 2 }, duty: { court: 1, conscience: -2 }, flag: "warned_duryodhana" } },
        { id: "oil", t: "Follow the smell of oil under the floor", fx: { flag: "smelled_oil", journal: "At Varnavata you found oil pooled in channels under the floor of the house of lac." },
          text: "Under the boards, oil lies in channels, running from Purochana's rooms to where the brothers sleep." },
        { id: "stay", t: "Keep away from the house", fx: {} }
      ],
      after: ["On the last night of the festival, the house of lac burns."],
      next: "a3_tunnel_again"
    },
    {
      id: "a3_tunnel_again", when: K.retryWhen("a3_lac", ["dig"]), skipTo: "a3_fuse", act: 3, age: 23, art: "stage_lac_wall", place: "Varnavata", caption: "The next night",
      title: "The next night", body: ["The miner waits with an empty basket. There will not be a third time."],
      choices: [K.retryChoice("a3_lac", "dig", TUNNEL), { id: "let", t: "Leave it to the miner", fx: {}, text: "You stay away. The miner digs on alone." }],
      next: "a3_fuse"
    },
    // ---------- The night the house burns (PRD §18.2) ----------
    // Earlier that night, those who know the plot can go down to the cellar and cut Purochana's oil
    // lines; every line cut buys time when the fire comes. Or warn Yudhishthira plainly. Or say
    // nothing, and keep your own family out of it.
    {
      id: "a3_fuse", when: KNOWS_PLOT, skipTo: "a3_fire", act: 3, age: 23, away: true, art: "stage_lac_cellar", place: "Varnavata", caption: "The cellar under the house of lac",
      title: "The last night of the festival",
      body: ["Everyone in the house is asleep, the Nishada family too. In the cellar, Purochana's oil lines run to every room.",
        "He means to light them tonight."],
      choices: [
        { id: "cut", t: "Cut the oil lines", game: "fuse", hint: "A test of stealth",
          trial: { attr: "grace", skill: "stealth", stage: "stage_lac_cellar", lines: 3, secs: 48, verb: "Cut",
            rules: "Hold to cut a line while the light is away; let go in the light. Cut two of three.",
            howto: ["Tap an oil line to choose it. Cut two of the three.", "Hold Cut while the lamp is at either end.",
              "Let go when its light falls on the lines: Cut turns gold just before. Seen twice, and you must leave."],
            stakes: ["Every line cut slows the fire tonight, and the Pandavas will owe you.", "The guard sends you up the stairs with the lines whole. The fire will run as fast as Purochana meant it to."] },
          win: { fx: { flag: ["cut_fuses", "bhima_debt"], bond: { yudhishthira: 1, bhima: 1 }, journal: "On the last night at Varnavata you cut Purochana's oil lines in the cellar." }, text: "The oil runs out across the stone and soaks into the earth. Upstairs, someone turns over in their sleep." },
          close: { fx: { flag: ["cut_fuses", "bhima_debt"] }, text: "One line parts before the lamp comes back for good. It will have to be enough." },
          lose: { fx: {}, text: "The lamp finds you twice, and the second time the guard does not look away. You go up the stairs with the lines whole." } },
        { id: "warn", t: "Warn Yudhishthira it is tonight", fx: { flag: ["warned_pandavas", "bhima_debt"], bond: { yudhishthira: 2, bhima: 1 }, rep: { kuru: -1 }, duty: { conscience: 1 } },
          text: "Yudhishthira listens without surprise. \"Vidura told me in a riddle. You have told me in plain words.\"" },
        { id: "silent", t: "Say nothing", fx: { duty: { family: 1, conscience: -2 }, memory: ["all", "You knew what the house at Varnavata was for, and said nothing."] },
          text: "You go to bed with the smell of resin in your clothes, and do not sleep." }
      ],
      next: "a3_fire"
    },
    // The fire. Those inside the house play the escape through the burning rooms to the tunnel;
    // those outside can run in. The epic has written who dies here: a Nishada woman and her five
    // sons, and Purochana. A failed escape is death: the first failure is survived, burnt, with one more try.
    {
      id: "a3_fire", act: 3, age: 23, canon: true, art: "scene_lac_fire", liveArt: "scene_lac", fx: "fire", place: "Varnavata", plate: ["#e5872e", "#2a1c1f"], caption: "The house of lac, burning",
      title: "The night of the fire",
      witness: ["The house of lac burns. The Pandavas escape through the tunnel, and Purochana dies in his own fire."],
      body: (S) => [
        INSIDE(S) ? (S.flags.includes("tried_nishada") ? "You wake beside the sleepers who would not wake, with smoke in your mouth. The far wall is already light." : "You are in the house when it goes up, between the sleeping rooms and the storeroom where the tunnel mouth is.")
          : "Shouting wakes you. The new house is burning.",
        S.flags.includes("cut_fuses") ? { memory: "The oil lines you cut have slowed it. There is a little more time than Purochana meant there to be." } : null
      ],
      choices: [
        { id: "run", t: (S) => (INSIDE(S) ? "Get to the tunnel" : "Run in to get people out"), game: "escape",
          trial: { attr: "grace", skill: "stealth", stage: "stage_lac_fire_top", start: (S) => (INSIDE(S) ? (S.flags.includes("tried_nishada") ? "deep" : "hall") : "door"), auto: 0.7,
            rules: "Reach the tunnel in the storeroom before the fire. Hold to force stuck doors.",
            howto: ["Tap a room beside you to move. Red rooms are burning.",
              "A brown bar is a stuck door: hold the room past it, or tap three times.",
              "Reach the tunnel, bottom left, before the fire. To carry a sleeper, stand on them and hold Wake; it slows you."],
            stakes: ["You reach the tunnel, and whoever you carried comes with you.", "The fire catches you in the house. You may get one more chance, and no more."] },
          retryStakes: ["You reach the tunnel, and whoever you carried comes with you.", "The fire catches you again, and this time it does not let go."],
          retryText: "The smoke takes your legs. You come to on the floor with your sleeve burning and the roof still up. You crawl. There is still a way to the storeroom, for a little longer.",
          retryCost: (S) => (S.injuries.includes("scar") ? { attr: { grace: -1 }, flag: "lac_scorched" } : { injury: "scar", flag: "lac_scorched" }),
          win: { fx: (S) => Object.assign({ flag: ["escaped_lac"], duty: { conscience: 1 }, journal: "You got out of the burning house at Varnavata through the tunnel." },
              S.lacCarried ? { flag: ["escaped_lac", "carried_out_lac"], rep: { common: 1 }, duty: { conscience: 2 }, memory: ["all", "You carried someone out of the house of lac."] } : {}),
            text: (S) => (S.lacCarried ? "You put the one you carried down at the bottom of the shaft, and only then feel your hands shaking." : "You drop into the tunnel mouth as the storeroom roof comes down behind you. The dark smells of earth, and of nothing burning.") },
          close: { fx: { flag: ["escaped_lac", "lac_late"], injury: "scar", journal: "You came through the flames at Varnavata, and not everyone you carried came with you." },
            text: "You come through the last room with your sleeve alight. Whoever was on your back is not there when you drop into the dark." },
          lose: { fx: (S) => (S.storyMode ? { injury: "scar", flag: ["lac_burnt"], journal: "The fire caught you in the house at Varnavata. Someone dragged you out, burnt." }
              : { die: true, flag: ["died_in_fire"], deathText: "{They} died in the house of lac at Varnavata, on the night everyone believes the Pandavas died.", set: { deathAt: { art: "end_fire", caption: "The house at Varnavata, at dawn", act: 3 } } }),
            text: (S) => (S.storyMode ? "The smoke takes your legs before the fire does. The next thing you know is cold air, and someone's hands under your arms, and your own skin." : "The smoke takes your legs before the fire does. The last thing you hear is the roof.") } },
        { id: "stay", t: "Keep shaking the sleepers", req: { flag: "tried_nishada" }, locked: "", hint: "They will not wake",
          fx: (S) => (S.storyMode ? { injury: "scar", flag: ["lac_burnt"], duty: { conscience: 1 } } : { die: true, flag: ["died_in_fire"], duty: { conscience: 1 }, deathText: "{They} would not leave the Nishada woman and her sons in the house of lac, and died beside them.", set: { deathAt: { art: "end_fire", caption: "The house at Varnavata, at dawn", act: 3 } } }),
          text: (S) => (S.storyMode ? "They do not wake. You are still holding the youngest when someone drags you out by the collar." : "They do not wake. You are still shaking the youngest when the smoke takes you.") },
        { id: "back", t: "Stay back with the crowd", req: (S) => !INSIDE(S), locked: "", fx: { memory: ["all", "You watched the house of lac burn from the lane."] },
          text: "You stand in the lane with everyone else and watch the roof fall in. Nobody comes out." }
      ],
      after: ["In the ashes they find six bodies, and everyone believes the Pandavas are dead."],
      next: "a3_kampilya"
    },
    // Going to Kampilya is a choice. Those who go may try the great bow; those who stay have the
    // spring hunt at home, and hear of the swayamvara from travellers.
    {
      id: "a3_kampilya", act: 3, age: 25, art: (S) => K.childArt(S), place: (S) => K.homePlace(S), caption: "Messengers on every road",
      travel: (S) => (S.flags.includes("helped_tunnel") ? "You slip away from Varnavata before anyone can ask questions, and go home." : "After the festival, you go home."),
      title: "A swayamvara at Kampilya",
      body: (S) => [
        "King Drupada will give his daughter Draupadi to whoever strings the great bow and hits the mark.",
        S.flags.includes("helped_tunnel") ? { memory: "Somewhere in the forest, five brothers everyone believes dead are still alive. You know it, because you carried the earth out of their tunnel." } : null,
        "Will you go?"
      ],
      choices: [
        { id: "ride", t: "Ride to Kampilya", fx: { flag: "went_kampilya" }, next: "a3_bow", hint: (S) => (S.flags.includes("act3_tested") ? null : "") },
        { id: "stay", t: "Stay home", fx: { flag: "stayed_home_a3" }, next: "a3_hunt", hint: (S) => (S.flags.includes("act3_tested") ? null : "The spring hunt") }
      ],
      next: "a3_bow"
    },
    {
      id: "a3_swayamvara", act: 3, age: 25, canon: true, place: "Drupada's hall, Panchala", to: "panchala", travel: "You ride to Kampilya for the swayamvara.", art: "scene_swayamvara", plate: ["#d4a84b", "#c0472f"], caption: "A golden fish turning above the water",
      title: "Draupadi's swayamvara",
      body: ["What do you do?"],
      choices: [
        { id: "fight", t: "Stand with the brahmins", combat: "e_kings" },
        { id: "calm", t: "Talk the kings down",
          peril: { kind: "death", art: "scene_swayamvara", caption: "Drupada's hall, in uproar", text: "A king's bodyguard does not wait for you to finish your sentence.",
            deathText: "{They} stepped between the angry kings at Draupadi's swayamvara, and did not step back out." },
          check: { attr: "command", skill: "statecraft", dc: 8,
            pass: { fx: { rep: { panchala: 1, yadava: 1, common: 1 }, flag: "calmed_kings" }, text: "Two kings sheathe their swords and walk out with you. Fewer men are hurt that day because of it." },
            fail: { fx: {}, text: "Nobody listens to you. You step back as the fighting starts." } } },
        { id: "kings", t: "Side with the kings", fx: { bond: { duryodhana: 1, arjuna: -1 }, rep: { kuru: 1, panchala: -1 } } },
        { id: "watch", t: "Watch", fx: {} }
      ],
      after: ["The brahmins were Arjuna and Bhima in disguise, and Draupadi becomes the wife of all five brothers."],
      next: "a3_court"
    },
    // For those who stayed at home: the same story, told by travellers.
    {
      id: "a3_news", act: 3, age: 25, canon: true, place: (S) => K.homePlace(S), art: "scene_swayamvara", caption: "A traveller's story",
      title: "News from Kampilya",
      witness: [
        "The Pandavas are alive, and Draupadi is the wife of all five."
      ],
      body: (S) => [
        "You hear it from a traveller at the well.",
        S.flags.includes("spring_deer") ? { memory: "Your deer is already forgotten. Nobody is going to make up a song about it now." } : null
      ],
      choices: [
        { id: "glad", t: "Drink to the Pandavas", fx: { rep: { pandava: 1 }, duty: { conscience: 1 } } },
        { id: "worry", t: "Wonder what Duryodhana will do", fx: { skill: { statecraft: 1 } }, text: "An old man at the well looks at you sharply. \"Nothing good,\" he says." },
        { id: "shrug", t: "Shrug", fx: { rep: { common: 1 } } }
      ],
      next: "a3_court"
    },
    {
      id: "a3_court", act: 3, age: 26, canon: true, place: "Hastinapura and Indraprastha", art: "scene_indraprastha", plate: ["#3e8c72", "#d4a84b"], caption: "A new city rises from burned forest",
      title: "Two kingdoms",
      witness: [
        "The Pandavas are given half the kingdom, and build Indraprastha."
      ],
      body: ["Where do you make your life?"], // (owner, 5 November: less of the screen under words)
      choices: [
        { id: "hastinapura", t: "Serve Hastinapura", fx: { rep: { kuru: 2 }, bond: { duryodhana: 1 }, journal: "You pledged yourself to the court at Hastinapura." }, resolve: pledge("hastinapura") },
        { id: "indraprastha", t: "Serve Indraprastha", fx: { rep: { pandava: 2 }, bond: { yudhishthira: 1 }, journal: "You went to Indraprastha to serve Yudhishthira." }, resolve: pledge("indraprastha") },
        { id: "home", t: "Go home", fx: { rep: { common: 1 }, duty: { family: 1 }, journal: "You went home to serve your own people." }, resolve: (S) => pledge(K.HOME_COURT[S.origin])(S),
          text: (S) => (S.origin === "mathura" ? "Your people have left Mathura for Dwaraka, a new city by the western sea. You follow them there." : null) },
        { id: "none", t: "Serve no king", fx: { set: { court: "none" }, rep: { common: 1 }, journal: "You chose to serve no king." }, resolve: (S) => ({ duty: { court: 1 - S.duty.court } }) }
      ],
      next: "a3_courttest"
    },
    {
      id: "a3_marriage", act: 3, age: 27, art: "origin", place: (S) => K.COURTS[S.court]?.name || "Home",
      title: "A marriage",
      body: (S) => [
        "Your family wants you married.",
        "Madhavi is a healer's daughter from home. Revat trains horses and laughs at everything.",
        K.hasVow("celibacy") ? { aside: "You swore a vow of celibacy. Marrying would break it." } : null
      ],
      choices: [
        { id: "madhavi", img: "p_madhavi", t: "Marry Madhavi", tags: ["marry"], fx: { set: { spouse: "madhavi" }, setBond: { madhavi: 7 }, duty: { family: 2 }, item: { herbs: 1 }, journal: "You married Madhavi." } },
        { id: "revat", img: "p_revat", t: "Marry Revat", tags: ["marry"], fx: { set: { spouse: "revat" }, setBond: { revat: 7 }, duty: { family: 2 }, skill: { chariot: 1 }, journal: "You married Revat." } },
        { id: "charu", img: "p_charu", t: "Marry Charu", req: { friend: "charu" }, tags: ["marry"], fx: { set: { spouse: "charu" }, bond: { charu: 2 }, duty: { family: 2 }, journal: "You married Charu, your oldest friend." } },
        { id: "none", t: "Do not marry", fx: {} }
      ],
      next: "s_court"
    },
    {
      id: "a3_rajasuya", act: 3, age: 29, canon: true, place: "Indraprastha", travel: "All the kings of Bharata go to Indraprastha for Yudhishthira's great sacrifice, and you go too.", art: "scene_rajasuya", plate: ["#6f8fd8", "#d4a84b"], caption: "The hall that Maya built",
      title: "The Rajasuya",
      witness: [
        "In Maya's hall, Duryodhana falls into a pool, and Bhima laughs."
      ],
      body: ["He comes up near you, soaked and shaking with rage."],
      choices: [
        { id: "laugh", t: "Laugh with everyone else", fx: { bond: { bhima: 1, duryodhana: -2 }, memory: ["duryodhana", "You laughed when he fell in the water."] } },
        { id: "help", t: "Help Duryodhana up", fx: { bond: { duryodhana: 2 }, duty: { conscience: 1 }, memory: ["duryodhana", "You helped him out of the water when everyone was laughing."] } },
        { id: "listen", t: "Follow and listen",
          peril: { kind: "death", art: "scene_rajasuya", caption: "Behind a curtain in Maya's hall", text: "The curtain moves behind you. Shakuni's man is there before you can turn, and his hand is over your mouth.",
            deathText: "{They} listened behind a curtain at Indraprastha, and Shakuni's men made sure {they} never told what {they} heard." }, req: { any: [{ path: "spy" }, { teacher: "vidura" }, { attr: ["grace", 4] }] }, locked: "You would need to be quiet on your feet.",
          check: { attr: "grace", skill: "stealth", dc: 8,
            pass: { fx: { flag: "knows_dice_plot", journal: "You overheard Shakuni planning a game of dice to ruin the Pandavas." }, text: "Behind a curtain you hear Shakuni say it plainly: Yudhishthira cannot refuse a challenge to dice, and Shakuni cannot lose." },
            fail: { fx: { rep: { kuru: -1 } }, text: "A guard moves you along before you hear anything useful." } } },
        { id: "away", t: "Look away", fx: { duty: { conscience: 1 } } }
      ],
      after: ["At home, Shakuni tells Duryodhana there is a way to take it all from them."],
      next: "a4_invite"
    }
  ]);

  K.encounter({
    id: "e_kings", title: "The brawl at the swayamvara", art: "scene_swayamvara", caption: "Kings with drawn swords", lethal: false,
    intro: "The angry kings' guards rush the two brahmins. You are in the way.",
    allies: [{ name: "The huge brahmin", person: "bhima", hp: 90, atk: 11, def: 3, abilities: ["strike", "heavy"] }],
    enemies: [K.foe("A king's bodyguard", 3), K.foe("A king's bodyguard", 2)],
    win: { fx: { bond: { arjuna: 2, bhima: 2 }, rep: { panchala: 2, kuru: -2 }, flag: "swayamvara_fought", journal: "You fought beside two brahmins at Draupadi's swayamvara. They were Bhima and Arjuna." }, text: "The guards fall back. The huge brahmin claps you on the shoulder hard enough to bruise." },
    lose: { fx: { bond: { bhima: 1 }, injury: "scar" }, text: "You go down early, and the huge brahmin steps over you to finish the fight." }
  });
})(window.K = window.K || {});
