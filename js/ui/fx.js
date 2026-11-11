/* Divine weapons, seen and heard. Invoking an astra is a short full-screen moment drawn in code over
   the battle painting (no art file, no video): the painting darkens, the mantra runs as a line of
   light, then the weapon's own effect, from your figure to the one it is loosed at:
     agneya    fire raining down, orange light and embers
     varuna    sheets of rain, a blue cast, steam
     vayavya   wind and dust streaking across, the enemy pushed back
     sammohana a violet haze; the foes slump
     nagapasha a serpent coil drawn around one foe
     generic   a white bolt and a shockwave (the one astra the game has today)
   Against one of the epic's heroes the counter-weapon answers: two streaks meet in the air in a white
   flash and a ring of force, the screen shakes once, and both are gone.
   With calm motion: one soft flash. Nothing flashes more than once. */
(function (K) {
  "use strict";
  const U = K.UI;
  const KINDS = {
    agneya: { tint: "rgba(255, 110, 30, 0.28)", col: ["#ffd27a", "#ff8a2a", "#ff5a1a"] },
    varuna: { tint: "rgba(40, 110, 200, 0.3)", col: ["#cfe6ff", "#8ab8f0", "#5a8ad8"] },
    vayavya: { tint: "rgba(210, 190, 150, 0.22)", col: ["#f3e6c8", "#d8c49a", "#b8a070"] },
    sammohana: { tint: "rgba(120, 60, 170, 0.32)", col: ["#e2c8ff", "#b48ae8", "#8a5ad0"] },
    nagapasha: { tint: "rgba(40, 120, 70, 0.26)", col: ["#c8f0b8", "#6ac07a", "#3a8a4a"] },
    generic: { tint: "rgba(255, 240, 200, 0.18)", col: ["#ffffff", "#fff1c4", "#ffd680"] }
  };
  const center = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.4, w: r.width, h: r.height }; };

  U.astraFx = function (o) {
    if (K.headless || !document.body) return;
    const kind = KINDS[o.kind] ? o.kind : "generic", K2 = KINDS[kind];
    const W = window.innerWidth, H = window.innerHeight;
    const from = center(o.from) || { x: W * 0.25, y: H * 0.45 }, to = center(o.to) || { x: W * 0.75, y: H * 0.45 };
    if (K.Sound) { K.Sound.play("gong"); setTimeout(() => K.Sound.play(o.clash ? "hit" : "choose"), 650); }
    const layer = U.el('<div class="astra-fx" aria-hidden="true"><i class="ax-dark"></i><i class="ax-tint" style="background:' + K2.tint + '"></i><i class="ax-mantra"></i><canvas></canvas></div>');
    if (o.noFlash) layer.classList.add("noflash"); // the screen that asked flashes once itself (the real-time fight)
    (o.into || document.body).appendChild(layer); // inside a moment, over its painting
    const reduced = U.calm();
    if (reduced) { layer.classList.add("still"); setTimeout(() => layer.remove(), 700); return; }
    const cv = layer.querySelector("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext("2d"); g.scale(dpr, dpr);
    const parts = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    // The weapon's own weather, around the target.
    const seed = () => {
      for (let i = 0; i < 90; i++) {
        if (kind === "agneya") parts.push({ x: to.x + rnd(-W * 0.3, W * 0.3), y: rnd(-H * 0.4, 0), vx: rnd(-30, 30), vy: rnd(380, 620), r: rnd(1.5, 4), c: K2.col[i % 3] });
        else if (kind === "varuna") parts.push({ x: rnd(0, W), y: rnd(-H, 0), vx: -60, vy: rnd(900, 1300), r: rnd(0.8, 1.6), len: rnd(14, 26), c: K2.col[i % 3] });
        else if (kind === "vayavya") parts.push({ x: rnd(-W * 0.5, 0), y: rnd(H * 0.2, H * 0.85), vx: rnd(900, 1500), vy: rnd(-30, 30), r: rnd(0.8, 2), len: rnd(30, 80), c: K2.col[i % 3] });
        else if (kind === "sammohana") parts.push({ x: to.x + rnd(-W * 0.25, W * 0.25), y: to.y + rnd(-H * 0.15, H * 0.2), vx: rnd(-12, 12), vy: rnd(-20, -6), r: rnd(18, 46), c: K2.col[i % 3], a: rnd(0.05, 0.14) });
      }
    };
    const t0 = performance.now(), BOLT = 520, DUR = 1700;
    let flashed = false, shook = false;
    const meet = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - H * 0.08 };
    function frame(now) {
      const t = now - t0, f = Math.min(1, t / DUR);
      g.clearRect(0, 0, W, H);
      // The bolt: from your hand to the target, or (a clash) from both sides to the middle.
      if (t < BOLT + 120) {
        const p = Math.min(1, t / BOLT);
        const line = (a, b, col) => {
          const x = a.x + (b.x - a.x) * p, y = a.y + (b.y - a.y) * p - Math.sin(p * Math.PI) * H * 0.06;
          g.strokeStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 24; g.lineCap = "round";
          g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + x) / 2, Math.min(a.y, y) - H * 0.05, x, y); g.stroke();
          g.shadowBlur = 0;
        };
        if (o.clash) { line(from, meet, K2.col[0]); line(to, meet, "#f6f2ff"); } else line(from, to, K2.col[0]);
      }
      const at = o.clash ? meet : to;
      if (t >= BOLT && !flashed) {
        flashed = true;
        layer.classList.add("flash");
        if (o.clash && !shook) { shook = true; document.body.classList.add("ax-shake"); setTimeout(() => document.body.classList.remove("ax-shake"), 380); }
        if (!o.clash) seed();
      }
      if (t >= BOLT) {
        const q = Math.min(1, (t - BOLT) / 700);
        // The ring of force where it lands (or where the two weapons meet).
        if (o.clash || kind === "generic") {
          g.strokeStyle = "rgba(255, 250, 235," + (1 - q).toFixed(2) + ")"; g.lineWidth = 6 * (1 - q) + 1;
          g.beginPath(); g.arc(at.x, at.y, 20 + q * Math.max(W, H) * 0.35, 0, Math.PI * 2); g.stroke();
        }
        if (!o.clash && kind === "nagapasha") {
          // A serpent coil drawn around the foe.
          g.strokeStyle = K2.col[1]; g.lineWidth = 6; g.shadowColor = K2.col[0]; g.shadowBlur = 12; g.lineCap = "round";
          g.beginPath();
          const turns = 3.2 * Math.min(1, q * 1.4);
          for (let a = 0; a <= turns * Math.PI * 2; a += 0.15) { const yy = at.y + to.h * 0.35 - (a / (turns * Math.PI * 2 || 1)) * to.h * 0.6; const xx = at.x + Math.cos(a) * to.w * 0.36; a === 0 ? g.moveTo(xx, yy) : g.lineTo(xx, yy); }
          g.stroke(); g.shadowBlur = 0;
        }
        const dt = 1 / 60;
        for (const p of parts) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (kind === "varuna" || kind === "vayavya") {
            g.strokeStyle = p.c; g.globalAlpha = 0.7 * (1 - f); g.lineWidth = p.r;
            g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - (kind === "vayavya" ? p.len : p.vx * 0.02), p.y - (kind === "varuna" ? p.len : 0)); g.stroke();
          } else if (kind === "sammohana") {
            g.globalAlpha = p.a * (1 - f * 0.6); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + q), 0, Math.PI * 2); g.fill();
          } else {
            g.globalAlpha = 1 - f; g.fillStyle = p.c; g.shadowColor = p.c; g.shadowBlur = 10; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
          }
          g.globalAlpha = 1;
        }
      }
      if (t < DUR) requestAnimationFrame(frame);
      else { layer.classList.add("out"); setTimeout(() => layer.remove(), 400); }
    }
    requestAnimationFrame(frame);
    // The enemy reels from wind; the foes slump under the haze.
    if (!o.clash && o.to && (kind === "vayavya" || kind === "sammohana")) setTimeout(() => o.to.classList.add(kind === "vayavya" ? "ax-pushed" : "ax-slump"), BOLT);
  };

  // ---------- The mantra, traced (owner, 9 November: User Feedback 58) ----------
  // Invoking a divine weapon: the tap that chose it opens its sign over the stilled fight, a few glowing dots to join in
  // order with a finger or the mouse, or, on a keyboard, each stroke's arrow key. About 3 s (story mode and Easy: 4.5 s,
  // and the dots take a looser touch). done(true): traced, the weapon comes. done(false): time ran out and the mantra
  // breaks (no use spent; the weapon waits). done(false, true): Escape, nothing happens. Each weapon has its own sign.
  const SIGNS = {
    agneya: [[0.30, 0.88], [0.62, 0.66], [0.38, 0.46], [0.66, 0.26], [0.48, 0.08]], // a rising flame
    varuna: [[0.08, 0.56], [0.29, 0.32], [0.50, 0.56], [0.71, 0.80], [0.92, 0.56]], // a wave
    vayavya: [[0.50, 0.52], [0.66, 0.42], [0.56, 0.24], [0.30, 0.32], [0.26, 0.62], [0.54, 0.80], [0.84, 0.62]], // a whirlwind
    sammohana: [[0.66, 0.08], [0.38, 0.22], [0.28, 0.50], [0.38, 0.78], [0.66, 0.92]], // the crescent moon
    nagapasha: [[0.76, 0.12], [0.36, 0.18], [0.42, 0.46], [0.68, 0.56], [0.62, 0.86], [0.24, 0.88]], // the coiled serpent
    astra: [[0.66, 0.06], [0.38, 0.48], [0.62, 0.48], [0.34, 0.94]] // the Indrastra: Indra's lightning bolt
  };
  U.MANTRA_SIGNS = SIGNS;
  // The arrow keys for each stroke: the main direction, or either one on a slant.
  const strokeKeys = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], h = dx > 0 ? "ArrowRight" : "ArrowLeft", v = dy > 0 ? "ArrowDown" : "ArrowUp";
    if (Math.abs(dx) > 2 * Math.abs(dy)) return [h];
    if (Math.abs(dy) > 2 * Math.abs(dx)) return [v];
    return [h, v];
  };
  const ARROW = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
  U.mantra = function (id, o, done) {
    o = o || {};
    const pts = SIGNS[id] || SIGNS.astra;
    // Under the bots (K.headless, jsdom) the mantra holds at once, in step: their loops never yield to a timer.
    if (K.headless || /jsdom/i.test(navigator.userAgent || "")) return void done(true);
    if (U.mantraAuto) { setTimeout(() => done(true), 0); return; } // (browser tests: U.mantraAuto)
    const easy = !!(K.S && K.S.storyMode) || (K.RT && K.RT.difficulty && K.RT.difficulty() === "easy");
    const secs = o.secs || (easy ? 4.5 : 3), hitR = easy ? 12.5 : 9.5, calm = U.calm(), T = (s, p) => U.esc(K.tr(s, p));
    const keys = pts.slice(1).map((q, i) => strokeKeys(pts[i], q));
    const name = K.tr((K.ABILITIES[id] && K.ABILITIES[id].name) || "Divine weapon");
    const left = K.astraLeft ? K.astraLeft(id) : 3;
    const lamps = '<span class="mn-lamps" aria-hidden="true">' + [0, 1, 2].map((i) => '<i class="' + (o.free || i < left ? "lit" : "") + '"></i>').join("") + "</span>";
    const sub = o.free ? T("Against a champion: no use spent") : T("{n} of 3 uses left", { n: left });
    const dots = pts.map((q, i) => '<circle class="mn-dot" data-i="' + i + '" cx="' + q[0] * 100 + '" cy="' + q[1] * 100 + '" r="4.2"/>').join("");
    const el = U.el('<div class="mantra' + (calm ? " calm" : "") + '" role="dialog" aria-modal="true" aria-label="' + U.esc(name) + '" data-keys="' + keys.map((k) => k[0]).join(" ") + '">' +
      '<div class="mn-card"><b class="mn-name">' + U.esc(name) + "</b>" + '<p class="mn-sub">' + lamps + sub + "</p>" +
      '<svg class="mn-sign" viewBox="0 0 100 100"><polyline class="mn-done" points=""/><line class="mn-live" x1="0" y1="0" x2="0" y2="0" display="none"/>' + dots + "</svg>" +
      '<p class="mn-how">' + T("Trace the sign: join the lights in order") + '<span class="mn-keys"> · ' + T("or press the arrows") + " " + keys.map((k) => k.map((x) => ARROW[x]).join("/")).join(" ") + "</span></p>" +
      '<span class="mn-time"><i></i></span><p class="mn-broke" hidden>' + T("The mantra breaks") + "</p></div></div>");
    document.body.appendChild(el);
    const svg = el.querySelector(".mn-sign"), done1 = el.querySelector(".mn-done"), live = el.querySelector(".mn-live"), bar = el.querySelector(".mn-time i");
    const dotEls = [...el.querySelectorAll(".mn-dot")];
    let next = 0, over = false, tracking = false, t0 = 0, raf = 0;
    const mark = () => { dotEls.forEach((d, i) => { d.classList.toggle("on", i < next); d.classList.toggle("next", i === next); }); done1.setAttribute("points", pts.slice(0, next).map((q) => q[0] * 100 + "," + q[1] * 100).join(" ")); };
    const reach = () => { next++; if (K.Sound) K.Sound.play("tap"); mark(); if (next >= pts.length) finish(true); };
    const finish = (ok, cancel) => {
      if (over) return; over = true; cancelAnimationFrame(raf);
      window.removeEventListener("keydown", key, true);
      live.setAttribute("display", "none");
      el.classList.add(ok ? "traced" : "broke");
      if (!ok && !cancel) el.querySelector(".mn-broke").hidden = false;
      setTimeout(() => { el.remove(); done(ok, !!cancel); }, cancel ? 0 : calm ? 250 : ok ? 420 : 900);
    };
    // Where the pointer is, in the sign's own units (0–100).
    const at = (e) => { const r = svg.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]; };
    const near = (q) => { const d = pts[next]; return d && Math.hypot(q[0] - d[0] * 100, q[1] - d[1] * 100) <= hitR; };
    const move = (e) => {
      if (over || !tracking) return;
      const q = at(e);
      if (near(q)) reach();
      if (next > 0 && !over) { const a = pts[next - 1]; live.setAttribute("x1", a[0] * 100); live.setAttribute("y1", a[1] * 100); live.setAttribute("x2", q[0]); live.setAttribute("y2", q[1]); live.removeAttribute("display"); }
    };
    el.addEventListener("pointerdown", (e) => { if (over) return; e.preventDefault(); tracking = true; try { el.setPointerCapture(e.pointerId); } catch (x) { /* older browsers */ } move(e); });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", () => { tracking = false; live.setAttribute("display", "none"); });
    const key = (e) => {
      if (over) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); return finish(false, true); }
      if (!ARROW[e.key]) { e.stopPropagation(); return; }
      e.preventDefault(); e.stopPropagation();
      if (next === 0) return reach(); // the first light: any arrow begins
      if (keys[next - 1].includes(e.key)) reach();
      else if (!calm) { el.classList.remove("miss"); void el.offsetWidth; el.classList.add("miss"); }
    };
    window.addEventListener("keydown", key, true);
    mark();
    // The clock: a moment to see the sign, then the time runs.
    const tick = (now) => {
      if (over) return;
      if (!t0) t0 = now + 450;
      const f = Math.max(0, Math.min(1, (now - t0) / (secs * 1000)));
      bar.style.transform = "scaleX(" + (1 - f) + ")";
      if (f >= 1) return finish(false);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return el;
  };
})(window.K = window.K || {});
