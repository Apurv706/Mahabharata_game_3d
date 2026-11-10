// Plays the real game in headless Chrome (software WebGL): makes a life and presses on through it, choosing at random,
// and takes pictures on the way. A smoke test for the whole UI, and the way the screenshots are made.
//   node tools/play.js [--steps 40] [--shots 5,12,20] [--out dir] [--w 1280 --h 720] [--touch 1] [--seed 7] [--origin panchala]
//                      [--bot 1 (fights and tests play themselves)] [--lang hi] [--every ms] [--until "js condition"]
const path = require("path"), fs = require("fs");
const serve = require("./serve.js");
let chromium; try { chromium = require("playwright").chromium; } catch (e) { chromium = require("/opt/npm-tools/node_modules/playwright").chromium; }
(async () => {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf("--" + k); return i >= 0 ? a[i + 1] : d; };
  const out = path.resolve(arg("out", "shots")); fs.mkdirSync(out, { recursive: true });
  const steps = +arg("steps", 40), shots = new Set(String(arg("shots", "")).split(",").filter(Boolean).map(Number)), every = +arg("every", 700);
  const { srv, url } = await serve(0);
  const browser = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio", "--autoplay-policy=no-user-gesture-required"] });
  const touch = arg("touch") === "1";
  const page = await browser.newPage({ viewport: { width: +arg("w", 1280), height: +arg("h", 720) }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch });
  const logs = [];
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) logs.push("error: " + m.text().slice(0, 500)); });
  page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e.stack || e).slice(0, 800)));
  await page.goto(url + "/index.html" + (arg("query") ? "?" + arg("query") : ""), { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.evaluate(([seed, lang, bot]) => { const K = window.K; if (seed) K.seed(+seed); K.prefs({ gradual: false }); if (bot) { K.UI.autoTrials = true; K.UI.battleBot = true; K.UI.battleSpeed = 10; } window.__rnd = (() => { let s = (+seed || 1) * 7919; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })(); if (lang) return new Promise((r) => K.UI.setLang(lang, r)); }, [arg("seed", "3"), arg("lang", ""), arg("bot", "1") === "1"]);
  // Make a life.
  await page.evaluate(async (origin) => { const w = (ms) => new Promise((r) => setTimeout(r, ms)), $ = (s) => document.querySelector(s);
    $("#btn-new").click(); await w(900); $("[data-home=" + origin + "]").click(); await w(300); $("#land-ok").click(); await w(900);
    $("#cr-next").click(); await w(200); const r = window.__rnd, pick = (sel) => { const l = document.querySelectorAll(sel); l[Math.floor(r() * l.length)].click(); };
    pick("#pron .opt"); await w(600); pick("#temps .pick"); await w(600); pick("#heirs .pick"); await w(700); $("#begin").click(); }, arg("origin", "hastinapura"));
  const until = arg("until", "");
  let last = "", same = 0;
  for (let i = 1; i <= steps; i++) {
    await page.waitForTimeout(every);
    if (shots.has(i)) await page.screenshot({ path: path.join(out, "s" + String(i).padStart(3, "0") + ".png") });
    const state = await page.evaluate((until) => {
      const K = window.K, U = K.UI, $ = (s) => document.querySelector(s), vis = (el) => el && el.offsetParent !== null;
      if (until && eval(until)) return "UNTIL";
      const tag = (K.S ? K.S.scene + "@" + K.S.age : "-") + " ";
      if ($(".scrim")) { const b = $(".scrim .ord-go") || $(".scrim .x"); b.click(); return tag + "modal"; }
      if ($(".curtain.on")) return tag + "curtain";
      if ($(".beat")) { $(".beat").click(); return tag + "beat"; }
      if ($("#trial-begin")) { $("#trial-begin").click(); return tag + "trial-begin"; }
      if ($(".t-result") || $(".trial3d")) return tag + "trial";
      if ($(".bhud")) return tag + "battle " + (U.battleState ? U.battleState() : "");
      if ($("#journey-go")) { $("#journey-go").click(); return tag + "journey"; }
      if (U.staging && U.staging()) { U.stageFinish(); return tag + "staging"; }
      const ch = [...document.querySelectorAll("#choices .choice:not([disabled])")].filter(vis);
      if (ch.length) { const b = ch[Math.floor(window.__rnd() * ch.length)]; b.click(); return tag + "choice " + b.id; }
      const cta = [...document.querySelectorAll(".actions .cta, .actions .ghost")].filter(vis)[0];
      if (cta) { if (cta.id === "again") return "END " + (K.S && K.S.ending); cta.click(); return tag + "cta " + (cta.id || cta.textContent.slice(0, 20)); }
      return tag + "?";
    }, until).catch((e) => "EVAL ERROR " + e.message);
    if (arg("v") === "1") console.log(i, state);
    if (state === last) { if (++same > 40) { console.log("STUCK at", i, state, await page.evaluate(() => { const b = document.querySelector(".beat, .curtain.on, .trial3d, .bhud"); return b ? b.outerHTML.slice(0, 400) : "-"; })); await page.screenshot({ path: path.join(out, "stuck.png") }); break; } } else same = 0;
    last = state;
    if (state === "UNTIL" || /^END/.test(state)) { console.log("stopped:", state, "at step", i); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(out, "final.png") }); break; }
  }
  await page.screenshot({ path: path.join(out, "last.png") });
  if (logs.length) console.log([...new Set(logs)].slice(0, 15).join("\n")); else console.log("no page errors");
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
