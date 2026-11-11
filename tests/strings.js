/* Lists every string the player can see, so it can be translated, and checks a language's coverage.
   Sources: (1) a walk of the content tables, (2) string literals in the interface and engine code,
   (3) strings actually shown during automated playthroughs (catches text built at run time).
   Usage: node tests/strings.js collect          → writes tests/strings.json (stable ids, new ones appended)
          node tests/strings.js check hi [lives]  → plays lives in Hindi and lists untranslated strings */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const GAME = path.join(__dirname, "..");
const OUT = path.join(__dirname, "strings.json");
const html = fs.readFileSync(path.join(GAME, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
// Language dictionaries load on demand in the browser; the harness loads them all up front.
scripts.splice(scripts.indexOf("js/ui/dom.js"), 0, "js/i18n/hi.js");

function boot(seed, lang) {
  const vc = new VirtualConsole();
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ""), { runScripts: "outside-only", pretendToBeVisual: true, url: "https://localhost/", virtualConsole: vc });
  const w = dom.window;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
  let s = seed >>> 0;
  w.Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  if (lang) w.localStorage.setItem("kurukshetra.v2.prefs", JSON.stringify({ lang }));
  for (const src of scripts) w.eval(fs.readFileSync(path.join(GAME, src), "utf8"));
  w.K.headless = true;
  w.K.seed(seed);
  return w;
}

const looksLikeText = (s) => typeof s === "string" && /[A-Za-z]/.test(s) && !/^[a-z0-9_]+$/.test(s) && !/^#/.test(s) && !/[<>]|class=|=>/.test(s) && (/\s/.test(s) || /^[A-Z]/.test(s));

// (1) Content tables, in reading order: interface tables, world, then scenes with their fights.
function walkContent(K, add) {
  const SKIP = new Set(["id", "next", "skipTo", "art", "flag", "unflag", "flags", "set", "req", "tags", "when", "combat", "plate", "grad", "abilities", "skill", "stat", "person", "vowTag", "vowTake", "vowBreak", "boon", "curse", "injury", "fireCurse", "showIf", "die", "setBond", "item", "attr", "duty", "bond", "rep", "allies"]);
  const walk = (v, ctx, key) => {
    if (key && SKIP.has(key)) return;
    if (typeof v === "string") { if (looksLikeText(v)) add(v, ctx); return; }
    if (Array.isArray(v)) { if (key === "memory" && typeof v[0] === "string" && typeof v[1] === "string") { add(v[1], ctx); return; } v.forEach((x) => walk(x, ctx)); return; }
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, ctx, k);
  };
  for (const t of ["ACT_TITLES", "DUTIES", "FACTIONS", "SKILLS", "ATTRS", "STATUS_TEXT"]) walk(K[t], "ui:" + t);
  for (const [id, a] of Object.entries(K.ABILITIES)) { add(a.name, "ability"); if (a.desc) add(a.desc, "ability"); }
  for (const t of ["ORIGINS", "TEMPERAMENTS", "HEIRLOOMS", "TEACHERS", "PATHS", "COURTS", "VOWS", "BOONS", "CURSES", "INJURIES", "PEOPLE", "SECRETS", "ROOTS", "CUSTOMS", "MERITS"]) walk(K[t], "world:" + t);
  walk(K.BATTLE_EVENTS, "battle-events");
  walk(K.NOTICE_THINGS, "notice");
  walk(K.ENDINGS, "endings");
  walk(K.PRACTICE, "practice");
  walk(K.FRIEND_LINES, "friends");
  for (const [label] of K.karmaOf({ kept: true, broke: true, karna: true, teller: true, alive: false })) add(label, "rebirth");
  add(K.karmaOf({ alive: true })[0][0], "rebirth");
  for (const [term, def] of Object.entries(K.GLOSSARY)) { add(term, "glossary"); add(def, "glossary"); }
  const encSeen = new Set();
  for (const sc of Object.values(K.SCENES)) {
    walk(sc, "scene:" + sc.id);
    const encs = [];
    for (const c of Array.isArray(sc.choices) ? sc.choices : []) { if (c.combat) encs.push(c.combat); if (c.check) for (const b of [c.check.pass, c.check.fail]) if (b && b.combat) encs.push(b.combat); }
    for (const e of encs) if (K.ENCOUNTERS[e] && !encSeen.has(e)) { encSeen.add(e); walk(K.ENCOUNTERS[e], "fight:" + e); }
  }
  for (const e of Object.values(K.ENCOUNTERS)) if (!encSeen.has(e.id)) walk(e, "fight:" + e.id);
}

