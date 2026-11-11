/* Visual baselines: screenshots of the key screens, compared with tests/baselines/shots/ pixel by pixel.
   Screens: the title, character creation, a story page with its choices, a real-time fight paused at 3 s of its own
   time, the war-day screen, the real-time Orders and Aid menus, the paused menu with Resume, a test (the tag game's
   card), the map, and an ending. Devices: iPhone SE, iPhone 15 and a 1440x900 laptop; English and Hindi.
   Held still so two runs match: a seeded Math.random and K.seed, Calm motion (no live rigs or effects), no living
   paintings, CSS animations run to their end (Playwright's animations: "disabled"), the fonts served from
   tests/fixtures/fonts (never Google's, so every machine draws the same text) and drawn unhinted in grey
   (tests/fixtures/fonts/render.conf, whatever the machine's own font settings), a fixed life or a save code from
   tests/fixtures/saves.
   A shot differs when more than --tolerance of its pixels (default 1.5%) move by more than --delta (default 48 of 255)
   in any channel from every pixel within --radius (default 2) of them in the other shot, either way (so text drawn a
   fraction of a pixel aside by another machine is not a difference: on GitHub's runners the dense Hindi text moved
   up to 4.8% of a shot's pixels that way, 0.7% with the radius; a card with its lines gone still moves 3.6%); the
   baseline, the new shot and a map of the changed pixels go to <out>/visual/ for each difference.
   Baselines are JPEGs at CSS pixels (the laptop's scaled to 960x600) to keep the folder small.
   Usage: node tests/visual.js [--accept] [--case id,id] [--device se,15,laptop] [--lang en,hi] [--tolerance 0.015]
          [--delta 48] [--radius 2] [--json FILE]      (--accept rewrites the baselines it takes; case ids: <screen>-<device>-<lang>)
   Exits 1 on any difference or missing baseline. */
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const H = require("./lib/harness");
const { arg, has } = H;
const BASE = path.join(__dirname, "baselines", "shots");
const OUT = path.join(H.SCRATCH, "visual");
const FONTS = path.join(__dirname, "fixtures", "fonts");
const TOL = parseFloat(arg("--tolerance", "0.015")), DELTA = parseInt(arg("--delta", "48"), 10), RAD = parseInt(arg("--radius", "2"), 10);
const ACCEPT = has("--accept");
const only = arg("--case", "") ? new Set(arg("--case").split(",")) : null;
const DEVS = { se: { name: "iPhone SE", pw: "iPhone SE" }, 15: { name: "iPhone 15", pw: "iPhone 15" }, laptop: { name: "Laptop 1440x900", viewport: { width: 1440, height: 900 }, store: { width: 960, height: 600 } } };
const devList = arg("--device", "se,15,laptop").split(","), langs = arg("--lang", "en,hi").split(",");
const saves = (() => { try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname, "fixtures", "saves", "current.json.gz"))).toString("utf8")).entries; } catch (e) { return []; } })();
const codeAt = (pred) => (saves.find(pred) || {}).code || null;
const WAR_CODE = codeAt((e) => e.act >= 6 && e.alive && !/^end_/.test(e.scene));
const END_CODE = codeAt((e) => e.scene === "end_life");

