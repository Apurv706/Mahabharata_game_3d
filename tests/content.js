/* Content integrity: the story's wiring, its pictures and its words, checked without a browser.
   1. Targets: every next / skipTo / choice / test branch / fight outcome leads to a scene (or event slot) that
      exists, and every fight a choice starts exists. The static check (K.validate, as the game runs at boot) plus
      every target written as a function, evaluated on the lives as they are when they reach the scene.
   2. Reachable: every scene can be reached from the first scene (or end_death, or a cell): the union of the
      scenes random lives reach and a walk of every written target. tests/content_allow.json lists the scenes
      left out on purpose, with why; a listed scene that is reached now is reported, to be taken off the list.
   3. Pictures, clips and music: every painting a scene can show (its art for this life, and for the same life
      from every homeland, court, side and the flags its art function reads), every fight's and test's ground,
      every ending, and everything the interface asks for in jsdom lives (U.artUrl recorded, upright and wide) is
      a file in game/ that git tracks; every clip (ui/dom.js VIDEOS) and every music file too. Then the split
      build (tools/split/build.js, run as it is into a scratch folder, so its own rules decide) must carry each
      of them in the part that shows it: Acts I-IV in Part One, Acts V-VII in Part Two (the class of the raising-
      Vasu scene with no homeland painting in Part Two), each part within its 512 files.
   4. Words: no unfilled {token} in any text the lives show, in English and in Hindi (engine lives and the page
      itself in jsdom); the Hindi build (tools/build-i18n.js, run in a scratch copy) has 0 untranslated strings
      and 0 token problems, and the built game/js/i18n/hi.js is the one in the repository.
   Usage: node tests/content.js [--lives N=400] [--ui N=6] [--seed S=1] [--out DIR] [--json FILE]
          [--split-build tools/split/build.js] (another build script, e.g. an older one, to see what it misses)
   Exits 1 on any problem. */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const H = require("./lib/harness");
const { ROOT, GAME, arg, has } = H;

const LIVES = parseInt(arg("--lives", "400"), 10), UI_LIVES = parseInt(arg("--ui", "6"), 10), SEED = parseInt(arg("--seed", "1"), 10);
const OUT = path.resolve(arg("--out", path.join(H.SCRATCH, "content")));
const SPLIT_BUILD = path.resolve(ROOT, arg("--split-build", "tools/split/build.js"));
const FIX = path.join(__dirname, "fixtures", "split");
const ALLOW_FILE = path.join(__dirname, "content_allow.json");
fs.mkdirSync(OUT, { recursive: true });
const t0 = Date.now();

const problems = new Map(), notes = [];
const add = (k, v) => { const m = problems.get(k) || new Map(); m.set(v, (m.get(v) || 0) + 1); problems.set(k, m); };
const TOK = /\{(\w+)(!?)(?::[^}]*)?\}/;
const allow = fs.existsSync(ALLOW_FILE) ? JSON.parse(fs.readFileSync(ALLOW_FILE, "utf8")) : {};
const allowUnreach = allow.unreachable || {};

// ---------- The engine and content, with Hindi ----------
const K = H.engine({ hindi: true });
const pick = (a) => a[Math.floor(K.rng() * a.length)];
const tracked = new Set(cp.execSync("git ls-files", { cwd: ROOT, maxBuffer: 1 << 26 }).toString().trim().split("\n")); // (this repository is the game folder itself)

