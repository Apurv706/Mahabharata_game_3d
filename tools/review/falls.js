// Falls under the physics engine (js/g3/ragdoll.js), as a strip of stills: figures on a plain studio floor, each
// struck in its own way at time 0, and photographed at the times asked for. The engine is stepped by the tool at sixty
// steps a second, not by the clock, so a slow machine photographs the same fall.
//   node tools/review/falls.js <job.json> <outdir>
// job: { tile: [300, 300], times: [0, 0.15, 0.3, ...], cam: { fov, y, span, tilt, far }, groups: [ { name, items: [ { key, look, pose, item, shield, label,
//        v: [x, y, z], push: [x, y, z], low, spin, alive, rise (the second he is given back to his poses), by: "car" | "elephant" (driven through at 7 m/s) } ] } ] }
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
      items.forEach((it, i) => { const M = G.MODELS[it.key]; if (!M) { out.push("NO MODEL " + it.key); return; } const c = it.key.lastIndexOf("_"), model = it.key.slice(0, c), stage = it.key.slice(c + 1), names = Object.keys(M.looks), look = it.look && M.looks[it.look] ? it.look : names[0];
        const f = G.figure(Object.assign({ model, stage, look, pronoun: "he" }, it.spec || {}), { item: it.item || null }); if (it.shield && f.setShield) f.setShield(true);
        const x = (i - (slots - 1) / 2) * cam.span; f.place(x, 0, it.face || 0); f.pose(it.pose || "ready", true); f.__x = x; f.__it = it; let T0 = 0; for (let n = 0; n < 40; n++) f.update(1 / 30, (T0 += 1 / 30));
        G.actors.add(f.root); figs.push(f); out.push(it.key + ":" + look); });
      const asp = W / H, half = (slots * cam.span) / 2, d = half / (Math.tan((cam.fov * Math.PI) / 360) * asp); G.camSet([0, cam.y, d + cam.far], [0, cam.look, 0.6], cam.fov, true);
      window.__T = 0; window.__began = false;
      // the strip's own clock: the engine and the figures go forward together, a sixtieth of a second at a time
      window.__to = (t) => { const h = 1 / 60; let worst = 0;
        if (!window.__began) { window.__began = true; for (const f of figs) { const it = f.__it; if (it.by) continue; const r = P.take(f, { v: it.v, push: it.push, low: it.low, spin: it.spin, alive: it.alive }); if (!r) out.push("NOT TAKEN " + it.key); if (r && f.item && it.drop !== false) { const m = f.item; f.item = null; P.loose(m, new T.Vector3((it.v || [0])[0] || 0, 1.2, ((it.v || [0, 0, 0])[2] || 0) * 0.6), new T.Vector3(3, 2, -4), { m: it.kg || 2 }); } } }
        while (window.__T < t - 1e-6) { window.__T += h;
          for (const f of figs) { const it = f.__it;
            if (it.by) { const z = -6 + window.__T * 7; P.mover("m" + f.__x, { kind: it.by, x: f.__x, z, a: 0, dt: h }); if (!f.rag && z > -2.6 && !f.__hit) { f.__hit = true; P.take(f, { v: [0, 0, 0] }); } }
            if (it.rise != null && window.__T >= it.rise && f.rag && !f.rag.rise && !f.__rose) { f.__rose = true; P.rise(f, it.riseSecs || 0.5); f.pose(it.pose || "ready"); } }
          const a = performance.now(); P.step(h); worst = Math.max(worst, performance.now() - a);
          for (const f of figs) f.update(h, window.__T); }
        return { worst: +worst.toFixed(2), live: P.live(), y: figs.map((f) => +f.j.P.getWorldPosition(new T.Vector3()).y.toFixed(2)), st: figs.map((f) => (f.rag ? (f.rag.rise ? "rising" : f.rag.frozen ? "lies" : "falling") : "own")) }; };
      return out; }, [g.items, slots, cam, W, H, job.bg || 0x8a8f8a]);
    const files = [], notes = [];
    for (const t of times) { const st = await page.evaluate((t) => window.__to(t), t); notes.push(t + "s " + JSON.stringify(st));
      await page.evaluate(() => new Promise((res) => { let n = 0; const f = () => { if (++n >= 3) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); })); await page.waitForTimeout(150);
      const fn = path.join(outdir, g.name + "_" + String(t).replace(".", "_") + ".png"); await page.screenshot({ path: fn, timeout: 200000 }); files.push(fn); }
    fs.writeFileSync(path.join(outdir, g.name + ".json"), JSON.stringify({ labels: g.items.map((it) => it.label || it.key), views: times.map((t) => t + " s"), tw, title: g.title || g.name }));
    cp.spawnSync("python3", ["-I", path.join(__dirname, "sheet_stack.py"), path.join(outdir, g.name + ".jpg"), path.join(outdir, g.name + ".json")].concat(files), { stdio: "inherit" });
    console.log(g.name, info.filter((s) => /NO |NOT /.test(s)).join(" ") || "ok"); console.log(notes.join("\n")); console.log(logs.slice(0, 6).join("\n") || "no errors"); await page.close(); }
  await browser.close(); srv.close(); })();
