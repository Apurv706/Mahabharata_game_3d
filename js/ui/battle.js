/* Combat screen. Tap an enemy to target it, then pick an action (or press 1–9).
   Above the cards, the fight is played out by shadow puppets on a painted stage: you and your side on
   the left, the enemy on the right. Blows land with a lunge, a shake and a moment's stillness; the
   damage rises from whoever took it; the last blow of a won fight falls in slow motion; a drum keeps
   time, faster as the fight goes on and when you are hurt.
   When an enemy's blow comes at you, it is telegraphed (the figure winds up, a ring closes): Block
   as the ring meets the mark to take half, or a counter if your timing is perfect; Dodge to avoid it
   entirely, on a narrower window. With "Timed moments" off, blows are met by chance on kind odds. */
(function (K) {
  "use strict";
  const U = K.UI;
  const C = K.Combat;
  let target = null;
  let onEndCb = null;
  let lastHp = {};
  let lastLogLen = 0;
  let lastActs = 0;
  let foeKey = null;      // the enemy turn being played, so a redraw does not start it twice
  let qte = null;
  let groundWatch = null; // keeps the painting's ground under the fighters (see the fresh draw)
  let fitWatch = false;   // the figures are fitted to the stage again when the window changes size
  let astraPick = false;
  // Live figures (js/ui/puppet-anim.js): each fighter's spring rig, by unit; allies who have made
  // their entrance; who was guarding at the last draw; and until when the moves are still playing.
  const rigs = new Map();
  let seenAllies = new Set(), lastGuard = new Set(), animUntil = 0;
  U.battleRigs = () => rigs; // for the screenshot checks  // the divine-weapon chooser is open         // the defence moment in progress

  U.startBattle = function (encId, onEnd) {
    K.heldNow = undefined; // (a fight played live left before its end does not keep its weapon in your hand)
    target = null; lastHp = {}; lastLogLen = 0; lastActs = 0; foeKey = null; autoKey = null; stopQte();
    rigs.clear(); seenAllies = new Set(); lastGuard = new Set(); animUntil = 0;
    onEndCb = onEnd;
    // The great war opens each fight with the call to arms; other fights with a drum call.
    if (K.Sound && K.ENCOUNTERS[encId]) K.Sound.play(K.ENCOUNTERS[encId].lethal && K.S.act === 6 ? "callToArms" : "drumCall");
    if (K.Sound) K.Sound.mood("battle");
    C.stepNext = U.timed() && !K.headless && !U.assist();
    // A fight of another kind that is played live (a chariot duel, an archery duel, a mace duel, a carry:
    // ui/fightmodes.js) is played so only with motion on; otherwise, and under the tests, as a plain hold.
    const enc = K.ENCOUNTERS[encId], kind = enc && K.val(enc.kind);
    C.liveMode = kind && !K.headless && U.motion() && U.fightMode && U.fightMode.has(kind) ? kind : null;
    if (tour) tour.end(true);
    briefFor = U.fightBriefWanted(encId) && !C.liveMode ? encId : null; // a fight played live has the test's own rules card
    { const old = document.querySelector(".fbrief-wrap"); if (old) old.remove(); }
    const B = C.start(encId, onEnd);
    C.liveMode = null;
    if (!B.mode) drums.start();
  };

  // ---------- The drum ----------
  // A dhol under the fight: steady at first, quicker each round, quicker still when you are hurt.
  const drums = {
    t: null, n: 0,
    start() { this.stop(); if (K.headless) return; this.n = 0; this.tick(); },
    tick() {
      const B = C.state();
      if (!B || B.over) return this.stop();
      const p = C.player();
      const low = p && p.hp < p.maxHp * 0.4;
      const gap = Math.max(0.36, 0.92 - (B.round - 1) * 0.06 - (low ? 0.2 : 0));
      if (K.Sound) K.Sound.play(this.n % 4 === 0 ? "drum" : this.n % 2 ? "tap" : "drum");
      this.n++;
      this.t = setTimeout(() => this.tick(), gap * 1000);
    },
    stop() { clearTimeout(this.t); this.t = null; }
  };
  U.stopDrums = () => drums.stop();

  // ---------- Who each unit is, as a puppet ----------
  // Each kind of enemy has its own outline, and strength shows in the shape: a stooped bandit with a
  // club, a guard in a turban, a soldier behind a shield, an archer's feathered cap, a crested horseman,
  // and a champion in gold scale armour, the biggest of the unnamed. Crowns are kept for the named.
  // A name only stands for its owner, never for his men: "Karna's archers" are archers, not Karna.
  const NAMED = [[/^Ugra(?!'s)/, "ugra"], [/Dushasana's/, "guard"], [/Dushasana(?!'s)/, "dushasana"], [/Karna(?!'s)/, "karna"], [/Bhima(?!'s)/, "bhima"], [/Brihannala(?!'s)/, "arjuna"], [/Ketan|boy/i, "boy"], [/Drona(?!'s)/, "drona"], [/^Satyaki$/, "satyaki"],
    [/^Ghatotkacha$/, "ghatotkacha"], [/^Jayadratha$/, "jayadratha"], [/^Shalya$/, "shalya"], [/^Kripa$/, "kripa"], [/^Abhimanyu$/, "abhimanyu"]];
  const SPECIAL = {
    Ashwatthama: { pronoun: "he", palette: ["#c9905a", "#3a2a3a", "#c9a24e"], headgear: "crown", crown: { gem: "#8a5aa0", tall: 0.95, trim: "#3a2a3a" }, gear: ["browgem"], item: "bow", stance: "hero", stage: "adult", big: true, size: 1.18 },
    Gandharva: { pronoun: "he", palette: ["#9fb07a", "#2f5a3a", "#d9c27a"], headgear: "feather", item: "spear", stage: "adult" },
    champion: { pronoun: "he", palette: ["#b8703b", "#7a1f2a", "#e2b55a"], headgear: "crest", hat: "#e2b55a", hatTrim: "#d9a53a", gear: ["scale"], item: "mace", stance: "proud", stage: "adult", size: 1.1 },
    archer: { pronoun: "he", palette: ["#9e6a40", "#5d3b2a", "#9f8250"], headgear: "capfeather", hat: "#5d3b2a", gear: ["bracer"], item: "bow", stance: "archer", stage: "adult" },
    rider: { pronoun: "he", palette: ["#a8703f", "#6e3026", "#c9a24e"], headgear: "crest", hat: "#a3302a", gear: ["buckler", "cuirass"], item: "sword", stance: "raised", stage: "adult", size: 1.04 },
    bandit: { pronoun: "he", palette: ["#9c6a42", "#6b5a3a", "#a8875a"], headgear: "scarf", hat: "#7a4a2a", gear: ["torn"], item: "club", stance: "stoop", stage: "adult", size: 0.9 },
    common: { pronoun: "he", palette: ["#9c6a42", "#6b5a3a", "#a8875a"], item: "staff", stage: "adult" }
  };
  function specFor(u) {
    const s = specOf(u);
    return u.item && s && !s.thing && u.side !== "player" ? Object.assign({}, s, { item: u.item }) : s; // a fight that draws him with another weapon (unit.item)
  }
  function specOf(u) {
    if (u.side === "player") { // the weapon this fight is fought with; the round shield on the mace and sword paths, with a mace or a blade in hand
      const B = C.state(), s = Object.assign(K.puppetSpec(K.S), { item: K.fightItem(K.S, B ? B.mode || (B.enc.dream ? "dream" : null) : null) });
      if (C.hasShield && C.hasShield() && /^(mace|sword|spear)$/.test(s.item || "")) s.gear = (s.gear || []).filter((g) => g !== "shield" && g !== "buckler").concat("shield"); // the big round shield (owner, 6 November)
      return s;
    }
    if (u.person === "ugra") return Object.assign(U.puppetFor("ugra"), { item: "club" }); // Ugra grown, at the war: the club he strikes with
    if (u.person === "bhadra") return SPECIAL.rider; // Bhadra, captain of the gate guard: a crested veteran with a sword (RT.weaponOf: a sword)
    if (u.person && K.PUPPETS[u.person]) return U.puppetFor(u.person);
    const n = String(u.src || u.name);
    if (/Ketan/.test(n)) return Object.assign(U.puppetFor("boy"), { item: "woodsword" }); // the sparring bout: blunted weapons
    if (/\bcart$/i.test(n)) return { thing: "cart" }; // what is not a person is drawn as what it is
    if (/elephant/i.test(n)) return { thing: "elephant" };
    if (/Narayana weapon/.test(n)) return { thing: "light" };
    if (/charioteer/i.test(n)) return SPECIAL.rider; // Karna's charioteer is not Karna
    for (const [re, id] of NAMED) if (re.test(n)) return U.puppetFor(id);
    if (/Ashwatthama/.test(n)) return SPECIAL.Ashwatthama;
    if (/Gandharva/.test(n)) return SPECIAL.Gandharva;
    if (/champion|dented helmet/i.test(n)) return SPECIAL.champion;
    if (/archer|chariot/i.test(n)) return SPECIAL.archer;
    if (/horseman|rider|veteran/i.test(n)) return SPECIAL.rider;
    if (/swordsman/i.test(n)) return Object.assign({}, U.puppetFor("guard"), { item: "sword" }); // (a swordsman holds a sword: tests/weapons.js)
    if (/club|raider|bandit/i.test(n)) return SPECIAL.bandit;
    if (/cowherd|villager/i.test(n)) return SPECIAL.common;
    if (/guard|bodyguard|captain|sentry/i.test(n)) return U.puppetFor("guard");
    return U.puppetFor("soldier");
  }
  // How a figure moves for each technique.
  const POSE = { strike: "strike", heavy: "strike", breaker: "strike", disarm: "strike", arrows: "loose", guard: "block", brace: "block", herbs: "kneel",
    aimed: "loose", volley: "loose", pin: "loose", astra: "loose", crush: "strike", quake: "strike", roar: "cheer", swerve: "push", ridedown: "push", rally: "cheer",
    command: "speak", expose: "think", formation: "speak", salve: "kneel", steady: "kneel", nerve: "strike", feint: "sneak", vanish: "sneak", hamstring: "strike",
    song: "speak", verse: "speak", hymn: "speak" };

  // Each fight's tall background, for upright screens (art/<key>_tall.webp). Desktops keep the
  // fight's own wide painting.
  const FIGHT_BG = {
    e_ugra: "fight_fair_ring", e_spar: "stage_training_ground", e_panchala: "fight_drupada_yard", e_border: "fight_border_road",
    e_kings: "fight_swayamvara", e_jayadratha: "fight_forest_road", e_bandits: "fight_forest_road", e_gandharva: "fight_royal_camp",
    e_sudatta: "fight_grazing", e_cattle: "fight_grazing", e_cattle_k: "fight_grazing",
    e_dream: "fight_war_field", e_day1: "fight_war_field", e_wheel: "fight_war_field", e_day16: "fight_war_field", e_day18: "fight_war_field",
    e_guard: "fight_war_chariot", e_hunt: "fight_war_chariot", e_road: "fight_war_sunset", e_jaya: "fight_war_sunset", e_gate: "fight_war_sunset",
    e_night: "stage_battlefield_night", e_last_stand: "fight_chakravyuha_inner", e_ring: "fight_chakravyuha_inner", e_dushasana: "fight_war_camp", e_ep_carts: "fight_supply_carts", e_raid: "fight_camp_gate_night", e_ash: "fight_camp_gate_night"
  };
  Object.assign(FIGHT_BG, K.COMMAND_FIGHT_BG || {}); // the holding fights (content/command.js)
  U.FIGHT_BG = FIGHT_BG;
  // The tall painting of a fight's background, for upright screens: the fight and stage paintings have one; a story
  // painting standing in for a fight's ground (Karna's-day duel on scene_duel_ground) is painted wide only.
  U.fightTall = (bg) => (!bg ? null : U.tallOf(bg) ? U.artUrl(U.tallOf(bg)) : /^(fight|stage)_/.test(bg) ? U.artUrl(bg + "_tall") : null);
  // A foe who carries a shield (combat.js u.shield; since 6 November every sword or spear, u.shieldDrawn) is drawn with the round one.
  const shielded = (u, sp) => (u && u.side === "enemy" && (u.shield || u.shieldDrawn) && sp && !sp.thing && sp.item !== "bow" ? Object.assign({}, sp, { gear: (sp.gear || []).filter((g) => g !== "buckler" && g !== "shield").concat("shield") }) : sp);
  U.battleSpecFor = (u) => shielded(u, specFor(u)); // who each fighter is drawn as (tests/weapons.js)
  // A fighter's figure; the fallen lie forward (toward the middle of the stage), their weapon on the ground beside them.
  const figure = (u) => U.puppet(shielded(u, specFor(u)), { h: 150, flip: u.side === "enemy", pose: u.hp <= 0 ? "dead" : liveFigures() ? "live" : u.side === "player" ? "brace" : "stand", fwd: true, label: u.side === "player" ? K.tr("You") : null });
  // A fighter who has fallen without a live figure (reduced motion, or after the CSS fall): drawn again lying down.
  function layDead(uid) {
    const el = actorEl(uid), B = C.state(), u = B && B.units.find((x) => x.uid === uid), old = el && el.querySelector("svg.pp");
    if (!old || !u || u.hp > 0 || old.classList.contains("pose-dead")) return;
    el.classList.add("down");
    if (old.classList.contains("thing")) return; // a cart or an elephant does not topple like a man: it greys where it stands (screens.css tilts a cart)
    old.outerHTML = figure(u);
    fitStage(); // lying down it takes more room along the ground
  }
  function arenaHtml(B) {
    const stage = K.val(B.enc.stage) || K.val(B.enc.art);
    // A champion at your side (Satyaki) stands at full height, not shrunk like the other allies.
    const actor = (u) => '<span class="actor ' + u.side + (u.side === "ally" && (specFor(u).size || 0) >= 1.2 ? " champ" : "") + (specFor(u).thing === "elephant" ? " beast" : "") + (u.hp <= 0 ? " down" : "") + (u.side === "enemy" && u.hp > 0 ? " far" : "") + '" data-uid="' + u.uid + '">' +
      figure(u) + '<span class="pops"></span></span>';
    const friends = B.units.filter((u) => u.side !== "enemy"), foes = B.units.filter((u) => u.side === "enemy");
    return '<div class="arena" id="arena" style="--stage:url(\'' + U.artUrl(stage) + '\')" aria-hidden="true"><div class="team left">' + friends.map(actor).join("") +
      '</div><div class="team right">' + foes.map(actor).join("") + '</div><div class="arena-flash"></div></div>';
  }
  const actorEl = (uid) => document.querySelector('#arena .actor[data-uid="' + uid + '"]');
  function pose(uid, p, ms) {
    const el = actorEl(uid);
    const svg = el && el.querySelector(".pp");
    if (!svg) return;
    const r = rigs.get(uid);
    if (r && r.svg === svg) return rigPose(uid, r, el, p, ms);
    if (p === "fall" && (!U.motion() || svg.classList.contains("thing"))) return layDead(uid);
    if (p === "fall") setTimeout(() => layDead(uid), 850);
    svg.setAttribute("class", svg.getAttribute("class").replace(/pose-\S+/, "pose-" + p));
    // An enemy steps into the light to act, and back into the soft distance after.
    if (el.classList.contains("enemy")) el.classList.toggle("far", p === "stand" && !el.classList.contains("down"));
    clearTimeout(svg._t);
    if (ms) svg._t = setTimeout(() => { if (svg.isConnected && !el.classList.contains("down")) svg.setAttribute("class", svg.getAttribute("class").replace(/pose-\S+/, "pose-" + (el.classList.contains("player") ? "brace" : "stand"))); }, ms);
  }
  function burst(uid, cls, ms) { const el = actorEl(uid); if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms || 500); }
  function pop(uid, text, cls) { const el = actorEl(uid); if (!el) return; const p = U.el('<span class="pop ' + cls + '">' + U.esc(text) + "</span>"); el.querySelector(".pops").appendChild(p); setTimeout(() => p.remove(), 1300); }

  // ---------- Live figures ----------
  // Fighters move on springs: a wind-up before each blow, a freeze on contact, knockback, a slack fall,
  // and each move its own action (an aimed shot is drawn and held, a volley arcs, herbs are knelt over).
  // With calm motion, or under the test harness, the CSS poses are used as before.
  function liveFigures() { return !K.headless && U.motion() && typeof U.rig === "function"; }
  const isBow = (svg) => !!(svg && svg.querySelector('.it:not(.it-w) path[d="M50 86 L50 166"]'));
  function rigUp(B) {
    rigs.clear();
    if (!liveFigures()) return;
    for (const u of B.units) {
      const el = actorEl(u.uid), svg = el && el.querySelector(".pp");
      if (!svg || u.hp <= 0 || !/\bpose-live\b/.test(svg.getAttribute("class"))) continue;
      const r = U.rig(svg, el, isBow(svg) ? "bowready" : (svg.dataset.stance && u.side === "enemy" ? svg.dataset.stance : "ready"), { fight: true }); // each kind of enemy stands in its own way
      if (!r) continue;
      rigs.set(u.uid, r);
      // A friend who joins the fight comes in from the edge of the stage, saying something.
      if (u.side === "ally" && !seenAllies.has(u.uid)) {
        r.x.dx = -Math.max(140, (U.$("arena") || document.body).clientWidth * 0.45); r.apply();
        svg.classList.add("talk"); setTimeout(() => svg.classList.remove("talk"), 1100);
        animUntil = Math.max(animUntil, performance.now() + 700);
      }
    }
    B.units.forEach((u) => { if (u.side === "ally") seenAllies.add(u.uid); });
  }
  // ---------- Keeping everyone on the stage ----------
  // The painted box of a figure (its shapes, not its frame: a spear reaching past it counts, the faint
  // rod under a resting puppet does not).
  // core: without the arms and what they hold (two figures may cross weapons, not stand in each other).
  function painted(el, core) {
    const svg = el && el.querySelector("svg.pp");
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    if (!svg) return null;
    for (const s of svg.querySelectorAll("path,rect,circle,ellipse,polygon,polyline,line")) {
      if (s.closest('[opacity="0"], .rod') || (core && s.closest(".armF, .armB, .it, .it-w, .it-down"))) continue;
      const q = s.getBoundingClientRect();
      if (q.width < 0.5 && q.height < 0.5) continue;
      l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
    }
    return l === Infinity ? null : { l, t, r, b };
  }
  const EDGE_PX = 10; // room left at the stage's edges, for a blow's knock-back
  // Both sides fit the stage as drawn, at rest: a crowded side (four foes on a phone, a champion come to
  // your side) is drawn a little smaller, each side shrinking toward its own edge, so no one stands past
  // the stage's edge and the two sides do not stand inside each other. The right side keeps to the
  // right edge even when the row is wider than the stage.
  function fitStage() {
    const a = U.$("arena"); if (!a) return;
    lungeMemo.clear();
    const L = a.querySelector(".team.left"), R = a.querySelector(".team.right"); if (!L || !R) return;
    for (const t of [L, R]) { t.style.scale = ""; t.style.translate = ""; }
    const acts = [...a.querySelectorAll(".actor")], saved = acts.map((el) => [el.style.translate, el.style.left]);
    acts.forEach((el) => { el.style.translate = ""; el.style.left = ""; el.style.marginLeft = ""; }); // a friend still coming on, a figure eased back in: measured where they stand
    // Side by side, each figure stands a little in front of the one before it; never so far that it hides
    // most of that one's body (a champion of full height beside a small companion is moved along).
    for (const t of [L, R]) {
      const row = [...t.querySelectorAll(".actor:not(.down)")];
      for (let i = 1; i < row.length; i++) {
        const back = painted(row[i - 1], true), front = painted(row[i], true);
        if (!back || !front) continue;
        const hid = Math.min(back.r, front.r) - Math.max(back.l, front.l), w = back.r - back.l;
        if (hid > w * 0.35) row[i].style.marginLeft = "calc(" + (getComputedStyle(row[i]).marginLeft) + " + " + (hid - w * 0.35).toFixed(1) + "px)"; // (a third at most: the poses of the fight shift it a little)
      }
    }
    const ar = a.getBoundingClientRect(), cs = getComputedStyle(a);
    const x0 = ar.left + (parseFloat(cs.paddingLeft) || 0), x1 = ar.right - (parseFloat(cs.paddingRight) || 0);
    // Each standing figure is measured at rest, winding up for a blow (the arm and weapon swung far
    // back, the widest it stands) and pinned, so none of these runs past the edge.
    const reachOf = (el, core) => {
      const p = painted(el, core), r = rigs.get(el.dataset.uid);
      if (!r || core || !p) return p;
      // (and straining against an arrow through the foot, leaning back from it)
      const q = poseBox(el, r, "windup"), q2 = poseBox(el, r, "strain", 0, { rot: (U.RIG_POSES.strain.rot || 0) * 1.5 }); el.style.translate = ""; // (the lean overshoots, and tugs at the arrow) // (still measured where it stands)
      for (const x of [q, q2]) if (x) p.l = Math.min(p.l, x.l), p.r = Math.max(p.r, x.r);
      return p;
    };
    const span = (t, core) => { let l = Infinity, r = -Infinity; t.querySelectorAll(".actor:not(.down)").forEach((el) => { const p = reachOf(el, core); if (p) { l = Math.min(l, p.l); r = Math.max(r, p.r); } }); t.querySelectorAll(".actor.down").forEach((el) => { const p = painted(el); if (p && !core) { l = Math.min(l, p.l); r = Math.max(r, p.r); } }); return l === Infinity ? null : { l, r }; };
    const ls = span(L), rs0 = span(R), lc = span(L, true), rc0 = span(R, true), rb = R.getBoundingClientRect();
    acts.forEach((el, i) => { el.style.translate = saved[i][0]; el.style.left = saved[i][1]; });
    if (!ls || !rs0) return;
    const shift = Math.min(0, x1 - rb.right); // a row wider than the stage: the right side is brought back to its edge
    const rs = { l: rs0.l + shift, r: rs0.r + shift };
    const W = ar.width, lo = ar.left + EDGE_PX, hi = ar.right - EDGE_PX, ov = W * 0.1;
    // First each side steps in from its edge as far as its outermost reach needs; then, if the two sides
    // would stand in each other, both are drawn smaller, each toward its own edge.
    const inL = Math.max(0, lo - ls.l), inR = Math.max(0, rs.r - hi);
    const room = (x1 - inR) - (x0 + inL);
    let k = 1;
    const reach = (ls.r - x0) + (x1 - rs.l);
    if (reach > room + ov) k = Math.min(k, (room + ov) / reach);
    if (lc && rc0) { const body = (lc.r - x0) + (x1 - rc0.l - shift); if (body > room - EDGE_PX * 2) k = Math.min(k, (room - EDGE_PX * 2) / body); } // the two sides' bodies apart
    k = Math.max(0.5, Math.min(1, k));
    L.style.transformOrigin = "0 100%"; R.style.transformOrigin = "100% 100%";
    if (k < 0.995) { L.style.scale = k.toFixed(3); R.style.scale = k.toFixed(3); }
    if (inL) L.style.translate = inL.toFixed(1) + "px 0";
    if (shift || inR) R.style.translate = (shift - inR).toFixed(1) + "px 0";
  }
  U.fitStage = fitStage;
  // Where a live figure would reach in a pose (dx: stepped that far), measured in the same frame and put back.
  function poseBox(el, r, pose, dx, extra) {
    const x = Object.assign({}, r.x), t = Object.assign({}, r.t), was = r.pose;
    r.set(pose, 0, null, true); if (dx || extra) { r.x.dx = dx || 0; Object.assign(r.x, extra || {}); r.apply(); }
    const q = painted(el);
    Object.assign(r.x, x); Object.assign(r.t, t); r.pose = was; r.apply();
    return q;
  }
  // How far a figure may lunge forward for a blow: the full step, unless the stage's far edge is nearer
  // than its blow would reach (a champion's long mace swung at a fighter standing at the edge). The blow
  // is measured on its way out and back: the arm between the strike and its rest, the weapon turning over
  // in the fist on its own slower spring. Measured once a fight per figure (fitStage forgets it).
  const lungeMemo = new Map();
  function lungeFor(u, r, el) {
    const want = lunge(), side = u.side === "enemy" ? -1 : 1, a = U.$("arena"), P = U.RIG_POSES;
    if (!a || !P) return want;
    const key = u.uid + ":" + Math.round(want);
    if (lungeMemo.has(key)) return lungeMemo.get(key);
    const S = P.strike, R = P[r.baseName] || P.stand, mix = (f, g) => { const o = {}; for (const k of ["rot", "tx", "ty", "head", "armF", "foreF", "armB", "foreB", "legF", "shinF", "legB", "shinB"]) o[k] = (S[k] || 0) + ((R[k] || 0) - (S[k] || 0)) * f; o.item = (S.item || 0) + ((R.item || 0) - (S.item || 0)) * g; return o; };
    let lo = Infinity, hi = -Infinity;
    for (const f of [0, 0.33, 0.66, 1]) for (const g of [0, 0.33, 0.66, 1]) { const q = poseBox(el, r, "strike", side * want, mix(f, g)); if (q) { lo = Math.min(lo, q.l); hi = Math.max(hi, q.r); } }
    if (lo === Infinity) return want;
    const SWING = 14; // a blow overshoots its pose a little on the springs
    const ar = a.getBoundingClientRect(), over = (side > 0 ? hi - (Math.min(ar.right, innerWidth) - EDGE_PX) : (Math.max(ar.left, 0) + EDGE_PX) - lo) + SWING;
    const step = over > 0 ? Math.max(-20, want - over) : want; // (at the very edge he swings from where he stands, a half step back)
    lungeMemo.set(key, step);
    return step;
  }
  // A figure come to rest past the stage's edge (fallen, or knocked back) is eased back onto it.
  function keepIn(uid) {
    const a = U.$("arena"), el = actorEl(uid); if (!a || !el) return;
    const p = painted(el); if (!p) return;
    const ar = a.getBoundingClientRect(), lo = Math.max(0, ar.left) + EDGE_PX, hi = Math.min(innerWidth, ar.right) - EDGE_PX;
    const now = parseFloat(el.style.left) || 0;
    const d = p.l < lo ? lo - p.l : p.r > hi ? hi - p.r : 0;
    // and a body lying past the stage's foot (a tall phone's short stage) is lifted onto it
    const up = p.b > ar.bottom - 2 ? p.b - (ar.bottom - 2) : 0, top = parseFloat(el.style.top) || 0;
    if (Math.abs(d) < 1 && up < 0.5) return;
    el.style.transition = "left .35s ease-out, top .35s ease-out";
    if (Math.abs(d) >= 1) el.style.left = (now + d).toFixed(1) + "px";
    if (up >= 0.5) el.style.top = (top - up).toFixed(1) + "px";
  }
  const settleFallen = (uid) => setTimeout(() => keepIn(uid), 1500);

  // The CSS pose names the screen uses, as the rig's poses.
  const RIGPOSE = { strike: "strike", block: "guard", kneel: "kneel", loose: "loose", aim: "draw", hold: "windup", jump: "jump", duck: "duck", side: "side",
    sneak: "sneak", push: "push", cheer: "cheer", speak: "speak", think: "think", fold: "fold", slump: "slump" };
  function rigPose(uid, r, el, p, ms) {
    if (el.classList.contains("enemy")) el.classList.toggle("far", (p === "stand" || p === "brace") && !el.classList.contains("down"));
    clearTimeout(r._t);
    if (p === "hit") { r.kick({ rot: -150, tx: -36, head: -180, armF: 140 }); return; }
    if (p === "fall") { r.fallDown(null, 1, () => keepIn(uid)); return; } // forward, toward the middle of the stage: never off its edge
    if (p === "turn") { // turning your back: the plain CSS turn
      r.stop(); rigs.delete(uid);
      r.svg.querySelectorAll("[style]").forEach((n) => n.removeAttribute("style")); el.style.translate = "";
      r.svg.setAttribute("class", r.svg.getAttribute("class").replace(/pose-\S+/, "pose-turn")); return;
    }
    if (p === "stand" || p === "brace") { r.home(); return; }
    r.set(RIGPOSE[p] || "strike", p === "strike" ? 1900 : 700, 0.5);
    if (p === "strike") { const u = (C.state() || { units: [] }).units.find((x) => x.uid === uid); const step = u ? lungeFor(u, r, el) : lunge(); r.t.dx = el.classList.contains("enemy") ? -step : step; }
    if (ms) r._t = setTimeout(() => { if (rigs.get(uid) === r && !el.classList.contains("down")) { r.t.dx = 0; r.home(); } }, ms);
  }
  const lunge = () => { const a = U.$("arena"); return Math.max(28, Math.min(70, (a ? a.clientHeight : 300) * 0.14)); };
  // A point on a figure that an arrow follows as it flies: measured at the loosing, then carried along
  // with the figure (stepping in, knocked back, its pose changing) by measuring again every few frames.
  function follow(uid, where, ox, oy) {
    // Asked every frame: an aimed shot flies in 170 ms, only a few frames on a slow machine, and a point read every third
    // frame can be a stale one (on GitHub's runner an aimed shot as a fight opened landed 146 px under its target's body).
    let last = point(uid, where);
    return () => { const q = point(uid, where); if (q.x || q.y) last = q; return { x: last.x + (ox || 0), y: last.y + (oy || 0) }; };
  }
  // Points on a figure, inside the arena: the drawing hand, the chest, the front foot.
  function point(uid, where) {
    const a = U.$("arena"), el = actorEl(uid), svg = el && el.querySelector(".pp");
    if (!a || !svg) return { x: 0, y: 0 };
    const s = a.getBoundingClientRect();
    // From a bow, the arrow leaves where it lies nocked: its head just in front of the bow, at the grip.
    const bow = where === "hand" && [...svg.querySelectorAll(".pp-body .it:not(.it-w)")].find((b) => b.style.display !== "none" && b.querySelector('path[d^="M50 86 L"]'));
    if (bow) { // (a dot put there for a moment and measured: right through every turn, flip and scale)
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", "84"); dot.setAttribute("cy", "126"); dot.setAttribute("r", "1"); bow.appendChild(dot);
      const q = dot.getBoundingClientRect(); dot.remove();
      if (q.width || q.height) return { x: q.left + q.width / 2 - s.left, y: q.top + q.height / 2 - s.top };
    }
    // The chest and the foot: on the body itself, not the box of what it holds (a spear held out, a shield).
    const body = where === "chest" ? painted(el, true) : null;
    if (body) return { x: (body.l + body.r) / 2 - s.left, y: body.t - s.top + (body.b - body.t) * 0.38 };
    const part = svg.querySelector(where === "hand" ? ".foreF" : where === "foot" ? ".shinF" : ".pp-body") || svg;
    const r = part.getBoundingClientRect();
    if (where === "hand") return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * 0.45 };
    if (where === "foot") return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * 0.8 };
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * 0.38 };
  }
  // A blow lands: both figures hold for a beat, the struck one flashes, is knocked back and sheds a
  // few flakes of leather; a heavy blow shakes the stage. A blow taken on a guard glances off in sparks.
  function impact(u, d, heavy, guarded) {
    const r = rigs.get(u.uid), el = actorEl(u.uid), a = U.$("arena");
    if (!el) return;
    const dir = u.side === "enemy" ? 1 : -1;
    if (guarded) {
      U.rigFreeze(45); U.flingBits(a, "spark", point(u.uid, "hand"), 10, 20, null, true);
      const sp = painted(el), arr = a && a.getBoundingClientRect();
      const room = sp && arr ? (dir > 0 ? Math.min(arr.right, innerWidth) - sp.r : sp.l - Math.max(arr.left, 0)) : 99;
      if (r) r.kick({ rot: -120 * -dir, dx: dir * 140 * Math.max(0.2, Math.min(1, room / 30)) });
      pop(u.uid, String(d), "down small"); return;
    }
    U.rigFreeze(heavy ? 65 : 40);
    // Knocked back toward the stage's edge, but not past it: with little room the push is a small one.
    const sp = painted(el), arr = a && a.getBoundingClientRect();
    const room = sp && arr ? (dir > 0 ? Math.min(arr.right, innerWidth) - sp.r : sp.l - Math.max(arr.left, 0)) : 99;
    const push = Math.max(0.2, Math.min(1, room / 30));
    el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 110);
    const k = heavy ? 1 : 0.55;
    if (r) r.kick({ rot: -260 * k * push, tx: -60 * k * push, head: -320 * k, armF: 240 * k, foreB: 300 * k, dx: dir * 260 * k * push });
    U.flingBits(a, "flake", point(u.uid, "chest"), heavy ? 9 : 5, 30, "#8a3a2a");
    pop(u.uid, String(d), "down");
    if (heavy && a) { a.classList.remove("shake"); void a.offsetWidth; a.classList.add("shake"); setTimeout(() => a.classList.remove("shake"), 260); }
  }
  const HEAVY = new Set(["aimed", "heavy", "crush", "breaker", "quake", "ridedown", "hamstring"]);
  const MELEE = new Set(["strike", "heavy", "breaker", "disarm", "crush", "nerve", "hamstring", "ridedown", "quake", "swerve"]);
  const SHOTS = new Set(["arrows", "aimed", "volley", "pin", "astra"]);
  // One move, played out on its figure; hit(target) is called at the moment each blow lands.
  // A figure makes one move at a time: a second move of his in the same turn waits for the first to end
  // (else the weapon one move took up is put by under the other).
  function playMove(a, u, targets, hit) {
    const r = rigs.get(u.uid);
    if (!r) return playMoveNow(a, u, targets, hit);
    const run = (r._queue || Promise.resolve()).then(() => playMoveNow(a, u, targets, hit));
    r._queue = run.catch(() => {});
    return run;
  }
  async function playMoveNow(a, u, targets, hit) {
    const r = rigs.get(u.uid);
    const el = actorEl(u.uid), ar = U.$("arena");
    if (!r || !el || !ar) {
      if (el && el.querySelector(".thing") && !["guard", "brace"].includes(a.id)) burst(u.uid, u.side === "enemy" ? "lunge-l" : "lunge-r", 520); // a cart, an elephant, a light: no joints to move
      targets.forEach((t) => setTimeout(() => hit(t), 110)); return 400;
    }
    const W = U.wait, side = u.side === "enemy" ? -1 : 1;
    const first = targets[0];
    const shot = (r.bow && (a.id === "strike" || SHOTS.has(a.id))) || (SHOTS.has(a.id) && a.id !== "astra");
    // Each move with the weapon it is made with: arrows from a bow (taken up for the move by one who
    // carries a spear), a heavy blow with a blade (an archer draws a sword for it); home() puts it back.
    if (shot && !r.bow) r.wield("bow");
    else if (!shot && MELEE.has(a.id) && r.bow) r.wield("sword");
    if (a.id === "guard" || a.id === "brace") {
      r.set("guard", 900, 0.55);
      U.guardFlash(el.querySelector(".pp"), 1300); // the shield raised with a bright rim (no ring drifting over the stage)
      targets.forEach((t) => hit(t));
      await W(1300); if (rigs.get(u.uid) === r) r.home();
      return 600;
    }
    if (["herbs", "salve", "steady"].includes(a.id)) {
      r.set("kneel", 420, 0.6); await W(320);
      el.classList.add("mending"); U.flingBits(ar, "mote", point(u.uid, "hand"), 12, 30, null, true);
      await W(300); U.flingBits(ar, "mote", point(u.uid, "chest"), 8, 40, null, true);
      targets.forEach((t) => hit(t));
      await W(500); el.classList.remove("mending"); if (rigs.get(u.uid) === r) r.home();
      return 1200;
    }
    if (shot && first) {
      if (a.id === "aimed") { r.set("draw", 260, 0.8); await W(240); r.tremble = 2.2; await W(420); r.tremble = 0; r.set("loose", 1600, 0.45); }
      else if (a.id === "volley") { r.set("drawUp", 320, 0.75); await W(330); r.set("looseUp", 1600, 0.45); }
      else if (a.id === "pin") { r.set("drawLow", 300, 0.75); await W(320); r.set("looseLow", 1600, 0.45); }
      else { r.set("draw", 900, 0.7); await W(150); r.set("loose", 1600, 0.3); }
      r.kick({ rot: -60 * side, armB: -200 });
      // Struck down while drawing: the arrow is never loosed (the blow still counts).
      if (r.falling || u.hp <= 0) { targets.forEach((t) => hit(t)); return 300; }
      const hand = () => point(u.uid, "hand"); // where the bow is as the arrow leaves it
      if (a.id === "volley") {
        const list = targets.length === 1 ? [first, first, first] : targets.concat(targets).slice(0, Math.max(3, targets.length));
        const done = new Set();
        await Promise.all(list.map((t, i) => W(i * 90).then(() => { const p = follow(t.uid, "chest", (i - 1) * 4, (i - 1) * 6); /* three arrows close together, all on him */ return U.flyArrow(ar, hand, p, ar.clientHeight * 0.32, 520, false, 0, { from: u.uid, to: t.uid, kind: "volley" }); }).then(() => { if (!done.has(t.uid)) { done.add(t.uid); hit(t); } })));
      } else if (a.id === "pin") {
        const atFoot = follow(first.uid, "foot", -2, 4);
        const arrow = await U.flyArrow(ar, hand, atFoot, -18, 170, true, 0, { from: u.uid, to: first.uid, kind: "pin" });
        const foot = point(first.uid, "foot");
        // Driven into the earth beside the foot: the tip buried, the shaft standing steeply.
        arrow.style.transform = "translate(" + (foot.x + 6 - arrow.offsetWidth) + "px," + (foot.y + 8 - arrow.offsetHeight / 2) + "px) rotate(" + (side > 0 ? 38 : 142) + "deg)";
        hit(first);
        const tr = rigs.get(first.uid);
        if (tr) { tr.set("strain", 300, 0.4); tr.pinned = 1; setTimeout(() => { tr.pinned = 0.4; tr.home(); }, 1200); setTimeout(() => { tr.pinned = 0; }, 2600); }
        setTimeout(() => arrow.remove(), 2600);
      } else {
        for (const t of targets) { await U.flyArrow(ar, hand, follow(t.uid, "chest"), a.id === "aimed" ? 6 : 8, a.id === "aimed" ? 170 : 160, false, 0, { from: u.uid, to: t.uid, kind: a.id }); hit(t); }
      }
      await W(220); if (rigs.get(u.uid) === r) r.home();
      return 300;
    }
    if (MELEE.has(a.id) || targets.length) {
      if (r.pose !== "windup") { r.set("windup", 520, 0.7); await W(120); } // anticipation: the tell
      const step = lungeFor(u, r, el);
      r.set("strike", 1900, 0.5); r.t.dx = side * step; await W(55);         // the blow
      targets.forEach((t) => hit(t)); await W(90);
      r.t.dx = 0; r.home();                                                  // follow-through, and settle
      return 260;
    }
    rigPose(u.uid, r, el, POSE[a.id] || "strike", 650);
    return 650;
  }
  function animateLive(B, acts) {
    const arena = U.$("arena");
    const changed = B.units.filter((u) => lastHp[u.uid] != null && lastHp[u.uid] !== u.hp);
    const hurt = changed.filter((u) => u.hp < lastHp[u.uid]), healed = changed.filter((u) => u.hp > lastHp[u.uid]);
    const killed = hurt.filter((u) => u.hp <= 0);
    const finisher = B.over === "win" && killed.some((u) => u.side === "enemy");
    if (finisher && arena) { arena.classList.add("slowmo"); if (K.Sound) setTimeout(() => K.Sound.play("gong"), 300); }
    if (K.Sound && killed.some((u) => u.side === "ally" && u.person)) K.Sound.play("friendFalls");
    const landed = new Set();
    const land = (t) => {
      if (landed.has(t.uid)) return; landed.add(t.uid);
      const d = t.hp - lastSeen[t.uid];
      if (d > 0) { pop(t.uid, "+" + d, "up"); return; }
      impact(t, d, HEAVY.has(t._by) || -d >= t.maxHp * 0.18, guardWas.has(t.uid) && !t.status.guard);
      if (t.hp <= 0) setTimeout(() => { const el = actorEl(t.uid); if (el) el.classList.add("down"); const r = rigs.get(t.uid); if (r) r.fallDown(null, 1, () => keepIn(t.uid)); else { pose(t.uid, "fall"); settleFallen(t.uid); } }, finisher ? 160 : 70);
    };
    const lastSeen = Object.assign({}, lastHp), guardWas = new Set(lastGuard);
    let left = hurt.slice(), longest = 0;
    acts.forEach((a) => {
      const u = B.units.find((x) => x.uid === a.uid);
      if (!u) return;
      const friendly = u.side !== "enemy";
      let targets;
      if (["herbs", "salve", "steady", "rally"].includes(a.id)) targets = healed.filter((t) => t.side !== "enemy");
      else { targets = left.filter((t) => (t.side === "enemy") === friendly); left = left.filter((t) => !targets.includes(t)); }
      targets.forEach((t) => { t._by = a.id; });
      const t0 = performance.now();
      Promise.resolve(playMove(a, u, targets, land)).then(() => {}).catch(() => {});
      const est = { aimed: 1100, volley: 1000, pin: 700, herbs: 1200, salve: 1200, steady: 1200, guard: 400, brace: 400 }[a.id] || (rigs.get(u.uid) && rigs.get(u.uid).bow && a.id === "strike" ? 450 : 350);
      longest = Math.max(longest, est); void t0;
    });
    // Whatever was not anybody's move this time (a blow met at the ring, a bleed): it lands now.
    setTimeout(() => { left.forEach(land); healed.forEach(land); }, 110);
    animUntil = Math.max(animUntil, performance.now() + longest);
    B.lastDef = null;
  }

  // Play what happened since the last draw: who moved, who was hit, who fell.
  function animate(B) {
    const acts = B.acts.slice(lastActs);
    // A divine weapon: its own full-screen moment (ui/fx.js), which keeps to calm motion itself.
    acts.forEach((a) => { if ((a.id === "astra" || (K.ASTRAS && K.ASTRAS[a.id])) && B.astraOut && U.astraFx) { const o = B.astraOut; B.astraOut = null; U.astraFx({ kind: o.kind, clash: o.clash, from: actorEl(a.uid), to: actorEl(o.uid) }); } });
    if (!U.motion()) return;
    if (rigs.size) { animateLive(B, acts); lastGuard = new Set(B.units.filter((u) => u.status.guard).map((u) => u.uid)); return; }
    const arena = U.$("arena");
    acts.forEach((a) => {
      const u = B.units.find((x) => x.uid === a.uid);
      if (!u) return;
      pose(a.uid, POSE[a.id] || "strike", 650);
      if (["strike", "heavy", "breaker", "disarm", "crush", "nerve", "hamstring", "ridedown", "quake"].includes(a.id)) burst(a.uid, u.side === "enemy" ? "lunge-l" : "lunge-r", 520);
    });
    const killed = [];
    for (const u of B.units) {
      const before = lastHp[u.uid];
      if (before == null || before === u.hp) continue;
      const d = u.hp - before;
      if (d < 0) {
        // A moment of stillness, then the blow lands: shake, a flash, the number rising.
        setTimeout(() => { burst(u.uid, "struck", 420); pop(u.uid, String(d), "down"); if (u.hp > 0) pose(u.uid, "hit", 420); }, 110);
        if (u.hp <= 0) killed.push(u);
      } else pop(u.uid, "+" + d, "up");
    }
    const finisher = B.over === "win" && killed.some((u) => u.side === "enemy");
    if (finisher && arena) { arena.classList.add("slowmo"); if (K.Sound) setTimeout(() => K.Sound.play("gong"), 300); }
    if (K.Sound && killed.some((u) => u.side === "ally" && u.person)) K.Sound.play("friendFalls");
    killed.forEach((u) => setTimeout(() => { const el = actorEl(u.uid); if (el) el.classList.add("down"); pose(u.uid, "fall"); settleFallen(u.uid); }, finisher ? 260 : 160));
    if (B.lastDef && arena) { /* a blow you met: the defence shows on your figure */
      const P = C.player();
      if (B.lastDef === "block") pose(P.uid, "block", 600);
      if (B.lastDef === "dodge") { pose(P.uid, "sneak", 600); burst(P.uid, "dodge", 500); }
      if (B.lastDef === "counter") pose(P.uid, "strike", 600);
      B.lastDef = null;
    }
  }

  // "Next: Heavy blow → you", under an enemy's name.
  function intentLine(u) {
    const it = C.intent(u);
    if (!it) return "";
    const ab = K.tr(it.name);
    let txt;
    if (it.target === "enemies") txt = K.tr("Next: {ab} → all of you", { ab });
    else if (it.unit && it.unit.side === "player") txt = K.tr("Next: {ab} → you", { ab });
    else if (it.unit && it.unit !== u) txt = K.tr("Next: {ab} → {who}", { ab, who: K.text(it.unit.src || it.unit.name) });
    else txt = K.tr("Next: {ab}", { ab });
    const danger = it.heavy && (it.target === "enemies" || (it.unit && it.unit.side === "player"));
    return '<span class="intent' + (danger ? " danger" : "") + '">' + U.esc(txt) + "</span>";
  }

  // The pennant over the enemy a leader has marked, and on its card.
  const MARK_SVG = '<svg class="mark-flag" viewBox="0 0 20 24" aria-hidden="true"><path d="M4 2v21" stroke="#e2b866" stroke-width="2" stroke-linecap="round"/><path d="M5 3h12l-3.5 4.5L17 12H5z" fill="#d9822b" stroke="#e2b866" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  function syncMark(B) {
    const m = C.marked ? C.marked() : null;
    document.querySelectorAll("#arena .actor.enemy").forEach((el) => {
      // Who your moves will hit: a ring of light at that figure's feet.
      el.classList.toggle("targeted", !B.over && el.dataset.uid === target && B.kind !== "weather"); // nothing to aim at under the storm
      const on = el.dataset.uid === m;
      el.classList.toggle("marked", on);
      let f = el.querySelector(":scope > .mark-flag");
      if (on && !f) el.insertAdjacentHTML("afterbegin", MARK_SVG);
      if (!on && f) f.remove();
    });
  }
  function unitCard(u, B) {
    const pct = Math.round((u.hp / u.maxHp) * 100);
    const st = Object.keys(u.status).map((s) => "<span>" + U.tr(K.STATUS_TEXT[s] || s) + "</span>").join("");
    const enemy = u.side === "enemy";
    const sel = (enemy && target === u.uid && B.kind !== "weather" ? " sel" : "") + (enemy && C.marked && C.marked() === u.uid ? " marked" : "");
    const label = u.side === "player" ? K.tr("You") : K.text(u.src || u.name);
    return '<button type="button" class="unit ' + u.side + sel + (u.hp <= 0 ? " down" : "") + '" data-uid="' + u.uid + '"' + (!enemy || u.hp <= 0 || B.over ? " disabled" : "") + ">" +
      '<span class="nm">' + (u.person && U.portraitKey(u.person) ? U.thumb(U.portraitKey(u.person), "face") : "") + "<em>" + U.esc(label) + "</em><span>" + u.hp + " / " + u.maxHp + "</span></span>" +
      '<span class="hpbar"><i style="width:' + pct + '%"></i></span>' +
      (enemy && target === u.uid && u.hp > 0 && !B.over && B.kind !== "weather" ? '<span class="tgt-chip">' + U.tr("Your target") + "</span>" : "") +
      (st ? '<span class="st">' + st + "</span>" : "") +
      (enemy ? intentLine(u) : "") +
      (enemy && C.marked && C.marked() === u.uid ? '<span class="markline">' + MARK_SVG + U.esc(K.tr(B.units.some((x) => x.side === "ally" && x.plural && x.hp > 0) ? "Marked: your company is on it" : "Marked: those beside you are on it")) + "</span>" : "") +
      (u.note ? '<span class="note">' + U.t(u.note) + "</span>" : "") + "</button>";
  }

  // ---------- Meeting a blow ----------
  function stopQte() { if (qte) { qte.stop(); qte = null; } }
  let autoKey = null; // the enemy turn that is playing out by itself, with its timer running
  function runFoes(B, box) {
    const n = C.nextFoe();
    if (!n) return false;
    const key = B.bid + ":" + B.round + ":" + n.u.uid + ":" + B.queue.length;
    const who = K.text(n.u.src || n.u.name);
    // A turn not aimed at you (a stunned foe losing his turn, a blow at someone else) plays out by
    // itself. A redraw in the middle (a tap on an enemy, a language switch) shows it again, and starts
    // its timer again if that was lost, so the fight never waits on nothing.
    const auto = () => {
      box.appendChild(U.el('<p class="foe-turn">' + U.esc(K.tr("{who} moves.", { who })) + "</p>"));
      if (autoKey === key) return;
      autoKey = key;
      setTimeout(() => { if (autoKey === key) autoKey = null; if (C.state() === B && foeKey === key && !B.over) C.resolve(null); }, U.motion() ? 650 : 200);
    };
    if (foeKey === key) { if (qte) qte.mount(box); else if (!n.threat) auto(); return true; }
    foeKey = key;
    stopQte();
    if (!n.threat) { auto(); return true; }
    qte = defend(B, n.u, n.threat, (result) => { qte = null; C.resolve(result); });
    qte.mount(box);
    return true;
  }
  // The shape of a blow, read from the enemy's move, and what gets you out of its way: jump a low
  // arrow or sweep, duck a high swing or arrow, sidestep a thrust or a charge. Block meets anything,
  // for half the harm.
  const SHAPES = {
    low: { need: "jump", line: "A low sweep at your legs", arrow: "An arrow, low, at your legs", y: 0.74 }, // shin high: at 0.86 it skimmed the ground under the feet (owner, 5 November)
    high: { need: "duck", line: "A swing at your head", arrow: "An arrow at your head", y: 0.2 },
    thrust: { need: "side", line: "A straight thrust", y: 0.5 },
    charge: { need: "side", line: "A charge, head down", y: 0.55 }
  };
  const shapeFor = (id) => K.pick({ arrows: ["low", "high"], strike: ["high", "thrust", "low"], heavy: ["high", "charge"], disarm: ["thrust"], breaker: ["charge"] }[id] || ["high", "thrust"]);
  const CUT = { // leather cut-outs for what comes at you
    arrow: '<svg viewBox="-40 -8 80 16"><path d="M-38 0 L-26 -6 L-26 -2 L30 -2 L36 -7 L36 7 L30 2 L-26 2 L-26 6 Z"/></svg>',
    // A blade's swing: an orange-red arc with streaks trailing it (owner, 5 November: the brown crescent it was, at rest
    // behind your head as a swing at the head arrived, read as a horn).
    blade: '<svg viewBox="-30 -30 60 60"><path class="arc" d="M-20 24 Q-27 -6 2 -26 Q-12 -6 -9 24 Z"/><path class="streak" d="M6 -20 L26 -17 M4 -6 L28 -3 M2 8 L24 11" fill="none"/></svg>',
    charge: '<svg viewBox="-30 -20 60 40"><path d="M-28 0 L-8 -16 L-8 -6 L26 -6 L26 6 L-8 6 L-8 16 Z"/></svg>'
  };
  function defend(B, u, th, done) {
    const g = K.attr("grace");
    const T = 1.1 * th.speed, END = T * 1.32;
    const W = { perfect: 0.065 + g * 0.004, move: 0.17 + g * 0.009, block: 0.2 + g * 0.01 }; // in seconds either side of the mark: a touch wider (2 Nov), a phone tap lands late
    // Under the storm (a weather fight) whatever an archer looses is arrows, coming down or skimming low;
    // the Narayana weapon is fire, and the elephant swings its trunk.
    const thing = specFor(u).thing, rain = B.kind === "weather" && (thing === "light" || (u.abilities || []).includes("arrows"));
    const who = K.text(u.src || u.name), shape = rain ? K.pick(["high", "low"]) : shapeFor(th.id), S2 = SHAPES[shape];
    const what = thing === "light" ? (shape === "high" ? "Fire from above" : "Fire along the ground") : rain ? (shape === "high" ? "Arrows from above" : "Arrows, low, at your legs")
      : thing === "elephant" && shape === "high" ? "Its trunk swings at your head" : th.id === "arrows" && S2.arrow ? S2.arrow : S2.line;
    const el = U.el('<div class="qte" role="group" aria-label="' + U.esc(K.tr("Meet the blow")) + '"><p class="qte-who"><b>' + U.esc(who) + "</b> · " + U.esc(K.tr(what)) + "</p>" +
      '<div class="qte-ring"><i class="mark"></i><i class="ring"></i></div><p class="qte-note" aria-live="assertive">' + U.esc(K.tr("Read the blow: jump, duck, sidestep or block, as the ring meets the mark. Swipe or use the arrow keys.")) + '</p><div class="btnrow qte-btns"></div></div>');
    const ring = el.querySelector(".ring"), note = el.querySelector(".qte-note");
    let t0 = 0, raf = 0, over = false, flyer = null, starting = false;
    const LINES = { counter: "A perfect read! You strike back.", block: "Blocked.", dodge: "Clear!", graze: "Late: it grazes you.", early: "Too early.", late: "Too late.", wrong: "The wrong way!" };
    const P = C.player();
    const finish = (result, line, move) => {
      if (over) return;
      over = true; cancelAnimationFrame(raf); off();
      // Got out of its way: what was loosed flies on past you (over, under or beside). Otherwise it stops at you.
      if (flyer) { const f = flyer; if (result === "dodge" || result === "counter") { f.classList.add("past"); setTimeout(() => f.remove(), 520); } else { f.classList.add("gone"); setTimeout(() => f.remove(), 300); } }
      note.textContent = K.tr(LINES[line || result] || line);
      el.classList.add(result === "miss" ? "bad" : "good");
      // Your puppet does what you chose: a hop, a crouch, a step aside, the shield up.
      if (P && move) {
        if (move === "jump") { burst(P.uid, "act-jump", 760); pose(P.uid, "jump", 760); }
        else if (move === "duck") { burst(P.uid, "act-duck", 760); pose(P.uid, "duck", 760); }
        else if (move === "side") { burst(P.uid, "act-side", 760); pose(P.uid, "side", 760); }
        else pose(P.uid, "block", 700);
      }
      if (K.Sound) K.Sound.play(result === "miss" ? "hit" : result === "dodge" ? "tap" : "clang");
      setTimeout(() => done(result), U.motion() ? 420 : 120);
    };
    const now = () => (U.clock() - t0) / 1000; // game time: stands still while the game is paused
    const act = (move) => {
      if (over || !t0) return; // the blow has not begun: a press now is neither early nor late
      const d = now() - T, a = Math.abs(d);
      if (move === "block") { if (a <= W.perfect) finish("counter", null, move); else if (a <= W.block) finish("block", null, move); else finish("miss", d < 0 ? "early" : "late", move); return; }
      if (move !== S2.need) return finish("miss", "wrong", move);
      if (a <= W.perfect) finish("counter", null, move);
      else if (a <= W.move) finish("dodge", null, move);
      else if (d > 0 && a <= W.move * 1.8) finish("block", "graze", move); // the right move, late: a graze
      else finish("miss", d < 0 ? "early" : "late", move);
    };
    const row = el.querySelector(".qte-btns");
    const bs = [["Jump ↑", "jump"], ["Duck ↓", "duck"], ["Sidestep ↔", "side"], ["Block", "block"]].map(([lbl, m]) => { const b = U.pressButton(lbl, () => act(m)); b.classList.add("mv-" + m); if (m !== "block") b.classList.add("secondary"); row.appendChild(b); return b; });
    const onKey = (e) => {
      if (e.repeat) return;
      const k = e.key, m = { ArrowUp: "jump", w: "jump", W: "jump", ArrowDown: "duck", s: "duck", S: "duck", ArrowLeft: "side", ArrowRight: "side", a: "side", A: "side", d: "side", D: "side", Shift: "side", " ": "block", Enter: "block", b: "block", B: "block" }[k];
      if (m) { e.preventDefault(); e.stopPropagation(); act(m); }
    };
    // Swipes anywhere outside the buttons: up, down, sideways.
    let sw = null;
    const pd = (e) => { if (e.target.closest("button")) return; sw = { x: e.clientX, y: e.clientY }; };
    const pu = (e) => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return; act(Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "jump" : "duck") : "side"); };
    document.addEventListener("keydown", onKey, true); document.addEventListener("pointerdown", pd, true); document.addEventListener("pointerup", pu, true);
    const off = () => { document.removeEventListener("keydown", onKey, true); document.removeEventListener("pointerdown", pd, true); document.removeEventListener("pointerup", pu, true); };
    U.keys([]);
    // The enemy winds up; what he looses flies at you across the stage, at the height it will strike.
    { const rr = rigs.get(u.uid), aiming = th.id === "arrows" || rain; if (rr) { if (aiming && !rr.bow) rr.wield("bow"); else if (!aiming && rr.bow) rr.wield("sword"); } } // the weapon the blow comes with
    pose(u.uid, th.id === "arrows" || rain ? "aim" : "hold");
    const launch = () => {
      const ar = U.$("arena"), ae = actorEl(u.uid), pe = P && actorEl(P.uid);
      if (!ar || !ae || !pe || !U.motion()) return;
      const r0 = ar.getBoundingClientRect(), ra = ae.getBoundingClientRect(), rp = pe.getBoundingClientRect();
      const kind = th.id === "arrows" || (rain && thing !== "light") ? "arrow" : shape === "charge" ? "charge" : "blade";
      flyer = U.el('<i class="incoming ' + kind + " " + shape + '" aria-hidden="true">' + CUT[kind] + "</i>");
      const y = rp.top - r0.top + rp.height * S2.y;
      // It stops at your front, where the blow meets you (it ran on to your back, and a swing at the head rested there).
      const front = ra.left > rp.left ? rp.left + rp.width * 0.78 : rp.left + rp.width * 0.22;
      flyer.style.cssText = "left:" + (ra.left - r0.left + ra.width * 0.3) + "px;top:" + y + "px;--to:" + (front - ra.left - ra.width * 0.3) + "px;--dur:" + T + "s";
      ar.appendChild(flyer);
      requestAnimationFrame(() => flyer && flyer.classList.add("go"));
    };
    const tick = () => {
      if ((!el.isConnected && over) || !t0) return;
      const s = now();
      const p = Math.min(1, s / T);
      ring.style.transform = "translate(-50%, -50%) scale(" + Math.max(0.12, 1 - p * 0.7 - Math.max(0, s - T) * 0.6) + ")";
      if (s >= END) return finish("miss", "late");
      raf = requestAnimationFrame(tick);
    };
    return {
      mount(box) {
        if (el.parentNode !== box) box.appendChild(el);
        if (t0 || starting) return;
        try { el.scrollIntoView({ block: "nearest", behavior: U.motion() ? "smooth" : "auto" }); } catch (e) { /* old browsers */ }
        // The blow comes once the last move has played out (an aimed shot is drawn and held).
        starting = true;
        setTimeout(() => { if (over) return; pose(u.uid, th.id === "arrows" ? "aim" : "hold"); t0 = U.clock(); launch(); raf = requestAnimationFrame(tick); bs[3].focus({ preventScroll: true }); }, Math.max(0, Math.min(1200, animUntil - performance.now())));
      },
      stop() { over = true; cancelAnimationFrame(raf); off(); if (flyer) flyer.remove(); }
    };
  }

  // ---------- The screen ----------
  U.renderBattle = function (B) {
    if (!B) return;
    if (clash && clash.live) return; // the clash has the stage; this screen is drawn again when it hands back
    // A fight played live takes the page as a test does; when it is over, the story goes straight on.
    if (B.mode) {
      if (B.over) { if (!onEndCb) return; stopQte(); drums.stop(); const cb = onEndCb; const out = C.end().over; onEndCb = null; const L = U.$("leaf"); if (L) L.dataset.battle = ""; document.body.classList.remove("intest"); cb(out); return; }
      const L = U.$("leaf");
      if (L.dataset.battle !== B.bid) { L.dataset.battle = B.bid; U.fightMode.play(B); }
      return;
    }
    // The clash (owner, 5 November: every turn-based fight in Build B): the storms, escorts and break-throughs fought on
    // this screen play each round's blows out in real time for about 15 s after your move (clashSoon), as the war days do.
    if (B.rule && B.clashMode === undefined) B.clashMode = !!(U.startClash && !K.headless && K.RT && K.RT.on && K.RT.on());
    if (C.state() === B) C.foesPending(); // a round whose last foes have fallen is closed before anything is drawn
    U.redraw = () => { const L = U.$("leaf"); if (L) L.dataset.battle = ""; U.renderBattle(C.state() || B); };
    U.setNav(true);
    const enc = B.enc;
    const enemies = B.units.filter((u) => u.side === "enemy");
    if (!target || !enemies.find((e) => e.uid === target && e.hp > 0)) target = (enemies.find((e) => e.hp > 0) || {}).uid || null;
    U.where("<b>" + U.tr("Battle") + "</b><span>" + U.t(K.val(enc.title)) + " · " + (enc.rounds ? U.tr("round {n} of {m}", { n: Math.min(B.round, enc.rounds), m: enc.rounds }) : enc.hold ? U.tr("Hold: round {n} of {m}", { n: Math.min(B.round, enc.hold), m: enc.hold }) : U.tr("round {n}", { n: B.round })) + (B.rule && B.rule.status ? " · " + U.esc(B.rule.status(B)) : "") + "</span>");
    const friends = B.units.filter((u) => u.side !== "enemy");
    const leaf = U.$("leaf");
    // The painted stage with the figures is drawn once per fight, so they can move between draws.
    // The fight fills the screen on its painting, like the tests: the top bar and page fall away.
    // (Set on every draw: the screen's frame is reset between draws.)
    const deep = !!(U.inScene && !K.headless);
    leaf.className = "leaf fighting" + (deep ? " immersive" : "");
    if (deep) document.body.classList.add("intest");
    if (leaf.dataset.battle !== B.bid || !U.$("arena") || U.$("arena").querySelectorAll(".actor").length !== B.units.length) {
      if (deep) {
        const bg = FIGHT_BG[enc.id];
        // The fight's own background: tall on upright screens, its 16:9 painting on wide ones (all but the camp gate).
        U.setBackdrop(bg && (!U.upright() || U.tallOf(bg)) ? bg : K.val(enc.stage) || K.val(enc.art));
      }
      leaf.dataset.battle = B.bid;
      leaf.innerHTML = U.plate({ art: K.val(enc.art), keepArt: deep, caption: K.val(enc.caption), tag: enc.lethal ? "war" : "yours", tagText: K.tr(enc.lethal ? "Battle · you can die here" : "A fight"), heading: K.val(enc.title), noFigure: true }) +
        arenaHtml(B) + '<div class="text battle" id="battle-body"></div>';
      lastActs = B.acts.length; // nothing to replay on a fresh draw
      rigUp(B);
      fitStage();
      if (!fitWatch) { fitWatch = true; window.addEventListener("resize", () => { if (U.$("arena")) fitStage(); }); }
      // Put the painting's ground under the fighters' feet, once they are laid out.
      if (deep) requestAnimationFrame(() => U.fitBackdrop(true));
      // And keep it there: whenever the figures' band or the moves' panel changes size (a chooser opens, a
      // card wraps, fonts arrive late on Safari), the painting is moved again. A frame's wait is not enough.
      if (groundWatch) groundWatch.disconnect();
      groundWatch = deep && window.ResizeObserver ? new ResizeObserver(() => { if (U.upright()) U.fitBackdrop(true); }) : null;
      if (groundWatch) ["arena", "battle-body"].forEach((id) => { const el = U.$(id); if (el) groundWatch.observe(el); });
    }
    const body = U.$("battle-body");
    // How long you must stand, in sight from the first round (the top bar is hidden in a fight on a phone).
    const roundsLine = enc.hold ? U.tr("Hold: round {n} of {m}", { n: Math.min(B.round, enc.hold), m: enc.hold }) : "";
    body.innerHTML = (roundsLine ? '<p class="holdline">' + roundsLine + "</p>" : "") + '<div class="sides"><div class="side"><span class="lbl">' + U.tr("Your side") + "</span>" + friends.map((u) => unitCard(u, B)).join("") +
      '</div><div class="side"><span class="lbl">' + U.tr(B.kind === "weather" ? "Against you" : C.canMark && C.canMark() ? "Against you · tap to mark" : "Against you · tap to target") + "</span>" + enemies.map((u) => unitCard(u, B)).join("") + "</div></div>" +
      '<div id="battle-actions"></div><ol class="blog" id="blog" aria-live="polite">' + B.log.slice(-8).map((l) => "<li" + (l.ev ? ' class="ev"' : "") + ">" + U.esc(C.line(l)) + "</li>").join("") + "</ol>";
    // A field event is drawn across the field as well as said (row 38: ui/fx.js U.fieldFx).
    if (B.log.length > lastLogLen && U.fieldFx) { const ev = B.log.slice(lastLogLen).filter((l) => l.ev).pop(); if (ev) U.fieldFx(U.$("arena"), ev.key); }
    // Blows are heard as well as seen.
    if (K.Sound && B.log.length !== lastLogLen) {
      const fresh = B.log.slice(lastLogLen);
      const lost = B.units.some((u) => lastHp[u.uid] != null && u.hp < lastHp[u.uid]);
      const gained = B.units.some((u) => lastHp[u.uid] != null && u.hp > lastHp[u.uid]);
      if (fresh.some((l) => l.ev)) K.Sound.play("gong");
      if (lost) K.Sound.play("hit"); else if (gained) K.Sound.play("heal");
    }
    animate(B);
    // Without motion nothing is played out: whoever has fallen simply lies on the ground, weapon beside them.
    if (!U.motion()) B.units.forEach((u) => { if (u.hp <= 0) layDead(u.uid); });
    if (U.motion()) {
      for (const u of B.units) {
        const before = lastHp[u.uid];
        const el = body.querySelector('.unit[data-uid="' + u.uid + '"]');
        if (el && before != null && before !== u.hp) {
          const d = u.hp - before;
          el.classList.add(d < 0 ? "hit" : "healed");
          el.appendChild(U.el('<span class="dmg ' + (d < 0 ? "down" : "up") + '" aria-hidden="true">' + (d > 0 ? "+" : "") + d + "</span>"));
        }
      }
      const last = body.querySelector("#blog li:last-child");
      if (last && B.log.length !== lastLogLen) last.classList.add("fresh");
    }
    lastHp = Object.fromEntries(B.units.map((u) => [u.uid, u.hp]));
    lastLogLen = B.log.length;
    lastActs = B.acts.length;
    // Picking out an enemy: your own target, and for a leader with people beside them, the company's mark.
    body.querySelectorAll(".unit.enemy").forEach((el) => el.addEventListener("click", () => { target = el.dataset.uid; if (C.mark) C.mark(target); U.renderBattle(B); }));
    // ...or by tapping the figure itself on the field (once per arena; it outlives a redraw).
    const arena = U.$("arena");
    if (arena && !arena.dataset.tapTarget) {
      arena.dataset.tapTarget = "1";
      arena.addEventListener("click", (e) => {
        const a = e.target.closest(".actor.enemy"); if (!a || a.classList.contains("down")) return;
        const S2 = C.state && C.state(); if (!S2 || S2.over || S2.kind === "weather") return;
        const u = S2.units.find((x) => x.uid === a.dataset.uid); if (!u || u.hp <= 0) return;
        target = u.uid; if (C.mark) C.mark(target); U.renderBattle(S2);
      });
    }
    syncMark(B);
    const log = U.$("blog");
    log.scrollTop = log.scrollHeight;
    const box = U.$("battle-actions");
    const keys = [];

    if (B.over) {
      stopQte(); drums.stop();
      // A dream fight does not end on a result: the field goes white, and you wake (scene.js U.wakeScene).
      // (Without motion, or under the test harness, it ends like any fight, on its line and Continue.)
      if (enc.dream && U.motion()) {
        if (B._whiting) return;
        B._whiting = true;
        const veil = U.el('<div class="dream-white" aria-hidden="true"></div>');
        document.body.appendChild(veil);
        requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add("on")));
        setTimeout(() => {
          if (!onEndCb || C.state() !== B) { veil.remove(); return; }
          const cb = onEndCb; const out = C.end().over; onEndCb = null; const L = U.$("leaf"); if (L) L.dataset.battle = ""; document.body.classList.remove("intest"); cb(out);
          setTimeout(() => veil.remove(), 400); // the waking scene opens on its own white underneath
        }, U.motion() ? 1300 : 200);
        return;
      }
      if (B.over === "flee") { const P = C.player(); if (P) pose(P.uid, "turn"); } // you turn your back on the fight
      const msg = { win: K.val(enc.winLine) || "The fight is won.", lose: K.val(enc.loseLine) || (enc.lethal && !K.S.storyMode ? "You have fallen." : "You are beaten."), flee: "You leave the fight behind.", spare: "You let them live." }[B.over];
      if (K.Sound && !B._sounded) { B._sounded = true; if (B.over === "lose" && enc.lethal && !K.S.storyMode) K.Sound.play("fall"); }
      box.appendChild(U.el('<div class="result"><p><b>' + U.t(msg) + "</b></p></div>"));
      const done = () => { if (!onEndCb) return; /* once */ const cb = onEndCb; const out = C.end().over; onEndCb = null; const L = U.$("leaf"); if (L) L.dataset.battle = ""; document.body.classList.remove("intest"); cb(out); };
      const cont = U.button("cta", U.tr("Continue"), done);
      box.appendChild(cont);
      U.keys([done]);
      U.renderLedger();
      setTimeout(() => cont.focus({ preventScroll: true }), U.motion() ? 600 : 0);
      return;
    }
    // The enemies' turn, one at a time.
    if (B.queue && B.queue.length && runFoes(B, box)) { U.renderLedger(); return; }

    const acts = U.el('<div class="actions"></div>');
    const all = C.available(), idle = all.filter((a) => a.idle);
    // Shouting for a friend is a once-a-battle thing: it waits with the other tools below, not among the moves.
    const call = all.find((a) => a.id === "call");
    // Several divine weapons share one card, "Invoke astra": with more than one ready, it opens a
    // chooser in place of the moves (each weapon, and Back). One mantra a battle, whichever is spoken.
    const isAstra = (a) => a.id === "astra" || (K.ASTRAS && K.ASTRAS[a.id]);
    const astras = all.filter((a) => isAstra(a) && !a.idle);
    // A divine weapon: its mantra traced first (ui/fx.js U.mantra); traced, it is loosed; broken, it waits a turn and no
    // use is spent (C.astraFizzle); Escape lets it go.
    const speak = (a) => {
      if (!U.mantra) return C.act(a.id, a.target === "enemy" ? target : null);
      U.mantra(a.id, { free: K.astraChampion(B.units) }, (ok, cancel) => {
        if (C.state() !== B || B.over) return;
        if (cancel) return U.renderBattle(B);
        if (ok) C.act(a.id, a.target === "enemy" ? target : null); else C.astraFizzle(a.id);
      });
    };
    if (astraPick && astras.filter((a) => !a.why).length > 1) {
      const pick = U.el('<div class="actions astra-pick"></div>');
      astras.filter((a) => !a.why).forEach((a, i) => {
        const b = U.button("act special", "<b>" + (i + 1) + ". " + U.esc(a.name) + "</b><small>" + U.esc(a.desc) + "</small>");
        const run = () => { astraPick = false; speak(a); };
        b.addEventListener("click", run); keys.push(run); pick.appendChild(b);
      });
      const back = () => { astraPick = false; U.renderBattle(B); };
      const bb = U.button("act", "<b>" + U.esc(U.tr("Back")) + "</b><small>" + U.esc(U.tr("Choose another move")) + "</small>", back);
      keys.push(back); pick.appendChild(bb);
      box.appendChild(pick); U.keys(keys); U.renderLedger();
      settleGround(); // the taller panel lifts the fighters
      return;
    }
    astraPick = false;
    const firstAstra = astras[0];
    // With several weapons, only the first stands for them all (as "Invoke astra").
    all.filter((a) => !a.idle && a.id !== "call" && !(isAstra(a) && astras.length > 1 && a !== firstAstra)).forEach((a, i) => {
      if (isAstra(a) && astras.length > 1) {
        const ready = astras.filter((x) => !x.why);
        a = Object.assign({}, a, { id: "astra-pick", name: K.tr("Invoke astra"), desc: K.tr("Choose which divine weapon to speak. One mantra a battle."), why: ready.length ? null : astras[0].why });
      }
      const special = !["strike", "guard", "herbs"].includes(a.id);
      const extra = a.count != null ? " (" + a.count + ")" : "";
      const b = U.button("act" + (special ? " special" : ""), "<b>" + (i + 1) + ". " + U.esc(a.name + extra) + "</b><small>" + U.esc(a.why || a.desc) + "</small>");
      b.disabled = !!a.why;
      b.dataset.move = a.id;
      b.title = a.why || a.desc; // on phones the card shows only the name
      const run = a.id === "astra-pick" ? () => { const ready = astras.filter((x) => !x.why); if (ready.length === 1) speak(ready[0]); else { astraPick = true; U.renderBattle(B); } } : isAstra(a) ? () => speak(a) : () => { if (!C.act(a.id, a.target === "enemy" ? target : null)) U.renderBattle(C.state() || B); };
      b.addEventListener("click", run);
      keys.push(a.why ? null : run);
      acts.appendChild(b);
    });
    box.appendChild(acts);
    // Moves that need allies, when you fight alone: named in one quiet line, not as dead buttons.
    if (idle.length) box.appendChild(U.el('<p class="idle-moves">' + U.esc(U.tr("No allies here for: {moves}", { moves: idle.map((a) => a.name).join(", ") })) + "</p>"));

    const tools = U.el('<div class="battle-tools"></div>');
    if (call && !call.why) {
      // Who would come, and the risk to them: Charu has no armour.
      const near = enc.callHelp === undefined && K.friendsNear ? K.friendsNear(K.S, enc) : [];
      const note = near[0] === "charu" ? U.tr("Charu has no armour") : near[0] ? K.personName(near[0]) : "";
      const cb = U.button("ghost call-help", U.esc(call.name) + (note ? '<small class="call-note">' + U.esc(note) + "</small>" : ""), () => C.act("call", null)); cb.title = call.desc; tools.appendChild(cb);
    }
    C.fallen().forEach((u) => tools.appendChild(U.button("cta secondary", U.tr("Pull {name} out of the fighting", { name: K.text(u.src || u.name) }) + "<small>" + U.tr("Costs your turn") + "</small>", () => C.pull(u.uid))));
    C.spareable().forEach((e) => tools.appendChild(U.button("cta secondary", U.tr("Spare {name}", { name: K.text(e.src || e.name) }), () => C.spare(e.uid))));
    if (C.canFlee()) {
      const breaks = C.fleeBreaks();
      const label = breaks.length ? U.tr("Withdraw (breaks your vow: {vow!})", { vow: K.tr(K.VOWS[breaks[0]].name) }) : U.tr("Withdraw from the fight");
      let armed = false;
      const fb = U.button("ghost", label, () => {
        if (breaks.length && !armed) { armed = true; fb.textContent = K.tr("Tap again to break your vow and withdraw"); return; }
        C.flee();
      });
      tools.appendChild(fb);
    }
    if (tools.children.length) box.appendChild(tools);
    U.keys(keys);
    U.renderLedger();
    // The moves' panel can change height from turn to turn (a tool appears, a card wraps): keep the painting's ground under the fighters.
    settleGround();
    // Before the first blow: the card that says how this fight goes; or the tour of the screen, going on.
    if (briefFor === enc.id && C.state() === B) drawBrief(B);
    else if (tour) tour.refresh();
    champArrive(B);
    clashSoon(B);
  };
  // Your move has played: after a moment to see it land, the real-time screen takes the stage for the clash (ui/realtime.js
  // U.startClash). A storm has nothing to strike at (block, roll and live); a break-through brings only the foe in the lane
  // you chose; an escort has the one you guard on the field. Then the round closes as the turns would.
  let clash = null;
  // Measured with the real-time bot against the same fights on the turns (tests: a storm and the escort won about as often
  // as on the turns; at 15 s and full weight a storm was won by a third of the bot's lives, the elephant by a few).
  const CLASH = { weather: { secs: 12, atk: 0.8, noStrike: true }, escort: { secs: 12, atk: 0.85 }, breakthrough: { secs: 15 } };
  function clashSoon(B) {
    if (!B.clashPending || B.over || clash || C.state() !== B) return;
    clash = { live: false };
    setTimeout(() => {
      if (C.state() !== B || B.over || !B.clashPending || !U.startClash) { clash = null; return; }
      clash.live = true;
      const leaf = U.$("leaf"); if (leaf) leaf.style.visibility = "hidden";
      const lane = B.kind === "breakthrough" && B.lane != null && B.enc.lanes && B.enc.lanes[B.lane] ? "e" + B.enc.lanes[B.lane].foe : null;
      U.startClash(B, Object.assign({ secs: 15 }, CLASH[B.kind], { only: lane ? [lane] : null }), () => {
        clash = null;
        const L = U.$("leaf"); if (L) { L.style.visibility = ""; L.dataset.battle = ""; } // the stage and its figures drawn afresh
        C.clashDone(); // (the round closes, and the screen is drawn again)
        if (C.state() === B && !B.clashPending) U.renderBattle(B);
      });
    }, U.motion() ? 1100 : 300);
  }
  // ---------- A champion takes the field (item 22) ----------
  // The fights on this screen (the holds: Bhishma's arrows) had no arrival moment; the real-time and war-day screens do
  // (owner, 5 November). One of the epic's named fighters on the other side, the first time he is on the field in a fight:
  // the edges darken, his name in gold with his title, a drum; after the rules card and the tour, once a champion a fight.
  const champSeen = {};
  function champArrive(B) {
    if (K.headless || !B || B.over || C.state() !== B || !U.$("arena")) return;
    const seen = champSeen[B.bid] || (champSeen[B.bid] = new Set());
    const h = B.units.find((u) => u.side === "enemy" && (u.person || u.hero) && !u.away && u.hp > 0 && !seen.has(u.uid));
    if (!h) return;
    if (document.querySelector(".fbrief-wrap, .ftour")) { clearTimeout(champArrive.t); champArrive.t = setTimeout(() => champArrive(B), 700); return; }
    B.units.forEach((u) => { if (u.side === "enemy" && (u.person || u.hero) && u.hp > 0) seen.add(u.uid); });
    const full = K.text(h.src || h.name), cut = full.indexOf(","), name = cut > 0 ? full.slice(0, cut) : full, title = cut > 0 ? full.slice(cut + 1).trim() : K.tr("A champion takes the field");
    const old = document.querySelector(".b-champ"); if (old) old.remove();
    const trait = K.RT && K.RT.traitLine ? K.RT.traitLine(h) : null; // his trait (stage 2)
    const el = U.el('<div class="b-champ" aria-live="assertive"><b>' + U.esc(name) + "</b><small>" + U.esc(title) + "</small>" + (trait ? "<em>" + U.esc(K.tr(trait)) + "</em>" : "") + "</div>");
    document.body.appendChild(el); // over the arena, which is drawn again as the turns go
    if (K.Sound) K.Sound.play("drumCall");
    const a = document.querySelector('#arena .actor[data-uid="' + h.uid + '"]'); if (a) { a.classList.remove("champ-in"); void a.offsetWidth; a.classList.add("champ-in"); }
    setTimeout(() => { el.classList.add("off"); setTimeout(() => el.remove(), 450); }, U.calm() ? 1200 : 2100);
  }
  // For a moment after each draw, watch the fighters' feet: whenever they are not where the painting was
  // last fitted (Safari lays the page out later than Chrome, and fonts and images arrive late), fit again.
  let settleUntil = 0;
  function settleGround() {
    if (!U.upright()) return;
    // At once (measuring the feet lays the page out now), then again for a moment in case it moves.
    U.fitBackdrop(true);
    const running = settleUntil > performance.now();
    settleUntil = performance.now() + 1600;
    if (running) return;
    const tick = () => {
      if (!U.upright() || performance.now() > settleUntil) return;
      const f = U.feetY();
      if (f && (U.fitFeet == null || Math.abs(f - U.fitFeet) > 2)) U.fitBackdrop(true);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---------- Before a fight: how it is won, and what you can do ----------
  // A card over the fight before the first blow: one line on how this kind of fight is won and lost,
  // and the moves it offers, each with its sign and a few words; one Fight button. The first time a
  // kind of fight comes in a life it is shown whole; after that, one line across the top of the field
  // that goes by itself. Before the first whole fight of a life, after the card, the screen's parts
  // are pointed out one at a time (the tour, below). Not for the dream, a bout or the practice
  // ground, and never under the tests or the bots (K.headless, jsdom): they go straight to the fight.
  const NO_BRIEF = (enc) => !enc || !!enc.dream || !!enc.bout || /^x_/.test(enc.id || "");
  U.fightBriefSkipped = (encId) => NO_BRIEF(K.ENCOUNTERS[encId]);
  U.fightBriefWanted = (encId) => !K.headless && !/jsdom/i.test(navigator.userAgent || "") && !NO_BRIEF(K.ENCOUNTERS[encId]);
  const ICON = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + "</svg>";
  const FB_ICONS = {
    strike: ICON('<path d="M4 20l5-5M7 13l4 4M9 15L20 4v3L11 16"/>'),
    guard: ICON('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>'),
    herbs: ICON('<path d="M5 19c0-8 6-13 14-14-1 8-6 14-14 14zM5 19l7-7"/>'),
    call: ICON('<path d="M4 10v4h3l6 4V6L7 10zM16 9c1.5 1.5 1.5 4.5 0 6M18.5 6.5c3 3 3 8 0 11"/>'),
    astra: ICON('<circle cx="12" cy="12" r="3.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2L19 19M19 5l-2.8 2.8M7.8 16.2L5 19"/>'),
    special: ICON('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
    orders: ICON('<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>'),
    cover: ICON('<path d="M3 20h18M5 20v-6h14v6M9 14v6M15 14v6M3 10l9-5 9 5"/>'),
    lay: ICON('<path d="M3 18h18M6 14l12-6M12 21v-3"/>'),
    lanes: ICON('<path d="M12 21V9M12 9l-5-5M12 9l5-5M4 4h3M17 4h3"/>'),
    spare: ICON('<path d="M7 11V5.5a1.5 1.5 0 013 0V11M10 10V4.5a1.5 1.5 0 013 0V10M13 10V5.5a1.5 1.5 0 013 0V13c0 4-2.5 7-6 7-2.5 0-4-1.5-5.5-4L3 12.5a1.5 1.5 0 012.5-1.5L7 13"/>'),
    flee: ICON('<path d="M10 6l-6 6 6 6M4 12h11a5 5 0 010 10"/>'),
    block: ICON('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>'),
    steer: ICON('<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>'),
    shoot: ICON('<path d="M7 3c8 4 8 14 0 18"/><path d="M7 3v18"/><path d="M3 12h17m-3-3 3 3-3 3"/>'),
    duck: ICON('<path d="M6 9l6 6 6-6M4 20h16"/>'),
    hold: ICON('<path d="M8 13V6a1.5 1.5 0 013 0v6M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-2.5 7-6 7-3 0-5-2-6-5l-1-3"/>')
  };
  const MODE_NAME = { duel: "A duel", melee: "Against several", hold: "A hold", rounds: "Last the rounds", escort: "An escort", breakthrough: "A break-through", weather: "No striking back",
    chariot: "A chariot duel", range: "An archery duel", mace: "A mace duel", carry: "Carry him out" };
  U.fightBriefMode = function (B) {
    const enc = B.enc;
    if (B.mode) return B.mode;
    if (B.rule && MODE_NAME[B.kind]) return B.kind;
    if (enc.hold) return "hold";
    if (enc.rounds) return "rounds";
    return B.units.filter((u) => u.side === "enemy").length === 1 ? "duel" : "melee";
  };
  // How this fight is won and lost, in one line (translated).
  U.fightBriefGoal = function (B) {
    const enc = B.enc, mode = U.fightBriefMode(B), n = enc.hold || enc.rounds || 0;
    const foe = B.units.find((u) => u.side === "enemy");
    const lower = (s) => (K.lang === "en" ? s.replace(/^The /, "the ") : s);
    switch (mode) {
      case "duel": return K.tr("Bring {foe} down. If you fall first, you lose.", { foe: foe ? K.text(foe.src || foe.name) : "" });
      case "melee": return K.tr("Bring them all down. If you fall first, you lose.");
      case "hold": return K.tr("Stand for {n} rounds. You need not win, only not fall.", { n });
      case "rounds": return K.tr("Last {n} rounds, or bring them all down first.", { n });
      case "escort": return K.tr("Keep {who} whole for {n} rounds. If it falls, you lose.", { who: lower(K.tr(enc.escort || "")), n });
      case "breakthrough": return K.tr("Get {m} lengths through in {n} rounds. Each round, choose your way.", { m: enc.reach, n });
      case "weather": return enc.layDown ? K.tr("You cannot strike back. Lay down your weapons before it reaches you.") : K.tr("You cannot strike back. Guard, take cover, and live through {n} rounds.", { n });
      default: return "";
    }
  };
  // What you can do in it: [icon, name, a few words] (translated), from what the fight offers.
  const ORDERS = (id) => { const ab = K.ABILITIES[id]; return !!ab && (ab.needsAlly || ab.target === "allies"); };
  const isAstraId = (id) => id === "astra" || !!(K.ASTRAS && K.ASTRAS[id]);
  U.fightBriefActions = function (B) {
    const out = [], mode = U.fightBriefMode(B);
    const add = (icon, name, words) => out.push([icon, K.tr(name), K.tr(words)]);
    if (mode === "chariot") { add("steer", "Steer", "Change lanes; ram his car"); add("shoot", "Shoot", "When you are level with him"); return out; }
    if (mode === "range") { add("shoot", "Release", "As he crosses your line"); add("duck", "Duck", "Press again as his arrow flies"); return out; }
    if (mode === "mace") { add("strike", "Strike", "As the ring meets the mark"); add("guard", "Hold back", "Let the red rings pass"); return out; }
    if (mode === "carry") { add("hold", "Carry", "Hold to take his weight"); add("duck", "Let go", "When you stagger"); return out; }
    const rows = C.available().filter((r) => !r.idle && !r.why);
    const ids = rows.map((r) => r.id), seen = new Set();
    const words = { strike: "Hit the one you target", guard: "Halve the next blow", herbs: "Heal yourself or a friend", cover: "The next blow misses you", lay_down: "Kneel; it passes over you" };
    rows.forEach((r) => {
      if (r.id === "call" || seen.has(r.id)) return;
      if (/^lane\d$/.test(r.id)) { if (!seen.has("lanes")) { seen.add("lanes"); add("lanes", "Choose your way", "Left, centre or right"); } return; }
      if (isAstraId(r.id)) { if (!seen.has("astra")) { seen.add("astra"); add("astra", "Invoke astra", "A divine weapon: trace its sign. Three uses in a life, once a battle"); } return; }
      if (words[r.id]) { seen.add(r.id); out.push([r.id === "lay_down" ? "lay" : r.id, r.name, K.tr(words[r.id])]); return; }
    });
    const orders = rows.filter((r) => ORDERS(r.id)), special = rows.filter((r) => !words[r.id] && !ORDERS(r.id) && !isAstraId(r.id) && r.id !== "call" && !/^lane\d$/.test(r.id));
    if (orders.length) out.push(["orders", K.tr("Orders"), orders.map((r) => r.name).join(", ")]);
    if (special.length) out.push(["special", K.tr("Your path's moves"), special.map((r) => r.name).join(", ")]);
    if (B.stepMode) add("block", "Block or dodge", "Tap in time as a blow comes");
    if (ids.includes("call")) add("call", "Call for help", "Once: a friend may come");
    if (B.enc.spare) add("spare", "Spare", "Let a beaten foe live");
    if (C.canFlee()) add("flee", "Withdraw", C.fleeBreaks().length ? "Leave the fight; it breaks a vow" : "Leave the fight, at a cost");
    return out;
  };
  const actionsHtml = (B) => '<ul class="fb-acts">' + U.fightBriefActions(B).map(([ic, name, w]) => '<li><span class="fb-ic">' + FB_ICONS[ic] + "</span><b>" + U.esc(name) + "</b><small>" + U.esc(w) + "</small></li>").join("") + "</ul>";
  // For a fight played live (ui/fightmodes.js): the moves, for the test's own rules card.
  U.fightBriefLive = function (B) {
    if (!U.fightBriefWanted(B.enc.id)) return null;
    const mode = U.fightBriefMode(B), S = K.S, first = !(S.briefed || []).includes(mode);
    if (first) S.briefed = (S.briefed || []).concat(mode);
    return () => '<div class="fbrief inline"><p class="fb-mode">' + U.tr(MODE_NAME[mode]) + "</p>" + actionsHtml(B) + "</div>";
  };
  let briefFor = null, tour = null;
  function drawBrief(B) {
    const S = K.S, mode = U.fightBriefMode(B);
    if (!B._brief) B._brief = { full: !(S.briefed || []).includes(mode), mode };
    if (!(S.briefed || []).includes(mode)) S.briefed = (S.briefed || []).concat(mode);
    const leaf = U.$("leaf"), key = "fbrief:" + B.bid, again = U.pageAgain(key);
    U.pageShown(key);
    const old = document.querySelector(".fbrief-wrap"); if (old) old.remove();
    const goal = U.fightBriefGoal(B);
    if (!B._brief.full) {
      // A kind met before: one line across the top of the field, gone by itself; the fight is on.
      briefFor = null;
      const arena = U.$("arena") || leaf;
      const line = U.el('<p class="fb-line' + (again ? " still" : "") + '" aria-live="polite"><b>' + U.tr(MODE_NAME[mode]) + "</b>" + (goal ? " · " + U.esc(goal) : "") + "</p>");
      arena.appendChild(line);
      setTimeout(() => line.remove(), 4200);
      return;
    }
    const card = U.el('<div class="fbrief-wrap' + (again ? " still" : "") + '" role="dialog" aria-modal="true" aria-labelledby="fb-title"><div class="fbrief">' +
      '<p class="fb-tag">' + U.tr(B.enc.lethal ? "Battle · you can die here" : "A fight") + "</p>" +
      '<h2 id="fb-title">' + U.t(K.val(B.enc.title)) + '</h2><p class="fb-mode">' + U.tr(MODE_NAME[mode]) + "</p>" +
      (goal ? '<p class="fb-goal">' + U.esc(goal) + "</p>" : "") +
      '<p class="fb-lbl">' + U.tr("What you can do") + "</p>" + actionsHtml(B) + '<div class="btnrow"></div></div></div>');
    const go = () => {
      if (briefFor !== B.enc.id) return;
      briefFor = null; card.remove();
      if (!S.fightTour && C.state() === B && !B.over) { S.fightTour = 1; return startTour(B); }
      U.renderBattle(C.state() || B);
    };
    const btn = U.button("cta fb-go", U.tr("Fight"), go);
    card.querySelector(".btnrow").appendChild(btn);
    document.body.appendChild(card);
    U.keys([go]);
    setTimeout(() => { if (btn.isConnected) btn.focus({ preventScroll: true }); }, again ? 0 : 300);
  }

  // ---------- The first fight of a life: the screen, part by part ----------
  // Each part of the fight's screen that this fight has, lit in turn with a line beside it, about two
  // seconds each; a tap goes on, Skip ends it. With calm motion the light jumps, it does not slide.
  function tourSteps(B) {
    const q = (s) => { const el = document.querySelector(s); return el && el.offsetParent !== null ? el : null; };
    const steps = [];
    const add = (el, text) => { if (el) steps.push({ el, text }); };
    if (B.kind !== "weather") add(q("#battle-body .sides .side:last-child .unit.enemy:not(.down)") ? q("#battle-body .sides .side:last-child") : null, C.canMark && C.canMark() ? "Tap a foe's card, or his figure, to mark him for your soldiers." : "Tap a foe's card, or his figure, to make him your target.");
    add(q("#battle-body .sides .side"), "Your side. The bar is health: if yours runs out, you fall.");
    add(q("#battle-body .holdline"), "How many rounds you must stand.");
    add(q("#battle-actions .actions"), "Your moves. Choose one each turn, or press its number.");
    const orders = [...document.querySelectorAll("#battle-actions .act[data-move]")].find((b) => ORDERS(b.dataset.move) && !b.disabled);
    add(orders, "Orders to the soldiers beside you.");
    add([...document.querySelectorAll("#battle-actions .act[data-move]")].find((b) => isAstraId(b.dataset.move) || b.dataset.move === "astra-pick"), "Your divine weapon: trace its sign to loose it. Three uses in a life, once a battle.");
    add(q("#battle-actions .call-help"), "Shout for a friend. Once a battle.");
    add([...document.querySelectorAll("#battle-actions .battle-tools .ghost:not(.call-help)")].find((b) => b.offsetParent), "Withdraw: leave the fight. It has a cost.");
    return steps;
  }
  function startTour(B) {
    U.renderBattle(B);
    const steps = tourSteps(B);
    if (!steps.length) return;
    const still = !U.motion();
    const el = U.el('<div class="ftour' + (still ? " still" : "") + '" role="dialog" aria-modal="true" aria-label="' + U.esc(K.tr("How to fight")) + '"><div class="ft-hole"></div>' +
      '<div class="ft-cap" aria-live="polite"><span class="ft-n"></span><p></p><div class="ft-foot"><span class="ft-tap"></span><button type="button" class="ghost ft-skip"></button></div></div></div>');
    document.body.appendChild(el);
    const hole = el.querySelector(".ft-hole"), cap = el.querySelector(".ft-cap"), skip = el.querySelector(".ft-skip");
    let i = -1, timer = null;
    const end = (quiet) => { if (!tour) return; clearTimeout(timer); tour = null; el.remove(); window.removeEventListener("keydown", key, true); if (quiet !== true) U.renderBattle(C.state() || B); };
    const place = () => {
      const st = steps[i]; if (!st || !st.el.isConnected) return;
      const r = st.el.getBoundingClientRect(), W = innerWidth, H = innerHeight, pad = 6;
      const top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad), right = Math.min(W - 4, r.right + pad), bottom = Math.min(H - 4, r.bottom + pad);
      Object.assign(hole.style, { top: top + "px", left: left + "px", width: right - left + "px", height: bottom - top + "px" });
      // The line goes below the lit part when there is room, else above it; never past the edges.
      const ch = cap.offsetHeight || 90, cw = Math.min(W - 32, 360);
      const y = bottom + 12 + ch <= H - 8 ? bottom + 12 : Math.max(8, top - 12 - ch);
      const x = Math.min(Math.max(16, (left + right) / 2 - cw / 2), W - 16 - cw);
      Object.assign(cap.style, { top: y + "px", left: x + "px", width: cw + "px" });
    };
    const show = () => {
      const st = steps[i];
      cap.querySelector(".ft-n").textContent = K.tr("{n} of {m}", { n: i + 1, m: steps.length });
      cap.querySelector("p").textContent = K.tr(st.text);
      cap.querySelector(".ft-tap").textContent = K.tr("Tap to go on");
      skip.textContent = K.tr("Skip");
      try { st.el.scrollIntoView({ block: "nearest", behavior: "auto" }); } catch (e) { /* old browsers */ }
      place();
    };
    const next = () => {
      clearTimeout(timer);
      i++;
      if (i >= steps.length) return end();
      show();
      const wait = () => { timer = setTimeout(() => (U.paused() ? wait() : next()), 1900); };
      wait();
    };
    const key = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); end(); } else if ([" ", "Enter", "ArrowRight"].includes(e.key) || /^[1-9]$/.test(e.key)) { e.preventDefault(); e.stopPropagation(); next(); } };
    el.addEventListener("click", (e) => { if (e.target === skip) return end(); next(); });
    window.addEventListener("keydown", key, true);
    U.keys([]);
    // Redrawn underneath (a language switch): find the parts again and say the line in the new language.
    tour = { refresh() { U.keys([]); const fresh = tourSteps(B); steps.forEach((s, k) => { const f = fresh.find((x) => x.text === s.text); if (f) steps[k].el = f.el; }); if (i >= 0) show(); }, end };
    next();
  }
  window.addEventListener("resize", () => { if (tour) tour.refresh(); });

  K.on("combat", (B) => U.renderBattle(B));
})(window.K = window.K || {});
