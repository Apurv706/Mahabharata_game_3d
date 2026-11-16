/* Play metrics for a review of the game as a thing to play (16 November). No page: lives through the engine, as
   tests/lives.js plays them, and what a player would meet on the way is counted.
     - how long a life is: pages, words read, tests played, fights fought, by act; and a rough clock
     - how the time divides between reading and playing, and the longest stretch of reading with nothing to do
     - how much choosing there is: pages with one way on, with two, with more; choices shut to you
     - how much of the story one life sees, and how alike two lives are
     - where lives end, and which endings random play reaches
     - which kinds of test a life meets, and how often
   A page is one scene shown. A fight's outcome is drawn at the rate the 3D game's own fighter wins that fight
   (tests/baselines/fights3d.json: a careful player), with the one second try a deadly fight gives, and takes that
   fight's recorded length. A test's outcome is drawn (win 55%, close 20%, lose 25%: a middling player; --good: 80, 12,
   8). Choices are taken at random among those open.
   The clock is an estimate and says how: 200 words a minute; a test 50 s; a fight its own simulated length plus 30 s
   for its opening, its plan and its end card.
   Usage: node tools/review/play_metrics.js [lives=400] [seed=1] [--json FILE] */
"use strict";
const fs = require("fs"), path = require("path");
const H = require(path.join(__dirname, "..", "..", "tests", "lib", "harness"));
const K = H.engine({});
K.RT.force = true;
const N = parseInt(process.argv[2] || "400", 10), SEED = parseInt(process.argv[3] || "1", 10);
const JSONF = (() => { const i = process.argv.indexOf("--json"); return i > 0 ? process.argv[i + 1] : null; })();
const WPM = 200, TEST_S = 50, FIGHT_EXTRA_S = 30;
const BASE = require(path.join(__dirname, "..", "..", "tests", "baselines", "fights3d.json")).fights, GOOD = process.argv.includes("--good");
const pick = (a) => a[Math.floor(K.rng() * a.length)];
const words = (s) => { if (s == null || s === "") return 0; let t; try { t = K.text(s); } catch (e) { t = String(s); } return String(t).replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length; };
const blocks = (b) => { let n = 0; for (const x of [].concat(K.val(b) || []).filter(Boolean)) { if (typeof x === "string") n += words(x); else if (Array.isArray(x)) n += x.reduce((a, y) => a + words(y), 0); else if (x.line) n += words(x.line); else if (x.memory) n += words(x.memory); else if (x.aside) n += words(x.aside); } return n; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const q = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r1 = (x) => Math.round(x * 10) / 10;

const lives = [];
for (let i = 0; i < N; i++) {
  K.seed(SEED * 100003 + i * 7);
  const S = (K.S = K.newLife());
  if (K.momentQueue) K.momentQueue.length = 0;
  S.name = "Ira"; S.pronoun = pick(["she", "he", "they"]);
  S.origin = pick(Object.keys(K.ORIGINS)); S.temperament = pick(Object.keys(K.TEMPERAMENTS)); S.heirloom = pick(Object.keys(K.HEIRLOOMS));
  S.storyMode = false;
  K.apply(K.ORIGINS[S.origin].fx); K.apply(K.TEMPERAMENTS[S.temperament].fx); K.apply(K.HEIRLOOMS[S.heirloom].fx);
  K.apply({ flag: ["origin_" + S.origin, "temper_" + S.temperament, "heir_" + S.heirloom] });
  const L = { i, origin: S.origin, steps: [], fights: [], tests: [], ending: null, died: null };
  K.go(K.FIRST_SCENE);
  for (let st = 0; st < 900; st++) {
    const sc = K.SCENES[K.S.scene];
    if (sc.ending) { const e = sc.ending(K.S); L.ending = e.title; L.endWords = (e.telling || []).reduce((a, l) => a + words(l), 0) + (e.fates || []).reduce((a, l) => a + words(l), 0); break; }
    const rows = K.choiceList(sc), open = rows.filter((x) => x.ok);
    if (!open.length) { L.stuck = sc.id; break; }
    const step = { id: sc.id, act: K.S.act, age: K.S.age, w: blocks(sc.body) + blocks(sc.witness) + words(sc.title), open: open.length, shut: rows.length - open.length, kind: "page", war: !!sc.war };
    step.w += open.reduce((a, x) => a + words(K.val(x.c.t)) + words(K.val(x.c.hint)), 0);
    const { c } = pick(open);
    let out = null;
    if (c.game) { const r = K.rng(); out = r < (GOOD ? 0.8 : 0.55) ? "win" : r < (GOOD ? 0.92 : 0.75) ? "close" : "lose"; step.kind = "test"; step.game = c.game; L.tests.push({ game: c.game, act: K.S.act, out, id: sc.id + ":" + c.id }); }
    const before = K.S.alive;
    const res = c.game ? K.choose(sc, c, out) : K.choose(sc, c);
    if (res.check) step.check = res.check.pass ? "pass" : "fail";
    step.w += words(res.text); try { step.w += blocks(res.after); } catch (e) { /* not text */ }
    let next = res.next;
    if (res.combat) {
      const enc = K.ENCOUNTERS[res.combat];
      const bl = BASE[res.combat] || { win: 90, secs: 41 }, pw = bl.win / 100;
      let o = K.rng() < pw ? "win" : "lose", tries = 1, t = bl.secs;
      if (o === "lose" && enc.lethal && !K.S.storyMode) { tries = 2; t += bl.secs; if (K.rng() < pw) o = "win"; }   // a deadly fight lost is offered once more
      L.fights.push({ id: res.combat, act: K.S.act, out: o, t, tries, kind: typeof enc.kind === "string" ? enc.kind : enc.kind ? "by path" : "defeat", lethal: !!enc.lethal, hard: !!enc.hard, war: !!sc.war }); step.ft = t;
      step.kind = step.kind === "test" ? "test+fight" : "fight";
      const r = K.combatOutcome(res.combat, o, res.next);
      step.w += words(r.text); next = r.next;
    }
    L.steps.push(step);
    if (!K.S.alive) { L.died = { at: sc.id, act: K.S.act, age: K.S.age, by: res.combat ? "fight " + res.combat : c.game ? "test " + c.game : res.check ? "a dice check failed out of your depth" : "a choice" }; next = "end_death"; }
    K.go(next);
  }
  const F = K.S;
  L.final = { act: F.act, age: F.age, path: F.path, side: F.side, court: F.court, teacher: F.teacher, attrs: Object.assign({}, F.attrs), skills: Object.assign({}, F.skills), vows: (F.vows || []).length, boons: (F.boons || []).length, curses: (F.curses || []).length, injuries: (F.injuries || []).length, astras: (F.astras || []).length, bonds: Object.keys(F.bonds || {}).length, karma: F.karma, record: F.record };
  lives.push(L);
}

// ---- what the lives say
const full = lives.filter((l) => l.ending && !l.died), dead = lives.filter((l) => l.died);
const secs = (l) => l.steps.reduce((a, s) => a + s.w / WPM * 60 + (s.kind.includes("test") ? TEST_S : 0) + (s.ft != null ? s.ft + FIGHT_EXTRA_S : 0), 0);
const playSecs = (l) => l.steps.reduce((a, s) => a + (s.kind.includes("test") ? TEST_S : 0) + (s.ft != null ? s.ft + FIGHT_EXTRA_S : 0), 0);
const out = {};
out.lives = N; out.reachedTheEndAlive = full.length; out.diedOnTheWay = dead.length;
const lifeRow = (set) => ({ n: set.length, pages: r1(mean(set.map((l) => l.steps.length))), words: Math.round(mean(set.map((l) => l.steps.reduce((a, s) => a + s.w, 0)))), tests: r1(mean(set.map((l) => l.tests.length))), fights: r1(mean(set.map((l) => l.fights.length))), minutes: Math.round(mean(set.map((l) => secs(l) / 60))), minutesP10: Math.round(q(set.map((l) => secs(l) / 60), 0.1)), minutesP90: Math.round(q(set.map((l) => secs(l) / 60), 0.9)), playShare: Math.round(mean(set.map((l) => playSecs(l) / Math.max(1, secs(l)))) * 100) });
out.wholeLife = lifeRow(full);
out.byAct = {};
for (let a = 1; a <= 7; a++) {
  const rows = lives.map((l) => l.steps.filter((s) => s.act === a)).filter((x) => x.length);
  if (!rows.length) continue;
  const sec = (x) => x.reduce((t, s) => t + s.w / WPM * 60 + (s.kind.includes("test") ? TEST_S : 0) + (s.ft != null ? s.ft + FIGHT_EXTRA_S : 0), 0);
  const play = (x) => x.reduce((t, s) => t + (s.kind.includes("test") ? TEST_S : 0) + (s.ft != null ? s.ft + FIGHT_EXTRA_S : 0), 0);
  out.byAct[a] = { lives: rows.length, pages: r1(mean(rows.map((x) => x.length))), words: Math.round(mean(rows.map((x) => x.reduce((t, s) => t + s.w, 0)))), tests: r1(mean(rows.map((x) => x.filter((s) => s.kind.includes("test")).length))), fights: r1(mean(rows.map((x) => x.filter((s) => s.ft != null).length))), minutes: r1(mean(rows.map((x) => sec(x) / 60))), playShare: Math.round(mean(rows.map((x) => play(x) / Math.max(1, sec(x)))) * 100), oneWayOn: Math.round(mean(rows.map((x) => x.filter((s) => s.open === 1).length / x.length)) * 100) };
}
// choosing
const allSteps = lives.flatMap((l) => l.steps);
const share = (f) => Math.round(allSteps.filter(f).length / allSteps.length * 100);
out.choosing = { pages: allSteps.length, oneWayOn: share((s) => s.open === 1), two: share((s) => s.open === 2), three: share((s) => s.open === 3), fourOrMore: share((s) => s.open >= 4), pagesWithAShutChoice: share((s) => s.shut > 0), diceChecks: r1(mean(lives.map((l) => l.steps.filter((s) => s.check).length))), diceChecksPassed: Math.round(allSteps.filter((s) => s.check === "pass").length / Math.max(1, allSteps.filter((s) => s.check).length) * 100) };
// reading stretches: words (and minutes) between two things to play
const stretches = [];
for (const l of lives) { let w = 0, pages = 0; for (const s of l.steps) { w += s.w; pages++; if (s.kind !== "page") { stretches.push({ w, pages, act: s.act }); w = 0; pages = 0; } } }
out.readingStretch = { meanMinutes: r1(mean(stretches.map((x) => x.w / WPM))), medianMinutes: r1(q(stretches.map((x) => x.w / WPM), 0.5)), p90Minutes: r1(q(stretches.map((x) => x.w / WPM), 0.9)), longestMinutes: r1(Math.max(...stretches.map((x) => x.w / WPM))), meanPages: r1(mean(stretches.map((x) => x.pages))), p90Pages: q(stretches.map((x) => x.pages), 0.9), byAct: {} };
for (let a = 1; a <= 7; a++) { const x = stretches.filter((s) => s.act === a); if (x.length) out.readingStretch.byAct[a] = { median: r1(q(x.map((s) => s.w / WPM), 0.5)), p90: r1(q(x.map((s) => s.w / WPM), 0.9)), pagesP90: q(x.map((s) => s.pages), 0.9) }; }
// how long before the first thing to play after the dream, and the first choice of more than one way
out.firstMinutes = { toFirstRealChoice: r1(mean(lives.map((l) => { let w = 0; for (const s of l.steps) { if (s.open > 1) break; w += s.w; } return w / WPM; }))), toFirstTestAfterTheDream: r1(mean(lives.map((l) => { let w = 0; for (const s of l.steps.slice(1)) { w += s.w; if (s.kind !== "page") break; } return w / WPM; }))) };
// what one life sees, and how alike two are
const total = Object.keys(K.SCENES).length;
const seen = lives.map((l) => new Set(l.steps.map((s) => s.id)));
const all = new Set(); seen.forEach((s) => s.forEach((x) => all.add(x)));
const jac = (a, b) => { let n = 0; a.forEach((x) => { if (b.has(x)) n++; }); return n / (a.size + b.size - n); };
const fi = lives.map((l, i) => i).filter((i) => lives[i].ending && !lives[i].died);
const pairs = (f) => { const v = []; for (let k = 0; k < 4000; k++) { const a = fi[Math.floor(Math.random() * fi.length)], b = fi[Math.floor(Math.random() * fi.length)]; if (a !== b && f(lives[a], lives[b])) v.push(jac(seen[a], seen[b])); } return v.length ? Math.round(mean(v) * 100) : null; };
out.variety = { scenes: total, seenByAnyLife: all.size, oneLifeSees: Math.round(mean(fi.map((i) => seen[i].size)) / total * 100), twoLivesShare: pairs(() => true), sameSide: pairs((a, b) => a.final.side === b.final.side), otherSide: pairs((a, b) => a.final.side !== b.final.side), samePath: pairs((a, b) => a.final.path === b.final.path), samePathAndSide: pairs((a, b) => a.final.path === b.final.path && a.final.side === b.final.side) };
// scenes every whole life passes (the spine), by act
const spine = [...all].filter((id) => fi.every((i) => seen[i].has(id)));
out.variety.onEveryLife = spine.length; out.variety.onEveryLifeShareOfALife = Math.round(spine.length / mean(fi.map((i) => seen[i].size)) * 100);
// endings and deaths
const cnt = (a) => { const m = {}; a.forEach((x) => { m[x] = (m[x] || 0) + 1; }); return Object.fromEntries(Object.entries(m).sort((x, y) => y[1] - x[1])); };
out.endings = cnt(full.map((l) => l.ending)); out.endingsReached = Object.keys(out.endings).length;
out.deaths = { share: Math.round(dead.length / N * 100), byAct: cnt(dead.map((l) => "act " + l.died.act)), by: Object.fromEntries(Object.entries(cnt(dead.map((l) => l.died.by))).slice(0, 14)) };
out.sides = cnt(full.map((l) => String(l.final.side))); out.paths = cnt(full.map((l) => String(l.final.path)));
// tests
const kinds = cnt(lives.flatMap((l) => l.tests.map((t) => t.game)));
out.tests = { perLife: r1(mean(full.map((l) => l.tests.length))), kindsPerLife: r1(mean(full.map((l) => new Set(l.tests.map((t) => t.game)).size))), byKindPerLife: Object.fromEntries(Object.entries(kinds).map(([k, n]) => [k, r1(n / N)])), byAct: {} };
for (let a = 1; a <= 7; a++) { const x = lives.map((l) => l.tests.filter((t) => t.act === a).length); out.tests.byAct[a] = r1(mean(x)); }
// fights
const F = lives.flatMap((l) => l.fights);
out.fights = { perLife: r1(mean(full.map((l) => l.fights.length))), distinct: new Set(F.map((f) => f.id)).size, won: Math.round(F.filter((f) => f.out === "win" || f.out === "spare").length / F.length * 100), meanSeconds: Math.round(mean(F.map((f) => f.t))), p10: Math.round(q(F.map((f) => f.t), 0.1)), p90: Math.round(q(F.map((f) => f.t), 0.9)), secondTries: Math.round(F.filter((f) => f.tries > 1).length / F.length * 100), byAct: {}, kinds: cnt(F.map((f) => f.kind)) };
for (let a = 1; a <= 7; a++) { const x = F.filter((f) => f.act === a); if (x.length) out.fights.byAct[a] = { perLife: r1(x.length / lives.filter((l) => l.steps.some((s) => s.act === a)).length), won: Math.round(x.filter((f) => f.out === "win" || f.out === "spare").length / x.length * 100), seconds: Math.round(mean(x.map((f) => f.t))) }; }
// what a life ends with
out.final = { attrs: {}, skills: {}, pathSkill: r1(mean(full.filter((l) => l.final.path && K.PATHS[l.final.path].skill).map((l) => l.final.skills[K.PATHS[l.final.path].skill] || 0))), otherSkills: r1(mean(full.filter((l) => l.final.path && K.PATHS[l.final.path].skill).map((l) => mean(Object.keys(K.SKILLS).filter((k) => k !== K.PATHS[l.final.path].skill).map((k) => l.final.skills[k] || 0))))), vows: r1(mean(full.map((l) => l.final.vows))), boons: r1(mean(full.map((l) => l.final.boons))), curses: r1(mean(full.map((l) => l.final.curses))), injuries: r1(mean(full.map((l) => l.final.injuries))), divineWeapons: r1(mean(full.map((l) => l.final.astras))), noDivineWeapon: Math.round(full.filter((l) => !l.final.astras).length / Math.max(1, full.length) * 100) };
for (const k of Object.keys(K.ATTRS)) out.final.attrs[k] = r1(mean(full.map((l) => l.final.attrs[k] || 0)));
for (const k of Object.keys(K.SKILLS)) out.final.skills[k] = r1(mean(full.map((l) => l.final.skills[k] || 0)));
if (JSONF) fs.writeFileSync(JSONF, JSON.stringify({ out, lives: lives.map((l) => ({ i: l.i, ending: l.ending, died: l.died, final: l.final, steps: l.steps.map((s) => [s.id, s.act, s.w, s.open, s.kind, s.ft || 0]), tests: l.tests, fights: l.fights })) }));
console.log(JSON.stringify(out, null, 1));
