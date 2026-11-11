/* Shared pieces for the regression tests (tests/run.js and the checks it runs).
   engine()   loads the engine and content into this Node process (global K, as tests/lives.js does), optionally
              with the Hindi dictionary and the map helpers; fast, no page.
   ui()       boots the whole game (engine, content, interface) in a jsdom window of a given size and language,
              as tests/playthrough.js does; returns { w, d, K, U, errors }.
   serve()    a tiny static server for a folder (the browser checks), with a log of every 404.
   pw()       Playwright, wherever it is installed.
   Nothing here changes the game: it only loads its files. */
"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.join(__dirname, "..", "..");
const GAME = ROOT;
const html = () => fs.readFileSync(path.join(GAME, "index.html"), "utf8");
const scriptsOf = (h) => [...h.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);

// The engine and content in this process (window = global). opts.hindi: K.addStrings("hi", ...) too.
let loaded = null;
function engine(opts = {}) {
  if (loaded) return loaded;
  global.window = global; global.K = {};
  for (const src of scriptsOf(html()).filter((s) => /js\/(engine|content)\//.test(s))) (0, eval)(fs.readFileSync(path.join(GAME, src), "utf8") + "\n//# sourceURL=" + src);
  global.K.UI = { esc: (s) => s };
  if (opts.map !== false) (0, eval)(fs.readFileSync(path.join(GAME, "js/ui/map.js"), "utf8"));
  if (opts.hindi) (0, eval)(fs.readFileSync(path.join(GAME, "js/i18n/hi.js"), "utf8"));
  global.K.save = () => true;
  global.btoa = global.btoa || ((s) => Buffer.from(s, "binary").toString("base64"));
  global.atob = global.atob || ((s) => Buffer.from(s, "base64").toString("binary"));
  loaded = global.K;
  return loaded;
}

// The whole game in jsdom. opts: { seed, lang, width, height, hindi (load hi.js, default true), storage: {k: v}, rt }
function ui(opts = {}) {
  const { JSDOM, VirtualConsole } = require("jsdom");
  const vc = new VirtualConsole(), errors = [];
  vc.on("jsdomError", (e) => errors.push(e.detail && e.detail.stack ? e.detail.stack : String(e.message || e)));
  const h = html();
  const dom = new JSDOM(h.replace(/<script src="[^"]+"><\/script>/g, ""), { runScripts: "outside-only", pretendToBeVisual: true, url: "https://localhost/", virtualConsole: vc });
  const w = dom.window;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  if (opts.width) Object.defineProperty(w, "innerWidth", { value: opts.width, configurable: true, writable: true });
  if (opts.height) Object.defineProperty(w, "innerHeight", { value: opts.height, configurable: true, writable: true });
  let s = (opts.seed || 1) >>> 0;
  w.Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  w.console.warn = (m) => errors.push("warn: " + m);
  if (opts.lang) w.localStorage.setItem("kurukshetra.v2.prefs", JSON.stringify({ lang: opts.lang }));
  for (const [k, v] of Object.entries(opts.storage || {})) w.localStorage.setItem(k, v);
  const scripts = scriptsOf(h);
  if (opts.hindi !== false) scripts.splice(scripts.indexOf("js/ui/dom.js"), 0, "js/i18n/hi.js");
  if (opts.before) opts.before(w);
  for (const src of scripts) w.eval(fs.readFileSync(path.join(GAME, src), "utf8") + "\n//# sourceURL=" + src);
  w.K.headless = true;
  w.K.seed(opts.seed || 1);
  if (opts.rt != null) w.K.RT.force = opts.rt;
  return { w, d: w.document, K: w.K, U: w.K.UI, errors, close: () => { try { w.close(); } catch (e) { /* ignore */ } } };
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".json": "application/json", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".woff2": "font/woff2", ".ttf": "font/ttf" };
// Serve a folder, or a map of published path -> file on disk (a split part). Returns { url, close, misses }.
function serve(root, opts = {}) {
  const misses = [];
  const map = opts.map || null;
  const srv = http.createServer((q, r) => {
    let rel = decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "");
    if (rel === "" || rel.endsWith("/")) rel += "index.html";
    let f;
    if (map) f = map[rel];
    else { f = path.join(root, rel); if (!f.startsWith(root)) f = null; }
    if (!f && opts.extra) f = opts.extra(rel);
    fs.readFile(f || "/nonexistent", (e, d) => {
      if (e) { misses.push(rel); r.writeHead(404); return r.end(); }
      const type = TYPES[path.extname(f)] || "application/octet-stream";
      // Range requests (video) are answered whole: enough for a smoke test.
      r.writeHead(200, { "content-type": type, "cache-control": "no-store" }); r.end(d);
    });
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok({ url: "http://127.0.0.1:" + srv.address().port + "/", misses, close: () => new Promise((c) => srv.close(c)) })));
}

function pw() {
  try { return require("playwright"); } catch (e) { /* elsewhere */ }
  for (const p of ["/usr/local/lib/node_modules_global/playwright", "/opt/npm-tools/node_modules/playwright"]) { try { return require(p); } catch (e) { /* next */ } }
  return null;
}

// The fonts the game asks Google for, served from a local folder of Fontsource packages when one is given
// (FONTS=dir or --fonts dir), so text measures and looks the same on every machine (see tests/layout.js --fonts).
function fontsDir() {
  const i = process.argv.indexOf("--fonts");
  return (i > 0 && process.argv[i + 1]) || process.env.FONTS || "";
}

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(k);
const SCRATCH = process.env.REGRESS_OUT || path.join(ROOT, "tests", "out");

module.exports = { ROOT, GAME, html, scriptsOf, engine, ui, serve, pw, fontsDir, arg, has, SCRATCH, TYPES };

// Known failures (tests/known_failures.json): split a test's problems into new ones and known ones.
// items: [{ key, text }] (text is matched against each entry's "match"). Returns { fresh, known, unused }.
function knownFailures(test) {
  try { return (JSON.parse(fs.readFileSync(path.join(ROOT, "tests", "known_failures.json"), "utf8")).known || []).filter((k) => k.test === test); } catch (e) { return []; }
}
function splitKnown(test, items) {
  const list = knownFailures(test), used = new Set(), fresh = [], known = [];
  for (const it of items) { const k = list.find((e) => String(it.text).includes(e.match)); if (k) { used.add(k); known.push(Object.assign({ bug: k.bug }, it)); } else fresh.push(it); }
  return { fresh, known, unused: list.filter((k) => !used.has(k)) };
}
module.exports.knownFailures = knownFailures;
module.exports.splitKnown = splitKnown;
