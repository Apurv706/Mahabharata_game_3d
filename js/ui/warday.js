/* The new war-day screen for turn-based fights (PRD §18.15, stage 2): every fight not played in real time (with the
   menu's "Fights: turn-based", every fight). Only the test-only override K.prefs({ oldFights: true }) (engine/
   realtime.js RT.old) brings back ui/battle.js's screen. Laid out as the approved layout page (scratchpad rtlayout, the "war day"):
   both lines across the lower ground, each stepping back in staggered rows; a chip over every foe with the coming
   blow; orange rings under the marked (a red "×2" pill for two blows), an arrow's lane as a thin dashed line, a
   sweep under the whole line; green bars on your side, red on the foes'; compact move cards (Strike, Shield wall,
   Rally and the path's moves) under the stage; Company ▾ (standing orders, your place, Withdraw) and Aid ▾ (herbs,
   the divine weapon, a call for help) at the top right, opening over the move cards at exactly their height, with
   a burning diya. Before round 1, a free choice of your place in the line. The timed read of a blow aimed at you
   stays: Jump, Duck, Sidestep or Block as the ring meets the mark. Shields: your company raises them against a
   blow marked on it, a shield wall closes the line for the round, a foe's shield turns some of your blows.
   The rules are K.Combat's own (C.act, C.resolve, C.setPlace, C.setOrder, C.flee, C.spare, C.pull): this file
   only draws them and passes the player's choices in. Under the tests (K.headless, jsdom) it never runs.
   Fights of another kind (a chariot or archery duel, a carry, an escort, a break-through, weathering a storm) and
   the prologue's dream keep their own screens. */
