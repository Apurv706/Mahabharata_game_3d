/* The regression suite's one runner. Two tiers:
     quick  the engine checks, content integrity, golden lives, balance bands on a small sample and the engine bug
            checks, with one light browser check (facefit); about 2 minutes, on every push.
     full   everything: the quick tier at full size, every existing check (playthroughs, layout and battle fit in the
            browser, strings, balance reports...), the bug checks in the browser, visual baselines, the smoke test of the
            built play pages and old saves; under 40 minutes, nightly.
   Each check runs in its own process; its output goes to <out>/logs/<name>.txt. A browser check that fails is run once
   more on just its failing cases (when it can say which, else whole): passing then is FLAKY, not PASS. A failure that
   tests/known_failures.json lists is KNOWN (not a failure); the exit code is 1 only for FAIL.
   Usage: node tests/run.js [quick|full] [--only a,b] [--skip a,b] [--browser chromium|webkit|firefox|all] [--jobs N]
          [--browser-jobs N] [--out DIR] [--report FILE] [--list]
   --jobs: checks at a time (default: the CPUs, at most 3); --browser-jobs: of those, how many in a browser (default 1).
   Memory: a browser check never runs beside a heavy one (the jsdom playthroughs, the lives batches, content, bands),
   and only one heavy one runs at a time, so a small machine (2 cores, 8 GB) does not run out of memory.
   --browser picks the engines for the checks that run in several (layout, battlefit; the others are Chromium only).
   --only/--skip match a check's name or the part before '#' (playthrough matches playthrough#1..6). */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const os = require("os");

const ROOT = path.join(__dirname, "..");
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
const TIER = argv[0] && !argv[0].startsWith("--") ? argv[0] : "quick";
if (!["quick", "full"].includes(TIER)) { console.error("tier must be quick or full"); process.exit(2); }
const OUT = path.resolve(opt("--out", process.env.REGRESS_OUT || path.join(ROOT, "tests", "out")));
const REPORT = path.resolve(opt("--report", path.join(OUT, "report-" + TIER + ".json")));
const BROWSER = opt("--browser", "chromium");
const JOBS = Math.max(1, parseInt(opt("--jobs", String(Math.min(3, Math.max(1, os.cpus().length)))), 10));
const ONLY = opt("--only", "") ? opt("--only").split(",") : null, SKIP = opt("--skip", "") ? opt("--skip").split(",") : [];
const LOGS = path.join(OUT, "logs");
fs.mkdirSync(LOGS, { recursive: true });
const J = (name) => path.join(OUT, "json", name + ".json");
fs.mkdirSync(path.join(OUT, "json"), { recursive: true });
const MIN = 60 * 1000;
const BJOBS = Math.max(1, parseInt(opt("--browser-jobs", "1"), 10));

// ---------- Retrying a browser check's failing cases ----------
// Each returns the arguments for a run of just the failing cases, or null to run the whole check again.
const fromLines = (out, re) => [...new Set([...out.matchAll(re)].map((m) => m[1]))];
const retry = {
  battlefit: (out, args) => { const f = fromLines(out, /^✗ (\S+) · /gm); return f.length ? args.filter((a, i) => a !== "--fights" && args[i - 1] !== "--fights").concat(["--fights", f.join(",")]) : null; },
  layout: (out, args) => { const d = fromLines(out, /^✗ \S+ · ([^·\n]+?) (?:upright|on its side|landscape|portrait)\b/gm); return d.length === 1 ? args.concat(["--device", d[0]]) : null; },
  blowfit: (out) => { const f = [...out.matchAll(/^✗ .*? (\w+) \((\w+)\):/gm)].map((m) => m[1] + ":" + m[2]); return f.length ? { env: { FIGHT: [...new Set(f)].join(",") } } : null; },
  json: (name, args) => { try { const j = JSON.parse(fs.readFileSync(J(name), "utf8")); const ids = j.browserFailed || j.failed || []; return ids.length ? args.filter((a, i) => a !== "--case" && args[i - 1] !== "--case").concat(["--case", ids.join(",")]) : null; } catch (e) { return null; } }
};
// The failures a check reports, as text matched against tests/known_failures.json (checks that do not sort their own).
const items = {
  strings: (out) => fromLines(out, /^\s+\d+\s{2}(.+)$/gm).map((x) => "untranslated: «" + x + "»"),
  command: (out) => { const m = out.match(/Never reached: (.+)/); return m ? m[1].split(", ").map((x) => "Never reached: " + x) : []; },
  blowfit: (out) => fromLines(out, /^✗ (.+?):/gm),
  battlefit: (out) => fromLines(out, /^✗ (.+)$/gm),
  layout: (out) => fromLines(out, /^✗ (.+)$/gm),
  warfit: (out) => fromLines(out, /^✗ (.+)$/gm),
  rtfit: (out) => fromLines(out, /^✗ (.+)$/gm),
  playthrough: (out) => fromLines(out, /^(CRASH at .+|STUCK at .+|Ending spread: .+too narrow.+)$/gm),
  // tests/lives.js: "✗ <problem> (n kinds)", then "    n× <what>" under it: each as "<problem>: <what>"
  lives: (out) => { const its = []; let cur = null; for (const line of out.split("\n")) { const h = line.match(/^✗ (.+?) \(\d+ kinds?\)$/); if (h) { cur = h[1]; continue; } const w = line.match(/^\s+\d+× (.+)$/); if (w && cur) its.push(cur + ": " + w[1]); else if (!/^\s/.test(line)) cur = null; } return its; }
};

