/* Old saves still load. Fixtures in tests/fixtures/saves/<rev>.json.gz hold what a player of that version has: save codes
   copied at points through a life (childhood, the court years, the exile, the war, an ending) and the browser's
   storage (kurukshetra.v2.auto, the act checkpoints kurukshetra.v2.acts where the version kept them, and the rest).
   They were made from the main branch, older commits and the current game, by --make, which plays seeded lives on
   each version's own engine in a temporary git worktree (removed afterwards).
   Each must, in the current game:
     - load: K.importCode(code) gives a life (cleaned), and K.loadSlot("auto") the stored one;
     - continue: resumed, the life plays on for 150 choices (or to its end) without a throw or a dead end;
     - go back to an act: every act checkpoint the storage lists opens (K.checkpointLife) and plays on;
     - in the browser (--browser, the full tier): the title screen offers Continue (and the Menu's Start again from an act where
       there are checkpoints), Continue opens a scene with a way forward, an act opens, and "Load a save code" takes
       the code; no page error.
   Usage: node tests/saves.js [--browser] [--case id,id] [--json FILE]
          node tests/saves.js --make REV [REV...] | --make current   (writes tests/fixtures/saves/<rev>.json.gz) */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const zlib = require("zlib");
const H = require("./lib/harness");
const { arg, has } = H;
const FIX = path.join(__dirname, "fixtures", "saves");

