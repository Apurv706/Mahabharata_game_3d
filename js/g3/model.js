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
    return (M._d = { pos, nor, ji, jw, col: bytes(M.col), idx: new Uint16Array(bytes(M.idx).buffer), geo: new Map() });
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
  let MAT = null;
  // c: role colours as hex numbers that override the look's own (sp.wear: one model worn in another's colours).
  G.modelSkin = function (f, sp, body, c) {
    const M = G.modelFor(sp), D = decode(M), look = G.modelLook(sp, M), LK = M.looks[look], parts = LK.parts.filter((k) => M.parts[k]);
    const role = Object.assign({}, LK.cols, c || {});
    const cols = M.roles.map((r, i) => (role[r] != null ? new T.Color(role[r]) : new T.Color().setRGB(M.cols[i][0] / 255, M.cols[i][1] / 255, M.cols[i][2] / 255, T.SRGBColorSpace)));
    const key = parts.join(",") + "|" + cols.map((x) => x.getHexString()).join("");
    let geo = D.geo.get(key);
    if (!geo) {
      let len = 0; for (const k of parts) len += M.parts[k][1];
      const idx = new Uint16Array(len); let o = 0; for (const k of parts) { const [s, l] = M.parts[k]; idx.set(D.idx.subarray(s, s + l), o); o += l; }
      const col = new Float32Array(M.n * 3); for (let i = 0; i < M.n; i++) { const q = cols[D.col[i]]; col[i * 3] = q.r; col[i * 3 + 1] = q.g; col[i * 3 + 2] = q.b; }
      geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(D.pos, 3)); geo.setAttribute("normal", new T.BufferAttribute(D.nor, 3)); geo.setAttribute("color", new T.BufferAttribute(col, 3));
      geo.setAttribute("skinIndex", new T.BufferAttribute(D.ji, 4)); geo.setAttribute("skinWeight", new T.BufferAttribute(D.jw, 4)); geo.setIndex(new T.BufferAttribute(idx, 1));
      geo.userData.keep = true; D.geo.set(key, geo);   // (shared by every figure dressed alike, and kept between places)
    }
    if (!MAT) { MAT = new T.MeshPhongMaterial({ vertexColors: true, shininess: 26, specular: 0x3a2e20, side: T.DoubleSide }); /* (cloth is one skin, seen from both sides) */ MAT.userData.keep = true; }
    const mesh = new T.SkinnedMesh(geo, MAT); mesh.frustumCulled = false; mesh.castShadow = true; body.add(mesh);
    f.root.updateMatrixWorld(true); mesh.updateMatrixWorld(true);
    f.modelSkeleton = new T.Skeleton(M.joints.map((k) => f.j[k])); mesh.bind(f.modelSkeleton, mesh.matrixWorld); f.model = mesh; f.dress = look;
    return mesh;
  };
})(window.K = window.K || {});