// ---------- The checks ----------
// name, tiers: { quick: args, full: args } (null: not in that tier), browser: runs in a browser, timeout (minutes),
// report: a report that prints numbers and always passes.
const browsers = BROWSER === "all" ? "chromium,webkit,firefox" : BROWSER;
const C = [];
const add = (name, quick, full, o = {}) => C.push(Object.assign({ name, quick, full }, o));
add("rules", ["tests/rules.js"], ["tests/rules.js"]);
add("lives", ["tests/lives.js", "200", "1"], ["tests/lives.js", "600", "1"], { heavy: "full", items: items.lives });
add("lives-turns", ["tests/lives.js", "300", "2", "--turns"], ["tests/lives.js", "1500", "2", "--turns"], { heavy: "full" });
add("crossing", ["tests/crossing.js", "200", "1"], ["tests/crossing.js", "400", "1"]);
add("content", ["tests/content.js", "--lives", "300", "--ui", "2", "--json", J("content")], ["tests/content.js", "--lives", "2000", "--ui", "24", "--json", J("content")], { timeout: 25, heavy: "full" });
add("golden", ["tests/golden.js", "--json", J("golden")], ["tests/golden.js", "--twice", "--json", J("golden")]);
add("bands", ["tests/bands.js", "--tier", "quick", "--json", J("bands")], ["tests/bands.js", "--tier", "full", "--json", J("bands")], { timeout: 45, heavy: "full" });
add("bugs", ["tests/bugs.js", "--engine-only", "--json", J("bugs")], ["tests/bugs.js", "--json", J("bugs")], { browser: "full", retryJson: "bugs", timeout: 20 });
add("weapons", ["tests/weapons.js"], ["tests/weapons.js"]);
add("traits", ["tests/traits.js", "--json", J("traits")], ["tests/traits.js", "--json", J("traits")]); // Build D: the fight traits (rows 48-50)
add("facefit", ["tests/facefit.js"], ["tests/facefit.js"], { browser: true });
add("saves", ["tests/saves.js", "--json", J("saves")], ["tests/saves.js", "--browser", "--json", J("saves")], { browser: "full", retryJson: "saves", timeout: 15 });
// The jsdom checks keep about 25 MB per finished life (heavy: one of them at a time, so two never exhaust the memory).
add("command", null, ["--max-old-space-size=4096", "tests/command.js", "100"], { timeout: 25, items: items.command, heavy: true });
for (let k = 0; k < 10; k++) add("playthrough#" + (k + 1), null, ["--max-old-space-size=3072", "tests/playthrough.js", "30", "--from", String(1 + 30 * k)], { timeout: 20, items: items.playthrough, heavy: true });
for (let k = 0; k < 5; k++) add("playthrough-story#" + (k + 1), null, ["--max-old-space-size=3072", "tests/playthrough.js", "30", "--story", "--from", String(1 + 30 * k)], { timeout: 20, items: items.playthrough, heavy: true });
add("strings-hi", null, ["tests/strings.js", "check", "hi", "40"], { timeout: 20, items: items.strings, heavy: true });
add("balance", null, ["tests/balance.js", "120"], { timeout: 35, report: true, heavy: true });
add("race-balance", null, ["tests/race_balance.js", "2000"], { report: true });
add("dash-balance", ["tests/dash_balance.js", "300"], ["tests/dash_balance.js", "1000"]); // the wheel dash (fails outside its bands)
add("rtsim", null, ["tests/rtsim.js", "all", "10"], { report: true });
add("rtfit", null, ["tests/rtfit.js"], { browser: true, items: items.rtfit });
add("warfit", null, ["tests/warfit.js"], { browser: true, items: items.warfit });
add("blowfit", null, ["tests/blowfit.js"], { browser: true, retry: retry.blowfit, items: items.blowfit });
// layout.js in three parts (phones, tablets, desktops), which can run side by side; battlefit plays three fights at a time.
for (const kind of ["phone", "tablet", "desktop"]) add("layout#" + kind, null, ["tests/layout.js", "--browser", browsers, "--only", kind], { browser: true, timeout: 30, retry: retry.layout, items: items.layout });
add("battlefit", null, ["tests/battlefit.js", "--browser", browsers, "--jobs", "3", "--out", path.join(OUT, "battlefit.json")], { browser: true, timeout: 40, retry: retry.battlefit, items: items.battlefit });
add("visual", null, ["tests/visual.js", "--json", J("visual")], { browser: true, retryJson: "visual", timeout: 20 });
add("smoke", null, ["tests/smoke.js", "--json", J("smoke")], { browser: true, retryJson: "smoke", timeout: 20 });
// The review of 4 November (tests/review_*.js): the owner's checklist as checks, and whole lives played through the built parts.
// The 3D layer (this repository's own): the rules of the 3D fights, every fight played by the bot against its recorded
// band, and the fights and tests in a real browser with software WebGL.
add("rules3d", ["tests/rules3d.js"], ["tests/rules3d.js"]);
add("tests3d", ["tests/tests3d_rules.js"], ["tests/tests3d_rules.js"]); // the steered race and the herd: their rules, with no page
add("fights3d", ["tests/fights.js", "3", "21", "--check", "--json", J("fights3d")], ["tests/fights.js", "28", "21", "--check", "--json", J("fights3d")], { timeout: 30, heavy: "full" });
add("smoke3d", ["tests/smoke3d.js", "--case", "fight,no3d", "--json", J("smoke3d")], ["tests/smoke3d.js", "--json", J("smoke3d")], { browser: true, retryJson: "smoke3d", timeout: 20 });
add("review-rules", ["tests/review_rules.js", "--json", J("review_rules")], ["tests/review_rules.js", "--json", J("review_rules")]);
add("review-story", ["tests/review_story.js", "--engine-only", "--lives", "150", "--json", J("review_story")], ["tests/review_story.js", "--case-timeout", "900", "--json", J("review_story")], { browser: "full", retryJson: "review_story", timeout: 30 });
add("review-fights", null, ["tests/review_fights.js", "--case-timeout", "900", "--json", J("review_fights")], { browser: true, retryJson: "review_fights", timeout: 45 });
add("review-screens", null, ["tests/review_screens.js", "--json", J("review_screens")], { browser: true, retryJson: "review_screens", timeout: 20 });
add("review-play", null, ["tests/review_play.js", "--lives", "1", "--seed", "2", "--steps", "900", "--partial", "--json", J("review_play")], { browser: true, timeout: 40 });
add("review-battle", null, ["tests/review_battle.js", "--case-timeout", "900", "--json", J("review_battle")], { browser: true, retryJson: "review_battle", timeout: 45 }); // Build B: battles played like a person, the orders, the low-life warning, foes' shields