// ---------- --make: fixtures from a version of the game ----------
// The generator runs in its own process on that version's engine and content (as tests/lives.js loads them), with a
// stand-in localStorage, and saves as the screen would (K.save("auto") on each scene where the version had no commit).
const GEN = String.raw`
const fs = require("fs"), path = require("path");
const G = process.argv[2], OUT = process.argv[3];
const store = {}; global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.window = global; global.K = {}; global.btoa = (s) => Buffer.from(s, "binary").toString("base64"); global.atob = (s) => Buffer.from(s, "base64").toString("binary");
const html = fs.readFileSync(path.join(G, "index.html"), "utf8");
for (const src of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((s) => /js\/(engine|content)\//.test(s))) (0, eval)(fs.readFileSync(path.join(G, src), "utf8"));
K.UI = { esc: (s) => s }; if (fs.existsSync(path.join(G, "js/ui/map.js"))) try { (0, eval)(fs.readFileSync(path.join(G, "js/ui/map.js"), "utf8")); } catch (e) {}
if (K.RT) K.RT.force = false;
const pick = (a) => a[Math.floor(K.rng() * a.length)];
const out = [];
const LIVES = [["panchala", "she", false], ["suta", "he", true], ["mathura", "they", false], ["gandhara", "she", true]];
LIVES.forEach(([origin, pronoun, story], li) => {
  for (const k of Object.keys(store)) delete store[k];
  K.seed(4242 + li * 977);
  const S = (K.S = K.newLife()); if (K.momentQueue) K.momentQueue.length = 0;
  S.name = "Ira"; S.pronoun = pronoun; S.origin = origin; S.temperament = pick(Object.keys(K.TEMPERAMENTS)); S.heirloom = pick(Object.keys(K.HEIRLOOMS)); S.storyMode = story;
  K.apply(K.ORIGINS[S.origin].fx); K.apply(K.TEMPERAMENTS[S.temperament].fx); K.apply(K.HEIRLOOMS[S.heirloom].fx);
  K.apply({ flag: ["origin_" + S.origin, "temper_" + S.temperament, "heir_" + S.heirloom] });
  if (K.store && K.store.set) K.store.set("kurukshetra.v2.prefs", JSON.stringify({ lang: li % 2 ? "hi" : "en", calm: li % 3 === 0 }));
  const go = (id) => { K.go(id); if (!K.commit && K.save) K.save("auto"); };
  go(K.FIRST_SCENE);
  const at = new Set([12, 45, 90, 140]);
  for (let step = 0; step < 900; step++) {
    const sc = K.SCENES[K.S.scene];
    if (at.has(step) || sc.ending || (K.S.act >= 6 && !out.some((o) => o.life === li && o.act >= 6))) {
      let code = null; try { code = K.exportCode(K.checkpoint ? { acts: true, here: true } : undefined); } catch (e) { code = K.exportCode(); }
      out.push({ id: "life" + li + "-" + sc.id + "-" + step, life: li, scene: sc.id, act: K.S.act, age: K.S.age, alive: K.S.alive, code, storage: Object.assign({}, store) });
    }
    if (sc.ending) break;
    const list = K.choiceList(sc).filter((x) => x.ok); if (!list.length) break;
    const { c } = pick(list);
    const res = c.game ? K.choose(sc, c, pick(["win", "win", "close"])) : K.choose(sc, c);
    let next = res.next;
    if (res.combat) next = K.combatOutcome(res.combat, pick(["win", "win", "lose"]), res.next).next;
    if (!K.S.alive) next = "end_death";
    go(next);
  }
});
fs.writeFileSync(OUT, JSON.stringify(out));
`;
function make(revs) {
  fs.mkdirSync(FIX, { recursive: true });
  const genFile = path.join(H.SCRATCH, "saves_gen.js"); fs.mkdirSync(H.SCRATCH, { recursive: true }); fs.writeFileSync(genFile, GEN);
  for (const rev of revs) {
    const cur = rev === "current";
    const sha = cur ? cp.execSync("git rev-parse --short HEAD", { cwd: H.ROOT }).toString().trim() : cp.execSync("git rev-parse --short " + rev, { cwd: H.ROOT }).toString().trim();
    const date = cp.execSync("git show -s --format=%ad --date=short " + (cur ? "HEAD" : sha), { cwd: H.ROOT }).toString().trim();
    let game = H.GAME, wt = null;
    if (!cur) { wt = path.join(H.SCRATCH, "saves-wt-" + sha); if (fs.existsSync(wt)) cp.execSync("git worktree remove --force " + JSON.stringify(wt), { cwd: H.ROOT }); cp.execSync("git worktree add --detach " + JSON.stringify(wt) + " " + sha, { cwd: H.ROOT, stdio: "ignore" }); game = path.join(wt, "game"); }
    try {
      const tmp = path.join(H.SCRATCH, "saves-" + sha + ".json");
      const r = cp.spawnSync(process.execPath, [genFile, game, tmp], { encoding: "utf8" });
      if (r.status !== 0) { console.log("✗ " + rev + ": the generator failed: " + (r.stderr || "").split("\n").slice(0, 4).join(" | ")); continue; }
      const entries = JSON.parse(fs.readFileSync(tmp, "utf8"));
      const name = cur ? "current" : rev.replace(/[^\w.-]+/g, "_");
      fs.writeFileSync(path.join(FIX, name + ".json.gz"), zlib.gzipSync(JSON.stringify({ rev: sha, from: rev, date, made: new Date().toISOString().slice(0, 10), entries }), { level: 9 }));
      console.log("ok  " + name + " (" + sha + ", " + date + "): " + entries.length + " saves, " + entries.filter((e) => e.storage["kurukshetra.v2.acts"]).length + " with act checkpoints");
    } finally { if (wt) cp.execSync("git worktree remove --force " + JSON.stringify(wt), { cwd: H.ROOT }); }
  }
}
if (has("--make")) { const i = process.argv.indexOf("--make"); make(process.argv.slice(i + 1).filter((a) => !a.startsWith("--"))); process.exit(0); }

