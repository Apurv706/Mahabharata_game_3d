/* One check per fixed bug: each case names the commit that fixed it and checks the fix directly, so the bug cannot
   come back unseen. Engine cases run on the engine in this process; browser cases in Playwright Chromium (an emulated
   iPhone 15, an iPhone SE, a 1440x900 laptop), on the game served from game/ (or --game DIR, e.g. an older checkout,
   to see a case fail on the bug it guards against).
   Known failures (tests/known_failures.json, test "bugs", match = the case id) are reported, not counted.
   Usage: node tests/bugs.js [--case id,id] [--engine-only] [--browser-only] [--list] [--json FILE] [--game DIR]
   Adding a case: see tests/README.md ("Adding a bug test"). Exits 1 when a case fails. */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const H = require("./lib/harness");
const { arg, has } = H;

const CASES = [];
const engine = (id, commit, what, fn) => CASES.push({ id, commit, what, kind: "engine", fn });
const browser = (id, commit, what, fn) => CASES.push({ id, commit, what, kind: "browser", fn });
const GAME_DIR = path.resolve(arg("--game", H.GAME));
const OUT = path.resolve(arg("--out", path.join(H.SCRATCH, "bugs")));

// ======================= Engine cases =======================
let K = null;
const E = () => (K = K || H.engine({ hindi: true }));
const life = (o) => { const K = E(); const S = (K.S = Object.assign(K.newLife(), { name: "T", pronoun: "she", origin: "panchala", age: 30, act: 6, path: "mace", side: "pandava", teacher: "drona" }, o || {})); if (K.momentQueue) K.momentQueue.length = 0; return S; };
const rtFight = (enc, o, seed) => { const K = E(); K.lang = "en"; K.RT.force = true; K.seed(seed || 7); life(o); if (K.Combat.state()) { K.Combat.settle("win"); K.Combat.end(); } const B = K.Combat.start(enc, null); const R = K.RT.begin(B); return { K, B, R, C: K.Combat, RT: K.RT, p: K.Combat.player() }; };
const done = (F) => { try { if (F.C.state() && !F.C.state().over) F.C.settle("win"); F.C.end(); } catch (e) { /* already over */ } };

