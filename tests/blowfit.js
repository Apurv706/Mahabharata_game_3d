/* Blows that land (owner, 4 November: "keep some space for the weapons to strike each other"): in real time, on an
   iPhone 15 and a 1366x657 laptop (FIGHTS: every kind of weapon), the foes come and fight you and you fight back; at the moment each melee blow lands
   the weapon's tip lies within the body it strikes (the torso), or on the shield or the weapon that meets it when the
   one struck is guarding (a weapon held behind the body parries nothing); and two who fight stand at least 0.8 of the striker's reach apart (no side by side; a
   blow across a row reaches a quarter body less).
   Fights: guards and soldiers with spears (you with a spear, the charioteer's), a sword and a bow-bearer (you with a sword, the
   strategist's), bandits with clubs (you with a mace, or a dagger).
   Usage: node tests/blowfit.js [--shots DIR]   (needs Playwright) */
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
let pw; try { pw = require("playwright"); } catch (e) { try { pw = require("/usr/local/lib/node_modules_global/playwright"); } catch (e2) { console.error("Playwright is not installed"); process.exit(2); } }
const ROOT = path.join(__dirname, "..");
const SHOTS = (process.argv.indexOf("--shots") > 0 && process.argv[process.argv.indexOf("--shots") + 1]) || "";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".json": "application/json", ".mp3": "audio/mpeg" };
const DEVICES = [{ name: "iPhone 15", w: 393, h: 852, mobile: true }, { name: "Laptop 1366x657", w: 1366, h: 657, mobile: false }];
// Every weapon a blow is struck with (owner, 4 November): your sword (cuts and a thrust) on a sword and a bow-bearer, your mace
// (smash and sweep) and your dagger (stabs) on clubs, your spear and your soldiers' spear thrusts (e_guard), a foe's mace on you.
// The charioteer holds a spear (10 November); the sword is the strategist's (unless the spear was chosen at a2_weapon).
const FIGHTS = [{ enc: "e_guard", path: "charioteer" }, { enc: "e_bandits", path: "mace" }, { enc: "e_bandits", path: "healer", noClash: true }, { enc: "fs_sk_mace", path: "strategist" }].filter((F) => !process.env.FIGHT || process.env.FIGHT.split(",").includes(F.enc + ":" + F.path));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// In the page: keep you standing, and (phase 2) walk you up to the nearest foe and strike, a foe now and then guarding.
function drive(phase) {
  const V = K.UI.rtScreen(), R = V.R, p = K.Combat.player();
  clearInterval(window.__drv);
  window.__drv = setInterval(() => {
    if (!K.UI.rtScreen() || R.over) return clearInterval(window.__drv);
    p.hp = p.maxHp; V.paused = !!window.__hold && !!window.__held;
    // A shield-carrier raises the shield (Block) as a blow is about to land on him, and lowers it after.
    if (R.blocker) V.held.block = R.B.units.some((u) => u.side === "enemy" && u.rt && u.rt.atk && !u.rt.atk.ranged && u.rt.atk.on === p.uid && u.rt.atk.land - R.t < 0.25);
    if (phase !== 2 || V.paused) { V.held.l = V.held.r = false; return; }
    const foes = R.B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.rt && u.rt.entered);
    foes.forEach((u) => { u.hp = Math.max(u.hp, Math.ceil(u.maxHp * 0.5)); }); // the fight goes on for the checks
    const rows = (u) => Math.abs(u.rt.lane - p.rt.lane), reach = (u) => (p.rt.reach - 0.25 * K.RT.BODY * rows(u)) * 0.9;
    const f = foes.sort((a, b) => Math.abs(a.rt.x - p.rt.x) - reach(a) - (Math.abs(b.rt.x - p.rt.x) - reach(b)))[0]; if (!f) return;
    const d = f.rt.x - p.rt.x;
    if (Math.abs(d) <= reach(f)) { V.held.l = V.held.r = false; V.walk = null; V.queue.strike = true;
      const fa = V.actors.get(f.uid); if (fa && fa.rig && (window.__guardEvery = (window.__guardEvery || 0) + 1) % 30 === 0) { fa.rig.set("guard", 900, 0.55); setTimeout(() => fa.rig.pose === "guard" && fa.rig.set(fa.base, 520, 0.42), 450); } }
    else if (!V.walk) V.walk = { foe: f.uid }; // walking up to him as a click on him does (it stops at your reach, frame by frame)
  }, 50);
}
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); if (f.endsWith("/")) f += "index.html"; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); r.end(d); }); });
srv.listen(0, async () => {
  const port = srv.address().port, b = await pw.chromium.launch();
  let fails = 0, n = 0;
  for (const dev of DEVICES) for (const F of (process.env.WARONLY ? [] : FIGHTS)) {
    const ctx = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.mobile ? 2 : 1, isMobile: dev.mobile, hasTouch: dev.mobile });
    const pg = await ctx.newPage(); const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
    await pg.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
    await pg.goto("http://localhost:" + port + "/index.html?rt=1"); await pg.waitForTimeout(400);
    await pg.evaluate((F) => { const S = K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 30, act: 6, path: F.path, side: "pandava", teacher: "drona" }); S.attrs.might = 3; S.attrs.grace = 3; S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1; K.seed(5); K.UI.startRealtime(F.enc, () => {});
      // Screenshots: hold the screen still at a chosen moment (a blow on the body, a clash, a foe at reach).
      const imp = K.UI.blowImpact; K.UI.blowImpact = function (aim) { const r = imp(aim); if (r && window.__hold && !window.__held && (window.__hold === "body" ? r.on === "body" && r.inside : window.__hold === "clash" ? r.on !== "body" && r.inside : false)) { window.__held = r.on; K.UI.rtScreen().paused = true; K.UI.rigFreeze(1e9); setTimeout(() => document.getAnimations().forEach((a) => a.pause()), 0); } return r; }; }, F);
    await pg.waitForTimeout(100);
    const tag = dev.name + " " + F.enc + " (" + F.path + ")";
    const shot = async (name) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, (dev.name + "_" + F.enc + "_" + name).replace(/\W+/g, "_") + ".png") }); };
    const thaw = () => pg.evaluate(() => { window.__hold = null; window.__held = null; K.UI.rigs.thaw(); document.getAnimations().forEach((a) => a.play()); K.UI.rtScreen().paused = false; });
    const hold = async (kind, ms) => { await pg.evaluate((k) => { window.__hold = k; window.__held = null; }, kind); for (let t = 0; t < ms; t += 50) { if (await pg.evaluate(() => !!window.__held)) { await pg.waitForTimeout(30); await shot(kind); await thaw(); return true; } await sleep(50); } await thaw(); return false; };
    // Phase 1: you stand; the foes come to you and fight.
    await pg.evaluate(drive, 1);
    if (SHOTS) { // a foe at his reach, winding up a blow on you
      for (let t = 0; t < 6000; t += 50) { if (await pg.evaluate(() => { const V = K.UI.rtScreen(), p = K.Combat.player(); return V.R.B.units.some((u) => u.side === "enemy" && u.rt && u.rt.atk && !u.rt.atk.ranged && u.rt.atk.on === p.uid && Math.abs(u.rt.lane - p.rt.lane) < 0.1 && (u.rt.atk.land - V.R.t) < 0.2); })) { await shot("engaged"); break; } await sleep(50); }
      await hold("body", 6000);
    } else await pg.waitForTimeout(6000);
    const t2 = await pg.evaluate(() => K.UI.rtScreen().R.t);
    // Phase 2: you walk up to the nearest foe and strike; now and then he guards.
    await pg.evaluate(drive, 2);
    if (SHOTS) { await hold("clash", 7000); await hold("body", 2500); } else await pg.waitForTimeout(7000);
    const res = await pg.evaluate(([t2, F]) => {
      const V = K.UI.rtScreen(), out = [], p = K.Combat.player(), list = V.impacts || [];
      clearInterval(window.__drv);
      let body = 0, clash = 0, mine = 0, minRatio = 9;
      for (const m of list) {
        const who = m.by + "→" + m.on + " at " + m.t.toFixed(1) + "s";
        if (!m.res) { out.push("a blow without a measured contact: " + who); continue; }
        if (!m.res.inside) out.push("the tip missed the " + m.res.on + " (" + who + "): tip " + Math.round(m.res.x) + "," + Math.round(m.res.y) + " box " + [m.res.box.l, m.res.box.r, m.res.box.t, m.res.box.b].map(Math.round).join(","));
        if (m.guard === "shield" && m.res.on === "body") out.push("a blow on a raised shield fell on the body (" + who + ")");
        if (m.res.on === "body") body++; else clash++;
        if (m.by === p.uid) mine++;
        // Two who fight: at least 0.8 of the striker's reach apart (less a quarter body for each row between): the foe coming to you, you walking up to him.
        const engaged = m.by === p.uid || (m.on === p.uid && m.t < t2);
        if (engaged && m.apart != null && m.reach) { m.reach -= 0.25 * K.RT.BODY * m.rows; minRatio = Math.min(minRatio, m.apart / m.reach); if (m.apart < 0.8 * m.reach - 1e-6) out.push("side by side: " + who + " " + (m.apart / m.reach).toFixed(2) + " of the reach apart"); }
      }
      if (body < 2) out.push("too few blows on the body (" + body + ")");
      if (clash < 1 && !F.noClash) out.push("no blow met a shield or a weapon"); // (clubs and a dagger: no shield, no blade to cross)
      if (mine < 2) out.push("too few of your blows landed (" + mine + ")");
      return { problems: out, body, clash, mine, n: list.length, minRatio: minRatio === 9 ? null : +minRatio.toFixed(2) };
    }, [t2, F]);
    const probs = res.problems.concat(errs.map((e) => "script error: " + e));
    n++; if (probs.length) fails++;
    console.log((probs.length ? "✗ " : "ok ") + tag + ": " + res.n + " blows (" + res.body + " on the body, " + res.clash + " on a shield or a weapon, " + res.mine + " yours), closest " + res.minRatio + " of the reach" + (probs.length ? "\n    " + probs.join("\n    ") : ""));
    await ctx.close();
  }
  // The war-day screen (ui/warday.js): blows struck across the gap land on the body, the shield or the weapon too.
  // (Since Build B a war day's blows are fought in the real-time clash after your move, measured above as real time; the
  // war-day screen strikes its own blows with Fights: turn-based, so that is set here.)
  for (const dev of DEVICES) {
    const ctx = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: dev.mobile ? 2 : 1, isMobile: dev.mobile, hasTouch: dev.mobile });
    const pg = await ctx.newPage(); const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
    await pg.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
    await pg.goto("http://localhost:" + port + "/index.html?rt=1"); await pg.waitForTimeout(400);
    await pg.evaluate(() => { const S = K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 30, act: 6, path: "mace", side: "pandava", teacher: "drona" }); S.attrs.might = 3; S.attrs.grace = 3; S.flags.push("role_front"); S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1; K.prefs({ fights: "turns" }); K.seed(3); K.UI.startBattle("e_ring", () => {}); });
    await pg.waitForTimeout(2600);
    await pg.evaluate(() => { const b = document.querySelector('#rt [data-place="front"]'); if (b) b.click(); }); await pg.waitForTimeout(800);
    for (let i = 0; i < 8; i++) { await pg.evaluate(() => { const p = K.Combat.player(); if (p) { p.maxHp = Math.max(p.maxHp, 9999); p.hp = p.maxHp; } K.Combat.state().units.forEach((u) => { if (u.side === "enemy") u.hp = Math.max(u.hp, u.maxHp * 0.6); }); const b = document.querySelector('#rt [data-move="strike"]:not([disabled])') || document.querySelector("#rt [data-move]:not([disabled])"); if (b) b.click(); }); await pg.waitForTimeout(1800); }
    const r = await pg.evaluate(() => { const V = K.UI.warScreen(), list = (V && V.impacts) || [], out = []; for (const m of list) if (!m.res.inside) out.push("war day: the tip missed the " + m.res.on + " (" + m.by + "→" + m.on + "): tip " + Math.round(m.res.x) + "," + Math.round(m.res.y) + " box " + [m.res.box.l, m.res.box.r, m.res.box.t, m.res.box.b].map(Math.round).join(",")); if (list.length < 2) out.push("war day: too few melee blows measured (" + list.length + ")"); return { out, n: list.length, clash: list.filter((m) => m.res.on !== "body").length, log: K.Combat.state() ? K.Combat.state().log.slice(-12).map((l) => l.key || l.raw || "").join(" | ") : "" }; });
    const probs = r.out.concat(errs.map((e) => "script error: " + e)); n++; if (probs.length) fails++;
    console.log((probs.length ? "✗ " : "ok ") + dev.name + " war day e_ring (mace): " + r.n + " blows measured (" + r.clash + " on a shield or a weapon)" + (probs.length ? "\n    " + probs.join("\n    ") : ""));
    await ctx.close();
  }
  console.log((n - fails) + "/" + n + " fights land their blows");
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
});
