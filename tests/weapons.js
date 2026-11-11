/* The right weapon in every hand. Loads the game (jsdom), and lists every figure that is drawn with
   what it holds, checking:
     - the great ones of the epic hold their own weapon wherever they are drawn (scenes, tests, fights):
       Arjuna, Karna, Drona, Bhishma, Drupada, Abhimanyu, Jayadratha, Ekalavya, Ashwatthama, Kripa and
       Shikhandi the bow; Bhima, Duryodhana, Dushasana, Balarama and Shalya the mace; Ghatotkacha a mace or
       club; Yudhishthira the spear; Nakula and Sahadeva the sword; Krishna nothing;
     - every one of them who is drawn has a figure of his own (not a palace guard's);
     - a fighter whose name says his weapon holds it ("spearman" a spear, "archer" a bow, "swordsman" a
       sword, "mace champion" a mace, "club-man" a club), and a man's men are not drawn as the man
       ("Karna's archers" are archers);
     - you hold the weapon of your path, and in a fight the weapon the fight is fought with (a mace duel
       the mace, an archery or chariot duel the bow, a carry nothing; a blade for a path that is not a
       weapon; a sword in the prologue's dream);
     - you carry a small shield in a fight on the mace, spear and sword paths (mace, charioteer, strategist), none on the
       archer's or the short blades' (healer, spy, bard);
     - a move matches what is held: arrows from a bow, a heavy blow with a blade or mace. A fighter who
       makes a move with another weapon takes it up for the move (puppet-anim.js Rig.wield); those are
       listed, not failed, when the game does that.
   Usage: node tests/weapons.js [--list] [--rev GITREV]   (--list prints every figure; --rev checks the
   game as it was at that commit, for a before/after). Exits 1 on any mismatch. */
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { JSDOM, VirtualConsole } = require("jsdom");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const LIST = process.argv.includes("--list");
const REV = arg("--rev", "");
const GAME = path.join(__dirname, "..");
const read = (rel) => (REV ? execSync("git show " + REV + ":" + rel, { cwd: path.join(__dirname, ".."), maxBuffer: 1 << 26 }).toString() : fs.readFileSync(path.join(GAME, rel), "utf8"));
const html = read("index.html");
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const dom = new JSDOM(html.replace(/<script src="[^"]+"><\/script>/g, ""), { runScripts: "outside-only", pretendToBeVisual: true, url: "https://localhost/", virtualConsole: new VirtualConsole() });
const w = dom.window;
w.HTMLElement.prototype.scrollIntoView = () => {};
for (const src of scripts) {
  let code = read(src);
  // An older game has no U.battleSpecFor: it is opened up the same way, to read who each fighter is drawn as.
  if (src === "js/ui/battle.js" && !/U\.battleSpecFor/.test(code)) code = code.replace("U.FIGHT_BG = FIGHT_BG;", "U.FIGHT_BG = FIGHT_BG; U.battleSpecFor = (u) => specFor(u);");
  w.eval(code);
}
const K = w.K, U = K.UI;
K.headless = true;

const CANON = { arjuna: "bow", karna: "bow", drona: "bow", bhishma: "bow", drupada: "bow", abhimanyu: "bow", jayadratha: "bow", ekalavya: "bow", ashwatthama: "bow", kripa: "bow", shikhandi: "bow",
  bhima: "mace", duryodhana: "mace", dushasana: "mace", balarama: "mace", shalya: "mace", ghatotkacha: ["mace", "club"], yudhishthira: "spear", nakula: "sword", sahadeva: "sword", krishna: null };
const NAME_OF = { arjuna: "Arjuna|Brihannala", karna: "Karna", drona: "Drona", bhishma: "Bhishma", drupada: "Drupada", abhimanyu: "Abhimanyu", jayadratha: "Jayadratha", ekalavya: "Ekalavya", ashwatthama: "Ashwatthama", kripa: "Kripa", shikhandi: "Shikhandi",
  bhima: "Bhima", duryodhana: "Duryodhana", dushasana: "Dushasana", balarama: "Balarama", shalya: "Shalya", ghatotkacha: "Ghatotkacha", yudhishthira: "Yudhishthira", nakula: "Nakula", sahadeva: "Sahadeva", krishna: "Krishna" };
const WORD = [[/spear/i, "spear"], [/archer|bowman/i, "bow"], [/sword/i, "sword"], [/\bmace\b/i, "mace"], [/\bclub/i, "club"]];
const SHOT = new Set(["arrows", "aimed", "volley", "pin"]);
const BLOW = new Set(["heavy", "crush", "breaker", "quake"]); // (a hamstring is cut with any blade)
const want = (c) => (Array.isArray(c) ? c : [c]);
const fmt = (v) => (v == null ? "nothing" : v);
const wields = !!(U.rig && /Rig\.prototype\.wield/.test(read("js/ui/puppet-anim.js")));

const bad = [], notes = [], rows = [];
const check = (where, who, held, expect, why) => {
  rows.push(where + " · " + who + " → " + fmt(held));
  if (expect !== undefined && !want(expect).includes(held == null ? null : held)) bad.push(where + " · " + who + ": holds " + fmt(held) + ", should hold " + want(expect).map(fmt).join(" or ") + (why ? " (" + why + ")" : ""));
};

// 1. The great ones, as drawn anywhere (U.puppetFor: scenes' casts, tests' casts, fights by person).
for (const id of Object.keys(CANON)) {
  if (!K.PUPPETS[id]) bad.push("figure · " + id + ": has no figure of his own (drawn as a palace guard, with a spear)");
  check("figure", id, (U.puppetFor(id) || {}).item || null, CANON[id]);
}
// 2. Everyone cast in a scene or a test has a figure of his own.
const castIds = new Set();
for (const s of Object.values(K.SCENES || {})) {
  const add = (c) => { if (Array.isArray(c)) c.forEach((x) => { if (typeof x === "string") castIds.add(x); }); };
  try { add(K.val(s.cast)); } catch (e) { /* */ }
  let ch = []; try { ch = K.val(s.choices) || []; } catch (e) { /* */ }
  if (Array.isArray(ch)) ch.forEach((c) => { try { if (c && c.trial) add(K.val(c.trial.cast)); } catch (e) { /* */ } });
}
for (const id of castIds) if (!K.PUPPETS[id]) bad.push("cast · " + id + ": has no figure of his own (drawn as a palace guard)");
// 3. Every fighter in every fight, on both sides of the war.
const seen = new Set();
for (const side of ["pandava", "kaurava"]) {
  K.S = K.newLife(); Object.assign(K.S, { name: "T", age: 44, act: 6, side, path: "mace", friend: "charu", origin: "panchala", pronoun: "she" });
  for (const id of Object.keys(K.ENCOUNTERS)) {
    const e = K.ENCOUNTERS[id];
    let defs = [];
    try { defs = (K.val(e.enemies) || []).map((d) => ["enemy", d]).concat((K.val(e.allies) || []).map((a) => ["ally", typeof a === "string" ? K.UNITS[a] && K.UNITS[a](K.S) : a])); } catch (x) { continue; }
    for (const [sd, d] of defs) {
      if (!d) continue;
      const src = typeof d.name === "string" ? d.name : JSON.stringify(d.name);
      const key = sd + "|" + src + "|" + (d.person || "") + "|" + (d.abilities || []).join(",");
      if (seen.has(key)) continue; seen.add(key);
      const spec = U.battleSpecFor({ side: sd, name: K.fmt ? K.fmt(d.name) : d.name, src: d.name, person: d.person || null }) || {};
      if (spec.thing) { rows.push("fight " + id + " · " + src + " → (a " + spec.thing + ")"); continue; }
      const held = spec.item || null;
      // In a real-time fight he strikes with what he is drawn holding (RT.weaponOf: its reach, its blows; a bow only shoots).
      if (K.RT && K.RT.isRealtime(e) && sd === "enemy") { const rw = K.RT.weaponOf({ side: sd, src: d.name, name: K.fmt ? K.fmt(d.name) : d.name, person: d.person || null }); if (held && rw !== held && !(held === "whip")) bad.push("fight " + id + " · " + src + ": drawn with " + fmt(held) + ", strikes in real time with " + rw); }
      const who = (d.person || "") + Object.keys(NAME_OF).find((k) => new RegExp("^(?:" + NAME_OF[k] + ")(?!'s)\\b").test(src));
      const named = Object.keys(NAME_OF).find((k) => d.person === k || new RegExp("^(?:" + NAME_OF[k] + ")(?!'s)\\b").test(src));
      if (named) check("fight " + id, src, held, CANON[named], "his own weapon");
      else { const wd = WORD.find(([re]) => re.test(src)); check("fight " + id, src, held, wd ? wd[1] : undefined, wd ? "his name says so" : ""); }
      // A man's men are not drawn as the man: "Karna's archers" do not wear Karna's crown.
      const owner = !/'s chariot$/.test(src) && Object.keys(NAME_OF).find((k) => new RegExp("^(?:One of )?(?:" + NAME_OF[k] + ")'s").test(src)); // ("Brihannala's chariot" is Arjuna in it)
      if (owner && K.PUPPETS[owner] && spec.crown && K.PUPPETS[owner].crown === spec.crown) bad.push("fight " + id + " · " + src + ": drawn as " + owner + " himself");
      for (const ab of d.abilities || []) {
        if (SHOT.has(ab) && held !== "bow") (wields ? notes : bad).push("fight " + id + " · " + src + ": " + ab + " with " + fmt(held) + (wields ? " → takes up a bow for it" : ", not a bow"));
        if (BLOW.has(ab) && held === "bow") (wields ? notes : bad).push("fight " + id + " · " + src + ": " + ab + " with a bow" + (wields ? " → draws a sword for it" : ""));
      }
      void who;
    }
  }
}
// 4. You: your path's weapon, and in a fight the fight's own.
const PATH_ITEM = { archer: "bow", mace: "mace" };
const BLADE = ["sword", "dagger"], FIGHT_ITEM = { charioteer: "spear" }; // (owner, 9 Nov: the charioteer fights with the spear)
for (const p of Object.keys(K.PATHS)) {
  K.S = K.newLife(); Object.assign(K.S, { name: "T", age: 30, act: 5, path: p });
  const pathItem = K.puppetSpec(K.S).item;
  check("you (" + p + ")", "about the story", pathItem, PATH_ITEM[p]);
  for (const mode of [null, "mace", "range", "chariot", "carry"]) {
    const held = K.fightItem ? K.fightItem(K.S, mode) : (U.battleSpecFor({ side: "player" }) || {}).item || null;
    const expect = mode === "mace" ? "mace" : mode === "range" || mode === "chariot" ? "bow" : mode === "carry" ? null : PATH_ITEM[p] || FIGHT_ITEM[p] || BLADE;
    check("you (" + p + ")", "in " + (mode ? "a " + mode + " fight" : "a fight"), held, expect);
    if (!mode) for (const ab of (K.PATHS[p].abilities || [])) {
      if (SHOT.has(ab) && held !== "bow") bad.push("you (" + p + ") · " + ab + " with " + fmt(held) + ", not a bow");
      if (BLOW.has(ab) && !["mace", "sword", "spear", "club"].includes(held)) bad.push("you (" + p + ") · " + ab + " with " + fmt(held));
    }
  }
}
// 5. Your shield (owner, 4 November): the mace and sword paths carry a small one in a fight (and block with it in real
// time); the archer and the short blades (healer, spy, bard) do not.
const SHIELDED = new Set(["mace", "charioteer", "strategist"]);
for (const p of Object.keys(K.PATHS)) {
  K.S = K.newLife(); Object.assign(K.S, { name: "T", age: 30, act: 5, path: p });
  const spec = U.battleSpecFor ? U.battleSpecFor({ side: "player" }) || {} : {};
  const has = (spec.gear || []).includes("buckler") || (spec.gear || []).includes("shield");
  rows.push("you (" + p + ") · shield → " + (has ? "yes" : "no"));
  if (has !== SHIELDED.has(p) || !!(K.Combat.hasShield && K.Combat.hasShield()) !== SHIELDED.has(p)) bad.push("you (" + p + ") · " + (SHIELDED.has(p) ? "should carry a shield in a fight" : "should carry no shield"));
}
// The strategist who chose the spear at fifteen (content/act2.js a2_weapon): drawn with it, and fights with it.
{ K.S = K.newLife(); Object.assign(K.S, { name: "T", age: 30, act: 5, path: "strategist", weapon: "spear" });
  check("you (strategist, the spear chosen)", "in a fight", K.fightItem ? K.fightItem(K.S, null) : null, "spear");
  if (K.RT && K.RT.weaponOf && K.RT.weaponOf({ side: "player" }) !== "spear") bad.push("you (strategist, the spear chosen) · fights with " + K.RT.weaponOf({ side: "player" })); }
// The prologue's dream: grown, with a sword.
{ K.S = K.newLife(); Object.assign(K.S, { name: "T", age: 6, act: 1, scene: "a0_dream" }); check("you (the dream)", "in the dream fight", K.fightItem ? K.fightItem(K.S, "dream") : (U.battleSpecFor({ side: "player" }) || {}).item || null, "sword"); }

if (LIST) { console.log(rows.join("\n")); console.log(""); }
for (const n of notes) console.log("·  " + n);
for (const b of bad) console.log("✗  " + b);
console.log("\n" + rows.length + " figures checked" + (REV ? " (game at " + REV + ")" : "") + "; " + notes.length + " moves made with a weapon taken up for them; " + bad.length + " mismatches.");
process.exit(bad.length ? 1 : 0);
