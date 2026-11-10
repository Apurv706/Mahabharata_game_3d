/* Fights of other kinds in the war (PRD fights, owner's ideas 1, 2, 4, 6, 7, 8, 10 and 14; 2 Nov).
   The new kinds go into small side battles only. Every main fight keeps its form and length
   (tests/rules.js 90), except the two day-17 fights in war_duel.js, which are driven as chariot duels.

   An encounter's `kind` picks how it is fought (engine/combat.js reads K.FIGHT_KINDS):
   - on the turns (B.rule): "escort" (keep someone whole, or the fight is lost), "breakthrough" (each
     round choose a lane, each its own foe and cost, until you are through), "weather" (no striking
     back: guard in time and take cover, and live through it);
   - live, by the screen (B.mode, ui/fightmodes.js): "chariot" (the race, with a bow and contact),
     "range" (the aim test against a running chariot, his arrows to duck), "mace" (the parry drill with
     maces, and feints), "carry" (the steady test under arrows). With motion off, and under the tests,
     these are fought as the plain hold they are written as.
   Every side battle is a hold of four rounds with one twist (idea 14).

   Where they come:
   A. By path, on days 6 and 11 (one skirmish each, optional): archer → range, charioteer → chariot,
      mace → mace, healer → carry / escort, spy → breakthrough (in the mist), strategist → escort /
      breakthrough, everyone else → the hold.
   B. On the canon days: Bhishma's arrows on day 3 (Pandava, weather); Supratika on day 12 (both sides,
      weather); the outer ring on day 13 (Pandava: a breakthrough that cannot succeed; Kaurava: the hold);
      the road to Jayadratha on day 14 (Pandava charioteers, chariot); the Narayana weapon on day 15
      (Pandava, weather: lay down your weapons); an archer across the field on day 16 (archers, range);
      a champion on day 18 (mace fighters, mace); after a broken hold, carry a wounded man out (carry).
   K.fightKind keeps it to one special kind on any war day of a life. Flags: fk_<day>_<kind>,
   fs_carried. */