(function (K) {
  "use strict";
  const U = K.UI, C = K.Combat, RT = K.RT;
  const prevStart = U.startBattle, prevRender = U.renderBattle;
  const T = (s, p) => U.tr(s, p);
  const esc = (s) => U.esc(String(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const $ = (sel, root) => (root || (V && V.el) || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || (V && V.el) || document).querySelectorAll(sel));
  const isP = (u) => u && u.side === "player";
  const isCompany = (u) => !!(u && u.side === "ally" && u.plural && !u.person && !u.called);
  const living = (u) => u && u.hp > 0;
  let want = null, V = null;
  U.warScreen = () => V; // for the fit checks and screenshots

  // ---------- Which fights ----------
  U.warWanted = (encId) => !!(RT && !RT.old() && !RT.wanted(encId) && !K.headless && !/jsdom/i.test(navigator.userAgent || ""));
  U.startBattle = function (encId, onEnd) {
    if (V) stop();
    want = U.warWanted(encId) ? { encId, onEnd } : null;
    const r = prevStart(encId, onEnd);
    want = null;
    return r;
  };
  U.renderBattle = function (B) {
    if (!B) return;
    if (V && V.B === B) return changed();
    if (want && C.state() === B && B.enc.id === want.encId && !B.mode && !B.rule) { const w = want; want = null; return build(B, w.onEnd); } // the dream too, with its clash (owner, 5 November)
    return prevRender(B);
  };

  // ---------- Words ----------
  const SHORT = { strike: "Hit your target", wall: "Halves every blow", rally_line: "Heal, hit harder", guard: "Halve the next blow",
    aimed: "A heavy, sure shot", volley: "Light blows, all foes", pin: "Your target loses a turn", crush: "A huge swing", roar: "Draw their blows",
    quake: "Hit all in reach", swerve: "Dodge, then hit harder", ridedown: "Drive through a foe", rally: "Heal, shake it off",
    command: "An ally strikes now", expose: "Your target takes more", formation: "Every ally guards", salve: "Heal a friend",
    steady: "Cleanse and guard", nerve: "May stun", feint: "Next blow is sure", vanish: "Dodge the next blow", hamstring: "A bleeding cut",
    song: "Allies hit harder", verse: "Your target hits softer", hymn: "Heal every ally", spare: "Let him live", pull: "Costs your turn" };
  const CARD_NAME = { vanish: "Vanish", ridedown: "Ride down", rally: "Rally the horses", rally_line: "Rally" };
  const ORDERS = { line: ["Hold the line", "Strike what comes at you; shield a neighbour."], guardme: ["Guard me", "They close round you: fewer blows reach you."],
    press: ["Press", "They hit harder, and are hit harder."], fallback: ["Fall back", "They stop striking; every blow is lighter."] };
  const PLACE = { front: ["Front", "Hit harder"], middle: ["Middle", "Behind the front"], flank: ["Flank", "Fewer blows"] };
  const PLACES = ["front", "middle", "flank"];
  // Your place as a slot in the line: front (the front row), middle (behind the front soldier), flank (out wide).
  const SLOT_OF = { front: 0, middle: 2, flank: 1 };
  const ICON = {
    sword: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 L11 5 M9 3 L13 3 L13 7 M2 11 L5 14" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
    arrow: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8 H13 M10 5 L13 8 L10 11 M2 6 L4 8 L2 10" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sweep: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 11 Q8 2 14 11 M11 9 L14 11 L14 7.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    shield: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 L13 4 V8 C13 11 10.5 13 8 14 C5.5 13 3 11 3 8 V4 Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>'
  };
  const FLAME = '<span class="flame" aria-hidden="true"><svg viewBox="0 0 24 24"><circle class="fr-bg" cx="12" cy="12" r="10.5"/><circle class="fr" cx="12" cy="12" r="10.5" pathLength="100"/><path class="fl" d="M12 4.5 C15 8.5 16.2 11 15.2 14 C14.6 16.2 13.2 17.2 12 17.2 C10.8 17.2 9.4 16.2 8.8 14 C7.8 11 9 8.5 12 4.5 Z"/><path class="lamp" d="M6.5 17 Q12 21.5 17.5 17 Z"/></svg></span>';
  const WEAPON = {
    spear: '<svg viewBox="0 0 100 12" aria-hidden="true"><path d="M3 6 H80" stroke="#1d0f08" stroke-width="5.4" stroke-linecap="round"/><path d="M3 6 H80" stroke="#3f2310" stroke-width="2.6" stroke-linecap="round"/><path d="M79 2 L98 6 L79 10 Z" fill="#dcd7c8" stroke="#1d0f08" stroke-width="1"/></svg>',
    bow: '<svg viewBox="0 0 100 24" aria-hidden="true"><path d="M4 20 Q50 -10 96 20" fill="none" stroke="#5a3418" stroke-width="3.4" stroke-linecap="round"/><path d="M4 20 L96 20" stroke="#efe2c0" stroke-width="1"/></svg>',
    mace: '<svg viewBox="0 0 100 24" aria-hidden="true"><path d="M4 12 H70" stroke="#6b4422" stroke-width="4" stroke-linecap="round"/><ellipse cx="82" cy="12" rx="15" ry="10" fill="#d9a53a" stroke="#1d0f08" stroke-width="1.2"/></svg>',
    sword: '<svg viewBox="0 0 100 12" aria-hidden="true"><path d="M4 6 H20" stroke="#5a3418" stroke-width="4" stroke-linecap="round"/><path d="M20 3 L92 5 L98 6 L92 7 L20 9 Z" fill="#dcd7c8" stroke="#1d0f08" stroke-width="1"/></svg>'
  };
  const SHOTS = new Set(["aimed", "volley", "pin", "arrows"]);
  const MELEE = new Set(["strike", "heavy", "breaker", "disarm", "crush", "nerve", "hamstring", "ridedown", "quake"]);
  const DAMAGING = { strike: 1, heavy: 1.6, breaker: 1.25, disarm: 0.8, arrows: 0.6 };

  // ---------- Building the screen ----------
  function build(B, onEnd) {
    stop();
    V = { B, onEnd, figs: new Map(), hp: {}, ev: [], playing: false, target: null, placed: !B.place, choosing: false, sheet: null, dropT: 0, toastT: 0, logAt: B.log.length,
      packSeen: B.packNow || 0, over: false, qte: null, tagT: 0, champSeen: new Set() };
    B.units.forEach((u) => { V.hp[u.uid] = u.hp; });
    // The clash (prototype, owner 5 November): after your order the round is fought in real time (ui/realtime.js).
    // (not when the player chose turn-based fights in the Menu: those keep pure turns)
    B.clashMode = !!(U.startClash && !K.headless && K.RT && K.RT.on && K.RT.on()); // the dream as well (owner, 5 November)
    // Everything that happens is kept as it happens, to be played out in order: a move, the blows it lands, a heal.
    const hit0 = B.hit, heal0 = B.heal;
    B.hit = function (u, t, m, o) {
      B.lastShield = null; B.lastDef = null;
      const hp = t ? t.hp : 0, d = hit0.call(B, u, t, m, o);
      if (t && V && V.B === B) V.ev.push({ k: "hit", by: u.uid, on: t.uid, n: hp - t.hp, sh: B.lastShield && B.lastShield.on === t.uid ? B.lastShield.kind : null, def: isP(t) ? B.lastDef : null, heavy: !!(o && o.heavy) || m >= 1.4, crit: !!(B.lastHit && B.lastHit.on === t.uid && B.lastHit.crit) });
      return d;
    };
    B.heal = function (u, t, n) { const hp = t ? t.hp : 0; heal0.call(B, u, t, n); if (t && V && V.B === B && t.hp > hp) V.ev.push({ k: "heal", on: t.uid, n: t.hp - hp }); };
    const push0 = B.acts.push;
    B.acts.push = function (a) { if (V && V.B === B) V.ev.push({ k: "act", uid: a.uid, id: a.id }); return push0.apply(this, arguments); };
    dom();
    if (K.Sound && K.Sound.mood) K.Sound.mood("battle");
    U.redraw = () => { if (V) { dom(); V.low = null; idle(); } }; // (a fresh screen: the low-life warning set again if it is due)
    // The dream (owner, 6 November): one clash of 10 seconds in real time against the warrior and his two soldiers,
    // with no orders before it and no help; when it ends, however it ends, the field goes white and you wake.
    if (B.enc.dream && B.clashMode) return dreamClash(B);
    // Before the first blow: the card that says how this fight goes (or one line), then the tour on a life's first fight.
    if (U.fightBriefWanted && U.fightBriefWanted(B.enc.id)) brief();
    idle();
    // A champion in the first pack: his arrival is a moment.
    setTimeout(() => champion(), 350);
  }
  function dreamClash(B) {
    V.clashing = true; V.el.style.visibility = "hidden"; V.el.id = "rt-war";
    const ctl = V.el.querySelector(".wctl"), hud = V.el.querySelector(".hud"); [ctl, hud].forEach((e) => { if (e) e.style.visibility = "hidden"; }); // (the field alone shows as the white comes up)
    setTimeout(() => { if (!V || V.B !== B) return; U.startClash(B, { secs: B.enc.clashSecs || 10, atk: 0.8, noBack: true }, () => {
      if (!V || V.B !== B) return;
      V.el.id = "rt"; V.el.style.visibility = ""; V.clashing = false;
      C.settle("win"); // (the dream is not won or lost: it breaks)
      end();
    }); }, 120);
  }
  function dom() {
    const B = V.B, enc = B.enc;
    const old = document.getElementById("rt"); if (old) old.remove();
    $$(".fbrief-wrap, .ftour", document).forEach((e) => e.remove());
    const title = U.t(K.val(enc.title) || "");
    const company = !!B.order;
    const el = U.el('<div id="rt" class="screen war" role="application" aria-label="' + esc(T("Battle")) + '">' +
      '<div class="stage" id="rt-stage"><div class="world" id="rt-world"></div><div class="tags"></div><div class="wd-vig"></div><div class="wd-flash"></div>' +
        '<div class="hud"><div class="goal"><b>' + title + '</b><span class="wround"></span><span class="faint wpackline"></span><div class="pips"></div></div>' +
        '<div class="hud-r">' + (company ? '<button type="button" class="hb orders wpill" data-wact="company" aria-haspopup="dialog"><small>' + esc(T("Company")) + ' · <span class="wplace"></span></small><span class="word"></span><kbd>O</kbd></button>' : "") +
        '<button type="button" class="hb aid" data-wact="aid" aria-haspopup="dialog">' + esc(T("Aid")) + " ▾</button></div></div>" +
        '<div class="banner off" role="status"></div><div class="toast off" role="status"></div><div class="wd-champ" aria-live="polite"></div>' +
        '<div class="lowwarn" role="alert" hidden><i aria-hidden="true">!</i><div><b>' + esc(T("Your life is low")) + "</b><span></span></div></div></div>" +
      '<div class="wctl"><div class="moves" id="wd-moves"></div>' +
        '<div class="placepick"><p class="pp-title">' + esc(T("Choose your place in the line for the first round")) + '</p><div class="pp-opts">' +
          PLACES.map((k) => '<button type="button" data-place="' + k + '"><b>' + esc(T(PLACE[k][0])) + "</b><small>" + esc(T(PLACE[k][1])) + "</small></button>").join("") + "</div></div>" +
        '<div class="wd-read" role="group" aria-label="' + esc(T("Meet the blow")) + '"></div>' +
        '<p class="summary" id="wd-summary"></p></div>' +
      '<div class="sheet orders-sheet company-sheet" role="dialog" aria-label="' + esc(T("Company")) + '" hidden></div>' +
      '<div class="sheet aid-sheet dropdown" role="dialog" aria-label="' + esc(T("Aid")) + '" hidden></div></div>');
    document.body.appendChild(el);
    el.addEventListener("selectstart", (e) => e.preventDefault()); // no text selection or look-up bubble on a held touch
    { const fe = document.activeElement; if (fe && fe !== document.body && fe.matches && fe.matches("input, textarea, [contenteditable]")) fe.blur(); } // no keyboard bar left up from an earlier field
    document.body.classList.add("in-rt", "intest");
    V.el = el; V.stage = el.querySelector("#rt-stage"); V.world = el.querySelector("#rt-world"); V.tags = el.querySelector(".tags");
    const bg = U.FIGHT_BG && U.FIGHT_BG[enc.id];
    V.art = [U.artUrl(bg || K.val(enc.stage) || K.val(enc.art)), U.fightTall(bg)]; // the fight's own field, wide and tall (where a tall one is painted)
    V.figs = new Map();
    el.querySelectorAll("[data-wact]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); if (b.dataset.wact === "company") toggleSheet("company"); else toggleSheet("aid"); }));
    el.querySelectorAll("[data-place]").forEach((b) => b.addEventListener("click", () => choosePlace(b.dataset.place)));
    if (!V.wired) {
      V.wired = true;
      window.addEventListener("keydown", onKey, true); window.addEventListener("resize", onResize);
      document.addEventListener("pointerdown", dropOutside, true);
      V.tagI = setInterval(() => { if (V && !V.over) nameTags(); }, 10000);
    }
    layout();
    setTimeout(() => nameTags(), 250);
  }
  function stop() {
    if (!V) return;
    clearTimeout(V.dropT); clearTimeout(V.autoT); clearInterval(V.tagI);
    if (V.qte) V.qte.stop();
    window.removeEventListener("keydown", onKey, true); window.removeEventListener("resize", onResize);
    document.removeEventListener("pointerdown", dropOutside, true);
    if (V.el) V.el.remove();
    $$(".fbrief-wrap, .ftour", document).forEach((e) => e.remove());
    document.body.classList.remove("in-rt", "intest");
    if (U.rigs) U.rigs.clear();
    V = null;
  }

  // ---------- Layout (the layout page's war day) ----------
  // Each line in rows, staggered so no two bodies overlap: front, middle (out wide), back (between), a fourth beside.
  const SLOTS = {
    friend: { up: [[0.33, 0], [0.15, 1], [0.30, 2], [0.47, 2]], wide: [[0.36, 0], [0.20, 1], [0.27, 2], [0.44, 1]] },
    foe: { up: [[0.67, 0], [0.85, 1], [0.70, 2]], wide: [[0.64, 0], [0.80, 1], [0.73, 2]] }
  };
  function layout() {
    if (!V || !V.el) return;
    const vw = window.innerWidth, vh = window.innerHeight, scr = V.el;
    const wide = vw >= 820 && vw / vh >= 1.15;
    scr.classList.toggle("wide", wide); scr.classList.toggle("upright", !wide);
    scr.style.setProperty("--bh", (wide ? 40 : 44) + "px"); scr.style.setProperty("--hb", "0px");
    cards(); // the move cards first: their rows set the stage's height
    const W = V.stage.clientWidth, H = V.stage.clientHeight;
    V.stage.style.backgroundImage = "url(" + (H > W * 1.25 && V.art[1] ? V.art[1] : V.art[0]) + ")";
    const ph = wide ? Math.min(H * 0.29, W * 0.3) : Math.min(H * 0.28, W * 0.46);
    V.G = { W, H, ph, wide, dk: 0.12, gl: H * (wide ? 0.08 : 0.12), dstep: H * (wide ? 0.1 : 0.16) };
    cast();
    place();
    if (V.sheet) placeDrop($("." + (V.sheet === "company" ? "company" : "aid") + "-sheet"), $(V.sheet === "company" ? ".hb.wpill" : ".hb.aid"));
  }
  function onResize() { if (V) layout(); }

  // Who is on the stage: you, those beside you (your company as two soldiers), and the foes of the pack now on.
  function specFor(u) {
    if (isP(u)) {
      const s = Object.assign({}, K.puppetSpec(K.S), { item: K.fightItem(K.S, V && V.B && V.B.enc.dream ? "dream" : null) }); // the dream: grown, with a sword
      if (C.hasShield && C.hasShield()) s.gear = (s.gear || []).filter((g) => g !== "shield" && g !== "buckler").concat("shield"); // the big round shield, on the mace and sword paths (and in the dream)
      return s;
    }
    if (isCompany(u)) return Object.assign({}, K.PUPPETS.soldier, { stage: "adult" });
    return U.battleSpecFor ? U.battleSpecFor(u) : U.puppetFor("soldier");
  }
  function bodies() {
    const B = V.B, out = { friend: [], foe: [] };
    const friends = B.units.filter((u) => u.side !== "enemy" && !u.still), foes = B.units.filter((u) => u.side === "enemy" && (!u.away || u.spared) && !u.still); // a spared foe kneels where he was
    const persons = friends.filter((u) => !isP(u) && !isCompany(u)), comp = friends.filter(isCompany);
    const nF = 1 + persons.length + comp.length;
    const per = (u) => (nF + comp.length <= 4 ? 2 : 1);
    out.friend.push({ u: B.units[0], i: 0 });
    persons.forEach((u) => out.friend.push({ u, i: 0 }));
    comp.forEach((u) => { for (let i = 0; i < per(u); i++) out.friend.push({ u, i }); });
    // Foes: the melee in front (the named first), archers behind; a band of foes as two when there is room.
    const rank = (u) => (/archer|bow/i.test(String(u.src || u.name)) ? 2 : u.hero ? 0 : 1);
    const fs = foes.slice().sort((a, b) => rank(a) - rank(b));
    const extra = 3 - fs.length;
    fs.forEach((u) => { out.foe.push({ u, i: 0 }); });
    let room = extra; fs.forEach((u) => { if (u.plural && room > 0) { out.foe.push({ u, i: 1 }); room--; } });
    out.friend = out.friend.slice(0, 4); out.foe = out.foe.slice(0, 3);
    return out;
  }
  function cast() {
    const G = V.G; if (!G) return;
    const B = V.B, list = bodies(), seen = new Set();
    V.nb = {}; for (const side of ["friend", "foe"]) for (const b of list[side]) V.nb[b.u.uid] = Math.max(V.nb[b.u.uid] || 0, b.i + 1);
    // Slots: yours by your place; the others fill the line from the front.
    const mine = B.place ? SLOT_OF[B.place] : 0;
    const free = [0, 1, 2, 3].filter((s) => s !== mine);
    list.friend.forEach((b, k) => { b.slot = k === 0 ? mine : free.shift(); });
    list.foe.forEach((b, k) => { b.slot = k; });
    for (const side of ["friend", "foe"]) for (const b of list[side]) {
      const key = b.u.uid + ":" + b.i;
      seen.add(key);
      let f = V.figs.get(key);
      if (!f) f = figure(b.u, b.i, side, key);
      const tbl = SLOTS[side][G.wide ? "wide" : "up"], s = tbl[Math.min(b.slot, tbl.length - 1)];
      if (!f.dead) { f.slot = b.slot; f.f = s[0]; f.d = s[1]; }
      size(f);
    }
    // Those who have left (a friend carried away by the fighting) fade; the fallen of an earlier pack stay where they lie.
    V.figs.forEach((f, key) => {
      if (seen.has(key) || f.dead) return;
      if (!B.units.includes(f.u)) { f.el.style.transition = "opacity .6s"; f.el.style.opacity = "0"; setTimeout(() => f.el.remove(), 600); if (f.tap) f.tap.remove(); if (f.chip) f.chip.remove(); if (f.tag) f.tag.remove(); V.figs.delete(key); }
    });
  }
  function figure(u, i, side, key) {
    const spec = specFor(u), foe = side === "foe";
    const el = U.el('<div class="actor ' + (isP(u) ? "me" : foe ? "foe" : "ally") + '" data-uid="' + u.uid + '" data-id="' + key + '"><span class="shadow"></span><div class="fl">' +
      U.puppet(spec, { pose: U.motion() ? "live" : isP(u) ? "brace" : "stand", h: 200 }) + '</div><span class="mini"><b></b></span></div>');
    V.world.appendChild(el);
    const svg = el.querySelector("svg.pp"), vb = (svg.getAttribute("viewBox") || "0 0 120 200").split(/[\s,]+/).map(Number);
    const bow = !!svg.querySelector('.it:not(.it-w) path[d="M50 86 L50 166"]');
    const f = { key, u, i, side, el, svg, fl: el.querySelector(".fl"), vbW: vb[2], vbH: vb[3], sc: 210 / vb[3], spec, bow, face: foe ? -1 : 1, d: 0, f: 0.5,
      base: bow ? "bowready" : svg.dataset.stance && foe ? svg.dataset.stance : "ready", dead: false,
      name: isP(u) ? K.tr("You") : isCompany(u) ? K.tr("Soldier") : (u.person || u.hero || u.called) ? K.text(u.src || u.name).split(",")[0] : null };
    f.rig = U.motion() && U.rig ? U.rig(svg, el, f.base, { fight: true }) : null;
    el.classList.toggle("face-l", f.face < 0);
    if (foe) {
      const t = document.createElement("button"); t.type = "button"; t.className = "tap foe-tap"; t.setAttribute("aria-label", K.text(u.src || u.name));
      t.addEventListener("click", () => pick(u.uid, true)); V.stage.appendChild(t); f.tap = t;
      const c = document.createElement("span"); c.className = "intent"; V.stage.appendChild(c); f.chip = c;
    }
    if (u.hp <= 0 || (isCompany(u) && aliveBodies(u) <= i)) { f.dead = true; el.classList.add("dead"); if (f.rig) f.rig.fallDown(-86, foe ? -1 : 1); dropWeapon(f); }
    V.figs.set(key, f);
    return f;
  }
  // A band shows as many bodies as its health still stands for.
  const nBodies = (u) => Math.max(1, (V.nb && V.nb[u.uid]) || 0, [...V.figs.values()].filter((f) => f.u === u).length);
  function aliveBodies(u) { const hp = V.hp[u.uid] != null ? V.hp[u.uid] : u.hp; if (hp <= 0) return 0; return u.plural ? Math.max(1, Math.ceil(nBodies(u) * hp / u.maxHp - 1e-9)) : 1; }
  function size(f) {
    const G = V.G;
    const k = 1 - G.dk * Math.max(0, f.d);
    f.fh = G.ph * k; f.bw = f.fh * 0.36;
    const svgH = f.fh * 210 / 164, svgW = svgH * f.vbW / f.vbH;
    f.svg.style.height = svgH.toFixed(1) + "px"; f.svg.style.width = svgW.toFixed(1) + "px";
    f.fl.style.bottom = (-(200 + 10 / f.sc - 193) / (210 / f.sc) * svgH).toFixed(1) + "px";
    f.el.style.setProperty("--fh", f.fh.toFixed(1) + "px");
    f.el.style.zIndex = String(f.dead ? 4 : Math.round(10 - f.d * 3));
  }
  function pos(f) {
    const G = V.G;
    f.x = (f.f + (f.dx || 0)) * G.W; f.gy = G.gl + f.d * G.dstep;
    f.el.style.left = f.x.toFixed(1) + "px"; f.el.style.bottom = f.gy.toFixed(1) + "px";
    if (f.tag) { f.tag.style.bottom = (f.gy + f.fh * 0.4) + "px"; f.tag.style.left = (f.x - f.face * f.fh * 0.05) + "px"; }
    const m = f.el.querySelector(".mini b"), hp = V.hp[f.u.uid] != null ? V.hp[f.u.uid] : f.u.hp;
    if (m) m.style.width = clamp(hp / f.u.maxHp * 100, 0, 100) + "%";
  }
  const figsOf = (u) => [...V.figs.values()].filter((f) => f.u === u || f.u.uid === (u && u.uid));
  const firstFig = (uid) => [...V.figs.values()].find((f) => f.u.uid === uid && !f.dead) || [...V.figs.values()].find((f) => f.u.uid === uid);

  // ---------- Placing everything: figures, tap areas, chips, rings, lanes, the summary ----------
  function bodyRect(f) {
    const sr = V.stage.getBoundingClientRect(), b = f.svg.querySelector(".pp-body") || f.svg, r = b.getBoundingClientRect();
    return { l: r.left - sr.left, t: r.top - sr.top, w: r.width, h: r.height, b: r.bottom - sr.top };
  }
  function place() {
    const G = V.G, B = V.B; if (!G) return;
    // A shield wall: your side steps together, shoulder to shoulder, for the round.
    const walled = B.units.some((u) => u.side !== "enemy" && u.status.wall && u.hp > 0);
    const anchor = (SLOTS.friend[G.wide ? "wide" : "up"][0] || [0.33])[0];
    V.figs.forEach((f) => { f.dx = walled && f.side === "friend" && !f.dead ? (anchor - f.f) * 0.22 : 0; pos(f); });
    $$(".gmark, .wlane", V.world).forEach((e) => e.remove());
    const chips = [];
    const est = {};
    for (const f of V.figs.values()) {
      if (f.side !== "foe") continue;
      if (f.dead || f.u.hp <= 0) { if (f.tap) f.tap.hidden = true; if (f.chip) f.chip.hidden = true; continue; }
      const r = bodyRect(f), w = Math.max(58, r.w * 0.9), h = Math.max(58, r.h * 0.9);
      f.tap.hidden = false;
      Object.assign(f.tap.style, { left: clamp(f.x - w / 2, 0, G.W - w) + "px", width: w + "px", top: (r.b - h) + "px", height: h + "px", zIndex: String(8 - Math.round(f.d)) });
      f.el.classList.toggle("target", f.u.uid === V.target && f.i === 0);
      const it = f.i === 0 && !V.over ? intentOf(f.u) : null;
      if (!it) { f.chip.hidden = true; continue; }
      f.chip.hidden = false; f.chip.className = "intent" + (it.area ? " area" : "") + (it.dmg ? "" : " calm");
      f.chip.innerHTML = ICON[it.icon] + (it.dmg ? "<span>" + it.dmg + (it.area ? " ×" + it.on.length : "") + "</span>" : "");
      est[f.u.uid] = it;
      const miniTop = G.H - f.gy - f.fh * 1.04 - 8;
      chips.push({ c: f.chip, x: f.x, top: Math.min(r.t, miniTop) - f.chip.offsetHeight - 4, w: f.chip.offsetWidth, h: f.chip.offsetHeight });
    }
    // Chips that would touch move apart sideways, then stay inside the stage and off the feet below.
    chips.sort((p, q) => p.x - q.x);
    for (let i = 1; i < chips.length; i++) { const p = chips[i - 1], q = chips[i]; if (Math.abs(p.top - q.top) < (p.h + q.h) / 2 + 2) { const min = p.x + (p.w + q.w) / 2 + 4; if (q.x < min) q.x = min; } }
    const lastC = chips[chips.length - 1];
    if (lastC && lastC.x + lastC.w / 2 > G.W - 2) { const over = lastC.x + lastC.w / 2 - (G.W - 2); for (const ch of chips) ch.x -= over; }
    const feet = [...V.figs.values()].filter((f) => !f.dead).map((f) => bodyRect(f)).map((r) => ({ l: r.l, r: r.l + r.w, t: r.b - r.h * 0.16 - 4, b: r.b + 4 }));
    for (const ch of chips) {
      ch.x = clamp(ch.x, ch.w / 2 + 2, G.W - ch.w / 2 - 2);
      for (let k = 0; k < 4; k++) { const hit = feet.find((f) => ch.x + ch.w / 2 > f.l && ch.x - ch.w / 2 < f.r && ch.top + ch.h > f.t && ch.top < f.b); if (!hit) break; ch.top = hit.t - ch.h - 2; }
      ch.top = Math.max(2, ch.top);
      ch.c.style.left = ch.x + "px"; ch.c.style.top = ch.top + "px";
    }
    // Ground: a ring under each marked one (×2 for two blows), the arrow's lane, a sweep under the whole line.
    const count = {};
    for (const [uid, it] of Object.entries(est)) {
      if (!it.dmg) continue;
      if (it.area) { // a blow at the whole line: a ring under every one of your side (no box around part of it)
        for (const f of V.figs.values()) if (f.side === "friend" && !f.dead) count[f.u.uid] = (count[f.u.uid] || 0) + 1;
        continue;
      }
      const t = firstFig(it.on[0]); if (!t) continue;
      count[t.u.uid] = (count[t.u.uid] || 0) + 1;
      const e = firstFig(uid);
      if (it.icon === "arrow" && e) { const m = document.createElement("div"); m.className = "wlane"; V.world.appendChild(m); lane(m, bowPoint(e), { x: t.x, y: G.H - t.gy - t.fh * 0.58 }, t.bw * 0.4); }
    }
    for (const uid in count) {
      const t = firstFig(uid); if (!t || t.dead) continue;
      const m = document.createElement("div"); m.className = "gmark ring";
      const w = t.fh * 0.56 + (count[uid] - 1) * 12, h = t.fh * 0.12;
      Object.assign(m.style, { left: t.x + "px", width: w + "px", height: h + "px", bottom: (t.gy - h / 2) + "px" });
      m.innerHTML = count[uid] > 1 ? '<span class="n">×' + count[uid] + "</span>" : "";
      if (t.x - w / 2 < 40) m.classList.add("n-in"); // near the left edge: the pill goes on the inner side
      V.world.appendChild(m);
    }
    let blows = 0, dmg = 0;
    const me = B.units[0];
    for (const it of Object.values(est)) if (it.dmg && it.on.includes(me.uid)) { blows++; dmg += it.dmg; }
    const sum = $("#wd-summary");
    if (sum) sum.innerHTML = V.over ? "" : blows ? esc(T(blows === 1 ? "Marked on you this round: {b} blow, {d} in all" : "Marked on you this round: {b} blows, {d} in all", { b: "§", d: "¤" })).replace("§", "<b>" + blows).replace("¤", dmg + "</b>") : esc(T("Nothing is marked on you this round."));
    hud();
  }
  function lane(el, A, Bp, short) {
    const dx = Bp.x - A.x, dy = Bp.y - A.y, d = Math.hypot(dx, dy), len = Math.max(8, d - short);
    Object.assign(el.style, { left: A.x + "px", top: A.y + "px", width: len + "px", transform: "rotate(" + Math.atan2(dy, dx) + "rad)" });
  }
  // The coming blow, as the chip shows it: an estimate of its harm on the one it is marked on.
  function intentOf(u) {
    const it = C.intent(u); if (!it) return null;
    const B = V.B, p = B.units[0];
    if (!(it.id in DAMAGING)) return { icon: "shield", dmg: 0, on: [] };
    const area = it.target === "enemies";
    const on = area ? B.units.filter((x) => x.side !== "enemy" && x.hp > 0 && !x.away && !x.still).map((x) => x.uid) : it.unit ? [it.unit.uid] : [];
    const t = area ? p : it.unit; if (!t) return null;
    let d = (u.atk + 2.5) * DAMAGING[it.id];
    if (u.status.inspired) d *= 1.3; if (u.status.weakened) d *= 0.7; if (u.status.cursed) d *= 0.5;
    d -= t.def; if (t.status.exposed) d *= 1.4;
    if (t.status.guard || t.status.wall) d *= 0.5;
    const ranged = SHOTS.has(it.id) || (/archer|bow/i.test(String(u.src || u.name)) && it.id === "strike");
    return { icon: area ? "sweep" : ranged ? "arrow" : "sword", dmg: Math.max(1, Math.round(d)), on, area };
  }
  function hud() {
    const B = V.B, enc = B.enc, n = enc.hold || enc.rounds || 0;
    const r = $(".wround"); if (r) r.textContent = enc.hold ? T("Hold: round {n} of {m}", { n: Math.min(B.round, n), m: n }) : enc.rounds ? T("round {n} of {m}", { n: Math.min(B.round, n), m: n }) : T("round {n}", { n: B.round });
    const who = B.units.find((u) => u.side === "enemy" && !u.away && u.hp > 0);
    const pl = $(".wpackline"); if (pl) pl.textContent = (B.packs > 1 ? T("Pack {a} of {b}", { a: (B.packNow || 0) + 1, b: B.packs }) + " · " : "") + (who ? K.text(who.src || who.name) : "");
    const pips = $(".pips"); if (pips) pips.innerHTML = n ? Array.from({ length: n }, (_, i) => "<i" + (i < B.round ? ' class="on"' : "") + "></i>").join("") : "";
    const wp = $(".wplace"); if (wp) wp.textContent = T(PLACE[B.place || "middle"][0]);
    const wo = $(".hb.wpill .word"); if (wo) wo.textContent = T(ORDERS[B.order || "line"][0]) + " ▾";
  }

  // ---------- The move cards ----------
  function moves() {
    const B = V.B, all = C.available().filter((a) => !a.idle);
    const wall = all.some((a) => a.id === "wall");
    const isAstra = (a) => a.id === "astra" || !!(K.ASTRAS && K.ASTRAS[a.id]) || !!(K.ABILITIES[a.id] && K.ABILITIES[a.id].group === "astra");
    const order = ["strike", "wall", "rally_line", "guard"];
    const rows = all.filter((a) => !isAstra(a) && a.id !== "herbs" && a.id !== "call" && !(wall && a.id === "guard"))
      .sort((a, b) => (order.indexOf(a.id) < 0 ? 9 : order.indexOf(a.id)) - (order.indexOf(b.id) < 0 ? 9 : order.indexOf(b.id)));
    // Build D (row 50): in a war day that plays clashes, Shield wall and Guard lock Strike for the clash's first seconds.
    const lock = B.clashMode && !B.enc.dream ? K.tr("In the clash: shield up, no strikes for {n} s", { n: RT.P.strikeLock }) : "";
    const out = rows.map((a) => ({ id: a.id, name: K.tr(CARD_NAME[a.id] ? CARD_NAME[a.id] : K.ABILITIES[a.id].name), small: a.why || K.tr(SHORT[a.id] || ""), why: a.why, target: a.target, also: !a.why && (a.id === "wall" || a.id === "guard") ? lock : "" }));
    C.spareable().slice(0, 1).forEach((e) => out.push({ id: "spare", uid: e.uid, name: K.tr("Spare"), small: K.text(e.src || e.name) }));
    C.fallen().slice(0, 1).forEach((u) => out.push({ id: "pull", uid: u.uid, name: K.tr("Pull out"), small: K.text(u.src || u.name).split(",")[0] }));
    if (!B.units.some((u) => u.side === "enemy" && u.hp > 0 && !u.away)) return out.filter((m) => m.id !== "strike");
    return out;
  }
  function cards() {
    const box = $("#wd-moves"); if (!box) return;
    const list = moves(), wide = V.el.classList.contains("wide");
    const key = list.map((m) => m.id + "|" + m.name + "|" + m.small + "|" + !!m.why + "|" + (m.also || "")).join(";") + (wide ? "w" : "u") + K.lang;
    if (box.dataset.key !== key) {
      box.dataset.key = key;
      box.innerHTML = list.map((m, i) => '<button type="button" class="mv-' + m.id + '" data-move="' + m.id + '"' + (m.uid ? ' data-uid="' + m.uid + '"' : "") + (m.why ? " disabled" : "") + ' title="' + esc(m.small + (m.also ? " · " + m.also : "")) + '"><kbd>' + (i + 1) + "</kbd><b>" + esc(m.name) + "</b><small>" + esc(m.small) + "</small>" + (m.also ? '<small class="also">' + esc(m.also) + "</small>" : "") + "</button>").join("");
      box.querySelectorAll("[data-move]").forEach((b) => b.addEventListener("click", () => move(b.dataset.move, b.dataset.uid)));
      // Rows so that no card sits alone: 3+2 or 3+3 on a phone, 2+2 for four; one row on a laptop.
      const n = list.length, cols = wide ? n : n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4;
      box.style.setProperty("--cols", String(Math.max(1, cols)));
      // A long name (a path's move, in Hindi) shrinks to fit its card rather than being cut.
    }
    const busy = V.playing || V.over || !!(V.B.queue && V.B.queue.length) || !!V.qte;
    box.classList.toggle("busy", busy);
    box.querySelectorAll("button").forEach((b) => { b.classList.toggle("wait", busy); });
    V.el.querySelector(".wctl").classList.toggle("picking", !!(V.B.place && !V.placed && V.B.round === 1 && !V.B.habit.length && !V.over));
    V.el.querySelector(".wctl").classList.toggle("reading", !!V.qte);
    fitText();
  }
  // A long name (a path's move, a place, in Hindi) shrinks to fit its card rather than being cut.
  function fitText() {
    V.el.querySelectorAll("#wd-moves button b, #wd-moves button small, .placepick button b, .placepick button small").forEach((t) => {
      if (!t.offsetWidth) return;
      const k = t.offsetWidth + ":" + t.textContent; if (t.dataset.fit === k) return;
      t.style.fontSize = ""; let s = parseFloat(getComputedStyle(t).fontSize);
      while (t.scrollWidth > t.clientWidth + 1 && s > 9) { s -= 0.5; t.style.fontSize = s + "px"; }
      t.dataset.fit = k;
    });
  }

  // ---------- Your choices ----------
  function pick(uid, tapped) {
    const B = V.B, u = B.units.find((x) => x.uid === uid && x.hp > 0 && x.side === "enemy");
    if (!u) return;
    V.target = uid;
    place();
    if (tapped) { const f = firstFig(uid); if (f) nameTag(f, 1.6); }
  }
  function ensureTarget() {
    const B = V.B;
    const ok = (uid) => B.units.some((u) => u.uid === uid && u.hp > 0 && u.side === "enemy" && !u.away);
    if (!ok(V.target)) { const f = [...V.figs.values()].find((x) => x.side === "foe" && !x.dead && ok(x.u.uid)); V.target = f ? f.u.uid : (B.units.find((u) => u.side === "enemy" && u.hp > 0 && !u.away) || {}).uid || null; }
  }
  function canMove() { return V && !V.playing && !V.over && !V.qte && !(V.B.queue && V.B.queue.length) && !(V.B.place && !V.placed && V.B.round === 1 && !V.B.habit.length); }
  function move(id, uid) {
    if (!canMove()) return;
    closeSheet();
    const B = V.B;
    if (id === "spare") return C.spare(uid);
    if (id === "pull") return C.pull(uid);
    const ab = K.ABILITIES[id];
    ensureTarget();
    const tgt = ab && ab.target === "enemy" ? V.target : null;
    if (!C.act(id, tgt)) toast(K.tr("Not ready yet"));
    void B;
  }
  function aid(k) {
    if (!canMove()) { toast(K.tr("Not now")); return; } // the foes' turn, or the read: Aid waits for your move (a tap is never lost silently)
    closeSheet();
    ensureTarget();
    if (k === "herbs") { if (!C.act("herbs", B0().units[0].uid)) toast(K.tr((K.S.items.herbs || 0) > 0 ? "Not now" : "No herbs left")); return; }
    if (k === "call") { if (!C.act("call", null)) toast(K.tr("Used this battle")); return; }
    const row = C.available().find((a) => a.id === k);
    if (!row || row.why) return;
    // A divine weapon: its mantra traced first (ui/fx.js U.mantra). Traced, it is loosed; broken, nothing happens, no use
    // is spent, and it waits a turn (C.astraFizzle); Escape lets it go.
    if (K.isAstra(k) && U.mantra) {
      if (V.tracing) return;
      V.tracing = true;
      U.mantra(k, { free: K.astraChampion(V.B.units) }, (ok, cancel) => {
        if (!V) return;
        V.tracing = false;
        if (cancel || !canMove()) return;
        if (ok) C.act(k, row.target === "enemy" ? V.target : null); else C.astraFizzle(k);
      });
      return;
    }
    C.act(k, row.target === "enemy" ? V.target : null);
  }
  const B0 = () => V.B;
  function choosePlace(k) {
    const B = V.B;
    if (!B.place) return;
    if (B.place !== k) C.setPlace(k);
    V.placed = true;
    nameTags([B.units[0].uid]);
    changed();
  }
  // Later in the fight, from the Company menu: a new place costs the round.
  function movePlace(k) {
    const B = V.B;
    if (!B.place || B.place === k || !canMove()) return;
    closeSheet();
    C.setPlace(k);
  }

  // ---------- Playing out what happened ----------
  function changed() {
    if (!V) return;
    const B = V.B;
    if (C.state() === B) C.foesPending();
    if (!V.playing) pump();
  }
  // Events are played in groups: a move and the blows or heals it brought; then the next.
  function pump() {
    if (!V) return;
    if (!V.ev.length) { V.playing = false; return idle(); }
    V.playing = true; cards();
    let j = 1; while (j < V.ev.length && V.ev[j].k !== "act") j++;
    const group = V.ev.splice(0, j);
    const ms = play(group);
    setTimeout(() => { if (V) pump(); }, U.motion() ? ms : 60);
  }
  function play(group) {
    const B = V.B, head = group[0], rest = head.k === "act" ? group.slice(1) : group;
    const hits = rest.filter((e) => e.k === "hit"), heals = rest.filter((e) => e.k === "heal");
    let ms = 260;
    if (head.k === "act") {
      const actor = firstFig(head.uid), id = head.id;
      if (id === "astra" || (K.ABILITIES[id] && K.ABILITIES[id].group === "astra")) {
        const o = B.astraOut || {}; B.astraOut = null;
        if (U.astraFx) U.astraFx({ kind: o.kind || "generic", clash: !!o.clash, from: actor && actor.svg, to: o.uid && firstFig(o.uid) ? firstFig(o.uid).svg : null });
        // The impact on the line (item 16, as in real time): a white-hot flash, a ring that runs out over the ground, and
        // scorch at the feet of the struck that lingers; quieter under Calm motion.
        if (!U.calm()) setTimeout(() => {
          if (!V) return;
          const tf = o.uid && firstFig(o.uid), sr = V.stage.getBoundingClientRect(), tr = tf && tf.el ? tf.el.getBoundingClientRect() : null;
          const x = tr ? tr.left + tr.width / 2 - sr.left : sr.width * 0.7, y = tr ? tr.bottom - sr.top : sr.height * 0.75;
          const imp = U.el('<div class="wd-impact k-' + (o.kind || "generic") + '" aria-hidden="true" style="left:' + x + "px;top:" + y + 'px"><i class="ring"></i><i class="ring r2"></i></div>');
          const white = U.el('<div class="wd-white" aria-hidden="true"></div>');
          V.stage.appendChild(white); V.stage.appendChild(imp);
          hits.forEach((h) => { const f = firstFig(h.on), r = f && f.el ? f.el.getBoundingClientRect() : null; if (!r) return; V.stage.appendChild(U.el('<i class="wd-scorch" aria-hidden="true" style="left:' + (r.left + r.width / 2 - sr.left) + "px;top:" + (r.bottom - sr.top) + 'px"></i>')); });
          setTimeout(() => { white.remove(); imp.remove(); }, 1400);
          setTimeout(() => { if (V) V.stage.querySelectorAll(".wd-scorch").forEach((e) => e.remove()); }, 7000);
        }, 600);
        V.stage.classList.remove("bigshake"); void V.stage.offsetWidth; V.stage.classList.add("bigshake");
        setTimeout(() => { if (V) land(hits, heals); }, 900); return 1800;
      }
      ms = animate(actor, id, hits, heals);
    } else land(hits, heals);
    return ms;
  }
  // One move on its figure; the blows land at the moment of contact.
  function animate(a, id, hits, heals) {
    const now = (fn, t) => setTimeout(() => { if (V) fn(); }, t);
    if (!a || a.dead) { land(hits, heals); return 300; }
    const enemy = a.side === "foe";
    // A blow marked on your company: up go their shields as it comes (a shield wall is already up).
    hits.forEach((h) => { if (h.sh === "raised") figsOf({ uid: h.on }).forEach((f) => { if (!f.dead) pose(f, "guard", 900, 0.55); }); });
    if (id === "wall") {
      figsFriends().forEach((f) => pose(f, "guard", 900, 0.55));
      now(() => place(), 120);
      sparkle(figsFriends(), 4);
      toast(K.tr("Shield wall: every blow this round is halved."));
      return 700;
    }
    if (id === "guard" || id === "brace" || id === "formation" || id === "steady") { pose(a, "guard", 900, 0.55); if (id === "guard" || id === "brace") U.guardFlash(a.svg, 1300); home(a, 1200); land(hits, heals); return 500; }
    if (["herbs", "salve", "hymn"].includes(id)) { pose(a, "kneel", 600, 0.6); home(a, 900); now(() => land(hits, heals), 380); return 900; }
    if (["rally_line", "song", "rally", "roar", "command", "expose", "verse", "feint", "vanish", "swerve", "call"].includes(id)) {
      pose(a, id === "command" || id === "verse" ? "speak" : "cheer", 700, 0.5); home(a, 800);
      if (id === "rally_line") figsFriends().forEach((f) => { if (f !== a) { pose(f, "cheer", 700, 0.5); home(f, 800); } });
      now(() => land(hits, heals), 300); return 800;
    }
    const tgts = hits.map((h) => firstFig(h.on)).filter(Boolean);
    const ranged = a.bow || SHOTS.has(id);
    if (ranged && tgts.length) {
      pose(a, id === "volley" ? "drawUp" : "draw", 900, 0.65);
      now(() => {
        pose(a, id === "volley" ? "looseUp" : "loose", 1300, 0.45); home(a, 520);
        const from = bowPoint(a);
        const list = id === "volley" || id === "arrows" ? tgts : tgts.slice(0, 1);
        list.forEach((t, k) => {
          const to = chest(t), dist = Math.abs(to.x - from.x);
          setTimeout(() => {
            if (!V) return;
            if (t.dead) { land(hits.filter((h) => h.on === t.u.uid), []); return; } // already down (an earlier arrow beat you): no arrow flies at the spot where he stood
            U.flyArrow(V.world, from, to, Math.min(30, dist * 0.08), clamp(dist * 0.9, 160, 420), false, Math.max(22, a.fh * 0.28), { from: a.u.uid, to: t.u.uid, kind: id }).then(() => { if (V) land(hits.filter((h) => h.on === t.u.uid), []); });
          }, k * 80);
        });
        const rest = hits.filter((h) => !list.some((t) => t.u.uid === h.on)); if (rest.length) setTimeout(() => { if (V) land(rest, heals); }, 450); else if (heals.length) land([], heals);
      }, id === "aimed" ? 480 : 220);
      return id === "aimed" ? 1250 : 950;
    }
    // A blow: wind-up, a step in, contact. Across the gap the swing ends with the weapon's tip on the one struck (on his
    // shield, or crossing his weapon, when he blocks), measured on the live figures (U.aimBlow / U.blowImpact, puppet-anim.js).
    // A mace (owner, 4 November: heavy and slow): an overhead smash and a side sweep in turn (U.MACE_ARCS), each wound up longer.
    // Every weapon its own blow (U.arcFor: a sword cuts and thrusts, a spear thrusts, a dagger stabs, a club comes down overhead).
    const item = a.spec && a.spec.item, arc = U.arcFor && item ? U.arcFor(item, a.arcN = (a.arcN || 0) + 1) : null, A = arc ? U.ARCS[arc] : null, slow = arc && U.MACE_ARCS[arc] && item === "mace" ? 160 : 0;
    pose(a, A ? A.up : "windup", slow ? 520 : 600, 0.7);
    const h0 = hits.find((h) => !(h.def === "dodge" || (h.n === 0 && !h.sh))), t0 = h0 && firstFig(h0.on);
    const guard = h0 && t0 ? (h0.sh && t0.svg.querySelector(".it-s") ? "shield" : h0.def === "block" || h0.def === "counter" ? (t0.svg.querySelector(".it-s") ? "shield" : "weapon") : null) : null;
    let aim = null;
    now(() => {
      if (guard && t0) pose(t0, "guard", 1400, 0.55);
      aim = a.rig && t0 && !t0.dead ? U.aimBlow(a.rig, t0.svg, { guard, k: slow ? 1600 : 1900, z: 0.5, maxLunge: 1e4, pose: A ? A.end : undefined, at: A ? A.at : undefined, under: A && A.under != null ? A.under : undefined, straight: A && A.straight }) : null; // across the gap: the step in is as long as it must be
      if (!aim) { pose(a, A ? (U.MACE_ARCS[arc] ? "sweep" : A.end) : "strike", 1900, 0.5); /* a mace blow that finds no one: level */ a.dx = (enemy ? -1 : 1) * 0.035; pos(a); }
    }, 140 + slow);
    now(() => {
      const res = aim ? U.blowImpact(aim) : null, sr = V.stage.getBoundingClientRect();
      if (res) (V.impacts = V.impacts || []).push({ by: a.u.uid, on: t0.u.uid, res, guard });
      land(hits, heals, res && t0 ? { uid: t0.u.uid, x: res.x - sr.left, y: res.y - sr.top, on: res.on } : null);
    }, 235 + slow);
    now(() => { a.dx = 0; if (a.rig) { a.rig.t.dx = 0; a.rig.t.dy = 0; } pos(a); home(a, 0); }, 420 + slow * 1.6);
    return 720 + slow * 1.6;
  }
  // Blows land: the struck flash and are knocked, the number rises; a shield turns it in sparks; the fallen fall.
  function land(hits, heals, at) {
    const B = V.B;
    for (const h of hits) {
      const u = B.units.find((x) => x.uid === h.on); if (!u) continue;
      const f = firstFig(h.on); if (!f) continue;
      V.hp[h.on] = Math.max(0, (V.hp[h.on] != null ? V.hp[h.on] : u.hp) - h.n);
      if (h.def === "dodge" || (h.n === 0 && !h.sh)) { pop(f, K.tr("Missed"), "miss"); if (isP(u)) { pose(f, "duck", 600, 0.6); home(f, 500); } continue; }
      if (h.def === "block" || h.def === "counter") { pose(f, "guard", 800, 0.55); home(f, 700); }
      const pt = at && at.uid === h.on ? at : null; at = pt ? null : at; // the point of contact, for the first one struck
      if (pt) impact(pt, f); else if (h.sh) spark(f);
      if (h.sh && h.sh !== "glance" && !isP(u)) { pose(f, "guard", 900, 0.55); home(f, 900); }
      f.el.classList.add("hit"); setTimeout(() => f.el.classList.remove("hit"), 90);
      if (f.rig) f.rig.kick(f.side === "foe" ? { rot: 220, head: 180 } : { rot: -240, head: -200, armF: 140 });
      pop(f, String(h.n) + (h.sh ? " ⛉" : ""), f.side === "foe" ? "" : "me");
      if (U.rigFreeze) U.rigFreeze(h.heavy ? 70 : 45);
      if (h.heavy || isP(u)) shake();
      if (h.heavy && f.name) nameTag(f, 1.2);
      if (K.Sound) K.Sound.play(h.sh ? "clang" : "hit");
      falls(u);
      pos(f);
    }
    for (const h of heals) {
      const u = B.units.find((x) => x.uid === h.on); if (!u) continue;
      V.hp[h.on] = Math.min(u.maxHp, (V.hp[h.on] != null ? V.hp[h.on] : u.hp) + h.n);
      const f = firstFig(h.on); if (f) { pop(f, "+" + h.n, "heal"); pos(f); }
      if (K.Sound) K.Sound.play("heal");
    }
  }
  // As a unit's health falls, its bodies fall (a band, one by one).
  function falls(u) {
    const standing = figsOf(u).filter((f) => !f.dead), alive = aliveBodies(u);
    while (standing.length > alive) {
      const f = standing.pop();
      if (isP(f.u) && K.loseLived(V.B.enc.id)) { // beaten but alive (owner, 4 November): you slump where you stand
        f.dead = true; f.el.classList.add("slumped"); if (f.tag) f.tag.classList.remove("on");
        if (f.rig) f.rig.set("defeated", 260, 0.62); else pose(f, "kneel");
        continue;
      }
      f.dead = true; f.el.classList.add("dead"); f.el.style.zIndex = "4"; if (f.tag) f.tag.classList.remove("on");
      if (f.rig) f.rig.fallDown(-86, f.side === "foe" ? -1 : 1); else pose(f, "fall");
      dropWeapon(f);
      if (f.tap) f.tap.hidden = true; if (f.chip) f.chip.hidden = true;
      if (K.Sound && u.person && u.side === "ally") K.Sound.play("friendFalls");
    }
  }
  function dropWeapon(f) {
    const item = f.svg.querySelector(".pp-body .it:not(.it-tmp)"), kind = f.spec && f.spec.item, w0 = WEAPON[kind] || (kind ? WEAPON.sword : null);
    if (f.rig || !item || !w0 || f.dropped) return; // a live figure drops its own (puppet-anim's letGo)
    item.style.visibility = "hidden"; f.dropped = true;
    const w = document.createElement("div"); w.className = "dropped"; w.innerHTML = w0;
    const len = f.fh * (kind === "spear" ? 0.62 : 0.42), side = f.side === "friend" ? 1 : -1;
    Object.assign(w.style, { left: (f.x - side * f.bw * 0.15 - len / 2) + "px", bottom: (f.gy - 2) + "px", width: len + "px", transform: "rotate(" + side * 7 + "deg)" });
    V.world.appendChild(w);
  }
  const figsFriends = () => [...V.figs.values()].filter((f) => f.side === "friend" && !f.dead);
  function pose(f, p, k, z) { if (!f) return; if (f.rig) f.rig.set(p, k || 900, z == null ? 0.5 : z); else f.svg.setAttribute("class", f.svg.getAttribute("class").replace(/\bpose-\S+/, "pose-" + ({ windup: "strike", ready: "brace", bowready: "brace", draw: "aim", drawUp: "aim", looseUp: "loose", guard: "block", fall: "dead" }[p] || p))); }
  function home(f, ms) { setTimeout(() => { if (!V || !f || f.dead) return; if (f.walled) return; if (f.mercy) return pose(f, "kneel", 600, 0.6); if (f.rig) f.rig.set(f.base, 520, 0.42); else pose(f, isP(f.u) ? "brace" : "stand"); }, ms || 0); }
  function pop(f, text, cls) {
    const el = document.createElement("span"); el.className = "pop " + (cls || ""); el.textContent = text;
    el.style.left = f.x + "px"; el.style.bottom = (f.gy + f.fh * 1.08) + "px"; V.world.appendChild(el);
    if (U.calm() || !el.animate) { setTimeout(() => el.remove(), 700); return; }
    el.animate([{ transform: "translate(-50%,4px)", opacity: 0 }, { transform: "translate(-50%,-4px)", opacity: 1, offset: 0.15 }, { transform: "translate(-50%,-38px)", opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = () => el.remove();
  }
  // Where a blow lands: a burst and flakes on the body; on a shield or a crossing weapon a cold flash and sparks.
  function impact(pt, f) {
    const clash = pt.on !== "body", fl = document.createElement("i");
    fl.className = "impact" + (clash ? " clash" : ""); fl.style.left = pt.x + "px"; fl.style.top = pt.y + "px";
    V.world.appendChild(fl); setTimeout(() => fl.remove(), 320);
    if (U.flingBits) { if (clash) U.flingBits(V.world, "spark", pt, 10, 12, null, true); else U.flingBits(V.world, "flake", pt, 6, Math.max(8, f.bw * 0.2), "#8a3a2a"); }
  }
  // A blow on a shield: sparks fly from it.
  function spark(f) {
    const sr = V.stage.getBoundingClientRect(), s = f.svg.querySelector(".it-s") || f.svg.querySelector(".pp-body");
    const r = s.getBoundingClientRect();
    if (U.flingBits) U.flingBits(V.world, "spark", { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top }, 9, 16, null, true);
  }
  function sparkle(list, n) { list.forEach((f, i) => setTimeout(() => { if (V && f.svg.querySelector(".it-s")) spark(f); }, i * 70 + (n || 0))); }
  function shake() { if (U.calm()) return; V.stage.classList.remove("shake"); void V.stage.offsetWidth; V.stage.classList.add("shake"); }
  // Up long enough to read, and the goal line set just below it while both are up (as ui/realtime.js toast; the full check, 10 November).
  function toast(s) {
    const el = $(".toast", V.stage); if (!el) return;
    const hold = Math.min(6000, Math.max(1700, String(s).length * 45)), at = V;
    el.textContent = s; el.classList.remove("off"); clearTimeout(V.toastT);
    V.toastT = setTimeout(() => { el.classList.add("off"); if (V === at) clearOfToast(); }, hold);
    clearOfToast();
  }
  function clearOfToast() {
    const l = $(".wd-fbline", V.stage), t = $(".toast", V.stage); if (!l) return;
    l.style.top = "";
    if (!t || t.classList.contains("off")) return;
    const below = t.offsetTop + t.offsetHeight + 6;
    if (l.offsetTop < below && l.offsetTop + l.offsetHeight > t.offsetTop) l.style.top = below + "px";
  }
  function banner(s) { const el = $(".banner", V.stage); if (!el) return; el.textContent = s; el.classList.remove("off"); clearTimeout(V.banT); V.banT = setTimeout(() => el.classList.add("off"), 1900); }
  function nameTag(f, s) {
    if (!f || !f.name || f.dead) return;
    let t = f.tag; // on a layer over every figure (.tags): no figure in front hides it
    if (!t) { t = f.tag = document.createElement("span"); t.className = "nametag"; t.textContent = f.name; V.tags.appendChild(t); }
    t.style.bottom = (f.gy + f.fh * 0.4) + "px"; t.style.left = (f.x - f.face * f.fh * 0.05) + "px"; // the waist, nudged to the back hand, off the shield
    t.classList.add("on"); clearTimeout(t.off); t.off = setTimeout(() => t.classList.remove("on"), (s || 2) * 1000);
  }
  function nameTags(uids) { if (!V) return; V.figs.forEach((f) => { if (!uids || uids.includes(f.u.uid)) nameTag(f, 2); }); }
  function bowPoint(f) {
    const sr = V.stage.getBoundingClientRect(), bow = f.svg.querySelector(".it:not(.it-w)") || f.svg.querySelector(".foreF") || f.svg;
    const r = bow.getBoundingClientRect();
    return { x: r.left + r.width / 2 - sr.left, y: r.top + r.height / 2 - sr.top };
  }
  function chest(f) { const r = bodyRect(f); return { x: r.l + r.w / 2, y: r.t + r.h * 0.38 }; }

  // ---------- Between the moves: the foes' turns, the timed read, a new round, the end ----------
  function idle() {
    if (!V) return;
    const B = V.B;
    if (B.clashPending && !V.clashing && !B.over) { // your order has played: now the clash
      V.clashing = true; V.el.style.visibility = "hidden"; V.el.id = "rt-war"; // both screens are #rt: the war day steps aside while the clash has the stage
      // The foes strike at 0.8 of their weight in the clash, as in the storms: at full weight a player of middling
      // reflexes fell on the first day of the war three times in four (life test and clash simulation, 6 November).
      setTimeout(() => U.startClash(B, { secs: 15, atk: 0.8 }, (why) => {
        if (!V) return;
        V.el.id = "rt"; V.el.style.visibility = ""; V.clashing = false; document.body.classList.add("in-rt", "intest");
        C.clashDone();
        B.units.forEach((u) => { V.hp[u.uid] = u.hp; });
        V.figs.forEach((f) => { if (f.u.hp <= 0 && !f.dead) { f.dead = true; f.el.classList.add("dead"); } });
        toast(why === "cleared" ? K.tr("The pack is broken.") : why === "fallback" ? K.tr("You fall back. New orders.") : why === "time" ? K.tr("The clash ends. New orders.") : "");
        changed();
      }), 350);
      return;
    }
    // New faces (a friend come at your call, the next pack), and those who have gone.
    const before = V.figs.size;
    cast(); if (V.figs.size !== before) { V.figs.forEach((f) => size(f)); }
    ensureTarget();
    // The next pack: a banner, its foes walk in from the right; a champion among them, a moment.
    if ((B.packNow || 0) !== V.packSeen) {
      V.packSeen = B.packNow || 0;
      banner(T("Another pack · {a} of {b}", { a: V.packSeen + 1, b: B.packs }));
      V.figs.forEach((f) => { if (f.side === "foe" && !f.dead && !f.entered && B.units.find((u) => u.uid === f.u.uid && u.pack === V.packSeen)) { f.entered = true; f.dx = 0.45; pos(f); f.el.style.transition = "left 0.9s cubic-bezier(.3,.7,.3,1)"; setTimeout(() => { if (!V) return; f.dx = 0; pos(f); setTimeout(() => { if (f.el) f.el.style.transition = ""; if (V) place(); }, 950); }, 30); } });
      setTimeout(() => champion(), 1000);
    }
    // Lines of the story (a field event, a friend's arrival) as a toast.
    while (V.logAt < B.log.length) { const e = B.log[V.logAt++]; if (e && (e.raw || e.ev)) toast(C.line(e)); if (e && e.ev && U.fieldFx) U.fieldFx(V.stage, e.key); } // (row 38: drawn on the field too)
    B.units.forEach((u) => { V.hp[u.uid] = u.hp; });
    // Life below a fifth (owner, 6 November: first a tenth, then 20%; K.LOW_LIFE): the edges of the
    // field pulse red, a heartbeat, and a line says what you can do (in the clash the real-time screen says it).
    { const p = B.units[0], low = p.hp > 0 && p.hp < p.maxHp * (K.LOW_LIFE || 0.2), w = $(".lowwarn", V.stage);
      if (low !== !!V.low) {
        V.low = low; V.el.classList.toggle("lowlife", low);
        if (w) { if (low) w.querySelector("span").textContent = T((K.S.items.herbs || 0) > 0 ? "Use your herbs." : p.abilities.includes("wall") ? "Raise the shield wall." : "Guard, and hold on."); w.hidden = !low; }
        if (low && K.Sound) K.Sound.play("heartbeat");
      } }
    V.figs.forEach((f) => { if (!f.dead && aliveBodies(f.u) === 0) falls(f.u); });
    // A foe kneeling and asking for mercy (C.pleads): "Mercy!" and the Spare hint over him (a tap spares him); spared, he kneels on.
    V.figs.forEach((f) => {
      if (f.side !== "foe" || f.dead) return;
      const u = f.u, st = u.spared ? "spared" : C.pleads(u) ? "ask" : "";
      if (st !== (f.mercy || "")) { f.mercy = st; f.el.classList.toggle("beaten", !!st); f.el.classList.toggle("spared", st === "spared"); if (st) pose(f, "kneel", 600, 0.6); else home(f, 0); }
      U.pleaTag(f.el, st, () => move("spare", u.uid));
    });
    // The shield wall stays up for the round.
    const walled = B.units.some((u) => u.side !== "enemy" && u.status.wall && u.hp > 0);
    figsFriends().forEach((f) => { if (walled && !f.walled) { f.walled = true; pose(f, "guard", 700, 0.6); } else if (!walled && f.walled) { f.walled = false; home(f, 0); } });
    place(); cards();
    if (B.over) return end();
    if (B.queue && B.queue.length) return foeTurn();
  }
  function foeTurn() {
    const B = V.B, n = C.nextFoe();
    if (!n) { cards(); return; }
    if (!n.threat) { clearTimeout(V.autoT); V.autoT = setTimeout(() => { if (V && C.state() === B && !B.over) C.resolve(null); }, U.motion() ? 260 : 80); return; }
    read(n.u, n.threat);
  }
  // The timed read (the turn-based moment stays): the foe winds up; Jump, Duck, Sidestep or Block as the ring meets the mark.
  const SHAPES = {
    low: { need: "jump", line: "A low sweep at your legs", arrow: "An arrow, low, at your legs" },
    high: { need: "duck", line: "A swing at your head", arrow: "An arrow at your head" },
    thrust: { need: "side", line: "A straight thrust", arrow: "An arrow at your chest" },
    charge: { need: "side", line: "A charge, head down", arrow: "An arrow at your chest" }
  };
  const shapeFor = (id) => K.pick({ arrows: ["low", "high"], strike: ["high", "thrust", "low"], heavy: ["high", "charge"], disarm: ["thrust"], breaker: ["charge"] }[id] || ["high", "thrust"]);
  function read(u, th) {
    const B = V.B, g = K.attr("grace");
    const Tm = 1.1 * th.speed, END = Tm * 1.32;
    const Wn = { perfect: 0.065 + g * 0.004, move: 0.17 + g * 0.009, block: 0.2 + g * 0.01 };
    // The line and the wind-up follow the weapon he is drawn holding (as RT.weaponOf does in real time): a bowman's every blow
    // comes as an arrow, and one drawn with a blade, a spear or a mace never shoots. (shapeFor's draw is kept as it was, so the
    // random stream and the outcomes do not change.)
    const shape = shapeFor(th.id), S2 = SHAPES[shape];
    const efig = firstFig(u.uid), spec = efig ? efig.spec : specFor(u), bowman = !!((efig && efig.bow) || (spec && spec.item === "bow"));
    const what = bowman ? S2.arrow : S2.line;
    const box = $(".wd-read");
    box.innerHTML = '<p class="rd-who"><b>' + esc(K.text(u.src || u.name)) + "</b> · " + esc(T(what)) + '</p><div class="rd-row"><span class="rd-ring"><i class="mark"></i><i class="ring"></i></span>' +
      [["Jump ↑", "jump"], ["Duck ↓", "duck"], ["Sidestep ↔", "side"], ["Block", "block"]].map(([l, m]) => '<button type="button" data-rd="' + m + '">' + esc(T(l)) + "</button>").join("") + '</div><p class="rd-note" aria-live="assertive"></p>';
    const ring = box.querySelector(".ring"), note = box.querySelector(".rd-note");
    const ef = firstFig(u.uid), me = firstFig(B.units[0].uid);
    if (ef) { pose(ef, bowman ? "draw" : "windup", 700, 0.6); ef.el.classList.add("windup"); }
    let t0 = 0, raf = 0, done = false;
    const LINES = { counter: "A perfect read! You strike back.", block: "Blocked.", dodge: "Clear!", graze: "Late: it grazes you.", early: "Too early.", late: "Too late.", wrong: "The wrong way!" };
    const finish = (result, line, mv) => {
      if (done) return; done = true; cancelAnimationFrame(raf); off();
      note.textContent = K.tr(LINES[line || result] || "");
      box.classList.add(result === "miss" ? "bad" : "good");
      if (me && mv) { if (mv === "jump") pose(me, "jump", 760, 0.5); else if (mv === "duck") pose(me, "duck", 760, 0.5); else if (mv === "side") pose(me, "side", 760, 0.5); else pose(me, "guard", 700, 0.55); home(me, 700); }
      if (ef) ef.el.classList.remove("windup");
      if (K.Sound) K.Sound.play(result === "miss" ? "hit" : result === "dodge" ? "tap" : "clang");
      setTimeout(() => { if (!V) return; V.qte = null; box.classList.remove("good", "bad"); box.innerHTML = ""; cards(); C.resolve(result); }, U.motion() ? 420 : 120);
    };
    const now = () => (U.clock() - t0) / 1000;
    const act = (mv) => {
      if (done || !t0) return;
      const d = now() - Tm, a = Math.abs(d);
      if (mv === "block") { if (a <= Wn.perfect) finish("counter", null, mv); else if (a <= Wn.block) finish("block", null, mv); else finish("miss", d < 0 ? "early" : "late", mv); return; }
      if (mv !== S2.need) return finish("miss", "wrong", mv);
      if (a <= Wn.perfect) finish("counter", null, mv); else if (a <= Wn.move) finish("dodge", null, mv); else if (d > 0 && a <= Wn.move * 1.8) finish("block", "graze", mv); else finish("miss", d < 0 ? "early" : "late", mv);
    };
    box.querySelectorAll("[data-rd]").forEach((b) => b.addEventListener("pointerdown", (e) => { e.preventDefault(); act(b.dataset.rd); }));
    box.querySelectorAll("[data-rd]").forEach((b) => b.addEventListener("click", (e) => { if (e.detail === 0) act(b.dataset.rd); }));
    const onKey = (e) => {
      if (e.repeat) return;
      const m = { ArrowUp: "jump", w: "jump", W: "jump", ArrowDown: "duck", s: "duck", S: "duck", ArrowLeft: "side", ArrowRight: "side", a: "side", A: "side", d: "side", D: "side", Shift: "side", " ": "block", Enter: "block", b: "block", B: "block" }[e.key];
      if (m) { e.preventDefault(); e.stopPropagation(); act(m); }
    };
    let sw = null;
    const pd = (e) => { if (e.target.closest("button")) return; sw = { x: e.clientX, y: e.clientY }; };
    const pu = (e) => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return; act(Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? "jump" : "duck") : "side"); };
    document.addEventListener("keydown", onKey, true); document.addEventListener("pointerdown", pd, true); document.addEventListener("pointerup", pu, true);
    const off = () => { document.removeEventListener("keydown", onKey, true); document.removeEventListener("pointerdown", pd, true); document.removeEventListener("pointerup", pu, true); };
    const tick = () => {
      if (done || !V) return;
      const s = now(), p = Math.min(1, s / Tm);
      ring.style.transform = "translate(-50%, -50%) scale(" + Math.max(0.12, 1 - p * 0.7 - Math.max(0, s - Tm) * 0.6) + ")";
      if (s >= END) return finish("miss", "late");
      raf = requestAnimationFrame(tick);
    };
    V.qte = { stop() { done = true; cancelAnimationFrame(raf); off(); } };
    cards();
    setTimeout(() => { if (done || !V) return; t0 = U.clock(); raf = requestAnimationFrame(tick); const b = box.querySelector('[data-rd="block"]'); if (b) b.focus({ preventScroll: true }); }, U.motion() ? 380 : 50);
  }
  // A champion comes on: a white flash, the edges darken, his name, and your line raises its shields.
  function champion() {
    if (!V) return;
    if (document.querySelector(".fbrief-wrap, .ftour")) { setTimeout(champion, 700); return; } // after the rules card and the tour, not under them (item 22)
    const B = V.B, h = B.units.find((u) => u.side === "enemy" && (u.hero || u.person) && !u.away && u.hp > 0 && !V.champSeen.has(u.uid));
    if (!h) return;
    if (K.Sound) K.Sound.play("drumCall");
    V.champSeen.add(h.uid);
    const c = $(".wd-champ", V.stage); if (!c) return;
    const trait = K.RT && K.RT.traitLine ? K.RT.traitLine(h) : null; // his trait (stage 2), under the line
    c.innerHTML = "<b>" + esc(K.text(h.src || h.name).split(",")[0]) + "</b><small>" + esc(T("A champion comes at the line")) + "</small>" + (trait ? "<em>" + esc(T(trait)) + "</em>" : "");
    V.stage.classList.remove("champ"); void V.stage.offsetWidth; V.stage.classList.add("champ");
    figsFriends().forEach((f, i) => setTimeout(() => { if (!V) return; pose(f, "guard", 800, 0.55); home(f, 1300); }, 120 + i * 60));
    sparkle(figsFriends(), 200);
    const f = firstFig(h.uid); if (f) nameTag(f, 2.4);
    setTimeout(() => { if (V) V.stage.classList.remove("champ"); }, U.calm() ? 900 : 2200);
  }
  function end() {
    const B = V.B; if (V.over) return; V.over = true;
    closeSheet(); cards(); place();
    if (U.stopDrums) U.stopDrums();
    const enc = B.enc;
    // The dream does not end on a card: the field goes white, and you wake (scene.js U.wakeScene opens on its own white).
    if (enc.dream && U.motion()) {
      const veil = U.el('<div class="dream-white" aria-hidden="true"></div>');
      document.body.appendChild(veil);
      requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add("on")));
      setTimeout(() => { if (!V) { veil.remove(); return; } const cb = V.onEnd, done = C.end(); stop(); document.body.classList.remove("intest"); if (cb) cb(done ? done.over : B.over); setTimeout(() => veil.remove(), 400); }, 1300);
      return;
    }
    if (B.over === "flee") { const f = firstFig(B.units[0].uid); if (f && f.rig) { f.face = -f.face; f.el.classList.toggle("face-l", f.face < 0); } }
    const lived = B.over === "lose" && K.loseLived(enc.id); // beaten but alive: the foes leave, and what is written held
    const msg = lived ? "You fought with all you had. What is written was not yours to stop." : { win: K.val(enc.winLine) || "The fight is won.", lose: K.val(enc.loseLine) || (enc.lethal && !K.S.storyMode ? "You have fallen." : "You are beaten."), flee: "You leave the fight behind.", spare: "You let them live." }[B.over];
    if (K.Sound && B.over === "lose" && enc.lethal && !K.S.storyMode) K.Sound.play("fall");
    if (K.Sound && B.over === "win") setTimeout(() => K.Sound && K.Sound.play("gong"), 300);
    const card = U.el('<div class="endcard" role="dialog"><div class="in"><h2>' + esc(T(B.over === "win" ? "The day is held" : B.over === "lose" ? "You are beaten" : B.over === "spare" ? "Spared" : "Withdrawn")) + "</h2><p>" + U.t(msg) + '</p><button type="button" class="go">' + esc(T("Continue")) + "</button></div></div>");
    const go = () => { if (!V) return; const cb = V.onEnd, done = C.end(); stop(); if (cb) cb(done ? done.over : B.over); };
    card.querySelector("button").addEventListener("click", go);
    const show = () => { if (!V) return; V.stage.appendChild(card); card.querySelector("button").focus({ preventScroll: true }); };
    if (lived) leaveField(show); else setTimeout(show, U.motion() ? 900 : 100);
  }
  // The foes still standing turn and walk off the field (owner, 4 November), then the card.
  function leaveField(then) {
    const me = V.figs.size ? [...V.figs.values()].find((f) => isP(f.u)) : null;
    if (me && !me.el.classList.contains("slumped")) { me.el.classList.add("slumped"); if (me.rig) me.rig.set("defeated", 260, 0.62); else pose(me, "kneel"); }
    const calm = !U.motion() || U.calm(), walk = calm ? 0 : 2200, sw = V.stage.getBoundingClientRect().width;
    const foes = [...V.figs.values()].filter((f) => f.side === "foe" && !f.dead);
    if (!foes.length || calm) { foes.forEach((f) => { f.el.style.visibility = "hidden"; }); setTimeout(then, calm ? 150 : 400); return; }
    foes.forEach((f, i) => {
      if (f.tap) f.tap.hidden = true; if (f.chip) f.chip.hidden = true; if (f.tag) f.tag.classList.remove("on");
      f.el.classList.remove("windup"); f.face = 1; f.el.classList.toggle("face-l", false);
      const anim = f.el.animate([{ transform: "translateX(0)" }, { transform: "translateX(" + Math.round(sw * 0.75) + "px)" }], { duration: walk, delay: i * 120, easing: "linear", fill: "forwards" });
      let ph = 0; const t = setInterval(() => { if (!V || !f.rig) return clearInterval(t); ph ^= 1; f.rig.set(ph ? "stepA" : "stepB", 700, 0.5); }, 230);
      anim.onfinish = () => { clearInterval(t); f.el.style.visibility = "hidden"; };
    });
    setTimeout(then, walk + 300);
  }

  // ---------- Company ▾ and Aid ▾ ----------
  function toggleSheet(kind) { if (V.sheet === kind) return closeSheet(); sheet(kind); }
  function sheet(kind) {
    const B = V.B; closeSheet();
    if (V.over) return;
    V.sheet = kind;
    if (kind === "company") {
      const el = $(".company-sheet"), order = B.order || "line", free = B.round === 1 && !B.habit.length;
      const breaks = C.canFlee() ? C.fleeBreaks() : [];
      el.innerHTML = '<div class="crow"><h3>' + esc(T("Orders")) + '</h3><div class="chips four">' +
        Object.keys(ORDERS).map((o) => '<button type="button" data-ord="' + o + '" aria-pressed="' + (o === order) + '">' + esc(T(ORDERS[o][0])) + "</button>").join("") + "</div></div>" +
        '<p class="desc1">' + esc(T(ORDERS[order][1])) + "</p>" +
        (B.place ? '<div class="crow"><h3>' + esc(T("Your place")) + '</h3><div class="chips three">' + PLACES.map((k) => '<button type="button" data-splace="' + k + '" aria-pressed="' + (k === B.place) + '"><b>' + esc(T(PLACE[k][0])) + "</b><small>" + esc(T(k === B.place ? "You are here" : free ? "free now" : "costs this round")) + "</small></button>").join("") + "</div></div>" : "") +
        (C.canFlee() ? '<div class="wdline wd-main"><button type="button" class="textbtn" data-wd="ask">' + esc(T("Withdraw")) + "</button>" + (breaks.length ? '<span class="note1">' + esc(T("breaks your vow never to retreat")) + "</span>" : "") + "</div>" +
          '<div class="wdline wd-confirm" hidden><span class="note1">' + esc(T("Are you sure? It breaks your vow.")) + '</span><button type="button" class="textbtn" data-wd="yes">' + esc(T("Yes, withdraw")) + '</button><button type="button" class="textbtn stay" data-wd="stay">' + esc(T("Stay and fight")) + "</button></div>" : "");
      el.querySelectorAll("[data-ord]").forEach((b) => b.addEventListener("click", () => { C.setOrder(b.dataset.ord); el.querySelectorAll("[data-ord]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); el.querySelector(".desc1").textContent = T(ORDERS[b.dataset.ord][1]); hud(); }));
      el.querySelectorAll("[data-splace]").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.splace; if (k === B.place) return; if (free && !V.placed) { closeSheet(); return choosePlace(k); } if (free) { closeSheet(); C.setPlace(k); return; } movePlace(k); }));
      const wd = (on) => { el.querySelector(".wd-main").hidden = on; el.querySelector(".wd-confirm").hidden = !on; };
      el.querySelectorAll("[data-wd]").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.wd; if (k === "ask" && breaks.length) return wd(true); if (k === "stay") return wd(false); closeSheet(); if (!V.playing && !V.qte) C.flee(); }));
      el.classList.add("compact"); placeDrop(el, $(".hb.wpill")); dropTimer(el);
    } else {
      const el = $(".aid-sheet"), p = B.units[0], av = C.available();
      const ast = av.filter((a) => a.id === "astra" || (K.ABILITIES[a.id] && K.ABILITIES[a.id].group === "astra")), ready = ast.filter((a) => !a.why);
      const herbs = av.find((a) => a.id === "herbs"), call = av.find((a) => a.id === "call");
      // A ready weapon's note: its uses left (three in a life), or free against a champion (abilities.js K.astraWhy).
      const anote = (a) => (K.astraChampion(B.units) ? K.tr("free against a champion") : K.tr("{n} of 3 left", { n: K.astraLeft(a.id) }));
      const it = (k, label, note, off, key) => '<button type="button" data-aid="' + k + '"' + (off ? ' disabled aria-disabled="true"' : "") + "><b>" + esc(label) + "</b><small>" + esc(note) + "</small>" + (key ? "<kbd>" + key + "</kbd>" : "") + "</button>";
      const near = call && B.enc.callHelp === undefined && K.friendsNear ? K.friendsNear(K.S, B.enc) : [];
      el.innerHTML = (herbs ? it("herbs", K.tr("Herbs"), K.tr("{n} left", { n: K.S.items.herbs || 0 }), !!herbs.why || p.hp >= p.maxHp, "H") : "") +
        (ready.length > 1 && V.astraPick ? ready.map((a) => it(a.id, a.name, anote(a), false, "")).join("") :
          it(ready.length > 1 ? "astra-pick" : ready[0] ? ready[0].id : "astra", ready[0] ? (ready.length > 1 ? K.tr("Invoke astra") : ready[0].name) : K.tr("Divine weapon"), ready[0] ? (ready.length > 1 ? K.tr("once a battle") : anote(ready[0])) : ast[0] ? K.astraShort(ast[0].why) || "" : K.tr("not given"), !ready.length, "U")) +
        (call ? it("call", K.tr("Call for help"), call.why ? K.tr("called") : near[0] === "charu" ? K.tr("Charu has no armour") : K.tr("once a fight"), !!call.why, "C") : "") +
        (!B.order && C.canFlee() ? it("withdraw", K.tr("Withdraw"), C.fleeBreaks().length ? K.tr("breaks your vow never to retreat") : K.tr("Leave the fight"), false, "") : "");
      el.querySelectorAll("[data-aid]").forEach((b) => b.addEventListener("click", () => {
        const k = b.dataset.aid;
        if (k === "astra-pick") { V.astraPick = true; return sheet("aid"); }
        if (k === "withdraw") { if (C.fleeBreaks().length && b.dataset.armed !== "1") { b.dataset.armed = "1"; b.querySelector("small").textContent = K.tr("Are you sure? It breaks your vow."); return; } closeSheet(); return C.flee(); }
        V.astraPick = false; aid(k);
      }));
      el.classList.add("compact"); placeDrop(el, $(".hb.aid")); dropTimer(el);
    }
  }
  // Phones (and wherever the move cards have the room): the menu takes exactly the move cards' place, the stage
  // untouched. Laptops: in the sky, under its button.
  function placeDrop(panel, btn) {
    if (!panel || !btn) return;
    panel.hidden = false;
    const area = $(".wctl"), ar = area.getBoundingClientRect(), wide = V.el.classList.contains("wide");
    panel.classList.remove("matched", "m-war"); panel.classList.toggle("wide", wide); panel.classList.add("below");
    if (ar.height > 20 && !(wide && ar.height < 120)) {
      panel.classList.add("matched", "m-war");
      Object.assign(panel.style, { position: "fixed", left: ar.left + "px", width: ar.width + "px", top: ar.top + "px", height: ar.height + "px", right: "auto", bottom: "auto", maxHeight: "none", minHeight: "" });
    } else {
      const sr = V.stage.getBoundingClientRect(), w = Math.min(360, sr.width * 0.32), br = btn.getBoundingClientRect();
      const hud = Math.max(br.bottom, ...$$(".hud-r .hb").map((e) => e.getBoundingClientRect().bottom));
      Object.assign(panel.style, { position: "fixed", width: w + "px", left: (br.right - w) + "px", right: "auto", top: (hud + 6) + "px", height: "auto", minHeight: "34px", bottom: "auto", maxHeight: (sr.bottom - hud - 12) + "px" });
    }
  }
  function dropTimer(panel) {
    clearTimeout(V.dropT);
    let f = panel.querySelector(".flame");
    if (!f) { panel.insertAdjacentHTML("afterbegin", FLAME); f = panel.querySelector(".flame"); }
    f.classList.remove("burn"); void f.offsetWidth; f.classList.add("burn");
    panel.onpointerdown = () => { if (!panel.hidden && V) dropTimer(panel); };
    V.dropT = setTimeout(() => { if (V && !panel.hidden) closeSheet(); }, 6000);
  }
  function dropOutside(e) {
    if (!V || !V.sheet) return;
    const panel = $(V.sheet === "company" ? ".company-sheet" : ".aid-sheet"), btn = $(V.sheet === "company" ? ".hb.wpill" : ".hb.aid");
    if ((panel && panel.contains(e.target)) || (btn && btn.contains(e.target))) return;
    closeSheet();
  }
  function closeSheet() { if (!V) return; clearTimeout(V.dropT); $$(".sheet").forEach((s) => { s.hidden = true; }); V.sheet = null; }

  // ---------- Keys (laptops) ----------
  function onKey(e) {
    if (!V || V.qte || V.tracing) return; // (a mantra being traced has the keys: ui/fx.js U.mantra)
    if (document.querySelector(".fbrief-wrap, .ftour")) return;
    const k = e.key;
    if (/^[1-9]$/.test(k)) {
      e.preventDefault(); e.stopPropagation();
      if (V.el.querySelector(".wctl.picking")) { if (+k <= 3) choosePlace(PLACES[+k - 1]); return; }
      const b = $$("#wd-moves button")[+k - 1]; if (b && !b.disabled) move(b.dataset.move, b.dataset.uid); return;
    }
    const low = k.toLowerCase();
    if (low === "h" || low === "u" || low === "c") { e.preventDefault(); e.stopPropagation(); if (low === "u") { const r = C.available().filter((a) => (a.id === "astra" || (K.ABILITIES[a.id] && K.ABILITIES[a.id].group === "astra")) && !a.why)[0]; if (r) aid(r.id); } else aid(low === "h" ? "herbs" : "call"); return; }
    if (k === "ArrowLeft" || k === "ArrowRight") {
      e.preventDefault(); e.stopPropagation();
      const F = [...V.figs.values()].filter((f) => f.side === "foe" && !f.dead && f.i === 0).sort((p, q) => p.x - q.x);
      const i = F.findIndex((f) => f.u.uid === V.target), n = F[(i + (k === "ArrowRight" ? 1 : F.length - 1)) % F.length]; if (n) pick(n.u.uid, true); return;
    }
    if (low === "o" && V.B.order) { e.preventDefault(); e.stopPropagation(); toggleSheet("company"); return; }
    if (low === "a") { e.preventDefault(); e.stopPropagation(); toggleSheet("aid"); return; }
    if (k === "Escape" && V.sheet) { e.preventDefault(); e.stopPropagation(); closeSheet(); }
  }

  // ---------- Before the fight: the briefing card, and the tour of the screen on a life's first fight ----------
  const MODE_NAME = { duel: "A duel", melee: "Against several", hold: "A hold", rounds: "Last the rounds" };
  function brief() {
    const B = V.B, S = K.S, mode = U.fightBriefMode(B), full = !(S.briefed || []).includes(mode);
    if (full) S.briefed = (S.briefed || []).concat(mode);
    const goal = U.fightBriefGoal(B);
    if (!full) {
      const line = U.el('<p class="fb-line wd-fbline" aria-live="polite"><b>' + esc(T(MODE_NAME[mode] || "A hold")) + "</b>" + (goal ? " · " + esc(goal) : "") + "</p>");
      const champ = B.units.some((u) => u.side === "enemy" && u.hero && !u.away); // after a champion's moment, not over it
      setTimeout(() => { if (!V) return; V.stage.appendChild(line); clearOfToast(); setTimeout(() => line.remove(), 4200); }, champ ? 2400 : 0); return;
    }
    const acts = U.fightBriefActions(B).filter(([ic]) => ic !== "block");
    const list = [["strike", T("Your moves"), T("A card each turn, or its number")]].concat(acts.filter(([ic]) => !["strike", "guard", "special", "orders"].includes(ic)));
    if (B.order) list.push(["orders", T("Company ▾"), T("Orders, your place, Withdraw")]);
    if (B.stepMode) list.push(["block", T("Block or dodge"), T("Tap in time as a blow comes")]);
    const ICONS = { strike: "M4 20l5-5M7 13l4 4M9 15L20 4v3L11 16", herbs: "M5 19c0-8 6-13 14-14-1 8-6 14-14 14zM5 19l7-7", call: "M4 10v4h3l6 4V6L7 10z", astra: "M12 2v4M12 18v4M2 12h4M18 12h4", orders: "M6 21V4M6 4h11l-2 4 2 4H6", spare: "M7 11V5.5a1.5 1.5 0 013 0V11", flee: "M10 6l-6 6 6 6M4 12h11", block: "M12 4a8 8 0 100 16 8 8 0 000-16z" };
    const card = U.el('<div class="fbrief-wrap" role="dialog" aria-modal="true" aria-labelledby="fb-title"><div class="fbrief">' +
      '<p class="fb-tag">' + esc(T(B.enc.lethal ? "Battle · you can die here" : "A fight")) + "</p>" +
      '<h2 id="fb-title">' + U.t(K.val(B.enc.title)) + '</h2><p class="fb-mode">' + esc(T(MODE_NAME[mode] || "A hold")) + "</p>" + (goal ? '<p class="fb-goal">' + esc(goal) + "</p>" : "") +
      '<p class="fb-lbl">' + esc(T("What you can do")) + '</p><ul class="fb-acts">' + list.map(([ic, n, w]) => '<li><span class="fb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICONS[ic] || ICONS.strike) + '"/></svg></span><b>' + esc(n) + "</b><small>" + esc(w) + "</small></li>").join("") + "</ul>" +
      '<div class="btnrow"><button type="button" class="cta fb-go">' + esc(T("Fight")) + "</button></div></div></div>");
    const go = () => { card.remove(); if (V && !S.fightTour) { S.fightTour = 1; tour(); } };
    card.querySelector(".fb-go").addEventListener("click", go);
    V.el.appendChild(card);
    setTimeout(() => { const b = card.querySelector(".fb-go"); if (b && b.isConnected) b.focus({ preventScroll: true }); }, 300);
  }
  function tour() {
    if (!V) return;
    const q = (s) => { const el = V.el.querySelector(s); return el && el.offsetParent !== null ? el : null; };
    const steps = [];
    const add = (el, text) => { if (el) steps.push({ el, text }); };
    add(q(".foe-tap:not([hidden])"), "Tap a foe to make him your target. The chip over him is the blow he means to strike.");
    add(q(".actor.me"), "Your side's bars are green, the foe's red. If yours runs out, you fall.");
    add(q(".gmark.ring") || q("#wd-summary"), "The rings mark who each blow is coming at: under you, it is coming at you.");
    add(q(".placepick") || q("#wd-moves"), q(".placepick") ? "First choose your place in the line. It is free before the first round." : "Your moves. Choose one each turn, or press its number.");
    add(q(".hb.wpill"), "Your company: standing orders, your place in the line, and Withdraw.");
    add(q(".hb.aid"), "Aid: herbs, your divine weapon, a call for help.");
    if (!steps.length) return;
    const el = U.el('<div class="ftour' + (U.motion() ? "" : " still") + '" role="dialog" aria-modal="true" aria-label="' + esc(K.tr("How to fight")) + '"><div class="ft-hole"></div><div class="ft-cap" aria-live="polite"><span class="ft-n"></span><p></p><div class="ft-foot"><span class="ft-tap"></span><button type="button" class="ghost ft-skip"></button></div></div></div>');
    V.el.appendChild(el);
    const hole = el.querySelector(".ft-hole"), cap = el.querySelector(".ft-cap"), skip = el.querySelector(".ft-skip");
    let i = -1, timer = 0;
    const endT = () => { clearTimeout(timer); el.remove(); window.removeEventListener("keydown", key, true); };
    const show = () => {
      const st = steps[i], r = st.el.getBoundingClientRect(), W = innerWidth, H = innerHeight, pad = 6;
      cap.querySelector(".ft-n").textContent = K.tr("{n} of {m}", { n: i + 1, m: steps.length });
      cap.querySelector("p").textContent = K.tr(st.text);
      cap.querySelector(".ft-tap").textContent = K.tr("Tap to go on"); skip.textContent = K.tr("Skip");
      const top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad), right = Math.min(W - 4, r.right + pad), bottom = Math.min(H - 4, r.bottom + pad);
      Object.assign(hole.style, { top: top + "px", left: left + "px", width: right - left + "px", height: bottom - top + "px" });
      const ch = cap.offsetHeight || 90, cw = Math.min(W - 32, 360);
      const y = bottom + 12 + ch <= H - 8 ? bottom + 12 : Math.max(8, top - 12 - ch), x = Math.min(Math.max(16, (left + right) / 2 - cw / 2), W - 16 - cw);
      Object.assign(cap.style, { top: y + "px", left: x + "px", width: cw + "px" });
    };
    const next = () => { clearTimeout(timer); i++; if (i >= steps.length) return endT(); show(); timer = setTimeout(next, 2600); };
    const key = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); endT(); } else if ([" ", "Enter", "ArrowRight"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); next(); } };
    el.addEventListener("click", (e) => { if (e.target === skip) return endT(); next(); });
    window.addEventListener("keydown", key, true);
    next();
  }
})(window.K = window.K || {});
