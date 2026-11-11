/* The game in two parts, for hosts that hold a limited number of files (the private play page holds
   at most 512). Part One is Acts I-IV, Part Two is Acts V-VII; each carries only the paintings its
   acts use. A life crosses from one to the other with its save code. Not loaded by the GitHub build:
   tools/split/build.js writes it into each part's page, after window.K_PART = { n, other, lives }. */
(function (K) {
  "use strict";
  const U = K.UI, P = window.K_PART || {};
  if (!P.n) return;
  const HI = {
    "Part One · Acts I–IV": "भाग एक · अंक I–IV",
    "Part Two · Acts V–VII": "भाग दो · अंक V–VII",
    "Part One ends here": "भाग एक यहीं समाप्त होता है",
    "Your life goes on in Part Two: the exile years, the war and what comes after. Copy this save code, open Part Two and choose Continue from Part One.": "आपका जीवन भाग दो में आगे चलता है: वनवास के वर्ष, युद्ध और उसके बाद का समय। यह सेव कोड कॉपी करें, भाग दो खोलें और 'भाग एक से आगे' चुनें।",
    "Open Part Two": "भाग दो खोलें",
    "Open Part One": "भाग एक खोलें",
    "Continue from Part One": "भाग एक से आगे",
    "Begin at Act V": "अंक V से शुरू करें",
    "A ready-made life": "पहले से बना एक जीवन",
    "Someone who has already lived Acts I–IV. Choose one to begin at the exile years.": "कोई जो अंक I–IV जी चुका है। वनवास के वर्षों से शुरू करने के लिए एक चुनें।",
    "This life is still in Acts I–IV. Load it in Part One.": "यह जीवन अभी अंक I–IV में है। इसे भाग एक में खोलें।",
    "This part holds Acts I–IV. Acts V–VII are in Part Two.": "इस भाग में अंक I–IV हैं। अंक V–VII भाग दो में हैं।",
    "This part holds Acts V–VII. Start here with your save code from Part One, or with a ready-made life.": "इस भाग में अंक V–VII हैं। भाग एक का अपना सेव कोड लेकर यहाँ से शुरू करें, या पहले से बने किसी जीवन के साथ।",
    "Copy code": "कोड कॉपी करें", "Copied": "कॉपी हो गया", "Return to title": "शीर्षक पर लौटें",
    "{name} · {origin} · {path}": "{name} · {origin} · {path}",
    "Begin at the war": "युद्ध से शुरू करें",
    "Ready for the war": "युद्ध के लिए तैयार",
    "Someone who has lived to the eve of the war. Choose one to begin on the night before the first day, and play the eighteen days.": "कोई जो युद्ध की पूर्व-संध्या तक जी चुका है। पहले दिन से पहले की रात से शुरू करने और अठारह दिन खेलने के लिए एक चुनें।",
    "With the Pandavas": "पांडवों के साथ", "With the Kauravas": "कौरवों के साथ",
    "Act {n} is in Part One": "अंक {n} भाग एक में है",
    "Acts I–IV are played in Part One. Copy this save code, open Part One and choose Load a save code: your life goes back to the start of Act {n}.": "अंक I–IV भाग एक में खेले जाते हैं। यह सेव कोड कॉपी करें, भाग एक खोलें और 'सेव कोड से खोलो' चुनें: आपका जीवन अंक {n} की शुरुआत पर लौट जाएगा।",
    "in Part One": "भाग एक में",
  };
  const tr = (s, p) => { let t = K.lang === "hi" && HI[s] ? HI[s] : s; for (const k in p || {}) t = t.split("{" + k + "}").join(p[k]); return U.esc(t); };
  const otherLink = (label) => P.other ? '<a class="cta" href="' + U.esc(P.other) + '" target="_blank" rel="noopener">' + tr(label) + "</a>" : "";
  const live = (sc) => sc && !sc.ending && K.S && K.S.alive;

  // Act checkpoints (engine/flow.js): Part One keeps Acts I-IV; Part Two keeps Acts V-VII, and lists the
  // earlier acts a life brought with it in its code (going back to one hands the life to Part One).
  K.checkpointOk = (act) => (P.n === 1 ? act < 5 : act >= 5);
  K.checkpointShown = (act) => P.n === 2 && act < 5;
  const copyBtn = (btn, ta) => btn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(ta.value); btn.textContent = K.lang === "hi" ? HI.Copied : "Copied"; }
    catch (e) { ta.focus(); ta.select(); }
  });
  function handOver(title, text, code, label) {
    if (U.endingClose) U.endingClose();
    U.closeModal();
    U.setNav(false);
    U.where("<b>" + title + "</b>");
    U.$("leaf").className = "leaf";
    U.$("leaf").innerHTML = '<div class="text part-hand"><h1>' + title + "</h1><p>" + text + "</p>" +
      '<textarea id="part-code" readonly spellcheck="false">' + U.esc(code) + "</textarea>" +
      '<div class="btnrow"><button class="cta" id="part-copy" type="button">' + tr("Copy code") + "</button>" + otherLink(label) +
      '<button class="ghost" id="part-title" type="button">' + tr("Return to title") + "</button></div></div>";
    copyBtn(U.$("part-copy"), U.$("part-code"));
    U.$("part-title").addEventListener("click", () => U.renderTitle());
  }
  // Part Two: going back to Act IV or earlier gives the life, as it was at that act's start, to Part One.
  const back = U.goBackToAct;
  if (back) U.goBackToAct = function (act) {
    if (P.n !== 2 || act >= 5) return back.apply(this, arguments);
    const life = K.checkpointLife(act);
    if (!life) return back.apply(this, arguments);
    const n = ["", "I", "II", "III", "IV"][act] || act;
    handOver(tr("Act {n} is in Part One", { n }), tr("Acts I–IV are played in Part One. Copy this save code, open Part One and choose Load a save code: your life goes back to the start of Act {n}.", { n }),
      K.exportCode({ life, acts: true, here: true }), "Open Part One");
  };
  const buttons = U.actButtons;
  if (buttons) U.actButtons = function (kept, opts) {
    const html = buttons.apply(this, arguments);
    if (P.n !== 2) return html;
    // the acts held in Part One say so
    return html.replace(/(data-act="([1-4])"><b>[^<]*<\/b><small>)/g, "$1" + tr("in Part One") + " · ");
  };

  // Part One stops at the threshold of Act V: the life is saved there, and its code carries it over.
  function partEnd() {
    U.setNav(false);
    U.where("<b>" + tr("Part One ends here") + "</b>");
    U.$("leaf").innerHTML = '<div class="text"><h1>' + tr("Part One ends here") + "</h1><p>" +
      tr("Your life goes on in Part Two: the exile years, the war and what comes after. Copy this save code, open Part Two and choose Continue from Part One.") + "</p>" +
      '<textarea id="part-code" readonly spellcheck="false">' + U.esc(K.exportCode({ acts: true, here: true })) + "</textarea>" +
      '<div class="btnrow"><button class="cta" id="part-copy" type="button">' + tr("Copy code") + "</button>" + otherLink("Open Part Two") +
      '<button class="ghost" id="part-title" type="button">' + tr("Return to title") + "</button></div></div>";
    U.$("part-copy").addEventListener("click", async () => {
      const ta = U.$("part-code");
      try { await navigator.clipboard.writeText(ta.value); U.$("part-copy").textContent = K.lang === "hi" ? HI.Copied : "Copied"; }
      catch (e) { ta.focus(); ta.select(); }
    });
    U.$("part-title").addEventListener("click", () => U.renderTitle());
  }
  // Part Two cannot play Acts I-IV (their paintings are in Part One).
  function partStart() {
    U.setNav(false);
    U.$("leaf").innerHTML = '<div class="text"><p>' + tr("This life is still in Acts I–IV. Load it in Part One.") + '</p><div class="btnrow">' + otherLink("Open Part One") +
      '<button class="ghost" id="part-title" type="button">' + tr("Return to title") + "</button></div></div>";
    U.$("part-title").addEventListener("click", () => U.renderTitle());
  }
  const render = U.renderScene;
  U.renderScene = function (sc) {
    if (live(sc) && P.n === 1 && (sc.act || 0) >= 5) return partEnd();
    if (live(sc) && P.n === 2 && sc.act && sc.act < 5) return partStart();
    return render.apply(this, arguments);
  };

  // A ready-made life begins at the start of its act: that start is kept, to go back to.
  const begin = (s) => { s.lifeId = K.newLifeId(); K.resume(s); K.checkpoint(K.S); };
  function readyMade() {
    const rows = (P.lives || []).map((l, i) => {
      const o = K.ORIGINS[l.origin], pth = K.PATHS && K.PATHS[l.path];
      return '<button type="button" class="ghost" data-i="' + i + '">' + tr("{name} · {origin} · {path}", { name: l.name, origin: K.tr(o ? o.name : l.origin), path: K.tr(pth ? pth.name : l.path) }) + "</button>";
    }).join("");
    U.openModal("A ready-made life", '<p class="note">' + tr("Someone who has already lived Acts I–IV. Choose one to begin at the exile years.") + '</p><div class="btnrow part-lives">' + rows + "</div>", () => {
      document.querySelectorAll(".part-lives [data-i]").forEach((b) => b.addEventListener("click", () => {
        const s = K.importCode(P.lives[+b.dataset.i].code); U.closeModal(); begin(s);
      }));
    });
  }
  // Lives on the eve of the war (tools/split/gen_war.js), a few on each side.
  function warReady() {
    const side = (s, label) => {
      const rows = (P.war || []).map((l, i) => [l, i]).filter(([l]) => l.side === s).map(([l, i]) => {
        const o = K.ORIGINS[l.origin], pth = K.PATHS && K.PATHS[l.path];
        return '<button type="button" class="ghost" data-w="' + i + '">' + tr("{name} · {origin} · {path}", { name: l.name, origin: K.tr(o ? o.name : l.origin), path: K.tr(pth ? pth.name : l.path) }) + "</button>";
      }).join("");
      return rows ? '<p class="part-side"><b>' + tr(label) + '</b></p><div class="btnrow part-lives">' + rows + "</div>" : "";
    };
    U.openModal("Ready for the war", '<p class="note">' + tr("Someone who has lived to the eve of the war. Choose one to begin on the night before the first day, and play the eighteen days.") + "</p>" +
      side("pandava", "With the Pandavas") + side("kaurava", "With the Kauravas"), () => {
      document.querySelectorAll(".part-lives [data-w]").forEach((b) => b.addEventListener("click", () => {
        const s = K.importCode(P.war[+b.dataset.w].code); U.closeModal(); begin(s);
      }));
    });
  }
  const title = U.renderTitle;
  U.renderTitle = function () {
    title.apply(this, arguments);
    const row = U.$("title-btns"); if (!row) return;
    if (P.n === 2) {
      const fresh = U.$("btn-new");
      const load = U.button("cta" + (U.$("btn-continue") ? " secondary" : ""), tr("Continue from Part One"), () => U.openLoad(), "btn-part1");
      const ready = U.button("ghost", tr("Begin at Act V"), readyMade, "btn-act5");
      const atWar = (P.war || []).length ? U.button("ghost", tr("Begin at the war"), warReady, "btn-war") : null;
      if (fresh) { row.insertBefore(load, fresh); row.insertBefore(ready, fresh); if (atWar) row.insertBefore(atWar, fresh); fresh.remove(); } else { if (atWar) row.prepend(atWar); row.prepend(ready); row.prepend(load); }
      // the old "Load a save code" button does the same as Continue from Part One
      [...row.querySelectorAll("button")].filter((b) => !b.id && b.textContent === K.tr("Load a save code")).forEach((b) => b.remove());
    }
    // (No note on the title about the two parts (owner, 7 November): the title is one screen. Part One hands a life
    // to Part Two at the end of Act IV, with the link, and Part Two's buttons say where to begin.)
  };
  const css = document.createElement("style");
  css.textContent = "@keyframes partIn{from{opacity:0}to{opacity:.9}}.part-note{animation:partIn .6s 3.4s both;margin:10px 0 0;font-size:.92rem;opacity:.9;max-width:34em}.part-note a{color:inherit}#part-code{width:100%;min-height:96px;font-size:.8rem}.part-lives{flex-direction:column;align-items:stretch}.part-side{margin:12px 0 4px}a.cta{text-decoration:none;display:inline-flex;align-items:center;justify-content:center}";
  document.head.appendChild(css);
})(window.K);