(function (K) {
  "use strict";
  const has = (S, f) => S.flags.includes(f);
  const warring = (S) => S.alive && (S.side === "pandava" || S.side === "kaurava") && !has(S, "captive") && !(S.captive && S.captive.act === 6);
  const fighter = (S) => warring(S) && ["role_front", "role_chariot", "role_command"].some((f) => has(S, f));
  const pick2 = (S, pandava, kaurava) => (S.side === "kaurava" ? kaurava : pandava); // the name of the other side's men

  // ---------- One special kind a day ----------
  // want: a kind, or "path" for the one your path brings (A). Returns the kind, or null for the plain hold.
  const PATH_KIND = { archer: "range", charioteer: "chariot", mace: "mace", healer: ["carry", "escort"], spy: "breakthrough", strategist: ["escort", "breakthrough"] };
  K.fightKind = (S, day, want) => {
    let kind = want === "path" ? PATH_KIND[S.path] || null : want;
    if (Array.isArray(kind)) kind = kind[day % 2 ? 1 : 0];
    if (!kind || kind === "hold") return null;
    const taken = S.flags.find((f) => f.startsWith("fk_" + day + "_"));
    return taken && taken !== "fk_" + day + "_" + kind ? null : kind;
  };
  const mark = (day, kind) => (S) => { const k = K.fightKind(S, day, kind); return k ? { flag: "fk_" + day + "_" + k } : {}; };

  // ---------- The kinds ----------
  const player = (B) => B.units.find((u) => u.side === "player");
  K.FIGHT_KINDS = {
    escort: {
      turn: true,
      over: (B) => { const w = B.units.find((u) => u.src === B.enc.escort); return w && w.hp <= 0 ? "lose" : null; },
      status: (B) => K.tr(K.val(B.enc.caption))
    },
    breakthrough: {
      turn: true,
      start: (B) => { B.progress = 0; B.lane = null; player(B).abilities.push("lane0", "lane1", "lane2"); },
      // Only the lanes (and herbs): each names its way, its foe and its cost.
      moves: (rows, B) => rows.filter((r) => /^lane\d$/.test(r.id)).concat(rows.filter((r) => r.id === "herbs")).map((r) => {
        const L = /^lane\d$/.test(r.id) ? B.enc.lanes[+r.id.slice(4)] : null;
        return L ? Object.assign({}, r, { name: K.tr(L.t), desc: K.tr(L.d), target: "self" }) : r;
      }),
      skip: (B, u) => B.lane != null && u.uid !== "e" + B.enc.lanes[B.lane].foe, // only the foe in your lane comes at you
      over: (B) => (B.progress >= B.enc.reach ? "win" : B.round > B.enc.hold ? B.enc.roundOut || "lose" : null),
      status: (B) => K.tr("{p} of {m} lengths through", { p: B.progress, m: B.enc.reach })
    },
    weather: {
      turn: true,
      // No one strikes back: those beside you keep their heads down too (no blows at a storm of arrows,
      // an elephant or a weapon of fire).
      start: (B) => { const p = player(B); p.abilities.push("cover"); if (B.enc.layDown) p.abilities.push("lay_down"); B.units.forEach((u) => { if (u.side === "ally") u.still = true; }); },
      moves: (rows) => rows.filter((r) => ["guard", "cover", "herbs", "lay_down"].includes(r.id)),
      over: (B) => (B.laidDown ? "win" : B.enc.mustYield && B.round > B.enc.hold ? "lose" : null),
      status: () => K.tr("No striking back")
    },
    chariot: { live: "race" }, range: { live: "aim" }, mace: { live: "push" }, carry: { live: "steady" }
  };
  // The moves the kinds bring: cover from the storm, laying your weapon down, and the three lanes.
  const lane = (i) => (B, u) => {
    const L = B.enc.lanes[i], need = B.enc.reach;
    B.lane = i;
    if (L.cost) { const d = Math.max(1, Math.round(u.maxHp * L.cost)); u.hp = Math.max(1, u.hp - d); B.tell("The way costs you {n} health.", null, { n: d }); }
    const f = B.units.find((x) => x.uid === "e" + L.foe && x.hp > 0);
    if (f) B.hit(u, f, 1);
    B.progress = Math.min(B.progress + L.step, B.enc.cannot ? need - 1 : need); // the outer ring of day 13 never opens (canon)
    B.tell("You are {p} of {m} lengths through.", null, { p: B.progress, m: need });
  };
  Object.assign(K.ABILITIES, {
    cover: { name: "Take cover", target: "self", cd: 2, desc: "Get down behind a wreck. The next blow misses you.", use: (B, u) => B.status(u, "evade", 1, "takes cover") },
    lay_down: { name: "Lay down your weapons", target: "self", desc: "Put your weapon on the ground and kneel. It passes over those who do not resist it.", use: (B) => { B.laidDown = true; B.tell("You lay your weapon on the ground and kneel."); } },
    lane0: { name: "Left", target: "self", desc: "", use: lane(0) }, lane1: { name: "Centre", target: "self", desc: "", use: lane(1) }, lane2: { name: "Right", target: "self", desc: "", use: lane(2) }
  });

  // ---------- The side battles ----------
  // Four rounds and one twist; small stakes; your company (or the soldiers near you) beside you.
  const company = (S) => [K.warAllies(S)[0]];
  const side = (def) => K.encounter(Object.assign({ hold: 4, hard: false, lethal: false, curse: false, spare: false, callHelp: null, allies: company, holdText: "The fighting moves on. You held." }, def));
  const twist = (round, text, run) => [{ round, text, run }];
  const fire = (n) => (B) => B.living("enemy").forEach((u) => B.status(u, "inspired", n));
  const shields = (B) => B.living("friends").forEach((u) => B.status(u, "guard", 1));
  const BG = {};

  // A. The skirmishes your path brings (days 6 and 11).
  side({ id: "fs_sk_hold", title: "A gap in the line", art: "war_bhishma", caption: "Four rounds",
    intro: "A gap opens in the line beside you, and the enemy comes for it. Hold it until the reserve comes up.",
    holdText: "The reserve comes up behind you. The gap is closed.",
    enemies: (S) => [K.foe(pick2(S, "Kaurava spearmen", "Pandava spearmen"), 4, { plural: true }), K.foe(pick2(S, "Kaurava captain", "Pandava captain"), 5)],
    beats: twist(3, "A second wave comes over the first.", fire(1)),
    win: { fx: { journal: "In the war you held a gap in the line until the reserve came up." }, text: "The reserve takes the gap over from you. Someone hands you water." },
    lose: { fx: {}, text: "The gap widens past you, and the reserve closes it without you." } });
  side({ id: "fs_sk_escort", kind: "escort", escort: "The healers' cart", title: "The healers' cart", art: "war_capture", caption: "Keep the cart whole",
    allies: (S) => company(S).concat([{ name: "The healers' cart", hp: 60, atk: 1, def: 2, abilities: ["guard"], still: true }]),
    intro: "Riders have found the healers' cart on its way back from the line. Keep it whole until it reaches the camp.",
    holdText: "The cart rolls in among the tents.",
    enemies: (S) => [K.foe(pick2(S, "Kaurava raiders", "Pandava raiders"), 4, { plural: true }), K.foe(pick2(S, "Kaurava horseman", "Pandava horseman"), 4)],
    beats: twist(3, "The riders give up on you and go for the cart.", (B) => { const c = B.units.find((u) => u.src === B.enc.escort); if (c) B.status(c, "exposed", 1); }),
    win: { fx: { journal: "You brought the healers' cart back to the camp through the riders." }, text: "The cart rolls in among the tents with every wounded man in it still breathing." },
    lose: { fx: {}, text: "The cart goes over. The healers drag the wounded out of it and carry them the rest of the way." } });
  side({ id: "fs_sk_break", kind: "breakthrough", reach: 5, title: "Through the mist", art: "war_bhishma", caption: "Choose your way through",
    lanes: [{ t: "Left, along the ditch", d: "Past the archers. One length.", foe: 0, step: 1 },
      { t: "Through the middle", d: "Through the spearmen. Two lengths.", foe: 1, step: 2 },
      { t: "Right, into the mist", d: "A lone rider, and the ditch costs you. Two lengths.", foe: 2, step: 2, cost: 0.1 }],
    intro: "A company of your side is cut off across the field, somewhere in the mist. Get through to them. Each round, choose your way.",
    enemies: (S) => [K.foe(pick2(S, "Kaurava archers", "Pandava archers"), 3, { plural: true, abilities: ["arrows", "strike"] }), K.foe(pick2(S, "Kaurava spearmen", "Pandava spearmen"), 5, { plural: true, abilities: ["strike", "heavy"] }), K.foe("A rider in the mist", 3)],
    beats: twist(3, "The mist thins. They can see you coming now.", fire(1)),
    win: { fx: { journal: "You fought your way through the mist to a company cut off across the field." }, text: "You reach them. Their captain grips your arm and does not let go for a while." },
    lose: { fx: {}, text: "You cannot get through. When the mist lifts, the company has found its own way back, fewer than it was." } });
  const RANGE = (rules) => ({ attr: "aim", skill: "archery", icon: "chariot", field: true, shots: 5, need: 3, returns: 2, verb: "Release", stage: "fight_war_field", rules });
  side({ id: "fs_sk_range", kind: "range", title: "An archer in a chariot", art: "war_bhishma", caption: "Shoot it out",
    intro: "An archer in a light chariot is circling your part of the line, picking men off. Bring him down, or drive him off.",
    enemies: (S) => [K.foe(pick2(S, "Kaurava chariot-archer", "Pandava chariot-archer"), 5, { abilities: ["arrows", "aimed", "strike"] })],
    beats: twist(3, "He turns his horses and comes in closer.", fire(1)),
    play: RANGE("His chariot runs across the field. Loose as it crosses your line: three hits drive him off. After each shot he shoots back: press again to duck, once his arrow is in the air. Two wounds and you are out of it."),
    win: { fx: { journal: "You drove off an enemy chariot-archer who was picking off your line." }, text: "His charioteer turns the horses and takes him back to his own lines with your arrow in his shoulder." },
    lose: { fx: {}, text: "He keeps circling until his quiver is empty, and your line pays for it." } });
  const DUEL = (rival, stage, rules) => ({ attr: "grace", skill: "chariot", vehicle: "chariot", rival, bow: true, knock: true, turn: 3, obstacles: ["wreck", "rock"], stage, stageTall: "stage_vyuha_top", rules,
    tally: "Turned away: {n} of {k} · You: {d}% · {who}: {r}%" });
  side({ id: "fs_sk_chariot", kind: "chariot", title: "Wheel to wheel", art: "war_capture", caption: "A chariot duel",
    intro: "An enemy chariot is running down your line. Drive out and meet it.",
    enemies: (S) => [K.foe(pick2(S, "Kaurava chariot-warrior", "Pandava chariot-warrior"), 5, { abilities: ["strike", "arrows"] })],
    beats: twist(3, "He swings out wide and comes back at you.", fire(1)),
    play: (S) => DUEL(pick2(S, "Kaurava chariot-warrior", "Pandava chariot-warrior"), "fight_war_chariot", "Drive beside him. Steer into his car to knock him off the line, and shoot when you are level. Turn him away three times, or beat him to the end of the field."),
    win: { fx: { journal: "You drove off an enemy chariot that was running down your line." }, text: "He swings his horses away toward his own lines. Your men cheer you." },
    lose: { fx: {}, text: "He runs the length of your line, and you are a length behind him all the way." } });
  const MACE = (feints) => ({ attr: "might", skill: "mace", face: "drill", item: "mace", foeItem: "mace", foe: "the champion", verb: "Strike", feints, stage: "fight_war_field",
    tally: "Blows landed: {g} of 3 · Breath left: {r}", good: "Your mace gets through!", soon: "Too soon. He steps back from it.", late: "Too late. His mace finds you.",
    rules: "Strike as the ring meets the mark; let the red ones pass. Three good blows win." });
  side({ id: "fs_sk_mace", kind: "mace", title: "A champion with a mace", art: "war_bhishma", caption: "A mace duel",
    intro: "A champion in scale armour has come out of the enemy line with a mace, calling for someone to meet him.",
    enemies: (S) => [K.foe(pick2(S, "Kaurava mace champion", "Pandava mace champion"), 6, { abilities: ["strike", "heavy"] })],
    beats: twist(3, "He roars, and his own line roars with him.", fire(1)), play: MACE(0.3),
    win: { fx: { journal: "You met an enemy champion with the mace in front of both lines, and put him down." }, text: "He goes down on one knee, and his own men drag him back into their line. Yours bang their shields." },
    lose: { fx: {}, text: "His mace takes you on the shoulder and you go down. Your men drag you back before he can finish it." } });
  const CARRY = (rules) => ({ attr: "might", skill: "healing", verb: "Carry", secs: 15, stage: "fight_war_field",
    help: "Hold to take his weight; let go when you stagger. Keep your feet over the glow until you reach the line.", tally: "Back to the line: {c}% · {s} seconds",
    wonLine: "You lay him down behind your own line.", nearLine: "Ten paces short, an arrow finds you.", lostLine: "An arrow finds you, and you go down under him.", rules });
  side({ id: "fs_sk_carry", kind: "carry", title: "A man down", art: "war_bhishma", caption: "Under the arrows",
    intro: "A man from your company is down between the lines. Get him back while the archers reload.",
    enemies: (S) => [K.foe(pick2(S, "Kaurava archers", "Pandava archers"), 4, { plural: true, abilities: ["arrows", "strike"] })],
    beats: twist(3, "The archers find their range.", fire(1)),
    play: CARRY("A man from your company is down between the lines, and the archers are loosing at anything that moves. Carry him back: hold to take his weight, ease off when you stagger."),
    win: { fx: { journal: "You carried a wounded man back to your line under the arrows." }, text: "You lay him down behind the shields. He will live, the healers say, if the fever does not take him." },
    lose: { fx: { injury: "scar" }, text: "An arrow takes you in the arm on the way. You bring him in anyway." } });
  Object.assign(BG, { fs_sk_hold: "fight_between_lines", fs_sk_escort: "fight_supply_carts", fs_sk_break: "fight_between_lines", fs_sk_range: "fight_war_field", fs_sk_chariot: "fight_war_chariot", fs_sk_mace: "fight_war_field", fs_sk_carry: "fight_war_field" });

  // B. The canon days.
  side({ id: "fs_d3_storm", kind: (S) => K.fightKind(S, 3, "weather"), title: "Bhishma's arrows", art: "war_bhishma", caption: "Four rounds under the arrows",
    intro: "Bhishma drives along the Pandava line, and his arrows come down like rain. There is nothing to strike at. Keep your shield up and live.",
    holdText: "Bhishma's chariot moves on down the line. The arrows stop.",
    enemies: [K.foe("Bhishma", 10, { hero: true, person: "bhishma", hp: 900, atk: 5, abilities: ["arrows", "strike"] }), K.foe("Kaurava archers", 4, { plural: true, abilities: ["arrows", "strike"] })],
    beats: twist(3, "His chariot turns back along the line, and the arrows come thicker.", fire(1)),
    win: { fx: { journal: "On the third day you stood under Bhishma's arrows and lived." }, text: "When the arrows stop, the ground around you is grey with them. You are still standing in it." },
    lose: { fx: { injury: "scar" }, text: "An arrow finds the gap in your shield. You are carried back to the tents before noon." } });
  side({ id: "fs_d12_elephant", kind: (S) => K.fightKind(S, 12, "weather"), title: "Supratika's charge", art: "war_capture", caption: "Four rounds",
    intro: (S) => (S.side === "kaurava" ? "You are in the press behind Bhagadatta's elephant when Arjuna turns on it. Every arrow aimed at the old king falls among you as well."
      : "Bhagadatta's elephant Supratika comes through the Pandava line, and men go under its feet. There is no fighting it. Keep out of its way, and stay alive."),
    holdText: "The worst of it is past you. You are still standing.",
    enemies: (S) => (S.side === "kaurava" ? [K.foe("Arjuna, across the field", 10, { hero: true, person: "arjuna", hp: 900, atk: 5, abilities: ["arrows", "strike"] })]
      : [K.foe("Supratika, Bhagadatta's elephant", 10, { hero: true, hp: 950, atk: 6, abilities: ["strike", "heavy"] }), K.foe("Bhagadatta's riders", 4, { plural: true })]),
    beats: twist(3, "It comes back the way it went, faster.", fire(1)),
    win: { fx: { journal: "On the twelfth day you lived through Supratika's charge." }, text: (S) => (S.side === "kaurava" ? "The arrows move on after the old king. Around you, men get up out of the dust, and some do not." : "The elephant goes on into the next division, trumpeting. Around you, men get up out of the dust, and some do not.") },
    lose: { fx: { injury: "scar" }, text: "You are knocked flat and trodden on by someone running. You are carried back to the tents." } });
  side({ id: "fs_d13_break", kind: (S) => K.fightKind(S, 13, "breakthrough"), reach: 6, cannot: true, roundOut: "win", title: "The outer ring", art: "scene_day13", caption: "Choose your way in",
    lanes: [{ t: "Left, at the archers", d: "Sindhu archers. One length.", foe: 0, step: 1 },
      { t: "Straight at the chariots", d: "Jayadratha's guard. Two lengths.", foe: 1, step: 2 },
      { t: "Right, round the end of the ring", d: "Horsemen, and the long way costs you. Two lengths.", foe: 2, step: 2, cost: 0.1 }],
    intro: "At dawn Drona's army stands in a wheel of chariots, ring inside ring. Yudhishthira sends the divisions at the outer ring. Each round, choose your way in.",
    enemies: [K.foe("Sindhu archers", 4, { plural: true, abilities: ["arrows", "strike"] }), K.foe("Jayadratha's guard", 5, { plural: true, abilities: ["strike", "heavy", "guard"] }), K.foe("Kaurava horseman", 4)],
    beats: twist(3, "Jayadratha's chariot comes along the ring, and wherever it was giving, it closes.", fire(2)),
    win: { fx: { journal: "On the thirteenth day you tried the outer ring of the wheel at dawn. It did not open." }, text: "The ring closes in front of you each time you reach it. By mid-morning Yudhishthira calls the divisions back, and sends for Abhimanyu." },
    lose: { fx: { injury: "scar" }, text: "You are thrown back from the ring with a cut across the arm. By mid-morning Yudhishthira has sent for Abhimanyu." } });
  side({ id: "fs_d13_hold", title: "The outer ring", art: "scene_day13", caption: "Four rounds",
    intro: "At dawn you stand in the outer ring of Drona's wheel. The Pandava divisions come at it again and again. Hold your place.",
    holdText: "The Pandava divisions fall back from the ring.",
    enemies: [K.foe("Pandava footsoldier", 4, { plural: true }), K.foe("Panchala archer", 4, { abilities: ["arrows", "strike"] })],
    beats: twist(3, "Bhima comes at the ring with his mace, and the chariots beside you shake.", shields),
    win: { fx: { journal: "On the thirteenth day you held your place in the outer ring of the wheel at dawn." }, text: "They fall back, and come again, and fall back. By mid-morning they stop coming." },
    lose: { fx: {}, text: "They break through beside you for a moment, before the ring closes again behind them." } });
  side({ id: "fs_d14_chariot", kind: (S) => K.fightKind(S, 14, "chariot"), title: "On the road to Jayadratha", art: "war_day14", caption: "A chariot duel",
    intro: "A Kaurava chariot cuts across the road Arjuna must take to reach Jayadratha before sunset. Drive it off the road.",
    enemies: [K.foe("Kaurava chariot-warrior", 5, { abilities: ["strike", "arrows"] })],
    beats: twist(3, "The sun is lower than it should be. He knows it, and so do you.", fire(1)),
    play: DUEL("Kaurava chariot-warrior", "fight_war_sunset", "Drive beside him. Steer into his car to knock him off the road, and shoot when you are level. Turn him away three times, or beat him to the end of the road."),
    win: { fx: { journal: "On the fourteenth day you drove a Kaurava chariot off the road to Jayadratha." }, text: "He swings off the road into the dust. Somewhere ahead, Arjuna's chariot goes on toward the setting sun." },
    lose: { fx: {}, text: "He holds the road against you until other chariots come up and drive him off it." } });
  side({ id: "fs_d15_narayana", kind: (S) => K.fightKind(S, 15, "weather"), layDown: true, mustYield: true, title: "The Narayana weapon", art: "war_day15", caption: "Lay down your weapons",
    intro: "Ashwatthama looses the Narayana weapon on the Pandava army. Fire and iron come down out of a clear sky, and they come hardest at whoever stands armed against them.",
    enemies: [K.foe("The Narayana weapon", 10, { hero: true, hp: 999, atk: 5, abilities: ["arrows", "heavy"] })],
    beats: twist(2, "Krishna's voice carries over the whole field: put down your weapons, get down from your chariots, and it will pass you by.", fire(2)),
    win: { fx: { journal: "On the fifteenth day you laid down your weapons when the Narayana weapon came, and it passed over you." },
      text: "You kneel, and the fire goes over you like wind over grass. Krishna and Arjuna are dragging Bhima down from his chariot." },
    lose: { fx: { injury: "scar" }, text: "You stand against it, and it finds you. Someone pulls you down into the dust by your belt, and the fire passes over you both." } });
  side({ id: "fs_d16_range", kind: (S) => K.fightKind(S, 16, "range"), title: "An archer across the field", art: "war_day16", caption: "Shoot it out",
    intro: (S) => pick2(S, "One of Karna's archers has been shooting at your line from his chariot all morning. Shoot it out with him.", "One of Arjuna's archers has been shooting at your line from his chariot all morning. Shoot it out with him."),
    enemies: (S) => [K.foe(pick2(S, "One of Karna's archers", "One of Arjuna's archers"), 6, { abilities: ["arrows", "aimed", "strike"] })],
    beats: twist(3, "He has your range now.", fire(1)),
    play: RANGE("His chariot runs across the field. Loose as it crosses your line: three hits drive him off. After each shot he shoots back: press again to duck, once his arrow is in the air. Two wounds and you are out of it."),
    win: { fx: { journal: "On the sixteenth day you shot it out with an archer in a chariot across the field, and drove him off." }, text: "His charioteer wheels away with him slumped against the rail. Your line breathes again." },
    lose: { fx: {}, text: "His arrows find you twice. You are helped back, and he goes on shooting at someone else." } });
  side({ id: "fs_d18_mace", kind: (S) => K.fightKind(S, 18, "mace"), title: "The last champion", art: "war_day18", caption: "A mace duel",
    intro: "A champion comes out of what is left of the enemy line, mace on his shoulder, and calls for anyone who will meet him.",
    enemies: (S) => [K.foe(pick2(S, "Kaurava mace champion", "Pandava mace champion"), 7, { abilities: ["strike", "heavy"] })],
    beats: twist(3, "He is tired too. You can see it in his feet.", (B) => B.living("enemy").forEach((u) => B.status(u, "weakened", 1))), play: MACE(0.4),
    win: { fx: { journal: "On the last day of the war you met a champion with the mace and put him down." }, text: "He goes down, and does not get up for a long time. Nobody on either side comes to drag him away." },
    lose: { fx: {}, text: "He puts you down. Your own men drag you back by the ankles." } });
  side({ id: "fs_carry", kind: (S) => K.fightKind(S, "broken", "carry"), title: "Carry him out", art: "scene_line_broken", caption: "Under the arrows",
    intro: "One of your company is down, alive, with the enemy's archers still loosing into what is left of the line. Get him out.",
    enemies: (S) => [K.foe(pick2(S, "Kaurava archers", "Pandava archers"), 4, { plural: true, abilities: ["arrows", "strike"] })],
    beats: twist(3, "The archers find their range.", fire(1)),
    play: CARRY("He is heavy, and the archers are loosing at anything that moves. Carry him back behind the chariots: hold to take his weight, ease off when you stagger."),
    win: { fx: { flag: "fs_carried", journal: "Your company broke in front of the enemy's champion. You carried one of your wounded out of it, and nothing touched you." },
      text: "You get him over your shoulder and out of the press. Behind the chariots he opens his eyes and asks where the others are." },
    lose: { fx: { flag: "fs_carried", injury: "scar", journal: "Your company broke in front of the enemy's champion. You carried one of your wounded out of it, and an arrow found you." },
      text: "An arrow takes you in the back of the leg. You get him out anyway, the last of the way on your knees." } });
  Object.assign(BG, { fs_d3_storm: "fight_war_field", fs_d12_elephant: "fight_between_lines", fs_d13_break: "fight_chakravyuha_inner", fs_d13_hold: "fight_chakravyuha_inner", fs_d14_chariot: "fight_war_sunset",
    fs_d15_narayana: "fight_war_field", fs_d16_range: "fight_war_field", fs_d18_mace: "fight_war_field", fs_carry: "fight_war_field" });
  Object.assign(K.COMMAND_FIGHT_BG = K.COMMAND_FIGHT_BG || {}, BG);

  // ---------- The scenes ----------
  const scene = (o) => Object.assign({ act: 6, age: 44, war: true, away: true, place: "Kurukshetra" }, o);
  const LEAVE = { id: "leave", t: "Leave it to others", fx: {}, text: "Another company goes. You hear later how it went for them." };
  // A. One skirmish, its kind from your path.
  const SK = {
    hold: { t: "Hold the gap", body: "A gap opens in the line near you." },
    escort: { t: "Ride with the healers' cart", body: "Riders have found the healers' cart." },
    breakthrough: { t: "Go through the mist to them", body: "A company of your side is cut off in the mist." },
    range: { t: "Go out with your bow", body: "An enemy archer is picking off your men." },
    chariot: { t: "Drive out and meet him", body: "An enemy chariot is running down your line." },
    mace: { t: "Meet him with your mace", body: "An enemy champion with a mace calls for someone to meet him." },
    carry: { t: "Carry him back", body: "One of your men is down between the lines, still moving." }
  };
  const skirmish = (day, then, art, place) => {
    const kind = (S) => K.fightKind(S, day, "path") || "hold";
    return scene({ id: "fs_sk_" + day, when: warring, skipTo: then, next: then, art, place, caption: "A fight of your own", title: "Between the great fights",
      body: (S) => [SK[kind(S)].body],
      choices: Object.keys(SK).map((k) => ({ id: "fight_" + k, t: SK[k].t, req: (S) => kind(S) === k, combat: k === "breakthrough" ? "fs_sk_break" : "fs_sk_" + k, fx: mark(day, k), hint: "A short fight" })).concat([LEAVE]) });
  };
  K.scenes([
    skirmish(6, "a6_day1", "war_bhishma", "Kurukshetra · day 6"),
    skirmish(11, "a6_capture", "war_capture", "Kurukshetra · day 11"),
    scene({ id: "fs_d3", when: (S) => fighter(S) && S.side === "pandava", skipTo: "a6_day1", next: "a6_day1", art: "war_bhishma", place: "Kurukshetra · day 3", caption: "Arrows like rain", title: "Bhishma's arrows",
      body: ["Bhishma's chariot comes along your line, and the arrows come down like rain."],
      choices: [{ id: "stand", t: "Stand under the arrows", combat: "fs_d3_storm", fx: mark(3, "weather"), hint: "Live through it" },
        { id: "back", t: "Fall back", fx: {}, text: "You fall back with the second rank. The arrows find the first." }] }),
    scene({ id: "fs_d12", when: fighter, skipTo: "a6_capture", next: "a6_capture", art: "war_capture", place: "Kurukshetra · day 12", caption: "An elephant called Supratika", title: "Supratika's charge",
      body: (S) => [S.side === "kaurava" ? "You follow Bhagadatta's elephant through the Pandava army, and Arjuna turns toward it." : "Old Bhagadatta's elephant Supratika is coming through your line.",
        S.side === "kaurava" ? "His arrows fall among you too." : null],
      choices: [{ id: "stand", t: "Live through it", combat: "fs_d12_elephant", fx: mark(12, "weather"), hint: "Live through it" }, LEAVE] }),
    scene({ id: "fs_d13", when: fighter, skipTo: "a6_day13", next: "a6_day13", art: "scene_day13", place: "Kurukshetra · day 13, at dawn", caption: "Ring inside ring", title: "The outer ring",
      body: (S) => [S.side === "kaurava" ? "You stand in the outer ring of Drona's wheel." : "The Kaurava army stands in a wheel of chariots that no one has broken.",
        S.side === "kaurava" ? "The Pandavas are coming." : null],
      choices: [{ id: "break", t: "Attack the outer ring", req: { side: "pandava" }, combat: "fs_d13_break", fx: mark(13, "breakthrough"), hint: "Choose your way in" },
        { id: "hold", t: "Hold the ring", req: { side: "kaurava" }, combat: "fs_d13_hold", hint: "A short fight" }, LEAVE] }),
    scene({ id: "fs_d14", when: (S) => fighter(S) && S.side === "pandava" && (S.path === "charioteer" || has(S, "role_chariot")), skipTo: "a6_day14", next: "a6_day14", art: "war_day14", place: "Kurukshetra · day 14", caption: "Before sunset", title: "On the road to Jayadratha",
      body: ["Kaurava chariots throw themselves across Arjuna's road to Jayadratha.", "One cuts across in front of you."],
      choices: [{ id: "drive", t: "Drive at him", combat: "fs_d14_chariot", fx: mark(14, "chariot"), hint: "A chariot duel" }, LEAVE] }),
    scene({ id: "fs_d15", when: (S) => warring(S) && S.side === "pandava", skipTo: "a6_day16", next: "a6_day16", art: "war_day15", place: "Kurukshetra · day 15, after Drona", caption: "Fire out of a clear sky", title: "The Narayana weapon",
      body: ["Ashwatthama looses the Narayana weapon to avenge his father.", "The sky begins to burn."],
      choices: [{ id: "stand", t: "Stand where you are", combat: "fs_d15_narayana", fx: mark(15, "weather"), hint: "Lay down your weapons, or face it" }] }),
    scene({ id: "fs_d16", when: (S) => warring(S) && S.path === "archer", skipTo: "a6_day16", next: "a6_day16", art: "war_day16", place: "Kurukshetra · day 16", caption: "Bow against bow", title: "An archer across the field",
      body: (S) => [pick2(S, "One of Karna's archers has shot at your line all morning.", "One of Arjuna's archers has shot at your line all morning.")],
      choices: [{ id: "shoot", t: "Shoot it out with him", combat: "fs_d16_range", fx: mark(16, "range"), hint: "An archery duel" }, LEAVE] }),
    scene({ id: "fs_d18", when: (S) => warring(S) && S.path === "mace", skipTo: "a6_day18", next: "a6_day18", art: "war_day18", place: "Kurukshetra · day 18", caption: "Mace against mace", title: "The last champion",
      body: ["On the last morning an enemy champion with a mace calls for anyone."],
      choices: [{ id: "meet", t: "Walk out and meet him", combat: "fs_d18_mace", fx: mark(18, "mace"), hint: "A mace duel" }, LEAVE] })
  ]);

  // After a broken hold (command.js): carry a wounded man out, instead of only falling back with a scar.
  const broken = K.SCENES.hold_broken;
  if (broken && !broken.choices.some((c) => c.id === "carry")) broken.choices.splice(1, 0, { id: "carry", t: "Carry a wounded man out of it", combat: "fs_carry", fx: mark("broken", "carry"), hint: "A test of strength" });

  // ---------- Where they come ----------
  const before = (id, list, after) => {
    const L = (K.BEFORE[id] = K.BEFORE[id] || []), at = after ? L.indexOf(after) : -1;
    if (at < 0) L.push(...list); else L.splice(at + 1, 0, ...list);
  };
  before("a6_day1", ["fs_d3", "fs_sk_6"]);
  before("a6_capture", ["fs_sk_11", "fs_d12"]);
  before("a6_day13", ["fs_d13"]);
  before("a6_day14", ["fs_d14"]);
  before("a6_day16", ["fs_d15"], "kf_word"); // the evening Drona falls, before the sixteenth day's own scenes
  before("a6_day16", ["fs_d16"]);
  before("a6_day18", ["fs_d18"]);
})(window.K = window.K || {});
