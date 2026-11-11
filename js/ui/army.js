/* The army battle (PRD §18.3): a division officer's day, played on the field seen from above.
   First the array: the commander names the day's vyuha (crane, wheel, crocodile, needle) and you
   put your two or three companies on its marks. Then the orders: for four to six rounds the enemy
   pushes one or two sectors of your line (arrows coming down on them); each round you give one
   order: hold (every sector stands, a little weaker), flank (strike the pushed sector's side: strong
   if it is the only push, costly if there are two), fall back (the pushed sectors give ground and
   lose nothing, but the line's strength drains), or send help (your reserve to one sector: that
   sector holds well, the other push lands unanswered). The line has one strength bar; your Command
   and statecraft make every order count more. The line holds to the end: win. Bent but standing:
   close. Broken: lose, and the day's fight follows with the enemy inspired (content/command.js).
   trial: { attr: "command", skill: "statecraft", array?: key, rounds?: n, stage } */
(function (K) {
  "use strict";
  const U = K.UI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sfx = (n) => { if (K.Sound) K.Sound.play(n); };
  // The day's array: a name and three sector marks [x, y] on the field (the enemy is at the top),
  // and where the reserve waits.
  const VYUHA = {
    crane: ["The crane", [[-62, -20], [0, -56], [62, -20]], [0, 40]],
    wheel: ["The wheel", [[-56, -40], [56, -40], [0, 22]], [0, 68]],
    crocodile: ["The crocodile", [[0, -70], [0, -22], [0, 26]], [-70, 20]],
    needle: ["The needle", [[0, -76], [-40, -26], [40, -26]], [0, 44]],
    crescent: ["The crescent", [[-64, -48], [0, -14], [64, -48]], [0, 40]] // horns forward (the Pandavas on the twelfth day, content/war_oath.js)
  };
  const SECTOR = ["Left", "Centre", "Right"];
  // The companies you can set: your own, then whoever fights beside you, then the king's levies.
  const COMPANY_ART = {
    company: '<path d="M-9 8 H9 M-7 8 V-2 H7 V8 M0 -2 V-11 M-4 -9 H4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    soldiers: '<path d="M-8 9 V-5 M-3 9 V-7 M3 9 V-5 M8 9 V-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M-10 -5 H10" stroke="currentColor" stroke-width="1.6"/>',
    ally: '<circle r="7" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M-4 0 H4 M0 -4 V4" stroke="currentColor" stroke-width="2"/>'
  };
  const ORDERS = { hold: "Hold", flank: "Flank", back: "Fall back", help: "Send help" };

  U.games.array = function (box, done, c) {
    return U.trialFrame(box, done, c, "array", ({ host, power, t, finish, cue }) => {
      const key = t.array && VYUHA[t.array] ? t.array : K.pick(Object.keys(VYUHA).filter((k) => k !== "crescent")), [aname, marks, reserveAt] = VYUHA[key]; // the crescent only when named
      const rounds = t.rounds || 5;
      const companies = (K.val(t.companies) || ["company", "soldiers", "ally"]).slice(0, 3);
      const filled = marks.map(() => null);
      let phase = "place", unit = 0, round = 0, line = 100, bent = false, over = false, push = [], lastSay = "";
      // Every order counts more for a commander: the swing of each round against the strength.
      const edge = clamp(0.6 + power * 0.08, 0.6, 1.6);
      host.innerHTML = '<p class="score" aria-live="polite"></p><div class="formfield armyfield"><svg viewBox="-100 -100 200 200" role="img" aria-label="' + U.esc(K.tr("The field, seen from above")) + '"></svg></div>' +
        '<div class="linebar" aria-hidden="true"><i></i></div><p class="game-note" aria-live="polite"></p><div class="btnrow army-btns"></div>';
      const svg = host.querySelector("svg"), score = host.querySelector(".score"), note = host.querySelector(".game-note"), bar = host.querySelector(".linebar i"), row = host.querySelector(".btnrow");
      const say = (txt, vars) => { lastSay = K.tr(txt, vars); note.textContent = lastSay; };
      const tally = () => {
        score.textContent = phase === "place" ? K.tr("{array} · Companies set: {p} of {n}", { array: K.tr(aname), p: unit, n: marks.length })
          : K.tr("{array} · Round {r} of {n} · The line: {l}%", { array: K.tr(aname), r: Math.min(round, rounds), n: rounds, l: Math.round(line) });
        bar.style.width = clamp(line, 0, 100) + "%";
        bar.className = line < 35 ? "low" : line < 65 ? "mid" : "";
      };
      const icon = (u, x, y, cls) => '<g class="unit ' + (cls || "") + '" transform="translate(' + x + " " + y + ')">' + (COMPANY_ART[u] || COMPANY_ART.ally) + "</g>";
      function draw() {
        let s = '<path class="enemy-line" d="M-90 -92 H90"/>';
        push.forEach((k) => { const [x, y] = marks[k]; s += '<g transform="translate(' + x + " " + (y - 30) + ')"><g class="probe coming"><path d="M-10 -20 L0 0 L10 -20 M-10 -32 L0 -12 L10 -32"/></g></g>'; });
        marks.forEach(([x, y], i) => {
          s += '<g class="mark' + (filled[i] ? " full" : "") + '" data-i="' + i + '"><circle cx="' + x + '" cy="' + y + '" r="16"/><text x="' + (x + 13) + '" y="' + (y - 12) + '">' + (i + 1) + "</text></g>";
          if (filled[i]) s += icon(filled[i], x, y, "placed");
        });
        s += '<g class="mark reserve"><circle cx="' + reserveAt[0] + '" cy="' + reserveAt[1] + '" r="11"/></g>';
        svg.innerHTML = s;
        svg.querySelectorAll(".mark[data-i]").forEach((el) => el.addEventListener("pointerdown", (e) => { e.preventDefault(); if (phase === "place") place(+el.dataset.i); else if (phase === "help") help(+el.dataset.i); }));
      }
      function place(i) {
        if (phase !== "place" || over || filled[i]) return;
        filled[i] = companies[unit]; unit++;
        cue("good"); sfx("tap");
        if (unit >= Math.min(companies.length, marks.length)) { marks.forEach((m, k) => { if (!filled[k]) filled[k] = "soldiers"; }); return startOrders(); }
        say("Next: {unit}. Put them on a mark of the {array}.", { unit: K.tr(companyName(companies[unit])), array: K.tr(aname).toLowerCase() });
        tally(); draw();
      }
      const companyName = (u) => (u === "company" ? "Your company" : u === "soldiers" ? "The king's levies" : "The friends who fight beside you");
      function startOrders() {
        phase = "orders"; row.innerHTML = "";
        Object.entries(ORDERS).forEach(([k, lbl]) => row.appendChild(U.pressButton(lbl, () => order(k))));
        nextRound();
      }
      function nextRound() {
        round++;
        if (round > rounds) return end();
        phase = "orders";
        const two = K.rng() < 0.35 + round * 0.06;
        const a = Math.floor(K.rng() * 3); let b = Math.floor(K.rng() * 3); if (b === a) b = (a + 1) % 3;
        push = two ? [a, b] : [a];
        say(two ? "They push on the {a} and the {b}. Your order?" : "They push on the {a}. Your order?", { a: K.tr(SECTOR[push[0]]), b: K.tr(SECTOR[push[1]] || "") });
        tally(); draw();
      }
      // How the round goes, by the order: the swing against the line's strength (negative is loss).
      function order(k) {
        if (phase !== "orders" || over) return;
        const two = push.length === 2;
        if (k === "help") { phase = "help"; say("Send the reserve where? Tap the sector."); draw(); return; }
        let swing, txt;
        if (k === "hold") { swing = two ? -14 : -8; txt = "The line stands, and pays for it."; }
        else if (k === "flank") { swing = two ? -16 : 6; txt = two ? "You strike one flank and the other push comes through." : "Your flank attack rolls them back."; }
        else { swing = two ? -5 : -3; txt = "You give ground. Nothing is lost but ground, and the line thins."; }
        resolve(swing, txt);
      }
      function help(i) {
        if (phase !== "help" || over) return;
        const hit = push.includes(i), two = push.length === 2;
        const swing = hit ? (two ? -6 : 8) : (two ? -18 : -12);
        resolve(swing, hit ? (two ? "The reserve holds one push. The other bends the line." : "The reserve meets them, and the line holds.") : "The reserve goes to a quiet sector, and the push lands unanswered.");
      }
      function resolve(swing, txt) {
        line = clamp(line + (swing < 0 ? swing / edge : swing * edge), 0, 100);
        if (line < 60) bent = true;
        say(txt);
        if (swing >= 0) { cue("good"); sfx("choose"); } else { cue("bad"); sfx("hit"); }
        push = []; phase = "wait"; tally(); draw();
        if (line <= 0) return end();
        setTimeout(nextRound, 1100);
      }
      function end() {
        over = true; phase = "done";
        const out = line > 0 && !bent ? "win" : line > 0 ? "close" : "lose";
        setTimeout(() => finish(out, out === "lose" ? "The line broke." : ["The line held to the end at {l}%.", { l: Math.round(line) }]), 700);
      }
      const keys = { 1: () => (phase === "place" ? place(0) : help(0)), 2: () => (phase === "place" ? place(1) : help(1)), 3: () => (phase === "place" ? place(2) : help(2)),
        h: () => order("hold"), f: () => order("flank"), b: () => order("back"), s: () => order("help"), ArrowLeft: () => help(0), ArrowUp: () => help(1), ArrowDown: () => help(1), ArrowRight: () => help(2) };
      const onKey = (e) => { if (keys[e.key]) { e.preventDefault(); keys[e.key](); } };
      document.addEventListener("keydown", onKey, true);
      say("\"{array}, today,\" says the commander. Put {unit} on a mark.", { array: K.tr(aname), unit: K.tr(companyName(companies[0])).toLowerCase() });
      tally(); draw();
      return () => document.removeEventListener("keydown", onKey, true);
    });
  };
})(window.K = window.K || {});