engine("split-homeland", "93709a3", "Part Two of the split build has every homeland painting (raising Vasu had none for Mathura and Suta lives)", () => {
  const out = path.join(OUT, "split"), FIX = path.join(__dirname, "fixtures", "split");
  fs.rmSync(out, { recursive: true, force: true });
  const r = cp.spawnSync(process.execPath, [path.join(H.ROOT, "tools/split/build.js"), out, path.join(FIX, "use.json"), path.join(FIX, "act5_lives.json"), "", "", "--war=" + path.join(FIX, "war_lives.json")], { cwd: H.ROOT, encoding: "utf8" });
  if (r.status !== 0) return ["split build failed: " + (r.stderr || r.stdout).slice(0, 200)];
  const bad = [];
  const homes = fs.readdirSync(path.join(H.GAME, "art")).filter((f) => /^home_/.test(f));
  for (const o of Object.keys(E().ORIGINS)) if (!homes.some((f) => f.startsWith("home_" + o))) bad.push("no painting at all for the homeland " + o);
  for (const n of [1, 2]) { const m = JSON.parse(fs.readFileSync(path.join(out, "part" + n + ".files.json"), "utf8")); for (const f of homes) if (!m["art/" + f]) bad.push("part " + n + " lacks art/" + f); }
  // The painted homeland map (7 November): Part One, which begins new lives; not Part Two, which has no creation page.
  const p1 = JSON.parse(fs.readFileSync(path.join(out, "part1.files.json"), "utf8")), p2 = JSON.parse(fs.readFileSync(path.join(out, "part2.files.json"), "utf8"));
  if (!p1["art/map_bharat.webp"]) bad.push("part 1 lacks the painted homeland map art/map_bharat.webp");
  if (p2["art/map_bharat.webp"]) bad.push("part 2 carries the painted homeland map, which it never shows");
  return bad;
});
engine("spare-5pct", "36bcb19", "a foe can be spared only below 5% of his health (kneeling), or asleep or bound; sparing him lets the fight go on", () => {
  const F = rtFight("e_gandharva", { act: 5, age: 38 }), { C, B, R, RT, p } = F, bad = [];
  const [a, b] = B.units.filter((u) => u.side === "enemy");
  if (C.PLEAD !== 0.05) bad.push("C.PLEAD is " + C.PLEAD + ", not 0.05");
  a.hp = Math.ceil(a.maxHp * 0.06); if (C.spareable().includes(a) || C.pleads(a)) bad.push("spareable at 6% of his health");
  a.hp = Math.max(1, Math.floor(a.maxHp * 0.04)); if (!C.spareable().includes(a) || !C.pleads(a)) bad.push("not spareable at 4% of his health");
  b.status.asleep = 2; if (!C.spareable().includes(b)) bad.push("an asleep foe at full health cannot be spared"); delete b.status.asleep;
  b.status.bound = 2; if (!C.spareable().includes(b)) bad.push("a bound foe at full health cannot be spared"); delete b.status.bound;
  if (C.spareable().includes(b)) bad.push("a foe at full health, awake and free, can be spared");
  // In real time: walk up to him and spare him; the fight goes on against the other.
  p.rt.x = Math.max(0.12, a.rt.x - 0.08); a.rt.entered = true;
  let spared = false;
  for (let i = 0; i < 120 && !spared && !R.over; i++) { p.hp = p.maxHp; RT.step(R, { spare: a.uid }); spared = !!a.spared; }
  if (!spared) bad.push("could not spare the kneeling foe in real time");
  for (let i = 0; i < 30 && !R.over; i++) { p.hp = p.maxHp; RT.step(R, {}); }
  if (R.over || B.over) bad.push("the fight ended when one of two foes was spared (" + (R.over || B.over) + ")");
  done(F); return bad;
});
engine("retry-80pct", "0fcc988", "a lost deadly fight gives one Try again at 80% health, with what is used once a battle still used", () => {
  const F = rtFight("e_guard", { act: 6, age: 44, path: "charioteer" }), { RT, B, p } = F, bad = [];
  if (!B.enc.lethal) return ["e_guard is not a deadly fight any more: pick another"];
  B.used.call = true; B.used.astra = true;
  let R = F.R; p.hp = 0;
  for (let i = 0; i < 10 && !R.over; i++) RT.step(R, {});
  if (R.over !== "retry") bad.push("a first loss ends as " + R.over + ", not a second try");
  const R2 = RT.retry(R), p2 = F.C.player();
  if (Math.abs(p2.hp / p2.maxHp - 0.8) > 0.02) bad.push("the second try starts at " + Math.round(p2.hp / p2.maxHp * 100) + "% health, not 80%");
  if (!R2.B.used.call || !R2.B.used.astra) bad.push("what was used once a battle is usable again: " + JSON.stringify(R2.B.used));
  if (RT.can(R2, "call")) bad.push("the call for help can be made again on the second try");
  p2.hp = 0; for (let i = 0; i < 10 && !R2.over; i++) RT.step(R2, {});
  if (R2.over !== "lose") bad.push("a second loss ends as " + R2.over + ", not a loss");
  F.C.end(); return bad;
});
engine("archer-bow-roll", "975bb96", "archers fight with the bow only (no melee blow, foe archers only shoot) and keep Roll", () => {
  const F = rtFight("e_jayadratha", { act: 5, age: 38, path: "archer" }), { RT, R, p, B } = F, bad = [];
  if (R.blocker || !RT.can(R, "roll") || RT.can(R, "block")) bad.push("the archer has Block instead of Roll");
  if (p.rt.weapon !== "bow" || !RT.comboOf(R).every((c) => c.shot)) bad.push("the archer's Strike is not all arrows (" + p.rt.weapon + ")");
  let blows = 0, shots = 0; const foeMoves = new Set();
  const ar = B.units.find((u) => u.side === "enemy" && u.rt.archer);
  for (let i = 0; i < 60 * 25 && !R.over; i++) {
    p.hp = p.maxHp; RT.step(R, RT.bot(R));
    for (const f of R.fx) { if (f.k === "shot" && f.uid === p.uid) shots++; if (f.k === "blow" && f.uid === p.uid) blows++; if (ar && f.uid === ar.uid && f.id) foeMoves.add(f.id); }
    if (ar && ar.rt.atk && ar.rt.atk.id) foeMoves.add(ar.rt.atk.id);
    R.fx.length = 0;
  }
  if (blows) bad.push("the archer struck " + blows + " melee blows");
  if (!shots) bad.push("the archer loosed no arrows");
  if (ar && [...foeMoves].some((id) => !["arrows", "aimed", "pin", "volley"].includes(id))) bad.push("a foe archer did more than shoot: " + [...foeMoves].join(","));
  done(F); return bad;
});
engine("shield-paths-block", "975bb96", "the shield paths (mace, charioteer, strategist) have Block in place of Roll; the others roll", () => {
  const bad = [];
  for (const pth of Object.keys(E().PATHS)) {
    const F = rtFight("e_bandits", { act: 5, age: 38, path: pth }), { RT, R } = F;
    const shield = ["mace", "charioteer", "strategist"].includes(pth);
    if (shield && !(R.blocker && RT.can(R, "block") && !RT.can(R, "roll"))) bad.push(pth + ": no Block (or Roll as well)");
    if (!shield && (R.blocker || !RT.can(R, "roll"))) bad.push(pth + ": Block, or no Roll");
    if (shield !== !!F.C.hasShield()) bad.push(pth + ": C.hasShield says " + F.C.hasShield());
    done(F);
  }
  return bad;
});
engine("mace-two-blows", "975bb96", "the mace has two heavy blows (overhead smash, side sweep); a blade three", () => {
  const bad = [];
  let F = rtFight("e_bandits", { act: 5, age: 38, path: "mace" });
  const c = F.RT.comboOf(F.R); if (c.length !== 2 || !c.every((x) => x.heavy) || c.map((x) => x.arc).join() !== "smash,sweep") bad.push("mace combo: " + JSON.stringify(c.map((x) => x.arc || "?")));
  done(F); F = rtFight("e_bandits", { act: 5, age: 38, path: "charioteer" });
  if (F.RT.comboOf(F.R).length !== 3) bad.push("the sword's combo is not three blows"); done(F);
  return bad;
});
engine("withdraw-hindi", "dd0000c", "Withdraw's Hindi label is its own (\"लड़ाई छोड़ो\"), not the order Fall back (\"पीछे हटो\")", () => {
  const K = E(); K.lang = "hi"; const w = K.tr("Withdraw"), f = K.tr("Fall back"); K.lang = "en";
  const bad = [];
  if (w !== "लड़ाई छोड़ो") bad.push("Withdraw in Hindi is " + w);
  if (w === f) bad.push("Withdraw and Fall back read the same in Hindi: " + w);
  return bad;
});
engine("lac-death-ending", "707a099", "dying in the house of lac (a second failed escape) ends on its own ending: The burnt house, at Varnavata", () => {
  const K = E(); K.lang = "en"; K.RT.force = false; K.seed(5); const S = life({ act: 3, age: 23, path: "spy", side: null }); S.flags.push("lac_inside");
  const bad = [];
  K.go("a3_fire"); const sc = K.SCENES[S.scene]; if (sc.id !== "a3_fire") return ["could not reach a3_fire (at " + sc.id + ")"];
  const c = (K.val(sc.choices) || []).find((x) => x.id === "run");
  const r1 = K.choose(sc, c, "lose");
  if (!r1.retry || !S.alive) bad.push("the first failed escape is not survived with a Try again");
  K.go(r1.next);
  const c2 = K.choiceList(K.SCENES[S.scene])[0].c;
  if (!c2.again) bad.push("the one choice left is not Try again");
  const r2 = K.choose(K.SCENES[S.scene], c2, "lose");
  if (S.alive || r2.next !== "end_death") bad.push("a second failed escape is not death");
  const e = K.composeEnding(S);
  if (e.title !== "The burnt house" || e.art !== "end_fire") bad.push("the ending is " + e.title + " (" + e.art + ")");
  if (!e.telling.some((t) => /Varnavata/.test(t))) bad.push("the telling does not say Varnavata");
  return bad;
});
engine("journal-once", "5299cf1", "the same journal line is written once per life (the spy path's entry appeared twice)", () => {
  const K = E(); K.lang = "en"; const S = life({ act: 2, path: null });
  K.apply({ set: { path: "spy" }, journal: "You chose the path of the {path!}." }); K.apply({ set: { path: "spy" }, journal: "You chose the path of the {path!}." });
  const n = S.journal.filter((j) => /path of the/.test(j.text)).length;
  return n === 1 ? [] : ["the line was written " + n + " times"];
});
engine("never-younger", "2ad6bae", "age never goes back (a scene written for an earlier age, Continue), and neither does the act (ce6516f)", () => {
  const K = E(); K.lang = "en"; const bad = [];
  const S = life({ act: 5, age: 40, scene: "a5_side" }); S.seen.push("a5_side");
  const early = Object.values(K.SCENES).find((sc) => sc.act === 3 && typeof sc.age === "number" && sc.age < 40 && !sc.when && !K.BEFORE[sc.id] && !sc.prologue);
  K.go(early.id);
  if (S.age < 40) bad.push("going to " + early.id + " made the life " + S.age);
  if (S.act < 5) bad.push("going to " + early.id + " took the act back to " + S.act);
  const back = JSON.parse(JSON.stringify(S)); back.scene = early.id; K.resume(back);
  if (K.S.age < 40) bad.push("Continue made the life younger");
  return bad;
});
engine("bad-code-keeps-life", "57236f5", "a save code that cannot be read never replaces the current life; a cleaned save is the same life", () => {
  const K = E(); K.lang = "en"; const S = life({ act: 4, age: 30, scene: "a4_hall" }); const keep = JSON.stringify(S), bad = [];
  for (const code of ["", "garbage", "W10=", Buffer.from('{"v":2,"scene":"nowhere"}').toString("base64"), Buffer.from("[1,2]").toString("base64")]) {
    let threw = false; try { K.importCode(code); } catch (e) { threw = true; }
    if (!threw) bad.push("the code " + JSON.stringify(code) + " was accepted");
  }
  if (JSON.stringify(K.S) !== keep) bad.push("a bad code changed the current life");
  return bad;
});
engine("fall-to-middle", "6c4ba9d", "the fallen fall toward the middle of the stage, never past its edge (a Gandharva fell backward off the screen)", () => {
  const RT = E().RT, bad = [];
  if (RT.fallDir({ rt: { x: 0.9 } }) !== -1) bad.push("a figure on the right falls to the right");
  if (RT.fallDir({ rt: { x: 0.1 } }) !== 1) bad.push("a figure on the left falls to the left");
  return bad;
});

