/* Just the fights: sixteen of the game's battles in the order a life meets them, from the miller's son at the fair to the
   night raid, with a fighter of the path you choose who grows from fight to fight. Nothing here is saved or counted;
   a life in progress is left as it was. */
(function (K) {
  "use strict";
  const U = K.UI;
  const LADDER = [["e_ugra", 1, 10], ["e_spar", 2, 17], ["e_panchala", 2, 18], ["e_border", 3, 22], ["e_kings", 3, 25], ["e_jayadratha", 5, 34], ["e_gandharva", 5, 36], ["e_cattle", 5, 43],
    ["e_day1", 6, 44], ["e_guard", 6, 44], ["e_wheel", 6, 44], ["e_night", 6, 44], ["e_day16", 6, 44], ["e_dushasana", 6, 44], ["e_day18", 6, 44], ["e_raid", 6, 44]];
  K.FIGHTER_LADDER = LADDER;
  function fighter(path, pronoun) {
    const S = K.newLife(); S.name = K.tr("The fighter"); S.pronoun = pronoun; S.origin = "hastinapura"; S.temperament = "bold"; S.heirloom = "bow"; S.path = path; S.side = "pandava"; S.fighter = true; S.items.herbs = 2;
    return S;
  }
  function grow(S, act, age) { S.act = act; S.age = age; for (const k in S.attrs) S.attrs[k] = Math.min(7, 2 + Math.round(act * 0.7)); for (const k in S.skills) S.skills[k] = Math.min(6, 1 + Math.round(act * 0.7)); S.items.herbs = Math.max(S.items.herbs || 0, 2); }
  U.openArena = function () {
    const paths = Object.entries(K.PATHS || {}).filter(([id]) => K.RT.SKILL[id]);
    let pron = "she";
    U.openModal("Just the fights", '<p class="muted">' + U.tr("Sixteen battles in the order a life meets them. Choose how you fight; your fighter grows as the ladder climbs. Nothing here is saved.") + '</p><div class="set-row"><span>' + U.tr("How should the bards speak of you?") + '</span><div class="seg" id="ar-pron"><button type="button" data-p="she" aria-checked="true">' + U.tr("She") + '</button><button type="button" data-p="he" aria-checked="false">' + U.tr("He") + '</button></div></div><div class="cr-picks" id="ar-paths"></div>' +
      (K.prefs().fighterBest ? '<p class="small muted">' + U.tr("Furthest reached: fight {n} of {m}", { n: K.prefs().fighterBest, m: LADDER.length }) + "</p>" : ""), (el) => {
      el.querySelectorAll("#ar-pron button").forEach((b) => b.addEventListener("click", () => { pron = b.dataset.p; el.querySelectorAll("#ar-pron button").forEach((x) => x.setAttribute("aria-checked", String(x === b))); }));
      for (const [id, p] of paths) el.querySelector("#ar-paths").appendChild(U.button("pick", "<b>" + U.tr(p.name) + "</b><small>" + U.tr(K.ABILITIES[K.RT.SKILL[id]].name) + "</small>", () => { U.closeModal(); run(fighter(id, pron), 0); }));
    });
  };
  function run(S, i) {
    const was = K.S; K.S = S;
    const leave = () => { K.S = null; void was; U.curtain(() => U.renderTitle()); };
    const step = (n) => {
      if (n >= LADDER.length) return card(K.tr("The ladder is climbed"), K.tr("Sixteen fights, and you are still standing."), [[K.tr("Back to the title"), leave]]);
      const [id, act, age] = LADDER[n]; grow(S, act, age);
      if (n + 1 > (K.prefs().fighterBest || 0)) K.prefs({ fighterBest: n + 1 });
      if (U.screen) U.screen(null);
      U.startBattle(id, (out) => {
        if (out === "win" || out === "spare") return card(K.tr("Fight {n} of {m} won", { n: n + 1, m: LADDER.length }), K.text(K.val(K.ENCOUNTERS[id].title) || ""), [[K.tr(n + 1 < LADDER.length ? "The next fight" : "Continue"), () => step(n + 1)], [K.tr("Leave the fight"), leave]]);
        S.alive = true; card(K.tr("You are beaten"), K.text(K.val(K.ENCOUNTERS[id].title) || ""), [[K.tr("Try again"), () => step(n)], [K.tr("Leave the fight"), leave]]);
      });
    };
    function card(title, text, btns) {
      const el = U.el('<div class="b-card"><h2>' + U.esc(title) + "</h2><p>" + U.esc(text) + '</p><div class="btnrow"></div></div>');
      btns.forEach(([label, fn], k) => el.querySelector(".btnrow").appendChild(U.button(k ? "ghost" : "cta", U.esc(label), () => { el.remove(); U.keys([]); fn(); })));
      U.layout("full"); U.$("stagehud").appendChild(el); U.keys(btns.map(([, fn]) => () => { el.remove(); U.keys([]); fn(); }));
    }
    step(i);
  }
  // The practice ground of the 2D game is this ladder here; a lost fight offers nothing more than the story does.
  U.practiceOffer = null; U.practiceAfterFight = null; U.askMode = null;
})(window.K = window.K || {});
