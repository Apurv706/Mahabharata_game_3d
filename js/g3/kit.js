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
    const n = o.n || 22, r0 = o.r0 || 95, r1 = o.r1 || 140, main = b; b = new Builder(); // (their own piece, so a painted horizon can stand in for them)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + rnd() * 0.2, r = r0 + rnd() * (r1 - r0), h = (o.h || 14) * (0.5 + rnd()), w = (o.w || 26) * (0.7 + rnd() * 0.8);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (o.arc && !(a > o.arc[0] && a < o.arc[1])) continue;
      if (o.snow) { // peaks: sharp, and white above the line
        b.cone(w, h, x, -1, z, o.col || 0x6b7a5a, 5 + Math.floor(rnd() * 3), rnd() * 3, 0, 0, o.top || null);
        if (h > (o.h || 14) * 0.85) b.cone(w * 0.36, h * 0.36, x, -1 + h * 0.645, z, 0xf4f6fa, 6, 0);
      } else b.geo(new T.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(w * (1 + rnd() * 0.6), h * 0.75, w * (0.8 + rnd() * 0.5)), x, -1, z, 0, rnd() * 3, 0, o.col || 0x6b7a5a, o.top || null); // rounded, low hills
    }
    if (!b.empty()) (main.far = main.far || []).push(b.mesh());
  };

  // ---------- Growing things, and stone ----------
  // A shape made uneven: every point is pushed in or out by an amount that depends only on where it is (so the corners
  // of its faces stay together), and it is left faceted. Rocks and the masses of leaf on a tree are made of these.
  const h3 = (x, y, z) => { const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return v - Math.floor(v); };
  function lumpy(r, detail, amp, seed) {
    const g = new T.IcosahedronGeometry(r, detail), P = g.attributes.position, q = 40 / r;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = 1 + amp * (h3(Math.round(x * q) + seed, Math.round(y * q), Math.round(z * q)) - 0.5) * 2; P.setXYZ(i, x * k, y * k, z * k); }
    g.computeVertexNormals(); return g;
  }
  G.lumpy = lumpy;
  const GREENS = [0x4f7a3a, 0x5c8a40, 0x456b35, 0x6a9248, 0x3f6a3a];
  // A mass of leaves: dark underneath, light where the sun is on it.
  const leaf = (b, r, x, y, z, g, rnd, sy) => b.geo(lumpy(r, 1, 0.2, Math.floor(rnd() * 97)).scale(1, sy || 0.78, 1), x, y, z, 0, rnd() * 6.28, 0, G.shade(g, 0.62), G.shade(g, 1.28));
  G.tree = function (b, x, z, kind, s, rnd) {
    s = s || 1; rnd = rnd || Math.random;
    const g = GREENS[Math.floor(rnd() * GREENS.length)], g2 = G.shade(g, 1.18), bark = 0x5a4030, barkD = 0x45301f;
    b.at(x, 0, z, rnd() * 6.28, s, (b) => {
      if (kind === "palm") {
        const lean = (rnd() - 0.5) * 0.9;
        b.rod(0, 0, 0, lean * 0.4, 2.8, 0, 0.22, 0x7a6248, 7, 0.17); b.rod(lean * 0.4, 2.8, 0, lean, 5.6, 0, 0.17, 0x7a6248, 7, 0.12);
        for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; b.geo(new T.ConeGeometry(0.34, 2.8, 4, 1).translate(0, 1.4, 0).scale(1, 1, 0.16), lean, 5.5, 0, 1.15 + rnd() * 0.45, a, 0, G.shade(g, 0.8), g2); }
        b.sph(0.24, lean, 5.45, 0, 0x8a5a2c); for (let i = 0; i < 3; i++) b.sph(0.11, lean + Math.cos(i * 2.1) * 0.2, 5.25, Math.sin(i * 2.1) * 0.2, 0x6a7a2a, 1, 5);
      } else if (kind === "pine") {
        b.cyl(0.14, 0.22, 1.6, 0, 0, 0, bark, 6, 0, 0, 0, barkD);
        for (let i = 0; i < 5; i++) b.cone(1.55 - i * 0.27, 1.6, 0, 1.0 + i * 0.92, 0, G.shade(0x2f5a3a, 0.8 + i * 0.1), 8, rnd() * 3, 0, 0, G.shade(0x2f5a3a, 1.15 + i * 0.08));
      } else if (kind === "sal") { // tall and straight, its leaf in hanging tiers
        b.cyl(0.15, 0.3, 4.6, 0, 0, 0, bark, 7, 0, 0, 0, barkD); b.cone(0.5, 0.5, 0, 0, 0, barkD, 7);
        for (let i = 0; i < 4; i++) { const a = rnd() * 6.28, r = 0.5 + rnd() * 0.5; if (i < 3) b.rod(0, 3.2 + i * 0.7, 0, Math.cos(a) * r, 4.2 + i * 0.9, Math.sin(a) * r, 0.07, bark, 5, 0.03); leaf(b, 1.45 - i * 0.2, Math.cos(a) * r * 0.8, 4.4 + i * 1.0, Math.sin(a) * r * 0.8, i % 2 ? g2 : g, rnd, 0.82); }
      } else if (kind === "dead") {
        b.cyl(0.1, 0.26, 2.6, 0, 0, 0, 0x4a3a2e, 6);
        for (let i = 0; i < 5; i++) { const a = rnd() * 6.28, l = 0.9 + rnd() * 0.9, y0 = 1.3 + i * 0.3, x1 = Math.cos(a) * l, y1 = 2.2 + i * 0.4 + rnd() * 0.5, z1 = Math.sin(a) * l; b.rod(0, y0, 0, x1, y1, z1, 0.07, 0x4a3a2e, 4, 0.03); b.rod(x1, y1, z1, x1 * 1.5 + rnd() * 0.3, y1 + 0.5 + rnd() * 0.4, z1 * 1.5, 0.03, 0x4a3a2e, 4, 0.01); }
      } else if (kind === "bush") {
        for (let i = 0; i < 4; i++) leaf(b, 0.5 + rnd() * 0.3, (rnd() - 0.5) * 0.9, 0.38 + rnd() * 0.15, (rnd() - 0.5) * 0.9, i % 2 ? g : g2, rnd, 0.8);
      } else if (kind === "banyan") {
        b.cyl(0.55, 1.0, 3.2, 0, 0, 0, bark, 9, 0, 0, 0, barkD); b.cone(1.35, 0.9, 0, 0, 0, barkD, 9);
        for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.28 + rnd(), r = 2.2 + rnd() * 1.6; b.rod(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(a) * r * 0.9, 3.6, Math.sin(a) * r * 0.9, 0.07, 0x6a4c38, 4); b.rod(0, 2.9, 0, Math.cos(a) * r * 0.9, 3.9, Math.sin(a) * r * 0.9, 0.16, bark, 5, 0.09); }
        for (let i = 0; i < 10; i++) { const a = rnd() * 6.28, r = rnd() * 3.4; leaf(b, 1.9 + rnd() * 1.1, Math.cos(a) * r, 4.6 + rnd() * 1.5, Math.sin(a) * r, i % 3 ? g : g2, rnd, 0.66); }
      } else { // mango / plain shade tree: a short bole that forks, a round head of leaf in several masses
        b.cyl(0.21, 0.36, 2.0, 0, 0, 0, bark, 7, 0, 0, 0, barkD); b.cone(0.58, 0.5, 0, 0, 0, barkD, 7);
        const n = 5;
        for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + rnd() * 0.6, r = i ? 1.0 + rnd() * 0.5 : 0, y = i ? 3.0 + rnd() * 0.6 : 3.9; if (i) b.rod(0, 1.8, 0, Math.cos(a) * r * 0.85, y - 0.3, Math.sin(a) * r * 0.85, 0.13, bark, 5, 0.06); leaf(b, i ? 1.15 + rnd() * 0.35 : 1.55, Math.cos(a) * r, y, Math.sin(a) * r, i % 2 ? g2 : g, rnd); }
      }
    });
  };
  // A stone: broken faces, darker toward the ground; a big one has a small one or two lying against it.
  G.rock = function (b, x, z, s, rnd, col) {
    rnd = rnd || Math.random; s = s || 0.6; col = col || 0x8a8378;
    const one = (x, z, s) => b.geo(lumpy(s, 1, 0.24, Math.floor(rnd() * 97)).scale(1 + rnd() * 0.5, 0.62 + rnd() * 0.4, 1 + rnd() * 0.5), x, s * 0.26, z, rnd() * 0.4, rnd() * 6, rnd() * 0.3, G.shade(col, 0.72), G.shade(col, 1.2));
    one(x, z, s);
    if (s > 0.4) for (let i = 0, n = 1 + Math.floor(rnd() * 2); i < n; i++) { const a = rnd() * 6.28; one(x + Math.cos(a) * s * 1.15, z + Math.sin(a) * s * 1.15, s * (0.3 + rnd() * 0.25)); }
  };
  // Tufts of grass: a few blades each.
  G.tuft = function (b, x, z, s, rnd, col) {
    rnd = rnd || Math.random; s = s || 1; col = col || 0x7a8a42;
    for (let i = 0, n = 4 + Math.floor(rnd() * 3); i < n; i++) { const a = rnd() * 6.28, l = (0.22 + rnd() * 0.2) * s; b.geo(new T.ConeGeometry(0.035 * s, l, 3).translate(0, l / 2, 0), x + Math.cos(a) * 0.08 * s, 0, z + Math.sin(a) * 0.08 * s, (rnd() - 0.5) * 0.7, a, (rnd() - 0.5) * 0.7, G.shade(col, 0.7), G.shade(col, 1.2)); }
  };
  // A far range seen edge-on: a wall of ground round the field whose top rises and falls, the colour of the distance at
  // its foot and its own colour along the crest. Nearer than a painted horizon, so it moves against it as the view turns.
  // o: { r, h, base, col (foot), top (crest), snow (crest colour above 0.8 h), n }
  G.ridges = function (o, rnd) {
    const n = o.n || 120, pos = [], col = [], idx = [], cb = new T.Color(o.col), ct = new T.Color(o.top == null ? o.col : o.top), cs = o.snow != null ? new T.Color(o.snow) : null, ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
    for (let i = 0; i <= n; i++) {
      const a = (i % n) / n * PI * 2, k = 0.5 + 0.26 * Math.sin(a * 2 + ph[0]) + 0.2 * Math.sin(a * 5 + ph[1]) + 0.13 * Math.sin(a * 11 + ph[2]) + 0.08 * Math.sin(a * 23 + ph[3]), hh = Math.max(0.6, o.h * k);
      const x = Math.sin(a) * o.r, z = Math.cos(a) * o.r, c = cs && k > 0.8 ? cs : ct;
      pos.push(x, o.base == null ? -1 : o.base, z, x * 1.03, hh, z * 1.03); col.push(cb.r, cb.g, cb.b, c.r, c.g, c.b);
      if (i < n) { const j = i * 2; idx.push(j, j + 2, j + 1, j + 1, j + 2, j + 3); }
    }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new T.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, fog: false, side: T.DoubleSide })); m.frustumCulled = false;
    return m;
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
  G.pillar = function (b, x, z, h, r, col, gold) {   // a stepped foot, a pot-bellied base, an eight-sided shaft banded in gold, a lotus cap under a square slab with brackets
    h = h || 5; r = r || 0.34; col = col || 0xb98a62; gold = gold == null ? 0xd9a53a : gold; const dk = G.shade(col, 0.8), lt = G.shade(col, 1.14);
    b.box(r * 3.3, 0.16, r * 3.3, x, 0, z, dk); b.box(r * 2.8, 0.16, r * 2.8, x, 0.16, z, G.shade(col, 0.9));
    b.geo(new T.SphereGeometry(r * 1.32, 10, 6).scale(1, 0.62, 1), x, 0.54, z, 0, 0, 0, dk, col);
    b.cyl(r * 0.86, r * 0.98, h - 1.75, x, 0.76, z, col, 8, 0, 0, 0, lt);
    if (gold) { b.cyl(r * 1.04, r * 1.04, 0.1, x, 0.86, z, gold, 8); b.cyl(r * 1.0, r * 1.0, 0.08, x, 1.5, z, gold, 8); b.cyl(r * 0.95, r * 0.95, 0.08, x, h - 1.55, z, gold, 8); b.cyl(r * 0.93, r * 0.93, 0.06, x, h - 1.3, z, gold, 8); }
    for (let i = 0; i < 3 && h > 4.5; i++) b.cyl(r * 0.95, r * 0.95, 0.045, x, 2.2 + i * ((h - 4.4) / 3), z, dk, 8);
    b.geo(new T.SphereGeometry(r * 1.2, 10, 5).scale(1, 0.5, 1), x, h - 0.98, z, 0, 0, 0, col, lt); b.cyl(r * 1.55, r * 1.0, 0.3, x, h - 0.9, z, lt, 10); b.box(r * 3.5, 0.26, r * 3.5, x, h - 0.6, z, G.shade(col, 0.92));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.box(dx ? r * 1.5 : r * 0.9, 0.34, dz ? r * 1.5 : r * 0.9, x + dx * r * 1.9, h - 0.34, z + dz * r * 1.9, dk);
  };
  // A cusped arch between two points at a height, with the wall over it up to the roof.
  G.arch = function (b, ax, az, bx, bz, y, top, col, gold) {
    const mx = (ax + bx) / 2, mz = (az + bz) / 2, d = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az) + PI / 2, R_ = d / 2 - 0.2;
    b.geo(new T.TorusGeometry(R_, 0.13, 6, 14, PI).scale(1, 0.62, 1), mx, y, mz, 0, ry, 0, G.shade(col, 0.86), col);
    if (gold) b.geo(new T.TorusGeometry(R_ - 0.16, 0.035, 5, 14, PI).scale(1, 0.62, 1), mx, y, mz, 0, ry, 0, gold);
    for (let i = 1; i < 6; i++) { const a = (i / 6) * PI; b.sph(0.1, mx + Math.cos(ry) * Math.cos(a) * (R_ - 0.3), y + Math.sin(a) * (R_ - 0.3) * 0.62, mz - Math.sin(ry) * Math.cos(a) * (R_ - 0.3), gold || col, 1, 6); }
    if (top > y + R_ * 0.62) b.box(d, top - (y + R_ * 0.62) + 0.05, 0.36, mx, y + R_ * 0.62 - 0.05, mz, G.shade(col, 0.9), 0, ry, 0, G.shade(col, 0.72));
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
  // ---------- Beasts modelled in Blender (tools/blender/props.py, after the artist's sheets): G.PROPS ----------
  // A prop is one set of points with named parts and colour roles; a part that swings (a leg, the trunk) is written about
  // its own joint (pivots). Until a prop's file has arrived the code-built beast below stands in for it.
  const b64 = (s) => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  function propData(P) {
    if (P._d) return P._d;
    const p16 = new Int16Array(b64(P.pos).buffer), pos = new Float32Array(P.n * 3); for (let i = 0; i < P.n * 3; i++) pos[i] = p16[i] / P.scale;
    const n8 = new Int8Array(b64(P.nor).buffer), nor = new Float32Array(P.n * 3); for (let i = 0; i < P.n * 3; i++) nor[i] = n8[i] / 127;
    P.pos = P.nor = null;
    return (P._d = { pa: new T.BufferAttribute(pos, 3), na: new T.BufferAttribute(nor, 3), col: b64(P.col), idx: new Uint16Array(b64(P.idx).buffer), geo: new Map() });
  }
  // The named parts of a prop as one mesh, its roles coloured as asked ({ coat: 0x7a4a2a, tack: 0x8a1f24 }).
  G.propMesh = function (name, parts, roleCols) {
    const P = G.PROPS && G.PROPS[name]; if (!P) return null;
    const D = propData(P), list = (Array.isArray(parts) ? parts : [parts]).filter((k) => P.parts[k]);
    const cols = P.roles.map((r, i) => new T.Color(roleCols && roleCols[r] != null ? roleCols[r] : P.cols[i])), ck = cols.map((c) => c.getHexString()).join(""), key = list.join(",") + "|" + ck;
    let geo = D.geo.get(key);
    if (!geo) {
      let ca = D.geo.get("c|" + ck);
      if (!ca) { const col = new Float32Array(P.n * 3); for (let i = 0; i < P.n; i++) { const q = cols[D.col[i]]; col[i * 3] = q.r; col[i * 3 + 1] = q.g; col[i * 3 + 2] = q.b; } ca = new T.BufferAttribute(col, 3); D.geo.set("c|" + ck, ca); }
      let len = 0; for (const k of list) len += P.parts[k][1];
      const idx = new Uint16Array(len); let o = 0; for (const k of list) { const [st, l] = P.parts[k]; idx.set(D.idx.subarray(st, st + l), o); o += l; }
      geo = new T.BufferGeometry(); geo.setAttribute("position", D.pa); geo.setAttribute("normal", D.na); geo.setAttribute("color", ca); geo.setIndex(new T.BufferAttribute(idx, 1)); geo.userData.keep = true; D.geo.set(key, geo);
    }
    const m = new T.Mesh(geo, G.mat.vc), pv = P.pivots[list[0]]; if (pv) m.position.set(pv[0], pv[1], pv[2]); m.frustumCulled = false;
    return m;
  };
  function beast(name, body, legs, rc, extra) {   // a body, four legs that swing from the shoulder and the hip, and anything else that moves
    const g = new T.Group(); g.add(G.propMesh(name, body, rc)); g.userData.legs = legs.map((l) => { const m = G.propMesh(name, l, rc); g.add(m); return m; });
    for (const k in extra || {}) { const m = G.propMesh(name, extra[k], rc); g.add(m); g.userData[k] = m; }
    return g;
  }
  G.horse = function (col, tack) {
    col = col == null ? HORSE_COLS[Math.floor(Math.random() * HORSE_COLS.length)] : col;
    if (G.PROPS && G.PROPS.horse) { const t = !!tack, L = (k) => (t ? [k, k + "t"] : [k]); return beast("horse", t ? ["body", "tack"] : ["body"], [L("legFL"), L("legFR"), L("legHL"), L("legHR")], { coat: col, dark: G.shade(col, 0.5), tack: tack || 0x8a1f24 }); }
    const g = new T.Group(), b = new Builder(), dark = G.shade(col, 0.62), GOLDH = 0xd9a53a;
    b.geo(new T.SphereGeometry(0.42, 14, 9).scale(1, 0.95, 1.95), 0, 1.25, 0, 0, 0, 0, col);                    // the barrel
    b.geo(new T.SphereGeometry(0.4, 12, 8).scale(1.02, 1.05, 0.9), 0, 1.3, 0.55, 0, 0, 0, col);                 // the chest and shoulders
    b.geo(new T.SphereGeometry(0.41, 12, 8).scale(1.04, 1.02, 0.95), 0, 1.3, -0.5, 0, 0, 0, col);               // the quarters
    b.rod(0, 1.42, 0.72, 0, 1.98, 1.08, 0.22, col, 9, 0.15);                                                     // the neck, arched
    b.geo(new T.SphereGeometry(0.17, 10, 7).scale(1, 1.05, 1.5), 0, 2.08, 1.2, 0.55, 0, 0, col);                 // the head
    b.geo(new T.SphereGeometry(0.11, 8, 6).scale(1, 0.95, 1.5), 0, 1.93, 1.43, 0.6, 0, 0, G.shade(col, 0.86));   // the muzzle
    for (const sx of [-1, 1]) { b.cone(0.04, 0.13, sx * 0.085, 2.25, 1.1, dark, 5); b.sph(0.022, sx * 0.105, 2.1, 1.3, 0x140c08, 1, 5); }
    for (let i = 0; i < 7; i++) b.geo(new T.BoxGeometry(0.05, 0.2 - i * 0.012, 0.13), 0, 2.08 - i * 0.085, 0.98 - i * 0.055, -0.62, 0, 0, dark); // the mane
    b.sph(0.07, 0, 2.3, 1.14, dark, 1.2, 6);                                                                     // the forelock
    b.rod(0, 1.42, -0.82, 0, 1.05, -1.08, 0.065, dark, 6, 0.04); b.rod(0, 1.05, -1.08, 0, 0.55, -1.12, 0.05, dark, 6, 0.015); // the tail
    b.torus(0.115, 0.014, 0, 1.97, 1.36, 0x2a1a10, 0.6, 0, 0, 10); b.rod(0, 2.2, 1.17, 0, 1.99, 1.38, 0.012, 0x2a1a10, 4);   // the bridle
    if (tack) { // a saddle cloth with a border, a band across the chest hung with a boss, a plume between the ears
      b.geo(new T.SphereGeometry(0.435, 12, 6, 0, PI * 2, 0, PI * 0.5).scale(1.03, 0.9, 0.95), 0, 1.3, -0.05, 0, 0, 0, tack);
      for (const sx of [-1, 1]) b.box(0.03, 0.05, 0.8, sx * 0.44, 1.22, -0.05, GOLDH);
      b.torus(0.4, 0.035, 0, 1.36, 0.62, tack, 0.35, 0, 0, 14); b.sph(0.06, 0, 1.12, 0.93, GOLDH, 1, 7);
      b.cone(0.045, 0.2, 0, 2.38, 1.1, tack, 6); b.sph(0.03, 0, 2.3, 1.1, GOLDH, 1, 5);
      // The dress of a war team: a gold plate down the face, a collar of gold bosses with red tassels, a girth, a crupper, a ribbon in the tail.
      b.geo(new T.BoxGeometry(0.07, 0.24, 0.02), 0, 2.1, 1.33, 1.02, 0, 0, GOLDH); b.sph(0.028, 0, 2.2, 1.27, 0xc8402c, 1, 5);
      b.torus(0.285, 0.04, 0, 1.6, 0.86, GOLDH, 0.95, 0, 0, 14);
      for (let k = -3; k <= 3; k++) { const a = k * 0.36, x = Math.sin(a) * 0.3, y = 1.44 - Math.cos(a) * 0.2, z = 0.98 - Math.abs(k) * 0.035; b.sph(0.034, x, y, z, k % 2 ? GOLDH : 0xf4d67a, 1, 5); b.cone(0.028, 0.12, x, y - 0.02, z, k % 2 ? 0xc8402c : tack, 5, 0, PI); }
      b.torus(0.425, 0.022, 0, 1.25, 0.18, GOLDH, 0, 0, 0, 14); b.torus(0.42, 0.02, 0, 1.3, -0.62, tack, 0.25, 0, 0, 12);
      for (const sx of [-1, 1]) { b.rod(sx * 0.3, 1.58, 0.5, sx * 0.36, 1.5, -0.5, 0.014, tack, 4); b.sph(0.04, sx * 0.4, 1.3, -0.62, GOLDH, 1, 5); }
      b.torus(0.07, 0.02, 0, 1.2, -0.98, 0xc8402c, PI / 2, 0, 0, 8);
    }
    g.add(b.mesh());
    g.userData.legs = [];
    for (const [x, z] of [[-0.2, 0.62], [0.2, 0.62], [-0.2, -0.62], [0.2, -0.62]]) {
      const lb = new Builder(); lb.cyl(0.115, 0.075, 0.55, 0, -0.55, 0, col, 8); lb.sph(0.07, 0, -0.56, 0, col, 1, 6); lb.cyl(0.062, 0.05, 0.47, 0, -1.03, 0, dark, 7); lb.cyl(0.066, 0.08, 0.09, 0, -1.11, 0.01, 0x2a1a10, 7); if (tack) lb.torus(0.062, 0.016, 0, -0.98, 0, GOLDH, PI / 2, 0, 0, 8);
      const leg = lb.mesh(); leg.position.set(x, 1.1, z); g.add(leg); g.userData.legs.push(leg);
    }
    return g;
  };
  G.gallop = function (horse, t, speed) { const L = horse.userData.legs; if (!L) return; const a = 0.75 * Math.min(1, speed); L[0].rotation.x = Math.sin(t) * a; L[1].rotation.x = Math.sin(t + 0.6) * a; L[2].rotation.x = Math.sin(t + PI) * a; L[3].rotation.x = Math.sin(t + PI + 0.6) * a; horse.children[0].position.y = Math.abs(Math.sin(t)) * 0.07 * Math.min(1, speed); };
  // A war chariot: the car and pole in one piece, two wheels that turn, a team of horses, a standard.
  // o: { col, trim, horses (2), horseCol, flag: [bg, fg, device], canopy }
  G.chariot = function (o) {
    o = o || {}; const col = o.col || 0x7a4e24, trim = o.trim || 0xd9a53a, lite = G.shade(col, 1.22), deep = G.shade(col, 0.72), IRON = 0x3a342c;
    const g = new T.Group(), b = new Builder();
    b.box(1.5, 0.12, 1.9, 0, 0.72, 0, deep);                                                                   // the floor
    // The breastwork: a curved front, panelled, with a gold boss on each panel and a rail along its top; lower sides; open behind.
    b.geo(new T.CylinderGeometry(0.75, 0.75, 0.66, 14, 1, true, -PI / 2, PI).scale(1, 1, 0.5), 0, 1.17, 0.58, 0, 0, 0, col, lite);
    b.geo(new T.TorusGeometry(0.75, 0.04, 6, 14, PI).rotateX(PI / 2).scale(1, 1, 0.5), 0, 1.5, 0.58, 0, PI, 0, trim);
    b.geo(new T.TorusGeometry(0.76, 0.03, 5, 14, PI).rotateX(PI / 2).scale(1, 1, 0.5), 0, 0.86, 0.58, 0, PI, 0, trim);
    for (let i = -2; i <= 2; i++) { const a = i * 0.52; b.geo(new T.CylinderGeometry(0.075, 0.075, 0.03, 10).rotateX(PI / 2), Math.sin(a) * 0.76, 1.18, 0.58 + Math.cos(a) * 0.385, 0, a, 0, trim); b.sph(0.03, Math.sin(a) * 0.775, 1.18, 0.58 + Math.cos(a) * 0.395, 0xf4d67a, 1, 6); }
    for (const sx of [-1, 1]) { b.box(0.08, 0.46, 1.5, sx * 0.72, 0.84, -0.2, col, 0, 0, 0, lite); b.box(0.1, 0.05, 1.54, sx * 0.72, 1.3, -0.2, trim);
      for (let k = 0; k < 4; k++) b.cyl(0.03, 0.03, 0.5, sx * 0.72, 0.82, -0.86 + k * 0.42, deep, 6);
      b.geo(new T.CylinderGeometry(0.06, 0.06, 0.035, 9).rotateZ(PI / 2), sx * 0.765, 1.06, -0.24, 0, 0, 0, trim); }
    // Carving, as the paintings have it: a lotus wheel on each side, bosses along the rails, a scroll curling up behind and a prow under the front.
    for (const sx of [-1, 1]) {
      b.geo(new T.CylinderGeometry(0.2, 0.2, 0.03, 14).rotateZ(PI / 2), sx * 0.77, 1.0, -0.2, 0, 0, 0, trim); b.sph(0.05, sx * 0.79, 1.0, -0.2, 0xf4d67a, 1, 6);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * PI * 2; b.sph(0.034, sx * 0.785, 1.0 + Math.sin(a) * 0.13, -0.2 + Math.cos(a) * 0.13, 0xf4d67a, 1, 4); }
      for (let k = 0; k < 6; k++) b.sph(0.03, sx * 0.72, 1.35, -0.9 + k * 0.28, 0xf4d67a, 1, 4);
      b.geo(new T.BoxGeometry(0.03, 0.2, 0.5), sx * 0.765, 0.98, 0.3, 0, 0, 0, trim); b.geo(new T.BoxGeometry(0.03, 0.2, 0.36), sx * 0.765, 0.98, -0.68, 0, 0, 0, trim);
      b.geo(new T.TorusGeometry(0.3, 0.045, 6, 12, PI * 1.35).rotateY(PI / 2), sx * 0.72, 1.42, -0.98, 0, 0, 0, trim); b.sph(0.07, sx * 0.72, 1.42, -0.98, 0xf4d67a, 1, 6);
    }
    b.geo(new T.TorusGeometry(0.22, 0.05, 6, 10, PI * 1.2).rotateY(PI / 2), 0, 0.62, 1.02, 0, 0, 0, trim); b.box(1.56, 0.05, 1.96, 0, 0.7, 0, trim);
    // A case of arrows on the right rail and a spare bow on the left; the pole, the yoke with its two saddles; the axle.
    b.cyl(0.085, 0.07, 0.6, 0.6, 0.9, -0.62, 0x5a3a22, 8); for (let k = 0; k < 5; k++) b.rod(0.6 + (k - 2) * 0.025, 1.5, -0.62 + (k % 2) * 0.03, 0.6 + (k - 2) * 0.03, 1.72, -0.62 + (k % 2) * 0.03, 0.009, k % 2 ? 0xa3302a : 0xe8e0d0, 3);
    b.geo(new T.TorusGeometry(0.42, 0.018, 4, 10, PI * 0.9).rotateY(PI / 2), -0.64, 1.25, -0.5, 0, 0, 0.5, 0x6a4a26);
    b.rod(0, 0.76, 0.9, 0, 1.0, 3.62, 0.06, 0x5a3a22, 7); b.rod(-1.05, 1.06, 3.5, 1.05, 1.06, 3.5, 0.05, 0x5a3a22, 6); for (const sx of [-1, 1]) { b.sph(0.07, sx * 1.05, 1.06, 3.5, trim, 1, 6); b.torus(0.16, 0.03, sx * 0.5, 1.12, 3.5, 0x3a2414, 0, 0, 0, 8); }
    b.rod(-1.0, 0.72, -0.1, 1.0, 0.72, -0.1, 0.06, IRON, 6);
    for (const sx of [-1, 1]) b.rod(sx * 0.35, 1.5, 0.95, sx * 0.5, 1.98, 4.6, 0.008, 0x2a1a10, 3);                // the reins
    if (o.canopy) { // the umbrella of a king, domed in two tiers on gilded posts: ribs, a hanging fringe, a pot-and-point finial
      for (const sx of [-1, 1]) { b.rod(sx * 0.66, 0.86, -0.85, sx * 0.66, 2.72, -0.85, 0.034, trim, 6); for (const y of [1.5, 2.1]) b.sph(0.05, sx * 0.66, y, -0.85, 0xf4d67a, 1, 5); }
      const cz = -0.4, dk = G.shade(o.canopy, 0.84);
      b.geo(new T.SphereGeometry(1.0, 18, 5, 0, PI * 2, 0, PI / 2).scale(1, 0.38, 0.9), 0, 2.7, cz, 0, 0, 0, o.canopy, dk);
      b.geo(new T.SphereGeometry(0.5, 14, 5, 0, PI * 2, 0, PI / 2).scale(1, 0.62, 0.9), 0, 3.02, cz, 0, 0, 0, o.canopy, dk);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * PI * 2; b.rod(0, 3.1, cz, Math.sin(a) * 1.0, 2.71, cz + Math.cos(a) * 0.9, 0.013, trim, 3); }
      b.geo(new T.TorusGeometry(1.0, 0.035, 5, 22).rotateX(PI / 2).scale(1, 1, 0.9), 0, 2.69, cz, 0, 0, 0, trim); b.geo(new T.TorusGeometry(0.5, 0.03, 5, 16).rotateX(PI / 2).scale(1, 1, 0.9), 0, 3.03, cz, 0, 0, 0, trim);
      for (let k = 0; k < 20; k++) { const a = (k / 20) * PI * 2, x = Math.sin(a) * 1.0, z = cz + Math.cos(a) * 0.9; b.cone(0.045, 0.16, x, 2.69, z, k % 2 ? trim : 0xa3302a, 5, 0, PI); b.sph(0.026, x, 2.52, z, 0xf4d67a, 1, 4); }
      b.sph(0.1, 0, 3.4, cz, trim, 1, 8); b.cyl(0.05, 0.07, 0.08, 0, 3.3, cz, trim, 7); b.cone(0.045, 0.2, 0, 3.48, cz, 0xf4d67a, 6);
    }
    g.add(b.mesh());
    g.userData.wheels = [];
    for (const sx of [-1, 1]) { // a wheel: eight spokes, a wooden felloe shod with iron, a nave capped in gold
      const wb = new Builder(); wb.torus(0.68, 0.06, 0, 0, 0, 0x6a4a26, 0, PI / 2, 0, 22); wb.torus(0.73, 0.03, 0, 0, 0, IRON, 0, PI / 2, 0, 22);
      for (let i = 0; i < 6; i++) wb.geo(new T.BoxGeometry(0.045, 1.34, 0.05), 0, 0, 0, (i / 6) * PI, 0, 0, 0x8a6236); for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; wb.sph(0.022, 0, Math.sin(a) * 0.705, Math.cos(a) * 0.705, trim, 1, 4); }
      wb.cyl(0.14, 0.14, 0.2, -0.1, 0, 0, 0x5a3a22, 8, 0, 0, PI / 2); wb.cyl(0.09, 0.07, 0.07, sx * 0.13 - 0.035, 0, 0, trim, 8, 0, 0, PI / 2);
      const w = wb.mesh(); w.position.set(sx * 0.98, 0.72, -0.1); g.add(w); g.userData.wheels.push(w);
    }
    g.userData.horses = [];
    const n = o.horses == null ? 2 : o.horses;
    for (let i = 0; i < n; i++) { const h = G.horse(o.horseCol != null ? o.horseCol : undefined, o.tack || 0xa3302a); h.position.set((i - (n - 1) / 2) * 1.0, 0, 3.4); g.add(h); g.userData.horses.push(h); }
    if (o.flag) { const f = G.banner(o.canopy ? 4.05 : 3.35, o.flag[0], o.flag[1], o.flag[2], 0.7); /* (tall: the cloth flies above the heads, and above the umbrella) */ f.position.set(-0.74, 0.86, -0.92); g.add(f); g.userData.banner = f; } // the standard, at the rear corner, clear of the one who rides
    g.userData.deck = 0.86;
    return g;
  };
  // Turn a chariot's wheels and run its horses for a frame.
  G.roll = function (ch, dist, t, speed) { for (const w of ch.userData.wheels || []) w.rotation.x = dist / 0.72; (ch.userData.horses || []).forEach((h, i) => G.gallop(h, t * 11 + i * 1.3, speed)); if (ch.userData.banner) G.wave(ch.userData.banner, t); };
  // A war elephant with a howdah; its legs and trunk are pivots.
  function howdah(b, cloth, GOLDE) {
    // The howdah: a railed box with posts and a canopy; the driver's goad stands beside it.
    b.box(1.6, 0.14, 1.7, 0, 3.72, -0.2, 0x5a3a22); for (const sx of [-1, 1]) { b.box(0.07, 0.5, 1.7, sx * 0.78, 3.86, -0.2, 0x7a5232, 0, 0, 0, 0x9a6a3c); b.box(0.09, 0.05, 1.74, sx * 0.78, 4.36, -0.2, GOLDE); }
    for (const sz of [-1, 1]) { b.box(1.6, 0.5, 0.07, 0, 3.86, -0.2 + sz * 0.83, 0x7a5232, 0, 0, 0, 0x9a6a3c); b.box(1.64, 0.05, 0.09, 0, 4.36, -0.2 + sz * 0.83, GOLDE); for (let k = -1; k <= 1; k++) b.sph(0.05, k * 0.5, 4.1, -0.2 + sz * 0.87, GOLDE, 1, 6); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rod(sx * 0.72, 4.36, -0.2 + sz * 0.77, sx * 0.72, 5.32, -0.2 + sz * 0.77, 0.035, GOLDE, 6);
    b.geo(new T.SphereGeometry(1.1, 14, 5, 0, PI * 2, 0, PI / 2).scale(1, 0.38, 1.05), 0, 5.3, -0.2, 0, 0, 0, GOLDE, 0xf0cf70); b.sph(0.09, 0, 5.74, -0.2, GOLDE, 1.4, 7);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * PI * 2; b.sph(0.04, Math.sin(a) * 1.1, 5.24, -0.2 + Math.cos(a) * 1.15, k % 2 ? cloth : 0xf4ecd6, 1.6, 4); }
    b.rod(0.35, 3.8, 1.2, 0.35, 4.7, 1.3, 0.02, 0x3a342c, 4); b.cone(0.05, 0.14, 0.35, 4.7, 1.3, 0x8a8a8a, 5);
  }
  G.elephant = function (cloth) {
    if (G.PROPS && G.PROPS.elephant) { const g = beast("elephant", ["body", "cloth"], ["legFL", "legFR", "legHL", "legHR"], { tack: cloth || 0xa3302a }, { trunk: "trunk" }), hb = new Builder(); howdah(hb, cloth || 0xa3302a, 0xd9a53a); g.children[0].add(hb.mesh()); /* (it rides the body, and rocks with it) */ return g; }
    const g = new T.Group(), b = new Builder(), col = 0x7d7a76, dk = G.shade(col, 0.82), GOLDE = 0xd9a53a; cloth = cloth || 0xa3302a;
    b.geo(new T.SphereGeometry(1.25, 16, 11).scale(1, 1.05, 1.55), 0, 2.5, 0, 0, 0, 0, col);                                  // the body
    b.geo(new T.SphereGeometry(0.85, 14, 10).scale(1, 1.1, 1), 0, 3.0, 2.0, 0, 0, 0, col);                                   // the head, with its two domes
    for (const sx of [-1, 1]) { b.sph(0.4, sx * 0.3, 3.72, 1.95, col, 0.8, 8);
      b.geo(new T.SphereGeometry(0.78, 10, 7).scale(0.12, 1.05, 0.82), sx * 0.88, 3.0, 1.72, 0, sx * 0.45, 0, G.shade(col, 0.92)); b.geo(new T.SphereGeometry(0.6, 8, 6).scale(0.1, 0.9, 0.7), sx * 0.9, 2.95, 1.75, 0, sx * 0.45, 0, 0xb09a94); // the ears
      b.rod(sx * 0.32, 2.5, 2.6, sx * 0.47, 2.0, 3.4, 0.085, 0xf4ecd6, 7, 0.022); b.torus(0.075, 0.02, sx * 0.4, 2.22, 3.05, GOLDE, 0.9, 0, 0, 8); b.torus(0.05, 0.016, sx * 0.44, 2.08, 3.27, GOLDE, 0.9, 0, 0, 8); // the tusks, ringed in gold
      b.sph(0.05, sx * 0.5, 3.2, 2.62, 0x140c08, 1, 6); }
    // Its trappings: a great cloth over the back with a gold border and tassels, a frontlet on the brow, a girth with a bell.
    b.geo(new T.SphereGeometry(1.29, 16, 7, 0, PI * 2, 0, PI * 0.5).scale(1, 0.92, 1.25), 0, 2.66, -0.1, 0, 0, 0, cloth, G.shade(cloth, 0.8));
    for (const sx of [-1, 1]) { b.box(0.05, 0.1, 3.0, sx * 1.27, 2.62, -0.1, GOLDE); for (let k = 0; k < 6; k++) b.sph(0.06, sx * 1.27, 2.5, -1.35 + k * 0.5, k % 2 ? GOLDE : 0xf4ecd6, 1.5, 5); }
    b.geo(new T.SphereGeometry(0.87, 10, 5, 0, PI * 2, 0, PI * 0.42).scale(0.8, 1, 1), 0, 3.08, 2.02, 0.85, 0, 0, cloth); b.sph(0.12, 0, 3.5, 2.72, GOLDE, 1, 8); b.sph(0.07, 0, 3.25, 2.83, 0xb2432a, 1, 6);
    b.torus(1.3, 0.05, 0, 2.5, 0.6, 0x5a3a22, 0, 0, 0, 18); b.sph(0.11, 0, 1.2, 0.6, GOLDE, 1.2, 7);
    howdah(b, cloth, GOLDE);
    b.rod(0, 2.7, -1.88, 0, 1.6, -2.18, 0.07, dk, 5, 0.03); b.sph(0.09, 0, 1.52, -2.2, 0x2a2420, 1.5, 5);                     // the tail
    g.add(b.mesh());
    const tb = new Builder(); tb.rod(0, 0, 0, 0, -1.0, 0.25, 0.27, col, 9, 0.19); tb.rod(0, -1.0, 0.25, 0, -1.9, 0.55, 0.19, col, 9, 0.1); tb.sph(0.11, 0, -1.92, 0.57, dk, 1, 6);
    const trunk = tb.mesh(); trunk.position.set(0, 2.85, 2.75); g.add(trunk); g.userData.trunk = trunk;
    g.userData.legs = [];
    for (const [x, z] of [[-0.7, 1.2], [0.7, 1.2], [-0.7, -1.2], [0.7, -1.2]]) { const lb = new Builder(); lb.cyl(0.4, 0.34, 1.9, 0, -1.9, 0, col, 10); lb.cyl(0.36, 0.38, 0.14, 0, -1.9, 0, dk, 10); lb.torus(0.36, 0.035, 0, -1.55, 0, GOLDE, PI / 2, 0, 0, 12); for (let k = -1; k <= 1; k++) lb.sph(0.07, k * 0.16, -1.86, 0.33, 0xe8e0d0, 0.6, 5); const leg = lb.mesh(); leg.position.set(x, 1.9, z); g.add(leg); g.userData.legs.push(leg); }
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
