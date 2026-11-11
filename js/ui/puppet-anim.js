/* Puppets with weight (quality review 13-15, as tried on the motion test page).
   A figure drawn with { pose: "live" } is driven joint by joint from a small spring per joint,
   stepped every frame against real time (so it moves the same at 60 Hz and 120 Hz): limbs
   overshoot a little and settle like a rod puppet, a dangling arm sways, and a figure can be
   kicked (knocked back), frozen for a beat on contact (hit-stop), made to tremble, pinned by the
   foot, or let fall limb by limb, pivoting on its feet.

   U.rig(svg, actorEl, base, { fight }) → a Rig (or null with calm motion: the CSS poses are used then); out of a fight a
                                            figure at rest holds its weapon clear of its face
   rig.set(pose, stiffness, damping, snap)  aim every joint at a pose from POSES
   rig.home()                               back to its own resting pose
   rig.kick({ joint: velocity })            a push on some joints (an impact)
   rig.fallDown(floor, dir, onRest, bent)   the joints go slack and it topples about its feet, backward (dir 1: forward) (to the
                                            ground, or held at floor degrees: Bhishma on the arrows), letting go of its
                                            weapon, which drops and lies beside it; onRest once it lies still; bent: from the
                                            "buckle" pose, on bent knees, lying face down with the arms past the head or on
                                            its back with the knees up
   U.rigFreeze(ms)                          hold every live figure still for a moment (hit-stop)
   U.rigs.clear()                           forget every figure (a new screen)

   A bow is held upright in the fist whatever the arm does, its string draws back to the face with
   an arrow nocked (key "draw", 0..1) and snaps back on release; "tilt" leans it up or down. */
