/* Battle screen-fit check: does every puppet in every fight stay on the stage and on the screen?
   Plays every fight in K.ENCOUNTERS in a real browser with motion on (the live spring rigs only run
   with motion), on an upright phone (iPhone 15, 393×852, with its notch and home bar) and a laptop
   (1280×720), in Chromium and WebKit, and at each moment of the fight:
     start            the fight as it opens
     moves            three rounds of blows both ways (lunges, knock-backs, arrows, kneeling)
     allies           a friend joins (a champion, Bhima, comes on from the edge)
     one-falls        one of several foes falls (the others stay in sight)
     win              the last foe falls, in slow motion with the stage's zoom
     lose             the fight played again, and you fall
   it follows every figure frame by frame for the moment's length and measures the painted parts of
   each one (the union of the boxes of its shapes: body, limbs, crown, weapon; and the things: an
   elephant, a cart, the Narayana weapon's light), and flags:
     - any part past the left, right or bottom of the stage (#arena), or past any edge of the screen,
       by more than TOL px (a figure coming on from the edge is let off for its entrance);
     - a standing figure that cannot be seen (no size, or faded out);
     - an arrow that does not leave from the bow in the archer's hand (within 8 px), or does not land on
       the body of the one it was loosed at (a pinning shot: at his foot), in the moves of the fight and in
       a pass as an archer (an aimed shot, a volley, a pinning shot);
     - a standing figure mostly hidden behind another drawn in front of it (more than OVERLAP of its body,
       arms and weapons aside), at rest at the end of each moment.
   The fights played live (a chariot duel, an archery duel, a mace duel, a carry: ui/fightmodes.js)
   are checked on their own test stage, at the start and while being played.
   A fallen figure's weapon, dropped beside it, is part of its painted box, so it is held to the same edges.
   The old turn-based screen (ui/battle.js) is only reached under the test-only override K.prefs({ oldFights: true })
   (engine/realtime.js RT.old), which this check sets: players get the real-time and war-day screens (checked by
   tests/rtfit.js and tests/warfit.js). Every figure is also held to the stowed-weapon rule: a weapon put by for
   another (Rig.wield) is not drawn, and a bow slung on the back is never over 60% of the figure high or above the head.
   Usage: node tests/battlefit.js [--browser chromium|webkit|all] [--device phone|desktop|all]
          [--fights id,id] [--jobs N] [--shots DIR [--shots-all]] [--out report.json]      (npm run test:battlefit)
   Writes a JSON report (default /tmp/battlefit.json, or --out) and a summary; exits 1 on any problem.
   Needs Playwright with Chromium and WebKit (an engine not installed is skipped and named in the summary).
   Each device runs in its own browser at once; --jobs N plays N fights at a time on each (default 1:
   on a busy machine the figures' springs run in slow motion, so the check waits for them to settle). */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BROWSERS = (arg("--browser", "all") === "all" ? "chromium,webkit" : arg("--browser")).split(",");
const DEV = arg("--device", "all");
const ONLY = arg("--fights", "") ? arg("--fights").split(",") : null;
const JOBS = parseInt(arg("--jobs", "1"), 10);
const SHOTS = arg("--shots", "");
const SHOTS_ALL = process.argv.includes("--shots-all"); // a screenshot of every moment, not only the failing ones
const OUT = arg("--out", "/tmp/battlefit.json");
const ROOT = path.join(__dirname, "..");
const TOL = 4;         // px a painted part may stray past an edge (anti-aliasing, a drop shadow's sub-pixel)
const OVERLAP = 0.6;   // share of a standing figure's body that may lie behind another
const skipped = new Set();

const DEVICES = [
  { name: "iPhone 15", kind: "phone", w: 393, h: 852, sat: 59, sab: 34, mobile: true },
  { name: "Laptop", kind: "desktop", w: 1280, h: 720, sat: 0, sab: 0, mobile: false }
].filter((d) => DEV === "all" || d.kind === DEV);

