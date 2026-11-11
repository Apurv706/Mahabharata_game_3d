/* Real-time fights (PRD §18.15), the screen: the fights of engine/realtime.js RT.IDS, unless the menu's "Fights"
   is turn-based (RT.wanted). Every other fight goes on to ui/warday.js and ui/battle.js.
   A copy of the approved layout page (scratchpad rtlayout/page.js + page.css, 3 November): the same DOM
   (.screen.rt > .stage with .hud, .kstrip, .toast; .ctl with ◀ ▶ | Skill, Roll, Strike; compact sheets),
   the same geometry (the field the stage's width on a phone, a band of 9.5 bodies on a laptop; the front
   row's figures about 30% of the stage high, rows 11% higher and 12% smaller each), the same CSS
   (css/realtime.css is page.css scoped to #rt). Orders and Aid open over the controls at exactly their
   height, with a burning diya that closes them after 6 s; a tap outside closes them; the fight waits.
   Keys: A/D or ←/→ move, W/S or ↑/↓ change row, J strike, K or Space roll, L skill, H herbs, C call, U
   divine weapon, O orders, P or Esc pause, E spare. Mouse (laptops): click the ground to walk, a foe to
   strike; right- or Shift-click rolls (a shield-carrier holds K, Space or the right button to Block). Under the tests (K.headless, jsdom) the bot plays it at once. */
