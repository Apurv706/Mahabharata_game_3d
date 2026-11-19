// Where the player's body overlaps a drawn horse: what is drawn against what stops you (18 November, Version 74).
//   RAM=1 drives you straight at the nearest horse; ROLL=1 rolls at it too. Counts frames with you, standing, inside a horse.
//   node tools/review/horses.js fightId[,fightId...] [seed] [path] [side]
const path = require("path"), GAME = process.env.GAME || path.join(__dirname, "..", "..");
const serve = require(GAME + "/tools/serve.js");
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const fs = require("fs");
const RAM = !!process.env.RAM, ROLL = !!process.env.ROLL; const fights = process.argv[2].split(","), seed = +(process.argv[3] || 5), PATH = process.argv[4] || "mace", SIDE = process.argv[5] || "pandava";
(async () => {
  const { srv, url } = await serve(0);
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"] });
  for (const fight of fights) {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.25 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
    await page.route(/fonts\./, (r) => r.abort());
    await page.addInitScript({ path: path.join(__dirname, "vclock.js") });
    await page.goto(url + "/index.html?3d=1", { waitUntil: "load" });
    for (let i = 0; i < 15; i++) await page.evaluate(() => __step(33.333));
    await page.evaluate(({ fight, seed, PATH, SIDE, RAM, ROLL }) => {
      const K = window.K, G = K.G3, S = (K.S = K.newLife()); K.seed(seed);
      Object.assign(S, { name: "Ira", pronoun: "she", origin: "panchala", temperament: "bold", heirloom: "bow", age: 44, act: 6, side: SIDE, path: PATH });
      for (const k in S.attrs) S.attrs[k] = 4; for (const k in S.skills) S.skills[k] = 3; S.items.herbs = 2; S.flags.push("role_front");
      K.prefs({ gfx: "high", fightView: "behind", tips3d: { mark: 1, move: 1, view: 1 } }); K.UI.battleCount = 900;
      const oh = G.horse; G.horse = function () { const h = oh.apply(this, arguments); h.userData.__horse = true; return h; };
      const R3 = K.RT3, orig = R3.bot, TAPS = ["strike", "roll", "skill", "astra", "herbs", "call", "cover", "layDown", "spare", "vanish", "orders", "withdraw"]; let last = -9, blocking = false;
      if (!window.__nopace) R3.bot = function (R, opt) { const a = orig.call(this, R, opt) || {}; const now = performance.now() / 1000; const wants = TAPS.filter((k) => a[k]); const blockOn = !!a.block && !blocking;
        if (wants.length || blockOn) { if (now - last < 0.2) { for (const k of TAPS) delete a[k]; if (blockOn) delete a.block; } else { last = now; for (const k of wants.slice(1)) delete a[k]; } } blocking = !!a.block; return a; };
      if (window.__ram || 1) { const T = window.THREE, v = new T.Vector3(); const base = R3.bot; let tgt = null, tt = -9;
        R3.bot = function (R, opt) { const now = performance.now() / 1000, p = K.Combat.player();
          if (!p || !p.g || !RAM) return base.call(this, R, opt);
          if (now - tt > 2.5 || !tgt) { tt = now; let best = 1e9; tgt = null; G.actors.traverse((o) => { if (!o.userData.__horse) return; o.getWorldPosition(v); const d = Math.hypot(v.x - p.g.x, v.z - p.g.z); if (d < best && Math.hypot(v.x, v.z) < 40) { best = d; tgt = o; } }); }
          if (!tgt) return base.call(this, R, opt);
          tgt.getWorldPosition(v); const dx = v.x - p.g.x, dz = v.z - p.g.z, d = Math.hypot(dx, dz) || 1; const a = { mx: dx / d, mz: dz / d, run: true }; if (ROLL && d < 4 && now - (window.__lr || 0) > 0.7) { a.roll = true; window.__lr = now; } return a; }; }
      { const st0 = R3.step; R3.step = function (R, a) { window.__R = R; return st0.apply(this, arguments); }; }
      window.__hits = []; window.__nh = 0; window.__out = undefined;
      K.UI.startBattle(fight, (o) => { window.__out = o; });
    }, { fight, seed, PATH, SIDE, RAM, ROLL });
    const off = () => page.evaluate(() => { const G = window.K.G3; if (G && G.renderer) G.renderer.render = () => {}; });
    await off();
    // through the opening to the field
    for (let i = 0; i < 400; i++) { const go = await page.evaluate(() => { const b = document.getElementById("battle-go"); if (b) { b.click(); return true; } const t = document.querySelector(".b-intro"); if (t) t.click(); for (let j = 0; j < 6; j++) __step(33.333); return false; }); if (go) break; }
    await page.evaluate(() => { window.K.UI.battleBot = true; });
    let steps = 0;
    for (; steps < 30 * 75; steps += 15) {
      const done = await page.evaluate(() => {
        const K = window.K, G = K.G3, T = window.THREE, v = new T.Vector3(), q = new T.Quaternion(), e = new T.Euler();
        for (let s = 0; s < 15; s++) {
          __step(33.333);
          const p = K.Combat.player(); if (!p || !p.g || window.__out !== undefined) return true;
          const px = p.g.x, pz = p.g.z, pr = p.g.rad || 0.42; const alive = p.hp > 0 && !(p.g.down > 0) && !p.g.ride;
          let nh = 0;
          G.actors.traverse((o) => {
            if (!o.userData.__horse || !o.visible) return; nh++;
            let vis = true; for (let a = o; a; a = a.parent) if (!a.visible) vis = false; if (!vis) return;
            o.getWorldPosition(v); o.getWorldQuaternion(q); e.setFromQuaternion(q, "YXZ");
            const ex = Math.sin(e.y), ez = Math.cos(e.y), dx = px - v.x, dz = pz - v.z;
            const along = dx * ex + dz * ez, side = Math.abs(dx * ez - dz * ex);
            // a horse's body: about 1.1 m either way along it, 0.3 m to each side of its middle
            if (Math.abs(along) < 1.1 + pr * 0.5 && side < 0.3 + pr * 0.6) {
              let owner = "?"; for (let a = o.parent; a; a = a.parent) { if (a.userData && a.userData.horses) { const w = new T.Vector3(); a.getWorldPosition(w); const us = K.Combat.state().units.filter((u) => u.g); const m = us.map((u) => [u.name, u.g.car ? "car" : "foot", Math.hypot(u.g.x - w.x, u.g.z - w.z)]).sort((a, b) => a[2] - b[2])[0]; const mu = us.filter((u) => u.g.car).map((u) => [u, Math.hypot(u.g.x - w.x, u.g.z - w.z)]).sort((a, b) => a[1] - b[1])[0]; const wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d));
                owner = "carAt r=" + Math.hypot(w.x, w.z).toFixed(1) + " nearest unit " + (m ? m[0] + "/" + m[1] + " " + m[2].toFixed(1) + "m" : "none") + (mu && mu[1] < 0.6 ? " drawnYaw-ca=" + wrap(a.rotation.y - (mu[0].g.ca != null ? mu[0].g.ca : mu[0].g.a)).toFixed(2) + " lead=" + (a.userData.lead || 0).toFixed(2) + " ca=" + (mu[0].g.ca != null ? mu[0].g.ca.toFixed(2) : "null") + " a=" + mu[0].g.a.toFixed(2) + " hp=" + Math.round(mu[0].hp) + " still=" + !!mu[0].still : ""); break; } }
              const RR = window.__R, cu = K.Combat.state().units.filter((u) => u.g && u.g.car && u.hp > 0).map((u) => [u.name, +K.RT3.off(u, px, pz).toFixed(2), u.side, u.g.team, +(u.g.cv || 0).toFixed(1)]).sort((a, b) => a[1] - b[1])[0];
              window.__hits.push({ roll: RR ? +(RR.roll || 0).toFixed(2) : null, car: cu, alive, down: +(p.g.down || 0).toFixed(2), hp: Math.round(p.hp), t: +performance.now().toFixed(0), px: +px.toFixed(2), pz: +pz.toFixed(2), hr: +Math.hypot(v.x, v.z).toFixed(2), pr0: +Math.hypot(px, pz).toFixed(2), along: +along.toFixed(2), side: +side.toFixed(2), owner });
            }
          });
          window.__nh = Math.max(window.__nh, nh);
        }
        return false;
      });
      if (done) break;
    }
    const res = await page.evaluate(() => ({ out: window.__out, hits: window.__hits.length, deep: window.__hits.filter((h) => Math.abs(h.along) < 0.9 && h.side < 0.3).length, deepAlive: window.__hits.filter((h) => h.alive && Math.abs(h.along) < 0.9 && h.side < 0.3).length, deepFirst: window.__hits.filter((h) => h.alive && Math.abs(h.along) < 0.9 && h.side < 0.3).slice(0, 2), horses: window.__nh, first: [] }));
    // what kind of horses were they: a unit's car, a parked car, or anything else
    const kinds = await page.evaluate(() => { const K = window.K, G = K.G3, st = K.Combat.state(), us = st.units; return { keys: Object.keys(st).slice(0, 40).join(","), rad: st.rad || (K.RT3.R && K.RT3.R.rad), units: us.filter((u) => u.g).map((u) => [u.name, u.g.car ? "car" + u.g.team : u.g.kind || "", +Math.hypot(u.g.x, u.g.z).toFixed(1), u.person || ""]).filter((x) => x[1].startsWith("car") || x[3]).slice(0, 12), cars: us.filter((u) => u.g && u.g.car).map((u) => u.name + ":" + (u.g.team || "?")).slice(0, 8), rad: K.Combat.state().rad }; }).catch(() => ({}));
    console.log(fight, "secs", (steps / 30).toFixed(0), JSON.stringify(res), JSON.stringify(kinds));
    await ctx.close();
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
