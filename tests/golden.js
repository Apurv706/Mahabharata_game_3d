/* Golden lives: a fixed set of seeded lives played through the engine alone, recorded as compact traces and compared
   with tests/baselines/golden.json. Together they cover every homeland, every path, both sides, story mode on and
   off, and fights in real time (engine/realtime.js's bot) and on the turns (a careful player, as tests/balance.js
   plays them; it spares a kneeling foe now and then). Choices are random from each life's seed, steered toward the
   life's path and side when those are offered; tests are mostly won.
   A trace: the scenes in order, every choice (S.log), every fight (id, outcome, real-time fingerprint and length),
   the ending, and the final stats. A change in the game shows as the first place each life went another way.
   Usage: node tests/golden.js [--accept] [--only name,name] [--twice] [--json FILE]
          --accept   writes the baseline from this run (after a deliberate change to the story, the fights or the rules)
          --twice    plays the set again in a second process and fails unless both runs are identical (determinism)
   Exits 1 on any difference from the baseline (or between the two runs). */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const H = require("./lib/harness");
const { arg, has } = H;
const BASE = path.join(__dirname, "baselines", "golden.json");

// name, seed, origin, pronoun, path, side, story mode, real time, reckless (loses deadly tests too)
const LIVES = [
  ["hastinapura-archer-pandava-rt", 11, "hastinapura", "she", "archer", "pandava", false, true],
  ["panchala-mace-kaurava-turns", 12, "panchala", "he", "mace", "kaurava", false, false],
  ["matsya-charioteer-pandava-rt-story", 13, "matsya", "they", "charioteer", "pandava", true, true],
  ["mathura-strategist-kaurava-rt", 14, "mathura", "she", "strategist", "kaurava", false, true],
  ["anga-healer-pandava-turns-story", 15, "anga", "he", "healer", "pandava", true, false],
  ["suta-spy-kaurava-rt-story", 16, "suta", "she", "spy", "kaurava", true, true],
  ["nishada-bard-pandava-turns", 17, "nishada", "he", "bard", "pandava", false, false],
  ["gandhara-archer-kaurava-rt-story", 18, "gandhara", "she", "archer", "kaurava", true, true],
  ["panchala-charioteer-kaurava-turns-story", 19, "panchala", "they", "charioteer", "kaurava", true, false],
  ["hastinapura-mace-pandava-rt-story", 20, "hastinapura", "he", "mace", "pandava", true, true],
  ["suta-bard-pandava-turns-story", 21, "suta", "she", "bard", "pandava", true, false],
  ["anga-strategist-kaurava-turns", 22, "anga", "he", "strategist", "kaurava", false, false],
  ["mathura-healer-kaurava-rt-story", 23, "mathura", "they", "healer", "kaurava", true, true],
  ["nishada-spy-pandava-rt", 24, "nishada", "she", "spy", "pandava", false, true],
  ["gandhara-mace-pandava-turns-story", 25, "gandhara", "he", "mace", "pandava", true, false],
  ["matsya-archer-kaurava-turns-reckless", 26, "matsya", "she", "archer", "kaurava", false, false, true]
].map(([name, seed, origin, pronoun, pth, side, story, rt, reckless]) => ({ name, seed, origin, pronoun, path: pth, side, story, rt, reckless: !!reckless }));