function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".woff2": "font/woff2" };
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
    if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(p, (err, buf) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": types[path.extname(p)] || "application/octet-stream" });
      res.end(buf);
    });
  });
  return new Promise((ok) => srv.listen(0, "127.0.0.1", () => ok(srv)));
}

// ---------- In the page: measuring the figures ----------
function pageHelpers() {
  const SHAPES = "path,rect,circle,ellipse,polygon,polyline,line,use,image,text";
  // The painted box of one figure: the union of its visible shapes (a shape whose group is faded to
  // nothing, like the bow's nocked arrow at rest, does not count).
  // core: the figure without its arms and what it holds (for telling whether one figure hides another;
  // an arm or a spear reaching across a friend hides nothing that matters).
  function boxOf(svg, core) {
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const s of svg.querySelectorAll(SHAPES)) {
      if (s.closest('[opacity="0"], defs, clipPath, mask, .rod')) continue; // the faint rod under a resting puppet is not part of the figure
      if (core && !svg.classList.contains("thing") && s.closest(".armF, .armB, .it, .it-w")) continue;
      const q = s.getBoundingClientRect();
      if (q.width < 0.5 && q.height < 0.5) continue;
      l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
    }
    return l === Infinity ? null : { l, t, r, b };
  }
  function seen(el) {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return 0;
      o *= parseFloat(cs.opacity);
    }
    return o;
  }
  function actors() {
    const arena = document.getElementById("arena");
    if (arena) {
      const hr = arena.getBoundingClientRect();
      const list = [...arena.querySelectorAll(".actor")].map((el) => {
        const svg = el.querySelector("svg.pp");
        const side = el.classList.contains("enemy") ? "enemy" : el.classList.contains("ally") ? "ally" : "player";
        return { uid: el.dataset.uid, side, down: el.classList.contains("down"), box: svg ? boxOf(svg) : null, core: svg ? boxOf(svg, true) : null, op: svg ? seen(svg) : 0, thing: !!(svg && svg.classList.contains("thing")) };
      });
      return { mode: "arena", host: { l: hr.left, t: hr.top, r: hr.right, b: hr.bottom }, vw: innerWidth, vh: innerHeight, list };
    }
    // A fight played live, as a test: the figures of its cast (when the test shows them), and the
    // chariots on its course.
    const trial = document.querySelector(".trial");
    if (!trial) return null;
    const cast = trial.querySelector(".cast"), track = trial.querySelector(".track");
    const host = (track && track.offsetParent && track) || (cast && seen(cast) > 0 && cast) || trial;
    const hr = host.getBoundingClientRect();
    const els = [...(cast && seen(cast) > 0 ? cast.querySelectorAll(".actor") : []), ...trial.querySelectorAll(".track .me, .track .rivalcar")];
    const list = els.filter((el) => seen(el) > 0).map((el) => {
      const svg = el.querySelector("svg") || el;
      const side = el.classList.contains("foe") || el.classList.contains("rivalcar") ? "enemy" : el.classList.contains("prop") ? "prop" : "player";
      return { uid: (el.className.baseVal ?? el.className).replace(/\s+/g, "."), side, down: false, box: boxOf(svg), core: boxOf(svg, true), op: seen(svg), thing: false };
    });
    return { mode: "live", host: { l: hr.left, t: hr.top, r: hr.right, b: hr.bottom }, vw: innerWidth, vh: innerHeight, list };
  }
  // How far a box strays past the stage and the screen, by edge.
  function strays(a, s) {
    const out = [];
    if (!a.box) return out;
    const B = a.box, H = s.host;
    const add = (where, d) => { if (d > 0) out.push([where, d]); };
    if (s.mode === "arena") { add("left of the stage", H.l - B.l); add("right of the stage", B.r - H.r); add("below the stage", B.b - H.b); }
    add("off the left of the screen", -B.l); add("off the right of the screen", B.r - s.vw); add("off the top of the screen", -B.t); add("off the bottom of the screen", B.b - s.vh);
    return out;
  }
  // Watch the figures every frame for ms: the worst stray of each; then, once everyone has come to
  // rest (no one still stepping in or eased back), the last frame. A friend coming on from the edge of
  // the stage (skip) is let off until he has arrived. (On a slow machine the figures move in slow
  // motion, as the springs never step more than 33 ms at a time: so it waits on them, not on the clock.)
  const shiftOf = (uid) => { const el = document.querySelector('#arena .actor[data-uid="' + uid + '"]'); return el ? Math.abs(parseFloat(el.style.translate) || 0) : 0; };
  function watch(ms, skip) {
    return new Promise((ok) => {
      const t0 = performance.now(), worst = {};
      let frames = 0;
      const f = () => {
        const s = actors();
        if (s) {
          frames++;
          const dt = performance.now() - t0;
          for (const a of s.list) {
            if (skip && skip.includes(a.uid) && shiftOf(a.uid) > 6) continue; // coming on from the edge
            // A body still toppling (its rig falling, not yet at rest) is let off the stage's foot: its slack limbs
            // and weapon swing past the ground for a moment and come to rest on the stage (on GitHub's slower runner,
            // hold_bhima and hold_arjuna on an iPhone 15: 6-12 px mid-fall, then at rest 16 px inside; here, once in 71 fights).
            // Once it lies still it is held to the foot again.
            const rig = window.K && K.UI.battleRigs && K.UI.battleRigs().get(a.uid), toppling = !!(rig && rig.falling && rig.fallV);
            for (const [where, d] of strays(a, s)) {
              if (toppling && where === "below the stage") continue;
              const k = a.uid + "|" + where;
              if (!worst[k] || worst[k].d < d) worst[k] = { uid: a.uid, side: a.side, down: a.down, where, d: Math.round(d), at: Math.round(dt), box: a.box, host: s.host };
            }
          }
        }
        const moving = s && s.mode === "arena" && s.list.some((a) => shiftOf(a.uid) > 3 || (window.K && K.UI.battleRigs && [...K.UI.battleRigs().values()].some((r) => r.falling && r.fallV)));
        if (performance.now() - t0 < ms || (moving && performance.now() - t0 < ms + 4000)) requestAnimationFrame(f);
        else ok({ worst: Object.values(worst), last: actors(), frames });
      };
      requestAnimationFrame(f);
    });
  }
  function overlaps(s) {
    const out = [];
    if (!s) return out;
    const up = s.list.filter((a) => !a.down && a.core && a.side !== "prop");
    for (let i = 0; i < up.length; i++) for (let j = i + 1; j < up.length; j++) {
      const A = up[i].core, Bx = up[j].core;
      const w = Math.min(A.r, Bx.r) - Math.max(A.l, Bx.l), h = Math.min(A.b, Bx.b) - Math.max(A.t, Bx.t);
      if (w <= 0 || h <= 0) continue;
      // The list is in drawing order: the later figure stands in front, so it is the earlier one that
      // is hidden (a rider at an elephant's heels hides a little of the elephant, not himself).
      const share = (w * h) / ((A.r - A.l) * (A.b - A.t));
      if (share > 0) out.push({ a: up[i].uid, b: up[j].uid, sides: up[i].side + "/" + up[j].side, share: Math.round(share * 100) / 100, boxes: [A, Bx].map((x) => [x.l, x.r, x.t, x.b].map(Math.round).join(",")).join(" / ") });
    }
    return out;
  }
  // Arrows: where each one starts (by the bow in the archer's hand) and where it lands (on the body of
  // the one it was loosed at; a pinning shot at his foot). Its head is found by a dot put at its tip.
  const tipOf = (fa, tail) => { const svg = fa.querySelector("svg"); if (!svg) return null; const d = document.createElementNS("http://www.w3.org/2000/svg", "circle"); d.setAttribute("cx", tail ? "1" : "99"); d.setAttribute("cy", "7"); d.setAttribute("r", "0.5"); svg.appendChild(d); const q = d.getBoundingClientRect(); d.remove(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; };
  const actorOf = (uid) => document.querySelector('#arena .actor[data-uid="' + uid + '"]');
  const bowBox = (uid) => { const el = actorOf(uid), svg = el && el.querySelector("svg.pp"); if (!svg) return null; const b = [...svg.querySelectorAll(".pp-body .it:not(.it-w)")].find((x) => x.style.display !== "none" && x.querySelector('path[d^="M50 86 L"]')); const r = (b || svg.querySelector(".foreF") || svg).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, bow: !!b, down: el.classList.contains("down") }; };
  window.__arrows = [];
  const seenArrow = new WeakSet();
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === "childList") for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains("fly-arrow") && n.dataset.from && !seenArrow.has(n)) {
        seenArrow.add(n);
        const rec = { from: n.dataset.from, to: n.dataset.to, kind: n.dataset.kind, at: performance.now() };
        window.__arrows.push(rec);
        requestAnimationFrame(() => { rec.start = tipOf(n); rec.tail = tipOf(n, 1); rec.bow = bowBox(rec.from); });
        n._rec = rec;
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
  // Where it lands: heard as it arrives, before it is taken away.
  document.addEventListener("arrowland", (e) => {
    const n = e.target, rec = n._rec; if (!rec || rec.end) return;
    const el = actorOf(rec.to);
    rec.end = tipOf(n);
    rec.body = el ? boxOf(el.querySelector("svg.pp"), true) : null;
  }, true);
  // A weapon put by or carried on the back (Rig.wield hides the one put by; a slung bow is thin, at the back):
  // never drawn beside the weapon in hand, never more than 60% of the figure high, never above the head.
  function stowed() {
    const out = [];
    for (const svg of document.querySelectorAll(".actor svg.pp")) {
      const head = svg.querySelector(".head"), body = svg.querySelector(".pp-body");
      if (!head || !body || svg.classList.contains("dead")) continue;
      const hb = head.getBoundingClientRect(), fh = svg.getBoundingClientRect().height, who = (svg.closest(".actor") || {}).dataset || {};
      if (!fh || !hb.height) continue;
      const vis = (g) => { for (let n = g; n && n !== svg; n = n.parentNode) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; } return true; };
      const items = [...body.querySelectorAll(".it")].filter(vis);
      if (items.some((g) => g.classList.contains("it-tmp")) && items.length > 1) out.push((who.uid || "?") + ": a weapon put by is drawn beside the one in hand (" + items.map((g) => g.dataset.k).join(", ") + ")");
      for (const g of [...body.querySelectorAll(".it-back")].filter(vis)) { const b = g.getBoundingClientRect(); if (b.height > fh * 0.6 || b.top < hb.top - 2) out.push((who.uid || "?") + ": a weapon on the back drawn " + Math.round(b.height / fh * 100) + "% of the figure high" + (b.top < hb.top - 2 ? ", above the head" : "")); }
    }
    return out;
  }
  window.__fit = { actors, watch, overlaps, boxOf, stowed };
}

