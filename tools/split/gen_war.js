/* Ready-made lives on the eve of the war (a6_eve), for Part Two's "Begin at the war" (part.js).
   Each is a whole life played through the engine alone from the first scene, with random choices
   that mostly win, stopped where the armies face each other; its save code resumes it there.
   Usage: node tools/split/gen_war.js [out=tools/split/war_lives.json]
   Writes [{ name, origin, path, side, code }], three on each side; build.js reads it. */
const fs = require("fs"), path = require("path");
const G = path.join(__dirname, "..", "..");
global.window = global; global.K = {};
const html = fs.readFileSync(path.join(G, "index.html"), "utf8");
for (const src of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((s) => /js\/(engine|content)\//.test(s))) (0, eval)(fs.readFileSync(path.join(G, src), "utf8"));
K.UI = { esc: (s) => s }; (0, eval)(fs.readFileSync(path.join(G, "js/ui/map.js"), "utf8")); K.save = () => true;
global.btoa = global.btoa || ((s) => Buffer.from(s, "binary").toString("base64"));
const out = process.argv[2] || path.join(__dirname, "war_lives.json");
const pick = (a) => a[Math.floor(K.rng() * a.length)];
// name, pronoun, origin, side
const want = [["Ira", "she", "panchala", "pandava"], ["Arun", "he", "matsya", "pandava"], ["Tara", "she", "mathura", "pandava"],
  ["Dev", "he", "anga", "kaurava"], ["Mira", "she", "hastinapura", "kaurava"], ["Kavi", "he", "suta", "kaurava"]];
const lives = [];
for (const [name, pr, origin, side] of want) {
  for (let i = 0; i < 3000; i++) {
    K.seed(7000 + i * 13 + lives.length * 100003); const S = (K.S = K.newLife()); if (K.momentQueue) K.momentQueue.length = 0;
    S.name = name; S.pronoun = pr; S.origin = origin; S.temperament = pick(Object.keys(K.TEMPERAMENTS)); S.heirloom = pick(Object.keys(K.HEIRLOOMS));
    K.apply(K.ORIGINS[S.origin].fx); K.apply(K.TEMPERAMENTS[S.temperament].fx); K.apply(K.HEIRLOOMS[S.heirloom].fx);
    K.apply({ flag: ["origin_" + S.origin, "temper_" + S.temperament, "heir_" + S.heirloom] });
    K.go(K.FIRST_SCENE);
    let at = false;
    for (let st = 0; st < 900; st++) {
      const sc = K.SCENES[K.S.scene];
      if (!K.S.alive || sc.ending) break;
      if (sc.id === "a6_eve") { at = true; break; }
      if (K.S.side && K.S.side !== side) break; // the side is chosen before the war: keep only the one wanted
      const list = K.choiceList(sc).filter((x) => x.ok); if (!list.length) break;
      const { c } = pick(list);
      const res = c.game ? K.choose(sc, c, pick(["win", "win", "close"])) : K.choose(sc, c);
      let next = res.next;
      if (res.combat) next = K.combatOutcome(res.combat, pick(["win", "win", "lose"]), res.next).next;
      if (!K.S.alive) break;
      if (next) K.go(next);
    }
    if (at && K.S.alive && K.S.side === side) { lives.push({ name, origin, path: K.S.path, side, code: K.exportCode() }); break; }
  }
}
console.log(lives.map(({ code, ...r }) => JSON.stringify(r) + " " + code.length + " chars").join("\n"));
if (lives.length < want.length) { console.error("only " + lives.length + " of " + want.length + " lives reached the eve of the war"); process.exit(1); }
fs.writeFileSync(out, JSON.stringify(lives));
