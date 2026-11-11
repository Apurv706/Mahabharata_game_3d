/* Orders for the day (content/war_orders.js; owner, 6 November): at the first scene of each battle day a life reaches, the
   commander's orders take the whole screen over the page: his portrait and name, what happened since your last orders
   (and your own part in it, from the journal), the army's aim today, and your orders. "To your place" (or Enter, or a tap
   outside the card) goes on to the day. Over the page once it is up (the title card and the painting's beats first). */
(function (K) {
  "use strict";
  const U = K.UI, O = K.ORDERS;
  if (!O) return;
  const T = (s, p) => U.tr(s, p);
  let open = null;
  const render = U.renderScene;
  U.renderScene = function (sc) {
    const out = render.apply(this, arguments);
    // Another page drawn under the orders (a checkpoint, a save loaded, a new life): they belonged to the page before.
    if (open && sc && open.sc !== sc.id) open.close(true);
    if (!sc || K.headless || open || /jsdom/i.test(navigator.userAgent || "")) return out;
    const day = O.due(sc, K.S);
    if (!day || !U.$("story") || !document.querySelector("#choices .choice")) return out; // the page first
    show(day, sc);
    return out;
  };
  function show(day, sc) {
    const S = K.S, info = O.info(day, S), still = U.calm();
    let art = null; try { art = typeof sc.art === "function" ? sc.art(S) : sc.art; } catch (e) { art = null; }
    const bg = U.bgUrl(typeof art === "string" ? art : "war_eve"), face = U.portraitKey(info.chief.who);
    const li = (s) => "<li>" + U.esc(K.text(s, null, S)) + "</li>";
    const el = U.el('<div class="moment k-orders orders' + (still ? " still" : "") + '" role="dialog" aria-modal="true" aria-labelledby="ord-t">' +
      '<div class="mo-art" style="--img:url(\'' + bg + '\')"></div>' +
      '<div class="ord" tabindex="-1"><div class="ord-head">' + (face ? '<i class="ord-face" style="--img:url(\'' + U.artUrl(face) + '\')" aria-hidden="true"></i>' : "") +
        '<div class="ord-who"><small id="ord-t">' + U.esc(T("Orders · Day {n}", { n: day })) + "</small><b>" + U.esc(T(info.chief.name)) + "</b><span>" + U.esc(T(info.chief.title)) + "</span></div></div>" +
        '<section class="ord-since"><h3>' + U.esc(T(info.head)) + "</h3><ul>" + (info.more ? "<li>…</li>" : "") + info.since.map(li).join("") + "</ul>" +
          (info.mine.length ? '<p class="ord-mine"><b>' + U.esc(T("Your part")) + "</b> " + info.mine.map((j) => U.esc(K.entryText(j, S))).join(" ") + "</p>" : "") + "</section>" +
        (info.aim ? '<section class="ord-today"><h3>' + U.esc(T("Today")) + "</h3><p>" + U.esc(K.text(info.aim, null, S)) + "</p></section>" : "") +
        (info.you ? '<section class="ord-you"><h3>' + U.esc(T("Your orders")) + "</h3><p>" + U.esc(K.text(info.you, null, S)) + "</p></section>" : "") +
        '<div class="btnrow"><button type="button" class="cta ord-go">' + U.esc(T("To your place")) + "</button></div></div></div>");
    document.body.appendChild(el);
    const t0 = performance.now();
    const close = (gone) => { // gone: its page has been replaced; taken away at once, nothing focused
      if (!open || open.el !== el) return;
      O.given(day, S); if (K.save && !gone) K.save();
      open = null; el.classList.add("out"); el.classList.remove("in");
      document.removeEventListener("keydown", onKey, true);
      if (gone) { el.remove(); return; }
      setTimeout(() => el.remove(), still ? 0 : 420);
      const first = document.querySelector("#choices .choice:not([disabled])"); if (first) try { first.focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
    };
    open = { el, day, sc: sc.id, close };
    const onKey = (e) => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); e.stopPropagation(); if (performance.now() - t0 > 600) close(); } };
    document.addEventListener("keydown", onKey, true);
    el.querySelector(".ord-go").addEventListener("click", () => close());
    // A tap outside the card goes on too (not at once: the tap that brought the page must not dismiss it).
    el.addEventListener("click", (e) => { if (!e.target.closest(".ord") && performance.now() - t0 > 900) close(); });
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
    try { el.querySelector(".ord").focus({ preventScroll: true }); } catch (e) { /* older browsers */ }
    if (K.Sound) K.Sound.play("conch");
  }
  U.ordersOpen = () => !!open;
})(window.K);
