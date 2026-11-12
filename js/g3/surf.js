/* Surfaces. Everything a person wears or carries, and the war's machines, is still coloured per vertex; this adds what
   the colour is made of. Each vertex names a surface (hand-loomed cotton, silk, a striped or checked or tie-dyed or
   ikat cloth, gold-thread brocade, scale and lamellar and quilted armour, worked gold, hammered iron, leather, wood,
   cane, hair, skin, a spotted hide...), a second colour for its figure, and a woven border: its colour, its width, and
   how far the vertex lies from the cloth's edge. The figure is drawn by the shader in the cloth's own space (the
   rest pose of a body, wrapped round it; the face of a board or the length of a pole for a built thing), so it stays
   on the cloth as the body moves and costs no pictures to fetch. Far away it fades to the cloth's mean colour.
     G.surfMat({ map: 1, side })      a material that draws surfaces (map: 0 given coordinates, 1 wrapped round a body, 2 seen from the side)
     G.SURF.id.scale, G.SURF.border.zari   the names
     G.surfPack(...)                  bytes for the three vertex attributes */
(function (K) {
  "use strict";
  const T = window.THREE, G = (K.G3 = K.G3 || {});
  if (!T) return;
  const ID = { plain: 0, cotton: 1, silk: 2, bands: 3, pin: 4, check: 5, buti: 6, bandhani: 7, ikat: 8, zari: 9, gem: 10, scale: 11, lamellar: 12, quilt: 13, gold: 14, iron: 15, leather: 16, wood: 17, sun: 18, cane: 19, hair: 20, skin: 21, hide: 22, beads: 23, lotus: 24, tiger: 25, rings: 26, blade: 27, rope: 28, plate: 29, bark: 30, paint: 31, feather: 32, thatch: 33, plaster: 34, stone: 35, mud: 36, carve: 37, terracotta: 38 };
  const BORDER = { none: 0, band: 1, lines: 2, zari: 3, temple: 4, royal: 5, rim: 6 };
  G.SURF = { id: ID, border: BORDER };

  const VPARS = "attribute vec4 surfP;\nattribute vec4 surfA;\nattribute vec4 surfB;\nattribute vec4 surfC;\nvarying vec4 vSp;\nvarying vec4 vSa;\nvarying vec4 vSb;\nvarying vec4 vSc;\n#if SURF_MAP == 1\nattribute vec2 faceUV;\nvarying vec2 vFuv;\n#endif\n";
  const VMAIN = "\nvSp = surfP; vSa = surfA; vSb = surfB; vSc = surfC;\n#if SURF_MAP == 1\nvFuv = faceUV;\n#endif\n";
  // A modelled head wears a painted face (js/g3/face.js): the canvas, and which of its four faces, are set for each figure as it is drawn.
  G.faceU = { tex: { value: null }, cell: { value: new T.Vector4(0, 0, 0, 0) } };
  const FPARS = [
    "varying vec4 vSp; varying vec4 vSa; varying vec4 vSb; varying vec4 vSc;",
    "#if SURF_MAP == 1\nvarying vec2 vFuv; uniform sampler2D uFaceTex; uniform vec4 uFaceCell;\n#endif",
    "float sH(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }",
    "float sN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(sH(i), sH(i + vec2(1., 0.)), f.x), mix(sH(i + vec2(0., 1.)), sH(i + vec2(1., 1.)), f.x), f.y); }",
    "float sB(float x, float a, float b, float w){ return smoothstep(a - w, a + w, x) - smoothstep(b - w, b + w, x); }",
    "vec3 sLin(vec3 c){ return c * (c * (c * .305306011 + .682171111) + .012522878); }",
    "vec3 surfSpc = vec3(.1); float surfShn = 18.; float surfRim = 0.; float surfSss = 0.;", ""
  ].join("\n");
  // (after the vertex colour is in diffuseColor)
  const FMAIN = `
  {
    float sid = floor(vSa.a * 255. + .5), cell = max(.004, vSb.x * .64);
    vec3 base = diffuseColor.rgb, c2 = sLin(vSa.rgb);
    #if SURF_MAP == 1
      float ang = atan(vSp.x, vSp.z), nrep = max(1., floor(1.131 / cell + .5));
      vec2 qm = vec2(ang * .18, vSp.y), q = vec2(ang * .159155 * nrep, vSp.y * nrep / 1.131);
    #elif SURF_MAP == 2
      vec2 qm = vSp.zy, q = qm / cell;
    #else
      vec2 qm = vSp.xy, q = qm / cell;
    #endif
    float fq = max(fwidth(q.x), fwidth(q.y)), aa = clamp(1.6 - 1.7 * fq, 0., 1.), w = clamp(fq * .75, .01, .5);
    float fm = max(fwidth(qm.x), fwidth(qm.y)), nr = clamp(1.5 - fm * 110., 0., 1.), mid = clamp(1.5 - fm * 40., 0., 1.);
    float m = 0., mavg = 0., dk = 1., spS = .1; vec3 spC = vec3(1.);
    if (sid < .5) { spS = 0.; }
    else if (sid < 1.5) { dk = 1. + .09 * mid * (sN(qm * vec2(34., 120.)) + sN(qm * vec2(150., 30.)) - 1.); spS = .05; }
    else if (sid < 2.5) { dk = 1. + .07 * mid * (sN(qm * vec2(16., 190.)) - .5); spS = .2; surfShn = 13.; spC = mix(vec3(1.), base * 3. + .1, .7); surfRim = .6; }
    else if (sid < 3.5) { float f = fract(q.y); m = sB(f, .1, .42, w) + sB(f, .56, .62, w) + sB(f, .74, .8, w); mavg = .44; spS = .06; dk = 1. + .07 * mid * (sN(qm * vec2(34., 120.)) - .5); }
    else if (sid < 4.5) { float f = fract(q.x); m = sB(f, .42, .58, w); mavg = .16; spS = .06; }
    else if (sid < 5.5) { float a = sB(fract(q.x), .1, .5, w), b = sB(fract(q.y), .1, .5, w); m = max(a, b) * .55 + a * b * .45; mavg = .5; spS = .05; dk = 1. + .07 * mid * (sN(qm * vec2(34., 120.)) - .5); }
    else if (sid < 6.5) { vec2 g = q; g.x += step(1., mod(floor(g.y), 2.)) * .5; vec2 f = fract(g) - .5; float d = abs(f.x) + abs(f.y); m = 1. - smoothstep(.17 - w, .17 + w, d); m = max(m, (1. - smoothstep(.05, .05 + w, min(length(f - vec2(.5, .5)), min(length(f + vec2(.5, .5)), min(length(f - vec2(.5, -.5)), length(f + vec2(.5, -.5))))))) * .8); mavg = .09; spS = .3; surfShn = 26.; surfRim = .45; }
    else if (sid < 7.5) { vec2 g = q + .35 * vec2(sN(q * .8), sN(q * .8 + 7.)); vec2 i = floor(g), f = fract(g) - .5; f += (vec2(sH(i), sH(i + 3.7)) - .5) * .34; float d = length(f); m = sB(d, .1, .24, w * .7) * step(.22, sH(i + 9.1)); mavg = .1; spS = .05; }
    else if (sid < 8.5) { float z = q.y + abs(fract(q.x) - .5) * 1.3 + (sN(q * vec2(11., 2.)) - .5) * .16; m = sB(fract(z), .14, .52, w + .05); mavg = .38; spS = .08; }
    else if (sid < 9.5) { vec2 f = abs(fract(q) - .5); float d = abs(f.x + f.y - .5); m = 1. - smoothstep(.05, .05 + w, d); m = max(m, 1. - smoothstep(.1, .1 + w, length(f))); mavg = .3; spS = .5; surfShn = 34.; spC = mix(vec3(1.), c2 * 2.4, .7); surfRim = .4; }
    else if (sid < 10.5) { spS = .9; surfShn = 70.; dk = 1.12; surfRim = .8; }
    else if (sid < 11.5) {
      vec2 pa = vec2(fract(q.x) - .5, fract(q.y) - 1.), qb = q + .5, pb = vec2(fract(qb.x) - .5, fract(qb.y) - 1.);
      float da = length(pa), db = length(pb), r = .68, d = (da < r && (db >= r || pa.y < pb.y)) ? da : db, t = clamp(d / r, 0., 1.);
      dk = mix(.86, mix(.46, 1.1, smoothstep(.1, .86, t)) * (1. - .5 * smoothstep(.93, 1., t)), aa); m = smoothstep(.76, .84, t) * (1. - smoothstep(.93, .98, t)) * .85; mavg = .16;
      spS = .62; surfShn = 42.; spC = mix(vec3(1.), base * 2.2 + .15, .55); surfRim = .3;
    }
    else if (sid < 12.5) { vec2 g = q * vec2(2., 1.); g.x += mod(floor(g.y), 2.) * .5; vec2 f = fract(g); dk = mix(1., mix(.66, 1.12, f.y) * (1. - .4 * smoothstep(.36, .5, abs(f.x - .5))), aa); m = (1. - smoothstep(.07, .11, length(vec2((abs(f.x - .5) - .2) * .5, f.y - .78)))) * .9; mavg = .06; spS = .5; surfShn = 36.; spC = mix(vec3(1.), base * 2.2 + .15, .55); }
    else if (sid < 13.5) { vec2 f = abs(fract(q) - .5); float dl = abs(f.x + f.y - .5); dk = mix(1., (1. - .4 * (1. - smoothstep(0., .09, dl))) * mix(.92, 1.1, smoothstep(0., .3, dl)), aa); m = 1. - smoothstep(.085, .12, min(length(f), length(f - .5))); mavg = .08; spS = .14 + m * .5; surfShn = 20.; }
    else if (sid < 14.5) { vec2 f = abs(fract(qm * 36.) - .5); dk = (.66 + .3 * sN(qm * 60.) * nr + .15 * (1. - nr)) * (1. - .22 * nr * (1. - smoothstep(.02, .12, min(f.x, f.y)))); spS = 1.25; surfShn = 30.; spC = mix(vec3(1.), base * 2.6 + .1, .85); surfRim = .5; }
    else if (sid < 15.5) { dk = .84 + .3 * mix(.5, sN(qm * 30.), mid); spS = .55; surfShn = 36.; spC = vec3(.9, .95, 1.05); surfRim = .25; }
    else if (sid < 16.5) { dk = .84 + .2 * mix(.5, sN(qm * 80.), nr) + .12 * (sN(qm * vec2(12., 34.)) - .5); if (vSb.x > .004) { vec2 f = fract(q) - .5; m = 1. - smoothstep(.13, .19, length(f)); mavg = .07; } spS = .16 + m * .6; surfShn = 16. + m * 30.; }
    else if (sid < 17.5) { float g = sN(vec2(qm.x * 70., qm.y * 6.)), g2 = sN(vec2(qm.x * 22., qm.y * 2.)); dk = .82 + .3 * mix(.5, g, mid); m = smoothstep(.58, .9, fract(g2 * 4. + qm.x * 9.)) * .55 * mid; mavg = .0; spS = .1; surfShn = 14.; }
    else if (sid < 18.5) { float r = length(q), a = atan(q.y, q.x), tw = abs(fract(a * 1.909859) - .5) * 2.; m = max(1. - smoothstep(.32, .34, r), smoothstep(.38, .4, r) * (1. - smoothstep(-.02, .02, r - (.46 + .46 * (1. - tw))))); m = max(m, sB(r, 1.02, 1.1, .01)); spS = .2 + m * .7; surfShn = 40.; spC = mix(vec3(1.), c2 * 2.4, m * .8); }
    else if (sid < 19.5) { vec2 i = floor(q), f = fract(q); float par = mod(i.x + i.y, 2.), s = par < .5 ? f.x : f.y; dk = mix(1., (.66 + .5 * sin(s * 3.1416)) * smoothstep(0., .1, min(min(f.x, f.y), min(1. - f.x, 1. - f.y))), aa); m = par * .35; mavg = .17; spS = .12; }
    else if (sid < 20.5) {
      #if SURF_MAP == 1
        float s = sN(vec2(ang * 30., vSp.y * 5.)) * .6 + sN(vec2(ang * 90., vSp.y * 9.)) * .4;
      #else
        float s = sN(vec2(qm.x * 160., qm.y * 12.));
      #endif
      dk = .74 + .5 * mix(.5, s, mid); spS = .3; surfShn = 22.; spC = base * 2.5 + .25; surfRim = .3;
    }
    else if (sid < 21.5) { dk = 1. + .05 * mid * (sN(qm * 24.) - .5); spS = .15; surfShn = 11.; spC = vec3(1., .86, .7); surfRim = .45; surfSss = .3; }
    else if (sid < 22.5) { vec2 g = q + .5 * vec2(sN(q * .6), sN(q * .6 + 5.)); vec2 i = floor(g), f = fract(g) - .5; f += (vec2(sH(i), sH(i + 3.7)) - .5) * .5; m = (1. - smoothstep(.15, .23, length(f))) * step(.3, sH(i + 1.3)); mavg = .1; dk = .86 + .26 * mix(.5, sN(qm * vec2(90., 22.)), nr); spS = .08; }
    else if (sid < 23.5) { dk = .74 + .5 * mix(.5, sN(qm * 130.), nr); spS = .35; surfShn = 24.; }
    else if (sid < 24.5) { float r = length(q), a = atan(q.y, q.x), pet = pow(abs(cos(a * 4.)), .7); m = max(1. - smoothstep(.16, .18, r), smoothstep(.22, .24, r) * (1. - smoothstep(-.02, .02, r - (.4 + .42 * pet)))); m = max(m, sB(r, .94, 1.02, .012)); spS = .15 + m * .4; surfShn = 30.; }
    else if (sid < 25.5) { float s = sin(q.x * 6.2832 + (sN(q * vec2(1.3, 3.)) - .5) * 7.); m = smoothstep(.3, .55, s) * (0.6 + .4 * sN(q * 2.)); mavg = .3; dk = .9 + .2 * mix(.5, sN(qm * vec2(90., 22.)), nr); spS = .08; }
    else if (sid < 26.5) { float f = fract(q.y); m = sB(f, .08, .22, w) + sB(f, .3, .35, w); mavg = .19; spS = .3; surfShn = 30.; dk = .9 + .2 * mix(.5, sN(vec2(qm.x * 60., qm.y * 8.)), mid); }
    else if (sid < 27.5) { dk = .9 + .22 * mix(.5, sN(vec2(qm.x * 10., qm.y * 120.)), nr); m = (1. - smoothstep(.1, .16, abs(q.x))) * .45; spS = 1.; surfShn = 80.; spC = vec3(.92, .96, 1.05); surfRim = .5; }
    else if (sid < 28.5) { float f = fract(q.y + q.x * .7); dk = mix(1., .7 + .45 * sin(f * 3.1416), aa); spS = .08; }
    else if (sid < 29.5) { dk = .9 + .2 * mix(.5, sN(qm * 22.), mid); spS = .7; surfShn = 46.; spC = mix(vec3(1.), base * 2.2 + .15, .55); surfRim = .35; }
    else if (sid < 30.5) { dk = .8 + .34 * mix(.5, sN(vec2(qm.x * 50., qm.y * 9.)), mid) + .1 * (sN(qm * 6.) - .5); spS = .03; }
    else if (sid < 31.5) { float f = fract(q.y); m = sB(f, .0, .5, w); mavg = .5; spS = .18; surfShn = 20.; }
    else if (sid < 32.5) { float r = length(q), a = atan(q.y, q.x); m = 1. - smoothstep(.2, .24, r * (1. + .3 * cos(a))); dk = .8 + .4 * abs(sin(a * 14.)) * nr; mavg = .1; spS = .4; surfShn = 30.; surfRim = .6; }
    else if (sid < 33.5) { float f = fract(qm.y / .42 + sN(vec2(qm.x * 3., 0.)) * .3); dk = (.7 + .5 * mix(.5, sN(vec2(qm.x * 60., qm.y * 5.)), mid)) * mix(.76, 1.08, f); spS = .02; }   // thatch: strands running down, laid in courses
    else if (sid < 34.5) { dk = .9 + .16 * (sN(qm * 2.6) - .5) + .1 * mid * (sN(qm * 19.) - .5); m = smoothstep(.62, .8, sN(qm * 1.3 + 7.)) * .25; mavg = .05; spS = .03; }                   // lime plaster: mottled, patched
    else if (sid < 35.5) { vec2 g = qm / vec2(cell * 2., cell); g.x += mod(floor(g.y), 2.) * .5; vec2 f = fract(g); float h = sH(floor(g)), e2 = min(min(f.x, 1. - f.x) * 2., min(f.y, 1. - f.y));
      dk = mix(.94, (.84 + .24 * h) * (1. - .34 * (1. - smoothstep(0., .07, e2))), aa) * (.94 + .12 * mid * sN(qm * 14.)); spS = .04; }                                                        // dressed stone or brick, laid in courses
    else if (sid < 36.5) { dk = .88 + .2 * (sN(qm * 2.2) - .5) + .12 * mid * (sN(vec2(qm.x * 26., qm.y * 5.)) - .5); m = smoothstep(.55, .85, sN(qm * 1.1 + 3.)) * .3; mavg = .08; spS = .02; } // mud wall: hand-smoothed, darker where it is damp
    else if (sid < 37.5) { float f = fract(q.y), z = abs(fract(q.x * 2. + floor(q.y) * .5) - .5) * 2.; float cut = sB(f, .04, .1, w) + sB(f, .9, .96, w) + (1. - smoothstep(-.06, .06, abs(f - .5) * 2. - (.25 + .45 * z))) * sB(f, .16, .84, w);
      dk = mix(.92, 1. - .3 * cut, aa) * (.94 + .1 * mid * sN(qm * 16.)); spS = .08; surfShn = 16.; }                                                                                           // a carved band: fillets, and a row of lotus petals between them
    else { dk = .9 + .16 * mid * (sN(qm * 9.) - .5); float f = fract(q.y); m = sB(f, .3, .38, w) + sB(f, .44, .47, w); mavg = .11; spS = .14; surfShn = 18.; }                                  // fired clay, a painted line round the shoulder
    m = mix(mavg, m, aa);
    vec3 col = mix(base, c2, clamp(m, 0., 1.)) * dk;
    if (sid > .5 && sid < 9.5) col = mix(vec3(dot(col, vec3(.299, .587, .114))), col, .87) * vec3(1.02, 1., .95); // (vegetable dyes: a little greyer and warmer than a paint-box colour)
    #if SURF_MAP == 1
      col *= mix(.88, 1.05, smoothstep(0., 1.7, vSp.y)); // (a painter's gradient: a figure is a little deeper toward the ground)
      surfRim = max(surfRim, .24);                         // (and an edge of light on every figure, to lift it off the ground it stands on)
    #endif
    // The woven border: within its width of the cloth's edge.
    float bs = floor(vSc.a * 255. + .5), bw = min(vSb.y * .32, vSb.w * .32 * .36), e = vSb.z * .32; // (a narrow piece, a pleat or a sash, has a narrower border: a third of its half-width)
    #if SURF_MAP == 0
      e = min(e, min(vSp.z - abs(vSp.x), vSp.w - abs(vSp.y))); // (a board's face, a pole's length: from the face's own half-sizes, since its corners alone cannot say)
    #endif
    if (bs > .5 && e < bw + .01) {
      vec3 c3 = sLin(vSc.rgb), GOLD = vec3(.66, .38, .06); float t = e / max(bw, .001), tw = clamp(fwidth(t) * .8, .005, .3), mb = 0.;
      if (bs < 1.5) { mb = 1. - smoothstep(.74 - tw, .74 + tw, t) + sB(t, .86, .96, tw); col = mix(col, c3, mb); }
      else if (bs < 2.5) { mb = sB(t, .1, .4, tw) + sB(t, .62, .76, tw); col = mix(col, c3, mb); }
      else if (bs < 3.5) { mb = 1. - smoothstep(1. - tw, 1. + tw, t); vec2 f = abs(fract(qm / max(bw * .55, .01)) - .5); float d = abs(f.x + f.y - .5);
        float fig = (1. - smoothstep(.07, .13, d)) * sB(t, .2, .82, tw) * nr; vec3 z = c3 * (.9 + .22 * sN(qm * 90.) * nr) * (1. - .45 * fig) * (1. - .3 * (sB(t, .1, .17, tw) + sB(t, .84, .91, tw)));
        col = mix(col, z, mb); spS = mix(spS, .85, mb); surfShn = mix(surfShn, 44., mb); spC = mix(spC, c3 * 2.6 + .1, mb); surfRim = mix(surfRim, .5, mb); }
      else if (bs < 4.5) { float s = fract((qm.x + qm.y) / max(bw * .8, .01)), tri = abs(s - .5) * 2.; mb = 1. - smoothstep(-tw, tw, t - (.42 + .58 * tri)); col = mix(col, c3, mb); }
      else if (bs < 5.5) { mb = 1. - smoothstep(1. - tw, 1. + tw, t); vec2 f = abs(fract(qm / max(bw * .5, .01)) - .5);
        float g = max(sB(t, .04, .16, tw) + sB(t, .84, .96, tw), (1. - smoothstep(.16, .24, f.x + f.y)) * sB(t, .3, .7, tw) * nr);
        col = mix(col, mix(c3, GOLD, g), mb); spS = mix(spS, .2 + .65 * g, mb); spC = mix(spC, mix(vec3(1.), GOLD * 2.6, g), mb); surfShn = mix(surfShn, 40., mb * g); }
      else { mb = 1. - smoothstep(1. - tw, 1. + tw, t); col = mix(col, c3 * (.92 + .16 * sN(qm * 70.)), mb); spS = mix(spS, .95, mb); surfShn = mix(surfShn, 48., mb); spC = mix(spC, c3 * 2.6 + .1, mb); }
    }
    #if SURF_MAP == 1
      if (uFaceCell.z > 0. && vFuv.x > .004 && sid > 20.5 && sid < 21.5) { vec4 ft = texture2D(uFaceTex, uFaceCell.xy + vFuv * uFaceCell.zw); col = mix(col, ft.rgb, ft.a); spS *= 1. - .6 * ft.a; } // (the painted face, on the head's own skin)
    #endif
    diffuseColor.rgb = col; surfSpc = spC * spS;
  }
`;
  const FLIGHT = "\nmaterial.specularColor = surfSpc; material.specularShininess = surfShn; material.specularStrength = 1.;\n";
  // (a soft edge-light on silk, skin and metal; and where the sun's light ends on skin, the warm red of light passing through it)
  const FRIM = "\n{ float sfr = pow(1. - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0., 1.), 3.); reflectedLight.directDiffuse *= 1. + surfRim * sfr * 1.5; reflectedLight.indirectDiffuse *= 1. + surfRim * sfr * .8; }\n" +
    "#if NUM_DIR_LIGHTS > 0\nif (surfSss > 0.) { float sndl = dot(normalize(normal), directionalLights[0].direction); reflectedLight.directDiffuse += diffuseColor.rgb * directionalLights[0].color * vec3(1., .3, .16) * (smoothstep(-.4, .05, sndl) * (1. - smoothstep(.05, .6, sndl)) * surfSss * RECIPROCAL_PI); }\n#endif\n";
  // A material that draws surfaces. o: { map (0 | 1 | 2), side, flat }
  G.surfMat = function (o) {
    o = o || {};
    const m = new T.MeshPhongMaterial({ vertexColors: true, shininess: 20, specular: 0x222222, side: o.side || T.FrontSide, flatShading: !!o.flat });
    if (/[?&]nosurf=1/.test(location.search)) { m.userData.keep = true; return m; } // (plain colours, for comparing and for timing)
    m.defines = { SURF_MAP: o.map || 0 };
    m.onBeforeCompile = (sh) => {
      if (o.map === 1) { sh.uniforms.uFaceTex = G.faceU.tex; sh.uniforms.uFaceCell = G.faceU.cell; }
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\n" + VPARS).replace("#include <begin_vertex>", "#include <begin_vertex>" + VMAIN);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + FPARS).replace("#include <color_fragment>", "#include <color_fragment>" + FMAIN)
        .replace("#include <lights_phong_fragment>", "#include <lights_phong_fragment>" + FLIGHT).replace("#include <lights_fragment_end>", "#include <lights_fragment_end>" + FRIM);
    };
    m.customProgramCacheKey = () => "surf" + (o.map || 0);
    m.userData.keep = true;
    return m;
  };
  const _c = new T.Color();
  const srgb = (hex, out, o) => { _c.set(hex == null ? 0xffffff : hex); const h = _c.getHex(T.SRGBColorSpace); out[o] = (h >> 16) & 255; out[o + 1] = (h >> 8) & 255; out[o + 2] = h & 255; };
  // One vertex's surface, written into the three byte arrays at vertex i.
  //   s: { p: pattern name, c2: hex, cell: metres, b: border name, c3: hex, bw: metres }, edge: metres from the cloth's edge
  G.surfPut = function (A, B, C, i, s, edge, half) {
    const o = i * 4;
    if (!s) { A[o] = A[o + 1] = A[o + 2] = A[o + 3] = B[o] = B[o + 1] = C[o] = C[o + 1] = C[o + 2] = C[o + 3] = 0; B[o + 2] = B[o + 3] = 255; return; }
    srgb(s.c2, A, o); A[o + 3] = ID[s.p] || 0;
    B[o] = Math.max(0, Math.min(255, Math.round(((s.cell || 0) / 0.64) * 255))); B[o + 1] = Math.max(0, Math.min(255, Math.round(((s.bw || 0) / 0.32) * 255)));
    B[o + 2] = Math.max(0, Math.min(255, Math.round(((edge == null ? 1 : edge) / 0.32) * 255))); B[o + 3] = Math.max(1, Math.min(255, Math.round(((half == null ? 1 : half) / 0.32) * 255)));
    srgb(s.c3, C, o); C[o + 3] = BORDER[s.b] || 0;
  };
  G.surfAttrs = function (geo, A, B, C, P) {
    geo.setAttribute("surfA", new T.BufferAttribute(A, 4, true)); geo.setAttribute("surfB", new T.BufferAttribute(B, 4, true)); geo.setAttribute("surfC", new T.BufferAttribute(C, 4, true));
    geo.setAttribute("surfP", P || geo.attributes.position);
    return geo;
  };
})(window.K = window.K || {});
