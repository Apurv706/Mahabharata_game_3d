/* Review of the fight screens in the browser (Playwright Chromium; the owner's checklist, 4 November):
     weapons-rt       2  every figure in every real-time fight holds the weapon it strikes with (you on each path, named and
                         unnamed foes, soldiers, friends); a shield on the mace and sword paths
     weapons-war      2  the same on the war-day screen (its figures as ui/battle.js draws them)
     ashwatthama-sword 2 the night raid's Ashwatthama: drawn with a sword and striking only with it (no weapon taken up), in
                         real time and on the war day, no arrows, still a champion (owner, 4 November)
     friend-weapon    5  a friend called for help comes on holding his own weapon (Bhima a mace, Arjuna a bow, Charu a hammer)
     controls-touch   3  on an iPhone SE and an iPhone 15: ◀ ▶ held move you, Strike strikes, Block held raises the shield
                         (mace) or Roll rolls (archer), the path skill, Aid (herbs, the divine weapon, call for help), Orders,
                         Pause and Resume, each through a tap or a held touch
     controls-keys    3  on a laptop: A/D, J, K held (Block) or K (Roll), L, H, U, C, O, P/Esc, E; a click on a foe strikes,
                         a click on the ground walks
     read-lines       2  the war day's timed read follows the weapon the foe is drawn holding: a bowman's blows come as
                         arrows (and he draws to wind up), one drawn with a spear or blade never shoots
     controls-war     3  the war day on a phone and a laptop: a place card, a move card and a tap on a foe play a round;
                         the timed read's buttons; Aid
     orders-friend    4  the friend's presets visibly apply: Hold back keeps behind you and strikes no one, All-out goes for
                         the foes, Guard me stays by you, Balanced fights the foe nearest you
     orders-soldiers  4  the soldiers' orders: Stay out (no blows, behind you), All-out (they charge), Defend (by you)
     orders-war       4  the war day's Company orders (hold the line, guard me, press, fall back) change the order and its
                         label, and Change place moves your figure (front, middle, flank)
     pause           14  the fight stands still while Aid or Orders is open, when the tab is hidden, and when the phone turns
     spacing          6  at rest no two bodies in a row overlap by more than a quarter of their width, nobody stands on you,
                         and no figure is off the screen, in every real-time fight on a phone and a laptop
     bars             7  the health and breath bars match the engine's numbers, a blow's number pops on the one struck and
                         the fight's log has a line for it
     spare-ui         8  a foe at 6% asks nothing; at 4% he kneels with "Mercy!" and Spare; sparing him lets the fight go on
     retry-ui         9  a deadly fight lost the first time: you slump (not fall) under Try again; Try again starts at 80%
                         with the call for help still used; the second loss is final; no Try again in a fight that is not deadly
     astra-ui        10  a divine weapon in real time plays its moment (the freeze, the blink, the weapon, the sweep with its
                         white flash, shake and ring, about 2 s), and a champion who can answer meets it with his counter
     turns-switch    11  with "Fights: turn-based" every real-time fight opens on the war-day screen
   Usage: node tests/review_fights.js [--case id,id] [--list] [--json FILE] [--game DIR]   Exits 1 when a case fails. */
"use strict";
const L = require("./review_lib");
const { open, fight, keepAlive, keepLow, endFight, touchHold, waitFight, holdFight, traceMantra, sleep } = L;
const T = L.suite("review_fights", "tests/review_fights.js: the fight screens in the browser");
const { browser } = T;

const RT_IDS = ["e_ugra", "e_spar", "e_bandits", "e_kings", "e_panchala", "e_border", "e_gandharva", "e_sudatta", "e_jayadratha", "e_cattle", "e_cattle_k",
  "e_guard", "e_hunt", "e_gate", "e_road", "e_jaya", "e_dushasana", "e_night", "e_ep_carts", "e_ep_ugra", "e_raid", "e_ash", "cross_e_duel", "cross_e_called"];
const PATHS = ["mace", "archer", "charioteer", "strategist", "healer", "spy", "bard"];
// A life that can reach each fight: its act and age (the fight's content reads them).
const LIFE = (enc, path) => {
  const pre = { e_ugra: [2, 16], e_spar: [2, 17], e_bandits: [5, 38], e_kings: [3, 24], e_panchala: [2, 19], e_border: [5, 36], e_gandharva: [5, 38], e_sudatta: [5, 39], e_jayadratha: [5, 38], e_cattle: [5, 43], e_cattle_k: [5, 43] }[enc] || [6, 44];
  return { act: pre[0], age: pre[1], path, side: /cattle_k/.test(enc) ? "kaurava" : "pandava" };
};
// What each figure on the real-time screen holds (its drawn item and shield), and what it strikes with.
const READ_HELD = () => {
  const V = K.UI.rtScreen(); if (!V) return null;
  const out = [];
  V.actors.forEach((a) => {
    const u = a.u; if (!u || u.hp <= 0) return;
    const it = a.svg.querySelector(".pp-body .it:not(.it-w)") || a.svg.querySelector(".pp-body .it");
    out.push({ uid: u.uid, who: K.text(u.src || u.name), side: u.side, person: u.person || null, called: !!u.called, drawn: it ? it.dataset.k || "?" : null, shield: !!a.svg.querySelector(".pp-body .it-s"), weapon: u.rt && u.rt.weapon, archer: !!(u.rt && u.rt.archer) });
  });
  return { list: out, fightItem: K.fightItem(K.S), shieldPath: !!(K.Combat.hasShield && K.Combat.hasShield()) };
};
// The drawn item that goes with a weapon the engine strikes with.
const DRAWN = { bow: ["bow"], mace: ["mace"], sword: ["sword", "woodsword"], spear: ["spear"], dagger: ["dagger"], club: ["club"], hammer: ["hammer"], staff: ["staff"], fist: [null, "fist"] };
function heldProblems(enc, path, r) {
  const bad = [];
  if (!r) return [enc + " (" + path + "): no real-time screen"];
  for (const f of r.list) {
    const ok = DRAWN[f.weapon] || [f.weapon];
    if (f.side === "player") {
      if (f.drawn !== r.fightItem) bad.push(enc + " (" + path + "): you hold " + f.drawn + ", not " + r.fightItem);
      if (!ok.includes(f.drawn)) bad.push(enc + " (" + path + "): you hold " + f.drawn + " but strike with " + f.weapon);
      if (r.shieldPath !== f.shield) bad.push(enc + " (" + path + "): your shield is " + (f.shield ? "drawn" : "missing") + " on the " + path + " path");
      continue;
    }
    if (!ok.includes(f.drawn)) bad.push(enc + " (" + path + "): " + f.who + " (" + f.side + ") holds " + f.drawn + " but strikes with " + f.weapon + (f.archer ? " (an archer)" : ""));
  }
  return bad;
}

browser("weapons-rt", "every figure in every real-time fight holds the weapon it strikes with (iPhone 15)", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  for (let i = 0; i < RT_IDS.length; i++) {
    const enc = RT_IDS[i];
    for (const path of [PATHS[i % 7], PATHS[(i + 3) % 7]]) {
      await fight(pg, enc, { life: LIFE(enc, path), wait: 900 });
      bad.push(...heldProblems(enc, path, await pg.evaluate(READ_HELD)));
      // Later packs too: everyone who comes on.
      await keepAlive(pg);
      await pg.evaluate(() => { const B = K.Combat.state(); B.units.filter((u) => u.side === "enemy" && u.rt && u.rt.entered).forEach((u) => { u.hp = 0; }); });
      await sleep(2200);
      const later = await pg.evaluate(READ_HELD); // (no later pack: the fight is over and its screen gone)
      if (later) bad.push(...heldProblems(enc + " (later pack)", path, later));
      await endFight(pg);
    }
  }
  await close(); return bad.concat(errs);
});

browser("weapons-war", "every figure on the war-day screen holds what it is drawn holding in the story's fights (the spec), you your fight weapon", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  const encs = await pg.evaluate(() => Object.keys(K.ENCOUNTERS).filter((id) => !K.RT.isRealtime(id) && !K.ENCOUNTERS[id].dream && !(K.val(K.ENCOUNTERS[id].kind) && K.FIGHT_KINDS && K.FIGHT_KINDS[K.val(K.ENCOUNTERS[id].kind)])));
  for (let i = 0; i < encs.length; i += 3) {
    const enc = encs[i], path = PATHS[i % 7];
    await fight(pg, enc, { life: { path, act: 6, age: 44 }, wait: 700 });
    const r = await pg.evaluate(() => {
      const V = K.UI.warScreen(); if (!V) return null;
      const out = [];
      document.querySelectorAll("#rt .wfig, #rt [data-uid]").forEach((el) => {
        const uid = el.dataset.uid; const u = uid && K.Combat.state().units.find((x) => x.uid === uid); if (!u || u.hp <= 0) return;
        const it = el.querySelector(".pp-body .it:not(.it-w)") || el.querySelector(".pp-body .it"); if (!el.querySelector("svg.pp")) return;
        const spec = u.side === "player" ? Object.assign({}, K.puppetSpec(K.S), { item: K.fightItem(K.S) }) : K.UI.battleSpecFor(u);
        out.push({ who: K.text(u.src || u.name), side: u.side, drawn: it ? it.dataset.k || "?" : null, want: spec && spec.item ? spec.item : null });
      });
      return out;
    });
    if (!r) { bad.push(enc + ": no war-day screen"); await endFight(pg); continue; }
    const seen = new Set();
    for (const f of r) { const k = f.who + f.drawn; if (seen.has(k)) continue; seen.add(k); if ((f.want || null) !== (f.drawn || null) && !(f.want && /^[a-z]+$/.test(f.want) === false)) bad.push(enc + " (" + path + "): " + f.who + " holds " + f.drawn + ", drawn elsewhere with " + f.want); }
    await endFight(pg);
  }
  await close(); return bad.concat(errs);
});

