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

  // ---------- Field events, drawn on the field (Build D, feedback row 38) ----------
  // A field event or a fight's scripted beat ("The horse come on in a wedge...") is still said in a line, and now it is also
  // drawn across the field for about 2.6 s, in code (no art file): the kind is read from the line's English words. Horsemen
  // or chariots ride across, an elephant tramples through, arrows come down and stand in the ground, fire runs along the
  // ground, dark falls and a cloud crosses the moon, dust or smoke sweeps over, a serpent of light crosses the sky, a giant
  // shadow leans over the torches, a palm-tree banner rides the far line, a conch's or a roar's rings spread, a water-carrier
  // runs your line, the ranks press in. Calm motion: nothing drawn (the line says it).
  const FIELD_KINDS = [
    ["giant", /ghatotkacha|something huge|very high up|where the shape is/i],
    ["elephant", /elephant/i],
    ["glow", /brighter than every torch/i],
    ["water", /water-carrier/i],
    ["fire", /fire|flame|burning/i],
    ["dark", /moon|in the dark|mist|gutters|the sun is lower/i],
    ["wind", /wind|dust between|smoke|steam/i],
    ["serpent", /serpent/i],
    ["arrows", /arrow|like rain|sheet|range|looses|bowstring/i],
    ["chariot", /chariot|wheels|charioteer/i],
    ["horse", /horse|wedge|rider|charge/i],
    ["banner", /banner/i],
    ["conch", /conch|roar|shout|laugh|voice|calls to|begging/i],
    ["press", /close in|close round|thinning|wave comes|not there|goes down|comes on|comes at|comes back|comes in|bars the road|comes forward|turns back/i]
  ];
  U.fieldKind = (key) => { const s = Array.isArray(key) ? String(key[0]) : String(key || ""); const k = FIELD_KINDS.find((x) => x[1].test(s)); return k ? k[0] : "press"; };
  // Which way it comes: from your own side (behind your line, your name) left to right, otherwise from the foe's side.
  const fromMine = (s) => /behind your line|your line|your name|your side|behind you/i.test(s);
  U.fieldFx = function (host, key) {
    if (K.headless || !host || !document.body || U.calm()) return null;
    const s = Array.isArray(key) ? String(key[0]) : String(key || ""), kind = U.fieldKind(s), mine = fromMine(s);
    const r = host.getBoundingClientRect(); if (r.width < 40 || r.height < 40) return null;
    const W = r.width, H = r.height, dpr = Math.min(2, window.devicePixelRatio || 1);
    host.querySelectorAll(".field-fx").forEach((x) => x.remove());
    const el = U.el('<div class="field-fx fx-' + kind + '" aria-hidden="true"><canvas></canvas></div>');
    host.insertBefore(el, host.firstChild); // over the painting, under the figures and the lines
    const cv = el.querySelector("canvas"); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext("2d"); g.scale(dpr, dpr);
    const rnd = (a, b) => a + Math.random() * (b - a), DUR = 2600, ground = H * 0.82, S = Math.min(W, H * 1.6);
    const dir = mine ? 1 : -1, x0 = mine ? -0.25 * W : 1.25 * W; // left to right from your side, else right to left
    const ink = (a) => "rgba(24, 14, 6, " + a + ")";
    // A horse at a gallop (legs in two pairs swinging), with a rider and his spear; s: its height.
    const horse = (x, y, sz, ph, d, a, rider) => {
      g.save(); g.translate(x, y); g.scale(d * sz / 60, sz / 60); g.fillStyle = ink(a); g.strokeStyle = ink(a); g.lineCap = "round";
      g.beginPath(); g.ellipse(0, -30, 26, 11, 0, 0, Math.PI * 2); g.fill(); // body
      g.beginPath(); g.moveTo(18, -36); g.lineTo(30, -56); g.lineTo(40, -54); g.lineTo(42, -47); g.lineTo(31, -45); g.lineTo(24, -28); g.closePath(); g.fill(); // neck and head
      g.lineWidth = 3; g.beginPath(); g.moveTo(-25, -34); g.quadraticCurveTo(-36, -32 + Math.sin(ph) * 3, -40, -20); g.stroke(); // tail
      g.lineWidth = 4.2;
      const leg = (lx, sw) => { g.beginPath(); g.moveTo(lx, -24); g.lineTo(lx + Math.sin(sw) * 11, -9); g.lineTo(lx + Math.sin(sw) * 15 + 3, 0); g.stroke(); };
      leg(16, ph); leg(10, ph + 0.9); leg(-16, ph + Math.PI); leg(-21, ph + Math.PI + 0.9);
      if (rider) { g.beginPath(); g.moveTo(-2, -40); g.lineTo(4, -62); g.lineTo(-4, -63); g.lineTo(-9, -40); g.closePath(); g.fill(); g.beginPath(); g.arc(1, -68, 5.5, 0, Math.PI * 2); g.fill(); g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -48); g.lineTo(52, -72); g.stroke(); }
      g.restore();
    };
    const dust = (x, y, n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = "rgba(150, 120, 80, " + (a * rnd(0.3, 1)).toFixed(3) + ")"; g.beginPath(); g.arc(x + rnd(-30, 30), y - rnd(0, 26), rnd(8, 22), 0, Math.PI * 2); g.fill(); } };
    const arrows = kind === "arrows" ? Array.from({ length: Math.round(46 + W / 22) }, () => ({ x: rnd(-0.1, 1.15) * W, t: rnd(0, 1300), stand: rnd(ground - H * 0.06, ground + H * 0.08), ang: rnd(0.25, 0.4) * (mine ? -1 : 1) })) : null;
    const nFl = Math.round(14 + W / 60), flames = Array.from({ length: nFl }, (_, i) => ({ x: (i + rnd(0.1, 0.9)) / nFl * W, y: ground + rnd(-H * 0.03, H * 0.06), h: rnd(0.12, 0.26), w: rnd(0.022, 0.04), ph: rnd(0, 6) }));
    const embers = Array.from({ length: 60 }, () => ({ x: rnd(0, W), y: rnd(ground - 10, H), v: rnd(30, 90), r: rnd(1, 2.6), ph: rnd(0, 6) }));
    const t0 = performance.now(); let raf = 0;
    function frame(now) {
      const t = Math.max(0, now - t0), f = t / DUR, a = Math.max(0, Math.min(1, t / 220, (DUR - t) / 520)); // (a frame's time can be a little before t0)
      g.clearRect(0, 0, W, H);
      if (t >= DUR || !el.isConnected) { el.remove(); return; }
      const run = (speed) => x0 + dir * f * speed * W; // across the field at speed fields per run
      switch (kind) {
        case "horse": case "chariot": {
          const n = kind === "horse" ? (/riderless/i.test(s) ? 1 : 5) : 2, sz = S * (kind === "horse" ? 0.13 : 0.12);
          for (let i = 0; i < n; i++) {
            const lx = run(1.55) - dir * (i % 3) * sz * 1.25 - dir * Math.floor(i / 3) * sz * 0.6, ly = ground - Math.floor(i / 3) * sz * 0.18 - (i % 3) * sz * 0.06;
            dust(lx - dir * sz * 0.6, ly, 2, 0.12 * a);
            horse(lx, ly, sz, t / 70 + i, dir, 0.82 * a, kind === "horse" && !/riderless/i.test(s));
          }
          if (kind === "chariot") { // the car behind its horses: the box, the turning wheel, the driver, the banner pole
            const cx = run(1.55) - dir * sz * 1.9, cy = ground; g.fillStyle = ink(0.85 * a); g.strokeStyle = ink(0.85 * a);
            g.fillRect(cx - sz * 0.42, cy - sz * 0.78, sz * 0.84, sz * 0.36);
            g.lineWidth = 3; g.beginPath(); g.arc(cx, cy - sz * 0.32, sz * 0.32, 0, Math.PI * 2); g.stroke();
            for (let k = 0; k < 6; k++) { const an = k * Math.PI / 3 - dir * t / 120; g.beginPath(); g.moveTo(cx, cy - sz * 0.32); g.lineTo(cx + Math.cos(an) * sz * 0.32, cy - sz * 0.32 + Math.sin(an) * sz * 0.32); g.stroke(); }
            g.beginPath(); g.arc(cx, cy - sz * 1.05, sz * 0.1, 0, Math.PI * 2); g.fill(); g.fillRect(cx - sz * 0.08, cy - sz * 0.98, sz * 0.16, sz * 0.24);
            g.lineWidth = 2; g.beginPath(); g.moveTo(cx - dir * sz * 0.35, cy - sz * 0.78); g.lineTo(cx - dir * sz * 0.35, cy - sz * 1.7); g.stroke();
            g.fillStyle = "rgba(170, 40, 30, " + (0.8 * a).toFixed(3) + ")"; g.beginPath(); g.moveTo(cx - dir * sz * 0.35, cy - sz * 1.7); g.lineTo(cx - dir * sz * 0.9 + Math.sin(t / 90) * 4, cy - sz * 1.6); g.lineTo(cx - dir * sz * 0.35, cy - sz * 1.48); g.fill();
            dust(cx - dir * sz * 0.5, cy, 3, 0.14 * a);
          }
          break;
        }
        case "elephant": {
          const sz = S * 0.3, ex = run(1.45), ey = ground, ph = t / 160;
          dust(ex - dir * sz * 0.5, ey, 4, 0.16 * a);
          g.save(); g.translate(ex, ey); g.scale(dir, 1); g.fillStyle = ink(0.88 * a); g.strokeStyle = ink(0.88 * a); g.lineCap = "round";
          g.beginPath(); g.ellipse(0, -sz * 0.5, sz * 0.48, sz * 0.3, 0, 0, Math.PI * 2); g.fill(); // body
          g.beginPath(); g.ellipse(sz * 0.42, -sz * 0.62, sz * 0.2, sz * 0.22, 0, 0, Math.PI * 2); g.fill(); // head
          g.beginPath(); g.ellipse(sz * 0.32, -sz * 0.6, sz * 0.12, sz * 0.17, 0.2, 0, Math.PI * 2); g.fillStyle = ink(0.95 * a); g.fill(); // ear
          g.lineWidth = sz * 0.07; g.beginPath(); g.moveTo(sz * 0.56, -sz * 0.56); g.quadraticCurveTo(sz * 0.72, -sz * 0.3 + Math.sin(ph) * sz * 0.08, sz * 0.62 + Math.sin(ph) * sz * 0.06, -sz * 0.08); g.stroke(); // trunk
          g.strokeStyle = "rgba(240, 225, 190, " + (0.9 * a).toFixed(3) + ")"; g.lineWidth = sz * 0.03; g.beginPath(); g.moveTo(sz * 0.52, -sz * 0.48); g.quadraticCurveTo(sz * 0.66, -sz * 0.4, sz * 0.72, -sz * 0.5); g.stroke(); // tusk
          g.fillStyle = ink(0.88 * a);
          [[-0.32, 0], [-0.16, Math.PI], [0.18, Math.PI], [0.32, 0]].forEach(([lx, o]) => { const lift = Math.max(0, Math.sin(ph + o)) * sz * 0.06; g.fillRect(sz * lx - sz * 0.06, -sz * 0.32 - lift, sz * 0.12, sz * 0.32); });
          g.fillStyle = "rgba(160, 40, 30, " + (0.85 * a).toFixed(3) + ")"; g.fillRect(-sz * 0.2, -sz * 0.92, sz * 0.36, sz * 0.14); // the howdah's cloth
          g.restore();
          break;
        }
        case "arrows": {
          g.lineCap = "round";
          for (const ar of arrows) {
            const p = Math.min(1, Math.max(0, (t - ar.t) / 520)); if (p <= 0) continue;
            const len = S * 0.07, tipX = ar.x + Math.sin(ar.ang) * (p - 1) * H, tipY = ar.stand - (1 - p) * ar.stand;
            const tx = Math.sin(ar.ang) * len, ty = Math.cos(ar.ang) * len;
            g.strokeStyle = ink(0.9 * a); g.lineWidth = 1.6; g.beginPath(); g.moveTo(tipX - tx, tipY - ty); g.lineTo(tipX, tipY); g.stroke();
            g.strokeStyle = "rgba(230, 220, 200, " + (0.75 * a).toFixed(3) + ")"; g.lineWidth = 2.6; g.beginPath(); g.moveTo(tipX - tx, tipY - ty); g.lineTo(tipX - tx * 0.82, tipY - ty * 0.82); g.stroke();
          }
          break;
        }
        case "fire": case "glow": {
          if (kind === "fire") {
            const grd = g.createLinearGradient(0, ground - H * 0.3, 0, H); grd.addColorStop(0, "rgba(255, 120, 30, 0)"); grd.addColorStop(1, "rgba(255, 100, 20, " + (0.35 * a).toFixed(3) + ")");
            g.fillStyle = grd; g.fillRect(0, ground - H * 0.3, W, H);
            for (const fl of flames) { // tongues of flame along the ground, each its own height and flicker, smoke over them
              const grow = Math.min(1, t / 600), h = H * fl.h * grow * (0.75 + 0.25 * Math.sin(t / 95 + fl.ph)), w = W * fl.w, sway = Math.sin(t / 160 + fl.ph) * w * 0.25;
              if (!(h > 0.5)) continue; const sm = g.createRadialGradient(fl.x + sway, fl.y - h * 1.6, 0, fl.x + sway, fl.y - h * 1.6, h); sm.addColorStop(0, "rgba(60, 50, 45, " + (0.28 * a).toFixed(3) + ")"); sm.addColorStop(1, "rgba(60, 50, 45, 0)");
              g.fillStyle = sm; g.beginPath(); g.arc(fl.x + sway, fl.y - h * 1.6, h, 0, Math.PI * 2); g.fill();
              const fg = g.createLinearGradient(0, fl.y, 0, fl.y - h); fg.addColorStop(0, "rgba(255, 240, 170, " + (0.95 * a).toFixed(3) + ")"); fg.addColorStop(0.4, "rgba(255, 150, 40, " + (0.85 * a).toFixed(3) + ")"); fg.addColorStop(0.85, "rgba(230, 60, 10, " + (0.55 * a).toFixed(3) + ")"); fg.addColorStop(1, "rgba(180, 30, 10, 0)");
              g.globalCompositeOperation = "lighter"; g.filter = "blur(1.5px)"; g.fillStyle = fg; g.beginPath(); g.moveTo(fl.x - w / 2, fl.y); g.bezierCurveTo(fl.x - w / 2, fl.y - h * 0.5, fl.x + sway - w * 0.15, fl.y - h * 0.7, fl.x + sway, fl.y - h); g.bezierCurveTo(fl.x + sway + w * 0.15, fl.y - h * 0.7, fl.x + w / 2, fl.y - h * 0.5, fl.x + w / 2, fl.y); g.quadraticCurveTo(fl.x, fl.y + h * 0.12, fl.x - w / 2, fl.y); g.fill();
              g.globalCompositeOperation = "source-over"; g.filter = "none";
            }
          } else {
            const cx = W * 0.5, cy = H * 0.3, rr = S * (0.04 + 0.05 * Math.min(1, t / 900));
            const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rr * 4); grd.addColorStop(0, "rgba(255, 250, 230, " + (0.95 * a).toFixed(3) + ")"); grd.addColorStop(0.25, "rgba(255, 220, 140, " + (0.5 * a).toFixed(3) + ")"); grd.addColorStop(1, "rgba(255, 200, 100, 0)");
            g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, rr * 4, 0, Math.PI * 2); g.fill();
            g.strokeStyle = "rgba(255, 240, 200, " + (0.6 * a).toFixed(3) + ")"; g.lineWidth = 1.5;
            for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6 + t / 900; g.beginPath(); g.moveTo(cx + Math.cos(an) * rr * 1.3, cy + Math.sin(an) * rr * 1.3); g.lineTo(cx + Math.cos(an) * rr * 3.2, cy + Math.sin(an) * rr * 3.2); g.stroke(); }
          }
          for (const e of embers) { const y = e.y - (t / 1000) * e.v * 2.2; g.fillStyle = "rgba(255, " + (170 + Math.round(60 * Math.sin(e.ph + t / 200))) + ", 80, " + (0.8 * a).toFixed(3) + ")"; g.beginPath(); g.arc(e.x + Math.sin(e.ph + t / 300) * 6, y, e.r, 0, Math.PI * 2); g.fill(); }
          break;
        }
        case "dark": {
          g.fillStyle = "rgba(4, 6, 18, " + (0.5 * a).toFixed(3) + ")"; g.fillRect(0, 0, W, H);
          const mx = W * 0.78, my = H * 0.18, mr = S * 0.05;
          g.fillStyle = "rgba(240, 236, 210, " + (0.85 * a).toFixed(3) + ")"; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
          const cx = mx + (0.5 - f) * W * 0.5; // a soft cloud sliding over it
          [[0, 0, 2.6], [1.8, 0.3, 2], [-1.8, 0.35, 1.9], [0.6, -0.5, 1.8]].forEach(([dx, dy, k]) => { const x = cx + dx * mr, y = my + dy * mr, rr = mr * k; const cg = g.createRadialGradient(x, y, 0, x, y, rr); cg.addColorStop(0, "rgba(28, 30, 44, " + (0.97 * a).toFixed(3) + ")"); cg.addColorStop(0.6, "rgba(28, 30, 44, " + (0.8 * a).toFixed(3) + ")"); cg.addColorStop(1, "rgba(28, 30, 44, 0)"); g.fillStyle = cg; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); });
          break;
        }
        case "wind": {
          for (let i = 0; i < 14; i++) { const y = ground - H * (0.05 + (i % 7) * 0.07), x = run(1.4) - dir * (i * W * 0.05); const grd = g.createRadialGradient(x, y, 0, x, y, S * 0.16); grd.addColorStop(0, "rgba(190, 165, 120, " + (0.32 * a).toFixed(3) + ")"); grd.addColorStop(1, "rgba(190, 165, 120, 0)"); g.fillStyle = grd; g.beginPath(); g.arc(x, y, S * 0.16, 0, Math.PI * 2); g.fill(); }
          g.strokeStyle = "rgba(235, 220, 190, " + (0.5 * a).toFixed(3) + ")"; g.lineWidth = 1.2;
          for (let i = 0; i < 30; i++) { const y = H * (0.2 + (i * 0.618) % 0.65), x = ((i * 0.37 + f * 2.2) % 1.4 - 0.2) * W; const xx = mine ? x : W - x; g.beginPath(); g.moveTo(xx, y); g.lineTo(xx - dir * S * 0.08, y); g.stroke(); }
          break;
        }
        case "serpent": {
          g.lineCap = "round"; g.lineJoin = "round";
          for (let k = 0; k < 2; k++) { g.strokeStyle = k ? "rgba(220, 255, 200, " + (0.9 * a).toFixed(3) + ")" : "rgba(80, 200, 110, " + (0.35 * a).toFixed(3) + ")"; g.lineWidth = k ? 3 : 12; g.beginPath(); for (let i = 0; i <= 40; i++) { const u = f * 1.6 - i * 0.012, x = (mine ? u : 1 - u) * W, y = H * 0.3 + Math.sin(u * 14 + t / 150) * H * 0.06; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
          break;
        }
        case "giant": {
          const rise = Math.min(1, t / 900), cx = W * (mine ? 0.3 : 0.7), top = -H * 0.6 + rise * H * 0.55;
          const grd = g.createRadialGradient(cx, top + H * 0.3, 0, cx, top + H * 0.3, S * 0.6); grd.addColorStop(0, "rgba(10, 6, 4, " + (0.8 * a).toFixed(3) + ")"); grd.addColorStop(1, "rgba(10, 6, 4, 0)");
          g.fillStyle = grd; g.fillRect(0, 0, W, H);
          g.save(); g.filter = "blur(" + Math.round(S * 0.012) + "px)"; g.fillStyle = ink(0.9 * a); // head, the horns of his hair, the shoulders: a shape, not a figure
          g.beginPath(); g.ellipse(cx, top + H * 0.32, S * 0.12, S * 0.16, 0, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.moveTo(cx - S * 0.09, top + H * 0.22); g.lineTo(cx - S * 0.15, top + H * 0.08); g.lineTo(cx - S * 0.04, top + H * 0.18); g.moveTo(cx + S * 0.09, top + H * 0.22); g.lineTo(cx + S * 0.15, top + H * 0.08); g.lineTo(cx + S * 0.04, top + H * 0.18); g.fill();
          g.beginPath(); g.moveTo(cx - S * 0.5, top + H * 0.95); g.quadraticCurveTo(cx - S * 0.42, top + H * 0.45, cx - S * 0.1, top + H * 0.44); g.lineTo(cx + S * 0.1, top + H * 0.44); g.quadraticCurveTo(cx + S * 0.42, top + H * 0.45, cx + S * 0.5, top + H * 0.95); g.fill(); g.restore();
          g.fillStyle = "rgba(255, 140, 40, " + (0.95 * a * (0.6 + 0.4 * Math.sin(t / 90))).toFixed(3) + ")";
          [-1, 1].forEach((k) => { g.beginPath(); g.ellipse(cx + k * S * 0.045, top + H * 0.3, S * 0.018, S * 0.01, 0, 0, Math.PI * 2); g.fill(); });
          break;
        }
        case "banner": {
          const bx = run(1.1), by = ground - H * 0.08;
          g.strokeStyle = ink(0.85 * a); g.lineWidth = 3; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - H * 0.42); g.stroke();
          g.fillStyle = "rgba(235, 225, 200, " + (0.85 * a).toFixed(3) + ")"; g.beginPath(); g.moveTo(bx, by - H * 0.42); for (let i = 0; i <= 8; i++) g.lineTo(bx - dir * i * S * 0.022, by - H * 0.42 + Math.sin(t / 110 + i * 0.8) * 4); for (let i = 8; i >= 0; i--) g.lineTo(bx - dir * i * S * 0.022, by - H * 0.3 + Math.sin(t / 110 + i * 0.8) * 4); g.fill();
          g.strokeStyle = "rgba(60, 110, 40, " + (0.9 * a).toFixed(3) + ")"; g.lineWidth = 2; const px = bx - dir * S * 0.09, py = by - H * 0.36; g.beginPath(); g.moveTo(px, py + H * 0.05); g.lineTo(px, py - H * 0.01); g.stroke();
          for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(px, py - H * 0.01); g.quadraticCurveTo(px + k * S * 0.012, py - H * 0.03, px + k * S * 0.024, py + H * 0.004); g.stroke(); } // the palm on it
          break;
        }
        case "conch": {
          const cx = mine ? W * 0.08 : W * 0.92, cy = ground - H * 0.25;
          for (let k = 0; k < 4; k++) { const p = (t / 1000 - k * 0.32); if (p <= 0) continue; const rr = p * S * 0.7; g.strokeStyle = "rgba(255, 236, 190, " + Math.max(0, (0.55 - p * 0.3) * a).toFixed(3) + ")"; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke(); }
          break;
        }
        case "water": {
          const wx = run(1.2), wy = ground; // a runner bent under his skin of water, and the drops he leaves
          g.fillStyle = ink(0.85 * a); g.save(); g.translate(wx, wy); g.scale(dir, 1);
          const sz = S * 0.09, ph = t / 80; g.beginPath(); g.arc(sz * 0.18, -sz * 1.1, sz * 0.13, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.moveTo(sz * 0.12, -sz * 0.98); g.lineTo(-sz * 0.05, -sz * 0.5); g.lineTo(sz * 0.08, -sz * 0.5); g.lineTo(sz * 0.24, -sz * 0.95); g.fill();
          g.lineWidth = 3; g.strokeStyle = ink(0.85 * a); [0, Math.PI].forEach((o) => { g.beginPath(); g.moveTo(0, -sz * 0.5); g.lineTo(Math.sin(ph + o) * sz * 0.25, 0); g.stroke(); });
          g.fillStyle = "rgba(90, 150, 200, " + (0.85 * a).toFixed(3) + ")"; g.beginPath(); g.ellipse(-sz * 0.12, -sz * 0.85, sz * 0.18, sz * 0.12, 0.4, 0, Math.PI * 2); g.fill(); g.restore();
          for (let i = 0; i < 18; i++) { const dx = wx - dir * i * S * 0.04; if ((mine && dx < 0) || (!mine && dx > W)) continue; g.fillStyle = "rgba(170, 215, 255, " + (0.7 * a * (1 - i / 18)).toFixed(3) + ")"; g.beginPath(); g.arc(dx, wy - S * 0.02 - (i % 3) * 3, 2.2, 0, Math.PI * 2); g.fill(); }
          break;
        }
        default: { // the ranks press in: a row of spears and shields leaning in from the foe's side, then back
          const push = Math.sin(Math.min(1, f * 1.4) * Math.PI) * W * 0.18, edge = mine ? push : W - push;
          for (let i = 0; i < 9; i++) { const x = edge - dir * i * S * 0.045, y = ground - (i % 2) * H * 0.02; g.fillStyle = ink(0.75 * a); g.beginPath(); g.ellipse(x, y - S * 0.07, S * 0.03, S * 0.07, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = ink(0.8 * a); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - S * 0.06); g.lineTo(x + dir * S * 0.08, y - S * 0.2); g.stroke(); }
          dust(edge, ground, 3, 0.12 * a);
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    void raf;
    return el;
  };
})(window.K = window.K || {});
