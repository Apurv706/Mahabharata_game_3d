/* The page over the 3D view: helpers every screen shares. Text and translation, buttons and keys, the window (modal),
   notes that float up when something changes, pausing, the settings that calm or time things, the language switch, and
   the layout: which part of the screen the page covers, so the 3D scene can sit in the rest (K.G3.focus). */
(function (K) {
  "use strict";
  const U = (K.UI = K.UI || {});
  const G = K.G3 || {};
  U.games = U.games || {};
  U.$ = (id) => document.getElementById(id);
  U.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  U.t = (s) => U.esc(K.text(s));           // story text: translate, fill the life's tokens, escape
  U.tr = (s, p) => U.esc(K.tr(s, p));       // interface text: translate (and fill), escape
  U.el = function (html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  U.button = function (cls, html, onClick, id) {
    const b = document.createElement("button");
    b.type = "button"; b.className = cls; b.innerHTML = html;
    if (id) b.id = id;
    if (onClick) b.addEventListener("click", onClick);
    return b;
  };
  const headless = () => !!K.headless || /jsdom/i.test(navigator.userAgent || "");
  U.headless = headless;

  // ---------- People as small round faces (their own colours and first letter) ----------
  U.personByName = function (name) { for (const [id, p] of Object.entries(K.PEOPLE || {})) if (p.name === name) return id; return null; };
  U.face = function (id, cls) {
    const look = (id && G.lookOf && (K.PUPPETS[id] || (G.EXTRAS || {})[id])) || null;
    const pal = (look && look.palette) || ["#c27a44", "#8a3a2a", "#e2b55a"];
    const name = id ? K.personName(id) : "";
    return '<i class="face ' + (cls || "") + '" style="--skin:' + pal[0] + ";--cloth:" + pal[1] + ";--trim:" + pal[2] + '" aria-hidden="true"><b>' + U.esc((name || "?").trim().charAt(0)) + "</b></i>";
  };
  // Story text blocks: plain lines, speech, memories, curses, asides.
  U.blocks = function (arr) {
    return [].concat(K.val(arr) || []).filter(Boolean).map((b) => {
      if (typeof b === "string" || Array.isArray(b)) return "<p>" + U.t(b) + "</p>";
      if (b.speaker) { const who = U.personByName(b.speaker); return '<div class="said"' + (who ? ' data-who="' + who + '"' : "") + ">" + U.face(who) + '<div><div class="lbl">' + U.t(b.speaker) + '</div><p class="speech">' + U.t(b.line) + "</p></div></div>"; }
      if (b.memory) return '<p class="memory">' + U.t(b.memory) + "</p>";
      if (b.curse) return '<p class="curse">' + U.t(b.curse) + "</p>";
      if (b.aside) return '<p class="aside">' + U.t(b.aside) + "</p>";
      return "";
    }).join("");
  };

  // ---------- Settings that change how things move ----------
  U.calm = () => !!(K.prefs && K.prefs().calm) || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches && !(K.prefs && K.prefs().calm === false));
  U.applyCalm = () => { document.documentElement.classList.toggle("calm", U.calm()); };
  U.motion = () => !U.calm() && !headless();
  U.timed = () => !headless() && K.prefs().timed !== false;
  U.assist = () => { const a = K.prefs().assist; return a === undefined ? !!(K.S && K.S.storyMode) : !!a; };
  U.beatsOn = () => !headless() && K.prefs().beats !== false;

  // ---------- Pause: the tab hidden, a window open ----------
  let pausedMs = 0, pauseAt = null;
  const why = new Set();
  U.paused = () => pauseAt != null;
  U.clock = () => performance.now() - pausedMs - (pauseAt != null ? performance.now() - pauseAt : 0);
  U.setPaused = function (reason, on) {
    if (on) why.add(reason); else why.delete(reason);
    if (why.size && pauseAt == null) pauseAt = performance.now();
    else if (!why.size && pauseAt != null) { pausedMs += performance.now() - pauseAt; pauseAt = null; }
  };
  document.addEventListener("visibilitychange", () => U.setPaused("hidden", document.hidden));

  // ---------- Keys ----------
  // The numbered keys choose; with one thing to do, Enter and Space do it.
  let keyFns = [];
  U.keys = function (fns) { keyFns = fns || []; };
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (document.querySelector(".scrim")) { if (e.key === "Escape") U.closeModal(); return; }
    if (U.keyHook && U.keyHook(e)) return;
    const live = keyFns.filter(Boolean);
    if ((e.key === "Enter" || e.key === " ") && keyFns.length === 1 && keyFns[0]) { e.preventDefault(); keyFns[0](); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= keyFns.length && keyFns[n - 1]) { e.preventDefault(); keyFns[n - 1](); return; }
    if (e.key === " " && U.skipWrite && live.length) { e.preventDefault(); U.skipWrite(); }
  });

  // ---------- Top bar ----------
  U.where = function (html) { const w = U.$("where"); if (w) w.innerHTML = html || ""; };
  U.setNav = function (on) { const n = U.$("nav"); if (n) n.hidden = !on; };

  // ---------- The window ----------
  U.openModal = function (title, html, wire, cls) {
    U.closeModal();
    const el = U.el('<div class="scrim" role="dialog" aria-modal="true"><div class="modal ' + (cls || "") + '"><header><h2>' + U.tr(title) + '</h2><button type="button" class="x" aria-label="' + U.tr("Close") + '">×</button></header><div class="modal-body">' + html + "</div></div></div>");
    document.body.appendChild(el);
    el.querySelector(".x").addEventListener("click", U.closeModal);
    el.addEventListener("pointerdown", (e) => { if (e.target === el) U.closeModal(); });
    U.setPaused("modal", true);
    if (wire) wire(el);
    const f = el.querySelector(".modal"); if (f) { f.tabIndex = -1; try { f.focus({ preventScroll: true }); } catch (e) { /* old browsers */ } }
    return el;
  };
  U.closeModal = function () { const el = document.querySelector(".scrim"); if (el) el.remove(); U.setPaused("modal", false); if (U.onModalClose) { const f = U.onModalClose; U.onModalClose = null; f(); } };

  // ---------- Notes that float up ----------
  U.toast = function (text, cls, ms) {
    if (headless()) return;
    const box = U.$("floats"); if (!box) return;
    const el = U.el('<div class="float ' + (cls || "") + '">' + text + "</div>");
    box.appendChild(el);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => el.classList.add("out"), ms || 2600);
    setTimeout(() => el.remove(), (ms || 2600) + 500);
  };
  // What a choice just changed (K.lastDelta), said once in a few short notes.
  const LABEL = { duty: () => K.DUTIES, rep: () => K.FACTIONS, attr: () => K.ATTRS, skill: () => K.SKILLS };
  U.floatChanges = function () {
    const d = K.lastDelta || {}; if (headless()) return;
    const out = [];
    for (const [k, v] of Object.entries(d)) {
      if (typeof v !== "number" || !v) continue;
      const [kind, id] = k.split(".");
      let name = null;
      if (kind === "bond") name = K.personName(id); else if (LABEL[kind] && LABEL[kind]()[id]) name = K.tr(LABEL[kind]()[id]); else if (k === "tapas") name = K.tr("Tapas"); else if (kind === "item" && id === "herbs") name = K.tr("Healing herbs");
      if (name) out.push([v > 0, (v > 0 ? "▲ " : "▼ ") + U.esc(name)]);
    }
    if (d.vowTaken) out.push([true, U.tr("Vow: {vow}", { vow: K.tr(K.VOWS[d.vowTaken].name) })]);
    if (d.vowBroken) out.push([false, U.tr("Vow broken: {vow}", { vow: K.tr(K.VOWS[d.vowBroken].name) })]);
    if (d.boon && K.BOONS[d.boon]) out.push([true, U.tr("Gain: {boon}", { boon: K.tr(K.BOONS[d.boon].name) })]);
    if (d.curse && K.CURSES[d.curse]) out.push([false, U.tr(K.CURSES[d.curse].name)]);
    if (d.injury && K.INJURIES[d.injury]) out.push([false, U.tr(K.INJURIES[d.injury].name)]);
    if (d.astraGranted) out.push([true, U.tr("Gain: {boon}", { boon: K.tr(K.astraName(d.astraGranted)) })]);
    if (d.friendLost) out.push([false, U.tr("A friendship ends: {who}", { who: K.personName(d.friendLost) })]);
    if (d.heirloomLost) out.push([false, U.tr("Lost: {what}", { what: K.tr(K.HEIRLOOMS[d.heirloomLost].name) })]);
    out.slice(0, 5).forEach(([up, txt], i) => setTimeout(() => U.toast(txt, up ? "up" : "down"), i * 260));
  };

  // ---------- Language ----------
  U.loadLang = function (lang) {
    return new Promise((resolve) => {
      if (lang === "en" || K.hasStrings(lang)) return resolve(true);
      let left = 2; const done = (ok) => { if (!ok) return resolve(false); if (--left === 0) resolve(K.hasStrings(lang)); };
      for (const f of ["js/i18n/" + lang + ".js", "js/i18n/" + lang + "3d.js"]) { const s = document.createElement("script"); s.src = f; s.onload = () => done(true); s.onerror = () => done(f.endsWith("3d.js")); document.head.appendChild(s); }
    });
  };
  U.applyStatic = function () {
    document.documentElement.lang = (K.LANGS[K.lang] || K.LANGS.en).htmlLang;
    document.body.classList.toggle("lang-hi", K.lang === "hi");
    document.querySelectorAll("[data-tr]").forEach((el) => { el.textContent = K.tr(el.dataset.tr); });
    document.querySelectorAll("#nav button").forEach((b) => { const s = b.querySelector("[data-tr]"); if (s) b.title = K.tr(s.dataset.tr); });
  };
  U.setLang = function (id, then) {
    U.loadLang(id).then((ok) => { K.lang = ok ? id : "en"; K.prefs({ lang: K.lang }); U.applyStatic(); if (then) then(); else if (U.redraw) U.redraw(); });
  };
  U.langSwitch = function (onPick) {
    const box = U.el('<div class="seg lang" role="radiogroup"></div>');
    for (const [id, L] of Object.entries(K.LANGS)) { const b = U.button("", U.esc(L.name), () => onPick(id)); b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(K.lang === id)); box.appendChild(b); }
    return box;
  };

  // ---------- Layout: where the page is, and so where the scene goes ----------
  // "story": the page beside (wide screens) or below (upright); "full": the 3D view has the whole screen; "title".
  let mode = "title";
  U.layout = function (m) {
    if (m) mode = m;
    document.body.dataset.mode = mode;
    if (!G.ok) return;
    const W = window.innerWidth, H = window.innerHeight, page = U.$("page");
    if (mode === "story" && page && page.firstElementChild) {
      const r = page.getBoundingClientRect();
      if (W > H * 1.05) G.focus({ x: 0, y: 44, w: Math.max(200, r.left - 8), h: H - 44 });
      else G.focus({ x: 0, y: 40, w: W, h: Math.max(140, r.top - 40) });
    } else if (mode === "title") { if (W > H * 1.05) G.focus({ x: W * 0.36, y: 0, w: W * 0.64, h: H }); else G.focus({ x: 0, y: 0, w: W, h: H * 0.5 }); }
    else G.focus(null);
  };
  U.relayout = () => { requestAnimationFrame(() => U.layout()); };
  addEventListener("resize", () => U.layout());
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => U.layout()); const boot = () => { const p = U.$("page"); if (p) ro.observe(p); }; if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot(); }

  // The frame-rate counter (Menu: Show frame rate).
  let fpsEl = null;
  U.fpsMeter = function () {
    const on = !!(K.prefs && K.prefs().fps);
    if (!on) { if (fpsEl) { fpsEl.remove(); fpsEl = null; } return; }
    if (fpsEl || !G.ok) return;
    fpsEl = U.el('<div class="fps-meter" aria-hidden="true"></div>'); document.body.appendChild(fpsEl);
    let n = 0, t0 = performance.now();
    G.onFrame(() => { if (!fpsEl) return; n++; const now = performance.now(); if (now - t0 >= 1000) { fpsEl.textContent = Math.round((n * 1000) / (now - t0)) + " fps"; n = 0; t0 = now; } });
  };
})(window.K = window.K || {});
