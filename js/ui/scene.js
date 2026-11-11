/* Scene screen: witness layer, the player's choices, results, and the canon "after" beat. */
(function (K) {
  "use strict";
  const U = K.UI;
  // The signs at the right of a choice card: a bow (it can lead to a fight), a skull (it can cost
  // your life), bars (it can cost your freedom). Drawn in the ink of the card, one size.
  const SV = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
  const MARK_SVG = {
    fight: SV + '<path d="M7 2.5c5.5 2.6 9 6.3 9 9.5s-3.5 6.9-9 9.5"/><path d="M7 2.5v19" stroke-width="1"/><path d="M3 12h17M17.5 9.5 20 12l-2.5 2.5M3 10.5 4.5 12 3 13.5"/></svg>',
    death: SV + '<path d="M12 3a7 7 0 0 0-7 7c0 2.5 1.2 4.1 3 5v3.5h8V15c1.8-.9 3-2.5 3-5a7 7 0 0 0-7-7z"/><circle cx="9.3" cy="10.5" r="1.6" fill="currentColor"/><circle cx="14.7" cy="10.5" r="1.6" fill="currentColor"/><path d="M10.5 18.5v2M13.5 18.5v2M12 13.2v1.3"/></svg>',
    cell: SV + '<rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M8.5 3.5v17M12 3.5v17M15.5 3.5v17M4 9h16"/></svg>',
    // A heart split down the middle: a friendship that would end.
    friend: SV + '<path d="M12 20.5 4.2 12.7A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 7.8 6.1L12 20.5z"/><path d="M12 6.6 10.4 10l2.6 2.2-2 3.2 1 1.6" stroke-width="1.4"/></svg>',
    // A broken arrow: a divine weapon's condition broken.
    astra: SV + '<path d="M3 21l7-7M14 10l7-7M16.5 3H21v4.5"/><path d="M10.2 13.8 12 12M12.5 10.5l1.5-.5M3 21l2.5-.5L4 19"/><path d="M11 8.5l1.5 1.5M8.5 11l1.5 1.5" stroke-width="1.2"/></svg>'
  };

  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8z"/></svg>';

  function header(sc) {
    const S = K.S;
    // The prologue is a dream of the war, years ahead: no age, so the childhood that follows reads as now.
    U.where("<b>" + U.t(K.val(sc.actTitle) || K.ACT_TITLES[S.act] || "") + "</b><span>" + (sc.prologue ? U.tr("Years from now") : U.tr("Age {n}", { n: S.age })) + " · " + U.t(K.val(sc.place) || "") + "</span>");
  }
  function artFor(sc, opening) {
    // sc.liveArt: a clip that plays in the picture when the page opens (the house of lac catching fire, owner 5 November).
    // Where video cannot play, and once the choice is made, the scene's own painting.
    if (opening && sc.liveArt && U.hasVideo(sc.liveArt) && U.living()) return sc.liveArt;
    const a = K.val(sc.art);
    // The charioteer family's Champa years use Anga's painting.
    if (a === "origin") return K.S.origin === "suta" && !K.S.flags.includes("moved_capital") ? "home_anga" : "home_" + K.S.origin;
    return a;
  }
  function tagFor(sc) {
    if (sc.prologue) return ["war", K.tr("A dream")];
    // Fate: what the epic has already written, and the part of your life that is still unwritten.
    if (sc.canon && sc.war) return ["canon war", K.tr("Written · the war")];
    if (sc.canon) return ["canon", K.tr("Written")];
    if (sc.war) return ["war", K.tr("Unwritten · the war")];
    return ["yours", K.tr("Unwritten")];
  }

  // Other moments where everything is at stake: the music turns tense for these too.
  let lastPlace = null;
  const TENSE = new Set(["a1_poison", "a3_lac", "a5_karna_secret", "a5_side"]);
  // A conch for each day of the war, once per scene (not again when the screen is redrawn).
  let lastConch = null;
  let settledFor = null; // the scene whose painting has moved up above its page
  U.renderScene = function (sc) {
    U.keys([]); // the previous screen's keys end here, before any title card plays
    stopLamp();
    if (U.stageFx) U.stageFx.stop();
    if (sc.ending) return U.renderEnding(sc);
    const S = K.S;
    // A page already shown (ui/dom.js U.pageAgain), or the same choice come back to after a closed
    // way, is there whole at once: no quill, no title card, and no conch or place music again.
    const pageKey = "scene:" + sc.id;
    const again = U.pageAgain(pageKey, true) || !!(S.loopThen && S.loopThen.scene === sc.id);
    // The prologue opens on the child it is dreamt by: supper at home, bed, and the dream rising.
    if (sc.sleepIntro && !again && sleepFor !== K.visit && U.beatsOn()) { sleepFor = K.visit; return U.sleepIntro(() => U.renderScene(sc)); }
    if (sc.war && !again && lastConch !== sc.id && K.Sound) K.Sound.play("conch");
    // The music follows the stakes: the war, the dice hall and timed moments are tense.
    // The music follows the stage: the war plays the battle anthem; the dice game, the exile years and
    // high-stakes moments the fusion piece; everything else the heroic theme.
    if (K.Sound) K.Sound.mood(sc.war || sc.act === 6 ? "battle" : sc.act === 4 || sc.act === 5 || K.val(sc.lamp) || TENSE.has(sc.id) ? "tense" : "calm");
    lastConch = sc.id;
    U.redraw = () => U.renderScene(sc);
    U.setNav(true);
    header(sc);
    // A new place on the map: the journey comes first, then the scene. The reason is the scene's
    // own travel line, or what lies ahead.
    const moved = K.travel ? K.travel(sc) : null;
    // Arriving somewhere new: the place's own short piece (audio.js), once per arrival.
    if (!moved && S.at && S.at !== lastPlace && K.Sound && K.Sound.place) { lastPlace = S.at; if (!again) K.Sound.place(S.origin === "suta" && S.at === "anga" ? "suta" : S.at); }
    if (moved && U.journeyPage) {
      if (K.headless) U.mapOf(S);
      else if (!again) { // Continue onto a scene already seen does not walk the road to it again
        const place = K.val(sc.place);
        const why = K.val(sc.travel) || (K.homePlace && place === K.homePlace(S) ? ["You go home to {place}.", { place }] : ["Ahead: {what}", { what: K.val(sc.title) || "" }]);
        return U.journeyPage(moved[0], moved[1], why, () => U.renderScene(sc));
      }
    }
    const [tag, tagText] = tagFor(sc);
    // Each new scene opens in beats: an act card when a new act begins, the scene's title card, the
    // painting alone for a moment, and only then the page. Once per scene, never on a redraw.
    U.beatStop();
    if (beatSeen !== sc.id && !again && U.beatsOn()) {
      beatSeen = sc.id;
      // The prologue (a dream of the war) has no act card; Act I's card comes when the childhood begins.
      const newAct = !sc.prologue && actSeen !== S.act;
      if (!sc.prologue) actSeen = S.act;
      return U.sceneBeats(sc, { act: newAct, full: newAct || bigScene(sc), tag, tagText }, () => U.renderScene(sc));
    }
    beatSeen = sc.id; if (!sc.prologue) actSeen = S.act;
    const witness = K.val(sc.witness);
    const leaf = U.$("leaf");
    leaf.className = "leaf split";
    const liveArt = sc.liveArt && artFor(sc, true) === sc.liveArt;
    leaf.innerHTML = U.plate({ art: artFor(sc, true), still: !!(sc.clipAfter || sc.still || liveArt), grad: sc.plate, caption: K.val(sc.caption), tag, tagText, heading: K.val(sc.title) }) +
      '<div class="text"><div class="story" id="story" tabindex="0">' +
      (witness ? '<div class="witness"><div class="lbl">' + U.tr("As it is written") + "</div>" + U.blocks(witness) + "</div>" : "") +
      (S.loopThen && S.loopThen.scene === sc.id ? '<p class="aside loopnote">' + U.tr("You are back at the same choice. One way is closed to you now.") + "</p>" : "") +
      U.blocks(sc.body) + '</div><div class="actions"><div class="choices" id="choices"></div><p class="hint" id="keyhint"></p></div></div>';
    U.follow(U.$("story"));
    storyFx(sc);
    const box = U.$("choices");
    const rows = K.choiceList(sc);
    const keys = [];
    // sc.grid: the choices as a grid of large tappable pictures, each with its short label.
    const grid = !!K.val(sc.grid) && rows.every(({ c }) => K.val(c.img));
    box.classList.toggle("grid", grid);
    // Four or more short choices with nothing beneath them sit two to a row on a phone (owner, 5 November: less of the screen under words).
    box.classList.toggle("two", !grid && rows.length >= 4 && rows.every(({ c, ok, crossed }) => !crossed && U.t(K.val(c.t)).length <= 30));
    rows.forEach(({ c, ok, crossed }, i) => {
      // The card shows no effect line (effects are found in play). A way closed by two failed tests
      // stays on the page, struck through, with the reason; a locked one shows its short reason.
      const fx = crossed ? '<span class="down">' + U.t(crossed) + "</span>" : ok ? "" : U.t(K.val(c.locked) || "");
      const img = K.val(c.img);
      const marks = ok ? K.choiceMarks(c) : [];
      const vowMark = marks.find((m) => m[0] === "vow");
      const signs = marks.filter((m) => !(m[0] === "vow" && img === m[3])).map((m) => m[0] === "vow" ? U.thumb(m[3], "emblem mark", m[1]).replace("<i ", '<i title="' + U.esc(m[2]) + '" ')
        : m[0] === "breakvow" ? U.thumb(m[3], "emblem mark breakvow", m[1]).replace("<i ", '<i title="' + U.esc(m[1]) + '" ')
        : '<i class="mark ' + m[0] + '" role="img" aria-label="' + U.esc(m[1]) + '" title="' + U.esc(m[1]) + '">' + MARK_SVG[m[0]] + "</i>").join("");
      // On a picture grid, small gold stars at the picture's corner on what suits you best (c.stars, 1 to 3).
      const nStars = grid && ok ? Math.min(3, K.val(c.stars) | 0) : 0;
      const stars = nStars ? '<span class="stars s' + nStars + '" role="img" aria-label="' + U.tr("Suits you best") + '" title="' + U.tr("Suits you best") + '">' + STAR.repeat(nStars) + "</span>" : "";
      // On a picture grid, c.sub: a short line under the name (the paths: what each fights with).
      const sub = grid && K.val(c.sub) ? '<span class="sub">' + U.t(K.val(c.sub)) + "</span>" : "";
      const cls = "choice" + (grid ? " tile" : "") + (img ? " has-img" : "") + (crossed ? " crossed" : "") + (fx ? " has-fx" : "") + (signs ? " has-marks" : "") + (stars ? " has-stars" : "") + (sub ? " has-sub" : "");
      const b = U.button(cls, '<span class="k">' + (i + 1) + "</span>" + (img ? U.thumb(img, grid ? "emblem" : undefined) : "") + stars + '<span class="t">' + U.t(K.val(c.t)) + "</span>" + sub +
        (fx ? '<span class="fx">' + fx + "</span>" : "") + (signs ? '<span class="marks">' + signs + "</span>" : ""), null, "choice-" + c.id);
      if (vowMark) b.title = vowMark[2];
      if (!ok && !crossed && fx) { b.title = fx.replace(/<[^>]+>/g, ""); b.setAttribute("aria-label", U.t(K.val(c.t)) + ": " + b.title); } // (on a phone the reason folds away; it stays as the card's label)
      b.disabled = !ok;
      const run = () => pick(sc, c, b);
      b.addEventListener("click", run);
      keys.push(ok ? run : null);
      box.appendChild(b);
    });
    // Beside a second chance: "Practise first, then try again" (ui/practice.js).
    if (U.practiceOffer) U.practiceOffer(sc, rows, box);
    U.$("keyhint").textContent = rows.length > 2 ? K.tr("Press 1 to {n} to choose.", { n: rows.length }) : rows.length === 2 ? K.tr("Press 1 or 2 to choose.") : "";
    U.renderLedger();
    U.scrollTop();
    // Set the scene first, then offer the choices.
    const text = leaf.querySelector(".story");
    const story = [];
    for (const el of text.children) {
      if (el.classList.contains("witness")) { el.dataset.hold = 250; story.push(el, ...el.children); }
      else story.push(el);
    }
    const plate = leaf.querySelector(".plate, .pagehead");
    if (plate) plate.dataset.hold = 500;
    const h1 = text.querySelector("h1");
    if (h1) h1.dataset.hold = 650;
    [...box.children].forEach((b) => { b.dataset.hold = 110; });
    // The scene-setting lines are written out by the quill.
    if (!again) story.forEach((el) => { if (el.tagName === "P" || el.classList.contains("said")) el.classList.add("write"); });
    U.keys([]);
    // The page comes up over the whole painting and grows as the story is written (lines and
    // choices not shown yet take no room). The painting holds still behind it; once everything is
    // there, it moves up into the space above the page, in one movement.
    if (settledFor !== sc.id) U.settled = false;
    U.fitBackdrop();
    const acts = box.parentElement;
    acts.dataset.hold = 0;
    U.pageShown(pageKey);
    U.stage([plate, ...story, acts, ...box.children, U.$("keyhint")], () => {
      U.keys(keys); startLamp(sc, rows);
      // "Try again" after a deadly test failed once: the test starts again at once.
      if (U.autoTry === sc.id && rows.length === 1 && rows[0].c.again) { U.autoTry = null; keys[0](); return; }
      // Before a choice that could cost your life or your freedom, the figure trembles.
      if (K.inPeril && rows.some((r) => r.ok && r.c.peril && K.inPeril(r.c))) U.puppetReact("tremble");
      settledFor = sc.id; U.settled = true;
      setTimeout(() => U.fitBackdrop(), U.motion() ? 450 : 0);
    }, again);
    if (liveArt) U.addClip(); // the clip starts with the page, not under the title cards before it
    U.livePlay();
    if (U.playMoments && K.momentQueue && K.momentQueue.length) U.playMoments();
    // The paintings this scene's choices lead to, loaded while the player reads.
    setTimeout(() => {
      const keys = [];
      for (const { c } of rows) {
        const nx = typeof c.next === "string" ? K.SCENES[c.next] : null;
        if (nx) { try { const a = artFor(nx); if (typeof a === "string") keys.push(a); } catch (e) { /* art that needs a later state */ } }
        if (c.trial && typeof c.trial.stage === "string") keys.push(c.trial.stage);
      }
      if (typeof sc.next === "string" && K.SCENES[sc.next]) { try { const a = artFor(K.SCENES[sc.next]); if (typeof a === "string") keys.push(a); } catch (e) { /* later state */ } }
      U.preloadArt(keys);
    }, 1500);
  };

  // ---------- Falling asleep into the dream ----------
  // Before the prologue: the six-year-old at home in the evening, eating; then asleep on a rope bed as
  // the lamp burns down; then a dream bubble rises from the sleeper and opens onto the war. About eight
  // seconds, or a tap. A plain room: the child, a leaf plate, a charpai, the clay lamp.
  let sleepFor = null;
  const PLATE = '<svg class="si-plate" viewBox="0 0 120 40" aria-hidden="true"><ellipse cx="60" cy="26" rx="56" ry="12" fill="#3f7a3a" stroke="#24120a" stroke-width="1.5"/><path d="M8 26 Q60 18 112 26" stroke="#2c5a2a" stroke-width="1.2" fill="none"/>' +
    '<ellipse cx="54" cy="22" rx="18" ry="7" fill="#f1ead8" stroke="#8a7a5a" stroke-width="0.8"/><circle cx="80" cy="22" r="7" fill="#c9862f" stroke="#6b3a14" stroke-width="0.8"/><circle cx="32" cy="24" r="5" fill="#8a3a1c"/></svg>';
  const BED = '<svg class="si-bed" viewBox="0 0 240 70" aria-hidden="true"><g stroke="#24120a" stroke-width="1.6"><rect x="12" y="20" width="216" height="12" rx="3" fill="#7a4a24"/><path d="M22 32 V62 M218 32 V62 M120 32 V58" stroke="#5a3418" stroke-width="7" stroke-linecap="round"/></g>' +
    '<path d="M24 22 L60 30 M60 22 L96 30 M96 22 L132 30 M132 22 L168 30 M168 22 L204 30 M24 30 L60 22 M60 30 L96 22 M96 30 L132 22 M132 30 L168 22 M168 30 L204 22" stroke="#d9c79a" stroke-width="1.1" opacity="0.8"/>' +
    '<path d="M18 20 Q14 10 30 10 L64 10 Q72 12 70 20 Z" fill="#e8dcc0" stroke="#24120a" stroke-width="1.2"/></svg>';
  // Inside the house: a mud-plastered wall and floor, and nothing else; the figures carry the scene.
  const WALL = '<svg class="si-wall" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs>' +
    '<linearGradient id="si-wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2416"/><stop offset="0.7" stop-color="#4a2f1c"/><stop offset="0.72" stop-color="#5b3a22"/><stop offset="1" stop-color="#3b2414"/></linearGradient></defs>' +
    '<path fill="url(#si-wg)" d="M0 0H100V100H0Z"/>' +
    '<path d="M0 72 H100" stroke="#6b4527" stroke-width="1" vector-effect="non-scaling-stroke"/></svg><div class="si-glow"></div>';
  // Your house on the homeland's painting: a doorway with a lamp lit inside, for you to walk into.
  const DOOR = '<svg class="si-door" viewBox="0 0 150 210" aria-hidden="true"><defs><radialGradient id="si-dg" cx="50%" cy="70%" r="60%"><stop offset="0" stop-color="#ffcf8a"/><stop offset="0.5" stop-color="#c8742c"/><stop offset="1" stop-color="#3a1c0c"/></radialGradient></defs>' +
    '<path d="M0 70 Q75 4 150 70 L150 210 L0 210 Z" fill="#8a6440" stroke="#24120a" stroke-width="2"/><path d="M-6 72 Q75 -6 156 72 L148 64 Q75 6 2 64 Z" fill="#c9a25a" stroke="#24120a" stroke-width="1.5"/>' +
    '<path d="M44 210 V118 Q75 86 106 118 V210 Z" fill="url(#si-dg)" stroke="#24120a" stroke-width="2"/><path d="M38 210 V116 Q75 78 112 116 V210" fill="none" stroke="#5a3418" stroke-width="5"/></svg>';
  U.sleepIntro = function (done) {
    if (K.headless || /jsdom/i.test(navigator.userAgent || "")) return done();
    U.beatStop();
    const S = K.S;
    const still = U.calm();
    const home = S.origin === "suta" ? "home_anga" : "home_" + S.origin;
    const kid = Object.assign({}, K.puppetSpec(S), { stage: "child", item: null, dead: false });
    const O = K.ORIGINS[S.origin] || {};
    const lines = [null, "Supper with the family.", "Then bed. The lamp burns low.", ["And you dream.", null]];
    // The family at supper, kneeling in two pairs that face each other: grandmother and you, mother
    // and father. Their figures are cut from your homeland's colours, as yours is.
    const base = K.puppetSpec(S), skin = (base.palette || [])[0], trim = (base.palette || [])[2];
    const kin = (pronoun, stage, cloth) => Object.assign({}, base, { pronoun, stage, item: null, heir: null, temper: null, scar: false, glow: false, eye: false, sling: false, limp: false, dead: false, palette: [skin, cloth, trim] });
    const fig = (spec, flip, cls) => '<span class="fm ' + cls + '">' + U.puppet(spec, { h: 150, pose: "sit", flip, cls: cls === "kid" ? "si-kid" : "" }) + "</span>";
    const family = '<div class="si-eat si-family">' + fig(kin("she", "elder", "#b9a27c"), false, "gm") + fig(kid, false, "kid") + fig(kin("she", "adult", "#8a2f3a"), true, "mo") + fig(kin("he", "adult", (base.palette || [])[1] || "#6f3a24"), true, "fa") +
      '<div class="si-mat">' + PLATE + PLATE + PLATE + PLATE + "</div></div>";
    // Your homeland's painting, full screen, and you walking home across it; then inside: supper,
    // bed, the lamp going out, and the dream bubble opening onto the war.
    const el = U.el('<div class="sleepin" role="presentation">' +
      '<div class="si-region" style="--img:url(\'' + U.bgUrl(home) + '\')">' + DOOR + '<span class="si-walker">' + U.puppet(kid, { h: 170, pose: "walk" }) + "</span>" +
      // Your homeland, introduced as it is on the character screen: its name, where it lies, what it is.
      '<div class="si-intro"><span class="si-where">' + U.t(O.region || "") + "</span><b>" + U.t(O.name || "") + "</b><p>" + U.t(O.detail || "") + "</p></div></div>" +
      WALL + '<div class="si-night"></div>' +
      '<div class="si-room">' + family +
      '<div class="si-sleep">' + BED + '<span class="si-sleeper">' + U.puppet(kid, { h: 120, pose: "dead" }) + "</span></div>" +
      '<span class="si-lamp"><img src="art/diya.png" alt=""><img class="flame" src="art/diya_flame.png" alt=""></span>' +
      '<span class="si-dots"><i></i><i></i><i></i></span></div>' +
      '<div class="si-bubble" style="--img:url(\'' + U.bgUrl("war_day14") + '\')"></div>' +
      '<p class="si-cap"></p><span class="mo-tap">' + U.tr("Tap to go on") + "</span></div>");
    el.classList.add("now"); // it covers the screen at once; only its own picture fades in
    document.body.appendChild(el);
    // Nothing of the screen before (the character page) may show under or after it.
    { const leaf = U.$("leaf"); if (leaf) { leaf.className = "leaf"; leaf.innerHTML = ""; } U.setBackdrop(null); }
    if (U.stageFx) U.stageFx.stop();
    const cap = el.querySelector(".si-cap");
    // Supper gets a second line, smaller: what time with the family is like.
    const sub = { 1: "Grandmother's old stories, your father's bad jokes, and always a little more rice for you." };
    const say = (i) => { cap.classList.remove("in"); void cap.offsetWidth; cap.innerHTML = U.esc(K.text(lines[i])) + (sub[i] ? "<small>" + U.esc(K.tr(sub[i])) + "</small>" : ""); cap.classList.add("in"); };
    const timers = [];
    let gone = false;
    const at = (ms, f) => timers.push(setTimeout(() => { if (!gone) f(); }, still ? ms * 0.5 : ms));
    // What comes next is drawn underneath first; then this fades off it, so nothing else shows between.
    const end = () => { if (gone) return; gone = true; timers.forEach(clearTimeout); window.removeEventListener("keydown", key, true); done(); el.classList.add("out"); setTimeout(() => el.remove(), 600); };
    const key = (e) => { if ([" ", "Enter", "Escape", "ArrowRight"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); end(); } };
    el.addEventListener("click", end);
    window.addEventListener("keydown", key, true);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
    // You walk home along the bank to your own door, and go in.
    at(1600, () => {
      const door = el.querySelector(".si-door"), walker = el.querySelector(".si-walker");
      if (door && walker) { const d = door.getBoundingClientRect(), w = walker.getBoundingClientRect(); walker.style.left = Math.round(d.left + d.width / 2 - w.width / 2) + "px"; }
      el.classList.add("walking");
    });
    at(4900, () => el.classList.add("entered"));
    at(5600, () => { el.classList.add("inside"); say(1); });
    at(9200, () => { el.classList.add("night"); say(2); });
    at(11000, () => el.classList.add("dark"));
    at(11600, () => { el.classList.add("dream"); say(3); });
    at(12600, () => el.classList.add("open"));
    at(14200, end);
  };

  // ---------- Waking from the dream, at home ----------
  // The dream breaks to white, then the dark room: you sit up on the rope bed, shaking and wet with
  // sweat; your mother comes in with a lamp and kneels by you; your father, in the doorway, tells you
  // the war has been foretold, and that you must grow up ready for it. A tap moves on a beat.
  U.wakeScene = function (text, done) {
    if (K.headless || /jsdom/i.test(navigator.userAgent || "")) return done();
    U.beatStop();
    if (U.stageFx) U.stageFx.stop();
    const S = K.S;
    const base = K.puppetSpec(S), pal = base.palette || [], skin = pal[0], trim = pal[2];
    const plain = { item: null, heir: null, temper: null, scar: false, glow: false, eye: false, sling: false, limp: false, dead: false };
    const kid = Object.assign({}, base, plain, { stage: "child", heir: base.heir, temper: base.temper });
    const mom = Object.assign({}, base, plain, { pronoun: "she", stage: "adult", palette: [skin, "#8a2f3a", trim] });
    const dad = Object.assign({}, base, plain, { pronoun: "he", stage: "adult", palette: [skin, pal[1] || "#6f3a24", trim] });
    const el = U.el('<div class="sleepin wakeup" role="presentation">' + WALL + '<div class="si-night"></div>' +
      '<div class="si-room"><div class="wk-bed">' + BED + '<span class="wk-kid">' + U.puppet(kid, { h: 130, pose: "sit", flip: true }) + '</span></div>' +
      '<span class="wk-mom"><i class="wk-mglow"></i>' + U.puppet(mom, { h: 170, pose: "walk" }) + '<span class="si-lamp wk-lamp"><img src="art/diya.png" alt=""><img class="flame" src="art/diya_flame.png" alt=""></span></span>' +
      '<span class="wk-dad">' + U.puppet(dad, { h: 210, pose: "stand", flip: true }) + "</span></div>" +
      '<div class="wk-white"><p>' + U.t(text || "") + "</p></div>" +
      '<div class="wk-say"><span class="wk-who"></span><p></p></div><span class="mo-tap">' + U.tr("Tap to go on") + "</span></div>");
    el.classList.add("in", "now"); // it opens already white, under the white the fight ended on
    document.body.appendChild(el);
    const who = el.querySelector(".wk-who"), line = el.querySelector(".wk-say p"), say = el.querySelector(".wk-say");
    const pp = (sel) => el.querySelector(sel + " .pp");
    const setPose = (sel, p) => { const s2 = pp(sel); if (s2) s2.setAttribute("class", s2.getAttribute("class").replace(/pose-\S+/, "pose-" + p)); };
    const talk = (sel, on) => { const s2 = pp(sel); if (s2) s2.classList.toggle("talk", on); };
    const tell = (speaker, words) => { say.classList.remove("in"); void say.offsetWidth; who.textContent = speaker ? K.tr(speaker) : ""; line.textContent = K.text(words); say.classList.add("in"); };
    const beats = [
      { ms: 2800, run: () => {} }, // the white: the dream breaking
      { ms: 3400, run: () => { el.classList.add("woken"); tell(null, "You wake with a cry, soaked in sweat, in your own bed."); } },
      { ms: 2200, run: () => { el.classList.add("mom-in"); say.classList.remove("in"); } },
      { ms: 4600, run: () => { setPose(".wk-mom", "kneel"); el.classList.add("lit"); talk(".wk-mom", true); tell("Your mother", "\"Hush. It was only a dream. You are home, and I am here.\""); setTimeout(() => talk(".wk-mom", false), 2600); } },
      { ms: 6400, run: () => { el.classList.add("dad-in"); talk(".wk-dad", true); tell("Your father", "\"The sages have said it for years: the Kuru cousins will go to war, and the whole land with them. Perhaps you saw it. Then grow strong, and be ready when it comes.\""); setTimeout(() => talk(".wk-dad", false), 4200); } }
    ];
    let i = -1, timer = null, gone = false;
    const end = () => { if (gone) return; gone = true; clearTimeout(timer); window.removeEventListener("keydown", key, true); done(); el.classList.add("out"); setTimeout(() => el.remove(), 700); };
    const next = () => { if (gone) return; clearTimeout(timer); i++; if (i >= beats.length) return end(); beats[i].run(); timer = setTimeout(next, beats[i].ms); };
    const key = (e) => { if ([" ", "Enter", "Escape", "ArrowRight"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); next(); } };
    el.addEventListener("click", next);
    window.addEventListener("keydown", key, true);
    next();
  };

  // ---------- Waking from the dream ----------
  // The prologue's fight ends in white: one line, then the child wakes. About five seconds, or a tap.
  U.wake = function (text, done) {
    if (K.headless || /jsdom/i.test(navigator.userAgent || "")) return done();
    U.beatStop();
    const el = U.el('<div class="wake" role="presentation"><p>' + U.t(text || "") + '</p><span class="mo-tap">' + U.tr("Tap to go on") + "</span></div>");
    document.body.appendChild(el);
    if (U.stageFx) U.stageFx.stop();
    let gone = false;
    const end = () => { if (gone) return; gone = true; clearTimeout(timer); window.removeEventListener("keydown", key, true); el.classList.add("out"); setTimeout(() => { el.remove(); done(); }, 600); };
    const key = (e) => { if ([" ", "Enter", "Escape", "ArrowRight"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); end(); } };
    el.addEventListener("click", end);
    window.addEventListener("keydown", key, true);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
    const timer = setTimeout(end, 6500);
  };

  // ---------- Beats: act cards and scene titles ----------
  // Act card: "Act II", its name and one line, over the painting dimmed, with a gong. About three
  // seconds, or a tap. Title card: Unwritten or Written, the title, your age and place, and your
  // puppet; about a second and a half, or a tap. Then the painting alone, then the page.
  // Full title cards are for act openings, the epic's own scenes, tests, fights and other big
  // moments; ordinary scenes get the short version, the title over the painting. The menu's
  // "Scene titles: short" gives every scene the short version (act cards stay).
  let beatSeen = null, actSeen = null, beatRun = null;
  U.beatsOn = () => !K.headless && !/jsdom/i.test(navigator.userAgent || "") && K.prefs().beats !== false;
  function bigScene(sc) {
    if (sc.canon || sc.war || K.val(sc.lamp) || TENSE.has(sc.id) || sc.big) return true;
    return K.choiceList(sc).some(({ c }) => c.trial || c.game || c.combat);
  }
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
  U.beatStop = function () {
    if (!beatRun) return;
    clearTimeout(beatRun.timer);
    window.removeEventListener("keydown", beatRun.key, true);
    beatRun.el.remove();
    beatRun = null;
    document.body.classList.remove("beating");
    U.fitBackdrop();
  };
  // A living effect drawn over the scene's painting (sc.fx: "fire", "smoke"), whether or not the
  // painting has a clip: the house of lac burning has embers even where clips cannot play.
  function storyFx(sc, kind, art) {
    kind = kind || K.val(sc.fx);
    const a = art || artFor(sc, true);
    if (sc.liveArt && a === sc.liveArt) return; // the clip has its own fire
    if (kind && U.stageFx) U.stageFx.start(a, kind, { story: true, at: FX_AT[a] });
  }
  // Where in each painting its effect rises from: the burning wing of the lac house; the ashes at dawn.
  const FX_AT = { scene_lac_fire: [0.12, 0.66, 0.18, 0.62], scene_lac: [0.15, 0.85, 0.2, 0.6], end_fire: [0.3, 0.8, 0.35, 0.7] };
  U.storyFx = (kind, art) => { if (kind && U.stageFx) U.stageFx.start(art, kind, { story: true, at: FX_AT[art] }); };
  U.sceneBeats = function (sc, o, done) {
    const S = K.S;
    const still = U.calm();
    // sc.clip: a clip that opens the scene full-screen before its own painting takes over (the
    // lac house catching fire, before the night of the fire is told).
    const clip = o.art === undefined && sc.clip && U.hasVideo(sc.clip) && U.living() ? sc.clip : null;
    const bgKey = o.art !== undefined ? o.art : clip || artFor(sc, true) || null;
    U.setBackdrop(bgKey, { still: !!(sc.clipAfter || sc.still || (sc.liveArt && bgKey === sc.liveArt)) }); // (a liveArt clip waits for the page)
    storyFx(sc, o.fx, bgKey);
    const leaf = U.$("leaf");
    leaf.className = "leaf"; leaf.innerHTML = "";
    document.body.classList.add("beating");
    const el = U.el('<div class="beat" id="beat" role="presentation"></div>');
    document.body.appendChild(el);
    const title = o.title || K.val(sc.title) || K.val(sc.caption) || "";
    const place = K.val(sc.place);
    const where = (sc.prologue ? U.tr("Years from now") : U.tr(S.alive === false ? "Fell at {n}" : "Age {n}", { n: S.age })) + (place ? " · " + U.t(place) : "");
    // A living painting plays full-screen under the cards, then for a few seconds on its own.
    const live = U.liveReady();
    if (live) U.livePlay();
    const steps = [];
    if (o.act) {
      const full = U.t(K.ACT_TITLES[S.act] || "");
      const cut = full.indexOf(" · ");
      const num = cut > 0 ? full.slice(0, cut) : U.tr("Act {n}", { n: ROMAN[S.act] || S.act });
      const name = cut > 0 ? full.slice(cut + 3) : full;
      const line = K.ACT_LINES && K.ACT_LINES[S.act];
      steps.push({ cls: "dim", ms: 3000, html: '<div class="beat-act">' + (U.puppetFor ? '<span class="b-sutra">' + U.puppet(U.puppetFor("sutradhara"), { h: 150, pose: "fold" }) + "</span>" : "") + '<span class="b-num">' + U.esc(num) + "</span><b>" + U.esc(name) + "</b>" +
        '<i class="b-orn" aria-hidden="true"></i>' + (line ? "<p>" + U.t(line) + "</p>" : "") + "</div>",
        on: () => { if (K.Sound) K.Sound.play("gong"); } });
    }
    if (title && (o.full && K.prefs().titles !== "short")) {
      // A fallen figure lies along the ground and would not fit the card; the ending page shows it.
      const spec = K.puppetSpec ? K.puppetSpec(S) : null;
      const fig = spec && !spec.dead && S.alive !== false ? U.puppetBadge(spec, { fit: true }) : "";
      steps.push({ cls: "veil", ms: 1500, html: '<div class="beat-title">' + fig + '<span class="kind ' + o.tag + '">' + U.esc(o.tagText) + "</span><b>" + U.t(title) + "</b><small>" + where + "</small></div>" });
      steps.push({ cls: "clear", ms: live ? (clip ? 7600 : 4200) : 2000, html: "" });
    } else if (title) {
      steps.push({ cls: "low", ms: 1100, html: '<div class="beat-short"><span class="kind ' + o.tag + '">' + U.esc(o.tagText) + "</span><b>" + U.t(title) + "</b></div>" });
      steps.push({ cls: "clear", ms: live ? 3600 : 1300, html: "" });
    } else if (live) steps.push({ cls: "clear", ms: 4200, html: "" });
    const run = { el, timer: null, i: -1, key: null };
    beatRun = run;
    const finish = () => { if (beatRun !== run) return; U.beatStop(); done(); };
    const next = () => {
      if (beatRun !== run) return;
      clearTimeout(run.timer);
      const cur = el.firstElementChild;
      run.i++;
      const st = steps[run.i];
      if (!st) {
        if (cur) cur.classList.replace("in", "out");
        el.classList.add("gone");
        run.timer = setTimeout(finish, still ? 0 : 260);
        return;
      }
      const show = () => {
        if (beatRun !== run) return;
        el.className = "beat " + st.cls;
        el.innerHTML = st.html ? '<div class="beat-in">' + st.html + "</div>" : "";
        const inner = el.firstElementChild;
        if (inner) { if (still) inner.classList.add("in"); else requestAnimationFrame(() => requestAnimationFrame(() => inner.classList.add("in"))); }
        if (st.on) st.on();
        run.timer = setTimeout(next, st.ms);
      };
      if (cur && !still) { cur.classList.replace("in", "out"); run.timer = setTimeout(show, 240); }
      else show();
    };
    // A tap, a click or Space/Enter/Escape moves on to the next beat.
    el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); next(); });
    run.key = (e) => {
      if (document.querySelector(".scrim")) return;
      if ([" ", "Enter", "Escape", "ArrowRight"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); next(); }
    };
    window.addEventListener("keydown", run.key, true);
    next();
  };

  // ---------- The lamp ----------
  // At a few moments the story will not wait: a lamp burns down beside the choices, and if it goes
  // out, the scene's `lamp.silent` choice is made for you. Scene data: lamp: { secs, silent, note }.
  // The lamp pauses while the tab is hidden or a window is open, keeps its oil through a language
  // switch, and is off in the tests and when "Timed moments" is turned off in the menu.
  U.timed = () => !/jsdom/i.test(navigator.userAgent || "") && K.prefs().timed !== false;
  // "Meet blows for me": the defence moments in fights are resolved for you, on the kinder odds. On
  // by default in story mode, unless you have turned it off.
  U.assist = () => { const a = K.prefs().assist; return a === undefined ? !!(K.S && K.S.storyMode) : !!a; };
  // The painted clay lamp (art/diya.png) with its flame as a separate layer, so the flame alone shrinks.
  const DIYA = '<img class="body" src="art/diya.png" alt="">' +
    '<svg class="smoke" viewBox="0 0 330 264" aria-hidden="true"><path d="M285 140 C266 112 302 96 284 68 C266 40 298 26 288 2" fill="none" stroke="#c3a585" stroke-width="7" stroke-linecap="round"/></svg>' +
    '<img class="flame" src="art/diya_flame.png" alt="">';
  let lampRun = null;
  const lampMemo = { key: null, left: 0 };
  function stopLamp() { if (lampRun) { clearTimeout(lampRun.timer); lampRun = null; } }
  function startLamp(sc, rows) {
    stopLamp();
    if (pickedVisit === K.visit) return; // already chosen here: a redraw of the result never lights it again
    const L = K.val(sc.lamp);
    if (!L || !U.timed()) return;
    const silent = rows.find((r) => r.ok && r.c.id === K.val(L.silent));
    const box = U.$("choices");
    if (!silent || !box) return;
    const total = L.secs * 1000;
    const key = sc.id + "#" + K.S.log.length; // the same moment, even after a redraw
    let left = lampMemo.key === key ? lampMemo.left : total;
    const el = U.el('<div class="lamp" role="timer"><span class="diya">' + DIYA + '</span><span class="oil"><i></i></span><span class="lamp-note">' + U.t(L.note) + "</span></div>");
    el.style.setProperty("--oil", (left / total).toFixed(3));
    box.parentNode.insertBefore(el, box);
    const run = (lampRun = { timer: 0 });
    let last = performance.now(), warned = left <= 5000;
    if (K.Sound) K.Sound.play("lamp");
    const tick = () => {
      if (lampRun !== run) return;
      if (!document.body.contains(el)) return stopLamp();
      const now = performance.now();
      if (!document.hidden && !U.paused() && !document.querySelector(".scrim")) left -= now - last;
      last = now;
      lampMemo.key = key; lampMemo.left = left;
      el.style.setProperty("--oil", Math.max(0, left / total).toFixed(3));
      if (left <= 5000 && !warned) { warned = true; el.classList.add("low"); if (K.Sound) K.Sound.play("lamp"); }
      if (left <= 0) {
        stopLamp();
        el.classList.add("out");
        lampMemo.key = null;
        return pick(sc, silent.c, U.$("choice-" + silent.c.id), true);
      }
      run.timer = setTimeout(tick, 100);
    };
    if (left <= 5000) el.classList.add("low");
    run.timer = setTimeout(tick, 100);
  }

  // The chosen card lights up and the others fall away before the result comes in.
  // One choice per visit to a scene (K.visit counts K.go): a second key, a double click, or a lamp that
  // comes back after a redraw can never choose again once something was chosen here.
  let pickedVisit = -1;
  function pick(sc, c, btn, lampOut) {
    if (btn !== null) {
      if (pickedVisit === K.visit) return;
      pickedVisit = K.visit;
      stopLamp();
      lampMemo.key = null;
      if (!lampOut) { const l = U.$("leaf").querySelector(".lamp"); if (l) l.remove(); }
      if (K.Sound) K.Sound.play("choose");
    }
    if (U.motion() && btn && !btn.classList.contains("chosen")) {
      U.keys([]);
      btn.classList.add("chosen");
      U.$("choices").querySelectorAll(".choice").forEach((o) => { if (o !== btn) o.classList.add("dismiss"); o.disabled = true; });
      setTimeout(() => pick(sc, c, null, lampOut), 520);
      return;
    }
    if (c.game && U.games[c.game]) return playGame(sc, c);
    const res = K.choose(sc, c);
    if (lampOut) res.lampOut = true;
    if (res.peril === "death" && K.Sound) K.Sound.play("bell");
    if (res.combat) {
      U.startBattle(res.combat, (outcome) => {
        const o = K.combatOutcome(res.combat, outcome, res.next);
        if (!K.S.alive) return K.go("end_death");
        // A dream fight (the prologue) does not go back to its page: the field goes white, you wake,
        // and the childhood begins.
        if ((K.ENCOUNTERS[res.combat] || {}).dream) return U.wakeScene(o.text, () => (U.askMode ? U.askMode(() => K.go(o.next)) : K.go(o.next))); // on waking: the story, or just the fights (item 21)
        U.renderScene(sc);
        showAfter(sc, c, { text: o.text, after: res.after, check: null, pre: res.text, lampOut: res.lampOut, lostFight: outcome === "lose" ? res.combat : null }, o.next);
      });
      return;
    }
    if (res.text || res.check || res.after || res.lampOut) return showAfter(sc, c, res, res.next, btn);
    K.go(res.next);
  }

  const KIND = { breath: "strength", aim: "archery", push: "strength", draw: "strength", steady: "strength", sneak: "stealth", retort: "wits", notice: "wits", hands: "wits", pasha: "wits",
    rhythm: "strength", race: "war", herd: "stealth", drill: "wits", rings: "wits", dash: "war", chaupar: "wits", baghchal: "wits", moksha: "wits", array: "war", escape: "stealth", fuse: "stealth" };
  // A test written without a painted stage is still played on one: the usual ground for its kind.
  const STAGE_FOR = { breath: "stage_forest_lake", aim: "stage_training_ground", push: "stage_training_ground", draw: "stage_bow_courtyard", steady: "stage_healers_hall", sneak: "stage_palace_corridor",
    retort: "stage_lotus_garden", notice: "stage_vidura_table", hands: "stage_dice_board_top", rhythm: "stage_smithy", race: "stage_racetrack", herd: "stage_khandava_top",
    drill: "stage_training_ground", rings: "stage_chakravyuha_top", dash: "stage_chakravyuha_top", chaupar: "stage_board_table", baghchal: "stage_board_table", moksha: "stage_board_table", array: "stage_vyuha_top", escape: "stage_lac_fire_top", fuse: "stage_lac_cellar" };
  // A choice that is a game: the game takes the place of the choices, and its outcome picks the branch.
  function playGame(sc, c) {
    if (c.trial && !c.trial.stage && STAGE_FOR[c.game]) c.trial.stage = STAGE_FOR[c.game];
    const box = U.$("choices");
    const pimg = K.val(c.img);
    box.innerHTML = "";
    const picked = U.button("choice picked" + (pimg ? " has-img" : ""), '<span class="k">·</span>' + (pimg ? U.thumb(pimg) : "") + '<span class="t">' + U.t(K.val(c.t)) + '</span><span class="fx">' + U.tr("Your choice") + "</span>");
    picked.disabled = true;
    box.appendChild(picked);
    U.$("keyhint").textContent = "";
    U.keys([]);
    // While a test runs, the story steps aside and the test has the whole page.
    U.$("leaf").classList.add("testing");
    // The test is played inside its own painted stage, with its own weather.
    const stage = c.trial && K.val(c.trial.stage);
    if (stage) { U.setBackdrop(stage); U.stageFx.start(stage); }
    if (K.Sound && K.Sound.test) K.Sound.test(c.game);
    const game = U.games[c.game](box, (outcome, summary) => {
      if (K.Sound && K.Sound.test) K.Sound.test(null);
      // A won test gets its own short theme: archery, strength, stealth, wits or war.
      if (outcome === "win" && K.Sound && K.Sound.flourish) K.Sound.flourish((c.trial && c.trial.kind) || KIND[c.game] || "wits");
      else if (outcome !== "win" && K.Sound && !(c.trial && c.trial.practice)) K.Sound.play("lose");
      const res = K.choose(sc, c, outcome);
      if (res.peril === "death" && K.Sound) K.Sound.play("bell");
      res.pre = summary;
      showAfter(sc, c, res, res.next);
    }, c);
    U.redraw = () => game.draw();
  }

  function showAfter(sc, c, res, next) {
    // A language switch now must repaint this state, never offer the choices again.
    U.redraw = () => { U.renderScene(sc); showAfter(sc, c, res, next); };
    // What came of the choice is written once; redrawn (a language switch), it is there at once.
    const pageKey = "after:" + sc.id + ":" + c.id, again = U.pageAgain(pageKey);
    pickedVisit = K.visit;
    stopLamp();
    U.$("leaf").querySelectorAll(".lamp").forEach((l) => l.remove());
    const leaf = U.$("leaf");
    leaf.classList.remove("testing");
    if (U.stageFx) U.stageFx.stop();
    // The painting stays where it is while what came of your choice is written; it moves once, at the end.
    U.finalTop = U.leafTop();
    if (U.preloadMoments) U.preloadMoments(); // a moment this choice earned: its painting on its way now
    U.setBackdrop(artFor(sc), { still: !!(sc.clipAfter || sc.still) });
    storyFx(sc, null, artFor(sc));
    // A clip that shows what happens after the choice (the fire) plays now.
    if (sc.clipAfter && res.after) U.addClip();
    // sc.afterClip: a clip that closes the scene once its outcome is told (the house of lac burning, owner 5 November);
    // where video cannot play, the painting and its fire drawn in code stay.
    if (sc.afterClip && U.hasVideo(sc.afterClip) && U.living()) { if (U.stageFx) U.stageFx.stop(); U.setBackdrop(sc.afterClip); U.livePlay(true); }
    // What you chose and what came of it are written into the story; Continue waits below.
    const story = U.$("story"), box = U.$("choices");
    const pimg = K.val(c.img);
    const picked = U.el('<div class="choice picked' + (pimg ? " has-img" : "") + '"><span class="k">·</span>' + (pimg ? U.thumb(pimg) : "") + '<span class="t">' + U.t(K.val(c.t)) + '</span><span class="fx">' + U.tr("Your choice") + "</span></div>");
    box.innerHTML = "";
    // The page now holds only what you chose and what came of it: the scene's own lines step aside
    // (owner, 3 Nov: a result page was over half text).
    [...story.children].forEach((el) => el.classList.add("past"));
    const added = [picked];
    story.appendChild(picked);
    if (res.pre || res.text || res.check || res.lampOut) {
      const r = res.check;
      added.push(story.appendChild(U.el('<div class="result">' +
        (r && r.word ? '<span class="roll">' + U.tr("Your word is enough. The court believes you without a test.") + "</span>" :
          r ? '<span class="roll">' + U.tr("{label}: rolled {roll}, total {total} against {dc}", { label: r.ch ? K.checkLabel(r.ch) : r.label, roll: r.roll, total: r.total, dc: r.dc }) +
          ' · <b class="' + (r.pass ? "pass" : "fail") + '">' + U.tr(r.pass ? "Success" : "Failure") + "</b></span>" : "") +
        (res.lampOut ? '<p class="aside">' + U.tr("The lamp went out before you chose.") + "</p>" : "") +
        (res.pre ? "<p>" + U.t(res.pre) + "</p>" : "") + (res.text ? "<p>" + U.t(res.text) + "</p>" : "") +
        (res.retry ? '<p class="aside retrynote">' + U.tr("One more try. Fail again, and this life ends here.") + "</p>" : "") + "</div>")));
    }
    if (res.after && K.S.alive) {
      added.push(story.appendChild(U.el('<div class="witness"><div class="lbl">' + U.tr("And then, as it is written") + "</div>" + U.blocks(res.after) + "</div>")));
    }
    // A scene that tells why you are leaving: the journey on the map comes now, after its story.
    let went = false;
    const go = () => {
      if (went) return; // Continue once
      went = true;
      if (res.retry) { U.autoTry = sc.id; return K.go(next); }
      const moved = sc.travelAfter && K.S.alive && K.travel ? K.travel(sc, K.S, true) : null;
      if (moved && U.journeyPage && !K.headless) return U.journeyPage(moved[0], moved[1], K.val(sc.travel) || ["Ahead: {what}", { what: "" }], () => K.go(next));
      K.go(next);
    };
    const cont = U.button("cta" + (res.retry ? " retry" : ""), U.tr(res.retry ? "Try again" : "Continue"), go, res.retry ? "btn-tryagain" : undefined);
    box.appendChild(cont);
    U.$("keyhint").innerHTML = "";
    U.keys([]);
    U.renderLedger();
    const parts = [];
    for (const el of added) {
      if (el.classList.contains("witness") || el.classList.contains("result")) { el.dataset.hold = 250; parts.push(el, ...el.children); }
      else parts.push(el);
    }
    parts.push(cont);
    // After a lost fight that was not deadly: the way to the practice ground (ui/practice.js).
    { const pb = res.lostFight && U.practiceAfterFight ? U.practiceAfterFight(res.lostFight) : null; if (pb) { box.appendChild(pb); parts.push(pb); } }
    if (!again) parts.forEach((el) => { if (el.tagName === "P" || el.classList.contains("said")) el.classList.add("write"); });
    story.dataset.follow = "1";
    U.toEnd(story, true);
    const won = res.check ? res.check.pass : res.outcome ? res.outcome === "win" : null;
    const D = K.lastDelta || {};
    if (again) { /* the figure answered the first time */ }
    else if (D.vowTaken) setTimeout(() => U.puppetReact("vow"), 400);
    // The figure answers what you did: shame for a wrong done, folded hands for respect given.
    else if ((D["duty.conscience"] || 0) <= -2) setTimeout(() => U.puppetReact("shame"), 400);
    else if (won === null && ((D["duty.teacher"] || 0) > 0 || Object.keys(D).some((k) => k.startsWith("bond.") && D[k] >= 2))) setTimeout(() => U.puppetReact("fold"), 400);
    else if (won !== null) setTimeout(() => U.puppetReact(won ? "win" : "lose"), 400);
    U.pageShown(pageKey);
    U.stage(parts, () => { U.toEnd(story, true); U.keys([go]); cont.focus({ preventScroll: true }); U.finalTop = null; setTimeout(() => U.fitBackdrop(), U.motion() ? 300 : 0); }, again);
    // A milestone just reached (a friend for life, a divine weapon, a vow...) gets its moment now,
    // over the page; the result is waiting underneath.
    if (U.playMoments) U.playMoments();
  }
})(window.K = window.K || {});