browser("friend-weapon", "a friend called for help comes on holding his own weapon", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  const WANT = { bhima: "mace", arjuna: "bow", charu: "hammer", karna: "bow", duryodhana: "mace" };
  for (const [who, side, enc] of [["bhima", "pandava", "e_bandits"], ["arjuna", "pandava", "e_border"], ["charu", "pandava", "e_sudatta"], ["karna", "kaurava", "e_cattle_k"], ["duryodhana", "kaurava", "e_gandharva"]]) {
    const life = Object.assign(LIFE(enc, "spy"), { side, age: enc === "e_border" ? 33 : 38 });
    await fight(pg, enc, { life, S: { bonds: { [who]: 9 }, friend: who }, wait: 800 });
    await keepAlive(pg);
    const can = await pg.evaluate(() => K.RT.can(K.UI.rtScreen().R, "call"));
    if (!can) { bad.push(enc + ": no call for help to make for " + who); await endFight(pg); continue; }
    await pg.tap('#rt [data-act="aid"]'); await sleep(400);
    await pg.tap('#rt .aid-sheet [data-aid="call"]'); await sleep(2500);
    const r = await pg.evaluate(READ_HELD);
    const fr = r && r.list.find((f) => f.side === "ally" && f.called);
    if (!fr) bad.push(enc + ": " + who + " did not come (" + JSON.stringify(r && r.list.map((f) => f.who)) + ")");
    else {
      if (fr.person !== who) bad.push(enc + ": " + fr.person + " came, not " + who);
      if (fr.drawn !== WANT[who]) bad.push(enc + ": " + who + " came holding " + fr.drawn + ", not his " + WANT[who]);
      if (!(DRAWN[fr.weapon] || []).includes(fr.drawn)) bad.push(enc + ": " + who + " holds " + fr.drawn + " but strikes with " + fr.weapon);
      const onStage = await pg.evaluate((uid) => { const a = K.UI.rtScreen().actors.get(uid); const r = a.el.querySelector(".pp-body").getBoundingClientRect(); return r.width > 0 && r.right > 0 && r.left < innerWidth && getComputedStyle(a.el).visibility !== "hidden"; }, fr.uid);
      if (!onStage) bad.push(enc + ": " + who + " is not to be seen on the stage");
    }
    await endFight(pg);
  }
  await close(); return bad.concat(errs);
});

browser("ashwatthama-sword", "the night raid's Ashwatthama is drawn with a sword and strikes only with it, in real time and on the war day; still a champion", async () => {
  const bad = [];
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  for (const enc of ["e_raid", "e_ash"]) {
    // Real time: what he holds, and whether he ever takes up another weapon (Rig.wield) over 12 s of blows.
    await fight(pg, enc, { life: { path: "charioteer" } });
    await keepAlive(pg);
    await pg.evaluate(() => { window.__wield = []; const B = K.Combat.state(), a = B.units.find((u) => /Ashwatthama/.test(u.name)); const A = K.UI.rtScreen().actors.get(a.uid); if (A && A.rig) { const w = A.rig.wield.bind(A.rig); A.rig.wield = (k) => { window.__wield.push(k); return w(k); }; } });
    const r0 = await pg.evaluate(() => { const B = K.Combat.state(), a = B.units.find((u) => /Ashwatthama/.test(u.name)), A = K.UI.rtScreen().actors.get(a.uid); const it = A.svg.querySelector(".pp-body .it"); return { drawn: it && it.dataset.k, weapon: a.rt.weapon, archer: a.rt.archer, hero: a.hero, moves: a.abilities }; });
    if (r0.drawn !== "sword" || r0.weapon !== "sword") bad.push(enc + " real time: drawn with " + r0.drawn + ", strikes with " + r0.weapon + " (a sword both)");
    if (r0.archer || r0.moves.some((m) => ["arrows", "aimed", "volley", "pin"].includes(m))) bad.push(enc + ": a sword-holder who shoots (" + r0.moves.join(",") + ")");
    if (!r0.hero) bad.push(enc + ": no longer a champion (the counter-weapon)");
    await waitFight(pg, 12, 60000);
    const w = await pg.evaluate(() => window.__wield);
    if (w.length) bad.push(enc + " real time: he took up " + [...new Set(w)].join(", ") + " to strike");
    await endFight(pg);
    // The war day (Fights: turn-based): drawn with the sword, and no bow taken up for a move or the read.
    await pg.evaluate(() => K.prefs({ fights: "turns" }));
    await fight(pg, enc, { life: { path: "charioteer" } });
    await keepAlive(pg);
    const r1 = await pg.evaluate(() => { const B = K.Combat.state(), a = B.units.find((u) => /Ashwatthama/.test(u.name)); const el = document.querySelector('#rt [data-uid="' + a.uid + '"]'); const it = el && el.querySelector(".pp-body .it"); return { war: !!K.UI.warScreen(), drawn: it && it.dataset.k }; });
    if (!r1.war) bad.push(enc + ": not on the war-day screen with Fights: turn-based");
    else if (r1.drawn !== "sword") bad.push(enc + " war day: drawn with " + r1.drawn + ", not a sword");
    for (let i = 0; i < 30; i++) { // a few rounds, with reads
      const s = await pg.evaluate(() => { const V = K.UI.warScreen(); return V && { read: !!document.querySelector("#rt .wd-read [data-rd]"), line: (document.querySelector("#rt .wd-read .rd-who") || {}).textContent || "", over: V.over, busy: !!V.playing || !!(V.B.queue && V.B.queue.length) }; });
      if (!s || s.over) break;
      if (s.read) { if (/arrow/i.test(s.line)) bad.push(enc + " war day: a sword-holder's read says " + JSON.stringify(s.line)); await pg.evaluate(() => { const b = document.querySelector('#rt .wd-read [data-rd="block"]'); b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); }); await sleep(600); continue; }
      if (await pg.evaluate(() => !!document.querySelector("#rt .wctl.picking"))) { await pg.evaluate(() => document.querySelector("#rt [data-place]").click()); await sleep(500); continue; }
      if (!s.busy) await pg.evaluate(() => { const b = document.querySelector('#wd-moves [data-move="strike"]:not([disabled])'); if (b) b.click(); });
      await sleep(500);
    }
    const r2 = await pg.evaluate(() => { const B = K.Combat.state(), a = B && B.units.find((u) => /Ashwatthama/.test(u.name)); const el = a && document.querySelector('#rt [data-uid="' + a.uid + '"]'); return el ? [...el.querySelectorAll(".pp-body .it")].map((i) => i.dataset.k) : null; });
    if (r2 && r2.some((k) => k && k !== "sword")) bad.push(enc + " war day: he holds " + r2.join(", ") + " after some rounds");
    await endFight(pg);
    await pg.evaluate(() => K.prefs({ fights: "realtime" }));
  }
  await close(); return bad.concat(errs);
});

browser("read-lines", "the war day's timed read speaks of the weapon the foe is drawn holding: a bowman's blows as arrows, a spearman's never", async () => {
  const bad = [], seen = { bow: 0, other: 0 };
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  // Since Build B a war day's blows land in the real-time clash after your move; the timed read is played only with
  // Fights: turn-based (the Menu), so that is where it is checked.
  await pg.evaluate(() => K.prefs({ fights: "turns" }));
  for (const enc of ["hold_arjuna", "e_day1", "e_day16"]) {
    await fight(pg, enc, { life: { path: "charioteer", side: "kaurava" } });
    await keepAlive(pg);
    for (let i = 0; i < 60 && (seen.bow < 4 || seen.other < 4); i++) {
      const s = await pg.evaluate(() => {
        const V = K.UI.warScreen(); if (!V || V.over) return { over: true };
        const rd = document.querySelector("#rt .wd-read .rd-who");
        if (rd && document.querySelector("#rt .wd-read [data-rd]")) {
          const who = (rd.querySelector("b") || {}).textContent || "", line = rd.textContent;
          const u = V.B.units.find((x) => x.side === "enemy" && K.text(x.src || x.name) === who);
          const el = u && document.querySelector('#rt [data-uid="' + u.uid + '"]');
          const it = el && el.querySelector(".pp-body .it"), held = it ? it.dataset.k : null;
          const wind = el ? el.querySelector("svg.pp").getAttribute("class") + " " + ((V.figs && [...V.figs.values()].find((f) => f.u === u) || {}).rig || {}).pose : "";
          return { read: true, who, line, held, wind };
        }
        return { place: !!document.querySelector("#rt .wctl.picking"), busy: !!V.playing || !!(V.B.queue && V.B.queue.length) };
      });
      if (s.over) break;
      if (s.read) {
        const arrow = /arrow/i.test(s.line);
        if (s.held === "bow") { seen.bow++; if (!arrow) bad.push(enc + ": " + s.who + " (drawn with a bow) winds up for " + JSON.stringify(s.line)); }
        else if (s.held || s.who) { seen.other++; if (arrow) bad.push(enc + ": " + s.who + " (drawn with " + s.held + ") looses " + JSON.stringify(s.line)); if (/\bdraw\b|pose-aim/.test(s.wind)) bad.push(enc + ": " + s.who + " (drawn with " + s.held + ") draws a bow to wind up"); }
        await pg.evaluate(() => { const b = document.querySelector('#rt .wd-read [data-rd="block"]'); if (b) b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); });
        await sleep(700); continue;
      }
      if (s.place) { await pg.evaluate(() => document.querySelector("#rt [data-place]").click()); await sleep(500); continue; }
      if (!s.busy) await pg.evaluate(() => { const b = document.querySelector('#wd-moves [data-move="wall"]:not([disabled]), #wd-moves [data-move="guard"]:not([disabled]), #wd-moves [data-move="strike"]:not([disabled])'); if (b) b.click(); });
      await sleep(400);
    }
    await endFight(pg);
  }
  if (!seen.bow) bad.push("no read from a bowman was seen to check");
  if (!seen.other) bad.push("no read from a foe drawn with another weapon was seen to check");
  await pg.evaluate(() => K.prefs({ fights: "realtime" }));
  await close(); return bad.concat(errs);
});

