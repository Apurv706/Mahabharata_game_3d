/* The map of Bharata as data: real positions, the Natural Earth coastline (public domain), rivers and hill lines, which place a
   scene's name belongs to, and the rule that moves a life along its road. Lifted from the 2D game's ui/map.js; the 3D relief map
   (ui/map3d.js) is built from it. */
(function (K) {
  "use strict";
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
  K.MAP = { LAND, RIVERS, HILLS, LOW, proj, FULL, LON0, LAT0, SC, COS };
})(window.K = window.K || {});
