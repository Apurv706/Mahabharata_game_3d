/* The bridge between the 2D game and its 3D battles. The story, the map, the tests and every window are the 2D game's
   own screens; only a fight opens the 3D layer (#b3d: one WebGL canvas and the fight's HUD over the page), and closes it
   again when the fight is settled. The renderer is started at the first fight and sleeps between fights. Without WebGL
   (or under the test harness) the 2D game's own fight screens are used instead. */
(function (K) {
  "use strict";
  const U = K.UI, G = K.G3;
  U.headless = () => !!K.headless || /jsdom/i.test(navigator.userAgent || "");
  U.startBattle2D = U.startBattle; // the 2D game's own fights: the fallback
  const B = (U.b3d = { ready: false, failed: false });
  B.on = function () {
    if (B.failed || U.headless() || !window.THREE) return false;
    document.body.classList.add("in3d");
    if (!B.ready) {
      try { G.init(); } catch (e) { if (window.console) console.error(e); }
      if (!G.ok) { B.failed = true; document.body.classList.remove("in3d"); return false; }
      G.fx.init(); G.onStageFrame(); B.ready = true;
    }
    G.asleep = false; G.focus(null, true);
    window.dispatchEvent(new Event("resize"));
    return true;
  };
  B.off = function () { document.body.classList.remove("in3d"); if (G.ok) { G.dropStage(); G.clear(G.actors); G.asleep = true; } };
  // A dark (or white) curtain over the change between the page and the field.
  let curtainEl = null;
  U.curtain = function (fn, white, ms) {
    if (!curtainEl) { curtainEl = U.el('<div class="curtain"></div>'); document.body.appendChild(curtainEl); }
    curtainEl.classList.toggle("white", !!white); curtainEl.classList.add("on");
    setTimeout(() => { try { fn(); } finally { setTimeout(() => curtainEl.classList.remove("on"), ms || 140); } }, 260);
  };
  U.artFor = (sc) => { let a = null; try { a = K.val(sc.art); } catch (e) { a = null; } return a || "origin"; };
  // A look for anyone a fight names: their own, an extra's, or one made from the name.
  const SHE = new Set(["devi", "ulupi", "kanaka", "madhavi", "draupadi", "kunti", "gandhari"]);
  const CLOTH = ["#8a3a2a", "#3f6b5a", "#5a4a8a", "#a3662a", "#2f5a7a", "#7a2f4a", "#6b6a2a", "#3a6a3a"], SKIN = ["#c27a44", "#b06c3c", "#9e6a40", "#c9905a", "#b9743f"];
  U.lookOf3d = function (id) {
    const L = G.lookOf(id); if (L) return L;
    const h = G.hash(id);
    return { pronoun: SHE.has(id) ? "she" : "he", stage: "adult", palette: [SKIN[h % SKIN.length], CLOTH[(h >> 3) % CLOTH.length], "#e2b55a"], headgear: SHE.has(id) ? null : ["band", "turban", "mukuta", null][(h >> 6) % 4], item: null };
  };
  // Hindi: the new battle words come with the 2D game's dictionary.
  const load = U.loadLang;
  U.loadLang = function (lang) { return load(lang).then((ok) => new Promise((res) => { if (!ok || lang === "en" || U.headless()) return res(ok); const s = document.createElement("script"); s.src = "js/i18n/" + lang + "3d.js"; s.onload = s.onerror = () => res(ok); document.head.appendChild(s); })); };
})(window.K = window.K || {});
