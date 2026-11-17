// What stops you, against what is drawn: a real fight with one car or elephant set down on open ground and you sent at
// it, photographed from straight above with the rules' own shape drawn on the earth (red: its middle; yellow: its
// team, or its head; blue: you). The rules are js/ui/battle/sim.js ("shape": TEAM, near, touch).
//   node tools/review/footprint.js <outdir> <fight> <stand|side|run|ele> [shots=8] [frames a shot=16] [path=mace]
//     stand  it stands; you walk straight at its team from in front       side  it stands; you walk at its team from its flank
//     run    it is driven straight at you at 4.5 m/s while you stand       ele   the fight's elephant stands; you walk at its head
//   <outdir>/NN.png, strip.jpg, and log.txt: for each shot where you are, your health, whether you are down, and how
//   far your middle is from the body's edge (off: never less than your own reach, 0.42, if nothing is wrong).
//   Fights with a great man's car (four horses): hold_arjuna, oath_king_hold. A plain car (a pair): fs_sk_chariot. An elephant: fs_d12_elephant.
//   GFX=low|med|high. Software drawing is slow: allow three or four minutes.
const ROOT = process.env.ROOT || require("path").resolve(__dirname, "../..");
const serve = require(ROOT + "/tools/serve.js"); let pw; try { pw = require("playwright"); } catch (e) { pw = require("/opt/npm-tools/node_modules/playwright"); }
const { chromium } = pw, fs = require("fs"), cp = require("child_process");
const out = process.argv[2], fight = process.argv[3] || "hold_arjuna", mode = process.argv[4] || "stand", shots = +(process.argv[5] || 8), per = +(process.argv[6] || 16), pth = process.argv[7] || "mace";
if (!out) { console.error("usage: node tools/review/footprint.js <outdir> <fight> <stand|side|run|ele> [shots] [frames a shot] [path]"); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const ARGS = ["--no-sandbox", "--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--mute-audio"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = []; const say = (s) => { log.push(s); fs.writeFileSync(out + "/log.txt", log.join("\n")); };
(async () => {
  const { srv, url } = await serve(0); const browser = await chromium.launch({ args: ARGS });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); page.on("pageerror", (e) => say("PAGEERROR " + String(e.stack || e).slice(0, 700)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) say("CONSOLE " + m.text().slice(0, 400)); });
  await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await page.goto(url + "/index.html?3d=1", { waitUntil: "load" }); await page.waitForFunction(() => window.K_MODELS_READY, null, { timeout: 400000 });
  const ev = (fn, arg) => page.evaluate(fn, arg).catch((e) => { say("EVAL FAILED " + String(e.message).slice(0, 300)); return null; });
  await ev((o) => { const K = window.K, G = K.G3, S = (K.S = K.newLife()); K.seed(5); Object.assign(S, { name: "Ira", pronoun: "she", origin: "panchala", temperament: "bold", heirloom: "bow", age: 44, act: 6, side: "pandava", path: o.pth });
    for (const k in S.attrs) S.attrs[k] = 5; for (const k in S.skills) S.skills[k] = 4; S.items.herbs = 2; S.flags.push("role_front"); S.modeAsked = true; S.fought = { 6: 3 }; K.prefs({ gfx: o.gfx, fightView: "top", tips3d: {} }); K.UI.battleCount = 300;
    // The fight's own clock is held by this tool: __run frames are let through, each no longer than a thirtieth of a second.
    window.__run = 1e9; window.__set = false; const on0 = G.onFrame, R3 = K.RT3, T = window.THREE;
    const ring = (r, col) => { const m = new T.Mesh(new T.RingGeometry(r - 0.035, r + 0.035, 56), new T.MeshBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: 0.95 })); m.rotation.x = -Math.PI / 2; m.renderOrder = 50; G.scene.add(m); return m; };
    G.onFrame = (fn) => on0((gdt, t, real) => { const go = window.__run > 0, cap = window.__set ? 1 / 30 : 1; fn(go ? Math.min(gdt, cap) : 0, t, go ? Math.min(real, cap) : 0); if (go) window.__run--;
      const B = K.Combat.state(), R = B && B.rt; if (!R) return; const p = K.Combat.player();
      if (!window.__set && R.t > 1.2) { const want = o.mode === "ele" ? (u) => u.g.kind === "elephant" : (u) => u.g.car;
        const e = B.units.filter((u) => u.side === "enemy" && u.hp > 0 && u.g && want(u)).sort((a, b) => (b.hero ? 1 : 0) - (a.hero ? 1 : 0))[0]; if (!e) return;
        window.__set = true; window.__run = 0; window.__e = e; e.g.entered = true; e.g.role = null; const s0 = R3.shape(e); window.__sh = { len: s0.len, nr: s0.nr, r: s0.r };
        B.units.forEach((u, i) => { if (u !== e && u !== p && u.g) { u.g.x = 60 + i * 0.4; u.g.z = 60; u.g.entered = u.side === "enemy" ? false : u.g.entered; u.still = true; } });   // (everyone else off the field)
        e.g.x = 0; e.g.z = -3; e.g.ca = 0; e.g.a = 0; e.g.cv = 0; p.maxHp = p.hp = 100000;
        const front = s0.len + s0.nr; if (o.mode === "run") { e.g.z = -9; p.g.x = 0.25; p.g.z = e.g.z + front + 0.67 + 5; } else if (o.mode === "side") { p.g.x = 6.5; p.g.z = e.g.z + s0.len; } else { p.g.x = 0.02; p.g.z = e.g.z + front + 0.67 + 3.2; }
        p.g.a = Math.atan2(e.g.x - p.g.x, e.g.z - p.g.z); p.g.wx = p.g.wz = 0; window.__rings = [ring(s0.r, 0xff3030), ring(s0.nr, 0xffd040), ring(0.42, 0x40c0ff)];
        K.UI.battleBot = true; R3.bot = () => (o.mode === "run" ? {} : o.mode === "side" ? { mx: -1, mz: 0 } : { mx: e.g.x - p.g.x, mz: e.g.z - p.g.z }); }   // (you are walked by the tool, not by the game's own fighter)
      const e = window.__e; if (!e) return; const s = R3.shape(e);
      // (kept to its place or its line: its man has not the reins while the tool holds it)
      if (o.mode === "run") { e.g.ca = 0; e.g.a = 0; e.g.cv = 4.5; e.g.cw = 0; e.g.stag = 0.05; e.g.cool = 99; e.g.atk = null; } else { e.g.stag = 0.2; e.g.cv = 0; e.g.cw = 0; e.g.ca = 0; e.g.a = 0; e.g.x = 0; e.g.z = -3; e.g.vx = e.g.vz = 0; e.g.cool = 99; e.g.atk = null; }
      const rg = window.__rings; rg[0].position.set(s.x, 0.06, s.z); rg[1].position.set(s.nx, 0.06, s.nz); rg[2].position.set(p.g.x, 0.06, p.g.z);
      const mx = (s.x + s.nx) / 2, mz = (s.z + s.nz) / 2 + 1.2; G.camSet([mx, 19.5, mz + 1.05], [mx, 0, mz + 1], 40, true); }); }, { pth, mode, gfx: process.env.GFX || "med" });
  await ev((id) => { window.K.UI.startBattle(id, () => {}); }, fight);
  const t0 = Date.now(); let began = false;
  while (Date.now() - t0 < 300000) { const st = await ev(() => { const B = window.K.Combat.state(), R = B && B.rt; const sk = document.querySelector(".b-skip"); if (sk) sk.click(); const go = document.getElementById("battle-go"); if (go) go.click(); return { t: R ? R.t : -1 }; }); if (st && st.t > 0) { began = true; break; } await sleep(700); }
  say("fight began: " + began);
  const t1 = Date.now(); let set = false; while (Date.now() - t1 < 300000) { const s = await ev(() => window.__set); if (s) { set = true; break; } await sleep(200); }
  say("set down: " + set + (set ? "" : " (no car or elephant in this fight?)")); const files = [];
  if (set) for (let i = 0; i < shots; i++) {
    await ev((n) => { window.__run = n; }, i ? per : 2); const a = Date.now(); while (Date.now() - a < 60000) { const r = await ev(() => window.__run); if (!(r > 0)) break; await sleep(80); }
    await sleep(300); const st = await ev(() => { const K = window.K, B = K.Combat.state(), R = B.rt, p = K.Combat.player(), e = window.__e; return { t: +R.t.toFixed(2), you: [+p.g.x.toFixed(2), +p.g.z.toFixed(2)], health: +(100 * p.hp / p.maxHp).toFixed(1), down: R.downUntil > R.t, it: [+e.g.x.toFixed(2), +e.g.z.toFixed(2)], speed: +(e.g.cv || 0).toFixed(1), off: +K.RT3.off(e, p.g.x, p.g.z).toFixed(2), ahead: +(p.g.z - e.g.z).toFixed(2), team: e.g.team || null, shape: window.__sh }; });
    const f = out + "/" + String(i).padStart(2, "0") + ".png"; await page.screenshot({ path: f }); files.push(f); say("shot " + i + " " + JSON.stringify(st)); }
  if (files.length) { const crop = (process.env.CROP || "0,150,390,700").split(",").map(Number);
    cp.spawnSync("python3", ["-I", "-c", "import sys\nfrom PIL import Image\nc=[int(x) for x in sys.argv[2].split(',')]\nims=[Image.open(f).convert('RGB').crop(c) for f in sys.argv[3:]]\nw,h=ims[0].size\ncols=min(4,len(ims)); rows=(len(ims)+cols-1)//cols\ns=Image.new('RGB',(w*cols,h*rows),(20,20,20))\nfor i,im in enumerate(ims): s.paste(im,((i%cols)*w,(i//cols)*h))\ns.save(sys.argv[1],quality=88); print(s.size)", out + "/strip.jpg", crop.join(","), ...files], { stdio: "inherit" }); }
  say("DONE"); await browser.close(); srv.close();
})().catch((e) => { fs.appendFileSync(out + "/log.txt", "\nCRASH " + e.stack); process.exit(1); });
