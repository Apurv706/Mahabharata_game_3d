/* Friends who come to help (PRD §18.1). In any fight you may shout for a friend once; who comes
   depends on what you have been to them, and on where they could be. The war's fights keep their
   own rule (K.warHelp in act6a.js); this is the rule for every other fight.
   - A friend comes at a bond of 7 or more, or your friend for life at 5 or more.
   - Only where they could be: not a friend who is dead or whose friendship has ended; not Arjuna in
     the years of the exile he spent away (ages 34 to 40); no Pandava or Kaurava prince in the hidden
     year (age 43), when being seen would give the Pandavas away; not Karna or Duryodhana after you
     have taken the Pandava side, nor Arjuna or Bhima after the Kaurava side.
   - A friend who helps can be hurt: below two fifths of their strength when the fight ends, they
     carry a scar for you (remembered); Charu, who has no armour, can die in a deadly fight. */
(function (K) {
  "use strict";
  const PRINCES = ["arjuna", "bhima", "karna", "duryodhana"];
  const SIDE = { karna: "kaurava", duryodhana: "kaurava", arjuna: "pandava", bhima: "pandava" };
  K.FRIEND_LINES = {
    charu: "Charu comes through the crowd with a smith's hammer and no armour at all, and stands at your shoulder.",
    arjuna: "An arrow takes the man in front of you through the arm. Arjuna is on the wall behind you, already nocking the next.",
    bhima: "Bhima comes through the gate like a falling tree, laughing, and puts himself between you and the worst of it.",
    karna: "Karna is suddenly beside you, bow in hand, looking as if he has been there all along.",
    duryodhana: "Duryodhana shoulders in with his mace and a look that dares anyone to touch you.",
    none: "You shout for help. No one you trust is near enough to hear.",
    died: "Charu died beside you, with no armour, because you called.",
    scarMemory: "I carry a scar from the day you called me, and I would come again.",
    scarJournal: "{who} came when you called, and carries a scar for it."
  };
  // The friends who could come to this fight, in order of closeness.
  K.friendsNear = function (S = K.S, enc, here) {
    const lost = (S.lostFriends || []).map((x) => x.who);
    const out = [];
    for (const who of ["charu", "arjuna", "bhima", "karna", "duryodhana"]) {
      if (!K.UNITS[who] || S.dead.includes(who) || lost.includes(who) || (here && here.has(who))) continue;
      const bond = S.bonds[who] ?? 0;
      if (!(bond >= 7 || (S.friend === who && bond >= 5))) continue;
      if (PRINCES.includes(who)) {
        if (S.act === 5 && S.age >= 43) continue;                       // the hidden year
        if (who === "arjuna" && S.act === 5 && S.age >= 34 && S.age <= 40) continue; // Arjuna's years away
        if (S.side && S.side !== "neutral" && SIDE[who] !== S.side) continue;
        if (enc && enc.lethal && S.act === 6) continue;                 // the war has its own rule
      }
      out.push(who);
    }
    return out.sort((a, b) => (S.bonds[b] ?? 0) - (S.bonds[a] ?? 0) || (a === S.friend ? -1 : 1));
  };
  // What "Call for help" does in a fight that has no rule of its own.
  K.friendHelp = function (S = K.S, enc, here) {
    const who = K.friendsNear(S, enc, here)[0];
    if (!who) return { text: K.FRIEND_LINES.none };
    const def = K.UNITS[who](S);
    const LINE = K.FRIEND_LINES;
    return { unit: def, stay: 3, who, text: LINE[who] };
  };
  // After a fight: the friend who came is marked by it.
  K.friendAfter = function (B, S = K.S) {
    const outcome = B.over;
    for (const u of B.units) {
      if (u.side !== "ally" || !u.called || !u.person) continue;
      const who = u.person;
      if (u.hp <= 0 && who === "charu" && B.enc.lethal && outcome !== "flee") {
        if (!S.dead.includes("charu")) { S.dead.push("charu"); K.apply({ journal: K.FRIEND_LINES.died, duty: { conscience: -1 } }); }
        continue;
      }
      if (u.hp < u.maxHp * 0.4 && !S.flags.includes("scar_" + who)) {
        K.apply({ flag: "scar_" + who, memory: [who, K.FRIEND_LINES.scarMemory], journal: { src: K.FRIEND_LINES.scarJournal, p: { who: K.PEOPLE[who].name } } });
      }
    }
  };
})(window.K = window.K || {});
