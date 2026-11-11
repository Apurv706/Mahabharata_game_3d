/* Lives forced across the field (war storyline #1, content/war_crossing.js). Random lives through the
   engine alone, as tests/lives.js plays them, except that every life fights for the Kauravas and most
   cross at Yuyutsu's call on the first morning, a fight with their own line (cross_e_escape: won seven times in ten
   here; beaten, they are dragged back and stay Kaurava, marked). Checks, for those who cross:
   - no dead end: every life reaches an ending, nothing throws, no {token} is left unfilled;
   - nothing for the old side again: no choice that only a Kaurava could take, no scene that only a
     Kaurava could meet;
   - every way of proving yourself to the new side is reached (the duel, a spared man explained, the truth
     before Yudhishthira, the spy caught), and so is staying suspected for the war;
   - the map marker stands in the Pandava camp for every scene at Kurukshetra after the crossing;
   - the endings stay spread;
   - one dragged back stays a Kaurava, marked (tried_to_cross), never crossed.
   Usage: node tests/crossing.js [lives=200] [seed=1] */
const fs = require("fs");
const path = require("path");
const G = path.join(__dirname, "..");
global.window = global; global.K = {};
const html = fs.readFileSync(path.join(G, "index.html"), "utf8");
for (const src of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((s) => /js\/(engine|content)\//.test(s))) {
  (0, eval)(fs.readFileSync(path.join(G, src), "utf8") + "\n//# sourceURL=" + src);
}
K.UI = { esc: (s) => s };
(0, eval)(fs.readFileSync(path.join(G, "js/ui/map.js"), "utf8"));
K.save = () => true;

const N = parseInt(process.argv[2] || "200", 10), SEED = parseInt(process.argv[3] || "1", 10);
const problems = new Map();
const add = (k, v) => { const m = problems.get(k) || new Map(); m.set(v, (m.get(v) || 0) + 1); problems.set(k, m); };
const pick = (a) => a[Math.floor(K.rng() * a.length)];
const TOK = /\{(\w+)(!?)(?::[^}]*)?\}/;
const txt = (s, where) => { if (s == null || s === "") return; let out; try { out = K.text(s); } catch (e) { add("text throws", where + ": " + e.message); return; } if (typeof out === "string" && TOK.test(out)) add("unfilled token", where + ": " + out.slice(0, 120)); };
const blocks = (b, where) => { for (const x of [].concat(K.val(b) || []).filter(Boolean)) { if (typeof x === "string" || Array.isArray(x)) txt(x, where); else if (x.line) txt(x.line, where); else if (x.memory) txt(x.memory, where); else if (x.aside) txt(x.aside, where); } };
// Only a Kaurava could meet it: true with the side set to "kaurava", false with "pandava".
const as = (S, side) => Object.assign({}, S, { side });
const kauravaOnly = (cond, S) => { if (!cond) return false; try { return K.test(cond, as(S, "kaurava")) && !K.test(cond, as(S, "pandava")); } catch (e) { return false; } };

