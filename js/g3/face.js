/* Faces, painted. A modelled head (tools/blender/cast.py) is smooth skin with the bone of a face under it: brow, sockets,
   nose, lips, jaw. The eyes, brows and mouth are not little balls stuck on it: they are painted, as a puppet-maker or a
   miniature painter does them, on a small canvas that the head's own skin wears (js/g3/surf.js draws it; each point of
   the head knows where it lies on the canvas). The model says where its features are (M.face), so the paint falls on
   the form. One canvas holds four faces of the same person: set, eyes shut (a blink, sleep, death), shouting, in pain.
     G.faceTex(M, skin, hair)  -> the canvas texture for this person in these colours (kept; a few dozen at most)
     G.FACE_CELL[mood]         -> where that face is on the canvas: [x, y, w, h] in texture coordinates */
(function (K) {
  "use strict";
  const T = window.THREE, G = (K.G3 = K.G3 || {});
  if (!T) return;
  const S = 256, MOODS = ["set", "shut", "shout", "pain"];
  G.FACE_CELL = {}; MOODS.forEach((m, i) => { G.FACE_CELL[m] = [(i % 2) * 0.5, (1 - Math.floor(i / 2)) * 0.5 - 0.0, 0.5, 0.5]; G.FACE_CELL[m][1] = 0.5 - Math.floor(i / 2) * 0.5; });
  const hex = (n) => "#" + (n & 0xffffff).toString(16).padStart(6, "0");
  const mix = (a, b, k) => { const ch = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
  const rgba = (n, al) => "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + al + ")";
  function paint(c, ox, oy, F, skin, hair, mood) {
    const sx = S / (2 * F.u[0]), sy = S / F.v[1], X = (m) => ox + S / 2 + m * sx, Y = (m) => oy + (1 - (m - F.v[0]) / F.v[1]) * S;
    const she = !!F.she, old = F.stage === "elder", kid = F.stage === "child", dark = mix(skin, 0x1a0c06, 0.72), line = mix(skin, 0x24100a, 0.55);
    const [ex, ez, ek] = F.eye, [bz, BR, bth] = F.brow, [mz, lw] = F.mouth, [nz, NS] = F.nose;
    c.save(); c.beginPath(); c.rect(ox, oy, S, S); c.clip(); c.lineCap = "round"; c.lineJoin = "round";
    const soft = (x, y, rx, ry, col, al) => { const g = c.createRadialGradient(x, y, 0, x, y, 1); g.addColorStop(0, rgba(col, al)); g.addColorStop(1, rgba(col, 0)); c.save(); c.translate(x, y); c.scale(rx, ry); c.translate(-x, -y); c.fillStyle = g; c.beginPath(); c.arc(x, y, 1, 0, 7); c.fill(); c.restore(); };
    // the hollows a face has, laid in softly: under the brow, beside the nose; and blood in the cheeks
    for (const sd of [-1, 1]) { soft(X(sd * ex), Y(ez + 0.012), 0.03 * sx, 0.014 * sy, 0x3a1c0e, 0.2); soft(X(sd * 0.052), Y(ez - 0.04), 0.03 * sx, 0.024 * sy, 0xb04030, she || kid ? 0.2 : 0.11); soft(X(sd * 0.016 * NS), Y(nz + 0.014), 0.007 * sx, 0.02 * sy, 0x3a1c0e, 0.13); }
    if (old) { c.strokeStyle = rgba(mix(skin, 0x2a140a, 0.6), 0.34); c.lineWidth = 1.1;
      for (const k of [0.022, 0.034]) { c.beginPath(); c.moveTo(X(-0.04), Y(bz + k)); c.quadraticCurveTo(X(0), Y(bz + k + 0.004), X(0.04), Y(bz + k)); c.stroke(); }
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(X(sd * 0.021 * NS), Y(nz + 0.004)); c.quadraticCurveTo(X(sd * 0.034), Y((nz + mz) / 2), X(sd * 0.03), Y(mz - 0.004)); c.stroke();
        for (const a of [-0.004, 0.001, 0.006]) { c.beginPath(); c.moveTo(X(sd * (ex + 0.021 * ek)), Y(ez + a * 0.4)); c.lineTo(X(sd * (ex + 0.031 * ek)), Y(ez + a)); c.stroke(); } } }
    // ---- the eyes
    const shut = mood === "shut" || mood === "pain";
    for (const sd of [-1, 1]) {
      const cx = X(sd * ex), cy = Y(ez), w = 0.0198 * ek * sx, h = 0.0108 * ek * sy * (mood === "shout" ? 0.82 : 1), P = (a, b) => [cx + sd * a * w, cy + b * h];
      const lid = () => { c.beginPath(); c.moveTo(...P(-1, 0.25)); c.quadraticCurveTo(...P(-0.25, -1.3), ...P(1, -0.2)); }, lashW = Math.max(1.8, h * (she ? 0.5 : 0.36));
      if (shut) { // lids down: the lashes are one dark curve, and the lid above it is skin
        c.strokeStyle = hex(0x150b07); c.lineWidth = lashW; c.beginPath(); c.moveTo(...P(-1, 0.1)); c.quadraticCurveTo(...P(-0.1, mood === "pain" ? 0.55 : 0.95), ...P(1.08, -0.05)); c.stroke();
        c.strokeStyle = rgba(line, 0.5); c.lineWidth = 1.1; c.beginPath(); c.moveTo(...P(-0.85, -0.5)); c.quadraticCurveTo(...P(-0.1, -1.25), ...P(0.9, -0.55)); c.stroke();
        if (mood === "pain") for (const a of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(...P(1.1, a * 0.5)); c.lineTo(...P(1.45, a)); c.stroke(); }
        continue; }
      c.save(); c.beginPath(); c.moveTo(...P(-1, 0.25)); c.quadraticCurveTo(...P(-0.25, -1.3), ...P(1, -0.2)); c.quadraticCurveTo(...P(0.2, 1.05), ...P(-1, 0.25)); c.closePath();
      c.fillStyle = hex(0xefe5d2); c.fill(); c.clip();
      const r = h * 1.02, ix = cx + sd * 0.04 * w, iy = cy - 0.08 * h, g = c.createRadialGradient(ix, iy, r * 0.2, ix, iy, r); g.addColorStop(0, "#5a3416"); g.addColorStop(0.75, "#2c170b"); g.addColorStop(1, "#120a06");
      c.fillStyle = g; c.beginPath(); c.arc(ix, iy, r, 0, 7); c.fill(); c.fillStyle = "#070403"; c.beginPath(); c.arc(ix, iy, r * 0.44, 0, 7); c.fill();
      c.fillStyle = "rgba(255,255,255,.92)"; c.beginPath(); c.arc(ix - r * 0.32, iy - r * 0.34, r * 0.2, 0, 7); c.fill();
      const sh = c.createLinearGradient(0, cy - h * 1.3, 0, cy + h * 0.2); sh.addColorStop(0, "rgba(40,18,8,.55)"); sh.addColorStop(1, "rgba(40,18,8,0)"); c.fillStyle = sh; c.fillRect(cx - w * 1.2, cy - h * 1.4, w * 2.4, h * 1.6);
      c.restore();
      c.strokeStyle = hex(0x150b07); c.lineWidth = lashW; lid(); c.lineTo(...P(1.26, -0.5)); c.stroke();                                   // the upper lid's dark line, and its flick
      c.strokeStyle = she ? rgba(0x150b07, 0.85) : rgba(line, 0.6); c.lineWidth = she ? 1.6 : 1; c.beginPath(); c.moveTo(...P(1, -0.2)); c.quadraticCurveTo(...P(0.2, 1.05), ...P(-1, 0.25)); c.stroke();   // the lower (kohl, on a woman)
      c.strokeStyle = rgba(line, 0.42); c.lineWidth = 1.1; c.beginPath(); c.moveTo(...P(-0.9, -0.95)); c.quadraticCurveTo(...P(-0.1, -2.0), ...P(1.0, -1.0)); c.stroke();                               // the fold above the lid
    }
    // ---- the brows: a tapered stroke, thick at the nose and thin at the temple
    { const th = (0.0062 + 0.0018 * BR) * bth * sy * (she ? 0.72 : 1) * (kid ? 0.8 : 1), dIn = mood === "shout" ? -0.006 : mood === "pain" ? 0.006 : 0, dOut = mood === "shout" ? 0.002 : mood === "pain" ? -0.003 : 0;
      c.fillStyle = hex(old ? mix(hair, 0xd8d2c6, 0.25) : hair);
      for (const sd of [-1, 1]) { const x0 = X(sd * 0.013), y0 = Y(bz - BR * 0.004 + dIn), x1 = X(sd * 0.04), y1 = Y(bz + 0.0045 + (dIn + dOut) / 2), x2 = X(sd * 0.062), y2 = Y(bz - 0.002 + dOut);
        c.beginPath(); c.moveTo(x0, y0 - th); c.quadraticCurveTo(x1, y1 - th * 1.1, x2, y2); c.quadraticCurveTo(x1, y1 + th * 0.75, x0, y0 + th); c.closePath(); c.fill(); }
      if (mood === "pain" || mood === "shout") { c.strokeStyle = rgba(line, 0.5); c.lineWidth = 1.2; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(X(sd * 0.005), Y(bz + 0.008)); c.lineTo(X(sd * 0.007), Y(bz - 0.004)); c.stroke(); } } }
    // ---- the nose: only its nostrils and the shadow under its tip
    for (const sd of [-1, 1]) { c.fillStyle = rgba(dark, 0.7); c.beginPath(); c.ellipse(X(sd * 0.0105 * NS), Y(nz - 0.0035), 0.0048 * sx, 0.0026 * sy, sd * 0.35, 0, 7); c.fill(); }
    soft(X(0), Y(nz - 0.009), 0.014 * sx, 0.006 * sy, 0x3a1c0e, 0.2);
    // ---- the mouth
    { const w = 0.0235 * lw * sx, uh = 0.0052 * sy, lh = 0.0064 * sy, cx = X(0), lipU = mix(skin, 0x7a2420, she ? 0.62 : 0.44), lipL = mix(skin, 0xa8403a, she ? 0.62 : 0.4);
      let cy = Y(mz), gap = 0;
      if (mood === "shout") gap = 0.0052 * sy; else if (mood === "pain") gap = 0.0022 * sy;
      if (gap) { c.fillStyle = "#210806"; c.beginPath(); c.ellipse(cx, cy + gap, w * (mood === "shout" ? 0.66 : 0.8), gap * 1.25, 0, 0, 7); c.fill();
        c.save(); c.clip(); c.fillStyle = "#e6dcc8"; c.fillRect(cx - w, cy - gap * 0.4, w * 2, gap * (mood === "shout" ? 0.75 : 1.5)); if (mood === "pain") { c.strokeStyle = "rgba(60,30,20,.5)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(cx - w, cy + gap * 0.9); c.lineTo(cx + w, cy + gap * 0.9); c.stroke(); } c.restore(); }
      c.fillStyle = hex(lipU); c.beginPath(); c.moveTo(cx - w, cy); c.quadraticCurveTo(cx - w * 0.5, cy - uh, cx - w * 0.13, cy - uh * 1.08); c.quadraticCurveTo(cx, cy - uh * 0.7, cx + w * 0.13, cy - uh * 1.08); c.quadraticCurveTo(cx + w * 0.5, cy - uh, cx + w, cy); c.quadraticCurveTo(cx, cy + uh * 0.4 - gap * 0.2, cx - w, cy); c.fill();
      const ly = cy + gap * 2; c.fillStyle = hex(lipL); c.beginPath(); c.moveTo(cx - w * 0.9, gap ? ly - gap * 0.6 : cy); c.quadraticCurveTo(cx, ly + lh * 1.9, cx + w * 0.9, gap ? ly - gap * 0.6 : cy); c.quadraticCurveTo(cx, ly + lh * 0.35, cx - w * 0.9, gap ? ly - gap * 0.6 : cy); c.fill();
      soft(cx - w * 0.2, ly + lh * 0.95, w * 0.3, lh * 0.4, 0xffffff, 0.22);
      if (!gap) { c.strokeStyle = rgba(0x30100c, 0.9); c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx - w * 1.04, cy - 0.3); c.quadraticCurveTo(cx, cy + uh * 0.45, cx + w * 1.04, cy - 0.3); c.stroke(); }
      soft(cx, ly + lh * 2.6, w * 0.7, lh * 0.7, 0x3a1c0e, 0.2); }
    c.restore();
  }
  const kept = new Map();
  G.faceTex = function (M, id, skin, hair) {
    if (!M.face || !M.face.eye) return null;
    const key = id + "/" + skin + "/" + hair; let t = kept.get(key);
    if (t) { kept.delete(key); kept.set(key, t); return t; }
    const cv = document.createElement("canvas"); cv.width = cv.height = S * 2; const c = cv.getContext("2d");
    MOODS.forEach((m, i) => paint(c, (i % 2) * S, Math.floor(i / 2) * S, M.face, skin, hair, m));
    t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.userData.keep = true; t.needsUpdate = true;
    kept.set(key, t); if (kept.size > 40) { const [k0, t0] = kept.entries().next().value; kept.delete(k0); t0.dispose(); }
    return t;
  };
})(window.K = window.K || {});
