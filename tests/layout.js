/* Screen-fit checks: does every kind of screen fit, and play, on real device sizes?
   Runs the game in a real browser at phone, tablet and desktop sizes, upright and on their side,
   with stand-in safe areas for the notch and the home bar, and checks each screen:
     - nothing spills sideways (no horizontal scroll);
     - the top bar sits below the notch, in one row on phones, with tap targets of 40px or more;
     - the story page is no taller than what it holds (no blank brown band), stays on screen, and
       leaves some of the painting showing on an upright phone;
     - the choices are on screen without scrolling the page; text is phone-sized on phones;
     - on a phone on its side, the page sits beside the painting;
     - tests, fights, the journey, the homeland map and the menus fit the screen;
     - the act card and title card appear, fade by themselves and give way to a tap;
     - no script errors.
   Usage: node tests/layout.js [--browser chromium|webkit|firefox|all] [--only phone|tablet|desktop]
          [--shots DIR]   (saves a screenshot of every check)
   Exits 1 if any check fails. Needs Playwright (npm i -D playwright; npx playwright install). */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BROWSERS = (arg("--browser", "chromium") === "all" ? "chromium,webkit,firefox" : arg("--browser", "chromium")).split(",");
const ONLY = arg("--only", "");
const DEVICE = arg("--device", "");
const SHOTS = arg("--shots", "");
// Where the network cannot reach Google Fonts, --fonts DIR serves the same faces from Fontsource
// packages (fontsource-<family>-<version>/ folders), so text measures as it does for players.
const FONTS = arg("--fonts", "");
const ROOT = path.join(__dirname, "..");

// Device sizes in CSS pixels, with the insets the real devices have (top notch, home bar, sides).
const DEVICES = [
  { name: "iPhone SE", kind: "phone", w: 375, h: 667, sat: 20, sab: 0, mobile: true },
  { name: "iPhone 15", kind: "phone", w: 393, h: 852, sat: 59, sab: 34, mobile: true },
  { name: "iPhone 15 Pro Max", kind: "phone", w: 430, h: 932, sat: 59, sab: 34, mobile: true },
  { name: "Pixel 7", kind: "phone", w: 412, h: 915, sat: 24, sab: 16, mobile: true },
  { name: "iPad", kind: "tablet", w: 820, h: 1180, sat: 24, sab: 20, mobile: true },
  { name: "Laptop", kind: "desktop", w: 1280, h: 720, sat: 0, sab: 0, mobile: false },
  { name: "Desktop", kind: "desktop", w: 1440, h: 900, sat: 0, sab: 0, mobile: false },
];
const shapes = (d) => {
  const up = { ...d, orient: "portrait" };
  if (d.kind === "desktop") return [up];
  // On its side the notch moves to the left or right, and the home bar stays at the foot.
  const side = { ...d, orient: "landscape", w: d.h, h: d.w, sal: d.sat > 30 ? d.sat : 0, sar: d.sat > 30 ? d.sat : 0, sat: 0, sab: d.sab ? 21 : 0 };
  return [up, side];
};

