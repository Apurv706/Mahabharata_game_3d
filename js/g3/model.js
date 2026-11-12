/* Heroes modelled in Blender (tools/blender), worn on the same joints the code-built figures have.
   A model is one set of points with named parts (body, head, hair, crown, cloth, gold, armour...) and colour roles (skin,
   cloth, accent, gold, hair...). Which parts show, and what colour each role is, come from the figure's own look, so the
   same model changes its dress with the acts and its build with the years, and takes each wearer's colours. */
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
    return (M._d = { pos, nor, ji, jw, col: bytes(M.col), idx: new Uint16Array(bytes(M.idx).buffer), geo: new Map() });
  }
  // Which parts a look wears.
  G.modelParts = function (sp) {
    const gear = sp.gear || [], young = sp.stage === "child" || sp.stage === "youth", lean = young || !!sp.slim, crowned = /^(crown|kirita|mukuta)$/.test(sp.headgear || "");
    const forest = sp.headgear === "jata" || gear.includes("deerskin"), armour = !lean && (!!sp.armour || gear.includes("cuirass") || gear.includes("scale"));
    const p = [lean ? "bodylean" : "body", "head", "hands", "face", "hair", "dhoti"];
    if (sp.whiskers && !young) p.push("stache");
    if (forest) p.push("jata", "hide"); else { p.push(young ? "knot" : "locks", "sash", "gold"); if (crowned) p.push("crown"); if (!lean) p.push("bands"); } // (grown, his hair falls loose to the shoulders, as the old prints have it)
    if (forest && !young) p.push("beard");
    if (armour) p.push("cuirass"); else if (!forest && (crowned || sp.rich)) p.push(lean ? "uttariyalean" : "uttariya");
    return p;
  };
  let MAT = null;
  // c: { skin, cloth, accent, gold, hair, hide, armour } as hex numbers; anything left out keeps the model's own colour.
  G.modelSkin = function (f, sp, body, c) {
    const M = G.MODELS[sp.model], D = decode(M), parts = G.modelParts(sp).filter((k) => M.parts[k]);
    const role = { skin: c.skin, cloth: c.cloth, red: c.accent, gold: c.gold, hair: c.hair, hide: c.hide, armour: c.armour != null ? c.armour : 0x3d4149 };   // (armour: dark iron, so it reads against gold skin and yellow cloth)
    if (parts.includes("hide") && !sp.wear) { role.cloth = 0xa07a44; role.red = 0x6a4a26; }   // (the forest years: bark-dyed cloth, nothing bright)
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
    if (!MAT) { MAT = new T.MeshPhongMaterial({ vertexColors: true, shininess: 26, specular: 0x3a2e20 }); MAT.userData.keep = true; }
    const mesh = new T.SkinnedMesh(geo, MAT); mesh.frustumCulled = false; mesh.castShadow = true; body.add(mesh);
    f.root.updateMatrixWorld(true); mesh.updateMatrixWorld(true);
    f.modelSkeleton = new T.Skeleton(M.joints.map((k) => f.j[k])); mesh.bind(f.modelSkeleton, mesh.matrixWorld); f.model = mesh;
    return mesh;
  };
})(window.K = window.K || {});