// Rough lengths on a 2-core machine (seconds): the full tier starts the longest first.
const EST = {"battlefit": 800, "layout#phone": 520, "layout#tablet": 260, "layout#desktop": 260, "balance": 400, "command": 300, "strings-hi": 250, "visual": 230, "bands": 220, "lives": 190, "smoke": 160, "warfit": 160, "blowfit": 180, "content": 150, "bugs": 110, "saves": 110, "rtfit": 60, "lives-turns": 45, "rtsim": 40, "race-balance": 28, "dash-balance": 12, "golden": 20};
Object.assign(EST, { "review-fights": 900, "review-play": 1200, "review-battle": 1500, "review-story": 600, "review-screens": 300, "review-rules": 15 });
for (const c of C) c.est = EST[c.name] || (/^playthrough/.test(c.name) ? 90 : 10);
const known = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "known_failures.json"), "utf8")).known || []; } catch (e) { return []; } })();
const base = (n) => n.split("#")[0];
const pick = (c) => c[TIER] && (!ONLY || ONLY.some((o) => o === c.name || o === base(c.name))) && !SKIP.some((o) => o === c.name || o === base(c.name));
const list = C.filter(pick).sort((a, b) => (TIER === "full" ? b.est - a.est : 0));
if (argv.includes("--list")) { for (const c of C) console.log((c.quick ? "Q" : " ") + (c.full ? "F" : " ") + (c.browser ? " B " : "   ") + c.name.padEnd(22) + "node " + (c[TIER] || c.full || c.quick).join(" ")); process.exit(0); }
let pwOk = true; try { require.resolve("playwright"); } catch (e) { pwOk = ["/usr/local/lib/node_modules_global/playwright", "/opt/npm-tools/node_modules/playwright"].some((p) => fs.existsSync(p)); }