// A tiny static server for the game folder.
function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".woff2": "font/woff2" };
  const srv = http.createServer((req, res) => {
    if (FONTS && req.url.startsWith("/__fonts/")) {
      const f = path.join(FONTS, decodeURIComponent(req.url.slice(9).split("?")[0]));
      return fs.readFile(f, (err, buf) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": "font/woff2" }); res.end(buf); });
    }
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

// ---------- Checks run inside the page ----------
// Each returns a list of problems (strings). `o` carries the device's insets and kind.
const PAGE = {
  common(o) {
    const out = [];
    const W = innerWidth, H = innerHeight;
    if (document.documentElement.scrollWidth > W + 1) out.push("page scrolls sideways (" + document.documentElement.scrollWidth + " > " + W + ")");
    // Under the full-screen "turn upright" card nothing else can be seen or touched, so only the card is checked there.
    const wide = o.underCard ? [] : [...document.querySelectorAll(".leaf, .modal, .trial, .arena, .bmap, .choice")].filter((e) => e.offsetParent && e.getBoundingClientRect().right > W + 1);
    if (wide.length) out.push(wide.length + " element(s) run past the right edge: " + wide.slice(0, 3).map((e) => (e.className.baseVal ?? e.className) + " (right " + Math.round(e.getBoundingClientRect().right) + " of " + W + ", width " + Math.round(e.getBoundingClientRect().width) + ", transform " + getComputedStyle(e).transform + ")").join(", "));
    return out;
  },
  topbar(o) {
    const out = [];
    const top = document.querySelector("header.top");
    if (!top || !document.body.classList.contains("inscene")) return out;
    const r = top.getBoundingClientRect();
    const btns = [...document.querySelectorAll("#nav button, #nav-standing")].filter((b) => b.offsetParent);
    for (const b of btns) {
      const br = b.getBoundingClientRect();
      if (br.top < o.sat - 1) out.push("top bar button under the notch (" + Math.round(br.top) + "px < " + o.sat + "px)");
      if (br.left < (o.sal || 0) - 1 || br.right > innerWidth - (o.sar || 0) + 1) out.push("top bar button off the side: " + (b.id || b.textContent));
      if (o.small && (br.width < 39.5 || br.height < 39.5)) out.push("tap target too small: " + b.id + " " + Math.round(br.width) + "×" + Math.round(br.height));
    }
    if (o.small) {
      const tops = new Set(btns.map((b) => Math.round(b.getBoundingClientRect().top / 8)));
      if (tops.size > 1) out.push("top bar wraps onto two rows");
      if (r.height > 64) out.push("top bar too tall (" + Math.round(r.height) + "px)");
    }
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i].getBoundingClientRect(), b = btns[j].getBoundingClientRect();
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push("top bar buttons overlap: " + btns[i].id + " / " + btns[j].id);
    }
    const where = document.getElementById("where");
    if (where && where.offsetParent && btns[0] && where.getBoundingClientRect().right > btns[0].getBoundingClientRect().left + 1) out.push("place text runs under the buttons");
    return out;
  },
  scene(o) {
    const out = [];
    const leaf = document.getElementById("leaf");
    if (!leaf || !leaf.classList.contains("split")) return ["the story page did not open"];
    const H = innerHeight, W = innerWidth;
    const lr = leaf.getBoundingClientRect();
    const head = document.querySelector("header.top").getBoundingClientRect();
    if (lr.bottom > H + 1) out.push("story page runs off the bottom (" + Math.round(lr.bottom) + " > " + H + ")");
    if (lr.top < head.bottom - 1) out.push("story page runs under the top bar");
    // Blank band: the story area taller than its own lines.
    const story = document.getElementById("story");
    if (story && story.lastElementChild) {
      const pad = parseFloat(getComputedStyle(story).paddingBottom) || 0;
      const scrolls = story.scrollHeight > story.clientHeight + 2;
      const gap = story.getBoundingClientRect().bottom - story.lastElementChild.getBoundingClientRect().bottom - pad;
      if (!scrolls && gap > 24) out.push("blank band of " + Math.round(gap) + "px in the story page");
      if (scrolls && story.clientHeight < 90) out.push("story squeezed to " + story.clientHeight + "px");
    }
    const acts = document.querySelector(".split .actions");
    if (acts && acts.scrollHeight > 0) {
      const gapA = acts.clientHeight - acts.scrollHeight;
      if (gapA > 24) out.push("blank band of " + gapA + "px under the choices");
    }
    // The page's heading stays one compact band (title beside the puppet, not under it).
    const ph = document.querySelector(".leaf.split > .pagehead");
    if (o.small && ph && ph.offsetHeight > 120) out.push("page heading too tall (" + ph.offsetHeight + "px)");
    // The choices: on screen, and the first one whole, without scrolling the page.
    const choices = [...document.querySelectorAll("#choices .choice")];
    if (!choices.length) out.push("no choices shown");
    const first = choices[0];
    if (first) {
      const cr = first.getBoundingClientRect();
      if (cr.top < head.bottom || cr.bottom > H - (o.sab || 0) + 1) out.push("first choice not fully on screen (" + Math.round(cr.top) + "–" + Math.round(cr.bottom) + " of " + H + ")");
      if (cr.height < 40) out.push("choice shorter than a tap target (" + Math.round(cr.height) + "px)");
    }
    const hiddenChoices = choices.filter((c) => { const r = c.getBoundingClientRect(), a = acts.getBoundingClientRect(); return r.bottom > a.bottom + 1; });
    if (hiddenChoices.length && acts.scrollHeight <= acts.clientHeight + 1) out.push(hiddenChoices.length + " choice(s) cut off and not scrollable");
    if (o.small) {
      const fs = parseFloat(getComputedStyle(story).fontSize);
      const big = document.body.classList.contains("big-text");
      if (!big && fs > 16.5) out.push("story text " + fs + "px on a phone (want ≤16)");
      const ct = first && first.querySelector(".t");
      if (ct && parseFloat(getComputedStyle(ct).fontSize) > 16.5) out.push("choice text " + getComputedStyle(ct).fontSize + " on a phone");
    }
    if (o.kind === "phone" && o.orient === "portrait" && o.short && lr.top < H * 0.18) out.push("short scene leaves almost none of the painting (page starts at " + Math.round(lr.top / H * 100) + "%)");
    if (o.orient === "landscape" && o.kind === "phone" && lr.width > W * 0.66) out.push("on its side, the page is not beside the painting (" + Math.round(lr.width / W * 100) + "% wide)");
    return out;
  },
  trial(o) {
    const out = [];
    const leaf = document.getElementById("leaf");
    const t = document.querySelector(".trial");
    if (!t) return ["the test did not open"];
    // A test on its painting fills the screen: no top bar, every control on screen and clear of
    // the notch and the home bar, the test's name below the notch.
    if (t.classList.contains("immersive")) {
      const W = innerWidth, H = innerHeight, r = t.getBoundingClientRect();
      if (r.width < W - 1 || r.height < H - 1) out.push("test does not fill the screen (" + Math.round(r.width) + "×" + Math.round(r.height) + ")");
      if (document.querySelector("header.top").offsetParent) out.push("top bar still showing during the test");
      const ctrls = [...t.querySelectorAll("button:not([disabled])")].filter((e) => e.offsetParent && getComputedStyle(e).visibility !== "hidden");
      const off = ctrls.filter((e) => { const b = e.getBoundingClientRect(); return b.bottom > H - (o.sab || 0) + 1 || b.top < (o.sat || 0) - 1 || b.left < -1 || b.right > W + 1; });
      if (off.length) out.push(off.length + " control(s) off screen or under the notch / home bar: " + off.slice(0, 3).map((e) => (e.textContent || e.className).trim().slice(0, 20)).join(", "));
      const name = t.querySelector(".t-name, .score");
      if (name && name.getBoundingClientRect().top < (o.sat || 0) - 1) out.push("test name under the notch");
      const tall = [...t.querySelectorAll(".trial-body > *")].filter((e) => e.offsetParent && e.getBoundingClientRect().bottom > H + 1);
      if (tall.length) out.push("part of the test runs off the bottom: " + tall.map((e) => e.className).join(", "));
      return out;
    }
    const H = innerHeight;
    const lr = leaf.getBoundingClientRect();
    if (lr.bottom > H + 1) out.push("test page runs off the bottom");
    // The page itself or the box inside it that holds the test: neither may need scrolling.
    const box = leaf.querySelector(".actions");
    const over = Math.max(leaf.scrollHeight - leaf.clientHeight, box ? box.scrollHeight - box.clientHeight : 0, Math.round(t.getBoundingClientRect().bottom - H));
    if (over > 4) out.push("test needs scrolling (" + over + "px more than the screen)");
    // Every control the player needs must be on screen.
    const ctrls = [...t.querySelectorAll("button:not([disabled]), .pt, .tile, [role=button]")].filter((e) => e.offsetParent);
    const off = ctrls.filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > H + 1 || r.top < 0; });
    if (off.length && over > 4) out.push(off.length + " control(s) off screen");
    return out;
  },
  battle(o) {
    const out = [];
    const leaf = document.getElementById("leaf");
    if (!document.querySelector(".arena")) return ["the fight did not open"];
    if (leaf.classList.contains("immersive")) {
      const W = innerWidth, H = innerHeight, r = leaf.getBoundingClientRect();
      if (r.width < W - 1 || r.height < H - 1) out.push("fight does not fill the screen");
      if (document.querySelector("header.top").offsetParent) out.push("top bar still showing during the fight");
      const acts = [...document.querySelectorAll("#battle-actions button")].filter((e) => e.offsetParent);
      if (!acts.length) out.push("no fight actions");
      const off = acts.filter((e) => { const b = e.getBoundingClientRect(); return b.bottom > H - (o.sab || 0) + 1 || b.right > W + 1 || b.left < -1; });
      if (off.length) out.push(off.length + " fight action(s) off screen or under the home bar");
      const figs = [...document.querySelectorAll("#arena .actor")].map((e) => e.getBoundingClientRect());
      if (figs.some((b) => b.right > W + 24 || b.left < -24)) out.push("a figure stands off the edge of the screen");
      if (figs.some((b) => b.height < 60)) out.push("figures too small to see");
      // Every standing enemy faces you: its figure is mirrored (a negative horizontal scale), whatever else it does.
      const away = [...document.querySelectorAll("#arena .actor.enemy:not(.down) .pp")].filter((e) => { const m = getComputedStyle(e).transform; const a = m && m !== "none" ? parseFloat(m.replace(/^matrix\(/, "").split(",")[0]) : 1; return !(a < 0); });
      if (away.length) out.push(away.length + " enemy figure(s) facing away from you");
      // On an upright screen the painting's ground meets the fighters' feet (dom.js U.groundFit).
      const L = document.querySelector("#backdrop .bdl.on"), pic = L && L.querySelector(".pic"), key = L && L.dataset.key;
      const gr = key && K.UI.upright() && K.UI.tallOf(key) ? K.UI.groundOf(key) : null, feet = K.UI.feetY();
      if (gr && feet && pic) { const pr = pic.getBoundingClientRect(), gy = pr.top + gr * pr.height; if (Math.abs(gy - feet) > H * 0.06) { const bd = document.getElementById("backdrop");
        // What the painting was fitted to, so a failure in one browser can be read from its report alone.
        const why = "mode " + (bd && bd.dataset.mode) + ", pic " + Math.round(pr.top) + "+" + Math.round(pr.height) + " of " + H + ", fitted to " + Math.round(K.UI.fitFeet || 0) + ", settled " + K.UI.settled + ", sized " + (L.dataset.sized || "?") + (document.body.classList.contains("beating") ? ", beating" : "");
        out.push("figures float above the painting's ground (" + Math.round(feet) + " vs " + Math.round(gy) + "; " + why + ")"); } }
      const head = leaf.querySelector(".pagehead");
      if (head && head.getBoundingClientRect().top < (o.sat || 0) - 1) out.push("fight name under the notch");
      return out;
    }
    const H = innerHeight;
    const btn = document.querySelector("#battle-actions button, #battle-actions .act");
    if (!btn) out.push("no fight actions");
    else { const r = btn.getBoundingClientRect(); if (r.bottom > H + 1) out.push("fight actions off screen (" + Math.round(r.bottom) + " > " + H + ")"); }
    if (leaf.getBoundingClientRect().bottom > H + 1) out.push("fight page runs off the bottom");
    return out;
  },
  // A real-time fight (ui/realtime.js) or the war-day screen (ui/warday.js), the screens every player gets: the
  // stage and its controls fill the screen and fit it, every control on screen and big enough to tap on a phone.
  rt(o) {
    const out = [], W = innerWidth, H = innerHeight, el = document.getElementById("rt");
    if (!el) return ["the new fight screen did not open"];
    const r = el.getBoundingClientRect();
    if (r.width < W - 1 || r.height < H - 1) out.push("fight does not fill the screen");
    if (document.querySelector("header.top") && document.querySelector("header.top").offsetParent) out.push("top bar still showing during the fight");
    const btns = [...el.querySelectorAll(".ctl button, .hud button, .cards button, .wd-cards button")].filter((b) => b.offsetParent && !b.closest("[hidden], .sheet"));
    if (!btns.length) out.push("no fight controls");
    const off = btns.filter((b) => { const q = b.getBoundingClientRect(); return q.bottom > H - (o.sab || 0) + 1 || q.right > W + 1 || q.left < -1 || q.top < (o.sat || 0) - 1; });
    if (off.length) out.push(off.length + " control(s) off screen, under the notch or under the home bar");
    if (o.kind === "phone") { const small = btns.filter((b) => { const q = b.getBoundingClientRect(); return q.width && (q.width < 43.5 || q.height < 43.5); }); if (small.length) out.push(small.length + " control(s) under 44 px: " + small.slice(0, 3).map((b) => b.className || b.textContent.trim().slice(0, 12)).join(", ")); }
    const figs = [...el.querySelectorAll(".actor svg.pp")].map((e) => e.getBoundingClientRect()).filter((b) => b.height);
    if (!figs.length) out.push("no figures on the stage");
    if (figs.some((b) => b.right > W + 24 || b.left < -24)) out.push("a figure stands off the edge of the screen");
    if (figs.some((b) => b.height < 60)) out.push("figures too small to see");
    return out;
  },
  // Before a fight (ui/battle.js): the card fits the screen, its Fight button in reach.
  brief(o) {
    const out = [], W = innerWidth, H = innerHeight;
    const card = document.querySelector(".fbrief-wrap .fbrief"), go = document.querySelector(".fb-go");
    if (!card) return ["no briefing before the fight"];
    const r = card.getBoundingClientRect();
    if (r.left < 0 || r.right > W + 1) out.push("briefing card runs off the side");
    if (!go) out.push("no Fight button");
    else { const b = go.getBoundingClientRect(); if (b.bottom > H - (o.sab || 0) + 1 || b.top < 0) out.push("Fight button off screen"); if (b.height < 40) out.push("Fight button shorter than a tap target"); }
    if (!document.querySelector(".fb-acts li")) out.push("no moves on the briefing");
    return out;
  },
  // The first fight's tour: the lit part and its line are on screen, Skip in reach.
  tour(o) {
    const out = [], W = innerWidth, H = innerHeight;
    const cap = document.querySelector(".ftour .ft-cap, #rt .tour-cap"), skip = document.querySelector(".ftour .ft-skip, #rt .tour-cap .tc-skip");
    if (!cap) return ["no tour of the fight screen"];
    const r = cap.getBoundingClientRect();
    if (r.left < 0 || r.right > W + 1 || r.top < 0 || r.bottom > H + 1) out.push("tour caption off screen");
    if (!skip || skip.getBoundingClientRect().height < 40) out.push("no Skip button big enough to tap");
    return out;
  },
  painting(o) {
    const out = [];
    const bd = document.getElementById("backdrop");
    const L = bd.querySelector(".bdl.on"), pic = L && L.querySelector(".pic");
    if (!pic) return ["no painting behind the page"];
    const r = pic.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    const leaf = document.getElementById("leaf").getBoundingClientRect();
    const upright = H > W * 1.15;
    if (upright && o.short) {
      if (bd.dataset.mode !== "fit") out.push("painting not shown whole above the page (mode " + bd.dataset.mode + ")");
      else {
        // It may trim the sides (at most two fifths of its width) to fill more of the height.
        if (r.top < -1) out.push("painting cut at the top");
        if (r.width > 1 && W / r.width < 0.59) out.push("painting trimmed by more than two fifths (" + Math.round(100 - W / r.width * 100) + "%)");
        if (r.bottom > leaf.top + 2) out.push("page covers the painting by " + Math.round(r.bottom - leaf.top) + "px");
        if (r.width < W - 2 && r.height < leaf.top - 2 - Math.max(0, r.top)) out.push("painting smaller than the space allows");
        if (r.bottom < leaf.top - 4) out.push("gap of " + Math.round(leaf.top - r.bottom) + "px between the painting and the page");
      }
    } else if (!upright && bd.dataset.mode !== "cover") out.push("painting not filling the screen on a wide screen");
    const btn = document.getElementById("view-full");
    const br = btn.getBoundingClientRect();
    if (o.short && (btn.hidden || (br.bottom > leaf.top + 1 && br.right > leaf.left - 1))) out.push("See-the-painting-whole button missing or under the page");
    return out;
  },
  viewing(o) {
    const out = [];
    if (!document.body.classList.contains("viewing")) return ["view-whole did not open"];
    const leaf = document.getElementById("leaf").getBoundingClientRect();
    if (leaf.top < innerHeight - 2) out.push("page still on screen while viewing the painting");
    const pic = document.querySelector("#backdrop .bdl.on .pic").getBoundingClientRect();
    if (pic.left < -1 || pic.right > innerWidth + 1 || pic.top < -1 || pic.bottom > innerHeight + 1) out.push("painting not whole while viewing");
    const back = document.getElementById("view-back");
    if (back.hidden || back.getBoundingClientRect().bottom > innerHeight - (o.sab || 0) + 1) out.push("Back to the story button missing or under the home bar");
    return out;
  },
  turned(o) {
    const out = [];
    const t = document.getElementById("turn");
    if (!t || t.hidden) return ["no turn-upright card on a phone held sideways"];
    const r = t.getBoundingClientRect();
    if (r.width < innerWidth - 1 || r.height < innerHeight - 1) out.push("turn-upright card does not cover the screen");
    if (!K.UI.paused()) out.push("game not paused while the phone is sideways");
    return out;
  },
  growing(o) {
    // Mid-reveal: the page holds only what has been written so far; no band waits for the rest.
    const out = [];
    const leaf = document.getElementById("leaf");
    if (!leaf.classList.contains("split")) return ["the story page did not open"];
    const lr = leaf.getBoundingClientRect();
    const seen = [...leaf.querySelectorAll(".pagehead, .story > *, .actions, .choices > *, .hint")].filter((e) => e.offsetParent && getComputedStyle(e).display !== "none" && e.getBoundingClientRect().height > 0);
    const bottom = Math.max(...seen.map((e) => e.getBoundingClientRect().bottom));
    const blank = lr.bottom - bottom - (o.sab || 0);
    if (blank > 48) out.push("empty band of " + Math.round(blank) + "px in the page while the story is written");
    return out;
  },
  practice(o) {
    // The practice ground: its page on screen, every kind of test listed (the ones met open, the
    // rest locked), sparring, the blow drill and the way out reachable without scrolling the page.
    const out = [];
    const leaf = document.getElementById("leaf");
    if (!leaf || !leaf.classList.contains("pr-page")) return ["the practice ground did not open"];
    const H = innerHeight, lr = leaf.getBoundingClientRect(), head = document.querySelector("header.top").getBoundingClientRect();
    if (lr.bottom > H + 1) out.push("practice page runs off the bottom (" + Math.round(lr.bottom) + " > " + H + ")");
    if (lr.top < head.bottom - 1) out.push("practice page runs under the top bar");
    const tiles = [...leaf.querySelectorAll(".pr-tile")];
    if (tiles.length < 10) out.push("only " + tiles.length + " kinds of test listed");
    if (!tiles.some((t) => !t.disabled)) out.push("no kind of test open, though some were met");
    if (!tiles.some((t) => t.disabled)) out.push("no kind of test locked");
    if (tiles.some((t) => t.getBoundingClientRect().height < 40)) out.push("test tiles shorter than a tap target");
    const acts = [...leaf.querySelectorAll("#pr-acts .choice, #pr-acts .cta")];
    if (acts.length < 3) out.push("sparring, the blow drill or the way out is missing");
    const off = acts.filter((b) => { const r = b.getBoundingClientRect(); return r.bottom > H - (o.sab || 0) + 1 || r.top < head.bottom - 1 || r.height < 40; });
    if (off.length) out.push(off.length + " practice action(s) off screen or too small");
    const story = document.getElementById("pr-story");
    if (story && story.scrollHeight > story.clientHeight + 2 && story.clientHeight < 90) out.push("practice page's list squeezed to " + story.clientHeight + "px");
    if (o.small && parseFloat(getComputedStyle(story).fontSize) > 16.5 && !document.body.classList.contains("big-text")) out.push("practice text " + getComputedStyle(story).fontSize + " on a phone");
    return out;
  },
  modal(o) {
    const out = [];
    const m = document.querySelector(".scrim .modal");
    if (!m) return ["the window did not open"];
    const r = m.getBoundingClientRect();
    if (r.right > innerWidth + 1 || r.left < -1) out.push("window wider than the screen");
    const close = document.getElementById("modal-close").getBoundingClientRect();
    if (close.top < (o.sat || 0) - 1 || close.bottom > innerHeight) out.push("Close button off screen or under the notch");
    return out;
  },
  // The full-screen ending (ui/ending.js): the title on screen, nothing sideways, the act buttons and
  // Live another life reachable by scrolling inside it, tap targets of 44px.
  ending(o) {
    const out = [], es = document.querySelector(".endscreen");
    if (!es) return ["the ending did not open"];
    const t = es.querySelector(".es-title").getBoundingClientRect();
    if (o.all) {
      const sc = es.querySelector(".es-scroll"); sc.scrollTop = sc.scrollHeight;
      const last = es.querySelector(".es-rest .btnrow").getBoundingClientRect();
      if (last.bottom > innerHeight + 1 || last.top < 0) out.push("Live another life cannot be reached");
      for (const b of es.querySelectorAll(".actback, .es-rest .btnrow button")) { const r = b.getBoundingClientRect(); if (r.height < 44 && b.classList.contains("actback")) out.push("act button shorter than a tap target"); if (r.right > innerWidth + 1) out.push("button runs past the right edge"); }
      sc.scrollTop = 0;
    }
    const skip = es.querySelector(".es-skip").getBoundingClientRect();
    if (!es.classList.contains("all") && (skip.top < (o.sat || 0) - 1 || skip.height < 40)) out.push("Skip under the notch or too small");
    if (t.top < 0 || t.right > innerWidth + 1) out.push("ending title off screen");
    return out;
  },
  journey(o) {
    const out = [];
    const map = document.querySelector(".leaf.journeying .bmap");
    if (!map) return ["the journey page did not open"];
    const r = map.getBoundingClientRect();
    if (r.height < 120) out.push("journey map too small (" + Math.round(r.height) + "px)");
    const leaf = document.getElementById("leaf").getBoundingClientRect();
    if (leaf.bottom > innerHeight + 1) out.push("journey page runs off the bottom");
    const go = document.getElementById("journey-go");
    if (!go || go.getBoundingClientRect().bottom > innerHeight + 1) out.push("Continue off screen on the journey page");
    return out;
  },
  // The one-page creation (owner, 6 November): the map fills the screen, every pin on it.
  homeland(o) {
    const out = [];
    const map = document.querySelector(".cr-map .bmap");
    if (!map || !map.getBoundingClientRect().height) out.push("homeland map not shown");
    else if (map.getBoundingClientRect().width < innerWidth - 2) out.push("homeland map narrower than the screen (" + Math.round(map.getBoundingClientRect().width) + "px)");
    const pins = [...document.querySelectorAll(".cr-map .m-home")];
    if (pins.length < 6) out.push("only " + pins.length + " homeland pins");
    const top = document.querySelector(".cr-top").getBoundingClientRect().bottom;
    const off = pins.filter((g) => { const r = g.getBoundingClientRect(); return r.top < top - 2 || r.bottom > innerHeight + 2 || r.left < -2 || r.right > innerWidth + 2; }).map((g) => g.dataset.home);
    if (off.length) out.push("homeland pins off the screen: " + off.join(", "));
    return out;
  },
  // Each step of the creation page on one screen: no scroll, the card whole and under the heading.
  createfit(o) {
    const out = [], cr = document.querySelector(".cr");
    if (!cr) return ["no creation page"];
    if (document.scrollingElement.scrollHeight > innerHeight + 1) out.push("the page scrolls (" + document.scrollingElement.scrollHeight + "px on " + innerHeight + ")");
    const card = document.querySelector(".cr-card");
    if (!card || getComputedStyle(card).visibility === "hidden") return out;
    const r = card.getBoundingClientRect(), head = document.querySelector(".cr-top").getBoundingClientRect();
    if (card.scrollHeight > card.clientHeight + 2) out.push("the card scrolls inside (" + card.scrollHeight + " of " + card.clientHeight + "px)");
    if (r.top < head.bottom - 2) out.push("the card covers the heading (" + Math.round(head.bottom - r.top) + "px)");
    if (r.bottom > innerHeight + 1) out.push("the card runs off the bottom");
    const panel = document.querySelector(".cr-panel:not([hidden])");
    if (panel) [...panel.querySelectorAll("button, input")].forEach((b) => { const q = b.getBoundingClientRect(); if (q.height && (q.bottom > innerHeight + 1 || q.top < 0)) out.push("off the screen: " + (b.id || b.textContent.trim().slice(0, 24))); });
    return out;
  },
};

