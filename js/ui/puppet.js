/* The shadow puppet: you, as a leather puppet in the style of tholu bommalata, drawn in code as a
   master craftsman would cut it (PRD §18.14). One jointed figure (head, arms, forearms, thighs,
   shins) seen in profile, cut from opaque coloured leather with a firm dark edge: curved, tapered
   limbs on thread-tied joint discs, rows of punched holes, a printed border and scalloped hem on the
   cloth, beads and gold, held up on a thin rod. It is built from the life:
   age (child, youth, adult, elder), pronoun, birthplace (colours and headgear), temperament
   (bearing), heirloom, path (what the grown-up carries), wounds, chains, and death.
   Poses are joint angles set by a class on the figure (pose-aim, pose-push, pose-walk...), so
   CSS animates from one pose to the next. Other people (Arjuna, Bhima, a guard) are puppets too.

   U.puppet(spec, { pose, h, flip, cls, label }) → an SVG string.
   K.puppetSpec(S) → the spec for the player.
   U.puppetFor(id, S) → the spec for someone else (K.PUPPETS). */
(function (K) {
  "use strict";
  const U = K.UI;

  // Leather colours for each homeland: [body, cloth, trim].
  const PALETTE = {
    hastinapura: ["#c9773a", "#a3302a", "#e2b55a"],
    panchala: ["#c98a52", "#2d5aa0", "#e2b55a"],
    matsya: ["#c47d45", "#2f7d55", "#d9c27a"],
    mathura: ["#b9733f", "#d79a2b", "#3b6fb0"],
    anga: ["#c27440", "#b2432a", "#e8c46a"],
    suta: ["#b06c3c", "#7a5232", "#d8b77a"],
    nishada: ["#a3643a", "#3f5a2c", "#c9a066"],
    gandhara: ["#c48450", "#4f6178", "#d6c6a2"],
    none: ["#c27a44", "#8a3a2a", "#e2b55a"]
  };
  // Hair and headdress after the leather puppets of Andhra and Karnataka: a top knot (jata) with a
  // coloured fillet for most people, a peacock feather for the Yadavas and the forest people, tall
  // crowns (kirita) only for princes and kings.
  const HEADGEAR = { hastinapura: "jata", panchala: "jata", matsya: "band", mathura: "band", anga: "jata", suta: "band", nishada: "jata", gandhara: "band" }; // (no peacock or bird feathers: the epic gives none)
  const ITEM = { archer: "bow", mace: "mace", charioteer: "whip", strategist: "scroll", healer: "bowl", spy: "dagger", bard: "lute" };

  K.puppetStage = (age) => (age < 13 ? "child" : age < 20 ? "youth" : age < 48 ? "adult" : "elder");
  K.puppetSpec = function (S = K.S) {
    if (!S) return null;
    const inj = S.injuries || [];
    // In the prologue's dream of the war you see yourself grown, with a sword; your age stays six.
    const dreaming = !!(K.SCENES && S.scene && K.SCENES[S.scene] && K.SCENES[S.scene].prologue);
    return {
      stage: dreaming ? "adult" : K.puppetStage(S.age || 6), pronoun: S.pronoun || "they", palette: PALETTE[S.origin] || PALETTE.none,
      headgear: HEADGEAR[S.origin] || null, temper: K.TEMPERAMENTS && K.TEMPERAMENTS[S.temperament] ? S.temperament : null,
      heir: S.heirloom && !(S.flags || []).includes("heirloom_lost") ? S.heirloom : null,
      cracked: (S.flags || []).includes("amulet_broken"),
      item: K.heldNow !== undefined && S === K.S ? K.heldNow : S.path ? ITEM[S.path] : dreaming ? "sword" : null,
      eye: inj.includes("eye"), sling: inj.includes("arm"), limp: inj.includes("leg"), scar: inj.includes("scar"),
      glow: (S.boons || []).includes("astra") || (S.astras || []).length > 0, // a faint light about one who carries a divine weapon
      chained: (S.flags || []).includes("imprisoned"), cuffed: (S.flags || []).includes("was_imprisoned") && !(S.flags || []).includes("imprisoned"), dead: S.alive === false
    };
  };

  // Other people: a few fixed traits; their age follows the player's for the princes.
  // The great ones of the epic wear tall crowns in their own stones, each with one mark of his own,
  // and stand a little larger than ordinary people once grown (size); a stance is how they stand.
  K.PUPPETS = {
    // (After the epic's own words, docs/Costume_Audit.md: Arjuna is the "black-skinned boy", his diadem "resplendent like the sun".)
    arjuna: { face: "oval", whiskers: "stubble", pronoun: "he", palette: ["#7a4a2a", "#f2ead2", "#3b6fb0"], headgear: "crown", crown: { gem: "#f2c14a", tall: 1.05, trim: "#e2b55a" }, item: "bow", gear: ["conch", "gandiva", "quivers"], stance: "hero", size: 1.12, peer: true },
    bhima: { model: "hero", face: "broad", whiskers: "heavy", pronoun: "he", gear: ["conch"], palette: ["#a8622f", "#6f3a24", "#e2b55a"], headgear: "crown", crown: { gem: "#b2432a", broad: true, trim: "#6f3a24" }, item: "mace", studs: ["#d9a53a"], stance: "broad", big: true, size: 1.25, peer: true },
    karna: { face: "long", whiskers: "clean", strong: true, pronoun: "he", palette: ["#c9813f", "#d8a536", "#f3d27a"], headgear: "crown", crown: { gem: "#b2432a", tall: 1, trim: "#b2432a" }, item: "bow", armour: true, gear: ["earrings"], stance: "hero", size: 1.12, peer: true },
    duryodhana: { face: "square", whiskers: "clean", strong: true, dyed: true, pronoun: "he", palette: ["#b8703b", "#7a1f2a", "#e2b55a"], headgear: "crown", crown: { gem: ["#2f7d55", "#b2432a", "#2d5aa0", "#b2432a"], tall: 1.15, trim: "#7a1f2a" }, item: "mace", studs: ["#b2432a", "#2d5aa0", "#2f7d55", "#2d5aa0", "#b2432a"], stance: "haughty", size: 1.15, peer: true },
    dushasana: { face: "broad", whiskers: "stache", strong: true, pronoun: "he", palette: ["#b0683a", "#5e2430", "#c9a24e"], headgear: "mukuta", item: "mace", peer: true },
    // Drona, a brahmin, keeps his matted knot: a grey forked beard and a water-pot at his hip.
    // (The epic at the tournament: "dressed in white, with a white sacred thread, white locks, white beard, white garlands".)
    drona: { face: "gaunt", beard: "short", pronoun: "he", headgear: "jata", palette: ["#c9905a", "#f4efe2", "#c9a24e"], white: true, hair: "matted", stage: "elder", item: "bow", gear: ["waterpot", "thread", "garland"], stance: "sage", size: 1.12 },
    kripa: { face: "oval", whiskers: "clean", slim: true, pronoun: "he", headgear: "jata", palette: ["#c48a55", "#e7dcc0", "#b49054"], stage: "elder", item: "bow", gear: ["thread"] },
    balarama: { face: "broad", whiskers: "clean", dyed: true, pronoun: "he", gear: ["plough"], palette: ["#e2bf94", "#2c4c86", "#e2b55a"], headgear: "kirita", item: "mace", big: true, stage: "adult" }, // the master of the mace, who teaches it to Bhima and Duryodhana
    mauni: { face: "gaunt", slim: true, pronoun: "he", headgear: "jata", palette: ["#b88352", "#c7a46c", "#8a6a3a"], beard: true, stage: "elder", item: "staff" },
    vidura: { face: "long", slim: true, pronoun: "he", headgear: "jata", palette: ["#c08a56", "#f0e8d6", "#9b8a6a"], beard: true, stage: "elder", item: "scroll" },
    // The sutradhara, who holds the strings of the story and opens each act.
    sutradhara: { face: "round", slim: true, pronoun: "he", headgear: "band", palette: ["#c8925e", "#e9dcc0", "#b2432a"], beard: true, stage: "elder", item: "scroll" },
    bhishma: { face: "long", pronoun: "he", headgear: "crown", crown: { gem: "#d9a53a", tall: 0.85, white: true, trim: "#d9a53a" }, palette: ["#cfa274", "#f4efe2", "#d6c08a"], beard: "long", stage: "elder", item: "bow", stance: "sage", size: 1.22 },
    // Satyaki, the Yadava champion: broad and tall in scale armour, a Vrishni blue crown, sword in hand.
    satyaki: { face: "square", whiskers: "stache", pronoun: "he", palette: ["#9a5a30", "#2c4c86", "#e2b55a"], headgear: "crown", crown: { gem: "#2c4c86", broad: true, trim: "#e2b55a" }, item: "sword", gear: ["scale", "bracer"], studs: ["#d9a53a"], stance: "broad", big: true, size: 1.24, stage: "adult" },
    // (Out of the fire "with a crown on his head and his body encased in excellent armour, sword in hand".)
    dhrishtadyumna: { face: "square", whiskers: "goatee", pronoun: "he", headgear: "crown", crown: { gem: "#b2432a", tall: 0.9, trim: "#e2b55a" }, palette: ["#c27a44", "#b2432a", "#e2b55a"], gear: ["conch", "cuirass"], item: "sword", stage: "adult" },
    shakuni: { face: "hawk", beard: "goatee", slim: true, pronoun: "he", palette: ["#b78a5c", "#4b5a73", "#c9b07a"], headgear: "band", stage: "elder", item: "dice" },
    charu: { pronoun: "they", palette: ["#a8683c", "#6b4a32", "#c9a066"], item: "hammer", peer: true },
    ugra: { pronoun: "he", palette: ["#9c5c32", "#5a4630", "#a8875a"], big: true, stage: "adult" },
    // Ordinary fighters wear helmets or turbans, never crowns: a palace guard in a tall turban and
    // sash, his spear upright; a soldier in a leather helmet and cuirass behind a round hide shield.
    guard: { face: "square", pronoun: "he", palette: ["#9e6a40", "#5d3b2a", "#9f8250"], headgear: "turban", hat: "#c9a24e", hatTrim: "#6e3026", gear: ["sash"], item: "spear", stance: "square", stage: "adult" },
    soldier: { pronoun: "he", palette: ["#9e6a40", "#6e3026", "#b39255"], headgear: "helmet", gear: ["shield", "cuirass"], item: "spear", stance: "square", stage: "adult" },
    cousin: { pronoun: "she", palette: ["#b9743f", "#b2432a", "#e2b55a"], stage: "child" },
    healer: { pronoun: "she", palette: ["#b47a4a", "#e9dfc6", "#9a8a6a"], item: "bowl", stage: "adult" },
    boy: { pronoun: "he", palette: ["#b0703f", "#8a5a3a", "#c9a066"], stage: "youth" },
    abhimanyu: { face: "heart", pronoun: "he", palette: ["#c27a44", "#f2ead2", "#3b6fb0"], headgear: "mukuta", item: "bow", stage: "youth" },
    // The others of the epic, each with the weapon the story gives him (Krishna carries none: he does not fight).
    yudhishthira: { face: "long", beard: "short", slim: true, pronoun: "he", gear: ["conch"], palette: ["#dca666", "#efe6cc", "#c9a24e"], headgear: "crown", crown: { gem: "#2f7d55", tall: 0.95, trim: "#c9a24e" }, item: "spear", stance: "sage", size: 1.1, peer: true },
    nakula: { face: "heart", whiskers: "thin", pronoun: "he", gear: ["conch"], palette: ["#c27a44", "#3f6b3a", "#e2b55a"], headgear: "mukuta", item: "sword", stance: "hero", peer: true },
    sahadeva: { face: "oval", whiskers: "thin", pronoun: "he", gear: ["conch"], palette: ["#b8743f", "#4b5a73", "#e2b55a"], headgear: "mukuta", item: "sword", stance: "hero", peer: true },
    // (The epic's Krishna is "dark as the lapis lazuli", "robed in yellow silk", and wears a diadem; the peacock feather is later art.)
    krishna: { face: "round", whiskers: "clean", dyed: true, pronoun: "he", gear: ["conch"], palette: ["#33416f", "#e6b22c", "#e2b55a"], headgear: "crown", crown: { gem: "#b2432a", tall: 0.9, trim: "#e2b55a" }, stance: "hero", size: 1.12, stage: "adult" },
    drupada: { face: "oval", pronoun: "he", palette: ["#c08a56", "#b2432a", "#e2b55a"], headgear: "crown", crown: { gem: "#b2432a", tall: 0.9, trim: "#e2b55a" }, beard: true, item: "bow", size: 1.1, stage: "adult" },
    jayadratha: { face: "round", whiskers: "stache", strong: true, pronoun: "he", palette: ["#b8703b", "#3a5a6a", "#c9a24e"], headgear: "crown", crown: { gem: "#2d5aa0", tall: 1, trim: "#3a5a6a" }, item: "bow", stance: "haughty", size: 1.1, stage: "adult" },
    // ("The Nishada of dark hue, of body besmeared with filth, dressed in black and bearing matted locks on head.")
    ekalavya: { face: "oval", whiskers: "thin", dyed: true, pronoun: "he", palette: ["#6a4026", "#2a2622", "#8a7a5a"], headgear: "jata", hair: "matted", item: "bow", stance: "archer", peer: true },
    shalya: { face: "broad", strong: true, pronoun: "he", palette: ["#b8703b", "#6a4a2a", "#e2b55a"], headgear: "crown", crown: { gem: "#c9a24e", broad: true, trim: "#6a4a2a" }, beard: true, item: "mace", stance: "broad", size: 1.12, stage: "adult" },
    shikhandi: { face: "heart", pronoun: "he", palette: ["#c27a44", "#8a2a3a", "#e2b55a"], headgear: "mukuta", item: "bow", stance: "archer", stage: "adult" },
    // ("Stiff hair rising upwards", "a diadem on his head", huge; he fights with a gold-decked mace.)
    ghatotkacha: { ears: "pointed", face: "broad", whiskers: "stubble", pronoun: "he", palette: ["#6a4a3a", "#3a2a2a", "#b2432a"], headgear: "crown", crown: { gem: "#b2432a", broad: true, tall: 0.7, trim: "#3a2a2a" }, hair: "up", item: "club", stance: "broad", big: true, size: 1.3, stage: "adult" },
    ashwatthama: { face: "hawk", whiskers: "thin", pronoun: "he", palette: ["#c9905a", "#3a2a3a", "#c9a24e"], headgear: "crown", crown: { gem: "#8a5aa0", tall: 0.95, trim: "#3a2a3a" }, gear: ["browgem"], item: "bow", stance: "hero", stage: "adult", big: true, size: 1.18 }
  };
  // What the player holds: the weapon of the path chosen at fifteen, and in a fight the weapon the fight
  // asks for (a mace duel is fought with the mace, an archery or chariot duel with the bow). Paths that
  // are not a weapon carry their sign about the story, and in a fight a blade: a sword for the driver and
  // the commander, a short blade for the healer, the spy and the bard. Before the path, nothing.
  const FIGHT_ITEM = { archer: "bow", mace: "mace", charioteer: "spear", strategist: "sword", healer: "dagger", spy: "dagger", bard: "dagger" }; // (the strategist's spear, if chosen: K.playerWeapon)
  const MODE_ITEM = { mace: "mace", range: "bow", chariot: "bow", carry: null, dream: "sword" }; // (the prologue's dream: you fight grown, with a sword)
  K.fightItem = function (S = K.S, mode) {
    if (mode && mode in MODE_ITEM) return MODE_ITEM[mode];
    return S && S.path ? (K.playerWeapon ? K.playerWeapon(S) : FIGHT_ITEM[S.path]) || null : null;
  };
  K.heldNow = undefined; // set while a fight is on screen (ui/battle.js, ui/fightmodes.js): what the player's figure holds
  // What the years change, as the epic tells it. Karna cuts away the golden mail and the ear-rings he was born with and
  // gives them to Indra while the Pandavas are in the forest: in the war he has neither. The Pandavas go to the forest
  // having "cast off their royal robes, attired themselves in deer-skins".
  const PANDAVA = new Set(["yudhishthira", "bhima", "arjuna", "nakula", "sahadeva"]);
  K.puppetPeriod = (S) => (!S ? "" : S.act >= 6 ? "war" : S.act === 5 ? "exile" : "");
  U.puppetFor = function (id, S = K.S) {
    const p = K.PUPPETS[id] || K.PUPPETS.guard, out = Object.assign({ stage: p.peer && S ? K.puppetStage(S.age || 10) : "adult" }, p), when = K.puppetPeriod(S);
    if (id === "karna" && when === "war") { out.armour = false; out.gear = (p.gear || []).filter((g) => g !== "earrings").concat(["cuirass"]); }
    if (PANDAVA.has(id) && when === "exile") { out.headgear = "jata"; out.crown = null; out.hair = "matted"; out.palette = [p.palette[0], "#8a6a3e", "#b39255"]; out.gear = (p.gear || []).filter((g) => g !== "gandiva").concat(["deerskin"]); out.dyed = true; }
    return out;
  };

  // Master leather (PRD §18.14): each piece is cut with a firm dark edge, and the craftsman punches
  // holes in rows only where he would put them (hems, crowns, armlets, the dhoti's edge), never as a
  // grid over every part. A row of holes is one dashed stroke with round caps, so it follows any
  // curve and costs one element. Light leather shows its holes dark, dark leather shows them light.
  const EDGE = "#1d0f08";
  const OUT = ' stroke="' + EDGE + '" stroke-width="1.35" stroke-linejoin="round"';
  const OUT_F = ' stroke="' + EDGE + '" stroke-width="0.8" stroke-linejoin="round"'; // fine pieces: jewellery
  const light = (c) => { const m = /^#([0-9a-f]{6})$/i.exec(c || ""); if (!m) return false; const n = parseInt(m[1], 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) > 150; };
  const holeRow = (d, on, gap, w) => '<path d="' + d + '" fill="none" stroke="' + (light(on) ? "#3a1e0c" : "#fff3d0") + '" stroke-opacity="' + (light(on) ? 0.6 : 0.72) + '" stroke-width="' + (w || 1.15) + '" stroke-dasharray="0 ' + (gap || 2.8) + '" stroke-linecap="round"/>';
  // A string of beads: a dark edge under each bead, then the bead.
  const beads = (d, c, w, gap) => '<path d="' + d + '" fill="none" stroke="' + EDGE + '" stroke-width="' + (w + 0.9) + '" stroke-dasharray="0 ' + gap + '" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-dasharray="0 ' + gap + '" stroke-linecap="round"/>';
  // A joint: the two pieces overlap on a leather disc tied with a thread knot.
  // The knot and its two loose ends are one path: a small ring, filled, and the ends trailing from it.
  const disc = (x, y, r, c) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '" stroke="' + EDGE + '" stroke-width="0.9"/>' +
    '<path d="M' + (x - 1.15) + " " + y + " a1.15 1.15 0 1 0 2.3 0 a1.15 1.15 0 1 0 -2.3 0 M" + (x + 0.5) + " " + (y + 1) + " l1.1 1.7 M" + (x - 0.5) + " " + (y + 1) + ' l-0.9 1.9" fill="#f2e2b8" stroke="' + EDGE + '" stroke-width="0.5" stroke-linecap="round"/>';
  const f2 = (v) => +v.toFixed(2);
  // A hem, as a craftsman finishes it: a row of holes above, a printed band (a zigzag with dots in the
  // trim colour between two trim lines), and a scalloped edge below. The band runs from the top edge
  // (x from tx0 to tx1 at y0) to the hem (bx0 to bx1 at y1), both sagging by s in the middle.
  // o.plain: the far leg's hem, mostly hidden, keeps only its scallops and band lines (fewer pieces).
  function hemSvg(tx0, tx1, y0, bx0, bx1, y1, s, trim, cloth, n, plain) {
    const P = (t, u) => { const xa = tx0 + (tx1 - tx0) * t, xb = bx0 + (bx1 - bx0) * t, sag = 4 * s * t * (1 - t); return [f2(xa + (xb - xa) * u), f2(y0 + (y1 - y0) * u + sag)]; };
    const pts = (u, k) => { const a = []; for (let i = 0; i <= k; i++) a.push(P(i / k, u)); return a; };
    const top = pts(0, 8), bot = pts(1, 8);
    const band = "M" + top.map((p) => p.join(" ")).join(" L") + " L" + bot.slice().reverse().map((p) => p.join(" ")).join(" L") + " Z";
    let zig = "", dots = "";
    for (let i = 0; i <= 2 * n; i++) { const p = P(i / (2 * n), i % 2 ? 0.24 : 0.74); zig += (i ? " L" : "M") + p.join(" "); if (i % 2) { const q = P(i / (2 * n), 0.8); dots += "M" + q.join(" ") + "h0"; } }
    let sc = "M" + bot[0].join(" ");
    const m = n + 2, hb = pts(1, m);
    for (let i = 1; i <= m; i++) { const a = hb[i - 1], b = hb[i]; sc += " Q" + f2((a[0] + b[0]) / 2) + " " + f2((a[1] + b[1]) / 2 + 3.4) + " " + b.join(" "); }
    sc += " L" + bot.slice().reverse().map((p) => p.join(" ")).join(" L") + " Z";
    const above = pts(-0.42, 8);
    return '<path d="' + sc + '" fill="' + trim + '" stroke="' + EDGE + '" stroke-width="0.85" stroke-linejoin="round"/>' +
      (plain ? "" : '<path d="' + band + '" fill="' + EDGE + '" fill-opacity="0.16"/>') +
      // the band's two lines, the zigzag and its dots: one stroke in the trim colour
      '<path d="M' + top.map((p) => p.join(" ")).join(" L") + " M" + bot.map((p) => p.join(" ")).join(" L") + (plain ? "" : " " + zig + " " + dots) + '" fill="none" stroke="' + trim + '" stroke-width="1.1" stroke-linecap="round"/>' +
      (plain ? "" : holeRow("M" + above.map((p) => p.join(" ")).join(" L"), cloth, 2.7, 1.05));
  }
  // The things a puppet carries, drawn near the front hand (58,126).
  // Weapons and tools are drawn resting in a hanging hand, pointing up along the arm. When the arm
  // is raised or reaching (a strike, a block, a cheer), CSS turns them about the hand so they carry
  // on past the fist the way a held weapon does, instead of hanging upside down.
  const WIELD = new Set(["mace", "sword", "woodsword", "spear", "dagger", "hammer", "staff", "plough", "whip", "club"]);
  // o.tips: the Gandiva's gold tips; o.studs: stones (or gold studs) set in a mace's head.
  // The weapon's striking point (a blade's tip, a mace's head), an invisible mark the fight screens measure live.
  const TIP = (x, y) => '<circle class="it-tip" cx="' + x + '" cy="' + y + '" r="0.6" fill="none" stroke="none"/>';
  function itemSvg(kind, trim, o = {}) {
    switch (kind) {
      // A recurved bow held at its grip: the belly passes through the hand, the string runs behind the arm.
      case "bow": return '<path d="M50 86 Q72 126 50 166" fill="none" stroke="#5a3418" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="M50 86 q-3.5 -2.5 -2 -6.5 M50 166 q-3.5 2.5 -2 6.5" fill="none" stroke="#5a3418" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M50 86 L50 166" stroke="#efe2c0" stroke-width="0.8"/><path d="M59.8 120 L61.6 132" stroke="' + trim + '" stroke-width="3.4"/>' +
        (o.tips ? '<circle cx="50" cy="84" r="2.6" fill="' + GOLD + '"' + OUT + '/><circle cx="50" cy="168" r="2.6" fill="' + GOLD + '"' + OUT + '/><path d="M50 86 Q72 126 50 166" fill="none" stroke="' + GOLD + '" stroke-width="1.1" stroke-dasharray="3 6"/>' : "");
      // The gada: a long haft with a wrapped grip and a pommel, a gold collar, and a heavy ribbed head
      // with a spike, tilted forward out of the figure so its shape reads at any size.
      case "mace": return '<g transform="rotate(20 58 126)">' +
        '<rect x="56.3" y="74" width="3.4" height="62" rx="1.2" fill="#6b4422"' + OUT + '/>' +
        '<path d="M56.3 119h3.4M56.3 123h3.4M56.3 127h3.4M56.3 131h3.4" stroke="' + trim + '" stroke-width="1.3"/>' +
        '<circle cx="58" cy="137.5" r="2.8" fill="' + GOLD + '"' + OUT + '/>' +
        '<path d="M58 44 L56.4 38.5 L58 33 L59.6 38.5 Z" fill="' + GOLD + '"' + OUT + '/>' +
        '<path d="M58 43 C66.5 43 70 51.5 69.5 59 C69 67.5 63.5 73 58 73 C52.5 73 47 67.5 46.5 59 C46 51.5 49.5 43 58 43 Z" fill="' + GOLD + '"' + OUT + '/>' +
        '<path d="M58 43 Q50.5 58 58 73 M58 43 Q65.5 58 58 73 M52 46 Q46.5 58 52 71 M64 46 Q69.5 58 64 71" fill="none" stroke="#7a5418" stroke-width="0.9"/>' +
        '<path d="M47 59 Q58 63 69 59" fill="none" stroke="' + trim + '" stroke-width="1.8"/>' + holeRow("M49 52.4 Q58 55.4 67 52.4", GOLD, 2.5, 1) + holeRow("M49 65.6 Q58 68.6 67 65.6", GOLD, 2.5, 1) +
        '<rect x="54.2" y="72" width="7.6" height="4.4" rx="1" fill="' + GOLD + '"' + OUT + '/>' +
        (o.studs ? [52, 58, 64, 55, 61].map((x, i) => '<circle cx="' + x + '" cy="' + [52, 50, 52, 64, 64][i] + '" r="2" fill="' + o.studs[i % o.studs.length] + '" stroke="#24120a" stroke-width=".7"/>').join("") : "") + TIP(58, 58) + "</g>";
      // A khadga: broad blade swelling towards a curved point, a cross-guard, a grip and a pommel.
      case "sword": return '<g transform="rotate(16 58 126)">' +
        '<path d="M56.2 119 L55.4 84 Q56 74 62.5 68 Q61.6 78 61 86 L59.8 119 Z" fill="#dcd7c8"' + OUT + '/><path d="M58 117 L57.8 86 Q58.6 78 61 73" fill="none" stroke="#9a9484" stroke-width="0.7"/>' +
        '<path d="M51.5 119.5 L64.5 119.5 L63 122.5 L53 122.5 Z" fill="' + GOLD + '"' + OUT + '/><rect x="56.4" y="122.5" width="3.2" height="9" fill="#5a3418"' + OUT + '/><circle cx="58" cy="133.5" r="2.4" fill="' + GOLD + '"' + OUT + '/></g>' + TIP(61.6, 71);
      // A practice sword of wood: the same broad blade in teak, a plain cross-piece, a cord-wrapped grip.
      case "woodsword": return '<g transform="rotate(16 58 126)">' +
        '<path d="M56.2 119 L55.4 84 Q56 74 62.5 68 Q61.6 78 61 86 L59.8 119 Z" fill="#b5834a"' + OUT + '/><path d="M58 117 L57.8 86 Q58.6 78 61 73" fill="none" stroke="#7a5228" stroke-width="0.8"/>' +
        '<path d="M52 119.5 L64 119.5 L64 122.5 L52 122.5 Z" fill="#8a5a2c"' + OUT + '/><rect x="56.4" y="122.5" width="3.2" height="9" fill="#5a3418"' + OUT + '/><path d="M56.4 125h3.2M56.4 128h3.2" stroke="#d9b26a" stroke-width="0.9"/></g>' + TIP(61.6, 71);
      // A spear: a long shaft, a leaf-shaped head on a collar, and a red tassel below it. The shaft dark wood with the
      // leather's dark edge (owner, 10 Nov: thin and brown, it was lost against the ground on a phone).
      case "spear": return '<path d="M58 176 L58 64" stroke="' + EDGE + '" stroke-width="4.6" stroke-linecap="round"/><path d="M58 176 L58 64" stroke="#3f2310" stroke-width="2.2" stroke-linecap="round"/>' +
        '<path d="M58 40 Q63.5 52 60.4 63 L55.6 63 Q52.5 52 58 40 Z" fill="#dcd7c8"' + OUT + '/><path d="M58 44 L58 62" stroke="#9a9484" stroke-width="0.7"/>' +
        '<rect x="55.8" y="62.5" width="4.4" height="3.4" fill="' + GOLD + '"' + OUT + '/><path d="M56.5 66 q-3 5 -1.5 10 M58 66 q-0.5 6 0.5 11 M59.5 66 q2.5 5 1.5 9.5" fill="none" stroke="#b2432a" stroke-width="1.3" stroke-linecap="round"/>' + TIP(58, 42);
      // A bandit's knotted club, thick at the head.
      case "club": return '<path d="M56.6 128 L55.4 96 Q53 84 56 74 Q61 66 66 72 Q68 82 62 96 L60 128 Z" fill="#6b4422"' + OUT + '/><circle cx="58" cy="82" r="1.6" fill="#3a2412"/><circle cx="62" cy="88" r="1.4" fill="#3a2412"/><circle cx="57" cy="94" r="1.2" fill="#3a2412"/>' + TIP(60, 78);
      case "plough": return '<path d="M58 165 L58 74" stroke="#6b4422" stroke-width="3"/><path d="M58 74 Q70 66 74 54 L66 60 Z" fill="#cfc7b2"' + OUT + "/>" + TIP(70, 60);
      case "staff": return '<path d="M60 200 L60 100" stroke="#6b4422" stroke-width="2.6" stroke-linecap="round"/>' + TIP(60, 102);
      case "whip": return '<path d="M58 126 L66 98" stroke="#5a3418" stroke-width="2"/><path d="M66 98 Q80 90 76 112 Q72 124 84 120" fill="none" stroke="#3d2412" stroke-width="1"/>';
      case "scroll": return '<rect x="52" y="122" width="14" height="7" rx="3" fill="#efe2c0"' + OUT + "/>";
      case "bowl": return '<path d="M50 124 Q58 134 66 124 Z" fill="#9a6a3a"' + OUT + '/><path d="M54 122c1-3 3-3 4 0M59 121c1-3 3-3 4 0" stroke="#4f7d3a" stroke-width="1" fill="none"/>';
      // A short dagger, its blade forward out of the fist.
      case "dagger": return '<g transform="rotate(38 58 126)"><path d="M56.6 120 L57.2 102 L58 98 L58.8 102 L59.4 120 Z" fill="#dcd7c8"' + OUT + '/><path d="M53.5 120 L62.5 120 L61.5 122.5 L54.5 122.5 Z" fill="' + GOLD + '"' + OUT + '/><rect x="56.6" y="122.5" width="2.8" height="7" fill="#5a3418"' + OUT + "/>" + TIP(58, 99) + "</g>";
      case "lute": return '<path d="M50 136 Q44 126 52 120 L72 100" stroke="#6b4422" stroke-width="2.6" fill="none"/><circle cx="50" cy="132" r="6" fill="#b9873f"' + OUT + "/>";
      case "hammer": return '<path d="M58 128 L58 100" stroke="#5a3418" stroke-width="2.4"/><rect x="51" y="94" width="14" height="7" fill="#6e6a62"' + OUT + "/>" + TIP(58, 97);
      case "dice": return '<rect x="55" y="120" width="5" height="12" rx="1" fill="#efe2c0"' + OUT + '/><rect x="61" y="121" width="5" height="12" rx="1" fill="#efe2c0"' + OUT + "/>";
      default: return "";
    }
  }
  // Hair first (a cap of dark hair over the skull), then the headdress on top of it.
  const HAIR = (c) => '<path d="M50 52 Q49 39 62 37.5 Q72 37.5 75.5 44 Q64 40.5 53 53 Z" fill="' + c + '"' + OUT + "/>";
  const KNOT = (c) => '<circle cx="57" cy="34.5" r="5.8" fill="' + c + '"' + OUT + "/>";
  const GOLD = "#d9a53a";
  // A crown for the great ones of the epic: twice the height of a kirita, with a fan of gold behind
  // the head as on the great leather puppets, and set with the hero's own stones. o.tall scales its
  // height, o.broad makes it broad and spiked instead, o.white is white and gold.
  function crownSvg(o) {
    const tall = o.tall || 1, top = 46 - 40 * tall, y1 = 46 - 22 * tall, y2 = 46 - 32 * tall, gem = o.gem || "#b2432a";
    const body = o.broad ? "M50 46 L50 34 Q51 24 62 22 Q73 24 74 34 L74 46 Z"
      : "M50.5 46 L52 37 L54.5 37 L55.5 " + y1 + " L58 " + y1 + " L59 " + y2 + " L60.6 " + y2 + " Q62 " + (top - 2) + " 63.4 " + y2 + " L65 " + y2 + " L66 " + y1 + " L68.5 " + y1 + " L69.5 37 L72 37 L73.5 46 Z";
    const metal = o.white ? "#efe6cf" : GOLD;
    const fanD = "M52 46 Q38 47 34 37 Q40 39 45 37 Q38 31 40 24 Q47 31 52 34 Q50 28 53 23 Q57 30 57 36 Z"; // low, swept back: its tall points read as horns (owner, 5 November)
    const gems = (o.broad ? [[56, 38], [62, 34], [68, 38]] : [[62, 40], [62, 46 - 27 * tall], [56.5, 41], [67.5, 41]]).map(([x, y], i) => '<circle cx="' + x + '" cy="' + y + '" r="' + (i ? 1.5 : 2.4) + '" fill="' + (Array.isArray(gem) ? gem[i % gem.length] : gem) + '" stroke="#24120a" stroke-width=".7"/>').join("");
    const rib = o.white ? "#a8956a" : "#7a5418", tc = o.trim || "#b2432a";
    const fan = '<path d="' + fanD + '" fill="' + metal + '"' + OUT + "/>" +
      '<path d="M51 44 Q42 43 37 38.5 M51.5 40 Q45 34 42.5 26 M54.6 37 Q54 30 54 24.5" fill="none" stroke="' + rib + '" stroke-width="0.9"/>' +
      holeRow("M49 42.2 Q43 40.6 40 38", metal, 2.4, 1) + holeRow("M49.8 38 Q46.5 32.5 45 28", metal, 2.4, 1);
    // The tiers, each outlined in the trim colour with a row of holes in it.
    const tiers = o.broad ? '<path d="M50 34 h24" stroke="' + tc + '" stroke-width="1.5"/>' + holeRow("M51.6 31 Q62 26.4 72.4 31", metal, 2.4, 1) + holeRow("M51.2 39 H72.8", metal, 2.6, 1)
      : '<path d="M51.9 37 h20.2 M55.5 ' + f2(y1) + " h13 M59 " + f2(y2) + ' h6" stroke="' + tc + '" stroke-width="1.5"/>' +
        holeRow("M53.6 " + f2((y1 + 37) / 2) + " H70.4", metal, 2.5, 1) + holeRow("M59.6 " + f2(y1 - 2.1) + " H64.6", metal, 2.4, 1);
    return fan +
      (o.broad ? '<path d="M50 34 L48 27 L53 30 L56 22 L59 27 L62 18 L65 27 L68 22 L71 30 L76 27 L74 34" fill="' + metal + '"' + OUT + "/>" : "") +
      '<path d="' + body + '" fill="' + metal + '"' + OUT + "/>" + tiers +
      '<path d="M50.6 43 Q62 39 73.4 43" fill="none" stroke="' + (o.trim || "#b2432a") + '" stroke-width="2"/>' + gems +
      (o.broad ? "" : '<circle cx="62" cy="' + (top - 3) + '" r="2.8" fill="' + metal + '"' + OUT + "/>") +
      '<path d="M50.5 45 Q62 38.5 74.5 44 L74 47 Q62 41.5 51 48 Z" fill="' + metal + '"' + OUT + "/>";
  }
  // A leather helmet with a spike and a neck flap, for soldiers; a horsehair crest on it for horsemen and champions.
  const HELMET = "M48 51 Q46 31 63 30 Q79 31 77 47 L73 47 Q63 41 53 53 Z";
  const helmetSvg = (t) => '<path d="' + HELMET + '" fill="#7a5a3a"' + OUT + "/>" + holeRow("M51 46.4 Q50.6 34.4 63 33.4 Q74.4 34 74.6 43.4", "#7a5a3a", 2.6) +
    '<path d="M50 41 Q63 32 77 44" fill="none" stroke="' + t + '" stroke-width="2.2"/><path d="M63 30 L63 22 M60 23 h6" stroke="#24120a" stroke-width="1.6" stroke-linecap="round"/><path d="M48 48 L43 64 L52 61 Z" fill="#6b4a2c"' + OUT + "/>";
  const TURBAN = "M49 48 Q48 30 63 28 Q78 30 77 45 Q63 38 49 48 Z";
  function headgearSvg(kind, trim, cloth, hair, elder, spec = {}) {
    const hat = spec.hat || cloth, ht = spec.hatTrim || trim;
    const band = (c) => '<path d="M50.5 45 Q62 38.5 74.5 44 L74 47 Q62 41.5 51 48 Z" fill="' + c + '"' + OUT + "/>";
    const fillet = band(trim), goldFillet = band(GOLD);
    switch (kind) {
      // A tall tiered crown, with a jewel at the front and a fan of ornament behind the ear.
      // A stepped temple crown, as the leather puppets of the south wear it.
      case "kirita": return '<path d="M52 45 Q46 42 47.5 35 Q51 40 55 41 Z" fill="' + GOLD + '"' + OUT + "/>" +
        '<path d="M53 43 L54 36 L56 36 L57 30 L59 30 L60 25 Q62 21 64 25 L65 30 L67 30 L68 36 L70 36 L71 43 Z" fill="' + GOLD + '"' + OUT + "/>" + holeRow("M55.4 41 H68.6", GOLD, 2.4, 1) + holeRow("M58 35.4 H66", GOLD, 2.4, 1) +
        '<path d="M55 38.5 L69 38.5 M57 32.5 L67 32.5" stroke="' + trim + '" stroke-width="1.3" fill="none"/><circle cx="62" cy="35.5" r="1.5" fill="' + trim + '"/><circle cx="62" cy="21" r="2.2" fill="' + GOLD + '"' + OUT + "/>" + goldFillet + '<circle cx="70" cy="44" r="1.7" fill="' + trim + '"/>';
      // A smaller crown for younger princes and lesser kings.
      case "mukuta": return '<path d="M54 43 L56 32 Q62 24 68 32 L70 43 Z" fill="' + GOLD + '"' + OUT + "/>" + holeRow("M56 40.6 H68", GOLD, 2.4, 1) + '<path d="M56 37 Q62 33 68 37" stroke="' + trim + '" stroke-width="1.3" fill="none"/><circle cx="62" cy="24.5" r="2" fill="' + GOLD + '"' + OUT + "/>" + goldFillet;
      // A top knot tied with a coloured fillet.
      // Elders wear the knot bare: a sage's matted hair, with a string of rudraksha.
      case "jata": return KNOT(hair) + (elder ? '<path d="M52.5 36 Q57 31.5 61.5 36" stroke="#6b3a1c" stroke-width="1.4" stroke-dasharray="0.1 2" stroke-linecap="round" fill="none"/>' : '<path d="M52.5 36 Q57 32 61.5 36" stroke="' + trim + '" stroke-width="1.6" fill="none"/>' + fillet);
      case "band": return KNOT(hair) + fillet + '<circle cx="71" cy="44.6" r="1.9" fill="' + cloth + '"' + OUT + "/>";
      // A peacock feather in the knot, as the Yadavas wear it.
      case "peacock": return KNOT(hair) + '<path d="M57 32 Q56 20 62 13" stroke="#3f6b3a" stroke-width="1.2" fill="none"/><ellipse cx="62.5" cy="12" rx="3.6" ry="4.6" fill="#2f7d55"' + OUT + '/><ellipse cx="62.6" cy="12.4" rx="1.8" ry="2.4" fill="#2d5aa0"/><circle cx="62.7" cy="12.6" r="0.9" fill="#d9c27a"/>' + fillet;
      // Feathers stuck in the knot, for the forest people.
      case "feather": return KNOT(hair) + '<path d="M55 32 Q48 20 55 10 Q59 22 57 32 Z" fill="#3f6b3a"' + OUT + '/><path d="M59 32 Q62 21 68 16 Q66 26 61 33 Z" fill="#b2432a"' + OUT + "/>" + fillet;
      case "crown": return crownSvg(spec.crown || {});
      // A bandit's head scarf, its ends trailing behind.
      case "scarf": return '<path d="M50 47 Q52 36 63 35 Q74 36 76 44 L75 48 Q63 42 51 50 Z" fill="' + hat + '"' + OUT + '/><path d="M51 49 L39 58 L43 51 L36 55 L46 46 Z" fill="' + hat + '"' + OUT + '/><circle cx="51" cy="47" r="2.6" fill="' + hat + '"' + OUT + "/>";
      // A palace guard's tall wrapped turban.
      case "turban": return '<path d="' + TURBAN + '" fill="' + hat + '"' + OUT + "/>" + holeRow("M51.4 40.6 Q62 30.4 75.4 37", hat, 2.6) + '<path d="M50 43 Q62 32 76 40 M50 37 Q62 28 74 34" fill="none" stroke="' + ht + '" stroke-width="1.4"/><path d="M63 28 Q66 22 70 24 Q66 26 65 29 Z" fill="' + ht + '"' + OUT + "/>";
      case "helmet": return helmetSvg(ht);
      // The horsehair falls from the helmet's crown down the back of the head (it swept up and back like a horn: owner, 5 November).
      case "crest": return '<path d="M62 24 Q53 21 47 28 Q41 35 41.5 46 Q44.5 38 49.5 34 Q46.5 41 47.5 50 Q51 39 56.5 32 Q58 28 63 27 Z" fill="' + hat + '"' + OUT + "/>" + helmetSvg(ht) + '<circle cx="63" cy="23.5" r="2.2" fill="' + ht + '"' + OUT + "/>";
      // An archer's close cap with one white feather.
      case "capfeather": return '<path d="M50 47 Q50 34 63 33 Q76 34 76 45 Q63 39 50 47 Z" fill="' + hat + '"' + OUT + '/><path d="M51 44 Q63 37 75 43" fill="none" stroke="' + ht + '" stroke-width="1.6"/><path d="M54 36 Q46 20 52 8 Q58 22 57 35 Z" fill="#e9dcc0"' + OUT + '/><path d="M54 33 L53 14" stroke="#24120a" stroke-width=".7"/>';
      default: return "";
    }
  }

  // Marks of the great ones. Age in the beard, hung on the jaw so it moves with speech: Bhishma's long
  // and white to the waist, Drona's grey and forked to the chest, each with a drooping moustache.
  const BEARD = {
    long: '<path d="M54 57 Q51 72 55 86 Q59 100 64 110 Q67 99 71 88 Q77 73 74.5 58 Q64 66 54 57 Z" fill="#f6f2e6"' + OUT + '/><path d="M58 66 Q59 84 63 102 M63 66 Q64 84 65.5 104 M68 66 Q69 80 68 96 M72 63 Q73 74 71 86" fill="none" stroke="#b9b0a0" stroke-width=".8"/><path d="M68 59.5 Q74 57 79 60 Q80 66 77 70 Q76 63 70 62 Z" fill="#f6f2e6"' + OUT + "/>",
    forked: '<path d="M55 58 Q53 68 57 78 Q61 86 63 92 Q65 86 66 82 Q68 87 71 89 Q71 80 72 74 Q75 66 73 58 Q64 65 55 58 Z" fill="#b3ab9c"' + OUT + '/><path d="M59 66 Q60 76 62 86 M64 66 Q65 74 66 81 M69 64 Q70 72 70 82" fill="none" stroke="#7d7568" stroke-width=".8"/><path d="M68 59.5 Q74 57.4 78.6 60 Q79 64 77 67 Q75.6 62.6 70 62 Z" fill="#b3ab9c"' + OUT + "/>"
  };
  // Karna's great gold earrings, born with him; the jewel glowing in Ashwatthama's brow.
  const EARRING = '<circle cx="56.5" cy="60" r="5.4" fill="' + GOLD + '"' + OUT + '/><circle cx="56.5" cy="60" r="2.4" fill="#b2432a"' + OUT + '/><path d="M51.5 60 h10" stroke="#fff3c4" stroke-width=".6"/>';
  const BROWGEM = '<circle cx="72.6" cy="44" r="2.3" fill="#9fe8ff" stroke="#24120a" stroke-width=".8"/><circle cx="72.6" cy="44" r="5" fill="#9fe8ff" opacity=".35"/>';
  // Drona's water-pot (kamandalu) at his hip.
  const KAMANDALU = '<path d="M64 112 Q60 122 64 128 Q70 132 76 128 Q80 122 76 112 Z" fill="#8a5a2c"' + OUT + '/><path d="M68 112 Q70 104 74 106 L72 112" fill="none" stroke="#24120a" stroke-width="1.2"/><path d="M76 116 Q82 112 84 114" fill="none" stroke="#5a3418" stroke-width="1.8"/>';
  // Arjuna's twin quivers: the second, behind the first.
  const QUIVER2 = '<path d="M50 74 L42 76 L40 106 L46 106 Z" fill="#6b4422"' + OUT + '/><path d="M44 75 L40 64 M46.5 75 L44 64 M48.5 75 L48 64" stroke="#efe2c0" stroke-width="1.2"/><path d="M40 64 l-1.6 -3 l3 1 M44 64 l-1 -3 l2.6 1.6 M48 64 l0 -3 l2 2" fill="#b2432a" stroke="none"/>';
  // A champion's gold scale armour, with a shoulder piece.
  const SCALE = '<path d="M48 72 Q60 64 72 72 L71 106 Q60 112 49 106 Z" fill="' + GOLD + '"' + OUT + '/><g fill="none" stroke="#7a5418" stroke-width=".9"><path d="M50 78 q3 3 6 0 q3 3 6 0 q3 3 6 0"/><path d="M50 85 q3 3 6 0 q3 3 6 0 q3 3 6 0"/><path d="M50 92 q3 3 6 0 q3 3 6 0 q3 3 6 0"/><path d="M50 99 q3 3 6 0 q3 3 6 0 q3 3 6 0"/></g><path d="M44 72 Q48 64 56 68 L54 78 Q47 78 44 72 Z" fill="' + GOLD + '"' + OUT + "/>";
  // A round hide shield with a gold boss, on the back forearm.
  const shieldSvg = (r, t) => '<circle cx="58" cy="112" r="' + r + '" fill="#8a5a2c"' + OUT + '/><circle cx="58" cy="112" r="' + (r - 3.5) + '" fill="none" stroke="' + t + '" stroke-width="2"/><circle cx="58" cy="112" r="4" fill="' + GOLD + '"' + OUT + "/>" +
    holeRow("M" + (58 - r + 6.5) + " 112 a" + (r - 6.5) + " " + (r - 6.5) + " 0 1 0 " + 2 * (r - 6.5) + " 0 a" + (r - 6.5) + " " + (r - 6.5) + " 0 1 0 " + -2 * (r - 6.5) + " 0", "#8a5a2c", 3);
  U.shieldSvg = shieldSvg; // (a shield lying on the fight's ground: ui/realtime.js)

  // A fallen figure's weapon lies on the ground beside it (a live figure lets go of it as it falls:
  // puppet-anim.js). For each kind: the top and foot of the weapon along its length (in the hand's
  // frame, held upright), its tilt in the fist, and how far it reaches below its length once laid
  // down pointing forward and pointing back. dir 1: the figure lies forward (in a fight, toward the
  // middle of the stage); -1: backward. The ground is y = GROUND, the weapon's middle X along it.
  const LIE = { bow: [80, 172, 0, 5, 12], mace: [33, 140, 20, 12.5, 12.5], sword: [68, 136, 16, 7, 7], woodsword: [68, 136, 16, 7, 7], spear: [40, 177, 0, 6, 6],
    club: [66, 128, 0, 10, 5], staff: [99, 201, 0, 3.5, 1], plough: [54, 165, 0, 16, 1.5], whip: [90, 128, 0, 26, 1], dagger: [98, 132, 38, 4.5, 4.5], hammer: [94, 128, 0, 7, 7] };
  U.itemSvg = (kind, trim) => itemSvg(kind, trim || "#c9a24e");
  U.GROUND = 201; // a little in front of the feet (197): beside the body, not under it
  U.itemLie = function (kind, dir) {
    const L = LIE[kind]; if (!L) return null;
    const d = dir > 0 ? 1 : -1, [yT, yB, tilt, bf, bb] = L;
    const mid = 58 + d * ((126 - yT) - (yB - 126)) / 2;
    return { a: d * 90 - tilt, tx: 60 + d * 90 - mid, ty: U.GROUND - (d > 0 ? bf : bb) - 126, cx: 58, cy: 126, sy: 1 };
  };
  // A shield lies flat on the ground, its rim towards us, a little ahead of the feet.
  U.shieldLie = (r, dir) => ({ a: 0, tx: 60 + (dir > 0 ? 1 : -1) * 34 - 58, ty: U.GROUND - r * 0.42 - 112, cx: 58, cy: 112, sy: 0.42 });
  // The transform that puts a dropped thing in place: about its centre (cx, cy), turned by a,
  // squashed by sy (a shield seen lying), moved by (tx, ty).
  U.lieTransform = (o) => "translate(" + (o.cx + o.tx).toFixed(2) + " " + (o.cy + o.ty).toFixed(2) + ") scale(1 " + o.sy.toFixed(3) + ") rotate(" + o.a.toFixed(2) + ") translate(" + -o.cx + " " + -o.cy + ")";

  // Things that are not people, cut from the same leather: a cart, an elephant, and the Narayana
  // weapon as a light in the sky. They have no joints, so they keep their CSS poses (no rig).
  const THING = {
    cart: [200, 270, '<path d="M150 150 L198 136" stroke="#5a3418" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M24 104 Q90 40 158 104 Z" fill="#c9a24e"' + OUT + '/>' + holeRow("M36 98 Q90 50 146 98", "#c9a24e", 4.2, 1.6) + holeRow("M60 100 Q90 70 122 100", "#c9a24e", 4.2, 1.6) + '<path d="M40 104 Q90 58 142 104" fill="none" stroke="#8a3a2a" stroke-width="1.6"/>' +
      '<path d="M26 102 L26 132 M60 102 L60 132 M94 102 L94 132 M128 102 L128 132 M156 102 L156 132 M20 102 L162 102" stroke="#6b4422" stroke-width="3.4"/>' +
      '<rect x="18" y="128" width="146" height="22" rx="2" fill="#8a5a2c"' + OUT + '/>' + holeRow("M24 133.5 H158 M24 144.5 H158", "#8a5a2c", 4.4, 1.6) +
      '<g fill="none" stroke="#3a2412"><circle cx="82" cy="160" r="36" stroke-width="7"/><path d="M82 124 V196 M46 160 H118 M57 135 L107 185 M107 135 L57 185" stroke-width="3"/></g><circle cx="82" cy="160" r="7" fill="' + GOLD + '"' + OUT + "/>"],
    elephant: [240, 250, '<path d="M32 98 Q14 124 22 146" fill="none" stroke="#24120a" stroke-width="3"/>' +
      '<g style="filter:brightness(0.68)"><path d="M58 140 L80 140 L78 196 L60 196 Z M150 140 L170 140 L168 196 L152 196 Z" fill="#7d7062"' + OUT + "/></g>" +
      '<path d="M28 130 Q22 70 96 62 Q162 56 186 86 Q198 104 192 132 L184 150 L40 152 Z" fill="#8f8172"' + OUT + "/>" + holeRow("M36 132 Q100 144 184 130", "#8f8172", 4.6, 1.7) +
      '<path d="M56 68 L150 62 L156 122 Q105 134 52 122 Z" fill="#a3302a"' + OUT + '/><path d="M54 112 Q105 124 154 112" fill="none" stroke="' + GOLD + '" stroke-width="3" stroke-dasharray="1 5" stroke-linecap="round"/><path d="M56 68 L150 62" stroke="' + GOLD + '" stroke-width="3"/>' +
      '<path d="M72 64 L72 38 L130 34 L130 62 Z" fill="' + GOLD + '"' + OUT + '/><path d="M66 40 Q101 14 136 36 Z" fill="#a3302a"' + OUT + "/>" +
      '<path d="M36 140 L60 140 L58 198 L38 198 Z M138 140 L160 140 L158 198 L140 198 Z" fill="#8f8172"' + OUT + "/>" +
      '<path d="M176 64 Q214 60 218 100 L216 128 L188 134 Z" fill="#8f8172"' + OUT + "/>" +
      '<path d="M212 100 Q232 128 224 164 Q220 186 232 192" fill="none" stroke="#24120a" stroke-width="15" stroke-linecap="round"/><path d="M212 100 Q232 128 224 164 Q220 186 232 192" fill="none" stroke="#8f8172" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M206 122 Q222 136 238 126" fill="none" stroke="#efe2c0" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M178 74 Q154 80 156 116 Q164 134 184 122 Z" fill="#7d7062"' + OUT + '/><circle cx="202" cy="86" r="2.6" fill="#24120a"/>' +
      '<path d="M190 70 Q200 60 212 66" fill="none" stroke="' + GOLD + '" stroke-width="3"/>'],
    light: [160, 200, '<defs><radialGradient id="pp-nw"><stop offset="0" stop-color="#fffbe6"/><stop offset="0.35" stop-color="#ffd27a"/><stop offset="0.7" stop-color="#ff8a2a" stop-opacity="0.55"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="80" cy="74" r="74" fill="url(#pp-nw)"/>' +
      '<g stroke="#ffe7a8" stroke-width="2.4" stroke-linecap="round" opacity="0.9"><path d="M80 14 V36 M80 112 V134 M20 74 H42 M118 74 H140 M38 32 L53 47 M107 101 L122 116 M122 32 L107 47 M53 101 L38 116"/></g>' +
      '<circle cx="80" cy="74" r="20" fill="none" stroke="#fff3c8" stroke-width="3"/><circle cx="80" cy="74" r="8" fill="#fffbe6"/>' +
      '<g stroke="#ffb54a" stroke-width="2" stroke-linecap="round" opacity="0.75"><path d="M40 130 L30 190 M66 140 L60 196 M94 140 L100 196 M120 130 L132 190"/></g>']
  };
  U.thingSvg = function (kind, o = {}) {
    // [width, height, drawing]: the drawing stands on y 200; a taller view draws it smaller (the cart).
    const t = THING[kind], h = o.h || 120;
    return '<svg class="pp thing thing-' + kind + " pose-stand" + (o.flip ? " flip" : "") + '" viewBox="0 ' + (200 - t[1]) + " " + t[0] + " " + t[1] + '" width="' + Math.round(h * t[0] / t[1]) + '" height="' + h + '" aria-hidden="true"><g class="pp-all"><g class="pp-body">' + t[2] + "</g></g></svg>";
  };

  U.puppet = function (spec, o = {}) {
    if (!spec) return "";
    if (spec.thing && THING[spec.thing]) return U.thingSvg(spec.thing, o);
    const [skin, cloth, trim] = spec.palette || PALETTE.none;
    const she = spec.pronoun === "she", they = spec.pronoun === "they";
    const stage = spec.stage || "adult";
    const grown = stage === "adult" || stage === "elder";
    // Strength shows in the size: a bandit is small, a champion large, the great ones larger still once grown.
    const scale = o.fit ? (stage === "child" ? 0.86 : 1) : { child: 0.66, youth: 0.86, adult: 1, elder: 0.96 }[stage] * (grown && spec.size ? spec.size : spec.big ? 1.1 : 1);
    const gear = (g) => !!spec.gear && spec.gear.includes(g);
    const headScale = stage === "child" ? 1.38 : 1.14;
    // Only a known temperament id becomes a class (a stored figure or a pasted save code could hold anything).
    const bear = spec.temper && /^[a-z_]+$/.test(spec.temper) ? " t-" + spec.temper : "";
    const pose = o.pose || (spec.dead ? "dead" : "stand");
    // How someone stands when at rest (a bandit's stoop, a guard square behind his spear): a class for
    // the CSS pose, and data-stance for a live figure (puppet-anim.js). Only a known kind of word.
    const stance = spec.stance && /^[a-z]+$/.test(spec.stance) ? spec.stance : "";
    const clsx = ["pp", "pose-" + pose, "st-" + stage, bear, stance ? "sx sx-" + stance : "", spec.item && /^[a-z]+$/.test(spec.item) && pose !== "dead" ? "hold-" + spec.item : "", spec.glow ? "glow" : "", spec.limp ? "limp" : "", spec.sling ? "sling" : "", spec.chained ? "chained" : "", spec.dead ? "dead" : "", o.flip ? "flip" : "", o.cls || ""].filter(Boolean).join(" ");
    const h = o.h || 120;
    // Every piece is cut round its own joints: the joint pivots (screens.css, puppet-anim.js) are
    // shoulder 58,73; elbow 58,98; hip 60,117; knee 60,152; and the hand holds things at 58,126. Each
    // piece ends in a half circle about its pivot, the same size as the piece it meets, and a disc
    // tied with a thread knot covers the overlap, so no pose can open a gap at a joint.
    // Clothing: a dhoti to the knee (its front falls with each thigh, as on the leather puppets), or a
    // long sari; a shawl over a dhoti; armour for Karna.
    const torn = gear("torn");
    const panels = !she && !torn; // the dhoti's legs, cut with the thighs
    const skirt = she ? "M48 106 L72 106 Q78.6 146 84.8 185.4 Q61 189 37.2 185.4 Q41.4 146 48 106 Z"
      : "M48.6 106.6 L71.4 106.6 Q75.2 127 78.4 148.4 Q60 151.6 41.6 148.4 Q44.8 127 48.6 106.6 Z";
    const skirtHem = she ? hemSvg(38.2, 83.8, 179, 37.2, 84.8, 185.4, 0.9, trim, cloth, 9) : torn ? "" : hemSvg(42.4, 77.6, 143.4, 41.6, 78.4, 148.4, 0.8, trim, cloth, 7);
    const torso = "M45 72 Q52 64.6 61 64.6 Q70 64.8 75.6 71.4 Q75.6 80 73 89 Q70.4 98 68.8 108 L68.4 116 L51.6 116 L51.2 108 Q48.6 97 47 88 Q44.6 80 45 72 Z";
    // The far arm and leg: solid leather in shadow, never see-through (see-through limbs read as ghosts).
    const back = 'style="filter:brightness(0.68)"';
    // Curved, tapered limbs: the calf and forearm swell, the knee, ankle and wrist narrow.
    const thighSkin = '<path d="M52.8 117 A7.2 7.2 0 0 1 67.2 117 C67.6 128 66.6 141 65 152 A5 5 0 0 1 55 152 C54.2 141 52.4 128 52.8 117 Z" fill="' + skin + '"' + OUT + "/>";
    // The dhoti's front over the thigh: pleated, with its own printed hem and scallops, tied on at the hip.
    const thighCloth = (far) => panels ? '<path d="M51.4 117 A8.6 8.6 0 0 1 68.6 117 C69.6 127 70.6 137 71.2 146.4 Q60.4 149.6 49.6 146.4 C50 137 50.6 127 51.4 117 Z" fill="' + cloth + '"' + OUT + "/>" +
      '<path d="M58.6 121 Q58 133 57.4 142 M62.6 121 Q63.6 133 64.6 142" fill="none" stroke="' + EDGE + '" stroke-width="0.7" stroke-opacity="0.38"/>' +
      hemSvg(50.2, 70.6, 141.6, 49.6, 71.2, 146.4, 1.6, trim, cloth, 4, far) + (far ? "" : disc(60, 117, 4.4, cloth)) : "";
    const shin = '<path d="M55 152 A5 5 0 0 1 65 152 C65.4 161 63.8 173 62.8 184 L57.2 184 C56.4 177 53.4 165 55 152 Z" fill="' + skin + '"' + OUT + "/>" +
      '<path d="M57 182 L63 182 Q64.6 186.2 70 187.4 Q78.6 189 79.2 191.4 Q78.4 193.4 72 193.4 L56.6 193.4 Q55.4 187.6 57 182 Z" fill="' + skin + '"' + OUT + "/>" +
      // a gold anklet with a fringe of bells
      '<path d="M56.6 179.2 L63.4 179.2 L63.2 182.4 L56.8 182.4 Z" fill="' + GOLD + '"' + OUT_F + "/>" + '<path d="M57.4 184 H63" stroke="' + GOLD + '" stroke-width="1.5" stroke-dasharray="0 1.9" stroke-linecap="round"/>' +
      disc(60, 152, 3.7, skin);
    const leg = (cls, far) => '<g class="j ' + cls + '"' + (far ? " " + back : "") + ">" + thighSkin + '<g class="j ' + cls.replace("leg", "shin") + '">' + shin + "</g>" + thighCloth(far) + "</g>";
    const upper = '<path d="M52 73 A6 6 0 0 1 64 73 C64.8 80 63.6 90 62.4 98 A4.4 4.4 0 0 1 53.6 98 C52.4 90 51.4 80 52 73 Z" fill="' + skin + '"' + OUT + "/>";
    // A gold armlet with a raised point and a row of holes.
    const armlet = '<path d="M51.6 79.4 Q58 78.2 64.6 79.4 L64.3 83.6 Q58 82.4 51.8 83.6 Z M59.6 79 L62 75.4 L64.2 79.2 Z" fill="' + GOLD + '"' + OUT_F + "/>" + holeRow("M53 81.5 Q58 80.4 63.4 81.5", GOLD, 2.1, 0.95);
    // The forearm, a gold bracelet (more bangles for a woman), and a full hand with the thumb forward.
    const fore = '<path d="M53.6 98 A4.4 4.4 0 0 1 62.4 98 C63.4 104 62.2 114 61 121.4 L55 121.4 C54 114 52.8 104 53.6 98 Z" fill="' + skin + '"' + OUT + "/>" +
      '<path d="M55 120.4 Q52.4 122.2 52.6 126.4 Q53 131.8 58.2 132.2 Q62.8 132.2 63.6 128 Q64 126.2 63.2 125 L65.6 123.2 Q66.6 121.4 64.8 120.8 Q63 120.6 61.2 122 L61 120.4 Z" fill="' + skin + '"' + OUT + "/>" +
      '<path d="M55.2 127.6 Q58.4 129.2 62.2 127.4" fill="none" stroke="' + EDGE + '" stroke-width="0.6" stroke-opacity="0.7"/>' +
      '<path d="M54.6 116 L61.6 116 L61.3 119.6 L54.9 119.6 Z" fill="' + GOLD + '"' + OUT_F + "/>" +
      (she ? '<path d="M54.4 112.6 L62 112.6 M54.3 110.4 L62.2 110.4" stroke="' + trim + '" stroke-width="1.3"/>' : "");
    const elbow = disc(58, 98, 3.6, skin), shoulder = disc(58, 73, 4.4, skin);
    const neck = '<path d="M56 56 L64.2 56 L64.8 66.6 Q60 68.4 55.4 66.6 Z" fill="' + skin + '"' + OUT + "/>";
    // No rods on the hands: drawn in the forearm's frame, a hand rod swung out ahead of every raised
    // or reaching arm like a stick. The body's main rod is enough to say "puppet".
    const rod = "";
    // In chains while imprisoned; afterwards, the broken iron still on one wrist.
    const manacle = spec.chained ? '<rect x="54" y="117" width="8" height="4" fill="#5d5d5d"' + OUT + "/>" : "";
    const cuff = spec.cuffed ? '<rect x="53.5" y="114" width="9" height="3.6" fill="#6a6a6a"' + OUT + '/><path d="M62.5 115.8 l3 1.6" stroke="#6a6a6a" stroke-width="1.4"/>' : "";
    // The face in profile: brow, long nose, the large almond eye of a puppet with its line of kohl; a
    // tilak on the brow, large round earrings, a curled moustache on grown men, a bun with flowers and a
    // nose ring on women.
    const hair = stage === "elder" ? "#d4ccbc" : "#1d1410";
    const face = "M62 40 C70 40 75 45 75.5 50 L80 54 L75.5 56 C75 61 71 64 64 64 C55 64 50 58 50 51 C50 45 55 40 62 40 Z";
    const head =
      (she ? '<path d="M48 55 Q42 74 45 94" stroke="' + hair + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' : "") +
      '<path class="pp-face" d="' + face + '" fill="' + skin + '"' + OUT + "/>" +
      HAIR(hair) +
      (she ? '<circle cx="49" cy="48" r="6.6" fill="' + hair + '"' + OUT + '/><path d="M44 44 Q49 40 54 44" stroke="#f3ead2" stroke-width="1.8" stroke-dasharray="1.2 1.6" fill="none"/>' : "") +
      '<path d="M62.4 49.3 Q67.8 45.4 73.6 48.7 Q68.2 52.6 62.4 49.3 Z" fill="#fff3d6" stroke="' + EDGE + '" stroke-width="0.8"/><circle cx="68.6" cy="49" r="1.65" fill="' + EDGE + '"/>' +
      '<path d="M62.4 49.3 L59.8 48.3" stroke="' + EDGE + '" stroke-width="0.8" stroke-linecap="round"/>' +
      '<path d="M62.2 45.3 Q68 42.4 74 45.6" stroke="' + EDGE + '" stroke-width="1.05" fill="none" stroke-linecap="round"/>' +
      '<path d="M73.6 41.4 L74.3 45" stroke="#c0281e" stroke-width="1.3" stroke-linecap="round"/>' +
      (spec.eye ? '<path d="M61 43.4 L76 53.4" stroke="' + EDGE + '" stroke-width="2.4"/><ellipse cx="68.2" cy="49" rx="5.2" ry="3.6" fill="#2a1a12"/>' : "") +
      (!she && grown && !spec.beard ? '<path d="M71 58.2 Q74.5 56.6 77.4 58.4 Q78.6 60.4 76.6 60.6 Q76.8 59.2 74.6 59.2 Q72.8 59.4 71 58.2 Z" fill="' + hair + '"/>' : "") +
      // The lower jaw is a separate piece on a hinge (the beard rides on it), so the puppet can speak.
      '<g class="jaw"><path d="M56 59 Q63 67 73 60 L73.5 62 Q63 71 55.5 61 Z" fill="' + skin + '"' + OUT + "/>" +
      (spec.beard ? '<path d="M58 60 Q63 76 71 63 Q72.5 60 72 58 Q66 64 58 60 Z" fill="' + hair + '"' + OUT + "/>" : "") + (BEARD[spec.beard] || "") + "</g>" +
      (she ? '<circle cx="78.6" cy="57.2" r="1.7" fill="none" stroke="' + trim + '" stroke-width="0.9"/>' : "") +
      (stage !== "child" ? '<circle cx="56.5" cy="58.5" r="3.1" fill="' + GOLD + '"' + OUT_F + '/><circle cx="56.5" cy="58.5" r="1.3" fill="' + trim + '"/>' : "") +
      headgearSvg(she ? (spec.headgear === "kirita" || spec.headgear === "mukuta" ? spec.headgear : null) : spec.headgear || (they ? "band" : "jata"), trim, cloth, hair, stage === "elder", spec) +
      (gear("earrings") ? EARRING : "") + (gear("browgem") ? BROWGEM : "");
    // Behind everything: Arjuna's second quiver, once he carries the Gandiva.
    const behind = gear("quivers") && grown ? QUIVER2 : "";
    // On the back arm: a round hide shield, or a horseman's small one (larger since 6 November, owner: "increase the
    // size of the shields, they are too small": 19 -> 26, the buckler 13 -> 17).
    const shieldR = gear("shield") ? 26 : gear("buckler") ? 17 : 0;
    // Fallen, the shield and the weapon are no longer held: they lie on the ground beside the body.
    const dead = pose === "dead", ldir = o.fwd ? 1 : -1, laid = dead && spec.item && LIE[spec.item];
    const backHand = shieldR && !dead ? '<g class="it-s" data-r="' + shieldR + '">' + shieldSvg(shieldR, trim) + "</g>" : "";
    const onGround = !dead ? "" : (shieldR ? '<g class="it-down it-s-down" transform="' + U.lieTransform(U.shieldLie(shieldR, ldir)) + '">' + shieldSvg(shieldR, trim) + "</g>" : "") +
      (laid ? '<g class="it-down" transform="' + U.lieTransform(U.itemLie(spec.item, ldir)) + '">' + itemSvg(spec.item, trim, { tips: gear("gandiva") && grown, studs: spec.studs }) + "</g>" : "");
    // Over the body: a leather cuirass, gold scale armour, a guard's sash, a torn hem, a water-pot at the hip.
    const bodyGear = (torn ? '<path d="M41.6 146 L43 158 L46 150 L49 161 L53 150 L56 156 L60 149 L63 160 L67 150 L71 157 L74 149 L78.4 155 L78.4 146 Z" fill="' + cloth + '"' + OUT + '/><path d="M48 112 L72 112" stroke="#3a2412" stroke-width="2.4"/>' : "") +
      (gear("sash") ? '<path d="M50 72 L70 106" stroke="' + (spec.hat || trim) + '" stroke-width="3"/>' : "") +
      (gear("cuirass") ? '<path d="M50 74 Q60 68 70 74 L69 104 Q60 108 51 104 Z" fill="#7a5a3a"' + OUT + '/><path d="M52 84h16M52 94h16" stroke="' + trim + '" stroke-width="1.2"/>' + holeRow("M52.6 89 H67.4", "#7a5a3a", 2.6) : "") +
      (gear("scale") ? SCALE : "") + (gear("waterpot") ? KAMANDALU : "");
    const backItem = (spec.heir === "bow" && spec.item !== "bow" ? '<g class="it-back"><path d="M46 74 Q34 98 46 122" fill="none" stroke="#5a3418" stroke-width="2.4"/><path d="M46 74 L46 122" stroke="#efe2c0" stroke-width="0.6"/></g>' : "") +
      // An archer's quiver over the shoulder; a healer's satchel at the hip.
      (spec.item === "bow" ? '<path d="M44 76 L52 74 L50 104 L44 105 Z" fill="#7a4a24"' + OUT + '/><path d="M46 76 L45 66 M48.5 75.5 L48 65 M51 75 L51 64" stroke="#efe2c0" stroke-width="1.2"/><path d="M45 66l1.6-3 1.4 3M47.5 65l1.6-3 1.4 3M50 64l1.6-3 1.4 3" fill="#b2432a" stroke="none"/>' : "") +
      (spec.item === "bowl" ? '<path d="M70 104 L80 104 L81 116 L69 116 Z" fill="#8a6a3a"' + OUT + '/><path d="M70 104 Q75 100 80 104" fill="none" stroke="#5a3418" stroke-width="1.4"/><path d="M50 73 L76 104" stroke="#5a3418" stroke-width="1.2"/>' : "");
    // The pleats fall from the waist (a sari's in a darker fold down the front), under a sash with a
    // row of holes; the end of the sash hangs in front.
    const pleats = she ? '<path d="M60.4 110 L67 110 L75.4 179 L60.4 180.4 Z" fill="' + EDGE + '" fill-opacity="0.13"/><path d="M62.6 111 L64.2 179.4 M65 110.6 L70.2 179" fill="none" stroke="' + EDGE + '" stroke-width="0.7" stroke-opacity="0.38"/>'
      : panels ? "" : '<path d="M58 110 L55.6 146 M61.5 110 L61 147 M65 110 L67 146" fill="none" stroke="' + EDGE + '" stroke-width="0.7" stroke-opacity="0.38"/>';
    const sashEnd = '<path d="M64.6 109.4 L68.6 109 L73.2 132.4 L70.4 129.8 L68.2 133.8 Z" fill="' + trim + '"' + OUT_F + "/>" + holeRow("M67 111.6 L70.6 128", trim, 2.4, 0.9);
    const belt = pleats + '<path d="M48.4 104.4 Q60 106.6 71.6 104.4 L71.8 110 Q60 112.2 48.2 110 Z" fill="' + trim + '"' + OUT_F + "/>" + holeRow("M49.6 107.3 Q60 109.5 70.6 107.3", trim, 2.6, 1) +
      (spec.heir === "manuscript" ? '<rect x="62" y="104" width="9" height="5" rx="2" fill="#efe2c0"' + OUT + "/>" : "") +
      (spec.heir === "debt" ? '<path d="M53 110 q-4 6 0 9 q4 -3 0 -9 Z" fill="#8a6a3a"' + OUT + '/><path d="M51 111 l4 0" stroke="#24120a" stroke-width="0.8"/>' : "");
    // Necklaces drawn as strings of beads: a collar of large gold beads, a longer chain with a stone.
    // In profile they hang from the back of the neck down onto the chest, in front of the arm's shoulder.
    const chest = beads("M60.4 66.4 C62.4 75.4 66.8 79.6 72.6 78.6 C74 74.6 71 69.6 66.6 66.8", GOLD, 2.2, 2.85) +
      (stage !== "child" ? beads("M61.4 67.4 C63.2 80.4 67.4 87.6 72.4 86.6", GOLD, 1.35, 2.15) + '<path d="M72.4 86.4 L74.2 89.4 L72.2 92.4 L70.4 89.4 Z" fill="' + trim + '"' + OUT_F + "/>" : "") +
      (!she && stage !== "child" ? '<path d="M50 72 L68 107" stroke="#f3ead2" stroke-width="0.9" opacity="0.85"/>' : "") +
      // The end of the sari drawn up across the body and over the shoulder, its edge printed and pricked.
      (she ? '<path d="M71 106 L50 73 L57 70 L75 101 Z" fill="' + cloth + '"' + OUT + '/><path d="M71 106 L50 73" stroke="' + trim + '" stroke-width="1.6"/>' + holeRow("M72.6 101.6 L55.8 72.6", cloth, 2.5, 1) : "") +
      (spec.heir === "amulet" ? '<circle cx="60" cy="81" r="2.6" fill="' + trim + '"' + OUT + "/>" + (spec.cracked ? '<path d="M58.6 79.2 L61 81 L59.6 82.8" stroke="#24120a" stroke-width="0.7" fill="none"/>' : "") : "") +
      (spec.armour ? '<path d="M52 72 Q60 66 68 72 L67 100 Q60 104 53 100 Z" fill="' + trim + '" opacity="0.9"' + OUT + '/><path d="M54 80h12M54 88h12M55 96h10" stroke="#a37a2a" stroke-width="0.8"/>' : "") +
      // A scar: a patch of darker leather stitched over the wound, as puppet makers mend a tear.
      (spec.scar ? '<path d="M54.5 83 L64 81.5 L65.5 89.5 L56 91 Z" fill="#7a4628" opacity="0.9"' + OUT + '/><path d="M55 82.6 l1.2 1.4 M57.6 82.2 l1.2 1.4 M60.2 81.8 l1.2 1.4 M62.8 81.4 l1.2 1.4 M56.4 90.6 l1.2 -1.4 M59 90.2 l1.2 -1.4 M61.6 89.8 l1.2 -1.4 M64.2 89.4 l1.2 -1.4" stroke="#efe2c0" stroke-width="0.6"/>' : "");
    const svg =
      // Smaller figures (children) are drawn by widening the view around the feet, so every joint
      // keeps its own coordinates and the CSS joint origins stay exact.
      // A fallen figure lies along the ground, so it gets a long, low view.
      // In a fight (o.fwd) it lies forward, in a frame as tall as a standing figure's, so it keeps its size
      // on the stage and its ground stays the stage's ground; the frame runs forward the length of the body.
      (pose === "dead" && o.fwd ? '<svg class="' + clsx + ' fwd" viewBox="' + [60 - 22 / scale, 200 - 200 / scale, 200 / scale, 210 / scale].map((v) => +v.toFixed(2)).join(" ") + '" width="' + Math.round(h * 200 / 210) + '" height="' + h + '"' :
      pose === "dead" ? '<svg class="' + clsx + '" viewBox="-112 128 200 76" width="' + Math.round(h * 0.5 * 200 / 76) + '" height="' + Math.round(h * 0.5) + '"' :
      '<svg class="' + clsx + '" viewBox="' + [60 - 60 / scale, 200 - 200 / scale, 120 / scale, 210 / scale].map((v) => +v.toFixed(2)).join(" ") + '" width="' + Math.round(h * 120 / 210) + '" height="' + h + '"') +
      (stance ? ' data-stance="' + stance + '"' : "") + (o.label ? ' role="img" aria-label="' + U.esc(o.label) + '"' : ' aria-hidden="true"') + ">" +
      '<g class="pp-all">' +
      // The puppeteer's main rod, faintly, from the body down out of sight.
      (pose === "dead" ? "" : '<path class="rod main-rod" d="M60 112 L60 240" stroke="' + EDGE + '" stroke-width="1.1" opacity="0.45"/>') +
      '<g class="pp-body">' + behind +
        // Back limbs, a shade darker, behind the body.
        leg("legB", true) +
        '<g class="j armB" ' + back + ">" + upper + '<g class="j foreB">' + fore + elbow + manacle + rod + backHand + "</g></g>" +
        backItem +
        // Without the dhoti's legs (a sari, a bandit's rag), the near leg is cut behind the cloth.
        (panels ? "" : leg("legF")) +
        neck + '<path class="pp-torso" d="' + torso + '" fill="' + skin + '"' + OUT + "/>" + chest +
        '<path d="' + skirt + '" fill="' + cloth + '"' + OUT + "/>" + skirtHem + bodyGear + belt +
        '<g class="j head"><g transform="translate(62 64) scale(' + headScale + ') translate(-62 -64)">' + head + "</g></g>" +
        (panels ? leg("legF") : "") + sashEnd +
        '<g class="j armF">' + upper + armlet + shoulder + '<g class="j foreF">' + fore + elbow + manacle + cuff + (spec.item && !laid ? '<g class="it' + (WIELD.has(spec.item) ? " it-w" : "") + '"' + (/^[a-z]+$/.test(spec.item) ? ' data-k="' + spec.item + '"' : "") + ">" + itemSvg(spec.item, trim, { tips: gear("gandiva") && grown, studs: spec.studs }) + "</g>" : "") + rod +
          (gear("bracer") ? '<path d="M54 108 L62 108 L61.5 118 L54.6 118 Z" fill="#5a3418"' + OUT + "/>" : "") + "</g></g>" +
        (spec.sling ? '<path d="M50 76 Q58 112 68 76" fill="none" stroke="#efe2c0" stroke-width="3" opacity="0.9"/>' : "") +
      "</g>" + onGround + "</g></svg>";
    return svg;
  };

  // A figure in a small frame, for the corner of the page, cards and lists.
  U.puppetBadge = function (spec, o = {}) {
    return '<span class="ppbadge' + (o.cls ? " " + o.cls : "") + '">' + U.puppet(spec, Object.assign({ h: 86 }, o)) + "</span>";
  };
  // Make the corner figure react to what just happened: stand tall, slump, kneel.
  // A foe (or anyone) bracing for the next blow: a clear flash on the figure itself (owner, 4 November), in place of
  // the old see-through ring. The shield on the back forearm gets a bright rim and a glint sweeping across it; with
  // no shield, the raised forearm glows. Calm motion: the same highlight, still, for as long. The caller sets the
  // figure's "guard" pose. svg: the puppet's <svg class="pp ...">.
  U.guardFlash = function (svg, ms) {
    if (!svg || !svg.querySelector) return;
    ms = ms || 1300;
    const sh = svg.querySelector(".it-s"), tgt = sh || svg.querySelector(".foreB");
    if (!tgt) return;
    const calm = !!(U.calm && U.calm());
    svg.querySelectorAll(".gflash").forEach((g) => g.remove());
    let rim = null;
    if (sh) {
      const r = +sh.getAttribute("data-r") || 26, NS = "http://www.w3.org/2000/svg";
      rim = document.createElementNS(NS, "g"); rim.setAttribute("class", "gflash");
      rim.innerHTML = '<circle cx="58" cy="112" r="' + (r + 1.5) + '" fill="none" stroke="#fff3c4" stroke-width="3.2"/>' +
        '<path d="M' + (58 - r * 0.62) + " " + (112 - r * 0.45) + " A" + r * 0.78 + " " + r * 0.78 + " 0 0 1 " + (58 + r * 0.2) + " " + (112 - r * 0.76) + '" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>';
      sh.appendChild(rim);
    }
    tgt.classList.remove("gf-on", "gf-calm"); void svg.getBoundingClientRect();
    tgt.classList.add(calm ? "gf-calm" : "gf-on");
    if (rim && !calm && rim.animate) rim.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0.9, offset: 0.7 }, { opacity: 0 }], { duration: ms, fill: "forwards" });
    clearTimeout(tgt._gf);
    tgt._gf = setTimeout(() => { tgt.classList.remove("gf-on", "gf-calm"); if (rim) rim.remove(); }, ms);
  };
  U.puppetReact = function (kind) {
    const el = document.querySelector(".pagehead .ppbadge svg, .ppbadge svg");
    if (!el) return;
    const keep = el.getAttribute("class").replace(/\bpose-\S+/g, "").replace(/\breact-\S+/g, "").trim();
    el.setAttribute("class", keep + " pose-" + ({ win: "cheer", lose: "slump", vow: "kneel", shame: "shame", fold: "fold", tremble: "tremble" }[kind] || "stand") + " react-" + kind);
    clearTimeout(U.puppetReact.t);
    U.puppetReact.t = setTimeout(() => { if (el.isConnected) el.setAttribute("class", keep + " pose-stand"); }, 2600);
  };
})(window.K = window.K || {});
