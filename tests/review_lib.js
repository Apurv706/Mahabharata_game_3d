/* Shared pieces for the review checks (tests/review_*.js): a case list and runner in the manner of tests/bugs.js, a
   browser page on the game (iPhone SE, iPhone 15 or a 1440x900 laptop), a grown life put into a fight on its own screen,
   and the problems split into new and known (tests/known_failures.json, test = the check's name). Nothing here changes
   the game: it only loads it and reads it. */
"use strict";
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness");
const { arg, has } = H;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let PW = null, BROWSER = null, SRV = null;
const DEV = {
  "iPhone 15": () => Object.assign({}, PW.devices["iPhone 15"]),
  "iPhone SE": () => Object.assign({}, PW.devices["iPhone SE"]),
  laptop: () => ({ viewport: { width: 1440, height: 900 } })
};
// A page on the game. o: { device, lang, calm, ctx (context options over the device's), query, dir (another game folder) }
async function open(o = {}) {
  const ctx = await BROWSER.newContext(Object.assign(DEV[o.device || "iPhone 15"](), o.ctx || {}));
  const pg = await ctx.newPage(), errs = [];
  pg.on("pageerror", (e) => errs.push("page error: " + e.message));
  pg.on("console", (m) => { if (m.type() === "error" && !/net::ERR_FAILED|fonts\.g/.test(m.text())) errs.push("console: " + m.text()); });
  pg.on("response", (q) => { if (q.status() >= 400 && !/fonts\.g/.test(q.url())) errs.push(q.status() + ": " + q.url().replace(SRV.url, "/")); });
  await pg.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await pg.goto(SRV.url + "index.html" + (o.query || ""));
  await pg.waitForFunction(() => window.K && K.UI && document.querySelector("#leaf"));
  if (o.calm) await pg.evaluate(() => { K.prefs({ calm: true }); K.UI.applyCalm(); });
  if (o.lang === "hi") await pg.evaluate(() => new Promise((r) => { K.UI.setLang("hi", r); setTimeout(r, 1500); }));
  return { ctx, pg, errs, close: () => ctx.close() };
}
// A grown life (or o's) and a fight on its screen, its rules card and walkthrough already seen.
async function fight(pg, enc, o = {}) {
  await pg.evaluate(([enc, o]) => {
    const extra = o.S || {};
    const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 44, act: 6, path: "mace", side: "pandava", teacher: "drona" }, o.life || {}));
    S.attrs.might = 3; S.attrs.grace = 3; S.items.herbs = o.herbs != null ? o.herbs : 2; S.flags.push("role_front"); S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1;
    if (o.storyMode) S.storyMode = true;
    for (const [k, v] of Object.entries(extra.bonds || {})) S.bonds[k] = v;
    if (extra.astras) S.astras = extra.astras.map((id) => ({ id, from: "test", age: S.age }));
    if (extra.boons) S.boons = S.boons.concat(extra.boons);
    if (extra.flags) S.flags = S.flags.concat(extra.flags);
    if (extra.friend) S.friend = extra.friend;
    K.seed(o.seed || 3); window.__ended = null; window.__endedN = 0;
    K.UI.startBattle(enc, (out) => { window.__ended = out; window.__endedN++; });
  }, [enc, o]);
  try { await pg.waitForSelector("#rt", { timeout: 15000 }); } catch (e) { throw new Error(enc + ": no fight screen opened in 15 s"); }
  await sleep(o.wait != null ? o.wait : 1200);
}
// Keep you alive (a check that is not about losing).
const keepAlive = (pg) => pg.evaluate(() => { clearInterval(window.__alive); window.__alive = setInterval(() => { const p = K.Combat.player(); if (p && p.hp > 0) p.hp = p.maxHp; }, 50); });
const stopAlive = (pg) => pg.evaluate(() => clearInterval(window.__alive));
const endFight = (pg) => pg.evaluate(() => { try { if (K.UI.rtScreen()) K.UI.rtStop(); } catch (e) { /* closed */ } try { const B = K.Combat.state(); if (B && !B.over) K.Combat.settle("win"); K.Combat.end(); } catch (e) { /* over */ } try { const w = document.getElementById("rt"); if (w) w.remove(); } catch (e) { /* gone */ } });

// Wait until the fight's own clock has run secs (a busy machine draws few frames, and the fight runs slower then:
// each frame advances it at most 0.1 s), or wallMax ms have passed. Returns the fight time that passed.
async function waitFight(pg, secs, wallMax = 30000) {
  const t0 = await pg.evaluate(() => { const V = K.UI.rtScreen(); return V ? V.R.t : null; });
  if (t0 == null) { await sleep(Math.min(wallMax, secs * 1000)); return 0; }
  const end = Date.now() + wallMax;
  for (;;) {
    const t = await pg.evaluate(() => { const V = K.UI.rtScreen(); return V ? V.R.t : null; });
    if (t == null || t - t0 >= secs || Date.now() > end) return t == null ? secs : t - t0;
    await sleep(60);
  }
}
// A control held down (down() ... up()) for secs of fight time.
async function holdFight(pg, down, up, secs) { await down(); const n = await waitFight(pg, secs); await up(); return n; }
// A touch held on a point (CDP), for the hold controls on a phone.
async function touchHold(ctx, pg, sel, ms, fightSecs) {
  const cdp = await ctx.newCDPSession(pg);
  const bb = await pg.locator(sel).first().boundingBox();
  if (!bb) return false;
  const pt = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
  if (fightSecs) await waitFight(pg, fightSecs, ms * 20); else await sleep(ms);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach().catch(() => {});
  return true;
}

