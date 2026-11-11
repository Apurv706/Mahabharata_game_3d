/* Screen-fit checks for the real-time dev screen (ui/realtime.js, PRD §18.15), after the layout page's tools/fit.js:
   at rest no two figures overlap more than a quarter of their visible width (body and shield); no figure within
   6 px of the stage's edge; the front row's figure 24-40% of the stage high; Orders and Aid open over the controls
   at exactly their height, never over a foot or a ground ring, never moving the stage; nothing spills sideways;
   touch targets 44 px on phones. Phones iPhone SE, iPhone 15 and 360x640, a 1366x657 laptop; English and Hindi.
   Usage: node tests/rtfit.js [--shots DIR]   (needs Playwright) */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
let pw; try { pw = require("playwright"); } catch (e) { try { pw = require("/usr/local/lib/node_modules_global/playwright"); } catch (e2) { console.error("Playwright is not installed"); process.exit(2); } }
const ROOT = path.join(__dirname, "..");
const SHOTS = (process.argv.indexOf("--shots") > 0 && process.argv[process.argv.indexOf("--shots") + 1]) || "";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".json": "application/json", ".mp3": "audio/mpeg" };
const DEVICES = [
  { name: "iPhone SE", w: 375, h: 667, mobile: true }, { name: "iPhone 15", w: 393, h: 852, mobile: true },
  { name: "360x640", w: 360, h: 640, mobile: true }, { name: "Laptop 1366x657", w: 1366, h: 657, mobile: false }];
