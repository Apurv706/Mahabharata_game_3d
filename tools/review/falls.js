// Falls under the physics engine (js/g3/ragdoll.js), as a strip of stills: figures on a plain studio floor, each
// struck in its own way at time 0, and photographed at the times asked for. The engine is stepped by the tool at sixty
// steps a second, not by the clock, so a slow machine photographs the same fall.
//   node tools/review/falls.js <job.json> <outdir>
// job: { tile: [300, 300], times: [0, 0.15, 0.3, ...], cam: { fov, y, span, tilt, far }, groups: [ { name, items: [ { key, look, pose, item, shield, label,
//        v: [x, y, z], push: [x, y, z], low, spin, alive, rise (the second he is given back to his poses), by: "car" | "elephant" (driven through at 7 m/s),
//        car: true (he rides a chariot; horses: 2 or 4; driver: true; drive: m/s for the first `stop` seconds; wreck: true, its team goes down, a wheel comes off and its driver falls too),
//        beast: "horse" | "elephant" (no man: the beast itself is killed; roll: rad/s onto its side) } ] } ] }
const ROOT = process.env.ROOT || require("path").resolve(__dirname, "../..");
const serve = require(ROOT + "/tools/serve.js"); let pw; try { pw = require("playwright"); } catch (e) { pw = require("/opt/npm-tools/node_modules/playwright"); }
const { chromium } = pw, fs = require("fs"), path = require("path"), cp = require("child_process");
(async () => { const job = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), outdir = process.argv[3]; fs.mkdirSync(outdir, { recursive: true });
  const [tw, th] = job.tile || [300, 300], times = job.times || [0, 0.15, 0.3, 0.5, 0.8, 1.2, 2, 3.5];
  const { srv, url } = await serve(0); const browser = await chromium.launch({ args: ["--no-sandbox", "--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"] });
  for (const g of job.groups) { const slots = g.items.length, W = slots * tw, H = th;
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); const logs = []; page.on("pageerror", (e) => logs.push(String(e.stack || e).slice(0, 500)));
    await page.goto(url + "/index.html?3d=1", { waitUntil: "load" }); await page.waitForFunction(() => window.K_MODELS_READY, null, { timeout: 180000 }); await page.waitForTimeout(400);
    const cam = Object.assign({ fov: 30, y: 2.6, span: 3.2, far: 0, look: 0.5 }, job.cam || {}, g.cam || {});
    const info = await page.evaluate(([items, slots, cam, W, H, bg]) => { const K = window.K, U = K.UI, G = K.G3, T = window.THREE, P = G.phys; try { K.prefs({ gfx: "high" }); } catch (e) {} const S = (K.S = K.newLife()); S.name = "Ira"; S.age = 30; S.act = 3; G.lookHint = "war"; U.b3d.on();
      G.setStage("stage_training_ground", { clear: 14, sky: "day" }); G.world.visible = false; G.sky.visible = false; G.scene.fog = null; G.renderer.setClearColor(bg);
      const gm = new T.Mesh(new T.CircleGeometry(60, 48).rotateX(-Math.PI / 2), new T.MeshLambertMaterial({ color: bg })); gm.receiveShadow = true; gm.position.y = -0.001; G.scene.add(gm);
      if (!P || !P.ok) return ["NO ENGINE"]; P.open(); const figs = (window.__figs = []), out = [];
      const beasts = (window.__beasts = []), cars = (window.__cars = []);
      items.forEach((it, i) => { const x = (i - (slots - 1) / 2) * cam.span;
        if (it.beast) { const g = it.beast === "horse" ? G.horse(0x7a4a2a, 0xa3302a) : G.elephant(0xa3302a); g.position.set(x, 0, 0); g.rotation.y = it.face || 0; g.traverse((m) => { if (m.isMesh) m.castShadow = true; }); G.actors.add(g); if (it.beast === "horse") G.gallop(g, 0, 0); else G.stomp(g, 0, 0); beasts.push({ g, it }); out.push(it.beast); return; }
        const M = G.MODELS[it.key]; if (!M) { out.push("NO MODEL " + it.key); return; } const c = it.key.lastIndexOf("_"), model = it.key.slice(0, c), stage = it.key.slice(c + 1), names = Object.keys(M.looks), look = it.look && M.looks[it.look] ? it.look : names[0];
        const f = G.figure(Object.assign({ model, stage, look, pronoun: "he" }, it.spec || {}), { item: it.item || null }); if (it.shield && f.setShield) f.setShield(true);
        f.place(x, 0, it.face || 0); f.pose(it.pose || "ready", true); f.__x = x; f.__it = it; let T0 = 0; for (let n = 0; n < 40; n++) f.update(1 / 30, (T0 += 1 / 30));
        if (it.car) { const c = G.chariot({ horses: it.horses || 2, flag: ["#a3302a", "#f2ead2", "sun"] }); c.position.set(x, 0, 0); c.rotation.y = it.cface || 0; c.traverse((m) => { if (m.isMesh) m.castShadow = true; }); G.actors.add(c); c.add(f.root); f.root.position.set(-0.2, 0.86, -0.3); f.root.rotation.y = it.face || 0; f.__car = c; f.__id = "car" + i;
          const car = { c, id: f.__id, it, f, v: it.drive || 0 }; cars.push(car);
          if (it.driver) { const d = G.figure(Object.assign({}, G.EXTRAS.rider, { item: "whip", headgear: "turban", gear: ["bands"], whiskers: "stache", face: "long" }), { item: "whip", noBlob: true }); d.pose("drive", true); c.add(d.root); d.root.position.set(0.25, 0.86, 0.55); for (let n = 0; n < 20; n++) d.update(1 / 30, n / 30); car.d = d; figs.push(d); d.__it = {}; d.__x = x; } }
        else G.actors.add(f.root);
        figs.push(f); out.push(it.key + ":" + look); });
      const asp = W / H, half = (slots * cam.span) / 2, d = half / (Math.tan((cam.fov * Math.PI) / 360) * asp); G.camSet([0, cam.y, d + cam.far], [0, cam.look, 0.6], cam.fov, true);
      window.__T = 0; window.__began = false;
      // the strip's own clock: the engine and the figures go forward together, a sixtieth of a second at a time
      window.__to = (t) => { const h = 1 / 60; let worst = 0;
        const teamAt = (car) => { const tm = car.c.userData.team, p = tm.getWorldPosition(new T.Vector3()); return { kind: "team", n: (car.c.userData.horses || []).length || 2, x: p.x, z: p.z, a: car.c.rotation.y + tm.rotation.y }; };
        if (!window.__began) { window.__began = true;
          for (const b of beasts) { const r = P.takeBeast(b.g, b.it.beast, { v: b.it.v, roll: b.it.roll == null ? 1.6 : b.it.roll, spin: b.it.spin }); if (!r) out.push("BEAST NOT TAKEN"); b.r = r; }
          for (const car of cars) { const c = car.c, it = car.it, f = car.f; c.updateMatrixWorld(true); P.mover(car.id, { kind: "car", x: c.position.x, z: c.position.z, a: c.rotation.y }); if (!it.wreck) P.mover(car.id + ":team", teamAt(car));
            if (car.v) P.mover(car.id, { kind: "car", x: c.position.x, z: c.position.z + car.v / 60, a: c.rotation.y, dt: 1 / 60 });
            const r = P.take(f, { car: car.id, alive: it.alive, v: it.v, push: it.push, spin: it.spin }); if (!r) out.push("RIDER NOT TAKEN"); else if (!it.alive) G.actors.attach(f.root);
            if (it.wreck) { (c.userData.horses || []).forEach((hh, k, all) => { const hr = P.takeBeast(hh, "horse", { v: [0, 0, 0], roll: (k < all.length / 2 ? -1 : 1) * (1.5 + (k % 2) * 0.6) }); if (hr) G.actors.attach(hh); else out.push("HORSE NOT TAKEN"); }); c.userData.horses = [];
              const w0 = c.userData.wheels[1]; if (w0) { c.userData.wheels = [c.userData.wheels[0]]; const sn = Math.sin(c.rotation.y), cs = Math.cos(c.rotation.y); P.loose(w0, new T.Vector3(sn * 2.8 + cs * 0.5, 0.4, cs * 2.8 - sn * 0.5), new T.Vector3(cs * 2.8 / 0.72, 0.3, -sn * 2.8 / 0.72), { wheel: [0.72, 0.07], m: 25, life: 30 }); c.rotation.z = 0.2; }
              if (car.d) { const dr = P.take(car.d, { car: car.id, push: [1.2, 0.6, 0.8] }); if (dr) G.actors.attach(car.d.root); } } }
          for (const f of figs) { const it = f.__it; if (it.by || f.__car || !it.key) continue; const r = P.take(f, { v: it.v, push: it.push, low: it.low, spin: it.spin, alive: it.alive }); if (!r) out.push("NOT TAKEN " + it.key); if (r && f.item && it.drop !== false) { const m = f.item; f.item = null; P.loose(m, new T.Vector3((it.v || [0])[0] || 0, 1.2, ((it.v || [0, 0, 0])[2] || 0) * 0.6), new T.Vector3(3, 2, -4), { m: it.kg || 2 }); } } }
        while (window.__T < t - 1e-6) { window.__T += h;
          for (const car of cars) { const c = car.c, it = car.it; if (car.v) { if (window.__T > (it.stop == null ? 0.6 : it.stop)) car.v = Math.max(0, car.v - 40 * h); c.position.z += car.v * h; } c.updateMatrixWorld(true); P.mover(car.id, { kind: "car", x: c.position.x, z: c.position.z, a: c.rotation.y, dt: h }); if (!it.wreck) P.mover(car.id + ":team", Object.assign(teamAt(car), { dt: h }));
            if (it.alive && car.f.rag && !car.f.rag.rise) { const p = car.f.root.getWorldPosition(new T.Vector3()); P.lead(car.f.rag, p.x, p.z, h); } }
          for (const f of figs) { const it = f.__it;
            if (it.by) { const z = -6 + window.__T * 7; P.mover("m" + f.__x, { kind: it.by, x: f.__x, z, a: 0, dt: h }); if (!f.rag && z > -2.6 && !f.__hit) { f.__hit = true; P.take(f, { v: [0, 0, 0] }); } }
            if (it.rise != null && window.__T >= it.rise && f.rag && !f.rag.rise && !f.__rose) { f.__rose = true; P.rise(f, it.riseSecs || 0.5); f.pose(it.pose || "ready"); } }
          const a = performance.now(); P.step(h); worst = Math.max(worst, performance.now() - a);
          for (const f of figs) f.update(h, window.__T); }
        return { worst: +worst.toFixed(2), live: P.live(), load: P.load(), beasts: beasts.map((b) => (b.r ? (b.r.frozen ? "lies" : "falling") : "-")), y: figs.map((f) => +f.j.P.getWorldPosition(new T.Vector3()).y.toFixed(2)), st: figs.map((f) => (f.rag ? (f.rag.rise ? "rising" : f.rag.frozen ? "lies" : "falling") : "own")) }; };
      return out; }, [g.items, slots, cam, W, H, job.bg || 0x8a8f8a]);
    const files = [], notes = [];
    for (const t of times) { const st = await page.evaluate((t) => window.__to(t), t); notes.push(t + "s " + JSON.stringify(st));
      await page.evaluate(() => new Promise((res) => { let n = 0; const f = () => { if (++n >= 3) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); })); await page.waitForTimeout(150);
      const fn = path.join(outdir, g.name + "_" + String(t).replace(".", "_") + ".png"); await page.screenshot({ path: fn, timeout: 200000 }); files.push(fn); }
    fs.writeFileSync(path.join(outdir, g.name + ".json"), JSON.stringify({ labels: g.items.map((it) => it.label || it.key), views: times.map((t) => t + " s"), tw, title: g.title || g.name }));
    cp.spawnSync("python3", ["-I", path.join(__dirname, "sheet_stack.py"), path.join(outdir, g.name + ".jpg"), path.join(outdir, g.name + ".json")].concat(files), { stdio: "inherit" });
    console.log(g.name, info.filter((s) => /NO |NOT /.test(s)).join(" ") || "ok"); console.log(notes.join("\n")); console.log(logs.slice(0, 6).join("\n") || "no errors"); await page.close(); }
  await browser.close(); srv.close(); })();
