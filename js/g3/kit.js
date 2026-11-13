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
    vcGlow: keepM(new T.MeshBasicMaterial({ vertexColors: true })), // lit from within: flames' cores, lamp bowls, gems
    surf: G.surfMat ? G.surfMat({ map: 0 }) : null, surfD: G.surfMat ? G.surfMat({ map: 0, side: T.DoubleSide }) : null, surfSide: G.surfMat ? G.surfMat({ map: 2 }) : null // what a thing is made of (js/g3/surf.js): wood, worked metal, leather, painted and woven things
  };
  // The wind. Whatever was built "windy" (a tree, reeds, grass) leans with it and comes back, and its leaves stir: each
  // point carries how far it bends (more the higher it stands above its root) and how much it flutters. Everything else
  // carries nothing, and stands still. One clock for all of it; it stops with calm motion.
  G.windU = { value: 0 };
  const WIND_P = "\nattribute vec2 wind; uniform float uWindT;\n",
    WIND_M = "\n{ float wp = uWindT * 1.25 + position.x * 0.21 + position.z * 0.17, wg = 0.62 + 0.38 * sin(uWindT * 0.33 + position.x * 0.05 + position.z * 0.03);\n  transformed.x += wind.x * wg * (sin(wp) * 0.7 + sin(wp * 2.7 + 1.3) * 0.3 + 0.45) + wind.y * sin(uWindT * 3.1 + position.y * 3.1 + position.z * 4.7);\n  transformed.z += wind.x * wg * cos(wp * 0.83) * 0.5 + wind.y * cos(uWindT * 2.7 + position.x * 5.3 + position.y * 2.2); }\n";
  G.windy = (m, key) => { const was = m.onBeforeCompile; m.onBeforeCompile = (sh, r) => { if (was) was(sh, r); sh.uniforms.uWindT = G.windU; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>" + WIND_P).replace("#include <begin_vertex>", "#include <begin_vertex>" + WIND_M); }; m.customProgramCacheKey = () => key; return m; };
  G.windy(G.mat.vc, "vcw"); G.windy(G.mat.vcFlat, "vcfw"); G.windy(G.mat.vcDouble, "vcdw");
  if (G.mat.surf && G.mat.surf.defines) { G.windy(G.mat.surf, "surf0w"); G.windy(G.mat.surfD, "surf0w"); }
  G.mat.windDepth = G.windy(keepM(new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking })), "wdepth"); // (so the shadow of a tree moves with the tree)
  if (G.onFrame) G.onFrame((dt, t) => { if (!(K.UI && K.UI.calm && K.UI.calm())) G.windU.value = t; });
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
  // What the solids added from here on are made of (js/g3/surf.js): b.surf("wood"), b.surf("gold"), b.surf("paint", 0xd9a53a, 0.2, "rim", 0xd9a53a, 0.03); b.surf() ends it.
  //   p: the surface, c2: its figure's colour, cell: the figure's size in metres, b / c3 / bw: a border, its colour and its width (on a board's faces, a pole's ends)
  const _sa = new Uint8Array(4), _sb = new Uint8Array(4), _sc = new Uint8Array(4), _e1 = new V3(), _e2 = new V3(), _du = new V3(), _dv = new V3();
  const LEVEL = { stone: 1, plaster: 1, mud: 1, thatch: 1, sun: 1, lotus: 1, cane: 1, bands: 1, carve: 1 }; // (surfaces whose figure runs level on a wall, whichever way the wall is longer)
  BP.surf = function (p, c2, cell, b, c3, bw) {
    if (!G.surfPut) return this;
    if (!this.sA && p) { const n = this.pos.length / 3; this.sP = new Array(n * 4).fill(0); this.sA = new Array(n * 4).fill(0); this.sB = new Array(n * 4).fill(0); this.sC = new Array(n * 4).fill(0); }
    this.sf = p ? { p, c2, cell, b, c3, bw } : null;
    return this;
  };
  // What is added inside fn bends in the wind: k is how far (metres, at a metre above where it is rooted; it grows as
  // the square of the height), lf how much its leaves flutter (only what is added as leaf: see `leafy`).
  BP.windy = function (k, lf, fn) {
    const was = this.wk; if (!this.wd) this.wd = new Array((this.pos.length / 3) * 2).fill(0);
    this.wk = { k, lf: lf || 0, f: 0, y0: _p.setFromMatrixPosition(this.m).y }; fn(this); this.wk = was; return this;
  };
  BP.leafy = function (fn) { const w = this.wk; if (w) w.f = w.lf; fn(this); if (w) w.f = 0; return this; };
  BP.geo = function (g, x, y, z, rx, ry, rz, col, col2) {
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(1, 1, 1);
    _m.compose(_p, _q, _s).premultiply(this.m);
    _nm.getNormalMatrix(_m);
    const ng = g.index ? g.toNonIndexed() : g, P = ng.attributes.position, N = ng.attributes.normal;
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < P.count; i++) { const yy = P.getY(i); if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    const span = Math.max(1e-6, y1 - y0);
    _c.set(col == null ? 0xffffff : col); if (col2 != null) _c2.set(col2);
    const pos = this.pos, nor = this.nor, cl = this.col, ao = this.ao, wd = this.wd, wk = this.wk;
    for (let i = 0; i < P.count; i++) {
      const ky = (P.getY(i) - y0) / span, sh = ao + (1 - ao) * ky;
      _v.fromBufferAttribute(P, i).applyMatrix4(_m); pos.push(_v.x, _v.y, _v.z);
      if (wd) { if (wk) { const h = Math.max(0, _v.y - wk.y0); wd.push(wk.k * h * h, wk.f); } else wd.push(0, 0); }
      _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize(); nor.push(_n.x, _n.y, _n.z);
      if (col2 != null) cl.push((_c.r + (_c2.r - _c.r) * ky) * sh, (_c.g + (_c2.g - _c.g) * ky) * sh, (_c.b + (_c2.b - _c.b) * ky) * sh);
      else cl.push(_c.r * sh, _c.g * sh, _c.b * sh);
    }
    if (this.sA) { // the surface's own coordinates: metres across each face (a board) or round and along (a pole), from the solid's own mapping
      const sf = this.sf, UV = ng.attributes.uv, n = P.count, sP = this.sP, sA = this.sA, sB = this.sB, sC = this.sC, base = pos.length - n * 3;
      if (!sf || !UV) { for (let i = 0; i < n; i++) { sP.push(0, 0, 99, 99); sA.push(0, 0, 0, 0); sB.push(0, 0, 255, 0); sC.push(0, 0, 0, 0); } }
      else {
        const flat = g.type === "BoxGeometry" || g.type === "PlaneGeometry", swap = g.type === "TubeGeometry" || g.type === "TorusGeometry", ends = g.type === "CylinderGeometry", level = LEVEL[sf.p] === 1, su = new Float32Array(n), sv = new Float32Array(n);
        let au = 0, av = 0, aw = 0;
        for (let i = 0; i < n; i += 3) {
          const o = base + i * 3; _e1.set(pos[o + 3] - pos[o], pos[o + 4] - pos[o + 1], pos[o + 5] - pos[o + 2]); _e2.set(pos[o + 6] - pos[o], pos[o + 7] - pos[o + 1], pos[o + 8] - pos[o + 2]);
          const u1 = UV.getX(i + 1) - UV.getX(i), v1 = UV.getY(i + 1) - UV.getY(i), u2 = UV.getX(i + 2) - UV.getX(i), v2 = UV.getY(i + 2) - UV.getY(i), det = u1 * v2 - u2 * v1;
          let a = 0, c = 0; if (Math.abs(det) > 1e-9) { _du.copy(_e1).multiplyScalar(v2).addScaledVector(_e2, -v1).divideScalar(det); _dv.copy(_e2).multiplyScalar(u1).addScaledVector(_e1, -u2).divideScalar(det); a = _du.length(); c = _dv.length(); }
          su[i] = su[i + 1] = su[i + 2] = a; sv[i] = sv[i + 1] = sv[i + 2] = c; const ar = _e1.cross(_e2).length(); if (a < 50 && c < 50) { au += a * ar; av += c * ar; aw += ar; }
        }
        au /= aw || 1; av /= aw || 1;
        for (let i = 0; i < n; i++) {
          const a = flat ? su[i] : au, c = flat ? sv[i] : av, u = UV.getX(i), v = UV.getY(i); let pu = (u - 0.5) * a, pv = (v - 0.5) * c, hx = flat ? a / 2 : 99, hy = flat || ends ? c / 2 : 99;
          if (swap || (flat && a > c && !level)) { let t = pu; pu = pv; pv = t; t = hx; hx = hy; hy = t; }
          G.surfPut(_sa, _sb, _sc, 0, sf, 1); sP.push(pu, pv, hx, hy); sA.push(_sa[0], _sa[1], _sa[2], _sa[3]); sB.push(_sb[0], _sb[1], _sb[2], _sb[3]); sC.push(_sc[0], _sc[1], _sc[2], _sc[3]);
        }
      }
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
    if (this.wd) g.setAttribute("wind", new T.Float32BufferAttribute(this.wd, 2));
    g.computeBoundingSphere();
    if (this.sA) { G.surfAttrs(g, new Uint8Array(this.sA), new Uint8Array(this.sB), new Uint8Array(this.sC), new T.Float32BufferAttribute(this.sP, 4)); mat = mat === G.mat.vcDouble ? G.mat.surfD : !mat || mat === G.mat.vc ? G.mat.surf : mat; }
    const m = new T.Mesh(g, mat || G.mat.vc);
    m.castShadow = !noShadow; m.receiveShadow = true;
    if (this.wd && !noShadow) m.customDepthMaterial = G.mat.windDepth;
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
  const leaf = (b, r, x, y, z, g, rnd, sy) => b.leafy((b) => b.geo(lumpy(r, 1, 0.2, Math.floor(rnd() * 97)).scale(1, sy || 0.78, 1), x, y, z, 0, rnd() * 6.28, 0, G.shade(g, 0.62), G.shade(g, 1.28)));
  const WINDS = { palm: [0.006, 0.014], pine: [0.003, 0.007], sal: [0.0022, 0.012], dead: [0.0012, 0], bush: [0.05, 0.012], banyan: [0.0016, 0.014] }; // (how far each kind of tree gives, and how much its leaf stirs)
  G.tree = function (b, x, z, kind, s, rnd) {
    s = s || 1; rnd = rnd || Math.random;
    const g = GREENS[Math.floor(rnd() * GREENS.length)], g2 = G.shade(g, 1.18), bark = 0x5a4030, barkD = 0x45301f;
    const wn = WINDS[kind] || [0.0045, 0.014];
    b.at(x, 0, z, rnd() * 6.28, s, (b) => b.windy(wn[0] / (s * s), wn[1], (b) => {
      if (kind === "palm") {
        const lean = (rnd() - 0.5) * 0.9;
        b.rod(0, 0, 0, lean * 0.4, 2.8, 0, 0.22, 0x7a6248, 7, 0.17); b.rod(lean * 0.4, 2.8, 0, lean, 5.6, 0, 0.17, 0x7a6248, 7, 0.12);
        b.leafy((b) => { for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; b.geo(new T.ConeGeometry(0.34, 2.8, 4, 1).translate(0, 1.4, 0).scale(1, 1, 0.16), lean, 5.5, 0, 1.15 + rnd() * 0.45, a, 0, G.shade(g, 0.8), g2); } });
        b.sph(0.24, lean, 5.45, 0, 0x8a5a2c); for (let i = 0; i < 3; i++) b.sph(0.11, lean + Math.cos(i * 2.1) * 0.2, 5.25, Math.sin(i * 2.1) * 0.2, 0x6a7a2a, 1, 5);
      } else if (kind === "pine") {
        b.cyl(0.14, 0.22, 1.6, 0, 0, 0, bark, 6, 0, 0, 0, barkD);
        b.leafy((b) => { for (let i = 0; i < 5; i++) b.cone(1.55 - i * 0.27, 1.6, 0, 1.0 + i * 0.92, 0, G.shade(0x2f5a3a, 0.8 + i * 0.1), 8, rnd() * 3, 0, 0, G.shade(0x2f5a3a, 1.15 + i * 0.08)); });
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
    }));
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
    b.windy(0.25 / (s * s), 0, (b) => { for (let i = 0, n = 4 + Math.floor(rnd() * 3); i < n; i++) { const a = rnd() * 6.28, l = (0.22 + rnd() * 0.2) * s; b.geo(new T.ConeGeometry(0.035 * s, l, 3).translate(0, l / 2, 0), x + Math.cos(a) * 0.08 * s, 0, z + Math.sin(a) * 0.08 * s, (rnd() - 0.5) * 0.7, a, (rnd() - 0.5) * 0.7, G.shade(col, 0.7), G.shade(col, 1.2)); } });
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
    b.windy(0.035, 0, (b) => { for (let i = 0; i < (n || 8); i++) { const px = x + (rnd() - 0.5) * 1.6, pz = z + (rnd() - 0.5) * 1.6, h = 1 + rnd() * 1.1; b.rod(px, 0, pz, px + (rnd() - 0.5) * 0.4, h, pz + (rnd() - 0.5) * 0.4, 0.035, col || 0x6f8a44, 3, 0.01); if (rnd() < 0.35) b.cyl(0.05, 0.05, 0.22, px, h * 0.82, pz, 0x6a4a2a, 5); } });
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
      b.surf("mud", 0x8a6a48); b.cyl(1.7, 1.8, 1.9, 0, 0, 0, wall || 0xc9a878, 10);
      b.surf("thatch"); b.cone(2.5, 1.9, 0, 1.8, 0, roof || 0xb08a4a, 10, 0, 0, 0, 0xd2b070);
      b.surf("wood", 0x24160c, 0.1); b.box(0.8, 1.4, 0.2, 0, 0, 1.72, 0x3a2416); b.box(1.0, 0.12, 0.3, 0, 1.4, 1.74, 0x7a5232); b.surf();
    });
  };
  // A flat-roofed house of plaster or stone, with a door, windows and a parapet. o: { w, d, h, wall, trim, lamp, awning }
  G.house = function (b, x, z, ry, o) {
    o = o || {}; const w = o.w || 5, d = o.d || 4, h = o.h || 3, wall = o.wall || 0xd8b98c, trim = o.trim || 0x8a4a2a;
    b.at(x, 0, z, ry, 1, (b) => {
      b.surf("plaster", G.shade(wall, 0.72)); b.box(w, h, d, 0, 0, 0, wall, 0, 0, 0, G.shade(wall, 1.12));
      b.surf("wood", G.shade(trim, 0.6), 0.1); b.box(w + 0.3, 0.22, d + 0.3, 0, h, 0, trim); b.surf("plaster", G.shade(wall, 0.72));
      b.box(w + 0.1, 0.4, 0.14, 0, h + 0.2, d / 2, G.shade(wall, 0.92)); b.box(w + 0.1, 0.4, 0.14, 0, h + 0.2, -d / 2, G.shade(wall, 0.92));
      b.box(0.14, 0.4, d, w / 2, h + 0.2, 0, G.shade(wall, 0.92)); b.box(0.14, 0.4, d, -w / 2, h + 0.2, 0, G.shade(wall, 0.92));
      b.surf("wood", 0x1a0e08, 0.1); b.box(1.0, 1.9, 0.12, 0, 0, d / 2 + 0.02, 0x2e1c10); b.box(1.3, 0.18, 0.2, 0, 1.9, d / 2 + 0.04, trim);
      for (const sx of [-1, 1]) if (w > 4) { b.box(0.6, 0.7, 0.1, sx * w * 0.32, 1.4, d / 2 + 0.02, 0x2e1c10); b.box(0.8, 0.1, 0.16, sx * w * 0.32, 1.3, d / 2 + 0.06, trim); }
      b.surf("stone", 0, 0.3); b.box(w + 0.5, 0.3, d + 0.5, 0, -0.05, 0, G.shade(wall, 0.8)); b.surf();
      if (o.awning) { b.surf("bands", G.shade(o.awning, 0.62), 0.32); b.box(w * 0.7, 0.06, 1.3, 0, 2.25, d / 2 + 0.7, o.awning, 0, 0.22); b.surf(); b.rod(-w * 0.33, 0, d / 2 + 1.3, -w * 0.33, 2.1, d / 2 + 1.3, 0.05, 0x5a3a22); b.rod(w * 0.33, 0, d / 2 + 1.3, w * 0.33, 2.1, d / 2 + 1.3, 0.05, 0x5a3a22); }
    });
  };
  // A carved pillar: plinth, shaft, flared capital, a gilt band.
  G.pillar = function (b, x, z, h, r, col, gold) {   // a stepped foot, a pot-bellied base, an eight-sided shaft banded in gold, a lotus cap under a square slab with brackets
    h = h || 5; r = r || 0.34; col = col || 0xb98a62; gold = gold == null ? 0xd9a53a : gold; const dk = G.shade(col, 0.8), lt = G.shade(col, 1.14);
    b.surf("carve", 0, Math.max(0.16, r * 0.7)); b.box(r * 3.3, 0.16, r * 3.3, x, 0, z, dk); b.box(r * 2.8, 0.16, r * 2.8, x, 0.16, z, G.shade(col, 0.9));
    b.geo(new T.SphereGeometry(r * 1.32, 10, 6).scale(1, 0.62, 1), x, 0.54, z, 0, 0, 0, dk, col);
    b.cyl(r * 0.86, r * 0.98, h - 1.75, x, 0.76, z, col, 8, 0, 0, 0, lt);
    if (gold) { b.surf("gold"); b.cyl(r * 1.04, r * 1.04, 0.1, x, 0.86, z, gold, 8); b.cyl(r * 1.0, r * 1.0, 0.08, x, 1.5, z, gold, 8); b.cyl(r * 0.95, r * 0.95, 0.08, x, h - 1.55, z, gold, 8); b.cyl(r * 0.93, r * 0.93, 0.06, x, h - 1.3, z, gold, 8); b.surf("carve", 0, Math.max(0.16, r * 0.7)); }
    for (let i = 0; i < 3 && h > 4.5; i++) b.cyl(r * 0.95, r * 0.95, 0.045, x, 2.2 + i * ((h - 4.4) / 3), z, dk, 8);
    b.geo(new T.SphereGeometry(r * 1.2, 10, 5).scale(1, 0.5, 1), x, h - 0.98, z, 0, 0, 0, col, lt); b.cyl(r * 1.55, r * 1.0, 0.3, x, h - 0.9, z, lt, 10); b.box(r * 3.5, 0.26, r * 3.5, x, h - 0.6, z, G.shade(col, 0.92));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.box(dx ? r * 1.5 : r * 0.9, 0.34, dz ? r * 1.5 : r * 0.9, x + dx * r * 1.9, h - 0.34, z + dz * r * 1.9, dk);
    b.surf();
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
      b.surf("stone", 0, 0.42); b.box(len, h, t, 0, 0, 0, col, 0, 0, 0, G.shade(col, 1.14));
      b.box(len, 0.2, t + 0.3, 0, h, 0, G.shade(col, 0.86));
      if (merlons !== false) for (let i = 0, n = Math.floor(len / 1.6); i < n; i++) b.box(0.8, 0.6, t + 0.1, -len / 2 + 0.8 + i * (len / n), h + 0.2, 0, col);
      b.surf();
    });
  };
  G.tower = function (b, x, z, r, h, col, roof) {
    b.surf("stone", 0, 0.42); b.cyl(r, r * 1.1, h, x, 0, z, col, 10, 0, 0, 0, G.shade(col, 1.14)); b.cyl(r * 1.2, r * 1.2, 0.5, x, h, z, G.shade(col, 0.88), 10); b.surf();
    if (roof) b.cone(r * 1.25, r * 1.6, x, h + 0.5, z, roof, 10); else for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; b.box(0.5, 0.6, 0.4, x + Math.cos(a) * r * 1.1, h + 0.5, z + Math.sin(a) * r * 1.1, col, -a); }
  };
  // A gateway: two piers, a lintel, a crest.
  G.gate = function (b, x, z, ry, w, h, col, gold) {
    b.at(x, 0, z, ry, 1, (b) => {
      for (const s of [-1, 1]) { b.surf("stone", 0, 0.42); b.box(1.3, h, 1.5, s * (w / 2 + 0.65), 0, 0, col, 0, 0, 0, G.shade(col, 1.14)); b.surf("carve", 0, 0.3); b.box(1.6, 0.3, 1.8, s * (w / 2 + 0.65), h, 0, G.shade(col, 0.85)); b.surf("gold"); b.dome(0.7, s * (w / 2 + 0.65), h + 0.3, 0, gold || 0xd9a53a, 1.2); }
      b.surf("carve", 0, 0.4); b.box(w + 2.6, 0.8, 1.3, 0, h - 0.9, 0, G.shade(col, 0.94)); b.box(w + 1, 0.5, 1.0, 0, h - 0.1, 0, col); b.surf("gold"); b.cone(0.5, 1.1, 0, h + 0.4, 0, gold || 0xd9a53a, 6); b.surf();
    });
  };
  // An open pavilion: a plinth, four pillars, a dome and finial.
  G.pavilion = function (b, x, z, s, col, roof, ry) {
    b.at(x, 0, z, ry || 0, s || 1, (b) => {
      b.surf("stone", 0, 0.45); b.box(5.4, 0.45, 5.4, 0, 0, 0, G.shade(col || 0xc9a47a, 0.9)); b.box(4.8, 0.2, 4.8, 0, 0.45, 0, col || 0xc9a47a); b.surf();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.pillar(b, sx * 2, sz * 2, 3.6, 0.2, col || 0xc9a47a);
      b.surf("carve", 0, 0.35); b.box(5.2, 0.35, 5.2, 0, 3.6 + 0.65, 0, G.shade(col || 0xc9a47a, 0.9));
      b.surf("terracotta", G.shade(roof || 0xb2432a, 0.6), 0.5); b.dome(2.3, 0, 4.6, 0, roof || 0xb2432a, 0.75, 12); b.surf("gold"); b.cyl(0.08, 0.12, 0.8, 0, 6.2, 0, 0xd9a53a, 6); b.sph(0.2, 0, 7.05, 0, 0xd9a53a); b.surf();
    });
  };
  // A small temple: plinth, cell, a stepped spire and its finial.
  G.temple = function (b, x, z, s, col, ry) {
    col = col || 0xc7ae8c;
    b.at(x, 0, z, ry || 0, s || 1, (b) => {
      b.surf("stone", 0, 0.4); b.box(6, 0.6, 6, 0, 0, 0, G.shade(col, 0.86)); b.box(3.6, 2.6, 3.6, 0, 0.6, 0, col, 0, 0, 0, G.shade(col, 1.12));
      b.surf(); b.box(1.0, 1.7, 0.1, 0, 0.6, 1.82, 0x24140c);
      b.surf("carve", 0, 0.75); for (let i = 0; i < 6; i++) { const k = 1 - i * 0.14; b.box(3.4 * k, 0.75, 3.4 * k, 0, 3.2 + i * 0.75, 0, i % 2 ? G.shade(col, 0.92) : col); }
      b.surf("gold"); b.sph(0.5, 0, 8.0, 0, 0xd9a53a, 0.6); b.cone(0.16, 0.9, 0, 8.25, 0, 0xd9a53a, 6); b.surf();
      for (const sx of [-1, 1]) G.pillar(b, sx * 1.3, 2.6, 2.6, 0.16, col);
      b.surf("carve", 0, 0.25); b.box(3.6, 0.25, 1.4, 0, 3.2, 2.5, G.shade(col, 0.9)); b.surf();
    });
  };
  // Steps going down toward -z from (x, z): a river ghat.
  G.steps = function (b, x, z, ry, w, n, col, top) {
    b.at(x, 0, z, ry, 1, (b) => { b.surf("stone", 0, 0.5); for (let i = 0; i < n; i++) b.box(w, 0.26, 0.9, 0, (top || 0) - (i + 1) * 0.26, -i * 0.9 - 0.45, i % 2 ? G.shade(col, 0.92) : col); b.surf(); });
  };
  G.tent = function (b, x, z, ry, s, col, trim) {
    col = col || 0xd8c49a; trim = trim || 0xa3302a;
    b.at(x, 0, z, ry, s || 1, (b) => {
      b.surf("pin", trim, 0.7, "band", trim, 0.2); b.cone(2.2, 2.9, 0, 0, 0, col, 8, 0, 0, 0, G.shade(col, 1.1)); b.surf("cotton"); b.cone(0.85, 1.05, 0, 2.05, 0, trim, 8); /* (cotton canvas, a stripe of the host's colour down each panel) */
      b.surf("wood", 0x24160c, 0.1); b.cyl(0.04, 0.04, 0.9, 0, 3, 0, 0x5a3a22, 4); b.surf("silk"); b.box(0.5, 0.26, 0.02, 0.27, 3.55, 0, trim); b.surf();
      b.box(0.9, 1.5, 0.06, 0, 0, 2.02, 0x2a1a10, 0, -0.42);
    });
  };
  // A fair stall: poles, an awning, a counter with wares.
  G.stall = function (b, x, z, ry, col, rnd) {
    b.at(x, 0, z, ry, 1, (b) => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rod(sx * 1.3, 0, sz * 0.9, sx * 1.3, sz < 0 ? 2.5 : 2.1, sz * 0.9, 0.05, 0x5a3a22);
      b.surf("bands", G.shade(col, 0.6), 0.44); b.box(3.0, 0.07, 2.2, 0, 2.28, 0, col, 0, 0.19); b.box(3.0, 0.3, 0.05, 0, 1.92, 1.08, G.shade(col, 0.8));
      b.surf("wood", 0x3a2414, 0.1); b.box(2.4, 0.8, 0.9, 0, 0, 0.2, 0x8a6240); b.surf();
      for (let i = 0; i < 5; i++) b.sph(0.14 + rnd() * 0.08, -0.9 + i * 0.45, 0.94, 0.2 + (rnd() - 0.5) * 0.3, [0xe8a030, 0xc0392b, 0x7aa040, 0xe8d060, 0xb07040][i]);
    });
  };
  G.well = function (b, x, z) { b.surf("stone", 0, 0.26); b.cyl(0.9, 1.0, 0.8, x, 0, z, 0x9a8f80, 10); b.surf(); b.cyl(0.7, 0.7, 0.05, x, 0.78, z, 0x1a2a30, 10); b.rod(x - 0.95, 0, z, x - 0.95, 2, z, 0.06, 0x5a3a22); b.rod(x + 0.95, 0, z, x + 0.95, 2, z, 0.06, 0x5a3a22); b.rod(x - 1.05, 2, z, x + 1.05, 2, z, 0.06, 0x5a3a22); };
  G.pot = function (b, x, z, s, col) { s = s || 1; const was = b.sf; b.surf("terracotta", 0xe8dcc0, 0.5 * s); b.sph(0.26 * s, x, 0.24 * s, z, col || 0xa8562e, 0.95); b.cyl(0.12 * s, 0.09 * s, 0.12 * s, x, 0.44 * s, z, col || 0xa8562e, 8); b.sf = was || null; };
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
      b.surf("carve", 0, 0.3); b.box(2.2, 0.3, 1.8, 0, 0, 0, 0x7a5232); b.surf("buti", 0xd9a53a, 0.16, "zari", 0xd9a53a, 0.07); b.box(1.5, 0.5, 1.2, 0, 0.3, 0, col || 0x8a1f24); b.surf("sun", 0x8a5a1a, 0.55, "rim", 0xf4d67a, 0.06); b.box(1.6, 1.9, 0.2, 0, 0.3, -0.6, 0xd9a53a, 0, 0, 0, 0xf0c860);
      b.surf("gold"); b.box(0.2, 0.5, 1.2, -0.8, 0.8, 0, 0xd9a53a); b.box(0.2, 0.5, 1.2, 0.8, 0.8, 0, 0xd9a53a); b.sph(0.22, 0, 2.35, -0.6, 0xd9a53a); b.surf();
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
    const D = (P._d = { pos, pa: new T.BufferAttribute(pos, 3), na: new T.BufferAttribute(nor, 3), col: b64(P.col), idx: new Uint16Array(b64(P.idx).buffer), geo: new Map() });
    if (G.surfEdges) G.surfEdges(P, D, p16, { tack: 2, cloth: 2 }); // (how far each point of a saddle-cloth lies from its edge: where its border is woven)
    return D;
  }
  // What a beast's coat and trappings are made of (js/g3/surf.js): a groomed coat, a mane, gilt bosses on studded leather, a silk cloth sewn with gold flowers inside a gold-thread border.
  const PROP_SURF = { coat: { p: "skin" }, dark: { p: "hair" }, gold: { p: "gold" }, eye: { p: "gem" }, leather: { p: "leather", c2: 0xd9a53a, cell: 0.08 }, pale: { p: "silk" } };
  const propSurf = (name, role, col) => role === "tack" ? { p: "buti", c2: 0xd9a53a, cell: name === "elephant" ? 0.2 : 0.1, b: "zari", c3: 0xd9a53a, bw: name === "elephant" ? 0.14 : 0.05 } : role === "coat" && name === "elephant" ? { p: "leather" } : PROP_SURF[role] || null;
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
      if (G.surfPut && D.edge) {
        let sa = D.geo.get("s|" + ck);
        if (!sa) { const A = new Uint8Array(P.n * 4), B2 = new Uint8Array(P.n * 4), C = new Uint8Array(P.n * 4), memo = {}; for (let i = 0; i < P.n; i++) { const r = P.roles[D.col[i]]; G.surfPut(A, B2, C, i, r in memo ? memo[r] : (memo[r] = propSurf(name, r)), D.edge[i], D.half[i]); }
          sa = [new T.BufferAttribute(A, 4, true), new T.BufferAttribute(B2, 4, true), new T.BufferAttribute(C, 4, true)]; D.geo.set("s|" + ck, sa); }
        geo.setAttribute("surfA", sa[0]); geo.setAttribute("surfB", sa[1]); geo.setAttribute("surfC", sa[2]); geo.setAttribute("surfP", D.pa);
      }
    }
    const m = new T.Mesh(geo, geo.attributes.surfA && G.mat.surfSide ? G.mat.surfSide : G.mat.vc), pv = P.pivots[list[0]]; if (pv) m.position.set(pv[0], pv[1], pv[2]); m.frustumCulled = false;
    return m;
  };
  // A beast as ONE skinned mesh: every part is bound whole to the joint it turns on (tools/blender/props.py writes each part
  // about that joint), so it bends at the knee and the neck and is drawn in a single call. It was a body and four stiff
  // legs, five meshes. joints: [[name, parent or null, the part whose pivot is the joint, [the parts it carries]], ...], root first.
  function skinned(name, joints, rc, without) {
    const P = G.PROPS[name], D = propData(P), g = new T.Group(), list = [];
    for (const j of joints) for (const k of j[3]) if (P.parts[k] && !(without && without(k))) list.push(k);
    if (!D.skin) { // once: where each point stands in the whole beast, and the joint that carries it
      const pos = new Float32Array(D.pos), ji = new Uint16Array(P.n * 4), jw = new Float32Array(P.n * 4), mark = new Uint8Array(P.n);
      joints.forEach((j, b) => { for (const k of j[3]) { const r = P.parts[k]; if (!r) continue; const pv = P.pivots[k] || [0, 0, 0]; for (let q = r[0]; q < r[0] + r[1]; q++) { const v = D.idx[q]; if (mark[v]) continue; mark[v] = 1; pos[v * 3] += pv[0]; pos[v * 3 + 1] += pv[1]; pos[v * 3 + 2] += pv[2]; ji[v * 4] = b; jw[v * 4] = 1; } } });
      for (let v = 0; v < P.n; v++) if (!mark[v]) jw[v * 4] = 1; // (a part no joint claims stays with the body)
      D.skin = { pa: new T.BufferAttribute(pos, 3), ji: new T.BufferAttribute(ji, 4), jw: new T.BufferAttribute(jw, 4) };
    }
    const first = G.propMesh(name, [list[0]], rc), ck = P.roles.map((r, q) => new T.Color(rc && rc[r] != null ? rc[r] : P.cols[q]).getHexString()).join(""), key = "skin|" + list.join(",") + "|" + ck; // (propMesh has made the colours and the surfaces of this colouring)
    let geo = D.geo.get(key);
    if (!geo) {
      let len = 0; for (const k of list) len += P.parts[k][1];
      const idx = new Uint16Array(len); let o = 0; for (const k of list) { const [st, l] = P.parts[k]; idx.set(D.idx.subarray(st, st + l), o); o += l; }
      geo = new T.BufferGeometry(); geo.setAttribute("position", D.skin.pa); geo.setAttribute("normal", D.na); geo.setAttribute("color", first.geometry.attributes.color); geo.setAttribute("skinIndex", D.skin.ji); geo.setAttribute("skinWeight", D.skin.jw);
      for (const a of ["surfA", "surfB", "surfC"]) if (first.geometry.attributes[a]) geo.setAttribute(a, first.geometry.attributes[a]);
      if (geo.attributes.surfA) geo.setAttribute("surfP", D.skin.pa);
      geo.setIndex(new T.BufferAttribute(idx, 1)); geo.userData.keep = true; D.geo.set(key, geo);
    }
    const bones = [], by = {};
    for (const [nm, par, pk] of joints) { const b = new T.Bone(), pv = (pk && P.pivots[pk]) || [0, 0, 0], q = par ? by[par].userData.piv : [0, 0, 0]; b.name = nm; b.userData.piv = pv; b.position.set(pv[0] - q[0], pv[1] - q[1], pv[2] - q[2]); (par ? by[par] : g).add(b); by[nm] = b; bones.push(b); }
    const mesh = new T.SkinnedMesh(geo, first.material); mesh.frustumCulled = false; g.add(mesh); g.updateMatrixWorld(true); mesh.bind(new T.Skeleton(bones));
    g.userData.bones = by; g.userData.mesh = mesh; return g;
  }
  const FOUR = ["FL", "FR", "HL", "HR"];
  const HORSE_J = [["root", null, null, ["body", "tack"]], ["neck", "root", "neck", ["neck"]], ["head", "neck", "head", ["head", "headt"]], ["tail", "root", "tail", ["tail", "tailt"]]]
    .concat(...FOUR.map((k) => [["leg" + k, "root", "leg" + k, ["leg" + k]], ["shin" + k, "leg" + k, "shin" + k, ["shin" + k, "shin" + k + "t"]], ["hoof" + k, "shin" + k, "hoof" + k, ["hoof" + k]]]));
  const HORSE_TACK = new Set(["tack", "headt", "tailt"].concat(FOUR.map((k) => "shin" + k + "t")));
  const ELE_J = [["root", null, null, ["body", "cloth"]], ["trunk", "root", "trunk", ["trunk"]], ["trunkb", "trunk", "trunkb", ["trunkb"]], ["trunkc", "trunkb", "trunkc", ["trunkc"]], ["earL", "root", "earL", ["earL"]], ["earR", "root", "earR", ["earR"]], ["tail", "root", "tail", ["tail"]]]
    .concat(...FOUR.map((k) => [["leg" + k, "root", "leg" + k, ["leg" + k]], ["shin" + k, "leg" + k, "shin" + k, ["shin" + k]]]));
  const limbs = (g) => { const B_ = g.userData.bones, U_ = g.userData; U_.legs = U_.L = FOUR.map((k) => B_["leg" + k]); U_.shins = FOUR.map((k) => B_["shin" + k]); U_.hooves = FOUR.map((k) => B_["hoof" + k]).filter(Boolean); if (B_.neck) U_.neckY = B_.neck.position.y; return g; };
  function beast(name, body, legs, rc, extra) {   // a body, four legs that swing from the shoulder and the hip, and anything else that moves
    const g = new T.Group(); g.add(G.propMesh(name, body, rc)); g.userData.legs = legs.map((l) => { const m = G.propMesh(name, l, rc); g.add(m); return m; });
    for (const k in extra || {}) { const m = G.propMesh(name, extra[k], rc); g.add(m); g.userData[k] = m; }
    return g;
  }
  G.horse = function (col, tack) {
    col = col == null ? HORSE_COLS[Math.floor(Math.random() * HORSE_COLS.length)] : col;
    if (G.PROPS && G.PROPS.horse && G.PROPS.horse.parts.shinFL) return limbs(skinned("horse", HORSE_J, { coat: col, dark: G.shade(col, 0.5), tack: tack || 0x8a1f24 }, tack ? null : (k) => HORSE_TACK.has(k))); // (jointed: one mesh on a skeleton)
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
  // ---------- How a beast goes ----------
  // The lesser beasts (tools/blender/props.py), on the horse's plan and moved by its gaits: humped cattle, a spotted deer,
  // a tiger, a village dog. kd: its size beside a horse (how far its body rises and falls), how much of its standing it
  // spends with its head down at grass, whether it bounds, wags, or carries its head low. Without the model: a small horse.
  const KINDS = { cow: { s: 0.78, graze: 0.62, rate: 0.9, gz: [1.05, 0.78, 0.13] }, deer: { s: 0.56, graze: 0.34, bounce: 1.7, rate: 1.25, alert: 1, gz: [1.9, 0.2, 0.07] }, tiger: { s: 0.56, low: 0.12, rate: 1.1, prowl: 1 }, dog: { s: 0.3, wag: 1, rate: 1.6 } };
  const COW_COLS = [0xe4dac8, 0xe4dac8, 0xd8cdb8, 0x8a5a3a, 0xb9a48a, 0x4a3a30];
  G.beast4 = function (kind, col) {
    const P = G.PROPS && G.PROPS[kind];
    if (!P) { const h = G.horse(col == null ? { deer: 0xc9843e, tiger: 0xe08a2a, dog: 0xc09660 }[kind] || 0xe8dcc0 : col); h.scale.setScalar({ cow: 0.62, deer: 0.7, tiger: 0.85, dog: 0.3 }[kind] || 0.6); return h; }
    const g = limbs(skinned(kind, HORSE_J, col == null ? null : { coat: col })); g.userData.kd = KINDS[kind]; g.userData.kind = kind; return g;
  };
  G.cow = (col) => G.beast4("cow", col == null ? COW_COLS[Math.floor(Math.random() * COW_COLS.length)] : col);
  // A beast lying down (a dog asleep by a door): the body on the ground, the legs folded under and before it, the head
  // on its paws. on: 1 lying .. 0 up on its feet; it rises and settles over a moment.
  G.lie = function (b, on, dt) {
    const U_ = b.userData, B_ = U_.bones; if (!B_ || !U_.shins) return; const kd = U_.kd || { s: 1 };
    U_.lie = U_.lie == null ? on : U_.lie + Math.max(-1, Math.min(1, on - U_.lie)) * Math.min(1, (dt || 1) * 3.2); const k = U_.lie, e = k * k * (3 - 2 * k), now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    if (on === 0 && k < 0.02) { U_.lie = 0; return; } // (up: its standing is the gaits' business)
    U_.L[0].rotation.x = U_.L[1].rotation.x = -1.35 * e; U_.shins[0].rotation.x = U_.shins[1].rotation.x = 0.25 * e; U_.L[2].rotation.x = U_.L[3].rotation.x = -1.2 * e; U_.shins[2].rotation.x = U_.shins[3].rotation.x = 2.3 * e;
    for (let i = 0; i < 4; i++) if (U_.hooves[i]) U_.hooves[i].rotation.x = (i < 2 ? 0.2 : -0.9) * e;
    B_.root.position.y = -0.9 * kd.s * e + Math.sin(now * 1.3) * 0.004 * e; B_.root.rotation.x = 0; B_.neck.rotation.x = 1.15 * e; B_.head.rotation.x = -0.35 * e; B_.tail.rotation.x = -0.4 * e; // (asleep, it breathes)
  };
  // A leg's stride: on the ground it sweeps back under the body (the stance); then it is picked up, folded at the knee or
  // hock and at the fetlock, and carried forward through the air (the swing). u is where the leg is in its stride, duty
  // the share of the stride it spends on the ground. Gives [reach: +1 well forward .. -1 well back, fold: 0..1].
  function stride(u, duty) { u -= Math.floor(u); if (u < duty) return [1 - 2 * (u / duty), 0]; const s = (u - duty) / (1 - duty), e = s * s * (3 - 2 * s); return [-1 + 2 * e, Math.sin(s * PI)]; }
  // The gaits of a horse: where each leg [near fore, off fore, near hind, off hind] is in the stride, the share of it on the
  // ground, the swing of the leg and the fold of its knee (radians), and strides a second. A walk goes one foot at a time,
  // a trot in diagonal pairs with a moment in the air between, a gallop hind feet then fore feet and then all four off the ground.
  const GAITS = { walk: { ph: [0.25, 0.75, 0, 0.5], duty: 0.62, A: 0.27, F: 0.8, rate: 0.95 }, trot: { ph: [0, 0.5, 0.5, 0], duty: 0.42, A: 0.4, F: 1.1, rate: 1.45 }, gallop: { ph: [0.42, 0.54, 0, 0.12], duty: 0.3, A: 0.6, F: 1.4, rate: 2.1 } };
  const HORSE_KD = { s: 1, rate: 1 };
  const clockOf = (U_) => { const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000, dt = U_.now == null ? 0 : Math.max(0, Math.min(0.1, now - U_.now)); U_.now = now; return [now, dt]; };
  const ease = (o, k, to, f) => { o.rotation[k] += (to - o.rotation[k]) * f; };
  // G.gallop(horse, t, speed): speed 0 standing .. 1 at the full run. (t only sets one horse a little out of step with the
  // next; the beast keeps its own time, so its pace can follow its speed.) Standing, it shifts its weight, rests a hind
  // foot, swishes its tail and nods; it walks, then trots, then gallops as speed rises, and does not change gait in a frame.
  G.gallop = function (horse, t, speed) {
    const U_ = horse.userData, L = U_.legs; if (!L) return;
    speed = Math.max(0, Math.min(1, speed || 0));
    if (!U_.shins) { const a = 0.75 * speed; L[0].rotation.x = Math.sin(t) * a; L[1].rotation.x = Math.sin(t + 0.6) * a; L[2].rotation.x = Math.sin(t + PI) * a; L[3].rotation.x = Math.sin(t + PI + 0.6) * a; horse.children[0].position.y = Math.abs(Math.sin(t)) * 0.07 * speed; return; } // (the stiff-legged horse built in code)
    const B_ = U_.bones, snap = U_.now == null || (t === 0 && speed === 0), [now, dt] = clockOf(U_), kd = U_.kd || HORSE_KD;
    if (U_.lie > 0.02) return; // (lying down: G.lie has it)
    if (U_.ph == null) { U_.ph = (Math.abs(t) * 0.159) % 1; U_.sp = speed; U_.id = (Math.abs(t) * 0.37) % 6.28; }
    U_.sp += (speed - U_.sp) * (snap ? 1 : Math.min(1, dt * 3.5));
    const sp = U_.sp, was = U_.gait, name = sp < 0.04 ? null : sp < (was === "walk" ? 0.34 : 0.28) ? "walk" : sp < (was === "gallop" ? 0.62 : 0.7) ? "trot" : "gallop"; U_.gait = name;
    const gt = name && GAITS[name], k = !gt ? 0 : name === "walk" ? Math.min(1, sp / 0.3) : name === "trot" ? (sp - 0.28) / 0.42 : (sp - 0.62) / 0.38, f = snap ? 1 : Math.min(1, dt * 18), slow = snap ? 1 : Math.min(1, dt * 5), id = U_.id;
    let y = 0, pitch = 0, roll = 0, neck = 0, head = 0, tailX = 0.04, tailZ = 0, drop = 0;
    if (gt) {
      U_.ph = (U_.ph + dt * gt.rate * kd.rate * (0.85 + 0.25 * k)) % 1; const ph = U_.ph, A = gt.A * (0.7 + 0.3 * k), TAU = PI * 2;
      for (let i = 0; i < 4; i++) { const [reach, fold] = stride(ph + gt.ph[i], gt.duty), hind = i > 1;
        ease(L[i], "x", -reach * A * (hind ? 0.9 : 1) + (hind ? 0.06 : 0), f); ease(U_.shins[i], "x", fold * gt.F * (hind ? 0.85 : 1), f); if (U_.hooves[i]) ease(U_.hooves[i], "x", fold * 0.9 - (fold ? 0 : 0.1 * (1 - Math.abs(reach))), f); }
      if (name === "walk") { y = 0.012 * Math.abs(Math.sin(TAU * ph * 2)); roll = 0.014 * Math.sin(TAU * ph); neck = 0.02 + 0.055 * Math.sin(TAU * ph * 2 + 0.6); tailZ = 0.1 * Math.sin(TAU * ph); }
      else if (name === "trot") { y = 0.035 * Math.abs(Math.sin(TAU * ph)); neck = -0.03 + 0.02 * Math.sin(TAU * ph * 2); tailX = 0.22; tailZ = 0.08 * Math.sin(TAU * ph * 2); }
      else { y = 0.04 + 0.05 * Math.sin(TAU * (ph - 0.67)); pitch = 0.055 * Math.sin(TAU * (ph - 0.2)); neck = 0.16 + 0.09 * Math.sin(TAU * (ph - 0.2)); head = -0.12; tailX = 0.5 + 0.2 * k + 0.08 * Math.sin(TAU * ph * 2); tailZ = 0.06 * Math.sin(TAU * ph * 2 + 1); }
      y *= kd.s * (name === "gallop" ? kd.bounce || 1 : 1); if (kd.bounce && name === "gallop") { pitch *= 1.5; neck -= 0.18; tailX = -0.7; } // (a deer bounds, its head high and its white tail up)
      if (kd.prowl) { neck += name === "walk" ? 0.1 : 0.02; tailX = name === "gallop" ? 0.35 : 0.02; tailZ += 0.12 * Math.sin(now * 1.7 + id); } // (a tiger carries its head low and its tail out behind)
      if (kd.wag) { tailZ = 0.4 * Math.sin(now * 13 + id); tailX = -0.1; }
    } else if (kd.graze != null || kd.prowl || kd.wag) { // the lesser beasts standing: cattle and deer at grass (a deer never for long: its head comes up, and it looks about), a tiger watching, a dog wagging
      for (let i = 0; i < 4; i++) { ease(L[i], "x", 0, slow); ease(U_.shins[i], "x", 0, slow); if (U_.hooves[i]) ease(U_.hooves[i], "x", 0, slow); }
      const cyc = Math.sin(now * (kd.alert ? 0.23 : 0.11) + id * 1.3), down = kd.graze != null && cyc < kd.graze * 2 - 1, sw = Math.sin(now * 0.31 + id);
      if (down) { neck = kd.gz[0] + 0.03 * Math.sin(now * 5.5 + id); head = kd.gz[1] + 0.05 * Math.sin(now * 5.5 + id + 1); drop = kd.gz[2]; } // (the neck goes down from the shoulder until the muzzle is in the grass; cropping, the jaw works)
      else { neck = (kd.low || 0) + 0.025 * Math.sin(now * 0.7 + id); head = 0.03 * Math.sin(now * 0.9 + id); if (kd.alert) B_.neck.rotation.y += ((Math.sin(now * 0.37 + id * 2) > 0.3 ? 0.55 * Math.sign(Math.sin(now * 0.13 + id)) : 0) - B_.neck.rotation.y) * slow; }
      if (down || !kd.alert) B_.neck.rotation.y += (0 - B_.neck.rotation.y) * slow;
      tailZ = kd.wag ? 0.45 * Math.sin(now * 12 + id) : kd.prowl ? 0.16 * Math.sin(now * 2.1 + id) + (Math.sin(now * 0.5 + id) > 0.8 ? 0.2 * Math.sin(now * 9) : 0) : (sw > 0.1 ? 0.34 : 0.05) * Math.sin(now * 4.6 + id); if (kd.alert && Math.sin(now * 0.8 + id) > 0.86) tailX = -0.5; // (a deer's tail flicks up)
      roll = 0.005 * Math.sin(now * 0.4 + id);
    } else { // standing: square on three legs, one hind foot resting on its toe; the tail swishes at flies; the head nods and now and then tosses
      for (let i = 0; i < 4; i++) { const rest = i === 2 + (id > 3.14 ? 1 : 0); ease(L[i], "x", rest ? -0.1 : 0, slow); ease(U_.shins[i], "x", rest ? 0.28 : 0, slow); if (U_.hooves[i]) ease(U_.hooves[i], "x", rest ? 0.5 : 0, slow); }
      const sw = Math.sin(now * 0.31 + id); tailZ = (sw > 0.2 ? 0.3 : 0.05) * Math.sin(now * 5.2 + id); neck = 0.03 * Math.sin(now * 0.7 + id) + (Math.sin(now * 0.23 + id * 2) > 0.93 ? -0.16 : 0); head = 0.04 * Math.sin(now * 0.9 + id); roll = 0.006 * Math.sin(now * 0.4 + id);
    }
    const R_ = B_.root; R_.position.y += (y - R_.position.y) * f; ease(R_, "x", pitch, f); ease(R_, "z", roll, f);
    if (U_.neckY != null) B_.neck.position.y += (U_.neckY - drop - B_.neck.position.y) * slow;
    ease(B_.neck, "x", neck, slow * 2 > 1 ? 1 : slow * 2); ease(B_.head, "x", head - neck * 0.5, slow * 2 > 1 ? 1 : slow * 2); ease(B_.tail, "x", tailX, slow); ease(B_.tail, "z", tailZ, f);
  };
  // A war chariot: the car and pole in one piece, two wheels that turn, a team of horses, a standard.
  // o: { col, trim, horses (2), horseCol, flag: [bg, fg, device], canopy }
  // A war chariot, after the artist's sheet: an open car of framed timber on two twelve-spoked wheels, its front and
  // sides panelled in the owner's colour with a gold sun, cane lattice behind, gilt caps and bosses, a bow case and a
  // quiver standing at the front posts, a pole and yoke for the team. A king's white parasol stands on its own staff
  // behind him, its rim well above the tallest head; his standard flies from the rear corner.
  //   o: { col (the panels), trim, flag, canopy (the parasol's colour), horses, horseCol, tack }
  G.chariot = function (o) {
    o = o || {}; const trim = o.trim || 0xd9a53a, BR = 0xf4d67a, WOOD = 0x8a5a2c, DEEP = 0x5e3a1c, IRON = 0x55524c, LEATH = 0x5a3a22;
    const pc = o.col == null ? 0x8e1c22 : o.col, ph = new T.Color(pc).getHSL({}), panel = ph.s < 0.5 && ph.h > 0.04 && ph.h < 0.12 ? 0x8e1c22 : pc; // (a plain brown car is panelled in the royal dark red)
    const g = new T.Group(), b = new Builder(), W = 0.74, ZF = 0.94, ZB = -0.94, Y0 = 0.78, HS = 0.56, HF = 0.72;
    b.surf("wood", DEEP, 0.1);
    b.box(1.52, 0.1, 1.92, 0, 0.7, 0, WOOD); b.box(1.6, 0.05, 2.0, 0, 0.68, 0, DEEP);                             // the floor, on its bed
    for (const sx of [-1, 1]) { // the four posts and the rails between them
      b.box(0.075, HF + 0.08, 0.075, sx * W, Y0, ZF, WOOD); b.box(0.07, HS + 0.06, 0.07, sx * W, Y0, ZB, WOOD); b.box(0.06, HS, 0.06, sx * W, Y0, 0.02, WOOD);
      b.box(0.065, 0.055, ZF - ZB, sx * W, Y0 + HS, (ZF + ZB) / 2, WOOD); b.box(0.06, 0.05, ZF - ZB, sx * W, Y0 + 0.02, (ZF + ZB) / 2, DEEP);
    }
    b.box(W * 2, 0.06, 0.07, 0, Y0 + HF, ZF, WOOD); b.box(W * 2, 0.05, 0.06, 0, Y0 + 0.02, ZF, DEEP); b.box(W * 2, 0.055, 0.065, 0, Y0 + HS * 0.72, ZB, WOOD); b.box(W * 2, 0.05, 0.06, 0, Y0 + 0.02, ZB, DEEP);
    // Panels: painted boards in the owner's colour, each with a gold sun and a gold edge; cane lattice in the rear bays and across the back.
    b.surf("sun", trim, 0.2, "rim", trim, 0.028);
    b.box(W * 2 - 0.1, HF - 0.1, 0.035, 0, Y0 + 0.07, ZF, panel);
    for (const sx of [-1, 1]) b.box(0.035, HS - 0.1, ZF - 0.12, sx * W, Y0 + 0.07, (ZF + 0.02) / 2 + 0.01, panel);
    b.surf("sun", trim, 0.15, "rim", trim, 0.024); b.box(0.56, HS * 0.72 - 0.1, 0.03, 0, Y0 + 0.07, ZB, panel);
    b.surf("cane", 0xd8b878, 0.045);
    for (const sx of [-1, 1]) { b.box(0.03, HS - 0.1, 0.02 - ZB - 0.1, sx * W, Y0 + 0.07, (0.02 + ZB) / 2, 0xb08a4e); b.box(0.4, HS * 0.72 - 0.1, 0.025, sx * 0.5, Y0 + 0.07, ZB, 0xb08a4e); }
    // Gilt: caps on the posts, bosses along the rails, a boss at the pole's root.
    b.surf("gold");
    for (const sx of [-1, 1]) { b.sph(0.06, sx * W, Y0 + HF + 0.11, ZF, trim, 1.15, 7); b.cone(0.03, 0.09, sx * W, Y0 + HF + 0.16, ZF, BR, 6); b.sph(0.05, sx * W, Y0 + HS + 0.09, ZB, trim, 1.1, 6); b.sph(0.042, sx * W, Y0 + HS + 0.06, 0.02, trim, 1, 6);
      for (let k = 0; k < 5; k++) b.sph(0.026, sx * (W + 0.035), Y0 + HS + 0.027, ZB + 0.2 + k * 0.37, BR, 1, 5);
      b.geo(new T.CylinderGeometry(0.05, 0.05, 0.03, 8).rotateZ(PI / 2), sx * (W + 0.04), Y0 + 0.045, ZF - 0.06, 0, 0, 0, trim); b.geo(new T.CylinderGeometry(0.05, 0.05, 0.03, 8).rotateZ(PI / 2), sx * (W + 0.04), Y0 + 0.045, ZB + 0.06, 0, 0, 0, trim); }
    for (let k = -2; k <= 2; k++) b.sph(0.026, k * 0.3, Y0 + HF + 0.03, ZF + 0.04, BR, 1, 5);
    b.sph(0.07, 0, 0.72, ZF + 0.08, trim, 1, 7);
    // A quiver at the right front post and a cased bow at the left; the pole, the yoke and its saddles; the axle.
    b.surf("leather", trim, 0.06); b.cyl(0.085, 0.07, 0.66, 0.56, Y0 + 0.04, ZF - 0.14, LEATH, 8); b.cyl(0.06, 0.05, 0.9, -0.58, Y0 + 0.04, ZF - 0.14, 0x4a2e1a, 7);
    b.surf("gold"); b.torus(0.086, 0.014, 0.56, Y0 + 0.66, ZF - 0.14, trim, PI / 2, 0, 0, 10); b.torus(0.08, 0.012, 0.56, Y0 + 0.2, ZF - 0.14, trim, PI / 2, 0, 0, 10); b.torus(0.062, 0.012, -0.58, Y0 + 0.9, ZF - 0.14, trim, PI / 2, 0, 0, 8);
    b.surf("rings", 0xa3302a, 0.12); for (let k = 0; k < 6; k++) b.rod(0.56 + (k - 2.5) * 0.022, Y0 + 0.66, ZF - 0.14 + (k % 2) * 0.03, 0.56 + (k - 2.5) * 0.03, Y0 + 0.98, ZF - 0.14 + (k % 2) * 0.035, 0.008, 0xe8dcc0, 3);
    b.geo(new T.TorusGeometry(0.5, 0.017, 4, 12, PI * 0.8).rotateY(PI / 2), -0.58, Y0 + 1.28, ZF - 0.14, 0, 0, -0.42, 0x6a4a26);                                        // the spare bow, standing in its case
    const tb = new Builder(); // (the pole, the yoke and the traces are the team's: they swing with the horses about the pole's root)
    tb.surf("wood", DEEP, 0.1); tb.rod(0, 0.7, ZF, 0, 1.0, 3.62, 0.055, 0x7a4e26, 7); tb.rod(-1.6, 1.06, 3.5, 1.6, 1.06, 3.5, 0.045, 0x7a4e26, 6);
    tb.surf("gold"); for (const sx of [-1, 1]) { tb.sph(0.06, sx * 1.6, 1.06, 3.5, trim, 1, 6); } tb.sph(0.065, 0, 1.02, 3.66, trim, 1, 6);
    tb.surf("leather"); for (const sx of [-1.5, -0.5, 0.5, 1.5]) tb.torus(0.15, 0.028, sx, 1.1, 3.5, 0x3a2414, 0, 0, 0, 8);
    for (const sx of [-1, 1]) { tb.rod(sx * (W + 0.02), 0.74, ZF, sx * 1.52, 1.04, 3.5, 0.014, 0x3a2414, 4); tb.rod(sx * 0.3, Y0 + HF, ZF, sx * 0.5, 1.98, 4.6, 0.008, 0x2a1a10, 3); }                   // the outer traces, and the reins
    b.surf("iron"); b.rod(-1.0, 0.72, -0.1, 1.0, 0.72, -0.1, 0.055, IRON, 6);
    if (o.canopy) { // the royal parasol: a white dome on a gilt staff with a fringe of gold drops and a finial
      const cx = 0.12, cz = -0.72, RY = 3.34, R = 0.78, dk = G.shade(o.canopy, 0.84);
      b.surf("gold"); b.rod(cx, 0.76, cz - 0.14, cx, RY + 0.34, cz - 0.02, 0.03, trim, 7); for (const y of [1.5, 2.2, 2.9]) b.sph(0.05, cx, y, cz - 0.14 + (y - 0.76) * 0.04, BR, 0.8, 6);
      b.surf("silk"); b.geo(new T.SphereGeometry(R, 20, 6, 0, PI * 2, 0, PI / 2).scale(1, 0.46, 1), cx, RY, cz, 0, 0, 0, o.canopy, dk);
      b.geo(new T.SphereGeometry(R * 0.985, 20, 3, 0, PI * 2, 0, PI / 2).scale(1, 0.44, 1), cx, RY - 0.012, cz, 0, 0, 0, dk);                                              // (its underside, seen from below)
      b.surf("gold"); for (let k = 0; k < 12; k++) { const a = (k / 12) * PI * 2; b.rod(cx, RY + 0.35, cz, cx + Math.sin(a) * R, RY + 0.012, cz + Math.cos(a) * R, 0.009, trim, 3); }
      b.geo(new T.TorusGeometry(R, 0.028, 5, 24).rotateX(PI / 2), cx, RY, cz, 0, 0, 0, trim);
      for (let k = 0; k < 24; k++) { const a = (k / 24) * PI * 2, x = cx + Math.sin(a) * R, z = cz + Math.cos(a) * R; b.cone(0.03, 0.1, x, RY - 0.005, z, k % 2 ? trim : BR, 4, 0, PI); }
      b.sph(0.075, cx, RY + 0.42, cz, trim, 1, 8); b.cyl(0.04, 0.06, 0.07, cx, RY + 0.33, cz, trim, 7); b.cone(0.035, 0.17, cx, RY + 0.49, cz, BR, 6);
    }
    b.surf(); g.add((g.userData.car = b.mesh()));
    const team = new T.Group(); team.position.set(0, 0, ZF); tb.surf(); const tm = tb.mesh(); tm.position.z = -ZF; team.add(tm); g.add(team); g.userData.team = team;
    g.userData.wheels = [];
    for (const sx of [-1, 1]) { // a wheel: twelve spokes, a wooden felloe shod with iron and studded, a nave capped in gold
      const wb = new Builder(); wb.surf("wood", DEEP, 0.1); wb.torus(0.66, 0.06, 0, 0, 0, 0x7a5028, 0, PI / 2, 0, 24);
      for (let i = 0; i < 6; i++) wb.geo(new T.BoxGeometry(0.04, 1.3, 0.045), 0, 0, 0, (i / 6) * PI, 0, 0, 0x8a6236);
      wb.cyl(0.13, 0.13, 0.2, -0.1, 0, 0, 0x5a3a22, 10, 0, 0, PI / 2);
      wb.surf("iron"); wb.torus(0.715, 0.032, 0, 0, 0, IRON, 0, PI / 2, 0, 24); for (let i = 0; i < 12; i++) { const a = ((i + 0.5) / 12) * PI * 2; wb.sph(0.02, sx * 0.03, Math.sin(a) * 0.72, Math.cos(a) * 0.72, 0x8a8880, 1, 4); }
      wb.surf("gold"); wb.cyl(0.085, 0.065, 0.08, sx * 0.14 - 0.04, 0, 0, trim, 8, 0, 0, PI / 2); wb.sph(0.045, sx * 0.19, 0, 0, BR, 1, 6); wb.geo(new T.TorusGeometry(0.135, 0.016, 4, 12).rotateY(PI / 2), sx * 0.1, 0, 0, 0, 0, 0, trim);
      const w = wb.mesh(); w.position.set(sx * 0.98, 0.72, -0.1); g.add(w); g.userData.wheels.push(w);
    }
    g.userData.horses = [];
    const n = o.horses == null ? 2 : o.horses;
    for (let i = 0; i < n; i++) { const h = G.horse(o.horseCol != null ? o.horseCol : undefined, o.tack || 0xa3302a); h.position.set((i - (n - 1) / 2) * 1.0, 0, 3.4 - ZF); team.add(h); g.userData.horses.push(h); }
    if (o.flag) { const f = G.banner(o.canopy ? 4.5 : 3.4, o.flag[0], o.flag[1], o.flag[2], 0.7); /* (tall: the cloth flies above the heads, and above the parasol) */ f.position.set(-0.74, 0.86, -0.94); g.add(f); g.userData.banner = f; } // the standard, at the rear corner, clear of the one who rides
    g.userData.deck = 0.86;
    return g;
  };
  // Turn a chariot's wheels and run its horses for a frame.
  // A horse-drawn car does not turn like a cart on a pivot: the team swings round first and the car comes after it
  // on its wheels. G.steer turns the car toward heading `a`: the team leads by up to half a radian, and the car's own
  // turn is slow standing and quicker at the run; the wheel on the inside of the turn all but stands still.
  G.steer = function (ch, a, dt, moving, alive) {
    const U_ = ch.userData; let da = a - ch.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
    const rate = alive ? 0.9 + 2.3 * Math.min(1, moving) : 0, step = Math.max(-rate * dt, Math.min(rate * dt, da)); ch.rotation.y += step;
    const want = alive ? Math.max(-0.5, Math.min(0.5, (da - step) * 1.5)) : (U_.lead || 0); U_.lead = (U_.lead || 0) + (want - (U_.lead || 0)) * Math.min(1, dt * 6);
    if (U_.team) U_.team.rotation.y = U_.lead; (U_.horses || []).forEach((h) => { h.rotation.y = U_.lead * 0.35; });
    U_.yaw = dt > 0 ? step / dt : 0; U_.spin = (U_.spin || 0) + step * 0.98 / 0.72;
  };
  G.roll = function (ch, dist, t, speed) { const U_ = ch.userData, sp = U_.spin || 0, turn = Math.min(0.6, Math.abs(U_.yaw || 0) * 0.5); // (a team turning on the spot still steps)
    const jolt = speed > 0.05 ? (Math.abs(Math.sin(dist * 1.9)) * 0.016 + Math.abs(Math.sin(dist * 0.67 + 1)) * 0.02) * Math.min(1, speed) : 0; if (U_.car) { U_.car.position.y = jolt; U_.car.rotation.z = Math.sin(dist * 0.83) * 0.014 * Math.min(1, speed); } // (the car jolts and rocks on its axle as it runs; wheels and team stay on the ground)
    (U_.wheels || []).forEach((w, k) => { w.rotation.x = dist / 0.72 + (k ? -sp : sp); }); (U_.horses || []).forEach((h, k) => G.gallop(h, t * 11 + k * 1.3, Math.max(speed, turn))); if (U_.banner) G.wave(U_.banner, t); };
  // A war elephant with a howdah; its legs and trunk are pivots.
  function howdah(b, cloth, GOLDE) {
    // The howdah: a railed box with posts and a canopy; the driver's goad stands beside it.
    b.surf("wood", 0x24160c, 0.1); b.box(1.6, 0.14, 1.7, 0, 3.72, -0.2, 0x5a3a22); b.surf("carve", 0, 0.5); for (const sx of [-1, 1]) { b.box(0.07, 0.5, 1.7, sx * 0.78, 3.86, -0.2, 0x7a5232, 0, 0, 0, 0x9a6a3c); b.box(0.09, 0.05, 1.74, sx * 0.78, 4.36, -0.2, GOLDE); }
    for (const sz of [-1, 1]) { b.box(1.6, 0.5, 0.07, 0, 3.86, -0.2 + sz * 0.83, 0x7a5232, 0, 0, 0, 0x9a6a3c); b.box(1.64, 0.05, 0.09, 0, 4.36, -0.2 + sz * 0.83, GOLDE); for (let k = -1; k <= 1; k++) b.sph(0.05, k * 0.5, 4.1, -0.2 + sz * 0.87, GOLDE, 1, 6); }
    b.surf("gold"); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rod(sx * 0.72, 4.36, -0.2 + sz * 0.77, sx * 0.72, 5.32, -0.2 + sz * 0.77, 0.035, GOLDE, 6);
    b.geo(new T.SphereGeometry(1.1, 14, 5, 0, PI * 2, 0, PI / 2).scale(1, 0.38, 1.05), 0, 5.3, -0.2, 0, 0, 0, GOLDE, 0xf0cf70); b.sph(0.09, 0, 5.74, -0.2, GOLDE, 1.4, 7);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * PI * 2; b.sph(0.04, Math.sin(a) * 1.1, 5.24, -0.2 + Math.cos(a) * 1.15, k % 2 ? cloth : 0xf4ecd6, 1.6, 4); }
    b.rod(0.35, 3.8, 1.2, 0.35, 4.7, 1.3, 0.02, 0x3a342c, 4); b.cone(0.05, 0.14, 0.35, 4.7, 1.3, 0x8a8a8a, 5);
    // "banners and standards": a pennon of the host's colour on a staff at the howdah's back, and a quiver hung at its side
    b.surf("wood", 0x24160c, 0.1); b.rod(-0.72, 4.36, -0.97, -0.72, 6.9, -0.97, 0.03, 0x5a3a22, 5); b.surf("silk", 0, 0, "zari", GOLDE, 0.05); b.box(0.02, 0.5, 0.9, -0.72, 6.3, -1.45, cloth); b.surf("gold"); b.cone(0.05, 0.16, -0.72, 6.9, -0.97, GOLDE, 5);
    b.surf("leather", GOLDE, 0.08); b.cyl(0.09, 0.07, 0.6, 0.84, 3.9, -0.5, 0x5a3a22, 7); b.surf();
  }
  G.elephant = function (cloth) {
    if (G.PROPS && G.PROPS.elephant && G.PROPS.elephant.parts.shinFL) { const g = limbs(skinned("elephant", ELE_J, { tack: cloth || 0xa3302a })), hb = new Builder(); howdah(hb, cloth || 0xa3302a, 0xd9a53a); g.userData.bones.root.add(hb.mesh()); /* (the howdah rides the body, and rocks with it) */ return g; }
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
  // G.stomp(elephant, t, speed): an elephant only ever walks, one foot at a time and each long on the ground, however fast
  // it comes; its body rolls from side to side with the stride. Standing or going, its trunk swings in three lengths, its
  // ears fan, its tail switches.
  G.stomp = function (el, t, speed) {
    const U_ = el.userData, L = U_.legs; if (!L) return;
    if (!U_.shins) { const a = 0.3 * Math.min(1, speed); L[0].rotation.x = Math.sin(t) * a; L[3].rotation.x = Math.sin(t) * a; L[1].rotation.x = -Math.sin(t) * a; L[2].rotation.x = -Math.sin(t) * a; U_.trunk.rotation.x = Math.sin(t * 0.7) * 0.25; el.children[0].position.y = Math.abs(Math.sin(t)) * 0.05; return; }
    const B_ = U_.bones, snap = U_.now == null, [now, dt] = clockOf(U_); speed = Math.max(0, Math.min(1, speed || 0));
    if (U_.ph == null) { U_.ph = (Math.abs(t) * 0.159) % 1; U_.sp = speed; U_.id = (Math.abs(t) * 0.37) % 6.28; }
    U_.sp += (speed - U_.sp) * (snap ? 1 : Math.min(1, dt * 2.5));
    const sp = U_.sp, go = sp > 0.05, f = snap ? 1 : Math.min(1, dt * 12), slow = snap ? 1 : Math.min(1, dt * 4), id = U_.id, TAU = PI * 2, PH = [0.25, 0.75, 0, 0.5];
    let y = 0, roll = 0, pitch = 0;
    if (go) { U_.ph = (U_.ph + dt * (0.5 + 0.6 * sp)) % 1; const A = 0.17 + 0.13 * sp;
      for (let i = 0; i < 4; i++) { const [reach, fold] = stride(U_.ph + PH[i], 0.68); ease(L[i], "x", -reach * A, f); ease(U_.shins[i], "x", fold * (0.4 + 0.2 * sp), f); }
      y = 0.03 * Math.abs(Math.sin(TAU * U_.ph * 2)); roll = (0.02 + 0.015 * sp) * Math.sin(TAU * U_.ph); pitch = 0.012 * Math.sin(TAU * U_.ph * 2); }
    else { for (let i = 0; i < 4; i++) { ease(L[i], "x", 0, slow); ease(U_.shins[i], "x", 0, slow); } roll = 0.012 * Math.sin(now * 0.35 + id); } // (standing, it rocks its weight from side to side)
    const R_ = B_.root; R_.position.y += (y - R_.position.y) * f; ease(R_, "z", roll, slow); ease(R_, "x", pitch, slow);
    const sw = go ? 0.14 * Math.sin(TAU * U_.ph) : 0; // the trunk swings with the walk, and searches about when the beast stands
    B_.trunk.rotation.x = 0.06 * Math.sin(now * 0.5 + id) + sw * 0.5; B_.trunk.rotation.z = 0.1 * Math.sin(now * 0.37 + id) + sw;
    B_.trunkb.rotation.x = 0.12 * Math.sin(now * 0.63 + id + 1) + 0.05; B_.trunkb.rotation.z = 0.1 * Math.sin(now * 0.45 + id + 0.9) + sw * 0.6;
    B_.trunkc.rotation.x = 0.22 * Math.sin(now * 0.8 + id + 2) + 0.18; B_.trunkc.rotation.z = 0.12 * Math.sin(now * 0.55 + id + 1.7);
    const fan = Math.pow(Math.max(0, Math.sin(now * (go ? 2.4 : 1.5) + id)), 2) * (Math.sin(now * 0.21 + id) > -0.3 ? 1 : 0.15); B_.earL.rotation.y = 0.08 + 0.42 * fan; B_.earR.rotation.y = -0.08 - 0.42 * fan;
    B_.tail.rotation.z = 0.28 * Math.sin(now * 1.4 + id) * (Math.sin(now * 0.33 + id) > 0 ? 1 : 0.25); B_.tail.rotation.x = 0.06;
  };

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
    const gust = 0.72 + 0.28 * Math.sin(t * 0.63 + ph * 1.7) * Math.sin(t * 0.29 + ph), w = banner.userData.w || (banner.userData.w = Math.max.apply(null, Array.from({ length: P.count }, (_, q) => base[q * 3])) || 1); // (the wind comes in gusts; between them the fly end sags)
    for (let i = 0; i < P.count; i++) { const x = base[i * 3], y = base[i * 3 + 1], u = x / w;
      P.setZ(i, (Math.sin(t * 3.2 + ph + x * 5 + y * 1.3) * 0.16 + Math.sin(t * 5.3 + ph * 2 + x * 9.5 - y * 2.1) * 0.05) * x * gust); P.setY(i, y - 0.07 * u * u * w * (1.15 - gust)); }
    P.needsUpdate = true;
  };

  // ---------- Crowds and armies (instanced) ----------
  // One simple person as a single geometry: legs, body, head, and (for soldiers) a shield and an upright spear.
  let personGeo = null, soldierGeo = null, sitterGeo = null, farGeo = null;
  // A person in a crowd, seen from across a yard: legs, a wrapped lower cloth, a bare trunk with an upper cloth over
  // one shoulder, arms, a head with its hair knotted. Only the cloth (left white here) takes the person's own dye:
  // the crowd's material tints what is white and leaves skin, hair, wood and iron as they are.
  function simple(kind) {
    const b = new Builder(); b.ao = 0.86; const SKIN = 0xb8794a, HAIR = 0x1c120c, W = 0xffffff, C6 = 6;
    if (kind === "sit") {
      b.cyl(0.3, 0.34, 0.2, 0, 0, 0.04, W, 7); b.cyl(0.15, 0.2, 0.46, 0, 0.18, 0, SKIN, C6); b.box(0.36, 0.1, 0.1, 0, 0.44, 0.02, W, 0, 0, 0.6);
      for (const sx of [-1, 1]) b.rod(sx * 0.2, 0.6, 0, sx * 0.24, 0.24, 0.16, 0.045, SKIN, 5);
      b.sph(0.125, 0, 0.8, 0, SKIN, 1, 7); b.sph(0.13, 0, 0.83, -0.025, HAIR, 0.8, 7); b.sph(0.055, 0, 0.95, -0.04, HAIR, 1, 5);
    } else if (kind === "far") { // a soldier in a host's far blocks, a few pixels tall: the same man in under half the faces
      for (const sx of [-1, 1]) b.box(0.09, 0.5, 0.1, sx * 0.08, 0, 0, SKIN);
      b.cyl(0.17, 0.21, 0.56, 0, 0.42, 0, W, 5); b.cyl(0.2, 0.17, 0.42, 0, 0.98, 0, 0x5a3a24, 5); b.box(0.4, 0.08, 0.27, 0, 0.9, 0, W);
      for (const sx of [-1, 1]) b.rod(sx * 0.215, 1.37, 0, sx * 0.25, 0.86, 0.03, 0.042, SKIN, 3);
      b.sph(0.125, 0, 1.57, 0, SKIN, 1.08, 5); b.sph(0.14, 0, 1.63, 0, 0x6a655c, 0.72, 5);
      b.cyl(0.3, 0.3, 0.05, -0.25, 1.1, 0.14, 0x8a6238, 6, 0, PI / 2); b.rod(0.27, 0.2, 0.05, 0.27, 2.5, 0.05, 0.018, 0x7a5a36, 3); b.cone(0.045, 0.24, 0.27, 2.48, 0.05, 0xd8d8d8, 3);
    } else {
      for (const sx of [-1, 1]) { b.cyl(0.05, 0.045, 0.5, sx * 0.08, 0, 0, SKIN, 5); b.box(0.09, 0.04, 0.2, sx * 0.08, 0, 0.04, SKIN); }
      b.cyl(0.17, 0.21, 0.56, 0, 0.42, 0, W, 7); b.cyl(0.19, 0.19, 0.07, 0, 0.94, 0, W, 7);                       // the lower cloth, and its roll at the waist
      b.cyl(0.2, 0.15, 0.42, 0, 0.98, 0, SKIN, C6);
      if (kind !== "soldier") b.box(0.4, 0.09, 0.26, 0, 1.12, 0, W, 0, 0, 0.75);                                   // the upper cloth, over one shoulder
      for (const sx of [-1, 1]) b.rod(sx * 0.215, 1.37, 0, sx * 0.25, 0.86, 0.03, 0.042, SKIN, 5);
      b.cyl(0.05, 0.06, 0.08, 0, 1.4, 0, SKIN, 5); b.sph(0.125, 0, 1.57, 0, SKIN, 1.08, 7); b.sph(0.13, 0, 1.6, -0.025, HAIR, 0.85, 7);
      if (kind === "soldier") { b.sph(0.14, 0, 1.63, 0, 0x6a655c, 0.72, 7); b.cone(0.03, 0.08, 0, 1.72, 0, 0x8a8478, 4); b.cyl(0.2, 0.16, 0.36, 0, 1.0, 0, 0x5a3a24, C6);   // an iron cap, a leather coat
        b.cyl(0.3, 0.3, 0.05, -0.25, 1.1, 0.14, 0x8a6238, 9, 0, PI / 2); b.cyl(0.07, 0.07, 0.07, -0.25, 1.1, 0.16, 0x8a8478, 6, 0, PI / 2); b.box(0.4, 0.08, 0.27, 0, 0.9, 0, W);    // a hide shield with its boss, a sash in his host's colour
        b.rod(0.27, 0.2, 0.05, 0.27, 2.5, 0.05, 0.018, 0x7a5a36, 4); b.cone(0.045, 0.24, 0.27, 2.48, 0.05, 0xd8d8d8, 4); }
      else b.sph(0.055, 0, 1.74, -0.04, HAIR, 1, 5);
    }
    const m = b.mesh(); m.geometry.userData.keep = true; return m.geometry;
  }
  let crowdMat = null;
  function crowdMaterial() {
    if (crowdMat) return crowdMat;
    crowdMat = new T.MeshLambertMaterial({ vertexColors: true }); crowdMat.userData.keep = true;
    crowdMat.onBeforeCompile = (sh) => { sh.uniforms.uWindT = G.windU; // (men standing are never still: each sways a little from the feet, in his own time, and breathes)
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWindT;").replace("#include <begin_vertex>", "#include <begin_vertex>\n#ifdef USE_INSTANCING\n{ float cp = uWindT * 0.9 + instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3, ch = max(0.0, transformed.y);\n  transformed.x += sin(cp) * 0.024 * ch; transformed.z += sin(cp * 0.63 + 1.3) * 0.017 * ch; transformed.y *= 1.0 + sin(cp * 1.9) * 0.007; }\n#endif\n");
      sh.vertexShader = sh.vertexShader.replace("#include <color_vertex>", "vColor = vec4(1.0);\n#ifdef USE_COLOR\nvColor.rgb *= color.rgb;\n#endif\n#ifdef USE_INSTANCING_COLOR\nvColor.rgb *= mix(vec3(1.0), instanceColor.rgb, step(0.55, min(color.r, min(color.g, color.b))));\n#endif"); };
    crowdMat.customProgramCacheKey = () => "crowd";
    return crowdMat;
  }
  // spots: [[x, z, ry, scale]]; cols: colours picked per person (tints the white cloth); kind: "stand" | "sit" | "soldier"
  G.crowd = function (spots, cols, kind, rnd) {
    const geo = kind === "sit" ? (sitterGeo = sitterGeo || simple("sit")) : kind === "soldier" ? (spots.length >= 150 ? (farGeo = farGeo || simple("far")) : (soldierGeo = soldierGeo || simple("soldier"))) : (personGeo = personGeo || simple("stand")); // (a block of 150 and more stands far off and throws no shadow: the lighter man)
    const n = spots.length, im = new T.InstancedMesh(geo, crowdMaterial(), n), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), c = new T.Color();
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
