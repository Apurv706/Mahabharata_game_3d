/* The 3D layer in a real browser (headless Chromium, software WebGL), played as a person would.
     fight      a war battle opens in 3D; its opening shots move on at a tap; the ready card offers the three views; R
                changes the view; W moves the fighter; the line is on the field; the bot plays it out and the 2D game is
                handed the outcome; the page is back to 2D afterwards
     phone      the same on a phone, with real touches: a tap moves the opening on, the thumb stick moves the fighter, the
                buttons strike and roll, the eye button changes the view
     dream      the opening dream is fought in 3D and breaks
     tests      one test of each kind opens in 3D, begins, takes a press, and with the smoke test's own hands ends
     no3d       with 3D switched off (?2d=1) the same fight and a test run on the 2D game's own screens
   Any error on the page fails the case.
     node tests/smoke3d.js [--case fight,phone,dream,tests,no3d] [--json FILE] [--shots DIR]     (needs Playwright) */
"use strict";
const fs = require("fs"), path = require("path");
const H = require("./lib/harness.js");
const pw = H.pw();
if (!pw) { console.log("SKIP smoke3d: Playwright is not installed"); process.exit(0); }
const ONLY = H.arg("--case", "") ? H.arg("--case").split(",") : null, JSON_OUT = H.arg("--json", ""), SHOTS = H.arg("--shots", "");
const ARGS = ["--no-sandbox", "--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"];
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A life at a point of the story, set straight into the page (as tests/bugs.js does for its cases).
const LIFE = (o) => { const K = window.K, S = (K.S = K.newLife()); K.seed(o.seed || 5); Object.assign(S, { name: "Ira", pronoun: "she", origin: "panchala", temperament: "bold", heirloom: "bow", age: o.age, act: o.act, side: o.side || null, path: o.path || null });
  for (const k in S.attrs) S.attrs[k] = 4; for (const k in S.skills) S.skills[k] = 3; S.items.herbs = 2; if (o.act >= 6) S.flags.push("role_front"); K.prefs({ fightView: "top", tips3d: { mark: 1, move: 1, view: 1 } }); window.__out = undefined; };

async function open(browser, o) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1280, height: o.h || 720 }, hasTouch: !!o.touch, isMobile: !!o.touch, deviceScaleFactor: 1 });
  const page = await ctx.newPage(), errs = [];
  page.on("pageerror", (e) => errs.push("page error: " + String(e.message || e).split("\n")[0]));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::ERR|TUNNEL|fonts\.g/.test(m.text())) errs.push("console: " + m.text().slice(0, 200)); });
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.goto(o.url + "index.html" + (o.query || "?3d=1"), { waitUntil: "load" }); await page.waitForTimeout(500); // (a driven browser gets the 2D screens unless it asks for 3D)
  return { ctx, page, errs, cdp: o.touch ? await ctx.newCDPSession(page) : null };
}
const state = (page) => page.evaluate(() => (window.K.UI.battleState ? window.K.UI.battleState() : "closed"));
const until = async (fn, ms, step) => { const t0 = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t0 > ms) return null; await sleep(step || 250); } };
// Is something drawn? (a canvas that failed would be one flat colour)
async function drawn(page) {
  const buf = await page.screenshot({ type: "png" });
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, "smoke3d-" + Date.now() + ".png"), buf); }
  return page.evaluate(async (b64) => { const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode(); const c = document.createElement("canvas"); c.width = 64; c.height = 36; const x = c.getContext("2d"); x.drawImage(img, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data, seen = new Set(); for (let i = 0; i < d.length; i += 4) seen.add((d[i] >> 4) + "," + (d[i + 1] >> 4) + "," + (d[i + 2] >> 4)); return seen.size; }, buf.toString("base64"));
}

