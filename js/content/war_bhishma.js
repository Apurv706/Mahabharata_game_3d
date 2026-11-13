/* War storylines (PRD 18.13): Arjuna and Bhishma, shown twice.
   Day 9, Krishna takes up the wheel. Pandava side: a holding fight in the line breaking under
   Bhishma's arrows while Arjuna holds back, with a choice first (call to Arjuna, or hold your
   tongue); then the wheel, and that night, for those close to Yudhishthira or Arjuna, the brothers'
   visit to Bhishma's tent, where he names Shikhandi. Kaurava side: in Bhishma's guard as Krishna runs
   at him; step in front of the old man (he moves you aside) or stand back as he does.
   Day 10, the barrage: after Shikhandi's charge (episodes.js ep_shikhandi), the moment of the fall,
   then a6_bhishma (the bed of arrows, that night). One choice as he falls: go to him, hold the line,
   look away.
   Both are moments (ui/moments.js, K.MOMENT_KINDS): puppets staged in code over the field painting,
   no painted god. Skipped with a tap; with calm motion, a still pose and a line; headless, nothing.
   Canon (4): Krishna never strikes Bhishma (Arjuna catches him); Bhishma falls on day 10 in every life.
   Flags: bh_called_arjuna, bh_held_tongue, bh_line_held, bh_line_broke, bh_heard_shikhandi,
   bh_stepped_in, bh_stood_back, bh_went_to_him, bh_held_line, bh_looked_away. */
