/* Builds game/js/i18n/<lang>.js from the translator's files.
   i18n/<lang>/part*.json map string ids (tests/strings.json) to translations; i18n/<lang>/manual.json
   maps English text directly (for strings no playthrough has shown yet).
   Checks every translation's {tokens} against its English source and lists untranslated ids.
   Usage: node tools/build-i18n.js hi */
const fs = require("fs");
const path = require("path");
const lang = process.argv[2] || "hi";
const ROOT = path.join(__dirname, "..");
// A file that will not parse stops everything, naming the file: a silently skipped file would drop
// its translations from the game.
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.error("Cannot read " + path.relative(ROOT, f) + ": " + e.message); process.exit(2); } };
const strings = readJson(path.join(ROOT, "tests", "strings.json"));
const dir = path.join(ROOT, "i18n", lang);
const byId = {};
for (const f of fs.readdirSync(dir).filter((f) => /^part\d+\.json$/.test(f)).sort()) Object.assign(byId, readJson(path.join(dir, f)));
let manual = {};
// manual.json and any manual_*.json (one per workstream), keyed by the English text.
for (const f of fs.readdirSync(dir).filter((f) => /^manual(_[\w-]+)?\.json$/.test(f)).sort()) Object.assign(manual, readJson(path.join(dir, f)));

const LIFE = new Set(["name", "origin", "teacher", "path", "spouse", "friend", "child", "king", "they", "them", "their", "They", "theyre", "were"]);
const FORMS = ["", "ko", "ne", "ke", "ki", "par"];
const tokens = (s) => [...String(s).matchAll(/\{(\w+)!?(?::[^}]*)?\}/g)].map((m) => m[1]);
const problems = [];
const out = {};
const add = (en, tr, where) => {
  const src = new Set(tokens(en));
  for (const t of tokens(tr)) {
    if (t === "g" || LIFE.has(t) || src.has(t)) continue;
    if (FORMS.some((f) => f && t.endsWith(f) && src.has(t.slice(0, -f.length)))) continue;
    problems.push(where + ": token {" + t + "} not in English: " + en);
  }
  for (const t of src) if (!LIFE.has(t) && !tokens(tr).some((x) => x === t || FORMS.some((f) => x === t + f))) problems.push(where + ": drops {" + t + "}: " + en);
  out[en] = tr;
};
const SKIP = new Set(["avoids the attack", "recovers {n} health", "bleeds for {n}"]); // phrase fragments, never shown alone
const missing = [];
for (const s of strings) {
  if (byId[s.id] != null) add(s.en, byId[s.id], "#" + s.id);
  else if (manual[s.en] != null) add(s.en, manual[s.en], "manual");
  else if (!SKIP.has(s.en)) missing.push(s);
}
for (const [en, tr] of Object.entries(manual)) if (!(en in out)) add(en, tr, "manual");

const body = Object.entries(out).map(([k, v]) => "    " + JSON.stringify(k) + ": " + JSON.stringify(v)).join(",\n");
const js = "/* " + (lang === "hi" ? "Hindi" : lang) + " strings, keyed by the English source text. Built by tools/build-i18n.js from i18n/" + lang + "/; edit those files, not this one.\n" +
  "   Draft translation: needs review by a native speaker before release. */\n(function (K) {\n  \"use strict\";\n  K.addStrings(" + JSON.stringify(lang) + ", {\n" + body + "\n  });\n})(window.K = window.K || {});\n";
fs.writeFileSync(path.join(ROOT, "js", "i18n", lang + ".js"), js);
console.log(lang + ": " + Object.keys(out).length + " strings written, " + missing.length + " untranslated, " + problems.length + " token problems");
missing.slice(0, 40).forEach((s) => console.log("  missing #" + s.id + " " + s.en.slice(0, 100)));
problems.slice(0, 40).forEach((p) => console.log("  " + p.slice(0, 160)));
// Untranslated strings or token problems fail the build (the file is still written, to look at).
if (missing.length || problems.length) process.exitCode = 1;
