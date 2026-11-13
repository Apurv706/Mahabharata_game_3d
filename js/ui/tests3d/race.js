/* The race with free steering (the 3D game's own; the 2D game keeps its three lanes: ui/play.js).
   The road is a width you steer across, not three lanes you hop between. What you drive answers as that thing does:
     a chariot: the team swings round at its own rate (a turning circle), the car follows on its wheels, and asked to turn
       harder than its wheels will hold it slides, which costs pace; under the whip it holds the road less well;
     a boat: slow to answer, and it drifts on after the tiller is straight;
     on foot (running, climbing, swimming): quick, but with a body's weight: you cannot stop a sidestep at once.
   What lies in the road has a place and a width of its own. A thing struck squarely is a hit; a thing a wheel or a
   shoulder only brushes is a clip, which jolts and costs a moment but no more. The rails at the road's edge slow you.
   A rival drives the same road: he wanders across it, cuts in on you with a moment's warning, and wheels that touch
   throw both cars apart.
   The numbers a race is set up with (speed, the gap between things, lives, the rival's speed, whip, bow, shield) and
   its endings are the lane race's own (U.raceSetup, U.RACE), so a scene's race is as long and as hard as it was.
   step(dt, steer) moves the race on (steer: -1 hard left .. 1 hard right) and returns what happened:
   spawn, gone, hit, clip, catch, miss, warn, cut, clash (how: clash, ram, knock), rails, end. */
