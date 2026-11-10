/* The race's rules (lane changes, obstacles, a rival, the whip, a chariot duel's bow), lifted unchanged from the 2D game's
   ui/play.js so the 3D course plays by exactly the same rules. K.UI.RACE / raceSetup / raceRules. */
(function (K) {
  "use strict";
  const U = (K.UI = K.UI || {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const RACE = {
    LEN: 100,
    HIT_SLOW: 1.1,                 // a hit: half speed for this long (s)
    WHIP: 1.5, WHIP_COOL: 6,       // the whip: twice the speed for 1.5 s, then 6 s to recharge
    LEVEL: 2.6, TOUCH: 1.8,        // how close counts as level (the rival may cut across), and as touching
    WARN: 0.7, CUT_GAP: 4.5,       // a cut across you: its warning, and the least time between tries (s)
    CUT_RATE: 0.7,                 // how often a cut comes when one could (per second)
    RAM: 0.45,                     // contact this soon after a cut is a ram (s)
    CLASH_SLOW: 0.8, RAIL_SLOW: 1.1, CLASH_GAP: 1, BOUNCE: 0.14,
    WANDER: 2.5, WANDER_MORE: 3,   // the rival changes lane every 2.5 to 5.5 s
    // The rival's speed before the stats. With the whip (twice the speed for a fifth of the time) a
    // chariot rival must be faster for the race to stay as hard as it was: see tests/race_balance.js.
    RIVAL: 3.25, RIVAL_CONTACT: 3.5,
    // A chariot duel (content/war_fights.js): a bow shot when level with the rival (twice the reach of
    // level), which slows him and knocks him back; contact you steer into knocks him back too.
    BOW_COOL: 2.2, BOW_REACH: 2.2, BOW_SLOW: 1.2, BOW_BACK: 3, KNOCK: 4
  };
  U.RACE = RACE;
  U.raceSetup = function (t, power) {
    const chariot = !t.vehicle || t.vehicle === "chariot", rival = !!t.rival, contact = chariot && rival;
    const r0 = t.rivalSpeed || (contact ? RACE.RIVAL_CONTACT : RACE.RIVAL);
    return {
      base: t.speed || 3.3, gap: clamp(1.25 - power * 0.04, 0.8, 1.25), // seconds between obstacles
      rivalV: rival ? clamp(r0 - power * 0.03, r0 - 0.5, r0 + 0.15) : 0,
      rival, lives: t.hull || 3, kinds: t.obstacles || ["rock", "wreck"], chariot, whip: contact, contact,
      bow: contact && !!t.bow, knock: contact && !!t.knock, turn: t.turn || 3, shield: !!t.shield // a chariot duel's bow and knocks; arrows to catch
    };
  };
  // step(dt) moves the race on and returns what happened: spawn, hit, gone, warn, cut, wander,
  // bounce, clash (how: "clash", "ram" or "rails") and end (outcome, line).
  U.raceRules = function (o, rng) {
    const C = RACE, pick = (a) => a[Math.floor(rng() * a.length)];
    const R = { lane: 1, dist: 0, rival: 0, slow: 0, hits: 0, spawnIn: 1.2, t: 0, obs: [], boost: 0, cool: 0, over: false,
      rLane: 0, rSlow: 0, rWander: 3, cut: 0, cutTo: 0, cutFrom: 0, cutT: -9, cutCool: 3, clashCool: 0, prevLane: 1, bounceIn: 0, bounceTo: 1,
      turned: 0, bowCool: 0, caught: 0, miss: 0 };
    R.speed = () => (R.over ? 0 : o.base * (R.slow > 0 ? 0.5 : 1) * (R.boost > 0 ? 2 : 1));
    R.move = (d) => { if (R.over) return false; R.prevLane = R.lane; R.lane = clamp(R.lane + d, 0, 2); return true; };
    // The bow (a chariot duel): "hit" when level with the rival, "far" when not; null while it recharges.
    R.inReach = () => o.bow && Math.abs(R.rival - R.dist) < C.LEVEL * C.BOW_REACH;
    R.shoot = () => {
      if (!o.bow || R.over || R.bowCool > 0) return null;
      R.bowCool = C.BOW_COOL;
      if (!R.inReach()) return "far";
      R.rSlow = C.BOW_SLOW; R.rival -= C.BOW_BACK; R.turned++;
      return "hit";
    };
    R.whip = () => { if (!o.whip || R.over || R.boost > 0 || R.cool > 0) return false; R.boost = C.WHIP; R.cool = C.WHIP + C.WHIP_COOL; return true; };
    R.step = (dt) => {
      const ev = [], at = (type, x) => ev.push(Object.assign({ type }, x));
      if (R.over) return ev;
      R.t += dt;
      const v = R.speed();
      if (R.boost > 0) R.boost -= dt;
      if (R.cool > 0) R.cool -= dt;
      if (R.slow > 0) R.slow -= dt;
      if (R.rSlow > 0) R.rSlow -= dt;
      if (R.bowCool > 0) R.bowCool -= dt;
      R.dist += v * dt;
      if (o.rival) R.rival += o.rivalV * (R.rSlow > 0 ? 0.5 : 1) * dt * (0.94 + 0.12 * Math.sin(R.t * 0.7));
      if (o.contact) {
        // The rival drifts between lanes, and now and then cuts across you when you are level.
        const diff = R.rival - R.dist, level = Math.abs(diff) < C.LEVEL;
        if (R.cutCool > 0) R.cutCool -= dt;
        if (R.clashCool > 0) R.clashCool -= dt;
        if (R.bounceIn > 0) { R.bounceIn -= dt; if (R.bounceIn <= 0) { R.prevLane = R.lane; R.lane = R.bounceTo; at("bounce"); } }
        if (R.cut > 0) {
          R.cut -= dt;
          if (R.cut <= 0) { R.cutFrom = R.rLane; R.rLane = R.cutTo; R.cutT = R.t; at("cut"); }
        } else if (level && Math.abs(R.rLane - R.lane) === 1 && R.cutCool <= 0 && rng() < dt * C.CUT_RATE) {
          R.cut = C.WARN; R.cutTo = R.lane; R.cutCool = C.CUT_GAP; at("warn", { side: Math.sign(R.lane - R.rLane) });
        } else if ((R.rWander -= dt) <= 0) {
          R.rWander = C.WANDER + rng() * C.WANDER_MORE;
          const opts = [R.rLane - 1, R.rLane + 1].filter((l) => l >= 0 && l <= 2 && !(level && l === R.lane));
          if (opts.length) { R.rLane = pick(opts); at("wander"); }
        }
        // Contact: the same lane, level with each other. Both lose ground; you bounce back, or if he
        // has just cut across you, you are shoved a lane aside, or into the rails at the edge.
        if (R.clashCool <= 0 && R.rLane === R.lane && Math.abs(diff) < C.TOUCH) {
          let how = "clash";
          if (R.t - R.cutT < C.RAM) {
            const to = R.lane + (Math.sign(R.lane - R.cutFrom) || 1);
            if (to >= 0 && to <= 2) { R.prevLane = R.lane; R.lane = to; how = "ram"; } else { R.slow = Math.max(R.slow, C.RAIL_SLOW); how = "rails"; }
          } else { R.bounceTo = R.prevLane !== R.lane ? R.prevLane : R.lane < 2 ? R.lane + 1 : R.lane - 1; R.bounceIn = C.BOUNCE; }
          R.slow = Math.max(R.slow, C.CLASH_SLOW); R.rSlow = C.CLASH_SLOW; R.boost = 0; R.clashCool = C.CLASH_GAP; R.cut = 0;
          // In a duel, steering into him is a blow: he is knocked back off the line, and you keep most of your pace.
          if (o.knock && how === "clash") { R.rival -= C.KNOCK; R.rSlow = C.CLASH_SLOW * 2; R.slow = Math.min(R.slow, 0.3); R.turned++; how = "knock"; }
          at("clash", { how });
        }
      }
      // What is in the road comes toward you, twice as fast under the whip; never all three lanes at once.
      R.spawnIn -= R.boost > 0 ? dt * 2 : dt;
      if (R.spawnIn <= 0 && R.dist < C.LEN - 6) {
        R.spawnIn = o.gap * (0.75 + rng() * 0.6);
        const taken = R.obs.filter((ob) => ob.x > 80).map((ob) => ob.lane), free = [0, 1, 2].filter((l) => !taken.includes(l));
        if (o.shield && R.obs.some((ob) => !ob.hit)) R.spawnIn = 0.3; // arrows to catch come one at a time
        else if (free.length > 1 || !taken.length) { const ob = { lane: pick(free.length ? free : [0, 1, 2]), kind: pick(o.kinds), x: 104 }; R.obs.push(ob); at("spawn", { o: ob }); }
      }
      for (let i = R.obs.length - 1; i >= 0; i--) {
        const ob = R.obs[i];
        ob.x -= v * dt * 13;
        // Arrows to catch (trial.shield): in your lane you take one on your shield; in another, it gets past you.
        if (o.shield) { if (!ob.hit && ob.x < 26 && ob.x > 8) { ob.hit = true; if (ob.lane === R.lane) { R.caught++; at("catch", { o: ob }); } else { R.miss++; at("miss", { o: ob }); } } }
        else if (!ob.hit && ob.lane === R.lane && ob.x < 26 && ob.x > 8) { ob.hit = true; R.hits++; R.slow = C.HIT_SLOW; R.boost = 0; at("hit", { o: ob }); }
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
