/* Test stages: every action test is played inside a painted stage.
   - The painting (art/stage_*.webp) becomes the full-screen backdrop while the test runs.
   - A strip of the same painting sits at the top of the test, with shadow puppets of the people
     involved standing on its ground: you on the left, the others facing you. They react: you draw,
     push or duck as you act; they stagger when you score and you stagger when you slip.
   - Effects drawn in code over the backdrop: fireflies, dust, rain, embers, sparks, mist, falling
     leaves, torchlight. They stop on phones and with calm motion, and pause when the tab is hidden.
   Top-down stages (a table, a forest seen from above) have no ground to stand on: the painting goes
   under the play area instead, and the figures stand small beside it. */
(function (K) {
  "use strict";
  const U = K.UI;

  // What moves on each stage, and where its torches burn (as shares of the screen).
  const STAGES = {
    stage_mango_yard: { fx: "leaves" },
    stage_palace_garden_night: { fx: "fireflies" },
    stage_river_shallows: { fx: "dust" },
    stage_stable_yard: { fx: "dust" },
    stage_lotus_garden: { fx: "fireflies" },
    stage_training_ground: { fx: "dust" },
    stage_forest_clearing_night: { fx: "fireflies" },
    stage_vidura_table: { fx: "torch", torches: [[0.18, 0.2]], top: true },
    stage_racetrack: { fx: "dust", side: true },
    stage_board_table: { fx: "torch", torches: [[0.85, 0.18]], top: true },
    stage_healers_hall: { fx: "dust" },
    stage_palace_corridor: { fx: "torch", torches: [[0.2, 0.32], [0.5, 0.32], [0.8, 0.32]], side: true },
    stage_lac_wall: { fx: "fireflies", side: true },
    stage_bow_courtyard: { fx: "torch", torches: [[0.12, 0.38], [0.88, 0.38]] },
    stage_forest_edge: { fx: "mist" },
    stage_drupada_hall: { fx: "torch", torches: [[0.15, 0.35], [0.85, 0.35]] },
    stage_khandava_top: { fx: "embers", top: true },
    stage_storm_sea: { fx: "rain", side: true },
    stage_elephant_grounds: { fx: "dust" },
    stage_forest_maze_top: { fx: "mist", top: true },
    stage_dice_board_top: { fx: "torch", torches: [[0.12, 0.15], [0.88, 0.85]], top: true },
    stage_city_night: { fx: "torch", torches: [[0.25, 0.4], [0.7, 0.36]], side: true },
    stage_forest_lake: { fx: "mist" },
    stage_smithy: { fx: "sparks" },
    stage_matsya_ford: { fx: "dust", side: true },
    stage_prison_yard: { fx: "torch", torches: [[0.78, 0.3]], side: true },
    stage_border_village: { fx: "embers" },
    stage_chakravyuha_top: { fx: "dust", top: true },
    stage_battlefield_night: { fx: "embers", side: true },
    // Episodes (content/episodes.js): long strips are side: true; the rest are 16:9.
    stage_exile_storm: { fx: "rain", side: true },
    stage_kichaka_hall_night: { fx: "torch", torches: [[0.22, 0.34], [0.78, 0.34]], side: true },
    stage_supply_camp_night: { fx: "embers", side: true },
    stage_river_crossing_night: { fx: "mist", side: true },
    stage_war_road: { fx: "dust", side: true },
    stage_virata_court: { fx: "torch", torches: [[0.14, 0.36], [0.86, 0.36]] },
    stage_tournament_arena: { fx: "dust" },
    stage_drona_gate: { fx: "leaves" },
    stage_city_ruins: { fx: "embers" },
    // War storylines (content/war_lake.js): the reeds at dusk (16:9), the field to the river (a long strip).
    stage_lake_reeds: { fx: "mist" },
    stage_field_to_river: { fx: "embers", side: true },
    scene_fair: { fx: "dust" },
    fight_fair_ring: { fx: "dust" },
    scene_teaching: { fx: "mist" }
  };
  U.STAGES = STAGES;
  U.stageInfo = (key) => STAGES[key] || {};

  // ---------- The cast ----------
  // trial.stage: the painting; trial.cast: puppet ids (K.PUPPETS) for the others in the scene.
  // What you hold in each kind of test: a bow to shoot, bare hands to push, hold steady or creep.
  // Kinds not listed keep the weapon of your path. (t.item, when a test sets one, wins.)
  const GEAR = { aim: "bow", draw: "bow", push: null, steady: null, sneak: null, breath: null, escape: null, fuse: null, notice: null, retort: null, board: null, rings: null, dash: null, formation: null, array: null, race: "whip", herd: null };
  // Someone to push against when a test names no one.
  const FOE_FOR = { push: ["soldier"] };
  // The faces of the timing test (trial.face, trials.js): what you hold, who stands across from you
  // and what they hold, and the thing in the scene that takes the blows. Without a face, a push test
  // is a shoving match, hand to hand.
  const FACES = {
    drill: { me: "woodsword", foe: "woodsword" },               // Kripa's sword drill: wood on wood
    post: { me: "mace", cast: [], prop: "post" },               // the practice post stands alone
    gate: { me: null, prop: "gate", raiders: [null, "sword"] }  // the village gate: raiders charge it
  };
  U.PUSH_FACES = FACES;
  // Props cut from leather like the puppets. A teak post bound with rope, with three cracks to open
  // and two halves to fall apart; a plank gate between its posts, the leaf hinged on the left.
  const PROPS = {
    post: '<svg class="propsvg" viewBox="0 0 60 200" aria-hidden="true"><g class="pl"><path d="M14 200 L16 18 Q30 8 30 8 L30 200 Z" fill="#8a5a2c" stroke="#24120a" stroke-width="2"/></g><g class="pr"><path d="M30 8 Q44 10 44 18 L46 200 L30 200 Z" fill="#7a4e24" stroke="#24120a" stroke-width="2"/></g>' +
      '<g class="ropes"><path d="M15 60 H45 M15 66 H45 M15 140 H46 M15 146 H46" stroke="#d9b26a" stroke-width="3"/><path d="M15 60 H45 M15 140 H46" stroke="#24120a" stroke-width=".8" stroke-dasharray="2 2"/></g>' +
      '<g class="cracks" fill="none" stroke="#1a0c05" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path class="c1" d="M30 90 L27 102 L32 112 L28 124" opacity="0"/><path class="c2" d="M30 40 L33 52 L28 64 L31 78 L29 90" opacity="0"/><path class="c3" d="M28 124 L31 150 L29 176 L30 200" opacity="0"/></g>' +
      '<path d="M20 30 v20 M40 40 v30 M22 160 v24" stroke="#5a3418" stroke-width="1" opacity=".6"/></svg>',
    gate: '<svg class="propsvg" viewBox="0 0 120 180" aria-hidden="true"><path d="M8 180 V10 M112 180 V10" stroke="#5a3418" stroke-width="10" stroke-linecap="round"/><path d="M4 12 H116" stroke="#5a3418" stroke-width="7" stroke-linecap="round"/>' +
      '<g class="leaf"><rect x="16" y="26" width="88" height="148" rx="3" fill="#8a5a2c" stroke="#24120a" stroke-width="2"/><path d="M38 26 V174 M60 26 V174 M82 26 V174" stroke="#5a3418" stroke-width="1.6"/><path d="M16 60 H104 M16 140 H104" stroke="#3a2412" stroke-width="7"/><path d="M18 62 L102 138" stroke="#3a2412" stroke-width="6"/><circle cx="24" cy="60" r="2" fill="#d9a53a"/><circle cx="96" cy="60" r="2" fill="#d9a53a"/><circle cx="24" cy="140" r="2" fill="#d9a53a"/><circle cx="96" cy="140" r="2" fill="#d9a53a"/></g></svg>'
  };
  U.castBand = function (t, kind) {
    if (!t || !t.stage || !K.puppetSpec) return "";
    const info = U.stageInfo(t.stage);
    // (The post also stands in the beat test, Kripa's way of breaking it: owner, 5 November, it was missing.)
    const face = (kind === "push" || (kind === "rhythm" && t.face === "post")) && FACES[t.face] ? t.face : null, fc = face ? FACES[face] : null;
    const spec = Object.assign({}, K.puppetSpec(K.S));
    if (t.item !== undefined) spec.item = t.item;
    else if (fc) spec.item = fc.me;
    else if (kind && kind in GEAR) spec.item = kind === "aim" && t.verb === "Throw" ? null : GEAR[kind]; // a stone or a rope is thrown with empty hands
    const me = U.puppet(spec, { h: 150, label: K.tr("You"), cls: "actor-me" });
    let cast = fc && fc.cast ? fc.cast : K.val(t.cast) || [];
    if (!cast.length && FOE_FOR[kind] && !(fc && fc.prop)) cast = FOE_FOR[kind];
    // Elders (a teacher, a sage) are marked: some tests stand them apart, further back.
    const others = cast.slice(0, 3).map((id, i) => { const sp = Object.assign({}, U.puppetFor(id) || {});
      if (face === "drill") sp.item = t.foeItem || fc.foe; // a mace duel puts maces in both hands (t.item, t.foeItem)
      else if (face === "gate") sp.item = fc.raiders[i] || sp.item;
      else if (kind === "push") sp.item = null; // a shoving match is hand to hand
      return '<span class="actor foe f' + i + (sp.stage === "elder" ? " elder" : "") + (face === "gate" ? " raider" : "") + '" data-id="' + id + '">' + U.puppet(sp, { h: 150, flip: true }) + "</span>"; }).join("");
    const prop = fc && fc.prop ? '<span class="actor prop ' + fc.prop + '">' + PROPS[fc.prop] + "</span>" : "";
    return '<div class="cast' + (info.top ? " top" : "") + (info.side ? " side" : "") + (face ? " face face-" + face : "") + '" style="--stage:url(\'' + U.artUrl(U.stripOf(t.stage)) + '\')" aria-hidden="true">' +
      '<span class="actor me">' + me + "</span>" + prop + others + "</div>";
  };
  // Set a pose for a while, then return to the stance for this test.
  const timers = new WeakMap();
  // A teacher or an elder does not cheer at your mistakes: they watch, thinking.
  const calmFor = (el, pose) => (pose === "cheer" && el.closest(".actor.elder") ? "think" : pose);
  U.castPose = function (host, who, pose, ms) {
    if (!host) return;
    const els = who === "me" ? host.querySelectorAll(".cast .actor.me .pp") : who === "all" ? host.querySelectorAll(".cast .pp") : host.querySelectorAll(".cast .actor.foe .pp");
    els.forEach((el) => {
      if (/\bpose-live\b/.test(el.getAttribute("class"))) return; // a live figure is moved by its rig (puppet-anim.js)
      if (!el.dataset.base) el.dataset.base = (el.getAttribute("class").match(/pose-(\S+)/) || [])[1] || "stand";
      el.setAttribute("class", el.getAttribute("class").replace(/pose-\S+/, "pose-" + calmFor(el, pose)));
      clearTimeout(timers.get(el));
      if (ms) timers.set(el, setTimeout(() => { if (el.isConnected) el.setAttribute("class", el.getAttribute("class").replace(/pose-\S+/, "pose-" + el.dataset.base)); }, ms));
    });
  };
  U.castStance = function (host, mine, theirs) {
    if (!host) return;
    const set = (sel, pose) => host.querySelectorAll(sel).forEach((el) => { if (/\bpose-live\b/.test(el.getAttribute("class"))) return; el.dataset.base = calmFor(el, pose); el.setAttribute("class", el.getAttribute("class").replace(/pose-\S+/, "pose-" + el.dataset.base)); });
    if (mine) set(".cast .actor.me .pp", mine);
    if (theirs) set(".cast .actor.foe .pp", theirs);
  };

  // ---------- Effects ----------
  let run = null;
  const calm = () => !U.motion() || window.innerWidth < 720 || /jsdom/i.test(navigator.userAgent || "");
  U.stageFx = {
    // opts.story: a living effect over a story painting (the lac house burning, its smoke at dawn).
    // It plays on phones too, with fewer particles, and follows "living paintings" (off with calm
    // motion, when the device saves data, or when the player turns living paintings off).
    start(stageKey, kindOverride, opts) {
      this.stop();
      const story = !!(opts && opts.story);
      // opts.at: [left, right, top, bottom] of the painting, as fractions, where the effect rises from.
      const at = (opts && opts.at) || null;
      const info = U.stageInfo(stageKey), kind = kindOverride || info.fx;
      const cv = U.$("stagefx");
      if (!cv || !kind || (story ? !U.living() : calm())) return;
      const ctx = cv.getContext && cv.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
      size();
      const W = () => cv.width, H = () => cv.height;
      // Where the painting is on screen (story effects keep to it; on an upright phone it is a band).
      let box = null, boxAt = -1;
      const area = () => {
        if (!story) return { x: 0, y: 0, w: W(), h: H() };
        const now = performance.now();
        if (box && now - boxAt < 250) return box;
        boxAt = now;
        const pic = document.querySelector("#backdrop .bdl.on .pic"), r = pic && pic.getBoundingClientRect();
        box = r && r.width > 20 ? { x: r.left * dpr, y: Math.max(0, r.top) * dpr, w: r.width * dpr, h: (Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) * dpr } : { x: 0, y: 0, w: W(), h: H() };
        return box;
      };
      const R = Math.random;
      const ps = [];
      const small = window.innerWidth < 720;
      const N = Math.round(({ fireflies: 46, dust: 60, rain: 160, embers: 70, sparks: 0, mist: 7, leaves: 22, torch: 0, fire: 90, smoke: 16 }[kind] || 30) * (small ? (story ? 0.8 : 0.6) : 1));
      for (let i = 0; i < N; i++) ps.push(spawn(kind, true));
      function spawn(k, anywhere) {
        const w = W(), h = H();
        switch (k) {
          case "fireflies": return { x: R() * w, y: h * (0.35 + R() * 0.6), vx: (R() - 0.5) * 18, vy: (R() - 0.5) * 12, ph: R() * 6.3, r: (1.4 + R() * 1.8) * dpr };
          case "dust": return { x: R() * w, y: R() * h, vx: (6 + R() * 14) * dpr, vy: (R() - 0.6) * 6 * dpr, r: (0.8 + R() * 1.8) * dpr, a: 0.15 + R() * 0.3, ph: R() * 6.3 };
          case "rain": return { x: R() * w * 1.2, y: anywhere ? R() * h : -20, v: (900 + R() * 600) * dpr, l: (14 + R() * 18) * dpr };
          case "embers": return { x: R() * w, y: anywhere ? R() * h : h + 10, vx: (R() - 0.5) * 20 * dpr, vy: -(30 + R() * 60) * dpr, r: (1 + R() * 2.2) * dpr, life: 1, ph: R() * 6.3 };
          case "mist": return { x: R() * w, y: h * (0.45 + R() * 0.45), vx: (8 + R() * 12) * dpr * (R() < 0.5 ? -1 : 1), r: (180 + R() * 220) * dpr, a: 0.05 + R() * 0.06 };
          case "leaves": return { x: R() * w, y: anywhere ? R() * h : -20, vx: (10 + R() * 25) * dpr, vy: (25 + R() * 30) * dpr, rot: R() * 6.3, vr: (R() - 0.5) * 3, s: (4 + R() * 4) * dpr, ph: R() * 6.3 };
          // The house burning: embers thrown up from the fire, faster and brighter than a stage's.
          case "fire": { const a = area(), z = at || [0.08, 0.92, 0.5, 0.95]; return { x: a.x + a.w * (z[0] + R() * (z[1] - z[0])), y: a.y + a.h * (anywhere ? 0.05 + R() * (z[3] - 0.05) : z[2] + R() * (z[3] - z[2])), vx: (R() - 0.35) * 40 * dpr, vy: -(40 + R() * 90) * dpr * Math.max(0.6, a.h / (500 * dpr)), r: (1.3 + R() * 2.6) * dpr, life: 0.6 + R() * 0.4, ph: R() * 6.3, top: a.y }; }
          // Smoke still rising from the ashes: soft grey puffs that grow, drift and fade.
          case "smoke": { const a = area(), k = Math.max(0.5, a.h / (600 * dpr)), z = at || [0.15, 0.85, 0.6, 0.9]; return { x: a.x + a.w * (z[0] + R() * (z[1] - z[0])), y: a.y + a.h * (anywhere ? 0.1 + R() * (z[3] - 0.1) : z[2] + R() * (z[3] - z[2])), vx: (6 + R() * 14) * dpr * k, vy: -(8 + R() * 14) * dpr * k, r: (24 + R() * 40) * dpr * k, life: anywhere ? R() : 1, a: 0.08 + R() * 0.08, top: a.y }; }
          case "spark": return { x: w * (0.3 + R() * 0.08), y: h * 0.62, vx: (R() - 0.3) * 260 * dpr, vy: -(120 + R() * 260) * dpr, life: 0.6 + R() * 0.6 };
          default: return {};
        }
      }
      let last = performance.now(), on = true, id = 0, burst = 0, t = 0;
      const torches = info.torches || [];
      const frame = (now) => {
        if (!on) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (document.hidden) { id = requestAnimationFrame(frame); return; }
        t += dt;
        const w = W(), h = H();
        ctx.clearRect(0, 0, w, h);
        if (kind === "torch" || torches.length) {
          // Warm light breathing around each torch.
          for (const [tx, ty] of torches) {
            const f = 0.75 + 0.15 * Math.sin(t * 9 + tx * 10) + 0.1 * Math.sin(t * 23 + ty * 7);
            const g = ctx.createRadialGradient(tx * w, ty * h, 0, tx * w, ty * h, 260 * dpr * f);
            g.addColorStop(0, "rgba(255,190,110," + 0.32 * f + ")"); g.addColorStop(1, "rgba(255,150,60,0)");
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          }
        }
        if (kind === "fire") {
          // The light of the fire breathes: a warm glow from below, never steady.
          const f = 0.6 + 0.22 * Math.sin(t * 7.3) + 0.12 * Math.sin(t * 17.1 + 1.3) + 0.06 * Math.sin(t * 31);
          const a = area();
          const g = ctx.createLinearGradient(0, a.y + a.h, 0, a.y + a.h * 0.2);
          g.addColorStop(0, "rgba(255,140,50," + 0.3 * f + ")"); g.addColorStop(1, "rgba(255,120,40,0)");
          ctx.fillStyle = g; ctx.fillRect(a.x, a.y, a.w, a.h);
        }
        if (kind === "sparks") {
          burst -= dt;
          if (burst <= 0) { burst = 0.9 + R() * 1.4; for (let i = 0; i < 18; i++) ps.push(spawn("spark")); }
        }
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i];
          switch (kind) {
            case "fireflies": {
              p.vx += (R() - 0.5) * 30 * dt; p.vy += (R() - 0.5) * 30 * dt; p.vx *= 0.98; p.vy *= 0.98;
              p.x += p.vx * dt * dpr; p.y += p.vy * dt * dpr; p.ph += dt * 2.2;
              if (p.x < 0 || p.x > w || p.y < h * 0.25 || p.y > h) Object.assign(p, spawn(kind, true));
              const a = Math.max(0, Math.sin(p.ph)) ** 2;
              const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
              g.addColorStop(0, "rgba(230,255,150," + 0.9 * a + ")"); g.addColorStop(1, "rgba(200,255,120,0)");
              ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 6, 0, 6.3); ctx.fill();
              break;
            }
            case "dust": {
              p.x += p.vx * dt; p.y += p.vy * dt + Math.sin(t + p.ph) * 0.2; if (p.x > w + 10) { p.x = -10; p.y = R() * h; }
              ctx.fillStyle = "rgba(255,236,200," + p.a + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill();
              break;
            }
            case "rain": {
              p.y += p.v * dt; p.x -= p.v * 0.25 * dt; if (p.y > h) Object.assign(p, spawn(kind));
              ctx.strokeStyle = "rgba(200,220,235,0.35)"; ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.l * 0.25, p.y - p.l); ctx.stroke();
              break;
            }
            case "embers": {
              p.x += (p.vx + Math.sin(t * 2 + p.ph) * 12 * dpr) * dt; p.y += p.vy * dt; p.life -= dt * 0.18;
              if (p.y < -10 || p.life <= 0) Object.assign(p, spawn(kind));
              ctx.fillStyle = "rgba(255," + (120 + Math.round(80 * p.life)) + ",60," + 0.8 * p.life + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill();
              break;
            }
            case "fire": {
              p.x += (p.vx + Math.sin(t * 3 + p.ph) * 18 * dpr) * dt; p.y += p.vy * dt; p.life -= dt * 0.45;
              if (p.y < (p.top || 0) - 10 || p.life <= 0) Object.assign(p, spawn(kind));
              const a = Math.max(0, p.life) * (0.7 + 0.3 * Math.sin(t * 14 + p.ph));
              const col = "255," + (80 + Math.round(100 * p.life)) + ",40,";
              ctx.fillStyle = "rgba(255,120,40," + a * 0.18 + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.2, 0, 6.3); ctx.fill();
              ctx.fillStyle = "rgba(" + col + a + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill();
              break;
            }
            case "smoke": {
              p.x += p.vx * dt; p.y += p.vy * dt; p.r += 6 * dpr * dt; p.life -= dt * 0.07;
              if (p.life <= 0 || p.y < (p.top || 0) - p.r * 0.5) Object.assign(p, spawn(kind));
              const a = p.a * Math.sin(Math.PI * Math.max(0, Math.min(1, p.life)));
              const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
              g.addColorStop(0, "rgba(205,200,190," + a + ")"); g.addColorStop(1, "rgba(205,200,190,0)");
              ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
              break;
            }
            case "mist": {
              p.x += p.vx * dt; if (p.x < -p.r) p.x = w + p.r; if (p.x > w + p.r) p.x = -p.r;
              const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
              g.addColorStop(0, "rgba(235,235,225," + p.a + ")"); g.addColorStop(1, "rgba(235,235,225,0)");
              ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
              break;
            }
            case "leaves": {
              p.x += (p.vx + Math.sin(t * 1.5 + p.ph) * 20 * dpr) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
              if (p.y > h + 20) Object.assign(p, spawn(kind));
              ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = "rgba(96,124,48,0.75)";
              ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, 6.3); ctx.fill(); ctx.restore();
              break;
            }
            case "sparks": {
              p.vy += 520 * dpr * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
              if (p.life <= 0) { ps.splice(i, 1); break; }
              ctx.strokeStyle = "rgba(255,200,90," + Math.min(1, p.life * 1.5) + ")"; ctx.lineWidth = 1.6 * dpr;
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02); ctx.stroke();
              break;
            }
          }
        }
        id = requestAnimationFrame(frame);
      };
      id = requestAnimationFrame(frame);
      addEventListener("resize", size);
      cv.classList.add("on");
      run = { story: story ? stageKey : null, stop() { on = false; cancelAnimationFrame(id); removeEventListener("resize", size); ctx.clearRect(0, 0, cv.width, cv.height); cv.classList.remove("on"); } };
    },
    stop() { if (run) { run.stop(); run = null; } },
    // The painting a story effect belongs to (it ends when that painting leaves the screen).
    storyFor() { return run && run.story; }
  };
})(window.K = window.K || {});