function play(spec) {
  const K = H.engine({ hindi: false });
  K.lang = "en"; K.headless = true;
  K.RT.force = spec.rt; K.RT.log.length = 0;
  K.seed(spec.seed * 7919);
  let ms = spec.seed >>> 0; Math.random = () => { ms = (ms * 1664525 + 1013904223) >>> 0; return ms / 4294967296; };
  const pick = (a) => a[Math.floor(K.rng() * a.length)];
  const C = K.Combat;
  C.humanDefense = { counter: 0.12, block: 0.5 }; C.stepNext = false;
  const S = (K.S = K.newLife());
  if (K.momentQueue) K.momentQueue.length = 0;
  S.name = "Ira"; S.pronoun = spec.pronoun; S.origin = spec.origin;
  S.temperament = pick(Object.keys(K.TEMPERAMENTS)); S.heirloom = pick(Object.keys(K.HEIRLOOMS)); S.storyMode = spec.story;
  K.apply(K.ORIGINS[S.origin].fx); K.apply(K.TEMPERAMENTS[S.temperament].fx); K.apply(K.HEIRLOOMS[S.heirloom].fx);
  K.apply({ flag: ["origin_" + S.origin, "temper_" + S.temperament, "heir_" + S.heirloom] });
  K.apply({ journal: "You were born in {origin}." });
  K.go(K.FIRST_SCENE);
  const scenes = [], fights = [];
  let err = null;
  // The choice that sets the life's path or side, when offered (its effects read on a copy of the life).
  const steer = (list) => {
    for (const x of list) {
      let fx; try { const keep = K.S; K.S = JSON.parse(JSON.stringify(keep)); try { fx = K.val(x.c.fx, K.S) || {}; } finally { K.S = keep; } } catch (e) { fx = {}; }
      const set = fx.set || {};
      if (!S.path && set.path === spec.path) return x;
      if (!S.side && set.side === spec.side) return x;
    }
    // Avoid choices that set another path or side.
    const ok = list.filter((x) => { let fx; try { const keep = K.S; K.S = JSON.parse(JSON.stringify(keep)); try { fx = K.val(x.c.fx, K.S) || {}; } finally { K.S = keep; } } catch (e) { fx = {}; } const set = fx.set || {}; return !(set.path && set.path !== spec.path && !S.path) && !(set.side && set.side !== spec.side && !S.side) && !(fx.die === true && !spec.reckless && !S.storyMode); });
    return pick(ok.length ? ok : list);
  };
  const turnFight = (id) => {
    const B = C.start(id, null);
    for (let i = 0; i < 400 && !B.over; i++) {
      const p = C.player(), rows = C.available().filter((a) => !a.why);
      const sp = C.spareable();
      if (sp.length && K.rng() < 0.3) { C.spare(sp[0].uid); continue; }
      const heavy = B.units.filter((u) => u.side === "enemy" && u.hp > 0).map(C.threat).filter(Boolean).some((t) => t.heavy);
      const last = B.habit[B.habit.length - 1], hasA = (a) => rows.find((r) => r.id === a);
      const special = rows.filter((a) => !["strike", "guard", "herbs", "call", "wall", "rally_line"].includes(a.id) && !(K.ABILITIES[a.id] && K.ABILITIES[a.id].group === "astra") && a.id !== "astra");
      const a = p.hp < p.maxHp * 0.35 && hasA("herbs") ? "herbs" : heavy && hasA("guard") && !(last && last.id === "guard") && p.hp < p.maxHp * 0.7 ? "guard" : special.length ? special[0].id : "strike";
      if (!C.act(a, null)) C.act("strike", null);
    }
    const out = B.over || "lose";
    C.end();
    return out;
  };
  for (let step = 0; step < 900; step++) {
    const sc = K.SCENES[K.S.scene];
    scenes.push(sc.id);
    if (sc.ending) break;
    const list = K.choiceList(sc).filter((x) => x.ok);
    if (!list.length) { err = "no choice at " + sc.id; break; }
    const { c } = steer(list);
    let res;
    // Tests mostly won; a deadly one (its failure kills) only lost by the one reckless life, so most lives see the war.
    const deadly = c.game && (K.deadlyBranch(K.val(c.lose) || {}, K.S) || K.deadlyBranch(K.val(c.close) || {}, K.S));
    try { res = c.game ? K.choose(sc, c, pick(deadly && !spec.reckless ? ["win", "win", "close"] : ["win", "win", "win", "close", "lose"])) : K.choose(sc, c); } catch (e) { err = "throws at " + sc.id + ":" + c.id + ": " + e.message; break; }
    let next = res.next;
    if (res.combat) {
      const enc = K.ENCOUNTERS[res.combat];
      let out, f;
      try {
        if (spec.rt && K.RT.isRealtime(enc)) { out = K.RT.autoplay(res.combat, { spare: 0.3 }); const L = K.RT.last && K.RT.log[K.RT.log.length - 1]; f = [res.combat, out, L ? L.fp : "", L ? L.t : 0, L ? L.tries : 0]; }
        else { out = turnFight(res.combat); f = [res.combat, out]; }
        fights.push(f);
        const r = K.combatOutcome(res.combat, out, res.next);
        next = r.next;
      } catch (e) { err = "fight " + res.combat + " throws: " + e.message; break; }
    }
    if (!K.S.alive) next = "end_death";
    try { K.go(next); } catch (e) { err = "go " + next + " throws: " + e.message; break; }
  }
  const e = K.SCENES[K.S.scene].ending ? K.SCENES[K.S.scene].ending(K.S) : null;
  const F = K.S;
  return {
    name: spec.name, spec,
    scenes: scenes.join(" "), log: F.log.slice(), fights,
    ending: e ? e.title : null, error: err,
    final: { alive: F.alive, age: F.age, act: F.act, path: F.path, side: F.side, teacher: F.teacher, court: F.court, friend: F.friend, spouse: F.spouse, child: F.child,
      attrs: F.attrs, skills: F.skills, items: F.items, record: F.record, vows: F.vows.map((v) => v.id + (v.broken ? "!" : "")), boons: F.boons, injuries: F.injuries, curses: F.curses.map((c) => c.id),
      astras: (F.astras || []).map((a) => a.id), tapas: F.tapas, flags: F.flags.length, journal: F.journal.length, seen: F.seen.length, dead: F.dead.slice().sort(), deathText: F.deathText || null }
  };
}

