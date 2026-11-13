/* Every kind of test, played in 3D (the frame, the card and the outcome are ui/trials.js).
   The rules are the 2D game's: the same windows, counts and clocks, widened by the same stats (K.trialPower). What is
   new is that each is played in its place: the target swings at the end of a real range, the guard paces a real
   corridor, the chariot runs a real course. One action answers Space, Enter, a tap or the button at the foot of the
   screen; the tests that steer use the arrow keys (or A and D) and two buttons. */
(function (K) {
  "use strict";
  const U = K.UI, G = K.G3, T = window.THREE;
  if (!T) return;
  const PLAY = U.PLAY, SETUP = U.TRIAL_SETUP, AUTO = U.AUTO;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const turnA = (a, to, k) => { let d = to - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + clamp(d, -k, k); };
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const sfx = (n) => { if (K.Sound) K.Sound.play(n); };
  const tx = (s, p) => U.esc(K.text(p ? [s, p] : s));
  const pips = (n, good, bad) => { let s = ""; for (let i = 0; i < n; i++) s += '<i class="pip ' + (i < good ? "hit" : i < good + bad ? "miss" : "") + '"></i>'; return s; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(K.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mesh = (fn, mat) => { const b = new G.Builder(); fn(b); const m = b.mesh(mat); m.castShadow = true; return m; };
  const glow = (col, s) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: G.tex("glow"), color: col, blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); sp.scale.set(s, s, 1); return sp; };
  const basic = (col, op) => new T.MeshBasicMaterial({ color: col, transparent: true, opacity: op == null ? 1 : op, depthWrite: false, fog: false, side: T.DoubleSide });
  // Labels that stand on things in the scene.
  function labels(ctx) {
    const list = [], scr = {};
    ctx.loop(() => { for (const l of list) { G.toScreen(l.at, scr); l.el.style.display = scr.behind ? "none" : ""; l.el.style.transform = "translate(" + Math.round(scr.x) + "px," + Math.round(scr.y) + "px) translate(-50%,-50%)"; } });
    return { add(text, at, cls, fn) { const el = fn ? U.button("t-label btn " + (cls || ""), text, (e) => { e.stopPropagation(); fn(); }) : U.el('<span class="t-label ' + (cls || "") + '">' + text + "</span>"); ctx.hud.appendChild(el); const l = { el, at }; list.push(l); return l; },
      clear() { for (const l of list.splice(0)) l.el.remove(); } };
  }
  const gauge = (ctx, cls) => { const el = U.el('<div class="t-gauge ' + (cls || "") + '"><em></em><i></i></div>'); ctx.hud.appendChild(el); return { el, band: el.querySelector("em"), fill: el.querySelector("i") }; };
  // Left and right, from the keys and from two buttons.
  function steering(ctx, lLabel, rLabel) {
    const s = { v: 0, l: false, r: false, tapL: null, tapR: null };
    const upd = () => { s.v = (s.r ? 1 : 0) - (s.l ? 1 : 0); };
    ctx.keys = (e, down) => { const k = e.key.toLowerCase(); const L = k === "arrowleft" || k === "a" || k === "arrowup" || k === "w", R = k === "arrowright" || k === "d" || k === "arrowdown" || k === "s"; if (!L && !R) return false; if (down && !e.repeat) { if (L && s.tapL) s.tapL(); if (R && s.tapR) s.tapR(); } if (L) s.l = down; else s.r = down; upd(); return true; };
    ctx.button(lLabel || "◀", () => { s.l = true; upd(); if (s.tapL) s.tapL(); }, () => { s.l = false; upd(); });
    ctx.button(rLabel || "▶", () => { s.r = true; upd(); if (s.tapR) s.tapR(); }, () => { s.r = false; upd(); });
    ctx.tapActs = false;
    return s;
  }
  const meAt = (ctx, x, z, ry, pose, o) => { ctx.me = ctx.figure(o && o.spec ? o.spec : "me", o); ctx.me.place(x, z, ry); if (pose) ctx.me.pose(pose, true); return ctx.me; };

  // =====================================================================================================
  // Aim: the target crosses your line; loose as it does.
  // =====================================================================================================
  const RUNNERS = new Set(["deer", "tiger", "elephant", "chariot"]);
  // The sling pull (t.sling; the mango throw of childhood, owner 12 November): small fruit hang still on the branch.
  // Put a thumb down anywhere, pull back and to the side, and a line of dots shows how the pebble will fly; let go to
  // throw. So many pebbles, so many fruit to bring down. (Space, or a tap without a pull, throws at the nearest fruit
  // with a child's aim.)
  function slingSetup(ctx) {
    meAt(ctx, 0.2, 5.0, Math.PI, "aim", { item: null });
    const fruit = [], col = ctx.t.icon === "fruit" && K.S && K.S.origin === "gandhara" ? 0xf2b24a : 0xf0a030;
    const at = [[-3.0, 3.0], [-2.0, 3.7], [-1.0, 2.9], [0.0, 3.5], [0.9, 3.0]];
    for (const [fx, fy] of at) { const m = mesh((b) => { b.sph(0.115, 0, 0, 0, col, 1.25, 8); b.cyl(0.012, 0.012, 0.3, 0, 0.26, 0, 0x4a3a1c, 4); b.sph(0.07, 0.05, 0.2, 0, 0x4f7b3a, 0.5, 5); }); m.position.set(fx, fy, -3.5); ctx.add(m); fruit.push({ m, x: fx, y: fy, on: true, vy: 0 }); }
    const dots = []; for (let i = 0; i < 12; i++) { const d = new T.Mesh(new T.SphereGeometry(0.045, 6, 5), basic(0xfff0c0, 0.85)); d.visible = false; ctx.add(d, G.fxRoot); dots.push(d); }
    const peb = new T.Mesh(new T.SphereGeometry(0.06, 7, 6), new T.MeshLambertMaterial({ color: 0x8a8478 })); peb.visible = false; ctx.add(peb);
    ctx.x = { fruit, dots, peb };
    ctx.cam([1.0, 2.5, 9.6], [-0.6, 2.2, -3], 46, true);
  }
  function slingPlay(ctx) {
    const t = ctx.t, x = ctx.x, o = t.sling === true ? {} : t.sling, shots = o.pebbles || 6, need = Math.min(o.need || 3, x.fruit.length), GR = 9.8, Z = -3.5, R_HIT = 0.27 + (t.easy || 0) * 0.5;
    let n = 0, hits = 0, busy = false, drag = null, aim = null, fly = null;
    const draw = () => ctx.score(pips(shots, hits, n - hits) + " " + tx("{n} of {m} needed", { n: need, m: shots }));
    draw(); ctx.prompt(tx("Pull back and let go. The dots show how the pebble will fly."));
    const from = () => { const p = ctx.me.tip ? ctx.me.tip() : V(0.2, 1.5, 4.8); return V(p.x, Math.max(1.2, p.y), 4.8); };
    const shot = (dx, dy) => { const len = Math.hypot(dx, dy), pw = clamp(len / 150, 0.25, 1), T_ = 1.2 - 0.45 * pw, f = from(), tx_ = f.x - dx * 0.03, ty = f.y + 0.5 + dy * 0.024;
      return { f, T: T_, vx: (tx_ - f.x) / T_, vy: (ty - f.y) / T_ + 0.5 * GR * T_, vz: (Z - f.z) / T_ }; };
    const at = (s, k) => V(s.f.x + s.vx * k, s.f.y + s.vy * k - 0.5 * GR * k * k, s.f.z + s.vz * k);
    const show = (s) => { x.dots.forEach((d, i) => { d.visible = !!s; if (s) d.position.copy(at(s, (s.T * (i + 1)) / x.dots.length)); }); };
    const fire = (s) => { if (busy || !s) return; busy = true; n++; show(null); ctx.me.act("loose", 0.3, 0.4); sfx("tap"); fly = { s, k: 0 }; x.peb.visible = true; };
    const land = (s) => { const p = at(s, s.T); let best = null, bd = 1e9; for (const f of x.fruit) if (f.on) { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < bd) { bd = d; best = f; } }
      const hit = best && bd <= R_HIT;
      if (hit) { best.on = false; best.vy = 0.01; hits++; G.fx.burst("hit", V(best.x, best.y, Z), { n: 10 }); sfx("clang"); ctx.toast(tx("Hit!"), "good"); } else { ctx.toast(tx("Missed"), "bad"); sfx("step"); }
      draw(); const left = shots - n;
      if (hits >= need) return ctx.after(700, () => ctx.finish("win", null));
      if (hits + left < need) return ctx.after(600, () => ctx.finish(hits === need - 1 ? "close" : "lose", null));
      ctx.after(350, () => { busy = false; }); };
    ctx.loop((dt) => {
      if (fly) { fly.k += dt; const k = Math.min(fly.k, fly.s.T); x.peb.position.copy(at(fly.s, k)); if (fly.k >= fly.s.T) { const s = fly.s; fly = null; x.peb.visible = false; land(s); } }
      for (const f of x.fruit) if (!f.on && f.m.position.y > 0.12) { f.vy += GR * dt; f.m.position.y = Math.max(0.12, f.m.position.y - f.vy * dt); f.m.rotation.z += dt * 4; }
      ctx.me.drawBow(drag && aim ? 0.9 : 0.3);
    });
    ctx.pointer = (kind, e) => {
      if (kind === "down") { if (busy) return true; drag = { x: e.clientX, y: e.clientY }; aim = null; return true; }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (kind === "move") { if (Math.hypot(dx, dy) > 10) { aim = shot(dx, dy); show(aim); } else { aim = null; show(null); } return; }
      const s = aim; drag = null; aim = null; if (s) fire(s); else nearest();
    };
    // Without a pull: at the nearest fruit left, with a child's aim.
    const nearest = () => { if (busy) return; const f = x.fruit.filter((q) => q.on)[0]; if (!f) return; const fr = from(), ex = (K.rng() - 0.5) * 0.7, ey = (K.rng() - 0.5) * 0.7; fire(shot(-(f.x + ex - fr.x) / 0.03, (f.y + ey - fr.y - 0.5) / 0.024 > 150 ? 150 : (f.y + ey - fr.y - 0.5) / 0.024)); };
    ctx.onAct(nearest); ctx.tapActs = false; ctx.keys = (e, down) => { if (down && !e.repeat && (e.key === " " || e.key === "Enter")) { nearest(); return true; } return false; };
  }
  SETUP.aim = { clear: 12, setup(ctx) {
    if (ctx.t.sling) return slingSetup(ctx);
    const t = ctx.t, icon = t.icon || "straw";
    if (t.dark || t.blind) G.setSky("night");
    meAt(ctx, -0.5, 4.2, Math.PI, "aim", { item: /Throw/.test(t.verb || "") ? null : "bow" });
    let tg;
    if (icon === "elephant") { tg = G.elephant(0xa3302a); tg.scale.setScalar(0.8); }
    else if (icon === "chariot") { tg = G.chariot({ flag: ["#a3302a", "#e2b55a", "sun"], col: 0x6e3026 }); tg.scale.setScalar(0.8); }
    else if (icon === "deer" || icon === "tiger") { tg = G.beast4(icon); if (G.PROPS && G.PROPS[icon]) tg.scale.setScalar(1.15); tg.traverse((m) => { if (m.isMesh) m.castShadow = true; }); }
    else if (icon === "bird") { // a green parrot on the wing: a body, a red beak, a long tail, and two wings that beat
      tg = new T.Group(); tg.add(mesh((b) => { b.sph(0.12, 0, 0, 0, 0x4f8a3a, 0.8, 8, 0.8, 1.5, 0x7fb84a); b.sph(0.075, 0, 0.05, 0.19, 0x4f8a3a, 1, 7); b.cone(0.03, 0.09, 0, 0.04, 0.25, 0xd0502a, 5, 0, Math.PI / 2); b.box(0.08, 0.014, 0.3, 0, -0.01, -0.34, 0x3f7a34); }));
      tg.userData.wings = [-1, 1].map((sx) => { const w = mesh((b) => { b.box(0.34, 0.014, 0.2, sx * 0.17, 0, -0.02, 0x3f7a34); b.box(0.2, 0.012, 0.13, sx * 0.42, 0, -0.06, 0x356a2c); }); w.position.set(sx * 0.05, 0.04, 0.03); tg.add(w); return w; });
    }
    else tg = mesh((b) => {
      if (icon === "lamp") { b.cyl(0.2, 0.1, 0.12, 0, -0.1, 0, 0xb5793a, 8); b.sph(0.09, 0, 0.1, 0, 0xffd27a, 1.6, 6); }
      else if (icon === "fruit") b.sph(0.2, 0, 0, 0, 0xf0a030, 1.2, 8);
      else if (icon === "bell") { b.cone(0.22, 0.34, 0, -0.14, 0, 0xb8862e, 8); b.sph(0.05, 0, -0.18, 0, 0x5a3a12); }
      else if (icon === "leaf") b.sph(0.2, 0, 0, 0, 0x6f8f3a, 1.5, 6, 1, 0.2);
      else if (icon === "bird") { b.sph(0.14, 0, 0, 0, 0x3f6b3a, 0.8, 6); b.box(0.7, 0.03, 0.2, 0, 0.02, 0, 0x4f7b4a); }
      else { b.cyl(0.45, 0.45, 0.12, 0, 0, 0, 0xd9b26a, 14, 0, Math.PI / 2); b.cyl(0.3, 0.3, 0.13, 0, 0, 0, 0xa87a3a, 12, 0, Math.PI / 2); b.cyl(0.12, 0.12, 0.14, 0, 0, 0, 0xb2432a, 10, 0, Math.PI / 2); }
    }, G.mat.vcGlow && (t.dark || t.blind) && icon === "lamp" ? G.mat.vcGlow : undefined);
    if (!RUNNERS.has(icon)) tg.scale.setScalar(1.7);
    ctx.add(tg); ctx.x = { tg, icon, runner: RUNNERS.has(icon) };
    if (icon === "lamp" || t.dark) { const h = glow(0xffb648, 1.6); tg.add(h); }
    // The line you shoot along.
    const line = new T.Mesh(new T.PlaneGeometry(0.07, 11).rotateX(-Math.PI / 2), basic(0xffe2a0, 0.35)); line.position.set(-0.5, 0.04, -1.6); ctx.add(line, G.fxRoot);
    ctx.cam([1.5, 2.7, 8.6], [-0.4, 1.6, -3], 46, true);
  } };
  PLAY.aim = function (ctx) {
    if (ctx.t.sling) return slingPlay(ctx);
    const t = ctx.t, x = ctx.x, shots = t.shots || 3, need = t.need || 2, speed = t.speed || 1.6;
    const hw = clamp(0.085 + ctx.power * 0.012 + (t.easy || 0), 0.08, t.practice ? 0.3 : 0.2) * (t.small ? 0.75 : 1) * 2, AMP = 3.0, Z = -4.5, X0 = -0.5;
    let n = 0, hits = 0, ph = K.rng() * 6, busy = false, pos = 0, flew = 0;
    const draw = () => ctx.score(pips(shots, hits, n - hits) + " " + tx("{n} of {m} needed", { n: need, m: shots }));
    draw(); ctx.prompt(tx(t.blind ? "You cannot see it. Listen, and loose as it crosses your line." : "Loose as it crosses your line."));
    ctx.loop((dt, tt) => {
      ph += dt * speed * (1 + n * 0.08);
      pos = x.runner ? ((ph * 0.45) % 2) - 1 : Math.sin(ph);
      const wx = X0 + pos * AMP, y = x.runner ? 0 : 1.9 + (x.icon === "bird" ? Math.sin(ph * 3) * 0.3 : -Math.abs(pos) * 0.25);
      x.tg.position.set(wx, y, Z); if (x.tg.userData.wings) { const a = Math.sin(tt * 21) * 0.8; x.tg.userData.wings[0].rotation.z = -a; x.tg.userData.wings[1].rotation.z = a; x.tg.rotation.y = Math.cos(ph) > 0 ? Math.PI / 2 : -Math.PI / 2; x.tg.rotation.z = Math.sin(tt * 21 + 1) * 0.06; } /* (it flies the way it is going) */
      if (x.runner) { x.tg.rotation.y = Math.PI / 2; if (x.icon === "elephant") G.stomp(x.tg, tt * 8, 1); else if (x.icon === "chariot") G.roll(x.tg, ph * 3, tt, 1); else G.gallop(x.tg, tt * 12, 1); }
      x.tg.visible = !t.blind || Math.abs(pos) > 0.82 || flew > 0; if (flew > 0) flew -= dt;
      if (t.blind && Math.abs(pos) < 0.05 && !busy && Math.floor(tt * 8) % 2 === 0) sfx("tap");
      ctx.me.drawBow(busy ? 0 : 0.5 + 0.5 * Math.sin(tt * 2));
    });
    ctx.button(t.verb || "Release", () => fire());
    const fire = () => {
      if (busy) return; busy = true; n++;
      const hit = Math.abs(pos) <= hw, to = V(X0 + (hit ? pos * AMP : (pos > 0 ? -0.6 : 0.6)), x.runner ? 1.1 : x.tg.position.y, Z);
      ctx.me.act("loose", 0.35, 0.45); sfx("tap");
      G.fx.arrow(ctx.me.tip(), to, 0.22, 0.2, () => {
        if (hit) { hits++; G.fx.burst("hit", to, { n: 12 }); sfx("clang"); ctx.toast(tx("Hit!"), "good"); flew = 0.6; } else { ctx.toast(tx("Missed"), "bad"); sfx("step"); }
        draw();
        const left = shots - n;
        if (hits >= need) return ctx.after(500, () => ctx.finish("win", null));
        if (hits + left < need) return ctx.after(500, () => ctx.finish(hits === need - 1 ? "close" : "lose", null));
        ctx.after(450, () => { busy = false; });
      });
    };
    ctx.onAct(fire);
  };

  // =====================================================================================================
  // Draw: bend the great bow and hold it inside the bright band.
  // =====================================================================================================
  SETUP.draw = { clear: 9, setup(ctx) { meAt(ctx, 0, 0.6, Math.PI * 0.75, "aim", { item: "bow" }); ctx.cam([2.6, 1.9, 4.6], [0, 1.25, 0.4], 40, true); } };
  PLAY.draw = function (ctx) {
    const t = ctx.t, shots = t.shots || 3, need = t.need || 2, w = clamp(0.065 + ctx.power * 0.008, 0.065, 0.12) * (t.small ? 0.75 : 1) * 2;
    const g = gauge(ctx); let n = 0, won = 0, ten = 0, held = false, lo = 0.7, rest = 0;
    const next = () => { lo = 0.62 + K.rng() * 0.22; g.band.style.bottom = (lo / 1.05) * 100 + "%"; g.band.style.height = (w / 1.05) * 100 + "%"; ten = 0; };
    const draw = () => ctx.score(pips(shots, won, n - won));
    next(); draw(); ctx.prompt(tx(t.help || "Hold to draw. Let go while the bar is in the bright band."));
    const end = (ok, text) => { n++; if (ok) won++; held = false; rest = 0.8; ctx.toast(tx(text), ok ? "good" : "bad"); sfx(ok ? "clang" : "hit"); draw(); if (won >= need) ctx.after(600, () => ctx.finish("win", null)); else if (won + shots - n < need) ctx.after(600, () => ctx.finish(won === need - 1 ? "close" : "lose", null)); else ctx.after(700, next); };
    ctx.loop((dt) => {
      if (rest > 0) { rest -= dt; ten = Math.max(0, ten - dt * 3); }
      else if (held) { ten += dt * (0.32 + ten * 0.55); if (ten >= 1.05) end(false, "It slips from your fingers."); }
      else ten = Math.max(0, ten - dt * 1.5);
      g.fill.style.height = clamp(ten / 1.05, 0, 1) * 100 + "%"; ctx.me.drawBow(clamp(ten, 0, 1));
    });
    const down = () => { if (rest <= 0) held = true; }, up = () => { if (!held || rest > 0) return; held = false; if (ten < 0.15) return; end(ten >= lo && ten <= lo + w, ten < lo ? "Too weak." : ten > lo + w ? "Too far: the bow fights back." : "Drawn true."); };
    ctx.button(t.verb || "Draw", down, up); ctx.onAct(down, up);
  };

  // =====================================================================================================
  // Push: meet the blow as the ring closes on the mark.   Rhythm: strike on every beat.
  // =====================================================================================================
  function ringPair(ctx, at) {
    const mark = new T.Mesh(new T.RingGeometry(0.82, 0.96, 40).rotateX(-Math.PI / 2), basic(0xffe2a0, 0.9)), ring = new T.Mesh(new T.RingGeometry(0.9, 1.0, 40).rotateX(-Math.PI / 2), basic(0xff7a3a, 0.9));
    mark.position.set(at[0], 0.06, at[1]); ring.position.set(at[0], 0.07, at[1]); ctx.add(mark, G.fxRoot); ctx.add(ring, G.fxRoot);
    return { mark, ring };
  }
  const foeFor = (t) => (t.face === "post" || /post/i.test(t.foe || "") ? null : U.personByName(t.foe) || (/raider|bandit/i.test(t.foe || "") ? "bandit" : /Balarama/.test(t.foe || "") ? "balarama" : "soldier"));
  function duelSetup(ctx) {
    const t = ctx.t, who = foeFor(t);
    meAt(ctx, 0, 1.2, Math.PI, "ready", { item: /mace|Balarama/i.test((t.foe || "") + K.S.path) ? "mace" : "woodsword" });
    if (/smithy/.test(K.val(t.stage) || "")) { // the forge: an anvil in front of you, the smith to one side with the tongs, nobody in the way
      const an = ctx.add(mesh((b) => { b.cyl(0.34, 0.4, 0.55, 0, 0, 0, 0x5a3a22, 10); b.box(0.5, 0.16, 0.3, 0, 0.55, 0, 0x3a3a40); b.box(0.9, 0.2, 0.34, 0, 0.7, 0, 0x4a4a52); b.cone(0.14, 0.36, 0.6, 0.8, 0, 0x4a4a52, 8, 0, 0, -Math.PI / 2); b.box(0.5, 0.05, 0.08, 0, 0.92, 0, 0xff8a3a); })); an.position.set(0, 0, 0.1);
      const cast = [].concat(K.val(t.cast) || [])[0], sid = cast && (typeof cast === "string" ? cast : cast.id); let sm = null; try { sm = ctx.figure(sid && (K.PUPPETS[sid] || G.EXTRAS[sid] || K.PEOPLE[sid]) ? sid : "soldier", { item: null }); sm.place(-1.5, -0.2, Math.PI / 2 + 0.4); sm.pose("ready", true); } catch (e) { sm = null; }
      ctx.x = { anvil: an, smith: sm }; ctx.cam([2.9, 2.4, 4.6], [-0.2, 1.0, 0.3], 42, true, 2.1); return; }
    if (who) { ctx.x = { foe: ctx.figure(who, { item: U.lookOf3d(who).item || "woodsword" }) }; ctx.x.foe.place(0, -0.9, 0); ctx.x.foe.pose("ready", true); }
    else { ctx.x = { post: ctx.add(mesh((b) => { b.cyl(0.16, 0.19, 1.9, 0, 0, 0, 0x7a5232, 8); b.cyl(0.2, 0.2, 0.1, 0, 1.3, 0, 0x5a3a20, 8); b.box(1.1, 0.12, 0.12, 0, 1.45, 0, 0x7a5232); })) }; ctx.x.post.position.set(0, 0, -0.7); }
    ctx.cam([3.4, 2.3, 4.4], [0, 1.1, 0.1], 42, true);
  }
  SETUP.push = { clear: 9, setup: duelSetup };
  PLAY.push = function (ctx) {
    const t = ctx.t, tol = clamp(0.035 + ctx.power * 0.007, 0.03, 0.08), rp = ringPair(ctx, [0, 1.2]);
    let period = t.period || 1.05, k = 1, good = 0, bad = 0, wait = 0.8, done = false;
    const draw = () => ctx.score(t.tally ? tx(t.tally, { g: good, b: bad }) : pips(3, good, 0) + " · " + pips(3, 0, bad));
    draw(); ctx.prompt(tx("Press as the ring closes on the mark."));
    const res = (ok, why) => {
      if (ok) { good++; ctx.toast(tx(t.good || "Parried!"), "good"); sfx("clang"); G.fx.burst("spark", V(0, 1.3, 0.2), { n: 14 }); ctx.me.act("parry", 0.35); if (ctx.x.foe) ctx.x.foe.act("hit", 0.4); }
      else { bad++; ctx.toast(tx(why === "soon" ? t.soon || "Too soon." : t.late || "Too late."), "bad"); ctx.cue("bad"); ctx.me.act("hit", 0.4); }
      draw(); period = Math.max(0.62, period * 0.9); k = 1; wait = 0.7 + K.rng() * 0.5; done = false;
      if (good >= 3) ctx.after(500, () => ctx.finish("win", null)); else if (bad >= 3) ctx.after(500, () => ctx.finish(good === 2 ? "close" : "lose", null));
    };
    ctx.loop((dt) => {
      if (good >= 3 || bad >= 3) return;
      if (wait > 0) { wait -= dt; rp.ring.visible = false; if (wait <= 0 && ctx.x.foe) ctx.x.foe.act("heavy", period / 0.55 * 0.7 + 0.2); return; }
      rp.ring.visible = true; k -= (dt / period) * 0.7;
      const s = k / 0.3; rp.ring.scale.set(s, 1, s);
      if (k < 0.3 - tol * 1.6 && !done) res(false, "late");
    });
    const press = () => { if (wait > 0 || good >= 3 || bad >= 3) return; ctx.me.act("slash", 0.3); res(Math.abs(k - 0.3) <= tol, k > 0.3 ? "soon" : "late"); };
    ctx.button(t.verb || "Parry", press); ctx.onAct(press);
  };
  SETUP.rhythm = { clear: 9, setup: duelSetup };
  PLAY.rhythm = function (ctx) {
    const t = ctx.t, beat = 60 / (t.bpm || 80), total = t.notes || 16, win = clamp(0.1 + ctx.power * 0.008, 0.1, 0.17);
    const rp = ringPair(ctx, [0, 1.2]); let time = -beat * 2, hit = 0, miss = 0, done = new Set();
    const draw = () => ctx.score(t.tally ? tx(t.tally, { h: hit, m: miss, left: total - hit - miss }) : hit + " / " + total);
    draw(); ctx.prompt(tx("Strike on every beat: as the ring meets the mark."));
    const fin = () => { const r = hit / total; ctx.finish(r >= 0.8 ? "win" : r >= 0.6 ? "close" : "lose", null); };
    ctx.loop((dt) => {
      time += dt; const i = Math.floor(time / beat + 0.5), ph = time / beat - Math.floor(time / beat);
      const s = 1 + (1 - ph) * 2.2; rp.ring.scale.set(s, 1, s);
      if (ph < dt / beat * 1.5 && time > -0.1) sfx(t.sound || "drum");
      const late = Math.floor((time - win - 0.02) / beat + 0.5);
      for (let j = Math.max(0, late - 1); j <= late && j < total; j++) if (!done.has(j) && time > j * beat + win) { done.add(j); miss++; draw(); }
      if (hit + miss >= total) fin();
      void i;
    });
    const press = () => {
      const i = Math.round(time / beat), off = time - i * beat; ctx.me.act("slash", 0.25);
      if (i < 0 || i >= total || done.has(i)) return;
      done.add(i);
      if (Math.abs(off) <= win) { hit++; if (Math.abs(off) < win * 0.5) ctx.toast(tx(t.clean || "Clean!"), "good"); G.fx.burst("spark", V(0, 1.3, 0.1), { n: 8 }); if (ctx.x.foe) ctx.x.foe.act("hit", 0.25); }
      else { miss++; ctx.toast(tx(off < 0 ? t.soon || "Too soon." : t.late || "Too late."), "bad"); }
      draw();
    };
    ctx.button(t.verb || "Strike", press); ctx.onAct(press);
  };

  // =====================================================================================================
  // Steady: keep your hand inside the band while it drifts.
  // =====================================================================================================
  SETUP.steady = { clear: 9, setup(ctx) { meAt(ctx, 0, 0.8, Math.PI * 0.8, ctx.t.horse ? "hold" : "kneel", { item: null }); if (ctx.t.horse) { const h = G.horse(0x7a4a2a, true); h.position.set(-1.4, 0, -0.4); h.rotation.y = 1; ctx.add(h); ctx.x = { h }; } ctx.cam([2.4, 1.9, 4.6], [-0.3, 1, 0.2], 40, true, 1.7); } };
  PLAY.steady = function (ctx) {
    if (ctx.t.divine) return steadyDivine(ctx);
    const t = ctx.t, half = clamp(0.11 + ctx.power * 0.015, 0.1, 0.2), secs = t.secs || 15, g = gauge(ctx, "h");
    let hand = 0.3, mood = 0.5, mv = 0, calm = 0.2, left = secs, held = false;
    ctx.prompt(tx(t.help || "Hold to move your hand right; let go and it drifts left. Stay inside the band."));
    ctx.loop((dt, tt) => {
      left -= dt; mv += (K.rng() - 0.5) * dt * 2.2; mv = clamp(mv, -0.35, 0.35); mood = clamp(mood + mv * dt, half, 1 - half); if (mood <= half || mood >= 1 - half) mv = -mv;
      hand = clamp(hand + (held ? 0.5 : -0.4) * dt, 0, 1);
      const inside = Math.abs(hand - mood) <= half; calm = clamp(calm + (inside ? dt / 7 : -dt / 9), 0, 1);
      g.band.style.left = (mood - half) * 100 + "%"; g.band.style.width = half * 200 + "%"; g.fill.style.left = hand * 100 + "%";
      ctx.score(tx(t.tally || "Steady: {c}%", { c: Math.round(calm * 100), s: Math.ceil(left) })); ctx.clock.set(left, secs);
      if (ctx.x && ctx.x.h) ctx.x.h.rotation.z = inside ? 0 : Math.sin(tt * 14) * 0.05;
      if (calm >= 1) ctx.finish("win", t.wonLine || null); else if (left <= 0) ctx.finish(calm >= 0.7 ? "close" : "lose", calm >= 0.7 ? t.nearLine || null : t.lostLine || null);
    });
    const down = () => { held = true; }, up = () => { held = false; };
    ctx.button(t.verb || "Hold", down, up); ctx.onAct(down, up);
  };
  // A divine weapon is not won by one calm minute. Three watches, one after another, and the calm begins again at each:
  // in the first the band drifts as in any test of stillness; in the second it leaps without warning but for a flicker;
  // in the third your own hand is knocked as well, and the band has narrowed. Lose the band and the calm drains faster
  // than it filled. All three, inside the time, or the weapon is not given.
  function steadyDivine(ctx) {
    const t = ctx.t, half0 = clamp(0.1 + ctx.power * 0.012, 0.09, 0.17), secs = Math.round((t.secs || 18) * 2.6), g = gauge(ctx, "h"), WATCH = ["First watch", "Second watch", "Third watch"];
    let hand = 0.3, mood = 0.5, mv = 0, calm = 0, left = secs, held = false, watch = 0, leap = 2.5, tell = 0, to = 0.5, jolt = 2, rest = 0;
    ctx.prompt(tx("Three watches, each harder than the last. Hold to move your hand right; let go and it drifts left. Stay inside the band.") + (t.help ? " " + tx(t.help) : ""));
    ctx.loop((dt, tt) => {
      left -= dt; ctx.clock.set(left, secs);
      if (rest > 0) { rest -= dt; return; }
      const half = half0 * (1 - watch * 0.14), quick = 1 + watch * 0.45;
      mv += (K.rng() - 0.5) * dt * 2.6 * quick; mv = clamp(mv, -0.4 * quick, 0.4 * quick); mood = clamp(mood + mv * dt, half, 1 - half); if (mood <= half || mood >= 1 - half) mv = -mv;
      if (watch >= 1) { leap -= dt; if (leap <= 0 && tell <= 0) { tell = 0.42; to = clamp(mood + (K.rng() < 0.5 ? -1 : 1) * (0.22 + K.rng() * 0.16), half, 1 - half); sfx("step"); }
        if (tell > 0) { tell -= dt; if (tell <= 0) { mood = to; mv = 0; leap = 2.2 + K.rng() * 1.8 - watch * 0.3; G.shake(0.12, 0.2); } } }
      if (watch >= 2) { jolt -= dt; if (jolt <= 0) { hand = clamp(hand + (K.rng() < 0.5 ? -1 : 1) * 0.13, 0, 1); jolt = 1.6 + K.rng() * 1.6; ctx.cue("bad"); } }
      hand = clamp(hand + (held ? 0.55 : -0.45) * dt, 0, 1);
      const inside = Math.abs(hand - mood) <= half; calm = clamp(calm + (inside ? dt / 5.5 : -dt / 3.5), 0, 1);
      g.band.style.left = (mood - half) * 100 + "%"; g.band.style.width = half * 200 + "%"; g.fill.style.left = hand * 100 + "%"; g.band.style.opacity = tell > 0 ? 0.45 + 0.5 * Math.abs(Math.sin(tt * 30)) : 1;
      ctx.score(tx("{w} · Steady: {c}%", { w: K.tr(WATCH[watch]), c: Math.round(calm * 100) }));
      if (ctx.x && ctx.x.h) ctx.x.h.rotation.z = inside ? 0 : Math.sin(tt * 14) * 0.05;
      if (calm >= 1) { watch++; if (watch >= 3) return ctx.finish("win", t.wonLine || null); calm = 0; rest = 1.1; leap = 1.6; sfx("heal"); ctx.toast(tx(watch === 1 ? "The first watch is kept. Now it leaps." : "The second is kept. Now your own hand is not your own."), "good"); }
      else if (left <= 0) { const near = watch >= 2 && calm >= 0.4; ctx.finish(near ? "close" : "lose", near ? t.nearLine || null : t.lostLine || null); }
    });
    const down = () => { held = true; }, up = () => { held = false; };
    ctx.button(t.verb || "Hold", down, up); ctx.onAct(down, up);
  }

  // =====================================================================================================
  // Breath: dive for the vessel on the lake bed and come up with air to spare.
  // =====================================================================================================
  SETUP.breath = { clear: 9, setup(ctx) {
    ctx.st = G.setStage("stage_deep_lake", { clear: 9 });
    meAt(ctx, 0, 0, Math.PI / 2, "swim"); ctx.me.root.position.y = 7;
    const v = mesh((b) => { b.cyl(0.22, 0.14, 0.34, 0, 0, 0, 0xd9a53a, 8); b.torus(0.16, 0.03, 0, 0.36, 0, 0x6b4a14, Math.PI / 2); }, G.mat.vcGlow); v.add(glow(0xffd27a, 2.4)); v.position.set(2, 0.4, 0); ctx.add(v); ctx.x = { v };
    // A line across the water at your own depth, and a ring round the vessel that closes as your hand does: what to line up, and how near you are.
    const lvl = ctx.add(new T.Mesh(new T.PlaneGeometry(7, 0.06), basic(0xffffff, 0.35)), G.fxRoot), ring = new T.Mesh(new T.RingGeometry(0.62, 0.72, 32), basic(0xffe2a0, 0.9)); v.add(ring); ctx.x.lvl = lvl; ctx.x.ring = ring;
    ctx.cam([0, 3.9, 11.5], [0, 3.6, 0], 50, true, 3.7);
  } };
  PLAY.breath = function (ctx) {
    const t = ctx.t, hard = !!t.divine, dives = (t.dives || 3) + (hard ? 1 : 0), need = (t.need || 2) + (hard ? 1 : 0), air0 = ((t.secs || 12) + ctx.power * 0.6) * (hard ? 0.86 : 1);
    let n = 0, got = 0, depth = 0, air = air0, held = false, has = false, reach = 0, vx = 2, rest = 0;
    const draw = () => ctx.score(pips(dives, got, n - got));
    draw(); ctx.prompt(tx(hard ? "Hold to dive, let go to rise. Keep your line on the glow until the ring closes, then come up." : "Hold to dive, let go to rise. Reach the glow, then come up before your breath is gone."));
    const end = (ok) => { n++; if (ok) got++; draw(); has = false; depth = 0; air = air0; rest = 1; ctx.toast(tx(ok ? "You bring it up." : "You come up with nothing."), ok ? "good" : "bad"); sfx(ok ? "heal" : "hit");
      if (got >= need) ctx.after(700, () => ctx.finish("win", null)); else if (got + dives - n < need) ctx.after(700, () => ctx.finish(got === need - 1 ? "close" : "lose", null)); };
    ctx.loop((dt, tt) => {
      if (rest > 0) { rest -= dt; return; }
      depth = clamp(depth + (held ? 0.24 : -0.34) * dt, 0, 1);
      vx = Math.sin(tt * (hard ? 0.8 : 0.5)) * 2.4; const gd = hard ? 0.74 + 0.2 * Math.sin(tt * 1.15 + n * 2) : 0.94, mx = ctx.me.root.position.x + ((has ? 0 : vx) - ctx.me.root.position.x) * Math.min(1, dt * 2.4); // (you swim after it: the test is your depth and your breath, not a chase)
      ctx.me.root.position.set(mx, 7 - depth * 6.4, 0); ctx.me.speed = held || depth > 0.02 ? 1.5 : 0;
      if (!has) ctx.x.v.position.set(vx, hard ? 7 - gd * 6.4 - 0.2 : 0.4, 0); else ctx.x.v.position.copy(ctx.me.root.position).add(V(0.3, 0.6, 0));
      if (depth > 0.02) air -= dt * (1 + depth * 0.9); else air = Math.min(air0, air + dt * 4);
      const level = hard ? Math.abs(depth - gd) < 0.1 : depth > 0.9, lv = ctx.x.lvl, rg = ctx.x.ring; lv.position.set(0, 7 - depth * 6.4 - 0.2, 0.2); lv.visible = depth > 0.02 && !has; lv.material.color.setHex(level ? 0x86c56f : 0xffffff); lv.material.opacity = level ? 0.8 : 0.35; rg.visible = !has; rg.scale.setScalar(1.6 - 0.9 * Math.min(1, reach / (hard ? 0.8 : 0.5))); rg.material.color.setHex(level ? 0x86c56f : 0xffe2a0);
      if (!has && level && Math.abs(mx - vx) < 0.9) { reach += dt; if (reach > (hard ? 0.8 : 0.5)) { has = true; reach = 0; sfx("tap"); ctx.toast(tx("You have it. Up!"), "good"); } } else reach = 0;
      ctx.clock.set(air, air0);
      if (has && depth <= 0.02) end(true); else if (air <= 0) end(false);
      if (K.rng() < dt * 6 && depth > 0.05) G.fx.burst("splash", ctx.me.headPos(), { n: 1, s: 0.3 });
    });
    const down = () => { held = true; }, up = () => { held = false; };
    ctx.button(t.verb || "Dive", down, up); ctx.onAct(down, up);
  };

  // =====================================================================================================
  // Words: retort (answer before the lamp), notice (look, then say what you saw), drill (say it back in order).
  // =====================================================================================================
  function talkSetup(ctx) {
    const t = ctx.t, cast = [].concat(K.val(t.cast) || []), who = (cast[0] && (typeof cast[0] === "string" ? cast[0] : cast[0].id)) || U.personByName(t.foe) || "sage";
    meAt(ctx, -0.9, 0.8, Math.PI / 2 + 0.5, "stand", { item: null });
    const f = ctx.figure(K.PUPPETS[who] || G.EXTRAS[who] || K.PEOPLE[who] ? who : "sage", { item: null }); f.place(0.9, 0.6, -Math.PI / 2 - 0.5); ctx.x = { foe: f };
    ctx.cam([0.3, 1.9, 5.6], [0, 1.25, 0.4], 40, true);
  }
  SETUP.retort = { clear: 8, setup: talkSetup };
  PLAY.retort = function (ctx) {
    const t = ctx.t, rounds = K.val(t.rounds) || [], need = t.divine ? rounds.length : Math.ceil(rounds.length * 2 / 3);
    let i = 0, right = 0, left = 0, total = 1, open = false;
    const draw = () => ctx.score(pips(rounds.length, right, i - right));
    const ask = () => {
      if (i >= rounds.length || right >= need || right + rounds.length - i < need) return ctx.finish(right >= need ? "win" : right === need - 1 ? "close" : "lose", null);
      const r = rounds[i], line = K.text(K.val(r.line)); total = left = (clamp(3.5 + ctx.power * 0.4, 3.5, 6.5) + line.length / 70 + 1.2) * (t.divine ? 0.72 : 1);
      ctx.x.foe.talk = true; ctx.me.talk = false; ctx.prompt(U.esc(line)); ctx.clearButtons(); open = true;
      shuffle(r.replies.map((s, k) => [s, k === 0])).forEach(([s, ok]) => ctx.choice(U.esc(K.text(K.val(s))), () => answer(ok), "wide"));
    };
    const answer = (ok) => { if (!open) return; open = false; i++; if (ok) right++; ctx.x.foe.talk = false; ctx.me.talk = true; ctx.toast(tx(ok === null ? "Too slow." : ok ? "A good answer." : "A poor answer."), ok ? "good" : "bad"); sfx(ok ? "tap" : "hit"); draw(); ctx.clearButtons(); ctx.clock.hide(); ctx.after(900, ask); };
    ctx.loop((dt) => { if (!open) return; left -= dt; ctx.clock.set(left, total); if (left <= 0) answer(null); });
    ctx.tapActs = false; draw(); ask();
  };
  SETUP.notice = { clear: 8, setup(ctx) { meAt(ctx, 0, 1.4, Math.PI, "think", { item: null }); ctx.cam([1.6, 2.2, 5.6], [0, 1.1, 0], 42, true); } };
  PLAY.notice = function (ctx) {
    const t = ctx.t, all = shuffle((K.val(t.things) || []).slice()), count = Math.min(t.count || 7, Math.max(3, all.length - 3)), seen = all.slice(0, count), unseen = all.slice(count);
    const look = clamp(3 + ctx.power * 0.3, 3, 5.5) + count * 0.35; let left = look, phase = "look", q = 0, right = 0;
    const list = U.el('<div class="t-list">' + seen.map((s) => "<span>" + U.esc(K.text(s)) + "</span>").join("") + "</div>"); ctx.mid.appendChild(list);
    ctx.prompt(tx(t.lookLine || "Look well. You have {n} seconds.", { n: Math.round(look) })); ctx.tapActs = false;
    const ask = () => {
      if (q >= 3) return ctx.finish(right >= 2 ? "win" : right === 1 ? "close" : "lose", null);
      ctx.clearButtons(); ctx.prompt(tx(t.ask || "Which of these did you see?")); ctx.score(pips(3, right, q - right));
      const yes = seen[q % seen.length], no = shuffle(unseen).slice(0, 2); if (no.length < 2) no.push(...shuffle(all.filter((x) => x !== yes && !no.includes(x))).slice(0, 2 - no.length));
      shuffle([[yes, true]].concat(no.map((s) => [s, false]))).forEach(([s, ok]) => ctx.choice(U.esc(K.text(s)), () => { q++; if (ok) right++; ctx.toast(tx(ok ? "Yes." : "No. That was not there."), ok ? "good" : "bad"); sfx(ok ? "tap" : "hit"); ask(); }, "wide"));
    };
    ctx.loop((dt) => { if (phase !== "look") return; left -= dt; ctx.clock.set(left, look); if (left <= 0) { phase = "ask"; list.remove(); ctx.clock.hide(); ask(); } });
  };
  const DRILL = { mudra: ["Pataka", "Mushti", "Shikhara", "Hamsa", "Padma"], verse: ["Fire", "Water", "Wind", "Earth", "Sky"], code: ["Lamp", "Conch", "Drum", "Flag", "Smoke"] };
  SETUP.drill = { clear: 8, setup: talkSetup };
  PLAY.drill = function (ctx) {
    const t = ctx.t, set = DRILL[t.set] || DRILL.verse, lens = t.lengths || [3, 4, 5];
    let r = 0, perfect = 0, seq = [], at = 0, phase = "show"; ctx.tapActs = false;
    const draw = () => ctx.score(pips(lens.length, perfect, r - perfect));
    const round = () => {
      if (r >= lens.length) return ctx.finish(perfect >= 2 ? "win" : perfect === 1 ? "close" : "lose", null);
      seq = Array.from({ length: lens[r] }, () => Math.floor(K.rng() * set.length)); at = 0; phase = "show"; ctx.clearButtons(); ctx.prompt(tx(t.watch || "Watch."));
      ctx.x.foe.talk = true; const gap = clamp(950 - ctx.power * 25, 600, 950);
      seq.forEach((s, k) => ctx.after(500 + k * gap, () => { ctx.toast(tx(set[s]), "good"); sfx("tap"); ctx.x.foe.act("nod", 0.4); }));
      ctx.after(700 + seq.length * gap, () => { phase = "say"; ctx.x.foe.talk = false; ctx.prompt(tx(t.repeat || "Now give them back, in order.")); set.forEach((name, k) => ctx.choice(tx(name), () => say(k))); });
    };
    const say = (k) => { if (phase !== "say") return; if (k !== seq[at]) { phase = "x"; r++; ctx.toast(tx(t.bad || "Wrong."), "bad"); sfx("hit"); draw(); return ctx.after(900, round); } at++; sfx("tap"); ctx.me.act("nod", 0.3); if (at >= seq.length) { phase = "x"; r++; perfect++; ctx.toast(tx(t.good || "Every one, in order."), "good"); draw(); ctx.after(900, round); } };
    draw(); round();
  };

  // =====================================================================================================
  // Dice: pasha (three long dice, best of three rounds) and hands (which of Shakuni's throws was not honest?).
  // =====================================================================================================
  const FACES = [1, 2, 5, 6], throwDie = () => K.pick(FACES), sum = (a) => a.reduce((n, x) => n + x, 0);
  const diceRow = (d, pickable) => '<span class="dice">' + d.map((n, i) => '<button type="button" class="die' + (pickable ? " pick" : "") + '" data-i="' + i + '"' + (pickable ? "" : " disabled") + ">" + n + "</button>").join("") + "</span>";
  function diceSetup(ctx) { ctx.st = G.setStage("scene_dice_hall", { clear: 8 }); meAt(ctx, -1.1, 0.4, Math.PI / 2, "sitPlay", { item: null }); const f = ctx.figure(ctx.t.who ? U.personByName(ctx.t.who) || "shakuni" : "shakuni", { item: "dice" }); f.place(1.1, 0.4, -Math.PI / 2); f.pose("sitPlay", true); ctx.x = { foe: f }; ctx.cam([0, 2.6, 5.4], [0, 0.8, 0.3], 40, true); }
  SETUP.pasha = { clear: 8, setup: diceSetup }; SETUP.hands = { clear: 8, setup: diceSetup };
  AUTO.pasha = function () { let me = 0, them = 0; while (me < 2 && them < 2) { const a = [0, 0, 0].map(throwDie), b = [0, 0, 0].map(throwDie); const lo = a.indexOf(Math.min(...a)); if (a[lo] <= 2) a[lo] = throwDie(); const lb = b.indexOf(Math.min(...b)); if (b[lb] <= 2) b[lb] = throwDie(); if (sum(a) > sum(b)) me++; else if (sum(b) > sum(a)) them++; } return [me > them ? "win" : "lose", null]; };
  AUTO.hands = function () { return [K.rng() < (K.S.flags.includes("saw_long_dice") ? 0.85 : 0.6) ? "win" : "lose", null]; };
  PLAY.pasha = function (ctx) {
    const opp = K.tr("Shakuni"); let me = 0, them = 0, round = 1, mine = null, theirs = null, rolled = false; ctx.tapActs = false;
    const box = U.el('<div class="t-board"></div>'); ctx.mid.appendChild(box);
    ctx.prompt(tx("Three long dice each, marked one, two, five and six. The higher total takes the round; two rounds win the game. Once a round you may throw one of your dice again."));
    const draw = (note) => {
      ctx.score(tx("Round {n}", { n: round }) + " · " + tx("You {a}, {who} {b}", { a: me, b: them, who: opp }));
      box.innerHTML = (mine ? '<div class="row"><b>' + tx("You") + "</b>" + diceRow(mine, !rolled && !theirs) + "<em>" + sum(mine) + "</em></div>" : "") + (theirs ? '<div class="row"><b>' + U.esc(opp) + "</b>" + diceRow(theirs) + "<em>" + sum(theirs) + "</em></div>" : "") + (note ? "<p>" + note + "</p>" : "");
      box.querySelectorAll(".die.pick").forEach((b) => b.addEventListener("click", () => { mine[+b.dataset.i] = throwDie(); rolled = true; sfx("dice"); draw(); }));
      ctx.clearButtons();
      if (me >= 2 || them >= 2) return ctx.after(900, () => ctx.finish(me > them ? "win" : "lose", null));
      if (!mine) ctx.choice(tx("Throw"), () => { mine = [0, 0, 0].map(throwDie); sfx("dice"); ctx.me.act("throw", 0.5); draw(tx("Tap one die to throw it again, or stand.")); });
      else if (!theirs) ctx.choice(tx("Stand on {n}", { n: sum(mine) }), () => { theirs = [0, 0, 0].map(throwDie); const lo = theirs.indexOf(Math.min(...theirs)); if (theirs[lo] <= 2) theirs[lo] = throwDie(); sfx("dice"); ctx.x.foe.act("throw", 0.5); const a = sum(mine), b = sum(theirs); if (a > b) me++; else if (b > a) them++; draw(tx(a > b ? "The round is yours." : b > a ? "The round is his." : "Level. Throw again.")); });
      else ctx.choice(tx("Next round"), () => { round++; mine = theirs = null; rolled = false; draw(); });
    };
    draw();
  };
  PLAY.hands = function (ctx) {
    const who = ctx.t.who ? K.tr(ctx.t.who) : K.tr("Shakuni"), throws = Array.from({ length: 5 }, () => [0, 0, 0].map(throwDie)), swap = Math.floor(K.rng() * 5);
    throws[swap][Math.floor(K.rng() * 3)] = K.rng() < 0.5 ? 3 : 4; ctx.tapActs = false;
    const box = U.el('<div class="t-board"></div>'); ctx.mid.appendChild(box);
    ctx.prompt(tx("{who} will throw five times. One throw is not honest. Watch the hands.", { who }));
    const gap = clamp(1500 + ctx.power * 60, 1500, 2100);
    const watch = (i) => {
      if (i >= 5) { box.innerHTML = ""; ctx.prompt(tx("Which throw was not honest?")); for (let k = 0; k < 5; k++) ctx.choice(tx("Throw {n}", { n: k + 1 }), () => ctx.finish(k === swap ? "win" : "lose", k === swap ? "A long die has no three and no four. You saw it." : "You named the wrong throw.")); return; }
      ctx.score(tx("Throw {n} of 5", { n: i + 1 })); ctx.x.foe.act("throw", 0.5); sfx("dice");
      box.innerHTML = '<div class="row">' + diceRow(throws[i]) + "</div><p>" + tx("{who} calls {n}, and the dice show {n}.", { who, n: sum(throws[i]) }) + "</p>";
      ctx.after(gap, () => watch(i + 1));
    };
    ctx.choice(tx("Watch his hands"), () => { ctx.clearButtons(); watch(0); });
  };

  // =====================================================================================================
  // Sneak: cross while the guard looks away; stand still when he turns.
  // =====================================================================================================
  // The yard is yours to cross any way you can find. Guards walk their beats and each one's sight lies on the ground in
  // front of him as a fan of light: stand in it with nothing between you and he grows sure of you; stay, and you are
  // seen. Crates and pillars hide you. Run and the nearest guard hears and turns; creep and he does not. A pebble
  // thrown ahead draws their eyes to where it lands. (Before: one button, hold to walk a straight line, stop on a tell.)
  const SNEAK = { W: 5.6, D: 7.2, cover: [[-3.1, 3.4, 0.9, 0.6], [2.5, 2.3, 0.7, 0.7], [-0.6, -0.1, 1.1, 0.55], [3.3, -2.5, 0.75, 0.7], [-3.4, -3.0, 0.8, 0.65], [0.4, -4.4, 0.6, 0.5]] };
  function sneakClear(ax, az, bx, bz) { // is the straight line from a to b free of every crate?
    for (const [cx, cz, hw, hd] of SNEAK.cover) { let t0 = 0, t1 = 1, ok = true;
      for (const [o, d, lo, hi] of [[ax, bx - ax, cx - hw, cx + hw], [az, bz - az, cz - hd, cz + hd]]) { if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { ok = false; break; } } else { let u = (lo - o) / d, v = (hi - o) / d; if (u > v) { const w = u; u = v; v = w; } t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) { ok = false; break; } } }
      if (ok) return false; }
    return true;
  }
  SETUP.sneak = { clear: 11, setup(ctx) {
    const t = ctx.t, field = /field|river/.test(K.val(t.stage) || ""); // (out on the field after dark: a night sky with the moon behind cloud, not a lamplit hall)
    if (field && !t.daylight) G.setSky("night", { hi: 0.95, amb: 0.5, si: 1.25 }); else G.setSky(t.daylight ? "day" : "hall", t.daylight ? null : { hi: 1.5, amb: 0.75, si: 1.9, fd: 0.008 });
    meAt(ctx, 0, SNEAK.D - 0.6, Math.PI, "sneak", { item: null });
    if (/^Carry/.test(t.verb || "")) { try { const who = /Iravan/.test(K.val(ctx.c && ctx.c.t) || "") && K.PUPPETS.iravan ? "iravan" : "guard", bd = ctx.figure(who, { item: null }); bd.pose("down", true); const hold = ctx.me.j && (ctx.me.j.T || ctx.me.j.P); if (hold) { hold.add(bd.root); bd.root.rotation.set(0, 0, Math.PI / 2); bd.root.position.set(0.82, 0.5, -0.16); bd.root.scale.setScalar(0.92); bd.pose("stand", true); ctx.x0 = { carried: bd }; } } catch (e) {} } // the one you carry, across your shoulders
    const wood = new T.MeshLambertMaterial({ color: 0x7a5632 }), dark = new T.MeshLambertMaterial({ color: 0x5a3e24 });
    SNEAK.cover.forEach(([cx, cz, hw, hd], i) => { const m = new T.Mesh(new T.BoxGeometry(hw * 2, i % 3 === 2 ? 1.5 : 0.95, hd * 2), i % 2 ? wood : dark); m.position.set(cx, i % 3 === 2 ? 0.75 : 0.475, cz); m.castShadow = true; ctx.add(m, G.fxRoot); const lid = new T.Mesh(new T.BoxGeometry(hw * 2 + 0.1, 0.07, hd * 2 + 0.1), wood); lid.position.set(cx, i % 3 === 2 ? 1.5 : 0.95, cz); ctx.add(lid, G.fxRoot); });
    const n = 2 + (t.twist === "turns" ? 1 : 0), range = 5.0, half = 0.5, guards = [];
    for (let i = 0; i < n; i++) {
      const z = [1.3, -1.6, -3.6][i], f = ctx.figure(i === 0 && K.PUPPETS[t.watch] ? t.watch : "guard", { item: "spear" }); f.place(i % 2 ? 4 : -4, z, 0); f.pose("readySpear", true);
      const cone = new T.Mesh(new T.CircleGeometry(range, 22, -half, half * 2).rotateX(-Math.PI / 2), basic(0xffd060, 0.3)); cone.position.y = 0.05; cone.renderOrder = 2; ctx.add(cone, G.fxRoot);
      const lamp = glow(0xffc070, 1.2); ctx.add(lamp, G.fxRoot);
      guards.push({ f, cone, lamp, x: i % 2 ? 4 : -4, z, dir: i % 2 ? -1 : 1, a: 0, wait: 0, alert: 0, lx: 0, lz: 0, range, half, still: i === 2 });
    }
    const goal = new T.Mesh(new T.RingGeometry(0.55, 0.8, 24).rotateX(-Math.PI / 2), basic(0x7fe08a, 0.85)); goal.position.set(0, 0.06, -SNEAK.D + 0.7); ctx.add(goal, G.fxRoot);
    let dog = null;
    if (t.twist === "dog") { dog = { x: -2.2, z: 0.9, r: 2.3, m: ctx.add(G.PROPS && G.PROPS.dog ? G.beast4("dog", 0x7a5a3c) : mesh((b) => { b.box(0.5, 0.22, 0.24, 0, 0.02, 0, 0x8a6a48); b.sph(0.13, 0.3, 0.14, 0, 0x8a6a48); b.box(0.2, 0.05, 0.05, -0.32, 0.06, 0.05, 0x6a4e34); }), G.fxRoot), ring: new T.Mesh(new T.RingGeometry(2.2, 2.3, 32).rotateX(-Math.PI / 2), basic(0xff9a70, 0.5)) }; dog.m.position.set(dog.x, 0, dog.z); dog.m.rotation.y = 0.9; if (G.lie) G.lie(dog.m, 1); dog.ring.position.set(dog.x, 0.05, dog.z); ctx.add(dog.ring, G.fxRoot); }
    ctx.x = { guards, goal, dog }; ctx.cam([0, 7.2, 12.4], [0, 0, SNEAK.D - 5], 54, true);
  } };
  PLAY.sneak = function (ctx) {
    const t = ctx.t, trips = t.trips || 2, maxSpots = t.spots || 2, secs = (t.secs || 45) + 25 + (t.twist ? 8 : 0), x = ctx.x, W = SNEAK.W, D = SNEAK.D;
    let done = 0, seen = 0, left = secs, out = true, sus = 0, grace = 1.2, creep = false, stones = 2, over = false;
    const keen = clamp(1.25 - ctx.power * 0.035, 0.7, 1.25) * (t.daylight ? 1.2 : 1) * (t.twist === "turns" ? 1.1 : 1);
    const w = walker(ctx, 3.3, [W, D - 0.5]); w.z = D - 0.6;
    const draw = () => ctx.score(tx(t.tally || "Crossings: {d} of {n} · Seen: {s} of {m}", { d: done, n: trips, s: seen, m: maxSpots }));
    draw(); ctx.prompt(tx("Cross to the green ring without standing in a guard's sight. Crates hide you. Running is heard; creeping is not."));
    const meter = U.el('<div class="t-sus"><i></i></div>'); ctx.hud.appendChild(meter);
    const hearAll = (hx, hz, far, secsOn) => { for (const g of x.guards) if (Math.hypot(g.x - hx, g.z - hz) < far) { g.alert = secsOn; g.lx = hx; g.lz = hz; } };
    const back = () => { w.x = 0; w.z = out ? D - 0.6 : -D + 0.8; w.tx = null; sus = 0; grace = 1.4; for (const g of x.guards) g.alert = 0; };
    const blocked = (nx, nz) => SNEAK.cover.some(([cx, cz, hw, hd]) => Math.abs(nx - cx) < hw + 0.3 && Math.abs(nz - cz) < hd + 0.3);
    ctx.loop((dt) => {
      if (over) return; left -= dt; ctx.clock.set(left, secs); grace -= dt;
      const ox = w.x, oz = w.z; w.step(dt, creep ? 0.45 : 1);
      if (blocked(w.x, w.z)) { if (!blocked(w.x, oz)) w.z = oz; else if (!blocked(ox, w.z)) w.x = ox; else { w.x = ox; w.z = oz; } w.tx = null; ctx.me.root.position.set(w.x, 0, w.z); }
      ctx.cam([w.x * 0.5, 7.2, Math.min(12.4, w.z + 6.4)], [w.x * 0.5, 0, w.z - 4.4], 54);
      const moving = ctx.me.speed > 0.1, running = moving && !creep; ctx.me.pose(creep || !moving ? "sneak" : "stand");
      let inSight = 0;
      for (const g of x.guards) {
        if (g.alert > 0) { g.alert -= dt; g.a = turnA(g.a, Math.atan2(g.lx - g.x, g.lz - g.z), dt * 5); g.f.speed = 0; }
        else if (g.still) { g.a += dt * 0.9 * g.dir; g.f.speed = 0; }
        else if (g.wait > 0) { g.wait -= dt; g.a = turnA(g.a, g.dir > 0 ? Math.PI / 2 : -Math.PI / 2, dt * 2.6); g.f.speed = 0; }
        else { g.x += g.dir * 1.45 * dt; g.a = turnA(g.a, (g.dir > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.sin(left * 1.3 + g.z) * 0.55, dt * 3); g.f.speed = 1.45; if (Math.abs(g.x) > 4.2) { g.x = clamp(g.x, -4.2, 4.2); g.dir = -g.dir; g.wait = 0.9; } }
        g.f.root.position.set(g.x, 0, g.z); g.f.turnTo(g.a); g.cone.position.set(g.x, 0.05, g.z); g.cone.rotation.y = g.a - Math.PI / 2; g.lamp.position.set(g.x, 2.3, g.z);
        const dx = w.x - g.x, dz = w.z - g.z, dist = Math.hypot(dx, dz); let da = Math.atan2(dx, dz) - g.a; da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
        const sees = grace <= 0 && dist < g.range && da < g.half && sneakClear(g.x, g.z, w.x, w.z);
        if (sees) inSight = Math.max(inSight, (1.7 - dist / g.range) * (creep ? 0.6 : 1) * (moving ? 1 : 0.7));
        if (running && grace <= 0 && dist < 2.7 && g.alert <= 0) { g.alert = 1.6; g.lx = w.x; g.lz = w.z; sfx("step"); G.fx.ring(new T.Vector3(w.x, 0.06, w.z), 0xffd9a0, 0.3, 2.7, 0.5); }
        g.cone.material.color.setHex(sees ? 0xff5a3a : g.alert > 0 ? 0xffa040 : 0xffd060); g.cone.material.opacity = sees ? 0.5 : 0.3;
      }
      if (x.dog && x.dog.m.userData.bones) { const up = x.dog.r === 0; G.lie(x.dog.m, up ? 0 : 1, dt); if (up) { x.dog.m.rotation.y = Math.atan2(w.x - x.dog.x, w.z - x.dog.z); G.gallop(x.dog.m, tt, 0); x.dog.m.userData.bones.neck.rotation.x = -0.22 + (Math.sin(tt * 9) > 0.3 ? -0.22 : 0); } } /* (woken, it is on its feet, barking at you; then it settles again) */
      if (x.dog && running && grace <= 0 && Math.hypot(w.x - x.dog.x, w.z - x.dog.z) < x.dog.r) { ctx.toast(tx("The dog wakes and barks."), "bad"); sfx("hit"); hearAll(x.dog.x, x.dog.z, 9, 2.6); for (const g of x.guards) { g.lx = w.x; g.lz = w.z; } sus = Math.min(0.95, sus + 0.3); grace = 0.01; x.dog.r = 0; x.dog.ring.visible = false; ctx.after(6000, () => { if (x.dog) { x.dog.r = 2.3; x.dog.ring.visible = true; } }); }
      sus = clamp(sus + (inSight > 0 ? inSight * keen * 1.15 : -0.55) * dt, 0, 1); meter.firstChild.style.width = Math.round(sus * 100) + "%"; meter.classList.toggle("hot", inSight > 0);
      if (sus >= 1) { seen++; ctx.toast(tx(t.spotted || "A guard has seen you. You slip back."), "bad"); ctx.cue("bad"); draw(); if (seen >= maxSpots) { over = true; return ctx.finish(done >= trips - 1 && trips > 1 ? "close" : "lose", null); } back(); }
      const gz = x.goal.position.z;
      if (Math.hypot(w.x - x.goal.position.x, w.z - gz) < 0.95) { if (out) { done++; draw(); sfx("tap"); if (done >= trips) { over = true; return ctx.finish("win", null); } ctx.toast(tx(t.made || "Through. Now back."), "good"); } out = !out; grace = 0.8; x.goal.position.z = out ? -D + 0.7 : D - 0.6; }
      if (left <= 0) { over = true; ctx.finish(done >= trips - 1 && trips > 1 ? "close" : "lose", null); }
    });
    const keys = ctx.keys; ctx.keys = (e, down) => { if (e.key === "Shift" || e.key.toLowerCase() === "c") { creep = down; return true; } if (down && e.key.toLowerCase() === "f") { toss(); return true; } return keys(e, down); };
    ctx.button("Creep", () => { creep = true; }, () => { creep = false; });
    const tossB = ctx.button(K.text(["Toss a pebble ({n})", { n: stones }]), () => toss());
    function toss() { if (stones <= 0 || over) return; stones--; tossB.textContent = K.text(["Toss a pebble ({n})", { n: stones }]); if (!stones) tossB.disabled = true;
      const a = ctx.me.face, px = clamp(w.x + Math.sin(a) * 4.5, -W, W), pz = clamp(w.z + Math.cos(a) * 4.5, -D, D), from = ctx.me.root.position.clone().setY(1.2), to = new T.Vector3(px, 0.1, pz);
      G.fx.arrow(from, to, 0.5, 1.6, () => { sfx("tap"); G.fx.burst("dust", to, { n: 6 }); G.fx.ring(to, 0xffe9b0, 0.2, 2.4, 0.6); hearAll(px, pz, 7, 3); }); }
  };

  // =====================================================================================================
  // Fuse: cut the oil lines while the lamp is elsewhere.
  // =====================================================================================================
  SETUP.fuse = { clear: 9, setup(ctx) {
    meAt(ctx, 0, 2.4, Math.PI, "sneak", { item: "dagger" });
    G.setSky(G.skyName, { amb: 0.75, hi: 1.1, si: 0.9, fd: 0.006, top: 0x24160c, hor: 0x2e1c10, bot: 0x24160c }); // (a cellar by lamplight, not a black screen; what shows past the roof is dark timber, not a void)
    const lines = [-3, 0, 3].map((lx) => { const m = ctx.add(new T.Mesh(new T.BoxGeometry(0.3, 0.05, 6), basic(0xd9a53a, 0.85)), G.fxRoot); m.position.set(lx, 0.05, -1.4); return m; });
    const lamp = glow(0xffc070, 7); lamp.position.set(-3, 1.2, -1.5); ctx.add(lamp, G.fxRoot); const pool = ctx.add(new T.Mesh(new T.CircleGeometry(1.5, 28).rotateX(-Math.PI / 2), basic(0xffd27a, 0.3)), G.fxRoot); pool.position.set(-3, 0.04, -1.4);
    const pick = ctx.add(new T.Mesh(new T.RingGeometry(0.55, 0.7, 28).rotateX(-Math.PI / 2), basic(0x8fd0ff, 0.9)), G.fxRoot); pick.position.set(0, 0.07, 2.4);
    ctx.x = { lines, lamp, pool, pick }; ctx.cam([0, 2.85, 8.4], [0, 0.5, -0.6], G.W / G.H < 0.8 ? 78 : 50, true); // (under the cellar's low roof: the old view stood above it and saw nothing) // (a narrow screen looks wider; it cannot step back through the cellar wall)
  } };
  PLAY.fuse = function (ctx) {
    const t = ctx.t, N = t.lines || 3, secs = t.secs || 48, x = ctx.x, need = clamp(2.6 - ctx.power * 0.08, 1.6, 2.6);
    const prog = [0, 0, 0], cut = [false, false, false]; let sel = 1, left = secs, held = false, lit = 0, next = 2.5, warn = -1, caught = 0; ctx.tapActs = false;
    const draw = () => ctx.score(tx("Lines cut: {n} of {m}", { n: cut.filter(Boolean).length, m: N }) + " · " + tx("Caught: {n} of 2", { n: caught }));
    draw(); ctx.prompt(tx("Choose a line, then hold to cut it while the lamp is away. If the light comes to your line, let go."));
    const done = () => { const n = cut.filter(Boolean).length; K.S.fusesCut = n; ctx.finish(n >= 2 ? "win" : n === 1 ? "close" : "lose", null); };
    [0, 1, 2].slice(0, N).forEach((i) => ctx.choice(String(i + 1), () => { sel = i; held = false; }));
    const down = () => { held = true; }, up = () => { held = false; }; ctx.button(t.verb || "Cut", down, up); ctx.onAct(down, up);
    ctx.loop((dt, tt) => {
      left -= dt; ctx.clock.set(left, secs); next -= dt;
      if (next <= 0.7 && warn < 0) { const o = [0, 1, 2].filter((i) => i !== lit); warn = o[Math.floor(K.rng() * o.length)]; }
      if (next <= 0) { lit = warn; warn = -1; next = 2.2 + K.rng() * 2; }
      const lx = [-3, 0, 3][lit]; x.lamp.position.x += (lx - x.lamp.position.x) * Math.min(1, dt * 6); x.lamp.material.opacity = warn >= 0 ? 0.6 + 0.4 * Math.sin(tt * 30) : 1; x.pool.position.x = x.lamp.position.x; x.pick.position.x = ctx.me.root.position.x; x.pick.material.color.setHex(held ? 0x86c56f : 0x8fd0ff);
      ctx.me.root.position.x += ([-3, 0, 3][sel] - ctx.me.root.position.x) * Math.min(1, dt * 8); ctx.me.pose(held ? "herbs" : "sneak");
      if (held && !cut[sel]) {
        if (lit === sel && Math.abs(x.lamp.position.x - lx) < 0.6) { caught++; held = false; prog[sel] = Math.max(0, prog[sel] - 0.8); ctx.toast(tx("The light finds you. You drop flat."), "bad"); ctx.cue("bad"); draw(); if (caught >= 2) return done(); }
        else { prog[sel] += dt; if (prog[sel] >= need) { cut[sel] = true; x.lines[sel].scale.z = 0.45; x.lines[sel].material.color.setHex(0x4a3a2a); sfx("clang"); ctx.toast(tx("Cut."), "good"); draw(); if (cut.filter(Boolean).length >= 2) return done(); } }
      }
      if (left <= 0) done();
    });
  };

  // =====================================================================================================
  // Race: three lanes, what lies in the road, a rival, the whip (rules/race.js).
  // =====================================================================================================
  const LANE = [-2.4, 0, 2.4];
  function vehicle(ctx, kind, col) {
    if (kind === "boat") return mesh((b) => { b.box(1.1, 0.4, 3.2, 0, 0, 0, col || 0x7a5232); b.box(0.9, 0.1, 2.6, 0, 0.4, 0, 0x9a7242); b.rod(0, 0.4, 0, 0, 2.4, 0, 0.05, 0x3a2414, 5); b.box(0.04, 1.4, 1.2, 0, 1, 0.2, 0xf2ead2); });
    if (kind === "foot") return null;
    const ch = G.chariot({ col: col || 0x6e3026, flag: null }); ch.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return ch;
  }
  SETUP.race = { clear: 20, setup(ctx) {
    const t = ctx.t, kind = t.vehicle || "chariot";
    if (kind === "boat") ctx.st = G.setStage("stage_storm_sea", { clear: 20 });
    const car = vehicle(ctx, kind, 0x2d4a7a); let fig = null;
    if (car) { ctx.add(car); car.rotation.y = Math.PI; } else { fig = meAt(ctx, 0, 6, Math.PI, "stand", { item: null }); }
    if (car) { ctx.me = ctx.figure("me", { item: null }); ctx.me.pose("drive", true); car.add(ctx.me.root); ctx.me.root.position.set(0, kind === "boat" ? 0.5 : 0.75, kind === "boat" ? 0.4 : -0.6); ctx.me.root.rotation.y = 0; ctx.me.face = 0; }
    let rival = null; if (t.rival) { rival = vehicle(ctx, kind, 0x7a1f2a) || ctx.figure(U.personByName(t.rival) || "soldier").root; if (rival.parent !== G.actors) ctx.add(rival); rival.rotation.y = Math.PI; }
    ctx.x = { car, fig, rival, kind, obs: new Map() };
    ctx.cam([0, 5.2, 15], [0, 1, 0], 50, true);
  } };
  const OBS_COL = { rock: 0x8a7a64, wreck: 0x5a3a20, fire: 0xff7a2a, wave: 0xbfe8f0, arrow: 0xe6c98c, ice: 0xd8eef4, lotus: 0xf0a0c0, stone: 0x8a7a64 };
  PLAY.race = function (ctx) {
    const t = ctx.t, x = ctx.x, o = U.raceSetup(t, ctx.power); if (t.divine) { o.base *= 1.22; o.gap *= 0.74; o.lives = Math.max(2, o.lives - 1); } o.who = t.rival ? K.tr(t.rival) : "";
    const R = U.raceRules(o, K.rng), s = steering(ctx, t.upVerb ? "◀" : "◀", "▶"); s.tapL = () => R.move(-1); s.tapR = () => R.move(1);
    if (o.whip) ctx.button("Whip", () => { if (R.whip()) sfx("hit"); });
    if (o.bow) ctx.button("Loose", () => { const r = R.shoot(); if (r === "hit") { ctx.toast(tx("Hit!"), "good"); sfx("clang"); } else if (r === "far") ctx.toast(tx("Too far."), "bad"); });
    ctx.prompt(tx(K.val(t.helpSide) || K.val(t.help) || "Change lanes to keep clear of what lies in the road."));
    let lx = 0, roll = 0; const me = x.car || x.fig.root;
    ctx.loop((dt, tt) => {
      const ev = R.step(dt);
      for (const e of ev) {
        if (e.type === "spawn") { const m = ctx.add(e.o.kind === "fire" ? glow(0xff7a2a, 2.4) : mesh((b) => { if (e.o.kind === "arrow") b.rod(0, 0.2, 0, 0, 1.5, 0.6, 0.04, OBS_COL.arrow, 4); else if (e.o.kind === "wave") b.box(2, 0.7, 0.5, 0, 0, 0, OBS_COL.wave); else b.sph(0.6, 0, 0.2, 0, OBS_COL[e.o.kind] || 0x8a7a64, 0.8, 6); })); x.obs.set(e.o, m); }
        else if (e.type === "gone") { const m = x.obs.get(e.o); if (m) { m.visible = false; x.obs.delete(e.o); } }
        else if (e.type === "hit") { ctx.cue("bad"); ctx.toast(tx(t.bump || "You hit something in the road."), "bad"); G.fx.burst("dust", me.position, { n: 12, s: 2 }); }
        else if (e.type === "catch") { sfx("clang"); } else if (e.type === "miss") ctx.cue("bad");
        else if (e.type === "warn") ctx.toast(tx("He cuts across you!"), "bad"); else if (e.type === "clash") { sfx("clang"); G.shake(0.25, 0.3); G.fx.burst("spark", me.position.clone().setY(1), { n: 12 }); }
        else if (e.type === "end") return ctx.finish(e.outcome, e.line ? [e.line[0], e.line[1]] : null);
      }
      lx += (LANE[R.lane] - lx) * Math.min(1, dt * 10); me.position.set(lx, x.kind === "boat" ? Math.sin(tt * 2) * 0.12 : 0, 6);
      roll += R.speed() * dt * 3; if (x.car && x.kind === "chariot") G.roll(x.car, roll, tt, R.speed() / 3); if (x.fig) x.fig.speed = R.speed() * 1.2;
      for (const [ob, m] of x.obs) m.position.set(LANE[ob.lane], ob.kind === "fire" ? 0.8 : 0, 6 - (ob.x - 17) * 0.42);
      if (x.rival) { x.rival.position.set(LANE[R.rLane] + (x.rival.position.x - LANE[R.rLane]) * Math.max(0, 1 - dt * 8), 0, 6 - (R.rival - R.dist) * 0.9); if (x.kind === "chariot" && x.rival.userData.wheels) G.roll(x.rival, roll, tt, 1); }
      if (ctx.st.lastGround && ctx.st.lastGround.material.map) ctx.st.lastGround.material.map.offset.y = -roll * 0.02;
      if (K.rng() < dt * 8 * R.speed() / 3) G.fx.burst(x.kind === "boat" ? "splash" : "dust", V(lx, 0.1, 7.2), { n: 1 });
      ctx.score(tx(t.tally || "Distance: {d}% · Hits: {h} of {l}", { d: Math.min(100, Math.round(R.dist)), h: o.shield ? R.miss : R.hits, l: o.lives, c: R.caught, m: R.miss }));
    });
  };

  // =====================================================================================================
  // Dash and rings: the wheel formation seen from above. Steer round it to the openings (rules/dash.js).
  // =====================================================================================================
  function ringMesh(r, n, half, band, col) { // a ring of wall with n openings (half: half an opening, along the ring)
    const b = new G.Builder(), seg = 72, gapA = half / r;
    for (let i = 0; i < seg; i++) { const a = (i + 0.5) / seg * Math.PI * 2; let open = false; for (let k = 0; k < n; k++) { let d = a - (k * Math.PI * 2) / n; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < gapA) open = true; } if (!open) b.box((Math.PI * 2 * r) / seg * 1.05, 1.1, band, Math.sin(a) * r, 0, Math.cos(a) * r, col, a); }
    return b.mesh();
  }
  const DS = 0.1; // world metres per rule unit
  SETUP.dash = { clear: 20, setup(ctx) { ctx.st = G.setStage("stage_chakravyuha_top", { clear: 20 }); ctx.cam([0, 30, 16], [0, 0, 0], 46, true); } };
  PLAY.dash = function (ctx) {
    const t = ctx.t, D = U.DASH, o = U.dashSetup(t, ctx.power, U.assist()), R = U.dashRules(o, K.rng), s = steering(ctx);
    const rings = R.rings.map((g) => { const m = ctx.add(ringMesh(g.r * DS, g.n, g.half * DS, D.BAND * DS, 0xa3302a)); return m; });
    const myRing = R.my ? ctx.add(ringMesh(R.my.r * DS, R.my.n, R.my.half * DS, D.MY_BAND * DS, 0x2d5aa0)) : null;
    const dot = (col, sz) => ctx.add(mesh((b) => { b.box(sz * 0.6, 0.5, sz, 0, 0, 0, col); b.cone(sz * 0.3, 0.5, 0, 0.5, 0, 0xe2b55a, 4); }));
    const me = R.me ? dot(0x2d5aa0, 1.2) : null, abhi = R.abhi ? dot(0xe2b55a, 1.1) : null, cars = new Map();
    if (R.me) ctx.button("Whip", () => { if (R.whip()) sfx("hit"); });
    ctx.prompt(tx(R.me ? "Steer round the wheel to the openings. Follow Abhimanyu in before the gate closes." : "Turn your ring so its wall meets every chariot that comes at it."));
    const put = (m, r, a) => { m.position.set(Math.sin(a) * r * DS, 0, Math.cos(a) * r * DS); m.rotation.y = a + Math.PI; };
    ctx.loop((dt) => {
      const ev = R.step(dt, s.v);
      R.rings.forEach((g, i) => { rings[i].rotation.y = g.phi; });
      if (myRing) myRing.rotation.y = R.my.phi;
      if (me) { put(me, R.me.r, R.me.a); put(abhi, R.abhi.r, R.abhi.a); ctx.score(tx("Rings passed: {n} of {m} · Men lost: {h} of {l}", { n: R.me.passed, m: R.rings.length, h: R.me.hits, l: o.hull })); G.cam.rate = 3; ctx.cam([me.position.x * 0.5, 26, me.position.z * 0.5 + 15], [me.position.x * 0.5, 0, me.position.z * 0.5], 46); }
      else { for (const c of R.cars || []) { let m = cars.get(c); if (!m) { m = dot(0xa3302a, 1); cars.set(c, m); } put(m, c.r, c.a); } for (const [c, m] of cars) if (!R.cars.includes(c)) { m.visible = false; cars.delete(c); } ctx.score(tx("Held: {s} s · Broken through: {b} of {m}", { s: Math.round(R.held || R.t), b: R.breaches || 0, m: D.BREACHES })); }
      for (const e of ev || []) { if (e.type === "pass") { sfx("tap"); ctx.toast(tx("Through!"), "good"); } else if (e.type === "hit" || e.type === "breach") { ctx.cue("bad"); } else if (e.type === "held") sfx("clang"); else if (e.type === "end") return ctx.finish(e.outcome, null); }
      if (R.over) ctx.finish(R.outcome, null);
    });
  };
  SETUP.rings = { clear: 20, setup(ctx) { ctx.st = G.setStage(K.val(ctx.t.stage) || "stage_chakravyuha_top", { clear: 20 }); if (/night|cave/.test(G.skyName || "")) G.setSky(G.skyName, { amb: 0.8, hi: 1.25, si: 1.1, fd: 0.004 }); /* (a puzzle has to be seen) */ ctx.cam([0, 24, 13], [0, 0, 0], 46, true, 9.4); } };
  PLAY.rings = function (ctx) {
    const t = ctx.t, N = 4, STEP = Math.PI / 6, secs = clamp(34 + ctx.power * 1.2, 34, 46); ctx.tapActs = false;
    const ang = [], ms = []; let sel = 0, left = secs, shift = 6;
    for (let i = 0; i < N; i++) { ang.push(Math.floor(K.rng() * 12) * STEP); const m = ctx.add(ringMesh(8.4 - i * 1.9, 1, 0.9, 0.55, t.theme === "maze" ? 0x86b85e : 0xa3302a)); m.rotation.y = ang[i]; ms.push(m); }
    if (ang.every((a) => a === ang[0])) ang[1] += STEP * 3;
    const goalA = 0, mark = ctx.add(new T.Mesh(new T.PlaneGeometry(0.5, 9).rotateX(-Math.PI / 2), basic(0xffe2a0, 0.5)), G.fxRoot); mark.position.set(0, 0.05, 4.8);
    const aligned = () => ang.filter((a) => Math.abs(Math.atan2(Math.sin(a - goalA), Math.cos(a - goalA))) < 0.05).length;
    const draw = () => { ctx.score(tx("Rings open: {n} of {m}", { n: aligned(), m: N })); ms.forEach((m, i) => { m.position.y = i === sel ? 0.25 : 0; }); };
    ctx.prompt(tx(t.help || "Turn each ring until every opening stands on the bright line."));
    ctx.choice(tx(t.outVerb || "Outer ring"), () => { sel = Math.max(0, sel - 1); draw(); }); ctx.choice(tx(t.inVerb || "Inner ring"), () => { sel = Math.min(N - 1, sel + 1); draw(); });
    const turn = (d) => { ang[sel] += d * STEP; sfx("tap"); draw(); if (aligned() === N) ctx.after(350, () => ctx.finish("win", null)); };
    ctx.choice("⟲", () => turn(1)); ctx.choice("⟳", () => turn(-1));
    ctx.keys = (e, down) => { if (!down) return false; const k = e.key.toLowerCase(); if (k === "arrowleft" || k === "a") turn(1); else if (k === "arrowright" || k === "d") turn(-1); else if (k === "arrowup" || k === "w") { sel = Math.max(0, sel - 1); draw(); } else if (k === "arrowdown" || k === "s") { sel = Math.min(N - 1, sel + 1); draw(); } else return false; return true; };
    ctx.loop((dt) => {
      left -= dt; ctx.clock.set(left, secs); ms.forEach((m, i) => { let d = ang[i] - m.rotation.y; m.rotation.y += d * Math.min(1, dt * 10); });
      shift -= dt; if (shift <= 0 && t.mode !== "open") { shift = 7; const i = Math.floor(K.rng() * N); if (i !== sel) { ang[i] += STEP * (K.rng() < 0.5 ? 1 : -1); ctx.toast(tx(t.turns || "The wheel turns."), "bad"); draw(); } }
      if (left <= 0) ctx.finish(aligned() >= N - 1 ? "close" : "lose", null);
    });
    draw();
  };

  // =====================================================================================================
  // Herd, escape: you on open ground, steering toward where you point (or with the keys).
  // =====================================================================================================
  function walker(ctx, speed, bounds) {
    const w = { x: 0, z: 0, tx: null, tz: null, kx: 0, kz: 0 }, held = new Set();
    ctx.tapActs = false;
    ctx.keys = (e, down) => { const k = e.key.toLowerCase(), m = { arrowleft: "l", a: "l", arrowright: "r", d: "r", arrowup: "u", w: "u", arrowdown: "d", s: "d" }[k]; if (!m) return false; if (down) held.add(m); else held.delete(m); w.kx = (held.has("r") ? 1 : 0) - (held.has("l") ? 1 : 0); w.kz = (held.has("d") ? 1 : 0) - (held.has("u") ? 1 : 0); if (w.kx || w.kz) w.tx = null; return true; };
    ctx.pointer = (kind, e) => { if (kind === "up") return; if (kind === "move" && !(e.buttons & 1) && e.pointerType === "mouse") return; const p = G.pickGround(e.clientX, e.clientY, 0); if (p) { w.tx = p.x; w.tz = p.z; } };
    w.step = (dt, slow) => {
      let dx = w.kx, dz = w.kz;
      if (!dx && !dz && w.tx != null) { dx = w.tx - w.x; dz = w.tz - w.z; if (Math.hypot(dx, dz) < 0.25) { w.tx = null; dx = dz = 0; } }
      const l = Math.hypot(dx, dz);
      if (l > 0.01) { const v = speed * (slow || 1); w.x = clamp(w.x + (dx / l) * v * dt, -bounds[0], bounds[0]); w.z = clamp(w.z + (dz / l) * v * dt, -bounds[1], bounds[1]); ctx.me.turnTo(Math.atan2(dx, dz)); ctx.me.speed = v; } else ctx.me.speed = 0;
      ctx.me.root.position.set(w.x, 0, w.z);
    };
    return w;
  }
  SETUP.herd = { clear: 16, setup(ctx) { meAt(ctx, 0, 6, Math.PI, "stand", { item: "staff" }); ctx.cam([0, 17, 15], [0, 0, 0], 46, true); } };
  PLAY.herd = function (ctx) {
    const t = ctx.t, need = t.need || 6, lose = 3, secs = clamp(38 + ctx.power, 38, 50), fire = t.theme !== "river", w = walker(ctx, 4.6, [11, 8]); w.z = 6;
    const cows = [], haz = []; let got = 0, lost = 0, left = secs;
    for (let i = 0; i < need + 3; i++) { const h = G.cow(i % 2 ? 0xe4dac8 : 0x8a5a3a); h.traverse((m) => { if (m.isMesh) m.castShadow = true; }); h.position.set((K.rng() - 0.5) * 20, 0, (K.rng() - 0.5) * 12 - 2); h.rotation.y = K.rng() * 6; ctx.add(h); cows.push({ h, with: false, gone: false }); }
    const addHaz = (x, z, r) => { const m = ctx.add(new T.Mesh(new T.CircleGeometry(1, 20).rotateX(-Math.PI / 2), basic(fire ? 0xff6a20 : 0x2f6a8a, 0.55)), G.fxRoot); m.position.set(x, 0.05, z); haz.push({ m, x, z, r }); };
    for (let i = 0; i < 3; i++) addHaz((K.rng() - 0.5) * 16, (K.rng() - 0.5) * 10 - 1, fire ? 0.8 : 1.8);
    const draw = () => ctx.score(tx("Cattle with you: {f} of {n} · Lost: {d} of {l}", { f: got, n: need, d: lost, l: lose }));
    draw(); ctx.prompt(tx(K.val(t.help) || (fire ? "Go to each scattered cow and she falls in behind you. Keep clear of the fire." : "Go to each scattered cow and she falls in behind you. Keep clear of the deep water.")));
    ctx.loop((dt, tt) => {
      left -= dt; ctx.clock.set(left, secs); w.step(dt);
      for (const hz of haz) { if (fire) hz.r += dt * (t.spread ? 0.05 * t.spread : 0.14); hz.m.scale.set(hz.r, 1, hz.r); if (fire && K.rng() < dt * 4) G.fx.burst("ember", V(hz.x + (K.rng() - 0.5) * hz.r, 0.2, hz.z + (K.rng() - 0.5) * hz.r), { n: 2 }); }
      let k = 0;
      for (const c of cows) {
        if (c.gone) continue; const p = c.h.position;
        if (!c.with) G.gallop(c.h, p.x * 3.1 + p.z, 0); /* (those not yet gathered stand at grass) */
        if (c.with) { k++; const fx = w.x - Math.sin(ctx.me.root.rotation.y) * (0.9 + k * 0.9), fz = w.z - Math.cos(ctx.me.root.rotation.y) * (0.9 + k * 0.9); p.x += (fx - p.x) * Math.min(1, dt * 3); p.z += (fz - p.z) * Math.min(1, dt * 3); c.h.rotation.y = Math.atan2(w.x - p.x, w.z - p.z); G.gallop(c.h, tt * 9 + k, ctx.me.speed ? 0.5 : 0); } /* (cattle follow at a trot) */
        else if (Math.hypot(p.x - w.x, p.z - w.z) < 1.3) { c.with = true; got++; sfx("tap"); ctx.toast(tx(t.gather || "Another cow falls in behind you."), "good"); draw(); if (got >= need) return ctx.finish("win", null); }
        for (const hz of haz) if (Math.hypot(p.x - hz.x, p.z - hz.z) < hz.r) { c.gone = true; c.h.visible = false; if (c.with) got--; lost++; ctx.toast(tx(fire ? "The fire takes one." : t.water || "The water is too deep there."), "bad"); ctx.cue("bad"); draw(); if (lost >= lose) return ctx.finish(got >= need - 1 ? "close" : "lose", null); break; }
      }
      if (left <= 0) ctx.finish(got >= need - 1 ? "close" : "lose", null);
    });
  };
  SETUP.escape = { clear: 14, setup(ctx) {
    ctx.st = G.setStage("stage_lac_cellar", { clear: 14, open: true }); G.setSky("fire", { amb: 1.5, hi: 1.9, si: 1.6, sun: 0xffc890, fd: 0.003 }); // (roofless: the view is from above, and under the cellar's roof it saw nothing at all)
    const sx = { door: 4, hall: 0, deep: -4 }[ctx.t.start] != null ? { door: 4, hall: 0, deep: -4 }[ctx.t.start] : 0;
    meAt(ctx, sx, -4, 0, "stand", { item: null });
    const walls = [[-3, -2, 0.5, 5], [1, 1.5, 6, 0.5], [4.5, -2.5, 0.5, 4], [-5, 3, 5, 0.5]];
    for (const [x, z, wd, d] of walls) { const m = ctx.add(mesh((b) => b.box(wd, 2.2, d, 0, 0, 0, 0xb0603c))); m.position.set(x, 0, z); }
    const hole = ctx.add(new T.Mesh(new T.CircleGeometry(0.9, 20).rotateX(-Math.PI / 2), basic(0x7fe08a, 0.8)), G.fxRoot); hole.position.set(7, 0.06, 5.2);
    const sleepers = [[-1, 3.8], [3, -0.5]].map(([x, z]) => { const f = ctx.figure("soldier", { item: null }); f.place(x, z, 1); f.pose("sleep", true); f.root.position.y = 0.05; return { f, x, z, up: false }; });
    for (const s of sleepers) { const r = ctx.add(new T.Mesh(new T.RingGeometry(0.75, 0.9, 24).rotateX(-Math.PI / 2), basic(0xffe2a0, 0.8)), G.fxRoot); r.position.set(s.x, 0.07, s.z); s.ring = r; }
    const hr = ctx.add(new T.Mesh(new T.RingGeometry(1.0, 1.25, 28).rotateX(-Math.PI / 2), basic(0x7fe08a, 0.9)), G.fxRoot); hr.position.set(7, 0.07, 5.2);
    const arrow = ctx.add(new T.Mesh(new T.ConeGeometry(0.28, 0.8, 3).rotateX(Math.PI / 2), basic(0x7fe08a, 0.95)), G.fxRoot);
    ctx.x = { walls, sleepers, sx, arrow, hr }; ctx.cam([0, 16, 12], [0, 0, 0], 46, true);
  } };
  U.HOWTO3D = { escape: ["Tap or hold the floor where you want to run. The red tide is the fire: stay ahead of it.", "The green arrow at your feet points to the tunnel: the green ring. Walls must be gone round.", "Run through a gold ring to wake a sleeper. Each one you wake slows you a little."] };
  PLAY.escape = function (ctx) {
    const t = ctx.t, x = ctx.x, per = (clamp(1.4 + ctx.power * 0.04, 1.4, 1.75) + 0.3 * Math.min(3, K.S.fusesCut || 0)) * 1.5, w = walker(ctx, 3.6, [8, 6]); w.x = x.sx; w.z = -4;
    let fire = -9.5, burns = 0, carried = 0, safe = 0;
    const wall = ctx.add(new T.Mesh(new T.PlaneGeometry(1, 13).rotateX(-Math.PI / 2), basic(0xff5a18, 0.6)), G.fxRoot);
    ctx.prompt(tx("The fire comes room by room. Get to the tunnel's mouth; wake the sleepers if you dare."));
    const draw = () => ctx.score(tx("Woken: {n} of 2 · Burned: {b}", { n: carried, b: burns }));
    draw();
    ctx.loop((dt) => {
      fire += (3.2 / per) * dt; wall.position.set((fire - 9.5) / 2, 0.06, 0); wall.scale.x = Math.max(0.1, fire + 9.5);
      if (K.rng() < dt * 20) G.fx.burst("ember", V(fire - K.rng() * 2, 0.2, (K.rng() - 0.5) * 12), { n: 2 });
      const ox = w.x, oz = w.z; w.step(dt, 1 - carried * 0.15);
      { const a = Math.atan2(7 - w.x, 5.2 - w.z); x.arrow.position.set(w.x + Math.sin(a) * 1.1, 0.5, w.z + Math.cos(a) * 1.1); x.arrow.rotation.y = a; x.hr.scale.setScalar(1 + 0.12 * Math.sin(fire * 6)); for (const s of x.sleepers) if (s.ring) s.ring.visible = !s.up;
        if (G.W / G.H < 0.9) ctx.cam([w.x * 0.75, 15, w.z + 8.5], [w.x * 0.75, 0, w.z * 0.9], 62, false); } // (a narrow screen follows you; a wide one sees the whole house)
      for (const [wx, wz, wd, d] of x.walls) if (Math.abs(w.x - wx) < wd / 2 + 0.35 && Math.abs(w.z - wz) < d / 2 + 0.35) { w.x = ox; w.z = oz; w.tx = null; ctx.me.root.position.set(ox, 0, oz); }
      for (const s of x.sleepers) { if (!s.up && Math.hypot(w.x - s.x, w.z - s.z) < 1) { s.up = true; carried++; s.f.pose("stand"); s.f.root.position.y = 0; sfx("tap"); ctx.toast(tx("You shake one awake. He runs with you."), "good"); draw(); } if (s.up) { s.f.root.position.x += (w.x - 0.8 - s.f.root.position.x) * dt * 2.5; s.f.root.position.z += (w.z - 0.6 - s.f.root.position.z) * dt * 2.5; s.f.speed = ctx.me.speed; } }
      if (safe > 0) safe -= dt;
      if (w.x < fire && safe <= 0) { burns++; safe = 1.5; ctx.cue("bad"); G.fx.flash("rgba(255,120,40,.5)", 300); draw(); if (burns >= 2) return ctx.finish("lose", null); w.x = Math.min(8, fire + 2.5); }
      if (Math.hypot(w.x - 7, w.z - 5.2) < 1) ctx.finish(burns === 0 ? "win" : "close", null);
    });
  };

  // =====================================================================================================
  // The army's day: the array (place your companies), and the orders (hold the line).
  // =====================================================================================================
  const VYUHA = { crane: [[0, -4], [-3, -2], [3, -2], [-5, 1], [5, 1]], wheel: [[0, -4], [-4, -1], [4, -1], [-2.5, 3], [2.5, 3]], crocodile: [[0, -5], [-2, -2], [2, -2], [0, 1], [0, 4]], needle: [[0, -5], [0, -2.5], [0, 0], [0, 2.5], [0, 5]], crescent: [[-5, -3], [-2.5, -1], [0, 0], [2.5, -1], [5, -3]] };
  SETUP.formation = { clear: 14, setup(ctx) { ctx.cam([0, 15, 12], [0, 0, 0], 46, true); } };
  PLAY.formation = function (ctx) {
    const t = ctx.t, key = VYUHA[t.array] ? t.array : K.pick(Object.keys(VYUHA)), pts = VYUHA[key], L = labels(ctx); ctx.tapActs = false;
    const want = shuffle([0, 1, 2, 3, 4]).slice(0, 3), names = ["Spears", "Archers", "Chariots"], show = clamp(3 + ctx.power * 0.25, 3, 5.5);
    const marks = pts.map(([x, z]) => { const m = ctx.add(new T.Mesh(new T.CircleGeometry(0.9, 20).rotateX(-Math.PI / 2), basic(0xffe2a0, 0.35)), G.fxRoot); m.position.set(x, 0.05, z); return m; });
    const hint = want.map((i, k) => L.add(tx(names[k]), V(pts[i][0], 1.2, pts[i][1]), "good"));
    ctx.prompt(tx("The commander names the {v} array. Remember where each company stands.", { v: key })); let left = show, phase = "show", k = 0, right = 0;
    ctx.loop((dt) => { if (phase !== "show") return; left -= dt; ctx.clock.set(left, show); if (left <= 0) { phase = "place"; ctx.clock.hide(); hint.forEach((h) => h.el.remove()); ask(); } });
    const ask = () => {
      if (k >= 3) return ctx.finish(right === 3 ? "win" : right === 2 ? "close" : "lose", null);
      ctx.prompt(tx("Where do the {who} stand?", { who: K.tr(names[k]) })); ctx.score(pips(3, right, k - right)); L.clear();
      pts.forEach(([x, z], i) => L.add(String(i + 1), V(x, 0.6, z), "", () => { const ok = i === want[k]; if (ok) { right++; const h = ctx.add(G.host({ x, z, ry: 0, cols: 4, rows: 2, col: [0x2d5aa0, 0x3b6fb0] }, K.rng)); void h; } marks[want[k]].material.color.setHex(ok ? 0x7fe08a : 0xff6a4a); ctx.toast(tx(ok ? "In their place." : "Not there."), ok ? "good" : "bad"); sfx(ok ? "drumCall" : "hit"); k++; ask(); }));
    };
  };
  SETUP.array = { clear: 14, setup(ctx) {
    const mk = (x, z, ry, col) => ctx.add(G.host({ x, z, ry, cols: 7, rows: 3, col, banners: 1, flag: col[0] === 0x2d5aa0 ? ["#2d5aa0", "#f2ead2", "moon"] : ["#a3302a", "#e2b55a", "sun"] }, K.rng));
    ctx.x = { mine: [-6, 0, 6].map((x) => mk(x, 3, Math.PI, [0x2d5aa0, 0x3b6fb0])), foe: [-6, 0, 6].map((x) => mk(x, -4, 0, [0xa3302a, 0x8a2a24])) };
    ctx.cam([0, 13, 14], [0, 0, 0], 46, true);
  } };
  PLAY.array = function (ctx) {
    const t = ctx.t, rounds = t.rounds || 5, edge = clamp(0.6 + ctx.power * 0.08, 0.6, 1.6), L = labels(ctx), SEC = ["Left", "Centre", "Right"]; ctx.tapActs = false;
    let line = 100, r = 0, push = [];
    const draw = () => { ctx.score(tx("The line: {n}% · Round {r} of {m}", { n: Math.max(0, Math.round(line)), r: Math.min(r + 1, rounds), m: rounds })); };
    const next = () => {
      if (line <= 0 || r >= rounds) return ctx.finish(line > 55 ? "win" : line > 25 ? "close" : "lose", null);
      push = shuffle([0, 1, 2]).slice(0, K.rng() < 0.45 ? 2 : 1); L.clear(); ctx.clearButtons(); draw();
      push.forEach((i) => L.add("▼ " + tx(SEC[i]), V([-6, 0, 6][i], 2.6, -1), "bad"));
      ctx.x.foe.forEach((h, i) => { h.position.z = push.includes(i) ? 1.6 : 0; });
      ctx.prompt(tx("The enemy pushes: {where}. Your order?", { where: push.map((i) => K.tr(SEC[i])).join(", ") }));
      const act = (id, help) => { let loss; if (id === "hold") loss = 10 * push.length; else if (id === "flank") loss = push.length === 1 ? 3 : 22; else if (id === "back") loss = 7; else loss = (push.includes(help) ? 2 : 10) + (push.length - (push.includes(help) ? 1 : 0)) * 13;
        line -= loss / edge + K.rng() * 3; r++; sfx(loss < 9 ? "drumCall" : "hit"); ctx.toast(tx(loss < 9 ? "The line holds." : "The line bends."), loss < 9 ? "good" : "bad"); ctx.x.mine.forEach((h, i) => { h.position.z = push.includes(i) && loss >= 9 ? 1.2 : 0; }); ctx.after(900, next); ctx.clearButtons(); };
      ctx.choice(tx("Hold"), () => act("hold")); ctx.choice(tx("Flank"), () => act("flank")); ctx.choice(tx("Fall back"), () => act("back"));
      push.forEach((i) => ctx.choice(tx("Send help: {where}", { where: K.tr(SEC[i]) }), () => act("help", i)));
    };
    next();
  };

  // =====================================================================================================
  // Board games, on the low table: moksha patam, chaupar, and tigers and goats.
  // =====================================================================================================
  function boardSetup(ctx) {
    ctx.st = G.setStage("stage_board_table", { clear: 8 }); meAt(ctx, -1.5, 0.3, Math.PI / 2, "sitThink", { item: null });
    const who = U.personByName(ctx.t.opponent) || "vikarna", f = ctx.figure(who, { item: null }); f.place(1.5, 0.3, -Math.PI / 2); f.pose("sitThink", true); ctx.x = { foe: f, who: K.tr(ctx.t.opponent || "Your opponent") };
    ctx.cam([0, 2.5, 5.6], [0, 0.9, 0.3], 40, true, 2.5); ctx.tapActs = false;
  }
  for (const k of ["moksha", "chaupar", "baghchal"]) SETUP[k] = { clear: 8, setup: boardSetup };
  const boardBox = (ctx) => { const b = U.el('<div class="t-board"></div>'); ctx.mid.appendChild(b); return b; };
  const track = (n, a, b, marks) => { let s = '<div class="track">'; for (let i = 1; i <= n; i++) s += '<i class="' + (marks && marks[i] ? marks[i] : "") + (i === a ? " me" : "") + (i === b ? " them" : "") + '">' + (i === a && i === b ? "◐" : i === a ? "●" : i === b ? "○" : "") + "</i>"; return s + "</div>"; };
  const LADDER = { 3: 14, 8: 19, 17: 27, 22: 31 }, SNAKE = { 16: 6, 24: 11, 29: 13, 34: 20 }, KARMA = [10, 26];
  AUTO.moksha = (t, power) => [K.rng() < clamp(0.42 + power * 0.03, 0.4, 0.75) ? "win" : "lose", null];
  AUTO.chaupar = AUTO.moksha; AUTO.baghchal = (t, power) => [K.rng() < clamp(0.35 + power * 0.035, 0.35, 0.72) ? "win" : "lose", null];
  PLAY.moksha = function (ctx) {
    const box = boardBox(ctx), who = ctx.x.who, marks = {}; for (const k in LADDER) marks[k] = "up"; for (const k in SNAKE) marks[k] = "down"; for (const k of KARMA) marks[k] = "karma";
    let me = 0, them = 0, shield = false, tshield = false, turn = 0;
    ctx.prompt(tx("First to the last square. Throw two dice and move by either one. A ladder's virtue stops one snake; a karma square swaps you with your opponent."));
    const land = (p, mine) => { let note = "";
      if (LADDER[p]) { p = LADDER[p]; if (mine) shield = true; else tshield = true; note = "A ladder: up, and its virtue guards you once."; sfx("heal"); }
      else if (SNAKE[p]) { if (mine ? shield : tshield) { if (mine) shield = false; else tshield = false; note = "A snake, but virtue holds."; } else { p = SNAKE[p]; note = "A snake: down."; sfx("hit"); } }
      else if (KARMA.includes(p)) { const o = mine ? them : me; if (mine) them = p; else me = p; p = o; note = "Karma: your places are exchanged."; sfx("gong"); }
      return [p, note]; };
    const draw = (note) => { ctx.score(tx("You: {a} · {who}: {b}", { a: me, b: them, who })); box.innerHTML = track(36, me, them, marks) + (note ? "<p>" + tx(note) + "</p>" : ""); };
    const theirs = () => { const d = [1 + Math.floor(K.rng() * 6), 1 + Math.floor(K.rng() * 6)], slip = K.rng() < clamp(0.1 + ctx.power * 0.03, 0.1, 0.4);
      const val = (x) => { const p = Math.min(36, them + x); return LADDER[p] ? LADDER[p] + 5 : SNAKE[p] && !tshield ? SNAKE[p] - 5 : p; };
      const x = slip ? d[0] : val(d[0]) >= val(d[1]) ? d[0] : d[1]; let p = Math.min(36, them + x), n; [p, n] = land(p, false); them = p; ctx.x.foe.act("throw", 0.5); sfx("dice"); draw(n);
      if (them >= 36) return ctx.after(800, () => ctx.finish("lose", null)); ctx.after(700, mine); };
    const mine = () => { ctx.clearButtons(); ctx.choice(tx("Throw"), () => { const d = [1 + Math.floor(K.rng() * 6), 1 + Math.floor(K.rng() * 6)]; sfx("dice"); ctx.me.act("throw", 0.5); ctx.clearButtons();
      d.forEach((x) => ctx.choice(tx("Move {n}", { n: x }), () => { let p = Math.min(36, me + x), n; [p, n] = land(p, true); me = p; draw(n); ctx.clearButtons(); if (me >= 36) return ctx.after(700, () => ctx.finish("win", null)); ctx.after(800, theirs); })); }); };
    draw(); mine(); void turn;
  };
  PLAY.chaupar = function (ctx) {
    const box = boardBox(ctx), who = ctx.x.who, SAFE = { 1: "safe", 7: "safe", 13: "safe", 19: "safe" }, N = 24; // (a shorter track: a game of two minutes, not five)
    const me = [0, 0], them = [0, 0];
    ctx.prompt(tx("Throw the cowries and move one of your two pieces. Land on his piece and it goes back to the start, unless it stands on a safe square. Bring both home first."));
    const cow = () => { let n = 0; for (let i = 0; i < 6; i++) if (K.rng() < 0.5) n++; return n === 0 ? 6 : n; };
    const draw = (note) => { ctx.score(tx("You: {a} home · {who}: {b} home", { a: me.filter((p) => p >= N).length, b: them.filter((p) => p >= N).length, who }));
      let s = '<div class="track">'; for (let i = 1; i < N; i++) { const a = me.filter((p) => p === i).length, b = them.filter((p) => p === i).length; s += '<i class="' + (SAFE[i] || "") + (a ? " me" : "") + (b ? " them" : "") + '">' + (a ? "●".repeat(a) : "") + (b ? "○".repeat(b) : "") + "</i>"; } box.innerHTML = s + "</div>" + (note ? "<p>" + tx(note) + "</p>" : ""); };
    const move = (mine, i, n) => { const a = mine ? me : them, o = mine ? them : me; a[i] = Math.min(N, a[i] + n); let note = ""; if (a[i] < N && !SAFE[a[i]]) o.forEach((p, k) => { if (p === a[i]) { o[k] = 0; note = mine ? "You take his piece." : "He takes your piece."; sfx("hit"); } }); return note; };
    const over = () => (me.every((p) => p >= N) ? "win" : them.every((p) => p >= N) ? "lose" : null);
    const theirs = () => { const n = cow(), slip = K.rng() < clamp(0.1 + ctx.power * 0.03, 0.1, 0.4); const opts = [0, 1].filter((i) => them[i] < N);
      let i = opts[0]; if (!slip) { const cap = opts.find((k) => me.some((p) => p > 0 && p === them[k] + n && !SAFE[p])); i = cap != null ? cap : opts.sort((x, y) => them[y] - them[x])[0]; }
      const note = move(false, i, n); sfx("dice"); ctx.x.foe.act("throw", 0.5); draw(note || ["{who} throws {n}.", { who, n }]); const o = over(); if (o) return ctx.after(800, () => ctx.finish(o, null)); ctx.after(380, mine); };
    const mine = () => { ctx.clearButtons(); ctx.choice(tx("Throw"), () => { const n = cow(); sfx("dice"); ctx.me.act("throw", 0.5); ctx.clearButtons(); draw(["You throw {n}.", { n }]);
      [0, 1].filter((i) => me[i] < N).forEach((i) => ctx.choice(tx("Piece {k}: {a} → {b}", { k: i + 1, a: me[i], b: Math.min(N, me[i] + n) }), () => { const note = move(true, i, n); draw(note); ctx.clearButtons(); const o = over(); if (o) return ctx.after(700, () => ctx.finish(o, null)); ctx.after(420, theirs); })); }); };
    draw(); mine();
  };
  // Tigers and goats on a five-by-five board: you are the two tigers. Jump a goat to take it; hemmed in, you lose.
  PLAY.baghchal = function (ctx) {
    const box = boardBox(ctx), need = ctx.t.need || 3, S = 5, at = (x, y) => y * S + x, cell = new Array(25).fill(0); // 1 tiger, 2 goat
    cell[at(0, 0)] = 1; cell[at(4, 4)] = 1; let toPlace = 12, taken = 0, sel = -1;
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const moves = (i) => { const x = i % S, y = Math.floor(i / S), out = []; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue; const j = at(nx, ny); if (!cell[j]) out.push({ to: j }); else if (cell[j] === 2) { const jx = nx + dx, jy = ny + dy; if (jx >= 0 && jy >= 0 && jx < S && jy < S && !cell[at(jx, jy)]) out.push({ to: at(jx, jy), take: j }); } } return out; };
    const tigers = () => cell.map((c, i) => (c === 1 ? i : -1)).filter((i) => i >= 0);
    ctx.prompt(tx("You are the tigers. Tap a tiger, then where it goes. Jump a goat to take it: take {n} before they hem you in.", { n: need }));
    const draw = () => { ctx.score(tx("Goats taken: {n} of {m}", { n: taken, m: need }));
      const can = sel >= 0 ? moves(sel).map((m) => m.to) : [];
      box.innerHTML = '<div class="grid5">' + cell.map((c, i) => '<button type="button" data-i="' + i + '" class="' + (i === sel ? "sel" : "") + (can.includes(i) ? " can" : "") + '">' + (c === 1 ? "🐅" : c === 2 ? "🐐" : "") + "</button>").join("") + "</div>";
      box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => tap(+b.dataset.i))); };
    const goats = () => {
      const danger = (j) => { cell[j] = 2; const d = tigers().some((t) => moves(t).some((m) => m.take === j)); cell[j] = 0; return d; };
      const slip = K.rng() < clamp(0.12 + ctx.power * 0.03, 0.12, 0.42);
      if (toPlace > 0) { const empty = cell.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0); const safe = empty.filter((j) => !danger(j)); const pool = slip || !safe.length ? empty : safe; const near = pool.slice().sort((a, b) => Math.min(...tigers().map((t) => Math.abs(t % S - a % S) + Math.abs(Math.floor(t / S) - Math.floor(a / S)))) - Math.min(...tigers().map((t) => Math.abs(t % S - b % S) + Math.abs(Math.floor(t / S) - Math.floor(b / S))))); cell[slip ? K.pick(pool) : near[Math.min(near.length - 1, Math.floor(K.rng() * 3))]] = 2; toPlace--; }
      else { const gs = cell.map((c, i) => (c === 2 ? i : -1)).filter((i) => i >= 0), opts = []; for (const g of gs) { const x = g % S, y = Math.floor(g / S); for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < S && ny < S && !cell[at(nx, ny)]) opts.push([g, at(nx, ny)]); } } if (opts.length) { const [g, to] = K.pick(opts); cell[g] = 0; cell[to] = 2; } }
      ctx.x.foe.act("nod", 0.4); sfx("tap"); draw();
      if (!tigers().some((t) => moves(t).length)) ctx.after(600, () => ctx.finish(taken === need - 1 ? "close" : "lose", null));
    };
    const tap = (i) => {
      if (cell[i] === 1) { sel = i; return draw(); }
      if (sel < 0) return; const m = moves(sel).find((x) => x.to === i); if (!m) return;
      cell[sel] = 0; cell[i] = 1; sel = -1; if (m.take != null) { cell[m.take] = 0; taken++; sfx("hit"); ctx.toast(tx("A goat taken."), "good"); } else sfx("tap");
      draw(); if (taken >= need) return ctx.after(600, () => ctx.finish("win", null)); ctx.after(600, goats);
    };
    goats(); goats();
  };
})(window.K = window.K || {});
