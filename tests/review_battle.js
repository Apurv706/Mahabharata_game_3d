/* Build B's battles in the browser, played and looked at like a person (owner, 6 November: "don't want to push an untested
   product"). Playwright Chromium.
     human-war-phone     a whole war day (e_day1) on an iPhone 15, the mace path, played like a person (below): it ends; no
                         page errors; nothing stuck; the first move, Shield wall, opens the first clash with the wall up; no
                         clash ends at once with foes standing (the off-field pack of 6 November); your blows land
     human-fight-laptop  the night raid (e_ash) on a laptop, the charioteer (sword and shield), the same way
     orders-day          the commander's orders at a battle day's first scene, on an iPhone SE in Hindi, an iPhone 15 and a
                         laptop, both sides: his name, what happened, Today, Your orders; the card fits the screen (or
                         scrolls with the button in reach); "To your place" closes it; not shown again that day
     low-life            the warning below a fifth of your life (owner, 6 November): on the real-time screen, in a war day's
                         clash and on the war day's own screen; none above it
     foe-shield          a foe's shield catches your blow (owner, 6 November): "Blocked", he is lit gold while he lowers it and
                         cannot strike, and the gold goes when he can
   The person: sees the screen a quarter of a second late (a lapse of a further quarter now and then), presses with a thumb's
   or a finger's pace, parries a lit blade six times in ten, otherwise blocks (a shield-bearer) or rolls clear, strikes what
   is in reach, walks up to the next foe, takes herbs when hurt, runs to a comrade who calls, takes Try again; on a war day
   picks the front, opens with Shield wall, then mostly strikes.
   Usage: node tests/review_battle.js [--case a,b] [--json FILE] [--case-timeout S] [--list]
   Screenshots: tests/out/review_battle/. */
"use strict";
const fs = require("fs");
const path = require("path");
const { suite, open, endFight, sleep } = require("./review_lib");
const T = suite("review-battle", "Build B's battles, played like a person");
const { browser } = T;
const SHOTS = path.join(__dirname, "out", "review_battle");
fs.mkdirSync(SHOTS, { recursive: true });

// ---------- The person ----------
const READ = () => {
  const V = K.UI.rtScreen && K.UI.rtScreen(), W = K.UI.warScreen && K.UI.warScreen();
  if (V && V.R && document.getElementById("rt") && !document.getElementById("rt").classList.contains("war")) {
    const R = V.R, C = K.Combat, RT = K.RT, p = C.player();
    const foes = R.B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.rt && u.rt.entered && !u.spared);
    const living = R.B.units.filter((u) => u.side === "enemy" && u.hp > 0 && !u.spared).length;
    const near = foes.slice().sort((a, b) => Math.abs(a.rt.x - p.rt.x) - Math.abs(b.rt.x - p.rt.x))[0];
    const thr = RT.threats(R).filter((t) => t.mine || t.path).sort((a, b) => a.land - b.land), th = thr.map((t) => t.land - R.t);
    const thE = thr[0] ? R.B.units.find((u) => u.rt && u.rt.atk && Math.abs(u.rt.atk.land - thr[0].land) < 1e-6) : null;
    const call = V.el.querySelector(".cl-call"), ally = R.B.units.find((u) => u.side === "ally" && (u.person || u.called) && u.hp > 0 && u.rt);
    const box = (sel) => { const e = V.el.querySelector(sel); if (!e || e.offsetParent === null) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; };
    return { mode: "rt", t: R.t, over: R.over, clash: !!V.clash, sheet: V.sheet, written: !!V.el.querySelector(".written .go"), brief: !!V.el.querySelector(".fb-go"), tour: !!V.el.querySelector(".tc-skip"),
      hp: p.hp / p.maxHp, hpN: p.hp, x: p.rt.x, reach: p.rt.reach, weapon: p.rt.weapon, busy: p.rt.busy, blocker: !!R.blocker, block: !!R.block,
      near: near ? near.rt.x - p.rt.x : null, foes: foes.length, living, offField: R.B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.rt && u.rt.entered && (u.rt.x < 0 || u.rt.x > 1)).length, threat: th.length ? Math.min(...th) : null,
      cue: [...V.el.querySelectorAll(".actor.parry-cue")].length, thId: thE ? thE.uid + ":" + thE.rt.atk.t0.toFixed(2) : null, thRanged: !!(thE && thE.rt.atk.ranged), low: !!V.el.querySelector(".lowwarn:not([hidden])"),
      walled: !!V.walled, wallMen: (V.wallMen || []).length,
      canRoll: RT.can(R, "roll"), canBlock: RT.can(R, "block"), canHerbs: RT.can(R, "herbs"), herbs: K.S.items.herbs || 0,
      broken: !!R.broken, shieldAt: (() => { const g = RT.nearestShield ? RT.nearestShield(R, p.rt.x) : null; return g ? g.x - p.rt.x : null; })(), // a shield on the ground, while yours is broken
      call: call ? (ally ? ally.rt.x - p.rt.x : null) : null, stats: Object.assign({}, R.stats),
      btn: { strike: box(".acts .strike"), block: box('.acts [data-hold="block"]'), roll: box(".acts .roll"), l: box('.pad [data-hold="l"]'), r: box('.pad [data-hold="r"]'), retry: box("[data-retry]") } };
  }
  if (W) {
    const B = W.B, p = B.units[0];
    return { mode: "war", clashing: !!W.clashing, over: !!W.over, round: B.round, hp: p.hp / p.maxHp, hpN: p.hp,
      end: !!document.querySelector("#rt .endcard button"), brief: !!document.querySelector("#rt .fb-go"), tour: !!document.querySelector("#rt .tc-skip"), written: !!document.querySelector("#rt .written .go"),
      place: [...document.querySelectorAll("#rt [data-place]")].filter((b) => b.offsetParent !== null).length, read: !!document.querySelector("#rt .wd-read [data-rd]"),
      moves: [...document.querySelectorAll("#rt #wd-moves [data-move]:not([disabled])")].map((b) => b.dataset.move), sheet: W.sheet || null, herbs: K.S.items.herbs || 0,
      // (herbs cool down after use: a person sees them greyed in Aid and leaves them; reaching for them every turn kept
      // Aid's menu over the move cards on a phone, so every Strike tap landed on the menu: a war day that never ended)
      herbsReady: (() => { const a = K.Combat.available().find((x) => x.id === "herbs"); return !!a && !a.why; })() };
  }
  return { mode: "gone" };
};

