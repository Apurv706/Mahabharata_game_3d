/* Two small games of dice, played inside a scene: a choice with `game: "pasha"` or `game: "hands"`
   opens the game in place of the choices, and its outcome ("win" or "lose") picks the choice's
   `win` or `lose` branch. Every button the player needs is a .cta, so the automated playthroughs
   can play them too. */
(function (K) {
  "use strict";
  const U = K.UI;
  const FACES = [1, 2, 5, 6]; // a long pasha die has four faces
  const NUM = ["", "One", "Two", "Three", "Four", "Five", "Six"];
  const throwDie = () => K.pick(FACES);
  const sum = (a) => a.reduce((n, x) => n + x, 0);
  // Waits scale with the practice ground's speed (K.practiceSpeed: 1 outside it), so the timed
  // shows slow down there like the other tests.
  const slowed = (ms) => ms / (K.practiceSpeed ? K.practiceSpeed() : 1);
  const wait = (ms, fn) => (U.motion() ? setTimeout(fn, slowed(ms)) : fn());
  // A long die seen from above: its value as a row of pips.
  const die = (v, i, live) => '<button type="button" class="die' + (live ? " live" : "") + '" data-i="' + i + '"' + (live ? "" : " disabled") +
    ' aria-label="' + U.esc(K.tr(NUM[v])) + '">' + "<i></i>".repeat(v) + "</button>";
  const diceRow = (vals, live, rolled) => '<div class="dice' + (rolled ? " rolled" : "") + '">' + vals.map((v, i) => die(v, i, live)).join("") + "</div>";

  U.games = {};

  // ---------- Pasha at the fair: three long dice each, best of three rounds ----------
  U.games.pasha = function (box, done, c) {
    const G = { round: 1, me: 0, them: 0, phase: "ready", mine: null, theirs: null, rolled: false, note: null };
    // In a scene, the game is played on the painted gaming cloth, full-screen, like the tests.
    const deep = !!(U.inScene && !K.headless);
    const wrap = U.el('<div class="dicegame pasha trial' + (deep ? " immersive playing" : "") + '">' + (deep ? U.castBand({ stage: "stage_dice_board_top", cast: [] }) : "") + '<div class="trial-body"></div></div>');
    box.appendChild(wrap);
    const host = deep ? wrap.querySelector(".trial-body") : wrap;
    if (deep) { document.body.classList.add("intest"); U.setBackdrop("stage_dice_board_top"); }
    const OPP = (c && c.trial && c.trial.opponent) || "Haridatta"; // another opponent at the practice ground
    function draw() {
      const opp = K.tr(OPP);
      let html = '<p class="game-rules">' + U.tr("Three long dice each, marked one, two, five and six. The higher total takes the round; two rounds win the game. Once a round you may throw one of your dice again.") + "</p>" +
        '<p class="score">' + U.tr("Round {n}", { n: G.round }) + " · " + U.tr("You {a}, {who} {b}", { a: G.me, b: G.them, who: opp }) + "</p>";
      if (G.theirs) html += '<div class="row"><span class="who">' + U.esc(opp) + "</span>" + diceRow(G.theirs, false, G.rolled) + '<b class="sum">' + sum(G.theirs) + "</b></div>";
      if (G.mine) html += '<div class="row you"><span class="who">' + U.tr("You") + "</span>" + diceRow(G.mine, G.phase === "decide", G.rolled) + '<b class="sum">' + sum(G.mine) + "</b></div>";
      if (G.note) html += '<p class="game-note">' + U.t(G.note) + "</p>";
      html += '<div class="btnrow"></div>';
      host.innerHTML = html;
      const row = host.querySelector(".btnrow");
      if (G.phase === "ready") row.appendChild(U.button("cta", U.tr(G.round === 1 && !G.me && !G.them ? "Throw the dice" : "Throw again"), roll));
      if (G.phase === "decide") {
        row.appendChild(U.button("cta", U.tr("Stand on {n}", { n: sum(G.mine) }), () => settle()));
        if (U.boardHint) { const behind = sum(G.mine) < sum(G.theirs), low = G.mine.indexOf(Math.min(...G.mine)); U.boardHint(host, { el: behind ? host.querySelectorAll(".die.live")[low] : row.firstElementChild, line: behind ? "You are behind: throw your lowest die again." : "You are ahead: stand." }); }
        host.querySelectorAll(".die.live").forEach((b) => b.addEventListener("click", () => rethrow(+b.dataset.i)));
      }
      if (G.phase === "next") row.appendChild(U.button("cta", U.tr("Next round"), () => { G.phase = "ready"; G.mine = G.theirs = null; G.note = null; G.rolled = false; draw(); }));
      U.keys(G.phase === "decide" ? [() => settle()] : []);
      G.rolled = false;
    }
    function roll() {
      G.phase = "wait"; G.note = null;
      G.theirs = [throwDie(), throwDie(), throwDie()];
      // He knows the game: a die showing one or two goes back in the cup.
      const low = G.theirs.indexOf(Math.min(...G.theirs));
      if (G.theirs[low] <= 2) G.theirs[low] = throwDie();
      G.mine = null; G.rolled = true;
      if (K.Sound) K.Sound.play("dice");
      draw();
      wait(700, () => {
        G.mine = [throwDie(), throwDie(), throwDie()];
        G.phase = "decide"; G.rolled = true;
        G.note = sum(G.mine) > sum(G.theirs) ? "You are ahead. Stand, or risk a die." : "Tap one of your dice to throw it again, or stand.";
        if (K.Sound) K.Sound.play("dice");
        draw();
      });
    }
    function rethrow(i) {
      if (G.phase !== "decide") return;
      G.mine[i] = throwDie();
      G.rolled = true;
      if (K.Sound) K.Sound.play("dice");
      settle();
    }
    function settle() {
      const a = sum(G.mine), b = sum(G.theirs);
      if (a > b) { G.me++; G.note = ["You take the round, {a} to {b}.", { a, b }]; }
      else if (b > a) { G.them++; G.note = ["{who} takes the round, {b} to {a}.", { a, b, who: OPP }]; }
      else G.note = "A tie. The round is thrown again.";
      if (a !== b) G.round++;
      if (G.me === 2 || G.them === 2) {
        G.phase = "over";
        draw();
        const won = G.me === 2;
        wait(900, () => { document.body.classList.remove("intest"); done(won ? "win" : "lose", [won ? "You won the game, {a} rounds to {b}." : "You lost the game, {b} rounds to {a}.", { a: G.me, b: G.them }]); });
        return;
      }
      G.phase = "next";
      draw();
    }
    draw();
    return { draw };
  };

  // ---------- Shakuni's hands: five throws, one of them with a die from his sleeve ----------
  U.games.hands = function (box, done, c) {
    const sharp = K.S.flags.includes("learned_pasha");
    const throws = [];
    for (let i = 0; i < 5; i++) throws.push([throwDie(), throwDie(), throwDie()]);
    const swap = Math.floor(K.rng() * 5);
    throws[swap][Math.floor(K.rng() * 3)] = K.rng() < 0.5 ? 3 : 4; // a face no long die has
    const G = { phase: "ready", shown: -1 };
    const deep = !!(U.inScene && !K.headless && c && c.trial && c.trial.stage);
    const wrap = U.el('<div class="dicegame hands trial' + (deep ? " immersive playing" : "") + '">' + U.castBand((c && c.trial) || {}) + '<div class="trial-body"></div></div>');
    box.appendChild(wrap);
    if (deep) document.body.classList.add("intest");
    const host = wrap.querySelector(".trial-body");
    U.castStance(wrap, "think", "stand");
    // At the practice ground someone else throws (trial.thrower); in the dice hall it is Shakuni.
    const who = c && c.trial && c.trial.thrower;
    const call = (t) => (who ? K.tr("{who} calls {n}, and the dice show {n}.", { n: sum(t), who: K.tr(who) }) : K.tr("Shakuni calls {n}, and the dice show {n}.", { n: sum(t) }));
    function draw() {
      let html = '<p class="game-rules">' + (who ? U.tr("{who} will throw five times. One throw is not honest. Watch the hands.", { who: K.tr(who) }) : U.tr("Shakuni will throw five times. One throw is not honest. Watch his hands.")) + "</p>";
      if (sharp) html += '<p class="game-note">' + U.tr("You remember the dice at the spring fair: a long die shows only one, two, five or six.") + "</p>";
      if (G.phase === "watch") {
        const t = throws[G.shown];
        html += '<p class="score">' + U.tr("Throw {n} of 5", { n: G.shown + 1 }) + '</p><div class="row">' + diceRow(t, false, true) + '</div><p class="game-note">' + U.esc(call(t)) + "</p>";
      }
      if (G.phase === "ask" && !U.motion()) {
        html += '<ol class="throws">' + throws.map((t, i) => "<li><span>" + U.tr("Throw {n}", { n: i + 1 }) + "</span>" + diceRow(t, false) + "</li>").join("") + "</ol>";
      }
      if (G.phase === "ask") html += '<p class="score">' + U.tr("Which throw was not honest?") + "</p>";
      html += '<div class="btnrow"></div>';
      host.innerHTML = html;
      const row = host.querySelector(".btnrow");
      const keys = [];
      if (G.phase === "ready") { const go = () => watch(0); row.appendChild(U.button("cta", U.tr("Watch his hands"), go)); keys.push(go); }
      if (G.phase === "ask") for (let i = 0; i < 5; i++) { const f = () => answer(i); row.appendChild(U.button("cta secondary", U.tr("Throw {n}", { n: i + 1 }), f)); keys.push(f); }
      U.keys(keys);
    }
    function watch(i) {
      if (!U.motion()) { G.phase = "ask"; return draw(); }
      G.phase = "watch"; G.shown = i;
      if (K.Sound) K.Sound.play("dice");
      draw();
      setTimeout(() => (i < 4 ? watch(i + 1) : (G.phase = "ask", draw())), slowed(sharp ? 1500 : 950));
    }
    let answered = false;
    function answer(i) {
      if (answered) return; // one answer: a second key or tap while the result shows does nothing
      answered = true;
      U.keys([]);
      const right = i === swap;
      U.castStance(wrap, right ? "cheer" : "slump", right ? "slump" : "stand");
      host.querySelectorAll(".btnrow button").forEach((b) => { b.disabled = true; });
      const end = () => { document.body.classList.remove("intest"); done(right ? "win" : "lose", right ? ["You named throw {n}. You were right.", { n: i + 1 }] : ["You named throw {n}. It was throw {m}.", { n: i + 1, m: swap + 1 }]); };
      if (deep) wait(1100, end); else end();
    }
    draw();
    return { draw };
  };
})(window.K = window.K || {});