engine("lose-lived-rule", "42873f9", "K.loseLived: beaten but alive for a fight that is not deadly and for any fight in story mode; not for a deadly fight outside story mode, practice or the dream", () => {
  const K = E(), bad = [];
  if (typeof K.loseLived !== "function") return ["K.loseLived is missing"];
  const lethal = Object.values(K.ENCOUNTERS).find((e) => e.lethal && !e.dream && !(K.val((e.lose || {}).fx, life()) || {}).die), plain = K.ENCOUNTERS.e_bandits;
  if (plain.lethal) bad.push("e_bandits is deadly now: pick another plain fight");
  let S = life({ storyMode: false });
  if (!K.loseLived("e_bandits", S)) bad.push("a fight that is not deadly: not beaten-but-alive");
  if (K.loseLived(lethal.id, S)) bad.push("a deadly fight (" + lethal.id + ") outside story mode: beaten-but-alive");
  S = life({ storyMode: true });
  if (!K.loseLived(lethal.id, S)) bad.push("a deadly fight (" + lethal.id + ") in story mode: not beaten-but-alive");
  if (K.loseLived("x_practice", S)) bad.push("practice counts as beaten-but-alive");
  const dream = Object.values(K.ENCOUNTERS).find((e) => e.dream); if (dream && K.loseLived(dream.id, S)) bad.push("the dream counts as beaten-but-alive");
  return bad;
});
engine("empty-clash", "b82127f", "a break-through lane whose foe is down brings no clash (the clash screen opened and shut in a second); a lane with its foe standing still does", () => {
  const K = E(), C = K.Combat, bad = [];
  K.lang = "en"; K.seed(3); life({ path: "spy" });
  if (C.state()) { try { C.settle("win"); C.end(); } catch (e) { /* none */ } }
  const B = C.start("fs_sk_break", null); B.clashMode = true; // (the clash screen is the browser's; its switch set by hand)
  const foe = B.units.find((u) => u.uid === "e" + B.enc.lanes[2].foe); foe.hp = 0;
  const r0 = B.round;
  if (!C.act("lane2")) bad.push("the right lane could not be taken");
  if (B.clashPending) bad.push("the right lane, its rider down: a clash is waiting with no foe on the field");
  if (B.round !== r0 + 1) bad.push("the right lane, its rider down: the round did not close (" + r0 + " → " + B.round + ")");
  if (!B.over) { C.act("lane1"); if (!B.clashPending) bad.push("the middle lane, its spearmen standing: no clash"); B.clashPending = false; }
  try { C.settle("win"); C.end(); } catch (e) { /* already over */ }
  return bad;
});

engine("edge-reach", "b6199f9", "your blow lands at its own length when you are backed against the edge of the field: you shove the foe back as you swing (a spear landed with the foe on top of you, 0.01 of the reach apart)", () => {
  const bad = [];
  for (const [path0, w] of [["charioteer", "spear"], ["healer", "dagger"]]) for (const side of [1, -1]) {
    const F = rtFight("e_guard", { path: path0 }, 11), { R, B, RT, p } = F, BODY = RT.BODY;
    const foes = B.units.filter((u) => u.side === "enemy");
    const f = foes[0];
    foes.slice(1).forEach((u) => { u.hp = 0; });
    if (p.rt.weapon !== w) bad.push(path0 + ": holds " + p.rt.weapon + ", not a " + w);
    // You at the edge (right, then left), facing in; the foe in your row at 0.4 of your reach, not swinging.
    p.rt.x = side > 0 ? 1 - RT.EDGE : RT.EDGE; p.rt.face = -side; f.rt.entered = true; f.rt.lane = p.rt.lane; f.rt.x = p.rt.x - side * 0.4 * p.rt.reach; f.rt.atk = null; f.rt.cool = 99; f.rt.stag = 0;
    let landed = null;
    for (let i = 0; i < 120 && !R.over && !landed; i++) {
      p.hp = p.maxHp; f.hp = f.maxHp; f.rt.cool = 99; if (f.rt.atk) f.rt.atk = null;
      const n0 = R.fx.length;
      RT.step(R, i === 0 ? { strike: true } : {});
      const h = R.fx.slice(n0).find((x) => x.k === "hit" && x.by === p.uid && x.melee);
      if (h) landed = Math.abs(f.rt.x - p.rt.x) / p.rt.reach;
    }
    if (landed == null) bad.push(path0 + " at the " + (side > 0 ? "right" : "left") + " edge: the blow never landed");
    else if (landed < 0.8) bad.push(path0 + " (" + w + ") at the " + (side > 0 ? "right" : "left") + " edge: the blow landed " + landed.toFixed(2) + " of the reach apart");
    done(F);
  }
  return bad;
});

// ======================= Browser cases =======================
let PW = null, BROWSER = null, SRV = null;
const DEV = { "iPhone 15": () => Object.assign({}, PW.devices["iPhone 15"]), "iPhone SE": () => Object.assign({}, PW.devices["iPhone SE"]), laptop: () => ({ viewport: { width: 1440, height: 900 } }) };
async function open(o = {}) {
  const ctx = await BROWSER.newContext(Object.assign(DEV[o.device || "iPhone 15"](), o.ctx || {}));
  const pg = await ctx.newPage(), errs = [];
  pg.on("pageerror", (e) => errs.push("page error: " + e.message));
  pg.on("console", (m) => { if (m.type() === "error" && !/net::ERR_FAILED|fonts\.g/.test(m.text())) errs.push("console: " + m.text()); });
  await pg.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  // ?rt=1: the developer switch older versions kept the real-time and war-day screens behind (ignored now), so a case can
  // be run on an older checkout (--game DIR) and seen to fail on the bug it guards against.
  await pg.goto(SRV.url + "index.html" + (o.query || "?rt=1"));
  await pg.waitForFunction(() => window.K && K.UI && document.querySelector("#leaf"));
  if (o.calm) await pg.evaluate(() => { K.prefs({ calm: true }); K.UI.applyCalm(); });
  if (o.lang === "hi") await pg.evaluate(() => new Promise((r) => { K.UI.setLang("hi", r); setTimeout(r, 1500); }));
  return { ctx, pg, errs, close: () => ctx.close() };
}
// A grown life at the war (or o), and a fight on its screen: the real-time screen for a real-time fight, the war-day
// screen for the others (the fight's rules card and first-fight walkthrough already seen).
async function fight(pg, enc, o = {}) {
  await pg.evaluate(([enc, o]) => {
    const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 44, act: 6, path: "mace", side: "pandava", teacher: "drona" }, o));
    S.attrs.might = 3; S.attrs.grace = 3; S.items.herbs = 2; S.flags.push("role_front"); S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1;
    K.seed(3); window.__ended = null; K.UI.startBattle(enc, (out) => { window.__ended = out; });
  }, [enc, o]);
  await pg.waitForSelector("#rt", { timeout: 8000 });
  await pg.waitForTimeout(o.wait != null ? o.wait : 1200);
}
const keepAlive = (pg) => pg.evaluate(() => { clearInterval(window.__alive); window.__alive = setInterval(() => { const p = K.Combat.player(); if (p) p.hp = p.maxHp; }, 50); });