// ---------- In the page ----------
const LIFE = { name: "Ira", pronoun: "she", origin: "panchala", temperament: "bold", heirloom: "amulet", teacher: "drona" };
const fightLife = (o) => `(() => { const S = (K.S = Object.assign(K.newLife(), ${JSON.stringify(LIFE)}, { age: 38, act: 5, path: "charioteer", side: "pandava" }, ${JSON.stringify(o || {})})); S.attrs.might = 3; S.attrs.grace = 3; S.items.herbs = 2; S.flags.push("role_front"); S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1; return S; })()`;
// Each screen: a function run in the page that brings it up (it may return a promise), and how long to let it settle.
const SCREENS = [
  { id: "title", go: () => { K.UI.renderTitle(); } },
  { id: "create", go: () => { document.getElementById("btn-new").click(); }, wait: 2600 }, // (past the opening: owner, 7 November)
  { id: "story", go: new Function(`const S = (K.S = Object.assign(K.newLife(), ${JSON.stringify(LIFE)})); K.apply(K.ORIGINS[S.origin].fx); K.apply({ flag: ["origin_panchala", "temper_bold", "heir_amulet"] }); K.seed(5); K.go("a1_home");`) },
  { id: "fight", go: new Function(`${fightLife()}; K.seed(3); K.UI.startBattle("e_bandits", () => {}); const V = K.UI.rtScreen(); V.paused = true; for (let i = 0; i < 180 && !V.R.over; i++) { K.Combat.player().hp = K.Combat.player().maxHp; K.RT.step(V.R, K.RT.bot(V.R)); }`), wait: 900 },
  { id: "warday", go: new Function(`${fightLife({ age: 44, act: 6, path: "archer" })}; K.seed(3); K.UI.startBattle("e_day16", () => {}); return new Promise((ok) => setTimeout(() => { const b = document.querySelector('#rt [data-place="front"]'); if (b) b.click(); setTimeout(ok, 700); }, 1500));`), wait: 900 },
  { id: "orders", go: new Function(`${fightLife({ age: 44, act: 6, path: "strategist" })}; K.seed(3); K.UI.startBattle("e_guard", () => {}); const V = K.UI.rtScreen(); V.paused = true; for (let i = 0; i < 60; i++) K.RT.step(V.R, {}); return new Promise((ok) => setTimeout(() => { document.querySelector('#rt [data-act="orders"]').click(); clearTimeout(V.dropT); setTimeout(ok, 500); }, 600));`), wait: 400 },
  { id: "aid", go: new Function(`${fightLife({ age: 44, act: 6, path: "strategist" })}; K.seed(3); K.UI.startBattle("e_guard", () => {}); const V = K.UI.rtScreen(); V.paused = true; for (let i = 0; i < 60; i++) K.RT.step(V.R, {}); return new Promise((ok) => setTimeout(() => { document.querySelector('#rt [data-act="aid"]').click(); clearTimeout(V.dropT); setTimeout(ok, 500); }, 600));`), wait: 400 },
  { id: "paused", go: new Function(`${fightLife({ age: 44, act: 6, path: "mace" })}; K.seed(3); K.UI.startBattle("e_guard", () => {}); const V = K.UI.rtScreen(); V.paused = true; for (let i = 0; i < 60; i++) K.RT.step(V.R, {}); return new Promise((ok) => setTimeout(() => { document.querySelector('#rt [data-act="pause"]').click(); setTimeout(ok, 500); }, 600));`), wait: 400 },
  { id: "test", go: new Function(`const S = (K.S = Object.assign(K.newLife(), ${JSON.stringify(LIFE)}, { origin: "hastinapura", age: 8, act: 1 })); S.seen.push("a1_princes"); S.scene = "a1_princes"; K.seed(2); K.resume(S); return new Promise((ok) => setTimeout(() => { document.getElementById("choice-bhima").click(); setTimeout(ok, 1500); }, 1200));`), wait: 600 },
  { id: "map", go: new Function("code", `const s = K.importCode(code); K.seed(4); K.resume(s); return new Promise((ok) => setTimeout(() => { K.UI.openMap(); setTimeout(ok, 800); }, 800));`), arg: WAR_CODE },
  { id: "ending", go: new Function("code", `const s = K.importCode(code); K.seed(4); K.resume(s);`), arg: END_CODE, wait: 2500 }
];

