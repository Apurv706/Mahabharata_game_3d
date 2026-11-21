// A fight of rounds, played in a real page by the game's own fighter on a stepped clock: what is announced at each round,
// a photograph as each begins, and how it ended (20 November, Version 88).
//   node tools/review/rounds.js fightId[,fightId...] outDir [seed] [path] [side]
const path = require("path"), GAME = process.env.GAME || path.join(__dirname, "..", "..");
const serve = require(GAME + "/tools/serve.js"), { chromium } = require("/opt/npm-tools/node_modules/playwright");
const fights = process.argv[2].split(","), out = process.argv[3], seed = +(process.argv[4] || 5), PATH = process.argv[5] || "mace", SIDE = process.argv[6] || "pandava";
(async () => {
  const { srv, url } = await serve(0), browser = await chromium.launch({ args: ["--no-sandbox", "--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"] });
  for (const fight of fights) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true }), page = await ctx.newPage(); let errs = 0;
    page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", e.message.slice(0, 200)); }); page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) { errs++; console.log("ERR", m.text().slice(0, 200)); } });
    await page.route(/fonts\./, (r) => r.abort()); await page.addInitScript({ path: path.join(__dirname, "vclock.js") });
    await page.goto(url + "/index.html?3d=1", { waitUntil: "load" });
    for (let i = 0; i < 4000; i++) { if (await page.evaluate(() => { __step(33.333); return !!window.K_MODELS_READY; })) break; await page.waitForTimeout(60); }
    await page.evaluate(({ fight, seed, PATH, SIDE }) => { const K = window.K, S = (K.S = K.newLife()); K.seed(seed);
      Object.assign(S, { name: "Ira", pronoun: "she", origin: "panchala", temperament: "bold", heirloom: "bow", age: 44, act: 6, side: SIDE, path: PATH });
      for (const k in S.attrs) S.attrs[k] = 4; for (const k in S.skills) S.skills[k] = 3; S.items.herbs = 2; S.flags.push("role_front"); K.prefs({ gfx: "low", tips3d: { mark: 1, move: 1, view: 1 } });
      const R3 = K.RT3, st0 = R3.step; window.__ev = []; R3.step = function (R) { window.__R = R; const r = st0.apply(this, arguments); for (const e of R.fx) if (/^(round|roundWon|drivenOff)$/.test(e.k)) window.__ev.push(Object.assign({ t: +R.t.toFixed(1) }, e)); return r; };
      window.__out = undefined; K.UI.startBattle(fight, (o) => { window.__out = o; }); }, { fight, seed, PATH, SIDE });
    // (drawing is the slow part on a software renderer: it is switched off, and on again for each photograph)
    await page.evaluate(() => { const G = window.K.G3; if (G && G.renderer) { window.__draw = G.renderer.render; G.renderer.render = () => {}; } });
    for (let i = 0; i < 400; i++) { const go = await page.evaluate(() => { const b = document.getElementById("battle-go"); if (b) { b.click(); return true; } const t = document.querySelector(".b-intro"); if (t) t.click(); for (let j = 0; j < 6; j++) __step(33.333); return false; }); if (go) break; }
    await page.evaluate(() => { window.K.UI.battleBot = true; });
    let seen = 0, shots = 0;
    for (let s = 0; s < 30 * 320; s += 10) {
      const st = await page.evaluate(() => { for (let i = 0; i < 10 && window.__out === undefined; i++) __step(33.333); const b = document.querySelector(".b-banner, .b3-banner, [class*=banner]"); return { out: window.__out, ev: window.__ev.length, t: window.__R ? window.__R.t : 0, banner: b ? b.textContent.slice(0, 160) : "", goal: (document.querySelector(".b-goal, [class*=goal]") || {}).textContent || "" }; });
      if (st.ev > seen) { const evs = await page.evaluate((n) => window.__ev.slice(n), seen); seen = st.ev; for (const e of evs) console.log(fight, JSON.stringify(e)); console.log("   banner:", st.banner, "| goal:", String(st.goal).slice(0, 80));
        if (evs.some((e) => e.k === "round" && e.n > 1) && shots < 8) { await page.evaluate(() => { for (let i = 0; i < 45; i++) __step(33.333); const G = window.K.G3; G.renderer.render = window.__draw; __step(33.333); G.renderer.render = () => {}; }); await page.screenshot({ path: out + "/" + fight + "_r" + (++shots) + ".png" }); } }
      if (st.out !== undefined) { console.log(fight, "ended", JSON.stringify(st.out).slice(0, 80), "at", st.t.toFixed(0), "s; errors", errs); break; }
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
})();
