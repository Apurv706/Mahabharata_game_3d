/* The night the lac house burns (PRD §18.2). Two tests played on the plan of the house, drawn in
   code over the stage painting:
     escape  the house is burning: a top-down plan of rooms; the fire spreads room by room from
             Purochana's side, smoke runs ahead of it; move through the doors (some are stuck and
             must be held open), wake sleepers on the way (each one you carry slows you), and reach
             the mouth of the tunnel. In time: you are out. Late: you get through the flames, and
             lose what you carried. The fire catches you: death (story mode: dragged out burnt).
     fuse    earlier that night, for those who know the plot: the cellar, with Purochana's oil lines
             running from the fire-point to the sleeping rooms. Choose a line, hold to cut it while
             the guard's lamp is away; caught in the light, let go. Each line cut buys time in the
             escape. The fire still comes.
   Played on their own paintings: the burning house from above, and the cellar. */
(function (K) {
  "use strict";
  const U = K.UI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (n) => { if (K.Sound) K.Sound.play(n); };
  function keyset(map) {
    const on = (e) => { const f = map[e.key]; if (f) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) f(); } };
    document.addEventListener("keydown", on, true);
    return () => document.removeEventListener("keydown", on, true);
  }
  // The pictures (arrived 31 October): the burning house from above (stage_lac_fire_top, 16:9 and
  // tall) for the escape; the cellar (stage_lac_cellar, a 3:1 strip and tall) for the fuse; the
  // house burning (scene_lac_fire) for the scene; the burnt house at dawn (end_fire) for the ending.

  // The small pictures on the how-to cards (trial.howto, trials.js): the house with the fire, you, a stuck door and the
  // way to the tunnel; the cellar with the lamp at one end, its light off the lines, and a line being cut.
  U.HOWTO_PIC = {
    escape: '<svg viewBox="0 0 50 50">' + (() => {
      let s = "";
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const f = (c === 4 && r < 2) || (c === 3 && r === 0); s += '<rect x="' + (c * 10 + 0.6) + '" y="' + (r * 10 + 0.6) + '" width="8.8" height="8.8" rx="1" fill="' + (f ? "#c0472f" : "rgba(30,18,10,.55)") + '" stroke="' + (f ? "#ffb04a" : "#c9a06a") + '" stroke-width=".5"/>'; }
      return s + '<path d="M25 5 V25 H5 V45" fill="none" stroke="#ffd680" stroke-width="1.2" stroke-dasharray="1.6 1.6"/>' +
        '<line x1="2.5" y1="30" x2="7.5" y2="30" stroke="#8a5a2a" stroke-width="2"/>' + // the stuck door on the way
        '<ellipse cx="5" cy="45" rx="3.2" ry="2.2" fill="#120a06" stroke="#f3d9a4" stroke-width=".7"/>' +
        '<path d="M43 9 Q43 3 45 1.5 Q46 4 47 3.5 Q48 6 48 9Z" fill="#ffd27a"/>' +
        '<circle cx="25" cy="5" r="2.6" fill="#3b6fb0" stroke="#fff1cf" stroke-width=".7"/>';
    })() + "</svg>",
    fuse: '<svg viewBox="0 0 100 64"><rect x="2" y="2" width="96" height="60" rx="3" fill="rgba(20,12,6,.6)" stroke="#c9a06a" stroke-width=".8"/>' +
      '<ellipse cx="12" cy="32" rx="11" ry="30" fill="rgba(255,200,120,.22)"/><circle cx="12" cy="6" r="3.4" fill="#ffd680"/>' +
      '<path d="M90 32 C78 32 72 12 58 12 S30 10 22 11" fill="none" stroke="#6b4a2a" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M90 32 C76 33 68 32 54 32 S30 33 22 32" fill="none" stroke="#ffb04a" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M90 32 C80 36 70 52 54 52 S30 54 22 53" fill="none" stroke="#6b4a2a" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="60" cy="32" r="3" fill="#fff1cf" stroke="#ffb04a" stroke-width=".8"/><circle cx="90" cy="32" r="3.4" fill="#c0472f"/></svg>'
  };

  // ---------- The house, as a plan ----------
  // 5 columns by 5 rows of rooms; walls are listed as door-less edges. Purochana's room (the
  // fire-point) is top right, the tunnel mouth bottom left under the floor of the storeroom.
  const COLS = 5, ROWS = 5;
  const at = (c, r) => r * COLS + c;
  // Doors that are stuck (a short hold to shoulder open): between the cells named.
  const STUCK = [[at(1, 1), at(2, 1)], [at(2, 3), at(2, 4)], [at(0, 2), at(0, 3)]];
  // Walls with no door at all.
  const WALLS = [[at(1, 0), at(1, 1)], [at(3, 0), at(3, 1)], [at(2, 2), at(3, 2)], [at(1, 3), at(1, 4)], [at(3, 3), at(4, 3)], [at(0, 1), at(1, 1)], [at(3, 1), at(3, 2)]];
  const pairKey = (a, b) => (a < b ? a + "-" + b : b + "-" + a);
  const wallSet = new Set(WALLS.map(([a, b]) => pairKey(a, b)));
  const stuckSet = new Set(STUCK.map(([a, b]) => pairKey(a, b)));
  const neighbours = (i) => {
    const c = i % COLS, r = Math.floor(i / COLS), out = [];
    if (c > 0) out.push(i - 1); if (c < COLS - 1) out.push(i + 1); if (r > 0) out.push(i - COLS); if (r < ROWS - 1) out.push(i + COLS);
    return out.filter((j) => !wallSet.has(pairKey(i, j)));
  };

  // ---------- Escape ----------
  // trial: { start: "hall" | "door" | "deep", sleepers: 2, fuses: n (seconds bought), auto }
  U.games.escape = function (box, done, c) {
    return U.trialFrame(box, done, c, "escape", ({ host, power, t, finish, cue }) => {
      const S = K.S;
      const fuses = t.fuses != null ? t.fuses : (S.fusesCut || 0);
      // The fire spreads one room every few seconds: a little slower for a quick, calm player, and
      // slower again for every oil line cut in the cellar.
      // (Tuned so a straight run is safe, and carrying the sleepers out is the gamble.)
      // (Half as slow again on 5 November: the owner found it near impossible on a phone.)
      const spread = (clamp(1.4 + power * 0.04, 1.4, 1.75) + 0.3 * Math.min(3, fuses)) * 1.5;
      const fire = new Set([at(4, 0)]), smoke = new Set();
      const tunnel = at(0, 4), fireAt = at(4, 0);
      const start = K.val(t.start, S);
      let me = start === "door" ? at(0, 0) : start === "deep" ? at(3, 1) : at(2, 0);
      const sleepers = new Set([at(3, 3), at(1, 2)]);
      let carrying = 0, lost = 0, over = false, holding = null, holdFrom = 0, lastSpread = 0, moving = null, elapsed = 0, lastT = 0;
      const stuckOpened = new Set(), shoves = {};
      host.innerHTML = '<p class="score" aria-live="polite"></p><div class="lacplan"><svg viewBox="0 0 100 100" role="img" aria-label="' + U.esc(K.tr("The house, seen from above")) + '"></svg></div>' +
        '<p class="game-note" aria-live="polite">' + U.esc(K.tr("The fire comes from Purochana's side. Get to the tunnel mouth in the storeroom. Tap a room beside you, swipe, or use the arrows; hold to force a stuck door or to wake a sleeper.")) + "</p>" +
        '<div class="btnrow lac-btns"></div>';
      const svg = host.querySelector("svg"), score = host.querySelector(".score"), note = host.querySelector(".game-note"), row = host.querySelector(".btnrow");
      const W = 100 / COLS, H = 100 / ROWS;
      const cx = (i) => (i % COLS) * W + W / 2, cy = (i) => Math.floor(i / COLS) * H + H / 2;
      function draw() {
        let s = "";
        for (let i = 0; i < COLS * ROWS; i++) {
          const x = (i % COLS) * W, y = Math.floor(i / COLS) * H;
          const cls = fire.has(i) ? "fire" : smoke.has(i) ? "smoke" : "room";
          s += '<rect class="' + cls + '" data-i="' + i + '" x="' + (x + 0.6) + '" y="' + (y + 0.6) + '" width="' + (W - 1.2) + '" height="' + (H - 1.2) + '"/>';
        }
        // Walls and doors.
        for (let i = 0; i < COLS * ROWS; i++) {
          const c0 = i % COLS, r0 = Math.floor(i / COLS);
          [[i + 1, c0 < COLS - 1], [i + COLS, r0 < ROWS - 1]].forEach(([j, ok]) => {
            if (!ok) return;
            const vertical = j === i + 1;
            const x1 = vertical ? (c0 + 1) * W : c0 * W, y1 = vertical ? r0 * H : (r0 + 1) * H, x2 = vertical ? x1 : x1 + W, y2 = vertical ? y1 + H : y1;
            if (wallSet.has(pairKey(i, j))) s += '<line class="wall" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
            else if (stuckSet.has(pairKey(i, j)) && !stuckOpened.has(pairKey(i, j))) s += '<line class="door stuck" x1="' + (vertical ? x1 : x1 + W * 0.3) + '" y1="' + (vertical ? y1 + H * 0.3 : y1) + '" x2="' + (vertical ? x2 : x1 + W * 0.7) + '" y2="' + (vertical ? y1 + H * 0.7 : y2) + '"/>';
          });
        }
        s += '<g class="tunnel" transform="translate(' + cx(tunnel) + " " + cy(tunnel) + ')"><ellipse rx="6" ry="4"/><path d="M-4 0 Q0 -5 4 0"/></g>';
        sleepers.forEach((i) => { s += '<g class="sleeper" transform="translate(' + cx(i) + " " + cy(i) + ')"><ellipse rx="5.5" ry="2.4"/><circle cx="-5" cy="0" r="2.2"/></g>'; });
        // Smoke runs ahead of the fire, toward the tunnel side.
        fire.forEach((i) => { s += '<g class="flames" transform="translate(' + cx(i) + " " + cy(i) + ')"><path d="M-5 5 Q-5 -3 0 -7 Q1 -2 3 -3 Q5 1 5 5Z"/></g>'; });
        s += '<g class="me" transform="translate(' + cx(me) + " " + cy(me) + ')"><circle r="4.2"/>' + (carrying ? '<circle class="carried" cx="4" cy="-3" r="2.4"/>' : "") + "</g>";
        if (holding) { const p = clamp((U.clock() - holdFrom) / 1000 / holding.secs, 0, 1); s += '<circle class="hold" cx="' + cx(me) + '" cy="' + cy(me) + '" r="7" pathLength="100" stroke-dasharray="' + (p * 100).toFixed(1) + ' 100"/>'; }
        svg.innerHTML = s;
        svg.querySelectorAll("rect").forEach((el) => el.addEventListener("pointerdown", (e) => { e.preventDefault(); tapCell(+el.dataset.i); }));
      }
      const tally = () => { score.textContent = K.tr("Rooms burning: {f} of {n} · Carrying: {c}", { f: fire.size, n: COLS * ROWS, c: carrying }); };
      const say = (txt) => { note.textContent = K.tr(txt); };
      function spreadFire() {
        const next = new Set();
        fire.forEach((i) => neighbours(i).forEach((j) => { if (!fire.has(j)) next.add(j); }));
        // The fire takes the nearest rooms first, and never skips.
        const arr = [...next].sort((a, b) => dist(a, tunnel) - dist(b, tunnel));
        const take = arr.slice(0, Math.max(1, Math.floor(arr.length / 2)));
        take.forEach((j) => { fire.add(j); smoke.delete(j); });
        fire.forEach((i) => neighbours(i).forEach((j) => { if (!fire.has(j)) smoke.add(j); }));
        sfx("drum");
        tally(); draw();
        if (fire.has(me)) return caught();
      }
      const dist = (a, b) => Math.abs(a % COLS - b % COLS) + Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS));
      function caught() {
        if (over) return; over = true;
        cue("bad"); sfx("fall");
        finish("lose", ["The fire reached you with {n} rooms still between you and the tunnel.", { n: dist(me, tunnel) }]);
      }
      function arrive() {
        if (over) return; over = true;
        const late = [...neighbours(tunnel)].some((j) => fire.has(j));
        K.S.lacCarried = late ? 0 : carrying; // read by the scene's effects
        if (late) { lost = carrying; carrying = 0; cue("bad"); }
        else cue("good");
        sfx(late ? "hit" : "choose");
        const out = late ? "close" : "win";
        finish(out, late ? (lost ? ["You came through the flames to the tunnel mouth, and lost the one you carried.", {}] : ["You came through the flames to the tunnel mouth, burnt and alone.", {}]) : ["You reached the tunnel with {c} carried out.", { c: carrying }]);
      }
      // Moving: a step takes longer in smoke, and with someone on your back.
      function stepTo(j) {
        if (over || moving || holding) return;
        if (!neighbours(me).includes(j)) return;
        if (fire.has(j)) { say("That room is burning."); return; }
        const key = pairKey(me, j);
        if (stuckSet.has(key) && !stuckOpened.has(key)) {
          // A stuck door gives to a hold, or to three quick shoves (taps), whichever a player tries (playtest, 5 November:
          // a tap only cancelled its own hold, and a player tapping at it never got through).
          const now = U.clock(), sh = shoves[key] && now - shoves[key].t < 1500 ? shoves[key].n + 1 : 1;
          shoves[key] = { n: sh, t: now };
          if (sh >= 3) { stuckOpened.add(key); sfx("tap"); say("You shoulder the door open."); go(j); return; }
          holding = { secs: 0.8, then: () => { stuckOpened.add(key); sfx("tap"); go(j); } }; holdFrom = now; say(sh > 1 ? "Again! It is giving." : "The door is stuck. Hold, or shove it again."); draw(); return;
        }
        go(j);
      }
      function go(j) {
        const secs = (smoke.has(me) ? 0.55 : 0.35) * (1 + 0.4 * carrying);
        moving = { to: j, until: U.clock() + secs * 1000 };
        cue("act");
      }
      function tapCell(i) {
        if (i === me) { if (sleepers.has(me)) startWake(); return; }
        stepTo(i);
      }
      function startWake() {
        if (over || moving || holding || !sleepers.has(me)) return;
        holding = { secs: 0.6, then: () => { sleepers.delete(me); carrying++; sfx("choose"); say("You get them up and over your shoulder."); } };
        holdFrom = U.clock(); draw();
      }
      // Buttons: four directions and a hold.
      const dir = (dc, dr) => () => { const c0 = me % COLS + dc, r0 = Math.floor(me / COLS) + dr; if (c0 < 0 || c0 >= COLS || r0 < 0 || r0 >= ROWS) return; stepTo(at(c0, r0)); };
      const up = dir(0, -1), down = dir(0, 1), left = dir(-1, 0), right = dir(1, 0);
      [["↑", up], ["←", left], ["→", right], ["↓", down]].forEach(([l, f]) => row.appendChild(U.pressButton(l, f)));
      row.appendChild(U.pressButton("Wake", startWake, () => {}));
      const offKeys = keyset({ ArrowUp: up, ArrowDown: down, ArrowLeft: left, ArrowRight: right, w: up, s: down, a: left, d: right, " ": startWake, Enter: startWake });
      // A swipe on the plan.
      let x0 = null, y0 = null;
      svg.addEventListener("pointerdown", (e) => { x0 = e.clientX; y0 = e.clientY; });
      svg.addEventListener("pointerup", (e) => {
        if (x0 == null) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (Math.abs(dx) > 24 || Math.abs(dy) > 24) (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? right : left) : (dy > 0 ? down : up))();
        x0 = y0 = null;
      });
      // Releasing a hold before it is done: nothing happens.
      const release = () => { if (holding && (U.clock() - holdFrom) / 1000 < holding.secs) { holding = null; draw(); } };
      document.addEventListener("pointerup", release);
      tally(); draw();
      say("The fire comes from Purochana's side. Get to the tunnel mouth in the storeroom.");
      const stop = U.loop((s) => {
        if (over) return;
        elapsed = s;
        if (s - lastSpread >= spread) { lastSpread = s; spreadFire(); if (over) return; }
        if (holding) {
          if ((U.clock() - holdFrom) / 1000 >= holding.secs) { const f = holding.then; holding = null; f(); }
          draw();
        }
        if (moving && U.clock() >= moving.until) {
          me = moving.to; moving = null;
          if (fire.has(me)) return caught();
          if (me === tunnel) return arrive();
          tally(); draw();
        }
      }, host);
      return () => { stop(); offKeys(); document.removeEventListener("pointerup", release); };
    });
  };

  // ---------- Fuse: the cellar ----------
  // trial: { lines: 3, secs: 48 }. Choose a line (tap it, or 1–3), hold Cut while the lamp is away.
  // The light shows bright on the lines only while it is on them (when Cut would be seen), and the Cut button warns
  // a moment before it comes (owner, 5 November: it was near impossible to tell when it was safe).
  U.games.fuse = function (box, done, c) {
    return U.trialFrame(box, done, c, "fuse", ({ host, power, t, finish, cue }) => {
      const n = t.lines || 3, total = t.secs || 48;
      const cutTime = clamp(2.4 - power * 0.08, 1.6, 2.4); // seconds of held, unlit time to cut a line
      // The three oil lines, from the fire-point (right) to the sleeping rooms (left), as paths in a 100×100 plan.
      const LINES = [
        { d: "M92 50 C80 50 74 20 60 20 S30 14 12 16", end: [12, 16] },
        { d: "M92 50 C78 52 70 50 56 50 S28 52 12 50", end: [12, 50] },
        { d: "M92 50 C82 56 72 82 56 82 S30 86 12 84", end: [12, 84] }
      ].slice(0, n);
      const prog = LINES.map(() => 0), cutDone = LINES.map(() => false);
      let chosen = 0, holding = false, seen = 0, over = false, lampX = 50, lampDir = 1, lastT = 0, elapsed = 0;
      host.innerHTML = '<p class="score" aria-live="polite"></p><div class="laccellar"><svg viewBox="0 0 100 100" role="img" aria-label="' + U.esc(K.tr("The cellar, seen from above")) + '"></svg></div>' +
        '<p class="game-note" aria-live="polite"></p><div class="btnrow fuse-btns"></div>';
      const svg = host.querySelector("svg"), score = host.querySelector(".score"), note = host.querySelector(".game-note"), clock = U.countdown(host), row = host.querySelector(".btnrow");
      const say = (txt, v) => { note.textContent = K.tr(txt, v); };
      const lit = () => Math.abs(lampX - 50) < 22; // the lamp's light falls across the middle of the cellar, where the lines run
      // The light comes within half a second: the lamp heading for the middle and nearly there.
      const soon = () => !lit() && lampDir === Math.sign(50 - lampX) && (Math.abs(lampX - 50) - 22) / 22 < 0.5;
      let wasSoon = false, cutBtn = null;
      function draw() {
        let s = '<rect class="floor" x="2" y="2" width="96" height="96"/>';
        s += '<circle class="lamp" cx="' + lampX.toFixed(1) + '" cy="6" r="4"/><ellipse class="light' + (lit() ? " on" : soon() ? " soon" : "") + '" cx="' + lampX.toFixed(1) + '" cy="50" rx="18" ry="60"/>';
        LINES.forEach((L, i) => {
          s += '<path class="oil' + (i === chosen ? " chosen" : "") + (cutDone[i] ? " cut" : "") + '" data-i="' + i + '" d="' + L.d + '"/>';
          s += '<g class="room" transform="translate(' + L.end[0] + " " + L.end[1] + ')"><rect x="-6" y="-5" width="12" height="10"/></g>';
          if (!cutDone[i] && prog[i] > 0) s += '<circle class="cutpt" cx="' + (92 - 80 * prog[i]).toFixed(1) + '" cy="' + ptY(i, prog[i]).toFixed(1) + '" r="2.6"/>';
          if (cutDone[i]) s += '<path class="snip" transform="translate(' + (92 - 80 * 0.5).toFixed(1) + " " + ptY(i, 0.5).toFixed(1) + ')" d="M-3 -3 L3 3 M3 -3 L-3 3"/>';
        });
        s += '<g class="firept"><circle cx="92" cy="50" r="4"/><path d="M89 50 Q90 44 92 42 Q94 46 95 50Z"/></g>';
        svg.innerHTML = s;
        svg.querySelectorAll(".oil").forEach((el) => el.addEventListener("pointerdown", (e) => { e.preventDefault(); pick(+el.dataset.i); }));
      }
      // Where the cutting point sits along a line, roughly (the lines are gentle curves).
      function ptY(i, p) { const y0 = 50, y1 = LINES[i].end[1]; return y0 + (y1 - y0) * Math.min(1, p * 1.6); }
      const tally = () => { score.textContent = K.tr("Lines cut: {c} of {n} · Seen: {s} of 2", { c: cutDone.filter(Boolean).length, n, s: seen }); };
      function pick(i) { if (over || cutDone[i]) return; chosen = i; draw(); say("Hold to cut while the lamp is away."); }
      const down = () => { if (over) return; holding = true; cue("act"); };
      const upHold = () => { holding = false; cue("rest"); };
      row.appendChild((cutBtn = U.pressButton("Cut", down, upHold)));
      const nextLine = () => { const j = LINES.findIndex((L, i) => !cutDone[i] && i !== chosen); if (j >= 0) pick(j); };
      const offKeys = keyset({ 1: () => pick(0), 2: () => pick(1), 3: () => pick(2), Tab: nextLine, ArrowDown: nextLine, ArrowUp: nextLine });
      const onK = (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); down(); } };
      const onKU = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); upHold(); } };
      document.addEventListener("keydown", onK, true); document.addEventListener("keyup", onKU, true);
      const end = () => {
        if (over) return; over = true;
        const cut = cutDone.filter(Boolean).length;
        K.S.fusesCut = cut; // read by the escape later that night
        const out = cut >= 2 ? "win" : cut === 1 ? "close" : "lose";
        cue(out === "lose" ? "bad" : "good");
        finish(out, ["You cut {c} of {n} oil lines before you had to go.", { c: cut, n }]);
      };
      tally(); draw(); say("Hold to cut while the lamp is away.");
      const stop = U.loop((s) => {
        if (over) return;
        const dt = s - lastT; lastT = s; elapsed = s;
        clock.set(total - s, total);
        if (s >= total) return end();
        // The guard's lamp sweeps the cellar, slower for a calmer hand on the plan.
        lampX += lampDir * dt * 22; if (lampX > 96 || lampX < 4) lampDir = -lampDir;
        const L = lit(), S0 = soon();
        cutBtn.classList.toggle("lit", L); cutBtn.classList.toggle("soon", S0); cutBtn.classList.toggle("dark", !L && !S0);
        if (S0 && !wasSoon && holding) say("The light is coming. Let go!");
        wasSoon = S0;
        if (holding && !cutDone[chosen]) {
          if (lit()) {
            seen++; holding = false; sfx("hit"); cue("bad");
            say(seen >= 2 ? "The guard has seen enough. You slip back up the stairs." : "The light falls on you. You freeze, and lose your place on the line.");
            prog[chosen] = Math.max(0, prog[chosen] - 0.3);
            tally();
            if (seen >= 2) return end();
          } else {
            prog[chosen] += dt / cutTime;
            if (prog[chosen] >= 1) { prog[chosen] = 1; cutDone[chosen] = true; holding = false; sfx("choose"); cue("good"); say("The line parts. Oil runs out onto the stone."); tally(); if (cutDone.every(Boolean)) return end(); nextLine(); }
          }
        }
        draw();
      }, host);
      return () => { stop(); offKeys(); document.removeEventListener("keydown", onK, true); document.removeEventListener("keyup", onKU, true); };
    });
  };
})(window.K = window.K || {});
