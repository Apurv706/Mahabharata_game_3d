/* The practice ground (akhara): rehearsal, and nothing more (Change List item 23, option 1).
   - Reached from the menu between scenes, offered beside a second chance after a failed test
     ("Practise first, then try again"), and after a lost fight that was not deadly.
   - Every kind of test met in this life, or in a life kept in the Book of Lives, can be played
     again here; kinds not met yet stay locked.
   - Sparring under the real rules of a fight against a training partner: a straw dummy, a fellow
     student or the teacher (never the named opponent who beat you). No one is hurt.
   - Reading the blow: jump a low blow, duck a high one, step aside from a thrust or a charge,
     block anything; slow at first, then faster.
   - The teacher's puppet gives a tip for each kind and shows how ("Show me"). Three speeds: slow and
     normal slow the game clock down; real is the speed of the test itself.
   Nothing done here counts. Everything runs on a copy of the life: whatever a test or a bout
   touches (herbs used, a scar, a ring held) is put back exactly as it was when it ends, and the
   record of fights and tests never hears of it. Never in the middle of a deadly fight, a perilous
   choice or a timed moment. The automated playthroughs never come here. */
(function (K) {
  "use strict";
  const U = K.UI;
  const C = K.Combat;
  const STAGE = "stage_training_ground";

  // The people of the practice ground, as puppets.
  Object.assign(K.PUPPETS, {
    akhara_master: { pronoun: "he", headgear: "band", palette: ["#b47a48", "#d9c9a6", "#a3302a"], beard: true, stage: "elder", item: "staff" },
    student: { pronoun: "he", headgear: "band", palette: ["#b8743f", "#4f6178", "#c9a066"], item: "sword", peer: true },
    straw_dummy: { pronoun: "they", palette: ["#d9b26a", "#b8904a", "#8a6230"], stage: "adult", item: "staff" }
  });

  // ---------- What can be practised ----------
  // Each kind of test: its name here, its group (for the icon), who stands opposite (the teacher
  // watching, or a fellow student), how it is played here (the trial; `who` names the fields that
  // take the partner's name or puppet), the teacher's tip and the two things the teacher shows.
  const KINDS = {
    aim: { group: "bow", name: "The swinging target", partner: "teacher",
      trial: { attr: "aim", skill: "archery", shots: 3, need: 2, rules: "The target swings on its rope. Loose as it crosses your line." },
      tip: "Do not chase the target. Hold your line and let it come to you.",
      show: [["aim", "Watch one whole swing before you loose. Count it: one, and two."], ["loose", "Loose as it meets your line, not after. Where it is when you let go is where you hit."]] },
    draw: { group: "bow", name: "Drawing a heavy bow", partner: "teacher",
      trial: { attr: "might", skill: "archery", shots: 3, need: 2, rules: "Draw the heavy practice bow, and let go while the bar is in the bright band." },
      tip: "Draw in one smooth pull, and watch the bar, not your hands.",
      show: [["aim", "Pull steadily. A jerk shakes the bow, and the bar with it."], ["loose", "Let go as the bar enters the band, not at its far end."]] },
    push: { group: "strength", name: "The wrestler's push", partner: "student", who: { foe: "name" },
      trial: { attr: "might", skill: "mace", rules: "Wrestle a fellow student. Push as the ring meets the mark. Three good pushes win; three slips lose." },
      tip: "Wait for the ring. Too soon and your partner braces; too late and you are shoved back.",
      show: [["brace", "Plant your feet and watch the ring close. Do not move yet."], ["push", "Push as it touches the mark, all at once, from the legs."]] },
    rhythm: { group: "strength", name: "Striking on the beat", partner: "teacher",
      trial: { attr: "might", skill: "mace", bpm: 84, notes: 16, sound: "drum", rules: "Strike the post on every beat as it reaches the ring." },
      tip: "Listen as much as you look. Strike with the sound.",
      show: [["brace", "Let the first few beats go by, and nod with them."], ["strike", "Then strike on the nod, every time a beat meets the ring."]] },
    steady: { group: "strength", name: "Calming a frightened horse", partner: "teacher",
      trial: { attr: "grace", skill: "chariot", horse: true, help: "Hold to move your hand right; let go and it drifts back. Keep it on the horse's head as it shies.",
        rules: "Keep your hand on the frightened horse's head as it shies, until it is calm." },
      tip: "Small touches. Hold a moment, let go, hold again. Chase the horse and it runs.",
      show: [["hold", "Hold for a moment to move your hand toward the horse. Let go before you reach it."], ["stand", "Your hand drifts back by itself. Use that: hold, let go, hold."]] },
    sneak: { group: "stealth", name: "Moving unseen", partner: "teacher", who: { watch: "puppet" },
      trial: { attr: "grace", skill: "stealth", verb: "Move", rules: "Your teacher walks the far side with a lamp. Cross the ground twice, and do not be seen twice.",
        tally: "Crossings: {d} of {n} · Seen: {s} of {m}", made: "Across. Back you go, for another.", spotted: "Seen! You slip back into the shadow." },
      tip: "Stop before the light reaches you, not when it does. When the lamp turns away, go.",
      show: [["sneak", "Watch the lamp-bearer stop and lift the lamp: that means he is about to turn."], ["walk", "Move while the light goes away from you, and stop well before it comes back."]] },
    herd: { group: "stealth", name: "Leading a line to safety", partner: "teacher",
      trial: { attr: "command", skill: "statecraft", theme: "river", stage: "stage_matsya_ford", need: 6, rules: "Gather the strays into a line behind you, and lead them out through the gap." },
      tip: "Gather the near ones first, and turn early. A long line needs room to turn.",
      show: [["walk", "Sweep wide around the field. Every stray you reach falls in behind you."], ["speak", "Head for the gap before the line grows too long to turn."]] },
    notice: { group: "wits", name: "Remembering what you saw", partner: "teacher",
      trial: { attr: "wisdom", skill: "statecraft", count: 7, rules: "Your teacher lays things out, then covers them. Say what was there." },
      tip: "Do not try to see everything at once. Name the things to yourself as you look.",
      show: [["think", "Go along the row and name each thing under your breath: lamp, rope, coin."], ["speak", "When you are asked, say the names back. The one you named is the one you saw."]] },
    retort: { group: "wits", name: "Quick answers", partner: "student",
      trial: { attr: "wisdom", skill: "lore", rules: "Answer each line before the lamp burns down. Two right answers win." },
      tip: "The best answer turns their words back on them. Read all three before you choose.",
      show: [["think", "Listen for the barb in what is said."], ["speak", "Then choose the answer that throws it back, not the one that only denies it."]] },
    drill: { group: "wits", name: "Signs in order", partner: "teacher",
      trial: { attr: "wisdom", skill: "lore", set: "mudra", rules: "Watch the signs light up, then make them again in the same order." },
      tip: "Name each sign as it lights. Then say the names back as you press.",
      show: [["think", "Flag, fist, peak: name them as they light."], ["speak", "Then press them in the order you named them."]] },
    hands: { group: "wits", name: "Watching the thrower's hands", partner: "teacher", who: { thrower: "name" },
      trial: { stage: "stage_dice_board_top", rules: "Your teacher throws the long dice five times and palms a false die once. Say which throw was not honest." },
      tip: "A long die shows only one, two, five or six. Watch for a face it cannot show.",
      show: [["think", "Count the pips on every die, at every throw."], ["speak", "A three or a four means a die from the sleeve."]] },
    pasha: { group: "wits", name: "Long dice", partner: "teacher", who: { opponent: "name" },
      trial: { stage: "stage_dice_board_top" },
      tip: "Stand on a good total. Throw a die again only when you are behind.",
      show: [["think", "Add up your three dice, and theirs."], ["speak", "Behind? Throw your lowest die again. Ahead? Stand."]] },
    chaupar: { group: "wits", name: "Chaupar", partner: "teacher", who: { opponent: "name" },
      trial: { attr: "wisdom", skill: "statecraft", stage: "stage_board_table", rules: "A game of chaupar with your teacher. Bring both your pieces home first." },
      tip: "Keep one piece on a safe square while the other runs.",
      show: [["think", "The marked squares are safe: no piece can be taken there."], ["speak", "Run one piece while the other waits in safety, and take when you can."]] },
    baghchal: { group: "wits", name: "Tigers and goats", partner: "teacher", who: { opponent: "name" },
      trial: { attr: "wisdom", skill: "statecraft", stage: "stage_board_table", rules: "You are the tigers. Take goats before they hem you in." },
      tip: "Keep your tigers apart, so the goats cannot pen them in together.",
      show: [["think", "A tiger takes by jumping over a goat to an empty point."], ["speak", "Keep room around each tiger. A tiger with nowhere to go is lost."]] },
    moksha: { group: "wits", name: "The game of virtues and vices", partner: "teacher", who: { opponent: "name" },
      trial: { attr: "wisdom", skill: "lore", stage: "stage_board_table", rules: "Move by either die. A ladder's virtue saves you from one snake. Reach the top first." },
      tip: "Look where both dice land before you choose. A karma square swaps you with the other player.",
      show: [["think", "Count both moves before you choose."], ["speak", "A ladder carries you up and gives you a virtue. The virtue stops one snake."]] },
    race: { group: "war", name: "Racing a chariot", partner: "student", who: { rival: "name" },
      trial: { attr: "grace", skill: "chariot", vehicle: "chariot", stage: "stage_racetrack", obstacles: ["rock", "wreck"], rules: "Steer through the course, and change lanes to miss what is in your way." },
      tip: "Look past the next rock to the one after it, and change lanes early.",
      show: [["hold", "Watch the road ahead, not your horses."], ["push", "Move as soon as you see something in your lane, and only once."]] },
    dash: { group: "war", name: "Through the turning rings", partner: "teacher",
      trial: { attr: "command", skill: "chariot", mode: "open", lead: false, stage: "stage_chakravyuha_top", rules: "Drive in through each ring's opening as it comes round. A ring you hit throws you back." },
      tip: "Steer for the next opening as soon as you are through a ring, not when you reach it.",
      show: [["hold", "Find the next opening the moment you are through."], ["push", "Crack the whip only when the opening is right ahead."]] },
    rings: { group: "war", name: "Turning the rings", partner: "teacher",
      trial: { attr: "wisdom", skill: "statecraft", mode: "open", stage: "stage_chakravyuha_top", rules: "Turn the rings until every opening lines up with the outer one." },
      tip: "Work from the outside in: each ring you turn drags the next one inward.",
      show: [["think", "Line the second ring up with the outer one first."], ["speak", "Then the third, then the fourth. The innermost drags nothing, so it comes last."]] },
    formation: { group: "war", name: "Setting the array", partner: "teacher",
      trial: { attr: "command", skill: "statecraft", rules: "Your teacher names an array and shows it once. Put each unit on its mark, then send the reserve where the enemy strikes." },
      tip: "While it is shown, say each mark's unit to yourself, from the front to the back.",
      show: [["think", "Front: chariots. Flanks: archers. Say it as you look."], ["speak", "When a unit comes, its mark is already in your head."]] }
  };
  const ORDER = ["aim", "draw", "push", "rhythm", "steady", "sneak", "herd", "notice", "retort", "drill", "hands", "pasha", "chaupar", "baghchal", "moksha", "race", "dash", "rings", "formation"];
  // Kinds whose test is played standing on a painted ground: here, the training ground. The others
  // (a course, a board, a field seen from above) keep their own painting.
  const STANDING = new Set(["aim", "draw", "push", "rhythm", "steady", "sneak", "notice", "retort", "drill", "formation"]);
  // Kinds with no card of rules before they start (the dice games): the teacher stands above them.
  const FRAMELESS = new Set(["pasha", "hands"]);
  // A rehearsal of a real test keeps how it is played (what swings, how many shots, how fast) but not
  // its words, its stakes or the people in it.
  const KEEP = ["attr", "skill", "icon", "dark", "blind", "small", "easy", "shots", "need", "speed", "period", "secs", "horse", "bpm", "notes", "sound", "trips", "spots",
    "count", "things", "set", "lengths", "mode", "vehicle", "obstacles", "hull", "spread", "theme", "array", "rounds", "verb", "upVerb", "downVerb", "rivalSpeed"];
  // Three rounds of teasing for "Quick answers", the right reply first (the test shuffles them).
  const ROUNDS = [
    { line: "\"Your feet are slower than your tongue.\"", replies: ["\"Then it is lucky my tongue is not the one fighting you.\"", "\"My feet are fine.\"", "\"Be quiet.\""] },
    { line: "\"The teacher only keeps you here out of pity.\"", replies: ["\"Then pity me again tomorrow, when I beat you.\"", "\"That is not true.\"", "\"Who told you that?\""] },
    { line: "\"Even the straw dummy is afraid of you. Afraid you will miss it.\"", replies: ["\"Stand beside it, and we will see which of you I miss.\"", "\"I never miss.\"", "\"That is unkind.\""] }
  ];
  KINDS.retort.trial.rounds = ROUNDS;

  // Training partners for sparring: gentle, even, hard. The teacher is your own, if yours fights.
  const PARTNERS = {
    dummy: { name: "A straw dummy", line: "Gentle. A straw dummy on a post; its arm swings back when you hit it." },
    student: { name: "A fellow student", line: "Even. About as good as you are, and keen to prove it." },
    teacher: { name: "Your teacher", line: "Hard. Your teacher, at full strength. Expect to be beaten, and to learn." }
  };
  const SPAR_ORDER = ["dummy", "student", "teacher"];
  const TIER = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5, 7: 5 };
  const FIGHT = { title: "A practice bout", caption: "Blunted weapons", intro: "Blunted weapons, and a teacher watching. No one is hurt here.", winLine: "The bout is yours." };

  // What the teacher says.
  const LINES = {
    hello: "Choose what to work on. Here, a miss costs nothing.",
    win: "Good. Now again, at real speed.",
    close: "Nearly. Once more, and breathe before you act.",
    lose: "Again. Slowly, this time.",
    sparWin: "Good. Do not let it go to your head.",
    sparLose: "You are learning. That is what this ground is for.",
    sparStop: "Rest, then. Come back when you are ready.",
    sparTip: "Watch what your partner means to do next: it is written on their card. Guard before a heavy blow, and read every blow aimed at you.",
    drillTip: "A low blow: jump. A high one: duck. A thrust or a charge: step aside. Block meets anything, for half the harm.",
    drillRules: "Eight blows, slow at first, then faster. Meet each one as the ring meets the mark."
  };
  // Reading the blow: the shape of each blow (the same as in a fight, ui/battle.js), and the four the
  // teacher shows, one for each way of meeting a blow.
  const BLOWS = {
    low: { need: "jump", line: "A low sweep at your legs", y: 0.86, cut: "blade", speed: 1 },
    high: { need: "duck", line: "A swing at your head", y: 0.2, cut: "blade", speed: 1 },
    thrust: { need: "side", line: "A straight thrust", y: 0.5, cut: "blade", speed: 1 },
    charge: { need: "side", line: "A charge, head down", y: 0.55, cut: "charge", speed: 1.15 },
    arrowLow: { need: "jump", line: "An arrow, low, at your legs", y: 0.86, cut: "arrow", speed: 0.85 },
    arrowHigh: { need: "duck", line: "An arrow at your head", y: 0.2, cut: "arrow", speed: 0.85 }
  };
  const DEMO = [["low", "jump", "A low blow: jump."], ["high", "duck", "A high blow: duck."], ["thrust", "side", "A thrust or a charge: step aside."], ["charge", "block", "Anything at all: block, for half the harm."]];
  const SPEEDS = { slow: 0.6, normal: 0.8, real: 1 };
  const SPEED_NAMES = { slow: "Slow", normal: "Normal", real: "Real" };
  // The board games take turns, so speed means nothing there: the same three buttons set how much
  // the teacher helps instead (Slow: points out the best move each turn; Normal: when you ask; Real: not at all).
  const BOARDS = new Set(["pasha", "chaupar", "baghchal", "moksha"]);
  const HELP_NAMES = { slow: "Point it out", normal: "When I ask", real: "No help" };
  // The hints the board games give (ui/boards.js, ui/games.js), listed here for the translators.
  const HINTS = ["Move piece {n}.", "A goat can be taken: that tiger, then the point beyond the goat.", "Keep the tigers free: that tiger, then the open point.", "Move {n}: a ladder waits there.", "Move {n}: the other die lands on a snake.", "Move {n}: the longer step.", "You are behind: throw your lowest die again.", "You are ahead: stand."];
  const HELP_TEXT = { title: "Help", note: "Point it out: the teacher shows the best move each turn. When I ask: a \"Show me\" button.", show: "Show me" };
  // The words of the ground's own pages (passed around before they are translated).
  const TEXT = {
    ground: "The practice ground", note: "Nothing done here changes your life.",
    spar: "Spar with a training partner", sparFx: "The real rules of a fight. No one is hurt.",
    drill: "Read the blow", drillFx: "Jump, duck, step aside or block. Slow at first, then faster.",
    backRetry: "Back to your second chance", backFight: "Back to the story", leave: "Leave the practice ground",
    boutWin: "You won the bout.", boutLose: "You lost the bout.", boutStop: "You stopped the bout.",
    win: "You win", close: "So close", lose: "You lose", drillSum: "{r} of {n} blows read cleanly.",
    here: "You are at the practice ground now.", notNow: "Not now. Finish this moment first." // the menu's notes (ui/modals.js)
  };

  // Every string the player can see here, for the translators (tests/strings.js walks this).
  K.PRACTICE = { kinds: KINDS, partners: PARTNERS, rounds: ROUNDS, fight: FIGHT, lines: LINES, demo: DEMO.map((d) => d[2]), speeds: SPEED_NAMES, help: HELP_NAMES, helpText: HELP_TEXT, hints: HINTS, text: TEXT,
    people: ["The old master of the practice ground", "A fellow student"] };

  const ICONS = {
    bow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3c8 4 8 14 0 18"/><path d="M7 3v18"/><path d="M3 12h17m-3-3 3 3-3 3"/></svg>',
    strength: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="15.5" cy="8.5" r="4.5"/><path d="M12.3 11.7 4 20M13 6.5h5M15.5 4v9"/></svg>',
    stealth: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3.5c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM6 16.5h4M16 8.5c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM14 21.5h4"/></svg>',
    wits: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12c5-7 15-7 20 0-5 7-15 7-20 0z"/><circle cx="12" cy="12" r="3"/></svg>',
    war: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2"/><path d="M12 3.5V10m0 4v6.5M3.5 12H10m4 0h6.5M6 6l4.6 4.6m2.8 2.8L18 18M18 6l-4.6 4.6m-2.8 2.8L6 18"/></svg>'
  };
  // Leather cut-outs for what comes at you (as in ui/battle.js).
  const CUT = {
    arrow: '<svg viewBox="-40 -8 80 16"><path d="M-38 0 L-26 -6 L-26 -2 L30 -2 L36 -7 L36 7 L30 2 L-26 2 L-26 6 Z"/></svg>',
    blade: '<svg viewBox="-30 -30 60 60"><path d="M-24 18 Q-30 -10 4 -26 Q-14 -6 -10 22 Z"/></svg>',
    charge: '<svg viewBox="-30 -20 60 40"><path d="M-28 0 L-8 -16 L-8 -6 L26 -6 L26 6 L-8 6 L-8 16 Z"/></svg>'
  };

  // ---------- Who is here ----------
  const TEACHERS = { drona: ["drona", "Drona"], kripa: ["kripa", "Kripa"], balarama: ["balarama", "Balarama"], hermit: ["mauni", "Mauni the hermit"], vidura: ["vidura", "Vidura"] };
  const FIGHTERS = new Set(["drona", "kripa", "balarama", "hermit"]);
  // Your teacher, or (before you have one, or if yours does not fight) the old master of the ground.
  function teacher(fighting) {
    const id = K.S.teacher, t = TEACHERS[id];
    return t && (!fighting || FIGHTERS.has(id)) ? { puppet: t[0], name: t[1] } : { puppet: "akhara_master", name: "The old master of the practice ground" };
  }
  const student = () => ({ puppet: "student", name: "A fellow student" });

  // ---------- The tests you have met ----------
  // In this life: every test chosen, from the life's log. In earlier lives: the kinds met in the lives
  // kept in the Book of Lives (written down as each life ends; forgotten if the book is cleared).
  const MET = "kurukshetra.v2.metTests";
  function metHere(S = K.S) {
    const out = new Set();
    for (const e of (S && S.log) || []) {
      const i = e.indexOf(":"), sc = K.SCENES[e.slice(0, i)];
      if (!sc) continue;
      let list;
      try { list = K.val(sc.choices, S) || []; } catch (err) { continue; }
      const c = list.find((x) => x.id === e.slice(i + 1));
      if (c && c.game && KINDS[c.game]) out.add(c.game);
    }
    return out;
  }
  K.testsMet = metHere;
  function metBefore() {
    if (!K.lives || !K.lives().length) return [];
    const out = new Set();
    try { const a = JSON.parse(K.store.get(MET) || "[]"); if (Array.isArray(a)) a.forEach((k) => { if (KINDS[k]) out.add(k); }); } catch (e) { /* none kept */ }
    // Each life in the Book of Lives also keeps its own list.
    for (const r of K.lives()) for (const k of r.met || []) if (KINDS[k]) out.add(k);
    return [...out];
  }
  const metAll = () => { const s = new Set(metBefore()); metHere().forEach((k) => s.add(k)); return s; };
  function remember() {
    const prev = metBefore(), all = new Set(prev);
    metHere().forEach((k) => all.add(k));
    if (all.size !== prev.length || !K.lives().length) K.store.set(MET, JSON.stringify([...all]));
  }

  // ---------- The practice state ----------
  // PR: { back (draws the page you came from again), from ("menu" | "retry" | "fight"), last (what
  // you just did, and how it went), snap (the life as it was when the test, bout or drill began; null
  // between them, so a setting changed from the menu meanwhile is kept) }.
  let PR = null;
  function snapshot() { PR.snap = K.clone(K.S); }
  function restore() {
    if (!PR || !PR.snap) return;
    const S = K.S, snap = K.clone(PR.snap);
    for (const k of Object.keys(S)) delete S[k];
    Object.assign(S, snap);
    PR.snap = null;
  }
  // Slow and normal: game time (U.clock, which the tests and the timed defence run on) goes slower.
  let baseClock = null;
  function slow(f) {
    fast();
    if (!(f < 1)) return;
    const base = U.clock, t0 = base();
    baseClock = base;
    U.clock = () => t0 + (base() - t0) * f;
    document.body.classList.add("pr-slow");
    document.body.style.setProperty("--pr-f", String(f));
  }
  function fast() {
    if (baseClock) { U.clock = baseClock; baseClock = null; }
    document.body.classList.remove("pr-slow");
    document.body.style.removeProperty("--pr-f");
  }
  // During a bout: no scar from a practice fight (a fight won on your last legs can leave one), and
  // your figure is drawn from the life as it was, not from the copy the bout is changing.
  let realSpec = null;
  function hold() {
    if (!K.S.injuries.includes("scar")) K.S.injuries.push("scar");
    if (!realSpec) { realSpec = K.puppetSpec; K.puppetSpec = (S) => realSpec(PR && PR.snap && S === K.S ? PR.snap : S); }
  }
  function unhold() { if (realSpec) { K.puppetSpec = realSpec; realSpec = null; } }
  // Left without saying goodbye (a save loaded from the menu): forget the visit. The life now
  // showing is another one, so nothing is put back into it.
  function abandon() { if (PR) PR.snap = null; stopDrill(); watch(null); fast(); unhold(); document.body.classList.remove("pr-bout"); PR = null; }
  K.on("scene", (sc) => { if (PR) abandon(); if (sc && sc.ending) remember(); });

  const speedKey = () => (SPEEDS[K.prefs().practiceSpeed] ? K.prefs().practiceSpeed : "normal");
  const speedNow = () => SPEEDS[speedKey()];
  // The factor the timed shows divide their waits by (games.js, play.js): 1 outside the ground.
  K.practiceSpeed = () => (PR && baseClock ? (parseFloat(document.body.style.getPropertyValue("--pr-f")) || 1) : 1);
  // How much the teacher helps in a board game here: "show" every turn, "ask" on request, or null.
  let boardKind = null;
  K.practiceHelp = () => (PR && boardKind ? { slow: "show", normal: "ask", real: null }[speedKey()] : null);
  // A board game hands its best move here after each draw: { el, line, p }. Shown at once, or behind a
  // "Show me" button, or not at all.
  U.boardHint = function (host, hint) {
    const level = K.practiceHelp();
    host.querySelectorAll(".pr-hint").forEach((el) => el.classList.remove("pr-hint"));
    const old = host.querySelector(".pr-hintrow"); if (old) old.remove();
    if (!level || !hint || !hint.el) return;
    const show = () => {
      hint.el.classList.add("pr-hint");
      const row = host.querySelector(".pr-hintrow") || host.appendChild(U.el('<p class="pr-hintrow"></p>'));
      row.innerHTML = '<span class="pr-hintline">' + U.esc(K.tr(hint.line, hint.p || {})) + "</span>";
    };
    if (level === "show") return show();
    const row = U.el('<p class="pr-hintrow"></p>');
    row.appendChild(U.button("ghost pr-ask", U.tr(HELP_TEXT.show), show));
    host.appendChild(row);
  };
  const second = (c) => !!(c && c.game && ((c.lose && c.lose.penalty) || (c.close && c.close.penalty)));

  // ---------- Ways in ----------
  // Between scenes: a scene page or a result page, nothing timed, nothing perilous, no fight.
  U.canPractise = function () {
    const S = K.S, sc = S && K.SCENES[S.scene], leaf = U.$("leaf");
    if (!U.inScene || !sc || sc.ending || !S.alive || !leaf || !U.redraw || (C && C.state())) return false;
    if (!leaf.classList.contains("split") || leaf.classList.contains("pr-page") || /\b(testing|fighting|journeying)\b/.test(leaf.className)) return false;
    if (document.body.classList.contains("beating") || document.body.classList.contains("intest")) return false;
    if (leaf.querySelector(".lamp")) return false;
    const open = leaf.querySelector(".choices > .choice:not(.picked)");
    if (open && K.choiceList(sc).some((r) => r.ok && K.inPeril(r.c))) return false;
    return true;
  };
  U.practising = () => !!(PR && U.$("leaf") && U.$("leaf").classList.contains("pr-page"));
  U.openPractice = function (o = {}) {
    if (PR) { if (U.$("leaf").classList.contains("pr-page")) return; abandon(); }
    if (!U.canPractise()) return;
    U.stageFinish(false);
    PR = { snap: null, back: U.redraw, from: o.from || "menu", last: null };
    if (o.kind && KINDS[o.kind]) runTest(o.kind, o.trial || null);
    else lobby();
  };
  // Beside a second chance: "Practise first, then try again" (the same kind of test, as it is played
  // there, with a training partner in place of whoever beat you).
  U.practiceOffer = function (sc, rows, box) {
    if (K.headless || !box) return;
    const r = rows.find((x) => x.ok && second(x.c) && KINDS[x.c.game]);
    if (!r || K.val(sc.lamp) || rows.some((x) => x.ok && K.inPeril(x.c))) return;
    box.appendChild(U.button("practice-offer", '<span class="t">' + U.tr("Practise first, then try again") + "</span><small>" + U.tr("At the practice ground. Nothing done there counts.") + "</small>",
      () => U.openPractice({ from: "retry", kind: r.c.game, trial: r.c.trial })));
  };
  // After a lost fight that was not deadly: the story goes on as it is, but you may go and spar.
  U.practiceAfterFight = function (encId) {
    const enc = K.ENCOUNTERS[encId];
    if (!enc || enc.lethal || K.headless || !K.S.alive) return null;
    return U.button("ghost practice-after", '<span class="t">' + U.tr("Go to the practice ground") + "</span><small>" + U.tr("Spar with a training partner. It changes nothing.") + "</small>",
      () => U.openPractice({ from: "fight" }));
  };

  function leave() {
    if (!PR) return;
    const back = PR.back;
    stopDrill(); watch(null); fast(); unhold(); restore();
    PR = null;
    if (K.Sound && K.Sound.test) K.Sound.test(null);
    if (U.stageFx) U.stageFx.stop();
    document.body.classList.remove("intest");
    if (typeof back === "function") back(); else K.resume(K.S);
  }
  const leaveLabel = () => (PR.from === "retry" ? TEXT.backRetry : PR.from === "fight" ? TEXT.backFight : TEXT.leave);

  // ---------- Pieces of the page ----------
  function setPose(svg, p) { if (svg) svg.setAttribute("class", svg.getAttribute("class").replace(/pose-\S+/, "pose-" + p)); }
  function coachHtml(line, small, fighting) {
    const t = teacher(fighting);
    return '<div class="pr-coach' + (small ? " small" : "") + '"><span class="pr-teach">' + U.puppet(U.puppetFor(t.puppet), { h: small ? 84 : 112, pose: "speak" }) + "</span>" +
      '<div class="pr-say"><b class="pr-who">' + U.tr(t.name) + '</b><p class="pr-line">' + U.t(line) + "</p></div></div>";
  }
  function speedHtml(board) {
    const cur = speedKey(), names = board ? HELP_NAMES : SPEED_NAMES, title = board ? HELP_TEXT.title : "Speed", note = board ? HELP_TEXT.note : "Real is the speed of the test itself.";
    return '<div class="seg-row pr-speed"><span>' + U.tr(title) + "<small>" + U.tr(note) + "</small></span>" +
      '<div class="seg" role="radiogroup" aria-label="' + U.tr(title) + '">' + Object.keys(SPEEDS).map((v) => '<button type="button" role="radio" data-speed="' + v + '" aria-checked="' + (v === cur) + '">' + U.tr(names[v]) + "</button>").join("") + "</div></div>";
  }
  function bindSpeed(root, onChange) {
    root.querySelectorAll("[data-speed]").forEach((b) => b.addEventListener("click", () => {
      K.prefs({ practiceSpeed: b.dataset.speed });
      root.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      if (onChange) onChange(b.dataset.speed);
    }));
  }
  // The teacher shows how: two moves, each with its words, then the tip again.
  function showMe(coach, steps, wrap, btn) {
    const line = coach.querySelector(".pr-line"), fig = coach.querySelector(".pr-teach svg"), tip = line.innerHTML;
    if (btn) btn.disabled = true;
    // The words change; the card around them does not move (nothing jumps under your finger).
    line.style.minHeight = line.offsetHeight + "px";
    let i = 0;
    const step = () => {
      if (!coach.isConnected) return;
      if (i >= steps.length) { line.innerHTML = tip; line.classList.remove("step"); line.style.minHeight = ""; setPose(fig, "speak"); if (btn) { btn.disabled = false; btn.focus({ preventScroll: true }); } return; }
      const [pose, text] = steps[i++];
      line.textContent = K.text(text); line.classList.add("step");
      setPose(fig, pose);
      if (wrap) U.castPose(wrap, "me", pose, 2400);
      setTimeout(step, 3000);
    };
    step();
  }
  function statsOf(t) { return t && (t.attr || t.skill) ? K.list([t.attr && K.tr(K.ATTRS[t.attr]), t.skill && K.tr(K.SKILLS[t.skill])].filter(Boolean)) : ""; }
  function tileHtml(k, open) {
    const d = KINDS[k], st = statsOf(d.trial);
    return '<button type="button" class="pr-tile" data-kind="' + k + '"' + (open ? "" : " disabled") + ">" + ICONS[d.group] + "<span>" + U.tr(d.name) + "</span>" +
      "<small>" + (open ? U.esc(st) : U.tr("Not met yet")) + "</small></button>";
  }
  function bannerHtml() {
    const L = PR.last;
    if (!L) return "";
    let word, cls;
    if (L.kind === "spar") { word = { win: TEXT.boutWin, spare: TEXT.boutWin, lose: TEXT.boutLose }[L.outcome] || TEXT.boutStop; cls = L.outcome === "lose" ? "lose" : L.outcome === "flee" ? "close" : "win"; }
    else { word = { win: TEXT.win, close: TEXT.close }[L.outcome] || TEXT.lose; cls = L.outcome === "win" || L.outcome === "close" ? L.outcome : "lose"; }
    const name = L.kind === "spar" ? TEXT.spar : L.kind === "drill" ? TEXT.drill : KINDS[L.kind].name;
    return '<div class="result pr-result ' + cls + '"><p class="pr-what">' + U.tr(name) + '</p><div class="pr-res-row"><p><b>' + U.tr(word) + "</b>" + (L.summary ? " " + U.t(L.summary) : "") + "</p>" +
      '<button type="button" class="cta secondary pr-again">' + U.tr("Again") + "</button></div></div>";
  }
  function teacherSays() {
    const L = PR.last;
    if (!L) return LINES.hello;
    if (L.kind === "spar") return L.outcome === "lose" ? LINES.sparLose : L.outcome === "flee" ? LINES.sparStop : LINES.sparWin;
    return LINES[L.outcome] || LINES.lose;
  }
  function again() {
    const L = PR.last;
    if (!L) return;
    if (L.kind === "spar") spar(L.partner);
    else if (L.kind === "drill") drill(false);
    else runTest(L.kind, L.real);
  }
  // A page of the practice ground: its heading with your figure, the teacher, and the actions.
  function page(heading, storyHtml) {
    U.setNav(true);
    document.body.classList.remove("intest");
    if (U.stageFx) U.stageFx.stop();
    const S = K.S, sc = K.SCENES[S.scene];
    U.where("<b>" + U.tr(TEXT.ground) + "</b><span>" + U.tr("Age {n}", { n: S.age }) + " · " + U.t(K.val(sc && sc.place) || "") + "</span>");
    const leaf = U.$("leaf");
    leaf.className = "leaf split pr-page";
    leaf.innerHTML = U.plate({ art: STAGE, tag: "yours", tagText: K.tr("Practice"), small: TEXT.note, heading }) +
      '<div class="text"><div class="story" id="pr-story" tabindex="0">' + storyHtml + '</div><div class="actions"><div class="choices" id="pr-acts"></div></div></div>';
    U.settled = true;
    U.fitBackdrop();
    U.renderLedger();
    // A quiet bed of music while you choose (started once, not again on every page).
    if (K.Sound && PR.music !== "bed") { K.Sound.mood("calm"); if (K.Sound.test) K.Sound.test("akhara"); PR.music = "bed"; }
    return { leaf, acts: U.$("pr-acts") };
  }
  const card = (acts, n, title, fx, run, extra) => {
    const b = U.button("choice pr-main" + (extra ? " has-img" : ""), '<span class="k">' + n + "</span>" + (extra || "") + '<span class="t">' + U.tr(title) + '</span><span class="fx">' + U.tr(fx) + "</span>", run);
    acts.appendChild(b);
    return run;
  };

  // ---------- The ground ----------
  function lobby() {
    if (!PR) return;
    stopDrill();
    const known = metAll();
    const { leaf, acts } = page(TEXT.ground, coachHtml(teacherSays()) + bannerHtml() +
      '<span class="lbl pr-lbl">' + U.tr("Tests you have met") + '</span><div class="pr-grid">' + ORDER.map((k) => tileHtml(k, known.has(k))).join("") + "</div>" + speedHtml());
    leaf.classList.add("pr-lobby");
    const keys = [card(acts, 1, TEXT.spar, TEXT.sparFx, partners), card(acts, 2, TEXT.drill, TEXT.drillFx, () => drill(false))];
    acts.appendChild(U.button("cta secondary pr-leave", U.tr(leaveLabel()), leave));
    leaf.querySelectorAll(".pr-tile[data-kind]:not([disabled])").forEach((b) => b.addEventListener("click", () => runTest(b.dataset.kind)));
    bindSpeed(leaf);
    const ag = leaf.querySelector(".pr-again");
    if (ag) ag.addEventListener("click", again);
    U.keys(keys);
    U.redraw = lobby;
    // Back from a test, the action key may still be going: the page takes the focus, not "Again".
    (ag ? U.$("pr-story") : acts.querySelector(".choice")).focus({ preventScroll: true });
  }

  // Choosing a training partner, under the teacher's eye.
  function partners() {
    if (!PR) return;
    const { leaf, acts } = page(TEXT.spar, coachHtml(LINES.sparTip, false, true) + speedHtml());
    const tch = teacher(true);
    const keys = SPAR_ORDER.map((id, i) => {
      const p = PARTNERS[id], spec = U.puppetFor(id === "dummy" ? "straw_dummy" : id === "student" ? "student" : tch.puppet);
      return card(acts, i + 1, id === "teacher" ? tch.name : p.name, p.line, () => spar(id), '<span class="thumb pr-fig">' + U.puppet(spec, { h: 72, flip: true, fit: true }) + "</span>");
    });
    const row = U.el('<div class="btnrow pr-row"></div>');
    row.appendChild(U.button("cta secondary pr-show", U.tr("Show me"), () => drill(true, partners)));
    row.appendChild(U.button("ghost", U.tr("Back"), lobby));
    acts.appendChild(row);
    bindSpeed(leaf);
    U.keys(keys);
    U.redraw = partners;
    acts.querySelector(".choice").focus({ preventScroll: true });
  }

  // ---------- A test, played here ----------
  function trialFor(kind, real) {
    const d = KINDS[kind], t = Object.assign({}, d.trial);
    if (real) for (const k of KEEP) if (real[k] !== undefined) t[k] = real[k];
    t.stage = STANDING.has(kind) ? STAGE : (real && real.stage && K.val(real.stage)) || t.stage || STAGE;
    const who = d.partner === "student" ? student() : teacher();
    t.cast = [who.puppet]; t.spar = false; /* (a drill here stays a drill: the ground has bouts of its own) */
    for (const [f, what] of Object.entries(d.who || {})) t[f] = what === "puppet" ? who.puppet : who.name;
    if (kind === "race" && real && !real.rival) delete t.rival; // a course against the clock stays one
    if (kind === "rings" && t.mode !== "open") t.rules = "The wheel keeps turning toward a straight way in. Keep at least one ring out of line."; // a wheel held shut
    return t;
  }
  function runTest(kind, real) {
    if (!PR) return;
    stopDrill();
    const d = KINDS[kind], t = trialFor(kind, real);
    const c = { id: "practice", t: d.name, game: kind, trial: t };
    snapshot();
    U.setNav(true);
    const leaf = U.$("leaf");
    leaf.className = "leaf split pr-page testing";
    leaf.innerHTML = U.plate({ art: t.stage, tag: "yours", tagText: K.tr("Practice"), heading: d.name }) +
      '<div class="text"><div class="story" id="pr-story"></div><div class="actions"><div class="choices" id="pr-acts"></div></div></div>';
    const box = U.$("pr-acts");
    if (U.stageFx) U.stageFx.start(t.stage);
    if (K.Sound && K.Sound.test) K.Sound.test(kind);
    PR.music = null;
    boardKind = BOARDS.has(kind) ? kind : null;
    slow(speedNow());
    let game = null;
    game = U.games[kind](box, (outcome, summary) => {
      if (!PR) return;
      boardKind = null;
      fast();
      if (K.Sound && K.Sound.test) K.Sound.test(null);
      restore();
      PR.last = { kind, outcome, summary, real };
      lobby();
    }, c);
    coachInto(box, kind);
    U.redraw = () => { if (game && game.draw) game.draw(); coachInto(box, kind); };
  }
  // The teacher on the card of rules, with the speed and "Show me" beside "Begin".
  function coachInto(box, kind) {
    const wrap = box.querySelector(".trial"), host = wrap && wrap.querySelector(".trial-body");
    if (!host || wrap.querySelector(".pr-coach")) return;
    const d = KINDS[kind], coach = U.el(coachHtml(d.tip, true));
    if (FRAMELESS.has(kind)) {
      wrap.insertBefore(coach, host);
      if (BOARDS.has(kind)) { const sp = U.el(speedHtml(true)); wrap.insertBefore(sp, host); bindSpeed(sp); }
      coach.querySelector(".pr-say").appendChild(U.button("ghost pr-show", U.tr("Show me"), (e) => showMe(coach, d.show, wrap, e.currentTarget)));
      return;
    }
    const row = host.querySelector(":scope > .btnrow");
    if (!row || wrap.classList.contains("playing")) return;
    host.insertBefore(coach, row);
    const sp = U.el(speedHtml(BOARDS.has(kind)));
    host.insertBefore(sp, row);
    bindSpeed(sp, (v) => slow(SPEEDS[v]));
    row.appendChild(U.button("cta secondary pr-show", U.tr("Show me"), (e) => showMe(coach, d.show, wrap, e.currentTarget)));
  }

  // ---------- A bout ----------
  function spar(id) {
    if (!PR) return;
    stopDrill();
    const tier = TIER[K.S.act] || 2, tch = teacher(true);
    const unit = id === "dummy" ? { name: PARTNERS.dummy.name, person: "straw_dummy", hp: 8 + tier * 5, atk: 1, def: 1, abilities: ["strike"] }
      : id === "student" ? Object.assign(K.foe(PARTNERS.student.name, tier), { person: "student" })
      : Object.assign(K.foe(tch.name, tier + 2, { abilities: ["strike", "heavy", "breaker"] }), { person: tch.puppet });
    K.encounter({ id: "x_practice", title: FIGHT.title, art: STAGE, stage: STAGE, caption: FIGHT.caption, lethal: false, intro: FIGHT.intro, winLine: FIGHT.winLine,
      enemies: [unit], flee: { tags: [] } });
    snapshot();
    hold();
    slow(speedNow());
    if (K.Sound && K.Sound.test) K.Sound.test(null);
    PR.music = null;
    document.body.classList.add("pr-bout");
    U.startBattle("x_practice", (outcome) => {
      document.body.classList.remove("pr-bout");
      fast(); unhold(); restore();
      if (!PR) return;
      PR.last = { kind: "spar", partner: id, outcome };
      lobby();
    });
    // No divine weapon is loosed at a training partner.
    const B = C.state(), p = C.player();
    if (B && p && p.abilities.includes("astra")) { p.abilities = p.abilities.filter((a) => a !== "astra"); U.renderBattle(B); }
    boutStop(B);
  }
  // A bout can be stopped at any time: from beside its name, so the moves keep the room at the foot.
  function boutStop(B) {
    if (!B || !document.body.classList.contains("pr-bout")) return;
    const head = document.querySelector("#leaf > .pagehead .ph-line"), have = head && head.querySelector(".pr-bout-stop");
    if (B.over) { if (have) have.remove(); return; }
    if (head && !have) head.appendChild(U.button("ghost pr-bout-stop", U.tr("Stop the bout"), () => { if (C.canFlee()) C.flee(); }));
  }
  K.on("combat", boutStop);

  // ---------- Reading the blow ----------
  let D = null; // the drill in progress: { stop() }
  function stopDrill() { if (D) { const d = D; D = null; d.stop(); } }
  // The panel under the figures keeps the tallest height it has had, so they do not bob up and down
  // as the card gives way to the blows and back; and whenever it changes, the painting's ground is
  // put back under their feet (dom.js U.groundFit), at once rather than on the next frame.
  let ro = null;
  function settle() {
    const body = U.$("battle-body");
    if (!body || !body.closest(".pr-drill")) return;
    if (U.upright()) { const h = body.offsetHeight; if (h > (parseFloat(body.style.minHeight) || 0)) body.style.minHeight = h + "px"; }
    U.fitBackdrop(true);
  }
  function watch(el) { if (ro) ro.disconnect(); ro = el && window.ResizeObserver ? new ResizeObserver(settle) : null; if (ro) ro.observe(el); }
  const actorEl = (uid) => document.querySelector('#arena .actor[data-uid="' + uid + '"]');
  function pose(uid, p, ms) {
    const el = actorEl(uid), svg = el && el.querySelector(".pp");
    if (!svg) return;
    setPose(svg, p);
    clearTimeout(svg._t);
    if (ms) svg._t = setTimeout(() => { if (svg.isConnected) setPose(svg, el.classList.contains("player") ? "brace" : "stand"); }, ms);
  }
  function burst(uid, cls, ms) { const el = actorEl(uid); if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms || 500); }
  const actorHtml = (uid, side, spec, p, label, flip) => '<span class="actor ' + side + '" data-uid="' + uid + '">' + U.puppet(spec, { h: 150, flip, pose: p, label }) + '<span class="pops"></span></span>';
  // The drill's screen: the fight's own, full screen on the training ground, you and the teacher.
  function drill(demo, after) {
    if (!PR) return;
    stopDrill();
    const tch = teacher(true);
    U.setNav(true);
    const leaf = U.$("leaf");
    leaf.className = "leaf fighting immersive pr-page pr-drill";
    document.body.classList.add("intest");
    U.setBackdrop(STAGE);
    leaf.innerHTML = U.plate({ art: STAGE, keepArt: true, tag: "yours", tagText: K.tr("Practice"), heading: TEXT.drill, noFigure: true }) +
      '<div class="arena" id="arena" style="--stage:url(\'' + U.artUrl(STAGE) + '\')" aria-hidden="true"><div class="team left">' + actorHtml("p", "player", K.puppetSpec(K.S), "brace", K.tr("You")) +
      '</div><div class="team right">' + actorHtml("e0", "enemy", U.puppetFor(tch.puppet), "stand", null, true) + '</div><div class="arena-flash"></div></div>' +
      '<div class="text battle" id="battle-body"><div id="battle-actions"></div></div>';
    watch(U.$("battle-body"));
    if (K.Sound) K.Sound.mood("calm");
    U.redraw = () => drill(demo, after);
    if (demo) return blows(true, after || drillCard);
    drillCard();
  }
  function drillCard() {
    if (!PR) return;
    const box = U.$("battle-actions");
    if (!box) return drill(false);
    box.innerHTML = '<div class="qte pr-card">' + coachHtml(LINES.drillTip, true, true) + '<p class="game-rules">' + U.tr(LINES.drillRules) + "</p>" + speedHtml() + '<div class="btnrow pr-row"></div></div>';
    const row = box.querySelector(".pr-row");
    const go = () => blows(false);
    row.appendChild(U.button("cta", U.tr("Begin"), go));
    row.appendChild(U.button("cta secondary pr-show", U.tr("Show me"), () => blows(true, drillCard)));
    row.appendChild(U.button("ghost", U.tr("Back"), lobby));
    bindSpeed(box);
    U.keys([go]);
    row.querySelector(".cta").focus({ preventScroll: true });
    settle();
  }
  // Eight blows (or, shown by the teacher, four: one for each way of meeting a blow).
  function blows(demo, after) {
    const box = U.$("battle-actions");
    if (!box) return;
    stopDrill();
    const list = demo ? DEMO.map(([k, move, line]) => ({ k, move, line }))
      : ["low", "high", "thrust", "charge", "arrowLow", "arrowHigh", "low", "high"].map((k) => ({ k, r: Math.random() })).sort((a, b) => a.r - b.r);
    const n = list.length, tally = { clean: 0, block: 0, miss: 0 };
    let i = 0, timer = 0, cur = null, live = true;
    box.innerHTML = '<div class="pr-top"><p class="pr-score" aria-live="polite"></p></div><div class="pr-q"></div>';
    const score = box.querySelector(".pr-score"), slot = box.querySelector(".pr-q");
    if (!demo) box.querySelector(".pr-top").appendChild(U.button("ghost pr-stop", U.tr("Stop"), () => { stopDrill(); fast(); lobby(); }));
    const mark = () => { score.textContent = K.tr("Blow {n} of {m} · Read cleanly: {r}", { n: Math.min(i + 1, n), m: n, r: tally.clean }); };
    snapshot();
    slow(demo ? Math.min(speedNow(), 0.7) : speedNow());
    const end = () => {
      live = false; fast(); restore();
      if (demo) return after ? after() : drillCard();
      const r = tally.clean;
      PR.last = { kind: "drill", outcome: r >= 6 ? "win" : r >= 4 ? "close" : "lose", summary: [TEXT.drillSum, { r, n }] };
      lobby();
    };
    const next = () => {
      if (!live) return;
      if (i >= n) return end();
      mark();
      const b = list[i];
      // Slow at first, then faster: from half as long again down to the fight's own pace.
      const T = 1.1 * (BLOWS[b.k].speed || 1) * (demo ? 1.4 : 1.5 - (0.5 * i) / Math.max(1, n - 1));
      cur = blow(slot, b, T, demo, i === 0, (res) => {
        cur = null;
        tally[res === "counter" || res === "dodge" ? "clean" : res === "block" ? "block" : "miss"]++;
        i++; mark();
        timer = setTimeout(next, U.motion() ? (demo ? 900 : 650) : 200);
      });
    };
    D = { stop() { live = false; clearTimeout(timer); if (cur) cur.stop(); fast(); restore(); } };
    U.keys([]);
    next();
    settle();
  }
  // One blow, met as in a fight (ui/battle.js): the same windows, keys, swipes and figures.
  function blow(slot, b, T, demo, first, done) {
    const B2 = BLOWS[b.k], tch = teacher(true), g = K.attr("grace");
    const END = T * 1.32, W = { perfect: 0.05 + g * 0.003, move: 0.13 + g * 0.008, block: 0.14 + g * 0.008 };
    // How to meet a blow is said once, on the first; after that the note is kept for how it went.
    const how = demo ? K.tr(b.line) : first ? K.tr("Read the blow: jump, duck, sidestep or block, as the ring meets the mark. Swipe or use the arrow keys.") : "";
    const el = U.el('<div class="qte" role="group" aria-label="' + U.esc(K.tr("Meet the blow")) + '"><p class="qte-who"><b>' + U.esc(K.tr(tch.name)) + "</b> · " + U.esc(K.tr(B2.line)) + "</p>" +
      '<div class="qte-ring"><i class="mark"></i><i class="ring"></i></div><p class="qte-note" aria-live="assertive">' + U.esc(how) + '</p><div class="btnrow qte-btns"></div></div>');
    slot.innerHTML = "";
    slot.appendChild(el);
    const ring = el.querySelector(".ring"), note = el.querySelector(".qte-note");
    const LINE = { counter: "A perfect read! You strike back.", block: "Blocked.", dodge: "Clear!", graze: "Late: it grazes you.", early: "Too early.", late: "Too late.", wrong: "The wrong way!" };
    let t0 = 0, raf = 0, over = false, flyer = null;
    const off = () => { document.removeEventListener("keydown", onKey, true); document.removeEventListener("pointerdown", pd, true); document.removeEventListener("pointerup", pu, true); };
    const finish = (result, line, move) => {
      if (over) return;
      over = true; cancelAnimationFrame(raf); off();
      if (flyer) { const f = flyer; f.classList.add(result === "dodge" || result === "counter" ? "past" : "gone"); setTimeout(() => f.remove(), 520); }
      note.textContent = demo ? K.tr(b.line) : K.tr(LINE[line || result] || line);
      el.classList.add(result === "miss" ? "bad" : "good");
      pose("e0", "strike", 600);
      if (move === "jump" || move === "duck" || move === "side") { burst("p", "act-" + move, 760); pose("p", move, 760); }
      else if (move) pose("p", "block", 700);
      if (result === "miss") { burst("p", "struck", 420); pose("p", "hit", 420); }
      if (K.Sound) K.Sound.play(result === "miss" ? "hit" : result === "dodge" ? "tap" : "clang");
      setTimeout(() => done(result), U.motion() ? 480 : 120);
    };
    const now = () => (U.clock() - t0) / 1000;
    const act = (move) => {
      if (over || demo) return;
      const d = now() - T, a = Math.abs(d);
      if (move === "block") { if (a <= W.perfect) finish("counter", null, move); else if (a <= W.block) finish("block", null, move); else finish("miss", d < 0 ? "early" : "late", move); return; }
      if (move !== B2.need) return finish("miss", "wrong", move);
      if (a <= W.perfect) finish("counter", null, move);
      else if (a <= W.move) finish("dodge", null, move);
      else if (d > 0 && a <= W.move * 1.8) finish("block", "graze", move);
      else finish("miss", d < 0 ? "early" : "late", move);
    };
    const row = el.querySelector(".qte-btns");
    [["Jump ↑", "jump"], ["Duck ↓", "duck"], ["Sidestep ↔", "side"], ["Block", "block"]].forEach(([lbl, m]) => {
      const bt = U.pressButton(lbl, () => act(m));
      bt.classList.add("mv-" + m);
      if (m !== "block") bt.classList.add("secondary");
      if (demo) { bt.disabled = true; if (m === b.move) bt.classList.add("pr-hint"); }
      row.appendChild(bt);
    });
    const onKey = (e) => {
      if (e.repeat) return;
      const m = { ArrowUp: "jump", w: "jump", W: "jump", ArrowDown: "duck", s: "duck", S: "duck", ArrowLeft: "side", ArrowRight: "side", a: "side", A: "side", d: "side", D: "side", Shift: "side", " ": "block", Enter: "block", b: "block", B: "block" }[e.key];
      if (m) { e.preventDefault(); e.stopPropagation(); act(m); }
    };
    let sw = null;
    const pd = (e) => { if (e.target.closest("button")) return; sw = { x: e.clientX, y: e.clientY }; };
    const pu = (e) => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return; act(Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "jump" : "duck") : "side"); };
    if (!demo) { document.addEventListener("keydown", onKey, true); document.addEventListener("pointerdown", pd, true); document.addEventListener("pointerup", pu, true); }
    // The teacher winds up, and what he looses flies at you, at the height it will strike.
    pose("e0", B2.cut === "arrow" ? "aim" : "hold");
    const ar = U.$("arena"), ae = actorEl("e0"), pe = actorEl("p");
    if (ar && ae && pe && U.motion()) {
      const r0 = ar.getBoundingClientRect(), ra = ae.getBoundingClientRect(), rp = pe.getBoundingClientRect();
      flyer = U.el('<i class="incoming ' + B2.cut + " " + b.k + '" aria-hidden="true">' + CUT[B2.cut] + "</i>");
      flyer.style.cssText = "left:" + (ra.left - r0.left + ra.width * 0.3) + "px;top:" + (rp.top - r0.top + rp.height * B2.y) + "px;--to:" + (rp.left - ra.left + rp.width * 0.2 - ra.width * 0.3) + "px;--dur:" + T + "s";
      ar.appendChild(flyer);
      requestAnimationFrame(() => flyer && flyer.classList.add("go"));
    }
    const tick = () => {
      if (over) return;
      if (!el.isConnected) { over = true; off(); return; }
      const s = now(), p = Math.min(1, s / T);
      ring.style.transform = "translate(-50%, -50%) scale(" + Math.max(0.12, 1 - p * 0.7 - Math.max(0, s - T) * 0.6) + ")";
      if (demo && s >= T) return finish("counter", null, b.move);
      if (s >= END) return finish("miss", "late");
      raf = requestAnimationFrame(tick);
    };
    t0 = U.clock();
    raf = requestAnimationFrame(tick);
    if (!demo) { const bl = row.querySelector(".mv-block"); if (bl) bl.focus({ preventScroll: true }); }
    return { stop() { over = true; cancelAnimationFrame(raf); off(); if (flyer) flyer.remove(); } };
  }
})(window.K = window.K || {});