// Where two traces of one life first differ.
function diff(a, b) {
  const out = [];
  const sa = a.scenes.split(" "), sb = b.scenes.split(" ");
  const first = (x, y) => { const n = Math.max(x.length, y.length); for (let i = 0; i < n; i++) if (JSON.stringify(x[i]) !== JSON.stringify(y[i])) return i; return -1; };
  let i = first(sa, sb);
  if (i >= 0) out.push("scenes differ at step " + i + ": baseline " + sa.slice(Math.max(0, i - 2), i + 3).join(" > ") + "  |  now " + sb.slice(Math.max(0, i - 2), i + 3).join(" > ") + " (" + sa.length + " vs " + sb.length + " scenes)");
  i = first(a.log, b.log);
  if (i >= 0) out.push("choices differ at choice " + i + ": baseline " + (a.log[i] || "(none)") + ", now " + (b.log[i] || "(none)"));
  i = first(a.fights, b.fights);
  if (i >= 0) out.push("fights differ at fight " + i + ": baseline " + JSON.stringify(a.fights[i] || null) + ", now " + JSON.stringify(b.fights[i] || null));
  if (a.ending !== b.ending) out.push("ending: baseline " + a.ending + ", now " + b.ending);
  if (a.error !== b.error) out.push("error: baseline " + a.error + ", now " + b.error);
  for (const k of Object.keys(Object.assign({}, a.final, b.final))) if (JSON.stringify(a.final[k]) !== JSON.stringify(b.final[k])) out.push("final " + k + ": baseline " + JSON.stringify(a.final[k]) + ", now " + JSON.stringify(b.final[k]));
  return out;
}

function runAll(only) {
  const out = [];
  for (const spec of LIVES) if (!only || only.has(spec.name)) out.push(play(spec));
  return out;
}