// ---------- The checks ----------
const fixtures = fs.existsSync(FIX) ? fs.readdirSync(FIX).filter((f) => f.endsWith(".json.gz")).sort().map((f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(FIX, f))).toString("utf8"))) : [];
if (!fixtures.length) { console.log("✗ no fixtures in " + path.relative(H.ROOT, FIX) + " (node tests/saves.js --make main current)"); process.exit(1); }
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const K = H.engine({ hindi: true });
K.RT.force = false;
const setStore = (o) => { for (const k of Object.keys(store)) delete store[k]; Object.assign(store, o || {}); };
function playOn(where, n) {
  const pick = (a) => a[Math.floor(K.rng() * a.length)];
  for (let step = 0; step < n; step++) {
    const sc = K.SCENES[K.S.scene];
    if (!sc) return where + ": the life is at a scene that does not exist (" + K.S.scene + ")";
    if (sc.ending) { try { sc.ending(K.S); } catch (e) { return where + ": the ending throws: " + e.message; } return null; }
    const list = K.choiceList(sc).filter((x) => x.ok);
    if (!list.length) return where + ": no way forward at " + sc.id;
    const { c } = pick(list);
    let res;
    try { res = c.game ? K.choose(sc, c, pick(["win", "close", "lose"])) : K.choose(sc, c); } catch (e) { return where + ": " + sc.id + ":" + c.id + " throws: " + e.message; }
    let next = res.next;
    if (res.combat) { try { next = K.combatOutcome(res.combat, pick(["win", "lose"]), res.next).next; } catch (e) { return where + ": the fight " + res.combat + " throws: " + e.message; } }
    if (!K.S.alive) next = "end_death";
    try { K.go(next); } catch (e) { return where + ": going to " + next + " throws: " + e.message; }
  }
  return null;
}
const cases = [];
for (const fx of fixtures) for (const e of fx.entries) cases.push({ id: (fx.from === "current" ? "current" : fx.from) + ":" + e.id, fx, e });
const only = arg("--case", "") ? new Set(arg("--case").split(",")) : null;
const results = [];
const t0 = Date.now();
for (const k of cases) {
  if (only && !only.has(k.id)) continue;
  const { e } = k, bad = [];
  K.seed(99); K.lang = "en";
  // The code
  let s = null;
  try { s = K.importCode(e.code); } catch (x) { bad.push("the save code does not load: " + x.message); }
  if (s) { try { setStore({}); K.resume(s); if (K.S.scene !== e.scene) bad.push("the code opens at " + K.S.scene + ", not " + e.scene); const p = playOn("from the code", 150); if (p) bad.push(p); } catch (x) { bad.push("resuming the code throws: " + x.message); } }
  // The stored life and its act checkpoints
  setStore(e.storage);
  if (e.storage["kurukshetra.v2.auto"]) {
    const a = K.loadSlot("auto");
    if (!a) bad.push("the stored life (kurukshetra.v2.auto) does not load");
    else { try { K.resume(a); const p = playOn("from Continue", 150); if (p) bad.push(p); } catch (x) { bad.push("Continue throws: " + x.message); } }
  }
  if (e.storage["kurukshetra.v2.acts"]) {
    setStore(e.storage);
    const cps = K.checkpoints();
    if (!cps || !cps.acts.length) bad.push("the act checkpoints are stored but none is listed");
    else for (const a of cps.acts) {
      setStore(e.storage);
      const life = K.checkpointLife(a.act);
      if (!life) { bad.push("act " + a.act + " does not open"); continue; }
      try { K.backToAct(a.act); const p = playOn("from act " + a.act, 60); if (p) bad.push(p); } catch (x) { bad.push("going back to act " + a.act + " throws: " + x.message); }
    }
  }
  results.push({ id: k.id, rev: k.fx.rev, date: k.fx.date, scene: e.scene, status: bad.length ? "fail" : "pass", problems: bad });
}

