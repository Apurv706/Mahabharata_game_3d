/* The war as a commander (PRD §18.3): plays the war from the eve of the first day many times as a
   company leader with a strong Command, on both sides, so the promotions, the army battles, the
   holding fights and the council are all reached; reports crashes, stuck screens and how often each
   new scene came. Usage: node tests/command.js [lives] */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const N = parseInt(process.argv[2] || "60", 10);
const GAME = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(GAME, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
scripts.splice(scripts.indexOf("js/ui/dom.js"), 0, "js/i18n/hi.js");

function life(seed) {
  const vc = new VirtualConsole(), jsErrors = [];
  vc.on("jsdomError", (e) => jsErrors.push(String(e.detail && e.detail.stack || e.message || e)));
  const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ""), { runScripts: "outside-only", pretendToBeVisual: true, url: "https://localhost/", virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  let s = seed >>> 0; w.Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (const src of scripts) w.eval(fs.readFileSync(path.join(GAME, src), "utf8"));
  const K = w.K; K.headless = true; K.seed(seed);
  K.S = K.newLife();
  Object.assign(K.S, { name: "Asha", origin: "panchala", pronoun: "she", temperament: "bold", path: "strategist", teacher: "drona", age: 44, act: 6, side: seed % 2 ? "pandava" : "kaurava", at: "kurukshetra" });
  K.S.attrs.command = 5; K.S.skills.statecraft = 3;
  K.S.flags.push("role_command"); K.S.storyMode = seed % 3 !== 0; // most lives in story mode, so they live to see the later days
  K.S.record.won = 3; K.S.record.last = "won";
  K.go("a6_day1");
  const steps = [];
  for (let i = 0; i < 1500; i++) {
    if (jsErrors.length) { dom.window.close(); return { crash: jsErrors[0], steps }; }
    if (d.getElementById("again") || K.S.scene.startsWith("a7") || K.S.scene === "end_death") { const r = { seen: K.S.seen.slice(), flags: K.S.flags.slice(), steps }; dom.window.close(); return r; }
    const acts = [...d.querySelectorAll("#battle-actions .act:not([disabled])")];
    const cta = [...d.querySelectorAll("#leaf .cta")].filter((b) => !b.disabled);
    const choices = [...d.querySelectorAll("#choices .choice:not([disabled])")].filter((b) => !b.classList.contains("picked"));
    try {
      if (acts.length) acts[0].click();
      else if (choices.length) {
        // Prefer what this test is about: the array, the holding fight, a promotion, the council.
        const want = choices.filter((c) => /choice-(array|hold|accept|sit|chariot|division|truce|mercy|whole|raid|all|war|rally|back)$/.test(c.id));
        const c = want.length && w.Math.random() < 0.85 ? want[Math.floor(w.Math.random() * want.length)] : choices[Math.floor(w.Math.random() * choices.length)];
        steps.push(K.S.scene + ":" + c.id.replace("choice-", "")); c.click();
      } else if (cta.length) cta[0].click();
      else { const r = { stuck: K.S.scene, steps }; dom.window.close(); return r; }
    } catch (e) { dom.window.close(); return { crash: e.stack, steps }; }
  }
  dom.window.close();
  return { stuck: "step limit", steps };
}

const res = [];
for (let i = 1; i <= N; i++) res.push(life(i * 104729));
const crashes = res.filter((r) => r.crash), stuck = res.filter((r) => r.stuck);
const seen = {};
res.forEach((r) => (r.seen || []).forEach((id) => { if (/^(cmd_|hold_)/.test(id)) seen[id] = (seen[id] || 0) + 1; }));
const flags = {};
res.forEach((r) => (r.flags || []).forEach((f) => { if (/^(role_|held_|broke_|council_|company_broken|stayed_with)/.test(f)) flags[f] = (flags[f] || 0) + 1; }));
console.log("Lives: " + N + " · crashes " + crashes.length + " · stuck " + stuck.length);
console.log("Scenes: " + Object.entries(seen).sort().map(([k, v]) => k + " " + v).join(", "));
console.log("Flags: " + Object.entries(flags).sort().map(([k, v]) => k + " " + v).join(", "));
crashes.slice(0, 2).forEach((c) => console.log("CRASH\n" + c.crash.split("\n").slice(0, 5).join("\n") + "\n" + c.steps.slice(-4).join(" > ")));
stuck.slice(0, 2).forEach((c) => console.log("STUCK at " + c.stuck + " " + c.steps.slice(-4).join(" > ")));
const need = ["cmd_promotion_1", "cmd_promotion_2", "cmd_array_1", "cmd_array_2", "cmd_council_1", "cmd_council_2", "cmd_council_3", "hold_karna_offer", "hold_duryodhana_offer", "hold_arjuna_offer", "hold_bhima_offer", "hold_broken"];
const missing = need.filter((k) => !seen[k]);
if (missing.length) console.log("Never reached: " + missing.join(", "));
process.exit(crashes.length || stuck.length || missing.length ? 1 : 0);
