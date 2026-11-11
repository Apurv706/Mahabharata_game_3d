/* The ending of a life, full-screen, and the act checkpoints (engine/flow.js K.checkpoint).
   The ending is a moment of its own, in the manner of ui/moments.js: the ending's painting fills the
   screen and drifts slowly, the title comes in gold with its caption, and the bards' lines ("They
   sing of...") appear one by one under the moment's theme; then the record, what became of the
   others, and the way back to the start of an act. A tap, a key or Skip shows everything at once.
   Some endings have a small touch drawn in code over the painting: embers and smoke over the burnt
   house, dust and low sunset light in the wheel, Karna's chariot wheel sinking, a fade to dusk with
   a garland or the oath's emblem, gentle morning light for those who lived. Calm motion: the still
   painting with everything at once. Shown again (a language switch, Continue onto it), it is there
   whole at once (ui/dom.js U.pageAgain).
   The act checkpoints: on a death, "Go back to the start of Act N" and the earlier acts; on any
   ending, and from the menu, "Start again from an act" (not the title screen, owner 7 November). */
(function (K) {
  "use strict";
  const U = K.UI;
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
  const SURVIVED = ["The wise elder", "Renunciation", "The teller", "Vengeance", "The homecoming", "Broken survivor", "The wanderer"];
  // What each ending adds over its painting: light (a coloured wash that comes in), parts (particles),
  // smoke (a haze), wheel (Karna's wheel sinking), garland or emblem, and its theme (audio.js).
  const TOUCH = {
    "The burnt house": { light: "ash", parts: "embers", smoke: true, theme: "farewell" },
    "Into the wheel": { light: "sunset", parts: "dust", theme: "farewell" },
    "Against the boy in the wheel": { light: "sunset", parts: "dust", theme: "farewell" },
    "Beside Karna": { light: "sunset", parts: "dust", wheel: true, theme: "farewell" },
    "Glorious death": { light: "dusk", garland: true, theme: "farewell" },
    "The oath to the death": { light: "dusk", emblem: "vow_samshaptaka", theme: "oath" },
    "Fallen at Kurukshetra": { light: "dusk", theme: "farewell" },
    "A life cut short": { light: "dusk", theme: "farewell" },
    "The one who crossed": { parts: "dust", theme: "crossed" }
  };
  K.endingTouch = (title) => TOUCH[title] || (SURVIVED.includes(title) ? { light: "morning", theme: "milestone" } : { theme: "milestone" });

  // ---------- The acts to go back to ----------
  const pathName = (p) => (p && K.PATHS && K.PATHS[p] ? K.tr(K.PATHS[p].name) : "");
  const actName = (n) => { const full = K.tr(K.ACT_TITLES[n] || ""); return full || K.tr("Act {n}", { n: ROMAN[n] || n }); };
  const actSub = (a) => [K.tr("Age {n}", { n: a.age }), pathName(a.path)].filter(Boolean).join(" · ");
  // The kept acts of the current life (or of the life just ended), latest first.
  // S null: for the life in the autosave, or (none) the last life.
  U.actsKept = function (S = K.S) {
    const cp = K.checkpoints && K.checkpoints();
    if (!cp || !cp.acts.length) return null;
    const who = S || K.loadSlot("auto");
    if (who && who.lifeId !== cp.id) return null;
    return { id: cp.id, name: cp.name, acts: cp.acts.slice().sort((a, b) => b.act - a.act) };
  };
  // Go back to the start of an act (part.js sends the earlier acts of Part Two to Part One).
  U.goBackToAct = function (act) {
    U.closeModal();
    endClose();
    if (!K.backToAct(act)) U.renderTitle();
  };
  // A button for each kept act: { act, html } ready to place, wired by U.wireActs.
  U.actButtons = function (kept, opts) {
    const o = opts || {};
    return kept.acts.map((a, i) => {
      const lead = o.died && i === 0 && a.act === o.died;
      const label = lead ? K.tr("Go back to the start of Act {n}", { n: ROMAN[a.act] || a.act }) : actName(a.act);
      return '<button type="button" class="' + (lead ? "cta" : "ghost") + ' actback" data-act="' + a.act + '"><b>' + U.esc(label) + "</b><small>" + U.esc(lead ? actName(a.act) + " · " + actSub(a) : actSub(a)) + "</small></button>";
    }).join("");
  };
  // confirm: the first tap asks again (a life in progress is not thrown away by one tap).
  U.wireActs = function (root, confirm) {
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
    U.openModal("Start again from an act",
      '<p class="note">' + U.tr("{name}'s life, at the start of each act it reached. Going back takes up the life as it was then; everything after is lived again.", { name: U.esc(kept.name || K.tr("Unnamed")) }) + "</p>" +
      (inProgress ? '<p class="note">' + U.tr("Your life in progress is replaced. Tap an act twice to go back.") + "</p>" : "") +
      '<div class="actlist">' + U.actButtons(kept) + "</div>",
      () => U.wireActs(document.querySelector(".modal .actlist"), inProgress));
  };

  // ---------- The ending ----------
  let live = null; // the ending on screen: { el, timers, raf, done }
  function endClose() {
    if (!live) return;
    live.timers.forEach(clearTimeout);
    if (live.raf) cancelAnimationFrame(live.raf);
    window.removeEventListener("keydown", live.key, true);
    live.el.remove();
    live = null;
    document.body.classList.remove("ending-on");
  }
  U.endingClose = endClose;
  // Leaving the ending (a new life, the title, a scene) takes the screen away.
  for (const name of ["renderScene", "renderTitle", "renderCreate"]) {
    const f = U[name];
    if (!f) continue;
    U[name] = function (sc) { if (!(name === "renderScene" && sc && sc.ending)) endClose(); return f.apply(this, arguments); };
  }

  const WHEEL_SVG = '<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="86" fill="none" stroke="#2a180c" stroke-width="14"/><circle cx="100" cy="100" r="86" fill="none" stroke="#e2b55a" stroke-width="4"/>' +
    Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return '<line x1="' + (100 + 16 * Math.cos(a)).toFixed(1) + '" y1="' + (100 + 16 * Math.sin(a)).toFixed(1) + '" x2="' + (100 + 80 * Math.cos(a)).toFixed(1) + '" y2="' + (100 + 80 * Math.sin(a)).toFixed(1) + '" stroke="#d9a94e" stroke-width="5" stroke-linecap="round"/>'; }).join("") +
    '<circle cx="100" cy="100" r="19" fill="#2a180c" stroke="#e2b55a" stroke-width="4"/></svg>';
  // A marigold garland: a ring of beads, knotted at the foot.
  const GARLAND_SVG = '<svg viewBox="0 0 200 220" aria-hidden="true">' +
    Array.from({ length: 22 }, (_, i) => { const a = (i * 2 * Math.PI) / 22 - Math.PI / 2; return '<circle cx="' + (100 + 70 * Math.cos(a)).toFixed(1) + '" cy="' + (96 + 78 * Math.sin(a)).toFixed(1) + '" r="10" fill="' + (i % 2 ? "#f6c13a" : "#ee8a1c") + '" stroke="#9c4f10" stroke-width="1.5"/>'; }).join("") +
    '<path d="M92 178 L84 210 M108 178 L116 210" stroke="#3f6b2a" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="176" r="9" fill="#c0392b"/></svg>';

  // Embers rising, or dust drifting in the low light, on a canvas over the painting.
  function particles(cv, kind) {
    const ctx = cv.getContext && cv.getContext("2d");
    if (!ctx) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const size = () => { W = cv.width = Math.round(cv.clientWidth * dpr); H = cv.height = Math.round(cv.clientHeight * dpr); };
    size();
    const R = Math.random, N = kind === "embers" ? 46 : 38;
    const spawn = (any) => kind === "embers"
      ? { x: R() * W, y: any ? R() * H : H * (0.7 + R() * 0.35), vx: (R() - 0.4) * 18 * dpr, vy: -(22 + R() * 40) * dpr, r: (1 + R() * 2.2) * dpr, a: 0.5 + R() * 0.5, f: R() * 6 }
      : { x: any ? R() * W : -10, y: H * (0.25 + R() * 0.7), vx: (6 + R() * 16) * dpr, vy: (R() - 0.5) * 4 * dpr, r: (0.8 + R() * 1.8) * dpr, a: 0.18 + R() * 0.3, f: R() * 6 };
    const ps = Array.from({ length: N }, () => spawn(true));
    let last = performance.now();
    return function frame(now) {
      if (cv.clientWidth * dpr !== W) size();
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.f += dt * 5;
        if (p.y < -10 || p.x > W + 10 || p.x < -20) ps[i] = spawn(false);
        const a = kind === "embers" ? p.a * (0.6 + 0.4 * Math.sin(p.f)) * Math.min(1, p.y / (H * 0.3)) : p.a;
        ctx.fillStyle = kind === "embers" ? "rgba(255," + (130 + ((p.f * 20) | 0) % 60) + ",50," + a.toFixed(3) + ")" : "rgba(226,196,150," + a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    };
  }

  U.renderEnding = function (sc) {
    // A moment reached in the life's last scene (a farewell, a vow answered) is still shown, first.
    if (U.playMoments && K.momentQueue && K.momentQueue.length && U.playMoments(() => U.renderEnding(sc))) return;
    U.beatStop && U.beatStop();
    if (U.stageFx) U.stageFx.stop();
    const S = K.S;
    const pageKey = "ending:" + sc.id, again = U.pageAgain(pageKey, true);
    U.redraw = () => U.renderEnding(sc);
    const e = sc.ending(S);
    S.ending = e.title;
    K.recordLife(S, e);
    U.setNav(true);
    U.where("<b>" + U.tr("The end of a life") + "</b><span>" + U.tr(S.alive ? "Age {n}" : "Fell at {n}", { n: S.age }) + "</span>");
    U.keys([]);
    endClose();
    const headless = K.headless || /jsdom/i.test(navigator.userAgent || "");
    const still = U.calm() || headless;
    const all = still || again; // everything at once
    const T = K.endingTouch(e.title);
    if (K.Sound) { K.Sound.mood("calm"); if (!all) K.Sound.moment(T.theme); }
    const bg = U.bgUrl(e.art);
    const rec = K.record(S);
    const died = !S.alive ? S.deathAct || S.act : null;
    let kept = U.actsKept(S);
    if (kept && died) { kept = Object.assign({}, kept, { acts: kept.acts.filter((a) => a.act <= died) }); if (!kept.acts.length) kept = null; }
    const acts = kept ? '<div class="es-acts"><span class="lbl">' + U.tr(died ? "Go back" : "Start again from an act") + "</span>" +
      (died ? '<p class="es-note">' + U.tr("This death stays in your Book of Lives. Going back takes up the life as it was at the start of that act.") + "</p>" : "") +
      '<div class="actlist">' + U.actButtons(kept, { died }) + "</div></div>" : "";
    const map = S.road && S.road.length > 1 && U.mapOf ? '<div class="es-map"><span class="lbl">' + U.tr("Your road") + "</span>" + U.mapOf(S, { px: Math.min(640, window.innerWidth - 56) }) + "</div>" : "";
    const clipKey = e.clip || e.art, clip = !still && U.hasVideo(clipKey) && U.living(); // e.clip: a clip of its own (the house burning)
    const el = U.el('<div class="endscreen' + (still ? " still" : "") + (all ? " all" : "") + (S.alive ? " lived" : " fell") + (T.light ? " l-" + T.light : "") + '" role="dialog" aria-modal="true" aria-label="' + U.esc(K.tr(e.title)) + '">' +
      '<div class="es-art"><i style="--img:url(\'' + bg + '\')"></i></div>' +
      (T.light ? '<div class="es-light"></div>' : "") +
      (T.smoke ? '<div class="es-smoke"><i></i><i></i><i></i></div>' : "") +
      (T.parts && !still ? '<canvas class="es-parts" aria-hidden="true"></canvas>' : "") +
      (T.wheel ? '<div class="es-wheelbox" aria-hidden="true"><span class="es-wheel">' + WHEEL_SVG + '</span></div><div class="es-earth" aria-hidden="true"></div>' : "") +
      (T.garland ? '<span class="es-emblem garland" aria-hidden="true">' + GARLAND_SVG + "</span>" : "") +
      (T.emblem ? '<span class="es-emblem" style="--img:url(\'' + U.artUrl(T.emblem) + '\')" aria-hidden="true"></span>' : "") +
      '<div class="es-shade"></div>' +
      '<button type="button" class="es-skip">' + U.tr("Skip") + "</button>" +
      '<div class="es-scroll"><div class="es-col">' +
        '<div class="es-head"><span class="kind yours">' + U.tr("Your ending") + '</span><span class="mo-orn" aria-hidden="true"></span><h1 class="es-title">' + U.t(e.title) + "</h1>" +
          '<p class="es-cap">' + U.t(e.caption) + " · " + U.tr(S.alive ? "Age {n}" : "Fell at {n}", { n: S.age }) + "</p></div>" +
        '<div class="es-lines">' + e.telling.map((l) => '<p class="es-line">' + U.t(l) + "</p>").join("") + "</div>" +
        '<div class="es-rest">' +
          '<p class="es-record">' + U.tr("Your record: {w} fights won, {l} lost · {p} of {t} tests passed · {g} games won", { w: rec.won, l: rec.lost, p: rec.passed, t: rec.passed + rec.failed, g: rec.gamesWon }) + "</p>" +
          (e.fates && e.fates.length ? '<div class="es-fates"><span class="lbl">' + U.tr("What became of them") + "</span>" + e.fates.map((l) => "<p>" + U.t(l) + "</p>").join("") + "</div>" : "") +
          acts + map +
          '<div class="btnrow"><button class="' + (died && kept ? "ghost" : "cta") + '" id="again" type="button">' + U.tr("Live another life") + '</button><button class="ghost" id="readj" type="button">' + U.tr("Read your journal") + "</button></div>" +
        "</div>" +
      "</div></div>" +
      '<span class="es-tap">' + U.tr("Tap to show everything") + "</span></div>");
    if (clip) {
      const v = document.createElement("video");
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.autoplay = true; v.preload = "auto";
      v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
      if (U.clipSrc) U.clipSrc(v, clipKey); else v.src = "video/" + clipKey + ".mp4";
      v.addEventListener("playing", () => v.classList.add("on"));
      v.addEventListener("error", () => v.remove());
      el.querySelector(".es-art").appendChild(v);
    }
    document.body.appendChild(el);
    document.body.classList.add("ending-on");
    const run = (live = { el, timers: [], raf: 0, key: null, done: all });
    if (U.fitEmblems) U.fitEmblems(el);
    const scroller = el.querySelector(".es-scroll");
    const lines = [...el.querySelectorAll(".es-line")];
    const rest = el.querySelector(".es-rest");
    const liveAgain = () => { K.deleteSlot("auto"); U.renderCreate(); };
    el.querySelector("#again").addEventListener("click", liveAgain);
    el.querySelector("#readj").addEventListener("click", () => U.openJournal());
    if (kept) U.wireActs(el.querySelector(".es-acts"), false);
    const first = el.querySelector(".es-acts .cta") || el.querySelector("#again");
    const settle = () => { U.keys([() => first.click()]); };
    // Everything at once (a tap, a key, Skip, or the lines all shown).
    const showAll = () => {
      if (live !== run || run.done) return;
      run.done = true;
      run.timers.forEach(clearTimeout); run.timers = [];
      el.classList.add("all");
      lines.forEach((l) => l.classList.add("on"));
      settle();
    };
    run.key = (ev) => {
      if (document.querySelector(".scrim")) return;
      if (!run.done && [" ", "Enter", "Escape", "ArrowRight"].includes(ev.key)) { ev.preventDefault(); ev.stopPropagation(); showAll(); }
    };
    window.addEventListener("keydown", run.key, true);
    el.querySelector(".es-skip").addEventListener("click", (ev) => { ev.stopPropagation(); showAll(); });
    el.addEventListener("click", (ev) => { if (!run.done && !ev.target.closest("button, a, textarea")) showAll(); });
    U.pageShown(pageKey);
    if (all) { lines.forEach((l) => l.classList.add("on")); settle(); return; }
    // The sequence: the painting, the title, the lines one by one (the page follows the newest), then the rest.
    const at = (ms, fn) => run.timers.push(setTimeout(() => { if (live === run && !run.done) fn(); }, ms));
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
    at(900, () => el.classList.add("titled"));
    let t = 2400;
    const follow = (node) => { const want = node.offsetTop + node.offsetHeight - scroller.clientHeight + 48; if (want > scroller.scrollTop) scroller.scrollTo({ top: want, behavior: "smooth" }); };
    lines.forEach((l) => {
      at(t, () => { l.classList.add("on"); follow(l); });
      t += Math.max(1500, Math.min(3200, 900 + (l.textContent || "").length * 22));
    });
    at(t + 400, () => { el.classList.add("rested"); follow(rest.firstElementChild || rest); run.done = true; settle(); });
    if (T.parts) {
      const cv = el.querySelector(".es-parts"), draw = cv && particles(cv, T.parts);
      if (draw) { const loop = (now) => { if (live !== run) return; draw(now); run.raf = requestAnimationFrame(loop); }; run.raf = requestAnimationFrame(loop); }
    }
  };
})(window.K = window.K || {});
