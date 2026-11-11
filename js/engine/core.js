/* Kurukshetra: A Life — engine core.
   Engine-agnostic rules for the life simulation (PRD §4 canon lock, §9 systems).
   Everything here is plain data + pure-ish functions, so it can be ported to an
   Unreal subsystem later while the content files stay as data. */
(function (K) {
  "use strict";

  K.clone = (o) => JSON.parse(JSON.stringify(o));
  K.clamp = (v, lo = 0, hi = 10) => Math.max(lo, Math.min(hi, v));

  // Swappable random source, so tests can run seeded playthroughs.
  K.rng = Math.random;
  K.seed = function (n) {
    let a = n >>> 0;
    K.rng = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  K.roll = (sides = 6) => 1 + Math.floor(K.rng() * sides);
  K.pick = (arr) => arr[Math.floor(K.rng() * arr.length)];

  // ---------- Vocabulary ----------
  K.DUTIES = { teacher: "Teacher's debt", court: "Loyalty to your king", family: "Family duty", conscience: "Conscience" };
  K.ATTRS = { might: "Might", aim: "Aim", grace: "Grace", wisdom: "Wisdom", command: "Command" };
  K.SKILLS = { archery: "Archery", mace: "Mace and wrestling", chariot: "Chariot", statecraft: "Statecraft", healing: "Healing", stealth: "Stealth", lore: "Lore and song" };
  K.FACTIONS = { kuru: "Kuru court", pandava: "Pandavas", panchala: "Panchala", yadava: "Yadavas", sages: "Sages and ashrams", common: "Common people" };
  K.MAX_VOWS = 3;
  K.PEOPLE = {};   // id -> { name, canon }   (content registers people)
  K.VOWS = {};     // id -> { name, gift, breakText }
  K.BOONS = {};    // id -> { name, text }
  K.CURSES = {};   // id -> { name, text, fireText }
  K.INJURIES = {}; // id -> { name, text, attrs: { aim: -1 } }

  // Choices carry tags; a tag breaks the matching vow automatically, so writers
  // never have to remember to code a vow break by hand.
  K.VOW_TAGS = { retreat: "never_retreat", lie: "never_lie", strike_karna: "spare_karna", strike_unarmed: "spare_unarmed", marry: "celibacy" };

  K.newLife = function () {
    return {
      v: 2, name: "", pronoun: "they", origin: null, temperament: null, heirloom: null,
      age: 6, act: 1, scene: "title",
      attrs: { might: 2, aim: 2, grace: 2, wisdom: 2, command: 1 },
      skills: { archery: 0, mace: 0, chariot: 0, statecraft: 0, healing: 0, stealth: 0, lore: 0 },
      path: null, teacher: null, court: null, side: null, spouse: null, friend: null, child: null, exile: null,
      duty: { teacher: 0, court: 3, family: 4, conscience: 5 },
      bonds: {}, rep: { kuru: 3, pandava: 3, panchala: 3, yadava: 3, sages: 3, common: 3 },
      vows: [], boons: [], curses: [], injuries: [], items: { herbs: 1 },
      flags: [], memories: [], journal: [], dead: [], seen: [], log: [],
      alive: true, storyMode: false, ending: null, deathText: null, endChoice: null,
      slots: {}, bondAct: {}, karma: null, moments: [],
      tapas: 0, astras: [], charges: {}, // spiritual merit (§18.8); named divine weapons and their givers (§18.7); magic and shields left
      record: { won: 0, lost: 0, passed: 0, failed: 0, gamesWon: 0, gamesLost: 0, last: null }
    };
  };
  K.S = K.newLife();

  // ---------- Derived values ----------
  K.attr = function (k, S = K.S) {
    let v = S.attrs[k] || 0;
    const a = S.age;
    if (k === "might" || k === "grace") { if (a < 14) v -= 1; if (a >= 45) v -= 1; if (a >= 60) v -= 1; }
    if (k === "wisdom" || k === "command") { if (a >= 30) v += 1; if (a >= 50) v += 1; }
    for (const id of S.injuries) v += (K.INJURIES[id]?.attrs?.[k] || 0);
    return Math.max(0, v);
  };
  K.activeVows = (S = K.S) => S.vows.filter((v) => !v.broken);
  // The vows that count toward the limit of three: a vow sworn for one war only (K.VOWS[id].overLimit,
  // the Samshaptakas' oath) stands beyond it.
  K.vowsHeld = (S = K.S) => K.activeVows(S).filter((v) => !(K.VOWS[v.id] || {}).overLimit).length;
  K.hasVow = (id, S = K.S) => S.vows.some((v) => v.id === id && !v.broken);
  // How long a vow has been kept: its gift grows (flow.js VOW_MERITS) after fifteen years.
  K.vowYears = (id, S = K.S) => { const v = S.vows.find((x) => x.id === id && !x.broken); return v ? S.age - (v.age || S.age) : 0; };
  K.isDead = (who, S = K.S) => S.dead.includes(who);
  // Display name of a person, in the current language.
  K.personName = (id, S = K.S) => {
    // (no spouse or friend yet: "your friend", never the bare id; the Hindi check found "friend" shown untranslated)
    if (id === "spouse") return K.tr((S.spouse && K.PEOPLE[S.spouse]?.name) || "your spouse");
    if (id === "friend") return K.tr((S.friend && K.PEOPLE[S.friend]?.name) || "your friend");
    return K.tr(K.PEOPLE[id]?.name || id);
  };

  // The people (and groups) who watch a vow kept, in the current language: "Bhima, Karna, your company".
  // living: only those still alive.
  K.watcherNames = (id, S = K.S, living) => {
    const ws = ((K.VOWS[id] || {}).watchers || []).filter((w) => !(living && S.dead.includes(w)));
    return ws.map((w) => (K.WATCHER_GROUPS && K.WATCHER_GROUPS[w] ? K.tr(K.WATCHER_GROUPS[w]) : K.personName(w, S))).join(", ");
  };

  // ---------- Text ----------
  const PRON = {
    en: {
      she: { they: "she", them: "her", their: "her", They: "She", theyre: "she is", were: "was" },
      he: { they: "he", them: "him", their: "his", They: "He", theyre: "he is", were: "was" },
      they: { they: "they", them: "them", their: "their", They: "They", theyre: "they are", were: "were" }
    },
    // Hindi text uses {g:...} forms instead; these only cover a stray English token.
    hi: {
      she: { they: "वह", them: "उसे", their: "उसका", They: "वह", theyre: "वह" },
      he: { they: "वह", them: "उसे", their: "उसका", They: "वह", theyre: "वह" },
      they: { they: "वे", them: "उन्हें", their: "उनका", They: "वे", theyre: "वे" }
    }
  };
  // Fill the life's tokens into an already-translated string (see i18n.js for the token list).
  K.fmt = function (str, S = K.S) {
    if (typeof str !== "string") return str;
    const p = (PRON[K.lang] || PRON.en)[S.pronoun] || PRON.en.they;
    return str.replace(/\{(\w+)(!?)(?::([^}]*))?\}/g, (m, key, low, arg) => {
      if (key === "g" && arg != null) {
        const forms = arg.split("|");
        return (S.pronoun === "she" ? forms[1] : S.pronoun === "they" ? forms[2] : null) ?? forms[0];
      }
      let v = null;
      if (p[key]) v = p[key];
      else if (key === "name") v = S.name || K.tr("you");
      else if (key === "origin") v = K.tr(K.ORIGINS?.[S.origin]?.land || K.ORIGINS?.[S.origin]?.name || "your homeland");
      else if (key === "heirloom") v = K.tr(K.HEIRLOOMS?.[S.heirloom]?.thing || "heirloom");
      else if (key === "teacher") v = K.tr(K.TEACHERS?.[S.teacher]?.short || "your teacher");
      else if (key === "path") v = K.tr(K.PATHS?.[S.path]?.name || "warrior");
      else if (key === "spouse") v = K.personName("spouse", S);
      else if (key === "friend") v = K.personName("friend", S);
      else if (key === "child") v = K.tr(K.PEOPLE.vasu?.name || "Vasu");
      else if (key === "king") v = K.tr(K.COURTS?.[S.court]?.king || "your king");
      if (v == null) return m;
      return low ? K.low(v) : v;
    });
  };
  // Translate, then fill the life's tokens: the one call for any story string. Content may also
  // give a pair [text, values]: the values are English names, translated here; a third element
  // true means the values are already in the current language.
  K.text = (str, params, S = K.S) => {
    if (Array.isArray(str)) return str[2] ? K.fmt(K.tr(str[0], str[1]), S) : K.entryText({ src: str[0], p: str[1] }, S);
    return K.fmt(K.tr(str, params), S);
  };
  // A stored journal line or memory, shown in the current language. Entries from older saves have
  // only the finished English text, which is looked up as it is.
  K.entryText = (e, S = K.S) => {
    if (e.src == null) return K.text(e.text, null, S);
    const p = e.p ? Object.fromEntries(Object.entries(e.p).map(([k, v]) => [k, typeof v === "string" ? K.tr(v) : v])) : null;
    return K.text(e.src, p, S);
  };

  // ---------- Conditions ----------
  const FIELDS = ["origin", "teacher", "path", "court", "side", "friend", "spouse", "child", "temperament", "heirloom", "pronoun", "exile", "endChoice"];
  // Divine weapons are earned, not collected (owner, 9 Nov): at most two in a life, the plain astra counted, and
  // never two close together: after one, the next waits K.ASTRA_GAP years (in the exile, that is the last year's
  // quests at the earliest). Every road to a weapon asks K.astraRoom (content/act5.js, content/astras.js).
  K.ASTRA_MAX = 2; K.ASTRA_GAP = 4;
  K.astraCount = (S = K.S) => ((S.boons || []).includes("astra") ? 1 : 0) + (S.astras || []).length;
  K.astraLastAge = (S = K.S) => { const ages = (S.astras || []).map((a) => a.age).concat(S.astra && S.astra.age != null ? [S.astra.age] : []).filter((n) => n != null); return ages.length ? Math.max(...ages) : null; };
  K.astraWhyNot = (S = K.S) => { if (K.astraCount(S) >= K.ASTRA_MAX) return "full"; const a = K.astraLastAge(S); return a != null && S.age - a < K.ASTRA_GAP ? "soon" : null; };
  K.astraRoom = (S = K.S) => !K.astraWhyNot(S);
  // A stronger weapon may be taken in place of a weaker one when there is no room (owner, 9 Nov): a fixed order,
  // weakest first, and only upward. The swap adds nothing, so it does not wait; the new one comes with three fresh uses.
  // The order as measured (700 lives each, the weapon held alone; fights lost in a life fall by): sleep 33%, the noose
  // 35%, the plain astra 41%, water 39% and its stun, wind 42%, fire 44%. The two that do no harm are the weakest.
  K.ASTRA_RANK = ["sammohana", "nagapasha", "astra", "varuna", "vayavya", "agneya"];
  // A weapon's name: the plain astra (the teacher's, the penance's, Mauni's) is the Indrastra (owner, 9 Nov).
  K.astraName = (id) => (id === "astra" ? "Indrastra" : (K.ASTRAS && K.ASTRAS[id] && K.ASTRAS[id].name) || id);
  K.astraHeld = (S = K.S) => ((S.boons || []).includes("astra") ? ["astra"] : []).concat((S.astras || []).map((a) => a.id));
  K.astraSwapFor = (id, S = K.S) => (K.astraWhyNot(S) ? K.astraHeld(S).filter((h) => K.ASTRA_RANK.indexOf(h) < K.ASTRA_RANK.indexOf(id)) : []);
  const TESTS = {
    all: (v, S) => v.every((x) => K.test(x, S)),
    any: (v, S) => v.some((x) => K.test(x, S)),
    not: (v, S) => !K.test(v, S),
    flag: (v, S) => [].concat(v).every((f) => S.flags.includes(f)),
    anyFlag: (v, S) => v.some((f) => S.flags.includes(f)),
    noFlag: (v, S) => [].concat(v).every((f) => !S.flags.includes(f)),
    vow: (v, S) => K.hasVow(v, S),
    noVow: (v, S) => !K.hasVow(v, S),
    vowSlot: (v, S) => (K.vowsHeld(S) < K.MAX_VOWS) === v,
    boon: (v, S) => S.boons.includes(v),
    cursed: (v, S) => S.curses.some((c) => !c.fired) === v,
    injured: (v, S) => (S.injuries.length > 0) === v,
    bond: ([k, n], S) => (S.bonds[k] ?? 0) >= n,
    bondBelow: ([k, n], S) => (S.bonds[k] ?? 0) < n,
    rep: ([k, n], S) => S.rep[k] >= n,
    duty: ([k, n], S) => S.duty[k] >= n,
    attr: ([k, n], S) => K.attr(k, S) >= n,
    skill: ([k, n], S) => (S.skills[k] || 0) >= n,
    item: ([k, n], S) => (S.items[k] || 0) >= n,
    alive: (v, S) => [].concat(v).every((w) => !S.dead.includes(w)),
    deadP: (v, S) => [].concat(v).every((w) => S.dead.includes(w)),
    has: (v, S) => S[v] != null,
    hasNot: (v, S) => S[v] == null,
    ageGte: (n, S) => S.age >= n,
    storyMode: (v, S) => S.storyMode === v,
    tapas: (n, S) => (S.tapas || 0) >= n,
    astra: (id, S) => (S.astras || []).some((a) => a.id === id),
    noAstra: (id, S) => !(S.astras || []).some((a) => a.id === id),
    astraRoom: (v, S) => K.astraRoom(S) === v,
    charge: (k, S) => !!(S.charges || {})[k]
  };
  K.test = function (c, S = K.S) {
    if (!c) return true;
    if (typeof c === "function") return !!c(S);
    if (Array.isArray(c)) return c.every((x) => K.test(x, S));
    for (const [k, v] of Object.entries(c)) {
      if (FIELDS.includes(k)) { if (![].concat(v).includes(S[k])) return false; continue; }
      if (!TESTS[k]) throw new Error("Unknown condition: " + k);
      if (!TESTS[k](v, S)) return false;
    }
    return true;
  };

  // ---------- Effects ----------
  function bump(obj, k, n, d, label, lo = 0, hi = 10, base = 0) {
    obj[k] = K.clamp((obj[k] ?? base) + n, lo, hi);
    d[label] = (d[label] || 0) + n;
  }
  K.heirloomAtRisk = (S = K.S) => !!S.heirloom && S.heirloom !== "debt" && !S.flags.includes("heirloom_lost");
  const FX = {
    duty: (o, S, d) => { for (const [k, n] of Object.entries(o)) bump(S.duty, k, n, d, "duty." + k); },
    bond: (o, S, d) => { for (const [k, n] of Object.entries(o)) { bump(S.bonds, k, n, d, "bond." + k, 0, 10, 3); if (n > 0) (S.bondAct = S.bondAct || {})[k] = S.act; } },
    setBond: (o, S) => { for (const [k, n] of Object.entries(o)) { S.bonds[k] = n; (S.bondAct = S.bondAct || {})[k] = S.act; } },
    rep: (o, S, d) => { for (const [k, n] of Object.entries(o)) bump(S.rep, k, n, d, "rep." + k); },
    attr: (o, S, d) => { for (const [k, n] of Object.entries(o)) bump(S.attrs, k, n, d, "attr." + k, 0, 8); },
    skill: (o, S, d) => { for (const [k, n] of Object.entries(o)) bump(S.skills, k, n, d, "skill." + k, 0, 6); },
    item: (o, S, d) => { for (const [k, n] of Object.entries(o)) { S.items[k] = Math.max(0, (S.items[k] || 0) + n); d["item." + k] = n; } },
    flag: (v, S) => { for (const f of [].concat(v)) if (!S.flags.includes(f)) S.flags.push(f); },
    // A risk that went wrong: lose the family heirloom (the puppet shows it gone, and someone else
    // may turn up wearing it), a bundle of herbs, or coins. { lose: "heirloom", at: "bandits" }
    lose: (v, S, d) => {
      const what = typeof v === "string" ? v : v.what;
      if (what === "heirloom") {
        if (!K.heirloomAtRisk(S)) return;
        S.flags.push("heirloom_lost");
        S.flags = S.flags.filter((f) => f !== "amulet_whole");
        const back = { bow: { archery: -1 }, manuscript: { lore: -1 } }[S.heirloom];
        if (back) FX.skill(back, S, d);
        S.heirloomLost = { act: S.act, at: (typeof v === "object" && v.at) || null };
        d.heirloomLost = S.heirloom;
        FX.journal({ src: "You lost your family's heirloom: {h!}.", p: { h: K.HEIRLOOMS[S.heirloom].name } }, S);
      } else FX.item({ [what]: -1 }, S, d);
    },
    unflag: (v, S) => { S.flags = S.flags.filter((f) => ![].concat(v).includes(f)); },
    // Memories and journal lines keep their English source (src, p) so they can be shown in any
    // language later; text is the English as written, for old saves and the save code.
    memory: ([who, text], S) => { S.memories.push({ who, src: text, text: K.fmt(text, S), age: S.age }); },
    journal: (t, S) => {
      if (typeof t === "function") t = t(S);
      const e = typeof t === "object" && t ? t : { src: t };
      // The same line twice in one life is a repeat (a path chosen again, a scene played again): write it once.
      const text = K.fmt(K.fill(e.src, e.p), S);
      if (S.journal.some((j) => j.text === text)) return;
      S.journal.push({ age: S.age, act: S.act, src: e.src, p: e.p || null, text: K.fmt(K.fill(e.src, e.p), S) });
    },
    set: (o, S) => { Object.assign(S, o); },
    keepsake: (id, S, d) => { S.keepsakes = S.keepsakes || []; if (!S.keepsakes.includes(id)) { S.keepsakes.push(id); if (d) d.keepsake = id; } },
    vowTake: (id, S, d) => {
      // A vow can be sworn again once the earlier one was released (fulfilled), never while it stands or after it was broken.
      if ((K.vowsHeld(S) >= K.MAX_VOWS && !(K.VOWS[id] || {}).overLimit) || S.vows.some((v) => v.id === id && !v.released)) return;
      S.vows.push({ id, broken: false, age: S.age }); d.vowTaken = id;
      FX.journal({ src: "You swore a vow: {vow!}.", p: { vow: K.VOWS[id].name } }, S);
    },
    vowBreak: (id, S, d) => {
      const v = S.vows.find((x) => x.id === id && !x.broken);
      if (!v) return;
      v.broken = true; v.brokenAge = S.age; d.vowBroken = id;
      FX.flag("broke_" + id, S);
      S.rep.common = K.clamp(S.rep.common - 1); S.duty.conscience = K.clamp(S.duty.conscience - 1);
      FX.journal({ src: "You broke your vow: {vow!}.", p: { vow: K.VOWS[id].name } }, S);
      if (S.tapas) { S.tapas = Math.floor(S.tapas / 2); d.tapas = -S.tapas; } // half the merit of a life goes with a broken vow
      // The price (world.js K.VOWS): the people who shared the vow's value turn from you...
      for (const w of K.VOWS[id].watchers || []) {
        if (K.WATCHER_GROUPS && K.WATCHER_GROUPS[w]) { if (w === "sages" || w === "common") S.rep[w] = K.clamp(S.rep[w] - 2); continue; }
        if (!S.dead.includes(w)) bump(S.bonds, w, -3, d, "bond." + w, 0, 10, 3);
      }
      // ...and each vow has its own cost.
      if (id === "never_retreat") FX.flag("company_shaken", S);
      if (id === "never_lie") FX.curse("wheel", S, d);
      if (id === "celibacy") { bump(S.attrs, "wisdom", -1, d, "attr.wisdom", 0, 8); FX.flag("no_blessing", S); }
      if (id === "spare_karna") {
        S.bonds.karna = 0; d["bond.karna"] = -10;
        if (S.friend !== "karna") FX.journal({ src: K.FAREWELLS.karna }, S); // a friend's farewell is written when the friendship ends
      }
    },
    // A divine weapon given on a condition (K.ASTRA_GIVERS): who gave it, and so what breaking it costs.
    astraFrom: (who, S) => { S.astra = { from: who === "teacher" ? S.teacher : who, act: S.act, age: S.age }; },
    // Breaking the condition: a teacher takes the weapon back; the fire's gift stays, but will fail.
    astraBreak: (v, S, d) => {
      // A named weapon (v = its id): its giver takes it back, or its mantra will fail.
      const named = typeof v === "string" && (S.astras || []).find((a) => a.id === v && !a.broken);
      if (named) {
        const gg = K.ASTRA_GIVERS[named.from] || {};
        named.broken = true; d.astraBroken = named.from;
        if (gg.takes !== false) { S.astras = S.astras.filter((a) => a !== named); FX.journal({ src: "{who} took back the {name}. You had broken the one condition it was given on.", p: { who: gg.who || "The giver", name: K.ASTRAS[v].name } }, S); }
        else { FX.curse("astra_condition", S, d); FX.journal({ src: "You broke the condition the {name} was given on. Its mantra will fail you at the worst hour.", p: { name: K.ASTRAS[v].name } }, S); }
        return;
      }
      const g = S.astra && K.ASTRA_GIVERS[S.astra.from];
      if (!g || S.astra.broken || !S.boons.includes("astra")) return;
      S.astra.broken = true; d.astraBroken = S.astra.from;
      if (g.takes) {
        S.boons = S.boons.filter((b) => b !== "astra");
        FX.journal({ src: "{who} took back the divine weapon. You had broken the one condition it was given on.", p: { who: g.who } }, S);
      } else {
        FX.curse("astra_condition", S, d);
        FX.journal({ src: "You broke the condition your divine weapon was given on. Its mantra will fail you at the worst hour." }, S);
      }
    },
    // One heavy penance in a life lifts a broken vow's shame: the cost of the price, not the gift.
    penance: (id, S, d) => {
      const v = S.vows.find((x) => x.id === id && x.broken && !x.released);
      if (!v || S.penanceDone) return;
      S.penanceDone = id; v.atoned = true; d.penance = id;
      S.flags = S.flags.filter((f) => f !== "company_shaken" && f !== "no_blessing");
      S.curses = S.curses.filter((c) => c.id !== "wheel" || c.fired);
      for (const w of K.VOWS[id].watchers || []) if (!(K.WATCHER_GROUPS && K.WATCHER_GROUPS[w]) && !S.dead.includes(w)) bump(S.bonds, w, 2, d, "bond." + w, 0, 10, 3);
      bump(S.duty, "conscience", 2, d, "duty.conscience");
      FX.journal({ src: "Your penance is done. The shame of the broken vow ({vow!}) is lifted, though the vow itself cannot be sworn again.", p: { vow: K.VOWS[id].name } }, S);
    },
    // A lost friend back, through a scene with that friend.
    reconcile: (who, S, d) => {
      S.lostFriends = (S.lostFriends || []).filter((x) => x.who !== who);
      S.friend = who; S.bonds[who] = Math.max(4, S.bonds[who] || 0); d["bond." + who] = 1;
      FX.flag("reconciled_" + who, S);
    },
    // Spiritual merit (tapas, §18.8): earned by kept vows, penance and hard right choices, spent on magic.
    tapas: (n, S, d) => { S.tapas = K.clamp((S.tapas || 0) + n, 0, 20); d.tapas = (d.tapas || 0) + n; },
    // A named divine weapon (K.ASTRAS), with who gave it (K.ASTRA_GIVERS) and so its condition.
    astraGrant: (v, S, d) => {
      const id = typeof v === "string" ? v : v.id, from = typeof v === "string" ? null : v.from;
      S.astras = S.astras || [];
      if (S.astras.some((a) => a.id === id)) return;
      // No room (two held, or the last one too new): offered in place of a weaker one, if any (content/astras.js w_swap).
      if (!K.astraRoom(S)) { if (K.astraSwapFor(id, S).length) S.astraOffer = { id, from }; return; }
      S.astras.push({ id, from, age: S.age });
      d.astraGranted = id;
      FX.journal({ src: "You were granted the {name}.", p: { name: (K.ASTRAS && K.ASTRAS[id] && K.ASTRAS[id].name) || id } }, S);
    },
    // The weapon offered in place of a weaker one (S.astraOffer): give: the one given up (its id), or null to let the new one go.
    astraSwap: (give, S, d) => {
      const o = S.astraOffer; S.astraOffer = null;
      if (!o || !K.ASTRAS[o.id]) return;
      const name = K.ASTRAS[o.id].name;
      if (!give || !K.astraSwapFor(o.id, S).includes(give)) { FX.journal({ src: "You let the {name} go, and kept the weapons you had.", p: { name } }, S); return; }
      if (give === "astra") { S.boons = S.boons.filter((b) => b !== "astra"); delete S.astra; } else S.astras = S.astras.filter((a) => a.id !== give);
      S.astras.push({ id: o.id, from: o.from, age: S.age });
      S.charges = S.charges || {}; S.charges["astra_used_" + o.id] = 0; // three fresh uses
      d.astraGranted = o.id;
      FX.journal({ src: "You gave up the {old}, and took the {name}.", p: { old: K.astraName(give), name } }, S);
    },
    // A charge of magic or a shield (once-only things): charges.sanjivani = 1, charges.kavacha = 1...
    charge: (o, S, d) => { S.charges = S.charges || {}; for (const [k, n] of Object.entries(o)) { S.charges[k] = n; d["charge." + k] = n; } },
    liftCurse: (v, S, d) => { const c = S.curses.find((x) => !x.fired); if (c) { S.curses = S.curses.filter((x) => x !== c); d.curseLifted = c.id; FX.journal({ src: "The rite is done. The {curse!} is lifted from you.", p: { curse: K.CURSES[c.id].name } }, S); } },
    vowRelease: (id, S) => { const v = S.vows.find((x) => x.id === id && !x.broken); if (v) { v.broken = true; v.released = true; } },
    boon: (id, S, d) => { if (!S.boons.includes(id)) { S.boons.push(id); d.boon = id; } },
    curse: (id, S, d) => { if (!S.curses.some((c) => c.id === id)) { S.curses.push({ id, fired: false, age: S.age }); d.curse = id; } },
    fireCurse: (id, S) => { const c = S.curses.find((x) => (id === "any" || x.id === id) && !x.fired); if (c) c.fired = true; },
    injury: (id, S, d) => { if (!S.injuries.includes(id)) { S.injuries.push(id); d.injury = id; } },
    die: (who, S, d) => {
      if (who === true || who === "self") {
        if (S.storyMode) return FX.injury("scar", S, {});
        // A thread tied by mother or spouse, or the sanjivani root: the death is undone, once (§18.7, §18.8).
        const ch = S.charges || {};
        if (ch.raksha) { ch.raksha = 0; d.saved = "raksha"; FX.injury("scar", S, {}); FX.journal({ src: "The thread on your wrist snapped as the blow fell, and you lived. It had been tied for exactly this." }, S); return; }
        if (ch.sanjivani) { ch.sanjivani = 0; d.saved = "sanjivani"; FX.injury("scar", S, {}); FX.journal({ src: "You died, and the sanjivani root on its cord burned to ash, and you breathed again. There will not be another." }, S); return; }
        S.alive = false;
      }
      else for (const w of [].concat(who)) if (!S.dead.includes(w)) S.dead.push(w);
    },
    deathText: (t, S) => { S.deathText = t; },
    // A moment of a kind the engine does not notice by itself (ui/moments.js K.MOMENT_KINDS): { kind, who, from }.
    moment: (m, S, d) => moment(S, d, typeof m === "string" ? { kind: m } : Object.assign({}, m)),
    age: (n, S) => { S.age = n; }
  };
  K.apply = function (fx, S = K.S) {
    const d = {};
    if (!fx) return d;
    if (typeof fx === "function") fx = fx(S) || {};
    const before = snap(S);
    for (const [k, v] of Object.entries(fx)) {
      if (!FX[k]) throw new Error("Unknown effect: " + k);
      FX[k](v, S, d);
    }
    after(before, S, d);
    return d;
  };
  K.vowBreaksFor = (tags, S = K.S) =>
    [].concat(tags || []).map((t) => K.VOW_TAGS[t]).filter((id) => id && K.hasVow(id, S));
  // Would these tags break the condition your divine weapon was given on?
  K.astraBreaksFor = (tags, S = K.S) => {
    const t = [].concat(tags || []);
    const g = S.astra && !S.astra.broken && S.boons.includes("astra") && K.ASTRA_GIVERS && K.ASTRA_GIVERS[S.astra.from];
    if (g && t.includes(g.tag)) return g;
    for (const a of S.astras || []) { const gg = !a.broken && K.ASTRA_GIVERS && K.ASTRA_GIVERS[a.from]; if (gg && t.includes(gg.tag)) return Object.assign({ which: a.id }, gg); }
    return null;
  };
  // Everything a choice's tags break: vows, and the weapon's condition. Returns the delta.
  K.breakTags = function (tags, S = K.S) {
    const d = {};
    for (const id of K.vowBreaksFor(tags, S)) Object.assign(d, K.apply({ vowBreak: id }, S));
    for (let g = K.astraBreaksFor(tags, S), n = 0; g && n < 6; g = K.astraBreaksFor(tags, S), n++) Object.assign(d, K.apply({ astraBreak: g.which || true }, S));
    return d;
  };

  // ---------- Moments ----------
  // The big milestones of a life (a friend for life, a divine weapon, a teacher's yes, a marriage, a vow,
  // a company of your own) are noticed here, whatever choice or test brought them, and kept in
  // S.moments; the screen plays them (ui/moments.js) from K.momentQueue. A friendship that falls below
  // 3 ends, with a farewell.
  K.momentQueue = [];
  const TWICE = ["missed_lamp_twice", "thrown_by_bhima_twice", "backed_down_twice", "horse_beat_you_twice"];
  function snap(S) {
    return { friend: S.friend, teacher: S.teacher, spouse: S.spouse, astra: S.boons.includes("astra"), vows: S.vows.length,
      company: S.flags.includes("role_command"), hermit: S.flags.includes("betrayed_hermit"), astras: (S.astras || []).length, crossed: S.flags.includes("crossed_lines") };
  }
  function moment(S, d, m) {
    m = Object.assign({ age: S.age, act: S.act }, m);
    (S.moments = S.moments || []).push(m);
    K.momentQueue.push(m);
    d.moment = m.kind;
  }
  // ---------- How you climb the tiers (Build D stage 3; Fight_Traits_Draft.md section 1.3, built as drafted: owner, 10 November) ----------
  // You start a Soldier (S.tier 0). Your floor follows your Might and your path's weapon skill (9 or more: a Captain, 1; 11 or
  // more: a great champion, 2). Milestones lift you above it: your teacher's test passed, or a deadly fight won from Act IV,
  // makes you a Captain; two of a strength boon (Bala, the kavacha, any divine weapon), a contest won (the tournament bout, the
  // games at Kampilya), a great champion held through a war day's hold, or a feat of your war storyline make you a great
  // champion. You never drop a tier, and only Bhima holds the fourth. Each rise is a full-screen moment (ui/moments.js "tier").
  K.CLIMB = {
    // A Captain (owner, 11 November: "Teacher test to captain doesn't sit right"; the teacher's test is a point toward the
    // floor instead): Bhadra's helmet, worn (content/episodes.js, the captain's arc); a captain-tier foe brought down in a
    // real fight, grown (combat.js); a deadly fight won from Act IV.
    captain: ["bhadra_helmet", "felled_captain", "deadly_won_late"], trialPoint: 0, // (the teacher's test counts through the skill it already teaches; an extra point made half of lives Captains at sixteen)
    contest: ["ugra_tournament_won", "won_kampilya"],
    held: ["held_karna", "held_arjuna", "held_bhima", "held_duryodhana", "held_for_shikhandi"],
    feat: ["kd_stood", "kd_guard_held", "proven_duel", "lifted_wheel", "kb_held_full", "held_the_gate", "held_the_ring", "held_wheel", "bh_held_line", "held_ring_open"]
  };
  K.strengthBoon = (S = K.S) => S.boons.includes("bala") || S.boons.includes("kavacha") || (S.boons.includes("astra") && !(S.astra && S.astra.broken)) || (S.astras || []).some((a) => !a.broken);
  K.tierNow = function (S = K.S) {
    if (!S || !S.path || S.fighter) return (S && S.tier) || 0;
    const has = (f) => S.flags.includes(f), any = (l) => l.some(has);
    const P = (K.PATHS || {})[S.path] || {}, sum = (S.attrs.might || 0) + ((P.skill && S.skills[P.skill]) || 0) + (has("teacher_trial_won") ? (K.CLIMB.trialPoint || 0) : 0);
    let t = sum >= 11 ? 2 : sum >= 9 ? 1 : 0;
    if (K.CLIMB.captain.some(has)) t = Math.max(t, 1);
    if ((K.strengthBoon(S) ? 1 : 0) + (any(K.CLIMB.contest) ? 1 : 0) + (any(K.CLIMB.held) ? 1 : 0) + (any(K.CLIMB.feat) ? 1 : 0) >= 2) t = 2;
    return Math.max(S.tier || 0, Math.min(2, t));
  };
  function after(b, S, d) {
    { const t1 = K.tierNow(S); if (t1 > (S.tier || 0)) {
      // What lifted you, for the moment's line: the helmet, the captain you brought down (named), or the rest.
      const via = t1 >= 2 ? null : S.flags.includes("bhadra_helmet") ? "helmet" : S.flags.includes("felled_captain") ? "felled" : null;
      S.tier = t1; d.tier = t1; moment(S, d, Object.assign({ kind: "tier", tier: t1 }, via ? { via } : {}, via === "felled" && K.lastFelled ? { foe: K.lastFelled } : {}));
    } }
    // Telling who taught you breaks Mauni's condition.
    if (!b.hermit && S.flags.includes("betrayed_hermit") && S.astra && S.astra.from === "mauni") FX.astraBreak(true, S, d);
    if (S.friend && S.friend !== b.friend && !(S.friend === "charu" && TWICE.some((f) => S.flags.includes(f)))) moment(S, d, { kind: "friend", who: S.friend });
    if (S.teacher && S.teacher !== b.teacher && S.teacher !== "self") moment(S, d, { kind: "teacher", who: S.teacher });
    if (S.spouse && S.spouse !== b.spouse) moment(S, d, { kind: "marriage", who: S.spouse });
    if (!b.astra && S.boons.includes("astra")) {
      if (!S.astra || S.astra.broken) S.astra = { from: S.teacher === "hermit" ? "mauni" : ["drona", "kripa"].includes(S.teacher) && S.act >= 5 ? S.teacher : "penance", act: S.act, age: S.age };
      moment(S, d, { kind: "astra", from: S.astra.from });
    }
    if (S.vows.length > b.vows) moment(S, d, { kind: "vow", id: S.vows[S.vows.length - 1].id });
    if ((S.astras || []).length > b.astras) { const a = S.astras[S.astras.length - 1]; moment(S, d, { kind: "astra", from: a.from, which: a.id }); }
    if (!b.company && S.flags.includes("role_command")) moment(S, d, { kind: "company" });
    if (!b.crossed && S.flags.includes("crossed_lines")) moment(S, d, { kind: "crossed" }); // the field crossed at Yuyutsu's call (war_crossing.js)
    // A friendship below 3 ends: the friend leaves the bonds panel, and will not answer a call for help.
    const f = S.friend;
    if (f && !S.dead.includes(f) && S.spouse !== f && (S.bonds[f] ?? 3) < 3) { // a marriage holds, whatever the bond
      (S.lostFriends = S.lostFriends || []).push({ who: f, age: S.age, act: S.act });
      S.friend = null; d.friendLost = f;
      FX.flag("lost_friend_" + f, S);
      if (K.FAREWELLS && K.FAREWELLS[f]) FX.journal({ src: K.FAREWELLS[f] }, S);
      moment(S, d, { kind: "farewell", who: f });
    }
  }

  // ---------- Events ----------
  const listeners = {};
  K.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  K.emit = (ev, data) => { for (const fn of listeners[ev] || []) fn(data); };
})(window.K = window.K || {});
