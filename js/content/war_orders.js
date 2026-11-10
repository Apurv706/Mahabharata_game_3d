/* Orders for the day (owner, 6 November: "for all the battle days, can we have orders coming in from the chief battle
   commander: a full-screen view with a summary of what happened the last day, the objective of the current day and what
   the player is supposed to achieve that day"). The commanders are the epic's: Dhrishtadyumna leads the Pandavas all
   eighteen days; the Kauravas follow Bhishma (days 1-10), Drona (11-15), Karna (16-17) and, on the last day, Shalya (his
   orders come by Duryodhana: there is no painting of Shalya). A life sees the orders at the first scene of each battle
   day it reaches (K.ORDERS.at), once; the screen is ui/orders.js. */
(function (K) {
  "use strict";
  const O = K.ORDERS = {};
  // The first scene of a battle day, and its day. (a6_day1 is the fighting of days 1 to 9, told after day 6: it brings
  // orders only to a life that has had none yet.)
  O.at = {
    cross_call: 1, a6_day1: 1, cross_duel: 2, cross_called: 2, fs_d3: 3, fs_sk_6: 6, wl_iravan: 8, bh_day9: 9, bh_guard9: 9,
    ep_shikhandi: 10, bh_fall: 10, a6_bhishma: 10, cmd_array_1: 11, fs_sk_11: 11, wc_child_line: 11, a6_capture: 11,
    fs_d12: 12, oath_south: 12, oath_crescent: 12, oath_king: 12, a6_wheel: 13, a6_d13_bow: 13, fs_d13: 13, a6_day13: 13,
    kb_ride: 14, kb_drag: 14, fs_d14: 14, wr_map_14: 14, a6_day14: 14, cmd_array_2: 15, wr_map_15: 15, kf_reach: 15,
    a6_day15: 15, fs_d15: 15, a6_day16: 16, oath_again: 16, fs_d16: 16, kd_son: 17, kd_guard: 17, ep_sibling_field: 17,
    ep_ugra_last: 17, a6_day17: 17, fs_d18: 18, a6_day18: 18
  };
  O.CHIEFS = {
    dhrishtadyumna: { name: "Dhrishtadyumna", title: "commander of the Pandava army", who: "dhrishtadyumna" },
    bhishma: { name: "Bhishma", title: "commander of the Kaurava army", who: "bhishma" },
    drona: { name: "Drona", title: "commander of the Kaurava army", who: "drona" },
    karna: { name: "Karna", title: "commander of the Kaurava army", who: "karna" },
    shalya: { name: "Duryodhana", title: "for Shalya, who leads the Kaurava army today", who: "duryodhana" }
  };
  O.chief = (side, day) => (side === "kaurava" ? (day <= 10 ? "bhishma" : day <= 15 ? "drona" : day <= 17 ? "karna" : "shalya") : "dhrishtadyumna");
  O.BEFORE = "Last night the two armies camped face to face across the field. At dawn, between the lines, Krishna spoke with Arjuna, and Arjuna took up his bow.";
  // What happened on each day (for the summary at the next orders), and each side's aim and your orders on the days a life
  // can be given them.
  O.DAYS = {
    1: { done: "Bhishma's charge broke the Pandava front. Virata's sons Uttara and Shveta were killed.",
      p: { aim: "The grandsire will try to break us on the first day. Let him spend himself on our shields. We hold.", you: "Take your place in the line with your company and keep it. Do not chase, and do not break." },
      k: { aim: "I will lead the charge myself. Their line is new and nervous: we break it before it settles.", you: "Follow my chariot in, and hold every yard of ground we take." } },
    2: { done: "Arjuna stood against Bhishma, Bhima broke the Kalinga army, and the Pandavas won back their ground.",
      p: { aim: "Yesterday hurt us. Today Arjuna holds the grandsire, and the rest of us take the ground back.", you: "Push with your company where the lines meet, and keep together." },
      k: { aim: "They will come at us today to win back what they lost. Let them come onto our spears.", you: "Hold the line between the armies. No one leaves it." } },
    3: { done: "Bhishma's arrows fell like rain. Krishna leapt down with a chariot wheel to face him, until Arjuna held him back.",
      p: { aim: "The grandsire's archers will open the day. Live through the arrows, and keep the army together.", you: "When the arrows come, shields up and your men close. Then go forward." },
      k: { aim: "My arrows will open the day. Go in behind them where their ranks have scattered.", you: "Wait for the arrows, then take the ground they clear." } },
    4: { done: "Bhima killed eight of Duryodhana's brothers." },
    5: { done: "Bhurishravas killed Satyaki's ten sons." },
    6: { done: "The two formations met head on, and the killing went on past dusk. Neither broke.",
      p: { aim: "We stand as the makara today, the sea-beast's jaws, and their heron comes at us. The formation must hold.", you: "Your company has its place in the formation. Hold it, and do what the moment asks of you." },
      k: { aim: "We stand as the heron today. Find the joint in their makara and break it.", you: "Keep your place in the formation, and strike where theirs opens." } },
    7: { done: "Drona killed Virata's son Shankha. The armies fought on into the dark." },
    8: { done: "Iravan, Arjuna's son by the Naga princess, was killed by the rakshasa Alambusha. Bhima killed more of Duryodhana's brothers.",
      p: { aim: "Bhima goes after Duryodhana's brothers today, and Iravan's Naga horse ride with us.", you: "Ride with Iravan's horsemen, and keep his flank." },
      k: { aim: "Bhima is hunting the king's brothers. Keep him from them.", you: "Stop the Naga horsemen where they come at you." } },
    9: { done: "Bhishma broke the Pandava army again, and Krishna took up a wheel against him a second time. That night the Pandavas went to his tent, and he told them how he could be brought down.",
      p: { aim: "The grandsire has never been as terrible as he will be today. We must live through it.", you: "Hold the line when his chariot comes. Do not run." },
      k: { aim: "Today I mean to end this. Keep up with my chariot.", you: "Guard my flank while I fight." } },
    10: { done: "Arjuna, shooting from behind Shikhandi, brought Bhishma down. He lies on a bed of arrows between the armies.",
      p: { aim: "Shikhandi rides at the grandsire today, with Arjuna behind him. Bhishma will not raise his bow against Shikhandi. Get Shikhandi through.", you: "Clear the way in front of Shikhandi's chariot, and take the arrows meant for him." },
      k: { aim: "They will put Shikhandi in front of me, and I will not fight him. Keep him away from my chariot.", you: "Stand between Shikhandi and my chariot." } },
    11: { done: "Drona, now leading the Kauravas, tried to take Yudhishthira alive. Arjuna came back in time.",
      p: { aim: "Drona leads them now, and he has promised Duryodhana the king alive. Keep a ring around Yudhishthira.", you: "Guard the king's chariot with your company. Do not let it be cut off." },
      k: { aim: "I have promised the king Yudhishthira alive. Take him, and the war is over.", you: "Drive at Yudhishthira's chariot. Take him; do not kill him." } },
    12: { done: "The Samshaptakas drew Arjuna away to the south. Bhagadatta's elephant trampled the Pandava ranks until Arjuna killed them both.",
      p: { aim: "The Samshaptakas have sworn to draw Arjuna away. While he is gone, the king is ours to keep.", you: "Hold your ground near the king. If the elephant comes, get out of its way and fight on." },
      k: { aim: "The oath-sworn will draw Arjuna south. While he is away, we take the king.", you: "Keep Arjuna from getting back to the king." } },
    13: { done: "Abhimanyu broke into Drona's wheel alone. Jayadratha closed the breach behind him, and he was killed inside.",
      p: { aim: "Drona has drawn up the wheel. Only Abhimanyu knows how to break in. When he does, we follow him through the breach.", you: "Go in behind Abhimanyu, and keep the breach open." },
      k: { aim: "The wheel will hold them. Whoever gets in must not get out.", you: "Hold your ring of the wheel. Let no one through, in or out." } },
    14: { done: "Arjuna killed Jayadratha at the last light, as he had sworn. The fighting went on through the night, and Karna's Shakti killed Ghatotkacha.",
      p: { aim: "Arjuna has sworn to kill Jayadratha before sunset, or burn himself. Everything today is the road to Jayadratha.", you: "Clear the road ahead of Arjuna's chariot." },
      k: { aim: "Keep Jayadratha alive until sunset, and Arjuna burns on his own oath.", you: "Stand in Arjuna's road. Every moment you hold him, the sun goes lower." } },
    15: { done: "Drona was told his son was dead. He laid down his weapons, and Dhrishtadyumna killed him. Ashwatthama loosed the Narayana weapon in his grief.",
      p: { aim: "Drona cannot be beaten in a fair fight, and today he must fall. Keep him busy until the word reaches him.", you: "Hold the line around Drona's chariot. Do not let him break out." },
      k: { aim: "They mean to break me today. Keep the Panchala prince away from my chariot.", you: "Keep Dhrishtadyumna's men off my chariot." } },
    16: { done: "Karna led the Kauravas. Bhima killed Dushasana, and kept the vow he made in the dice hall.",
      p: { aim: "Karna leads them now. Bhima goes after Dushasana today, and he will not stop.", you: "Keep up with Bhima's charge, and hold what he takes." },
      k: { aim: "I lead the army now. Break them before Arjuna can reach me.", you: "Hold the line under my banner, and keep Bhima away from Dushasana." } },
    17: { done: "Karna's chariot wheel sank in the earth, and Arjuna killed him while he tried to free it.",
      p: { aim: "Arjuna and Karna meet today. Nothing else matters. Keep everything else off Arjuna's chariot.", you: "Keep the way clear around Arjuna's chariot." },
      k: { aim: "Today I meet Arjuna. Keep their men off my chariot, and watch my wheels.", you: "Guard my chariot's wheels." } },
    18: { p: { aim: "This is the last day. Shalya leads what is left of them. Finish it.", you: "Break what is left of their line, and do not let their king slip away." },
      k: { aim: "Shalya leads us today. We are fewer, but the king is alive, and while he lives the war goes on.", you: "Hold together around the king." } }
  };
  // The orders due at this scene for this life, or null: a battle day not yet briefed, for one who fights on a side.
  O.due = function (sc, S = K.S) {
    const day = sc && O.at[sc.id];
    if (!day || !S || !S.alive || (S.side !== "pandava" && S.side !== "kaurava")) return 0;
    return day > (S.ordersDay || 0) ? day : 0;
  };
  // Everything the screen shows. since: what happened from the day of the last orders to yesterday, a line a day (the last
  // four); mine: your own part since the last orders (the war's journal lines).
  O.info = function (day, S = K.S) {
    const side = S.side === "kaurava" ? "k" : "p", D = O.DAYS[day] || {}, chief = O.CHIEFS[O.chief(S.side, day)];
    const last = S.ordersDay || 0, from = Math.max(1, last), lines = []; // (the day of the last orders was fought after them)
    for (let d = from; d < day; d++) if (O.DAYS[d] && O.DAYS[d].done) lines.push(O.DAYS[d].done);
    const head = day === 1 ? "Before the battle" : last === day - 1 ? "Yesterday" : last ? "Since your last orders" : "Since the war began";
    const mine = (S.journal || []).slice(S.ordersJ || 0).filter((j) => j.act === 6).slice(-2);
    return { day, side, chief, head, since: day === 1 ? [O.BEFORE] : lines.slice(-4), more: lines.length > 4, mine, aim: (D[side] || {}).aim || "", you: (D[side] || {}).you || "" };
  };
  // Given: the life has had this day's orders.
  O.given = function (day, S = K.S) { S.ordersDay = Math.max(S.ordersDay || 0, day); S.ordersJ = (S.journal || []).length; };
})(window.K = window.K || {});
