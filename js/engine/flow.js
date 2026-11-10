/* Scene flow, choices, skill checks and saves. */
(function (K) {
  "use strict";

  K.SCENES = {};
  K.ENCOUNTERS = {};
  K.scene = (def) => { K.SCENES[def.id] = def; return def; };
  K.scenes = (list) => list.forEach(K.scene);
  K.encounter = (def) => { K.ENCOUNTERS[def.id] = def; return def; };
  K.val = (v, S = K.S) => (typeof v === "function" ? v(S) : v);
  K.lastDelta = {};

  function addDelta(into, d) {
    for (const [k, v] of Object.entries(d || {})) into[k] = typeof v === "number" ? (into[k] || 0) + v : v;
    return into;
  }

  // Event slots: a few places in each life where one small event, drawn by chance at the first visit,
  // may happen (or nothing does). K.SLOTS[id] = { pool: [scene ids], then: scene id, none: 0..1 }.
  K.SLOTS = {};
  K.slot = (id, def) => { K.SLOTS[id] = def; };
  function slotScene(id, S) {
    const def = K.SLOTS[id];
    S.slots = S.slots || {};
    if (!(id in S.slots)) {
      const pool = def.pool.filter((e) => K.SCENES[e] && K.test(K.SCENES[e].when, S));
      S.slots[id] = pool.length && K.rng() >= (def.none ?? 0.3) ? K.pick(pool) : null;
    }
    S.slotThen = def.then;
    return S.slots[id] && !S.seen.includes(S.slots[id]) ? S.slots[id] : def.then;
  }

  // Optional scenes are skipped when their `when` condition fails.
  // Scenes that come first, when they apply: K.BEFORE[id] = [scene ids], each played once (unseen,
  // `when` passing) before the scene id is reached by any road. Each one's `next` is that scene.
  K.BEFORE = {};
  K.resolveScene = function (id, S = K.S) {
    id = K.val(id, S);
    // The scenes that come first are asked for again after an event slot resolves: a slot that draws
    // nothing hands on its `then` scene, which may have its own (the vow of the word before the Rajasuya).
    // S.missed: scenes passed by while away from where they happen (a ride home in the war).
    const before = (x) => (K.BEFORE[x] || []).find((p) => K.SCENES[p] && !S.seen.includes(p) && !(Array.isArray(S.missed) && S.missed.includes(p)) && K.test(K.SCENES[p].when, S)) || x;
    id = before(id);
    for (let g = 0; K.SLOTS[id] && g < 5; g++) id = before(slotScene(id, S));
    let sc = K.SCENES[id];
    for (let guard = 0; sc && sc.when && !K.test(sc.when, S); guard++) {
      if (guard > 60) throw new Error("Scene skip loop at " + sc.id);
      let next = before(K.val(sc.skipTo, S));
      for (let g = 0; K.SLOTS[next] && g < 5; g++) next = before(slotScene(next, S));
      sc = K.SCENES[next];
    }
    if (!sc) throw new Error("Missing scene: " + K.val(id, S));
    return sc;
  };

  K.go = function (id, resuming) {
    const S = K.S;
    if (!S.alive) id = "end_death";
    // Continue (or a loaded save) returns to the very scene that was saved: its conditions, the scenes
    // that come before it and its event slot were settled when it was first reached, and are not asked again.
    K.visit = (K.visit || 0) + 1; // each arrival at a scene is a new visit (the page allows one choice per visit)
    // A deadly test's second try (K.choose) returns to its scene the same way.
    const back = !!((resuming || (S.tryAgain && S.tryAgain.scene === id)) && id === S.scene && S.seen.includes(id) && K.SCENES[id]);
    const sc = back ? K.SCENES[id] : K.resolveScene(id);
    // A scene returned to this way has been read: its page comes back whole (ui/dom.js U.pageAgain).
    K.resumed = back ? K.visit : 0;
    const prevScene = S.scene, prevAct = S.act;
    // The act a life ended in (the death scene itself belongs to the war): the way back starts there.
    if (sc.ending && !S.alive && S.deathAct == null && prevAct) S.deathAct = prevAct;
    S.scene = sc.id;
    if (sc.act && sc.act > S.act) drift(S, sc.act);
    // The act never goes back (a scene written for an earlier act, met late, stays in the current one);
    // the one exception is waking from the prologue's dream of the war into childhood.
    const fromDream = K.SCENES[prevScene] && K.SCENES[prevScene].prologue && !sc.prologue;
    if (sc.act && (sc.act >= (S.act || 0) || sc.prologue || fromDream)) S.act = sc.act;
    // You never grow younger: not going back to an earlier question after a closed way, not in a scene
    // whose written age is earlier than the one before it, not on Continue. The one exception is waking
    // from the prologue's dream of the war (a grown warrior, then six years old).
    const before = K.SCENES[prevScene];
    if (sc.age != null && !(resuming && prevScene === sc.id)) S.age = before && before.prologue && !sc.prologue ? K.val(sc.age) : Math.max(S.age || 0, K.val(sc.age));
    let delta = {};
    if (!S.seen.includes(sc.id)) {
      S.seen.push(sc.id);
      if (sc.enter) delta = K.apply(sc.enter);
    }
    K.lastDelta = delta;
    // The start of an act (or the waking from the prologue into Act I): a copy of the life is kept
    // beside the autosave, to go back to (K.checkpoint below).
    const actStart = !back && S.alive && !sc.prologue && !sc.ending && (S.act !== prevAct || fromDream) && K.checkpointOk(S.act);
    if (actStart && !S.lifeId && K.store.ok()) S.lifeId = K.newLifeId();
    K.commit();
    if (actStart) K.checkpoint(S);
    K.emit("scene", sc);
    return sc;
  };

  // Close bonds drift when they are neglected: at each new act, a friend or spouse whose bond you did
  // not raise during the last act loses a point, and you notice.
  function drift(S, newAct) {
    // Tapas (§18.8): each vow kept through an act earns a point of merit; celibacy, Bhishma's own vow, two.
    const kept = K.activeVows(S).reduce((a, v) => a + (v.id === "celibacy" ? 2 : 1), 0);
    if (kept) S.tapas = K.clamp((S.tapas || 0) + kept, 0, 20);
    // The Bala and Atibala mantras hold for one act.
    if (S.balaUntil != null && newAct > S.balaUntil) { const g = S.balaGain || { might: 1, grace: 1 }; S.attrs.might = K.clamp(S.attrs.might - g.might, 0, 8); S.attrs.grace = K.clamp(S.attrs.grace - g.grace, 0, 8); delete S.balaUntil; delete S.balaGain; S.boons = S.boons.filter((b) => b !== "bala"); }
    // On the eve of the war, Bhishma blesses those who kept a vow of celibacy, as he did.
    if (newAct === 6 && K.hasVow("celibacy", S) && !S.flags.includes("bhishma_blessing")) {
      S.flags.push("bhishma_blessing");
      S.journal.push({ age: S.age, act: newAct, src: "On the eve of the war, Bhishma blessed you for keeping your vow, as he has kept his.", p: null, text: "On the eve of the war, Bhishma blessed you for keeping your vow, as he has kept his." });
    }
    for (const who of [S.friend, S.spouse]) {
      if (!who || S.dead.includes(who) || (S.bonds[who] ?? 0) < 4) continue;
      const last = (S.bondAct || {})[who];
      if (last != null && last >= S.act) continue;
      if (S.act < 2) continue;
      S.bonds[who] -= 1;
      (S.bondAct = S.bondAct || {})[who] = newAct - 1; // one point per neglected act, not more
      const src = "{who} and you have drifted a little. Neither of you said anything.", p = { who: K.PEOPLE[who]?.name || who };
      S.memories.push({ who, src, p, text: K.fill(src, p), age: S.age });
    }
  }

  K.choiceList = function (sc, S = K.S) {
    // After a deadly test failed once (K.choose): the one choice left here is to try it again.
    const ta = S.tryAgain && S.tryAgain.scene === sc.id ? (K.val(sc.choices, S) || []).find((c) => c.id === S.tryAgain.choice) : null;
    if (ta) return [{ c: Object.assign({}, ta, { t: "Try again", hint: "Your last chance", trial: Object.assign({}, ta.trial, ta.retryStakes ? { stakes: ta.retryStakes } : {}), again: true }), ok: true }];
    const crossed = (S.crossed || {})[sc.id] || {};
    const rows = (K.val(sc.choices, S) || [])
      .map((c) => (crossed[c.id] ? { c, ok: false, crossed: crossed[c.id] } : { c, ok: K.test(c.req, S) }))
      .filter((x) => x.ok || x.crossed || (x.c.locked && K.test(x.c.showIf, S))); // no locked text = hidden when unavailable
    // sc.hideLocked: only the choices you can take are shown (never none: then the closed ones stay).
    if (sc.hideLocked && rows.some((x) => x.ok)) return rows.filter((x) => x.ok);
    return rows;
  };

  // The failure rule: fail a test, and you get a second chance; fail that too, and the way is closed.
  // The choice that led to the test is crossed out, with the reason, and you go back to that earlier
  // question to choose again. At most once an act, never when it would leave nothing to choose, and
  // never back past something the epic has written. back: { scene, then, clear } on the test choice;
  // `then` is where the new choice leads (the test that follows it), `clear` the test's id, whose
  // second-chance flags are wiped so the next attempt starts fresh.
  K.loopBack = function (back, why, S = K.S) {
    if (!back || !back.scene || !K.SCENES[back.scene]) return null;
    S.loops = S.loops || [];
    if (S.loops.includes(S.act)) return null;
    const sc = K.SCENES[back.scene];
    if (sc.canon) return null;
    let picked = back.choice;
    if (!picked) for (let i = S.log.length - 1; i >= 0; i--) { const [sid, cid] = S.log[i].split(":"); if (sid === back.scene) { picked = cid; break; } }
    if (!picked) return null;
    const left = K.choiceList(sc, S).filter((x) => x.ok && x.c.id !== picked);
    if (!left.length) return null;
    S.loops.push(S.act);
    S.crossed = S.crossed || {};
    S.crossed[back.scene] = Object.assign({}, S.crossed[back.scene], { [picked]: why || "This way is closed now." });
    S.loopThen = { scene: back.scene, then: back.then || null };
    if (back.clear) S.flags = S.flags.filter((f) => !(f.startsWith(back.clear + "_") && f.endsWith("_again")));
    if (back.unflag) S.flags = S.flags.filter((f) => !back.unflag.includes(f));
    return back.scene;
  };

  // Merits from earlier in life that bear on a test (K.MERITS): +1 each, two at most either way.
  // Kept vows count too: honest persuasion under a vow never to lie, the common people's warnings
  // under a vow never to strike the unarmed.
  const VOW_MERITS = [
    { vow: "never_lie", on: ["statecraft"], n: 1, text: "Your word is trusted: you swore never to lie." },
    { vow: "spare_unarmed", on: ["stealth"], n: 1, text: "Common people warn you of ambushes: you swore never to strike the unarmed." }
  ];
  K.merits = function (ch, S = K.S) {
    const hits = (K.MERITS || []).filter((m) => S.flags.includes(m.flag) && (m.on.includes(ch.attr) || m.on.includes(ch.skill)))
      .concat(VOW_MERITS.filter((m) => K.hasVow(m.vow, S) && (m.on.includes(ch.attr) || m.on.includes(ch.skill))).map((m) => (K.vowYears(m.vow, S) >= 15 ? Object.assign({}, m, { n: 2 }) : m)));
    // An elder's blessing (§18.8): +1 to every test for a day (the next few choices).
    if (S.blessed && S.blessed > S.log.length) hits.push({ n: 1, text: S.blessedBy || "An elder's blessing is on you." });
    const n = Math.max(-2, Math.min(2, hits.reduce((a, m) => a + m.n, 0)));
    return { n, hits };
  };
  K.record = (S = K.S) => (S.record = S.record || { won: 0, lost: 0, passed: 0, failed: 0, gamesWon: 0, gamesLost: 0, last: null });
  K.checkOdds = function (ch, S = K.S) {
    const base = (ch.attr ? K.attr(ch.attr, S) : 0) + (ch.skill ? S.skills[ch.skill] || 0 : 0) + (K.val(ch.bonus, S) || 0) + K.merits(ch, S).n;
    const need = ch.dc - base; // need a d6 roll >= need
    return Math.max(0, Math.min(1, (7 - need) / 6));
  };
  // "My word" (a vow never to lie): once in each act, a court believes you without a test, on a
  // persuasion (a statecraft test) that is not itself a lie.
  K.myWordReady = (c, S = K.S) => !!(c && c.check && c.check.skill === "statecraft" && K.hasVow("never_lie", S) && S.myWord !== S.act && !K.vowBreaksFor(c.tags, S).length && !c.peril);
  // Antardhana, the vanishing (§18.8): held, and not yet used this act.
  K.vanishReady = (S = K.S) => S.boons.includes("antardhana") && S.vanishedAct !== S.act;
  // Soma (§18.8): +2 to one attribute for a test day (three choices), then -1 for the next day, then as before.
  K.somaTick = function (S, delta) {
    const so = S.soma;
    if (!so) return;
    const n = S.log.length;
    // It wears off into a day one point below where you were, then you are as before. The changes are the
    // ones actually made (the gain was capped at 8; the low may stop at 0), so nothing is lost for good.
    const gain = so.gain != null ? so.gain : 2;
    if (!so.down && n >= so.until) { so.down = true; so.hang = n + 3; const was = S.attrs[so.attr]; S.attrs[so.attr] = K.clamp(was - gain - 1, 0, 8); so.drop = S.attrs[so.attr] - was; if (delta) delta["attr." + so.attr] = so.drop; }
    else if (so.down && n >= so.hang) { const back = -gain - (so.drop != null ? so.drop : -gain - 1); S.attrs[so.attr] = K.clamp(S.attrs[so.attr] + back, 0, 8); if (delta) delta["attr." + so.attr] = back; delete S.soma; }
  };
  K.checkLabel = function (ch) {
    const parts = [ch.attr && K.ATTRS[ch.attr], ch.skill && K.SKILLS[ch.skill]].filter(Boolean).map(K.tr);
    return parts.join(" + ");
  };

  // Peril: some checks and tests set you against someone who can have you killed or locked away.
  // Fail one while out of your depth (under an even chance on a check, or below K.PERIL_MIN in the
  // test's attribute and skill) and the failure is death or a cell, not a bruise. A capable player
  // who fails gets the ordinary failure. Story mode turns a death into a scar, as everywhere else.
  K.PERIL_MIN = 4;
  K.inPeril = function (c, S = K.S) {
    if (!c || !c.peril) return false;
    if (c.check) return K.checkOdds(c.check, S) < 0.5;
    const t = c.trial || {};
    return (t.attr ? K.attr(t.attr, S) : 0) + (t.skill ? S.skills[t.skill] || 0 : 0) + K.merits({ attr: t.attr, skill: t.skill }, S).n < K.PERIL_MIN;
  };
  K.perilNote = function (c, S = K.S) {
    if (!K.inPeril(c, S)) return null;
    const p = K.val(c.peril, S);
    return p.kind === "death" ? K.tr("Danger: failing could cost your life") : K.tr("Danger: failing could mean a cell");
  };

  // A choice that can lead to a fight: its own, or one behind its test or game.
  K.leadsToFight = function (c, S = K.S) {
    if (!c) return false;
    const brs = [c, c.check && c.check.pass, c.check && c.check.fail, c.win, c.close, c.lose];
    return brs.some((br) => br && br.combat && K.val(br.combat, S));
  };
  // The small signs on a choice card (the card shows no effect line; effects are found in play):
  // a fight, a danger to your life or freedom, a vow taken. [kind, label, title, emblem]
  K.choiceMarks = function (c, S = K.S) {
    const out = [];
    const fx = typeof c.fx === "object" && c.fx ? c.fx : {};
    if (fx.vowTake && K.VOWS[fx.vowTake]) {
      const V = K.VOWS[fx.vowTake], cut = (s) => K.tr(s).replace(/[.।]\s*$/, "");
      const sum = V.keep && V.price ? K.tr("Kept: {gift} · Broken: {price}", { gift: cut(V.keep), price: cut(V.price) }) : K.tr(V.name);
      out.push(["vow", K.tr(V.name), sum, "vow_" + fx.vowTake]);
    }
    if (K.inPeril(c, S)) { const p = K.val(c.peril, S); out.push(p.kind === "death" ? ["death", K.tr("Can cost your life")] : ["cell", K.tr("Can cost your freedom")]); }
    if (K.leadsToFight(c, S)) out.push(["fight", K.tr("Leads to a fight")]);
    // What a choice would break: one of your vows (its emblem, struck through), a friend for life,
    // a divine weapon's condition. The full words are the icon's label.
    for (const id of K.vowBreaksFor(c.tags, S)) {
      const V = K.VOWS[id], w = K.watcherNames(id, S, true);
      out.push(["breakvow", [K.tr("Breaks vow: {vow}", { vow: K.tr(V.name) }), w && K.tr("{who} will not forgive it", { who: w })].filter(Boolean).join(" · "), null, "vow_" + id]);
    }
    if (S.friend && S.spouse !== S.friend) {
      const loss = Math.min(0, (fx.bond || {})[S.friend] || 0) - (K.vowBreaksFor(c.tags, S).some((id) => (K.VOWS[id].watchers || []).includes(S.friend)) ? 3 : 0);
      const karna = S.friend === "karna" && K.vowBreaksFor(c.tags, S).includes("spare_karna");
      if (karna || (loss < 0 && (S.bonds[S.friend] ?? 3) + loss < 3)) out.push(["friend", K.tr("Ends your friendship with {who}", { who: K.personName(S.friend, S) })]);
    }
    const ab = K.astraBreaksFor(c.tags, S);
    if (ab) out.push(["astra", K.tr(ab.takes ? "Breaks the weapon's condition: {who} will take it back" : "Breaks the weapon's condition: its mantra will fail you", { who: K.tr(ab.who) })]);
    return out;
  };

  // ▲/▼ previews are generated from the same data the engine applies.
  K.preview = function (c, S = K.S) {
    const out = [];
    const fx = typeof c.fx === "object" && c.fx ? c.fx : {};
    const sign = (n) => (n > 0 ? "▲ " : "▼ ");
    const cls = (n) => (n > 0 ? "up" : "down");
    for (const [k, n] of Object.entries(fx.duty || {})) out.push([cls(n), sign(n) + K.tr(K.DUTIES[k])]);
    for (const [k, n] of Object.entries(fx.bond || {})) out.push([cls(n), sign(n) + K.personName(k, S)]);
    for (const [k, n] of Object.entries(fx.rep || {})) out.push([cls(n), sign(n) + K.tr(K.FACTIONS[k])]);
    for (const [k, n] of Object.entries(fx.skill || {})) out.push([cls(n), sign(n) + K.tr(K.SKILLS[k])]);
    for (const [k, n] of Object.entries(fx.attr || {})) out.push([cls(n), sign(n) + K.tr(K.ATTRS[k])]);
    if (typeof fx.tapas === "number" && fx.tapas) out.push([fx.tapas > 0 ? "up" : "down", fx.tapas > 0 ? K.tr("Tapas +{n}", { n: fx.tapas }) : K.tr("Costs {n} tapas", { n: -fx.tapas })]);
    if (fx.astraGrant) out.push(["up", K.tr("Gain: {boon}", { boon: K.tr(K.ASTRAS[typeof fx.astraGrant === "string" ? fx.astraGrant : fx.astraGrant.id].name) })]);
    if (c.check && c.check.skill === "stealth" && K.vanishReady(S)) out.push(["up", K.tr("Antardhana: if the test fails, you vanish instead")]);
    if (fx.vowTake) {
      const V = K.VOWS[fx.vowTake];
      out.push(["vow", K.tr("Vow: {vow}", { vow: K.tr(V.name) })]);
      if (V.keep) out.push(["up", K.tr("Kept: {gift}", { gift: K.tr(V.keep) })]);
      const w = K.watcherNames(fx.vowTake, S);
      if (w) out.push(["", K.tr("Watched by {who}", { who: w })]);
      if (V.price) out.push(["down", K.tr("Broken: {price}", { price: K.tr(V.price) })]);
    }
    if (fx.boon) out.push(["up", K.tr("Gain: {boon}", { boon: K.tr(K.BOONS[fx.boon].name) })]);
    // A choice that would break a vow says so, with who will not forgive it and what it costs.
    for (const id of K.vowBreaksFor(c.tags, S)) {
      const V = K.VOWS[id], w = K.watcherNames(id, S, true);
      out.push(["down", [K.tr("Breaks vow: {vow}", { vow: K.tr(V.name) }), w && K.tr("{who} will not forgive it", { who: w }), V.priceShort && K.tr(V.priceShort)].filter(Boolean).join(" · ")]);
    }
    // A friendship that would fall below 3 ends: said before you choose (a bond lost, or a vow it shared broken).
    if (S.friend && S.spouse !== S.friend) {
      const loss = Math.min(0, (fx.bond || {})[S.friend] || 0) - (K.vowBreaksFor(c.tags, S).some((id) => (K.VOWS[id].watchers || []).includes(S.friend)) ? 3 : 0);
      const karna = S.friend === "karna" && K.vowBreaksFor(c.tags, S).includes("spare_karna");
      if (karna || (loss < 0 && (S.bonds[S.friend] ?? 3) + loss < 3)) out.push(["down danger", K.tr("Ends your friendship with {who}", { who: K.personName(S.friend, S) })]);
    }
    const ab = K.astraBreaksFor(c.tags, S);
    if (ab) out.push(["down", K.tr(ab.takes ? "Breaks the weapon's condition: {who} will take it back" : "Breaks the weapon's condition: its mantra will fail you", { who: K.tr(ab.who) })]);
    if (fx.memory) out.push(["", fx.memory[0] === "all" ? K.tr("People will remember") : K.tr("{who} will remember", { who: K.personName(fx.memory[0], S) })]);
    if (c.check && K.myWordReady(c, S)) out.push(["up", K.tr("My word: the court will believe you without a test")]);
    else if (c.check) {
      out.push(["check", K.tr("Test of {what}: {pct}%", { what: K.checkLabel(c.check), pct: Math.round(K.checkOdds(c.check, S) * 100) })]);
      // A risk: what a failure would cost, shown before you choose.
      const lose = c.check.fail && c.check.fail.fx && c.check.fail.fx.lose;
      const what = lose && (typeof lose === "string" ? lose : lose.what);
      if (what === "heirloom" ? K.heirloomAtRisk(S) : what && (S.items[what] || 0) > 0) out.push(["down", K.tr("Risk: {what}", { what: what === "heirloom" ? K.low(K.tr(K.HEIRLOOMS[S.heirloom].name)) : K.tr(what === "herbs" ? "a bundle of herbs" : "your coins") })]);
      const m = K.merits(c.check, S);
      if (m.n) out.push([m.n > 0 ? "up" : "down", K.tr(m.n > 0 ? "Your past helps (+{n})" : "Your past counts against you ({n})", { n: m.n })]);
    }
    const danger = K.perilNote(c, S);
    if (danger) out.push(["down danger", danger]);
    if (c.combat) { // a holding fight says how long you must stand
      const enc = K.ENCOUNTERS && K.ENCOUNTERS[K.val(c.combat, S)], hold = enc && enc.hold;
      out.push(["combat", hold ? K.tr("Leads to a fight: hold for {n} rounds", { n: hold }) : K.tr("Leads to a fight")]);
    }
    const hint = K.val(c.hint, S);
    if (hint) out.push(["", K.text(hint, null, S)]);
    return out;
  };

  // Applies a choice. Returns what the UI should do next.
  K.choose = function (sc, c, outcome) {
    const S = K.S;
    const dyn = c.resolve ? c.resolve(S) : null; // decided from the state at the moment of choice
    const delta = {};
    const res = { text: null, check: null, combat: c.combat || null, next: null, after: null };
    const perilous = K.inPeril(c, S); // judged before this choice changes anything
    let peril = null;
    addDelta(delta, K.apply(c.fx));
    addDelta(delta, K.apply(dyn));
    if (c.check && K.myWordReady(c, S)) {
      // Your word is enough: no roll.
      S.myWord = S.act;
      const br = c.check.pass || {};
      res.check = { pass: true, word: true, ch: c.check };
      K.record().passed++;
      addDelta(delta, K.apply(br.fx));
      if (br.text) res.text = K.val(br.text);
      if (br.next) res.next = K.val(br.next);
      if (br.combat) res.combat = br.combat;
    } else if (c.check) {
      const ch = c.check;
      const roll = K.roll(6);
      const base = (ch.attr ? K.attr(ch.attr) : 0) + (ch.skill ? S.skills[ch.skill] || 0 : 0) + (K.val(ch.bonus) || 0) + K.merits(ch).n;
      let pass = base + roll >= ch.dc, vanished = false;
      // Antardhana (§18.8): once in each act, a failed test of stealth becomes a pass: you were simply not there.
      if (!pass && ch.skill === "stealth" && K.vanishReady(S)) { pass = true; vanished = true; S.vanishedAct = S.act; }
      K.record()[pass ? "passed" : "failed"]++;
      const br = (pass ? ch.pass : ch.fail) || {};
      res.check = { pass, roll, total: base + roll, dc: ch.dc, ch, vanished };
      addDelta(delta, K.apply(br.fx));
      if (br.text) res.text = K.val(br.text); // raw English: the UI translates and fills it
      if (br.next) res.next = K.val(br.next);
      if (br.combat) res.combat = br.combat;
      if (!pass && perilous) peril = K.val(c.peril, S);
    }
    if (c.game && outcome) { // a game or action test played inside the scene picks its branch
      res.outcome = outcome;
      const practice = c.trial && c.trial.practice; // a first test that does not count
      const br = c[outcome] || (outcome === "close" ? c.lose : null) || {};
      if (S.tryAgain && S.tryAgain.scene === sc.id) S.tryAgain = null; // the second try is this one
      // A deadly test (its failure kills, outside story mode): the first failure is survived, at a
      // small cost, and the test is offered once more. A second failure is death.
      if (outcome !== "win" && !practice && K.deadlyBranch(br, S) && !S.flags.includes(K.retryFlag(sc.id, c.id))) {
        S.flags.push(K.retryFlag(sc.id, c.id));
        S.tryAgain = { scene: sc.id, choice: c.id };
        K.record().gamesLost += 1;
        addDelta(delta, K.apply(K.retryCost(c, S)));
        S.log.push(sc.id + ":" + c.id);
        res.retry = true;
        res.text = K.val(c.retryText, S) || "It nearly killed you. You are still alive, and there is one more chance.";
        res.next = sc.id; res.combat = null;
        K.lastDelta = delta;
        return res;
      }
      if (!practice) K.record()[outcome === "win" ? "gamesWon" : "gamesLost"] += 1 + (outcome !== "win" && br.penalty ? 1 : 0); // a failed second chance counts twice
      addDelta(delta, K.apply(br.fx));
      if (br.text) res.text = K.val(br.text);
      if (br.next) res.next = K.val(br.next);
      // A second outright failure, out of your depth, against someone who does not forgive.
      if (outcome === "lose" && br.penalty && perilous) peril = K.val(c.peril, S);
      // A second failure closes this way and sends you back to choose again (see K.loopBack).
      if (!peril && outcome !== "win" && br.penalty && c.back) {
        const back = K.loopBack(c.back, K.val(c.back.why || c.crossWhy));
        if (back) { res.next = back; res.looped = true; }
      }
    }
    addDelta(delta, K.breakTags(c.tags));
    S.log.push(sc.id + ":" + c.id);
    K.somaTick(S, delta);
    if (!res.text && c.text) res.text = K.val(c.text);
    res.next = res.next || K.val(c.next) || K.val(sc.next);
    if (peril) {
      res.peril = peril.kind;
      if (peril.kind === "death") {
        addDelta(delta, K.apply({ die: true, deathText: peril.deathText, flag: ["peril_death"].concat(peril.flag || []) }));
        if (!S.alive) S.deathAt = { art: peril.art || null, caption: peril.caption || null, act: S.act }; // the ending shows where it happened
        res.text = S.alive ? peril.spareText || "You live, barely. The scar never fades." : peril.text;
      } else {
        // A cell: x_captive offers a way out (a test of stealth) or the long wait; then the story
        // goes on from where it would have gone (or from peril.then, when the next scene could not
        // have happened with you locked up).
        S.captive = { by: peril.by, place: peril.place, then: peril.then || res.next, waitThen: peril.waitThen || null, act: S.act };
        S.flags = S.flags.filter((f) => !f.startsWith("x_captive_")); // a second time in a cell starts fresh
        addDelta(delta, K.apply(Object.assign({ flag: ["captive", "was_imprisoned"] }, peril.journal ? { journal: peril.journal } : {})));
        res.text = peril.text;
        res.next = "x_captive";
        res.after = null;
      }
    }
    // Back at an earlier question after a closed way: the new choice leads straight to its test.
    if (S.loopThen && S.loopThen.scene === sc.id && !res.looped && !(res.check && !res.check.pass)) {
      if (S.loopThen.then && !c.game && !c.combat) res.next = S.loopThen.then;
      S.loopThen = null;
    }
    if (sc.after && !c.noAfter && !(peril && peril.kind !== "death")) res.after = K.val(sc.after);
    if (!S.alive) { res.next = "end_death"; res.combat = null; res.after = null; }
    K.lastDelta = delta;
    return res;
  };

  // Deadly tests (minigames whose failure kills): the flag that marks the one retry as used, whether
  // a branch would kill (its effects hold die: true, outside story mode), and the price of the retry:
  // the choice's own retryCost, else a scar (or, already scarred, a point of the test's attribute).
  K.retryFlag = (sid, cid) => "tried_again_" + sid + "_" + cid;
  K.deadlyBranch = function (br, S = K.S) {
    if (!br || S.storyMode) return false;
    const fx = K.val(br.fx, S);
    return !!(fx && fx.die === true);
  };
  K.retryCost = function (c, S = K.S) {
    const own = K.val(c.retryCost, S);
    if (own) return own;
    if (!S.injuries.includes("scar")) return { injury: "scar" };
    const a = (c.trial && c.trial.attr) || "might";
    return (S.attrs[a] || 0) > 0 ? { attr: { [a]: -1 } } : {};
  };

  // A fight lost but lived through (owner, 4 November): the story goes on past it (a fight that is not deadly, or any fight in
  // story mode), so the screen shows you slumped, the foes leaving and a line that what is written held, not a fall. Practice
  // and the opening dream are not counted; a deadly loss (or one whose loss kills) falls as before.
  K.loseLived = function (encId, S = K.S) {
    const enc = K.ENCOUNTERS[encId];
    if (!enc || enc.dream || encId === "x_practice" || !S) return false;
    const fx = K.val((enc.lose || {}).fx, S);
    if (fx && fx.die === true && !S.storyMode) return false;
    return !enc.lethal || !!S.storyMode;
  };

  // Called by the combat layer when a fight ends.
  K.combatOutcome = function (encId, outcome, fallbackNext) {
    const S = K.S;
    const enc = K.ENCOUNTERS[encId];
    const br = enc[outcome] || {};
    const delta = K.apply(br.fx);
    const rec = enc.dream ? {} : K.record(); // a dream fight is not on your record
    if (outcome === "win" || outcome === "spare") { rec.won = (rec.won || 0) + 1; rec.last = "won"; }
    else if (outcome === "lose") { rec.lost = (rec.lost || 0) + 1; rec.last = "lost"; }
    else rec.last = "fled";
    // A vow never to strike the unarmed: a foe you spared may one day pull you out of a deadly fight.
    if (outcome === "spare" && K.hasVow("spare_unarmed", S)) S.spared = (S.spared || 0) + 1;
    let saved = null;
    if (outcome === "lose" && enc.lethal && !S.storyMode && S.spared && K.hasVow("spare_unarmed", S) && !S.flags.includes("saved_by_spared")) {
      K.apply({ flag: "saved_by_spared", injury: enc.injury || "scar", journal: "A soldier you once let live dragged you out of a deadly fight. He said he was only paying a debt." });
      saved = "As you go down, someone drags you out of the press by your collar. A soldier you once let live. \"Now we are even,\" he says, and is gone.";
    } else if (outcome === "lose" && enc.lethal && !S.storyMode && (S.charges || {}).sanjivani) {
      K.apply({ die: true, injury: enc.injury || "scar" }); // the sanjivani root undoes this death (core.js FX.die)
      saved = "You fall, and the dark comes. Then the root on its cord burns against your chest, and you are breathing again among the dead. There will not be another.";
    } else if (outcome === "lose" && enc.lethal) {
      if (S.storyMode) K.apply({ injury: enc.injury || "scar" });
      else { S.alive = false; S.deathText = K.val(br.deathText) || enc.deathText || "You fell in battle."; }
    }
    // Holding firm through a deadly fight under a vow never to retreat makes you one point surer.
    if (outcome === "win" && enc.lethal && K.hasVow("never_retreat", S) && !S.flags.includes("held_firm")) {
      K.apply({ flag: "held_firm", journal: "You held firm through a deadly fight, as you swore you would. Your hand is surer for it." });
    }
    K.lastDelta = delta;
    if (saved) return { text: saved, next: S.alive ? K.val(br.next) || fallbackNext : "end_death" };
    return {
      text: br.text ? K.val(br.text) : null,
      next: S.alive ? K.val(br.next) || fallbackNext : "end_death"
    };
  };

  // ---------- Saves (per-browser; also exportable as a code) ----------
  const KEY = "kurukshetra.v2";
  K.store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
    ok() { try { return typeof localStorage !== "undefined" && !!localStorage; } catch (e) { return false; } }
  };
  let idN = 0;
  K.newLifeId = () => Date.now().toString(36) + (idN++).toString(36);

  // ---------- Act checkpoints ----------
  // At the start of every act a copy of the life is kept in this browser, beside the autosave: one per
  // act (the latest start of it), for the current life only. A death can go back to the start of the
  // act it happened in, or of any earlier act; the title screen and the menu can start again from any
  // of them. Stored compactly: the first act whole, each later one as what changed since the one
  // before (arrays that only grew keep just their new end), about 15-25 KB for a whole life.
  // K.checkpointOk(act) says which acts this build keeps (the split build's Part One: Acts I-IV).
  const ACTS_KEY = KEY + ".acts";
  K.checkpointOk = () => true;
  const delta = (a, b) => {
    const d = {};
    for (const k of Object.keys(b)) {
      const x = a[k], y = b[k], sx = JSON.stringify(x), sy = JSON.stringify(y);
      if (sx === sy) continue;
      if (Array.isArray(x) && Array.isArray(y) && y.length > x.length && JSON.stringify(y.slice(0, x.length)) === sx) (d["+"] = d["+"] || {})[k] = y.slice(x.length);
      else (d["="] = d["="] || {})[k] = y;
    }
    const gone = Object.keys(a).filter((k) => !(k in b));
    if (gone.length) d["-"] = gone;
    return d;
  };
  const undelta = (a, d) => {
    const s = JSON.parse(JSON.stringify(a));
    for (const [k, v] of Object.entries(d["="] || {})) s[k] = v;
    for (const [k, v] of Object.entries(d["+"] || {})) s[k] = (Array.isArray(s[k]) ? s[k] : []).concat(v);
    for (const k of d["-"] || []) delete s[k];
    return s;
  };
  K.actRecord = function () {
    try { const r = JSON.parse(K.store.get(ACTS_KEY) || "null"); return r && typeof r === "object" && Array.isArray(r.acts) ? r : null; } catch (e) { return null; }
  };
  // The life at the start of each kept act, decoded in order: [{ act, age, path, side, life }].
  const decodeAll = (rec) => {
    let s = {};
    return (rec ? rec.acts : []).map((e) => { s = undelta(s, e.d || {}); return { act: e.act, age: e.age, path: e.path, side: e.side, life: s }; });
  };
  const encodeAll = (rows) => {
    let prev = {};
    return rows.map((r) => { const e = { act: r.act, age: r.age, path: r.path || null, side: r.side || null, d: delta(prev, r.life) }; prev = r.life; return e; });
  };
  const writeRecord = (id, name, rows) => K.store.set(ACTS_KEY, JSON.stringify({ id, name, acts: encodeAll(rows) }));
  // Keep the life as it stands now (its committed copy) as the start of its act. A later act of an
  // older version of this life (before a going back) is dropped: those acts are lived again.
  K.checkpoint = function (S = K.S) {
    if (!S || !S.lifeId || !S.alive || !K.checkpointOk(S.act)) return false;
    const life = K.committed && JSON.parse(K.committed).scene === S.scene ? JSON.parse(K.committed) : JSON.parse(JSON.stringify(S));
    const rec = K.actRecord();
    const rows = rec && rec.id === S.lifeId ? decodeAll(rec).filter((r) => r.act < S.act) : [];
    rows.push({ act: S.act, age: S.age, path: S.path, side: S.side, life });
    return writeRecord(S.lifeId, S.name, rows);
  };
  // The acts kept for the current (or last) life: [{ act, age, path, side }], and that life's name and id.
  K.checkpoints = function () {
    const rec = K.actRecord();
    return rec ? { id: rec.id, name: rec.name, acts: rec.acts.filter((e) => K.checkpointOk(e.act) || K.checkpointShown(e.act)).map((e) => ({ act: e.act, age: e.age, path: e.path, side: e.side })) } : null;
  };
  K.checkpointShown = () => false; // part.js: acts kept for the other part of the game, still listed
  // The life at the start of an act, cleaned like any save (or null).
  K.checkpointLife = function (act) {
    const row = decodeAll(K.actRecord()).find((r) => r.act === act);
    if (!row) return null;
    try { const s = K.cleanLife(K.migrate(JSON.parse(JSON.stringify(row.life)))); return K.SCENES[s.scene] ? s : null; } catch (e) { return null; }
  };
  // Go back: the copy of the life at that act's start becomes the life (and the autosave); the acts
  // after it are dropped. A death already written in the Book of Lives stays there.
  K.backToAct = function (act) {
    const s = K.checkpointLife(act);
    if (!s) return null;
    const rec = K.actRecord();
    writeRecord(rec.id, rec.name, decodeAll(rec).filter((r) => r.act <= act));
    K.resume(s);
    return s;
  };
  // A save code that carries a life's kept acts (the split build, crossing between its parts): the
  // acts before the life's own act, and, with here, the life itself as the start of its act.
  K.actsFor = function (S, here) {
    const rec = K.actRecord();
    const rows = rec && rec.id === S.lifeId ? decodeAll(rec).filter((r) => r.act < S.act) : [];
    if (here) rows.push({ act: S.act, age: S.age, path: S.path, side: S.side, life: JSON.parse(S === K.S ? committedFor(S) : JSON.stringify(S)) });
    return encodeAll(rows);
  };
  // A code read with kept acts in it: they become this browser's acts for that life.
  K.adoptActs = function (s, cps) {
    if (!Array.isArray(cps) || !cps.length) return false;
    const rows = []; let prev = {};
    for (const e of cps) {
      if (!e || typeof e !== "object" || typeof e.act !== "number" || !e.d || typeof e.d !== "object") return false;
      prev = undelta(prev, e.d);
      rows.push({ act: e.act, age: num0(e.age), path: typeof e.path === "string" ? e.path : null, side: typeof e.side === "string" ? e.side : null, life: prev });
    }
    s.lifeId = s.lifeId || K.newLifeId();
    return writeRecord(s.lifeId, s.name, rows.filter((r) => K.checkpointOk(r.act) || K.checkpointShown(r.act)));
  };
  const num0 = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
  // The life as it stood when its current scene opened. A choice changes K.S at once, but the page moves
  // on only at the next scene; a save made on a result page (a copy, the save code, the story-mode switch)
  // writes this committed life, so loading it never offers a choice that was already made.
  K.committed = null;
  K.commit = function () {
    const S = K.S;
    if (!S || !K.SCENES[S.scene]) return false;
    K.committed = JSON.stringify(S);
    return K.store.set(KEY + ".auto", K.committed);
  };
  const committedFor = (S) => (K.committed && JSON.parse(K.committed).scene === S.scene ? K.committed : JSON.stringify(S));
  K.save = function (slot) {
    const S = K.S;
    if (!S || !K.SCENES[S.scene]) return false;
    return K.store.set(KEY + "." + slot, committedFor(S));
  };
  // Story mode changes both the live life and the committed one, and is saved at once.
  K.setStoryMode = function (on) {
    K.S.storyMode = !!on;
    if (K.committed) { const c = JSON.parse(K.committed); c.storyMode = !!on; K.committed = JSON.stringify(c); }
    return K.store.set(KEY + ".auto", K.committed || JSON.stringify(K.S));
  };
  // Saves from before the Yadava homeland moved from Dwaraka to Mathura.
  K.migrate = function (s) {
    if (s && s.origin === "dwaraka") { s.origin = "mathura"; s.flags = (s.flags || []).map((f) => (f === "origin_dwaraka" ? "origin_mathura" : f)); }
    if (s) { s.tapas = s.tapas || 0; s.astras = s.astras || []; s.charges = s.charges || {}; } // saves from before §18.7/18.8
    return s;
  };
  // A life read from storage or from a pasted code, made safe to play. It must be an object; every
  // field the game relies on gets the right type (else the new-life default); ids are ones the game
  // knows; text is text. Fields this function does not know (added by newer scenes) are kept as they are.
  K.cleanLife = function (raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(K.tr("That save code could not be read. Copy the whole code and try again."));
    const base = K.newLife(), s = Object.assign({}, raw);
    const kind = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
    const isId = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(v); // no quotes, brackets or spaces
    const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
    const numbers = (o, d) => { const r = Object.assign({}, d); if (kind(o) === "object") for (const [k, v] of Object.entries(o)) if (isId(k) && typeof v === "number" && isFinite(v)) r[k] = v; return r; };
    const ids = (a, table) => (kind(a) === "array" ? a.filter((x) => isId(x) && (!table || table[x])) : []);
    const texts = (a) => (kind(a) === "array" ? a.filter((x) => typeof x === "string") : []);
    const objs = (a, ok) => (kind(a) === "array" ? a.filter((x) => kind(x) === "object" && ok(x)) : []);
    for (const [k, d] of Object.entries(base)) {
      const want = kind(d), got = kind(s[k]);
      if (want === "null") { if (got !== "null" && got !== "string") s[k] = null; }
      else if (want !== got) s[k] = d;
    }
    s.name = String(s.name).slice(0, 40);
    if (!["she", "he", "they"].includes(s.pronoun)) s.pronoun = "they";
    const known = { origin: K.ORIGINS, temperament: K.TEMPERAMENTS, heirloom: K.HEIRLOOMS, path: K.PATHS, teacher: K.TEACHERS };
    for (const [k, table] of Object.entries(known)) if (s[k] != null && !(isId(s[k]) && (!table || table[s[k]]))) s[k] = null;
    for (const k of ["court", "side", "spouse", "friend", "child", "exile", "karma", "endChoice"]) if (s[k] != null && !isId(s[k])) s[k] = null;
    for (const k of ["ending", "deathText"]) if (s[k] != null && typeof s[k] !== "string") s[k] = null;
    s.age = num(s.age, base.age); s.act = num(s.act, base.act); s.tapas = Math.max(0, Math.min(20, num(s.tapas, 0)));
    for (const k of ["attrs", "skills", "duty", "rep", "items", "charges", "bonds", "bondAct"]) s[k] = numbers(s[k], base[k]);
    s.record = Object.assign(numbers(s.record, base.record), { last: typeof (s.record || {}).last === "string" ? s.record.last : null });
    s.slots = kind(s.slots) === "object" ? Object.fromEntries(Object.entries(s.slots).filter(([k, v]) => isId(k) && (v === null || v === 0 || isId(v)))) : {};
    for (const k of ["flags", "seen", "dead"]) s[k] = ids(s[k]);
    s.log = texts(s.log);
    s.boons = ids(s.boons, K.BOONS); s.injuries = ids(s.injuries, K.INJURIES);
    if (s.keepsakes !== undefined) s.keepsakes = ids(s.keepsakes, K.KEEPSAKES);
    s.vows = objs(s.vows, (v) => isId(v.id) && K.VOWS[v.id]).map((v) => Object.assign({}, v, { broken: !!v.broken, age: num(v.age, s.age) }));
    s.curses = objs(s.curses, (c) => isId(c.id) && K.CURSES[c.id]).map((c) => Object.assign({}, c, { fired: !!c.fired }));
    s.astras = objs(s.astras, (a) => isId(a.id));
    s.memories = objs(s.memories, (m) => typeof m.text === "string" || typeof m.src === "string");
    s.journal = objs(s.journal, (j) => typeof j.text === "string" || typeof j.src === "string");
    s.moments = objs(s.moments, (m) => isId(m.kind));
    if (s.lostFriends !== undefined) s.lostFriends = objs(s.lostFriends, (f) => isId(f.who));
    s.alive = s.alive !== false; s.storyMode = !!s.storyMode;
    if (s.lifeId !== undefined && !isId(s.lifeId)) delete s.lifeId;
    if (s.tryAgain != null && !(kind(s.tryAgain) === "object" && isId(s.tryAgain.scene) && isId(s.tryAgain.choice))) s.tryAgain = null;
    if (s.weapon != null && s.weapon !== "sword" && s.weapon !== "spear") s.weapon = null; // the strategist's sword or spear (content/act2.js a2_weapon)
    // A divine weapon offered in place of a weaker one, and the scene the offer returns to (content/astras.js w_swap).
    if (s.astraOffer != null && !(kind(s.astraOffer) === "object" && isId(s.astraOffer.id) && (s.astraOffer.from == null || isId(s.astraOffer.from)))) s.astraOffer = null;
    if (s.astraNext != null && !isId(s.astraNext)) s.astraNext = null;
    return s;
  };
  K.loadSlot = function (slot) {
    const t = K.store.get(KEY + "." + slot);
    if (!t) return null;
    try { const s = K.cleanLife(K.migrate(JSON.parse(t))); return s.v === 2 && K.SCENES[s.scene] ? s : null; } catch (e) { return null; }
  };
  K.deleteSlot = (slot) => K.store.del(KEY + "." + slot);
  K.prefs = function (patch) {
    let p = {};
    try { p = JSON.parse(K.store.get(KEY + ".prefs") || "{}"); } catch (e) { p = {}; }
    if (patch) { Object.assign(p, patch); K.store.set(KEY + ".prefs", JSON.stringify(p)); }
    // "Calm motion" shows at once: the html class the CSS keys its still rules off (ui/dom.js).
    if (patch && "calm" in patch && K.UI && K.UI.applyCalm) K.UI.applyCalm();
    return p;
  };
  // Open a saved life on the scene it was saved on.
  K.resume = (S) => { K.S = S; return K.go(S.scene, true); };
  // opts.acts: the code carries the life's kept acts too (opts.here: with the life itself as the start
  // of its act); opts.life: the code of another life than K.S (a kept act).
  K.exportCode = function (opts) {
    const o = opts || {}, S = o.life || K.S;
    let txt = S ? (o.life ? JSON.stringify(S) : committedFor(S)) : "{}";
    if (S && o.acts) { const j = JSON.parse(txt); j.cps = o.cps || K.actsFor(S, o.here); txt = JSON.stringify(j); }
    return btoa(unescape(encodeURIComponent(txt)));
  };
  K.importCode = function (txt) {
    txt = String(txt || "").trim();
    let s;
    try { s = JSON.parse(txt); } catch (e) {
      try { s = JSON.parse(decodeURIComponent(escape(atob(txt)))); } catch (e2) { throw new Error(K.tr("That save code could not be read. Copy the whole code and try again.")); }
    }
    if (!s || typeof s !== "object" || Array.isArray(s)) throw new Error(K.tr("That save code could not be read. Copy the whole code and try again."));
    const cps = s.cps; delete s.cps;
    s = K.cleanLife(K.migrate(s));
    if (s.v !== 2 || !K.SCENES[s.scene]) throw new Error(K.tr("That save code is from a different version of the game."));
    if (cps) K.adoptActs(s, cps);
    return s;
  };
})(window.K = window.K || {});
