/* The cast modelled in Blender (tools/blender/cast.py) from the artist's reference sheets, worn on the same joints the
   code-built figures have. One model is one character at one age: a set of points with named parts (body, head, hair,
   crown, each cloth, gold, armour...) and colour roles (skin, cloth, border, second cloth, gold, hair...). Each of its
   looks (home, court, student, forest, disguise, war, mourning) names the parts shown and the colours of the roles, so
   the same person changes dress with the story's hour and grows up through the models of his ages. */
(function (K) {
  "use strict";
  const G = (K.G3 = K.G3 || {}), T = window.THREE;
  if (!T) return;
  const bytes = (s) => { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
  function decode(M) {
    if (M._d) return M._d;
    const n = M.n, p16 = new Int16Array(bytes(M.pos).buffer), pos = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) pos[i] = p16[i] / M.scale;
    const n8 = new Int8Array(bytes(M.nor).buffer), nor = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) nor[i] = n8[i] / 127;
    const j = bytes(M.jnt), w = bytes(M.wgt), ji = new Uint16Array(n * 4), jw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { ji[i * 4] = j[i * 2]; ji[i * 4 + 1] = j[i * 2 + 1]; jw[i * 4] = w[i] / 255; jw[i * 4 + 1] = 1 - w[i] / 255; }
    M.pos = M.nor = M.jnt = M.wgt = null; /* (the text they came in is not needed again) */
    const D = (M._d = { pos, nor, ji, jw, col: bytes(M.col), idx: new Uint16Array(bytes(M.idx).buffer), geo: new Map() });
    edges(M, D, p16, EDGED); cavity(M, D, p16); covers(M, D);
    return D;
  }
  // Which part each point belongs to, and how far each point of a cloth (or a plate) lies from that piece's edge: the
  // woven borders and the gold edging are drawn within a width of it (js/g3/surf.js). Found once, when a model is first worn.
  G.surfEdges = (M, D, p16, which) => edges(M, D, p16, which);
  // Cloth never goes under the skin: the skin that a garment covers is simply not drawn while that garment is worn, so
  // no pose can push it through. For each point of the body: is it inside a skirt (a lower cloth, the skirt of scales:
  // everything of the hips and legs above the hem), or does a close-fitting piece (a coat, a breast-band, a sash, the
  // band of an upper cloth, a guard on a limb) lie just outside it along its own normal? A triangle of the body whose
  // three points are all covered by pieces of the look being worn is left out (G.modelSkin).
  const SKIRT = { dhoti: 1, dhotiS: 1, dhotiL: 1, tasset: 1 }, SHELL = { cuirass: 1, vambrace: 1, greave: 1, bandeau: 1, shawl: 1, drape: 1, sash: 1, girdle: 1, tuck: 1, hide: 1, baldric: 1, strap: 1, apron: 1 };
  function covers(M, D) {
    const n = M.n, pos = D.pos, nor = D.nor, idx = D.idx, names = D.partNames, part = D.part, cov = (D.cov = new Uint32Array(n)), bit = (D.covBit = {}), bi = names.indexOf("body"), body = [];
    if (bi < 0) return; for (let v = 0; v < n; v++) if (part[v] === bi) body.push(v);
    const CELL = 0.05, key = (x, y, z) => (Math.floor(x / CELL) + 512) * 1048576 + (Math.floor(y / CELL) + 512) * 1024 + (Math.floor(z / CELL) + 512); let nb = 0;
    for (const k of names) {
      if (!(SKIRT[k] || SHELL[k]) || nb >= 30) continue; const b = 1 << nb++, [s, l] = M.parts[k]; bit[k] = b;
      let x0 = 9, y0 = 9, z0 = 9, x1 = -9, y1 = -9, z1 = -9; for (let i = s; i < s + l; i++) { const v = idx[i] * 3; if (pos[v] < x0) x0 = pos[v]; if (pos[v] > x1) x1 = pos[v]; if (pos[v + 1] < y0) y0 = pos[v + 1]; if (pos[v + 1] > y1) y1 = pos[v + 1]; if (pos[v + 2] < z0) z0 = pos[v + 2]; if (pos[v + 2] > z1) z1 = pos[v + 2]; }
      if (SKIRT[k]) { // hips and legs (not an arm hanging beside them) from a little above the hem to the waist
        for (const v of body) { const y = pos[v * 3 + 1], j = D.jw[v * 4] >= D.jw[v * 4 + 1] ? D.ji[v * 4] : D.ji[v * 4 + 1]; if ((j === 0 || j >= 9) && y > y0 + 0.05 && y < y1 + 0.012) cov[v] |= b; }
        continue; }
      const grid = new Map();
      for (let i = s; i < s + l; i += 3) { const a = idx[i] * 3, c = idx[i + 1] * 3, e = idx[i + 2] * 3;
        const ax = Math.floor(Math.min(pos[a], pos[c], pos[e]) / CELL), bx = Math.floor(Math.max(pos[a], pos[c], pos[e]) / CELL), ay = Math.floor(Math.min(pos[a + 1], pos[c + 1], pos[e + 1]) / CELL), by = Math.floor(Math.max(pos[a + 1], pos[c + 1], pos[e + 1]) / CELL), az = Math.floor(Math.min(pos[a + 2], pos[c + 2], pos[e + 2]) / CELL), bz = Math.floor(Math.max(pos[a + 2], pos[c + 2], pos[e + 2]) / CELL);
        if ((bx - ax + 1) * (by - ay + 1) * (bz - az + 1) > 64) continue;
        for (let X = ax; X <= bx; X++) for (let Y = ay; Y <= by; Y++) for (let Z = az; Z <= bz; Z++) { const g = (X + 512) * 1048576 + (Y + 512) * 1024 + (Z + 512); let t = grid.get(g); if (!t) grid.set(g, (t = [])); t.push(i); } }
      const REACH = 0.034, BACK = 0.006;
      for (const v of body) { const px = pos[v * 3], py = pos[v * 3 + 1], pz = pos[v * 3 + 2]; if (px < x0 - 0.04 || px > x1 + 0.04 || py < y0 - 0.04 || py > y1 + 0.04 || pz < z0 - 0.04 || pz > z1 + 0.04) continue;
        const nx = nor[v * 3], ny = nor[v * 3 + 1], nz = nor[v * 3 + 2], ox = px - nx * BACK, oy = py - ny * BACK, oz = pz - nz * BACK, g0 = key(ox, oy, oz), g1 = key(px + nx * REACH, py + ny * REACH, pz + nz * REACH); let hit = false;
        for (const g of g0 === g1 ? [g0] : [g0, g1]) { const list = grid.get(g); if (!list || hit) continue;
          for (const i of list) { const a = idx[i] * 3, c = idx[i + 1] * 3, e = idx[i + 2] * 3; // (a ray from just under the skin, out along its normal, against the piece's triangles)
            const e1x = pos[c] - pos[a], e1y = pos[c + 1] - pos[a + 1], e1z = pos[c + 2] - pos[a + 2], e2x = pos[e] - pos[a], e2y = pos[e + 1] - pos[a + 1], e2z = pos[e + 2] - pos[a + 2];
            const hx = ny * e2z - nz * e2y, hy = nz * e2x - nx * e2z, hz = nx * e2y - ny * e2x, det = e1x * hx + e1y * hy + e1z * hz; if (det > -1e-9 && det < 1e-9) continue;
            const f = 1 / det, sx = ox - pos[a], sy = oy - pos[a + 1], sz = oz - pos[a + 2], u = f * (sx * hx + sy * hy + sz * hz); if (u < -0.02 || u > 1.02) continue;
            const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x, w = f * (nx * qx + ny * qy + nz * qz); if (w < -0.02 || u + w > 1.04) continue;
            const t = f * (e2x * qx + e2y * qy + e2z * qz); if (t >= 0 && t <= REACH + BACK) { hit = true; break; } } }
        if (hit) cov[v] |= b; }
    }
  }
  // How hollow or how proud the surface is at each point (from its neighbours: do they rise above it or fall away?).
  // The colour is deepened in the hollows (between muscles, in the folds of cloth, under a rim) and lifted a little on
  // the ridges, as a painter would: the figure reads as modelled form, not as one flat colour.
  function cavity(M, D, p16) {
    const n = M.n, pos = D.pos, nor = D.nor, idx = D.idx, w = new Int32Array(n), ids = new Map(), acc = new Float32Array(n), cnt = new Uint16Array(n), cav = new Float32Array(n), sm = new Float32Array(n);
    for (let v = 0; v < n; v++) { const key = (p16[v * 3] + 32768) * 4294967296 + (p16[v * 3 + 1] + 32768) * 65536 + (p16[v * 3 + 2] + 32768); let r = ids.get(key); if (r === undefined) { r = v; ids.set(key, v); } w[v] = r; }
    for (let i = 0; i < idx.length; i += 3) for (let e = 0; e < 3; e++) { const a = w[idx[i + e]], b = w[idx[i + (e + 1) % 3]]; if (a === b) continue;
      let dx = pos[b * 3] - pos[a * 3], dy = pos[b * 3 + 1] - pos[a * 3 + 1], dz = pos[b * 3 + 2] - pos[a * 3 + 2]; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
      acc[a] += dx * nor[a * 3] + dy * nor[a * 3 + 1] + dz * nor[a * 3 + 2]; cnt[a]++; }
    for (let v = 0; v < n; v++) cav[v] = cnt[v] ? acc[v] / cnt[v] : 0;
    for (let pass = 0; pass < 2; pass++) { sm.fill(0); for (let i = 0; i < idx.length; i += 3) for (let e = 0; e < 3; e++) { const a = w[idx[i + e]], b = w[idx[i + (e + 1) % 3]]; if (a !== b) sm[a] += cav[b]; }
      for (let v = 0; v < n; v++) if (cnt[v]) cav[v] = cav[v] * 0.5 + (sm[v] / cnt[v]) * 0.5; }
    const f = (D.shade = new Float32Array(n)); for (let v = 0; v < n; v++) { const c = cav[w[v]]; f[v] = Math.max(0.56, Math.min(1.1, c > 0 ? 1 - c * 2.1 : 1 - c * 0.55)); }
  }
  const EDGED = { dhoti: 1, dhotiS: 1, dhotiL: 1, tasset: 1, drape: 2, sash: 2, panel: 2, tuck: 2, shawl: 2, drape: 2, veil: 2, bandeau: 2, baldric: 2, pauldron: 2, vambrace: 2, greave: 2, apron: 2, turban: 2 }, REACH = 0.12;
  function edges(M, D, p16, EDGED) {
    const n = M.n, names = Object.keys(M.parts), part = new Uint8Array(n), edge = new Float32Array(n).fill(1), half = new Float32Array(n).fill(1), idx = D.idx, pos = D.pos, weld = new Int32Array(n), par = new Int32Array(n);
    const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; }, cell = REACH, gk = (x, y, z) => (Math.floor(x / cell) + 512) * 1048576 + (Math.floor(y / cell) + 512) * 1024 + (Math.floor(z / cell) + 512);
    names.forEach((k, pi) => { const [s, l] = M.parts[k]; for (let i = s; i < s + l; i++) part[idx[i]] = pi; });
    D.part = part; D.partNames = names; D.edge = edge; D.half = half;
    names.forEach((k) => {
      if (!EDGED[k]) return;
      const [s, l] = M.parts[k], ids = new Map(), cnt = new Map();
      for (let i = s; i < s + l; i++) { const v = idx[i], key = (p16[v * 3] + 32768) * 4294967296 + (p16[v * 3 + 1] + 32768) * 65536 + (p16[v * 3 + 2] + 32768); let w = ids.get(key); if (w === undefined) { w = v; ids.set(key, v); par[v] = v; } weld[v] = w; }
      for (let i = s; i < s + l; i += 3) for (let e = 0; e < 3; e++) { const a = weld[idx[i + e]], b = weld[idx[i + (e + 1) % 3]]; if (a === b) continue; const ra = find(a), rb = find(b); if (ra !== rb) par[ra] = rb; const key = a < b ? a * 65536 + b : b * 65536 + a; cnt.set(key, (cnt.get(key) || 0) + 1); }
      // The piece's open edges, kept by where they lie so that each point need look only near itself.
      const grid = new Map(), sa = [], sb = []; const put = (g, i) => { let a = grid.get(g); if (!a) grid.set(g, (a = [])); if (a[a.length - 1] !== i) a.push(i); };
      for (const [key, c] of cnt) { if (c !== 1) continue; const a = Math.floor(key / 65536), b = key % 65536, i = sa.length; sa.push(a); sb.push(b);
        put(gk(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]), i); put(gk(pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]), i); put(gk((pos[a * 3] + pos[b * 3]) / 2, (pos[a * 3 + 1] + pos[b * 3 + 1]) / 2, (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2), i); }
      if (!sa.length) return;
      const verts = [...new Set(ids.values())], cmax = new Map(), cmin = new Map();
      for (const v of verts) {
        const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell); let best = REACH * REACH;
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let m = -1; m <= 1; m++) { const list = grid.get((cx + i + 512) * 1048576 + (cy + j + 512) * 1024 + (cz + m + 512)); if (!list) continue;
          for (const q of list) { const a = sa[q] * 3, b = sb[q] * 3, ax = pos[a], ay = pos[a + 1], az = pos[a + 2], ex = pos[b] - ax, ey = pos[b + 1] - ay, ez = pos[b + 2] - az, px = x - ax, py = y - ay, pz = z - az, ee = ex * ex + ey * ey + ez * ez;
            let t = ee > 0 ? (px * ex + py * ey + pz * ez) / ee : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const dx = px - ex * t, dy = py - ey * t, dz = pz - ez * t, d = dx * dx + dy * dy + dz * dz; if (d < best) best = d; } }
        const e = (edge[v] = Math.sqrt(best)), r = find(v); if (!(cmax.get(r) >= e)) cmax.set(r, e); if (!(cmin.get(r) <= y)) cmin.set(r, y);
      }
      for (const v of verts) { const r = find(v), hw = cmax.get(r); half[v] = hw >= REACH * 0.97 ? 1 : hw;
        if (EDGED[k] === 1 && hw > 0.1) edge[v] = pos[v * 3 + 1] - cmin.get(r); } // (a lower cloth's border runs level along its hem, not round the waist it is tucked in at)
      for (let i = s; i < s + l; i++) { const v = idx[i]; edge[v] = edge[weld[v]]; half[v] = half[weld[v]]; }
    });
  }
  const ORDER = { child: ["child", "youth", "adult", "elder"], youth: ["youth", "adult", "child", "elder"], adult: ["adult", "elder", "youth", "child"], elder: ["elder", "adult", "youth", "child"] };
  // The model a figure wears at its age: its own where the artist drew that age, else the nearest age drawn.
  G.modelFor = function (sp) {
    const id = sp && sp.model, all = G.MODELS; if (!id || !all) return null;
    for (const s of ORDER[sp.stage] || ORDER.adult) if (all[id + "_" + s]) return all[id + "_" + s];
    return null;
  };
  // Which of its looks: what the figure itself asks for (a disguise), else what the hour calls for, else its everyday dress.
  // G.lookHint is set by the fight for everyone in it ("war" on a battlefield); the forest years show in the figure's own gear.
  G.modelLook = function (sp, M) {
    const L = M.looks, gear = sp.gear || [], S = K.S, act = S ? S.act : 0, want = [];
    if (sp.look) want.push(sp.look);
    if (G.lookHint) want.push(G.lookHint);
    if (sp.headgear === "jata" && gear.includes("deerskin")) want.push("forest");
    if (act >= 6 || sp.armour || gear.includes("cuirass") || gear.includes("scale") || sp.headgear === "helmet") want.push("war");
    if (act === 2 && (sp.stage === "youth" || sp.stage === "child")) want.push("student");
    want.push("court", "home");
    for (const k of want) if (L[k]) return k;
    return Object.keys(L)[0];
  };
  // A dark painted line round each figure, as the leather puppets have and as hand-painted game figures do: the same
  // mesh drawn again, back faces only, each point pushed out along its normal by a fixed width on the screen. It lifts
  // a figure off the ground it stands on when seen small and from above. (G.q.outline false turns it off.)
  let OUT = null;
  G.outline = function (f, mesh) {
    if (!OUT) {
      OUT = new T.MeshBasicMaterial({ color: 0x24140c, side: T.BackSide, fog: true }); OUT.userData.keep = true; OUT.userData.px = { value: new T.Vector2(0.004, 0.004) };
      OUT.onBeforeCompile = (sh) => { sh.uniforms.uOut = OUT.userData.px; sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform vec2 uOut;").replace("#include <project_vertex>", "#include <project_vertex>\n{ vec4 cn = projectionMatrix * vec4(normalize(normalMatrix * objectNormal), 0.0); /* (not transformedNormal: three turns that round for a material that draws back faces) */ float l = length(cn.xy); if (l > 1e-5) gl_Position.xy += cn.xy / l * uOut * gl_Position.w; }"); };
      OUT.customProgramCacheKey = () => "outline"; OUT.visible = !(G.q && G.q.outline === false);
    }
    const o = new T.SkinnedMesh(mesh.geometry, OUT); o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false; o.renderOrder = -1;
    mesh.parent.add(o); o.updateMatrixWorld(true); o.bind(f.modelSkeleton, mesh.matrixWorld); f.outline = o;
    o.onBeforeRender = (r) => { const s = r.getDrawingBufferSize(SZ), w = 1.5 * Math.max(1, s.y / 900); OUT.userData.px.value.set((2 * w) / s.x, (2 * w) / s.y); }; // (about a pixel and a half on a phone, wider on a large screen)
    return o;
  };
  const SZ = new T.Vector2();
  G.outlines = function (on) { if (OUT) OUT.visible = !!on; }; // (all of them at once: the quality setting, and a phone that stays slow)
  let MAT = null;
  // c: role colours as hex numbers that override the look's own (sp.wear: one model worn in another's colours).
  G.modelSkin = function (f, sp, body, c) {
    const M = G.modelFor(sp), D = decode(M), look = G.modelLook(sp, M), LK = M.looks[look], parts = LK.parts.filter((k) => M.parts[k]);
    const role = Object.assign({}, LK.cols, c || {});
    // You wear what the story gave you: your skin, your home's colour on the lower cloth and its second colour on the
    // borders and the sash (K.puppetSpec's palette, as the 2D puppet wears it). In the forest years the cloth is bark, and only the sash keeps the colour.
    if (sp.palette && /^player_/.test(sp.model || "")) { const [skin, main, trim] = sp.palette; if (skin) role.skin = skin;
      if (look === "forest") { if (main) role.red = role.hem = main; }
      else { if (main) { role.cloth = main; if (LK.cols.band && LK.cols.band !== LK.cols.cloth) role.band = G.shade ? G.shade(main, 0.72) : main; } if (trim) role.hem = role.red = trim; } }
    const cols = M.roles.map((r, i) => (role[r] != null ? new T.Color(role[r]) : new T.Color().setRGB(M.cols[i][0] / 255, M.cols[i][1] / 255, M.cols[i][2] / 255, T.SRGBColorSpace)));
    const key = look + ":" + parts.join(",") + "|" + cols.map((x) => x.getHexString()).join("");
    let geo = D.geo.get(key);
    if (!geo) {
      let len = 0; for (const k of parts) len += M.parts[k][1];
      let idx = new Uint16Array(len), o = 0, mask = 0; const cov = D.cov, src = D.idx; if (cov) for (const k of parts) mask |= D.covBit[k] || 0;
      for (const k of parts) { const [s, l] = M.parts[k];
        if (k === "body" && mask) { for (let i = s; i < s + l; i += 3) { const a = src[i], b = src[i + 1], c = src[i + 2]; if ((cov[a] & mask) && (cov[b] & mask) && (cov[c] & mask)) continue; idx[o++] = a; idx[o++] = b; idx[o++] = c; } } // (skin under what is worn is not drawn: it cannot come through)
        else { idx.set(src.subarray(s, s + l), o); o += l; } }
      if (o < len) idx = idx.slice(0, o);
      const col = new Float32Array(M.n * 3), sh = D.shade; for (let i = 0; i < M.n; i++) { const q = cols[D.col[i]], k = sh ? sh[i] : 1; col[i * 3] = q.r * k; col[i * 3 + 1] = q.g * k; col[i * 3 + 2] = q.b * k; }
      geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(D.pos, 3)); geo.setAttribute("normal", new T.BufferAttribute(D.nor, 3)); geo.setAttribute("color", new T.BufferAttribute(col, 3));
      geo.setAttribute("skinIndex", new T.BufferAttribute(D.ji, 4)); geo.setAttribute("skinWeight", new T.BufferAttribute(D.jw, 4)); geo.setIndex(new T.BufferAttribute(idx, 1));
      if (G.dress && G.surfPut) { // what each piece is made of, and its borders (js/g3/dress.js, js/g3/surf.js)
        const hex = {}; M.roles.forEach((r, i) => { hex[r] = cols[i].getHex(T.SRGBColorSpace); });
        const dress = G.dress(sp.model, look, hex, M), n = M.n, A = new Uint8Array(n * 4), B = new Uint8Array(n * 4), C = new Uint8Array(n * 4), names = D.partNames;
        for (let i = 0; i < n; i++) G.surfPut(A, B, C, i, dress(names[D.part[i]], M.roles[D.col[i]]), D.edge[i], D.half[i]);
        G.surfAttrs(geo, A, B, C);
      }
      geo.userData.keep = true; D.geo.set(key, geo);   // (shared by every figure dressed alike, and kept between places)
    }
    if (!MAT) { MAT = G.surfMat ? G.surfMat({ map: 1, side: T.DoubleSide }) : new T.MeshPhongMaterial({ vertexColors: true, shininess: 26, specular: 0x3a2e20, side: T.DoubleSide }); /* (cloth is one skin, seen from both sides) */ MAT.userData.keep = true; }
    const mesh = new T.SkinnedMesh(geo, MAT); mesh.frustumCulled = false; mesh.castShadow = true; body.add(mesh);
    f.root.updateMatrixWorld(true); mesh.updateMatrixWorld(true);
    f.modelSkeleton = new T.Skeleton(M.joints.map((k) => f.j[k])); mesh.bind(f.modelSkeleton, mesh.matrixWorld); f.model = mesh; f.dress = look;
    if (/^player_/.test(sp.model || "") && (sp.heir || sp.eye)) keepsakes(f, sp, M, D, mesh);
    if (M.grip) { // the hollow of each closed hand, in its wrist's own space: a haft is set there, so the fingers are round it (figure.js)
      const at = (j, g) => new T.Vector3(g[0], g[1], g[2]).applyMatrix4(mesh.matrixWorld).applyMatrix4(new T.Matrix4().copy(f.j[j].matrixWorld).invert());
      f.gripL = at("wL", M.grip[0]); f.gripR = at("wR", M.grip[1]); }
    if (G.outline) G.outline(f, mesh);
    return mesh;
  };
  // What the story put on you, as the 2D puppet shows it: the family amulet on your breast (cracked once it has turned
  // a blow), the palm-leaf manuscript or the purse of the family's debt at your waist, a patch over a lost eye.
  // Each is found a place on this body's own surface and pinned to the joint that carries it.
  function keepsakes(f, sp, M, D, mesh) {
    if (!G.Builder) return;
    const pos = D.pos, part = D.part, names = D.partNames, body = names.indexOf("body"), PI = Math.PI;
    const front = (x0, x1, y0, y1, of) => { let z = -9; for (let i = 0; i < M.n; i++) { if (part[i] !== of) continue; const x = pos[i * 3], y = pos[i * 3 + 1]; if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && pos[i * 3 + 2] > z) z = pos[i * 3 + 2]; } return z; };
    const pin = (joint, x, y, z, b) => { const j = f.j[joint], m = b.mesh(); if (!j) return; m.matrixAutoUpdate = false; m.matrix.copy(j.matrixWorld).invert().multiply(mesh.matrixWorld).multiply(new T.Matrix4().makeTranslation(x, y, z)); m.castShadow = false; j.add(m); };
    const k = M.scaleY || 1, trim = sp.palette && sp.palette[2] ? sp.palette[2] : 0xd9a53a;
    let top = -9; for (let i = 0; i < M.n; i++) if (part[i] === body && pos[i * 3 + 1] > top) top = pos[i * 3 + 1];   // the base of the neck: this body's own measure of height
    const h = top / 1.47;
    if (sp.heir === "amulet") { const y = 1.3 * h, z = front(-0.03, 0.03, y - 0.03, y + 0.03, body); if (z > -9) { const b = new G.Builder(); b.surf("gold");
      b.geo(new T.CylinderGeometry(0.03 * h, 0.03 * h, 0.008, 12).rotateX(PI / 2), 0, 0, 0, 0, 0, 0, sp.cracked ? 0x8a7a4a : trim); b.sph(0.011 * h, 0, 0, 0.006, sp.cracked ? 0x3a2a1a : 0xb2432a, 1, 6);
      b.surf("rope", 0x1a0e08, 0.02); for (const sx of [-1, 1]) b.rod(0, 0.02 * h, 0, sx * 0.07 * h, 0.15 * h, -0.035 * h, 0.004, 0x3a2414, 4); pin("T", 0, y, z + 0.012, b); } }
    if (sp.heir === "manuscript" || sp.heir === "debt") { const y = 1.0 * h, x = (sp.heir === "debt" ? -0.1 : 0.1) * h, z = front(x - 0.025, x + 0.025, y - 0.04, y + 0.04, body); if (z > -9) { const b = new G.Builder();
      if (sp.heir === "manuscript") { b.surf("rings", 0xa3302a, 0.05); b.geo(new T.CylinderGeometry(0.02 * h, 0.02 * h, 0.13 * h, 8).rotateZ(PI / 2), 0, 0, 0, 0, 0, 0, 0xe8dcc0); }
      else { b.surf("leather"); b.sph(0.04 * h, 0, -0.02 * h, 0, 0x6a4a2a, 1.15, 8, 1, 0.8); b.cyl(0.014 * h, 0.022 * h, 0.03 * h, 0, 0.012 * h, 0, 0x4a3018, 6); }
      pin("P", x, y, z + 0.05 * h, b); } }
    if (sp.eye) { const iris = M.roles.indexOf("iris"), face = names.indexOf("face"); let n = 0, ex = 0, ey = 0, ez = 0; for (let i = 0; i < M.n; i++) if (part[i] === face && D.col[i] === iris && pos[i * 3] > 0) { ex += pos[i * 3]; ey += pos[i * 3 + 1]; ez += pos[i * 3 + 2]; n++; }
      if (n) { const b = new G.Builder(); b.surf("leather"); b.geo(new T.SphereGeometry(0.026 * h, 8, 6).scale(1, 0.85, 0.45), 0, 0, 0, 0, 0, 0, 0x1c120c); b.rod(-0.02 * h, 0.012 * h, 0, -0.11 * h, 0.05 * h, -0.07 * h, 0.004, 0x1c120c, 3); b.rod(0.02 * h, 0.012 * h, 0, 0.05 * h, 0.05 * h, -0.09 * h, 0.004, 0x1c120c, 3); pin("H", ex / n, ey / n, ez / n + 0.008, b); } }
  }
})(window.K = window.K || {});
