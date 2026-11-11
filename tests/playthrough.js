/* Automated playthroughs (Project Plan §6.3, "automated tests for branching").
   Plays N random lives through the real UI in a headless DOM and reports
   crashes, dead ends, content problems and the spread of endings.
   Usage: npm install && npm test            (default 300 lives)
          node tests/playthrough.js 1000 --story
          node tests/playthrough.js 50 --from 51   (lives 51-100 of a longer run)
          By default the real-time fights (PRD §18.15) are played by engine/realtime.js's bot, which
          spares a beaten foe now and then; RT=0 node tests/playthrough.js 20 (or --turns) plays every fight on the turns */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const N = parseInt(process.argv[2] || "300", 10);
const STORY = process.argv.includes("--story");
const RTM = process.env.RT !== "0" && !process.argv.includes("--turns"); // real-time by default (RT=0 or --turns: every fight on the turns)
const GAME = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(GAME, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
// Language dictionaries load on demand in the browser; the harness loads them all up front.
scripts.splice(scripts.indexOf("js/ui/dom.js"), 0, "js/i18n/hi.js");

let lastWindow = null; // closed after each life, so a long run does not keep every life's page in memory
function boot(seed) {
  const vc = new VirtualConsole();
  const jsErrors = [];
  vc.on("jsdomError", (e) => jsErrors.push(e.detail && e.detail.stack ? e.detail.stack : String(e.message || e)));
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ""), { runScripts: "outside-only", pretendToBeVisual: true, url: "https://localhost/", virtualConsole: vc });
  const w = dom.window;
  lastWindow = w;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  let s = seed >>> 0;
  w.Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const errors = [];
  w.console.warn = (m) => errors.push("warn: " + m);
  for (const src of scripts) w.eval(fs.readFileSync(path.join(GAME, src), "utf8"));
  w.K.headless = true;
  w.K.seed(seed);
  w.K.RT.force = RTM; if (RTM) w.K.UI.rtBotOptions = { spare: 0.3 };
  return { w, d: w.document, errors, jsErrors };
}

// Every test played in this life, from the log: [act, scene id, choice id] for each game choice.
function testsOf(K) {
  const out = [];
  for (const e of K.S.log) {
    const [sid, cid] = e.split(":"), sc = K.SCENES[sid];
    if (!sc) continue;
    const c = (K.val(sc.choices, K.S) || []).find((x) => x.id === cid);
    if (c && c.game && !(c.trial && c.trial.practice)) out.push([sc.act, sid.replace(/_again$/, ""), cid, /_again$/.test(sid)]);
  }
  return out;
}

function rnd(w, arr) { return arr[Math.floor(w.Math.random() * arr.length)]; }

