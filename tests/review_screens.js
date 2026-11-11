/* Review of the fight screens' words and speed (the owner's checklist, 4 November):
     hindi-rt      13  in Hindi, nothing on the real-time screen is in English (its bars, buttons, the rules card, the
                       walkthrough, Orders, Aid, Pause, Try again, the plea, the beaten-but-alive card, toasts), and no
                       label spills out of its button, on an iPhone SE, an iPhone 15 and a laptop
     hindi-war     13  the same on the war-day screen (place cards, move cards, Company, Aid, the timed read, the end card)
     fps           15  a three-a-side real-time fight on an iPhone 15's screen with the CPU slowed 4×: the frames drawn
                       a second and the main thread's work per frame are reported; it fails when the game's own script,
                       style and layout pass --work-max ms a frame (60; 35-45 on 4 November), or the whole work allows fewer
                       than --fps-min frames (0: off). In headless Chromium on a shared 2-core machine the page is painted
                       in software and the drawn rate was 9-12 a second (the owner's earlier measure: about 31, conditions
                       unknown): measure the frame rate itself on a real phone.
   Usage: node tests/review_screens.js [--case id,id] [--list] [--json FILE] [--fps-min N] [--work-max MS]   Exits 1 when a case fails. */
"use strict";
const L = require("./review_lib");
const { open, fight, keepAlive, endFight, waitFight, sleep } = L;
const T = L.suite("review_screens", "tests/review_screens.js: Hindi and text fit on the fight screens, and the frame rate");
const { browser } = T;
const FPS_MIN = parseFloat(L.H.arg("--fps-min", "0")); // frames a second the main thread's whole work allows (0: reported only)
const WORK_MAX = parseFloat(L.H.arg("--work-max", "60")); // ms a frame of the game's own script, style and layout at 4x (4 November: 35-45)

// Every visible text in the fight screen: words in Latin letters (not key names) and labels that spill out of their button.
const AUDIT = () => {
  const root = document.getElementById("rt"); if (!root) return { english: [], spill: [] };
  const english = new Set(), spill = new Set();
  const OK = /^(?:[A-Z]|Esc|Space|Shift|Enter|Tab|[IVX]+|×\d|\d+)$/; // key names, roman numerals, ×2
  const vis = (e) => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement; if (!el || el.closest("kbd, script, style, [hidden], .mini") || !vis(el)) continue;
    for (const w of (n.textContent.match(/[A-Za-z][A-Za-z'’-]*/g) || [])) if (!OK.test(w)) english.add(w + " (in " + (el.className || el.tagName).toString().slice(0, 30) + ": " + JSON.stringify(n.textContent.trim().slice(0, 40)) + ")");
  }
  root.querySelectorAll("button").forEach((b) => {
    if (!vis(b)) return;
    const r = b.getBoundingClientRect();
    if (b.scrollWidth > b.clientWidth + 2 && getComputedStyle(b).overflowX !== "visible") spill.add(JSON.stringify(b.textContent.trim().slice(0, 30)) + " is cut (" + b.scrollWidth + " > " + b.clientWidth + ")");
    b.querySelectorAll("b, small, span:not(.flame), i:not(.fr):not(.fl)").forEach((t) => {
      if (!vis(t) || !t.textContent.trim() || t.closest("svg")) return;
      const q = t.getBoundingClientRect();
      if (q.left < r.left - 2 || q.right > r.right + 2 || q.top < r.top - 2 || q.bottom > r.bottom + 2) spill.add(JSON.stringify(t.textContent.trim().slice(0, 30)) + " spills out of its button (" + [q.left - r.left, r.right - q.right, q.top - r.top, r.bottom - q.bottom].map((x) => Math.round(x)).join(",") + ")");
    });
  });
  return { english: [...english], spill: [...spill] };
};
async function audit(pg, where, bad) {
  const r = await pg.evaluate(AUDIT);
  for (const w of r.english) bad.push(where + ": English: " + w);
  for (const s of r.spill) bad.push(where + ": " + s);
}

browser("hindi-rt", "in Hindi no English is left on the real-time screen and no label spills out of its button", async () => {
  const bad = [];
  for (const dev of ["iPhone SE", "iPhone 15", "laptop"]) {
    const { pg, errs, close } = await open({ device: dev, lang: "hi" });
    const tag = dev + " ";
    // The rules card and the walkthrough: a life that has not seen them.
    await pg.evaluate(() => { const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 38, act: 5, path: "mace", side: "pandava", teacher: "drona" })); S.bonds.bhima = 9; S.friend = "bhima"; S.boons.push("astra"); S.items.herbs = 2; K.seed(3); K.UI.startBattle("e_bandits", () => {}); });
    await pg.waitForSelector("#rt"); await sleep(1500);
    await audit(pg, tag + "rules card", bad);
    const go = await pg.$("#rt .fb-go"); if (go) { await go.click(); await sleep(900); }
    for (let i = 0; i < 9 && (await pg.$("#rt .tc-skip")); i++) { await audit(pg, tag + "walkthrough " + (i + 1), bad); await pg.mouse.click(5, 300); await sleep(500); }
    const skip = await pg.$("#rt .tc-skip"); if (skip) { await skip.click(); await sleep(400); }
    await keepAlive(pg);
    await audit(pg, tag + "the fight", bad);
    await pg.keyboard.press("c"); await waitFight(pg, 1.2);
    for (const which of ["orders", "aid", "pause"]) {
      await pg.evaluate((w) => document.querySelector('#rt [data-act="' + w + '"]').click(), which); await sleep(500);
      await audit(pg, tag + which, bad);
      await pg.evaluate(() => { const b = document.querySelector("#rt .sheet:not([hidden]) [data-resume], #rt .sheet:not([hidden]) [data-close]"); if (b) b.click(); }); await sleep(300);
    }
    // A foe kneeling: the plea.
    await pg.evaluate(() => { const B = K.Combat.state(); B.enc = Object.assign({}, B.enc, { spare: B.enc.spare || { text: "x" } }); const f = B.units.find((u) => u.side === "enemy" && u.hp > 0 && u.rt.entered); f.hp = 1; K.Combat.player().rt.x = Math.max(0.12, f.rt.x - 0.08); });
    await waitFight(pg, 0.8);
    await audit(pg, tag + "a foe asks for mercy", bad);
    // A toast and a skill name.
    await pg.keyboard.press("l"); await sleep(200); await audit(pg, tag + "the skill's toast", bad);
    await endFight(pg);
    // Beaten but alive (story mode): the card that says what is written held.
    await fight(pg, "e_bandits", { life: { act: 5, age: 38, path: "archer" }, storyMode: true });
    await pg.evaluate(() => { K.Combat.player().hp = 0; });
    await pg.waitForSelector("#rt .written", { timeout: 15000 }).catch(() => {});
    await audit(pg, tag + "beaten but alive", bad);
    await endFight(pg);
    // Try again (a deadly fight).
    await fight(pg, "e_guard", { life: { path: "charioteer" } });
    await pg.evaluate(() => { K.Combat.player().hp = 0; });
    await sleep(1500); await waitFight(pg, 0.3, 5000);
    await audit(pg, tag + "Try again", bad);
    await endFight(pg);
    bad.push(...errs.map((e) => tag + e));
    await close();
  }
  return [...new Set(bad)];
});

