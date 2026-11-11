/* DOM helpers shared by the screens. */
(function (K) {
  "use strict";
  const U = (K.UI = {});
  U.$ = (id) => document.getElementById(id);
  U.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  U.t = (s) => U.esc(K.text(s));            // story text: translate, fill the life's tokens, escape
  U.tr = (s, p) => U.esc(K.tr(s, p));        // interface text: translate (and fill params), escape
  // Text that must follow a language switch while it is on screen (a test's button, score line and
  // help, set once and not redrawn): it keeps its English key, and U.relabel translates it again.
  // A key may be a list of [key, params] pairs, shown joined by " · ".
  const trOf = (key, p) => (Array.isArray(key) ? key.map(([k, q]) => K.tr(k, q)).join(" · ") : K.tr(key, p));
  U.trSpan = (key, p) => '<span data-tr="' + U.esc(Array.isArray(key) ? JSON.stringify(key) : key) + '"' + (Array.isArray(key) ? ' data-trl="1"' : "") + (p ? " data-trp='" + U.esc(JSON.stringify(p)) + "'" : "") + ">" + U.esc(trOf(key, p)) + "</span>";
  U.trLabel = (el, key, p) => {
    if (!el) return;
    el.textContent = trOf(key, p);
    el.dataset.tr = Array.isArray(key) ? JSON.stringify(key) : key;
    if (Array.isArray(key)) el.dataset.trl = "1"; else delete el.dataset.trl;
    if (p) el.dataset.trp = JSON.stringify(p); else delete el.dataset.trp;
  };
  U.relabel = (root) => {
    (root || document).querySelectorAll("[data-tr]").forEach((el) => {
      try {
        const key = el.dataset.trl ? JSON.parse(el.dataset.tr) : el.dataset.tr;
        el.textContent = trOf(key, el.dataset.trp ? JSON.parse(el.dataset.trp) : null);
      } catch (e) { /* leave it as it is */ }
    });
  };
  U.el = function (html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  U.button = function (cls, html, onClick, id) {
    const b = document.createElement("button");
    b.type = "button"; b.className = cls; b.innerHTML = html;
    if (id) b.id = id;
    if (onClick) b.addEventListener("click", onClick);
    return b;
  };
  // Absolute, because a url() carried in a CSS custom property is resolved against the stylesheet
  // that reads it (css/), not the page: a relative "art/x.jpg" would load css/art/x.jpg.
  U.artUrl = function (key) {
    if (!key) return null;
    const file = "art/" + key + (/^(path|vow)_/.test(key) ? ".png" : ".webp"); // emblems are transparent PNGs; paintings WebP (sources: assets/art_src)
    try { return new URL(file, document.baseURI).href; } catch (e) { return file; }
  };

  // Portraits of the people you know (art/p_*.webp). Vasu grows up: the child portrait until 40.
  const PORTRAITS = ["karna", "arjuna", "bhima", "drona", "kripa", "duryodhana", "abhimanyu", "mauni", "charu", "madhavi", "revat", "yudhishthira", "vidura", "bhishma", "dhrishtadyumna", "ashwatthama", "satyaki", "iravan", "ghatotkacha", "bhurishravas", "virata", "drupada", "vrishasena"];
  U.portraitKey = function (id) {
    if (id === "vasu") return K.S && K.S.age >= 40 ? ((K.S.flags || []).some((f) => f === "vasu_away" || f === "vasu_with_you") ? "p_child_son" : "p_vasu_16") : "p_vasu_6"; // armed, once he goes to war
    if (id === "ugra") return K.S && K.S.age >= 25 ? "p_ugra_adult" : "p_ugra_young";
    return PORTRAITS.includes(id) ? "p_" + id : null;
  };
  U.personByName = function (name) {
    for (const [id, p] of Object.entries(K.PEOPLE || {})) if (p.name === name) return id;
    return null;
  };
  // A small picture: "face" (round portrait), "emblem" (contained, transparent) or "card" (4:3).
  U.thumb = function (key, kind, label) {
    if (!key) return "";
    kind = kind || (/^p_/.test(key) ? "face" : /^(path|vow)_/.test(key) ? "emblem" : "card");
    return '<i class="thumb ' + kind + '" style="--img:url(\'' + U.artUrl(key) + '\')"' + (label ? ' role="img" aria-label="' + U.esc(label) + '"' : ' aria-hidden="true"') + "></i>";
  };

  // Story text blocks: plain strings, speech, memories, curses, asides.
  U.blocks = function (arr) {
    return [].concat(K.val(arr) || []).filter(Boolean).map((b) => {
      if (typeof b === "string" || Array.isArray(b)) return "<p>" + U.t(b) + "</p>";
      if (b.speaker) {
        const who = U.personByName(b.speaker), face = U.portraitKey(who);
        // A speaker with a puppet of their own speaks through it: the small figure's jaw moves while the line is written.
        const fig = who && K.PUPPETS && K.PUPPETS[who] && U.puppetBadge ? U.puppetBadge(U.puppetFor(who), { h: 64, cls: "said-fig" }) : "";
        return '<div class="said' + (face || fig ? " with-face" : "") + (fig ? " with-fig" : "") + '">' + (fig || (face ? U.thumb(face, "face") : "")) + '<div><div class="lbl">' + U.t(b.speaker) + '</div><p class="speech">' + U.t(b.line) + "</p></div></div>";
      }
      if (b.memory) return '<p class="memory">' + U.t(b.memory) + "</p>";
      if (b.curse) return '<p class="curse">' + U.t(b.curse) + "</p>";
      if (b.aside) return '<p class="aside">' + U.t(b.aside) + "</p>";
      return "";
    }).join("");
  };

  // ---------- The painting behind everything ----------
  // In the story the scene's painting fills the screen and the page lies over it. A 16:9 "_wide"
  // version is used when there is one; the older 3:1 paintings are dimmed and softened behind the
  // page. Each painting can carry a focal point, so a phone (which shows only the middle of a wide
  // picture) crops around its subject.
  const WIDE = new Set(["custom_anga", "custom_gandhara", "custom_hastinapura", "custom_mathura", "custom_matsya", "custom_nishada", "custom_panchala", "custom_suta", "end_broken", "end_death", "end_elder", "end_forest", "end_river", "end_survivor", "end_teller", "end_vengeance", "end_wheel", "ev_bandits", "ev_bard", "ev_deer", "ev_flood", "ev_horses", "ev_lamps", "ev_letter", "ev_riddle", "ev_snake", "ev_teacher", "home_anga", "home_gandhara", "home_hastinapura", "home_mathura", "home_matsya", "home_nishada", "home_panchala", "home_suta", "roots_anga", "roots_gandhara", "roots_hastinapura", "roots_mathura", "roots_matsya", "scene_day13", "scene_dice_hall", "scene_dice_throws", "scene_exile", "scene_fair", "scene_indraprastha", "scene_lac", "scene_poison", "scene_princes", "scene_swayamvara", "scene_teacher", "scene_teaching", "scene_tournament", "scene_virata", "scene_women_field", "war_day17", "war_day18", "war_eve", "scene_sage", "scene_secret", "scene_smith", "scene_vasu", "scene_vow", "scene_years_remain", "war_bhishma", "war_capture", "war_day14", "war_day15", "war_day16", "scene_duryodhana", "scene_ekalavya", "scene_envoy", "scene_jayadratha", "scene_journey", "scene_lake", "scene_note", "scene_pasha", "scene_path", "scene_raid", "scene_rajasuya", "scene_temple_offering", "scene_sage_year", "scene_brahmastra", "scene_raksha_sutra", "scene_soma", "scene_tournament_crowd", "scene_ugra_letter", "scene_ugra_field", "scene_secret_told", "scene_mentor_vidura", "scene_mentor_kripa", "scene_mentor_peace", "scene_lake_charu", "scene_shikhandi", "scene_letter_camp", "scene_sibling_field", "scene_river_rite", "scene_own_student", "scene_bard", "scene_line_broken", "scene_yuyutsu_crossing", "scene_iravan_river", "scene_samshaptaka_oath", "scene_bhurishravas", "scene_kings_fall", "end_crossed", "end_oath", "scene_duel_ground"]);
  const FOCAL = { scene_teacher: "62% 45%", scene_dice_throws: "28% 35%", home_anga: "30% 50%", scene_princes: "34% 55%", scene_poison: "45% 45%" };
  U.hasWide = (key) => WIDE.has(key) || /^stage_/.test(key || "");
  // Tall (9:16) versions of the test stages, painted for upright screens (art/<key>_tall.webp).
  const TALL = new Set(["fight_arjuna_chariot", "fight_bhima_charge", "fight_border_road", "fight_camp_gate_night", "fight_chakravyuha_inner", "fight_drupada_yard", "fight_duryodhana_line", "fight_fair_ring", "fight_forest_road", "fight_grazing", "fight_karna_chariot", "fight_royal_camp", "fight_swayamvara", "fight_war_camp", "fight_war_chariot", "fight_war_field", "fight_war_sunset", "moment_astra", "moment_friend_arjuna", "moment_friend_bhima", "moment_friend_charu", "moment_friend_duryodhana", "moment_friend_karna", "moment_marriage", "moment_teacher", "stage_battlefield_night", "stage_board_table", "stage_border_village", "stage_bow_courtyard", "stage_chakravyuha_top", "stage_city_night", "stage_city_ruins", "stage_dice_board_top", "stage_drona_gate", "stage_drupada_hall", "stage_elephant_grounds", "stage_exile_storm", "stage_forest_clearing_night", "stage_forest_edge", "stage_forest_lake", "stage_forest_maze_top", "stage_healers_hall", "stage_khandava_top", "stage_kichaka_hall_night", "stage_lac_cellar", "stage_lac_fire_top", "stage_lac_wall", "stage_lotus_garden", "stage_mango_yard", "stage_matsya_ford", "stage_muster_field_top", "stage_palace_corridor", "stage_palace_garden_night", "stage_prison_yard", "stage_racetrack", "stage_river_crossing_night", "stage_river_shallows", "stage_smithy", "stage_stable_yard", "stage_storm_sea", "stage_supply_camp_night", "stage_tournament_arena", "stage_training_ground", "stage_vidura_table", "stage_virata_court", "stage_vyuha_top", "stage_war_road", "fight_supply_carts", "fight_between_lines", "fight_lake_reeds_night", "fight_night_torches", "moment_child_eve", "moment_shakti", "stage_field_to_river", "stage_lake_reeds"]);
  U.upright = () => window.innerHeight > window.innerWidth * 1.15;
  U.tallOf = (key) => (TALL.has(key) ? key + "_tall" : null);
  // The file a painting shows from behind the page: tall on upright screens, wide where painted.
  // Fight backgrounds painted only tall so far: on wide screens a test played on one shows the
  // nearest wide painting instead (until the 16:9 versions arrive).
  const FIGHT_WIDE = {}; // every fight background now has its own 16:9 painting (31 Oct), the camp gate too
  U.wideOf = (key) => (!U.upright() && FIGHT_WIDE[key]) || key;
  U.stripOf = (key) => FIGHT_WIDE[key] || key;
  U.bgUrl = (key) => { if (!key) return null; key = U.wideOf(key); return U.artUrl(TALL.has(key) && U.upright() ? key + "_tall" : WIDE.has(key) ? key + "_wide" : key); };
  // Load paintings a scene may lead to, quietly, so the next one is ready when it is needed.
  const warmed = new Set();
  U.preloadArt = function (keys) {
    if (/jsdom/i.test(navigator.userAgent || "") || K.headless) return;
    keys.forEach((k) => { const u = U.bgUrl(k); if (!u || warmed.has(u)) return; warmed.add(u); const im = new Image(); im.decoding = "async"; im.src = u; });
  };
  // ---------- Pause ----------
  // Game time (U.clock) stands still while the game is paused: a phone turned on its side (the game
  // asks to be turned back), or the tab hidden. Tests, the lamp and the fight's timed defence use it.
  let pausedMs = 0, pauseAt = null;
  const why = new Set();
  U.paused = () => pauseAt != null;
  U.clock = () => performance.now() - pausedMs - (pauseAt != null ? performance.now() - pauseAt : 0);
  U.setPaused = function (reason, on) {
    if (on) why.add(reason); else why.delete(reason);
    if (why.size && pauseAt == null) pauseAt = performance.now();
    else if (!why.size && pauseAt != null) { pausedMs += performance.now() - pauseAt; pauseAt = null; }
  };
  document.addEventListener("visibilitychange", () => U.setPaused("hidden", document.hidden));

  // ---------- Phones play upright ----------
  // A phone turned on its side gets a full-screen card asking to turn it back; everything waits
  // underneath, and the game goes on where it was. Where the browser allows it, the screen is also
  // locked upright. Tablets and desktops play either way.
  const SIDEWAYS = "(orientation: landscape) and (max-height: 520px) and (pointer: coarse)";
  U.initTurn = function () {
    const mq = window.matchMedia && window.matchMedia(SIDEWAYS);
    const card = U.$("turn");
    if (!mq || !card) return;
    const apply = () => {
      const on = mq.matches;
      card.hidden = !on;
      document.body.classList.toggle("turned", on);
      U.setPaused("turned", on);
      document.querySelectorAll("#backdrop video").forEach((v) => { if (on) v.pause(); else if (v.dataset.playing && !v.ended) v.play().catch(() => {}); });
      if (!on) setTimeout(() => U.fitBackdrop(true), 60);
    };
    if (mq.addEventListener) mq.addEventListener("change", apply); else if (mq.addListener) mq.addListener(apply);
    apply();
    const lock = () => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("portrait").catch(() => {}); } catch (e) { /* not allowed here */ } };
    document.addEventListener("pointerdown", lock, { once: true });
  };

  // Living paintings: short clips made from some paintings (game/video/<key>.mp4). The painting
  // shows at once; its clip fades in over it when it can play, plays once and rests on its last
  // frame. Off in the menu, with calm motion, when the device asks to save data, and in tests.
  const VIDEOS = new Set(["war_wheel", "war_eve", "scene_dice_hall", "scene_poison", "scene_lac", "scene_dice_cloth", "war_day17", "scene_arrows",
    "end_death", "end_survivor", "end_broken", "end_elder", "end_forest", "end_river", "scene_princes", "scene_fair", "scene_teacher",
    "scene_teaching", "scene_tournament", "scene_swayamvara", "scene_indraprastha", "scene_dice_throws", "scene_exile", "scene_virata",
    "scene_day13", "war_day18"]);
  U.living = function () {
    if (/jsdom/i.test(navigator.userAgent || "") || K.headless) return false;
    if (U.calm()) return false;
    if (navigator.connection && navigator.connection.saveData) return false;
    return K.prefs().living !== false;
  };
  U.hasVideo = (key) => VIDEOS.has(key);
  // Whether the painting now behind the page has a clip that will play.
  U.liveReady = () => { const L = layer(); return !!(L && L.querySelector("video")); };

  // The backdrop has two layers that cross-fade. Each layer is a soft, blurred fill of the painting
  // and the painting itself, drawn whole or cropped by placing its box:
  //   cover - fills the screen (title cards, desktops, phones on their side, tests and fights);
  //   fit   - on an upright screen, the whole painting in the space above the page, the blurred
  //           fill around it; it zooms out from cover as the page rises;
  //   view  - "See the painting whole": the page slides away and the painting fills the screen.
  let bdKey = null, bdFlip = 0, viewing = false;
  const sizes = {};
  function layer() { return U.$("backdrop").querySelectorAll(".bdl")[bdFlip]; }
  // opts.still: show the painting without its clip for now (U.addClip plays it later, when the
  // story reaches what the clip shows: the lac house catching fire, say).
  // The frame-rate counter (Menu: Show frame rate): frames drawn in the last second, in a corner, so the owner can read
  // how smoothly a fight runs on a real phone (owner, 5 November). Off by default; costs one rAF while on.
  let fpsEl = null, fpsRaf = 0;
  U.fpsMeter = function () {
    const on = !!(K.prefs && K.prefs().fps);
    if (!on) { cancelAnimationFrame(fpsRaf); fpsRaf = 0; if (fpsEl) { fpsEl.remove(); fpsEl = null; } return; }
    if (fpsRaf) return;
    fpsEl = document.createElement("div"); fpsEl.className = "fps-meter"; fpsEl.setAttribute("aria-hidden", "true"); document.body.appendChild(fpsEl);
    let n = 0, t0 = performance.now(), worst = 999;
    const tick = (now) => {
      n++;
      if (now - t0 >= 1000) { const f = Math.round(n * 1000 / (now - t0)); worst = Math.min(worst, f); fpsEl.textContent = f + " fps · low " + worst; fpsEl.classList.toggle("bad", f < 30); n = 0; t0 = now; }
      fpsRaf = requestAnimationFrame(tick);
    };
    fpsRaf = requestAnimationFrame(tick);
  };
  setTimeout(() => { try { U.fpsMeter(); } catch (e) { /* prefs not ready */ } }, 500);
  // A clip's file. Safari on an iPhone plays video only from a server that answers byte-range requests; a host that does not
  // (the private play pages) left every clip blank there while other browsers played it (owner, 5 November). So on Safari
  // the file is fetched whole and played from memory (a blob URL needs no ranges); elsewhere it plays straight from the file.
  const SAFARI = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent || "") || /iP(hone|ad|od)/.test(navigator.userAgent || "");
  const blobs = {};
  U.clipSrc = function (v, key) {
    const url = "video/" + key + ".mp4";
    if (!SAFARI || !window.fetch || !window.URL || !URL.createObjectURL) { v.src = url; return; }
    (blobs[key] || (blobs[key] = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then((b) => URL.createObjectURL(b))))
      .then((u) => { v.src = u; if (v.dataset.want) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } })
      .catch(() => { delete blobs[key]; v.src = url; });
  };
  function makeVideo(key, pic) {
    const v = document.createElement("video");
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = "auto";
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
    // MP4 (H.264) plays in every current browser; the WebM copies were dropped (the published game holds at most 512 files).
    U.clipSrc(v, key);
    v.addEventListener("playing", () => { v.classList.add("on"); v.dataset.playing = "1"; });
    v.addEventListener("ended", () => { delete v.dataset.playing; });
    // If it will not play, the painting simply stays.
    v.addEventListener("error", () => { if (v.src && !/^blob:/.test(v.src) || !SAFARI) v.remove(); });
    pic.appendChild(v);
    return v;
  }
  U.addClip = function () {
    const L = layer(); if (!L || !bdKey || !VIDEOS.has(bdKey) || !U.living() || L.querySelector("video")) return;
    makeVideo(bdKey, L.querySelector(".pic"));
    L.dataset.played = "";
    U.livePlay();
  };
  U.setBackdrop = function (key, opts) {
    const bd = U.$("backdrop");
    if (!bd || key === bdKey) return;
    bdKey = key;
    // A living effect over the last story painting (embers, smoke) leaves with it.
    if (U.stageFx && U.stageFx.storyFor && U.stageFx.storyFor() && U.stageFx.storyFor() !== key) U.stageFx.stop();
    const layers = bd.querySelectorAll(".bdl");
    const next = layers[bdFlip = 1 - bdFlip], prev = layers[1 - bdFlip];
    const wide = key && U.hasWide(key);
    const url = U.bgUrl(key);
    const fill = next.querySelector(".bd"), pic = next.querySelector(".pic");
    fill.style.backgroundImage = url ? "url('" + url + "')" : "none";
    fill.style.backgroundPosition = FOCAL[key] || "50% 45%";
    fill.classList.toggle("flat", !!key && !wide);
    pic.innerHTML = "";
    pic.style.backgroundImage = url ? "url('" + url + "')" : "none";
    next.dataset.key = key || ""; next.dataset.flat = key && !wide ? "1" : ""; next.dataset.played = "";
    next.classList.add("on"); prev.classList.remove("on");
    const vprev = prev.querySelector("video"); if (vprev) vprev.pause();
    if (key && VIDEOS.has(key) && U.living() && !(opts && opts.still)) makeVideo(key, pic);
    const place = () => { U.fitBackdrop(true); };
    if (url && !sizes[url]) {
      const im = new Image();
      im.onload = () => { sizes[url] = [im.naturalWidth, im.naturalHeight]; if (bdKey === key) place(); };
      im.src = url;
    }
    next.dataset.url = url || "";
    place();
  };
  // Start the scene's living painting, once per showing.
  U.livePlay = function (again) {
    const L = layer(); if (!L || (L.dataset.played && !again)) return;
    const v = L.querySelector("video"); if (!v) return;
    if (again) { try { v.currentTime = 0; } catch (e) { /* not loaded yet */ } }
    L.dataset.played = "1";
    v.dataset.want = "1"; // (a clip still being fetched on Safari starts when it arrives)
    if (!v.src) return;
    try { const p = v.play(); if (p && p.catch) p.catch(() => { if (!SAFARI) v.remove(); }); } catch (e) { v.remove(); }
  };
  // Where the page starts, ignoring the slide it is in the middle of.
  U.finalTop = null;
  U.settled = true;
  U.leafTop = () => leafTop();
  function leafTop() {
    const leaf = U.$("leaf");
    if (!leaf || !leaf.offsetHeight || getComputedStyle(leaf).display === "none") return null;
    const r = leaf.getBoundingClientRect();
    const m = getComputedStyle(leaf).transform;
    const ty = m && m !== "none" ? parseFloat(m.split(",")[5]) || 0 : 0;
    return r.top - (viewing ? 0 : ty);
  }
  U.fitBackdrop = function (instant) {
    const bd = U.$("backdrop"); if (!bd || !document.body.classList.contains("inscene")) return;
    if (fightingNow()) instant = true; // in a fight the painting never glides: the floor must not slide under the fighters
    const L = layer(); if (!L) return;
    const pic = L.querySelector(".pic"), size = sizes[L.dataset.url];
    // While a scene is being written the painting holds its size: a phone's browser bars that come
    // and go as the page scrolls line by line do not resize it. It moves once, when the page is done.
    if (!U.settled && U.lockH == null) U.lockH = window.innerHeight;
    if (U.settled) U.lockH = null;
    const W = window.innerWidth, H = U.lockH != null && !fightingNow() ? U.lockH : window.innerHeight;
    const head = document.querySelector("header.top");
    const hb = head ? head.getBoundingClientRect().bottom : 0;
    let mode = "cover", rt = 0, rb = H;
    if (viewing) { mode = "view"; rt = hb; rb = H - 64; }
    // An upright screen, while a scene opens (its cards, then its page being written): the whole
    // painting, large, in the middle of the screen. A wide painting cannot fill a tall screen
    // without being cut to a sliver, so it is shown whole on its glow instead.
    // (Never for a fight: its painting always fills the screen, its ground under the fighters' feet.)
    else if (H > W * 1.15 && !fightingNow() && (!U.settled || document.body.classList.contains("beating"))) { mode = "whole"; rt = 0; rb = H; }
    // Until a new scene has fully appeared, its painting stays whole-screen behind the page;
    // then it moves, once, into the space above the page.
    else if (H > W * 1.15 && !document.body.classList.contains("beating") && U.settled) {
      // While the story is still being written the page grows; the painting takes the place the
      // finished page will leave, so it does not move as the lines appear.
      const top = U.finalTop != null ? U.finalTop : leafTop();
      // Tests, fights and the journey fill the page: their painting fills the screen behind them.
      const lf = U.$("leaf"), busy = lf && /\b(testing|fighting|journeying)\b/.test(lf.className);
      if (top != null && size && top > 90 && !busy) {
        mode = "fit";
        const fullH = W * size[1] / size[0];
        rb = top; rt = top - hb >= fullH ? hb : Math.max(0, top - fullH);
      }
    }
    // Your puppet stands on the page's edge: never taller than the room up to the top bar.
    { const tp = leafTop(), ph = document.querySelector(".leaf.split > .pagehead");
      if (tp != null && ph) document.documentElement.style.setProperty("--pupmax", Math.max(64, Math.round(tp - hb - 6 + ph.offsetHeight - 6)) + "px"); }
    bd.dataset.mode = mode;
    bd.classList.toggle("fitted", mode !== "cover");
    L.dataset.sized = size ? "1" : "0";
    if (!size) { pic.style.cssText += ";left:0;top:0;width:100%;height:100%"; return; }
    const [iw, ih] = size;
    let s, w, h, x, y;
    if (mode === "cover") {
      s = Math.max(W / iw, H / ih); w = iw * s; h = ih * s;
      const f = (FOCAL[L.dataset.key] || "50% 45%").split(" ").map((v) => parseFloat(v) / 100);
      x = (W - w) * f[0]; y = (H - h) * f[1];
      // A fight on an upright screen: the painting's ground meets the fighters' feet (U.groundFit).
      const g = U.groundFit(L.dataset.key);
      if (g) ({ w, h, x, y } = g(iw, ih, w, h, W, H));
    } else if (mode === "fit" || mode === "whole") {
      // As large as the space allows, trimming at most two fifths of the width (around the painting's
      // own centre of interest), and sitting just above the page.
      s = Math.min((rb - rt) / ih, W / (0.6 * iw)); s = Math.max(s, Math.min(W / iw, (rb - rt) / ih));
      w = iw * s; h = ih * s;
      const f = (FOCAL[L.dataset.key] || "50% 45%").split(" ").map((v) => parseFloat(v) / 100);
      x = w > W ? Math.min(0, Math.max(W - w, W / 2 - w * f[0])) : (W - w) / 2;
      y = mode === "whole" ? rt + (rb - rt - h) / 2 : rb - h;
    } else {
      s = Math.min(W / iw, (rb - rt) / ih); w = iw * s; h = ih * s;
      x = (W - w) / 2; y = rt + (rb - rt - h) / 2;
    }
    pic.classList.toggle("now", !!instant);
    Object.assign(pic.style, { left: x.toFixed(1) + "px", top: y.toFixed(1) + "px", width: w.toFixed(1) + "px", height: h.toFixed(1) + "px" });
    placeViewButton(mode, x, y, w, h);
  };
  // Where the ground is in each tall fight painting (share of its height, from the top): the
  // fighters' feet are put on it, by moving the painting (and zooming it a little, at most a third)
  // so that line meets them. What the move uncovers shows the painting's soft glow.
  const GROUND = { stage_training_ground: 0.74, stage_battlefield_night: 0.72 };
  U.groundOf = (key) => (/^fight_/.test(key) ? 0.62 : GROUND[key] || null);
  U.feetY = function () {
    const lf = U.$("leaf");
    if (!lf || !lf.classList.contains("fighting") || !lf.classList.contains("immersive")) return null;
    const svgs = [...document.querySelectorAll("#arena .actor:not(.down) svg")];
    if (!svgs.length) return null;
    return Math.max(...svgs.map((el) => el.getBoundingClientRect().bottom));
  };
  function fightingNow() { const lf = U.$("leaf"); return !!(lf && lf.classList.contains("fighting") && lf.classList.contains("immersive")); }
  U.fitFeet = null; // the feet the painting was last fitted to (battle.js re-fits when they move)
  U.groundFit = function (key) {
    const gr = U.upright() && U.tallOf(key) ? U.groundOf(key) : null;
    U.fitFeet = U.feetY(); // remembered even when there is no ground to fit, so battle.js does not keep asking
    const feet = gr && U.fitFeet;
    if (!feet) return null;
    return (iw, ih, w, h, W, H) => {
      const want = Math.max(h, (H - feet) / (1 - gr), feet / gr);
      const h2 = Math.min(want, h * 1.33), w2 = h2 * iw / ih;
      return { w: w2, h: h2, x: (W - w2) / 2, y: feet - gr * h2 };
    };
  };
  // The small "see it whole" button sits on the painting's lower right corner.
  function placeViewButton(mode, x, y, w, h) {
    const b = U.$("view-full"); if (!b) return;
    const leaf = U.$("leaf");
    const ok = !viewing && !(U.staging && U.staging()) && document.body.classList.contains("inscene") && !document.body.classList.contains("beating") &&
      leaf && leaf.offsetHeight && !leaf.classList.contains("testing") && !leaf.classList.contains("fighting") && !leaf.classList.contains("journeying") && !!bdKey;
    const top = leafTop();
    if (!ok || top == null) { b.hidden = true; return; }
    const lr = leaf.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    // On the painting's lower left corner (your puppet stands on the right, on the page's edge).
    let bt, left;
    if (top >= 120) { // the painting is above the page
      bt = mode === "fit" ? Math.min(y + h, top) : top;
      left = mode === "fit" ? Math.max(0, x) : 0;
      if (mode === "fit" && y + h > top + 1) bt = top;
    } else if (lr.left >= 120) { // the painting is beside the page (a phone on its side, a desktop)
      bt = lr.bottom; left = 0;
    } else { b.hidden = true; return; }
    left = Math.max(left, parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sal")) || 0);
    // Never over the top bar: with too little painting showing, the button waits.
    const head = document.querySelector("header.top");
    if (head && bt - 50 < head.getBoundingClientRect().bottom + 6) { b.hidden = true; return; }
    b.hidden = false;
    b.style.top = Math.round(bt - 50) + "px";
    b.style.left = Math.round(left + 10) + "px"; b.style.right = "auto";
  }
  U.viewWhole = function (on) {
    if (on === viewing) return;
    viewing = !!on;
    document.body.classList.toggle("viewing", viewing);
    U.$("view-back").hidden = !viewing;
    U.fitBackdrop();
    if (viewing) { U.$("view-back").focus({ preventScroll: true }); U.livePlay(true); }
  };
  U.viewing = () => viewing;
  window.addEventListener("resize", () => U.fitBackdrop(true));
  window.addEventListener("orientationchange", () => { U.lockH = null; setTimeout(() => { U.lockH = null; U.fitBackdrop(true); }, 250); });
  U.initBackdrop = function () {
    const leaf = U.$("leaf");
    if (window.ResizeObserver && leaf) new ResizeObserver(() => U.fitBackdrop()).observe(leaf);
    // The page's own slide ends: settle the painting in the space it leaves.
    if (leaf) leaf.addEventListener("animationend", () => U.fitBackdrop());
    U.$("view-full").addEventListener("click", () => U.viewWhole(true));
    U.$("view-back").addEventListener("click", () => U.viewWhole(false));
    // A tap on the painting itself (the space around the page) shows it whole; any tap brings the page back.
    U.$("game").addEventListener("click", (e) => { if (e.target === U.$("game") && !U.$("view-full").hidden) U.viewWhole(true); });
    document.addEventListener("click", (e) => { if (viewing && !e.target.closest("#view-back, header.top, .scrim")) { e.preventDefault(); e.stopPropagation(); U.viewWhole(false); } }, true);
    document.addEventListener("keydown", (e) => { if (viewing && (e.key === "Escape" || e.key === " " || e.key === "Enter")) { e.preventDefault(); e.stopPropagation(); U.viewWhole(false); } }, true);
  };

  // The scene's painting, or (until the art exists) a flat field in the scene's own colour with its
  // caption set large, so a missing picture still reads as a designed page, never a gradient.
  // In the story itself the painting goes behind the page, and the page gets a small header instead.
  U.plate = function (o) {
    if (U.inScene) {
      if (!o.keepArt) U.setBackdrop(o.art || null, { still: o.still });
      const kind = o.tagText ? '<span class="kind ' + (o.tag || "") + '">' + U.esc(o.tagText) + "</span>" : "";
      const fig = K.S && K.puppetSpec && !o.noFigure ? U.puppetBadge(K.puppetSpec(K.S), { pose: o.pose, fit: true, cls: o.big ? "big" : "" }) : "";
      return '<header class="pagehead' + (o.big ? " big" : "") + '"><div class="ph-text"><div class="ph-line">' + kind +
        (o.small ? "<small>" + U.t(o.small) + "</small>" : o.caption ? "<small>" + U.t(o.caption) + "</small>" : "") + "</div>" +
        (o.heading ? "<h1>" + U.t(o.heading) + "</h1>" : o.title ? "<b>" + U.t(o.title) + "</b>" : "") + "</div>" + fig + "</header>";
    }
    const img = U.artUrl(o.art);
    const field = (o.grad || ["#5a3a22"])[0];
    const style = img ? "--img:url('" + img + "')" : "--field:color-mix(in srgb, " + field + " 40%, var(--ground))";
    const kind = o.tagText ? '<span class="kind ' + (o.tag || "") + '">' + U.esc(o.tagText) + "</span>" : "";
    let cap = kind;
    if (o.title) cap += "<b>" + U.t(o.title) + "</b>";
    if (o.small) cap += "<small>" + U.t(o.small) + "</small>";
    if (!o.title && !o.small && o.caption) cap += img ? "<small>" + U.t(o.caption) + "</small>" : "<b>" + U.t(o.caption) + "</b>";
    return '<div class="plate' + (img ? " painted" : "") + (o.tall ? " tall" : "") + '" style="' + style + '">' +
      (cap ? '<span class="cap">' + cap + "</span>" : "") + "</div>";
  };

  U.where = function (html) { U.$("where").innerHTML = html; };
  U.inScene = false;
  U.setNav = function (on) {
    document.body.classList.remove("titling"); // the title screen adds it back after this call
    if (U.beatStop) U.beatStop();
    document.body.classList.remove("intest");
    if (U.viewWhole) U.viewWhole(false);
    U.finalTop = null;
    U.inScene = !!on;
    const leaf = U.$("leaf"); if (leaf) leaf.className = "leaf"; // each screen sets its own page shape
    document.body.classList.toggle("inscene", !!on);
    U.$("nav").hidden = !on; U.$("game").classList.toggle("wide", !on);
    U.$("nav-standing").hidden = !on;
    if (!on) { U.$("ledger").hidden = true; U.$("nav-standing").setAttribute("aria-expanded", "false"); U.setBackdrop(null); }
  };

  // The story area follows the pen as it writes, unless the player has scrolled back to reread;
  // it follows again once they are back at the bottom.
  U.follow = function (story) {
    if (!story) return;
    const atEnd = () => story.scrollHeight - story.scrollTop - story.clientHeight < 28;
    story.dataset.follow = "1";
    const check = () => { story.dataset.follow = atEnd() ? "1" : ""; };
    story.addEventListener("wheel", () => setTimeout(check, 60), { passive: true });
    story.addEventListener("touchmove", () => setTimeout(check, 60), { passive: true });
    story.addEventListener("keydown", () => setTimeout(check, 60));
  };
  U.toEnd = function (story, smooth) {
    if (!story || story.dataset.follow === "") return;
    if (typeof story.scrollTo === "function") story.scrollTo({ top: story.scrollHeight, behavior: smooth && U.motion() ? "smooth" : "auto" });
    else story.scrollTop = story.scrollHeight;
  };

  // ---------- Motion ----------
  // Motion is always on: the game does not follow the device's reduce-motion setting. The menu's
  // "Calm motion" (off unless the player turns it on) stills the puppets and quietens the effects;
  // the html element carries the class "calm" then, and the CSS keys its still rules off it.
  U.calm = () => K.prefs().calm === true;
  U.applyCalm = function () { if (typeof document !== "undefined" && document.documentElement) document.documentElement.classList.toggle("calm", U.calm()); };
  // Whether things on screen move: puppets, fights, tests, effects, timings. Off with calm motion
  // and in the automated (jsdom) tests.
  U.motion = function () {
    if (/jsdom/i.test(navigator.userAgent || "")) return false;
    return !U.calm();
  };
  // ---------- Staged reveal ----------
  // Story screens bring their parts in one after another: painting, title, each line of the scene,
  // and only then the choices. The pause after each line follows its length. A tap on the page,
  // Space, Enter or a number key shows everything at once. Off with calm motion, in the automated
  // tests, or when the player turns "Reveal the story line by line" off in the menu (that switch
  // changes only this: the puppets and fights keep moving).
  U.gradual = () => U.motion() && K.prefs().gradual !== false;
  let stageRun = null;
  // whole: a page shown again comes up all at once, with no quill (see U.pageAgain below).
  U.stage = function (items, done, whole) {
    U.stageFinish(false);
    items = items.filter(Boolean);
    if (!U.gradual() || whole) { items.forEach((el) => el.classList.remove("staged")); if (done) done(); return; }
    items.forEach((el) => { el.classList.add("staged"); el.classList.remove("shown"); });
    const run = { items, i: 0, timer: null, done };
    stageRun = run;
    const holdAfter = (el) => {
      if (el.dataset.hold) return +el.dataset.hold;
      const n = (el.textContent || "").trim().length;
      return Math.min(1900, 320 + n * 13);
    };
    const step = () => {
      if (stageRun !== run) return;
      const el = run.items[run.i++];
      if (!el) return U.stageFinish(true);
      el.classList.add("shown");
      const fig = el.classList.contains("said") ? el.querySelector(".said-fig .pp") : null;
      if (fig) fig.classList.add("talk");
      if (el.classList.contains("write")) U.write(el, () => { if (fig) fig.classList.remove("talk"); if (stageRun === run) run.timer = setTimeout(step, 320); });
      else run.timer = setTimeout(step, holdAfter(el));
    };
    run.timer = setTimeout(step, 60);
  };
  U.staging = () => !!stageRun;

  // ---------- A page shown again ----------
  // The quill writes a page once. Shown again, the whole page is there at once: no writing, no staged
  // reveal, no title card, and the scene's conch and place music do not start over (ui/scene.js).
  // Again means already put on screen in this visit to the scene (K.visit counts arrivals, so closing
  // the menu or the journal over the page, the painting seen whole, a language switch and a redrawn
  // result are all the same visit), or the scene that Continue, a loaded life or the way back from
  // the practice ground returns to (K.resumed, engine/flow.js).
  const pages = { visit: null, shown: new Set() };
  const shownNow = () => { if (pages.visit !== K.visit) { pages.visit = K.visit; pages.shown = new Set(); } return pages.shown; };
  U.pageAgain = (key, resumable) => shownNow().has(key) || (!!resumable && K.visit != null && K.resumed === K.visit);
  U.pageShown = (key) => { shownNow().add(key); };

  // ---------- The quill ----------
  // Scene-setting lines are written out letter by letter by a peacock-feather pen. Letters are cut
  // as whole graphemes, so a Devanagari syllable with its vowel signs appears in one stroke.
  const QUILL = '<svg viewBox="0 0 60 120" aria-hidden="true">' +
    '<path d="M5 117 C18 88 30 52 50 10" stroke="#e8dcc0" stroke-width="1.6" fill="none"/>' +
    '<g stroke="#4f9a6a" stroke-width="0.9" opacity="0.85" fill="none">' +
    '<path d="M14 92 l-8 -10 M14 92 l10 -4 M19 80 l-9 -11 M19 80 l11 -5 M24 68 l-9 -12 M24 68 l12 -5 M30 56 l-9 -12 M30 56 l12 -6 M35 45 l-8 -12 M35 45 l12 -6"/></g>' +
    '<ellipse cx="49" cy="17" rx="10" ry="15" transform="rotate(28 49 17)" fill="#2f7d55"/>' +
    '<ellipse cx="49" cy="17" rx="7" ry="11" transform="rotate(28 49 17)" fill="#e2b55a"/>' +
    '<ellipse cx="49.5" cy="17.5" rx="4.6" ry="7.4" transform="rotate(28 49 17)" fill="#1f56b0"/>' +
    '<ellipse cx="50" cy="18" rx="2.2" ry="3.6" transform="rotate(28 49 17)" fill="#0b1d45"/>' +
    '<path d="M2 120 L6 113 L8 116 Z" fill="#1a1208"/></svg>';
  let writer = null;
  const segmenter = window.Intl && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const graphemes = (t) => (segmenter ? Array.from(segmenter.segment(t), (x) => x.segment) : Array.from(t));
  U.write = function (el, done) {
    U.writeFinish();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const frag = document.createDocumentFragment();
      for (const g of graphemes(n.nodeValue)) { const sp = document.createElement("span"); sp.className = "ch"; sp.textContent = g; frag.appendChild(sp); }
      n.parentNode.replaceChild(frag, n);
    }
    const chars = el.querySelectorAll(".ch");
    const host = el.closest(".witness, .result, .telling, .text, .hero-copy, .life-head") || el.parentElement;
    let quill = host.querySelector(":scope > .quill");
    if (!quill) { quill = U.el('<span class="quill">' + QUILL + "</span>"); host.appendChild(quill); }
    el.classList.add("writing");
    quill.classList.add("on");
    const total = chars.length;
    const duration = Math.min(7000, Math.max(800, total * 36)); // an unhurried hand, about 28 letters a second
    const start = performance.now();
    let shown = 0;
    const w = (writer = { el, chars, quill, done, raf: 0 });
    const frame = (now) => {
      if (writer !== w) return;
      const n = Math.min(total, Math.ceil(((now - start) / duration) * total));
      if (n > shown && K.Sound && /\S/.test(chars[n - 1].textContent)) K.Sound.play("quill");
      for (; shown < n; shown++) chars[shown].classList.add("on");
      const last = chars[Math.max(0, shown - 1)];
      if (last) {
        const r = last.getBoundingClientRect(), h = host.getBoundingClientRect();
        quill.style.transform = "translate(" + (r.right - h.left - 3) + "px," + (r.bottom - h.top - 85) + "px)";
        // Keep the line being written in view inside a scrolling story.
        const story = el.closest(".story");
        if (story && story.dataset.follow !== "") { const sr = story.getBoundingClientRect(); if (r.bottom > sr.bottom - 18) story.scrollTop += r.bottom - sr.bottom + 36; }
      }
      if (shown >= total) return finish(true);
      w.raf = requestAnimationFrame(frame);
    };
    const finish = (callDone) => {
      if (writer !== w) return;
      writer = null;
      cancelAnimationFrame(w.raf);
      chars.forEach((c) => c.classList.add("on"));
      el.classList.remove("writing");
      quill.classList.remove("on");
      if (callDone && done) done();
    };
    w.finish = finish;
    w.raf = requestAnimationFrame(frame);
  };
  U.writeFinish = function () { if (writer) writer.finish(false); };
  U.stageFinish = function (callDone = true) {
    const run = stageRun;
    if (!run) return;
    stageRun = null;
    clearTimeout(run.timer);
    U.writeFinish();
    run.items.forEach((el) => el.classList.add("shown", "now"));
    if (callDone && run.done) run.done();
  };
  document.addEventListener("click", (e) => {
    if (!stageRun || e.target.closest("button, a, input, textarea, .scrim")) return;
    if (e.target.closest("#leaf")) U.stageFinish(true);
  });

  // Number keys map to whatever buttons the current screen registers.
  let keyActions = [];
  U.keys = (list) => { keyActions = list; };
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (document.querySelector(".scrim")) { if (e.key === "Escape") U.closeModal(); return; }
    // A held key repeats, and a key with Ctrl, Alt or Meta is the browser's; neither chooses anything.
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    // While a title card or a moment covers the page, the page underneath takes no keys.
    if (document.getElementById("beat") || document.querySelector(".moment")) return;
    if (stageRun && (e.key === " " || e.key === "Enter" || /^[1-9]$/.test(e.key))) { e.preventDefault(); U.stageFinish(true); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9 && keyActions[n - 1]) { e.preventDefault(); keyActions[n - 1](); return; }
    // A screen with one thing to do (Begin a test, Continue, Live another life) also answers Enter
    // (not Space, which scrolls a long page). A focused button handles Enter itself, so it is left to do so.
    if (e.key === "Enter" && !(e.target.closest && e.target.closest("button, a, [role=button]"))) {
      const live = keyActions.filter(Boolean);
      if (live.length === 1 && keyActions.length === 1) { e.preventDefault(); live[0](); }
    }
  });

  U.scrollTop = function () {
    const leaf = U.$("leaf");
    if (leaf && leaf.scrollIntoView && leaf.getBoundingClientRect().top < 0) leaf.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  // Modal shell
  U.openModal = function (title, bodyHtml, onMount) {
    U.closeModal();
    const scrim = U.el('<div class="scrim" role="dialog" aria-modal="true" aria-label="' + U.tr(title) + '"><div class="modal"><header><h2>' + U.tr(title) +
      '</h2><button type="button" class="ghost" id="modal-close">' + U.tr("Close") + '</button></header><div id="modal-body">' + bodyHtml + "</div></div></div>");
    scrim.addEventListener("click", (e) => { if (e.target === scrim) U.closeModal(); });
    document.body.appendChild(scrim);
    U.$("modal-close").addEventListener("click", U.closeModal);
    if (onMount) onMount(U.$("modal-body"));
    U.$("modal-close").focus();
  };
  U.closeModal = function () { const s = document.querySelector(".scrim"); if (s) s.remove(); };

  // ---------- Language ----------
  // Each screen registers how to draw itself again (U.redraw), so a language switch can repaint
  // the current screen in place, including a scene whose choice has already been made.
  U.redraw = null;
  U.applyStatic = function () {
    const html = document.documentElement;
    html.lang = (K.LANGS[K.lang] || K.LANGS.en).htmlLang;
    document.title = K.tr("Kurukshetra: A Life");
    U.$("brand").textContent = K.tr("Kurukshetra: A Life");
    U.$("nav").setAttribute("aria-label", K.tr("Game menu"));
    // Icon buttons: the label shows beside the icon on wide screens and is the button's name on phones.
    [["nav-char", "Character"], ["nav-journal", "Journal"], ["nav-map", "Map"], ["nav-menu", "Menu"]].forEach(([id, label]) => {
      const b = U.$(id), t = K.tr(label);
      b.querySelector(".lbl-t").textContent = t; b.setAttribute("aria-label", t); b.title = t;
    });
    U.$("standing-label").textContent = K.tr("Standing");
    U.$("nav-standing").title = K.tr("Standing");
    U.$("view-full").setAttribute("aria-label", K.tr("See the painting whole")); U.$("view-full").title = K.tr("See the painting whole");
    U.$("view-back-t").textContent = K.tr("Back to the story");
    U.$("turn-t").textContent = K.tr("Turn your phone upright to continue");
    U.$("turn-p").textContent = K.tr("This game is made to be played with the phone upright. Everything waits for you here.");
    U.$("nav-standing").setAttribute("aria-label", K.tr("Obligations, bonds, vows and memories"));
    U.$("ledger").setAttribute("aria-label", K.tr("Obligations, bonds, vows and memories"));
  };
  // A language's dictionary loads only when someone chooses it (about 175 KB for Hindi).
  const LANG_FILES = { hi: "js/i18n/hi.js" };
  const langLoads = {};
  U.loadLang = function (lang) {
    if (!LANG_FILES[lang] || (K.hasStrings && K.hasStrings(lang))) return Promise.resolve(true);
    if (!langLoads[lang]) langLoads[lang] = new Promise((ok) => {
      const s = document.createElement("script");
      s.src = LANG_FILES[lang]; s.onload = () => ok(true); s.onerror = () => { delete langLoads[lang]; ok(false); };
      document.head.appendChild(s);
    });
    return langLoads[lang];
  };
  U.setLang = function (lang, reopen) {
    if (!K.LANGS[lang] || lang === K.lang) return;
    if (LANG_FILES[lang] && !(K.hasStrings && K.hasStrings(lang))) { U.loadLang(lang).then((ok) => { if (ok) U.setLang(lang, reopen); }); return; }
    K.lang = lang;
    K.prefs({ lang });
    U.applyStatic();
    if (U.redraw) U.redraw();
    if (reopen) reopen();
  };
  // The two-button language switch used on the title screen and in the menu.
  U.langSwitch = function (onPick) {
    const box = U.el('<div class="langs" role="group" aria-label="Language / भाषा"></div>');
    for (const [id, l] of Object.entries(K.LANGS)) {
      const b = U.button("lang", U.esc(l.name), () => onPick(id));
      b.setAttribute("lang", l.htmlLang);
      b.setAttribute("aria-pressed", String(K.lang === id));
      box.appendChild(b);
    }
    return box;
  };
})(window.K = window.K || {});