// ---------- Fighter mode (feedback item 21, owner 5 November) ----------
// On waking from the dream the player chooses how to play: "Live the story" (Act I, as ever) or "Just
// fight". Just fight: pick a weapon (a path's weapon, its Block or Roll and its skills), then the game's
// real-time fights come one after another, from the bandits on the road to the night raid, each a little
// harder (the act ramp and the difficulty setting, engine/realtime.js). Each opens on its own painting with
// its title card, and the act cards divide the run. No story, choices, friends, company, call for help or
// divine weapon; herbs, two a fight. A lost fight may be tried once more; lose that and the run ends, with
// its count and the best run kept on this device. Nothing of the run is carried into a life.
(function (K) {
  "use strict";
  const U = K.UI;
  // The ladder: [fight, act]. Your side is the Pandavas' all through, so the war's fights are one war. Ugra at the fair
  // opens it: the bandits on the road are grown men, met once you have trained (as a first fight at thirteen, one
  // run in three ended there).
  const LADDER = [["e_ugra", 1], ["e_spar", 2], ["e_bandits", 2], ["e_panchala", 2], ["e_border", 2], ["e_kings", 3], ["e_sudatta", 4],
    ["e_gandharva", 5], ["e_jayadratha", 5], ["e_cattle", 5], ["cross_e_duel", 6], ["e_gate", 6], ["e_road", 6], ["e_night", 6], ["e_dushasana", 6], ["e_raid", 7]];
  K.FIGHTER_LADDER = LADDER;
  // You, as a life of that act would be (measured over lives: from act II on, a fighter's health and blows hardly grow).
  const GROW = { 1: { age: 13, might: 3, grace: 3, stat: 2, skill: 1 }, 2: { age: 18, might: 3, grace: 4, stat: 3, skill: 4 }, 3: { age: 25, might: 3, grace: 4, stat: 4, skill: 4 },
    4: { age: 30, might: 3, grace: 4, stat: 4, skill: 5 }, 5: { age: 36, might: 3, grace: 4, stat: 4, skill: 5 }, 6: { age: 44, might: 4, grace: 4, stat: 4, skill: 5 }, 7: { age: 44, might: 4, grace: 4, stat: 4, skill: 6 } };
  K.fighterGrow = function (S, act) {
    const g = GROW[act] || GROW[6], P = K.PATHS[S.path] || {};
    S.act = act; S.age = g.age;
    S.attrs = { might: g.might, aim: g.stat, grace: g.grace, wisdom: g.stat, command: g.stat };
    if (P.stat && P.stat !== "might" && P.stat !== "grace") S.attrs[P.stat] = g.stat;
    S.skills = { archery: 0, mace: 1, chariot: 0, statecraft: 0, healing: 0, stealth: 0, lore: 0 };
    if (P.skill) S.skills[P.skill] = g.skill + (P.skill === "mace" ? 0 : 0);
    S.items = Object.assign({}, S.items, { herbs: 2 });
    S.astras = []; S.boons = []; S.injuries = []; S.curses = []; S.vows = []; S.friend = null; S.spouse = null; S.child = null;
    S.side = "pandava"; S.storyMode = false; S.fighter = true;
  };
  const best = () => { const b = K.prefs().fighterBest; return b && typeof b.won === "number" ? b : null; };
  const clock = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  let sheetEl = null;
  function sheet(html, wire) {
    if (sheetEl) sheetEl.remove();
    sheetEl = U.el('<div class="fmode" role="dialog" aria-modal="true"><div class="fm-in">' + html + "</div></div>");
    document.body.appendChild(sheetEl);
    requestAnimationFrame(() => requestAnimationFrame(() => sheetEl && sheetEl.classList.add("in")));
    wire(sheetEl);
    const f = sheetEl.querySelector("button"); if (f && !U.calm()) f.focus({ preventScroll: true });
  }
  const closeSheet = () => { if (!sheetEl) return; const el = sheetEl; sheetEl = null; el.classList.remove("in"); el.classList.add("out"); setTimeout(() => el.remove(), 400); };
  const bestLine = () => { const b = best(); return b ? '<p class="fm-best">' + U.tr("Best run: {n} fights won · {t}", { n: b.won, t: clock(b.secs) }) + "</p>" : ""; };

  // On waking: how will you play?
  U.askMode = function (done) {
    if (K.headless || /jsdom/i.test(navigator.userAgent || "") || !K.S || K.S.modeAsked) return done();
    K.S.modeAsked = true;
    sheet('<h2>' + U.tr("How will you play?") + "</h2>" +
      '<div class="fm-pick">' +
      '<button type="button" class="fm-card" data-mode="story"><b>' + U.tr("Live the story") + "</b><small>" + U.tr("Grow up, choose a side, and live a whole life to the war and after.") + "</small></button>" +
      '<button type="button" class="fm-card" data-mode="fight"><b>' + U.tr("Just fight") + "</b><small>" + U.tr("The fights alone, one after another, each a little harder. No story, no friends, no divine weapons.") + "</small></button>" +
      "</div>" + bestLine(), (el) => {
      el.querySelector('[data-mode="story"]').addEventListener("click", () => { closeSheet(); done(); });
      el.querySelector('[data-mode="fight"]').addEventListener("click", () => { U.fighterStart(done); });
    });
  };

  // The weapon, then the run.
  const WEAPON = { archer: "Bow", mace: "Mace and shield", charioteer: "Spear and shield", strategist: "Sword and shield", healer: "Dagger", spy: "Dagger", bard: "Dagger" };
  // Each weapon's rhythm (Build D, row 48): the line on its card.
  const FEEL = { archer: "From range; roll to defend", mace: "Heavy: slow to recover", charioteer: "Long reach; blocks", strategist: "Balanced; blocks", healer: "Quick and light; rolls", spy: "Quick and light; rolls", bard: "Quick and light; rolls" };
  let life = null, story = null;
  U.fighterStart = function (toStory) {
    if (toStory) story = toStory;
    if (!life) life = JSON.stringify(K.S); // the life as it woke: "Live the story" goes back to it
    const paths = Object.keys(K.PATHS);
    sheet('<h2>' + U.tr("Choose your weapon") + "</h2>" +
      '<div class="fm-weapons">' + paths.map((p) => {
        const block = K.Combat.SHIELD_PATHS[p];
        return '<button type="button" class="fm-w" data-path="' + p + '"><b>' + U.tr(K.PATHS[p].name) + "</b><small>" + U.tr(WEAPON[p]) + " · " + U.tr(FEEL[p] || (block ? "Blocks" : "Rolls")) + "</small></button>";
      }).join("") + "</div>" + bestLine() +
      (story ? '<div class="btnrow"><button type="button" class="ghost" data-story>' + U.tr("Live the story instead") + "</button></div>" : ""), (el) => {
      el.querySelectorAll("[data-path]").forEach((b) => b.addEventListener("click", () => { closeSheet(); run(b.dataset.path); }));
      const s = el.querySelector("[data-story]"); if (s) s.addEventListener("click", toLife);
    });
  };
  function toLife() {
    closeSheet();
    if (life) { K.S = JSON.parse(life); life = null; }
    const go = story; story = null;
    if (go) go();
  }
  let F = null;
  function run(path) {
    K.S = JSON.parse(life); K.S.path = path;
    F = { path, i: 0, won: 0, t0: Date.now(), act: 0 };
    next();
  }
  function next() {
    const [id, act] = LADDER[F.i], enc = K.ENCOUNTERS[id];
    if (!enc) { F.i++; return F.i < LADDER.length ? next() : over(true); }
    K.fighterGrow(K.S, act);
    const newAct = act !== F.act; F.act = act;
    const sc = { title: K.val(enc.title), place: K.val(enc.caption) || null, art: enc.art };
    U.sceneBeats(sc, { act: newAct, full: true, tag: "written", tagText: U.tr("Fight {n} of {m}", { n: F.i + 1, m: LADDER.length }), art: enc.art }, () => {
      (U.b3d && U.b3d.can() ? U.startBattle : U.startRealtime)(id, (out) => { // (in 3D like every other fight; the 2D bout only where 3D cannot start)
        if (out === "win" || out === "spare") { F.won++; F.i++; if (F.i >= LADDER.length) return over(true); return next(); }
        over(false);
      });
    });
  }
  function over(all) {
    const secs = (Date.now() - F.t0) / 1000, b = best(), won = F.won;
    const better = !b || won > b.won || (won === b.won && secs < b.secs);
    if (better && won > 0) K.prefs({ fighterBest: { won, secs: Math.round(secs), path: F.path } });
    if (U.setBackdrop) U.setBackdrop(all ? "war_day18" : (K.ENCOUNTERS[LADDER[Math.min(F.i, LADDER.length - 1)][0]] || {}).art);
    const leaf = U.$("leaf"); if (leaf) { leaf.className = "leaf"; leaf.innerHTML = ""; } // the fight's page under the screen
    sheet('<h2>' + U.tr(all ? "Every fight won" : "The run ends") + "</h2>" +
      '<p class="fm-score">' + U.tr("Fights won: {n} of {m} · {t}", { n: won, m: LADDER.length, t: clock(secs) }) + "</p>" +
      (better && won > 0 ? '<p class="fm-best new">' + U.tr("Your best run yet.") + "</p>" : bestLine()) +
      '<div class="btnrow"><button type="button" class="cta" data-again>' + U.tr("New run") + '</button>' + (story ? '<button type="button" class="ghost" data-story>' + U.tr("Live the story instead") + "</button>" : "") + "</div>", (el) => {
      el.querySelector("[data-again]").addEventListener("click", () => U.fighterStart());
      const s = el.querySelector("[data-story]"); if (s) s.addEventListener("click", toLife);
    });
    F = null;
  }
})(window.K = window.K || {});
