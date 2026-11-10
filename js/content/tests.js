/* One action test per act, after Act I (whose friendship tests live in act1.js).
   Each test is a scene of its own with one variant per situation (your teacher, your side in the
   war), and a second-chance scene behind it. Fail the first try and the second-chance scene opens;
   fail that too and it counts twice in your record, leaves a mark on the skill (K.MERITS) and costs
   standing with whoever watched. The games themselves are in ui/trials.js and ui/games.js. */
(function (K) {
  "use strict";

  // A branch with one more flag added to its effects.
  const addFlag = (br, f) => { const fx = Object.assign({}, br && br.fx); fx.flag = [].concat(fx.flag || [], f); return Object.assign({}, br, { fx }); };
  const againFlag = (id, k) => id + "_" + k + "_again";

  // A test as a choice, and as its second chance. Used by K.trialScenes and by scenes that hold a
  // test among other choices (the tunnel at Varnavata).
  K.testChoice = (id, k, v) => ({ id: k, t: v.t, img: v.img, req: v.req, locked: v.locked || "", game: v.game, hint: v.hint, trial: v.trial, win: v.win,
    close: addFlag(v.close || v.lose, againFlag(id, k)), lose: addFlag(v.lose, againFlag(id, k)) });
  // The second chance carries the way back: fail it, and the earlier question opens again with this
  // option crossed out (v.back, or the test's own d.back; see K.loopBack).
  K.retryChoice = (id, k, v, back) => ({ id: k, t: v.retryT || v.t, img: v.img, req: { flag: againFlag(id, k) }, locked: "", game: v.game, hint: "Your second chance", peril: v.peril,
    trial: Object.assign({}, v.trial, { stakes: v.retryStakes }), win: v.win, close: v.retryLose, lose: v.retryLose,
    back: v.back || back ? Object.assign({ clear: id }, back, v.back, { why: (v.back && v.back.why) || v.crossWhy }) : undefined });
  K.retryWhen = (id, keys) => (S) => keys.some((k) => S.flags.includes(againFlag(id, k)));

  // d: { id, scene: {...}, tests: { key: variant }, next, retry: { id, scene: {...}, letGo, letText } }
  K.trialScenes = function (d) {
    const keys = Object.keys(d.tests);
    const main = Object.assign({}, d.scene, { id: d.id, choices: keys.map((k) => K.testChoice(d.id, k, d.tests[k])), next: d.retry ? d.retry.id : d.next });
    if (!d.retry) return [main];
    const r = d.retry;
    // A second chance is offered where the first attempt happened: the painting of the test being retried.
    const retryArt = (S) => { const k = keys.find((x) => S.flags.includes(againFlag(d.id, x))); const st = k && d.tests[k].trial && K.val(d.tests[k].trial.stage, S); return st || K.val(r.scene.art, S); };
    const again = Object.assign({}, r.scene, { id: r.id, art: retryArt, when: K.retryWhen(d.id, keys), skipTo: d.next,
      choices: keys.map((k) => K.retryChoice(d.id, k, d.tests[k], d.back)).concat([{ id: "let", t: r.letGo || "Let it go", fx: {}, text: r.letText || null }]), next: d.next });
    return [main, again];
  };

  // What these tests leave behind: a point on later tests of the same skill, or a point against.
  K.MERITS.push(
    { flag: "drona_bird", on: ["aim", "archery"], n: 1, text: "You saw only the bird's eye, and hit it." },
    { flag: "missed_bird_twice", on: ["archery"], n: -1, text: "You missed Drona's bird twice, and he stopped watching you shoot." },
    { flag: "kripa_drill", on: ["grace", "mace"], n: 1, text: "You turned every one of Kripa's cuts." },
    { flag: "kripa_twice", on: ["mace"], n: -1, text: "Kripa's wooden sword found your ribs two mornings running." },
    { flag: "balarama_drill", on: ["might", "mace"], n: 1, text: "You struck clean through Balarama's guard." },
    { flag: "balarama_twice", on: ["mace"], n: -1, text: "Balarama knocked the mace from your hands twice." },
    { flag: "mauni_bell", on: ["aim", "archery"], n: 1, text: "You hit Mauni's bell half-blind." },
    { flag: "mauni_twice", on: ["archery"], n: -1, text: "You missed Mauni's bell twice, and he went back to silence." },
    { flag: "vidura_eye", on: ["wisdom", "statecraft"], n: 1, text: "You remembered everything on Vidura's table." },
    { flag: "vidura_twice", on: ["statecraft"], n: -1, text: "Twice you could not say what was on Vidura's table." },
    { flag: "leaf_night", on: ["aim", "archery"], n: 1, text: "You split a leaf on a thread, alone, at night." },
    { flag: "leaf_twice", on: ["archery"], n: -1, text: "Two nights the leaf beat you, and you began to believe it." },
    { flag: "drew_war_bow", on: ["might", "archery"], n: 1, text: "You drew your teacher's old war bow to the ear." },
    { flag: "war_bow_twice", on: ["archery"], n: -1, text: "Your teacher's war bow beat you twice." },
    { flag: "broke_post", on: ["might", "mace"], n: 1, text: "You split the practice post in three blows." },
    { flag: "post_twice", on: ["mace"], n: -1, text: "The practice post stood up to you twice." },
    { flag: "raced_karna", on: ["grace", "chariot"], n: 1, text: "You beat Karna round the training ground." },
    { flag: "race_twice", on: ["chariot"], n: -1, text: "Karna beat you round the training ground twice." },
    { flag: "beat_shakuni_board", on: ["wisdom", "statecraft"], n: 1, text: "You beat Shakuni at chaupar when you were sixteen." },
    { flag: "board_twice", on: ["statecraft"], n: -1, text: "Shakuni beat you at chaupar twice, smiling." },
    { flag: "set_the_arm", on: ["wisdom", "healing"], n: 1, text: "You set a broken arm so well it healed straight." },
    { flag: "arm_twice", on: ["healing"], n: -1, text: "Twice the bone slipped under your hands." },
    { flag: "crossed_palace", on: ["grace", "stealth"], n: 1, text: "You crossed the palace at night, twice, unseen." },
    { flag: "palace_twice", on: ["stealth"], n: -1, text: "The night guard caught you in the palace twice." },
    { flag: "verse_perfect", on: ["wisdom", "lore"], n: 1, text: "You said back every line of the old verses, in order." },
    { flag: "verse_twice", on: ["lore"], n: -1, text: "Twice the old verses came out of you in the wrong order." },
    { flag: "strung_great_bow", on: ["might", "archery"], n: 1, text: "You strung the great bow of Panchala." },
    { flag: "bow_twice", on: ["archery"], n: -1, text: "The great bow of Panchala beat you twice, in front of the kings' men." },
    { flag: "tunnel_twice", on: ["stealth"], n: -1, text: "Two nights running, the guards nearly had you at Varnavata." },
    { flag: "spring_deer", on: ["aim", "archery"], n: 1, text: "You brought down the spring deer with one arrow." },
    { flag: "hunt_twice", on: ["archery"], n: -1, text: "The spring deer got away from you twice." },
    { flag: "beat_duryodhana_bagh", on: ["wisdom", "statecraft"], n: 1, text: "You took Duryodhana's goats with his own tigers." },
    { flag: "bagh_twice", on: ["statecraft"], n: -1, text: "Duryodhana's goats hemmed you in twice." },
    { flag: "led_out_of_khandava", on: ["command", "stealth"], n: 1, text: "You led families out of the burning Khandava forest." },
    { flag: "khandava_twice", on: ["command"], n: -1, text: "Twice the fire in the Khandava forest broke your line." },
    { flag: "answered_council", on: ["wisdom", "statecraft"], n: 1, text: "You answered Drupada's council in riddles." },
    { flag: "council_twice", on: ["statecraft"], n: -1, text: "Drupada's council laughed at your answers twice." },
    { flag: "brought_boat_in", on: ["grace", "chariot"], n: 1, text: "You brought a boat in through a storm off Dwaraka." },
    { flag: "boat_twice", on: ["chariot"], n: -1, text: "The storm off Dwaraka beat you twice." },
    { flag: "kept_the_beat", on: ["might", "chariot"], n: 1, text: "You kept the beat for Karna's elephants." },
    { flag: "elephants_twice", on: ["chariot"], n: -1, text: "Karna's elephants broke step on you twice." },
    { flag: "found_the_heart", on: ["wisdom", "stealth"], n: 1, text: "You found the clearing at the heart of the old forest." },
    { flag: "maze_twice", on: ["stealth"], n: -1, text: "The old forest turned you round twice." },
    { flag: "message_carried", on: ["grace", "stealth"], n: 1, text: "You carried Vidura's message past Duryodhana's watchmen." },
    { flag: "message_twice", on: ["stealth"], n: -1, text: "Twice Duryodhana's watchmen turned you back from Kunti's door." },
    { flag: "household_out", on: ["grace", "stealth"], n: 1, text: "You got a steward's family out past Duryodhana's patrols." },
    { flag: "household_twice", on: ["stealth"], n: -1, text: "Duryodhana's patrols turned you back twice in the night streets." },
    { flag: "hands_twice", on: ["wisdom"], n: -1, text: "Twice you stared at Shakuni's hands and saw nothing, and the court saw you staring." },
    { flag: "answered_yaksha", on: ["wisdom", "lore"], n: 1, text: "You answered the voice at the lake." },
    { flag: "yaksha_twice", on: ["lore"], n: -1, text: "The voice at the lake asked you twice, and you drank." },
    { flag: "beat_vikarna", on: ["wisdom", "lore"], n: 1, text: "You reached moksha first, on Vikarna's board." },
    { flag: "moksha_twice", on: ["lore"], n: -1, text: "The snakes on Vikarna's board took you down twice." },
    { flag: "forged_with_charu", on: ["might", "mace"], n: 1, text: "You forged a blade with Charu, beat for beat." },
    { flag: "forge_twice", on: ["mace"], n: -1, text: "Twice you broke the rhythm at Charu's anvil." },
    { flag: "turned_herd", on: ["grace", "chariot"], n: 1, text: "You turned Virata's herd at the ford." },
    { flag: "herd_twice", on: ["chariot"], n: -1, text: "Virata's herd ran past you twice." },
    { flag: "escaped_prison", on: ["grace", "stealth"], n: 1, text: "You escaped Duryodhana's prison yard." },
    { flag: "prison_twice", on: ["stealth"], n: -1, text: "Duryodhana's guards dragged you back twice." },
    { flag: "held_the_gate", on: ["might", "command"], n: 1, text: "You held the village gate against the raiders." },
    { flag: "gate_twice", on: ["command"], n: -1, text: "The raiders broke through your gate twice." },
    { flag: "saved_the_crew", on: ["grace", "healing"], n: 1, text: "You held the line while a sinking crew climbed across." },
    { flag: "crew_twice", on: ["grace"], n: -1, text: "Twice the line slipped through your hands in the storm." },
    { flag: "roped_elephant", on: ["aim", "chariot"], n: 1, text: "You roped the lead elephant in the Champa stampede." },
    { flag: "stampede_twice", on: ["chariot"], n: -1, text: "The Champa stampede got past you twice." },
    { flag: "killed_maneater", on: ["aim", "archery"], n: 1, text: "You killed the man-eater at the edge of the Kamyaka forest." },
    { flag: "maneater_twice", on: ["archery"], n: -1, text: "The man-eater of Kamyaka got away from you twice." },
    { flag: "held_wheel", on: ["might", "command"], n: 1, text: "On the thirteenth day you did what the wheel asked of you." },
    { flag: "wheel_twice", on: ["command"], n: -1, text: "On the thirteenth day you failed your company twice." },
    { flag: "night_run", on: ["grace", "chariot"], n: 1, text: "You drove through the night battle and back." },
    { flag: "night_twice", on: ["chariot"], n: -1, text: "Twice the night battle turned you back." },
    { flag: "bhishma_answered", on: ["wisdom", "lore"], n: 1, text: "You answered Bhishma's questions on the bed of arrows." },
    { flag: "bhishma_twice", on: ["lore"], n: -1, text: "Twice Bhishma asked, and twice you had no answer." }
  );

  // Who stands with you at your teacher's tests: their shadow puppet.
  const TEACHER_PUPPET = { drona: "drona", kripa: "kripa", balarama: "balarama", hermit: "mauni", vidura: "vidura" };
  const teacherCast = (S) => (TEACHER_PUPPET[S.teacher] ? [TEACHER_PUPPET[S.teacher]] : []);
  // Where you live now, as a point on the map: the court you joined, or where you grew up.
  K.homeKey = (S) => K.locOf(K.homePlace(S), S) || (S.flags.includes("moved_capital") ? "hastinapura" : K.HOME_COURT[S.origin] || "hastinapura");

  // ---------- Act II: your teacher's test ----------
  const TEACHER = {
    drona: { t: "Take your place under the tree", img: "teacher_drona", req: { teacher: "drona" }, game: "aim", hint: "An archery test",
      trial: { attr: "aim", skill: "archery", icon: "bird", small: true, verb: "Release", stage: "stage_training_ground", cast: ["drona", "arjuna"],
        rules: "Hit the wooden bird's eye. Two arrows of three.",
        stakes: ["Drona counts you among his best.", "Drona says nothing, which is worse. You may shoot again at dawn."] },
      retryStakes: ["Drona counts you among his best.", "Drona stops watching you shoot, and you must find another teacher. It counts as two failures, and it will weigh on every archery test to come."],
      crossWhy: "Drona would not watch you shoot again.",
      win: { fx: { skill: { archery: 1 }, duty: { teacher: 1 }, bond: { drona: 1 }, flag: "drona_bird", journal: "You hit the eye of Drona's wooden bird." }, text: "Drona nods once. \"You saw the eye,\" he says." },
      lose: { fx: {}, text: "Your arrows rattle through the leaves. Drona moves on to the next student without a word." },
      retryLose: { penalty: 1, fx: { bond: { drona: -2 }, duty: { teacher: -1 }, flag: "missed_bird_twice" }, text: "You miss again. Drona turns away and will not watch you shoot again." } },
    kripa: { t: "Pick up the wooden sword", img: "teacher_kripa", req: { teacher: "kripa" }, game: "push", hint: "A sword drill",
      trial: { attr: "grace", skill: "mace", foe: "Kripa", verb: "Parry", face: "drill", stage: "stage_training_ground", cast: ["kripa"], tally: "Parries: {g} of 3 · Hits taken: {b} of 3", good: "Parried!", soon: "Too soon. He feints, and you bite.", late: "Too late. The wood cracks on your ribs.",
        rules: "Parry as the ring meets the mark. Three clean parries pass; three hits fail.",
        stakes: ["Kripa trusts you with real steel.", "Kripa sends you to the back row. Tomorrow you may try again."] },
      retryStakes: ["Kripa trusts you with real steel.", "Kripa gives up on you, and you must find another teacher. It counts as two failures, and it will weigh on every weapon test to come."],
      crossWhy: "Kripa sent you to the back row for good.",
      win: { fx: { skill: { mace: 1 }, bond: { kripa: 1 }, flag: "kripa_drill" }, text: "Kripa lowers the sword. \"Tomorrow,\" he says, \"steel.\"" },
      lose: { fx: {}, text: "Three welts across your ribs. Kripa points to the back row." },
      retryLose: { penalty: 1, fx: { bond: { kripa: -2 }, rep: { kuru: -1 }, flag: "kripa_twice" }, text: "Down again. Kripa sighs and calls the next student." } },
    balarama: { t: "Lift the practice mace", img: "teacher_balarama", req: { teacher: "balarama" }, game: "rhythm", hint: "A mace drill",
      trial: { attr: "might", skill: "mace", foe: "Balarama", verb: "Strike", bpm: 80, stage: "stage_training_ground", cast: ["balarama"],
        tally: "Clean strikes: {h} · Blocked: {m} · {left} to go", clean: "Through his guard!", okLine: "A solid blow.", soon: "Too soon. He reads it.", late: "Too late. He knocks your mace aside.",
        rules: "Strike as each beat reaches the ring.",
        stakes: ["Balarama laughs and calls you a real Yadava.", "Balarama sends you to haul water. You may try again tomorrow."] },
      retryStakes: ["Balarama laughs and calls you a real Yadava.", "Balarama stops teaching you, and you must find another teacher. It counts as two failures, and it will weigh on every mace test to come."],
      crossWhy: "Balarama knocked the mace from your hands twice and walked away.",
      win: { fx: { skill: { mace: 1 }, bond: { balarama: 1 }, rep: { yadava: 1 }, flag: "balarama_drill" }, text: "Balarama roars with laughter and claps you on the back hard enough to bruise. \"A real Yadava!\"" },
      lose: { fx: {}, text: "The mace flies out of your hands. Balarama hands you two water jars instead." },
      retryLose: { penalty: 1, fx: { bond: { balarama: -2 }, rep: { yadava: -1 }, flag: "balarama_twice" }, text: "Your mace hits the dust again. Balarama shrugs and walks away." } },
    hermit: { t: "Let Mauni tie the cloth", img: "teacher_mauni", req: { teacher: "hermit" }, game: "aim", hint: "An archery test, half-blind",
      trial: { attr: "aim", skill: "archery", icon: "bell", dark: true, blind: true, easy: 0.03, verb: "Release", stage: "stage_forest_clearing_night", cast: ["mauni"],
        rules: "Blindfolded, you see the bell only where it rings. Shoot where it will be. Two hits of three.",
        stakes: ["Mauni breaks his silence to say your name.", "Mauni unties the cloth and says nothing. You may try again tomorrow night."] },
      retryStakes: ["Mauni breaks his silence to say your name.", "Mauni goes back to his silence, and you must find another teacher. It counts as two failures, and it will weigh on every archery test to come."],
      crossWhy: "Mauni went back to his silence after you missed his bell twice.",
      win: { fx: { skill: { archery: 1 }, bond: { mauni: 1 }, flag: "mauni_bell" }, text: "The bell rings twice as your arrows strike it. Mauni says your name, his first word in a month." },
      lose: { fx: {}, text: "The bell swings on, untouched. Mauni unties the cloth and walks into the trees." },
      retryLose: { penalty: 1, fx: { bond: { mauni: -2 }, duty: { teacher: -1 }, flag: "mauni_twice" }, text: "You miss again. Mauni folds the cloth away and walks into the trees without a sign." } },
    vidura: { t: "Step up to Vidura's table", img: "teacher_vidura", req: { teacher: "vidura" }, game: "notice", hint: "A test of what you notice",
      trial: { attr: "wisdom", skill: "statecraft", stage: "stage_vidura_table", cast: ["vidura"],
        rules: "Look at the table while the cloth is up, then say what was there. Two of three.",
        stakes: ["Vidura gives you your first real errand.", "Vidura covers the table and says \"again tomorrow\"."] },
      retryStakes: ["Vidura gives you your first real errand.", "Vidura stops trusting your eyes, and you must find another teacher. It counts as two failures, and it will weigh on every test of statecraft to come."],
      crossWhy: "Vidura stopped trusting your eyes.",
      win: { fx: { skill: { statecraft: 1 }, bond: { vidura: 1 }, flag: "vidura_eye" }, text: "Vidura covers the table. \"Good. Tomorrow you carry a letter.\"" },
      lose: { fx: {}, text: "Vidura covers the table. \"Again tomorrow,\" he says, gently." },
      retryLose: { penalty: 1, fx: { bond: { vidura: -2 }, flag: "vidura_twice" }, text: "Again you cannot say. Vidura gives your errands to someone else." } },
    self: { t: "Hang the leaf on its thread", img: "teacher_self", req: { teacher: ["self", null, undefined] }, game: "aim", hint: "An archery test, alone",
      trial: { attr: "aim", skill: "archery", icon: "leaf", dark: true, small: true, verb: "Release", stage: "stage_forest_clearing_night",
        rules: "Shoot the leaf on its thread. Two hits of three.",
        stakes: ["You know you are good, and no one can take that away.", "You go to bed angry. Tomorrow night, again."] },
      retryStakes: ["You know you are good, and no one can take that away.", "You give up teaching yourself, and must find a teacher after all. It counts as two failures, and it will weigh on every archery test to come."],
      crossWhy: "Two nights the leaf beat you, and you gave up teaching yourself.",
      win: { fx: { skill: { archery: 1 }, flag: "leaf_night" }, text: "The leaf splits on its thread. You stand there in the dark, grinning at nobody." },
      lose: { fx: {}, text: "The leaf turns on its thread, untouched. You go to bed angry." },
      retryLose: { penalty: 1, fx: { duty: { conscience: -1 }, rep: { common: -1 }, flag: "leaf_twice" }, text: "The leaf beats you again. For the first time, you wonder if they were right about you." } }
  };

  // ---------- Act II: the test of your path ----------
  // A different kind of test from your teacher's: when the two would match (Kripa's parries and the
  // mace path's post), the mace path keeps time on the post instead.
  const POST = { attr: "might", skill: "mace", foe: "The practice post", stage: "stage_training_ground", cast: teacherCast };
  const PATH = {
    archer: { t: "Take down the old war bow", req: { path: "archer" }, game: "draw", hint: "A test of strength",
      trial: { attr: "might", skill: "archery", verb: "Draw", stage: "stage_training_ground", cast: teacherCast, tally: "Try {n} of {m} · Drawn: {w}", help: "Hold to draw. Let go while the bar is in the bright band. Hold too long and the string slips.",
        rules: "Draw the old war bow to the ear and loose clean. Two of three.",
        stakes: ["You draw the war bow, and your teacher hangs it in your room.", "The bow wins. You may try again tomorrow."] },
      retryStakes: ["You draw the war bow, and your teacher hangs it in your room.", "The bow beats you again, and you must choose another path. It counts as two failures, and it will weigh on every archery test to come."],
      crossWhy: "Your teacher's old war bow beat you twice.",
      win: { fx: { skill: { archery: 1 }, attr: { might: 1 }, flag: "drew_war_bow", journal: "You drew your teacher's old war bow to the ear." }, text: "The bow bends, groans, and comes round to your ear. When the arrow goes, it goes clean through the straw and out the other side." },
      lose: { fx: {}, text: "The bow springs back and stings your arm from wrist to elbow." },
      retryLose: { penalty: 1, fx: { flag: "war_bow_twice" }, text: "The string slips again. The bow goes back on its wall, and you go back to deciding what you are for." } },
    mace: { t: "Break the practice post", req: { path: "mace", not: { teacher: "kripa" } }, game: "push", hint: "A test of strength",
      trial: Object.assign({}, POST, { verb: "Strike", face: "post", period: 0.95, tally: "Clean blows: {g} of 3 · Glancing: {b} of 3", good: "The post cracks!", soon: "Too soon. The blow glances off.", late: "Too late. You hit it off balance.",
        rules: "Strike as the ring meets the mark. Three clean blows split the post; three glancing ones fail.",
        stakes: ["The post splits, and the younger students stare.", "The post stands. You may try again tomorrow."] }),
      retryStakes: ["The post splits, and the younger students stare.", "The post stands again, and you must choose another path. It counts as two failures, and it will weigh on every mace test to come."],
      crossWhy: "The practice post stood up to you twice.",
      win: { fx: { skill: { mace: 1 }, attr: { might: 1 }, flag: "broke_post", journal: "You split the practice post in three blows." }, text: "On the third blow the post splits from top to bottom with a sound like a tree falling." },
      lose: { fx: {}, text: "Your arms are shaking. The post has two dents in it, and it is laughing at you." },
      retryLose: { penalty: 1, fx: { flag: "post_twice" }, text: "The post stands, and your hands are bleeding. Maybe the mace is not for you." } },
    mace_beat: { t: "Break the practice post", req: { path: "mace", teacher: "kripa" }, game: "rhythm", hint: "A test of strength",
      trial: Object.assign({}, POST, { verb: "Strike", face: "post", bpm: 86, tally: "Clean blows: {h} · Missed: {m} · {left} to go", clean: "The post cracks!", okLine: "A solid blow.", soon: "Too soon.", late: "Too late.",
        rules: "Strike the post on every beat, to the end.",
        stakes: ["The post splits, and the younger students stare.", "The post stands. You may try again tomorrow."] }),
      retryStakes: ["The post splits, and the younger students stare.", "The post stands again, and you must choose another path. It counts as two failures, and it will weigh on every mace test to come."],
      crossWhy: "The practice post stood up to you twice.",
      win: { fx: { skill: { mace: 1 }, attr: { might: 1 }, flag: "broke_post", journal: "You split the practice post, keeping Kripa's time." }, text: "On the last beat the post splits from top to bottom with a sound like a tree falling." },
      lose: { fx: {}, text: "You lose the beat, then the next. The post has a few dents in it, and it is laughing at you." },
      retryLose: { penalty: 1, fx: { flag: "post_twice" }, text: "The post stands, and your hands are bleeding. Maybe the mace is not for you." } },
    charioteer: { t: "Race Karna", req: { path: "charioteer" }, game: "race", hint: "A race",
      trial: { attr: "grace", skill: "chariot", stage: "stage_racetrack", cast: ["karna"], rival: "Karna", vehicle: "chariot", obstacles: ["rock", "wreck"],
        rules: "Change lanes to miss the stones and wheels. First past the post wins.",
        stakes: ["You beat Karna, and he asks for a rematch every week after.", "Karna wins by a length. He offers to race you again tomorrow."] },
      retryStakes: ["You beat Karna, and he asks for a rematch every week after.", "Karna beats you again, and you must choose another path. It counts as two failures, and it will weigh on every chariot test to come."],
      crossWhy: "Karna beat you round the training ground twice.",
      win: { fx: { skill: { chariot: 1 }, bond: { karna: 2 }, flag: "raced_karna", journal: "You beat Karna in a chariot race at sixteen." }, text: "You cross the line half a length ahead. Karna pulls up beside you, laughing: \"Again, next week.\"" },
      lose: { fx: { bond: { karna: 1 } }, text: "Karna crosses the line a length ahead, and comes back to show you where you lost it." },
      retryLose: { penalty: 1, fx: { flag: "race_twice" }, text: "Karna wins again, easily. He is kind about it, which is worse." } },
    strategist: { t: "Play Shakuni at chaupar", req: { path: "strategist" }, game: "chaupar", hint: "A board game",
      trial: { attr: "wisdom", skill: "statecraft", stage: "stage_board_table", cast: ["shakuni"], opponent: "Shakuni",
        rules: "Two pieces each, round the cross and home. Land on his piece to send it back; green squares are safe.",
        stakes: ["You beat Shakuni, and he looks at you properly for the first time.", "Shakuni wins, and offers you another game tomorrow."] },
      retryStakes: ["You beat Shakuni, and he looks at you properly for the first time.", "Shakuni beats you again, and you must choose another path. It counts as two failures, and it will weigh on every test of statecraft to come."],
      crossWhy: "Shakuni beat you at chaupar twice, smiling.",
      win: { fx: { skill: { statecraft: 1 }, flag: "beat_shakuni_board", memory: ["shakuni", "You beat him at chaupar when you were sixteen."], journal: "You beat Shakuni at chaupar." }, text: "Shakuni looks at the board for a long time. \"Who taught you that?\" he asks softly." },
      lose: { fx: {}, text: "Shakuni gathers the cowries with a little smile. \"Tomorrow. Bring more patience.\"" },
      retryLose: { penalty: 1, fx: { flag: "board_twice" }, text: "Shakuni wins again, and tells the whole court how well you played. He means the opposite." } },
    healer: { t: "Set the stable boy's arm", req: { path: "healer" }, game: "steady", hint: "A test of steady hands",
      trial: { attr: "wisdom", skill: "healing", stage: "stage_healers_hall", cast: ["healer", "boy"], verb: "Hold", secs: 16,
        help: "Hold to press the bone into place; let go to ease off. Keep your hands over the glow until it is set.", tally: "Set: {c}%",
        wonLine: "The bone slides home. The splint holds.", nearLine: "Nearly. The bone is close, but not true.", lostLine: "The boy screams, and the bone slips out of line.",
        rules: "Hold the broken bone steady while it goes back into line.",
        stakes: ["The arm heals straight, and the healers start sending for you.", "The bone will not stay. The healer will let you try again."] },
      retryStakes: ["The arm heals straight, and the healers start sending for you.", "The bone slips again, and you must choose another path. It counts as two failures, and it will weigh on every healing test to come."],
      crossWhy: "Twice the bone slipped under your hands.",
      win: { fx: { skill: { healing: 1 }, item: { herbs: 1 }, rep: { common: 1 }, flag: "set_the_arm", journal: "You set a broken arm so well it healed straight." }, text: "The bone slides home under your hands. Six weeks later the boy is throwing stones with that arm." },
      lose: { fx: {}, text: "The bone slips out of line, and the boy goes white. The old healer takes over, and nods at you to watch." },
      retryLose: { penalty: 1, fx: { flag: "arm_twice" }, text: "The bone slips again. The old healer sets it herself, and does not send for you after that." } },
    spy: { t: "Cross the palace at night", req: { path: "spy" }, game: "sneak", hint: "A test of stealth",
      trial: { twist: "lamp", attr: "grace", skill: "stealth", stage: "stage_palace_corridor", cast: ["guard"], verb: "Move", trips: 2, help: "Hold to move along the corridor. Stop before the lamplight reaches you.",
        tally: "Crossings: {d} of {n} · Seen: {s} of {m}", made: "Through. Now back.", spotted: "A guard turns. You slip back behind a pillar.",
        rules: "Carry the note past the night guard and back, twice, unseen.",
        stakes: ["Your teacher starts trusting you with real secrets.", "A guard sees a shadow. You may try again tomorrow night."] },
      retryStakes: ["Your teacher starts trusting you with real secrets.", "The guard catches your sleeve, and you must choose another path. It counts as two failures, and it will weigh on every stealth test to come."],
      crossWhy: "The night guard caught you in the palace twice.",
      win: { fx: { skill: { stealth: 1 }, flag: "crossed_palace", journal: "You crossed the palace at night, twice, unseen." }, text: "You put the note back in your teacher's hand before dawn, the seal unbroken." },
      lose: { fx: {}, text: "A lamp swings your way and you have to go back. The note is still in your sleeve." },
      retryLose: { penalty: 1, fx: { flag: "palace_twice", rep: { kuru: -1 } }, text: "The guard catches your sleeve and marches you to the steward. By morning everyone knows." } },
    bard: { t: "Say back the old verses", req: { path: "bard" }, game: "drill", hint: "A test of memory",
      trial: { attr: "wisdom", skill: "lore", set: "verse", stage: "scene_fair", cast: teacherCast, lengths: [3, 4, 5],
        watch: "Listen.", repeat: "Now say them back, in order.", good: "Every line, in order.", bad: "Wrong. That line came here.",
        rules: "Say back each verse the bard speaks. Two of three must be perfect.",
        stakes: ["The old bard lets you sing in his place that night.", "The words come out in the wrong order. You may try again tomorrow."] },
      retryStakes: ["The old bard lets you sing in his place that night.", "The verses beat you again, and you must choose another path. It counts as two failures, and it will weigh on every test of lore to come."],
      crossWhy: "Twice the old verses came out of you in the wrong order.",
      win: { fx: { skill: { lore: 1 }, rep: { common: 1 }, flag: "verse_perfect", journal: "You sang in the old bard's place at the fair." }, text: "You say back every line, in order. That night you sing in his place, and the crowd goes quiet in the right places." },
      lose: { fx: {}, text: "The lines tangle. The bard pats your hand. \"Tomorrow.\"" },
      retryLose: { penalty: 1, fx: { flag: "verse_twice" }, text: "The lines tangle again. The bard sings his verse himself, and does not ask you again." } }
  };

  // ---------- Act III ----------
  // The great bow at Kampilya, for those who rode there for the swayamvara.
  const BOW = { t: "Take the great bow", game: "draw", hint: "A test of strength",
    trial: { attr: "might", skill: "archery", verb: "Draw", stage: "stage_bow_courtyard", cast: ["guard"], tally: "Try {n} of {m} · Strung: {w}", help: "Hold to bend the bow. Let go while the bar is in the bright band. Hold too long and the string slips.",
      rules: "String the great bow. Two of three tries.",
      stakes: ["You string the great bow, and the kings' men see it.", "The bow wins. The bow-master offers you one more try at first light."] },
    retryStakes: ["You string the great bow, and the kings' men see it.", "The bow beats you again, and the kings' men laugh. It counts as two failures, and it will weigh on every archery test to come."],
    win: { fx: { rep: { panchala: 1, common: 1 }, skill: { archery: 1 }, flag: ["strung_great_bow", "act3_tested"], journal: "You strung the great bow of Panchala the night before Draupadi's swayamvara." }, text: "The string drops into its notch, and the courtyard goes quiet. Tomorrow the kings will ask who you are." },
    lose: { fx: { flag: "act3_tested" }, text: "The bow springs straight and nearly takes your teeth. \"First light,\" says the bow-master. \"Once more.\"" },
    retryLose: { penalty: 1, fx: { rep: { panchala: -1, common: -1 }, flag: "bow_twice" }, text: "The string slips again. The kings' men laugh, and someone throws you a child's bow." } };
  // The spring hunt at home, for those who stayed.
  const HUNT = { t: "Join the spring hunt", game: "aim", hint: "An archery test",
    trial: { attr: "aim", skill: "archery", icon: "deer", field: true, verb: "Release", speed: 1.9, stage: "stage_forest_edge", cast: ["boy"],
      rules: "Loose as the deer crosses your line. Two arrows of three.",
      stakes: ["You bring down the deer, and the whole town eats from your hunt.", "The deer gets into the trees. Another will come at dawn."] },
    retryStakes: ["You bring down the deer, and the whole town eats from your hunt.", "The deer gets away again, and the hunters stop waiting for you. It counts as two failures, and it will weigh on every archery test to come."],
    win: { fx: { rep: { common: 2 }, skill: { archery: 1 }, flag: ["spring_deer", "act3_tested"], journal: "You brought down the deer at the spring hunt, the year of Draupadi's swayamvara." }, text: "Your second arrow takes it behind the shoulder. That night the whole town eats from your hunt." },
    lose: { fx: { flag: "act3_tested" }, text: "The deer is in the trees before your arrow leaves the string. \"Dawn,\" says one of the old hunters." },
    retryLose: { penalty: 1, fx: { flag: "hunt_twice" }, text: "It gets away again. The hunters go on without you, and come home without the deer, and somehow it is your fault." } };

  // Where you make your life: the test of that place.
  const COURT = {
    hastinapura: { t: "Play Duryodhana's board", req: { court: "hastinapura" }, game: "baghchal", hint: "A board game",
      trial: { attr: "wisdom", skill: "statecraft", stage: "stage_board_table", cast: ["duryodhana"], opponent: "Duryodhana", need: 3,
        rules: "You have the two tigers. Jump goats to take them; take three before you are hemmed in.",
        stakes: ["Duryodhana laughs, and you are his for the asking.", "His goats hem you in. He offers you another game, watching you."] },
      retryStakes: ["Duryodhana laughs, and you are his for the asking.", "His goats hem you in again, and the court decides you are no one. It counts as two failures, and it will weigh on every test of statecraft to come."],
      win: { fx: { bond: { duryodhana: 2 }, rep: { kuru: 1 }, flag: "beat_duryodhana_bagh", journal: "You beat Duryodhana at tigers and goats with his own tigers." }, text: "Duryodhana sweeps the last goat off the board himself, laughing. \"Hunt like that for me,\" he says, \"and you will never be hungry.\"" },
      lose: { fx: {}, text: "The goats close in around your tigers. Duryodhana sets the board up again without a word." },
      retryLose: { penalty: 1, fx: { rep: { kuru: -1 }, flag: "bagh_twice" }, text: "Hemmed in again. Duryodhana loses interest in you in the middle of a sentence." } },
    indraprastha: { t: "Go into the burning forest", req: { court: "indraprastha" }, game: "herd", hint: "A test of nerve",
      trial: { attr: "command", skill: "stealth", stage: "stage_khandava_top", theme: "fire", need: 6, spread: 3.0,
        rules: "Reach the trapped families through the smoke, then lead them out by the river gap.",
        stakes: ["You bring a line of families out of the fire.", "The fire breaks your line. There is still a way in."] },
      retryStakes: ["You bring a line of families out of the fire.", "The fire beats you, and you come out alone. It counts as two failures, and it will weigh on every test of command to come."],
      win: { fx: { rep: { common: 2, sages: 1 }, duty: { conscience: 2 }, flag: ["led_out_of_khandava", "khandava_nagas"], memory: ["all", "You led families out of the fire when the Khandava forest burned."], journal: "You led families out of the burning Khandava forest while the new city was being cleared." }, text: "You come out by the river with a line of coughing families behind you. On the far bank, Indraprastha is being measured out with strings." },
      lose: { fx: {}, text: "The fire closes across your path and the line scatters. You get out alone, and look back at the smoke." },
      retryLose: { penalty: 1, fx: { duty: { conscience: -1 }, flag: "khandava_twice" }, text: "The fire beats you again. You watch the forest burn from the riverbank with the others." } },
    panchala: { t: "Answer Drupada's council", req: { court: "panchala" }, game: "retort", hint: "A test of wits",
      trial: { attr: "wisdom", skill: "statecraft", stage: "stage_drupada_hall", cast: ["guard"],
        rules: "Answer each riddle before the lamp burns down. Two right of three.",
        stakes: ["Drupada's council makes room for you on its bench.", "The council laughs. You may try again at the next sitting."],
        rounds: [
          { line: "\"What does a king keep that grows heavier the more of it he gives away?\"", replies: ["\"His word.\"", "\"His gold.\"", "\"His crown.\""] },
          { line: "\"Who is the strongest man in a kingdom?\"", replies: ["\"The one the farmers trust.\"", "\"The king's champion.\"", "\"The tax collector.\""] },
          { line: "\"What wall keeps out an army, but lets in a friend?\"", replies: ["\"A good treaty.\"", "\"A gate with a guard.\"", "\"A deep river.\""] }
        ] },
      retryStakes: ["Drupada's council makes room for you on its bench.", "The council laughs at you twice, and Drupada hears of it. It counts as two failures, and it will weigh on every test of statecraft to come."],
      win: { fx: { rep: { panchala: 2 }, skill: { statecraft: 1 }, flag: "answered_council", journal: "You answered Drupada's council in riddles, and they made room for you." }, text: "The oldest councillor moves along the bench. \"Sit. You will be wasted here, but sit.\"" },
      lose: { fx: {}, text: "The council laughs, kindly. \"Come back at the next sitting,\" the oldest says, \"with a better answer.\"" },
      retryLose: { penalty: 1, fx: { rep: { panchala: -1 }, flag: "council_twice" }, text: "The laughter is less kind this time. You are given a seat at the far end of the hall, behind a pillar." },
      again: [
        { line: "\"What is a king without a kingdom?\"", replies: ["\"A man with a name.\"", "\"A beggar.\"", "\"A god.\""] },
        { line: "\"What should a messenger carry besides the message?\"", replies: ["\"The way back.\"", "\"A sword.\"", "\"Gifts.\""] },
        { line: "\"When is it wise to lose?\"", replies: ["\"When winning would cost more.\"", "\"Never.\"", "\"When the gods say so.\""] }
      ] },
    dwaraka: { t: "Bring your boat in", req: { court: "dwaraka" }, game: "race", hint: "A test in the storm",
      trial: { attr: "grace", skill: "chariot", stage: "stage_storm_sea", vehicle: "boat", obstacles: ["wave", "rock"], hull: 3, upVerb: "Steer up", downVerb: "Steer down",
        tally: "Distance: {d}% · Hits: {h} of {l}", bump: "A wave slams into the boat.", help: "Steer between the rocks and the breaking waves: up and down, or the buttons.",
        rules: "Bring the boat in through the rocks. Three hits and it is wrecked.",
        stakes: ["You bring the boat in, and Dwaraka's harbour master learns your name.", "The boat takes a beating and you have to stand off. You can try the harbour mouth again."] },
      retryStakes: ["You bring the boat in, and Dwaraka's harbour master learns your name.", "The storm beats you, and the boat is lost on the rocks. It counts as two failures, and it will weigh on every test of steering to come."],
      win: { fx: { rep: { yadava: 2, common: 1 }, skill: { chariot: 1 }, flag: "brought_boat_in", journal: "You brought a boat in through a storm at Dwaraka's harbour mouth." }, text: "You slide in past the last rock with the sail in rags. The whole harbour is on the wall, cheering." },
      lose: { fx: {}, text: "A wave throws you back out past the rocks. You fight the boat round for another try." },
      retryLose: { penalty: 1, fx: { item: { coins: -1 }, flag: "boat_twice" }, text: "The boat breaks up on the rocks. You swim the last stretch and crawl up the beach with nothing." } },
    anga: { t: "Keep the beat for Karna's elephants", req: { court: "anga" }, game: "rhythm", hint: "A drill",
      trial: { attr: "might", skill: "chariot", stage: "stage_elephant_grounds", cast: ["karna"], bpm: 76, verb: "Drum",
        tally: "In step: {h} · Out of step: {m} · {left} to go", clean: "The whole line steps as one!", okLine: "In step.", soon: "Too soon. The line stumbles.", late: "Too late. An elephant breaks step.",
        rules: "Keep the beat, and forty elephants step as one.",
        stakes: ["King Karna gives you charge of his elephants.", "The line breaks step. Karna hands you the drum again tomorrow."] },
      retryStakes: ["King Karna gives you charge of his elephants.", "The elephants break step on you twice, and Karna gives the drum to someone else. It counts as two failures, and it will weigh on every chariot test to come."],
      win: { fx: { bond: { karna: 2 }, rep: { common: 1 }, flag: "kept_the_beat", journal: "You kept the beat for Karna's war elephants at Champa." }, text: "Forty elephants come down the grounds at Champa in one rolling step. Karna takes the drumsticks from you himself, smiling." },
      lose: { fx: {}, text: "The line stumbles, then bunches, then stops. An old mahout takes the drum from you gently." },
      retryLose: { penalty: 1, fx: { flag: "elephants_twice" }, text: "The line breaks again. Karna hands the drum to the old mahout without a word." } },
    forest: { t: "Go after the lost child", req: { court: ["matsya", "nishada", "none", "gandhara", null, undefined] }, game: "rings", hint: "A puzzle",
      trial: { attr: "wisdom", skill: "stealth", stage: "stage_forest_maze_top", mode: "open", theme: "maze", outVerb: "Outer ring", inVerb: "Inner ring", turns: "The forest shifts.",
        help: "The old forest grows in rings of trees. Line up every clearing with the outer one to open a path to the heart. Turning a ring drags the ring inside it the other way.",
        rules: "Turn the rings of the forest to open a way to the lost child before dark.",
        stakes: ["You carry the child out, and the whole place counts you as one of its own.", "The forest turns you round. There is still light; you can go in again."] },
      retryStakes: ["You carry the child out, and the whole place counts you as one of its own.", "The forest turns you round again, and someone else finds the child at dawn. It counts as two failures, and it will weigh on every stealth test to come."],
      win: { fx: { rep: { common: 2 }, flag: "found_the_heart", journal: "You found a lost child at the heart of the old forest and carried her out." }, text: "The last ring opens on a clearing with a sleeping child in it. You carry her out on your back." },
      lose: { fx: {}, text: "You come out where you went in. The rings have turned while you walked." },
      retryLose: { penalty: 1, fx: { flag: "maze_twice" }, text: "The forest turns you round again. At dawn an old woman walks in and comes out with the child, and does not look at you." } }
  };

  // ---------- Act IV: those who stayed away from the hall ----------
  const HOUSEHOLD = {
    vidura: { t: "Carry the message", req: (S) => K.homeKey(S) === "hastinapura", game: "sneak", hint: "A test of stealth",
      trial: { twist: "dog", attr: "grace", skill: "stealth", stage: "stage_city_night", cast: ["guard"], verb: "Move", help: "Hold to move along the wall. Stop before the torchlight reaches you.", tally: "Messages through: {d} of {n} · Seen: {s} of {m}", made: "Through. Back for the next.", spotted: "A shout. You run back into the dark.",
        rules: "Carry Vidura's two messages past the watchmen at Kunti's door, unseen.",
        stakes: ["Kunti gets Vidura's words before her sons leave.", "The watchmen turn you back. You may try again before dawn."] },
      retryStakes: ["Kunti gets Vidura's words before her sons leave.", "The watchmen catch you, and Duryodhana hears your name. It counts as two failures, and it will weigh on every stealth test to come; if your stealth is low, they may keep you."],
      peril: { kind: "prison", by: "Duryodhana's watchmen", place: "The cells below the palace, Hastinapura",
        text: "A watchman catches your sleeve, and this time he does not let go. Vidura's message is in his hand before you hit the ground.",
        journal: "Carrying Vidura's message the night of the exile, you were caught by Duryodhana's watchmen." },
      win: { fx: { rep: { pandava: 1 }, bond: { vidura: 1 }, flag: "message_carried", journal: "You carried Vidura's message to Kunti the night the Pandavas went into exile." }, text: "Kunti reads Vidura's words by the last of the lamp, and folds them into her sari." },
      lose: { fx: {}, text: "A torch swings your way and you run, the message still with you. Dawn is a few hours off." },
      retryLose: { penalty: 1, fx: { rep: { kuru: -1, pandava: -1 }, flag: "message_twice" }, text: "A watchman catches your sleeve. You tear free, but he has seen your face, and by morning Duryodhana knows your name." } },
    out: { t: "Get the steward's family out", req: (S) => K.homeKey(S) !== "hastinapura", game: "sneak", hint: "A test of stealth",
      trial: { twist: "clouds", attr: "grace", skill: "stealth", stage: "stage_city_night", cast: ["guard"], verb: "Move", trips: 2, help: "Hold to move through the street. Stop before the patrol's torch reaches you.",
        tally: "Brought through: {d} of {n} · Seen: {s} of {m}", made: "Through the gate. Back for the others.", spotted: "A patrol shouts. You pull them back into a doorway.",
        rules: "Get Yudhishthira's steward and his family past the patrols, in two trips.",
        stakes: ["The steward's family is across the river before the light comes.", "A patrol turns you back. You can try again before dawn."] },
      retryStakes: ["The steward's family is across the river before the light comes.", "The patrol takes the steward, and they will remember your face. It counts as two failures, and it will weigh on every stealth test to come; if your stealth is low, they may take you too."],
      peril: { kind: "prison", by: "Duryodhana's men", place: "The cells below the palace, Hastinapura",
        text: "The patrol takes the steward at the gate, and you with him. The family gets away across the river.",
        journal: "Getting a steward's family out the night after the dice game, you were taken by Duryodhana's men." },
      win: { fx: { rep: { pandava: 1, common: 1 }, duty: { conscience: 1 }, flag: "household_out", journal: "The night after the dice game you got one of Yudhishthira's stewards and his family out past Duryodhana's patrols." }, text: "The ferryman takes them across in the grey light. The steward's little girl waves from the boat until the mist takes her." },
      lose: { fx: {}, text: "A torch comes round the corner and you pull them into a doorway. There is still time." },
      retryLose: { penalty: 1, fx: { rep: { kuru: -1 }, duty: { conscience: -1 }, flag: "household_twice" }, text: "The patrol takes the steward at the gate. His family gets away, and he does not look back at you as they lead him off." } }
  };

  // ---------- Act V ----------
  const YAKSHA_ROUNDS = [
    { line: "\"What is heavier than the earth?\"", replies: ["\"A mother.\"", "\"A king's crown.\"", "\"Mount Meru.\""] },
    { line: "\"What is faster than the wind?\"", replies: ["\"The mind.\"", "\"An arrow from Arjuna's bow.\"", "\"A rumour.\""] },
    { line: "\"What, when you give it up, makes you loved?\"", replies: ["\"Pride.\"", "\"Wealth.\"", "\"Anger.\""] }
  ];
  const YAKSHA_AGAIN = [
    { line: "\"What is more numerous than the grass?\"", replies: ["\"Thoughts.\"", "\"The stars.\"", "\"Arrows in a war.\""] },
    { line: "\"What is the greatest wonder?\"", replies: ["\"That every day people die, and the living think they will not.\"", "\"That the sun rises every morning.\"", "\"That a lake can speak.\""] },
    { line: "\"What is the path?\"", replies: ["\"The one the great have walked.\"", "\"The one the scriptures argue over.\"", "\"The one you make yourself.\""] }
  ];
  const YAKSHA = { t: "Answer the voice first", game: "retort", hint: "A test of wisdom",
    trial: { attr: "wisdom", skill: "lore", rounds: YAKSHA_ROUNDS, stage: "stage_forest_lake",
      rules: "Answer the voice before the lamp burns down. Two right of three.",
      stakes: ["The voice lets you drink, and you remember every answer for life.", "The voice falls silent, waiting. You may answer again before you drink."] },
    retryStakes: ["The voice lets you drink, and you remember every answer for life.", "You cannot think for thirst. You drink, and fall like the others. It counts as two failures, and it will weigh on every test of lore to come; if your lore and wisdom are low, you may not get up again."],
    peril: { kind: "death", art: "scene_lake", caption: "A still lake in the heat", text: "You drink for thirst. The water is cold, and then there is nothing.",
      deathText: "{They} drank from the lake in the forest without answering the voice, as the Pandavas did, and no one came to bring {them} back." },
    win: { fx: { attr: { wisdom: 1 }, flag: "answered_yaksha", journal: "At the lake you answered the voice in the water. What is faster than the wind? The mind." }, text: "\"Drink,\" says the voice. When you are old you can still say every word of it." },
    lose: { fx: {}, text: "Your answer comes out wrong, and the voice falls silent. You wait." },
    retryLose: { penalty: 1, fx: { attr: { might: -1 }, flag: "yaksha_twice" }, text: "You drink for thirst, and the dark takes you. You wake on the bank at evening, alive, with a heaviness that never quite leaves." } };
  const MOKSHA = { t: "Sit down at Vikarna's board", game: "moksha", hint: "A board game",
    trial: { attr: "wisdom", skill: "lore", stage: "stage_board_table", cast: ["dushasana"], opponent: "Vikarna",
      rules: "Move by either die. A ladder's virtue saves you from one snake. First to thirty-six wins.",
      // Vikarna's remarks as the game goes: on your ladders, snakes and karma, then on his own (his_).
      remarks: { start: ["My brothers cheat at dice. This board cannot be cheated."], ladder: ["Even the board likes you."], snake: ["Everyone meets that one."],
        saved: ["You kept something back. Good."], karma: ["Karma. Don't look at me like that."], his_ladder: ["I practise when no one is watching."],
        his_snake: ["That snake knows my family."], his_saved: ["Not today, snake."], his_karma: ["Sorry. Well, a little sorry."],
        win: ["Somebody in this family had to get there."], lose: ["Again tomorrow?"] },
      stakes: ["You reach moksha first, and Vikarna starts telling you what he really thinks of this court.", "Vikarna wins. He sets the board up again for tomorrow."] },
    retryStakes: ["You reach moksha first, and Vikarna starts telling you what he really thinks of this court.", "The snakes take you down again, and Vikarna stops inviting you. It counts as two failures, and it will weigh on every test of lore to come."],
    win: { fx: { bond: { vikarna: 2 }, flag: ["beat_vikarna", "vikarna_friend"], journal: "You played Moksha Patam with Vikarna through the exile years, and won." }, text: "You reach thirty-six, and Vikarna tips his piece over, laughing. Then he tells you what he really thinks of the war to come." },
    lose: { fx: {}, text: "Vikarna reaches moksha first and looks almost sorry. \"Tomorrow,\" he says." },
    retryLose: { penalty: 1, fx: { flag: "moksha_twice" }, text: "The snake of pride takes you all the way down again. Vikarna stops inviting you, and you never find out what he wanted to say." } };
  const FORGE = { t: "Take the hammer at Charu's anvil", game: "rhythm", hint: "A test of strength",
    trial: { attr: "might", skill: "mace", stage: "stage_smithy", cast: ["charu"], bpm: 92, sound: "clang", verb: "Strike",
      tally: "Clean strikes: {h} · Missed: {m} · {left} to go", clean: "The iron rings true!", okLine: "A good strike.", soon: "Too soon. The hammer bounces.", late: "Too late. The iron is cooling.",
      rules: "Charu strikes, then you. Keep the rhythm while the iron is hot.",
      stakes: ["The blade comes out true, and Charu hangs it over the door.", "The iron cools before the blade is done. Charu puts it back in the fire for another try."] },
    retryStakes: ["The blade comes out true, and Charu hangs it over the door.", "You break the rhythm again, and the blade cracks in the quench. It counts as two failures, and it will weigh on every mace test to come."],
    win: { fx: { bond: { charu: 2 }, item: { coins: 1 }, flag: "forged_with_charu", journal: "You forged a blade with Charu, beat for beat, in the exile years." }, text: "The blade comes out of the quench hissing and true. Charu holds it up to the light and grins at you through the smoke." },
    lose: { fx: {}, text: "The iron goes grey. Charu shoves it back into the coals. \"Again.\"" },
    retryLose: { penalty: 1, fx: { bond: { charu: -1 }, flag: "forge_twice" }, text: "The blade cracks in the quench with a sound like a slap. Charu says nothing, and sweeps up the pieces." } };

  // Who is where when the Kauravas raid Matsya: the Pandavas' people are in Matsya, the Kuru court
  // is called to ride, and everyone else meets their own trouble at home.
  K.raidGroup = (S) => {
    if (S.exile === "forest") return "matsya";
    if (S.exile === "court") return "kuru";
    const h = K.homeKey(S);
    return h === "matsya" ? "matsya" : h === "hastinapura" ? "kuru" : "local";
  };
  const LOCAL = {
    border: { t: "Hold the village gate", req: (S) => ["panchala", "gandhara"].includes(K.homeKey(S)), game: "push", hint: "A test of strength",
      trial: { attr: "might", skill: "mace", foe: "The raiders", stage: "stage_border_village", cast: ["soldier", "soldier"], face: "gate", verb: "Brace", period: 0.95, tally: "Rushes held: {g} of 3 · Gate given: {b} of 3", good: "The rush breaks on the gate!", soon: "Too soon. You brace on nothing.", late: "Too late. The gate gives.",
        rules: "Brace the gate as each rush meets it. Hold three.",
        stakes: ["The raiders ride off, and the village feasts you.", "The gate gives a little. They are forming up again."] },
      retryStakes: ["The raiders ride off, and the village feasts you.", "The raiders break the gate and take the granary. It counts as two failures, and it will weigh on every test of command to come."],
      win: { fx: { rep: { common: 2 }, flag: "held_the_gate", journal: "You held a border village's gate against raiders, the year of the raid on Matsya." }, text: "The third rush breaks on the gate and does not come again. In the morning the village brings you everything it has." },
      lose: { fx: {}, text: "The gate gives a hand's breadth, and you throw your shoulder against it. They are forming up again." },
      retryLose: { penalty: 1, fx: { item: { coins: -1 }, flag: "gate_twice" }, text: "The gate breaks. The raiders take the granary and your purse with it, and ride off laughing." } },
    boat: { t: "Hold the line to the sinking boat", req: (S) => K.homeKey(S) === "dwaraka", game: "steady", hint: "A test of steady hands",
      trial: { attr: "grace", skill: "healing", stage: "stage_storm_sea", cast: ["boy"], verb: "Hold", secs: 16, help: "Hold to pull the line taut; let go to give it slack. Keep it over the glow while the crew climbs across.", tally: "Crew across: {c}%",
        wonLine: "The last of the crew climbs across.", nearLine: "Nearly. Two are still on the wreck.", lostLine: "The line jerks out of your hands.",
        rules: "Keep the line taut when the wreck rolls away, slack when it rolls back.",
        stakes: ["Every one of the crew comes across alive.", "The line slips. Two are still on the wreck, and you can try again."] },
      retryStakes: ["Every one of the crew comes across alive.", "The line slips away, and the sea takes the wreck. It counts as two failures, and it will weigh on every test of grace to come."],
      win: { fx: { rep: { yadava: 1, common: 2 }, flag: "saved_the_crew", journal: "You held the line while a sinking crew climbed across, off Dwaraka in a storm." }, text: "The last sailor tumbles into your boat as the wreck goes under. He is a boy, younger than Vasu, and he will not let go of your arm." },
      lose: { fx: {}, text: "The line jerks out of your hands, and you catch it again by the end. Two are still on the wreck." },
      retryLose: { penalty: 1, fx: { flag: "crew_twice" }, text: "The line slips away. The wreck goes under with two men still on it, and you never learn their names." } },
    elephants: { t: "Throw a rope over the lead elephant", req: (S) => K.homeKey(S) === "anga", game: "aim", hint: "A test of hand and eye",
      trial: { attr: "aim", skill: "chariot", icon: "elephant", field: true, verb: "Throw", speed: 1.6, stage: "stage_elephant_grounds", cast: ["guard"],
        rules: "Throw your rope as the lead elephant crosses your line. Two throws of three.",
        stakes: ["You turn the lead elephant, and the herd follows her away from the ghat.", "The rope falls short. They are still coming, and you can throw again."] },
      retryStakes: ["You turn the lead elephant, and the herd follows her away from the ghat.", "The herd reaches the ghat before you can turn it. It counts as two failures, and it will weigh on every chariot test to come."],
      win: { fx: { rep: { common: 2 }, flag: "roped_elephant", journal: "You turned the stampede at Champa with a rope over the lead elephant's neck." }, text: "The rope settles round her neck, and the whole herd swings after her, away from the river steps." },
      lose: { fx: {}, text: "The rope slaps against her shoulder and falls. The herd thunders on toward the ghat." },
      retryLose: { penalty: 1, fx: { flag: "stampede_twice" }, text: "The herd reaches the ghat. Most of the children scramble clear, not all." } },
    hunt: { t: "Hunt the man-eater", req: (S) => !["panchala", "gandhara", "dwaraka", "anga"].includes(K.homeKey(S)), game: "aim", hint: "An archery test",
      trial: { attr: "aim", skill: "archery", icon: "tiger", field: true, small: true, verb: "Release", speed: 1.8, stage: "stage_forest_edge", cast: ["boy"],
        rules: "The man-eater comes out of the long grass fast. Two arrows of three.",
        stakes: ["You kill the man-eater, and the villages along the forest are safe.", "The tiger is back in the grass, wounded and angrier. It will come again."] },
      retryStakes: ["You kill the man-eater, and the villages along the forest are safe.", "The tiger gets away again, and takes another herdboy that winter. It counts as two failures, and it will weigh on every archery test to come."],
      win: { fx: { rep: { common: 2 }, skill: { archery: 1 }, flag: "killed_maneater", journal: "You killed the man-eater at the edge of the Kamyaka forest." }, text: "Your second arrow takes it in the chest in mid-spring. The herdboy's brother sits down in the grass and cries." },
      lose: { fx: {}, text: "Your arrow goes into its shoulder, and it is gone into the grass, roaring. It will come again." },
      retryLose: { penalty: 1, fx: { flag: "maneater_twice" }, text: "It gets away again. That winter it takes another herdboy, and the villagers stop asking you for help." } }
  };
  const PRISON = { t: "Get out of the prison yard", game: "sneak", hint: "A test of stealth",
    trial: { twist: "turns", attr: "grace", skill: "stealth", stage: "stage_prison_yard", cast: ["guard"], verb: "Move", trips: 2, help: "Hold to creep along the wall. Stop when the torch on the watch platform turns your way.",
      tally: "Gate reached: {d} of {n} · Seen: {s} of {m} · {t} seconds", made: "At the gate. Back to the shadows.", spotted: "The guard on the platform calls out. You freeze in the corner.",
      rules: "Reach the gate twice past the torch: once to slip the bar, once to slip through.",
      stakes: ["You are over the wall and away before dawn.", "The guard nearly sees you. You can try again tomorrow night."] },
    retryStakes: ["You are over the wall and away before dawn.", "They drag you back and double your chains. It counts as two failures, and it will weigh on every stealth test to come."],
    win: { fx: { unflag: "imprisoned", flag: ["escaped_prison", "was_imprisoned"], rep: { common: 1 }, journal: "You escaped from Duryodhana's prison yard after refusing to raid Matsya." }, text: "The bar lifts without a sound. You are through the gate and over the ditch, and the city is waking up behind you." },
    lose: { fx: {}, text: "The torch swings back and you freeze in the corner. Not tonight." },
    retryLose: { penalty: 1, fx: { flag: ["prison_twice", "was_imprisoned"] }, text: "They drag you back from the gate and double your chains. You stay there until the war begins and Duryodhana needs every sword." } };

  // ---------- Act VI ----------
  const WHEEL = {
    // The dash through the turning rings (ui/play.js, U.games.dash; owner, 5 November): in behind
    // Abhimanyu before Jayadratha seals the gate, or, for the Kauravas, your ring held against the charge.
    pandava: { t: "Open the wheel with Abhimanyu", req: { side: "pandava" }, game: "dash", hint: "A test in battle",
      trial: { attr: "command", skill: "chariot", kind: "war", mode: "open", stage: "stage_chakravyuha_top", cast: ["abhimanyu"],
        rules: "Seven rings of chariots turn round the heart of the wheel. Follow Abhimanyu in, through each ring's opening, before Jayadratha seals the gate.",
        stakes: ["You go through every ring on Abhimanyu's wheels, and your company comes in behind you.", "Jayadratha's line closes the gate. A second wave is forming."] },
      retryStakes: ["You go through every ring on Abhimanyu's wheels, and your company comes in behind you.", "The gate closes again, and your company blames you. It counts as two failures, and it will weigh on your command; with little command, you may be caught inside."],
      peril: { kind: "death", flag: "died_with_abhimanyu", art: "end_wheel", caption: "The ring of chariots at sunset", text: "The rings close behind you. You see Abhimanyu's banner far inside, and then the spears.",
        deathText: "{They} broke into the wheel after Abhimanyu on the thirteenth day, and the rings closed behind {them}." },
      win: { fx: { rep: { pandava: 1 }, flag: "held_wheel" }, text: "Ring after ring opens for a heartbeat and you are through it, close on Abhimanyu's wheels. Men pour in behind you." },
      lose: { fx: {}, text: "The rings turn shut in front of you. Behind you, the second wave is forming." },
      retryLose: { penalty: 1, fx: { rep: { pandava: -1 }, flag: "wheel_twice" }, text: "The wheel closes again. Your company does not look at you." } },
    kaurava: { t: "Keep the wheel shut", req: { side: "kaurava" }, game: "dash", hint: "A test in battle",
      trial: { attr: "command", skill: "chariot", kind: "war", mode: "close", stage: "stage_chakravyuha_top", cast: ["drona"],
        rules: "You command the outer ring. Turn it so the Pandava chariots meet shields, not an opening, until the sun moves.",
        stakes: ["Your part of the wheel holds.", "A way opens where you stand. A second charge is coming."] },
      retryStakes: ["Your part of the wheel holds.", "The wheel opens where you stand, and Drona sees it. It counts as two failures, and it will weigh on your command."],
      win: { fx: { rep: { kuru: 1 }, flag: "held_wheel" }, text: "Charge after charge breaks on your shields and falls back." },
      lose: { fx: {}, text: "A chariot comes through your ring before you can turn it. The second charge is already coming." },
      retryLose: { penalty: 1, fx: { rep: { kuru: -1 }, flag: "wheel_twice" }, text: "The wheel opens where you stand. Drona sees it, and remembers your face." } },
    neutral: { t: "Sort the wounded as they come in", req: { side: ["neutral", null, undefined] }, game: "notice", hint: "A test of what you notice",
      trial: { attr: "wisdom", skill: "healing", kind: "war", stage: "stage_healers_hall", cast: ["healer"], count: 7, lookLine: "Look along the cots. You have {n} seconds.", ask: "Which of these did you see on the cots?",
        things: ["A boy with an arrow in his shoulder", "An old spearman with a broken arm", "A charioteer with burned hands", "A girl with a cut across her scalp", "A horseman with a crushed foot", "An archer who cannot see", "A drummer with a split lip", "A captain with a spear wound",
          "A water-carrier with a fever", "A cook with a scalded arm", "A prince with no wound at all", "A priest with a broken nose", "A mahout with cracked ribs", "A scout with a snake bite"],
        rules: "Look along the cots once, then say who is there.",
        stakes: ["The worst are seen first, and the boy from the wheel lives.", "You mix them up. The healers send you along the cots again."] },
      retryStakes: ["The worst are seen first, and the boy from the wheel lives.", "You mix them up again, and someone waits who should not have. It counts as two failures, and it will weigh on every healing test to come."],
      win: { fx: { rep: { common: 1 }, flag: "held_wheel" }, text: "You name them all, worst first. Out of the whole bloody day, a boy from the wheel lives because of the order you put them in." },
      lose: { fx: {}, text: "You get two of them wrong. The healers send you along the cots again." },
      retryLose: { penalty: 1, fx: { rep: { common: -1 }, flag: "wheel_twice" }, text: "You mix them up again. A man waits who should not have, and the other healers say nothing, and that is worse." } }
  };
  const NIGHT = {
    drive: { t: "Drive arrows to the front", req: { side: ["pandava", "kaurava"] }, game: "race", hint: "A test in battle",
      trial: { attr: "grace", skill: "chariot", kind: "war", stage: "stage_battlefield_night", vehicle: "chariot", obstacles: ["wreck", "fire"], hull: 3, speed: 3.5,
        tally: "Distance: {d}% · Hits: {h} of {l}", bump: "You hit something in the dark, and the chariot slews.", help: "Steer between the wrecks and the burning carts: up and down, or the buttons.",
        rules: "Drive a loaded chariot to the front between the wrecks and the burning carts.",
        stakes: ["The arrows reach the line, and it holds through the night.", "You have to turn back with half the load. You can try again."] },
      retryStakes: ["The arrows reach the line, and it holds through the night.", "The chariot goes over in the dark, and the line runs dry. It counts as two failures, and it will weigh on every chariot test to come."],
      win: { fx: { rep: { common: 1 }, flag: "night_run", journal: "On the night of the fourteenth day you drove arrows up to the front through the dark." }, text: "You pull up behind the line with the axle smoking. Hands reach up out of the dark for the arrows, and somebody laughs, high and shaky." },
      lose: { fx: {}, text: "A wreck you never saw tips the chariot on one wheel. You get it down again and turn back for another run." },
      retryLose: { penalty: 1, fx: { injury: "leg", flag: "night_twice" }, text: "The chariot goes over in the dark. You crawl out from under it with your leg on fire, and the line runs dry an hour before dawn." } },
    // A run between the lines with him on your back, not a creep (owner, 5 November: the lamp game came round too often).
    carry: { t: "Carry the wounded back", req: { side: ["neutral", null, undefined] }, game: "race", hint: "A test of nerve",
      trial: { attr: "grace", skill: "healing", kind: "war", stage: "stage_battlefield_night", vehicle: "foot", obstacles: ["arrow", "fire"], hull: 3, speed: 2.4,
        tally: "Distance: {d}% · Hit: {h} of {l}", bump: "Arrows come out of the dark. You go down in the mud, and get up again.",
        help: "Carry him back round the arrows and the burning wrecks: up and down, or the buttons.", helpSide: "Step left and right round the arrows and the burning wrecks.",
        rules: "Carry the wounded back between the lines, round the arrows and the burning wrecks. Hit three times, and you are pinned down.",
        stakes: ["You bring two back alive, and the healers stop arguing with you.", "The archers pin you down. There are still voices calling."] },
      retryStakes: ["You bring two back alive, and the healers stop arguing with you.", "An arrow finds you between the lines. It counts as two failures, and it will weigh on every test of grace to come."],
      win: { fx: { rep: { common: 2 }, duty: { conscience: 1 }, flag: "night_run", journal: "On the night of the fourteenth day you carried the wounded back between the torches." }, text: "You bring in two men, and the second is from the other army. Nobody in the tent says a word about it." },
      lose: { fx: {}, text: "Arrows come out of the dark and you lie flat in the mud. When they stop, the voices are still calling." },
      retryLose: { penalty: 1, fx: { injury: "arm", flag: "night_twice" }, text: "An arrow takes you in the arm between the lines. You crawl back alone." } }
  };

  // ---------- Act VII: Bhishma's questions ----------
  const BHISHMA_ROUNDS = [
    { line: "\"What protects a kingdom better than its walls?\"", replies: ["\"The trust of its people.\"", "\"Its army.\"", "\"Its treasury.\""] },
    { line: "\"When is a king most like a thief?\"", replies: ["\"When he takes taxes and gives no protection.\"", "\"When he spends his own gold.\"", "\"When he forgives his enemies.\""] },
    { line: "\"When two duties pull against each other, what should a person do?\"", replies: ["\"Choose the one that harms fewest, and own the harm.\"", "\"Obey the eldest.\"", "\"Wait until it passes.\""] }
  ];
  const BHISHMA_AGAIN = [
    { line: "\"Who is truly rich?\"", replies: ["\"Whoever is content.\"", "\"Whoever owns the most cattle.\"", "\"The king's treasurer.\""] },
    { line: "\"What is the root of every war?\"", replies: ["\"Wanting what belongs to another.\"", "\"The will of the gods.\"", "\"Bad luck at dice.\""] },
    { line: "\"What do the living owe the dead?\"", replies: ["\"To live so the dead are not ashamed.\"", "\"Tall shrines.\"", "\"To forget them quickly.\""] }
  ];
  const BHISHMA = { t: "Answer him", req: null, game: "retort", hint: "A test of wisdom",
    trial: { attr: "wisdom", skill: "lore", rounds: BHISHMA_ROUNDS, stage: "scene_teaching", cast: ["bhishma"],
      rules: "Answer Bhishma before the lamp burns down. Two right of three.",
      stakes: ["Bhishma blesses you, and you will carry his answers all your life.", "Bhishma closes his eyes. He may ask again tomorrow, if he lives."] },
    retryStakes: ["Bhishma blesses you, and you will carry his answers all your life.", "Bhishma turns his face away, and the sages remember it. It counts as two failures, and it will weigh on every test of lore to come."],
    win: { fx: { attr: { wisdom: 1 }, bond: { bhishma: 1 }, flag: "bhishma_answered", journal: "You answered Bhishma's questions on the bed of arrows, and he blessed you." }, text: "Bhishma smiles, which must hurt. \"Then you were listening,\" he says, \"all those years.\"" },
    lose: { fx: {}, text: "The words do not come. \"Tomorrow,\" Bhishma says, \"if I am here.\"" },
    retryLose: { penalty: 1, fx: { bond: { bhishma: -1 }, rep: { sages: -1 }, flag: "bhishma_twice" }, text: "Again the words will not come. Bhishma turns his face to the sky and does not ask again." } };

  // A test whose second chance asks different questions.
  const againRounds = (scenes, id, key, rounds) => scenes.map((sc) => (sc.id === id ? Object.assign(sc, { choices: sc.choices.map((c) => (c.id === key ? Object.assign(c, { trial: Object.assign({}, c.trial, { rounds }) }) : c)) }) : sc));

  K.scenes([].concat(
    K.trialScenes({
      id: "a2_trial", next: "a2_ekalavya", tests: TEACHER, back: { scene: "a2_teacher", then: "a2_trial" },
      scene: { act: 2, age: 16, art: "scene_teacher", place: (S) => (S.teacher === "hermit" ? "Mauni's clearing" : S.teacher === "self" ? "A clearing at night" : "Your teacher's school"), caption: "The end of the second year",
        title: "Your teacher's test",
        body: (S) => [S.teacher === "self" ? "Two years alone. Tonight you test yourself." : "Two years on, {teacher} tests you."] },
      retry: { id: "a2_trial_again", letGo: "Let it go", letText: "You let it go. Your teacher does not mention it, and neither do you.",
        scene: { act: 2, age: 16, art: "scene_teacher", place: (S) => (S.teacher === "hermit" ? "Mauni's clearing" : S.teacher === "self" ? "A clearing at night" : "Your teacher's school"), caption: "The next morning",
          title: "Once more", body: ["One more chance. There will not be a third."] } }
    }),
    K.trialScenes({
      id: "a2_pathtest", next: "a2_trial", tests: PATH, back: { scene: "a2_path", then: "a2_pathtest" },
      scene: { act: 2, age: 15, art: "scene_path", place: (S) => (S.path === "bard" ? "The spring fair" : S.path === "spy" ? "The palace, at night" : S.path === "healer" ? "The healers' hall" : S.path === "strategist" ? "Shakuni's rooms" : "Your teacher's school"), caption: "Your second year",
        title: "The test of your path",
        body: (S) => ["Prove the {path!} path is yours."] },
      retry: { id: "a2_pathtest_again", letGo: "Let it go", letText: "You let it go. The path is still yours, whatever anyone says.",
        scene: { act: 2, age: 15, art: "scene_path", place: (S) => (S.path === "bard" ? "The spring fair" : S.path === "spy" ? "The palace, at night" : S.path === "healer" ? "The healers' hall" : S.path === "strategist" ? "Shakuni's rooms" : "Your teacher's school"), caption: "The next day",
          title: "Once more", body: ["One more try."] } }
    }),
    // Act III: the great bow, for those who rode to Kampilya and have not yet been tested.
    K.trialScenes({
      id: "a3_bow", next: "a3_swayamvara", tests: { bow: BOW },
      scene: { when: (S) => !S.flags.includes("act3_tested"), skipTo: "a3_swayamvara", act: 3, age: 25, art: "scene_swayamvara", place: "Drupada's courtyard, Kampilya", caption: "The night before the contest",
        travel: "You ride to Kampilya for the swayamvara.",
        title: "The great bow",
        body: ["The swayamvara's great bow lies on its rack. Only five men alive can string it."] },
      retry: { id: "a3_bow_again", letGo: "Leave the bow to the kings", letText: "You leave the bow on its rack. Tomorrow, the kings can break their backs on it.",
        scene: { act: 3, age: 25, art: "scene_swayamvara", place: "Drupada's courtyard, Kampilya", caption: "First light", title: "First light", body: ["The courtyard is empty except for the bow-master, the bow, and you."] } }
    }),
    // Act III: the spring hunt, for those who stayed at home.
    K.trialScenes({
      id: "a3_hunt", next: "a3_news", tests: { hunt: HUNT },
      scene: { when: (S) => !S.flags.includes("act3_tested"), skipTo: "a3_news", act: 3, age: 25, art: (S) => K.childArt(S), place: (S) => K.homePlace(S), caption: "The end of the rains",
        title: "The spring hunt",
        body: ["At home, the spring hunt gathers at the forest's edge."] },
      retry: { id: "a3_hunt_again", letGo: "Leave the hunting to the old hunters", letText: "You unstring your bow and walk home. The old hunters will manage.",
        scene: { act: 3, age: 25, art: (S) => K.childArt(S), place: (S) => K.homePlace(S), caption: "Dawn", title: "Dawn", body: ["The old hunters have saved you a place."] } }
    }),
    // Act III: the test of the place where you make your life.
    K.trialScenes({
      id: "a3_courttest", next: "a3_marriage", tests: COURT,
      scene: { act: 3, age: 26, art: (S) => ({ hastinapura: "home_hastinapura", indraprastha: "scene_indraprastha", panchala: "home_panchala", dwaraka: "roots_mathura", anga: "home_anga", matsya: "home_matsya", nishada: "home_nishada", gandhara: "home_gandhara" }[S.court] || K.childArt(S)),
        place: (S) => (S.court === "indraprastha" ? "The Khandava forest, Indraprastha" : K.homePlace(S)),
        travel: (S) => (S.court && S.court !== "none" ? ["You make your home in {place}.", { place: K.COURTS[S.court].name }] : "You go where your skills are needed."),
        caption: "Your first year there",
        title: (S) => ({ hastinapura: "Tigers and goats", indraprastha: "The burning forest", panchala: "Drupada's council", dwaraka: "The harbour mouth", anga: "Karna's elephants" }[S.court] || "The old forest"),
        body: (S) => [S.court === "indraprastha" ? "The new city needs land, and the land is forest. Krishna and Arjuna have set the Khandava forest burning, and they shoot down anything that tries to escape it." : "Your new home tests you in the first year."] },
      retry: { id: "a3_courttest_again", letGo: "Let it go", letText: "You let it go. It takes longer, but in the end the place gets used to you.",
        scene: { act: 3, age: 26, art: (S) => K.childArt(S), place: (S) => (S.court === "indraprastha" ? "The Khandava forest, Indraprastha" : K.homePlace(S)), caption: "Once more", title: "Once more", body: ["One more chance."] } }
    }),
    // Act IV: Shakuni's hands, in the hall; or, for those who stayed away, the night after, at home.
    K.trialScenes({
      id: "a4_hands", next: "a4_hall",
      tests: { watch: { t: "Watch Shakuni's hands", game: "hands", hint: "A test of your eyes", trial: { stage: "stage_dice_board_top", cast: ["shakuni"] },
        // Seeing the swap, you call it out; the hall does not listen, and the game goes on (canon).
        win: { fx: { flag: ["watched_hands", "saw_swap", "spoke_dice"], rep: { pandava: 1, kuru: -1 }, journal: "In the dice hall you saw Shakuni swap a die from his sleeve, and said so." }, text: "One throw shows a face no long die has, and you call it out. Shakuni smiles, and the game goes on." },
        lose: { fx: { flag: "watched_hands" }, text: "If he did anything, you did not see it. He is about to throw again." },
        retryLose: { penalty: 1, fx: { rep: { kuru: -1 }, flag: "hands_twice" }, text: "You stare so hard that the courtiers nudge each other and laugh. You saw nothing." } } },
      scene: { act: 4, age: 30, art: "scene_dice_throws", place: "The assembly hall, Hastinapura", caption: "Before the stakes", travel: "You come to Hastinapura for the game.",
        title: "Shakuni's hands",
        body: (S) => ["Shakuni warms the dice with a few free throws. You can see his hands.",
          S.flags.includes("beat_shakuni_board") ? { memory: "Shakuni sees you, and smiles. He has not forgotten the chaupar board, fourteen years ago." } : null] },
      retry: { id: "a4_hands_again", letGo: "Look away", letText: "You look away. Whatever he is doing, you cannot see it.",
        scene: { act: 4, age: 30, art: "scene_dice_throws", place: "The assembly hall, Hastinapura", caption: "Another round", title: "Once more", body: ["One more look. There will not be a third."] } }
    }),
    K.trialScenes({
      id: "a4_household", next: "a4_aftermath", tests: HOUSEHOLD,
      scene: { when: (S) => S.flags.includes("absent_dice"), skipTo: "a4_aftermath", act: 4, age: 30, art: "scene_years_remain", place: (S) => K.homePlace(S), caption: "The night after the dice game",
        title: (S) => (K.homeKey(S) === "hastinapura" ? "Vidura's message" : "The night streets"),
        body: (S) => ["Before midnight the news comes: everything is lost.", K.homeKey(S) === "hastinapura" ? null : "By morning Duryodhana's men will be here."] },
      retry: { id: "a4_household_again", letGo: "Give it up", letText: "You give it up. Whatever happens tonight will happen without you.",
        scene: { act: 4, age: 30, art: "scene_years_remain", place: (S) => K.homePlace(S), caption: "Before dawn", title: "Before dawn", body: ["The sky is going grey. One more try, or none."] } }
    }),
    // Act V: the road you chose for the exile years has its own test.
    K.trialScenes({
      id: "a5_vikarna", next: "a5_court_armour", tests: { play: MOKSHA },
      scene: { when: { exile: "court" }, skipTo: "a5_own_life", act: 5, age: 36, art: "scene_dice_hall", place: "The palace, Hastinapura", caption: "An evening at court", travel: "You stay at the Kuru court through the exile years.",
        title: "Vikarna's board",
        body: ["Vikarna, the one Kaurava who spoke for Draupadi, sends for you.", { speaker: "Vikarna", line: "Everyone here plays dice. I play a better game. Sit down." }] },
      retry: { id: "a5_vikarna_again", letGo: "Make your excuses", letText: "You make your excuses. Vikarna plays alone, which he seems used to.",
        scene: { act: 5, age: 36, art: "scene_dice_hall", place: "The palace, Hastinapura", caption: "The next evening", title: "Another game", body: ["Vikarna has set the board up again."] } }
    }),
    K.trialScenes({
      id: "a5_forge", next: "a5_own_crisis", tests: { forge: FORGE },
      scene: { when: { exile: "own" }, skipTo: "a5_charu", act: 5, age: 35, art: "scene_smith", place: (S) => K.homePlace(S), caption: "A forge at dawn",
        title: "Charu's anvil",
        body: ["Charu, who keeps the forge down your lane now, leans in your doorway.", { speaker: "Charu", line: "I have a blade that needs two hammers, and you have two arms. Come on." }] },
      retry: { id: "a5_forge_again", letGo: "Leave the blade to Charu", letText: "You leave it to Charu, who finishes it alone and never mentions it.",
        scene: { act: 5, age: 35, art: "scene_smith", place: (S) => K.homePlace(S), caption: "The fire again", title: "Back in the fire", body: ["The blade is glowing again. Charu nods at the second hammer."] } }
    }),
    // Act V: the herds at the ford, for those who were in Matsya when the raid came.
    K.trialScenes({
      id: "a5_herd", next: "a5_karna_secret",
      tests: { herd: { t: "Turn the herd before the ford", game: "herd", hint: "A test of nerve",
        trial: { attr: "grace", skill: "chariot", kind: "stealth", theme: "river", need: 6, stage: "stage_matsya_ford", fieldLabel: "The ford", tally: "Cattle with you: {f} of {n} · Lost: {d} of {l} · {s} seconds",
          gather: "Another cow falls in behind you.", water: "The water is too deep there. The line breaks.", tangle: "The herd tangles on itself.",
          help: "Ride to each scattered cow and she falls in behind you. Bring the line round the deep water and out across the ford on the right.",
          rules: "Gather the scattered cattle behind your horse and bring them across at the ford.",
          stakes: ["You bring the herd across the ford, and the herders cheer you.", "The line breaks in the river. There are still cattle on the bank."] },
        retryStakes: ["You bring the herd across the ford, and the herders cheer you.", "The herd goes into the deep water, and calves drown. It counts as two failures, and it will weigh on every riding test to come."],
        win: { fx: { rep: { common: 1 }, bond: { uttara: 1 }, flag: "turned_herd", journal: "You brought Virata's stampeding herd across the ford." }, text: "The lead cow comes up out of the ford behind you, and the whole herd follows her up the bank. The herders cheer you all the way back." },
        lose: { fx: {}, text: "The line breaks in the river, and the cattle scatter back along the bank." },
        retryLose: { penalty: 1, fx: { rep: { common: -1 }, flag: "herd_twice" }, text: "The herd goes into the deep water, and not all of it comes out." } } },
      scene: { when: (S) => K.raidGroup(S) === "matsya", skipTo: "a5_prison", act: 5, age: 43, art: "scene_cattle", place: "The ford, Matsya", caption: "Dust on the river road", travel: "The hidden year finds you in Matsya, near the people you followed.",
        title: "The herds", body: ["The Kaurava drums have stampeded Virata's cattle. Thousands of them are running for the river."] },
      retry: { id: "a5_herd_again", letGo: "Let the herders deal with it", letText: "You rein in and let the herders try. Some of the herd is saved.",
        scene: { act: 5, age: 43, art: "scene_cattle", place: "The ford, Matsya", caption: "The far bank", title: "The far bank", body: ["Half the herd is still on the near bank, lowing. You turn your horse back into the water."] } }
    }),
    // Act V: the prison yard, for those who would not ride on Matsya.
    K.trialScenes({
      id: "a5_prison", next: "a5_karna_secret", tests: { escape: PRISON },
      scene: { when: { flag: "imprisoned" }, skipTo: "a5_local", act: 5, age: 43, art: "scene_secret", place: "The prison yard, Hastinapura", caption: "Below the palace walls", travel: "Duryodhana's guards take you to the prison yard in chains.",
        title: "The prison yard",
        body: ["Duryodhana does not forgive a refusal. You wake in chains in the prison yard below the palace.", "On the third night, the bar on the gate is loose."] },
      retry: { id: "a5_prison_again", letGo: "Wait for the war", letText: "You wait. When the war comes, they do need you, and they let you out.",
        scene: { act: 5, age: 43, art: "scene_secret", place: "The prison yard, Hastinapura", caption: "The next night", title: "The next night", body: ["The bar is still loose. The guard on the platform is a different man, and more awake."] } }
    }),
    // Act V: trouble at home, for those who were neither in Matsya nor at the Kuru court.
    K.trialScenes({
      id: "a5_local", next: "a5_karna_secret", tests: LOCAL,
      scene: { when: (S) => K.raidGroup(S) === "local", skipTo: "a5_karna_secret", act: 5, age: 43, art: (S) => ({ panchala: "battle_border", dwaraka: "roots_mathura", anga: "home_anga" }[K.homeKey(S)] || "ev_deer"), place: (S) => K.homePlace(S), caption: "The year of the raid",
        title: (S) => ({ panchala: "Raiders at the border", gandhara: "Raiders at the pass", dwaraka: "The wreck", anga: "The stampede at Champa" }[K.homeKey(S)] || "The man-eater"),
        body: (S) => [K.homeKey(S) === "gandhara" ? "Hill raiders come down on the villages at the pass, as if the whole land had been given leave." : "The same week, trouble comes here too."] },
      retry: { id: "a5_local_again", letGo: "Leave it to others", letText: "You leave it to others. They do what they can.",
        scene: { act: 5, age: 43, art: (S) => ({ panchala: "battle_border", dwaraka: "roots_mathura", anga: "home_anga" }[K.homeKey(S)] || "ev_deer"), place: (S) => K.homePlace(S), caption: "Once more", title: "Once more", body: ["There is still time, just."] } }
    }),
    // Act VI: the wheel on the thirteenth day.
    K.trialScenes({
      // Played before the day-13 scene (whose closing lines tell of Abhimanyu's fall), never after it.
      id: "a6_wheel", next: "a6_day13", tests: WHEEL,
      scene: { act: 6, age: 44, war: true, art: "scene_day13", place: "Kurukshetra · day 13", caption: "The wheel formation",
        title: "What the wheel asks", body: (S) => [S.side === "pandava" ? "Drona sets the Chakravyuha. Abhimanyu looks for the way in, and your company waits on you."
          : S.side === "kaurava" ? "Drona sets the Chakravyuha, and you are one of its rings. The Pandava chariots are coming."
          : "On the thirteenth morning the drums start before dawn, and by noon the carts are bringing the wounded in faster than anyone can count."] },
      retry: { id: "a6_wheel_again", letGo: "Fall back", letText: "You fall back with the others. Someone else takes your place.",
        scene: { act: 6, age: 44, war: true, art: "scene_day13", place: "Kurukshetra · day 13", caption: "The second wave", title: "Again", body: ["There is no time to think. Again."] } }
    }),
    // Act VI: the night battle after the fourteenth day.
    K.trialScenes({
      id: "a6_night", next: "a6_day15", tests: NIGHT,
      scene: { act: 6, age: 44, war: true, art: "war_day14", place: "Kurukshetra · the night of day 14", caption: "Torches across the field",
        title: "The night battle", body: (S) => [S.side === "neutral" ? "The healers go out between the lines with torches. Some of them do not come back." : "No one sounds the conch at sunset. The fighting goes on by torchlight."] },
      retry: { id: "a6_night_again", letGo: "Wait for dawn", letText: "You wait for dawn. It is a long time coming.",
        scene: { act: 6, age: 44, war: true, art: "war_day14", place: "Kurukshetra · the night of day 14", caption: "Later in the night", title: "Again", body: ["The torches are burning down. Once more, before they go out."] } }
    }),
    // Act VII: Bhishma on the bed of arrows.
    againRounds(K.trialScenes({
      id: "a7_question", next: "a7_note", tests: { answer: BHISHMA },
      scene: { act: 7, age: 44, art: "scene_teaching", place: "The bed of arrows", caption: "The grandsire's questions",
        title: "Bhishma's questions", body: ["Before he finishes, Bhishma turns his head on the arrows and looks at you. \"You,\" he says. \"Answer me.\""] },
      retry: { id: "a7_question_again", letGo: "Stay silent", letText: "You stay silent. Bhishma does not ask again.",
        scene: { act: 7, age: 44, art: "scene_teaching", place: "The bed of arrows", caption: "The next day", title: "The next day", body: ["Bhishma is still alive. He asks for you."] } }
    }), "a7_question_again", "answer", BHISHMA_AGAIN)
  ));

  // The council's second sitting asks new riddles; the lake asks new questions.
  const ct = K.SCENES.a3_courttest_again;
  if (ct) ct.choices = ct.choices.map((c) => (c.id === "panchala" ? Object.assign(c, { trial: Object.assign({}, c.trial, { rounds: COURT.panchala.again }) }) : c));
  K.YAKSHA = YAKSHA; K.YAKSHA_AGAIN = YAKSHA_AGAIN;

  // ---------- A cell (any act): where a perilous failure can put you (see K.inPeril) ----------
  // A way out over the wall (a test of stealth), or the long wait. Either way the story goes on
  // from where it would have gone (S.captive.then).
  const CAPTOR = (S) => (S.captive && S.captive.by) || "the guards";
  const captiveArt = (S) => (S.act >= 6 ? "scene_prisoners_pen" : "scene_cell");
  const captivePlace = (S) => (S.captive && S.captive.place) || "A cell";
  const captiveThen = (S) => (S.captive && S.captive.then) || "end_life";
  const waitThen = (S) => (S.captive && (S.captive.waitThen || S.captive.then)) || "end_life"; // the long wait can outlast what was happening (a war)
  const WAIT = { unflag: "captive", flag: "waited_out_captivity", duty: { family: -1 }, rep: { common: -1 },
    journal: "You were locked away for months, and waited until they let you go." };
  const ESCAPE = { t: "Get out over the wall", game: "sneak", hint: "A test of stealth",
    trial: { twist: "clouds", attr: "grace", skill: "stealth", stage: "stage_prison_yard", cast: ["guard"], verb: "Move", trips: 2, help: "Hold to creep along the wall. Stop when the torch on the watch platform turns your way.",
      tally: "Gate reached: {d} of {n} · Seen: {s} of {m} · {t} seconds", made: "At the gate. Back to the shadows.", spotted: "The guard on the platform calls out. You freeze in the corner.",
      rules: "Reach the gate twice past the torch: once to slip the bar, once to slip through.",
      stakes: ["You are over the wall and away before dawn.", "The guard nearly sees you. You can try again another night."] },
    retryStakes: ["You are over the wall and away before dawn.", "They drag you back and double your chains, and you wait out the months in the dark. It counts as two failures, and it will weigh on every stealth test to come."],
    win: { fx: { unflag: "captive", flag: "escaped_captivity", rep: { common: 1 }, journal: "You were locked away once, and went over the wall." }, text: "The bar lifts without a sound. You are through the gate and over the ditch before the guard turns back." },
    lose: { fx: {}, text: "The torch swings back and you freeze in the corner. Not tonight." },
    retryLose: { penalty: 1, next: waitThen, fx: Object.assign({}, WAIT, { flag: ["waited_out_captivity", "captive_twice"] }), text: "They drag you back from the gate and double your chains. Months pass in the dark before anyone remembers to let you go." } };
  K.scenes([
    { id: "x_captive", art: captiveArt, place: captivePlace, caption: "In chains", title: "Locked away",
      body: (S) => [["You wake in chains, on stone. {who} took you, and nobody will come asking for you soon.", { who: CAPTOR(S) }], "The bar on the gate is old, and loose."],
      choices: [K.testChoice("x_captive", "escape", ESCAPE), { id: "wait", t: "Wait it out", fx: WAIT, next: waitThen, text: "You wait out the seasons behind the wall. When they open the gate, the world has gone on without you." }],
      next: "x_captive_again" },
    { id: "x_captive_again", when: K.retryWhen("x_captive", ["escape"]), skipTo: captiveThen, art: "stage_prison_yard", place: captivePlace, caption: "Another night", title: "Another night",
      body: ["The bar is still loose. The guard on the platform has a cough now, and turns away to spit."],
      choices: [K.retryChoice("x_captive", "escape", ESCAPE), { id: "wait", t: "Wait it out", fx: WAIT, next: waitThen, text: "You stop counting the nights. When they finally open the gate, the world has gone on without you." }],
      next: captiveThen }
  ]);
})(window.K = window.K || {});
