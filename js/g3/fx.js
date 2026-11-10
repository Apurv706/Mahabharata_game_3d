/* Effects: two pools of point particles (one that glows, one that does not), flames for lamps, torches and fires,
   arrows in flight, the marks a blow paints on the ground before it lands, and the larger lights of the divine weapons
   (rings, pillars, bolts). All on the frame clock; all stop with calm motion where they are only decoration. */
(function (K) {
  "use strict";
  const T = window.THREE, G = K.G3;
  if (!T) return;
  const V3 = T.Vector3, PI = Math.PI;
  const F = (G.fx = {});
  const calm = () => !!(K.UI && K.UI.calm && K.UI.calm());

  // ---------- Particles ----------
  function Pool(tex, additive, max) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.c = new Float32Array(max * 4); this.s = new Float32Array(max);
    this.life = new Float32Array(max); this.age = new Float32Array(max); this.grav = new Float32Array(max); this.grow = new Float32Array(max); this.s0 = new Float32Array(max); this.a0 = new Float32Array(max); this.drag = new Float32Array(max);
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(this.p, 3)); g.setAttribute("color", new T.BufferAttribute(this.c, 4)); g.setAttribute("size", new T.BufferAttribute(this.s, 1));
    g.setDrawRange(0, 0);
    this.u = { map: { value: G.tex(tex) }, scale: { value: 600 } };
    const m = new T.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: "attribute float size; attribute vec4 color; varying vec4 vC; uniform float scale; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * scale / max(0.1, -mv.z); }",
      fragmentShader: "uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, 1.0) * t * vC.a; }"
    });
    if (!additive) m.fragmentShader = "uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, t.a * vC.a); }";
    this.mesh = new T.Points(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
  }
  Pool.prototype.add = function (x, y, z, vx, vy, vz, col, alpha, size, life, grav, grow, drag) {
    let i = this.n;
    if (i >= this.max) { i = Math.floor(Math.random() * this.max); } else this.n++;
    const p = this.p, v = this.v, c = this.c;
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z; v[i * 3] = vx; v[i * 3 + 1] = vy; v[i * 3 + 2] = vz;
    c[i * 4] = ((col >> 16) & 255) / 255; c[i * 4 + 1] = ((col >> 8) & 255) / 255; c[i * 4 + 2] = (col & 255) / 255; c[i * 4 + 3] = alpha;
    this.s[i] = size; this.s0[i] = size; this.a0[i] = alpha; this.life[i] = life; this.age[i] = 0; this.grav[i] = grav || 0; this.grow[i] = grow || 0; this.drag[i] = drag || 0;
  };
  Pool.prototype.step = function (dt) {
    const p = this.p, v = this.v, c = this.c;
    for (let i = 0; i < this.n; i++) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { // the last one takes its place
        const j = --this.n;
        if (i !== j) { for (let k = 0; k < 3; k++) { p[i * 3 + k] = p[j * 3 + k]; v[i * 3 + k] = v[j * 3 + k]; } for (let k = 0; k < 4; k++) c[i * 4 + k] = c[j * 4 + k];
          this.s[i] = this.s[j]; this.s0[i] = this.s0[j]; this.a0[i] = this.a0[j]; this.life[i] = this.life[j]; this.age[i] = this.age[j]; this.grav[i] = this.grav[j]; this.grow[i] = this.grow[j]; this.drag[i] = this.drag[j]; }
        i--; continue;
      }
      const k = this.age[i] / this.life[i], d = Math.max(0, 1 - this.drag[i] * dt);
      v[i * 3] *= d; v[i * 3 + 2] *= d; v[i * 3 + 1] = v[i * 3 + 1] * d - this.grav[i] * dt;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      if (p[i * 3 + 1] < 0.02 && this.grav[i] > 0) { p[i * 3 + 1] = 0.02; v[i * 3 + 1] *= -0.25; v[i * 3] *= 0.5; v[i * 3 + 2] *= 0.5; }
      this.s[i] = this.s0[i] * (1 + this.grow[i] * k);
      c[i * 4 + 3] = this.a0[i] * (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88);
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.size.needsUpdate = true;
    g.setDrawRange(0, this.n);
    this.u.scale.value = (G.H * G.renderer.getPixelRatio()) / (2 * Math.tan((G.camera.fov * PI) / 360));
  };
  let glow = null, haze = null, emitters = [], flames = [], arrows = [], shapes = [];
  F.init = function () {
    if (!G.ok || glow) return;
    glow = new Pool("glow", true, 700); haze = new Pool("smoke", false, 500);
    G.scene.add(glow.mesh); G.scene.add(haze.mesh);
    G.onFrame((dt, t) => {
      for (const e of emitters) e(dt, t);
      glow.step(dt); haze.step(dt);
      for (const f of flames) f.tick(dt, t);
      for (let i = arrows.length - 1; i >= 0; i--) if (arrows[i](dt)) arrows.splice(i, 1);
      for (let i = shapes.length - 1; i >= 0; i--) if (shapes[i](dt)) shapes.splice(i, 1);
    });
  };
  const R = Math.random, rs = (a) => (R() - 0.5) * 2 * a;
  // A puff, a spray, a flash: kinds of burst at a point.
  F.burst = function (kind, at, o) {
    if (!glow) return; o = o || {}; const n = Math.round((o.n || 10) * (calm() ? 0.4 : 1)), x = at.x, y = at.y, z = at.z, s = o.s || 1;
    if (kind === "dust") for (let i = 0; i < n; i++) haze.add(x + rs(0.3 * s), y + R() * 0.2, z + rs(0.3 * s), rs(1.2 * s), 0.4 + R() * 0.9, rs(1.2 * s), o.col || 0xcdb18a, 0.5, (0.5 + R() * 0.7) * s, 0.7 + R() * 0.6, -0.2, 2.2, 1.5);
    else if (kind === "spark") for (let i = 0; i < n; i++) glow.add(x, y, z, rs(4 * s), 1 + R() * 3.5 * s, rs(4 * s), o.col || 0xffd890, 1, 0.12 + R() * 0.12, 0.25 + R() * 0.3, 9, -0.5, 0.5);
    else if (kind === "hit") { glow.add(x, y, z, 0, 0, 0, o.col || 0xfff2d0, 0.95, 1.5 * s, 0.16, 0, 0.9, 0); for (let i = 0; i < n; i++) glow.add(x, y, z, rs(3 * s), R() * 2.5, rs(3 * s), o.col || 0xffe2a8, 0.9, 0.1 + R() * 0.1, 0.2 + R() * 0.2, 7, -0.4, 1); }
    else if (kind === "ember") for (let i = 0; i < n; i++) glow.add(x + rs(0.4 * s), y + R() * 0.3, z + rs(0.4 * s), rs(0.5), 0.8 + R() * 1.6, rs(0.5), R() < 0.5 ? 0xffa040 : 0xff6a20, 0.9, 0.07 + R() * 0.08, 1.2 + R() * 1.6, -0.3, -0.6, 0.3);
    else if (kind === "smoke") for (let i = 0; i < n; i++) haze.add(x + rs(0.3 * s), y + R() * 0.3, z + rs(0.3 * s), rs(0.3), 0.7 + R() * 0.8, rs(0.3), o.col || 0x4a4038, 0.42, (0.9 + R()) * s, 2 + R() * 2, -0.1, 2.6, 0.2);
    else if (kind === "splash") for (let i = 0; i < n; i++) glow.add(x + rs(0.2), y, z + rs(0.2), rs(1.8 * s), 2 + R() * 2.4 * s, rs(1.8 * s), o.col || 0xbfe8f0, 0.7, 0.1 + R() * 0.1, 0.5 + R() * 0.3, 9, 0, 0.2);
    else if (kind === "leaf") for (let i = 0; i < n; i++) haze.add(x + rs(1.5 * s), y + R() * 1.5, z + rs(1.5 * s), rs(1.2), R() * 1.5, rs(1.2), o.col || 0x7a9a48, 0.9, 0.12, 1.2 + R(), 2.4, 0, 1.2);
    else if (kind === "light") for (let i = 0; i < n; i++) glow.add(x + rs(0.5 * s), y + R() * 1.6 * s, z + rs(0.5 * s), rs(0.4), 0.5 + R() * 1.2, rs(0.4), o.col || 0xfff0b0, 0.8, (0.15 + R() * 0.25) * s, 0.8 + R() * 0.9, -0.4, 0.4, 0.4);
    else if (kind === "heal") for (let i = 0; i < n; i++) glow.add(x + rs(0.4), y + R() * 0.4, z + rs(0.4), 0, 0.7 + R() * 0.8, 0, o.col || 0x9af0a0, 0.8, 0.14 + R() * 0.12, 0.9 + R() * 0.5, -0.2, 0.2, 0);
  };
  // Things in the air of a place, for as long as the place stands: returns a stop function.
  F.ambient = function (kind, o) {
    if (!glow || calm()) return () => {};
    o = o || {}; const r = o.r || 18, c = o.at || new V3(), rate = o.rate || 8; let acc = 0;
    const e = (dt) => {
      acc += dt * rate * (G.q.crowd || 1);
      while (acc >= 1) { acc -= 1;
        const x = c.x + rs(r), z = c.z + rs(r);
        if (kind === "motes") glow.add(x, 0.3 + R() * 3.5, z, rs(0.15), rs(0.08), rs(0.15), o.col || 0xffdca0, 0.35, 0.06 + R() * 0.06, 4 + R() * 3, 0, 0, 0);
        else if (kind === "dust") haze.add(x, 0.2 + R() * 1.2, z, 0.5 + R() * 0.8, 0.05, rs(0.3), o.col || 0xcdb18a, 0.16, 2.5 + R() * 3, 5 + R() * 3, 0, 0.6, 0);
        else if (kind === "embers") glow.add(x, 0.2 + R() * 0.6, z, rs(0.6), 0.7 + R() * 1.4, rs(0.6), R() < 0.5 ? 0xffa040 : 0xff5a18, 0.9, 0.06 + R() * 0.07, 2 + R() * 2.4, -0.25, -0.5, 0.2);
        else if (kind === "fireflies") glow.add(x, 0.4 + R() * 1.8, z, rs(0.4), rs(0.2), rs(0.4), 0xd8ff80, 0.9, 0.07, 2.5 + R() * 2, 0, 0, 0.3);
        else if (kind === "rain") haze.add(x, 7 + R() * 3, z, 1.2, -16, 0.4, 0xb8c8d8, 0.4, 0.07, 0.55, 0, 0, 0);
        else if (kind === "leaves") haze.add(x, 3 + R() * 3, z, 0.4 + rs(0.5), -0.5 - R() * 0.5, rs(0.5), o.col || 0xc9a04a, 0.85, 0.12, 5 + R() * 2, 0.1, 0, 0.1);
        else if (kind === "ash") haze.add(x, 0.5 + R() * 5, z, rs(0.4), -0.2 + rs(0.2), rs(0.4), 0x8a8078, 0.5, 0.08, 4 + R() * 3, 0, 0, 0);
        else if (kind === "smoke") haze.add(x, 0.5, z, rs(0.3), 0.9 + R(), rs(0.3), o.col || 0x3a322c, 0.3, 1.6 + R() * 1.4, 4 + R() * 3, -0.05, 2.4, 0.1);
        else if (kind === "bubbles") glow.add(x, R() * 2, z, rs(0.1), 0.5 + R() * 0.5, rs(0.1), 0xc8f4ff, 0.5, 0.05 + R() * 0.05, 3, -0.1, 0, 0);
      }
    };
    emitters.push(e);
    return () => { const i = emitters.indexOf(e); if (i >= 0) emitters.splice(i, 1); };
  };
  F.clear = function () { emitters = []; for (const f of flames) if (f.obj.parent) f.obj.parent.remove(f.obj); flames = []; for (const a of arrows.splice(0)) a(99); for (const s of shapes.splice(0)) s(99); if (glow) { glow.n = 0; haze.n = 0; } };

  // ---------- Flames ----------
  let lights = 0;
  const flameMat = () => new T.SpriteMaterial({ map: G.tex("flame"), blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  // A flame at a point: a lamp (s 0.25), a torch (0.6), a campfire (1.4), a pyre (3). light: also a real light (few).
  F.flame = function (parent, x, y, z, s, light) {
    if (!G.ok) return null;
    const g = new T.Group(); g.position.set(x, y, z);
    const a = new T.Sprite(flameMat()), b = new T.Sprite(flameMat());
    a.scale.set(0.62 * s, 0.95 * s, 1); a.position.y = 0.42 * s; b.scale.set(0.4 * s, 0.6 * s, 1); b.position.y = 0.3 * s; b.material.opacity = 0.8;
    const halo = new T.Sprite(new T.SpriteMaterial({ map: G.tex("glow"), color: 0xff9a40, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.32, fog: false }));
    halo.scale.set(3.4 * s, 3.4 * s, 1); halo.position.y = 0.4 * s;
    g.add(halo, a, b);
    let pl = null;
    if (light && lights < (G.q.name === "low" ? 1 : 4)) { pl = new T.PointLight(0xff9a48, 2.2 * s + 3, 9 + s * 9, 1.6); pl.position.y = 0.6 * s; g.add(pl); lights++; }
    (parent || G.world).add(g);
    const ph = R() * 9, f = { obj: g, tick(dt, t) {
      const k = 1 + Math.sin(t * 13 + ph) * 0.08 + Math.sin(t * 7.3 + ph * 2) * 0.07;
      a.scale.set(0.62 * s * (2 - k), 0.95 * s * k, 1); b.scale.set(0.4 * s * k, 0.6 * s * (2 - k), 1); a.material.rotation = Math.sin(t * 5 + ph) * 0.1;
      if (pl) pl.intensity = (2.2 * s + 3) * (0.86 + 0.14 * k);
      if (s >= 0.9 && !calm() && R() < dt * 5 * s) F.burst("ember", g.getWorldPosition(new V3()), { n: 1, s: s * 0.5 });
    }, dispose() { if (pl) lights--; } };
    flames.push(f);
    return f;
  };
  F.resetLights = () => { lights = 0; };

  // ---------- Arrows in flight ----------
  // From a to b in `secs`, lifted by `arc` at the middle; done(hit) when it arrives. Returns the mesh.
  F.arrow = function (a, b, secs, arc, done, stick) {
    if (!G.ok) { if (done) done(); return null; }
    const m = G.arrowMesh(0.85); G.fxRoot.add(m);
    let t = 0; const p = new V3(), q = new V3();
    const at = (k, out) => out.lerpVectors(a, b, k).setY(a.y + (b.y - a.y) * k + Math.sin(k * PI) * (arc || 0));
    arrows.push((dt) => {
      t += dt; const k = Math.min(1, t / Math.max(0.03, secs));
      at(k, p); at(Math.min(1, k + 0.04), q); m.position.copy(p); if (k < 1) m.lookAt(q);
      if (k >= 1 || dt > 50) { if (done && dt < 50) done(m); if (stick && dt < 50) { setTimeout(() => { if (m.parent) m.parent.remove(m); G.dispose(m); }, stick * 1000); } else { if (m.parent) m.parent.remove(m); G.dispose(m); } return true; }
      return false;
    });
    return m;
  };

  // ---------- Marks on the ground: where a blow will land ----------
  // kind: "fan" (a blade's sweep, opening `arc` radians toward +Z), "ring" (all around), "lane" (an arrow's line, along +Z).
  F.mark = function (kind, o) {
    if (!G.ok) return null; o = o || {};
    const g = new T.Group(), col = o.col || 0xff8a2a, r = o.r || 2, w = o.w || 0.8;
    const mk = (geo, op) => { const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide, fog: false })); m.rotation.x = -PI / 2; m.renderOrder = 3; return m; };
    let outer, inner;
    if (kind === "fan") { const a = o.arc || 1.5; outer = mk(new T.RingGeometry(0.25, r, 18, 1, PI / 2 - a / 2, a), 0.2); inner = mk(new T.RingGeometry(0.25, r, 18, 1, PI / 2 - a / 2, a), 0.5); }
    else if (kind === "ring") { outer = mk(new T.CircleGeometry(r, 28), 0.18); inner = mk(new T.CircleGeometry(r, 28), 0.45); }
    else { outer = mk(new T.PlaneGeometry(w, r).translate(0, r / 2, 0), 0.18); inner = mk(new T.PlaneGeometry(w, r).translate(0, r / 2, 0), 0.5); }
    // (the plane and ring lie in XY before the turn, so "+Y" there is "+Z"... turned to face along -Z; flip so it opens toward +Z)
    outer.rotation.z = PI; inner.rotation.z = PI;
    g.add(outer, inner); g.position.y = 0.05;
    g.userData.set = function (fill, locked, heavy) {
      const k = G.clamp(fill, 0.02, 1);
      if (kind === "lane") inner.scale.set(1, k, 1); else inner.scale.set(k, k, 1);
      const c = locked ? 0xffffff : heavy ? 0xff4a2a : col;
      inner.material.color.setHex(fill > 0.86 ? 0xff3a20 : c); outer.material.color.setHex(c);
    };
    g.userData.free = function () { if (g.parent) g.parent.remove(g); G.dispose(g); };
    G.fxRoot.add(g);
    return g;
  };

  // ---------- Larger lights ----------
  // A ring spreading on the ground.
  F.ring = function (at, col, r0, r1, secs, y) {
    if (!G.ok) return;
    const m = new T.Mesh(new T.PlaneGeometry(2, 2), new T.MeshBasicMaterial({ map: G.tex("ring"), color: col, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }));
    m.rotation.x = -PI / 2; m.position.set(at.x, (y || 0.08), at.z); m.renderOrder = 4; G.fxRoot.add(m);
    let t = 0;
    shapes.push((dt) => { t += dt; const k = Math.min(1, t / secs), r = r0 + (r1 - r0) * G.ease(k); m.scale.set(r, r, 1); m.material.opacity = 1 - k; if (k >= 1 || dt > 50) { G.fxRoot.remove(m); G.dispose(m); return true; } return false; });
  };
  // A pillar of light standing on a point, or a bolt from a to b.
  F.beam = function (a, b, col, width, secs) {
    if (!G.ok) return;
    const d = new V3().subVectors(b, a), len = d.length();
    const m = new T.Mesh(new T.CylinderGeometry(width, width, len, 8, 1, true), new T.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false }));
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); m.renderOrder = 6; G.fxRoot.add(m);
    let t = 0;
    shapes.push((dt) => { t += dt; const k = Math.min(1, t / secs); m.material.opacity = Math.sin(Math.min(1, k * 4) * PI / 2) * (1 - k * k); m.scale.set(1 + k * 0.8, 1, 1 + k * 0.8); if (k >= 1 || dt > 50) { G.fxRoot.remove(m); G.dispose(m); return true; } return false; });
  };
  // Something that falls from the sky onto a point and bursts (fire, water, a thunderbolt).
  F.fall = function (to, col, secs, kind, done) {
    if (!G.ok) { if (done) done(); return; }
    const from = new V3(to.x + rs(6), 22, to.z + rs(6)), s = new T.Sprite(new T.SpriteMaterial({ map: G.tex("glow"), color: col, blending: T.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    s.scale.set(2.2, 2.2, 1); G.fxRoot.add(s);
    let t = 0;
    shapes.push((dt) => {
      t += dt; const k = Math.min(1, t / secs); s.position.lerpVectors(from, to, k * k);
      if (R() < 0.8) glow.add(s.position.x, s.position.y, s.position.z, rs(0.6), rs(0.6), rs(0.6), col, 0.8, 0.5, 0.35, 0, 0.5, 0);
      if (k >= 1 || dt > 50) { G.fxRoot.remove(s); G.dispose(s); if (dt < 50) { F.burst(kind === "water" ? "splash" : "hit", to, { n: 16, s: 1.6, col }); F.ring(to, col, 0.5, 5, 0.6); if (done) done(); } return true; }
      return false;
    });
  };
  // The whole screen washed with a colour for a moment (the page's own layer, not the 3D).
  F.flash = function (css, ms) {
    if (K.headless || calm()) return;
    const el = document.createElement("div"); el.className = "g3-flash"; el.style.background = css || "#fff";
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.transition = "opacity " + (ms || 500) + "ms ease-out"; el.style.opacity = "0"; });
    setTimeout(() => el.remove(), (ms || 500) + 80);
  };
})(window.K = window.K || {});