(async () => {
  const pw = H.pw(); if (!pw) { console.error("Playwright is not installed"); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(BASE, { recursive: true });
  const fontCss = fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8");
  const srv = await H.serve(H.GAME, { extra: (rel) => (rel.startsWith("__fonts/") ? path.join(FONTS, path.basename(rel)) : null) });
  // The same text rendering on every machine (tests/fixtures/fonts/render.conf): GitHub's runners hint text, this does not.
  const b = await pw.chromium.launch({ env: Object.assign({}, process.env, { FONTCONFIG_FILE: path.join(FONTS, "render.conf") }) });
  const cmp = await (await b.newContext()).newPage();
  // Scale a PNG to its stored size and encode it as a JPEG; compare two JPEGs; draw what changed. All in a canvas.
  await cmp.setContent("<canvas></canvas>");
  const enc = (png, w, h) => cmp.evaluate(async ([png, w, h]) => { const im = new Image(); im.src = "data:image/png;base64," + png; await im.decode(); const c = document.createElement("canvas"); c.width = w || im.width; c.height = h || im.height; const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(im, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.72).split(",")[1]; }, [png, w, h]);
  const diff = (a, bb, delta, rad) => cmp.evaluate(async ([a, bb, delta, rad]) => {
    const load = async (s) => { const im = new Image(); im.src = "data:image/jpeg;base64," + s; await im.decode(); const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d"); g.drawImage(im, 0, 0); return { w: im.width, h: im.height, d: g.getImageData(0, 0, im.width, im.height).data }; };
    const A = await load(a), B = await load(bb);
    if (A.w !== B.w || A.h !== B.h) return { size: A.w + "x" + A.h + " vs " + B.w + "x" + B.h, frac: 1 };
    const c = document.createElement("canvas"); c.width = A.w * 3; c.height = A.h; const g = c.getContext("2d");
    const out = g.createImageData(A.w, A.h); let n = 0;
    // A pixel has changed when nothing within `rad` pixels of it in the other shot is within `delta`, both ways:
    // text drawn a fraction of a pixel aside (another machine's glyph rasteriser) is not a change; a moved,
    // missing or recoloured element is.
    const W = A.w, H = A.h;
    const far = (X, Y, x, y) => {
      const i = (y * W + x) * 4;
      for (let dy = -rad; dy <= rad; dy++) { const yy = y + dy; if (yy < 0 || yy >= H) continue;
        for (let dx = -rad; dx <= rad; dx++) { const xx = x + dx; if (xx < 0 || xx >= W) continue;
          const j = (yy * W + xx) * 4;
          if (Math.abs(X[i] - Y[j]) <= delta && Math.abs(X[i + 1] - Y[j + 1]) <= delta && Math.abs(X[i + 2] - Y[j + 2]) <= delta) return false; } }
      return true;
    };
    for (let i = 0; i < A.d.length; i += 4) {
      const x = (i / 4) % W, y = Math.floor(i / 4 / W);
      const m = Math.max(Math.abs(A.d[i] - B.d[i]), Math.abs(A.d[i + 1] - B.d[i + 1]), Math.abs(A.d[i + 2] - B.d[i + 2]));
      const hit = m > delta && (far(A.d, B.d, x, y) || far(B.d, A.d, x, y)); if (hit) n++;
      const grey = (B.d[i] + B.d[i + 1] + B.d[i + 2]) / 3 * 0.35;
      out.data[i] = hit ? 255 : grey; out.data[i + 1] = hit ? 0 : grey; out.data[i + 2] = hit ? 0 : grey; out.data[i + 3] = 255;
    }
    const ia = new Image(); ia.src = "data:image/jpeg;base64," + a; await ia.decode(); const ib = new Image(); ib.src = "data:image/jpeg;base64," + bb; await ib.decode();
    g.drawImage(ia, 0, 0); g.drawImage(ib, A.w, 0); g.putImageData(out, A.w * 2, 0);
    return { frac: n / (A.w * A.h), img: n ? c.toDataURL("image/jpeg", 0.8).split(",")[1] : null };
  }, [a, bb, delta, rad]);

  const results = [];
  for (const dk of devList) for (const lang of langs) {
    const dev = DEVS[dk]; if (!dev) { console.error("no device " + dk); process.exit(2); }
    const ids = SCREENS.map((s) => s.id + "-" + dk + "-" + lang);
    if (only && !ids.some((i) => only.has(i))) continue;
    for (const S of SCREENS) {
      const id = S.id + "-" + dk + "-" + lang;
      if (only && !only.has(id)) continue;
      const t = Date.now();
      // A fresh page for each screen: nothing left over from the one before.
      const ctxOpts = Object.assign({}, dev.pw ? pw.devices[dev.pw] : { viewport: dev.viewport }, { deviceScaleFactor: 1, reducedMotion: "reduce", colorScheme: "light", locale: lang === "hi" ? "hi-IN" : "en-GB", timezoneId: "Asia/Kolkata" });
      const ctx = await b.newContext(ctxOpts);
      await ctx.addInitScript(([lang]) => {
        let s = 12345; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
        try { localStorage.clear(); localStorage.setItem("kurukshetra.v2.prefs", JSON.stringify({ lang, calm: true, living: false, gradual: false, beats: false })); } catch (e) { /* a page without storage */ }
      }, [lang]);
      // fonts.css names its files /__fonts/<file>, which the browser asks of fonts.googleapis.com (the stylesheet's
      // origin): answer those with the fixture font itself (until 7 Nov they got the CSS back and every face failed).
      await ctx.route(/fonts\.googleapis\.com/, (r) => { const m = r.request().url().match(/\/__fonts\/([^?#]+)$/);
        return m ? r.fulfill({ status: 200, contentType: "font/woff2", body: fs.readFileSync(path.join(FONTS, path.basename(m[1]))) }) : r.fulfill({ status: 200, contentType: "text/css", body: fontCss }); });
      await ctx.route(/fonts\.gstatic\.com/, (r) => r.abort());
      const pg = await ctx.newPage(), errs = [];
      pg.on("pageerror", (e) => errs.push("page error: " + e.message));
      let problem = null, shot = null;
      try {
        await pg.goto(srv.url + "index.html");
        await pg.waitForFunction(() => window.K && K.UI && document.querySelector("#title-btns button"), null, { timeout: 15000 });
        if (S.arg === null) throw new Error("no save fixture for this screen (tests/fixtures/saves/current.json.gz)");
        await pg.evaluate(S.go, S.arg);
        await pg.evaluate(() => document.fonts.ready.then(() => true));
        // A painting inside an SVG (the creation page's map) has no load state to wait on: the same file is fetched and
        // decoded here (from the cache), so it is on screen before the shot rather than the drawn stand-in.
        await pg.evaluate(() => Promise.all([...document.querySelectorAll("svg image")].map((i) => { const im = new Image(); im.src = i.getAttribute("href"); return im.decode().catch(() => null); })));
        await pg.waitForTimeout(S.wait || 1500);
        const png = (await pg.screenshot({ animations: "disabled", caret: "hide", type: "png" })).toString("base64");
        shot = await enc(png, dev.store && dev.store.width, dev.store && dev.store.height);
      } catch (e) { problem = "could not bring the screen up: " + String(e.message || e).split("\n")[0]; }
      await ctx.close();
      const file = path.join(BASE, id + ".jpg");
      const r = { id, screen: S.id, device: dev.name, lang, ms: Date.now() - t, status: "pass", frac: 0 };
      if (problem || errs.length) { r.status = "fail"; r.problems = [problem].concat(errs).filter(Boolean); }
      else if (ACCEPT) { fs.writeFileSync(file, Buffer.from(shot, "base64")); r.status = "accepted"; }
      else if (!fs.existsSync(file)) { r.status = "fail"; r.problems = ["no baseline (node tests/visual.js --accept --case " + id + ")"]; fs.writeFileSync(path.join(OUT, id + ".new.jpg"), Buffer.from(shot, "base64")); }
      else {
        const d = await diff(fs.readFileSync(file).toString("base64"), shot, DELTA, RAD);
        r.frac = Math.round(d.frac * 10000) / 10000;
        if (d.size || d.frac > TOL) {
          r.status = "fail"; r.problems = [d.size ? "size changed: " + d.size : Math.round(d.frac * 1000) / 10 + "% of the pixels changed (tolerance " + TOL * 100 + "%)"];
          fs.writeFileSync(path.join(OUT, id + ".new.jpg"), Buffer.from(shot, "base64"));
          if (d.img) fs.writeFileSync(path.join(OUT, id + ".diff.jpg"), Buffer.from(d.img, "base64"));
          r.diff = path.join(OUT, id + ".diff.jpg");
        }
      }
      results.push(r);
      console.log((r.status === "fail" ? "✗ " : r.status === "accepted" ? "+ " : "ok ") + id.padEnd(22) + (r.status === "pass" ? (r.frac * 100).toFixed(2) + "% changed" : r.status === "accepted" ? "baseline written" : r.problems.join("; ")) + "  (" + (r.ms / 1000).toFixed(1) + " s)");
    }
  }
  await b.close(); await srv.close();
  const fails = results.filter((r) => r.status === "fail");
  const size = fs.readdirSync(BASE).reduce((a, f) => a + fs.statSync(path.join(BASE, f)).size, 0);
  console.log("visual: " + results.length + " shots, " + (ACCEPT ? results.filter((r) => r.status === "accepted").length + " baselines written" : fails.length ? fails.length + " differ" : "all match") + (fails.length ? " (images in " + OUT + ")" : "") + "; baselines " + Math.round(size / 1024) + " KB");
  const JF = arg("--json", ""); if (JF) fs.writeFileSync(JF, JSON.stringify({ failed: fails.map((r) => r.id), browserFailed: fails.map((r) => r.id), results }, null, 1));
  process.exit(fails.length ? 1 : 0);
})();
