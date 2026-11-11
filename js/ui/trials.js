/* Action tests: moments where the player has to do the thing, not just choose it.
   A choice with `game: "aim" | "push" | "steady" | "retort"` and `trial: { ... }` opens a test in
   place of the choices: first the stakes (what you win, what you risk, how your stats help), then
   the action itself. The outcome ("win", "close" or "lose") picks the choice's branch, as with the
   dice games. Your stats set the difficulty; how you play decides the result.

   trial: { attr, skill,           stats that widen the window
            stakes: [win, lose],   shown before you begin
            rules,                 one line on what to do
            target, foe,           what you aim at / who you push against (names, translated)
            practice: true }       a first test that does not count (no record, no merits)

   Under the test harness (K.headless) a test is a single .cta that rolls against the same stats,
   so the automated playthroughs reach every branch. */
(function (K) {
  "use strict";
  const U = K.UI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // How much the player's stats help: attribute + skill + what their past still does for them.
  K.trialPower = function (t, S = K.S) {
    const a = t.attr ? K.attr(t.attr) : 0, s = t.skill ? S.skills[t.skill] || 0 : 0;
    return a + s + K.merits({ attr: t.attr, skill: t.skill }, S).n;
  };
  const statNames = (t) => K.list([t.attr && K.tr(K.ATTRS[t.attr]), t.skill && K.tr(K.SKILLS[t.skill])].filter(Boolean));

  // The frame every test shares: stakes first, then the action, with one key for the action.
  // How each kind of test holds the figures, and how you move when you act.
  const STANCE = { breath: "fold", aim: "aim", push: "brace", draw: "aim", steady: "hold", sneak: "sneak", retort: "speak", notice: "think", rhythm: "brace", race: "hold", herd: "hold", board: "think", drill: "stand", rings: "think", dash: "hold", formation: "think", array: "think", escape: "walk", fuse: "sneak" };
  const ACT = { breath: "fold", aim: "loose", push: "push", draw: "loose", steady: "hold", sneak: "walk", retort: "speak", notice: "think", rhythm: "strike", race: "hold", herd: "walk", board: "think", drill: "speak", rings: "think", dash: "hold", escape: "walk", fuse: "hold" };
  const FOE = { push: "brace", rhythm: "block" };
  K.TRIAL_STANCE = STANCE;

  const IMMERSIVE = new Set(["aim", "board", "push", "steady", "retort", "draw", "sneak", "notice", "drill", "rhythm", "race", "herd", "rings", "dash", "formation", "array", "breath", "escape", "fuse"]);
  // What hangs and swings in the archery test, drawn centred on its middle (about 64 units across).
  const RUNNERS = new Set(["deer", "tiger", "elephant", "chariot"]);
  // Half the width of each target as drawn, in its own units. On the painting the target is drawn
  // exactly as wide as its hit zone, so a shot that touches it is a hit and one that passes it is not.
  const ART_HALF = { lamp: 18, fruit: 20, bell: 20, leaf: 20, bird: 28, deer: 30, tiger: 44, elephant: 36, chariot: 36 };
  // Where on the target a shot is aimed, in its own units, when that is not its middle: Arjuna's
  // lamp is shot at the flame.
  const AIM_AT = { lamp: [0, -18] };
  function AIM_ART(icon) {
    const loop = '<path d="M0 -40 L0 -30" stroke="#5a3a22" stroke-width="2"/>';
    if (icon === "lamp") return loop + '<path d="M-18 -6 Q0 18 18 -6 Z" fill="#b5793a" stroke="#4a2a12" stroke-width="2"/><path d="M0 -8 Q-7 -20 0 -32 Q7 -20 0 -8Z" fill="#ffd27a"/><circle cx="0" cy="-16" r="16" fill="#ffb648" opacity=".25"/>';
    if (icon === "fruit") return loop + '<path d="M0 -30 Q22 -22 18 4 Q12 26 -4 26 Q-20 22 -18 0 Q-16 -24 0 -30Z" fill="#f0a030" stroke="#8a4a14" stroke-width="2"/><path d="M0 -30 Q8 -40 16 -36" stroke="#3f6b3a" stroke-width="3" fill="none"/>';
    if (icon === "bell") return loop + '<path d="M-20 18 Q-18 -24 0 -28 Q18 -24 20 18 Z" fill="#b8862e" stroke="#5a3a12" stroke-width="2"/><circle cx="0" cy="22" r="5" fill="#5a3a12"/>';
    if (icon === "deer") return '<g stroke="#1d0f08" stroke-width="2.7" stroke-linejoin="round" stroke-linecap="round"><path d="M-20 2 L-24 24 M-12 2 L-10 24 M10 2 L8 24 M17 0 L21 24" fill="none" stroke-width="3.2"/><path d="M-28 -6 Q-30 -18 -14 -19 L10 -19 Q17 -19 21 -25 L27 -37 Q31 -42 35 -37 L34 -30 Q38 -24 35 -18 Q31 -9 22 -6 L20 4 Q0 6 -20 4 Z" fill="#c9843e" /><path d="M-28 -9 l-7 -4" fill="none"/><path d="M29 -39 l-3 -10 l-6 -3 M27 -47 l4 -5 M33 -39 l5 -9 l6 -2" fill="none" stroke-width="2"/><path d="M-22 -11 Q0 -15 18 -11" fill="none" stroke="#a3302a" stroke-width="2.6"/><path d="M-22 -3 Q0 -6 16 -3" fill="none" stroke="#3f6b3a" stroke-width="2"/><path d="M-20 -7 Q-4 -9.6 14 -7.4" fill="none" stroke="#fff3d0" stroke-opacity=".75" stroke-width="2.2" stroke-dasharray="0 4" stroke-linecap="round"/><circle cx="31" cy="-31" r="1.7" fill="#2b1609" stroke="none"/><circle cx="-18" cy="1" r="2.4" fill="#d9a53a" stroke="#2b1609" stroke-width="1"/><circle cx="14" cy="0" r="2.4" fill="#d9a53a" stroke="#2b1609" stroke-width="1"/><circle cx="22" cy="-14" r="2.4" fill="#d9a53a" stroke="#2b1609" stroke-width="1"/></g>';
    if (icon === "tiger") return '<g stroke="#1d0f08" stroke-width="2.7" stroke-linejoin="round" stroke-linecap="round"><path d="M-30 -8 Q-44 -14 -46 -28 Q-40 -18 -30 -14" fill="none" stroke="#e08a2a" stroke-width="5"/><path d="M-30 -8 Q-44 -14 -46 -28" fill="none" stroke-width="1.2"/><path d="M-22 4 L-26 24 L-19 24 L-16 6 M16 4 L14 24 L21 24 L24 4" fill="#e08a2a" /><path d="M-32 -8 Q-30 -21 -12 -21 L14 -21 Q26 -21 29 -13 L30 4 Q28 8 22 7 L-24 7 Q-33 6 -32 -8Z" fill="#e08a2a" /><path d="M24 -16 Q26 -30 36 -28 Q46 -26 46 -16 Q46 -6 36 -5 Q28 -5 24 -10Z" fill="#e08a2a" /><path d="M28 -27 l2 -7 l5 4 M38 -28 l4 -6 l3 6" fill="#e08a2a"/><g fill="none" stroke="#7a2a10" stroke-width="2.6"><path d="M-20 -21 q3 9 -1 15 M-10 -21 q3 9 -1 15 M0 -21 q3 9 -1 15 M10 -21 q3 9 -1 15"/></g><path d="M-26 1 H22" fill="none" stroke="#3f6b3a" stroke-width="2"/><path d="M-22 4.2 H18" fill="none" stroke="#fff3d0" stroke-opacity=".75" stroke-width="2.2" stroke-dasharray="0 4" stroke-linecap="round"/><circle cx="40" cy="-18" r="1.8" fill="#2b1609" stroke="none"/><path d="M42 -10 h4" fill="none"/><circle cx="-20" cy="2" r="2.4" fill="#d9a53a" stroke="#2b1609" stroke-width="1"/><circle cx="19" cy="2" r="2.4" fill="#d9a53a" stroke="#2b1609" stroke-width="1"/><circle cx="26" cy="-12" r="2.4" fill="#d9a53a" stroke="#2b1609" stroke-width="1"/></g>';
    if (icon === "elephant") return '<g stroke="#1d0f08" stroke-width="2.7" stroke-linejoin="round" stroke-linecap="round"><path d="M-24 8 L-24 26 L-15 26 L-15 10 M12 10 L12 26 L21 26 L21 8" fill="#8d8a86" /><path d="M-34 6 Q-36 -24 -6 -27 Q20 -28 26 -12 Q34 -6 34 8 Q34 24 27 27 Q24 18 22 10 Q14 12 -24 12 Q-33 12 -34 6Z" fill="#8d8a86" /><path d="M8 -20 Q4 -8 10 2 Q18 6 22 -4" fill="none" stroke-width="1.8"/><path d="M-20 -24 Q-6 -28 6 -24 L8 2 Q-6 6 -20 2 Z" fill="#a3302a" /><path d="M-20 2 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4" fill="none" stroke="#d9a53a" stroke-width="2"/><path d="M-16 -18 Q-6 -20 4 -18" fill="none" stroke="#fff3d0" stroke-opacity=".75" stroke-width="2.2" stroke-dasharray="0 4" stroke-linecap="round"/><path d="M-16 -9 Q-6 -11 4 -9" fill="none" stroke="#fff3d0" stroke-opacity=".75" stroke-width="2.2" stroke-dasharray="0 4" stroke-linecap="round"/><path d="M30 0 Q38 6 36 16" fill="none" stroke="#f4e4c1" stroke-width="3"/><circle cx="22" cy="-12" r="1.8" fill="#2b1609" stroke="none"/><circle cx="-19" cy="9" r="2.4" fill="#d9a53a" stroke="#2b1609" stroke-width="1"/><circle cx="16" cy="9" r="2.4" fill="#d9a53a" stroke="#2b1609" stroke-width="1"/></g>';
    // An enemy chariot at range (an archery duel, content/war_fights.js): horse, car and archer, side on.
    if (icon === "chariot") return '<g stroke="#1d0f08" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M8 -4 Q14 -16 26 -16 L34 -24 L38 -20 L34 -12 Q38 -4 34 4 L30 6 L28 20 M18 4 L16 20" fill="#c9a679" /><path d="M-30 -2 H10 L6 -14 H-26 Z" fill="#3d5a8a" /><path d="M8 -6 L20 -6" stroke-width="3"/><circle cx="-14" cy="8" r="11" fill="none" stroke-width="3.5"/><path d="M-14 -3 V19 M-25 8 H-3 M-22 0 L-6 16 M-6 0 L-22 16" stroke-width="1.6"/><path d="M-16 -14 L-14 -34 M-20 -26 L-8 -24" stroke-width="3"/><circle cx="-14" cy="-38" r="5" fill="#2b1609"/><path d="M-4 -44 Q4 -30 -4 -16" fill="none" stroke-width="2"/><path d="M-4 -44 L-4 -16" stroke-width=".8"/></g>';
    if (icon === "bird") return '<g stroke="#1d0f08" stroke-width="2.5" stroke-linejoin="round"><path d="M-28 0 Q-12 -20 0 -5 Q12 -20 28 0 Q12 -9 0 7 Q-12 -9 -28 0Z" fill="#3f6b3a" /><path d="M-20 -5 Q-10 -11 -3 -4 M20 -5 Q10 -11 3 -4" fill="none" stroke="#a3302a" stroke-width="2.2"/><path d="M-22 -1.2 Q-12 -5.4 -4 0 M22 -1.2 Q12 -5.4 4 0" fill="none" stroke="#fff3d0" stroke-opacity=".75" stroke-width="2.2" stroke-dasharray="0 3.6" stroke-linecap="round"/><circle cx="0" cy="0" r="3" fill="#d9a53a" stroke-width="1"/></g>';
    if (icon === "leaf") return loop + '<path d="M0 -30 Q20 -6 0 28 Q-20 -6 0 -30Z" fill="#6f8f3a" stroke="#3a4f1c" stroke-width="2"/><path d="M0 -26 V24" stroke="#3a4f1c" stroke-width="1.5"/>';
    // A plain straw target, rope-bound, as on the training ground.
    return loop + '<circle r="30" fill="#d9b26a" stroke="#6b4a24" stroke-width="3"/><circle r="22" fill="none" stroke="#a87a3a" stroke-width="3"/><circle r="13" fill="none" stroke="#a87a3a" stroke-width="3"/><circle r="5" fill="#b2432a"/><path d="M-30 0 H30 M0 -30 V30" stroke="#8a6230" stroke-width="1.2" opacity=".55"/>';
  }
  function frame(box, done, c, kind, play) {
    const t = c.trial || {};
    // The stage: a strip of the painting with the figures on it, above the test itself.
    // Immersive tests: the stage painting is the playing field. The page, the top bar and the
    // story fall away; the figures stand big on the painting's ground, the score sits at the top
    // and the controls at the foot. (Being built test by test: IMMERSIVE lists those done.)
    const deep = !!(U.inScene && t.stage && IMMERSIVE.has(kind) && !K.headless);
    const wrap = U.el('<div class="trial trial-' + kind + (deep ? " immersive" : "") + '">' + U.castBand(t, kind) +
      (deep ? '<header class="t-head"><span class="t-name">' + U.t(K.val(c.t)) + "</span></header>" : "") + '<div class="trial-body"></div></div>');
    box.appendChild(wrap);
    if (deep) document.body.classList.add("intest");
    const host = wrap.querySelector(".trial-body");
    U.castStance(wrap, STANCE[kind] || "stand", FOE[kind] || "stand");
    // The figures answer what happens: you move as you act, the other side staggers when you score.
    const cue = (ev) => {
      if (ev === "act") U.castPose(wrap, "me", ACT[kind] || "strike", 450);
      else if (ev === "good") { U.castPose(wrap, "foe", "hit", 520); U.castPose(wrap, "me", "cheer", 520); }
      else if (ev === "bad") { U.castPose(wrap, "me", "hit", 520); U.castPose(wrap, "foe", FOE[kind] === "brace" ? "push" : "cheer", 520); }
      else if (ev === "hold") U.castPose(wrap, "me", ACT[kind] || "hold", 0);
      else if (ev === "rest") U.castPose(wrap, "me", STANCE[kind] || "stand", 0);
    };
    const power = K.trialPower(t);
    let phase = "intro", stop = null, finished = false;
    function intro() {
      host.innerHTML =
        (t.practice ? '<p class="trial-practice">' + U.tr("A first test. This one does not count; it shows you how tests work.") + "</p>" : "") +
        (t.howto ? "" : '<p class="game-rules">' + U.t(K.val(t.rules)) + "</p>") +
        (t.twist && TWIST[t.twist] ? '<p class="trial-twist">' + U.tr(TWIST[t.twist]) + "</p>" : "") + // the lamp game's twist (sneak)
        // trial.howto: numbered steps beside a small picture of the game (U.HOWTO_PIC), read before the clock starts (owner, 5 November)
        (t.howto ? '<div class="howto"><p class="howto-h">' + U.tr("How to play") + "</p>" + (U.HOWTO_PIC && U.HOWTO_PIC[kind] ? '<div class="howto-pic" aria-hidden="true">' + U.HOWTO_PIC[kind] + "</div>" : "") +
          "<ol>" + K.val(t.howto).map((s) => "<li>" + U.t(K.val(s)) + "</li>").join("") + "</ol></div>" : "") +
        (typeof t.brief === "function" ? t.brief() : "") +
        (t.stakes ? '<ul class="stakes"><li class="win"><b>' + U.tr("If you succeed") + "</b> " + U.t(K.val(t.stakes[0])) + '</li><li class="lose"><b>' + U.tr("If you fail") + "</b> " + U.t(K.val(t.stakes[1])) + "</li></ul>" : "") +
        (t.attr || t.skill ? '<p class="trial-stats">' + U.tr("Helped by your {what}: {n}. The higher, the easier.", { what: statNames(t), n: power }) + "</p>" : "") +
        '<div class="btnrow"></div>';
      const go = () => begin();
      host.querySelector(".btnrow").appendChild(U.button("cta", U.tr(t.brief ? "Fight" : "Begin"), go));
      // Antardhana (§18.8): once in each act, a stealth test can be skipped: you were simply not there.
      if ((kind === "sneak" || kind === "herd") && K.vanishReady && K.vanishReady() && !t.practice && !K.headless) {
        host.querySelector(".btnrow").appendChild(U.button("ghost", U.tr("Vanish instead (Antardhana)"), () => { K.S.vanishedAct = K.S.act; phase = "play"; finish("win", "You were simply not there. No one can say how."); }));
      }
      U.keys([go]);
    }
    function finish(outcome, summary) {
      if (finished) return;
      if (!host.isConnected) { finished = true; if (stop) stop(); return; } // the scene was left mid-test
      finished = true;
      if (stop) stop();
      wrap.classList.remove("playing");
      const page = wrap.closest(".leaf"); if (page) page.classList.remove("playing");
      // The outcome, large over the scene, while the figures react; then the story page returns.
      if (deep) {
        wrap.classList.add("done");
        const word = outcome === "win" ? "You win" : outcome === "close" ? "So close" : "You lose";
        wrap.appendChild(U.el('<div class="t-result ' + outcome + '"><b>' + U.trSpan(word) + "</b></div>"));
        if (K.Sound) K.Sound.play(outcome === "win" ? "gong" : "drum");
      }
      U.castStance(wrap, outcome === "win" ? "cheer" : "slump", outcome === "win" ? "slump" : "cheer");
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keyup", onKeyUp, true);
      if (K.Sound && outcome !== "win") K.Sound.play("hit");
      if (K.headless) done(outcome, summary);
      else setTimeout(() => { document.body.classList.remove("intest"); done(outcome, summary); }, deep ? 1700 : 700);
    }
    // One action key: Space or Enter (the scene's own keys are paused while a test runs).
    let act = null, actUp = null;
    const onKey = (e) => { if ((e.key === " " || e.key === "Enter") && act) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) act(); } };
    const onKeyUp = (e) => { if ((e.key === " " || e.key === "Enter") && actUp) { e.preventDefault(); e.stopPropagation(); actUp(); } };
    function begin() {
      phase = "play";
      U.keys([]);
      // While it plays, the test fills the page and its play area takes the height that is left.
      wrap.classList.add("playing");
      const page = wrap.closest(".leaf"); if (page) page.classList.add("playing");
      if (K.headless) return auto();
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("keyup", onKeyUp, true);
      stop = play({ host, power, t, finish, cue, onAct: (f, up) => { act = f; actUp = up || null; } });
    }
    // The harness rolls instead of playing: the better your stats, the likelier the win.
    function auto() {
      const p = clamp((t.auto != null ? t.auto : 0.2) + power * 0.055, 0.1, 0.72), r = K.rng();
      finish(r < p ? "win" : r < p + 0.15 && (kind === "aim" || kind === "steady" || kind === "escape") ? "close" : "lose", null);
    }
    intro();
    // A language switch mid-test: the title, and once it is playing, every label it keeps (buttons,
    // score line, help) are translated again in place; the test itself goes on untouched.
    return { draw: () => {
      const name = wrap.querySelector(".t-name"); if (name) name.innerHTML = U.t(K.val(c.t));
      if (phase === "intro") intro(); else U.relabel(wrap);
    } };
  }

  // A press button big enough for a thumb; it also answers the action key.
  function pressButton(label, down, up) {
    const b = U.button("cta trial-press", U.trSpan(label), null);
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); down(); });
    if (up) { b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up); b.addEventListener("pointercancel", up); }
    else b.addEventListener("click", (e) => { if (e.detail === 0) down(); }); // keyboard click on the focused button
    return b;
  }
  // Runs every frame until stopped, or until its test is no longer on screen.
  // Game time stands still while the game is paused (the phone turned sideways, the tab hidden).
  const loop = (fn, el) => { let id, on = true; const t0 = U.clock(); const f = () => { if (!on) return; if (el && !el.isConnected) { on = false; return; } if (!U.paused()) fn((U.clock() - t0) / 1000); id = requestAnimationFrame(f); }; id = requestAnimationFrame(f); return () => { on = false; cancelAnimationFrame(id); }; };

  // The clock of a timed test: the seconds left, large, and a bar that drains, at the top of the
  // stage (in the test's header, above the play). The test sets it from its own game time
  // (U.clock), so it stands still while the game is paused. In the last seconds it turns red, and
  // with motion on its number beats; with calm motion it only counts down. One clock per test:
  // a test that times several things in turn (a question, then the next) sets the same clock again.
  //   const clock = U.countdown(host); clock.set(secondsLeft, totalSeconds); clock.hide();
  U.countdown = function (host) {
    const wrap = host.closest(".trial") || host;
    let el = wrap.querySelector(".t-clock");
    if (!el) {
      el = U.el('<div class="t-clock" role="timer" hidden><b class="t-secs" aria-hidden="true"></b><span class="t-unit" aria-hidden="true">' + U.trSpan("sec") + '</span><span class="t-bar" aria-hidden="true"><i></i></span></div>');
      const head = wrap.querySelector(":scope > .t-head");
      if (head) head.appendChild(el); else wrap.insertBefore(el, wrap.querySelector(":scope > .trial-body"));
    }
    const num = el.querySelector(".t-secs"), bar = el.querySelector(".t-bar i");
    let shown = null;
    return {
      set(left, total) {
        if (!el.isConnected) return;
        left = clamp(left, 0, total);
        el.hidden = false;
        const n = Math.ceil(left);
        if (n !== shown) { shown = n; num.textContent = n; el.setAttribute("aria-label", K.tr("{s} seconds left", { s: n })); }
        bar.style.transform = "scaleX(" + (total > 0 ? left / total : 0).toFixed(4) + ")";
        el.classList.toggle("warn", left <= Math.min(5, total * 0.34));
      },
      hide() { el.hidden = true; shown = null; }
    };
  };

  // Shared with the other kinds of test (ui/play.js, ui/boards.js).
  U.trialFrame = frame; U.pressButton = pressButton; U.loop = loop;
  // The lamp game's twists, said on the card before it starts and under the way while it plays (U.games.sneak).
  const TWIST = {
    dog: "A dog lies by the gate. Move in short bursts: keep going too long and it hears you.",
    lamp: "A lamp on the wall flares up now and then. Keep out of its light when it does; it flickers first.",
    clouds: "The moon comes and goes behind the clouds. When it is out, keep still.",
    turns: "This guard is nervous: he turns back often, with little warning."
  };

  // ---------- Archers with weight (js/ui/puppet-anim.js) ----------
  // On the painting your figure is a live rig: the bow upright in the fist, the string drawn back to
  // the face with an arrow on it, snapping back on release. A teacher watching stands calm and nods.
  // With calm motion U.rig gives null and the figures keep their CSS poses, as before.
  const CALM = { armF: -20, foreF: -40, armB: -10, foreB: -20 };
  const LOOSE = { rot: 1, armF: -84, foreF: -6, armB: -60, foreB: -10, legF: -14, legB: 14, shinB: 6 };
  const hold = (r, p, k, z) => { for (const key in r.t) if (key !== "dx") r.t[key] = p[key] || 0; if (k) r.k = k; if (z != null) r.z = z; };
  const nod = (rigs) => rigs.forEach((r) => r.kick({ head: 160 }));
  function liveCast(host) {
    const wrapEl = host.closest(".trial.immersive"), a = wrapEl && wrapEl.querySelector(".cast .actor.me");
    if (!a) return { me: null, elders: [] };
    const elders = [...wrapEl.querySelectorAll(".cast .actor.foe.elder")].map((e) => U.rig(e.querySelector("svg"), e, "stand")).filter(Boolean);
    elders.forEach((r) => hold(r, CALM, 300, 0.6));
    return { me: U.rig(a.querySelector("svg"), a, "aim"), elders };
  }
  // The verdict: you cheer or slump (a live figure is not posed by the frame), and the teacher nods at a win.
  const ending = (live, finish) => (out, sum) => {
    if (live.me) { live.me.set(out === "win" ? "cheer" : "slump", 360, 0.45); if (out === "win") live.me.kick({ ty: -160 }); }
    if (out === "win") nod(live.elders);
    finish(out, sum);
  };
  // A cane arrow pointing along +x, its head at 0 and its feathers len behind.
  const CANE = (len) => '<path d="M0 0 L' + (-len).toFixed(1) + ' 0" stroke="#24120a" stroke-width="4.4" stroke-linecap="round"/><path d="M0 0 L' + (-len).toFixed(1) + ' 0" stroke="#e6c98c" stroke-width="2.6" stroke-linecap="round"/><path d="M' + (-len).toFixed(1) + ' 0 l-8 -5 l3 5 l-3 5 Z M' + (-len + 6).toFixed(1) + ' 0 l-8 -5 l3 5 l-3 5 Z" fill="#c8402c" stroke="#24120a" stroke-width=".8"/><path d="M0 -3.4 L8 0 L0 3.4 Z" fill="#dcd7c8" stroke="#24120a" stroke-width=".8"/>';
  // What a struck target sheds: sparks from a lamp or a bell, chips of a wooden bird, bits of leaf or
  // fruit; the straw target sheds straw (drawn below); an animal nothing.
  const SHED = { lamp: ["spark", null, true], bell: ["spark"], bird: ["chip"], leaf: ["flake", "#6f8f3a"], fruit: ["flake", "#f0a030"] };

  // ---------- Aim: a target swings; release when it crosses your line ----------
  // trial.shots (3), trial.need (2): hits needed to win; one fewer is "close".
  U.games.aim = function (box, done, c) {
    return frame(box, done, c, "aim", ({ host, power, t, finish: fin, onAct, cue }) => {
      const shots = t.shots || 3, need = t.need || 2;
      const win = clamp(0.085 + power * 0.012 + (t.easy || 0), 0.08, t.practice ? 0.3 : 0.2) * (t.small ? 0.75 : 1); // half-width of the hit zone, as a share of the swing
      let shot = 0, hits = 0, speed = t.speed || 1.6, phase = 0, x = 0, busy = false;
      // An archery duel (trial.returns: wounds you can take): after each of your shots he shoots back,
      // and you press again to duck, once his arrow is in the air and before it arrives.
      let incoming = 0, wounds = 0, inTimer = 0;
      host.innerHTML = '<p class="score" aria-live="polite"></p><div class="range' + (t.dark ? " dark" : t.field ? " field" : "") + '"><div class="zone" style="width:' + win * 90 + '%"></div><div class="line"></div>' +
        '<div class="target"><i class="t-' + (t.icon || "lamp") + '"></i></div><div class="arrow"></div></div><p class="game-note" aria-live="polite"></p><div class="btnrow"></div>';
      const range = host.querySelector(".range"), tgt = host.querySelector(".target"), score = host.querySelector(".score"), note = host.querySelector(".game-note");
      const marks = () => { U.trLabel(score, [["Shot {n} of {m}", { n: Math.min(shot + 1, shots), m: shots }], ["Hits: {h}", { h: hits }]].concat(t.returns ? [["Wounds: {w} of {r}", { w: wounds, r: t.returns }]] : [])); };
      marks();
      // On the painting (immersive): the target hangs by a rope from the branch above and swings;
      // a faint dotted line runs up from your bow to where the arrow will fly; the arrow flies up
      // the painting and sticks, or whips past.
      const painted = !!host.closest(".trial.immersive");
      let P = null;
      if (painted) {
        range.classList.add("painted");
        range.insertAdjacentHTML("beforeend", '<svg class="aimsvg" aria-hidden="true"><line class="rope"/><line class="path"/><circle class="aimpt" r="5"/><g class="tgt"><g class="tgt-art">' + AIM_ART(t.icon) + '</g><g class="held"></g><circle class="tgt-mark" r="4"/></g><g class="stuck"></g><g class="flying"><line class="shaft"/><g class="cane"></g></g><g class="bits"></g></svg>');
        const q = (sel) => range.querySelector(sel);
        P = { rope: q(".rope"), path: q(".path"), pt: q(".aimpt"), tgt: q(".tgt"), art: q(".tgt-art"), mark: q(".tgt-mark"), stuck: q(".stuck"), held: q(".held"), fly: q(".flying"), shaft: q(".shaft"), cane: q(".cane"), bits: q(".bits"), W: 0, H: 0, L: 0, tx: 0, ty: 0, th: 0.6, cx: 0, sw: 0, win };
      }
      // You stand in the lower left, facing right; the target hangs up and to the right of you. The
      // aim runs from your bow hand to the target, and your bow arm turns about the shoulder to follow.
      const meSvg = painted ? host.closest(".trial").querySelector(".cast .actor.me svg") : null;
      const ARM = 52.5; // shoulder to bow hand, in the puppet's own units
      const shoulder = () => {
        if (!meSvg || !meSvg.isConnected) return null;
        const r = meSvg.getBoundingClientRect(), rr = range.getBoundingClientRect(), vb = meSvg.viewBox.baseVal;
        if (!r.height || !vb || !vb.height) return null;
        const k = r.height / vb.height;
        return { x: r.left - rr.left + (58 - vb.x) * k, y: r.top - rr.top + (73 - vb.y) * k, k };
      };
      const handAt = (sh, th) => ({ x: sh.x + ARM * sh.k * Math.cos(th), y: sh.y - ARM * sh.k * Math.sin(th) });
      // Your figure, live: the bow square to the line of the shot at full draw, an arrow on the string;
      // a stone is held cocked behind the head. a: the aim, in degrees above level.
      const live = painted ? liveCast(host) : { me: null, elders: [] }, rig = live.me, throwing = t.verb === "Throw", end = ending(live, fin);
      const aimPose = (a) => throwing ? { rot: -a * 0.08, head: -a * 0.35, armF: -90 - a, foreF: 0, armB: 140, foreB: 40, legF: -14, legB: 14, shinB: 6 }
        : { rot: -a * 0.08, head: -a * 0.35, armF: -90 - a, foreF: 0, armB: -92 - a, foreB: 150, legF: -14, legB: 14, shinB: 6, draw: 1, tilt: -a };
      const QUIVER = throwing ? { rot: 4, head: 10, armF: -60, foreF: -10, armB: 20, foreB: -50, legF: -14, legB: 14, shinB: 6 } // a hand to the pouch of stones
        : { rot: -2, head: 8, armF: -60, foreF: -10, armB: -168, foreB: -30, legF: -14, legB: 14, shinB: 6 }; // a hand over the shoulder to the quiver
      // A hit stays in the target where it struck, at the angle it came in, and swings with it; the
      // target jolts and sheds a little of what it is made of, and the teacher nods.
      const stick = (x, y, dirA, k) => {
        const a = (P.da || 0) * Math.PI / 180, dx = x - P.tx, dy = y - P.ty; // into the target's own frame (it is drawn turned by -da)
        const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
        P.held.insertAdjacentHTML("beforeend", '<g data-d="' + (P.dir || 1) + '"><g transform="translate(' + lx.toFixed(1) + " " + ly.toFixed(1) + ") rotate(" + (dirA * 180 / Math.PI + (P.da || 0)).toFixed(1) + ')">' + CANE(28 * k) + "</g></g>");
        P.jolt = U.motion() ? 14 * (Math.cos(dirA) >= 0 ? 1 : -1) : 0; P.j0 = null; P.heldDir = null;
        nod(live.elders);
        if (!U.motion() || RUNNERS.has(t.icon)) return;
        const sh = SHED[t.icon];
        if (sh) return U.flingBits(range, sh[0], { x, y }, 8, 14, sh[1], sh[2]);
        for (let i = 0; i < 10; i++) { // straw
          const b = document.createElementNS("http://www.w3.org/2000/svg", "path"), an = Math.random() * 6.28, l = 6 + Math.random() * 8;
          b.setAttribute("d", "M0 0 L" + (Math.cos(an) * l).toFixed(1) + " " + (Math.sin(an) * l).toFixed(1)); b.setAttribute("stroke", i % 2 ? "#d9b26a" : "#a87a3a");
          P.bits.appendChild(b);
          const ex = x + (Math.random() - 0.3) * 70, ey = y + 20 + Math.random() * 60;
          b.animate([{ transform: "translate(" + x + "px," + y + "px) rotate(0deg)", opacity: 1 }, { transform: "translate(" + ex + "px," + ey + "px) rotate(" + (Math.random() * 400 - 200) + "deg)", opacity: 0 }], { duration: 700 + Math.random() * 400, easing: "cubic-bezier(.2,.6,.4,1)" }).onfinish = () => b.remove();
        }
      };
      // The shot flies in a low arc from your hand to the target's height, crossing it exactly where
      // the hit is judged (aimOff, as a share of the swing): a hit sticks there, in the target; a miss
      // goes on past it, along the same line, out of the picture. (The target holds still meanwhile.)
      const shoot = (hit, aimOff) => {
        if (!P) return;
        const sh = shoulder(), h0 = sh ? handAt(sh, P.th) : { x: P.cx, y: P.H };
        const xB = P.cx + (aimOff || 0) * P.sw, yB = P.ay;
        range.dataset.shot = [xB.toFixed(1), P.ax.toFixed(1), (P.zone || 0).toFixed(1), hit ? 1 : 0].join(",");
        const dist = Math.hypot(xB - h0.x, yB - h0.y), lift = dist * 0.12;
        const at = (f) => ({ x: h0.x + (xB - h0.x) * f, y: h0.y + (yB - h0.y) * f - lift * 4 * f * (1 - f) });
        const t0 = performance.now(), dur = U.motion() ? 300 : 1, on = U.motion() ? 260 : 0, v = dist / Math.max(1, dur);
        P.fly.style.opacity = "1";
        // A thrown stone is a stone, not an arrow; a hit knocks the fruit down.
        const stone = t.verb === "Throw", ks = sh ? sh.k : 1;
        P.fly.classList.toggle("stone", stone);
        P.cane.innerHTML = "";
        let dir = [xB - h0.x, yB - h0.y], end = null;
        const draw = (p, f) => {
          if (stone) { P.shaft.setAttribute("x1", p.x); P.shaft.setAttribute("y1", p.y); P.shaft.setAttribute("x2", p.x + 0.01); P.shaft.setAttribute("y2", p.y); return; }
          // A cane arrow you can follow; it shrinks as it flies away from you.
          P.cane.innerHTML = CANE(44 * ks * (1 - 0.35 * Math.min(1, f)));
          P.cane.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ") rotate(" + (Math.atan2(dir[1], dir[0]) * 180 / Math.PI).toFixed(1) + ")");
        };
        const step = () => {
          const ms = performance.now() - t0, f = Math.min(1, ms / dur);
          if (f < 1 || !end) {
            const p = at(f), q = at(Math.max(0, f - 0.04));
            if (f > 0) { const dl = Math.hypot(p.x - q.x, p.y - q.y) || 1; dir = [(p.x - q.x) / dl, (p.y - q.y) / dl]; }
            draw(p, f);
            if (f < 1) return requestAnimationFrame(step);
            end = p;
            if (hit && stone) {
              P.fly.style.opacity = "0";
              P.stuck.innerHTML = '<circle class="pop" cx="' + xB.toFixed(1) + '" cy="' + yB.toFixed(1) + '" r="6"/>';
              const d0 = performance.now();
              const fall = () => { const k = Math.min(1, (performance.now() - d0) / 520); P.drop = 90 * k * k; P.tgt.style.opacity = String(1 - k * 0.6); if (k < 1 && P.drop != null) requestAnimationFrame(fall); };
              requestAnimationFrame(fall);
              return;
            }
            if (hit) {
              P.fly.style.opacity = "0";
              stick(xB, yB, Math.atan2(dir[1], dir[0]), ks);
              return;
            }
          }
          // A miss: on past the target, along the line it came in on.
          const k = ms - dur;
          if (k >= on) { P.fly.style.opacity = "0"; return; }
          draw({ x: end.x + dir[0] * v * k, y: end.y + dir[1] * v * k }, 1);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      // Chance in every shot: the aim wavers (an unsteady hand), and each arrow drifts a little in
      // flight (wind, a slipped release). A better archer wavers and drifts less.
      const sway = clamp(0.05 - power * 0.004, 0.02, 0.05), drift = clamp(0.06 - power * 0.004, 0.03, 0.06);
      let wob = 0;
      const gauss = () => { let u = 0; for (let i = 0; i < 3; i++) u += K.rng(); return (u - 1.5) / 0.5; };
      const ducked = (ok, msg) => {
        clearTimeout(inTimer); incoming = 0; range.classList.remove("incoming");
        if (!ok) wounds++;
        note.textContent = K.tr(msg);
        cue(ok ? "good" : "bad"); if (K.Sound) K.Sound.play(ok ? "quill" : "hit");
        marks();
        if (wounds >= t.returns) return setTimeout(() => end("lose", ["His arrows found you {w} times.", { w: wounds }]), 500);
        setTimeout(() => { busy = false; note.textContent = ""; }, 600);
      };
      const comeBack = () => {
        incoming = U.clock(); range.classList.add("incoming");
        note.textContent = K.tr("He shoots back. Duck!");
        if (K.Sound) K.Sound.play("drum");
        inTimer = setTimeout(() => ducked(false, "Too late. His arrow finds you."), 1000);
      };
      const release = () => {
        if (incoming) { const dt = U.clock() - incoming; return ducked(dt >= 250, dt >= 250 ? "You duck under it." : "Too soon. His arrow finds you."); }
        if (busy || (P && !P.sw)) return; // not before the target is on the painting
        busy = true;
        const err = gauss() * drift;
        const off = x + (P ? P.xo || 0 : 0) - wob - err;
        const wz = P ? P.win : win; // on the painting: the hit zone the target is drawn to fill
        const hit = Math.abs(off) <= wz;
        if (hit) hits++;
        shoot(hit, wob + err);
        // The string snaps back and the bow arm kicks; a thrown stone: the arm whips through.
        if (rig) {
          if (throwing) { hold(rig, { rot: 10, head: -6, armF: -40, foreF: -20, armB: -90 - P.th * 57.3, foreB: -10, legF: -24, shinF: 10, legB: 20, shinB: 6 }, 520, 0.5); rig.kick({ armB: -400, rot: 30 }); }
          else { rig.t.draw = 0; rig.kick({ rot: -40, armB: -260, armF: 60, head: -40 }); }
        }
        if (!hit && Math.abs(x + (P ? P.xo || 0 : 0) - wob) <= wz) note.dataset.gust = "1"; else delete note.dataset.gust;
        cue("act"); setTimeout(() => cue(hit ? "good" : "bad"), 260);
        range.classList.remove("hit", "miss"); void range.offsetWidth; range.classList.add(hit ? "hit" : "miss");
        if (K.Sound) K.Sound.play(hit ? "choose" : "quill");
        const touched = !hit && P && P.marked && Math.abs(off) * P.sw <= P.vis; // struck the target, but not its mark
        note.textContent = K.tr(hit ? "A hit!" : note.dataset.gust ? "The wind took it." : touched ? "It struck, but not the mark." : Math.abs(off) <= wz * 1.8 ? "So close." : "A miss.");
        shot++;
        marks();
        const left = shots - shot;
        if (hits >= need || hits + left < need - 1 || left === 0) {
          const out = hits >= need ? "win" : need > 1 && hits === need - 1 ? "close" : "lose";
          return setTimeout(() => end(out, ["You hit {h} of {n}.", { h: hits, n: shot }]), 500);
        }
        // To the quiver, and the next arrow onto the string, within the pause before the next shot.
        if (rig) { setTimeout(() => hold(rig, QUIVER, 700, 0.55), 120); setTimeout(() => hold(rig, aimPose(P.th * 180 / Math.PI), 420, 0.62), 380); }
        setTimeout(() => { speed *= 1.15; note.textContent = ""; range.classList.remove("hit", "miss"); if (P) { P.stuck.innerHTML = ""; P.drop = 0; P.tgt.style.opacity = ""; } if (t.returns && host.isConnected) comeBack(); else busy = false; }, 700);
      };
      host.querySelector(".btnrow").appendChild(pressButton(t.verb || "Release", release));
      onAct(release);
      let last = 0;
      return loop((s) => {
        const dt = s - last; last = s;
        if (!busy) phase += dt * speed;
        // A pendulum with a little wind in it: never quite the same swing twice.
        x = Math.sin(phase * 2.2) * (0.86 + 0.1 * Math.sin(phase * 0.7));
        if (!busy && P) wob = sway * (Math.sin(s * 3.1) * 0.7 + Math.sin(s * 5.7 + 1) * 0.3);
        tgt.style.left = (50 + x * 45) + "%";
        // Blindfolded: the target shows itself only at the ends of its swing, where the bell rings.
        if (t.blind) tgt.style.opacity = String(clamp((Math.abs(x) - 0.62) / 0.22, 0, 1));
        if (P) {
          const W = range.clientWidth, H = range.clientHeight;
          P.W = W; P.H = H; P.L = Math.max(80, H * 0.6);
          // The rope hangs from a branch to the right of you; the target swings about it.
          const narrow = W < 600, cx = W * (narrow ? 0.72 : 0.64), sw = Math.min(W * (narrow ? 0.22 : 0.3), P.L * 0.85), tx = cx + x * sw, dx = tx - cx;
          P.cx = cx; P.sw = sw;
          // Animals run across the ground; everything else swings on its rope.
          const runs = RUNNERS.has(t.icon);
          // The target is drawn exactly as wide as its hit zone (never so small it cannot be seen): what
          // you see touched is what counts.
          // A target too small to see at its true size (a hard test on a small screen) is drawn big enough
          // to see, with a small gold mark that is the whole hit zone: hit the mark, not just the target.
          const half = ART_HALF[t.icon] || 30, want = win * sw, marked = want - 2 < 14;
          const vis = marked ? Math.max(22, Math.min(half * 1.35, 30)) : Math.min(want - 2, half * 3), sc = vis / half;
          const zone = Math.min(want, half * 3 + 2);
          // A swinging target hangs above your head, never across your raised bow: on a tall phone the
          // rope is shortened to the room above you (measured once per size of the range).
          if (P.roomFor !== W + "x" + H) {
            P.roomFor = W + "x" + H;
            const me = host.querySelector(".cast .actor.me svg");
            P.room = me ? me.getBoundingClientRect().top - range.getBoundingClientRect().top - me.getBoundingClientRect().height * 0.22 : Infinity; // the raised bow reaches above the head
          }
          if (!runs && P.room > 0 && isFinite(P.room)) P.L = Math.max(80, Math.min(P.L, P.room - vis - 18));
          P.win = zone / sw; P.zone = zone; P.vis = vis + 2; P.marked = marked;
          P.mark.style.display = marked ? "" : "none";
          if (marked) P.mark.setAttribute("r", Math.max(3, zone - 2).toFixed(1));
          const ty = runs ? P.L : Math.sqrt(Math.max(P.L * P.L - dx * dx, P.L * P.L * 0.25)), ang = runs ? 0 : Math.atan2(dx, ty) * 180 / Math.PI;
          P.tx = tx; P.ty = ty; P.ang = runs ? 0 : ang;
          // A hit jolts the target on its rope (a runner flinches), settling within a second or so. Only
          // the drawing turns: where the shot is judged does not move.
          if (P.jolt && P.j0 == null) P.j0 = s;
          const jt = P.jolt ? s - P.j0 : 0, jx = P.jolt ? P.jolt * Math.exp(-jt * 3.2) * Math.sin(jt * 15) * (runs ? 0.4 : 1) : 0;
          if (jt > 3) P.jolt = 0;
          P.da = ang + jx;
          // The point aimed at (the flame of a lamp), on the swinging target, in screen space.
          { const [ux, uy] = AIM_AT[t.icon] || [0, 0], a = -ang * Math.PI / 180, lx = ux * sc, ly = uy * sc;
            P.ax = tx + lx * Math.cos(a) - ly * Math.sin(a); P.ay = ty + lx * Math.sin(a) + ly * Math.cos(a); P.xo = (P.ax - tx) / sw;
            P.mark.setAttribute("cx", lx.toFixed(1)); P.mark.setAttribute("cy", ly.toFixed(1)); }
          if (runs) {
            P.rope.style.display = "none"; P.dir = Math.cos(phase * 2.2) >= 0 ? 1 : -1;
            // Arrows in a runner turn round with it.
            if (P.heldDir !== P.dir) { P.heldDir = P.dir; for (const g of P.held.children) g.setAttribute("transform", "scale(" + P.dir * +g.dataset.d + " 1)"); }
          }
          else { P.rope.setAttribute("x1", cx); P.rope.setAttribute("y1", -10); P.rope.setAttribute("x2", tx); P.rope.setAttribute("y2", ty - 30); }
          P.tgt.setAttribute("transform", "translate(" + tx.toFixed(1) + " " + (ty + (P.drop || 0)).toFixed(1) + ") rotate(" + (-P.da).toFixed(1) + ")");
          P.art.setAttribute("transform", "scale(" + ((runs ? P.dir : 1) * sc).toFixed(3) + " " + sc.toFixed(3) + ")");
          const ax = cx + wob * sw, ay = P.L;
          const sh = shoulder();
          if (sh) {
            // The bow arm points along the aim: up and to the right, between a low and a steep shot.
            const th = clamp(Math.atan2(sh.y - ay, ax - sh.x), 0.12, 1.35);
            P.th = th;
            meSvg.style.setProperty("--aim", (th * 180 / Math.PI).toFixed(1) + "deg");
            // A live figure holds the aim, its arms trembling a little with the waver.
            if (rig && !busy) { const pz = aimPose(th * 180 / Math.PI); pz.armF += wob * 90; pz.armB += wob * 60; hold(rig, pz, 420, 0.62); }
            const hd = handAt(sh, th);
            P.path.setAttribute("x1", hd.x); P.path.setAttribute("y1", hd.y);
          } else { P.path.setAttribute("x1", cx); P.path.setAttribute("y1", H); }
          P.path.setAttribute("x2", ax); P.path.setAttribute("y2", ay + 8);
          P.pt.setAttribute("cx", ax); P.pt.setAttribute("cy", ay);
          if (t.blind) P.tgt.style.opacity = tgt.style.opacity;
        }
      }, host);
    });
  };

  // ---------- Push: a ring closes on your opponent; push as it meets him ----------
  // Three good pushes win; three bad ones lose.
  // The one timing test wears three faces (trial.face; the figures and props are drawn by
  // U.castBand): Kripa's sword drill, the practice post, the village gate. Each acts out what it is
  // with live figures (puppet-anim.js); the ring, its timing and the scoring are the same for all.
  // Without a face it is a shoving match, and the figures take the plain poses as before.
  function pushFace(face, wrap) {
    const cast = wrap && wrap.querySelector(".cast.face-" + face);
    if (!cast) return null;
    const PF = { // the faces' own poses, beside the rig's (the drill guard, the shoulder on the gate)
      onGuard: { rot: -4, armF: -64, foreF: -58, armB: -20, foreB: -40, legF: -16, legB: 16, shinB: 8, item: 180 },
      parry: { rot: -9, ty: 3, head: 4, armF: -118, foreF: -64, armB: -30, foreB: -40, legF: -22, shinF: 10, legB: 22, shinB: 10, item: 180 },
      reach: { rot: 7, tx: 4, armF: -98, foreF: -40, armB: -20, foreB: -30, legF: -24, legB: 20, shinB: 6, item: 180 },
      ouch: { rot: 12, ty: 3, head: 22, armF: 30, foreF: -60, armB: -40, foreB: -80, legF: -6, legB: 14, shinB: 12, item: 140 },
      maceUp: { rot: -14, tx: -6, head: -8, armF: -190, foreF: -10, armB: -170, foreB: -20, legF: -20, legB: 20, shinB: 10, item: 180 },
      maceDown: { rot: 18, tx: 8, head: 10, armF: -70, foreF: -6, armB: -60, foreB: -10, legF: -32, shinF: 14, legB: 26, shinB: 6, item: 180 },
      shoulder: { rot: 20, ty: 4, head: -6, armF: -78, foreF: -26, armB: -60, foreB: -40, legF: -30, shinF: 22, legB: 30, shinB: 8 },
      shoved: { rot: -10, head: -14, armF: -40, foreF: -60, armB: -20, foreB: -50, legF: -6, legB: 22, shinB: 14 },
      charge: { rot: 18, head: -4, armF: -60, foreF: -30, armB: -20, foreB: -40, legF: -36, shinF: 30, legB: 30, shinB: 20, item: 180 },
      reel: { rot: -16, head: -20, armF: -150, foreF: -20, armB: -120, foreB: -10, legF: 10, legB: -10, shinB: 20, item: 180 }
    };
    const P = U.RIG_POSES || {};
    for (const k in PF) if (!P[k]) P[k] = PF[k];
    const JK = ["rot", "tx", "ty", "head", "armF", "foreF", "armB", "foreB", "legF", "shinF", "legB", "shinB", "item", "draw", "tilt"];
    const mix = (a, b, f) => { const o = {}; for (const k of JK) o[k] = (a[k] || 0) + ((b[k] || 0) - (a[k] || 0)) * f; return o; };
    const aim = (r, p, k, z) => { if (!r) return; for (const key of JK) r.t[key] = p[key] || 0; if (k) r.k = k; if (z != null) r.z = z; r.kick({}); };
    const moving = !!(U.motion && U.motion() && U.rig);
    const meEl = cast.querySelector(".actor.me"), foeEls = [...cast.querySelectorAll(".actor.foe")], prop = cast.querySelector(".actor.prop");
    const rig = (el, base) => (moving && el ? U.rig(el.querySelector("svg.pp"), el, base) : null);
    const me = rig(meEl, face === "gate" ? "shoulder" : "onGuard");
    const foes = foeEls.map((el) => rig(el, "ready"));
    const foe = foes[0];
    // The study's figures stand 275 px tall; distances there are scaled to the figures here.
    const u = () => Math.max(0.3, (meEl.querySelector("svg").getBoundingClientRect().height || 150) / 275);
    const at = (el, fx, fy) => { const r = el.getBoundingClientRect(), c = cast.getBoundingClientRect(); return { x: r.left - c.left + r.width * fx, y: r.top - c.top + r.height * fy }; };
    const chips = (p, n, colour, up) => U.flingBits(cast, "chip", p, n, 10, colour, up);
    const jolt = () => { if (!moving) return; wrap.classList.remove("jolt"); void wrap.offsetWidth; wrap.classList.add("jolt"); };
    const flash = (el) => { el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 110); };
    const freeze = (ms) => { if (moving) U.rigFreeze(ms); };
    const wait = U.wait;
    const S = { score: 0, shove: 0, shoveV: 0, shake: 0, shakeV: 0, split: 0, splitting: false, open: 0, openV: 0, given: 0, busy: false, ended: false };
    const to = (r, p, k, z) => { if (!S.ended) aim(r, p, k, z); }; // once it is over, the end poses hold
    const dx = (r, v) => { if (r && !S.ended) r.t.dx = v; };

    // Ground given and taken, the post shaking and splitting, the gate giving: springs, every frame
    // until the test leaves the screen.
    let last = 0;
    const tick = (nowMs) => {
      if (!cast.isConnected) return;
      const dt = Math.min(0.033, last ? (nowMs - last) / 1000 : 0.016); last = nowMs;
      const k = u();
      if (face === "drill") {
        // Ground given and taken, but never so much that a figure is pushed off the screen.
        let target = S.score * 24 * k;
        const ends = [meEl, ...foeEls].map((el) => el.getBoundingClientRect());
        const lo = Math.min(...ends.map((q) => q.left)) - S.shove, hi = Math.max(...ends.map((q) => q.right)) - S.shove;
        target = clamp(target, Math.min(0, 10 - lo), Math.max(0, innerWidth - 10 - hi));
        if (moving) { S.shoveV += (-90 * (S.shove - target) - 2 * 0.55 * Math.sqrt(90) * S.shoveV) * dt; S.shove += S.shoveV * dt; } else S.shove = target;
        cast.style.setProperty("--shove", S.shove.toFixed(1) + "px");
      }
      if (face === "post" && prop) {
        const svg = prop.querySelector("svg");
        if (moving) { S.shakeV += (-900 * S.shake - 2 * 0.12 * 30 * S.shakeV) * dt; S.shake += S.shakeV * dt; } else S.shake = 0;
        svg.style.transform = "rotate(" + (S.shake * 0.25).toFixed(2) + "deg)"; // a clean blow rocks it about 2 degrees
        if (S.splitting && S.split < 1) {
          S.split = moving ? Math.min(1, S.split + dt * 2.6) : 1;
          const e = S.split * S.split; // the halves fall away slowly, then all at once
          svg.querySelector(".pl").setAttribute("transform", "rotate(" + (-14 * e).toFixed(2) + " 16 200)");
          svg.querySelector(".pr").setAttribute("transform", "rotate(" + (16 * e).toFixed(2) + " 46 200)");
          svg.querySelector(".ropes").setAttribute("opacity", (1 - S.split).toFixed(2)); // the ropes snap
          svg.querySelector(".cracks").setAttribute("opacity", (1 - S.split).toFixed(2));
        }
      }
      if (face === "gate" && prop) {
        const target = clamp(S.given * 0.08, 0, 0.3);
        if (moving) { S.openV += (-400 * (S.open - target) - 2 * 0.25 * 20 * S.openV) * dt; S.open += S.openV * dt; } else S.open = target;
        const o = Math.max(0, S.open);
        prop.querySelector(".leaf").setAttribute("transform", "translate(16 0) scale(" + (1 - o * 0.55).toFixed(3) + " 1) translate(-16 0)");
        meEl.style.setProperty("--shove", (-o * 137 * k).toFixed(1) + "px"); // the gate gives and you are pushed back
      }
      requestAnimationFrame(tick);
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(tick);

    return {
      // The tell, as the ring closes (p: 0 at the start, 0.85 on the mark): the blow gathers and is at
      // its height on the mark. Kripa draws back his sword; you raise the mace; the raiders gather.
      tell(p) {
        if (S.busy || !moving) return;
        const f = clamp((p - 0.35) / 0.5, 0, 1), e = f * f * (3 - 2 * f), k = u();
        if (face === "drill") to(foe, mix(P.ready, P.windup, e), 700, 0.62);
        if (face === "post") to(me, mix(P.onGuard, P.maceUp, e), 700, 0.62);
        if (face === "gate") foes.forEach((r, i) => { dx(r, -(i ? 80 : 60) * e * k); to(r, mix(P.ready, P.charge, e * (i ? 0.9 : 1)), 700, 0.6); });
      },
      // A press (or the ring running out), acted out. how: "ok", "soon" or "late".
      async hit(ok, how, good, bad) {
        S.score = good - bad; if (!ok) S.given = bad;
        S.busy = true;
        const k = u();
        if (face === "drill") {
          if (how === "ok") { // blade on blade: chips fly and he is knocked back a step
            to(me, P.parry, 1600, 0.5); to(foe, P.strike, 1900, 0.5); dx(foe, -30 * k); await wait(60);
            freeze(60); const p = at(meEl.querySelector(".foreF") || meEl, 0.5, 0); chips({ x: p.x + 14 * k, y: p.y - 10 * k }, 10, "#c9a66b", true);
            if (foe) foe.kick({ rot: -200, armF: -300, dx: 160 * k }); if (me) me.kick({ dx: -60 * k });
            await wait(260);
          } else if (how === "soon") { // you guard too early: he pulls the cut and taps you under it
            to(me, P.parry, 1600, 0.5); await wait(90);
            to(foe, mix(P.ready, P.windup, 0.3), 800, 0.6); await wait(140);
            to(foe, P.reach, 1800, 0.5); dx(foe, -40 * k); await wait(70);
            freeze(45); flash(meEl);
            to(me, P.ouch, 900, 0.45); if (me) me.kick({ dx: -120 * k }); await wait(260);
          } else { // too late: the wood lands
            to(foe, P.strike, 1900, 0.5); dx(foe, -40 * k); await wait(60);
            freeze(60); flash(meEl); jolt();
            to(me, P.ouch, 900, 0.4); if (me) me.kick({ dx: -200 * k, rot: 200 });
            await wait(300);
          }
          dx(foe, 0); to(foe, P.ready, 480, 0.5); to(me, P.onGuard, 480, 0.55);
        } else if (face === "post") {
          to(me, P.maceDown, 2000, 0.5); dx(me, 20 * k); await wait(70);
          freeze(60);
          const hp = prop ? at(prop, 0.4, 0.45) : { x: 0, y: 0 };
          if (ok) { // a clean blow cracks the post and shakes it; the third splits it
            chips(hp, 12, "#c9a66b", true); jolt(); S.shakeV += 260;
            const c = prop && prop.querySelector(".c" + good); if (c) c.setAttribute("opacity", 1);
            if (good >= 3) S.splitting = true;
          } else { chips(hp, 4, "#8a5a2c", false); S.shakeV += 90; if (me) me.kick({ rot: -260, armF: 300, dx: -160 * k }); } // it glances off
          await wait(220); dx(me, 0); to(me, P.maceUp, 600, 0.55); await wait(260); to(me, P.onGuard, 480, 0.55);
        } else if (face === "gate") {
          foes.forEach((r, i) => { to(r, P.charge, 900, 0.5); dx(r, -(i ? 150 : 110) * k); });
          if (ok || how === "soon") to(me, P.shoulder, 1400, 0.5);
          await wait(110);
          freeze(60); jolt();
          if (prop) chips(at(prop, 0.7, 0.45), ok ? 10 : 6, "#8a5a2c", true);
          if (ok) { // held: they bounce off the planks
            S.openV -= 1.5; if (me) me.kick({ dx: -40 * k });
            foes.forEach((r, i) => { to(r, P.reel, 900, 0.4); dx(r, -(i ? 70 : 40) * k); });
          } else { // given: the gate bangs open and you are shoved back
            S.openV += 6; to(me, P.shoved, 900, 0.4); if (me) me.kick({ dx: -260 * k }); flash(meEl);
          }
          await wait(320);
          foes.forEach((r) => { dx(r, 0); to(r, P.ready, 420, 0.55); }); to(me, P.shoulder, 480, 0.55);
        }
        S.busy = false;
      },
      // The end: you cheer or sag; Kripa lowers his sword or stays ready; the raiders fall back or crow.
      end(win) {
        S.busy = true; S.ended = true;
        aim(me, win ? P.cheer : P.slump, 520, 0.45); if (me) me.t.dx = 0;
        if (face === "drill") { aim(foe, win ? P.stand : P.ready, 480, 0.5); if (foe) foe.t.dx = 0; }
        if (face === "gate") foes.forEach((r) => { aim(r, win ? P.slump : P.cheer, 480, 0.5); if (r) r.t.dx = win ? 40 * u() : 0; });
      },
      live: !!me
    };
  }

  U.games.push = function (box, done, c) {
    return frame(box, done, c, "push", ({ host, power, t, finish, onAct, cue }) => {
      const tol = clamp(0.035 + power * 0.007, 0.03, 0.08); // how close to the mark counts, as a share of the ring's travel
      let good = 0, bad = 0, cycle = 0, period = t.period || 1.05, start = 0, now = 0, wait = false;
      const foe = K.tr(t.foe || "your opponent");
      host.innerHTML = '<p class="score" aria-live="polite"></p><div class="pushpit"><div class="balance"><i></i></div><div class="ringbox"><div class="mark"></div><div class="ring"></div><span class="who">' + U.esc(foe) + '</span></div></div><p class="game-note" aria-live="polite"></p><div class="btnrow"></div>';
      const ring = host.querySelector(".ring"), bal = host.querySelector(".balance i"), score = host.querySelector(".score"), note = host.querySelector(".game-note");
      // On the painting, the pushes move the two wrestlers across the ground; a test with a face
      // acts itself out instead (pushFace).
      const wrapEl = host.closest(".trial");
      const fx = t.face ? pushFace(t.face, wrapEl) : null;
      // A mace duel (trial.feints: how often): some swings are feints, the ring burning red; let them pass.
      let feint = false;
      const show = () => { U.trLabel(score, t.tally || "Good pushes: {g} of 3 · Slips: {b} of 3", { g: good, b: bad, r: 3 - bad }); bal.style.left = (50 + (good - bad) * 15) + "%"; if (wrapEl && !fx) wrapEl.style.setProperty("--shove", (good - bad) * 7 + "vw"); };
      show();
      const MARK = 0.3; // the ring meets the mark at 30% of its starting size
      const push = () => {
        if (wait) return;
        if (feint) return resolve(false, t.bit || "A feint, and you bit.", "soon");
        const p = clamp((now - start) / period, 0, 1), size = 1 - p * (1 - MARK) / 0.85;
        const ok = Math.abs(size - MARK) <= tol;
        resolve(ok, ok ? t.good || "He gives ground!" : size > MARK ? t.soon || "Too soon. He braces." : t.late || "Too late. He shoves back.", ok ? "ok" : size > MARK ? "soon" : "late");
      };
      function resolve(ok, msg, how) {
        wait = true;
        ok ? good++ : bad++;
        if (fx && fx.live) fx.hit(ok, how, good, bad);
        else { if (fx) fx.hit(ok, how, good, bad); cue("act"); setTimeout(() => cue(ok ? "good" : "bad"), 200); }
        note.textContent = K.tr(msg);
        host.querySelector(".pushpit").classList.remove("good", "bad"); void host.offsetWidth; host.querySelector(".pushpit").classList.add(ok ? "good" : "bad");
        if (K.Sound) K.Sound.play(ok ? "hit" : "quill");
        show();
        if (good >= 3 || bad >= 3) return setTimeout(() => { if (fx) fx.end(good >= 3); finish(good >= 3 ? "win" : "lose", ["Good pushes {g}, slips {b}.", { g: good, b: bad }]); }, 450);
        next(650);
      }
      const next = (ms) => setTimeout(() => { wait = false; cycle++; period = Math.max(0.62, period * 0.9); start = now; note.textContent = ""; feint = !!t.feints && K.rng() < t.feints; ring.classList.toggle("feint", feint); }, ms);
      // A feint let pass: nothing lost, and a breath to the good.
      const read = () => { wait = true; note.textContent = K.tr(t.read || "You read the feint and let it pass."); ring.classList.remove("feint"); next(500); };
      host.querySelector(".btnrow").appendChild(pressButton(t.verb || "Push", push));
      onAct(push);
      return loop((s) => {
        now = s;
        if (wait) return;
        const p = (now - start) / period;
        if (p > 1) return feint ? read() : resolve(false, t.late || "Too late. He shoves back.", "late");
        const size = Math.max(0.12, 1 - p * (1 - MARK) / 0.85);
        ring.style.transform = "translate(-50%, -50%) scale(" + size + ")";
        if (fx) fx.tell(p);
      }, host);
    });
  };

  // ---------- Steady: keep your hand over the horse's mood, by holding and letting go ----------
  // The horse, cut from leather like the puppets: body, neck and head (the head is the target, at the
  // horse's front, so the figure is drawn with its head over x = 0), four legs, mane and tail.
  const HORSE = '<svg viewBox="-34 -78 150 98"><g class="h-all">' +
    '<path class="h-tail" d="M96 -36 Q114 -30 110 -6 Q104 -20 94 -26 Z" fill="#3a2214" stroke="#1d0f08" stroke-width="1.8"/>' +
    '<g class="h-legB"><path d="M84 -18 L88 14 L82 15 L76 -14 Z M28 -16 L26 14 L20 15 L20 -14 Z" fill="#7a4626" stroke="#1d0f08" stroke-width="1.8"/></g>' +
    '<path class="h-body" d="M18 -40 Q50 -50 92 -40 Q100 -26 90 -14 Q54 -8 24 -14 Q12 -24 18 -40 Z" fill="#a8622f" stroke="#1d0f08" stroke-width="2"/>' +
    '<path d="M28 -33.6 Q58 -26 88 -33.6 M30 -21 Q56 -16 84 -21" fill="none" stroke="#fff3d0" stroke-opacity=".72" stroke-width="2" stroke-dasharray="0 4.4" stroke-linecap="round"/>' +
    '<path d="M24 -38 Q60 -30 92 -38" fill="none" stroke="#e2b55a" stroke-width="2.2"/>' +
    '<g class="h-legF"><path d="M88 -18 L94 14 L88 15 L82 -16 Z M24 -18 L18 14 L12 15 L14 -16 Z" fill="#a8622f" stroke="#1d0f08" stroke-width="1.8"/></g>' +
    '<g class="h-neck"><path d="M24 -36 Q10 -58 -2 -68 L-16 -62 Q-6 -46 10 -26 Z" fill="#a8622f" stroke="#1d0f08" stroke-width="2"/>' +
    '<path d="M22 -40 Q10 -58 0 -70 Q8 -56 18 -36 Z" fill="#3a2214"/>' +
    '<path class="h-head" d="M-2 -70 Q-14 -76 -28 -58 Q-32 -50 -26 -48 L-16 -52 Q-8 -54 -4 -60 Z" fill="#a8622f" stroke="#1d0f08" stroke-width="2"/>' +
    '<circle cx="-12" cy="-63" r="1.8" fill="#1d0f08"/><path d="M-4 -72 L0 -80 L2 -70 Z" fill="#a8622f" stroke="#1d0f08" stroke-width="1.5"/>' +
    '<path d="M-26 -52 Q-14 -58 -4 -64" fill="none" stroke="#b2432a" stroke-width="1.6"/></g>' +
    '<path class="h-rod" d="M56 -12 L56 30" stroke="#1d0f08" stroke-width="1" opacity="0.5"/></g></svg>';
  U.games.steady = function (box, done, c) {
    return frame(box, done, c, "steady", ({ host, power, t, finish, onAct, cue }) => {
      const band = clamp(0.11 + power * 0.015, 0.1, 0.2), LIMIT = t.secs || 15;
      let pos = 0.5, vel = 0, holding = false, mood = 0.5, moodV = 0, calm = 0, last = 0;
      host.innerHTML = '<p class="score" aria-live="polite"></p><div class="steady"><div class="mood" style="width:' + band * 100 + '%"></div><div class="hand"></div></div><div class="calmbar"><i></i></div><p class="game-note">' + U.trSpan(t.help || "Hold to move your hand right; let go and it drifts back. Keep it over the glow.") + '</p><div class="btnrow"></div>';
      const moodEl = host.querySelector(".mood"), hand = host.querySelector(".hand"), bar = host.querySelector(".calmbar i"), score = host.querySelector(".score"), clock = U.countdown(host);
      // A frightened horse (trial.horse): a leather puppet horse instead of the glow. Its head is
      // where your hand must be; it tosses its head and rears when frightened, lowers it as it calms.
      let horse = null;
      if (t.horse) {
        host.querySelector(".steady").classList.add("with-horse");
        horse = U.el('<div class="horse" aria-hidden="true">' + HORSE + "</div>");
        host.querySelector(".steady").insertBefore(horse, hand);
      }
      // On the painting: an open hand reaching toward the glow.
      if (host.closest(".trial.immersive")) hand.innerHTML = '<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M18 78 L16 46 Q8 40 6 30 Q6 24 12 26 L18 36 L16 10 Q16 4 21 4 Q26 4 26 10 L27 30 L28 6 Q28 1 33 1 Q38 1 38 7 L38 30 L40 10 Q40 5 45 5 Q50 5 49 11 L48 34 L51 18 Q52 13 56 14 Q60 15 59 21 L56 48 Q54 62 44 70 L44 78 Z" fill="#d6a274" stroke="#4a2a14" stroke-width="2.4" stroke-linejoin="round"/><path d="M27 30 L27 40 M38 30 L38 40" stroke="#8a5a34" stroke-width="1.5"/></svg>';
      const down = () => { holding = true; cue("hold"); }, up = () => { holding = false; cue("rest"); };
      host.querySelector(".btnrow").appendChild(pressButton(t.verb || "Hold", down, up));
      onAct(down, up);
      return loop((s) => {
        const dt = Math.min(0.05, s - last); last = s;
        // The horse's mood wanders, faster when it is frightened.
        moodV += (K.rng() - 0.5) * dt * 4.2 - (mood - 0.5) * dt * 0.8;
        moodV = clamp(moodV, -0.45, 0.45);
        mood = clamp(mood + moodV * dt, band / 2, 1 - band / 2);
        if (mood <= band / 2 || mood >= 1 - band / 2) moodV *= -0.6;
        vel += (holding ? 1.6 : -1.3) * dt;
        vel *= 0.92;
        pos = clamp(pos + vel * dt * 2.2, 0, 1);
        if (pos === 0 || pos === 1) vel = 0;
        const inside = Math.abs(pos - mood) <= band / 2;
        calm = clamp(calm + (inside ? dt / 7 : -dt / 9), 0, 1);
        moodEl.style.left = (mood - band / 2) * 100 + "%";
        if (horse) {
          horse.style.left = mood * 100 + "%";
          horse.classList.toggle("touched", inside);
          horse.classList.toggle("rear", Math.abs(moodV) > 0.3 && calm < 0.8);
          horse.classList.toggle("calm", calm > 0.6);
          horse.classList.toggle("toss", !inside && calm <= 0.6);
          horse.classList.toggle("left", moodV < -0.05); // it faces the way it shies
          if (moodV > 0.05) horse.classList.remove("left");
        }
        hand.style.left = pos * 100 + "%";
        moodEl.classList.toggle("on", inside);
        bar.style.width = calm * 100 + "%";
        U.trLabel(score, t.tally || "Calm: {c}%", { c: Math.round(calm * 100), s: Math.max(0, Math.ceil(LIMIT - s)) });
        clock.set(LIMIT - s, LIMIT);
        if (calm >= 1) finish("win", t.wonLine || "The horse stands still, trembling, and lets you lay a hand on its neck.");
        else if (s >= LIMIT) finish(calm >= 0.7 ? "close" : "lose", calm >= 0.7 ? t.nearLine || "Nearly. The horse is quieter, but not yet still." : t.lostLine || "The horse pulls free and bolts across the yard.");
      }, host);
    });
  };

  // ---------- Retort: answer before the lamp burns down ----------
  // trial.rounds: [{ line, replies: [right, wrong, wrong] }]; two right answers of three win.
  U.games.retort = function (box, done, c) {
    return frame(box, done, c, "retort", ({ host, power, t, finish, cue }) => {
      const rounds = K.val(t.rounds) || [], base = clamp(3.5 + power * 0.4, 3.5, 6.5);
      let i = 0, right = 0, timer = null, t0 = 0, raf = null;
      const clock = U.countdown(host);
      function round() {
        const r = rounds[i];
        const order = r.replies.map((x, j) => j).sort(() => K.rng() - 0.5);
        host.innerHTML = '<p class="score">' + U.tr("Round {n}, best of {m} · Right: {r}", { n: i + 1, m: rounds.length, r: right }) + '</p><blockquote class="taunt">' + U.t(r.line) + '</blockquote><div class="btnrow replies"></div>';
        const row = host.querySelector(".replies");
        const keys = [];
        order.forEach((j) => { const f = () => answer(j === 0); row.appendChild(U.button("cta secondary", U.t(r.replies[j]), f)); keys.push(f); });
        U.keys(keys);
        // Longer replies get a little longer to read.
        const secs = base + r.replies.reduce((n, x) => n + K.tr(x).length, 0) / 70;
        t0 = U.clock();
        const tick = () => { if (!host.isConnected) return; const left = secs - (U.clock() - t0) / 1000; clock.set(left, secs); if (left <= 0) return answer(false, true); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
      }
      function answer(ok, late) {
        cancelAnimationFrame(raf); clock.hide();
        U.keys([]);
        if (ok) right++;
        cue(ok ? "good" : "bad");
        host.querySelectorAll(".replies button").forEach((b) => { b.disabled = true; });
        host.insertAdjacentHTML("beforeend", '<p class="game-note">' + U.tr(late ? "Too slow. The moment passes." : ok ? "That lands." : "That was the wrong thing to say.") + "</p>");
        i++;
        if (right >= 2 || i - right >= 2 || i >= rounds.length) return setTimeout(() => finish(right >= 2 ? "win" : "lose", ["You found the right words {r} times of {n}.", { r: right, n: i }]), 600);
        timer = setTimeout(round, 900);
      }
      round();
      return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
    });
  };
  // ---------- Draw: hold to bend the bow, let go inside the band ----------
  // trial.shots (3), trial.need (2). Hold too long and the string slips.
  U.games.draw = function (box, done, c) {
    return frame(box, done, c, "draw", ({ host, power, t, finish: fin, onAct, cue }) => {
      // The bright band: 0.05 of the bar at the least until the playtest of 5 November, where a person's pace missed the
      // archer's path test four times running (about 0.11 s to let go in, at the stats of Act II); now about 0.14 s.
      const shots = t.shots || 3, need = t.need || 2, width = clamp(0.065 + power * 0.008, 0.065, 0.12) * (t.small ? 0.75 : 1);
      let shot = 0, wins = 0, ten = 0, holding = false, busy = false, lo = 0.72, drift = 0, wob = 0, last = 0;
      host.innerHTML = '<p class="score" aria-live="polite"></p><div class="drawpit"><svg viewBox="0 0 300 220" class="bow" aria-hidden="true"><path class="limb" d=""/><path class="string" d=""/></svg>' +
        '<div class="meter"><div class="band"></div><div class="fill"></div></div></div><p class="game-note" aria-live="polite">' + U.trSpan(t.help || "Hold to draw. Let go while the bar is in the bright band.") + '</p><div class="btnrow"></div>';
      const limb = host.querySelector(".limb"), str = host.querySelector(".string"), band = host.querySelector(".band"), fill = host.querySelector(".fill"), score = host.querySelector(".score"), note = host.querySelector(".game-note");
      const marks = () => { U.trLabel(score, t.tally || "Try {n} of {m} · Strung: {w}", { n: Math.min(shot + 1, shots), m: shots, w: wins }); };
      marks();
      // Your figure on the painting draws as you hold: the string and the hand come back to the face
      // together, and on letting go the string snaps back (js/ui/puppet-anim.js).
      const live = liveCast(host), rig = live.me, finish = ending(live, fin);
      const drawPose = (v) => ({ rot: -3, head: -2, armF: -84, foreF: -6, armB: -86, foreB: 150 * v, legF: -14, legB: 14, shinB: 6, draw: v });
      const settle = (ok, msg) => {
        busy = true; holding = false;
        if (rig) { hold(rig, LOOSE, 480, 0.5); rig.kick({ rot: -30, armB: -220, armF: 50, head: -30 }); if (ok) nod(live.elders); }
        if (ok) wins++;
        cue("act"); setTimeout(() => cue(ok ? "good" : "bad"), 240);
        shot++;
        note.textContent = K.tr(msg);
        host.querySelector(".drawpit").classList.remove("good", "bad"); void host.offsetWidth; host.querySelector(".drawpit").classList.add(ok ? "good" : "bad");
        if (K.Sound) K.Sound.play(ok ? "choose" : "quill");
        marks();
        const left = shots - shot;
        if (wins >= need || wins + left < need || left === 0) return setTimeout(() => finish(wins >= need ? "win" : need > 1 && wins === need - 1 ? "close" : "lose", ["{w} of {n}.", { w: wins, n: shot }]), 600);
        setTimeout(() => { busy = false; ten = 0; lo = 0.62 + K.rng() * 0.22; note.textContent = ""; host.querySelector(".drawpit").classList.remove("good", "bad"); }, 800);
      };
      const down = () => { if (!busy) holding = true; };
      const up = () => {
        if (busy || !holding) return;
        holding = false;
        if (ten < 0.08) return;
        const v = ten + wob;
        settle(v >= lo && v <= lo + width, v < lo ? t.weak || "Not far enough. The bow springs back." : t.over || "Too far. The string slips.");
      };
      host.querySelector(".btnrow").appendChild(pressButton(t.verb || "Draw", down, up));
      onAct(down, up);
      return loop((s) => {
        const dt = Math.min(0.05, s - last); last = s;
        if (!busy) {
          ten = holding ? Math.min(1.05, ten + dt * (0.32 + ten * 0.55)) : Math.max(0, ten - dt * 1.6);
          drift += dt; wob = holding ? Math.sin(drift * 7) * 0.014 * (1 + ten) : 0;
          if (ten >= 1.05) settle(false, t.over || "Too far. The string slips.");
        }
        const v = clamp(ten + wob, 0, 1);
        if (rig && !busy) hold(rig, drawPose(v), 520, 0.7);
        band.style.left = lo * 100 + "%"; band.style.width = width * 100 + "%";
        fill.style.width = v * 100 + "%";
        fill.classList.toggle("in", v >= lo && v <= lo + width);
        // The limbs curve away from you; the string comes back toward you as you draw.
        const tip = 150 + v * 45, nock = tip - 8 - v * 115;
        limb.setAttribute("d", "M" + tip + ",20 Q275,110 " + tip + ",200");
        str.setAttribute("d", "M" + tip + ",20 L" + nock + ",110 L" + tip + ",200");
      }, host);
    });
  };

  // ---------- Sneak: move while the torchlight is elsewhere ----------
  // Hold to move. Moving in the light, or standing in it too long, gets you seen.
  U.games.sneak = function (box, done, c) {
    return frame(box, done, c, "sneak", ({ host, power, t, finish, onAct, cue }) => {
      // trial.twist (owner, 5 November: the lamp game had grown repetitive), one to a place:
      //   dog     a dog by the gate hears you if you keep moving: go in short bursts, or it barks and the guard comes your way;
      //   lamp    a second lamp on the wall flares up now and then over part of the way (it flickers first);
      //   clouds  the moon comes out from behind the clouds (1.6-2.2 s, then 3.4-4.8 s dark): moving in moonlight is seen (standing still is not);
      //   turns   a nervous guard who doubles back often, with only a short tell.
      // Each twist gives a few more seconds.
      const tw = t.twist || null;
      const need = t.trips || 2, lives = t.spots || 2, light = clamp(0.26 - power * 0.012, 0.15, 0.26), LIMIT = (t.secs || 45) + (tw === "clouds" ? 12 : tw ? 8 : 0); // under the moon you wait more: 12 s (a simulated careful player, 6 November: 63-87% with 8)
      let pos = 0, trips = 0, seen = 0, sus = 0, holding = false, freeze = 0, last = 0;
      let noise = 0, dogT = 0, barkT = 0; // the dog
      const L2 = { c: 0.5 + (K.rng() - 0.5) * 0.16, w: 0.15, on: false, t: 1.6 + K.rng(), warn: false }; // the wall lamp
      let moon = false, moonT = 3 + K.rng(), moonWarn = false; // the moon
      // The guard walks the far side carrying the torch; its light falls on the ground just ahead of
      // him. He starts on the right and paces the back wall. Before he turns he stops and lifts the
      // torch (the tell); now and then he stops to look. When he sees you he comes at you and the
      // light stays on you.
      let gp = 0.9, gdir = -1, gpause = 0, turning = false, glock = 0, spot = 0.9;
      const gspeed = clamp(0.1 + (0.26 - light) * 0.25, 0.1, 0.13), REACH = 0.07;
      const painted = !!host.closest(".trial.immersive"), day = !!t.daylight;
      // A test scored in loads (the plain tally) has you carry each one across in a basket on your head.
      const loads = !t.tally || /load/i.test(t.tally);
      host.innerHTML = '<p class="score" aria-live="polite"></p><div class="sneakway' + (painted ? " painted" : "") + (day ? " daylight" : "") + '">' +
        '<svg class="beam" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sneak-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd890" stop-opacity="0.85"/><stop offset="1" stop-color="#ffaa50" stop-opacity="0.32"/></linearGradient></defs><polygon fill="url(#sneak-beam)"/><ellipse class="pool" rx="1" ry="4"/></svg>' +
        (tw === "lamp" ? '<i class="walllamp"></i>' : "") + (tw === "clouds" ? '<i class="moonwash"></i><i class="moonball"></i>' : "") +
        '<div class="goal"></div><div class="guard">' + (painted ? U.puppet(Object.assign({}, U.puppetFor(t.watch || "guard"), { item: null }), { h: 150, pose: "live", flip: true }) : "") + '<i class="flame"></i></div><div class="me"></div></div><div class="sus"><i></i></div>' +
        (tw === "dog" ? '<div class="noise"><b>' + U.tr("The dog") + "</b><span><i></i></span></div>" : "") +
        '<p class="game-note" aria-live="polite">' + U.trSpan(tw && TWIST[tw] ? TWIST[tw] : t.help || "Hold to move. Stop before the light reaches you.") + '</p><div class="btnrow"></div>';
      const way = host.querySelector(".sneakway"), me = host.querySelector(".me"), susBar = host.querySelector(".sus i"), score = host.querySelector(".score"), note = host.querySelector(".game-note");
      const guard = host.querySelector(".guard"), poly = host.querySelector(".beam polygon"), pool = host.querySelector(".beam .pool"), clock = U.countdown(host);
      const noiseBar = host.querySelector(".noise i"), lampEl = host.querySelector(".walllamp");
      if (tw === "lamp") { pool.insertAdjacentHTML("afterend", '<ellipse class="pool2" rx="1" ry="4"/>'); if (lampEl) lampEl.style.left = L2.c * 100 + "%"; }
      const pool2 = host.querySelector(".beam .pool2");
      let flame = guard.querySelector(".flame");
      // On the painting your own puppet creeps along the ground through the shadows, empty-handed to
      // make no sound, with the load in a basket on the head. The guard holds his torch up in front
      // of him and its light comes from the flame (by day the watcher only looks).
      if (painted) me.innerHTML = U.puppet(Object.assign({}, K.puppetSpec(K.S), { item: null }), { h: 150, pose: "live" });
      const fig = painted ? me.querySelector(".pp") : null, gfig = painted ? guard.querySelector(".pp") : null;
      let basket = null, torch = null;
      if (fig && loads) {
        fig.querySelector(".j.head").insertAdjacentHTML("beforeend", '<g class="basket"><path d="M46 30 Q60 22 76 30 L73 39 Q60 44 49 39 Z" fill="#a8783a" stroke="#24120a" stroke-width="1.1"/><path d="M48 33 Q60 37 74 33 M49 36.5 Q60 40.5 73 36.5" fill="none" stroke="#6b4a24" stroke-width="1"/><path d="M50 30 Q56 24 60 27 Q66 22 72 29" fill="#c9a24e" stroke="#24120a" stroke-width=".8"/></g>');
        basket = fig.querySelector(".basket");
      }
      if (gfig && !day) {
        gfig.querySelector(".foreF").insertAdjacentHTML("beforeend", '<g class="torch"><path d="M58 120 L58 150" stroke="#5a3418" stroke-width="3.2" stroke-linecap="round"/><path d="M55 148 h6 v5 h-6 Z" fill="#3a2412" stroke="#24120a" stroke-width=".7"/><g class="fl"><ellipse cx="58" cy="158" rx="4.6" ry="7" fill="#ffb347"/><ellipse cx="58" cy="157" rx="2.4" ry="4.4" fill="#fff1c4"/></g></g>');
        torch = gfig.querySelector(".torch .fl"); flame = torch;
      }
      const mrig = U.rig(fig, me, "sneak"), grig = U.rig(gfig, guard, "stand");
      // Aim a live figure at a pose given joint by joint; it springs there (snap: at once).
      const steer = (rig, p, k, z, snap) => {
        for (const key in rig.t) if (key !== "dx") rig.t[key] = p[key] || 0;
        rig.k = k; rig.z = z;
        if (snap) { for (const key in rig.x) { rig.x[key] = rig.t[key]; rig.v[key] = 0; } rig.apply(); }
      };
      // You: a crouched creep with high knees and the arms out for balance (f runs with the steps), the body kept upright
      // (owner, 4 November: the puppet has no waist, so a lean tips the whole figure forward like a plank);
      // frozen low, looking up at the guard; running back upright with long strides.
      const hold = basket ? [-172, -14] : [-64, -24]; // the back hand steadies the basket, or is out for balance
      const creep = (f) => { const sn = Math.sin(f), cs = Math.cos(f);
        return { ty: 13 + Math.abs(sn) * 2, rot: 5, head: 2, legF: -46 + 24 * sn, shinF: 50 + 28 * Math.max(0, Math.sin(f + 1.2)), legB: 24 - 24 * sn, shinB: 44 + 28 * Math.max(0, -Math.sin(f + 1.2)),
          armF: -46 + 10 * cs, foreF: -34, armB: hold[0], foreB: hold[1] }; };
      const still = { ty: 18, rot: 4, head: -8, legF: -62, shinF: 80, legB: 24, shinB: 70, armF: -52, foreF: -40, armB: hold[0], foreB: hold[1] };
      const start = Object.assign({}, still, { head: -24, rot: 4, ty: 6 });
      const run = (f) => { const sn = Math.sin(f);
        return { rot: 4, ty: Math.abs(sn) * 3, head: 0, legF: -10 + 40 * sn, shinF: 20 + 50 * Math.max(0, -sn), legB: -10 - 40 * sn, shinB: 20 + 50 * Math.max(0, sn), armF: 40 * sn - 30, foreF: -60, armB: -40 * sn - 30, foreB: -60 }; };
      // The guard: a stride with the torch held up in front; stopping to look over the yard; the
      // tell (he lifts the torch high and leans back: about to turn); striding at you, torch thrust out.
      // By day the watcher swings his arms as he walks and shades his eyes to look.
      const gwalk = (f) => { const sn = Math.sin(f);
        return { ty: -Math.abs(sn) * 1.4, legF: 22 * sn, shinF: 16 * Math.max(0, -sn), legB: -22 * sn, shinB: 16 * Math.max(0, sn), armF: day ? 16 * sn : -118, foreF: day ? -18 : -32, armB: -14 * sn, foreB: -18, head: 2 }; };
      const gstand = day ? { armF: -140, foreF: -96, armB: -4, foreB: -14, head: 4 } : { armF: -104, foreF: -30, armB: -4, foreB: -14, head: 10 };
      const gtell = { rot: -6, armF: -166, foreF: -8, armB: -20, foreB: -40, head: -16 };
      const gchase = (f) => Object.assign(gwalk(f * 1.6), { rot: 4, armF: -96, foreF: -4, head: 6 });
      if (mrig) steer(mrig, still, 600, 0.6, true);
      if (grig) steer(grig, gwalk(0), 600, 0.6, true);
      const setPose = (el, p) => { if (el) el.setAttribute("class", el.getAttribute("class").replace(/pose-\S+/, "pose-" + p)); };
      let posed = "", gposed = "", gface = 0, shown = 0, runBack = 0, mf = 0, gf = 0;
      const down = () => { holding = true; cue("hold"); }, up = () => { holding = false; cue("rest"); };
      host.querySelector(".btnrow").appendChild(pressButton(t.verb || "Move", down, up));
      onAct(down, up);
      return loop((s) => {
        const dt = Math.min(0.05, s - last); last = s;
        let gpose = "walk";
        if (glock > 0) {
          glock -= dt;
          gp += clamp(pos - gp, -1, 1) * dt * 0.7; gdir = pos >= gp ? 1 : -1; spot = pos; gpose = "chase";
        } else if (gpause > 0) {
          gpause -= dt; gpose = turning ? "tell" : "look";
          if (gpause <= 0 && turning) { gdir = -gdir; turning = false; }
        } else {
          gp += gdir * gspeed * (dogT > 0 ? 2.2 : 1) * dt; // the dog barked: he comes quickly your way
          if (dogT > 0) dogT -= dt;
          if ((gp <= 0.08 && gdir < 0) || (gp >= 0.92 && gdir > 0)) { gp = clamp(gp, 0.08, 0.92); gpause = 0.9; turning = true; dogT = 0; }
          else if (tw === "turns" ? K.rng() < dt * 0.3 : K.rng() < dt * 0.12) { gpause = tw === "turns" ? 0.25 + K.rng() * 0.25 : 0.6 + K.rng() * 0.6; turning = K.rng() < (tw === "turns" ? 0.75 : 0.45); }
        }
        if (glock <= 0) spot = clamp(gp + gdir * REACH * (gpause > 0 && turning ? 0.4 : 1), 0, 1);
        // The twists' own clocks.
        if (tw === "lamp") { L2.t -= dt; L2.warn = !L2.on && L2.t < 0.5; if (L2.t <= 0) { L2.on = !L2.on; L2.t = L2.on ? 1.8 + K.rng() * 0.6 : 1.6 + K.rng() * 1.2; } }
        if (tw === "clouds") { moonT -= dt; moonWarn = !moon && moonT < 0.7; if (moonT <= 0) { moon = !moon; moonT = moon ? 1.6 + K.rng() * 0.6 : 3.4 + K.rng() * 1.4; if (moon && holding) note.textContent = K.tr("The moon is out. Keep still."); } }
        if (tw === "dog" && freeze <= 0) {
          noise = clamp(noise + (holding ? dt * 0.42 : -dt * 0.6), 0, 1);
          if (noise >= 1) { noise = 0.4; barkT = 1; gdir = pos >= gp ? 1 : -1; gpause = 0; turning = false; dogT = 1.6; note.textContent = K.tr("The dog barks, and the guard turns your way."); if (K.Sound) K.Sound.play("drum"); }
        }
        if (barkT > 0) barkT -= dt;
        const lit = Math.abs(pos - spot) < light / 2 || (tw === "lamp" && L2.on && Math.abs(pos - L2.c) < L2.w / 2);
        if (freeze > 0) freeze -= dt;
        else {
          if (holding) pos = Math.min(1, pos + dt * 0.11);
          sus = clamp(sus + (lit ? (holding ? dt * 2.4 : dt * 0.22) : moon && holding ? dt * 1.1 : -dt * 0.35), 0, 1);
          if (sus >= 1) { seen++; sus = 0; glock = 1.1; freeze = 1.1; runBack = 1.1; note.textContent = K.tr(t.spotted || "A shout. You drop the basket and run back into the dark."); if (K.Sound) K.Sound.play("hit"); cue("bad");
            if (basket) basket.style.display = "none"; // you start, and the basket drops
            if (mrig) mrig.kick({ ty: -260, head: -300, rot: -200 });
            setTimeout(() => { pos = Math.max(0, pos - 0.35); }, 650); }
          if (pos >= 1) { trips++; cue("good"); pos = 0; shown = 0; note.textContent = K.tr(t.made || "Out, and back for another load."); if (K.Sound) K.Sound.play("choose"); }
        }
        if (basket && freeze <= 0 && basket.style.display) basket.style.display = ""; // another load, once you are back in the dark
        // You: creeping while you hold, frozen low when you let go (trembling in the light); when seen,
        // a start, then you turn and run back into the dark to where you land.
        shown = mrig ? shown + (pos - shown) * Math.min(1, dt * (runBack > 0 ? 5 : 14)) : pos;
        if (runBack > 0) runBack -= dt;
        if (mrig) {
          if (runBack > 0 && freeze < 0.45) { mf += dt * 14; steer(mrig, run(mf), 900, 0.6); fig.classList.add("flip"); }
          else if (freeze > 0.45) steer(mrig, start, 500, 0.5);
          else { fig.classList.remove("flip"); if (holding) { mf += dt * 5.2; steer(mrig, creep(mf), 700, 0.62); } else steer(mrig, still, 420, 0.6); }
          mrig.tremble = lit && !holding ? 2.6 : 0;
        } else if (fig) {
          const want = freeze > 0 ? "stand" : "sneak";
          if (want !== posed) { posed = want; setPose(fig, want); fig.classList.toggle("flip", freeze > 0); }
        }
        // The guard faces the way he walks; the torch flickers, and flares as he lifts it.
        guard.style.left = gp * 100 + "%";
        guard.classList.toggle("left", gdir < 0); guard.classList.toggle("tell", gpause > 0 && turning); guard.classList.toggle("locked", glock > 0);
        if (gfig && gface !== gdir) { gface = gdir; gfig.classList.toggle("flip", gdir < 0); }
        if (grig) {
          gf += dt * (gpose === "chase" ? 9 : 5.5);
          steer(grig, gpose === "walk" ? gwalk(gf) : gpose === "chase" ? gchase(gf) : gpose === "tell" ? gtell : gstand, gpose === "tell" ? 260 : 600, 0.6);
          if (torch) { const fl = (1 + Math.sin(s * 23) * 0.08 + Math.sin(s * 37) * 0.06) * (gpose === "tell" ? 1.35 : 1); torch.setAttribute("transform", "translate(58 158) scale(" + fl.toFixed(3) + ") translate(-58 -158)"); }
        } else if (gpose !== gposed) {
          gposed = gpose; // without motion: the plain poses, the torch held out in front
          setPose(gfig, { walk: day ? "walk" : "hold", look: day ? "stand" : "hold", tell: "cheer", chase: "push" }[gpose]);
        }
        // The cone of light, from the flame to the ground.
        const wr = way.getBoundingClientRect(), fr = flame.getBoundingClientRect();
        if (wr.width && wr.height) {
          const fx = ((fr.left + fr.width / 2 - wr.left) / wr.width) * 100, fy = ((fr.top + fr.height / 2 - wr.top) / wr.height) * 100;
          const a = (spot - light / 2) * 100, b = (spot + light / 2) * 100;
          poly.setAttribute("points", fx.toFixed(1) + "," + fy.toFixed(1) + " " + b.toFixed(1) + ",100 " + a.toFixed(1) + ",100");
          pool.setAttribute("cx", (spot * 100).toFixed(1)); pool.setAttribute("cy", "98"); pool.setAttribute("rx", (light * 50).toFixed(1));
        }
        way.classList.toggle("caught", glock > 0);
        if (pool2) { pool2.setAttribute("cx", (L2.c * 100).toFixed(1)); pool2.setAttribute("cy", "98"); pool2.setAttribute("rx", (L2.w * 50).toFixed(1)); pool2.setAttribute("class", "pool2" + (L2.on ? " on" : L2.warn ? " warn" : "")); }
        if (lampEl) lampEl.className = "walllamp" + (L2.on ? " on" : L2.warn ? " warn" : "");
        if (tw === "clouds") { way.classList.toggle("moonlit", moon); way.classList.toggle("moonsoon", moonWarn); }
        if (noiseBar) { noiseBar.style.width = noise * 100 + "%"; noiseBar.parentNode.parentNode.classList.toggle("bark", barkT > 0); }
        me.style.left = painted ? "calc(" + shown * 100 + "% + " + Math.round((1 - shown) * 40) + "px)" : pos * 100 + "%"; // the painted figure starts fully on screen
        me.classList.toggle("lit", lit);
        susBar.style.width = sus * 100 + "%";
        U.trLabel(score, t.tally || "Loads: {d} of {n} · Seen: {s} of {m}", { d: trips, n: need, s: seen, m: lives, t: Math.max(0, Math.ceil(LIMIT - s)) });
        clock.set(LIMIT - s, LIMIT);
        if (trips >= need) finish("win", ["{d} loads carried, seen {s} times.", { d: trips, s: seen }]);
        else if (seen >= lives || s >= LIMIT) finish("lose", ["{d} loads carried, seen {s} times.", { d: trips, s: seen }]);
      }, host);
    });
  };

  // ---------- Notice: look at the table, then say what was on it ----------
  const THINGS = K.NOTICE_THINGS = ["A brass lamp", "A broken arrow", "A red thread", "A clay cup", "A peacock feather", "A seal ring", "A folded letter", "A coil of rope",
    "A copper coin", "A conch shell", "A long die", "A sandal", "A bowl of rice", "A small bell", "An iron key", "A string of beads"];
  U.games.notice = function (box, done, c) {
    return frame(box, done, c, "notice", ({ host, power, t, finish, cue }) => {
      const look = clamp(3 + power * 0.3, 3, 5.5), secs = clamp(3.5 + power * 0.3, 3.5, 6), count = t.count || 7;
      const pool = (t.things || THINGS).slice().sort(() => K.rng() - 0.5), seen = pool.slice(0, count), unseen = pool.slice(count);
      let i = 0, right = 0, raf = null, timer = null;
      host.innerHTML = '<p class="score">' + U.tr(t.lookLine || "Look. You have {n} seconds.", { n: Math.round(look) }) + '</p><ul class="table">' + seen.map((x) => "<li>" + U.tr(x) + "</li>").join("") + "</ul>";
      const clock = U.countdown(host), t0 = U.clock();
      const tickLook = () => { if (!host.isConnected) return; const left = look - (U.clock() - t0) / 1000; clock.set(left, look); if (left <= 0) return ask(); raf = requestAnimationFrame(tickLook); };
      raf = requestAnimationFrame(tickLook);
      function ask() {
        const yes = seen[(i * 3 + 1) % seen.length], no = unseen.slice(i * 2, i * 2 + 2);
        const opts = [yes].concat(no).sort(() => K.rng() - 0.5);
        host.innerHTML = '<p class="score">' + U.tr("Question {n} of 3 · Right: {r}", { n: i + 1, r: right }) + '</p><p class="taunt">' + U.tr(t.ask || "Which of these was on the table?") + '</p><div class="btnrow replies"></div>';
        const row = host.querySelector(".replies"), keys = [];
        opts.forEach((x) => { const f = () => answer(x === yes); row.appendChild(U.button("cta secondary", U.tr(x), f)); keys.push(f); });
        U.keys(keys);
        const t1 = U.clock();
        const tick = () => { if (!host.isConnected) return; const left = secs - (U.clock() - t1) / 1000; clock.set(left, secs); if (left <= 0) return answer(false, true); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
      }
      function answer(ok, late) {
        cancelAnimationFrame(raf); clock.hide(); U.keys([]);
        if (ok) right++;
        cue(ok ? "good" : "bad");
        host.querySelectorAll(".replies button").forEach((b) => { b.disabled = true; });
        host.insertAdjacentHTML("beforeend", '<p class="game-note">' + U.tr(late ? "Too slow." : ok ? "Yes. It was there." : "No. That was not there.") + "</p>");
        i++;
        if (right >= 2 || i - right >= 2 || i >= 3) return setTimeout(() => finish(right >= 2 ? "win" : "lose", ["You remembered {r} of {n}.", { r: right, n: i }]), 600);
        timer = setTimeout(ask, 900);
      }
      return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
    });
  };
})(window.K = window.K || {});