browser("hold-touch", "3e2854d", "fights on a phone: a text field left focused is let go; holding Block, ◀, Strike or the stage selects no text and the held flags clear on release; #rt sets -webkit-touch-callout: none", async () => {
  const { pg, ctx, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  const stray = () => pg.evaluate(() => { let i = document.getElementById("stray"); if (!i) { i = document.createElement("input"); i.id = "stray"; document.body.appendChild(i); } i.focus(); return document.activeElement === i; });
  if (!(await stray())) bad.push("could not focus a text field to begin with");
  await fight(pg, "e_bandits", { act: 5, age: 38, path: "mace" });
  await keepAlive(pg);
  if (await pg.evaluate(() => document.activeElement && document.activeElement.id === "stray")) bad.push("real-time screen: the text field is still focused");
  const cdp = await ctx.newCDPSession(pg);
  const hold = async (sel, flag) => {
    const bb = await pg.locator("#rt " + sel).first().boundingBox();
    if (!bb) { bad.push("no " + sel + " on the screen"); return; }
    const pt = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt] });
    await pg.waitForTimeout(900);
    const mid = await pg.evaluate(() => ({ held: Object.assign({}, (K.UI.rtScreen() || K.UI.warScreen() || {}).held || {}), sel: String(getSelection()) }));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await pg.waitForTimeout(150);
    const after = await pg.evaluate(() => Object.assign({}, (K.UI.rtScreen() || K.UI.warScreen() || {}).held || {}));
    if (mid.sel) bad.push("holding " + sel + " selected text: " + JSON.stringify(mid.sel.slice(0, 40)));
    if (flag && !mid.held[flag]) bad.push("holding " + sel + ": the " + flag + " flag is not set while held");
    if (flag && after[flag]) bad.push("releasing " + sel + ": the " + flag + " flag stays set");
  };
  await hold('[data-hold="block"]', "block");
  await hold('[data-hold="l"]', "l");
  await hold('[data-act="strike"]');
  await hold("#rt-stage");
  const css = await pg.evaluate(() => fetch("css/realtime.css").then((r) => r.text()));
  if (!/#rt\b[^{}]*\{[^}]*-webkit-touch-callout:\s*none/.test(css)) bad.push("css/realtime.css: #rt does not set -webkit-touch-callout: none");
  // The war-day screen, the same way.
  await pg.evaluate(() => clearInterval(window.__alive));
  if (!(await stray())) bad.push("could not focus the text field again");
  await fight(pg, "e_day16", { path: "archer" });
  if (!(await pg.evaluate(() => !!K.UI.warScreen()))) bad.push("e_day16 did not open the war-day screen");
  if (await pg.evaluate(() => document.activeElement && document.activeElement.id === "stray")) bad.push("war-day screen: the text field is still focused");
  const place = await pg.$("#rt [data-place]"); if (place) { await place.tap(); await pg.waitForTimeout(500); }
  await hold("#wd-moves button");
  await hold("#rt-stage");
  await close(); return bad.concat(errs);
});
browser("gandharva-visible", "6c4ba9d", "e_gandharva on the real-time screen: every Gandharva is drawn, visible and on the stage, standing and fallen", async () => {
  const bad = [];
  for (const device of ["iPhone 15", "laptop"]) {
    const { pg, errs, close } = await open({ device });
    await fight(pg, "e_gandharva", { act: 5, age: 38, path: "charioteer", wait: 2500 });
    await keepAlive(pg);
    const look = () => pg.evaluate(() => {
      const V = K.UI.rtScreen(), sr = V.stage.getBoundingClientRect(), out = [];
      for (const a of V.actors.values()) {
        if (a.u.side !== "enemy" || !/Gandharva/.test(a.u.src || a.u.name)) continue;
        const r = a.svg.getBoundingClientRect();
        let op = 1; for (let n = a.svg; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); op *= +cs.opacity; if (cs.display === "none" || cs.visibility === "hidden") op = 0; }
        out.push({ uid: a.u.uid, hp: a.u.hp, w: r.width, h: r.height, op, l: r.left - sr.left, r: sr.right - r.right, b: sr.bottom - r.bottom, x: a.u.rt.x });
      }
      return out;
    });
    const st = await look();
    if (st.length < 2) bad.push(device + ": " + st.length + " Gandharvas drawn, not 2");
    for (const g of st) { if (g.w < 10 || g.h < 10 || g.op < 0.5) bad.push(device + ": a Gandharva is not visible (" + JSON.stringify(g) + ")"); if (g.l < -4 || g.r < -4 || g.b < -4) bad.push(device + ": a Gandharva is off the stage (" + JSON.stringify(g) + ")"); }
    // One falls: he stays on the stage, fallen toward the middle.
    await pg.evaluate(() => { const e = K.Combat.state().units.find((u) => u.side === "enemy" && /Gandharva/.test(u.src || u.name)); e.hp = 0; });
    await pg.waitForTimeout(1800);
    for (const g of (await look()).filter((x) => x.hp <= 0)) { if (g.w < 10 || g.op < 0.3) bad.push(device + ": the fallen Gandharva vanished (" + JSON.stringify(g) + ")"); if (g.l < -4 || g.r < -4 || g.b < -4) bad.push(device + ": the fallen Gandharva fell off the stage (" + JSON.stringify(g) + ")"); }
    bad.push(...errs.map((e) => device + ": " + e)); await close();
  }
  return bad;
});
browser("lac-fullscreen-ending", "707a099", "the lac-house death ends on its own full-screen ending (The burnt house, its painting over the whole screen)", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const r = await pg.evaluate(async () => {
    const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 23, act: 3, path: "spy", teacher: "drona" })); S.flags.push("lac_inside");
    K.seed(5); K.go("a3_fire");
    const sc = K.SCENES[K.S.scene], c = K.val(sc.choices).find((x) => x.id === "run");
    const r1 = K.choose(sc, c, "lose"); K.go(r1.next);
    const c2 = K.choiceList(K.SCENES[K.S.scene])[0].c, r2 = K.choose(K.SCENES[K.S.scene], c2, "lose");
    K.go(r2.next);
    await new Promise((ok) => setTimeout(ok, 2500));
    const es = document.querySelector(".endscreen"), r = es && es.getBoundingClientRect(), art = es && es.querySelector(".es-art i");
    return { scene: K.S.scene, alive: K.S.alive, es: !!es, label: es && es.getAttribute("aria-label"), w: r && r.width, h: r && r.height, vw: innerWidth, vh: innerHeight, img: art && getComputedStyle(art).getPropertyValue("--img") };
  });
  const bad = [];
  if (r.alive || r.scene !== "end_death") bad.push("not dead at end_death: " + JSON.stringify(r));
  if (!r.es) bad.push("no full-screen ending (.endscreen)");
  else {
    if (r.label !== "The burnt house") bad.push("the ending is " + r.label);
    if (r.w < r.vw - 1 || r.h < r.vh - 1) bad.push("the ending does not fill the screen (" + r.w + "x" + r.h + " of " + r.vw + "x" + r.vh + ")");
    if (!/end_fire/.test(r.img || "")) bad.push("the ending's painting is not end_fire: " + r.img);
  }
  await close(); return bad.concat(errs);
});
browser("sweep-rings", "57d53c3", "war day: a blow at the whole line rings every one of your side, with no box around part of it", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  await fight(pg, "e_day16", { path: "archer" });
  const place = await pg.$("#rt [data-place]"); if (place) { await place.tap(); await pg.waitForTimeout(700); }
  const r = await pg.evaluate(async () => {
    const B = K.Combat.state(), foe = B.units.find((u) => u.side === "enemy" && u.hp > 0 && !u.away);
    foe.intent = { id: "arrows" };
    window.dispatchEvent(new Event("resize")); await new Promise((ok) => setTimeout(ok, 600));
    const V = K.UI.warScreen(), friends = new Set([...V.figs.values()].filter((f) => f.side === "friend" && !f.dead).map((f) => f.u.uid));
    return { friends: friends.size, rings: V.world.querySelectorAll(".gmark.ring").length, boxes: V.world.querySelectorAll(".gmark.area, .gmark:not(.ring):not(.lane)").length, intent: K.Combat.intent(foe) && K.Combat.intent(foe).target };
  });
  const bad = [];
  if (r.intent !== "enemies") bad.push("could not mark a blow at the whole line (" + r.intent + ")");
  if (r.rings !== r.friends) bad.push(r.rings + " rings for " + r.friends + " of your side");
  if (r.boxes) bad.push(r.boxes + " box(es) drawn for the blow at the whole line");
  await close(); return bad.concat(errs);
});
browser("shield-wall-no-box", "f947735", "war day: Shield wall shows the line closing up, with no blue box (no blue-tinted panel or focus ring around the line or the card)", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  await fight(pg, "e_day16", { path: "mace" });
  const place = await pg.$("#rt [data-place]"); if (place) { await place.tap(); await pg.waitForTimeout(700); }
  const card = await pg.$('#wd-moves [data-move="wall"]');
  const bad = [];
  if (!card) { await close(); return ["no Shield wall card on the war-day screen"]; }
  await card.tap(); await pg.waitForTimeout(400);
  const scan = await pg.evaluate(() => {
    const blue = (c) => { const m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); if (!m) return false; const [r, g, b, a] = [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]]; return a > 0.15 && b > r + 50 && b > g + 20; };
    const out = [];
    for (const el of document.querySelectorAll("#rt *")) {
      const r = el.getBoundingClientRect(); if (r.width < 30 || r.height < 30) continue;
      const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < 0.1) continue;
      if (el.classList.contains("slowtint")) continue; // the slow-motion tint (real time only), at rest unseen
      const hits = [];
      if (blue(cs.backgroundColor)) hits.push("background " + cs.backgroundColor);
      if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none" && blue(cs.borderTopColor)) hits.push("border " + cs.borderTopColor);
      if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 && blue(cs.outlineColor)) hits.push("outline " + cs.outlineColor);
      if (cs.boxShadow && cs.boxShadow !== "none" && (cs.boxShadow.match(/rgba?\([^)]*\)/g) || []).some(blue)) hits.push("shadow " + cs.boxShadow.slice(0, 60));
      if (hits.length) out.push((el.id ? "#" + el.id : el.tagName.toLowerCase() + "." + [...el.classList].join(".")) + ": " + hits.join(", "));
    }
    const a = document.activeElement;
    return { out, walled: K.Combat.state().units.some((u) => u.side !== "enemy" && u.status.wall), ring: !!(a && a.matches && a.matches(":focus-visible") && getComputedStyle(a).outlineStyle !== "none") };
  });
  if (!scan.walled) bad.push("Shield wall did not go up");
  for (const o of scan.out) bad.push("a blue box: " + o);
  if (scan.ring) bad.push("the tapped card shows a focus ring");
  await close(); return bad.concat(errs);
});
browser("rt-controls-by-weapon", "975bb96", "real-time controls: Block (held) for the shield paths, Roll for the others; the mace's Strike says ×2", async () => {
  const bad = [];
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  for (const pth of ["mace", "charioteer", "strategist", "archer", "healer"]) {
    await fight(pg, "e_bandits", { act: 5, age: 38, path: pth, wait: 600 });
    const r = await pg.evaluate(() => ({ block: !!document.querySelector('#rt [data-hold="block"]'), roll: !!document.querySelector('#rt [data-act="roll"]'), strike: (document.querySelector('#rt [data-act="strike"] small') || {}).textContent }));
    const shield = ["mace", "charioteer", "strategist"].includes(pth);
    if (shield && (!r.block || r.roll)) bad.push(pth + ": " + JSON.stringify(r));
    if (!shield && (r.block || !r.roll)) bad.push(pth + ": " + JSON.stringify(r));
    if ((pth === "mace") !== /×2/.test(r.strike || "")) bad.push(pth + ": Strike says " + r.strike);
  }
  await close(); return bad.concat(errs);
});
browser("slung-bow-hidden", "b1d4b0d", "a weapon put by is not drawn: a bow-bearer who takes up a sword shows the sword alone, and the bow again after", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const r = await pg.evaluate(async () => {
    const U = K.UI, host = document.createElement("div"); host.style.cssText = "position:fixed;left:0;top:0;width:393px;height:400px;z-index:99999;background:#fff"; document.body.appendChild(host);
    host.innerHTML = '<div class="act">' + U.puppet(U.puppetFor("arjuna"), { h: 200, pose: "live" }) + "</div>";
    const svg = host.querySelector("svg"), rig = U.rig(svg, host.firstChild, "stand", { fight: true });
    if (!rig) return { err: "no live rig" };
    const vis = () => [...svg.querySelectorAll(".pp-body .it")].filter((g) => { for (let n = g; n && n !== svg; n = n.parentNode) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; } return true; }).map((g) => g.dataset.k);
    const before = vis(); rig.wield("sword"); await new Promise((ok) => setTimeout(ok, 50)); const out = vis(); rig.unwield(); await new Promise((ok) => setTimeout(ok, 50)); const after = vis();
    rig.stop && rig.stop(); host.remove();
    return { before, out, after };
  });
  const bad = [];
  if (r.err) bad.push(r.err);
  else {
    if (!r.before.includes("bow")) bad.push("Arjuna is not drawn with his bow: " + r.before);
    if (r.out.length !== 1 || r.out[0] !== "sword") bad.push("with the sword out, drawn: " + r.out.join(", "));
    if (!r.after.includes("bow") || r.after.includes("sword")) bad.push("after putting the sword by, drawn: " + r.after.join(", "));
  }
  await close(); return bad.concat(errs);
});
browser("face-clear-at-rest", "dd15191", "out of a fight nothing held covers a face (a few figures; tests/facefit.js measures every one)", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = await pg.evaluate(async () => {
    const U = K.UI, out = [], TOL = 3;
    const specs = [["bhima", U.puppetFor("bhima")], ["arjuna", U.puppetFor("arjuna")], ["yudhishthira", U.puppetFor("yudhishthira")], ["duryodhana", U.puppetFor("duryodhana")]];
    for (const p of ["mace", "archer", "charioteer"]) specs.push(["you (" + p + ")", K.puppetSpec(Object.assign(K.newLife(), { name: "T", age: 30, act: 5, path: p, origin: "panchala" }))]);
    const host = document.createElement("div"); host.style.cssText = "position:fixed;left:0;top:0;width:393px;height:400px;background:#fff;z-index:99999"; document.body.appendChild(host);
    const measure = (who, svg) => {
      const f = svg.querySelector(".pp-body .pp-face"); if (!f) return; const head = f.getBoundingClientRect();
      for (const it of svg.querySelectorAll(".pp-body .it, .pp-body .it-s")) {
        let deep = 0;
        for (const sh of it.querySelectorAll("path, circle, ellipse, rect, line, polygon, polyline")) {
          if (sh.closest(".nock") || getComputedStyle(sh).display === "none") continue;
          let bb; try { bb = sh.getBBox(); } catch (e) { continue; } const m = sh.getScreenCTM(); if (!m) continue;
          const st = Math.max(0.5, Math.min(bb.width, bb.height, 6) / 4);
          for (let x = bb.x; x <= bb.x + bb.width + 1e-6; x += st) for (let y = bb.y; y <= bb.y + bb.height + 1e-6; y += st) {
            const pt = new DOMPoint(x, y);
            if (!(sh.isPointInFill(pt) || (sh.getAttribute("stroke") && sh.getAttribute("stroke") !== "none" && sh.isPointInStroke(pt)))) continue;
            const q = pt.matrixTransform(m); deep = Math.max(deep, Math.min(q.x - head.left, head.right - q.x, q.y - head.top, head.bottom - q.y));
          }
        }
        if (deep > TOL) out.push(who + ": " + (it.dataset.k || "shield") + " " + Math.round(deep) + " px into the face");
      }
    };
    for (const [who, spec] of specs) {
      host.innerHTML = U.puppet(spec, { h: 160, pose: "stand" }); await new Promise((r) => setTimeout(r, 0));
      host.querySelectorAll("*").forEach((e) => { e.style.transition = "none"; }); measure(who + " (still)", host.querySelector("svg"));
      host.innerHTML = '<div class="act">' + U.puppet(spec, { h: 160, pose: "live" }) + "</div>";
      const svg = host.querySelector("svg"), base = svg.dataset.stance || "stand", rig = U.rig(svg, host.firstChild, base);
      if (rig) { rig.set(base, 900, 0.5, true); measure(who + " (live)", svg); rig.stop(); }
    }
    host.remove(); return out;
  });
  await close(); return bad.concat(errs);
});
browser("notch-safe-area", "aa29a58", "text clears the notch (ui/safearea.js): on an iPhone 15 filling the screen with a 0 inset, --sat is 54px and the top bar, a test and the real-time screen sit below it; not on Android or in Safari's own frame", async () => {
  const bad = [];
  const full = { viewport: { width: 393, height: 852 }, screen: { width: 393, height: 852 } };
  {
    const { pg, errs, close } = await open({ device: "iPhone 15", ctx: full });
    const r = await pg.evaluate(() => ({ sat: getComputedStyle(document.documentElement).getPropertyValue("--sat").trim(), sab: getComputedStyle(document.documentElement).getPropertyValue("--sab").trim() }));
    if (r.sat !== "54px" || r.sab !== "28px") bad.push("iPhone full screen: --sat " + r.sat + ", --sab " + r.sab);
    // The story's top bar
    await pg.evaluate(() => { const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", heirloom: "bow", temperament: "bold" })); K.go("a1_home"); });
    await pg.waitForTimeout(1500);
    const top = await pg.evaluate(() => { const t = [...document.querySelectorAll(".top #where b, .top .where, .top #brand")].map((e) => e.getBoundingClientRect()).filter((b) => b.height); return t.length ? Math.min(...t.map((b) => b.top)) : null; });
    if (top == null || top < 54) bad.push("the story's top bar starts at " + top + " px, under the island");
    await fight(pg, "e_bandits", { act: 5, age: 38 });
    const hud = await pg.evaluate(() => { const b = document.querySelector("#rt .hud, #rt .titleband"); const rr = [...document.querySelectorAll("#rt .titleband b, #rt .hud .bars, #rt .hud-btns")].map((e) => e.getBoundingClientRect()).filter((x) => x.height); return rr.length ? Math.min(...rr.map((x) => x.top)) : null; });
    if (hud == null || hud < 54) bad.push("the real-time screen's top starts at " + hud + " px, under the island");
    bad.push(...errs); await close();
  }
  {
    const { pg, close } = await open({ device: "iPhone 15" }); // Safari with its own bars: the page does not reach the top of the screen
    const sat = await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sat").trim());
    if (sat === "54px") bad.push("--sat set to 54px when the page does not fill the screen");
    await close();
  }
  {
    const { pg, close } = await open({ device: "laptop", ctx: { viewport: { width: 393, height: 852 }, screen: { width: 393, height: 852 }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36", isMobile: true, hasTouch: true } });
    const sat = await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sat").trim());
    if (sat === "54px") bad.push("--sat set to 54px on an Android phone");
    await close();
  }
  return bad;
});
browser("resume-first", "d037303", "paused menus put Resume first (real-time Pause, and Orders/Aid carry a Resume ▶); in Hindi too", async () => {
  const bad = [];
  for (const lang of ["en", "hi"]) {
    const { pg, errs, close } = await open({ device: "iPhone 15", lang });
    await fight(pg, "e_guard", { path: "charioteer" });
    await pg.tap('#rt [data-act="pause"]'); await pg.waitForTimeout(400);
    const r = await pg.evaluate(() => { const s = document.querySelector("#rt .pause-sheet"); const b = s && [...s.querySelectorAll("button")].filter((x) => x.offsetWidth); return { open: !!(s && !s.hidden), first: b && b[0] && b[0].textContent.trim(), close: !!(b && b[0] && b[0].hasAttribute("data-close")), paused: K.UI.rtScreen().paused }; });
    if (!r.open || !r.paused) bad.push(lang + ": Pause did not open a paused menu");
    if (!r.close) bad.push(lang + ": the paused menu's first button is " + JSON.stringify(r.first) + ", not Resume");
    await pg.tap("#rt .pause-sheet [data-close]"); await pg.waitForTimeout(300);
    if (await pg.evaluate(() => K.UI.rtScreen().paused)) bad.push(lang + ": Resume did not resume");
    for (const which of ["orders", "aid"]) {
      await pg.tap('#rt [data-act="' + which + '"]'); await pg.waitForTimeout(400);
      const rb = await pg.evaluate((w) => { const s = document.querySelector("#rt ." + w + "-sheet"); return !!(s && !s.hidden && s.querySelector("[data-close], .resume")); }, which);
      if (!rb) bad.push(lang + ": the " + which + " menu has no Resume");
      await pg.evaluate((w) => { const b = document.querySelector("#rt ." + w + "-sheet [data-close], #rt ." + w + "-sheet .resume"); if (b) b.click(); }, which); await pg.waitForTimeout(300);
    }
    bad.push(...errs.map((e) => lang + ": " + e)); await close();
  }
  return bad;
});
browser("withdraw-hindi-ui", "dd0000c", "in Hindi the real-time screen's Withdraw reads \"लड़ाई छोड़ो\", and on the war day it differs from the Fall back order", async () => {
  const bad = [];
  const { pg, errs, close } = await open({ device: "iPhone 15", lang: "hi" });
  await fight(pg, "e_guard", { path: "charioteer" });
  const w = await pg.evaluate(() => (document.querySelector("#rt .hb.withdraw") || {}).textContent);
  if (w !== "लड़ाई छोड़ो") bad.push("real-time Withdraw reads " + JSON.stringify(w));
  await fight(pg, "e_day16", { path: "archer" });
  const place = await pg.$("#rt [data-place]"); if (place) { await place.tap(); await pg.waitForTimeout(600); }
  await pg.evaluate(() => { const b = document.querySelector('#rt [data-wact="company"]'); if (b) b.click(); }); await pg.waitForTimeout(500);
  const txt = await pg.evaluate(() => { const s = document.querySelector("#rt .company-sheet"); return s ? [...s.querySelectorAll("button")].map((b) => b.textContent.trim()) : []; });
  const fb = txt.filter((t) => /पीछे हटो/.test(t) && !/लड़ाई/.test(t)), wd = txt.filter((t) => /लड़ाई छोड़ो/.test(t));
  if (txt.length && fb.length && wd.length && fb.some((t) => wd.includes(t))) bad.push("Fall back and Withdraw read the same: " + txt.join(" | "));
  if (txt.some((t) => /^पीछे हटो/.test(t)) && txt.filter((t) => /^पीछे हटो/.test(t)).length > 1) bad.push("two Company buttons read पीछे हटो: " + txt.join(" | "));
  await close(); return bad.concat(errs);
});
browser("fight-gives-way", "0684976", "a fight still on screen gives way to a new one: one fight screen at a time", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  await fight(pg, "e_bandits", { act: 5, age: 38, wait: 500 });
  await fight(pg, "e_guard", { wait: 500 });
  await fight(pg, "e_day16", { path: "archer", wait: 800 });
  const n = await pg.evaluate(() => ({ rt: document.querySelectorAll("#rt").length, live: !!K.UI.rtScreen(), war: !!K.UI.warScreen() }));
  const bad = [];
  if (n.rt !== 1) bad.push(n.rt + " fight screens on the page");
  if (n.live) bad.push("the real-time screen is still running under the war-day screen");
  if (!n.war) bad.push("the war-day screen did not open");
  await close(); return bad.concat(errs);
});

const WRITTEN = "You fought with all you had. What is written was not yours to stop.";
browser("lose-lived-rt", "42873f9", "a real-time loss in story mode: you slump, the foes walk off, the .written card says what is written held, and Continue ends the fight as a loss", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  await fight(pg, "e_bandits", { act: 5, age: 38, storyMode: true });
  await pg.evaluate(() => { const p = K.Combat.player(); p.hp = 0; });
  const card = await pg.waitForSelector("#rt .written", { timeout: 8000 }).catch(() => null);
  const bad = [];
  if (!card) { await close(); return ["no .written card after a loss in story mode"].concat(errs); }
  const r = await pg.evaluate(() => ({ text: document.querySelector("#rt .written p").textContent, slumped: !!document.querySelector("#rt .slumped"), foes: [...K.UI.rtScreen().actors.values()].filter((a) => a.u.side === "enemy" && a.u.hp > 0).map((a) => a.el.style.visibility) }));
  if (r.text !== WRITTEN) bad.push("the card says " + JSON.stringify(r.text));
  if (!r.slumped) bad.push("you are not drawn slumped");
  if (r.foes.some((v) => v !== "hidden")) bad.push("the foes did not walk off: " + r.foes.join(","));
  await pg.tap("#rt .written .go");
  await pg.waitForTimeout(500);
  const ended = await pg.evaluate(() => window.__ended);
  if (ended !== "lose") bad.push("Continue ended the fight as " + JSON.stringify(ended) + ", not a loss");
  await close(); return bad.concat(errs);
});
browser("lose-lived-warday", "42873f9", "on the war day, a loss that is lived through (story mode) ends on the card that says what is written held", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  await fight(pg, "e_day16", { path: "archer", storyMode: true });
  const place = await pg.$("#rt [data-place]"); if (place) { await place.tap(); await pg.waitForTimeout(600); }
  await pg.evaluate(() => { const B = K.Combat.state(); K.Combat.player().hp = 0; K.Combat.settle("lose"); K.UI.renderBattle(B); });
  const card = await pg.waitForSelector("#rt .endcard", { timeout: 8000 }).catch(() => null);
  const bad = [];
  if (!card) bad.push("no end card after the loss");
  else { const t = await pg.evaluate(() => document.querySelector("#rt .endcard").textContent); if (!t.includes(WRITTEN)) bad.push("the end card says " + JSON.stringify(t.slice(0, 120))); }
  await close(); return bad.concat(errs);
});
browser("stealth-upright", "42873f9", "stealth: the sneak pose and the creep in the stealth test stay upright (the body turned 8 degrees at most; was 19-20, a plank-like lean)", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  const pose = await pg.evaluate(() => {
    const U = K.UI, host = document.createElement("div"); host.style.cssText = "position:fixed;left:0;top:0;width:393px;height:300px;z-index:99999"; document.body.appendChild(host);
    host.innerHTML = '<div class="act">' + U.puppet(K.puppetSpec(Object.assign(K.newLife(), { name: "T", age: 12, act: 1, origin: "panchala" })), { h: 160, pose: "live" }) + "</div>";
    const rig = U.rig(host.querySelector("svg"), host.firstChild, "sneak"); if (!rig) return null;
    rig.set("sneak", 600, 0.6, true); const rot = rig.t.rot; rig.stop(); host.remove(); return rot;
  });
  if (pose == null) bad.push("no live rig for the sneak pose"); else if (Math.abs(pose) > 8) bad.push("the sneak pose turns the body " + pose + " degrees");
  // The tag game by the princes' garden (a1_princes, a test of stealth on its painting): creep, freeze, and sample the body's turn.
  await pg.evaluate(() => { const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "hastinapura", temperament: "bold", heirloom: "bow", age: 8, act: 1 })); S.seen.push("a1_princes"); S.scene = "a1_princes"; K.seed(2); K.resume(S); });
  await pg.waitForTimeout(1500);
  const ch = await pg.$("#choice-bhima"); if (!ch) { await close(); return bad.concat(["no tag-game choice on a1_princes"]); }
  await ch.click(); await pg.waitForTimeout(1500);
  for (let i = 0; i < 6 && !(await pg.$(".sneakway .me .pp-body")); i++) { const b = await pg.$(".trial button.cta:not([disabled]), .trial [data-go]"); if (b) await b.click().catch(() => {}); await pg.waitForTimeout(700); }
  const rots = [];
  const sample = async (ms) => { for (let t = 0; t < ms; t += 100) { rots.push(await pg.evaluate(() => { const b = document.querySelector(".sneakway .me .pp-body"); const m = b && /rotate\((-?[\d.]+)deg\)/.exec(b.style.transform || ""); return m ? +m[1] : null; })); await pg.waitForTimeout(100); } };
  await pg.keyboard.down(" "); await sample(2200); await pg.keyboard.up(" "); await sample(800);
  const got = rots.filter((x) => x != null);
  if (got.length < 10) bad.push("the stealth test's figure was not seen creeping (" + got.length + " samples)");
  else if (Math.max(...got.map(Math.abs)) > 8) bad.push("the stealth creep turns the body up to " + Math.max(...got.map(Math.abs)).toFixed(1) + " degrees");
  await close(); return bad.concat(errs);
});