function playLife(seed) {
  const { w, d, errors, jsErrors } = boot(seed);
  const K = w.K;
  const problems = K.validate();
  // Every fourth life remembers a past one from the Book of Lives.
  const reborn = seed % 4 === 0;
  if (reborn) {
    w.localStorage.setItem("kurukshetra.v2.lives", JSON.stringify([{ at: "2026-10-01T10:00:00.000Z", me: { name: "Ira", pronoun: "she", origin: "panchala", teacher: "drona", path: "archer", spouse: "revat", friend: "charu", court: "panchala", child: "vasu" },
      title: "Beside Karna", art: "war_day17", alive: false, age: 44, side: "kaurava", telling: ["They sing of {name}, born in {origin}."], kept: false, broke: true, karna: true, teller: false, conscience: 4 }]));
    K.UI.renderTitle();
  }
  // Create a character through the real creation screen.
  d.getElementById("btn-new").click();
  const pickOpt = (sel) => rnd(w, [...d.querySelectorAll(sel)]).click();
  pickOpt("#origins .origin"); d.getElementById("land-ok").click();
  pickOpt("#pron .opt"); pickOpt("#temps .pick"); pickOpt("#heirs .pick");
  if (reborn) [...d.querySelectorAll("#pasts .pick")].pop().click();
  if (STORY) { const s = d.getElementById("story"); s.checked = true; s.dispatchEvent(new w.Event("change")); }
  d.getElementById("begin").click();

  const path_ = [];
  const fights = [];
  const moves = [];
  const tv = K.travel; K.travel = (sc, S) => { S = S || K.S; const m = tv(sc, S); if (m) moves.push(sc.id + (sc.travel ? "" : " (no line)") + " " + m[0] + ">" + m[1]);
    // The map must agree with the story: a scene that names a town shows the marker on it.
    const named = sc.away || sc.travelAfter ? null : K.locOf(String(K.val(sc.place, S) || ""), S);
    if (named && named !== S.at) errors.push("warn: map: " + sc.id + " names " + named + " but the marker is on " + S.at);
    return m; };
  K.on("combat", (B) => { if (B.over && !B._counted) { B._counted = true; fights.push([B.enc.id, B.over]); } });
  for (let step = 0; step < 4000; step++) {
    if (d.getElementById("again")) {
      const book = K.lives();
      if (!book.length || book[0].title !== K.S.ending) errors.push("warn: the Book of Lives did not record this life");
      if (reborn && !K.S.flags.includes("reborn")) errors.push("warn: rebirth did not apply");
      return { fights, ending: K.S.ending, alive: K.S.alive, age: K.S.age, path: path_, errors, problems, side: K.S.side, steps: step, seen: K.S.seen, flags: K.S.flags, road: K.S.road || [], moves, tests: testsOf(K), loops: (K.S.loops || []).length, crossed: K.S.crossed || {},
        moments: K.S.moments || [], broken: K.S.vows.filter((v) => v.broken && !v.released).length, penance: !!K.S.penanceDone, astraBroken: !!(K.S.astra && K.S.astra.broken) };
    }
    const acts = [...d.querySelectorAll("#battle-actions .act:not([disabled])")];
    const cta = [...d.querySelectorAll("#leaf .cta")].filter((b) => !b.disabled);
    const choices = [...d.querySelectorAll("#choices .choice:not([disabled])")].filter((b) => !b.classList.contains("picked"));
    if (jsErrors.length) return { crash: jsErrors[0], scene: K.S.scene, path: path_, errors, problems };
    try {
      if (acts.length) {
        // A sensible-ish player: specials when ready, herbs when hurt, otherwise strike.
        const p = K.Combat.player();
        const herbs = acts.find((a) => a.textContent.includes("Healing herbs"));
        const special = acts.filter((a) => a.classList.contains("special"));
        const choice = p && p.hp < p.maxHp * 0.35 && herbs ? herbs : special.length && w.Math.random() < 0.6 ? rnd(w, special) : acts[0];
        choice.click();
      } else if (choices.length) {
        const c = rnd(w, choices);
        path_.push(K.S.scene + ":" + c.id.replace("choice-", ""));
        c.click();
      } else if (cta.length) {
        cta[0].click();
      } else {
        return { stuck: true, scene: K.S.scene, html: d.getElementById("leaf").innerHTML.slice(0, 400), path: path_, errors, problems };
      }
    } catch (e) {
      return { crash: e.stack || String(e), scene: K.S.scene, path: path_, errors, problems };
    }
  }
  return { stuck: true, scene: K.S.scene, reason: "step limit", path: path_, errors, problems };
}

const results = [];
// --from K: lives K..K+N-1 (default 1), so a long run can be split across processes: each closed page still keeps about
// 25 MB alive in jsdom, and 300 lives in one process run out of memory (tests/run.js plays them in parts of 50).
const FROM = Math.max(1, parseInt((process.argv[process.argv.indexOf("--from") + 1] || "1"), 10) || 1);
for (let i = FROM; i < FROM + N; i++) { results.push(playLife(i * 7919)); try { lastWindow.close(); } catch (e) { /* ignore */ } }
const crashes = results.filter((r) => r.crash);
const stuck = results.filter((r) => r.stuck);
const ends = {};
const sides = {};
results.filter((r) => r.ending).forEach((r) => { ends[r.ending] = (ends[r.ending] || 0) + 1; sides[r.side || "none"] = (sides[r.side || "none"] || 0) + 1; });
const warn = new Set(results.flatMap((r) => r.errors || []));
const problems = results[0] && results[0].problems || [];