// ---------- Setting up each screen ----------
const LIFE = { origin: "panchala", pronoun: "she", heirloom: "amulet", temperament: "bold", age: 15, teacher: "drona", path: "archer", act: 2 };
function fontCss() {
  const want = { "cormorant-garamond": ["500", "600", "700", "500-italic"], "alegreya-sans": ["400", "500", "700"], "tiro-devanagari-hindi": ["400", "400-italic"], mukta: ["400", "500", "700"] };
  let css = "";
  for (const dir of fs.readdirSync(FONTS)) {
    const fam = Object.keys(want).find((f) => dir.startsWith("fontsource-" + f + "-") && fs.statSync(path.join(FONTS, dir)).isDirectory());
    if (!fam) continue;
    for (const w of want[fam]) {
      const f = path.join(FONTS, dir, w + ".css");
      if (fs.existsSync(f)) css += fs.readFileSync(f, "utf8").replace(/url\(\.\/files\//g, "url(/__fonts/" + dir + "/files/");
    }
  }
  return css;
}
async function fresh(page, url, o, prefs = {}) {
  await page.goto(url);
  await page.waitForFunction(() => window.K && K.UI && K.UI.renderScene);
  await page.evaluate(() => document.fonts && document.fonts.ready.then(() => true));
  await page.addStyleTag({ content: `:root{--sat:${o.sat}px!important;--sab:${o.sab}px!important;--sal:${o.sal || 0}px!important;--sar:${o.sar || 0}px!important}` });
  // The layouts are checked still ("Calm motion" on), so the screens hold steady to be measured.
  await page.evaluate((p) => { localStorage.clear(); K.prefs(Object.assign({ gradual: false, calm: true, beats: false, sound: false, timed: false, living: false }, p)); }, prefs);
}
async function goScene(page, id, extra) {
  await page.evaluate(([id, life, extra]) => {
    K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, extra || {}); K.S.at = K.S.at || "hastinapura"; K.go(id);
  }, [id, LIFE, extra]);
  await page.waitForTimeout(600);
  // A new place: the journey page comes first; a tap on it moves on to the scene.
  if (await page.$("#journey-go")) { await page.click("#journey-go"); await page.waitForTimeout(400); }
  // A battle day's first scene opens with the commander's orders over it (Build B; tests/review_battle.js checks them):
  // "To your place", as a player would, to measure the scene.
  if (await page.$(".moment.orders .ord-go")) { await page.click(".moment.orders .ord-go"); await page.waitForTimeout(500); }
  // Let the page finish rising into place.
  await page.waitForFunction(() => !document.getAnimations || document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getComputedTiming().iterations === Infinity), null, { timeout: 3000 }).catch(() => {});
}
// A made-up scene holding one test of the given kind.
async function goTest(page, game, trial) {
  await page.evaluate(([game, trial, life]) => {
    K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, { age: 22 });
    const id = "zz_" + game;
    K.scene({ id, act: 3, age: 22, art: "scene_teacher", place: "Test", title: "Test " + game, body: ["Before the test."],
      choices: [{ id: "g", t: "Play " + game, game, trial: Object.assign({ rules: "The rules of the test, in one line.", stakes: ["You win something.", "You lose something."], attr: "grace", skill: "stealth" }, trial), win: { text: "won" }, close: { text: "close" }, lose: { text: "lost" } }], next: "a3_lac" });
    K.go(id);
  }, [game, trial, LIFE]);
  await page.waitForTimeout(500);
  await page.click("#choices .choice");
  await page.waitForTimeout(500);
  const start = await page.$(".trial .cta");
  if (start) { await start.click(); await page.waitForTimeout(900); }
}
// The card before a fight, and the first fight's tour after it: through both, to the fight.
async function passBrief(page) {
  const go = await page.$(".fb-go"); if (go) { await go.click(); await page.waitForTimeout(400); }
  const skip = await page.$(".ft-skip, #rt .tc-skip"); if (skip) { await skip.click(); await page.waitForTimeout(400); }
}
const TESTS = [
  ["aim", { stage: "stage_training_ground", cast: ["drona"] }], ["push", {}], ["steady", {}], ["sneak", {}], ["notice", {}],
  ["drill", { set: "mudra", stage: "stage_training_ground", cast: ["balarama"] }], ["rhythm", { stage: "stage_smithy", cast: ["charu"], sound: "clang" }],
  ["race", { stage: "stage_racetrack", cast: ["karna"], rival: "Karna" }], ["herd", { stage: "stage_khandava_top", theme: "fire" }],
  ["rings", { stage: "stage_chakravyuha_top", mode: "open" }], ["dash", { stage: "stage_chakravyuha_top", mode: "open", cast: ["abhimanyu"] }], ["dash", { _label: "keep it shut", stage: "stage_chakravyuha_top", mode: "close", cast: ["drona"] }], ["chaupar", { stage: "stage_board_table", cast: ["shakuni"], opponent: "Shakuni" }],
  ["baghchal", { stage: "stage_board_table", cast: ["shakuni"], opponent: "Shakuni" }], ["moksha", { stage: "stage_board_table", cast: ["boy"], opponent: "Vikarna" }],
  ["retort", { stage: "stage_lotus_garden", cast: ["duryodhana"], rounds: [{ line: "They say your family sweeps the stables.", replies: ["And yours sweeps the floor before the king.", "That is not true.", "Leave me alone."] }, { line: "Is that a bow or a broom?", replies: ["Come closer and find out.", "A bow.", "Go away."] }, { line: "Who taught you?", replies: ["Someone who could.", "Nobody.", "My mother."] }] }],
  ["draw", { stage: "stage_bow_courtyard", cast: ["guard"] }], ["formation", { stage: "stage_chakravyuha_top", array: "eagle" }], ["hands", { stage: "stage_dice_board_top", cast: ["shakuni"] }], ["pasha", null],
  ["array", { stage: "stage_vyuha_top", array: "crane", rounds: 5 }], // the army battle (ui/army.js)
  // The weapon quests on their own grounds (content/astras.js).
  ["breath", { stage: "stage_deep_lake" }], ["race", { _label: "the climb", stage: "stage_mountain_path", vehicle: "foot", obstacles: ["rock", "ice"], rival: "the mountain" }],
  ["steady", { _label: "fire altar", stage: "stage_fire_altar", verb: "Shield the flame" }], ["steady", { _label: "naga bank", stage: "stage_naga_bank", verb: "Hold" }],
  ["steady", { _label: "Shiva's mountain", stage: "stage_shiva_mountain", verb: "Hold still" }], ["sneak", { _label: "temple lamp", stage: "scene_temple_offering" }],
  ["retort", { _label: "Gandharva grove", stage: "stage_gandharva_grove", rounds: [{ line: "What runs and never walks?", replies: ["A river.", "A horse.", "A thief."] }] }],
  // The night the lac house burns (§18.2): the escape through the burning rooms, and the cellar's oil lines.
  ["escape", { stage: "stage_lac_fire_top", start: "hall" }], ["fuse", { stage: "stage_lac_cellar", lines: 3, secs: 32 }],
  // Episodes: a run on foot through the storm, and stealth on two of the long night strips.
  ["race", { _label: "on foot", stage: "stage_exile_storm", vehicle: "foot", obstacles: ["rock", "fire"] }], ["sneak", { _label: "Kichaka's hall", stage: "stage_kichaka_hall_night", watch: "guard" }],
  ["sneak", { _label: "river crossing", stage: "stage_river_crossing_night", watch: "soldier", verb: "Swim", trips: 1 }],
];

