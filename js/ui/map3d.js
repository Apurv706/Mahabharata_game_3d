/* The map of Bharata, in relief. The 2D game drew its map as an SVG; here the same data (world/mapdata.js: the Natural
   Earth coastline, the rivers, the hill lines, the places' real positions) is a small land you look down on: a slab of
   land in a painted sea, the Himalaya standing along the north, towns and forests as markers, your road as a line of
   gold, and you, the size of a chess piece, walking it. Used three ways: the creation screen (tap a homeland), a
   journey between two scenes, and the Map window. */
(function (K) {
  "use strict";
  const U = K.UI, G = K.G3, T = window.THREE, MAP = K.MAP;
  if (!T || !MAP) { U.journeyPage = null; U.openMap = function () {}; return; }
  const S = 0.05, CX = 420, CY = 250; // world metres per map unit; the map point at the world's middle
  const wx = (x) => (x - CX) * S, wz = (y) => (y - CY) * S;
  const P3 = (id) => { const p = K.PLACES[id]; return p ? new T.Vector3(wx(p.x), 0.2, wz(p.y)) : null; };
  const X0 = -40, X1 = 920, Y0 = -30, Y1 = 930; // the painted rectangle, in map units
  const M = (U.map3d = { on: false, group: null, pins: [], look: new T.Vector3(), dist: 20, want: null, pawn: null, offs: [] });

  // ---------- The land, painted once onto a canvas ----------
  let landTex = null, shapes = null;
  function parse() {
    if (shapes) return shapes;
    shapes = [];
    for (const sub of MAP.LAND.split("M")) {
      const pts = sub.replace(/Z/g, "").split("L").map((s) => s.split(",").map(Number)).filter((p) => p.length === 2 && isFinite(p[0]) && isFinite(p[1]));
      if (pts.length > 2) shapes.push(pts);
    }
    return shapes;
  }
  function paint() {
    if (landTex) return landTex;
    const N = 1024, c = document.createElement("canvas"); c.width = c.height = N;
    const g = c.getContext("2d"), px = (x) => ((x - X0) / (X1 - X0)) * N, py = (y) => ((y - Y0) / (Y1 - Y0)) * N;
    const land = new Path2D();
    for (const pts of parse()) { pts.forEach((p, i) => (i ? land.lineTo(px(p[0]), py(p[1])) : land.moveTo(px(p[0]), py(p[1])))); land.closePath(); }
    g.fillStyle = "#3d7f8c"; g.fillRect(0, 0, N, N);
    g.save(); g.clip(land);
    // North to south: the snows, the green plain of the two rivers, the dry middle, the southern forests.
    const gr = g.createLinearGradient(0, py(0), 0, py(835));
    gr.addColorStop(0, "#d8d2c4"); gr.addColorStop(0.1, "#a9a47c"); gr.addColorStop(0.2, "#8fae5e"); gr.addColorStop(0.36, "#9db463"); gr.addColorStop(0.5, "#b3ad6a"); gr.addColorStop(0.7, "#8fa55a"); gr.addColorStop(1, "#6f9450");
    g.fillStyle = gr; g.fillRect(0, 0, N, N);
    const blob = (lon, lat, r, col, a) => { const [x, y] = MAP.proj(lon, lat), rg = g.createRadialGradient(px(x), py(y), 0, px(x), py(y), r); rg.addColorStop(0, col); rg.addColorStop(1, "rgba(0,0,0,0)"); g.globalAlpha = a; g.fillStyle = rg; g.fillRect(px(x) - r, py(y) - r, r * 2, r * 2); g.globalAlpha = 1; };
    blob(71.5, 27, 150, "#e0c890", 0.95); blob(69, 24.5, 90, "#d9c088", 0.7); blob(66, 29, 140, "#cdb98a", 0.8); // the desert of the west
    blob(80.3, 24.3, 80, "#4f7a3c", 0.8); blob(76, 30.2, 34, "#55803e", 0.7); blob(76.3, 29.6, 26, "#55803e", 0.6); blob(82, 21, 120, "#5d8a44", 0.6); blob(76, 15, 130, "#5a8a48", 0.5); // forests
    for (const [lon, lat] of MAP.HILLS) blob(lon, lat + 0.5, 56, "#efeae0", 0.9);
    for (const [lon, lat] of MAP.LOW) blob(lon, lat, 30, "#8a7a52", 0.55);
    // A little grain so the land is not flat colour.
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 5200; i++) { g.fillStyle = rnd() < 0.5 ? "rgba(60,80,30,0.08)" : "rgba(255,240,200,0.07)"; g.fillRect(rnd() * N, rnd() * N, 2 + rnd() * 4, 2 + rnd() * 4); }
    g.lineCap = "round"; g.lineJoin = "round";
    for (const [kind, pts] of MAP.RIVERS) {
      g.beginPath(); pts.forEach(([lon, lat], i) => { const [x, y] = MAP.proj(lon, lat); if (i) g.lineTo(px(x), py(y)); else g.moveTo(px(x), py(y)); });
      if (kind === "dry") { g.setLineDash([6, 7]); g.strokeStyle = "rgba(210,190,140,0.9)"; g.lineWidth = 3; } else { g.setLineDash([]); g.strokeStyle = "rgba(20,60,80,0.35)"; g.lineWidth = kind === "minor" ? 5 : 7.5; g.stroke(); g.strokeStyle = kind === "minor" ? "#5aa0b4" : "#4fa6c4"; g.lineWidth = kind === "minor" ? 2.6 : 4.4; }
      g.stroke();
    }
    g.setLineDash([]); g.restore();
    g.strokeStyle = "rgba(240,230,200,0.75)"; g.lineWidth = 2.2; g.stroke(land);
    g.strokeStyle = "rgba(20,50,60,0.35)"; g.lineWidth = 6; g.globalCompositeOperation = "destination-over"; g.stroke(land); g.globalCompositeOperation = "source-over";
    landTex = new T.CanvasTexture(c); landTex.colorSpace = T.SRGBColorSpace; landTex.anisotropy = 4; landTex.userData.keep = true;
    return landTex;
  }

  function build() {
    const grp = new T.Group();
    // The sea, and the land as a slab standing a little out of it.
    const sea = G.water([190, 150], 0, 0x2f7484, 1); sea.material.transparent = false; grp.add(sea); M.sea = sea;
    const shp = parse().map((pts) => { const s = new T.Shape(); pts.forEach((p, i) => { const x = wx(p[0]), y = -wz(p[1]); if (i) s.lineTo(x, y); else s.moveTo(x, y); }); return s; });
    const geo = new T.ExtrudeGeometry(shp, { depth: 0.22, bevelEnabled: false, curveSegments: 1 }).rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) { const mx = pos.getX(i) / S + CX, my = pos.getZ(i) / S + CY; uv.setXY(i, (mx - X0) / (X1 - X0), 1 - (my - Y0) / (Y1 - Y0)); }
    const land = new T.Mesh(geo, [new T.MeshLambertMaterial({ map: paint() }), new T.MeshLambertMaterial({ color: 0x8a6a44 })]);
    land.receiveShadow = true; grp.add(land);
    // The mountains: the Himalaya high and white along the north, the Vindhya and the Ghats low and brown.
    const b = new G.Builder(), rnd = G.rand(31);
    for (const [lon, lat] of MAP.HILLS) { const [x, y] = MAP.proj(lon, lat); for (let i = 0; i < 5; i++) { const h = 0.8 + rnd() * 1.1, r = 0.6 + rnd() * 0.55, ox = (rnd() - 0.5) * 3.2, oz = (rnd() - 0.5) * 1.9 - 0.5; b.cone(r, h, wx(x) + ox, 0.2, wz(y) + oz, 0x6a6558, 6, rnd() * 3, 0, 0, 0xffffff); } }
    for (const [lon, lat] of MAP.LOW) { const [x, y] = MAP.proj(lon, lat); for (let i = 0; i < 3; i++) b.cone(0.55 + rnd() * 0.4, 0.35 + rnd() * 0.35, wx(x) + (rnd() - 0.5) * 2.2, 0.2, wz(y) + (rnd() - 0.5) * 1.2, 0x7d7a4c, 6, rnd() * 3, 0, 0, 0x9a9460); }
    // Forests as small stands of trees; the two camps as tents; towns as a walled house with a banner.
    const mark = { dvaita: "wood", kamyaka: "wood", nishada: "wood", ashram: "hut", camp_pandava: "camp", camp_kaurava: "camp", kurukshetra: "field" };
    for (const [id, p] of Object.entries(K.PLACES)) {
      const x = wx(p.x), z = wz(p.y), k = mark[id] || "town";
      if (k === "wood") for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, r = rnd() * 0.5; b.cyl(0.03, 0.04, 0.18, x + Math.sin(a) * r, 0.22, z + Math.cos(a) * r, 0x5a3a20, 5); b.sph(0.17 + rnd() * 0.08, x + Math.sin(a) * r, 0.36, z + Math.cos(a) * r, 0x3f7a3a, 1.1, 6); }
      else if (k === "hut") { b.cyl(0.16, 0.16, 0.14, x, 0.22, z, 0xb89a6c, 8); b.cone(0.24, 0.2, x, 0.36, z, 0x9a7a40, 8); }
      else if (k === "camp") { const col = id === "camp_pandava" ? 0x2d5aa0 : 0xa3302a; for (let i = 0; i < 3; i++) b.cone(0.13, 0.2, x + (i - 1) * 0.24, 0.22, z + (i % 2) * 0.18, col, 6, 0, 0, 0, 0xf2ead2); }
      else if (k === "field") { b.cyl(0.42, 0.42, 0.02, x, 0.22, z, 0xb59468, 14); b.rod(x - 0.2, 0.22, z, x - 0.2, 0.62, z, 0.012, 0x3a2414, 4); b.box(0.16, 0.1, 0.01, x - 0.12, 0.5, z, 0x2d5aa0); b.rod(x + 0.2, 0.22, z, x + 0.2, 0.62, z, 0.012, 0x3a2414, 4); b.box(0.16, 0.1, 0.01, x + 0.28, 0.5, z, 0xa3302a); }
      else { const big = !p.small; b.box(big ? 0.44 : 0.3, 0.12, big ? 0.44 : 0.3, x, 0.22, z, 0xd8b98c); b.box(0.2, big ? 0.3 : 0.2, 0.2, x, 0.34, z, 0xe6cfa0, 0.6); b.cone(0.17, 0.16, x, big ? 0.64 : 0.54, z, 0xb2432a, 4, 0.78); if (big) { b.rod(x + 0.18, 0.34, z + 0.18, x + 0.18, 0.86, z + 0.18, 0.01, 0x3a2414, 4); b.box(0.15, 0.08, 0.01, x + 0.26, 0.78, z + 0.18, 0xe2b55a); } }
    }
    const mesh = b.mesh(); mesh.castShadow = true; grp.add(mesh);
    return grp;
  }
  // The road walked so far: a line of gold dots from place to place.
  function roadMesh(road) {
    const b = new G.Builder();
    for (let i = 1; i < road.length; i++) {
      const a = P3(road[i - 1]), c = P3(road[i]); if (!a || !c) continue;
      const n = Math.max(2, Math.round(a.distanceTo(c) / 0.16));
      for (let k = 0; k <= n; k++) { const f = k / n, y = 0.26 + Math.sin(f * Math.PI) * 0.02; b.sph(0.035, a.x + (c.x - a.x) * f, y, a.z + (c.z - a.z) * f, 0xffd24a, 1, 5); }
    }
    if (b.empty()) return null;
    const m = b.mesh(G.mat.vcGlow || undefined, true); return m;
  }

  // ---------- Showing it ----------
  // o: { focus: place id | [place, place] | null, dist, pins: [{ place, label, cls, onClick, id }], road: [ids], sky }
  M.show = function (o) {
    o = o || {};
    if (!G.ok) return M;
    M.hide(true);
    if (U.director) U.director.release();
    G.dropStage(); G.clear(G.actors);
    G.setSky(o.sky || "day", { fd: 0.0035, si: 2.5, dir: [-0.5, 0.75, 0.42] });
    M.group = build(); G.world.add(M.group);
    if (o.road && o.road.length > 1) { const r = roadMesh(o.road); if (r) M.group.add(r); }
    M.on = true; M.drag = { x: 0, z: 0 };
    M.setPins(o.pins || []);
    M.focus(o.focus || null, o.dist, true);
    M.offs.push(G.onFrame(frame));
    return M;
  };
  M.hide = function (keep) {
    for (const f of M.offs.splice(0)) f();
    M.setPins([]);
    if (M.pawn) { M.pawn.dispose(); M.pawn = null; }
    if (M.on && !keep) { G.dropStage(); }
    M.on = false; M.group = null;
  };
  M.setPins = function (pins) {
    for (const p of M.pins) p.el.remove();
    M.pins = [];
    const hud = U.$("stagehud");
    for (const p of pins) {
      const at = P3(p.place); if (!at) continue;
      const el = p.onClick ? U.button("pin3d " + (p.cls || ""), U.esc(p.label), p.onClick) : U.el('<span class="pin3d place ' + (p.cls || "") + '">' + U.esc(p.label) + "</span>");
      if (p.id) el.dataset.home = p.id;
      hud.appendChild(el); M.pins.push({ el, at: at.clone().setY(p.onClick ? 1.0 : 0.75), id: p.id });
    }
  };
  // Look at one place, at the stretch between two, or at the whole north.
  M.focus = function (f, dist, snap) {
    let look, d;
    if (Array.isArray(f)) { const a = P3(f[0]), b = P3(f[1]); look = a.clone().lerp(b, 0.5); d = Math.max(7, a.distanceTo(b) * 1.5 + 4.5); }
    else if (f && P3(f)) { look = P3(f); d = 8.5; }
    else { look = new T.Vector3(wx(455), 0, wz(245)); d = 25; }
    M.look.copy(look).setY(0.2); M.dist = (dist || d) * (G.portrait ? 1.25 : 1);
    cam(snap);
  };
  function cam(snap) {
    const fit = Math.max(1, G.fitDist(1, 42) / 2.8), d = M.dist * fit, pitch = 0.92;
    G.cam.rate = 2.2;
    G.camSet([M.look.x + M.drag.x, Math.sin(pitch) * d, M.look.z + M.drag.z + Math.cos(pitch) * d], [M.look.x + M.drag.x, 0.2, M.look.z + M.drag.z], 42, snap);
  }
  const scr = {};
  function frame(dt, t) {
    if (!M.on) return;
    if (M.sea && M.sea.userData.tick) M.sea.userData.tick(dt, t);
    cam(false);
    if (M.pawn) M.pawn.update(dt, t);
    const r = G.rect || { x: 0, y: 0, w: G.W, h: G.H };
    for (const p of M.pins) {
      G.toScreen(p.at, scr);
      const ok = !scr.behind && scr.x > r.x + 8 && scr.x < r.x + r.w - 8 && scr.y > r.y + 30 && scr.y < r.y + r.h + 20;
      p.el.style.display = ok ? "" : "none";
      if (ok) p.el.style.transform = "translate(" + Math.round(scr.x) + "px," + Math.round(scr.y) + "px) translate(-50%,-100%)";
    }
  }
  // You on the map: a figure the size of a chess piece.
  M.setPawn = function (at, spec) {
    if (M.pawn) { M.pawn.dispose(); M.pawn = null; }
    if (!G.ok || !at) return null;
    const f = G.figure(spec || G.lookOf("me"), { item: null });
    f.root.scale.setScalar(0.52); f.root.position.set(at.x, 0.22, at.z);
    G.actors.add(f.root); M.pawn = f;
    return f;
  };
  const placeLabels = (ids, here) => ids.filter((id, i) => K.PLACES[id] && ids.indexOf(id) === i).map((id) => ({ place: id, label: K.tr(K.PLACES[id].name), cls: id === here ? "here" : "" }));

  // ---------- A journey: from one place to the next, on foot across the map ----------
  U.journeyPage = function (from, to, why, done) {
    const S = K.S, a = P3(from), b = P3(to);
    if (!G.ok || !a || !b || U.headless()) return done();
    U.keys([]);
    const pageKey = "journey:" + from + ">" + to;
    if (U.pageAgain(pageKey)) return done();
    U.pageShown(pageKey);
    U.redraw = null;
    let over = false, off = null, timer = null;
    const finish = () => { if (over) return; over = true; if (off) off(); clearTimeout(timer); card.remove(); U.keys([]); U.curtain(() => { M.hide(); done(); }); };
    const card = U.el('<div class="roadcard"><span class="kind yours">' + U.esc(K.tr("The road")) + "</span><b>" + U.esc(K.tr(K.PLACES[from].name)) + " → " + U.esc(K.tr(K.PLACES[to].name)) + "</b>" + (why ? "<span>" + U.t(why) + "</span>" : "") +
      '<div class="btnrow" style="justify-content:center;margin-top:8px"><button type="button" class="cta" id="journey-go">' + U.tr("Continue") + "</button></div></div>");
    U.curtain(() => {
      U.$("page").innerHTML = ""; U.layout("full"); U.setNav(false);
      const road = (S.road || []).slice(0, -1);
      M.show({ focus: [from, to], pins: placeLabels([...(S.road || []), from, to], to), road: road.length > 1 ? road : null });
      U.$("stagehud").appendChild(card);
      card.querySelector("#journey-go").addEventListener("click", finish);
      const pawn = M.setPawn(a), len = a.distanceTo(b), secs = U.motion() ? G.clamp(1.6 + len * 0.28, 2.2, 4.6) : 0.01;
      if (pawn) { pawn.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); pawn.face = pawn.root.rotation.y; pawn.speed = 2.6; }
      let k = 0, puff = 0;
      off = G.onFrame((dt) => {
        if (!pawn || k >= 1) return;
        k = Math.min(1, k + dt / secs);
        const e = G.ease(k); pawn.root.position.set(a.x + (b.x - a.x) * e, 0.22, a.z + (b.z - a.z) * e);
        puff += dt; if (puff > 0.16) { puff = 0; G.fx.burst("dust", pawn.root.position, { n: 2, s: 0.35 }); }
        if (k >= 1) { pawn.speed = 0; pawn.pose("stand"); if (K.Sound) K.Sound.play("step"); }
      });
      U.keys([finish]);
      if (K.Sound) K.Sound.play("step");
    });
  };

  // ---------- The Map window: the whole land, your road, where you are ----------
  U.openMap = function () {
    const S = K.S;
    if (!S || !G.ok) return;
    if (M.on || document.body.dataset.mode !== "story") return;
    const sceneWas = U.director.sceneNow, page = U.$("page");
    const road = S.road || [];
    const close = () => { window.removeEventListener("keydown", key, true); bar.remove(); U.curtain(() => { M.hide(); page.style.visibility = ""; U.setNav(true); U.layout("story"); if (sceneWas) { U.director.scene(sceneWas, { force: true, intro: false }); U.director.tagsOn(true); } }); };
    const key = (e) => { if (e.key === "Escape" || e.key === "m" || e.key === "M") { e.preventDefault(); e.stopPropagation(); close(); } else e.stopPropagation(); };
    const bar = U.el('<div class="roadcard"><span class="kind yours">' + U.esc(K.tr("Map of the kingdoms")) + "</span><b>" + U.esc(K.tr("Bharatavarsha")) + "</b>" +
      (road.length ? "<span>" + U.esc(K.tr("Map. Your road: {r}", { r: road.filter((id) => K.PLACES[id]).map((id) => K.tr(K.PLACES[id].name)).join(" → ") })) + "</span>" : "") +
      '<div class="btnrow" style="justify-content:center;margin-top:8px"><button type="button" class="cta" id="map-close">' + U.tr("Close") + "</button></div></div>");
    U.curtain(() => {
      page.style.visibility = "hidden"; U.layout("full"); U.setNav(false);
      M.show({ focus: null, pins: placeLabels(Object.keys(K.PLACES).filter((id) => !K.PLACES[id].small || road.includes(id) || id === S.at), S.at), road: road.length > 1 ? road : null });
      if (S.at && P3(S.at)) M.setPawn(P3(S.at));
      U.$("stagehud").appendChild(bar);
      bar.querySelector("#map-close").addEventListener("click", close);
      window.addEventListener("keydown", key, true);
      wireDrag();
    });
  };
  // Drag to move over the map; the wheel or a pinch to come nearer.
  let dragWired = false;
  function wireDrag() {
    if (dragWired) return; dragWired = true;
    const cv = U.$("view"); let d = null, pinch = 0; const pts = new Map();
    cv.addEventListener("pointerdown", (e) => { if (!M.on) return; pts.set(e.pointerId, e); d = { x: e.clientX, y: e.clientY, dx: M.drag.x, dz: M.drag.z }; });
    cv.addEventListener("pointermove", (e) => {
      if (!M.on || !d || !pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
      if (pts.size === 2) { const [a, b] = [...pts.values()], l = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (pinch) M.dist = G.clamp(M.dist * (pinch / l), 6, 34); pinch = l; return; }
      const k = M.dist / Math.min(G.W, G.H) * 1.3; M.drag.x = G.clamp(d.dx - (e.clientX - d.x) * k, -22, 22); M.drag.z = G.clamp(d.dz - (e.clientY - d.y) * k * 1.3, -14, 30);
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; if (!pts.size) d = null; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", (e) => { if (M.on) M.dist = G.clamp(M.dist * (e.deltaY > 0 ? 1.1 : 0.9), 6, 34); }, { passive: true });
  }
  M.wireDrag = wireDrag;
  M.P3 = P3;
})(window.K = window.K || {});
