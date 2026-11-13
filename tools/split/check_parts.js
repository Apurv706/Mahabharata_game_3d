// A 3D fight on each BUILT part, served from its own file map (anything outside the map is a 404, as on the host).
//   node tools/split/check_parts.js <split dir> [<mirror dir>]
// With a mirror dir (see pubdiff.py) the parts are served from pN/ in it: exactly what will be published. Each part must
// open, run a 3D fight to its end with no console error and no file asked for that is not there, and show old and
// new Hindi strings in Hindi.
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const SPLIT = process.argv[2];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".mp4": "video/mp4" };
function serve(map) { const misses = []; const srv = http.createServer((q, r) => { const p = decodeURIComponent(q.url.split("?")[0]).replace(/^\//, "") || "index.html", f = map[p];
  if (!f || !fs.existsSync(f)) { misses.push(p); r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok({ url: "http://127.0.0.1:" + srv.address().port + "/", misses, srv }))); }
(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"] });
  let bad = 0;
  for (const [n, enc, age] of [[1, "e_spar", 18], [2, "e_day1", 44]]) {
    let map = JSON.parse(fs.readFileSync(path.join(SPLIT, "part" + n + ".files.json"), "utf8")); map["index.html"] = path.join(SPLIT, "part" + n, "index.html");
    if (process.argv[3]) { // (a folder that mirrors what is published, pub/pN: serve exactly what is in it, and nothing else)
      const root = path.join(process.argv[3], "p" + n), m2 = {}; const walk = (d) => { for (const f of fs.readdirSync(d)) { const q = path.join(d, f); if (fs.statSync(q).isDirectory()) walk(q); else m2[path.relative(root, q).split(path.sep).join("/")] = q; } }; walk(root); map = m2; }
    const s = await serve(map), page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const logs = []; page.on("console", (m) => { if (m.type() === "error" && !/TUNNEL/.test(m.text())) logs.push(m.text().slice(0, 300)); }); page.on("pageerror", (e) => logs.push("PAGEERROR " + String(e.stack || e).slice(0, 500)));
    await page.goto(s.url + "index.html?3d=1", { waitUntil: "load" }); await page.waitForTimeout(1500);
    const title = await page.evaluate(() => document.title + " | " + (document.querySelector(".leaf") || {}).innerText.slice(0, 160).replace(/\n+/g, " / "));
    await page.screenshot({ path: path.join(SPLIT, "p" + n + "_title.png") });
    await page.evaluate(([enc, age]) => { const K = window.K, U = K.UI; K.seed(5); const S = (K.S = K.newLife()); Object.assign(S, { name: "Ira", pronoun: "she", origin: "panchala", temperament: "bold", heirloom: "bow", path: "mace", age, act: age >= 44 ? 6 : 2, side: age >= 44 ? "pandava" : null });
      for (const k in S.attrs) S.attrs[k] = 4; for (const k in S.skills) S.skills[k] = 3; if (S.act >= 6) S.flags.push("role_front"); U.battleBot = true; window.__out = null; U.startBattle(enc, (o) => { window.__out = o; }); }, [enc, age]);
    await page.waitForTimeout(2500); const in3d = await page.evaluate(() => document.body.classList.contains("in3d"));
    await page.screenshot({ path: path.join(SPLIT, "p" + n + "_open.png") });
    let out = null; for (let i = 0; i < 420 && !out; i++) { await page.waitForTimeout(1000); out = await page.evaluate(() => window.__out && (window.__out.over || JSON.stringify(window.__out).slice(0, 80))); if (i === 12) await page.screenshot({ path: path.join(SPLIT, "p" + n + "_fight.png") }); }
    const lang = await page.evaluate(async () => { const K = window.K, U = K.UI; const ok = await U.loadLang("hi"); const was = K.lang; K.lang = "hi"; const r = "Hindi loaded: " + ok + "; 2D string: " + K.tr("Menu") + "; 3D strings: " + K.tr("From behind") + " / " + K.tr("Through your eyes") + "; newest: " + K.tr("The banner is down") + " / " + K.tr("Put your shoulder to the wheel"); K.lang = was; return r; }).catch((e) => "ERR " + e.message);
    const fail = !in3d || !out || logs.length || s.misses.length || /ERR|From behind|The banner is down|Put your shoulder/.test(lang); bad += fail ? 1 : 0;
    console.log((fail ? "FAIL" : "ok  ") + " part " + n + ": " + title + "\n     3D on: " + in3d + "; " + enc + " ended: " + out + "; console errors: " + logs.length + "; files asked for and not in the part: " + s.misses.length + "; " + lang);
    if (logs.length) console.log("     " + [...new Set(logs)].slice(0, 6).join("\n     ")); if (s.misses.length) console.log("     missing: " + [...new Set(s.misses)].slice(0, 12).join(", "));
    await page.close(); s.srv.close();
  }
  await browser.close(); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