async function runDevice(browser, base, o, report) {
  const ctx = await browser.newContext({ viewport: { width: o.w, height: o.h }, deviceScaleFactor: o.mobile ? 2 : 1, isMobile: o.mobile && browser._name !== "firefox", hasTouch: o.mobile });
  const page = await ctx.newPage();
  if (FONTS) {
    const css = fontCss();
    await page.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: css }));
  }
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  o.small = o.w <= 720 || o.h <= 520;
  const label = o.name + " " + o.orient + " (" + o.w + "×" + o.h + ")";
  const check = async (name, kinds, extra = {}) => {
    const oo = Object.assign({}, o, extra);
    let probs = [];
    for (const k of ["common", ...kinds]) probs = probs.concat(await page.evaluate(([fn, oo]) => { try { return (0, eval)("(function " + fn + ")")(oo); } catch (e) { return ["check crashed: " + e.message]; } }, [PAGE[k].toString(), oo]));
    report.push({ browser: browser._name, device: label, screen: name, problems: probs });
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, [browser._name, o.name.replace(/\s+/g, ""), o.orient[0], name.replace(/[^\w]+/g, "_")].join("-") + ".png") });
  };
  const url = base + "/index.html";

  // Phones held sideways: the game asks to be turned upright and waits; turned back, it goes on.
  if (o.kind === "phone" && o.orient === "landscape") {
    await fresh(page, url, o);
    const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    if (!coarse) { report.push({ browser: browser._name, device: label, screen: "turn upright", problems: [] }); await ctx.close(); return; }
    await goScene(page, "a2_trial");
    await check("turn upright", ["turned"], { underCard: true });
    await page.setViewportSize({ width: o.h, height: o.w });
    await page.waitForTimeout(700);
    const back = await page.evaluate(() => ({ hidden: document.getElementById("turn").hidden, paused: K.UI.paused(), choice: !!document.querySelector("#choices .choice") }));
    report.push({ browser: browser._name, device: label, screen: "turned back upright", problems: [back.hidden ? null : "turn card stayed", back.paused ? "game still paused" : null, back.choice ? null : "scene lost"].filter(Boolean) });
    report.push({ browser: browser._name, device: label, screen: "script errors", problems: errors.map((e) => "error: " + e) });
    await ctx.close();
    return;
  }

  // Title, and the homeland on the map.
  await fresh(page, url, o);
  await page.waitForTimeout(400);
  await check("title", []);
  await page.evaluate(() => K.UI.renderCreate());
  await page.waitForTimeout(500);
  await check("homeland map", ["homeland", "createfit"]);
  // Every land's card, then each question in turn.
  for (const land of await page.evaluate(() => Object.keys(K.ORIGINS))) {
    await page.evaluate((k) => document.querySelector('#origins .origin[data-home="' + k + '"]').click(), land);
    await page.waitForTimeout(650);
    await check("homeland card: " + land, ["createfit"]);
  }
  for (const [name, js] of [["creation: name", () => document.getElementById("land-ok").click()], ["creation: she or he", () => document.getElementById("cr-next").click()],
    ["creation: temperament", () => document.querySelector("#pron .opt").click()], ["creation: heirloom", () => document.querySelector("#temps .pick").click()],
    ["creation: last step", () => document.querySelector("#heirs .pick").click()]]) {
    await page.evaluate(js); await page.waitForTimeout(800);
    await check(name, ["createfit"]);
  }

  // Scenes: a short one, the longest canon scene, the scene with the most choices, a war scene.
  await fresh(page, url, o);
  await goScene(page, "a2_trial");
  await check("short scene", ["topbar", "scene", "painting"], { short: true });
  // The story written line by line: midway, the page holds only what is written.
  await page.evaluate((life) => { K.prefs({ gradual: true, calm: false }); K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, { origin: "matsya", age: 9, act: 1 }); K.S.at = "matsya"; K.go("a1_sage"); }, LIFE);
  await page.waitForTimeout(1600);
  await check("story being written", ["growing"]);
  {
    // The painting holds still while the lines appear (it moves up only once the scene is there).
    const at = () => page.evaluate(() => { const r = document.querySelector("#backdrop .bdl.on .pic").getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height), document.getElementById("backdrop").dataset.mode]; });
    const a = await at(); await page.waitForTimeout(900); const b = await at();
    const upright = o.h > o.w * 1.15;
    report.push({ browser: browser._name, device: label, screen: "painting still while writing", problems: (a[0] !== b[0] || a[1] !== b[1]) ? ["painting moved while the story was written (" + a + " → " + b + ")"] : upright && a[2] !== "whole" ? ["painting not shown whole while the scene opens (" + a[2] + ")"] : [] });
  }
  await page.evaluate(() => { K.UI.stageFinish(true); K.prefs({ gradual: false, calm: true }); });
  await goScene(page, "a2_trial");
  // See the painting whole, and back.
  await page.click("#view-full");
  await page.waitForTimeout(1400);
  await check("painting whole", ["viewing"]);
  await page.mouse.click(o.w / 2, o.h / 2);
  await page.waitForTimeout(900);
  {
    const back = await page.evaluate(() => !document.body.classList.contains("viewing") && document.getElementById("leaf").getBoundingClientRect().top < innerHeight - 50);
    report.push({ browser: browser._name, device: label, screen: "back from the painting", problems: back ? [] : ["a tap did not bring the page back"] });
  }
  // A living painting: the training ground has a clip; it plays and shows over the painting.
  await page.evaluate(() => K.prefs({ living: true, calm: false }));
  await page.evaluate(() => { K.UI.setBackdrop(null); });
  await goScene(page, "a2_trial");
  await page.waitForTimeout(2200);
  {
    const v = await page.evaluate(() => { const v = document.querySelector("#backdrop .bdl.on video"); const t = document.createElement("video"); return { can: !!t.canPlayType("video/mp4; codecs=avc1.42E01E"), el: v ? { t: v.currentTime, on: v.classList.contains("on") } : null }; });
    // Clips are MP4 (H.264) only. A test browser built without it cannot play them; players' browsers can. The painting stays.
    if (v.can) report.push({ browser: browser._name, device: label, screen: "living painting", problems: !v.el ? ["no clip on a painting that has one"] : v.el.on && v.el.t > 0.3 ? [] : ["clip did not play (" + JSON.stringify(v.el) + ")"] });
  }
  await page.evaluate(() => K.prefs({ calm: true }));
  const picks = await page.evaluate(() => {
    const len = (b) => JSON.stringify(b || "").length;
    let longest = null, most = null, n = 0, L = 0;
    for (const sc of Object.values(K.SCENES)) {
      if (sc.ending || typeof sc.choices === "function" || typeof sc.body === "function") continue;
      const l = len(sc.body) + len(sc.witness);
      if (sc.canon && l > L) { L = l; longest = sc.id; }
      const c = (sc.choices || []).length;
      if (c > n) { n = c; most = sc.id; }
    }
    return { longest, most };
  });
  for (const [name, id, extra] of [["longest canon scene", picks.longest], ["most choices", picks.most], ["war scene", "a6_day1", { act: 6, age: 40, side: "pandava" }]]) {
    if (!id) continue;
    await goScene(page, id, extra);
    await check(name + " (" + id + ")", ["topbar", "scene"]);
  }
  // Hindi, larger letters, and the same long scene.
  await page.evaluate(() => K.UI.loadLang("hi").then(() => K.UI.setLang("hi")));
  await goScene(page, picks.longest);
  await check("Hindi long scene", ["topbar", "scene"]);
  await page.evaluate(() => K.UI.setLang("en"));

  // The windows from the top bar.
  for (const [name, id] of [["Character", "nav-char"], ["Journal", "nav-journal"], ["Map", "nav-map"], ["Menu", "nav-menu"]]) {
    await page.click("#" + id);
    await page.waitForTimeout(350);
    await check(name + " window", ["modal"]);
    await page.click("#modal-close");
    await page.waitForTimeout(200);
  }

  // A journey to a new place.
  await page.evaluate((life) => { K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, { age: 19, act: 3 }); K.S.at = "hastinapura"; K.S.flags.push("moved_capital"); }, LIFE);
  await page.evaluate(() => K.go("a3_lac"));
  await page.waitForTimeout(700);
  await check("journey", ["journey"]);

  // The full-screen ending: a death with acts to go back to, mid-sequence, then everything shown.
  await page.evaluate((life) => { localStorage.removeItem("kurukshetra.v2.acts"); K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, { age: 23, act: 3, lifeId: "lay" }); K.go("a3_kampilya");
    [1, 2, 3].forEach((a) => { K.S.act = a; K.committed = null; K.checkpoint(K.S); }); Object.assign(K.S, { alive: false }); K.S.flags.push("died_in_fire"); K.go("end_death"); }, LIFE);
  // (calm motion, as all these checks: the ending is there whole at once, its title first)
  await page.waitForTimeout(600);
  await check("ending", ["ending"], { all: true });
  await page.evaluate(() => K.UI.endingClose());

  // Tests of every kind.
  for (const [game, trial] of TESTS) {
    await goTest(page, game, trial);
    await check("test: " + game + (trial && trial._label ? " (" + trial._label + ")" : ""), ["trial"]);
  }

  // A fight.
  await page.evaluate((life) => { K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, { age: 44, act: 6, side: "pandava" }); K.go("a6_capture"); K.UI.startBattle("e_guard", () => {}); }, LIFE);
  await page.waitForTimeout(900);
  // (A real-time fight, opened as any life opens it: no switch.)
  report.push({ browser: browser._name, device: label, screen: "a fight opens in real time for every player", problems: (await page.evaluate(() => !!document.getElementById("rt") && !!K.UI.rtScreen())) ? [] : ["e_guard did not open on the real-time screen"] });
  await check("fight briefing", ["brief"]);
  await page.click(".fb-go"); await page.waitForTimeout(500);
  await check("fight: first-fight tour", ["tour"]);
  await page.click("#rt .tc-skip"); await page.waitForTimeout(400);
  await check("fight", ["rt"]);
  // A fight holding two divine weapons: one "Invoke astra" card, and the chooser behind it.
  await page.evaluate((life) => { K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, { age: 44, act: 6, side: "pandava", astras: [{ id: "agneya", from: "fire_altar" }, { id: "varuna", from: "lake_sage" }], tapas: 9 }); K.go("a6_capture"); K.UI.startBattle("e_guard", () => {}); }, LIFE);
  await page.waitForTimeout(900);
  await passBrief(page);
  await page.evaluate(() => { const p = K.Combat.player(); p.hp = Math.round(p.maxHp * 0.4); }); // (in the war a divine weapon is ready below half your health)
  await check("fight: two astras", ["rt"]);
  {
    // The divine weapon is in Aid (the real-time screen): the sheet opens over the controls with a ready weapon in it.
    await page.click("#rt .hb.aid"); await page.waitForTimeout(400);
    // Two ready: each by name (item 12, data-aid "astra:<id>"); one: the single row (data-aid "astra").
    const a = await page.evaluate(() => { const bs = [...document.querySelectorAll("#rt .aid-sheet [data-aid^='astra']")]; return bs.length ? { ready: bs.filter((b) => !b.disabled).length, text: bs.map((b) => b.textContent).join(" | ") } : null; });
    report.push({ browser: browser._name, device: label, screen: "fight: divine weapon in Aid", problems: a ? (a.ready >= 2 ? [] : ["both divine weapons should be ready in Aid, each by name: " + a.text]) : ["no divine weapon in Aid"] });
    await check("fight: Aid open", ["rt"]);
  }
  // The character sheet holding tapas, weapons and charges.
  await page.evaluate(() => { const V = K.UI.rtScreen && K.UI.rtScreen(); if (V && K.UI.rtStop) K.UI.rtStop(); else if (K.UI.endBattle) K.UI.endBattle(); });
  await goScene(page, "a2_trial", { tapas: 12, astras: [{ id: "agneya", from: "fire_altar" }, { id: "sammohana", from: "gandharva" }], charges: { sanjivani: 1, kavacha: 1 }, boons: ["kavacha"] });
  await page.click("#nav-standing");
  await page.waitForTimeout(500);
  await check("Standing: weapons and tapas", []);
  await page.click("#nav-standing");
  await page.waitForTimeout(300);
  // A fight on a borrowed test-stage painting (the sparring trial): the fighters stand on its ground.
  await page.evaluate((life) => { K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, { age: 17, act: 2 }); K.go("a2_spar"); K.UI.startBattle("e_spar", () => {}); }, LIFE);
  await page.waitForTimeout(900);
  report.push({ browser: browser._name, device: label, screen: "no briefing before a bout", problems: (await page.$(".fbrief-wrap")) ? ["a briefing card before the sparring bout"] : [] });
  await check("fight: sparring", ["rt"]);
  // A holding fight (content/command.js): the champion's own painting, the countdown in the log.
  await page.evaluate((life) => { K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, { age: 44, act: 6, side: "pandava" }); K.S.flags.push("role_command", "role_division"); K.go("a6_day16"); K.UI.startBattle("hold_karna", () => {}); }, LIFE);
  await page.waitForTimeout(900);
  await passBrief(page);
  report.push({ browser: browser._name, device: label, screen: "a turn-based fight opens on the war-day screen", problems: (await page.evaluate(() => !!(K.UI.warScreen && K.UI.warScreen()))) ? [] : ["hold_karna did not open on the war-day screen"] });
  await check("fight: holding", ["rt"]);

  // The practice ground (ui/practice.js). Beside a second chance, the offer; from the menu between
  // scenes, the ground; there a test played to its end, a blow read and the drill stopped, a bout
  // withdrawn from; and on leaving, the life exactly as it was (nothing done there counts).
  await fresh(page, url, o);
  await goScene(page, "a2_trial_again", { flags: ["a2_trial_drona_again"] });
  {
    const offer = await page.evaluate(() => { const b = document.querySelector("#choices .practice-offer"); return b ? b.getBoundingClientRect().height : 0; });
    report.push({ browser: browser._name, device: label, screen: "practice offer beside a second chance", problems: offer >= 40 ? [] : [offer ? "practice offer shorter than a tap target" : "no practice offer beside the second chance"] });
  }
  await goScene(page, "a2_trial", { log: ["a1_friend:arjuna", "a1_friend:bhima"] });
  const lifeBefore = await page.evaluate(() => JSON.stringify(K.S));
  await page.click("#nav-menu");
  await page.waitForTimeout(300);
  await page.click("#m-practice");
  await page.waitForTimeout(700);
  await check("practice ground", ["practice"]);
  await page.click('.pr-tile[data-kind="aim"]');
  await page.waitForTimeout(700);
  await check("practice: a test", ["trial"]);
  await page.click(".trial .trial-body .btnrow .cta:not(.pr-show)");
  await page.waitForTimeout(600);
  for (let i = 0; i < 4 && !(await page.$(".trial.done")); i++) { await page.keyboard.press(" "); await page.waitForTimeout(900); }
  const testBack = await page.waitForSelector(".pr-result", { timeout: 9000 }).then(() => true, () => false);
  await page.click("#pr-acts .choice:nth-child(2)");
  await page.waitForTimeout(700);
  await check("practice: reading the blow", ["battle"]);
  await page.click(".pr-card .cta:not(.pr-show)");
  await page.waitForTimeout(700);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(500);
  await page.click(".pr-stop");
  await page.waitForTimeout(500);
  await page.click("#pr-acts .choice:nth-child(1)");
  await page.waitForTimeout(500);
  await page.click("#pr-acts .choice");
  await page.waitForTimeout(900);
  await check("practice: a bout", ["rt"]);
  // The bout (a real-time fight) stopped from the screen: Withdraw (in Pause on a phone); it ends by itself.
  await page.evaluate(() => { const w = [...document.querySelectorAll("#rt .hb.withdraw")].find((b) => b.offsetParent); if (w) w.click(); else { const p = document.querySelector("#rt .hb.pause"); if (p) p.click(); } });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const b = document.querySelector("#rt .pause-sheet [data-w]"); if (b) b.click(); const y = document.querySelector("#rt [data-yes]"); if (y) y.click(); });
  await page.waitForTimeout(2200);
  await page.click(".pr-leave");
  await page.waitForTimeout(700);
  {
    const after = await page.evaluate((b) => ({ same: JSON.stringify(K.S) === b, scene: !!document.querySelector("#choices .choice"), slow: document.body.classList.contains("pr-slow"), page: !!document.querySelector(".pr-page") }), lifeBefore);
    report.push({ browser: browser._name, device: label, screen: "practice leaves the life as it was", problems: [testBack ? null : "the test did not return to the practice ground", after.same ? null : "the life changed after practice",
      after.scene && !after.page ? null : "the scene did not come back", after.slow ? "the game clock stayed slowed" : null].filter(Boolean) });
  }

  // Stream F: a friend who comes when called in an ordinary fight (engine/friends.js), the call's
  // risk note in the tools row; a board game at the practice ground with the teacher's hint showing;
  // the "Meet blows for me" switch in the menu.
  await fresh(page, url, o);
  await page.evaluate((life) => { K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, { age: 24, act: 3, friend: "charu" }); K.S.bonds.charu = 7; K.go("a3_lac"); K.UI.startBattle("e_bandits", () => {}); }, LIFE);
  await page.waitForTimeout(900);
  await passBrief(page);
  {
    // In real time the call is in Aid, with its note ("once a fight").
    await page.click("#rt .hb.aid").catch(() => {}); await page.waitForTimeout(400);
    const r = await page.evaluate(() => { const b = document.querySelector("#rt .aid-sheet [data-aid='call']"); if (!b) return { no: true }; const rb = b.getBoundingClientRect(); const note = !!(b.querySelector("small") && b.querySelector("small").textContent.trim()); b.click(); return { note, on: rb.bottom <= innerHeight + 1 && rb.top >= 0 }; });
    await page.waitForTimeout(1200);
    const came = await page.evaluate(() => K.Combat.state() && K.Combat.state().units.some((u) => u.person === "charu" && u.called));
    report.push({ browser: browser._name, device: label, screen: "a friend called into a fight", problems: [r.no ? "no Call for help in an ordinary fight" : null, r.no || r.note ? null : "no note on the call", r.no || r.on ? null : "the call button is off screen", came ? null : "Charu did not come when called"].filter(Boolean) });
  }
  await check("fight with a friend", ["rt"]);
  await fresh(page, url, o);
  await goScene(page, "a2_trial", { log: ["a2_pathtest:strategist"] });
  await page.evaluate(() => K.prefs({ practiceSpeed: "slow" }));
  await page.click("#nav-menu"); await page.waitForTimeout(300);
  {
    const sw = await page.evaluate(() => { const i = document.querySelector("#m-assist"); return i ? i.getBoundingClientRect().height : 0; });
    report.push({ browser: browser._name, device: label, screen: "menu: Meet blows for me", problems: sw ? [] : ["no assist switch in the menu"] });
    const fs2 = await page.evaluate(() => { const b = [...document.querySelectorAll("[data-fights]")]; return { n: b.length, on: (b.find((x) => x.getAttribute("aria-checked") === "true") || {}).dataset, h: b.length ? Math.min(...b.map((x) => x.getBoundingClientRect().height)) : 0 }; });
    report.push({ browser: browser._name, device: label, screen: "menu: Fights real-time / turn-based, for every player", problems: fs2.n === 2 && fs2.on && fs2.on.fights === "realtime" ? (fs2.h >= (o.kind === "phone" ? 36 : 24) ? [] : ["the Fights switch is too small to tap (" + Math.round(fs2.h) + " px)"]) : ["no Fights switch in the menu, real-time by default (" + fs2.n + ")"] });
  }
  await page.click("#m-practice"); await page.waitForTimeout(700);
  await page.click('.pr-tile[data-kind="chaupar"]'); await page.waitForTimeout(700);
  {
    const seg = await page.evaluate(() => { const s = document.querySelector(".pr-speed span"); return s ? s.textContent : ""; });
    report.push({ browser: browser._name, device: label, screen: "practice: help segment on a board game", problems: /Help|मदद/.test(seg) ? [] : ["the speed segment did not become Help: " + seg] });
  }
  await page.click(".trial .trial-body .btnrow .cta:not(.pr-show)"); await page.waitForTimeout(700);
  for (let i = 0; i < 8 && !(await page.$(".pc.me.can")); i++) { await page.click(".trial .btnrow .cta").catch(() => {}); await page.waitForTimeout(1300); }
  {
    const hint = await page.evaluate(() => ({ moving: !!document.querySelector(".pc.me.can"), hint: !!document.querySelector(".pr-hint"), row: !!document.querySelector(".pr-hintrow") }));
    report.push({ browser: browser._name, device: label, screen: "practice: the teacher points out the move", problems: !hint.moving || hint.hint || hint.row ? [] : ["no hint shown on a chaupar turn at Slow"] });
  }
  await check("practice: a board game with help", ["trial"]);

  // The act card and the title card: shown, gone by themselves, and gone at a tap.
  await fresh(page, url, o, { beats: true });
  await page.evaluate((life) => { K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life); K.S.at = "hastinapura"; K.go("a2_trial"); }, LIFE);
  const probs = [];
  const seen = async (sel, ms) => page.waitForSelector(sel, { timeout: ms, state: "attached" }).then(() => true, () => false);
  if (!(await seen(".beat-act", 1500))) probs.push("no act card at the start of an act");
  else if (SHOTS) await page.screenshot({ path: path.join(SHOTS, [browser._name, o.name.replace(/\s+/g, ""), o.orient[0], "act_card"].join("-") + ".png") });
  // The act card gives way to the title card by itself, after about three seconds.
  if (!(await seen(".beat-title, .beat-short", 5000))) probs.push("no title card after the act card");
  // A tap moves on; the cards are gone and the choices are there.
  for (let i = 0; i < 3 && (await page.$("#beat")); i++) { await page.mouse.click(o.w / 2, o.h / 2).catch(() => {}); await page.waitForTimeout(350); }
  await page.waitForTimeout(600);
  if (await page.$("#beat")) probs.push("cards did not give way to taps");
  if (!(await page.$("#choices .choice"))) probs.push("no choices after the cards");
  // An ordinary scene gets the short title, and fades by itself.
  await page.evaluate(() => K.prefs({ titles: "short", beats: false }));
  await goScene(page, "a2_path");
  await page.evaluate((life) => { K.prefs({ beats: true }); K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life); K.S.at = "hastinapura"; K.go("a2_trial"); }, LIFE);
  await page.waitForTimeout(350);
  if (!(await page.evaluate(() => !!document.querySelector(".beat-short")))) probs.push("short title missing with Scene titles: short");
  await page.waitForTimeout(3200); // short title (about 1 s), then the painting alone (about 1.3 s)
  if (await page.evaluate(() => !!document.getElementById("beat"))) probs.push("short title did not fade by itself");
  report.push({ browser: browser._name, device: label, screen: "act and title cards", problems: probs });

  // Motion is always on: a device asking for reduced motion still sees the puppets move in a fight,
  // and so does a player who turned the line-by-line story off. "Calm motion" stills them.
  {
    const mctx = await browser.newContext({ viewport: { width: o.w, height: o.h }, isMobile: o.mobile && browser._name !== "firefox", hasTouch: o.mobile, reducedMotion: "reduce" });
    const mp = await mctx.newPage();
    if (FONTS) { const css = fontCss(); await mp.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: css })); }
    const mprobs = [];
    const fight = async (prefs) => {
      await fresh(mp, url, o, prefs);
      await mp.evaluate((life) => { K.S = K.newLife({ name: "Asha" }); Object.assign(K.S, life, { age: 17, act: 2 }); K.go("a2_spar"); K.UI.startBattle("e_spar", () => {}); }, LIFE);
      await mp.waitForTimeout(700);
      const look = () => mp.evaluate(() => [...document.querySelectorAll("#arena .actor svg, #rt .actor svg")].map((v) => v.innerHTML).join("|"));
      const a = await look(); await mp.waitForTimeout(600); const b = await look();
      return { moved: a !== b && a.length > 0, calm: await mp.evaluate(() => document.documentElement.classList.contains("calm")), motion: await mp.evaluate(() => K.UI.motion()) };
    };
    const on = await fight({ calm: false });
    if (!on.motion || on.calm || !on.moved) mprobs.push("device reduced motion: the fight should still move (motion " + on.motion + ", calm " + on.calm + ", moved " + on.moved + ")");
    const calm = await fight({ calm: true });
    if (calm.motion || !calm.calm || calm.moved) mprobs.push("calm motion: the fight should stand still (motion " + calm.motion + ", calm " + calm.calm + ", moved " + calm.moved + ")");
    report.push({ browser: browser._name, device: label, screen: "motion on despite the device; calm motion stills it", problems: mprobs });
    await mctx.close();
  }

  report.push({ browser: browser._name, device: label, screen: "script errors", problems: errors.map((e) => "error: " + e) });
  await ctx.close();
}