const PROOF = ["proven_duel", "proven_spared", "proven_truth", "proven_spy", "suspected_war"];
const T = { proof: {}, lives: 0, ended: 0, kaurava: 0, crossed: 0, stayed: 0, dragged: 0, duel: { win: 0, spare: 0, lose: 0 }, called: 0, rank: 0, endings: {}, crossEnd: {} };
for (let i = 0; i < N; i++) {
  K.seed(SEED * 100003 + i * 7);
  const S = (K.S = K.newLife());
  if (K.momentQueue) K.momentQueue.length = 0;
  S.name = "Ira"; S.pronoun = pick(["she", "he", "they"]);
  S.origin = pick(Object.keys(K.ORIGINS)); S.temperament = pick(Object.keys(K.TEMPERAMENTS)); S.heirloom = pick(Object.keys(K.HEIRLOOMS));
  // A third of lives play the duel at random, a third spare the man sent, a third lose it in story mode
  // and live: so every later way of proving yourself is exercised.
  const mode = i % 3;
  S.storyMode = mode === 2 || K.rng() < 0.15;
  K.apply(K.ORIGINS[S.origin].fx); K.apply(K.TEMPERAMENTS[S.temperament].fx); K.apply(K.HEIRLOOMS[S.heirloom].fx);
  K.apply({ flag: ["origin_" + S.origin, "temper_" + S.temperament, "heir_" + S.heirloom] });
  T.lives++;
  try { K.go(K.FIRST_SCENE); } catch (e) { add("throws", "start: " + e.message); continue; }
  let ended = false;
  for (let steps = 0; steps < 700; steps++) {
    const sc = K.SCENES[K.S.scene];
    const crossed = K.S.flags.includes("crossed_lines") && sc.id !== "cross_call";
    if (sc.ending) {
      ended = true; T.ended++;
      for (const f of PROOF) if (K.S.flags.includes(f)) T.proof[f] = (T.proof[f] || 0) + 1;
      try { const e = sc.ending(K.S); (e.telling || []).forEach((l) => txt(l, "telling")); (e.fates || []).forEach((l) => txt(l, "fates"));
        T.endings[e.title] = (T.endings[e.title] || 0) + 1; if (K.S.flags.includes("crossed_lines")) T.crossEnd[e.title] = (T.crossEnd[e.title] || 0) + 1; } catch (e) { add("throws", sc.id + ".ending: " + e.message); }
      break;
    }
    try { blocks(sc.body, sc.id + ".body"); blocks(sc.witness, sc.id + ".witness"); } catch (e) { add("throws", sc.id + ".body: " + e.message); }
    if (crossed && K.S.act === 6) {
      if (kauravaOnly(sc.when, K.S)) add("old side's scene after crossing", sc.id);
      const place = String(K.val(sc.place, K.S) || ""), loc = /Kurukshetra/.test(place) ? K.locOf(place, K.S) : null;
      if (loc && loc !== "camp_pandava") add("map marker not in the Pandava camp", sc.id + " " + loc);
    }
    const list = K.choiceList(sc).filter((x) => x.ok);
    if (crossed) for (const x of list) if (kauravaOnly(x.c.req, K.S)) add("old side's choice after crossing", sc.id + ":" + x.c.id);
    if (!list.length) { add("no choice available", sc.id); break; }
    const ids = list.map((x) => x.c.id);
    let c;
    if (ids.includes("kaurava") && ids.includes("pandava")) c = list.find((x) => x.c.id === "kaurava").c; // every life fights for the Kauravas
    else if (sc.id === "cross_call" && ids.includes("cross")) { const want = K.rng() < 0.85 ? "cross" : "stay"; c = list.find((x) => x.c.id === want).c; }
    else c = pick(list).c;
    if (sc.id === "cross_call") { if (K.S.side === "kaurava") { T.kaurava++; if (c.id !== "cross") T.stayed++; } if (c.id === "call") T.called++; }
    let res;
    try { res = c.game ? K.choose(sc, c, pick(["win", "close", "lose"])) : K.choose(sc, c); } catch (e) { add("throws", sc.id + ":" + c.id + ": " + e.message); break; }
    txt(res.text, sc.id + ":" + c.id + " result");
    let next = res.next;
    if (res.combat) {
      const enc = K.ENCOUNTERS[res.combat];
      // The duel between the lines by the life's mode; the rest at even odds.
      const roll = K.rng(), out = res.combat === "cross_e_duel" ? (mode === 1 ? "spare" : mode === 2 ? "lose" : roll < 0.55 ? "win" : roll < 0.75 ? "spare" : "lose")
        : res.combat === "cross_e_escape" ? (roll < 0.7 ? "win" : "lose") : roll < 0.55 ? "win" : "lose";
      if (res.combat === "cross_e_duel") T.duel[out]++;
      if (enc.callHelp) { try { const h = enc.callHelp(K.S); txt(h && h.text, res.combat + ".callHelp"); } catch (e) { add("throws", res.combat + ".callHelp: " + e.message); } }
      let r;
      try { r = K.combatOutcome(res.combat, out, res.next); } catch (e) { add("throws", res.combat + " outcome: " + e.message); break; }
      txt(r.text, res.combat + " result");
      next = r.next;
      if (res.combat === "cross_e_duel" && K.S.flags.includes("company_given_back")) T.rank++;
      if (res.combat === "cross_e_escape") {
        const f = K.S.flags, ok = out === "win" ? K.S.side === "pandava" && f.includes("crossed_lines") && !f.includes("tried_to_cross")
          : K.S.side === "kaurava" && f.includes("tried_to_cross") && !f.includes("crossed_lines");
        if (!ok) add("the crossing fight's outcome", out + ": side " + K.S.side);
        T[out === "win" ? "crossed" : "dragged"]++;
      }
    }
    if (!K.S.alive) next = "end_death";
    try { K.go(next); } catch (e) { add("throws", sc.id + ":" + c.id + " -> " + next + ": " + e.message); break; }
  }
  if (!ended) add("did not end", K.S.scene);
}
const spread = (o) => { const n = Object.values(o).reduce((a, b) => a + b, 0), top = Math.max(0, ...Object.values(o)); return { kinds: Object.keys(o).length, top: n ? Math.round((top / n) * 100) : 0 }; };
const all = spread(T.endings), cr = spread(T.crossEnd);
if (all.kinds < 5 || all.top > 50) add("endings too narrow", JSON.stringify(T.endings));
for (const f of PROOF) if (N >= 100 && !T.proof[f]) add("never reached", f);
if (T.crossed && (cr.kinds < 4 || cr.top > 60)) add("crossers' endings too narrow", JSON.stringify(T.crossEnd));
let bad = 0;
for (const [k, m] of problems) { bad += [...m.values()].reduce((a, b) => a + b, 0); console.log("✗ " + k + " (" + m.size + " kinds)"); [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([v, n]) => console.log("    " + n + "× " + v)); }
if (N >= 100 && !T.dragged) add("never reached", "dragged back from the crossing");
console.log(T.lives + " lives, " + T.ended + " reached an ending; " + T.kaurava + " on the Kaurava side at the call, " + T.crossed + " crossed, " + T.dragged + " dragged back by their own line, " + T.stayed + " stayed");
console.log("Duel between the lines: won " + T.duel.win + ", spared " + T.duel.spare + ", lost " + T.duel.lose + "; a company given back " + T.rank);
console.log("Proving yourself: " + PROOF.map((f) => f.replace("_", " ") + " " + (T.proof[f] || 0)).join(", "));
console.log("Endings (" + all.kinds + " kinds, the most common " + all.top + "%): " + JSON.stringify(T.endings));
console.log("Endings of those who crossed (" + cr.kinds + " kinds, the most common " + cr.top + "%): " + JSON.stringify(T.crossEnd));
console.log(bad ? bad + " problems" : "no problems");
process.exit(bad || T.ended < T.lives ? 1 : 0);
