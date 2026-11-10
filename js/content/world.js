/* World data: people, vows, boons, curses, origins, teachers, paths, courts, allies, glossary.
   Plain data. Prose is a working draft after the public-domain Ganguli translation (PRD §4.4). */
(function (K) {
  "use strict";
  K.FIRST_SCENE = "a0_dream"; // the prologue at Kurukshetra, then the childhood (content/act1.js)
  K.ACT_TITLES = { 1: "Act I · Childhood", 2: "Act II · Training", 3: "Act III · Young adult", 4: "Act IV · The fracture", 5: "Act V · The exile years", 6: "Act VI · The war", 7: "Act VII · Aftermath" };
  // One line under each act's name on its opening card.
  K.ACT_LINES = {
    1: "You are born into a story the epic already knows. Your part in it is not yet written.",
    2: "The great teachers choose their students. What you learn now, you will carry to the war.",
    3: "The princes grow up, and their quarrel grows with them.",
    4: "One game of dice breaks a family in two.",
    5: "Thirteen years in the forest and in hiding. Everyone must choose a side.",
    6: "Eighteen days on the field of Kurukshetra.",
    7: "The war is over. Someone must tell what happened.",
  };

  const canon = (name) => ({ name, canon: true });
  const orig = (name) => ({ name, canon: false });
  Object.assign(K.PEOPLE, {
    karna: canon("Karna"), arjuna: canon("Arjuna"), bhima: canon("Bhima"), yudhishthira: canon("Yudhishthira"),
    duryodhana: canon("Duryodhana"), dushasana: canon("Dushasana"), drona: canon("Drona"), kripa: canon("Kripa"),
    vidura: canon("Vidura"), bhishma: canon("Bhishma"), draupadi: canon("Draupadi"), abhimanyu: canon("Abhimanyu"),
    ashwatthama: canon("Ashwatthama"), balarama: canon("Balarama"), shakuni: canon("Shakuni"), uttara: canon("Prince Uttara"), vikarna: canon("Vikarna"),
    charu: orig("Charu"), mauni: orig("Mauni the hermit"), vasu: orig("Vasu"), madhavi: orig("Madhavi"), revat: orig("Revat"),
    bhadra: orig("Bhadra"), sudatta: orig("Sudatta the moneylender"), ugra: orig("Ugra"), krishna: canon("Krishna")
  });

  // A vow (PRD §18.12): a gift while it is kept, people who share its value and watch you keep it
  // (watchers: people's bonds, or a group: company, sages, common), and a price when it is broken.
  // All three are shown when you swear it and on any choice that would break it.
  Object.assign(K.VOWS, {
    never_retreat: { name: "Never to retreat", gift: "+1 attack in every fight. You cannot withdraw from a battle without breaking it.",
      keep: "+1 attack in every fight.", watchers: ["bhima", "karna", "company"],
      price: "Bhima, Karna and your company turn from you.", priceShort: "your company will be shaken" },
    never_lie: { name: "Never to speak a lie", gift: "Every court trusts your word.",
      keep: "Once an act, a court takes your word.", watchers: ["yudhishthira", "vidura", "sages"],
      price: "Yudhishthira and Vidura turn from you; your wheel will stick once.", priceShort: "your chariot wheel will stick at the worst moment" },
    spare_karna: { name: "Never to strike Karna", gift: "Karna trusts you completely. You may never fight him.",
      keep: "Karna answers your call.", watchers: ["karna"],
      price: "Karna's friendship ends at once.", priceShort: "Karna's friendship ends at once" },
    spare_unarmed: { name: "Never to strike the unarmed", gift: "Sages and common people honour you for it.",
      keep: "Spared foes may repay you.", watchers: ["arjuna", "charu", "common"],
      price: "Arjuna and Charu turn from you.", priceShort: "a weapon given on this condition is lost" },
    celibacy: { name: "A vow of celibacy", gift: "+1 Wisdom. You may not marry.",
      keep: "+1 Wisdom; Bhishma's blessing.", watchers: ["bhishma"],
      price: "Bhishma withholds his blessing.", priceShort: "Bhishma will withhold his blessing" },
    vengeance: { name: "A vow of vengeance", gift: "You will not rest until the wrong is answered.",
      keep: "+1 attack against the one you swore against.", watchers: [],
      price: "Left unanswered at the end of your life, it darkens how your story is told.", priceShort: "" }
  });
  // Who your vow of vengeance is sworn against (by the flag set when you swore it).
  K.VENGEANCE = { vengeance_dice: ["dushasana", "duryodhana", "shakuni"], vengeance_ashwatthama: ["ashwatthama"] };
  K.WATCHER_GROUPS = { company: "your company", sages: "the sages", common: "the common people" };
  // A divine weapon comes with a condition, named by the one who gives it. A teacher takes the weapon
  // back at once if it is broken; a weapon won by penance stays, but its mantra fails at the worst hour.
  // tag: the choice tag (or "name": telling who taught you) that breaks it.
  K.ASTRA_GIVERS = {
    drona: { who: "Drona", cond: "Never against someone who cannot fight back.", tag: "strike_unarmed", takes: true },
    kripa: { who: "Kripa", cond: "Never lie to me, or before the court.", tag: "lie", takes: true },
    mauni: { who: "Mauni", cond: "Never say who taught you.", tag: "name", takes: true },
    penance: { who: "the voice in the fire", cond: "Never against someone who cannot fight back.", tag: "strike_unarmed", takes: false }
  };
  // The last words of a friend who walks away (the friendship falls below 3, or a vow it shared is broken).
  K.FAREWELLS = {
    arjuna: "\"I taught you to aim at what matters,\" Arjuna says. \"I see now that we were aiming at different things.\"",
    bhima: "Bhima does not shout, which is worse. \"Go on, then,\" he says. \"I will not throw you in the river again.\"",
    duryodhana: "\"I gave you my friendship when no one else would,\" Duryodhana says. \"I will not offer it twice.\"",
    karna: "Karna looks at you for a long moment. \"Everyone I have trusted has had a reason to leave,\" he says. \"I did not think you would find one.\"",
    charu: "Charu puts the hammer down. \"We were ten,\" Charu says. \"I thought that meant something to you too.\""
  };
  Object.assign(K.BOONS, {
    astra: { name: "The Indrastra", text: "Indra's weapon, his thunder: it falls on every ordinary foe. Three uses in a life, once a battle. Turning it on someone who cannot fight back brings a curse." },
    foresight: { name: "Foresight", text: "A sage's blessing: you sense danger a moment before it comes." },
    healing_hands: { name: "Healing hands", text: "An ashram's teaching. You never run short of healing herbs before a battle." }
  });
  Object.assign(K.CURSES, {
    hermit: { name: "The hermit's curse", text: "You broke a promise to your teacher. At the worst hour, your skill will fail you.", fireText: "At the worst hour, the hermit's words come true. Your hands will not obey you." },
    sage: { name: "A sage's curse", text: "You mocked a sage. The curse is waiting.", fireText: "In the thick of the fighting, the sage's curse falls on you and your strength drains away." },
    astra_misuse: { name: "Curse of the misused astra", text: "You turned a divine weapon on the helpless.", fireText: "The weapon you misused grows heavy in your hands. It will not answer you cleanly again." },
    astra_condition: { name: "The broken condition", text: "You broke the condition the divine weapon was given on.", fireText: "You speak the mantra, and nothing answers. The condition you broke has found you." },
    wheel: { name: "The broken word", text: "You swore never to lie, and lied. Once, at the worst moment, the earth will hold your wheel.", fireText: "Your chariot wheel sinks into the earth, as Yudhishthira's did after his half-truth. For a breath you cannot move." }
  });
  Object.assign(K.INJURIES, {
    eye: { name: "Lost an eye", text: "You see the world from one side now.", attrs: { aim: -1 } },
    arm: { name: "A ruined arm", text: "Your sword arm never fully healed.", attrs: { might: -1 } },
    leg: { name: "A lame leg", text: "You walk with a limp.", attrs: { grace: -1 } },
    scar: { name: "Battle scars", text: "Scars that never fade.", attrs: {} }
  });

  K.ORIGINS = {
    hastinapura: { name: "Hastinapura", blurb: "Child of a palace official, raised beside the Kuru princes", detail: "Seat of the Kuru dynasty. You grow up close to the throne, among old families, soldiers and constant intrigue. You are always being watched.", region: "The Kuru heartland, on the upper Ganga", context: ["A city of palaces, granaries and old dynasties on the banks of the Ganga, ruled by the blind king Dhritarashtra on behalf of the Kuru line. The princes, Pandavas and Kauravas alike, grow up within its walls.", "Born here, you stand closest to every great event of the epic: the tournament, the dice game, the councils of war. Loyalty to the throne comes easily. Standing apart from it does not."], fx: { duty: { court: 3 }, rep: { kuru: 2 }, skill: { statecraft: 1 }, attr: { command: 1 } } },
    panchala: { name: "Panchala", blurb: "Drupada's kingdom, Drona's old rival", detail: "A kingdom of archers and scholars that prizes skill over birth. Its king, Drupada, once humiliated his boyhood friend Drona, and Drona has not forgotten.", region: "Between the Ganga and the Yamuna, south of the Kurus", context: ["A rich and learned kingdom of archers, scholars and fire-priests, with its capital at Kampilya. King Drupada's court values what you can do over who your father was.", "Drona will train the Kuru princes to take Drupada prisoner, so a child of Panchala begins with a grudge on one side and a welcome on the other. Draupadi, born from Drupada's sacrificial fire, will one day be your princess."], fx: { skill: { archery: 1 }, rep: { panchala: 3, kuru: -1 }, attr: { wisdom: 1 } } },
    matsya: { name: "Matsya", blurb: "King Virata's quiet land", detail: "Fields, lakes and horses under a gentle king. A small kingdom, often caught between larger ones. One day the Pandavas will hide here.", region: "West of the Yamuna, a land of lakes and pastures", context: ["A small, gentle kingdom of cattle herders, horse breeders and lake fishers, ruled by King Virata from his capital at Viratanagara.", "Greater powers rarely look this way, which is why the Pandavas will choose it for their year in hiding. Children here grow up among horses, and many become fine charioteers."], fx: { skill: { chariot: 1 }, duty: { family: 2 }, rep: { common: 1 }, attr: { grace: 1 } } },
    mathura: { name: "Mathura", blurb: "City of the Yadavas, on the Yamuna", detail: "An old city of cowherds, traders and singers on the Yamuna. The Yadavas are clever and proud, and when war comes they will fight on both sides.", region: "On the Yamuna, south of the Kuru lands", context: ["An old city of the Yadava clans on the Yamuna, of cowherds, traders and singers. When you are born it lives in fear of its own king, Kamsa, who has thrown his father Ugrasena into prison.", "The Yadavas are kin to both sides of the coming war. Born here, you learn diplomacy early. One day your people will leave Mathura for a new city by the western sea, Dwaraka, and when the armies gather your clan will be divided."], fx: { skill: { statecraft: 1 }, rep: { yadava: 3 }, item: { herbs: 1 }, attr: { command: 1 } } },
    anga: { name: "Anga", blurb: "Karna's kingdom, gifted by Duryodhana", detail: "A wealthy kingdom on the Champa river, known for loyal people and skilled warriors. Here merit can rise above birth.", region: "The far east of the Ganga plain, on the Champa river", context: ["A prosperous eastern kingdom of rice fields, river ports and elephant forests, with its capital at Champa.", "Duryodhana gives Anga to Karna, the charioteer's son, to make him a king. Its people love Karna for it, and here a person is judged more by deeds than by birth."], fx: { bond: { karna: 1 }, duty: { court: 1 }, skill: { mace: 1 }, attr: { might: 1 } } },
    suta: { name: "Charioteer family", land: "Champa", blurb: "Raised among the sutas, like Karna", detail: "You grow up among horses, wheels and warriors, close to great men and never counted among them. Karna's foster father Adhiratha lives in your lane.", region: "The charioteers' lane in Champa, capital of Anga", context: ["The sutas drive the chariots, tend the horses and sing the deeds of kings. They stand beside every great warrior in battle, yet the nobles never treat them as equals.", "You grow up in Champa, in the same lane as the old charioteer Adhiratha, who found a baby floating in a basket and raised him as Karna. When Adhiratha's household is called to Hastinapura, your family will go with it. Doors will close because of your birth, and you will learn to open them anyway."], fx: { skill: { chariot: 2 }, bond: { karna: 2 }, rep: { kuru: -1, common: 2 } } },
    nishada: { name: "Nishada village", blurb: "Forest people outside the city order", detail: "A village of hunters and fishers between the river and the deep forest. You know the land better than any prince, and the cities look down on you.", region: "The forests between the river and the hills", context: ["Hunters, fishers and forest guides who live outside the cities' order and the rules of caste. They know every path, plant and animal of the deep forest.", "Ekalavya, the Nishada prince who taught himself archery, comes from people like yours. The cities look down on you, but in the forest no prince can match you."], fx: { skill: { archery: 1, stealth: 1 }, rep: { kuru: -2, common: 2 }, duty: { family: 2 } } },
    gandhara: { name: "Gandhara", blurb: "Shakuni's distant homeland", detail: "A crossroads kingdom in the far northwest, where many peoples meet. At the Kuru court you will always be a foreigner, and Shakuni will always assume you are his.", region: "The far northwest, beyond the Indus", context: ["A mountain kingdom on the great trade roads, where many peoples, languages and gods meet. Queen Gandhari and her brother Shakuni came from here to Hastinapura.", "At the Kuru court you will always be a foreigner. Shakuni will take you for one of his own, and others will wonder whose side you are really on."], fx: { skill: { lore: 1 }, rep: { kuru: -1 }, attr: { wisdom: 1 } } }
  };
  K.TEMPERAMENTS = {
    bold: { name: "Bold", short: "+ Might", fx: { attr: { might: 1 } } },
    thoughtful: { name: "Thoughtful", short: "+ Wisdom", fx: { attr: { wisdom: 1 } } },
    devoted: { name: "Devoted", short: "+ Family duty", fx: { duty: { family: 2 }, item: { herbs: 1 } } },
    cunning: { name: "Cunning", short: "+ Grace, Stealth", fx: { attr: { grace: 1 }, skill: { stealth: 1 } } }
  };
  K.HEIRLOOMS = {
    bow: { name: "A worn bow", thing: "old bow", short: "+ Archery", fx: { skill: { archery: 1 } } },
    manuscript: { name: "A palm-leaf manuscript", thing: "palm-leaf manuscript", short: "+ Lore", fx: { skill: { lore: 1 } } },
    amulet: { name: "An amulet", thing: "amulet", short: "Turns one killing blow", fx: { flag: "amulet_whole" } },
    debt: { name: "A family debt", short: "+ Family duty", fx: { duty: { family: 2 }, flag: "debt_owed" } }
  };

  K.TEACHERS = {
    drona: { name: "Drona, teacher of the princes", short: "Drona" },
    kripa: { name: "Kripa, preceptor of the Kuru house", short: "Kripa" },
    balarama: { name: "Balarama of the Yadavas", short: "Balarama" },
    hermit: { name: "Mauni, a hermit of the forest", short: "Mauni" },
    vidura: { name: "Vidura and his circle", short: "Vidura" },
    self: { name: "No one. You taught yourself", short: "no one" }
  };
  K.PATHS = {
    archer: { name: "Archer", skill: "archery", stat: "aim", abilities: ["aimed", "volley", "pin"], desc: "The master bowman: ranged damage, and the weapon of Arjuna, Karna and Drona." },
    mace: { name: "Mace fighter", skill: "mace", stat: "might", abilities: ["crush", "roar", "quake"], desc: "Raw strength. You stand in front and take the blows meant for others." },
    charioteer: { name: "Charioteer", skill: "chariot", stat: "grace", abilities: ["swerve", "ridedown", "rally"], desc: "The driver who sees the whole field. Speed, evasion and nerve." },
    strategist: { name: "Strategist", skill: "statecraft", stat: "command", abilities: ["command", "expose", "formation"], desc: "Advisor and commander. You make others stronger and find the gap in any line." },
    healer: { name: "Healer", skill: "healing", stat: "wisdom", abilities: ["salve", "steady", "nerve"], desc: "A vaidya, saving lives in a war of death." },
    spy: { name: "Spy and envoy", skill: "stealth", stat: "grace", abilities: ["feint", "vanish", "hamstring"], desc: "A duta who reads people, carries secrets and is never where the arrow lands." },
    bard: { name: "Bard", skill: "lore", stat: "wisdom", abilities: ["song", "verse", "hymn"], desc: "A suta storyteller. You keep the line standing, and you will tell what happened." }
  };
  K.COURTS = {
    hastinapura: { name: "Hastinapura", king: "Dhritarashtra" },
    indraprastha: { name: "Indraprastha", king: "Yudhishthira" },
    panchala: { name: "Panchala", king: "Drupada" },
    matsya: { name: "Matsya", king: "Virata" },
    dwaraka: { name: "Dwaraka", king: "Ugrasena" },
    anga: { name: "Anga", king: "Karna" },
    gandhara: { name: "Gandhara", king: "Subala" },
    nishada: { name: "the Nishada villages", king: "the village chief" },
    none: { name: "No court", king: "no one" }
  };
  K.HOME_COURT = { hastinapura: "hastinapura", panchala: "panchala", matsya: "matsya", mathura: "dwaraka", anga: "anga", suta: "anga", nishada: "nishada", gandhara: "gandhara" };

  // Allies who can fight beside you.
  K.UNITS = {
    charu: () => ({ name: "Charu", hp: 34, atk: 7, def: 0, abilities: ["strike", "heavy"], person: "charu", armed: true }), // no armour
    vasu: (S) => ({ name: "Vasu", hp: S.age >= 34 ? 44 : 26, atk: S.age >= 34 ? 8 : 4, def: 2, abilities: ["strike", "guard"], person: "vasu" }),
    madhavi: () => ({ name: "Madhavi", hp: 34, atk: 4, def: 1, abilities: ["strike", "salve"], person: "madhavi" }),
    revat: () => ({ name: "Revat", hp: 42, atk: 7, def: 2, abilities: ["strike", "swerve"], person: "revat" }),
    bhadra: () => ({ name: "Bhadra, an old soldier", hp: 48, atk: 7, def: 3, abilities: ["strike", "guard", "heavy"], person: "bhadra" }),
    spouse: (S) => (S.spouse && !S.dead.includes(S.spouse) ? K.UNITS[S.spouse](S) : null),
    ugra: () => ({ name: "Ugra, the miller's son", hp: 46, atk: 7, def: 2, abilities: ["strike", "heavy"], person: "ugra" }),
    soldiers: () => ({ name: "Your soldiers", plural: true, hp: 50, atk: 6, def: 2, abilities: ["strike", "arrows"] }),
    // Friends who can answer a call in the war (see abilities.js "call").
    karna: () => ({ name: "Karna", hp: 220, atk: 13, def: 4, abilities: ["strike", "arrows", "heavy", "feint"], person: "karna" }), // fierce and unpredictable
    duryodhana: () => ({ name: "Duryodhana", hp: 210, atk: 12, def: 4, abilities: ["strike", "heavy", "crush"], person: "duryodhana" }),
    abhimanyu: () => ({ name: "Abhimanyu", hp: 120, atk: 11, def: 3, abilities: ["strike", "arrows", "heavy"], person: "abhimanyu" }),
    arjuna: () => ({ name: "Arjuna", hp: 220, atk: 14, def: 4, abilities: ["arrows", "aimed", "pin"], person: "arjuna" }), // strikes from range
    bhima: () => ({ name: "Bhima", hp: 260, atk: 14, def: 4, abilities: ["strike", "heavy", "roar"], person: "bhima" }), // takes the blows
    // A company of your own, for those who passed the commander's test on the eve of the war.
    company: () => ({ name: "Your company", plural: true, hp: 72, atk: 8, def: 3, abilities: ["strike", "arrows", "guard"] })
  };

  // What you did earlier in life changes your chances later: each merit adds (or takes) one point on
  // tests that use the same attribute or skill, two at most. Shown on the choice and in the character sheet.
  K.MERITS = [
    { flag: "hit_the_lamp", on: ["aim", "archery"], n: 1, text: "You hit Arjuna's swinging lamp in the dark." },
    { flag: "threw_bhima", on: ["might", "mace"], n: 1, text: "You put Bhima in the river." },
    { flag: "calmed_the_horse", on: ["grace", "chariot"], n: 1, text: "You calmed a maddened horse beside Karna." },
    { flag: "stood_your_ground", on: ["command", "statecraft"], n: 1, text: "You stood your ground in front of Duryodhana's brothers." },
    { flag: "missed_lamp_twice", on: ["archery"], n: -1, text: "You missed Arjuna's lamp twice, and he stopped offering." },
    { flag: "thrown_by_bhima_twice", on: ["mace"], n: -1, text: "Bhima threw you in the river twice, and named you \"little fish\"." },
    { flag: "horse_beat_you_twice", on: ["chariot"], n: -1, text: "The horse beat you twice, and Karna had to manage alone." },
    { flag: "backed_down_twice", on: ["statecraft"], n: -1, text: "You backed down twice in front of Duryodhana's brothers." },
    { flag: "ugra_twice", on: ["mace"], n: -1, text: "Ugra threw you out of the ring twice in one afternoon."  },
    { flag: "beat_ugra", on: ["might", "mace"], n: 1, text: "You beat Ugra in the ring at the fair." },
    { flag: "won_kampilya", on: ["aim", "archery"], n: 1, text: "You won the children's archery at Kampilya." },
    { flag: "grey_mare", on: ["chariot"], n: 1, text: "You gentled the grey mare no one else could touch." },
    { flag: "won_calf_race", on: ["grace", "chariot"], n: 1, text: "You won the calf race at the cattle festival." },
    { flag: "won_cart_race", on: ["grace", "chariot"], n: 1, text: "You won the cart race on the charioteers' feast day." },
    { flag: "won_pony_race", on: ["grace", "chariot"], n: 1, text: "You won the pony race in the high valley." },
    { flag: "led_the_cobra", on: ["stealth"], n: 1, text: "You led the cobra out of the well-house." },
    { flag: "first_trail", on: ["stealth"], n: 1, text: "You found the deer's trail on your first hunt." },
    { flag: "found_vines", on: ["stealth"], n: 1, text: "You searched the riverbank at Pramanakoti unseen." },
    { flag: "helped_tunnel", on: ["stealth"], n: 1, text: "You carried earth out of the tunnel at Varnavata unseen." },
    { flag: "swam_the_reef", on: ["might"], n: 1, text: "You swam out to the sandbank in the dark." },
    { flag: "flood_boat", on: ["might"], n: 1, text: "You rowed the low quarter out of the flood." },
    { flag: "saved_doe", on: ["healing"], n: 1, text: "You saved the wounded doe in the forest." },
    { flag: "hired_bandits", on: ["command"], n: 1, text: "You turned starving bandits into loyal workers." },
    { flag: "calmed_kings", on: ["statecraft"], n: 1, text: "You talked angry kings down at the swayamvara." },
    { flag: "beat_haridatta", on: ["wisdom"], n: 1, text: "You beat old Haridatta at dice." },
    { flag: "kept_arjuna_secret", on: ["wisdom"], n: 1, text: "You saw through Brihannala's disguise." },
    { flag: "seen_at_tunnel", on: ["stealth"], n: -1, text: "A guard saw you at Varnavata, and the court still watches you." },
    { flag: "lost_to_ugra", on: ["might"], n: 1, text: "You lost to Ugra, and learned more from it than from any win." }
  ];

  // Secrets you hold, shown in the ledger. Some can be spent at the right moment.
  K.SECRETS = [
    { when: { flag: "knows_dice_plot" }, text: "Shakuni's dice cannot lose." },
    { when: { flag: "saw_swap" }, text: "Shakuni swaps a die from his sleeve. You saw it." },
    { when: { flag: "helped_tunnel" }, text: "There is a tunnel under the house at Varnavata." },
    { when: (S) => S.flags.includes("left_arena") || S.seen.includes("a5_karna_secret"), text: "Karna is Kunti's firstborn son, the eldest Pandava." },
    { when: { flag: "kept_arjuna_secret" }, text: "The dance teacher Brihannala is Arjuna." },
    { when: { flag: "reborn" }, text: "You remember a life that was not this one." }
  ];

  K.GLOSSARY = {
    Akshauhini: "A full army division: chariots, elephants, horse and foot. Eighteen of them meet at Kurukshetra.",
    Ashram: "A forest hermitage where sages live and teach.",
    Astra: "A divine weapon, called up with a mantra. Granted only to a few, and dangerous to misuse.",
    Chakravyuha: "The spinning wheel formation Drona sets on the thirteenth day of the war.",
    Dharma: "Duty and right conduct. In this game it is not one rule but several duties that pull against each other.",
    Ghat: "Stone steps leading down to a river.",
    "Guru-dakshina": "The fee or service a student owes a teacher. A teacher may ask for it at any time.",
    Kauravas: "The hundred sons of King Dhritarashtra, led by Duryodhana.",
    Kurukshetra: "The plain where the war is fought, and the name of the war itself.",
    Nishada: "Forest peoples who live outside the cities' order. Ekalavya was a Nishada.",
    Pandavas: "The five sons of Pandu: Yudhishthira, Bhima, Arjuna, Nakula and Sahadeva.",
    Pratijna: "A solemn vow. Keeping it gives strength; breaking it marks you for life.",
    Rajasuya: "A great royal sacrifice that proclaims a king the overlord of others.",
    Sarathi: "A charioteer. A good one decides battles.",
    Suta: "A community of charioteers and bards. Karna was raised in a suta family.",
    Swayamvara: "A ceremony where a princess chooses her husband, often through a contest.",
    Vaidya: "A healer trained in the old medicine.",
    Vanaprastha: "Leaving home in later life to live in the forest.",
    Vyuha: "A battle formation. Each day of the war, the commanders set one."
  };
})(window.K = window.K || {});
