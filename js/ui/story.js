/* The story on stage. Every scene of the 2D game was a painting with a page of text under it; here the scene's place is
   built around you in 3D (g3/sets.js), the people the text names stand in it with you (the director, below), and the
   page is a sheet beside the scene. The flow of a scene is the 2D game's own, step for step: journey → act card and
   title → the witness layer and the story, written in → the choices (a lamp where the story will not wait) → the test
   or the fight a choice opens → what came of it, and the epic's "after" beat → on. The rules behind every step are the
   engine's (K.choose, K.combatOutcome, K.go); this file only shows them. */
(function (K) {
  "use strict";
  const U = K.UI, G = K.G3;
  const T = window.THREE;
  const headless = () => U.headless();
  const SV = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
  const MARK_SVG = {
    fight: SV + '<path d="M7 2.5c5.5 2.6 9 6.3 9 9.5s-3.5 6.9-9 9.5"/><path d="M7 2.5v19" stroke-width="1"/><path d="M3 12h17M17.5 9.5 20 12l-2.5 2.5M3 10.5 4.5 12 3 13.5"/></svg>',
    death: SV + '<path d="M12 3a7 7 0 0 0-7 7c0 2.5 1.2 4.1 3 5v3.5h8V15c1.8-.9 3-2.5 3-5a7 7 0 0 0-7-7z"/><circle cx="9.3" cy="10.5" r="1.6" fill="currentColor"/><circle cx="14.7" cy="10.5" r="1.6" fill="currentColor"/><path d="M10.5 18.5v2M13.5 18.5v2M12 13.2v1.3"/></svg>',
    cell: SV + '<rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M8.5 3.5v17M12 3.5v17M15.5 3.5v17M4 9h16"/></svg>',
    friend: SV + '<path d="M12 20.5 4.2 12.7A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 7.8 6.1L12 20.5z"/><path d="M12 6.6 10.4 10l2.6 2.2-2 3.2 1 1.6" stroke-width="1.4"/></svg>',
    astra: SV + '<path d="M3 21l7-7M14 10l7-7M16.5 3H21v4.5"/><path d="M10.2 13.8 12 12M12.5 10.5l1.5-.5M3 21l2.5-.5L4 19"/></svg>',
    vow: SV + '<path d="M12 3c2.6 3 4 5.6 4 8.2a4 4 0 0 1-8 0C8 8.6 9.4 6 12 3z"/><path d="M6 20h12M8.5 17h7"/></svg>',
    breakvow: SV + '<path d="M12 3c2.6 3 4 5.6 4 8.2a4 4 0 0 1-8 0C8 8.6 9.4 6 12 3z"/><path d="M5 5l14 14"/></svg>'
  };
  U.portraitKey = (id) => (id ? "p_" + id : null);

  // =====================================================================================================
  // The director: who stands where, how they hold themselves, and where the camera looks.
  // =====================================================================================================
  const D = (U.director = { st: null, sig: "", key: "", figs: new Map(), list: [], tags: [], on: false, yaw: 0, pitch: 0, zoom: 1, base: null, speaker: null, intro: 0, scene: null, look: null });
  const TEACHER_ID = { hermit: "mauni" };
  // People the text can name: the epic's cast, those who have a look of their own, and plain words for plain folk.
  let nameIndex = null;
  function names() {
    if (nameIndex) return nameIndex;
    const out = [], seen = new Set();
    const add = (word, id) => { const w = String(word).trim(); if (w.length < 3 || seen.has(w)) return; seen.add(w); out.push([new RegExp("(^|[^A-Za-z])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![a-z])"), id]); };
    for (const [id, p] of Object.entries(K.PEOPLE)) { if (id === "naga") continue; const n = String(p.name || ""); add(n, id); const first = n.replace(/^Prince /, "").split(/ the | /)[0]; add(first, id); }
    for (const id of Object.keys(K.PUPPETS)) if (!K.PEOPLE[id] && !["guard", "soldier", "cousin", "healer", "boy", "sutradhara"].includes(id)) add(id.charAt(0).toUpperCase() + id.slice(1), id);
    for (const id of ["kunti", "gandhari", "dhritarashtra", "virata"]) add(id.charAt(0).toUpperCase() + id.slice(1), id);
    nameIndex = out;
    return out;
  }
  const COMMON = [[/\b[Yy]our mother\b|\bMother\b/, "mother"], [/\b[Yy]our father\b|\bFather\b/, "father"], [/\b[Gg]randmother\b/, "grandmother"], [/\bsage\b|\brishi\b|\bhermit\b|\bascetic\b/, "sage"], [/\bpriests?\b|\bbrahmins?\b/, "priest"],
    [/\bguards?\b|\bsentr(y|ies)\b/, "guard"], [/\bsoldiers?\b|\bspearmen\b|\bcompany\b/, "soldier"], [/\bbandits?\b|\braiders?\b/, "bandit"], [/\bbard\b|\bsinger\b/, "sutradhara"], [/\bhealers?\b|\bphysician\b/, "healer"],
    [/\bdancers?\b/, "dancer"], [/\bthe king\b|\bKing\b/, "king"], [/\bmerchant\b|\btrader\b|\bcarter\b/, "townsman"], [/\bboys?\b|\bchildren\b/, "boy"]];
  const EXTRA_BY = { village: ["townswoman", "townsman", "girl"], city: ["townsman", "townswoman"], hall: ["guard"], yard: ["soldier", "boy"], camp: ["soldier", "soldier"], field: ["soldier", "soldier"], shrine: ["priest"], forest: [], garden: [], river: [], lac: [], mountain: [], sea: [], deep: [], room: [], void: [] };
  const flat = (v, out) => { if (v == null) return out; if (typeof v === "string") out.push(v); else if (Array.isArray(v)) { if (typeof v[0] === "string" && v.length <= 3 && (v[1] == null || typeof v[1] === "object") && !Array.isArray(v[1])) out.push(v[0]); else v.forEach((x) => flat(x, out)); } else if (typeof v === "object") { for (const k of ["speaker", "line", "memory", "curse", "aside"]) if (typeof v[k] === "string") out.push(v[k]); } return out; };
  // Who is in a scene: those who speak, those its words name (in the order they come), and a few plain folk of the place.
  D.castOf = function (sc, extraText) {
    const S = K.S, out = [], push = (id) => { if (id && id !== "me" && !out.includes(id) && !(K.isDead(id, S) && K.PEOPLE[id])) out.push(id); };
    let body = []; try { body = [].concat(K.val(sc.body) || []); } catch (e) { body = []; }
    for (const b of body) if (b && b.speaker) push(U.personByName(b.speaker));
    const parts = flat([K.val(sc.title), K.val(sc.witness), body, extraText], []);
    let rows = []; try { rows = K.choiceList(sc); } catch (e) { rows = []; }
    for (const { c } of rows) { flat(K.val(c.t), parts); const im = K.val(c.img); if (typeof im === "string" && /^p_/.test(im)) push(im.slice(2)); }
    const text = parts.join(" \n ");
    const found = [];
    for (const [re, id] of names()) { const m = re.exec(text); if (m) found.push([m.index, id]); }
    const tok = { friend: S.friend, spouse: S.spouse, child: S.child ? "vasu" : null, teacher: S.teacher ? TEACHER_ID[S.teacher] || S.teacher : null };
    for (const [k, id] of Object.entries(tok)) { const i = text.indexOf("{" + k); if (i >= 0 && id) found.push([i, id]); }
    { const i = text.indexOf("{king"); const kn = i >= 0 && K.COURTS && K.COURTS[S.court] ? U.personByName(K.COURTS[S.court].king) : null; if (kn) found.push([i, kn]); }
    found.sort((a, b) => a[0] - b[0]).forEach(([, id]) => push(id));
    const named = out.length;
    for (const [re, id] of COMMON) { if (out.length >= 5) break; if (re.test(text) && !out.includes(id)) out.push(id); }
    return { ids: out.slice(0, G.q && G.q.name === "low" ? 3 : 5), named };
  };
  // A look for anyone: their own, an extra's, or one made from their name (so the same person always looks the same).
  const SHE = new Set(["devi", "ulupi", "kanaka", "madhavi", "draupadi", "kunti", "gandhari"]);
  const CLOTH = ["#8a3a2a", "#3f6b5a", "#5a4a8a", "#a3662a", "#2f5a7a", "#7a2f4a", "#6b6a2a", "#3a6a3a"], SKIN = ["#c27a44", "#b06c3c", "#9e6a40", "#c9905a", "#b9743f"];
  D.lookOf = function (id) {
    if (id === "me") return G.lookOf("me");
    const L = G.lookOf(id);
    if (L) return L;
    const h = G.hash(id);
    return { pronoun: SHE.has(id) ? "she" : "he", stage: "adult", palette: [SKIN[h % SKIN.length], CLOTH[(h >> 3) % CLOTH.length], "#e2b55a"], headgear: SHE.has(id) ? null : ["band", "turban", "mukuta", null][(h >> 6) % 4], hat: CLOTH[(h >> 9) % CLOTH.length], item: null };
  };
  const UNNAMED = new Set(["mother", "father", "grandmother", "sage", "priest", "guard", "soldier", "bandit", "sutradhara", "healer", "dancer", "king", "townsman", "townswoman", "boy", "girl", "child", "cousin", "common", "archer", "rider", "champion"]);
  const PLAIN = { mother: "Your mother", father: "Your father", grandmother: "Grandmother" };
  // How people hold themselves in a kind of place: [you, the others].
  function posesFor(st, sc) {
    const o = st.o || {};
    if (st.kind === "hall" && (o.dice || o.table)) return ["sit", "sit"];
    if (st.kind === "shrine") return ["namaste", "stand"];
    if (st.kind === "room") return ["sit", "sit"];
    if (sc && /ashram|teaching|sage_year|own_student/.test(String(K.val(sc.art)))) return ["sit", "sit"];
    return ["stand", "stand"];
  }
  D.drop = function () {
    for (const f of D.list) f.dispose();
    D.list = []; D.figs.clear();
    for (const t of D.tags) t.el.remove();
    D.tags = []; D.speaker = null;
  };
  // Put a place on stage with these people in it. people: ["me", id, ...] or [{ id, pose, at: [x, z, ry], item, spec, tag }].
  D.show = function (key, people, o) {
    o = o || {};
    if (!G.ok) return null;
    const S = K.S, clear = o.clear || 8;
    const stageKey = key + "|" + clear + "|" + (o.sky || "");
    const rows = (people || ["me"]).map((p) => (typeof p === "string" ? { id: p } : p));
    const sig = stageKey + "#" + rows.map((r) => r.id + ":" + (r.pose || "") + ":" + (r.key || "") + ":" + (r.at ? r.at.join(",") : "")).join("|") + "#" + (S ? S.age + (S.path || "") + (S.pronoun || "") + (S.origin || "") + ((S.injuries || []).length) : "");
    if (D.sig === sig && D.st && G.stageNow() === D.st && !o.force) { D.on = true; return D.st; }
    if (D.key !== stageKey || G.stageNow() !== D.st || o.force) { D.st = G.setStage(key, { clear, sky: o.sky || undefined }); D.key = stageKey; }
    D.drop(); D.sig = sig;
    const st = D.st, poses = o.poses || posesFor(st, o.sc);
    let spot = 0;
    for (const r of rows) {
      const me = r.id === "me";
      const spec = r.spec || D.lookOf(r.id);
      const f = G.figure(spec, r.item !== undefined ? { item: r.item } : {});
      const at = r.at || (me ? st.me : st.spots[Math.min(spot++, st.spots.length - 1)]);
      f.place(at[0], at[1], at[2]); f.pose(r.pose || (me ? poses[0] : poses[1]), true);
      f.id = r.id; f.home = at;
      G.actors.add(f.root);
      D.list.push(f); D.figs.set(r.id, f);
      if (o.tags !== false && r.tag !== false && (me || !UNNAMED.has(r.id) || PLAIN[r.id])) {
        const label = me ? (S.name || K.tr("You")) : PLAIN[r.id] ? K.tr(PLAIN[r.id]) : K.personName(r.id);
        const el = U.el('<span class="tag3d' + (me ? " me" : "") + '">' + U.esc(label) + "</span>");
        U.$("stagehud").appendChild(el); D.tags.push({ el, f, id: r.id });
      }
    }
    // The camera: the place's own angle, far enough back for you and the two nearest to fit the free part of the screen.
    const c = st.cam || { look: [0, 1.15, 0], dist: 8, yaw: 0.2, pitch: 0.13 };
    const meF = D.figs.get("me"), near = D.list.slice(0, 3);
    let rad = 2.2; const lk = G.v3(c.look);
    for (const f of near) rad = Math.max(rad, Math.hypot(f.root.position.x - lk.x, f.root.position.z - lk.z) + 1.1);
    D.base = { look: lk, dist: o.dist || c.dist, yaw: c.yaw, pitch: c.pitch, rad: Math.min(rad, 3.8), fov: o.fov || 42 };
    if (meF && !st.cam && D.list.length === 1) D.base.look.set(meF.root.position.x, 1.1, meF.root.position.z);
    D.yaw = 0; D.pitch = 0; D.zoom = 1; D.on = true; D.intro = o.intro === false ? 0 : 1; D.look = null;
    D.tagsOn(o.tags !== false);
    camera(0, true);
    return st;
  };
  // The scene's own place and people.
  D.scene = function (sc, o) {
    if (!G.ok) return null;
    D.sceneNow = sc;
    const key = artFor(sc) || "origin";
    const cast = D.castOf(sc), pl = G.placeOf(key);
    const ids = cast.ids.slice();
    // A place with nobody named in it still has its people: a few plain folk further back.
    const extras = ids.length < 2 && !sc.prologue ? (EXTRA_BY[pl.kind] || []).slice(0, 2 - Math.min(ids.length, 1)) : [];
    const people = [sc.prologue ? { id: "me", spec: Object.assign({}, K.puppetSpec(K.S), { stage: "adult", item: K.fightItem ? K.fightItem(K.S) || "sword" : "sword" }) } : "me"].concat(ids);
    const st0 = D.show(key, people, Object.assign({ sc }, o || {}));
    if (st0 && extras.length && !D.figs.has("x0")) {
      extras.forEach((id, i) => { const at = st0.spots[4 + i] || st0.spots[st0.spots.length - 1]; if (D.figs.has(id)) return; const f = G.figure(D.lookOf(id)); f.place(at[0] + (i ? -0.8 : 0.6), at[1] - 0.6, at[2]); f.pose("stand", true); f.id = "x" + i; G.actors.add(f.root); D.list.push(f); D.figs.set("x" + i, f); });
    }
    const fx = K.val(sc.fx);
    if (st0 && fx && !st0.fxOn) { st0.fxOn = true; st0.amb(fx === "fire" ? "embers" : "smoke", { r: 12, rate: fx === "fire" ? 14 : 5 }); }
    return st0;
  };
  D.release = function () { D.on = false; D.drop(); D.sig = ""; };
  D.tagsOn = function (on) { D.tagsVisible = !!on; for (const t of D.tags) t.el.classList.toggle("on", !!on); };
  D.say = function (id) {
    if (!G.ok) return;
    D.speaker = id && D.figs.has(id) ? id : null;
    for (const f of D.list) { f.talk = f.id === D.speaker; }
    for (const t of D.tags) t.el.classList.toggle("says", t.id === D.speaker);
    const sp = D.speaker ? D.figs.get(D.speaker) : null, me = D.figs.get("me");
    for (const f of D.list) f.look = sp && f !== sp ? sp.root.position : sp && me && f === sp ? me.root.position : null;
    D.look = sp ? sp.root.position : null;
  };
  // Your figure answers what just happened.
  const REACT = { win: ["cheer", 2400], lose: ["slump", 2600], vow: ["namaste", 2600], shame: ["shame", 2800], fold: ["namaste", 2200], tremble: ["freeze", 1800] };
  D.react = function (kind) {
    const me = D.figs.get("me"), r = REACT[kind];
    if (!me || !r || !U.motion()) return;
    const back = me.base; me.pose(r[0]);
    clearTimeout(D.reactT); D.reactT = setTimeout(() => { if (D.figs.get("me") === me) me.pose(back); }, r[1]);
    if (kind === "win") G.fx.burst("light", me.chest(), { n: 10 });
  };
  U.puppetReact = (k) => D.react(k);
  const head = T ? new T.Vector3() : null, scr = {};
  function camera(dt, snap) {
    const b = D.base; if (!b) return;
    const fit = G.fitDist(b.rad, b.fov);
    const sway = U.calm() ? 0 : Math.sin(G.t * 0.13) * 0.05;
    const intro = D.intro > 0 ? G.ease(D.intro) : 0;
    const yaw = b.yaw + D.yaw + sway + intro * 0.22, pitch = G.clamp(b.pitch + D.pitch + intro * 0.1, 0.03, 0.75), dist = Math.max(b.dist * 0.72, fit) * D.zoom * (1 + intro * 0.45);
    const lx = b.look.x + (D.look ? (D.look.x - b.look.x) * 0.35 : 0), lz = b.look.z + (D.look ? (D.look.z - b.look.z) * 0.35 : 0);
    G.camSet([lx + Math.sin(yaw) * Math.cos(pitch) * dist, b.look.y + Math.sin(pitch) * dist, lz + Math.cos(yaw) * Math.cos(pitch) * dist], [lx, b.look.y, lz], b.fov, snap);
  }
  D.frame = function (dt, t) {
    if (!D.on) return;
    if (D.intro > 0) D.intro = Math.max(0, D.intro - dt / 2.6);
    for (const f of D.list) f.update(dt, t);
    G.cam.rate = 3.2;
    camera(dt, false);
    const r = G.rect || { x: 0, y: 0, w: G.W, h: G.H };
    for (const tg of D.tags) {
      tg.f.headPos(head); head.y += 0.3;
      G.toScreen(head, scr);
      const ok = D.tagsVisible && !scr.behind && scr.x > r.x + 20 && scr.x < r.x + r.w - 20 && scr.y > r.y + 44 && scr.y < r.y + r.h;
      tg.el.style.opacity = ok ? "" : "0";
      if (ok) tg.el.style.transform = "translate(" + Math.round(scr.x) + "px," + Math.round(scr.y) + "px) translate(-50%,-100%)";
    }
  };
  // Dragging on the scene turns the camera a little; the wheel or a pinch brings it nearer.
  function wireOrbit() {
    const cv = U.$("view"); if (!cv) return;
    let drag = null, pinch = 0; const pts = new Map();
    cv.addEventListener("pointerdown", (e) => { if (!D.on || document.body.dataset.mode !== "story") return; pts.set(e.pointerId, e); drag = { x: e.clientX, y: e.clientY, yaw: D.yaw, pitch: D.pitch }; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* gone */ } });
    cv.addEventListener("pointermove", (e) => {
      if (!drag || !D.on || !pts.has(e.pointerId)) return; pts.set(e.pointerId, e);
      if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (pinch) D.zoom = G.clamp(D.zoom * (pinch / d), 0.6, 1.5); pinch = d; return; }
      D.yaw = G.clamp(drag.yaw - (e.clientX - drag.x) * 0.006, -1.1, 1.1); D.pitch = G.clamp(drag.pitch + (e.clientY - drag.y) * 0.004, -0.12, 0.5);
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; if (!pts.size) drag = null; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", (e) => { if (!D.on || document.body.dataset.mode !== "story") return; D.zoom = G.clamp(D.zoom * (e.deltaY > 0 ? 1.08 : 0.93), 0.6, 1.5); }, { passive: true });
  }

  // A dark (or white) curtain over a change of place, so nothing is seen half built.
  let curtainEl = null;
  U.curtain = function (fn, white, ms) {
    if (!G.ok || !U.motion()) { fn(); return; }
    if (!curtainEl) { curtainEl = U.el('<div class="curtain"></div>'); document.body.appendChild(curtainEl); }
    curtainEl.classList.toggle("white", !!white);
    curtainEl.classList.add("on");
    setTimeout(() => { try { fn(); } finally { setTimeout(() => curtainEl.classList.remove("on"), ms || 120); } }, 240);
  };

  // =====================================================================================================
  // A scene's page
  // =====================================================================================================
  function header(sc) {
    const S = K.S;
    U.where("<b>" + U.t(K.val(sc.actTitle) || K.ACT_TITLES[S.act] || "") + "</b><span>" + (sc.prologue ? U.tr("Years from now") : U.tr("Age {n}", { n: S.age })) + " · " + U.t(K.val(sc.place) || "") + "</span>");
  }
  function artFor(sc) {
    let a = null; try { a = K.val(sc.art); } catch (e) { a = null; }
    if (a === "origin" || !a) return "origin";
    return a;
  }
  U.artFor = artFor;
  function tagFor(sc) {
    if (sc.prologue) return ["war", K.tr("A dream")];
    if (sc.canon && sc.war) return ["canon war", K.tr("Written · the war")];
    if (sc.canon) return ["canon", K.tr("Written")];
    if (sc.war) return ["war", K.tr("Unwritten · the war")];
    return ["yours", K.tr("Unwritten")];
  }
  // ---------- A page shown again (a redraw, a language switch) is there whole at once ----------
  const pages = { visit: null, shown: new Set() };
  const shownNow = () => { if (pages.visit !== K.visit) { pages.visit = K.visit; pages.shown = new Set(); } return pages.shown; };
  U.pageAgain = (key, resumable) => shownNow().has(key) || (!!resumable && K.visit != null && K.resumed === K.visit);
  U.pageShown = (key) => { shownNow().add(key); };
  // ---------- The story comes in a line at a time ----------
  U.gradual = () => U.motion() && K.prefs().gradual !== false;
  let stageRun = null;
  U.stageFinish = function () {
    const r = stageRun; if (!r) return;
    stageRun = null; clearTimeout(r.timer);
    r.items.forEach((el) => el.classList.remove("staged", "shown"));
    D.say(null);
    if (r.done) r.done();
  };
  U.staging = () => !!stageRun;
  U.stage = function (items, done, whole) {
    if (stageRun) { const r = stageRun; stageRun = null; clearTimeout(r.timer); r.items.forEach((el) => el.classList.remove("staged", "shown")); }
    items = items.filter(Boolean);
    if (!U.gradual() || whole) { items.forEach((el) => el.classList.remove("staged")); if (done) done(); return; }
    items.forEach((el) => { el.classList.add("staged"); el.classList.remove("shown"); });
    const run = (stageRun = { items, i: 0, timer: null, done });
    const hold = (el) => (el.dataset.hold ? +el.dataset.hold : Math.min(1700, 300 + (el.textContent || "").trim().length * 11));
    const step = () => {
      if (stageRun !== run) return;
      const el = run.items[run.i++];
      if (!el) return U.stageFinish();
      el.classList.add("shown");
      if (el.classList.contains("said")) { D.say(el.dataset.who || null); if (K.Sound && run.i > 1) K.Sound.play("quill"); } else if (el.tagName === "P") D.say(null);
      const story = U.$("story"); if (story && story.contains(el)) U.toEnd(story, true);
      run.timer = setTimeout(step, hold(el));
    };
    run.timer = setTimeout(step, 60);
  };
  U.toEnd = function (story, smooth) {
    if (!story) return;
    if (typeof story.scrollTo === "function") story.scrollTo({ top: story.scrollHeight, behavior: smooth && U.motion() ? "smooth" : "auto" }); else story.scrollTop = story.scrollHeight;
  };
  document.addEventListener("keydown", (e) => { if (stageRun && !document.querySelector(".scrim, .beat") && (e.key === " " || e.key === "Enter")) { e.preventDefault(); U.stageFinish(); } });
  document.addEventListener("click", (e) => { if (stageRun && e.target.closest && e.target.closest(".sheet") && !e.target.closest("button")) U.stageFinish(); });

  let lastPlace = null, lastConch = null, beatSeen = null, actSeen = null, sleepFor = null;
  const TENSE = new Set(["a1_poison", "a3_lac", "a5_karna_secret", "a5_side"]);
  function sheet(html, cls) { const p = U.$("page"); p.innerHTML = '<div class="sheet ' + (cls || "") + '">' + html + "</div>"; U.layout("story"); return p.firstElementChild; }
  U.sheet = sheet;

  U.renderScene = function (sc) {
    U.keys([]);
    stopLamp();
    if (U.screen) U.screen(null);
    if (sc.ending) return U.renderEnding(sc);
    const S = K.S;
    const pageKey = "scene:" + sc.id;
    const again = U.pageAgain(pageKey, true) || !!(S.loopThen && S.loopThen.scene === sc.id);
    if (sc.sleepIntro && !again && sleepFor !== K.visit && U.beatsOn()) { sleepFor = K.visit; return U.sleepIntro(() => U.renderScene(sc)); }
    if (sc.war && !again && lastConch !== sc.id && K.Sound) K.Sound.play("conch");
    if (K.Sound) K.Sound.mood(sc.war || sc.act === 6 ? "battle" : sc.act === 4 || sc.act === 5 || K.val(sc.lamp) || TENSE.has(sc.id) ? "tense" : "calm");
    lastConch = sc.id;
    U.redraw = () => U.renderScene(sc);
    U.setNav(true);
    header(sc);
    const moved = K.travel ? K.travel(sc) : null;
    if (!moved && S.at && S.at !== lastPlace && K.Sound && K.Sound.place) { lastPlace = S.at; if (!again) K.Sound.place(S.origin === "suta" && S.at === "anga" ? "suta" : S.at); }
    if (moved && U.journeyPage && !headless() && !again) {
      const place = K.val(sc.place);
      const why = K.val(sc.travel) || (K.homePlace && place === K.homePlace(S) ? ["You go home to {place}.", { place }] : ["Ahead: {what}", { what: K.val(sc.title) || "" }]);
      return U.journeyPage(moved[0], moved[1], why, () => U.renderScene(sc));
    }
    const [tag, tagText] = tagFor(sc);
    // The place and its people first; then the cards; then the page.
    const fresh = G.ok && (D.sceneNow !== sc || !D.on || G.stageNow() !== D.st);
    if (beatSeen !== sc.id && !again && U.beatsOn()) {
      beatSeen = sc.id;
      const newAct = !sc.prologue && actSeen !== S.act;
      if (!sc.prologue) actSeen = S.act;
      U.$("page").innerHTML = ""; U.layout("story");
      const go = () => { D.scene(sc); D.tagsOn(false); U.sceneBeats(sc, { act: newAct, full: newAct || bigScene(sc), tag, tagText }, () => U.renderScene(sc)); };
      if (fresh) U.curtain(go); else go();
      return;
    }
    beatSeen = sc.id; if (!sc.prologue) actSeen = S.act;
    D.scene(sc); D.tagsOn(true);
    const witness = K.val(sc.witness), title = K.val(sc.title), caption = K.val(sc.caption);
    const el = sheet('<div class="sheet-head"><span class="kind ' + tag + '">' + U.esc(tagText) + "</span>" + (title ? "<h1>" + U.t(title) + "</h1>" : "") + (caption ? '<p class="cap">' + U.t(caption) + "</p>" : "") + "</div>" +
      '<div class="story" id="story" tabindex="0">' +
      (witness ? '<div class="witness"><div class="lbl">' + U.tr("As it is written") + "</div>" + U.blocks(witness) + "</div>" : "") +
      (S.loopThen && S.loopThen.scene === sc.id ? '<p class="aside loopnote">' + U.tr("You are back at the same choice. One way is closed to you now.") + "</p>" : "") +
      U.blocks(sc.body) + '</div><div class="actions"><div class="choices" id="choices"></div><p class="hint" id="keyhint"></p></div>');
    const box = U.$("choices"), rows = K.choiceList(sc), keys = [];
    box.classList.toggle("two", rows.length >= 4 && rows.every(({ c, crossed }) => !crossed && U.t(K.val(c.t)).length <= 26));
    rows.forEach(({ c, ok, crossed }, i) => {
      const fx = crossed ? '<span class="down">' + U.t(crossed) + "</span>" : ok ? "" : U.t(K.val(c.locked) || "");
      const img = K.val(c.img), marks = ok ? K.choiceMarks(c) : [];
      const signs = marks.map((m) => '<i class="mark ' + m[0] + '" role="img" aria-label="' + U.esc(m[1]) + '" title="' + U.esc(m[2] || m[1]) + '">' + (MARK_SVG[m[0]] || "") + "</i>").join("");
      const nStars = ok ? Math.min(3, K.val(c.stars) | 0) : 0;
      const face = typeof img === "string" && /^p_/.test(img) ? U.face(img.slice(2)) : "";
      const b = U.button("choice" + (crossed ? " crossed" : "") + (fx ? " has-fx" : ""), '<span class="k">' + (i + 1) + "</span>" + face + '<span class="t">' + U.t(K.val(c.t)) + (nStars ? ' <span class="stars" title="' + U.tr("Suits you best") + '">' + "★".repeat(nStars) + "</span>" : "") + "</span>" +
        (signs ? '<span class="marks">' + signs + "</span>" : "") + (fx ? '<span class="fx">' + fx + "</span>" : ""), null, "choice-" + c.id);
      if (!ok && !crossed && fx) b.title = fx.replace(/<[^>]+>/g, "");
      b.disabled = !ok;
      const run = () => pick(sc, c, b);
      b.addEventListener("click", run);
      keys.push(ok ? run : null);
      box.appendChild(b);
    });
    if (U.practiceOffer) U.practiceOffer(sc, rows, box);
    U.$("keyhint").textContent = rows.length > 2 ? K.tr("Press 1 to {n} to choose.", { n: rows.length }) : rows.length === 2 ? K.tr("Press 1 or 2 to choose.") : "";
    const story = U.$("story"), parts = [];
    for (const c of story.children) { if (c.classList.contains("witness")) { c.dataset.hold = 250; parts.push(c, ...c.children); } else parts.push(c); }
    [...box.children].forEach((b) => { b.dataset.hold = 90; });
    U.keys([]);
    U.pageShown(pageKey);
    story.scrollTop = 0;
    U.stage([el.querySelector(".sheet-head"), ...parts, box.parentElement, ...box.children], () => {
      U.keys(keys); startLamp(sc, rows);
      if (U.autoTry === sc.id && rows.length === 1 && rows[0].c.again) { U.autoTry = null; keys[0](); return; }
      if (K.inPeril && rows.some((r) => r.ok && r.c.peril && K.inPeril(r.c))) D.react("tremble");
    }, again);
    if (el.querySelector(".sheet-head")) el.querySelector(".sheet-head").dataset.hold = 380;
    const day = !headless() && K.ORDERS && K.ORDERS.due ? K.ORDERS.due(sc, S) : null;
    if (day) showOrders(day, sc);
    if (U.playMoments && K.momentQueue && K.momentQueue.length) U.playMoments();
  };
  function bigScene(sc) {
    if (sc.canon || sc.war || K.val(sc.lamp) || TENSE.has(sc.id) || sc.big) return true;
    return K.choiceList(sc).some(({ c }) => c.trial || c.game || c.combat);
  }

  // ---------- Cards over the scene: a new act, a scene's title ----------
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
  let beatRun = null;
  U.beatStop = function () { if (!beatRun) return; clearTimeout(beatRun.timer); window.removeEventListener("keydown", beatRun.key, true); beatRun.el.remove(); beatRun = null; };
  U.sceneBeats = function (sc, o, done) {
    const S = K.S, still = U.calm();
    U.beatStop();
    const el = U.el('<div class="beat" id="beat" role="presentation"></div>');
    document.body.appendChild(el);
    const title = o.title || K.val(sc.title) || K.val(sc.caption) || "";
    const place = K.val(sc.place);
    const where = (sc.prologue ? U.tr("Years from now") : U.tr(S.alive === false ? "Fell at {n}" : "Age {n}", { n: S.age })) + (place ? " · " + U.t(place) : "");
    const steps = [];
    if (o.act) {
      const full = U.t(K.ACT_TITLES[S.act] || ""), cut = full.indexOf(" · ");
      const num = cut > 0 ? full.slice(0, cut) : U.tr("Act {n}", { n: ROMAN[S.act] || S.act }), name = cut > 0 ? full.slice(cut + 3) : full;
      const line = K.ACT_LINES && K.ACT_LINES[S.act];
      steps.push({ cls: "dim", ms: 3200, html: '<div class="beat-act"><span class="b-num">' + num + "</span><b>" + name + '</b><i class="b-orn" aria-hidden="true"></i>' + (line ? "<p>" + U.t(line) + "</p>" : "") + "</div>", on: () => { if (K.Sound) K.Sound.play("gong"); } });
    }
    if (title && o.full && K.prefs().titles !== "short") {
      steps.push({ cls: "veil", ms: 1700, html: '<div class="beat-title"><span class="kind ' + o.tag + '">' + U.esc(o.tagText) + "</span><b>" + U.t(title) + "</b><small>" + where + "</small></div>" });
      steps.push({ cls: "clear", ms: 900, html: "" });
    } else if (title) { steps.push({ cls: "low", ms: 1300, html: '<div class="beat-short"><span class="kind ' + o.tag + '">' + U.esc(o.tagText) + "</span><b>" + U.t(title) + "</b></div>" }); }
    const run = (beatRun = { el, timer: null, i: -1, key: null });
    const finish = () => { if (beatRun !== run) return; U.beatStop(); done(); };
    const next = () => {
      if (beatRun !== run || run.ending) return;
      clearTimeout(run.timer);
      const cur = el.firstElementChild, st = steps[++run.i];
      if (!st) { run.ending = true; if (cur) cur.classList.replace("in", "out"); el.classList.add("gone"); run.timer = setTimeout(finish, still ? 0 : 240); return; }
      const show = () => {
        if (beatRun !== run) return;
        el.className = "beat " + st.cls; el.innerHTML = st.html ? '<div class="beat-in">' + st.html + "</div>" : "";
        const inner = el.firstElementChild;
        if (inner) { if (still) inner.classList.add("in"); else requestAnimationFrame(() => requestAnimationFrame(() => inner.classList.add("in"))); }
        if (st.on) st.on();
        run.timer = setTimeout(next, st.ms);
      };
      if (cur && !still) { cur.classList.replace("in", "out"); run.timer = setTimeout(show, 220); } else show();
    };
    el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); next(); });
    run.key = (e) => { if (document.querySelector(".scrim")) return; if ([" ", "Enter", "Escape", "ArrowRight"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); next(); } };
    window.addEventListener("keydown", run.key, true);
    next();
  };

  // ---------- A sequence played on stage with a line under it; a tap goes on ----------
  // steps: [{ ms, run(say) }]; say(who, text, sub) writes the line. Returns { end }.
  function cine(steps, done, o) {
    o = o || {};
    const el = U.el('<div class="beat cine" role="presentation"><p class="caption3d"></p><span class="mo-tap">' + U.tr("Tap to go on") + "</span></div>");
    document.body.appendChild(el);
    const cap = el.querySelector(".caption3d");
    const say = (who, text, sub) => { cap.classList.remove("in"); void cap.offsetWidth; cap.innerHTML = (who ? '<span class="who">' + U.esc(K.tr(who)) + "</span>" : "") + (text ? U.esc(K.text(text)) : "") + (sub ? "<small>" + U.esc(K.text(sub)) + "</small>" : ""); if (text || who) cap.classList.add("in"); };
    let i = -1, timer = null, gone = false; const t0 = performance.now();
    const end = () => { if (gone) return; gone = true; clearTimeout(timer); window.removeEventListener("keydown", key, true); el.remove(); done(); };
    const next = () => { if (gone) return; clearTimeout(timer); i++; if (i >= steps.length) return end(); steps[i].run(say, el); timer = setTimeout(next, U.calm() ? steps[i].ms * 0.6 : steps[i].ms); };
    const key = (e) => { if ([" ", "Enter", "Escape", "ArrowRight"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); if (e.key === "Escape" && o.skip) end(); else next(); } };
    el.addEventListener("click", () => { if (performance.now() - t0 > 350) next(); });
    window.addEventListener("keydown", key, true);
    next();
    return { end, el };
  }
  U.cine = cine;

  // ---------- Falling asleep into the dream: home at dusk, supper, bed, and the dream rising ----------
  U.sleepIntro = function (done) {
    if (headless() || !G.ok) return done();
    U.beatStop();
    const S = K.S, O = K.ORIGINS[S.origin] || {};
    const base = K.puppetSpec(S), pal = base.palette || [];
    const kid = Object.assign({}, base, { stage: "child", item: null });
    const kin = (pronoun, stage, cloth) => ({ pronoun, stage, palette: [pal[0], cloth, pal[2]], item: null, headgear: pronoun === "he" ? "band" : null });
    const home = S.origin === "suta" ? "home_anga" : "home_" + S.origin;
    U.$("page").innerHTML = ""; U.setNav(false); U.where(""); U.layout("full");
    let walker = null, off = null;
    const steps = [
      { ms: 5200, run: (say) => { const st = D.show(home, [{ id: "me", spec: kid, at: [-7, 2.2, Math.PI / 2], tag: false }], { sky: "dusk", tags: false, dist: 9 }); walker = D.figs.get("me");
        if (walker && st) { walker.speed = 1.5; off = G.onFrame((dt) => { if (walker.root.position.x < -0.6) walker.root.position.x += 1.5 * dt; else { walker.speed = 0; } }); }
        say(O.region, O.name, O.detail); } },
      { ms: 4200, run: (say) => { if (off) off(); U.curtain(() => { D.show("room_night", [{ id: "me", spec: kid, pose: "sit", at: [0.6, 0.5, Math.PI / 2], tag: false }, { id: "gm", spec: kin("she", "elder", "#b9a27c"), pose: "sit", at: [0.6, -0.6, Math.PI / 2 + 0.3], tag: false },
        { id: "mo", spec: kin("she", "adult", "#8a2f3a"), pose: "sit", at: [1.9, 0.6, -Math.PI / 2], tag: false }, { id: "fa", spec: kin("he", "adult", pal[1] || "#6f3a24"), pose: "sit", at: [1.9, -0.5, -Math.PI / 2 - 0.3], tag: false }], { tags: false, intro: false, dist: 6.2 });
        for (const f of D.list) f.talk = f.id !== "me"; }); say(null, "Supper with the family.", "Grandmother's old stories, your father's bad jokes, and always a little more rice for you."); } },
      { ms: 3600, run: (say) => { U.curtain(() => { D.show("room_night", [{ id: "me", spec: kid, pose: "sleep", at: [-2, -2.2, Math.PI / 2], tag: false }], { tags: false, intro: false, dist: 5.4 }); const me = D.figs.get("me"); if (me) { me.root.position.y = 0.42; } G.setSky("cave", { hi: 0.3, si: 0.4 }); }); say(null, "Then bed. The lamp burns low."); } },
      { ms: 2400, run: (say) => { say(null, ["And you dream.", null]); G.fx.flash("#fff6e6", 2300); if (K.Sound) K.Sound.play("heartbeat"); } }
    ];
    cine(steps, () => { if (off) off(); U.curtain(done, true, 300); }, { skip: true });
  };
  // ---------- Waking from the dream, at home: your mother's lamp, your father in the doorway ----------
  U.wakeScene = function (text, done) {
    if (headless() || !G.ok) return done();
    U.beatStop();
    const S = K.S, base = K.puppetSpec(S), pal = base.palette || [];
    const kid = Object.assign({}, base, { stage: "child", item: null });
    const kin = (pronoun, cloth) => ({ pronoun, stage: "adult", palette: [pal[0], cloth, pal[2]], item: null, headgear: pronoun === "he" ? "band" : null });
    U.$("page").innerHTML = ""; U.setNav(false); U.where(""); U.layout("full");
    G.fx.flash("#fff6e6", 1800);
    D.show("dream_white", [], { tags: false, intro: false });
    const steps = [
      { ms: 3000, run: (say) => { say(null, text || ""); } },
      { ms: 3600, run: (say) => { U.curtain(() => { D.show("room_night", [{ id: "me", spec: kid, pose: "sit", at: [-2, -2.2, Math.PI / 2 - 0.5], tag: false }], { tags: false, intro: false, dist: 5.6 }); const me = D.figs.get("me"); if (me) me.root.position.y = 0.42; }, true); say(null, "You wake with a cry, soaked in sweat, in your own bed."); } },
      { ms: 5000, run: (say) => { const st = D.st, mo = G.figure(kin("she", "#8a2f3a"), { item: "torch" }); mo.place(2.6, -0.4, -Math.PI / 2); mo.id = "mo"; G.actors.add(mo.root); D.list.push(mo); D.figs.set("mo", mo);
        mo.speed = 1.6; const off = G.onFrame((dt) => { if (mo.root.position.x > -0.7) { mo.root.position.x -= 1.9 * dt; mo.root.position.z += (-1.9 - mo.root.position.z) * dt; } else { mo.speed = 0; mo.pose("kneel"); mo.talk = true; off(); } }); if (st) st.offs.push(off);
        say("Your mother", "\"Hush. It was only a dream. You are home, and I am here.\""); } },
      { ms: 7000, run: (say) => { const fa = G.figure(kin("he", pal[1] || "#6f3a24")); fa.place(2.9, -3.0, -Math.PI / 2 - 0.4); fa.id = "fa"; fa.talk = true; G.actors.add(fa.root); D.list.push(fa); D.figs.set("fa", fa); const mo = D.figs.get("mo"); if (mo) mo.talk = false;
        say("Your father", "\"The sages have said it for years: the Kuru cousins will go to war, and the whole land with them. Perhaps you saw it. Then grow strong, and be ready when it comes.\""); } }
    ];
    cine(steps, () => U.curtain(done), { skip: true });
  };
  U.wake = function (text, done) { if (headless() || !G.ok) return done(); G.fx.flash("#fff6e6", 1500); cine([{ ms: 5000, run: (say) => say(null, text || "") }], done); };

  // ---------- The lamp: a choice the story will not wait for ----------
  let lampRun = null, pickedVisit = -1;
  const lampMemo = { key: null, left: 0 };
  function stopLamp() { if (lampRun) { clearTimeout(lampRun.timer); lampRun = null; } }
  function startLamp(sc, rows) {
    stopLamp();
    if (pickedVisit === K.visit) return;
    const L = K.val(sc.lamp);
    if (!L || !U.timed()) return;
    const silent = rows.find((r) => r.ok && r.c.id === K.val(L.silent)), box = U.$("choices");
    if (!silent || !box) return;
    const total = L.secs * 1000, key = sc.id + "#" + K.S.log.length;
    let left = lampMemo.key === key ? lampMemo.left : total;
    const el = U.el('<div class="lamp" role="timer"><span class="diya"></span><span class="oil"><i></i></span><span class="lamp-note">' + U.t(L.note) + "</span></div>");
    el.style.setProperty("--oil", (left / total).toFixed(3));
    box.parentNode.insertBefore(el, box);
    const run = (lampRun = { timer: 0 });
    let last = performance.now(), warned = left <= 5000;
    if (K.Sound) K.Sound.play("lamp");
    const tick = () => {
      if (lampRun !== run) return;
      if (!document.body.contains(el)) return stopLamp();
      const now = performance.now();
      if (!document.hidden && !U.paused() && !document.querySelector(".scrim, .moment3d, .beat")) left -= now - last;
      last = now; lampMemo.key = key; lampMemo.left = left;
      el.style.setProperty("--oil", Math.max(0, left / total).toFixed(3));
      if (left <= 5000 && !warned) { warned = true; el.classList.add("low"); if (K.Sound) K.Sound.play("lamp"); }
      if (left <= 0) { stopLamp(); lampMemo.key = null; return pick(sc, silent.c, U.$("choice-" + silent.c.id), true); }
      run.timer = setTimeout(tick, 100);
    };
    if (left <= 5000) el.classList.add("low");
    run.timer = setTimeout(tick, 100);
  }

  // ---------- Choosing ----------
  function pick(sc, c, btn, lampOut) {
    if (btn !== null) {
      if (pickedVisit === K.visit) return;
      pickedVisit = K.visit;
      stopLamp(); lampMemo.key = null;
      if (!lampOut) { const l = U.$("page").querySelector(".lamp"); if (l) l.remove(); }
      if (K.Sound) K.Sound.play("choose");
    }
    if (U.motion() && btn && !btn.classList.contains("chosen")) {
      U.keys([]);
      btn.classList.add("chosen");
      U.$("choices").querySelectorAll(".choice").forEach((o) => { if (o !== btn) o.classList.add("dismiss"); o.disabled = true; });
      setTimeout(() => pick(sc, c, null, lampOut), 420);
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
        if ((K.ENCOUNTERS[res.combat] || {}).dream) return U.wakeScene(o.text, () => (U.askMode ? U.askMode(() => K.go(o.next)) : K.go(o.next)));
        U.renderScene(sc);
        showAfter(sc, c, { text: o.text, after: res.after, check: null, pre: res.text, lampOut: res.lampOut, lostFight: outcome === "lose" ? res.combat : null, outcome: outcome === "win" || outcome === "spare" ? "win" : "lose" }, o.next);
      });
      return;
    }
    if (res.text || res.check || res.after || res.lampOut) return showAfter(sc, c, res, res.next);
    K.go(res.next);
  }
  U.pickChoice = pick;
  const KIND = { breath: "strength", aim: "archery", push: "strength", draw: "strength", steady: "strength", sneak: "stealth", retort: "wits", notice: "wits", hands: "wits", pasha: "wits", rhythm: "strength", race: "war", herd: "stealth", drill: "wits", rings: "wits", dash: "war",
    chaupar: "wits", baghchal: "wits", moksha: "wits", array: "war", formation: "war", escape: "stealth", fuse: "stealth" };
  U.TEST_KIND = KIND;
  const STAGE_FOR = { breath: "stage_forest_lake", aim: "stage_training_ground", push: "stage_training_ground", draw: "stage_bow_courtyard", steady: "stage_healers_hall", sneak: "stage_palace_corridor", retort: "stage_lotus_garden", notice: "stage_vidura_table",
    hands: "stage_dice_board_top", pasha: "stage_dice_board_top", rhythm: "stage_smithy", race: "stage_racetrack", herd: "stage_khandava_top", drill: "stage_training_ground", rings: "stage_chakravyuha_top", dash: "stage_chakravyuha_top", chaupar: "stage_board_table", baghchal: "stage_board_table",
    moksha: "stage_board_table", array: "stage_vyuha_top", formation: "stage_vyuha_top", escape: "stage_lac_fire_top", fuse: "stage_lac_cellar" };
  U.STAGE_FOR = STAGE_FOR;
  // A choice that is a test: the test takes the whole screen, on its own ground, and its outcome picks the branch.
  function playGame(sc, c) {
    if (c.trial && !c.trial.stage && STAGE_FOR[c.game]) c.trial.stage = STAGE_FOR[c.game];
    U.keys([]);
    if (K.Sound && K.Sound.test) K.Sound.test(c.game);
    const game = U.games[c.game](U.$("choices"), (outcome, summary) => {
      if (K.Sound && K.Sound.test) K.Sound.test(null);
      if (outcome === "win" && K.Sound && K.Sound.flourish) K.Sound.flourish((c.trial && c.trial.kind) || KIND[c.game] || "wits");
      else if (outcome !== "win" && K.Sound && !(c.trial && c.trial.practice)) K.Sound.play("lose");
      const res = K.choose(sc, c, outcome);
      if (res.peril === "death" && K.Sound) K.Sound.play("bell");
      res.pre = summary;
      const back = () => { if (!headless()) { D.scene(sc); D.tagsOn(true); U.layout("story"); } showAfter(sc, c, res, res.next); };
      if (G.ok && document.body.dataset.mode === "full") U.curtain(back); else back();
    }, c);
    if (game && game.draw) U.redraw = () => game.draw();
  }

  function showAfter(sc, c, res, next) {
    U.redraw = () => { U.renderScene(sc); showAfter(sc, c, res, next); };
    const pageKey = "after:" + sc.id + ":" + c.id, again = U.pageAgain(pageKey);
    pickedVisit = K.visit;
    stopLamp();
    const story = U.$("story"), box = U.$("choices");
    if (!story || !box) return K.go(next);
    U.$("page").querySelectorAll(".lamp").forEach((l) => l.remove());
    const picked = U.el('<div class="choice picked"><span class="k">·</span><span class="t">' + U.t(K.val(c.t)) + '</span><span class="fx">' + U.tr("Your choice") + "</span></div>");
    box.innerHTML = ""; box.classList.remove("two");
    [...story.children].forEach((el) => el.classList.add("past"));
    const added = [picked];
    story.appendChild(picked);
    if (res.pre || res.text || res.check || res.lampOut) {
      const r = res.check;
      added.push(story.appendChild(U.el('<div class="result">' +
        (r && r.word ? '<span class="roll">' + U.tr("Your word is enough. The court believes you without a test.") + "</span>" :
          r ? '<span class="roll">' + U.tr("{label}: rolled {roll}, total {total} against {dc}", { label: r.ch ? K.checkLabel(r.ch) : r.label, roll: r.roll, total: r.total, dc: r.dc }) + ' · <b class="' + (r.pass ? "pass" : "fail") + '">' + U.tr(r.pass ? "Success" : "Failure") + "</b></span>" : "") +
        (res.lampOut ? '<p class="aside">' + U.tr("The lamp went out before you chose.") + "</p>" : "") +
        (res.pre ? "<p>" + U.t(res.pre) + "</p>" : "") + (res.text ? "<p>" + U.t(res.text) + "</p>" : "") +
        (res.retry ? '<p class="aside retrynote">' + U.tr("One more try. Fail again, and this life ends here.") + "</p>" : "") + "</div>")));
    }
    if (res.after && K.S.alive) added.push(story.appendChild(U.el('<div class="witness"><div class="lbl">' + U.tr("And then, as it is written") + "</div>" + U.blocks(res.after) + "</div>")));
    let went = false;
    const go = () => {
      if (went) return; went = true;
      if (res.retry) { U.autoTry = sc.id; return K.go(next); }
      const moved = sc.travelAfter && K.S.alive && K.travel ? K.travel(sc, K.S, true) : null;
      if (moved && U.journeyPage && !headless()) return U.journeyPage(moved[0], moved[1], K.val(sc.travel) || ["Ahead: {what}", { what: "" }], () => K.go(next));
      K.go(next);
    };
    const cont = U.button("cta" + (res.retry ? " retry" : ""), U.tr(res.retry ? "Try again" : "Continue"), go, res.retry ? "btn-tryagain" : "btn-continue-story");
    box.appendChild(cont);
    U.$("keyhint").innerHTML = "";
    U.keys([]);
    const parts = [];
    for (const el of added) { if (el.classList.contains("witness") || el.classList.contains("result")) { el.dataset.hold = 250; parts.push(el, ...el.children); } else parts.push(el); }
    parts.push(cont);
    { const pb = res.lostFight && U.practiceAfterFight ? U.practiceAfterFight(res.lostFight) : null; if (pb) { box.appendChild(pb); parts.push(pb); } }
    const won = res.check ? res.check.pass : res.outcome ? res.outcome === "win" : null;
    const Dl = K.lastDelta || {};
    if (!again) {
      U.floatChanges();
      if (Dl.vowTaken) setTimeout(() => D.react("vow"), 400);
      else if ((Dl["duty.conscience"] || 0) <= -2) setTimeout(() => D.react("shame"), 400);
      else if (won === null && ((Dl["duty.teacher"] || 0) > 0 || Object.keys(Dl).some((k) => k.startsWith("bond.") && Dl[k] >= 2))) setTimeout(() => D.react("fold"), 400);
      else if (won !== null) setTimeout(() => D.react(won ? "win" : "lose"), 400);
      // Whoever the result speaks of comes on if they were not here already.
    }
    U.pageShown(pageKey);
    U.stage(parts, () => { U.toEnd(story, true); U.keys([go]); try { cont.focus({ preventScroll: true }); } catch (e) { /* older browsers */ } }, again);
    if (U.playMoments) U.playMoments();
  }
  U.showAfter = showAfter;

  // =====================================================================================================
  // Moments: the milestones of a life get a few seconds of their own, on stage
  // =====================================================================================================
  const TEACHER_LINE = { drona: "\"Your arrow is mine now, and so is your fee, when I ask for it.\"", kripa: "\"Sweep the practice ground. Tomorrow we begin.\"", balarama: "\"Lift it again. Again. Good. You will do.\"", hermit: "\"Never say who taught you. That is the only fee.\"", vidura: "\"Notice everything. Say half of it.\"" };
  const FRIEND_LINE = { arjuna: "You hit his swinging lamp in the dark when you were ten.", bhima: "You put him in the river when you were ten. He has never stopped telling people.", duryodhana: "You stood your ground in front of his brothers when you were ten.", karna: "You calmed a maddened horse beside him when you were ten.", charu: "You chose each other when you were ten." };
  K.momentInfo = function (m, S = K.S) {
    switch (m.kind) {
      case "friend": return { theme: "friend", title: ["A friend for life: {who}", { who: K.PEOPLE[m.who].name }], line: FRIEND_LINE[m.who] || "", art: null, portrait: U.portraitKey(m.who), with: m.who };
      case "farewell": return { theme: "farewell", title: ["A friendship ends: {who}", { who: K.PEOPLE[m.who].name }], line: (K.FAREWELLS || {})[m.who] || "", art: null, portrait: U.portraitKey(m.who), grey: true, leaves: m.who };
      case "teacher": return { theme: "milestone", title: ["Your teacher: {who}", { who: (K.TEACHERS[m.who] || {}).short || m.who }], line: TEACHER_LINE[m.who] || "", art: "scene_teacher", teacher: TEACHER_ID[m.who] || m.who };
      case "marriage": return { theme: "milestone", title: ["Married: {who}", { who: K.PEOPLE[m.who] ? K.PEOPLE[m.who].name : (m.who ? K.personName(m.who, S) : "") }], line: "Seven steps around the fire, and the rest of your life to keep them.", art: "moment_marriage", wed: m.who };
      case "astra": {
        const g = (K.ASTRA_GIVERS || {})[m.from] || {}, A = (m.which ? K.ASTRAS && K.ASTRAS[m.which] : K.INDRA) || K.INDRA;
        return { theme: "astra", title: A ? ["The {name}", { name: A.name }] : "A divine weapon", line: g.cond ? ["Given by {who}, on one condition: “{cond}”", { who: g.who, cond: g.cond }] : "The mantra is yours now, and so is every place it lands.",
          sub: A ? A.mantra : "The mantra is yours now, and so is every place it lands.", art: "stage_shiva_mountain", astra: true };
      }
      case "vow": { const V = K.VOWS[m.id] || {}, w = K.watcherNames(m.id, S);
        return { theme: V.theme || "milestone", title: ["A vow: {vow}", { vow: V.name }], line: V.keep || V.gift, watch: w ? ["Watched by {who}", { who: w }, true] : null, price: V.price ? ["Broken: {price}", { price: V.price }] : null, art: null, place: V.place || "scene_vow", emblem: "vow_" + m.id, vow: true }; }
      case "crossed": return { theme: "crossed", title: "The one who crossed", line: "Yudhishthira's call was still in the air when you walked into it.", art: "scene_yuyutsu_crossing" };
      case "company": return { theme: "milestone", title: "A company of your own", line: "They are yours to command, and yours to bring home.", art: "scene_command_banner", place: null, emblem: null, company: true };
      default: return K.MOMENT_KINDS && K.MOMENT_KINDS[m.kind] ? K.MOMENT_KINDS[m.kind](m, S) : null;
    }
  };
  K.momentTitle = (m, S) => { const i = K.momentInfo(m, S); return i ? K.text(i.title, null, S) : ""; };
  K.momentThumb = (m) => { const i = K.momentInfo(m); return i ? i.art || i.portrait || i.emblem || i.place : null; };
  let playing = null;
  U.playMoments = function (done) {
    const q = K.momentQueue.splice(0).filter((m) => (K.S.moments || []).includes(m));
    if (!q.length || headless()) return false;
    if (playing) { playing.q.push(...q); if (done) playing.dones.push(done); return true; }
    const modeWas = document.body.dataset.mode, sceneWas = D.sceneNow, pageHtml = U.$("page");
    const run = (playing = { q, dones: done ? [done] : [] });
    pageHtml.style.visibility = "hidden";
    const finish = () => {
      playing = null; pageHtml.style.visibility = "";
      const back = () => { if (sceneWas && G.ok) { D.scene(sceneWas, { force: true, intro: false }); D.tagsOn(true); } U.layout(modeWas); run.dones.forEach((f) => f()); };
      U.curtain(back);
    };
    const next = () => { const m = run.q.shift(); if (!m) return finish(); showMoment(m, next); };
    U.curtain(next);
    return true;
  };
  function showMoment(m, after) {
    const S = K.S, info = K.momentInfo(m, S);
    if (!info) return after();
    const el = U.el('<div class="beat moment3d" role="dialog" aria-modal="true"><div class="mo-card' + (info.grey ? " grey" : "") + '"><i class="b-orn" aria-hidden="true"></i><b class="mo-title">' + U.t(info.title) + "</b>" + (info.line ? '<p class="mo-line">' + U.t(info.line) + "</p>" : "") +
      (info.watch ? '<p class="mo-sub">' + U.t(info.watch) + "</p>" : "") + (info.price ? '<p class="mo-sub down">' + U.t(info.price) + "</p>" : "") + (info.astra && info.sub && info.line !== info.sub ? '<p class="mo-sub">' + U.t(info.sub) + "</p>" : "") +
      '</div><span class="mo-tap">' + U.tr("Tap to go on") + "</span></div>");
    document.body.appendChild(el);
    if (K.Sound && K.Sound.moment) K.Sound.moment(info.theme);
    const offs = [];
    if (G.ok) {
      U.layout("full");
      const sceneKey = D.sceneNow ? artFor(D.sceneNow) : "origin";
      const key = info.art || info.place || sceneKey;
      const other = info.with || info.leaves || info.teacher || info.wed || null;
      const people = [{ id: "me", at: [-0.55, 0.4, Math.PI / 2], tag: false, pose: info.astra ? "stand" : info.vow ? "kneel" : "stand" }];
      if (other) people.push({ id: other, at: [0.55, 0.4, -Math.PI / 2], tag: false });
      if (info.company) for (let i = 0; i < 4; i++) people.push({ id: "soldier", at: [-2.2 + i * 1.5, -1.6, 0.1], tag: false, pose: i % 2 ? "readySpear" : "stand" });
      D.show(key, people, { tags: false, dist: 5.2, sky: info.astra ? "night" : info.grey ? "dusk" : undefined, force: true, intro: false });
      D.base.look.set(0, 1.25, 0.4); D.base.rad = 2.1; D.base.yaw = 0.35; D.base.pitch = 0.1; D.zoom = 1.35;
      const off = G.onFrame((dt) => { D.zoom = Math.max(1, D.zoom - dt * 0.05); }); offs.push(off);
      const me = D.figs.get("me"), ot = other ? D.figs.get(other) : null;
      const later = (ms, f) => { const id = setTimeout(f, U.calm() ? ms * 0.4 : ms); offs.push(() => clearTimeout(id)); };
      if (info.with && me && ot) later(1300, () => { me.pose("clasp"); ot.pose("clasp"); G.fx.burst("light", new T.Vector3(0, 1.2, 0.4), { n: 22, s: 1.2 }); G.fx.ring(new T.Vector3(0, 0, 0.4), 0xffd890, 0.4, 3.4, 1.4); });
      if (info.leaves && ot) later(1200, () => { ot.turnTo(Math.PI / 2 + 0.2); ot.speed = 1.2; const o2 = G.onFrame((dt) => { ot.root.position.x += 1.1 * dt; }); offs.push(o2); if (me) me.pose("slump"); });
      if (info.teacher && me && ot) later(900, () => { me.pose("namaste"); ot.talk = true; ot.pose("point"); });
      if (info.wed && me && ot) { me.pose("namaste"); ot.pose("namaste"); later(600, () => G.fx.burst("ember", new T.Vector3(0, 0.6, -0.6), { n: 18 })); }
      if (info.vow && me) later(900, () => { me.pose("namaste"); G.fx.burst("light", me.chest(), { n: 18 }); G.fx.ring(me.root.position, 0xfff0b0, 0.3, 2.6, 1.2); });
      if (info.astra && me) {
        later(900, () => { me.pose("cast"); const p = me.root.position; G.fx.beam(new T.Vector3(p.x, 0, p.z), new T.Vector3(p.x, 30, p.z), 0xfff0b0, 0.5, 2.6); G.fx.ring(p, 0xffd060, 0.5, 6, 1.6); G.shake(0.12, 0.6); });
        later(1700, () => { G.fx.burst("light", me.tip(), { n: 34, s: 1.6 }); G.fx.flash("rgba(255,240,190,.55)", 700); });
      }
      if (info.company) later(700, () => { for (const f of D.list) if (f !== me) f.pose("cheer"); if (me) me.pose("point"); });
      if (!other && !info.astra && !info.vow && !info.company && me) me.pose("stand");
    }
    let gone = false; const t0 = performance.now();
    const close = () => { if (gone) return; gone = true; clearTimeout(timer); offs.forEach((f) => f()); window.removeEventListener("keydown", key, true); el.classList.add("gone"); setTimeout(() => { el.remove(); after(); }, U.calm() ? 0 : 300); };
    const key = (e) => { e.stopPropagation(); if ([" ", "Enter", "Escape", "ArrowRight"].includes(e.key)) { e.preventDefault(); if (performance.now() - t0 > 500) close(); } };
    window.addEventListener("keydown", key, true);
    el.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); if (performance.now() - t0 > 500) close(); });
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
    const timer = setTimeout(close, U.calm() ? 6000 : info.ms || (info.astra ? 8200 : 7200));
  }

  // ---------- Orders for the day: the commander's words before each day of the war you reach ----------
  function showOrders(day, sc) {
    const O = K.ORDERS, S = K.S, info = O.info(day, S);
    const li = (s) => "<li>" + U.esc(K.text(s, null, S)) + "</li>";
    const html = '<div class="person">' + U.face(info.chief.who, "big") + "<div><b>" + U.tr(info.chief.name) + '</b><div class="muted small">' + U.tr(info.chief.title) + "</div></div></div>" +
      "<h3>" + U.tr(info.head) + '</h3><ul class="ord-list">' + (info.more ? "<li>…</li>" : "") + info.since.map(li).join("") + "</ul>" +
      (info.mine.length ? "<p><b>" + U.tr("Your part") + "</b> " + info.mine.map((j) => U.esc(K.entryText(j, S))).join(" ") + "</p>" : "") +
      (info.aim ? "<h3>" + U.tr("Today") + "</h3><p>" + U.esc(K.text(info.aim, null, S)) + "</p>" : "") +
      (info.you ? "<h3>" + U.tr("Your orders") + "</h3><p>" + U.esc(K.text(info.you, null, S)) + "</p>" : "") +
      '<div class="btnrow"><button type="button" class="cta ord-go">' + U.tr("To your place") + "</button></div>";
    U.openModal(K.tr("Orders · Day {n}", { n: day }), html, (el) => { el.querySelector(".ord-go").addEventListener("click", U.closeModal); }, "orders");
    U.onModalClose = () => { O.given(day, S); if (K.save) K.save(); };
    if (K.Sound) K.Sound.play("conch");
    void sc;
  }
  U.ordersOpen = () => !!document.querySelector(".modal.orders");

  U.initStory = function () { if (!G.ok) return; G.onFrame((dt, t) => D.frame(dt, t)); wireOrbit(); };
})(window.K = window.K || {});
