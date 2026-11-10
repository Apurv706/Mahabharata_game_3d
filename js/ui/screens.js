/* The title, the making of a life, and the ending of one.
   Title: the field of Kurukshetra at dawn, the two hosts drawn up, and someone the epic never names standing before
   them. Creation: the map in relief (tap a homeland), then your own village with you in it at six, changing as you
   answer: she or he, your temperament, your heirloom. Ending: the ending's place, you in it as the life left you, and
   the bards' telling written beside it. */
(function (K) {
  "use strict";
  const U = K.UI, G = K.G3, D = U.director;
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
  let screenEl = null;
  // One screen's own layer over the scene (the title, the creation steps); the next screen takes it away.
  U.screen = function (el) { if (screenEl) screenEl.remove(); screenEl = el || null; if (el) U.$("stagehud").appendChild(el); if (!el && U.map3d && U.map3d.on && !U.map3d.keep) U.map3d.hide(); };

  // ---------- Title ----------
  const WARRIOR = { pronoun: "he", stage: "adult", palette: ["#b8743f", "#8a5a2a", "#e2b55a"], headgear: "band", gear: ["cuirass"], item: "spear" };
  function vista() {
    if (!G.ok) return;
    D.show("war_bhishma", [{ id: "me", spec: WARRIOR, at: [0.6, 4.4, Math.PI - 0.12], pose: "readySpear", tag: false }], { tags: false, clear: 10, dist: 10.5, intro: false, sky: "gold" });
    if (D.base) { D.base.look.set(0.4, 1.9, 1.5); D.base.yaw = 0.34; D.base.pitch = 0.1; D.base.rad = 4.2; }
    const f = D.figs.get("me"); if (f) f.setShield(true, 0x6e3026);
  }
  U.renderTitle = function () {
    U.redraw = U.renderTitle;
    if (K.Sound) K.Sound.mood("calm");
    U.setNav(false); U.where(""); U.closeModal(); U.keys([]);
    U.$("page").innerHTML = "";
    const auto = K.loadSlot("auto");
    const acts = [1, 2, 3, 4, 5, 6, 7].map((n) => { const [act, name] = K.tr(K.ACT_TITLES[n]).split(" · "); return "<li><b>" + ROMAN[n] + "</b>" + U.esc(name || act) + "</li>"; }).join("");
    const el = U.el('<section class="titlepage" aria-labelledby="title-h"><div class="langbar" id="hero-bar"></div>' +
      '<h1 class="title" id="title-h"><img class="logo ' + K.lang + '" src="brand/logo_' + (K.lang === "hi" ? "hi" : "en") + '_dark.svg" alt="' + U.tr("Kurukshetra: A Life") + '"></h1>' +
      '<p class="sub3d">' + U.tr("In three dimensions") + "</p>" +
      '<p class="tagline">' + U.tr("You cannot change the Mahabharata. You can decide who you were inside it.").split(/(?<=[.।!?])\s+/).join("<br>") + "</p>" +
      '<div class="btnrow" id="title-btns"></div><ol class="acts3d" aria-label="' + U.tr("One life, seven acts") + '">' + acts + "</ol>" +
      '<p class="hero-note">' + U.tr("Pre-production build. All story text is a working draft and still needs review by scholars and community advisors.") + "</p></section>");
    U.screen(el);
    U.layout("title");
    vista();
    U.$("hero-bar").appendChild(U.langSwitch((id) => U.setLang(id)));
    const row = U.$("title-btns"), keys = [];
    if (auto && auto.scene !== "title") {
      const info = K.tr(auto.alive ? "{name}, age {n}" : "{name}, age {n} (ended)", { name: auto.name || K.tr("Unnamed"), n: auto.age });
      const cont = () => { U.screen(null); K.resume(auto); };
      row.appendChild(U.button("cta", U.tr("Continue · {info}", { info }), cont, "btn-continue")); keys.push(cont);
    }
    const fresh = () => U.renderCreate();
    row.appendChild(U.button(auto ? "cta secondary" : "cta", U.tr("Begin a new life"), fresh, "btn-new")); keys.push(fresh);
    if (U.openArena) { const a = () => U.openArena(); row.appendChild(U.button("cta secondary", U.tr("Just the fights"), a, "btn-arena")); keys.push(a); }
    const load = () => U.openLoad();
    row.appendChild(U.button("ghost", U.tr("Load a save code"), load)); keys.push(load);
    if (K.lives().length) { row.appendChild(U.button("ghost", U.tr("Book of Lives"), U.openLives, "btn-lives")); keys.push(U.openLives); }
    row.appendChild(U.button("ghost", U.tr("Menu"), () => U.openMenu(), "btn-title-menu"));
    U.keys(keys);
  };

  // ---------- The making of a life ----------
  let draft = null;
  const STEPS = ["land", "name", "pronoun", "temperament", "heirloom", "last"];
  const newDraft = () => ({ step: "land", look: null, name: "", pronoun: null, origin: null, temperament: null, heirloom: null, storyMode: false, past: null });
  const STEP_NO = { en: ["i", "ii", "iii", "iv", "v", "vi"], hi: ["१", "२", "३", "४", "५", "६"] };
  const SUM = { land: "The land", name: "The name", pronoun: "The bards say", temperament: "The child", heirloom: "The heirloom" };
  const HELD = { bow: "bow", manuscript: "scroll" };
  const placeOf = (id) => K.locOf(K.ORIGINS[id].name, { flags: [], act: 1, origin: id }) || (id === "suta" ? "anga" : id);
  U.renderCreate = function () {
    draft = draft || newDraft();
    U.redraw = U.renderCreate;
    U.setNav(false); U.where(""); U.keys([]);
    U.$("page").innerHTML = "";
    const Tr = U.tr, num = (i) => (STEP_NO[K.lang] || STEP_NO.en)[i];
    const q = (i, text) => '<p class="cr-n">' + num(i) + '</p><h2 class="cr-q" tabindex="-1">' + Tr(text) + "</h2>";
    const cr = U.el('<div class="create" id="create">' +
      '<header class="cr-top"><button type="button" class="cr-home" id="cr-home" aria-label="' + Tr("Back to the title") + '">‹</button>' +
        '<div class="cr-head"><p class="cr-kick">' + Tr("A life the epic never wrote down") + '</p><h1 class="cr-title" id="cr-title"></h1></div>' +
        '<ol class="cr-dots" aria-hidden="true">' + STEPS.map((s) => '<li data-s="' + s + '"></li>').join("") + "</ol></header>" +
      '<div class="cr-sum" id="cr-sum"></div><p class="cr-hint" id="cr-hint">' + Tr("Tap a land on the map.") + '</p><div class="sr-only" id="origins"></div>' +
      '<section class="cr-card" id="cr-card" aria-live="polite">' +
        '<div class="cr-panel" data-for="land" id="cr-land"></div>' +
        '<div class="cr-panel" data-for="name">' + q(1, "What will they call you?") + '<div class="cr-namerow"><input id="pname" type="text" maxlength="24" autocomplete="off" spellcheck="false" aria-label="' + Tr("Your name") + '" placeholder="' + U.esc(K.tr("Ira")) + '" value="' + U.esc(draft.name) + '">' +
          '<button type="button" class="cta cr-go" id="cr-next">' + Tr("Next") + "</button></div></div>" +
        '<div class="cr-panel" data-for="pronoun">' + q(2, "How should the bards speak of you?") + '<div class="opts cr-two" id="pron"></div></div>' +
        '<div class="cr-panel" data-for="temperament">' + q(3, "What kind of child were you?") + '<div class="picks cr-picks" id="temps"></div></div>' +
        '<div class="cr-panel" data-for="heirloom">' + q(4, "What was handed down to you?") + '<div class="picks cr-picks" id="heirs"></div></div>' +
        '<div class="cr-panel" data-for="last">' + q(5, "Before you are born") +
          '<label class="toggle"><input type="checkbox" id="story-mode"' + (draft.storyMode ? " checked" : "") + "><span>" + Tr("Story mode") + "<small>" + Tr("You cannot die in battle, so you can see every chapter. Death stays a choice the story can still offer.") + "</small></span></label>" +
          (K.lives().length ? '<div class="cr-past"><span class="cr-lbl">' + Tr("Remember a past life?") + '</span><div class="picks cr-picks" id="pasts"></div></div>' : "") +
          '<button type="button" class="cta cr-go" id="begin">' + Tr("Begin this life") + "</button></div>" +
        '<p class="err" id="need"></p><button type="button" class="cr-back" id="back">' + Tr("Back") + "</button>" +
      "</section></div>");
    U.screen(cr);
    U.layout("full");
    for (const [id, v] of Object.entries(K.ORIGINS)) { const b = U.button("origin", U.tr(v.name), () => look(id)); b.dataset.home = id; U.$("origins").appendChild(b); }
    const pick = (key, id) => { draft[key] = id; refresh(); if (draft.step === key) setTimeout(() => { if (U.$("create") === cr) go(next(key)); }, U.calm() ? 60 : 420); };
    [["she", "She"], ["he", "He"]].forEach(([id, label]) => { const b = U.button("opt", U.tr(label), () => pick("pronoun", id)); b.dataset.key = "pronoun"; b.dataset.id = id; U.$("pron").appendChild(b); });
    const cards = (elId, map, key) => Object.entries(map).forEach(([id, v]) => { const b = U.button("pick", "<b>" + U.tr(v.name) + "</b><small>" + U.tr(v.short) + "</small>", () => pick(key, id)); b.dataset.key = key; b.dataset.id = id; U.$(elId).appendChild(b); });
    cards("temps", K.TEMPERAMENTS, "temperament"); cards("heirs", K.HEIRLOOMS, "heirloom");
    if (U.$("pasts")) {
      const past = (idx, html) => { const b = U.button("pick past", html, () => { draft.past = idx; refresh(); }); b.dataset.key = "past"; b.dataset.id = String(idx); U.$("pasts").appendChild(b); };
      past(null, "<b>" + U.tr("No") + "</b><small>" + U.tr("Begin with nothing remembered") + "</small>");
      K.lives().slice(0, 3).forEach((r, i) => past(i, "<b>" + U.esc(r.me.name) + "</b><small>" + U.tr(r.title) + "</small>"));
    }
    function refresh() { cr.querySelectorAll("[data-key]").forEach((b) => b.setAttribute("aria-pressed", String(String(draft[b.dataset.key]) === b.dataset.id))); kid(); }
    // You at six, standing in your own village: she or he, the homeland's dress, the heirloom in hand.
    let kidKey = "";
    function kid() {
      if (!G.ok || !draft || !draft.origin || draft.step === "land") return;
      const spec = K.puppetSpec({ age: 6, pronoun: draft.pronoun || "they", origin: draft.origin, temperament: draft.temperament, heirloom: draft.heirloom, flags: [], injuries: [], boons: [], astras: [] });
      spec.item = HELD[draft.heirloom] || null;
      const key = [draft.origin, draft.pronoun, draft.temperament, draft.heirloom].join("|");
      if (key === kidKey && D.on) return;
      const first = !kidKey || kidKey.split("|")[0] !== draft.origin || !D.on;
      kidKey = key;
      const pose = { bold: "ready", thoughtful: "think", devoted: "namaste", cunning: "stand" }[draft.temperament] || "stand";
      const set = () => {
        D.show("home_" + (draft.origin === "suta" ? "anga" : draft.origin), [{ id: "me", spec, key, pose: draft.temperament === "bold" ? "stand" : pose, at: [0, 0.6, 0.25], tag: false }], { tags: false, dist: 6.2, intro: first, sky: "day" });
        if (D.base) { D.base.look.set(0, 0.85, 0.6); D.base.rad = 1.9; D.base.yaw = 0.3; }
        const f = D.figs.get("me"); if (f && !first) { f.act("nod", 0.5); G.fx.burst("light", f.chest(), { n: 10 }); }
      };
      if (first) { U.map3d.keep = false; U.curtain(() => { if (U.map3d.on) U.map3d.hide(); set(); placeRect(); }); } else set();
    }
    // The scene sits in what the card leaves free.
    function placeRect() { if (!G.ok) return; const c = U.$("cr-card"); if (!c) return; const r = c.getBoundingClientRect(), W = innerWidth, H = innerHeight; if (W > H * 1.05) G.focus({ x: 0, y: 40, w: Math.max(200, r.left - 8), h: H - 40 }); else G.focus({ x: 0, y: 50, w: W, h: Math.max(160, r.top - 50) }); }
    refresh();
    const answered = (s) => (s === "land" ? !!draft.origin : s === "name" ? !!draft.named || !!draft.name.trim() : s === "last" ? false : !!draft[s]);
    function next(s) { const i = STEPS.indexOf(s); return STEPS.slice(i + 1).find((x) => !answered(x)) || "last"; }
    function go(s) {
      if (s !== "land" && !draft.origin) s = "land";
      if (STEPS.indexOf(s) > 1) draft.named = true;
      const was = draft.step;
      draft.step = s; if (s !== "land") draft.look = null;
      if (s === "land" && was !== "land") { kidKey = ""; U.curtain(() => { map(); paint(); }); return; }
      paint();
      const h = cr.querySelector('.cr-panel[data-for="' + s + '"] .cr-q');
      if (s === "name") { const inp = U.$("pname"); if (inp && !(window.matchMedia && matchMedia("(hover: none)").matches)) try { inp.focus({ preventScroll: true }); } catch (e) { /* older */ } } else if (h) try { h.focus({ preventScroll: true }); } catch (e) { /* older */ }
    }
    function paint() {
      const s = draft.step, land = draft.origin && K.ORIGINS[draft.origin];
      cr.dataset.step = s;
      U.$("cr-title").textContent = s === "land" ? K.tr("Where were you born?") : land ? K.tr(land.name) : "";
      cr.querySelectorAll(".cr-dots li").forEach((li) => { li.className = li.dataset.s === s ? "on" : answered(li.dataset.s) ? "done" : ""; });
      cr.querySelectorAll(".cr-panel").forEach((p) => { p.hidden = p.dataset.for !== s || (s === "land" && !draft.look); });
      U.$("cr-card").hidden = s === "land" && !draft.look;
      U.$("cr-hint").hidden = !(s === "land" && !draft.look);
      U.$("back").hidden = s === "land";
      U.$("need").textContent = "";
      const val = { land: land && K.tr(land.name), name: draft.name.trim() || (draft.named && land ? K.tr("Ira") : ""), pronoun: draft.pronoun && K.tr(draft.pronoun === "she" ? "She" : "He"),
        temperament: draft.temperament && K.tr(K.TEMPERAMENTS[draft.temperament].name), heirloom: draft.heirloom && K.tr(K.HEIRLOOMS[draft.heirloom].name) };
      const sum = U.$("cr-sum"); sum.innerHTML = "";
      if (s !== "land") Object.keys(SUM).forEach((k) => { if (!val[k] || k === s) return; sum.appendChild(U.button("cr-row", '<span class="k">' + U.tr(SUM[k]) + "</span><b>" + U.esc(val[k]) + "</b>", () => go(k))); });
      const btns = (sel) => [...cr.querySelectorAll(sel)].map((b) => () => b.click());
      U.keys(s === "land" ? (draft.look ? [() => U.$("land-ok").click()] : []) : s === "pronoun" ? btns("#pron .opt") : s === "temperament" ? btns("#temps .pick") : s === "heirloom" ? btns("#heirs .pick") : s === "last" ? [() => U.$("begin").click()] : []);
      if (s !== "land") { kid(); requestAnimationFrame(placeRect); }
      else if (G.ok) { if (draft.look) requestAnimationFrame(placeRect); else G.focus(null); }
    }
    // The map, with a pin on each homeland.
    function map() {
      if (!G.ok) return;
      U.map3d.keep = true;
      U.map3d.show({ focus: draft.look ? placeOf(draft.look) : null, dist: draft.look ? 11 : 21, pins: Object.entries(K.ORIGINS).map(([id, v]) => ({ id, place: placeOf(id), label: K.tr(v.name), cls: (draft.look === id ? "on " : "") + (id === "suta" ? "low" : ""), onClick: () => look(id) })) });
      U.map3d.wireDrag();
    }
    function look(id) {
      draft.look = id; draft.step = "land";
      const v = K.ORIGINS[id];
      const gives = K.preview({ fx: v.fx }).map(([cls, txt]) => '<span class="chip ' + (cls === "down" ? "bad" : "good") + '">' + U.esc(txt) + "</span>").join("");
      U.$("cr-land").innerHTML = '<p class="cr-lbl">' + U.tr("Your homeland") + '</p><h2 class="cr-q cr-name" tabindex="-1">' + U.tr(v.name) + '</h2><p class="cr-region">' + U.tr(v.region) + "</p>" + '<p class="cr-text">' + U.t(v.detail) + "</p>" +
        '<div class="cr-gives"><span class="cr-lbl">' + U.tr("You begin with") + '</span><span class="chips">' + gives + "</span></div>" +
        '<div class="btnrow"><button type="button" class="cta cr-go" id="land-ok">' + U.tr("Be born here") + '</button></div><button type="button" class="cr-back" id="land-back">' + U.tr("See the other lands") + "</button>";
      U.$("land-ok").addEventListener("click", () => { draft.origin = id; draft.look = null; go(next("land")); });
      U.$("land-back").addEventListener("click", () => { draft.look = null; paint(); if (G.ok) { U.map3d.drag.x = 0; U.map3d.drag.z = 0; U.map3d.focus(null, 21); } markPins(); });
      if (G.ok && U.map3d.on) { U.map3d.drag.x = 0; U.map3d.drag.z = 0; U.map3d.focus(placeOf(id), 11); }
      markPins();
      paint();
    }
    function markPins() { if (!U.map3d) return; for (const p of U.map3d.pins) p.el.classList.toggle("on", p.id === draft.look); }
    U.$("cr-home").addEventListener("click", () => { draft = null; U.map3d.keep = false; U.curtain(() => U.renderTitle()); });
    U.$("pname").addEventListener("input", (e) => { draft.name = e.target.value; });
    U.$("pname").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); U.$("cr-next").click(); } });
    U.$("cr-next").addEventListener("click", () => { const inp = U.$("pname"); if (inp) inp.blur(); draft.named = true; go(next("name")); });
    U.$("story-mode").addEventListener("change", (e) => { draft.storyMode = e.target.checked; });
    U.$("back").addEventListener("click", () => { const i = STEPS.indexOf(draft.step); go(STEPS[Math.max(0, i - 1)]); });
    U.$("begin").addEventListener("click", () => {
      const miss = [["land", "a homeland"], ["pronoun", "how the bards speak of you"], ["temperament", "a temperament"], ["heirloom", "an heirloom"]].filter(([k]) => (k === "land" ? !draft.origin : !draft[k]));
      if (miss.length) { const msg = K.tr("Choose {list} to begin.", { list: K.list(miss.map(([, w]) => K.tr(w))) }); go(miss[0][0]); U.$("need").textContent = msg; return; }
      const d = draft; draft = null; U.map3d.keep = false;
      U.screen(null);
      U.beginLife(d);
    });
    if (draft.step === "land") { map(); if (draft.look) look(draft.look); else paint(); } else { kidKey = ""; paint(); }
  };
  U.beginLife = function (d) {
    const S = (K.S = K.newLife());
    S.name = (d.name || "").trim() || K.tr(K.ORIGINS[d.origin].defaultName || "Ira");
    S.pronoun = d.pronoun; S.origin = d.origin; S.temperament = d.temperament; S.heirloom = d.heirloom; S.storyMode = !!d.storyMode;
    K.apply(K.ORIGINS[d.origin].fx);
    K.apply(K.TEMPERAMENTS[d.temperament].fx);
    K.apply(K.HEIRLOOMS[d.heirloom].fx);
    K.apply({ flag: ["origin_" + d.origin, "temper_" + d.temperament, "heir_" + d.heirloom] });
    K.apply({ journal: "You were born in {origin}." });
    const past = d.past != null && K.lives()[d.past];
    if (past) K.rebirth(S, past);
    K.go(K.FIRST_SCENE);
  };

  // ---------- Act checkpoints ----------
  const pathName = (p) => (p && K.PATHS && K.PATHS[p] ? K.tr(K.PATHS[p].name) : "");
  const actName = (n) => K.tr(K.ACT_TITLES[n] || "") || K.tr("Act {n}", { n: ROMAN[n] || n });
  const actSub = (a) => [K.tr("Age {n}", { n: a.age }), pathName(a.path)].filter(Boolean).join(" · ");
  U.actsKept = function (S = K.S) {
    const cp = K.checkpoints && K.checkpoints();
    if (!cp || !cp.acts.length) return null;
    const who = S || K.loadSlot("auto");
    if (who && who.lifeId !== cp.id) return null;
    return { id: cp.id, name: cp.name, acts: cp.acts.slice().sort((a, b) => b.act - a.act) };
  };
  U.goBackToAct = function (act) { U.closeModal(); U.screen(null); if (!K.backToAct(act)) U.renderTitle(); };
  U.actButtons = function (kept, o) {
    o = o || {};
    return kept.acts.map((a, i) => {
      const lead = o.died && i === 0 && a.act === o.died;
      const label = lead ? K.tr("Go back to the start of Act {n}", { n: ROMAN[a.act] || a.act }) : actName(a.act);
      return '<button type="button" class="' + (lead ? "cta" : "ghost") + ' actback" data-act="' + a.act + '"><b>' + U.esc(label) + "</b> <small>" + U.esc(lead ? actName(a.act) + " · " + actSub(a) : actSub(a)) + "</small></button>";
    }).join("");
  };
  U.wireActs = function (root, confirm) {
    if (!root) return;
    root.querySelectorAll(".actback").forEach((b) => {
      let armed = !confirm;
      b.addEventListener("click", () => {
        const act = +b.dataset.act;
        if (!armed) { armed = true; b.classList.add("armed"); b.querySelector("b").textContent = K.tr("Tap again to go back to Act {n}", { n: ROMAN[act] || act }); return; }
        U.goBackToAct(act);
      });
    });
  };
  U.openActs = function () {
    const kept = U.actsKept(null);
    if (!kept) return;
    const auto = K.loadSlot("auto");
    const inProgress = auto && auto.alive && auto.lifeId === kept.id && !(K.SCENES[auto.scene] || {}).ending;
    U.openModal("Start again from an act", '<p class="muted">' + U.tr("{name}'s life, at the start of each act it reached. Going back takes up the life as it was then; everything after is lived again.", { name: U.esc(kept.name || K.tr("Unnamed")) }) + "</p>" +
      (inProgress ? '<p class="muted">' + U.tr("Your life in progress is replaced. Tap an act twice to go back.") + "</p>" : "") + '<div class="actlist">' + U.actButtons(kept) + "</div>",
      () => U.wireActs(document.querySelector(".modal .actlist"), inProgress));
  };

  // ---------- The ending of a life ----------
  const SURVIVED = ["The wise elder", "Renunciation", "The teller", "Vengeance", "The homecoming", "Broken survivor", "The wanderer"];
  const TOUCH = { "The burnt house": { light: "ash", parts: "embers", smoke: true, theme: "farewell" }, "Into the wheel": { light: "sunset", parts: "dust", theme: "farewell" }, "Against the boy in the wheel": { light: "sunset", parts: "dust", theme: "farewell" },
    "Beside Karna": { light: "sunset", parts: "dust", wheel: true, theme: "farewell" }, "Glorious death": { light: "dusk", garland: true, theme: "farewell" }, "The oath to the death": { light: "dusk", emblem: "vow_samshaptaka", theme: "oath" },
    "Fallen at Kurukshetra": { light: "dusk", theme: "farewell" }, "A life cut short": { light: "dusk", theme: "farewell" }, "The one who crossed": { parts: "dust", theme: "crossed" } };
  K.endingTouch = (title) => TOUCH[title] || (SURVIVED.includes(title) ? { light: "morning", theme: "milestone" } : { theme: "milestone" });
  const END_POSE = { "Renunciation": "sit", "The teller": "sitPlay", "The wise elder": "stand", "Broken survivor": "slump", "Vengeance": "ready", "The homecoming": "namaste", "The wanderer": "stand" };
  U.endingClose = function () {};
  U.renderEnding = function (sc) {
    if (U.playMoments && K.momentQueue && K.momentQueue.length && U.playMoments(() => U.renderEnding(sc))) return;
    if (U.beatStop) U.beatStop();
    U.screen(null);
    const S = K.S;
    const pageKey = "ending:" + sc.id, again = U.pageAgain(pageKey, true);
    U.redraw = () => U.renderEnding(sc);
    const e = sc.ending(S);
    S.ending = e.title;
    K.recordLife(S, e);
    U.setNav(true);
    U.where("<b>" + U.tr("The end of a life") + "</b><span>" + U.tr(S.alive ? "Age {n}" : "Fell at {n}", { n: S.age }) + "</span>");
    U.keys([]);
    const Tch = K.endingTouch(e.title);
    if (K.Sound) { K.Sound.mood("calm"); if (!again && !U.headless()) K.Sound.moment(Tch.theme); }
    const rec = K.record(S);
    const died = !S.alive ? S.deathAct || S.act : null;
    let kept = U.actsKept(S);
    if (kept && died) { kept = Object.assign({}, kept, { acts: kept.acts.filter((a) => a.act <= died) }); if (!kept.acts.length) kept = null; }
    const acts = kept ? '<div class="es-acts"><div class="lbl">' + U.tr(died ? "Go back" : "Start again from an act") + "</div>" + (died ? '<p class="aside">' + U.tr("This death stays in your Book of Lives. Going back takes up the life as it was at the start of that act.") + "</p>" : "") +
      '<div class="actlist">' + U.actButtons(kept, { died }) + "</div></div>" : "";
    const road = (S.road || []).filter((id) => K.PLACES[id]);
    // The place, and you in it as the life left you.
    const stage = () => {
      if (!G.ok) return;
      const sky = { ash: "dawn", sunset: "dusk", dusk: "dusk", morning: "dawn" }[Tch.light];
      const st = D.show(e.art || "end_death", [{ id: "me", tag: false, pose: S.alive ? END_POSE[e.title] || "stand" : "down" }], { tags: false, sky, dist: 6.5, force: true });
      const me = D.figs.get("me"); if (me && !S.alive) { me.fall = 1; me.fallTo = 1; me.update(0, 0); }
      if (st && Tch.parts) st.amb(Tch.parts === "embers" ? "embers" : "dust", { r: 12, rate: 8 });
      if (st && Tch.smoke) st.amb("smoke", { r: 8, rate: 3 });
      if (st && Tch.light === "morning") st.amb("motes", { r: 9, rate: 6 });
      D.sceneNow = null;
    };
    const page = () => {
      stage();
      const el = U.sheet('<div class="sheet-head"><span class="kind yours">' + U.tr("Your ending") + "</span><h1>" + U.t(e.title) + '</h1><p class="cap">' + U.t(e.caption) + " · " + U.tr(S.alive ? "Age {n}" : "Fell at {n}", { n: S.age }) + "</p></div>" +
        '<div class="story" id="story" tabindex="0"><div class="telling">' + e.telling.map((l) => "<p>" + U.t(l) + "</p>").join("") + "</div>" +
        '<div class="es-rest"><p class="aside">' + U.tr("Your record: {w} fights won, {l} lost · {p} of {t} tests passed · {g} games won", { w: rec.won, l: rec.lost, p: rec.passed, t: rec.passed + rec.failed, g: rec.gamesWon }) + "</p>" +
        (e.fates && e.fates.length ? '<div class="witness"><div class="lbl">' + U.tr("What became of them") + "</div>" + e.fates.map((l) => "<p>" + U.t(l) + "</p>").join("") + "</div>" : "") +
        (road.length > 1 ? '<p class="aside"><b>' + U.tr("Your road") + ":</b> " + road.map((id) => U.esc(K.tr(K.PLACES[id].name))).join(" → ") + "</p>" : "") + acts + "</div></div>" +
        '<div class="actions"><div class="btnrow"><button class="' + (died && kept ? "ghost" : "cta") + '" id="again" type="button">' + U.tr("Live another life") + '</button><button class="ghost" id="readj" type="button">' + U.tr("Read your journal") + "</button></div></div>", "ending");
      const liveAgain = () => { K.deleteSlot("auto"); U.curtain(() => U.renderCreate()); };
      U.$("again").addEventListener("click", liveAgain);
      U.$("readj").addEventListener("click", () => U.openJournal());
      if (kept) U.wireActs(el.querySelector(".es-acts"), false);
      const first = el.querySelector(".es-acts .cta") || U.$("again");
      const lines = [...el.querySelectorAll(".telling p")];
      lines.forEach((l) => { l.dataset.hold = Math.max(1300, Math.min(2800, 700 + (l.textContent || "").length * 18)); });
      U.pageShown(pageKey);
      U.stage([el.querySelector(".sheet-head"), ...lines, el.querySelector(".es-rest"), el.querySelector(".actions")], () => U.keys([() => first.click()]), again);
    };
    if (G.ok && !again) U.curtain(page); else page();
  };
})(window.K = window.K || {});