console.log("Lives played:     " + N + (STORY ? " (story mode)" : "") + (RTM ? " (real-time fights)" : ""));
console.log("Reached an end:   " + results.filter((r) => r.ending).length);
console.log("Crashes:          " + crashes.length);
console.log("Stuck:            " + stuck.length);
console.log("Content problems: " + problems.length);
problems.slice(0, 20).forEach((p) => console.log("  - " + p));
console.log("Endings:");
Object.entries(ends).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log("  " + k.padEnd(28) + String(v).padStart(4) + "  " + Math.round((v / N) * 100) + "%"));
console.log("Sides in the war: " + JSON.stringify(sides));
// Ending spread (PRD §19): a wide spread means the choices matter. No one ending may take most lives.
const topEnding = Math.max(0, ...Object.values(ends)), narrow = N >= 20 && (topEnding > N * 0.5 || Object.keys(ends).length < 5);
console.log("Ending spread:    " + Object.keys(ends).length + " endings, the most common " + Math.round((topEnding / N) * 100) + "%" + (narrow ? " (too narrow)" : ""));
{ const fl2 = (f) => results.filter((r) => (r.flags || []).includes(f)).length; // war storylines (PRD 18.13): Yuyutsu's call
  console.log("Yuyutsu's call: met " + results.filter((r) => (r.seen || []).includes("cross_call")).length + ", crossed " + fl2("crossed_lines") + ", called across " + fl2("called_across") + " (came " + fl2("called_across_came") + "), duel won " + fl2("won_crossing_duel") + ", spared " + fl2("spared_crossing_duel") + ", lost " + fl2("lost_crossing_duel")); }