async function playLikeAPerson(enc, dev, pathId, side, seed) {
  const { ctx, pg, errs, close } = await open({ device: dev });
  const TOUCH = dev !== "laptop", tag = enc + " (" + dev + ", " + pathId + ")";
  let rs = seed * 9973 + 7; const rnd = () => { rs = (rs * 16807) % 2147483647; return (rs - 1) / 2147483646; };
  const between = (a, b) => a + (b - a) * rnd();
  const cdp = await ctx.newCDPSession(pg);
  await pg.evaluate(async ([enc, pathId, side, seed]) => {
    const S = K.newLife(); Object.assign(S, { alive: true, act: 6, age: 44, name: "Asha", pronoun: "she", origin: "panchala", court: "panchala", path: pathId, side, teacher: "drona", temperament: "bold", heirloom: "amulet" }); K.S = S;
    S.attrs.might = 4; S.attrs.grace = 3; S.items.herbs = 2; S.skills[pathId] = 3; K.seed(seed);
    K.prefs({ calm: false, beats: false, tipParry: false, fights: "realtime" });
    K.go("a6_eve");
    for (let k = 0; k < 30; k++) { await new Promise((r) => setTimeout(r, 200)); if (document.querySelector("#choices .choice")) break; }
    window.__out = null; K.UI.startBattle(enc, (out) => { window.__out = out; });
  }, [enc, pathId, side, seed]);
  const T0 = Date.now(), LIMIT = 11 * 60 * 1000, log = [];
  const say = (s) => log.push("[" + ((Date.now() - T0) / 1000).toFixed(1) + "s] " + s);
  const KEY = { l: "a", r: "d", block: "k" };
  let held = null;
  const release = async () => { if (!held) return; if (TOUCH) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); else await pg.keyboard.up(KEY[held.k]); held = null; };
  const hold = async (k, pt) => { if (held && held.k === k) return; await release(); held = { k }; if (TOUCH) { if (pt) await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y }] }); } else await pg.keyboard.down(KEY[k]); };
  const press = async (key, pt) => { await release(); if (TOUCH && pt) await pg.touchscreen.tap(pt.x, pt.y); else await pg.keyboard.press(key); };
  const tapSel = async (sel) => { const e = await pg.$(sel); if (!e) return false; if (TOUCH) await e.tap({ timeout: 2000 }).catch(() => e.click({ timeout: 2000 }).catch(() => {})); else await e.click({ timeout: 2000 }).catch(() => {}); return true; };
  const shot = (name) => pg.screenshot({ path: path.join(SHOTS, (enc + "-" + dev + "-" + name).replace(/\s/g, "") + ".png") }).catch(() => {});

  const stretches = [];
  async function realTime(kind) {
    let intent = "defend", intentFor = null; const hist = []; let nextPress = 0, react = between(0.2, 0.35), lastHerbs = -9, n = 0, cueSeenAt = null, overSince = null;
    const c = { kind, start: null, end: null, wall: null, living0: 0, offField: 0 };
    let last = null;
    while (Date.now() - T0 < LIMIT) {
      const now = Date.now(), s = await pg.evaluate(READ);
      if (s.mode !== "rt") break;
      last = s;
      if (!c.start) { c.start = { t: s.t, hp: s.hpN, stats: s.stats }; c.wall = s.walled ? s.wallMen : null; c.living0 = s.living; }
      if (n++ === 12) await shot(kind + "-" + stretches.length);
      c.offField = Math.max(c.offField, s.offField);
      if (s.btn.retry) { await release(); say("beaten: Try again"); await sleep(between(700, 1300)); await tapSel("#rt [data-retry]"); await sleep(600); continue; }
      if (s.over) { await release(); if (overSince == null) overSince = now; else if (now - overSince > 20000) { say("STUCK: over (" + s.over + ") for 20 s"); break; } await sleep(150); continue; }
      overSince = null;
      if (s.written) { await release(); await sleep(600); await tapSel("#rt .written .go"); await sleep(500); continue; }
      if (s.brief) { await tapSel("#rt .fb-go"); await sleep(400); continue; }
      if (s.tour) { await tapSel("#rt .tc-skip"); await sleep(400); continue; }
      if (s.sheet) { if (!(await tapSel("#rt .sheet:not([hidden]) [data-resume]"))) { if (TOUCH) await pg.touchscreen.tap(30, 200).catch(() => {}); else await pg.keyboard.press("Escape"); } await sleep(300); continue; }
      hist.push({ now, s }); while (hist.length > 2 && hist[1].now <= now - react * 1000) hist.shift();
      const v = hist[0].s; // what was on the screen a reaction ago
      if (now < nextPress) { await sleep(25); continue; }
      const gap = () => { nextPress = Date.now() + between(TOUCH ? 140 : 110, TOUCH ? 260 : 220); react = rnd() < 0.1 ? between(0.45, 0.6) : between(0.2, 0.35); };
      if (v.thId && v.thId !== intentFor) { intentFor = v.thId; intent = s.weapon !== "bow" && !v.thRanged && rnd() < 0.6 ? "parry" : "defend"; }
      if (v.cue && s.weapon !== "bow" && s.busy <= 0.1 && (intent === "parry" || !s.block) && cueSeenAt !== hist[0].now) {
        cueSeenAt = hist[0].now; if (s.block) await release(); await press("j", s.btn.strike); gap(); continue;
      }
      if (v.threat != null && v.threat < 0.5 && !(intent === "parry" && v.threat > 0.12)) {
        if (s.blocker && s.canBlock !== false) { await hold("block", s.btn.block); held.until = Date.now() + 650; gap(); continue; }
        if (s.canRoll && rnd() < 0.85) { await press("k", s.btn.roll); gap(); continue; }
      }
      if (held && held.k === "block") { if (Date.now() < (held.until || 0)) { await sleep(25); continue; } await release(); }
      if (s.hp < 0.3 && s.herbs > 0 && s.canHerbs && (v.threat == null || v.threat > 1) && s.t - lastHerbs > 4) {
        lastHerbs = s.t; say("herbs at " + Math.round(s.hp * 100) + "%");
        if (TOUCH) { await tapSel("#rt .hb.aid"); await sleep(300); await tapSel('#rt .aid-sheet [data-aid="herbs"]:not([disabled])'); } else await press("h"); gap(); continue;
      }
      if (s.call != null && Math.abs(s.call) > 0.05) { const k = s.call > 0 ? "r" : "l"; await hold(k, s.btn[k]); await sleep(160); await release(); continue; }
      // Your shield broken: go and take up the one lying nearest.
      if (s.broken && s.shieldAt != null && Math.abs(s.shieldAt) > 0.02 && Math.abs(s.shieldAt) < 0.45) { const k = s.shieldAt > 0 ? "r" : "l"; await hold(k, s.btn[k]); await sleep(160); await release(); continue; }
      if (s.near != null) {
        if (Math.abs(s.near) <= s.reach * 1.05) { if (s.busy <= 0.05) { await press("j", s.btn.strike); gap(); } else await sleep(30); continue; }
        const k = s.near > 0 ? "r" : "l"; await hold(k, s.btn[k]); await sleep(between(120, 200)); await release(); continue;
      }
      await sleep(40);
    }
    await release();
    const s = last || {};
    c.end = { t: s.t, hp: s.hpN, stats: s.stats, living: s.living };
    const d = (k) => (c.end.stats && c.start ? (c.end.stats[k] || 0) - (c.start.stats[k] || 0) : 0);
    c.sum = { secs: c.start ? +(c.end.t - c.start.t).toFixed(1) : 0, living0: c.living0, livingEnd: c.end.living, hits: d("hits"), blows: d("blows"), parries: d("parries"), foeBlocks: d("fblocks"), blocked: d("blocked"), dodged: d("dodged"), wall: c.wall, offField: c.offField };
    say(kind + " over: " + JSON.stringify(c.sum));
    stretches.push(c);
  }

  let firstMove = null, idleSince = Date.now(), stuck = 0;
  while (Date.now() - T0 < LIMIT) {
    const s = await pg.evaluate(READ);
    if (s.mode === "gone") break;
    if (s.mode === "war" && !s.clashing && !s.moves.length && !s.place && !s.read && !s.end && !s.written && !s.brief && !s.tour && !s.sheet) {
      if (Date.now() - idleSince > 10000) { stuck++; await shot("stuck" + stuck); say("STUCK on the war day: " + JSON.stringify(s)); idleSince = Date.now(); if (stuck > 2) break; }
    } else idleSince = Date.now();
    if (s.mode === "rt") { await realTime(s.clash ? "clash" : "fight"); continue; }
    if (s.clashing) { await sleep(120); continue; }
    if (s.end) { await sleep(900); await shot("end"); await tapSel(".endcard button"); await sleep(800); continue; }
    if (s.written) { await tapSel(".written .go"); await sleep(600); continue; }
    if (s.brief) { await tapSel(".fb-go"); await sleep(500); continue; }
    if (s.tour) { await tapSel(".tc-skip"); await sleep(500); continue; }
    if (s.sheet) { await tapSel(".sheet:not([hidden]) [data-resume], .sheet:not([hidden]) [data-close]"); await sleep(300); continue; }
    if (s.place) { await sleep(between(600, 1400)); await tapSel('#rt [data-place="front"]'); await sleep(600); continue; }
    if (s.read) { await sleep(between(500, 900)); const opts = await pg.$$("#rt .wd-read [data-rd]"); const pick = opts[Math.floor(rnd() * opts.length)]; if (pick) await (TOUCH ? pick.tap() : pick.click()).catch(() => {}); await sleep(700); continue; }
    if (s.moves.length) {
      await sleep(between(900, 2000)); // a person reads the cards
      if (s.hp < 0.3 && s.herbs > 0 && s.herbsReady) { await tapSel('[data-wact="aid"]'); await sleep(400); if (await tapSel('.aid-sheet [data-aid="herbs"]:not([disabled])')) { await sleep(900); continue; } await tapSel(".sheet:not([hidden]) [data-resume]"); }
      const m = firstMove == null && s.moves.includes("wall") ? "wall" : s.moves.includes("wall") && rnd() < 0.25 ? "wall" : s.moves.includes("strike") && rnd() < 0.7 ? "strike" : s.moves.filter((x) => x !== "guard")[0] || s.moves[0];
      if (firstMove == null) firstMove = m;
      say("turns: round " + s.round + ", life " + Math.round(s.hp * 100) + "%: " + m);
      await tapSel('#rt #wd-moves [data-move="' + m + '"]'); await sleep(350);
      const ft = await pg.$("#rt .foe-tap:not([hidden])"); if (ft) await (TOUCH ? ft.tap() : ft.click()).catch(() => {});
      await sleep(900); continue;
    }
    await sleep(300);
  }
  const out = await pg.evaluate(() => window.__out);
  await endFight(pg).catch(() => {});
  await close();
  return { tag, out, firstMove, stretches, stuck, errs: [...new Set(errs)], secs: Math.round((Date.now() - T0) / 1000), log };
}