// ---------- The case list and its runner ----------
function suite(name, header) {
  const CASES = [];
  const engine = (id, what, fn) => CASES.push({ id, what, kind: "engine", fn });
  const browser = (id, what, fn) => CASES.push({ id, what, kind: "browser", fn });
  async function run() {
    const only = arg("--case", ""), want = only ? new Set(only.split(",")) : null;
    let list = CASES.filter((c) => !want || want.has(c.id));
    if (has("--engine-only")) list = list.filter((c) => c.kind === "engine");
    if (has("--browser-only")) list = list.filter((c) => c.kind === "browser");
    if (has("--list")) { console.log(header); for (const c of CASES) console.log(c.kind.padEnd(8) + c.id.padEnd(26) + c.what); return; }
    if (want) for (const id of want) if (!CASES.some((c) => c.id === id)) { console.error("no case " + id); process.exit(2); }
    // Known failures: tests/known_failures.json (the suite's list) and tests/review_known.json (this review's: bugs reported to
    // the owner and not fixed, each with why). A case whose every problem matches one is KNOWN, not FAIL.
    let mine = []; try { mine = (JSON.parse(fs.readFileSync(path.join(__dirname, "review_known.json"), "utf8")).known || []).filter((k) => k.test === name); } catch (e) { /* none */ }
    const known = H.knownFailures(name).concat(mine);
    const results = [];
    if (list.some((c) => c.kind === "browser")) {
      PW = H.pw(); if (!PW) { console.error("Playwright is not installed"); process.exit(2); }
      BROWSER = await PW.chromium.launch(); SRV = await H.serve(path.resolve(arg("--game", H.GAME)));
    }
    const T = parseInt(arg("--case-timeout", "240"), 10) * 1000;
    const shut = async () => { try { if (BROWSER) await BROWSER.close(); } catch (e) { /* closed */ } BROWSER = null; };
    process.once("SIGTERM", () => shut().then(() => process.exit(143))); process.once("SIGINT", () => shut().then(() => process.exit(130)));
    try {
    for (const c of list) {
      const t = Date.now();
      let probs;
      try { probs = await Promise.race([Promise.resolve(c.fn()), sleep(T).then(() => { throw new Error("timed out after " + T / 1000 + " s"); })]); } catch (e) { probs = ["threw: " + String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")]; }
      probs = [...new Set((probs || []).filter(Boolean).map(String))];
      const k = probs.length && (known.find((x) => x.match === c.id) || (probs.every((p) => known.some((x) => p.includes(x.match))) ? known.find((x) => probs.some((p) => p.includes(x.match))) : null));
      const status = probs.length ? (k ? "known" : "fail") : "pass";
      results.push({ id: c.id, kind: c.kind, status, problems: probs, ms: Date.now() - t });
      console.log((status === "pass" ? "ok    " : status === "known" ? "KNOWN " : "FAIL  ") + c.id.padEnd(26) + c.what + "  (" + ((Date.now() - t) / 1000).toFixed(1) + " s)");
      for (const p of probs.slice(0, 10)) console.log("        " + p.slice(0, 260));
    }
    } finally { await shut(); if (SRV) await SRV.close().catch(() => {}); }
    const fails = results.filter((r) => r.status === "fail");
    console.log(name + ": " + results.length + " checks, " + results.filter((r) => r.status === "pass").length + " pass, " + fails.length + " fail, " + results.filter((r) => r.status === "known").length + " known");
    const J = arg("--json", ""); if (J) fs.writeFileSync(J, JSON.stringify({ results, failed: fails.map((r) => r.id), browserFailed: fails.filter((r) => r.kind === "browser").map((r) => r.id) }, null, 1));
    process.exit(fails.length ? 1 : 0);
  }
  return { engine, browser, run, CASES };
}

// A divine weapon's mantra (ui/fx.js U.mantra), traced once it is up: "tap" each light in turn, "drag" the mouse through
// them, or "keys" (any arrow, then each stroke's). Returns false when no mantra came up.
async function traceMantra(pg, how) {
  for (let i = 0; i < 10 && !(await pg.$(".mantra")); i++) await sleep(100);
  if (!(await pg.$(".mantra"))) return false;
  const pts = await pg.evaluate(() => [...document.querySelectorAll(".mantra .mn-dot")].map((d) => { const r = d.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }));
  if (how === "tap") for (const q of pts) { await pg.touchscreen.tap(q[0], q[1]); await sleep(60); }
  else if (how === "drag") { await pg.mouse.move(pts[0][0], pts[0][1]); await pg.mouse.down(); for (const q of pts.slice(1)) await pg.mouse.move(q[0], q[1], { steps: 4 }); await pg.mouse.up(); }
  else { const keys = await pg.evaluate(() => document.querySelector(".mantra").dataset.keys || ""); await pg.keyboard.press("ArrowUp"); for (const k of keys.split(" ").filter(Boolean)) await pg.keyboard.press(k); }
  for (let i = 0; i < 20 && (await pg.$(".mantra")); i++) await sleep(100);
  return true;
}
// Outside the war a divine weapon is spoken only under a tenth of your life (owner, 9 November): held there, alive.
const keepLow = (pg) => pg.evaluate(() => { clearInterval(window.__alive); window.__alive = setInterval(() => { const p = K.Combat.player(); if (p && p.hp > 0) p.hp = Math.max(1, Math.round(p.maxHp * 0.08)); }, 50); });

module.exports = { suite, open, fight, keepAlive, keepLow, stopAlive, endFight, touchHold, waitFight, holdFight, traceMantra, sleep, H, srv: () => SRV, pw: () => PW, browser: () => BROWSER };
