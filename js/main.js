/* Boot: start the 3D view, wire the top bar, check the story's references, choose the language, open the title. */
(function (K) {
  "use strict";
  const U = K.UI, G = K.G3;

  // Static content check: every reference in the story must point at something real.
  K.validate = function () {
    const problems = [];
    const ref = (from, id) => { if (typeof id === "string" && !K.SCENES[id] && !K.SLOTS[id]) problems.push(from + " → missing scene " + id); };
    for (const [id, d] of Object.entries(K.SLOTS)) { ref(id + ".then", d.then); d.pool.forEach((e) => ref(id + ".pool", e)); }
    const enc = (from, id) => { if (typeof id === "string" && !K.ENCOUNTERS[id]) problems.push(from + " → missing encounter " + id); };
    for (const sc of Object.values(K.SCENES)) {
      ref(sc.id + ".next", sc.next); ref(sc.id + ".skipTo", sc.skipTo);
      if (sc.when && !sc.skipTo) problems.push(sc.id + " has a condition but nowhere to skip to");
      if (!sc.ending && typeof sc.choices !== "function" && !(sc.choices || []).length) problems.push(sc.id + " has no choices");
      if (Array.isArray(sc.choices)) for (const c of sc.choices) {
        ref(sc.id + ":" + c.id, c.next); enc(sc.id + ":" + c.id, c.combat);
        if (!c.next && !sc.next && !c.check && !c.combat) problems.push(sc.id + ":" + c.id + " leads nowhere");
        if (c.check) for (const br of [c.check.pass, c.check.fail]) if (br) { ref(sc.id + ":" + c.id + " check", br.next); enc(sc.id + ":" + c.id + " check", br.combat); }
        if (c.game) { if (!U.games || !U.games[c.game]) problems.push(sc.id + ":" + c.id + " unknown game " + c.game); for (const br of [c.win, c.lose]) if (br) ref(sc.id + ":" + c.id + " game", br.next); }
        if (c.fx && c.fx.vowTake && !K.VOWS[c.fx.vowTake]) problems.push(sc.id + ":" + c.id + " unknown vow");
      }
    }
    for (const e of Object.values(K.ENCOUNTERS)) for (const o of ["win", "lose", "flee", "spare"]) if (e[o]) ref(e.id + "." + o, e[o].next);
    if (!K.SCENES[K.FIRST_SCENE]) problems.push("FIRST_SCENE missing");
    if (!K.SCENES.end_death) problems.push("end_death missing");
    return problems;
  };

  // The 3D view first (without it the story still runs, on a plain ground).
  if (!U.headless()) {
    try { G.init(); } catch (e) { if (window.console) console.error(e); }
    if (G.ok) { G.fx.init(); G.onStageFrame(); U.initStory(); }
    else document.body.classList.add("no-gl");
  }
  K.on("scene", (sc) => { if (U.screen) U.screen(null); U.renderScene(sc); });
  U.$("nav-char").addEventListener("click", () => U.openCharacter());
  U.$("nav-journal").addEventListener("click", () => U.openJournal());
  U.$("nav-map").addEventListener("click", () => U.openMap());
  U.$("nav-menu").addEventListener("click", () => U.openMenu());
  U.$("nav-standing").addEventListener("click", () => U.openStanding());
  if (K.prefs().bigText) document.body.classList.add("big-text");
  U.applyCalm();
  U.fpsMeter();
  // Sound starts on the first touch (browsers ask for one).
  const wake = () => { if (K.Sound && K.Sound.refresh) K.Sound.refresh(); };
  document.addEventListener("pointerdown", wake, { once: true }); document.addEventListener("keydown", wake, { once: true });
  // Language: the saved choice, else Hindi for a browser set to Hindi, else English.
  const saved = K.prefs().lang, nav = (navigator.languages && navigator.languages[0]) || navigator.language || "";
  K.lang = K.LANGS[saved] ? saved : /^hi\b/i.test(nav) ? "hi" : "en";
  const problems = K.validate();
  if (problems.length && window.console) console.warn("Content problems:\n" + problems.join("\n"));
  const boot = () => { U.applyStatic(); U.renderTitle(); };
  if (K.lang === "en" || (K.hasStrings && K.hasStrings(K.lang))) boot();
  else { U.applyStatic(); U.loadLang(K.lang).then((ok) => { if (!ok) K.lang = "en"; boot(); }); }
})(window.K = window.K || {});
