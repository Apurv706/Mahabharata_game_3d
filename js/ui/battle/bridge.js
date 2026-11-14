/* The bridge between the 2D game and its 3D battles. The story, the map, the tests and every window are the 2D game's
   own screens; only a fight opens the 3D layer (#b3d: one WebGL canvas and the fight's HUD over the page), and closes it
   again when the fight is settled. The renderer is started at the first fight and sleeps between fights. Without WebGL
   (or under the test harness) the 2D game's own fight screens are used instead. */
(function (K) {
  "use strict";
  const U = K.UI, G = K.G3;
  // Under a test harness the 2D game's own screens are used, as its tests expect: jsdom, or a driven browser that has not
  // asked for 3D (?3d=1 on the address, which tests/smoke3d.js gives).
  U.headless = () => !!K.headless || /jsdom/i.test(navigator.userAgent || "") || (!!navigator.webdriver && !/[?&]3d=1\b/.test(location.search || "") && !window.K_3D);
  U.startBattle2D = U.startBattle; // the 2D game's own fights: the fallback
  const B = (U.b3d = { ready: false, failed: false });
  // (3D can be switched off: a preference `no3d`, or ?2d=1 on the address. The 2D game's own screens are used then.)
  U.no3d = () => { try { return !!(K.prefs && K.prefs().no3d) || /[?&]2d=1\b/.test(location.search || ""); } catch (e) { return false; } };
  B.can = () => !B.failed && !U.headless() && !!window.THREE && !U.no3d();
  B.on = function () {
    if (B.failed || U.headless() || !window.THREE || U.no3d()) return false;
    document.body.classList.add("in3d");
    // (owner, 13 November: "game controls automatically start text selection and then the game window zooms in". A held
    // or quickly repeated thumb on a button must never select text, show the iPhone's magnifier, or zoom the page: pinch and
    // double-tap zoom are stopped while the 3D view is up. A card that scrolls still scrolls.)
    if (!B.guarded) { B.guarded = true; let last = 0;
      const in3 = () => document.body.classList.contains("in3d");
      document.addEventListener("gesturestart", (e) => { if (in3()) e.preventDefault(); }, { passive: false });
      document.addEventListener("touchmove", (e) => { if (in3() && e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
      document.addEventListener("touchend", (e) => { if (!in3()) return; const now = Date.now(), t = e.target; if (now - last < 350 && !(t && t.closest && t.closest("input, textarea, select"))) e.preventDefault(); last = now; }, { passive: false });
      document.addEventListener("selectstart", (e) => { if (in3() && !(e.target && e.target.closest && e.target.closest("input, textarea"))) e.preventDefault(); });
      document.addEventListener("contextmenu", (e) => { if (in3() && e.pointerType !== "mouse" && !(e.target && e.target.closest && e.target.closest("input, textarea"))) e.preventDefault(); }); }
    if (!B.ready) {
      try { G.init(); } catch (e) { if (window.console) console.error(e); }
      if (!G.ok) { // 3D would not start. Not for good: the next fight asks again (three times in all), and the player is told, once, why this one is flat.
        B.tries = (B.tries || 0) + 1; if (B.tries >= 3) { B.failed = true; document.body.classList.add("no-gl"); } document.body.classList.remove("in3d");
        if (!B.told) { B.told = true; try { const n = U.el('<div role="status" style="position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:999;max-width:86vw;padding:9px 14px;border-radius:10px;background:rgba(28,20,14,.94);color:#efe6cf;font-size:13px;text-align:center;border:1px solid #c9a24a">' + U.tr("3D could not start on this device just now, so this fight is in 2D.") + "</div>"); document.body.appendChild(n); setTimeout(() => n.remove(), 7000); } catch (e) {} }
        if (window.console) console.warn("3D off: " + (G.why || "no WebGL")); return false; }
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
  // Hindi: the new battle words come with the 2D game's dictionary (a published part carries them inside its Hindi file).
  const load = U.loadLang;
  U.loadLang = function (lang) { return load(lang).then((ok) => new Promise((res) => { if (!ok || lang === "en" || U.headless() || (window.K_PART && window.K_PART.hi3d)) return res(ok); const s = document.createElement("script"); s.src = "js/i18n/" + lang + "3d.js"; s.onload = s.onerror = () => res(ok); document.head.appendChild(s); })); };
})(window.K = window.K || {});
