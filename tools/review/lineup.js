// Line-ups for a review: several figures side by side on a plain studio floor, each turned to the camera's view.
//   node tools/review/lineup.js <job.json> <outdir>
// job: { slots: 8, tile: [240, 380], groups: [ { name, views: ["front","side","back"], items: [ { key, look, pose, item, label, act } ] } ], cam: { fov, y, span } }
const ROOT = process.env.ROOT || require("path").resolve(__dirname, "../..");
const serve = require(ROOT + "/tools/serve.js"); let pw; try { pw = require("playwright"); } catch (e) { try { pw = require("/opt/npm-tools/node_modules/playwright"); } catch (e2) { console.error("Playwright is not installed"); process.exit(2); } } const { chromium } = pw; const cp = require("child_process"); const fs = require("fs"); const path = require("path");
(async () => { const job = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), outdir = process.argv[3]; fs.mkdirSync(outdir, { recursive: true });
  const slots = job.slots || 8, [tw, th] = job.tile || [240, 380], W = slots * tw, H = th;
  const { srv, url } = await serve(0); const browser = await chromium.launch({ args: ["--no-sandbox", "--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }); const logs = []; page.on("pageerror", (e) => logs.push(String(e.stack || e).slice(0, 500)));
  await page.goto(url + "/index.html?3d=1", { waitUntil: "load" }); await page.waitForFunction(() => window.K_MODELS_READY, null, { timeout: 180000 }); await page.waitForTimeout(400);
  await page.evaluate(([bg, mask]) => { const K = window.K, U = K.UI, G = K.G3, T = window.THREE; try { K.prefs({ gfx: "high" }); } catch (e) {} const S = (K.S = K.newLife()); S.name = "Ira"; S.age = 30; S.act = 3; G.lookHint = null; U.b3d.on();
    G.setStage("stage_training_ground", { clear: 14, sky: "day" }); G.world.visible = false; G.sky.visible = false; G.scene.fog = null; G.renderer.setClearColor(bg);
    const gm = new T.Mesh(new T.CircleGeometry(60, 48).rotateX(-Math.PI / 2), new T.MeshLambertMaterial({ color: bg })); gm.receiveShadow = true; gm.position.y = -0.001; G.scene.add(gm); window.__figs = []; if (mask) { G.scene.overrideMaterial = new T.MeshBasicMaterial({ color: 0x000000 }); gm.visible = false; G.renderer.setClearColor(0xffffff); if (G.outlines) G.outlines(false); } }, [job.bg == null ? 0x9a9da2 : job.bg, !!job.mask]);
  const ANG = { front: 0, q: -Math.PI / 4, side: -Math.PI / 2, bq: -Math.PI * 0.75, back: Math.PI, side2: Math.PI / 2, q2: Math.PI / 4 };
  for (const g of job.groups) { const cam = Object.assign({ fov: 12, y: 1.0, span: 1.28 }, job.cam || {}, g.cam || {});
    const info = await page.evaluate(([items, slots, cam, W, H]) => { const K = window.K, G = K.G3, T = window.THREE; for (const f of window.__figs) G.actors.remove(f.root); window.__figs = []; const out = [];
      items.forEach((it, i) => { if (it.id) { const sp = Object.assign({}, G.lookOf(it.id, K.S) || {}, it.spec || {}); const f = G.figure(sp, { item: it.item === undefined ? sp.item || null : it.item, lite: !!it.lite }); const x = (i - (slots - 1) / 2) * cam.span; f.place(x, 0, 0); f.exact = true; f.pose(it.pose || "stand", true); f.__x = x; f.__it = it; let T1 = 0; for (let n = 0; n < 50; n++) f.update(1 / 30, (T1 += 1 / 30)); G.actors.add(f.root); window.__figs.push(f); out.push(it.id + (f.model ? " model" : " built") + " h=" + f.headPos().y.toFixed(2)); return; }
        const M = G.MODELS[it.key]; if (!M) { out.push("NO MODEL " + it.key); return; } const c = it.key.lastIndexOf("_"), model = it.key.slice(0, c), stage = it.key.slice(c + 1);
        const names = Object.keys(M.looks), look = it.look && M.looks[it.look] ? it.look : names[0];
        const f = G.figure(Object.assign({ model, stage, look, pronoun: /^(draupadi|kunti|gandhari|healer|villager_f|player_f)/.test(model) ? "she" : "he" }, it.spec || {}), { item: it.item || null, noBlob: !!it.noBlob });
        const x = (i - (slots - 1) / 2) * cam.span; f.place(x, 0, 0); f.exact = true; f.pose(it.pose || "stand", true); f.__x = x; f.__it = it;
        if (it.speed) f.speed = it.speed; let T0 = 0; for (let n = 0; n < (it.settle == null ? 50 : it.settle); n++) f.update(1 / 30, (T0 += 1 / 30)); if (it.act) { const dur = it.dur || 0.5; f.act(it.act, dur, 0); let el = 0; while (el < (it.at == null ? 0.55 : it.at) * dur) { f.update(1 / 60, (T0 += 1 / 60)); el += 1 / 60; } }
        G.actors.add(f.root); window.__figs.push(f); out.push(it.key + ":" + look + " h=" + f.headPos().y.toFixed(2)); });
      const asp = W / H, half = (slots * cam.span) / 2, d = half / (Math.tan((cam.fov * Math.PI) / 360) * asp); G.camSet([0, cam.y, d], [0, cam.y, 0], cam.fov, true); window.__camD = d; return out; }, [g.items, slots, cam, W, H]);
    const files = [];
    for (const v of g.views || ["front", "side", "back"]) { await page.evaluate(([ry, fc]) => { for (const f of window.__figs) { f.place(f.__x, 0, ry + (fc ? Math.atan2(-f.__x, window.__camD) : 0)); f.root.updateMatrixWorld(true); } }, [ANG[v] || 0, !!job.faceCam]);
      await page.evaluate(() => new Promise((res) => { let n = 0; const f = () => { if (++n >= 3) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); })); await page.waitForTimeout(200);
      const fn = path.join(outdir, g.name + "_" + v + ".png"); await page.screenshot({ path: fn, timeout: 200000 }); files.push(fn); }
    fs.writeFileSync(path.join(outdir, g.name + ".json"), JSON.stringify({ labels: g.items.map((it) => it.label || it.id || (it.key.replace(/_adult$/, "") + (it.look ? " · " + it.look : ""))), views: g.views || ["front", "side", "back"], tw, th, slots, title: g.title || "" }));
    cp.spawnSync("python3", ["-I", path.join(__dirname, "sheet_stack.py"), path.join(outdir, g.name + ".jpg"), path.join(outdir, g.name + ".json")].concat(files), { stdio: "inherit" });
    console.log(g.name, info.filter((s) => /NO MODEL/.test(s)).join(" ") || "ok", info.length, g.items[0].id ? info.join("; ") : ""); }
  console.log(logs.slice(0, 6).join("\n") || "no errors"); await browser.close(); srv.close(); })();