// ---------- Driving a fight ----------
const MODES = ["duel", "melee", "hold", "rounds", "escort", "breakthrough", "weather", "chariot", "range", "mace", "carry"];
const EARLY = { e_dream: [9, 1], e_ugra: [15, 2], e_spar: [17, 2], e_panchala: [17, 2], e_border: [19, 3], e_kings: [24, 3], e_jayadratha: [30, 4], e_gandharva: [30, 4], e_sudatta: [30, 4],
  e_cattle: [33, 5], e_cattle_k: [33, 5], e_bandits: [24, 3] };
function setup(id, side, path) {
  const S = K.S = K.newLife({ name: "Asha" });
  const [age, act] = window.__EARLY[id] || [44, 6];
  Object.assign(S, { origin: "panchala", pronoun: "she", heirloom: "bow", // the old bow slung on the back (puppet.js .it-back), held to the stowed-weapon check
    temperament: "bold", teacher: "drona", path: path || "mace", age, act, side: side || "pandava", at: "hastinapura" });
  S.briefed = window.__MODES.slice(); S.fightTour = 1; S.storyMode = true;
  S.flags.push("role_command");
  try { K.go(act >= 6 ? "a6_capture" : "a2_trial"); } catch (e) { /* the scene is only a frame for the fight */ }
  K.UI.startBattle(id, () => {});
  const B = K.Combat.state();
  return { mode: B && B.mode, units: B ? B.units.length : 0 };
}