const CASES = {
  async fight(browser, url, check) {
    const { ctx, page, errs } = await open(browser, { url });
    await page.evaluate(LIFE, { age: 44, act: 6, side: "pandava", path: "mace" });
    await page.evaluate(() => { window.K.UI.startBattle("e_day1", (o) => { window.__out = o; }); });
    check(await until(() => page.evaluate(() => document.body.classList.contains("in3d")), 6000), "the fight opens in 3D");
    check(await until(() => page.evaluate(() => !!document.querySelector(".b-intro.in")), 6000), "it opens on the opening shots");
    let colours = 0; for (let i = 0; i < 16 && colours <= 40; i++) { colours = await drawn(page); if (colours <= 40) await page.waitForTimeout(500); } // (the first frame of a war field takes a moment on a software renderer)
    check(colours > 40, "the scene is drawn (" + colours + " shades on the screen)");
    const head0 = await page.evaluate(() => (document.querySelector(".b-intro h2") || {}).textContent || "");
    let moved = false;
    for (let i = 0; i < 8 && !(await page.evaluate(() => !!document.getElementById("battle-go"))); i++) { await page.mouse.click(400, 220); await sleep(400); const h = await page.evaluate(() => (document.querySelector(".b-intro h2") || {}).textContent || ""); if (h && h !== head0) moved = true; }
    check(moved, "a tap moves the opening on, to who stands against you");
    check(await until(() => page.evaluate(() => !!document.getElementById("battle-go")), 4000), "then the field, and the word to begin");
    check((await page.evaluate(() => document.querySelectorAll(".b-view").length)) === 3, "the ready card offers the three views");
    await page.click('.b-view[data-view="behind"]'); check((await page.evaluate(() => window.K.prefs().fightView)) === "behind", "choosing a view there is kept");
    await page.click("#battle-go");
    check(await until(async () => /^t=/.test(await state(page)), 4000), "the fight begins");
    const line = await page.evaluate(() => { const us = window.K.Combat.state().units; return [us.filter((u) => u.line && u.side === "ally").length, us.filter((u) => u.line && u.side === "enemy").length]; });
    check(line[0] >= 2 && line[1] >= 2, "soldiers of both hosts are on the field (" + line.join(" and ") + ")");
    await page.keyboard.press("r"); check((await page.evaluate(() => window.K.prefs().fightView)) === "eyes", "R changes the view: through your eyes");
    await sleep(500); check((await drawn(page)) > 40, "and it is drawn");
    await page.keyboard.press("r"); check((await page.evaluate(() => window.K.prefs().fightView)) === "top", "and round to the view from above");
    const p0 = await page.evaluate(() => { const p = window.K.Combat.player(); return [p.g.x, p.g.z]; });
    await page.keyboard.down("w"); await sleep(1700); await page.keyboard.up("w"); // (a body has weight now: it gathers way over a sixth of a second of the fight's own time, which on this slow renderer is most of a second)
    const p1 = await page.evaluate(() => { const p = window.K.Combat.player(); return [p.g.x, p.g.z]; });
    check(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.5, "W moves your fighter (" + Math.hypot(p1[0] - p0[0], p1[1] - p0[1]).toFixed(1) + " m)");
    await page.evaluate(() => { window.K.UI.battleBot = true; window.K.UI.battleSpeed = 10; });
    // (a fight lost once is offered again: the bot takes the second try)
    const out = await until(() => page.evaluate(() => window.__out), 240000, 500); // (every figure on the field is a modelled one now: a software renderer needs minutes for it)
    check(["win", "lose", "flee", "spare"].includes(out), "the fight is played to its end and the story is told how it went (" + out + ")");
    check(await until(() => page.evaluate(() => !document.body.classList.contains("in3d")), 6000), "and the page is the 2D game's again");
    check(!errs.length, "no error on the page" + (errs.length ? ": " + [...new Set(errs)].slice(0, 3).join(" | ") : ""));
    await ctx.close();
  },
  async phone(browser, url, check) {
    const W = 390, Hh = 844, { ctx, page, errs, cdp } = await open(browser, { url, w: W, h: Hh, touch: true });
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })) });
    await page.evaluate(LIFE, { age: 44, act: 6, side: "kaurava", path: "archer" });
    await page.evaluate(() => { window.K.UI.startBattle("hold_arjuna", (o) => { window.__out = o; }); });
    check(await until(() => page.evaluate(() => !!document.querySelector(".b-intro.in")), 8000), "the fight opens on its opening shots");
    const words = () => page.evaluate(() => { const b = document.querySelector(".b-intro"); return b ? b.textContent : ""; }); // (the same heading can stand over a new caption)
    const head0 = await words();
    await touch("touchStart", [[W / 2, Hh / 3]]); await touch("touchEnd", []); await sleep(500);
    const head1 = await words();
    check(head1 !== head0 || (await page.evaluate(() => !!document.getElementById("battle-go"))), "a touch moves the opening on");
    if (await page.evaluate(() => !!document.querySelector(".b-skip"))) await page.tap(".b-skip");
    check(await until(() => page.evaluate(() => !!document.getElementById("battle-go")), 4000), "Skip goes straight to the field");
    await page.tap("#battle-go"); await until(async () => /^t=/.test(await state(page)), 4000);
    const pos = () => page.evaluate(() => { const p = window.K.Combat.player(); return [p.g.x, p.g.z]; });
    const a = await pos(); await touch("touchStart", [[90, Hh * 0.6]]); await touch("touchMove", [[90, Hh * 0.6 - 60]]); await sleep(1000); const b = await pos(); await touch("touchEnd", []);
    check(Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.5, "the thumb stick moves your fighter (" + Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(1) + " m)");
    const blows0 = await page.evaluate(() => window.K.Combat.state().rt.stats.blows + window.K.Combat.state().rt.stats.rolls);
    await page.tap('[data-a="strike"]'); await sleep(350); await page.tap('[data-a="roll"]'); await sleep(500);
    const blows1 = await page.evaluate(() => window.K.Combat.state().rt.stats.blows + window.K.Combat.state().rt.stats.rolls);
    check(blows1 > blows0, "the buttons strike and roll");
    await page.tap(".b-viewbtn"); check((await page.evaluate(() => window.K.prefs().fightView)) === "behind", "the eye button changes the view");
    await sleep(600); check((await drawn(page)) > 40, "and it is drawn");
    const fits = await page.evaluate(() => { const bad = []; for (const el of document.querySelectorAll(".bhud .b-btn, .bhud .b-ico")) { const r = el.getBoundingClientRect(); if (r.width && (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1)) bad.push(el.dataset.a || el.className); } return bad; });
    check(!fits.length, "every button is on the screen" + (fits.length ? ": off it: " + fits.join(", ") : ""));
    await page.evaluate(() => { window.K.UI.battleBot = true; window.K.UI.battleSpeed = 10; });
    const out = await until(() => page.evaluate(() => window.__out), 240000, 500); // (every figure on the field is a modelled one now: a software renderer needs minutes for it)
    check(["win", "lose", "flee", "spare"].includes(out), "the fight ends (" + out + ")");
    check(!errs.length, "no error on the page" + (errs.length ? ": " + [...new Set(errs)].slice(0, 3).join(" | ") : ""));
    await ctx.close();
  },
  async dream(browser, url, check) {
    const { ctx, page, errs } = await open(browser, { url });
    await page.evaluate(LIFE, { age: 6, act: 1 });
    await page.evaluate(() => { window.K.UI.battleBot = true; window.K.UI.battleSpeed = 10; window.K.UI.startBattle("e_dream", (o) => { window.__out = o; }); });
    check(await until(() => page.evaluate(() => document.body.classList.contains("in3d")), 6000), "the dream is fought in 3D");
    const word = await until(() => page.evaluate(() => { const r = document.querySelector(".t-result b"); return r ? r.textContent : null; }), 90000, 300);
    const out = await until(() => page.evaluate(() => window.__out), 15000, 300);
    check(["win", "lose"].includes(out), "it ends, on your feet or not (" + out + ")");
    check(/dream/i.test(word || ""), "and it is said that the dream breaks (\"" + word + "\")");
    check(!errs.length, "no error on the page" + (errs.length ? ": " + [...new Set(errs)].slice(0, 3).join(" | ") : ""));
    await ctx.close();
  },
  async tests(browser, url, check) {
    const { ctx, page, errs } = await open(browser, { url });
    await page.evaluate(LIFE, { age: 30, act: 4, side: "pandava", path: "archer" });
    const kinds = await page.evaluate(() => window.K.UI.TRIAL_KINDS.slice());
    let opened = 0, ended = 0; const missing = [], stuck = [];
    for (const kind of kinds) {
      const found = await page.evaluate((kind) => { const K = window.K, U = K.UI, S = K.S; let c = null;
        for (const sc of Object.values(K.SCENES)) { let cs; try { cs = typeof sc.choices === "function" ? sc.choices(S) : sc.choices; } catch (e) { cs = []; } for (const x of cs || []) if (x.game === kind && !c) c = x; }
        if (!c) return false; window.__t = undefined; U.autoTrials = true; U.games[kind](null, (o) => { window.__t = o; }, c); return true; }, kind);
      if (!found) { missing.push(kind); continue; }
      const in3d = await until(() => page.evaluate(() => document.body.classList.contains("in3d") && !!document.querySelector(".trial3d")), 6000);
      if (in3d) opened++;
      await page.evaluate(() => { const b = document.getElementById("trial-begin"); if (b) b.click(); });
      const out = await until(() => page.evaluate(() => window.__t), 15000, 200);
      if (out) ended++; else stuck.push(kind);
      await until(() => page.evaluate(() => !document.body.classList.contains("in3d")), 5000);
    }
    check(!missing.length, "every kind of test is asked for somewhere in the story" + (missing.length ? " (not found: " + missing.join(", ") + ")" : " (" + kinds.length + " kinds)"));
    check(opened === kinds.length - missing.length, "each opens in 3D (" + opened + " of " + (kinds.length - missing.length) + ")");
    check(!stuck.length, "each comes to an end and hands back its outcome" + (stuck.length ? " (stuck: " + stuck.join(", ") + ")" : ""));
    // One of them played by hand: the aim test takes a press and shows it.
    await page.evaluate(() => { const K = window.K, U = K.UI; U.autoTrials = false; let c = null; for (const sc of Object.values(K.SCENES)) { let cs; try { cs = typeof sc.choices === "function" ? sc.choices(K.S) : sc.choices; } catch (e) { cs = []; } for (const x of cs || []) if (x.game === "aim" && !c) c = x; } window.__t = undefined; U.games.aim(null, (o) => { window.__t = o; }, c); });
    await until(() => page.evaluate(() => !!document.getElementById("trial-begin")), 5000); await page.evaluate(() => document.getElementById("trial-begin").click()); await sleep(1500);
    check((await drawn(page)) > 40, "a test's scene is drawn");
    const score0 = await page.evaluate(() => (document.querySelector(".t-score") || {}).innerHTML || "");
    for (let i = 0; i < 6; i++) { await page.keyboard.press("Space"); await sleep(900); }
    const score1 = await page.evaluate(() => (document.querySelector(".t-score") || {}).innerHTML || ""), over = await page.evaluate(() => window.__t);
    check(score1 !== score0 || !!over, "pressing the key plays it (the score moves, or it ends)");
    check(!errs.length, "no error on the page" + (errs.length ? ": " + [...new Set(errs)].slice(0, 3).join(" | ") : ""));
    await ctx.close();
  },
  async no3d(browser, url, check) {
    const { ctx, page, errs } = await open(browser, { url, query: "?2d=1" });
    await page.evaluate(LIFE, { age: 18, act: 2, path: "mace" });
    const r = await page.evaluate(() => { const K = window.K, U = K.UI; U.startBattle("e_spar", (o) => { window.__out = o; }); return { in3d: document.body.classList.contains("in3d"), fight: !!K.Combat.state() }; });
    check(!r.in3d && r.fight, "with 3D switched off a fight opens on the 2D game's own screen");
    const kinds = await page.evaluate(() => window.K.UI.TRIAL_KINDS.slice()); const threw = [];
    for (const kind of kinds) { const e = await page.evaluate((kind) => { const K = window.K, U = K.UI; let c = null; for (const sc of Object.values(K.SCENES)) { let cs; try { cs = typeof sc.choices === "function" ? sc.choices(K.S) : sc.choices; } catch (er) { cs = []; } for (const x of cs || []) if (x.game === kind && !c) c = x; }
      if (!c) return null; const box = document.createElement("div"); document.body.appendChild(box); try { U.games[kind](box, () => {}, c); return document.body.classList.contains("in3d") ? "opened in 3D" : null; } catch (er) { return String(er.message || er).slice(0, 80); } finally { box.remove(); document.body.classList.remove("intest"); } }, kind); if (e) threw.push(kind + ": " + e); }
    check(!threw.length, "and every kind of test opens on its 2D screen" + (threw.length ? " (" + threw.slice(0, 4).join("; ") + ")" : " (" + kinds.length + " kinds)"));
    check(!errs.length, "no error on the page" + (errs.length ? ": " + [...new Set(errs)].slice(0, 3).join(" | ") : ""));
    await ctx.close();
  }
};