function judge(r, o) {
  const bad = [];
  const tail = " [" + r.log.slice(-4).join(" | ").slice(0, 400) + "]";
  if (r.out == null) bad.push(r.tag + ": the battle did not end in " + r.secs + " s" + tail);
  if (r.stuck) bad.push(r.tag + ": stuck " + r.stuck + " time(s)" + tail);
  const rt = r.stretches;
  if (!rt.length) bad.push(r.tag + ": no real-time fighting was played");
  if (o.clashes && !rt.some((c) => c.kind === "clash")) bad.push(r.tag + ": no clash after a move on the war day");
  if (o.clashes && r.firstMove === "wall") { const first = rt.find((c) => c.kind === "clash"); if (first && !first.wall) bad.push(r.tag + ": Shield wall was the first move, but the first clash did not open with the wall up"); }
  for (const c of rt) {
    if (c.kind === "clash" && c.sum.living0 > 0 && c.sum.livingEnd > 0 && c.sum.secs < 2 && c.sum.blows === 0) bad.push(r.tag + ": a clash ended after " + c.sum.secs + " s with " + c.sum.livingEnd + " foe(s) standing and no blow struck");
    if (c.offField) bad.push(r.tag + ": a living foe stood off the field (" + c.kind + ")");
  }
  if (!rt.some((c) => c.sum.hits > 0)) bad.push(r.tag + ": none of your blows landed (" + rt.map((c) => c.sum.blows + " blows").join(", ") + ")");
  for (const e of r.errs) bad.push(r.tag + ": " + e);
  console.log("        " + r.tag + ": " + r.out + " in " + r.secs + " s, " + rt.length + " stretch(es): " + rt.map((c) => c.kind + " " + c.sum.secs + "s hits " + c.sum.hits + "/" + c.sum.blows + (c.sum.parries ? " parries " + c.sum.parries : "") + (c.sum.foeBlocks ? " caught " + c.sum.foeBlocks : "") + (c.sum.wall ? " wall" : "")).join("; ").slice(0, 900));
  return bad;
}

