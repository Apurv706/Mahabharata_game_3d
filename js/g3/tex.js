/* Textures and sprites, all painted in code on small canvases (no image files): grain for earth and plaster, stone
   flags, planks, thatch, woven cloth, a carpet, water, and the soft sprites the particles use (glow, flame, smoke, dust,
   spark). K.G3.tex(name) returns a shared THREE texture; they are made once and kept. */
(function (K) {
  "use strict";
  const T = window.THREE, G = K.G3;
  if (!T) return;
  const cache = {};
  const rnd = G.rand(7);
  function canvas(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"); if (x) draw(x, w, h);
    return c;
  }
  function tex(c, repeat, srgb) {
    const t = new T.CanvasTexture(c);
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    if (srgb !== false) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4; t.userData.keep = true;
    return t;
  }
  // Speckled, blotchy grey around white: multiplied into a surface's own colour.
  function grain(x, w, h, lo, hi, blot, dots) {
    const img = x.createImageData(w, h), d = img.data;
    // coarse value noise, two octaves, wrapped so it tiles
    const N = 16, grid = []; for (let i = 0; i < N * N; i++) grid.push(rnd());
    const at = (gx, gy, f) => grid[(((gy % f) + f) % f) * N + (((gx % f) + f) % f)]; // wraps at its own frequency, so the tile repeats without a seam
    const sm = (t) => t * t * (3 - 2 * t);
    const val = (u, v, f) => { const X = u * f, Y = v * f, x0 = Math.floor(X), y0 = Math.floor(Y), fx = sm(X - x0), fy = sm(Y - y0); return (at(x0, y0, f) * (1 - fx) + at(x0 + 1, y0, f) * fx) * (1 - fy) + (at(x0, y0 + 1, f) * (1 - fx) + at(x0 + 1, y0 + 1, f) * fx) * fy; };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const u = i / w, v = j / h;
      let n = val(u, v, N / 4) * 0.6 + val(u, v, N / 2) * 0.3 + val(u, v, N) * 0.1;
      n = lo + (hi - lo) * (0.5 + (n - 0.5) * blot) + (rnd() - 0.5) * dots;
      const g = Math.max(0, Math.min(255, Math.round(n * 255))), k = (j * w + i) * 4;
      d[k] = g; d[k + 1] = g; d[k + 2] = g; d[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }
  const radial = (x, w, stops) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); stops.forEach(([o, c]) => g.addColorStop(o, c)); x.fillStyle = g; x.fillRect(0, 0, w, w); };
  const MAKE = {
    grain: () => tex(canvas(256, 256, (x, w, h) => grain(x, w, h, 0.72, 1.0, 1.5, 0.1)), true, false),
    fine: () => tex(canvas(128, 128, (x, w, h) => grain(x, w, h, 0.86, 1.0, 1.0, 0.07)), true, false),
    earth: () => { const t = tex(canvas(512, 512, (x, w, h) => {
      grain(x, w, h, 0.83, 0.99, 0.5, 0.15);
      const wrap = (fn) => { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { x.save(); x.translate(ox, oy); fn(); x.restore(); } }; // drawn across the edges too, so the tile has no seam
      for (let i = 0; i < 70; i++) { const px = rnd() * w, py = rnd() * h, r = 7 + rnd() * 12, a = rnd() * 3; wrap(() => { const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, "rgba(60,40,24,.16)"); g.addColorStop(1, "rgba(60,40,24,0)"); x.fillStyle = g; x.beginPath(); x.ellipse(px, py, r, r * 0.6, a, 0, 7); x.fill(); }); } // dents of feet and hooves
      for (let i = 0; i < 240; i++) { const px = rnd() * w, py = rnd() * h, r = 1.2 + rnd() * 3.2, a = rnd() * 3, l = rnd() < 0.5; wrap(() => { x.fillStyle = "rgba(30,20,12,.3)"; x.beginPath(); x.ellipse(px + 1, py + 1.2, r, r * 0.7, a, 0, 7); x.fill(); x.fillStyle = l ? "rgba(255,250,240,.55)" : "rgba(120,104,88,.6)"; x.beginPath(); x.ellipse(px, py, r, r * 0.7, a, 0, 7); x.fill(); }); } // pebbles and their small shadows
      x.strokeStyle = "rgba(50,34,20,.2)"; x.lineWidth = 1;
      for (let i = 0; i < 36; i++) { let px = rnd() * w, py = rnd() * h; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (rnd() - 0.5) * 22; py += (rnd() - 0.5) * 22; x.lineTo(px, py); } x.stroke(); } // dry cracks
      for (let i = 0; i < 160; i++) { const px = rnd() * w, py = rnd() * h; x.strokeStyle = "rgba(200,190,150,.28)"; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5) * 7, py - 3 - rnd() * 6); x.stroke(); } // wisps of dry grass
    }), true, false); t.anisotropy = 8; return t; },
    // Stone flags with dark joints.
    flags: () => tex(canvas(256, 256, (x, w, h) => {
      grain(x, w, h, 0.78, 1.0, 1.2, 0.06);
      x.strokeStyle = "rgba(40,26,16,.55)"; x.lineWidth = 3;
      for (let r = 0; r < 4; r++) { const y = r * 64; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); for (let c = 0; c < 4; c++) { const px = c * 64 + (r % 2 ? 32 : 0); x.beginPath(); x.moveTo(px, y); x.lineTo(px, y + 64); x.stroke(); } }
    }), true, false),
    planks: () => tex(canvas(256, 256, (x, w, h) => {
      grain(x, w, h, 0.74, 1.0, 0.9, 0.05);
      x.strokeStyle = "rgba(30,18,10,.6)"; x.lineWidth = 2;
      for (let c = 0; c < 8; c++) { x.beginPath(); x.moveTo(c * 32, 0); x.lineTo(c * 32, h); x.stroke(); }
      x.strokeStyle = "rgba(30,18,10,.18)"; x.lineWidth = 1;
      for (let i = 0; i < 60; i++) { const px = rnd() * w, py = rnd() * h; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5) * 3, py + 20 + rnd() * 40); x.stroke(); }
    }), true, false),
    thatch: () => tex(canvas(128, 128, (x, w, h) => {
      x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { const px = rnd() * w, py = rnd() * h, g = 150 + Math.floor(rnd() * 105); x.strokeStyle = "rgb(" + g + "," + g + "," + g + ")"; x.lineWidth = 1 + rnd(); x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5) * 5, py + 10 + rnd() * 16); x.stroke(); }
    }), true, false),
    weave: () => tex(canvas(64, 64, (x, w, h) => {
      x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(0,0,0,.14)"; x.lineWidth = 1;
      for (let i = 0; i < 16; i++) { x.beginPath(); x.moveTo(0, i * 4 + 0.5); x.lineTo(w, i * 4 + 0.5); x.stroke(); x.beginPath(); x.moveTo(i * 4 + 0.5, 0); x.lineTo(i * 4 + 0.5, h); x.stroke(); }
    }), true, false),
    // A court carpet: borders, a field of small motifs, a medallion.
    carpet: () => tex(canvas(256, 256, (x, w, h) => {
      x.fillStyle = "#7a1f22"; x.fillRect(0, 0, w, h);
      const band = (m, c, lw) => { x.strokeStyle = c; x.lineWidth = lw; x.strokeRect(m, m, w - 2 * m, h - 2 * m); };
      band(6, "#d9a53a", 6); band(18, "#2d4a7a", 8); band(28, "#e8c46a", 2);
      x.fillStyle = "#c98a2e";
      for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const px = 46 + i * 20.5, py = 46 + j * 20.5; x.beginPath(); x.moveTo(px, py - 5); x.lineTo(px + 5, py); x.lineTo(px, py + 5); x.lineTo(px - 5, py); x.closePath(); x.fill(); }
      x.fillStyle = "#2d4a7a"; x.beginPath(); x.ellipse(w / 2, h / 2, 46, 46, 0, 0, 7); x.fill();
      x.fillStyle = "#e8c46a"; for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283; x.beginPath(); x.ellipse(w / 2 + Math.cos(a) * 26, h / 2 + Math.sin(a) * 26, 9, 4, a, 0, 7); x.fill(); }
      x.fillStyle = "#b2432a"; x.beginPath(); x.arc(w / 2, h / 2, 10, 0, 7); x.fill();
    })),
    // The gaming cloth of the dice hall: a cross of squares.
    chaupar: () => tex(canvas(256, 256, (x, w, h) => {
      x.fillStyle = "#6e2a22"; x.fillRect(0, 0, w, h);
      const s = 16, arm = (ox, oy, cols, rows) => { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { x.fillStyle = (r + c) % 2 ? "#e9d7a8" : "#d9a53a"; x.fillRect(ox + c * s + 1, oy + r * s + 1, s - 2, s - 2); } };
      arm(104, 8, 3, 6); arm(104, 152, 3, 6); arm(8, 104, 6, 3); arm(152, 104, 6, 3);
      x.fillStyle = "#2d4a7a"; x.fillRect(104, 104, 48, 48); x.fillStyle = "#e8c46a"; x.beginPath(); x.arc(128, 128, 14, 0, 7); x.fill();
    })),
    water: () => tex(canvas(256, 256, (x, w, h) => {
      grain(x, w, h, 0.7, 1.0, 1.6, 0.03);
      x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 1.5;
      for (let i = 0; i < 40; i++) { const px = rnd() * w, py = rnd() * h, l = 10 + rnd() * 26; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py - 3, px + l, py); x.stroke(); }
    }), true, false),
    // Sprites.
    glow: () => tex(canvas(64, 64, (x, w) => radial(x, w, [[0, "rgba(255,255,255,1)"], [0.25, "rgba(255,255,255,.55)"], [1, "rgba(255,255,255,0)"]]))),
    soft: () => tex(canvas(64, 64, (x, w) => radial(x, w, [[0, "rgba(255,255,255,.9)"], [0.5, "rgba(255,255,255,.35)"], [1, "rgba(255,255,255,0)"]]))),
    smoke: () => tex(canvas(128, 128, (x, w) => { for (let i = 0; i < 14; i++) { const cx = w / 2 + (rnd() - 0.5) * 50, cy = w / 2 + (rnd() - 0.5) * 50, r = 18 + rnd() * 26, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, "rgba(255,255,255,.22)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); } })),
    flame: () => tex(canvas(64, 96, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h * 0.62, h * 0.55); g.addColorStop(0, "rgba(255,250,220,1)"); g.addColorStop(0.3, "rgba(255,200,90,.95)"); g.addColorStop(0.65, "rgba(255,110,30,.55)"); g.addColorStop(1, "rgba(200,40,10,0)");
      x.fillStyle = g; x.beginPath(); x.moveTo(w / 2, 2); x.bezierCurveTo(w * 0.95, h * 0.45, w * 0.9, h * 0.95, w / 2, h - 2); x.bezierCurveTo(w * 0.1, h * 0.95, w * 0.05, h * 0.45, w / 2, 2); x.fill();
    })),
    spark: () => tex(canvas(32, 32, (x, w) => { radial(x, w, [[0, "rgba(255,255,255,1)"], [0.2, "rgba(255,240,200,.9)"], [1, "rgba(255,200,120,0)"]]); x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 1.2; x.beginPath(); x.moveTo(2, 16); x.lineTo(30, 16); x.moveTo(16, 2); x.lineTo(16, 30); x.stroke(); })),
    ring: () => tex(canvas(128, 128, (x, w) => { x.strokeStyle = "#fff"; x.lineWidth = 7; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 6, 0, 7); x.stroke(); x.globalAlpha = 0.25; x.lineWidth = 16; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 14, 0, 7); x.stroke(); })),
    disc: () => tex(canvas(128, 128, (x, w) => radial(x, w, [[0, "rgba(255,255,255,.55)"], [0.8, "rgba(255,255,255,.4)"], [0.97, "rgba(255,255,255,.95)"], [1, "rgba(255,255,255,0)"]]))),
    leaf: () => tex(canvas(32, 32, (x, w) => { x.fillStyle = "#fff"; x.beginPath(); x.moveTo(4, 16); x.quadraticCurveTo(16, 2, 28, 16); x.quadraticCurveTo(16, 30, 4, 16); x.fill(); })),
    petal: () => tex(canvas(32, 32, (x, w) => { x.fillStyle = "#fff"; x.beginPath(); x.ellipse(16, 16, 12, 7, 0.5, 0, 7); x.fill(); })),
    streak: () => tex(canvas(8, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(2, 0, 4, h); }))
  };
  G.tex = function (name) { return cache[name] || (cache[name] = (MAKE[name] || MAKE.grain)()); };
  // A banner's cloth with its device, painted per house colour (kept).
  G.bannerTex = function (bg, fg, device) {
    const key = "banner:" + bg + fg + device;
    if (cache[key]) return cache[key];
    return (cache[key] = tex(canvas(64, 128, (x, w, h) => {
      x.fillStyle = bg; x.fillRect(0, 0, w, h);
      x.fillStyle = fg; x.fillRect(0, 0, w, 7); x.fillRect(0, h - 7, w, 7);
      x.strokeStyle = fg; x.lineWidth = 3; x.fillStyle = fg;
      const cx = w / 2, cy = h / 2;
      if (device === "sun") { x.beginPath(); x.arc(cx, cy, 11, 0, 7); x.fill(); for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283; x.beginPath(); x.moveTo(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15); x.lineTo(cx + Math.cos(a) * 23, cy + Math.sin(a) * 23); x.stroke(); } }
      else if (device === "moon") { x.beginPath(); x.arc(cx, cy, 16, 0, 7); x.fill(); x.fillStyle = bg; x.beginPath(); x.arc(cx + 7, cy - 4, 14, 0, 7); x.fill(); x.fillStyle = fg; for (const [dx, dy] of [[-23, -16], [21, -22], [-19, 18], [23, 15], [2, 28]]) { x.beginPath(); x.arc(cx + dx, cy + dy, 2.6, 0, 7); x.fill(); } } // (Yudhishthira's: a golden moon with the planets round it)
      else if (device === "wheel") { x.beginPath(); x.arc(cx, cy, 17, 0, 7); x.stroke(); for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17); x.stroke(); } }
      else if (device === "bow") { x.beginPath(); x.arc(cx - 8, cy, 22, -1.1, 1.1); x.stroke(); x.beginPath(); x.moveTo(cx + 2, cy - 20); x.lineTo(cx + 2, cy + 20); x.stroke(); }
      // The standards the epic gives its heroes: Bhishma's palm, Arjuna's ape, Duryodhana's serpent, Drona's water-pot on
      // an altar, Abhimanyu's karnikara tree, Karna's elephant-girth, Bhima's lion, Jayadratha's boar.
      else if (device === "palm") { x.lineWidth = 4; x.beginPath(); x.moveTo(cx, cy + 24); x.lineTo(cx, cy - 8); x.stroke(); x.lineWidth = 3; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.42; x.beginPath(); x.moveTo(cx, cy - 8); x.quadraticCurveTo(cx + Math.cos(a) * 14, cy - 8 + Math.sin(a) * 16, cx + Math.cos(a) * 22, cy - 8 + Math.sin(a) * 10 + 6); x.stroke(); } for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(cx - 20 + k * 10, cy - 34 + (k % 2) * 5, 2.4, 0, 7); x.fill(); } } // (Bhishma's palmyra, decked with five stars)
      else if (device === "ape") { x.beginPath(); x.arc(cx, cy - 14, 7, 0, 7); x.fill(); x.fillRect(cx - 6, cy - 8, 12, 18); x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 5, cy - 4); x.lineTo(cx - 16, cy - 16); x.moveTo(cx + 5, cy - 4); x.lineTo(cx + 15, cy + 4); x.moveTo(cx - 3, cy + 10); x.lineTo(cx - 10, cy + 24); x.moveTo(cx + 3, cy + 10); x.lineTo(cx + 10, cy + 24); x.stroke(); x.lineWidth = 3; x.beginPath(); x.moveTo(cx + 5, cy + 8); x.quadraticCurveTo(cx + 24, cy + 6, cx + 20, cy - 16); x.stroke(); }
      else if (device === "serpent") { x.lineWidth = 5; x.beginPath(); x.moveTo(cx - 4, cy + 24); x.bezierCurveTo(cx + 22, cy + 14, cx - 24, cy + 2, cx + 2, cy - 8); x.bezierCurveTo(cx + 16, cy - 14, cx + 6, cy - 24, cx - 2, cy - 20); x.stroke(); x.beginPath(); x.ellipse(cx - 3, cy - 20, 8, 6, 0, 0, 7); x.fill(); }
      else if (device === "pot") { x.fillRect(cx - 16, cy + 12, 32, 6); x.fillRect(cx - 11, cy + 6, 22, 6); x.beginPath(); x.ellipse(cx, cy - 6, 11, 12, 0, 0, 7); x.fill(); x.fillRect(cx - 5, cy - 22, 10, 6); x.beginPath(); x.arc(cx + 10, cy - 8, 8, -1.2, 1.2); x.stroke(); }
      else if (device === "tree") { x.fillRect(cx - 2, cy, 4, 24); for (const [dx, dy, r] of [[0, -12, 12], [-10, -2, 9], [10, -2, 9], [0, 2, 8]]) { x.beginPath(); x.arc(cx + dx, cy + dy, r, 0, 7); x.fill(); } }
      else if (device === "girth") { x.lineWidth = 5; for (const dy of [-10, 6]) { x.beginPath(); x.moveTo(cx - 20, cy + dy); x.quadraticCurveTo(cx, cy + dy + 12, cx + 20, cy + dy); x.stroke(); } x.beginPath(); x.arc(cx, cy + 20, 5, 0, 7); x.fill(); }
      else if (device === "lion") { x.beginPath(); x.arc(cx + 8, cy - 8, 11, 0, 7); x.fill(); x.fillRect(cx - 16, cy - 2, 26, 12); x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 12, cy + 10); x.lineTo(cx - 12, cy + 22); x.moveTo(cx + 6, cy + 10); x.lineTo(cx + 6, cy + 22); x.stroke(); x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 16, cy + 2); x.quadraticCurveTo(cx - 26, cy - 6, cx - 20, cy - 16); x.stroke(); }
      else if (device === "boar") { x.beginPath(); x.ellipse(cx - 2, cy, 17, 10, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx + 12, cy - 6); x.lineTo(cx + 24, cy + 2); x.lineTo(cx + 12, cy + 6); x.fill(); x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 10, cy + 8); x.lineTo(cx - 10, cy + 18); x.moveTo(cx + 6, cy + 8); x.lineTo(cx + 6, cy + 18); x.stroke(); }
      // More of the epic's standards: Duryodhana's jewelled elephant, Kripa's bull, the golden peacock (Abhimanyu, Vrishasena),
      // Sahadeva's silver swan, Ghatotkacha's vulture, the sacrificial stake of Somadatta's son, Shalya's furrow, Nakula's
      // sarabha, the lion's tail of Drona's son.
      else if (device === "elephant") { x.beginPath(); x.ellipse(cx - 4, cy, 16, 11, 0, 0, 7); x.fill(); x.beginPath(); x.arc(cx + 12, cy - 6, 8, 0, 7); x.fill(); x.lineWidth = 5; x.beginPath(); x.moveTo(cx + 18, cy - 4); x.quadraticCurveTo(cx + 25, cy + 6, cx + 18, cy + 16); x.stroke(); x.beginPath(); x.moveTo(cx - 12, cy + 8); x.lineTo(cx - 12, cy + 22); x.moveTo(cx + 4, cy + 8); x.lineTo(cx + 4, cy + 22); x.stroke(); x.fillStyle = bg; for (const [dx, dy] of [[-10, -3], [-2, 2], [5, -3]]) { x.beginPath(); x.arc(cx + dx, cy + dy, 2, 0, 7); x.fill(); } }
      else if (device === "bull") { x.beginPath(); x.ellipse(cx - 2, cy + 2, 17, 9, 0, 0, 7); x.fill(); x.beginPath(); x.arc(cx + 6, cy - 7, 7, 0, 7); x.fill(); x.beginPath(); x.arc(cx + 17, cy - 4, 6, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx + 14, cy - 9); x.quadraticCurveTo(cx + 12, cy - 20, cx + 20, cy - 20); x.moveTo(cx + 20, cy - 9); x.quadraticCurveTo(cx + 27, cy - 14, cx + 24, cy - 21); x.stroke(); x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 12, cy + 9); x.lineTo(cx - 12, cy + 22); x.moveTo(cx + 8, cy + 9); x.lineTo(cx + 8, cy + 22); x.stroke(); }
      else if (device === "peacock") { x.globalAlpha = 0.5; x.beginPath(); x.moveTo(cx - 2, cy + 6); x.arc(cx - 2, cy + 6, 26, Math.PI * 1.02, Math.PI * 1.78); x.closePath(); x.fill(); x.globalAlpha = 1; x.beginPath(); x.ellipse(cx + 2, cy + 8, 9, 6, 0.3, 0, 7); x.fill(); x.lineWidth = 4; x.beginPath(); x.moveTo(cx + 8, cy + 4); x.quadraticCurveTo(cx + 16, cy - 6, cx + 10, cy - 14); x.stroke(); x.beginPath(); x.arc(cx + 10, cy - 16, 4, 0, 7); x.fill(); x.lineWidth = 2; x.beginPath(); x.moveTo(cx + 10, cy - 20); x.lineTo(cx + 8, cy - 27); x.moveTo(cx + 12, cy - 20); x.lineTo(cx + 14, cy - 27); x.moveTo(cx, cy + 14); x.lineTo(cx - 2, cy + 24); x.moveTo(cx + 5, cy + 14); x.lineTo(cx + 6, cy + 24); x.stroke(); for (const a of [1.12, 1.3, 1.48, 1.66]) { x.beginPath(); x.arc(cx - 2 + Math.cos(Math.PI * a) * 20, cy + 6 + Math.sin(Math.PI * a) * 20, 2.6, 0, 7); x.fill(); } }
      else if (device === "swan") { x.beginPath(); x.ellipse(cx - 3, cy + 6, 16, 9, 0, 0, 7); x.fill(); x.lineWidth = 5; x.beginPath(); x.moveTo(cx + 8, cy + 2); x.bezierCurveTo(cx + 22, cy - 6, cx + 2, cy - 12, cx + 12, cy - 22); x.stroke(); x.beginPath(); x.arc(cx + 13, cy - 23, 4.5, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx + 16, cy - 25); x.lineTo(cx + 25, cy - 21); x.lineTo(cx + 16, cy - 20); x.fill(); }
      else if (device === "vulture") { x.beginPath(); x.moveTo(cx, cy - 2); x.lineTo(cx - 27, cy - 16); x.lineTo(cx - 14, cy + 6); x.closePath(); x.fill(); x.beginPath(); x.moveTo(cx, cy - 2); x.lineTo(cx + 27, cy - 16); x.lineTo(cx + 14, cy + 6); x.closePath(); x.fill(); x.beginPath(); x.ellipse(cx, cy + 4, 6, 12, 0, 0, 7); x.fill(); x.beginPath(); x.arc(cx, cy - 12, 5, 0, 7); x.fill(); x.beginPath(); x.moveTo(cx - 5, cy + 14); x.lineTo(cx, cy + 26); x.lineTo(cx + 5, cy + 14); x.fill(); }
      else if (device === "stake") { x.fillRect(cx - 4, cy - 22, 8, 46); x.fillRect(cx - 9, cy - 18, 18, 5); x.fillRect(cx - 12, cy + 20, 24, 5); x.beginPath(); x.moveTo(cx - 4, cy - 22); x.lineTo(cx, cy - 29); x.lineTo(cx + 4, cy - 22); x.fill(); }
      else if (device === "furrow") { x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 20, cy - 14); x.lineTo(cx + 8, cy + 6); x.stroke(); x.beginPath(); x.moveTo(cx + 8, cy + 6); x.lineTo(cx + 22, cy + 10); x.lineTo(cx + 4, cy + 18); x.closePath(); x.fill(); x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 22, cy + 23); x.lineTo(cx + 22, cy + 23); x.stroke(); for (let k = 0; k < 4; k++) { x.beginPath(); x.ellipse(cx + 12 + (k % 2) * 6, cy - 26 + k * 6, 3, 5, 0.5 - (k % 2), 0, 7); x.fill(); } }
      else if (device === "sarabha") { x.beginPath(); x.ellipse(cx - 3, cy + 2, 15, 8, 0, 0, 7); x.fill(); x.lineWidth = 4; x.beginPath(); x.moveTo(cx + 9, cy - 2); x.lineTo(cx + 15, cy - 14); x.stroke(); x.beginPath(); x.ellipse(cx + 17, cy - 16, 6, 4, 0.4, 0, 7); x.fill(); x.lineWidth = 2; x.beginPath(); x.moveTo(cx + 14, cy - 19); x.lineTo(cx + 10, cy - 28); x.moveTo(cx + 12, cy - 24); x.lineTo(cx + 16, cy - 27); x.moveTo(cx + 18, cy - 19); x.lineTo(cx + 20, cy - 28); x.stroke(); x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 12, cy + 8); x.lineTo(cx - 14, cy + 23); x.moveTo(cx - 5, cy + 9); x.lineTo(cx - 4, cy + 23); x.moveTo(cx + 5, cy + 8); x.lineTo(cx + 4, cy + 23); x.moveTo(cx + 10, cy + 6); x.lineTo(cx + 13, cy + 22); x.stroke(); }
      else if (device === "liontail") { x.lineWidth = 6; x.beginPath(); x.moveTo(cx - 14, cy + 24); x.bezierCurveTo(cx - 20, cy - 4, cx + 22, cy + 6, cx + 8, cy - 14); x.stroke(); x.beginPath(); x.ellipse(cx + 6, cy - 19, 7, 10, -0.5, 0, 7); x.fill(); }
      else { x.beginPath(); x.moveTo(cx, cy - 20); x.lineTo(cx + 13, cy); x.lineTo(cx, cy + 20); x.lineTo(cx - 13, cy); x.closePath(); x.fill(); }
    })));
  };
})(window.K = window.K || {});
