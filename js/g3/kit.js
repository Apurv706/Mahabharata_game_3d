/* The building kit. Everything in the 3D world is put together here from a handful of solids, coloured per vertex and
   merged, so a whole place is a few draw calls: trees, rocks, huts, houses, pillars, pavilions, walls, a temple, steps,
   tents, stalls, furniture, and the war's chariots, horses, elephants, carts and ranks of soldiers.
     const b = new G.Builder();  b.box(...); G.tree(b, x, z, "banyan", 1, rnd);  group.add(b.mesh());
   Solids are placed by the middle of their base (x, y, z), so "y" is the ground they stand on. */
(function (K) {
  "use strict";
  const T = window.THREE, G = K.G3;
  if (!T) return;
  const V3 = T.Vector3, PI = Math.PI;
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new V3(), _p = new V3(), _v = new V3(), _n = new V3(), _nm = new T.Matrix3(), _c = new T.Color(), _c2 = new T.Color();

  // ---------- Materials shared by everything (kept) ----------
  const keepM = (m) => { m.userData.keep = true; return m; };
  G.mat = {
    vc: keepM(new T.MeshLambertMaterial({ vertexColors: true })),
    vcFlat: keepM(new T.MeshLambertMaterial({ vertexColors: true, flatShading: true })),
    vcDouble: keepM(new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })),
    vcGlow: keepM(new T.MeshBasicMaterial({ vertexColors: true })) // lit from within: flames' cores, lamp bowls, gems
  };
  G.shade = (hex, k) => { _c.set(hex); _c.multiplyScalar(k); return _c.getHex(); };
  G.mix = (a, b, k) => { _c.set(a); _c2.set(b); _c.lerp(_c2, k); return _c.getHex(); };

  // ---------- The builder ----------
  function Builder() { this.pos = []; this.nor = []; this.col = []; this.m = new T.Matrix4(); this.stack = []; this.ao = 0.74; }
  G.Builder = Builder;
  const BP = Builder.prototype;
  // Everything added inside fn is moved to (x, y, z), turned by ry and scaled by s.
  BP.at = function (x, y, z, ry, s, fn) {
    this.stack.push(this.m.clone());
    _e.set(0, ry || 0, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(s || 1, s || 1, s || 1);
    this.m.multiply(new T.Matrix4().compose(_p, _q, _s));
    fn(this);
    this.m.copy(this.stack.pop());
    return this;
  };
  BP.geo = function (g, x, y, z, rx, ry, rz, col, col2) {
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(1, 1, 1);
    _m.compose(_p, _q, _s).premultiply(this.m);
    _nm.getNormalMatrix(_m);
    const ng = g.index ? g.toNonIndexed() : g, P = ng.attributes.position, N = ng.attributes.normal;
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < P.count; i++) { const yy = P.getY(i); if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    const span = Math.max(1e-6, y1 - y0);
    _c.set(col == null ? 0xffffff : col); if (col2 != null) _c2.set(col2);
    const pos = this.pos, nor = this.nor, cl = this.col, ao = this.ao;
    for (let i = 0; i < P.count; i++) {
      const ky = (P.getY(i) - y0) / span, sh = ao + (1 - ao) * ky;
      _v.fromBufferAttribute(P, i).applyMatrix4(_m); pos.push(_v.x, _v.y, _v.z);
      _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize(); nor.push(_n.x, _n.y, _n.z);
      if (col2 != null) cl.push((_c.r + (_c2.r - _c.r) * ky) * sh, (_c.g + (_c2.g - _c.g) * ky) * sh, (_c.b + (_c2.b - _c.b) * ky) * sh);
      else cl.push(_c.r * sh, _c.g * sh, _c.b * sh);
    }
    if (ng !== g) ng.dispose();
    g.dispose();
    return this;
  };
  BP.box = function (w, h, d, x, y, z, col, ry, rx, rz, col2) { return this.geo(new T.BoxGeometry(w, h, d).translate(0, h / 2, 0), x, y, z, rx, ry, rz, col, col2); };
  BP.cyl = function (rt, rb, h, x, y, z, col, seg, ry, rx, rz, col2) { return this.geo(new T.CylinderGeometry(rt, rb, h, seg || 8, 1).translate(0, h / 2, 0), x, y, z, rx, ry, rz, col, col2); };
  BP.cone = function (r, h, x, y, z, col, seg, ry, rx, rz, col2) { return this.geo(new T.ConeGeometry(r, h, seg || 8, 1).translate(0, h / 2, 0), x, y, z, rx, ry, rz, col, col2); };
  BP.sph = function (r, x, y, z, col, sy, seg, sx, sz, col2) { return this.geo(new T.SphereGeometry(r, seg || 8, Math.max(5, Math.round((seg || 8) * 0.7))).scale(sx || 1, sy || 1, sz || 1), x, y, z, 0, 0, 0, col, col2); };
  BP.dome = function (r, x, y, z, col, sy, seg) { return this.geo(new T.SphereGeometry(r, seg || 10, 6, 0, PI * 2, 0, PI / 2).scale(1, sy || 1, 1), x, y, z, 0, 0, 0, col); };
  BP.torus = function (r, t, x, y, z, col, rx, ry, rz, seg) { return this.geo(new T.TorusGeometry(r, t, 6, seg || 14), x, y, z, rx, ry, rz, col); };
  BP.disc = function (r, x, y, z, col, seg) { return this.geo(new T.CircleGeometry(r, seg || 16).rotateX(-PI / 2), x, y, z, 0, 0, 0, col); };
  // A flat sheet lying on the ground (w across x, d across z).
  BP.sheet = function (w, d, x, y, z, col, ry) { return this.geo(new T.PlaneGeometry(w, d).rotateX(-PI / 2), x, y, z, 0, ry, 0, col); };
  // A round bar from a to b.
  BP.rod = function (ax, ay, az, bx, by, bz, r, col, seg, r2) {
    _v.set(bx - ax, by - ay, bz - az); const len = _v.length(); if (len < 1e-5) return this;
    const g = new T.CylinderGeometry(r2 == null ? r : r2, r, len, seg || 6, 1).translate(0, len / 2, 0);
    const q = new T.Quaternion().setFromUnitVectors(new V3(0, 1, 0), _v.clone().normalize());
    g.applyQuaternion(q);
    return this.geo(g, ax, ay, az, 0, 0, 0, col);
  };
  BP.mesh = function (mat, noShadow) {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    const m = new T.Mesh(g, mat || G.mat.vc);
    m.castShadow = !noShadow; m.receiveShadow = true;
    return m;
  };
  BP.empty = function () { return this.pos.length === 0; };

  // ---------- Ground, water, far hills ----------
  // o: { size, seg, col (hex or fn(x, z, r) → hex), h: fn(x, z) → height, tex, rep }
  G.ground = function (o) {
    const size = o.size || 160, seg = o.seg || 56;
    const g = new T.PlaneGeometry(size, size, seg, seg).rotateX(-PI / 2);
    const P = g.attributes.position, cols = [];
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), r = Math.hypot(x, z);
      if (o.h) P.setY(i, o.h(x, z, r));
      _c.set(typeof o.col === "function" ? o.col(x, z, r) : o.col);
      cols.push(_c.r, _c.g, _c.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    // (open ground: trodden earth, fine enough to stand close to; a floor names its own)
    const rep = o.rep || (o.tex ? 28 : Math.round(size / 5.2)), t = G.tex(o.tex || "earth").clone(); t.needsUpdate = true; t.repeat.set(rep, rep);
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true, map: t }));
    m.receiveShadow = true;
    return m;
  };
  // A sheet of water that drifts. shape: [w, d] or a radius.
  G.water = function (shape, y, col, opacity) {
    const g = Array.isArray(shape) ? new T.PlaneGeometry(shape[0], shape[1]).rotateX(-PI / 2) : new T.CircleGeometry(shape, 28).rotateX(-PI / 2);
    const t = G.tex("water").clone(); t.needsUpdate = true; const k = (Array.isArray(shape) ? Math.max(shape[0], shape[1]) : shape * 2) / 14; t.repeat.set(k, k);
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ color: col || 0x3f7f8f, map: t, transparent: true, opacity: opacity == null ? 0.86 : opacity, emissive: col || 0x3f7f8f, emissiveIntensity: 0.18 }));
    m.position.y = y || 0.02; m.receiveShadow = true;
    m.userData.tick = (dt, time) => { t.offset.x = time * 0.012; t.offset.y = Math.sin(time * 0.3) * 0.02; };
    return m;
  };
  // A ring of low hills or mountains far off, to close the horizon.
  G.hills = function (b, o, rnd) {
    const n = o.n || 22, r0 = o.r0 || 95, r1 = o.r1 || 140;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + rnd() * 0.2, r = r0 + rnd() * (r1 - r0), h = (o.h || 14) * (0.5 + rnd()), w = (o.w || 26) * (0.7 + rnd() * 0.8);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (o.arc && !(a > o.arc[0] && a < o.arc[1])) continue;
      if (o.snow) { // peaks: sharp, and white above the line
        b.cone(w, h, x, -1, z, o.col || 0x6b7a5a, 5 + Math.floor(rnd() * 3), rnd() * 3, 0, 0, o.top || null);
        if (h > (o.h || 14) * 0.85) b.cone(w * 0.36, h * 0.36, x, -1 + h * 0.645, z, 0xf4f6fa, 6, 0);
      } else b.geo(new T.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(w * (1 + rnd() * 0.6), h * 0.75, w * (0.8 + rnd() * 0.5)), x, -1, z, 0, rnd() * 3, 0, o.col || 0x6b7a5a, o.top || null); // rounded, low hills
    }
  };

  // ---------- Growing things ----------
  const GREENS = [0x4f7a3a, 0x5c8a40, 0x456b35, 0x6a9248, 0x3f6a3a];
  G.tree = function (b, x, z, kind, s, rnd) {
    s = s || 1; rnd = rnd || Math.random;
    const g = GREENS[Math.floor(rnd() * GREENS.length)], g2 = G.shade(g, 1.25), bark = 0x5a4030;
    b.at(x, 0, z, rnd() * 6.28, s, (b) => {
      if (kind === "palm") {
        const lean = (rnd() - 0.5) * 0.9;
        b.rod(0, 0, 0, lean, 5.6, 0, 0.2, 0x7a6248, 6, 0.13);
        for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28; b.geo(new T.ConeGeometry(0.34, 2.6, 4, 1).translate(0, 1.3, 0).scale(1, 1, 0.18), lean, 5.5, 0, 1.25 + rnd() * 0.3, a, 0, g, g2); }
        b.sph(0.22, lean, 5.45, 0, 0x8a5a2c);
      } else if (kind === "pine") {
        b.cyl(0.14, 0.2, 1.6, 0, 0, 0, bark, 6);
        for (let i = 0; i < 4; i++) b.cone(1.5 - i * 0.3, 1.7, 0, 1.1 + i * 1.05, 0, G.shade(0x2f5a3a, 1 + i * 0.08), 7);
      } else if (kind === "sal") {
        b.cyl(0.16, 0.26, 4.2, 0, 0, 0, bark, 6);
        for (let i = 0; i < 3; i++) b.sph(1.5 - i * 0.25, (rnd() - 0.5) * 0.5, 4.3 + i * 1.1, (rnd() - 0.5) * 0.5, i ? g2 : g, 0.8, 7);
      } else if (kind === "dead") {
        b.cyl(0.1, 0.24, 2.6, 0, 0, 0, 0x4a3a2e, 5);
        for (let i = 0; i < 4; i++) { const a = rnd() * 6.28, l = 0.9 + rnd() * 0.9; b.rod(0, 1.5 + i * 0.3, 0, Math.cos(a) * l, 2.2 + i * 0.4 + rnd() * 0.5, Math.sin(a) * l, 0.07, 0x4a3a2e, 4, 0.02); }
      } else if (kind === "bush") {
        for (let i = 0; i < 3; i++) b.sph(0.55 + rnd() * 0.3, (rnd() - 0.5) * 0.8, 0.4, (rnd() - 0.5) * 0.8, i ? g : g2, 0.75, 6);
      } else if (kind === "banyan") {
        b.cyl(0.55, 0.95, 3.2, 0, 0, 0, bark, 8);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28 + rnd(), r = 2.2 + rnd() * 1.6; b.rod(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(a) * r * 0.9, 3.4, Math.sin(a) * r * 0.9, 0.07, 0x6a4c38, 4); }
        for (let i = 0; i < 9; i++) { const a = rnd() * 6.28, r = rnd() * 3.2; b.sph(2 + rnd() * 1.2, Math.cos(a) * r, 4.6 + rnd() * 1.4, Math.sin(a) * r, i % 3 ? g : g2, 0.62, 7); }
      } else { // mango / plain shade tree
        b.cyl(0.2, 0.34, 2.4, 0, 0, 0, bark, 6);
        b.sph(1.9, 0, 3.5, 0, g, 0.85, 8); b.sph(1.3, 0.9, 3.1, 0.4, g2, 0.8, 7); b.sph(1.2, -0.8, 3.2, -0.5, g, 0.8, 7);
      }
    });
  };
  G.rock = function (b, x, z, s, rnd, col) {
    rnd = rnd || Math.random;
    b.geo(new T.DodecahedronGeometry(s || 0.6, 0).scale(1 + rnd() * 0.5, 0.6 + rnd() * 0.4, 1 + rnd() * 0.5), x, (s || 0.6) * 0.3, z, rnd(), rnd() * 6, rnd() * 0.4, col || 0x8a8378, 0xa49c90);
  };
  G.reeds = function (b, x, z, n, rnd, col) {
    for (let i = 0; i < (n || 8); i++) { const px = x + (rnd() - 0.5) * 1.6, pz = z + (rnd() - 0.5) * 1.6, h = 1 + rnd() * 1.1; b.rod(px, 0, pz, px + (rnd() - 0.5) * 0.4, h, pz + (rnd() - 0.5) * 0.4, 0.035, col || 0x6f8a44, 3, 0.01); if (rnd() < 0.35) b.cyl(0.05, 0.05, 0.22, px, h * 0.82, pz, 0x6a4a2a, 5); }
  };
  G.lotus = function (b, x, z, s, col) {
    b.at(x, 0.05, z, Math.random() * 6, s || 1, (b) => {
      b.cyl(0.42, 0.42, 0.02, 0, 0, 0, 0x3f7a44, 9);
      if (col !== null) { for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; b.geo(new T.SphereGeometry(0.13, 5, 4).scale(0.55, 1.2, 1), Math.cos(a) * 0.1, 0.16, Math.sin(a) * 0.1, 0.5, -a + PI / 2, 0, col || 0xf2a0b8, 0xffe2ea); } b.sph(0.06, 0, 0.16, 0, 0xf2d060); }
    });
  };

  // ---------- Buildings ----------
  G.hut = function (b, x, z, ry, s, wall, roof) {
    b.at(x, 0, z, ry, s || 1, (b) => {
      b.cyl(1.7, 1.8, 1.9, 0, 0, 0, wall || 0xc9a878, 10);
      b.cone(2.5, 1.9, 0, 1.8, 0, roof || 0xb08a4a, 10, 0, 0, 0, 0xd2b070);
      b.box(0.8, 1.4, 0.2, 0, 0, 1.72, 0x3a2416); b.box(1.0, 0.12, 0.3, 0, 1.4, 1.74, 0x7a5232);
    });
  };
  // A flat-roofed house of plaster or stone, with a door, windows and a parapet. o: { w, d, h, wall, trim, lamp, awning }
  G.house = function (b, x, z, ry, o) {
    o = o || {}; const w = o.w || 5, d = o.d || 4, h = o.h || 3, wall = o.wall || 0xd8b98c, trim = o.trim || 0x8a4a2a;
    b.at(x, 0, z, ry, 1, (b) => {
      b.box(w, h, d, 0, 0, 0, wall, 0, 0, 0, G.shade(wall, 1.12));
      b.box(w + 0.3, 0.22, d + 0.3, 0, h, 0, trim);
      b.box(w + 0.1, 0.4, 0.14, 0, h + 0.2, d / 2, G.shade(wall, 0.92)); b.box(w + 0.1, 0.4, 0.14, 0, h + 0.2, -d / 2, G.shade(wall, 0.92));
      b.box(0.14, 0.4, d, w / 2, h + 0.2, 0, G.shade(wall, 0.92)); b.box(0.14, 0.4, d, -w / 2, h + 0.2, 0, G.shade(wall, 0.92));
      b.box(1.0, 1.9, 0.12, 0, 0, d / 2 + 0.02, 0x2e1c10); b.box(1.3, 0.18, 0.2, 0, 1.9, d / 2 + 0.04, trim);
      for (const sx of [-1, 1]) if (w > 4) { b.box(0.6, 0.7, 0.1, sx * w * 0.32, 1.4, d / 2 + 0.02, 0x2e1c10); b.box(0.8, 0.1, 0.16, sx * w * 0.32, 1.3, d / 2 + 0.06, trim); }
      b.box(w + 0.5, 0.3, d + 0.5, 0, -0.05, 0, G.shade(wall, 0.8));
      if (o.awning) { b.box(w * 0.7, 0.06, 1.3, 0, 2.25, d / 2 + 0.7, o.awning, 0, 0.22); b.rod(-w * 0.33, 0, d / 2 + 1.3, -w * 0.33, 2.1, d / 2 + 1.3, 0.05, 0x5a3a22); b.rod(w * 0.33, 0, d / 2 + 1.3, w * 0.33, 2.1, d / 2 + 1.3, 0.05, 0x5a3a22); }
    });
  };
  // A carved pillar: plinth, shaft, flared capital, a gilt band.
  G.pillar = function (b, x, z, h, r, col, gold) {
    h = h || 5; r = r || 0.34; col = col || 0xb98a62; gold = gold == null ? 0xd9a53a : gold;
    b.box(r * 3, 0.3, r * 3, x, 0, z, G.shade(col, 0.85)); b.cyl(r * 1.15, r * 1.3, 0.3, x, 0.3, z, col, 10);
    b.cyl(r * 0.9, r, h - 1.3, x, 0.6, z, col, 10, 0, 0, 0, G.shade(col, 1.15));
    if (gold) { b.cyl(r * 1.04, r * 1.04, 0.14, x, 1.25, z, gold, 10); b.cyl(r * 0.98, r * 0.98, 0.1, x, h - 1.05, z, gold, 10); }
    b.cyl(r * 1.5, r * 0.9, 0.38, x, h - 0.7, z, G.shade(col, 1.08), 10); b.box(r * 3.3, 0.3, r * 3.3, x, h - 0.32, z, G.shade(col, 0.9));
  };
  // A wall from a to b with a walk and merlons.
  G.wall = function (b, ax, az, bx, bz, h, t, col, merlons) {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx);
    b.at((ax + bx) / 2, 0, (az + bz) / 2, ry, 1, (b) => {
      b.box(len, h, t, 0, 0, 0, col, 0, 0, 0, G.shade(col, 1.14));
      b.box(len, 0.2, t + 0.3, 0, h, 0, G.shade(col, 0.86));
      if (merlons !== false) for (let i = 0, n = Math.floor(len / 1.6); i < n; i++) b.box(0.8, 0.6, t + 0.1, -len / 2 + 0.8 + i * (len / n), h + 0.2, 0, col);
    });
  };
  G.tower = function (b, x, z, r, h, col, roof) {
    b.cyl(r, r * 1.1, h, x, 0, z, col, 10, 0, 0, 0, G.shade(col, 1.14)); b.cyl(r * 1.2, r * 1.2, 0.5, x, h, z, G.shade(col, 0.88), 10);
    if (roof) b.cone(r * 1.25, r * 1.6, x, h + 0.5, z, roof, 10); else for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; b.box(0.5, 0.6, 0.4, x + Math.cos(a) * r * 1.1, h + 0.5, z + Math.sin(a) * r * 1.1, col, -a); }
  };
  // A gateway: two piers, a lintel, a crest.
  G.gate = function (b, x, z, ry, w, h, col, gold) {
    b.at(x, 0, z, ry, 1, (b) => {
      for (const s of [-1, 1]) { b.box(1.3, h, 1.5, s * (w / 2 + 0.65), 0, 0, col, 0, 0, 0, G.shade(col, 1.14)); b.box(1.6, 0.3, 1.8, s * (w / 2 + 0.65), h, 0, G.shade(col, 0.85)); b.dome(0.7, s * (w / 2 + 0.65), h + 0.3, 0, gold || 0xd9a53a, 1.2); }
      b.box(w + 2.6, 0.8, 1.3, 0, h - 0.9, 0, G.shade(col, 0.94)); b.box(w + 1, 0.5, 1.0, 0, h - 0.1, 0, col); b.cone(0.5, 1.1, 0, h + 0.4, 0, gold || 0xd9a53a, 6);
    });
  };
  // An open pavilion: a plinth, four pillars, a dome and finial.
  G.pavilion = function (b, x, z, s, col, roof, ry) {
    b.at(x, 0, z, ry || 0, s || 1, (b) => {
      b.box(5.4, 0.45, 5.4, 0, 0, 0, G.shade(col || 0xc9a47a, 0.9)); b.box(4.8, 0.2, 4.8, 0, 0.45, 0, col || 0xc9a47a);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.pillar(b, sx * 2, sz * 2, 3.6, 0.2, col || 0xc9a47a);
      b.box(5.2, 0.35, 5.2, 0, 3.6 + 0.65, 0, G.shade(col || 0xc9a47a, 0.9));
      b.dome(2.3, 0, 4.6, 0, roof || 0xb2432a, 0.75, 12); b.cyl(0.08, 0.12, 0.8, 0, 6.2, 0, 0xd9a53a, 6); b.sph(0.2, 0, 7.05, 0, 0xd9a53a);
    });
  };
  // A small temple: plinth, cell, a stepped spire and its finial.
  G.temple = function (b, x, z, s, col, ry) {
    col = col || 0xc7ae8c;
    b.at(x, 0, z, ry || 0, s || 1, (b) => {
      b.box(6, 0.6, 6, 0, 0, 0, G.shade(col, 0.86)); b.box(3.6, 2.6, 3.6, 0, 0.6, 0, col, 0, 0, 0, G.shade(col, 1.12));
      b.box(1.0, 1.7, 0.1, 0, 0.6, 1.82, 0x24140c);
      for (let i = 0; i < 6; i++) { const k = 1 - i * 0.14; b.box(3.4 * k, 0.75, 3.4 * k, 0, 3.2 + i * 0.75, 0, i % 2 ? G.shade(col, 0.92) : col); }
      b.sph(0.5, 0, 8.0, 0, 0xd9a53a, 0.6); b.cone(0.16, 0.9, 0, 8.25, 0, 0xd9a53a, 6);
      for (const sx of [-1, 1]) G.pillar(b, sx * 1.3, 2.6, 2.6, 0.16, col);
      b.box(3.6, 0.25, 1.4, 0, 3.2, 2.5, G.shade(col, 0.9));
    });
  };
  // Steps going down toward -z from (x, z): a river ghat.
  G.steps = function (b, x, z, ry, w, n, col, top) {
    b.at(x, 0, z, ry, 1, (b) => { for (let i = 0; i < n; i++) b.box(w, 0.26, 0.9, 0, (top || 0) - (i + 1) * 0.26, -i * 0.9 - 0.45, i % 2 ? G.shade(col, 0.92) : col); });
  };
  G.tent = function (b, x, z, ry, s, col, trim) {
    col = col || 0xd8c49a; trim = trim || 0xa3302a;
    b.at(x, 0, z, ry, s || 1, (b) => {
      b.cone(2.2, 2.9, 0, 0, 0, col, 8, 0, 0, 0, G.shade(col, 1.1)); b.cone(0.85, 1.05, 0, 2.05, 0, trim, 8);
      b.cyl(0.04, 0.04, 0.9, 0, 3, 0, 0x5a3a22, 4); b.box(0.5, 0.26, 0.02, 0.27, 3.55, 0, trim);
      b.box(0.9, 1.5, 0.06, 0, 0, 2.02, 0x2a1a10, 0, -0.42);
    });
  };
  // A fair stall: poles, an awning, a counter with wares.
  G.stall = function (b, x, z, ry, col, rnd) {
    b.at(x, 0, z, ry, 1, (b) => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rod(sx * 1.3, 0, sz * 0.9, sx * 1.3, sz < 0 ? 2.5 : 2.1, sz * 0.9, 0.05, 0x5a3a22);
      b.box(3.0, 0.07, 2.2, 0, 2.28, 0, col, 0, 0.19); b.box(3.0, 0.3, 0.05, 0, 1.92, 1.08, G.shade(col, 0.8));
      b.box(2.4, 0.8, 0.9, 0, 0, 0.2, 0x8a6240);
      for (let i = 0; i < 5; i++) b.sph(0.14 + rnd() * 0.08, -0.9 + i * 0.45, 0.94, 0.2 + (rnd() - 0.5) * 0.3, [0xe8a030, 0xc0392b, 0x7aa040, 0xe8d060, 0xb07040][i]);
    });
  };
  G.well = function (b, x, z) { b.cyl(0.9, 1.0, 0.8, x, 0, z, 0x9a8f80, 10); b.cyl(0.7, 0.7, 0.05, x, 0.78, z, 0x1a2a30, 10); b.rod(x - 0.95, 0, z, x - 0.95, 2, z, 0.06, 0x5a3a22); b.rod(x + 0.95, 0, z, x + 0.95, 2, z, 0.06, 0x5a3a22); b.rod(x - 1.05, 2, z, x + 1.05, 2, z, 0.06, 0x5a3a22); };
  G.pot = function (b, x, z, s, col) { s = s || 1; b.sph(0.26 * s, x, 0.24 * s, z, col || 0xa8562e, 0.95); b.cyl(0.12 * s, 0.09 * s, 0.12 * s, x, 0.44 * s, z, col || 0xa8562e, 8); };
  // A lamp on a stand; the flame itself is added by the stage (fx.js) at the returned height.
  G.lampStand = function (b, x, z, h) { b.cyl(0.22, 0.3, 0.12, x, 0, z, 0x8a6a2a, 8); b.cyl(0.035, 0.05, h, x, 0.1, z, 0xb08a3a, 6); b.cyl(0.2, 0.06, 0.1, x, h + 0.1, z, 0xd9a53a, 8); return h + 0.24; };
  G.rack = function (b, x, z, ry) {
    b.at(x, 0, z, ry, 1, (b) => {
      b.rod(-1.2, 0, 0, -1.2, 1.6, 0, 0.05, 0x5a3a22); b.rod(1.2, 0, 0, 1.2, 1.6, 0, 0.05, 0x5a3a22); b.rod(-1.25, 1.4, 0, 1.25, 1.4, 0, 0.04, 0x5a3a22); b.rod(-1.25, 0.5, 0, 1.25, 0.5, 0, 0.04, 0x5a3a22);
      for (let i = 0; i < 5; i++) { const px = -0.9 + i * 0.45; b.rod(px, 0.05, 0.08, px, 2.2, -0.1, 0.022, 0x7a5a36, 4); b.cone(0.05, 0.22, px, 2.18, -0.1, 0xc8c8c8, 4); }
    });
  };
  G.target = function (b, x, z, ry) {
    b.at(x, 0, z, ry, 1, (b) => {
      b.rod(-0.4, 0, 0.3, 0, 1.5, 0, 0.04, 0x5a3a22); b.rod(0.4, 0, 0.3, 0, 1.5, 0, 0.04, 0x5a3a22); b.rod(0, 0, -0.5, 0, 1.5, 0, 0.04, 0x5a3a22);
      b.cyl(0.62, 0.62, 0.16, 0, 1.2, 0.05, 0xd9b26a, 14, 0, PI / 2); b.cyl(0.42, 0.42, 0.02, 0, 1.2, 0.15, 0xf2e6c8, 14, 0, PI / 2); b.cyl(0.22, 0.22, 0.02, 0, 1.2, 0.17, 0xb2432a, 12, 0, PI / 2);
    });
  };
  G.throne = function (b, x, z, ry, col) {
    b.at(x, 0, z, ry, 1, (b) => {
      b.box(2.2, 0.3, 1.8, 0, 0, 0, 0x7a5232); b.box(1.5, 0.5, 1.2, 0, 0.3, 0, col || 0x8a1f24); b.box(1.6, 1.9, 0.2, 0, 0.3, -0.6, 0xd9a53a, 0, 0, 0, 0xf0c860);
      b.box(0.2, 0.5, 1.2, -0.8, 0.8, 0, 0xd9a53a); b.box(0.2, 0.5, 1.2, 0.8, 0.8, 0, 0xd9a53a); b.sph(0.22, 0, 2.35, -0.6, 0xd9a53a);
    });
  };
  G.cushion = function (b, x, z, col, s) { b.geo(new T.SphereGeometry(0.36 * (s || 1), 8, 5).scale(1, 0.26, 1), x, 0.09, z, 0, 0, 0, col || 0xa3302a); };
  G.lowTable = function (b, x, z, w, d, col) { b.box(w, 0.08, d, x, 0.34, z, col || 0x7a5232); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.08, 0.34, 0.08, x + sx * (w / 2 - 0.08), 0, z + sz * (d / 2 - 0.08), col || 0x7a5232); };
  G.cot = function (b, x, z, ry) { b.at(x, 0, z, ry, 1, (b) => { b.box(1.0, 0.08, 2.0, 0, 0.4, 0, 0xd9c79a); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.08, 0.4, 0.08, sx * 0.46, 0, sz * 0.96, 0x5a3418); b.box(0.9, 0.1, 0.4, 0, 0.48, -0.75, 0xe8dcc0); }); };
  G.altar = function (b, x, z, s) { b.at(x, 0, z, PI / 4, s || 1, (b) => { b.box(2.4, 0.3, 2.4, 0, 0, 0, 0xb5764a); b.box(1.8, 0.3, 1.8, 0, 0.3, 0, 0xc48654); b.box(1.2, 0.25, 1.2, 0, 0.6, 0, 0x8a4a2a); b.box(0.9, 0.06, 0.9, 0, 0.84, 0, 0x1a0e08); }); };
  G.cartStatic = function (b, x, z, ry, load) {
    b.at(x, 0, z, ry, 1, (b) => {
      b.box(1.5, 0.12, 2.6, 0, 0.75, 0, 0x7a5232); b.box(0.1, 0.5, 2.6, -0.72, 0.85, 0, 0x6a4628); b.box(0.1, 0.5, 2.6, 0.72, 0.85, 0, 0x6a4628);
      for (const sx of [-1, 1]) { b.cyl(0.72, 0.72, 0.1, sx * 0.86, 0.72, -0.2, 0x4a3018, 12, 0, 0, PI / 2); b.cyl(0.12, 0.12, 0.16, sx * 0.86, 0.72, -0.2, 0xb08a3a, 6, 0, 0, PI / 2); }
      b.rod(0, 0.75, 1.3, 0, 0.55, 3.2, 0.05, 0x5a3a22);
      if (load) { b.box(1.2, 0.6, 1.0, 0, 0.87, -0.6, load); b.sph(0.4, 0.2, 1.2, 0.5, G.shade(load, 1.15), 0.8); b.sph(0.35, -0.3, 1.15, 0.2, G.shade(load, 0.9), 0.8); }
    });
  };
  // What a battle leaves: a broken wheel, splintered shafts, a fallen shield.
  G.wreck = function (b, x, z, rnd) {
    b.at(x, 0, z, rnd() * 6.28, 1, (b) => {
      b.torus(0.7, 0.07, 0, 0.35, 0, 0x4a3018, 1.1 + rnd() * 0.3, 0, 0.2);
      for (let i = 0; i < 4; i++) { const a = rnd() * 6.28; b.rod(Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3, Math.cos(a) * 1.6, 0.1 + rnd() * 0.5, Math.sin(a) * 1.6, 0.035, 0x6a4a2a, 4); }
      b.cyl(0.42, 0.42, 0.06, 1.1, 0.03, -0.6, 0x7a3a2a, 10, 0, 0.3); b.box(1.2, 0.1, 0.7, -0.9, 0.05, 0.7, 0x5a3a22, rnd());
    });
  };
  G.arrowsStuck = function (b, x, z, n, r, rnd) {
    for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = rnd() * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, lx = (rnd() - 0.5) * 0.3, lz = (rnd() - 0.5) * 0.3; b.rod(px, 0, pz, px + lx, 0.75, pz + lz, 0.012, 0xe6c98c, 3); b.box(0.02, 0.14, 0.08, px + lx, 0.66, pz + lz, 0xc8402c); }
  };

  // ---------- Things that move: built as small groups so their parts can turn ----------
  const HORSE_COLS = [0x8a5a34, 0xd8d0c0, 0x4a3426, 0xb08a5a, 0x6a6a6a];
  // A horse: legs are pivots at the shoulder and hip, swung by G.gallop.
  G.horse = function (col, tack) {
    col = col == null ? HORSE_COLS[Math.floor(Math.random() * HORSE_COLS.length)] : col;
    const g = new T.Group(), b = new Builder(), dark = G.shade(col, 0.7);
    b.geo(new T.SphereGeometry(0.42, 8, 6).scale(1, 0.95, 2.0), 0, 1.25, 0, 0, 0, 0, col);
    b.rod(0, 1.45, 0.72, 0, 2.05, 1.12, 0.2, col, 6, 0.14);
    b.geo(new T.SphereGeometry(0.17, 6, 5).scale(1, 1, 1.9), 0, 2.1, 1.28, 0.5, 0, 0, col); b.box(0.06, 0.34, 0.5, 0, 1.75, 0.82, dark, 0, -0.6);
    b.cone(0.04, 0.12, -0.08, 2.24, 1.12, dark, 4); b.cone(0.04, 0.12, 0.08, 2.24, 1.12, dark, 4);
    b.rod(0, 1.35, -0.8, 0, 0.7, -1.15, 0.06, dark, 4, 0.02);
    if (tack) { b.box(0.9, 0.06, 0.7, 0, 1.63, -0.05, tack); b.box(0.92, 0.5, 0.04, 0, 1.2, 0.5, tack); }
    g.add(b.mesh());
    g.userData.legs = [];
    for (const [x, z] of [[-0.2, 0.62], [0.2, 0.62], [-0.2, -0.62], [0.2, -0.62]]) {
      const lb = new Builder(); lb.cyl(0.07, 0.1, 0.55, 0, -0.55, 0, col, 5); lb.cyl(0.05, 0.065, 0.5, 0, -1.03, 0, dark, 5); lb.cyl(0.075, 0.075, 0.08, 0, -1.1, 0, 0x2a1a10, 5);
      const leg = lb.mesh(); leg.position.set(x, 1.1, z); g.add(leg); g.userData.legs.push(leg);
    }
    return g;
  };
  G.gallop = function (horse, t, speed) { const L = horse.userData.legs; if (!L) return; const a = 0.75 * Math.min(1, speed); L[0].rotation.x = Math.sin(t) * a; L[1].rotation.x = Math.sin(t + 0.6) * a; L[2].rotation.x = Math.sin(t + PI) * a; L[3].rotation.x = Math.sin(t + PI + 0.6) * a; horse.children[0].position.y = Math.abs(Math.sin(t)) * 0.07 * Math.min(1, speed); };
  // A war chariot: the car and pole in one piece, two wheels that turn, a team of horses, a standard.
  // o: { col, trim, horses (2), horseCol, flag: [bg, fg, device], canopy }
  G.chariot = function (o) {
    o = o || {}; const col = o.col || 0x7a4e24, trim = o.trim || 0xd9a53a;
    const g = new T.Group(), b = new Builder();
    b.box(1.5, 0.14, 1.9, 0, 0.72, 0, col); b.box(1.5, 0.62, 0.1, 0, 0.86, 0.9, col, 0, 0, 0, G.shade(col, 1.2));
    b.box(0.1, 0.5, 1.9, -0.72, 0.86, 0, col); b.box(0.1, 0.5, 1.9, 0.72, 0.86, 0, col);
    b.box(1.56, 0.07, 0.14, 0, 1.46, 0.9, trim); b.box(0.14, 0.06, 1.9, -0.72, 1.34, 0, trim); b.box(0.14, 0.06, 1.9, 0.72, 1.34, 0, trim);
    b.rod(0, 0.74, 0.9, 0, 0.95, 3.6, 0.06, 0x5a3a22); b.rod(-1.0, 1.02, 3.5, 1.0, 1.02, 3.5, 0.05, 0x5a3a22);
    b.rod(-0.95, 0.72, -0.1, 0.95, 0.72, -0.1, 0.06, 0x3a2414);
    if (o.canopy) { for (const sx of [-1, 1]) b.rod(sx * 0.66, 0.86, -0.85, sx * 0.66, 2.7, -0.85, 0.035, trim); b.geo(new T.SphereGeometry(1.0, 8, 4, 0, PI * 2, 0, PI / 2).scale(1, 0.4, 0.9), 0, 2.7, -0.4, 0, 0, 0, o.canopy); }
    g.add(b.mesh());
    g.userData.wheels = [];
    for (const sx of [-1, 1]) {
      const wb = new Builder(); wb.torus(0.7, 0.07, 0, 0, 0, 0x3a2414, 0, PI / 2, 0, 16);
      for (let i = 0; i < 4; i++) wb.geo(new T.BoxGeometry(0.05, 1.36, 0.06), 0, 0, 0, (i / 4) * PI, 0, 0, 0x8a6236);
      wb.cyl(0.12, 0.12, 0.2, -0.1, 0, 0, trim, 6, 0, 0, PI / 2);
      const w = wb.mesh(); w.position.set(sx * 0.98, 0.72, -0.1); g.add(w); g.userData.wheels.push(w);
    }
    g.userData.horses = [];
    const n = o.horses == null ? 2 : o.horses;
    for (let i = 0; i < n; i++) { const h = G.horse(o.horseCol != null ? o.horseCol : undefined, o.tack || 0xa3302a); h.position.set((i - (n - 1) / 2) * 1.0, 0, 3.4); g.add(h); g.userData.horses.push(h); }
    if (o.flag) { const f = G.banner(2.6, o.flag[0], o.flag[1], o.flag[2], 0.7); f.position.set(-0.6, 0.86, -0.85); g.add(f); g.userData.banner = f; }
    g.userData.deck = 0.86;
    return g;
  };
  // Turn a chariot's wheels and run its horses for a frame.
  G.roll = function (ch, dist, t, speed) { for (const w of ch.userData.wheels || []) w.rotation.x = dist / 0.72; (ch.userData.horses || []).forEach((h, i) => G.gallop(h, t * 11 + i * 1.3, speed)); if (ch.userData.banner) G.wave(ch.userData.banner, t); };
  // A war elephant with a howdah; its legs and trunk are pivots.
  G.elephant = function (cloth) {
    const g = new T.Group(), b = new Builder(), col = 0x7d7a76;
    b.geo(new T.SphereGeometry(1.25, 10, 8).scale(1, 1.05, 1.55), 0, 2.5, 0, 0, 0, 0, col);
    b.geo(new T.SphereGeometry(0.85, 9, 7).scale(1, 1.1, 1), 0, 3.0, 2.0, 0, 0, 0, col);
    for (const sx of [-1, 1]) { b.geo(new T.SphereGeometry(0.75, 8, 5).scale(0.14, 1, 0.8), sx * 0.85, 3.05, 1.75, 0, sx * 0.4, 0, G.shade(col, 0.92)); b.rod(sx * 0.32, 2.5, 2.6, sx * 0.45, 2.0, 3.35, 0.08, 0xf4ecd6, 5, 0.02); }
    b.box(2.3, 0.1, 2.8, 0, 3.72, -0.1, cloth || 0xa3302a); b.box(2.5, 1.2, 0.06, 0, 2.6, 1.0, cloth || 0xa3302a);
    b.box(1.5, 0.5, 1.6, 0, 3.8, -0.2, 0x7a5232); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rod(sx * 0.7, 4.3, -0.2 + sz * 0.75, sx * 0.7, 5.3, -0.2 + sz * 0.75, 0.035, 0xd9a53a);
    b.geo(new T.SphereGeometry(1.1, 8, 4, 0, PI * 2, 0, PI / 2).scale(1, 0.35, 1.05), 0, 5.3, -0.2, 0, 0, 0, 0xd9a53a);
    b.rod(0, 2.6, -1.9, 0, 1.4, -2.2, 0.06, G.shade(col, 0.8), 4, 0.02);
    g.add(b.mesh());
    const tb = new Builder(); tb.rod(0, 0, 0, 0, -1.0, 0.25, 0.26, col, 7, 0.18); tb.rod(0, -1.0, 0.25, 0, -1.9, 0.55, 0.18, col, 7, 0.1);
    const trunk = tb.mesh(); trunk.position.set(0, 2.85, 2.75); g.add(trunk); g.userData.trunk = trunk;
    g.userData.legs = [];
    for (const [x, z] of [[-0.7, 1.2], [0.7, 1.2], [-0.7, -1.2], [0.7, -1.2]]) { const lb = new Builder(); lb.cyl(0.36, 0.4, 1.9, 0, -1.9, 0, col, 8); const leg = lb.mesh(); leg.position.set(x, 1.9, z); g.add(leg); g.userData.legs.push(leg); }
    return g;
  };
  G.stomp = function (el, t, speed) { const L = el.userData.legs, a = 0.3 * Math.min(1, speed); L[0].rotation.x = Math.sin(t) * a; L[3].rotation.x = Math.sin(t) * a; L[1].rotation.x = -Math.sin(t) * a; L[2].rotation.x = -Math.sin(t) * a; el.userData.trunk.rotation.x = Math.sin(t * 0.7) * 0.25; el.children[0].position.y = Math.abs(Math.sin(t)) * 0.05; };

  // ---------- Banners ----------
  // A standard on a pole; its cloth is a small grid whose points are moved to flutter (G.wave).
  G.banner = function (h, bg, fg, device, s) {
    const g = new T.Group(), b = new Builder(); s = s || 1;
    b.cyl(0.035 * s, 0.045 * s, h, 0, 0, 0, 0x5a3a22, 5); b.sph(0.08 * s, 0, h + 0.05, 0, 0xd9a53a);
    g.add(b.mesh());
    const geo = new T.PlaneGeometry(0.8 * s, 1.5 * s, 4, 6); geo.translate(0.4 * s + 0.04, h - 0.8 * s, 0);
    const cloth = new T.Mesh(geo, new T.MeshLambertMaterial({ map: G.bannerTex(bg, fg, device), side: T.DoubleSide }));
    cloth.castShadow = true; g.add(cloth);
    g.userData.cloth = cloth; g.userData.base = geo.attributes.position.array.slice(); g.userData.ph = Math.random() * 6;
    return g;
  };
  G.wave = function (banner, t) {
    const c = banner.userData.cloth; if (!c) return;
    const P = c.geometry.attributes.position, base = banner.userData.base, ph = banner.userData.ph;
    for (let i = 0; i < P.count; i++) { const x = base[i * 3], y = base[i * 3 + 1]; P.setZ(i, Math.sin(t * 3.2 + ph + x * 5 + y * 1.3) * 0.16 * x); }
    P.needsUpdate = true;
  };

  // ---------- Crowds and armies (instanced) ----------
  // One simple person as a single geometry: legs, body, head, and (for soldiers) a shield and an upright spear.
  let personGeo = null, soldierGeo = null, sitterGeo = null;
  function simple(kind) {
    const b = new Builder(); b.ao = 0.8;
    if (kind === "sit") { b.box(0.5, 0.22, 0.5, 0, 0, 0, 0xffffff); b.cyl(0.17, 0.22, 0.5, 0, 0.2, 0, 0xffffff, 6); b.sph(0.13, 0, 0.83, 0, 0xc98a5a); b.sph(0.135, 0, 0.87, -0.02, 0x2a1a12, 0.8); }
    else {
      b.cyl(0.13, 0.17, 0.8, 0, 0, 0, 0xddd2c0, 6); b.cyl(0.2, 0.16, 0.55, 0, 0.8, 0, 0xffffff, 6); b.sph(0.14, 0, 1.52, 0, 0xc98a5a); b.sph(0.145, 0, 1.56, -0.02, 0x2a1a12, 0.8);
      if (kind === "soldier") { b.sph(0.16, 0, 1.6, 0, 0x8a7a5a, 0.7); b.cyl(0.3, 0.3, 0.05, -0.24, 1.1, 0.14, 0xb08a4a, 9, 0, PI / 2); b.rod(0.26, 0.2, 0.05, 0.26, 2.5, 0.05, 0.018, 0x7a5a36, 3); b.cone(0.045, 0.22, 0.26, 2.48, 0.05, 0xd8d8d8, 4); }
    }
    const m = b.mesh(); m.geometry.userData.keep = true; return m.geometry;
  }
  // spots: [[x, z, ry, scale]]; cols: colours picked per person (tints the white cloth); kind: "stand" | "sit" | "soldier"
  G.crowd = function (spots, cols, kind, rnd) {
    const geo = kind === "sit" ? (sitterGeo = sitterGeo || simple("sit")) : kind === "soldier" ? (soldierGeo = soldierGeo || simple("soldier")) : (personGeo = personGeo || simple("stand"));
    const n = spots.length, im = new T.InstancedMesh(geo, G.mat.vc, n), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), c = new T.Color();
    rnd = rnd || Math.random;
    for (let i = 0; i < n; i++) {
      const sp = spots[i], s = (sp[3] || 1) * (0.94 + rnd() * 0.12);
      e.set(0, sp[2] || 0, 0); q.setFromEuler(e); m.compose(new V3(sp[0], sp[4] || 0, sp[1]), q, new V3(s, s, s)); im.setMatrixAt(i, m);
      c.set(cols[Math.floor(rnd() * cols.length)]); im.setColorAt(i, c);
    }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = n < 150; im.receiveShadow = false; im.frustumCulled = false;
    return im;
  };
  // A host drawn up in ranks: blocks of soldiers facing ry, banners among them.
  // o: { x, z, ry, cols, rows, gap, col: [cloth colours], flag: [bg, fg, device], banners }
  G.host = function (o, rnd) {
    const g = new T.Group(), spots = [], cs = Math.cos(o.ry || 0), sn = Math.sin(o.ry || 0), gap = o.gap || 1.25;
    const cols = Math.max(2, Math.round((o.cols || 20) * (G.q.crowd || 1))), rows = Math.max(1, Math.round((o.rows || 4) * (0.5 + 0.5 * (G.q.crowd || 1))));
    const w = (o.cols || 20) * gap, step = w / cols;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const lx = -w / 2 + (c + 0.5) * step + (rnd() - 0.5) * 0.4, lz = -r * gap * 1.15 + (rnd() - 0.5) * 0.4;
      spots.push([o.x + lx * cs + lz * sn, o.z - lx * sn + lz * cs, (o.ry || 0) + (rnd() - 0.5) * 0.3, 1]);
    }
    g.add(G.crowd(spots, o.col || [0xa3302a, 0x8a2a24, 0xb2432a], "soldier", rnd));
    g.userData.banners = [];
    const nb = o.banners == null ? 3 : o.banners;
    for (let i = 0; i < nb; i++) {
      const lx = -w / 2 + ((i + 0.5) / nb) * w, lz = -gap * 0.6, f = G.banner(4.2 + rnd() * 1.2, o.flag[0], o.flag[1], o.flag[2], 1.25);
      f.position.set(o.x + lx * cs + lz * sn, 0, o.z - lx * sn + lz * cs); f.rotation.y = (o.ry || 0) + PI / 2; g.add(f); g.userData.banners.push(f);
    }
    g.userData.tick = (dt, t) => { for (const f of g.userData.banners) G.wave(f, t); };
    return g;
  };
})(window.K = window.K || {});