// The engine's state as the controls change it.
const ST = () => { const V = K.UI.rtScreen(); if (!V) return null; const R = V.R, p = K.Combat.player(); return { x: p.rt.x, blows: R.stats.blows, rolls: R.stats.rolls, block: R.block, blocks: R.stats.blocks, skillCd: R.skillCd, kneel: R.kneel, hp: p.hp, maxHp: p.maxHp, paused: V.paused, sheet: V.sheet, t: R.t, orders: Object.assign({}, R.orders), frozen: R.frozen, used: Object.assign({}, R.B.used), allies: R.B.units.filter((u) => u.side === "ally" && u.hp > 0).map((u) => u.person || u.name), herbs: K.S.items.herbs, spared: R.B.units.filter((u) => u.spared).length }; };
async function controlChecks(dev, bad) {
  const tag = dev + ": ";
  const touch = dev !== "laptop";
  const { ctx, pg, errs, close } = await open({ device: dev });
  const tapOr = async (sel, key) => { if (touch) await pg.tap("#rt " + sel); else await pg.keyboard.press(key); };
  // The mace path: Block. Bhima for the call; the Brahmastra for the divine weapon.
  await fight(pg, "e_bandits", { life: { act: 5, age: 38, path: "mace" }, S: { bonds: { bhima: 9 }, friend: "bhima", boons: ["astra"] } });
  await keepAlive(pg);
  let s0 = await pg.evaluate(ST);
  // Move: ◀ held (or A), away from the foes coming in from the right, then ▶ (or D) back.
  if (touch) await touchHold(ctx, pg, '#rt [data-hold="l"]', 500, 0.5); else await holdFight(pg, () => pg.keyboard.down("a"), () => pg.keyboard.up("a"), 0.5);
  let s1 = await pg.evaluate(ST);
  if (!(s1.x < s0.x - 0.01)) bad.push(tag + "◀ did not move you left (" + s0.x.toFixed(3) + " → " + s1.x.toFixed(3) + ")");
  if (touch) await touchHold(ctx, pg, '#rt [data-hold="r"]', 500, 0.3); else await holdFight(pg, () => pg.keyboard.down("d"), () => pg.keyboard.up("d"), 0.3);
  let s2 = await pg.evaluate(ST);
  if (!(s2.x > s1.x + 0.01)) bad.push(tag + "▶ did not move you right (" + s1.x.toFixed(3) + " → " + s2.x.toFixed(3) + ")");
  // Strike.
  await tapOr('[data-act="strike"]', "j"); await waitFight(pg, 0.8);
  let s3 = await pg.evaluate(ST);
  if (!(s3.blows > s2.blows)) bad.push(tag + "Strike struck no blow");
  // Block: held up while held, down when let go.
  if (touch) {
    const cdp = await ctx.newCDPSession(pg); const bb = await pg.locator('#rt [data-hold="block"]').boundingBox();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }] }); await waitFight(pg, 0.3);
    const mid = await pg.evaluate(ST); if (!mid.block) bad.push(tag + "holding Block did not raise the shield");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await waitFight(pg, 0.1);
  } else { await pg.keyboard.down("k"); await waitFight(pg, 0.3); const mid = await pg.evaluate(ST); if (!mid.block) bad.push(tag + "holding K did not raise the shield"); await pg.keyboard.up("k"); await waitFight(pg, 0.1); }
  if ((await pg.evaluate(ST)).block) bad.push(tag + "the shield stays up after Block is let go");
  // Skill.
  await waitFight(pg, 0.5); await tapOr('[data-act="skill"]', "l"); await waitFight(pg, 0.3);
  if (!((await pg.evaluate(ST)).skillCd > 0)) bad.push(tag + "the path skill did not fire");
  // Aid: herbs (hurt first), the divine weapon, the call.
  await pg.evaluate(() => { clearInterval(window.__alive); const p = K.Combat.player(); p.hp = Math.round(p.maxHp * 0.4); });
  const h0 = await pg.evaluate(ST);
  if (touch) { await pg.tap('#rt [data-act="aid"]'); await sleep(400); const p = await pg.evaluate(ST); if (!p.paused || p.sheet !== "aid") bad.push(tag + "Aid did not open, paused"); await pg.tap('#rt .aid-sheet [data-aid="herbs"]'); }
  else await pg.keyboard.press("h");
  await waitFight(pg, 1.6);
  const h1 = await pg.evaluate(ST);
  if (!(h1.hp > h0.hp) || !(h1.herbs < h0.herbs)) bad.push(tag + "herbs did not heal (" + h0.hp + " → " + h1.hp + ", herbs " + h0.herbs + " → " + h1.herbs + ")");
  await keepAlive(pg);
  if (touch) { await pg.tap('#rt [data-act="aid"]'); await sleep(400); await pg.tap('#rt .aid-sheet [data-aid="call"]'); } else await pg.keyboard.press("c");
  await waitFight(pg, 1);
  const c1 = await pg.evaluate(ST);
  if (!c1.allies.includes("bhima")) bad.push(tag + "the call for help brought no one (" + c1.allies.join(",") + ")");
  await keepLow(pg); await sleep(150); // (outside the war a divine weapon only under a tenth of your life: owner, 9 November)
  if (touch) { await pg.tap('#rt [data-act="aid"]'); await sleep(400); await pg.tap('#rt .aid-sheet [data-aid="astra"]'); } else await pg.keyboard.press("u");
  if (!(await traceMantra(pg, touch ? "tap" : "keys"))) bad.push(tag + "no mantra to trace came up for the divine weapon");
  await waitFight(pg, 0.1, 3000);
  const a1 = await pg.evaluate(ST);
  if (!(a1.frozen > 0) && !a1.used.astra) bad.push(tag + "the divine weapon was not loosed");
  await keepAlive(pg);
  await sleep(1000); await waitFight(pg, 0.5);
  // Orders: the friend's preset. (The panel burns out by itself after 6 s; on a slow machine it is opened again.)
  let setHold = false;
  for (let tries = 0; tries < 3 && !setHold; tries++) {
    if ((await pg.evaluate(ST)).sheet !== "orders") { if (touch) await pg.tap('#rt [data-act="orders"]'); else await pg.keyboard.press("o"); await sleep(300); }
    const o0 = await pg.evaluate(ST);
    if (o0.sheet !== "orders" || !o0.paused) { bad.push(tag + "Orders did not open, paused"); break; }
    const hb = await pg.$('#rt .orders-sheet .sec.on [data-fr="hold"]');
    if (!hb) { bad.push(tag + "Orders shows no presets for Bhima (" + (await pg.evaluate(() => (document.querySelector("#rt .orders-sheet") || {}).innerText || "")).replace(/\s+/g, " ").slice(0, 120) + ")"); break; }
    const inPanel = await hb.evaluate((b) => { const r = b.getBoundingClientRect(), p = b.closest(".sheet").getBoundingClientRect(), at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.width > 0 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1 && r.left >= p.left - 1 && r.right <= p.right + 1 && (at === b || b.contains(at)); });
    if (!inPanel) { bad.push(tag + "Hold back lies outside the Orders panel or under something: it cannot be tapped"); break; }
    try { if (touch) await hb.tap({ timeout: 3000 }); else await hb.click({ timeout: 3000 }); } catch (e) { continue; }
    await sleep(150);
    setHold = (await pg.evaluate(ST)).orders.friend === "hold";
  }
  if (!setHold && !bad.some((b) => b.startsWith(tag + "Orders") || b.startsWith(tag + "Hold back"))) bad.push(tag + "Hold back was not set");
  const rs = await pg.$("#rt .orders-sheet:not([hidden]) [data-resume]");
  if (rs) await (touch ? rs.tap({ timeout: 3000 }) : rs.click({ timeout: 3000 })).catch(() => {});
  await sleep(300);
  if ((await pg.evaluate(ST)).paused) bad.push(tag + "Resume ▶ did not resume");
  // Pause and Resume.
  if (touch) await pg.tap('#rt [data-act="pause"]'); else await pg.keyboard.press("p");
  await sleep(300);
  const p1 = await pg.evaluate(ST); await sleep(500); const p2 = await pg.evaluate(ST);
  if (!p1.paused || p1.sheet !== "pause") bad.push(tag + "Pause did not pause");
  if (p2.t !== p1.t) bad.push(tag + "the fight ran on while paused");
  if (touch) await pg.tap("#rt .pause-sheet [data-close]"); else await pg.keyboard.press("Escape");
  await sleep(300);
  if ((await pg.evaluate(ST)).paused) bad.push(tag + "Resume (or Esc) did not resume");
  await endFight(pg);
  // The archer: Roll; and Spare (E, or a tap on the plea).
  await fight(pg, "e_gandharva", { life: { act: 5, age: 38, path: "archer" } });
  await keepAlive(pg);
  const r0 = await pg.evaluate(ST);
  await tapOr('[data-act="roll"]', "k"); await waitFight(pg, 0.5);
  if (!((await pg.evaluate(ST)).rolls > r0.rolls)) bad.push(tag + "Roll did not roll");
  if (!touch) {
    // A click on a foe strikes; a click on the ground walks.
    const b0 = await pg.evaluate(ST);
    const pt = await pg.evaluate(() => { const V = K.UI.rtScreen(), f = V.R.B.units.find((u) => u.side === "enemy" && u.hp > 0 && u.rt.entered); const a = V.actors.get(f.uid); const r = (a.svg.querySelector(".pp-torso") || a.svg).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await pg.mouse.click(pt.x, pt.y);
    if (!(await pg.evaluate(() => { const w = K.UI.rtScreen().walk; return !!(w && w.foe) || K.UI.rtScreen().R.stats.blows > 0; }))) bad.push(tag + "a click on a foe's body did not pick him out"); await waitFight(pg, 2.5);
    if (!((await pg.evaluate(ST)).blows > b0.blows)) bad.push(tag + "a click on a foe did not strike");
    const g0 = await pg.evaluate(ST);
    const gp = await pg.evaluate(() => { const V = K.UI.rtScreen(), r = V.stage.getBoundingClientRect(); return { x: r.left + V.G.fx0 + V.G.FW * 0.15, y: r.top + r.height * 0.85 }; });
    await pg.mouse.click(gp.x, gp.y); await waitFight(pg, 1.5);
    if (!((await pg.evaluate(ST)).x < g0.x - 0.02)) bad.push(tag + "a click on the ground did not walk you there");
  }
  // Spare: bring one foe to 4% and step up to him.
  await pg.evaluate(() => { const V = K.UI.rtScreen(), p = K.Combat.player(), f = V.R.B.units.find((u) => u.side === "enemy" && u.hp > 0 && u.rt.entered); f.hp = Math.max(1, Math.floor(f.maxHp * 0.04)); p.rt.x = Math.max(0.12, f.rt.x - 0.1); window.__spareUid = f.uid; });
  await waitFight(pg, 1.2);
  await pg.evaluate(() => { const V = K.UI.rtScreen(), p = K.Combat.player(), f = V.R.B.units.find((u) => u.uid === window.__spareUid); p.rt.x = Math.max(0.12, f.rt.x - 0.08); });
  await waitFight(pg, 0.3);
  if (touch) { const t = await pg.$("#rt .plea i"); if (t) await t.tap().catch(() => bad.push(tag + "the Spare on the kneeling foe could not be tapped")); else bad.push(tag + "no Spare on the kneeling foe"); } else await pg.keyboard.press("e");
  await waitFight(pg, 0.3);
  if (!((await pg.evaluate(ST)).spared > 0)) bad.push(tag + "Spare did not spare the kneeling foe");
  await endFight(pg);
  bad.push(...errs.map((e) => tag + e));
  await close();
}
browser("controls-touch", "every real-time control works by touch on an iPhone SE and an iPhone 15", async () => { const bad = []; for (const d of ["iPhone SE", "iPhone 15"]) await controlChecks(d, bad); return bad; });
browser("controls-keys", "every real-time control works by key and click on a laptop", async () => { const bad = []; await controlChecks("laptop", bad); return bad; });

browser("controls-war", "the war day: place, move cards, a tap on a foe, the timed read, Aid, by touch and on a laptop", async () => {
  const bad = [];
  for (const dev of ["iPhone SE", "laptop"]) {
    const tag = dev + ": ", touch = dev !== "laptop";
    const { pg, errs, close } = await open({ device: dev });
    const tp = async (sel) => { const b = await pg.$(sel); if (!b) return false; try { if (touch) await b.tap({ timeout: 4000 }); else await b.click({ timeout: 4000 }); } catch (e) { return false; } return true; };
    await fight(pg, "e_day16", { life: { path: "mace" } });
    await keepAlive(pg);
    // (Build B: after your move the round is fought in a real-time clash; Fall back hands it back to the orders.)
    const w = () => pg.evaluate(() => { const V = K.UI.warScreen(); return V && { round: V.B.round, place: V.B.place, placed: !!V.placed, read: !!document.querySelector("#rt .wd-read [data-rd]"), playing: !!V.playing, over: !!V.over, order: V.B.order, hp: K.Combat.player().hp, herbs: K.S.items.herbs, sheet: V.sheet, clashing: !!V.clashing || !!V.B.clashPending }; });
    let clashes = 0;
    const fallBack = async () => { const b = await pg.$("#rt .cl-back"); if (b) { clashes++; try { if (touch) await b.tap({ timeout: 4000 }); else await b.click({ timeout: 4000 }); } catch (e) { /* the clash ended meanwhile */ } } await sleep(700); };
    if (!(await tp("#rt [data-place]"))) bad.push(tag + "no place cards before round 1");
    await sleep(700);
    if (!(await w()).placed) bad.push(tag + "a tap on a place card did not choose it");
    const r0 = await w();
    let rounds = 0, reads = 0;
    for (let i = 0; i < 40 && rounds < 3; i++) {
      const s = await w(); if (!s || s.over) break;
      if (s.read) { await sleep(1000); await tp('#rt .wd-read [data-rd="block"]'); reads++; await sleep(800); continue; }
      if (s.clashing) { await sleep(1200); await fallBack(); continue; }
      if (s.playing) { await sleep(400); continue; }
      if (await tp('#wd-moves [data-move="strike"]:not([disabled])')) { await sleep(300); await tp("#rt .foe-tap:not([hidden])"); await sleep(1500); }
      const s2 = await w(); if (s2) rounds = s2.round - r0.round;
    }
    if (!clashes) bad.push(tag + "no real-time clash after a move on the war day");
    if (rounds < 2) bad.push(tag + "Strike and a tap on a foe played only " + rounds + " rounds (from round " + r0.round + "; the fight " + JSON.stringify(await pg.evaluate(() => K.Combat.state() && K.Combat.state().over)) + ")");
    // Aid: herbs.
    // From here you are kept hurt (40%) but alive, so Herbs is always offered and the day goes on.
    await pg.evaluate(() => { clearInterval(window.__alive); window.__alive = setInterval(() => { const p = K.Combat.player(); if (p) p.hp = Math.max(Math.min(p.hp, Math.round(p.maxHp * 0.6)), Math.round(p.maxHp * 0.4)); }, 50); });
    // Aid while the foes move: it says so. Then at your move: herbs heal.
    const busy = async () => pg.evaluate(() => { const V = K.UI.warScreen(); return !V || V.over || !!V.playing || !!V.qte || !!V.clashing || !!V.B.clashPending || !!(V.B.queue && V.B.queue.length); });
    const settle = async () => { for (let i = 0; i < 40 && (await busy()) && !(await w()).over; i++) { const s = await w(); if (s.read) await tp('#rt .wd-read [data-rd="block"]'); else if (s.clashing) await fallBack(); await sleep(500); } };
    await settle();
    await tp('#wd-moves [data-move="wall"]:not([disabled]), #wd-moves [data-move="guard"]:not([disabled]), #wd-moves [data-move="strike"]:not([disabled])'); await sleep(120);
    if (await busy()) {
      await tp('#rt [data-wact="aid"]'); await sleep(300);
      const hb0 = await pg.$('#rt .aid-sheet [data-aid="herbs"]:not([disabled])');
      if (hb0) { const n0 = (await w()).herbs; if (touch) await hb0.tap().catch(() => {}); else await hb0.click().catch(() => {}); await sleep(150); const said = await pg.evaluate(() => (document.querySelector("#rt .toast") || {}).textContent || ""); if ((await w()).herbs === n0 && !said) bad.push(tag + "herbs tapped while the foes move: nothing happens and nothing is said"); }
    }
    await pg.evaluate(() => { const V = K.UI.warScreen(); const b = V && V.sheet && V.el.querySelector('[data-wact="' + (V.sheet === "company" ? "company" : "aid") + '"]'); if (b) b.click(); });
    await settle();
    await sleep(300);
    if (!(await pg.evaluate(() => K.UI.warScreen() && K.UI.warScreen().sheet === "aid"))) await tp('#rt [data-wact="aid"]');
    await sleep(400);
    const a = await w(); if (a.sheet !== "aid") bad.push(tag + "Aid did not open on the war day (" + JSON.stringify(a) + ")");
    const hb = await pg.$('#rt .aid-sheet [data-aid="herbs"]:not([disabled])');
    if (!hb) bad.push(tag + "no herbs in the war day's Aid");
    else { const h0 = await w(); await (touch ? hb.tap({ timeout: 4000 }) : hb.click({ timeout: 4000 })).catch((e) => bad.push(tag + "the war day's Herbs could not be tapped: " + String(e.message).split("\n")[0])); await sleep(2500); for (let i = 0; i < 10 && (await w()).read; i++) { await tp('#rt .wd-read [data-rd="block"]'); await sleep(900); } const h1 = await w(); if (!(h1.herbs < h0.herbs)) bad.push(tag + "herbs on the war day did nothing (herbs " + h0.herbs + " → " + h1.herbs + ")"); }
    await endFight(pg);
    bad.push(...errs.map((e) => tag + e));
    await close();
  }
  return bad;
});

// Where your friend and soldiers stand and whom they strike over a few seconds, under each order (their blows read from
// the engine's hit events as each step makes them).
async function underOrder(pg, kind, order, secs) {
  await pg.evaluate(([kind, order]) => {
    const V = K.UI.rtScreen(); V.R.orders[kind] = order; window.__allyHits = [];
    if (!window.__stepWrapped) { window.__stepWrapped = true; const orig = K.RT.step; K.RT.step = function (R0) { const n0 = R0.fx.length; const out = orig.apply(this, arguments); for (const f of R0.fx.slice(n0)) if (f.k === "hit" && f.by) window.__allyHits.push(f.by); return out; }; }
  }, [kind, order]);
  return pg.evaluate(async ([kind, secs]) => {
    const V = K.UI.rtScreen(), R = V.R, B = R.B, p = K.Combat.player();
    const mine = B.units.filter((u) => u.side === "ally" && u.hp > 0 && (kind === "friend" ? (u.called || u.person) : (u.plural && !u.person && !u.called)));
    const ids = new Set(mine.map((u) => u.uid)), samples = [], t0 = R.t;
    await new Promise((res) => { const iv = setInterval(() => { if (!K.UI.rtScreen() || R.t - t0 >= secs) { clearInterval(iv); res(); return; } const pp = K.Combat.player(); samples.push(mine.map((u) => ({ dx: (u.rt.x - pp.rt.x) * (pp.rt.face || 1), d: Math.abs(u.rt.x - pp.rt.x), foeD: Math.min(9, ...B.units.filter((e) => e.side === "enemy" && e.hp > 0 && e.rt.entered).map((e) => Math.abs(e.rt.x - u.rt.x))) }))); }, 100); });
    const blows = window.__allyHits.filter((uid) => ids.has(uid)).length;
    const avg = (f) => { const all = samples.flat(); return all.length ? all.reduce((s, x) => s + f(x), 0) / all.length : null; };
    return { n: mine.length, blows, dx: avg((x) => x.dx), d: avg((x) => x.d), foeD: avg((x) => x.foeD), body: K.RT.BODY };
  }, [kind, secs]);
}
browser("orders-friend", "the friend's presets visibly apply (Hold back, All-out, Guard me, Balanced)", async () => {
  const { pg, errs, close } = await open({ device: "laptop" });
  const bad = [];
  await fight(pg, "e_bandits", { life: { act: 5, age: 38, path: "spy" }, S: { bonds: { bhima: 9 }, friend: "bhima" } });
  await keepAlive(pg);
  await pg.keyboard.press("c"); await waitFight(pg, 1.2);
  if (!(await pg.evaluate(() => K.Combat.state().units.some((u) => u.called)))) { await close(); return ["Bhima did not come to be ordered"].concat(errs); }
  // Bhima's own health kept up, and kept on the field past his span (a friend called stays three rounds), so each preset is seen whole.
  await pg.evaluate(() => { clearInterval(window.__ally); window.__ally = setInterval(() => { const B = K.Combat.state(); if (B) B.units.forEach((u) => { if (u.side === "enemy" && u.hp < u.maxHp * 0.3) u.hp = u.maxHp; if (u.called && u.hp > 0) { u.hp = u.maxHp; if (u.rt) u.rt.leaveAt = null; } }); }, 100); });
  const r = {};
  for (const o of ["hold", "allout", "guard", "balanced"]) { await underOrder(pg, "friend", o, 1.5); r[o] = await underOrder(pg, "friend", o, 7); }
  const B = r.hold.body;
  if (r.hold.blows > 0) bad.push("Hold back: Bhima still struck " + r.hold.blows + " blows");
  if (!(r.hold.dx < 0)) bad.push("Hold back: Bhima does not keep behind you (" + (r.hold.dx / B).toFixed(2) + " bodies)");
  if (!(r.allout.blows > 0)) bad.push("All-out: Bhima struck no blow in 7 s");
  if (!(r.allout.foeD < r.hold.foeD - 0.5 * B)) bad.push("All-out: Bhima is no nearer the foes than on Hold back (" + (r.allout.foeD / B).toFixed(2) + " vs " + (r.hold.foeD / B).toFixed(2) + " bodies)");
  if (!(r.guard.d <= 1.6 * B)) bad.push("Guard me: Bhima strays " + (r.guard.d / B).toFixed(2) + " bodies from you on average");
  if (!(r.balanced.blows > 0)) bad.push("Balanced: Bhima struck no blow in 7 s");
  await endFight(pg);
  await close(); return bad.concat(errs);
});
browser("orders-soldiers", "the soldiers' orders visibly apply (Stay out, All-out, Defend)", async () => {
  const { pg, errs, close } = await open({ device: "laptop" });
  const bad = [];
  await fight(pg, "e_guard", { life: { path: "strategist" } });
  await keepAlive(pg);
  const has = await pg.evaluate(() => K.Combat.state().units.some((u) => u.side === "ally" && u.plural && !u.person && !u.called));
  if (!has) { await close(); return ["e_guard has no soldiers beside you"].concat(errs); }
  await pg.evaluate(() => { clearInterval(window.__ally); window.__ally = setInterval(() => { const B = K.Combat.state(); if (B) B.units.forEach((u) => { if (u.side === "enemy" && u.hp < u.maxHp * 0.3) u.hp = u.maxHp; if (u.side === "ally" && u.hp > 0) u.hp = u.maxHp; }); }, 100); });
  const r = {};
  for (const o of ["stay", "allout", "defend"]) { await underOrder(pg, "soldiers", o, 1.5); r[o] = await underOrder(pg, "soldiers", o, 7); }
  const B = r.stay.body;
  if (r.stay.blows > 0) bad.push("Stay out: the soldiers still struck " + r.stay.blows + " blows");
  if (!(r.stay.dx < 0)) bad.push("Stay out: the soldiers do not keep behind you (" + (r.stay.dx / B).toFixed(2) + " bodies)");
  if (!(r.allout.blows > 0)) bad.push("All-out: the soldiers struck no blow in 7 s");
  if (!(r.allout.foeD < r.stay.foeD - 0.5 * B)) bad.push("All-out: the soldiers are no nearer the foes than on Stay out");
  if (!(r.defend.d <= 1.6 * B)) bad.push("Defend: the soldiers stray " + (r.defend.d / B).toFixed(2) + " bodies from you on average");
  // The Orders panel says so.
  await pg.keyboard.press("o"); await sleep(400);
  const lab = await pg.evaluate(() => [...document.querySelectorAll('#rt .orders-sheet [data-so]')].map((b) => b.dataset.so + ":" + b.getAttribute("aria-pressed")));
  if (!lab.includes("defend:true")) bad.push("the Orders panel does not show Defend chosen: " + lab.join(" "));
  await endFight(pg);
  await close(); return bad.concat(errs);
});
browser("orders-war", "the war day's Company orders and Change place apply, and show", async () => {
  const bad = [];
  for (const dev of ["iPhone 15", "laptop"]) {
    const tag = dev + ": ", touch = dev !== "laptop";
    const { pg, errs, close } = await open({ device: dev });
    const tp = async (sel) => { const b = await pg.$(sel); if (!b) return false; try { if (touch) await b.tap({ timeout: 4000 }); else await b.click({ timeout: 4000 }); } catch (e) { return false; } return true; };
    await fight(pg, "e_day1", { life: { path: "charioteer" } });
    await tp('#rt [data-place="middle"]'); await sleep(700);
    const me = () => pg.evaluate(() => { const V = K.UI.warScreen(), uid = K.Combat.player().uid; const el = document.querySelector('#rt [data-uid="' + uid + '"]'); const r = el && el.getBoundingClientRect(); return { place: V.B.place, order: V.B.order || "line", x: r ? r.left + r.width / 2 : null, word: (document.querySelector("#rt .wpill .word") || {}).textContent, wplace: (document.querySelector("#rt .wpill .wplace") || {}).textContent }; });
    const m0 = await me();
    if (m0.place !== "middle") bad.push(tag + "the middle place card did not set the place (" + m0.place + ")");
    for (const ord of ["guardme", "press", "fallback", "line"]) {
      const before = await me();
      await tp('#rt [data-wact="company"]'); await sleep(400);
      const btn = await pg.$('#rt .company-sheet [data-ord="' + ord + '"]');
      if (!btn) { const all = await pg.evaluate(() => [...document.querySelectorAll("#rt .company-sheet [data-ord]")].map((b) => b.dataset.ord)); if (ord === "guardme") bad.push(tag + "Company orders are " + all.join(",")); await tp('#rt [data-wact="company"]'); continue; }
      if (touch) await btn.tap(); else await btn.click();
      await sleep(300);
      const after = await me();
      if (after.order !== ord) bad.push(tag + "the " + ord + " order did not apply (" + after.order + ")");
      if (after.word === before.word && ord !== before.order) bad.push(tag + "the Company button still reads " + JSON.stringify(after.word) + " after " + ord);
      if (await pg.evaluate(() => !!K.UI.warScreen().sheet)) await tp('#rt [data-wact="company"]');
      await sleep(300);
    }
    // Change place: the flank.
    const p0 = await me();
    await tp('#rt [data-wact="company"]'); await sleep(400);
    if (!(await tp('#rt .company-sheet [data-splace="flank"]'))) bad.push(tag + "no Change place in the Company menu");
    await sleep(2500);
    for (let i = 0; i < 6 && (await pg.evaluate(() => !!document.querySelector("#rt .wd-read [data-rd]"))); i++) { await tp('#rt .wd-read [data-rd="block"]'); await sleep(1200); }
    const p1 = await me();
    if (p1.place !== "flank") bad.push(tag + "Change place to the flank did not apply (" + p1.place + ")");
    else if (p0.x != null && p1.x != null && Math.abs(p1.x - p0.x) < 8) bad.push(tag + "your figure did not move when you changed place (" + p0.x + " → " + p1.x + ")");
    if (p1.place === "flank" && p1.wplace === p0.wplace) bad.push(tag + "the Company button still says " + JSON.stringify(p1.wplace) + " after the move to the flank");
    await endFight(pg);
    bad.push(...errs.map((e) => tag + e));
    await close();
  }
  return bad;
});

browser("pause", "a real-time fight stands still while Aid or Orders is open, when the tab is hidden and when the phone turns", async () => {
  const bad = [];
  const { ctx, pg, errs, close } = await open({ device: "iPhone 15" });
  await fight(pg, "e_guard", { life: { path: "charioteer" } });
  await keepAlive(pg);
  const t = () => pg.evaluate(() => { const V = K.UI.rtScreen(); return { t: V.R.t, paused: V.paused, sheet: V.sheet }; });
  for (const which of ["aid", "orders"]) {
    await pg.tap('#rt [data-act="' + which + '"]'); await sleep(300);
    const a = await t(); await sleep(1500); const b = await t();
    if (!a.paused || a.sheet !== which) bad.push(which + " did not open paused (" + JSON.stringify(a) + ")");
    if (b.t !== a.t) bad.push("the fight ran on " + (b.t - a.t).toFixed(2) + " s while " + which + " was open");
    await pg.evaluate((w) => { const r = document.querySelector("#rt ." + w + "-sheet [data-resume]"); if (r) r.click(); }, which); await sleep(300);
    const c = await t(); await sleep(400); const d = await t();
    if (c.paused || !(d.t > c.t)) bad.push("the fight did not go on after " + which + "'s Resume");
  }
  // Aid's panel closes itself after 6 s (the diya): the fight goes on then.
  await pg.tap('#rt [data-act="aid"]'); await sleep(6800);
  const z = await t(); if (z.paused || z.sheet) bad.push("Aid's panel did not burn out after 6 s (" + JSON.stringify(z) + ")");
  // The tab hidden.
  const cdp = await ctx.newCDPSession(pg);
  await pg.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
  await sleep(300);
  const h = await t(); await sleep(800); const h2 = await t();
  if (!h.paused || h.sheet !== "pause") bad.push("hiding the tab did not pause the fight (" + JSON.stringify(h) + ")");
  if (h2.t !== h.t) bad.push("the fight ran on while the tab was hidden");
  await pg.evaluate(() => { delete document.hidden; delete document.visibilityState; Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
  await pg.tap("#rt .pause-sheet [data-close]"); await sleep(300);
  // The phone turned on its side, and back.
  await pg.setViewportSize({ width: 852, height: 393 }); await sleep(600);
  const o = await t(); await sleep(800); const o2 = await t();
  if (!o.paused) bad.push("turning the phone did not pause the fight (" + JSON.stringify(o) + ")");
  if (o2.t !== o.t) bad.push("the fight ran on with the phone turned");
  await pg.setViewportSize({ width: 393, height: 852 }); await sleep(600);
  const back = await t();
  if (!back.paused) bad.push("turned back upright, the fight went on by itself before Resume");
  await pg.evaluate(() => { const b = document.querySelector("#rt .pause-sheet [data-close]"); if (b) b.click(); });
  await cdp.detach().catch(() => {});
  await endFight(pg);
  await close(); return bad.concat(errs);
});

// Bodies at rest: overlap in a row, anyone on you, anyone off the screen.
const SPACE = () => {
  const V = K.UI.rtScreen(); if (!V) return null;
  const R = V.R, p = K.Combat.player(), out = { pairs: [], onYou: [], off: [] };
  const rest = (u) => u.hp > 0 && u.rt && !u.rt.atk && !(u.rt.down > 0) && !(u.rt.stag > 0) && !(u.rt.rec > 0) && !u.leave && !u.spared && (u.side !== "enemy" || u.rt.entered && u.rt.x <= 0.93);
  const bodies = [];
  V.actors.forEach((a) => { const u = a.u; if (!rest(u) || (u === p && (R.roll > 0 || R.block))) return; const b = (a.svg.querySelector(".pp-torso") || a.svg.querySelector(".pp-body")).getBoundingClientRect(); const whole = a.svg.querySelector(".pp-body").getBoundingClientRect(); bodies.push({ u, a, b, whole, lane: Math.round(u.rt.lane) }); });
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const A = bodies[i], B = bodies[j];
    const ov = Math.min(A.b.right, B.b.right) - Math.max(A.b.left, B.b.left), w = Math.min(A.b.width, B.b.width);
    if (ov <= 0) continue;
    const same = A.lane === B.lane && Math.abs(A.u.rt.lane - B.u.rt.lane) < 0.3;
    const share = ov / w;
    if (A.u === p || B.u === p) { const o = A.u === p ? B : A; if (share > 0.5 && o.u.side === "enemy" && Math.abs(o.u.rt.lane - Math.round(o.u.rt.lane)) < 0.05 && !o.u.rt.engaged) /* (one stepping between rows to strike is not at rest) */ out.onYou.push(K.text(o.u.src || o.u.name) + " " + Math.round(share * 100) + "% over you (rows " + p.rt.lane.toFixed(1) + "/" + o.u.rt.lane.toFixed(1) + ")"); continue; }
    if (same && share > 0.25 && A.u.side === B.u.side) out.pairs.push(K.text(A.u.src || A.u.name) + " / " + K.text(B.u.src || B.u.name) + " " + Math.round(share * 100) + "% (row " + A.lane + ")");
  }
  for (const x of bodies) { const r = x.b; if (r.left < -2 || r.right > innerWidth + 2 || r.bottom > innerHeight + 2 || r.top < -2) out.off.push(K.text(x.u.src || x.u.name) + " [" + Math.round(r.left) + "," + Math.round(r.right) + "]"); }
  return out;
};
browser("spacing", "at rest bodies keep apart (a quarter of a width in a row), nobody stands on you, no one is off the screen", async () => {
  const bad = [];
  for (const dev of ["iPhone 15", "laptop"]) {
    const { pg, errs, close } = await open({ device: dev });
    for (let i = 0; i < RT_IDS.length; i++) {
      const enc = RT_IDS[i], path = PATHS[i % 7];
      await fight(pg, enc, { life: LIFE(enc, path), wait: 600 });
      await keepAlive(pg);
      // A bot plays (so the field moves as in a fight); samples every 0.4 s for 12 s.
      await pg.evaluate(() => { const V = K.UI.rtScreen(); window.__bot = setInterval(() => { const W = K.UI.rtScreen(); if (!W || W.R.over) return; const a = K.RT.bot(W.R); W.held.r = a.move > 0; W.held.l = a.move < 0; W.held.block = !!a.block; if (a.strike) W.queue.strike = true; if (a.roll) { W.queue.roll = true; W.queue.rollDir = a.rollDir; } }, 1000 / 30); });
      const seen = { pairs: new Map(), onYou: new Map(), off: new Map() };
      for (let k = 0; k < 30; k++) {
        await sleep(400);
        const s = await pg.evaluate(SPACE); if (!s) break;
        for (const key of ["pairs", "onYou", "off"]) for (const x of s[key]) { const n = x.replace(/ \d+%.*| \[.*/, ""); seen[key].set(n, (seen[key].get(n) || 0) + 1); if (!seen[key].has(n + "#ex")) seen[key].set(n + "#ex", x); }
      }
      await pg.evaluate(() => clearInterval(window.__bot));
      // A pair seen overlapping in a third or more of the samples at rest, or anyone on you or off the screen twice.
      for (const [key, min, what] of [["pairs", 8, "overlap in their row"], ["onYou", 3, "stands on you"], ["off", 2, "off the screen"]]) for (const [n, c] of seen[key]) if (!n.endsWith("#ex") && c >= min) bad.push(dev + " " + enc + " (" + path + "): " + what + ": " + seen[key].get(n + "#ex") + " (" + c + " of 30 samples)");
      await endFight(pg);
    }
    bad.push(...errs.map((e) => dev + ": " + e));
    await close();
  }
  return bad;
});

browser("bars", "the health and breath bars match the engine, blows pop their numbers, the log tells each one", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  await fight(pg, "e_bandits", { life: { act: 5, age: 38, path: "mace" } });
  // A watcher on the page: every hit the engine reports, the hp before and after, and the pop's text.
  await pg.evaluate(() => {
    window.__rec = []; const V = K.UI.rtScreen(), R = V.R;
    const orig = K.RT.step;
    window.__step = orig;
    K.RT.step = function (R0, a) { const B = R0.B, hp = new Map(B.units.map((u) => [u.uid, u.hp])), n0 = R0.fx.length, l0 = B.log.length; const out = orig.apply(this, arguments); for (const f of R0.fx.slice(n0)) if (f.k === "hit" && f.n > 0) { const u = B.units.find((x) => x.uid === f.uid); window.__rec.push({ uid: f.uid, n: f.n, drop: hp.get(f.uid) - u.hp, logged: B.log.slice(l0).some((l) => l.v && l.v.n === f.n || l.key && /\{n\}/.test(l.key)), side: u.side }); } return out; };
  });
  let barBad = 0, samples = 0;
  for (let i = 0; i < 40; i++) {
    await pg.evaluate(() => { const W = K.UI.rtScreen(); if (!W) return; const a = K.RT.bot(W.R); W.held.r = a.move > 0; W.held.l = a.move < 0; W.held.block = !!a.block; if (a.strike) W.queue.strike = true; });
    await sleep(250);
    const b = await pg.evaluate(() => { const V = K.UI.rtScreen(); if (!V) return null; const p = K.Combat.player(), R = V.R; const w = (id) => { const e = document.getElementById(id); return e ? parseFloat(e.style.width) : null; }; return { hp: p.hp / p.maxHp * 100, br: R.breath / K.RT.P.breathMax * 100, bhp: w("b-hp"), bbr: w("b-br") }; });
    if (!b) break;
    samples++;
    if (b.bhp == null || Math.abs(b.bhp - b.hp) > 3 || b.bbr == null || Math.abs(b.bbr - b.br) > 6) { barBad++; if (barBad === 1) bad.push("a bar does not match: health " + b.hp.toFixed(1) + "% drawn " + b.bhp + "%, breath " + b.br.toFixed(1) + "% drawn " + b.bbr + "%"); }
    await pg.evaluate(() => { const p = K.Combat.player(); if (p.hp < p.maxHp * 0.3) p.hp = p.maxHp; });
  }
  const rec = await pg.evaluate(() => { K.RT.step = window.__step; return window.__rec; });
  if (barBad > 2) bad.push(barBad + " of " + samples + " samples with a bar off");
  if (!rec.length) bad.push("no blow landed in 10 s of the bot's fight");
  const wrongDrop = rec.filter((r) => r.drop !== r.n);
  if (wrongDrop.length) bad.push(wrongDrop.length + " of " + rec.length + " blows took a different amount of health than they said (e.g. " + JSON.stringify(wrongDrop[0]) + ")");
  const unlogged = rec.filter((r) => !r.logged);
  if (unlogged.length) bad.push(unlogged.length + " of " + rec.length + " blows have no line in the fight's log (e.g. " + JSON.stringify(unlogged[0]) + ")");
  await endFight(pg);
  await close(); return bad.concat(errs);
});

browser("spare-ui", "a foe kneels and asks only at 5%; Spare lets the fight go on; sparing every foe ends on the spare branch", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  await fight(pg, "e_gandharva", { life: { act: 5, age: 38, path: "charioteer" } });
  await keepAlive(pg);
  const foes = await pg.evaluate(() => K.Combat.state().units.filter((u) => u.side === "enemy" && u.hp > 0 && u.rt.entered).map((u) => u.uid));
  const at = (uid, k) => pg.evaluate(([uid, k]) => { const u = K.Combat.state().units.find((x) => x.uid === uid); u.hp = Math.max(1, Math.floor(u.maxHp * k)); const p = K.Combat.player(); p.rt.x = Math.max(0.12, u.rt.x - 0.08); }, [uid, k]);
  const plea = (uid) => pg.evaluate((uid) => { const a = K.UI.rtScreen().actors.get(uid); const t = a && a.el.querySelector(".plea"); return t ? t.dataset.s + ":" + t.textContent : ""; }, uid);
  await at(foes[0], 0.06); await sleep(1200);
  if (await plea(foes[0])) bad.push("a foe at 6% asks for mercy: " + (await plea(foes[0])));
  await at(foes[0], 0.04); await sleep(1500);
  await pg.evaluate((uid) => { const u = K.Combat.state().units.find((x) => x.uid === uid); K.Combat.player().rt.x = Math.max(0.12, u.rt.x - 0.08); }, foes[0]); await sleep(300);
  const p = await plea(foes[0]);
  if (!/^ask:Mercy!/.test(p)) bad.push("a foe at 4% does not kneel and ask (" + JSON.stringify(p) + ")");
  const knelt = await pg.evaluate((uid) => { const a = K.UI.rtScreen().actors.get(uid); return !!(a.u.rt.beaten && (a.rig ? a.rig.pose === "kneel" : /pose-kneel/.test(a.svg.getAttribute("class")))); }, foes[0]);
  if (!knelt) bad.push("the beaten foe is not drawn kneeling");
  const t = await pg.$("#rt .plea i"); if (t) await t.tap(); else bad.push("no Spare to tap");
  await sleep(800);
  const s = await pg.evaluate(() => ({ over: K.UI.rtScreen() && K.UI.rtScreen().R.over, spared: K.Combat.state().units.filter((u) => u.spared).length, live: K.Combat.state().units.filter((u) => u.side === "enemy" && u.hp > 0 && !u.spared).length }));
  if (s.spared !== 1) bad.push("Spare did not spare him (" + JSON.stringify(s) + ")");
  if (s.over) bad.push("the fight ended when one foe of several was spared (" + s.over + ")");
  // Spare every one left: the fight ends on its spare branch.
  for (let i = 0; i < 6; i++) {
    const left = await pg.evaluate(() => K.Combat.state() && K.Combat.state().units.filter((u) => u.side === "enemy" && u.hp > 0 && !u.spared && (u.rt.entered || u.rt.wave)).map((u) => u.uid));
    if (!left || !left.length) break;
    await pg.evaluate((uid) => { const u = K.Combat.state().units.find((x) => x.uid === uid); u.rt.entered = true; u.rt.x = Math.min(0.85, u.rt.x); }, left[0]);
    await at(left[0], 0.03); await sleep(1500);
    await pg.evaluate((uid) => { const u = K.Combat.state().units.find((x) => x.uid === uid); K.Combat.player().rt.x = Math.max(0.12, u.rt.x - 0.08); }, left[0]); await sleep(200);
    await pg.keyboard.press("e"); await sleep(600);
  }
  await sleep(2500);
  const end = await pg.evaluate(() => window.__ended);
  if (end !== "spare") bad.push("sparing every foe ended the fight as " + JSON.stringify(end) + ", not spare");
  await close(); return bad.concat(errs);
});

browser("retry-ui", "Try again: once, at 80%, the call still used, you slump under it; none in a fight that is not deadly", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  await fight(pg, "e_guard", { life: { path: "charioteer" }, S: { boons: ["astra"] } });
  const lethal = await pg.evaluate(() => !!K.Combat.state().enc.lethal);
  if (!lethal) bad.push("e_guard is not deadly: pick another fight for this check");
  await pg.evaluate(() => { const p = K.Combat.player(); p.hp = Math.round(p.maxHp * 0.4); }); // (in the war: below half your health)
  await pg.keyboard.press("u"); await traceMantra(pg, "tap"); await sleep(3200);
  if (!(await pg.evaluate(() => !!K.Combat.state().used.astra))) bad.push("the divine weapon was not loosed before the loss");
  await pg.evaluate(() => { K.Combat.player().hp = 0; });
  await sleep(1200);
  const r = await pg.evaluate(() => { const V = K.UI.rtScreen(); const me = V && V.actors.get(K.Combat.player().uid); return V && { over: V.R.over, sheet: V.sheet, slumped: !!(me && me.el.classList.contains("slumped")), fell: !!(me && me.el.classList.contains("down")), text: (document.querySelector("#rt .pause-sheet") || {}).innerText || "" }; });
  if (!r || r.over !== "retry" || r.sheet !== "retry") bad.push("a first loss in a deadly fight did not offer Try again (" + JSON.stringify(r) + ")");
  else {
    if (!r.slumped) bad.push("you are not drawn slumped while Try again is offered");
    if (!/Try again/.test(r.text) || !/Accept the loss/.test(r.text)) bad.push("the Try again sheet reads " + JSON.stringify(r.text.slice(0, 120)));
    await pg.tap("#rt [data-retry]"); await sleep(1000);
    const r2 = await pg.evaluate(() => { const V = K.UI.rtScreen(), p = K.Combat.player(), hp = p.hp / p.maxHp; p.hp = Math.round(p.maxHp * 0.4); return { hp, used: Object.assign({}, V.R.B.used), astraReady: K.RT.astras(V.R).some((a) => !a.why), tries: V.R.tries, slumped: [...V.actors.values()].some((a) => a.el.classList.contains("slumped")) }; });
    if (Math.abs(r2.hp - 0.8) > 0.02) bad.push("the second try starts at " + Math.round(r2.hp * 100) + "% health, not 80%");
    if (r2.astraReady) bad.push("the divine weapon used before the loss is ready again on the second try");
    if (r2.slumped) bad.push("still drawn slumped on the second try");
    await pg.evaluate(() => { K.Combat.player().hp = 0; });
    await sleep(2500);
    const r3 = await pg.evaluate(() => ({ sheet: K.UI.rtScreen() && K.UI.rtScreen().sheet, ended: window.__ended }));
    if (r3.sheet === "retry") bad.push("Try again was offered a second time");
    if (r3.ended !== "lose") bad.push("the second loss ended as " + JSON.stringify(r3.ended));
  }
  // A fight that is not deadly: no Try again.
  await fight(pg, "e_bandits", { life: { act: 5, age: 38, path: "mace" } });
  await pg.evaluate(() => { K.Combat.player().hp = 0; }); await sleep(1500);
  const n = await pg.evaluate(() => ({ sheet: K.UI.rtScreen() && K.UI.rtScreen().sheet, ended: window.__ended }));
  if (n.sheet === "retry") bad.push("Try again offered in a fight that is not deadly");
  await endFight(pg);
  await close(); return bad.concat(errs);
});

