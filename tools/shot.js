// Screenshots through headless Chrome with software WebGL.
//   node tools/shot.js <path?query> <out.png> [--w 1280] [--h 720] [--wait 1500] [--eval "js to run in the page"] [--then "js" --wait2 ms] [--dpr 1]
const path = require("path");
const serve = require("./serve.js");
let chromium; try { chromium = require("playwright").chromium; } catch (e) { chromium = require("/opt/npm-tools/node_modules/playwright").chromium; }
(async () => {
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf("--" + k); return i >= 0 ? a[i + 1] : d; };
  const { srv, url } = await serve(0);
  const browser = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio", "--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage({ viewport: { width: +arg("w", 1280), height: +arg("h", 720) }, deviceScaleFactor: +arg("dpr", 1), hasTouch: arg("touch") === "1", isMobile: arg("touch") === "1" });
  const logs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(m.type() + ": " + m.text().slice(0, 400)); });
  page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e.stack || e).slice(0, 600)));
  await page.goto(url + "/" + a[0], { waitUntil: "load" });
  await page.waitForTimeout(+arg("wait", 1500));
  if (arg("eval")) { const r = await page.evaluate(arg("eval")).catch((e) => "EVAL ERROR: " + e.message); if (r !== undefined) console.log("eval →", typeof r === "string" ? r : JSON.stringify(r)); await page.waitForTimeout(+arg("wait2", 1200)); }
  await page.screenshot({ path: path.resolve(a[1]) });
  if (arg("then")) { const r = await page.evaluate(arg("then")).catch((e) => "EVAL ERROR: " + e.message); if (r !== undefined) console.log("then →", typeof r === "string" ? r : JSON.stringify(r)); await page.waitForTimeout(+arg("wait3", 1200)); await page.screenshot({ path: path.resolve(a[1].replace(/\.png$/, "_2.png")) }); }
  if (logs.length) console.log(logs.slice(0, 12).join("\n"));
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
