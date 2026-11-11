/* Moments (PRD §18.12, Change List 22): the big milestones of a life get a few seconds of their own.
   A painting slowly moving, a gold title, one line of memory, a short theme; tap to go on. For a
   friend, your figure and your friend's step in and clasp hands; for a divine weapon the screen
   darkens, the mantra runs as a line of light, and its emblem rises from the ground into your raised hand (its glow stays).
   Where a moment has no painting of its own yet, the person's portrait stands in a gold frame over
   the painting of the place (option A). With calm motion: the still painting and the title.
   Moments are noticed in the engine (core.js), kept in S.moments for the character sheet and the
   Book of Lives, and played from K.momentQueue. */
(function (K) {
  "use strict";
  const U = K.UI;
  const PAINTED = { friend: ["arjuna", "bhima", "duryodhana", "karna", "charu"] };
  // A teacher's words when they take you on.
  const TEACHER_LINE = {
    drona: "\"Your arrow is mine now, and so is your fee, when I ask for it.\"",
    kripa: "\"Sweep the practice ground. Tomorrow we begin.\"",
    balarama: "\"Lift it again. Again. Good. You will do.\"",
    hermit: "\"Never say who taught you. That is the only fee.\"",
    vidura: "\"Notice everything. Say half of it.\""
  };
  const FRIEND_LINE = {
    arjuna: "You hit his swinging lamp in the dark when you were ten.",
    bhima: "You put him in the river when you were ten. He has never stopped telling people.",
    duryodhana: "You stood your ground in front of his brothers when you were ten.",
    karna: "You calmed a maddened horse beside him when you were ten.",
    charu: "You chose each other when you were ten."
  };

  // Everything one moment shows. Built from the record, so the card can be redrawn in any language.
  K.momentInfo = function (m, S = K.S) {
    // (the name in the current language only where a card shows it: a teacher moment's who is a teacher id, not a person)
    switch (m.kind) {
      case "friend": return { theme: "friend", title: ["A friend for life: {who}", { who: K.PEOPLE[m.who].name }], line: FRIEND_LINE[m.who] || "",
        art: PAINTED.friend.includes(m.who) ? "moment_friend_" + m.who : null, portrait: U.portraitKey(m.who), with: m.who };
      case "farewell": return { theme: "farewell", title: ["A friendship ends: {who}", { who: K.PEOPLE[m.who].name }], line: (K.FAREWELLS || {})[m.who] || "",
        art: PAINTED.friend.includes(m.who) ? "moment_friend_" + m.who : null, portrait: U.portraitKey(m.who), grey: true };
      case "teacher": return { theme: "milestone", title: ["Your teacher: {who}", { who: (K.TEACHERS[m.who] || {}).short || m.who }], line: TEACHER_LINE[m.who] || "", art: "moment_teacher" };
      case "marriage": return { theme: "milestone", title: ["Married: {who}", { who: K.PEOPLE[m.who] ? K.PEOPLE[m.who].name : (m.who ? K.personName(m.who, S) : "") }], line: "Seven steps around the fire, and the rest of your life to keep them.", art: "moment_marriage" };
      case "astra": {
        const g = (K.ASTRA_GIVERS || {})[m.from] || {}, A = (m.which ? K.ASTRAS && K.ASTRAS[m.which] : K.INDRA) || K.INDRA; // the plain astra: the Indrastra
        return { theme: "astra", title: A ? ["The {name}", { name: A.name }] : "A divine weapon", line: g.cond ? ["Given by {who}, on one condition: “{cond}”", { who: g.who, cond: g.cond }] : "The mantra is yours now, and so is every place it lands.",
          sub: A ? A.mantra : "The mantra is yours now, and so is every place it lands.", gift: A && A.gift ? A.gift : null, art: "moment_astra", astra: true };
      }
      case "vow": {
        const V = K.VOWS[m.id] || {};
        const w = K.watcherNames(m.id, S);
        return { theme: V.theme || "milestone", title: ["A vow: {vow}", { vow: V.name }], line: V.keep || V.gift, watch: w ? ["Watched by {who}", { who: w }, true] : null, price: V.price ? ["Broken: {price}", { price: V.price }] : null,
          art: null, place: V.place || "scene_vow", emblem: "vow_" + m.id }; // a vow may bring its own painting and theme (the Samshaptakas' oath)
      }
      case "crossed": return { theme: "crossed", title: "The one who crossed", line: "Yudhishthira's call was still in the air when you walked into it.", art: "scene_yuyutsu_crossing" };
      // Your strength rises a tier (Build D stage 3, Fight_Traits_Draft.md 1.3): over an existing painting (no new art).
      case "tier": return m.tier >= 2 ? { theme: "milestone", title: "A great champion", line: "Your blows break shields as a champion's do. Only a champion's heavy blow can stagger you now.", art: "fight_war_chariot" }
        : m.via === "helmet" ? { theme: "milestone", title: "Bhadra's helmet", line: "Men will look to it now. Your blows wear a shield down faster, and a soldier's heavy blow no longer staggers you.", art: "scene_duel_ground" }
        : m.via === "felled" && m.foe ? { theme: "milestone", title: "A captain's strength", line: ["{foe} is down, and the men around you saw who did it. A soldier's heavy blow no longer staggers you.", { foe: K.text(m.foe, null, S) }], art: "scene_duel_ground" }
        : { theme: "milestone", title: "A captain's strength", line: "Your blows wear a shield down faster, and a soldier's heavy blow no longer staggers you.", art: "scene_duel_ground" };
      case "company": return { theme: "milestone", title: "A company of your own", line: "They are yours to command, and yours to bring home.", art: "scene_command_banner", place: null, emblem: null };
      default: return K.MOMENT_KINDS && K.MOMENT_KINDS[m.kind] ? K.MOMENT_KINDS[m.kind](m, S) : null; // kinds the content adds (war_child.js)
    }
  };
  // The title alone, for cards and the Book of Lives.
  K.momentTitle = (m, S) => { const i = K.momentInfo(m, S); return i ? K.text(i.title, null, S) : ""; };
  K.momentThumb = (m) => { const i = K.momentInfo(m); return i ? i.art || i.portrait || i.emblem || i.place : null; };

  const tx = (v) => U.t(v);
  const reduced = () => U.calm();

  // The emblem of a divine weapon: an arrow of light.
  const ASTRA_SVG = '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="mo-ag" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff8e0"/><stop offset="0.45" stop-color="#ffd680" stop-opacity="0.75"/><stop offset="1" stop-color="#ffb040" stop-opacity="0"/></radialGradient></defs>' +
    '<circle cx="60" cy="60" r="56" fill="url(#mo-ag)"/><path d="M60 14 L68 34 L63 32 L63 96 L57 96 L57 32 L52 34 Z" fill="#fff6d8" stroke="#a8742a" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<path d="M57 96 L50 108 M63 96 L70 108 M60 96 L60 110" stroke="#fff6d8" stroke-width="2.4" stroke-linecap="round"/></svg>';

  let running = null;
  let playing = null; // the run of moments in progress: { q, dones }
  // Play every moment waiting in the queue, one after another, then call done. Returns false (and
  // does not call done) when there is nothing to play.
  U.playMoments = function (done) {
    const q = K.momentQueue.splice(0).filter((m) => (K.S.moments || []).includes(m)); // only this life's
    if (!q.length || K.headless || /jsdom/i.test(navigator.userAgent || "")) return false; // nothing to play: the caller goes on
    U.keys([]);
    // Moments already playing: these join the end of that run (two overlays never share one slot).
    if (playing) { playing.q.push(...q); if (done) playing.dones.push(done); return true; }
    const run = (playing = { q, dones: done ? [done] : [] });
    const next = () => { const m = run.q.shift(); if (!m) { playing = null; run.dones.forEach((f) => f()); return; } show(m, next); };
    next();
    return true;
  };

  // The paintings of moments just earned, loaded at once (the choice that earned them is still being told), so the
  // moment comes up on time (owner, 5 November: the friendship and vow moments came up late).
  U.preloadMoments = function () {
    for (const m of (K.momentQueue || [])) { try { const info = K.momentInfo(m, K.S); const key = info && (info.open || info.art || info.place); if (key) { const im = new Image(); im.src = U.bgUrl(key); } } catch (e) { /* a moment without a painting */ } }
  };
  function show(m, after) {
    const S = K.S, info = K.momentInfo(m, S);
    if (!info) return after();
    const still = reduced();
    // (info.open: the picture it opens on, when that is not its own painting: a clip's first frame, war_bhishma.js)
    const bg = info.open || info.art ? U.bgUrl(info.open || info.art) : U.bgUrl(info.place || (K.SCENES[S.scene] && typeof K.SCENES[S.scene].art === "string" ? K.SCENES[S.scene].art : "scene_vow"));
    const big = window.innerWidth >= 900 && window.innerHeight >= 700 ? 260 : 210; // the figures stand taller on a big screen
    // A painting of the moment already shows the people in it (two boys in the river), so the
    // puppets stand only over a framed portrait. The astra keeps its figure: the weapon rises into its hand.
    const figs = !info.art || info.astra;
    const me = figs && K.puppetSpec ? U.puppet(K.puppetSpec(S), { h: big, pose: info.astra ? "stand" : info.with ? "walk" : "stand", cls: "mo-me" }) : "";
    const friend = figs && info.with && U.puppetFor ? U.puppet(U.puppetFor(info.with, S), { h: big, pose: "walk", flip: true, cls: "mo-friend" }) : "";
    const frame = !info.art && info.portrait ? '<i class="mo-frame" style="--img:url(\'' + U.artUrl(info.portrait) + '\')" aria-hidden="true"></i>' : "";
    const emblem = info.astra ? '<span class="mo-emblem astra">' + ASTRA_SVG + "</span>" : info.emblem ? '<span class="mo-emblem" style="--img:url(\'' + U.artUrl(info.emblem) + '\')"></span>' : "";
    // (a clip's moment keeps its title for the clip's last beat: class clip from the first, until the clip fails)
    const el = U.el('<div class="moment k-' + m.kind + (still ? " still" : "") + (info.grey ? " grey" : "") + (info.art ? " painted" : " framed") + (info.clip && !still ? " clip" : "") + '" role="dialog" aria-modal="true" aria-label="' + U.esc(K.text(info.title)) + '">' +
      '<div class="mo-art" style="--img:url(\'' + bg + '\')"></div>' + (info.astra ? '<div class="mo-dark"></div><div class="mo-mantra"><i></i></div>' : "") + frame +
      '<div class="mo-figs">' + (me && (info.with || info.astra) ? '<span class="mo-l">' + me + "</span>" : "") + (friend ? '<span class="mo-r">' + friend + "</span>" : "") + (info.astra ? emblem : "") + "</div>" + (info.astra ? "" : emblem) +
      '<div class="mo-text"><span class="mo-orn" aria-hidden="true"></span><b class="mo-title">' + tx(info.title) + "</b>" + (info.line ? '<p class="mo-line">' + tx(info.line) + "</p>" : "") +
      (info.watch ? '<p class="mo-sub">' + tx(info.watch) + "</p>" : "") + (info.price ? '<p class="mo-sub down">' + tx(info.price) + "</p>" : "") +
      (info.astra && info.sub && info.line !== info.sub ? '<p class="mo-sub">' + U.t(info.sub) + "</p>" : "") + (info.gift ? '<p class="mo-sub gift">' + tx(info.gift) + "</p>" : "") + "</div>" +
      '<span class="mo-tap">' + U.tr("Tap to go on") + "</span></div>");
    const before = document.activeElement;
    document.body.appendChild(el);
    el.tabIndex = -1; try { el.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
    if (K.Sound && K.Sound.moment) K.Sound.moment(info.theme);
    const run = (running = { el });
    // The figures meet: your friend's hand in yours; the weapon's emblem rises into your hand.
    const beats = [];
    const at = (ms, fn) => beats.push(setTimeout(() => { if (running === run) fn(); }, still ? 0 : ms));
    // The painting comes in once it has loaded (or after a moment, whatever happens); the figures'
    // beats are timed from then, so a slow painting does not leave them behind.
    let shown = false;
    el.classList.add("wait"); // the dark ground at once, over the page
    const reveal = () => { if (shown || running !== run) return; shown = true; requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add("in"); el.classList.remove("wait"); plan(); })); };
    const plan = () => {
      // A clip's moment stays until the clip has ended and its title has been up 2.6 s (a phone that fetched the clip slowly
      // would otherwise close it before its end, with the title never shown), at most 30 s; a clip that failed (no longer
      // class clip) closes on its own length.
      const t0 = performance.now();
      const done = () => {
        if (info.clip && !still && el.classList.contains("clip") && performance.now() - t0 < 30000) {
          const end = +el.dataset.endedAt || 0;
          if (!end) { beats.push(setTimeout(done, 250)); return; }
          if (performance.now() - end < 2600) { beats.push(setTimeout(done, 2600 - (performance.now() - end))); return; }
        }
        close();
      };
      beats.push(setTimeout(done, still ? 6000 : info.ms || (info.astra ? 8200 : 7200))); // info.ms: a staged scene's own length (war_bhishma.js)
      if (info.play) at(info.playAt || 600, () => info.play(el)); // an effect drawn in code over the painting
      if (info.with) at(1900, () => {
        el.classList.add("met");
        el.querySelectorAll(".mo-figs svg").forEach((s) => s.setAttribute("class", s.getAttribute("class").replace(/\bpose-\S+/, "pose-clasp")));
      });
      if (info.astra) {
        at(2600, () => { el.classList.add("risen"); const s = el.querySelector(".mo-l svg"); if (s) s.setAttribute("class", s.getAttribute("class").replace(/\bpose-\S+/, "pose-lift")); });
        at(3600, () => {
          el.classList.add("taken");
          const s = el.querySelector(".mo-l svg"), em = el.querySelector(".mo-emblem.astra"), figs = el.querySelector(".mo-figs");
          if (s && !/\bglow\b/.test(s.getAttribute("class"))) s.setAttribute("class", s.getAttribute("class") + " glow");
          // Into the raised hand.
          if (s && em && figs) {
            const hand = s.querySelector(".foreF") || s, r = hand.getBoundingClientRect(), f = figs.getBoundingClientRect();
            em.style.left = (r.left - f.left + r.width / 2) + "px";
            em.style.bottom = (f.bottom - r.top) - 54 - 10 + "px";
          }
        });
      }
    };
    const im = new Image(); im.onload = reveal; im.onerror = reveal; im.src = bg; if (im.complete) reveal();
    setTimeout(reveal, 900);
    const close = () => {
      if (running !== run) return;
      running = null;
      beats.forEach(clearTimeout);
      window.removeEventListener("keydown", key, true);
      el.classList.add("out");
      setTimeout(() => { el.remove(); if (before && before.isConnected && before.focus) try { before.focus({ preventScroll: true }); } catch (e) { /* ignore */ } after(); }, still ? 0 : 420);
    };
    const key = (e) => { if ([" ", "Enter", "Escape", "ArrowRight"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); close(); } };
    window.addEventListener("keydown", key, true);
    el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); close(); });
  }
})(window.K = window.K || {});