const only = arg("--only", "") ? new Set(arg("--only").split(",")) : null;
if (has("--dump")) { fs.writeFileSync(arg("--dump"), JSON.stringify(runAll(only))); process.exit(0); }
const t0 = Date.now();
const now = runAll(only);
let bad = 0;
// Coverage of the set itself: every homeland, path, side, story mode on and off, real time and turns, and that the
// life really took its path and side (the steering found them).
const cover = { origin: new Set(now.map((r) => r.spec.origin)), path: new Set(now.map((r) => r.final.path)), side: new Set(now.map((r) => r.final.side)), story: new Set(now.map((r) => r.spec.story)), rt: new Set(now.map((r) => r.spec.rt)) };
if (!only) {
  const K = H.engine();
  const miss = [...Object.keys(K.ORIGINS).filter((o) => !cover.origin.has(o)).map((o) => "origin " + o), ...Object.keys(K.PATHS).filter((p) => !cover.path.has(p)).map((p) => "path " + p), ...["pandava", "kaurava"].filter((s) => !cover.side.has(s)).map((s) => "side " + s)];
  if (miss.length) console.log("  note: the golden set no longer reaches " + miss.join(", ") + " (the steering could not find it; choose other seeds)");
}
for (const r of now) { if (r.final.path !== r.spec.path) console.log("  note: " + r.name + " took the path " + r.final.path); if (r.final.side && r.final.side !== r.spec.side) console.log("  note: " + r.name + " fought for " + r.final.side); if (r.error) console.log("  note: " + r.name + ": " + r.error); }
if (has("--twice")) {
  const tmp = path.join(H.SCRATCH, "golden_second.json"); fs.mkdirSync(path.dirname(tmp), { recursive: true });
  const c = cp.spawnSync(process.execPath, [__filename, "--dump", tmp].concat(only ? ["--only", [...only].join(",")] : []), { encoding: "utf8" });
  if (c.status !== 0) { console.log("✗ the second run failed: " + (c.stderr || "").slice(0, 300)); bad++; }
  else {
    const two = JSON.parse(fs.readFileSync(tmp, "utf8"));
    for (const r of now) { const s = two.find((x) => x.name === r.name); const d = s ? diff(r, s) : ["missing in the second run"]; if (d.length) { bad++; console.log("✗ not deterministic: " + r.name + "\n    " + d.slice(0, 4).join("\n    ")); } }
    if (!bad) console.log("ok  two runs identical (" + now.length + " lives)");
  }
}
if (has("--accept")) {
  const keep = fs.existsSync(BASE) && only ? JSON.parse(fs.readFileSync(BASE, "utf8")).lives.filter((l) => !only.has(l.name)) : [];
  fs.mkdirSync(path.dirname(BASE), { recursive: true });
  const lives = keep.concat(now).sort((a, b) => LIVES.findIndex((l) => l.name === a.name) - LIVES.findIndex((l) => l.name === b.name));
  fs.writeFileSync(BASE, JSON.stringify({ _: "Golden lives (tests/golden.js). Rewrite with node tests/golden.js --accept after a deliberate change.", lives }, null, 0).replace(/\{"name":/g, '\n{"name":'));
  console.log("baseline written: " + lives.length + " lives -> " + path.relative(H.ROOT, BASE));
} else {
  if (!fs.existsSync(BASE)) { console.log("✗ no baseline (" + path.relative(H.ROOT, BASE) + "): run node tests/golden.js --accept"); process.exit(1); }
  const base = JSON.parse(fs.readFileSync(BASE, "utf8")).lives;
  for (const r of now) {
    const b = base.find((x) => x.name === r.name);
    if (!b) { bad++; console.log("✗ " + r.name + ": not in the baseline (run --accept)"); continue; }
    const d = diff(b, r);
    if (d.length) { bad++; console.log("✗ " + r.name + " changed:\n    " + d.slice(0, 6).join("\n    ")); }
    else console.log("ok  " + r.name.padEnd(42) + String(r.scenes.split(" ").length).padStart(4) + " scenes, " + String(r.fights.length).padStart(2) + " fights, " + (r.ending || "no ending"));
  }
  for (const b of base) if (!only && !now.some((r) => r.name === b.name)) { bad++; console.log("✗ " + b.name + ": in the baseline but not in the set"); }
}
console.log("golden: " + now.length + " lives, " + (bad ? bad + " changed" : "all as recorded") + " (" + ((Date.now() - t0) / 1000).toFixed(1) + " s)");
const J = arg("--json", ""); if (J) fs.writeFileSync(J, JSON.stringify({ changed: bad, lives: now.map((r) => r.name) }));
process.exit(bad ? 1 : 0);