const fstat = {};
results.forEach((r) => (r.fights || []).forEach(([id, o]) => { fstat[id] = fstat[id] || { win: 0, lose: 0, flee: 0, spare: 0 }; fstat[id][o]++; }));
console.log("Battles (win / lose / flee / spare):");
Object.entries(fstat).forEach(([id, f]) => console.log("  " + id.padEnd(14) + [f.win, f.lose, f.flee, f.spare].join(" / ")));
const evs = {};
results.forEach((r) => (r.seen || []).forEach((id) => { if (/^ev_|^v_|^cmd_|^hold_|^w_|^ep_|^a1_pasha$|^a5_charu$|^a7_note$/.test(id)) evs[id] = (evs[id] || 0) + 1; }));
// Moments and vows (PRD §18.12): how often each kind of moment came, and what vows cost.
const mos = {};
results.forEach((r) => (r.moments || []).forEach((m) => { mos[m.kind] = (mos[m.kind] || 0) + 1; }));
console.log("Moments: " + Object.entries(mos).sort().map(([k, v]) => k + " " + v).join(", ") + "; vows broken " + results.reduce((a, r) => a + (r.broken || 0), 0) + ", penances " + results.filter((r) => r.penance).length + ", weapons taken back " + results.filter((r) => r.astraBroken).length);
console.log("Events and new scenes seen: " + Object.entries(evs).sort().map(([k, v]) => k + " " + v).join(", "));
const fl = (f) => results.filter((r) => (r.flags || []).includes(f)).length;
console.log("Dice: learned " + fl("learned_pasha") + ", beat Haridatta " + fl("beat_haridatta") + ", watched Shakuni " + fl("watched_hands") + ", saw the swap " + fl("saw_swap") + "; Nishada came " + fl("nishada_came") + "; reborn " + fl("reborn"));
const deaths = results.filter((r) => r.ending && !r.alive);
console.log("Died in the war:  " + deaths.length);
console.log("Perils: died " + fl("peril_death") + " (" + deaths.filter((r) => (r.flags || []).includes("peril_death") && !(r.seen || []).some((id) => /^a6_/.test(id))).length + " before the war), locked away " + fl("was_imprisoned") +
  " (escaped " + fl("escaped_captivity") + ", waited " + fl("waited_out_captivity") + ")");
{ const roads = results.filter((r) => r.road); const avg = roads.reduce((n, r) => n + r.road.length, 0) / (roads.length || 1);
  const stops = {}; for (const r of roads) for (const k of new Set(r.road)) stops[k] = (stops[k] || 0) + 1;
  console.log("Map: " + avg.toFixed(1) + " places per life; lives that reached each: " + Object.entries(stops).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + " " + n).join(", "));
  if (roads[0]) console.log("  e.g. " + roads[0].road.join(" > "));
  if (process.argv.includes("--moves")) { const mv = {}; for (const r of results) for (const m of r.moves || []) mv[m] = (mv[m] || 0) + 1;
    console.log("Moves (scene, from>to):"); Object.entries(mv).sort((a, b) => b[1] - a[1]).forEach(([m, n]) => console.log("  " + n + "  " + m)); } }
{ const n = (f) => results.filter((r) => r.flags && r.flags.includes(f)).length;
  console.log("Act I tests: practice hit " + n("first_throw") + "; friendship won lamp " + n("hit_the_lamp") + ", river " + n("threw_bhima") + ", horse " + n("calmed_the_horse") + ", nerve " + n("stood_your_ground") +
    "; second chances " + ["second_arjuna", "second_bhima", "second_duryo", "second_karna"].map(n).reduce((a, b) => a + b, 0) +
    ", failed twice " + ["missed_lamp_twice", "thrown_by_bhima_twice", "horse_beat_you_twice", "backed_down_twice"].map(n).reduce((a, b) => a + b, 0) +
    "; chose Charu " + n("chose_charu") + ", Ugra beaten " + n("beat_ugra") + ", Ugra twice " + n("ugra_twice")); }
{ // Tests: how many each life plays per act (second chances counted apart), and the loop-backs.
  const by = {}, kinds = {};
  for (const r of results) {
    const per = {};
    for (const [act, sid, cid, again] of r.tests || []) {
      if (!again) per[act] = (per[act] || 0) + 1;
      const k = sid + (again ? " (2nd)" : "");
      kinds[k] = (kinds[k] || 0) + 1;
    }
    for (let a = 1; a <= 7; a++) (by[a] = by[a] || []).push(per[a] || 0);
  }
  const R = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
  console.log("Tests per life by act (average, min-max): " + [1, 2, 3, 4, 5, 6, 7].map((a) => R[a] + " " + (by[a].reduce((x, y) => x + y, 0) / results.length).toFixed(1) + " (" + Math.min(...by[a]) + "-" + Math.max(...by[a]) + ")").join(", "));
  console.log("Loop-backs: " + results.reduce((n, r) => n + (r.loops || 0), 0) + " in " + results.length + " lives; crossed out: " + results.flatMap((r) => Object.entries(r.crossed || {}).flatMap(([s2, o]) => Object.keys(o).map((c) => s2 + ":" + c))).join(", "));
  console.log("Test scenes: " + Object.entries(kinds).sort((x, y) => y[1] - x[1]).map(([k, n]) => k + " " + n).join(", ")); }
if (warn.size) { console.log("Warnings:"); [...warn].slice(0, 10).forEach((x) => console.log("  " + x.slice(0, 300))); }
crashes.slice(0, 3).forEach((c) => console.log("\nCRASH at " + c.scene + "\n" + c.crash.split("\n").slice(0, 6).join("\n") + "\npath: " + c.path.slice(-5).join(" > ")));
stuck.slice(0, 3).forEach((c) => console.log("\nSTUCK at " + c.scene + " " + (c.reason || "") + "\n" + (c.html || "") + "\npath: " + c.path.slice(-5).join(" > ")));
process.exit(crashes.length || stuck.length || problems.length || narrow ? 1 : 0);