(async () => {
  let pw;
  try { pw = require("playwright"); } catch (e) { console.error("Playwright is not installed: npm i -D playwright && npx playwright install"); process.exit(2); }
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const srv = await serve();
  const base = "http://127.0.0.1:" + srv.address().port;
  const report = [];
  const ran = [];
  for (const name of BROWSERS) {
    let browser;
    try { browser = await pw[name].launch(); } catch (e) { console.log("· " + name + ": not installed here, skipped (" + e.message.split("\n")[0] + ")"); continue; }
    browser._name = name;
    ran.push(name);
    for (const d of DEVICES) {
      if (ONLY && d.kind !== ONLY) continue;
      if (DEVICE && !d.name.toLowerCase().includes(DEVICE.toLowerCase())) continue;
      for (const o of shapes(d)) {
        const mark = report.length;
        try { await runDevice(browser, base, o, report); }
        catch (e1) {
          // A test browser that falls over (it happens to WebKit on small CI machines) gets one more go.
          report.length = mark;
          if (!browser.isConnected()) { browser = await pw[name].launch(); browser._name = name; }
          try { await runDevice(browser, base, o, report); continue; } catch (e) { var e2 = e; }
          const e = e2; report.push({ browser: name, device: o.name + " " + o.orient, screen: "run", problems: ["run crashed: " + e.message.split("\n").slice(0, 8).join(" / ")] }); }
      }
    }
    await browser.close();
  }
  srv.close();
  const bad = report.filter((r) => r.problems.length);
  for (const r of bad) console.log("✗ " + r.browser + " · " + r.device + " · " + r.screen + "\n    " + r.problems.join("\n    "));
  console.log("\n" + (report.length - bad.length) + "/" + report.length + " checks passed in " + (ran.join(", ") || "no browser"));
  // On GitHub, the failures also go up as annotations (readable through the API), grouped by
  // screen and problem with the devices listed, since a step may carry only 10 of each level.
  if (process.env.GITHUB_ACTIONS && bad.length) {
    const groups = new Map();
    for (const r of bad) for (const pr of r.problems) {
      const key = r.screen.replace(/ \(.*\)$/, "") + ": " + pr.replace(/\d+(\.\d+)?/g, "#");
      if (!groups.has(key)) groups.set(key, { n: 0, ex: pr, where: [] });
      const g = groups.get(key); g.n++; g.where.push(r.device.replace(/ \(.*\)$/, ""));
    }
    const list = [...groups.entries()].sort((a, b) => b[1].n - a[1].n);
    const esc = (t) => t.replace(/%/g, "%25").replace(/\r/g, "").replace(/\n/g, "%0A");
    list.slice(0, 30).forEach(([key, g], i) => {
      const level = i < 10 ? "error" : i < 20 ? "warning" : "notice";
      console.log("::" + level + " title=" + esc(ran.join(",") + " " + key.split(":")[0]) + "::" + esc(g.n + "× " + key.split(": ").slice(1).join(": ") + " | e.g. " + g.ex + " | on: " + [...new Set(g.where)].join(", ")));
    });
  }
  process.exit(bad.length || !ran.length ? 1 : 0);
})();