browser("hindi-war", "in Hindi no English is left on the war-day screen and no label spills out of its button", async () => {
  const bad = [];
  for (const dev of ["iPhone SE", "iPhone 15", "laptop"]) {
    const { pg, errs, close } = await open({ device: dev, lang: "hi" });
    const tag = dev + " ";
    await pg.evaluate(() => { const S = (K.S = Object.assign(K.newLife(), { name: "Ira", pronoun: "she", origin: "panchala", age: 44, act: 6, path: "strategist", side: "pandava", teacher: "drona" })); S.flags.push("role_front"); S.items.herbs = 2; S.boons.push("astra"); K.seed(3); K.UI.startBattle("e_day16", () => {}); });
    await pg.waitForSelector("#rt"); await sleep(1500);
    await audit(pg, tag + "rules card", bad);
    const go = await pg.$("#rt .fb-go"); if (go) { await go.click(); await sleep(900); }
    for (let i = 0; i < 9 && (await pg.$("#rt .tc-skip")); i++) { await audit(pg, tag + "walkthrough " + (i + 1), bad); await pg.mouse.click(5, 300); await sleep(500); }
    const skip = await pg.$("#rt .tc-skip"); if (skip) { await skip.click(); await sleep(400); }
    await audit(pg, tag + "place cards", bad);
    await pg.evaluate(() => { const b = document.querySelector("#rt [data-place]"); if (b) b.click(); }); await sleep(600);
    await keepAlive(pg);
    await audit(pg, tag + "move cards", bad);
    for (const w of ["company", "aid"]) {
      await pg.evaluate((w) => document.querySelector('#rt [data-wact="' + w + '"]').click(), w); await sleep(500);
      await audit(pg, tag + w, bad);
      await pg.evaluate((w) => { if (K.UI.warScreen().sheet) document.querySelector('#rt [data-wact="' + w + '"]').click(); }, w); await sleep(300);
    }
    // A round, and its timed read.
    await pg.evaluate(() => { const b = document.querySelector('#wd-moves [data-move="strike"]'); if (b) b.click(); });
    for (let i = 0; i < 20; i++) { if (await pg.$("#rt .wd-read [data-rd]")) { await audit(pg, tag + "the timed read", bad); break; } await sleep(300); }
    // The end card.
    await pg.evaluate(() => { const B = K.Combat.state(); B.units.forEach((u) => { if (u.side === "enemy") u.hp = 0; }); K.Combat.settle("win"); K.UI.renderBattle(B); });
    await pg.waitForSelector("#rt .endcard", { timeout: 10000 }).catch(() => {});
    await audit(pg, tag + "the end card", bad);
    await endFight(pg);
    bad.push(...errs.map((e) => tag + e));
    await close();
  }
  return [...new Set(bad)];
});