// ---------- The interface in jsdom: its own rules for which file a painting is shown from ----------
const J = H.ui({ seed: 1, width: 393, height: 852 });
const U = J.U;
const orient = (wide) => { J.w.innerWidth = wide ? 1280 : 393; J.w.innerHeight = wide ? 720 : 852; };
const rel = (url) => (url ? decodeURIComponent(String(url).replace(/^https?:\/\/[^/]+\//, "").replace(/^\//, "")) : null);
// The files behind a painting shown behind the page (U.setBackdrop -> U.bgUrl), upright and wide, and as a plate (U.artUrl).
function backdropFiles(key) { const out = new Set(); if (!key) return out; for (const wide of [false, true]) { orient(wide); out.add(rel(U.bgUrl(key))); } return out; }
const plainFile = (key) => (key ? rel(U.artUrl(key)) : null);
// The ground a test is played on when its choice names none (ui/scene.js STAGE_FOR, read from the file itself).
const STAGE_FOR = (() => { const m = fs.readFileSync(path.join(GAME, "js/ui/scene.js"), "utf8").match(/const STAGE_FOR = (\{[\s\S]*?\});/); return m ? Function("return " + m[1])() : {}; })();
const FIGHT_BG = U.FIGHT_BG || {};
const VIDEOS = (() => { const m = fs.readFileSync(path.join(GAME, "js/ui/dom.js"), "utf8").match(/const VIDEOS = new Set\((\[[\s\S]*?\])\)/); return m ? Function("return " + m[1])() : []; })();
const MUSIC = (() => { const s = fs.readFileSync(path.join(GAME, "js/ui/audio.js"), "utf8"); return [...s.matchAll(/"(music\/[\w-]+\.mp3)"/g)].map((m) => m[1]); })();

// need: file -> Set of acts it is shown in (0 = before any act: the title screen, both parts)
const need = new Map(), whyNeed = new Map();
const partOf = (act) => (act === 0 ? 0 : act <= 4 ? 1 : 2);
const want = (file, act, why) => { if (!file) return; const s = need.get(file) || new Set(); s.add(act); need.set(file, s); if (!whyNeed.has(file)) whyNeed.set(file, why); const k = file + "@" + partOf(act); if (!whyNeed.has(k)) whyNeed.set(k, why); };

// ---------- 1. Static targets (the game's own check) ----------
for (const p of J.K.validate()) add("content problem (K.validate)", p);

// ---------- 2-4. Engine lives ----------
const isTarget = (id) => typeof id === "string" && (K.SCENES[id] || K.SLOTS[id]);
const seenAll = new Set(), visitsAt = new Map(); // scene id -> number of visits checked in detail
const encAct = new Map(); // encounter id -> Set(acts)
const withState = (S, fn) => { const keep = K.S; K.S = S; try { return fn(); } finally { K.S = keep; } };
const clone = (o) => JSON.parse(JSON.stringify(o));
const txt = (s, where) => { if (s == null || s === "") return; let out; try { out = K.text(s); } catch (e) { add("text throws", where + ": " + e.message); return; } if (typeof out === "string" && TOK.test(out)) add("unfilled token (" + K.lang + ")", where + ": " + out.slice(0, 140)); };
const blocks = (b, where) => { for (const x of [].concat(K.val(b) || []).filter(Boolean)) { if (typeof x === "string" || Array.isArray(x)) txt(x, where); else if (x.line) txt(x.line, where); else if (x.memory) txt(x.memory, where); else if (x.aside) txt(x.aside, where); else if (x.curse) txt(x.curse, where); } };
// Everywhere a choice can lead: [label, value] (values may be functions of the life).
function choiceTargets(c) {
  const out = [["next", c.next], ["combat", c.combat]];
  for (const [b, br] of [["check.pass", c.check && c.check.pass], ["check.fail", c.check && c.check.fail], ["win", c.win], ["close", c.close], ["lose", c.lose], ["retryLose", c.retryLose]]) if (br) { out.push([b + ".next", br.next], [b + ".combat", br.combat]); }
  if (c.back) out.push(["back.scene", c.back.scene], ["back.then", c.back.then]);
  return out;
}
function checkTargets(sc, S) {
  withState(S, () => {
    const val = (v) => { try { return K.val(v, S); } catch (e) { add("target throws", sc.id + ": " + e.message); return undefined; } };
    for (const [k, v] of [["next", sc.next], ["skipTo", sc.skipTo]]) { const x = val(v); if (x != null && !isTarget(x)) add("missing target", sc.id + "." + k + " -> " + x); }
    let list; try { list = K.val(sc.choices, S) || []; } catch (e) { add("target throws", sc.id + ".choices: " + e.message); list = []; }
    for (const c of list) {
      for (const [k, v] of choiceTargets(c)) {
        if (v == null) continue;
        const x = val(v);
        if (x == null) continue;
        if (/combat$/.test(k)) { if (!K.ENCOUNTERS[x]) add("missing fight", sc.id + ":" + c.id + " " + k + " -> " + x); }
        else if (!isTarget(x)) add("missing target", sc.id + ":" + c.id + " " + k + " -> " + x);
      }
      if (c.peril) { const p = val(c.peril) || {}; for (const k of ["then", "waitThen"]) if (p[k] && !isTarget(p[k])) add("missing target", sc.id + ":" + c.id + " peril." + k + " -> " + p[k]); }
    }
  });
}
// The painting the story shows behind a scene (ui/scene.js artFor: "origin" is the homeland's own painting,
// the charioteers' Champa years Anga's).
const artFor = (sc, S) => withState(S, () => { const a = K.val(sc.art, S); if (a === "origin") return S.origin === "suta" && !S.flags.includes("moved_capital") ? "home_anga" : "home_" + S.origin; return a; });
// The same life with another homeland, court, side, or a flag its art reads turned the other way.
function variants(sc, S) {
  const out = [];
  const src = typeof sc.art === "function" ? String(sc.art) : "";
  const flags = new Set(["moved_capital", "role_council"]);
  for (const m of src.matchAll(/"([a-z][a-z0-9_]+)"/g)) flags.add(m[1]);
  for (const o of Object.keys(K.ORIGINS)) { const v = clone(S); v.flags = v.flags.filter((f) => !/^origin_/.test(f)).concat("origin_" + o); v.origin = o; out.push(v); }
  for (const f of flags) { const v = clone(S); v.flags = v.flags.includes(f) ? v.flags.filter((x) => x !== f) : v.flags.concat(f); out.push(v); }
  if (S.act >= 3) for (const c of Object.keys(K.COURTS || {}).concat("none")) { const v = clone(S); v.court = c; out.push(v); }
  if (S.act >= 5) for (const side of ["pandava", "kaurava", "neutral"]) { const v = clone(S); v.side = side; out.push(v); }
  return out.filter((v) => { try { return !sc.when || withState(v, () => K.test(sc.when, v)); } catch (e) { return false; } });
}
function sceneArt(sc, S, act) {
  const keys = new Set();
  try { const a = artFor(sc, S); if (typeof a === "string") keys.add(a); } catch (e) { add("art throws", sc.id + ": " + e.message); }
  const n = visitsAt.get(sc.id) || 0;
  if (typeof sc.art === "function" || sc.art === "origin") if (n < 3) for (const v of variants(sc, S)) { try { const a = artFor(sc, v); if (typeof a === "string") keys.add(a); } catch (e) { /* a variant the art cannot draw */ } }
  for (const k of keys) for (const f of backdropFiles(k)) want(f, act, "scene " + sc.id + " (" + k + ")");
  if (sc.clip && VIDEOS.includes(sc.clip)) want("video/" + sc.clip + ".mp4", act, "scene " + sc.id + " clip");
}
function trialArt(sc, c, act) {
  const stage = (c.trial && K.val(c.trial.stage)) || STAGE_FOR[c.game];
  if (!stage) return;
  for (const f of backdropFiles(stage)) want(f, act, "test " + sc.id + ":" + c.id);
  want(plainFile(U.stripOf ? U.stripOf(stage) : stage), act, "test " + sc.id + ":" + c.id);
}
// A fight's ground on the real-time screen (ui/realtime.js: stage or art, and the fight's tall painting), on the war-day
// screen (ui/warday.js: its fight painting or stage or art, and the tall one) and behind the old screen's page.
function fightArt(id, act) {
  const e = K.ENCOUNTERS[id]; if (!e) return;
  const bg = FIGHT_BG[id];
  let st = null, ar = null;
  try { st = K.val(e.stage); ar = K.val(e.art); } catch (x) { add("art throws", "fight " + id + ": " + x.message); }
  for (const k of [st || ar, bg || st || ar]) want(plainFile(k), act, "fight " + id);
  if (bg && (!U.fightTall || U.fightTall(bg))) want(plainFile(bg + "_tall"), act, "fight " + id + " (tall)"); // only where a tall one is painted (ui/battle.js U.fightTall, 6f23c4c)
  // (the 3D fight's own pictures: a painting shown at a turn of the fight (a beat's art3), and a face on its intro (face3))
  try { for (const bt of K.val(e.beats) || []) if (bt.art3) want(plainFile(bt.art3), act, "fight " + id + " (a turn's painting)"); if (K.val(e.face3)) want(plainFile(K.val(e.face3)), act, "fight " + id + " (intro face)"); } catch (x) { add("art throws", "fight " + id + ": " + x.message); }
  const e2 = encAct.get(id) || new Set(); e2.add(act); encAct.set(id, e2);
}

let lives = 0, ended = 0;
const transitions = new Set();
for (let i = 0; i < LIVES; i++) {
  K.seed(SEED * 100003 + i * 7);
  K.lang = i % 2 ? "hi" : "en";
  K.RT.force = false;
  const S = (K.S = K.newLife());
  if (K.momentQueue) K.momentQueue.length = 0;
  S.name = "Ira"; S.pronoun = ["she", "he", "they"][i % 3];
  S.origin = Object.keys(K.ORIGINS)[i % Object.keys(K.ORIGINS).length];
  S.temperament = pick(Object.keys(K.TEMPERAMENTS)); S.heirloom = pick(Object.keys(K.HEIRLOOMS));
  S.storyMode = i % 4 === 0;
  K.apply(K.ORIGINS[S.origin].fx); K.apply(K.TEMPERAMENTS[S.temperament].fx); K.apply(K.HEIRLOOMS[S.heirloom].fx);
  K.apply({ flag: ["origin_" + S.origin, "temper_" + S.temperament, "heir_" + S.heirloom] });
  lives++;
  try { K.go(K.FIRST_SCENE); } catch (e) { add("throws", "start: " + e.message); continue; }
  let prev = null;
  for (let steps = 0; steps < 800; steps++) {
    const sc = K.SCENES[K.S.scene];
    if (prev) transitions.add(prev + ">" + sc.id);
    prev = sc.id;
    const act = K.S.act;
    if (sc.ending) {
      // A death is told where it happened: one before the war (a peril, the house of lac) ends the life in Part One.
      const act = !K.S.alive && K.S.deathAct ? K.S.deathAct : K.S.act;
      try { const e = sc.ending(K.S); (e.telling || []).forEach((l) => txt(l, sc.id + " telling")); (e.fates || []).forEach((l) => txt(l, sc.id + " fates")); txt(e.title, sc.id + " title"); for (const f of backdropFiles(e.art)) want(f, act, "ending " + e.title + " (" + e.art + ")"); if (VIDEOS.includes(e.art)) want("video/" + e.art + ".mp4", act, "ending clip"); } catch (e) { add("throws", sc.id + ".ending: " + e.message); }
      ended++; break;
    }
    const n = visitsAt.get(sc.id) || 0;
    if (n < 6) checkTargets(sc, K.S);
    sceneArt(sc, K.S, act);
    visitsAt.set(sc.id, n + 1);
    try { blocks(sc.body, sc.id + ".body"); blocks(sc.witness, sc.id + ".witness"); txt(K.val(sc.title), sc.id + ".title"); txt(K.val(sc.caption), sc.id + ".caption"); txt(K.val(sc.place), sc.id + ".place"); } catch (e) { add("throws", sc.id + ".body: " + e.message); }
    const all = K.choiceList(sc);
    for (const x of all) { try { txt(K.val(x.c.t), sc.id + ":" + x.c.id + ".t"); if (x.c.hint) txt(K.val(x.c.hint), sc.id + ":" + x.c.id + ".hint"); if (x.c.game) trialArt(sc, x.c, act); } catch (e) { add("throws", sc.id + ":" + x.c.id + " text: " + e.message); } }
    const list = all.filter((x) => x.ok);
    if (!list.length) { add("no choice available", sc.id); break; }
    const { c } = pick(list);
    let res;
    try { res = c.game ? K.choose(sc, c, pick(["win", "close", "lose"])) : K.choose(sc, c); } catch (e) { add("throws", sc.id + ":" + c.id + ": " + e.message); break; }
    txt(res.text, sc.id + ":" + c.id + " result");
    try { blocks(res.after, sc.id + ":" + c.id + " after"); } catch (e) { /* not text blocks */ }
    let next = res.next;
    if (res.combat) {
      const enc = K.ENCOUNTERS[res.combat];
      if (!enc) { add("missing fight", sc.id + ":" + c.id + " -> " + res.combat); break; }
      fightArt(res.combat, K.S.act);
      try { txt(K.val(enc.title), res.combat + ".title"); txt(K.val(enc.intro), res.combat + ".intro"); } catch (e) { /* not text */ }
      const outs = ["win", "lose"].concat(enc.spare ? ["spare"] : [], enc.flee ? ["flee"] : []);
      let r;
      try { r = K.combatOutcome(res.combat, pick(outs), res.next); } catch (e) { add("throws", res.combat + " outcome: " + e.message); break; }
      txt(r.text, res.combat + " result");
      next = r.next;
    }
    if (!K.S.alive) next = "end_death";
    if (!isTarget(next)) { add("missing target", sc.id + ":" + c.id + " led to " + next); break; }
    try { K.go(next); } catch (e) { add("throws", sc.id + ":" + c.id + " -> " + next + ": " + e.message); break; }
  }
  for (const id of K.S.seen) seenAll.add(id);
}
K.lang = "en";
if (ended < lives) add("lives that did not end", (lives - ended) + " of " + lives);

// Fights and tests no life reached: checked on the acts of the scenes that start them.
const sceneOfEnc = new Map();
for (const sc of Object.values(K.SCENES)) {
  let list = [];
  try { list = Array.isArray(sc.choices) ? sc.choices : []; } catch (e) { /* later state */ }
  for (const c of list) {
    for (const [k, v] of choiceTargets(c)) if (/combat$/.test(k) && typeof v === "string") { if (!K.ENCOUNTERS[v]) add("missing fight", sc.id + ":" + c.id + " " + k + " -> " + v); else if (!sceneOfEnc.has(v)) sceneOfEnc.set(v, sc.act || 1); }
    if (c.game && !visitsAt.has(sc.id)) trialArt(sc, c, sc.act || 1);
  }
}
for (const id of Object.keys(K.ENCOUNTERS)) if (!encAct.has(id)) fightArt(id, sceneOfEnc.get(id) || (K.ENCOUNTERS[id].dream ? 1 : 6));
// Every ending's painting, in the last acts (Part Two) and, for a death before the war, where it happened.
for (const e of K.ENDINGS || []) for (const f of backdropFiles(e.art)) want(f, 6, "ending " + e.title);
// Scenes that no life reached: their art as written (when it is a plain key), on their own act.
for (const sc of Object.values(K.SCENES)) if (!visitsAt.has(sc.id) && typeof sc.art === "string" && sc.art !== "origin") for (const f of backdropFiles(sc.art)) want(f, sc.act || 1, "scene " + sc.id + " (unreached)");
// Clips and music: every one the game can play.
for (const v of VIDEOS) if (!fs.existsSync(path.join(GAME, "video", v + ".mp4"))) add("missing clip", "video/" + v + ".mp4 (ui/dom.js VIDEOS)");
for (const m of MUSIC) want(m, 0, "music (ui/audio.js)");

// ---------- Reachable ----------
const reach = new Set(), queue = [];
const push = (id) => { if (typeof id === "string" && !reach.has(id)) { reach.add(id); queue.push(id); } };
[K.FIRST_SCENE, "end_death", "x_captive", "end_life"].forEach(push);
const synth = (sc) => { const s = K.newLife(); Object.assign(s, { name: "T", origin: "panchala", age: sc.age || 20, act: sc.act || 1, path: "archer", side: "pandava", teacher: "drona", court: "hastinapura" }); return s; };
const edgeVals = (v, sc) => { if (typeof v === "string") return [v]; if (typeof v !== "function") return []; const out = new Set(); for (const S of [synth(sc)]) { try { const x = withState(S, () => K.val(v, S)); if (typeof x === "string") out.add(x); } catch (e) { /* needs another life */ } } return [...out]; };
while (queue.length) {
  const id = queue.shift();
  if (K.SLOTS[id]) { K.SLOTS[id].pool.forEach(push); push(K.SLOTS[id].then); continue; }
  (K.BEFORE[id] || []).forEach(push);
  const sc = K.SCENES[id]; if (!sc) continue;
  for (const v of [sc.next, sc.skipTo]) edgeVals(v, sc).forEach(push);
  let list = [];
  try { list = typeof sc.choices === "function" ? withState(synth(sc), () => sc.choices(K.S)) || [] : sc.choices || []; } catch (e) { list = []; }
  for (const c of list) for (const [k, v] of choiceTargets(c)) {
    if (/combat$/.test(k)) { for (const e of edgeVals(v, sc)) { const enc = K.ENCOUNTERS[e]; if (enc) for (const o of ["win", "lose", "flee", "spare"]) if (enc[o]) edgeVals(enc[o].next, sc).forEach(push); } }
    else edgeVals(v, sc).forEach(push);
  }
}
for (const t of transitions) push(t.split(">")[1]);
for (const id of seenAll) reach.add(id);
const unreached = Object.keys(K.SCENES).filter((id) => !reach.has(id));
for (const id of unreached) if (!allowUnreach[id]) add("unreachable scene (add it to tests/content_allow.json if that is deliberate)", id);
for (const id of Object.keys(allowUnreach)) if (reach.has(id)) notes.push("allow-listed as unreachable but reached now: " + id + " (take it off tests/content_allow.json)");
else if (!K.SCENES[id]) notes.push("allow-listed scene no longer exists: " + id);

// ---------- The interface in jsdom: everything it asks for, upright and wide, in English and Hindi ----------
const uiNeed = [];
const DOMTOK = /\{(?:name|they|them|their|They|theyre|were|origin|heirloom|teacher|path|spouse|friend|child|king|g:[^}]*|[a-z]+)!?\}/;
function uiLife(n) {
  const wide = n % 2 === 1, lang = n % 4 >= 2 ? "hi" : "en";
  const B = H.ui({ seed: 7919 * (n + 1), width: wide ? 1280 : 393, height: wide ? 720 : 852, lang, rt: false });
  const { w, d, K: K2, U: U2 } = B;
  let phase = "title";
  const o = U2.artUrl;
  U2.artUrl = function (k) { if (k) { const f = rel(o.call(this, k)); uiNeed.push([f, phase === "title" ? 0 : phase === "create" ? 1 : K2.S.act, (phase === "play" ? K2.S.scene : phase) + " · " + (wide ? "wide" : "upright") + " · " + lang]); } return o.apply(this, arguments); };
  U2.renderTitle();
  const rnd = (a) => a[Math.floor(w.Math.random() * a.length)];
  try {
    d.getElementById("btn-new").click(); phase = "create";
    rnd([...d.querySelectorAll("#origins .origin")]).click(); d.getElementById("land-ok").click();
    for (const sel of ["#pron .opt", "#temps .pick", "#heirs .pick"]) { const opts = [...d.querySelectorAll(sel)]; if (opts.length) rnd(opts).click(); }
    phase = "play";
    d.getElementById("begin").click();
    if (d.getElementById("begin")) d.getElementById("begin").click();
    for (let step = 0; step < 3000; step++) {
      if (d.getElementById("again")) { U2.openJournal(); U2.openCharacter(); U2.closeModal(); break; }
      if (step % 120 === 5) { U2.openCharacter(); U2.closeModal(); U2.openMap(); U2.closeModal(); }
      const leaf = d.getElementById("leaf");
      const m = leaf && leaf.textContent.match(DOMTOK);
      if (m) add("unfilled token on the page (" + lang + ")", K2.S.scene + ": " + m[0] + " in \"" + leaf.textContent.slice(Math.max(0, m.index - 50), m.index + 50).replace(/\s+/g, " ") + "\"");
      const acts = [...d.querySelectorAll("#battle-actions .act:not([disabled])")];
      const choices = [...d.querySelectorAll("#choices .choice:not([disabled])")].filter((b) => !b.classList.contains("picked"));
      const cta = [...d.querySelectorAll("#leaf .cta")].filter((b) => !b.disabled);
      if (acts.length) acts[0].click(); else if (choices.length) rnd(choices).click(); else if (cta.length) cta[0].click(); else break;
    }
  } catch (e) { add("page throws (jsdom)", (K2.S && K2.S.scene) + ": " + String(e.stack || e).split("\n").slice(0, 2).join(" | ")); }
  for (const e of B.errors.filter((x) => !/^warn: Content problems/.test(x))) add("page error (jsdom)", String(e).split("\n")[0].slice(0, 200));
  B.close();
}
for (let n = 0; n < UI_LIVES; n++) uiLife(n);
for (const [f, act, why] of uiNeed) want(f, act, "page: " + why);

// ---------- Files on disk, tracked by git ----------
for (const [f] of need) {
  if (!fs.existsSync(path.join(GAME, f))) add("missing file", f + " (" + whyNeed.get(f) + ")");
  else if (!tracked.has(f)) add("file not in git (the published game and CI will not have it)", f + " (" + whyNeed.get(f) + ")");
}

// ---------- The split build: each part carries what it shows ----------
const splitOut = path.join(OUT, "split");
fs.rmSync(splitOut, { recursive: true, force: true });
let maps = null;
try {
  const r = cp.spawnSync(process.execPath, [SPLIT_BUILD, splitOut, path.join(FIX, "use.json"), path.join(FIX, "act5_lives.json"), "", "", "--war=" + path.join(FIX, "war_lives.json")], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) add("split build failed", (r.stderr || r.stdout || "").split("\n").slice(0, 3).join(" | "));
  else {
    notes.push("split build: " + r.stdout.trim().split("\n").join("; "));
    maps = [1, 2].map((n) => JSON.parse(fs.readFileSync(path.join(splitOut, "part" + n + ".files.json"), "utf8")));
  }
} catch (e) { add("split build failed", e.message); }
if (maps) {
  maps.forEach((m, i) => {
    const n = Object.keys(m).length + 1; // + index.html
    if (n > 512) add("split part over 512 files", "part " + (i + 1) + ": " + n);
    for (const [pub, src] of Object.entries(m)) if (!fs.existsSync(src)) add("split part names a file that is not there", "part " + (i + 1) + ": " + pub);
  });
  for (const [f, acts] of need) {
    if (!fs.existsSync(path.join(GAME, f))) continue; // already reported
    // (The title and creation pages are in both parts, but the painted homeland map is only on the creation page, which
    // only Part One opens: tools/split/build.js gives it to Part One alone.)
    const parts = new Set(); for (const a of acts) { if (a === 0) { parts.add(1); if (!/^art\/map_bharat\./.test(f)) parts.add(2); } else parts.add(a <= 4 ? 1 : 2); }
    for (const p of parts) if (!maps[p - 1][f]) add("split part " + (p === 1 ? "One" : "Two") + " lacks a file it shows", f + " (acts " + [...acts].sort().join(",") + "; e.g. " + (whyNeed.get(f + "@" + p) || whyNeed.get(f + "@0") || whyNeed.get(f)) + ")");
  }
}

// ---------- The Hindi build, in a scratch copy ----------
{
  const tmp = path.join(OUT, "i18n_build");
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const d of ["tools", "tests", "i18n", "js/i18n"]) fs.mkdirSync(path.join(tmp, d), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "tools/build-i18n.js"), path.join(tmp, "tools/build-i18n.js"));
  fs.copyFileSync(path.join(ROOT, "tests/strings.json"), path.join(tmp, "tests/strings.json"));
  fs.cpSync(path.join(ROOT, "i18n"), path.join(tmp, "i18n"), { recursive: true });
  const r = cp.spawnSync(process.execPath, [path.join(tmp, "tools/build-i18n.js"), "hi"], { cwd: tmp, encoding: "utf8" });
  const line = (r.stdout || "").split("\n")[0];
  notes.push("Hindi build: " + line);
  const m = line.match(/(\d+) untranslated, (\d+) token problems/);
  if (!m) add("Hindi build did not run", (r.stderr || r.stdout || "").slice(0, 200));
  else {
    if (+m[1]) add("Hindi: untranslated strings (tools/build-i18n.js)", m[1] + ": " + (r.stdout.split("\n").filter((l) => /missing #/.test(l)).slice(0, 5).join(" | ")));
    if (+m[2]) add("Hindi: token problems (tools/build-i18n.js)", m[2] + ": " + (r.stdout.split("\n").filter((l) => /token|drops/.test(l)).slice(0, 5).join(" | ")));
    const built = fs.readFileSync(path.join(tmp, "js/i18n/hi.js"), "utf8"), shipped = fs.readFileSync(path.join(GAME, "js/i18n/hi.js"), "utf8");
    if (built !== shipped) add("Hindi: game/js/i18n/hi.js is not what i18n/hi/ builds (run node tools/build-i18n.js)", "differs");
  }
}

// ---------- Report ----------
const summary = { lives, ended, uiLives: UI_LIVES, scenes: Object.keys(K.SCENES).length, reached: Object.keys(K.SCENES).length - unreached.length, unreachedAllowed: unreached.filter((id) => allowUnreach[id]).length, files: need.size, seconds: Math.round((Date.now() - t0) / 100) / 10 };
// Known failures (tests/known_failures.json): reported, not counted.
const items = [];
for (const [k, m] of problems) for (const [v, n] of m) items.push({ key: k, text: k + ": " + v, v, n });
const split = H.splitKnown("content", items);
let bad = 0;
const byKey = new Map(); for (const it of split.fresh) { const a = byKey.get(it.key) || []; a.push(it); byKey.set(it.key, a); }
for (const [k, list] of byKey) { bad += list.reduce((a, b) => a + b.n, 0); console.log("✗ " + k + " (" + list.length + ")"); list.sort((a, b) => b.n - a.n).slice(0, 15).forEach((it) => console.log("    " + (it.n > 1 ? it.n + "× " : "") + it.v)); }
for (const it of split.known) console.log("KNOWN " + it.key + ": " + it.v + "\n    bug: " + it.bug);
for (const k of split.unused) notes.push("known failure no longer seen (fixed? take it off tests/known_failures.json): " + k.match);
notes.forEach((n) => console.log("  note: " + n));
console.log("content: " + summary.lives + " engine lives (" + summary.ended + " ended), " + UI_LIVES + " page lives; " + summary.reached + "/" + summary.scenes + " scenes reachable (" + summary.unreachedAllowed + " left out on purpose); " + summary.files + " files checked; " + (bad ? bad + " problems" : "no problems") + (split.known.length ? ", " + split.known.length + " known" : "") + " (" + summary.seconds + " s)");
const J2 = arg("--json", "");
if (J2) fs.writeFileSync(J2, JSON.stringify({ summary, problems: Object.fromEntries([...problems].map(([k, m]) => [k, Object.fromEntries(m)])), known: split.known.map((k) => k.text), notes }, null, 1));
J.close();
process.exit(bad ? 1 : 0);
