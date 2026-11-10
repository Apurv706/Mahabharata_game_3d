/* The dash through the Chakravyuha (seven turning rings; open it behind Abhimanyu, or keep the outer ring shut), lifted
   unchanged from the 2D game's ui/play.js. K.UI.DASH / dashSetup / dashRules. */
(function (K) {
  "use strict";
  const U = (K.UI = K.UI || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DASH = {
    RINGS: [132, 116, 100, 84, 68, 52, 36], GAPS: [4, 4, 3, 3, 3, 2, 2], BAND: 6, HEART: 20,
    START: 152, LEAD: 14,              // where you start, and how far ahead of you Abhimanyu starts
    VR: 11, SIDE: 80, SIDE_ACC: 400,   // forward speed; steering round the wheel (along the arc), and how fast it answers
    HALF: 6, WIDE: 3.2,                // half your chariot's length (its nose meets a ring), and half its width
    GAP: 14, GAP_POWER: 0.6, GAP_MAX: 20, ASSIST: 1.3, // half an opening along its ring: wider with your stats, and with story mode or assist
    SPIN: [12, 24], SPIN_POWER: 0.02,  // how fast the rings turn along their length; slower with your stats
    BOUNCE: 9, STUN: 0.55, HULL: 5,     // a ring you hit: thrown back, a moment to recover, a man lost
    WHIP: 1.2, WHIP_COOL: 5,           // the whip: twice the speed for 1.2 s, then 5 s to recharge
    SECS: 12, SECS_POWER: 0.15, SECS_MAX: 14, // until Jayadratha's line seals the gate
    // Keeping it shut: your ring (its radius, openings, half an opening, how fast you turn it), the
    // turning rings inside it, and the chariots: where they come from, their speed in and round, how often.
    MY: 112, MY_BAND: 10, MY_GAPS: 3, MY_GAP: 19, MY_GAP_POWER: 0.6, MY_GAP_MIN: 13, MY_SPIN: 56, MY_ACC: 260, INNER: [96, 82, 68, 54, 40, 27],
    FROM: 172, CV: 11, CS: 32, CS_POWER: 0.6, EVERY: [3, 1.9], WAVE: 2.8, LEAD_SECS: 1.2, HOLD: 32, ALLOW: 0, BREACHES: 2
  };
  U.DASH = DASH;
  U.dashSetup = function (t, power, assist) {
    const D = DASH, easy = assist ? D.ASSIST : 1;
    return {
      mode: t.mode === "close" ? "close" : "open",
      gap: clamp(D.GAP + power * D.GAP_POWER, D.GAP, D.GAP_MAX) * easy,
      spin: clamp(1 - power * D.SPIN_POWER, 0.75, 1),
      secs: t.secs || clamp(D.SECS + power * D.SECS_POWER, D.SECS, D.SECS_MAX),
      hull: D.HULL,
      myGap: clamp(D.MY_GAP - power * D.MY_GAP_POWER, D.MY_GAP_MIN, D.MY_GAP) / easy,
      cs: clamp(D.CS - power * D.CS_POWER, D.CS - 6, D.CS) / easy,
      hold: t.secs || D.HOLD
    };
  };
  // step(dt, steer) moves it on (steer: -1, 0 or 1; +1 turns clockwise) and returns what happened:
  // pass, hit, spawn, breach, held, end (outcome, why).
  U.dashRules = function (o, rng) {
    const D = DASH, TAU = Math.PI * 2, N = D.RINGS.length;
    const wrap = (x) => { x = (x + Math.PI) % TAU; if (x < 0) x += TAU; return x - Math.PI; };
    const R = { t: 0, over: false, outcome: null, why: null, ids: 0 };
    // How far (along the ring) a point at angle a is from the nearest opening's middle.
    const off = (g, a) => { let b = Infinity; for (let k = 0; k < g.n; k++) b = Math.min(b, Math.abs(wrap(a - g.phi - k * TAU / g.n)) * g.r); return b; };
    R.off = off; R.wrap = wrap;
    const ring = (r, n, half, v) => ({ r, n, half, phi: rng() * TAU, v });
    const speed = () => (rng() < 0.5 ? -1 : 1) * (D.SPIN[0] + rng() * (D.SPIN[1] - D.SPIN[0])) * (o.spin || 1);
    let ev = [];
    const end = (outcome, why) => { if (R.over) return; R.over = true; R.outcome = outcome; R.why = why; ev.push({ type: "end", outcome, why }); };
    if (o.mode !== "close") {
      R.rings = D.RINGS.map((r, i) => ring(r, D.GAPS[i], o.gap, speed()));
      for (let i = 1; i < N; i++) if (Math.sign(R.rings[i].v) === Math.sign(R.rings[i - 1].v) && rng() < 0.6) R.rings[i].v *= -1; // neighbours mostly turn opposite ways
      const a0 = rng() * TAU;
      R.me = { r: D.START, a: a0, v: 0, stun: 0, kb: 0, boost: 0, cool: 0, passed: 0, hits: 0 };
      R.abhi = { r: D.START - D.LEAD, a: a0, v: 0, passed: 0 };
      R.contact = (i) => R.rings[i].r + D.BAND / 2 + D.HALF;
      R.whip = () => { const m = R.me; if (R.over || m.boost > 0 || m.cool > 0 || m.stun > 0) return false; m.boost = D.WHIP; m.cool = D.WHIP + D.WHIP_COOL; return true; };
    } else {
      R.my = ring(D.MY, D.MY_GAPS, o.myGap, 0); R.my.w = 0;
      R.rings = D.INNER.map((r, i) => ring(r, D.GAPS[i + 1], D.GAP, speed()));
      R.cars = []; R.spawnIn = 1; R.breaches = 0; R.held = 0;
      R.contact = () => D.MY + D.MY_BAND / 2 + D.HALF;
      R.whip = () => false;
    }
    function stepOpen(dt, steer) {
      const m = R.me, A = R.abhi;
      m.cool = Math.max(0, m.cool - dt); m.boost = Math.max(0, m.boost - dt);
      m.v += clamp(clamp(steer || 0, -1, 1) * D.SIDE - m.v, -D.SIDE_ACC * dt, D.SIDE_ACC * dt);
      m.a += (m.v / m.r) * dt;
      if (m.stun > 0) { m.r += m.kb * (m.stun / D.STUN) * dt; m.stun -= dt; }
      else if (m.passed < N) m.r -= D.VR * (m.boost > 0 ? 2 : 1) * dt;
      if (m.passed < N && m.stun <= 0) {
        const g = R.rings[m.passed], cr = R.contact(m.passed);
        if (m.r <= cr) {
          if (off(g, m.a) <= g.half - D.WIDE) { m.passed++; ev.push({ type: "pass", i: m.passed - 1 }); if (m.passed === N) end("win", "through"); }
          else {
            m.r = cr; m.stun = D.STUN; m.kb = (2 * D.BOUNCE) / D.STUN; m.boost = 0; m.hits++;
            ev.push({ type: "hit", i: m.passed });
            if (m.hits >= o.hull) end("lose", "broken");
          }
        }
      }
      // Abhimanyu: he steers for the opening he can reach soonest and waits at a ring until it comes.
      if (A.passed < N) {
        const g = R.rings[A.passed], cr = R.contact(A.passed), va = D.VR * 1.1, tc = Math.max(0, (A.r - cr) / va);
        let best = null;
        for (let k = 0; k < g.n; k++) { const d = wrap(g.phi + (k * TAU) / g.n + (g.v / g.r) * tc - A.a) * A.r; if (best === null || Math.abs(d) < Math.abs(best)) best = d; }
        const want = clamp(best / Math.max(tc, 0.3), -D.SIDE * 1.2, D.SIDE * 1.2);
        A.v += clamp(want - A.v, -D.SIDE_ACC * 1.2 * dt, D.SIDE_ACC * 1.2 * dt);
        A.a += (A.v / A.r) * dt;
        const inGap = off(g, A.a) <= g.half - D.WIDE - 1;
        if (A.r > cr + 0.5 || inGap) A.r -= va * dt; else A.r = cr + 0.5;
        if (A.r <= cr && inGap) A.passed++;
      } else {
        A.r = Math.max(D.HEART * 0.6, A.r - D.VR * dt);
        A.v += clamp(D.SIDE * 0.4 - A.v, -D.SIDE_ACC * dt, D.SIDE_ACC * dt); A.a += (A.v / A.r) * dt; // in the heart, wheeling and fighting
      }
      if (!R.over && R.t >= o.secs) end(m.passed >= N - 2 ? "close" : "lose", m.passed === 0 ? "gate" : "between");
    }
    function stepClose(dt, steer) {
      const M = R.my;
      M.w += clamp(clamp(steer || 0, -1, 1) * D.MY_SPIN - M.w, -D.MY_ACC * dt, D.MY_ACC * dt);
      M.phi += (M.w / M.r) * dt;
      R.spawnIn -= dt;
      if (R.spawnIn <= 0 && R.t < o.hold - 3) {
        // a charge: one chariot at first, then two or three together, each from a side no other is coming from
        const f = clamp(R.t / o.hold, 0, 1), many = 1 + Math.floor(f * D.WAVE + rng() * 0.6);
        for (let j = 0; j < many; j++) {
          let a = 0;
          for (let k = 0; k < 12; k++) { a = rng() * TAU; if (R.cars.every((c) => c.state !== "come" || Math.abs(wrap(c.a - a)) > 0.9)) break; }
          const car = { id: ++R.ids, r: D.FROM + j * 9, a, v: 0, state: "come", t: 0 };
          R.cars.push(car); ev.push({ type: "spawn", car });
        }
        R.spawnIn = (D.EVERY[0] + (D.EVERY[1] - D.EVERY[0]) * f) * (0.75 + many * 0.35);
      }
      const cr = R.contact();
      for (const c of R.cars) {
        c.t += dt;
        if (c.state === "come") {
          // he steers for the opening nearest him, where it will be when he gets there (as far as he can tell)
          const tc = clamp((c.r - cr) / D.CV, 0, D.LEAD_SECS);
          let best = null;
          for (let k = 0; k < M.n; k++) { const d = wrap(M.phi + (M.w / M.r) * tc + (k * TAU) / M.n - c.a) * c.r; if (best === null || Math.abs(d) < Math.abs(best)) best = d; }
          c.v += clamp(clamp(best * 2.5, -o.cs, o.cs) - c.v, -90 * dt, 90 * dt);
          c.a += (c.v / c.r) * dt; c.r -= D.CV * dt;
          if (c.r <= cr) {
            if (off(M, c.a) <= M.half - D.WIDE) { c.state = "in"; R.breaches++; ev.push({ type: "breach", car: c }); if (R.breaches >= D.BREACHES) end("lose", "breached"); }
            else { c.state = "out"; R.held++; ev.push({ type: "held", car: c }); }
          }
        } else if (c.state === "in") c.r = Math.max(4, c.r - D.CV * 1.3 * dt);
        else c.r += D.CV * 0.9 * dt; // thrown back
      }
      R.cars = R.cars.filter((c) => c.t < 14 && c.r < D.FROM + 24);
      if (!R.over && R.t >= o.hold) end(R.breaches <= D.ALLOW ? "win" : "close", "held");
    }
    R.step = (dt, steer) => {
      ev = [];
      if (R.over) return ev;
      R.t += dt;
      for (const g of R.rings) g.phi += (g.v / g.r) * dt;
      if (o.mode !== "close") stepOpen(dt, steer); else stepClose(dt, steer);
      return ev;
    };
    return R;
  };

})(window.K = window.K || {});
