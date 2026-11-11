/* The phone's notch and Dynamic Island. The CSS keeps clear of them through --sat / --sab
   (env(safe-area-inset-*), base.css). Inside a host's frame (the private play page) the phone may
   report no inset even when the page is drawn under the island, and text then runs behind it.
   So: when the page fills the whole screen of an iPhone with a notch or island, and the inset reads
   0, use the island's height instead. */
(function (K) {
  "use strict";
  const probe = (side) => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding-" + side + ":env(safe-area-inset-" + side + ",0px)";
    document.body.appendChild(d);
    const v = parseFloat(getComputedStyle(d)["padding" + side[0].toUpperCase() + side.slice(1)]) || 0;
    d.remove();
    return v;
  };
  function fit() {
    if (!document.body) return;
    const root = document.documentElement;
    root.style.removeProperty("--sat"); root.style.removeProperty("--sab");
    const ua = navigator.userAgent || "";
    const iPhone = /iPhone/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 500);
    if (!iPhone) return;
    const tall = Math.max(screen.width, screen.height) >= 812;               // the phones with a notch or an island
    const upright = window.innerHeight > window.innerWidth;
    const full = window.innerHeight >= Math.max(screen.width, screen.height) - 4; // drawn from the very top of the screen
    if (!tall || !upright || !full) return;
    if (probe("top") < 1) root.style.setProperty("--sat", "54px");
    if (probe("bottom") < 1) root.style.setProperty("--sab", "28px");
  }
  K.UI = K.UI || {};
  K.UI.fitSafeArea = fit;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fit); else fit();
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", () => setTimeout(fit, 300));
})(window.K = window.K || {});
