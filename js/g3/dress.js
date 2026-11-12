/* What each person's cloth, metal and skin are made of (js/g3/surf.js draws it). The models carry colours by role; this
   reads a model's look and says, part by part, which surface each role is: the artist's sheets show undyed cotton with
   two madder lines at the hem for working people and soldiers, dyed silk with broad gold-thread borders at court, gold
   tissue with small woven flowers for a king's upper cloth, scale coats edged in gold, quilted and studded leather for
   the rank and file, bark cloth and spotted deerskin in the forest years, and plain white with no border in mourning.
     G.dress(id, look, cols, M) → (part, role) → { p, c2, cell, b, c3, bw } */
(function (K) {
  "use strict";
  const T = window.THREE, G = (K.G3 = K.G3 || {});
  if (!T) return;
  const _c = new T.Color(), _h = {};
  const hsl = (hex) => { _c.set(hex); _c.getHSL(_h, T.SRGBColorSpace); return _h; };
  const goldish = (x) => { const h = hsl(x); return h.h > 0.06 && h.h < 0.16 && h.s > 0.38 && h.l > 0.3 && h.l < 0.78; };
  const whitish = (x) => { const h = hsl(x); return h.l > 0.86 || (h.s < 0.3 && h.l > 0.72); };
  const silvery = (x) => { const h = hsl(x); return h.s < 0.17 && h.l > 0.4; };
  const dark = (x) => hsl(x).l < 0.2;
  const far = (a, b) => { const p = hsl(a), ph = p.h, ps = p.s, pl = p.l, q = hsl(b); return Math.abs(pl - q.l) > 0.1 || (Math.abs(ps - q.s) > 0.25) || (Math.min(Math.abs(ph - q.h), 1 - Math.abs(ph - q.h)) > 0.06 && Math.max(ps, q.s) > 0.25); };
  const shade = (x, k) => { _c.set(x); const h = _c.getHex(T.SRGBColorSpace); return (Math.min(255, Math.round(((h >> 16) & 255) * k)) << 16) | (Math.min(255, Math.round(((h >> 8) & 255) * k)) << 8) | Math.min(255, Math.round((h & 255) * k)); };
  const mix = (a, b, k) => { _c.set(a); const x = _c.getHex(T.SRGBColorSpace); _c.set(b); const y = _c.getHex(T.SRGBColorSpace); const ch = (s) => Math.round(((x >> s) & 255) * (1 - k) + ((y >> s) & 255) * k); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
  const GOLD = 0xd9a53a, BRIGHT = 0xf4d67a, BRONZE = 0xb08a4a, CREAM = 0xf0e4c8, THONG = 0x2e1c10;
  const ROYAL = /^(yudhishthira|bhima|arjuna|nakula|sahadeva|draupadi|krishna|karna|duryodhana|dushasana|bhishma|shakuni|dhritarashtra|gandhari|kunti|balarama|abhimanyu|drupada|dhrishtadyumna|shikhandi|satyaki|jayadratha|shalya|virata|uttara|ashwatthama|vidura|ghatotkacha)$/;
  const QUILT = /^(soldier_foot|soldier_archer|soldier_charioteer|raider|guard|villager|ugra|charu|village)/, LAMELLAR = /^(soldier_cw|satyaki|dhrishtadyumna|virata|uttara|shalya|jayadratha|drupada|shikhandi)$/;
  const SKIN = { p: "skin" }, HAIR = { p: "hair" }, GEM = { p: "gem" }, BEADS = { p: "beads" }, IRON = { p: "iron" }, LEATHER = { p: "leather" }, COTTON = { p: "cotton" }, SILK = { p: "silk" }, GOLDW = { p: "gold" };
  G.dress = function (id, look, cols, M) {
    const royal = ROYAL.test(id), rich = look === "court" || look === "bride" || look === "tournament", plain = look === "mourning", rough = look === "forest", raider = id === "raider";
    const hem = M && M.sided ? cols.red : cols.hem, rim = goldish(cols.armour == null ? 0 : cols.armour) ? BRIGHT : GOLD;
    // A length of cloth: what it is woven of, and its border.
    function cloth(base, bcol, wide, upper) {
      const s = {};
      if (rough) { s.p = "bark"; return s; }
      if (raider) { s.p = "bands"; s.c2 = shade(base, 0.68); s.cell = 0.1; return s; }
      const white = whitish(base);
      s.p = royal && !white && !plain ? "silk" : "cotton";
      if (royal && rich && upper && !plain) { s.p = "buti"; s.c2 = goldish(base) ? shade(base, 0.6) : white ? mix(base, GOLD, 0.55) : GOLD; s.cell = 0.075; }
      if (!plain && bcol != null && far(bcol, base)) {
        s.c3 = bcol;
        if (royal && (goldish(bcol) || (silvery(bcol) && !white))) { s.b = "zari"; s.bw = rich ? wide : wide * 0.62; }
        else if (royal) { s.b = "royal"; s.bw = rich ? wide * 0.85 : wide * 0.6; }
        else { s.b = "lines"; s.bw = wide * 0.62; }
      } else if (!plain && royal && rich) { s.c3 = GOLD; s.b = "zari"; s.bw = wide * 0.7; }
      return s;
    }
    const memo = {};
    return function (part, role) {
      const k = part + "/" + role; if (k in memo) return memo[k];
      let s = null;
      switch (role) {
        case "skin": s = SKIN; break;
        case "hair": case "stubble": case "stubble.001": s = HAIR; break;
        case "gem": s = GEM; break;
        case "beads": s = BEADS; break;
        case "iron": s = IRON; break;
        case "gold": s = part === "lames" ? { p: "scale", c2: silvery(cols.gold) ? GOLD : shade(cols.gold, 0.55), cell: 0.05 } : GOLDW; break;
        case "armour":
          if (part === "pauldron") s = { p: "plate", b: "rim", c3: rim, bw: 0.018 };
          else if (QUILT.test(id)) s = { p: "quilt", c2: BRONZE, cell: 0.075 };
          else if (LAMELLAR.test(id)) s = { p: "lamellar", c2: THONG, cell: 0.06 };
          else s = { p: "scale", c2: rim, cell: 0.052 };
          break;
        case "leather":
          if (part === "vambrace" || part === "greave") s = silvery(cols.leather) || goldish(cols.leather) ? { p: "plate", b: "rim", c3: rim, bw: 0.014 } : { p: "leather", c2: BRONZE, cell: 0.05 };
          else s = LEATHER;
          break;
        case "hide": s = { p: "hide", c2: CREAM, cell: 0.075 }; break;
        case "band": s = royal && part === "bandeau" && !plain && !rough ? { p: "silk", b: "zari", c3: GOLD, bw: 0.018 } : part === "bandeau" ? cloth(cols.band, hem, 0.03) : SILK; break;
        case "white": s = part === "thread" || part === "blindfold" ? COTTON : null; break;
        case "hem": s = royal && hem != null && (goldish(hem) || silvery(hem)) && !plain ? { p: "zari", c2: shade(hem, 0.6), cell: 0.022 } : rough ? { p: "bark" } : COTTON; break;
        case "cloth": s = cloth(cols.cloth, hem, part === "tuck" ? 0.03 : 0.095); break;
        case "cloth2": s = cloth(cols.cloth2, cols.red, part === "veil" ? 0.05 : 0.075, true); break;
        case "red":
          if (part === "shawl" || part === "drape") s = royal && goldish(cols.red) && !plain ? { p: "zari", c2: shade(cols.red, 0.6), cell: 0.022 } : rough ? { p: "bark" } : royal ? SILK : COTTON;
          else if (part === "turban") s = { p: "bands", c2: shade(cols.red, 0.7), cell: 0.045 };
          else if (rough) s = { p: "bark" };
          else if (plain) s = COTTON;
          else if (royal && goldish(cols.red)) s = { p: "zari", c2: shade(cols.red, 0.58), cell: 0.03 };
          else if (royal) s = { p: dark(cols.red) && rich ? "buti" : "silk", c2: GOLD, cell: 0.05, b: "zari", c3: GOLD, bw: part === "knot" ? 0 : 0.022 };
          else s = { p: "cotton", b: "lines", c3: mix(cols.red, CREAM, 0.7), bw: part === "sash" || part === "panel" ? 0.03 : 0 };
          break;
        default: s = null;
      }
      return (memo[k] = s);
    };
  };
})(window.K = window.K || {});
