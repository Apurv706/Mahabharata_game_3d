/* Smoke test of the built play pages: tools/split/build.js writes both parts (into a scratch folder, from
   tests/fixtures/split, or SPLIT_USE / SPLIT_LIVES / SPLIT_WAR), a local server serves each part from its own file map
   (so a file the map leaves out is a 404, as on the host), and a phone (iPhone 15, Chromium) plays them with real taps
   and keys:
     part1-opening   the title, a new life made on the creation page, the opening (the dream and its fight), and a
                     dozen story pages after it;
     part1-fight     a real-time fight (the sparring bout, e_spar) on the real-time screen: walked into with ▶ held,
                     struck with taps on Strike and the J key, to its end and the page after;
     part2-war       Part Two's "Begin at the war": a ready-made life on the eve of the war, its pages and the first
                     war-day fight played with taps on the move cards;
     part2-act5      Part Two's "Begin at Act V", and "Continue from Part One" with a save code from Part One.
   Fails on any console error, page error, failed request (a 404 or any other), or a screen with no way forward
   (no choice, button, fight control or ending to tap within a few seconds).
   Usage: node tests/smoke.js [--case id,id] [--keep] [--json FILE]   (--keep: leave the built parts in the scratch folder) */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const zlib = require("zlib");
const H = require("./lib/harness");
const { arg, has } = H;
const FIX = path.join(__dirname, "fixtures", "split");
const OUT = path.join(H.SCRATCH, "smoke");
const FONTS = path.join(__dirname, "fixtures", "fonts");
const only = arg("--case", "") ? new Set(arg("--case").split(",")) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const pw = H.pw(); if (!pw) { console.error("Playwright is not installed"); process.exit(2); }
  fs.rmSync(path.join(OUT, "build"), { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, "build"), { recursive: true });
  const maps = {};
  const fontCss = fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8");
  const srv = await H.serve(null, { map: {}, extra: (rel) => { const m = rel.match(/^part([12])\/(.+)$/); if (m && maps[m[1]]) return maps[m[1]][m[2]] || null; if (rel.startsWith("__fonts/")) return path.join(FONTS, path.basename(rel)); return null; } });
  const url = (n) => srv.url + "part" + n + "/index.html";
  const t0 = Date.now();
  const r = cp.spawnSync(process.execPath, [path.join(H.ROOT, "tools/split/build.js"), path.join(OUT, "build"), process.env.SPLIT_USE || path.join(FIX, "use.json"), process.env.SPLIT_LIVES || path.join(FIX, "act5_lives.json"), url(1), url(2), "--war=" + (process.env.SPLIT_WAR || path.join(FIX, "war_lives.json"))], { cwd: H.ROOT, encoding: "utf8" });
  if (r.status !== 0) { console.log("✗ the split build failed: " + (r.stderr || r.stdout).slice(0, 400)); process.exit(1); }
  for (const n of ["1", "2"]) { maps[n] = JSON.parse(fs.readFileSync(path.join(OUT, "build", "part" + n + ".files.json"), "utf8")); maps[n]["index.html"] = path.join(OUT, "build", "part" + n, "index.html"); }
  console.log("  built: " + r.stdout.trim().split("\n").join("; ") + " (" + ((Date.now() - t0) / 1000).toFixed(1) + " s)");
  const b = await pw.chromium.launch();
  const results = [];
  const saves = (() => { try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, "fixtures", "saves", "current.json.gz"))).toString("utf8")).entries; } catch (e) { return []; } })();

  async function session(part) {
    const ctx = await b.newContext(Object.assign({}, pw.devices["iPhone 15"]));
    // fonts.css names its files /__fonts/<file>, which the browser asks of fonts.googleapis.com (the stylesheet's
    // origin): answer those with the fixture font itself (until 7 Nov they got the CSS back and every face failed).
    await ctx.route(/fonts\.googleapis\.com/, (rt) => { const m = rt.request().url().match(/\/__fonts\/([^?#]+)$/);
      return m ? rt.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync(path.join(FONTS, path.basename(m[1]))) }) : rt.fulfill({ status: 200, contentType: "text/css", body: fontCss }); });
    await ctx.route(/fonts\.gstatic\.com/, (rt) => rt.abort());
    const pg = await ctx.newPage(), bad = [];
    pg.on("pageerror", (e) => bad.push("page error: " + e.message));
    pg.on("console", (m) => { if (m.type() === "error") bad.push("console error: " + m.text().slice(0, 200)); });
    pg.on("requestfailed", (q) => { if (!/fonts\.gstatic/.test(q.url())) bad.push("request failed: " + q.url().replace(srv.url, "/") + " (" + (q.failure() || {}).errorText + ")"); });
    pg.on("response", (q) => { if (q.status() >= 400) bad.push(q.status() + ": " + q.url().replace(srv.url, "/")); });
    await pg.goto(url(part));
    await pg.waitForFunction(() => window.K && K.UI && document.querySelector("#title-btns button"), null, { timeout: 20000 });
    return { ctx, pg, bad };
  }
  const tapSel = async (pg, sel) => { const el = await pg.$(sel); if (!el) return false; await el.scrollIntoViewIfNeeded().catch(() => {}); await el.tap().catch(async () => { await el.click().catch(() => {}); }); return true; };
  // What can be done on the screen now, read from the page.
  const look = (pg) => pg.evaluate(() => {
    const vis = (e) => e && e.offsetParent !== null && !e.disabled && getComputedStyle(e).visibility !== "hidden";
    const sc = K.S && K.SCENES[K.S.scene];
    const choices = [...document.querySelectorAll("#choices .choice")].filter((e) => vis(e) && !e.classList.contains("picked"));
    const plain = choices.filter((e) => { const id = e.id.replace(/^choice-/, ""); const c = sc && (K.val(sc.choices) || []).find((x) => x.id === id); return c && !c.game && !c.combat && !K.leadsToFight(c); });
    return {
      scene: K.S && K.S.scene, act: K.S && K.S.act,
      beat: !!document.getElementById("beat"),
      modal: [...document.querySelectorAll(".scrim .modal button")].filter(vis).map((e) => e.id || e.textContent.trim().slice(0, 30)),
      rt: !!(K.UI.rtScreen && K.UI.rtScreen()), war: !!(K.UI.warScreen && K.UI.warScreen()), oldFight: !!document.querySelector("#battle-actions .act:not([disabled])"),
      brief: !!document.querySelector(".fb-go"), tour: !!document.querySelector("#rt .tc-skip"),
      trial: !!document.querySelector(".trial"), trialBegin: [...document.querySelectorAll(".trial button.cta")].some(vis), trialPlaying: !!document.querySelector(".trial.playing"),
      choices: choices.map((e) => "#" + e.id), plain: plain.map((e) => "#" + e.id),
      cta: [...document.querySelectorAll("#leaf .cta, .endscreen button")].filter(vis).length,
      end: !!document.querySelector(".endscreen"), written: !!document.querySelector("#rt .written"), endcard: !!document.querySelector("#rt .endcard button"),
      // Build B: the commander's orders over a battle day's first page, and the mode asked on waking from the dream
      orders: !!document.querySelector(".moment.orders .ord-go"), fmode: !!document.querySelector('.fmode [data-mode="story"]')
    };
  });
  // One step forward with a real tap (or key), the way a player would; returns what was done, or null when nothing can be.
  async function step(pg, o = {}) {
    for (let tries = 0; tries < 20; tries++) {
      const s = await look(pg);
      if (s.orders) { await tapSel(pg, ".moment.orders .ord-go"); await sleep(700); return "orders for the day at " + s.scene; }
      if (s.fmode) { await tapSel(pg, '.fmode [data-mode="story"]'); await sleep(900); return "Live the story, on waking"; }
      if (s.beat) { await pg.touchscreen.tap(196, 420); await sleep(400); return "card"; }
      if (s.brief) { await tapSel(pg, ".fb-go"); await sleep(400); return "rules card"; }
      if (s.tour) { await tapSel(pg, "#rt .tc-skip"); await sleep(400); return "tour"; }
      if (s.written) { await tapSel(pg, "#rt .written .go"); await sleep(600); return "written"; }
      if (s.endcard) { await tapSel(pg, "#rt .endcard button"); await sleep(600); return "end card"; }
      if (s.rt) return o.fight ? await o.fight(pg) : await playRT(pg);
      if (s.war) return await playWar(pg);
      if (s.oldFight) { await tapSel(pg, "#battle-actions .act:not([disabled])"); await sleep(500); return "turn-based fight move"; }
      if (s.trial && s.trialBegin && !s.trialPlaying) { await tapSel(pg, ".trial button.cta"); await sleep(600); return "test begun"; }
      if (s.trialPlaying) { await pg.keyboard.down(" "); await sleep(700); await pg.keyboard.up(" "); await sleep(300); return "test played"; }
      if (s.end) return "ending";
      if (s.modal.length) { await tapSel(pg, ".scrim .modal button.cta, .scrim #modal-close"); await sleep(400); return "modal"; }
      if (s.choices.length) { const list = o.fights && s.choices.length ? s.choices : s.plain.length ? s.plain : s.choices; await tapSel(pg, list[0]); await sleep(1100); return "choice " + list[0] + " at " + s.scene; }
      if (s.cta) { await tapSel(pg, "#leaf .cta"); await sleep(900); return "button at " + s.scene; }
      // Nothing to tap yet: the page is still being written, or waits for a tap anywhere ("Tap to go on"). A tap
      // on the page, as a player would, hurries it on.
      const box = await pg.evaluate(() => { const l = document.querySelector("#leaf .text, #leaf"); const r = l && l.getBoundingClientRect(); return r && r.height > 40 ? { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 200) } : { x: innerWidth / 2, y: innerHeight * 0.4 }; });
      await pg.touchscreen.tap(box.x, box.y); await sleep(700);
    }
    return null;
  }
  // A real-time fight: ▶ held to walk in, Strike tapped and J pressed; Block or Roll now and then. A long fight is ended
  // (the foes' health set to nothing) after 50 s, so the test does not wait on a bot-less player.
  async function playRT(pg) {
    const t = Date.now();
    const has = async (sel) => !!(await pg.$(sel));
    while (Date.now() - t < 50000) {
      const s = await pg.evaluate(() => { const V = K.UI.rtScreen(); return V ? { over: !!V.R.over, sheet: V.sheet || null } : { gone: true }; });
      if (s.gone || s.over) break;
      if (s.sheet === "retry") { await tapSel(pg, "#rt [data-retry]"); continue; }
      if (s.sheet) { await tapSel(pg, "#rt .sheet:not([hidden]) [data-close]"); continue; }
      const bb = await (await pg.$('#rt [data-hold="r"]')).boundingBox();
      await pg.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
      for (let i = 0; i < 4; i++) { await tapSel(pg, '#rt [data-act="strike"]'); await sleep(180); }
      await pg.keyboard.press("j"); await sleep(150);
      if (await has('#rt [data-act="roll"]')) await tapSel(pg, '#rt [data-act="roll"]');
    }
    const still = await pg.evaluate(() => { const V = K.UI.rtScreen(); return !!(V && !V.R.over); });
    if (still) await pg.evaluate(() => K.Combat.state().units.forEach((u) => { if (u.side === "enemy") u.hp = 0; }));
    for (let i = 0; i < 40 && (await pg.evaluate(() => !!K.UI.rtScreen())); i++) { await sleep(300); const w = await pg.$("#rt .written .go, #rt [data-accept]"); if (w) await w.tap().catch(() => {}); }
    return "real-time fight" + (still ? " (ended after 50 s)" : "");
  }
  // A war-day fight: a place in the line, then the first move card and a tap on a foe, round after round. Since Build B
  // each move is followed by a real-time clash: a few blows struck in it, then Fall back to the orders.
  const clashing = (pg) => pg.evaluate(() => !!(K.UI.warScreen() && (K.UI.warScreen().clashing || K.Combat.state() && K.Combat.state().clashPending)));
  async function clashOut(pg) {
    for (let i = 0; i < 20 && (await clashing(pg)); i++) {
      if (await pg.$("#rt .cl-back")) { for (let k = 0; k < 3; k++) { await tapSel(pg, '#rt [data-act="strike"]'); await sleep(200); } await tapSel(pg, "#rt .cl-back"); }
      await sleep(600);
    }
  }
  async function playWar(pg) {
    const t = Date.now();
    while (Date.now() - t < 60000 && (await pg.evaluate(() => !!(K.UI.warScreen() && !K.UI.warScreen().over && !document.querySelector("#rt .endcard"))))) {
      if (await clashing(pg)) { await clashOut(pg); continue; }
      if (await tapSel(pg, "#rt [data-place]")) { await sleep(500); continue; }
      await tapSel(pg, '#wd-moves [data-move="strike"], #wd-moves button:not([disabled])'); await sleep(250);
      await tapSel(pg, "#rt .foe-tap:not([hidden])"); await sleep(1200);
    }
    await clashOut(pg);
    if (await pg.evaluate(() => !!(K.UI.warScreen() && !document.querySelector("#rt .endcard")))) await pg.evaluate(() => { const B = K.Combat.state(); if (B && !B.over) { B.units.forEach((u) => { if (u.side === "enemy") u.hp = 0; }); K.Combat.settle("win"); K.UI.renderBattle(B); } });
    for (let i = 0; i < 30 && (await pg.evaluate(() => !!K.UI.warScreen())); i++) { await sleep(300); await tapSel(pg, "#rt .endcard button"); }
    return "war-day fight";
  }
  async function walk(pg, bad, n, o = {}) {
    const done = [];
    for (let i = 0; i < n; i++) {
      const d = await step(pg, o);
      if (!d) { const s = await look(pg); bad.push("no way forward at " + s.scene + " (" + JSON.stringify(s).slice(0, 200) + ")"); await pg.screenshot({ path: path.join(OUT, "stuck-" + s.scene + ".png") }).catch(() => {}); break; }
      done.push(d);
      if (d === "ending" || (o.until && (await o.until(pg, done)))) break;
    }
    return done;
  }

  const CASES = {
    "part1-opening": async () => {
      const { ctx, pg, bad } = await session(1);
      if (!(await pg.evaluate(() => window.K_PART && window.K_PART.n === 1))) bad.push("the page is not Part One");
      if (await pg.evaluate(() => !!document.querySelector(".part-note"))) bad.push("the title still has the note about the two parts");
      await tapSel(pg, "#btn-new"); await sleep(800);
      // The one-page creation (owner, 6 November): a land on the map, its card, then one question at a time.
      await tapSel(pg, ".cr-map .m-home .hit"); await sleep(700); await tapSel(pg, "#land-ok"); await sleep(800);
      await pg.fill("#pname", "Ira"); await tapSel(pg, "#cr-next"); await sleep(500);
      for (const sel of ["#pron .opt", "#temps .pick", "#heirs .pick"]) { await tapSel(pg, sel); await sleep(650); }
      if (await pg.evaluate(() => document.querySelector(".cr") && document.querySelector(".cr").scrollHeight > innerHeight + 1)) bad.push("the creation page scrolls");
      await tapSel(pg, "#begin"); await sleep(1500);
      if (!(await pg.evaluate(() => K.S && K.S.scene === K.FIRST_SCENE || (K.S && K.S.seen.includes(K.FIRST_SCENE))))) bad.push("the new life did not begin at the first scene");
      const d = await walk(pg, bad, 80, { until: async (p) => (await p.evaluate(() => K.S.seen.length)) >= 12 });
      const seen = await pg.evaluate(() => K.S.seen.length);
      if (seen < 8) bad.push("only " + seen + " scenes reached: " + d.slice(-3).join(", "));
      await ctx.close(); return { bad, note: seen + " scenes, " + d.length + " steps" };
    },
    "part1-fight": async () => {
      const { ctx, pg, bad } = await session(1);
      await pg.evaluate(() => { const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", temperament: "bold", heirloom: "bow", age: 17, act: 2, path: "charioteer", teacher: "drona" })); K.apply({ flag: ["origin_panchala"] }); K.go("a2_spar"); });
      await sleep(1500);
      const d = await walk(pg, bad, 12, { fights: true, until: async (p) => (await p.evaluate(() => K.S.log.some((l) => /^a2_spar:fight/.test(l)) && !K.UI.rtScreen() && !!document.querySelector("#choices .choice, #leaf .cta"))) });
      if (!d.some((x) => /real-time fight/.test(x))) bad.push("no real-time fight was played (" + d.join(", ") + ")");
      if (!(await step(pg))) bad.push("no way forward after the fight at " + (await look(pg)).scene);
      await ctx.close(); return { bad, note: d.filter((x) => /fight/.test(x)).join(", ") };
    },
    "part2-war": async () => {
      const { ctx, pg, bad } = await session(2);
      const btns = await pg.evaluate(() => [...document.querySelectorAll("#title-btns button")].map((x) => x.id));
      for (const id of ["btn-part1", "btn-act5", "btn-war"]) if (!btns.includes(id)) bad.push("Part Two's title has no " + id);
      if (btns.includes("btn-new")) bad.push("Part Two offers a new life");
      await tapSel(pg, "#btn-war"); await sleep(700);
      const rows = await pg.$$(".part-lives [data-w]");
      if (rows.length < 2) bad.push("Begin at the war lists " + rows.length + " lives");
      if (rows[0]) { await rows[0].tap(); await sleep(1800); }
      const sc = await pg.evaluate(() => K.S.scene);
      if (!/^(a6_eve|w_eve|ep_|cmd_|a6_)/.test(sc)) bad.push("Begin at the war opened " + sc);
      const d = await walk(pg, bad, 40, { fights: true, until: async (p, done) => done.some((x) => /fight/.test(x)) && (await p.evaluate(() => !K.UI.warScreen() && !K.UI.rtScreen() && !document.querySelector("#battle-actions .act"))) });
      if (!d.some((x) => /fight/.test(x))) bad.push("no fight was reached in 40 steps (" + d.slice(-4).join(", ") + ")");
      else if (!(await step(pg))) bad.push("no way forward after the war's first fight at " + (await look(pg)).scene);
      await ctx.close(); return { bad, note: d.length + " steps, " + d.filter((x) => /fight/.test(x)).join(", ") };
    },
    "part2-act5": async () => {
      const { ctx, pg, bad } = await session(2);
      await tapSel(pg, "#btn-act5"); await sleep(700);
      const row = await pg.$(".part-lives [data-i]");
      if (!row) bad.push("Begin at Act V lists no lives");
      else { await row.tap(); await sleep(1800); const s = await look(pg); if (!s.act || s.act < 5) bad.push("Begin at Act V opened act " + s.act + " (" + s.scene + ")"); await walk(pg, bad, 6); }
      // Continue from Part One: a life that reached Act V, as Part One hands it over.
      const e = saves.find((x) => x.act === 5 && x.alive);
      if (!e) bad.push("no Act V save in tests/fixtures/saves/current.json.gz");
      else {
        await pg.evaluate(() => K.UI.renderTitle()); await sleep(500);
        await tapSel(pg, "#btn-part1"); await sleep(500);
        await pg.fill("#code-in", e.code); await tapSel(pg, "#code-load"); await sleep(1800);
        const err = await pg.evaluate(() => (document.getElementById("code-err") || {}).textContent || "");
        if (err) bad.push("Continue from Part One: " + err);
        else { const s = await look(pg); if (s.scene !== e.scene) bad.push("the code opened " + s.scene + ", not " + e.scene); await walk(pg, bad, 6); }
      }
      await ctx.close(); return { bad };
    }
  };
  for (const [id, fn] of Object.entries(CASES)) {
    if (only && !only.has(id)) continue;
    const t = Date.now(); let res;
    try { res = await Promise.race([fn(), sleep(240000).then(() => ({ bad: ["timed out after 240 s"] }))]); } catch (e) { res = { bad: ["threw: " + String(e.stack || e).split("\n").slice(0, 3).join(" | ")] }; }
    const bad = [...new Set(res.bad)];
    results.push({ id, status: bad.length ? "fail" : "pass", problems: bad, note: res.note, ms: Date.now() - t });
    console.log((bad.length ? "✗ " : "ok ") + id.padEnd(16) + (res.note || "") + "  (" + ((Date.now() - t) / 1000).toFixed(1) + " s)");
    for (const p of bad.slice(0, 10)) console.log("    " + p.slice(0, 240));
  }
  await b.close(); await srv.close();
  if (!has("--keep")) fs.rmSync(path.join(OUT, "build"), { recursive: true, force: true });
  const fails = results.filter((x) => x.status === "fail");
  console.log("smoke: " + results.length + " walks through the built parts, " + (fails.length ? fails.length + " failed" : "all clean") + " (" + ((Date.now() - t0) / 1000).toFixed(1) + " s)");
  const JF = arg("--json", ""); if (JF) fs.writeFileSync(JF, JSON.stringify({ failed: fails.map((x) => x.id), browserFailed: fails.map((x) => x.id), results }, null, 1));
  process.exit(fails.length ? 1 : 0);
})();