(async () => {
  if (has("--browser")) {
    const pw = H.pw(); if (!pw) { console.log("✗ Playwright is not installed"); process.exit(2); }
    const b = await pw.chromium.launch(), srv = await H.serve(H.GAME);
    // In the browser: one save per version at each stage of a life (the first, middle and last), as the player has it.
    const pickB = [];
    for (const fx of fixtures) { const es = fx.entries; for (const e of [es[0], es[Math.floor(es.length / 2)], es.find((x) => x.storage["kurukshetra.v2.acts"]), es[es.length - 1]].filter(Boolean)) if (!pickB.some((p) => p.e === e)) pickB.push({ fx, e, id: "browser:" + (fx.from === "current" ? "current" : fx.from) + ":" + e.id }); }
    for (const k of pickB) {
      if (only && !only.has(k.id)) continue;
      const bad = [];
      const ctx = await b.newContext(Object.assign({}, pw.devices["iPhone 15"]));
      await ctx.addInitScript((st) => { if (!sessionStorage.getItem("__seeded")) { localStorage.clear(); for (const [kk, v] of Object.entries(st)) localStorage.setItem(kk, v); sessionStorage.setItem("__seeded", "1"); } }, k.e.storage);
      const pg = await ctx.newPage(), errs = [];
      pg.on("pageerror", (x) => errs.push("page error: " + x.message));
      await pg.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
      try {
        await pg.goto(srv.url + "index.html"); await pg.waitForFunction(() => window.K && K.UI && document.querySelector("#title-btns button"), null, { timeout: 15000 });
        await pg.waitForTimeout(400);
        const forward = async (what) => { await pg.waitForTimeout(1600); const r = await pg.evaluate(() => ({ scene: K.S && K.S.scene, choices: document.querySelectorAll("#choices .choice:not([disabled])").length, cta: document.querySelectorAll("#leaf .cta, .endscreen button, .endscreen .cta").length, end: !!document.querySelector(".endscreen") })); if (!r.choices && !r.cta && !r.end) bad.push(what + ": no way forward at " + r.scene); return r; };
        if (k.e.storage["kurukshetra.v2.auto"]) {
          const cont = await pg.$("#btn-continue");
          if (!cont) bad.push("no Continue on the title screen");
          else { await cont.click(); const r = await forward("Continue"); if (k.e.alive && r.scene !== k.e.scene) bad.push("Continue opened " + r.scene + ", not " + k.e.scene); }
        }
        if (k.e.storage["kurukshetra.v2.acts"]) {
          // (From the Menu since 7 November: the title screen no longer offers it.)
          await pg.evaluate(() => { K.UI.renderTitle(); K.UI.openActs(); }); await pg.waitForTimeout(500);
          const btn = await pg.$(".actlist [data-act]"); if (!btn) bad.push("the acts list is empty"); else { await btn.click(); await forward("an act"); }
        }
        await pg.evaluate(() => { K.UI.renderTitle(); K.UI.openLoad(); }); await pg.waitForTimeout(300);
        await pg.fill("#code-in", k.e.code); await pg.click("#code-load"); await pg.waitForTimeout(300);
        const err = await pg.evaluate(() => (document.getElementById("code-err") || {}).textContent || "");
        if (err) bad.push("Load a save code: " + err); else await forward("Load a save code");
      } catch (x) { bad.push("threw: " + String(x.message || x).split("\n")[0]); }
      bad.push(...errs);
      results.push({ id: k.id, rev: k.fx.rev, date: k.fx.date, scene: k.e.scene, status: bad.length ? "fail" : "pass", problems: bad, browser: true });
      await ctx.close();
    }
    await b.close(); await srv.close();
  }
  const known = H.knownFailures("saves");
  for (const r of results) if (r.status === "fail" && known.some((k) => r.id.includes(k.match))) r.status = "known";
  const by = {};
  for (const r of results) { const v = r.id.replace(/^browser:/, "").split(":")[0] + (r.browser ? " (browser)" : ""); (by[v] = by[v] || { pass: 0, fail: 0, known: 0, date: r.date })[r.status]++; }
  for (const r of results.filter((x) => x.status !== "pass")) console.log((r.status === "known" ? "KNOWN " : "✗ ") + r.id + " (" + r.scene + ")\n    " + r.problems.slice(0, 5).join("\n    "));
  for (const [v, c] of Object.entries(by)) console.log("  " + v.padEnd(26) + " " + c.date + "  " + c.pass + " load and play on" + (c.fail ? ", " + c.fail + " fail" : "") + (c.known ? ", " + c.known + " known" : ""));
  const fails = results.filter((r) => r.status === "fail");
  console.log("saves: " + results.length + " checked (" + fixtures.length + " versions), " + (fails.length ? fails.length + " fail" : "all load and continue") + " (" + ((Date.now() - t0) / 1000).toFixed(1) + " s)");
  const JF = arg("--json", ""); if (JF) fs.writeFileSync(JF, JSON.stringify({ failed: fails.map((r) => r.id), browserFailed: fails.filter((r) => r.browser).map((r) => r.id), results }, null, 1));
  process.exit(fails.length ? 1 : 0);
})();