(function (K) {
  "use strict";
  const has = (S, f) => S.flags.includes(f);
  const free = (S) => S.alive && !has(S, "captive") && !(S.captive && S.captive.act === 6);
  const close = (S) => S.friend === "arjuna" || (S.bonds.arjuna || 0) >= 5 || (S.bonds.yudhishthira || 0) >= 5;

  // Krishna, for the wheel (no other scene needs him as a figure): dark leather, yellow cloth, the
  // Yadava peacock feather. Shikhandi at the front of Arjuna's chariot. Joined on the first scene,
  // as war_child.js does (puppet.js loads after the content).
  const PUPPETS = {
    krishna: { pronoun: "he", palette: ["#3e4f86", "#d9a531", "#2f7d55"], headgear: "peacock", item: null, stance: "hero", size: 1.1, stage: "adult" },
    shikhandi: { pronoun: "he", palette: ["#c98a52", "#2d5aa0", "#e2b55a"], headgear: "mukuta", item: "bow", stance: "archer", stage: "adult" }
  };
  K.on("scene", () => { if (K.PUPPETS) for (const k of Object.keys(PUPPETS)) if (!K.PUPPETS[k]) K.PUPPETS[k] = PUPPETS[k]; });

  // =====================================================================================
  // The staged scenes: puppets over the field painting (puppet-anim.js rigs)
  // =====================================================================================
  const JOINTS = ["head", "armF", "foreF", "armB", "foreB", "legF", "shinF", "legB", "shinB"];
  // Shapes of our own, beside the rig's POSES.
  const P = {
    reins: { rot: 4, head: 2, armF: -64, foreF: -30, armB: -58, foreB: -34, legF: -10, legB: 10 },
    halfhearted: { rot: 6, head: 14, armF: -30, foreF: -14, armB: -14, foreB: -20, legF: -8, legB: 8, tilt: 30 },
    lower: { rot: 2, head: 8, armF: -34, foreF: -14, armB: -40, foreB: -6, legF: -8, legB: 8, tilt: 74 }, // the bow lowered, palms open
    lift: { ty: 26, head: 16, legF: -84, shinF: 96, legB: 8, shinB: 98, armF: -22, foreF: -26, armB: -18, foreB: -30 },
    raise: { rot: -4, head: -8, armF: -162, foreF: -12, armB: -150, foreB: -14, legF: -16, legB: 16 },
    run1: { rot: 13, head: -4, armF: -158, foreF: -14, armB: -146, foreB: -16, legF: -52, shinF: 34, legB: 30, shinB: 52 },
    run2: { rot: 13, head: -4, armF: -158, foreF: -14, armB: -146, foreB: -16, legF: 28, shinF: 50, legB: -50, shinB: 34 },
    arun1: { rot: 17, head: 4, armF: -78, foreF: -12, armB: -64, foreB: -10, legF: -54, shinF: 34, legB: 30, shinB: 54 },
    arun2: { rot: 17, head: 4, armF: -78, foreF: -12, armB: -64, foreB: -10, legF: 28, shinF: 52, legB: -52, shinB: 34 },
    catch: { rot: 24, ty: 4, head: 10, armF: -84, foreF: -2, armB: -78, foreB: -4, legF: -44, shinF: 30, legB: 32, shinB: 22 },
    held: { rot: -10, head: -6, armF: -124, foreF: -20, armB: -112, foreB: -22, legF: -14, legB: 18, shinB: 6 },
    wheelDown: { rot: 2, head: 6, armF: -50, foreF: -36, armB: -44, foreB: -36, legF: -10, legB: 10 },
    swear: { ty: 26, head: 22, legF: -84, shinF: 96, legB: 8, shinB: 98, armF: -64, foreF: -8, armB: -52, foreB: -12 },
    stagger: { rot: -9, head: -14, armF: -14, foreF: -24, armB: 14, foreB: -12, legF: -20, legB: 20, shinB: 12, tilt: 100 },
    slack: { armF: 70, foreF: 30, armB: 40, foreB: 20, head: 22, legF: -14, shinF: 18, legB: 8, shinB: 10 }
  };
  const FLOOR = -56; // Bhishma's fall stops here, held up by the shafts
  const CSS = ".bh-stage{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}" +
    ".bh-a{position:absolute;filter:drop-shadow(0 6px 10px rgba(0,0,0,.55))}.bh-a svg{display:block}" +
    ".bh-prop{position:absolute;filter:drop-shadow(0 6px 8px rgba(0,0,0,.5))}.bh-prop svg{display:block;width:100%;height:100%;overflow:visible}" +
    ".bh-wheel{position:absolute;left:0;top:0;transform-origin:50% 50%}.bh-wheel svg{display:block;width:100%;height:100%;transition:filter .8s}" +
    ".bh-wheel.glow svg{filter:drop-shadow(0 0 5px rgba(255,214,128,.9)) drop-shadow(0 0 16px rgba(255,186,90,.5))}" +
    ".bh-stage.shake{animation:bh-shake .28s}@keyframes bh-shake{25%{transform:translate(-4px,2px)}50%{transform:translate(4px,-2px)}75%{transform:translate(-2px,1px)}}" +
    ".bh-stage .fly-arrow{z-index:4}" +
    // Krishna's light: a soft gold and blue aura behind the figure and a ring of light behind the head,
    // stronger while he holds the wheel; a slow breath in it while things move, still otherwise.
    ".bh-aura,.bh-nimbus{position:absolute;left:0;top:0;border-radius:50%;pointer-events:none;opacity:.6;transition:opacity 1s ease}" +
    ".bh-aura{background:radial-gradient(closest-side,rgba(255,246,210,.85),rgba(255,222,140,.6) 34%,rgba(255,206,120,.34) 58%,rgba(140,185,255,.3) 78%,rgba(140,185,255,0))}" +
    ".bh-nimbus{background:radial-gradient(closest-side,rgba(255,250,225,.9),rgba(255,230,160,.7) 48%,rgba(255,206,110,.6) 64%,rgba(160,200,255,.45) 80%,rgba(160,200,255,0))}" +
    ".bh-glow-on .bh-aura,.bh-glow-on .bh-nimbus{opacity:1}" +
    ".bh-a.bh-divine{filter:drop-shadow(0 0 3px rgba(255,230,160,.8)) drop-shadow(0 6px 10px rgba(0,0,0,.45));transition:filter 1s ease}" +
    ".bh-glow-on .bh-a.bh-divine{filter:drop-shadow(0 0 4px rgba(255,236,170,.95)) drop-shadow(0 0 12px rgba(255,214,128,.6)) drop-shadow(0 6px 10px rgba(0,0,0,.4))}" +
    ".bh-breath .bh-aura{animation:bh-breath 3.2s ease-in-out infinite}@keyframes bh-breath{50%{filter:brightness(1.18) saturate(1.1)}}" +
    "html.calm .bh-breath .bh-aura{animation:none}html.calm .bh-aura,html.calm .bh-nimbus{transition:none}";
  // His peacock feather, drawn large enough to read: set in the knot of hair on his head joint, in the
  // puppet's own units, so it turns and leans with his head. It covers the rig's small one.
  const FEATHER = '<g class="bh-feather">' +
    '<path d="M57.4 33 Q56.6 20 61.6 9" stroke="#24120a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M57.4 33 Q56.6 20 61.6 9" stroke="#efe2c0" stroke-width="1" fill="none" stroke-linecap="round"/>' +
    '<g stroke="#3f8a5a" stroke-width=".55" opacity=".9" fill="none">' +
    [30, 26.5, 23, 19.5, 16].map((y) => { const x = 57.1 + (33 - y) * 0.16; return '<path d="M' + x.toFixed(1) + " " + y + " l-3.4 -3.2 M" + x.toFixed(1) + " " + y + ' l3.2 -2.6"/>'; }).join("") + "</g>" +
    '<g transform="rotate(14 62.4 8)">' +
    '<path d="M62.4 -2.6 C68.6 -1.6 70 7 68.4 12 C67 16.4 64.6 18.4 62.4 18.6 C60.2 18.4 57.8 16.4 56.4 12 C54.8 7 56.2 -1.6 62.4 -2.6 Z" fill="#2c6e4a" stroke="#24120a" stroke-width=".8"/>' +
    '<g stroke="#5fa86e" stroke-width=".45" opacity=".8">' + [-50, -25, 0, 25, 50, 155, 180, 205].map((a) => { const r = a * Math.PI / 180; return '<path d="M62.4 8 L' + (62.4 + 7.4 * Math.sin(r)).toFixed(1) + " " + (8 - 10.4 * Math.cos(r)).toFixed(1) + '"/>'; }).join("") + "</g>" +
    '<ellipse cx="62.4" cy="8.6" rx="4.5" ry="6.4" fill="#c9a13a"/><ellipse cx="62.4" cy="9" rx="3.4" ry="4.9" fill="#1f8f8a"/>' +
    '<ellipse cx="62.4" cy="9.6" rx="2.4" ry="3.5" fill="#1f4fb0"/><ellipse cx="62.4" cy="10.6" rx="1.3" ry="1.9" fill="#0b1d45"/></g></g>';
  // Krishna on a stage: the feather on his head, and his light behind him, following the figure.
  function divine(S, o) {
    const head = o.svg.querySelector(".head"), inner = head && (head.querySelector(":scope > g") || head);
    if (inner) inner.insertAdjacentHTML("beforeend", FEATHER);
    o.svg.style.overflow = "visible"; o.el.classList.add("bh-divine");
    const aura = document.createElement("i"), nimbus = document.createElement("i");
    aura.className = "bh-aura"; nimbus.className = "bh-nimbus";
    S.host.insertBefore(nimbus, S.host.firstChild); S.host.insertBefore(aura, S.host.firstChild); // behind every figure
    if (S.moving) S.host.classList.add("bh-breath");
    const ar = S.fh * 1.05, nr = S.fh * 0.3;
    Object.assign(aura.style, { width: ar * 0.82 + "px", height: ar * 1.16 + "px" }); Object.assign(nimbus.style, { width: nr + "px", height: nr + "px" });
    const put = () => {
      const b = S.at(o, "pp-body", 0.42), h = S.at(o, "head", 0.55);
      aura.style.transform = "translate(" + (b.x - ar * 0.41) + "px," + (b.y - ar * 0.58) + "px)";
      nimbus.style.transform = "translate(" + (h.x - nr / 2) + "px," + (h.y - nr / 2) + "px)";
    };
    const loop = () => { if (!S.alive()) return; put(); if (S.moving) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    return { strong: (on) => S.host.classList.toggle("bh-glow-on", !!on) };
  }
  const WHEEL = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="none" stroke="#24120a" stroke-width="11"/><circle cx="50" cy="50" r="44" fill="none" stroke="#8a5a2c" stroke-width="8"/>' +
    '<circle cx="50" cy="50" r="44" fill="none" stroke="#e2b55a" stroke-width="1.2" stroke-dasharray="3 6"/><g stroke="#24120a" stroke-width="5.4">' +
    [0, 30, 60, 90, 120, 150].map((a) => '<path d="M50 50 L' + (50 + 42 * Math.cos(a * Math.PI / 180)).toFixed(1) + " " + (50 + 42 * Math.sin(a * Math.PI / 180)).toFixed(1) + ' M50 50 L' + (50 - 42 * Math.cos(a * Math.PI / 180)).toFixed(1) + " " + (50 - 42 * Math.sin(a * Math.PI / 180)).toFixed(1) + '"/>').join("") +
    '</g><g stroke="#a8743a" stroke-width="3">' + [0, 30, 60, 90, 120, 150].map((a) => '<path d="M' + (50 + 42 * Math.cos(a * Math.PI / 180)).toFixed(1) + " " + (50 + 42 * Math.sin(a * Math.PI / 180)).toFixed(1) + ' L' + (50 - 42 * Math.cos(a * Math.PI / 180)).toFixed(1) + " " + (50 - 42 * Math.sin(a * Math.PI / 180)).toFixed(1) + '"/>').join("") +
    '</g><circle cx="50" cy="50" r="10" fill="#6b4422" stroke="#24120a" stroke-width="2"/><circle cx="50" cy="50" r="3.5" fill="#d9a53a"/></svg>';
  // A war chariot cut from leather, facing right: a deck with a rail, one great wheel, the pole.
  const CHARIOT = '<svg viewBox="0 0 140 90" aria-hidden="true"><path d="M118 50 L140 58" stroke="#24120a" stroke-width="4.4" stroke-linecap="round"/><path d="M118 50 L140 58" stroke="#8a5a2c" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M22 26 L22 -44" stroke="#5a3418" stroke-width="3"/><path d="M22 -44 L48 -38 L22 -30 Z" fill="#c8402c" stroke="#24120a" stroke-width="1"/>' +
    '<path d="M12 26 L120 26 L112 58 L22 58 Z" fill="#7a4e24" stroke="#24120a" stroke-width="2"/><path d="M12 26 L12 6 Q14 2 18 6 L20 26 M114 26 L120 8 Q123 5 124 10 L120 26" fill="none" stroke="#5a3418" stroke-width="3"/>' +
    '<path d="M20 34 H112 M24 50 H108" stroke="#e2b55a" stroke-width="1.4" stroke-dasharray="4 3"/>' +
    '<g transform="translate(40 36) scale(.52)">' + WHEEL.replace(/^<svg[^>]*>|<\/svg>$/g, "") + "</g></svg>";
  // A shaft standing in a body or in the earth: tip buried at 0, feathers len behind, along +x.
  const SHAFT = (len, w) => '<path d="M0 0 L' + (-len).toFixed(1) + ' 0" stroke="#24120a" stroke-width="' + (w + 1.6).toFixed(1) + '" stroke-linecap="round"/><path d="M0 0 L' + (-len).toFixed(1) + ' 0" stroke="#e6c98c" stroke-width="' + w.toFixed(1) + '" stroke-linecap="round"/>' +
    '<path d="M' + (-len).toFixed(1) + ' 0 l-' + (w * 3).toFixed(1) + ' -' + (w * 1.8).toFixed(1) + ' l' + w.toFixed(1) + ' ' + (w * 1.8).toFixed(1) + ' l-' + w.toFixed(1) + ' ' + (w * 1.8).toFixed(1) + ' Z" fill="#c8402c" stroke="#24120a" stroke-width=".6"/>';
  const NS = "http://www.w3.org/2000/svg";

  // The stage: a band across the moment, its ground where the figures of a moment stand.
  function stage(el) {
    const U = K.UI;
    if (!document.getElementById("bh-css")) { const st = document.createElement("style"); st.id = "bh-css"; st.textContent = CSS; document.head.appendChild(st); }
    const host = document.createElement("div"); host.className = "bh-stage"; host.setAttribute("aria-hidden", "true");
    el.insertBefore(host, el.querySelector(".mo-text"));
    const W = el.clientWidth, H = el.clientHeight, up = H > W * 1.15;
    const fh = Math.round(Math.min(up ? 150 : 230, H * 0.3)), gb = Math.round(H * (up ? 0.3 : 0.38));
    const bw = Math.min(W, up ? W : Math.max(720, H * 1.4)), b0 = (W - bw) / 2;
    const moving = U.motion() && typeof U.rig === "function";
    const alive = () => host.isConnected && !el.classList.contains("out");
    const S = {
      U, host, W, H, fh, gb, moving, alive, up,
      gy: H - gb, // the ground line, from the top
      X: (f) => b0 + bw * f,
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
      tween(ms, fn) { return new Promise((res) => { const t0 = performance.now(); const f = (now) => { if (!alive()) return res(); const t = Math.min(1, (now - t0) / ms); fn(t); if (t < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); },
      // A figure standing at x (centre), lifted above the ground by lift; base: its rig's resting pose.
      actor(spec, x, lift, flip, base) {
        const w = Math.round(fh * 120 / 210), a = document.createElement("span");
        a.className = "bh-a"; a.style.left = (x - w / 2) + "px"; a.style.bottom = (gb + (lift || 0) - fh * 0.04) + "px";
        a.innerHTML = U.puppet(spec, { h: fh, pose: moving ? "live" : "stand", flip });
        host.appendChild(a);
        const svg = a.querySelector("svg"), o = { el: a, svg, x, lift: lift || 0, w, rig: moving ? U.rig(svg, a, base || "stand") : null };
        o.place = (nx, nl) => { o.x = nx; if (nl != null) o.lift = nl; a.style.left = (nx - w / 2) + "px"; a.style.bottom = (gb + o.lift - fh * 0.04) + "px"; };
        return o;
      },
      prop(html, x, w, h, lift) { const p = document.createElement("span"); p.className = "bh-prop"; p.innerHTML = html; Object.assign(p.style, { left: (x - w / 2) + "px", bottom: (gb + (lift || 0)) + "px", width: w + "px", height: h + "px" }); host.appendChild(p); return p; },
      // Where a part of a figure is, inside the stage.
      at(o, part, fy) { const s = host.getBoundingClientRect(), r = (o.svg.querySelector("." + part) || o.svg).getBoundingClientRect(); return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height * (fy == null ? 0.5 : fy) }; }
    };
    return S;
  }
  // Aim a figure at a pose: on its springs when it moves, set straight on the joints when it does not.
  function pose(o, p, k, z, fall) {
    if (o.rig) { const r = o.rig; for (const key in r.t) if (key !== "dx") r.t[key] = p[key] || 0; if (k) r.k = k; if (z != null) r.z = z; r.pose = "own"; r.kick({}); return; }
    const body = o.svg.querySelector(".pp-body"), f = fall || 0, th = ((p.rot || 0) + f) * Math.PI / 180;
    const ptx = f ? 74 * Math.sin(th) : 0, pty = f ? 74 - 74 * Math.cos(th) : 0;
    if (body) body.style.transform = "translate(" + ((p.tx || 0) + ptx) + "px," + ((p.ty || 0) + pty) + "px) rotate(" + ((p.rot || 0) + f) + "deg)";
    for (const j of JOINTS) { const g = o.svg.querySelector("." + j); if (g) g.style.transform = "rotate(" + (p[j] || 0) + "deg)"; }
  }
  // An arrow left standing in a figure: placed in its body's own frame, so it falls with it.
  function stick(o, p, from, len) {
    const body = o.svg.querySelector(".pp-body"), m = body && body.getScreenCTM && body.getScreenCTM();
    if (!m) return;
    const s = o.el.parentNode.getBoundingClientRect(), inv = m.inverse(), pt = o.svg.createSVGPoint();
    const loc = (x, y) => { pt.x = x + s.left; pt.y = y + s.top; return pt.matrixTransform(inv); };
    const d = Math.hypot(p.x - from.x, p.y - from.y) || 1, a = loc(p.x + (p.x - from.x) / d * 3, p.y + (p.y - from.y) / d * 3), b = loc(p.x - (p.x - from.x) / d * 20, p.y - (p.y - from.y) / d * 20);
    stickAt(o, a.x, a.y, Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI, len);
  }
  function stickAt(o, x, y, deg, len) {
    const body = o.svg.querySelector(".pp-body"); if (!body) return;
    const g = document.createElementNS(NS, "g"); g.setAttribute("class", "bh-shaft");
    g.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + deg.toFixed(1) + ")"); g.innerHTML = SHAFT(len || 30, 2);
    body.appendChild(g);
  }
  // A shaft driven into the earth at (x, y) in the stage, leaning back along the line it came.
  function inEarth(S, x, y, deg, len) {
    const L = len || S.fh * 0.2, sv = document.createElementNS(NS, "svg");
    sv.setAttribute("class", "bh-earth"); sv.setAttribute("width", L * 2.2); sv.setAttribute("height", L * 2.2); sv.setAttribute("viewBox", (-L * 1.1) + " " + (-L * 1.1) + " " + L * 2.2 + " " + L * 2.2);
    Object.assign(sv.style, { position: "absolute", left: (x - L * 1.1) + "px", top: (y - L * 1.1) + "px", overflow: "visible", zIndex: 1 });
    sv.innerHTML = '<g transform="rotate(' + deg + ')">' + SHAFT(L, Math.max(1.6, S.fh / 80)) + "</g>";
    S.host.appendChild(sv); return sv;
  }

  // ---------- Day 9: Krishna takes up the wheel ----------
  async function stageWheel(el) {
    const S = stage(el), U = S.U, fh = S.fh;
    const chW = fh * 0.95, chH = chW * 90 / 140, deck = chH * (1 - 26 / 90) - fh * 0.02;
    S.prop(CHARIOT, S.X(0.2), chW, chH);
    const ar = S.actor(U.puppetFor("arjuna"), S.X(0.15), deck, false, "stand");
    const kr = S.actor(PUPPETS.krishna, S.X(0.27), deck, false, "stand");
    const bh = S.actor(U.puppetFor("bhishma"), S.X(0.82), 0, true, "bowready");
    const light = divine(S, kr);
    // The wheel lies on the field, broken off some chariot, until he lifts it.
    const ws = fh * 0.42, wheel = document.createElement("div"); wheel.className = "bh-wheel"; wheel.innerHTML = WHEEL;
    Object.assign(wheel.style, { width: ws + "px", height: ws + "px" }); S.host.insertBefore(wheel, kr.el); // behind him, so his head and feather show in front of it
    let wx = S.X(0.44), wy = S.gy - ws * 0.12, wsy = 0.3, spin = 0;
    const putWheel = () => { wheel.style.transform = "translate(" + (wx - ws / 2) + "px," + (wy - ws / 2) + "px) rotate(" + spin + "deg) scaleY(" + wsy + ")"; };
    putWheel();
    const hand = () => { const a = S.at(kr, "foreF", 0.12), b = S.at(kr, "foreB", 0.12); return { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) }; };
    if (!S.moving) { // a still: Krishna with the wheel raised, Arjuna's arms about him, the old man's bow lowered
      kr.place(S.X(0.6), 0); ar.place(S.X(0.52), 0); pose(kr, P.raise); pose(ar, P.catch); pose(bh, P.lower);
      wheel.classList.add("glow"); light.strong(true); requestAnimationFrame(() => { const h = hand(); wx = h.x; wy = h.y - ws * 0.36; wsy = 1; putWheel(); });
      return;
    }
    pose(ar, P.halfhearted, 300, 0.6); pose(kr, P.reins, 300, 0.6);
    // Bhishma's arrows into the Pandava line.
    for (let i = 0; i < 3 && S.alive(); i++) {
      bh.rig.set("draw", 900, 0.7); await S.wait(170); bh.rig.set("loose", 1600, 0.3); bh.rig.kick({ rot: -50, armB: -200 });
      const from = S.at(bh, "foreF", 0.45), gx = S.X(0.36 + i * 0.05), gy = S.gy + 2;
      U.flyArrow(S.host, from, { x: gx, y: gy }, fh * 0.35, 420).then(() => { if (S.alive()) inEarth(S, gx, gy - 2, 205 + i * 6); });
      await S.wait(330);
    }
    bh.rig.set("bowready", 600, 0.5);
    if (!S.alive()) return;
    // Krishna leaps down from the chariot.
    pose(kr, POSE("jump"), 700, 0.5);
    const x0 = kr.x, x1 = S.X(0.4);
    await S.tween(460, (t) => kr.place(x0 + (x1 - x0) * t, deck * (1 - t) + fh * 0.35 * 4 * t * (1 - t)));
    pose(kr, P.lift, 900, 0.55); kr.rig.kick({ ty: 120 }); U.flingBits(S.host, "flake", { x: x1, y: S.gy }, 6, 30, "#b08a5a", true);
    await S.wait(320); if (!S.alive()) return;
    // He lifts the wheel above his head; it catches a little light.
    const w0 = { x: wx, y: wy };
    pose(kr, P.raise, 420, 0.6);
    await S.tween(420, (t) => { const h = hand(); wx = w0.x + (h.x - w0.x) * t; wy = w0.y + (h.y - ws * 0.36 - w0.y) * t; wsy = 0.3 + 0.7 * t; putWheel(); });
    wheel.classList.add("glow"); light.strong(true);
    await S.wait(160); if (!S.alive()) return;
    // He runs at the old man. The old man lowers his bow, and opens his hands.
    const follow = () => { const h = hand(); wx = h.x; wy = h.y - ws * 0.36; putWheel(); };
    let step = 0; const legs = setInterval(() => { if (!S.alive()) return clearInterval(legs); pose(kr, step++ % 2 ? P.run2 : P.run1, 900, 0.55); }, 170);
    const kx0 = kr.x, kx1 = S.X(0.59);
    setTimeout(() => { if (S.alive()) { pose(bh, P.lower, 260, 0.75); bh.rig.kick({ head: 120 }); } }, 380);
    // Arjuna leaps down after him, and runs faster.
    setTimeout(async () => {
      if (!S.alive()) return;
      pose(ar, POSE("jump"), 700, 0.5);
      const a0 = ar.x, a1 = S.X(0.34);
      await S.tween(380, (t) => ar.place(a0 + (a1 - a0) * t, deck * (1 - t) + fh * 0.3 * 4 * t * (1 - t)));
      let s2 = 0; const al = setInterval(() => { if (!S.alive() || ar.caught) return clearInterval(al); pose(ar, s2++ % 2 ? P.arun2 : P.arun1, 900, 0.55); }, 140);
      await S.tween(1250, (t) => ar.place(a1 + (S.X(0.5) - a1) * (1 - (1 - t) * (1 - t)), 0));
      ar.caught = true;
    }, 520);
    await S.tween(1900, (t) => { kr.place(kx0 + (kx1 - kx0) * Math.min(1, t * 1.05), 0); spin = Math.sin(t * 9) * 4; follow(); });
    clearInterval(legs); if (!S.alive()) return;
    // Caught from behind: he is held, and stops.
    pose(ar, P.catch, 1100, 0.5); ar.rig.kick({ rot: 140 });
    pose(kr, P.held, 900, 0.45); kr.rig.kick({ rot: -220, head: -200 }); U.rigFreeze(70);
    const tr = setInterval(() => { if (!S.alive()) return clearInterval(tr); follow(); }, 16);
    await S.wait(1100); if (!S.alive()) return clearInterval(tr);
    // He lowers the wheel. Arjuna kneels at his feet and swears.
    pose(kr, P.wheelDown, 300, 0.6); wheel.classList.remove("glow"); light.strong(false);
    await S.wait(500); pose(ar, P.swear, 380, 0.6);
    await S.wait(1300); clearInterval(tr);
  }
  const POSE = (n) => (K.UI.RIG_POSES || {})[n] || {};

  // ---------- Day 10: the barrage ----------
  async function stageFall(el) {
    const S = stage(el), U = S.U, fh = S.fh;
    const chW = fh * 0.95, chH = chW * 90 / 140, deck = chH * (1 - 26 / 90) - fh * 0.02;
    S.prop(CHARIOT, S.X(0.19), chW, chH);
    const ar = S.actor(U.puppetFor("arjuna"), S.X(0.13), deck, false, "bowready");
    const sh = S.actor(PUPPETS.shikhandi, S.X(0.26), deck, false, "bowready");
    const bh = S.actor(U.puppetFor("bhishma"), S.X(S.up ? 0.58 : 0.66), 0, true, "bowready"); // room to fall, on his right
    const bx = bh.x;
    // The bed: shafts in the earth behind his feet, along the line he falls.
    // Each stands steeply, leaning back toward Arjuna, its feathers just under the line of his body.
    const rise = Math.tan((90 + FLOOR) * Math.PI / 180);
    const BED = [0.16, 0.28, 0.4, 0.52, 0.64, 0.76].map((f, i) => { const a = 62 + i * 2, d = fh * f, L = Math.max(fh * 0.12, d * rise / Math.sin(a * Math.PI / 180) * 0.95);
      return { x: bx + d + L * Math.cos(a * Math.PI / 180) * 0.6, y: S.gy - 1, deg: a, len: L }; });
    if (!S.moving) { // a still: the old man held tilted on the shafts, and a line
      pose(bh, P.slack, 0, 0, FLOOR); pose(ar, POSE("loose")); pose(sh, POSE("stand"));
      BED.forEach((b) => inEarth(S, b.x, b.y, b.deg, b.len));
      [[64, 84, 176], [56, 96, 186], [62, 104, 170], [58, 120, 182], [66, 76, 192], [60, 140, 178], [54, 110, 166], [63, 92, 196]].forEach(([x, y, a]) => stickAt(bh, x, y, a, 28));
      return;
    }
    const r = bh.rig;
    await S.wait(250);
    // He sees Shikhandi, and lowers his bow.
    pose(bh, P.lower, 300, 0.7); r.kick({ head: 160 });
    await S.wait(500);
    const N = 11; let bed = 0;
    for (let v = 0; v < N && S.alive(); v++) {
      const heavy = v % 3 === 2, gap = Math.max(260, 560 - v * 34);
      ar.rig.set("draw", 1100, 0.7); await S.wait(Math.max(110, 170 - v * 6)); if (!S.alive()) return;
      ar.rig.set("loose", 1700, 0.3); ar.rig.kick({ rot: -60, armB: -220 });
      const from = S.at(ar, "foreF", 0.45), n = heavy ? 3 : 2;
      for (let i = 0; i < n; i++) {
        setTimeout(() => {
          if (!S.alive()) return;
          const box = bh.svg.querySelector(".pp-body").getBoundingClientRect(), s = S.host.getBoundingClientRect();
          const p = { x: box.left - s.left + box.width * (0.36 + Math.random() * 0.3), y: box.top - s.top + box.height * (0.18 + Math.random() * 0.5) };
          U.flyArrow(S.host, from, p, fh * 0.12, 300 + Math.random() * 60).then(() => {
            if (!S.alive()) return;
            stick(bh, p, from, 26 + Math.random() * 6);
            if (!r.falling) r.kick({ rot: -40 - v * 4, head: -90, armF: 60 });
            if (heavy && i === n - 1) {
              U.rigFreeze(80); U.flingBits(S.host, "flake", p, 9, 30, "#8a3a2a");
              S.host.classList.remove("shake"); void S.host.offsetWidth; S.host.classList.add("shake");
            }
          });
        }, i * 70);
      }
      // From the fourth volley, shafts go through and stand in the earth behind him: the bed.
      if (v >= 3 && bed < BED.length) {
        const b = BED[bed++];
        U.flyArrow(S.host, from, { x: b.x, y: b.y }, fh * 0.1, 380).then(() => { if (S.alive()) inEarth(S, b.x, b.y, b.deg, b.len); });
      }
      if (v === 5) { r.tremble = 1.4; pose(bh, P.stagger, 380, 0.5); r.t.dx = fh * 0.05; }
      if (v === 8) { r.tremble = 2.4; r.t.dx = fh * 0.09; }
      await S.wait(gap);
    }
    if (!S.alive()) return;
    while (bed < BED.length) { const b = BED[bed++]; inEarth(S, b.x, b.y, b.deg, b.len); }
    // He sinks backward onto the shafts, and does not reach the ground.
    r.tremble = 0; r.fallDown(FLOOR);
    ar.rig.set("bowready", 500, 0.5);
    await S.wait(620); if (!S.alive()) return;
    U.flingBits(S.host, "flake", { x: bx + fh * 0.35, y: S.gy }, 12, fh * 0.6, "#b08a5a", true);
    await S.wait(900);
    ar.rig.set("slump", 300, 0.6); sh.rig && sh.rig.set("slump", 300, 0.6);
  }

  K.MOMENT_KINDS = K.MOMENT_KINDS || {};
  // The wheel as a living painting (owner, 5 November: war_wheel.mp4, five painted beats, 10 s), where video
  // plays; the puppets staged over the field painting otherwise (calm motion, data saver, a clip that fails).
  const wheelPuppets = { art: "fight_war_field", playAt: 250, ms: 8200, play: (el) => { stageWheel(el).catch(() => {}); } };
  // (owner, 8 November: "does the Krishna taking the wheel sequence come twice?" It did: the moment opened on the wheel
  // painting, Krishna with the wheel raised, under the title, and then the clip told it all again from the chariot. Now it
  // opens on the clip's own first frame, the chariot, with no title (open), the clip plays on from it, and the title comes
  // once, over the last beat; the moment waits for the clip's end. The wheel painting stays the kept card's picture.)
  const wheelClip = {
    art: "war_wheel", open: "war_wheel_open", playAt: 0, ms: 13200, clip: true, // 10 s of clip, then its last beat held under the title
    play: (el) => {
      const art = el.querySelector(".mo-art"); if (!art) return;
      const v = document.createElement("video");
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = "auto";
      v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
      v.className = "mo-clip"; v.dataset.want = "1";
      if (K.UI.clipSrc) K.UI.clipSrc(v, "war_wheel"); else v.src = "video/war_wheel.mp4"; // (on Safari, fetched whole and played from memory)
      let fell = false;
      const fallback = () => { // the clip will not play: the puppets, over the field
        if (fell) return; fell = true;
        v.remove(); el.classList.remove("clip");
        art.style.setProperty("--img", "url('" + K.UI.bgUrl("fight_war_field") + "')");
        stageWheel(el).catch(() => {});
      };
      v.addEventListener("error", fallback);
      v.addEventListener("playing", () => v.classList.add("on"));
      v.addEventListener("ended", () => { el.dataset.endedAt = String(performance.now()); el.classList.add("ended"); }); // the title over the last beat (Arjuna at his feet)
      art.appendChild(v); el.classList.add("clip");
      if (v.src) { try { const p = v.play(); if (p && p.catch) p.catch(fallback); } catch (e) { fallback(); } }
      setTimeout(() => { if (v.isConnected && !v.classList.contains("on")) fallback(); }, 3500); // never started: the puppets
    }
  };
  K.MOMENT_KINDS.bh_wheel = () => Object.assign({ theme: "milestone", title: "Krishna takes up the wheel", line: "He swore not to fight. He runs at the grandsire with a chariot wheel." },
    K.UI && K.UI.hasVideo && K.UI.hasVideo("war_wheel") && K.UI.living && K.UI.living() ? wheelClip : wheelPuppets);
  K.MOMENT_KINDS.bh_fall = () => ({ theme: "farewell", title: "The grandsire falls", line: "Arjuna's arrows hold him off the ground.",
    art: "fight_war_sunset", playAt: 250, ms: 9400, play: (el) => { stageFall(el).catch(() => {}); } });
  K.bhStage = { wheel: stageWheel, fall: stageFall }; // for the screenshot steps

  // =====================================================================================
  // The fight: the line under Bhishma's arrows on the ninth day
  // =====================================================================================
  K.encounter({
    id: "bh_line9", title: "The line under Bhishma", caption: "Five rounds", hold: 5, plan: "bhishma", /* (the 3D fight: three passes, then bar his way: js/ui/battle/sim.js) */ lethal: false, spare: false, art: "war_bhishma",
    allies: (S) => K.warAllies(S), callHelp: K.warHelp,
    flee: { tags: ["retreat"], fx: { flag: "bh_line_broke" }, text: "You fall back with the rest. The grandsire's arrows follow you a long way." },
    enemies: [K.foe("Bhishma", 10, { abilities: ["arrows", "aimed", "volley"], hero: true, person: "bhishma", hp: 900, atk: 10 }), K.foe("Kaurava chariot-warrior", 5, { abilities: ["strike", "arrows"] })],
    intro: "The grandsire's arrows come down on your stretch of the line like hail. Behind you, Arjuna's chariot does not come forward.",
    holdText: "Your stretch of the line is still standing. Behind you, Krishna stops the chariot.",
    beats: [{ round: 3, text: "Arjuna looses at his grandfather at last, gently, and the old man cuts the arrows out of the air.", run: (B) => B.living("friends").forEach((u) => B.status(u, "exposed", 1)) }],
    win: { fx: { flag: "bh_line_held", rep: { pandava: 1 }, journal: "On the ninth day you held your stretch of the line under Bhishma's arrows." }, text: "You are still standing where you were at dawn. Few others are." },
    lose: { fx: { flag: "bh_line_broke", injury: "scar" }, text: "The line breaks where you stand, and an arrow opens your arm to the bone." }
  });
  Object.assign(K.COMMAND_FIGHT_BG, { bh_line9: "fight_between_lines" });

  K.scenes([
    // ---------- Day 9, Pandava: the line, and the wheel ----------
    {
      id: "bh_day9", act: 6, age: 44, war: true, away: true, when: (S) => S.side === "pandava" && free(S), skipTo: "a6_bhishma", next: "bh_wheel",
      art: "war_bhishma", place: "Kurukshetra · day 9", caption: "The grandsire's arrows", title: "Arjuna holds back",
      body: (S) => ["Bhishma cuts through the Pandava army. Arjuna's arrows keep missing his grandfather.",
        S.friend === "arjuna" ? { memory: "You have known him since you were ten. You have never seen him miss like this." } : null],
      choices: [
        { id: "call", t: "Shout to Arjuna to fight", combat: "bh_line9", fx: { flag: "bh_called_arjuna", rep: { pandava: 1 } }, hint: "Then hold the line" },
        { id: "quiet", t: "Hold the line", combat: "bh_line9", fx: { flag: "bh_held_tongue" } }
      ]
    },
    {
      id: "bh_wheel", act: 6, age: 44, war: true, away: true, next: "a6_bhishma", enter: { moment: { kind: "bh_wheel" } },
      art: "war_bhishma", place: "Kurukshetra · day 9", caption: "The wheel", title: "Krishna takes up the wheel",
      body: (S) => ["Krishna, sworn not to fight, runs at Bhishma with a chariot wheel until Arjuna drags him back.",
        has(S, "bh_called_arjuna") ? "Arjuna does not look at you. He heard you." : null],
      choices: [
        { id: "tent", t: "Go to the grandsire's tent tonight", req: close,
          fx: { flag: "bh_heard_shikhandi", bond: { bhishma: 1 }, journal: "On the ninth night you went with the Pandava brothers to Bhishma's tent, and heard him tell them how he could be brought down." },
          text: "\"I will not raise my bow against Shikhandi, who was born a woman,\" he tells the brothers. \"Put him in front of Arjuna.\"" },
        { id: "fires", t: "Stay at the fires", text: "Late in the night word goes round the fires that the brothers have gone to the grandsire's tent, unarmed." }
      ]
    },
    // ---------- Day 9, Kaurava: in the grandsire's guard ----------
    {
      id: "bh_guard9", act: 6, age: 44, war: true, away: true, when: (S) => S.side === "kaurava" && free(S), skipTo: "a6_bhishma", next: "a6_bhishma", enter: { moment: { kind: "bh_wheel" } },
      art: "war_bhishma", place: "Kurukshetra · day 9", caption: "In the grandsire's guard", title: "The wheel",
      body: ["Krishna, sworn not to fight, runs at Bhishma with a chariot wheel."],
      choices: [
        { id: "step", t: "Step in front of the old man", fx: { flag: "bh_stepped_in", bond: { bhishma: 1 }, rep: { kuru: 1 } },
          text: "You put yourself between them, and Bhishma moves you aside like a child. \"Not you. Let him come.\"" },
        { id: "back", t: "Stand back, as he does", fx: { flag: "bh_stood_back" }, text: "He lowers his bow, and so do you. He opens his hands to the man running at him." }
      ],
      after: ["Arjuna drags Krishna back by the tenth step, and the day goes on."]
    },
    // ---------- Day 10: the barrage (after Shikhandi's charge) ----------
    {
      id: "bh_fall", act: 6, age: 44, war: true, away: true, when: (S) => S.side !== "neutral" && free(S), skipTo: "a6_bhishma", next: "a6_bhishma", enter: { moment: { kind: "bh_fall" } },
      art: "scene_shikhandi", place: "Kurukshetra · day 10", caption: "The arrows", title: "The grandsire falls",
      body: (S) => [S.side === "kaurava" ? "Between you and him are more arrows than you can count."
        : has(S, "held_for_shikhandi") ? "You are at Shikhandi's wheel, close enough to hear Arjuna's bowstring."
        : has(S, "refused_shikhandi") ? "You are at the back of the line. The arrows go over your head."
        : "Bhishma will not raise his bow against Shikhandi. Arjuna's arrows bring him down."],
      choices: [
        { id: "go", t: (S) => (S.side === "kaurava" ? "Fight your way to him" : "Go to him"), fx: { flag: "bh_went_to_him", bond: { bhishma: 1 }, memory: ["bhishma", "You were one of the first to reach him when he fell."] },
          text: (S) => (S.side === "kaurava"
            ? "You are the first of his guard to kneel by him. He asks for a pillow, and Arjuna sets three arrows under his head."
            : "You reach him while the arrows are still falling. He asks for a pillow, and Arjuna sets three arrows under his head.") },
        { id: "hold", t: "Hold the line", fx: { flag: "bh_held_line", duty: { court: 1 } }, text: "The fighting goes on around him until dark, as if he were not there." },
        { id: "away", t: "Look away", fx: { flag: "bh_looked_away", duty: { conscience: 1 } }, text: "You look at the ground until the shouting changes. When you look up, he is lying on the arrows." }
      ]
    }
  ]);

  // Where they come: day 9 after Iravan (day 8) and before the ninth night's promotion; the fall
  // straight after Shikhandi's charge on the tenth morning; then the bed of arrows that night.
  {
    const L = (K.BEFORE.a6_bhishma || []).filter((x) => !/^bh_/.test(x));
    const night = L.indexOf("cmd_promotion_1") >= 0 ? L.indexOf("cmd_promotion_1") : L.indexOf("ep_shikhandi") >= 0 ? L.indexOf("ep_shikhandi") : L.length;
    L.splice(night, 0, "bh_day9", "bh_guard9");
    const sh = L.indexOf("ep_shikhandi");
    L.splice(sh >= 0 ? sh + 1 : L.length, 0, "bh_fall");
    K.BEFORE.a6_bhishma = L;
  }
  // The bed of arrows that night does not tell the fall again to those who saw it.
  const bed = K.SCENES.a6_bhishma;
  if (bed && Array.isArray(bed.witness)) { const w = bed.witness; bed.witness = (S) => (S.seen.includes("bh_fall") ? w.slice(1) : w); }
  // Shikhandi's charge, for those who heard the grandsire name him.
  const ep = K.SCENES.ep_shikhandi;
  if (ep && Array.isArray(ep.body)) { const b = ep.body; ep.body = (S) => b.concat(has(S, "bh_heard_shikhandi") ? [{ memory: "You heard the grandsire say it himself, last night." }] : []); }

  // ---------- What the telling says ----------
  (K.TELL_HOOKS = K.TELL_HOOKS || []).push((S, t, h) => {
    if (h("bh_called_arjuna")) t.push("On the ninth day {they} shouted at Arjuna to fight his grandfather, in front of the whole line.");
    if (h("bh_stepped_in")) t.push("When Krishna ran at Bhishma with a wheel, {they} stepped in front of the old man, and he moved {them} aside.");
    if (h("bh_heard_shikhandi")) t.push("On the ninth night {they} went with the brothers to Bhishma's tent, and heard him tell them how he could be brought down.");
    if (h("bh_went_to_him")) t.push("When the grandsire fell on the tenth day, {they} {were} one of the first to reach him.");
  });
})(window.K = window.K || {});