browser("sling-strikes", "f260616", "an arm wound: in a fight the arm comes out of the sling and your blows reach the foe (it stayed bound, the weapon upside down, and every blow fell short); the strap is still worn", async () => {
  const bad = [];
  for (const device of ["laptop", "iPhone 15"]) {
    const { pg, errs, close } = await open({ device });
    await fight(pg, "e_bandits", { path: "mace", injuries: ["arm"] });
    const me = await pg.evaluate(() => { const a = K.UI.rtScreen().actors.get(K.Combat.player().uid), c = a && a.svg.getAttribute("class"); return a ? { sling: /\bsling\b/.test(c), fighting: /\bfighting\b/.test(c), strap: !!a.svg.querySelector('path[stroke="#efe2c0"]') } : null; });
    if (!me || !me.sling) bad.push(device + ": the wounded arm is not drawn in a sling (" + JSON.stringify(me) + ")");
    else { if (!me.fighting) bad.push(device + ": the fight's figure is not marked .fighting"); if (!me.strap) bad.push(device + ": the sling's strap is gone"); }
    // Walk up to the nearest foe and strike, as tests/blowfit.js does; then every blow of yours measured lands inside what it strikes.
    await pg.evaluate(() => { const V = K.UI.rtScreen(), R = V.R, p = K.Combat.player(); clearInterval(window.__drv);
      window.__drv = setInterval(() => { if (!K.UI.rtScreen() || R.over) return clearInterval(window.__drv); p.hp = p.maxHp;
        const foes = R.B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.rt && u.rt.entered); foes.forEach((u) => { u.hp = Math.max(u.hp, Math.ceil(u.maxHp * 0.5)); });
        const reach = (u) => (p.rt.reach - 0.25 * K.RT.BODY * Math.abs(u.rt.lane - p.rt.lane)) * 0.9, f = foes.sort((a, b) => Math.abs(a.rt.x - p.rt.x) - reach(a) - (Math.abs(b.rt.x - p.rt.x) - reach(b)))[0]; if (!f) return;
        if (Math.abs(f.rt.x - p.rt.x) <= reach(f)) { V.held.l = V.held.r = false; V.walk = null; V.queue.strike = true; } else if (!V.walk) V.walk = { foe: f.uid }; }, 50); });
    await pg.waitForTimeout(8000);
    const r = await pg.evaluate(() => { clearInterval(window.__drv); const p = K.Combat.player(), mine = (K.UI.rtScreen().impacts || []).filter((m) => m.by === p.uid && m.res); return { n: mine.length, out: mine.filter((m) => !m.res.inside).map((m) => m.res.on + " at " + m.t.toFixed(1) + "s") }; });
    if (r.n < 2) bad.push(device + ": too few of your blows measured (" + r.n + ")");
    if (r.out.length) bad.push(device + ": " + r.out.length + " of your " + r.n + " blows fell short of what they struck (" + r.out.slice(0, 4).join(", ") + ")");
    bad.push(...errs.map((e) => device + ": " + e)); await close();
  }
  return bad;
});
browser("retry-slump", "40d1128", "a deadly real-time fight lost the first time: you slump (not fall) while Try again is offered; giving up falls you, or in story mode the foes leave and the line shows", async () => {
  const bad = [];
  for (const story of [false, true]) {
    const tag = story ? "story mode: " : "";
    const { pg, errs, close } = await open({ device: "iPhone 15" });
    await fight(pg, "e_guard", { path: "charioteer", storyMode: story });
    if (!(await pg.evaluate(() => K.Combat.state().enc.lethal))) bad.push("e_guard is not deadly now: pick another deadly real-time fight");
    await pg.evaluate(() => { K.Combat.player().hp = 0; });
    const sheet = await pg.waitForSelector("#rt .pause-sheet [data-retry]", { timeout: 8000 }).catch(() => null);
    if (!sheet) { bad.push(tag + "no Try again after the first loss"); await close(); continue; }
    const me = await pg.evaluate(() => { const a = K.UI.rtScreen().actors.get(K.Combat.player().uid); return a ? { slumped: a.el.classList.contains("slumped"), dead: a.el.classList.contains("dead") } : null; });
    if (!me || !me.slumped || me.dead) bad.push(tag + "while Try again is offered you are drawn " + JSON.stringify(me) + ", not slumped");
    if (!(await pg.$("#rt .pause-sheet [data-accept]"))) { bad.push(tag + "no way to give up beside Try again"); await close(); continue; }
    await pg.tap("#rt .pause-sheet [data-accept]");
    if (story) {
      const w = await pg.waitForSelector("#rt .written", { timeout: 8000 }).catch(() => null);
      if (!w) bad.push(tag + "giving up did not show the line that what is written held");
      else { const t = await pg.evaluate(() => document.querySelector("#rt .written p").textContent); if (t !== WRITTEN) bad.push(tag + "the line reads " + JSON.stringify(t)); }
    } else {
      await pg.waitForTimeout(400);
      const after = await pg.evaluate(() => { const V = K.UI.rtScreen(); const a = V && V.actors.get(K.Combat.player().uid); return a ? { slumped: a.el.classList.contains("slumped"), dead: a.el.classList.contains("dead") } : { gone: true }; });
      if (!after.gone && !after.dead) bad.push("giving up: you are not drawn fallen (" + JSON.stringify(after) + ")");
      if (await pg.$("#rt .written")) bad.push("giving up outside story mode shows the story-mode line");
    }
    bad.push(...errs.map((e) => tag + e)); await close();
  }
  return bad;
});