browser("astra-ui", "a divine weapon in real time plays its full moment, and a champion answers with his counter-weapon", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  // A plain fight: the Agneyastra on the bandits.
  await fight(pg, "e_bandits", { life: { act: 5, age: 38, path: "archer", side: null }, S: { astras: ["agneya"] } });
  await keepLow(pg); // (outside the war: only under a tenth of your life)
  await pg.evaluate(() => { window.__ax = []; const st = document.getElementById("rt-stage"); const mo = new MutationObserver(() => { const cls = st.className + " | " + [...st.querySelectorAll(".ax, .ax *")].map((e) => e.className && e.className.baseVal != null ? e.className.baseVal : e.className).join(" "); window.__ax.push([performance.now(), cls]); }); mo.observe(st, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] }); window.__axMo = mo; });
  await pg.tap('#rt [data-act="aid"]'); await sleep(350);
  const t0 = await pg.evaluate(() => performance.now());
  const b = await pg.$('#rt .aid-sheet [data-aid="astra"]:not([disabled])');
  if (!b) { bad.push("the Agneyastra is not offered in Aid"); } else {
    await b.tap();
    // Its mantra first: the fight stands still while the sign is traced.
    if (!(await pg.$(".mantra")) && !(await pg.waitForSelector(".mantra", { timeout: 1500 }).catch(() => null))) bad.push("no mantra to trace came up");
    else {
      const st = await pg.evaluate(() => ({ paused: K.UI.rtScreen().paused, t: K.UI.rtScreen().R.t, dots: document.querySelectorAll(".mantra .mn-dot").length, text: document.querySelector(".mantra").innerText }));
      await sleep(500);
      if (!st.paused || (await pg.evaluate(() => K.UI.rtScreen().R.t)) !== st.t) bad.push("the fight did not stand still while the mantra was traced");
      if (st.dots < 4) bad.push("the Agneyastra's sign has " + st.dots + " lights");
      if (!/2 of 3|3 of 3/.test(st.text)) bad.push("the mantra does not say the uses left: " + JSON.stringify(st.text.slice(0, 80)));
      await traceMantra(pg, "tap");
    }
    const f = []; for (let i = 0; i < 16; i++) { f.push(await pg.evaluate(() => { const V = K.UI.rtScreen(); return V && { frozen: V.R.frozen, ax: !!V.ax, t: V.R.t }; })); await sleep(200); }
    const log = await pg.evaluate(() => { window.__axMo.disconnect(); return window.__ax; });
    const joined = log.map((x) => x[1]).join(" ");
    if (!f.some((x) => x && x.frozen > 0)) bad.push("the fight did not freeze for the moment");
    const frozenT = f.filter((x) => x && x.frozen > 0).length * 0.2;
    if (frozenT < 1.4) bad.push("the moment lasted only about " + frozenT.toFixed(1) + " s");
    if (!/\bax\b/.test(joined)) bad.push("no divine weapon's moment (.ax) drawn on the stage");
    for (const [what, re] of [["the blink", /blink/], ["the white-hot flash", /flash|white/], ["the ring-shaped pulse", /ring|pulse/], ["the heavy shake", /bigshake|shake/]]) if (!re.test(joined)) bad.push("the moment has no " + what + " (classes seen: " + [...new Set(joined.split(/\s+/))].filter((c) => /ax|flash|ring|blink|shake|pulse|sweep|fire|agne/.test(c)).slice(0, 20).join(" ") + ")");
    const hit = await pg.evaluate(() => K.Combat.state().units.filter((u) => u.side === "enemy" && u.hp < u.maxHp).length);
    if (!hit) bad.push("the Agneyastra struck no foe");
  }
  await endFight(pg);
  // A champion who can answer: Ashwatthama at the night raid.
  const hero = await pg.evaluate(() => { const out = []; for (const id of ["e_raid", "e_ash", "e_dushasana", "cross_e_duel", "e_jaya", "e_road", "e_kings"]) { const e = K.ENCOUNTERS[id]; const list = (K.val(e.enemies) || []).map((u) => (typeof u === "string" && K.UNITS[u] ? K.UNITS[u](K.S || K.newLife()) : u)); if (list.some((u) => u && u.hero)) out.push(id); } return out; });
  {
    const enc = hero[0] || "e_raid"; // (the night raid's Ashwatthama)
    await fight(pg, enc, { life: LIFE(enc, "archer"), S: { astras: ["agneya"] } });
    await keepAlive(pg);
    // The clash: both weapons' bolts meet in the middle (the canvas of U.astraFx, with the screen's shake) and the moment knows it.
    await pg.evaluate(() => { window.__clash = false; window.__axMo2 = new MutationObserver(() => { const V = K.UI.rtScreen(); if (document.body.classList.contains("ax-shake") && V && V.ax && V.ax.clash) window.__clash = true; }); window.__axMo2.observe(document.body, { attributes: true, attributeFilter: ["class"] }); });
    // Up to the champion first.
    await pg.evaluate(() => { const B = K.Combat.state(), h = B.units.find((u) => u.side === "enemy" && u.hero && u.hp > 0); if (h) { h.rt.entered = true; K.Combat.player().rt.x = Math.max(0.12, h.rt.x - 0.15); } });
    await pg.keyboard.press("u"); await traceMantra(pg, "tap"); await sleep(3200);
    const r = await pg.evaluate(() => ({ out: K.Combat.state().astraOut, clash: window.__clash, log: K.Combat.state().log.slice(-12).map((l) => K.Combat.line(l)).join(" | ") }));
    if (!r.out || !r.out.clash) bad.push(enc + ": the champion did not answer the divine weapon (" + JSON.stringify(r.out) + "; " + r.log.slice(0, 200) + ")");
    else if (!r.clash) bad.push(enc + ": the counter-weapon's clash was not drawn");
    await endFight(pg);
  }
  await close(); return bad.concat(errs);
});

