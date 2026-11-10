/* The windows over the game: your character, the journal, your standing (obligations, bonds, vows, weapons, memories),
   the menu (saves, settings, the save code, the glossary), loading a save code, and the Book of Lives. The words are the
   2D game's own; only the settings that belonged to paintings are gone, and the graphics quality of the 3D view is new. */
(function (K) {
  "use strict";
  const U = K.UI, G = K.G3;
  const row = (k, v) => '<div class="statrow"><span>' + U.tr(k) + "</span><b>" + U.esc(v) + "</b></div>";
  const died = (name, dead) => (dead ? K.tr("{name} (died)", { name }) : name);
  const pips = (v, max) => { let s = ""; for (let i = 0; i < max; i++) s += '<i class="' + (i < v ? "on" : "") + '"></i>'; return '<span class="pips">' + s + "</span>"; };
  const bar = (label, v, max, key, face) => {
    v = Number(v) || 0; const d = (K.lastDelta || {})[key] || 0;
    return '<div class="person">' + (face ? U.face(face) : "") + '<div style="flex:1;min-width:0"><div class="statrow"><span>' + U.esc(label) + "</span><b>" + v + " / " + max + (d ? ' <span style="color:' + (d > 0 ? "var(--green)" : "var(--red)") + '">' + (d > 0 ? "+" : "") + d + "</span>" : "") +
      '</b></div><div class="meter"><i style="width:' + Math.max(0, Math.min(100, (v / max) * 100)) + '%"></i></div></div></div>';
  };

  U.openCharacter = function () {
    const S = K.S; if (!S) return;
    const life = [["Name", S.name], ["Age", S.age], ["Homeland", S.origin ? K.tr(K.ORIGINS[S.origin].name) : "—"], ["Path", K.tr((K.PATHS[S.path] || {}).name || "Not chosen yet")], ["Teacher", K.tr((K.TEACHERS[S.teacher] || {}).name || "None yet")],
      ["Court", K.tr((K.COURTS[S.court] || {}).name || "None")], ["Side in the war", K.tr(S.side ? (S.side === "pandava" ? "The Pandavas" : S.side === "kaurava" ? "The Kuru throne" : "Neither") : "Not chosen")],
      ["Spouse", S.spouse ? died(K.personName("spouse"), K.isDead(S.spouse)) : K.tr("None")], ["Child", S.child ? died(K.personName(S.child), K.isDead(S.child)) : K.tr("None")]].map(([k, v]) => row(k, v)).join("");
    const attrs = Object.entries(K.ATTRS).map(([k, n]) => { const base = S.attrs[k], now = K.attr(k); return '<div class="statrow"><span>' + U.tr(n) + "</span>" + pips(now, 8) + "<b>" + (now !== base ? U.tr("{now} (base {base})", { now, base }) : now) + "</b></div>"; }).join("");
    const skills = Object.entries(K.SKILLS).map(([k, n]) => '<div class="statrow"><span>' + U.tr(n) + "</span>" + pips(S.skills[k], 6) + "<b>" + S.skills[k] + " / 6</b></div>").join("");
    const rep = Object.entries(K.FACTIONS).map(([k, n]) => row(n, S.rep[k] + " / 10")).join("");
    const extras = [].concat(S.boons.map((b) => "<p><b>" + U.tr(K.BOONS[b].name) + ".</b> " + U.tr(K.BOONS[b].text) + "</p>"))
      .concat(S.curses.map((c) => '<p class="curse"><b>' + U.tr(K.CURSES[c.id].name) + ".</b> " + U.tr(c.fired ? "It has struck." : K.CURSES[c.id].text) + "</p>"))
      .concat(S.injuries.map((i) => "<p><b>" + U.tr(K.INJURIES[i].name) + ".</b> " + U.tr(K.INJURIES[i].text) + "</p>"));
    const temper = S.temperament && K.tr(K.TEMPERAMENTS[S.temperament].name), heir = S.heirloom && K.tr(K.HEIRLOOMS[S.heirloom].name);
    const head = '<div class="record">' + (S.path ? '<span class="chip good">' + U.tr(K.PATHS[S.path].name) + "</span>" : "") +
      (S.teacher ? '<span class="chip">' + U.tr(K.TEACHERS[S.teacher].short === "no one" ? "Self-taught" : K.TEACHERS[S.teacher].short) + "</span>" : "") +
      (temper ? '<span class="chip">' + U.tr("{t} by temperament", { t: temper }) + "</span>" : "") +
      (heir ? '<span class="chip">' + U.tr(S.heirloom === "amulet" && S.flags.includes("amulet_broken") ? "Heirloom: {h!} (cracked)" : "Heirloom: {h!}", { h: heir }) + "</span>" : "") + "</div>";
    const r = K.record(S), merits = (K.MERITS || []).filter((m) => S.flags.includes(m.flag));
    const names = (on) => K.list(on.map((k) => K.tr(K.ATTRS[k] || K.SKILLS[k])));
    const record = '<div class="grid2"><div><h3>' + U.tr("Your record") + "</h3>" + row("Fights won", r.won) + row("Fights lost", r.lost) + row("Tests passed", r.passed) + row("Tests failed", r.failed) + row("Games won", r.gamesWon) + row("Games lost", r.gamesLost) + "</div>" +
      "<div><h3>" + U.tr("What your past still does for you") + "</h3>" + (merits.length ? merits.map((m) => '<p class="small">' + U.tr(m.text) + ' <span class="muted">' + U.tr(m.n > 0 ? "+{n} on tests of {what}" : "{n} on tests of {what}", { n: m.n, what: names(m.on) }) + "</span></p>").join("")
        : '<p class="muted">' + U.tr("Nothing yet. What you do now will count later.") + "</p>") +
      (r.won >= 3 ? '<p class="small">' + U.tr("Experience: +{n} attack in every fight.", { n: Math.min(2, Math.floor(r.won / 3)) }) + "</p>" : "") + (r.last === "lost" ? '<p class="small">' + U.tr("Your last fight was a loss: −1 attack in the next one.") + "</p>" : "") + "</div></div>";
    U.openModal("Character", head + '<div class="grid2"><div><h3>' + U.tr("Life") + "</h3>" + life + "</div><div><h3>" + U.tr("Attributes (age changes these)") + "</h3>" + attrs + "</div><div><h3>" + U.tr("Skills") + "</h3>" + skills + "</div><div><h3>" + U.tr("Standing") + "</h3>" + rep +
      row("Healing herbs", S.items.herbs || 0) + "</div></div>" + (extras.length ? "<h3>" + U.tr("Boons, curses and wounds") + "</h3>" + extras.join("") : "") + record, null, "wide");
  };

  U.openJournal = function () {
    const S = K.S; if (!S) return;
    const items = S.journal.map((j) => '<div class="entry"><small>' + U.tr("Age {n}", { n: j.age }) + "</small>" + U.esc(K.entryText(j)) + "</div>").join("");
    U.openModal("Journal", items || '<p class="muted">' + U.tr("Nothing written yet.") + "</p>");
    const b = document.querySelector(".modal-body"); if (b) b.scrollTop = b.scrollHeight;
  };
  U.openGlossary = function () {
    const d = Object.entries(K.GLOSSARY).map(([t, x]) => [K.tr(t), K.tr(x)]).sort((a, b) => a[0].localeCompare(b[0], K.lang)).map(([t, x]) => '<div class="entry"><small>' + U.esc(t) + "</small>" + U.esc(x) + "</div>").join("");
    U.openModal("Glossary", d);
  };

  // ---------- Standing: obligations, bonds, vows, weapons, memories ----------
  U.renderLedger = function () {};
  U.toggleLedger = U.openStanding = function () {
    const S = K.S; if (!S) return;
    const teacherName = K.TEACHERS && K.TEACHERS[S.teacher] ? ": " + K.tr(K.TEACHERS[S.teacher].short) : "", kingName = K.COURTS && K.COURTS[S.court] ? ": " + K.tr(K.COURTS[S.court].king) : "";
    const rank = K.rankOf ? K.rankOf(S) : null;
    const duties = (rank ? '<p class="muted">' + U.tr("Rank: {rank}", { rank: K.tr(K.RANKS[rank]) }) + "</p>" : "") + Object.entries(K.DUTIES).map(([k, n]) => bar(K.tr(n) + (k === "teacher" ? teacherName : k === "court" ? kingName : ""), S.duty[k], 10, "duty." + k)).join("");
    const lost = (S.lostFriends || []).map((x) => x.who);
    const bondIds = Object.keys(S.bonds).filter((id) => !S.dead.includes(id) && !lost.includes(id)).sort((a, b) => S.bonds[b] - S.bonds[a]).slice(0, 8);
    const bonds = bondIds.map((id) => bar(K.personName(id) + (S.flags.includes("scar_" + id) ? " · " + K.tr("scarred for you") : ""), S.bonds[id], 10, "bond." + id, id)).join("") || '<p class="muted">' + U.tr("No close bonds yet.") + "</p>";
    const vows = S.vows.map((v) => {
      const V = K.VOWS[v.id], w = K.watcherNames(v.id, S);
      const body = v.released ? U.tr("The vow was answered.") : v.broken && v.atoned ? U.tr("Broken at {n}. Your penance lifted the shame.", { n: v.brokenAge }) : v.broken ? U.tr("Broken at {n}. The shame is visible to everyone.", { n: v.brokenAge }) + (V.price ? " " + U.tr(V.price) : "")
        : U.tr(V.keep || V.gift) + (["never_lie", "spare_unarmed"].includes(v.id) && S.age - v.age >= 15 ? "<br>" + U.tr("Kept {n} years: its gift has grown.", { n: S.age - v.age }) : "") + (w ? "<br>" + U.tr("Watched by {who}", { who: w }) : "") + (V.price ? '<br><span style="color:#f0a48e">' + U.tr("Broken: {price}", { price: K.tr(V.price) }) + "</span>" : "");
      return '<div class="life-card"><div><b>' + U.tr(V.name) + '</b><div class="small muted">' + body + "</div></div></div>";
    }).join("") || '<p class="muted">' + U.tr("No vows taken.") + "</p>";
    const g = S.astra && K.ASTRA_GIVERS[S.astra.from];
    const astraNote = g ? '<p class="small">' + (S.astra.broken ? U.tr(g.takes ? "You broke {who}'s condition, and the weapon was taken back." : "You broke the condition. The mantra will fail you at the worst hour.", { who: K.tr(g.who) })
      : U.tr("Your Indrastra was given by {who}, on one condition: “{cond}”", { who: K.tr(g.who), cond: K.tr(g.cond) }) + (K.astraLeft ? " " + U.tr("{n} of 3 uses left", { n: K.astraLeft("astra", S) }) : "")) + "</p>" : "";
    const tapas = (S.tapas || 0) > 0 || (S.vows && S.vows.length) ? bar(K.tr("Tapas"), S.tapas || 0, 20, "tapas") + '<p class="small muted">' + U.tr("Spiritual merit: earned by vows kept through an act, penance and hard right choices; spent on the mantras and rites of the sages.") + "</p>" : "";
    const weapons = (S.astras || []).map((a) => { const A = K.ASTRAS[a.id], gv = K.ASTRA_GIVERS[a.from] || {}; return '<div class="life-card"><div><b>' + U.tr(A.name) + '</b><div class="small muted">' + U.tr(A.mantra) + (gv.cond ? "<br>" + U.tr("Given by {who}, on one condition: “{cond}”", { who: K.tr(gv.who), cond: K.tr(gv.cond) }) : "") + (K.astraLeft ? "<br>" + U.tr("{n} of 3 uses left", { n: K.astraLeft(a.id, S) }) : "") + "</div></div></div>"; }).join("");
    const ch = S.charges || {};
    const charges = [ch.sanjivani ? U.tr("The sanjivani root: one death, still unspent.") : "", ch.kavacha ? U.tr("The kavacha: one killing blow, still unspent.") : "", ch.raksha ? U.tr("The raksha sutra: still tied.") : "",
      S.boons.includes("antardhana") ? (K.vanishReady(S) ? U.tr("Antardhana: ready this act.") : U.tr("Antardhana: used this act.")) : "", S.blessed > S.log.length ? U.tr("An elder's blessing is on you today.") : "", S.soma ? (S.soma.down ? U.tr("The Soma's hangover: -1 for a day.") : U.tr("The Soma in you: +2 for a day.")) : ""].filter(Boolean);
    const moments = (S.moments || []).map((m) => '<span class="chip ' + (m.kind === "farewell" ? "bad" : "good") + '">' + U.esc(K.momentTitle ? K.momentTitle(m, S) : "") + " · " + U.tr("Age {n}", { n: m.age }) + "</span>").join("");
    const chips = [].concat(S.boons.map((b) => '<span class="chip good" title="' + U.tr(K.BOONS[b].text) + '">' + U.tr(K.BOONS[b].name) + "</span>"))
      .concat(S.curses.map((c) => '<span class="chip bad">' + (c.fired ? U.tr("{curse} (struck)", { curse: K.tr(K.CURSES[c.id].name) }) : U.tr(K.CURSES[c.id].name)) + "</span>")).concat(S.injuries.map((i) => '<span class="chip bad">' + U.tr(K.INJURIES[i].name) + "</span>"));
    const secrets = (K.SECRETS || []).filter((s) => K.test(s.when, S)).map((s) => '<p class="small">' + U.tr(s.text) + "</p>").join("");
    const mems = S.memories.slice(-6).reverse().map((m) => '<div class="entry">' + U.esc(K.entryText(m)) + "<small>" + (m.who === "all" ? U.tr("Remembered by many · age {n}", { n: m.age }) : U.tr("Remembered by {who} · age {n}", { who: K.personName(m.who), n: m.age })) + "</small></div>").join("");
    U.openModal("Standing", '<div class="grid2"><div><h3>' + U.tr("Obligations") + '</h3><p class="small muted">' + U.tr("Choices pull these against each other. There is no good or evil bar.") + "</p>" + duties + "</div><div><h3>" + U.tr("Bonds") + "</h3>" + bonds + "</div></div>" +
      "<h3>" + U.tr("Vows ({n} / {max})", { n: K.vowsHeld(), max: K.MAX_VOWS }) + "</h3>" + vows +
      (chips.length ? "<h3>" + U.tr("Boons, curses and wounds") + "</h3><div>" + chips.join("") + "</div>" + astraNote : "") + (weapons ? "<h3>" + U.tr("Divine weapons") + "</h3>" + weapons : "") +
      (charges.length ? charges.map((x) => '<p class="small">' + x + "</p>").join("") : "") + (tapas ? "<h3>" + U.tr("Tapas") + "</h3>" + tapas : "") + (moments ? "<h3>" + U.tr("Moments") + "</h3><div>" + moments + "</div>" : "") +
      (secrets ? "<h3>" + U.tr("Secrets you keep") + "</h3>" + secrets : "") + "<h3>" + U.tr("Memories") + "</h3>" + (mems || '<p class="muted">' + U.tr("Nothing remembered yet.") + "</p>"), null, "wide");
  };

  U.openLoad = function () {
    U.openModal("Load a save code", '<p class="muted">' + U.tr("Paste a save code from this game, on any device.") + '</p><label class="cr-lbl" for="code-in">' + U.tr("Save code") + '</label><textarea id="code-in" spellcheck="false"></textarea>' +
      '<div class="btnrow" style="margin-top:10px"><button class="cta" id="code-load" type="button">' + U.tr("Load this life") + '</button></div><p class="err" id="code-err"></p>', () => {
      U.$("code-load").addEventListener("click", () => {
        let s;
        try { s = K.importCode(U.$("code-in").value); } catch (e) { const er = U.$("code-err"); if (er) er.textContent = e.message; return; }
        const prev = K.S;
        U.closeModal();
        try { if (U.screen) U.screen(null); K.resume(s); }
        catch (e) { K.S = prev; try { if (prev) K.resume(prev); else U.renderTitle(); } catch (e2) { /* the title is still there */ } U.openLoad(); const er = U.$("code-err"); if (er) er.textContent = K.tr("That save code could not be read. Copy the whole code and try again."); }
      });
    });
  };

  const seg = (attr, vals, cur, label) => '<div class="seg" role="radiogroup" aria-label="' + U.tr(label) + '">' + vals.map(([v, t]) => '<button type="button" role="radio" data-' + attr + '="' + v + '" aria-checked="' + (cur === v) + '">' + U.tr(t) + "</button>").join("") + "</div>";
  U.openMenu = function () {
    const S = K.S, manual = K.loadSlot("manual"), prefs = K.prefs(), inLife = !!S && document.body.dataset.mode !== "title";
    const touch = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    U.openModal("Menu",
      '<div class="set-row"><span>' + U.tr("Language") + '</span><div id="m-lang"></div></div>' +
      (U.openPractice && inLife ? '<div id="m-practice-f"><h3>' + U.tr("The practice ground") + '</h3><p class="small muted">' + U.tr("Practise any test you have met, spar with a training partner, or learn to read a blow. Nothing done there counts.") + "</p>" +
        '<div class="btnrow"><button class="cta secondary" id="m-practice" type="button">' + U.tr("Go to the practice ground") + "</button></div></div>" : "") +
      '<div class="grid2"><div><h3>' + U.tr("Saving") + '</h3><p class="small muted">' + U.tr("The game saves itself at every new scene, in this browser only.") + "</p>" +
      '<div class="btnrow">' + (inLife ? '<button class="cta secondary" id="m-save" type="button">' + U.tr("Save a copy") + "</button>" : "") +
      (manual ? '<button class="ghost" id="m-load" type="button">' + U.tr("Load copy ({name}, age {n})", { name: U.esc(manual.name), n: manual.age }) + "</button>" : "") +
      (U.actsKept && U.actsKept(null) ? '<button class="ghost" id="m-acts" type="button">' + U.tr("Start again from an act") + "</button>" : "") + '</div><p class="small" id="m-saved"></p>' +
      "<h3>" + U.tr("How to fight") + '</h3><p class="small muted">' + U.tr(touch ? "Left thumb: move. Right thumb: Strike, Roll, Guard and your skill. Tap a foe to face them." : "Move: WASD or arrows. Strike: J or left click. Roll: Space. Guard: K or Shift. Skill: L. Face the next foe: Q. Herbs: H. Help: C. Divine weapon: 1–3. Spare: F. Withdraw: X.") + "</p>" +
      "</div><div><h3>" + U.tr("Settings") + "</h3>" +
      (inLife ? '<label class="toggle"><input type="checkbox" id="m-story"' + (S.storyMode ? " checked" : "") + "><span>" + U.tr("Story mode") + "<small>" + U.tr("You cannot die in battle.") + "</small></span></label>" : "") +
      '<div class="set-row"><span>' + U.tr("Graphics") + "<small>" + U.tr("Shadows, crowds and sharpness. Auto follows your device.") + "</small></span>" + seg("gfx", [["auto", "Auto"], ["low", "Low"], ["med", "Medium"], ["high", "High"]], prefs.gfx || "auto", "Graphics") + "</div>" +
      '<div class="set-row"><span>' + U.tr("Difficulty") + "<small>" + U.tr("Real-time fights. Normal grows harder act by act; Easy stays gentle; Hard is hard from the start. Story mode keeps Easy.") + "</small></span>" + seg("diff", [["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]], K.RT.LEVELS[prefs.difficulty] ? prefs.difficulty : "normal", "Difficulty") + "</div>" +
      '<label class="toggle"><input type="checkbox" id="m-assist"' + (U.assist() ? " checked" : "") + "><span>" + U.tr("Meet blows for me") + "<small>" + U.tr("In fights, blows aimed at you are met for you, on kinder odds. On by itself in story mode.") + "</small></span></label>" +
      '<label class="toggle"><input type="checkbox" id="m-timed"' + (prefs.timed !== false ? " checked" : "") + "><span>" + U.tr("Timed moments") + "<small>" + U.tr("At a few hard moments a lamp burns down. If it goes out, you hold your tongue.") + "</small></span></label>" +
      '<label class="toggle"><input type="checkbox" id="m-big"' + (prefs.bigText ? " checked" : "") + "><span>" + U.tr("Larger text") + "</span></label>" +
      '<label class="toggle"><input type="checkbox" id="m-gradual"' + (prefs.gradual !== false ? " checked" : "") + "><span>" + U.tr("Reveal the story line by line") + "<small>" + U.tr("Tap the page or press Space to show everything at once.") + "</small></span></label>" +
      '<label class="toggle"><input type="checkbox" id="m-calm"' + (U.calm() ? " checked" : "") + "><span>" + U.tr("Calm motion") + "<small>" + U.tr("Less movement on screen: the camera holds still and effects are quieter.") + "</small></span></label>" +
      '<div class="set-row"><span>' + U.tr("Scene titles") + "<small>" + U.tr("Full: a title card before big moments. Short: the title over the scene, for every scene.") + "</small></span>" + seg("titles", [["full", "Full"], ["short", "Short"]], prefs.titles || "full", "Scene titles") + "</div>" +
      '<label class="toggle"><input type="checkbox" id="m-fps"' + (prefs.fps ? " checked" : "") + "><span>" + U.tr("Show frame rate") + "</span></label>" +
      '<label class="toggle"><input type="checkbox" id="m-sound"' + (prefs.sound !== false ? " checked" : "") + "><span>" + U.tr("Sound") + "<small>" + U.tr("The quill, the conch, the dice and the gong.") + "</small></span></label>" +
      '<label class="toggle"><input type="checkbox" id="m-drone"' + (prefs.drone !== false && prefs.music !== false ? " checked" : "") + (prefs.sound === false ? " disabled" : "") + "><span>" + U.tr("Music") + "</span></label>" +
      '<div class="set-row"><span>' + U.tr("Music volume") + '</span><input type="range" id="m-vol" min="0" max="100" step="5" value="' + Math.round((typeof prefs.musicVol === "number" ? prefs.musicVol : 0.7) * 100) + '"></div></div></div>' +
      (inLife ? "<h3>" + U.tr("Move this life to another device") + '</h3><p class="small muted">' + U.tr("Copy this code and paste it into “Load a save code” on another device.") + '</p><textarea id="m-code" readonly spellcheck="false">' + U.esc(K.exportCode()) + '</textarea>' : "") +
      '<div class="btnrow" style="margin-top:10px">' + (inLife ? '<button class="ghost" id="m-copy" type="button">' + U.tr("Copy code") + "</button>" : "") + '<button class="ghost" id="m-gloss" type="button">' + U.tr("Glossary") + "</button>" +
      (K.lives().length ? '<button class="ghost" id="m-lives" type="button">' + U.tr("Book of Lives") + "</button>" : "") + (inLife ? '<button class="ghost" id="m-title" type="button">' + U.tr("Return to title") + "</button>" : "") + "</div>",
      () => {
        const on = (id, ev, f) => { const el = U.$(id); if (el) el.addEventListener(ev, f); };
        U.$("m-lang").appendChild(U.langSwitch((id) => { U.closeModal(); U.setLang(id, () => { if (U.redraw) U.redraw(); U.openMenu(); }); }));
        const pr = U.$("m-practice");
        if (pr && U.canPractise && U.canPractise()) pr.addEventListener("click", () => { U.closeModal(); U.openPractice({ from: "menu" }); }); else if (pr) pr.disabled = true;
        on("m-save", "click", () => { U.$("m-saved").textContent = K.tr(K.save("manual") ? "Saved." : "This browser is not allowing saves. Use the save code instead."); });
        on("m-load", "click", () => { U.closeModal(); if (U.screen) U.screen(null); K.resume(manual); });
        on("m-acts", "click", () => { U.closeModal(); U.openActs(); });
        on("m-story", "change", (e) => { K.setStoryMode(e.target.checked); });
        on("m-gradual", "change", (e) => { K.prefs({ gradual: e.target.checked }); });
        on("m-calm", "change", (e) => { K.prefs({ calm: e.target.checked }); U.applyCalm(); });
        on("m-fps", "change", (e) => { K.prefs({ fps: e.target.checked }); U.fpsMeter(); });
        const radio = (attr, f) => document.querySelectorAll("[data-" + attr + "]").forEach((b) => b.addEventListener("click", () => { f(b.dataset[attr]); document.querySelectorAll("[data-" + attr + "]").forEach((x) => x.setAttribute("aria-checked", String(x === b))); }));
        radio("titles", (v) => K.prefs({ titles: v })); radio("diff", (v) => K.prefs({ difficulty: v })); radio("gfx", (v) => { K.prefs({ gfx: v }); if (G.ok) G.setQuality(); });
        on("m-timed", "change", (e) => { K.prefs({ timed: e.target.checked }); });
        on("m-assist", "change", (e) => { K.prefs({ assist: e.target.checked }); });
        on("m-sound", "change", (e) => { K.prefs({ sound: e.target.checked }); U.$("m-drone").disabled = !e.target.checked; if (K.Sound) K.Sound.refresh(); });
        on("m-drone", "change", (e) => { K.prefs({ drone: e.target.checked, music: e.target.checked }); if (K.Sound) K.Sound.refresh(); });
        on("m-vol", "input", (e) => { K.prefs({ musicVol: e.target.value / 100 }); if (K.Sound) K.Sound.refresh(); });
        on("m-big", "change", (e) => { K.prefs({ bigText: e.target.checked }); document.body.classList.toggle("big-text", e.target.checked); });
        on("m-copy", "click", async () => { const ta = U.$("m-code"); try { await navigator.clipboard.writeText(ta.value); U.$("m-copy").textContent = K.tr("Copied"); } catch (e) { ta.focus(); ta.select(); U.$("m-copy").textContent = K.tr("Selected. Copy it now"); } });
        on("m-gloss", "click", U.openGlossary);
        on("m-lives", "click", U.openLives);
        on("m-title", "click", () => { U.closeModal(); if (U.leaveToTitle) U.leaveToTitle(); else U.curtain(() => U.renderTitle()); });
      }, "wide");
  };

  // ---------- The Book of Lives ----------
  const KEY = "kurukshetra.v2.lives", MAX = 50;
  K.lives = function () { try { const a = JSON.parse(K.store.get(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  K.recordLife = function (S, e) {
    if (S.recorded) return;
    S.recorded = true;
    const has = (f) => S.flags.includes(f);
    const rec = { at: new Date().toISOString(), me: { name: S.name, pronoun: S.pronoun, origin: S.origin, teacher: S.teacher, path: S.path, spouse: S.spouse, friend: S.friend, court: S.court, child: S.child },
      title: e.title, art: e.art, alive: S.alive, age: S.age, side: S.side, telling: e.telling, figure: K.puppetSpec ? K.puppetSpec(S) : null,
      kept: S.vows.length > 0 && S.vows.every((v) => !v.broken || v.released), broke: S.vows.some((v) => v.broken && !v.released),
      karna: (S.bonds.karna || 0) >= 7 || has("died_with_karna") || has("pledged_to_karna"), teller: S.endChoice === "teller", conscience: S.duty.conscience,
      moments: (S.moments || []).map((m) => ({ kind: m.kind, who: m.who || null, id: m.id || null, from: m.from || null, age: m.age })), met: K.testsMet ? [...K.testsMet(S)] : [] };
    const all = K.lives(); all.unshift(rec);
    K.store.set(KEY, JSON.stringify(all.slice(0, MAX)));
    K.commit();
  };
  K.karmaOf = function (rec) {
    const out = [];
    if (rec.kept || rec.conscience >= 8) out.push(["A life of kept promises", { duty: { conscience: 1 }, rep: { sages: 1 } }]);
    if (rec.broke) out.push(["A broken vow, still owed", { duty: { conscience: -1 }, flag: "karmic_debt" }]);
    if (rec.karna) out.push(["Karna's friend, once", { bond: { karna: 2 } }]);
    if (rec.teller) out.push(["A teller's memory", { skill: { lore: 1 } }]);
    if (!rec.alive) out.push(["A death in battle", { attr: { might: 1 } }]);
    if (!out.length) out.push(["A quiet life", { attr: { wisdom: 1 } }]);
    return out;
  };
  K.rebirth = function (S, rec) {
    S.karma = { name: rec.me.name, origin: rec.me.origin, title: rec.title };
    for (const [, fx] of K.karmaOf(rec)) K.apply(fx, S);
    K.apply({ flag: "reborn", journal: { src: "You were born remembering another life, as {past}.", p: { past: rec.me.name } } }, S);
  };
  const when = (iso) => { try { return new Date(iso).toLocaleDateString(K.lang === "hi" ? "hi-IN" : "en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };
  U.openLives = function () {
    const lives = K.lives(), found = {};
    for (const r of lives) (found[r.title] = found[r.title] || []).push(r);
    const n = K.ENDINGS.filter((e) => found[e.title]).length;
    const gallery = K.ENDINGS.map((e) => { const got = found[e.title];
      return '<div class="life-card' + (got ? "" : " muted") + '"><div><b>' + (got ? U.tr(e.title) : U.tr("Not yet found")) + '</b><div class="small muted">' + (got ? U.tr(got.length === 1 ? "Reached once" : "Reached {n} times", { n: got.length }) : U.tr(e.hint)) + "</div></div></div>"; }).join("");
    const shelf = lives.map((r) => {
      const lines = (r.telling || []).map((l) => '<p class="small">' + U.esc(K.text(l, null, r.me)) + "</p>").join("");
      const mos = (r.moments || []).map((m) => { let t = ""; try { t = K.momentTitle(m, Object.assign({}, K.newLife(), r.me)); } catch (e) { t = ""; } return t ? '<span class="chip' + (m.kind === "farewell" ? " bad" : " good") + '">' + U.esc(t) + "</span>" : ""; }).join("");
      return '<details class="life-card" style="display:block"><summary><b>' + U.esc(r.me.name) + '</b> <span class="small muted">' + U.tr(r.title) + " · " + U.tr(r.alive ? "Age {n}" : "Fell at {n}", { n: r.age }) + " · " + U.esc(when(r.at)) + "</span></summary>" + (mos ? "<div>" + mos + "</div>" : "") + lines + "</details>";
    }).join("");
    U.openModal("Book of Lives", "<h3>" + U.tr("Endings found: {n} of {m}", { n, m: K.ENDINGS.length }) + '</h3><div class="grid2">' + gallery + "</div><h3>" + U.tr("Lives lived ({n})", { n: lives.length }) + "</h3>" +
      (shelf || '<p class="muted">' + U.tr("No lives written yet. Every life you finish is kept here.") + "</p>") + (lives.length ? '<div class="btnrow"><button class="ghost" id="lives-clear" type="button">' + U.tr("Clear the book") + "</button></div>" : ""),
      () => { const b = U.$("lives-clear"); if (!b) return; let armed = false; b.addEventListener("click", () => { if (!armed) { armed = true; b.textContent = K.tr("Tap again to erase every life in this book"); return; } K.store.del(KEY); U.closeModal(); if (document.body.dataset.mode === "title") U.renderTitle(); }); }, "wide");
  };
})(window.K = window.K || {});