async function runFight(page, id, o, rec, shot) {
  const ev = (fn, a) => page.evaluate(fn, a);
  const moments = [];
  let arrowsChecked = 0;
  const look = async (name, ms, skip) => {
    // A dream fight ends by itself as it is won or lost (the field goes white and the story wakes): after
    // that there is no stage to measure.
    if (!(await ev(() => !!K.Combat.state() && !document.querySelector(".dream-white")))) { moments.push({ moment: name + ": no fight on screen (over)", frames: 0, problems: [], worstPx: 0, skipped: true }); return null; }
    const r = await ev(([ms, skip]) => window.__fit.watch(ms, skip), [ms, skip || null]);
    const probs = [];
    // Where it was then, against the stage, and where it lay once all had come to rest (a figure the game puts back
    // on the stage, as a fallen body is lifted onto its foot, ends inside it).
    const xy = (b) => b ? "x " + Math.round(b.l) + "–" + Math.round(b.r) + ", y " + Math.round(b.t) + "–" + Math.round(b.b) : "none";
    for (const w of r.worst) if (w.d > TOL) { const L = r.last && r.last.list.find((a) => a.uid === w.uid); probs.push(w.uid + " (" + w.side + (w.down ? ", fallen" : "") + ") " + w.d + "px " + w.where + " at " + w.at + "ms (figure " + xy(w.box) + "; stage " + xy(w.host) + "; at rest " + (L ? xy(L.box) : "gone") + ")"); }
    if (r.last) {
      for (const a of r.last.list) if (!a.down && a.side !== "prop" && (!a.box || a.op < 0.2)) probs.push(a.uid + " (" + a.side + ") cannot be seen" + (a.box ? " (opacity " + a.op.toFixed(2) + ")" : " (no size)"));
      const ov = await ev((s) => window.__fit.overlaps(s), r.last);
      for (const w of await ev(() => window.__fit.stowed())) probs.push(w);
      for (const v of ov) if (v.share > OVERLAP) probs.push(v.a + " and " + v.b + " (" + v.sides + ") overlap: " + Math.round(v.share * 100) + "% of " + v.a + " hidden behind " + v.b + " (" + v.boxes + ")");
    }
    // The arrows loosed in this moment.
    const arrows = await ev(() => { const a = window.__arrows.filter((x) => x.start && x.end); window.__arrows = window.__arrows.filter((x) => !(x.start && x.end)); return a; });
    for (const a of arrows) {
      const B = a.bow, s = a.start, e = a.end, T = a.body;
      // As it is loosed the arrow lies across the bow: its shaft, tail to head, passes within 8 px of it.
      if (B && s && !B.down) { const tl = a.tail || s; let d = Infinity; for (let i = 0; i <= 10; i++) { const x = tl.x + (s.x - tl.x) * i / 10, y = tl.y + (s.y - tl.y) * i / 10; d = Math.min(d, Math.hypot(Math.max(B.l - x, 0, x - B.r), Math.max(B.t - y, 0, y - B.b))); } if (Math.round(d) > 8) probs.push("arrow (" + a.kind + ") from " + a.from + " starts " + Math.round(d) + "px from " + (B.bow ? "the bow" : "the hand (no bow)") + " (at " + Math.round(s.x) + "," + Math.round(s.y) + "; bow " + [B.l, B.r, B.t, B.b].map(Math.round).join(",") + ")"); else if (!B.bow) probs.push("arrow (" + a.kind + ") from " + a.from + " loosed without a bow in hand"); }
      if (T && e) {
        const m = 3, inBox = e.x >= T.l - m && e.x <= T.r + m && e.y >= T.t - m && e.y <= T.b + m;
        const atFoot = e.y >= T.t + (T.b - T.t) * 0.7 - m && e.x >= T.l - 12 && e.x <= T.r + 12 && e.y <= T.b + 12;
        if (a.kind === "pin" ? !atFoot : !inBox) probs.push("arrow (" + a.kind + ") from " + a.from + " lands " + (a.kind === "pin" ? "away from the foot of " : "off the body of ") + a.to + " (at " + Math.round(e.x) + "," + Math.round(e.y) + "; body " + [T.l, T.r, T.t, T.b].map(Math.round).join(",") + ")");
      }
    }
    arrowsChecked += arrows.length;
    const worstPx = Math.max(0, ...r.worst.map((w) => w.d));
    moments.push({ moment: name, frames: r.frames, problems: probs, worstPx });
    if (shot) await shot(name, probs.length);
    return r;
  };
  const wait = (ms) => page.waitForTimeout(ms);
  // Your move: the first ready move aimed at a foe (or any ready move); the foes kept standing unless asked.
  const act = (o2) => ev((o2) => {
    const C = K.Combat, B = C.state(); if (!B || B.over) return "over";
    const p = C.player();
    if (o2.heal) p.hp = p.maxHp;
    const foes = B.units.filter((u) => u.side === "enemy" && u.hp > 0);
    const av = C.available().filter((a) => !a.why && !a.idle && a.id !== "call" && a.id !== "astra");
    const pick = (o2.ids || []).map((i) => av.find((a) => a.id === i)).find(Boolean) || av.find((a) => a.target === "enemy") || av[0];
    if (!pick) return "none";
    const t = o2.target != null ? foes[o2.target] : foes[0];
    C.act(pick.id, t ? t.uid : null);
    return pick.id;
  }, o2);

  const s = await ev(([id]) => window.__setup(id), [id]);
  await wait(900);
  if (s.mode) {
    // A fight played live, as its test: at the start, and as it is played (a few presses).
    await look("start", 600);
    await ev(() => { const b = document.querySelector(".trial .cta"); if (b) b.click(); });
    await wait(300);
    for (let i = 0; i < 3; i++) { await page.keyboard.press(i % 2 ? "ArrowUp" : "Space").catch(() => {}); await look("playing " + (i + 1), 900); }
    await ev(() => { const B = K.Combat.state(); if (B && !B.over) K.Combat.settle("win", 1); });
    rec.push({ fight: id, live: s.mode, moments });
    return;
  }
  const allies = await ev(() => { const B = K.Combat.state(); return B ? B.units.filter((u) => u.side === "ally").map((u) => u.uid) : []; });
  await look("start", 700, allies);
  // Three rounds of blows both ways: your path's moves and the plain strike.
  for (const ids of [["crush", "strike"], ["strike"], ["quake", "heavy", "strike"]]) { await act({ ids, heal: true }); await look("moves", 1100); }
  // A friend joins: Bhima, a champion of full height, comes on from the edge of the stage.
  const joined = await ev(() => {
    const C = K.Combat, B = C.state(); if (!B || B.over) return null;
    if (B.units.some((u) => u.person === "bhima")) return null;
    const a = B.join(K.UNITS.bhima(K.S), 3); K.emit("combat", B); return a.uid;
  });
  if (joined) { await look("allies", 1400, [joined]); await act({ ids: ["strike"], heal: true }); await look("allies moves", 1100); }
  // One of several foes falls.
  const many = await ev(() => { const B = K.Combat.state(); return B ? B.units.filter((u) => u.side === "enemy" && u.hp > 0).length : 0; });
  if (many >= 2) {
    for (let i = 0; i < 6; i++) {
      const left = await ev(() => { const B = K.Combat.state(); if (!B || B.over) return -1; const f = B.units.filter((u) => u.side === "enemy" && u.hp > 0); f.slice(1).forEach((u) => { u.hp = u.maxHp; }); f[0].hp = 1; f[0].def = 0; return f.length; });
      if (left < many) break;
      await act({ ids: ["strike"], heal: true, target: 0 }); await wait(250);
    }
    await look("one falls", 1500);
  }
  // The win: every foe brought down, the last in slow motion.
  for (let i = 0; i < 12; i++) {
    const over = await ev(() => { const B = K.Combat.state(); if (!B || B.over) return true; const p = K.Combat.player(); p.hp = p.maxHp; B.units.filter((u) => u.side === "enemy" && u.hp > 0).forEach((u) => { u.hp = 1; u.def = 0; u.atk = 0; }); return false; });
    if (over) break;
    await act({ ids: ["quake", "volley", "strike"], heal: true }); await wait(120);
  }
  const won = await ev(() => { const B = K.Combat.state(); return B && B.over; });
  await look("win (" + (won || "not over") + ")", 2400);
  // The fight again, as an archer: an aimed shot, a volley and a pinning shot (each arrow out of your bow
  // and onto its man); and this time you fall.
  await ev(([id]) => window.__setup(id, null, "archer"), [id]);
  await wait(900);
  for (const shot of ["aimed", "volley", "pin"]) {
    await ev(() => { const B = K.Combat.state(); if (B && !B.over) B.units.filter((u) => u.side === "enemy" && u.hp > 0).forEach((u) => { u.hp = u.maxHp; }); });
    await act({ ids: [shot], heal: true }); await look("archer: " + shot, 1300);
  }
  // A heavy blow as an archer: a sword drawn for it (Rig.wield), the bow put by and not drawn at all.
  if (await ev(() => { const B = K.Combat.state(), p = K.Combat.player(); if (!B || B.over || B.mode || !p) return false; if (!p.abilities.includes("heavy")) p.abilities.push("heavy"); p.cds.heavy = 0; return true; })) {
    await act({ ids: ["heavy"], heal: true }); await look("archer: a sword drawn", 900);
  }
  for (let i = 0; i < 14; i++) {
    const over = await ev(() => { const B = K.Combat.state(); if (!B || B.over) return true; const p = K.Combat.player(); p.hp = 1; p.def = 0; B.units.filter((u) => u.side === "enemy" && u.hp > 0).forEach((u) => { u.hp = u.maxHp; u.atk = 999; }); B.units.filter((u) => u.side === "ally").forEach((u) => { u.status.taunt = 0; delete u.status.taunt; }); return false; });
    if (over) break;
    await act({ ids: ["strike"] }); await wait(120);
  }
  const lost = await ev(() => { const B = K.Combat.state(); return B && B.over; });
  await look("lose (" + (lost || "not over") + ")", 1800);
  rec.push({ fight: id, moments, arrows: arrowsChecked });
}

