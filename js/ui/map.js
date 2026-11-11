/* The map of Bharata: where the kingdoms lie, and the road this life has travelled.
   A scene's place is matched to a point on the map. When the place changes, a short journey
   plays over the scene: a path draws from where you were to where you are going. The whole
   road can be opened from the menu bar, and the ending shows it once more. Drawn in code
   (no art file), so the labels translate and it stays sharp on any screen. The one exception is
   the creation page's homeland map: a painting (art/map_bharat.webp) under drawn names and pins. */
(function (K) {
  "use strict";
  const U = K.UI;

  // Real positions (longitude, latitude), after the old geography; the coastline is Natural Earth
  // (public domain), clipped to the subcontinent. Label offsets are in full-map units.
  const LON0 = 61, LAT0 = 37.5, SC = 26, COS = Math.cos(22 * Math.PI / 180);
  const proj = (lon, lat) => [Math.round((lon - LON0) * COS * SC * 10) / 10, Math.round((LAT0 - lat) * SC * 10) / 10];
  const FULL = [-10, 0, 890, 835];
  const LAND = "M856,839L864,838L881,840L890,848L892,854L898,860L898,866L899,869L908,873L911,877L920,882L934,892L938,897L877,897L865,880L854,876L834,854L825,838L825,830L829,829L837,830L844,836L850,838ZM458,720L464,720L475,731L481,742L483,743L487,750L488,754L491,756L493,764L498,773L503,786L503,796L501,803L497,808L489,814L476,820L470,820L464,819L460,815L455,797L451,762L452,759L452,766L453,766L457,749L456,744L460,736L460,726L466,729L468,728L464,725L459,724L457,720ZM940,-65L940,656L935,670L931,677L928,692L920,707L920,722L923,730L922,734L926,735L933,733L936,734L938,738L940,752L940,804L933,796L933,790L929,787L930,784L925,783L922,777L920,774L918,774L917,770L911,765L909,760L906,758L904,759L902,762L901,762L898,756L898,747L901,733L909,710L906,714L904,712L903,697L908,689L910,683L910,674L913,670L911,669L907,670L909,657L906,657L908,654L907,652L908,646L906,633L898,618L898,613L897,612L896,620L895,618L894,607L890,594L890,593L892,594L890,591L889,592L887,589L885,562L882,559L883,547L885,544L877,545L873,536L873,531L864,523L866,525L864,528L866,532L862,541L859,544L854,546L851,543L850,539L848,539L852,547L838,555L836,560L829,566L827,565L828,556L824,564L818,564L817,554L816,558L811,561L813,546L812,550L806,557L801,559L802,546L809,525L810,518L806,502L800,488L801,488L797,484L797,474L794,477L794,484L788,480L783,471L785,471L791,475L795,472L795,470L786,461L788,457L785,457L781,454L777,453L775,454L776,458L776,459L775,459L771,453L774,450L772,450L773,445L772,444L769,451L767,450L766,450L769,446L765,440L765,447L755,434L749,424L748,411L743,397L744,394L742,395L736,385L735,380L728,386L722,387L714,375L714,362L713,366L706,365L713,370L713,374L710,376L712,379L710,380L710,383L714,394L713,396L708,402L705,407L703,408L701,406L701,403L704,399L698,402L697,400L697,395L699,391L696,393L695,403L689,409L687,396L687,405L684,410L681,410L679,409L676,401L676,405L674,405L676,412L673,412L672,410L669,414L668,410L669,403L666,400L665,407L665,412L662,413L658,409L657,413L654,412L652,411L656,399L651,396L649,393L650,396L655,400L650,408L643,412L629,416L623,423L623,426L626,437L621,444L621,447L615,451L612,455L609,454L610,455L608,458L592,463L591,463L592,461L592,458L591,458L585,461L583,466L587,463L589,465L573,478L557,499L546,505L535,517L515,530L513,535L515,539L512,544L501,550L489,550L485,560L482,565L478,565L477,562L474,562L465,567L461,577L459,583L462,599L461,605L465,624L462,618L460,621L466,628L464,645L455,663L452,674L453,677L451,681L453,680L454,682L454,707L447,706L441,708L440,710L440,714L432,726L432,729L434,732L441,734L444,736L433,734L420,738L414,744L411,757L398,765L393,763L387,759L375,744L369,729L367,717L370,719L371,727L373,727L370,717L367,714L366,710L355,680L350,671L342,662L336,648L332,635L330,620L325,610L323,598L312,583L311,577L309,575L312,575L308,570L309,568L306,567L301,558L297,547L293,517L286,490L289,480L289,477L285,482L285,479L285,473L289,474L284,472L283,469L284,467L283,466L281,459L287,438L285,426L282,424L280,419L283,417L280,417L285,413L292,409L285,411L278,411L279,406L282,404L278,404L279,399L285,397L270,396L273,398L272,401L266,408L270,410L271,415L266,425L242,436L234,436L229,433L220,427L197,403L192,395L194,392L200,396L221,388L228,378L229,377L229,375L225,379L220,378L209,383L199,381L188,376L184,372L179,362L187,355L174,361L173,355L172,357L170,355L168,355L165,354L164,355L161,356L160,353L158,354L152,346L149,331L137,329L137,319L131,310L126,310L124,312L129,312L132,313L126,313L113,316L91,317L88,320L74,315L71,316L66,315L62,316L60,320L40,318L32,322L29,319L22,322L13,320L10,322L-8,318L-10,314L-12,314L-14,317L-33,315L-37,312L-47,314L-53,311L-67,310L-72,308L-72,358L-64,361L-58,360L-54,364L-38,386L-35,388L-28,390L-28,392L-29,397L-39,416L-51,426L-61,444L-67,444L-66,439L-70,440L-72,444L-72,-65ZM-55,449L-57,450L-57,446L-51,437L-49,442L-52,444L-54,448ZM793,797L791,800L789,793L787,793L787,789L791,787L794,794ZM759,701L756,701L756,694L760,692L761,697ZM765,675L763,675L760,666L762,664L764,658L766,657L765,654L765,649L768,628L770,624L773,623L773,627L772,628L773,630L769,638L771,641L771,649L768,652L768,658L765,663L767,665L766,672ZM718,401L711,401L715,394L715,389L713,387L711,381L713,381L715,382L720,390L719,399Z";
  const PL = {
    gandhara: ["Gandhara", 72.83, 33.75, 0, -16],
    dvaita: ["Dvaita forest", 76.0, 30.35, -40, -28, "end", 1],
    ashram: ["Ashram on the Ganga", 78.25, 30.0, 40, -40, "start", 1],
    kurukshetra: ["Kurukshetra", 76.84, 29.97, 0, -34],
    // The two camps at Kurukshetra: where a fighter stands in the war, by side (one who crosses the
    // field on the first morning moves from one to the other: content/war_crossing.js).
    camp_pandava: ["Pandava camp", 76.6, 29.97, -16, 24, "end", 1],
    camp_kaurava: ["Kaurava camp", 77.08, 29.97, 16, 24, "start", 1],
    pramanakoti: ["Pramanakoti", 78.15, 29.45, 46, -6, "start", 1],
    kamyaka: ["Kamyaka forest", 76.3, 29.7, -46, 0, "end", 1],
    hastinapura: ["Hastinapura", 78.01, 29.16, 40, -28, "start"],
    varnavata: ["Varnavata", 77.43, 29.1, 44, 26, "start", 1],
    indraprastha: ["Indraprastha", 77.25, 28.61, -42, 6, "end"],
    matsya: ["Matsya", 76.17, 27.43, -36, 14, "end"],
    mathura: ["Mathura", 77.67, 27.49, 4, 38],
    panchala: ["Panchala", 79.28, 27.62, 36, 10, "start"],
    nishada: ["Nishada forests", 80.3, 24.6, 0, 24],
    anga: ["Anga", 86.95, 25.25, 0, 24],
    dwaraka: ["Dwaraka", 68.97, 22.24, -12, 4, "end"]
  };
  K.PLACES = {};
  for (const k in PL) { const [name, lon, lat, lx, ly, anchor, small] = PL[k]; const [x, y] = proj(lon, lat); K.PLACES[k] = { name, x, y, lx, ly, anchor: anchor || "middle", small: !!small }; }

  // Which point a scene's place (in English, before translation) belongs to. Places that could
  // be anywhere ("The river at dusk", "Your teacher's school") keep you where you were.
  const MATCH = [
    [/Hastinapura and/, null],
    [/Kurukshetra|bed of arrows|Pandava camp|Your tent|Chakravyuha/, "kurukshetra"],
    [/Indraprastha/, "indraprastha"],
    [/Varnavata/, "varnavata"],
    [/Pramanakoti/, "pramanakoti"],
    [/Kamyaka/, "kamyaka"],
    [/Dvaita/, "dvaita"],
    [/Virata|Matsya/, "matsya"],
    [/Panchala|Drupada|Kampilya/, "panchala"],
    [/Mathura/, "mathura"],
    [/Dwaraka/, "dwaraka"],
    [/^Anga|Champa/, "anga"],
    [/Gandhara/, "gandhara"],
    [/Nishada/, "nishada"],
    [/upper Ganga/, "ashram"],
    [/Hastinapura|Kuru assembly|palace gardens/, "hastinapura"]
  ];
  K.locOf = function (place, S = K.S) {
    if (!place) return null;
    if (place === "Home") return !K.ORIGINS[S.origin] ? null : S.flags.includes("moved_capital") ? "hastinapura" : S.origin === "suta" ? "anga" : K.locOf(K.ORIGINS[S.origin].name, S);
    for (const [re, loc] of MATCH) if (re.test(place)) return loc === "kurukshetra" && S.act >= 6 && (S.side === "pandava" || S.side === "kaurava") ? "camp_" + S.side : loc;
    return null;
  };

  // Called as each scene is drawn. Returns [from, to] when this scene moved you.
  K.travel = function (sc, S = K.S, after) {
    // A scene whose place names a town moves you there; the story puts you in every scene it shows.
    // A scene told as news (`away: true`) keeps you where you are.
    if (sc.away) return null;
    // A scene that tells why you are leaving (`travelAfter`) moves you once its story is told.
    if (sc.travelAfter && !after) return null;
    const loc = K.val(sc.to, S) || K.locOf(K.val(sc.place), S);
    if (!loc) return null;
    S.road = S.road || [];
    if (!S.at) { S.at = loc; if (S.road[S.road.length - 1] !== loc) S.road.push(loc); return null; }
    if (S.at === loc) return null;
    const from = S.at;
    S.at = loc;
    S.road.push(loc);
    return [from, loc];
  };

  // ---------- Drawing ----------
  const P = (k) => K.PLACES[k];
  // A smooth line through projected waypoints (Catmull-Rom turned into Bézier curves).
  function smooth(pts) {
    const p = pts.map(([lo, la]) => proj(lo, la));
    let d = "M" + p[0].join(",");
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      const r = (v) => Math.round(v * 10) / 10;
      d += " C" + r(b[0] + (c[0] - a[0]) / 6) + "," + r(b[1] + (c[1] - a[1]) / 6) + " " + r(c[0] - (e[0] - b[0]) / 6) + "," + r(c[1] - (e[1] - b[1]) / 6) + " " + c.join(",");
    }
    return d;
  }
  const RIVERS = [
    ["", [[77.5, 34.3], [75.8, 35.2], [74.6, 35.5], [72.3, 34.0], [71.6, 32.6], [71.0, 30.5], [69.6, 28.3], [68.4, 26.3], [68.2, 25.0], [67.5, 24.1]]],
    ["dry", [[77.3, 30.7], [76.3, 29.9], [75.0, 29.5], [73.5, 28.8], [72.0, 28.0]]],
    ["", [[78.45, 31.0], [77.6, 30.3], [77.25, 28.65], [77.67, 27.52], [78.02, 27.18], [79.0, 26.6], [80.4, 25.9], [81.88, 25.42]]],
    ["", [[79.0, 30.95], [78.3, 30.1], [78.12, 29.3], [78.6, 28.4], [79.35, 27.58], [80.35, 26.45], [81.88, 25.42], [83.0, 25.3], [85.15, 25.6], [86.95, 25.27], [87.9, 24.6], [88.4, 23.0], [88.2, 21.9]]],
    ["minor", [[81.7, 22.7], [80.0, 23.1], [77.5, 22.6], [75.5, 22.2], [73.5, 21.9], [72.7, 21.65]]],
    ["minor", [[73.6, 19.9], [75.3, 19.4], [78.0, 18.9], [80.6, 17.7], [81.9, 16.4]]]
  ];
  const HILLS = [[73.5, 35.6], [75, 34.9], [76.5, 33.9], [78, 32.9], [79.3, 31.4], [80.6, 30.2], [82, 29.4], [83.5, 28.9], [85, 28.4], [86.5, 28.1], [88, 28.0], [89.5, 27.9], [91, 27.9], [92.5, 28.2], [94, 28.6], [70, 35.6], [71.5, 36.1], [68.5, 35.0]];
  const LOW = [[75, 22.9], [76.5, 23.25], [78, 23.5], [79.5, 23.9], [81, 24.25], [73.9, 18.4], [74.3, 15.6], [75.6, 12.6], [76.9, 10.1]];
  function peaks(pts, s) {
    return pts.map(([lo, la]) => { const [x, y] = proj(lo, la); return "M" + (x - 9 * s) + "," + y + " L" + x + "," + (y - 11 * s) + " L" + (x + 9 * s) + "," + y; }).join(" ");
  }
  const T = (t) => U.esc(K.tr(t));
  const at = (lo, la) => proj(lo, la).join('" y="');

  // The painted map (owner, 7 November): one painting of the land, its relief, rivers, forests and seas, laid under
  // the pins on the creation page. It covers map units -60…930 across and -60…1100 down (2574 × 3016 px, 2.6 px a
  // unit; the art brief is docs/art_brief_map/). Only Part One carries the file (tools/split/build.js).
  const PAINTED = { file: "map_bharat", box: [-60, -60, 990, 1160] };
  const painting = () => '<image class="m-paint" href="' + U.esc(U.artUrl(PAINTED.file)) + '" x="' + PAINTED.box[0] + '" y="' + PAINTED.box[1] + '" width="' + PAINTED.box[2] + '" height="' + PAINTED.box[3] + '" preserveAspectRatio="none"/>';
  // Warm the painting while the title is up, so the map is ready when a new life begins.
  U.warmHomeMap = () => { if (U.preloadArt) U.preloadArt([PAINTED.file]); };

  // The ground: the subcontinent, its seas, rivers and mountains. The same for every life.
  // z scales lettering and marks, so they read the same size however far the map is zoomed.
  // over: drawn above the land and rivers and below the names (the creation page's painting, and what it covers).
  function ground(z, bare, over) {
    const fs = (n) => ' style="font-size:' + Math.round(n * z * 10) / 10 + 'px"';
    const name = (cls, t, lo, la, n, rot) => '<text class="' + cls + '" x="' + at(lo, la) + '"' + (rot ? ' transform="rotate(' + rot + " " + proj(lo, la).join(" ") + ')"' : "") + fs(n) + ">" + T(t) + "</text>";
    return '<rect class="m-sea" x="-200" y="-200" width="1300" height="1300"/><path class="m-land" d="' + LAND + '"/>' +
      (bare ? "" :
        '<path class="m-hills" d="' + peaks(HILLS, 1) + '"/><path class="m-hills low" d="' + peaks(LOW, 0.7) + '"/>' +
        RIVERS.map(([c, pts]) => '<path class="m-river ' + c + '" d="' + smooth(pts) + '"/>').join("") +
        (over || "") +
        name("m-region", "Himalaya", 84.5, 31.6, 15, 16) + name("m-region", "Desert", 71.6, 26.6, 14) +
        name("m-water", "Western sea", 66, 17, 16) + name("m-water", "Eastern sea", 87.5, 16, 16) +
        name("m-water", "Indus", 69.6, 29.6, 12, -58) + name("m-water", "Yamuna", 79.6, 26.0, 12, 28) + name("m-water", "Ganga", 83.6, 24.9, 12));
  }

  // Emblems beside the names, invented for the game (no real flags survive): Matsya's fish, Anga's
  // elephant, Gandhara's horse, the Yadavas' conch, the Nishadas' bow, crossed spears at Kurukshetra,
  // a tree for the forests, a lotus for the ashram, a flame for Varnavata. Drawn in a 20-unit box.
  const EMBLEM = {
    fish: '<path d="M-9 0 Q-1 -7 5 0 Q-1 7 -9 0 Z M5 0 L10 -4 L10 4 Z"/><circle class="e-eye" cx="-5" cy="-1" r="1"/>',
    elephant: '<path d="M-9 7 V0 Q-9 -6 -2 -6 H3 Q8 -7 9 -2 Q10 2 9 6 Q8 9 6 8 Q8 6 7 3 L6 3 V7 H3 V3 H-4 V7 Z"/><path class="e-line" d="M1 -5 Q-2 -1 2 2"/>',
    horse: '<path d="M-6 9 L-4 1 Q-6 -5 -1 -8 L0 -10 L2 -7 Q8 -5 9 1 Q9 3 7 3 L3 0 L3 9 Z"/>',
    conch: '<path d="M-8 3 Q-9 -5 -1 -7 Q8 -8 9 -1 Q9 5 3 6 L-5 9 L-4 5 Q-8 5 -8 3 Z"/><path class="e-line" d="M-3 -2 Q1 -5 4 -1 Q3 2 0 1"/>',
    bow: '<path class="e-line" d="M-5 -9 Q8 0 -5 9 M-5 -9 L-5 9 M-9 0 H9 M9 0 L5 -3 M9 0 L5 3"/>',
    spears: '<path class="e-line" d="M-8 8 L7 -7 M8 8 L-7 -7"/><path d="M7 -7 L9 -9 L8 -5 Z M-7 -7 L-9 -9 L-8 -5 Z"/>',
    tree: '<path d="M-7 2 Q-10 -4 -4 -6 Q-2 -10 2 -8 Q8 -9 8 -3 Q10 2 4 2 Z"/><path class="e-line" d="M0 2 V9"/>',
    lotus: '<path d="M0 6 Q-4 -1 0 -9 Q4 -1 0 6 Z M0 6 Q-9 3 -9 -4 Q-3 -2 0 6 Z M0 6 Q9 3 9 -4 Q3 -2 0 6 Z"/>',
    flame: '<path d="M0 -10 Q7 -2 5 4 Q3 9 0 9 Q-3 9 -5 4 Q-7 -2 0 -10 Z"/><path class="e-in" d="M0 -2 Q3 2 2 5 Q1 7 0 7 Q-1 7 -2 5 Q-3 2 0 -2 Z"/>'
  };
  const EMB = { matsya: "fish", anga: "elephant", gandhara: "horse", mathura: "conch", dwaraka: "conch", nishada: "bow", kurukshetra: "spears", camp_pandava: "spears", camp_kaurava: "spears", kamyaka: "tree", dvaita: "tree", ashram: "lotus", varnavata: "flame" };
  K.EMBLEM_OF = EMB;
  // An emblem in front of a label: placed by an estimate of the label's width, since SVG text
  // cannot be measured before it is drawn.
  // Labels anchored at their start (to the right of the dot) get the emblem first and the text
  // moved along; the others get it in front of the estimated start of the text.
  function emblem(kind, tx, ty, anchor, fs, label) {
    if (!kind) return "";
    const w = label.length * fs * 0.6, s = fs / 17;
    const start = anchor === "start" ? tx + 22 * s : anchor === "end" ? tx - w : tx - w / 2;
    return '<g class="m-emb" data-a="' + anchor + '" data-s="' + Math.round(s * 100) / 100 + '" data-y="' + Math.round((ty - fs * 0.34) * 10) / 10 + '" transform="translate(' + Math.round((start - 12 * s) * 10) / 10 + " " + Math.round((ty - fs * 0.34) * 10) / 10 + ") scale(" + Math.round(s * 100) / 100 + ')">' + EMBLEM[kind] + "</g>";
  }
  // Once a map is on the page the labels can be measured: emblems in front of right-aligned or
  // centred labels move to sit just before the real start of the text.
  U.fitEmblems = function (root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll(".bmap .m-emb[data-a]").forEach((g) => {
      if (g.dataset.a === "start") return;
      const t = g.parentNode.querySelector("text");
      if (!t || !t.getBBox) return;
      let x; try { const bb = t.getBBox(); if (!bb.width) return; x = bb.x; } catch (e) { return; }
      const sc = +g.dataset.s;
      g.setAttribute("transform", "translate(" + (x - 14 * sc).toFixed(1) + " " + g.dataset.y + ") scale(" + sc + ")");
    });
  };
  const shiftFor = (kind, anchor, fs) => (kind && anchor === "start" ? 26 * fs / 17 : 0);

  // The places: the ones this life has been to are filled, the current one ringed. Small places
  // (forests, an ashram) appear only once you have been there.
  function places(road, here, z, whole) {
    const been = new Set(road);
    return Object.keys(K.PLACES).filter((k) => !P(k).small || been.has(k) || k === here).map((k) => {
      const p = P(k), cls = (been.has(k) ? " been" : "") + (k === here ? " here" : "") + (p.small ? " small" : "");
      const tx = p.x + p.lx * z, ty = p.y + p.ly * z, far = Math.hypot(p.lx, p.ly) > 24;
      const fs = Math.round((p.small ? 13 : 15.5) * z * 10) / 10, name = K.tr(p.name), shown = !(whole && p.small && k !== here);
      return '<g class="m-place' + cls + '">' + (far ? '<line x1="' + p.x + '" y1="' + p.y + '" x2="' + tx + '" y2="' + (ty - 4 * z) + '"/>' : "") +
        '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (p.small ? 3.2 : 4.5) * z + '"/>' +
        (k === here ? '<circle class="m-ring" cx="' + p.x + '" cy="' + p.y + '" r="' + 10 * z + '"/>' : "") +
        (shown ? emblem(EMB[k], tx, ty, p.anchor, fs, name) + '<text x="' + (tx + shiftFor(EMB[k], p.anchor, fs)) + '" y="' + ty + '" text-anchor="' + p.anchor + '" style="font-size:' + fs + 'px">' + U.esc(name) + "</text>" : "") + "</g>";
    }).join("");
  }

  function svg(inner, label, vb, cls) {
    return '<svg class="bmap ' + (cls || "") + '" viewBox="' + vb.join(" ") + '" role="img" aria-label="' + U.esc(label) + '" preserveAspectRatio="xMidYMid meet">' + inner + "</svg>";
  }
  const roadText = (road) => road.map((k) => K.tr(P(k).name)).join(" → ");
  // A gentle bow between two points, so the road reads as a journey rather than a ruler line.
  function leg(a, b) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1, bend = Math.min(40, d * 0.18);
    return "M" + a.x + "," + a.y + " Q" + Math.round(mx - (dy / d) * bend) + "," + Math.round(my + (dx / d) * bend) + " " + b.x + "," + b.y;
  }
  function roadPaths(road) {
    let out = "";
    for (let i = 1; i < road.length; i++) if (road[i] !== road[i - 1]) out += '<path class="m-road" d="' + leg(P(road[i - 1]), P(road[i])) + '"/>';
    return out;
  }
  // A view framing the given places, at the given shape, never closer than minW across.
  function frame(keys, aspect, minW) {
    const xs = keys.map((k) => P(k).x), ys = keys.map((k) => P(k).y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    let w = Math.max(minW, (Math.max(...xs) - Math.min(...xs)) + 200), h = Math.max(w / aspect, (Math.max(...ys) - Math.min(...ys)) + 150);
    w = Math.min(Math.max(w, h * aspect), FULL[2]); h = w / aspect;
    return [Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h)];
  }
  // The whole subcontinent in the corner, with the zoomed part marked.
  function locator(vb, keys) {
    const W = vb[2] * 0.24, H = W * FULL[3] / FULL[2], m = vb[2] * 0.02;
    const corners = [[vb[0] + vb[2] - W - m, vb[1] + m], [vb[0] + m, vb[1] + vb[3] - H - m], [vb[0] + m, vb[1] + m], [vb[0] + vb[2] - W - m, vb[1] + vb[3] - H - m]];
    const pts = Object.keys(K.PLACES).filter((k) => !P(k).small || keys.includes(k)).map(P);
    const crowd = ([cx, cy]) => pts.filter((p) => p.x > cx - W * 0.4 && p.x < cx + W * 1.4 && p.y > cy - H * 0.3 && p.y < cy + H * 1.3).length;
    const [x, y] = corners.reduce((best, c) => (crowd(c) < crowd(best) ? c : best));
    return '<g class="m-inset"><rect x="' + x + '" y="' + y + '" width="' + W + '" height="' + H + '"/><svg x="' + x + '" y="' + y + '" width="' + W + '" height="' + H + '" viewBox="' + FULL.join(" ") + '">' +
      ground(1, true) + '<rect class="m-box" x="' + vb[0] + '" y="' + vb[1] + '" width="' + vb[2] + '" height="' + vb[3] + '"/></svg></g>';
  }

  // Lettering grows on narrow screens, so names stay readable on a phone.
  const grow = (px) => Math.max(1, Math.min(2.4, 700 / (px || 700)));
  const narrow = (px) => px < 520;

  // The road so far: zoomed to where this life has been, with the subcontinent in the corner;
  // or (whole) the entire subcontinent.
  U.mapOf = function (S = K.S, opt = {}) {
    const road = S.road && S.road.length ? S.road : [];
    const keys = road.length ? road : ["hastinapura", "kurukshetra", "indraprastha", "mathura", "panchala", "matsya"];
    const px = opt.px || 640, g = grow(px);
    const vb = opt.whole ? FULL : frame(keys, narrow(px) ? 1.1 : 1.5, 360), z = (vb[2] / FULL[2]) * g;
    const label = road.length ? K.tr("Map. Your road: {r}", { r: roadText(road) }) : K.tr("Map of the kingdoms");
    return svg(ground(z) + roadPaths(road) + places(road, S.at, z, opt.whole) + (opt.whole ? "" : locator(vb, keys)), label, vb, opt.whole ? "full" : "zoom");
  };

  // ---------- The journey ----------
  // When a choice takes you somewhere new, the map comes up before the next scene: the road from
  // where you were to where you are going, your puppet walking it and leaving footprints (about
  // two and a half seconds, skippable), "From X to Y" and why, below the map. With calm motion
  // the trail is drawn at once and the figure stands at the end.
  U.journeyPage = function (from, to, why, done) {
    U.keys([]);
    const S = K.S, a = P(from), b = P(to), d = leg(a, b);
    const road = S.road || [];
    // Shown again (a language switch), the walk is already done (ui/dom.js U.pageAgain).
    const pageKey = "journey:" + from + ">" + to, again = U.pageAgain(pageKey);
    const still = !U.motion() || again;
    const leaf = U.$("leaf");
    const px = Math.min(760, (leaf && leaf.clientWidth) || window.innerWidth - 32) - 40, g = grow(px);
    const vb = frame([from, to], narrow(px) ? 1.1 : 1.5, 360), z0 = vb[2] / FULL[2], z = z0 * g;
    const fh = Math.round(118 * z0 * Math.sqrt(g)); // the walker's height, in map units
    const inner = ground(z) + roadPaths(road.slice(0, -1)) +
      '<path class="m-road new" pathLength="1" style="stroke-width:' + Math.round(3.2 * z0 * Math.sqrt(g) * 10) / 10 + '" d="' + d + '"/>' +
      '<g class="m-steps"></g>' + places(road, to, z) + locator(vb, [from, to]) +
      '<g class="m-walker"><g class="m-face"' + (b.x < a.x ? ' transform="scale(-1 1)"' : "") + ">" +
      U.puppet(K.puppetSpec(S), { pose: still ? "stand" : "walk", h: fh }).replace("<svg ", '<svg x="' + -Math.round(fh * 0.29) + '" y="' + -fh + '" ') + "</g></g>";
    const route = K.tr("From {a} to {b}", { a: K.tr(a.name), b: K.tr(b.name) });
    leaf.className = "leaf journeying";
    leaf.innerHTML = U.plate({ keepArt: true, noFigure: true, tag: "yours", tagText: K.tr("The road"), heading: K.tr(b.name) }) +
      '<div class="text"><div class="jmap">' + svg(inner, K.tr("You travel from {a} to {b}.", { a: K.tr(a.name), b: K.tr(b.name) }), vb, "zoom") + "</div>" +
      '<p class="j-route">' + emblemBadge(EMB[from]) + U.esc(K.tr(a.name)) + ' <span class="j-arrow" aria-hidden="true">→</span> ' + emblemBadge(EMB[to]) + U.esc(K.tr(b.name)) + '<span class="sr">' + U.esc(route) + "</span></p>" +
      (why ? '<p class="j-why">' + U.t(why) + "</p>" : "") +
      '<div class="btnrow"><button type="button" class="cta" id="journey-go">' + U.tr("Continue") + "</button></div></div>";
    U.fitEmblems(leaf);
    const map = leaf.querySelector(".bmap"), path = map.querySelector(".m-road.new"), steps = map.querySelector(".m-steps"), walker = map.querySelector(".m-walker");
    const figure = walker.querySelector(".pp");
    const L = path.getTotalLength ? path.getTotalLength() : 0;
    const gap = Math.max(8, L / 18);
    let dropped = 0, raf = 0, t0 = 0, over = false;
    const at = (f) => (L ? path.getPointAtLength(L * f) : { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    const place = (f) => { const p = at(f); walker.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")"); };
    // Footprints fall on alternate sides of the road.
    const stepTo = (len) => {
      while (dropped * gap <= len && L) {
        const f = (dropped * gap) / L, p = at(f), q = at(Math.min(1, f + 0.01));
        const ang = Math.atan2(q.y - p.y, q.x - p.x), side = dropped % 2 ? 1 : -1, off = 6 * z0 * Math.sqrt(g);
        const x = p.x + Math.cos(ang + Math.PI / 2) * off * side, y = p.y + Math.sin(ang + Math.PI / 2) * off * side;
        steps.insertAdjacentHTML("beforeend", '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" rx="' + (3.6 * z0 * Math.sqrt(g)).toFixed(2) + '" ry="' + (1.9 * z0 * Math.sqrt(g)).toFixed(2) + '" transform="rotate(' + (ang * 180 / Math.PI).toFixed(0) + " " + x.toFixed(1) + " " + y.toFixed(1) + ')"/>');
        dropped++;
      }
    };
    const finish = () => {
      if (over) return;
      over = true; cancelAnimationFrame(raf);
      path.style.animation = "none"; path.style.strokeDashoffset = "0";
      stepTo(L); place(1);
      if (figure) figure.setAttribute("class", figure.getAttribute("class").replace(/pose-\S+/, "pose-stand"));
    };
    const DUR = 2600, ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const tick = (now) => {
      if (!t0) t0 = now;
      const f = Math.min(1, (now - t0) / DUR), e = ease(f);
      path.style.strokeDashoffset = String(1 - e);
      stepTo(L * e); place(e);
      if (f < 1) raf = requestAnimationFrame(tick); else finish();
    };
    place(0);
    if (still) finish(); else { path.style.animation = "none"; path.style.strokeDashoffset = "1"; raf = requestAnimationFrame(tick); }
    if (K.Sound && K.Sound.play && !again) try { K.Sound.play("step"); } catch (e) { /* no step sound: fine */ }
    let left = false;
    const go = () => { if (left) return; left = true; finish(); done(); };
    // A first press while the figure walks finishes the walk; the next one moves on.
    map.addEventListener("click", finish);
    U.$("journey-go").addEventListener("click", go);
    U.keys([() => (over ? go() : finish())]);
    U.redraw = () => U.journeyPage(from, to, why, done);
    const ph = leaf.querySelector(".pagehead");
    U.pageShown(pageKey);
    U.stage([ph, leaf.querySelector(".jmap"), leaf.querySelector(".j-route"), leaf.querySelector(".j-why"), leaf.querySelector(".text .btnrow")].filter(Boolean), null, again);
  };
  // A small emblem for running text.
  function emblemBadge(kind) {
    return kind ? '<svg class="emb" viewBox="-11 -11 22 22" aria-hidden="true"><g class="m-emb">' + EMBLEM[kind] + "</g></svg>" : "";
  }
  U.emblemBadge = emblemBadge;

  // ---------- Choosing a homeland on the map ----------
  // Before the picture list: the north of the subcontinent with every homeland marked. The
  // charioteer family lives in Champa, beside Anga, so its pin sits just below Anga's.
  const HOMES = { hastinapura: "hastinapura", panchala: "panchala", matsya: "matsya", mathura: "mathura", anga: "anga", suta: "anga", nishada: "nishada", gandhara: "gandhara" };
  // On a phone the map is drawn small, so its names and pins are drawn bigger (big = 1.5).
  // ---------- The homeland map, dressed (owner, 7 November) ----------
  // On the creation page only: shaded mountains with snow, forests of little trees, the desert's dunes, waves on the
  // seas, a small drawing at each homeland, boats on the Ganga, birds, the rivers catching the light, a compass rose
  // and a title cartouche. k sizes them for the screen; vis is the part of the map in the box (the drawing runs on
  // below it). The moving pieces are CSS animations, so Calm motion stills them like everything else.
  // Since the painting came (7 November) the drawn relief is only its stand-in while it loads: { under, over }.
  function homeDressing(k, vis) {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const pt = (lo, la) => proj(lo, la);
    const g = (x, y, s, inner, cls) => '<g class="' + (cls || "lm") + '" transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + s.toFixed(3) + ')">' + inner + "</g>";
    // Mountains: a range along the Himalaya, each a peak with a sunlit face, a shaded face and snow.
    const RANGE = [[72.6, 35.4], [74.2, 34.8], [75.8, 34.0], [77.4, 32.9], [78.9, 31.6], [80.4, 30.5], [82, 29.8], [83.6, 29.3], [85.2, 28.95], [86.8, 28.7], [88.4, 28.55], [90, 28.5], [91.6, 28.65], [93.2, 29.0]];
    let mts = "";
    for (let row = 1; row >= 0; row--) {
      for (let i = 0; i < RANGE.length - 1; i++) {
        const [a, b] = [pt(...RANGE[i]), pt(...RANGE[i + 1])];
        for (let t = 0; t < 1; t += 0.5) {
          const x = a[0] + (b[0] - a[0]) * t + (row ? 9 : 0), y = a[1] + (b[1] - a[1]) * t - (row ? 16 : 0) * k + (rnd() - 0.5) * 6 * k;
          const h = (row ? 15 : 22 + rnd() * 9) * k, w = h * (1.25 + rnd() * 0.3);
          mts += '<g class="mt' + (row ? " far" : "") + '"><path class="mt-l" d="M' + (x - w / 2).toFixed(1) + "," + y.toFixed(1) + " L" + x.toFixed(1) + "," + (y - h).toFixed(1) + " L" + (x + w * 0.06).toFixed(1) + "," + y.toFixed(1) + ' Z"/>' +
            '<path class="mt-r" d="M' + x.toFixed(1) + "," + (y - h).toFixed(1) + " L" + (x + w / 2).toFixed(1) + "," + y.toFixed(1) + " L" + (x + w * 0.06).toFixed(1) + "," + y.toFixed(1) + ' Z"/>' +
            '<path class="mt-snow" d="M' + (x - w * 0.15).toFixed(1) + "," + (y - h * 0.7).toFixed(1) + " L" + x.toFixed(1) + "," + (y - h).toFixed(1) + " L" + (x + w * 0.15).toFixed(1) + "," + (y - h * 0.7).toFixed(1) + " L" + (x + w * 0.04).toFixed(1) + "," + (y - h * 0.62).toFixed(1) + ' Z"/></g>';
        }
      }
    }
    // Forests: little trees in clusters (the Nishadas' forests, the foothills, the Vindhyas, the east, the ghats).
    const FORESTS = [[79.2, 23.3, 0.9, 16], [81.3, 23.3, 0.8, 12], [77.4, 23.5, 0.8, 10], [80.6, 28.95, 0.5, 7], [82.6, 28.35, 0.6, 8], [84.6, 27.85, 0.5, 6], [86.2, 23.5, 0.7, 9], [74.4, 16.4, 0.6, 7], [75.6, 13.4, 0.5, 6], [76.25, 30.05, 0.28, 5]];
    let trees = "";
    FORESTS.forEach(([lo, la, r, n]) => {
      const list = [];
      for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r; list.push(pt(lo + Math.cos(a) * d * 1.3, la + Math.sin(a) * d * 0.8)); }
      list.sort((p, q) => p[1] - q[1]).forEach(([x, y]) => { const s = k * (0.8 + rnd() * 0.45); trees += g(x, y, s, '<path class="tr-t" d="M0 0 V5"/><path class="tr-c" d="M-5 1 Q-7 -5 -2 -7 Q0 -11 3 -7 Q8 -5 5 1 Z"/>', "tr"); });
    });
    // The desert's dunes, and waves on the seas.
    let dunes = "";
    for (let i = 0; i < 14; i++) { const [x, y] = pt(70.2 + rnd() * 3.4, 25.3 + rnd() * 3.1); if (Math.abs(x - pt(71.6, 26.6)[0]) < 50 * k && Math.abs(y - pt(71.6, 26.6)[1]) < 12 * k) continue; dunes += g(x, y, k, '<path d="M-9 2 Q-4 -3 0 0 Q4 -4 9 2"/>', "dn"); }
    let waves = "";
    [[63.5, 14, 6.5, 8, 12], [84.8, 13.5, 6, 6.5, 12], [62.5, 23, 4, 3, 5]].forEach(([lo, la, w, h, n]) => {
      for (let i = 0; i < n; i++) { const [x, y] = pt(lo + rnd() * w, la + rnd() * h); waves += g(x, y, k, '<path d="M-8 0 Q-4 -3 0 0 T8 0"/>', "wv"); }
    });
    // A drawing at each homeland, beside its pin and clear of its name.
    const LM = {
      palace: '<path class="lm-f" d="M-16 10 V2 H16 V10 Z"/><path class="lm-f" d="M-6 2 V-5 Q0 -15 6 -5 V2 Z"/><path class="lm-f" d="M-15 2 V-6 Q-12.5 -11 -10 -6 V2 Z M10 2 V-6 Q12.5 -11 15 -6 V2 Z"/><path class="lm-l" d="M0 -14 V-21 L6 -19 L0 -17 M-3 10 V5 Q0 2 3 5 V10"/>',
      altar: '<path class="lm-f" d="M-12 10 V5 H12 V10 Z M-8 5 V1 H8 V5 Z"/><path class="lm-fire" d="M-5 1 Q-8 -6 -3 -11 Q-2 -6 0 -14 Q3 -7 4 -10 Q8 -4 4 1 Z"/><path class="lm-fire2" d="M-2 1 Q-3 -4 0 -7 Q2 -3 2 1 Z"/>',
      horses: '<path class="lm-f" d="M-17 6 L-15 0 Q-11 -3 -4 -2 L-1 -7 L2 -6 L0 -2 Q1 2 -1 4 L-2 9 L-4 9 L-4 4 L-12 4 L-13 9 L-15 9 Z"/><path class="lm-f" d="M2 7 L4 1 Q8 -2 15 -1 L18 -5 L20 -4 L18 0 Q19 4 17 5 L16 10 L14 10 L14 5 L7 5 L6 10 L4 10 Z"/><path class="lm-l" d="M-17 1 Q-20 3 -19 7 M2 2 Q-1 4 0 8"/>',
      cow: '<path class="lm-f" d="M-12 4 Q-12 -4 -5 -4 H5 L7 -7 L9 -4 L12 -3 L11 0 L7 1 L6 4 V9 H4 V5 H-6 V9 H-8 V5 Q-11 6 -12 4 Z"/><path class="lm-l" d="M7 -7 Q6 -10 3 -10 M9 -4 Q12 -8 14 -7 M-12 -1 Q-15 1 -14 6"/>',
      elephant: '<path class="lm-f" d="M-14 10 V1 Q-14 -8 -4 -8 H5 Q12 -9 13 -3 Q15 3 13 8 Q12 12 9 11 Q11 8 10 4 L9 4 V10 H5 V4 H-6 V10 H-10 V4 Z"/><path class="lm-cloth" d="M-9 -8 L-8 -14 H5 L6 -8 Z"/><path class="lm-l" d="M-8 -14 L-1 -19 L6 -14 M2 -7 Q-2 -1 3 3"/>',
      chariot: '<circle class="lm-f" cx="-4" cy="5" r="7"/><path class="lm-l" d="M-4 -2 V12 M-11 5 H3 M-9 0 L1 10 M1 0 L-9 10 M-1 -2 H14 M10 -2 L14 -9"/><path class="lm-cloth" d="M-12 -2 V-11 H4 L2 -2 Z"/>',
      huts: '<path class="lm-f" d="M-15 10 V2 H-5 V10 Z M3 10 V0 H15 V10 Z"/><path class="lm-roof" d="M-17 3 L-10 -7 L-3 3 Z M1 1 L9 -10 L17 1 Z"/><path class="lm-l" d="M-11 10 V6 H-9 V10 M8 10 V5 H10 V10"/>',
      camel: '<path class="lm-f" d="M-14 7 L-12 0 Q-10 -3 -8 0 Q-6 -8 -2 0 Q0 -7 4 -1 L7 -6 L11 -5 L9 -1 L8 2 L7 8 H5 V3 H-4 V8 H-6 V3 Q-9 3 -11 7 Z"/><path class="lm-l" d="M-12 1 Q-15 3 -14 6"/>',
      boat: '<path class="lm-f" d="M-12 1 Q0 8 12 1 Z"/><path class="lm-l" d="M0 1 V-13"/><path class="lm-sail" d="M1 -12 L10 -1 H1 Z"/>'
    };
    const marks = [["palace", 77.15, 29.75], ["altar", 80.25, 28.35], ["horses", 75.25, 26.55], ["cow", 76.85, 26.35], ["elephant", 87.85, 26.05], ["chariot", 88.05, 23.95], ["huts", 81.55, 23.75], ["camel", 71.6, 32.75]]
      .map(([n, lo, la]) => { const [x, y] = pt(lo, la); return g(x, y, k * 1.15, LM[n], "lm lm-" + n); }).join("");
    // Boats on the Ganga, drifting; birds over the plain; the rivers catching the light.
    const boats = [[83.35, 25.33], [85.75, 25.55], [80.9, 25.7]].map(([lo, la], i) => { const [x, y] = pt(lo, la); return '<g class="m-boat" style="animation-delay:' + (-i * 7) + 's">' + g(x, y - 2 * k, k, LM.boat, "lm") + "</g>"; }).join("");
    const birds = [[81.5, 30.2], [83.4, 30.9], [79.6, 31.6]].map(([lo, la], i) => { const [x, y] = pt(lo, la); return '<g class="m-bird" style="animation-delay:' + (-i * 11) + 's">' + g(x, y, k, '<path d="M-6 0 Q-3 -3 0 0 Q3 -3 6 0 M6 -6 Q8 -8 10 -6 Q12 -8 14 -6"/>', "bd") + "</g>"; }).join("");
    const shine = RIVERS.filter((r) => !r[0]).slice(1).map(([, pts]) => '<path class="m-shine" d="' + smooth(pts) + '"/>').join("");
    // More names: the Vindhyas, the dry Sarasvati, the Narmada. (The painting has the Narmada but neither the
    // Vindhyas' hills nor the Sarasvati's bed, and trees where the Vindhyas' name went: those two names go with the
    // drawn relief, under it.)
    const fs = (n) => ' style="font-size:' + Math.round(n * k * 10) / 10 + 'px"';
    const drawnNames = '<text class="m-region" x="' + at(78.6, 22.85) + '"' + fs(12) + ">" + T("Vindhya") + "</text>" +
      '<text class="m-water dry" x="' + at(73.4, 29.15) + '" transform="rotate(24 ' + proj(73.4, 29.15).join(" ") + ')"' + fs(10.5) + ">" + T("Sarasvati") + "</text>";
    const names = '<text class="m-water" x="' + at(76.6, 22.15) + '"' + fs(10.5) + ">" + T("Narmada") + "</text>";
    // The compass rose (lower right of the box) and the title cartouche (lower left).
    const [vx, vy, vw, vh] = vis, cs = k * 1.35;
    const compass = g(vx + vw - 34 * cs, vy + vh - 40 * cs, cs, '<circle class="cp-r" r="18"/><circle class="cp-r2" r="13"/><path class="cp-s" d="M0 -22 L4 -4 L0 0 Z M0 22 L-4 4 L0 0 Z M-22 0 L-4 -4 L0 0 Z M22 0 L4 4 L0 0 Z"/><path class="cp-d" d="M0 -22 L-4 -4 L0 0 Z M0 22 L4 4 L0 0 Z M-22 0 L-4 4 L0 0 Z M22 0 L4 -4 L0 0 Z"/><text class="cp-n" x="0" y="-26" text-anchor="middle">N</text>', "cp");
    const cw = 150, cx0 = vx + vw - (cw + 16) * cs, cy0 = vy + 14 * cs;
    const cart = g(cx0, cy0, cs, '<path class="ct-b" d="M6 0 H' + (cw - 6) + ' Q' + cw + ' 0 ' + cw + ' 6 V30 Q' + cw + ' 36 ' + (cw - 6) + ' 36 H6 Q0 36 0 30 V6 Q0 0 6 0 Z"/><path class="ct-i" d="M5 4 H' + (cw - 5) + " V32 H5 Z\"/>" +
      '<text class="ct-t" x="' + cw / 2 + '" y="18" text-anchor="middle">' + T("Bharatavarsha") + '</text><text class="ct-s" x="' + cw / 2 + '" y="28.5" text-anchor="middle">' + T("The lands of the epic") + "</text>", "ct");
    // The drawn relief, forests, dunes, waves and drawings go under the painting (seen only until it has loaded);
    // the moving pieces, names, cartouche and compass go on top of it.
    return { under: '<g class="dress under">' + dunes + waves + trees + mts + marks + drawnNames + "</g>", over: '<g class="dress">' + shine + boats + birds + names + cart + compass + "</g>" };
  }

  // aspect: the frame's width over its height (the creation page asks for its own box's, so the map fills it).
  // extend: the drawing runs on below the box by that much of its height (so the creation page can slide it up).
  U.homeMap = function (chosen, big = 1, aspect = 1.55, extend = 1) {
    const keys = Object.keys(K.ORIGINS).filter((k) => HOMES[k]);
    let vb = frame(keys.map((k) => HOMES[k]), aspect, 360), vis = null;
    // A box of its own shape (the creation page): kept on the drawn map, never past its edges into blank sea.
    if (aspect !== 1.55) {
      // closer in than the plain frame: the homelands' own spread and room for their names (owner, 7 November)
      const ps = keys.map((k) => P(HOMES[k])), xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
      const bw = Math.max(...xs) - Math.min(...xs) + 130, bh = Math.max(...ys) - Math.min(...ys) + 150;
      let w = Math.max(bw, bh * aspect), h = w / aspect;
      vb = [(Math.min(...xs) + Math.max(...xs)) / 2 - w / 2, (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2 + 18, w, h];
    }
    if (aspect !== 1.55) {
      let [x, y, w, h] = vb; const cx = x + w / 2, cy = y + h / 2;
      if (h > FULL[3]) { h = FULL[3]; w = h * aspect; }
      if (w > FULL[2]) { w = FULL[2]; h = w / aspect; }
      x = Math.min(Math.max(cx - w / 2, FULL[0]), FULL[0] + FULL[2] - w); y = Math.min(Math.max(cy - h / 2, FULL[1]), FULL[1] + FULL[3] - h);
      vis = [x, y, w, h];
      vb = [x, y, w, h * extend].map(Math.round);
    }
    const z = vb[2] / FULL[2];
    // Where each label sits: [dx, dy, anchor], in map units before zoom.
    const LBL = { gandhara: [12, 6, "start"], hastinapura: [12, 6, "start"], panchala: [12, 6, "start"], matsya: [-12, 6, "end"], mathura: [10, 26, "start"], anga: [-12, 6, "end"], suta: [-12, 6, "end"], nishada: [-12, 6, "end"] };
    const pins = keys.map((k) => {
      const p = P(HOMES[k]), x = p.x, y = p.y + (k === "suta" ? 52 * z : 0);
      const name = K.tr(K.ORIGINS[k].name), fs = Math.round(17 * z * big * 10) / 10;
      const [dx, dy, anchor] = LBL[k] || [12, 6, "start"];
      const tx = x + dx * z * big, ty = y + dy * z * (big > 1 ? 1.3 : 1);
      const kind = k === "suta" ? "wheel" : EMB[HOMES[k]];
      return '<g class="m-home' + (chosen === k ? " on" : "") + '" data-home="' + k + '" tabindex="0" role="button" aria-label="' + U.esc(name) + '">' +
        '<circle class="hit" cx="' + x + '" cy="' + y + '" r="' + 22 * z * big + '"/>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + 6 * z * Math.sqrt(big) + '"/>' +
        (kind ? emblem(kind, tx, ty, anchor, fs, name) : "") +
        '<text x="' + (tx + shiftFor(kind, anchor, fs)) + '" y="' + ty + '" text-anchor="' + anchor + '" style="font-size:' + fs + 'px">' + U.esc(name) + "</text></g>";
    }).join("");
    if (!vis) return svg(ground(z) + pins, K.tr("Map of the homelands"), vb, "zoom homes");
    // The creation page's map is the painting, dressed with the moving pieces and names (owner, 7 November).
    const d = homeDressing(z * Math.pow(big, 0.55), vis);
    return svg(ground(z, false, d.under + painting()) + d.over + pins, K.tr("Map of the homelands"), vb, "zoom homes dressed painted");
  };
  EMBLEM.wheel = '<circle class="e-line" cx="0" cy="0" r="8"/><path class="e-line" d="M0 -8 V8 M-8 0 H8 M-5.6 -5.6 L5.6 5.6 M5.6 -5.6 L-5.6 5.6"/><circle cx="0" cy="0" r="2"/>';

  U.openMap = function () {
    const S = K.S;
    const road = S.road || [];
    let whole = false;
    const draw = (body) => {
      const px = body.clientWidth || 640;
      body.querySelector(".map-holder").innerHTML = U.mapOf(S, { whole, px });
      U.fitEmblems(body);
      const t = body.querySelector("#map-toggle");
      t.textContent = K.tr(whole ? "Show your road" : "Show the whole subcontinent");
      t.setAttribute("aria-pressed", String(whole));
    };
    U.openModal("Map", '<div class="map-holder"></div><div class="btnrow"><button type="button" class="ghost" id="map-toggle" aria-pressed="false"></button></div>' +
      (road.length ? '<p class="map-road"><span class="lbl">' + U.tr("Your road") + "</span> " + U.esc(roadText(road)) + "</p>" : ""),
      (body) => { draw(body); body.querySelector("#map-toggle").addEventListener("click", () => { whole = !whole; draw(body); }); });
  };
})(window.K = window.K || {});