(async () => {
  const srv = await H.serve(H.GAME);
  const browser = await pw.chromium.launch(Object.assign({ args: ARGS }, process.env.CHROME ? { executablePath: process.env.CHROME } : {}));
  let failed = 0;
  for (const [name, run] of Object.entries(CASES)) {
    if (ONLY && !ONLY.includes(name)) continue;
    const r = { id: name, ok: true, checks: [] }, t0 = Date.now();
    const check = (cond, what) => { r.checks.push({ ok: !!cond, what }); if (!cond) r.ok = false; console.log((cond ? "ok   " : "FAIL ") + name + " · " + what); };
    try { await run(browser, srv.url, check); } catch (e) { check(false, "the case ran (" + String(e.message || e).split("\n")[0].slice(0, 160) + ")"); }
    r.secs = (Date.now() - t0) / 1000; results.push(r); if (!r.ok) failed++;
  }
  await browser.close(); await srv.close();
  if (JSON_OUT) { fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true }); fs.writeFileSync(JSON_OUT, JSON.stringify({ failed: results.filter((r) => !r.ok).map((r) => r.id), browserFailed: results.filter((r) => !r.ok).map((r) => r.id), cases: results }, null, 1)); }
  console.log("\nsmoke3d: " + results.length + " cases, " + (failed ? failed + " FAILED" : "all passed") + " (" + results.reduce((s, r) => s + r.secs, 0).toFixed(0) + " s)");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
