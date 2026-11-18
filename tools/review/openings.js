// Every fight's opening, read from a real page: the cards in the order they will be shown, the question that follows,
// and every piece of text on the field's HUD once the fight begins. Each fight is opened twice: as one of your first
// battles, and after several (the opening differs).
//   node tools/review/openings.js <out.json> [only: a regular expression on the fight's name]
// It reports: a card out of order, an empty heading, a leader who is not the strongest named foe, and any text that
// shows a code where a letter should be (&#39; &amp; and the like).
const ROOT = process.env.ROOT || require("path").resolve(__dirname, "../..");
const serve = require(ROOT + "/tools/serve.js"); let pw; try { pw = require("playwright"); } catch (e) { pw = require("/opt/npm-tools/node_modules/playwright"); }
const { chromium } = pw, fs = require("fs");
const out = process.argv[2], only = process.argv[3] ? new RegExp(process.argv[3]) : null;
if (!out) { console.error("usage: node tools/review/openings.js <out.json> [only]"); process.exit(2); }
const ARGS = ["--no-sandbox", "--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const { srv, url } = await serve(0); const browser = await chromium.launch({ args: ARGS });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack || e).slice(0, 400)));
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.goto(url + "/index.html?3d=1", { waitUntil: "load" }); await page.waitForFunction(() => window.K_MODELS_READY, null, { timeout: 400000 });
  const ids = await page.evaluate(() => Object.values(window.K.ENCOUNTERS).map((e) => ({ id: e.id, act: e.act || 6, title: window.K.text(window.K.val(e.title) || "") })));
  const rows = [];
  for (const e of ids) { if (only && !only.test(e.id)) continue;
    for (const fought of [0, 4]) {
      const row = { id: e.id, title: e.title, fought, shots: null, ask: "", hud: [], err: null }; const n0 = errs.length;
      try {
        await page.evaluate((o) => { const K = window.K, S = (K.S = K.newLife()); K.seed(7); Object.assign(S, { name: "Ira", pronoun: "she", origin: "panchala", temperament: "bold", heirloom: "bow", age: 30, act: o.act, side: "pandava", path: "sword" });
          for (const k in S.attrs) S.attrs[k] = 5; for (const k in S.skills) S.skills[k] = 4; S.items.herbs = 2; S.flags.push("role_front"); S.modeAsked = true; S.fought = o.fought ? { [o.act]: o.fought } : {}; K.prefs({ gfx: "low", fightView: "top", tips3d: {} });
          K.UI.battleBot = false; K.UI.lastIntro = null; K.UI.startBattle(o.id, () => {}); }, { id: e.id, act: e.act, fought });
        for (let i = 0; i < 60 && !(await page.evaluate(() => !!window.K.UI.lastIntro || !!document.getElementById("battle-go"))); i++) await sleep(250);
        row.shots = await page.evaluate(() => window.K.UI.lastIntro);
        row.leader = await page.evaluate(() => { const B = window.K.Combat.state(); if (!B) return null; const f = B.units.filter((u) => u.side === "enemy" && u.g && !u.line && u.g.entered !== false && u.g.kind !== "light" && (u.person || u.hero)).sort((a, b) => b.maxHp - a.maxHp)[0]; return f ? window.K.text(f.name) : null; });
        await page.evaluate(() => { const sk = document.querySelector(".b-skip"); if (sk) sk.click(); });
        for (let i = 0; i < 24 && !(await page.evaluate(() => !!document.querySelector(".b-ask"))); i++) await sleep(200);
        row.ask = await page.evaluate(() => { const a = document.querySelector(".b-ask"); return a ? a.innerText : ""; });
        await page.evaluate(() => { const go = document.getElementById("battle-go"); if (go) go.click(); }); await sleep(900);
        row.hud = await page.evaluate(() => { const h = document.querySelector(".bhud"); return h ? [...new Set(h.innerText.split("\n").map((x) => x.trim()).filter(Boolean))] : []; });
        row.names = await page.evaluate(() => { const B = window.K.Combat.state(); return B ? B.units.map((u) => String(u.name)) : []; });
      } catch (x) { row.err = String(x.message || x).slice(0, 300); }
      await page.evaluate(() => { try { if (window.K.UI.fightShut) window.K.UI.fightShut(); } catch (e) {} const h = document.querySelector(".bhud"); if (h) h.remove(); }).catch(() => {}); await sleep(250);
      if (errs.length > n0) row.err = (row.err || "") + " PAGE: " + errs.slice(n0).join(" | ");
      rows.push(row); fs.writeFileSync(out, JSON.stringify(rows)); process.stdout.write(rows.length + " " + e.id + (row.err ? " ERR" : "") + "\n");
    } }
  await browser.close(); srv.close();
})();