// (2) Literals in interface and engine code that are passed to the translator.
function walkCode(add) {
  const files = ["js/engine/core.js", "js/engine/flow.js", "js/engine/combat.js", "js/engine/abilities.js", "js/engine/friends.js", "js/ui/dom.js", "js/ui/ledger.js", "js/ui/scene.js", "js/ui/battle.js", "js/ui/screens.js", "js/ui/modals.js", "js/ui/games.js", "js/ui/lives.js", "js/ui/trials.js", "js/ui/play.js", "js/ui/boards.js", "js/ui/stage.js", "js/ui/puppet.js", "js/ui/map.js", "js/ui/practice.js", "js/ui/moments.js", "js/ui/army.js", "js/ui/breath.js", "js/ui/lachouse.js", "js/content/act7.js"];
  for (const f of files) {
    const src = fs.readFileSync(path.join(GAME, f), "utf8");
    // Literals inside K.tr(...) / U.tr(...) / K.text(...), and the screens' fixed tables.
    for (const m of src.matchAll(/(?:K\.tr|U\.tr|K\.text|U\.t)\(([^;]*?)\)/g)) for (const lit of m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) { const s = JSON.parse('"' + lit[1] + '"'); if (looksLikeText(s)) add(s, "code:" + path.basename(f)); }
    for (const m of src.matchAll(/pressButton\([^;]*?"((?:[^"\\]|\\.)*)"/g)) { const s = JSON.parse('"' + m[1] + '"'); if (looksLikeText(s)) add(s, "code:" + path.basename(f)); }
    for (const m of src.matchAll(/(?:key|verb|say|tell|subjectKey)\s*[:(]\s*[^"]*"((?:[^"\\]|\\.)*)"/g)) { const s = JSON.parse('"' + m[1] + '"'); if (looksLikeText(s)) add(s, "code:" + path.basename(f)); }
    // Game notes and summaries: G.note = "..." / ["...", ...], and done(..., ["...", ...]).
    for (const m of src.matchAll(/(?:note = |done\([^;]*?)\[?\s*(?:\w+ \? )?"((?:[^"\\]|\\.)*)"(?: : "((?:[^"\\]|\\.)*)")?/g)) for (const g of [m[1], m[2]]) if (g) { const s = JSON.parse('"' + g + '"'); if (looksLikeText(s)) add(s, "code:" + path.basename(f)); }
  }
}

// (3) Strings shown during play, including modals and every battle state the bot reaches.
// A finished life in the Book of Lives, so the title, creation and rebirth paths are exercised too.
const PAST = { at: "2026-10-01T10:00:00.000Z", me: { name: "Ira", pronoun: "she", origin: "panchala", teacher: "drona", path: "archer", spouse: "revat", friend: "charu", court: "panchala", child: "vasu" },
  title: "The teller", art: "end_teller", alive: true, age: 45, side: "pandava", telling: ["They sing of {name}, born in {origin}, {path!}, student of {teacher}.", "The teller"], kept: true, broke: true, karna: true, teller: true, conscience: 8 };
function playAndRecord(K, w, d, story, past) {
  const rnd = (arr) => arr[Math.floor(w.Math.random() * arr.length)];
  if (past) { w.localStorage.setItem("kurukshetra.v2.lives", JSON.stringify([PAST, Object.assign({}, PAST, { title: "Into the wheel", alive: false, art: "end_wheel" })])); K.UI.renderTitle(); K.UI.openLives(); K.UI.closeModal(); }
  d.getElementById("btn-new").click();
  rnd([...d.querySelectorAll("#origins .origin")]).click(); d.getElementById("land-ok").click();
  for (const sel of ["#pron .opt", "#temps .pick", "#heirs .pick", "#pasts .pick"]) { const opts = [...d.querySelectorAll(sel)]; if (opts.length) rnd(opts).click(); }
  d.getElementById("begin").click(); // first try without a name shows the "Choose ..." error once
  if (story) { const s = d.getElementById("story"); if (s) { s.checked = true; s.dispatchEvent(new w.Event("change")); } }
  if (d.getElementById("begin")) d.getElementById("begin").click();
  const U = K.UI;
  for (let step = 0; step < 4000; step++) {
    if (d.getElementById("again")) { U.openJournal(); U.openCharacter(); U.openLives(); U.closeModal(); return; }
    if (step % 150 === 7) { U.openCharacter(); U.openJournal(); U.openMenu(); U.openGlossary(); U.openLoad(); U.closeModal(); }
    const acts = [...d.querySelectorAll("#battle-actions .act:not([disabled])")];
    const choices = [...d.querySelectorAll("#choices .choice:not([disabled])")].filter((b) => !b.classList.contains("picked"));
    const cta = [...d.querySelectorAll("#leaf .cta")].filter((b) => !b.disabled);
    if (acts.length) {
      const spare = [...d.querySelectorAll(".battle-tools .cta")];
      if (spare.length && w.Math.random() < 0.3) { spare[0].click(); continue; }
      const special = acts.filter((a) => a.classList.contains("special"));
      (special.length && w.Math.random() < 0.6 ? rnd(special) : acts[0]).click();
    } else if (choices.length) rnd(choices).click();
    else if (cta.length) cta[0].click();
    else return;
  }
}

const mode = process.argv[2] || "collect";
if (mode === "collect") {
  const lives = parseInt(process.argv[3] || "400", 10);
  const order = [];
  const ctxOf = new Map();
  const add = (s, ctx) => { if (!looksLikeText(s)) return; if (!ctxOf.has(s)) { ctxOf.set(s, ctx); order.push(s); } };
  const w0 = boot(1);
  walkCode(add);
  walkContent(w0.K, add);
  for (let i = 1; i <= lives; i++) {
    const w = boot(i * 7919);
    w.K.seenText = new Set();
    w.K.seenText.add = function (s) { add(s, "play:" + (w.K.S && w.K.S.scene)); return this; };
    try { playAndRecord(w.K, w, w.document, i % 4 === 0, i % 5 === 0); } catch (e) { console.error("life " + i + ": " + e.message); }
    try { w.close(); } catch (e) {} // jsdom keeps every window alive otherwise
  }
  // Keep existing ids stable; append new strings.
  // A strings.json that exists but will not parse stops the collector: starting again from nothing would
  // give every string a new id, and every translation (keyed by id) would land on the wrong text.
  let prev = [];
  if (fs.existsSync(OUT)) {
    try { prev = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch (e) { console.error("tests/strings.json cannot be read (" + e.message + "). Fix it (or restore it from git) before collecting; nothing was written."); process.exit(2); }
  }
  const known = new Set(prev.map((x) => x.en));
  let id = prev.reduce((m, x) => Math.max(m, x.id), 0);
  const added = order.filter((s) => !known.has(s)).map((s) => ({ id: ++id, en: s, ctx: ctxOf.get(s) }));
  const all = prev.concat(added);
  fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
  console.log("strings: " + all.length + " (" + added.length + " new), words: " + all.reduce((n, x) => n + x.en.split(/\s+/).length, 0));
} else if (mode === "check") {
  const lang = process.argv[3] || "hi";
  const lives = parseInt(process.argv[4] || "200", 10);
  const missing = new Map();
  for (let i = 1; i <= lives; i++) {
    const w = boot(i * 104729, lang);
    w.K.missing = new Set();
    try { playAndRecord(w.K, w, w.document, i % 3 === 0, i % 5 === 0); } catch (e) { console.error("life " + i + ": " + (e.stack || e.message).split("\n").slice(0, 3).join(" | ")); }
    for (const s of w.K.missing) missing.set(s, (missing.get(s) || 0) + 1);
    try { w.close(); } catch (e) {}
  }
  console.log("Untranslated strings seen in " + lives + " lives (" + lang + "): " + missing.size);
  [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80).forEach(([s, n]) => console.log(String(n).padStart(4) + "  " + s.slice(0, 150)));
  process.exit(missing.size ? 1 : 0);
}