const FIGHTS = ["e_guard", "e_border", "e_bandits"];
function measure(open) {
  const V = K.UI.rtScreen(), st = V.stage, sr = st.getBoundingClientRect(), out = [];
  const R = (e) => e.getBoundingClientRect();
  const inter = (a, b, pad = 0) => a.left < b.right - pad && b.left < a.right - pad && a.top < b.bottom - pad && b.top < a.bottom - pad;
  // Visible width: the body and a shield, about 0.42 of a figure's height, centred on its feet (the layout page
  // measures 0.36 for the body core on the real-time screen and 0.5 with the spear hand on the war day).
  const figs = [...V.actors.values()].filter((a) => a.u.hp > 0).map((a) => {
    const body = R(a.svg.querySelector(".pp-body")), x = sr.left + a.x, hw = a.fh * 0.21;
    return { id: a.u.uid, d: a.d, l: x - hw, r: x + hw, t: sr.bottom - a.gy - a.fh, b: sr.bottom - a.gy, h: a.fh, bodyH: body.height };
  });
  for (let i = 0; i < figs.length; i++) for (let k = i + 1; k < figs.length; k++) {
    const p = figs[i], q = figs[k], ov = Math.min(p.r, q.r) - Math.max(p.l, q.l), vy = Math.min(p.b, q.b) - Math.max(p.t, q.t);
    const w = Math.min(p.r - p.l, q.r - q.l);
    if (vy > 0 && ov > 0.25 * w + 0.5) out.push("figures overlap " + p.id + "/" + q.id + " " + Math.round(ov / w * 100) + "%");
  }
  for (const f of figs) if (f.l < sr.left + 6 || f.r > sr.right - 6) out.push("figure within 6 px of the stage edge: " + f.id);
  const me = figs.find((f) => f.id === "p");
  const ratio = me ? me.bodyH / (1 - 0.12 * me.d) / sr.height : 0;
  if (ratio < 0.24 || ratio > 0.4) out.push("your figure " + Math.round(ratio * 100) + "% of the stage height");
  if (document.documentElement.scrollWidth > innerWidth) out.push("sideways scroll");
  if (open) {
    const panel = V.el.querySelector("." + open + "-sheet"), ctl = V.el.querySelector(".ctl"), pr = R(panel);
    if (innerWidth < 820 && ctl && getComputedStyle(ctl).display !== "none") { const cr = R(ctl); if (Math.abs(pr.top - cr.top) > 1 || Math.abs(pr.height - cr.height) > 1) out.push(open + " menu not at the controls' height (" + Math.round(pr.height) + " vs " + Math.round(cr.height) + ")"); }
    for (const f of figs) if (inter(pr, { left: f.l, right: f.r, top: f.b - f.h * 0.16, bottom: f.b + 4 })) out.push(open + " menu covers the feet of " + f.id);
    for (const g of V.world.querySelectorAll(".mark:not(.lane)")) if (inter(pr, R(g))) out.push(open + " menu covers a ground ring");
    if (Math.abs(R(st).top - V.stageTop) > 0.5) out.push(open + " menu moved the stage");
    if (!panel.querySelector(".flame")) out.push(open + " menu without its diya");
    if (panel.scrollHeight > panel.clientHeight + 1) out.push(open + " menu content does not fit");
    // "Resume ▶" at the right end of the panel, inside it, a full touch target on phones
    const rb = panel.querySelector(".resume"), rr = rb && R(rb);
    if (!rb || !rr.width) out.push(open + " menu without Resume");
    else {
      if (rr.left < pr.left - 0.5 || rr.right > pr.right + 0.5 || rr.top < pr.top - 0.5 || rr.bottom > pr.bottom + 0.5) out.push(open + " Resume spills out of the menu");
      for (const o of panel.querySelectorAll("button:not(.resume)")) { const q = R(o); if (q.width && q.right > rr.left + 0.5 && q.bottom > rr.top && q.top < rr.bottom) out.push(open + " Resume not at the right end"); }
      if (innerWidth < 820 && (rr.height < 43.5 || rr.width < 43.5)) out.push(open + " Resume under 44 px");
      for (const o of panel.querySelectorAll("button")) if (o.offsetWidth && o.scrollWidth > o.clientWidth + 1) out.push(open + " label cut: " + o.textContent.trim());
    }
  }
  // A laptop without a touch screen: the key strip, no phone controls (a touch laptop the reverse).
  if (innerWidth >= 820 && !matchMedia("(pointer: coarse)").matches) {
    const ks = V.el.querySelector(".kstrip"), ctl = V.el.querySelector(".ctl");
    if (!V.el.classList.contains("wide") || V.el.classList.contains("touch") || getComputedStyle(ks).display === "none" || getComputedStyle(ctl).display !== "none") out.push("a laptop without touch: the key strip should show and the phone controls hide");
  }
  if (innerWidth < 820) for (const b of V.el.querySelectorAll(".ctl button, .hud button")) { const r = R(b); if (r.width && (r.width < 43.5 || r.height < 43.5)) out.push("touch target under 44 px: " + (b.className || b.dataset.act)); }
  return { problems: out, ratio: Math.round(ratio * 100) };
}
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); if (f.endsWith("/")) f += "index.html"; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); r.end(d); }); });
srv.listen(0, async () => {
  const port = srv.address().port, b = await pw.chromium.launch();
  let fails = 0, n = 0;
  const only = process.argv.indexOf("--device") > 0 ? process.argv[process.argv.indexOf("--device") + 1] : null;
  for (const dev of DEVICES.filter((d) => !only || d.name === only)) for (const lang of ["en", "hi"]) for (const enc of FIGHTS) {
    const ctx = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.mobile ? 2 : 1, isMobile: dev.mobile, hasTouch: dev.mobile });
    const pg = await ctx.newPage(); const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
    await pg.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
    await pg.goto("http://localhost:" + port + "/index.html?rt=1"); await pg.waitForTimeout(500);
    if (lang === "hi") { await pg.evaluate(() => new Promise((r) => K.UI.setLang("hi", r))); await pg.waitForTimeout(300); }
    await pg.evaluate((enc) => { const S = K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 30, act: 6, path: "archer", side: "pandava", teacher: "drona" }); S.attrs.might = 3; S.attrs.grace = 3; S.items.herbs = 2; S.flags.push("role_front"); S.friend = "charu"; S.bonds.charu = 8; S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1; K.seed(3); K.UI.startRealtime(enc, () => {}); K.UI.rtScreen().paused = true; }, enc); // the fight as it begins (no drift with the page's timing)
    await pg.waitForTimeout(150); // at rest: the fight just begun
    await pg.evaluate(() => { const V = K.UI.rtScreen(); V.paused = true; V.stageTop = V.stage.getBoundingClientRect().top; });
    const tag = dev.name + " " + lang + " " + enc, res = [];
    res.push(await pg.evaluate(measure, null));
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, (dev.name + "_" + lang + "_" + enc).replace(/\W+/g, "_") + ".png") });
    for (const open of ["orders", "aid"]) {
      await pg.evaluate((o) => { document.querySelector('#rt [data-act="' + o + '"]').click(); }, open); await pg.waitForTimeout(250);
      res.push(await pg.evaluate(measure, open));
      if (SHOTS && enc === "e_border") await pg.screenshot({ path: path.join(SHOTS, (dev.name + "_" + lang + "_" + enc + "_" + open).replace(/\W+/g, "_") + ".png") });
      // tapping Resume closes the menu and the fight goes on
      res.push(await pg.evaluate((o) => { const V = K.UI.rtScreen(), b = V.el.querySelector("." + o + "-sheet .resume"); if (!b) return { problems: [] }; b.click(); const p = []; if (!V.el.querySelector("." + o + "-sheet").hidden || V.sheet || V.paused) p.push(o + " Resume did not close the menu and resume"); return { problems: p }; }, open));
      await pg.keyboard.press("Escape").catch(() => {}); await pg.evaluate(() => { const V = K.UI.rtScreen(); V.el.querySelectorAll(".sheet").forEach((s) => (s.hidden = true)); V.sheet = null; V.paused = true; });
    }
    // A life's first fight: the rules card, then the walkthrough; the fight waits through both; Skip ends it.
    if (enc === "e_guard") {
      await pg.evaluate(() => { const S = K.S; S.briefed = []; S.fightTour = 0; K.seed(3); K.UI.startRealtime("e_guard", () => {}); });
      await pg.waitForTimeout(400);
      if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, (dev.name + "_" + lang + "_rules_card").replace(/\W+/g, "_") + ".png") });
      res.push(await pg.evaluate(() => { const V = K.UI.rtScreen(), p = []; const card = V.el.querySelector(".fbrief-wrap"); if (!card) return { problems: ["no rules card on the first fight"] };
        const r = card.querySelector(".fbrief").getBoundingClientRect(); if (r.top < -1 || r.bottom > innerHeight + 1 && card.scrollHeight <= card.clientHeight) p.push("rules card does not fit");
        V.t0 = V.R.t; card.querySelector(".fb-go").click(); if (!V.el.querySelector(".tour-cap")) p.push("no walkthrough after the rules card"); return { problems: p }; }));
      await pg.mouse.click(dev.w / 2, dev.h / 3); await pg.waitForTimeout(300);
      if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, (dev.name + "_" + lang + "_tour").replace(/\W+/g, "_") + ".png") });
      res.push(await pg.evaluate(() => { const V = K.UI.rtScreen(), p = [], cap = V.el.querySelector(".tour-cap"), sr = V.stage.getBoundingClientRect();
        if (!cap || !/^2 /.test(cap.querySelector(".tc-step").textContent.trim()) && !/2/.test(cap.querySelector(".tc-step").textContent)) p.push("a tap did not go on to the next step");
        if (cap) { const c = cap.getBoundingClientRect(); if (c.left < -0.5 || c.right > innerWidth + 0.5 || c.top < sr.top - 0.5) p.push("walkthrough caption spills"); }
        if (V.R.t !== V.t0) p.push("the fight did not wait during the rules card and walkthrough");
        const sk = cap && cap.querySelector(".tc-skip"); if (sk) sk.click();
        if (V.el.querySelector(".tour-cap") || V.briefing) p.push("Skip did not end the walkthrough"); return { problems: p }; }));
    }
    const probs = [...new Set(res.flatMap((r) => r.problems).concat(errs.map((e) => "script error: " + e)))];
    n++; if (probs.length) fails++;
    console.log((probs.length ? "✗ " : "ok ") + tag + " (figure " + res[0].ratio + "%)" + (probs.length ? "\n    " + probs.join("\n    ") : ""));
    await ctx.close();
  }
  console.log((n - fails) + "/" + n + " screens fit");
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
