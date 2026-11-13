/* Herding cattle (the 3D game's own; where the herd test is a line of people led out of a fire, it stays a line: games.js).
   A herd is not a row of beasts to be touched one by one. Cattle keep together, go the way their neighbours go, keep a
   body's width apart, and move away from a herder: so you work the herd from behind, toward the gap you want it through.
   They have weight (they gather way and turn in their own time) and nerves: come within a few strides and a cow walks
   off; come close and she trots; come right up to her, or run at her, and she bolts, and may take her neighbours with her.
   A cow that has bolted runs blind for a few seconds: she will not keep with the herd and will not mind deep water.
   Calm cattle shy from the water's edge on their own.
     R = U.herdRules(o, rng)   o: { need, lose, secs, calm } (calm 0..1: how steady your own hand makes them)
     R.step(dt, hx, hz, hv)    the herder's place and pace -> what happened: across, lost, spook, end
   Places are metres on the field (x across, z toward the eye); the ford is a gap in the right-hand edge. */
(function (K) {
  "use strict";
  const U = (K.UI = K.UI || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HERD = {
    X: 11, Z: 8,                       // half the field
    FORD: { z: -0.5, half: 2.5 },      // the gap in the right-hand edge
    FLEE: 4.6, CLOSE: 1.45,            // a cow gives way from this far (m); nearer than CLOSE she bolts
    RUSH: 3.5, RUSH_R: 3.0,            // run at her faster than RUSH (m/s) within RUSH_R (m) and she bolts
    WALK: 1.0, TROT: 3.0, BOLT: 6.4,   // her paces (m/s)
    SPOOK: 2.6, CATCH: 0.45,           // how long she runs blind (s); the chance a neighbour within 2.6 m goes with her
    SEP: 1.25, NEIGH: 6.5,             // a body's room; how far she counts others as her herd
    SHY: 1.5                           // a calm cow keeps this far from deep water (m)
  };
  U.HERD = HERD;
  U.herdRules = function (o, rng) {
    const H = HERD, need = o.need || 6, lose = o.lose || 3, calm = clamp(o.calm || 0, 0, 1), cows = [], haz = [];
    const R = { cows, haz, need, lose, got: 0, lost: 0, spooks: 0, left: o.secs || 50, secs: o.secs || 50, t: 0, over: false, outcome: null, ford: H.FORD };
    // Deep water either side of the ford's mouth, and a pool out in the field.
    haz.push({ x: H.X - 2.3, z: H.FORD.z - H.FORD.half - 2.3, r: 2.0 }, { x: H.X - 2.4, z: H.FORD.z + H.FORD.half + 2.2, r: 1.9 }, { x: -1 + (rng() - 0.5) * 5, z: (rng() < 0.5 ? -1 : 1) * (3.2 + rng() * 2), r: 1.5 });
    // The herd: three loose bunches on the far side of the field from the ford.
    const at = [[-7.5, -3.5], [-4.5, 3.2], [-8.2, 3.8]];
    for (let i = 0; i < need + 3; i++) { const b = at[i % 3]; let x, z, ok, g = 0;
      do { x = b[0] + (rng() - 0.5) * 3.6; z = b[1] + (rng() - 0.5) * 3.2; ok = !cows.some((c) => Math.hypot(c.x - x, c.z - z) < 1.3) && !haz.some((h) => Math.hypot(h.x - x, h.z - z) < h.r + 1.2); } while (!ok && g++ < 30);
      cows.push({ x, z, vx: 0, vz: 0, a: rng() * 6.28, spook: 0, bx: 0, bz: 0, wa: rng() * 6.28, gone: null, i }); }
    const inMouth = (z) => Math.abs(z - H.FORD.z) < H.FORD.half;
    R.centre = () => { let x = 0, z = 0, n = 0; for (const c of cows) if (!c.gone) { x += c.x; z += c.z; n++; } return n ? { x: x / n, z: z / n, n } : { x: 0, z: 0, n: 0 }; };
    R.step = (dt, hx, hz, hv) => {
      const ev = [], at2 = (type, x) => ev.push(Object.assign({ type }, x));
      if (R.over) return ev;
      R.t += dt; R.left -= dt;
      const bolt = (c, ang, chain) => { if (c.spook > 0 || c.gone) return; c.spook = H.SPOOK * (0.8 + rng() * 0.4); const a = ang + (rng() - 0.5) * 1.5; c.bx = Math.sin(a); c.bz = Math.cos(a); R.spooks++; at2("spook", { c, chain: !!chain }); };
      for (const c of cows) {
        if (c.gone) continue;
        let wx = 0, wz = 0, sx = 0, sz = 0, mx = 0, mz = 0, avx = 0, avz = 0, n = 0;
        for (const q of cows) { if (q === c || q.gone) continue; const dx = c.x - q.x, dz = c.z - q.z, d = Math.hypot(dx, dz);
          if (d < H.NEIGH) { mx += q.x; mz += q.z; avx += q.vx; avz += q.vz; n++; }
          if (d < H.SEP && d > 1e-4) { sx += (dx / d) * (H.SEP - d) * 3.4; sz += (dz / d) * (H.SEP - d) * 3.4; } }
        const hdx = c.x - hx, hdz = c.z - hz, hd = Math.hypot(hdx, hdz) || 1e-4, press = hd < H.FLEE ? 1 - hd / H.FLEE : 0;
        if (c.spook <= 0 && (hd < H.CLOSE || (hd < H.RUSH_R && hv > H.RUSH * (1 + 0.3 * calm)))) {
          bolt(c, Math.atan2(hdx, hdz), false);
          for (const q of cows) if (q !== c && !q.gone && q.spook <= 0 && Math.hypot(q.x - c.x, q.z - c.z) < 2.6 && rng() < H.CATCH * (1 - 0.4 * calm)) bolt(q, Math.atan2(q.x - hx, q.z - hz), true);
        }
        let top = H.TROT, acc = 5.5;
        if (c.spook > 0) { c.spook -= dt; const k = 0.45 + 0.55 * clamp(c.spook / H.SPOOK, 0, 1); wx = c.bx * H.BOLT * k + sx; wz = c.bz * H.BOLT * k + sz; top = H.BOLT; acc = 14; }
        else {
          if (press > 0) { const sp = H.TROT * (0.3 + 0.95 * press); wx += (hdx / hd) * sp; wz += (hdz / hd) * sp; }
          if (n) { const cx = mx / n - c.x, cz = mz / n - c.z, cl = Math.hypot(cx, cz), k = Math.min(1.7, cl * (0.3 + 0.9 * press)) / (cl || 1); wx += cx * k; wz += cz * k; wx += (avx / n - c.vx) * 0.55; wz += (avz / n - c.vz) * 0.55; }
          for (const h of haz) { const dx = c.x - h.x, dz = c.z - h.z, d = Math.hypot(dx, dz), e = d - h.r; if (e < H.SHY && d > 1e-4) { const k = (H.SHY - e) * 2.4; wx += (dx / d) * k; wz += (dz / d) * k; } }
          if (press === 0 && Math.hypot(wx, wz) < 0.25) { c.wa += (rng() - 0.5) * dt * 3; const g = Math.max(0, Math.sin(R.t * 0.5 + c.i * 1.7)) * 0.3; wx += Math.sin(c.wa) * g; wz += Math.cos(c.wa) * g; }   // at grass: a step now and then
          wx += sx; wz += sz;
        }
        // the field's edges (the bank, the thorn fence): she turns along them; the ford's mouth is open
        if (c.x < -H.X + 1.2) wx += (-H.X + 1.2 - c.x) * 3; if (c.z < -H.Z + 1.2) wz += (-H.Z + 1.2 - c.z) * 3; if (c.z > H.Z - 1.2) wz -= (c.z - H.Z + 1.2) * 3;
        if (c.x > H.X - 1.2 && !inMouth(c.z)) wx -= (c.x - H.X + 1.2) * 3;
        const wl = Math.hypot(wx, wz); if (wl > top) { wx *= top / wl; wz *= top / wl; }
        const ax = wx - c.vx, az = wz - c.vz, al = Math.hypot(ax, az), am = acc * dt; if (al <= am) { c.vx = wx; c.vz = wz; } else { c.vx += (ax / al) * am; c.vz += (az / al) * am; }
        c.x += c.vx * dt; c.z += c.vz * dt;
        c.x = Math.max(-H.X, c.x); c.z = clamp(c.z, -H.Z, H.Z); if (!inMouth(c.z)) c.x = Math.min(H.X, c.x);
        const sp = Math.hypot(c.vx, c.vz); c.sp = sp;
        if (sp > 0.2) { let da = Math.atan2(c.vx, c.vz) - c.a; da = Math.atan2(Math.sin(da), Math.cos(da)); const tr = (c.spook > 0 ? 6.5 : 3.2) * dt; c.a += clamp(da, -tr, tr); }
        if (c.x > H.X - 0.2 && inMouth(c.z)) { c.gone = "across"; R.got++; at2("across", { c }); continue; }
        for (const h of haz) if (Math.hypot(c.x - h.x, c.z - h.z) < h.r - 0.15) { c.gone = "lost"; R.lost++; at2("lost", { c }); break; }
      }
      const end = (outcome) => { R.over = true; R.outcome = outcome; at2("end", { outcome }); };
      const alive = cows.filter((c) => !c.gone).length;
      if (R.got >= need) end("win");
      else if (R.lost >= lose || R.got + alive < need) end(R.got >= need - 1 ? "close" : "lose");
      else if (R.left <= 0) end(R.got >= need - 1 ? "close" : "lose");
      return ev;
    };
    return R;
  };
  // A herder who knows the work (for the checks, and to show it can be done): if a beast has strayed, go round behind her
  // and bring her in; when the herd is together, get behind it on the side away from the ford and walk it there. Never
  // closer than a few strides, and never at a run near them. -> { x, z, v }: where to head, and at what pace.
  U.herdBot = function (R, hx, hz) {
    const H = HERD, live = R.cows.filter((c) => !c.gone); if (!live.length) return { x: hx, z: hz, v: 0 };
    const g = R.centre(), goal = { x: H.X + 1.5, z: H.FORD.z }; let far = null, fd = 0;
    for (const c of live) { const d = Math.hypot(c.x - g.x, c.z - g.z); if (d > fd) { fd = d; far = c; } }
    let tx, tz;
    if (fd > 1.9 + 0.75 * Math.sqrt(live.length) && live.length > 1) { const dx = far.x - g.x, dz = far.z - g.z, l = Math.hypot(dx, dz) || 1; tx = far.x + (dx / l) * 3.0; tz = far.z + (dz / l) * 3.0; }   // collect the stray
    else { const dx = g.x - goal.x, dz = g.z - goal.z, l = Math.hypot(dx, dz) || 1, back = 2.7 + 0.5 * Math.sqrt(live.length); tx = g.x + (dx / l) * back; tz = g.z + (dz / l) * back; }               // drive the herd
    tx = clamp(tx, -H.X + 0.3, H.X - 0.3); tz = clamp(tz, -H.Z + 0.3, H.Z - 0.3);
    let near = 99, nc = null; for (const c of live) { const d = Math.hypot(c.x - hx, c.z - hz); if (d < near) { near = d; nc = c; } }
    let dx = tx - hx, dz = tz - hz; const dl = Math.hypot(dx, dz) || 1e-4; dx /= dl; dz /= dl;
    // going round: do not walk through the herd to get behind it
    const toG = Math.hypot(g.x - hx, g.z - hz), dot = ((g.x - hx) * dx + (g.z - hz) * dz) / (toG || 1);
    if (dl > 3 && toG < 4.5 + Math.sqrt(live.length) && dot > 0.6) { const sgn = (g.x - hx) * dz - (g.z - hz) * dx > 0 ? 1 : -1; const px = -dz * sgn, pz = dx * sgn; dx = dx * 0.35 + px * 0.95; dz = dz * 0.35 + pz * 0.95; const l = Math.hypot(dx, dz); dx /= l; dz /= l; }
    if (near < 2.0 && nc) { const ax = hx - nc.x, az = hz - nc.z, al = Math.hypot(ax, az) || 1; dx = dx * 0.4 + (ax / al) * 0.9; dz = dz * 0.4 + (az / al) * 0.9; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    const v = near < 3.6 ? 2.4 : Math.min(4.6, 1.2 + dl * 1.3);
    return { x: hx + dx * 3, z: hz + dz * 3, v: Math.min(v, dl * 3) };
  };
})(window.K = window.K || {});
