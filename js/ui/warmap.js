/* The war-day map (content/war_reach.js): on a scene with `map` and `spots`, the field painting from
   above sits at the head of the page with a tappable spot for each place to stand. A spot does what
   its choice does (it presses that choice's button), so the choices below stay the way to choose
   for the keyboard, and headless runs pick from them as usual. */
(function (K) {
  "use strict";
  const U = K.UI;
  const render = U.renderScene;
  U.renderScene = function (sc) {
    const out = render.apply(this, arguments);
    if (!sc || !sc.map || K.headless) return out;
    const story = U.$("story"), spots = K.val(sc.spots, K.S) || [];
    // Only once the page is up (the title card and painting beats call back here when they are done).
    if (!story || story.querySelector(".warmap") || !spots.some((p) => U.$("choice-" + p.c))) return out;
    const fig = document.createElement("figure");
    fig.className = "warmap";
    fig.innerHTML = '<img src="' + U.esc(U.artUrl(sc.map)) + '" alt="" draggable="false">' + spots.map((p) =>
      '<button type="button" class="spot' + (p.c === "line" ? " own" : "") + '" data-c="' + U.esc(p.c) + '" style="left:' + p.x + "%;top:" + p.y + '%">' +
      '<span class="dot"></span><span class="lbl">' + U.t(p.label) + "</span></button>").join("");
    fig.querySelectorAll(".spot").forEach((b) => b.addEventListener("click", () => {
      const c = U.$("choice-" + b.dataset.c);
      if (!c || c.disabled) return;
      fig.querySelectorAll(".spot").forEach((x) => { x.disabled = true; x.classList.toggle("on", x === b); });
      c.click();
    }));
    story.prepend(fig);
    return out;
  };
  const css = document.createElement("style");
  css.textContent = ".warmap{position:relative;margin:0 auto 14px;max-width:min(100%,calc(42vh * 16 / 9));border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.35);line-height:0}" +
    ".warmap img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;display:block}" +
    ".warmap .spot{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:0;padding:4px;min-width:44px;min-height:44px;cursor:pointer;color:#fff8e6;font:inherit;line-height:1.1}" +
    ".warmap .dot{width:18px;height:18px;border-radius:50%;background:#c0472f;border:2px solid #fff3d6;box-shadow:0 0 0 4px rgba(192,71,47,.35);animation:wmPulse 1.8s ease-in-out infinite}" +
    ".warmap .own .dot{background:#3b6fb0;box-shadow:0 0 0 4px rgba(59,111,176,.35)}" +
    ".warmap .lbl{font-size:.74rem;font-weight:600;white-space:nowrap;padding:2px 7px;border-radius:6px;background:rgba(28,18,12,.78)}" +
    ".warmap .spot:hover .lbl,.warmap .spot:focus-visible .lbl,.warmap .spot.on .lbl{background:#7a2a1a}" +
    ".warmap .spot:disabled{cursor:default;opacity:.55}.warmap .spot.on{opacity:1}" +
    "@keyframes wmPulse{50%{box-shadow:0 0 0 8px rgba(192,71,47,0)}}" +
    "html.calm .warmap .dot{animation:none}";
  document.head.appendChild(css);
})(window.K);