// ======================= Run =======================
(async () => {
  const only = arg("--case", ""), want = only ? new Set(only.split(",")) : null;
  let list = CASES.filter((c) => !want || want.has(c.id));
  if (has("--engine-only")) list = list.filter((c) => c.kind === "engine");
  if (has("--browser-only")) list = list.filter((c) => c.kind === "browser");
  if (has("--list")) { for (const c of CASES) console.log(c.kind.padEnd(8) + c.id.padEnd(24) + c.commit + "  " + c.what); return; }
  if (want) for (const id of want) if (!CASES.some((c) => c.id === id)) { console.error("no case " + id); process.exit(2); }
  fs.mkdirSync(OUT, { recursive: true });
  const known = H.knownFailures("bugs");
  const results = [];
  if (list.some((c) => c.kind === "browser")) {
    PW = H.pw(); if (!PW) { console.error("Playwright is not installed"); process.exit(2); }
    BROWSER = await PW.chromium.launch(); SRV = await H.serve(GAME_DIR);
  }
  for (const c of list) {
    const t = Date.now();
    let probs;
    try { probs = await Promise.race([Promise.resolve(c.fn()), new Promise((_, no) => setTimeout(() => no(new Error("timed out after 120 s")), 120000))]); } catch (e) { probs = ["threw: " + String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")]; }
    probs = (probs || []).filter(Boolean);
    const k = known.find((x) => x.match === c.id);
    const status = probs.length ? (k ? "known" : "fail") : "pass";
    results.push({ id: c.id, kind: c.kind, commit: c.commit, status, problems: probs, ms: Date.now() - t, bug: k ? k.bug : undefined });
    console.log((status === "pass" ? "ok    " : status === "known" ? "KNOWN " : "FAIL  ") + c.id.padEnd(24) + (c.commit + "  ").padEnd(10) + c.what + "  (" + ((Date.now() - t) / 1000).toFixed(1) + " s)");
    for (const p of probs.slice(0, 8)) console.log("        " + String(p).slice(0, 240));
  }
  if (BROWSER) await BROWSER.close(); if (SRV) await SRV.close();
  for (const k of known) { const r = results.find((x) => x.id === k.match); if (r && r.status === "pass") console.log("  note: known failure " + k.match + " passes now (take it off tests/known_failures.json)"); }
  const fails = results.filter((r) => r.status === "fail");
  console.log(results.length + " bug checks: " + results.filter((r) => r.status === "pass").length + " pass, " + fails.length + " fail, " + results.filter((r) => r.status === "known").length + " known");
  const J = arg("--json", ""); if (J) fs.writeFileSync(J, JSON.stringify({ results, failed: fails.map((r) => r.id), browserFailed: fails.filter((r) => r.kind === "browser").map((r) => r.id) }, null, 1));
  process.exit(fails.length ? 1 : 0);
})();
