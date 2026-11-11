/* Threads, episodes and small systems (PRD §18.4, §18.5, §18.6), and the after-war scenes.
   Every scene here is optional, comes before a scene every road reaches (K.BEFORE), only when it
   applies, and is marked `away` so the map does not move for it. Ids begin with ep_.
   Threads: Ugra the rival across a life; the secret of Karna's birth and whom you tell; a wrong ask
   from each teacher; an elder sibling who takes the other side in the war.
   Episodes: a storm in the forest; a friend who drinks first at the Yaksha's lake; the hidden year
   (your false name, Kichaka's dancing hall); the war (a raid on the supply carts, false orders across
   the river, the truce at dusk, Shikhandi's charge); after the war (the ruined quarter, the rite for
   the dead, a student of your own, the pilgrimage).
   Small systems: letters from across the lines; keepsakes that become choices; the bard who gets it
   wrong unless you correct him.
   Art: the truce, the ruined quarter, the rite, the student and the pilgrimage have their own
   paintings, and the tests play on their own stages (the storm, Virata's court, Kichaka's hall, the
   supply camp, the river crossing, the tournament arena, Drona's gate). The rest still use a painting
   from the game (STANDIN) until theirs is painted. */
(function (K) {
  "use strict";

  // The painting each scene wants (the brief's key) -> the painting it uses until that arrives.
  const STANDIN = {
    stage_forest_storm: "stage_exile_storm", stage_virata_hall: "stage_virata_court", stage_dancing_hall: "stage_kichaka_hall_night",
    scene_supply_camp_night: "stage_supply_camp_night", scene_river_crossing: "stage_river_crossing_night",
  };
  const art = (k) => STANDIN[k] || k;
  const homeArt = (S) => (S.origin === "suta" && !S.flags.includes("moved_capital") ? "home_anga" : "home_" + S.origin);

  const sib = (S) => S.sibling && K.PEOPLE[S.sibling] ? K.PEOPLE[S.sibling].name : "your sibling";
  const sibAlive = (S) => !!S.sibling && !S.dead.includes(S.sibling);
  const sibP = (S) => ({ who: sib(S) });
  const other = (S) => (S.side === "kaurava" ? "pandava" : "kaurava");
  const FRIEND_SIDE = { karna: "kaurava", duryodhana: "kaurava", arjuna: "pandava", bhima: "pandava" };
  // A friend for life who fights on the other side of the field.
  const friendAcross = (S) => (S.friend && FRIEND_SIDE[S.friend] && S.side && S.side !== "neutral" && FRIEND_SIDE[S.friend] !== S.side && !S.dead.includes(S.friend) ? S.friend : null);
  const ugraMet = (S) => ["beat_ugra", "lost_to_ugra", "shamed_ugra"].some((f) => S.flags.includes(f));
  // Ugra is across the field only from those who shamed him at the fair; those who beat him or lost to
  // him fairly have him in the line beside them (act6a.js K.warAllies, day one).
  // (and across from anyone who crossed the lines away from him on the first morning: war_crossing.js).
  const ugraAcross = (S) => K.ugraAcross(S);
  const warring = (S) => S.side === "pandava" || S.side === "kaurava";

  Object.assign(K.PEOPLE, { dev: { name: "Dev", canon: false }, devi: { name: "Devi", canon: false } });
  // Shadow puppets for the sibling (puppet.js loads after the content, so they join on the first scene).
  const PUPPETS = {
    dev: { pronoun: "he", palette: ["#b8743f", "#5a4630", "#c9a066"], item: "spear", peer: true },
    devi: { pronoun: "she", palette: ["#b9743f", "#6b4a32", "#e2b55a"], item: "bow", peer: true }
  };
  // A keepsake is a small thing kept from a moment, that becomes a choice later (S.keepsakes).
  K.KEEPSAKES = {
    letter: { name: "a letter from across the lines", text: "Folded small, read many times." },
    amulet: { name: "your sibling's amulet", text: "A thread of dark cord with a copper disc." },
    hammer: { name: "Kesava's hammer", text: "The old smith put it in your hands on his last morning." },
    arrow: { name: "an arrow from the supply camp", text: "Picked out of a cart on the night of the raid." }
  };
  const hasKeep = (S, id) => (S.keepsakes || []).includes(id);

  // In the war, false orders delivered the night before weaken the enemy's line on the next day;
  // orders burned send your own line in with heart. Done once, at the start of that fight.
  K.on("combat", (B) => {
    const S = K.S;
    if (!B || B.over || B.round !== 1 || B._ep) return;
    B._ep = true;
    if (!B.enc.lethal || S.act !== 6) return;
    if (S.flags.includes("orders_delivered")) { B.living("enemy").forEach((u) => B.status(u, "weakened", 2)); B.say("Across the field the enemy's line is in the wrong place. Someone read your orders."); K.apply({ unflag: "orders_delivered" }); }
    else if (S.flags.includes("orders_burned")) { B.living("friends").forEach((u) => B.status(u, "inspired", 2)); B.say("Your own line is where it should be this morning, and knows it."); K.apply({ unflag: "orders_burned" }); }
  });

  // ---------- Tests reused with new words ----------
  const STORM = { id: "storm", t: "Run the children to shelter", game: "race", hint: "A run through the storm",
    trial: { attr: "grace", skill: "stealth", stage: "stage_exile_storm", vehicle: "foot", obstacles: ["rock", "fire"], hull: 3, speed: 3,
      tally: "Distance: {d}% · Falls: {h} of {l}", bump: "A branch takes you off your feet.", help: "Step aside from the branches and the water: up and down, or the buttons.", helpSide: "Step left and right around what the storm throws down.",
      rules: "Run for the rock shelter round the branches and water. Three falls and the flood has you.",
      stakes: ["You reach the shelter with the camp's children, and the storm passes over you.", "The flood takes your pack, and you limp in after dark."] },
    win: { fx: { flag: "ran_the_storm", rep: { common: 1 }, journal: "In the exile years you ran the camp's children to shelter through a forest storm." }, text: "You are under the rock with the last child when the ravine goes white. Nobody is lost." },
    lose: { fx: { item: { herbs: -1 }, injury: "leg" }, text: "The third branch takes you down and the water takes your pack, herbs and all. You crawl in after dark with a knee that will never be right." } };

  const SECOND_RIDDLES = [
    { line: "\"What is the one companion who follows a person past death?\"", replies: ["\"What they did.\"", "\"Their name.\"", "\"Their eldest son.\""] },
    { line: "\"What is the greatest wonder?\"", replies: ["\"That the living see the dead every day, and think they will not die.\"", "\"That the sun rises.\"", "\"That a king can be beaten at dice.\""] },
    { line: "\"By what is a person made a brahmin: birth, learning, or conduct?\"", replies: ["\"Conduct.\"", "\"Birth.\"", "\"Learning.\""] }
  ];
  const CHARU_LAKE = { id: "answer", t: "Answer for Charu", game: "retort", hint: "A test of wisdom",
    trial: { attr: "wisdom", skill: "lore", rounds: SECOND_RIDDLES, stage: "stage_forest_lake",
      rules: "Answer for both of you. Two right answers of three.",
      stakes: ["Charu sits up on the bank, coughing, and asks what you are staring at.", "The voice falls silent. Charu does not move again."] },
    win: { fx: { bond: { charu: 2 }, attr: { wisdom: 1 }, flag: "answered_for_charu", memory: ["charu", "I drank first at the lake. You answered for me."], journal: "At the lake in the forest Charu drank first and fell. You answered the voice for both of you." },
      text: "\"Drink,\" says the voice. Charu sits up on the bank, coughing up lake water, and asks what you are staring at." },
    lose: { fx: { die: "charu", duty: { conscience: -1 }, journal: "At the lake in the forest Charu drank first and fell, and your answers could not bring Charu back." },
      text: "Your last answer is wrong, and the voice is gone. Charu does not move again." } };

  const FALSE_NAME = [
    { line: "\"You hold that bow like a soldier, not a groom. Where did a groom learn that?\"", replies: ["\"Horses kick, my lord. One learns to hold things firmly.\"", "\"I was a soldier once.\"", "\"I hold it as I was taught.\""] },
    { line: "\"The queen's maid says you speak like someone raised in a palace.\"", replies: ["\"The queen's maid is kind. My mother beat good speech into me with a ladle.\"", "\"I was raised in a palace.\"", "\"The queen's maid should mind her own business.\""] },
    { line: "\"Tell me the name of the village you came from, and your father's name, quickly.\"", replies: ["\"Kundapur, on the river, my lord, and my father was Haridas who kept the ferry.\"", "\"I would rather not say.\"", "\"My father was a charioteer of Hastinapura.\""] }
  ];
  // Lying about who you are is a lie: a vow never to lie is warned of on the choice, and broken by it.
  const NERVE = { id: "nerve", t: "Lie without a flicker", game: "retort", hint: "A test of nerve", tags: ["lie"],
    trial: { attr: "wisdom", skill: "statecraft", rounds: FALSE_NAME, stage: "stage_virata_court",
      rules: "Answer the steward before the lamp burns down, and say nothing true. Two of three.",
      stakes: ["The steward loses interest, and your name stays yours.", "The steward keeps looking at you, and sends to Hastinapura to ask."] },
    win: { fx: { skill: { statecraft: 1 }, flag: "kept_false_name" }, text: "The steward grunts and goes to bother the cooks. Nobody asks again." },
    lose: { fx: { rep: { kuru: -1 }, flag: "name_suspected" }, text: "The steward says nothing more and writes something down. A rider leaves for Hastinapura that evening." } };

  const DANCE_HALL = { id: "hall", t: "Get her out in the dark", game: "sneak", hint: "A test of stealth",
    trial: { twist: "lamp", attr: "grace", skill: "stealth", stage: "stage_kichaka_hall_night", trips: 2, spots: 2, watch: "guard", verb: "Move",
      help: "Hold to move along the pillars. Stop when Kichaka's lamp turns your way.", tally: "Crossed: {d} of {n} · Seen: {s} of {m} · {t} seconds", made: "Across. Now back, with her.", spotted: "The lamp swings toward you. You press into a pillar.",
      rules: "Cross the hall to Draupadi and back along the pillars while the lamp sweeps the floor.",
      stakes: ["She is in the kitchens, among the women, when the screaming starts.", "Kichaka's lamp finds you, and you have to run before you reach her."] },
    win: { fx: { bond: { draupadi: 2, bhima: 1 }, duty: { conscience: 1 }, flag: "helped_draupadi_hall", journal: "In the hidden year you got Draupadi out of Kichaka's way the night Bhima was waiting for him." },
      text: "When the screaming starts in the dancing hall, she is sitting among the kitchen women with her head covered. Her hands are perfectly still." },
    lose: { fx: { bond: { bhima: -1 }, flag: "hall_seen" }, text: "The lamp finds you, and you run. Bhima does the rest alone." } };

  const CARTS = { id: "carts", t: "Cut the carts loose", game: "sneak", hint: "A test of stealth",
    trial: { twist: "dog", attr: "grace", skill: "stealth", stage: "stage_supply_camp_night", trips: 2, spots: 2, watch: "soldier", verb: "Move",
      help: "Hold to move between the carts. Stop when the sentry's torch turns.", tally: "Carts reached: {d} of {n} · Seen: {s} of {m} · {t} seconds", made: "The ropes are cut. Back to the dark.", spotted: "The sentry turns. You drop behind a wheel.",
      rules: "Reach the carts twice past the sentry's torch: once to cut the lines, once to fire the fodder.",
      stakes: ["The fodder burns, and tomorrow the enemy's horses are hungry.", "The sentry raises the alarm, and you fight your way out."] },
    win: { fx: { flag: "burned_carts", keepsake: "arrow", journal: "One night in the war you crept into the enemy's supply camp and burned their fodder." }, text: "The fodder goes up with a sound like wind. You are back in the horse lines before the first shout." },
    lose: { fx: { flag: "carts_alarm" }, next: "ep_carts_fight", text: "The sentry turns too soon, and the camp wakes around you." } };

  // A swim round the snags and the sentries' arrows, not a creep (owner, 5 November: the lamp game came round too often).
  const RIVER = { id: "swim", t: "Swim the river with it", game: "race", hint: "A test of stealth",
    trial: { attr: "grace", skill: "stealth", stage: "stage_river_crossing_night", vehicle: "foot", obstacles: ["wave", "arrow"], hull: 3, speed: 2.6,
      tally: "Across: {d}% · Close calls: {h} of {l}", bump: "An arrow splashes beside you. You go under and come up further down.",
      help: "Swim round the snags and the sentries' arrows: up and down, or the buttons.", helpSide: "Swim left and right round the snags and the sentries' arrows.",
      rules: "Swim the river round the snags and the arrows from the bank. Three close calls, and the night goes wrong.",
      stakes: ["You come up under their bank with the packet dry.", "A sentry sees the water move, and the night goes wrong."] },
    win: { fx: {}, text: "You come up under the enemy's bank with the packet dry, and lie in the reeds until your breath is quiet." },
    lose: { fx: { injury: "scar" }, text: "An arrow finds your shoulder in the water. You deliver the packet bleeding, and swim back the long way." } };

  const SIDE_PATH = { archer: "aim", mace: "push", charioteer: "race", strategist: "retort", healer: "steady", spy: "sneak", bard: "retort" };
  const STUDENT_ROUNDS = [
    { line: "\"Why do we bow to the teacher before we draw?\"", replies: ["\"So that the first thing the bow learns from us is respect.\"", "\"Because the teacher says so.\"", "\"To stretch the back.\""] },
    { line: "\"What do I do when I am afraid?\"", replies: ["\"The same thing you do when you are not.\"", "\"Run.\"", "\"Pray.\""] },
    { line: "\"When do I stop practising?\"", replies: ["\"When your fingers bleed, and then once more.\"", "\"When you have won.\"", "\"When it gets dark.\""] }
  ];
  function studentTest(S) {
    const kind = SIDE_PATH[S.path] || "retort";
    const base = { id: "test", t: "Teach the child", hint: "Your student's first test",
      win: { fx: { flag: "taught_student", attr: { wisdom: 1 }, rep: { common: 1 }, journal: "After the war you took a student of your own, and set the first test you were ever set." }, text: "Your student looks at you the way you once looked at your teacher. You understand, suddenly, several things your teacher never said." },
      lose: { fx: { flag: "taught_student" }, text: "Your student fails the first test, as you did. \"Again tomorrow,\" you hear yourself say, in your teacher's voice." } };
    const trials = {
      aim: { game: "aim", trial: { attr: "aim", skill: "archery", icon: "lamp", dark: true, shots: 3, need: 2, verb: "Release", stage: "stage_drona_gate", cast: ["boy"], rules: "Shoot the swinging lamp. Two hits of three.", stakes: ["Your student sees it can be done.", "Your student sees that even teachers miss."] } },
      push: { game: "push", trial: { attr: "might", skill: "mace", stage: "stage_training_ground", cast: ["boy"], foe: "your student", rules: "Your student braces against you in the ring. Push as the ring meets the mark, and do not push too hard.", stakes: ["Your student learns what a clean push feels like.", "Your student learns that the teacher can slip too."] } },
      race: { game: "race", trial: { attr: "grace", skill: "chariot", stage: "stage_racetrack", vehicle: "chariot", obstacles: ["rock", "wreck"], hull: 3, speed: 3, rules: "You take your student round the old track with you at the reins, and show how a chariot threads the stakes.", stakes: ["Your student sees how it is done.", "Your student sees a wheel catch, and learns that too."] } },
      steady: { game: "steady", trial: { attr: "wisdom", skill: "healing", stage: "stage_healers_hall", cast: ["healer", "boy"], verb: "Hold", secs: 16, help: "Hold to press; let go to ease off. Keep your hands over the glow until it is set.", tally: "Set: {c}%", rules: "A boy with a broken arm, and your student watching your hands. Set it while your student counts.", stakes: ["Your student has seen a bone set properly.", "Your student has seen that it is hard."] } },
      sneak: { game: "sneak", trial: { attr: "grace", skill: "stealth", stage: "stage_palace_corridor", trips: 2, spots: 2, watch: "guard", verb: "Move", help: "Hold to move. Stop before the light reaches you.", rules: "You set your student to watch with a lamp, and cross the corridor twice unseen, as you were once made to.", stakes: ["Your student never sees you cross.", "Your student catches you, and is very pleased."] } },
      retort: { game: "retort", trial: { attr: "wisdom", skill: "lore", rounds: STUDENT_ROUNDS, stage: "stage_vidura_table", cast: ["boy"], rules: "Answer your student before the lamp burns down. Two of three.", stakes: ["Your student writes your answers down.", "Your student finds a better teacher."] } }
    };
    return Object.assign(base, trials[kind]);
  }

  K.scenes([
    // ---------- Threads: an elder sibling ----------
    {
      id: "ep_sibling", act: 1, age: 6, away: true, when: (S) => !S.sibling && !S.flags.includes("no_sibling"), skipTo: "a1_first", next: "a1_first",
      art: homeArt, place: (S) => K.childPlace(S), caption: "The one who went ahead of you",
      title: "The one born before you",
      body: ["Did you have an older brother or sister?"],
      choices: [
        { id: "dev", img: "p_revat", t: "A brother, Dev", fx: { set: { sibling: "dev" }, setBond: { dev: 6 }, flag: "has_sibling", memory: ["dev", "You followed me everywhere when you were six."] },
          text: "Dev pretends to mind. Dev never once sends you home." },
        { id: "devi", img: "p_madhavi", t: "A sister, Devi", fx: { set: { sibling: "devi" }, setBond: { devi: 6 }, flag: "has_sibling", memory: ["devi", "I pushed you in the river when you were six, and you swam."] },
          text: "Devi watches from the bank with her arms folded until you reach it. Then she claps, once." },
        { id: "none", t: "No one", fx: { flag: "no_sibling", duty: { family: 1 } } }
      ]
    },
    // ---------- Threads: Ugra at the tournament ----------
    {
      id: "ep_ugra_tournament", act: 2, age: 17, away: true, when: (S) => ugraMet(S) && !S.dead.includes("ugra"), skipTo: "a2_tournament", next: "a2_tournament",
      art: "stage_tournament_arena", place: "Tournament grounds, Hastinapura", caption: "The morning before the princes' tournament", // the arena the bout is fought in (owner, 5 November: not the procession)
      title: "The miller's son, again",
      body: (S) => [
        "Among the village levies at the tournament grounds is Ugra, the miller's son.",
        S.flags.includes("beat_ugra") ? { speaker: "Ugra", line: "You. The one from the fair. I have been practising." } : S.flags.includes("lost_to_ugra") ? { speaker: "Ugra", line: "You. The one who came back for a second throw. I told everyone in my village about you." } : { speaker: "Ugra", line: "You. You ran from my ring. Do you still run?" }
      ],
      choices: [
        { id: "bout", t: "Wrestle him", game: "push", hint: "A wrestling bout", trial: { attr: "might", skill: "mace", stage: "stage_tournament_arena", cast: ["ugra"], foe: "Ugra", rules: "Push as the ring meets the mark. Three good pushes win; three slips lose.", stakes: ["Ugra laughs, and shakes your hand, and the levies cheer.", "Ugra puts you in the horse trough, and the levies cheer louder."] },
          win: { fx: { bond: { ugra: 2 }, flag: "ugra_tournament_won", rep: { common: 1 } }, text: "Ugra goes down in the dust, gets up, and laughs so loud the horses shy. \"Again at the next fair,\" he says." },
          lose: { fx: { bond: { ugra: 1 }, flag: "ugra_tournament_lost" }, text: "You come up out of the horse trough to find Ugra holding out a hand. \"Again at the next fair,\" he says." } },
        { id: "talk", t: "Talk to him", fx: { bond: { ugra: 1 }, attr: { wisdom: 1 } },
          text: "\"Holding horses,\" he says. \"And watching how the princes fight, for when we have to fight them.\"" },
        { id: "ignore", t: "Walk past", fx: { bond: { ugra: -1 }, flag: "ugra_slighted" }, text: "You feel his eyes on your back all the way to the stands." }
      ]
    },
    // ---------- Threads: a wrong ask from your teacher ----------
    {
      id: "ep_mentor_vidura", act: 3, age: 29, away: true, when: (S) => S.teacher === "vidura" && !!S.friend && S.friend !== "charu", skipTo: "a3_rajasuya", next: "a3_rajasuya",
      art: art("scene_mentor_vidura"), place: "Vidura's house", caption: "A lamp, a table, a question",
      title: "What Vidura asks",
      body: ["Vidura sends for you after dark, which he never does.",
        ["\"Tell me what {friend} says when the court is not listening,\" he says. \"For the kingdom's sake.\"", null]],
      choices: [
        { id: "obey", t: "Spy on your friend", fx: (S) => ({ duty: { teacher: 2, conscience: -2 }, bond: { vidura: 1, [S.friend]: -1 }, flag: "spied_on_friend", memory: [S.friend, "Someone told Vidura things I said only to you. I never asked who."] }),
          text: "You carry Vidura what you hear, a little at a time. {friend} never finds out." },
        { id: "half", t: "Agree, and tell him nothing", check: { attr: "wisdom", skill: "statecraft", dc: 8,
          pass: { fx: { duty: { conscience: 1 } }, text: "You bring Vidura gossip the whole court knows. He listens gravely, and after a month stops asking, and you are fairly sure he always knew." },
          fail: { fx: { duty: { teacher: -2 }, bond: { vidura: -1 } }, text: "Vidura sees through it in a week. \"If you would not do it, you should have said so.\"" } }, hint: "A test of wits" },
        { id: "refuse", t: "Refuse him", fx: { duty: { teacher: -1, conscience: 2 }, bond: { vidura: 1 }, flag: "refused_vidura" },
          text: "Vidura is quiet for a long moment. \"Good. I hoped you would say that.\"" }
      ]
    },
    {
      id: "ep_mentor_kripa", act: 4, age: 30, away: true, when: (S) => S.teacher === "kripa", skipTo: "a4_hall", next: "a4_hall",
      art: art("scene_mentor_kripa"), place: "The assembly hall, Hastinapura", caption: "Before the dice are thrown",
      title: "What Kripa asks",
      body: ["Kripa finds you by the pillars.",
        { speaker: "Kripa", line: "Whatever happens today, the throne is in the right. Swear you will say so." }],
      choices: [
        { id: "swear", t: "Swear it", tags: ["lie"], fx: { duty: { teacher: 2, conscience: -2 }, rep: { pandava: -1 }, flag: "swore_for_throne" }, text: "You swear it. An hour later you watch what the throne does, and the oath sits in your mouth like a stone." },
        { id: "evade", t: "Say you will tell what you see", fx: { duty: { teacher: -1, conscience: 1 } }, text: "\"That is what I am afraid of,\" Kripa says, and goes to his seat." },
        { id: "refuse", t: "Refuse. A throne can be wrong", fx: { duty: { teacher: -2, conscience: 2 }, rep: { kuru: -1 }, flag: "refused_kripa" }, text: "Kripa looks at you as if you had struck him. \"Then you have learned nothing from me.\"" }
      ]
    },
    {
      id: "ep_mentor_peace", act: 5, age: 44, away: true, when: (S) => ["hermit", "balarama"].includes(S.teacher) && !S.flags.includes("betrayed_hermit"), skipTo: "a5_side", next: "a5_side",
      art: art("scene_mentor_peace"), place: "A road before the war", caption: "A teacher's last asking",
      title: (S) => (S.teacher === "balarama" ? "What Balarama asks" : "What Mauni asks"),
      body: (S) => (S.teacher === "balarama"
        ? ["Balarama, who has refused both sides, finds you on the road.", { speaker: "Balarama", line: "Promise me you will not fight in this war." }]
        : ["A leaf comes from Mauni with three words: never fight them."]),
      choices: [
        { id: "promise", t: "Promise", fx: { duty: { teacher: 2 }, flag: "promised_peace" }, hint: "Fight anyway, and it is broken",
          text: (S) => (S.teacher === "balarama" ? "Balarama grips your shoulder. \"Then there is one of you I will not have to mourn.\"" : "You burn the leaf, as Mauni would want, and keep the words.") },
        { id: "refuse", t: "Say you will go where duty takes you", fx: { duty: { teacher: -2, conscience: 1 } },
          text: (S) => (S.teacher === "balarama" ? "Balarama nods slowly. \"Then at least be the one who comes back,\" he says, and walks on toward the river." : "You send the boy back with no answer. Mauni will understand the silence.") }
      ]
    },
    // ---------- Threads: the secret you carry ----------
    {
      id: "ep_secret_tell", act: 5, age: 44, away: true, when: (S) => S.flags.includes("left_arena") && !S.flags.includes("secret_told"), skipTo: "a5_karna_secret", next: "a5_karna_secret",
      art: art("scene_secret_told"), place: "Hastinapura, before the war", caption: "A thing known for twenty-seven years",
      title: "Who to tell",
      body: ["You know whose son Karna is. The war is coming. Who do you tell?"],
      choices: [
        { id: "duryodhana", t: "Tell Duryodhana", req: { bond: ["duryodhana", 4] }, locked: "Duryodhana would need to listen to you.", fx: { flag: ["secret_told", "told_duryodhana_secret"], bond: { duryodhana: 1, karna: -3 }, duty: { conscience: -2 }, memory: ["karna", "You told Duryodhana what I was before you told me."] },
          text: "\"It changes nothing,\" Duryodhana says at last. \"He is my friend.\" But he looks at Karna differently after that." },
        { id: "yudhishthira", t: "Tell Yudhishthira", req: { bond: ["yudhishthira", 3] }, locked: "Yudhishthira would need to know you.", fx: { flag: ["secret_told", "told_yudhishthira_secret"], bond: { yudhishthira: 2, krishna: -1 }, duty: { conscience: 1 } },
          text: "Yudhishthira weeps and goes to Krishna, who already knows. Nothing changes, except Yudhishthira's face." },
        { id: "kunti", t: "Tell Kunti you know", fx: { flag: ["secret_told", "told_kunti_secret"], rep: { pandava: 1 }, attr: { wisdom: 1 } },
          text: "Kunti does not ask how you know. \"Pray that I am braver at the river than I was.\"" },
        { id: "keep", t: "Keep it", fx: { flag: "secret_told", duty: { conscience: 1 } }, text: "You keep it, as you have for twenty-seven years. Karna will hear it from the two people who should tell him." }
      ]
    },
    // ---------- Threads: Ugra rises in the other camp ----------
    {
      id: "ep_ugra_rise", act: 5, age: 44, away: true, when: (S) => ugraMet(S) && !S.dead.includes("ugra"), skipTo: "a5_side", next: "a5_side",
      art: art("scene_ugra_letter"), place: "Before the war", caption: "A letter in a miller's hand",
      title: "Ugra's letter",
      body: ["A letter from Ugra: if the war puts him on the other side, he will not look for you."],
      choices: [
        { id: "write", t: "Write back", fx: { bond: { ugra: 1 }, flag: "wrote_to_ugra" }, text: "You write back about the fair and do not mention the war. He will have understood." },
        { id: "burn", t: "Burn it", fx: { flag: "burned_ugra_letter" }, text: "You burn it, and remember every word anyway." }
      ],
      enter: { flag: "ugra_across" }
    },
    // ---------- Threads: the sibling takes the other side ----------
    {
      id: "ep_sibling_side", act: 6, age: 44, away: true, when: (S) => sibAlive(S) && warring(S), skipTo: "a6_eve", next: "a6_eve",
      art: homeArt, place: (S) => K.homePlace(S), caption: "Two spears in one house",
      title: "The other side of the house",
      body: (S) => [["{who} comes home in the colours of the other side.", sibP(S)],
        ["\"If we meet out there,\" {who} says, \"look the other way. I will.\"", sibP(S)]],
      choices: [
        { id: "promise", t: "Promise to look the other way", fx: (S) => ({ bond: { [S.sibling]: 2 }, flag: "sibling_promise", keepsake: "amulet", memory: [S.sibling, "We promised to look the other way on the field, and I gave you my amulet to remember it."] }),
          text: (S) => ["{who} takes off the copper amulet {who} has worn since you were children and ties it on your wrist. Neither of you says anything else.", sibP(S)] },
        { id: "argue", t: "Argue to change their side", check: { attr: "wisdom", skill: "statecraft", dc: 9,
          pass: { fx: (S) => ({ bond: { [S.sibling]: 1 }, flag: "sibling_same_side", memory: [S.sibling, "You talked all night, and in the morning I came with you."] }), text: (S) => ["At dawn {who} puts the other side's colours in the fire. \"If we die, we die together, then.\"", sibP(S)] },
          fail: { fx: (S) => ({ bond: { [S.sibling]: -2 }, flag: "sibling_quarrel" }), text: (S) => ["{who} leaves before dawn without saying goodbye. You tell yourself there will be time afterwards.", sibP(S)] } }, hint: "A test of wits" },
        { id: "silent", t: "Say nothing", fx: {}, text: "You sit up together until the lamp goes out. In the morning you leave by different gates." }
      ]
    },
    // ---------- Episodes: a storm in the forest ----------
    {
      id: "ep_storm", act: 5, age: 36, away: true, when: (S) => S.seen.includes("a5_jayadratha") || S.seen.includes("a5_forest_boon"), skipTo: "a5_yaksha", next: "a5_yaksha",
      art: art("stage_forest_storm"), place: "The Kamyaka forest", caption: "The sky goes black at noon",
      title: "The storm",
      body: ["A flood is coming down the ravine, and the children are far from shelter."],
      choices: [STORM, { id: "climb", t: "Climb a tree and wait", fx: { duty: { family: -1 } }, text: "You spend the night in the branches with two children clinging to you. In the morning the camp is a riverbed." }]
    },
    // ---------- Episodes: Charu drinks first ----------
    {
      id: "ep_lake_charu", act: 5, age: 42, away: true, when: (S) => S.friend === "charu" && !S.dead.includes("charu") && S.flags.includes("a5_yaksha_answer_again"), skipTo: "a5_yaksha_again", next: "a5_yaksha_again",
      art: art("scene_lake_charu"), place: "A lake in the forest", caption: "Charu, face down at the water's edge",
      title: "Charu drinks",
      body: ["Charu, who heard no voice, drinks, and falls face down at the water's edge.",
        "\"One of you drank without answering,\" says the voice."],
      choices: [CHARU_LAKE,
        { id: "drag", t: "Drag Charu to the camp", fx: { die: "charu", duty: { conscience: -1 }, journal: "At the lake in the forest Charu drank first and fell, and you could not carry Charu back to the camp in time." }, text: "You get Charu halfway to the camp. It is not far enough." }]
    },
    // ---------- Episodes: the hidden year ----------
    {
      id: "ep_false_name", act: 5, age: 43, away: true, when: (S) => S.seen.includes("a5_matsya") && S.exile === "forest", skipTo: "a5_herd", next: "a5_herd", // only those hiding with the Pandavas
      art: art("stage_virata_hall"), place: "King Virata's court, Matsya", caption: "The steward asks questions",
      title: "Your false name",
      body: ["In Virata's household you live under a false name, and the steward has begun to ask questions."],
      choices: [NERVE,
        // Those who have sworn never to lie can answer with nothing but the truth, and let the steward
        // draw his own wrong conclusions. Their word, once an act, carries it without a test.
        { id: "truth", t: "Answer only with true things", req: { vow: "never_lie" }, locked: "", hint: "Keeps your vow",
          check: { attr: "wisdom", skill: "statecraft", dc: 8,
            pass: { fx: { skill: { statecraft: 1 }, flag: ["kept_false_name", "truth_to_steward"], duty: { conscience: 1 } }, text: "\"From a hard teacher, my lord,\" you tell the steward, which is true. He hears a groom with a past and goes to bother the cooks." },
            fail: { fx: { rep: { kuru: -1 }, flag: "name_suspected" }, text: "The steward hears every true word you say and writes something down. A rider leaves for Hastinapura that evening." } } },
        { id: "leave", t: "Leave the household", fx: { rep: { common: -1 }, flag: "left_virata" }, text: "You take work in the town instead, and hear the rest of the year as rumour." }]
    },
    {
      id: "ep_kichaka", act: 5, age: 43, away: true, when: (S) => S.seen.includes("a5_matsya") && S.exile === "forest" && !S.flags.includes("left_virata"), skipTo: "a5_herd", next: "a5_herd",
      art: art("stage_dancing_hall"), place: "The dancing hall, Matsya", caption: "The night Bhima waited in the dark",
      title: "The dancing hall",
      witness: ["Bhima will meet Kichaka, who torments Draupadi, in the dancing hall at midnight."],
      body: ["Bhima asks you to get Draupadi out of the hall first."],
      choices: [DANCE_HALL, { id: "no", t: "Stay out of it", fx: { bond: { bhima: -1 } }, text: "Bhima does it alone, as he would have anyway. In the morning there is a thing in the dancing hall that used to be a man." }],
      after: ["Bhima kills Kichaka in the dark, and the dancers say a Gandharva did it."]
    },
    // ---------- Episodes: the war ----------
    {
      id: "ep_shikhandi", act: 6, age: 44, away: true, war: true, when: (S) => S.side === "pandava", skipTo: "a6_bhishma", next: "a6_bhishma",
      art: art("scene_shikhandi"), place: "Kurukshetra · the tenth day", caption: "Shikhandi at the front of the chariot",
      title: "In front of Shikhandi",
      body: ["Shikhandi will ride before Arjuna's chariot today. Someone must ride in front of Shikhandi to take the arrows."],
      choices: [
        { id: "ride", t: "Ride in front of Shikhandi", combat: "e_ep_bhishma", fx: { flag: "rode_with_shikhandi" } },
        { id: "refuse", t: "Refuse", fx: { duty: { conscience: 1, court: -1 }, rep: { pandava: -1 }, flag: "refused_shikhandi" }, text: "Someone else rides. You watch the grandsire fall from the back of the line, and are not sure which of you was right." }
      ]
    },
    {
      id: "ep_letter_1", act: 6, age: 44, away: true, war: true, when: (S) => !!(friendAcross(S) || (sibAlive(S) && S.flags.includes("sibling_other_side_set")) || ugraAcross(S)), skipTo: "a6_capture", next: "a6_capture",
      art: art("scene_letter_camp"), place: "Your tent, after the tenth day", caption: "A letter carried under a truce flag",
      title: "A letter from across the field",
      body: (S) => {
        const f = friendAcross(S), who = f ? K.PEOPLE[f].name : sibAlive(S) && S.flags.includes("sibling_other_side_set") ? sib(S) : "Ugra";
        return [["A letter comes across the field from {who}.", { who }],
          f === "karna" ? { speaker: "Karna", line: "I saw your banner today and turned my chariot the other way. Do not make me do it twice." }
            : f === "duryodhana" ? { speaker: "Duryodhana", line: "I have not forgotten who stood with me when I was ten. Stay out of my path and I will stay out of yours." }
            : f === "arjuna" ? { speaker: "Arjuna", line: "If we meet, I will aim at your chariot and not at you. Do the same for me, and we can argue about it afterwards." }
            : f === "bhima" ? { speaker: "Bhima", line: "I will throw you in the river again when this is over. Keep your head down until then." }
            : who === "Ugra" ? { speaker: "Ugra", line: "I am looking for you anyway. Stay alive, you stubborn fool." }
            : { speaker: who, line: "Mother sends word that she is not speaking to either of us. Look the other way. I am." }];
      },
      choices: [
        { id: "reply", t: "Write back", fx: (S) => { const f = friendAcross(S) || (S.flags.includes("sibling_other_side_set") ? S.sibling : "ugra"); return { bond: { [f]: 1 }, keepsake: "letter", flag: "replied_letter" }; }, text: "You write three lines and send the boy back with them. The letter you fold small and keep against your skin." },
        { id: "silent", t: "Send nothing", fx: (S) => { const f = friendAcross(S) || (S.flags.includes("sibling_other_side_set") ? S.sibling : "ugra"); return { bond: { [f]: -1 } }; }, text: "The boy waits a long time before he understands, and goes." },
        { id: "burn", t: "Burn it unread", fx: { duty: { court: 1, conscience: -1 } }, text: "You put it in the lamp without opening it. You do not sleep." }
      ]
    },
    {
      id: "ep_carts", act: 6, age: 44, away: true, war: true, when: (S) => warring(S) && (S.path === "spy" || (S.skills.stealth || 0) >= 2), skipTo: "a6_wheel", next: "a6_wheel",
      art: art("scene_supply_camp_night"), place: "Behind the enemy lines, the night of the twelfth day", caption: "Grain carts under the watch-fires",
      title: "The supply carts",
      body: ["A captain wants someone to cut loose the enemy's fodder carts behind their lines tonight."],
      choices: [CARTS, { id: "no", t: "Say no", fx: { duty: { court: -1 } }, text: "Someone else goes. Someone else does not come back." }]
    },
    {
      id: "ep_carts_fight", act: 6, age: 44, away: true, war: true, art: art("fight_supply_carts"), place: "The enemy's supply camp", caption: "The camp wakes",
      title: "Out of the camp",
      body: ["Torches and shouting. They have seen you."],
      choices: [{ id: "fight", t: "Fight your way out", combat: "e_ep_carts" }],
      next: "a6_wheel"
    },
    {
      id: "ep_orders", act: 6, age: 44, away: true, war: true, when: (S) => warring(S) && S.flags.includes("role_command"), skipTo: "a6_day14", next: "a6_day14",
      art: art("scene_river_crossing"), place: "The river between the camps, the night of the thirteenth day", caption: "A packet, sealed with the wrong seal",
      title: "False orders",
      body: ["A captain gives you forged enemy orders to carry across the river. \"You have a face no one has seen.\""],
      choices: [
        Object.assign({}, RIVER, { fx: { flag: ["orders_delivered", "carried_false_orders"], duty: { court: 2, conscience: -2 }, journal: "On the night of the thirteenth day you carried false orders across the river, and in the morning the enemy's line was in the wrong place." } }),
        { id: "burn", t: "Burn it, and lie", fx: { flag: ["orders_burned", "refused_false_orders"], duty: { conscience: 2, court: -1 }, memory: ["all", "You would not carry a lie across the river, even in a war."] },
          text: "You burn it and tell the captain the river was watched. In the morning the line goes in honestly." }
      ]
    },
    {
      id: "ep_truce", act: 6, age: 44, away: true, war: true, when: (S) => warring(S) && !!(friendAcross(S) || (sibAlive(S) && S.flags.includes("sibling_other_side_set")) || ugraAcross(S)), skipTo: "a6_day16", next: "a6_day16",
      art: art("scene_truce_river"), place: "The river at dusk, after the fifteenth day", caption: "Soldiers of both sides at the water",
      title: "The truce at dusk",
      body: (S) => {
        const f = friendAcross(S), who = f ? K.PEOPLE[f].name : sibAlive(S) && S.flags.includes("sibling_other_side_set") ? sib(S) : "Ugra";
        return [S.flags.includes("council_truce") ? "The truce you argued for at the council holds for an hour at dusk: soldiers of both sides go down to the river for water and the dead, and nobody draws." : "At the evening truce by the river, nobody draws.",
          ["Across the water, filling a skin, is {who}.", { who }]];
      },
      choices: [
        { id: "cross", t: "Wade across and speak", fx: (S) => { const f = friendAcross(S) || (S.flags.includes("sibling_other_side_set") ? S.sibling : "ugra"); return { bond: { [f]: 2 }, flag: "truce_spoke", memory: [f, "You waded across the river at dusk to speak to me, in the middle of the war."] }; },
          text: "You talk about nothing: the water, the mosquitoes, a horse. When the horns sound you wade back without looking round." },
        { id: "raise", t: "Raise a hand, and no more", fx: (S) => { const f = friendAcross(S) || (S.flags.includes("sibling_other_side_set") ? S.sibling : "ugra"); return { bond: { [f]: 1 } }; }, text: "A hand raised, a hand raised back. It will have to do." },
        { id: "away", t: "Turn away before you are seen", fx: { duty: { conscience: -1 } }, text: "You fill your skin upstream and do not look back." }
      ]
    },
    {
      id: "ep_letter_2", act: 6, age: 44, away: true, war: true, when: (S) => S.flags.includes("replied_letter") && !!(friendAcross(S) || (sibAlive(S) && S.flags.includes("sibling_other_side_set")) || ugraAcross(S)), skipTo: "a6_day17", next: "a6_day17",
      art: art("scene_letter_camp"), place: "Your tent, the night before the seventeenth day", caption: "A second letter, shorter",
      title: "The second letter",
      body: (S) => {
        const f = friendAcross(S), who = f ? K.PEOPLE[f].name : sibAlive(S) && S.flags.includes("sibling_other_side_set") ? sib(S) : "Ugra";
        return [["A second letter from {who}.", { who }], { speaker: who, line: "Tomorrow is the day. Whatever happens, I was glad of you." }];
      },
      choices: [
        { id: "reply", t: "Write back the same", fx: (S) => { const f = friendAcross(S) || (S.flags.includes("sibling_other_side_set") ? S.sibling : "ugra"); return { bond: { [f]: 1 }, flag: "replied_twice" }; }, text: "Three words. The boy runs." },
        { id: "keep", t: "Keep it, and send nothing", fx: {}, text: "You fold it into the first one." }
      ]
    },
    {
      id: "ep_sibling_field", act: 6, age: 44, away: true, war: true, when: (S) => sibAlive(S) && S.flags.includes("sibling_other_side_set") && warring(S), skipTo: "a6_day18", next: "a6_day18",
      art: art("scene_sibling_field"), place: "Kurukshetra · the seventeenth day", caption: "A face you know, across a spear's length",
      title: "Across a spear's length",
      body: (S) => [["A chariot comes alongside yours. On it is {who}.", sibP(S)],
        S.flags.includes("sibling_promise") ? { memory: "You promised to look the other way. The amulet is on your wrist." } : S.flags.includes("sibling_quarrel") ? { memory: "The last thing between you was a quarrel, and a gate closing before dawn." } : null],
      choices: [
        { id: "spare", t: "Turn away", fx: (S) => ({ bond: { [S.sibling]: 2 }, duty: { court: -1, conscience: 1 }, flag: "spared_sibling", memory: [S.sibling, "On the seventeenth day you turned your chariot away from mine."] }),
          text: (S) => ["{who} lowers the spear a heartbeat after you do, and the press carries you apart.", sibP(S)] },
        { id: "strike", t: "Strike first", fx: (S) => ({ die: S.sibling, duty: { court: 1, conscience: -3, family: -3 }, flag: "killed_sibling", journal: "On the seventeenth day you struck first, and it was your own sibling." }),
          text: (S) => ["It is quick. {who} looks surprised, and then looks like nothing at all.", sibP(S)] },
        { id: "avoid", t: "Turn, and do not look", fx: (S) => ({ flag: "avoided_sibling" }), resolve: (S) => (K.rng() < 0.5 ? { die: S.sibling, journal: "You turned away from your sibling on the seventeenth day. Someone else did not." } : null),
          text: (S) => (S.dead.includes(S.sibling) ? ["You turn away. That evening they bring you {who}'s amulet.", sibP(S)] : ["You turn away, and the press closes between you. {who} lives through the day, and so do you.", sibP(S)]) }
      ]
    },
    {
      id: "ep_ugra_last", act: 6, age: 44, away: true, war: true, when: (S) => ugraAcross(S), skipTo: "a6_day18", next: "a6_day18",
      art: art("scene_ugra_field"), place: "Kurukshetra · the seventeenth day", caption: "The miller's son, with a captain's spear",
      title: "The miller's son, the last time",
      body: ["Ugra comes through the smoke with his spear up, and stops dead."],
      choices: [
        { id: "fight", t: "Fight him", combat: "e_ep_ugra" },
        { id: "mercy", t: "Tell him to go home", check: { attr: "command", skill: "statecraft", dc: 8,
          pass: { fx: { bond: { ugra: 2 }, flag: "sent_ugra_home", duty: { conscience: 1 } }, text: "Ugra turns his levies round and walks them off the field. He is the only captain who goes home that day with all his men." },
          fail: { fx: { bond: { ugra: 1 } }, text: "\"I have a hundred men behind me,\" he says, \"and they have fathers.\" He goes past you into the smoke, and you let him." } }, hint: "A test of command" }
      ]
    },
    // ---------- After the war ----------
    {
      id: "ep_rebuild", act: 7, age: 45, away: true, when: (S) => S.alive, skipTo: "a7_final", next: "a7_final",
      art: art("scene_rebuild"), place: "Hastinapura, the ruined quarter", caption: "A quarter of the city, roofless",
      title: "The ruined quarter",
      body: ["The quarter below the walls burned in the war, and the king has no men to rebuild it."],
      choices: [
        { id: "work", t: "Work on the roofs yourself", fx: { rep: { common: 2 }, duty: { family: -1 }, flag: "rebuilt_quarter", journal: "After the war you rebuilt the roofs of the burned quarter with your own hands." }, text: "By the rains the quarter has roofs. People call the lane you worked on by your name." },
        { id: "organise", t: "Organise the rebuilding", check: { attr: "command", skill: "statecraft", dc: 8,
          pass: { fx: { rep: { common: 1, pandava: 1 }, attr: { command: 1 }, flag: "rebuilt_quarter" }, text: "It takes a season of arguing and the quarter is rebuilt before the rains. Nobody thanks you, which is how you know it was done properly." },
          fail: { fx: { rep: { common: -1 } }, text: "The treasury has no timber, the carpenters have gone home to their own ruined villages, and the rains come first." } }, hint: "A test of command" },
        { id: "no", t: "Go home", fx: { duty: { family: 1 } } }
      ]
    },
    {
      id: "ep_rite", act: 7, age: 45, away: true, when: (S) => S.alive && S.dead.length > 0, skipTo: "a7_final", next: "a7_final",
      art: art("scene_river_rite"), place: "The river, below Hastinapura", caption: "Lamps on the water for the dead",
      title: "The rite for the dead",
      body: (S) => ["The city sends lamps down the river for the dead.",
        ["Yours: {list}.", { list: K.list(S.dead.filter((w) => K.PEOPLE[w]).map((w) => K.tr(K.PEOPLE[w].name))) }, true]],
      choices: [
        { id: "forgive", t: "A lamp for your dead and their killers", fx: { duty: { conscience: 2 }, attr: { wisdom: 1 }, rep: { sages: 1 }, flag: "forgave_at_river" }, text: "Two lamps. The second is harder to let go of than the first." },
        { id: "own", t: "Lamps for your own only", fx: { duty: { family: 2 } }, text: "You send them out one by one, saying each name. The river takes them." },
        { id: "none", t: "Stay on the bank", fx: { duty: { conscience: -1 } }, text: "You watch the lamps go. Someone else lights one for yours." }
      ]
    },
    {
      id: "ep_student", act: 7, age: 45, away: true, when: (S) => S.alive && !!S.path, skipTo: "a7_final", next: "a7_final",
      art: art("scene_own_student"), place: (S) => K.homePlace(S), caption: "A child with a stick, waiting at your door",
      title: "A student of your own",
      body: ["A child from the lane waits at your door every morning with a stick for a spear."],
      choices: (S) => [studentTest(S), { id: "no", t: "Send the child away", fx: { duty: { conscience: -1 } }, text: "You close the door on the child. The next morning the stick is leaning against it, and the child is gone." }]
    },
    {
      id: "ep_pilgrimage", act: 7, age: 45, away: true, when: (S) => S.alive, skipTo: "a7_final", next: "a7_final",
      art: art("scene_pilgrimage"), place: "The road to the forest", caption: "Three old people on the road, and you",
      title: "The pilgrimage",
      body: ["The old king, the queen and Kunti walk to the holy places, and ask you to come."],
      choices: [
        { id: "walk", t: "Walk the whole way", fx: { attr: { wisdom: 1 }, rep: { sages: 1 }, flag: "walked_with_elders", journal: "After the war you walked the holy places with Dhritarashtra, Gandhari and Kunti." },
          text: "Gandhari asks you nothing at all. On the last night Kunti asks whether you ever met Karna, and holds your hand until the fire goes out." },
        { id: "part", t: "Walk one day", fx: { duty: { family: 1 } }, text: "At the first shrine you turn back. Kunti raises a hand." },
        { id: "no", t: "Let them go without you", fx: {} }
      ]
    },
    {
      id: "ep_keepsakes", act: 7, age: 45, away: true, when: (S) => S.alive && (hasKeep(S, "letter") || hasKeep(S, "amulet") || hasKeep(S, "arrow") || S.flags.includes("sat_with_kesava")), skipTo: "a7_final", next: "a7_final",
      enter: (S) => (S.flags.includes("sat_with_kesava") && !hasKeep(S, "hammer") ? { keepsake: "hammer" } : null),
      art: "scene_note", place: (S) => K.homePlace(S), caption: "A few small things on a cloth",
      title: "What you kept",
      body: (S) => ["You kept a few small things through all of it.", ["On the cloth: {list}.", { list: K.list((S.keepsakes || []).map((k) => K.tr(K.KEEPSAKES[k].name))) }, true]],
      choices: (S) => [
        hasKeep(S, "letter") ? { id: "letter", t: "Read the letter from across the lines one last time, and put it in the fire", fx: { duty: { conscience: 1 }, flag: "burned_letter_after" }, text: "The fire takes the paper. You know it by heart." } : null,
        hasKeep(S, "amulet") && S.sibling && S.dead.includes(S.sibling) ? { id: "amulet_pyre", t: "Take the amulet to the river and send it after your sibling", fx: { duty: { family: 2 }, flag: "amulet_to_river" }, text: "The copper disc sinks at once. You stand there until your feet are numb." } : null,
        hasKeep(S, "amulet") && S.sibling && !S.dead.includes(S.sibling) ? { id: "amulet_back", t: "Give the amulet back, and say what it meant", fx: (S2) => ({ bond: { [S2.sibling]: 2 }, flag: "amulet_returned" }), text: (S2) => ["{who} ties it back on and says nothing, and you sit together until the fire is out.", sibP(S2)] } : null,
        hasKeep(S, "hammer") ? { id: "hammer", t: "Hang Kesava's hammer over your own door", fx: { duty: { family: 1 }, bond: { charu: 1 }, flag: "hung_hammer" }, text: "It hangs there for the rest of your life, and your children's." } : null,
        hasKeep(S, "arrow") ? { id: "arrow", t: "Break the arrow from the supply camp and bury the pieces", fx: { duty: { conscience: 1 } }, text: "It was never a trophy. You bury it where nobody will dig." } : null,
        { id: "keep", t: "Wrap them up", fx: {} }
      ].filter(Boolean)
    },
    {
      id: "ep_bard", act: 7, age: 45, away: true, when: (S) => S.alive, skipTo: "a7_final", next: "a7_final",
      art: art("scene_bard"), place: "A courtyard in Hastinapura", caption: "A bard sings the war, and gets it wrong",
      title: "What the bards sing",
      body: (S) => ["A bard sings the war with your name in it, and gets it wrong.",
        { speaker: "The bard", line: bardWrong(S) }],
      choices: [
        { id: "correct", t: "Correct him", check: { attr: "wisdom", skill: "lore", dc: 7,
          pass: { fx: { flag: "corrected_bard", skill: { lore: 1 } }, text: "You tell him what happened. He listens, nods, and sings it again, right this time, and the right version is the one that travels." },
          fail: { fx: { flag: "bard_wrong" }, text: "You tell him what happened. He thanks you kindly and sings it the old way the next night, because it rhymes better." } }, hint: "Lore helps" },
        { id: "stand", t: "Let it stand", fx: { flag: "bard_wrong", attr: { wisdom: 1 } }, text: "You put a coin in his bowl and walk on. The wrong version travels, and in a hundred years it will be the only one." }
      ]
    }
  ]);

  // The bard's wrong line: one thing the life did, turned the other way round.
  function bardWrong(S) {
    const has = (f) => S.flags.includes(f);
    if (has("helped_ekalavya")) return "...and when the forest boy cut off his thumb, {name} laughed with the princes...";
    if (has("refused_dakshina")) return "...and {name} rode first against Panchala, for Drona's fee...";
    if (has("objected_dice") || has("stood_between")) return "...and in the dice hall {name} was silent, like all the rest...";
    if (has("refused_ring") || has("refused_bow_order")) return "...and on the thirteenth day {name} was among those who closed on the boy in the wheel...";
    if (has("spared_sibling")) return "...and on the seventeenth day {name} struck down {their} own kin without a word...";
    if (S.vows.some((v) => !v.broken)) return "...and every vow {name} swore, {they} broke before the end...";
    return "...and {name} fled the field on the first day, and was not seen again...";
  }
  K.BARD_WRONG = bardWrong;

  // ---------- Encounters ----------
  K.encounter({
    id: "e_ep_bhishma", title: "In front of Shikhandi", art: "war_bhishma", caption: "The grandsire's arrows", lethal: true, curse: true, rounds: 3, roundsText: "Shikhandi's chariot draws level with the grandsire's, and Bhishma lowers his bow.",
    allies: (S) => K.warAllies(S), spare: false, flee: { tags: ["retreat"] }, callHelp: K.warHelp,
    intro: "Bhishma will not loose at Shikhandi. The men around him have no such scruple, and every one of them is looking at you.",
    // Bhishma himself does not loose at Shikhandi's chariot: only his guard is fought.
    enemies: [K.foe("Kaurava chariot-guard", 4, { abilities: ["strike", "arrows"] }), K.foe("Bhishma's archers", 3, { plural: true, abilities: ["arrows"] })],
    beats: [{ round: 2, text: "The grandsire's arrows come like rain, and none of them is aimed at you. His guard's are.", run: (B) => B.living("friends").forEach((u) => B.status(u, "exposed", 1)) }],
    win: { fx: { rep: { pandava: 2 }, bond: { arjuna: 1 }, flag: "held_for_shikhandi", journal: "On the tenth day you rode in front of Shikhandi, and took the arrows meant for him until the grandsire lowered his bow." }, text: "Shikhandi's chariot draws level with Bhishma's. The old man looks at Shikhandi, and lowers his bow, and Arjuna's arrows begin." },
    lose: { deathText: "{They} rode in front of Shikhandi on the tenth day, and the grandsire's guard did what the grandsire would not." }
  });
  K.encounter({
    id: "e_ep_carts", title: "Out of the supply camp", art: "fight_war_camp", caption: "Torches in the horse lines", lethal: false,
    enemies: [K.foe("Camp sentry", 3), K.foe("Half-dressed spearman", 3)], flee: { tags: ["retreat"], fx: { flag: "carts_fled" }, text: "You go over the horse lines and into the dark." }, spare: true,
    win: { fx: { flag: "carts_fought_out", keepsake: "arrow" }, text: "You are out and running before the rest of the camp finds its boots." },
    lose: { fx: { flag: "carts_taken" }, text: "They take you, and trade you back at the next truce, with your hands tied in front of you and nothing to show for the night." },
    spare: { fx: { duty: { conscience: 1 } }, text: "You leave the last of them in the mud and go over the horse lines." }
  });
  K.encounter({
    // Fought on a clean battle ground (owner, 9 Nov: not the still of Karna's wheel in the mud).
    id: "e_ep_ugra", title: "Ugra, the last time", art: "fight_war_chariot", caption: "A captain of levies, and his hundred", lethal: true, curse: true,
    allies: (S) => K.warAllies(S), spare: true, flee: { tags: ["retreat"] },
    enemies: [K.foe("Ugra, the miller's son", 6, { abilities: ["strike", "heavy"], person: "ugra", hp: 90, atk: 11 }), K.foe("Ugra's levies", 3, { plural: true, abilities: ["strike", "arrows"] })],
    intro: "Ugra comes on the way he did at the fair, head down, and his levies behind him.",
    win: { fx: { die: "ugra", duty: { conscience: -1 }, journal: "On the seventeenth day you fought Ugra, the miller's son, and he did not get up." }, text: "He goes down the way he never did at the fair, and this time he does not laugh, and does not get up." },
    spare: { fx: { bond: { ugra: 3 }, flag: "spared_ugra", duty: { conscience: 1 }, journal: "On the seventeenth day you had Ugra, the miller's son, at your mercy, and let him go." }, text: "\"Go home to your mill,\" you say. He looks at you a long time, and goes." },
    lose: { deathText: "{They} fell on the seventeenth day to Ugra, the miller's son, whom {they} first fought at a spring fair." }
  });

  Object.assign(K.COMMAND_FIGHT_BG = K.COMMAND_FIGHT_BG || {}, { e_ep_ugra: "fight_war_chariot" }); // its ground, and the tall one on a phone (ui/battle.js FIGHT_BG)

  // ---------- The captain's arc: Bhadra, an old soldier (owner, 11 November: "a more interesting captain arc") ----------
  // Three scenes, all optional and side-free. Act III: Bhadra, captain of the gate guard, takes your measure in a bout. Late
  // Act III: his company is caught on the border road and he falls; you hold the road over him, lead his men up the bank,
  // or carry him out. Act V, the thirteenth year: dying, he gives you his helmet, dented above the left eye, the helmet of
  // the dream at six. Worn, it makes you a Captain (core.js K.tierNow), and on the thirteenth day of the war you remember
  // the dream. No new paintings: the training ground, the border village, the sickbed lamp (each in both parts).
  const bhadraMark = (S) => ["bhadra_held", "bhadra_led", "bhadra_carried"].some((f) => S.flags.includes(f));
  K.scenes([
    {
      id: "ep_bhadra_bout", act: 3, age: 26, away: true, when: (S) => !!S.path && !S.fighter && !S.flags.includes("bhadra_met"), skipTo: "a3_court", next: "a3_court",
      art: "stage_training_ground", place: "The gate guard's yard", caption: "Bhadra, captain of the gate guard",
      title: "The old soldier",
      body: ["Bhadra, captain of the gate guard, has watched you train all season. \"Show me,\" he says, and takes up a shield."],
      choices: [
        { id: "spar", t: "Spar with him", combat: "e_bhadra", hint: "A bout, not to the death" },
        { id: "decline", t: "Not today", fx: { flag: "bhadra_met" }, text: "\"Another day, then.\" He goes back to his gate, and you feel him watching you train." }
      ]
    },
    {
      id: "ep_bhadra_road", act: 3, age: 28, away: true, when: (S) => S.flags.includes("bhadra_met") && !S.fighter, skipTo: "a3_rajasuya", next: "a3_rajasuya",
      art: "stage_border_village", place: "The border road", caption: "Bhadra's company",
      title: "His men",
      body: ["You ride out with Bhadra's company to clear raiders off the border road. In a cutting they come down both banks, and an arrow takes Bhadra in the thigh."],
      choices: [
        { id: "hold", t: "Stand over him and hold the road", combat: "e_bhadra_road" },
        { id: "lead", t: "Take his men up the bank", check: { attr: "command", skill: "statecraft", dc: 7,
          pass: { fx: { flag: "bhadra_led", bond: { bhadra: 2 }, attr: { command: 1 }, journal: "On the border road you took Bhadra's men up the bank when he fell, and they followed you." }, text: "They wait one breath, then follow you up the bank. The raiders scatter. Bhadra, white-faced, says only, \"Good.\"" },
          fail: { fx: { bond: { bhadra: 1 } }, text: "They look at Bhadra, not at you. By the time he shouts the order himself, the raiders are gone." } }, hint: "A test of command" },
        { id: "carry", t: "Carry him out of the cutting", fx: { flag: "bhadra_carried", bond: { bhadra: 3 }, journal: "On the border road you carried Bhadra out under the raiders' arrows." },
          text: "You get him across your shoulders and out under the arrows. He does not forget who carried him." }
      ]
    },
    {
      id: "ep_bhadra_helmet", act: 5, age: 42, away: true, when: (S) => S.alive && !S.fighter && bhadraMark(S) && !S.dead.includes("bhadra"), skipTo: "a5_matsya", next: "a5_matsya",
      art: "ev_teacher", place: "Bhadra's house", caption: "A lamp by a sickbed",
      title: "The helmet",
      body: ["Bhadra is dying, and has sent for you. He has kept one thing back: his helmet, dented above the left eye.",
        { memory: "You have seen that dent before: at six, in a dream, on a warrior who came at you through the dust." }],
      choices: [
        { id: "wear", t: "Put it on", fx: { flag: "bhadra_helmet", die: "bhadra", journal: "Bhadra gave you his dented helmet, and died the same night." },
          text: "It fits. Bhadra laughs, which costs him. \"Men will look to it now. Let them.\" He dies before morning." },
        { id: "keep", t: "Thank him, and wrap it in cloth", fx: { flag: "bhadra_helmet_kept", die: "bhadra", journal: "Bhadra left you his dented helmet. You have never worn it." },
          text: "You do not put it on. Some dreams you would rather not walk into. He dies before morning, and does not ask why." }
      ]
    }
  ]);
  K.encounter({
    id: "e_bhadra", title: "The old soldier", art: "stage_training_ground", caption: "Blunted spears, a captain's shield", lethal: false, bout: true, realtime: true, mix: false,
    intro: "Bhadra sets his shield and waits for you to come to him.",
    enemies: [K.foe("Bhadra, an old soldier", 4, { person: "bhadra", shield: true, abilities: ["strike", "guard", "heavy"] })],
    win: { fx: { flag: ["bhadra_met", "bhadra_bout_won"], bond: { bhadra: 2 }, journal: "You beat Bhadra, captain of the gate guard, in a bout." }, text: "He gets up slowly. \"Good. Come back when you've seen blood.\"" },
    lose: { fx: { flag: "bhadra_met", bond: { bhadra: 1 } }, text: "He helps you up. \"Not bad. Come back when you've seen blood.\"" }
  });
  K.encounter({
    id: "e_bhadra_road", title: "His men", art: "stage_border_village", caption: "Raiders on both banks", lethal: false, realtime: true,
    intro: "Bhadra is down behind you, and the raiders know it.",
    enemies: [K.foe("Border raider", 2), K.foe("Border raider", 1), K.foe("Raiders' archer", 1, { abilities: ["strike", "arrows"] })], // lighter on the turns (owner, 11 Nov); real time tuned back up (RT.TUNE)
    win: { fx: { flag: "bhadra_held", bond: { bhadra: 2 }, journal: "On the border road you stood over Bhadra and held it." }, text: "The raiders break on you and go back up the banks. Bhadra, white-faced, says only, \"Good.\"" },
    lose: { fx: { bond: { bhadra: 1 } }, text: "Bhadra's men drag you both out of the cutting. He says nothing about it, then or after." }
  });
  Object.assign(K.COMMAND_FIGHT_BG, { e_bhadra: "stage_training_ground", e_bhadra_road: "fight_border_road" });
  // The thirteenth day, the day of the dream: one who wears Bhadra's helmet remembers it.
  { const d13 = K.SCENES.a6_day13, b0 = d13.body;
    d13.body = (S) => { const b = [].concat(K.val(b0, S) || []); if (S.flags.includes("bhadra_helmet")) b.unshift({ memory: "You fasten Bhadra's dented helmet. Somewhere, you think, a child of six is dreaming of you." }); return b; }; }

  // ---------- Where the scenes come ----------
  const before = (id, list) => { K.BEFORE[id] = (K.BEFORE[id] || []).concat(list); };
  before("a1_first", ["ep_sibling"]);
  before("a2_tournament", ["ep_ugra_tournament"]);
  before("a3_court", ["ep_bhadra_bout"]);
  before("a3_rajasuya", ["ep_bhadra_road", "ep_mentor_vidura"]); // (Bhadra's road, at 28, before Vidura's ask at 29)
  before("a5_matsya", ["ep_bhadra_helmet"]);
  before("a4_hall", ["ep_mentor_kripa"]);
  before("a5_yaksha", ["ep_storm"]);
  before("a5_yaksha_again", ["ep_lake_charu"]);
  before("a5_herd", ["ep_false_name", "ep_kichaka"]);
  before("a5_karna_secret", ["ep_secret_tell"]);
  before("a5_side", ["ep_mentor_peace", "ep_ugra_rise"]);
  before("a6_bhishma", ["ep_shikhandi"]);
  before("a6_capture", ["ep_letter_1"]);
  before("a6_wheel", ["ep_carts"]); // the night of the twelfth day, before the wheel
  before("a6_day14", ["ep_orders"]);
  before("a6_day16", ["ep_truce"]);
  before("a6_day17", ["ep_letter_2"]);
  before("a6_day18", ["ep_sibling_field", "ep_ugra_last"]);
  before("a7_final", ["ep_rebuild", "ep_rite", "ep_student", "ep_pilgrimage", "ep_keepsakes", "ep_bard"]);

  // The sibling on the other side is one line on the eve of the war, not a scene of its own (owner, 2 Nov).
  { const eve = K.SCENES.a6_eve, body0 = eve.body;
    eve.body = (S) => { const b = [].concat(K.val(body0, S) || []); if (sibAlive(S) && warring(S)) b.push(["{who} fights for the other side.", sibP(S)]); return b; }; }
  // The sibling's side is drawn when yours is: the other one, unless you talked them round.
  K.on("scene", (sc) => {
    const S = K.S;
    if (K.PUPPETS && !K.PUPPETS.dev) Object.assign(K.PUPPETS, PUPPETS);
    if (sc.id === "a6_eve" && S.sibling && !S.flags.includes("sibling_other_side_set") && !S.flags.includes("sibling_same_side") && warring(S)) S.flags.push("sibling_other_side_set");
  });

  // ---------- What the telling says ----------
  (K.TELL_HOOKS = K.TELL_HOOKS || []).push((S, t, has) => {
    if (has("ugra_tournament_won")) t.push("At seventeen {they} put the miller's son in the dust before the princes' tournament.");
    if (has("sent_ugra_home")) t.push("On the seventeenth day {they} sent Ugra, the miller's son, home to his mill with all his men.");
    if (has("spared_ugra")) t.push("On the seventeenth day {they} had Ugra at {their} mercy, and let him go.");
    if (S.dead.includes("ugra") && S.seen.includes("ep_ugra_last")) t.push("On the seventeenth day {they} killed Ugra, the miller's son, whom {they} first fought at a fair.");
    if (has("told_duryodhana_secret")) t.push("{They} told Duryodhana whose son Karna was, before Karna knew it himself.");
    if (has("told_kunti_secret")) t.push("{They} went to Kunti before the war and told her {they} knew.");
    if (has("spied_on_friend")) t.push("{They} carried a friend's words to Vidura, and the friend never knew.");
    if (has("refused_vidura")) t.push("When Vidura asked {them} to spy on a friend, {they} refused him to his face.");
    if (has("swore_for_throne")) t.push("Before the dice {they} swore to Kripa that the throne was in the right, and watched what the throne did.");
    if (has("refused_kripa")) t.push("{They} told Kripa that a throne can be wrong.");
    if (has("promised_peace") && warring(S)) t.push("{They} promised {their} teacher not to fight in the war, and fought in it.");
    if (has("promised_peace") && S.side === "neutral") t.push("{They} promised {their} teacher not to fight in the war, and kept the promise in the healers' tents.");
    if (S.sibling) {
      if (has("killed_sibling")) t.push(["On the seventeenth day {they} struck down {who}, {their} own {kin}, and did not remember the rest of the day.", { who: sib(S), kin: S.sibling === "dev" ? "brother" : "sister" }]);
      else if (has("spared_sibling")) t.push(["On the seventeenth day {they} turned {their} chariot away from {who}, {their} own {kin}.", { who: sib(S), kin: S.sibling === "dev" ? "brother" : "sister" }]);
      else if (S.dead.includes(S.sibling)) t.push(["{who}, {their} {kin}, fell on the other side of the field.", { who: sib(S), kin: S.sibling === "dev" ? "brother" : "sister" }]);
      else if (has("sibling_same_side")) t.push(["{They} talked {who}, {their} {kin}, round to {their} own side in one night.", { who: sib(S), kin: S.sibling === "dev" ? "brother" : "sister" }]);
    }
    if (has("ran_the_storm")) t.push("In the forest storm {they} ran the camp's children to the rock shelter.");
    if (has("answered_for_charu")) t.push("At the lake in the forest {they} answered the voice for Charu, who had drunk first.");
    if (has("kept_false_name")) t.push("In the hidden year {they} kept {their} false name under the steward's questions.");
    if (has("helped_draupadi_hall")) t.push("The night Bhima waited in the dancing hall, {they} saw to it that Draupadi was somewhere else, and seen.");
    if (has("held_for_shikhandi")) t.push("On the tenth day {they} rode in front of Shikhandi and took the arrows meant for him.");
    if (has("burned_carts")) t.push("One night in the war {they} crept into the enemy's camp and burned their fodder.");
    if (has("carried_false_orders")) t.push("{They} carried false orders across the river between the camps.");
    if (has("refused_false_orders")) t.push("{They} would not carry a lie across the river, even in a war.");
    if (has("truce_spoke")) t.push("At the truce at dusk {they} waded the river to speak to someone on the other side.");
    if (has("rebuilt_quarter")) t.push("After the war {they} rebuilt the roofs of the burned quarter.");
    if (has("forgave_at_river")) t.push("At the river {they} sent a lamp for {their} dead, and one for whoever killed them.");
    if (has("taught_student")) t.push("{They} took a student of {their} own, and set the first test {they} {were} ever set.");
    if (has("walked_with_elders")) t.push("{They} walked the holy places with the old king and queen and Kunti.");
    if (has("corrected_bard")) t.push("When a bard sang it wrong, {they} corrected him, and the right version is the one that travelled.");
  });
  // The bard's version, when it was let stand, is the one the Book of Lives keeps.
  K.TELL_WRONG = (S) => (S.flags.includes("bard_wrong") ? bardWrong(S).replace(/^\.\.\.and /, "They say that ").replace(/\.\.\.$/, ".") : null);
})(window.K = window.K || {});
