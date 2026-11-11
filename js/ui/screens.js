/* Title screen and character creation (the ending screen is in ui/ending.js). */
(function (K) {
  "use strict";
  const U = K.UI;

  // ---------- Title ----------
  // The hero: the title key art. Someone the epic never names stands on a ridge at dawn above the two
  // armies; the figure is right of centre, clear of the title.
  const HERO = { art: "key_art", caption: "Kurukshetra, at dawn on the first day", mirror: false };
  const ACTS = [
    [1, "scene_princes", "Ages 6 to 12", "Grow up beside the princes. Choose a friend, make a rival, tell your first lie."],
    [2, "scene_path", "Ages 14 to 19", "Find a teacher and a path: archer, healer, spy, bard, and more."],
    [3, "scene_swayamvara", "Ages 21 to 29", "A house of lac, a swayamvara, two kingdoms. Choose where you stand."],
    [4, "scene_secret", "Age 30", "The dice game. What you do in that hall follows you for the rest of your life."],
    [5, "scene_exile", "Ages 30 to 44", "Thirteen years: a marriage, a child, and a secret about Karna."],
    [6, "scene_day13", "Age 44", "Eighteen days at Kurukshetra. You can die here."],
    [7, "scene_teaching", "Age 44 onward", "What is left, who is left, and how the bards will tell it."]
  ];

  U.renderTitle = function () {
    U.redraw = U.renderTitle;
    if (K.Sound) K.Sound.mood("calm");
    U.setNav(false);
    document.body.classList.add("titling");
    U.where("");
    U.closeModal();
    const auto = K.loadSlot("auto");
    const leaf = U.$("leaf");
    // On one screen (owner, 7 November): the painting, the name, one line, the buttons, and the seven acts drifting
    // slowly left to right along the foot, each its painting and its name. (The list is drawn twice for the loop.)
    const card = ([n, art], hide) => {
      const [act, name] = K.tr(K.ACT_TITLES[n]).split(" · ");
      return "<li" + (hide ? ' aria-hidden="true"' : "") + '><i style="--img:url(\'' + U.artUrl(art) + '\')" aria-hidden="true"></i><div><span>' + U.esc(act) + "</span><b>" + U.esc(name || act) + "</b></div></li>";
    };
    leaf.innerHTML =
      '<section class="hero one" aria-labelledby="title-h">' +
        '<div class="slides" aria-hidden="true"><i class="slide on' + (HERO.mirror ? " mirror" : "") + '" style="--img:url(\'' + U.artUrl(HERO.art) + '\')"></i></div>' +
        '<div class="hero-bar" id="hero-bar"></div>' +
        '<div class="hero-copy">' +
          '<h1 class="title" id="title-h"><img class="logo ' + K.lang + '" src="brand/logo_' + (K.lang === "hi" ? "hi" : "en") + '_dark.svg" alt="' + U.tr("Kurukshetra: A Life") + '"></h1>' +
          // Each sentence starts its own line (it did only by the width of a few letters: on an iPhone SE "it." went
          // down to a third line wherever the text is drawn a little wider, as on GitHub's runner, 7 November).
          '<p class="tagline">' + U.tr("You cannot change the Mahabharata. You can decide who you were inside it.").split(/(?<=[.।!?])\s+/).join("<br>") + "</p>" +
          '<div class="btnrow" id="title-btns"></div>' +
        "</div>" +
        '<div class="acts-run" role="group" aria-label="' + U.tr("One life, seven acts") + '"><ol class="acts drift">' + ACTS.map((a) => card(a)).join("") + ACTS.map((a) => card(a, true)).join("") + "</ol></div>" +
        '<p class="hero-note">' + U.tr("Pre-production build. All story text is a working draft and still needs review by scholars and community advisors.") + "</p>" +
      "</section>";

    U.$("hero-bar").appendChild(U.langSwitch((id) => U.setLang(id)));
    const row = U.$("title-btns");
    const keys = [];
    if (auto && auto.scene !== "title") {
      const info = auto.alive ? K.tr("{name}, age {n}", { name: auto.name || K.tr("Unnamed"), n: auto.age }) : K.tr("{name}, age {n} (ended)", { name: auto.name || K.tr("Unnamed"), n: auto.age });
      const cont = () => K.resume(auto);
      row.appendChild(U.button("cta", U.tr("Continue · {info}", { info }), cont, "btn-continue"));
      keys.push(cont);
    }
    const fresh = () => U.renderCreate();
    row.appendChild(U.button(auto ? "cta secondary" : "cta", U.tr("Begin a new life"), fresh, "btn-new"));
    keys.push(fresh);
    // The painted map, on its way while the title is up (once the page is built: Part Two takes this button away and
    // has no creation page, nor the painting).
    setTimeout(() => { if (U.$("btn-new") && U.warmHomeMap) U.warmHomeMap(); }, 0);
    const load = () => U.openLoad();
    row.appendChild(U.button("ghost", U.tr("Load a save code"), load));
    keys.push(load);
    if (K.lives().length) { row.appendChild(U.button("ghost", U.tr("Book of Lives"), U.openLives, "btn-lives")); keys.push(U.openLives); }
    // (No "Start again from an act" here (owner, 7 November): it is in the Menu and on the ending screen, ui/ending.js.)
    U.keys(keys);
    // The introduction is written in, like every other page.
    // Shown again (a language switch), it is there whole at once (ui/dom.js U.pageAgain).
    const q = (sel) => leaf.querySelector(sel);
    const again = U.pageAgain("title");
    if (!again) q(".tagline").classList.add("write");
    q(".title").dataset.hold = 700;
    U.pageShown("title");
    U.stage([q(".title"), q(".tagline"), q(".hero .btnrow"), q(".acts-run"), q(".hero-note")], null, again);
  };

  // ---------- Character creation (owner, 6 November: one page, never a scroll) ----------
  // The map fills the screen. Tap a land and its painting and words come up in a card over the map, with "Be born
  // here". Then, on the same page and over the land's painting, one question at a time: your name, how the bards
  // speak of you (she or he), your temperament, your heirloom, and a last step (story mode, a past life, Begin).
  // What is answered stays above the card as label and value ("the land — Panchala") and takes you back to its
  // question. The look borrows from the owner's reference (a big picture, quiet lowercase heads, em-dash labels).
  // Every step's controls are in the page at once (only the current one shows), so a test can answer in any order.
  let draft = null;
  const STEPS = ["land", "name", "pronoun", "temperament", "heirloom", "last"];
  const newDraft = () => ({ step: "land", look: null, name: "", pronoun: null, origin: null, temperament: null, heirloom: null, storyMode: false, past: null });
  const STEP_NO = { en: ["i", "ii", "iii", "iv", "v", "vi"], hi: ["१", "२", "३", "४", "५", "६"] };
  const SUM = { land: "The land", name: "The name", pronoun: "The bards say", temperament: "The child", heirloom: "The heirloom" };
  let crResize = null;

  U.renderCreate = function () {
    const fresh = !draft; // a new life begun from the title (not a redraw: a language switch, a turned phone)
    draft = draft || newDraft();
    if (draft.pronoun && draft.pronoun !== "she" && draft.pronoun !== "he") draft.pronoun = null; // (she or he, owner 6 November)
    U.redraw = U.renderCreate;
    U.setNav(false);
    U.where("<b>" + U.tr("A new life") + "</b><span>" + U.tr("Age {n}", { n: 6 }) + "</span>");
    const leaf = U.$("leaf"), T = U.tr, num = (i) => (STEP_NO[K.lang] || STEP_NO.en)[i];
    const q = (i, text) => '<p class="cr-n">' + num(i) + '</p><h2 class="cr-q" tabindex="-1">' + T(text) + "</h2>";
    leaf.innerHTML = '<div class="cr" id="create">' +
      '<header class="cr-top"><button type="button" class="cr-home" id="cr-home" aria-label="' + T("Back to the title") + '">‹</button>' +
        '<div class="cr-head"><p class="cr-kick">' + T("A life the epic never wrote down") + '</p><h1 class="cr-title" id="cr-title"></h1></div>' +
        '<ol class="cr-dots" aria-hidden="true">' + STEPS.map((s) => '<li data-s="' + s + '"></li>').join("") + "</ol></header>" +
      '<div class="cr-mid"><div class="cr-map" id="cr-map"></div><div class="cr-art" id="cr-art"></div><div class="cr-kid" id="cr-kid" aria-hidden="true"></div><div class="cr-sum" id="cr-sum"></div>' +
        '<p class="cr-hint" id="cr-hint">' + T("Tap a land on the map.") + "</p>" +
        '<div class="sr-only" id="origins"></div></div>' +
      '<section class="cr-card" id="cr-card" aria-live="polite">' +
        '<div class="cr-panel" data-for="land" id="cr-land"></div>' +
        '<div class="cr-panel" data-for="name">' + q(1, "What will they call you?") +
          '<div class="cr-namerow"><input id="pname" type="text" maxlength="24" autocomplete="off" spellcheck="false" aria-label="' + T("Your name") + '" placeholder="' + U.esc(K.tr(K.ORIGINS[draft.origin || draft.look || "hastinapura"].defaultName || "Ira")) + '" value="' + U.esc(draft.name) + '">' +
          '<button type="button" class="cta cr-go" id="cr-next">' + T("Next") + "</button></div></div>" +
        '<div class="cr-panel" data-for="pronoun">' + q(2, "How should the bards speak of you?") + '<div class="opts cr-two" id="pron"></div></div>' +
        '<div class="cr-panel" data-for="temperament">' + q(3, "What kind of child were you?") + '<div class="picks cr-picks" id="temps"></div></div>' +
        '<div class="cr-panel" data-for="heirloom">' + q(4, "What was handed down to you?") + '<div class="picks cr-picks" id="heirs"></div></div>' +
        '<div class="cr-panel" data-for="last">' + q(5, "Before you are born") +
          '<label class="toggle"><input type="checkbox" id="story"' + (draft.storyMode ? " checked" : "") + "><span>" + T("Story mode") + "<small>" +
            T("You cannot die in battle, so you can see every chapter. Death stays a choice the story can still offer.") + "</small></span></label>" +
          (K.lives().length ? '<div class="cr-past"><span class="cr-lbl">' + T("Remember a past life?") + '</span><div class="picks pasts" id="pasts"></div></div>' : "") +
          '<button type="button" class="cta cr-go" id="begin">' + T("Begin this life") + "</button></div>" +
        '<p class="err" id="need"></p>' +
        '<button type="button" class="cr-back" id="back">' + T("Back") + "</button>" +
      "</section></div>";
    const cr = U.$("create");

    // The lands: pins on the map (drawn once the box is measured, below), and the same as plain buttons for
    // screen readers and the keyboard.
    for (const [id, v] of Object.entries(K.ORIGINS)) {
      const b = U.button("origin", U.tr(v.name), () => look(id));
      b.dataset.home = id; U.$("origins").appendChild(b);
    }
    // she or he; the temperaments; the heirlooms; a past life.
    const pick = (key, id) => {
      draft[key] = id; refresh();
      if (draft.step === key) setTimeout(() => { if (U.$("create") === cr) go(next(key)); }, U.calm() ? 60 : 260);
    };
    [["she", "She"], ["he", "He"]].forEach(([id, label]) => {
      const b = U.button("opt", U.tr(label), () => pick("pronoun", id));
      b.dataset.key = "pronoun"; b.dataset.id = id; U.$("pron").appendChild(b);
    });
    const cards = (elId, map, key, prefix, round) => Object.entries(map).forEach(([id, v]) => {
      const name = K.tr(v.name);
      const b = U.button("pick" + (round ? " round" : ""), '<i role="img" aria-label="' + U.esc(name) + '" style="background-image:url(\'' + U.artUrl(prefix + id) + '\')"></i><b>' + U.esc(name) + "</b><small>" + U.tr(v.short) + "</small>",
        () => pick(key, id));
      b.dataset.key = key; b.dataset.id = id;
      U.$(elId).appendChild(b);
    });
    cards("temps", K.TEMPERAMENTS, "temperament", "temper_", true);
    cards("heirs", K.HEIRLOOMS, "heirloom", "heir_", false);
    if (U.$("pasts")) {
      const past = (idx, html) => {
        const b = U.button("pick past", html, () => { draft.past = idx; refresh(); });
        b.dataset.key = "past"; b.dataset.id = String(idx);
        U.$("pasts").appendChild(b);
      };
      past(null, '<i class="none" aria-hidden="true"></i><b>' + U.tr("No") + "</b><small>" + U.tr("Begin with nothing remembered") + "</small>");
      K.lives().slice(0, 3).forEach((r, i) => past(i, '<i style="background-image:url(\'' + U.artUrl(r.art) + '\')" aria-hidden="true"></i><b>' + U.esc(r.me.name) + "</b><small>" + U.tr(r.title) + "</small>"));
    }
    function refresh() { cr.querySelectorAll("[data-key]").forEach((b) => b.setAttribute("aria-pressed", String(String(draft[b.dataset.key]) === b.dataset.id))); kid(); }
    // You, as the child of six (owner, 7 November): the puppet stands in the land's painting and changes with each
    // choice: she or he, the homeland's dress, the temperament's bearing, the heirloom in hand.
    const HELD = { bow: "bow", manuscript: "scroll" };
    let kidKey = "";
    function kid() {
      const box = U.$("cr-kid"); if (!box || !U.puppet || !K.puppetSpec || !draft || !draft.origin) return;
      const spec = K.puppetSpec({ age: 6, pronoun: draft.pronoun || "they", origin: draft.origin, temperament: draft.temperament, heirloom: draft.heirloom, flags: [], injuries: [], boons: [], astras: [] });
      if (!spec) return;
      spec.item = HELD[draft.heirloom] || null;
      const h = Math.round(Math.max(120, Math.min(420, (box.parentNode.clientHeight || 300) * 0.8)));
      const key = [draft.origin, draft.pronoun, draft.temperament, draft.heirloom, h].join("|");
      if (key === kidKey) return;
      const changed = !!kidKey && kidKey.split("|").slice(0, 4).join("|") !== key.split("|").slice(0, 4).join("|");
      kidKey = key;
      box.innerHTML = U.puppet(spec, { h, pose: "stand", fit: true }) + '<i class="cr-shadow"></i>';
      if (changed) { box.classList.remove("pop"); void box.offsetWidth; box.classList.add("pop"); }
    }
    refresh();

    // ---- Moving between the steps ----
    const answered = (s) => (s === "land" ? !!draft.origin : s === "name" ? !!draft.named || !!draft.name.trim() : s === "last" ? false : !!draft[s]);
    function next(s) { const i = STEPS.indexOf(s); return STEPS.slice(i + 1).find((x) => !answered(x)) || "last"; }
    function go(s) {
      if (s !== "land" && !draft.origin) s = "land";
      if (STEPS.indexOf(s) > 1) draft.named = true;
      draft.step = s; if (s !== "land") draft.look = null;
      paint();
      const h = cr.querySelector('.cr-panel[data-for="' + s + '"] .cr-q');
      if (s === "name") { const inp = U.$("pname"); if (inp && !(window.matchMedia && matchMedia("(hover: none)").matches)) inp.focus({ preventScroll: true }); } // (not on a phone: its keyboard would cover the card)
      else if (h) h.focus({ preventScroll: true });
    }
    function paint() {
      const s = draft.step, land = draft.origin && K.ORIGINS[draft.origin];
      cr.dataset.step = s;
      cr.classList.toggle("looking", s === "land" && !!draft.look);
      cr.classList.toggle("asking", s !== "land");
      U.$("cr-title").textContent = s === "land" ? K.tr("Where were you born?") : land ? K.tr(land.name) : "";
      cr.querySelectorAll(".cr-dots li").forEach((li) => { li.className = li.dataset.s === s ? "on" : answered(li.dataset.s) ? "done" : ""; });
      cr.querySelectorAll(".cr-panel").forEach((p) => { p.hidden = p.dataset.for !== s || (s === "land" && !draft.look); });
      U.$("back").hidden = s === "land";
      U.$("need").textContent = "";
      if (land) U.$("cr-art").style.setProperty("--img", "url('" + U.artUrl("home_" + draft.origin + (innerWidth > innerHeight ? "_wide" : "")) + "')");
      if (s !== "land") requestAnimationFrame(kid); // (once the page has its new shape)
      // What is answered, label and value; each takes you back to its question.
      const val = { land: land && K.tr(land.name), name: draft.name.trim() || (draft.named && land ? K.tr(land.defaultName || "Ira") : ""), pronoun: draft.pronoun && K.tr(draft.pronoun === "she" ? "She" : "He"),
        temperament: draft.temperament && K.tr(K.TEMPERAMENTS[draft.temperament].name), heirloom: draft.heirloom && K.tr(K.HEIRLOOMS[draft.heirloom].name) };
      const sum = U.$("cr-sum"); sum.innerHTML = "";
      if (s !== "land") Object.keys(SUM).forEach((k) => {
        if (!val[k] || k === s) return;
        const b = U.button("cr-row", '<span class="k">' + U.tr(SUM[k]) + '</span><b>' + U.esc(val[k]) + "</b>", () => go(k));
        sum.appendChild(b);
      });
      keysFor(s);
      if (s === "land") pan(); else if (U.$("cr-map").firstChild) U.$("cr-map").firstChild.style.transform = "";
    }
    function keysFor(s) {
      const btns = (sel) => [...cr.querySelectorAll(sel)].map((b) => () => b.click());
      U.keys(s === "land" ? (draft.look ? [() => U.$("land-ok").click()] : []) : s === "pronoun" ? btns("#pron .opt") : s === "temperament" ? btns("#temps .pick") :
        s === "heirloom" ? btns("#heirs .pick") : s === "last" ? [() => U.$("begin").click()] : []);
    }

    // ---- The map, and a land looked at ----
    function drawMap() {
      const box = U.$("cr-map"), w = box.clientWidth || innerWidth, h = box.clientHeight || innerHeight * 0.7;
      const phone = Math.min(innerWidth, innerHeight) < 600;
      // (drawn 1.7 times the box's height, the rest below it, so sliding the map up shows more map, never an edge)
      box.innerHTML = U.homeMap ? U.homeMap(draft.look || draft.origin, phone ? 2.05 : 1.15, Math.max(0.55, Math.min(2.4, w / h)), 1.7) : "";
      const svg = box.firstChild; if (svg && svg.style) svg.style.height = "170%";
      if (U.fitEmblems) U.fitEmblems(box);
      box.querySelectorAll(".m-home").forEach((g) => {
        g.addEventListener("click", () => look(g.dataset.home));
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); look(g.dataset.home); } });
      });
    }
    // With the card up, the map slides so the land looked at sits in the strip above it.
    function pan() {
      const svg = U.$("cr-map").firstChild; if (!svg || !svg.style || typeof DOMMatrix === "undefined") return;
      const pin = draft.look && svg.querySelector('.m-home[data-home="' + draft.look + '"] circle:not(.hit)');
      if (!pin) { svg.style.transform = ""; return; }
      requestAnimationFrame(() => {
        const box = U.$("cr-map"); if (!box) return;
        const br = box.getBoundingClientRect(), crb = cr.getBoundingClientRect(), cardH = U.$("cr-card").offsetHeight, cur = new DOMMatrix(getComputedStyle(svg).transform).m42 || 0;
        // (only as far as it must: a pin already clear of the card stays where it is)
        const py = pin.getBoundingClientRect().top + 6 - br.top - cur, room = Math.max(60, crb.bottom - cardH - br.top - 8);
        const want = Math.min(room - 34, Math.max(room / 2, 40));
        svg.style.transform = py <= room - 34 ? "" : "translateY(" + Math.round(Math.max(-br.height * 0.68, want - py)) + "px)";
      });
    }
    function look(id) {
      draft.look = id; draft.step = "land";
      const v = K.ORIGINS[id];
      const gives = K.preview({ fx: v.fx }).map(([cls, txt]) => '<span class="chip ' + (cls === "down" ? "bad" : "good") + '">' + U.esc(txt) + "</span>").join("");
      U.$("cr-land").innerHTML = '<div class="cr-plate" style="--img:url(\'' + U.artUrl("home_" + id + "_wide") + '\')"><button type="button" class="cr-x" id="land-back" aria-label="' + U.tr("See the other lands") + '">×</button></div>' +
        '<p class="cr-lbl">' + U.tr("Your homeland") + '</p><h2 class="cr-q cr-name" tabindex="-1">' + U.tr(v.name) + '</h2><p class="cr-region">' + U.tr(v.region) + "</p>" +
        '<p class="cr-text">' + U.t(v.detail) + "</p>" +
        '<div class="cr-gives"><span class="cr-lbl">' + U.tr("You begin with") + '</span><span class="chips">' + gives + "</span></div>" +
        '<button type="button" class="cta cr-go" id="land-ok">' + U.tr("Be born here") + "</button>";
      U.$("land-ok").addEventListener("click", () => { draft.origin = id; draft.look = null; const inp = U.$("pname"); if (inp) inp.placeholder = K.tr(v.defaultName || "Ira"); go(next("land")); });
      U.$("land-back").addEventListener("click", () => { draft.look = null; paint(); });
      U.$("cr-map").querySelectorAll(".m-home").forEach((g) => g.classList.toggle("on", g.dataset.home === id));
      paint();
    }

    // ---- The rest of the controls ----
    U.$("cr-home").addEventListener("click", () => { draft = null; leave(); U.renderTitle(); });
    U.$("pname").addEventListener("input", (e) => { draft.name = e.target.value; });
    U.$("pname").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); U.$("cr-next").click(); } });
    U.$("cr-next").addEventListener("click", () => { const inp = U.$("pname"); if (inp) inp.blur(); draft.named = true; go(next("name")); });
    U.$("story").addEventListener("change", (e) => { draft.storyMode = e.target.checked; });
    U.$("back").addEventListener("click", () => { const i = STEPS.indexOf(draft.step); go(STEPS[Math.max(0, i - 1)]); });
    U.$("begin").addEventListener("click", () => {
      const miss = [["land", "a homeland"], ["pronoun", "how the bards speak of you"], ["temperament", "a temperament"], ["heirloom", "an heirloom"]].filter(([k]) => (k === "land" ? !draft.origin : !draft[k]));
      if (miss.length) { const msg = K.tr("Choose {list} to begin.", { list: K.list(miss.map(([, w]) => K.tr(w))) }); go(miss[0][0]); U.$("need").textContent = msg; return; }
      const d = draft; draft = null; leave();
      U.beginLife(d);
    });
    cr.addEventListener("keydown", (e) => { if (e.key === "Escape" && draft && draft.look) { draft.look = null; paint(); } });

    // A turned phone or a resized window draws the map again for its new shape.
    const leave = () => { if (crResize) { removeEventListener("resize", crResize); crResize = null; } };
    leave();
    let rt = 0;
    crResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (U.$("create") !== cr) return leave(); drawMap(); paint(); }, 180); };
    addEventListener("resize", crResize);

    drawMap();
    if (draft.look) look(draft.look); else paint();
    // The pictures of the questions to come, fetched now so they are there when their step is.
    [...Object.keys(K.TEMPERAMENTS).map((k) => "temper_" + k), ...Object.keys(K.HEIRLOOMS).map((k) => "heir_" + k)].forEach((k) => { const im = new Image(); im.src = U.artUrl(k); });
    U.pageShown && U.pageShown("create");
    requestAnimationFrame(() => cr.classList.add("in"));
    if (fresh && draft.step === "land" && !draft.look && !K.headless && !/jsdom/i.test(navigator.userAgent || "")) intro();

    // The opening (owner, 7 November): before the map, the two lines alone on a dark screen ("a life the epic never
    // wrote down", "where were you born?"); they move up to where they sit, then the map comes in. A tap or a key goes
    // straight to the map. Calm motion: the lines, then the page, with nothing moving.
    function intro() {
      const kick = cr.querySelector(".cr-head .cr-kick"), title = U.$("cr-title");
      if (!kick || !title || !kick.getBoundingClientRect) return;
      const calm = U.calm(), timers = [], later = (f, ms) => timers.push(setTimeout(f, ms));
      const ov = U.el('<div class="cr-intro" aria-hidden="true"><p class="cr-kick">' + U.esc(kick.textContent) + '</p><p class="cr-title">' + U.esc(title.textContent) + "</p></div>");
      cr.appendChild(ov); cr.classList.add("intro");
      let done = false;
      const finish = () => {
        if (done) return; done = true; timers.forEach(clearTimeout);
        document.removeEventListener("pointerdown", finish, true); removeEventListener("keydown", finish, true);
        ov.remove(); cr.classList.remove("intro"); cr.classList.add("intro-out"); later(() => cr.classList.remove("intro-out"), 900);
      };
      document.addEventListener("pointerdown", finish, true); addEventListener("keydown", finish, true);
      requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add("on"))); // the two lines come up
      later(() => {
        if (done || !cr.isConnected) return;
        if (calm) return finish();
        // Each line to its place: the same words at the size and spot they keep on the page.
        const to = (el, at) => {
          const a = el.getBoundingClientRect(), b = at.getBoundingClientRect(), s = parseFloat(getComputedStyle(at).fontSize) / parseFloat(getComputedStyle(el).fontSize);
          el.style.transform = "translate(" + (b.left - a.left).toFixed(1) + "px," + (b.top - a.top).toFixed(1) + "px) scale(" + s.toFixed(4) + ")";
        };
        ov.classList.add("moving"); to(ov.querySelector(".cr-kick"), kick); to(ov.querySelector(".cr-title"), title);
        later(finish, 950);
      }, calm ? 1300 : 2000);
    }
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

  // The ending screen is in ui/ending.js.
})(window.K = window.K || {});