browser("fps", "frames a second in a three-a-side real-time fight on an iPhone 15's screen at 4× CPU slowdown", async () => {
  const { ctx, pg, errs, close } = await open({ device: "iPhone 15" });
  const bad = [];
  // You, your soldiers and Bhima against a chariot-warrior, a horseman and a third foe come on.
  await fight(pg, "e_bandits", { life: { act: 5, age: 38, path: "mace" }, S: { bonds: { bhima: 9 }, friend: "bhima" } });
  await keepAlive(pg);
  await pg.keyboard.press("c"); await waitFight(pg, 1);
  await pg.evaluate(() => {
    const B = K.Combat.state(), R = K.UI.rtScreen().R;
    // A third foe and a third on your side, made as the fight makes its own (copies of those there).
    const foe = B.units.find((u) => u.side === "enemy"); const f2 = JSON.parse(JSON.stringify(foe)); f2.uid = "e9"; f2.rt = null; f2.hp = f2.maxHp = foe.maxHp; B.units.push(f2);
    const al = B.units.find((u) => u.side === "ally"); if (al) { const a2 = JSON.parse(JSON.stringify(al)); a2.uid = "a9"; a2.rt = null; a2.called = false; a2.person = null; a2.name = "Panchala spearman"; B.units.push(a2); }
    clearInterval(window.__keepFoes); window.__keepFoes = setInterval(() => B.units.forEach((u) => { if (u.side !== "player" && u.hp < u.maxHp * 0.4) u.hp = u.maxHp; }), 200);
    window.__bot = setInterval(() => { const W = K.UI.rtScreen(); if (!W || W.R.over) return; const a = K.RT.bot(W.R); W.held.r = a.move > 0; W.held.l = a.move < 0; W.held.block = !!a.block; if (a.strike) W.queue.strike = true; }, 1000 / 30);
  });
  await sleep(1500);
  const side = await pg.evaluate(() => { const B = K.Combat.state(); return { us: B.units.filter((u) => u.side !== "enemy" && u.hp > 0).length, them: B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.rt && u.rt.entered).length }; });
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await sleep(1000);
  // Frames drawn in 8 s, and the main thread's work per frame (CDP Performance: task time over the frames drawn). In a
  // headless browser on a shared machine the drawn rate also counts waiting for the CPU; the work per frame says what the
  // game asks of a phone 4x slower: under 40 ms a frame holds 25 frames a second.
  await cdp.send("Performance.enable");
  const m0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  const fps = await pg.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = (t) => { n++; if (t - t0 < 8000) requestAnimationFrame(f); else res({ n, secs: (t - t0) / 1000 }); }; requestAnimationFrame(f); }));
  const m1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  const work = ["TaskDuration"].map((k) => (m1[k] - m0[k]) * 1000)[0] / fps.n, script = (m1.ScriptDuration - m0.ScriptDuration) * 1000 / fps.n, layout = ((m1.LayoutDuration - m0.LayoutDuration) + (m1.RecalcStyleDuration - m0.RecalcStyleDuration)) * 1000 / fps.n;
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await pg.evaluate(() => { clearInterval(window.__bot); clearInterval(window.__keepFoes); });
  const rate = fps.n / fps.secs, cap = 1000 / work;
  console.log("        at 4× CPU slowdown, " + side.us + " a side against " + side.them + ": " + rate.toFixed(1) + " frames a second drawn; main-thread work " + work.toFixed(1) + " ms a frame (script " + script.toFixed(1) + ", style and layout " + layout.toFixed(1) + "), so about " + cap.toFixed(0) + " a second on an idle phone that slow");
  if (side.us < 3 || side.them < 3) bad.push("the fight was " + side.us + " against " + side.them + ", not three a side");
  if (script + layout > WORK_MAX) bad.push("the game's own script, style and layout take " + (script + layout).toFixed(1) + " ms a frame at 4x (at most " + WORK_MAX + "; about 35-45 on 4 November)");
  if (cap < FPS_MIN) bad.push("the main thread's work per frame (" + work.toFixed(1) + " ms) allows only " + cap.toFixed(1) + " frames a second (at least " + FPS_MIN + ")");
  await endFight(pg);
  await close(); return bad.concat(errs);
});

T.run();
