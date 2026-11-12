/* Tests: the moments where you do the thing, not only choose it. A choice with `game` (and usually `trial`) opens one:
   first a card with the rules and the stakes and how your own stats help, then the test itself, played in 3D on its own
   ground (ui/games.js holds every kind), then the outcome ("win", "close", "lose"), which picks the choice's branch.
   Your stats set the difficulty exactly as in the 2D game (K.trialPower); how you play decides the result.

   Without a screen (the test harness) a test rolls against the same stats, as the 2D harness did. A kind that has no 3D
   play yet does the same behind its card, so the story never stops on one. */
(function (K) {
  "use strict";
  const U = K.UI, G = K.G3, T = window.THREE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const D = () => ({ lookOf: U.lookOf3d });
  // A test written without a stage of its own is played on the usual ground for its kind.
  const STAGE_FOR = { breath: "stage_forest_lake", aim: "stage_training_ground", push: "stage_training_ground", draw: "stage_bow_courtyard", steady: "stage_healers_hall", sneak: "stage_palace_corridor", retort: "stage_lotus_garden", notice: "stage_vidura_table",
    hands: "stage_dice_board_top", pasha: "stage_dice_board_top", rhythm: "stage_smithy", race: "stage_racetrack", herd: "stage_khandava_top", drill: "stage_training_ground", rings: "stage_chakravyuha_top", dash: "stage_chakravyuha_top", chaupar: "stage_board_table", baghchal: "stage_board_table",
    moksha: "stage_board_table", array: "stage_vyuha_top", formation: "stage_vyuha_top", escape: "stage_lac_fire_top", fuse: "stage_lac_cellar" };
  K.trialPower = function (t, S = K.S) {
    const a = t.attr ? K.attr(t.attr) : 0, s = t.skill ? S.skills[t.skill] || 0 : 0;
    return a + s + K.merits({ attr: t.attr, skill: t.skill }, S).n;
  };
  const statNames = (t) => K.list([t.attr && K.tr(K.ATTRS[t.attr]), t.skill && K.tr(K.SKILLS[t.skill])].filter(Boolean));
  const TWIST = { dog: "A dog lies by the gate. Move in short bursts: keep going too long and it hears you.", lamp: "A lamp on the wall flares up now and then. Keep out of its light when it does; it flickers first.",
    clouds: "The moon comes and goes behind the clouds. When it is out, keep still.", turns: "This guard is nervous: he turns back often, with little warning." };
  U.TWIST = TWIST;
  const PLAY = (U.PLAY = {});      // kind → play(ctx) → optional stop()
  const AUTO = (U.AUTO = {});      // kind → (t, power) → [outcome, summary]   (kinds that are games of their own: dice)
  const KINDS = ["aim", "push", "steady", "retort", "draw", "sneak", "notice", "rhythm", "race", "dash", "herd", "rings", "drill", "formation", "array", "breath", "escape", "fuse", "pasha", "hands", "chaupar", "baghchal", "moksha"];
  U.TRIAL_KINDS = KINDS;

  function roll(kind, t, power) {
    if (AUTO[kind]) return AUTO[kind](t, power);
    const p = clamp((t.auto != null ? t.auto : 0.2) + power * 0.055, 0.1, 0.72), r = K.rng();
    return [r < p ? "win" : r < p + 0.15 && (kind === "aim" || kind === "steady" || kind === "escape") ? "close" : "lose", null];
  }
  U.trialRoll = roll;

  // The clock of a timed test, at the top of the screen.
  function makeClock(head) {
    const el = U.el('<div class="t-clock" role="timer" hidden><b class="t-secs"></b><span class="t-bar"><i></i></span></div>');
    head.appendChild(el);
    const num = el.querySelector(".t-secs"), bar = el.querySelector(".t-bar i"); let shown = null;
    return { set(left, total) { left = clamp(left, 0, total); el.hidden = false; const n = Math.ceil(left); if (n !== shown) { shown = n; num.textContent = n; } bar.style.transform = "scaleX(" + (total > 0 ? left / total : 0).toFixed(4) + ")"; el.classList.toggle("warn", left <= Math.min(5, total * 0.34)); }, hide() { el.hidden = true; shown = null; } };
  }

  function frame(box, done, c, kind) {
    const t = c.trial || {}, power = K.trialPower(t);
    // Without 3D (the 2D game's own tests, a browser without WebGL): the 2D game's test.
    if (!U.b3d.can()) return U.games2D[kind](box, done, c);
    const play = PLAY[kind];
    const offs = [], timers = [], things = [], figs = [];
    let finished = false, stop = null, act = null, actUp = null, phase = "intro";
    const hud = U.el('<div class="trial3d trial-' + kind + '"><header class="t-head"><span class="t-name">' + U.t(K.val(c.t)) + '</span><span class="t-score"></span></header><div class="t-mid"></div><div class="t-foot"><p class="t-prompt"></p><div class="t-btns"></div></div></div>');
    const head = hud.querySelector(".t-head"), scoreEl = hud.querySelector(".t-score"), promptEl = hud.querySelector(".t-prompt"), btns = hud.querySelector(".t-btns"), mid = hud.querySelector(".t-mid");
    const clock = makeClock(head);
    const onKey = (e) => { if (document.querySelector(".scrim")) return; if ((e.key === " " || e.key === "Enter") && act) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) act(); } else if (ctx.keys && ctx.keys(e, true)) { e.preventDefault(); e.stopPropagation(); } };
    const onKeyUp = (e) => { if ((e.key === " " || e.key === "Enter") && actUp) { e.preventDefault(); e.stopPropagation(); actUp(); } else if (ctx.keys) ctx.keys(e, false); };
    const cv = U.$("view");
    const onDown = (e) => { if (phase !== "play") return; if (ctx.pointer && ctx.pointer("down", e) === true) return; if (act && ctx.tapActs !== false) act(); };
    const onMove = (e) => { if (phase === "play" && ctx.pointer) ctx.pointer("move", e); };
    const onUp = (e) => { if (phase !== "play") return; if (ctx.pointer) ctx.pointer("up", e); if (actUp && ctx.tapActs !== false) actUp(); };
    const ctx = {
      t, power, kind, c, hud, mid, st: null, me: null, clock, rng: K.rng, tapActs: true,
      score(html) { scoreEl.innerHTML = html || ""; },
      prompt(html) { promptEl.innerHTML = html || ""; promptEl.hidden = !html; },
      onAct(down, up) { act = down; actUp = up || null; },
      // A thumb's button at the foot of the screen; it answers the action key too when it is the only one.
      button(label, down, up, cls) { const b = U.button("cta t-btn " + (cls || ""), U.tr(label), null); b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); down(e); }); if (up) for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, up); btns.appendChild(b); return b; },
      choice(label, fn, cls) { const b = U.button("cta secondary t-btn " + (cls || ""), label, (e) => { e.stopPropagation(); fn(); }); btns.appendChild(b); return b; },
      clearButtons() { btns.innerHTML = ""; },
      loop(fn) { const o = G.onFrame((dt, tt) => { if (!finished && dt > 0) fn(dt, tt); }); offs.push(o); return o; },
      after(ms, fn) { const id = setTimeout(() => { if (!finished) fn(); }, ms); timers.push(id); return id; },
      add(obj, parent) { (parent || G.actors).add(obj); things.push(obj); return obj; },
      figure(who, o) { const f = G.figure(typeof who === "string" ? D().lookOf(who) : who, o || {}); G.actors.add(f.root); figs.push(f); return f; },
      // (wide: how far to each side of where it looks must be in the picture; a narrow screen stands back until it is)
      cam(pos, look, fov, snap, wide) { fov = fov || 42; if (wide) { const d = Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]), need = wide / (Math.tan((fov * Math.PI) / 360) * (G.W / G.H)), f = Math.min(2.4, Math.max(1, need / d)); pos = [look[0] + (pos[0] - look[0]) * f, look[1] + (pos[1] - look[1]) * f, look[2] + (pos[2] - look[2]) * f]; } G.camSet(pos, look, fov, snap); },
      cue(ev) { if (ev === "good") { if (K.Sound) K.Sound.play("tap"); } else if (ev === "bad") { if (K.Sound) K.Sound.play("hit"); G.shake(0.1, 0.25); } },
      toast(text, cls) { const el = U.el('<div class="t-toast ' + (cls || "") + '">' + text + "</div>"); mid.appendChild(el); setTimeout(() => el.remove(), 1300); },
      finish
    };
    function cleanup() {
      document.removeEventListener("keydown", onKey, true); document.removeEventListener("keyup", onKeyUp, true);
      cv.removeEventListener("pointerdown", onDown); cv.removeEventListener("pointermove", onMove); cv.removeEventListener("pointerup", onUp); cv.removeEventListener("pointercancel", onUp);
      offs.forEach((f) => f()); timers.forEach(clearTimeout);
      for (const f of figs) f.dispose();
      for (const o of things) { if (o.parent) o.parent.remove(o); G.dispose(o); }
      hud.remove();
      U.keyHook = null;
    }
    function finish(outcome, summary) {
      if (finished) return;
      finished = true; phase = "done";
      if (stop) try { stop(); } catch (e) { /* a test's own tidy-up */ }
      const word = outcome === "win" ? "You win" : outcome === "close" ? "So close" : "You lose";
      const res = U.el('<div class="t-result ' + outcome + '"><b>' + U.tr(word) + "</b></div>"); document.body.appendChild(res);
      if (K.Sound) K.Sound.play(outcome === "win" ? "gong" : "drum");
      if (ctx.me) ctx.me.pose(outcome === "win" ? "cheer" : "slump");
      const upd = G.onFrame((dt, tt) => { for (const f of figs) f.update(dt, tt); });
      setTimeout(() => { upd(); res.remove(); cleanup(); U.b3d.off(); done(outcome, summary); }, U.calm() ? 900 : 1700);
    }
    function begin() {
      phase = "play"; card.remove(); U.keys([]);
      hud.classList.add("playing");
      if (!play || U.autoTrials) { // no 3D play for this kind yet (or the smoke test's own hands): the roll, behind a moment's pause
        ctx.prompt(U.tr("…"));
        setTimeout(() => { const [o, s] = roll(kind, t, power); finish(o, s); }, 900);
        return;
      }
      document.addEventListener("keydown", onKey, true); document.addEventListener("keyup", onKeyUp, true);
      cv.addEventListener("pointerdown", onDown); cv.addEventListener("pointermove", onMove); cv.addEventListener("pointerup", onUp); cv.addEventListener("pointercancel", onUp);
      try { stop = play(ctx) || null; } catch (e) { if (window.console) console.error(e); const [o, s] = roll(kind, t, power); finish(o, s); }
    }
    // The card: what to do, what is at stake, how your stats help.
    const card = U.el('<div class="trialcard" role="dialog"></div>');
    function intro() {
      const how3 = U.HOWTO3D && U.HOWTO3D[kind]; // (where the 3D test is played differently from the 2D one, it says so in its own words)
      card.innerHTML = '<span class="kind yours">' + U.tr(K.val(t.practice) ? "A first test" : "A test") + "</span><h2>" + U.t(K.val(c.t)) + "</h2>" +
        (t.practice ? '<p class="aside">' + U.tr("A first test. This one does not count; it shows you how tests work.") + "</p>" : "") +
        (t.howto || how3 ? "" : t.rules ? '<p class="game-rules">' + U.t(K.val(t.rules)) + "</p>" : "") +
        (t.twist && TWIST[t.twist] ? '<p class="aside">' + U.tr(TWIST[t.twist]) + "</p>" : "") +
        (t.howto || how3 ? '<p class="cr-lbl">' + U.tr("How to play") + "</p><ol>" + (how3 || K.val(t.howto)).map((s) => "<li>" + U.t(K.val(s)) + "</li>").join("") + "</ol>" : "") +
        (ctx.how ? '<p class="aside">' + U.tr(ctx.how) + "</p>" : "") +
        (t.stakes ? '<ul class="stakes"><li class="win"><b>' + U.tr("If you succeed") + "</b> " + U.t(K.val(t.stakes[0])) + '</li><li class="lose"><b>' + U.tr("If you fail") + "</b> " + U.t(K.val(t.stakes[1])) + "</li></ul>" : "") +
        (t.attr || t.skill ? '<p class="small muted">' + U.tr("Helped by your {what}: {n}. The higher, the easier.", { what: statNames(t), n: power }) + "</p>" : "") + '<div class="btnrow"></div>';
      const row = card.querySelector(".btnrow");
      row.appendChild(U.button("cta", U.tr("Begin"), begin, "trial-begin"));
      if ((kind === "sneak" || kind === "herd") && K.vanishReady && K.vanishReady() && !t.practice)
        row.appendChild(U.button("ghost", U.tr("Vanish instead (Antardhana)"), () => { K.S.vanishedAct = K.S.act; card.remove(); phase = "play"; finish("win", "You were simply not there. No one can say how."); }));
      U.keys([begin]);
    }
    U.curtain(() => {
      if (!U.b3d.on()) { finished = true; U.games2D[kind](box, done, c); return; }
      // The test's own ground. A kind may build more on it (ctx.setup) before the card comes up.
      const stageKey = K.val(t.stage) || STAGE_FOR[kind] || "stage_training_ground";
      G.lookHint = ""; /* (a test is not a battle: everyday dress, or the student's cloth under the teachers) */
      ctx.st = G.setStage(stageKey, { clear: SETUP[kind] && SETUP[kind].clear ? SETUP[kind].clear : 9 });
      const c0 = ctx.st.cam || { look: [0, 1.1, 0], dist: 8, yaw: 0.2, pitch: 0.13 };
      G.cam.rate = 3.2;
      G.camSet([c0.look[0] + Math.sin(c0.yaw) * c0.dist, c0.look[1] + 1.4, c0.look[2] + Math.cos(c0.yaw) * c0.dist], c0.look, 42, true);
      if (SETUP[kind] && SETUP[kind].setup) try { SETUP[kind].setup(ctx); } catch (e) { if (window.console) console.error(e); }
      else { ctx.me = ctx.figure("me"); ctx.me.place(0, 1.5, Math.PI); }
      offs.push(G.onFrame((dt, tt) => { if (!finished) for (const f of figs) f.update(dt, tt); }));
      U.$("stagehud").appendChild(hud);
      U.$("stagehud").appendChild(card);
      ctx.prompt("");
      intro();
    });
    return { draw() { const n = hud.querySelector(".t-name"); if (n) n.innerHTML = U.t(K.val(c.t)); if (phase === "intro") intro(); } };
  }
  const SETUP = (U.TRIAL_SETUP = {}); // kind → { clear, setup(ctx) }: what stands on the ground before the card comes up
  U.trialFrame3d = frame; // (never U.trialFrame: that is the 2D game's own frame, which the tests fall back to where there is no 3D)
  U.games2D = Object.assign({}, U.games);
  for (const kind of KINDS) if (U.games2D[kind]) U.games[kind] = (box, done, c) => frame(box, done, c, kind);
})(window.K = window.K || {});