const live = new Set();
const killGroup = (ch) => { try { process.kill(-ch.pid, "SIGKILL"); } catch (e) { try { ch.kill("SIGKILL"); } catch (e2) { /* gone */ } } };
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { for (const ch of live) killGroup(ch); process.exit(130); });
function run(c, args, env) {
  return new Promise((ok) => {
    const t = Date.now();
    const node = args.filter((a) => a.startsWith("--max-old-space")), rest = args.filter((a) => !a.startsWith("--max-old-space"));
    // Each check in its own process group, so stopping the runner (or a timeout) stops everything the check started.
    const ch = cp.spawn(process.execPath, node.concat(rest), { cwd: ROOT, detached: true, env: Object.assign({}, process.env, { REGRESS_OUT: OUT }, env || {}) });
    live.add(ch);
    let out = "";
    ch.stdout.on("data", (d) => { out += d; }); ch.stderr.on("data", (d) => { out += d; });
    let timedOut = false;
    const to = setTimeout(() => { timedOut = true; out += "\n[run.js] timed out after " + (c.timeout || 15) + " min\n"; killGroup(ch); }, (c.timeout || 15) * MIN);
    ch.on("close", (code, sig) => { clearTimeout(to); live.delete(ch); if (sig && !timedOut) out += "\n[run.js] killed by " + sig + " (out of memory?)\n"; ok({ code: sig ? 124 : code, out, ms: Date.now() - t }); });
  });
}
const tail = (s, n) => s.trim().split("\n").slice(-n).join("\n");
async function one(c) {
  const args = c[TIER], wantsBrowser = c.browser === true || c.browser === TIER;
  if (wantsBrowser && !pwOk) return { name: c.name, status: "SKIP", seconds: 0, note: "Playwright is not installed" };
  let r = await run(c, args);
  fs.writeFileSync(path.join(LOGS, c.name.replace(/#/g, "-") + ".txt"), "$ node " + args.join(" ") + "\n\n" + r.out);
  const res = { name: c.name, cmd: "node " + args.join(" "), seconds: Math.round(r.ms / 100) / 10, status: r.code === 0 ? "PASS" : "FAIL", note: "" };
  const knownHere = (r.out.match(/^KNOWN /gm) || []).length;
  if (knownHere) res.note = knownHere + " known failure(s)";
  if (c.report && r.code === 0) res.note = "report";
  if (r.code !== 0) {
    // A browser check gets one more run, of its failing cases where it can say which.
    if (wantsBrowser) {
      let again = c.retryJson ? retry.json(c.retryJson, args) : c.retry ? c.retry(r.out, args) : null;
      let env = null;
      if (again && !Array.isArray(again)) { env = again.env; again = args; }
      const a2 = again || args;
      const r2 = await run(c, a2, env);
      fs.writeFileSync(path.join(LOGS, c.name.replace(/#/g, "-") + ".retry.txt"), "$ node " + a2.join(" ") + (env ? " (" + JSON.stringify(env) + ")" : "") + "\n\n" + r2.out);
      res.retry = { cmd: "node " + a2.join(" ") + (env ? " " + JSON.stringify(env) : ""), seconds: Math.round(r2.ms / 100) / 10, passed: r2.code === 0 };
      res.seconds = Math.round((res.seconds + res.retry.seconds) * 10) / 10;
      if (r2.code === 0) {
        // Name what failed the first time, so a flaky case can be followed from the summary alone (the logs are in the run's artifacts).
        const first = c.items ? c.items(r.out) : [];
        res.status = "FLAKY"; res.note = "passed on the re-run of " + (again ? "its failing cases" : "the whole check") + (first.length ? "; first run: " + first.slice(0, 3).join("; ").slice(0, 160) : "");
        if (first.length) res.flaked = first;
        res.tail = tail(r.out, 12); // the first run's own words, printed under the line as a failure's are
        return res;
      }
      r = r2;
    }
    // Known failures: every failure the check names is listed for it.
    const its = c.items ? c.items(r.out) : [];
    const mine = known.filter((k) => k.test === base(c.name));
    if (its.length && mine.length && its.every((t) => mine.some((k) => t.includes(k.match)))) { res.status = "KNOWN"; res.note = its.length + " known: " + its.join("; ").slice(0, 120); }
    else { res.tail = tail(r.out, 12); if (its.length) res.note = its.slice(0, 3).join("; ").slice(0, 140); const m = r.out.match(/\[run\.js\] (timed out after \d+ min|killed by \w+[^\n]*)/); if (m) res.note = m[1]; }
  }
  return res;
}

(async () => {
  const t0 = Date.now();
  console.log("Regression suite, " + TIER + " tier: " + list.length + " checks, " + JOBS + " at a time (at most " + BJOBS + " in a browser); logs in " + (path.relative(process.cwd(), LOGS) || LOGS));
  const results = new Array(list.length);
  // The browser checks run one at a time (they measure layout and timing, and share the machine); the others fill the slots.
  let browserBusy = 0, heavyBusy = 0, next = 0;
  const queue = list.map((c, i) => ({ c: Object.assign({}, c, { heavy: c.heavy === true || c.heavy === TIER }), i, browser: c.browser === true || c.browser === TIER }));
  const takeNext = () => {
    for (let k = 0; k < queue.length; k++) { const q = queue[k]; if (q.done || q.taken) continue; if (q.browser && (browserBusy >= BJOBS || heavyBusy)) continue; if (q.c.heavy && (heavyBusy || browserBusy)) continue; q.taken = true; if (q.browser) browserBusy++; if (q.c.heavy) heavyBusy++; return q; }
    return null;
  };
  await new Promise((finish) => {
    let running = 0;
    const pump = () => {
      while (running < JOBS) {
        const q = takeNext(); if (!q) break;
        running++;
        one(q.c).then((r) => {
          results[q.i] = r; q.done = true; if (q.browser) browserBusy--; if (q.c.heavy) heavyBusy--; running--;
          console.log(r.status.padEnd(6) + " " + r.name.padEnd(22) + String(r.seconds).padStart(7) + " s" + (r.note ? "  " + r.note : ""));
          if ((r.status === "FAIL" || r.status === "FLAKY") && r.tail) console.log(r.tail.split("\n").map((l) => "         | " + l.slice(0, 200)).join("\n"));
          if (queue.every((x) => x.done)) finish(); else pump();
        });
      }
      if (!running && queue.every((x) => x.done)) finish();
    };
    pump();
  });
  next = 0;
  const secs = Math.round((Date.now() - t0) / 1000);
  const count = (s) => results.filter((r) => r.status === s).length;
  console.log("\n" + "Check".padEnd(24) + "Result  " + "Time".padStart(9) + "  Note");
  console.log("-".repeat(90));
  for (const r of results) console.log(r.name.padEnd(24) + r.status.padEnd(8) + (r.seconds.toFixed(1) + " s").padStart(9) + "  " + (r.note || "").slice(0, 100));
  console.log("-".repeat(90));
  console.log(TIER + " tier: " + count("PASS") + " pass, " + count("FAIL") + " fail, " + count("FLAKY") + " flaky, " + count("KNOWN") + " known, " + count("SKIP") + " skipped in " + Math.floor(secs / 60) + " min " + (secs % 60) + " s (wall clock; " + Math.round(results.reduce((a, r) => a + r.seconds, 0)) + " s of checks)");
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify({ tier: TIER, browser: BROWSER, jobs: JOBS, started: new Date(t0).toISOString(), seconds: secs, counts: { pass: count("PASS"), fail: count("FAIL"), flaky: count("FLAKY"), known: count("KNOWN"), skip: count("SKIP") }, results }, null, 1));
  console.log("Report: " + path.relative(process.cwd(), REPORT));
  process.exit(count("FAIL") ? 1 : 0);
})();
