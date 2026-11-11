/* Screen-fit checks for the new turn-based war-day screen (ui/warday.js, PRD §18.15 stage 2), behind the developer
   switch: at rest no two figures overlap more than a quarter of their visible width (body and shield); nothing within
   6 px of the stage's edge; the front row's figure 24-40% of the stage high; the ×2 pill on a ring in sight; your
   side's bars green, the foes' red; the place prompt before round 1; Company and Aid open over the move cards at
   exactly their height (on a laptop, in the sky under their button), never over a foot or a ground ring, never moving
   the stage, with a diya, their content fitting; no label cut; touch targets 44 px on phones. A war-day line fight, a
   holding fight and the wheel (with and without your company); iPhone SE, iPhone 15, 360x640 and a 1366x657 laptop;
   English and Hindi. Usage: node tests/warfit.js [--shots DIR]   (needs Playwright) */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
let pw; try { pw = require("playwright"); } catch (e) { try { pw = require("/usr/local/lib/node_modules_global/playwright"); } catch (e2) { console.error("Playwright is not installed"); process.exit(2); } }
const ROOT = path.join(__dirname, "..");
const SHOTS = (process.argv.indexOf("--shots") > 0 && process.argv[process.argv.indexOf("--shots") + 1]) || "";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".json": "application/json", ".mp3": "audio/mpeg" };
const DEVICES = [
  { name: "iPhone SE", w: 375, h: 667, mobile: true }, { name: "iPhone 15", w: 393, h: 852, mobile: true },
  { name: "360x640", w: 360, h: 640, mobile: true }, { name: "Laptop 1366x657", w: 1366, h: 657, mobile: false }];
