/* The built figures (js/g3/models/m_*.js), checked as data with no page: nothing worn on one side of the body may be
   carried by the other side's limb. (Version 66 bound each shoulder plate to an arm chosen by a test that came out the
   same for both: the left plate went with the right arm, and stood in the air whenever that arm moved. The figures
   looked right standing still, which is how they were looked at. Owner, 16 November: "parts of armor is a few feet
   away from the body".)
     node tests/models.js            (exit 1 on a failure) */
"use strict";
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "..", "js", "g3", "models");
const TOL = 0.035;   // (metres past the middle a point may lie and still be its own side's: the cloth between the legs, the collar)
const HELD = 0.75;   // (the share of a point one side's limbs must hold before it counts as theirs: cloth between the legs is shared half and half)
let fails = 0, n = 0, points = 0;
const bad = [];
for (const f of fs.readdirSync(DIR).filter((x) => /^m_.*\.js$/.test(x)).sort()) {
  const K = {}; new Function("window", fs.readFileSync(path.join(DIR, f), "utf8"))({ K });
  for (const [key, M] of Object.entries(K.G3.MODELS)) {
    n++;
    const pos = new Int16Array(new Uint8Array(Buffer.from(M.pos, "base64")).buffer), jnt = Buffer.from(M.jnt, "base64"), wgt = Buffer.from(M.wgt, "base64"), idx = new Uint16Array(new Uint8Array(Buffer.from(M.idx, "base64")).buffer);
    const side = M.joints.map((j) => (/^[a-z]+L$/.test(j) ? 1 : /^[a-z]+R$/.test(j) ? -1 : 0));   // (aL, eL, kL... the left is +x; hL and hR, the hands, too)
    const partOf = new Array(M.n).fill("");
    for (const [part, [i0, len]] of Object.entries(M.parts)) for (let i = i0; i < i0 + len; i++) if (!partOf[idx[i]]) partOf[idx[i]] = part;
    const wrong = {};
    for (let v = 0; v < M.n; v++) {
      let pull = 0; for (let k = 0; k < 4; k++) pull += wgt[v * 4 + k] * side[jnt[v * 4 + k]];   // (+255: wholly the left's; -255: wholly the right's)
      const x = pos[v * 3] / M.scale; points++;
      if (Math.abs(pull) >= HELD * 255 && x * Math.sign(pull) < -TOL) wrong[partOf[v] || "?"] = (wrong[partOf[v] || "?"] || 0) + 1;
    }
    if (Object.keys(wrong).length) { fails++; bad.push(key + ": " + Object.entries(wrong).map(([p, c]) => p + " " + c).join(", ")); }
  }
}
for (const b of bad.slice(0, 40)) console.log("FAIL " + b);
if (bad.length > 40) console.log("     and " + (bad.length - 40) + " more");
console.log("models: " + n + " figures, " + points + " points; " + (fails ? fails + " with something carried by the other side's limb" : "nothing is carried by the other side's limb"));
process.exit(fails ? 1 : 0);
