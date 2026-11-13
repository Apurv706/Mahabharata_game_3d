/* Real-time fights (PRD §18.15), the engine. A deterministic fixed-step simulation (60 steps a
   second, every chance drawn from K.rng) of one fight on a 1-D ground: x runs 0..1 across the field
   (9.5 bodies wide on every screen), and three depth rows (u.rt.lane: 0 front .. 2 back, a float while
   a unit steps between them; owner, 3 November): you hold the front row and your side stands in the
   rows behind; a foe steps into its target's row to strike and waits in a back row; a beaten foe (one
   that may be spared) kneels in the back row; blows reach a row across a little shorter; bodies in one
   row keep apart (no more than about a quarter of a body overlapping); arrows cross rows.

   It rides on the turn-based engine (engine/combat.js): K.Combat.start builds the fight (the units,
   your stats, the fight's allies and enemies, curses, intro lines), every blow is K.Combat's own
   B.hit through the abilities' own use() (so vows, the kavacha, crits, guard, holding fights and the
   log behave as in the turns), and the end is K.Combat.settle (scars, the friend who came, the
   "combat" event), followed by K.combatOutcome as for any fight. Only time is new.

   One fight at a time: RT.begin(B) → R; RT.step(R, act) advances one step with one input
   { move: -1|0|1, strike, roll, rollDir, block (held), skill, herbs, astra: id, call, orders: { friend, soldiers },
     withdraw, spare: uid } (the screen and the bot drive it alike); R.over is "win" | "lose" | "flee"
   | "spare" when it has ended, or "retry" when a deadly fight was lost the first time (RT.retry).
   RT.autoplay(encId) plays a whole fight with the bot (tests/headless): the outcome, as the turns give.

   Rules every enemy keeps (binding): a wind-up of at least 0.3 s, flashing orange; its mark fills to
   the rim exactly as the blow lands; an arrow's lane tracks its target, then locks (white) before the
   release; at most two foes attack at once, the rest wait at a distance; a foe winds up only when
   fully on the field. You stay a tenth of the field from either edge; foes stay on once in. Your own
   side never blocks you, and a blow marked on a friend lands on you if you stand in its path. */
