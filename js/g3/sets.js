/* Places. Every painting of the 2D game (a scene's `art`, a test's `stage`, a fight's ground) becomes a place built in
   code: the great field with its two hosts, camps, pillared halls, the lotus garden, river steps and lakes, forests and
   ashrams, the eight homelands, training yards and arenas, the fair, city gates, the house of lac, mountains, shrines.
     const st = G.setStage("scene_dice_hall", { clear: 8 });   st.me, st.spots, st.cam, st.tick(dt, t)
   A place keeps its middle clear (o.clear metres: 8 for a story scene, 15 for a fight) and puts what it is made of
   around that; +Z is toward the camera. G.placeOf(key) says which builder and which light a key gets. */
(function (K) {
  "use strict";
  const T = window.THREE, G = K.G3;
  if (!T) return;
  const PI = Math.PI, V3 = T.Vector3;
  const KAU = ["#a3302a", "#e2b55a", "sun"], PAN = ["#2d5aa0", "#f2ead2", "moon"];
  // Around the middle, between r0 and r1, leaving the camera's side open. fn(x, z, a, r)
  function ring(rnd, n, r0, r1, fn, open) {
    for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
      const a = rnd() * PI * 2, r = r0 + rnd() * (r1 - r0), x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (open !== false && z > r0 * 0.55 && Math.abs(x) < r * 0.75 && r < 34) continue; // toward the camera
      fn(x, z, a, r); i++;
    }
  }
  const noise = (x, z) => Math.sin(x * 0.31 + Math.cos(z * 0.23) * 2.1) * 0.5 + Math.sin(z * 0.27 + x * 0.11) * 0.5;
  const earth = (c1, c2, c3) => (x, z, r) => { const n = noise(x, z); return n > 0.45 ? c2 : n < -0.5 ? c3 || c1 : c1; };

  const BUILD = {
    // ----- The field of Kurukshetra, and any open fighting ground -----
    field(b, o, rnd, st) {
      const night = /night|fire/.test(st.sky), R = o.clear;
      st.ground({ col: (x, z, r) => { const n = noise(x, z); return r < R + 6 ? (n > 0.3 ? 0xb59468 : 0xa5845c) : n > 0.2 ? 0x9a8a5a : n < -0.4 ? 0x8a7a50 : 0xa08c5e; }, size: 260, seg: 64, h: (x, z, r) => (r > 70 ? (r - 70) * 0.05 * (1 + noise(x, z)) : 0) });
      G.hills(b, { n: 26, r0: 120, r1: 170, h: 16, w: 40, col: 0x8a8a6a, top: 0xa39a78 }, rnd);
      if (!o.aftermath && !o.empty) {
        // The two hosts drawn up across the field from each other, the fight between them.
        const d = o.between ? R + 12 : R + 22;
        st.add(G.host({ x: -d - 6, z: -8, ry: PI / 2, cols: 34, rows: 5, flag: PAN, col: [0x2d5aa0, 0x3b6fb0, 0xd8d0b8], banners: 5 }, rnd));
        st.add(G.host({ x: d + 6, z: -8, ry: -PI / 2, cols: 34, rows: 5, flag: KAU, col: [0xa3302a, 0x8a2a24, 0xc9a24e], banners: 5 }, rnd));
        st.add(G.host({ x: 0, z: -R - 34, ry: 0, cols: 46, rows: 3, flag: o.mine === "kaurava" ? KAU : PAN, col: o.mine === "kaurava" ? [0xa3302a, 0x8a2a24] : [0x2d5aa0, 0x3b6fb0], banners: 4 }, rnd));
        for (let i = 0; i < 4; i++) { const ch = G.chariot({ flag: i % 2 ? KAU : PAN, col: i % 2 ? 0x6e3026 : 0x3a4a6a, canopy: i % 2 ? 0xa3302a : 0x2d5aa0 }); const sx = i % 2 ? 1 : -1; ch.position.set(sx * (R + 9 + rnd() * 8), 0, -14 + i * 7 + rnd() * 4); ch.rotation.y = -sx * PI / 2 + (rnd() - 0.5) * 0.5; st.add(ch); }
        if (!o.noElephant) for (const sx of [-1, 1]) { const el = G.elephant(sx > 0 ? 0xa3302a : 0x2d5aa0); el.position.set(sx * (R + 30), 0, -26); el.rotation.y = -sx * PI / 2; st.add(el); }
      }
      ring(rnd, 12, R + 2, R + 26, (x, z) => G.wreck(b, x, z, rnd)); ring(rnd, 16, R + 1, R + 22, (x, z) => G.arrowsStuck(b, x, z, 6, 1.6, rnd));
      ring(rnd, 10, R + 4, 60, (x, z) => G.rock(b, x, z, 0.4 + rnd() * 0.5, rnd, 0x8a7a64));
      if (o.wheel) for (let i = 0; i < 26; i++) { const a = (i / 26) * PI * 2, r = R + 3.5; if (Math.cos(a) > 0.86) continue; b.cyl(0.5, 0.5, 0.08, Math.sin(a) * r, 0.75, Math.cos(a) * r, i % 2 ? 0xa3302a : 0x8a6a3a, 10, 0, PI / 2 - 0.2, a); b.rod(Math.sin(a) * (r + 0.4), 0, Math.cos(a) * (r + 0.4), Math.sin(a) * (r + 0.4), 2.6, Math.cos(a) * (r + 0.4), 0.025, 0x7a5a36, 3); }
      if (o.arrows) { G.arrowsStuck(b, 0, -1.5, 40, 2.4, rnd); b.box(0.5, 0.2, 1.8, 0, 0.5, -1.5, 0xe8dcc8); } // the bed of arrows
      if (o.pyres) for (let i = 0; i < 5; i++) { const x = -12 + i * 6, z = -R - 4 - (i % 2) * 5; b.box(2.2, 0.7, 1.1, x, 0, z, 0x4a3018); st.flame(x, 0.7, z, 2.2, i === 2); }
      if (o.camp) for (let i = 0; i < 7; i++) G.tent(b, -18 + i * 6 + rnd() * 2, -R - 8 - rnd() * 8, rnd() * 6, 1 + rnd() * 0.3, 0xd8c49a, o.mine === "kaurava" ? 0xa3302a : 0x2d5aa0);
      if (night) { ring(rnd, 14, R + 3, R + 30, (x, z) => { b.rod(x, 0, z, x, 2.2, z, 0.04, 0x5a3a22); st.flame(x, 2.2, z, 0.7, false); }); st.flame(-R - 2, 0.2, -3, 1.3, true); st.flame(R + 2, 0.2, -3, 1.3, true); st.amb("embers", { rate: 5, r: 24 }); }
      else st.amb("dust", { rate: 5, r: 34, col: 0xd8bd92 });
      st.cam = { look: [0, 1.2, 0], dist: 8.5, yaw: 0.25, pitch: 0.13 };
    },
    // ----- A war camp: tents, fires, standards, carts -----
    camp(b, o, rnd, st) {
      const R = o.clear, trimc = o.mine === "kaurava" ? 0xa3302a : 0x2d5aa0, flag = o.mine === "kaurava" ? KAU : PAN;
      st.ground({ col: earth(0xa98a62, 0x9a7c56, 0x8f8a58), size: 200 });
      G.hills(b, { n: 20, r0: 110, r1: 150, h: 12, w: 36, col: 0x7a7a5a }, rnd);
      ring(rnd, 22, R + 2, R + 30, (x, z, a) => G.tent(b, x, z, a + PI, 1 + rnd() * 0.5, 0xd8c49a, trimc));
      if (o.royal) { G.tent(b, 0, -R - 5, 0, 2.2, 0xe8d8b0, 0xd9a53a); const f = G.banner(7, flag[0], flag[1], flag[2], 1.6); f.position.set(3.4, 0, -R - 3); st.add(f); st.banners.push(f); }
      for (let i = 0; i < 4; i++) { const a = -1.2 + i * 0.8, f = G.banner(4.6, flag[0], flag[1], flag[2], 1.2); f.position.set(Math.sin(a) * (R + 1.5), 0, -Math.cos(a) * (R + 1.5)); st.add(f); st.banners.push(f); }
      ring(rnd, 4, R + 1, R + 8, (x, z, a) => G.cartStatic(b, x, z, a, o.carts ? 0xb89a5a : 0x8a6a4a));
      if (o.carts) for (let i = 0; i < 5; i++) G.cartStatic(b, -9 + i * 4.5, -R - 2.5 - (i % 2) * 2, 0.3 * (i - 2), 0xb89a5a);
      if (o.gate) { G.gate(b, 0, -R - 3, 0, 5, 4.6, 0x7a5a36, 0xa3302a); for (const sx of [-1, 1]) for (let i = 0; i < 12; i++) b.rod(sx * (3.6 + i * 1.2), 0, -R - 3, sx * (3.6 + i * 1.2), 3 + (i % 2) * 0.3, -R - 3, 0.12, 0x6a4a2a, 5, 0.03); }
      if (o.pen) for (let i = 0; i < 26; i++) { const a = (i / 26) * PI * 2; b.rod(Math.sin(a) * 4.6, 0, -R - 6 + Math.cos(a) * 4.6, Math.sin(a) * 4.6, 2.4, -R - 6 + Math.cos(a) * 4.6, 0.09, 0x5a3a22, 5, 0.03); }
      G.rack(b, -R - 0.5, -2, PI / 2); G.rack(b, R + 0.5, -4, -PI / 2);
      st.flame(-R * 0.55, 0.15, -R * 0.75, 1.5, true); b.cyl(0.9, 1, 0.12, -R * 0.55, 0, -R * 0.75, 0x3a2a20, 8);
      st.flame(R * 0.7, 0.15, -R * 0.5, 1.2, true); b.cyl(0.8, 0.9, 0.12, R * 0.7, 0, -R * 0.5, 0x3a2a20, 8);
      const sp = []; ring(rnd, 26, R + 2, R + 22, (x, z, a) => sp.push([x, z, a + PI + rnd(), 1])); st.add(G.crowd(sp, [trimc, 0x8a6a4a, 0xd8d0b8], "soldier", rnd));
      if (/night|fire/.test(st.sky)) st.amb("embers", { rate: 3, r: 14 }); else st.amb("dust", { rate: 2, r: 26 });
      st.cam = { look: [0, 1.2, 0], dist: 8, yaw: -0.2, pitch: 0.12 };
    },
    // ----- A pillared hall: the court, the dice hall, a corridor, a healer's ward, a cellar -----
    hall(b, o, rnd, st) {
      const w = o.narrow ? 4.2 : 9.5, len = 26, stone = o.dark ? 0x6a5444 : 0xb48a64, hgt = o.low ? 3.2 : 7;
      st.ground({ col: (x, z) => (Math.abs(x) < w + 2 && z > -len + 6 && z < 16 ? (o.dark ? 0x7a6652 : 0xc09a74) : 0x1a100a), size: 90, seg: 40, tex: "flags", rep: 22 });
      for (const sx of [-1, 1]) {
        for (let z = -len + 10; z <= 12; z += o.narrow ? 3.2 : 4.2) { G.pillar(b, sx * w, z, hgt, o.narrow ? 0.3 : 0.42, stone); if (!o.dark && (Math.round(z) % 2 === 0)) { const y = G.lampStand(b, sx * (w - 1.3), z + 2.1, 1.5); st.flame(sx * (w - 1.3), y, z + 2.1, 0.32, false); } }
        b.box(0.6, hgt, len + 8, sx * (w + 2.6), 0, -2, G.shade(stone, 0.62), 0, 0, 0, G.shade(stone, 0.8));
        if (!o.narrow && !o.low) for (let z = -len + 12; z <= 10; z += 8.4) b.box(0.1, 3, 2.2, sx * (w + 2.25), 2.4, z, sx > 0 ? 0x8a1f24 : 0x2d4a7a, 0, 0, 0, 0xd9a53a); // hangings
      }
      b.box(2 * (w + 3), hgt, 0.6, 0, 0, -len + 5, G.shade(stone, 0.7), 0, 0, 0, G.shade(stone, 0.9));
      if (!o.open) b.box(2 * (w + 3.4), 0.5, len + 9, 0, hgt, -2, 0x2a1a10); // (open: no roof, for a scene looked down on from above)
      if (o.dice || o.court) { b.box(7, 0.35, 3.2, 0, 0, -len + 8, G.shade(stone, 0.9)); b.box(5.6, 0.3, 2.4, 0, 0.35, -len + 8, stone); G.throne(b, 0, -len + 8, 0, 0x8a1f24); b.at(0, 0.65, 0, 0, 1, () => {}); for (const sx of [-1, 1]) G.throne(b, sx * 2.3, -len + 8.3, -sx * 0.25, sx > 0 ? 0x2d4a7a : 0x5a2a6a); }
      if (o.dice) { const m = new T.Mesh(new T.PlaneGeometry(4.6, 4.6).rotateX(-PI / 2), new T.MeshLambertMaterial({ map: G.tex("chaupar") })); m.position.set(0, 0.03, -1.5); m.receiveShadow = true; st.add(m); for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + 0.4; G.cushion(b, Math.sin(a) * 3.3, -1.5 + Math.cos(a) * 3.3, i % 2 ? 0xa3302a : 0x2d4a7a, 1.2); } }
      else if (!o.low && !o.narrow && !o.cots && !o.table) { const m = new T.Mesh(new T.PlaneGeometry(7, 11).rotateX(-PI / 2), new T.MeshLambertMaterial({ map: G.tex("carpet") })); m.position.set(0, 0.03, -2); m.receiveShadow = true; st.add(m); }
      if (o.table) { G.lowTable(b, 0, -1.6, 2.6, 1.3, 0x6a4628); b.box(1.6, 0.04, 0.9, 0, 0.42, -1.6, 0xe8dcc0); for (let i = 0; i < 5; i++) b.sph(0.07, -0.9 + i * 0.45, 0.5, -1.6 + (rnd() - 0.5) * 0.6, [0xd9a53a, 0xb2432a, 0x3b6fb0, 0x6f8f3a, 0xe8dcc0][i]); for (let i = 0; i < 4; i++) G.cushion(b, (i - 1.5) * 1.3, 0.4, i % 2 ? 0xa3302a : 0x2d4a7a); }
      if (o.cots) for (let i = 0; i < 8; i++) G.cot(b, (i % 2 ? 1 : -1) * 4.6, -12 + Math.floor(i / 2) * 4.2, (i % 2 ? -1 : 1) * PI / 2);
      if (o.cellar) { for (let i = 0; i < 9; i++) G.pot(b, (rnd() - 0.5) * 2 * (w - 1), -9 + rnd() * 6, 2 + rnd(), 0x7a4a2a); for (let i = 0; i < 5; i++) b.box(1, 0.9, 1, (i - 2) * 2.2, 0, -len + 6.6, 0x5a3a22); }
      if (o.forge) { b.box(2.4, 1, 1.6, -4.5, 0, -6, 0x4a3a34); st.flame(-4.5, 1, -6, 1.1, true); b.box(0.5, 0.6, 0.3, -1.6, 0, -4.4, 0x55565c); b.box(0.9, 0.16, 0.36, -1.6, 0.6, -4.4, 0x6a6a70); G.rack(b, 5, -7, -0.5); }
      if (o.court || o.dice || o.crowd) { const sp = []; for (const sx of [-1, 1]) for (let i = 0; i < 12; i++) sp.push([sx * (w - 2.6 - (i % 2) * 1.1), -14 + Math.floor(i / 2) * 3 + rnd(), -sx * PI / 2, 1]); st.add(G.crowd(sp, [0xa3302a, 0x2d5aa0, 0xd9a53a, 0xe8dcc0, 0x5a2a6a], "sit", rnd)); }
      st.flame(-w + 2.2, 2.4, -len + 7.5, 0.7, true); st.flame(w - 2.2, 2.4, -len + 7.5, 0.7, true); b.rod(-w + 2.2, 0, -len + 7.5, -w + 2.2, 2.4, -len + 7.5, 0.06, 0xb08a3a); b.rod(w - 2.2, 0, -len + 7.5, w - 2.2, 2.4, -len + 7.5, 0.06, 0xb08a3a);
      st.cam = { look: [0, 1.25, -1], dist: o.narrow ? 6.5 : 8.5, yaw: 0.12, pitch: 0.1 }; st.indoor = true;
    },
    // ----- The palace garden and its lotus pond -----
    garden(b, o, rnd, st) {
      const R = o.clear;
      st.ground({ col: (x, z, r) => (r < R + 1 ? (noise(x * 3, z * 3) > 0 ? 0xc0a27a : 0xb4966e) : noise(x, z) > 0.3 ? 0x6f9048 : 0x5f8442), size: 180, tex: "grain" });
      const pz = -R - 9; st.add(G.water(8.5, 0.06, 0x3f8a80)); st.last.position.set(2, 0.06, pz);
      b.torus(8.7, 0.35, 2, 0.05, pz, 0xc9a47a, PI / 2, 0, 0, 30);
      for (let i = 0; i < 16; i++) { const a = rnd() * 6.28, r = rnd() * 7.4; G.lotus(b, 2 + Math.sin(a) * r, pz + Math.cos(a) * r, 0.9 + rnd() * 0.6, i % 3 ? 0xf2a0b8 : 0xffffff); }
      G.pavilion(b, -13, pz + 2, 1.1, 0xd0b088, 0xb2432a, 0.5);
      G.wall(b, -46, pz - 20, 46, pz - 20, 6, 1.4, 0xcfae84); for (const x of [-30, 0, 30]) G.tower(b, x, pz - 20, 2.6, 10, 0xcfae84, 0xb2432a);
      b.box(26, 9, 8, 14, 0, pz - 30, 0xd8ba90, 0, 0, 0, 0xe8cfa8); b.dome(4.6, 14, 9, pz - 30, 0xd9a53a, 0.9, 12); for (const sx of [-1, 1]) b.dome(2.4, 14 + sx * 9, 9, pz - 30, 0xd9a53a, 1, 10);
      ring(rnd, 16, R + 3, R + 30, (x, z) => { if (Math.hypot(x - 2, z - pz) > 11) G.tree(b, x, z, rnd() < 0.3 ? "palm" : "mango", 1 + rnd() * 0.5, rnd); });
      ring(rnd, 26, R + 1, R + 16, (x, z) => { if (Math.hypot(x - 2, z - pz) > 10) G.tree(b, x, z, "bush", 0.8 + rnd() * 0.6, rnd); });
      for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, r = R + 1 + rnd() * 10, x = Math.sin(a) * r, z = Math.cos(a) * r; if (z < R) b.sph(0.16, x, 0.2, z, [0xe8a030, 0xd94a6a, 0xf2e070, 0xffffff][i % 4], 0.7, 5); }
      if (/night/.test(st.sky)) { for (let i = 0; i < 6; i++) { const a = -1.3 + i * 0.52, x = Math.sin(a) * (R + 1), z = -Math.cos(a) * (R + 1), y = G.lampStand(b, x, z, 1.5); st.flame(x, y, z, 0.34, i === 1 || i === 4); } st.amb("fireflies", { rate: 3, r: 16 }); }
      else st.amb("motes", { rate: 4, r: 14 });
      st.cam = { look: [0, 1.15, 0], dist: 8, yaw: -0.25, pitch: 0.13 };
    },
    // ----- Water: river steps, a ford, a lake among reeds -----
    river(b, o, rnd, st) {
      const R = o.clear, edge = -R + (o.lake ? 2 : 3), wcol = /night/.test(st.sky) ? 0x1f3a52 : o.lake ? 0x3a7f86 : 0x4a8a94;
      st.ground({ col: (x, z, r) => (z < edge + 1.5 ? 0xb8a074 : noise(x, z) > 0.2 ? 0x7f9450 : 0x8a9a58), size: 240, seg: 72, h: (x, z, r) => { const d = edge - z; return d > 0 ? (o.lake ? -Math.min(1.6, d * 0.22) * (Math.hypot(x, z - edge + 60) < 58 || true ? 1 : 0) : d < 44 ? -Math.min(1.5, d * 0.3) : Math.min(8, (d - 44) * 0.3) - 1.5) : 0; } });
      st.add(G.water([260, o.lake ? 150 : 46], -0.32, wcol)); st.last.position.z = edge - (o.lake ? 75 : 23);
      if (!o.lake) { ring(rnd, 30, 0, 1, () => {}); for (let i = 0; i < 26; i++) G.tree(b, -100 + i * 8 + rnd() * 5, edge - 50 - rnd() * 14, rnd() < 0.3 ? "palm" : "mango", 1.2 + rnd() * 0.8, rnd); }
      G.hills(b, { n: 22, r0: 130, r1: 170, h: 18, w: 40, col: 0x6a8060, top: 0x8a9a78 }, rnd);
      if (o.ghat) { G.steps(b, 0, edge + 2.6, 0, 16, 7, 0xc7ae8c, 0.3); b.box(18, 0.3, 4, 0, 0, edge + 4.6, 0xb89a78); for (const sx of [-1, 1]) G.pillar(b, sx * 8.4, edge + 5, 3.4, 0.24, 0xc7ae8c); }
      if (o.pavilions) { G.pavilion(b, -11, edge + 9, 1, 0xd0b088, 0xa3302a, 0.2); G.pavilion(b, 12, edge + 8, 0.9, 0xd0b088, 0x2d5aa0, -0.3); for (let i = 0; i < 5; i++) { const f = G.banner(4, i % 2 ? "#a3302a" : "#d79a2b", "#f2ead2", "diamond", 1); f.position.set(-16 + i * 8, 0, edge + 4); st.add(f); st.banners.push(f); } }
      if (o.boat !== false) { b.at(7, -0.3, edge - 4, 0.5, 1, (b) => { b.geo(new T.SphereGeometry(1, 8, 5, 0, PI * 2, PI / 2, PI / 2).scale(1.0, 0.7, 3.2), 0, 0.55, 0, 0, 0, 0, 0x6a4628, 0x8a6240); b.rod(0, 0.5, 0, 0, 3.2, 0, 0.05, 0x5a3a22); }); }
      for (let i = 0; i < (o.reeds ? 46 : 14); i++) { const x = (rnd() - 0.5) * (o.reeds ? 60 : 70), z = edge + (o.reeds ? 2.5 - rnd() * 7 : -0.5 - rnd() * 1.5); if (o.reeds || Math.abs(x) > 9) G.reeds(b, x, z, 9, rnd); }
      if (o.lake) for (let i = 0; i < 10; i++) G.lotus(b, (rnd() - 0.5) * 30, edge - 3 - rnd() * 10, 1 + rnd() * 0.5, rnd() < 0.5 ? 0xf2a0b8 : null);
      ring(rnd, 14, R + 3, R + 34, (x, z) => { if (z > edge + 4) G.tree(b, x, z, rnd() < 0.35 ? "banyan" : rnd() < 0.5 ? "palm" : "mango", 1 + rnd() * 0.6, rnd); });
      ring(rnd, 8, R + 1, R + 12, (x, z) => { if (z > edge + 2) G.rock(b, x, z, 0.4 + rnd() * 0.5, rnd); });
      if (o.ford) for (let i = 0; i < 12; i++) G.rock(b, -6 + rnd() * 12, edge - 2 - i * 3.2, 0.5 + rnd() * 0.4, rnd, 0x9a9488);
      if (/night/.test(st.sky)) { st.flame(-R + 1, 0.2, -1, 1.1, true); st.amb("fireflies", { rate: 3, r: 16 }); } else st.amb("motes", { rate: 3, r: 14, col: 0xffffff });
      st.cam = { look: [0, 1.15, 0], dist: 8.2, yaw: 0.3, pitch: 0.14 }; st.waterEdge = edge;
    },
    // ----- Forest: a clearing, a road, an ashram, a burning wood -----
    forest(b, o, rnd, st) {
      const R = o.clear, kinds = o.pine ? ["pine", "pine", "sal"] : ["sal", "mango", "banyan", "sal", "mango"];
      st.ground({ col: (x, z, r) => (o.road && Math.abs(z + Math.sin(x * 0.08) * 3) < 2.4 ? 0xb49a72 : r < R ? (noise(x * 2, z * 2) > 0.2 ? 0x8a8a52 : 0x7f844c) : noise(x, z) > 0.2 ? 0x5a7a3e : 0x4f6e3a), size: 200, seg: 60, h: (x, z, r) => (r > 46 ? (r - 46) * 0.12 : 0) });
      ring(rnd, o.sparse ? 40 : 90, R + 2, R + 52, (x, z) => { if (o.road && Math.abs(z + Math.sin(x * 0.08) * 3) < 3.6) return; G.tree(b, x, z, kinds[Math.floor(rnd() * kinds.length)], 1 + rnd() * 0.9, rnd); }, true);
      ring(rnd, 30, R + 0.5, R + 22, (x, z) => (rnd() < 0.6 ? G.tree(b, x, z, "bush", 0.7 + rnd() * 0.7, rnd) : G.rock(b, x, z, 0.4 + rnd() * 0.6, rnd, 0x7a7a6a)));
      G.hills(b, { n: 20, r0: 110, r1: 150, h: o.peaks ? 46 : 20, w: o.peaks ? 34 : 44, col: o.peaks ? 0x6a6e78 : 0x4f6a48, top: o.peaks ? 0x9aa0aa : 0x6a8058, snow: o.peaks }, rnd);
      if (o.ashram) { G.hut(b, -R - 3, -R + 1, 0.7, 1.1); G.hut(b, R + 2, -R - 2, -0.6, 1); G.hut(b, 2, -R - 6, 0, 1.2); G.altar(b, 0, -R + 2.5, 1); st.flame(0, 0.86, -R + 2.5, 0.8, true); G.tree(b, -6, -R - 3, "banyan", 1.5, rnd); for (let i = 0; i < 4; i++) G.pot(b, -R + i * 0.8, -R + 3, 1 + rnd() * 0.4); }
      if (o.grove) { for (let i = 0; i < 9; i++) { const a = -1.4 + i * 0.35; b.sph(0.22, Math.sin(a) * (R + 1.5), 2.2 + rnd() * 2, -Math.cos(a) * (R + 1.5), 0xd8f0a0, 1, 6); } st.amb("fireflies", { rate: 8, r: 16 }); }
      if (o.burning) { ring(rnd, 20, R + 2, R + 26, (x, z) => st.flame(x, 0.3 + rnd() * 2.6, z, 2 + rnd() * 2.4, false)); st.flame(-R - 1, 0.3, -R, 3, true); st.flame(R + 1, 0.3, -R + 2, 3, true); st.amb("embers", { rate: 16, r: 22 }); st.amb("smoke", { rate: 4, r: 24 }); }
      else if (o.storm) st.amb("rain", { rate: 90, r: 18 });
      else if (/night/.test(st.sky)) { st.amb("fireflies", { rate: 5, r: 18 }); if (!o.dark) st.flame(-2.5, 0.15, -R + 1.5, 1.2, true); }
      else st.amb("leaves", { rate: 1.5, r: 16 });
      st.cam = { look: [0, 1.15, 0], dist: 8, yaw: -0.3, pitch: 0.12 };
    },
    // ----- Home: the eight homelands' lanes and yards -----
    village(b, o, rnd, st) {
      const R = o.clear, land = o.land || "hastinapura";
      const stone = ["hastinapura", "gandhara", "mathura", "panchala", "anga"].includes(land), wallc = { hastinapura: 0xd8b98c, gandhara: 0xb8aa98, mathura: 0xe0c090, panchala: 0xcfae84, anga: 0xd2a878 }[land] || 0xc9a878;
      const grass = land === "gandhara" ? [0x8a8a62, 0x7a7a58] : land === "nishada" ? [0x4f6e3a, 0x5a7a3e] : [0x7f9450, 0x8a9a58];
      const water = ["matsya", "mathura", "anga", "nishada"].includes(land), edge = -R - 6;
      st.ground({ col: (x, z, r) => (r < R + 3 ? (noise(x * 2, z * 2) > 0.1 ? 0xb89a6c : 0xab8e62) : water && z < edge - 8 ? 0xb8a074 : noise(x, z) > 0.2 ? grass[0] : grass[1]), size: 220, seg: 60, h: (x, z, r) => (water && z < edge - 9 ? -Math.min(1.5, (edge - 9 - z) * 0.25) : land === "gandhara" && r > 40 ? (r - 40) * 0.25 : 0) });
      if (water) { st.add(G.water([240, 90], -0.3, land === "matsya" ? 0x3a8088 : 0x4a8a94)); st.last.position.z = edge - 56; for (let i = 0; i < 20; i++) G.reeds(b, (rnd() - 0.5) * 70, edge - 9 - rnd() * 3, 8, rnd); }
      const homes = [];
      ring(rnd, land === "nishada" ? 9 : 12, R + 3.5, R + 20, (x, z, a) => { if (water && z < edge - 5) return; homes.push([x, z]); if (stone) G.house(b, x, z, a + PI, { w: 4.4 + rnd() * 2, d: 3.6 + rnd(), h: 2.8 + rnd() * 1.4, wall: G.shade(wallc, 0.9 + rnd() * 0.2), awning: rnd() < 0.4 ? [0xa3302a, 0x2d5aa0, 0xd79a2b][Math.floor(rnd() * 3)] : null }); else G.hut(b, x, z, a + PI, 0.9 + rnd() * 0.4, land === "nishada" ? 0x9a7a52 : 0xc9a878, land === "nishada" ? 0x7a6a3a : 0xb08a4a); });
      G.tree(b, R + 5, -R - 1, "banyan", 1.3, rnd); b.cyl(3.2, 3.4, 0.4, R + 5, 0, -R - 1, 0xb89a78, 12);
      G.well(b, -R - 1, -2);
      for (let i = 0; i < 6; i++) G.pot(b, -R - 2.5 + rnd() * 2, -4 + rnd() * 2, 0.8 + rnd() * 0.6);
      const tk = land === "gandhara" ? ["pine", "pine", "sal"] : land === "nishada" ? ["sal", "banyan", "mango"] : land === "anga" || land === "mathura" ? ["palm", "mango", "palm"] : ["mango", "sal", "mango"];
      ring(rnd, land === "nishada" ? 60 : 26, R + 8, R + 50, (x, z) => { if (water && z < edge - 7) return; if (homes.every((h) => Math.hypot(h[0] - x, h[1] - z) > 5)) G.tree(b, x, z, tk[Math.floor(rnd() * tk.length)], 1 + rnd() * 0.8, rnd); }, land !== "nishada");
      if (land === "hastinapura") { G.wall(b, -60, -R - 34, 60, -R - 34, 8, 2, 0xcfae84); for (const x of [-40, -14, 14, 40]) G.tower(b, x, -R - 34, 3, 12, 0xcfae84, 0xb2432a); b.box(30, 12, 10, 0, 0, -R - 48, 0xdcc098, 0, 0, 0, 0xecd4ae); b.dome(5.4, 0, 12, -R - 48, 0xd9a53a, 0.9, 12); }
      if (land === "gandhara") G.hills(b, { n: 26, r0: 80, r1: 140, h: 60, w: 34, col: 0x6a6e78, top: 0x9aa0aa, snow: true }, rnd); else G.hills(b, { n: 20, r0: 120, r1: 160, h: 16, w: 40, col: 0x6a8060, top: 0x8a9a78 }, rnd);
      if (land === "suta" || land === "matsya") { for (let i = 0; i < 12; i++) { const x = R + 4 + (i % 6) * 1.6; b.rod(x, 0, -R - 2, x, 1.2, -R - 2, 0.05, 0x5a3a22); } b.rod(R + 4, 1, -R - 2, R + 12, 1, -R - 2, 0.04, 0x5a3a22); for (let i = 0; i < 3; i++) { const h = G.horse(); h.position.set(R + 5 + i * 2.6, 0, -R - 4.5 - (i % 2)); h.rotation.y = rnd() * 6; st.add(h); } }
      if (land === "suta") { const ch = G.chariot({ horses: 0, flag: null }); ch.position.set(-R - 6, 0, 3); ch.rotation.y = 2.2; st.add(ch); }
      if (land === "panchala") { G.target(b, R + 3, -R + 1, -0.6); G.target(b, R + 6, -R - 1, -0.5); G.rack(b, -R - 5, 0, 0.9); }
      if (land === "mathura" || land === "anga") { G.steps(b, 0, edge - 4, 0, 14, 6, 0xc7ae8c, 0.2); G.stall(b, -R - 3, 4, 1.2, 0xd79a2b, rnd); G.stall(b, R + 3.5, 5, -1.1, 0xa3302a, rnd); }
      if (land === "nishada") { b.at(4, -0.25, edge - 12, 0.9, 1, (b) => b.geo(new T.SphereGeometry(1, 8, 5, 0, PI * 2, PI / 2, PI / 2).scale(0.6, 0.5, 3), 0, 0.45, 0, 0, 0, 0, 0x5a3a22, 0x7a5a36)); }
      const sp = []; homes.slice(0, 8).forEach(([x, z]) => { const a = Math.atan2(x, z); sp.push([x - Math.sin(a) * 3.2 + rnd(), z - Math.cos(a) * 3.2 + rnd(), rnd() * 6, 1]); }); st.add(G.crowd(sp, [0xa3302a, 0xd79a2b, 0x2f7d55, 0xe8dcc0, 0x7a5232], "stand", rnd));
      if (/night/.test(st.sky)) { homes.slice(0, 6).forEach(([x, z], i) => { const a = Math.atan2(x, z); st.flame(x - Math.sin(a) * 2.4, 1.6, z - Math.cos(a) * 2.4, 0.3, i < 2); }); } else st.amb("motes", { rate: 3, r: 14 });
      st.cam = { look: [0, 1.1, 0], dist: 8, yaw: 0.28, pitch: 0.14 };
    },
    // ----- A yard: training ground, arena, stables, the fair, a pasture -----
    yard(b, o, rnd, st) {
      const R = o.clear, grassy = o.pasture || o.fair;
      st.ground({ col: (x, z, r) => (r < R + (o.arena ? 6 : 3) && !o.pasture ? (noise(x * 2, z * 2) > 0.1 ? 0xc0a070 : 0xb39466) : noise(x, z) > 0.2 ? 0x829650 : 0x8c9c58), size: 220, seg: 60 });
      G.hills(b, { n: 20, r0: 120, r1: 160, h: 15, w: 40, col: 0x6a8060, top: 0x8a9a78 }, rnd);
      if (o.arena) { // tiers of people all around
        const sp = []; for (let t = 0; t < 4; t++) { const r = R + 7 + t * 1.5; b.torus(r, 0.75, 0, t * 0.9, 0, t % 2 ? 0xc7a47a : 0xb8946a, PI / 2, 0, 0, 40); for (let i = 0; i < 46; i++) { const a = (i / 46) * PI * 2 + t * 0.07; if (Math.cos(a) > 0.82) continue; sp.push([Math.sin(a) * r, Math.cos(a) * r, a + PI, 1, t * 0.9 + 0.75]); } }
        st.add(G.crowd(sp, [0xa3302a, 0xd79a2b, 0x2f7d55, 0xe8dcc0, 0x2d5aa0, 0x7a5232], "sit", rnd));
        b.box(8, 0.6, 3, 0, 3.6, -R - 12.5, 0xb8946a); G.throne(b, 0, -R - 12.5, 0, 0x8a1f24); b.at(0, 4.2, 0, 0, 1, () => {});
        for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + 0.4; if (Math.cos(a) > 0.8) continue; const f = G.banner(6.5, i % 2 ? KAU[0] : "#d79a2b", "#f2ead2", i % 2 ? "sun" : "bow", 1.3); f.position.set(Math.sin(a) * (R + 13.5), 0, Math.cos(a) * (R + 13.5)); st.add(f); st.banners.push(f); }
      } else if (!o.pasture && !o.fair) {
        G.wall(b, -R - 16, -R - 9, R + 16, -R - 9, 4.2, 1.1, 0xc7a47a); G.gate(b, 0, -R - 9, 0, 4, 5.4, 0xb98a62);
        ring(rnd, 12, R + 12, R + 40, (x, z) => G.tree(b, x, z, rnd() < 0.3 ? "banyan" : "mango", 1 + rnd() * 0.6, rnd));
      }
      if (o.train) { for (let i = 0; i < 4; i++) G.target(b, -7 + i * 4.6, -R - 5, 0); G.rack(b, -R - 2, -2, PI / 2); G.rack(b, R + 2, -3, -PI / 2); for (let i = 0; i < 3; i++) { b.cyl(0.16, 0.2, 2, R + 1.5, 0, 2 + i * 2.2, 0x6a4628, 6); b.box(0.9, 0.12, 0.12, R + 1.5, 1.5, 2 + i * 2.2, 0x6a4628); } }
      if (o.mango) { G.tree(b, 2.5, -R + 1, "mango", 1.9, rnd); for (let i = 0; i < 5; i++) b.sph(0.14, 1.5 + rnd() * 2.4, 4.2 + rnd() * 1.4, -R + 0.4 + rnd() * 1.6, 0xf0a030, 1.2, 6); G.hut(b, -R - 3, -R + 1, 0.6, 1.1); }
      if (o.stable) { b.box(14, 0.25, 5, 0, 3, -R - 5, 0x7a5232, 0, 0.12); for (let i = 0; i < 6; i++) { b.rod(-6.5 + i * 2.6, 0, -R - 3, -6.5 + i * 2.6, 3, -R - 3, 0.09, 0x5a3a22); } for (let i = 0; i < 4; i++) { const h = G.horse(); h.position.set(-5 + i * 3.3, 0, -R - 5.2); st.add(h); } for (let i = 0; i < 4; i++) b.box(1.2, 0.5, 0.7, -5 + i * 3.3, 0, -R - 2.8, 0xb89a5a); }
      if (o.elephants) for (let i = 0; i < 3; i++) { const el = G.elephant(i % 2 ? 0xa3302a : 0xd79a2b); el.position.set(-9 + i * 9, 0, -R - 6); el.rotation.y = (rnd() - 0.5); st.add(el); st.ticks.push((dt, t) => G.stomp(el, t * 1.4 + i, 0.3)); }
      if (o.fair) {
        ring(rnd, 12, R + 2, R + 20, (x, z, a) => G.stall(b, x, z, a + PI, [0xa3302a, 0x2d5aa0, 0xd79a2b, 0x2f7d55, 0xe8dcc0][Math.floor(rnd() * 5)], rnd));
        if (o.ringed) { for (let i = 0; i < 22; i++) { const a = (i / 22) * PI * 2, r = R - 1.5; b.rod(Math.sin(a) * r, 0, Math.cos(a) * r, Math.sin(a) * r, 1, Math.cos(a) * r, 0.05, 0x5a3a22); } b.torus(R - 1.5, 0.03, 0, 0.9, 0, 0xd8c49a, PI / 2, 0, 0, 40); }
        const sp = []; ring(rnd, 54, R + (o.ringed ? -0.9 : 1.5), R + 13, (x, z, a) => sp.push([x, z, a + PI, 1])); st.add(G.crowd(sp, [0xa3302a, 0xd79a2b, 0x2f7d55, 0xe8dcc0, 0x2d5aa0, 0x7a5232], "stand", rnd));
        for (let i = 0; i < 7; i++) { const a = -1.5 + i * 0.5, f = G.banner(5, ["#a3302a", "#d79a2b", "#2d5aa0"][i % 3], "#f2ead2", "diamond", 1.1); f.position.set(Math.sin(a) * (R + 7), 0, -Math.cos(a) * (R + 7)); st.add(f); st.banners.push(f); }
        ring(rnd, 10, R + 14, R + 40, (x, z) => G.tree(b, x, z, "mango", 1 + rnd() * 0.6, rnd));
      }
      if (o.pasture) { ring(rnd, 30, R + 3, R + 50, (x, z) => G.tree(b, x, z, rnd() < 0.7 ? "bush" : "sal", 1 + rnd() * 0.6, rnd)); for (let i = 0; i < 9; i++) { const a = rnd() * 6.28, r = R + 3 + rnd() * 16, x = Math.sin(a) * r, z = Math.cos(a) * r - 6; b.at(x, 0, z, rnd() * 6, 1, (b) => { b.geo(new T.SphereGeometry(0.42, 7, 5).scale(1, 0.9, 1.7), 0, 0.95, 0, 0, 0, 0, i % 3 ? 0xe8dcc8 : 0x8a5a34); b.sph(0.22, 0, 1.2, 0.85, i % 3 ? 0xe8dcc8 : 0x8a5a34); for (const [lx, lz] of [[-0.2, 0.5], [0.2, 0.5], [-0.2, -0.5], [0.2, -0.5]]) b.cyl(0.06, 0.07, 0.75, lx, 0, lz, 0x5a4a3a, 5); b.cone(0.04, 0.2, -0.12, 1.36, 0.85, 0xe8e0d0, 4); b.cone(0.04, 0.2, 0.12, 1.36, 0.85, 0xe8e0d0, 4); }); } }
      if (o.road) for (let i = 0; i < 9; i++) G.rock(b, -R - 2 - rnd() * 6, -8 + i * 2, 0.4 + rnd() * 0.5, rnd);
      st.amb(o.fair || o.arena ? "motes" : "dust", { rate: 3, r: 18 });
      st.cam = { look: [0, 1.15, 0], dist: 8.2, yaw: -0.22, pitch: 0.13 };
    },
    // ----- A city: gate, street, market; by night; in ruins -----
    city(b, o, rnd, st) {
      const R = o.clear, wc = o.white ? 0xe8dcc8 : 0xcfae84;
      st.ground({ col: (x, z, r) => (Math.abs(x) < R + 4 || r < R + 4 ? (noise(x * 2, z * 2) > 0 ? 0xb89c74 : 0xad9068) : 0x9a8a62), size: 200, tex: "flags", rep: 30 });
      G.wall(b, -60, -R - 22, 60, -R - 22, 9, 2.2, wc); G.gate(b, 0, -R - 22, 0, 6, 11, wc, 0xd9a53a); for (const x of [-34, -14, 14, 34]) G.tower(b, x, -R - 22, 3.2, 13, wc, o.white ? 0xd9a53a : 0xb2432a);
      b.box(30, 14, 10, 0, 0, -R - 40, G.shade(wc, 1.05), 0, 0, 0, G.shade(wc, 1.2)); b.dome(5.6, 0, 14, -R - 40, 0xd9a53a, 0.9, 12); for (const sx of [-1, 1]) { b.dome(2.6, sx * 11, 14, -R - 40, 0xd9a53a, 1, 10); b.cyl(1.4, 1.6, 18, sx * 20, 0, -R - 38, wc, 8); b.dome(1.7, sx * 20, 18, -R - 38, 0xd9a53a, 1.2, 8); }
      for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) { const z = R + 2 - i * 7.5, ruined = o.ruins && rnd() < 0.6; if (ruined) { b.box(4 + rnd() * 2, 1 + rnd() * 1.6, 4, sx * (R + 6.5), 0, z, 0x6a5a4a); for (let k = 0; k < 4; k++) G.rock(b, sx * (R + 3 + rnd() * 3), z + rnd() * 3, 0.4 + rnd() * 0.5, rnd, 0x7a6a5a); if (rnd() < 0.4) st.amb("smoke", { rate: 1, r: 2, at: new V3(sx * (R + 6), 0, z) }); } else G.house(b, sx * (R + 6.5), z, -sx * PI / 2, { w: 5 + rnd() * 2, d: 4.5, h: 3.2 + rnd() * 2.4, wall: G.shade(wc, 0.88 + rnd() * 0.2), awning: rnd() < 0.6 ? [0xa3302a, 0x2d5aa0, 0xd79a2b][Math.floor(rnd() * 3)] : null }); }
      if (!o.ruins) { G.stall(b, -R - 1.5, -R + 2, 1.3, 0xd79a2b, rnd); G.stall(b, R + 1.5, -R + 4, -1.3, 0x2d5aa0, rnd); const sp = []; for (let i = 0; i < 22; i++) sp.push([(rnd() - 0.5) * (2 * R + 6), -R - 2 - rnd() * 16, rnd() * 6, 1]); st.add(G.crowd(sp, [0xa3302a, 0xd79a2b, 0x2f7d55, 0xe8dcc0, 0x2d5aa0], "stand", rnd)); }
      if (/night/.test(st.sky)) for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const z = R - 2 - i * 8; b.rod(sx * (R + 2.6), 0, z, sx * (R + 2.6), 2.6, z, 0.05, 0x5a3a22); st.flame(sx * (R + 2.6), 2.6, z, 0.55, i === 1); }
      else st.amb("motes", { rate: 3, r: 14 });
      st.cam = { look: [0, 1.2, 0], dist: 8.4, yaw: 0.2, pitch: 0.12 };
    },
    // ----- The house of lac at Varnavata -----
    lac(b, o, rnd, st) {
      const R = o.clear, hz = -R - 9, burnt = !!o.burnt;
      st.ground({ col: earth(0x8a7a56, 0x7a7048, 0x6a7a44), size: 180 });
      const wood = burnt ? 0x2a211c : 0x9a6a3a;
      b.box(18, burnt ? 2.2 : 5, 9, 0, 0, hz, wood, 0, 0, 0, G.shade(wood, 1.2)); if (!burnt) { b.box(19.5, 0.4, 10.5, 0, 5, hz, 0x6a4628); b.geo(new T.CylinderGeometry(0.1, 6.6, 3.2, 4, 1).rotateY(PI / 4).scale(1.75, 1, 1), 0, 6.9, hz, 0, 0, 0, 0xb08a4a, 0xd2b070); b.box(1.6, 2.6, 0.2, 0, 0, hz + 4.55, 0x24140c); for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) b.box(0.9, 1, 0.14, sx * (3 + i * 2.4), 2.4, hz + 4.55, 0x24140c); }
      else for (let i = 0; i < 9; i++) b.rod(-8 + i * 2, 0, hz + (rnd() - 0.5) * 6, -8 + i * 2 + (rnd() - 0.5) * 2, 2.6 + rnd() * 2.4, hz + (rnd() - 0.5) * 6, 0.16, 0x1a1410, 5, 0.06);
      G.wall(b, -30, hz - 10, 30, hz - 10, 3.6, 0.8, 0x8a7a66); if (o.wall) G.wall(b, -30, -R - 1.5, 30, -R - 1.5, 3.2, 0.7, 0x8a7a66, false);
      ring(rnd, 40, R + 6, R + 50, (x, z) => { if (Math.abs(x) > 12 || z > hz + 8) G.tree(b, x, z, rnd() < 0.5 ? "sal" : "mango", 1 + rnd() * 0.8, rnd); });
      G.hills(b, { n: 18, r0: 110, r1: 150, h: 18, w: 42, col: 0x3a4a3a }, rnd);
      if (o.fire) { for (let i = 0; i < 9; i++) st.flame(-8 + i * 2, 1.5 + rnd() * 4, hz + 2 + rnd() * 3, 3 + rnd() * 3, i === 2 || i === 6); st.amb("embers", { rate: 30, r: 14, at: new V3(0, 0, hz + 4) }); st.amb("smoke", { rate: 5, r: 9, at: new V3(0, 4, hz) }); }
      else if (burnt) { st.amb("ash", { rate: 10, r: 16 }); st.amb("smoke", { rate: 2, r: 8, at: new V3(0, 1, hz) }); }
      else { st.flame(-2.2, 2, hz + 4.8, 0.4, true); st.flame(2.2, 2, hz + 4.8, 0.4, false); st.amb("fireflies", { rate: 3, r: 16 }); }
      st.cam = { look: [0, 1.4, -1], dist: 9, yaw: 0.18, pitch: 0.1 };
    },
    // ----- High places: a mountain path, a shrine among the snows -----
    mountain(b, o, rnd, st) {
      const R = o.clear;
      st.ground({ col: (x, z, r) => (r < R + 2 ? 0x9a9488 : noise(x, z) > 0.3 ? 0x8a8a80 : noise(x, z) < -0.4 ? 0xe8ecf0 : 0x7a7a72), size: 220, seg: 60, h: (x, z, r) => (r > R + 4 ? (r - R - 4) * (x < 0 || z < 0 ? 0.42 : -0.3) * (0.8 + 0.4 * noise(x * 0.5, z * 0.5)) : 0) });
      G.hills(b, { n: 30, r0: 70, r1: 150, h: 70, w: 30, col: 0x5a5e6a, top: 0x8a909c, snow: true }, rnd);
      ring(rnd, 40, R + 1, R + 30, (x, z) => G.rock(b, x, z, 0.6 + rnd() * 1.6, rnd, 0x7a7a74));
      ring(rnd, 14, R + 4, R + 30, (x, z) => G.tree(b, x, z, "pine", 0.9 + rnd() * 0.7, rnd));
      if (o.shrine) { G.temple(b, 0, -R - 5, 0.9, 0x9a968c, 0); st.flame(0, 1, -R - 1.5, 0.5, true); for (let i = 0; i < 5; i++) { const f = G.banner(3.4, ["#a3302a", "#d79a2b", "#f2ead2"][i % 3], "#f2ead2", "diamond", 0.8); f.position.set(-5 + i * 2.5, 0, -R + 0.5); st.add(f); st.banners.push(f); } }
      st.amb(o.snow ? "ash" : "motes", { rate: o.snow ? 30 : 3, r: 18, col: 0xffffff });
      st.cam = { look: [0, 1.2, 0], dist: 8.2, yaw: -0.3, pitch: 0.1 };
    },
    // ----- A shrine's court: the fire altar, the tree, the temple -----
    shrine(b, o, rnd, st) {
      const R = o.clear;
      st.ground({ col: (x, z, r) => (r < R + 6 ? (noise(x * 2, z * 2) > 0 ? 0xc4a47a : 0xb8986e) : noise(x, z) > 0.2 ? 0x7f9450 : 0x8a9a58), size: 200, tex: "flags", rep: 30 });
      G.temple(b, 0, -R - 10, 1.4, 0xd0b48e, 0); G.altar(b, 0, -R + 2.2, 1.2); st.flame(0, 1.0, -R + 2.2, 1.1, true);
      G.tree(b, -R - 4, -R - 1, "banyan", 1.6, rnd); b.cyl(3.6, 3.8, 0.45, -R - 4, 0, -R - 1, 0xb89a78, 12);
      for (const sx of [-1, 1]) { for (let i = 0; i < 4; i++) G.pillar(b, sx * (R + 3), -R - 4 + i * 5, 4.4, 0.3, 0xd0b48e); const y = G.lampStand(b, sx * 3, -R + 2.2, 1.6); st.flame(sx * 3, y, -R + 2.2, 0.32, false); }
      b.rod(R + 1.5, 0, -R + 1, R + 1.5, 3, -R + 1, 0.07, 0x5a3a22); b.rod(R + 0.3, 3, -R + 1, R + 2.7, 3, -R + 1, 0.06, 0x5a3a22); b.cyl(0.26, 0.34, 0.5, R + 1.5, 2.3, -R + 1, 0xb8862e, 8);
      ring(rnd, 16, R + 10, R + 44, (x, z) => { if (z > -R - 4) G.tree(b, x, z, rnd() < 0.3 ? "palm" : "mango", 1 + rnd() * 0.7, rnd); });
      G.hills(b, { n: 20, r0: 120, r1: 160, h: 16, w: 40, col: 0x6a8060, top: 0x8a9a78 }, rnd);
      for (let i = 0; i < 12; i++) b.sph(0.14, (rnd() - 0.5) * 6, 0.05, -R + 3.5 + rnd() * 1.5, i % 2 ? 0xee8a1c : 0xf6c13a, 0.6, 5);
      st.amb("motes", { rate: 4, r: 12, col: 0xffe2a8 });
      st.cam = { look: [0, 1.2, -0.5], dist: 8.2, yaw: 0.22, pitch: 0.12 };
    },
    // ----- A storm at sea -----
    sea(b, o, rnd, st) {
      st.add(G.water([400, 400], 0, 0x2a5262, 1)); st.ground({ col: 0x1a3440, size: 400, seg: 4 }); st.lastGround.position.y = -3;
      for (let i = 0; i < 16; i++) { const a = rnd() * 6.28, r = 18 + rnd() * 50; G.rock(b, Math.sin(a) * r, Math.cos(a) * r - 20, 1.5 + rnd() * 3, rnd, 0x3a3e44); }
      G.hills(b, { n: 8, r0: 150, r1: 180, h: 30, w: 50, col: 0x3a4650, arc: [2.2, 4.2] }, rnd);
      st.amb("rain", { rate: 120, r: 20 });
      st.cam = { look: [0, 1, 0], dist: 9, yaw: 0.2, pitch: 0.2 };
    },
    // ----- Under the lake -----
    deep(b, o, rnd, st) {
      st.ground({ col: earth(0x3a6a5a, 0x2f5a50, 0x4a7a60), size: 120, h: (x, z, r) => Math.sin(x * 0.2) * 0.5 + Math.cos(z * 0.17) * 0.5 });
      ring(rnd, 30, 3, 40, (x, z) => (rnd() < 0.5 ? G.rock(b, x, z, 0.6 + rnd() * 1.4, rnd, 0x4a6a60) : G.reeds(b, x, z, 7, rnd, 0x3a8a5a)), false);
      st.amb("bubbles", { rate: 8, r: 12 });
      st.cam = { look: [0, 4, 0], dist: 14, yaw: 0, pitch: 0.05 };
    },
    // ----- A room at home, at night: a rope bed, a lamp, the door -----
    room(b, o, rnd, st) {
      st.ground({ col: 0x7a5a3c, size: 40, seg: 8, tex: "fine", rep: 8 });
      for (const [x, z, w, d] of [[0, -4, 10, 0.4], [-5, 0, 0.4, 8], [5, 0, 0.4, 8]]) b.box(w, 3.4, d, x, 0, z, 0x8a6440, 0, 0, 0, 0xa87a50);
      b.box(1.2, 2.2, 0.2, 3, 0, -3.85, 0x1a100a); G.cot(b, -2, -2.2, PI / 2); b.box(1.4, 0.04, 2.2, 1.2, 0.02, 0.4, 0xb89a5a); G.pot(b, 3.8, -2.6, 1.2); G.pot(b, 4.1, -1.6, 0.8);
      const y = G.lampStand(b, 0.2, -3, 0.7); st.flame(0.2, y, -3, 0.3, true);
      st.cam = { look: [-0.5, 0.9, -1.6], dist: 6.4, yaw: 0.25, pitch: 0.2 }; st.indoor = true;
    },
    // ----- Nothing but light: the dream breaking -----
    void(b, o, rnd, st) { st.ground({ col: 0xf2e6d2, size: 200, seg: 4 }); st.cam = { look: [0, 1.1, 0], dist: 8, yaw: 0, pitch: 0.1 }; }
  };

  // ---------- Which place each key is ----------
  // [pattern, builder, sky, options]. The first match wins; "home_<land>" and "origin" follow the life.
  const P = (re, kind, sky, o) => [re, kind, sky, o || {}];
  const PLACES = [
    P(/^(home|roots|custom)_(\w+?)(_wide)?$/, "village", "gold"),
    P(/^scene_princes|stage_lotus_garden$|scene_secret$|scene_dice_question|scene_vasu$/, "garden", "gold"),
    P(/stage_palace_garden_night|scene_secret_told/, "garden", "night"),
    P(/scene_dice_hall|scene_dice_throws|scene_dice_cloth|stage_dice_board_top|scene_pasha_hall/, "hall", "hall", { dice: true }),
    P(/stage_palace_corridor|stage_prison_yard|scene_prisoners_pen/, "hall", "cave", { narrow: true, dark: true }),
    P(/stage_lac_cellar/, "hall", "cave", { low: true, dark: true, cellar: true }),
    P(/stage_healers_hall/, "hall", "hall", { cots: true }),
    P(/stage_vidura_table|stage_board_table|scene_mentor_vidura|scene_note|scene_letter/, "hall", "hall", { table: true }),
    P(/stage_smithy|scene_smith|scene_armour/, "hall", "hall", { forge: true, dark: true }),
    P(/stage_kichaka_hall_night/, "hall", "cave", { court: true, dark: true }),
    P(/scene_rajasuya|scene_envoy|stage_virata_court|scene_virata|stage_drupada_hall|scene_swayamvara$|fight_swayamvara|scene_war_council|scene_mentor|scene_command_banner|scene_kings_fall/, "hall", "hall", { court: true }),
    P(/scene_poison/, "river", "dusk", { pavilions: true, ghat: true }),
    P(/stage_river_crossing_night|fight_lake_reeds_night|stage_lake_reeds/, "river", "night", { lake: true, reeds: true, boat: false }),
    P(/scene_lake|stage_forest_lake|scene_duryodhana$|scene_lake_charu/, "river", "dusk", { lake: true, reeds: true, boat: false }),
    P(/stage_matsya_ford|stage_field_to_river|scene_iravan_river/, "river", "day", { ford: true, boat: false }),
    P(/stage_river_shallows|scene_truce_river|scene_river_rite|stage_naga_bank|end_river|ev_flood/, "river", "gold", { ghat: true }),
    P(/stage_khandava_top|ev_fire/, "forest", "fire", { burning: true }),
    P(/stage_exile_storm/, "forest", "storm", { storm: true }),
    P(/stage_forest_clearing_night|stage_forest_maze_top|ev_snake/, "forest", "night", {}),
    P(/stage_gandharva_grove/, "forest", "night", { grove: true, dark: true }),
    P(/scene_ashram|ev_teacher|scene_sage_year|end_forest|scene_own_student|scene_soma|scene_teaching/, "forest", "dawn", { ashram: true, sparse: true }),
    P(/scene_sage|scene_journey|fight_forest_road|ev_bandits|scene_jayadratha|stage_war_road|fight_border_road|battle_border|stage_border_village|ev_riddle|ev_letter/, "forest", "day", { road: true, sparse: true }),
    P(/scene_exile|scene_ekalavya|ev_deer|stage_forest_edge|scene_path$/, "forest", "gold", { sparse: true }),
    P(/stage_tournament_arena|scene_tournament|stage_racetrack|scene_duel_ground/, "yard", "day", { arena: true }),
    P(/stage_training_ground|stage_bow_courtyard|stage_drona_gate|scene_teacher|scene_armoury|scene_drupada|fight_drupada_yard|ev_teacher/, "yard", "gold", { train: true }),
    P(/stage_mango_yard/, "yard", "day", { mango: true, fair: false }),
    P(/stage_stable_yard|ev_horses/, "yard", "gold", { stable: true }),
    P(/stage_elephant_grounds/, "yard", "day", { elephants: true }),
    P(/fight_fair_ring/, "yard", "gold", { fair: true, ringed: true }),
    P(/scene_fair|scene_pasha|ev_bard|ev_lamps|scene_bard|end_teller/, "yard", "gold", { fair: true }),
    P(/scene_cattle|battle_cattle|fight_grazing|battle_field$/, "yard", "day", { pasture: true }),
    P(/stage_city_night/, "city", "night", {}),
    P(/stage_city_ruins|scene_rebuild/, "city", "dusk", { ruins: true }),
    P(/scene_indraprastha|end_elder|end_survivor/, "city", "gold", { white: true }),
    P(/scene_lac_fire|stage_lac_fire_top/, "lac", "fire", { fire: true }),
    P(/end_fire/, "lac", "dawn", { burnt: true }),
    P(/stage_lac_wall/, "lac", "night", { wall: true }),
    P(/scene_lac/, "lac", "night", {}),
    P(/stage_mountain_path|scene_pilgrimage/, "mountain", "day", {}),
    P(/stage_shiva_mountain|scene_brahmastra/, "mountain", "dawn", { shrine: true, snow: true }),
    P(/stage_fire_altar|scene_temple_offering|scene_vow|scene_raksha_sutra|scene_birth|moment_marriage|scene_samshaptaka_oath|end_oath/, "shrine", "gold", {}),
    P(/stage_storm_sea/, "sea", "storm", {}),
    P(/stage_deep_lake/, "deep", "water", {}),
    P(/war_eve|scene_letter_camp|fight_royal_camp|scene_ugra_letter/, "camp", "dusk", { royal: true }),
    P(/stage_supply_camp_night|fight_camp_gate_night|scene_raid/, "camp", "night", { gate: true }),
    P(/fight_supply_carts/, "camp", "night", { carts: true }),
    P(/fight_war_camp/, "camp", "gold", {}),
    P(/battle_night|fight_night_torches|stage_battlefield_night/, "field", "night", {}),
    P(/scene_day13|fight_chakravyuha_inner|stage_chakravyuha_top|end_wheel/, "field", "gold", { wheel: true }),
    P(/scene_arrows/, "field", "dusk", { arrows: true, aftermath: true }),
    P(/scene_women_field|end_death|end_broken|end_vengeance|end_cut_short|scene_years_remain/, "field", "dusk", { aftermath: true, pyres: true }),
    P(/war_day17|war_day18|fight_war_sunset|scene_line_broken|end_crossed/, "field", "dusk", {}),
    P(/war_bhishma|fight_between_lines|scene_yuyutsu_crossing|scene_shikhandi|scene_sibling_field|scene_ugra_field|scene_bhurishravas/, "field", "dawn", { between: true }),
    P(/stage_vyuha_top|stage_muster_field_top/, "field", "dawn", { empty: true }),
    P(/war_|fight_|battle_|stage_war/, "field", "gold", {}),
    P(/dream_white/, "void", "white", {}),
    P(/room_night/, "room", "cave", {})
  ];
  G.placeOf = function (key, S) {
    S = S || K.S || {};
    key = String(key || "");
    if (key === "origin") key = "home_" + (S.origin === "suta" && !(S.flags || []).includes("moved_capital") ? "anga" : S.origin || "hastinapura");
    for (const [re, kind, sky, o] of PLACES) {
      const m = re.exec(key);
      if (!m) continue;
      const opt = Object.assign({}, o);
      if (kind === "village") { opt.land = K.ORIGINS && K.ORIGINS[m[2]] ? m[2] : "hastinapura"; if (m[1] === "roots") return { kind, sky: "dawn", o: opt, key }; if (m[1] === "custom") return { kind, sky: "day", o: opt, key }; }
      if ((kind === "field" || kind === "camp") && S.side) opt.mine = S.side;
      return { kind, sky, o: opt, key };
    }
    return { kind: "village", sky: "gold", o: { land: S.origin && K.ORIGINS && K.ORIGINS[S.origin] ? S.origin : "hastinapura" }, key };
  };

  // ---------- Building a place ----------
  let current = null;
  G.stageNow = () => current;
  // opts: { clear, sky (override), mine }. Returns the stage.
  G.setStage = function (key, opts) {
    if (!G.ok) return null;
    opts = opts || {};
    const pl = G.placeOf(key), o = Object.assign({ clear: 8 }, pl.o, opts);
    if (current) { for (const u of current.offs) u(); }
    G.fx.clear(); G.fx.resetLights(); G.clear(G.world);
    const sky = opts.sky || pl.sky;
    G.setSky(sky, pl.kind === "hall" && o.dark ? { hi: 0.5 } : null);
    const rnd = G.rand(G.hash(pl.kind + (o.land || "") + key.replace(/_(tall|wide)$/, "")));
    const st = (current = { key, kind: pl.kind, sky, o, group: new T.Group(), ticks: [], banners: [], offs: [], clear: o.clear, last: null,
      add(obj) { this.group.add(obj); this.last = obj; if (obj.userData && obj.userData.tick) this.ticks.push(obj.userData.tick); if (obj.userData && obj.userData.wheels) obj.traverse((m) => { if (m.isMesh) m.castShadow = true; }); return obj; },
      ground(g) { const m = G.ground(g); this.group.add(m); this.lastGround = m; return m; },
      flame(x, y, z, s, light) { return G.fx.flame(this.group, x, y, z, s, light); },
      amb(kind, a) { this.offs.push(G.fx.ambient(kind, a)); }
    });
    const b = new G.Builder();
    BUILD[pl.kind](b, o, rnd, st);
    if (!b.empty()) st.group.add(b.mesh());
    st.far = b.far || []; for (const f of st.far) st.group.add(f);
    G.world.add(st.group);
    // Where people stand: you a little left of the middle, the others in an arc to your right, all turned inward.
    st.me = st.me || [-1.25, 0.6, 0.55];
    st.spots = st.spots || [[1.35, 0.5, -0.7], [2.7, -0.5, -0.95], [0.25, -1.5, -0.2], [-2.75, -0.7, 0.9], [3.9, -1.7, -1.05], [-1.2, -2.3, 0.3], [1.6, -2.8, -0.4]];
    st.tick = function (dt, t) { for (const f of this.ticks) f(dt, t); for (const bn of this.banners) G.wave(bn, t); };
    return st;
  };
  // Take the place down without putting another up (the map, which is not a place, draws itself).
  G.dropStage = function () { if (!G.ok) return; if (current) for (const u of current.offs) u(); current = null; G.fx.clear(); G.fx.resetLights(); G.clear(G.world); };
  G.onStageFrame = function () { if (!G.ok) return; G.onFrame((dt, t) => { if (current) current.tick(dt, t); }); };
})(window.K = window.K || {});
