/* Review of the story's pictures and the life's keeping (the owner's checklist, 4 November):
     art-engine     1  every scene shows a painting for every life that reaches it (random lives through the engine, and
                       each scene with its art function asked again for every homeland, side and court): never none
     art-parts      1  in both built play parts (tools/split/build.js, each served from its own file map): every scene,
                       resumed in its part with a life that reached it, has a painting behind it that loads, upright on an
                       iPhone 15 and wide on a laptop; every moment's painting (a vow, a divine weapon, a friend...) is in
                       both parts
     fight-grounds  1  every fight's ground loads on its screen (real-time, war-day or the old one) in its part, upright and wide
     checkpoints   12  a life keeps the start of every act it reaches; a death is written in the Book of Lives and stays
                       there after going back to the start of the act; going back takes up the life as it was; the ending
                       fills the screen
   Usage: node tests/review_story.js [--case id,id] [--lives N=300] [--engine-only] [--list] [--json FILE]
   Exits 1 when a case fails. */
"use strict";
const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const L = require("./review_lib");
const H = L.H;
const { arg } = H;
const T = L.suite("review_story", "tests/review_story.js: pictures in every scene and the keeping of a life");
const { engine, browser } = T;
const sleep = L.sleep;
const OUT = path.join(H.SCRATCH, "review_story");
const LIVES = parseInt(arg("--lives", "300"), 10);

let K = null;
const E = () => (K = K || H.engine({ hindi: true }));
const artFor = (sc, S) => { const a = K.val(sc.art, S); if (a === "origin") return S.origin === "suta" && !S.flags.includes("moved_capital") ? "home_anga" : "home_" + S.origin; return a; };
// Random lives through the engine: the first two lives to reach each scene (as save states) and the act each fight is met in.
let seen = null;
function lives() {
  if (seen) return seen;
  const K = E(); K.lang = "en"; K.RT.force = false;
  const at = {}, fights = {}, noArt = new Map();
  const pick = (a) => a[Math.floor(K.rng() * a.length)];
  for (let i = 0; i < LIVES; i++) {
    K.seed(7919 + i * 13);
    const S = (K.S = K.newLife()); if (K.momentQueue) K.momentQueue.length = 0;
    S.name = "Ira"; S.pronoun = pick(["she", "he", "they"]); S.origin = pick(Object.keys(K.ORIGINS)); S.temperament = pick(Object.keys(K.TEMPERAMENTS)); S.heirloom = pick(Object.keys(K.HEIRLOOMS));
    S.storyMode = K.rng() < 0.2; S.lifeId = "L" + i;
    K.apply(K.ORIGINS[S.origin].fx); K.apply(K.TEMPERAMENTS[S.temperament].fx); K.apply(K.HEIRLOOMS[S.heirloom].fx);
    K.apply({ flag: ["origin_" + S.origin, "temper_" + S.temperament, "heir_" + S.heirloom] });
    try { K.go(K.FIRST_SCENE); } catch (e) { continue; }
    for (let step = 0; step < 700; step++) {
      const sc = K.SCENES[K.S.scene];
      if (!sc) break;
      if (!sc.ending) {
        let a; try { a = artFor(sc, K.S); } catch (e) { a = "throws: " + e.message; }
        if (typeof a !== "string" || !a) { const k = sc.id; if (!noArt.has(k)) noArt.set(k, { act: K.S.act, origin: K.S.origin, side: K.S.side, got: a }); }
        (at[sc.id] = at[sc.id] || []).length < 2 && at[sc.id].push(JSON.stringify(K.S));
      }
      if (sc.ending) break;
      const list = K.choiceList(sc).filter((x) => x.ok);
      if (!list.length) break;
      const { c } = pick(list);
      let res; try { res = c.game ? K.choose(sc, c, pick(["win", "close", "lose"])) : K.choose(sc, c); } catch (e) { break; }
      let next = res.next;
      if (res.combat) {
        (fights[res.combat] = fights[res.combat] || new Set()).add(K.S.act);
        try { next = K.combatOutcome(res.combat, K.rng() < 0.55 ? "win" : "lose", res.next).next; } catch (e) { break; }
      }
      if (!K.S.alive) next = "end_death";
      try { K.go(next); } catch (e) { break; }
    }
  }
  seen = { at, fights, noArt };
  return seen;
}