browser("turns-switch", "with Fights: turn-based, every real-time fight opens on the war-day screen (set in the Menu)", async () => {
  const { pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  // The Menu's switch, tapped.
  await pg.evaluate(() => { const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", temperament: "bold", heirloom: "bow", age: 38, act: 5 })); K.go(Object.keys(K.SCENES).find((id) => K.SCENES[id].act === 5 && !K.SCENES[id].ending && !K.SCENES[id].when) || "a5_child"); });
  await sleep(1200);
  await pg.tap("#nav-menu"); await sleep(600);
  const seg = await pg.$('[data-fights="turns"]');
  if (!seg) bad.push("the Menu has no Fights: turn-based");
  else { await seg.tap(); await sleep(200); }
  await pg.evaluate(() => K.UI.closeModal());
  if (await pg.evaluate(() => K.RT.mode()) !== "turns") bad.push("the switch did not set turn-based");
  for (const enc of RT_IDS) {
    await fight(pg, enc, { life: LIFE(enc, "mace"), wait: 500 });
    const s = await pg.evaluate(() => ({ rt: !!K.UI.rtScreen(), war: !!K.UI.warScreen(), old: !!document.querySelector("#battle-actions") }));
    if (!s.war || s.rt || s.old) bad.push(enc + ": opened " + (s.rt ? "the real-time screen" : s.old ? "the old turn-based screen" : "no war-day screen"));
    await endFight(pg);
  }
  await pg.evaluate(() => K.prefs({ fights: "realtime" }));
  await close(); return bad.concat(errs);
});

T.run();