async function runCombo(pw, bname, d, base, fights, report) {
  let browser;
  try { browser = await pw[bname].launch(); } catch (e) { console.log("· " + bname + ": not installed here, skipped (" + e.message.split("\n")[0] + ")"); skipped.add(bname); return; }
  const queue = fights.slice();
  const worker = async () => {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: SHOTS ? 2 : 1, isMobile: d.mobile && bname !== "firefox", hasTouch: d.mobile });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message + " @ " + String(e.stack || "").split("\n").slice(1, 3).map((l) => l.trim().replace(/^at /, "").replace(/http:\/\/127.0.0.1:\d+\//, "")).join(" < ")));
    // No web fonts, as in the other fit checks (rtfit, warfit, blowfit). On GitHub's runner they come over the network
    // and can land mid-fight, re-flowing the page under the figures: the nightly run there found the fallen player 6 px
    // below the stage (hold_arjuna, iPhone 15, as you lose), which never showed on a machine with the fonts installed.
    await page.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
    await page.goto(base + "/");
    await page.waitForFunction(() => window.K && K.UI && K.UI.renderScene);
    await page.addStyleTag({ content: `:root{--sat:${d.sat}px!important;--sab:${d.sab}px!important}` });
    await page.evaluate(([early, modes, setupSrc]) => { localStorage.clear(); K.prefs({ oldFights: true, gradual: true, beats: false, sound: false, timed: false, living: false }); window.__EARLY = early; window.__MODES = modes; window.__setup = eval("(" + setupSrc + ")"); }, [EARLY, MODES, setup.toString()]);
    await page.evaluate("(" + pageHelpers.toString() + ")()");
    while (queue.length) {
      const id = queue.shift(), rec = [];
      const tag = bname + "-" + d.kind + "-" + id;
      const shot = SHOTS ? async (moment, bad) => { if (!bad && !SHOTS_ALL) return; const f = path.join(SHOTS, tag + "-" + moment.replace(/\W+/g, "_") + ".png"); await page.screenshot({ path: f }).catch(() => {}); } : null;
      const e0 = errors.length;
      try { await runFight(page, id, d, rec, shot); }
      catch (e) { rec.push({ fight: id, moments: [{ moment: "run", problems: ["run failed: " + e.message.split("\n")[0]] }] }); }
      for (const r of rec) { r.browser = bname; r.device = d.name; if (errors.length > e0) r.moments.push({ moment: "script errors", problems: errors.slice(e0).map((m) => "error: " + m) }); report.push(r); }
      const bad = rec.flatMap((r) => r.moments.filter((m) => m.problems.length));
      process.stdout.write((bad.length ? "✗" : "·"));
      // Leave the fight, so the next one starts clean.
      // Leave the fight the way a player does (Continue; a dream wakes by itself), so no timer of this
      // fight is left to end the next one.
      await page.evaluate(() => { const C = K.Combat; if (C.state() && !C.state().over) C.settle("win", 1); });
      for (let i = 0; i < 40 && (await page.evaluate(() => !!K.Combat.state())); i++) {
        await page.evaluate(() => { const b = document.querySelector("#battle-actions .result ~ .cta"); if (b) b.click(); });
        await page.waitForTimeout(100);
      }
      await page.evaluate(() => { document.querySelectorAll(".fbrief-wrap, .fm-beat, .dream-white").forEach((n) => n.remove()); });
    }
    await ctx.close();
  };
  await Promise.all(Array.from({ length: JOBS }, worker));
  await browser.close();
}

