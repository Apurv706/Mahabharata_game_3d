/* Lists every string in tests/strings.json that has no translation yet, as JSON lines {id, en, ctx},
   for the translator. Usage: node tools/missing-i18n.js hi > missing.jsonl */
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
for (const s of strings) if (byId[s.id] == null && manual[s.en] == null) console.log(JSON.stringify(s));
