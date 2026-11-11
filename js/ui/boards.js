/* Board games as tests, each a minute or two, on the painted table (stage_board_table):
   chaupar  the cross-shaped race game: cowrie throws, two pieces each, capture and safe squares
   baghchal tigers and goats: you are the tigers, and must take goats before they hem you in
   moksha   Moksha Patam, the game of virtues and vices on a short board of 36: move by either of two dice;
            a ladder's virtue stops one snake, and the karma squares swap you with your opponent
   Each opponent plays a simple, honest strategy and slips more often against a stronger player
   (the player's stats, as for every test). Mouse, touch and keys all work. */
(function (K) {
  "use strict";
  const U = K.UI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (n) => { if (K.Sound) K.Sound.play(n); };
  const later = (list, ms, f) => list.push(setTimeout(f, U.motion() ? ms : Math.min(ms, 120)));
  function keyset(map) {
    const on = (e) => { const f = map[e.key]; if (f) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) f(); } };
    document.addEventListener("keydown", on, true);
    return () => document.removeEventListener("keydown", on, true);
  }
  const boardWrap = (t, inner, cls) => '<div class="boardtable ' + (cls || "") + '" style="--stage:url(\'' + U.artUrl(K.val(t.stage) || "stage_board_table") + '\')">' + inner + "</div>";

  // ---------- Chaupar ----------
  // The cross: four arms of 3 by 4 squares around a centre. Both players run the outer loop of 36
  // squares anticlockwise from the end of their own arm, then up its middle into the centre.
  const LOOP = [[10, 5], [10, 6], [9, 6], [8, 6], [7, 6], [6, 7], [6, 8], [6, 9], [6, 10], [5, 10], [4, 10], [4, 9], [4, 8], [4, 7], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 5], [0, 4], [1, 4], [2, 4], [3, 4], [4, 3], [4, 2], [4, 1], [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [7, 4], [8, 4], [9, 4], [10, 4]];
  const SAFE = new Set(["10,5", "0,5", "5,10", "5,0"]);
  const pathFor = (start, home) => LOOP.slice(start).concat(LOOP.slice(0, start)).concat([LOOP[start]]).concat(home).concat([[5, 5]]);
  const PATHS = { me: pathFor(0, [[9, 5], [8, 5], [7, 5]]), them: pathFor(18, [[1, 5], [2, 5], [3, 5]]) };
  const END = PATHS.me.length - 1;
  // Six cowries: the number lying mouth up is the throw, and none up counts six; all six up, twelve.
  const throwCowries = () => { const up = [0, 1, 2, 3, 4, 5].map(() => K.rng() < 0.5); const n = up.filter(Boolean).length; return { up, v: n === 0 ? 6 : n === 6 ? 12 : n }; };
  const cowrie = (up) => '<i class="cowrie' + (up ? " up" : "") + '"></i>';

  U.games.chaupar = function (box, done, c) {
    return U.trialFrame(box, done, c, "board", ({ host, power, t, finish, cue }) => {
      const opp = K.tr(t.opponent || "Your opponent");
      const slip = clamp(0.1 + power * 0.03, 0.1, 0.4); // how often the opponent plays a weaker move
      const G = { me: [0, 0], them: [0, 0], turn: "me", roll: null, phase: "throw", turns: 0, note: null };
      const timers = [];
      const cellOf = (side, i) => PATHS[side][i];
      const key = (rc) => rc[0] + "," + rc[1];
      const legal = (side, i, v) => G[side][i] + v <= END && G[side][i] < END;
      function capture(side, i) {
        const other = side === "me" ? "them" : "me", pos = G[side][i];
        if (pos >= END) return false;
        const k = key(cellOf(side, pos));
        if (SAFE.has(k)) return false;
        let hit = false;
        G[other].forEach((p, j) => { if (p < END && p > 0 && key(cellOf(other, p)) === k) { G[other][j] = 0; hit = true; } });
        return hit;
      }
      function move(side, i) {
        G[side][i] += G.roll.v;
        const took = capture(side, i);
        sfx(took ? "hit" : "tap");
        if (side === "me") cue(took ? "good" : "act"); else if (took) cue("bad");
        G.note = took ? (side === "me" ? ["You land on {who}'s piece and send it back to the start.", { who: opp }] : ["{who} lands on your piece and sends it back to the start.", { who: opp }]) : null;
        return took;
      }
      const won = (side) => G[side].every((p) => p >= END);
      // The teacher's hint at the practice ground: the piece a careful player would move.
      function bestMine() {
        const opts = [0, 1].filter((i) => legal("me", i, G.roll.v));
        if (!opts.length) return null;
        const score = (i) => {
          const to = G.me[i] + G.roll.v, k = key(cellOf("me", to));
          let s = to;
          if (to === END) s += 60;
          if (to < END && !SAFE.has(k) && G.them.some((p) => p > 0 && p < END && key(cellOf("them", p)) === k)) s += 80;
          if (to < END && SAFE.has(k)) s += 10;
          return s;
        };
        return opts.sort((a, b) => score(b) - score(a))[0];
      }
      function aiPick() {
        const opts = [0, 1].filter((i) => legal("them", i, G.roll.v));
        if (!opts.length) return null;
        if (K.rng() < slip) return K.pick(opts);
        // Take a piece if it can, then bring one home, then keep off squares you could reach, then run.
        const score = (i) => {
          const to = G.them[i] + G.roll.v, rc = cellOf("them", to), k = key(rc);
          let s = to;
          if (to === END) s += 60;
          if (to < END && !SAFE.has(k) && G.me.some((p) => p > 0 && p < END && key(cellOf("me", p)) === k)) s += 80;
          if (to < END && !SAFE.has(k) && G.me.some((p) => { for (let d = 1; d <= 6; d++) if (p + d < END && key(cellOf("me", p + d)) === k) return true; return false; })) s -= 25;
          return s;
        };
        return opts.sort((a, b) => score(b) - score(a))[0];
      }
      function draw() {
        const cell = 30, svgCells = [];
        const arm = (r, c) => (r >= 4 && r <= 6) || (c >= 4 && c <= 6);
        for (let r = 0; r < 11; r++) for (let c = 0; c < 11; c++) {
          if (!arm(r, c)) continue;
          const centre = r >= 4 && r <= 6 && c >= 4 && c <= 6;
          if (centre && !(r === 5 && c === 5)) continue;
          const k = r + "," + c;
          svgCells.push('<rect class="sq' + (SAFE.has(k) ? " safe" : "") + ((r === 5 || c === 5) && !SAFE.has(k) ? " mid" : "") + '" x="' + c * cell + '" y="' + r * cell + '" width="' + cell + '" height="' + cell + '"/>' + (SAFE.has(k) ? '<path class="x" d="M' + (c * cell + 7) + "," + (r * cell + 7) + " l16,16 m0,-16 l-16,16\"/>" : ""));
        }
        svgCells.unshift('<rect class="home" x="' + 4 * cell + '" y="' + 4 * cell + '" width="' + 3 * cell + '" height="' + 3 * cell + '"/>');
        const piece = (side, i) => {
          const p = G[side][i], rc = cellOf(side, Math.min(p, END)), stack = G[side].filter((q, j) => j < i && q === p).length;
          const x = rc[1] * cell + cell / 2 + (p >= END ? (i ? 9 : -9) * (side === "me" ? 1 : -1) : stack * 6), y = rc[0] * cell + cell / 2 + (p >= END ? (side === "me" ? 8 : -8) : -stack * 6);
          const can = side === "me" && G.turn === "me" && G.phase === "move" && legal("me", i, G.roll.v);
          return '<g class="pc ' + side + (can ? " can" : "") + '" data-i="' + i + '" transform="translate(' + x + " " + y + ')"' + (can ? ' role="button" tabindex="0" aria-label="' + U.esc(K.tr("Piece {n}", { n: i + 1 })) + '"' : "") + '><path d="M-8 9 Q-9 -2 0 -11 Q9 -2 8 9 Z"/><circle cy="-11" r="3.5"/>' + (side === "me" ? '<text y="5">' + (i + 1) + "</text>" : "") + "</g>";
        };
        const roll = G.roll ? '<div class="cowries">' + G.roll.up.map(cowrie).join("") + '<b>' + G.roll.v + "</b></div>" : '<div class="cowries empty">' + [0, 1, 2, 3, 4, 5].map(() => cowrie(false)).join("") + "</div>";
        const left = (side) => G[side].reduce((n, p) => n + (END - p), 0);
        host.innerHTML = '<p class="score" aria-live="polite">' + U.tr("Squares to go: you {a}, {who} {b}", { a: left("me"), b: left("them"), who: opp }) + "</p>" +
          boardWrap(t, '<svg class="chaupar" viewBox="-4 -4 338 338" role="img" aria-label="' + U.esc(K.tr("The chaupar board")) + '">' + svgCells.join("") + [0, 1].map((i) => piece("them", i)).join("") + [0, 1].map((i) => piece("me", i)).join("") + "</svg>") +
          roll + '<p class="game-note" aria-live="polite">' + (G.note ? U.t(G.note) : U.tr(G.turn === "me" ? (G.phase === "move" ? "Choose a piece to move: click it, or press 1 or 2." : "Your throw.") : "{who} throws.", { who: opp })) + '</p><div class="btnrow"></div>';
        const row = host.querySelector(".btnrow");
        if (G.turn === "me" && G.phase === "throw") row.appendChild(U.button("cta", U.tr("Throw the cowries"), throwMine));
        if (U.boardHint) U.boardHint(host, G.turn === "me" && G.phase === "move" ? { el: host.querySelector('.pc.me[data-i="' + bestMine() + '"]'), line: "Move piece {n}.", p: { n: bestMine() + 1 } } : null);
        host.querySelectorAll(".pc.me.can").forEach((g) => {
          const go = () => pickMine(+g.dataset.i);
          g.addEventListener("click", go);
          g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
        });
      }
      function end() {
        const lm = G.me.reduce((n, p) => n + (END - p), 0);
        if (won("me")) return finish("win", ["Both your pieces reached home first."]);
        finish(lm <= 6 ? "close" : "lose", [lm <= 6 ? "{who} got home first, by a single throw." : "{who} got both pieces home first.", { who: opp }]);
      }
      function throwMine() {
        if (G.turn !== "me" || G.phase !== "throw") return;
        G.roll = throwCowries(); sfx("dice"); cue("act");
        const can = [0, 1].filter((i) => legal("me", i, G.roll.v));
        if (!can.length) { G.note = ["{n}: no piece can move that far.", { n: G.roll.v }]; G.phase = "wait"; draw(); return later(timers, 1100, aiTurn); }
        if (can.length === 1 || G.me[0] === G.me[1]) { G.phase = "wait"; draw(); return later(timers, 450, () => pickMine(can[0], true)); }
        G.phase = "move"; G.note = null; draw();
      }
      function pickMine(i, auto) {
        if (!(G.phase === "move" || auto) || !legal("me", i, G.roll.v)) return;
        move("me", i);
        if (won("me")) { draw(); return later(timers, 600, end); }
        G.phase = "wait"; draw();
        later(timers, 900, aiTurn);
      }
      function aiTurn() {
        G.turn = "them"; G.roll = throwCowries(); sfx("dice"); G.note = null;
        draw();
        later(timers, 800, () => {
          const i = aiPick();
          if (i != null) move("them", i); else G.note = ["{who} throws {n} and cannot move.", { who: opp, n: G.roll.v }];
          if (won("them")) { draw(); return later(timers, 700, end); }
          G.turns++;
          if (G.turns >= (t.turns || 34)) { draw(); return later(timers, 700, () => { const lm = G.me.reduce((n, p) => n + (END - p), 0), lt = G.them.reduce((n, p) => n + (END - p), 0); finish(lm < lt ? "win" : lm - lt <= 6 ? "close" : "lose", "The lamps are burning low, and the game is called."); }); }
          later(timers, 700, () => { G.turn = "me"; G.phase = "throw"; G.roll = null; draw(); U.keys([throwMine]); });
        });
      }
      const off = keyset({ 1: () => pickMine(0), 2: () => pickMine(1) });
      draw(); U.keys([throwMine]);
      return () => { off(); timers.forEach(clearTimeout); U.keys([]); };
    });
  };

  // ---------- Bagh-Chal: tigers and goats ----------
  // A 5 by 5 board of points; diagonals run through every other point. You move the two tigers. The
  // goats come on one at a time (twelve of them), then move. A tiger takes a goat by jumping it.
  // Take trial.need (3) goats to win; if both tigers are hemmed in, or the moves run out, you lose.
  const PT = (r, c) => r * 5 + c;
  const NEI = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const list = [], diag = (r + c) % 2 === 0;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]].concat(diag ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [])) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) list.push({ to: PT(nr, nc), over: null, jump: nr + dr >= 0 && nr + dr < 5 && nc + dc >= 0 && nc + dc < 5 ? PT(nr + dr, nc + dc) : null });
    }
    NEI.push(list);
  }
  U.games.baghchal = function (box, done, c) {
    return U.trialFrame(box, done, c, "board", ({ host, power, t, finish, cue }) => {
      const opp = K.tr(t.opponent || "Your opponent"), need = t.need || 3, GOATS = t.goats || 12, MAXM = t.moves || 30;
      const slip = clamp(0.1 + power * 0.03, 0.1, 0.4);
      const B = Array(25).fill(0); // 0 empty, 1 tiger, 2 goat
      B[PT(0, 0)] = 1; B[PT(0, 4)] = 1;
      let placed = 0, taken = 0, moves = 0, sel = null, cursor = PT(0, 0), busy = false, note = null;
      const timers = [];
      const tigerMoves = (b, p) => NEI[p].flatMap((n) => (b[n.to] === 0 ? [{ from: p, to: n.to }] : b[n.to] === 2 && n.jump != null && b[n.jump] === 0 ? [{ from: p, to: n.jump, take: n.to }] : []));
      const allTiger = (b) => b.flatMap((v, p) => (v === 1 ? tigerMoves(b, p) : []));
      const threatened = (b) => allTiger(b).filter((m) => m.take != null).length;
      function goatTurn() {
        // Every goat move or placement the goats could make, scored: never leave a goat to be jumped,
        // crowd the tigers, keep together.
        const opts = [];
        if (placed < GOATS) B.forEach((v, p) => { if (v === 0) opts.push({ to: p }); });
        else B.forEach((v, p) => { if (v === 2) NEI[p].forEach((n) => { if (B[n.to] === 0) opts.push({ from: p, to: n.to }); }); });
        if (!opts.length) return null;
        const score = (o) => {
          const b = B.slice(); if (o.from != null) b[o.from] = 0; b[o.to] = 2;
          const tm = allTiger(b);
          return -threatened(b) * 50 - tm.length * 3 + NEI[o.to].filter((n) => b[n.to] === 2).length * 2 + NEI[o.to].filter((n) => b[n.to] === 1).length * 1.5;
        };
        if (K.rng() < slip) return K.pick(opts);
        opts.forEach((o) => { o.s = score(o) + K.rng() * 0.5; });
        return opts.sort((a, b) => b.s - a.s)[0];
      }
      function draw() {
        const S0 = 50, xy = (p) => [30 + (p % 5) * S0, 30 + Math.floor(p / 5) * S0];
        let lines = "";
        for (let i = 0; i < 5; i++) lines += '<path d="M30 ' + (30 + i * S0) + " H230 M" + (30 + i * S0) + ' 30 V230"/>';
        lines += '<path d="M30 30 L230 230 M230 30 L30 230 M130 30 L230 130 L130 230 L30 130 Z"/>';
        const legal = sel != null ? tigerMoves(B, sel) : [];
        let pts = "";
        B.forEach((v, p) => {
          const [x, y] = xy(p), dest = legal.find((m) => m.to === p);
          pts += '<g class="pt' + (dest ? " dest" : "") + (p === cursor ? " cur" : "") + (sel === p ? " sel" : "") + '" data-p="' + p + '"><circle class="hit" cx="' + x + '" cy="' + y + '" r="20"/>' +
            (v === 1 ? '<g class="tiger" transform="translate(' + x + " " + y + ')"><circle r="15"/><path d="M-9 -4 L-4 -2 M9 -4 L4 -2 M-6 6 Q0 10 6 6 M-11 -12 L-7 -8 M11 -12 L7 -8 M-3 -14 V-8 M3 -14 V-8"/></g>' :
              v === 2 ? '<g class="goat" transform="translate(' + x + " " + y + ')"><circle r="11"/><path d="M-7 -8 Q-10 -15 -4 -14 M7 -8 Q10 -15 4 -14"/></g>' :
                '<circle class="dot" cx="' + x + '" cy="' + y + '" r="' + (dest ? 7 : 4) + '"/>') + "</g>";
        });
        host.innerHTML = '<p class="score" aria-live="polite">' + U.tr("Goats taken: {g} of {n} · Goats still to come: {w} · Tiger moves left: {m}", { g: taken, n: need, w: GOATS - placed, m: MAXM - moves }) + "</p>" +
          boardWrap(t, '<svg class="bagh" viewBox="0 0 260 260" role="img" aria-label="' + U.esc(K.tr("The tigers and goats board")) + '"><g class="lines">' + lines + "</g>" + pts + "</svg>") +
          '<p class="game-note" aria-live="polite">' + (note ? U.t(note) : U.tr(sel == null ? "Choose a tiger: click it, or move with the arrow keys and press Space." : "Now choose where it goes. A tiger takes a goat by jumping over it to an empty point.")) + "</p>";
        if (U.boardHint) {
          const all = busy ? [] : allTiger(B);
          const cap = all.find((m) => m.take != null);
          const best = cap || all.sort((a, b) => { const bb = B.slice(), ba = B.slice(); bb[b.from] = 0; bb[b.to] = 1; ba[a.from] = 0; ba[a.to] = 1; return allTiger(bb).length - allTiger(ba).length; })[0];
          const want = best ? (sel === best.from ? best.to : best.from) : null;
          U.boardHint(host, best ? { el: host.querySelector('.pt[data-p="' + want + '"]'), line: cap ? "A goat can be taken: that tiger, then the point beyond the goat." : "Keep the tigers free: that tiger, then the open point." } : null);
        }
        host.querySelectorAll(".pt").forEach((g) => g.addEventListener("click", () => tap(+g.dataset.p)));
      }
      function tap(p) {
        if (busy) return;
        cursor = p;
        if (B[p] === 1) { sel = p; note = null; return draw(); }
        if (sel == null) return draw();
        const m = tigerMoves(B, sel).find((x) => x.to === p);
        if (!m) { sel = null; return draw(); }
        B[m.from] = 0; B[m.to] = 1; sel = null; moves++;
        if (m.take != null) { B[m.take] = 0; taken++; sfx("hit"); cue("good"); note = "You jump a goat and take it."; } else { sfx("tap"); cue("act"); note = null; }
        if (taken >= need) { draw(); return later(timers, 600, () => finish("win", ["You took {g} goats.", { g: taken }])); }
        busy = true; draw();
        later(timers, 650, () => {
          const g = goatTurn();
          if (g) { if (g.from != null) B[g.from] = 0; else placed++; B[g.to] = 2; sfx("tap"); }
          busy = false;
          if (!allTiger(B).length) { note = "Both tigers are hemmed in."; cue("bad"); draw(); return later(timers, 700, () => finish(taken >= need - 1 ? "close" : "lose", ["The goats hemmed in your tigers. You took {g}.", { g: taken }])); }
          if (moves >= MAXM) { draw(); return later(timers, 700, () => finish(taken >= need - 1 ? "close" : "lose", ["The moves ran out. You took {g}.", { g: taken }])); }
          draw();
        });
      }
      const mv = (dr, dc) => { const r = clamp(Math.floor(cursor / 5) + dr, 0, 4), c2 = clamp((cursor % 5) + dc, 0, 4); cursor = PT(r, c2); draw(); };
      const off = keyset({ ArrowUp: () => mv(-1, 0), ArrowDown: () => mv(1, 0), ArrowLeft: () => mv(0, -1), ArrowRight: () => mv(0, 1), " ": () => tap(cursor), Enter: () => tap(cursor) });
      // The goats begin: the first goat comes on before the tigers move.
      const g0 = goatTurn(); if (g0) { B[g0.to] = 2; placed++; }
      draw();
      return () => { off(); timers.forEach(clearTimeout); };
    });
  };

  // ---------- Moksha Patam: virtues raise you, vices bring you down ----------
  // A short board of 36. Two dice, and you move by the one you choose; passing 36 counts.
  // A ladder gives you its virtue, which saves you from the next snake you land on.
  // The karma squares swap your place with the other player's.
  const MK = 36, MW = 6;
  const LADDERS = { 4: [15, "Generosity"], 12: [23, "Faith"], 20: [31, "Truth"] };
  const SNAKES = { 16: [6, "Anger"], 28: [18, "Greed"], 34: [21, "Pride"] };
  const KARMA = new Set([11, 26]);
  const sqXY = (n) => { const i = n - 1, row = Math.floor(i / MW), col = row % 2 ? MW - 1 - (i % MW) : i % MW; return [col * 40 + 20, (MW - 1 - row) * 40 + 20]; };
  U.games.moksha = function (box, done, c) {
    return U.trialFrame(box, done, c, "board", ({ host, power, t, finish, cue }) => {
      const opp = K.tr(t.opponent || "Your opponent"), slip = clamp(0.1 + power * 0.03, 0.1, 0.4);
      const G = { me: 1, them: 1, virtue: { me: 0, them: 0 }, dice: null, phase: "throw", note: null, said: null, turns: 0 };
      const timers = [], R = t.remarks || null, rounds = t.turns || 14;
      const other = (side) => (side === "me" ? "them" : "me");
      // Where a move of v leaves both players, without making it: for the opponent's choice and the hint.
      function outcome(side, v) {
        const pos = { me: G.me, them: G.them }, to = Math.min(MK, pos[side] + v);
        let end = to, ev = null;
        if (LADDERS[to]) { end = LADDERS[to][0]; ev = "ladder"; }
        else if (SNAKES[to]) { if (G.virtue[side]) ev = "saved"; else { end = SNAKES[to][0]; ev = "snake"; } }
        pos[side] = end;
        if (KARMA.has(to) && pos[side] !== pos[other(side)]) { const o = pos[other(side)]; pos[other(side)] = pos[side]; pos[side] = o; ev = "karma"; }
        return { to, end, ev, pos };
      }
      const worth = (side, v) => { const o = outcome(side, v); return o.pos[side] - o.pos[other(side)] + (o.pos[side] >= MK ? 99 : 0) + (o.ev === "ladder" ? 2 : 0); };
      const roll = () => [1 + Math.floor(K.rng() * 6), 1 + Math.floor(K.rng() * 6)];
      const remark = (ev) => { const l = R && R[ev]; if (l && l.length) G.said = K.pick(l); };
      // The board, drawn once; each turn moves the pieces and rewrites the lines around it.
      let sq = "", ld = "";
      for (let n = 1; n <= MK; n++) {
        const [x, y] = sqXY(n), k = KARMA.has(n);
        sq += '<rect class="sq' + (k ? " karma" : n === MK ? " goal" : (Math.floor((n - 1) / MW) + (n - 1)) % 2 ? " alt" : "") + '" x="' + (x - 20) + '" y="' + (y - 20) + '" width="40" height="40"/><text class="num" x="' + (x - 16) + '" y="' + (y - 9) + '">' + n + "</text>" +
          (k ? '<text class="tag" x="' + x + '" y="' + (y + 13) + '">' + U.esc(K.tr("Karma")) + "</text>" : n === MK ? '<text class="tag" x="' + x + '" y="' + (y + 13) + '">' + U.esc(K.tr("Moksha")) + "</text>" : "");
      }
      for (const [a, [b, name]] of Object.entries(LADDERS)) {
        const [x1, y1] = sqXY(+a), [x2, y2] = sqXY(b), dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = (-dy / L) * 6, ny = (dx / L) * 6, n = Math.floor(L / 13);
        let rungs = ""; for (let k = 1; k < n; k++) { const f = k / n, px = x1 + dx * f, py = y1 + dy * f; rungs += "M" + (px - nx) + "," + (py - ny) + " L" + (px + nx) + "," + (py + ny) + " "; }
        ld += '<g class="ladder"><path d="M' + (x1 - nx) + "," + (y1 - ny) + " L" + (x2 - nx) + "," + (y2 - ny) + " M" + (x1 + nx) + "," + (y1 + ny) + " L" + (x2 + nx) + "," + (y2 + ny) + " " + rungs + '"/><text x="' + (x1 + 4) + '" y="' + (y1 + 15) + '">' + U.esc(K.tr(name)) + "</text></g>";
      }
      for (const [a, [b, name]] of Object.entries(SNAKES)) {
        const [x1, y1] = sqXY(+a), [x2, y2] = sqXY(b), mx = (x1 + x2) / 2;
        ld += '<g class="snake"><path d="M' + x1 + "," + y1 + " C" + (mx + 34) + "," + (y1 + 10) + " " + (mx - 34) + "," + (y2 - 10) + " " + x2 + "," + y2 + '"/><circle cx="' + x1 + '" cy="' + y1 + '" r="6"/><text x="' + (x1 + 4) + '" y="' + (y1 + 16) + '">' + U.esc(K.tr(name)) + "</text></g>";
      }
      host.innerHTML = '<p class="score" aria-live="polite"></p>' +
        boardWrap(t, '<svg class="moksha" viewBox="0 0 240 240" role="img" aria-label="' + U.esc(K.tr("The Moksha Patam board")) + '">' + sq + ld + '<g class="aims"></g><g class="tok them"><circle r="8"/></g><g class="tok me"><circle r="8"/></g></svg>') +
        '<div class="pickdice"></div><p class="game-note" aria-live="polite"></p><div class="btnrow"></div>';
      const svg = host.querySelector("svg"), toks = { me: svg.querySelector(".tok.me"), them: svg.querySelector(".tok.them") };
      const at = (side, n) => { const [x, y] = sqXY(Math.min(MK, n)); return [x + (side === "me" ? 8 : -8), y + 8]; };
      const put = (side, xy) => toks[side].setAttribute("transform", "translate(" + xy[0].toFixed(1) + " " + xy[1].toFixed(1) + ")");
      const place = (side, n) => put(side, at(side, n));
      // A ladder or a snake carries the piece in a few quick frames (none with calm motion).
      const glide = (side, from, n, then) => {
        const a = from, b = at(side, n), F = U.motion() ? 5 : 0;
        let f = 0;
        const go = () => { f++; if (f >= F) { put(side, b); return then(); } put(side, [a[0] + (b[0] - a[0]) * f / F, a[1] + (b[1] - a[1]) * f / F]); later(timers, 40, go); };
        go();
      };
      place("me", 1); place("them", 1);
      function draw() {
        const v = (side) => (G.virtue[side] ? " · " + U.tr("virtue") + " ✦" : "");
        host.querySelector(".score").innerHTML = U.tr("You: {a}", { a: Math.min(MK, G.me) }) + v("me") + " · " + U.tr("{who}: {b}", { b: Math.min(MK, G.them), who: opp }) + v("them");
        const note = G.note ? U.t(G.note) : U.tr(G.phase === "choose" ? "Move by the die you choose." : G.phase === "throw" ? "Your throw." : "{who} throws.", { who: opp });
        host.querySelector(".game-note").innerHTML = note + (G.said ? ' <span class="remark">' + U.esc(opp) + ": “" + U.t(G.said) + "”</span>" : "");
        const pd = host.querySelector(".pickdice"), row = host.querySelector(".btnrow"), aims = svg.querySelector(".aims");
        pd.innerHTML = ""; row.innerHTML = ""; aims.innerHTML = "";
        if (G.phase === "throw") row.appendChild(U.button("cta", U.tr("Throw the dice"), throwMine));
        if (G.dice) G.dice.forEach((d, i) => { const b = U.button("cta secondary die-pick", U.tr("Move {n}", { n: d }), () => choose(i)); b.disabled = G.phase !== "choose"; pd.appendChild(b); });
        // Where each die would land, marked on the board.
        if (G.phase === "choose") G.dice.forEach((d) => { const [x, y] = sqXY(Math.min(MK, G.me + d)); aims.innerHTML += '<rect class="aim" x="' + (x - 18) + '" y="' + (y - 18) + '" width="36" height="36"/>'; });
        if (U.boardHint && G.phase === "choose") {
          const bi = worth("me", G.dice[0]) >= worth("me", G.dice[1]) ? 0 : 1, o = outcome("me", G.dice[bi]);
          U.boardHint(host, { el: pd.children[bi], line: o.ev === "ladder" ? "Move {n}: a ladder waits there." : o.ev === "karma" ? "Move {n}: the karma square puts you ahead." : outcome("me", G.dice[1 - bi]).ev === "snake" ? "Move {n}: the other die lands on a snake." : "Move {n}: the longer step.", p: { n: G.dice[bi] } });
        }
      }
      // A move: the piece hops square by square, then rides the ladder or the snake, then the karma swap.
      function move(side, v, then) {
        const from = G[side], o = outcome(side, v), hop = U.motion() ? 70 : 0;
        G.note = null; if (side === "me") G.said = null; // a remark stays up until your next move
        let n = from;
        const next = () => {
          if (n < o.to) { n++; place(side, n); sfx("tap"); return hop ? later(timers, hop, next) : next(); }
          const L = LADDERS[o.to], Sn = SNAKES[o.to], me = side === "me";
          if (o.ev === "ladder") { G.virtue[side] = 1; G.note = [me ? "The ladder of {what} lifts you to {b}, and you keep its virtue." : "The ladder of {what} lifts {who} to {b}.", { what: L[1], b: o.end, who: opp }]; }
          else if (o.ev === "snake") G.note = [me ? "The snake of {what} takes you down to {b}." : "The snake of {what} takes {who} down to {b}.", { what: Sn[1], b: o.end, who: opp }];
          else if (o.ev === "saved") { G.virtue[side] = 0; G.note = [me ? "Your virtue holds. The snake of {what} cannot touch you." : "{who}'s virtue holds against the snake of {what}.", { what: Sn[1], who: opp }]; }
          if (me) { cue(o.ev === "ladder" || o.ev === "saved" ? "good" : o.ev === "snake" ? "bad" : "act"); if (o.ev === "snake") sfx("hit"); }
          else if (o.ev === "snake") cue("good");
          G.me = o.pos.me; G.them = o.pos.them;
          if (o.ev === "karma") { G.note = [me ? "Karma: you and {who} change places." : "Karma: {who} lands on it, and you change places.", { who: opp }]; cue(G.me > G.them ? "good" : "bad"); }
          // Remarks: the opponent's own words on what just happened, if the test gives any.
          remark(o.ev ? (me ? "" : "his_") + o.ev : null);
          draw();
          // The piece rides the ladder or snake; on karma both pieces cross over.
          const oth = other(side);
          if (o.ev === "karma") { glide(oth, at(oth, G[side]), G[oth], () => {}); return glide(side, at(side, o.to), G[side], then); }
          if (o.ev === "ladder" || o.ev === "snake") return later(timers, hop ? 80 : 0, () => glide(side, at(side, o.to), o.end, then));
          then();
        };
        next();
      }
      function throwMine() {
        if (G.phase !== "throw") return;
        G.dice = roll(); sfx("dice"); G.note = null; cue("act");
        G.phase = "choose"; draw();
        U.keys([() => choose(0), () => choose(1)]);
      }
      function choose(i) {
        if (G.phase !== "choose") return;
        U.keys([]); G.phase = "wait";
        move("me", G.dice[i], () => {
          if (G.me >= MK) { remark("lose"); draw(); return later(timers, 600, () => finish("win", "You reach moksha first.")); }
          later(timers, U.motion() ? 450 : 0, aiTurn);
        });
      }
      function aiTurn() {
        G.dice = roll(); sfx("dice"); G.phase = "them"; draw();
        later(timers, 300, () => {
          const v = K.rng() < slip ? K.pick(G.dice) : worth("them", G.dice[0]) >= worth("them", G.dice[1]) ? G.dice[0] : G.dice[1];
          move("them", v, () => {
            G.turns++;
            if (G.them >= MK) { remark("win"); draw(); return later(timers, 700, () => finish(MK - G.me <= 5 ? "close" : "lose", ["{who} reaches moksha first.", { who: opp }])); }
            if (G.turns >= rounds) return later(timers, 700, () => finish(G.me > G.them ? "win" : G.them - G.me <= 5 ? "close" : "lose", "The game is called before anyone reaches moksha."));
            G.phase = "throw"; G.dice = null; draw(); U.keys([throwMine]);
          });
        });
      }
      if (R && R.start) G.said = K.pick(R.start);
      draw(); U.keys([throwMine]);
      return () => { timers.forEach(clearTimeout); U.keys([]); };
    });
  };
})(window.K = window.K || {});