(function (K) {
  "use strict";
  const U = (K.UI = K.UI || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ROAD = {
    W: 3.5,                                    // half the road's width (m)
    AT: 17, PER_M: 1 / 0.42,                   // where you are along the things' own scale, and that scale's units per metre
    HAND: {
      chariot: { half: 0.8, len: 3.4, yawMax: 0.5, turn: 2.8, lat: 5.6, grip: 7.5, gripWhip: 3.6, scrub: 0.28, aimed: 0.18 },
      boat: { half: 0.6, len: 3.2, yawMax: 0.55, turn: 1.7, lat: 4.6, grip: 3.0, gripWhip: 3.0, scrub: 0.12, aimed: 0.18 },
      foot: { half: 0.32, len: 0.9, lat: 5.0, quick: 7.5, aimed: 0.6 }
    },
    RADIUS: { rock: 0.6, wreck: 0.85, fire: 0.7, wave: 0.9, arrow: 0.3, ice: 0.8, lotus: 0.6, stone: 0.6 },
    ROW: 30,                                   // the least distance between one thing and the next, on their own scale
    CLIP: 0.22,                                // an overlap smaller than this (m) is a clip, not a hit
    CLIP_SLOW: 0.35, RAIL_COOL: 0.8,
    CATCH: 0.9,                                // how near an arrow must come to be taken on the shield (m)
    R_WANDER: 2.4, R_CUT: 6.5,                 // how fast the rival crosses the road: wandering, and cutting in (m/s)
    SHOVE: 3.2, RAM: 5.5                       // how fast wheels that touch throw the cars apart, and a ram throws you (m/s)
  };
  U.ROAD = ROAD;
  // The lane race's set-up, with one change: the better you are, the more room between one thing and the next
  // (in the lane race it was the other way about). Set so that a good driver wins seven or eight races in ten at any
  // measures (tests/race3_balance.js): steering takes more than changing lanes did, so the road is a little less crowded.
  U.raceSetup3 = function (t, power) { const o = U.raceSetup(t, power); o.gap = clamp(1.16 + power * 0.02, 1.1, 1.36); return o; };
  U.raceRules3 = function (o, rng, vehicle) {
    const C = U.RACE, D = ROAD, H = D.HAND[vehicle] || D.HAND.chariot, base0 = 3.3, pick = (a) => a[Math.floor(rng() * a.length)];
    const edge = D.W - H.half, zone = (H.len / 2) * D.PER_M + 1.2;
    const R = { x: 0, vx: 0, yaw: 0, skid: 0, dist: 0, rival: 0, slow: 0, hits: 0, clips: 0, spawnIn: 1.2, t: 0, obs: [], boost: 0, cool: 0, over: false, half: H.half,
      rx: -1.9, rvx: 0, rTo: -1.9, rSlow: 0, rWander: 3, cut: 0, cutT: -9, cutCool: 3, clashCool: 0, railCool: 0, turned: 0, bowCool: 0, caught: 0, miss: 0 };
    R.speed = () => (R.over ? 0 : o.base * (R.slow > 0 ? 0.5 : 1) * (R.boost > 0 ? 2 : 1) * (1 - (H.scrub || 0) * Math.min(1, R.skid)));
    R.inReach = () => o.bow && Math.abs(R.rival - R.dist) < C.LEVEL * C.BOW_REACH;
    R.shoot = () => {
      if (!o.bow || R.over || R.bowCool > 0) return null;
      R.bowCool = C.BOW_COOL;
      if (!R.inReach()) return "far";
      R.rSlow = C.BOW_SLOW; R.rival -= C.BOW_BACK; R.turned++;
      return "hit";
    };
    R.whip = () => { if (!o.whip || R.over || R.boost > 0 || R.cool > 0) return false; R.boost = C.WHIP; R.cool = C.WHIP + C.WHIP_COOL; return true; };
    R.step = (dt, steer) => {
      const ev = [], at = (type, x) => ev.push(Object.assign({ type }, x));
      if (R.over) return ev;
      steer = clamp(steer || 0, -1, 1); R.t += dt;
      if (R.boost > 0) R.boost -= dt;
      if (R.cool > 0) R.cool -= dt;
      if (R.slow > 0) R.slow -= dt;
      if (R.rSlow > 0) R.rSlow -= dt;
      if (R.bowCool > 0) R.bowCool -= dt;
      if (R.railCool > 0) R.railCool -= dt;
      // ---- steering
      const pace = (o.base * (R.slow > 0 ? 0.5 : 1) * (R.boost > 0 ? 2 : 1)) / base0;
      if (H.yawMax) {
        const want = steer * H.yawMax; R.yaw += clamp(want - R.yaw, -H.turn * dt, H.turn * dt);
        const vxT = H.lat * Math.min(1.6, pace) * (R.yaw / H.yawMax), g = R.boost > 0 ? H.gripWhip : H.grip;
        R.vx += (vxT - R.vx) * Math.min(1, g * dt);
        const slip = Math.abs(vxT - R.vx) / H.lat; R.skid += ((slip > 0.3 ? Math.min(1, (slip - 0.3) * 2.2) : 0) - R.skid) * Math.min(1, dt * 8);
      } else { R.vx += (steer * H.lat - R.vx) * Math.min(1, H.quick * dt); R.yaw = (R.vx / H.lat) * 0.35; R.skid = 0; }
      R.x += R.vx * dt;
      if (Math.abs(R.x) > edge) {
        const sg = Math.sign(R.x); R.x = sg * edge;
        if (R.vx * sg > 1.2 && R.railCool <= 0 && H.yawMax) { R.slow = Math.max(R.slow, C.RAIL_SLOW * 0.6); R.boost = 0; R.railCool = D.RAIL_COOL; at("rails", { side: sg }); }
        if (R.vx * sg > 0) { R.vx = H.yawMax ? -R.vx * 0.25 : 0; if (H.yawMax) R.yaw *= -0.3; }
      }
      const v = R.speed();
      R.dist += v * dt;
      if (o.rival) R.rival += o.rivalV * (R.rSlow > 0 ? 0.5 : 1) * dt * (0.94 + 0.12 * Math.sin(R.t * 0.7));
      // ---- the rival on the same road
      if (o.contact) {
        const diff = R.rival - R.dist, level = Math.abs(diff) < C.LEVEL, gapX = R.rx - R.x, redge = D.W - H.half;
        if (R.cutCool > 0) R.cutCool -= dt;
        if (R.clashCool > 0) R.clashCool -= dt;
        let rate = D.R_WANDER;
        if (R.cut > 0) { R.cut -= dt; if (R.cut <= 0) { R.rTo = clamp(R.x, -redge, redge); R.cutT = R.t; at("cut"); } }
        else if (R.t - R.cutT < 0.6) rate = D.R_CUT;
        else if (level && Math.abs(gapX) > 2 * H.half + 0.2 && Math.abs(gapX) < 4.2 && R.cutCool <= 0 && rng() < dt * C.CUT_RATE) { R.cut = C.WARN; R.cutCool = C.CUT_GAP; at("warn", { side: Math.sign(-gapX) }); }
        else if ((R.rWander -= dt) <= 0) {
          R.rWander = C.WANDER + rng() * C.WANDER_MORE;
          for (let k = 0; k < 6; k++) { const to = (rng() * 2 - 1) * redge; if (!(level && Math.abs(to - R.x) < 2 * H.half + 0.5)) { R.rTo = to; break; } }
          at("wander");
        }
        const want = clamp(R.rTo - R.rx, -rate, rate) * (Math.abs(R.rTo - R.rx) < 0.3 ? Math.abs(R.rTo - R.rx) / 0.3 : 1);
        R.rvx += (want - R.rvx) * Math.min(1, dt * 6); R.rx = clamp(R.rx + R.rvx * dt, -redge, redge);
        // Wheels touch: side by side and level. Both lose ground and are thrown apart; a cut that lands is a ram.
        if (R.clashCool <= 0 && Math.abs(diff) < C.TOUCH && Math.abs(R.rx - R.x) < 2 * H.half) {
          const dir = Math.sign(R.x - R.rx) || 1, into = -R.vx * dir, his = R.rvx * dir; let how = "clash";   // into: how fast you were closing on him; his: he on you
          if (R.t - R.cutT < C.RAM + 0.6 && his > into) { how = "ram"; R.vx = dir * D.RAM; R.rvx = -dir * 1.2; R.slow = Math.max(R.slow, C.CLASH_SLOW); R.rSlow = C.CLASH_SLOW; }
          else if (o.knock && into > 0.8 && into >= his) { how = "knock"; R.rival -= C.KNOCK; R.rSlow = C.CLASH_SLOW * 2; R.slow = Math.max(R.slow, 0.3); R.turned++; R.vx = dir * 1.5; R.rvx = -dir * D.RAM; }
          else { R.vx = dir * D.SHOVE; R.rvx = -dir * D.SHOVE; R.slow = Math.max(R.slow, C.CLASH_SLOW); R.rSlow = C.CLASH_SLOW; }
          R.yaw = clamp(R.yaw + dir * 0.2, -(H.yawMax || 0.5), H.yawMax || 0.5); R.rTo = clamp(R.rx - dir * 1.6, -redge, redge); R.boost = 0; R.clashCool = C.CLASH_GAP; R.cut = 0; R.cutT = -9;
          at("clash", { how, side: -dir });
        }
      }
      // ---- what lies in the road: one thing at a time across it, so there is always a way round
      R.spawnIn -= R.boost > 0 ? dt * 2 : dt;
      if (R.spawnIn <= 0 && R.dist < C.LEN - 6) {
        const newest = R.obs.reduce((m, ob) => Math.max(m, ob.x), 0);
        if (o.shield && R.obs.some((ob) => !ob.hit)) R.spawnIn = 0.3;                 // arrows to catch come one at a time
        else if (newest > 104 - D.ROW) R.spawnIn = 0.08;
        else {
          R.spawnIn = o.gap * (0.75 + rng() * 0.6);
          const kind = pick(o.kinds), r = D.RADIUS[kind] || 0.6, lim = D.W - r * 0.6;
          const ox = o.shield ? (rng() * 2 - 1) * (D.W - 0.8) : rng() < H.aimed ? clamp(R.x + R.vx * 0.6 + (rng() - 0.5) * 1.4, -lim, lim) : (rng() * 2 - 1) * lim;
          const ob = { ox, r, kind, x: 104, lane: ox < -1.2 ? 0 : ox > 1.2 ? 2 : 1, over: 0 }; R.obs.push(ob); at("spawn", { o: ob });
        }
      }
      for (let i = R.obs.length - 1; i >= 0; i--) {
        const ob = R.obs[i], was = ob.x;
        ob.x -= v * dt * 13;
        if (o.shield) { if (!ob.hit && ob.x <= D.AT && was > D.AT - 20) { ob.hit = true; if (Math.abs(ob.ox - R.x) < D.CATCH) { R.caught++; at("catch", { o: ob }); } else { R.miss++; at("miss", { o: ob }); } } }
        else if (!ob.hit && Math.abs(ob.x - D.AT) < zone) {
          const over = ob.r + H.half - Math.abs(ob.ox - R.x); if (over > ob.over) ob.over = over;
          if (over > D.CLIP) { ob.hit = true; R.hits++; R.slow = C.HIT_SLOW; R.boost = 0; R.vx += Math.sign(R.x - ob.ox || 1) * 1.5; at("hit", { o: ob }); }
        } else if (!ob.hit && ob.x < D.AT - zone && ob.over > 0.02 && !ob.clipped) { ob.clipped = true; R.clips++; R.slow = Math.max(R.slow, D.CLIP_SLOW); at("clip", { o: ob }); }
        if (ob.x < -12) { R.obs.splice(i, 1); at("gone", { o: ob }); }
      }
      const end = (outcome, line) => { R.over = true; R.outcome = outcome; at("end", { outcome, line }); };
      if (o.shield) {
        if (R.miss >= o.lives) end("lose", ["{m} arrows got past you.", { m: R.miss }]);
        else if (R.dist >= C.LEN) end(R.miss <= o.lives - 2 ? "win" : "close", ["You caught {c} arrows; {m} got past.", { c: R.caught, m: R.miss }]);
        return ev;
      }
      if (o.bow && R.turned >= o.turn) end("win", ["You turned {who} away.", { who: o.who }]);
      else if (!o.rival && R.hits >= o.lives) end("lose", ["You took {h} hits.", { h: R.hits }]);
      else if (R.dist >= C.LEN) {
        if (!o.rival) end(R.hits <= o.lives - 2 ? "win" : "close", ["Through, with {h} hits.", { h: R.hits }]);
        else end(R.rival < C.LEN ? "win" : "close", ["You finished {gap} lengths {where}.", { gap: Math.abs(Math.round(R.dist - R.rival)), where: R.rival < C.LEN ? "ahead" : "behind" }]);
      } else if (o.rival && R.rival >= C.LEN && R.dist < C.LEN - 6) end("lose", ["{who} finished first.", { who: o.who }]);
      return ev;
    };
    return R;
  };
})(window.K = window.K || {});