(function (K) {
  "use strict";
  const U = K.UI;

  // Joint angles in degrees; rot/tx/ty move the body (figure units). Built from the CSS poses
  // (screens.css) so a live figure takes the same shapes, plus the fighting poses of the test page.
  const POSES = {
    stand: { armF: 8, foreF: -16, armB: -6 },
    ready: { rot: -3, armF: -52, foreF: -46, armB: -18, foreB: -28, legF: -12, legB: 12, shinB: 8, item: 180 },
    bowready: { rot: -2, armF: -40, foreF: -30, armB: -10, foreB: -20, legF: -12, legB: 12, shinB: 8 },
    brace: { rot: -8, armF: -96, foreF: -60, legF: -16, legB: 16, item: 180 },
    windup: { rot: -11, tx: -5, head: -6, armF: -172, foreF: -24, armB: -26, foreB: -20, legF: -20, legB: 18, shinB: 12, item: 180 },
    // (the strike and defence study, 8 November: the shield arm dropped to the hip at every cut, leaving the body open; it
    // stays forward now, rim leading, as a shield fighter keeps it)
    strike: { rot: 13, tx: 9, head: 5, armF: -38, foreF: -4, armB: -50, foreB: -58, legF: -30, shinF: 12, legB: 24, shinB: 6, item: 180 },
    // The sword's cut wound up to the shoulder, the blade cocked back over it (the study: straight overhead, then a poke at
    // the head); the shield forward.
    cutUp: { rot: -8, tx: -4, head: -4, armF: -106, foreF: -143, armB: -50, foreB: -58, legF: -20, legB: 18, shinB: 12, item: 200 },
    // Follow-through, after the blow lands on the body: the cut carries on down past the target, the smash drives down
    // through it with the knees bent and the weight forward, the sweep carries on round and up (the arm and the weapon go on
    // from where they struck: U.ARCS[arc].thru, ui/realtime.js; these give the body).
    cutThru: { rot: 18, tx: 12, ty: 6, head: 8, armF: -20, foreF: -10, armB: -50, foreB: -58, legF: -38, shinF: 22, legB: 28, shinB: 8, item: 170 },
    smashThru: { rot: 26, tx: 14, ty: 12, head: 14, armF: -40, foreF: -6, armB: -30, foreB: -40, legF: -46, shinF: 36, legB: 30, shinB: 16, item: 168 },
    sweepThru: { rot: 4, tx: 14, ty: 3, head: 2, armF: -130, foreF: -6, armB: 20, foreB: -20, legF: -30, shinF: 12, legB: 30, shinB: 8, item: 165 },
    draw: { rot: -3, head: -2, armF: -84, foreF: -6, armB: -86, foreB: 150, legF: -14, legB: 14, shinB: 6, draw: 1 },
    loose: { rot: 1, armF: -84, foreF: -6, armB: -60, foreB: -10, legF: -14, legB: 14, shinB: 6 },
    drawUp: { rot: -12, head: -14, armF: -118, foreF: -6, armB: -120, foreB: 150, legF: -18, legB: 16, shinB: 8, draw: 1, tilt: -30 },
    looseUp: { rot: -9, head: -12, armF: -118, foreF: -6, armB: -92, foreB: -10, legF: -18, legB: 16, shinB: 8, tilt: -30 },
    drawLow: { rot: 4, head: 6, armF: -62, foreF: -6, armB: -64, foreB: 150, legF: -16, legB: 16, shinB: 8, draw: 1, tilt: 18 },
    looseLow: { rot: 6, head: 6, armF: -62, foreF: -6, armB: -40, foreB: -10, legF: -16, legB: 16, shinB: 8, tilt: 18 },
    guard: { rot: -8, ty: 6, head: 4, armF: -112, foreF: -70, armB: -60, foreB: -50, legF: -24, shinF: 14, legB: 22, shinB: 14, item: 180 },
    // The parry met where the blow comes (the study: every parry met the blade overhead, a sweep at the ribs too): guard for
    // a cut or a smash, guardMid, the blade up across the chest, for a thrust, a stab or a sweep.
    guardMid: { rot: -6, ty: 4, head: 2, armF: -75, foreF: -40, armB: -50, foreB: -58, legF: -20, shinF: 8, legB: 20, shinB: 10, item: 150 },
    block: { rot: -6, armF: -112, foreF: -70, item: 180 },
    // The shield held up (Block, owner 4 November): the back arm brings the shield round in front of the chest, the weapon
    // held back and low behind it, the knees bent.
    shieldUp: { rot: -4, ty: 5, head: 6, armB: -50, foreB: -58, armF: 24, foreF: -64, legF: -24, shinF: 14, legB: 22, shinB: 14, item: 180 },
    // Raised to the eyes for a blow at the head (a cut, a smash), the knees deeper (the study: the shield came to the chest
    // for every blow).
    shieldHigh: { rot: -6, ty: 9, head: 12, armB: -104, foreB: -56, armF: 24, foreF: -64, legF: -30, shinF: 22, legB: 24, shinB: 20, item: 180 },
    // The mace's two blows (owner, 4 November: heavy and slow): the overhead smash wound up over the shoulder, the weight
    // behind the head, and brought down onto the head and shoulders; the side sweep wound back low behind the hip and
    // swung through at the ribs.
    smashUp: { rot: -18, tx: -6, ty: 2, head: -6, armF: -148, foreF: -104, armB: -40, foreB: -30, legF: -22, shinF: 6, legB: 20, shinB: 12, item: 204 },
    smash: { rot: 20, tx: 11, ty: 4, head: 10, armF: -56, foreF: -4, armB: 16, foreB: -10, legF: -36, shinF: 18, legB: 26, shinB: 6, item: 180 },
    // (6 November, owner: "the mace is pointing down when I strike": the sweep is wound back at the hip, the mace level behind,
    // no longer hanging; and with the shield up a mace is held raised over the shoulder, not hanging at the side)
    sweepBack: { rot: -14, tx: -8, ty: 3, head: -4, armF: 115, foreF: -55, armB: -50, foreB: -40, legF: -24, shinF: 8, legB: 24, shinB: 12, item: 215 },
    // (8 November, the strike and defence study: held straight up over the head behind the shield, like a torch; now low at
    // the hip below the shield, its head forward, ready to answer: not hanging, which the owner did not want, 6 November)
    shieldUpMace: { rot: -4, ty: 5, head: 6, armB: -50, foreB: -58, armF: 10, foreF: -80, legF: -24, shinF: 14, legB: 22, shinB: 14, item: 150 },
    shieldHighMace: { rot: -6, ty: 9, head: 12, armB: -104, foreB: -56, armF: 10, foreF: -80, legF: -30, shinF: 22, legB: 24, shinB: 20, item: 150 },
    sweep: { rot: 12, tx: 12, ty: 2, head: 4, armF: -84, foreF: -2, armB: 30, foreB: -12, legF: -32, shinF: 14, legB: 28, shinB: 6, item: 180 },
    // A thrust (a spear, a sword's third blow) and a stab (a dagger): drawn back at the hip, then driven straight in, the
    // weight on the front foot.
    thrustBack: { rot: -10, tx: -7, ty: 2, head: -4, armF: 62, foreF: -62, armB: -40, foreB: -40, legF: -20, shinF: 6, legB: 22, shinB: 12, item: 90 },
    stabBack: { rot: -6, tx: -4, ty: 3, head: -2, armF: 50, foreF: -70, armB: -50, foreB: -50, legF: -18, shinF: 8, legB: 18, shinB: 10, item: 90 },
    // The dagger's heavy fifth (the study: it looked like the four stabs before it): down low in a crouch, the blade at the
    // hip, then a step in and a drive up under the guard, rising onto the front foot.
    stabLow: { rot: 8, tx: -4, ty: 14, head: 6, armF: 35, foreF: -95, armB: -40, foreB: -50, legF: -40, shinF: 40, legB: 26, shinB: 30, item: 90 },
    drive: { rot: -6, tx: 14, ty: -2, head: -6, armF: -100, foreF: -10, armB: 10, foreB: -20, legF: -36, shinF: 14, legB: 34, shinB: 6, item: 90 },
    thrust: { rot: 14, tx: 13, ty: 2, head: 6, armF: -80, foreF: -6, armB: 24, foreB: -14, legF: -36, shinF: 18, legB: 30, shinB: 6, item: 90 },
    kneel: { ty: 26, head: 14, legF: -84, shinF: 96, legB: 8, shinB: 98, armF: -36, foreF: -84, armB: -30, foreB: -70 },
    strain: { rot: -14, head: -10, armF: -30, foreF: -40, armB: 30, foreB: -20, legB: 28, shinB: 10 },
    slack: { armF: 70, foreF: 30, armB: 40, foreB: 20, head: 22, legF: -14, shinF: 18, legB: 8, shinB: 10, item: 120 },
    duck: { ty: 34, rot: 16, head: 10, legF: -96, shinF: 112, legB: 8, shinB: 104, armF: -44, foreF: -70, armB: -20, foreB: -30, item: 180 },
    // The roll drawn as a quick step back out of the blow, leaning away from it, the front foot lifting (the study: a squat
    // at half opacity); the duck only when it carries you forward, under the blow.
    backstep: { rot: -16, tx: -8, ty: 6, head: -10, armF: -60, foreF: -60, armB: -40, foreB: -50, legF: -46, shinF: 40, legB: 16, shinB: 30, item: 180 },
    jump: { ty: -6, legF: -78, shinF: 104, legB: -48, shinB: 96, armF: -150, armB: -130, item: 180 },
    side: { rot: -16, head: -10, legF: 26, legB: -30, armF: 40 },
    aim: { rot: -2, armF: -84, foreF: -6, armB: -86, foreB: 150 },
    hold: { rot: 6, armF: -66, foreF: -24, armB: -58, foreB: -30, item: 180 },
    push: { rot: 14, armF: -72, foreF: -18, armB: -66, foreB: -22, legF: -26, shinF: 18, legB: 20, shinB: 6, item: 180 },
    sneak: { ty: 12, rot: 6, head: 2, legF: -48, shinF: 58, legB: 28, shinB: 50, armF: -40, foreF: -40, item: 180 }, // upright: the crouch is in the knees
    think: { head: 10, armF: -28, foreF: -140, item: 180 },
    speak: { head: -4, armF: -58, foreF: -30, item: 180 },
    cheer: { rot: -4, armF: -166, foreF: -10, armB: -150, item: 180 },
    slump: { rot: 11, ty: 3, head: 26, armF: 4, armB: 2 },
    fold: { armF: -38, foreF: -118, armB: -30, foreB: -120, item: 180 },
    walk: { armF: 8, foreF: -16, armB: -6 },
    // Beaten but alive: down on one knee, head bowed, arms hanging, the weapon lowered (owner, 4 November).
    defeated: { rot: 5, ty: 30, head: 40, legF: -84, shinF: 98, legB: 6, shinB: 100, armF: 14, foreF: 4, armB: 8, foreB: 6, item: 165 },
    // Walking away: two strides, the weapon carried low.
    stepA: { rot: 3, legF: -24, shinF: 12, legB: 20, shinB: 8, armF: 16, foreF: -10, armB: -14, item: 150 },
    stepB: { rot: 3, legF: 18, shinF: 6, legB: -22, shinB: 14, armF: -10, foreF: -16, armB: 14, item: 150 },
    // Struck down: the knees give first and the body sinks on them, the arms going loose (the strike and defence study,
    // 8 November: the fallen toppled stiff as planks); then rig.fallDown(..., bent) takes him over with them still bent.
    buckle: { rot: 10, ty: 18, head: 20, legF: -50, shinF: 64, legB: -12, shinB: 60, armF: 24, foreF: -10, armB: 12, foreB: -8, item: 150 }
  };
  // The bow drawn to the face (the strike and defence study, 8 November: the string came back only to the chest, the drawing
  // hand stopped there, and on the loose it pushed forward): the string drawn back to the corner of the jaw, the drawing
  // hand put on the nock by a reach from the back shoulder (two links, in figure units: the shoulder at 58,73, the upper
  // arm 25 long, the forearm 26 to the hand), wherever the bow arm holds the bow and however the bow is tilted. On the loose
  // the hand flies back past the ear along the line of the arrow and the bow arm stays up, as an archer follows through.
  const RAD = Math.PI / 180, SH = [58, 73], UPPER = 25, FORE = 26;
  const dirOf = (a) => [-Math.sin(a * RAD), Math.cos(a * RAD)]; // a joint turned a degrees: the way its limb points
  function nockAt(p, back) { // where the nock is (back: and then this much further back along the arrow), in the body's frame
    const rot = p.rot || 0, a1 = p.armF || 0, a2 = a1 + (p.foreF || 0), u = dirOf(a1), f = dirOf(a2);
    // the grip: the fist (28 down the forearm) and the bow's pivot 2.5 beside it
    const gx = SH[0] + UPPER * u[0] + 28 * f[0] + 2.5 * Math.cos(a2 * RAD), gy = SH[1] + UPPER * u[1] + 28 * f[1] + 2.5 * Math.sin(a2 * RAD);
    // the bow is kept upright on the screen (tilted by tilt), so the arrow's line, in the body's frame, is turned by -rot
    const along = (p.tilt || 0) - rot, L = 10.5 + 30 * (p.draw || 0) + (back || 0);
    return [gx - L * Math.cos(along * RAD), gy - L * Math.sin(along * RAD)];
  }
  function reach(p, x, y) { // the back arm's two angles that put its hand at x,y (the elbow out behind)
    const dx = x - SH[0], dy = y - SH[1], d = Math.min(UPPER + FORE - 0.5, Math.max(Math.abs(UPPER - FORE) + 0.5, Math.hypot(dx, dy)));
    const toH = Math.atan2(dy, dx), al = Math.acos((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d));
    const e = toH - al; // the elbow on the far side from the bow: behind and up
    const ex = SH[0] + UPPER * Math.cos(e), ey = SH[1] + UPPER * Math.sin(e);
    const ang = (vx, vy) => Math.atan2(-vx, vy) / RAD; // the joint angle that points a limb along vx,vy
    const armB = ang(ex - SH[0], ey - SH[1]), fore = ang(x - ex, y - ey);
    let foreB = fore - armB; while (foreB > 180) foreB -= 360; while (foreB < -180) foreB += 360;
    return { armB: +armB.toFixed(1), foreB: +foreB.toFixed(1) };
  }
  // draw (to the jaw) and loose (the hand flown back past the ear) for each of the three aims; the head turned to sight down
  // the arrow
  // (each bow arm and draw solved so that the nock comes to the corner of the jaw, 62,60, at that lean and tilt)
  for (const [d, l, o, legs] of [
    ["draw", "loose", { rot: -3, head: 6, armF: -96.5, foreF: -4, tilt: 0, draw: 1.25 }, { legF: -14, legB: 14, shinB: 6 }],
    ["drawUp", "looseUp", { rot: -14, head: -8, armF: -113.5, foreF: -4, tilt: -30, draw: 1.13 }, { legF: -18, legB: 16, shinB: 8 }],
    ["drawLow", "looseLow", { rot: 8, head: 12, armF: -90, foreF: -4, tilt: 18, draw: 1.3 }, { legF: -16, legB: 16, shinB: 8 }]]) {
    const pd = Object.assign({}, o, legs), n = nockAt(pd);
    POSES[d] = Object.assign(pd, reach(pd, n[0], n[1]));
    const pl = Object.assign({}, o, legs, { rot: o.rot + 2, draw: 0 }), m = nockAt(pd, 16); // the hand on from where the nock was
    POSES[l] = Object.assign(pl, reach(pl, m[0], m[1] - 2));
  }
  U.nockAt = nockAt; // (for the pose checks)
  const KEYS = ["rot", "tx", "ty", "head", "armF", "foreF", "armB", "foreB", "legF", "shinF", "legB", "shinB", "item", "draw", "tilt", "dx", "dy"];
  const JOINTS = ["head", "armF", "foreF", "armB", "foreB", "legF", "shinF", "legB", "shinB"];
  // How each kind of figure stands at rest (spec.stance in puppet.js, as data-stance on the figure):
  // the same shapes as the .sx-* rules in screens.css. A live figure whose base pose is "stand"
  // stands in its own stance instead.
  Object.assign(POSES, {
    stoop: { ty: 4, rot: 12, head: -14, armF: -30, foreF: -62, armB: 10, foreB: -30, legF: -12, shinF: 10, legB: 10, shinB: 10, item: 180 },
    square: { rot: -2, armF: -4, foreF: -22, armB: -44, foreB: -50, legF: -12, legB: 12 },
    archer: { rot: -2, armF: -14, foreF: -10, armB: -8, foreB: -24, legF: -10, legB: 10 },
    raised: { rot: -4, armF: -150, foreF: -20, armB: -40, foreB: -56, legF: -16, shinF: 4, legB: 16, shinB: 8, item: 180 },
    proud: { rot: -4, head: -6, armF: -62, foreF: -48, armB: -10, foreB: -30, legF: -14, legB: 14 },
    hero: { rot: -3, head: -4, armF: -16, foreF: -14, armB: -10, foreB: -28, legF: -14, legB: 14 },
    haughty: { rot: -7, head: -12, armF: -58, foreF: -46, armB: -60, foreB: -120, legF: -18, legB: 16 },
    broad: { rot: -2, head: -4, armF: -6, foreF: -4, armB: -36, foreB: -40, legF: -22, legB: 22, shinB: 4, item: 180 },
    sage: { rot: 3, head: 4, armF: -14, foreF: -12, armB: -8, foreB: -30, legF: -8, legB: 8 }
  });
  const reduced = () => !U.motion || !U.motion();

  const live = new Set();
  let frozen = 0, last = 0, raf = 0;
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.033, last ? (now - last) / 1000 : 0.016); last = now;
    if (frozen > 0) frozen -= dt * 1000;
    // A slow frame (30 Hz, or a stall) is stepped in short slices: a stiff joint (a strike) would
    // otherwise overshoot further each step and fling the figure about.
    else { const n = Math.ceil(dt / 0.009); for (const r of live) { if (!r.svg.isConnected) { live.delete(r); continue; } for (let i = 1; i <= n; i++) r.step(dt / n, now / 1000 - (n - i) * dt / n); } }
    if (live.size) raf = requestAnimationFrame(frame); else last = 0;
  }
  const wake = () => { if (!raf && live.size && typeof requestAnimationFrame === "function") raf = requestAnimationFrame(frame); };

  // At rest out of a fight nothing held covers the face (owner, 4 November): standing, walking, slumped, turned aside or in
  // its own stance, a figure holds a mace, a club or a hammer low with its head on the ground and a blade point down
  // (item 180), a bow upright at its side (the arm hanging; the bow is kept upright in the fist), a spear or a staff upright
  // beside it. A fight's figures (U.rig(..., { fight: true })) keep their fighting stances.
  const REST = new Set(["stand", "walk", "slump", "side", "stoop", "square", "archer", "raised", "proud", "hero", "haughty", "broad", "sage"]);
  const LOW = new Set(["mace", "club", "hammer", "sword", "woodsword", "dagger"]);
  function Rig(svg, el, base, o) {
    this.fight = !!(o && o.fight);
    this.svg = svg; this.el = el || svg.parentNode; this.baseName = POSES[base] ? base : "stand";
    this.g = {}; for (const k of JOINTS) this.g[k] = svg.querySelector("." + k);
    this.body = svg.querySelector(".pp-body"); this.itemEl = svg.querySelector(".it-w");
    this.bow = null;
    this.takeBow(svg.querySelector(".it:not(.it-w)"));
    this.x = {}; this.v = {}; this.t = {};
    for (const k of KEYS) { this.x[k] = 0; this.v[k] = 0; this.t[k] = 0; }
    this.k = 480; this.z = 0.5; this.fall = 0; this.fallV = 0; this.falling = false; this.tremble = 0; this.pinned = 0;
    this.phase = Math.random() * 6;
    this.set(this.baseName, 480, 0.5, true);
    live.add(this); wake();
  }
  // A bow in the hand: its string drawn back by "draw", an arrow nocked on it.
  Rig.prototype.takeBow = function (b) {
    const str = b && b.querySelector('path[d="M50 86 L50 166"]');
    if (!str) return false;
    this.bow = b; this.string = str;
    str.setAttribute("stroke-width", "1.1"); str.setAttribute("fill", "none");
    // Turned upright by an SVG transform about the grip (not a CSS transform with transform-box, which WebKit
    // can pivot elsewhere and so fling the bow up beside the head).
    b.style.transformBox = ""; b.style.transformOrigin = ""; b.style.transform = "";
    b.insertAdjacentHTML("beforeend", '<g class="nock" opacity="0"><path d="M50 126 L80 126" stroke="#e6c98c" stroke-width="2.2"/><path d="M50 126 L80 126" stroke="#24120a" stroke-width=".5" opacity=".6"/><path d="M80 122.6 L87 126 L80 129.4 Z" fill="#dcd7c8" stroke="#24120a" stroke-width=".6"/><path d="M50 126 l-4 -3 M50 126 l-4 3" stroke="#c8402c" stroke-width="1.6"/></g>');
    this.nock = b.querySelector(".nock");
    return true;
  };
  // For one move, the weapon that move is made with: a spearman who looses arrows takes up a bow, an
  // archer who swings a heavy blow draws a sword; his own is put by (hidden) and taken back at home().
  Rig.prototype.wield = function (kind) {
    const fore = this.svg.querySelector(".pp-body .foreF");
    if (!fore || !U.itemSvg || this.dropped) return this;
    const own = fore.querySelector(":scope > .it:not(.it-tmp)"), now = this.tmp ? this.tmp.dataset.k : own ? own.dataset.k : null;
    if (now === kind) return this;
    this.unwield();
    if (own && own.dataset.k === kind) { this.apply(); return this; } // his own weapon is the one: it is simply taken back
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const wieldCls = { mace: 1, sword: 1, spear: 1, dagger: 1, club: 1 }[kind] ? " it-w" : "";
    g.setAttribute("class", "it it-tmp" + wieldCls); g.dataset.k = kind;
    g.innerHTML = U.itemSvg(kind);
    if (own) { own.style.display = "none"; own.removeAttribute("transform"); fore.insertBefore(g, own); } else fore.appendChild(g); // the weapon put by is not drawn at all while another is out
    this.tmp = g; this.ownItem = own; this.ownBow = this.bow; this.ownItemEl = this.itemEl;
    this.bow = null; this.itemEl = null;
    if (kind === "bow") this.takeBow(g); else this.itemEl = wieldCls ? g : null;
    this.apply();
    return this;
  };
  Rig.prototype.unwield = function () {
    if (!this.tmp) return this;
    this.tmp.remove(); this.tmp = null;
    if (this.ownItem) this.ownItem.style.display = "";
    this.bow = this.ownBow; this.itemEl = this.ownItemEl;
    if (this.bow) this.nock = this.bow.querySelector(".nock");
    return this;
  };
  // A mace (or a club) in a fight: its own way of holding it behind the raised shield.
  const MACE_POSE = { shieldUp: "shieldUpMace", shieldHigh: "shieldHighMace" };
  Rig.prototype.set = function (name, k, z, snap) {
    if (this.fight && MACE_POSE[name] && this.itemEl && /^(mace|club)$/.test(this.itemEl.dataset.k || "")) name = MACE_POSE[name];
    let p = POSES[name] || POSES.stand;
    if (!this.fight && REST.has(name)) { // at rest: nothing held over the face
      const kind = this.itemEl && this.itemEl.dataset.k;
      if (this.bow && !this.tmp) p = Object.assign({}, p, { armF: 8, foreF: -16, tilt: -18 });
      else if (kind && /^(spear|staff|plough)$/.test(kind)) p = Object.assign({}, p, { item: -8 - ((p.rot || 0) + (p.armF || 0) + (p.foreF || 0)) - 18 }); // upright, leaning back past the head
      else if (kind && LOW.has(kind)) p = Object.assign({}, p, { item: 180 });
    }
    for (const key of KEYS) if (key !== "dx" && key !== "dy") this.t[key] = p[key] || 0;
    if (k) this.k = k; if (z != null) this.z = z;
    if (snap) { for (const key of KEYS) { this.x[key] = this.t[key]; this.v[key] = 0; } this.apply(); }
    this.pose = name; wake();
    return this;
  };
  Rig.prototype.home = function (k) { this.unwield(); return this.set(this.baseName, k || 520, 0.42); };
  Rig.prototype.base = function (name) { if (POSES[name]) this.baseName = name; return this; };
  Rig.prototype.kick = function (o) { for (const k in o) this.v[k] += o[k]; wake(); return this; };
  Rig.prototype.fallDown = function (floor, dir, onRest, bent) {
    this.set("slack"); this.falling = true; this.fallV = 140; this.floor = floor || -86; this.fdir = dir || -1; this.onRest = onRest || null;
    // (bent: he goes over on bent knees, from where he sank on them; the sink is taken up as he goes over)
    this.bentTy = bent ? Math.max(0, this.x.ty) : 0;
    // Lying: face down, the arms flung out past the head and the legs nearly straight; on his back, the arms loose at his sides
    // and the knees up (the slack pose's arms, hung backward, went up in the air on a face-down fall).
    if (bent) Object.assign(this.t, this.fdir > 0 ? { armF: -168, foreF: -12, armB: -150, foreB: -20, legF: -8, shinF: 20, legB: 12, shinB: 16 } : { armF: -6, foreF: -10, armB: 6, foreB: -10, legF: -40, shinF: 56, legB: -10, shinB: 42 });
    // A blow's push dies with the fall: it topples from where it stands, not on along the push.
    this.v.rot = 0; this.v.tx = 0; this.v.dx = 0; this.t.dx = 0; this.v.dy = 0; this.t.dy = 0;
    if (!floor || floor <= -80) this.letGo();
    wake(); return this;
  };
  // Falling, the figure lets go of what it holds: the weapon (and a shield) leave the hand where they
  // are, drop to the ground turning over, bounce once and lie flat beside the body, where a fresh
  // drawing of the fallen figure (puppet.js, pose "dead") lays them too.
  Rig.prototype.letGo = function () {
    const all = this.svg.querySelector(".pp-all");
    if (!all || this.drops || !all.getCTM || !U.itemLie) return;
    this.unwield(); this.dropped = true; // what falls is his own weapon, not one taken up for a move
    this.drops = [];
    let inv; try { inv = all.getCTM().inverse(); } catch (e) { return; }
    for (const it of this.svg.querySelectorAll(".pp-body .it[data-k]:not(.it-tmp), .pp-body .it-s")) {
      const shield = it.classList.contains("it-s");
      const to = shield ? U.shieldLie(+it.dataset.r || 13, this.fdir) : U.itemLie(it.dataset.k, this.fdir);
      if (!to) continue;
      let m; try { m = inv.multiply(it.getCTM()); } catch (e) { continue; }
      // Where its centre is now, and how it is turned.
      const from = { x: m.a * to.cx + m.c * to.cy + m.e, y: m.b * to.cx + m.d * to.cy + m.f, a: Math.atan2(m.b, m.a) * 180 / Math.PI };
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "it-down dropping" + (shield ? " it-s-down" : ""));
      all.appendChild(g); g.appendChild(it);
      it.style.transform = "none"; it.style.transformOrigin = ""; it.style.transformBox = ""; it.removeAttribute("transform");
      if (it === this.itemEl) this.itemEl = null;
      if (it === this.bow) { this.bow = null; if (this.nock) this.nock.setAttribute("opacity", 0); }
      // The nearest turn that lays it flat the right way round.
      const a1 = to.a + 360 * Math.round((from.a - to.a) / 360);
      this.drops.push({ g, to, from, a1, t: 0 });
    }
    if (!this.drops.length) this.drops = null;
  };
  const DROP = 0.5, SETTLE = 0.34;
  Rig.prototype.stepDrops = function (dt) {
    let busy = false;
    for (const d of this.drops) {
      if (d.t >= DROP + SETTLE) continue;
      d.t = Math.min(DROP + SETTLE, d.t + dt); busy = true;
      const to = d.to, x1 = to.cx + to.tx, y1 = to.cy + to.ty;
      let x, y, a, sy;
      if (d.t < DROP) { // falling under its weight, turning over as it goes
        const u = d.t / DROP;
        x = d.from.x + (x1 - d.from.x) * (1 - (1 - u) * (1 - u)); y = d.from.y + (y1 - d.from.y) * u * u;
        const v = Math.min(1, u / 0.6); // it turns over high, before it reaches the ground: no end digs into it
        a = d.from.a + (d.a1 - d.from.a) * (1 - Math.pow(1 - v, 3)); sy = 1 + (to.sy - 1) * v;
      } else { // a small bounce and a rock, then flat
        const v = (d.t - DROP) / SETTLE;
        x = x1; y = y1 - Math.sin(v * Math.PI) * 5 * (1 - v); a = d.a1 + Math.sin(v * Math.PI * 2) * 5 * (1 - v); sy = to.sy;
      }
      d.g.setAttribute("transform", U.lieTransform({ cx: to.cx, cy: to.cy, tx: x - to.cx, ty: y - to.cy, a, sy }));
    }
    return busy;
  };
  Rig.prototype.stop = function () { live.delete(this); };
  Rig.prototype.step = function (dt, time) {
    const c = 2 * this.z * Math.sqrt(this.k);
    // Breathing and dangling: a slow sway added to the target, so the figure is never frozen.
    const sway = this.falling ? 0 : Math.sin(time * 1.6 + this.phase);
    const shiver = this.tremble ? Math.sin(time * 70) * this.tremble : 0;
    const tug = this.pinned ? Math.sin(time * 9) * 5 * this.pinned : 0;
    for (const k of KEYS) {
      let tgt = this.t[k];
      if (k === "rot") tgt += sway * 1.1 + tug; else if (k === "foreB") tgt += sway * 4; else if (k === "head") tgt += sway * 1.5;
      if (k === "ty" && this.falling && this.bentTy) tgt = this.bentTy * Math.max(0, 1 - Math.abs(this.fall) / 60);
      if (k === "armF" || k === "armB") tgt += shiver;
      let kk, cc;
      if (k === "draw") { kk = this.t.draw ? 260 : 2600; cc = this.t.draw ? 2 * 0.9 * Math.sqrt(260) : 2 * 0.12 * Math.sqrt(2600); } // the string snaps back
      else if (k === "dx" || k === "dy") { kk = 750; cc = 2 * 0.72 * Math.sqrt(750); }
      else if (this.falling) { kk = 140; cc = 2 * 0.28 * Math.sqrt(140); }
      else { kk = this.k; cc = c; }
      this.v[k] += (-kk * (this.x[k] - tgt) - cc * this.v[k]) * dt; this.x[k] += this.v[k] * dt;
    }
    if (this.pinned) { this.x.legF = -18; this.x.shinF = 6; } // the pinned foot stays where the arrow holds it
    if (this.drops) this.stepDrops(dt);
    if (this.falling) { // toppling about the feet, faster as it goes, a small bounce on the ground
      this.fallV += 2800 * Math.sin((Math.abs(this.fall) + 9) * Math.PI / 180) * dt; this.fall -= this.fallV * dt;
      const fl = this.floor || -86;
      if (this.fall < fl) { this.fall = fl; this.fallV = -this.fallV * 0.22; if (Math.abs(this.fallV) < 8) { this.fallV = 0; if (this.onRest) { const f = this.onRest; this.onRest = null; setTimeout(f, 0); } } }
    }
    this.apply();
  };
  Rig.prototype.apply = function () {
    const x = this.x, fall = this.fall * -(this.fdir || -1), th = (x.rot + fall) * Math.PI / 180;
    // (lying, it rests on its side on the ground, not sunk into it: lifted by the body's half depth)
    const ptx = fall ? 74 * Math.sin(th) : 0, pty = fall ? 74 - 74 * Math.cos(th) - 8 * Math.abs(Math.sin(fall * Math.PI / 180)) : 0;
    if (this.body) this.body.style.transform = "translate(" + (x.tx + ptx).toFixed(2) + "px," + (x.ty + pty).toFixed(2) + "px) rotate(" + (x.rot + fall).toFixed(2) + "deg)";
    for (const k in this.g) if (this.g[k]) this.g[k].style.transform = "rotate(" + x[k].toFixed(2) + "deg)";
    if (this.itemEl) this.itemEl.style.transform = "rotate(" + x.item.toFixed(2) + "deg)";
    if (this.bow) {
      const up = -(x.rot + fall + x.armF + x.foreF) + x.tilt; // undo the arm's turn: the bow stays upright
      this.bow.setAttribute("transform", "rotate(" + up.toFixed(2) + " 60.5 126)");
      const d = Math.max(-4, x.draw * 30); // the string's nocking point, pulled back
      this.string.setAttribute("d", "M50 86 L" + (50 - d).toFixed(2) + " 126 L50 166");
      this.nock.setAttribute("transform", "translate(" + (-Math.max(0, d)).toFixed(2) + " 0)");
      this.nock.setAttribute("opacity", this.t.draw > 0.5 ? 1 : 0);
    }
    if (this.el && this.el.style) this.el.style.translate = Math.abs(x.dx) < 0.05 && Math.abs(x.dy) < 0.05 ? "" : x.dx.toFixed(1) + "px " + x.dy.toFixed(1) + "px";
  };

  // Make a live figure of an SVG drawn with { pose: "live" }. With calm motion, the figure is
  // given back its plain CSS pose instead, and null is returned.
  U.rig = function (svg, el, base, o) {
    if (!svg) return null;
    // A fight's figure: an arm in a sling (an arm wound) is let out of it to strike, the strap still worn (screens.css
    // .sling:not(.fighting); the 14 lives, 10 November: the arm and weapon stayed bound and no blow reached the foe).
    if (o && o.fight && !/\bfighting\b/.test(svg.getAttribute("class"))) svg.setAttribute("class", svg.getAttribute("class") + " fighting");
    if (reduced() || typeof requestAnimationFrame !== "function") {
      svg.setAttribute("class", svg.getAttribute("class").replace(/pose-live\b/, "pose-" + ({ ready: "brace", bowready: "brace" }[base] || base || "stand")));
      return null;
    }
    const own = svg.getAttribute("data-stance"); // with calm motion the CSS stand pose shows the stance
    if ((!base || base === "stand") && own && POSES[own]) base = own;
    if (!/\bpose-live\b/.test(svg.getAttribute("class"))) svg.setAttribute("class", svg.getAttribute("class").replace(/\bpose-\S+/, "pose-live"));
    return new Rig(svg, el, base, o);
  };
  U.rigFreeze = function (ms) { if (!reduced()) frozen = Math.max(frozen, ms); };

  // ---------- A blow that lands (owner, 4 November: "the weapons are not falling on the puppets") ----------
  // U.aimBlow(rig, target svg, { pose, guard, k, z, maxLunge }) turns the striking arm (about the shoulder,
  // measured on the live figure) so that at the end of the swing the weapon's tip (.it-tip in puppet.js; the fist
  // without one) lies on the target's chest, and sets the lunge (dx, screen px) that brings the attacker just far
  // enough. With guard "shield" the blow is aimed at the target's shield, with "weapon" at its weapon (they cross).
  // Returns an aim; U.blowImpact(aim) at the moment of contact puts the figure exactly at the end of the swing,
  // measures the tip against what it strikes (live boxes, so any size, row and facing) and gives the point of contact.
  const rect = (e) => { const r = e && e.getBoundingClientRect(); return r && (r.width || r.height) ? r : null; };
  function tipEl(svg) {
    for (const t of svg.querySelectorAll(".pp-body .foreF .it-tip")) if (rect(t)) return t;
    const fore = svg.querySelector(".pp-body .foreF"); if (!fore) return null;
    let f = fore.querySelector(":scope > .it-tip.fist");
    if (!f) { f = document.createElementNS("http://www.w3.org/2000/svg", "circle"); f.setAttribute("class", "it-tip fist"); f.setAttribute("cx", "58"); f.setAttribute("cy", "124"); f.setAttribute("r", "0.6"); f.setAttribute("fill", "none"); f.setAttribute("stroke", "none"); fore.appendChild(f); }
    return f;
  }
  const mid = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  U.blowTip = (svg) => { const t = svg && tipEl(svg), r = t && rect(t); return r ? mid(r) : null; };
  // What a blow on this figure meets: its body (the torso), its shield, or its weapon (a segment, fist to tip).
  U.blowTarget = function (svg, guard, from) {
    if (guard === "shield") { const r = rect(svg.querySelector(".pp-body .it-s")); if (r) return { kind: "shield", box: r }; }
    if (guard === "weapon") {
      const t = U.blowTip(svg), it = svg.querySelector(".pp-body .foreF .it-w:not([style*='display: none'])"), r = rect(it);
      const tb = rect(svg.querySelector(".pp-torso")), c = tb && tb.left + tb.width / 2;
      // only a weapon held out toward the one striking crosses his (one behind the body is no parry)
      if (t && r && (from == null || !tb || (from - c) * (t.x - c) > 0)) return { kind: "weapon", box: r, tip: t };
    }
    const r = rect(svg.querySelector(".pp-torso")) || rect(svg.querySelector(".pp-body"));
    return r ? { kind: "body", box: r } : null;
  };
  function snapTo(rig, tgt) { for (const k of KEYS) { rig.x[k] = tgt[k] || 0; rig.v[k] = 0; } rig.apply(); }
  function fistOf(svg) { // the fist (where the weapon is held), as a mark in the forearm
    const fore = svg.querySelector(".pp-body .foreF"); if (!fore) return null;
    let f = fore.querySelector(":scope > .it-fist");
    if (!f) { f = document.createElementNS("http://www.w3.org/2000/svg", "circle"); f.setAttribute("class", "it-fist"); f.setAttribute("cx", "58"); f.setAttribute("cy", "126"); f.setAttribute("r", "0.6"); f.setAttribute("fill", "none"); f.setAttribute("stroke", "none"); fore.appendChild(f); }
    const r = rect(f); return r ? mid(r) : null;
  }
  // The arm and the weapon as two links (shoulder to fist, fist to tip), solved for a point: far off, the arm and weapon in
  // one straight line and a lunge to reach; nearer, the weapon comes down onto it from above (the arm raised, the weapon
  // turned in the fist); with no weapon, the fist alone.
  function solve(rig, tsvg, o) {
    const pose = o.pose || "strike", P0 = POSES[pose] || POSES.strike, svg = rig.svg;
    const save = { x: Object.assign({}, rig.x), v: Object.assign({}, rig.v) };
    const end = Object.assign({}, P0, { dx: 0 });
    snapTo(rig, end); const T0 = U.blowTip(svg), F0 = fistOf(svg);
    snapTo(rig, Object.assign({}, end, { armF: (end.armF || 0) + 90 })); const F1 = fistOf(svg);
    const torso = rect(svg.querySelector(".pp-torso")) || rect(svg.querySelector(".pp-body"));
    for (const k of KEYS) { rig.x[k] = save.x[k]; rig.v[k] = save.v[k]; } rig.apply();
    const what = T0 && U.blowTarget(tsvg, o.guard, T0.x);
    if (!T0 || !F0 || !F1 || !torso || !what) return null;
    const f = T0.x >= torso.left + torso.width / 2 ? 1 : -1; // which way the figure faces, drawn (mirrored or not)
    // In the figure's own frame (x forward, y down) a turn of the arm is a plain rotation: the shoulder from two of the fist's places.
    const fw = (q) => ({ x: f * q.x, y: q.y }), a = fw(F0), b = fw(F1), T = fw(T0);
    const S = { x: (b.x + a.y + a.x - b.y) / 2, y: (b.x + a.y - a.x + b.y) / 2 };
    const La = Math.hypot(a.x - S.x, a.y - S.y), Lw = rig.itemEl ? Math.hypot(T.x - a.x, T.y - a.y) : 0;
    const al0 = Math.atan2(a.y - S.y, a.x - S.x), be0 = Lw ? Math.atan2(T.y - a.y, T.x - a.x) - al0 : 0;
    const B = what.box;
    // Where on it: the chest; a shield at its middle; a parrying weapon halfway along its blade.
    // (o.at: "high", a smash, on the shoulders; "mid", a sweep, at the ribs.)
    const atY = o.at === "high" ? 0.08 : o.at === "mid" ? 0.5 : 0.3;
    const P = what.kind === "weapon" ? fw({ x: what.tip.x + (mid(B).x - what.tip.x) * 0.35, y: what.tip.y + (mid(B).y - what.tip.y) * 0.35 })
      : what.kind === "shield" ? fw({ x: f > 0 ? B.left + B.width * 0.4 : B.right - B.width * 0.4, y: B.top + B.height * (o.at === "high" ? 0.3 : 0.45) })
      : fw({ x: f > 0 ? B.left + B.width * 0.38 : B.right - B.width * 0.38, y: B.top + B.height * atY });
    const Lmax = (La + Lw) * 0.985, Lmin = Lw ? Math.max(Math.abs(La - Lw) * 1.08, La * 0.35) : La;
    // A target in another row, lower or higher than the weapon can reach: the blow steps toward its row (dy, screen px).
    let vy = P.y - S.y; vy = Math.abs(vy) > Lmax * 0.8 ? vy - Math.sign(vy) * Lmax * 0.8 : 0; S.y += vy;
    const dy = P.y - S.y, need = (L) => P.x - S.x - Math.sqrt(Math.max(0, L * L - dy * dy));
    let d = Math.hypot(P.x - S.x, dy), dx = 0;
    const maxL = o.maxLunge == null ? (La + Lw) * 1.1 : o.maxLunge, back = (La + Lw) * 0.12;
    // A thrust: the blade level, driven straight in at the target; the fist a blade's length short of it, the step (or the
    // lean back) as long as it must be.
    const Fx = P.x - Lw, dyF = Math.max(-La * 0.95, Math.min(La * 0.95, P.y - S.y));
    // (a target far above or below, or too near for the blade's length: the point turned to it instead)
    const lx = Fx - Math.sqrt(Math.max(0, La * La - dyF * dyF)) - S.x, level = o.straight && Lw && Math.abs(P.y - S.y) <= La * 0.95 && lx >= -back * 3 && lx <= maxL;
    // (o.near: a cut steps in only so far that the target is this fraction of the arm and blade away, so the blade comes
    // down onto it from above, diagonally, and not straight out at it like a poke: the strike and defence study)
    const Lnear = o.near && Lw ? Math.max(Lmin * 1.05, (La + Lw) * o.near) : 0;
    if (level) dx = lx;
    else if (Lnear && d > Lnear) dx = Math.min(maxL, need(Lnear));
    else if (d > Lmax) dx = Math.min(maxL, need(Lmax)); // too far: a lunge
    else if (d < Lmin) dx = Math.max(-back, need(Lmin)); // too near: a lean back
    const Sx = S.x + dx; d = Math.max(1e-3, Math.hypot(P.x - Sx, dy));
    const phi = Math.atan2(dy, P.x - Sx);
    let al = phi, be = 0;
    if (level) { al = Math.atan2(dyF, Fx - Sx); be = -al; }
    else if (Lw && d < La + Lw) {
      const c = (x) => Math.max(-1, Math.min(1, x));
      const sig = Math.acos(c((La * La + d * d - Lw * Lw) / (2 * La * d))), gam = Math.acos(c((La * La + Lw * Lw - d * d) / (2 * La * Lw)));
      // A spear or a dagger thrusts up from below (the arm under the line, the point turned up); a blade, a mace or a club comes down from above.
      const under = o.under != null ? o.under : rig.itemEl && /^(spear|dagger)$/.test(rig.itemEl.dataset.k || "");
      if (under) { al = phi + sig; be = gam - Math.PI; } else { al = phi - sig; be = Math.PI - gam; }
    }
    const deg = (r) => { const v = r * 180 / Math.PI; return ((v + 540) % 360) - 180; };
    return { rig, tsvg, guard: what.kind, pose, f, dxPx: f * dx, dyPx: vy, armF: (P0.armF || 0) + deg(al - al0), item: (P0.item || 0) + (Lw ? deg(be - be0) : 0), at: Date.now() };
  }
  const endOf = (aim) => Object.assign({}, POSES[aim.pose] || POSES.strike, { armF: aim.armF, item: aim.item, dx: aim.dxPx, dy: aim.dyPx || 0 });
  function aimAt(rig, aim) { const e = endOf(aim); for (const k of ["armF", "item", "dx", "dy"]) rig.t[k] = e[k]; wake(); }
  U.aimBlow = function (rig, tsvg, o = {}) {
    if (!rig || !tsvg || !rig.svg.isConnected || !tsvg.isConnected || rig.falling) return null;
    const aim = solve(rig, tsvg, o);
    if (!aim) return null;
    aim.o = o;
    rig.set(aim.pose, o.k || 1700, o.z == null ? 0.55 : o.z);
    aimAt(rig, aim);
    return aim;
  };
  // At contact: the figure at the end of its swing (aimed again at where the target is now, if it moved), the tip measured on what it strikes.
  U.blowImpact = function (aim) {
    if (!aim || !aim.rig.svg.isConnected || !aim.tsvg.isConnected || aim.rig.falling) return null;
    const rig = aim.rig, guard = aim.guard === "body" ? null : aim.guard;
    const test = () => {
      snapTo(rig, endOf(aim)); aimAt(rig, aim);
      const T = U.blowTip(rig.svg), w = U.blowTarget(aim.tsvg, guard, T && T.x);
      if (!T || !w) return null;
      const B = w.box, pad = w.kind === "body" ? 0 : 3;
      return { x: T.x, y: T.y, on: w.kind, inside: T.x >= B.left - pad && T.x <= B.right + pad && T.y >= B.top - pad && T.y <= B.bottom + pad, box: { l: B.left, r: B.right, t: B.top, b: B.bottom } };
    };
    let res = test();
    for (let i = 0; i < 3 && res && !res.inside; i++) { const a2 = solve(rig, aim.tsvg, Object.assign({}, aim.o, { guard: aim.guard === "body" ? null : aim.guard })); if (!a2) break; Object.assign(aim, { armF: a2.armF, item: a2.item, dxPx: a2.dxPx, dyPx: a2.dyPx }); res = test(); }
    if (!res) return null;
    (U.impacts = U.impacts || []).push(res); if (U.impacts.length > 40) U.impacts.shift();
    return res;
  };
  // The mace's two blows, for every screen that draws one (ui/realtime.js, ui/warday.js): the wind-up pose, the pose the
  // blow ends in (aimed by U.aimBlow), and where on the body it falls.
  // thru: the follow-through once the blow has landed on the body (the strike and defence study: the smash stopped level
  // and was held there like a push): its pose, how much further the arm and the weapon turn on from where they struck, and
  // how far the arm may go (the smash no further down than about 50 degrees below level: the owner, 6 November, did not
  // want a mace pointing into the ground).
  U.MACE_ARCS = { smash: { up: "smashUp", end: "smash", at: "high", thru: { pose: "smashThru", arm: 40, item: 12, lim: -40 } },
    sweep: { up: "sweepBack", end: "sweep", at: "mid", thru: { pose: "sweepThru", arm: -45, item: -12, lim: -150 } } };
  U.POSES = POSES; // (for the pose checks: tests and screenshots)
  // Every weapon's blows (owner, 4 November): a sword cuts down from a raised wind-up twice and thrusts the third time; a
  // spear thrusts; a dagger stabs; a club, a hammer or a staff comes down overhead; a fist punches. U.arcFor(weapon, n)
  // names the arc of a weapon's n-th blow (the mace's own two come from the engine).
  U.ARCS = Object.assign({ cut: { up: "cutUp", end: "strike", at: "high", near: 0.82, thru: { pose: "cutThru", arm: 40, item: 14, lim: -25 } },
    thrust: { up: "thrustBack", end: "thrust", at: "mid", under: true, straight: true },
    stab: { up: "stabBack", end: "thrust", at: "mid", under: true, straight: true }, drive: { up: "stabLow", end: "drive", at: "mid", under: true },
    punch: { up: "stabBack", end: "thrust", at: "mid", straight: true } }, U.MACE_ARCS);
  U.arcFor = function (w, n) {
    n = n || 0;
    if (w === "sword" || w === "woodsword") return n % 3 === 2 ? "thrust" : "cut";
    if (w === "spear") return "thrust";
    if (w === "dagger") return "stab";
    if (w === "mace") return n % 2 ? "sweep" : "smash";
    if (w === "club" || w === "hammer" || w === "staff") return "smash";
    if (w === "fist") return "punch";
    return "cut";
  };
  U.rigs = { clear() { live.clear(); }, size: () => live.size, thaw() { frozen = 0; } };
  U.RIG_POSES = POSES;
  U.wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // A leather arrow flying from a to b (points inside host; b may be a function, followed each frame)
  // along an arc; resolves on arrival with the arrow element (kept when stay is set, e.g. pinned in the ground).
  const ARROW = '<svg viewBox="0 0 100 14" preserveAspectRatio="none"><path d="M0 1 L16 7 L0 13 L5 7 Z M7 1 L21 7 L7 13 L11 7 Z" fill="#c8402c" stroke="#24120a" stroke-width="1"/><rect x="9" y="5.2" width="77" height="3.6" rx="1" fill="#e6c98c" stroke="#24120a" stroke-width="1"/><path d="M84 3 L99 7 L84 11 L87 7 Z" fill="#dcd7c8" stroke="#24120a" stroke-width="1"/></svg>';
  // meta: who looses it at whom ({ from, to, kind }), kept on the arrow for the screen-fit check.
  U.flyArrow = function (host, a, b, arc, ms, stay, len, meta) {
    return new Promise((res) => {
      const el = document.createElement("div"); el.className = "fly-arrow"; el.innerHTML = ARROW;
      if (meta) for (const k in meta) el.dataset[k] = meta[k];
      if (len) { el.style.width = len + "px"; el.style.height = Math.max(5, len * 0.17) + "px"; }
      host.appendChild(el);
      const w = el.offsetWidth, h = el.offsetHeight;
      let t0 = 0; // its clock starts on the first frame it is drawn in, so it is first seen at the bow, never half way
      // b may be a function: where the target is now, each frame (it does not hold still to be hit).
      const to = typeof b === "function" ? b : () => b;
      // a too: a function is followed for the first fifth of the flight (the bow, as the arrow leaves it).
      let A = typeof a === "function" ? null : a;
      const at = (t) => { const e = to(); return { x: A.x + (e.x - A.x) * t, y: A.y + (e.y - A.y) * t - arc * 4 * t * (1 - t) }; };
      const f = (now) => {
        if (!t0) t0 = now;
        if (typeof a === "function" && (!A || (now - t0) < ms * 0.2)) A = a(); // leaving the bow, it leaves from where the bow is (the archer still moving)
        const t = reduced() ? 1 : Math.min(1, (now - t0) / ms), p = at(t), q = at(Math.min(1, t + 0.02)), p0 = at(Math.max(0, t - 0.02));
        const ang = Math.atan2(q.y - p0.y, q.x - p0.x);
        el.style.transform = "translate(" + (p.x - w) + "px," + (p.y - h / 2) + "px) rotate(" + ang + "rad)";
        if (t < 1 && el.isConnected) requestAnimationFrame(f);
        else { el.dispatchEvent(new CustomEvent("arrowland", { bubbles: true })); if (!stay) el.remove(); res(el); } // (heard by the screen-fit check, before it goes)
      };
      requestAnimationFrame(f);
    });
  };
  // Small pieces thrown from a point inside host: leather flakes, sparks, green motes.
  U.flingBits = function (host, cls, at, n, spread, colour, up) {
    if (reduced() || !host) return;
    for (let i = 0; i < n; i++) {
      const f = document.createElement("i"); f.className = "bit " + cls; if (colour) f.style.background = i % 3 ? colour : "#e2b55a";
      f.style.left = (at.x + (Math.random() - 0.5) * spread) + "px"; f.style.top = (at.y + (Math.random() - 0.5) * spread * 0.6) + "px"; host.appendChild(f);
      const dx = (Math.random() - 0.5) * 90, dy = up ? -(50 + Math.random() * 70) : 30 + Math.random() * 70;
      const an = f.animate([{ transform: "translate(0,0) rotate(0)", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px) rotate(" + (Math.random() * 540 - 270) + "deg)", opacity: 0 }], { duration: (up ? 1000 : 650) + Math.random() * 400, easing: "cubic-bezier(.2,.6,.4,1)" });
      an.onfinish = () => f.remove();
    }
  };
})(window.K = window.K || {});
