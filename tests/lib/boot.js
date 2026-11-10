// Loads the game's rules, story and fight simulation into a bare Node context (no page, no 3D), for the rule and
// balance tests. const K = require("./lib/boot.js")({ seed });
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..", "..");
module.exports = function boot(opt) {
  opt = opt || {};
  const store = {};
  const win = { localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } }, console, performance: { now: () => Date.now() },
    navigator: { userAgent: "node" }, setTimeout, clearTimeout, btoa: (s) => Buffer.from(s, "binary").toString("base64"), atob: (s) => Buffer.from(s, "base64").toString("binary"), process: { env: {} } };
  win.window = win;
  const ctx = vm.createContext(win);
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const files = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map((m) => m[1]).filter((f) => /^js\/(engine|world|content|rules)\//.test(f) || f === "js/ui/battle/sim.js");
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  const K = win.K;
  K.headless = true;
  K.UI = K.UI || {}; K.UI.games = new Proxy({}, { get: () => () => {}, has: () => true });
  if (opt.seed != null) K.seed(opt.seed);
  return K;
};
