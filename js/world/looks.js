/* How everyone looks: the homelands' colours, what each path carries, and the people of the epic (skin, cloth, trim, headgear,
   beard, weapon, size). Lifted from the 2D game's leather puppets (ui/puppet.js) so the 3D figures are the same people.
   K.puppetSpec(S) → the player's look from the life; K.PUPPETS[id] → someone else's; K.UI.puppetFor(id). */
(function (K) {
  "use strict";
  const U = (K.UI = K.UI || {});
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
  const HEADGEAR = { hastinapura: "jata", panchala: "jata", matsya: "band", mathura: "peacock", anga: "jata", suta: "band", nishada: "feather", gandhara: "band" };
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
    arjuna: { pronoun: "he", palette: ["#c27a44", "#f2ead2", "#3b6fb0"], headgear: "crown", crown: { gem: "#3b6fb0", tall: 1.05, trim: "#3b6fb0" }, item: "bow", gear: ["gandiva", "quivers"], stance: "hero", size: 1.12, peer: true },
    bhima: { pronoun: "he", palette: ["#a8622f", "#6f3a24", "#e2b55a"], headgear: "crown", crown: { gem: "#b2432a", broad: true, trim: "#6f3a24" }, item: "mace", studs: ["#d9a53a"], stance: "broad", big: true, size: 1.25, peer: true },
    karna: { pronoun: "he", palette: ["#c9813f", "#d8a536", "#f3d27a"], headgear: "crown", crown: { gem: "#b2432a", tall: 1, trim: "#b2432a" }, item: "bow", armour: true, gear: ["earrings"], stance: "hero", size: 1.12, peer: true },
    duryodhana: { pronoun: "he", palette: ["#b8703b", "#7a1f2a", "#e2b55a"], headgear: "crown", crown: { gem: ["#2f7d55", "#b2432a", "#2d5aa0", "#b2432a"], tall: 1.15, trim: "#7a1f2a" }, item: "mace", studs: ["#b2432a", "#2d5aa0", "#2f7d55", "#2d5aa0", "#b2432a"], stance: "haughty", size: 1.15, peer: true },
    dushasana: { pronoun: "he", palette: ["#b0683a", "#5e2430", "#c9a24e"], headgear: "mukuta", item: "mace", peer: true },
    // Drona, a brahmin, keeps his matted knot: a grey forked beard and a water-pot at his hip.
    drona: { pronoun: "he", headgear: "jata", palette: ["#c9905a", "#efe6cf", "#c9a24e"], beard: "forked", stage: "elder", item: "bow", gear: ["waterpot"], stance: "sage", size: 1.12 },
    kripa: { pronoun: "he", headgear: "jata", palette: ["#c48a55", "#e7dcc0", "#b49054"], beard: true, stage: "elder", item: "bow" },
    balarama: { pronoun: "he", palette: ["#e9d9b8", "#2c4c86", "#e2b55a"], headgear: "kirita", item: "mace", big: true, stage: "adult" }, // the master of the mace, who teaches it to Bhima and Duryodhana
    mauni: { pronoun: "he", headgear: "jata", palette: ["#b88352", "#c7a46c", "#8a6a3a"], beard: true, stage: "elder", item: "staff" },
    vidura: { pronoun: "he", headgear: "jata", palette: ["#c08a56", "#f0e8d6", "#9b8a6a"], beard: true, stage: "elder", item: "scroll" },
    // The sutradhara, who holds the strings of the story and opens each act.
    sutradhara: { pronoun: "he", headgear: "band", palette: ["#c8925e", "#e9dcc0", "#b2432a"], beard: true, stage: "elder", item: "scroll" },
    bhishma: { pronoun: "he", headgear: "crown", crown: { gem: "#d9a53a", tall: 0.85, white: true, trim: "#d9a53a" }, palette: ["#cfa274", "#f4efe2", "#d6c08a"], beard: "long", stage: "elder", item: "bow", stance: "sage", size: 1.22 },
    // Satyaki, the Yadava champion: broad and tall in scale armour, a Vrishni blue crown, sword in hand.
    satyaki: { pronoun: "he", palette: ["#9a5a30", "#2c4c86", "#e2b55a"], headgear: "crown", crown: { gem: "#2c4c86", broad: true, trim: "#e2b55a" }, item: "sword", gear: ["scale", "bracer"], studs: ["#d9a53a"], stance: "broad", big: true, size: 1.24, stage: "adult" },
    dhrishtadyumna: { pronoun: "he", headgear: "mukuta", palette: ["#c27a44", "#b2432a", "#e2b55a"], item: "sword", stage: "adult" },
    shakuni: { pronoun: "he", palette: ["#b78a5c", "#4b5a73", "#c9b07a"], headgear: "band", beard: true, stage: "elder", item: "dice" },
    charu: { pronoun: "they", palette: ["#a8683c", "#6b4a32", "#c9a066"], item: "hammer", peer: true },
    ugra: { pronoun: "he", palette: ["#9c5c32", "#5a4630", "#a8875a"], big: true, stage: "adult" },
    // Ordinary fighters wear helmets or turbans, never crowns: a palace guard in a tall turban and
    // sash, his spear upright; a soldier in a leather helmet and cuirass behind a round hide shield.
    guard: { pronoun: "he", palette: ["#9e6a40", "#5d3b2a", "#9f8250"], headgear: "turban", hat: "#c9a24e", hatTrim: "#6e3026", gear: ["sash"], item: "spear", stance: "square", stage: "adult" },
    soldier: { pronoun: "he", palette: ["#9e6a40", "#6e3026", "#b39255"], headgear: "helmet", gear: ["shield", "cuirass"], item: "spear", stance: "square", stage: "adult" },
    cousin: { pronoun: "she", palette: ["#b9743f", "#b2432a", "#e2b55a"], stage: "child" },
    healer: { pronoun: "she", palette: ["#b47a4a", "#e9dfc6", "#9a8a6a"], item: "bowl", stage: "adult" },
    boy: { pronoun: "he", palette: ["#b0703f", "#8a5a3a", "#c9a066"], stage: "youth" },
    abhimanyu: { pronoun: "he", palette: ["#c27a44", "#f2ead2", "#3b6fb0"], headgear: "mukuta", item: "bow", stage: "youth" },
    // The others of the epic, each with the weapon the story gives him (Krishna carries none: he does not fight).
    yudhishthira: { pronoun: "he", palette: ["#c08050", "#efe6cc", "#c9a24e"], headgear: "crown", crown: { gem: "#2f7d55", tall: 0.95, trim: "#c9a24e" }, item: "spear", stance: "sage", size: 1.1, peer: true },
    nakula: { pronoun: "he", palette: ["#c27a44", "#3f6b3a", "#e2b55a"], headgear: "mukuta", item: "sword", stance: "hero", peer: true },
    sahadeva: { pronoun: "he", palette: ["#b8743f", "#4b5a73", "#e2b55a"], headgear: "mukuta", item: "sword", stance: "hero", peer: true },
    krishna: { pronoun: "he", palette: ["#4a5f8f", "#e2b55a", "#e2b55a"], headgear: "peacock", stance: "hero", size: 1.12, stage: "adult" },
    drupada: { pronoun: "he", palette: ["#c08a56", "#b2432a", "#e2b55a"], headgear: "crown", crown: { gem: "#b2432a", tall: 0.9, trim: "#e2b55a" }, beard: true, item: "bow", size: 1.1, stage: "adult" },
    jayadratha: { pronoun: "he", palette: ["#b8703b", "#3a5a6a", "#c9a24e"], headgear: "crown", crown: { gem: "#2d5aa0", tall: 1, trim: "#3a5a6a" }, item: "bow", stance: "haughty", size: 1.1, stage: "adult" },
    ekalavya: { pronoun: "he", palette: ["#8a5430", "#4f6a3a", "#b39255"], headgear: "feather", item: "bow", stance: "archer", peer: true },
    shalya: { pronoun: "he", palette: ["#b8703b", "#6a4a2a", "#e2b55a"], headgear: "crown", crown: { gem: "#c9a24e", broad: true, trim: "#6a4a2a" }, beard: true, item: "mace", stance: "broad", size: 1.12, stage: "adult" },
    shikhandi: { pronoun: "he", palette: ["#c27a44", "#8a2a3a", "#e2b55a"], headgear: "mukuta", item: "bow", stance: "archer", stage: "adult" },
    ghatotkacha: { pronoun: "he", palette: ["#6a4a3a", "#3a2a2a", "#b2432a"], headgear: "band", item: "club", stance: "broad", big: true, size: 1.3, stage: "adult" },
    ashwatthama: { pronoun: "he", palette: ["#c9905a", "#3a2a3a", "#c9a24e"], headgear: "crown", crown: { gem: "#8a5aa0", tall: 0.95, trim: "#3a2a3a" }, gear: ["browgem"], item: "bow", stance: "hero", stage: "adult", big: true, size: 1.18 }
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
  U.puppetFor = function (id, S = K.S) {
    const p = K.PUPPETS[id] || K.PUPPETS.guard;
    return Object.assign({ stage: p.peer && S ? K.puppetStage(S.age || 10) : "adult" }, p);
  };
})(window.K = window.K || {});