browser("human-war-phone", "a whole war day played like a person on an iPhone 15 (mace): it ends, nothing stuck, the wall opens the clash, no empty clash", async () => {
  return judge(await playLikeAPerson("e_day1", "iPhone 15", "mace", "pandava", 1), { clashes: true });
});
browser("human-fight-laptop", "the night raid played like a person on a laptop (sword and shield): it ends, nothing stuck, your blows land", async () => {
  return judge(await playLikeAPerson("e_ash", "laptop", "charioteer", "pandava", 3), {});
});

// ---------- The commander's orders ----------
browser("orders-day", "the commander's orders at a battle day: name, since, Today, Your orders; fits; To your place closes it; once a day", async () => {
  const bad = [];
  const CASES = [["iPhone SE", "hi", "pandava", "a6_day14", 13], ["iPhone 15", "en", "pandava", "bh_day9", 6], ["laptop", "en", "kaurava", "a6_day13", 12], ["laptop", "hi", "kaurava", "a6_day1", 0]];
  for (const [dev, lang, side, scene, last] of CASES) {
    const tag = dev + " " + lang + " " + side + " " + scene + ": ";
    const { pg, errs, close } = await open({ device: dev, lang });
    const r = await pg.evaluate(async ([side, scene, last, lang]) => {
      const S = K.newLife(); Object.assign(S, { alive: true, act: 6, age: 44, name: "Asha", pronoun: "she", origin: "panchala", court: "panchala", path: "mace", side, teacher: "drona", temperament: "bold", heirloom: "amulet" }); K.S = S;
      S.ordersDay = last; S.ordersJ = 0; S.journal.push({ age: 44, act: 6, src: "You survived the first days of the war.", text: "You survived the first days of the war." });
      K.prefs({ calm: false, beats: false });
      K.go(scene);
      for (let k = 0; k < 60; k++) { await new Promise((r) => setTimeout(r, 200)); if (document.querySelector(".moment.orders.in")) break; }
      const o = document.querySelector(".moment.orders"); if (!o) return { none: true, scene: K.S.scene };
      const card = o.querySelector(".ord"), go = o.querySelector(".ord-go"), cr = card.getBoundingClientRect();
      card.scrollTop = card.scrollHeight; await new Promise((r) => setTimeout(r, 100));
      const gr = go.getBoundingClientRect();
      return { who: (o.querySelector(".ord-who b") || {}).textContent || "", since: o.querySelectorAll(".ord-since li").length, today: !!o.querySelector(".ord-today p"), you: !!o.querySelector(".ord-you p"),
        fits: cr.top >= -1 && cr.bottom <= innerHeight + 1 && cr.left >= -1 && cr.right <= innerWidth + 1, goIn: gr.top >= 0 && gr.bottom <= innerHeight + 1 && gr.width > 30, lang: K.lang, latin: lang === "hi" ? ([...o.querySelectorAll(".ord-who, .ord-since h3, .ord-since li, .ord-today, .ord-you, .ord-go, .ord-mine b")].map((e) => e.innerText).join(" ").match(/[A-Za-z]{4,}/g) || []).filter((w) => !/Asha/.test(w)).slice(0, 5) : [] }; // (not "Your part": the journal lines this check makes up have no Hindi)
    }, [side, scene, last, lang]);
    if (r.none) { bad.push(tag + "no orders were shown (scene " + r.scene + ")"); await close(); continue; }
    if (!r.who) bad.push(tag + "no commander's name");
    if (!r.since) bad.push(tag + "nothing about what happened since the last orders");
    if (!r.today) bad.push(tag + "no Today section");
    if (!r.you) bad.push(tag + "no Your orders section");
    if (!r.fits) bad.push(tag + "the orders card runs off the screen");
    if (!r.goIn) bad.push(tag + "\"To your place\" is not on the screen (scrolled to the end)");
    if (r.latin && r.latin.length) bad.push(tag + "English left in the Hindi orders: " + r.latin.join(", "));
    await sleep(700);
    await pg.screenshot({ path: path.join(SHOTS, ("orders-" + dev + "-" + lang + "-" + scene).replace(/\s/g, "") + ".png") });
    await pg.click(".ord-go").catch((e) => bad.push(tag + "To your place could not be pressed: " + String(e.message).split("\n")[0]));
    await sleep(700);
    const after = await pg.evaluate(async () => { const gone = !document.querySelector(".moment.orders"); const choice = !!document.querySelector("#choices .choice"); K.UI.renderScene(K.SCENES[K.S.scene]); await new Promise((r) => setTimeout(r, 800)); return { gone, choice, again: !!document.querySelector(".moment.orders") }; });
    if (!after.gone) bad.push(tag + "the orders stayed up after To your place");
    if (!after.choice) bad.push(tag + "no choice on the page after the orders");
    if (after.again) bad.push(tag + "the orders came up again on the same day");
    bad.push(...errs.map((e) => tag + e));
    await close();
  }
  // Another page drawn under the orders (a checkpoint, a save loaded): they go, and the new page can be tapped (the full
  // check of 6 November found the orders left over it).
  {
    const { pg, errs, close } = await open({ device: "iPhone 15" });
    const up = await pg.evaluate(async () => {
      const S = K.newLife(); Object.assign(S, { alive: true, act: 6, age: 44, name: "Asha", pronoun: "she", origin: "panchala", court: "panchala", path: "mace", side: "pandava", teacher: "drona" }); K.S = S;
      K.prefs({ calm: true, beats: false }); K.go("a6_day1");
      for (let k = 0; k < 40; k++) { await new Promise((r) => setTimeout(r, 200)); if (document.querySelector(".moment.orders")) return true; }
      return false;
    });
    if (!up) bad.push("leftover: no orders on a6_day1 to begin with");
    else {
      await pg.evaluate(() => K.go("a6_eve")); await sleep(1200);
      if (await pg.$("#journey-go")) { await pg.click("#journey-go", { timeout: 3000 }).catch(() => {}); await sleep(500); }
      const left = await pg.evaluate(() => !!document.querySelector(".moment.orders"));
      if (left) bad.push("leftover: the orders stayed over the next page");
      await pg.click("#choices .choice", { timeout: 3000 }).catch((e) => bad.push("leftover: the next page's choice could not be tapped: " + String(e.message).split("\n")[0]));
    }
    bad.push(...errs.map((e) => "leftover: " + e));
    await close();
  }
  return bad;
});