engine("art-engine", "every scene shows a painting for every life that reaches it, and for every homeland, side and court", () => {
  const K = E(), bad = [];
  const { at, noArt } = lives();
  for (const [id, x] of noArt) bad.push("scene " + id + " (act " + x.act + ", " + x.origin + ", " + (x.side || "no side") + ") has no painting: " + JSON.stringify(x.got));
  // Each scene reached, asked again for every homeland, side and court.
  for (const [id, states] of Object.entries(at)) {
    const sc = K.SCENES[id];
    if (typeof sc.art !== "function" && sc.art !== "origin") continue;
    const S0 = JSON.parse(states[0]);
    const vars = [];
    for (const o of Object.keys(K.ORIGINS)) vars.push(Object.assign({}, S0, { origin: o, flags: S0.flags.filter((f) => !/^origin_/.test(f)).concat("origin_" + o) }));
    for (const side of ["pandava", "kaurava", "neutral", null]) vars.push(Object.assign({}, S0, { side }));
    for (const court of Object.keys(K.COURTS || {}).concat(null)) vars.push(Object.assign({}, S0, { court }));
    for (const v of vars) { let a; const keep = K.S; K.S = v; try { a = artFor(sc, v); } catch (e) { a = null; } K.S = keep; if (typeof a !== "string" || !a) { bad.push("scene " + id + " has no painting for a life from " + v.origin + ", side " + v.side + ", court " + v.court); break; } }
  }
  const unreached = Object.keys(K.SCENES).filter((id) => !at[id] && !K.SCENES[id].ending);
  if (unreached.length > 25) bad.push(unreached.length + " scenes not reached by " + LIVES + " lives (more lives, or a wiring problem): " + unreached.slice(0, 8).join(", "));
  return bad;
});

