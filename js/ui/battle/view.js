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
  const NAMED = [[/^Ugra(?!'s)/, "ugra"], [/Dushasana's/, "guard"], [/Dushasana(?!'s)/, "dushasana"], [/Karna(?!'s)/, "karna"], [/Bhima(?!'s)/, "bhima"], [/Brihannala/, "brihannala"], [/huge brahmin/i, "bhima_brahmin"], [/^Bhurishravas$/, "bhurishravas"], [/^Kritavarma$/, "kritavarma"], [/^Vrishasena$/, "vrishasena"], [/^Iravan$/, "iravan"], [/Ketan|boy/i, "boy"], [/Drona(?!'s)/, "drona"], [/^Satyaki$/, "satyaki"],
    [/^Ghatotkacha$/, "ghatotkacha"], [/^Jayadratha$/, "jayadratha"], [/^Shalya$/, "shalya"], [/^Kripa$/, "kripa"], [/^Abhimanyu$/, "abhimanyu"], [/Ashwatthama/, "ashwatthama"]];
  function lookFor(u, B) {
    const S = K.S, D = { lookOf: U.lookOf3d };
    if (u.side === "player") { const s = Object.assign({}, K.puppetSpec(S)); if (B.enc.dream) s.stage = "adult"; return s; }
    if (u.person === "bhima" && B.enc.id === "e_kings") return D.lookOf("bhima_brahmin"); /* (at the swayamvara the brothers are still brahmins in deer-skins) */
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
    if (!look && u.line && parseInt(String(u.uid).slice(1), 10) % 3) { look = G.EXTRAS.footman; plain = true; } // most of the line are foot soldiers in turbans; some wear the helmet and cuirass
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
  // Each hero's own standard, steeds and car, as the epic names them (docs/Costume_Audit.md has the passages).
  // [field, device colour, device]
  const STANDARD = {
    arjuna: ["#e9c76a", "#5a2a14", "ape"],            // "the ape of fierce face"
    bhishma: ["#f4efe2", "#b8862c", "palm"],          // a white banner; "palmyra-standard decked with five stars"
    karna: ["#7a1f2a", "#f2c14a", "girth"],           // "an elephant-rope made of gold"
    drona: ["#e2b55a", "#2a1a12", "pot"],             // "a golden altar decked with a water-pot", a black deer-skin
    abhimanyu: ["#2d5aa0", "#f2c14a", "peacock"],     // "golden peacock"
    duryodhana: ["#e2b55a", "#7a1f2a", "elephant"],   // "an elephant adorned with gems" on a standard decked with gold
    bhima: ["#2d5aa0", "#e6e6ea", "lion"],            // "gigantic lion in silver"
    jayadratha: ["#3a3a4a", "#e8e8ee", "boar"],       // "a silver boar", with golden chains
    yudhishthira: ["#2a2a5a", "#f2c14a", "moon"],     // "golden moon with planets around it"
    ashwatthama: ["#3a2a3a", "#f2c14a", "liontail"],  // "the lion-tail ... decked with gold"
    kripa: ["#8a5a2a", "#f2ead2", "bull"],            // "an excellent bovine bull"
    nakula: ["#2d5aa0", "#f2c14a", "sarabha"],        // "a Sarabha with its back made of gold"
    sahadeva: ["#2d5aa0", "#e6e6ea", "swan"],         // "silver swan with bells"
    ghatotkacha: ["#1a1a1a", "#c9a24e", "vulture"],   // "a prince of vultures with outstretched wings"
    shalya: ["#6a4a2a", "#f2c14a", "furrow"],         // "an image like the presiding goddess of corn" (the furrow)
    bhurishravas: ["#7a1f2a", "#f2c14a", "stake"],    // "the sign of the sacrificial stake"
    vrishasena: ["#7a1f2a", "#f2c14a", "peacock"]     // "a peacock made of gold"
  };
  // The steeds: [coat, trappings]. (Arjuna's "white horses decked in golden armour"; Bhishma's white; Drona's red; Bhima's
  // dappled; Yudhishthira's ivory; Abhimanyu's tawny; Satyaki's silvery; Dhrishtadyumna's "of the hue of pigeons"; Nakula's
  // Kamboja steeds "decked with the feathers of the green parrot".)
  const STEEDS = { arjuna: [0xf2efe6, 0xd9a53a], bhishma: [0xf2efe6, 0xe8e2d2], drona: [0x9a3a22, 0xd9a53a], bhima: [0x8f8378, 0x2d5aa0], yudhishthira: [0xe9dfc6, 0x2a2a5a], abhimanyu: [0xb8863c, 0x2d5aa0],
    satyaki: [0xd6d8de, 0x2c4c86], dhrishtadyumna: [0xb9b2b8, 0xb2432a], nakula: [0x4a3626, 0x3f8a3a], sahadeva: [0x9a7a5a, 0x2d5aa0], brihannala: [0xf2efe6, 0xd9a53a] };
  // The white umbrella is held over a king or the leader of a host; the others ride under their standards alone.
  const UMBRELLA = new Set(["bhishma", "duryodhana", "yudhishthira", "karna", "jayadratha", "shalya"]);
  const CAR = { drona: [0xb8862c, 0xf2c14a], ghatotkacha: [0x1c1c20, 0x4a4a52] }; // "a golden car"; "a car made of black iron covered with bear-skins"
  const itemOf = (w) => (w === "fist" || w === "tusk" || w === "fire" ? null : w);
  const READY = { bow: "readyBow", spear: "readySpear", staff: "readySpear", fist: "readyFist", mace: "readyMace" };
  const SQUAD = [[0, 0.3], [-0.66, -0.34], [0.66, -0.34]];
  const EYE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.1" fill="currentColor"/></svg>';
  const VIEWS = ["top", "behind", "eyes"], VIEW_NAME = { top: "From above", behind: "From behind", eyes: "Through your eyes" };

  U.startBattle = function (encId, onEnd) {
    // The 2D game's own screens where there is no 3D (its tests, a browser without WebGL).
    if (!K.ENCOUNTERS[encId] || !U.b3d.on()) return U.startBattle2D(encId, onEnd);
    open(encId, onEnd);
  };

  function open(encId, onEnd) {
    const enc = K.ENCOUNTERS[encId];
    let B = C.start(encId, null), R = R3.begin(B, { assist: U.assist() });
    const views = new Map(), offs = [], shots = new Map(), grounds = new Map();
    let st = null, acc = 0, started = false, closed = false, hitStop = 0, giftKey = null, backMesh = null, lockRing = null, edgeGlow = null, goalMark = null, paused = false, lastLog = 0, zoom = 1, camLook = new T.Vector3(), tipT = 0;
    // Three ways to see a fight: from above (the field laid out), from just behind your fighter, and through their eyes.
    let viewMode = VIEWS.includes(K.prefs().fightView) ? K.prefs().fightView : "top", lookYaw = Math.PI, viewEase = 0, intro = null;
    const threatEls = [];
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
      G.lookHint = (K.S && K.S.act >= 6) || enc.dream || (enc.lethal !== false && B.units.some((u) => u.line || u.plural || (u.g && (u.g.car || u.g.kind === "squad")))) ? "war" : ""; /* (who wears what: on a field where companies meet, everyone is in what he fights in; in a yard or a hall, his everyday dress. js/g3/model.js) */
      st = G.setStage(key, { clear: 15 });
      buildEdge(key);
      backdrop(key);
      lockRing = new T.Mesh(new T.RingGeometry(0.62, 0.74, 30).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
      lockRing.position.y = 0.06; lockRing.visible = false; lockRing.renderOrder = 3; G.fxRoot.add(lockRing);
      if (R.goal) { goalMark = G.fx.mark("ring", { r: R.goal.r, col: 0x7fe08a }); goalMark.position.set(R.goal.x, 0.05, R.goal.z); goalMark.userData.set(1, false, false); st.flame(R.goal.x, 0, R.goal.z, 0.9, true); }
      if (/night|cave|fire/.test(st.sky)) st.amb("embers", { r: R.rad, rate: 3 }); else st.amb("dust", { r: R.rad + 4, rate: 2 });
      sync();
      buildFar();
      camera(0, true);
    }
    // ---------- The battle beyond the ring ----------
    // The edge of the field. It was a ring of dark bars lying on the ground. Now it is what would be there: on a war
    // field, ground churned to dust and the wreck of the fighting (arrows standing in the earth, dropped shields, broken
    // wheels, a spear left planted) under the standards of the two hosts; in a yard or a hall, the wrestlers' ring, a low
    // bank of earth with a limed line inside it, posts and a rope; in the open, stones, tufts and fallen wood. The line
    // you cannot cross shows itself only when you come close to it: a curve of light on the ground in front of you.
    const GIFT_MARK = { bala: "✊︎", kavacha: "⛨︎", charm_shield: "◈", foresight: "◉", healing_hands: "✚︎", sanjivani: "❦", antardhana: "◌", agneya: "✺", varuna: "≈", vayavya: "➶", sammohana: "☾︎", nagapasha: "§", indra: "✧" };
    // A field event or a fight's scripted beat is said in its line and also happens on the field, beyond the fighting or
    // across it, for a few seconds (the 2D game draws these over its painting; here they are in the world). The kind is read
    // from the line's words by the 2D game's own reader, so every event has one.
    function fieldEvent(key) {
      if (!U.fieldKind || closed) return;
      const s0 = Array.isArray(key) ? String(key[0]) : String(key || ""), kind = U.fieldKind(s0), mine = /behind your line|your line|your name|your side|behind you/i.test(s0);
      const rad = R.rad, F = G.fx, V3 = T.Vector3, dirX = mine ? 1 : -1, rs = (a) => (Math.random() - 0.5) * 2 * a, secs = 2.8;
      const ride = (obj, y, tick) => { obj.traverse((m) => { if (m.isMesh) m.castShadow = true; }); obj.rotation.y = dirX > 0 ? Math.PI / 2 : -Math.PI / 2; G.actors.add(obj); let t = 0; const z = -rad - 3.5, x0 = -dirX * (rad + 9), x1 = dirX * (rad + 9);
        F.run((dt, cut) => { t += dt; const k = t / (secs + 0.6); obj.position.set(x0 + (x1 - x0) * k, y, z); if (tick) tick(t, (x1 - x0) * k); if (Math.random() < dt * 14) F.burst("dust", obj.position.clone().setY(0.1), { n: 2 }); if (k >= 1 || cut) { G.actors.remove(obj); G.dispose(obj); return true; } return false; }); };
      if (kind === "horse") { for (let i = 0; i < 3; i++) { const h = G.horse([0x6a4a2a, 0x3a2a1c, 0xd8d0c0][i], 0xa3302a); h.position.z = i * 1.6; const g = new T.Group(); g.add(h); setTimeout(() => { if (!closed) ride(g, 0, (t) => G.gallop(h, t * 12 + i, 1)); }, i * 160); } sfx("drum"); }
      else if (kind === "chariot") { const c = G.chariot({ col: G.shade(mine ? "#2d5aa0" : "#a3302a", 0.82), trim: 0xe2b55a, flag: [mine ? "#2d5aa0" : "#a3302a", "#f2ead2", "sun"], horses: 2 }); ride(c, 0, (t, d) => G.roll(c, d, t, 1)); sfx("drum"); }
      else if (kind === "elephant") { const el = G.elephant(mine ? 0x2d5aa0 : 0xa3302a); ride(el, 0, (t) => { G.stomp(el, t * 5, 1); if (Math.floor(t * 2.5) !== Math.floor((t - 0.016) * 2.5)) G.shake(0.18, 0.2); }); sfx("gong"); }
      else if (kind === "arrows") { for (let i = 0; i < 16; i++) setTimeout(() => { if (closed) return; const to = new V3(rs(rad * 0.9), 0.05, -rad * 0.2 - Math.random() * rad * 0.9), from = new V3(to.x - dirX * (14 + Math.random() * 6), 15 + Math.random() * 4, to.z - 6); F.arrow(from, to, 0.75, 3, () => F.burst("dust", to, { n: 2 })); }, i * 70); sfx("tap"); }
      else if (kind === "fire" || kind === "glow") { F.flash(kind === "glow" ? "rgba(255,236,170,.4)" : "rgba(255,140,50,.22)", 900); for (let i = 0; i < 9; i++) setTimeout(() => { if (closed) return; const at = new V3(-dirX * rad * 0.9 + dirX * i * rad * 0.22 + rs(0.8), 0.1, -rad - 1.5 + rs(1.2)); if (kind === "glow") F.burst("light", at.clone().setY(3 + Math.random() * 3), { n: 14, col: 0xfff0a0 }); else F.fall(at, 0xff7a2a, 0.3, "fire", () => { F.burst("ember", at, { n: 12, s: 1.6 }); F.burst("smoke", at, { n: 3 }); }); }, i * 130); sfx("gong"); }
      else if (kind === "dark") { F.flash("rgba(4,6,22,.6)", 2800); }
      else if (kind === "wind") { let t = 0; F.run((dt, cut) => { t += dt; for (let i = 0; i < 6; i++) F.haze(-dirX * (rad + 4) + dirX * (t / secs) * (rad * 2 + 8) + rs(3), 0.3 + Math.random() * 3.2, rs(rad), dirX * 9, 0.4, rs(1), 0xd8c8a0, 0.3, 1.2 + Math.random(), 0.7, 0, 1.4, 0.6); return t > secs || cut; }); }
      else if (kind === "serpent") { let t = 0; F.run((dt, cut) => { t += dt; const k = t / secs, x = -dirX * (rad + 8) + dirX * k * (rad * 2 + 16); for (let i = 0; i < 4; i++) F.glow(x - dirX * i * 0.5, 9 + Math.sin(k * 14 + i * 0.3) * 1.6, -rad - 4, 0, 0, 0, i ? 0x6ae08a : 0xe8ffd0, 0.9, 0.5, 0.9, 0, -0.3, 0); return k > 1 || cut; }); sfx("gong"); }
      else if (kind === "giant") { F.flash("rgba(10,6,20,.5)", 2400); let t = 0; F.run((dt, cut) => { t += dt; for (const sx of [-1, 1]) if (Math.random() < dt * 30) F.glow(sx * 1.3 + rs(0.1), 13 + rs(0.1), -rad - 9, 0, 0, 0, 0xff5a20, 0.95, 0.9, 0.25, 0, 0, 0); if (Math.random() < dt * 8) F.haze(rs(5), 4 + Math.random() * 9, -rad - 9, 0, 0.4, 0, 0x140a14, 0.5, 4, 1.2, 0, 1, 0.5); return t > secs || cut; }); sfx("gong"); }
      else if (kind === "banner") { const bn = G.banner(4.6, 0xf2ead2, 0x2f7d55, "palm", 1.4); ride(bn, 0, (t) => G.wave(bn, t * 3)); }
      else if (kind === "conch") { const at = new V3(-dirX * (rad + 2), 0.08, -rad * 0.3); for (let i = 0; i < 4; i++) setTimeout(() => { if (!closed) F.ring(at, 0xfff0c8, 0.5, rad * (0.8 + i * 0.35), 1.1); }, i * 200); sfx("conch"); }
      else if (kind === "water") { let t = 0; F.run((dt, cut) => { t += dt; const k = t / secs, at = new V3(-rad + k * rad * 2, 0.1, rad * 0.75); if (Math.random() < dt * 9) { F.burst("splash", at, { n: 5, s: 0.8 }); F.ring(at, 0x8fd0f8, 0.2, 0.9, 0.5); } return k > 1 || cut; }); }
      else { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + rs(0.2); setTimeout(() => { if (!closed) F.burst("dust", new V3(Math.sin(a) * (rad + 1.5), 0.1, Math.cos(a) * (rad + 1.5)), { n: 6, s: 1.4 }); }, i * 60); } sfx("drum"); }
    }
    // Behind the field, the 2D game's own painting of this place: its sky, its hills and its far hosts, wrapped round the
    // horizon (mirrored, so it has no seam) and fading upward into a sky taken from its colours. The ground and the haze
    // are tinted toward it too, so the field in front and the picture behind are one place. Halls keep their walls.
    function backdrop(key) {
      if (st.indoor || !G.ok || !/^(fight|stage)_/.test(key) || /hall|corridor|court|cellar|table|_top/.test(key)) return; // (only the empty stages: a painting with people in it would put giants on the horizon)
      const src = "art/" + key.replace(/_(tall|wide)$/, "") + ".webp";
      new T.TextureLoader().load(src, (tex) => {
        if (closed) { tex.dispose(); return; }
        const CROP = 0.56, RAD = 190, REP = 4, img = tex.image, H = (2 * Math.PI * RAD / REP) / ((img.width || 16) / ((img.height || 9) * CROP));
        tex.colorSpace = T.SRGBColorSpace; tex.wrapS = T.MirroredRepeatWrapping; tex.repeat.set(REP, CROP); tex.offset.set(0.5, 1 - CROP); tex.needsUpdate = true;
        // Its colours: the top of its sky, its horizon, the strip of ground just under its horizon, its near ground.
        let top = null, hor = null, strip = null, gnd = null;
        try { const cv = document.createElement("canvas"); cv.width = 16; cv.height = 32; const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0, 16, 32); const px = cx.getImageData(0, 0, 16, 32).data;
          const avg = (y0, y1) => { let r = 0, g = 0, b2 = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < 16; x++) { const i = (y * 16 + x) * 4; r += px[i]; g += px[i + 1]; b2 += px[i + 2]; n++; } return new T.Color().setRGB(r / n / 255, g / n / 255, b2 / n / 255, T.SRGBColorSpace); };
          top = avg(0, 3); hor = avg(11, 14); strip = avg(16, 18); gnd = avg(20, 28); } catch (e) { top = hor = strip = gnd = null; }
        const geo = new T.CylinderGeometry(RAD, RAD, H, 72, 5, true), pos = geo.attributes.position, col = new Float32Array(pos.count * 4);
        for (let i = 0; i < pos.count; i++) { const v = (pos.getY(i) + H / 2) / H; col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = 1; col[i * 4 + 3] = v > 0.72 ? Math.max(0, 1 - (v - 0.72) / 0.28) : 1; }
        geo.setAttribute("color", new T.BufferAttribute(col, 4));
        const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, side: T.BackSide, fog: false, transparent: true, vertexColors: true, depthWrite: false })); m.renderOrder = -5; m.frustumCulled = false;
        const horizon = 0.2; m.userData.y = H / 2 - horizon * H + 1.2; m.position.y = m.userData.y; // (the picture's horizon sits at eye height)
        st.group.add(m); backMesh = m; st.offs.push(() => { tex.dispose(); });
        if (!top || !hor || !strip) return;
        // The join. The picture has its own hills, so the built ones stand down. Under the picture's horizon its ground
        // thins into one plain colour (a band of haze just inside the picture), and the built ground runs out to that
        // same colour and then to nothing, so there is no line where one stops and the other starts.
        for (const f of st.far || []) f.visible = false;
        const hz = new T.CylinderGeometry(RAD - 2, RAD - 2, 1, 48, 3, true), hp = hz.attributes.position, hc = new Float32Array(hp.count * 4), yb = -horizon * H, ys = [-90, yb * 0.55, yb * 0.12, 3.5], al = [1, 1, 0.55, 0];
        for (let i = 0; i < hp.count; i++) { const k = Math.round((0.5 - hp.getY(i)) * 3); hp.setY(i, ys[3 - k]); hc[i * 4] = strip.r; hc[i * 4 + 1] = strip.g; hc[i * 4 + 2] = strip.b; hc[i * 4 + 3] = al[3 - k]; }
        hz.setAttribute("color", new T.BufferAttribute(hc, 4));
        const haze = new T.Mesh(hz, new T.MeshBasicMaterial({ side: T.BackSide, fog: false, transparent: true, vertexColors: true, depthWrite: false })); haze.renderOrder = -4.5; haze.frustumCulled = false; haze.position.y = 1.2; m.add(haze); haze.position.y = 1.2 - m.userData.y;
        // Between the built ground and the painted horizon, two ranges of the distance's own colour: nearer than the
        // picture, so they slide against it as the view turns (open country only: not where the picture is of woods or water).
        if (G.ridges && /war|field|battle|plain|road|camp|village|track|ground|mountain|shiva|path|gate|muster|array/.test(key) && !/lake|river|sea|forest|grove|garden|night_city/.test(key)) {
          const rr = G.rand(G.hash(key) + 11), high = /mountain|shiva|path/.test(key);
          for (const [r, h, k] of [[158, high ? 46 : 20, 0.35], [124, high ? 22 : 9, 0.7]]) { const crest = hor.clone().lerp(strip, k).multiplyScalar(0.84), rg = G.ridges({ r, h, base: -2, col: strip.getHex(), top: crest.getHex(), snow: high && k < 0.5 ? 0xe8ecf2 : null }, rr); rg.position.y = 0; st.group.add(rg); st.offs.push(() => { rg.geometry.dispose(); rg.material.dispose(); }); }
        }
        const gm = st.lastGround;
        if (gm && gm.position.y > -1 && gm.geometry.attributes.color && gm.material && !Array.isArray(gm.material)) {
          const P = gm.geometry.attributes.position, C = gm.geometry.attributes.color, n = P.count, out = new Float32Array(n * 4), half = (gm.geometry.parameters && gm.geometry.parameters.width || 160) / 2;
          let ar = 0, ag = 0, ab = 0; for (let i = 0; i < n; i++) { ar += C.getX(i); ag += C.getY(i); ab += C.getZ(i); } ar /= n; ag /= n; ab /= n;
          const cl = (x) => Math.max(0.72, Math.min(1.25, x)), tr = cl(gnd.r / Math.max(0.05, ar)), tg = cl(gnd.g / Math.max(0.05, ag)), tb = cl(gnd.b / Math.max(0.05, ab)), r0 = Math.min(R.rad + 10, half * 0.4), r1 = half * 0.7, r2 = half * 0.93, ss = (a, b2, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b2 - a))); return k * k * (3 - 2 * k); };
          for (let i = 0; i < n; i++) { const r = Math.hypot(P.getX(i), P.getZ(i)), k = ss(r0, r1, r), near = 0.6;
            const cr = C.getX(i) * (1 + (tr - 1) * near), cg = C.getY(i) * (1 + (tg - 1) * near), cb = C.getZ(i) * (1 + (tb - 1) * near);
            out[i * 4] = cr + (strip.r - cr) * k; out[i * 4 + 1] = cg + (strip.g - cg) * k; out[i * 4 + 2] = cb + (strip.b - cb) * k; out[i * 4 + 3] = 1 - ss(r1, r2, r); }
          gm.geometry.setAttribute("color", new T.BufferAttribute(out, 4)); gm.material.transparent = true; gm.material.color.set(0xffffff); gm.material.needsUpdate = true; gm.renderOrder = -4;
        }
        // The light is the picture's light: the sun takes the colour of its horizon, the sky-light its sky, the bounce its ground.
        const base = G.SKIES[st.sky] || G.SKIES.gold, mix = (hex, c, k) => new T.Color(hex).lerp(c, k).getHex(), fog = hor.clone().lerp(strip, 0.5);
        G.setSky(st.sky, { top: top.getHex(), hor: hor.getHex(), bot: strip.getHex(), fog: fog.getHex(), fd: Math.max(base.fd || 0, 0.0075), cloud: hor.clone().lerp(new T.Color(0xffffff), 0.5).getHex(), glow: 0,
          sun: mix(base.sun, hor.clone().lerp(new T.Color(0xffffff), 0.35), 0.5), hs: mix(base.hs, top, 0.5), hg: mix(base.hg, gnd, 0.6) });
      }, undefined, () => {});
    }
    U.fieldEvent3d = fieldEvent; // (so a check can ask for each kind)
    function buildEdge(key) {
      const rad = R.rad, rnd = G.rand(G.hash(enc.id) + 3), b = new G.Builder(), PI = Math.PI, night = /night|cave|fire/.test(st.sky || "");
      // What rings the field belongs to the place (js/g3/sets.js names its kind): a painted line and lamps in a hall, a bank
      // and a roped fence round a yard, the litter and standards of war with the ranks standing off, a wattle fence in a
      // village, stones, brush and grass in wild country.
      const SK = st.kind, indoor = !!st.indoor || SK === "hall" || SK === "room" || SK === "lac";
      const kind = indoor ? "hall" : SK === "field" || SK === "camp" || /war|battlefield|chakravyuha|vyuha|array|muster/.test(key) ? "war" : SK === "yard" || SK === "city" ? "yard" : SK === "village" ? "village" : "wild", Q = G.q.crowd || 1;
      // The worn band: darkest at the edge itself, fading inward and outward.
      { const geo = new T.RingGeometry(rad - 2.2, rad + 2.4, 72, 4).rotateX(-PI / 2), pos = geo.attributes.position, col = new Float32Array(pos.count * 4), c = new T.Color(kind === "wild" ? 0x4a3c20 : 0x33230f);
        for (let i = 0; i < pos.count; i++) { const r = Math.hypot(pos.getX(i), pos.getZ(i)), d = Math.abs(r - (rad + 0.3)) / 2.3, a = Math.max(0, 1 - d * d) * (kind === "yard" ? 0.24 : 0.32); col[i * 4] = c.r; col[i * 4 + 1] = c.g; col[i * 4 + 2] = c.b; col[i * 4 + 3] = a; }
        geo.setAttribute("color", new T.BufferAttribute(col, 4));
        const m = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false })); m.position.y = 0.03; m.renderOrder = 1; st.group.add(m); }
      const at = (a, r) => [Math.sin(a) * r, Math.cos(a) * r];
      const watchers = (n, r0, r1, cols, geo) => { const sp = []; for (let i = 0; i < Math.round(n * Q); i++) { const a = rnd() * PI * 2, [x, z] = at(a, r0 + rnd() * (r1 - r0)); sp.push([x, z, a + PI + (rnd() - 0.5) * 0.5, 1]); } if (sp.length) st.group.add(G.crowd(sp, cols, geo || "stand", rnd)); };
      if (kind === "hall") {
        b.geo(new T.RingGeometry(rad + 0.3, rad + 0.42, 72).rotateX(-PI / 2), 0, 0.035, 0, 0, 0, 0, 0xb08a3a);                                             // a line of gold paint on the floor, a red one outside it
        b.geo(new T.RingGeometry(rad + 0.5, rad + 0.56, 72).rotateX(-PI / 2), 0, 0.035, 0, 0, 0, 0, 0x7a1c22);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + 0.39, [x, z] = at(a, rad + 1.1); if (z > rad * 0.62 || Math.abs(x) > 8.4) continue; const y = G.lampStand(b, x, z, 1.25); if (st.flame) st.flame(x, y, z, 0.3, false); }
      } else if (kind === "yard") {
        b.geo(new T.TorusGeometry(rad + 1.0, 0.22, 6, 56).rotateX(PI / 2).scale(1, 0.5, 1), 0, 0.02, 0, 0, 0, 0, 0x8a6a44, 0xa88458);                      // the bank of earth
        b.geo(new T.RingGeometry(rad + 0.32, rad + 0.41, 72).rotateX(-PI / 2), 0, 0.035, 0, 0, 0, 0, 0xdccfb2);                                            // the limed line, trodden
        if (!(st.o && st.o.arena)) watchers(14, rad + 7.2, rad + 9, [0xe8dcc0, 0xc9a66a, 0xb2432a, 0x8a6a4a]);                                             // (an arena has its own tiers of people)
        const n = 14; for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2 + 0.22, [x, z] = at(a, rad + 1.0); if (z > rad * 0.62) continue;           // (none across the near side, where you look in)
          b.cyl(0.06, 0.075, 1.15, x, 0.05, z, 0x5a3a1e, 8); b.sph(0.08, x, 1.22, z, i % 2 ? 0xa3302a : 0xd9a53a, 1, 8);
          const a2 = ((i + 1) / n) * PI * 2 + 0.22, [x2, z2] = at(a2, rad + 1.0); if (z2 <= rad * 0.62) { const mx = (x + x2) / 2 * 0.995, mz = (z + z2) / 2 * 0.995; b.rod(x, 1.0, z, mx, 0.86, mz, 0.018, 0xc8b088, 5); b.rod(mx, 0.86, mz, x2, 1.0, z2, 0.018, 0xc8b088, 5); } // a rope, sagging
          if ((night || st.indoor) && i % 2 === 0 && st.flame) st.flame(x, 1.3, z, 0.35, true); }
      } else if (kind === "war") {
        if (SK === "field" || !SK) { // the two hosts stand off round the field, yours to the left; where they stood the ground is cut by wheels
          const red = [0xa3302a, 0x8a2a24, 0xb2432a], blue = [0x2d5aa0, 0x27467e, 0x3b6fb0], mineC = K.S.side === "kaurava" ? red : blue, theirC = K.S.side === "kaurava" ? blue : red, sp = [[], []];
          for (let row = 0; row < 3; row++) { const r = rad + 9.2 + row * 1.2, n = Math.round(r * 1.7 * Q); for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2 + row * 0.05, [x, z] = at(a, r + (rnd() - 0.5) * 0.3); if (Math.abs(x) < 2.2) continue; sp[x < 0 ? 0 : 1].push([x, z, a + PI + (rnd() - 0.5) * 0.25, 1]); } }
          if (sp[0].length) st.group.add(G.crowd(sp[0], mineC, "soldier", rnd)); if (sp[1].length) st.group.add(G.crowd(sp[1], theirC, "soldier", rnd));
          for (const sx of [-1, 1]) if (G.wreck) G.wreck(b, sx * (rad + 4.2), -rad * 0.55 - rnd() * 3, rnd);
          for (let i = 0; i < 3; i++) { const ry = rnd() * PI, off = (rnd() - 0.5) * rad; for (const d of [-0.75, 0.75]) { const m = new T.Mesh(new T.PlaneGeometry(0.2, rad * 2.6).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: 0x2e2010, transparent: true, opacity: 0.2, depthWrite: false })); m.rotation.y = ry; m.position.set(Math.cos(ry) * (off + d), 0.024, -Math.sin(ry) * (off + d)); m.renderOrder = 1; st.group.add(m); } }
        }
        const n = 30; for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2 + rnd() * 0.16, [x, z] = at(a, rad + 0.7 + rnd() * 2.0), k = Math.floor(rnd() * 7);
          if (z > rad * 0.8 && k !== 0) continue;
          if (k <= 1) G.arrowsStuck(b, x, z, 2 + Math.floor(rnd() * 4), 0.7, rnd);
          else if (k === 2) { const ry = rnd() * 6.28; b.geo(new T.CylinderGeometry(0.4, 0.4, 0.05, 12), x, 0.07, z, 0.18 + rnd() * 0.3, ry, 0, i % 2 ? 0x2d5aa0 : 0xa3302a); b.geo(new T.CylinderGeometry(0.1, 0.1, 0.07, 8), x, 0.1, z, 0.18, ry, 0, 0xd9a53a); } // a shield, dropped
          else if (k === 3) { const lean = 0.25 + rnd() * 0.5, ry = rnd() * 6.28, h = 1.7; b.rod(x, 0, z, x + Math.sin(ry) * Math.sin(lean) * h, Math.cos(lean) * h, z + Math.cos(ry) * Math.sin(lean) * h, 0.022, 0x4a3018, 5); }                                              // a spear left standing
          else if (k === 4) { b.geo(new T.TorusGeometry(0.5, 0.05, 5, 12), x, 0.12, z, PI / 2 - 0.25 - rnd() * 0.3, rnd() * 6.28, 0, 0x5a3c20); b.geo(new T.CylinderGeometry(0.09, 0.09, 0.12, 6), x, 0.14, z, 0, 0, 0, 0x4a3018); }                                           // a wheel off its car
          else if (k === 5 && i % 4 === 1 && G.wreck) G.wreck(b, x * 1.12, z * 1.12, rnd);
          else G.rock(b, x, z, 0.22 + rnd() * 0.3, rnd, 0x7a6a54); }
        for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2 + 0.3, [x, z] = at(a, rad + 1.3); if (z > rad * 0.5) continue; const mine = x < 0, colr = mine ? 0x2d5aa0 : 0xa3302a; // the hosts' standards, yours to the left
          b.rod(x, 0, z, x, 3.1, z, 0.035, 0x3a2414, 6); b.sph(0.06, x, 3.14, z, 0xd9a53a, 1.4, 6); b.box(0.74, 0.44, 0.02, x + 0.39, 2.55, z, colr); b.box(0.74, 0.07, 0.024, x + 0.39, 2.5, z, 0xd9a53a); b.geo(new T.ConeGeometry(0.22, 0.36, 3).rotateZ(-PI / 2), x + 0.92, 2.77, z, 0, 0, 0, colr); }
      } else if (kind === "village") { // a wattle fence with two ways through it, pots and a rick by it, the neighbours looking on
        const n = 64; for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2, [x, z] = at(a, rad + 0.9); if (z > rad * 0.7 || i % 16 === 7 || i % 16 === 8) continue;
          b.cyl(0.035, 0.045, 0.95 + (i % 3) * 0.05, x, 0, z, 0x6a4a2a, 5); const [x2, z2] = at(((i + 1) / n) * PI * 2, rad + 0.9); if ((i + 1) % 16 !== 7 && z2 <= rad * 0.7) for (const y of [0.3, 0.55, 0.8]) b.rod(x, y, z, x2, y + ((i + (y > 0.5 ? 1 : 0)) % 2 ? 0.05 : -0.05), z2, 0.022, 0x8a6a40, 4); }
        for (let i = 0; i < 6; i++) { const a = -2.4 + i * 0.95 + rnd() * 0.3, [x, z] = at(a + PI, rad + 1.9 + rnd()); if (i % 3 === 2) { b.cone(0.8, 1.5, x, 0, z, 0xc9a85a, 8, 0, 0, 0, 0xe0c878); } else G.pot(b, x, z, 0.9 + rnd() * 0.5, i % 2 ? 0xa8562e : 0x8a4a2a); }
        for (let i = 0; i < 14; i++) { const a = rnd() * PI * 2, [x, z] = at(a, rad * (0.55 + rnd() * 0.6)); G.tuft(b, x, z, 0.9 + rnd() * 0.5, rnd, 0x8a9648); }
        watchers(12, rad + 7.2, rad + 9, [0xe8dcc0, 0xc9a66a, 0xa8562e, 0x8a6a4a, 0x6f8a3a]);
      } else {
        const low = SK === "mountain" ? ["rock", "bush"] : ["bush", "bush", "rock"], grass = SK === "mountain" ? 0x8a8a5a : SK === "river" ? 0x6f9a48 : 0x7a8a42;
        for (let i = 0; i < 16; i++) { const a = rnd() * PI * 2, [x, z] = at(a, rad + 1.6 + rnd() * 2.2); if (z > rad * 0.7) continue; const k = low[Math.floor(rnd() * low.length)]; if (k === "rock") G.rock(b, x, z, 0.4 + rnd() * 0.5, rnd, SK === "mountain" ? 0x8f8a84 : 0x8a8478); else G.tree(b, x, z, "bush", 0.55 + rnd() * 0.35, rnd); }
        for (let i = 0; i < 40; i++) { const a = rnd() * PI * 2, [x, z] = at(a, rad * (0.35 + rnd() * 0.95)); G.tuft(b, x, z, 0.8 + rnd() * 0.7, rnd, grass); }   // grass, thin in the middle where feet have been
        const n = 34; for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2 + rnd() * 0.14, [x, z] = at(a, rad + 0.5 + rnd() * 1.5), k = Math.floor(rnd() * 6);
          if (z > rad * 0.85 && k > 1) continue;
          if (k <= 1) G.rock(b, x, z, 0.25 + rnd() * 0.5, rnd, 0x8a8478);
          else if (k <= 3) G.reeds(b, x, z, 5 + Math.floor(rnd() * 5), rnd, 0x6f8a3a);
          else if (k === 4) { const ry = a + PI / 2 + (rnd() - 0.5), l = 0.8 + rnd() * 0.9; b.rod(x - Math.sin(ry) * l, 0.13, z - Math.cos(ry) * l, x + Math.sin(ry) * l, 0.15, z + Math.cos(ry) * l, 0.13, 0x5a4026, 7); b.rod(x, 0.2, z, x + rnd() * 0.3, 0.55, z + 0.2, 0.035, 0x5a4026, 5); } // a fallen bough
          else { G.rock(b, x, z, 0.18, rnd, 0x8a8478); G.reeds(b, x + 0.3, z + 0.1, 4, rnd, 0x7a9442); } }
      }
      const m = b.mesh(); m.castShadow = true; m.receiveShadow = true; st.group.add(m);
      edgeGlow = new T.Mesh(new T.RingGeometry(rad + 0.12, rad + 0.5, 28, 1, -0.34, 0.68).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false, fog: false })); edgeGlow.position.y = 0.055; edgeGlow.renderOrder = 3; G.fxRoot.add(edgeGlow);
    }
    // Where a line fights inside the field, the hosts behind it are fighting too: a few pairs at the ranks' edge trade
    // blows (no rules, only the look of it), and flights of arrows go over from one host to the other.
    const far = { pairs: [], arrows: [], next: 2.5, dir: 1 };
    function buildFar() {
      if (!R.line || !st || st.indoor) return;
      const q = G.q.crowd || 1, n = q >= 0.9 ? 5 : q >= 0.5 ? 3 : 0, rnd = G.rand(G.hash(enc.id) + 7), rad = R.rad;
      const mine = K.S.side === "kaurava" ? RED : BLUE, theirs = mine === RED ? BLUE : RED, base = U.lookOf3d("soldier");
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (((i + 0.2 + rnd() * 0.6) / n) * 2 - 1) * 1.75, r = rad + 2.8 + rnd() * 3.2, x = Math.sin(a) * r, z = Math.cos(a) * r, ry = rnd() * 6.28;
        const two = [mine, theirs].map((col, k) => {
          const w = rnd() < 0.5 ? "sword" : "spear", f = G.figure(Object.assign({}, base, { palette: [base.palette[0], col, base.palette[2]] }), { item: w, lite: true }); // (far off: a plainer figure)
          f.setShield(true); f.place(x + Math.sin(ry) * (k ? 0.85 : -0.85), z + Math.cos(ry) * (k ? 0.85 : -0.85), ry + (k ? Math.PI : 0)); f.pose(w === "spear" ? "readySpear" : "ready", true); f.w = w;
          G.actors.add(f.root); return f;
        });
        far.pairs.push({ f: two, t: 0.6 + rnd() * 2, turn: i % 2 });
      }
      for (let i = 0; i < (q >= 0.5 ? 12 : 7); i++) { const m = G.arrowMesh(1.1); m.visible = false; G.fxRoot.add(m); far.arrows.push({ m, t: 9, dur: 1 }); }
    }
    function farFrame(dt, t) {
      for (const p of far.pairs) {
        p.t -= dt;
        if (p.t <= 0) { // one strikes, the other meets it or takes it
          const a = p.f[p.turn], b = p.f[1 - p.turn], act = a.w === "spear" ? "thrust" : Math.random() < 0.3 ? "heavy" : Math.random() < 0.5 ? "slash2" : "slash", dur = 0.85 + Math.random() * 0.3;
          a.act(act, dur); const land = G.ACTS[act].land * dur, met = Math.random() < 0.6;
          setTimeout(() => { if (closed || !b.root.parent) return; b.act(met ? "parry" : "hit", met ? 0.35 : 0.45); if (met && Math.random() < 0.5) G.fx.burst("spark", b.root.position.clone().setY(1.3), { n: 5, s: 0.8 }); }, Math.max(0, land - (met ? 0.1 : 0)) * 1000);
          p.turn = Math.random() < 0.75 ? 1 - p.turn : p.turn; p.t = dur + 0.5 + Math.random() * 1.3;
        }
        for (const f of p.f) f.update(dt, t);
      }
      if (!far.arrows.length) return;
      far.next -= dt;
      if (far.next <= 0 && started && !R.over) { // a flight from one host over to the other
        far.next = 5 + Math.random() * 6; far.dir = -far.dir; const z0 = -6 - Math.random() * 14;
        for (const a of far.arrows) { if (Math.random() < 0.25) continue; a.t = -Math.random() * 0.5; a.dur = 2.3 + Math.random() * 0.6; a.x0 = far.dir * (R.rad + 22 + Math.random() * 6); a.x1 = -far.dir * (R.rad + 18 + Math.random() * 8); a.z0 = z0 + (Math.random() - 0.5) * 9; a.z1 = a.z0 + (Math.random() - 0.5) * 8; a.h = 13 + Math.random() * 6; }
      }
      for (const a of far.arrows) {
        if (a.t >= a.dur) { if (a.m.visible) a.m.visible = false; continue; }
        a.t += dt; if (a.t < 0) continue;
        const k = Math.min(1, a.t / a.dur), dx = a.x1 - a.x0, dz = a.z1 - a.z0, vy = 4 * a.h * (1 - 2 * k);
        a.m.visible = true; a.m.position.set(a.x0 + dx * k, 2.2 + 4 * a.h * k * (1 - k), a.z0 + dz * k);
        a.m.rotation.set(-Math.atan2(vy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0, "YXZ");
      }
    }
    function makeView(u) {
      const g = u.g, v = { u, kind: g.kind, figs: [], obj: null, bar: null, mark: null, atkRef: null, dead: false, bodies: g.kind === "squad" ? 3 : 1, hp: u.hp, shown: 0 };
      if (g.kind === "elephant") { v.obj = G.elephant(/Kaurava/.test(u.name) ? 0xa3302a : 0x2d5aa0); v.obj.traverse((m) => { if (m.isMesh) m.castShadow = true; }); G.actors.add(v.obj); }
      else if (g.kind === "cart") { const b = new G.Builder(); G.cartStatic(b, 0, 0, 0, true); v.obj = b.mesh(); v.obj.castShadow = true; G.actors.add(v.obj); }
      else if (g.kind === "light") { v.obj = new T.Sprite(new T.SpriteMaterial({ map: G.tex("glow"), color: 0xfff0c0, blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); v.obj.scale.set(7, 7, 1); G.fxRoot.add(v.obj); }
      else {
        const look = lookFor(u, B), n = v.bodies;
        if (g.car) { // a chariot: the archer on its deck, a driver at the rail, the hero's own standard behind
          const theirs = u.side === "enemy" ? (K.S.side === "kaurava" ? BLUE : RED) : K.S.side === "kaurava" ? RED : BLUE, who = u.person || (/Brihannala/.test(String(u.src || u.name)) ? "brihannala" : null), flag = STANDARD[who === "brihannala" ? "arjuna" : who] || [theirs, "#f2ead2", theirs === RED ? "sun" : "moon"];
          const steeds = STEEDS[who], car = CAR[who], great = !!(u.hero || u.person || who);
          v.car = G.chariot({ col: car ? car[0] : G.shade(theirs, great ? 0.82 : 0.66) /* (panelled in his host's colour) */, trim: car ? car[1] : great ? 0xe2b55a : 0xb8873a, flag, canopy: UMBRELLA.has(who) ? 0xf4f0e6 : null, horseCol: steeds ? steeds[0] : undefined, tack: steeds ? steeds[1] : undefined, horses: great && (G.q.crowd || 1) >= 0.5 ? 4 : 2 });
          v.car.traverse((m) => { if (m.isMesh) m.castShadow = true; }); G.actors.add(v.car);
          v.driver = G.figure(u.person === "arjuna" ? D3("krishna") : Object.assign({}, G.EXTRAS.rider, { item: "whip", headgear: "turban", hat: u.side === "enemy" ? "#8a2a24" : "#2c4c86", gear: ["bands"], whiskers: "stache", face: "long" }) /* a charioteer: turbaned, bare-chested, the whip in his hand */, { item: "whip", noBlob: true }); // (Krishna drives "whip in hand") v.driver.pose("drive", true); v.car.add(v.driver.root); v.driver.root.position.set(0.25, 0.86, 0.55);
        }
        for (let i = 0; i < n; i++) {
          const f = G.figure(i ? Object.assign({}, look, { size: (look.size || 1) * (0.94 + i * 0.04) }) : look, { item: itemOf(g.weapon), noBlob: !!v.car || !!u.decoy, lite: !!u.line || (!!u.plural && i > 0) }); // (the rank and file are plainer figures: fewer points to draw)
          f.trails = true; // the streak of a weapon through its blow
          const plainMan = !(u.hero || u.person) && u.side !== "player" && !NAMED.some(([re]) => re.test(String(u.src || u.name)));
          if (u.side === "player" ? R.shield && !R.broken : u.line ? g.weapon !== "mace" : u.side === "enemy" ? !!(u.shield || u.shieldDrawn) && g.weapon !== "bow" : false) f.setShield(true, u.line ? undefined : u.side === "enemy" ? 0x6e3026 : undefined, plainMan ? "hide" : undefined);
          f.pose(READY[g.weapon] || "ready", true); f.turnRate = 16;
          if (v.car) { v.car.add(f.root); f.root.position.set(-0.2, 0.86, -0.3); } else G.actors.add(f.root);
          v.figs.push(f);
        }
        // A hero who fights on foot has left his car at the field's edge: it waits there under his standard, with his steeds.
        const hero = u.person;
        if (!g.car && hero && u.side !== "player" && (STANDARD[hero] || STEEDS[hero]) && st && !st.indoor && (R.line || K.S.act >= 6)) {
          const steeds = STEEDS[hero], car = CAR[hero], side = u.side === "enemy" ? (K.S.side === "kaurava" ? BLUE : RED) : K.S.side === "kaurava" ? RED : BLUE;
          v.parked = G.chariot({ col: car ? car[0] : G.shade(side, 0.82), trim: car ? car[1] : 0xe2b55a, flag: STANDARD[hero] || [side, "#f2ead2", side === RED ? "sun" : "moon"], canopy: UMBRELLA.has(hero) ? 0xf4f0e6 : null, horseCol: steeds ? steeds[0] : undefined, tack: steeds ? steeds[1] : undefined, horses: (G.q.crowd || 1) >= 0.5 ? 4 : 2 });
          const a = Math.atan2(g.x, g.z) + (u.side === "ally" ? 0.55 : -0.4), r = R.rad + 3.6;
          v.parked.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); v.parked.rotation.y = a + Math.PI; v.parked.traverse((m) => { if (m.isMesh) m.castShadow = true; }); G.actors.add(v.parked);
        }
      }
      if (u.side !== "player") {
        v.bar = U.el('<div class="ubar ' + (u.side === "enemy" ? "foe" : "ally") + (u.hero || u.person ? " hero" : "") + (u.line ? " line" : "") + '"><span></span><i></i></div>');
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
      const gone = () => { for (const f of v.figs) f.dispose(); if (v.driver) v.driver.dispose(); if (v.parked) { if (v.parked.parent) v.parked.parent.remove(v.parked); G.dispose(v.parked); } if (v.car) { if (v.car.parent) v.car.parent.remove(v.car); G.dispose(v.car); } if (v.obj) { if (v.obj.parent) v.obj.parent.remove(v.obj); G.dispose(v.obj); } };
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
        if (v.over) pose = v.over;
        else if (u.side === "player") {
          f.spin = R.roll > 0 && !R.dash ? Math.PI * 2 * (1 - R.roll / R3.P.roll) : 0;
          if (R.roll > 0) { f.face = Math.atan2(R.rdx, R.rdz); f.root.rotation.y = f.face; } // the tumble goes the way you roll
          if (intro) pose = "proud"; else if (R.roll > 0 && !R.dash) pose = "roll"; else if (R.block) pose = "block"; else if (R.kneel > 0) pose = "herbs"; else if (R.kneelPose > 0) pose = "kneel"; else if (R.frozen > 0) pose = "cast";
          f.root.visible = !(R.unseen > 0 && Math.floor(t * 14) % 2 === 0);
        } else {
          if (g.beaten) pose = "plead"; else if (g.stag > 0) pose = "stagger"; else if (u.status.stun || u.status.asleep || u.status.bound) pose = u.status.asleep ? "slump" : "freeze";
          f.drop(g.down > 0);
          // (a close camera does not look through the back of someone's head)
          if (!v.car) f.root.visible = viewMode === "top" || !!intro || Math.hypot(f.root.position.x - G.cam.pos.x, f.root.position.z - G.cam.pos.z) > (viewMode === "eyes" && started ? 0.5 : 2.2);
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
          const pl = C.player(), near = !u.line || !a || !pl || a.on === pl.uid || Math.hypot(u.g.x - pl.g.x, u.g.z - pl.g.z) < 4.2;
          const m = a && near ? R3.markOf(R, u) : null;
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
          case "enter": if (!v || !v.u.line) sfx("drumCall"); break;
          case "beaten": { const at = posOf(e.uid, 2); if (at) float(at, U.tr("Mercy!"), "note"); if (!tips.spare) tip("spare", "A beaten foe kneels. Step close and Spare him, or strike him down."); break; }
          case "spared": toast(U.tr("Spared. The fight goes on."), "good"); if (v) { for (const x of v.figs) x.pose("namaste"); dropView(v); } break;
          case "feint": { const at = posOf(e.uid, 2); if (at) float(at, U.tr("Feint!"), "note"); break; }
          case "brace": { const at = posOf(e.uid, 1.2); if (at) G.fx.ring(at.setY(0.1), 0xa0c0ff, 0.3, 1.2, 0.4); break; }
          case "dot": { const at = posOf(e.uid, 1.4); if (at) { float(at, String(e.n), v.u.side === "enemy" ? "foe" : "mine"); G.fx.burst(e.s === "burn" ? "ember" : "hit", at, { n: 5 }); } break; }
          case "leave": if (v) { G.fx.burst("dust", posOf(e.uid, 0.5), { n: 14, s: 2 }); dropView(v, "now"); } break;
          case "fall": if (v) { if (!v.u.line || Math.hypot(v.u.g.x - p.g.x, v.u.g.z - p.g.z) < 7) sfx(v.u.side === "enemy" ? "fall" : "friendFalls"); if (v.mark) { v.mark.userData.free(); v.mark = null; } if (v.bar) v.bar.classList.add("gone"); if (v.kind === "cart") G.fx.burst("smoke", posOf(e.uid, 0.6), { n: 14, s: 2 }); } break;
          case "event": { const row = B.log[e.at]; if (row) { banner(C.line(row)); sfx("drumCall"); if (!row.shown3d) { row.shown3d = true; fieldEvent(row.key); } } break; }
          case "toast": toast(U.tr(e.s)); break;
          // The champions' traits, your boons and the divine weapons' gifts (the 2D game's Build D): said once, and shown.
          case "trait": if (RT.TRAIT_TIP && RT.TRAIT_TIP[e.who] && !tips["trait_" + e.who]) { tips["trait_" + e.who] = true; toast(U.tr(RT.TRAIT_TIP[e.who]), "tip"); } break;
          case "wheel": { const at = posOf(e.uid, 2.2); if (at) { float(at, U.tr("The wheel sinks!"), "foe big"); G.fx.burst("dust", at.clone().setY(0.2), { n: 18, s: 1.6 }); G.shake(0.25, 0.3); sfx("drum"); } break; }
          case "cry": { const at = posOf(e.uid, 2.1); if (at) { float(at, U.tr("War cry!"), "mine"); for (let i = 0; i < 3; i++) setTimeout(() => { if (!closed) G.fx.ring(at.clone().setY(0.08), 0xffe2a0, 0.4, 7 + i * 2, 0.7); }, i * 140); G.shake(0.2, 0.25); sfx("drumCall"); } break; }
          case "knocked": { const at = posOf(e.uid, 1.9); if (at) float(at, U.tr("Knocked down"), "me"); G.shake(0.3, 0.3); break; }
          case "maya": { const at = posOf(e.uid, 1); if (at) { G.fx.burst("smoke", at, { n: 8 }); G.fx.burst("light", at, { n: 10, col: 0xb090ff }); } sfx("gong"); break; }
          case "vanish": { const v = views.get(e.uid); if (v) { const at = v.figs[0] ? v.figs[0].root.position.clone().setY(1) : null; if (at) { G.fx.burst("smoke", at, { n: 10 }); G.fx.burst("light", at, { n: 8, col: 0xb090ff }); } dropView(v, "now"); } break; }
          case "unseen": { toast(U.tr("Antardhana! Unseen"), "good"); const at = posOf(C.player().uid, 1); if (at) { G.fx.burst("smoke", at, { n: 10 }); G.fx.ring(at.clone().setY(0.06), 0xcfe0ff, 0.3, 2.4, 0.6); } sfx("tap"); break; }
          case "burn": { const uid = e.uid; let n = 0; const iv = setInterval(() => { const at = closed ? null : posOf(uid, 1); if (!at || ++n > 10) { clearInterval(iv); return; } G.fx.burst("ember", at, { n: 6, s: 1.1 }); }, 200); break; }
          case "burnt": { const at = posOf(e.uid, 1.7); if (at) float(at, String(e.n), "foe"); break; }
          case "laydown": if (pf) pf.pose("kneel"); toast(U.tr(K.ABILITIES.lay_down.name)); break;
          case "cover": sfx("tap"); break;
          case "lock": break;
          case "astra": astraFx(e); break;
          case "fires": firesFx(e); break;
          case "scorch": { const at = posOf(e.uid, 0.5); if (at) G.fx.burst("ember", at, { n: 8, s: 1.2 }); break; }
        }
      }
      // A line the fight itself spoke (the engine's log) that no event carried: the story beats.
      for (; lastLog < B.log.length; lastLog++) { const row = B.log[lastLog]; if (row && (row.raw || row.ev) && started && lastLog > 0) { banner(C.line(row)); if (row.ev && !row.shown3d) { row.shown3d = true; fieldEvent(row.key); } } }
    }
    // Each divine weapon comes in its own way. Indra's falls as forked lightning, one man after another, out of a sky gone
    // dark. Fire goes up as one burning arrow and comes down in a line that walks toward them, and stays on the ground.
    // Water crosses the field as a wall. Wind is a pillar of dust that walks through them. Sleep is no blow at all: a
    // hush spreads and they sink. The serpent-noose runs along the ground to each man and winds round him.
    function astraFx(e) {
      const p = C.player(), pv = views.get(p.uid), pf = pv && pv.figs[0]; if (!pf) return;
      const id = ASTRA_FX[e.id] ? e.id : "astra", col = ASTRA_FX[id][0], F = G.fx, V3 = T.Vector3, rs = (a) => (Math.random() - 0.5) * 2 * a;
      const o = pf.root.position.clone(), hit = (e.struck || []).map((uid) => ({ uid, at: posOf(uid, 0.1) })).filter((x) => x.at), bound = (e.held || []).map((uid) => ({ uid, at: posOf(uid, 0.1) })).filter((x) => x.at);
      const ang = e.ang != null ? e.ang : p.g.a, dx = Math.sin(ang), dz = Math.cos(ang), along = (at) => (at.x - o.x) * dx + (at.z - o.z) * dz;
      const later = (ms, fn) => setTimeout(() => { if (!closed) fn(); }, ms);
      const dmg = (x) => { if (e.dealt && e.dealt[x.uid]) float(x.at.clone().setY(1.6), String(Math.round(e.dealt[x.uid])), "foe big"); };
      toast(U.tr(K.astraName ? K.astraName(e.id) : K.ABILITIES[e.id].name), "good");
      F.burst("light", pf.chest(), { n: 24, s: 1.4, col }); F.ring(o, col, 0.4, 2.8, 0.7); // the mantra gathers on the one who speaks it
      if (id === "astra") {
        sfx("gong"); F.flash("rgba(16,20,56,.6)", 1100);
        hit.forEach((x, i) => later(420 + i * 260, () => { F.bolt(x.at.clone().add(new V3(rs(5), 26, rs(5))), x.at, 0xdfe8ff, 0.42); F.flash("rgba(235,240,255,.45)", 150); G.shake(0.4, 0.3);
          F.burst("spark", x.at.clone().setY(0.8), { n: 24, s: 1.6, col: 0xcfe0ff }); F.ring(x.at, 0xcfe0ff, 0.3, 3.2, 0.5); F.burst("smoke", x.at, { n: 4 }); sfx("drum"); dmg(x); }));
      } else if (id === "agneya") {
        sfx("gong"); F.flash("rgba(255,140,50,.32)", 700);
        F.arrow(pf.chest(), o.clone().add(new V3(dx * 4, 22, dz * 4)), 0.42, 0, null); F.beam(pf.chest(), o.clone().add(new V3(dx * 4, 22, dz * 4)), 0xff8a30, 0.07, 0.6);
        const far = Math.max(7, ...hit.map((x) => along(x.at) + 1));
        for (let k = 0; k < 8; k++) later(420 + k * 95, () => { const d = 2 + (k / 7) * (far - 2), at = new V3(o.x + dx * d + rs(1.6), 0.1, o.z + dz * d + rs(1.6)); F.fall(at, 0xff7a2a, 0.26, "fire", () => { F.burst("ember", at, { n: 10, s: 1.4 }); F.burst("smoke", at, { n: 2 }); }); });
        hit.forEach((x, i) => later(620 + Math.max(0, along(x.at)) * 55 + i * 40, () => F.fall(x.at, 0xffb050, 0.3, "fire", () => { G.shake(0.22, 0.25); sfx("drum"); dmg(x); F.burst("ember", x.at.clone().setY(0.6), { n: 26, s: 1.8 }); })));
      } else if (id === "varuna") {
        sfx("gong"); F.flash("rgba(70,150,220,.3)", 900);
        const wide = R.rad * 1.5, span = R.rad * 2 + 6, secs = 1.5, done = new Set();
        const wall = new T.Mesh(new T.CylinderGeometry(wide, wide, 3.4, 20, 1, true, -0.62, 1.24), new T.MeshBasicMaterial({ color: 0x2f86d8, transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide, fog: false }));
        wall.rotation.y = ang; wall.renderOrder = 5; G.fxRoot.add(wall); let t = 0;
        F.run((dt, cut) => {
          t += dt; const k = Math.min(1, t / secs), d = -3 + span * k, cx = o.x + dx * (d - wide), cz = o.z + dz * (d - wide);
          wall.position.set(cx, 1.5 - k * k * 0.9, cz); wall.material.opacity = 0.55 * (1 - k * k); wall.scale.y = 1 - k * 0.45;
          for (let i = 0; i < 9; i++) { const a = ang + rs(0.6), x = cx + Math.sin(a) * wide, z = cz + Math.cos(a) * wide; F.glow(x, 2.2 + Math.random() * 1.2 - k, z, dx * 3 + rs(1), 1.5 + Math.random() * 2, dz * 3 + rs(1), Math.random() < 0.4 ? 0xeaf8ff : 0x8fd0f8, 0.75, 0.14 + Math.random() * 0.16, 0.5 + Math.random() * 0.4, 9, 0, 0.2); if (i < 3) F.glow(x, 0.15, z, rs(0.6), 0.2, rs(0.6), 0x9ad8ff, 0.45, 0.5, 1.2, 0, 1.5, 1); }
          for (const x of hit) if (!done.has(x.uid) && along(x.at) <= d) { done.add(x.uid); F.burst("splash", x.at.clone().setY(0.8), { n: 26, s: 1.8 }); F.ring(x.at, 0x8fd0f8, 0.4, 3, 0.7); G.shake(0.2, 0.2); sfx("drum"); dmg(x); }
          if (k >= 1 || cut) { G.fxRoot.remove(wall); G.dispose(wall); return true; } return false;
        });
      } else if (id === "vayavya") {
        sfx("drum");
        const far = Math.max(8, ...hit.map((x) => along(x.at) + 3)), secs = 1.9, done = new Set(); let t = 0, a = 0;
        F.run((dt, cut) => {
          t += dt; a += dt * 15; const k = Math.min(1, t / secs), d = 1 + far * k, sway = Math.sin(t * 5) * 1.2, cx = o.x + dx * d + dz * sway, cz = o.z + dz * d - dx * sway, fade = k > 0.85 ? (1 - k) / 0.15 : 1;
          for (let i = 0; i < 12; i++) { const h = Math.random() * 7, r = 0.5 + h * 0.42, b = a + h * 1.9 + i; F.haze(cx + Math.cos(b) * r, h + 0.1, cz + Math.sin(b) * r, -Math.sin(b) * 7, 1.4, Math.cos(b) * 7, i % 3 ? 0xd8c8a0 : 0xf0e8d0, 0.5 * fade, 0.5 + h * 0.14, 0.45, 0, 1.2, 1.5); }
          if (Math.random() < dt * 30) F.burst("leaf", new V3(cx, 1, cz), { n: 2, s: 1.6, col: 0xa89858 });
          for (const x of hit) if (!done.has(x.uid) && Math.hypot(x.at.x - cx, x.at.z - cz) < 2.6 || (!done.has(x.uid) && k >= 1)) { done.add(x.uid); F.burst("dust", x.at, { n: 22, s: 2.4 }); G.shake(0.18, 0.2); sfx("step"); dmg(x); }
          return k >= 1 || cut;
        });
      } else if (id === "sammohana") {
        sfx("heal"); F.flash("rgba(140,100,220,.26)", 1800); F.ring(o, col, 0.5, R.rad * 1.5, 2.8); F.ring(o, 0xe8d8ff, 0.5, R.rad * 1.1, 3.4);
        bound.forEach((x, i) => later(500 + Math.hypot(x.at.x - o.x, x.at.z - o.z) * 110, () => { let t = 0; float(x.at.clone().setY(1.9), "z z z", "mine");
          F.run((dt, cut) => { t += dt; if (Math.random() < dt * 16) F.glow(x.at.x + rs(0.7), 2.6 + Math.random(), x.at.z + rs(0.7), rs(0.15), -0.7, rs(0.15), i % 2 ? 0xc8a0ff : 0xf0e0ff, 0.7, 0.1 + Math.random() * 0.1, 2.2, 0, 0, 0.2); return t > 3.4 || cut; }); }));
      } else if (id === "nagapasha") {
        sfx("drum");
        bound.forEach((x, i) => {
          const len = Math.hypot(x.at.x - o.x, x.at.z - o.z) || 1, ux = (x.at.x - o.x) / len, uz = (x.at.z - o.z) / len, run = 0.5 + len * 0.07; let t = -i * 0.08, coils = null;
          F.run((dt, cut) => {
            t += dt; if (cut) { if (coils) { G.fxRoot.remove(coils); G.dispose(coils); } return true; }
            if (t < 0) return false;
            if (t < run) { for (let n = 0; n < 3; n++) { const k = Math.min(1, (t + n * 0.012) / run), w = Math.sin(k * len * 2.2) * 0.45 * (1 - k * 0.5); F.glow(o.x + ux * len * k - uz * w, 0.12, o.z + uz * len * k + ux * w, 0, 0.05, 0, n ? 0x4ad070 : 0xc8ffb0, 0.9, 0.2, 0.55, 0, -0.5, 0); } return false; }
            if (!coils) { coils = new T.Group(); for (let n = 0; n < 4; n++) { const m = new T.Mesh(new T.TorusGeometry(1, 0.07, 5, 18).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: n % 2 ? 0x2f9a50 : 0x6ae08a, transparent: true, fog: false })); m.position.y = 0.3 + n * 0.3; m.rotation.z = (n % 2 ? 1 : -1) * 0.16; coils.add(m); } coils.position.set(x.at.x, 0, x.at.z); G.fxRoot.add(coils); sfx("step"); F.burst("light", x.at.clone().setY(0.9), { n: 10, col: 0x8aff9a }); }
            const k = Math.min(1, (t - run) / 0.5), r = 1.15 - 0.72 * G.ease(k), life = t - run;
            coils.children.forEach((m, n) => { m.scale.set(r, 1, r); m.rotation.y += dt * (n % 2 ? 2.2 : -2.2) * (1.2 - k); m.material.opacity = life > 4.4 ? Math.max(0, 1 - (life - 4.4) / 0.6) : 1; });
            if (life > 5) { G.fxRoot.remove(coils); G.dispose(coils); return true; } return false;
          });
        });
      }
      if (e.out && e.out.text) banner(K.text(e.out.text));
    }
    // Where fire fell it burns on for a while: flames low on the ground, embers and smoke going up.
    function firesFx(e) {
      for (const [x, z] of e.at || []) { let t = 0; const at = new T.Vector3(x, 0.05, z);
        const scorch = new T.Mesh(new T.CircleGeometry(1.5, 16).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: G.tex("glow"), color: 0x140a04, transparent: true, opacity: 0.7, depthWrite: false, fog: false })); scorch.position.set(x, 0.045, z); scorch.renderOrder = 2; G.fxRoot.add(scorch);
        G.fx.run((dt, cut) => { t += dt; const k = t / e.secs, live = 1 - Math.max(0, (k - 0.7) / 0.3);
          for (let i = 0; i < 3; i++) if (Math.random() < dt * 22 * live) { const a = Math.random() * 6.3, r = Math.random() * 1.3; G.fx.glow(x + Math.cos(a) * r, 0.1, z + Math.sin(a) * r, 0, 1.2 + Math.random() * 1.4, 0, Math.random() < 0.5 ? 0xffb040 : 0xff6a20, 0.85, 0.35 + Math.random() * 0.4, 0.45 + Math.random() * 0.3, -0.3, -0.7, 0.2); }
          if (Math.random() < dt * 5 * live) G.fx.burst("ember", at, { n: 2, s: 2 }); if (Math.random() < dt * 2.5) G.fx.burst("smoke", at, { n: 1 });
          if (k >= 1 || cut) { scorch.material.opacity = 0; G.fxRoot.remove(scorch); G.dispose(scorch); return true; } scorch.material.opacity = 0.7 * Math.min(1, (1 - k) * 4); return false; });
      }
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
    function setView(m, quiet) {
      viewMode = m; K.prefs({ fightView: m }); viewEase = 0.8; hud.dataset.view = m;
      for (const b of hud.querySelectorAll("[data-view]")) b.classList.toggle("on", b.dataset.view === m);
      if (!quiet) { toast(U.tr(VIEW_NAME[m])); if (m !== "top") tip("view", "This view turns to keep the foe you face ahead of you. Next foe (Q) turns you to another. A marker at the edge of the screen warns of a blow from out of sight."); }
    }
    const cycleView = () => setView(VIEWS[(VIEWS.indexOf(viewMode) + 1) % VIEWS.length]);
    function camera(dt, snap) {
      const p = C.player(); if (!p || !p.g) return;
      const pv = views.get(p.uid), pf = pv && pv.figs[0];
      // (When it is over you see your fighter again, whichever view you fought in.)
      const mode = viewMode === "eyes" && (!started || (R.over && R.over !== "retry")) ? "behind" : viewMode;
      if (pf) pf.j.H.visible = mode !== "eyes" || !!intro;
      if (intro) return; // the opening shots hold the camera
      if (viewEase > 0) viewEase -= G.real || dt;
      const asp = G.W / G.H, k = clamp((asp - 0.75) / 0.6, 0, 1);         // 0 upright phone … 1 wide screen
      if (mode === "top") {
        const fov = 58 - 12 * k, back = 6.4 + 4.8 * k, up = 9.4 - 4.0 * k; // (an upright phone stands closer: the fighters are the picture, not the ground)
        // Pull back while foes on the field stand far from you, so none is lost off the edge.
        let far = 5, cx = p.g.x, cz = p.g.z, n = 1;
        for (const u of B.units) { if (u.side !== "enemy" || u.hp <= 0 || !u.g || !u.g.entered || u.g.kind === "light" || u.line) continue; const d = Math.hypot(u.g.x - p.g.x, u.g.z - p.g.z); if (d < 16) { far = Math.max(far, d); cx += u.g.x; cz += u.g.z; n++; } }
        const wantZoom = clamp(far / (8.5 - 2.2 * (1 - k)), 1, 1.75 - 0.1 * (1 - k));
        zoom += (wantZoom - zoom) * (snap ? 1 : Math.min(1, dt * 1.6));
        const lx = p.g.x * 0.7 + (cx / n) * 0.3, lz = p.g.z * 0.7 + (cz / n) * 0.3 - 0.6;
        camLook.set(lx, 1.0, lz);
        G.cam.rate = viewEase > 0 ? 3.5 : 5;
        G.camSet([lx, 1 + up * zoom, lz + back * zoom], camLook, fov, snap);
        lookYaw = Math.PI;
        return;
      }
      // The close views turn with you: the one you face (or the place you must reach) is kept ahead.
      const tg = started && !R.over ? R3.target(R) : null;
      let want = lookYaw, far = 4;
      if (R.through && R.goal) want = Math.atan2(R.goal.x - p.g.x, R.goal.z - p.g.z);
      else if (tg && tg.g) { far = Math.hypot(tg.g.x - p.g.x, tg.g.z - p.g.z); if (far > 0.6) want = Math.atan2(tg.g.x - p.g.x, tg.g.z - p.g.z); }
      else if (!started) want = p.g.a;
      let dy = want - lookYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      lookYaw += dy * (snap ? 1 : Math.min(1, dt * (far < 2 ? 3 : 5)));
      const sx = Math.sin(lookYaw), sz = Math.cos(lookYaw);
      if (mode === "behind") {
        let back = 3.5 + (1 - k) * 1.0 + clamp((far - 5) * 0.12, 0, 1.3), up = 2.5 + (1 - k) * 0.6;
        let cx = p.g.x - sx * back, cz = p.g.z - sz * back;
        const cr = Math.hypot(cx, cz), lim = R.rad + 1.7; if (cr > lim) { cx *= lim / cr; cz *= lim / cr; up += (cr - lim) * 0.6; } // the ranks stand beyond the edge
        camLook.set(p.g.x + sx * 3.4, 1.15, p.g.z + sz * 3.4);
        G.cam.rate = viewEase > 0 ? 4 : 9;
        G.camSet([cx, up, cz], camLook, 58 + (1 - k) * 16, snap);
      } else {
        const ey = pf ? Math.max(0.62, pf.headPos(tmp).y) : 1.6, ex = p.g.x + sx * 0.17, ez = p.g.z + sz * 0.17;
        camLook.set(ex + sx * 6, ey - 0.8, ez + sz * 6); // a little down, so the marks on the ground can be read
        G.cam.rate = viewEase > 0 ? 5 : 20;
        G.camSet([ex, ey, ez], camLook, 76 + (1 - k) * 24, snap);
      }
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
      if (viewMode !== "top") { a.strafe = true; a.look = lookYaw; }
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
      const map = { j: "strike", " ": "roll", l: "skill", e: "skill", q: "lock", tab: "lock", h: "herbs", c: "call", v: "cover", y: "layDown", g: "vanish" };
      if (map[k]) { e.preventDefault(); tap(map[k]); if (k === " ") tapRollDir(); return; }
      if (k === "f") { const s = R3.spareable(R)[0]; if (s) tap("spare", s.uid); return; }
      if (k === "x") { withdraw(); return; }
      if (k === "o") { cycleOrders(); return; }
      if (k === "r") { cycleView(); return; }
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
      if (intro) { introNext(); return; }
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
        '<div class="b-me"><div class="b-name"></div><div class="b-bar hp"><i></i><span></span></div><div class="b-bar breath"><i></i></div><div class="b-status"></div><div class="b-gifts" hidden></div></div>' +
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
      if (RT.vanishOffer && RT.vanishOffer(R)) mk(side, "vanish", "Vanish", "G", () => { if (R3.can(R, "vanish")) tap("vanish"); else toast(U.tr("Used this act")); }); // Antardhana (a boon): two seconds unseen
      if (p.abilities.includes("cover")) mk(side, "cover", K.ABILITIES.cover.name, "V", () => tap("cover"));
      if (p.abilities.includes("lay_down")) mk(side, "layDown", K.ABILITIES.lay_down.name, "Y", () => tap("layDown"));
      R3.astras(R).forEach((row, i) => { if (i < 3) mk(side, "astra" + i, row.name || K.ABILITIES[row.id].name, String(i + 1), () => { const r2 = R3.astras(R)[i]; if (r2 && !r2.why) tap("astra", r2.id); else if (r2) toast(U.esc(r2.why)); }); });
      mk(side, "spare", "Spare", "F", () => { const s = R3.spareable(R)[0]; if (s) tap("spare", s.uid); });
      if (B.units.some((u) => u.side === "ally" && !u.still)) mk(side, "orders", ORDERS[0][0], "O", () => cycleOrders());
      mk(side, "lock", "Next foe", "Q", () => tap("lock"));
      const top = U.el('<div class="b-corner"></div>'); hud.appendChild(top);
      top.appendChild(U.button("b-ico b-viewbtn", EYE, () => cycleView())); top.lastChild.title = K.tr("Change the view") + " (R)"; top.lastChild.setAttribute("aria-label", K.tr("Change the view"));
      top.appendChild(U.button("b-ico", "❚❚", () => pause(!paused))); top.lastChild.title = K.tr("Pause");
      hud.dataset.view = viewMode;
    }
    function goalText() {
      const left = R3.timeLeft(R), n = left != null ? Math.ceil(left) : 0;
      if (enc.dream && R.line) return K.tr("They keep coming. Stand as long as you can.");
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
      set("vanish", R3.can(R, "vanish"));
      { const gl = R3.gifts(), key = gl.map((x) => x.id).join(","); if (key !== giftKey) { giftKey = key; const el = hud.querySelector(".b-gifts"); if (el) { el.hidden = !gl.length; el.innerHTML = gl.map((x) => '<i title="' + U.esc(K.tr(x.name)) + '">' + (GIFT_MARK[x.id] || "✧") + "</i>").join(""); el.onclick = () => toast(gl.map((x) => K.tr(x.name)).join(" · ")); } } }
      set("herbs", R3.can(R, "herbs"), (R.herbCd || 0) / 8); if (btnEls.herbs) { const n = K.S.items.herbs || 0, k = btnEls.herbs.querySelector("kbd"); if (k) k.textContent = "×" + n; }
      set("call", R3.can(R, "call"), 0); set("cover", R3.can(R, "cover"), 0); set("layDown", R3.can(R, "layDown"), 0, !R3.can(R, "layDown") && !B.laidDown ? null : null);
      const ast = R3.astras(R); ast.forEach((row, i) => set("astra" + i, !row.why, 0));
      set("spare", true, 0, !R3.spareable(R).length);
      // Bars over the others.
      const tgt = R.lock;
      for (const v of views.values()) {
        const u = v.u; if (!v.bar) continue;
        const show = u.hp > 0 && u.g.entered !== false && (u.side === "ally" ? u.hp < u.maxHp || u.still : true) && v.kind !== "light" && (!u.line || (u.side === "enemy" && (u.uid === tgt || Math.hypot(u.g.x - p.g.x, u.g.z - p.g.z) < 4.5)));
        if (!show) { v.bar.style.display = "none"; continue; }
        G.toScreen(tmp.set(u.g.x, v.kind === "elephant" ? 4 : v.car ? 3.3 : v.kind === "cart" ? 2.2 : 2.25, u.g.z), scr);
        if (scr.behind || scr.x < -40 || scr.x > G.W + 40 || scr.y < 30) { v.bar.style.display = "none"; continue; }
        v.bar.style.display = ""; v.bar.style.transform = "translate(" + Math.round(scr.x) + "px," + Math.round(scr.y) + "px) translate(-50%,-100%)";
        v.bar.querySelector("i").style.transform = "scaleX(" + clamp(u.hp / u.maxHp, 0, 1).toFixed(3) + ")";
        v.bar.classList.toggle("on", u.uid === tgt || !!u.hero || !!u.person || !!u.still);
        v.bar.classList.toggle("kneel", !!u.g.beaten);
      }
      // The close views cannot show the whole field: a blow wound up at you from out of sight is marked at the screen's
      // edge, and one in sight carries a ring that closes as it comes.
      let nT = 0;
      if (viewMode !== "top" && started && !R.over) {
        const yaw = G.camYaw();
        for (const th of R3.threats(R)) {
          const left = th.land - R.t; if (th.x == null || left < -0.05 || left > 2.4 || nT >= 5) continue;
          let el = threatEls[nT]; if (!el) { el = U.el('<i class="b-threat"></i>'); hud.appendChild(el); threatEls.push(el); } nT++;
          let rel = Math.atan2(th.x - p.g.x, th.z - p.g.z) - yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
          G.toScreen(tmp.set(th.x, 1.3, th.z), scr);
          const seen = !scr.behind && scr.x > 24 && scr.x < G.W - 24 && scr.y > 24 && scr.y < G.H - 24, hot = left <= 0.24;
          const kk = clamp(1 - left / Math.max(0.3, th.land - (th.t0 || R.t)), 0, 1), cls = "b-threat " + (seen ? "ring" : "edge") + (hot ? " hot" : "") + (th.heavy ? " heavy" : "");
          if (el.className !== cls) el.className = cls;
          if (seen) el.style.transform = "translate(" + Math.round(scr.x) + "px," + Math.round(scr.y) + "px) translate(-50%,-50%) scale(" + (2.5 - 1.5 * kk).toFixed(2) + ")";
          else el.style.transform = "translate(" + Math.round(G.W / 2 - Math.sin(rel) * (G.W / 2 - 30)) + "px," + Math.round(G.H / 2 - Math.cos(rel) * (G.H / 2 - 110)) + "px) translate(-50%,-50%) rotate(" + Math.round(-rel * 57.3) + "deg)";
          el.style.display = "";
        }
      }
      for (let i = nT; i < threatEls.length; i++) threatEls[i].style.display = "none";
      if (tipT > 0) { tipT -= dt; if (tipT <= 0) { const el = hud.querySelector(".b-tip"); if (el) el.hidden = true; } }
      if (hurtT > 0) { hurtT -= dt; if (hurtT <= 0) { const sh = U.$("shade"); if (sh) sh.style.background = ""; } }
    }
    U.battleState = () => (closed ? "closed" : !started ? "brief" : R.over ? "over:" + R.over : "t=" + R.t.toFixed(1));

    // ---------- Before, and after ----------
    // Every fight opens close on you, shows who stands against you (and who stands with you), then pulls back to the
    // field and waits for your word. A tap or a key moves it on; Skip goes straight to the field.
    const HOW_TOUCH = "Left thumb: move. Right thumb: Strike, Roll, Guard and your skill. Tap a foe to face them.", HOW_KEYS = "Move: WASD or arrows. Strike: J or left click. Roll: Space. Guard: K or Shift. Skill: L. Face the next foe: Q. Herbs: H. Help: C. Divine weapon: 1–3. Spare: F. Withdraw: X.";
    const tally = (list) => { const n = new Map(); for (const u of list) { const k = K.text(u.name); n.set(k, (n.get(k) || 0) + (u.plural && u.g ? u.g.bodies || 1 : 1)); } return [...n].map(([k, c]) => (c > 1 && !/s$|ें$|ों$/.test(k) ? c + " × " + k : k)); };
    function brief() {
      const p = C.player(), every = B.units.filter((u) => u.side === "enemy" && u.g && !u.line), foes = every.filter((u) => u.g.entered !== false && u.g.kind !== "light");
      const allies = B.units.filter((u) => u.side === "ally" && u.g && !u.line), title = K.text(K.val(enc.title) || "A fight"), cap = K.val(enc.caption) ? K.text(K.val(enc.caption)) : "";
      const lines = B.log.filter((r) => r && r.raw).map((r) => C.line(r));
      if (U.battleBot || U.calm() || !foes.length || !p.g) return ready(true);
      hud.classList.add("pre");
      const px = p.g.x, pz = p.g.z, kind = U.tr(enc.dream ? "A dream of the war" : enc.lethal ? "Battle" : "A fight"), shots = [];
      // 1. You, close.
      shots.push({ secs: 2.4, a: [[px + 1.9, 1.62, pz - 3.1], [px, 1.34, pz], 32], b: [[px + 1.05, 1.52, pz - 2.05], [px, 1.42, pz], 30], kind, head: title, text: cap, who: p.uid, act: "taunt", sfx: enc.lethal ? "drumCall" : "tap" });
      // (what the story says as the fight opens: read over the same close view, a caption or two at most)
      const caps = []; for (const ln of lines) { if (caps.length && (caps[caps.length - 1] + " " + ln).length <= 230) caps[caps.length - 1] += " " + ln; else if (caps.length < 2) caps.push(ln); }
      caps.forEach((ln, n) => shots.push({ secs: 2.0, a: [[px + 1.05, 1.52, pz - 2.05], [px, 1.42, pz], 30], b: [[px + (n % 2 ? 1.5 : -1.2), 1.56, pz - 2.15], [px, 1.42, pz], 30], kind, head: title, text: ln }));
      // 2. Them: from over your shoulder, across the field, to the one who leads them.
      const boss = foes.find((u) => u.person || u.hero) || foes.slice().sort((x, y) => y.maxHp - x.maxHp)[0], bx = boss.g.x, bz = boss.g.z;
      const bh = boss.g.kind === "elephant" ? 3.2 : boss.g.car ? 2.2 : 1.38, bd = boss.g.kind === "elephant" ? 9 : boss.g.car ? 6.6 : boss.g.kind === "squad" ? 4.4 : 3.2;
      const rest = tally(every.filter((u) => u !== boss)), more = every.some((u) => u.g.entered === false) || (enc.rounds && !enc.hold && every.length > foes.length);
      shots.push({ secs: 2.8, a: [[px - 0.95, 1.95, pz + 2.4], [bx, bh, bz], 42], b: [[bx + bd * 0.4, bh + 0.28, bz + bd], [bx, bh, bz], 33], kind: U.tr("Against you"), head: K.text(boss.name) + (boss.plural && boss.g.bodies > 1 ? "" : ""),
        face: boss.g.kind === "man" || boss.g.car ? boss.uid : null,
        text: (RT.traitLine && RT.traitLine(boss) ? U.tr(RT.traitLine(boss)) + ". " : "") + (rest.length ? U.tr("And with them: {who}", { who: rest.join(", ") }) : "") + (more ? (rest.length ? " " : "") + U.tr("More will come.") : ""), who: boss.uid, act: "taunt", sfx: "tap" });
      // 3. Those who stand with you.
      if (allies.length) { let ax = 0, az = 0; for (const u of allies) { ax += u.g.x; az += u.g.z; } ax /= allies.length; az /= allies.length;
        let ar = 0; for (const u of allies) ar = Math.max(ar, Math.hypot(u.g.x - ax, u.g.z - az) + (u.g.kind === "squad" ? 2.2 : 0)); const ak = 1 + ar / 2.6, sx = ax >= px ? 1 : -1; /* (stand clear of a spread company, or a soldier's back fills the frame) */
        shots.push({ secs: 2.0, a: [[ax + sx * 3.2 * ak, 1.75 + 0.5 * (ak - 1), az - 3.6 * ak], [ax, 1.25, az], 40], b: [[ax + sx * 2.3 * ak, 1.62 + 0.5 * (ak - 1), az - 3.0 * ak], [(ax + px) / 2, 1.25, az], 38], kind: U.tr("With you"), head: tally(allies).join(", "), text: "", sfx: "tap" }); }
      intro = { shots, i: -1, t: 0 };
      intro.box = U.el('<div class="b-intro"><span class="kind war"></span><h2></h2><p></p></div>'); intro.skip = U.button("b-skip", U.tr("Skip") + " ▸", () => ready(false));
      hud.appendChild(intro.box); hud.appendChild(intro.skip);
      U.keys([introNext]);
      introNext();
    }
    function introNext() {
      if (!intro) return;
      intro.i++; intro.t = 0;
      const s = intro.shots[intro.i];
      if (!s) return ready(false);
      const b = intro.box, pp = b.querySelector("p"); b.querySelector(".kind").textContent = s.kind; const plain = (x) => String(x || "").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">"); b.querySelector("h2").textContent = plain(s.head); pp.textContent = plain(s.text); pp.hidden = !s.text;
      b.classList.remove("in"); void b.offsetWidth; b.classList.add("in");
      s.hold = (s.secs + 0.5 + Math.min(5, ((s.text || "").length + s.head.length) * 0.036)) * (enc.id === "x_practice" ? 0.6 : 1);
      const v = s.who != null ? views.get(s.who) : null; if (v && s.act) for (const f of v.figs) f.act(s.act, 1.7);
      // (On an upright screen the close shots stand a little further back, so a head is not cut off at the brow.)
      const up = G.W / G.H < 0.85 ? 1.34 : 1, off = (c) => [[c[1][0] + (c[0][0] - c[1][0]) * up, c[1][1] + (c[0][1] - c[1][1]) * up + (up - 1) * 0.25, c[1][2] + (c[0][2] - c[1][2]) * up], [c[1][0], c[1][1] + (up - 1) * 0.12, c[1][2]], c[2]];
      if (!s.far) { s.a = off(s.a); s.b = off(s.b); s.far = true; }
      G.camSet(s.a[0], s.a[1], s.a[2], true);
      if (s.sfx) sfx(s.sfx);
    }
    function introFrame(dt) {
      const s = intro.shots[intro.i]; if (!s) return;
      intro.t += dt;
      const k = G.ease(clamp(intro.t / s.secs, 0, 1)), mix = (a, b) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      let to = s.b;
      if (s.face != null) { // end on his face: in front of where his head is turned, a little to one side and above, clear of his horses, his standard and his umbrella
        const v = views.get(s.face), f = v && v.figs[0];
        if (f) { f.root.updateWorldMatrix(true, true); const hp = f.j.H.getWorldPosition(new T.Vector3()), sc = f.j.H.getWorldScale(new T.Vector3()).y, fw = new T.Vector3(0, 0, 1).applyQuaternion((v.car || f.j.H).getWorldQuaternion(new T.Quaternion())); // (a rider is framed by the way his car points, clear of the team, whichever way he looks)
          let ang = Math.atan2(fw.x, fw.z) + 0.55; const d = (v.car ? 6.3 : 3.8) * Math.max(1, sc); hp.y += 0.2 * sc;
          if (v.car) { // from the flank he is turned toward (an archer on a car faces his mark, not his horses), never from among the team
            const face = new T.Vector3(0, 0, 1).applyQuaternion(f.root.getWorldQuaternion(new T.Quaternion())), ca = Math.atan2(fw.x, fw.z), fa = Math.atan2(face.x, face.z); let best = -2;
            for (const o of [1.22, -1.22, 1.95, -1.95, 2.7, -2.7]) { const c = Math.cos(ca + o - fa) - Math.abs(o) * 0.04; if (c > best) { best = c; ang = ca + o; } } }
          to = [[hp.x + Math.sin(ang) * d, hp.y + (v.car ? -0.1 : 0.12), hp.z + Math.cos(ang) * d], [hp.x, hp.y - (v.car ? 0.5 : 0.22), hp.z], 32]; } } // (a rider is shown with his car under him and his parasol over him)
      G.camSet(mix(s.a[0], to[0]), mix(s.a[1], to[1]), s.a[2] + (to[2] - s.a[2]) * k, true);
      if (intro.t >= s.hold) introNext();
    }
    // The field, and your word to begin.
    function ready(whole) {
      if (intro) { intro.box.remove(); intro.skip.remove(); intro = null; }
      hud.classList.remove("pre");
      viewEase = 1.6; camera(0, !!whole);
      const foes = tally(B.units.filter((u) => u.side === "enemy" && !u.line)), allies = tally(B.units.filter((u) => u.side === "ally" && !u.line));
      const one = foes.length === 1 && !/×/.test(foes[0]) ? foes[0] : null, left = R3.timeLeft(R);
      const goal = enc.dream && R.line ? K.tr("There are too many of them. Stand as long as you can.")
        : R.noStrike ? K.tr("You cannot strike back. Guard, take cover, and live through {n} rounds.", { n: enc.hold || enc.rounds || 4 }).replace(/\d+ rounds|\d+ दौर/, Math.round(left) + " s")
        : R.through ? K.tr("Break through to the far side") + " (" + Math.round(left) + " s)" : R.escort ? K.tr("Keep {who} whole", { who: K.text((B.units.find((u) => u.still) || {}).name || "") }) + " (" + Math.round(left) + " s)"
        : left != null ? K.tr("Hold your ground") + " (" + Math.round(left) + " s). " + K.tr("You need not win, only not fall.") : one ? K.tr("Bring {foe} down. If you fall first, you lose.", { foe: one }) : K.tr("Bring them all down. If you fall first, you lose.");
      const lines = whole ? B.log.filter((r) => r && r.raw).map((r) => "<p>" + U.esc(C.line(r)) + "</p>").join("") : "";
      const el = U.el('<div class="b-card b-brief' + (whole ? "" : " low") + '"><span class="kind war">' + U.tr(enc.dream ? "A dream of the war" : enc.lethal ? "Battle" : "A fight") + "</span><h2>" + U.esc(K.text(K.val(enc.title) || "A fight")) + "</h2>" + (whole && K.val(enc.caption) ? '<p class="cap">' + U.esc(K.text(K.val(enc.caption))) + "</p>" : "") + lines +
        '<p class="b-foes"><b>' + U.esc(foes.join(", ")) + "</b>" + (allies.length ? ' <span class="muted">· ' + U.tr("With you: {who}", { who: U.esc(allies.join(", ")) }) + "</span>" : "") + "</p>" +
        '<p class="b-goalline">' + U.esc(goal) + '</p><p class="small muted">' + U.tr(touch ? HOW_TOUCH : HOW_KEYS) + '</p><div class="b-views"><span class="muted">' + U.tr("View") + '</span></div><div class="btnrow"></div></div>');
      const vr = el.querySelector(".b-views");
      for (const m of VIEWS) { const b = U.button("b-view" + (m === viewMode ? " on" : ""), U.tr(VIEW_NAME[m]), () => setView(m, true)); b.dataset.view = m; vr.appendChild(b); }
      const go = () => { if (started) return; started = true; el.remove(); U.keys([]); sfx(enc.lethal ? "conch" : "drumCall"); lastLog = B.log.length; viewEase = 0.8; if (enc.dream && !tips.move) tip("move", touch ? HOW_TOUCH : HOW_KEYS); };
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
      const word = enc.dream ? "The dream breaks." : out === "win" ? "Victory" : out === "spare" ? "Spared" : out === "flee" ? "You withdraw" : "You are beaten";
      const res = U.el('<div class="t-result ' + (out === "win" || out === "spare" ? "win" : out === "flee" ? "close" : "lose") + '"><b>' + U.tr(word) + "</b></div>"); document.body.appendChild(res);
      sfx(out === "win" || out === "spare" ? "gong" : "drum");
      const p = C.player(), pv = p && views.get(p.uid), pf = pv && pv.figs[0];
      if (pf && p.hp > 0) pf.pose(out === "win" || out === "spare" ? "cheer" : "slump");
      // The line breaks with the named: the beaten side's soldiers give up the ground, the other raises its weapons.
      for (const v of views.values()) if (v.u.line && v.u.hp > 0) { const won = (v.u.side === "ally") === (out === "win" || out === "spare"); v.over = won ? "cheer" : "plead"; }
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
      for (const p2 of far.pairs) for (const f of p2.f) f.dispose(); for (const a of far.arrows) { G.fxRoot.remove(a.m); G.dispose(a.m); } far.pairs.length = 0; far.arrows.length = 0;
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
      if (intro) introFrame(real);
      for (const v of [...views.values()]) { if (!B.units.includes(v.u) && !v.gone && !(v.u.line && R.over)) { v.gone = true; dropView(v, "now"); continue; } place(v, dt, t); }
      windups(t);
      // Arrows in the air.
      for (const s of R.shots) { if (R.t < s.t0) continue; let m = shots.get(s.n); if (!m) { m = G.arrowMesh(0.9); G.fxRoot.add(m); shots.set(s.n, m); } if (m.userData.x0 == null) { m.userData.x0 = s.x; m.userData.z0 = s.z; const tg2 = s.on != null ? B.units.find((u) => u.uid === s.on) : null; m.userData.len = Math.max(4, tg2 && tg2.g ? Math.hypot(tg2.g.x - s.x, tg2.g.z - s.z) : 14); }
        const k = Math.min(1, Math.hypot(s.x - m.userData.x0, s.z - m.userData.z0) / m.userData.len), lift = Math.min(1.6, m.userData.len * 0.07);
        m.position.set(s.x, 1.35 + Math.sin(k * Math.PI) * lift, s.z); m.rotation.set(-Math.cos(k * Math.PI) * lift * 0.5, s.a, 0, "YXZ"); }
      for (const [n, m] of shots) if (!R.shots.some((s) => s.n === n)) { G.fxRoot.remove(m); G.dispose(m); shots.delete(n); }
      // The one you face.
      const tg = !R.over && started ? R3.target(R) : null;
      if (backMesh) backMesh.position.set(G.camera.position.x, backMesh.userData.y, G.camera.position.z);
      if (edgeGlow) { const pp = C.player(), d = pp && pp.g ? R.rad - Math.hypot(pp.g.x, pp.g.z) : 9; edgeGlow.material.opacity += ((d < 2.4 ? Math.min(0.34, (2.4 - d) / 2.4 * 0.45) : 0) - edgeGlow.material.opacity) * 0.2; edgeGlow.visible = edgeGlow.material.opacity > 0.01; if (pp && pp.g) edgeGlow.rotation.y = Math.atan2(pp.g.x, pp.g.z) - Math.PI / 2; }
      if (tg && lockRing) { lockRing.visible = true; lockRing.position.set(tg.g.x, 0.06, tg.g.z); const s = (tg.g.rad / 0.42) * (1 + Math.sin(t * 5) * 0.05); lockRing.scale.set(s, 1, s); } else if (lockRing) lockRing.visible = false;
      for (const m of grounds.values()) m.rotation.y = t * 2;
      farFrame(dt, t);
      camera(dt, false);
      drawHud(real);
      if (R.over === "retry" && !asked) { asked = true; setTimeout(retryCard, 700); }
      else if (R.over && R.over !== "retry") finish();
    }
  }
})(window.K = window.K || {});
