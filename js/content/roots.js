/* Act I roots: two scenes in the homeland before any journey, so each life has a home to remember.
   K.ROOTS: who in the family shaped you (sets S.kin, who comes back later in the story).
   K.CUSTOMS: a festival or custom of the homeland, and how you took part. */
(function (K) {
  "use strict";
  const kin = (name, fx) => Object.assign({ set: { kin: name } }, fx);

  K.ROOTS = {
    hastinapura: {
      body: "The palace stores are a city inside the city.",
      choices: [
        { id: "grandmother", t: "Grandmother Sumitra, who knows every lord", fx: kin("Sumitra", { skill: { statecraft: 1 } }), text: "She teaches you to listen more than you speak. \"Everyone in a palace is telling you something,\" she says, \"usually by accident.\"" },
        { id: "father", t: "Your father Devaka, who counts every sack", fx: kin("Devaka", { attr: { wisdom: 1 } }), text: "He lets you keep the tally sticks. You learn that numbers tell the truth even when people do not." },
        { id: "cousin", t: "Your cousin Kirti, a gate guard", fx: kin("Kirti", { skill: { mace: 1 } }), text: "Kirti lets you hold the spear when no captain is looking, and shows you how a guard stands all night without falling asleep." }
      ]
    },
    panchala: {
      body: "Arrows dry on every roof beam of the house.",
      choices: [
        { id: "grandfather", t: "Grandfather Bhadrasena, an old archer", fx: kin("Bhadrasena", { skill: { archery: 1 } }), text: "His hands shake now, but when he puts a bow in yours he holds your elbow steady, and the arrow flies true." },
        { id: "mother", t: "Your mother Vrinda, an arrowsmith", fx: kin("Vrinda", { skill: { healing: 1 } }), text: "You learn which feathers fly and which do not, and how to bind a cut finger so it heals clean. Arrowsmiths cut themselves often." },
        { id: "aunt", t: "Your aunt Kalindi, a ferrywoman", fx: kin("Kalindi", { attr: { grace: 1 } }), text: "She takes you out in her boat and lets you steer. You learn to read the river: where it is deep, where it lies." }
      ]
    },
    matsya: {
      body: "Your family's horses graze the lake meadows.",
      choices: [
        { id: "grandmother", t: "Grandmother Sunanda, a horse healer", fx: kin("Sunanda", { skill: { healing: 1 } }), text: "She shows you how to feel a leg for heat and how to make a poultice of river clay. Horses trust her, and soon they trust you." },
        { id: "father", t: "Your father Ajaka, a horse breeder", fx: kin("Ajaka", { skill: { chariot: 1 } }), text: "He puts you on a horse before you can walk properly. By six you can harness a pair by yourself." },
        { id: "sister", t: "Your sister Tara, a racer", fx: kin("Tara", { attr: { grace: 1 } }), text: "Tara rides as if she were part of the horse. She lets you ride behind her, and tells you never to look at the ground." }
      ]
    },
    mathura: {
      body: "The house looks over the Yamuna ghats.",
      choices: [
        { id: "uncle", t: "Your uncle Satyaka, a river trader", fx: kin("Satyaka", { skill: { statecraft: 1 } }), text: "He takes you to the ghats and teaches you to bargain. \"Smile first. Then name the price.\"" },
        { id: "grandmother", t: "Grandmother Lavanya, a singer", fx: kin("Lavanya", { skill: { lore: 1 } }), text: "She knows the name of every Yadava chief for twenty generations, and a song for most of them. You learn half the songs by heart." },
        { id: "cousin", t: "Your cousin Megha, a swimmer", fx: kin("Megha", { attr: { might: 1 } }), text: "Megha teaches you to swim against the current, and to let the river carry you when it is stronger than you." }
      ]
    },
    anga: {
      body: "Your family has served in the Anga guard for four generations.",
      choices: [
        { id: "father", t: "Your father Virasena, a captain of the guard", fx: kin("Virasena", { skill: { mace: 1 } }), text: "He drills you every morning with a stick for a mace. \"A guard needs to still be standing.\"" },
        { id: "grandmother", t: "Grandmother Champavati, of the river shrine", fx: kin("Champavati", { attr: { wisdom: 1 } }), text: "She lights the lamps at dusk and lets you help. She says the river has seen every king of Anga come and go, and will see the next ones too." },
        { id: "uncle", t: "Your uncle Hastika, a mahout", fx: kin("Hastika", { skill: { chariot: 1 } }), text: "Megharaja lets you sit on her neck, and Hastika teaches you the words an elephant answers to." }
      ]
    },
    suta: {
      body: "Your family drives the chariots of kings and sings their stories.",
      choices: [
        { id: "father", t: "Your father Dhruva, a charioteer", fx: kin("Dhruva", { skill: { chariot: 1 } }), text: "He lets you walk the horses after a drive, and tells you a good charioteer is the calmest person on any battlefield." },
        { id: "grandmother", t: "Grandmother Saumya, a bard", fx: kin("Saumya", { skill: { lore: 1 } }), text: "She teaches you the first verses of the great stories, and how to watch a king's face while you sing, so you know when to stop." },
        { id: "brother", t: "Your brother Rathin, a wheelwright", fx: kin("Rathin", { attr: { might: 1 } }), text: "You hold the wheel while Rathin hammers. Your arms ache every night, and grow strong." }
      ]
    },
    nishada: {
      body: "Your village lives between the river and the deep forest.",
      choices: [
        { id: "grandmother", t: "Grandmother Malati, who knows the healing roots", fx: kin("Malati", { skill: { healing: 1 } }), text: "She takes you into the forest at dawn and names every plant. Some heal, some kill, and a few do both, depending on the dose." },
        { id: "father", t: "Your father Sharabha, a tracker", fx: kin("Sharabha", { skill: { stealth: 1 } }), text: "He shows you how to read a broken twig, a bent blade of grass, a bird that stops singing. The forest is always talking, he says." },
        { id: "uncle", t: "Your uncle Nadija, a fisherman", fx: kin("Nadija", { attr: { grace: 1 } }), text: "You learn to stand still in cold water for an hour, and to strike faster than a fish can turn." }
      ]
    },
    gandhara: {
      body: "Caravans from the far west pass your mountain town all summer.",
      choices: [
        { id: "grandfather", t: "Grandfather Ashvaka, a horse tamer", fx: kin("Ashvaka", { skill: { chariot: 1 } }), text: "He tells you never to break a horse, only to persuade it. You spend a whole summer persuading one pony, and it works." },
        { id: "greataunt", t: "Your great-aunt Pushkala, a singer", fx: kin("Pushkala", { skill: { lore: 1 } }), text: "From her songs you learn that every people has a story about a great war, and that the stories are always sad." },
        { id: "mother", t: "Your mother Uttama, a weaver", fx: kin("Uttama", { attr: { wisdom: 1 } }), text: "She teaches you patience, one thread at a time. A whole shawl, she says, is only a thousand small decisions." }
      ]
    }
  };

  // Record which relative was chosen (grandmother, mother, cousin...), so later lines fit their age:
  // a grandparent will not still be alive when you are forty-five.
  Object.values(K.ROOTS).forEach((r) => r.choices.forEach((c) => { c.fx.set.kinRole = c.id; }));
  K.kinElder = (S) => ["grandmother", "grandfather", "greataunt"].includes(S.kinRole);

  K.CUSTOMS = {
    hastinapura: {
      title: "The king's procession", art: "custom_hastinapura",
      body: "Once a year blind King Dhritarashtra rides through the city on an elephant.",
      choices: [
        { id: "front", t: "Push to the front", fx: { attr: { might: 1 }, flag: "saw_procession" }, text: "An elephant looks right at you as it passes. Years later you can still see its eye." },
        { id: "kitchens", t: "Sneak into the palace kitchens", fx: { skill: { stealth: 1 } }, text: "Nobody stops you. You come home with sweets in both fists and the knowledge that a palace has many back doors." },
        { id: "names", t: "Learn the lords' names", fx: { skill: { statecraft: 1 }, rep: { kuru: 1 } }, text: "By the end of the day you know thirty lords by their banners. Three of them, it turns out, owe your family money." }
      ]
    },
    panchala: {
      title: "The children's games at Kampilya", art: "custom_panchala",
      body: "At King Drupada's spring archery games, the children shoot at a straw deer.",
      choices: [
        { id: "shoot", t: "Enter the children's contest", check: { attr: "aim", skill: "archery", dc: 6,
          pass: { fx: { skill: { archery: 1 }, rep: { panchala: 1 }, flag: "won_kampilya" }, text: "Your arrow takes the straw deer through the neck. A royal servant gives you a wooden bow painted red." },
          fail: { fx: {}, text: "Your arrow goes into the river, and the crowd laughs kindly. You practise every day for the rest of the year." } } },
        { id: "stall", t: "Help at the arrow stall", fx: { duty: { family: 1 }, skill: { statecraft: 1 } }, text: "You sell more arrows than your mother expected. Archers like to buy from a child who knows what the fletching is for." },
        { id: "veterans", t: "Listen to the old soldiers", fx: { skill: { lore: 1 } }, text: "They argue about Bhishma, and about a poor brahmin called Drona who studied beside King Drupada as a boy." }
      ]
    },
    matsya: {
      title: "The cattle festival", art: "custom_matsya",
      body: "At the cattle festival, the children race the calves.",
      choices: [
        { id: "race", t: "Run a calf in the race", check: { attr: "grace", skill: "chariot", dc: 6,
          pass: { fx: { attr: { grace: 1 }, rep: { common: 1 }, flag: "won_calf_race" }, text: "Your calf wins by a nose. A royal steward comes over to look at it, and asks your father who trained it." },
          fail: { fx: {}, text: "Your calf stops halfway to eat a garland, and everyone remembers it for years." } } },
        { id: "lame", t: "Help with a lame calf", fx: { skill: { healing: 1 }, duty: { conscience: 1 } }, text: "By the evening the calf is standing. Your grandmother says nothing, but she lets you carry her bag home." },
        { id: "song", t: "Lead the herding song", fx: { skill: { lore: 1 }, rep: { common: 1 } }, text: "Your voice cracks on the high part. The cattle come home anyway, and the old herders nod at you." }
      ]
    },
    mathura: {
      title: "Lamps on the Yamuna", art: "custom_mathura",
      body: "On Kartika's full moon, Mathura sets lamp-boats on the Yamuna for those who went away.",
      choices: [
        { id: "reef", t: "Swim to the sandbank", check: { attr: "might", skill: "stealth", dc: 6,
          pass: { fx: { attr: { might: 1 }, flag: "swam_the_reef" }, text: "You touch the sandbank and swim back with the lamps all around you, like stars on the water." },
          fail: { fx: { duty: { family: 1 } }, text: "The current turns you back. Your cousin pulls you out by the hair, and your mother does not let go of you all night." } } },
        { id: "traders", t: "Wander the traders' stalls", fx: { skill: { statecraft: 1 }, rep: { yadava: 1 } }, text: "A trader from the far west lets you hold a glass bead the colour of the river at dusk. You trade a song for it." },
        { id: "boat", t: "Make the family's boat", fx: { duty: { family: 1 }, attr: { wisdom: 1 } }, text: "You name your grandfather, whom you never met, and every boat your uncle has ever taken down the river. The little boat goes a long way." }
      ]
    },
    anga: {
      title: "The elephant day at Champa", art: "custom_anga",
      body: "Once a year Anga's painted elephants walk through Champa to the river.",
      choices: [
        { id: "ride", t: "Ride your uncle's elephant", fx: { skill: { chariot: 1 }, flag: "rode_elephant" }, text: "From up there the whole city looks small. You do not feel small." },
        { id: "flowers", t: "Carry flowers to the shrine", fx: { rep: { sages: 1 }, duty: { conscience: 1 } }, text: "She lets you set the first lamp on the water. It does not go out, which she says is a good sign." },
        { id: "wrestle", t: "Wrestle the guards' children", fx: { skill: { mace: 1 } }, text: "You lose twice and win once. The one you beat becomes your friend for the summer." }
      ]
    },
    suta: {
      title: "Blessing the horses", art: "custom_suta",
      body: "On the charioteers' feast day, the king's horses are washed and blessed.",
      choices: [
        { id: "groom", t: "Groom the king's horses", fx: { skill: { chariot: 1 } }, text: "The stablemaster inspects your work, says nothing, and gives you the hardest horse next year. That is praise." },
        { id: "bards", t: "Listen to the bards", fx: { skill: { lore: 1 } }, text: "They sing of charioteers who turned battles, whom no one else remembers. You decide someone should." },
        { id: "race", t: "Race a borrowed cart", check: { attr: "grace", skill: "chariot", dc: 6,
          pass: { fx: { attr: { grace: 1 }, flag: "won_cart_race" }, text: "You win, and nearly tip over on the last turn. Your father pretends to be angry." },
          fail: { fx: {}, text: "The cart loses a wheel. You walk it back, carrying the wheel, while everyone cheers." } } }
      ]
    },
    nishada: {
      title: "The first hunt", art: "custom_nishada",
      body: "At seven, you go with the hunters for the first time.",
      choices: [
        { id: "track", t: "Find the deer's trail first", fx: { skill: { stealth: 1 }, flag: "first_trail" }, text: "You see the bent grass first. The hunters let you lead for an hour, and the whole village hears about it." },
        { id: "fawn", t: "Free a snared fawn", fx: { duty: { conscience: 1 }, rep: { sages: 1 } }, text: "It runs off without looking back. Your father sees, and says nothing, and that evening gives you the best piece of the meal." },
        { id: "offering", t: "Make the river offering", fx: { attr: { wisdom: 1 } }, text: "You learn the words that are said before a hunt and after it, asking forgiveness for what is taken. You never forget them." }
      ]
    },
    gandhara: {
      title: "The horse fair in the high valley", art: "custom_gandhara",
      body: "At the summer horse fair, caravans from the west stop to trade.",
      choices: [
        { id: "pony", t: "Race a mountain pony", check: { attr: "grace", skill: "chariot", dc: 6,
          pass: { fx: { attr: { grace: 1 }, flag: "won_pony_race" }, text: "Your pony knows the way better than you do, and you let it. You win by a length." },
          fail: { fx: {}, text: "The pony stops dead at the river and you go over its head. You get up, laughing, and ride it across." } } },
        { id: "caravan", t: "Trade with the caravans", fx: { skill: { statecraft: 1 } }, text: "You come away with a silver coin with a stranger's face on it, and a few words of a language no one at home speaks." },
        { id: "songs", t: "Sit with your singing great-aunt", fx: { skill: { lore: 1 }, attr: { wisdom: 1 } }, text: "A traveller gives her a ring for her song, and she gives it to you. \"Songs are worth more than rings.\"" }
      ]
    }
  };

  K.scenes([
    {
      id: "a1_roots", act: 1, age: 6, art: (S) => "roots_" + S.origin, place: (S) => K.childPlace(S), caption: (S) => K.ORIGINS[S.origin].region,
      title: "The people you came from",
      body: (S) => [K.ROOTS[S.origin].body, "Who shaped you most?"],
      choices: (S) => K.ROOTS[S.origin].choices,
      next: "a1_custom"
    },
    {
      id: "a1_custom", act: 1, age: 7, art: (S) => K.CUSTOMS[S.origin].art, place: (S) => K.childPlace(S),
      title: (S) => K.CUSTOMS[S.origin].title,
      body: (S) => [K.CUSTOMS[S.origin].body],
      choices: (S) => K.CUSTOMS[S.origin].choices,
      next: "a1_journey"
    }
  ]);
})(window.K = window.K || {});
