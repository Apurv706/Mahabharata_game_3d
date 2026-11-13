/* Act I — Childhood (ages 6–14). PRD §6. */
(function (K) {
  "use strict";
  const homeLine = {
    hastinapura: "Your father keeps the palace stores.",
    panchala: "Your mother makes arrows for the king's archers.",
    matsya: "Your family keeps horses on the lake shore.",
    mathura: "Your uncle trades on the Yamuna. Everyone in Mathura whispers when they speak of King Kamsa.",
    anga: "Your family serves in the Anga guard, which goes where the Kuru king sends it.",
    suta: "Your father drives chariots in the household of the old charioteer Adhiratha.",
    nishada: "Your village fishes the river and hunts the forest.",
    gandhara: "Your family serves King Subala in the mountains. His daughter Gandhari married the blind Kuru king."
  };

  // Why a family from a far land comes to live near the Kuru capital.
  const journeyLine = {
    gandhara: "When you are seven, Queen Gandhari sends for people from home. Your family moves to Hastinapura.",
    mathura: "Your uncle goes to Hastinapura with a Yadava embassy. Your family goes with him, and stays.",
    matsya: "The Kuru stables need horses. Your family moves to the stable quarter outside Hastinapura.",
    anga: "Your father's company of the Anga guard is posted to Hastinapura.",
    panchala: "The Kuru armoury sends for Panchala arrowsmiths. Your family moves to Hastinapura.",
    suta: "When you are seven, Adhiratha's household moves to Hastinapura, yours with it, and his foster son Karna, a boy your age.",
    nishada: "The royal hunts need your father as a guide. Your family moves to the forest's edge outside Hastinapura."
  };
  // Where the childhood that follows happens: near the capital for families who moved there.
  K.childPlace = (S) => (S.flags.includes("moved_capital") ? (S.origin === "nishada" ? "The forest's edge outside Hastinapura" : S.origin === "suta" ? "The charioteers' quarter, Hastinapura" : "Hastinapura") : S.origin === "suta" ? "The charioteers' lane, Champa" : K.ORIGINS[S.origin].name);
  // Where you live as an adult: the court you joined in act 3, otherwise where you grew up.
  K.homePlace = (S) => { const c = S.act >= 3 && S.court && S.court !== "none" && K.COURTS[S.court]; return c ? c.name : K.childPlace(S); };
  // The charioteer family's Champa years use Anga's paintings; in Hastinapura they live in the charioteers' quarter.
  K.childArt = (S) => (S.origin === "suta" ? (S.flags.includes("moved_capital") ? "home_suta" : "home_anga") : S.flags.includes("moved_capital") && S.origin !== "nishada" ? "home_hastinapura" : "home_" + S.origin);

  // ---------- Act I's action tests ----------
  // A friendship has to be earned: each prince sets a test, played in its own place. Fail it and the
  // prince lets you try once more, there and then. Fail that too and the way is closed: you go back to
  // choosing a friend, with that prince crossed out (see K.loopBack). Charu is always there.
  const FRIENDS = {
    arjuna: {
      game: "aim", hint: "An archery test",
      trial: { attr: "aim", skill: "archery", dark: true, icon: "lamp", stage: "stage_palace_garden_night", cast: ["arjuna"],
        rules: "Release as the swinging flame crosses your line. Two hits of three.",
        stakes: ["Arjuna becomes your closest friend.", "Arjuna remembers you missed, and lets you try once more."] },
      retryStakes: ["Arjuna becomes your closest friend.", "Arjuna gives up on you, and you must choose another friend. It counts as two failures, and it will weigh on every archery test to come."],
      crossWhy: "Arjuna stopped offering after you missed his lamp twice.",
      win: { fx: { set: { friend: "arjuna" }, bond: { arjuna: 3 }, setBond: { charu: 4 }, flag: "hit_the_lamp", memory: ["arjuna", "You hit his swinging lamp in the dark when you were ten."], journal: "Arjuna became your closest friend. You earned it with a bow." },
        text: "Arjuna looks at the flame, then at you. From then on, you practise together." },
      close: { fx: { bond: { arjuna: 1 }, flag: "second_arjuna" }, text: "One arrow finds the flame. \"Not bad,\" Arjuna says, and sets the lamp swinging again." },
      lose: { fx: { flag: "second_arjuna" }, text: "Three arrows vanish into the dark. Arjuna laughs, not unkindly, and shows you how to hold the bow." },
      retryLose: { penalty: 1, fx: { set: { friend: "charu" }, setBond: { charu: 7 }, bond: { arjuna: -2 }, flag: "missed_lamp_twice", memory: ["arjuna", "You missed his lamp twice. He stopped offering."] },
        text: "You miss again. Arjuna turns back to the lamp and does not offer again." },
      line: "Arjuna sets the lamp swinging again and holds out his bow. \"Once more,\" he says. \"Then I go in to eat.\""
    },
    bhima: {
      game: "push", hint: "A wrestling test",
      trial: { attr: "might", skill: "mace", foe: "Bhima", stage: "stage_river_shallows", cast: ["bhima"],
        rules: "Push as the ring meets the mark. Three good pushes win; three slips lose.",
        stakes: ["Bhima becomes your closest friend.", "Bhima laughs about it for a week, and lets you try once more."] },
      retryStakes: ["Bhima becomes your closest friend.", "Bhima stops taking you seriously, and you must choose another friend. It counts as two failures, and it will weigh on every wrestling test to come."],
      crossWhy: "Bhima threw you in the river twice. He calls you \"little fish\" now.",
      win: { fx: { set: { friend: "bhima" }, bond: { bhima: 3 }, setBond: { charu: 4 }, flag: "threw_bhima", memory: ["bhima", "You put him in the river when you were ten. He has never stopped telling people."], journal: "Bhima became your closest friend. You put him in the river to earn it." },
        text: "Bhima comes up spluttering and roaring with laughter. \"Again!\" he shouts, and from that day you are hardly ever apart." },
      lose: { fx: { bond: { bhima: 1 }, flag: "second_bhima" }, text: "You go into the river three times. Bhima hauls you out each time, delighted." },
      retryLose: { penalty: 1, fx: { set: { friend: "charu" }, setBond: { charu: 7 }, bond: { bhima: -2 }, flag: "thrown_by_bhima_twice", memory: ["bhima", "He threw you in the river twice. He calls you \"little fish\" now."] },
        text: "Into the river again. Bhima pats your head and calls you \"little fish\", and the name sticks." },
      line: "Bhima wades back into the shallows and beckons. \"Once more,\" he says. \"I was not ready.\" He was."
    },
    duryo: {
      game: "retort", hint: "A test of nerve",
      trial: { attr: "command", skill: "statecraft", stage: "stage_lotus_garden", cast: ["duryodhana", "dushasana"],
        rules: "Answer each taunt before the lamp burns down. Two good answers of three.",
        stakes: ["Duryodhana becomes your closest friend.", "The brothers remember you backed down. Duryodhana lets them try you once more."],
        rounds: [
          { line: "\"Who let this one into the gardens? Did the stables send us a present?\"", replies: ["\"The prince asked me here. Did he ask for you?\"", "\"I am sorry. I will go.\"", "\"Better the stables than your father's kitchen.\""] },
          { line: "Dushasana plants his foot on yours and leans. \"Say please, and I will move.\"", replies: ["\"I can stand here as long as you can.\"", "\"Please.\"", "Shove him into the pond."] },
          { line: "Duryodhana speaks at last. \"They say you are nobody. Are they right?\"", replies: ["\"Today, yes. Ask me again in ten years.\"", "\"I am whatever you want me to be, prince.\"", "\"They are fools, and so are you for listening to them.\""] }
        ] },
      retryStakes: ["Duryodhana becomes your closest friend.", "The brothers will never let you forget it, and you must choose another friend. It counts as two failures, and it will weigh on every test of statecraft to come."],
      crossWhy: "You backed down twice in front of Duryodhana's brothers.",
      win: { fx: { set: { friend: "duryodhana" }, bond: { duryodhana: 3 }, setBond: { charu: 4 }, flag: "stood_your_ground", memory: ["duryodhana", "You stood your ground in front of his brothers when you were ten."], journal: "Duryodhana became your closest friend. You stood your ground to earn it." },
        text: "Duryodhana throws an arm around your shoulders. \"This one is mine,\" he tells his brothers." },
      lose: { fx: { flag: "second_duryo" }, text: "The brothers laugh. Duryodhana does not; he looks at you and waits." },
      retryLose: { penalty: 1, fx: { set: { friend: "charu" }, setBond: { charu: 7 }, bond: { duryodhana: -2 }, rep: { kuru: -1 }, flag: "backed_down_twice", memory: ["duryodhana", "You backed down in front of his brothers twice."] },
        text: "Again the words will not come. Dushasana tells the story at every feast for a year, and the court laughs with him." },
      line: "Dushasana is already walking back toward you, grinning. Duryodhana raises a hand. \"Let them try again,\" he says. \"Once.\""
    },
    karna: {
      game: "steady", hint: "A test of a steady hand",
      trial: { attr: "grace", skill: "chariot", stage: "stage_stable_yard", cast: ["karna"], horse: true,
        help: "Hold to move your hand right; let go and it drifts back. Keep it on the horse's head as it shies.",
        rules: "Keep your hand on the maddened horse's head until it is calm.",
        stakes: ["Karna becomes your closest friend.", "Karna has to manage alone this time, and asks you to try once more."] },
      retryStakes: ["Karna becomes your closest friend.", "Karna stops asking, and you must choose another friend. It counts as two failures, and it will weigh on every chariot test to come."],
      crossWhy: "Twice Karna asked for your help with a horse, and twice it beat you.",
      win: { fx: { set: { friend: "karna" }, bond: { karna: 3 }, setBond: { charu: 4 }, flag: "calmed_the_horse", memory: ["karna", "You calmed a maddened horse beside him when you were ten."], journal: "Karna became your closest friend. You calmed a horse together to earn it." },
        text: "The horse drops its head into your hands. \"You have the touch,\" Karna says. \"Most people only have the whip.\"" },
      close: { fx: { bond: { karna: 1 }, flag: "second_karna" }, text: "The horse pulls free at the last moment, and Karna catches the rope. \"Nearly.\"" },
      lose: { fx: { flag: "second_karna" }, text: "The horse tears free, and Karna is dragged half across the yard before he catches it again." },
      retryLose: { penalty: 1, fx: { set: { friend: "charu" }, setBond: { charu: 7 }, bond: { karna: -2 }, flag: "horse_beat_you_twice", memory: ["karna", "Twice he asked for your help with a horse, and twice it beat you."] },
        text: "The horse throws you into the straw. Karna gets it in hand alone, as he always has, and does not ask you again." },
      line: "The horse has torn free again, and Karna is running after its rope. \"Once more!\" he shouts over his shoulder."
    }
  };
  const SECOND = { arjuna: "second_arjuna", bhima: "second_bhima", duryo: "second_duryo", karna: "second_karna" };
  const friendTest = (k, retry) => {
    const f = FRIENDS[k];
    return { game: f.game, hint: retry ? "Your second chance" : f.hint, trial: Object.assign({}, f.trial, retry ? { stakes: f.retryStakes } : {}), win: f.win,
      close: retry ? f.retryLose : f.close || f.lose, lose: retry ? f.retryLose : f.lose,
      next: retry ? undefined : "a1_friend_again", // a first failure: the prince lets you try again at once
      back: retry ? { scene: "a1_friend", unflag: Object.values(SECOND), why: f.crossWhy } : undefined };
  };
  const UGRA_WIN = { fx: { rep: { common: 1 }, bond: { charu: 1 }, flag: ["beat_ugra", "balarama_noticed"], journal: "You beat Ugra in the ring at the spring fair. A giant of a man with a plough on his shoulder asked your name." },
    text: "Ugra hits the sand and lets go of Charu. At the edge of the crowd a giant of a man with a plough on his shoulder asks your name." };

  // The game of tag by the lotus pond (age 8): on Bhima's side you creep up on Duryodhana; on
  // Duryodhana's, Bhima is hunting you. Daylight, so the cone is where the watcher is looking.
  const TAG = {
    bhima: { attr: "grace", skill: "stealth", verb: "Creep", watch: "duryodhana", daylight: true, stage: "stage_lotus_garden", trips: 1, spots: 2, secs: 40,
      help: "Hold to creep along the hedge. Stop when Duryodhana looks your way.",
      tally: "Seen: {s} of {m}", spotted: "Duryodhana turns, and you freeze behind the hedge. His brothers point.", made: "You tag him!",
      rules: "Creep up on Duryodhana along the hedge. Seen twice, and you are out.",
      stakes: ["You tag Duryodhana in front of everyone, and Bhima throws him in the pond.", "Duryodhana tags you out, and his brothers cheer."] },
    // A chase, not a creep (owner, 5 November: the lamp game came round too often): run from Bhima for the far wall.
    duryo: { attr: "grace", skill: "stealth", stage: "stage_lotus_garden", vehicle: "foot", obstacles: ["rock", "wave"], hull: 3, speed: 2.4,
      tally: "Distance: {d}% · Falls: {h} of {l}", bump: "You trip, and hear Bhima crashing through the lotuses behind you.",
      help: "Run for the far wall round the stones and the lotus pools: up and down, or the buttons.", helpSide: "Run left and right round the stones and the lotus pools.",
      rules: "Run from Bhima across the garden to the far wall. Fall three times, and he has you.",
      stakes: ["You are the only one on your side Bhima never catches.", "Bhima catches you and throws you into the pond."] }
  };

  K.scenes([
    // ---------- The prologue: a dream of the war ----------
    // Before the childhood, two minutes at Kurukshetra: you, grown, in the dust of the thirteenth day
    // (your age stays six: it is a six-year-old's dream; only the figure is grown, ui/puppet.js),
    // and one fight that breaks off mid-blow. Then you wake, six years old. Not on your record.
    {
      id: "a0_dream", act: 1, age: 6, prologue: true, away: true, sleepIntro: true, actTitle: "A dream of Kurukshetra", place: "Kurukshetra, the thirteenth day",
      art: "war_day14", caption: "Kurukshetra, the thirteenth day", title: "The field",
      // Who is fighting, and over what, so a newcomer knows where the story is going; which side you
      // are on is left open, because your life decides it.
      witness: ["The thirteenth day of the great war at Kurukshetra: the five Pandava brothers against their hundred Kaurava cousins."],
      body: ["You are grown, with a sword in your hand. A warrior in a dented helmet comes at you through the dust."],
      choices: [{ id: "fight", t: "Raise your sword", combat: "e_dream", hint: "A dream of the war" }],
      next: "a1_home"
    },
    {
      id: "a1_home", act: 1, age: 6, art: "origin", place: (S) => K.childPlace(S),
      title: "Your earliest memory",
      body: (S) => [S.flags.includes("dreamt_the_field") ? { memory: "You never forget the dream, or what your father said that night: be ready when it comes." } : null,
        homeLine[S.origin],
        S.karma ? { memory: ["At night you dream you are someone else: {past}, born in {land}, grown and grey, with a whole life behind them. In the dream it always ends the same way: {end!}.", { past: S.karma.name, land: K.ORIGINS[S.karma.origin]?.name || "", end: S.karma.title }] } : null,
        "You are six. How do you spend your days?"],
      choices: [
        { id: "drills", t: "Copy the soldiers' drills", fx: { skill: { mace: 1 }, attr: { might: 1 } },
          text: "You march behind them with a stick for a spear until the old sergeant gives up chasing you off and starts correcting your grip instead." },
        { id: "stories", t: "Listen to the storyteller", fx: { skill: { lore: 1 }, attr: { wisdom: 1 }, flag: "loved_stories" },
          text: "By the time you are seven you can tell his stories back to him. He pretends not to know the endings." },
        { id: "wild", t: "Run wild", fx: { skill: { stealth: 1 }, attr: { grace: 1 } },
          text: "You learn which branches hold, where the deer drink, and how to come home after dark without anyone hearing the door." },
        { id: "home", t: "Help at home", fx: { skill: { healing: 1 }, duty: { family: 1 }, attr: { wisdom: 1 } },
          text: "You learn to set a goat's leg and quiet a crying baby, and your grandmother starts calling you when anyone in the lane is sick." }
      ],
      next: "a1_first"
    },
    // The first test comes at once, and does not count: it shows how tests work.
    {
      id: "a1_first", act: 1, age: 6, art: "origin", place: (S) => K.homePlace(S),
      title: "Three pebbles",
      body: (S) => [
        S.origin === "gandhara" ? "The best apricot hangs where no one can reach it." : "The best mango hangs where no one can reach it.",
        "Your cousin hands you three pebbles. \"Knock one down, and it is yours.\""
      ],
      choices: [
        { id: "throw", t: "Take the pebbles and aim", game: "aim", hint: "A first test",
          trial: { practice: true, attr: "aim", icon: "fruit", verb: "Throw", sling: { pebbles: 6, need: 3 }, shots: 3, need: 1, easy: 0.12, speed: 0.95, stage: "stage_mango_yard", cast: ["cousin"],
            rules: "The fruit sways on its branch. Throw as it crosses your line. One hit is enough." },
          win: { fx: { flag: "first_throw" }, text: (S) => (S.origin === "gandhara" ? "The apricot drops into the grass. It is the best thing you have ever eaten, and you tell everyone so, loudly." : "The mango drops into the grass. It is the best thing you have ever eaten, and you tell everyone so, loudly.") },
          lose: { fx: {}, text: "Three pebbles, three misses. Your cousin knocks one down and gives it to you anyway." } }
      ],
      next: "a1_roots"
    },
    // Families from the far lands come to live near Hastinapura, so the childhood that follows happens
    // within reach of the palace. Hastinapura families are already there; the charioteer family comes
    // up the Ganga from Champa with Adhiratha's household.
    {
      id: "a1_journey", when: (S) => S.origin !== "hastinapura", skipTo: "a1_lane",
      act: 1, age: 7, art: "scene_journey", place: "The road to Hastinapura", caption: "Hastinapura, at the end of the road", to: "hastinapura", travelAfter: true,
      travel: (S) => (S.origin === "suta" ? "Adhiratha's household is called to the Kuru court, and your family goes with it." : "Your family is moving to Hastinapura."),
      enter: { flag: "moved_capital" },
      title: "The road to Hastinapura",
      body: (S) => [
        journeyLine[S.origin],
        "On the road, what do you hold on to?"
      ],
      choices: [
        { id: "guards", t: "Watch the guards", fx: { skill: { stealth: 1 } },
          text: "By the end of the road you can tell a guard who is awake from one who only looks awake." },
        { id: "words", t: "Learn the new city's ways", fx: { skill: { statecraft: 1 }, rep: { kuru: 1 } },
          text: "You arrive speaking like a Kuru child, nearly. Your parents are proud and a little sad." },
        { id: "reins", t: "Beg to hold the reins", fx: { skill: { chariot: 1 } },
          text: "On the last day, on a straight stretch of road, the old driver lets you." },
        { id: "earth", t: "Keep a handful of home earth", fx: { duty: { family: 1 }, flag: "kept_home_earth", journal: { src: "You carried a handful of earth from {origin} to Hastinapura." } },
          text: "You keep it under your sleeping mat. Years later, you still have it." }
      ],
      next: "a1_lane"
    },
    // ---------- Ugra and Charu, the first time ----------
    // At seven, the bully and the friend arrive together: Ugra tips your washing into the river, and a
    // child you have never spoken to goes in after it. The fair at thirteen and the friend you choose at
    // ten pay this off.
    {
      id: "a1_lane", act: 1, age: 7, art: (S) => K.childArt(S), place: (S) => K.childPlace(S), caption: "The river steps",
      title: "The washing",
      body: [
        "At the river steps, Ugra, the miller's big son, tips your basket of washing into the river.",
        "A small, loud child you have never met jumps in after it."
      ],
      choices: [
        { id: "fight", t: "Go for Ugra", fx: { flag: ["met_charu", "knows_ugra", "fought_ugra_young"], setBond: { charu: 3 }, attr: { might: 1 }, memory: ["charu", "You went for Ugra at the river steps when you were seven, and Charu hit him with your wet washing."] },
          text: "You hit him once, and the child from the river hits him with your wet washing. Ugra lets you both go, laughing, and learns your faces." },
        { id: "help", t: "Jump in and help the stranger", fx: { flag: ["met_charu", "knows_ugra"], setBond: { charu: 4 }, attr: { grace: 1 }, memory: ["charu", "You went into the river after your washing together when you were seven."] },
          text: "Between you, you get it all back but one cloth. The stranger is Charu, the blacksmith's child from the end of your lane." },
        { id: "words", t: "Threaten Ugra", fx: { flag: ["met_charu", "knows_ugra", "warned_ugra_young"], setBond: { charu: 2 }, attr: { wisdom: 1 } },
          text: "\"Tell him,\" Ugra says, and laughs, but he does not touch you again that day. The child in the river brings your washing up the steps." }
      ],
      next: "a1_princes"
    },
    {
      id: "a1_princes", act: 1, age: 8, canon: true, place: "The palace gardens, Hastinapura", art: "scene_princes", plate: ["#d4a84b", "#3e8c72"], caption: "The palace gardens",
      title: "The princes at play",
      witness: [
        "Bhima wins every game, and Duryodhana does not laugh."
      ],
      body: ["At the palace festival, the princes choose sides for tag."],
      choices: [
        { id: "bhima", t: "Play on Bhima's side", game: "sneak", hint: "A game of tag", trial: TAG.bhima,
          win: { fx: { bond: { bhima: 2, duryodhana: -1 }, flag: ["played_bhima", "tagged_duryodhana"], memory: ["duryodhana", "You tagged him by the lotus pond when you were eight, and Bhima threw him in."] },
            text: "You tag Duryodhana before he hears you, and Bhima throws him in the pond. He climbs out alone and looks straight at you." },
          lose: { fx: { bond: { bhima: 1 }, flag: "played_bhima" },
            text: "Duryodhana spins round and tags you, and his brothers cheer. Bhima's side wins anyway." } },
        { id: "duryo", t: "Join Duryodhana", game: "race", hint: "A game of tag", trial: TAG.duryo,
          win: { fx: { bond: { duryodhana: 3, bhima: -1 }, flag: ["played_duryodhana", "escaped_bhima"], memory: ["duryodhana", "You were the only one Bhima could not catch, the day of the lotus pond."] },
            text: "You are the only one on your side Bhima cannot catch. Duryodhana, dripping, laughs for the first time all day." },
          lose: { fx: { bond: { duryodhana: 2, bhima: -1 }, flag: ["played_duryodhana", "ducked_by_bhima"] },
            text: "Bhima throws you in with the others and holds you under until you gasp. Duryodhana fishes your sandal out: \"Next time we win.\"" } },
        { id: "arjuna", t: "Watch Arjuna practise", fx: { bond: { arjuna: 1 }, skill: { archery: 1 }, flag: "watched_arjuna" },
          text: "Behind the stables Arjuna lets you try his bow once. You miss, and he shows you how to breathe out before you let go." },
        { id: "karna", t: "Help Karna with the horses", req: { origin: ["suta", "anga"] }, locked: "", fx: { bond: { karna: 2 }, skill: { chariot: 1 }, flag: "met_karna_young" },
          text: "Karna works without a word until the grey mare nips your shoulder. Then he laughs and shows you where she likes to be scratched." }
      ],
      next: "a1_sage"
    },
    {
      id: "a1_sage", act: 1, age: 9, place: "The road home", art: "scene_sage", plate: ["#c9a24a", "#5c3361"], caption: "A dusty road at noon",
      title: "A sage on the road",
      body: ["An old sage by the road holds out his empty water pot."],
      choices: [
        { id: "give", t: "Give him water and food", fx: { rep: { sages: 2 }, duty: { conscience: 1 }, flag: "kind_to_sage" },
          text: "He drinks and puts his hand on your head. \"Keep your feet for eighteen days.\"" },
        { id: "mock", t: "Mock him", fx: { curse: "sage", rep: { sages: -2 }, journal: "You mocked a sage on the road. He said you would remember it on the field where eighteen armies die." },
          text: "\"You will remember this,\" he says quietly, \"on the field where eighteen armies die.\" You are cursed." },
        { id: "pass", t: "Walk past", fx: {},
          text: "Behind you he says something like \"eighteen\" to the empty road. When you look back, he is gone." }
      ],
      next: "a1_friend"
    },
    {
      id: "a1_friend", act: 1, age: 10, art: (S) => K.childArt(S), place: (S) => K.childPlace(S),
      title: "A friend for life",
      body: (S) => [
        S.flags.includes("met_charu") ? "Charu, who jumped into the river after your washing when you were seven, has followed you everywhere since. Charu is loud, loyal and afraid of nothing except the dark."
          : "Charu, the blacksmith's child from your lane, has followed you everywhere for a year.",
        "Who will be your friend?"
      ],
      choices: [
        { id: "charu", img: "p_charu", t: "Charu", fx: { set: { friend: "charu" }, setBond: { charu: 7 }, flag: "chose_charu", memory: ["charu", "You chose each other when you were ten."], journal: "Charu became your closest friend." } },
        { id: "bhima", img: "p_bhima", t: "Bhima", req: { flag: "played_bhima" }, locked: "You would have needed to play on Bhima's side.", ...friendTest("bhima") },
        { id: "duryo", img: "p_duryodhana", t: "Duryodhana", req: { flag: "played_duryodhana" }, locked: "You would have needed to join Duryodhana's side.", ...friendTest("duryo") },
        { id: "arjuna", img: "p_arjuna", t: "Arjuna", req: { flag: "watched_arjuna" }, locked: "You would have needed to watch Arjuna practise.", ...friendTest("arjuna") },
        { id: "karna", img: "p_karna", t: "Karna", req: { bond: ["karna", 4] }, locked: "You would need to know Karna already.", ...friendTest("karna") }
      ],
      next: "s_child"
    },
    // The second chance comes at once: the prince lets you try again, there and then.
    {
      id: "a1_friend_again", when: (S) => Object.values(SECOND).some((f) => S.flags.includes(f)), skipTo: "s_child",
      // The second chance is offered where the first one happened: the river for Bhima, the stable yard for Karna, and so on.
      act: 1, age: 10, art: (S) => { const k = Object.keys(SECOND).find((x) => S.flags.includes(SECOND[x])); return (k && FRIENDS[k].trial && FRIENDS[k].trial.stage) || K.childArt(S); }, place: (S) => K.childPlace(S),
      title: "Once more",
      body: (S) => [Object.keys(SECOND).filter((k) => S.flags.includes(SECOND[k])).map((k) => FRIENDS[k].line)[0], "There will not be a third time."],
      choices: [
        Object.assign({ id: "arjuna", img: "p_arjuna", t: "Take Arjuna's bow", req: { flag: "second_arjuna" }, locked: "" }, friendTest("arjuna", true)),
        Object.assign({ id: "bhima", img: "p_bhima", t: "Wade in and wrestle Bhima", req: { flag: "second_bhima" }, locked: "" }, friendTest("bhima", true)),
        Object.assign({ id: "duryo", img: "p_duryodhana", t: "Face Duryodhana's brothers again", req: { flag: "second_duryo" }, locked: "" }, friendTest("duryo", true)),
        Object.assign({ id: "karna", img: "p_karna", t: "Take the horse's rope beside Karna", req: { flag: "second_karna" }, locked: "" }, friendTest("karna", true)),
        { id: "let", t: "Go back to Charu", fx: { set: { friend: "charu" }, setBond: { charu: 7 }, unflag: Object.values(SECOND) }, text: "You walk home with Charu, who pretends not to be pleased." }
      ],
      next: "s_child"
    },
    {
      id: "a1_poison", act: 1, age: 12, canon: true, place: "Pramanakoti, on the Ganga", travel: "The princes go down to Pramanakoti for the river games, and you go with them.", art: "scene_poison", plate: ["#3b5ba9", "#16131f"], caption: "Pavilions by the river",
      title: "The river at Pramanakoti",
      witness: [
        "Duryodhana poisons Bhima and rolls him into the Ganga."
      ],
      body: (S) => [
        "You saw Duryodhana's men carry something heavy to the water. No one else did.",
        S.friend === "duryodhana" ? { memory: "Duryodhana is your closest friend. He catches your eye across the pavilion and smiles." } : null,
        S.friend === "bhima" ? { memory: "Bhima is your closest friend. His mother has not slept." } : null
      ],
      choices: [
        { id: "tell", t: "Tell Vidura what you saw", fx: { duty: { conscience: 2 }, bond: { duryodhana: -3, vidura: 2 }, rep: { pandava: 1 }, memory: ["duryodhana", "You told Vidura what his men did at the river."] },
          text: "Vidura listens without surprise. \"Say this to no one else. Not yet.\"" },
        { id: "search", t: "Search the riverbank",
          check: { attr: "grace", skill: "stealth", dc: 7,
            pass: { fx: { bond: { bhima: 2 }, flag: "found_vines" }, text: "Downstream you find footprints leading out of the water, not in. Bhima walked out alive." },
            fail: { fx: { bond: { duryodhana: -1 } }, text: "Duryodhana's men find you on the bank. They send you home with a warning and a split lip." } } },
        { id: "silent", t: "Say nothing", fx: { duty: { conscience: -1 }, bond: { duryodhana: 1 }, memory: ["duryodhana", "You saw, and kept quiet."] } },
        { id: "ask", t: "Ask Duryodhana to confess", req: { friend: "duryodhana" }, locked: "", fx: { bond: { duryodhana: -1 }, duty: { conscience: 1 } },
          text: "\"You of all people,\" he says, and walks away. He does not speak to you for a month." }
      ],
      after: ["Eight days later Bhima walks back into the palace, healed by the serpents beneath the river."],
      next: "a1_pasha"
    },
    {
      id: "a1_pasha", act: 1, age: 13, art: "scene_pasha", place: "The spring fair", caption: "Dice under a striped awning",
      title: "The dice-board under the awning",
      body: [
        "At the spring fair, old Haridatta keeps a dice-board."
      ],
      choices: [
        { id: "play", t: "Play him for a copper", game: "pasha", hint: "Dice, best of three",
          win: { fx: { item: { herbs: 1 }, flag: ["learned_pasha", "beat_haridatta"], journal: "You beat old Haridatta at dice at the spring fair." },
            text: "Haridatta laughs and pays you in healing herbs. \"The dice are honest. Men are not.\"" },
          lose: { fx: { flag: "learned_pasha" },
            text: "Haridatta keeps your copper. \"One, two, five, six. Someone who knows the dice knows when they lie.\"" } },
        { id: "watch", t: "Watch the men play", fx: { skill: { lore: 1 } },
          text: "The players talk while they throw. A king called Nala, they say, once lost his kingdom at dice, and his wife, and very nearly himself." },
        { id: "walk", t: "Go to the wrestling ground", fx: {} }
      ],
      next: "a1_wrestle"
    },
    {
      id: "a1_wrestle", act: 1, age: 13, art: "scene_fair", place: "The wrestling ground at the spring fair",
      title: "Ugra at the fair",
      body: (S) => [
        S.flags.includes("knows_ugra") ? "Ugra, who tipped your washing into the river, is bigger than ever."
          : "Ugra, the miller's big son, bullies the small children at every fair.",
        S.flags.includes("fought_ugra_young") ? { memory: "He sees you, and grins. He has not forgotten the river steps either." } : null,
        S.friend === "charu" ? "Today he has Charu's arm twisted behind Charu's back." : "Today he has a little girl's bangles in his fist, and she is crying."
      ],
      choices: [
        { id: "fight", t: "Challenge him", req: { not: { friend: "charu" } }, locked: "", combat: "e_ugra" },
        // With Charu in his grip it is a fight too (owner, 5 November: it had become a timing test of rings since 28 October);
        // lose it and you may get up for another bout (a1_rematch).
        { id: "bout", t: "Challenge him", req: { friend: "charu" }, locked: "", combat: "e_ugra" },
        { id: "talk", t: "Shame him",
          check: { attr: "command", skill: "lore", dc: 7,
            pass: { fx: { rep: { common: 1 }, flag: "shamed_ugra" }, text: "You turn the crowd's laughter on him. Ugra drops what he took and stalks off, looking back once at you." },
            fail: { fx: {}, text: "The crowd laughs at you instead. Ugra keeps his prize." } } },
        { id: "leave", t: "Walk away", fx: { duty: { conscience: -1 } } }
      ],
      next: "a2_teacher"
    },
    {
      id: "a1_rematch", act: 1, age: 13, art: "scene_fair", place: "The wrestling ground at the spring fair",
      title: "Get up",
      body: ["The crowd is laughing. Ugra is laughing. Charu is not."],
      choices: [
        { id: "again", t: "Get up and ask for another bout", combat: "e_ugra_again", hint: "Your second chance" },
        { id: "down", t: "Stay down", fx: { flag: "lost_to_ugra" }, text: "You stay down. Ugra lets Charu go anyway, bored." }
      ],
      next: "a2_teacher"
    }
  ]);

  // The prologue's fight: you as the warrior you will be. In real time (owner, 6 November) one clash of clashSecs
  // against the warrior and both soldiers at once, no orders and no help; on the turns (the Menu's choice), three
  // rounds. Then the dream breaks.
  K.encounter({
    id: "e_dream", title: "The thirteenth day", art: "war_day14", stage: "fight_war_field", caption: "Kurukshetra, the thirteenth day", lethal: false, callHelp: null,
    dream: { hp: 95, atk: 9, def: 3, abilities: ["strike", "guard", "crush", "quake", "feint"] },
    rounds: 3, clashSecs: 10, atOnce: 3, roundsText: "Your blades meet, and the whole field goes white.", winLine: "The dream breaks.", loseLine: "The dream breaks.",
    intro: "Two foot soldiers come in at your sides. The warrior in the dented helmet waits behind them, watching how you move.",
    enemies: [K.foe("The warrior in the dented helmet", 4, { hp: 150, person: null }), K.foe("The soldier on your left", 1), K.foe("The soldier on your right", 1)],
    win: { fx: { flag: "dreamt_the_field" }, text: "The field goes white. Far away, someone is calling your name." },
    lose: { fx: { flag: "dreamt_the_field" }, text: "The field goes white. Far away, someone is calling your name." }
  });

  // Ugra at the fair: a little girl's bangles in his fist, or (with Charu your friend) Charu's arm behind his back, when a
  // lost bout may be fought once more (a1_rematch, e_ugra_again).
  const charu = (S) => S.friend === "charu";
  K.encounter({
    id: "e_ugra", title: "Ugra at the fair", art: "scene_fair", caption: "The wrestling ring", lethal: false,
    intro: "The crowd makes a ring. Ugra grins and spits on his palms.",
    enemies: [K.foe("Ugra, the miller's son", 1, { hp: 26, atk: 4 })],
    win: { fx: UGRA_WIN.fx, text: (S) => (charu(S) ? UGRA_WIN.text : "Ugra stays down. A huge man with a plough over his shoulder laughs and asks your name: Balarama of the Yadavas.") },
    lose: { fx: (S) => (charu(S) ? {} : { duty: { conscience: 1 }, flag: "lost_to_ugra" }), text: (S) => (charu(S) ? "Ugra throws you out of the ring. Charu is still in his grip." : "You lose, badly. But you stood up to him, and everyone saw."),
      next: (S) => (charu(S) ? "a1_rematch" : undefined) }
  });
  K.encounter({
    id: "e_ugra_again", title: "Ugra at the fair", art: "scene_fair", caption: "The wrestling ring", lethal: false, realtime: true,
    intro: "Ugra waves you back into the ring, grinning.",
    enemies: [K.foe("Ugra, the miller's son", 1, { hp: 26, atk: 4 })],
    win: UGRA_WIN,
    lose: { fx: { rep: { common: -1 }, flag: ["lost_to_ugra", "ugra_twice"], memory: ["charu", "You got up and fought Ugra twice for Charu. You lost twice. Charu never forgot either part."] },
      text: "He throws you again, harder. Ugra lets Charu go anyway, bored, and Charu helps you home." }
  });
})(window.K = window.K || {});