// ---------- The low-life warning ----------
browser("low-life", "the warning below a fifth of your life: real time, a war day's clash and the war day's screen; none above it", async () => {
  const bad = [];
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const setLife = (k) => pg.evaluate((k) => { clearInterval(window.__life); window.__life = setInterval(() => { const p = K.Combat.player(); if (p && p.hp > 0) p.hp = Math.max(1, Math.round(p.maxHp * k)); }, 40); }, k);
  // (scope: the real-time screen, which is also the clash's, or the war day's own; while a clash runs the war day's
  // screen is hidden behind it)
  const shown = (scope = "rt") => pg.evaluate((scope) => { const V = scope === "war" ? K.UI.warScreen() : K.UI.rtScreen(); const root = V && V.el; if (!root) return { n: 0, text: "", cls: false, none: true };
    const els = [...root.querySelectorAll(".lowwarn")].filter((e) => !e.hidden && getComputedStyle(e).visibility !== "hidden" && e.getBoundingClientRect().height > 0); return { n: els.length, text: els.map((e) => e.textContent.trim()).join(" | "), cls: root.classList.contains("lowlife") }; }, scope);
  // Real time.
  await pg.evaluate(() => { const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 30, act: 4, path: "mace", side: "pandava", teacher: "drona" })); S.items.herbs = 2; S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1; K.prefs({ fights: "realtime" }); K.seed(5); K.UI.startBattle("e_guard", () => {}); });
  await sleep(1500);
  await pg.evaluate(() => { const V = K.UI.rtScreen(); if (V) V.R.B.units.forEach((u) => { if (u.side === "enemy" && u.rt) { u.rt.cool = 999; u.rt.atk = null; } }); });
  await setLife(0.35); await sleep(800);
  let s = await shown(); if (s.n) bad.push("real time: a warning at 35% of your life (" + s.text + ")");
  await setLife(0.15); await sleep(900);
  s = await shown(); if (!s.n || !s.text) bad.push("real time: no warning at 15% of your life"); if (!s.cls) bad.push("real time: the field's edges do not turn red at 15%");
  await pg.screenshot({ path: path.join(SHOTS, "lowlife-realtime-iPhone15.png") });
  await setLife(0.5); await sleep(900);
  s = await shown(); if (s.n) bad.push("real time: the warning stayed after your life came back to 50%");
  await pg.evaluate(() => clearInterval(window.__life)); await endFight(pg);
  // A war day: its own screen, then the clash after a move.
  await pg.evaluate(() => { const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 44, act: 6, path: "mace", side: "pandava", teacher: "drona" })); S.items.herbs = 2; S.flags.push("role_front"); S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1; K.seed(5); K.UI.startBattle("e_day1", () => {}); });
  await sleep(1800);
  const place = await pg.$("#rt [data-place]"); if (place) { await place.tap().catch(() => {}); await sleep(700); }
  // (the war day's screen redraws on the fight's events: a blow brings you down to 15%, as in play)
  const blowTo = (k) => pg.evaluate((k) => { const B = K.Combat.state(), p = B.units[0], e = B.units.find((u) => u.side === "enemy" && u.hp > 0); p.hp = Math.max(2, Math.round(p.maxHp * k) + 1); B.hit(e, p, 0.01); K.UI.renderBattle(B); }, k);
  await blowTo(0.15); await sleep(1500);
  s = await shown("war"); if (!s.n) bad.push("war day: no warning on the war day's screen at 15% of your life");
  await pg.screenshot({ path: path.join(SHOTS, "lowlife-warday-iPhone15.png") });
  await pg.evaluate(() => K.UI.redraw()); await sleep(600);
  s = await shown("war"); if (!s.n) bad.push("war day: the warning went after the screen was redrawn (a language switch)");
  await setLife(0.15);
  const mv = await pg.$('#rt #wd-moves [data-move="wall"]:not([disabled]), #rt #wd-moves [data-move="strike"]:not([disabled])');
  if (mv) { await mv.tap().catch(() => {}); await sleep(350); const ft = await pg.$("#rt .foe-tap:not([hidden])"); if (ft) await ft.tap().catch(() => {}); }
  let clash = false;
  for (let i = 0; i < 30 && !clash; i++) { await sleep(300); clash = await pg.evaluate(() => !!(K.UI.rtScreen() && K.UI.rtScreen().clash)); }
  if (!clash) bad.push("war day: no clash opened after a move");
  else {
    await pg.evaluate(() => { const V = K.UI.rtScreen(); V.R.B.units.forEach((u) => { if (u.side === "enemy" && u.rt) { u.rt.cool = 999; u.rt.atk = null; } }); });
    await sleep(1200);
    s = await shown(); if (!s.n) bad.push("clash: no warning at 15% of your life"); if (!s.cls) bad.push("clash: the field's edges do not turn red at 15%");
    await pg.screenshot({ path: path.join(SHOTS, "lowlife-clash-iPhone15.png") });
  }
  await pg.evaluate(() => clearInterval(window.__life)); await endFight(pg);
  await close(); return bad.concat(errs);
});

