/* Writes the two parts of the game for a host that holds at most 512 files (see part.js).
   Usage: node tools/split/build.js <out dir> <use.json> <lives.json> [part1 url] [part2 url] [--war=<war lives.json>]
   use.json: { artKey: [acts it was shown in] }, recorded from playthroughs; lives.json: ready-made
   Act V lives [{ name, origin, path, code }]; war lives: ready-made lives on the eve of the war
   [{ name, origin, path, side, code }] from tools/split/gen_war.js (default tools/split/war_lives.json,
   if it is there). Writes <out>/part1/, <out>/part2/ (index.html and
   part.js) and <out>/partN.files.json (published path -> source path) for each. */
const fs = require("fs"), path = require("path"), cp = require("child_process");
const args = process.argv.slice(2), flag = (k) => (args.find((a) => a.startsWith("--" + k + "=")) || "").split("=").slice(1).join("=");
const [out, useFile, livesFile, url1, url2] = args.filter((a) => !a.startsWith("--"));
const warFile = flag("war") || path.join(__dirname, "war_lives.json");
const war = fs.existsSync(warFile) ? JSON.parse(fs.readFileSync(warFile, "utf8")) : [];
const ROOT = path.join(__dirname, "..", ".."), G = ROOT;
const use = JSON.parse(fs.readFileSync(useFile, "utf8")), lives = JSON.parse(fs.readFileSync(livesFile, "utf8"));
// (In this repository the game is the root: its own folders, and not the tests, tools and documents beside them.)
const GAME_FILE = /^(index\.html$|css\/|js\/(?!vendor\/.*\.txt$)|art\/|video\/|music\/|icons\/|brand\/)/; // (three.js's licence goes out at the head of k3d.js, with its code)
const all = cp.execSync("git ls-files", { cwd: ROOT, maxBuffer: 1 << 26 }).toString().trim().split("\n").filter((f) => GAME_FILE.test(f) && fs.existsSync(path.join(G, f)));
const isAsset = (f) => /^(art|video|music)\//.test(f);
const keyOf = (f) => path.basename(f).replace(/(_wide|_tall)?\.\w+$/, "");
const read = (f) => fs.readFileSync(path.join(G, f), "utf8");
const P1 = /^(act1|roots|act2|act3|act4)$/, P2 = /^(act5|act6a|act6b|command|act7|war_\w+)$/;
const content = fs.readdirSync(path.join(G, "js/content")).map((f) => [f.replace(/\.js$/, ""), read("js/content/" + f)]);
// Shown on the title screen, the character sheet or anywhere in a life: both parts.
const title = read("js/ui/screens.js");
// A moment (ui/moments.js) can play in any act: a vow taken in Act VII is shown over scene_vow, a divine weapon given
// in Act III over moment_astra, a friendship ended in the war over its friend's painting.
const moments = read("js/ui/moments.js");
const always = (k) => /^(p_|path_|vow_|temper_|heir_|teacher_|diya|home_|moment_)/.test(k) || title.includes('"' + k + '"') || moments.includes('"' + k + '"') || /^end_(death|cut_short)$/.test(k);
function parts(f) {
  if (!isAsset(f)) return [1, 2];
  if (f.startsWith("music/")) return [1, 2];
  const k = keyOf(f);
  // The painted homeland map is only on the creation page, and only Part One begins a new life.
  if (k === "map_bharat") return [1];
  if (always(k)) return [1, 2];
  const acts = use[k] || use[k + "_wide"] || use[k + "_tall"];
  const p = new Set();
  if (acts) { if (acts.some((a) => a <= 4)) p.add(1); if (acts.some((a) => a >= 5)) p.add(2); }
  const re = new RegExp("[\"'/]" + k + "[\"'.]");
  // Content used across acts (episodes, events, tests, vows, divine weapons): both, to be safe.
  for (const [n, t] of content) if (re.test(t)) { if (P1.test(n)) p.add(1); else if (P2.test(n)) p.add(2); else { p.add(1); p.add(2); } }
  if (!p.size) { p.add(1); p.add(2); }
  return [...p];
}
const LIMIT = 512;
for (const n of [1, 2]) {
  const dir = path.join(out, "part" + n); fs.mkdirSync(dir, { recursive: true });
  const cfg = { n, other: n === 1 ? url2 || "" : url1 || "", lives: n === 2 ? lives : [], war: n === 2 ? war : [], hi3d: true };
  const html = read("index.html").replace('<script src="js/main.js"></script>',
    "<script>window.K_PART = " + JSON.stringify(cfg) + ';</script>\n<script src="part.js"></script>\n<script src="js/main.js"></script>');
  // The 3D layer's scripts (the renderer, the figures and sets, the fights and tests) go out as one file, k3d.js, in the
  // order the page loads them: a dozen files fewer in each part, which is what keeps the clips under the host's limit.
  const k3d = [...html.matchAll(/<script src="(js\/(?:vendor|g3|ui\/battle|ui\/tests3d)\/[^"]+)"><\/script>\n?/g)].map((m) => m[1]);
  // The modelled cast (js/g3/models, tools/blender) is tens of megabytes: it goes out beside k3d.js in files of at most ~11 MB
  // (the host's limit is 16 MB a file), fetched after the page is up (async). A fight that starts before a model has
  // arrived shows the code-built figure instead (js/g3/model.js: G.modelFor finds nothing yet).
  const mods = [...html.matchAll(/<script async src="(js\/g3\/models\/[^"]+)"><\/script>\n?/g)].map((m) => m[1]), chunks = [[]]; let size = 0;
  for (const f of mods) { const n_ = fs.statSync(path.join(G, f)).size; if (size + n_ > 11e6 && chunks[chunks.length - 1].length) { chunks.push([]); size = 0; } chunks[chunks.length - 1].push(f); size += n_; }
  if (!mods.length) chunks.length = 0;
  let page = html.replace(/<script async src="js\/g3\/models\/[^"]+"><\/script>\n?/g, "").replace("<!-- models -->\n", chunks.map((c, i) => '<script async src="m' + (i + 1) + '.js"></script>\n').join("")), first = true;
  chunks.forEach((c, i) => fs.writeFileSync(path.join(dir, "m" + (i + 1) + ".js"), c.map((f) => read(f)).join("\n")));
  // The story's own files (js/content) go out as one, content.js, in the order the page loads them: two dozen files fewer,
  // which is the room the models' files and the last clips need under the host's limit.
  const cont = [...html.matchAll(/<script src="(js\/content\/[^"]+)"><\/script>\n?/g)].map((m) => m[1]);
  cont.forEach((f, i) => { page = page.replace(new RegExp('<script src="' + f.replace(/[.\/]/g, "\\$&") + '"><\\/script>\\n?'), i ? "" : '<script src="content.js"></script>\n'); });
  fs.writeFileSync(path.join(dir, "content.js"), cont.map((f) => "/* " + f + " */\n" + read(f)).join("\n;\n"));
  for (const f of k3d) { page = page.replace(new RegExp('<script src="' + f.replace(/[.\/]/g, "\\$&") + '"><\\/script>\\n?'), first ? '<script src="k3d.js"></script>\n' : ""); first = false; }
  const licence = fs.existsSync(path.join(G, "js/vendor/three.LICENSE.txt")) ? "/* three.js, whose code follows, is used under this licence:\n\n" + read("js/vendor/three.LICENSE.txt").replace(/\*\//g, "* /") + "\n*/\n" : "";
  fs.writeFileSync(path.join(dir, "k3d.js"), licence + k3d.map((f) => "/* " + f + " */\n" + read(f)).join("\n;\n"));
  // Two more files saved the same way: the fights' stylesheet goes into the page, and the fights' Hindi into the Hindi file.
  page = page.replace('<link rel="stylesheet" href="css/battle3d.css">', "<style>\n" + read("css/battle3d.css") + "\n</style>");
  fs.writeFileSync(path.join(dir, "hi.js"), read("js/i18n/hi.js") + "\n;\n" + read("js/i18n/hi3d.js"));
  fs.writeFileSync(path.join(dir, "index.html"), page.replace(/<title>[^<]*<\/title>/, "<title>Kurukshetra 3D Part " + (n === 1 ? "One" : "Two") + "</title>"));
  fs.copyFileSync(path.join(__dirname, "part.js"), path.join(dir, "part.js"));
  let files = all.filter((f) => f !== "index.html" && !k3d.includes(f) && !mods.includes(f) && !cont.includes(f) && f !== "css/battle3d.css" && f !== "js/i18n/hi3d.js" && parts(f).includes(n));
  // Clips are the first to go if a part is over the limit (the painting stays without one).
  const room = LIMIT - 4 - chunks.length;
  if (files.length > room) { const vids = files.filter((f) => f.startsWith("video/")); const drop = new Set(vids.slice(0, files.length - room)); files = files.filter((f) => !drop.has(f)); }
  const map = { "part.js": path.join(dir, "part.js"), "k3d.js": path.join(dir, "k3d.js") };
  chunks.forEach((c, i) => { map["m" + (i + 1) + ".js"] = path.join(dir, "m" + (i + 1) + ".js"); });
  map["content.js"] = path.join(dir, "content.js");
  for (const f of files) map[f] = f === "js/i18n/hi.js" ? path.join(dir, "hi.js") : path.join(G, f);
  fs.writeFileSync(path.join(out, "part" + n + ".files.json"), JSON.stringify(map, null, 1));
  const c = (re) => files.filter((f) => re.test(f)).length;
  console.log("part " + n + ": " + (files.length + 4 + chunks.length) + " files (art " + c(/^art\//) + ", video " + c(/^video\//) + ", music " + c(/^music\//) + ")");
}
