/* Kurukshetra 3D — the renderer core (K.G3).
   One WebGL canvas behind the whole game. This file owns the renderer, the frame loop, the camera rig (smoothed, with shake
   and a movable focus so the scene sits in whatever part of the screen the page leaves free), the sky and light presets,
   picking, and screen projection for labels. Everything else (figures, sets, fights, tests) builds THREE objects and hands
   them over. Under the test harness (K.headless) or without WebGL, G.ok stays false and every call here is a no-op: the
   story, the rules and the saves do not need a picture to run. */
(function (K) {
  "use strict";
  const T = window.THREE;
  const G = (K.G3 = Object.assign(K.G3 || {}, { ok: false, t: 0, dt: 0, q: { shadows: true, crowd: 1, dpr: 1.5, name: "med" } })); // (kept, not replaced: a model fetched before this script ran has already put itself in K.G3.MODELS)
  if (!T) return;
  const V3 = T.Vector3;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  G.clamp = clamp; G.lerp = lerp;
  G.v3 = (a, b, c) => (Array.isArray(a) ? new V3(a[0], a[1], a[2]) : a && a.isVector3 ? a.clone() : new V3(a || 0, b || 0, c || 0));
  // Seeded random for set dressing, so a place looks the same every visit.
  G.rand = function (seed) { let a = (seed >>> 0) || 1; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  G.hash = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  G.ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

  let renderer = null, scene = null, camera = null, canvas = null;
  let W = 1, H = 1, frameFns = [], running = false, lastNow = 0;
  const cam = { pos: new V3(0, 3, 9), look: new V3(0, 1.2, 0), fov: 42, wantPos: new V3(0, 3, 9), wantLook: new V3(0, 1.2, 0), wantFov: 42, rate: 3.2, shake: 0, shakeT: 0, up: new V3(0, 1, 0) };
  const focus = { x: 0, y: 0, k: 1, wx: 0, wy: 0, wk: 1 }; // view offset (px) and fov scale, eased toward the wanted values
  G.cam = cam;

  // ---------- Quality ----------
  // "auto" starts from the device (a phone: medium) and then follows the measured frame time by changing the render scale.
  const QUALITY = { low: { shadows: false, crowd: 0.3, dpr: 1, shadowMap: 0, outline: false }, med: { shadows: true, crowd: 0.55, dpr: 1.5, shadowMap: 1024 }, high: { shadows: true, crowd: 1, dpr: 2, shadowMap: 2048 } };
  const coarse = () => !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
  let scale = 1, slowT = 0, fastT = 0, auto = true;
  G.setQuality = function (name) {
    const pref = name || (K.prefs && K.prefs().gfx) || "auto";
    auto = pref === "auto";
    const base = auto ? (coarse() ? "med" : "high") : pref;
    const q = QUALITY[base] || QUALITY.med;
    G.q = { name: base, shadows: q.shadows, crowd: q.crowd, dpr: q.dpr, shadowMap: q.shadowMap, outline: q.outline !== false && !/[?&]noline=1/.test(location.search) }; if (G.outlines) G.outlines(G.q.outline); // (the dark line round each figure draws it a second time: the lowest setting goes without)
    scale = 1;
    if (!renderer) return;
    renderer.shadowMap.enabled = q.shadows;
    if (G.sun) { G.sun.castShadow = q.shadows; if (q.shadows) { G.sun.shadow.mapSize.set(q.shadowMap, q.shadowMap); if (G.sun.shadow.map) { G.sun.shadow.map.dispose(); G.sun.shadow.map = null; } } }
    resize();
  };
  function adapt(dt) {
    if (!auto || dt <= 0) return;
    if (dt > 0.03) { slowT += dt; fastT = 0; } else if (dt < 0.0175) { fastT += dt; slowT = Math.max(0, slowT - dt); } else { fastT = 0; }
    if (slowT > 1.5 && scale > 0.55) { scale = Math.max(0.55, scale - 0.15); slowT = 0; resize(); }
    else if (slowT > 3 && scale <= 0.55 && G.q.shadows && G.sun) { // still slow at the smallest drawing size: a modest phone. Shadows go (every figure is drawn twice for them) and later scenes are built with thinner ranks; this lasts until the page is opened again.
      G.q.shadows = false; G.q.crowd = Math.min(G.q.crowd, 0.3); G.sun.castShadow = false; G.q.outline = false; if (G.outlines) G.outlines(false); slowT = 0; }
    else if (fastT > 6 && scale < 1) { scale = Math.min(1, scale + 0.1); fastT = 0; resize(); }
  }

  // ---------- Start ----------
  G.init = function () {
    if (K.headless || G.ok) return G.ok;
    canvas = document.getElementById("view");
    if (!canvas) return false;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: !coarse(), powerPreference: "high-performance", alpha: false, stencil: false }); }
    catch (e) { document.body.classList.add("no-gl"); return false; }
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.type = T.PCFShadowMap;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(42, 1, 0.1, 900);
    G.renderer = renderer; G.scene = scene; G.camera = camera;
    // Lights: one sun (the only shadow), sky/ground fill, and a little flat fill so nothing goes black.
    G.hemi = new T.HemisphereLight(0xffffff, 0x554433, 0.8); scene.add(G.hemi);
    G.amb = new T.AmbientLight(0xffffff, 0.2); scene.add(G.amb);
    G.sun = new T.DirectionalLight(0xffffff, 2); G.sun.position.set(-20, 12, -10); scene.add(G.sun); scene.add(G.sun.target);
    G.rim = new T.DirectionalLight(0xffffff, 0.4); scene.add(G.rim); scene.add(G.rim.target); // light off the sky from the side away from the sun: it picks figures out of their own shadow
    const sc = G.sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 120;
    G.sun.shadow.bias = -0.0006; G.sun.shadow.normalBias = 0.035;
    G.world = new T.Group(); scene.add(G.world);   // the current place
    G.actors = new T.Group(); scene.add(G.actors); // figures and things that move
    G.fxRoot = new T.Group(); scene.add(G.fxRoot); // particles, marks, arrows
    buildSky();
    G.ok = true;
    G.setQuality();
    G.setSky("gold");
    addEventListener("resize", resize);
    if (window.visualViewport) visualViewport.addEventListener("resize", resize);
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); running = false; });
    canvas.addEventListener("webglcontextrestored", () => { start(); });
    resize(); start();
    return true;
  };
  function start() { if (running) return; running = true; lastNow = performance.now(); requestAnimationFrame(tick); }

  function resize() {
    if (!renderer) return;
    W = Math.max(1, window.innerWidth); H = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, G.q.dpr) * scale;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    G.W = W; G.H = H; G.portrait = H > W * 1.1;
    applyView();
    if (G.onResize) G.onResize(W, H);
  }
  function applyView() {
    camera.aspect = W / H;
    // The page leaves part of the screen free: the camera's centre moves there, and its field of view is that part's.
    const half = Math.tan((cam.fov * Math.PI) / 360) * focus.k;
    camera.fov = (Math.atan(half) * 360) / Math.PI;
    if (Math.abs(focus.x) > 0.5 || Math.abs(focus.y) > 0.5) camera.setViewOffset(W, H, focus.x, focus.y, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  // The part of the screen the scene should sit in (CSS px), or null for all of it.
  G.focus = function (r, now) {
    if (!G.ok) return;
    if (!r) { focus.wx = 0; focus.wy = 0; focus.wk = 1; }
    else { focus.wx = W / 2 - (r.x + r.w / 2); focus.wy = H / 2 - (r.y + r.h / 2); focus.wk = clamp(H / Math.max(60, r.h), 1, 3); G.rect = r; }
    if (!r) G.rect = { x: 0, y: 0, w: W, h: H };
    if (now) { focus.x = focus.wx; focus.y = focus.wy; focus.k = focus.wk; applyView(); }
  };
  // How far back the camera must stand for a ball of this radius to fit the free part of the screen.
  G.fitDist = function (radius, fov) {
    const r = G.rect || { w: W, h: H }, v = ((fov || cam.wantFov) * Math.PI) / 360, h = Math.atan(Math.tan(v) * (r.w / Math.max(1, r.h)));
    return radius / Math.sin(Math.max(0.08, Math.min(v, h)));
  };

  // ---------- The frame ----------
  G.onFrame = function (fn) { frameFns.push(fn); return () => { const i = frameFns.indexOf(fn); if (i >= 0) frameFns.splice(i, 1); }; };
  G.paused = () => !!(document.hidden || (K.UI && K.UI.paused && K.UI.paused()));
  const tmp = new V3();
  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    let dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
    if (document.hidden || G.asleep) return; // (asleep: no fight is on; the 2D game has the screen)
    adapt(dt);
    const still = G.paused();
    const gdt = still ? 0 : dt;
    G.dt = gdt; G.t += gdt; G.real = dt;
    for (const f of frameFns.slice()) { try { f(gdt, G.t, dt); } catch (e) { if (window.console) console.error(e); } }
    // The rig: ease toward where the director wants it; a shake dies away.
    const k = 1 - Math.exp(-cam.rate * dt);
    cam.pos.lerp(cam.wantPos, k); cam.look.lerp(cam.wantLook, k); cam.fov = lerp(cam.fov, cam.wantFov, k);
    const fk = 1 - Math.exp(-5 * dt);
    focus.x = lerp(focus.x, focus.wx, fk); focus.y = lerp(focus.y, focus.wy, fk); focus.k = lerp(focus.k, focus.wk, fk);
    camera.position.copy(cam.pos);
    if (cam.shakeT > 0) { cam.shakeT -= dt; const a = cam.shake * Math.max(0, cam.shakeT) * 3; camera.position.x += (Math.random() - 0.5) * a; camera.position.y += (Math.random() - 0.5) * a; camera.position.z += (Math.random() - 0.5) * a; }
    camera.up.copy(cam.up); camera.lookAt(cam.look);
    applyView();
    // The sun's shadow follows what the camera looks at.
    if (G.q.shadows) { G.sun.target.position.copy(cam.look).setY(0); G.sun.position.copy(G.sun.target.position).addScaledVector(G.sunDir, 60); }
    if (G.sky) { G.sky.position.copy(camera.position); G.skyU.time.value = G.t; }
    renderer.render(scene, camera);
  }
  // Camera: set where it should be; snap = at once (a cut), else it eases there.
  G.camSet = function (pos, look, fov, snap) {
    if (!G.ok) return;
    if (pos) cam.wantPos.copy(G.v3(pos));
    if (look) cam.wantLook.copy(G.v3(look));
    if (fov) cam.wantFov = fov;
    if (snap) { cam.pos.copy(cam.wantPos); cam.look.copy(cam.wantLook); cam.fov = cam.wantFov; applyView(); }
  };
  G.shake = function (amount, secs) { if (!G.ok || (K.UI && K.UI.calm && K.UI.calm())) return; cam.shake = Math.max(cam.shake * (cam.shakeT > 0 ? 1 : 0), amount); cam.shakeT = Math.max(cam.shakeT, secs || 0.3); };

  // ---------- Sky and light ----------
  // A dome that travels with the camera: a three-colour gradient, a sun or moon glow, stars at night, drifting cloud bands.
  let skyMat = null;
  function buildSky() {
    G.skyU = { top: { value: new T.Color() }, hor: { value: new T.Color() }, bot: { value: new T.Color() }, sunCol: { value: new T.Color() }, sunDir: { value: new V3(0, 1, 0) }, stars: { value: 0 }, cloud: { value: new T.Color() }, cloudAmt: { value: 0.5 }, time: { value: 0 }, glow: { value: 1 } };
    skyMat = new T.ShaderMaterial({
      uniforms: G.skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }",
      fragmentShader: [
        "uniform vec3 top, hor, bot, sunCol, sunDir, cloud; uniform float stars, cloudAmt, time, glow; varying vec3 vDir;",
        "float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }",
        "float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }",
        "float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<4;i++){ s += a*noise(p); p *= 2.03; a *= 0.5; } return s; }",
        "void main(){ vec3 d = normalize(vDir); float y = d.y;",
        "  vec3 c = y > 0.0 ? mix(hor, top, pow(clamp(y*1.25,0.0,1.0), 0.42)) : mix(hor, bot, pow(clamp(-y*3.0,0.0,1.0), 0.6));",
        "  float sd = max(dot(d, normalize(sunDir)), 0.0);",
        "  c += sunCol * (pow(sd, 380.0) * 2.4 + pow(sd, 28.0) * 0.4 * glow + pow(sd, 5.0) * 0.12 * glow);",
        "  if (y > 0.02) { vec2 uv = d.xz / (y + 0.18) * 1.6 + vec2(time*0.004, 0.0); float n = fbm(uv); float m = smoothstep(1.0 - cloudAmt*0.62, 1.05, n + 0.25) * smoothstep(0.02, 0.22, y);",
        "    vec3 cc = mix(cloud, cloud + sunCol*0.5, pow(sd, 3.0)); c = mix(c, cc, m * 0.85); }",
        "  if (stars > 0.01 && y > 0.0) { vec2 g = d.xz / (y + 0.35) * 90.0; vec2 id = floor(g); float r = h21(id); vec2 f = fract(g) - 0.5; float s = smoothstep(0.09, 0.0, length(f)) * step(0.955, r); c += vec3(s) * stars * (0.6 + 0.4*sin(time*2.0 + r*40.0)); }",
        "  gl_FragColor = vec4(c, 1.0); }"
      ].join("\n")
    });
    G.sky = new T.Mesh(new T.SphereGeometry(700, 24, 14), skyMat); G.sky.frustumCulled = false; G.sky.renderOrder = -10; scene.add(G.sky);
    G.sunDir = new V3(-0.6, 0.4, -0.5).normalize();
  }
  // top / horizon / below, sun colour and strength and direction, sky fill, ground fill, fog colour and density.
  const SKIES = {
    dawn: { top: 0x41609a, hor: 0xf6b98a, bot: 0xb98a6c, sun: 0xffc895, si: 2.4, dir: [-0.84, 0.32, 0.24], hs: 0xc6d4ee, hg: 0x7a6650, hi: 0.9, fog: 0xe8b890, fd: 0.011, cloud: 0xffd9bd, ca: 0.55, amb: 0.24 },
    day: { top: 0x2b68bd, hor: 0xb9d6ee, bot: 0xa9b6aa, sun: 0xfff1d6, si: 2.7, dir: [0.42, 0.78, 0.36], hs: 0xcfe2ff, hg: 0x7a6a50, hi: 0.95, fog: 0xc6d8e6, fd: 0.006, cloud: 0xffffff, ca: 0.5, amb: 0.22 },
    gold: { top: 0x3f66ad, hor: 0xf6c38e, bot: 0xa98058, sun: 0xffca8a, si: 2.9, dir: [-0.78, 0.44, 0.3], hs: 0xc4d4f0, hg: 0x8a6a48, hi: 1.0, fog: 0xe9b888, fd: 0.0085, cloud: 0xffd9b0, ca: 0.55, amb: 0.24 },
    dusk: { top: 0x272b58, hor: 0xd8643e, bot: 0x6e3226, sun: 0xff7b42, si: 1.7, dir: [-0.9, 0.13, 0.12], hs: 0x8b82b4, hg: 0x40291f, hi: 0.6, fog: 0x93462f, fd: 0.013, cloud: 0xe2714a, ca: 0.7, amb: 0.2 },
    night: { top: 0x060a1a, hor: 0x1b2748, bot: 0x0a0d18, sun: 0xa3b9ee, si: 1.05, dir: [0.4, 0.66, 0.34], hs: 0x5068a0, hg: 0x1c1612, hi: 0.86, /* (a brighter moon: on a phone in daylight a night fight was near black) */ fog: 0x0f1629, fd: 0.014, cloud: 0x263055, ca: 0.45, amb: 0.32, stars: 1, glow: 0.5 },
    fire: { top: 0x0a0a16, hor: 0x7a2f14, bot: 0x1a0c08, sun: 0xff8a3c, si: 1.5, dir: [0.5, 0.35, 0.4], hs: 0x6a3a2a, hg: 0x1a0e0a, hi: 0.6, fog: 0x3a170c, fd: 0.02, cloud: 0x5a2a18, ca: 0.75, amb: 0.24, stars: 0.4, glow: 0.3 },
    storm: { top: 0x2c3442, hor: 0x67707c, bot: 0x3a3f46, sun: 0xb8c4d8, si: 1.1, dir: [0.3, 0.7, 0.2], hs: 0x8a96a8, hg: 0x3a3a34, hi: 0.8, fog: 0x5a636e, fd: 0.02, cloud: 0x4a525e, ca: 1, amb: 0.25, glow: 0.2 },
    hall: { top: 0x120a06, hor: 0x1e120a, bot: 0x0c0705, sun: 0xffc27a, si: 1.5, dir: [-0.5, 0.55, 0.45], hs: 0xffcf9a, hg: 0x3a2414, hi: 0.72, fog: 0x1c1009, fd: 0.016, cloud: 0x120a06, ca: 0, amb: 0.3, glow: 0 },
    cave: { top: 0x050403, hor: 0x0c0806, bot: 0x050403, sun: 0xffb060, si: 0.9, dir: [-0.3, 0.6, 0.5], hs: 0xb07a4a, hg: 0x1a100a, hi: 0.5, fog: 0x0a0705, fd: 0.03, cloud: 0x050403, ca: 0, amb: 0.22, glow: 0 },
    water: { top: 0x0c3a4a, hor: 0x16606c, bot: 0x06202a, sun: 0xa8e8e0, si: 1.3, dir: [0.1, 0.9, 0.1], hs: 0x6ac0c0, hg: 0x0a2a30, hi: 0.8, fog: 0x0e4450, fd: 0.045, cloud: 0x0c3a4a, ca: 0, amb: 0.25, glow: 0.4 },
    white: { top: 0xfff6e6, hor: 0xffffff, bot: 0xf2e6d2, sun: 0xffffff, si: 1.8, dir: [0.2, 0.8, 0.3], hs: 0xffffff, hg: 0xd8c8b0, hi: 1.1, fog: 0xfff4e2, fd: 0.03, cloud: 0xffffff, ca: 0, amb: 0.4, glow: 0 }
  };
  G.SKIES = SKIES;
  G.setSky = function (name, over) {
    if (!G.ok) return;
    const s = Object.assign({}, SKIES[name] || SKIES.gold, over || {});
    G.skyName = name;
    const U = G.skyU;
    U.top.value.setHex(s.top); U.hor.value.setHex(s.hor); U.bot.value.setHex(s.bot); U.sunCol.value.setHex(s.sun); U.cloud.value.setHex(s.cloud);
    U.stars.value = s.stars || 0; U.cloudAmt.value = s.ca; U.glow.value = s.glow == null ? 1 : s.glow;
    G.sunDir.set(s.dir[0], s.dir[1], s.dir[2]).normalize(); U.sunDir.value.copy(G.sunDir);
    G.sun.color.setHex(s.sun); G.sun.intensity = s.si;
    G.hemi.color.setHex(s.hs); G.hemi.groundColor.setHex(s.hg); G.hemi.intensity = s.hi;
    G.amb.intensity = s.amb; G.amb.color.setHex(s.hs);
    if (G.rim) { G.rim.color.setHex(s.hs); G.rim.intensity = Math.min(0.75, 0.16 * s.si + 0.16); G.rim.position.set(-G.sunDir.x * 30, 16, -G.sunDir.z * 30); }
    scene.fog = new T.FogExp2(s.fog, s.fd);
    G.fogColor = s.fog;
    renderer.setClearColor(s.hor);
  };

  // ---------- The place on stage ----------
  // Geometries and materials made for one place are thrown away with it; shared ones (G.keep) stay.
  G.keep = (o) => { if (o) o.userData.keep = true; return o; };
  function dispose(root) {
    root.traverse((o) => {
      if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
      if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) { if (m.userData.keep) continue; if (m.map && !m.map.userData.keep) m.map.dispose(); m.dispose(); }
    });
  }
  G.dispose = dispose;
  G.clear = function (group) { if (!G.ok) return; const g = group || G.world; for (const c of g.children.slice()) { g.remove(c); dispose(c); } };
  G.clearAll = function () { if (!G.ok) return; G.clear(G.world); G.clear(G.actors); G.clear(G.fxRoot); };

  // ---------- Screen and pointer ----------
  const ray = T ? new T.Raycaster() : null, ndc = T ? new T.Vector2() : null, plane = T ? new T.Plane(new V3(0, 1, 0), 0) : null;
  G.toScreen = function (v, out) {
    tmp.copy(v).project(camera);
    out = out || {};
    out.x = (tmp.x * 0.5 + 0.5) * W; out.y = (-tmp.y * 0.5 + 0.5) * H; out.behind = tmp.z > 1;
    return out;
  };
  function aim(cx, cy) { ndc.set((cx / W) * 2 - 1, -(cy / H) * 2 + 1); ray.setFromCamera(ndc, camera); }
  G.pick = function (cx, cy, objects) { if (!G.ok) return null; aim(cx, cy); const hit = ray.intersectObjects(objects, true); return hit.length ? hit[0] : null; };
  G.pickGround = function (cx, cy, y) { if (!G.ok) return null; aim(cx, cy); plane.constant = -(y || 0); const p = new V3(); return ray.ray.intersectPlane(plane, p) ? p : null; };
  // The camera's heading on the ground (radians), so "up" on a stick means "away from the camera".
  G.camYaw = () => Math.atan2(cam.look.x - cam.pos.x, cam.look.z - cam.pos.z);

  // A small tween runner on the frame clock: G.tween(secs, (k) => ..., done). Returns a cancel.
  G.tween = function (secs, fn, done) {
    if (!G.ok) { fn(1); if (done) done(); return () => {}; }
    let t = 0;
    const off = G.onFrame((dt, _t, real) => { t += real; const k = clamp(t / Math.max(0.001, secs), 0, 1); fn(k); if (k >= 1) { off(); if (done) done(); } });
    return off;
  };
})(window.K = window.K || {});