(async () => {
  let pw;
  try { pw = require("playwright"); } catch (e) { console.error("Playwright is not installed"); process.exit(2); }
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const srv = await serve();
  const base = "http://127.0.0.1:" + srv.address().port;
  // The list of fights, from the game itself.
  let fights;
  {
    const b = await pw.chromium.launch(); const p = await b.newPage();
    await p.goto(base + "/"); await p.waitForFunction(() => window.K && K.ENCOUNTERS);
    fights = await p.evaluate(() => Object.keys(K.ENCOUNTERS));
    await b.close();
  }
  if (ONLY) fights = fights.filter((f) => ONLY.includes(f));
  const report = [];
  const t0 = Date.now();
  await Promise.all(BROWSERS.flatMap((bn) => DEVICES.map((d) => runCombo(pw, bn, d, base, fights, report))));
  srv.close();
  console.log("");
  report.sort((a, b) => (a.fight + a.browser + a.device).localeCompare(b.fight + b.browser + b.device));
  const nMoments = report.reduce((n, r) => n + r.moments.filter((m) => !m.skipped).length, 0);
  const nArrows = report.reduce((n, r) => n + (r.arrows || 0), 0);
  const bad = report.filter((r) => r.moments.some((m) => m.problems.length));
  for (const r of bad) for (const m of r.moments.filter((m) => m.problems.length)) console.log("✗ " + r.fight + " · " + r.browser + " · " + r.device + " · " + m.moment + "\n    " + m.problems.slice(0, 6).join("\n    "));
  fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), tol: TOL, overlap: OVERLAP, fights: fights.length, browsers: BROWSERS.filter((b) => !skipped.has(b)), skipped: [...skipped], devices: DEVICES.map((d) => d.name), runs: report }, null, 1));
  const ran = BROWSERS.filter((b) => !skipped.has(b));
  console.log("\n" + fights.length + " fights × " + DEVICES.length + " devices × " + ran.length + " engines (" + ran.join(", ") + (skipped.size ? "; not installed: " + [...skipped].join(", ") : "") + "): " + report.length + " runs, " + nMoments + " moments and " + nArrows + " arrows checked; " +
    bad.length + " runs with problems (" + report.reduce((n, r) => n + r.moments.filter((m) => m.problems.length).length, 0) + " moments) in " + Math.round((Date.now() - t0) / 1000) + "s. Report: " + OUT);
  process.exit(bad.length || !ran.length ? 1 : 0);
})();
