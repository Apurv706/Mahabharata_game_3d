/* Fights played live (content/war_fights.js: enc.kind "chariot", "range", "mace" or "carry"; and the
   two day-17 fights in war_duel.js). The fight is started in the engine as usual (ui/battle.js), then
   played as the test it is built from, on the fight's own stage: the race with a bow and contact, the
   aim test against a running chariot, the parry drill with maces, the steady test under arrows. Its
   outcome, and how many of the fight's rounds it stood for, end the engine's fight (K.Combat.settle),
   so every flag, bond and count is set as the plain hold would set it. A race also plays the fight's
   beats as it passes their rounds (the weapons clashing overhead on day 17). Only with motion on, and
   never under the tests: otherwise the fight is the plain hold it is written as. */
(function (K) {
  "use strict";
  const U = K.UI, C = K.Combat;
  const GAME = { chariot: "race", range: "aim", mace: "push", carry: "steady" };
  const STAGE = { chariot: "fight_war_chariot", range: "fight_war_field", mace: "fight_war_field", carry: "fight_war_field" };
  U.fightMode = {
    has: (kind) => !!(GAME[kind] && U.games && U.games[GAME[kind]]),
    play(B) {
      const enc = B.enc, kind = B.mode, game = GAME[kind], hold = enc.hold || enc.rounds || 4;
      const t = Object.assign({ stage: STAGE[kind], kind: "war" }, K.val(enc.play) || {});
      // The moves of this kind of fight, on the test's own rules card, with Fight to begin (ui/battle.js).
      const brief = U.fightBriefLive ? U.fightBriefLive(B) : null;
      if (brief) t.brief = brief;
      // The beats, as the race passes their rounds: the line on a banner at the top, and the beat's own effect.
      const beats = (K.val(enc.beats) || []).slice().sort((a, b) => a.round - b.round);
      const banner = U.el('<p class="fm-beat" aria-live="polite"></p>');
      document.body.appendChild(banner);
      let bannerT = 0, R = null;
      const beat = (b) => {
        try { if (b.run) b.run(B); } catch (e) { /* a beat's effect on the engine's fight is only for the record */ }
        banner.innerHTML = U.t(b.text); banner.classList.add("on");
        clearTimeout(bannerT); bannerT = setTimeout(() => banner.classList.remove("on"), 3600);
      };
      if (game === "race") t.report = (r) => { R = r; while (beats.length && r.dist >= ((beats[0].round - 1) / hold) * 100) beat(beats.shift()); };
      // The page as a test has it: the plate, and the test in place of the choices.
      const leaf = U.$("leaf");
      leaf.className = "leaf split testing";
      leaf.innerHTML = U.plate({ art: K.val(enc.art), keepArt: true, caption: K.val(enc.caption), tag: "yours", tagText: K.tr("A fight"), heading: K.val(enc.title) }) +
        '<div class="text"><div class="story" id="story"></div><div class="actions"><div class="choices" id="choices"></div><p class="hint" id="keyhint"></p></div></div>';
      U.where("<b>" + U.tr("Battle") + "</b><span>" + U.t(K.val(enc.title)) + "</span>");
      U.setBackdrop(t.stage); if (U.stageFx) U.stageFx.start(t.stage);
      if (K.Sound && K.Sound.test) K.Sound.test(game);
      // The test's own figure of you holds the weapon this fight is fought with (a mace duel: the mace).
      K.heldNow = K.fightItem(K.S, kind);
      const g = U.games[game](U.$("choices"), (outcome) => {
        K.heldNow = undefined;
        if (K.Sound && K.Sound.test) K.Sound.test(null);
        clearTimeout(bannerT); banner.remove();
        const won = outcome === "win";
        // Rounds stood: a race by how far it got; any other test, half the fight when it is lost.
        const rounds = won ? hold : R ? Math.max(0, Math.min(hold - 1, Math.floor((R.dist / 100) * hold))) : Math.floor(hold / 2);
        C.settle(won ? "win" : "lose", rounds);
      }, { t: enc.title, trial: t });
      U.redraw = () => g.draw();
    }
  };
})(window.K = window.K || {});
