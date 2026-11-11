/* Fights in 3D: what you see and what your hands do (the rules are battle/sim.js, K.RT3).
   The fight's own ground is built around a round field; every unit of the fight is a figure on it (a company is three
   bodies, an elephant an elephant, the healers' cart a cart); each blow coming is painted on the ground before it lands;
   arrows are arrows in the air. You run with the stick or the keys and answer with Strike, Roll, Guard, your path's
   skill, herbs, a call for help, a divine weapon; a beaten foe who kneels can be spared.

   The camera stands behind your side of the field and follows you, pulling back when the fight spreads. On an upright
   phone it climbs higher and looks down more steeply, so the whole ring of foes fits the narrow screen.
   Keys: WASD / arrows move · J or click strike · Space roll · K or Shift guard · L skill · Q next foe · H herbs · C help
   · 1-3 divine weapon · F spare · O orders · X withdraw · Esc pause. Touch: left thumb moves, right thumb acts. */
(function (K) {
  "use strict";
  const U = K.UI, G = K.G3, C = K.Combat, R3 = K.RT3, RT = K.RT, T = window.THREE;
  const FIGHT_BG = Object.assign({}, { e_ugra: "fight_fair_ring", e_spar: "stage_training_ground", e_panchala: "fight_drupada_yard", e_border: "fight_border_road", e_kings: "fight_swayamvara", e_jayadratha: "fight_forest_road", e_bandits: "fight_forest_road", e_gandharva: "fight_royal_camp",
    e_sudatta: "fight_grazing", e_cattle: "fight_grazing", e_cattle_k: "fight_grazing", e_dream: "fight_war_field", e_day1: "fight_war_field", e_wheel: "fight_war_field", e_day16: "fight_war_field", e_day18: "fight_war_field",
    e_guard: "fight_war_chariot", e_hunt: "fight_war_chariot", e_road: "fight_war_sunset", e_jaya: "fight_war_sunset", e_gate: "fight_war_sunset", e_night: "stage_battlefield_night", e_last_stand: "fight_chakravyuha_inner", e_ring: "fight_chakravyuha_inner",
    e_dushasana: "fight_war_camp", e_ep_carts: "fight_supply_carts", e_raid: "fight_camp_gate_night", e_ash: "fight_camp_gate_night" });
  Object.assign(FIGHT_BG, K.COMMAND_FIGHT_BG || {});
  U.FIGHT_BG = FIGHT_BG;
  const headless = () => U.headless();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (n) => { if (K.Sound) K.Sound.play(n); };
  const RED = "#a3302a", BLUE = "#2d5aa0";

  // ---------- Who each fighter is drawn as ----------
  const NAMED = [[/^Ugra(?!'s)/, "ugra"], [/Dushasana's/, "guard"], [/Dushasana(?!'s)/, "dushasana"], [/Karna(?!'s)/, "karna"], [/Bhima(?!'s)/, "bhima"], [/Brihannala(?!'s)/, "arjuna"], [/Ketan|boy/i, "boy"], [/Drona(?!'s)/, "drona"], [/^Satyaki$/, "satyaki"],
    [/^Ghatotkacha$/, "ghatotkacha"], [/^Jayadratha$/, "jayadratha"], [/^Shalya$/, "shalya"], [/^Kripa$/, "kripa"], [/^Abhimanyu$/, "abhimanyu"], [/Ashwatthama/, "ashwatthama"]];
  function lookFor(u, B) {
    const S = K.S, D = { lookOf: U.lookOf3d };
    if (u.side === "player") { const s = Object.assign({}, K.puppetSpec(S)); if (B.enc.dream) s.stage = "adult"; return s; }
    if (u.person && (K.PUPPETS[u.person] || G.EXTRAS[u.person])) return D.lookOf(u.person);
    const n = String(u.src || u.name);
    let look = null, plain = false;
    if (/charioteer/i.test(n)) look = G.EXTRAS.rider;
    if (!look) for (const [re, id] of NAMED) if (re.test(n)) { look = D.lookOf(id); break; }
    if (!look && /Gandharva/.test(n)) look = G.EXTRAS.gandharva;
    if (!look && /champion|dented helmet/i.test(n)) look = G.EXTRAS.champion;
    if (!look && /archer|chariot/i.test(n)) { look = G.EXTRAS.archer; plain = true; }
    if (!look && /horseman|rider|veteran/i.test(n)) { look = G.EXTRAS.rider; plain = true; }
    if (!look && /club|raider|bandit/i.test(n)) look = G.EXTRAS.bandit;
    if (!look && /cowherd|villager/i.test(n)) look = G.EXTRAS.common;
    if (!look && /guard|bodyguard|captain|sentry/i.test(n)) { look = D.lookOf("guard"); plain = true; }
    if (!look) { look = D.lookOf("soldier"); plain = true; }
    look = Object.assign({}, look);
    // In the war the two hosts wear their colours, so friend and foe are told apart at a glance.
    if (plain || u.side === "ally") {
      const mine = S.side === "kaurava" ? RED : S.side === "pandava" ? BLUE : "#3f6b5a";
      const theirs = /Kaurava/.test(n) ? RED : /Pandava|Panchala|Matsya/.test(n) ? BLUE : S.side === "kaurava" ? BLUE : S.side === "pandava" ? RED : null;
      const col = u.side === "ally" ? mine : theirs;
      if (col) look.palette = [look.palette[0], col, look.palette[2]];
    }
    return look;
  }
  const D3 = (id) => U.lookOf3d(id);
  // Each hero's own standard, as the epic names them.
  const STANDARD = { arjuna: ["#2d5aa0", "#f2d27a", "ape"], bhishma: ["#efe6cf", "#c9a24e", "palm"], karna: ["#a3302a", "#f2d27a", "girth"], drona: ["#d98a3a", "#f2ead2", "pot"], abhimanyu: ["#2d5aa0", "#f2d27a", "tree"], duryodhana: ["#7a1f2a", "#e2b55a", "serpent"],
    bhima: ["#2d5aa0", "#f2d27a", "lion"], jayadratha: ["#5a4a6a", "#e8e8e8", "boar"], yudhishthira: ["#2d5aa0", "#f2ead2", "moon"], ashwatthama: ["#3a2a3a", "#c9a24e", "lion"], kripa: ["#8a5a2a", "#f2ead2", "wheel"] };
  const itemOf = (w) => (w === "fist" || w === "tusk" || w === "fire" ? null : w);
  const READY = { bow: "readyBow", spear: "readySpear", staff: "readySpear", fist: "readyFist", mace: "readyMace" };
  const SQUAD = [[0, 0.3], [-0.66, -0.34], [0.66, -0.34]];

  U.startBattle = function (encId, onEnd) {
    // The 2D game's own screens where there is no 3D (its tests, a browser without WebGL).
    if (!K.ENCOUNTERS[encId] || !U.b3d.on()) return U.startBattle2D(encId, onEnd);
    open(encId, onEnd);
  };

  function open(encId, onEnd) {
    const enc = K.ENCOUNTERS[encId];
    let B = C.start(encId, null), R = R3.begin(B, { assist: U.assist() });
    const views = new Map(), offs = [], shots = new Map(), grounds = new Map();
    let st = null, acc = 0, started = false, closed = false, hitStop = 0, lockRing = null, goalMark = null, paused = false, lastLog = 0, zoom = 1, camLook = new T.Vector3(), tipT = 0;
    const input = { up: 0, right: 0, block: false, taps: {}, keys: new Set(), stick: null, mouseBlock: false, padBlock: false };
    const touch = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
    const hud = U.el('<div class="bhud' + (touch ? " touch" : "") + '"></div>');
    const tmp = new T.Vector3(), scr = {};
    if (K.Sound) K.Sound.mood("battle");
    U.keys([]);
    U.curtain(() => {
      build();
      U.$("stagehud").appendChild(hud);
      buildHud();
      brief();
      offs.push(G.onFrame(frame));
    });

    // ---------- The ground and the figures ----------
    function build() {
      const key = FIGHT_BG[enc.id] || K.val(enc.art) || "fight_war_field";
      st = G.setStage(key, { clear: 15 });
      // The edge of the field: a ring worn into the ground, and spears with pennants round it.
      const b = new G.Builder(), rad = R.rad;
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, x = Math.sin(a) * (rad + 0.35), z = Math.cos(a) * (rad + 0.35); b.box(1.5, 0.05, 0.22, x, 0.0, z, 0x5a4630, a + Math.PI / 2); }
      if (!st.indoor) for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.26, x = Math.sin(a) * (rad + 0.9), z = Math.cos(a) * (rad + 0.9); if (z > rad * 0.55) continue; b.rod(x, 0, z, x, 2.3, z, 0.03, 0x3a2414, 5); b.box(0.5, 0.26, 0.02, x + 0.27, 1.95, z, i % 2 ? 0xa3302a : 0xe2b55a); }
      const m = b.mesh(); m.receiveShadow = true; st.group.add(m);
      lockRing = new T.Mesh(new T.RingGeometry(0.62, 0.74, 30).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
      lockRing.position.y = 0.06; lockRing.visible = false; lockRing.renderOrder = 3; G.fxRoot.add(lockRing);
      if (R.goal) { goalMark = G.fx.mark("ring", { r: R.goal.r, col: 0x7fe08a }); goalMark.position.set(R.goal.x, 0.05, R.goal.z); goalMark.userData.set(1, false, false); st.flame(R.goal.x, 0, R.goal.z, 0.9, true); }
      if (/night|cave|fire/.test(st.sky)) st.amb("embers", { r: rad, rate: 3 }); else st.amb("dust", { r: rad + 4, rate: 2 });
      sync();
      camera(0, true);
    }
    function makeView(u) {
      const g = u.g, v = { u, kind: g.kind, figs: [], obj: null, bar: null, mark: null, atkRef: null, dead: false, bodies: g.kind === "squad" ? 3 : 1, hp: u.hp, shown: 0 };
      if (g.kind === "elephant") { v.obj = G.elephant(/Kaurava/.test(u.name) ? 0xa3302a : 0x2d5aa0); v.obj.traverse((m) => { if (m.isMesh) m.castShadow = true; }); G.actors.add(v.obj); }
      else if (g.kind === "cart") { const b = new G.Builder(); G.cartStatic(b, 0, 0, 0, true); v.obj = b.mesh(); v.obj.castShadow = true; G.actors.add(v.obj); }
      else if (g.kind === "light") { v.obj = new T.Sprite(new T.SpriteMaterial({ map: G.tex("glow"), color: 0xfff0c0, blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); v.obj.scale.set(7, 7, 1); G.fxRoot.add(v.obj); }
      else {
        const look = lookFor(u, B), n = v.bodies;
        if (g.car) { // a chariot: the archer on its deck, a driver at the rail, the hero's own standard behind
          const theirs = u.side === "enemy" ? (K.S.side === "kaurava" ? BLUE : RED) : K.S.side === "kaurava" ? RED : BLUE, flag = STANDARD[u.person] || [theirs, "#f2ead2", theirs === RED ? "sun" : "moon"];
          v.car = G.chariot({ col: u.hero || u.person ? 0x6e3a1e : 0x5a4026, trim: u.hero || u.person ? 0xe2b55a : 0xb8873a, flag, canopy: u.hero || u.person ? new T.Color(flag[0]).getHex() : null, horseCol: u.person === "arjuna" || u.person === "bhishma" ? 0xf2efe6 : undefined });
          v.car.traverse((m) => { if (m.isMesh) m.castShadow = true; }); G.actors.add(v.car);
          v.driver = G.figure(u.person === "arjuna" ? D3("krishna") : Object.assign({}, G.EXTRAS.rider, { item: "whip" }), { item: u.person === "arjuna" ? null : "whip" }); v.driver.pose("drive", true); v.car.add(v.driver.root); v.driver.root.position.set(0.25, 0.86, 0.55);
        }
        for (let i = 0; i < n; i++) {
          const f = G.figure(i ? Object.assign({}, look, { size: (look.size || 1) * (0.94 + i * 0.04) }) : look, { item: itemOf(g.weapon) });
          if (u.side === "player" ? R.shield && !R.broken : u.side === "enemy" ? !!(u.shield || u.shieldDrawn) && g.weapon !== "bow" : false) f.setShield(true, u.side === "enemy" ? 0x6e3026 : undefined);
          f.pose(READY[g.weapon] || "ready", true); f.turnRate = 16;
          if (v.car) { v.car.add(f.root); f.root.position.set(-0.2, 0.86, -0.3); } else G.actors.add(f.root);
          v.figs.push(f);
        }
      }
      if (u.side !== "player") {
        v.bar = U.el('<div class="ubar ' + (u.side === "enemy" ? "foe" : "ally") + (u.hero || u.person ? " hero" : "") + '"><span></span><i></i></div>');
        v.bar.querySelector("span").textContent = K.text(u.name);
        hud.appendChild(v.bar);
      }
      views.set(u.uid, v);
      place(v, 0, 0, true);
      return v;
    }
    function dropView(v, how) {
      if (v.mark) { v.mark.userData.free(); v.mark = null; }
      if (v.bar) v.bar.remove();
      const gone = () => { for (const f of v.figs) f.dispose(); if (v.driver) v.driver.dispose(); if (v.car) { if (v.car.parent) v.car.parent.remove(v.car); G.dispose(v.car); } if (v.obj) { if (v.obj.parent) v.obj.parent.remove(v.obj); G.dispose(v.obj); } };
      if (how === "now") gone(); else setTimeout(gone, 1400);
      views.delete(v.u.uid);
    }
    function sync() {
      for (const u of B.units) if (u.g && !views.has(u.uid)) makeView(u);
    }
    function place(v, dt, t, snap) {
      const u = v.u, g = u.g;
      if (v.obj) {
        if (v.kind === "light") { v.obj.position.set(g.x * 0.5, 15, g.z * 0.5 - 6); v.obj.material.opacity = 0.75 + Math.sin(t * 3) * 0.2; return; }
        v.obj.position.set(g.x, 0, g.z); v.obj.rotation.y = g.a;
        if (v.kind === "elephant") G.stomp(v.obj, t * 7, u.hp > 0 ? g.moving * 1.2 : 0);
        if (u.hp <= 0 && v.kind === "elephant") v.obj.rotation.z = Math.min(Math.PI / 2, v.obj.rotation.z + dt * 2);
        return;
      }
      if (v.car) { // the car runs under its archer; fallen, it stands where it stopped
        const c = v.car; if (snap) { c.position.set(g.x, 0, g.z); c.rotation.y = g.a; }
        const mx = g.x - c.position.x, mz = g.z - c.position.z, mv = Math.hypot(mx, mz); c.position.x += mx * Math.min(1, dt * 20); c.position.z += mz * Math.min(1, dt * 20);
        let da = g.a - c.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); c.rotation.y += da * Math.min(1, dt * (u.hp > 0 ? 5 : 0));
        v.rolled = (v.rolled || 0) + mv; G.roll(c, v.rolled, t, u.hp > 0 ? Math.min(1, g.moving * 1.4) : 0); if (v.driver) v.driver.update(dt, t);
      }
      const alive = u.plural ? Math.max(u.hp > 0 ? 1 : 0, Math.ceil(v.bodies * u.hp / u.maxHp)) : u.hp > 0 ? 1 : 0;
      v.figs.forEach((f, i) => {
        const o = v.bodies > 1 ? SQUAD[i] : [0, 0], s = Math.sin(g.a), c = Math.cos(g.a);
        const x = g.x + o[0] * c + o[1] * s, z = g.z - o[0] * s + o[1] * c;
        const down = i >= alive;
        if (v.car) { f.root.rotation.y = 0; f.face = 0; }
        else if (!f.fellAt) {
          if (snap) f.place(x, z, g.a); else { f.root.position.x += (x - f.root.position.x) * Math.min(1, dt * 22); f.root.position.z += (z - f.root.position.z) * Math.min(1, dt * 22); }
          f.face = g.a;
        }
        if (down && !f.fellAt) { f.fellAt = t || 0.001; f.drop(true, g.lastFrom && ((g.lastFrom.x - g.x) * s + (g.lastFrom.z - g.z) * c) > 0 ? 1 : -1); f.speed = 0; if (f.shield && u.side === "enemy") f.setShield(false); G.fx.burst("dust", f.root.position, { n: 6 }); }
        if (f.fellAt) { f.update(dt, t); return; }
        f.speed = v.car ? 0 : g.moving * g.speed * (u.side === "player" && R.block ? 0.5 : 1);
        // How it holds itself now.
        let pose = READY[g.weapon] || "ready";
        if (u.side === "player") {
          f.spin = R.roll > 0 && !R.dash ? Math.PI * 2 * (1 - R.roll / R3.P.roll) : 0;
          if (R.roll > 0) { f.face = Math.atan2(R.rdx, R.rdz); f.root.rotation.y = f.face; } // the tumble goes the way you roll
          if (R.roll > 0 && !R.dash) pose = "roll"; else if (R.block) pose = "block"; else if (R.kneel > 0) pose = "herbs"; else if (R.kneelPose > 0) pose = "kneel"; else if (R.frozen > 0) pose = "cast";
          f.root.visible = !(R.unseen > 0 && Math.floor(t * 14) % 2 === 0);
        } else {
          if (g.beaten) pose = "plead"; else if (g.stag > 0) pose = "stagger"; else if (u.status.stun || u.status.asleep || u.status.bound) pose = u.status.asleep ? "slump" : "freeze";
          f.drop(g.down > 0);
        }
        if (f.base !== pose) f.pose(pose);
        f.update(dt, t);
      });
    }
    // The blow a foe is winding up, shown by its body: the act is timed so the weapon comes down when the blow lands.
    // (A shot is the whole cycle: quiver, nock, draw to the ear, loose; a hurried one starts with the arrow on the string.)
    function actFor(u, a) { const w = u.g.weapon; return a.ranged ? (w === "bow" || u.g.archer ? (a.land - a.t0 < 0.75 ? "loose" : "shoot") : "throw") : a.arc === "smash" ? "smash" : a.arc === "sweep" ? "sweep" : a.area ? "smash" : w === "spear" || w === "staff" ? "thrust" : w === "fist" ? "punch" : w === "dagger" ? "stab" : a.heavy ? "heavy" : "slash"; }
    function windups(t) {
      for (const v of views.values()) {
        const u = v.u, a = u.hp > 0 ? u.g.atk : null;
        if (u.side === "enemy") {
          // the mark on the ground
          const m = a ? R3.markOf(R, u) : null;
          if (m && !v.mark) v.mark = G.fx.mark(m.kind, { r: m.kind === "lane" ? Math.min(m.r, 26) : m.r, arc: (m.half || 1) * 2, w: m.w });
          if (!m && v.mark) { v.mark.userData.free(); v.mark = null; }
          if (m && v.mark) { v.mark.position.set(m.x, 0.05, m.z); v.mark.rotation.y = m.a || 0; v.mark.userData.set(m.fill, m.locked, m.heavy); v.mark.visible = !(m.feint && Math.floor(t * 20) % 2 === 0 && m.fill > 0.75); }
        }
        if (!a) { v.atkRef = null; continue; }
        const name = actFor(u, a);
        if (!name) continue;
        const A = G.ACTS[name], left = a.land - R.t;
        if (v.atkRef !== a) { v.atkRef = a; v.actDur = Math.max(0.2, left / A.land); for (const f of v.figs) if (!f.fellAt) f.act(name, v.actDur, 0); }
        else for (const f of v.figs) if (f.action && f.action.name === name) { const want = A.land * v.actDur - left; if (Math.abs(f.action.t - want) > 0.08) f.action.t = Math.max(0, want); }
      }
    }
    const viewOf = (uid) => views.get(uid);
    const posOf = (uid, y) => { const v = views.get(uid); if (!v) return null; return tmp.set(v.u.g.x, y == null ? 1.2 : y, v.u.g.z).clone(); };

    // ---------- What just happened (the simulation's own list), shown and heard ----------
    function float(at, text, cls) {
      if (!at) return; G.toScreen(at, scr); if (scr.behind) return;
      const el = U.el('<span class="dmg ' + (cls || "") + '">' + text + "</span>"); el.style.left = Math.round(scr.x + (Math.random() - 0.5) * 24) + "px"; el.style.top = Math.round(scr.y) + "px";
      hud.appendChild(el); setTimeout(() => el.remove(), 900);
    }
    function toast(text, cls) { const box = hud.querySelector(".b-toasts"); if (!box) return; const el = U.el('<div class="t-toast ' + (cls || "") + '">' + text + "</div>"); box.appendChild(el); while (box.children.length > 2) box.firstChild.remove(); setTimeout(() => el.remove(), 1300); }
    function banner(text) { const el = hud.querySelector(".b-line"); if (!el) return; el.textContent = text; el.classList.remove("in"); void el.offsetWidth; el.classList.add("in"); }
    const ASTRA_FX = { agneya: [0xff7a2a, "fire"], varuna: [0x7ad0ff, "water"], vayavya: [0xe8e0c8, "wind"], sammohana: [0xc8a0ff, "sleep"], nagapasha: [0x8aff9a, "bind"], astra: [0xfff0a0, "bolt"] };
    function events() {
      const p = C.player(), pv = p && views.get(p.uid), pf = pv && pv.figs[0];
      for (const e of R.fx.splice(0)) {
        const v = e.uid != null ? views.get(e.uid) : null, f = v && v.figs[0];
        switch (e.k) {
          case "blow": { if (!pf) break; const w = p.g.weapon, name = e.shot ? "loose" : e.arc === "smash" ? "smash" : e.arc === "sweep" ? "sweep" : w === "spear" ? (e.heavy ? "heavy" : "thrust") : w === "dagger" ? "stab" : w === "fist" ? "punch" : e.heavy ? "heavy" : e.n % 2 ? "slash2" : "slash";
            pf.act(name, Math.max(0.16, e.land / G.ACTS[name].land), 0); sfx("step"); break; }
          case "whiffme": break;
          case "hit": {
            const at = posOf(e.uid, 1.25); if (!at) break;
            if (e.n > 0) float(at, String(Math.round(e.n)), (v.u.side === "enemy" ? "foe" : "mine") + (e.heavy ? " big" : ""));
            G.fx.burst(e.blocked ? "spark" : "hit", at, { n: e.heavy ? 12 : 7, s: e.heavy ? 1.3 : 1 });
            sfx(e.blocked ? "clang" : "hit");
            if (f && !f.action && e.n > 0) for (const x of v.figs) if (!x.fellAt) x.act("hit", 0.3);
            if (v.u.side === "player" && e.n > 0) { G.shake(e.heavy ? 0.34 : 0.18, 0.3); hurt(); }
            else if (e.by === p.uid && e.melee) { hitStop = e.heavy ? 0.07 : 0.035; if (e.heavy) G.shake(0.14, 0.2); }
            break; }
          case "windup": if (!tips.mark && v && v.u.side === "enemy" && C.player() && (R3.threats(R).length)) tip("mark", "A mark on the ground shows where a blow will land. Step or roll out of it before it fills."); break;
          case "swing": if (e.area && e.x != null) { const at = tmp.set(e.x, 0.1, e.z).clone(); if (v && v.kind === "light") { G.fx.beam(at, new T.Vector3(e.x, 28, e.z), 0xfff0b0, 0.9, 0.7); G.fx.flash("rgba(255,240,200,.35)", 300); } G.fx.ring(at, 0xffb060, 0.4, e.r || 3, 0.5); G.fx.burst("dust", at, { n: 16, s: 2 }); G.shake(0.3, 0.35); sfx("drum"); } break;
          case "shot": sfx("tap"); if (f && e.uid !== p.uid) for (const x of v.figs) if (!x.action || !G.ACTS[x.action.name].bow) x.act("loose", 0.4, 0.55); break;
          case "arrive": { const s = shots.get(e.shot.n); if (s) { if (e.uid != null) G.fx.burst("spark", s.position, { n: 4 }); G.fxRoot.remove(s); G.dispose(s); shots.delete(e.shot.n); } break; }
          case "parry": { const at = posOf(e.uid, 1.3); if (at && pf) { at.lerp(pf.root.position.clone().setY(1.3), 0.5); G.fx.burst("spark", at, { n: 16, s: 1.4 }); } if (pf) pf.act("parry", 0.3); sfx("clang"); if (!e.part) { toast(U.tr("Parried!"), "good"); G.fx.flash("rgba(255,255,255,.25)", 260); } break; }
          case "parried": if (pf) pf.act("hit", 0.3); sfx("clang"); toast(U.tr("Parried")); break;
          case "fblock": { const at = posOf(e.uid, 1.2); if (at) G.fx.burst("spark", at, { n: 8 }); sfx("clang"); float(at, U.tr("Blocked"), "note"); if (!tips.fblock) tip("fblock", "He took it on his shield. While he lowers it he cannot strike: hit him again."); break; }
          case "perfect": toast(U.tr("Perfect roll"), "good"); break;
          case "perfectblock": toast(U.tr("Perfect block"), "good"); sfx("clang"); break;
          case "miss": { const at = posOf(e.uid, 1.6); if (at && e.uid !== p.uid) float(at, U.tr("Missed"), "note"); break; }
          case "roll": if (pf) G.fx.burst("dust", pf.root.position, { n: 5 }); sfx("step"); break;
          case "shield": if (e.up) sfx("tap"); break;
          case "winded": toast(U.tr("Winded"), "bad"); break;
          case "shieldbreak": if (e.mine) { toast(U.tr("Shield broken!"), "bad"); if (pf) pf.setShield(false); } else if (f) for (const x of v.figs) x.setShield(false); sfx("clang"); { const at = posOf(e.uid, 1.1); if (at) G.fx.burst("spark", at, { n: 18, s: 1.5 }); } break;
          case "shieldcrack": if (e.mine) toast(U.tr("Cracked")); break;
          case "shieldthrown": { const m = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.06, 14), new T.MeshLambertMaterial({ color: 0x8a5a2a, emissive: 0x5a3a10, emissiveIntensity: 0.6 })); m.position.set(e.g.x, 0.08, e.g.z); G.fxRoot.add(m); grounds.set(e.g.id, m); toast(U.tr("A comrade throws you a shield!"), "good"); break; }
          case "shieldup": { const m = grounds.get(e.id); if (m) { G.fxRoot.remove(m); G.dispose(m); grounds.delete(e.id); } if (pf) pf.setShield(true); toast(U.tr("Shield taken up"), "good"); sfx("tap"); break; }
          case "skill": { if (pf && e.id !== "ridedown") pf.act(e.id === "aimed" ? "loose" : e.id === "quake" ? "smash" : "wave", e.id === "quake" ? 0.6 : 0.5); toast(U.tr(K.ABILITIES[e.id].name), "good"); if (e.id === "song" || e.id === "salve" || e.id === "vanish") G.fx.burst(e.id === "vanish" ? "smoke" : "light", pf.chest(), { n: 16 }); break; }
          case "quake": if (pf) { G.fx.ring(pf.root.position, 0xffc070, 0.5, e.r, 0.45); G.fx.burst("dust", pf.root.position, { n: 22, s: 2.4 }); G.shake(0.4, 0.4); sfx("drum"); } break;
          case "order": { const at = posOf(e.uid, 2); if (at) float(at, "!", "note"); break; }
          case "heal": { const at = posOf(e.uid, 1); if (at) { G.fx.burst("heal", at, { n: 14 }); sfx("heal"); } break; }
          case "kneel": break;
          case "call": sfx("conch"); toast(U.tr("Help comes."), "good"); break;
          case "join": sync(); break;
          case "enter": sfx("drumCall"); break;
          case "beaten": { const at = posOf(e.uid, 2); if (at) float(at, U.tr("Mercy!"), "note"); if (!tips.spare) tip("spare", "A beaten foe kneels. Step close and Spare him, or strike him down."); break; }
          case "spared": toast(U.tr("Spared. The fight goes on."), "good"); if (v) { for (const x of v.figs) x.pose("namaste"); dropView(v); } break;
          case "feint": { const at = posOf(e.uid, 2); if (at) float(at, U.tr("Feint!"), "note"); break; }
          case "brace": { const at = posOf(e.uid, 1.2); if (at) G.fx.ring(at.setY(0.1), 0xa0c0ff, 0.3, 1.2, 0.4); break; }
          case "dot": { const at = posOf(e.uid, 1.4); if (at) { float(at, String(e.n), v.u.side === "enemy" ? "foe" : "mine"); G.fx.burst(e.s === "burn" ? "ember" : "hit", at, { n: 5 }); } break; }
          case "leave": if (v) { G.fx.burst("dust", posOf(e.uid, 0.5), { n: 14, s: 2 }); dropView(v, "now"); } break;
          case "fall": if (v) { sfx(v.u.side === "enemy" ? "fall" : "friendFalls"); if (v.mark) { v.mark.userData.free(); v.mark = null; } if (v.bar) v.bar.classList.add("gone"); if (v.kind === "cart") G.fx.burst("smoke", posOf(e.uid, 0.6), { n: 14, s: 2 }); } break;
          case "event": { const row = B.log[e.at]; if (row) { banner(C.line(row)); sfx("drumCall"); } break; }
          case "toast": toast(U.tr(e.s)); break;
          case "laydown": if (pf) pf.pose("kneel"); toast(U.tr(K.ABILITIES.lay_down.name)); break;
          case "cover": sfx("tap"); break;
          case "lock": break;
          case "astra": astraFx(e); break;
        }
      }
      // A line the fight itself spoke (the engine's log) that no event carried: the story beats.
      for (; lastLog < B.log.length; lastLog++) { const row = B.log[lastLog]; if (row && (row.raw || row.ev) && started && lastLog > 0) banner(C.line(row)); }
    }
    function astraFx(e) {
      const p = C.player(), pv = views.get(p.uid), pf = pv && pv.figs[0];
      const [col, kind] = ASTRA_FX[e.id] || ASTRA_FX.astra;
      sfx("gong"); G.fx.flash("rgba(255,244,214,.6)", 600); G.shake(0.5, 0.8);
      if (pf) { G.fx.beam(pf.root.position.clone(), pf.root.position.clone().setY(30), col, 0.6, 1.6); G.fx.ring(pf.root.position, col, 0.5, R.rad, 1.2); G.fx.burst("light", pf.chest(), { n: 30, s: 1.6, col }); }
      toast(U.tr(K.astraName ? K.astraName(e.id) : K.ABILITIES[e.id].name), "good");
      (e.struck || []).forEach((uid, i) => {
        const at = posOf(uid, 0.1); if (!at) return;
        setTimeout(() => {
          if (closed) return;
          if (kind === "bolt") { G.fx.beam(at, at.clone().setY(30), col, 0.35, 0.5); G.fx.burst("hit", at.clone().setY(1.2), { n: 18, s: 1.8, col }); }
          else if (kind === "fire" || kind === "water") G.fx.fall(at, col, 0.35, kind);
          else { G.fx.ring(at, col, 0.3, 2.4, 0.9); G.fx.burst(kind === "wind" ? "dust" : "light", at.clone().setY(1), { n: 18, s: 1.6, col }); }
          if (e.dealt && e.dealt[uid]) float(at.clone().setY(1.6), String(Math.round(e.dealt[uid])), "foe big");
          sfx("drum");
        }, 500 + i * 220);
      });
      if (e.out && e.out.text) banner(K.text(e.out.text));
    }
    // The champions' weapons meeting overhead (content/war_duel.js calls this through K.UI.astraFx).
    U.astraFx = function (o) {
      if (!G.ok || closed) return;
      const a = new T.Vector3(-R.rad * 1.6, 16, -R.rad), b = new T.Vector3(R.rad * 1.6, 16, -R.rad), mid = new T.Vector3(0, 19, -R.rad);
      G.fx.beam(a, mid, 0xff9a40, 0.5, 1.4); G.fx.beam(b, mid, 0x8ac0ff, 0.5, 1.4); G.fx.burst("light", mid, { n: 40, s: 4 }); G.fx.flash("rgba(255,240,210,.4)", 500); G.shake(0.3, 0.6); sfx("gong");
      void o;
    };
    let hurtT = 0;
    function hurt() { hurtT = 0.35; const sh = U.$("shade"); if (sh) sh.style.background = "radial-gradient(130% 100% at 50% 45%, transparent 40%, rgba(160, 20, 10, 0.6) 100%)"; }
    // One-time hints, the first time each thing happens (kept in the settings, so they are said once).
    const tips = Object.assign({}, K.prefs().tips3d || {});
    function tip(id, text) { if (tips[id]) return; tips[id] = 1; K.prefs({ tips3d: tips }); const el = hud.querySelector(".b-tip"); if (!el) return; el.textContent = K.tr(text); el.hidden = false; tipT = 5.5; }

    // ---------- The camera ----------
    function camera(dt, snap) {
      const p = C.player(); if (!p || !p.g) return;
      const asp = G.W / G.H, k = clamp((asp - 0.75) / 0.6, 0, 1);         // 0 upright phone … 1 wide screen
      const fov = 62 - 16 * k, back = 7.6 + 3.6 * k, up = 12.4 - 7.0 * k;
      // Pull back while foes on the field stand far from you, so none is lost off the edge.
      let far = 5, cx = p.g.x, cz = p.g.z, n = 1;
      for (const u of B.units) { if (u.side !== "enemy" || u.hp <= 0 || !u.g || !u.g.entered || u.g.kind === "light") continue; const d = Math.hypot(u.g.x - p.g.x, u.g.z - p.g.z); if (d < 16) { far = Math.max(far, d); cx += u.g.x; cz += u.g.z; n++; } }
      const wantZoom = clamp(far / 8.5, 1, 1.75);
      zoom += (wantZoom - zoom) * (snap ? 1 : Math.min(1, dt * 1.6));
      const lx = p.g.x * 0.7 + (cx / n) * 0.3, lz = p.g.z * 0.7 + (cz / n) * 0.3 - 0.6;
      camLook.set(lx, 1.0, lz);
      G.cam.rate = 5;
      G.camSet([lx, 1 + up * zoom, lz + back * zoom], camLook, fov, snap);
    }

    // ---------- Your hands ----------
    const tap = (k, v) => { input.taps[k] = v === undefined ? true : v; };
    function act() {
      if (U.battleBot) return R3.bot(R);
      let up = 0, right = 0; const ks = input.keys;
      if (ks.has("w") || ks.has("arrowup")) up += 1; if (ks.has("s") || ks.has("arrowdown")) up -= 1; if (ks.has("d") || ks.has("arrowright")) right += 1; if (ks.has("a") || ks.has("arrowleft")) right -= 1;
      if (input.stick) { up += input.stick.y; right += input.stick.x; }
      if (input.pad) { up += input.pad.y; right += input.pad.x; }
      // Up on the stick is away from the camera.
      const yaw = G.camYaw(), fx = Math.sin(yaw), fz = Math.cos(yaw);
      const a = { mx: fx * up - fz * right, mz: fz * up + fx * right, block: input.block || input.mouseBlock || input.padBlock || ks.has("k") || ks.has("shift") };
      Object.assign(a, input.taps); input.taps = {};
      return a;
    }
    function onKey(e) {
      if (closed || document.querySelector(".scrim")) return;
      const k = e.key.toLowerCase(), down = e.type === "keydown";
      if (!started || R.over) { return; }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "k", "shift"].includes(k)) { if (down) input.keys.add(k); else input.keys.delete(k); e.preventDefault(); return; }
      if (!down || e.repeat) { if ([" ", "j", "l", "e", "q", "tab"].includes(k)) e.preventDefault(); return; }
      if (k === "escape" || k === "p") { e.preventDefault(); pause(!paused); return; }
      if (paused) return;
      const map = { j: "strike", " ": "roll", l: "skill", e: "skill", q: "lock", tab: "lock", h: "herbs", c: "call", v: "cover", y: "layDown" };
      if (map[k]) { e.preventDefault(); tap(map[k]); if (k === " ") tapRollDir(); return; }
      if (k === "f") { const s = R3.spareable(R)[0]; if (s) tap("spare", s.uid); return; }
      if (k === "x") { withdraw(); return; }
      if (k === "o") { cycleOrders(); return; }
      if (/^[1-3]$/.test(k)) { const rows = R3.astras(R); const row = rows[+k - 1]; if (row && !row.why) tap("astra", row.id); }
    }
    function tapRollDir() { /* the roll takes the direction the stick or keys are held (the simulation reads mx, mz with it) */ }
    function withdraw() {
      if (!R3.can(R, "withdraw")) return;
      const breaks = C.fleeBreaks && C.fleeBreaks();
      pause(true, { title: K.tr("Withdraw from the fight"), text: breaks ? K.tr("Withdrawing breaks your vow never to retreat.") : K.tr("Are you sure?"), yes: K.tr("Yes, withdraw"), no: K.tr("Stay and fight"), onYes: () => tap("withdraw") });
    }
    const ORDERS = [["With me", { friend: "guard", soldiers: "defend" }], ["Attack", { friend: "allout", soldiers: "allout" }], ["Fall back", { friend: "hold", soldiers: "stay" }]];
    let orderN = 0;
    function cycleOrders() {
      if (!B.units.some((u) => u.side === "ally" && u.hp > 0 && !u.still)) { toast(U.tr("No one is fighting beside you to take an order.")); return; }
      orderN = (orderN + 1) % ORDERS.length; tap("orders", ORDERS[orderN][1]); toast(U.tr("Orders") + ": " + U.tr(ORDERS[orderN][0])); sfx("drumCall");
      const b = hud.querySelector('[data-a="orders"] b'); if (b) b.textContent = K.tr(ORDERS[orderN][0]);
    }
    function pause(on, ask) {
      if (closed) return;
      paused = on; U.setPaused("battle", on);
      const old = hud.querySelector(".b-pause"); if (old) old.remove();
      if (!on) return;
      const el = U.el('<div class="b-card b-pause"><h2>' + U.esc(ask ? ask.title : K.tr("Paused")) + "</h2>" + (ask ? "<p>" + U.esc(ask.text) + "</p>" : "") + '<div class="btnrow"></div></div>');
      const row = el.querySelector(".btnrow");
      if (ask) { row.appendChild(U.button("cta retry", U.esc(ask.yes), () => { pause(false); ask.onYes(); })); row.appendChild(U.button("cta secondary", U.esc(ask.no), () => pause(false))); }
      else { row.appendChild(U.button("cta", U.tr("Resume ▶"), () => pause(false))); if (R3.can(R, "withdraw")) row.appendChild(U.button("ghost", U.tr("Withdraw"), () => { pause(false); withdraw(); })); }
      hud.appendChild(el);
    }
    // The pointer: on a phone the left half of the screen is the stick; with a mouse, click strikes and the right button guards.
    const cv = U.$("view");
    function pdown(e) {
      if (!started || paused || R.over) return;
      if (e.pointerType === "mouse") { if (e.button === 2) input.mouseBlock = true; else if (e.button === 0) { const hit = pickFoe(e.clientX, e.clientY); if (hit) tap("lockOn", hit); tap("strike"); } return; }
      if (e.clientX < G.W * 0.5 && !input.stick) { input.stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: 0, y: 0 }; stickEl.style.left = e.clientX + "px"; stickEl.style.top = e.clientY + "px"; stickEl.classList.add("on"); knob.style.transform = ""; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* gone */ } }
      else { const hit = pickFoe(e.clientX, e.clientY); if (hit) { tap("lockOn", hit); } }
    }
    function pmove(e) { const s = input.stick; if (!s || s.id !== e.pointerId) return; const dx = e.clientX - s.x0, dy = e.clientY - s.y0, l = Math.hypot(dx, dy), m = 52, k = l > m ? m / l : 1; s.x = (dx * k) / m; s.y = -(dy * k) / m; if (l < 8) { s.x = 0; s.y = 0; } knob.style.transform = "translate(" + dx * k + "px," + dy * k + "px)"; }
    function pup(e) { if (e.pointerType === "mouse") { if (e.button === 2) input.mouseBlock = false; return; } const s = input.stick; if (s && s.id === e.pointerId) { input.stick = null; stickEl.classList.remove("on"); } }
    const noMenu = (e) => { if (started && !closed) e.preventDefault(); };
    function pickFoe(cx, cy) { let best = null, bd = 70; for (const v of views.values()) { const u = v.u; if (u.side !== "enemy" || u.hp <= 0 || !u.g.entered || u.g.kind === "light") continue; G.toScreen(tmp.set(u.g.x, 1, u.g.z), scr); const d = Math.hypot(scr.x - cx, scr.y - cy); if (d < bd) { bd = d; best = u.uid; } } return best; }
    function gamepad() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const x of pads) if (x && x.connected) { gp = x; break; }
      if (!gp) { input.pad = null; input.padBlock = false; return; }
      const dz = (v) => (Math.abs(v) < 0.2 ? 0 : v);
      input.pad = { x: dz(gp.axes[0] || 0), y: -dz(gp.axes[1] || 0) };
      const btn = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed), was = input.padWas || {};
      const edge = (i, name, val) => { const on = btn(i); if (on && !was[i]) tap(name, val); was[i] = on; };
      edge(0, "strike"); edge(1, "roll"); edge(2, "skill"); edge(3, "herbs"); edge(4, "lock"); edge(9, "pause");
      input.padBlock = btn(5) || btn(7) || btn(6); input.padWas = was;
      if (input.taps.pause) { delete input.taps.pause; pause(!paused); }
    }

    // ---------- The HUD ----------
    let stickEl, knob, btnEls = {}, me = {};
    function buildHud() {
      hud.innerHTML = '<div class="b-top"><b class="b-title"></b><span class="b-goal"></span></div><p class="b-line"></p><div class="b-toasts"></div><p class="b-tip" hidden></p>' +
        '<div class="b-me"><div class="b-name"></div><div class="b-bar hp"><i></i><span></span></div><div class="b-bar breath"><i></i></div><div class="b-status"></div></div>' +
        '<div class="b-stick"><i></i></div><div class="b-acts"></div><div class="b-side"></div>';
      hud.querySelector(".b-title").textContent = K.text(K.val(enc.title) || "A fight");
      stickEl = hud.querySelector(".b-stick"); knob = stickEl.querySelector("i");
      me = { name: hud.querySelector(".b-name"), hp: hud.querySelector(".b-bar.hp i"), hpN: hud.querySelector(".b-bar.hp span"), br: hud.querySelector(".b-bar.breath i"), status: hud.querySelector(".b-status"), goal: hud.querySelector(".b-goal") };
      me.name.textContent = K.S.name || K.tr("You");
      const acts = hud.querySelector(".b-acts"), side = hud.querySelector(".b-side");
      const mk = (box, a, label, key, down, up) => { const b = U.el('<button type="button" class="b-btn" data-a="' + a + '"><b>' + U.tr(label) + "</b>" + (key ? "<kbd>" + key + "</kbd>" : "") + '<i class="cd"></i></button>');
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); if (!started || paused || R.over) return; down(); });
        if (up) for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, up);
        b.addEventListener("contextmenu", (e) => e.preventDefault());
        box.appendChild(b); btnEls[a] = b; return b; };
      mk(acts, "strike", R.noStrike ? "Guard" : "Strike", "J", () => tap("strike"));
      mk(acts, "roll", "Roll", "␣", () => tap("roll"));
      if (R.blocker) mk(acts, "block", "Block", "K", () => { input.block = true; }, () => { input.block = false; });
      if (R.skill) mk(acts, "skill", K.ABILITIES[R.skill].name, "L", () => tap("skill"));
      const p = C.player();
      if (p.abilities.includes("herbs")) mk(side, "herbs", "Herbs", "H", () => tap("herbs"));
      if (p.abilities.includes("call")) mk(side, "call", "Call for help", "C", () => tap("call"));
      if (p.abilities.includes("cover")) mk(side, "cover", K.ABILITIES.cover.name, "V", () => tap("cover"));
      if (p.abilities.includes("lay_down")) mk(side, "layDown", K.ABILITIES.lay_down.name, "Y", () => tap("layDown"));
      R3.astras(R).forEach((row, i) => { if (i < 3) mk(side, "astra" + i, row.name || K.ABILITIES[row.id].name, String(i + 1), () => { const r2 = R3.astras(R)[i]; if (r2 && !r2.why) tap("astra", r2.id); else if (r2) toast(U.esc(r2.why)); }); });
      mk(side, "spare", "Spare", "F", () => { const s = R3.spareable(R)[0]; if (s) tap("spare", s.uid); });
      if (B.units.some((u) => u.side === "ally" && !u.still)) mk(side, "orders", ORDERS[0][0], "O", () => cycleOrders());
      mk(side, "lock", "Next foe", "Q", () => tap("lock"));
      const top = U.el('<div class="b-corner"></div>'); hud.appendChild(top);
      top.appendChild(U.button("b-ico", "❚❚", () => pause(!paused))); top.lastChild.title = K.tr("Pause");
    }
    function goalText() {
      const left = R3.timeLeft(R), n = left != null ? Math.ceil(left) : 0;
      if (R.noStrike) return K.tr("Nothing to strike at: block, roll and live. {n} seconds", { n });
      if (R.through) return K.tr("Break through to the far side") + (left != null ? " · " + n + " s" : "");
      if (R.escort) { const cart = B.units.find((u) => u.still); return K.tr("Keep {who} whole", { who: cart ? K.text(cart.name) : "" }) + " · " + n + " s"; }
      if (left != null) return K.tr("Hold your ground") + " · " + n + " s · " + K.tr("Foes left: {n}", { n: R3.count(R) });
      return K.tr("Foes left: {n}", { n: R3.count(R) });
    }
    function drawHud(dt) {
      const p = C.player(); if (!p) return;
      me.hp.style.transform = "scaleX(" + clamp(p.hp / p.maxHp, 0, 1).toFixed(3) + ")"; me.hpN.textContent = Math.max(0, Math.ceil(p.hp)) + " / " + p.maxHp;
      me.hp.parentNode.classList.toggle("low", p.hp <= p.maxHp * 0.3);
      me.br.style.transform = "scaleX(" + clamp(R.breath / R3.P.breathMax, 0, 1).toFixed(3) + ")"; me.br.parentNode.classList.toggle("low", R.breath < R3.P.rollMin || R.winded);
      const goal = goalText(); if (me.goal.textContent !== goal) me.goal.textContent = goal;
      const st2 = Object.keys(p.status).filter((s) => p.status[s]).map((s) => K.tr(s)).join(" · ") + (R.haste > 0 ? " · ♪" : ""); if (me.status.textContent !== st2) me.status.textContent = st2;
      const set = (a, ok, cd, hide) => { const b = btnEls[a]; if (!b) return; b.classList.toggle("off", !ok); if (hide != null) b.hidden = hide; const c = b.querySelector(".cd"); if (c) c.style.transform = "scaleY(" + clamp(cd || 0, 0, 1).toFixed(2) + ")"; };
      set("strike", R3.can(R, "strike") || R.noStrike, 0);
      set("roll", R3.can(R, "roll"), 0);
      set("block", R3.can(R, "block") || R.block, R.broken ? 1 : 0); if (btnEls.block) btnEls.block.classList.toggle("on", !!R.block);
      if (R.skill) set("skill", R3.can(R, "skill"), R.skillCd / (RT.RECHARGE[R.skill] || 10));
      set("herbs", R3.can(R, "herbs"), (R.herbCd || 0) / 8); if (btnEls.herbs) { const n = K.S.items.herbs || 0, k = btnEls.herbs.querySelector("kbd"); if (k) k.textContent = "×" + n; }
      set("call", R3.can(R, "call"), 0); set("cover", R3.can(R, "cover"), 0); set("layDown", R3.can(R, "layDown"), 0, !R3.can(R, "layDown") && !B.laidDown ? null : null);
      const ast = R3.astras(R); ast.forEach((row, i) => set("astra" + i, !row.why, 0));
      set("spare", true, 0, !R3.spareable(R).length);
      // Bars over the others.
      const tgt = R.lock;
      for (const v of views.values()) {
        const u = v.u; if (!v.bar) continue;
        const show = u.hp > 0 && u.g.entered !== false && (u.side === "ally" ? u.hp < u.maxHp || u.still : true) && v.kind !== "light";
        if (!show) { v.bar.style.display = "none"; continue; }
        G.toScreen(tmp.set(u.g.x, v.kind === "elephant" ? 4 : v.car ? 3.3 : v.kind === "cart" ? 2.2 : 2.25, u.g.z), scr);
        if (scr.behind || scr.x < -40 || scr.x > G.W + 40 || scr.y < 30) { v.bar.style.display = "none"; continue; }
        v.bar.style.display = ""; v.bar.style.transform = "translate(" + Math.round(scr.x) + "px," + Math.round(scr.y) + "px) translate(-50%,-100%)";
        v.bar.querySelector("i").style.transform = "scaleX(" + clamp(u.hp / u.maxHp, 0, 1).toFixed(3) + ")";
        v.bar.classList.toggle("on", u.uid === tgt || !!u.hero || !!u.person || !!u.still);
        v.bar.classList.toggle("kneel", !!u.g.beaten);
      }
      if (tipT > 0) { tipT -= dt; if (tipT <= 0) { const el = hud.querySelector(".b-tip"); if (el) el.hidden = true; } }
      if (hurtT > 0) { hurtT -= dt; if (hurtT <= 0) { const sh = U.$("shade"); if (sh) sh.style.background = ""; } }
    }
    U.battleState = () => (closed ? "closed" : !started ? "brief" : R.over ? "over:" + R.over : "t=" + R.t.toFixed(1));

    // ---------- Before, and after ----------
    function brief() {
      const foes = B.units.filter((u) => u.side === "enemy").map((u) => K.text(u.name)), allies = B.units.filter((u) => u.side === "ally").map((u) => K.text(u.name));
      const one = foes.length === 1 ? foes[0] : null, left = R3.timeLeft(R);
      const goal = R.noStrike ? K.tr("You cannot strike back. Guard, take cover, and live through {n} rounds.", { n: enc.hold || enc.rounds || 4 }).replace(/\d+ rounds|\d+ दौर/, Math.round(left) + " s")
        : R.through ? K.tr("Break through to the far side") + " (" + Math.round(left) + " s)" : R.escort ? K.tr("Keep {who} whole", { who: K.text((B.units.find((u) => u.still) || {}).name || "") }) + " (" + Math.round(left) + " s)"
        : left != null ? K.tr("Hold your ground") + " (" + Math.round(left) + " s). " + K.tr("You need not win, only not fall.") : one ? K.tr("Bring {foe} down. If you fall first, you lose.", { foe: one }) : K.tr("Bring them all down. If you fall first, you lose.");
      const intro = B.log.filter((r) => r && r.raw).map((r) => "<p>" + U.esc(C.line(r)) + "</p>").join("");
      const how = touch ? "Left thumb: move. Right thumb: Strike, Roll, Guard and your skill. Tap a foe to face them." : "Move: WASD or arrows. Strike: J or left click. Roll: Space. Guard: K or Shift. Skill: L. Face the next foe: Q. Herbs: H. Help: C. Divine weapon: 1–3. Spare: F. Withdraw: X.";
      const el = U.el('<div class="b-card b-brief"><span class="kind war">' + U.tr(enc.lethal ? "Battle" : "A fight") + "</span><h2>" + U.esc(K.text(K.val(enc.title) || "A fight")) + "</h2>" + (K.val(enc.caption) ? '<p class="cap">' + U.esc(K.text(K.val(enc.caption))) + "</p>" : "") + intro +
        '<p class="b-foes"><b>' + U.esc(foes.join(", ")) + "</b>" + (allies.length ? ' <span class="muted">· ' + U.tr("With you: {who}", { who: U.esc(allies.join(", ")) }) + "</span>" : "") + "</p>" +
        '<p class="b-goalline">' + U.esc(goal) + '</p><p class="small muted">' + U.tr(how) + '</p><div class="btnrow"></div></div>');
      const go = () => { if (started) return; started = true; el.remove(); U.keys([]); sfx(enc.lethal ? "conch" : "drumCall"); lastLog = B.log.length; if (enc.dream && !tips.move) tip("move", touch ? "Left thumb: move. Right thumb: Strike, Roll, Guard and your skill. Tap a foe to face them." : "Move: WASD or arrows. Strike: J or left click. Roll: Space. Guard: K or Shift. Skill: L. Face the next foe: Q. Herbs: H. Help: C. Divine weapon: 1–3. Spare: F. Withdraw: X."); };
      el.querySelector(".btnrow").appendChild(U.button("cta", U.tr("Fight"), go, "battle-go"));
      hud.appendChild(el);
      U.keys([go]);
      if (U.battleBot) setTimeout(go, 500);
    }
    function retryCard() {
      const el = U.el('<div class="b-card b-retry"><h2>' + U.tr("You are beaten") + "</h2><p>" + U.tr("One more try: you start a little hurt, and what you used stays used.") + '</p><div class="btnrow"></div></div>');
      const again = () => { el.remove(); U.keys([]); for (const v of [...views.values()]) dropView(v, "now"); for (const m of shots.values()) { G.fxRoot.remove(m); G.dispose(m); } shots.clear(); R = R3.retry(R); B = R.B; lastLog = B.log.length; sync(); camera(0, true); asked = false; };
      const accept = () => { el.remove(); U.keys([]); R3.accept(R); asked = false; };
      el.querySelector(".btnrow").appendChild(U.button("cta", U.tr("Try again"), again, "battle-retry"));
      el.querySelector(".btnrow").appendChild(U.button("ghost", U.tr("Accept the loss"), accept));
      hud.appendChild(el);
      U.keys([again, accept]);
      if (U.battleBot) setTimeout(again, 600);
    }
    let asked = false, ending = false;
    function finish() {
      if (ending) return; ending = true;
      const out = R.over;
      const word = out === "win" ? "Victory" : out === "spare" ? "Spared" : out === "flee" ? "You withdraw" : "You are beaten";
      const res = U.el('<div class="t-result ' + (out === "win" || out === "spare" ? "win" : out === "flee" ? "close" : "lose") + '"><b>' + U.tr(word) + "</b></div>"); document.body.appendChild(res);
      sfx(out === "win" || out === "spare" ? "gong" : "drum");
      const p = C.player(), pv = p && views.get(p.uid), pf = pv && pv.figs[0];
      if (pf && p.hp > 0) pf.pose(out === "win" || out === "spare" ? "cheer" : "slump");
      setTimeout(() => {
        U.curtain(() => {
          res.remove(); close(); U.b3d.off();
          R3.unscale(B);
          const done = C.end();
          onEnd(done ? done.over : out);
        }, !!enc.dream);
      }, U.calm() ? 900 : 1700);
    }
    function close() {
      closed = true;
      for (const f of offs.splice(0)) f();
      document.removeEventListener("keydown", onKey, true); document.removeEventListener("keyup", onKey, true);
      cv.removeEventListener("pointerdown", pdown); cv.removeEventListener("pointermove", pmove); cv.removeEventListener("pointerup", pup); cv.removeEventListener("pointercancel", pup); cv.removeEventListener("contextmenu", noMenu);
      for (const v of [...views.values()]) dropView(v, "now");
      for (const m of shots.values()) { G.fxRoot.remove(m); G.dispose(m); } for (const m of grounds.values()) { G.fxRoot.remove(m); G.dispose(m); }
      if (lockRing) { G.fxRoot.remove(lockRing); G.dispose(lockRing); } if (goalMark) goalMark.userData.free();
      hud.remove(); U.setPaused("battle", false); U.astraFx = null; U.battleState = null;
      const sh = U.$("shade"); if (sh) sh.style.background = "";
      G.clear(G.actors);
    }
    document.addEventListener("keydown", onKey, true); document.addEventListener("keyup", onKey, true);
    cv.addEventListener("pointerdown", pdown); cv.addEventListener("pointermove", pmove); cv.addEventListener("pointerup", pup); cv.addEventListener("pointercancel", pup); cv.addEventListener("contextmenu", noMenu);

    // ---------- Every frame ----------
    function frame(dt, t, real) {
      if (closed || !st) return;
      gamepad();
      if (started && !R.over && !paused && dt > 0) {
        const sp = U.battleSpeed || 1; // (the smoke tests run fights faster than life)
        if (hitStop > 0 && sp === 1) hitStop -= real; else acc += Math.min(dt, 0.1) * sp;
        let n = 0;
        while (acc >= R3.STEP && n++ < 8 * sp && !R.over) { R3.step(R, act()); acc -= R3.STEP; events(); if (hitStop > 0 && sp === 1) break; }
        if (n >= 5 * sp) acc = Math.min(acc, R3.STEP * 2);
      }
      sync();
      for (const v of [...views.values()]) { if (!B.units.includes(v.u) && !v.gone) { v.gone = true; dropView(v, "now"); continue; } place(v, dt, t); }
      windups(t);
      // Arrows in the air.
      for (const s of R.shots) { if (R.t < s.t0) continue; let m = shots.get(s.n); if (!m) { m = G.arrowMesh(0.9); G.fxRoot.add(m); shots.set(s.n, m); } if (m.userData.x0 == null) { m.userData.x0 = s.x; m.userData.z0 = s.z; const tg2 = s.on != null ? B.units.find((u) => u.uid === s.on) : null; m.userData.len = Math.max(4, tg2 && tg2.g ? Math.hypot(tg2.g.x - s.x, tg2.g.z - s.z) : 14); }
        const k = Math.min(1, Math.hypot(s.x - m.userData.x0, s.z - m.userData.z0) / m.userData.len), lift = Math.min(1.6, m.userData.len * 0.07);
        m.position.set(s.x, 1.35 + Math.sin(k * Math.PI) * lift, s.z); m.rotation.set(-Math.cos(k * Math.PI) * lift * 0.5, s.a, 0, "YXZ"); }
      for (const [n, m] of shots) if (!R.shots.some((s) => s.n === n)) { G.fxRoot.remove(m); G.dispose(m); shots.delete(n); }
      // The one you face.
      const tg = !R.over && started ? R3.target(R) : null;
      if (tg && lockRing) { lockRing.visible = true; lockRing.position.set(tg.g.x, 0.06, tg.g.z); const s = (tg.g.rad / 0.42) * (1 + Math.sin(t * 5) * 0.05); lockRing.scale.set(s, 1, s); } else if (lockRing) lockRing.visible = false;
      for (const m of grounds.values()) m.rotation.y = t * 2;
      camera(dt, false);
      drawHud(real);
      if (R.over === "retry" && !asked) { asked = true; setTimeout(retryCard, 700); }
      else if (R.over && R.over !== "retry") finish();
    }
  }
})(window.K = window.K || {});