(function (K) {
  "use strict";
  const U = K.UI, C = K.Combat, RT = K.RT;
  const turnBased = U.startBattle;
  U.startBattle = function (encId, onEnd) {
    if (V) stop(); // a fight still on screen gives way to the new one
    if (!RT || !RT.wanted(encId)) return turnBased(encId, onEnd);
    if (K.headless || /jsdom/i.test(navigator.userAgent || "")) return onEnd(RT.autoplay(encId, U.rtBotOptions || {}));
    return U.startRealtime(encId, onEnd);
  };
  const T = (s, p) => U.tr(s, p);
  const $ = (sel, root) => (root || (V && V.el) || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || (V && V.el) || document).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const PAUSE = '<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><rect x="3" y="2" width="3.6" height="12" rx="1" fill="currentColor"/><rect x="9.4" y="2" width="3.6" height="12" rx="1" fill="currentColor"/></svg>';
  const FLAME = '<span class="flame" aria-hidden="true"><svg viewBox="0 0 24 24"><circle class="fr-bg" cx="12" cy="12" r="10.5"/><circle class="fr" cx="12" cy="12" r="10.5" pathLength="100"/><path class="fl" d="M12 4.5 C15 8.5 16.2 11 15.2 14 C14.6 16.2 13.2 17.2 12 17.2 C10.8 17.2 9.4 16.2 8.8 14 C7.8 11 9 8.5 12 4.5 Z"/><path class="lamp" d="M6.5 17 Q12 21.5 17.5 17 Z"/></svg></span>';
  const SKILL_NAME = { aimed: "Aimed shot", quake: "Ground-shaker", ridedown: "Ride them down", command: "Command", salve: "Herbal salve", vanish: "Vanish into the dust", song: "Battle song" };
  const KEYS_ALL = "A / D move · W / S change row · J strike · K or Space roll · L skill · H herbs · C call · U divine weapon · O orders · P pause · E spare";
  // A shield-carrier (C.hasShield: the mace, the sword paths) blocks where the others roll (owner, 4 November).
  const KEYS_BLOCK = "A / D move · W / S change row · J strike · hold K or Space to block · L skill · H herbs · C call · U divine weapon · O orders · P pause · E spare";
  const blocker = () => !!(V && V.R && V.R.blocker);
  const mace = () => !!(V && V.R && RT.comboOf(V.R).length === 2);
  const dagger = () => !!(V && V.R && RT.comboOf(V.R).length === 5); // (Build D: four quick stabs and a heavy fifth)
  const COMBO_LABEL = { 2: "×2 combo", 3: "×3 combo", 5: "×5 combo" };
  const WEAPON = {
    spear: '<svg viewBox="0 0 100 12" aria-hidden="true"><path d="M3 6 H80" stroke="#1d0f08" stroke-width="5.4" stroke-linecap="round"/><path d="M3 6 H80" stroke="#3f2310" stroke-width="2.6" stroke-linecap="round"/><path d="M79 2 L98 6 L79 10 Z" fill="#dcd7c8" stroke="#1d0f08" stroke-width="1"/></svg>',
    bow: '<svg viewBox="0 0 100 24" aria-hidden="true"><path d="M4 20 Q50 -10 96 20" fill="none" stroke="#5a3418" stroke-width="3.4" stroke-linecap="round"/><path d="M4 20 L96 20" stroke="#efe2c0" stroke-width="1"/></svg>',
    mace: '<svg viewBox="0 0 100 24" aria-hidden="true"><path d="M4 12 H70" stroke="#6b4422" stroke-width="4" stroke-linecap="round"/><ellipse cx="82" cy="12" rx="15" ry="10" fill="#d9a53a" stroke="#1d0f08" stroke-width="1.2"/></svg>',
    sword: '<svg viewBox="0 0 100 12" aria-hidden="true"><path d="M4 6 H20" stroke="#5a3418" stroke-width="4" stroke-linecap="round"/><path d="M20 3 L92 5 L98 6 L92 7 L20 9 Z" fill="#dcd7c8" stroke="#1d0f08" stroke-width="1"/></svg>'
  };
  // Each unit as a puppet: you with the weapon you fight with (K.fightItem: a sword for the driver and the commander, the bow
  // for the archer, no swap mid-fight) and your round shield on the mace and sword paths (and in the dream); everyone else as ui/battle.js draws
  // him (one rule for every screen: tests/weapons.js holds RT.weaponOf to it).
  function specFor(u) {
    if (u.side === "player") {
      const sp = Object.assign({}, K.puppetSpec(K.S), { item: V && V.R && V.R.B.enc.dream ? "sword" : K.fightItem(K.S) }); // the dream: grown, with a sword
      if (C.hasShield && C.hasShield()) sp.gear = (sp.gear || []).filter((g) => g !== "shield" && g !== "buckler").concat("shield"); // the big round shield (owner, 6 November; it was a small one)
      return sp;
    }
    if (U.battleSpecFor) return U.battleSpecFor(u);
    if (u.person && K.PUPPETS && K.PUPPETS[u.person]) return U.puppetFor(u.person);
    return U.puppetFor("soldier");
  }


  let V = null; // the screen's state while a fight is on
  U.rtScreen = () => V; // for the fit checks and screenshots
  U.rtStop = () => stop(); // close the screen without an outcome (the layout checks)
  // A foe kneeling and asking for mercy (C.spareable): "Mercy!" over him, an open hand, and the "Spare" hint when
  // he can be spared now (in reach, or on the turns); "Spared" once he is (the fight goes on). Shared with ui/warday.js.
  // state: "ask" (tap to spare), "far" (step closer), "spared", or "" (none).
  U.pleaTag = function (el, state, onSpare) {
    let t = el.querySelector(":scope > .plea");
    if ((t ? t.dataset.s : "") === state) return;
    if (!state) { if (t) t.remove(); return; }
    if (!t) { t = document.createElement("span"); t.className = "plea"; el.appendChild(t); t.addEventListener("pointerdown", (e) => { e.stopPropagation(); }); t.addEventListener("click", (e) => { e.stopPropagation(); if (t.dataset.s === "ask" && t._spare) t._spare(); }); }
    t._spare = onSpare; t.dataset.s = state;
    t.innerHTML = state === "spared" ? "<b>" + U.esc(U.tr("Spared")) + "</b>" : '<b>' + U.esc(U.tr("Mercy!")) + "</b>" + (state === "ask" ? '<i role="button">' + U.esc(U.tr("Spare")) + "</i>" : "");
    t.setAttribute("aria-label", state === "spared" ? U.tr("Spared") : U.tr("Mercy!") + (state === "ask" ? " " + U.tr("Spare") : ""));
  };

  U.startRealtime = function (encId, onEnd) {
    if (V) stop();
    if (K.Sound) { K.Sound.play(K.ENCOUNTERS[encId].lethal && K.S.act === 6 ? "callToArms" : "drumCall"); if (K.Sound.mood) K.Sound.mood("battle"); }
    const B = C.start(encId, onEnd);
    const R = RT.begin(B, { assist: U.assist && U.assist() });
    V = { encId, onEnd, R, actors: new Map(), held: { l: false, r: false }, queue: {}, acc: 0, last: 0, raf: 0, paused: false, sheet: null, toastT: 0, logAt: B.log.length };
    build();
    // Before the first blow: the rules card (or one line), then on a life's first fight the walkthrough. Not
    // for the dream, a bout or the practice ground, nor under the tests (U.fightBriefWanted). The fight waits.
    if (U.fightBriefWanted && U.fightBriefWanted(encId)) brief();
    V.raf = requestAnimationFrame(loop);
  };

  // ---------- A champion takes the field (item 22) ----------
  // One of the epic's named fighters entering the fight: the fight slows, the edges darken, his name in gold with his title,
  // a drum; then on. Once a champion a fight; quieter under Calm motion.
  function champCheck(R) {
    const seen = V.champSeen || (V.champSeen = new Set());
    const h = R.B.units.find((u) => u.side === "enemy" && (u.person || u.hero) && u.hp > 0 && u.rt && u.rt.entered && !seen.has(u.uid));
    if (!h) return;
    R.B.units.forEach((u) => { if (u.side === "enemy" && (u.person || u.hero) && u.rt && u.rt.entered) seen.add(u.uid); });
    const full = K.text(h.src || h.name), cut = full.indexOf(","), name = cut > 0 ? full.slice(0, cut) : full, title = cut > 0 ? full.slice(cut + 1).trim() : T("A champion takes the field");
    const el = U.el('<div class="rt-champ" aria-live="assertive"><b>' + U.esc(name) + "</b><small>" + U.esc(title) + "</small></div>");
    const ha = V.actors.get(h.uid); if (ha) setTimeout(() => nameTag(ha, 3), 300); // and over him, so you know which he is
    V.stage.appendChild(el); V.stage.classList.add("champ");
    if (K.Sound) K.Sound.play("drumCall");
    const calm = U.calm();
    V.slowUntil = calm ? 0 : performance.now() + 1500;
    setTimeout(() => { el.classList.add("off"); if (V && V.stage) V.stage.classList.remove("champ"); setTimeout(() => el.remove(), 500); }, calm ? 1200 : 1900);
  }

  // ---------- The clash (owner, 5 November) ----------
  // A war day's round fought out on this screen: the same units, about 15 s of real time after your order, then back to
  // the war day's orders. It ends early when every foe on the field is down, or when you fall back. A named comrade may
  // call for help once a battle: reach him in time and he holds; too late and he is cut down.
  U.startClash = function (B, opts, done) {
    if (V) stop();
    const status = B.status, round = B.round;
    // opts.noStrike: a storm (nothing to strike at: block, roll and live); opts.only: the foes who come at you (a
    // break-through's lane), the rest wait off the field until the clash is over.
    const stilled = opts && opts.only ? B.units.filter((u) => u.side === "enemy" && u.hp > 0 && !u.still && !opts.only.includes(u.uid)) : [];
    stilled.forEach((u) => { u.still = true; });
    const R = RT.begin(B, { assist: U.assist && U.assist(), noStrike: !!(opts && opts.noStrike), clash: true });
    stilled.forEach((u) => { if (u.rt) { u.rt.entered = false; u.rt.x = 1.08; } });
    // opts.atk: the foes' blows lighter for this kind of clash (put back with the rest of the scale when it ends: RT.unscale).
    if (opts && opts.atk) B.units.forEach((u) => { if (u.side === "enemy" && u.rt) u.atk = Math.max(1, Math.round(u.atk * opts.atk)); });
    R.noRetry = true; // a war day has no second try
    V = { encId: B.enc.id, onEnd: null, R, actors: new Map(), held: { l: false, r: false }, queue: {}, acc: 0, last: 0, raf: 0, paused: false, sheet: null, toastT: 0, logAt: B.log.length,
      clash: { secs: (opts && opts.secs) || 15, done, status, round, call: null, stilled } };
    build();
    V.el.classList.add("clashin"); // (a short fade from the war day's line)
    const bar = U.el('<div class="clashbar"><span class="cl-ring" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" class="cl-bg"/><circle cx="20" cy="20" r="17" class="cl-fg" pathLength="100"/></svg><b></b></span>' +
      '<button type="button" class="cl-back">' + T("Fall back") + "</button></div>");
    V.stage.appendChild(bar);
    bar.querySelector(".cl-back").addEventListener("click", () => clashEnd("fallback"));
    if (opts && opts.noBack) bar.querySelector(".cl-back").hidden = true; // (the dream: nothing to fall back to)
    V.clash.bar = bar;
    toast(R.noStrike ? T("Nothing to strike at: block, roll and live. {n} seconds", { n: V.clash.secs }) : T("The clash: {n} seconds", { n: V.clash.secs }));
    if (R.noStrike) V.el.classList.add("nostrike");
    opening();
    V.raf = requestAnimationFrame(loop);
  };
  // ---------- The clash's opening: what your move on the turns leaves standing (owner, 6 November) ----------
  // "The option selected in turn by turn doesn't flow to the real-time fight." Its effect carried already (a status lasts
  // its rounds as seconds here: RT.begin); now it is seen. A shield wall: your side closes up behind you, shields up, rim
  // over rim, with two more of the company's front rank, for its seconds (every blow halved; engine/realtime.js allyStep).
  // A guard, a war cry, a rally, a swerve and a stunned foe are named under the timer while they last.
  const OPENERS = [
    { s: "wall", side: "friends", t: "Shield wall: blows halved" },
    { s: "guard", side: "player", t: "Guard: the next blow halved" },
    { s: "taunt", side: "player", t: "War cry: they come at you" },
    { s: "inspired", side: "friends", t: "Rally: your side hits harder" },
    { s: "evade", side: "player", t: "Swerve: the next blow misses" },
    { s: "stun", side: "enemy", t: "Stunned: they cannot strike" },
    // (Build D, row 50) Shield wall or Guard chosen on the turns: Strike locked for the clash's first seconds.
    { s: "_lock", side: "player", t: "No strikes yet: shield up", roll: "No strikes yet" }
  ];
  const stLeft = (s, side) => {
    if (s === "_lock") return V.R.strikeLock || 0;
    let m = 0;
    for (const u of V.R.B.units) {
      if (u.hp <= 0 || !u.rt || !u.status[s]) continue;
      if (side === "player" ? u.side !== "player" : side === "enemy" ? u.side !== "enemy" : u.side === "enemy") continue;
      m = Math.max(m, u.rt.st[s] || 0);
    }
    return m;
  };
  function opening() {
    const c = V.clash, box = U.el('<div class="cl-opens" aria-live="polite"></div>');
    V.stage.appendChild(box); c.opens = [];
    for (const o of OPENERS) {
      const left = stLeft(o.s, o.side);
      if (left <= 0) continue;
      const el = U.el('<div class="cl-open k-' + o.s + '"><span>' + U.esc(T(o.roll && !V.R.blocker ? o.roll : o.t)) + "</span><b>" + Math.ceil(left) + "</b></div>");
      box.appendChild(el); c.opens.push({ o, el });
    }
    V.openFx = c.opens.length > 0; // the figures are made on the first frame: their poses then (openFx)
  }
  function openFx() {
    const p = C.player(), me = p && V.actors.get(p.uid);
    if (stLeft("wall", "friends") > 0) wallUp();
    else if (me && p.status.guard) { pose(me, "shieldUp", 1500, 0.6); U.guardFlash(me.svg, 1300); home(me, 1400); }
    if (me && p.status.taunt) { me.el.classList.add("roared"); setTimeout(() => { if (me.el) me.el.classList.remove("roared"); }, 1400); }
  }
  function openTick() {
    const c = V.clash; if (!c || !c.opens) return;
    c.opens = c.opens.filter((x) => {
      const left = stLeft(x.o.s, x.o.side);
      if (left <= 0) { x.el.classList.add("gone"); setTimeout(() => x.el.remove(), 450); return false; }
      const b = x.el.querySelector("b"), n = String(Math.ceil(left)); if (b.textContent !== n) b.textContent = n;
      return true;
    });
    if (V.walled && stLeft("wall", "friends") <= 0) wallDown();
  }
  // The wall: everyone on your side under it raises the shield (a soldier's round hide shield; with none, the forearm),
  // and the company's front rank stands beside them, two more shield-bearers in the rows between, as the war day draws
  // a band as two. When it opens, they step back into the company.
  function wallUp() {
    const B = V.R.B, p = C.player(); if (!p || !V.G) return;
    V.walled = true;
    for (const u of B.units) {
      if (u.side === "enemy" || u.hp <= 0 || !u.status.wall || !u.rt) continue;
      const a = actorFor(u); a.walled = true; a.el.classList.add("in-wall");
      if (a.rig) { a.rig.t.dx = 0; a.rig.t.dy = 0; }
      pose(a, u.side === "player" ? "shieldUp" : "guard", 900, 0.6); U.guardFlash(a.svg, 1400);
    }
    const comp = B.units.find((u) => u.side === "ally" && u.plural && !u.person && !u.called && u.hp > 0 && u.status.wall);
    if (!comp) return;
    const spec = specFor(comp);
    V.wallMen = [[0.5, -0.06], [1.5, 0.3]].map(([lane, off]) => {
      const el = U.el('<div class="actor ally wallman in-wall" aria-hidden="true"><span class="shadow"></span><div class="fl">' + U.puppet(spec, { pose: U.motion() ? "live" : "stand", h: 200 }) + "</div></div>");
      V.world.appendChild(el);
      const svg = el.querySelector("svg.pp"), vb = (svg.getAttribute("viewBox") || "0 0 120 200").split(/[\s,]+/).map(Number);
      const m = { u: { rt: { lane }, side: "ally", hp: 1 }, el, svg, fl: el.querySelector(".fl"), vbW: vb[2], vbH: vb[3], sc: 210 / vb[3], d: lane, off, base: "ready" };
      m.rig = U.motion() && U.rig ? U.rig(svg, el, "ready", { fight: true }) : null;
      size(m); pose(m, "guard", 700, 0.6); U.guardFlash(svg, 1400);
      return m;
    });
  }
  function wallDown() {
    V.walled = false;
    (V.wallMen || []).forEach((m) => { m.el.style.transition = "opacity .5s, translate .5s"; m.el.style.opacity = "0"; setTimeout(() => m.el.remove(), 520); });
    V.wallMen = null;
    V.actors.forEach((a) => { if (a.walled) { a.walled = false; a.el.classList.remove("in-wall"); if (a.u.hp > 0) home(a, 0); } });
  }
  function wallMenDraw(p) {
    const G = V.G; if (!G || !p || !p.rt) return;
    for (const m of V.wallMen) {
      const x = clamp(p.rt.x - (p.rt.face || 1) * m.off * RT.BODY, 0.06, 0.94);
      m.el.style.left = (G.fx0 + x * G.FW).toFixed(1) + "px"; m.el.style.bottom = (G.gl + m.d * G.dstep).toFixed(1) + "px";
      m.el.style.zIndex = String(Math.round(20 - m.d * 6)); m.el.classList.toggle("face-l", (p.rt.face || 1) < 0);
    }
  }
  // The first time a blade is lit for you (on this device), a line says what it means.
  // A tip shown once on this device (Build D): its key in the prefs, its line.
  function tipOnce(key, line) {
    let seen = false; try { seen = !!(K.prefs && K.prefs()[key]); } catch (e) { /* no store */ }
    if (seen || (V.told = V.told || {})[key]) return;
    V.told[key] = true; try { K.prefs({ [key]: true }); } catch (e) { /* no store */ }
    toast(K.tr(line), true); // (plain text: T escapes for markup, and a toast is text)
  }
  // A shield cracks at half its points and splits at none (Build D, row 49): the crack drawn across it, then it is gone
  // (a foe's for the fight; yours until you take up another off the ground).
  function shieldCrack(a) {
    if (!a || !a.svg) return;
    a.el.classList.add("shield-cracked");
    const s = a.svg.querySelector(".it-s"); if (!s || s.querySelector(".crack")) return;
    const r = +(s.dataset.r || 26);
    s.insertAdjacentHTML("beforeend", '<path class="crack" d="M' + (58 - r * 0.7) + " " + (112 - r * 0.5) + " L" + (58 - r * 0.15) + " " + (112 - r * 0.05) + " L" + (58 + r * 0.1) + " " + (112 + r * 0.3) + " L" + (58 + r * 0.55) + " " + (112 + r * 0.7) + " M" + (58 - r * 0.15) + " " + (112 - r * 0.05) + " L" + (58 + r * 0.45) + " " + (112 - r * 0.45) + '" fill="none" stroke="#2a1608" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>');
  }
  function shieldGone(a, gone) {
    if (!a || !a.el) return;
    a.el.classList.toggle("shield-broken", gone);
    if (!gone) { a.el.classList.remove("shield-cracked"); const c = a.svg && a.svg.querySelector(".it-s .crack"); if (c) c.remove(); }
  }
  // ---------- Shields on the ground (owner, 7 November: "a place to pick up a new shield where the player has to go") ----------
  // A fallen soldier's shield, or the one a comrade throws in at your side's edge (RT dropShield, throwIn): the round hide
  // shield lying on the ground, lit gold while you have none, with an arrow at your feet toward the nearest; walking to it
  // takes it up (RT takeUp). Over the fallen (who lie at 4), under the living.
  // (One of your side the screen draws with a shield drops it too: the company's soldiers.)
  RT.allyShield = (u) => { const sp = U.battleSpecFor ? U.battleSpecFor(u) : null; return !!(sp && !sp.thing && (sp.gear || []).includes("shield")); };
  const GSHIELD = () => '<svg viewBox="30 99 56 26" aria-hidden="true"><g transform="translate(58 112) scale(1 0.42) translate(-58 -112)">' + (U.shieldSvg ? U.shieldSvg(26, "#c9a24a") : "") + "</g></svg>";
  function groundShield(g) {
    const map = V.ground || (V.ground = new Map());
    if (map.has(g.id)) return map.get(g.id);
    const el = document.createElement("div"); el.className = "gshield" + (g.kind === "thrown" ? " thrown" : ""); el.dataset.id = g.id;
    el.innerHTML = '<i class="glint"></i>' + GSHIELD();
    V.world.appendChild(el);
    const sh = { el, id: g.id, x: g.x, lane: g.lane || 0, w: 0 };
    map.set(g.id, sh); placeGround(sh);
    return sh;
  }
  function placeGround(sh) {
    const G = V.G; if (!G) return;
    const w = G.ph * (1 - G.dk * Math.max(0, sh.lane)) * 0.34; sh.w = w;
    sh.el.style.width = w.toFixed(1) + "px";
    sh.el.style.left = (G.fx0 + sh.x * G.FW - w / 2).toFixed(1) + "px"; sh.el.style.bottom = (G.gl + sh.lane * G.dstep - w * 0.08).toFixed(1) + "px";
  }
  function groundGone(id, to) {
    const sh = V.ground && V.ground.get(id); if (!sh) return;
    V.ground.delete(id);
    if (!to || U.calm()) { sh.el.style.transition = "opacity .3s"; sh.el.style.opacity = "0"; setTimeout(() => sh.el.remove(), 320); return; }
    // Taken up: it rises to your arm.
    const x0 = parseFloat(sh.el.style.left) + sh.w / 2, dx = to.x - x0, dy = -(to.fh * 0.42);
    sh.el.classList.remove("want");
    sh.el.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(0.8, 1.6)", opacity: 0 }], { duration: 260, easing: "ease-out", fill: "forwards" }).onfinish = () => sh.el.remove();
  }
  function groundDraw(R, p) {
    if (V.ground) V.ground.forEach((sh) => { placeGround(sh); const g = R.ground.find((o) => o.id === sh.id); sh.el.classList.toggle("want", !!(R.broken && g && R.t >= g.at)); });
    // The arrow at your feet: toward the nearest shield on the ground while you have none and are not over it.
    const me = V.actors.get(p.uid), g = R.broken && me && p.hp > 0 ? RT.nearestShield(R, p.rt.x) : null;
    let ar = V.shPtr;
    if (!g || Math.abs(g.x - p.rt.x) <= RT.P.pickupR * RT.BODY) { if (ar) ar.hidden = true; return; }
    if (!ar) { ar = V.shPtr = U.el('<div class="shptr" aria-hidden="true"><svg viewBox="0 0 26 16"><path d="M2 8 L12 1.5 L12 5.5 L24 5.5 L24 10.5 L12 10.5 L12 14.5 Z"/></svg></div>'); V.world.appendChild(ar); }
    const dir = g.x < p.rt.x ? -1 : 1;
    ar.hidden = false; ar.classList.toggle("r", dir > 0);
    ar.style.left = (me.x + dir * me.bw * 0.95).toFixed(1) + "px"; ar.style.bottom = (me.gy + me.fh * 0.04).toFixed(1) + "px";
  }
  // The parry's cue (owner, 6 November: "the blade coming at you is lit white"): drawn along the blade itself, from the middle
  // of the weapon to its tip, not round the whole figure (the strike and defence study: that turned him into a pale silhouette).
  function bladeGlint(a, on) {
    if (!on || !a.svg) { if (a.glint) a.glint.hidden = true; return; }
    const tipEl = a.svg.querySelector(".pp-body .foreF .it-tip"), wEl = a.svg.querySelector(".pp-body .foreF .it-w, .pp-body .foreF .it-tmp");
    if (!tipEl || !wEl) { if (a.glint) a.glint.hidden = true; return; }
    const wr = V.world.getBoundingClientRect(), t = tipEl.getBoundingClientRect(), w = wEl.getBoundingClientRect();
    const x1 = t.left + t.width / 2 - wr.left, y1 = t.top + t.height / 2 - wr.top, x0 = w.left + w.width / 2 - wr.left, y0 = w.top + w.height / 2 - wr.top;
    let g = a.glint; if (!g) { g = a.glint = U.el('<i class="glint-blade" aria-hidden="true"></i>'); V.world.appendChild(g); }
    g.hidden = false;
    Object.assign(g.style, { left: x0.toFixed(1) + "px", top: y0.toFixed(1) + "px", width: Math.max(6, Math.hypot(x1 - x0, y1 - y0)).toFixed(1) + "px", transform: "rotate(" + Math.atan2(y1 - y0, x1 - x0).toFixed(3) + "rad)" });
  }
  function parryTip() {
    let seen = false; try { seen = !!(K.prefs && K.prefs().tipParry); } catch (e) { /* no store */ }
    if (seen || V.parryTold) return;
    V.parryTold = true; try { K.prefs({ tipParry: true }); } catch (e) { /* no store */ }
    toast(T("A blade lit white is coming down on you: Strike now to parry it."));
  }
  // The first time a foe catches your blow on his shield (on this device), a line says what it means.
  function fblockTip() {
    let seen = false; try { seen = !!(K.prefs && K.prefs().tipFblock); } catch (e) { /* no store */ }
    if (seen || V.fblockTold) return;
    V.fblockTold = true; try { K.prefs({ tipFblock: true }); } catch (e) { /* no store */ }
    toast(T("He took it on his shield. While he lowers it he cannot strike: hit him again."));
  }
  // Life below a fifth (owner, 6 November: "when my life gets less than 10%, create a warning"; then 20%: played like a
  // person, a blow of 15-25% of your life could skip the tenth): the edges of the field pulse red, your bar flashes, a
  // heartbeat every few seconds, and a line says what you can do, for as long as it lasts.
  function lowLife(p) {
    const low = p.hp > 0 && p.hp < p.maxHp * K.LOW_LIFE;
    if (low !== !!V.low) {
      V.low = low; V.el.classList.toggle("lowlife", low);
      const w = $(".lowwarn", V.stage);
      if (w) { if (low) w.querySelector("span").textContent = T(lowHint()); w.hidden = !low; }
      if (low) V.beatAt = -9;
    }
    if (low && K.Sound && V.R.t - V.beatAt > 2.4) { V.beatAt = V.R.t; K.Sound.play("heartbeat"); }
  }
  function lowHint() {
    const out = V.clash ? "fall back" : C.canFlee() ? "withdraw" : "";
    if ((K.S.items.herbs || 0) > 0) return out === "fall back" ? "Use your herbs, or fall back." : out ? "Use your herbs, or withdraw." : "Use your herbs.";
    if (V.R.blocker) return out === "fall back" ? "Block, or fall back." : out ? "Block, or withdraw." : "Block and hold on.";
    return out === "fall back" ? "Roll clear, or fall back." : out ? "Roll clear, or withdraw." : "Roll clear and hold on.";
  }
  function clashTick() {
    const c = V.clash, R = V.R, B = R.B, p = C.player();
    if (c.ended) return;
    openTick();
    const left = Math.max(0, c.secs - R.t);
    const fg = c.bar.querySelector(".cl-fg"); fg.style.strokeDasharray = (left / c.secs * 100) + " 100";
    c.bar.querySelector("b").textContent = Math.ceil(left);
    // A named comrade calls, once a battle, a few seconds in.
    if (!c.call && !B.clashCalled && R.t > 3) {
      const a = B.units.find((u) => u.side === "ally" && (u.person || u.called) && u.hp > 0 && u.rt);
      if (a) {
        B.clashCalled = true;
        const fl = R.B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.rt && u.rt.entered);
        a.rt.x = Math.min(0.78, Math.max(0.22, p.rt.x + (p.rt.x < 0.5 ? 0.45 : -0.45))); // away from you, on the far flank
        fl.slice(0, 2).forEach((e, i) => { e.rt.x = Math.min(0.92, Math.max(0.08, a.rt.x + (i ? -1 : 1) * 0.12)); });
        const name = K.text(a.src || a.name).split(",")[0];
        c.call = { a, t0: R.t, secs: 6, name };
        const el = U.el('<div class="cl-call" aria-live="assertive"><i>!</i><span>' + U.esc(T("{n}: To me! My flank breaks!", { n: name })) + "</span></div>");
        V.stage.appendChild(el); c.call.el = el;
      }
    }
    if (c.call && !c.call.over) {
      const k = c.call, act = V.actors.get(k.a.uid), sr = V.stage.getBoundingClientRect();
      if (act && act.el) { const r = act.el.getBoundingClientRect(); k.el.style.left = clamp(r.left + r.width / 2 - sr.left, 60, sr.width - 60) + "px"; k.el.style.top = Math.max(8, r.top - sr.top - 34) + "px"; }
      const near = Math.abs(p.rt.x - k.a.rt.x) < 1.4 * RT.BODY, late = R.t - k.t0 > k.secs || k.a.hp <= 0;
      k.el.style.setProperty("--left", Math.max(0, 1 - (R.t - k.t0) / k.secs));
      if (near && k.a.hp > 0) { k.over = "held"; k.el.remove(); K.S.bonds[k.a.person] = (K.S.bonds[k.a.person] || 0) + 1; toast(T("You reached {n} in time. He holds.", { n: k.name })); B.log.push(T("You reached {n} in time when his flank broke.", { n: k.name })); }
      else if (late) { k.over = "lost"; k.el.remove(); k.a.hp = Math.max(0, k.a.hp - Math.ceil(k.a.maxHp * 0.7)); toast(T("Too late: {n} is cut down.", { n: k.name })); B.log.push(T("You did not reach {n} in time.", { n: k.name })); }
    }
    const foesUp = B.units.some((u) => u.side === "enemy" && u.hp > 0 && u.rt && u.rt.entered && !u.spared);
    if (R.over) clashEnd(R.over === "retry" ? "lose" : R.over);
    else if (!foesUp && R.t > 1) clashEnd("cleared");
    else if (left <= 0) clashEnd("time");
  }
  function clashEnd(why) {
    const c = V && V.clash; if (!c || c.ended) return;
    c.ended = true;
    const R = V.R, B = R.B;
    if (R.over === "retry") RT.accept(R);
    // Your shield broken and none taken up: the company hands you a fresh one at the orders (owner, 7 November).
    if (R.blocker && R.broken && R.over !== "lose") B.say("Your shield was broken: your company hands you a fresh one.");
    B.status = c.status; B.rt = null; B.round = c.round; // the real-time rounds inside the clash do not count as the war day's rounds
    (c.stilled || []).forEach((u) => { u.still = false; });
    RT.unscale(B); // health and blows back on the turns' scale
    if (c.call && c.call.el) c.call.el.remove();
    const done = c.done;
    stop();
    if (done) done(why);
  }

  // ---------- The screen (the layout page's DOM) ----------
  function build() {
    const R = V.R, B = R.B, enc = B.enc;
    const old = document.getElementById("rt"); if (old) old.remove();
    const kb = (k) => "<kbd>" + k + "</kbd>", title = U.t(K.val(enc.title) || "");
    const skill = T(R.skill ? SKILL_NAME[R.skill] : "No skill");
    const el = U.el('<div id="rt" class="screen rt v-A" role="application" aria-label="' + T("Real-time fight") + '">' +
      '<div class="titleband"><b>' + title + '</b><small class="packn"></small></div>' +
      '<div class="stage" id="rt-stage"><div class="world" id="rt-world"></div><div class="tags"></div><div class="edgefx l"></div><div class="edgefx r"></div><div class="slowtint"></div><div class="rt-scorch"></div>' +
        '<div class="hud"><div class="bars">' +
          '<div class="bar hp"><span>' + T("You") + '</span><i><b id="b-hp"></b></i></div>' +
          '<div class="bar br"><span>' + T("Breath") + '</span><i><b id="b-br"></b></i></div>' +
          '<div class="bar fr" hidden><span id="b-frn"></span><i><b id="b-fr"></b></i></div></div>' +
        '<div class="hud-r"><div class="fname"><b>' + title + '</b><small class="packn"></small></div>' +
          '<div class="hud-btns"><button type="button" class="hb orders" data-act="orders" aria-haspopup="dialog">' + T("Orders") + " ▾" + kb("O") + "</button>" +
          '<button type="button" class="hb withdraw" data-act="withdraw">' + T("Withdraw") + "</button>" +
          '<button type="button" class="hb pause" data-act="pause" aria-label="' + T("Pause") + '" title="' + T("Pause") + '">' + PAUSE + "</button>" +
          '</div><button type="button" class="hb aid" data-act="aid" aria-haspopup="dialog">' + T("Aid") + " ▾</button></div></div>" +
        '<div class="kstrip" aria-hidden="true"><span class="ks-skill"><svg class="ring" viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="16"/><circle class="fg" cx="20" cy="20" r="16" stroke-dasharray="100.5" stroke-dashoffset="0"/></svg>' + skill + ' <kbd>L</kbd></span><span class="ks-herbs">' + T("Herbs") + ' <b id="ksherbs"></b> <kbd>H</kbd></span><span class="ks-keys">' + T(R.blocker ? "J strike · K block · L skill · H herbs · W/S row · P pause" : "J strike · K roll · L skill · H herbs · W/S row · P pause") + "</span></div>" +
        '<div class="banner off" role="status"></div><div class="toast off" role="status"></div>' +
        '<div class="lowwarn" role="alert" hidden><i aria-hidden="true">!</i><div><b>' + T("Your life is low") + "</b><span></span></div></div></div>" +
      '<div class="ctl" id="rt-ctl"><div class="pad"><button type="button" class="mv" data-hold="l" aria-label="' + T("Move left") + '">◀' + kb("A") + '</button><button type="button" class="mv" data-hold="r" aria-label="' + T("Move right") + '">▶' + kb("D") + "</button></div>" +
        '<ul class="keys">' + T(R.blocker ? KEYS_BLOCK : KEYS_ALL).split(" · ").map((x) => "<li>" + U.esc(x) + "</li>").join("") + "</ul>" +
        '<div class="acts"><button type="button" class="skill" data-act="skill"' + (R.skill ? "" : " disabled") + '><svg class="ring" viewBox="0 0 40 40" aria-hidden="true"><circle class="bg" cx="20" cy="20" r="18"/><circle class="fg" cx="20" cy="20" r="18" stroke-dasharray="113.1" stroke-dashoffset="0"/></svg><span>' + skill + "</span>" + kb("L") + "</button>" +
          (R.blocker ? '<button type="button" class="roll block" data-hold="block" aria-label="' + T("Block") + '"><span class="rl">' + T("Block") + "</span>" + kb("K") + "</button>"
            : '<button type="button" class="roll" data-act="roll"><span class="rl">' + T("Roll") + "</span>" + kb("K") + "</button>") +
          '<button type="button" class="strike" data-act="strike"><svg class="ring lockring" viewBox="0 0 40 40" aria-hidden="true"><circle class="fg" cx="20" cy="20" r="18" stroke-dasharray="113.1" stroke-dashoffset="0"/></svg>' + T("Strike") + "<small>" + T(COMBO_LABEL[RT.comboOf(R).length] || "×3 combo") + "</small>" + kb("J") + "</button></div></div>" +
      '<div class="sheet orders-sheet" role="dialog" aria-label="' + T("Orders") + '" hidden></div>' +
      '<div class="sheet aid-sheet dropdown" role="dialog" aria-label="' + T("Aid") + '" hidden></div>' +
      '<div class="sheet pause-sheet" role="dialog" aria-label="' + T("Paused") + '" hidden></div></div>');
    document.body.appendChild(el);
    document.body.classList.add("in-rt");
    V.el = el; V.stage = el.querySelector("#rt-stage"); V.world = el.querySelector("#rt-world"); V.tags = el.querySelector(".tags");
    const bg = U.FIGHT_BG && U.FIGHT_BG[enc.id];
    V.art = [U.artUrl(K.val(enc.stage) || K.val(enc.art)), U.fightTall(bg)];
    el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); act(b.dataset.act); }));
    el.querySelectorAll("[data-hold]").forEach((b) => {
      const k = b.dataset.hold;
      const on = (e) => { if (e.cancelable) e.preventDefault(); V.held[k] = true; b.classList.add("held"); }; // a touch the phone is already scrolling with cannot be held back (and Chrome says so in red)
      const off = () => { if (!V) return; V.held[k] = false; b.classList.remove("held"); };
      b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
      b.addEventListener("contextmenu", (e) => e.preventDefault());
      // iPhone: a held touch would otherwise start a text selection or the look-up bubble.
      b.addEventListener("touchstart", (e) => { if (e.cancelable) e.preventDefault(); on(e); }, { passive: false });
      b.addEventListener("touchend", off); b.addEventListener("touchcancel", off);
    });
    el.addEventListener("selectstart", (e) => e.preventDefault());
    // A text field still focused from an earlier screen (the name on the character page, a save code) keeps the
    // phone's keyboard bar and its autofill suggestions up over the fight: let it go.
    const fe = document.activeElement;
    if (fe && fe !== document.body && fe.matches && fe.matches("input, textarea, [contenteditable]")) fe.blur();
    // Mouse on a laptop: click the ground to walk, a foe to strike; right- or Shift-click rolls. Touch: a swipe changes row.
    V.stage.addEventListener("contextmenu", (e) => e.preventDefault());
    V.stage.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button, .sheet, .hud")) return;
      const r = V.stage.getBoundingClientRect(), x = (e.clientX - r.left - V.G.fx0) / V.G.FW;
      if (e.pointerType === "touch" && !V.touched) { V.touched = true; layout(); } // a touch on a laptop's screen: the corner controls
      if (e.pointerType !== "mouse") { V.swipe = { x: e.clientX, y: e.clientY, t: performance.now() }; return; }
      const p = C.player();
      if ((e.button === 2 || e.shiftKey) && V.R.blocker) { V.held.block = true; V.mouseBlock = true; return; } // held while the button is
      if (e.button === 2 || e.shiftKey) { V.queue.roll = true; V.queue.rollDir = x >= p.rt.x ? 1 : -1; return; }
      if (e.button !== 0) return;
      const foe = foeAt(e.clientX - r.left, e.clientY - r.top);
      if (foe && RT.spareable(V.R).some((u) => u.uid === foe)) { V.queue.spare = foe; return; }
      V.walk = { x, foe };
    });
    V.stage.addEventListener("pointerup", (e) => {
      if (V.mouseBlock) { V.mouseBlock = false; V.held.block = false; }
      const sw = V.swipe; V.swipe = null;
      if (!sw || performance.now() - sw.t > 600) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx) * 1.2) { V.queue.row = dy < 0 ? 1 : -1; return; }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) { const r = V.stage.getBoundingClientRect(), foe = foeAt(e.clientX - r.left, e.clientY - r.top); if (foe && RT.spareable(V.R).some((u) => u.uid === foe)) V.queue.spare = foe; } // spare: a tap on the beaten foe
    });
    window.addEventListener("keydown", onKey, true); window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("resize", onResize); document.addEventListener("visibilitychange", onHidden);
    document.addEventListener("pointerdown", dropOutside, true);
    layout();
  }
  // The living foe drawn under a point of the stage (figures let clicks through): its body's box, the nearest first.
  function foeAt(px, py) {
    const G = V.G; if (!G) return null;
    let best = null, bd = 1e9;
    V.actors.forEach((a) => {
      const u = a.u; if (u.side !== "enemy" || u.hp <= 0 || u.spared || !u.rt || !u.rt.entered || a.x == null) return;
      const hw = Math.max(a.bw * 0.7, 22), foot = G.H - a.gy, d = Math.abs(px - a.x);
      if (d <= hw && py >= foot - a.fh * 1.05 && py <= foot + 10 && d < bd) { bd = d; best = u.uid; }
    });
    return best;
  }
  // The layout page's layout(): upright or wide by the screen's shape; the stage takes what the controls leave.
  function layout() {
    if (!V) return;
    const vw = window.innerWidth, vh = window.innerHeight, scr = V.el;
    const wide = vw >= 820 && vw / vh >= 1.15;
    const touch = !!((window.matchMedia && matchMedia("(pointer: coarse)").matches) || V.touched); // a boolean: undefined would toggle the class on
    scr.classList.toggle("wide", wide); scr.classList.toggle("upright", !wide); scr.classList.toggle("touch", wide && touch);
    scr.style.setProperty("--bh", (wide ? 40 : 44) + "px"); scr.style.setProperty("--hb", "0px");
    const W = V.stage.clientWidth, H = V.stage.clientHeight;
    V.stage.style.backgroundImage = "url(" + (H > W * 1.25 && V.art[1] ? V.art[1] : V.art[0]) + ")";
    const FIELD = 1 / RT.BODY;
    const ph = wide ? Math.min(H * 0.3, W / (FIELD * 0.36)) : Math.min(H * 0.3, W * 0.52); // a tall phone: the front row's figure about 29% of the stage
    const FW = wide ? Math.min(W, ph * 0.36 * FIELD) : W;
    RT.fallLen = Math.max(0.12, Math.min(0.5, ph * 0.9 / FW)); // a figure lying, in field widths (RT.fallDir)
    V.G = { W, H, ph, FW, fx0: (W - FW) / 2, dk: 0.12, gl: wide && !scr.classList.contains("touch") ? Math.max(H * 0.06, 46) : H * (wide ? 0.06 : 0.05), dstep: H * (wide ? 0.1 : 0.11), wide };
    // The fight's scale: a front-row figure's width in the field's body widths (about 1.8 on a phone, 1 on a laptop), so
    // that two who fight stand where their weapons reach, as drawn (engine RT.setScale).
    if (RT.setScale && V.R) RT.setScale(V.R, ph * 0.36 / (FW / FIELD));
    V.actors.forEach((a) => size(a));
    fitSkill();
    const eL = $(".edgefx.l"), eR = $(".edgefx.r"); if (eL) { eL.style.width = eR.style.width = (V.G.fx0 + FW * 0.12) + "px"; }
    if (V.sheet === "orders" || V.sheet === "aid") placeDrop($("." + V.sheet + "-sheet"), $(".hb." + V.sheet));
  }
  // A long skill name (Ground-shaker, Hindi) fits its ring: smaller, on two lines if it must.
  function fitSkill() {
    const b = $(".acts .skill"), sp = b && b.querySelector("span");
    if (!sp || !b.offsetWidth) return;
    sp.style.fontSize = ""; sp.style.maxWidth = (b.clientWidth - 8) + "px";
    let fs = parseFloat(getComputedStyle(sp).fontSize) || 14;
    const kb = b.querySelector("kbd"), room = () => b.clientHeight - 6 - (kb && kb.offsetHeight ? kb.offsetHeight + 2 : 0);
    while (fs > 9.5 && (sp.scrollWidth > b.clientWidth - 6 || sp.offsetHeight > room())) { fs -= 0.5; sp.style.fontSize = fs + "px"; }
  }
  function onResize() { if (!V) return; const o = V.G && V.G.W > V.G.H; layout(); if (V.G && (V.G.W > V.G.H) !== o) pause(true); } // turning the phone pauses
  function onHidden() { if (V && document.hidden) pause(true); }

  // ---------- Figures (the layout page's Actor) ----------
  function actorFor(u) {
    let a = V.actors.get(u.uid);
    if (a) return a;
    const foe = u.side === "enemy", spec = specFor(u);
    const el = U.el('<div class="actor ' + (u.side === "player" ? "me" : foe ? "foe" : "ally") + '" data-uid="' + u.uid + '" data-id="' + u.uid + '"><span class="shadow"></span><div class="fl">' +
      U.puppet(spec, { pose: U.motion() ? "live" : u.side === "player" ? "brace" : "stand", h: 200 }) + "</div>" + (u.side === "player" ? "" : '<span class="mini"><b></b></span>') + "</div>");
    V.world.appendChild(el);
    // The health bar sits above the head: higher for a tall figure, and higher still over a crown (it crossed Ashwatthama's face).
    { const tall = /^(crown|kirita|mukuta)$/.test(spec.headgear || "") ? 0.26 : spec.headgear === "crest" ? 0.12 : 0; el.style.setProperty("--barh", (1.04 * (spec.size || 1) + tall).toFixed(2)); }
    const svg = el.querySelector("svg.pp");
    const vb = (svg.getAttribute("viewBox") || "0 0 120 200").split(/[\s,]+/).map(Number);
    const bow = !!svg.querySelector('.it:not(.it-w) path[d="M50 86 L50 166"]');
    a = { u, el, svg, fl: el.querySelector(".fl"), vbW: vb[2], vbH: vb[3], sc: 210 / vb[3], spec, d: u.rt.lane, base: bow ? "bowready" : svg.dataset.stance && foe ? svg.dataset.stance : "ready",
      name: u.side === "player" ? K.tr("You") : (u.side === "ally" && (u.person || u.called)) || (foe && (u.person || u.hero)) ? K.text(u.src || u.name).split(",")[0] : null };
    a.rig = U.motion() && U.rig ? U.rig(svg, el, a.base, { fight: true }) : null;
    V.actors.set(u.uid, a);
    size(a);
    return a;
  }
  function size(a) {
    const G = V.G; if (!G) return;
    a.d = a.u.rt ? a.u.rt.lane : 0;
    const k = 1 - G.dk * Math.max(0, a.d);
    a.fh = G.ph * k; a.bw = a.fh * 0.36;
    const svgH = a.fh * 210 / 164, svgW = svgH * a.vbW / a.vbH;
    a.svg.style.height = svgH.toFixed(1) + "px"; a.svg.style.width = svgW.toFixed(1) + "px";
    a.fl.style.bottom = (-(200 + 10 / a.sc - 193) / (210 / a.sc) * svgH).toFixed(1) + "px";
    a.el.style.setProperty("--fh", a.fh.toFixed(1) + "px");
  }
  function pose(a, p, k, z) { if (!a) return; if (a.rig) a.rig.set(p, k || 900, z == null ? 0.5 : z); else a.svg.setAttribute("class", a.svg.getAttribute("class").replace(/\bpose-\S+/, "pose-" + ({ windup: "strike", ready: "brace", bowready: "brace", draw: "aim", duck: "duck", kneel: "kneel", loose: "loose" }[p] || p))); }
  // (a.windAt: when this figure last began to wind up a blow; a return home that was planned before it is dropped, so a
  // blow wound up straight after another keeps its wind-up: the strike and defence study, 8 November, found the mace's
  // sweep reset to the guard mid-wind-up by the smash's return home, so it never went behind the body)
  function home(a, ms) { const planned = performance.now(); setTimeout(() => { if (!V || !a.u) return; if (a.swing && performance.now() - a.swing.t0 < 300) return; // a new blow begun meanwhile keeps its swing
    if (a.windAt && a.windAt > planned) return;
    if (a.rig) { a.rig.t.dx = 0; a.rig.t.dy = 0; if (a.armed) { a.rig.unwield(); a.armed = false; } }
    if (a.u.side === "player" && V.R.block && a.u.hp > 0) { pose(a, "shieldUp", 1500, 0.6); return; } // the shield stays up while held
    if (a.walled && a.u.hp > 0) { pose(a, a.u.side === "player" ? "shieldUp" : "guard", 900, 0.6); return; } // and under a shield wall (the clash's opening)
    if (a.u.rt && a.u.rt.beaten && a.u.hp > 0) pose(a, "kneel", 600, 0.6); else if (a.rig && a.u.hp > 0) a.rig.set(a.base, 520, 0.42); else if (!a.rig && a.u.hp > 0) pose(a, a.u.side === "player" ? "brace" : "stand"); }, ms || 0); }
  // ---------- Blows that land (owner, 4 November: room for the weapons; the blow falls on the body or the weapon) ----------
  // A swing ends with the weapon's tip on the one struck: U.aimBlow (puppet-anim.js) turns the arm about the shoulder
  // and sets the lunge, measured on the live figures; at the moment of contact U.blowImpact puts the figure at the end
  // of the swing and gives the point where the weapon meets the body (or the shield, or the blade that parries it),
  // and the hit-stop, the flash, the flakes and the sparks are all there.
  const IMPACT = 95; // ms from the start of a swing to contact
  const MELEE_KIND = new Set(["mace", "sword", "woodsword", "spear", "dagger", "club", "hammer"]);
  function armFor(a) { // a bowman (or one with a whip, a scroll, a bowl) strikes with the blade he draws for it
    const w = a.u.rt && a.u.rt.weapon, own = a.spec && a.spec.item;
    if (!a.rig || !w || w === "fist" || w === own || MELEE_KIND.has(own)) return;
    a.rig.wield(w); a.armed = true;
  }
  function guardOf(t) {
    if (!t || !t.svg) return null;
    const up = t.sparkAt && performance.now() - t.sparkAt < 250 || t.shieldUp || (t.rig && (t.rig.pose === "guard" || t.rig.pose === "block"));
    if (!up) return null;
    return t.svg.querySelector(".pp-body .it-s") ? "shield" : t.svg.querySelector(".pp-body .foreF .it-w") ? "weapon" : null;
  }
  // arc: a mace's smash or sweep (U.MACE_ARCS): the blow ends in its own pose and falls where it falls (shoulders, ribs).
  function swing(a, t, guard, arc) {
    if (!a || a.u.hp <= 0) return;
    const now = performance.now(), again = a.swing && now - a.swing.t0 < IMPACT + 60; // the blow already in the air, re-aimed at whom it strikes
    const A = arc && U.ARCS ? U.ARCS[arc] : null;
    armFor(a);
    a.swing = { t0: again ? a.swing.t0 : now, on: t ? t.u.uid : null, aim: null, arc };
    if (a.rig && t && t.u.hp > 0 && t !== a) a.swing.aim = U.aimBlow(a.rig, t.svg, { guard, k: A && U.MACE_ARCS[arc] ? 1500 : 1700, z: 0.55, pose: A ? A.end : undefined, at: A ? A.at : undefined, under: A && A.under != null ? A.under : undefined, straight: A && A.straight, near: A && A.near });
    // A mace's swing leaves a short trail behind its head, so its arc reads (the strike and defence study, 8 November)
    if (A && U.MACE_ARCS[arc] && a.rig && !U.calm()) a.trailUntil = a.swing.t0 + IMPACT + 300;
    if (!a.swing.aim) pose(a, A ? (U.MACE_ARCS[arc] ? "sweep" : A.end) : "strike", 1600, 0.55); // (a mace blow that finds no one follows through level, not into the ground)
    home(a, A && U.MACE_ARCS[arc] ? 560 : 460);
  }
  function landHit(f) { // a melee blow: the struck one reacts when the weapon reaches it
    const a = V.actors.get(f.uid), by = f.by != null && V.actors.get(f.by);
    if (!a) return;
    if (!f.melee || !by || by === a) return struck(a, f, null);
    by.swingOn = null;
    const guard = guardOf(a);
    swing(by, a, guard, f.arc || (by.u.side === "player" ? by.blowArc : by.atkArc));
    const sw = by.swing, wait = Math.max(0, sw.t0 + IMPACT - performance.now());
    setTimeout(() => {
      if (!V || !a.el.isConnected) return;
      const res = sw.aim && by.swing === sw ? U.blowImpact(sw.aim) : null, wr = V.world.getBoundingClientRect();
      let pt;
      if (res) pt = { x: res.x - wr.left, y: res.y - wr.top, on: res.on };
      else { const r = (a.svg.querySelector(".pp-torso") || a.svg).getBoundingClientRect(); pt = { x: r.left + r.width / 2 - wr.left, y: r.top + r.height * 0.3 - wr.top, on: guard || "body" }; }
      const bu = by.u, au = a.u; // for the fit checks (tests/blowfit.js): where the tip fell, and how far apart the two stood
      (V.impacts = V.impacts || []).push({ by: bu.uid, on: au.uid, res, guard, apart: bu.rt && au.rt ? Math.abs(bu.rt.x - au.rt.x) : null, reach: bu.rt && bu.rt.reach, rows: bu.rt && au.rt ? Math.abs(bu.rt.lane - au.rt.lane) : 0, t: V.R.t });
      if (V.impacts.length > 60) V.impacts.shift();
      struck(a, f, pt);
      const arc = f.arc || (by.u.side === "player" ? by.blowArc : by.atkArc);
      const hitAt = performance.now();
      if (!f.blocked && (!res || res.on === "body")) setTimeout(() => { if (!(by.windAt > hitAt)) followThru(by, arc); }, f.heavy ? 80 : 50); // after the hit-stop (not over a new wind-up)
      home(by, (f.heavy ? 80 : 50) + (f.arc ? 300 : 170)); // a mace's follow-through is held a little longer
    }, wait);
  }
  // The blow carries on through (U.ARCS[arc].thru): the arm and the weapon turn on from where they struck, the body leans
  // into it; the step it took is kept. A blow on a shield or a weapon stops where it met them.
  // Whether the next blow coming at u comes high (a cut, a smash; the soonest of those marked on him).
  const HIGH = new Set(["cut", "smash"]);
  function threatHigh(R, u) {
    let best = null;
    for (const e of R.B.units) { if (e.side === "player" || e.side === u.side || e.hp <= 0 || !e.rt || !e.rt.atk || e.rt.atk.on !== u.uid || e.rt.atk.ranged || e.rt.atk.area) continue; if (!best || e.rt.atk.land < best.rt.atk.land) best = e; }
    const ba = best && V.actors.get(best.uid);
    return !!(ba && HIGH.has(ba.atkArc || "cut"));
  }
  function followThru(a, arc) {
    const T = arc && U.ARCS && U.ARCS[arc] && U.ARCS[arc].thru, r = a && a.rig;
    if (!T || !r || a.u.hp <= 0 || U.calm() || r.falling) return;
    const arm = r.t.armF, item = r.t.item, dx = r.t.dx, dy = r.t.dy;
    r.set(T.pose, 700, 0.62);
    r.t.armF = T.arm > 0 ? Math.min(arm + T.arm, T.lim) : Math.max(arm + T.arm, T.lim);
    r.t.item = item + T.item; r.t.dx = dx; r.t.dy = dy;
  }
  function struck(a, f, pt) {
    // Taken on a raised shield (yours, or his): a clang, not a wound (the strike and defence study, 8 November: a perfect
    // block flashed the red "you were hit" edge, and "Blocked" came with a damage number like any wound): a pale rim, the
    // shield arm jolted, and what little gets through as a small gold number.
    const cls = f.blocked ? "clang" : "hit";
    a.el.classList.add(cls); setTimeout(() => a.el.classList.remove(cls), f.blocked ? 160 : 90);
    // (the shield punched out to meet the blow, then jolted back; a heavy blow on the body reels him back on his heels, so
    // its knock-back shows: the study, 8 November)
    const shrug = !f.heavy && !f.blocked && f.melee && a.u.side === "enemy" && a.u.hp > 0 && RT.tierOf && RT.STRENGTH && RT.STRENGTH.flinch[RT.tierOf(a.u)] === 0;
    if (a.u.side === "player" && !f.blocked && f.n && a.u.rt && (a.u.rt.busy > 0 || a.u.rt.blow) && RT.P.swingLock) tipOnce("tipCaught", "Hit in the middle of your own swing. When the ! shows over you, a blow will land before your swing ends: wait, then block or roll.");
    if (a.rig) a.rig.kick(f.blocked ? (a.u.side === "enemy" ? { rot: 90, armB: -260, tx: 8 } : { rot: -90, armB: -260, tx: 8 })
      : shrug ? { rot: 50, head: 90 }
      : f.heavy && a.u.hp > 0 ? (a.u.side === "enemy" ? { rot: 420, head: 300, tx: -26 } : { rot: -420, head: -300, armF: 200, tx: -26 })
      : a.u.side === "enemy" ? { rot: 220, head: 180 } : { rot: -260, head: -200, armF: 160 });
    // A great champion takes a light blow without a flinch (Build D: only a heavy one staggers him): a dull puff where it
    // landed and a shrug, so you see it land and see him shrug it off; the first time, a tip.
    if (shrug) { a.el.classList.add("shrug"); setTimeout(() => a.el.classList.remove("shrug"), 260); if (f.by != null && V.actors.get(f.by) && V.actors.get(f.by).u.side === "player") tipOnce("tipShrug", "A great champion shrugs off your light blows: only the heavy one at the end of your combo staggers him."); }
    if (f.n) pop(a, String(f.n), f.blocked ? "chip" : a.u.side === "player" ? "me" : a.u.side === "ally" ? "ally" : "");
    if (U.rigFreeze) U.rigFreeze(f.heavy ? 80 : 50);
    if (f.heavy || (a.u.side === "player" && !f.blocked)) shake(false);
    const clash = pt && pt.on !== "body";
    if (pt) {
      const fl = document.createElement("i"); fl.className = "impact" + (clash ? " clash" : shrug ? " shrug" : ""); fl.style.left = pt.x + "px"; fl.style.top = pt.y + "px";
      V.world.appendChild(fl); setTimeout(() => fl.remove(), 320);
      if (U.flingBits) { if (clash) U.flingBits(V.world, "spark", pt, 10, 12, null, true); else U.flingBits(V.world, "flake", pt, shrug ? 4 : 6, Math.max(8, a.bw * (shrug ? 0.12 : 0.2)), shrug ? "#a39684" : "#8a3a2a"); }
    } else if (a.sparkAt && performance.now() - a.sparkAt < 250) sparkAt(a);
    a.sparkAt = 0;
    if (K.Sound) K.Sound.play(clash ? "clang" : "hit");
  }
  // Blade on blade (the parry, RT.P.parry): the one whose blow is met swings on into the other's weapon; sparks fly where
  // they meet, a clang, and he reels back. byFoe: a champion met your blow (you reel). part: a dagger could only half stop it.
  function parried(a, b, part, byFoe) {
    if (!a || !b || !V) return;
    a.swingOn = null;
    // (met where the blow comes, the strike and defence study: overhead for a cut or a smash, across the chest for the rest)
    const metArc = byFoe ? a.blowArc : a.atkArc, gp = HIGH.has(metArc || "cut") ? "guard" : "guardMid";
    if (!byFoe) { pose(b, gp, 700, 0.6); if (b.rig) { b.rig.t.dx = 0; b.rig.t.dy = 0; } } // your blade comes up to meet it
    else pose(b, gp, 500, 0.6);
    swing(a, b, "weapon", byFoe ? b.blowArc : a.atkArc);
    const sw = a.swing, wait = Math.max(0, (sw ? sw.t0 : performance.now()) + IMPACT - performance.now());
    setTimeout(() => {
      if (!V || !a.el.isConnected || !b.el.isConnected) return;
      const res = sw && sw.aim && a.swing === sw ? U.blowImpact(sw.aim) : null, wr = V.world.getBoundingClientRect();
      let pt;
      if (res) pt = { x: res.x - wr.left, y: res.y - wr.top };
      else { const w = b.svg.querySelector(".foreF .it-w") || b.svg.querySelector(".pp-torso") || b.svg, r = w.getBoundingClientRect(); pt = { x: r.left + r.width / 2 - wr.left, y: r.top + r.height * 0.3 - wr.top }; }
      const fl = document.createElement("i"); fl.className = "impact clash parryhit"; fl.style.left = pt.x + "px"; fl.style.top = pt.y + "px";
      V.world.appendChild(fl); setTimeout(() => fl.remove(), 420);
      if (U.flingBits) U.flingBits(V.world, "spark", pt, part ? 8 : 16, 16, null, true);
      if (U.rigFreeze) U.rigFreeze(part ? 50 : 110);
      if (K.Sound) K.Sound.play("clang");
      if (part) { pop(b, K.tr("Too heavy to stop"), "miss"); home(a, 250); home(b, 400); return; }
      pop(byFoe ? b : a, K.tr("Parried!"), "miss");
      pose(a, "strain", 700, 0.45); if (a.rig) a.rig.kick({ rot: 170 * (a.u.rt ? -a.u.rt.face : 1), tx: 22 });
      home(a, byFoe ? 500 : 950); home(b, 350);
    }, wait);
    if (byFoe && !part) toast(K.tr("{n} parries your blow", { n: b.name || K.tr("He") }));
    else if (!part) toast(K.tr("Parried"));
  }
  function sparkAt(a) { // sparks from the middle of the shield (an arrow on it)
    const wr = V.world.getBoundingClientRect(), sh = a.svg.querySelector(".it-s") || a.svg.querySelector(".pp-body"), r = sh.getBoundingClientRect();
    if (U.flingBits) U.flingBits(V.world, "spark", { x: r.left + r.width / 2 - wr.left, y: r.top + r.height / 2 - wr.top }, 9, 16, null, true);
  }
  // The foe a blow of yours is likely to fall on (the engine's own choice comes with the hit).
  function inFront(p) { let best = null, bd = 9; for (const e of V.R.B.units) { if (e.side !== "enemy" || e.hp <= 0 || !e.rt || !e.rt.entered) continue; const d = (e.rt.x - p.rt.x) * p.rt.face; if (d > -0.03 && d < bd) { bd = d; best = e; } } return best && V.actors.get(best.uid); }
  // Name tags: a small pill at the waist, nudged off the shield; for 2 s at a time.
  // On a layer over every figure (.tags), so no figure in front hides it; placed each frame while it shows.
  function nameTag(a, s) {
    if (!a || !a.name || a.u.hp <= 0) return;
    let t = a.tag;
    if (!t) { t = a.tag = document.createElement("span"); t.className = "nametag"; t.textContent = a.name; V.tags.appendChild(t); }
    placeTag(a);
    t.classList.add("on"); clearTimeout(t.off); t.off = setTimeout(() => t.classList.remove("on"), (s || 2) * 1000);
  }
  function placeTag(a) {
    const t = a.tag; if (!t || a.x == null) return;
    t.style.bottom = (a.gy + a.fh * (a.u.rt && a.u.rt.beaten ? 0.3 : 0.4)) + "px"; t.style.left = (a.x - (a.u.rt ? a.u.rt.face : 1) * a.fh * 0.05) + "px";
  }
  function nameTagsAll(s) { V.actors.forEach((a) => nameTag(a, s)); }
  function pop(a, text, cls, lift) {
    const el = document.createElement("span"); el.className = "pop " + (cls || ""); el.textContent = text;
    el.style.left = (V.G ? Math.min(Math.max(a.x, 64), V.G.W - 64) : a.x) + "px"; el.style.bottom = (a.gy + a.fh * (1.08 + (lift || 0))) + "px"; V.world.appendChild(el); // (kept off the edges)
    if (U.calm()) { setTimeout(() => el.remove(), 700); return; }
    el.animate([{ transform: "translate(-50%,4px)", opacity: 0 }, { transform: "translate(-50%,-4px)", opacity: 1, offset: 0.15 }, { transform: "translate(-50%,-38px)", opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = () => el.remove();
  }
  // A line across the stage, up long enough to read (the full check, 10 November: a tip shown once, 130 letters, was up
  // 1.6 s and ran under the fight's goal line on a phone). The goal line sits just below it while both are up, and a
  // tip (tipOnce) has its first 3 s before a passing line ("Winded", "Parried": those come again; a tip does not) takes its place.
  function toast(s, tip) {
    const el = $(".toast", V.stage), now = performance.now();
    if (!tip && V.tipTill && now < V.tipTill) return;
    const hold = Math.min(6000, Math.max(1600, String(s).length * 45)), at = V;
    el.textContent = s; el.classList.remove("off"); clearTimeout(V.toastT);
    V.tipTill = tip ? now + Math.min(hold, 3000) : 0;
    V.toastT = setTimeout(() => { el.classList.add("off"); at.tipTill = 0; if (V === at) clearOfToast(); }, hold);
    clearOfToast();
  }
  function clearOfToast() {
    const l = $(".wd-fbline", V.stage), t = $(".toast", V.stage); if (!l) return;
    l.style.top = "";
    if (!t || t.classList.contains("off")) return;
    const below = t.offsetTop + t.offsetHeight + 6;
    if (l.offsetTop < below && l.offsetTop + l.offsetHeight > t.offsetTop) l.style.top = below + "px";
  }
  function shake(big) { if (U.calm()) return; V.stage.classList.remove("shake", "bigshake"); void V.stage.offsetWidth; V.stage.classList.add(big ? "bigshake" : "shake"); }
  function fell(a) {
    a.el.classList.add("dead"); a.el.classList.remove("windup"); a.el.style.zIndex = "4";
    if (a.tag) a.tag.classList.remove("on");
    // Away from the blow that felled him, where there is room (RT.fallDir): forward when that is the way he faces, else
    // backward. Knees first (the strike and defence study, 8 November: they toppled stiff as planks): the legs give, then
    // the body goes over with them bent.
    const toward = RT.fallDir(a.u), fwd = toward === (a.u.rt ? a.u.rt.face : 1) ? 1 : -1;
    if (a.rig && !U.calm()) { a.rig.set("buckle", 2400, 0.55); const r = a.rig; setTimeout(() => { if (r.svg.isConnected) r.fallDown(-86, fwd, null, true); }, 170); }
    else if (a.rig) a.rig.fallDown(-86, fwd, null, true); else pose(a, "fall");
    const flung = a.u.rt && a.u.rt.flung != null && V.R.t - a.u.rt.flung < 3; // thrown by a divine weapon: the weapon flies
    const item = a.svg.querySelector(".it"), kind = a.spec && a.spec.item, svgW = WEAPON[kind] || (kind ? WEAPON.sword : null);
    if (item && svgW && !a.dropped) {
      item.style.visibility = "hidden"; a.dropped = true;
      const w = document.createElement("div"); w.className = "dropped"; w.innerHTML = svgW;
      const len = a.fh * (kind === "spear" ? 0.62 : 0.42), side = -toward;
      Object.assign(w.style, { left: (a.x - side * a.bw * 0.15 - len / 2) + "px", bottom: (a.gy - 2) + "px", width: len + "px" });
      V.world.appendChild(w); a.weaponEl = w;
      const rot = side * 7;
      if (!U.calm() && flung) w.animate([{ transform: "translate(" + (side * a.bw) + "px," + (-a.fh * 0.6) + "px) rotate(0deg)" }, { transform: "translate(" + (-side * a.bw * 0.4) + "px," + (-a.fh * 1.25) + "px) rotate(" + (-side * 380) + "deg)", offset: 0.45 }, { transform: "translate(0,0) rotate(" + (rot - side * 720) + "deg)" }], { duration: 900, easing: "cubic-bezier(.3,.5,.6,1)", fill: "forwards" });
      else if (!U.calm()) w.animate([{ transform: "translateY(" + (-a.fh * 0.5) + "px) rotate(" + (-side * 70) + "deg)" }, { transform: "translateY(0) rotate(" + rot + "deg)" }], { duration: 520, easing: "ease-in", fill: "forwards" });
      else w.style.transform = "rotate(" + rot + "deg)";
    }
  }

  // ---------- Input ----------
  const KEY = { KeyJ: "strike", KeyK: "roll", Space: "roll", KeyL: "skill", KeyH: "herbs", KeyC: "call", KeyU: "astra", KeyO: "orders", KeyP: "pause", Escape: "pause", KeyE: "spare" };
  function onKey(e) {
    if (!V || V.tracing) return; // (a mantra being traced has the keys: ui/fx.js U.mantra)
    if (V.written) { if (e.code === "Enter" || e.code === "Space" || e.code === "KeyJ") V.written(e); else { e.preventDefault(); e.stopPropagation(); } return; }
    if (V.briefing) { // the rules card or the walkthrough is up: its own keys, nothing reaches the fight
      e.preventDefault(); e.stopPropagation();
      if (e.repeat) return;
      if (V.tourNext) { if (e.code === "Escape") V.tourEnd(true); else if (["Space", "Enter", "ArrowRight", "NumpadEnter"].includes(e.code)) V.tourNext(); }
      else if (V.briefGo && ["Space", "Enter", "NumpadEnter", "KeyJ"].includes(e.code)) V.briefGo();
      return;
    }
    if (e.code === "KeyA" || e.code === "ArrowLeft") { V.held.l = true; e.preventDefault(); e.stopPropagation(); return; }
    if (e.code === "KeyD" || e.code === "ArrowRight") { V.held.r = true; e.preventDefault(); e.stopPropagation(); return; }
    if ((e.code === "KeyK" || e.code === "Space") && blocker()) { V.held.block = true; e.preventDefault(); e.stopPropagation(); if (V.sheet) closeSheet(); return; } // held up while held
    if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "KeyS" || e.code === "ArrowDown") { e.preventDefault(); e.stopPropagation(); if (!e.repeat && !V.sheet) V.queue.row = e.code === "KeyW" || e.code === "ArrowUp" ? 1 : -1; return; }
    const a = KEY[e.code];
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    if (e.repeat && a !== "strike") return;
    if (V.sheet && (a === "pause" || a === "orders")) return closeSheet();
    act(a);
  }
  function onKeyUp(e) { if (!V) return; if (e.code === "KeyA" || e.code === "ArrowLeft") V.held.l = false; if (e.code === "KeyD" || e.code === "ArrowRight") V.held.r = false; if (e.code === "KeyK" || e.code === "Space") V.held.block = false; }
  function act(a) {
    if (!V) return;
    const R = V.R;
    switch (a) {
      case "orders": return V.sheet === "orders" ? closeSheet() : sheet("orders");
      case "aid": return V.sheet === "aid" ? closeSheet() : sheet("aid");
      case "pause": return V.sheet === "pause" ? closeSheet() : sheet("pause");
      case "withdraw": return withdraw();
    }
    if (a.indexOf("astra:") === 0) { if (V.sheet) closeSheet(); return trace(a.slice(6)); } // one divine weapon, chosen by name (item 12)
    if (a === "astra" && RT.astras(R).filter((x) => !x.why).length > 1 && V.sheet !== "aid") return sheet("aid"); // two or more ready: choose which
    if (V.sheet) closeSheet();
    if (a === "astra") { const all = RT.astras(R), ready = all.filter((x) => !x.why); if (!ready.length) return toast(all[0] ? all[0].why || K.tr("Not ready yet") : K.tr("You were never given a divine weapon")); return trace(ready[0].id); }
    if (a === "spare") { const t = RT.spareable(R)[0]; if (t) V.queue.spare = t.uid; else if (C.spareable().length) toast(K.tr("Step closer to spare him")); return; }
    if (a === "roll" && !RT.can(R, "roll") && R.roll <= 0) toast(K.tr("Winded"));
    if (a === "skill" && R.skill && !RT.can(R, "skill")) toast(K.tr("Not ready yet"));
    if (a === "herbs" && !RT.can(R, "herbsSoon")) toast(K.tr((K.S.items.herbs || 0) > 0 ? "Not now" : "No herbs left"));
    if (a === "call" && !RT.can(R, "call")) toast(K.tr("Used this battle"));
    V.queue[a] = true;
  }
  // A divine weapon: its mantra traced first (ui/fx.js U.mantra), the fight standing still meanwhile. Traced, the weapon is
  // loosed; broken, nothing happens, no use is spent, and the weapons wait (RT.P.mantraRest); Escape lets it go.
  function trace(id) {
    if (!V || V.tracing) return;
    V.tracing = true; V.paused = true;
    U.mantra(id, { free: K.astraChampion(V.R.B.units) }, (ok, cancel) => {
      if (!V) return;
      V.tracing = false; V.paused = !!V.sheet; V.last = 0;
      if (cancel) return;
      if (ok) V.queue.astra = id; else V.queue.astraFail = id;
    });
  }
  // Withdraw asks "Are you sure?" only when it would break a vow.
  function withdraw() {
    if (!C.canFlee()) return;
    if (C.fleeBreaks().length && V.sheet !== "confirm") return sheet("confirm");
    closeSheet(); V.queue.withdraw = true;
  }
  function pause(on) { if (V && on && !V.sheet) sheet("pause"); }

  // ---------- Sheets: Orders and Aid as compact panels over the controls; Pause, the second try ----------
  function sheet(kind) {
    const R = V.R, p = C.player();
    closeSheet(true);
    V.sheet = kind; V.paused = true;
    const btn = (attr, v, label, short, on) => '<button type="button" data-' + attr + '="' + v + '" aria-pressed="' + !!on + '" title="' + T(short) + '">' + T(label) + "</button>";
    if (kind === "orders") {
      const el = $(".orders-sheet");
      const friend = R.B.units.find((u) => u.side === "ally" && u.hp > 0 && (u.called || u.person) && !u.still);
      const soldiers = R.B.units.some((u) => u.side === "ally" && u.hp > 0 && u.plural && !u.person && !u.called);
      const SO = { defend: ["Defend", "They hold near you and take your blows."], allout: ["All-out", "They charge the nearest foe."], stay: ["Stay out", "They keep out of the fight."] };
      const FR = { balanced: ["Balanced", "Fights the foe nearest you."], guard: ["Guard me", "Stays by you, strikes what comes."], allout: ["All-out", "Charges, never falls back."], hold: ["Hold back", "Keeps behind you, out of it."] };
      const fname = friend ? K.text(friend.src || friend.name).split(",")[0] : "";
      el.innerHTML = '<button type="button" class="grp" data-grp></button>' +
        (soldiers ? '<div class="sec so"><div class="crow"><h3>' + T("Soldiers") + '</h3><div class="chips three">' + Object.entries(SO).map(([k, v]) => btn("so", k, v[0], v[1], R.orders.soldiers === k)).join("") + '</div></div><p class="desc1">' + T(SO[R.orders.soldiers][1]) + "</p></div>" : "") +
        (friend ? '<div class="sec fr"><div class="crow"><h3>' + U.esc(fname) + '</h3><div class="chips four">' + Object.entries(FR).map(([k, v]) => btn("fr", k, v[0], v[1], R.orders.friend === k)).join("") + '</div></div><p class="desc1">' + T(FR[R.orders.friend][1]) + "</p></div>" : "") +
        (!soldiers && !friend ? '<p class="desc1">' + T("No one is fighting beside you to take an order.") + "</p>" : "");
      const so = el.querySelector(".sec.so"), fr = el.querySelector(".sec.fr"), g = el.querySelector(".grp"), both = !!(so && fr);
      // Only the groups that apply; with both, one at a time and a "Soldiers ⇄" swap.
      const show = (k) => { if (so) so.classList.toggle("on", k === "so" || !fr); if (fr) fr.classList.toggle("on", k === "fr" || !so); g.textContent = (k === "so" ? T("Soldiers") : fname) + (both ? " ⇄" : ""); g.dataset.k = k; };
      show(so ? "so" : "fr"); g.onclick = () => { if (both) show(g.dataset.k === "so" ? "fr" : "so"); };
      el.querySelectorAll("[data-so]").forEach((b) => (b.onclick = () => { R.orders.soldiers = b.dataset.so; V.queue.orders = Object.assign(V.queue.orders || {}, { soldiers: b.dataset.so }); el.querySelectorAll("[data-so]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); so.querySelector(".desc1").textContent = K.tr(SO[b.dataset.so][1]); }));
      el.querySelectorAll("[data-fr]").forEach((b) => (b.onclick = () => { R.orders.friend = b.dataset.fr; V.queue.orders = Object.assign(V.queue.orders || {}, { friend: b.dataset.fr }); el.querySelectorAll("[data-fr]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); fr.querySelector(".desc1").textContent = K.tr(FR[b.dataset.fr][1]); }));
      resumeBtn(el); el.classList.add("compact"); placeDrop(el, $(".hb.orders")); dropTimer(el);
    } else if (kind === "aid") {
      const el = $(".aid-sheet"), ast = RT.astras(R), aReady = ast.find((x) => !x.why);
      // A ready weapon's note: its uses left (three in a life), or free against a champion (abilities.js K.astraWhy).
      const anote = (x) => (K.astraChampion(R.B.units) ? K.tr("free against a champion") : K.tr("{n} of 3 left", { n: K.astraLeft(x.id) }));
      const it = (k, label, note, off, key) => '<button type="button" data-aid="' + k + '"' + (off ? ' disabled aria-disabled="true"' : "") + "><b>" + U.esc(label) + "</b><small>" + U.esc(note) + "</small><kbd>" + key + "</kbd></button>";
      el.innerHTML = it("herbs", K.tr("Herbs"), K.tr("{n} left", { n: K.S.items.herbs || 0 }), !RT.can(R, "herbsSoon"), "H") +
        (K.S && K.S.fighter ? "" : ast.filter((x) => !x.why).length > 1 ? ast.filter((x) => x.id !== "astra" || !x.why).map((x) => it("astra:" + x.id, K.tr(x.name), x.why ? x.short || K.astraShort(x.why) : anote(x), !!x.why, "")).join("") : it("astra", K.tr(aReady ? aReady.name : "Divine weapon"), aReady ? anote(aReady) : ast[0] ? (B_used(ast) ? K.tr("used") : ast[0].short || K.astraShort(ast[0].why) || "") : K.tr("not given"), !aReady, "U")) + // two or more ready: one row each (item 12)
        (p.abilities.includes("call") ? it("call", K.tr("Call for help"), RT.can(R, "call") ? K.tr("once a fight") : K.tr("called"), !RT.can(R, "call"), "C") : "");
      el.querySelectorAll("[data-aid]").forEach((b) => (b.onclick = () => { closeSheet(); act(b.dataset.aid); }));
      resumeBtn(el); el.classList.add("compact"); placeDrop(el, $(".hb.aid")); dropTimer(el);
    } else {
      const el = $(".pause-sheet");
      if (kind === "pause") el.innerHTML = "<h2>" + T("Paused") + '</h2><div class="p-main opts one"><button type="button" class="go" data-close>' + T("Resume ▶") + "</button>" +
        (C.canFlee() ? '<button type="button" class="danger" data-w>' + T("Withdraw from the fight") + "</button>" + (C.fleeBreaks().length ? '<p class="note">' + T("It breaks your vow never to retreat.") + "</p>" : "") : "") +
        '<ul class="keys pkeys">' + T(KEYS_ALL).split(" · ").map((x) => "<li>" + U.esc(x) + "</li>").join("") + "</ul></div>";
      else if (kind === "confirm") el.innerHTML = '<div class="p-confirm opts one"><h3 class="sure">' + T("Are you sure?") + '</h3><p class="desc">' + T("Withdrawing breaks your vow never to retreat.") + '</p><button type="button" class="go" data-close>' + T("Stay and fight") + '</button><button type="button" class="danger" data-yes>' + T("Yes, withdraw") + "</button></div>";
      else if (kind === "retry") el.innerHTML = "<h2>" + T("You are beaten") + '</h2><p class="note">' + T("One more try: you start a little hurt, and what you used stays used.") + '</p><div class="opts one"><button type="button" class="go" data-retry>' + T("Try again") + '</button><button type="button" data-accept>' + T("Accept the loss") + "</button></div>";
      el.hidden = false;
      el.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => closeSheet()));
      el.querySelectorAll("[data-w]").forEach((b) => (b.onclick = () => { if (C.fleeBreaks().length) return sheet("confirm"); closeSheet(); V.queue.withdraw = true; }));
      el.querySelectorAll("[data-yes]").forEach((b) => (b.onclick = () => { closeSheet(); V.queue.withdraw = true; }));
      const rb = el.querySelector("[data-retry]"); if (rb) rb.onclick = () => { closeSheet(); retry(); };
      const ab = el.querySelector("[data-accept]"); if (ab) ab.onclick = () => { closeSheet(); RT.accept(V.R); if (K.loseLived(V.encId) && !(K.S && K.S.fighter)) return defeated(); const me = V.actors.get(C.player().uid); if (me && me.el.classList.contains("slumped")) { me.el.classList.remove("slumped"); fell(me); } finishSoon(); }; // given up: story mode lives on (the foes leave), else you fall
      const f = el.querySelector("button"); if (f && !U.calm()) f.focus({ preventScroll: true });
    }
  }
  // Orders and Aid end in a compact "Resume ▶": it closes the panel and the fight goes on (tap outside and the diya still do too).
  function resumeBtn(el) {
    el.insertAdjacentHTML("beforeend", '<button type="button" class="resume" data-resume>' + T("Resume ▶") + "</button>");
    el.querySelector("[data-resume]").onclick = () => closeSheet();
  }
  const B_used = (ast) => ast.some((x) => x.why === K.tr("Used this battle"));
  // The panel takes exactly the controls' place (phones, touch screens); on a laptop, a corner under its button.
  function placeDrop(panel, btn) {
    panel.hidden = false;
    const ctl = $(".ctl"), ar = ctl && ctl.getBoundingClientRect(), wide = V.el.classList.contains("wide");
    panel.classList.remove("matched", "m-rt"); panel.classList.toggle("wide", wide);
    if (ar && ar.height > 20 && !wide) { // a wide screen (touch or not) has no controls row under the stage: a corner
      panel.classList.add("matched", "m-rt");
      Object.assign(panel.style, { position: "fixed", minHeight: "", left: ar.left + "px", width: ar.width + "px", top: ar.top + "px", height: ar.height + "px", right: "auto", bottom: "auto", maxHeight: "none" });
    } else {
      const sr = V.stage.getBoundingClientRect(), w = Math.min(360, sr.width * 0.32), br = btn.getBoundingClientRect();
      const hud = Math.max(br.bottom, ...$$(".hud-btns, .hb.aid").map((e) => e.getBoundingClientRect().bottom));
      Object.assign(panel.style, { position: "fixed", width: w + "px", left: (br.right - w) + "px", right: "auto", top: (hud + 6) + "px", height: "auto", minHeight: "34px", bottom: "auto", maxHeight: (sr.bottom - hud - 12) + "px" });
    }
  }
  // A small diya burns down over 6 s; a tap in the panel lights it again; out, the panel closes.
  function dropTimer(panel) {
    clearTimeout(V.dropT);
    let f = panel.querySelector(".flame");
    if (!f) { panel.insertAdjacentHTML("afterbegin", FLAME); f = panel.querySelector(".flame"); }
    f.classList.remove("burn"); void f.offsetWidth; f.classList.add("burn");
    panel.onpointerdown = () => { if (!panel.hidden) dropTimer(panel); };
    V.dropT = setTimeout(() => { if (V && !panel.hidden) closeSheet(); }, 6000);
  }
  function dropOutside(e) {
    if (!V || (V.sheet !== "orders" && V.sheet !== "aid")) return;
    const panel = $("." + V.sheet + "-sheet"), btn = $(".hb." + V.sheet);
    if (panel.contains(e.target) || (btn && btn.contains(e.target))) return;
    closeSheet();
  }
  function closeSheet(keep) {
    if (!V) return;
    clearTimeout(V.dropT);
    $$(".sheet").forEach((s) => { s.hidden = true; });
    V.sheet = null; if (!keep) { V.paused = false; V.last = 0; }
  }

  function input() {
    const q = V.queue; V.queue = {};
    let move = (V.held.r ? 1 : 0) - (V.held.l ? 1 : 0);
    const w = V.walk, p = C.player();
    if (move) V.walk = null;
    else if (w && p) { // walking to a click; at a clicked foe, strike
      const f = w.foe && V.R.B.units.find((u) => u.uid === w.foe && u.hp > 0);
      const goal = f ? f.rt.x : w.x, d = goal - p.rt.x;
      if (f && Math.abs(d) <= p.rt.reach * 0.9) { q.strike = true; V.walk = null; }
      else if (Math.abs(d) > 0.01 && !(p.rt.x <= RT.EDGE + 1e-6 && d < 0) && !(p.rt.x >= 1 - RT.EDGE - 1e-6 && d > 0)) move = d > 0 ? 1 : -1;
      else V.walk = null;
    }
    if (V.held.block && V.R.blocker && !RT.can(V.R, "block") && V.R.winded && !V.windTold) { V.windTold = true; toast(K.tr("Winded")); }
    // Your shield broken (Build D): the Block button (or K) rolls instead, once a press, until you take up another.
    if (V.R.broken) { if (V.held.block && !V.rollEdge) { q.roll = true; V.rollEdge = true; } }
    if (!V.held.block) V.rollEdge = false;
    if (!V.held.block) V.windTold = false;
    return Object.assign({ move, block: !!V.held.block }, q);
  }
  function loop(now) {
    if (!V) return;
    const R = V.R;
    if (C.state() && C.state() !== R.B && !R.over) return stop(); // another fight has begun (never in play; a guard)
    const dt = Math.min(0.1, V.last ? (now - V.last) / 1000 : 0); V.last = now;
    if (!V.paused && !V.briefing && !R.over) {
      champCheck(R);
      V.acc += V.slowUntil && now < V.slowUntil ? dt * 0.3 : dt; // a champion's arrival: the fight slows for a moment
      while (V.acc >= RT.STEP && !R.over) { RT.step(R, input()); V.acc -= RT.STEP; }
    }
    draw();
    if (V.clash) { clashTick(); if (V) V.raf = requestAnimationFrame(loop); return; }
    if (R.over && !V.ending) {
      if (R.over === "retry") { if (V.sheet !== "retry") sheet("retry"); }
      else if (R.over === "lose" && K.loseLived(V.encId) && !(K.S && K.S.fighter)) defeated(); // fighter mode: straight to the end of the run
      else finishSoon();
    }
    V.raf = requestAnimationFrame(loop);
  }
  function retry() { V.R = RT.retry(V.R); V.actors.forEach((a) => { a.el.remove(); if (a.tag) a.tag.remove(); if (a.weaponEl) a.weaponEl.remove(); }); $$(".scorch, .ax, .gshield, .shptr, .glint-blade, .rt-trails", V.el).forEach((e) => e.remove()); V.trails = null; V.tagTick = null; V.ax = null; V.ground = null; V.shPtr = null; V.actors.clear(); if (U.rigs) U.rigs.clear(); V.logAt = V.R.B.log.length; toast(K.tr("One more time.")); }
  // Beaten, but the story goes on (owner, 4 November): you slump where you stand, the foes turn and walk off the field, and a
  // line says you tried and what is written held. A tap (Enter or Space) goes on.
  // A deadly fight lost the first time: you are down, not dead, while the second try is offered.
  function retryLeft() { const R = V.R; return !!((R.B.enc.lethal || (K.S && K.S.fighter)) && !R.tries && !R.noRetry); }
  function slumped(a) {
    a.el.classList.add("slumped"); a.el.classList.remove("windup", "shield-up"); a.shieldUp = false;
    if (a.tag) a.tag.classList.remove("on");
    if (a.rig) { a.rig.t.dx = 0; a.rig.t.dy = 0; a.rig.set("defeated", 260, 0.62); } else pose(a, "kneel");
  }
  function defeated() {
    if (V.ending) return; V.ending = true;
    const R = V.R, p = C.player(), me = V.actors.get(p.uid), calm = U.calm(), walk = calm ? 0 : 1800;
    if (me && !me.el.classList.contains("slumped")) slumped(me);
    const foes = R.B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.rt);
    foes.forEach((u, i) => {
      const dir = u.rt.x >= p.rt.x ? 1 : -1, a = V.actors.get(u.uid);
      u.rt.atk = null; u.rt.face = dir; u.leave = { x0: u.rt.x, to: dir > 0 ? 1.3 : -0.3, delay: i * 150 };
      if (a) { a.el.classList.remove("windup", "beaten"); if (a.tag) a.tag.classList.remove("on"); U.pleaTag(a.el, "", null); }
    });
    const t0 = performance.now();
    const tick = (now) => {
      if (!V || V.R !== R) return;
      const el = now - t0;
      foes.forEach((u) => {
        const l = u.leave, a = V.actors.get(u.uid), k = calm ? 1 : clamp((el - l.delay) / (walk - 300), 0, 1);
        u.rt.x = l.x0 + (l.to - l.x0) * k * k * (3 - 2 * k) * 0.25 + (l.to - l.x0) * k * 0.75; // eases in, then strides off
        if (a && a.rig && !calm && k > 0 && k < 1) { const ph = Math.floor(el / 230) % 2; if (a.stepPh !== ph) { a.stepPh = ph; a.rig.set(ph ? "stepA" : "stepB", 700, 0.5); } }
      });
      if (el < walk) { requestAnimationFrame(tick); return; }
      foes.forEach((u) => { const a = V.actors.get(u.uid); if (a) a.el.style.visibility = "hidden"; });
      setTimeout(written, calm ? 150 : 350);
    };
    requestAnimationFrame(tick);
  }
  function written() {
    if (!V || V.written) return;
    const card = U.el('<div class="written" role="status"><p>' + U.esc(T("You fought with all you had. What is written was not yours to stop.")) + '</p>' +
      '<button type="button" class="go">' + U.esc(T("Continue")) + " ▶</button></div>");
    V.stage.appendChild(card);
    const go = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (!V || !V.written) return; V.written = null;
      const cb = V.onEnd, done = C.end();
      stop();
      if (cb) cb(done ? done.over : "lose");
    };
    V.written = go;
    card.addEventListener("click", go);
    setTimeout(() => { const b = card.querySelector(".go"); if (b && document.contains(b)) b.focus({ preventScroll: true }); }, 50);
  }
  function finishSoon() {
    if (V.ending) return; V.ending = true;
    setTimeout(() => {
      if (!V) return;
      const cb = V.onEnd, done = C.end();
      stop();
      if (cb) cb(done ? done.over : "lose");
    }, U.calm() ? 300 : 1100);
  }
  function stop() {
    if (!V) return;
    cancelAnimationFrame(V.raf);
    window.removeEventListener("keydown", onKey, true); window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onHidden);
    if (U.rigs) U.rigs.clear();
    if (V.el) V.el.remove();
    document.body.classList.remove("in-rt"); document.removeEventListener("pointerdown", dropOutside, true);
    V = null;
  }

  // ---------- Drawing ----------
  // A mace's trail (swing above): the last 150 ms of its head's path, fading and thinning toward the tail.
  function trails() {
    const now = performance.now(); let svg = V.trails;
    V.actors.forEach((a) => {
      if (!a.trailUntil || now > a.trailUntil + 160 || !a.svg || a.u.hp <= 0) { if (a.trail) { a.trail = null; if (a.trailG) a.trailG.innerHTML = ""; } return; }
      if (!svg) { svg = V.trails = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "rt-trails"); svg.setAttribute("aria-hidden", "true"); V.world.appendChild(svg); }
      if (!a.trailG) { a.trailG = document.createElementNS("http://www.w3.org/2000/svg", "g"); svg.appendChild(a.trailG); }
      const pts = a.trail || (a.trail = []);
      if (now <= a.trailUntil) { const t = U.blowTip(a.svg), wr = V.world.getBoundingClientRect(); if (t) pts.push({ t: now, x: t.x - wr.left, y: t.y - wr.top }); }
      while (pts.length && now - pts[0].t > 150) pts.shift();
      let h = "";
      for (let i = 1; i < pts.length; i++) {
        const k = 1 - (now - pts[i].t) / 150;
        if (Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) < 0.5) continue;
        h += '<line x1="' + pts[i - 1].x.toFixed(1) + '" y1="' + pts[i - 1].y.toFixed(1) + '" x2="' + pts[i].x.toFixed(1) + '" y2="' + pts[i].y.toFixed(1) + '" stroke-width="' + (2 + 7 * k).toFixed(1) + '" stroke-opacity="' + (0.55 * k).toFixed(2) + '"/>';
      }
      a.trailG.innerHTML = h;
    });
  }
  function draw() {
    const R = V.R, B = R.B, G = V.G; if (!G) return;
    const p = C.player();
    // Names: at the start of the fight only (the strike and defence study, owner 8 November: "only when it matters"; they
    // came up every 10 s, at every blow marked on someone and every heavy blow, across the fighters' chests); after that on
    // a champion's arrival, on one who comes to help, and on the foe you turn to strike.
    if (V.tagTick == null && V.actors.size) { V.tagTick = 0; nameTagsAll(2); }
    trails();
    const pleading = C.spareable(), inReach = RT.spareable(R); // a kneeling foe asks for mercy (C.spare)
    const canParry = RT.canParry() && !R.noStrike;
    for (const u of B.units) {
      if (!u.rt) continue;
      const a = actorFor(u);
      if (Math.abs(a.d - u.rt.lane) > 0.01) size(a); // smaller up the ground
      a.x = G.fx0 + u.rt.x * G.FW; a.gy = G.gl + u.rt.lane * G.dstep;
      a.el.style.left = a.x.toFixed(1) + "px"; a.el.style.bottom = a.gy.toFixed(1) + "px";
      if (u.hp > 0) a.el.style.zIndex = String(u.side === "player" ? Math.round(30 - u.rt.lane * 8) : Math.round(10 - u.rt.lane * 6 + 10));
      a.el.classList.toggle("face-l", u.rt.face < 0);
      if (a.tag && a.tag.classList.contains("on")) placeTag(a);
      // A foe glows only the first time it winds up; after that only its pose and its mark.
      if (u.rt.atk && u.side === "enemy" && !a.warned) a.warned = u.rt.atk;
      a.el.classList.toggle("windup", !!u.rt.atk && u.side === "enemy" && a.warned === u.rt.atk);
      // The parry's moment (RT.P.parryCue before it lands): the blade coming down on you is lit white; Strike then meets it.
      if (u.side === "enemy") { const cue = canParry && u.hp > 0 && RT.parryable(R, u, RT.P.parryCue); if (cue !== !!a.cue) { a.cue = cue; a.el.classList.toggle("parry-cue", cue); if (cue) parryTip(); } bladeGlint(a, cue); }
      // Foes' blows drawn on time (the strike and defence study, 8 November: the swing began only when the blow had landed
      // in the rules, so the weapon reached you about 0.1 s after it counted): the swing starts IMPACT ms before it lands,
      // as your own do, and in the 140 ms before that the wind-up coils a little further back, the moment to react to.
      if (u.side === "player" && a.nextSwing) { // your own blow wound up (fx "blow"), not one broken off to parry
        const b = u.rt.blow, left = b ? (b.at - R.t) / (V.slowUntil && performance.now() < V.slowUntil ? 0.3 : 1) * 1000 : 0;
        // (the same blow: one that waits a moment more, too close to land, keeps its swing for the new moment: engine/realtime.js)
        if (!b || (a.nextSwing.b ? b !== a.nextSwing.b : b.at !== a.nextSwing.at) || R.block || u.hp <= 0) a.nextSwing = null;
        else if (left <= IMPACT + 8) { const arc = a.nextSwing.arc; a.nextSwing = null; swing(a, inFront(u), null, arc); }
      }
      // (a comrade's blows the same; only foes are slowed by a perfect roll's slow motion, R.slow)
      if (u.hp > 0 && u.rt.atk && !u.rt.atk.ranged && !u.rt.atk.area && a.rig && (u.side === "enemy" || (u.side === "ally" && RT.MELEE && RT.MELEE.has(u.rt.atk.id)))) {
        const at = u.rt.atk, rate = (u.side === "enemy" && R.slow > 0 ? 0.45 : 1) * (V.slowUntil && performance.now() < V.slowUntil ? 0.3 : 1);
        const left = (at.land - R.t) / rate * 1000; // ms on the screen's clock
        const feinting = at.feint && R.t < at.feint;
        if (!feinting && a.coiled !== at.land && left <= IMPACT + 140 && left > IMPACT) { a.coiled = at.land; a.rig.kick({ rot: -70, armF: -120, head: -40 }); }
        if (!feinting && a.preSwung !== at.land && left <= IMPACT + 8) { a.preSwung = at.land; const ta = V.actors.get(at.on); if (ta && ta.u.hp > 0) swing(a, ta, guardOf(ta), a.atkArc); }
      }
      if (u.rt.atk !== a.atk) {
        if (u.rt.atk) a.atkArc = !u.rt.atk.ranged && !u.rt.atk.area && U.arcFor ? u.rt.atk.arc || U.arcFor(u.rt.weapon, a.blowN = (a.blowN || 0) + 1) : null; // which way this weapon's blow comes
        if (u.rt.atk) { a.windAt = performance.now(); pose(a, u.rt.atk.ranged ? "draw" : a.atkArc && U.ARCS[a.atkArc] ? U.ARCS[a.atkArc].up : "windup", a.atkArc && U.MACE_ARCS[a.atkArc] ? 500 : 700, 0.5); }
        else if (a.atk && !a.atk.ranged && u.hp > 0) { if (a.atk.area || a.atk.id === "salve") { pose(a, "strike", 1600, 0.55); home(a, 380); } else { a.swingOn = a.atk.on; a.swingArc = a.atkArc || null; } }
        a.atk = u.rt.atk;
      }
      a.el.classList.toggle("unseen", u.side === "player" && R.unseen > 0); // (vanished; a roll is drawn as "evading", above)
      // Your shield, up while you hold Block.
      if (u.side === "player" && R.blocker && u.hp > 0 && !!R.block !== !!a.shieldUp) {
        a.shieldUp = !!R.block; a.el.classList.toggle("shield-up", a.shieldUp); a.shieldH = null;
        if (a.shieldUp) { if (a.rig) { a.rig.t.dx = 0; a.rig.t.dy = 0; } } else home(a, 0);
      }
      // Held where the next blow on you comes (the strike and defence study: at the chest for every blow): raised to the eyes
      // for a cut or a smash, at the chest for a thrust, a stab, a sweep or an arrow.
      if (u.side === "player" && a.shieldUp && u.hp > 0) {
        const h = threatHigh(R, u) ? "shieldHigh" : "shieldUp";
        if (h !== a.shieldH) { a.shieldH = h; pose(a, h, 1500, 0.6); }
      }
      // Your soldiers on Defend raise their shields while a blow is marked on them (PRD §18.15); under a shield wall they
      // are up already (wallUp).
      if (u.side === "ally" && u.plural && !u.person && !u.called && u.hp > 0 && !a.walled) {
        const up = R.orders.soldiers === "defend" && B.units.some((e) => e.side === "enemy" && e.hp > 0 && e.rt && e.rt.atk && e.rt.atk.on === u.uid);
        if (up !== !!a.shieldUp) { a.shieldUp = up; if (up) pose(a, "guard", 900, 0.55); else home(a, 250); a.el.classList.toggle("shield-up", up); }
      }
      // A rally carried in from the turns: your side glows gold while it lasts; a stunned foe sways (the clash's opening).
      if (u.hp > 0) { a.el.classList.toggle("inspired", u.side !== "enemy" && (u.rt.st.inspired || 0) > 0); a.el.classList.toggle("dazed", u.side === "enemy" && (u.rt.st.stun || 0) > 0); }
      // A foe lowering his shield after catching your blow cannot strike yet: lit gold while the opening lasts.
      a.el.classList.toggle("opened", u.side === "enemy" && u.hp > 0 && !!u.rt.opening && !u.rt.atk);
      a.el.classList.toggle("beaten", !!u.rt.beaten);
      if (u.side === "enemy") U.pleaTag(a.el, u.spared ? "spared" : u.hp > 0 && pleading.includes(u) ? (inReach.includes(u) ? "ask" : "far") : "", () => { V.queue.spare = u.uid; });
      const m = a.el.querySelector(".mini b"); if (m) m.style.width = Math.max(0, u.hp / u.maxHp * 100) + "%";
    }
    V.actors.forEach((a, uid) => { if (!B.units.includes(a.u)) { if (a.tag) a.tag.remove(); a.el.style.transition = "opacity .6s"; a.el.style.opacity = "0"; setTimeout(() => a.el.remove(), 600); V.actors.delete(uid); } });
    if (V.openFx) { V.openFx = false; openFx(); }
    if (V.wallMen) wallMenDraw(p);
    groundDraw(R, p);
    for (const f of R.fx) fx(f);
    R.fx.length = 0;
    // A blow that struck no one (dodged, a whiff) still swings at whom it was meant for.
    V.actors.forEach((a) => { if (a.swingOn !== undefined && a.swingOn !== null) { const t = V.actors.get(a.swingOn); a.swingOn = null; swing(a, t, guardOf(t), a.swingArc); a.swingArc = null; } });
    if (V.ax) axTick();
    marks();
    const w = (id, v) => { const e = V.el.querySelector("#" + id); if (e) e.style.width = clamp(v, 0, 100) + "%"; };
    w("b-hp", p.hp / p.maxHp * 100); w("b-br", R.breath / RT.P.breathMax * 100);
    lowLife(p);
    const fr = B.units.find((u) => u.side === "ally" && u.hp > 0 && !u.still && (u.called || u.person)) || B.units.find((u) => u.side === "ally" && u.hp > 0 && !u.still);
    $(".bar.fr").hidden = !fr;
    if (fr) { $("#b-frn").textContent = K.text(fr.src || fr.name).split(",")[0]; w("b-fr", fr.hp / fr.maxHp * 100); }
    const pk = RT.packs(R), cnt = K.tr("Foes left: {n}", { n: RT.count(R) }) + (pk.of > 1 ? " · " + K.tr("Pack {a} of {b}", { a: pk.now, b: pk.of }) : "");
    $$(".packn").forEach((e) => { if (e.textContent !== cnt) e.textContent = cnt; });
    if (R.skill) { const f = 1 - Math.max(0, R.skillCd) / (RT.RECHARGE[R.skill] || 10), sk = $(".acts .skill"), ks = $(".ks-skill");
      sk.querySelector(".ring .fg").style.strokeDashoffset = (113.1 * (1 - f)).toFixed(1); sk.classList.toggle("ready", R.skillCd <= 0);
      ks.querySelector(".fg").style.strokeDashoffset = (100.5 * (1 - f)).toFixed(1); ks.classList.toggle("ready", R.skillCd <= 0); }
    $("#ksherbs").textContent = String(K.S.items.herbs || 0);
    // Caught in your own swing (RT.swingRisk; the strike and defence study, owner 8 November: warn, keep the lock): the
    // Strike button (on a laptop, the key strip) edged in ember, and a mark over your head, while a blow begun now (or the
    // swing you are in) would still hold you when a blow marked on you lands.
    { const rk = RT.swingRisk ? RT.swingRisk(R) : {}, me = p && V.actors.get(p.uid), on = !R.over && !R.noStrike && !!(rk.next || rk.now);
      if (V.el.classList.contains("risky") !== on) V.el.classList.toggle("risky", on);
      if (me) { let mk = me.risk; if (!mk && on) { mk = me.risk = U.el('<i class="riskmark" aria-hidden="true">!</i>'); me.el.appendChild(mk); } if (mk && mk.classList.contains("on") !== on) mk.classList.toggle("on", on); } }
    // Block, or Roll while your shield is broken (Build D): the ring fills until a comrade throws you one.
    const rb = $(".acts .roll"), asRoll = R.blocker && !!R.broken;
    if (R.blocker && rb.classList.contains("as-roll") !== asRoll) {
      rb.classList.toggle("as-roll", asRoll);
      rb.querySelector(".rl").textContent = T(asRoll ? "Roll" : "Block"); rb.setAttribute("aria-label", T(asRoll ? "Roll" : "Block"));
      if (!rb.querySelector(".backring")) rb.insertAdjacentHTML("afterbegin", '<svg class="ring backring" viewBox="0 0 40 40" aria-hidden="true"><circle class="fg" cx="20" cy="20" r="18" stroke-dasharray="113.1" stroke-dashoffset="0"/></svg>');
    }
    if (asRoll) rb.querySelector(".backring .fg").style.strokeDashoffset = (113.1 * (Math.max(0, R.spOff) / RT.P.shieldBack)).toFixed(1);
    rb.classList.toggle("off", asRoll ? !RT.can(R, "roll") : R.blocker ? !R.block && !RT.can(R, "block") : !RT.can(R, "roll"));
    if (R.blocker) rb.classList.toggle("held", !!R.block);
    // Strike locked: the clash's opening after Shield wall or Guard (its ring counts the seconds down), and in a swing.
    const sb = $(".acts .strike"), locked = R.strikeLock > 0;
    sb.classList.toggle("locked", locked);
    if (locked) sb.querySelector(".lockring .fg").style.strokeDashoffset = (113.1 * (1 - R.strikeLock / RT.P.strikeLock)).toFixed(1);
    $(".hb.withdraw").hidden = !C.canFlee();
    $(".edgefx.l").classList.toggle("on", !!R.pushing && p.rt.face < 0);
    $(".edgefx.r").classList.toggle("on", !!R.pushing && p.rt.face > 0);
    $(".slowtint").classList.toggle("on", R.slow > 0);
    V.el.classList.toggle("frozen", R.frozen > 0);
    while (V.logAt < B.log.length) { const e = B.log[V.logAt++]; if (e && (e.raw || e.ev)) toast(C.line(e)); }
  }
  // Marks: a ground mark under the one a blow is coming at, filling as it comes; an arrow's lane a thin dashed line.
  function marks() {
    const R = V.R, G = V.G, p = C.player();
    $$(".mark, .mark-tag", V.world).forEach((m) => (m.dataset.keep = ""));
    for (const e of R.B.units) {
      if (e.side !== "enemy" || e.hp <= 0 || !e.rt.atk) continue;
      const m = RT.markOf(R, e); if (!m) continue;
      const key = e.uid + "@" + e.rt.atk.t0;
      let el = V.world.querySelector('.mark[data-k="' + key + '"]'), tag = V.world.querySelector('.mark-tag[data-k="' + key + '"]');
      if (!el) { el = U.el('<div class="mark' + (m.lane ? " lane" : "") + '" data-k="' + key + '"><div class="rim"></div><div class="fill"></div></div>'); V.world.appendChild(el); if (!m.lane) { tag = U.el('<span class="mark-tag" data-k="' + key + '"></span>'); V.world.appendChild(tag); } }
      el.dataset.keep = "1"; if (tag) tag.dataset.keep = "1";
      const t = R.B.units.find((u) => u.uid === m.on), ta = t && V.actors.get(t.uid), ea = V.actors.get(e.uid);
      if (m.lane) {
        const sr = V.stage.getBoundingClientRect(), bow = ea && (ea.svg.querySelector(".it:not(.it-w)") || ea.svg.querySelector(".foreF"));
        const br = bow ? bow.getBoundingClientRect() : null;
        const A = br ? { x: br.left + br.width / 2 - sr.left, y: br.top + br.height / 2 - sr.top } : { x: G.fx0 + e.rt.x * G.FW, y: G.H - G.gl - G.ph * 0.6 };
        const Bp = { x: G.fx0 + ((m.x0 + m.x1) / 2) * G.FW, y: G.H - (ta ? ta.gy + ta.fh * 0.58 : G.gl + G.ph * 0.58) };
        const dx = Bp.x - A.x, dy = Bp.y - A.y, len = Math.max(8, Math.hypot(dx, dy) - (ta ? ta.bw * 0.4 : 10));
        Object.assign(el.style, { left: A.x + "px", top: A.y + "px", bottom: "auto", width: len + "px", transform: "rotate(" + Math.atan2(dy, dx) + "rad)" });
        el.classList.toggle("locked", !!m.locked);
        continue;
      }
      const L = G.fx0 + m.x0 * G.FW, Wd = Math.max(10, (m.x1 - m.x0) * G.FW), hgt = Math.max(10, (ea ? ea.fh : G.ph) * 0.11), gy = ta ? ta.gy : G.gl;
      Object.assign(el.style, { left: L + "px", width: Wd + "px", height: hgt + "px", bottom: (gy - hgt / 2) + "px" });
      const fill = el.querySelector(".fill"); fill.style.width = (Wd * m.fill) + "px";
      if (e.rt.x > (m.x0 + m.x1) / 2) { fill.style.left = "auto"; fill.style.right = "0"; } else { fill.style.left = "0"; fill.style.right = "auto"; }
      const mine = m.on === p.uid || (p.rt.x >= m.x0 && p.rt.x <= m.x1);
      tag.textContent = mine ? K.tr("On you") : t ? K.text(t.src || t.name).split(",")[0] : "";
      tag.classList.toggle("me", mine); tag.style.left = L + "px"; tag.style.top = (G.H - gy + hgt / 2 + 4) + "px";
    }
    $$(".mark, .mark-tag", V.world).forEach((m) => { if (!m.dataset.keep) m.remove(); });
  }
  function fx(f) {
    const R = V.R, p = C.player(), me = V.actors.get(p.uid);
    const A = (uid) => V.actors.get(uid);
    switch (f.k) {
      case "blow": { // the wind-up of this weapon's blow, then the swing so the weapon arrives as the blow lands
          // (the dagger's heavy fifth has its own move: a drive up from a crouch, the study, 8 November)
          const arc = f.arc || (f.heavy && p.rt.weapon === "dagger" ? "drive" : U.arcFor ? U.arcFor(p.rt.weapon, f.n) : null), A = arc && U.ARCS[arc];
          { const tg = inFront(p); if (tg && tg !== me.lastTarget) { me.lastTarget = tg; nameTag(tg, 1.6); } } // the foe you turn to: his name
          // (the swing is begun from the frame loop, IMPACT ms before the blow lands on the fight's own clock (the strike and
          // defence study, 8 November): a timer could fire after a slow frame, or a heavy blow's swing begin so early that it
          // had to be begun again when the blow landed, 0.1 s late)
          const at = p.rt.blow ? p.rt.blow.at : R.t + f.land;
          me.windAt = performance.now();
          if (A) { me.blowArc = arc; pose(me, A.up, 1500, 0.55); me.nextSwing = { at, arc, b: p.rt.blow }; if (K.Sound) K.Sound.play("tap"); break; }
          if (f.heavy || f.n === 2 || f.land * 1000 > IMPACT + 40) { pose(me, "windup", 1700, 0.55); me.nextSwing = { at, arc: null, b: p.rt.blow }; } else swing(me, inFront(p), null);
          if (K.Sound) K.Sound.play("tap"); break;
        }
      case "roll": { // (the strike and defence study: a squat at half opacity) a step back out of the blow, or a duck under it when it carries you forward
        const fwd = (R.rollDir || 0) === (p.rt.face || 1);
        pose(me, fwd ? "duck" : "backstep", 1400, 0.6); home(me, 400);
        me.el.style.setProperty("--ev", String(R.rollDir || -1)); me.el.classList.add("evading"); clearTimeout(me.evOff); me.evOff = setTimeout(() => me.el.classList.remove("evading"), 440);
        break;
      }
      case "kneel": pose(me, "kneel", 600, 0.6); home(me, 1100); break;
      // Build D (row 49): a shield cracked at half its points, split at none; yours replaced off the ground (a fallen soldier's, or a comrade's throw).
      case "shieldcrack": { const a = A(f.uid); shieldCrack(a); if (a) pop(a, K.tr("Cracked"), f.mine ? "me" : ""); if (K.Sound) K.Sound.play("clang");
        if (f.mine) tipOnce("tipShieldCrack", "Your shield is cracking: every blow from a mace wears it down. Step back from the strongest."); break; }
      case "shieldbreak": { const a = A(f.uid); shieldGone(a, true); if (a) { pop(a, K.tr("Shield broken!"), f.mine ? "me" : "crit"); shake(false); } if (K.Sound) { K.Sound.play("clang"); K.Sound.play("hit"); }
        if (f.mine) { if (a && a.shieldUp) { a.shieldUp = false; a.el.classList.remove("shield-up"); home(a, 0); } tipOnce("tipShieldFetch", "Shield broken: roll for now, and walk to a shield on the ground to take it up."); }
        else tipOnce("tipFoeShieldBroken", "His shield is broken: he fights on without it, and it will not turn your blows again."); break; }
      // Shields on the ground (owner, 7 November): one falls from a fallen soldier's arm; a comrade throws one in at your
      // side's edge; you take one up by going to it.
      case "shielddrop": { const a = A(f.uid), sh = groundShield(f);
        if (a) { a.el.classList.add("shield-dropped"); if (!U.calm()) sh.el.animate([{ transform: "translateY(" + (-a.fh * 0.4).toFixed(1) + "px) rotate(" + (RT.fallDir(a.u) * 35) + "deg)", opacity: 0.9 }, { transform: "translateY(0) rotate(0deg)", opacity: 1 }], { duration: 480, easing: "ease-in" }); }
        break; }
      case "shieldthrown": { const sh = groundShield(f), G = V.G;
        if (!U.calm() && G) { const from = -(parseFloat(sh.el.style.left) + sh.w + 30); sh.el.animate([{ transform: "translate(" + from.toFixed(1) + "px," + (-G.H * 0.32).toFixed(1) + "px) rotate(-200deg)" }, { transform: "translate(" + (from * 0.45).toFixed(1) + "px," + (-G.H * 0.42).toFixed(1) + "px) rotate(-100deg)", offset: 0.45 }, { transform: "translate(0,0) rotate(0deg)" }], { duration: 600, easing: "cubic-bezier(.35,.4,.6,1)" }); }
        toast(T("A comrade throws you a shield!")); if (K.Sound) setTimeout(() => { if (V && K.Sound) K.Sound.play("tap"); }, 560); break; }
      case "shieldup": { const a = A(f.uid); groundGone(f.id, a); shieldGone(a, false); if (a) pop(a, K.tr("Shield taken up"), "me"); if (K.Sound) K.Sound.play("clang"); break; }
      case "shieldgone": groundGone(f.id, null); break;
      case "strikeback": { if (K.Sound) K.Sound.play("bell"); const sb = $(".acts .strike"); if (sb) { sb.classList.add("back"); setTimeout(() => sb.classList.remove("back"), 700); } break; }
      case "toast": toast(K.tr(f.s)); break;
      case "skill": pose(me, R.skill === "aimed" ? "loose" : R.skill === "salve" ? "kneel" : R.skill === "song" || R.skill === "command" ? "cheer" : "strike", 900, 0.55); home(me, 500);
        if (R.skill === "quake") shake(true); toast(K.tr(SKILL_NAME[R.skill])); break;
      case "hit": landHit(f); break;
      case "spared": { const a = A(f.uid); if (a) { pose(a, "kneel", 600, 0.6); a.el.classList.add("beaten", "spared"); } toast(K.tr("Spared. The fight goes on.")); break; }
      case "brace": { const a = A(f.uid); if (a && a.u.hp > 0) { pose(a, "guard", 900, 0.55); U.guardFlash(a.svg, 1300); if (!a.shieldUp) home(a, 1200); } break; } // braces for your next blow
      case "heal": { const a = A(f.uid); if (a) pop(a, "+", "heal"); break; }
      case "spark": { // a blow taken on a shield: it is raised to meet it, and the sparks fly where the blow lands on it
        const a = A(f.uid); if (!a) break;
        a.sparkAt = performance.now();
        if (a.u.side === "player" && f.block && f.arrow) pop(a, K.tr("Blocked"), "miss"); // an arrow snapping on the raised shield
        if (a.u.side === "player" && R.block) break; // already behind the raised shield
        if (a.u.side !== "player" || !f.glance) { pose(a, "guard", 1400, 0.55); if (!a.shieldUp) home(a, 500); }
        break; }
      case "fblock": { // a foe catches your blow on his shield (owner, 6 November): raised to meet it, then lowered, and while he
        // lowers it he cannot strike (RT.P.fblockRec): he is lit gold as long as that lasts (the update: "opened")
        const a = A(f.uid); if (!a || a.u.hp <= 0) break;
        a.sparkAt = performance.now(); a.fblockUp = true;
        if (a.rig) { a.rig.t.dx = 0; a.rig.t.dy = 0; }
        pose(a, "shieldUp", 1500, 0.6); U.guardFlash(a.svg, 700); // (the shield brought round in front, as yours is)
        pop(a, K.tr("Blocked"), "miss", 0.22); // above the number that got through
        setTimeout(() => { if (!V || !a.u || a.u.hp <= 0) return; a.fblockUp = false; pose(a, "strain", 650, 0.45); if (a.rig) a.rig.kick({ rot: 120 * (a.u.rt ? -a.u.rt.face : 1), tx: 12 }); home(a, Math.max(200, f.rec * 1000 - 420)); }, 380);
        fblockTip();
        break; }
      case "miss": { const a = A(f.uid); if (a) pop(a, K.tr("Missed"), "miss"); break; }
      case "feint": { const a = A(f.uid); if (a && a.u.hp > 0) { pop(a, K.tr("Feint!"), "feint"); pose(a, "guard", 300, 0.4); if (a.rig) a.rig.kick({ armF: 260, item: -220, rot: 60 }); a.warned = false; } break; } // the wind-up stops short (item 19): it comes again; a hitch in the weapon as it drops (the study, 8 November), and its wind-up lit again when it comes
      case "parry": parried(A(f.uid), me, f.part, false); break; // your blade met his (owner, 6 November)
      case "parried": parried(me, A(f.uid), false, true); break; // a champion met yours
      case "perfect": toast(K.tr("Perfect roll")); break;
      case "perfectblock": { toast(K.tr("Perfect block")); const a = A(f.uid); if (a && a.u.hp > 0) { setTimeout(() => { if (V && a.u.hp > 0) { pose(a, "strain", 700, 0.45); if (a.rig) a.rig.kick({ rot: 160 * (a.u.rt ? -a.u.rt.face : 1), tx: 20 }); home(a, 900); } }, 120); } break; } // the one who struck staggers back off the shield
      case "winded": if (blocker()) toast(K.tr("Winded")); break;
      case "fall": { const a = A(f.uid); if (a) { if (a.u.side === "player" && (K.loseLived(V.encId) || retryLeft())) slumped(a); else fell(a); } break; }
      case "shot": { // the arrow leaves the bow (measured from the live figure) and flies down its lane
        const a = A(f.uid), s = f.shot; if (!a) break;
        const wr = V.world.getBoundingClientRect(), hand = a.svg.querySelector(".foreF") || a.svg, hr = hand.getBoundingClientRect();
        const from = { x: hr.left - wr.left + hr.width / 2, y: hr.top - wr.top + hr.height * 0.45 };
        const tgt = s.on && A(s.on), G = V.G;
        const to = { x: G.fx0 + s.lane * G.FW, y: G.H - ((tgt ? tgt.gy : G.gl) + (tgt ? tgt.fh : G.fh) * 0.55) };
        const v = V, go = () => U.flyArrow && U.flyArrow(v.world, from, to, Math.abs(to.x - from.x) * 0.05, Math.max(90, (s.arrive - s.t0) * 1000), false, Math.max(26, G.fh * 0.36));
        if (a.u.side === "player" && f.second) { setTimeout(() => { if (V === v) go(); }, Math.max(0, (s.t0 - V.R.t) * 1000)); break; } // the second arrow of a press: off the same draw, a moment later
        if (a.u.side === "player") { pose(a, "draw", 1400, 0.6); setTimeout(() => { if (V !== v) return; pose(a, "loose", 1200, 0.5); home(a, 450); go(); }, Math.max(0, (s.t0 - V.R.t) * 1000)); } // (a clash may end while the bow is drawn)
        else { pose(a, "loose", 1200, 0.5); home(a, 450); go(); }
        break; }
      case "blocked": toast(K.tr("A foe stands in your way")); break;
      case "beaten": { const a = A(f.uid); if (a) { pose(a, "kneel", 600, 0.6); a.el.classList.add("beaten"); } break; }
      case "join": { toast(K.tr("Help comes.")); const a = A(f.uid); if (a) setTimeout(() => nameTag(a, 2), 50); break; }
      case "call": break;
      case "astra": axStart(f); break;
      case "thrown": { // the divine weapon's struck foe, thrown away from you as the moment ends (the engine has moved it)
        const a = A(f.uid); if (!a || U.calm()) break;
        const dx = f.dx * V.G.FW, up = a.fh * 0.45;
        a.el.animate([{ transform: "translate(" + (-dx) + "px,0)" }, { transform: "translate(" + (-dx * 0.4) + "px," + (-up) + "px)", offset: 0.4 }, { transform: "translate(0,0)" }], { duration: 700, easing: "cubic-bezier(.3,.6,.5,1)" });
        if (a.rig) a.rig.kick({ rot: 600 * Math.sign(dx || 1), tx: 40, head: 300 });
        break; }
    }
  }

  // ---------- Before the fight: the rules card and the walkthrough (as ui/warday.js brief() and tour()) ----------
  const RT_ICONS = { block: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z", move: "M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4", strike: "M4 20l5-5M7 13l4 4M9 15L20 4v3L11 16", roll: "M12 4a8 8 0 108 8M20 4v5h-5", skill: "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z",
    orders: "M6 21V4M6 4h11l-2 4 2 4H6", aid: "M5 19c0-8 6-13 14-14-1 8-6 14-14 14zM5 19l7-7", spare: "M7 11V5.5a1.5 1.5 0 013 0V11", flee: "M10 6l-6 6 6 6M4 12h11", pause: "M8 5v14M16 5v14" };
  const keysOnly = () => V.el.classList.contains("wide") && !V.el.classList.contains("touch");
  function brief() {
    const R = V.R, B = R.B, S = K.S, mode = U.fightBriefMode(B), full = !(S.briefed || []).includes(mode), goal = U.fightBriefGoal(B);
    if (full) S.briefed = (S.briefed || []).concat(mode);
    const MODE = { duel: "A duel", melee: "Against several", hold: "A hold", rounds: "Last the rounds" };
    if (!full) {
      const line = U.el('<p class="fb-line wd-fbline" aria-live="polite"><b>' + (T(MODE[mode] || "Against several")) + "</b>" + (goal ? " · " + U.esc(goal) : "") + "</p>");
      V.stage.appendChild(line); clearOfToast(); setTimeout(() => line.remove(), 4200);
      if (!S.fightTour) { S.fightTour = 1; tour(); }
      return;
    }
    const k = keysOnly(), list = [];
    const add = (ic, name, words) => list.push([ic, name, words]);
    add("move", T("Move"), T(k ? "A / D to walk; W / S to change row" : "Hold ◀ ▶ to walk; swipe up or down to change row"));
    // (Build D, row 48: each weapon its own rhythm, and its line here; a swing is yours until it ends.)
    if (mace()) add("strike", T("Strike"), T(k ? "J, or click a foe: an overhead smash, then a side sweep" : "An overhead smash, then a side sweep") + " · " + T("Mace: heavy, slow to recover"));
    else if (dagger()) add("strike", T("Strike"), T(k ? "J, or click a foe: four quick stabs, then a heavy fifth" : "Four quick stabs, then a heavy fifth") + " · " + T("Dagger: quick and light"));
    else if (C.player().rt.weapon === "spear") add("strike", T("Strike"), T(k ? "J, or click a foe: two thrusts, then a lunge" : "Two thrusts, then a lunge") + " · " + T("Spear: long reach, slower to recover"));
    else add("strike", T("Strike"), T(k ? "J, or click a foe; three in a row for a combo" : "Three in a row for a combo") + " · " + T(C.player().rt.weapon === "bow" ? "Bow: from range; roll to defend" : "Sword: balanced"));
    if (R.blocker) add("block", T("Block"), T(k ? "Hold K or Space to raise your shield; it costs breath" : "Hold to raise your shield; it costs breath"));
    else add("roll", T("Roll"), T(k ? "K or Space, through a marked blow; it costs breath" : "Through a marked blow; it costs breath"));
    if (R.skill) add("skill", T(SKILL_NAME[R.skill]), T("Your path's skill; its ring fills as it gets ready"));
    if (B.units.some((u) => u.side === "ally" && u.hp > 0 && !u.still)) add("orders", T("Orders"), T("How those beside you fight"));
    add("aid", T("Aid"), T("Herbs, a divine weapon, a call for help"));
    if (B.enc.spare) add("spare", T("Spare"), T("Let a beaten foe live"));
    if (C.canFlee()) add("flee", T("Withdraw"), T(C.fleeBreaks().length ? "Leave the fight; it breaks a vow" : "Leave the fight, at a cost"));
    add("pause", T("Pause"), T(k ? "P or Esc: the fight waits" : "The fight waits"));
    const card = U.el('<div class="fbrief-wrap" role="dialog" aria-modal="true" aria-labelledby="fb-title"><div class="fbrief">' +
      '<p class="fb-tag">' + (T(B.enc.lethal ? "Battle · you can die here" : "A fight")) + "</p>" +
      '<h2 id="fb-title">' + U.t(K.val(B.enc.title)) + '</h2><p class="fb-mode">' + (T(MODE[mode] || "Against several")) + "</p>" + (goal ? '<p class="fb-goal">' + U.esc(goal) + "</p>" : "") +
      '<p class="fb-lbl">' + (T("What you can do")) + '</p><ul class="fb-acts">' + list.map(([ic, n, w]) => '<li><span class="fb-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + RT_ICONS[ic] + '"/></svg></span><b>' + n + "</b><small>" + w + "</small></li>").join("") + "</ul>" +
      '<div class="btnrow"><button type="button" class="cta fb-go">' + (T("Fight")) + "</button></div></div></div>");
    V.briefing = true;
    const go = V.briefGo = () => { if (!V || !card.isConnected) return; card.remove(); V.briefGo = null; if (!S.fightTour) { S.fightTour = 1; tour(); } else { V.briefing = false; V.last = 0; } };
    card.querySelector(".fb-go").addEventListener("click", go);
    V.el.appendChild(card);
    setTimeout(() => { const b = card.querySelector(".fb-go"); if (b && b.isConnected) b.focus({ preventScroll: true }); }, 300);
  }
  // The walkthrough (the layout page's tour): each control lit in turn, a caption at the top of the stage (over the
  // controls for the buttons at the top right), Skip in the caption; a tap or a key goes on. The fight waits.
  function tour() {
    if (!V) return;
    const R = V.R, k = keysOnly(), has = (sel) => !!V.el.querySelector(sel);
    const steps = [
      [k ? ".kstrip .ks-keys" : ".pad", k ? "Press A or D, or click the ground, to walk. You can pass your own people, never a foe." : "Hold ◀ ▶ to walk. You can pass your own people, never a foe."],
      mace() ? [k ? ".kstrip .ks-keys" : ".acts .strike", k ? "Press J, or click a foe, to strike: an overhead smash, then a side sweep that knocks him back. Once you swing, you cannot block or roll until the blow is done." : "Strike: an overhead smash, then a side sweep that knocks a foe back. Once you swing, you cannot block or roll until the blow is done."]
        : dagger() ? [k ? ".kstrip .ks-keys" : ".acts .strike", k ? "Press J, or click a foe, to strike: four quick stabs, then a heavy fifth that knocks him back. Once you strike, you cannot roll until the blow is done." : "Strike five times for a combo: four quick stabs, then a heavy fifth that knocks a foe back. Once you strike, you cannot roll until the blow is done."]
        : [k ? ".kstrip .ks-keys" : ".acts .strike", k ? "Press J, or click a foe, to strike. The third in a row knocks him back. Once you swing, you cannot block or roll until the blow is done." : "Strike three times for a combo. The third blow knocks a foe back. Once you swing, you cannot block or roll until the blow is done."],
      R.blocker ? [k ? ".kstrip .ks-keys" : ".acts .roll", k ? "A blow is marked on the ground. Hold K or Space (or the right mouse button) to raise your shield before the mark fills. Raised just in time, it staggers him. Holding it costs breath." : "A blow is marked on the ground. Hold Block to raise your shield before the mark fills to its rim. Raised just in time, it staggers him. Holding it costs breath."]
        : [k ? ".kstrip .ks-keys" : ".acts .roll", k ? "A blow is marked on the ground. Press K or Space (or right-click) to roll through it before the mark fills. Each roll costs breath." : "A blow is marked on the ground. Roll through it before the mark fills to its rim. Each roll costs breath."],
      R.skill ? [k ? ".kstrip .ks-skill" : ".acts .skill", k ? "L is your path's skill. The ring in the strip fills as it gets ready." : "Your path's skill. The ring fills as it gets ready again."] : null,
      [null, k ? "W or S (or ↑ ↓) steps to another row." : "Swipe up or down on the stage to step to another row."],
      has(".hb.orders") ? [".hb.orders", "Orders tell those beside you how to fight."] : null,
      [".hb.aid", "Herbs, your divine weapon and a call for help are in Aid."],
      [".hb.pause", k ? "Pause stops the fight. So do P and Esc." : "Pause stops the fight."]
    ].filter(Boolean);
    V.briefing = true; V.el.classList.add("touring");
    let i = -1;
    const clear = () => { $$(".lit", V.el).forEach((e) => e.classList.remove("lit")); $$(".tour-cap", V.el).forEach((e) => e.remove()); };
    const end = V.tourEnd = (skipped) => {
      if (!V) return; clear(); V.el.classList.remove("touring"); V.el.removeEventListener("pointerdown", block, true); V.el.removeEventListener("click", onClick, true);
      V.tourNext = V.tourEnd = null; V.briefing = false; V.last = 0;
      if (skipped === true) toast(K.tr("Walkthrough skipped. Every control is yours."));
    };
    const show = () => {
      clear();
      const [sel, text] = steps[i];
      if (sel) $$(sel, V.el).forEach((e) => e.classList.add("lit"));
      const cap = document.createElement("div"); cap.className = "tour-cap top"; cap.setAttribute("role", "status");
      cap.innerHTML = '<div class="tc-text"><span class="tc-step">' + U.esc(K.tr("{n} of {m}", { n: i + 1, m: steps.length }) + " · " + K.tr("Tap to go on")) + '</span><span class="tc-say">' + U.esc(K.tr(text)) + '</span></div><button type="button" class="tc-skip">' + U.esc(K.tr("Skip")) + "</button>";
      if (sel && sel.startsWith(".hb")) { cap.classList.remove("top"); Object.assign(cap.style, { position: "fixed", bottom: "calc(var(--pad) + 4px)", left: "var(--pad)", right: "var(--pad)" }); V.el.appendChild(cap); }
      else V.stage.appendChild(cap);
    };
    const next = V.tourNext = () => { i++; if (i >= steps.length) return end(); show(); };
    const block = (e) => { e.stopPropagation(); if (!e.target.closest(".tc-skip")) e.preventDefault(); };
    const onClick = (e) => { e.stopPropagation(); e.preventDefault(); if (e.target.closest(".tc-skip")) end(true); else next(); };
    V.el.addEventListener("pointerdown", block, true); V.el.addEventListener("click", onClick, true);
    next();
  }

  // ---------- The divine weapon (PRD §18.15; the layout page's astra() and impact()) ----------
  // The fight stands still (R.frozen) while the weapon's name holds over the field, about 2.4 s; as it ends
  // its element sweeps the field, a white-hot flash, a heavy shake and a ring; every foe it struck is thrown
  // (the engine's "thrown"), its damage in big numbers, weapons flying as they fall; scorches stay on the
  // ground with embers rising. Calm motion: one soft flash, no shake, nothing thrown.
  const AX_SUB = { agneya: "The fire weapon", varuna: "The water weapon", vayavya: "The wind weapon", sammohana: "The weapon of sleep", generic: "Indra's thunder" };
  function axStart(f) {
    const o = f.out || {}, me = V.actors.get(C.player().uid), to = o.uid && V.actors.get(o.uid), ab = K.ABILITIES[f.id] || {};
    const kind = o.kind || { agneya: "agneya", varuna: "varuna", vayavya: "vayavya", sammohana: "sammohana" }[f.id] || "generic";
    if (U.astraFx) U.astraFx({ kind, clash: !!o.clash, from: me && me.svg, to: to && to.svg, into: V.el, noFlash: true }); // the weapon's weather, over the stage
    const old = $(".ax", V.stage); if (old) old.remove();
    const title = K.tr(ab.name || "Divine weapon"), sub = K.tr(AX_SUB[f.id === "astra" ? "generic" : kind] || "Divine weapon");
    const line = !o.clash && ab.target === "enemies" ? K.tr("Every foe before you takes the blow.") : "";
    const ax = document.createElement("div"); ax.className = "ax k-" + kind;
    ax.innerHTML = '<i class="ax-fire"></i><i class="ax-edges"></i><i class="ax-blink"></i><div class="ax-title" aria-live="assertive"><b>' + U.esc(title) + "</b>" + (sub ? "<small>" + U.esc(sub) + "</small>" : "") + (line ? "<p>" + U.esc(line) + "</p>" : "") + "</div>";
    V.stage.appendChild(ax); void ax.offsetWidth; ax.classList.add("play");
    if (me) pose(me, "draw", 500, 0.7);
    if (U.rigFreeze && !U.calm()) U.rigFreeze(400);
    V.ax = { el: ax, kind, struck: f.struck || [], dealt: f.dealt || {}, clash: !!o.clash };
  }
  function axTick() {
    const R = V.R, X = V.ax, G = V.G, me = V.actors.get(C.player().uid);
    const struck = X.struck.map((uid) => V.actors.get(uid)).filter(Boolean);
    const dir = struck.length ? Math.sign(struck.reduce((n, a) => n + a.x, 0) / struck.length - (me ? me.x : 0)) || 1 : (C.player().rt.face || 1);
    if (!X.waved && R.frozen < 0.45) { // the element sweeps the field from your hand
      X.waved = true; X.el.classList.add("struck");
      if (me) pose(me, "loose", 1200, 0.5);
      if (!U.calm() && !X.clash) {
        X.el.insertAdjacentHTML("beforeend", '<i class="ax-wave"></i>');
        const wave = X.el.querySelector(".ax-wave"), mx = me ? me.x : G.W / 2, ww = G.W * 0.75;
        wave.style.bottom = (G.gl - G.ph * 0.2) + "px"; wave.style.height = (G.ph * 2.1) + "px";
        const from = dir > 0 ? mx - G.W * 0.35 : mx + G.W * 0.35 - ww, to = dir > 0 ? G.W * 1.05 : -ww - G.W * 0.05;
        wave.animate([{ transform: "translateX(" + from + "px) scaleX(0.4)", opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: "translateX(" + to + "px) scaleX(1)", opacity: 0.85 }], { duration: 620, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });
      }
    }
    if (X.hit || R.frozen > 0) return;
    X.hit = true;
    const calm = U.calm();
    X.el.insertAdjacentHTML("beforeend", '<i class="ax-white"></i><i class="ax-ring"></i>');
    if (!calm) X.el.querySelector(".ax-white").animate([{ opacity: 0 }, { opacity: 0.95, offset: 0.15 }, { opacity: 0 }], { duration: 420, easing: "ease-out" }); // calm: astraFx's one soft flash is all
    if (!calm) {
      const cx = struck.length ? struck.reduce((n, a) => n + a.x, 0) / struck.length : G.W * 0.7, cy = G.H - G.gl - G.ph * 0.3, ring = X.el.querySelector(".ax-ring");
      Object.assign(ring.style, { left: cx + "px", top: cy + "px", width: G.ph * 0.6 + "px", height: G.ph * 0.6 + "px" });
      ring.animate([{ transform: "translate(-50%,-50%) scale(0.2)", opacity: 0.95 }, { transform: "translate(-50%,-50%) scale(4.2)", opacity: 0 }], { duration: 760, easing: "ease-out" });
      shake(true); if (U.rigFreeze) U.rigFreeze(90);
      if (K.Sound) K.Sound.play("hit");
    }
    for (const a of struck) {
      const d = X.dealt[a.u.uid];
      if (d) {
        const big = document.createElement("span"); big.className = "pop big"; big.textContent = String(d);
        big.style.left = a.x + "px"; big.style.bottom = (a.gy + a.fh * 1.1) + "px"; V.world.appendChild(big);
        if (calm) setTimeout(() => big.remove(), 1200);
        else big.animate([{ transform: "translate(-50%,10px) scale(.5)", opacity: 0 }, { transform: "translate(-50%,-6px) scale(1.25)", opacity: 1, offset: 0.2 }, { transform: "translate(-50%,-50px) scale(1)", opacity: 0 }], { duration: 1300, easing: "ease-out" }).onfinish = () => big.remove();
      }
      if (X.clash) continue;
      // A scorch on the ground that stays, embers rising from it.
      const sc = document.createElement("i"); sc.className = "scorch k-" + X.kind; Object.assign(sc.style, { left: a.x + "px", bottom: (a.gy - a.fh * 0.05) + "px", width: (a.fh * 0.8) + "px", height: (a.fh * 0.14) + "px" }); V.world.appendChild(sc);
      if (U.flingBits) U.flingBits(V.world, "flake", { x: a.x, y: G.H - a.gy - a.fh * 0.5 }, 10, a.bw, "#8a3a2a");
    }
    if (!X.clash && struck.length) {
      const mx = me ? me.x : 0, strip = document.createElement("i"); strip.className = "scorch strip k-" + X.kind;
      Object.assign(strip.style, dir > 0 ? { left: (mx + G.W * 0.05) + "px", right: "0" } : { left: "0", width: Math.max(0, mx - G.W * 0.05) + "px" }, { bottom: (G.gl - G.ph * 0.05) + "px", height: (G.ph * 0.12) + "px" });
      V.world.appendChild(strip);
      const sc = $(".rt-scorch", V.stage); sc.className = "rt-scorch on k-" + X.kind; setTimeout(() => { if (V) sc.className = "rt-scorch"; }, 6000);
      if (!calm && X.kind !== "varuna" && X.kind !== "sammohana") {
        let n = 0; const host = V.world, emb = setInterval(() => { if (!V || !host.isConnected || ++n > 14) return clearInterval(emb); for (const a of struck) U.flingBits(host, "spark", { x: a.x + (Math.random() - 0.5) * a.bw, y: V.G.H - a.gy }, 2, a.bw, "#ff9a3c", true); }, 120);
      }
    }
    const el = X.el; setTimeout(() => el.remove(), 900); V.ax = null;
  }
})(window.K = window.K || {});