const FIGHTS = [["e_day16", "archer"], ["hold_karna", "charioteer"], ["e_ring", "mace"], ["e_last_stand", "strategist"]];
function measure(open) {
  const V = K.UI.warScreen(), st = V.stage, sr = st.getBoundingClientRect(), out = [];
  const R = (e) => e.getBoundingClientRect();
  const inter = (a, b, pad = 0) => a.left < b.right - pad && b.left < a.right - pad && a.top < b.bottom - pad && b.top < a.bottom - pad;
  const phone = innerWidth < 820;
  // Visible width: the body and a shield, about 0.42 of a figure's height, centred on its feet.
  const figs = [...V.figs.values()].filter((f) => !f.dead).map((f) => {
    const body = R(f.svg.querySelector(".pp-body")), x = sr.left + f.x, hw = f.fh * 0.21;
    return { id: f.key, side: f.side, d: f.d, l: x - hw, r: x + hw, t: sr.bottom - f.gy - f.fh, b: sr.bottom - f.gy, h: f.fh, bodyH: body.height, f };
  });
  for (let i = 0; i < figs.length; i++) for (let k = i + 1; k < figs.length; k++) {
    const p = figs[i], q = figs[k], ov = Math.min(p.r, q.r) - Math.max(p.l, q.l), vy = Math.min(p.b, q.b) - Math.max(p.t, q.t);
    const w = Math.min(p.r - p.l, q.r - q.l);
    if (vy > 0 && ov > 0.25 * w + 0.5) out.push("figures overlap " + p.id + "/" + q.id + " " + Math.round(ov / w * 100) + "%");
  }
  for (const f of figs) if (f.l < sr.left + 6 || f.r > sr.right - 6) out.push("figure within 6 px of the stage edge: " + f.id);
  const me = figs.find((f) => f.id === "p:0");
  const ratio = me ? me.bodyH / (1 - 0.12 * me.d) / sr.height : 0;
  if (ratio < 0.24 || ratio > 0.4) out.push("your figure " + Math.round(ratio * 100) + "% of the stage height");
  if (document.documentElement.scrollWidth > innerWidth) out.push("sideways scroll");
  // Bars: green on your side (you included), red on the foes'.
  const green = (c) => { const m = c.match(/\d+/g).map(Number); return m[1] > m[0] && m[1] > m[2] - 10; };
  for (const f of figs) {
    const b = f.f.el.querySelector(".mini b"); if (!b || !b.offsetWidth && getComputedStyle(f.f.el.querySelector(".mini")).display === "none") { out.push("no health bar over " + f.id); continue; }
    const g = green(getComputedStyle(b).backgroundColor);
    if (f.side === "friend" && !g) out.push("bar not green over " + f.id);
    if (f.side === "foe" && g) out.push("foe's bar green over " + f.id);
  }
  // The ×2 pill on a ring: inside the stage and on top.
  for (const n of V.world.querySelectorAll(".gmark.ring .n")) {
    const r = R(n), x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (r.left < sr.left || r.right > sr.right || r.bottom > sr.bottom) out.push("×2 pill outside the stage");
    // (the ground marks take no pointer, so elementFromPoint passes through them: test what could cover the pill instead)
    for (const c of V.el.querySelectorAll(".intent:not([hidden]), .hud > *, .nametag.on, .banner:not(.off)")) if (inter(r, R(c), 1)) out.push("×2 pill covered by " + c.className);
    void x; void y;
  }
  // Chips over the foes: inside the stage.
  for (const c of V.stage.querySelectorAll(".intent:not([hidden])")) { const r = R(c); if (r.left < sr.left - 0.5 || r.right > sr.right + 0.5 || r.top < sr.top - 0.5) out.push("a foe's chip outside the stage"); }
  const wctl = V.el.querySelector(".wctl"), cr = R(wctl);
  if (open) {
    const panel = V.el.querySelector(open === "company" ? ".company-sheet" : ".aid-sheet"), pr = R(panel);
    if (panel.hidden) out.push(open + " menu did not open");
    if (phone) { if (Math.abs(pr.top - cr.top) > 1 || Math.abs(pr.height - cr.height) > 1) out.push(open + " menu not at the move cards' height (" + Math.round(pr.height) + " vs " + Math.round(cr.height) + ")"); }
    else { const btn = V.el.querySelector(open === "company" ? ".hb.wpill" : ".hb.aid"); if (pr.top < R(btn).bottom - 0.5 || pr.bottom > sr.bottom) out.push(open + " menu not in the sky under its button"); }
    for (const f of figs) if (inter(pr, { left: f.l, right: f.r, top: f.b - f.h * 0.16, bottom: f.b + 4 })) out.push(open + " menu covers the feet of " + f.id);
    for (const g of V.world.querySelectorAll(".gmark")) if (inter(pr, R(g))) out.push(open + " menu covers a ground ring");
    if (Math.abs(R(st).top - V.stageTop) > 0.5 || Math.abs(R(st).height - V.stageH) > 0.5) out.push(open + " menu moved the stage");
    if (!panel.querySelector(".flame")) out.push(open + " menu without its diya");
    if (panel.scrollHeight > panel.clientHeight + 1) out.push(open + " menu content does not fit");
    for (const o of panel.querySelectorAll("button")) { if (!o.offsetWidth) continue; if (o.scrollWidth > o.clientWidth + 1) out.push(open + " label cut: " + o.textContent.trim()); if (phone && R(o).height < 31.5) out.push(open + " button under 32 px: " + o.textContent.trim()); }
  }
  // The move cards (or the place prompt): no label cut, 44 px on phones; the cards in rows with none alone.
  const cards = [...wctl.querySelectorAll("button")].filter((b) => b.offsetWidth);
  for (const b of cards) {
    for (const t of b.querySelectorAll("b, small")) if (t.offsetWidth && t.scrollWidth > t.clientWidth + 1) out.push("label cut: " + t.textContent.trim());
    if (phone && (R(b).height < 43.5 || R(b).width < 43.5)) out.push("touch target under 44 px: " + b.textContent.trim());
  }
  const mv = [...wctl.querySelectorAll("#wd-moves button")].filter((b) => b.offsetWidth);
  if (mv.length) {
    const rows = {}; mv.forEach((b) => { const y = Math.round(R(b).top); rows[y] = (rows[y] || 0) + 1; });
    const counts = Object.values(rows);
    if (mv.length > 1 && counts.some((c) => c === 1)) out.push("a move card alone in its row (" + counts.join("+") + ")");
    if (!phone && counts.length > 1) out.push("move cards not in one row on a laptop (" + counts.join("+") + ")");
    for (const b of mv) { const t = b.querySelector("b"), fs = parseFloat(getComputedStyle(t).fontSize); if (phone && fs > 14) out.push("card title " + fs + " px"); }
  }
  if (phone) for (const b of V.el.querySelectorAll(".hud button")) { const r = R(b); if (r.width && (r.width < 43.5 || r.height < 43.5)) out.push("touch target under 44 px: " + (b.className || "")); }
  for (const t of V.stage.querySelectorAll(".foe-tap:not([hidden])")) { const r = R(t); if (r.width < 43.5 || r.height < 43.5) out.push("a foe's tap area under 44 px"); }
  return { problems: out, ratio: Math.round(ratio * 100), cards: mv.length };
}
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); if (f.endsWith("/")) f += "index.html"; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); r.end(d); }); });
srv.listen(0, async () => {
  const port = srv.address().port, b = await pw.chromium.launch();
  let fails = 0, n = 0;
  for (const dev of DEVICES) for (const lang of ["en", "hi"]) for (const [enc, pth] of FIGHTS) {
    const ctx = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.mobile ? 2 : 1, isMobile: dev.mobile, hasTouch: dev.mobile });
    const pg = await ctx.newPage(); const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
    await pg.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
    await pg.goto("http://localhost:" + port + "/index.html?rt=1"); await pg.waitForTimeout(500);
    if (lang === "hi") { await pg.evaluate(() => new Promise((r) => K.UI.setLang("hi", r))); await pg.waitForTimeout(300); }
    await pg.evaluate(([enc, pth]) => {
      document.documentElement.classList.add("calm"); // no animation in the way of measuring
      const S = K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 30, act: 6, path: pth, side: "pandava", teacher: "drona" });
      S.attrs.might = 3; S.attrs.grace = 3; S.items.herbs = 2; S.flags.push("role_front"); S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1;
      K.seed(3); K.UI.startBattle(enc, () => {});
    }, [enc, pth]);
    await pg.waitForTimeout(2600); // at rest: the champion's moment and the brief line gone
    const tag = dev.name + " " + lang + " " + enc, res = [];
    const snap = async (what) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, (dev.name + "_" + lang + "_" + enc + "_" + what).replace(/\W+/g, "_") + ".png") }); };
    await pg.evaluate(() => { const V = K.UI.warScreen(); const r = V.stage.getBoundingClientRect(); V.stageTop = r.top; V.stageH = r.height; });
    const picking = await pg.evaluate(() => !!document.querySelector("#rt .wctl.picking"));
    const hasCo = await pg.evaluate(() => !!K.Combat.state().order);
    if (hasCo && !picking) res.push({ problems: ["no place prompt before round 1"] });
    res.push(await pg.evaluate(measure, null)); await snap(picking ? "place" : "rest");
    if (picking) {
      await pg.evaluate(() => document.querySelector('#rt [data-place="front"]').click()); await pg.waitForTimeout(700);
      await pg.evaluate(() => { const V = K.UI.warScreen(); const r = V.stage.getBoundingClientRect(); V.stageTop = r.top; V.stageH = r.height; });
      const r1 = await pg.evaluate(measure, null); res.push(r1); await snap("rest");
      if (!(await pg.evaluate(() => K.Combat.state().place === "front"))) res.push({ problems: ["the place picked did not reach the fight"] });
    }
    for (const open of hasCo ? ["company", "aid"] : ["aid"]) {
      await pg.evaluate((o) => { document.querySelector('#rt [data-wact="' + o + '"]').click(); }, open); await pg.waitForTimeout(250);
      res.push(await pg.evaluate(measure, open)); await snap(open);
      await pg.evaluate(() => { const V = K.UI.warScreen(); V.el.querySelectorAll(".sheet").forEach((s) => (s.hidden = true)); V.sheet = null; });
    }
    const probs = [...new Set(res.flatMap((r) => r.problems).concat(errs.map((e) => "script error: " + e)))];
    n++; if (probs.length) fails++;
    const r0 = res.find((r) => r.ratio != null) || {};
    console.log((probs.length ? "✗ " : "ok ") + tag + " (figure " + r0.ratio + "%, " + (res[res.length - 1].cards != null ? res.find((r) => r.cards) ? res.find((r) => r.cards).cards : 0 : 0) + " cards)" + (probs.length ? "\n    " + probs.join("\n    ") : ""));
    await ctx.close();
  }
  console.log((n - fails) + "/" + n + " screens fit");
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