(function (K) {
  "use strict";
  const C = K.Combat;
  const RT = (K.RT = {});
  const STEP = 1 / 60, ROUND = 4, BODY = 1 / 9.5, EDGE = 0.1;
  RT.STEP = STEP; RT.ROUND = ROUND; RT.BODY = BODY; RT.EDGE = EDGE;
  // The warning that your life is low (ui/realtime.js, ui/warday.js) comes below this share of it (owner, 6 November: 20%).
  K.LOW_LIFE = 0.2;
  // The tunables (tests/balance.js measures them; PARAMS env in the tests can override).
  RT.P = {
    story: 8,          // seconds per round of a fight's story: beats, the field event, holds and "rounds"
    // Easier (owner, 4 November: "fights are too hard now", then "still very hard"): measured with a bot that plays like a
    // person on a phone (one button at a time with a gap between presses, a person's reaction time, some blows not read):
    // foes keep their health (6.75, so a fight still lasts 30-60 s) but strike at half weight, your health 1.15 -> 1.35,
    // longer rests between their blows, wider perfect-roll and perfect-block windows, and Block lets less through and tires
    // you less. That bot wins 92% of real-time fights (63% before; 68% on the turns; seeds 11 and 37, 1500 lives each).
    hpFoe: 6.75,       // health is scaled up so a fight lasts its 30-60 s (blows are as in the turns)
    hpFriend: 1.5,     // you act several times as often as any foe: your own health is scaled far less (1.35 -> 1.5: owner, 6 November, 11:52)
    atkFoe: 0.36,      // a little easier (owner, 6 November: "let's make the fights a little easier"): 0.5 -> 0.425, blows 15% softer;
                       // then (11:52, "make the games easier, it's too hard right now"; chosen: a little easier, real-time fights and
                       // war-day clashes) 0.425 -> 0.36, 15% softer again, with your health up a ninth (hpFriend); the act ramp kept
    hpAlly: null,     // those beside you act as often as foes: scaled as foes (null) unless set
    spacing: 0.45,
    archerGap: 0.55,   // an archer looses oftener than a swordsman swings (0.7 until archers only shot, 4 November)     // a second foe's blow never lands within this of the first (two at once, but readable)
    gap: [2.0, 3.4],   // a foe's rest between blows, seconds
    windup: 0.6,       // a plain blow's wind-up (never below 0.3)
    heavyWind: 0.95,
    track: 0.8, lock: 0.35, // an arrow: the lane follows, then locks
    breathMax: 100, rollCost: 32, rollMin: 32, breathRegen: 20,
    roll: 0.42,        // a roll's length (all of it unhurtable)
    perfect: 0.15,     // a roll begun this close before a blow lands is perfect: the foes slow (0.24 until the strike and defence
                       // study, 8 November: about 9 in 10 of a person's late rolls came out perfect; owner: "tighten as proposed")
    retryHp: 0.8,      // a second try starts a little hurt
    botReact: [0.32, 0.55], botMiss: [0.35, 0.6], // the bot's reading, from grace (good to poor): a person's, not a machine's
    botLead: [0, 0.24], // how long before a blow lands the bot raises its shield (a perfect block only when late enough)
    botRollLead: [0.06, 0.32], // and how long before it rolls: a person's spread (it rolled at 0.2 s every time, so always perfect)
    botGap: [0.12, 0.22], // seconds between one button press and the next (a person's thumb; null: the old frame-perfect bot)
    glance: 0.15,      // shields (PRD §18.15): how often a shield-bearer facing you turns your blow, half spent
    shieldSoldiers: 0.6, shieldYou: 0.85, // your soldiers on Defend, a blow marked on them; you, a frontal blow, with a shield
    // Block (owner, 4 November): a shield-carrier (C.hasShield: the mace, the sword paths) holds up the shield where the others
    // roll. Raised, a blow from the front in your row or the next (or an arrow from the front) is stopped: this much gets through
    // (a heavy blow more, a shield-breaker more still); held, it drains breath, and each blow taken on it more; winded, it
    // drops and cannot be raised again until the breath is back to rollMin. Raised just before a blow lands (blockPerfect)
    // it is a perfect block: nothing gets through and the one who struck staggers.
    blockThrough: 0.08, blockHeavy: 0.35, blockBreaker: 0.55, blockMin: 12, blockDrain: 4.5, blockHit: 10, blockHitHeavy: 18,
    blockPerfect: 0.12, blockStag: 1.0, blockWalk: 0.4, // (0.2 until the study: 89–93% of a person's blocks were perfect)
    blockRows: 1.2,    // a blow from your row or the next is met; one from two rows off comes in from the side
    // The mace (owner, 4 November: heavy and slow): foes' mace blows wind up longer (an overhead smash, then a side sweep
    // that pushes you back), a little harder to keep their weight about the same.
    maceSmash: 0.8, maceSweep: 0.7, maceHit: 1.1, maceShove: 0.3,
    // The parry (owner, 6 November: "when both of us fight with hand-held weapons, should the weapons strike each other if
    // used at the right time?"). Strike pressed this close before a foe's blade lands on you (less on Hard: R.D.perfect;
    // 0.15 at first: played like a person on a phone, who strikes a quarter to a third of a second after the blade lights,
    // 1 parry in 7 tries, the rest too early or too late; 0.22 catches a reaction of 0.2-0.4 s after the light)
    // meets it: neither blow lands, the moment slows, and he reels back (parryStag; off a mace, parryStagMace). A dagger or
    // empty hands cannot stop a heavy blow or a mace's smash: half of it still lands (parryPart). Arrows cannot be parried.
    // The screen lights the blade for parryCue before it lands (0.45 s: a reaction of a quarter to a third of a second to the
    // light then falls inside the window). A named champion meets some of your blows with his own
    // (R.D.parryFoe, RT.LEVELS): you are thrown off for parriedBusy and he answers soon after; not twice in parryFoeCd.
    parry: 0.22, parryStag: 1.0, parryStagMace: 1.4, parryPart: 0.5, parryCue: 0.45, parriedBusy: 0.45, parryFoeCd: 2.5,
    // Foes use their shields (owner, 6 November: "let's have foes use their shields as well. If a foe uses their shield,
    // allow some time before they can strike"). A foe carrying one (the line's soldiers and guards, and every foe with a
    // sword or a spear), facing you and not winding up a blow of his own, catches some of your blows on it (fblock x
    // R.D.glance; a heavy blow or an arrow less often): only fblockLight of a blow gets through (fblockHeavy of a heavy one).
    // Then he must lower the shield before he can come again: fblockRec x R.D.rest seconds with no blow from him, and none
    // of yours caught again for fblockCd. That is the opening: strike again.
    fblock: 0.18, fblockLight: 0.15, fblockHeavy: 0.45, fblockRec: 1.0, fblockCd: 1.8,
    bowSecond: 0.8, bowGap: 0.08, // an archer's second arrow to a press: its weight (0.65, then 0.8: owner, 6 November, "make the phone archer stronger"), and how long after the first (bowShot)
    arrowPush: 0.12,   // every arrow of yours that lands pushes the foe back this much of a body (half on a named champion): no stagger, he walks in against it
    cap: 240,        // a fight that has run this long is stopped (it never should)
    // Build D (owner, 7 November; feedback rows 48-50, Fight_Traits_Draft.md). A shield has shieldPts points; each blow caught
    // on it takes some by the striker's tier and weapon (RT.SHIELD_HIT). Yours broken: you roll, and take up a new one off
    // the ground (owner, 7 November: "a place to pick up a new shield where the player has to go"): a fallen soldier's,
    // where he fell, or the one a comrade throws in at your side's edge (throwX) shieldBack seconds after the break; walking
    // within pickupR of a body over it takes it up. A foe's broken: gone for the fight. Shield wall or Guard chosen on the
    // turns: Strike is locked for strikeLock seconds of the clash, the shield held up for you. A light blow of yours
    // flinches a foe lightStag. A mantra traced wrong (ui/mantra.js): the divine weapons wait mantraRest seconds.
    shieldPts: 10, shieldBack: 10, throwX: 0.13, pickupR: 0.45, groundMax: 5, strikeLock: 4, lightStag: 0.18, mantraRest: 10,
    swingLock: 1, strength: 1, // (the balance runs: 0 turns the swing lock, or strength's effects, off to measure what each costs)
    // What the swing lock costs each path, given back (owner, 7 November: "balance held at today's win rates per path"): the
    // foes' blows on you this much lighter, by your path. Measured with tests/lives.js (RT=1 RTSTATS=1 COMPARE=1, 1500 lives,
    // seed 11): the slow weapons lost most to the lock.
    vsPath: { mace: 0.73, strategist: 0.69, charioteer: 0.83, archer: 0.84, spy: 0.95, bard: 0.86, healer: 1 }
  };
  // ---------- Strength (Build D, feedback row 49) ----------
  // Four tiers: 0 soldier, 1 captain or named warrior, 2 great champion, 3 Bhima alone (the Nagas' drink, Adi Parva).
  // You start a soldier (K.S.tier: stage 3 lifts it). Each tier's blows: points off a shield caught on (by weapon class; a heavy
  // blow x1.5; a dagger, a bow, bare hands never break one), how much of a blow gets through a raised shield and how much
  // breath it drains, how far it throws you; and how often a light blow of yours flinches him (a champion only feels heavy ones).
  // (Mace points 1, 1.4, 1.8, 2.2 rather than the draft's 2 and 2.5: Bhima mixes heavy blows in, and the owner's ask is a
  // shield broken in 4-5 of his blows, not 3.)
  RT.TIER_NAMES = ["Soldier", "Captain", "Great champion", "Bhima"];
  RT.SHIELD_HIT = { mace: [1, 1.4, 1.8, 2.2], club: [0.8, 1.1, 1.4, 1.4], hammer: [0.8, 1.1, 1.4, 1.4], sword: [0.5, 0.7, 0.9, 0.9], woodsword: [0.5, 0.7, 0.9, 0.9], spear: [0.5, 0.7, 0.9, 0.9], staff: [0.5, 0.7, 0.9, 0.9] };
  RT.STRENGTH = { through: [1, 1.25, 1.6, 1.8], breath: [1, 1.2, 1.5, 1.6], knock: [1, 1.2, 1.5, 1.6], flinch: [1, 0.6, 0, 0] };
  const TIER = { bhima: 3, karna: 2, arjuna: 2, bhishma: 2, drona: 2, kripa: 2, duryodhana: 2, ashwatthama: 2, abhimanyu: 2, satyaki: 2, ghatotkacha: 2, supratika: 2,
    kritavarma: 1, vrishasena: 1, bhurishravas: 1, jayadratha: 1, iravan: 1, bhadra: 1,
    charu: 0, ugra: 0, vasu: 0, madhavi: 0, revat: 0, devi: 0, dev: 0, naga: 0, rakshasa: 0 };
  RT.tierOf = function (u) {
    if (!u) return 0;
    if (u.side === "player") return Math.max(0, Math.min(2, (K.S && K.S.tier) || 0));
    if (u.tier != null) return u.tier;
    if (u.person && TIER[u.person] != null) return TIER[u.person];
    const n = String(u.src || u.name || "").toLowerCase(), key = Object.keys(TIER).find((k) => TIER[k] > 0 && new RegExp("\\b" + k + "\\b").test(n));
    if (key) return TIER[key];
    if (u.hero || u.person || /captain|dented helmet/.test(n)) return 1; // a named warrior, a pack's captain
    return 0;
  };
  // Points off a shield for this blow: the striker's tier and weapon; a heavy blow (not a mace's own arcs, already heavy) x1.5.
  RT.shieldHit = (by, weapon, heavy) => {
    if (by && by.side !== "player" && /^supratika\b/i.test(String(by.src || by.name || ""))) return RT.SHIELD_HIT.mace[3] * (heavy ? 1.5 : 1); // the elephant: at Bhima's rate (stage 2)
    const row = RT.SHIELD_HIT[weapon]; return row ? row[RT.tierOf(by)] * (heavy ? 1.5 : 1) : 0;
  };
  // After his swing a foe stands open (no shield raised, no parry, no step) for this long, by weapon (row 48).
  RT.OPEN = { mace: 0.7, club: 0.5, hammer: 0.5, sword: 0.35, woodsword: 0.35, spear: 0.35, staff: 0.35, dagger: 0.2, fist: 0.2, bow: 0.35 };

  // ---------- The champions' own traits (Build D stage 2; Fight_Traits_Draft.md section 2, built as drafted: owner, 10 November) ----------
  // One or two each, from the epic, whichever side he fights on, in the real-time fights and the war days' clashes. Who he is:
  // his person, or by the name for Supratika (Bhagadatta's elephant) and Jayadratha's line (his guard, the Sindhu archers).
  RT.who = (u) => {
    if (!u || u.side === "player") return null;
    if (u.person) return u.person;
    const n = String(u.src || u.name || "").toLowerCase();
    return /^supratika\b/.test(n) ? "supratika" : /\bjayadratha\b|\bsindhu\b/.test(n) ? "jayadratha" : null;
  };
  // The battle day of this scene: its own (K.ORDERS.at), the day it comes before (K.BEFORE: the holds), or the last orders'.
  RT.warDay = (S = K.S) => {
    if (!S || (S.side !== "pandava" && S.side !== "kaurava")) return 0;
    const at = (K.ORDERS && K.ORDERS.at) || {};
    if (at[S.scene]) return at[S.scene];
    for (const [tg, list] of Object.entries(K.BEFORE || {})) if (at[tg] && Array.isArray(list) && list.includes(S.scene)) return at[tg];
    return S.ordersDay || 0;
  };
  RT.night = (B) => !!B && !!B.enc && /night/i.test([B.enc.id, K.val(B.enc.title), B.enc.art, K.val(B.enc.caption)].join(" "));
  const shikhandiOn = (B) => B.units.some((u) => u.hp > 0 && u.side !== "enemy" && /shikhandi/i.test(String(u.name || "")));
  // The line under his title as he takes the field (ui/realtime.js, ui/warday.js, ui/battle.js), or null.
  RT.traitLine = function (u, S = K.S) {
    const w = RT.who(u), day = RT.warDay(S);
    switch (w) {
      case "bhima": return "Shield-breaker; his war cry draws every blow";
      case "duryodhana": return "Balarama's pupil: master of the mace";
      case "arjuna": return "Savyasachi: he draws with either hand";
      case "karna": return S && S.act < 6 ? "His armour and earrings: blows fall lighter on him" : day === 17 ? "His chariot wheel will sink" : null;
      case "bhishma": return "He will not strike Shikhandi, and he chooses the day of his death";
      case "drona": return "The teacher reads you: vary your blows";
      case "kripa": return "The undying teacher: he reads you, and will not reel";
      case "ashwatthama": return "The gem on his brow: he never tires";
      case "ghatotkacha": return "A rakshasa: stronger at night, and full of illusions";
      case "jayadratha": return day === 13 && S.side === "pandava" ? "Shiva's boon: today no Pandava can break him" : null;
      case "abhimanyu": return "His blows sweep two at once";
      case "satyaki": return "Arjuna's pupil: a quick blade";
      case "bhurishravas": return "The old veteran: his heavy blow knocks you down";
      case "supratika": return "The elephant's charge cannot be parried";
      default: return null;
    }
  };
  // The one-time tip the first time each trait tells in a fight (ui/realtime.js tipOnce).
  RT.TRAIT_TIP = {
    bhima: "Bhima's war cry: every foe turns on him for a moment, and off you.",
    duryodhana: "Duryodhana learned the mace from Balarama: he meets a mace twice as often. Mix in a block or a roll.",
    arjuna: "Arjuna draws with either hand, faster than any archer: close on him, or keep your shield up.",
    karna: "Karna's armour and earrings: your blows fall lighter on him.",
    karnaWheel: "Karna's wheel has sunk, and he has stopped to free it. Strike him now and it will be remembered; or hold your hand.",
    bhishma: "Bhishma will not strike Shikhandi: near Shikhandi your blows fall heavier on him.",
    bhishmaDay: "Bhishma chooses the day of his death: he cannot be brought down before the tenth day.",
    drona: "Drona read your blows: the same combo again and again, and the teacher sees it coming. Mix in a block, a roll or a pause.",
    kripa: "Kripa read your blows, as Drona would. Mix in a block, a roll or a pause.",
    kripaSteady: "Kripa will not reel: below half his strength, nothing staggers him.",
    ashwatthama: "Ashwatthama never tires: he rests less between his blows.",
    ghatotkacha: "Night: the rakshasa's blows fall harder.",
    ghatotkachaMaya: "Ghatotkacha's illusion: two of him are false. The real one casts a shadow.",
    jayadratha: "Shiva's boon: today your blows fall half as hard on Jayadratha and his line.",
    abhimanyu: "Abhimanyu's blows sweep two at once.",
    satyaki: "Satyaki is quick: his blows come faster, and he meets blades often.",
    bhurishravas: "Bhurishravas's heavy blow knocks you down. Block it, or roll clear.",
    supratika: "The elephant's charge cannot be parried: roll out of its way."
  };
  // Said once a fight (the screen keeps it to once on the device).
  function traitTip(R, key) { if (!R || (R.told = R.told || {})[key]) return; R.told[key] = true; R.fx.push({ k: "trait", who: key }); }
  RT.traitTip = traitTip;
  // Every blow's weight, by who strikes and who is struck (combat.js hit asks while a real-time fight or a clash is on: B.rt).
  C.traitDmg = function (B, a, t) {
    const R = B.rt; if (!R || R.over) return 1;
    const S = K.S, wa = RT.who(a), wt = RT.who(t);
    let m = 1;
    if (wt === "karna" && S && S.act < 6) { m *= 0.7; traitTip(R, "karna"); }
    if (wt === "jayadratha" && a.side !== "enemy" && RT.warDay(S) === 13 && S.side === "pandava") { m *= 0.5; traitTip(R, "jayadratha"); }
    if (wt === "bhishma" && a.side !== "enemy" && shikhandiOn(B)) { m *= 1.25; traitTip(R, "bhishma"); }
    if (wa === "ghatotkacha" && RT.night(B)) { m *= 1.3; traitTip(R, "ghatotkacha"); }
    if (t === C.player() && S && S.boons && S.boons.includes("kavacha") && (S.charges || {}).kavacha) m *= 0.9; // the kavacha, unspent (stage 3)
    return m;
  };
  // A blow that would bring Bhishma down before the tenth day leaves him a tenth (he chooses the day of his death).
  C.traitCap = function (B, t, dmg) {
    const R = B.rt; if (!R || R.over || RT.who(t) !== "bhishma" || RT.warDay() >= 10) return dmg;
    const keep = Math.round(t.maxHp * 0.1), cap = Math.max(0, t.hp - keep);
    if (dmg > cap) traitTip(R, "bhishmaDay");
    return Math.min(dmg, cap);
  };
  // His rests between blows, his wind-ups and his opening after a swing.
  const traitRest = (R, e) => { const w = RT.who(e); return w === "arjuna" && e.rt.archer ? 0.75 : w === "ashwatthama" ? (R.B.enc.id === "e_raid" ? 0.64 : 0.8) : w === "satyaki" ? 0.85 : 1; };
  // Kripa does not reel below half his strength.
  const steady = (t) => RT.who(t) === "kripa" && t.hp < t.maxHp * 0.5;

  // ---------- Boons and the divine weapons' gifts in a fight (Build D stage 3; Fight_Traits_Draft.md 3.1 and 3.2, as drafted) ----------
  // Bala: never tired (breath back faster, rolls and blocks cheaper). The kavacha, while unspent: every blow on you a tenth
  // lighter. The charmed shield: your shield cannot be broken. Foresight: the parry light shows earlier. Healing hands: herbs
  // taken quicker. The sanjivani root, while unspent: herbs heal half again. Antardhana: vanish (Aid ▾), once an act. The
  // divine weapons, while kept: Agni's fire on your heavy blows, Varuna's cool water (breath), Vayu's light feet, the sleep in
  // a heavy blow (Sammohana), the serpent's coil at a foe's feet (Nagapasha), and the teacher's eye (the Indrastra).
  const boon = (b) => !!(K.S && K.S.boons && K.S.boons.includes(b));
  const kept = (id) => !!(K.S && (K.S.astras || []).some((a) => a.id === id && !a.broken));
  const indra = () => boon("astra") && !(K.S.astra && K.S.astra.broken);
  RT.boon = boon; RT.kept = kept;
  RT.GIFTS = [
    { id: "bala", on: () => boon("bala"), name: "Bala" },
    { id: "kavacha", on: () => boon("kavacha") && !!((K.S.charges || {}).kavacha), name: "Kavacha" },
    { id: "charm_shield", on: () => boon("charm_shield"), name: "Charmed shield" },
    { id: "foresight", on: () => boon("foresight"), name: "Foresight" },
    { id: "healing_hands", on: () => boon("healing_hands"), name: "Healing hands" },
    { id: "sanjivani", on: () => boon("sanjivani") && !!((K.S.charges || {}).sanjivani), name: "Sanjivani" },
    { id: "antardhana", on: () => boon("antardhana") && !!(K.vanishReady && K.vanishReady(K.S)), name: "Antardhana" },
    { id: "agneya", on: () => kept("agneya"), name: "Agni's fire" },
    { id: "varuna", on: () => kept("varuna"), name: "Varuna's water" },
    { id: "vayavya", on: () => kept("vayavya"), name: "Vayu's feet" },
    { id: "sammohana", on: () => kept("sammohana"), name: "Heavy eyes" },
    { id: "nagapasha", on: () => kept("nagapasha"), name: "The coil" },
    { id: "indra", on: () => indra(), name: "The teacher's eye" }
  ];
  RT.gifts = () => (K.S ? RT.GIFTS.filter((g) => { try { return g.on(); } catch (e) { return false; } }) : []);
  const breathRegen = () => RT.P.breathRegen * (boon("bala") ? 1.5 : 1) * (kept("varuna") ? 1.2 : 1);
  const tireCost = () => (boon("bala") ? 0.75 : 1);
  RT.kneelT = () => (boon("healing_hands") ? 0.7 : 1.1);
  RT.parryWin = () => RT.P.parry * (indra() ? 1.2 : 1);
  RT.cueLead = () => RT.P.parryCue + (boon("foresight") ? 0.15 : 0);
  RT.walkMul = () => (kept("vayavya") ? 1.15 : 1);
  RT.rollMul = () => (kept("vayavya") ? 1.2 : 1);
  // Your heavy blow, landed: Agni's fire burns him 2 s; the sleep slows his next wind-up; the coil binds his feet 1.5 s.
  function giftsOnHeavy(R, t, d) {
    if (!t || t.hp <= 0 || !t.rt) return;
    if (kept("agneya")) { t.rt.burnUntil = R.t + 2; t.rt.burnPer = Math.max(1, d) * 0.15; R.fx.push({ k: "burn", uid: t.uid }); }
    if (kept("sammohana")) t.rt.slowNext = 1.3;
    if (kept("nagapasha")) t.rt.boundUntil = R.t + 1.5;
  }
  // Per-fight tuning: RT.TUNE[encId] = { hp, atk } multiplies that fight's foes' health and blows. Only the
  // outliers are tuned (owner, 3 and 4 November), each to within about 8 points of the same fight on the turns
  // (RTSTATS=1 COMPARE=1 node tests/lives.js 3000 <seed>, on fresh seeds); every other fight uses RT.P alone.
  // 4 November: Yuyutsu's day-2 duel (cross_e_duel, 72% -> 43% vs 42-43% on the turns) and the night raid (e_raid,
  // 54% -> 37-39% vs 38-39%), on seeds 11 and 37.
  // Later on 4 November, with foes kneeling only at 5% (C.PLEAD) and fighting at their weapons' reach: the Gandharva
  // (1.22 -> 1.0), Jayadratha's road (e_jaya, 1.08 -> 0.81) and the road fight (e_road, 1.11 -> 0.75), on seed 11.
  RT.TUNE = {
    e_bhadra: { hp: 1.5, atk: 2.4 }, // Bhadra's bout (the captain's arc, 11 November): an old captain, not a straw man (the bot won 942 of 942)
    e_bhadra_road: { hp: 1.3, atk: 1.5 }, // the border road (owner, 11 November): its raiders lighter for the turns (1% -> about 45% won there); real time held near 90%
    e_ep_carts: { worn: 90 }, // the supply carts' sentries tire after 90 s (one of 2,400 bot lives ran to the cap with an archer among them, row 47)
    cross_e_escape: { hp: 0.6, atk: 1.62, worn: 60, wornFloor: 0.08 }, // the crossing fight (owner, 10 November: "Make it a fight"; 23:05 "harder"): three of your own line, a short, hard fight
    cross_e_duel: { hp: 1.15, atk: 1.3 }, // eased 4 November (1.36), still the hardest duel; 1.15 -> 1.3 (Build D: a light blow now flinches a soldier, and this duel is one soldier: 82% -> 89%)
    cross_e_called: { hp: 0.85, atk: 0.85 },
    e_ep_ugra: { hp: 0.7, atk: 0.7 },
    e_raid: { hp: 1.1, atk: 0.95 }, // (Build D, 7 November: 1.1 -> 0.95 with Ashwatthama a great champion, his blows through your shield harder: 82% -> back toward 90%)
    e_gandharva: { hp: 0.85, atk: 0.85 }, // a hard fight, not a deadly one (canon: Duryodhana is carried off whatever you do); eased 4 November
    e_jaya: { hp: 0.81, atk: 0.81 },
    e_kings: { hp: 0.64, atk: 0.64 },
    e_road: { hp: 0.9, atk: 0.9 },
    e_cattle_k: { atk: 0.9 }, // (Build D: the Kaurava cattle raid's captains, now stronger through the shield: 89% -> 83%, eased back)
    // With Block, the heavy mace and archers that only shoot (later on 4 November): the road fight (e_road, 0.75 -> 0.9: 67%
    // vs 46% on the turns at 0.75), and the two mace duels, whose champion now swings a mace (0.8: back to where they were).
    fs_sk_mace: { hp: 0.8, atk: 0.8 },
    fs_d18_mace: { hp: 0.8, atk: 0.8 }
  };
  // Difficulty (owner, 5 November, feedback item 19: "fights get easier with practice"): a setting in the Menu (Easy,
  // Normal, Hard) and a ramp by act. Easy is the easing of 4 November all through. Normal starts there, so the early
  // fights still teach, and grows act by act to the war; Hard starts harder and ends hardest. Story mode keeps Easy,
  // whatever the setting. Each value is [the first act, the war], as a share of RT.P's own:
  //   atk     the weight of a foe's blow         rest    his rest between blows (shorter: foes rarely rest)
  //   wind    his wind-up (shorter)              perfect the perfect-roll and perfect-block windows (narrower)
  //   glance  how often a shield-bearer turns your blow (foes block)
  //   feint   the chance a melee wind-up stops just short and comes again (a roll or a shield spent on nothing)
  //   pair    the least time between two foes' blows landing (smaller: pairs strike together)
  RT.LEVELS = {
    easy: { atk: [1, 1], rest: [1, 1], wind: [1, 1], perfect: [1, 1], glance: [1, 1], feint: [0, 0], pair: [1, 1], parryFoe: [0.02, 0.05] },
    normal: { atk: [1, 1.42], rest: [1, 0.72], wind: [1, 0.86], perfect: [1, 0.85], glance: [1, 1.7], feint: [0, 0.22], pair: [1, 0.6], parryFoe: [0.06, 0.14] },
    hard: { atk: [1.25, 1.6], rest: [0.8, 0.6], wind: [0.9, 0.76], perfect: [0.8, 0.68], glance: [1.4, 2.2], feint: [0.1, 0.32], pair: [0.7, 0.4], parryFoe: [0.12, 0.25] }
  };
  // How far along the ramp each act is: the early acts teach, the war is the hardest.
  RT.HEAT = { 1: 0, 2: 0.1, 3: 0.3, 4: 0.45, 5: 0.6, 6: 0.9, 7: 1 };
  RT.difficulty = (S = K.S) => {
    if (RT.diffForce) return RT.diffForce;
    const env = typeof process !== "undefined" && process.env ? process.env.DIFF : null; // the checks (DIFF=easy|normal|hard)
    if (env && RT.LEVELS[env]) return env;
    if (S && S.storyMode) return "easy";
    const d = K.prefs ? K.prefs().difficulty : null;
    return RT.LEVELS[d] ? d : "normal";
  };
  RT.level = function (S = K.S, name) {
    const n = name || RT.difficulty(S), L = RT.LEVELS[n] || RT.LEVELS.normal, h = RT.HEAT[(S && S.act) || 1] != null ? RT.HEAT[(S && S.act) || 1] : 1;
    const out = { name: n, heat: h };
    for (const [k, [a, b]] of Object.entries(L)) out[k] = a + (b - a) * h;
    return out;
  };
  // Fighter mode (item 21) fights alone: a fight the story gives you soldiers for is eased where that left it far
  // harder than its neighbours on the ladder (measured with the bot: the road to Jayadratha 38% alone, the night battle 30%, Dushasana's men 46%).
  RT.FIGHTER = { e_road: 0.75, e_night: 0.7, e_dushasana: 0.8 };
  // The fights played in real time (PRD §18.15 "Which fights are which"); every other fight stays on the turns.
  RT.IDS = new Set(["e_ugra", "e_spar", "e_bandits", "e_kings", "e_panchala", "e_border", "e_gandharva", "e_sudatta", "e_jayadratha", "e_cattle", "e_cattle_k",
    "e_guard", "e_hunt", "e_gate", "e_road", "e_jaya", "e_dushasana", "e_night", "e_ep_carts", "e_ep_ugra", "e_raid", "e_ash", "cross_e_escape", "cross_e_duel", "cross_e_called", "x_practice"]);
  RT.isRealtime = (enc) => {
    if (typeof enc === "string") enc = K.ENCOUNTERS[enc];
    if (!enc || enc.dream) return false;
    if (enc.realtime === false) return false;
    return RT.IDS.has(enc.id) || enc.realtime === true || K.val(enc.kind) === "mace"; // the mace duel of the side battles
  };
  // Real-time fights are on for every player (owner, 4 November). The player's switch, "Fights: real-time /
  // turn-based" (K.prefs().fights, in the menu), is real-time by default; turn-based puts every fight on the
  // new war-day screen (ui/warday.js). Tests: RT.force = true plays every real-time fight in real time whatever
  // the switch says, false plays every fight on the turns, null (the default) follows the switch.
  // Test-only override: K.prefs({ oldFights: true }) brings back the old turn-based screen and rules for every
  // fight (no real time, no war-day screen, no places, shields or packs) -- tests/battlefit.js uses it. It is
  // not in the menu.
  RT.force = null;
  RT.old = () => !!(K.prefs && K.prefs().oldFights);
  RT.mode = () => (K.prefs && K.prefs().fights === "turns" ? "turns" : "realtime");
  RT.on = () => !RT.old() && (RT.force === true || (RT.force !== false && RT.mode() === "realtime"));
  RT.wanted = (encId) => RT.on() && RT.isRealtime(encId);

  // A turn-based war day fought beside your company: you choose your place in the line (K.Combat.setPlace).
  // (Holding fights too: any turn-based fight with your company beside you, not only the deadly war days.)
  const plainTurns = (enc) => !RT.old() && !RT.isRealtime(enc) && !enc.dream && !(K.val(enc.kind) && K.FIGHT_KINDS && K.FIGHT_KINDS[K.val(enc.kind)]);
  C.placesWanted = (enc, B) => plainTurns(enc) && B.units.some((u) => u.side === "ally" && u.plural && !u.person);
  // Shields on the turns (C.SHIELD_PATHS, the shield wall, your company's raised shields, a foe's shield turning a blow)
  // and packs (three or more foes come two at a time): the new war-day screen's rules (off only under the test-only oldFights override).
  C.shieldsWanted = (enc) => plainTurns(enc);
  // Sparing a kneeling foe takes him out of the fight and the fight goes on (combat.js C.spare), on the new screens.
  C.spareGoesOn = () => !RT.old();
  C.packsWanted = (enc, B) => plainTurns(enc) && B.units.filter((u) => u.side === "enemy").length >= 3;

  // The skill each path brings to a live fight (from its turn-based moves).
  RT.SKILL = { archer: "aimed", mace: "quake", charioteer: "ridedown", strategist: "command", healer: "salve", spy: "vanish", bard: "song" };
  RT.RECHARGE = { aimed: 7, quake: 11, ridedown: 10, command: 9, salve: 13, vanish: 10, song: 13 };
  const MELEE = new Set(["strike", "heavy", "crush", "breaker", "disarm", "hamstring", "nerve", "ridedown"]);
  RT.MELEE = MELEE; // (the screen: a comrade's blow it swings ahead of the land)
  const RANGED = new Set(["arrows", "aimed", "pin", "volley"]);
  const HEAVY = new Set(["heavy", "crush", "breaker", "aimed"]);

  const living = (B, side) => B.units.filter((u) => u.hp > 0 && !u.spared && (side === "friends" ? u.side !== "enemy" : u.side === side));
  const held = (u) => !!(u.status.stun || u.status.asleep || u.status.bound);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sign = (v) => (v < 0 ? -1 : 1);
  const r = (a, b) => a + K.rng() * (b - a);

  // ---------- Who each unit is, on the ground ----------
  // The weapon each one strikes with (as the screen draws it, ui/puppet.js: a bowman draws a sword to strike), and how far
  // it reaches (owner, 4 November: room between the figures for the weapons to meet). The drawn reach, in body widths from
  // the figure's middle to the tip at full stretch, is spear 2.6, mace 2.3, sword 2.0, club 1.8, dagger 1.6, a fist 1.15;
  // the blow lands on the chest (a third of a body short of that): REACH is where two stand to fight, in drawn body widths.
  // The field is 9.5 body widths, but a figure on an upright phone is drawn about 1.8 of them wide (1 on a laptop): the
  // screen gives the fight its scale (RT.setScale, held to 1.2-1.8; 1.4 without a screen, as the balance runs), so the
  // figures stand where their weapons reach on every screen.
  // A bow's REACH is only where its bearer stands to a foe (as a sword's): its arrows fly much further (RT.SHOOT).
  RT.REACH = { spear: 2.25, mace: 1.95, sword: 1.65, woodsword: 1.65, bow: 1.65, staff: 1.6, club: 1.45, hammer: 1.3, dagger: 1.25, fist: 0.8 };
  RT.SHOOT = 0.62; // how far your arrows fly (a fraction of the field)
  RT.SCALE = 1.4;
  const reachOf = (R, w) => RT.REACH[w] * BODY * (R.scale || RT.SCALE);
  RT.setScale = function (R, k) {
    R.scale = Math.max(1.2, Math.min(1.8, k || RT.SCALE));
    for (const u of R.B.units) if (u.rt && u.rt.weapon) u.rt.reach = reachOf(R, u.rt.weapon);
  };
  // An archer fights with the bow, at any range (owner, 4 November: "archers fight as archers"; no sword drawn).
  // The charioteer fights with the spear (owner, 9 Nov); the strategist chooses the sword or the spear at fifteen (S.weapon).
  const PATH_WEAPON = { archer: "bow", mace: "mace", charioteer: "spear", strategist: "sword", healer: "dagger", spy: "dagger", bard: "dagger" };
  RT.PATH_WEAPON = PATH_WEAPON;
  K.playerWeapon = (S = K.S) => (S && S.path ? (S.path === "strategist" && S.weapon === "spear" ? "spear" : PATH_WEAPON[S.path] || "sword") : null);
  const PERSON_WEAPON = { bhima: "mace", duryodhana: "mace", dushasana: "mace", shalya: "mace", balarama: "mace", ghatotkacha: "club", ugra: "club", charu: "hammer",
    karna: "bow", arjuna: "bow", drona: "bow", bhishma: "bow", ashwatthama: "bow", abhimanyu: "bow", kripa: "bow", drupada: "bow", jayadratha: "bow", ekalavya: "bow", shikhandi: "bow", // as their figures are drawn (tests/weapons.js)
    satyaki: "sword", dhrishtadyumna: "sword", nakula: "sword", sahadeva: "sword", yudhishthira: "spear", guard: "spear", soldier: "spear" };
  RT.weaponOf = function (u) {
    if (u.side === "player") {
      const B = C.state && C.state(); if (B && B.enc && B.enc.dream) return "sword"; // the dream: you, grown, with a sword
      if (B && B.enc && B.enc.arm) return B.enc.arm; // a bout fought with what the two of you were handed (ui/tests3d/frame.js: bare hands, wooden swords, practice maces)
      return K.S && K.S.path ? K.playerWeapon(K.S) : "fist"; // before a path, empty hands (K.fightItem): the fair's wrestling ring
    }
    if (u.item) return u.item; // drawn by this fight with another weapon (Ashwatthama in the sleeping camp: a sword)
    if (u.person) return PERSON_WEAPON[u.person] || "sword";
    // As the figure is drawn (ui/battle.js specFor; tests/weapons.js holds the two together).
    const n = String(u.src || u.name);
    if (/charioteer/i.test(n)) return "sword";
    if (/Ashwatthama/.test(n)) return "bow";
    if (/Gandharva/.test(n)) return "spear";
    if (/champion|dented helmet|\bmace\b/i.test(n)) return "mace"; // a mace champion
    if (/archer|chariot/i.test(n)) return "bow";
    if (/horseman|rider|veteran/i.test(n)) return "sword";
    if (/miller's son/.test(n)) return "fist"; // Ugra in the wrestling ring at the fair, empty-handed as he is drawn
    if (/Ketan/.test(n)) return "woodsword"; // the sparring bout: a blunted (wooden) sword, as long as a sword
    if (/^Ugra(?!'s)/.test(n) || /club|raider|bandit/i.test(n)) return "club"; // (Ugra's levies are soldiers)
    if (/cowherd|villager/i.test(n)) return "staff";
    return "spear"; // a guard, a soldier: the spear
  };
  function profile(u, R) {
    const n = String(u.src || u.name);
    const ab = u.abilities || [];
    const ranged = ab.some((a) => RANGED.has(a));
    const archer = ranged && (/archer|chariot\b|chariot-|torch|bow/i.test(n) || !ab.some((a) => MELEE.has(a)) || PERSON_WEAPON[u.person] === "bow"); // (Karna, called to your side, shoots: he is drawn with his bow)
    let weapon = RT.weaponOf(u);
    if (archer) weapon = "bow"; else if (weapon === "bow") weapon = "sword"; // an archer only shoots; a bowman's name with no bow work: a sword
    return {
      archer, ranged, weapon,
      reach: 0, // set by initUnit (the screen's scale)
      speed: (archer ? 0.16 : 0.2) * (u.plural ? 0.9 : 1),
      windup: Math.max(0.3, (RT.P.windup - Math.min(0.2, (u.atk || 0) * 0.006)) * (R && R.D ? R.D.wind : 1)),
      keep: archer ? 0.34 : 0 // an archer keeps its distance
    };
  }
  function initUnit(R, u) {
    const B = R.B, foe = u.side === "enemy";
    const k = foe ? RT.P.hpFoe : u.side === "player" ? RT.P.hpFriend : RT.P.hpAlly == null ? RT.P.hpFoe : RT.P.hpAlly;
    if (u._tb) RT.unscaleUnit(u); // already scaled (a war day's earlier clash): from its turn-based health and blows again
    u._tb = { hp: u.hp, maxHp: u.maxHp, atk: u.atk }; // what it was on the turns (RT.unscale)
    u.maxHp = Math.max(1, Math.round(u.maxHp * k)); u.hp = Math.max(0, Math.round(u.hp * k));
    if (foe) { // per-fight tuning (RT.TUNE): the outliers only; in fighter mode (no one beside you) RT.FIGHTER as well
      const tune = Object.assign({}, RT.TUNE[B.enc.id] || {}), ft = K.S && K.S.fighter ? RT.FIGHTER[B.enc.id] : null;
      if (ft) { tune.hp = (tune.hp || 1) * ft; tune.atk = (tune.atk || 1) * ft; }
      if (tune.hp) { u.maxHp = Math.max(1, Math.round(u.maxHp * tune.hp)); u.hp = Math.max(0, Math.round(u.hp * tune.hp)); }
      u.atk = Math.round(u.atk * RT.P.atkFoe * (tune.atk || 1) * R.D.atk * 10) / 10; // blows come oftener and are dodged more than on the turns
    }
    const pr = u.side === "player" ? { weapon: RT.weaponOf(u), speed: 0.3, windup: 0.12 } : profile(u, R);
    pr.reach = reachOf(R, pr.weapon);
    const i = R.seen++;
    const sideIdx = (R.sideSeen[foe ? "e" : "f"] = (R.sideSeen[foe ? "e" : "f"] || 0) + 1) - 1;
    u.rt = Object.assign(pr, {
      x: 0, lane: 0, face: foe ? -1 : 1, state: "idle", t: 0, busy: 0, cool: foe ? r(0.6, 1.6) : r(0.3, 0.9), cd: {}, st: {}, down: 0, stag: 0,
      atk: null, entered: !foe, hits: [], bodies: u.plural ? 3 : 1, idx: i, sideIdx
    });
    for (const [s, v] of Object.entries(u.status)) if (typeof v === "number") u.rt.st[s] = v * ROUND; // set before the fight began (a curse, a shaken company)
    if (foe && (u.shield || u.shieldDrawn) && u.sp == null) u.sp = RT.P.shieldPts; // his shield's points, kept from clash to clash (Build D)
    if (u.leave != null) { u.rt.leaveAt = R.t + Math.max(1, u.leave - B.round) * ROUND; delete u.leave; }
  }
  function place(R) {
    const B = R.B, p = C.player();
    p.rt.x = 0.3; p.rt.lane = 0;
    const allies = B.units.filter((u) => u.side === "ally");
    // As the layout page: your side on both sides of you, spread over the field.
    allies.forEach((a, i) => { a.rt.x = [0.13, 0.46, 0.59, 0.08][i % 4]; a.rt.lane = backRow(a); });
    // The fallen are left out (a war day's clash: the first pack lying dead put the living off the field, and the clash
    // ended at once, "the pack is broken", before they had walked on; 6 November).
    B.units.filter((u) => u.side === "enemy" && u.hp <= 0).forEach((e) => { e.rt.wave = 0; e.rt.x = 1.2; e.rt.entered = false; e.rt.lane = backRow(e); });
    const foes = B.units.filter((u) => u.side === "enemy" && u.hp > 0);
    // More than two come in packs: two on the field, the rest waiting off it (enc.atOnce: more at once; the dream's three).
    const atOnce = Math.max(2, B.enc.atOnce || 2), gap = atOnce > 2 ? 0.26 / (atOnce - 1) : 0.16;
    foes.forEach((e, i) => {
      e.rt.wave = i < atOnce ? 0 : 1;
      e.rt.x = e.rt.wave ? 1.12 + (i - atOnce) * 0.05 : (atOnce > 2 ? 0.62 : 0.72) + i * gap;
      e.rt.entered = !e.rt.wave && e.rt.x <= 0.97;
      e.rt.lane = backRow(e);
    });
  }

  // Back to the turns after a war day's clash (ui/realtime.js U.startClash): every unit's health, as a share of its
  // health, and its blows as they were on the turns, so the war day's rounds and the next clash start from the same
  // scale (without this each clash scaled the health up again: 6.75 times, then 45 times).
  RT.unscaleUnit = function (u) {
    const t = u._tb; if (!t) return;
    const f = u.maxHp ? u.hp / u.maxHp : 0;
    u.maxHp = t.maxHp; u.hp = u.hp > 0 ? Math.max(1, Math.round(f * t.maxHp)) : 0; u.atk = t.atk;
    delete u._tb;
  };
  RT.unscale = (B) => { for (const u of B.units) RT.unscaleUnit(u); };
  RT.begin = function (B, opts = {}) {
    const R = { B, scale: opts.scale || RT.SCALE, t: 0, n: 0, seen: 0, sideSeen: {}, over: null, tries: opts.tries || 0, marks: [], fx: [], slow: 0, round: 1, doT: ROUND,
      orders: { friend: "balanced", soldiers: "defend" }, breath: RT.P.breathMax, combo: 0, comboT: -9, buffer: false, roll: 0, rollT: -9, rollDir: 1, block: false, blockT: -9, winded: false,
      kneel: 0, skillCd: 0, salve: null, unseen: 0, double: false, haste: 0, frozen: 0, assist: !!opts.assist, stats: { blows: 0, hits: 0, rolls: 0, dodged: 0, perfect: 0, maxAtk: 0, blocks: 0, blocked: 0, perfectBlocks: 0, parries: 0, partParries: 0, parried: 0, fblocks: 0 },
      skill: null, shots: [], shotN: 0, D: RT.level(K.S), noStrike: !!opts.noStrike, clash: !!opts.clash };
    B.rt = R;
    B.units.forEach((u) => initUnit(R, u));
    place(R);
    const p = C.player();
    if (opts.hp) p.hp = Math.max(1, Math.round(p.maxHp * opts.hp));
    R.shield = !!(C.hasShield && C.hasShield());
    R.blocker = R.shield; // a shield-carrier blocks (RT.P.block*) where the others roll
    R.sp = RT.P.shieldPts; R.spOff = 0; R.cracked = false; // your shield's points; broken, the seconds until a comrade throws one in (Build D)
    R.broken = false; R.ground = []; R.gid = 0; // your shield broken (until you take one up); the shields lying on the field
    // (A war day's clash begins with a whole one: a shield lost in the last clash, the company handed you a fresh one at the
    // orders: ui/realtime.js clashEnd says so.)
    // Shield wall or Guard chosen on the turns (Build D, row 50): no strikes for the clash's first seconds, the shield held up for you.
    R.strikeLock = R.clash && !R.noStrike && (p.status.wall || p.status.guard) ? RT.P.strikeLock : 0;
    const id = RT.SKILL[K.S.path];
    R.skill = id && p.abilities.includes(id) ? id : null;
    // Wrap the fight's status call so every effect that lasts rounds lasts about 4 s a round here.
    const status = B.status;
    B.status = function (t, s, dur, text) { status.call(B, t, s, dur, text); if (t && t.rt && t.hp > 0) t.rt.st[s] = Math.max(t.rt.st[s] || 0, dur * ROUND); };
    R.base = { round: B.round };
    return R;
  };

  // ---------- Helpers on the ground ----------
  const dist = (a, b) => Math.abs(a.rt.x - b.rt.x);
  const rowGap = (a, b) => Math.abs(a.rt.lane - b.rt.lane);
  const ROWCUT = 0.25 * BODY; // reach lost for each row between
  // Two figures of one side, in any row, stand at least this far apart (a fraction of the field): drawn, a
  // figure is about a sixth of an upright phone's width, so this keeps them overlapping a quarter at most.
  const APART = 0.14;
  const NEAR = 0.62 * BODY;
  const quakeR = (u) => Math.max(1.6 * BODY, u.rt.reach + 0.5 * BODY); // the ground-shaker's ring: a little past the weapon's reach
  const FACE = 0.11;          // you and a foe in your row, face to face (drawn, about a third of a body overlapping)
  // Two who fight stand where the one striking reaches the other with his weapon's tip, not body to body:
  // you stop short of a foe by your weapon's reach, a foe walks no nearer to you than his.
  const standOff = (a, b) => Math.max(FACE, a.rt.reach * 0.88);
  const SPACE = 0.84, BACKSTEP = 0.6; // a blow lands at no less than 0.84 of the striker's reach (less a quarter body a row); the step back, field widths a second
  // How near two who fight may stand: the longer weapon's stand-off, less a quarter body for each row between (never stacked).
  const gapTo = (a, b) => { const g = rowGap(a, b); return g < 0.5 ? Math.max(standOff(a, b), standOff(b, a)) : Math.max(0.5 * BODY, 0.88 * (Math.max(a.rt.reach, b.rt.reach) - ROWCUT * g)); };
  function toRow(u, row, dt) { const d = row - u.rt.lane; if (Math.abs(d) > 1e-3) u.rt.lane += sign(d) * Math.min(Math.abs(d), 2.5 * dt); }
  // Keep a unit clear of the others standing in its row.
  function keepApart(R, u, x, dt, list) {
    for (const o of list) {
      if (o === u || o.hp <= 0 || !o.rt || (o.side === "enemy" && !o.rt.entered)) continue;
      if (Math.abs(o.rt.lane - u.rt.lane) >= 0.5) continue; // a body in another row is no obstacle
      if (o.side === "player" && u.side !== "enemy") continue; // your side passes you (as you pass them)
      const g = o.rt.x - x;
      if (Math.abs(g) >= APART) continue;
      if (Math.abs(o.rt.x - u.rt.x) >= APART) x = o.rt.x - sign(o.rt.x - u.rt.x) * APART; // walking up to it: stop at its side
      else { // already too close: ease apart (inward, if pressed against an edge)
        let dir = Math.abs(g) > 1e-4 ? -sign(g) : u.rt.idx > o.rt.idx ? 1 : -1;
        if ((x > 0.93 && dir > 0) || (x < 0.07 && dir < 0)) dir = -dir;
        x += dir * 0.35 * dt;
      }
    }
    return x;
  }
  // Foes wait in rows 1 and 2; your side stands in the two rows you are not in.
  const backRow = (u) => {
    if (u.side === "enemy") return u.rt.sideIdx % 2 ? 2 : 1;
    const p = C.player(), mine = p && p.rt ? Math.round(p.rt.lane) : 0, free = [0, 1, 2].filter((r) => r !== mine);
    return free[u.rt.sideIdx % 2 ? 1 : 0];
  };
  const onField = (u) => u.rt.x >= 0.04 && u.rt.x <= 0.96;
  function foesNear(R, x, face, reach, from) {
    const p = C.player(), cut = (e) => reach - ROWCUT * Math.abs(e.rt.lane - p.rt.lane);
    return living(R.B, "enemy").filter((e) => e.rt.entered && (face == null ? Math.abs(e.rt.x - x) <= cut(e) : (e.rt.x - x) * face > -BODY * 0.3 && (e.rt.x - x) * face <= cut(e)))
      .sort((a, b) => Math.abs(a.rt.x - (from == null ? x : from)) - Math.abs(b.rt.x - (from == null ? x : from)));
  }
  function nearestFoe(R, x) { return living(R.B, "enemy").filter((e) => e.rt.entered).sort((a, b) => Math.abs(a.rt.x - x) - Math.abs(b.rt.x - x))[0] || null; }
  RT.attacking = (R) => living(R.B, "enemy").filter((e) => e.rt.atk).length;
  // How many foes are left to beat, a band counting as its bodies (the running count).
  RT.count = (R) => living(R.B, "enemy").reduce((n, e) => n + (e.plural ? Math.max(1, Math.ceil(e.rt.bodies * e.hp / e.maxHp)) : 1), 0);
  RT.packs = (R) => { const all = R.B.units.filter((u) => u.side === "enemy"); const waves = Math.max(...all.map((e) => e.rt.wave || 0)) + 1; const now = Math.max(0, ...living(R.B, "enemy").filter((e) => e.rt.entered).map((e) => e.rt.wave || 0)) + 1; return { now: Math.min(now, waves), of: waves }; };
  const ready = (id) => { const row = C.available().find((a) => a.id === id); return !!row && !row.why; };
  // In a swing (Build D, row 48): from the press until the blow's full length has passed, no Block, no Roll, no parry.
  const swinging = (p) => !!(RT.P.swingLock && p && p.rt && (p.rt.busy > 0 || p.rt.blow));
  RT.swinging = () => swinging(C.player());
  // Shield-carriers block; the others, and a shield-carrier whose shield is broken (until he takes up another), roll.
  RT.rolls = (R) => !R.blocker || !!R.broken;
  RT.can = function (R, what) {
    const p = C.player();
    if (!p || R.over || p.hp <= 0) return false;
    switch (what) {
      case "roll": return RT.rolls(R) && R.roll <= 0 && R.kneel <= 0 && R.breath >= RT.P.rollMin && !held(p) && !swinging(p);
      case "block": return R.blocker && !R.broken && (R.block || (R.roll <= 0 && R.kneel <= 0 && !R.winded && R.breath >= RT.P.blockMin && !swinging(p))) && !held(p) && R.frozen <= 0;
      case "skill": return !R.noStrike && !(R.strikeLock > 0) && !!R.skill && R.skillCd <= 0 && R.kneel <= 0 && !held(p);
      case "strike": return !R.noStrike && !(R.strikeLock > 0);
      case "herbs": return RT.can(R, "herbsSoon") && !swinging(p);
      // Herbs as soon as your swing (or the skill) has ended: chosen mid-swing, they wait for it (the Aid sheet offers them).
      case "herbsSoon": return R.kneel <= 0 && (R.herbCd || 0) <= 0 && p.abilities.includes("herbs") && (K.S.items.herbs || 0) > 0 && p.hp < p.maxHp;
      case "call": return p.abilities.includes("call") && ready("call");
      case "vanish": return RT.vanishOffer(R) && !!K.vanishReady(K.S) && !(R.unseen > 0) && R.kneel <= 0;
      case "withdraw": return C.canFlee();
      default: return false;
    }
  };
  // The divine weapons on offer, each with why it cannot be spoken now (C.available, abilities.js K.astraWhy); R: after a
  // mantra traced wrong (ui/mantra.js) the weapons wait RT.P.mantraRest seconds.
  RT.astras = function (R) {
    const p = C.player(); if (!p) return [];
    const rest = R && R.astraRest > R.t ? Math.ceil(R.astraRest - R.t) : 0;
    return C.available().filter((a) => K.isAstra(a.id)).map((a) => (rest && !a.why ? Object.assign({}, a, { why: K.tr("The mantra broke: again in {n} s", { n: rest }), short: K.tr("again in {n} s", { n: rest }) }) : a));
  };
  // Antardhana under Aid (stage 3): not in a dream, as the young fighter, or holding a champion on a war day.
  RT.vanishOffer = (R) => !!(K.S && K.S.boons.includes("antardhana") && K.vanishReady && !K.S.fighter && !(R && R.B && R.B.enc && (R.B.enc.dream || (R.B.enc.hold && K.astraChampion && K.astraChampion(R.B.units)))));
  RT.spareable = (R) => { const p = C.player(); return C.spareable().filter((e) => dist(p, e) <= Math.max(BODY * 1.6, p.rt.reach + 0.2 * BODY)); };

  // ---------- The player ----------
  function playerAct(R, a) {
    const B = R.B, p = C.player();
    if (a.orders) Object.assign(R.orders, a.orders);
    // A step between the rows (W/S, a swipe): short, and not into a row where a foe stands right beside you.
    if (a.row && !R.rowTo && R.roll <= 0 && R.kneel <= 0 && !held(p)) {
      const to = Math.round(p.rt.lane) + sign(a.row);
      if (to >= 0 && to <= 2) {
        const block = living(B, "enemy").find((e) => e.rt.entered && Math.abs(e.rt.lane - to) < 0.5 && dist(e, p) < NEAR);
        if (block) R.fx.push({ k: "blocked", uid: block.uid }); else { R.rowTo = to; R.fx.push({ k: "row", to }); }
      }
    }
    if (a.withdraw && C.canFlee()) { C.flee(); return; }
    // The clash's opening after Shield wall or Guard (Build D): no strikes; a shield-carrier's shield is held up for him.
    if (R.strikeLock > 0) { a = Object.assign({}, a, { strike: false, skill: false }); if (R.blocker && !R.broken) a.block = true; }
    // Block: held up while the input holds it (and breath lasts); lowered when let go.
    if (R.block && (!a.block || !RT.can(R, "block"))) lowerShield(R);
    else if (!R.block && a.block && RT.can(R, "block")) raiseShield(R);
    if (a.spare) { const t = RT.spareable(R).find((e) => e.uid === a.spare); if (t) { if (t.rt.atk) cancel(R, t); C.spare(t.uid); R.fx.push({ k: "spared", uid: t.uid }); return; } }
    if (held(p) || R.frozen > 0) return;
    if (a.call && RT.can(R, "call")) { C.core.use(p, "call", null); R.fx.push({ k: "call" }); }
    if (a.vanish && RT.can(R, "vanish")) {
      K.S.vanishedAct = K.S.act; R.unseen = 2; R.boonBlow = 1.5; R.fx.push({ k: "unseen" });
      B.tell("You speak the Gandharva's word and are gone from their eyes.");
      living(B, "enemy").forEach((e) => { if (e.rt.atk && e.rt.atk.on === p.uid) cancel(R, e); });
    }
    // A mantra traced wrong (ui/mantra.js): nothing happens, no use is spent, and the weapons wait a while.
    if (a.astraFail) { R.astraRest = R.t + RT.P.mantraRest; B.say("The mantra breaks on your tongue. The weapon does not come."); R.fx.push({ k: "fizzle", id: a.astraFail }); }
    if (a.astra) {
      const row = RT.astras(R).find((x) => x.id === a.astra && !x.why);
      if (row) {
        const ab = K.ABILITIES[row.id];
        const t = ab.target === "enemy" ? nearestFoe(R, p.rt.x) : null;
        if (ab.target !== "enemy" || t) {
          B.astraOut = null;
          const before = new Map(B.units.map((u) => [u.uid, u.hp]));
          C.core.use(p, row.id, t ? t.uid : null);
          R.frozen = 2.4; // the moment: the fight stands still
          // (Its blow is a share of each foe's health here as on the turns: abilities.js K.astraFell. No rescaling.)
          const struck = B.units.filter((u) => u.side === "enemy" && u.rt && before.get(u.uid) > u.hp), dealt = {};
          struck.forEach((u) => { dealt[u.uid] = before.get(u.uid) - u.hp; });
          // Ordinary foes struck by it are thrown off their feet (knocked flying, and down a while) when the moment ends.
          R.astraKnock = struck.map((u) => u.uid);
          R.fx.push({ k: "astra", id: row.id, out: B.astraOut, struck: struck.map((u) => u.uid), dealt });
          living(B, "enemy").forEach((e) => { if (e.rt.atk && (e.status.stun || e.status.asleep || e.status.bound)) cancel(R, e); });
        }
      }
    }
    if (a.roll && RT.can(R, "roll")) {
      R.roll = RT.P.roll; R.rollT = R.t; R.breath -= RT.P.rollCost * tireCost(); R.stats.rolls++; R.readN = 0;
      R.rollDir = a.rollDir || a.move || -p.rt.face || -1;
      p.rt.busy = 0; R.buffer = false; R.combo = 0; R.kneel = 0;
      R.fx.push({ k: "roll" });
    }
    if (a.herbs && R.roll <= 0 && !R.block) { if (RT.can(R, "herbs")) { R.kneel = RT.kneelT(); R.buffer = false; R.herbsLater = false; R.fx.push({ k: "kneel" }); } else if (RT.can(R, "herbsSoon")) R.herbsLater = true; }
    if (R.noStrike) { a.strike = false; a.skill = false; } // a storm's clash (weather): nothing to strike at; block, roll and live
    if (a.skill && RT.can(R, "skill") && R.roll <= 0 && !R.block && p.rt.busy <= 0.05) skill(R);
    if (a.strike && R.roll <= 0 && R.kneel <= 0 && !R.block) { // no blow with the shield up
      if (parry(R)) { /* your blade met his */ }
      else if (p.rt.busy > 0) R.buffer = true; // a press during a blow is kept for the next
      else blow(R);
    }
  }
  // The parry (RT.P.parry): Strike pressed as a foe's blade comes down on you. The soonest such blow is met: with a blade, a
  // mace, a spear, a staff, it stops dead and he reels back; with a dagger or empty hands a heavy blow (or a mace's smash) is
  // only half stopped. Not an arrow, not a blow that sweeps all around him, not a feint still to come.
  const PARRY_WITH = new Set(["sword", "woodsword", "mace", "spear", "staff", "club", "hammer", "dagger", "fist"]), LIGHT = new Set(["dagger", "fist"]);
  RT.canParry = () => { const p = C.player(); return !!(p && p.rt && PARRY_WITH.has(p.rt.weapon)); };
  RT.parryable = function (R, e, win) {
    const a = e.rt.atk, p = C.player();
    if (!a || a.ranged || a.area || a.feint || e.hp <= 0) return false;
    if (RT.who(e) === "supratika") return false; // the elephant's charge (stage 2)
    const left = a.land - R.t;
    if (left < -STEP || left > win) return false;
    const m = RT.markOf(R, e);
    return !!(m && inside(m, p) && rowGap(e, p) <= RT.P.blockRows && dist(e, p) <= Math.max(p.rt.reach, e.rt.reach) + LUNGE + 0.2 * BODY);
  };
  function parry(R) {
    const p = C.player();
    if (!RT.canParry() || R.noStrike) return false;
    // No parry mid-swing (Build D, row 48: "a swing is locked until it ends"; until then a blow not yet landed could be
    // broken off to meet his blade). Only with your weapon free.
    if (swinging(p)) return false;
    const own = null;
    const win = RT.parryWin() * R.D.perfect + STEP;
    const e = living(R.B, "enemy").filter((x) => RT.parryable(R, x, win)).sort((x, y) => x.rt.atk.land - y.rt.atk.land)[0];
    if (!e) return false;
    const a = e.rt.atk, P = RT.P;
    p.rt.face = sign(e.rt.x - p.rt.x) || p.rt.face;
    p.rt.blow = null; p.rt.busy = 0.3; R.combo = 0; R.buffer = false;
    if (LIGHT.has(p.rt.weapon) && (a.heavy || a.arc === "smash")) { // too heavy for a dagger to stop: half of it lands
      if (own) return false; // (not worth breaking off a blow of your own for: in the balance runs it cost the dagger paths dear)
      a.part = P.parryPart; R.stats.partParries++;
      R.fx.push({ k: "parry", uid: e.uid, part: true });
      return true;
    }
    R.stats.parries++; R.parryT = R.t;
    cancel(R, e);
    if (!steady(e)) e.rt.stag = Math.max(e.rt.stag, p.rt.weapon === "mace" ? P.parryStagMace : P.parryStag); e.rt.rec = 0;
    R.slow = Math.max(R.slow, 0.6);
    R.fx.push({ k: "parry", uid: e.uid, arc: a.arc || null });
    return true;
  }
  // A named champion (a hero, or one of the epic's people) meets some of your blows with his own weapon: not with a bow or
  // bare hands, not while he winds up a blow of his own, reels or kneels, and not twice in a row (RT.P.parryFoeCd). A heavy
  // blow is met half as often. You are thrown off a moment; he answers soon after.
  function foeParries(R, t, heavy) {
    if (!(t.hero || t.person) || t.rt.atk || t.rt.stag > 0 || t.rt.down > 0 || t.rt.beaten || t.still) return false;
    if (R.t < (t.rt.openUntil || 0)) return false; // still in his own swing's length (Build D)
    if (!PARRY_WITH.has(t.rt.weapon) || t.rt.weapon === "fist" || t.rt.archer) return false;
    // (Stage 2) Drona reads the same combo used three times running, Kripa four, and meets the next for sure; Duryodhana,
    // Balarama's pupil, meets a mace twice as often; Satyaki a sword or a spear half as often again.
    const w = RT.who(t), p = C.player(), read = w === "drona" ? 3 : w === "kripa" ? 4 : 0, sure = read > 0 && (R.readN || 0) >= read;
    if (!sure && R.t - (t.rt.parriedAt || -99) < RT.P.parryFoeCd) return false;
    if (t.rt.face !== -p.rt.face) return false;
    const pw = p.rt.weapon, more = w === "duryodhana" && pw === "mace" ? 2 : w === "satyaki" && (pw === "sword" || pw === "spear") ? 1.5 : 1;
    if (!sure && K.rng() >= (R.D.parryFoe || 0) * more * (heavy ? 0.5 : 1)) return false;
    if (sure) { R.readN = 0; traitTip(R, w); } else if (more > 1) traitTip(R, w);
    t.rt.parriedAt = R.t; R.stats.parried++;
    p.rt.busy = Math.max(p.rt.busy, RT.P.parriedBusy); R.combo = 0; R.buffer = false;
    t.rt.cool = Math.min(t.rt.cool, 0.25);
    R.fx.push({ k: "parried", uid: t.uid });
    return true;
  }
  // A foe's shield (RT.P.fblock*): returns how much of your blow gets through (1: not caught). Not while he winds up,
  // reels, kneels or is beaten; only facing you; not again until fblockCd has passed. Caught, he holds the shield and
  // then lowers it (rt.rec: no step and no blow from him), and waits a breath more before he winds up (rt.cool).
  function foeBlocks(R, t, heavy, arrow, pts) {
    if (!(t.shield || t.shieldDrawn) || t.hp <= 0 || t.rt.atk || t.rt.stag > 0 || t.rt.down > 0 || t.rt.beaten || t.still) return 1;
    if (R.t < (t.rt.openUntil || 0)) return 1; // still in his own swing's length (Build D)
    if (R.t - (t.rt.fblockAt == null ? -99 : t.rt.fblockAt) < RT.P.fblockCd) return 1;
    const p = C.player(); if (t.rt.face !== -p.rt.face) return 1;
    if (K.rng() >= RT.P.fblock * (R.D.glance || 1) * (heavy ? 0.7 : 1) * (arrow ? 0.7 : 1)) return 1;
    const rec = RT.P.fblockRec * (R.D.rest || 1);
    t.rt.fblockAt = R.t; t.rt.opening = true; R.stats.fblocks = (R.stats.fblocks || 0) + 1; // (the opening: until he is free to act again)
    t.rt.rec = Math.max(t.rt.rec || 0, rec); t.rt.cool = Math.max(t.rt.cool || 0, 0.25);
    R.fx.push({ k: "fblock", uid: t.uid, heavy: !!heavy, arrow: !!arrow, rec });
    if (pts > 0) shieldTakes(R, t, pts);
    return heavy ? RT.P.fblockHeavy : RT.P.fblockLight;
  }
  // A shield takes a blow's points (Build D): cracked at half, broken at none. Yours broken, you roll until you take up
  // another off the ground (takeUp); a foe fights on without his for the rest of the fight.
  function shieldTakes(R, u, pts) {
    const P = RT.P, mine = u.side === "player";
    if (mine && boon("charm_shield")) return; // the charmed shield cannot be broken (stage 3)
    const before = mine ? R.sp : u.sp == null ? P.shieldPts : u.sp, after = Math.max(0, before - pts);
    if (mine) R.sp = after; else u.sp = after;
    R.stats.shieldPts = (R.stats.shieldPts || 0) + pts;
    if (after <= 0) {
      R.stats.shieldsBroken = (R.stats.shieldsBroken || 0) + 1;
      if (mine) { R.broken = true; R.spOff = P.shieldBack; R.cracked = false; if (R.block) lowerShield(R); R.stats.myShieldBroken = (R.stats.myShieldBroken || 0) + 1; }
      else { u.shield = false; u.shieldDrawn = false; u.shieldBroken = true; }
      R.fx.push({ k: "shieldbreak", uid: u.uid, mine });
    } else if (after <= P.shieldPts / 2 && before > P.shieldPts / 2) R.fx.push({ k: "shieldcrack", uid: u.uid, mine });
  }
  RT.shieldTakes = shieldTakes;
  // ---------- Shields on the ground (owner, 7 November) ----------
  // Who lets a shield fall when he falls: a foe whose shield is whole; one of your side the screen draws with one (RT.allyShield,
  // set by ui/realtime.js: the company's soldiers). Not you: your fight is over.
  RT.allyShield = null;
  RT.dropsShield = (u) => !!u && u.side !== "player" && (u.side === "enemy" ? !!(u.shield || u.shieldDrawn) && !u.shieldBroken : !!(RT.allyShield && RT.allyShield(u)));
  // A shield put on the ground: where it lies (inside the edges you can walk to), whose it was, from when it can be taken up
  // (at: once it has landed). Too many lying about: the oldest that fell from a soldier goes (a comrade's throw stays).
  function lay(R, g) {
    g.id = ++R.gid; g.x = clamp(g.x, EDGE + 0.005, 1 - EDGE - 0.005); g.t = R.t;
    R.ground.push(g);
    while (R.ground.length > RT.P.groundMax) { const i = R.ground.findIndex((o) => o.kind === "fallen"); if (i < 0) break; R.fx.push({ k: "shieldgone", id: R.ground[i].id }); R.ground.splice(i, 1); }
    return g;
  }
  // A fallen soldier's shield slides off his arm and lies just behind where he fell (his weapon falls the other way).
  function dropShield(R, u) {
    if (!RT.dropsShield(u) || !u.rt) return;
    const g = lay(R, { kind: "fallen", from: u.uid, x: u.rt.x - RT.fallDir(u) * 0.3 * BODY, lane: u.rt.lane, at: R.t + 0.5 });
    R.fx.push({ k: "shielddrop", uid: u.uid, id: g.id, x: g.x, lane: g.lane });
  }
  // shieldBack seconds after yours broke (and none taken up since): a comrade throws one in at your side's edge.
  function throwIn(R) {
    if (R.ground.some((g) => g.kind === "thrown")) return;
    const g = lay(R, { kind: "thrown", x: RT.P.throwX, lane: 0, at: R.t + 0.6 });
    R.fx.push({ k: "shieldthrown", id: g.id, x: g.x, lane: g.lane, kind: "thrown" });
  }
  // The nearest shield that has landed, for the bot and the screen's pointer.
  RT.nearestShield = function (R, x) {
    let best = null;
    for (const g of R.ground || []) if (R.t >= g.at && (!best || Math.abs(g.x - x) < Math.abs(best.x - x))) best = g;
    return best;
  };
  // Without a shield, walking (or rolling) within pickupR of a body over one that has landed takes it up: a whole one.
  function takeUp(R, p) {
    if (!R.broken || held(p)) return;
    const g = (R.ground || []).find((o) => R.t >= o.at && Math.abs(o.x - p.rt.x) <= RT.P.pickupR * BODY);
    if (!g) return;
    R.ground.splice(R.ground.indexOf(g), 1);
    R.broken = false; R.spOff = 0; R.sp = RT.P.shieldPts; R.cracked = false;
    R.stats.shieldsTaken = (R.stats.shieldsTaken || 0) + 1;
    R.fx.push({ k: "shieldup", uid: p.uid, id: g.id, kind: g.kind });
  }
  // Your blows: three quick ones, the third heavy and knocking back; with the mace (owner, 4 November: heavy and slow) two
  // big ones, each with a long wind-up: an overhead smash (over the shoulder, down onto the head and shoulders; it
  // staggers) and a side sweep that knocks back. About the same weight a second either way (2.29 in 1.30 s; 2.3 in 1.36 s).
  // (A blade's blows land a little after the press, so their wind-up reads: 0.22 s, the thrust 0.3 s; the same weight a second.)
  const COMBO = [{ m: 0.62, land: 0.22, len: 0.34 }, { m: 0.62, land: 0.22, len: 0.34 }, { m: 1.05, land: 0.3, len: 0.62, heavy: true, knock: 0.4 }];
  const MACE_COMBO = [{ m: 1.3, land: 0.4, len: 0.72, heavy: true, arc: "smash", stag: 0.5 }, { m: 1.0, land: 0.34, len: 0.64, heavy: true, arc: "sweep", knock: 0.6 }];
  // An archer's Strike looses arrows from the bow: quick, quick, and a heavier third that knocks back.
  const BOW_COMBO = [{ m: 0.62, land: 0.16, len: 0.36, shot: true }, { m: 0.62, land: 0.16, len: 0.36, shot: true }, { m: 1.05, land: 0.26, len: 0.6, heavy: true, knock: 0.4, shot: true }];
  // The dagger's own set (Build D, row 48): four quick stabs and a heavy fifth that knocks back; about the sword's weight a
  // second, with a person's gap between presses (more presses, each shorter), and the shortest lock of any weapon.
  const DAGGER_COMBO = [0, 1, 2, 3].map(() => ({ m: 0.48, land: 0.15, len: 0.24 })).concat([{ m: 0.95, land: 0.24, len: 0.48, heavy: true, knock: 0.4 }]);
  // The spear's (owner, 9 Nov: the charioteer's, and the strategist's if he chooses it): two thrusts and a heavy lunge that
  // knocks back, from the longest reach; each thrust a little slower to come back than a sword's cut (0.36 s against
  // 0.34 s), at about the sword's weight a second (2.42 in 1.34 s against 2.29 in 1.30 s). (Measured: the first try, at
  // 0.4 s a thrust and 1.70 a second, cost the charioteer 2 points of his win rate over 1,500 lives.)
  const SPEAR_COMBO = [{ m: 0.66, land: 0.24, len: 0.36 }, { m: 0.66, land: 0.24, len: 0.36 }, { m: 1.1, land: 0.3, len: 0.62, heavy: true, knock: 0.5 }];
  RT.comboOf = (R) => { const w = C.player() && C.player().rt && C.player().rt.weapon; return w === "mace" ? MACE_COMBO : w === "bow" ? BOW_COMBO : w === "dagger" ? DAGGER_COMBO : w === "spear" ? SPEAR_COMBO : COMBO; };
  // The blow a press would start now (the combo goes on, or begins again after a pause).
  RT.nextBlow = (R) => { const list = RT.comboOf(R); return list[R.t - R.comboT > 0.55 || R.combo >= list.length ? 0 : R.combo]; };
  function blow(R) {
    const p = C.player(), list = RT.comboOf(R);
    if (R.t - R.comboT > 0.55 || R.combo >= list.length) { if (R.combo !== 0) R.readN = 0; R.combo = 0; }
    if (R.combo === 0 && R.t - (R.comboEnd || -9) > 1.0) R.readN = 0; // (stage 2: a pause between combos, and Drona cannot read you)
    const c = list[R.combo];
    const f = nearestFoe(R, p.rt.x); if (f) p.rt.face = sign(f.rt.x - p.rt.x);
    if (c.shot) return bowShot(R, c, list);
    p.rt.busy = c.len; p.rt.blow = { c, at: R.t + c.land, n: R.combo };
    R.combo = (R.combo + 1) % list.length; R.comboT = R.t + c.len;
    if (R.combo === 0) { R.readN = (R.readN || 0) + 1; R.comboEnd = R.t + c.len; } // a whole combo, the same again (Drona and Kripa read it)
    R.fx.push({ k: "blow", n: p.rt.blow.n, arc: c.arc || null, land: c.land, last: R.combo === 0, heavy: !!c.heavy });
  }
  // An arrow of the combo: down the lane at the first foe in front within RT.SHOOT (a foe right on top of you: half a step
  // back first, then the shot).
  function bowShot(R, c, list) {
    const p = C.player(), face = p.rt.face;
    const near = foesNear(R, p.rt.x, face, 0.7 * BODY)[0];
    if (near && Math.abs(near.rt.x - p.rt.x) < 0.7 * BODY) { p.rt.x = clamp(p.rt.x - face * 0.5 * BODY, EDGE, 1 - EDGE); R.fx.push({ k: "stepback" }); }
    // Two arrows to a press (owner, 6 November: "we should make the archers stronger"; "maybe they shoot 2 arrows at a
    // time"): the first at the first foe in front, the second a moment later at the next foe in front within range, at
    // RT.P.bowSecond of a blow; a lone foe takes both, each at RT.P.bowSecond (so about 1.6 of a blow on one foe, 1.8
    // over two). Only the first can knock back; every arrow that lands pushes its foe back a little (RT.P.arrowPush).
    const inLane = foesNear(R, p.rt.x, face, RT.SHOOT), t = inLane[0], t2 = inLane[1] || null;
    const k2 = RT.P.bowSecond;
    const one = (on, m, knock, dt) => {
      const lane = on ? on.rt.x : clamp(p.rt.x + face * RT.SHOOT, 0, 1), t0 = R.t + c.land + dt;
      const shot = { by: p.uid, side: "player", id: "arrows", m, knock, on: on ? on.uid : null, lane, from: p.rt.x, t0, arrive: t0 + Math.max(0.06, Math.abs(lane - p.rt.x) / (ARROW_SPEED * 1.4)), heavy: !!c.heavy && !dt, n: ++R.shotN, combo: R.combo };
      R.shots.push(shot); R.fx.push({ k: "shot", uid: p.uid, shot, second: !!dt });
    };
    one(t, t2 ? c.m : c.m * k2, c.knock || 0, 0);
    one(t2 || t, c.m * k2, 0, RT.P.bowGap);
    p.rt.busy = c.len; R.stats.blows++;
    R.combo = (R.combo + 1) % list.length; R.comboT = R.t + c.len;
  }
  // The shield: raised to face the blow coming soonest (else the nearest foe), lowered when let go or winded.
  function raiseShield(R) {
    const p = C.player();
    R.block = true; R.blockT = R.t; R.stats.blocks++; R.readN = 0;
    p.rt.blow = null; p.rt.busy = 0; R.buffer = false; R.combo = 0;
    faceThreat(R);
    R.fx.push({ k: "shield", up: true });
  }
  function lowerShield(R, winded) {
    R.block = false;
    if (winded) { R.winded = true; R.fx.push({ k: "winded" }); }
    R.fx.push({ k: "shield", up: false });
  }
  function faceThreat(R) {
    const p = C.player(), th = RT.threats(R)[0], f = th ? null : nearestFoe(R, p.rt.x);
    if (th && Math.abs(th.from - p.rt.x) > 1e-4) p.rt.face = sign(th.from - p.rt.x);
    else if (f) p.rt.face = sign(f.rt.x - p.rt.x);
  }
  // Worn down (the strike and defence study, item 13; owner, 8 November: "yes, fix it"): a weak fighter (a healer with a
  // dagger: about 3 points a blow) against the supply carts' two sentries (695 health each, scaled up from the turns) did not
  // finish them in the 4-minute cap, however he played. A floor under every blow was tried first: a share of the foe's
  // health (1%) lifted every blow on the strongest foes too (the hard fights went from 88% won to 94%), and a few points (5)
  // still left the healer capped in 32 of 32 bouts. So the floor comes only in a fight already long: after two minutes (an
  // ordinary fight lasts 30-60 s) the ordinary foes tire, and every blow of yours that lands on one takes at least 3% of his
  // whole health by its weight (a dagger's stab 1.4%, a sword's thrust 3%). A champion never tires; a blow that does more is
  // unchanged; a blow turned (evaded, parried) does nothing still. Said once, when it begins. A fight may say sooner (RT.TUNE
  // worn, wornFloor: the crossing's three men of your own file, who want you back, not dead, tire after a minute, and then
  // every blow that lands takes at least 8% of one by its weight: the healer's dagger ran them to the cap. Build D, 11 November).
  RT.P.wornAfter = 120; RT.P.wornFloor = 0.03;
  function floored(R, t, d, m) {
    if (!(d > 0) || !t || t.hp <= 0 || !t.maxHp || R.t < ((RT.TUNE[R.B.enc.id] || {}).worn || RT.P.wornAfter) || t.hero || t.person) return d;
    const f = Math.round(t.maxHp * ((RT.TUNE[R.B.enc.id] || {}).wornFloor || RT.P.wornFloor) * m);
    if (d >= f) return d;
    if (!R.worn) { R.worn = true; R.fx.push({ k: "toast", s: "They are tiring: your blows tell more now." }); }
    const more = Math.min(t.hp, f - d); t.hp -= more; return d + more;
  }
  function landBlow(R) {
    const B = R.B, p = C.player(), b = p.rt.blow;
    p.rt.blow = null;
    const t = foesNear(R, p.rt.x, p.rt.face, p.rt.reach + LUNGE)[0]; // your blow carries a step forward, as a foe's does
    R.stats.blows++;
    if (!t) return;
    if (t.decoy) { vanish(R, t); return; } // only an illusion (Ghatotkacha, stage 2)
    if (t.rt.wheelUntil > R.t && !R.struckWheel) { // Karna at his sunken wheel (stage 2): the story remembers it
      R.struckWheel = true;
      K.apply({ flag: "struck_karna_wheel", duty: { conscience: -2 }, journal: "On the seventeenth day you struck Karna while he bent to free his sunken wheel." });
      if (K.breakTags) K.breakTags(["strike_unarmed"]);
    }
    if (foeParries(R, t, b.c.heavy)) return;
    let m = b.c.m;
    if (R.double) { m *= 2; R.double = false; }
    if (R.boonBlow) { m *= R.boonBlow; R.boonBlow = 0; } // the first blow out of Antardhana (stage 3)
    // A foe with a shield catches some of your blows on it, and must lower it before he can strike (foeBlocks); the blow
    // takes points off the shield by your tier and weapon (Build D).
    const caught = foeBlocks(R, t, b.c.heavy, false, RT.shieldHit(p, p.rt.weapon, b.c.heavy && !b.c.arc));
    m *= caught;
    const d = floored(R, t, B.hit(p, t, m), m);
    R.stats.hits++;
    hitFx(R, t, d, b.c.heavy, p, true, b.c.arc, caught < 1);
    if (b.c.heavy && caught === 1) giftsOnHeavy(R, t, d);
    if (b.c.knock && t.hp > 0) knock(R, t, p.rt.face, b.c.knock * BODY, false);
    if (steady(t)) { if (b.c.stag || b.c.heavy) traitTip(R, "kripaSteady"); }
    else if (b.c.stag && t.hp > 0 && !t.rt.atk) t.rt.stag = Math.max(t.rt.stag, b.c.stag);
    // A light blow flinches a soldier, a captain sometimes, a champion never (only heavy blows stagger him: Build D).
    else if (!b.c.heavy && caught === 1 && t.hp > 0 && !t.rt.atk && K.rng() < RT.STRENGTH.flinch[RT.tierOf(t)]) t.rt.stag = Math.max(t.rt.stag, RT.P.lightStag);
    t.rt.hits.push(R.t);
  }
  // Knocked back: a foe winding up keeps its blow (it lunges after you); knocked down, it loses it.
  function knock(R, u, dir, dx, down) {
    if (down && u.rt.atk) cancel(R, u);
    u.rt.x = clamp(u.rt.x + dir * dx, 0.07, 0.93);
    if (!u.rt.atk && !steady(u)) u.rt.stag = Math.max(u.rt.stag, 0.3);
    if (down) u.rt.down = Math.max(u.rt.down, 1.2);
  }
  // The divine weapon's struck foes, thrown away from you as its moment ends (the screen plays the throw then).
  function astraThrow(R) {
    const p = C.player(), ids = R.astraKnock || []; R.astraKnock = null;
    for (const id of ids) {
      const u = R.B.units.find((x) => x.uid === id); if (!u || !u.rt) continue;
      const x0 = u.rt.x; knock(R, u, sign(u.rt.x - p.rt.x), 1.1 * BODY, true); u.rt.down = Math.max(u.rt.down, 2.2); u.rt.flung = R.t;
      R.fx.push({ k: "thrown", uid: id, dx: u.rt.x - x0 });
    }
  }
  // Which way a figure falls (owner, 8 November, the strike and defence study: the fallen toppled toward the middle of the field,
  // so a foe cut down by you fell onto you and lay under your feet): away from the blow that felled him (with no blow
  // remembered, toward the middle), if the field has room for him lying (RT.fallLen, field widths: the screen sets it from the
  // figures' size). Decided once, at the fall (his shield drops on the other side: dropShield).
  RT.fallLen = 0.3;
  RT.fallDir = (u) => {
    if (!u || !u.rt) return 1;
    if (u.rt.fdir) return u.rt.fdir;
    const mid = u.rt.x > 0.5 ? -1 : 1;
    const away = u.rt.lastFrom != null && Math.abs(u.rt.x - u.rt.lastFrom) > 1e-4 ? sign(u.rt.x - u.rt.lastFrom) : mid;
    // (room: how much of him, lying, would be on the field that way; on a phone a body is nearly half the field long, so
    // he falls away unless that leaves more than 30% of him off it, and only then back over the one who struck him)
    const room = (dir) => { const end = u.rt.x + dir * RT.fallLen, over = Math.max(0, end - 1, -end); return 1 - over / RT.fallLen; };
    const dir = room(away) >= 0.7 ? away : room(-away) >= 0.999 ? -away : room(away) >= room(-away) ? away : -away;
    if (u.hp <= 0) u.rt.fdir = dir;
    return dir;
  };
  // A blow that lands. blocked: taken on a raised shield (yours, or a foe's): the screen shows a clang, not a wound. The one struck
  // remembers where it came from (lastFrom: the striker, or you for a blow with no striker named), so he falls away from it.
  function hitFx(R, t, d, heavy, by, melee, arc, blocked) {
    if (t.rt) t.rt.lastFrom = by && by.rt ? by.rt.x : C.player() && C.player().rt ? C.player().rt.x : null;
    R.fx.push({ k: "hit", uid: t.uid, n: d, heavy: !!heavy, by: by ? by.uid : null, melee: !!melee, arc: arc || null, blocked: !!blocked });
  }
  function skill(R) {
    const B = R.B, p = C.player(), id = R.skill, ab = K.ABILITIES[id];
    R.skillCd = RT.RECHARGE[id] || 10;
    B.acts.push({ uid: p.uid, id, round: B.round });
    R.fx.push({ k: "skill", id });
    const f = nearestFoe(R, p.rt.x); if (f) p.rt.face = sign(f.rt.x - p.rt.x);
    const face = p.rt.face;
    switch (id) {
      case "aimed": { // an arrow down the lane: the first foe in front, out to most of the field
        p.rt.busy = 0.45;
        const t = foesNear(R, p.rt.x, face, 0.75)[0];
        const lane = t ? t.rt.x : clamp(p.rt.x + face * 0.75, 0, 1);
        const shot = { by: p.uid, side: "player", id, on: t ? t.uid : null, lane, from: p.rt.x, t0: R.t + 0.25, arrive: R.t + 0.25 + Math.max(0.1, Math.abs(lane - p.rt.x) / ARROW_SPEED), heavy: true, n: ++R.shotN };
        R.shots.push(shot); R.fx.push({ k: "shot", uid: p.uid, shot });
        break;
      }
      case "quake": { // hits all around and knocks them down
        p.rt.busy = 0.6;
        const ts = foesNear(R, p.rt.x, null, quakeR(p) + 0.1 * BODY);
        if (ts.length) { ab.use(B, p, ts); ts.forEach((t) => { hitFx(R, t, 0, true); if (t.hp > 0) knock(R, t, sign(t.rt.x - p.rt.x), 0.3 * BODY, true); }); }
        break;
      }
      case "ridedown": { // a dash through the foes in front, knocking them down
        const to = clamp(p.rt.x + face * 3 * BODY, EDGE, 1 - EDGE);
        const ts = living(B, "enemy").filter((e) => e.rt.entered && (e.rt.x - p.rt.x) * face > -BODY * 0.2 && (e.rt.x - p.rt.x) * face <= Math.abs(to - p.rt.x) + BODY * 0.4);
        ts.forEach((t) => { ab.use(B, p, t); hitFx(R, t, 0, true); if (t.hp > 0) knock(R, t, -face, 0.2 * BODY, true); });
        p.rt.x = to; R.roll = 0.3; R.rollT = -9; R.rollDir = 0; p.rt.busy = 0.35;
        break;
      }
      case "command": { // friends and soldiers strike your foe together
        p.rt.busy = 0.4;
        const t = f;
        const allies = living(B, "ally").filter((a) => !a.still);
        if (!t) break;
        // Alone (owner, 4 November: the strategist was the weakest path when no one stands beside him): read the field
        // instead, a sharper blow and the foe left open (40% more from every blow) for a round.
        if (!allies.length) { B.status(t, "exposed", 1, "is exposed"); const d = B.hit(p, t, 1.2); hitFx(R, t, d); R.fx.push({ k: "toast", s: "Read the field" }); break; }
        allies.forEach((a) => { B.status(a, "inspired", 2); const d = B.hit(a, t, 1.2, { verb: "On your order, {a} hits {t} for {n}." }); hitFx(R, t, d); });
        break;
      }
      case "salve": { // heals you and the friends near you, over a few seconds
        p.rt.busy = 0.5;
        R.salve = { left: 3, next: R.t + 0.5 };
        break;
      }
      case "vanish": { // unseen for a moment; the next strike lands double
        R.unseen = 1.6; R.double = true;
        B.tell("You slip out of sight.");
        living(B, "enemy").forEach((e) => { if (e.rt.atk && e.rt.atk.on === p.uid) cancel(R, e); });
        break;
      }
      case "song": { // friends and soldiers quicker and stronger for a few seconds
        p.rt.busy = 0.5;
        ab.use(B, p, living(B, "friends"));
        R.haste = 2 * ROUND;
        break;
      }
    }
  }
  function playerStep(R, a) {
    const B = R.B, p = C.player(), P = RT.P, dt = STEP;
    if (R.roll > 0) {
      R.roll -= dt;
      p.rt.x = clamp(p.rt.x + R.rollDir * (1.7 * BODY * RT.rollMul() / P.roll) * dt, EDGE, 1 - EDGE); // a roll can pass a foe
    } else if (R.block) { // the shield held up drains breath; out of breath, it drops
      R.breath -= P.blockDrain * tireCost() * dt;
      if (R.breath <= 0) { R.breath = 0; lowerShield(R, true); }
    } else {
      R.breath = Math.min(P.breathMax, R.breath + breathRegen() * dt);
      if (R.winded && R.breath >= P.rollMin) R.winded = false;
    }
    if (R.unseen > 0) R.unseen -= dt;
    // Build D: without a shield, a comrade throws one in after shieldBack seconds, and you take one up by going to it;
    // Strike comes back after the wall's opening.
    if (R.broken) { if (R.spOff > 0) { R.spOff -= dt; if (R.spOff <= 0) { R.spOff = 0; throwIn(R); } } takeUp(R, p); }
    if (R.strikeLock > 0) { R.strikeLock -= dt; if (R.strikeLock <= 0) { R.strikeLock = 0; R.fx.push({ k: "strikeback" }); } }
    if (R.rowTo != null) { const d = R.rowTo - p.rt.lane; p.rt.lane += sign(d) * Math.min(Math.abs(d), dt / 0.25); if (Math.abs(R.rowTo - p.rt.lane) < 1e-6) { p.rt.lane = R.rowTo; R.rowTo = null; } }
    if (R.skillCd > 0) R.skillCd -= dt;
    if (R.herbCd > 0) R.herbCd -= dt;
    if (R.kneel > 0) {
      R.kneel -= dt;
      if (R.kneel <= 0) { const h0 = p.hp; C.core.use(p, "herbs", p.uid); if (boon("sanjivani") && (K.S.charges || {}).sanjivani && p.hp > h0) p.hp = Math.min(p.maxHp, p.hp + Math.round((p.hp - h0) * 0.5)); delete p.cds.herbs; R.herbCd = 2 * ROUND; R.fx.push({ k: "heal", uid: p.uid }); }
      return;
    }
    if (R.salve && R.t >= R.salve.next) {
      const near = living(B, "friends").filter((u) => !u.still && dist(u, p) <= 2.2 * BODY);
      near.forEach((u) => B.heal(p, u, Math.max(1, Math.round(u.maxHp * 0.28 / 3))));
      R.fx.push({ k: "heal", uid: p.uid });
      R.salve.left--; R.salve.next = R.t + 1;
      if (!R.salve.left) R.salve = null;
    }
    if (p.rt.blow && !p.rt.blow.c.shot) { // your swing keeps its length too: too close to the foe in front, you give ground as you swing
      const f = foesNear(R, p.rt.x, p.rt.face, p.rt.reach + LUNGE)[0];
      if (f) { const want = SPACE * (p.rt.reach - (rowGap(f, p) < 0.5 ? 0 : ROWCUT * rowGap(f, p))), ad = Math.abs(f.rt.x - p.rt.x);
        if (ad < want) {
          // Away from him (he may stand a hair behind you); backed against the edge of the field, you shove him back
          // instead as you swing, as a foe does to you (the 14 lives, 10 November: on a small phone a spear or a dagger
          // backed to the edge landed with the foe on top of you, down to 0.01 of the reach apart).
          const dir = sign(f.rt.x - p.rt.x) || p.rt.face, step = Math.min(want - ad, BACKSTEP * dt), nx = clamp(p.rt.x - dir * step, EDGE, 1 - EDGE);
          const short = step - Math.abs(nx - p.rt.x);
          p.rt.x = nx;
          if (short > 1e-6) f.rt.x = clamp(f.rt.x + dir * short, 0.07, 0.93);
        }
        // Still too close when it should land (he stepped in, or was pushed onto you): the blow waits a moment more while
        // you give ground, as a foe's does (at most 0.2 s; the swing's lock waits with it).
        const b = p.rt.blow;
        if (R.t >= b.at - 1e-6 && Math.abs(f.rt.x - p.rt.x) < want * 0.95 && (b.wait || 0) < 2) { b.at = R.t + 0.1; b.wait = (b.wait || 0) + 1; p.rt.busy += 0.1; }
      }
    }
    if (p.rt.blow && R.t >= p.rt.blow.at) landBlow(R);
    if (p.rt.busy > 0) {
      p.rt.busy -= dt;
      if (p.rt.busy <= 0 && R.buffer) { R.buffer = false; if (!p.rt.blow) blow(R); }
    }
    // Herbs chosen in the middle of a swing or a skill (Build D's swing lock): taken as soon as it has ended.
    if (R.herbsLater && !swinging(p)) { R.herbsLater = false; if (RT.can(R, "herbs") && R.roll <= 0 && !R.block) { R.kneel = RT.kneelT(); R.buffer = false; R.fx.push({ k: "kneel" }); return; } }
    if (held(p) || R.roll > 0) return;
    const mv = a.move || 0;
    if (mv && p.rt.busy <= 0) {
      let x = p.rt.x + mv * p.rt.speed * RT.walkMul() * (R.block ? P.blockWalk : 1) * dt; // behind the shield, slowly
      // Foes block your way; your own side never does.
      for (const e of living(B, "enemy")) {
        if (!e.rt.entered || e.rt.beaten || rowGap(e, p) > 2.5) continue; // a foe in your row blocks your way; one a row over, nearer than his weapon allows
        const g = rowGap(e, p), gap = g < 0.5 ? standOff(p, e) : Math.max(0.5 * BODY, 0.88 * (p.rt.reach - ROWCUT * g)); // your own weapon's length: a long-weapon foe gives ground himself
        if (mv > 0 && p.rt.x <= e.rt.x && x > e.rt.x - gap) x = Math.max(p.rt.x, e.rt.x - gap);
        if (mv < 0 && p.rt.x >= e.rt.x && x < e.rt.x + gap) x = Math.min(p.rt.x, e.rt.x + gap);
      }
      p.rt.x = clamp(x, EDGE, 1 - EDGE);
      if (R.block) faceThreat(R); else p.rt.face = mv; // the shield stays toward the foe as you step
      R.pushing = (p.rt.x <= EDGE + 1e-6 && mv < 0) || (p.rt.x >= 1 - EDGE - 1e-6 && mv > 0);
    } else {
      R.pushing = false;
      if (R.block) faceThreat(R);
      else if (p.rt.busy <= 0) { const f = nearestFoe(R, p.rt.x); if (f) p.rt.face = sign(f.rt.x - p.rt.x); }
    }
  }

  // ---------- Foes ----------
  function cancel(R, u) { u.rt.atk = null; u.rt.cool = Math.max(u.rt.cool, 0.6); }
  function targetable(R, f) {
    if (f.hp <= 0 || f.still) return false;
    if (f.side === "player") return R.unseen <= 0;
    if (f.called || f.person || !f.plural) return R.orders.friend !== "hold" || dist(f, C.player()) < BODY * 1.2;
    return R.orders.soldiers !== "stay";
  }
  function pickTarget(R, e) {
    const fr = living(R.B, "friends").filter((f) => targetable(R, f) && !(RT.who(e) === "bhishma" && /shikhandi/i.test(String(f.name || ""))));
    const cry = fr.find((f) => f.rt && f.rt.cryUntil > R.t);
    if (cry) return cry;
    const taunt = fr.find((f) => f.status.taunt);
    if (taunt) return taunt;
    const p = fr.find((f) => f.side === "player");
    if (p && (K.rng() < 0.65 || fr.length === 1)) return p;
    const others = fr.filter((f) => f !== p).sort((a, b) => dist(a, e) - dist(b, e));
    return others[0] || p || null;
  }
  function chooseMove(R, e, t) {
    const ab = e.abilities, ok = (id) => ab.includes(id) && !(e.rt.cd[id] > 0);
    const far = dist(e, t) > e.rt.reach * 1.3;
    if (ok("quake") && K.rng() < 0.25 && dist(e, t) <= quakeR(e)) return "quake";
    const rangedIds = ab.filter((id) => RANGED.has(id) && ok(id));
    if (e.rt.archer) return rangedIds.find((id) => id !== "arrows" && K.rng() < 0.3) || (ab.includes("arrows") ? "arrows" : rangedIds[0] || ab.find((id) => RANGED.has(id))); // an archer only shoots, near or far
    const close = dist(e, t) <= e.rt.reach + LUNGE * 0.5;
    if (rangedIds.length && !(close && ab.some((id) => MELEE.has(id))) && (e.rt.archer || (far && K.rng() < 0.6))) return rangedIds.find((id) => id !== "arrows" && K.rng() < 0.3) || (ok("arrows") ? "arrows" : rangedIds[0]);
    if ((ok("guard") || ok("brace")) && e.rt.hits.filter((h) => R.t - h < 2).length >= 2 && K.rng() < 0.4) return ok("brace") ? "brace" : "guard";
    const heavy = ab.filter((id) => MELEE.has(id) && id !== "strike" && ok(id));
    if (heavy.length && K.rng() < 0.4) return K.pick(heavy);
    return ab.includes("strike") ? "strike" : ab.find((id) => MELEE.has(id)) || "strike";
  }
  function startAttack(R, e, t) {
    const id = chooseMove(R, e, t), ab = K.ABILITIES[id];
    if (!ab) return;
    if (MELEE.has(id) && dist(e, t) > hitReach(e)) { e.rt.cool = 0.2; e.rt.close = true; return; } // too far for a blow: close in first
    if (ab.target === "self" || ab.target === "ally" || ab.target === "allies") { // a brace, a war cry: at once
      ab.use(R.B, e, ab.target === "self" ? e : ab.target === "ally" ? e : living(R.B, "enemy"));
      if (id === "brace" || id === "guard") R.fx.push({ k: "brace", uid: e.uid });
      if (ab.cd) e.rt.cd[id] = ab.cd * ROUND;
      e.rt.cool = r(0.8, 1.4);
      return;
    }
    const P = RT.P, ranged = RANGED.has(id), area = id === "quake";
    let wind = ranged ? P.track + P.lock : HEAVY.has(id) || area ? P.heavyWind * R.D.wind : e.rt.windup;
    // A mace-bearer's blows: an overhead smash and a side sweep in turn, each wound up long.
    const arc = !ranged && !area && MELEE.has(id) && e.rt.weapon === "mace" ? ((e.rt.arcN = (e.rt.arcN || 0) + 1) % 2 ? "smash" : "sweep") : null;
    if (arc) wind = Math.max(wind, arc === "smash" ? P.maceSmash : P.maceSweep); // heavy and slow at every level (the owner's mace)
    // An archer caught at close quarters draws slowly: time for the one who caught him to strike first (item 14).
    if (ranged && e.rt.archer && t.side === "player" && Math.abs(t.rt.x - e.rt.x) <= t.rt.reach * 1.1) wind += 0.45;
    if (RT.who(e) === "satyaki" && !ranged) wind *= 0.85; // a quick blade (stage 2; never under 0.3 s, below)
    if (e.rt.slowNext) { wind *= e.rt.slowNext; e.rt.slowNext = 0; } // heavy eyes (Sammohana's gift, stage 3): once
    e.rt.face = sign(t.rt.x - e.rt.x);
    e.rt.atk = { id, on: t.uid, t0: R.t, land: R.t + Math.max(0.3, wind), ranged, area, lane: t.rt.x, locked: false, heavy: HEAVY.has(id) || area || arc === "smash", arc };
    // A feint (item 19, later acts): the wind-up stops just short of the blow, and after a breath comes again.
    if (!ranged && !area && MELEE.has(id) && R.D.feint > 0 && K.rng() < R.D.feint) e.rt.atk.feint = R.t + Math.max(0.3, wind) * 0.8;
    R.stats.maxAtk = Math.max(R.stats.maxAtk, RT.attacking(R));
  }
  // Where a blow will land, for the screen and the rules: [x0, x1] on the ground.
  RT.markOf = function (R, e) {
    const a = e.rt.atk; if (!a) return null;
    const fill = clamp((R.t - a.t0) / (a.land - a.t0), 0, 1);
    if (a.ranged) return { x0: a.lane - BODY * 0.5, x1: a.lane + BODY * 0.5, fill, lane: true, locked: a.locked, on: a.on, from: e.rt.x };
    if (a.area) return { x0: e.rt.x - quakeR(e), x1: e.rt.x + quakeR(e), fill, on: a.on, area: true, row: e.rt.lane };
    const x1 = e.rt.x + e.rt.face * hitReach(e); // the blow carries a step forward
    return { x0: Math.min(e.rt.x, x1), x1: Math.max(e.rt.x, x1), fill, on: a.on, row: e.rt.lane };
  };
  function inside(m, u) {
    const pad = BODY * 0.15 - (m.lane || m.row == null ? 0 : ROWCUT * Math.abs(u.rt.lane - m.row)); // a blow reaches a row across a little shorter; an arrow crosses rows
    return u.rt.x >= m.x0 - pad && u.rt.x <= m.x1 + pad;
  }
  // An arrow is a projectile: loosed down its locked lane, it strikes whoever is in that lane when it
  // arrives (you, if you stepped into it for a friend). The screen draws it from the bow to that unit.
  const ARROW_SPEED = 1.7;
  const LUNGE = 0.45 * BODY; // field widths a second
  // How far a foe's blow carries: his weapon's reach and a step; and never short of where he may stand to you (a short weapon
  // against your long one: he may come no nearer than your reach, so his step in is that much longer; on a phone's scale a
  // club could otherwise never reach a mace).
  function hitReach(e) { const p = C.player(); return Math.max(e.rt.reach + LUNGE, p && p.rt ? standOff(p, e) + 0.3 * BODY : 0); }
  function loose(R, e, a) {
    const flight = Math.max(0.12, Math.abs(a.lane - e.rt.x) / ARROW_SPEED);
    const shot = { by: e.uid, side: e.side, id: a.id, on: a.on, lane: a.lane, from: e.rt.x, t0: R.t, arrive: R.t + flight, heavy: a.heavy, n: ++R.shotN, at0: a.t0 };
    R.shots.push(shot);
    R.fx.push({ k: "shot", uid: e.uid, shot });
  }
  function shotsStep(R) {
    for (const s of R.shots.slice()) {
      if (R.t < s.arrive - 1e-6) continue;
      R.shots.splice(R.shots.indexOf(s), 1);
      const by = R.B.units.find((u) => u.uid === s.by);
      if (!by) continue;
      if (s.side === "enemy") resolve(R, by, { id: s.id, on: s.on, heavy: s.heavy, ranged: true, shot: s }, { x0: s.lane - BODY * 0.5, x1: s.lane + BODY * 0.5, lane: true, on: s.on });
      else playerShot(R, by, s);
    }
  }
  function playerShot(R, p, s) {
    const B = R.B;
    const ts = living(B, "enemy").filter((e) => e.rt.entered && Math.abs(e.rt.x - s.lane) <= BODY * 0.6).sort((a, b) => (a.uid === s.on ? -1 : 0) - (b.uid === s.on ? -1 : 0) || Math.abs(a.rt.x - s.from) - Math.abs(b.rt.x - s.from));
    const t = ts[0];
    R.fx.push({ k: "arrive", shot: s, uid: t ? t.uid : null });
    if (!t) return;
    if (s.m) { // an arrow of your Strike combo: a plain hit, the third knocking him back (or caught on a shield: foeBlocks)
      const caught = p.side === "player" ? foeBlocks(R, t, s.heavy, true) : 1;
      const d = p.side === "player" ? floored(R, t, B.hit(p, t, s.m * caught), s.m * caught) : B.hit(p, t, s.m * caught); if (p.side === "player") { R.stats.hits++; if (s.heavy && caught === 1) giftsOnHeavy(R, t, d); } hitFx(R, t, d, s.heavy, p.side === "player" ? null : p, false, null, caught < 1); t.rt.hits.push(R.t); // (an archer beside you: his own hit)
      if (s.knock && t.hp > 0) knock(R, t, sign(t.rt.x - p.rt.x), s.knock * BODY, false);
      else if (p.side === "player" && t.hp > 0 && d > 0) t.rt.x = clamp(t.rt.x + sign(t.rt.x - p.rt.x) * RT.P.arrowPush * (t.hero || t.person ? 0.5 : 1) * BODY, 0.07, 0.93); // pushed back a little
      return;
    }
    const d = K.ABILITIES[s.id].use(B, p, t) || 0; hitFx(R, t, d, true);
  }
  function landAttack(R, e) {
    const a = e.rt.atk, ab = K.ABILITIES[a.id];
    const m = RT.markOf(R, e);
    e.rt.atk = null;
    if (ab.cd && a.id !== "arrows") e.rt.cd[a.id] = ab.cd * ROUND; // an archer's arrows are its plain blow here
    const tr = traitRest(R, e); if (tr < 1) traitTip(R, RT.who(e));
    e.rt.cool = r(RT.P.gap[0], RT.P.gap[1]) * R.D.rest * (a.heavy ? 1.2 : 1) * (e.rt.archer ? RT.P.archerGap : 1) * tr;
    // After his swing he stands open, by weapon (Build D, row 48: a mace long, a dagger hardly at all): no step, no blow,
    // no shield raised and no parry until it has passed. (A heavy blow of a lighter weapon a little longer.)
    const open = ((RT.OPEN[e.rt.weapon] != null ? RT.OPEN[e.rt.weapon] : 0.35) + (a.heavy && e.rt.weapon !== "mace" ? 0.15 : 0)) * (RT.who(e) === "duryodhana" && e.rt.weapon === "mace" ? 0.85 : 1);
    e.rt.rec = open; e.rt.openUntil = R.t + open;
    if (a.ranged) return loose(R, e, a);
    resolve(R, e, a, m);
  }
  // After a champion's blow lands (stage 2): Bhurishravas's heavy blow knocks you down; Abhimanyu's sweeps the next one too.
  function traitAfterBlow(R, e, t, a, stopped, hurt) {
    const w = RT.who(e), p = C.player();
    if (w === "bhurishravas" && a.heavy && t === p && hurt && !stopped) { p.rt.busy = Math.max(p.rt.busy, 0.6); p.rt.blow = null; R.fx.push({ k: "knocked", uid: p.uid }); traitTip(R, "bhurishravas"); }
    if (w === "abhimanyu" && !a.ranged && t.hp >= 0) sweep(R, e, t);
  }
  function sweep(R, e, t) {
    const near = R.B.units.filter((x) => x !== t && x.hp > 0 && !x.spared && !x.decoy && x.rt && (x.side === "enemy") === (t.side === "enemy") && Math.abs(x.rt.x - e.rt.x) <= (e.rt.reach + LUNGE) * 1.1 && sign(x.rt.x - e.rt.x) === sign(t.rt.x - e.rt.x));
    const t2 = near.sort((x, y) => Math.abs(x.rt.x - e.rt.x) - Math.abs(y.rt.x - e.rt.x))[0];
    if (!t2) return;
    const before = t2.hp; R.B.hit(e, t2, 0.6); hitFx(R, t2, before - t2.hp, false, e, true); traitTip(R, "abhimanyu");
  }
  function resolve(R, e, a, m) {
    const B = R.B, ab = K.ABILITIES[a.id], p = C.player();
    const fr = living(B, "friends").filter((f) => !f.still || f.side !== "player");
    const meIn = p.hp > 0 && inside(m, p);
    let blocked = false, perfectBlock = false;
    const dodge = () => {
      R.stats.dodged++;
      B.tell("You dodge {a}'s blow.", { a: e });
      if (R.t - R.rollT <= RT.P.perfect * R.D.perfect + STEP && R.t - R.rollT >= 0) { R.slow = 1.2; R.stats.perfect++; if (indra()) R.breath = Math.min(RT.P.breathMax, R.breath + RT.P.rollCost * tireCost() * 0.25); R.fx.push({ k: "perfect" }); }
      R.fx.push({ k: "miss", uid: p.uid });
    };
    if (a.area) {
      const ts = fr.filter((f) => inside(m, f) && targetable(R, f) && !(f === p && (R.roll > 0 || R.unseen > 0)));
      if (meIn && (R.roll > 0 || R.unseen > 0)) dodge();
      if (ts.length) { ab.use(B, e, ts); ts.forEach((t) => hitFx(R, t, 0, true)); }
      return;
    }
    // The blow lands on you if you are in its path (even one marked on a friend), else on its mark.
    // A roll that carried you out of a blow marked on you is a dodge all the same: recorded, and perfect when begun just
    // before it lands (a roll away from the foe leaves the blow's reach, and was counted as no dodge at all).
    let t = null;
    const rolledOut = !meIn && p.hp > 0 && a.on === p.uid && R.t - R.rollT >= 0 && R.t - R.rollT <= RT.P.roll + STEP;
    if (meIn) { if (R.roll > 0 || R.unseen > 0) { dodge(); return; } t = p; }
    else if (rolledOut) { dodge(); return; }
    else {
      const orig = fr.find((f) => f.uid === a.on);
      if (orig && inside(m, orig) && targetable(R, orig)) t = orig;
      else if (a.ranged) t = fr.find((f) => f !== p && inside(m, f) && targetable(R, f)) || null;
      if (t && t.side === "ally" && !t.still && K.rng() < allyDodge(R, t)) { R.fx.push({ k: "miss", uid: t.uid }); return; }
    }
    if (a.shot) R.fx.push({ k: "arrive", shot: a.shot, uid: t ? t.uid : null });
    if (!t) { R.fx.push({ k: "whiff", uid: e.uid }); return; }
    const before = t.hp;
    // Shields (PRD §18.15): your soldiers on Defend raise theirs against a blow marked on them; you, if you carry one,
    // take a frontal blow a little lighter; raised (Block), a blow from the front in your row or an arrow from the front
    // is stopped but for RT.P.blockThrough of it (heavier blows more). A spark either way.
    let sh = 1;
    const P = RT.P, frontal = t === p && sign((a.shot ? a.shot.from : e.rt.x) - p.rt.x) === p.rt.face;
    const tier = RT.P.strength ? RT.tierOf(e) : 0, STR = RT.STRENGTH; // his strength (Build D): through your shield, your breath, how far you are thrown
    if (t === p && R.block && frontal && (a.ranged || rowGap(e, p) <= P.blockRows)) {
      blocked = true; R.stats.blocked++;
      perfectBlock = R.t - R.blockT <= P.blockPerfect * R.D.perfect + STEP;
      const breaker = a.id === "breaker";
      sh = perfectBlock ? 0 : (breaker ? P.blockBreaker : a.heavy ? P.blockHeavy : P.blockThrough) * STR.through[tier];
      R.breath -= (perfectBlock ? 0.5 : 1) * (a.heavy || breaker ? P.blockHitHeavy : P.blockHit) * (breaker ? 1.5 : 1) * (a.ranged ? 0.35 : 1) * STR.breath[tier]; // (an arrow on the shield: a third of a blade's cost, so a volley does not drop it at once)
      if (perfectBlock) { R.stats.perfectBlocks++; if (indra()) R.breath = Math.min(RT.P.breathMax, R.breath + RT.P.blockMin * tireCost() * 0.25); if (!a.ranged && !steady(e)) { e.rt.stag = Math.max(e.rt.stag, P.blockStag); e.rt.rec = 0; } R.fx.push({ k: "perfectblock", uid: e.uid }); }
      // The blow takes points off your shield, by his tier and weapon (a perfect block half); none from an arrow.
      if (!a.ranged) { const pts = RT.shieldHit(e, e.rt.weapon, a.heavy && !a.arc) * (perfectBlock ? 0.5 : 1); if (pts > 0) shieldTakes(R, p, pts); }
      if (R.breath <= 0 && R.block) { R.breath = 0; lowerShield(R, true); }
    } else if (t !== p && isSoldiers(t) && R.orders.soldiers === "defend" && a.on === t.uid) sh = P.shieldSoldiers;
    else if (t === p && R.shield && frontal) sh = P.shieldYou;
    if (a.arc) sh *= P.maceHit; // a mace blow: slower, a little harder
    if (a.part && t === p) sh *= a.part; // half stopped by your parry (a dagger against a heavy blow)
    if (blocked || sh < (a.arc ? P.maceHit : 1)) R.fx.push({ k: "spark", uid: t.uid, block: blocked, arrow: !!a.ranged });
    if (t === p && sh > 0) sh *= (P.vsPath && K.S && P.vsPath[K.S.path]) || 1; // (the lock's cost given back, by path: Build D)
    if (sh <= 0) { /* a perfect block: nothing gets through */ }
    else if (sh !== 1) { const atk = e.atk; e.atk = Math.round(atk * sh * 10) / 10; try { doHit(); } finally { e.atk = atk; } }
    else doHit();
    function doHit() {
      if (a.id === "arrows") B.hit(e, t, 1, { verb: "Arrows rain on {t} for {n}." });
      else ab.use(B, e, ab.target === "enemies" ? [t] : t);
    }
    hitFx(R, t, before - t.hp, a.heavy, e, !a.ranged, a.arc, blocked);
    traitAfterBlow(R, e, t, a, blocked || perfectBlock, before > t.hp);
    if (t === p && before > t.hp) { R.kneel = 0; R.salveStop = true; if (a.heavy && !blocked && (!RT.P.strength || tier >= RT.tierOf(p))) { p.rt.busy = Math.max(p.rt.busy, 0.25 * STR.knock[tier]); p.rt.blow = null; } } // (stage 3: only one of your tier or above staggers you)
    // A mace's side sweep shoves the one struck back (a step less behind a raised shield; further from a stronger arm).
    if (a.arc === "sweep" && t.hp > 0 && !perfectBlock) { const dir = sign(t.rt.x - e.rt.x), dx = P.maceShove * BODY * (blocked ? 0.5 : 1) * STR.knock[tier]; t.rt.x = t === p ? clamp(t.rt.x + dir * dx, EDGE, 1 - EDGE) : clamp(t.rt.x + dir * dx, 0.07, 0.93); }
  }
  // Stage 2 traits that act on their own: Karna's wheel sinks on the seventeenth day below a third of his strength (he stops
  // 3 s to free it; a blow of yours then is remembered); Ghatotkacha, once a fight below two thirds, becomes three for 6 s.
  function traitStep(R, e) {
    const w = RT.who(e), u = e.rt;
    if (w === "karna" && !u.wheeled && RT.warDay() === 17 && e.hp < e.maxHp / 3 && e.hp > 0) {
      u.wheeled = true; u.wheelUntil = R.t + 3; if (u.atk) cancel(R, e);
      R.fx.push({ k: "wheel", uid: e.uid }); traitTip(R, "karnaWheel");
    }
    if (w === "ghatotkacha" && !u.maya && e.hp < e.maxHp * 0.67 && e.hp > 0 && u.entered) {
      u.maya = true; traitTip(R, "ghatotkachaMaya");
      for (const dx of [-0.16, 0.16]) {
        const d = Object.assign({}, e, { uid: e.uid + (dx < 0 ? "a" : "b"), decoy: R.t + 6, real: e.uid, status: {}, abilities: [], hp: e.hp, cds: {} }); delete d._tb;
        d.rt = Object.assign({}, u, { x: clamp(u.x + dx, 0.07, 0.93), atk: null, hits: [], cd: {}, maya: true, stag: 0, down: 0 });
        R.B.units.push(d); R.fx.push({ k: "maya", uid: d.uid, from: e.uid });
      }
    }
  }
  // A false Ghatotkacha, struck or his 6 s over, is gone (out of the fight, off the field).
  function vanish(R, d) {
    const i = R.B.units.indexOf(d); if (i < 0) return;
    R.B.units.splice(i, 1); R.fx.push({ k: "vanish", uid: d.uid });
  }
  RT.vanish = vanish;
  RT.clearDecoys = (B) => { if (B && B.units) for (let i = B.units.length - 1; i >= 0; i--) if (B.units[i].decoy) B.units.splice(i, 1); };
  function foeStep(R, e, dt) {
    const B = R.B, p = C.player();
    const u = e.rt;
    for (const k of Object.keys(u.cd)) if (u.cd[k] > 0) u.cd[k] -= dt;
    if (u.cool > 0 && !u.atk) u.cool -= dt;
    if (e.decoy) { if (R.t >= e.decoy || !R.B.units.some((x) => x.uid === e.real && x.hp > 0)) vanish(R, e); else if (p && p.rt) u.face = sign(p.rt.x - u.x) || u.face; return; }
    traitStep(R, e);
    if (u.wheelUntil > R.t) return; // Karna frees his sunken wheel (stage 2)
    if (u.down > 0) { u.down -= dt; return; }
    if (u.stag > 0) { u.stag -= dt; return; }
    if (held(e)) { if (u.atk) cancel(R, e); return; }
    if (e.still) return;
    if (u.rec > 0) { u.rec -= dt; return; }
    if (u.opening) u.opening = false; // free to act again after his shield caught your blow (foeBlocks)
    // Waiting off the field: the next pack comes in as the field thins.
    if (!u.entered) {
      const onNow = living(B, "enemy").filter((x) => x.rt.entered).length;
      if (onNow >= 2 && u.wave) return;
      u.x -= u.speed * dt;
      if (u.x <= 0.93) u.entered = true;
      return;
    }
    // Beaten (in a fight where a foe may be spared): at 5% of his health (C.PLEAD) he kneels in the back row and fights no more.
    if (B.enc.spare && e.hp <= e.maxHp * C.PLEAD) { if (!u.beaten) { u.beaten = true; if (u.atk) cancel(R, e); R.fx.push({ k: "beaten", uid: e.uid }); } toRow(e, 2, dt); u.x = clamp(keepApart(R, e, u.x, dt, living(B, "enemy")), 0.07, 0.93); return; }
    if (u.atk && u.atk.feint && R.t >= u.atk.feint) { const a = u.atk, w = a.land - a.t0; a.feint = 0; a.t0 = R.t + 0.3; a.land = a.t0 + w; a.feinted = true; R.fx.push({ k: "feint", uid: e.uid }); }
    if (u.atk) {
      const a = u.atk, t = B.units.find((x) => x.uid === a.on);
      if (a.ranged && !a.locked) { if (t && t.hp > 0) a.lane = t.rt.x; if (a.land - R.t <= RT.P.lock) a.locked = true; }
      if (!a.ranged && t && t.hp > 0) {
        if (!a.area) u.face = sign(t.rt.x - u.x) || u.face;
        // A long weapon too close to strike (a spear on a dagger fighter who has slipped inside): he gives ground as he
        // winds up, so the blow lands at its own length and not through the body (owner: at least 0.8 of the reach apart).
        // (measured to whoever stands nearest in the blow's way: you, stepping in front of the friend it was meant for)
        const pp = C.player(), tt = pp && pp.hp > 0 && pp !== t && sign(pp.rt.x - u.x) === sign(t.rt.x - u.x) && Math.abs(pp.rt.x - u.x) < Math.abs(t.rt.x - u.x) && rowGap(e, pp) < 1.5 ? pp : t;
        const want = SPACE * (u.reach - (rowGap(e, tt) < 0.5 ? 0 : ROWCUT * rowGap(e, tt))), ad = Math.abs(tt.rt.x - u.x);
        if (ad < want) {
          const dir = sign(tt.rt.x - u.x) || -u.face, nx = clamp(u.x - dir * Math.min(want - ad, BACKSTEP * dt), 0.07, 0.93), moved = Math.abs(nx - u.x);
          u.x = nx;
          // Backed against the edge of the field, he shoves you back instead, as he swings.
          if (moved < 1e-4 && tt.side === "player") tt.rt.x = clamp(tt.rt.x + dir * Math.min(want - ad, BACKSTEP * dt), EDGE, 1 - EDGE);
        }
        // Still too close when it should land (a stagger held him while you pressed in): the blow waits a moment more while he steps back.
        if (R.t >= a.land - 1e-6 && ad < want * 0.95 && (a.wait || 0) < 4) { a.land = R.t + 0.1; a.wait = (a.wait || 0) + 1; }
      }
      if (R.t >= a.land - 1e-6) landAttack(R, e);
      return;
    }
    let t = B.units.find((x) => x.uid === u.tgt);
    if (!t || !targetable(R, t) || (u.cool <= 0 && K.rng() < 0.02)) { t = pickTarget(R, e); u.tgt = t ? t.uid : null; }
    if (!t) return;
    const d = t.rt.x - u.x, ad = Math.abs(d);
    // Rows: one about to strike steps into its target's row; the others wait in a back row.
    const tr = Math.round(t.rt.lane);
    const taken = living(B, "enemy").some((o) => o !== e && (o.rt.engaged || o.rt.atk) && Math.abs(o.rt.lane - tr) < 0.6 && dist(o, e) < 1.3 * BODY);
    u.engaged = u.cool <= 0.8 && RT.attacking(R) < 2 && !u.archer && !taken; // one at a time steps into a row beside its target
    toRow(e, u.engaged ? tr : backRow(e), dt);
    const want = u.keep && !u.close ? Math.max(u.keep * 0.8, Math.min(u.keep, 0.6)) : u.reach * 0.92;
    const spaced = living(B, "enemy").every((o) => !o.rt.atk || Math.abs(o.rt.atk.land - (R.t + (u.archer ? RT.P.track + RT.P.lock : u.windup))) >= RT.P.spacing * R.D.pair);
    const canAttack = u.cool <= 0 && RT.attacking(R) < 2 && spaced && onField(e) && ad <= (u.ranged && (u.archer || ad > u.reach + LUNGE) ? 0.9 : hitReach(e) - LUNGE * 0.15 - ROWCUT * rowGap(e, t));
    if (canAttack) { startAttack(R, e, t); if (u.atk) u.close = false; return; }
    // Without a turn to strike, a foe waits at a distance.
    const waitAt = RT.attacking(R) >= 2 && !u.keep ? Math.max(want + BODY, 2.3 * BODY) : want;
    let dx = 0;
    if (ad > waitAt + 0.01) dx = sign(d) * u.speed * dt;
    else if (ad < waitAt - 0.04) {
      // An archer steps back only just after loosing (playtest, 5 November: a mace fighter could never reach one); caught in
      // your reach or backed to the edge he stands and fights close, and steps back again only once he has struck.
      const cornered = (u.x <= 0.09 && d > 0) || (u.x >= 0.91 && d < 0), caught = u.archer && t === p && ad <= p.rt.reach * 1.05;
      if (u.archer && (cornered || caught)) { u.close = true; u.tgt = p.uid; }
      else if (!u.archer || u.cool > 0.5) dx = -sign(d) * u.speed * 0.6 * dt;
    }
    let x = u.x + dx;
    // Foes keep apart from each other in a row, so each stands clear on the ground.
    if (!u.engaged) x = keepApart(R, e, x, dt, living(B, "enemy").filter((o) => !o.rt.atk && !o.rt.engaged));
    // A foe in your row does not walk through you; nor, coming at you from another row, nearer than where the weapons reach.
    { // (whomever he means to strike: a foe never stands stacked on you from another row either)
      const pg = gapTo(e, p); // nor into either weapon's reach
      if (u.x >= p.rt.x && x < p.rt.x + pg) x = Math.max(x, Math.min(u.x + u.speed * 0.6 * dt, p.rt.x + pg)); // (inside it, from another row: he steps back out)
      if (u.x < p.rt.x && x > p.rt.x - pg) x = Math.min(x, Math.max(u.x - u.speed * 0.6 * dt, p.rt.x - pg));
    }
    u.x = clamp(x, 0.07, 0.93);
    if (ad > 1e-4) u.face = sign(d);
  }

  // ---------- Friends and soldiers ----------
  const isSoldiers = (a) => a.plural && !a.person && !a.called;
  function allyDodge(R, a) { if (isSoldiers(a)) return 0.2; return { balanced: 0.35, guard: 0.25, allout: 0.05, hold: 0.5 }[R.orders.friend] || 0.3; }
  function allyStep(R, a, dt) {
    const B = R.B, p = C.player(), u = a.rt;
    if (a.still) return;
    // Bhima beside you (stage 2): his war cry, every 15 s, turns every foe on him for 3 s.
    if (RT.who(a) === "bhima" && a.hp > 0 && R.t >= (u.cryNext || 4)) { u.cryUntil = R.t + 3; u.cryNext = R.t + 15; R.fx.push({ k: "cry", uid: a.uid }); traitTip(R, "bhima"); }
    if (u.down > 0) { u.down -= dt; return; }
    if (held(a)) { u.atk = null; return; }
    if (u.rec > 0) { u.rec -= dt; return; }
    const order = isSoldiers(a) ? R.orders.soldiers : R.orders.friend;
    const hast = R.haste > 0 ? 0.7 : 1;
    if (u.atk) {
      if (R.t >= u.atk.land - 1e-6) {
        const t = B.units.find((x) => x.uid === u.atk.on && x.hp > 0), id = u.atk.id, shot = !!u.atk.ranged; u.atk = null;
        u.cool = r(1.4, 2.3) * hast * (order === "allout" ? 0.75 : 1); u.rec = 0.3;
        const ab = K.ABILITIES[id];
        if (shot && t) { // an archer beside you looses an arrow down the lane (owner, 4 November: archers fight with the bow only)
          const s = { by: a.uid, side: a.side, id: "arrows", m: order === "allout" ? 1.25 : 1, on: t.uid, lane: t.rt.x, from: u.x, t0: R.t, arrive: R.t + Math.max(0.06, Math.abs(t.rt.x - u.x) / (ARROW_SPEED * 1.4)), n: ++R.shotN };
          R.shots.push(s); R.fx.push({ k: "shot", uid: a.uid, shot: s });
        } else if (ab.target === "ally") { ab.use(B, a, t); R.fx.push({ k: "heal", uid: t && t.uid }); }
        else if (t && Math.abs(t.rt.x - u.x) <= u.reach * 1.25 + LUNGE - ROWCUT * rowGap(a, t)) {
          const before = t.hp;
          if (order === "allout" && id === "strike") B.hit(a, t, 1.25); else ab.use(B, a, ab.target === "enemies" ? [t] : t); // all-out hits harder
          hitFx(R, t, before - t.hp, false, a, MELEE.has(id));
          if (RT.who(a) === "abhimanyu" && MELEE.has(id)) sweep(R, a, t);
        }
      }
      return;
    }
    if (u.cool > 0) u.cool -= dt;
    // A shield wall carried into the clash from your move on the turns (owner, 6 November: "if I selected shield wall,
    // the first few seconds should show the whole company shields up, sticking together"): while it lasts your side
    // closes up on you in the rows behind, shoulder to shoulder, and holds its shields instead of striking.
    if (a.status.wall && u.st.wall > 0 && p && p.rt) {
      const rank = living(B, "friends").filter((f) => f !== p && !f.still).indexOf(a);
      const goal = clamp(p.rt.x - sign(p.rt.face || 1) * (0.12 + 0.2 * Math.max(0, rank)) * BODY, 0.07, 0.93), d = goal - u.x;
      if (Math.abs(d) > 0.004) u.x = clamp(u.x + sign(d) * Math.min(Math.abs(d), u.speed * 1.4 * dt), 0.07, 0.93);
      toRow(a, backRow(a), dt);
      u.face = p.rt.face || 1;
      return;
    }
    // Where to stand.
    let goal, foe = null;
    const foes = living(B, "enemy").filter((e) => e.rt.entered);
    const low = order === "balanced" && a.hp < a.maxHp * 0.35; // balanced: falls back when hurt
    if (order === "stay" || order === "hold" || low) goal = clamp(p.rt.x - sign(p.rt.face || 1) * (low ? 1.2 : 1.4) * BODY, 0.07, 0.93);
    else {
      if (order === "guard" || order === "defend") foe = foes.filter((e) => dist(e, p) <= Math.max(2 * BODY, e.rt.reach + BODY)).sort((x, y) => dist(x, p) - dist(y, p))[0] || null;
      else if (order === "allout") foe = foes.sort((x, y) => dist(x, a) - dist(y, a))[0] || null;
      else foe = foes.sort((x, y) => dist(x, p) - dist(y, p))[0] || null;
      if (foe) goal = foe.rt.x - sign(foe.rt.x - u.x) * u.reach * 0.92;
      else goal = clamp(p.rt.x - 0.8 * BODY, 0.05, 0.95);
      if ((order === "guard" || order === "defend") && Math.abs(goal - p.rt.x) > BODY * 1.2) goal = p.rt.x + clamp(goal - p.rt.x, -BODY * 1.2, BODY * 1.2);
    }
    const d = goal - u.x;
    let nx = u.x;
    if (Math.abs(d) > 0.01) nx = u.x + sign(d) * Math.min(Math.abs(d), u.speed * 1.05 * dt);
    toRow(a, backRow(a), dt); // your side stands in the rows behind you
    u.x = clamp(keepApart(R, a, nx, dt, living(B, "friends")), 0.07, 0.93);
    // A healer among your friends tends the hurt.
    const hurt = living(B, "friends").find((f) => !f.still && f.hp / f.maxHp < 0.45 && dist(f, a) < 2 * BODY);
    if (u.cool <= 0 && hurt && a.abilities.includes("salve") && !(u.cd.salve > 0)) { u.atk = { id: "salve", on: hurt.uid, land: R.t + 0.5, t0: R.t }; u.cd.salve = 3 * ROUND; return; }
    for (const k of Object.keys(u.cd)) if (u.cd[k] > 0) u.cd[k] -= dt;
    if (order === "stay" || order === "hold" || low || !foe || u.cool > 0) return;
    if (Math.abs(foe.rt.x - u.x) <= u.reach * 1.05 + LUNGE - ROWCUT * rowGap(a, foe)) {
      const ok = (id) => a.abilities.includes(id) && !(u.cd[id] > 0);
      const id = ok("heavy") && K.rng() < 0.3 ? "heavy" : a.abilities.includes("strike") ? "strike" : a.abilities.find((x) => MELEE.has(x)) || "strike";
      if (K.ABILITIES[id].cd) u.cd[id] = K.ABILITIES[id].cd * ROUND;
      u.face = sign(foe.rt.x - u.x);
      u.atk = { id, on: foe.uid, t0: R.t, land: R.t + 0.45 * hast, ranged: !!u.archer }; // an archer draws, then shoots (above)
    }
  }

  // ---------- Time: statuses, burning, friends who leave, the story's rounds ----------
  function clocks(R) {
    const B = R.B, dt = STEP;
    for (const u of B.units) {
      if (!u.rt) continue;
      const cool = u.side === "player" && u === C.player() && kept("varuna"); // Varuna's cool water (stage 3)
      for (const s of Object.keys(u.rt.st)) {
        if (!(s in u.status)) { delete u.rt.st[s]; continue; }
        u.rt.st[s] -= dt * (cool && (s === "burn" || s === "bleed" || s === "cursed") ? 2 : 1);
        if (u.rt.st[s] <= 0) { delete u.rt.st[s]; delete u.status[s]; }
        else if (s !== "crit") u.status[s] = Math.max(1, Math.ceil(u.rt.st[s] / ROUND)); // what is left, in rounds (the screen's labels)
      }
    }
    if (R.slow > 0) R.slow -= dt;
    if (R.haste > 0) R.haste -= dt;
    // Agni's fire on a foe your heavy blow struck (stage 3): 0.15 of that blow a second, for 2 s.
    for (const u of B.units) {
      if (!u.rt || !(u.rt.burnUntil > R.t - dt) || u.hp <= 0) continue;
      u.rt.burnAcc = (u.rt.burnAcc || 0) + u.rt.burnPer * Math.min(dt, u.rt.burnUntil - (R.t - dt));
      if (u.rt.burnAcc >= 1) { const n = Math.min(u.hp - (RT.who(u) === "bhishma" && RT.warDay() < 10 ? Math.round(u.maxHp * 0.1) : 0), Math.floor(u.rt.burnAcc)); u.rt.burnAcc -= Math.floor(u.rt.burnAcc); if (n > 0) { u.hp -= n; R.fx.push({ k: "burnt", uid: u.uid, n }); } }
      if (u.rt.burnUntil <= R.t) { u.rt.burnUntil = 0; u.rt.burnAcc = 0; }
    }
    R.doT -= dt;
    if (R.doT <= 0) { // burning and bleeding, every 4 s, as at the end of a round
      R.doT += ROUND;
      for (const u of B.units) {
        if (u.hp > 0 && u.status.burn) { const d = Math.max(1, Math.round(u.maxHp * 0.07)); u.hp = Math.max(0, u.hp - d); B.tell(u.side === "player" ? "You burn for {n}." : "{t} burns for {n}.", { t: u }, { n: d }); }
        if (u.hp > 0 && u.status.bleed) { const d = Math.max(1, Math.round(u.maxHp * 0.06)); u.hp = Math.max(0, u.hp - d); B.tell(u.side === "player" ? "You bleed for {n}." : "{t} bleeds for {n}.", { t: u }, { n: d }); }
      }
    }
    for (const u of B.units.filter((x) => x.rt && x.rt.leaveAt != null && R.t >= x.rt.leaveAt && x.hp > 0)) {
      B.tell("The press of the fighting carries {t} away from you.", { t: u }); B.units = B.units.filter((x) => x !== u); R.fx.push({ k: "leave", uid: u.uid });
    }
    // (Not in a war day's clash: there the war day keeps its rounds, its beats and its field events. Counted here, each clash
    // began again at round 1 and played the beats of rounds 1 and 2 once more: in front of Shikhandi your side was made
    // exposed in every clash. 6 November.)
    const round = R.clash ? B.round : 1 + Math.floor(R.t / RT.P.story);
    if (round !== B.round) {
      B.round = round;
      const beat = (K.val(B.enc.beats) || []).find((b) => b.round === B.round);
      if (beat) { B.evented = true; const at = B.log.length; const u = (beat.run && beat.run(B)) || {}; B.log.splice(at, 0, { key: beat.text, u, ev: true }); R.fx.push({ k: "event" }); }
      else if (B.round === 3 && B.enc.lethal && !B.evented && !B.enc.beats && living(B, "enemy").length) { C.core.fieldEvent(); R.fx.push({ k: "event" }); }
    }
  }
  function overNow(R) {
    const B = R.B, p = C.player(), enc = B.enc;
    if (B.over) return B.over;
    C.core.amulet(p);
    if (p.hp <= 0) return "lose";
    { const r2 = B.rule && B.rule.over ? B.rule.over(B) : null; if (r2) return r2; }
    if (!living(B, "enemy").length) return "win";
    const S = RT.P.story;
    if (enc.rounds && R.t >= enc.rounds * S) { B.say(enc.roundsText || "You held long enough."); return "win"; }
    if (enc.hold && R.t >= enc.hold * S) { B.say(enc.holdText || "You held until the end."); return "win"; }
    if (R.t >= RT.P.cap) { // should never happen: the side with more left wins
      const mine = p.hp / p.maxHp, theirs = living(B, "enemy").reduce((s, e) => s + e.hp / e.maxHp, 0) / Math.max(1, B.units.filter((u) => u.side === "enemy").length);
      R.capped = true; return mine >= theirs ? "win" : "lose";
    }
    return null;
  }

  // Figures of one side at rest never stand in each other (a knock-back, a pack walking in): eased apart.
  // You are never pushed, and you push no one: your side passes you in the rows behind. A foe striking or stepping in to strike is not at rest.
  function spread(R) {
    const p = C.player();
    for (const side of ["enemy", "friends"]) {
      const us = living(R.B, side).filter((u) => u.rt && !u.still && (side !== "enemy" || (u.rt.entered && !u.rt.atk && !u.rt.engaged)) && !(side === "friends" && u.status.wall && u.rt.st.wall > 0)); // a shield wall stands rim over rim
      for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
        let a = us[i], b = us[j];
        if (b === p) { b = a; a = p; }
        if (Math.abs(a.rt.lane - b.rt.lane) >= 0.5) continue; // bodies in different rows stand clear of each other already
        if (a === p) continue; // your side passes you; you never block them (they keep to the rows behind you)
        const g = b.rt.x - a.rt.x;
        if (Math.abs(g) >= APART * 0.98) continue;
        const dir = Math.abs(g) > 1e-4 ? sign(g) : (b.rt.x > 0.5 ? -1 : 1); // b goes this way, a the other
        const push = 0.5 * STEP;
        // A foe eased apart is never eased into your weapon's reach (as he never walks into it): the other one moves instead.
        let pa = push, pb = push;
        if (side === "enemy" && p && p.rt) {
          const into = (u, nx) => { const pg = gapTo(u, p); return Math.abs(nx - p.rt.x) < pg && Math.abs(nx - p.rt.x) < Math.abs(u.rt.x - p.rt.x); };
          if (into(b, b.rt.x + dir * push)) { pb = 0; pa = 2 * push; } else if (into(a, a.rt.x - dir * push)) { pa = 0; pb = 2 * push; }
        }
        const nb = clamp(b.rt.x + dir * pb, 0.07, 0.93), lostB = pb - Math.abs(nb - b.rt.x);
        const na = clamp(a.rt.x - dir * (pa + lostB), 0.07, 0.93), lostA = pa + lostB - Math.abs(na - a.rt.x);
        a.rt.x = na; b.rt.x = clamp(nb + dir * lostA, 0.07, 0.93); // pressed against an edge, the other one moves the more
      }
    }
  }
  function joined(R) {
    for (const u of R.B.units) if (!u.rt) { initUnit(R, u); u.rt.x = clamp(C.player().rt.x - 0.6 * BODY, 0.04, 0.96); u.rt.lane = backRow(u); if (u.side === "enemy") { u.rt.x = 1.05; u.rt.entered = false; } R.fx.push({ k: "join", uid: u.uid }); }
  }
  // One step of the fight, with one input.
  RT.step = function (R, act) {
    const B = R.B;
    if (R.over) return R;
    act = act || {};
    if (B.over) { R.over = B.over; return R; }
    R.n++;
    // A divine weapon's moment: the fight stands still while it plays (the screen clears R.frozen sooner).
    if (R.frozen > 0) { R.frozen -= STEP; if (act.orders) Object.assign(R.orders, act.orders); if (R.frozen <= 0) astraThrow(R); return R; }
    joined(R);
    // ... and a shield-carrier raises the shield against them by himself.
    if (R.assist && R.blocker && !R.broken && !act.block && RT.wantBlock(R, 0.14, 0.3)) act = Object.assign({}, act, { block: true });
    playerAct(R, act);
    joined(R); // a friend who answered the call, or one a beat brought in
    if (B.over) { R.over = B.over; return R; }
    R.t += STEP;
    const p = C.player();
    // Story mode and "Meet blows for me": you roll out of marked blows by yourself.
    if (R.assist && RT.can(R, "roll")) {
      const th = RT.threats(R).find((x) => x.land - R.t <= 0.12);
      if (th) playerAct(R, { roll: true, rollDir: sign(p.rt.x - th.from) });
    }
    playerStep(R, act);
    const fdt = STEP * (R.slow > 0 ? 0.45 : 1);
    for (const a of living(B, "ally")) allyStep(R, a, STEP);
    const foes = living(B, "enemy").sort((x, y) => (x.rt.atk ? 0 : 1) - (y.rt.atk ? 0 : 1) || x.rt.idx - y.rt.idx);
    for (const e of foes) {
      if (e.rt.atk && R.slow > 0) e.rt.atk.land += STEP - fdt;
      const bx = e.rt.boundUntil > R.t ? e.rt.x : null, me = C.player();
      foeStep(R, e, fdt);
      if (bx != null && me && me.rt && Math.abs(e.rt.x - me.rt.x) > Math.abs(bx - me.rt.x)) e.rt.x = bx; // the serpent's coil (stage 3): no step back
    }
    spread(R);
    shotsStep(R);
    clocks(R);
    for (const u of B.units) if (u.rt && u.hp <= 0 && u.rt.fell == null) { u.rt.fell = R.t; u.rt.atk = null; R.fx.push({ k: "fall", uid: u.uid }); dropShield(R, u); }
    const out = overNow(R);
    if (out) end(R, out);
    return R;
  };
  // Blows coming at you (or with you in their path): for the bot, the assist and the screen.
  RT.threats = function (R) {
    const p = C.player(), out = [];
    for (const e of living(R.B, "enemy")) {
      const m = RT.markOf(R, e);
      if (!m) continue;
      const mine = m.on === p.uid, path = inside(m, p);
      const land = e.rt.atk.land + (m.lane ? Math.max(0.12, Math.abs(e.rt.atk.lane - e.rt.x) / ARROW_SPEED) : 0);
      if (m.lane ? (m.locked || mine) && (path || mine && !m.locked) : path) out.push({ uid: e.uid, land, t0: e.rt.atk.t0, from: e.rt.x, lane: !!m.lane, locked: !!m.locked, mine, heavy: e.rt.atk.heavy });
    }
    for (const s of R.shots) if (s.side === "enemy" && Math.abs(p.rt.x - s.lane) <= BODY * 0.65) out.push({ uid: s.by, land: s.arrive, t0: s.at0, from: s.from, lane: true, locked: true, mine: s.on === p.uid, heavy: s.heavy, flying: true });
    return out.sort((a, b) => a.land - b.land);
  };
  // Caught in your own swing (the strike and defence study, 8 November: 43–77% of the hits on you landed while the swing lock
  // held you; owner: warn, and keep the lock): now, a blow marked on you lands before the swing you are in has ended; next,
  // one lands before a blow begun now would end (a press now is kept until the swing you are in ends).
  RT.swingRisk = function (R) {
    const p = C.player(), out = { now: false, next: false };
    if (!RT.P.swingLock || !p || !p.rt || p.hp <= 0) return out;
    const t = RT.threats(R).find((x) => x.land > R.t + 0.02);
    if (!t) return out;
    const left = t.land - R.t, busy = Math.max(0, p.rt.busy || 0), c = RT.nextBlow(R);
    out.now = busy > 0 && left < busy;
    out.next = !!c && left < busy + c.len;
    return out;
  };
  // Is a blow on you near enough to have the shield up for it: landing within lead (to raise it), or within hold (kept up)?
  RT.wantBlock = function (R, lead, hold, seen) {
    return RT.threats(R).some((t) => (!seen || seen(t)) && t.land - R.t <= (R.block ? hold : lead) && t.land - R.t > -0.05);
  };
  function end(R, out) {
    const B = R.B;
    RT.clearDecoys(B); // (Ghatotkacha's false figures never outlive the fight)
    R.lost = out === "lose";
    // A deadly fight lost the first time: one more try (RT.retry), with a little cost.
    if (out === "lose" && (B.enc.lethal || (K.S && K.S.fighter)) && !B.enc.once && !R.tries && !B.over && !R.noRetry) { R.over = "retry"; return; } // fighter mode: every fight one more try
    R.over = out;
    if (!B.over) C.settle(out);
  }
  // Give up the second try: the loss counts as any loss.
  RT.accept = function (R) { if (R.over !== "retry") return; R.over = "lose"; C.settle("lose"); };
  // The second try: the same fight from its start, a little hurt; what you spent stays spent.
  RT.retry = function (R) {
    if (R.over !== "retry") return R;
    const B = C.start(R.B.enc.id, R.B.onEnd);
    B.say("You get up. One more time.");
    Object.assign(B.used, R.B.used); // what is used once a battle (a divine weapon, the call for help) stays used
    const R2 = RT.begin(B, { tries: R.tries + 1, hp: RT.P.retryHp, assist: R.assist, scale: R.scale });
    R2.orders = Object.assign({}, R.orders);
    R2.prev = { t: R.t };
    return R2;
  };

  // ---------- The bot: approach, strike, roll out of marked blows, heal when low ----------
  // Its reading depends on grace: a quicker eye and fewer blows it misses. Every chance from K.rng.
  // The bot plays like a person on a phone (owner, 4 November): one button at a time (no moving while striking, no strike
  // while the shield is up), and a short gap between one press and the next (RT.P.botGap seconds; a tap again on the same
  // button waits too). Holding a button (moving, the shield) goes on without a new press.
  const TAPS = ["block", "roll", "herbs", "call", "astra", "spare", "skill", "strike"];
  RT.bot = function (R, opt = {}) {
    const a = botWants(R, opt), P = RT.P;
    if (!P.botGap) return a;
    const h = R.hum || (R.hum = { btn: null, next: 0 });
    const want = TAPS.find((k) => a[k]) || (a.move ? "move" + a.move : null);
    const held = want === "block" || (want && want.startsWith("move"));
    const gap = () => P.botGap[0] + K.rng() * (P.botGap[1] - P.botGap[0]);
    if (want === h.btn && held) return want === "block" ? { block: true } : { move: a.move };
    if (R.t < h.next) return h.btn === "block" && R.block ? { block: true } : {}; // between presses: the thumb is still on its way
    h.btn = want; h.next = R.t + gap();
    if (!want) return {};
    if (want.startsWith("move")) return { move: a.move };
    const out = { [want]: a[want] };
    if (want === "roll") out.rollDir = a.rollDir;
    return out;
  };
  function botWants(R, opt = {}) {
    const B = R.B, p = C.player(), S = K.S;
    if (!R.botState) {
      const g = clamp((K.attr("grace") || 0) / 6, 0, 1);
      const P = RT.P;
      R.botState = { react: P.botReact[1] - (P.botReact[1] - P.botReact[0]) * g, miss: P.botMiss[1] - (P.botMiss[1] - P.botMiss[0]) * g, read: {}, lead: {}, rlead: {}, called: false };
    }
    const bs = R.botState, a = {};
    const th = RT.threats(R);
    for (const t of th) {
      const key = t.uid + "@" + t.t0;
      if (!(key in bs.read)) bs.read[key] = K.rng() >= bs.miss; // does it read this one at all?
      if (!bs.read[key]) continue;
      if (R.t - t.t0 < bs.react) continue;
      const left = t.land - R.t;
      if (R.blocker && !R.broken) { // a shield-carrier raises the shield just before the blow, and holds it until it has landed (broken: he rolls)
        const lead = bs.lead[key] != null ? bs.lead[key] : (bs.lead[key] = RT.P.botLead[0] + K.rng() * (RT.P.botLead[1] - RT.P.botLead[0])); // how early it gets the shield up for this one
        if (left <= (R.block ? 0.45 : lead) && RT.can(R, "block")) { a.block = true; return a; }
        continue;
      }
      const rlead = bs.rlead[key] != null ? bs.rlead[key] : (bs.rlead[key] = RT.P.botRollLead[0] + K.rng() * (RT.P.botRollLead[1] - RT.P.botRollLead[0]));
      if (left <= rlead && RT.can(R, "roll")) {
        // Away from the blow, unless that corners you at the edge: then through the foe, to open ground.
        let dir = sign(p.rt.x - t.from) || -1;
        const to = p.rt.x + dir * 1.7 * BODY;
        if (to < EDGE + 0.12 || to > 1 - EDGE - 0.12) dir = -dir;
        a.roll = true; a.rollDir = dir; return a;
      }
    }
    const soon = th.some((t) => t.land - R.t < 0.5 && bs.read[t.uid + "@" + t.t0]);
    if (p.hp < p.maxHp * 0.36 && RT.can(R, "herbs") && !soon) { a.herbs = true; return a; }
    // A storm's clash (R.noStrike): nothing to strike at, so keep your distance and defend.
    if (R.noStrike) { const f = nearestFoe(R, p.rt.x); if (f && Math.abs(f.rt.x - p.rt.x) < 0.45) { const d = sign(p.rt.x - f.rt.x) || -1, to = p.rt.x + d * 0.08; if (to > EDGE + 0.04 && to < 1 - EDGE - 0.04) a.move = d; } return a; }
    const foes = living(B, "enemy").filter((e) => e.rt.entered);
    // Call for help when it is worth it.
    if (!bs.called && RT.can(R, "call") && (p.hp < p.maxHp * 0.6 || foes.length >= 2)) { bs.called = true; a.call = true; }
    // A divine weapon, on a crowd or when hurt, never at a foe who could answer it in a fight it wins anyway.
    const ast = RT.astras(R).filter((x) => !x.why);
    if (ast.length && !soon && (foes.length >= 2 || p.hp < p.maxHp * 0.5) && !foes.every((e) => e.hero)) { a.astra = ast[0].id; return a; }
    if (opt.spare && C.spareable().length) { const t = RT.spareable(R)[0]; if (t && K.rng() < opt.spare) { a.spare = t.uid; return a; } }
    const f = nearestFoe(R, p.rt.x);
    // Without a shield: to the nearest one lying on the field, when it is not far and no foe stands in the way.
    if (R.blocker && R.broken && !soon) {
      const g = RT.nearestShield(R, p.rt.x);
      if (g && Math.abs(g.x - p.rt.x) <= (opt.shieldFar != null ? opt.shieldFar : 0.4) && !foes.some((e) => rowGap(e, p) < 1.5 && (e.rt.x - p.rt.x) * (e.rt.x - g.x) < 0)) { a.move = sign(g.x - p.rt.x); return a; }
    }
    if (!f) return a;
    const d = f.rt.x - p.rt.x, ad = Math.abs(d);
    // The path's skill, where it does something.
    if (RT.can(R, "skill") && !soon) {
      const allies = living(B, "ally").filter((x) => !x.still).length;
      const use = { aimed: ad <= 0.7, quake: foesNear(R, p.rt.x, null, quakeR(p)).length >= 1, ridedown: ad <= 2.5 * BODY, command: ad <= 3 * BODY, salve: p.hp < p.maxHp * 0.75, vanish: ad <= p.rt.reach + 0.3 * BODY, song: allies > 0 || ad <= p.rt.reach }[R.skill];
      if (use) { a.skill = true; return a; }
    }
    // In reach: strike, unless a blow it has read would land inside the swing it starts (Build D: locked until it ends; a
    // person learns not to begin a mace's swing with a blade coming, and to wait out the clash's opening lock).
    const len = RT.nextBlow(R).len, inSwing = th.some((t) => bs.read[t.uid + "@" + t.t0] && t.land - R.t > -0.05 && t.land - R.t < len + 0.12);
    if (ad <= (p.rt.reach - ROWCUT * rowGap(f, p)) * 0.92) { a.strike = RT.can(R, "strike") && !inSwing; if (!a.strike) a.move = 0; }
    else a.move = sign(d);
    return a;
  }
  RT.hash = function (s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  // The fight's state as a fingerprint: same seed, same inputs → same hash.
  RT.fingerprint = function (R) {
    const u = R.B.units.map((x) => [x.uid, x.hp, x.maxHp, Math.round(x.rt.x * 1e6)]);
    return RT.hash(JSON.stringify([R.over, R.n, u, R.B.log.length, K.S.items, K.S.flags, K.S.charges]));
  };

  // A whole fight, played by the bot (the tests, and any fight without a screen). Returns the outcome.
  RT.log = []; // per fight: { id, out, t, tries } for tests/balance.js
  RT.autoplay = function (encId, opt = {}) {
    let B = C.start(encId, null);
    let R = RT.begin(B, { assist: opt.assist, scale: opt.scale || (typeof process !== "undefined" && process.env && +process.env.RTSCALE) || undefined });
    const play = () => { let guard = 0; while (!R.over && guard++ < 60 * (RT.P.cap + 30)) RT.step(R, RT.bot(R, opt)); };
    play();
    let total = R.t;
    if (R.over === "retry") { R = RT.retry(R); B = R.B; play(); total += R.t; }
    const rec = { id: encId, out: R.over, t: Math.round(total * 10) / 10, last: Math.round(R.t * 10) / 10, tries: R.tries + 1, capped: !!R.capped, maxAtk: R.stats.maxAtk, fp: RT.fingerprint(R) };
    RT.log.push(rec); if (RT.log.length > 2000) RT.log.shift();
    if (opt.onRecord) opt.onRecord(rec);
    RT.last = R;
    const done = C.end();
    return done ? done.over : R.over;
  };
})(window.K = window.K || {});