// Both parts, built as published, and a server for each from its own file map (a file a part lacks is a 404).
let PARTS = null;
async function parts() {
  if (PARTS) return PARTS;
  const FIX = path.join(__dirname, "fixtures", "split"), dir = path.join(OUT, "build");
  fs.rmSync(dir, { recursive: true, force: true });
  const r = cp.spawnSync(process.execPath, [path.join(H.ROOT, "tools/split/build.js"), dir, process.env.SPLIT_USE || path.join(FIX, "use.json"), process.env.SPLIT_LIVES || path.join(FIX, "act5_lives.json"), "", "", "--war=" + (process.env.SPLIT_WAR || path.join(FIX, "war_lives.json"))], { cwd: H.ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error("split build failed: " + (r.stderr || r.stdout).slice(0, 300));
  const maps = {};
  for (const n of ["1", "2"]) { maps[n] = JSON.parse(fs.readFileSync(path.join(dir, "part" + n + ".files.json"), "utf8")); maps[n]["index.html"] = path.join(dir, "part" + n, "index.html"); }
  const srv = await H.serve(null, { map: {}, extra: (rel) => { const m = rel.match(/^part([12])\/(.+)$/); return m && maps[m[1]] ? maps[m[1]][m[2]] || null : null; } });
  PARTS = { maps, srv };
  return PARTS;
}
async function partPage(n, device) {
  const P = await parts(), PW = L.pw(), B = L.browser();
  const ctx = await B.newContext(device === "laptop" ? { viewport: { width: 1440, height: 900 } } : Object.assign({}, PW.devices[device]));
  const pg = await ctx.newPage(), errs = [], misses = [];
  pg.on("pageerror", (e) => errs.push("page error: " + e.message));
  pg.on("response", (q) => { if (q.status() >= 400 && !/fonts\.g/.test(q.url())) misses.push(q.url().replace(P.srv.url, "/")); });
  await pg.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await pg.goto(P.srv.url + "part" + n + "/index.html");
  await pg.waitForFunction(() => window.K && K.UI && document.querySelector("#title-btns button"), null, { timeout: 30000 });
  await pg.evaluate(() => { K.prefs({ calm: true, living: false }); K.UI.applyCalm(); K.momentQueue.length = 0; });
  return { ctx, pg, errs, misses, close: () => ctx.close() };
}

browser("art-parts", "in both built parts, every scene has a painting behind it that loads, upright and wide; moments' paintings are in both", async () => {
  E(); const bad = [];
  const { at } = lives();
  const P = await parts();
  // Moments can play in any act: their paintings in both parts.
  for (const k of ["scene_vow", "moment_astra", "moment_teacher", "moment_marriage", "moment_friend_arjuna", "moment_friend_bhima", "moment_friend_karna", "moment_friend_duryodhana", "moment_friend_charu", "scene_yuyutsu_crossing", "scene_command_banner"]) {
    for (const n of ["1", "2"]) if (!Object.keys(P.maps[n]).some((f) => f.startsWith("art/" + k + ".") || f.startsWith("art/" + k + "_"))) bad.push("Part " + (n === "1" ? "One" : "Two") + " lacks the moment painting " + k);
  }
  for (const device of ["iPhone 15", "laptop"]) {
    for (const n of [1, 2]) {
      const { pg, errs, misses, close } = await partPage(n, device);
      const ids = Object.keys(at).filter((id) => { const a = K.SCENES[id].act || 1; return n === 1 ? a < 5 : a >= 5; });
      for (const id of ids) {
        for (const st of at[id].slice(0, device === "laptop" ? 1 : 2)) {
          const r = await pg.evaluate(async (st) => {
            K.momentQueue.length = 0;
            try { K.resume(JSON.parse(st)); } catch (e) { return { err: String(e.message) }; }
            await new Promise((r) => setTimeout(r, 30));
            const bd = document.querySelector("#backdrop .bdl.on"), url = bd && bd.dataset.url;
            if (document.querySelector("#part-code")) return { handed: true };
            if (!url) return { none: true, key: bd && bd.dataset.key, scene: K.S.scene };
            const ok = await new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = url; });
            return { url: url.replace(location.origin, ""), ok, scene: K.S.scene };
          }, st);
          if (r.err) { bad.push(device + " part " + n + " " + id + ": " + r.err); break; }
          if (r.handed) continue;
          if (r.none) bad.push(device + " part " + n + " " + id + ": no painting behind the scene (key " + JSON.stringify(r.key) + ")");
          else if (!r.ok) bad.push(device + " part " + n + " " + id + ": the painting does not load: " + r.url);
        }
      }
      for (const m of [...new Set(misses)]) if (/\/art\//.test(m)) bad.push(device + " part " + n + ": 404 " + m);
      bad.push(...errs.map((e) => device + " part " + n + ": " + e));
      await close();
    }
  }
  return [...new Set(bad)];
});

browser("fight-grounds", "every fight's ground loads on its screen in its part, upright and wide", async () => {
  const K = E(), bad = [];
  const { fights } = lives();
  const P1 = /^(act1|roots|act2|act3|act4)$/;
  const fileOf = {}; // the content file that writes each fight
  for (const f of fs.readdirSync(path.join(H.GAME, "js/content"))) { const t = fs.readFileSync(path.join(H.GAME, "js/content", f), "utf8"); for (const id of Object.keys(K.ENCOUNTERS)) if (!fileOf[id] && new RegExp("[\"(]" + id + "[\",]").test(t)) fileOf[id] = f.replace(/\.js$/, ""); }
  for (const device of ["iPhone 15", "laptop"]) {
    for (const n of [1, 2]) {
      const { pg, errs, misses, close } = await partPage(n, device);
      const ids = Object.keys(K.ENCOUNTERS).filter((id) => { const acts = fights[id] ? [...fights[id]] : [P1.test(fileOf[id] || "") ? 3 : 6]; return acts.some((a) => (n === 1 ? a < 5 : a >= 5)); });
      for (const id of ids) {
        const acts = fights[id] ? [...fights[id]] : [n === 1 ? 3 : 6];
        const act = acts.find((a) => (n === 1 ? a < 5 : a >= 5));
        const r = await pg.evaluate(async ([id, act]) => {
          const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: [0, 10, 17, 24, 30, 38, 44, 45][act], act, path: "mace", side: "pandava", teacher: "drona" }));
          S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1; K.seed(3);
          try { K.UI.startBattle(id, () => {}); } catch (e) { return { err: e.message }; }
          await new Promise((r) => setTimeout(r, 250));
          const st = document.querySelector("#rt #rt-stage, #rt .stage");
          let url = st ? (getComputedStyle(st).backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1] : null, where = st ? "screen" : null;
          if (!url) { const bd = document.querySelector("#backdrop .bdl.on"); url = bd && bd.dataset.url; where = "backdrop"; }
          if (!url) { const t = document.querySelector(".trial .cast, .boardtable, .fm-stage"); where = "own"; url = t ? (getComputedStyle(t).getPropertyValue("--stage").match(/url\('?"?([^'")]+)/) || [])[1] : null; }
          const ok = url ? await new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = url; }) : false;
          try { if (K.UI.rtScreen && K.UI.rtScreen()) K.UI.rtStop(); const B = K.Combat.state(); if (B && !B.over) K.Combat.settle("win"); K.Combat.end(); } catch (e) { /* ended */ }
          const el = document.getElementById("rt"); if (el) el.remove(); document.body.classList.remove("in-rt", "intest");
          return { url: url && url.replace(location.origin, ""), ok, where };
        }, [id, act]);
        if (r.err) bad.push(device + " part " + n + " " + id + ": " + r.err);
        else if (!r.url) bad.push(device + " part " + n + " " + id + ": no ground behind the fight");
        else if (!r.ok) bad.push(device + " part " + n + " " + id + ": the ground does not load: " + r.url + " (" + r.where + ")");
      }
      for (const m of [...new Set(misses)]) if (/\/art\//.test(m)) bad.push(device + " part " + n + ": 404 " + m);
      bad.push(...errs.map((e) => device + " part " + n + ": " + e));
      await close();
    }
  }
  return [...new Set(bad)];
});

browser("checkpoints", "act checkpoints, the Book of Lives keeps a death after going back, the ending fills the screen", async () => {
  const bad = [];
  const { pg, errs, close } = await L.open({ device: "iPhone 15", calm: true });
  // A life from its start: the first act's start is kept; on into Act III (each act start kept).
  await pg.evaluate(() => { K.store.set("kurukshetra.v2.lives", "[]"); const S = (K.S = K.newLife()); S.name = "Tara"; S.pronoun = "she"; S.origin = "panchala"; S.temperament = "bold"; S.heirloom = "bow"; K.apply({ flag: ["origin_panchala", "temper_bold", "heir_bow"] }); K.go(K.FIRST_SCENE); });
  await sleep(600);
  await pg.evaluate(() => K.go("a1_home")); await sleep(500); // waking from the dream into Act I
  const a1 = await pg.evaluate(() => (K.checkpoints() || { acts: [] }).acts.map((a) => a.act));
  if (!a1.includes(1)) bad.push("the start of Act I is not kept (" + JSON.stringify(a1) + ")");
  await pg.evaluate(() => K.go("a2_teacher")); await sleep(400);
  await pg.evaluate(() => { K.S.path = "spy"; K.go("a3_secret"); }); await sleep(400);
  const a3 = await pg.evaluate(() => (K.checkpoints() || { acts: [] }).acts.map((a) => a.act));
  for (const n of [1, 2, 3]) if (!a3.includes(n)) bad.push("the start of Act " + n + " is not kept after reaching Act III (" + JSON.stringify(a3) + ")");
  // Die in Act III (the burnt house): the ending, full-screen; the Book of Lives has it.
  await pg.evaluate(() => { K.S.flags.push("lac_inside"); K.S.alive = false; K.S.deathText = "You died in the fire."; K.go("end_death"); });
  await sleep(1500);
  const e = await pg.evaluate(() => { const el = document.querySelector(".endscreen"); if (!el) return null; const r = el.getBoundingClientRect(); return { full: r.left <= 0 && r.top <= 0 && r.right >= innerWidth - 1 && r.bottom >= innerHeight - 1, title: (el.querySelector(".es-title") || {}).textContent, book: K.lives().length, acts: [...el.querySelectorAll(".actback")].map((b) => b.dataset.act) }; });
  if (!e) { await close(); return bad.concat(["no ending screen after a death"], errs); }
  if (!e.full) bad.push("the ending " + e.title + " does not fill the screen");
  if (e.book !== 1) bad.push("the Book of Lives holds " + e.book + " lives after the death, not 1");
  if (!e.acts.includes("3")) bad.push("the ending offers no way back to the start of Act III (" + e.acts.join(",") + ")");
  // Go back to Act III (two taps when a life is in progress; here it has ended: one).
  await pg.evaluate(() => { const b = document.querySelector('.endscreen .actback[data-act="3"]'); if (b) b.click(); }); await sleep(400);
  await pg.evaluate(() => { const b = document.querySelector('.endscreen .actback.armed[data-act="3"]'); if (b) b.click(); }); await sleep(1200);
  const g = await pg.evaluate(() => ({ alive: K.S.alive, act: K.S.act, scene: K.S.scene, path: K.S.path, book: K.lives().length, end: !!document.querySelector(".endscreen"), acts: (K.checkpoints() || { acts: [] }).acts.map((a) => a.act) }));
  if (!g.alive || g.act !== 3 || !/^a3_/.test(g.scene) || g.path !== "spy") bad.push("going back to Act III opened " + JSON.stringify(g));
  if (g.end) bad.push("the ending stayed on screen after going back");
  if (g.book !== 1) bad.push("the Book of Lives lost the death after going back (" + g.book + ")");
  // The title has no Start again from an act (owner, 7 November); it keeps the Book of Lives.
  await pg.evaluate(() => K.UI.renderTitle()); await sleep(500);
  const t = await pg.evaluate(() => ({ btn: !!document.getElementById("btn-acts"), lives: !!document.getElementById("btn-lives") }));
  if (t.btn) bad.push("the title screen still offers Start again from an act (owner, 7 November: the Menu and the ending have it)");
  if (!t.lives) bad.push("the title screen has no Book of Lives");
  await close(); return bad.concat(errs);
});

T.run();