// ---------- A foe's shield ----------
browser("foe-shield", "a foe's shield catches your blow: Blocked, lit gold while he lowers it and cannot strike, the gold gone when he can", async () => {
  const bad = [];
  for (const [dev, pathId] of [["iPhone 15", "mace"], ["laptop", "charioteer"]]) {
    const tag = dev + " (" + pathId + "): ";
    const { pg, errs, close } = await open({ device: dev });
    await pg.evaluate((pathId) => { const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 30, act: 4, path: pathId, side: "pandava", teacher: "drona" })); S.items.herbs = 2; S.briefed = ["duel", "melee", "hold", "rounds"]; S.fightTour = 1; K.prefs({ fights: "realtime", tipFblock: false }); K.seed(3); K.UI.startBattle("e_guard", () => {}); }, pathId);
    await sleep(1800);
    const set = await pg.evaluate(() => { const V = K.UI.rtScreen(); if (!V) return null; const R = V.R, p = K.Combat.player(); R.D.glance = 99; R.D.parryFoe = 0;
      const foes = R.B.units.filter((u) => u.side === "enemy" && u.hp > 0); const e = foes.find((u) => u.shield || u.shieldDrawn);
      if (!e) return { none: foes.map((u) => u.name) };
      foes.forEach((u) => { u.rt.cool = 99; u.rt.atk = null; if (u !== e) { u.rt.x = 0.93; u.rt.lane = 2; } });
      e.rt.lane = p.rt.lane; e.rt.x = Math.min(0.9, p.rt.x + p.rt.reach * 0.7); e.rt.face = -1; p.rt.face = 1; e.rt.entered = true; window.__fb = e.uid;
      return { name: e.name }; });
    if (!set || set.none) { bad.push(tag + "no foe with a shield in the guards' fight (" + JSON.stringify(set) + ")"); await close(); continue; }
    await sleep(300);
    await pg.keyboard.press("j");
    let st = null;
    for (let i = 0; i < 40; i++) { st = await pg.evaluate(() => { const V = K.UI.rtScreen(), u = V.R.B.units.find((x) => x.uid === window.__fb), a = V.actors.get(window.__fb); return { n: V.R.stats.fblocks, opening: !!u.rt.opening, lit: !!(a && a.el.classList.contains("opened")), pops: [...document.querySelectorAll("#rt .pop")].map((p) => p.textContent), atk: !!u.rt.atk }; }); if (st.n) break; await sleep(40); }
    if (!st || !st.n) { bad.push(tag + "the foe never caught the blow on his shield"); await close(); continue; }
    if (!st.pops.includes("Blocked")) bad.push(tag + "no \"Blocked\" over him (" + st.pops.join(", ") + ")");
    if (!st.lit) bad.push(tag + "he is not lit gold while he lowers the shield");
    await pg.screenshot({ path: path.join(SHOTS, ("foeshield-" + dev + "-" + pathId).replace(/\s/g, "") + ".png") });
    await pg.evaluate(() => { const V = K.UI.rtScreen(), u = V.R.B.units.find((x) => x.uid === window.__fb); u.rt.cool = 0; });
    let struckOpen = false, litAfter = null;
    for (let i = 0; i < 80; i++) { const q = await pg.evaluate(() => { const V = K.UI.rtScreen(), u = V.R.B.units.find((x) => x.uid === window.__fb), a = V.actors.get(window.__fb); return { opening: !!u.rt.opening, atk: !!u.rt.atk, lit: !!(a && a.el.classList.contains("opened")) }; }); if (q.opening && q.atk) struckOpen = true; if (!q.opening) { await sleep(150); litAfter = await pg.evaluate(() => { const a = K.UI.rtScreen().actors.get(window.__fb); return !!(a && a.el.classList.contains("opened")); }); break; } await sleep(40); }
    if (struckOpen) bad.push(tag + "he wound up a blow while he was lowering the shield");
    if (litAfter == null) bad.push(tag + "the opening never ended");
    else if (litAfter) bad.push(tag + "still lit gold after he could act again");
    bad.push(...errs.map((e) => tag + e));
    await endFight(pg); await close();
  }
  return bad;
});

T.run();
