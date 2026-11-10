/* Act II — Training (ages 14–20). PRD §6, §7 teachers, §8 paths. */
(function (K) {
  "use strict";
  const COURTISH = ["hastinapura", "anga", "gandhara", "matsya"];
  // The armoury: a thing that suits your best attribute says so.
  const SUITS = { archer: "Suits your aim", mace: "Suits your might", charioteer: "Suits your grace", strategist: "Suits your command",
    healer: "Suits your wisdom", spy: "Suits your grace", bard: "Suits your wisdom" };
  const suits = (id, S) => { const st = K.PATHS[id].stat, top = Math.max(...Object.keys(K.ATTRS).map((a) => K.attr(a, S))); return K.attr(st, S) >= top; };
  // On the weapon grid, stars on the picture of what suits you best (ui/scene.js): one when your best
  // attribute is tied with another, two when it leads by one, three when it leads by more. None when
  // all your attributes are level, since then nothing suits you better than the rest.
  const fitStars = (id, S) => {
    const vals = Object.keys(K.ATTRS).map((a) => K.attr(a, S)), top = Math.max(...vals);
    if (K.attr(K.PATHS[id].stat, S) < top || vals.every((v) => v === top)) return 0;
    if (vals.filter((v) => v === top).length > 1) return 1;
    return Math.min(3, 1 + top - Math.max(...vals.filter((v) => v < top)));
  };
  K.fitStars = fitStars;
  const pathChoice = (id, t, extra = {}) => ({
    id, t, img: "path_" + id, fx: Object.assign({ set: { path: id }, skill: { [K.PATHS[id].skill]: 2 }, journal: "You chose the path of the {path!}." }, extra),
    hint: (S) => (suits(id, S) ? SUITS[id] : ""),
    stars: (S) => fitStars(id, S)
  });
  // Drona takes the court's children; anyone else must first make a shot almost no one makes.
  const COURT_CHILD = { any: [{ origin: "hastinapura" }, { rep: ["kuru", 5] }] };
  const DRONA_TAKES = { set: { teacher: "drona" }, duty: { teacher: 5 }, skill: { archery: 2 }, flag: ["drona_student", "drona_audition"], rep: { kuru: 2 } };
  const audition = (low) => ({ id: low ? "drona_ask_low" : "drona_ask", img: "teacher_drona", t: "Ask Drona to test you",
    req: low ? { origin: ["suta", "nishada"], noFlag: "drona_refused" } : { not: { any: [COURT_CHILD, { origin: ["suta", "nishada"] }] }, noFlag: "drona_refused" },
    game: "aim", hint: low ? "A shot no one makes" : "One impossible shot",
    trial: { attr: "aim", skill: "archery", icon: "bird", small: true, easy: low ? -0.06 : -0.04, speed: low ? 2.4 : 2.1, shots: 3, need: low ? 3 : 2, verb: "Release",
      stage: "stage_drona_gate", cast: ["drona", "arjuna"],
      rules: low ? "Hit the wooden bird on the highest branch. Three arrows; all three must hit." : "Hit the wooden bird on the highest branch. Two hits of three.",
      stakes: ["Drona takes you, grudgingly, and the whole court hears of it.", "Drona turns away. You will have to choose another teacher."] },
    win: { fx: Object.assign({}, DRONA_TAKES, { journal: "You passed Drona's test at the gate, though your family was not of the court, and he took you as a student." }),
      text: "The last arrow takes the bird off its branch. \"Tomorrow, before dawn,\" Drona says." },
    lose: { fx: { flag: "drona_refused" }, text: "Your arrows fall short and wide. \"Find another teacher,\" Drona says, not unkindly.", next: "a2_teacher" } });

  K.scenes([
    {
      id: "a2_teacher", act: 2, age: 14, art: "scene_teacher", place: "Hastinapura and beyond", caption: "The training grounds at dawn",
      title: "Who will teach you?", hideLocked: true,
      body: (S) => [
        "You are fourteen.",
        S.origin === "nishada" ? { memory: "In your village they still speak of Ekalavya, who asked Drona to teach him and was turned away." } : null,
        S.origin === "panchala" ? { aside: "Drona hates your king, Drupada." } : null
      ],
      choices: [
        audition(false), audition(true),
        { id: "drona", img: "teacher_drona", t: "Drona", req: COURT_CHILD, locked: "",
          fx: { set: { teacher: "drona" }, duty: { teacher: 5 }, skill: { archery: 2 }, rep: { kuru: 1 }, flag: "drona_student", journal: "Drona accepted you as a student." }, hint: "His fee may cost you friends" },
        { id: "kripa", img: "teacher_kripa", t: "Kripa", req: { any: [{ origin: COURTISH }, { rep: ["kuru", 5] }] }, locked: "Kuru court only",
          fx: { set: { teacher: "kripa" }, duty: { teacher: 3, court: 2 }, skill: { mace: 1, archery: 1 }, journal: "Kripa took you into his school." }, hint: "Loyalty to the Kuru throne" },
        // Families from other lands may still ask. A test decides, and a refusal sends you back to choose again.
        { id: "kripa_ask", img: "teacher_kripa", t: "Ask Kripa to take you", req: { not: { any: [{ origin: COURTISH }, { rep: ["kuru", 5] }] }, noFlag: "kripa_refused" },
          check: { attr: "command", skill: "statecraft", dc: 7,
            pass: { fx: { set: { teacher: "kripa" }, duty: { teacher: 3, court: 2 }, skill: { mace: 1, archery: 1 }, journal: "Kripa took you into his school, though your family was not of the court." }, text: "Kripa questions you for an hour, then sets you to sweep the practice ground. That means yes." },
            fail: { fx: { flag: "kripa_refused" }, text: "\"Come back when the court knows your name,\" Kripa says. You will have to choose another teacher.", next: "a2_teacher" } } },
        { id: "balarama", img: "teacher_balarama", t: "Balarama, master of the mace", req: { any: [{ origin: "mathura" }, { flag: "balarama_noticed" }] }, locked: "Yadavas, or those he has seen fight",
          fx: { set: { teacher: "balarama" }, duty: { teacher: 4 }, skill: { mace: 2 }, rep: { yadava: 2 }, journal: "Balarama agreed to teach you the mace." }, hint: "He will ask you to stay out of the war" },
        { id: "hermit", img: "teacher_mauni", t: "Mauni, the forest hermit",
          fx: { set: { teacher: "hermit" }, duty: { teacher: 5, conscience: 1 }, skill: { archery: 1, stealth: 1, lore: 1 }, flag: "hermit_secret", journal: "Mauni the hermit took you as his student and made you promise never to say who taught you." }, hint: "Never say who taught you" },
        { id: "vidura", img: "teacher_vidura", t: "Vidura's circle", req: { origin: ["hastinapura", "anga", "gandhara"] }, locked: "Court families only",
          fx: { set: { teacher: "vidura" }, duty: { teacher: 3, conscience: 1 }, skill: { statecraft: 2, stealth: 1 }, bond: { vidura: 2 }, journal: "You joined Vidura's circle." }, hint: "He will judge your choices" },
        { id: "vidura_ask", img: "teacher_vidura", t: "Ask Vidura to take you", req: { not: { origin: ["hastinapura", "anga", "gandhara"] }, noFlag: "vidura_refused" },
          check: { attr: "wisdom", skill: "statecraft", dc: 7,
            pass: { fx: { set: { teacher: "vidura" }, duty: { teacher: 3, conscience: 1 }, skill: { statecraft: 2, stealth: 1 }, bond: { vidura: 2 }, journal: "Vidura let you into his circle, though you were not born to the court." }, text: "Vidura asks what you noticed on your way to his door. You tell him of the guard who was not at his post, and he nods slowly." },
            fail: { fx: { flag: "vidura_refused" }, text: "Vidura asks what you noticed on your way to his door, and you noticed nothing. You will have to choose another teacher.", next: "a2_teacher" } } },
        { id: "self", img: "teacher_self", t: "Teach yourself", fx: { set: { teacher: "self" }, skill: { archery: 1 }, attr: { aim: 1 }, flag: "self_taught", journal: "You taught yourself, alone, by night." }, hint: "No debt, no protector" }
      ],
      next: "a2_path"
    },
    {
      id: "a2_path", act: 2, age: 15, place: (S) => (S.teacher === "hermit" ? "Mauni's clearing" : S.teacher === "self" ? "A clearing at night" : "Your teacher's school"), art: "scene_armoury", plate: ["#3e8c72", "#d4a84b"], caption: "The armoury",
      title: "Choose, then prove it", grid: true,
      body: (S) => [
        (S.teacher === "self" ? "Which weapon do you choose?" : "Which weapon do you choose?")
      ],
      choices: [
        pathChoice("archer", "The bow"),
        pathChoice("mace", "The mace"),
        pathChoice("charioteer", "The reins", { attr: { grace: 1 } }),
        pathChoice("strategist", "Statecraft", { attr: { command: 1 } }),
        pathChoice("healer", "Healing", { item: { herbs: 2 } }),
        pathChoice("spy", "Secrets", { attr: { grace: 1 } }),
        pathChoice("bard", "The vina", { attr: { wisdom: 1 } })
      ],
      next: "a2_pathtest"
    },
    {
      id: "a2_ekalavya", act: 2, age: 16, canon: true, place: "The forest near Hastinapura", travel: "Drona takes his students hunting in the forest near Hastinapura.", art: "scene_ekalavya", plate: ["#3e8c72", "#16131f"], caption: "A clay image in a forest clearing",
      title: "Ekalavya's fee",
      body: ["What do you do?"],
      choices: [
        { id: "speak", t: "Say it is wrong", fx: (S) => ({ duty: { conscience: 2, teacher: S.teacher === "drona" ? -2 : 0 }, bond: { arjuna: -1 }, rep: { common: 1 }, memory: ["drona", "You objected to the fee he asked of Ekalavya."] })  },
        { id: "silent", t: "Keep silent", fx: { duty: { conscience: -1, teacher: 1 } } },
        { id: "tend", t: "Bind Ekalavya's hand",
          check: { attr: "wisdom", skill: "healing", dc: 7,
            pass: { fx: { rep: { common: 2 }, duty: { conscience: 1 }, flag: "helped_ekalavya", journal: "You bound Ekalavya's hand. He thanked you and said he would learn to shoot with two fingers." }, text: "The wound is clean when you leave. Ekalavya says he will learn to draw a bow with two fingers." },
            fail: { fx: { duty: { conscience: 1 }, flag: "helped_ekalavya" }, text: "You do what you can, which is not much. He thanks you anyway." } } },
        { id: "kin", t: "Stay with Ekalavya", req: { origin: "nishada" }, fx: { duty: { conscience: 3 }, rep: { common: 2, kuru: -2 }, flag: "stood_with_ekalavya", memory: ["all", "You chose your own people over the princes' hunt."] } }
      ],
      next: "s_youth"
    },
    {
      id: "a2_spar", act: 2, age: 17, art: "scene_teacher", place: "The practice ground", caption: "Sparring at the practice ground",
      title: "The sparring trial",
      body: ["Before the tournament, you must spar with Ketan, the armourer's son. He is unbeaten this season."],
      choices: [
        { id: "fight", t: "Take the bout", combat: "e_spar" },
        { id: "skip", t: "Train alone instead", fx: { attr: { wisdom: 1 } } }
      ],
      next: "a2_tournament"
    },
    {
      id: "a2_tournament", act: 2, age: 17, canon: true, art: "scene_tournament", place: "Tournament grounds, Hastinapura", caption: "Karna walks into the arena",
      title: "The tournament",
      witness: [
        "Karna matches Arjuna, and is shamed for having no royal name."
      ],
      body: (S) => [
        S.origin === "suta" ? { memory: "You know the old charioteer pushing through the crowd. Everyone in your lane knows Adhiratha." } : null,
        S.friend === "karna" ? { memory: "Karna is your closest friend. You know exactly what this moment is costing him." } : null,
        "What do you do?"
      ],
      choices: [
        { id: "beside", t: "Stand beside Karna", fx: { bond: { karna: 3, arjuna: -1 }, duty: { conscience: 1, court: -1 }, flag: "stood_with_karna", memory: ["karna", "You stood beside him when the arena laughed."] } },
        { id: "shout", t: "Shout your own charioteer house", req: { origin: "suta" },
          fx: { bond: { karna: 4 }, rep: { kuru: -2, common: 2 }, duty: { court: -2, family: 1 }, flag: ["stood_with_karna", "named_house"], memory: ["karna", "You said your father's trade out loud, in front of the princes."] } },
        { id: "princes", t: "Stay with the princes", fx: { duty: { court: 2, teacher: 1 }, bond: { karna: -2, arjuna: 2 }, flag: "stood_with_princes", memory: ["arjuna", "You stayed at his side."] } },
        { id: "silent", t: "Watch", fx: { duty: { conscience: -1 }, bond: { karna: -1 }, flag: "silent_at_tournament", memory: ["karna", "You were in the stands, and you said nothing."] } },
        { id: "leave", t: "Leave the arena", fx: { rep: { kuru: -1 }, bond: { karna: 1 }, flag: "left_arena" }, hint: "Opens a hidden thread" }
      ],
      after: ["Duryodhana makes Karna king of Anga on the spot."],
      next: "a2_drupada"
    },
    {
      id: "a2_drupada", act: 2, age: 18, canon: true, place: "The road to Panchala", travel: "Drona marches his students east to Panchala to collect his fee.", art: "scene_drupada", plate: ["#c0472f", "#5c3361"], caption: "The road to Drupada's capital",
      title: "Drona's fee",
      witness: [
        "For his fee, Drona asks for King Drupada as a prisoner."
      ],
      body: (S) => [
        S.origin === "panchala" ? { memory: S.flags.includes("moved_capital") ? "Panchala is your homeland. The arrows in the Kuru quivers came from your mother's workshop in the armoury." : "Panchala is your home. Your mother's arrows are in those quivers." } : null,
        S.teacher === "drona" ? "Drona looks at you." : "The army passes your door on its way east."
      ],
      choices: [
        { id: "ride", t: "Ride against Panchala", req: { teacher: "drona" }, combat: "e_panchala",
          resolve: (S) => (S.origin === "panchala" ? { duty: { conscience: -3, family: -2 }, memory: ["all", "You rode against your own homeland to pay your teacher."] } : null) },
        { id: "refuse", t: "Refuse to ride", req: { teacher: "drona" },
          fx: { duty: { teacher: -4, conscience: 1 }, rep: { panchala: 2 }, flag: "refused_dakshina", memory: ["drona", "You refused to help him take Drupada."] } },
        { id: "defend", t: "Defend Panchala's border villages", req: { origin: "panchala", not: { teacher: "drona" } }, combat: "e_border" },
        { id: "warn", t: "Warn the villages", req: { not: { teacher: "drona" } },
          peril: { kind: "prison", by: "Kaurava outriders", place: "A cell below the palace, Hastinapura",
            text: "Kaurava outriders ride you down on the road. This time they tie your hands to a saddle and take you back to Hastinapura.",
            journal: "Kaurava outriders caught you warning Panchala's villages, and locked you away." },
          check: { attr: "grace", skill: "stealth", dc: 7,
            pass: { fx: { rep: { panchala: 2, common: 1, kuru: -1 }, flag: "warned_panchala" }, text: "The villages empty before the army arrives. No one there dies that day." },
            fail: { fx: { rep: { kuru: -2 }, lose: { what: "heirloom", at: "outriders" } }, text: (S) => (S.heirloomLost && S.heirloomLost.at === "outriders" ? "Kaurava outriders send you home bruised, and one of them keeps your {heirloom!}. Your name is noted." : "Kaurava outriders catch you on the road and send you home bruised. Your name is noted.") } } },
        { id: "watch", t: "Stay out of it", fx: {} }
      ],
      after: [
        "Arjuna lays Drupada captive at Drona's feet, and Drona keeps half of Panchala."
      ],
      next: "a2_vow"
    },
    {
      id: "a2_vow", act: 2, age: 19, art: "scene_vow", place: "The river ghat, at night", caption: "Lamps on the dark river",
      title: "A vow by the river",
      body: (S) => [
        S.flags.includes("left_arena") ? { memory: "Two years ago, outside the arena, you found Adhiratha alone by the chariots. He told you Karna was found as a baby, floating down this river in a basket." } : null,
        "Which vow do you swear? You may hold three."
      ],
      choices: [
        { id: "retreat", img: "vow_never_retreat", t: "Never retreat", fx: { vowTake: "never_retreat" } },
        { id: "lie", img: "vow_never_lie", t: "Never lie", fx: { vowTake: "never_lie", rep: { sages: 1 } } },
        { id: "unarmed", img: "vow_spare_unarmed", t: "Never strike the defenceless", fx: { vowTake: "spare_unarmed", rep: { sages: 1, common: 1 } } },
        { id: "karna", img: "vow_spare_karna", t: "Never fight Karna", req: { bond: ["karna", 6] }, locked: "Needs a close bond with Karna.", fx: { vowTake: "spare_karna", bond: { karna: 1 } } },
        { id: "celibate", img: "vow_celibacy", t: "Celibacy, like Bhishma", fx: { vowTake: "celibacy", attr: { wisdom: 1 } } },
        { id: "none", t: "Make no vow", fx: {} }
      ],
      next: "a3_secret"
    }
  ]);

  K.encounter({
    id: "e_spar", title: "The sparring trial", art: "scene_teacher", caption: "Blunted weapons, real bruises", lethal: false, bout: true,
    intro: "Ketan bows, then comes at you fast.",
    enemies: [K.foe("Ketan, the armourer's son", 2, { hp: 40 })],
    win: { fx: (S) => ({ skill: { [K.PATHS[S.path].skill]: 1 }, duty: { teacher: 1 }, journal: "You won the sparring trial against Ketan." }), text: "Ketan yields, grinning through a bloody nose. Your teacher nods once, which is more than most students get." },
    lose: { fx: { attr: { wisdom: 1 } }, text: "Ketan wins. Afterwards he shows you exactly what you did wrong, and you never do it again." }
  });
  K.encounter({
    id: "e_panchala", title: "The raid on Panchala", art: "scene_drupada", caption: "Drupada's palace guard", lethal: false,
    intro: "Drupada's guard forms a line in the palace yard.",
    enemies: [K.foe("Panchala guard captain", 2), K.foe("Panchala archer", 1, { abilities: ["strike", "arrows"] })],
    win: { fx: { duty: { teacher: 2 }, rep: { panchala: -3, kuru: 1 }, journal: "You rode with Drona's students and helped take King Drupada." }, text: "The yard is yours. Arjuna's chariot is already at the palace steps." },
    lose: { fx: { duty: { teacher: 1 }, rep: { panchala: -1 }, injury: "scar" }, text: "You are knocked out of your chariot and wake up after it is over. Drona's prisoner is already in chains." }
  });
  K.encounter({
    id: "e_border", title: "The border villages", art: "battle_border", caption: "Kaurava raiders on the road", lethal: false,
    intro: "A band of Kaurava raiders turns off the road toward the village granary.",
    allies: ["charu"],
    enemies: [K.foe("Kaurava raider", 2), K.foe("Kaurava raider", 1)],
    win: { fx: { rep: { panchala: 3, kuru: -1, common: 1 }, flag: "defended_panchala", journal: "You defended the Panchala border villages." }, text: "The raiders ride back to the main army. The granary stands." },
    lose: { fx: { rep: { panchala: 1 } }, text: "You are beaten back, but the villagers saw who stood in the road for them." }
  });

  // The strategist's weapon (owner, 9 Nov: "Charioteer spear, strategist choice"): the sword or the spear, each with the round
  // shield. Asked once, after the path is settled (before the trial); the charioteer always fights with the spear.
  K.scene({
    id: "a2_weapon", act: 2, age: 15, when: (S) => S.path === "strategist" && !S.weapon, skipTo: "a2_trial", next: "a2_trial",
    place: (S) => (S.teacher === "hermit" ? "Mauni's clearing" : S.teacher === "self" ? "A clearing at night" : "Your teacher's school"), art: "scene_armoury", caption: "The rack by the door",
    title: "A commander's weapon",
    body: ["A commander fights where the line needs him. What will you carry into it, with your shield?"],
    choices: [
      { id: "sword", t: "The sword", fx: { set: { weapon: "sword" } }, hint: "Quick to strike, quick to cover", text: "It sits in your hand as if it had been waiting for it." },
      { id: "spear", t: "The spear", fx: { set: { weapon: "spear" } }, hint: "The longest reach, slower to come back", text: "Longer than any blade that will come at you. You learn to keep them at its point." }
    ]
  });
  (K.BEFORE.a2_trial = K.BEFORE.a2_trial || []).push("a2_weapon");
})(window.K = window.K || {});
