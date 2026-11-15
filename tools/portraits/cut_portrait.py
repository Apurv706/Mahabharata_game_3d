#!/usr/bin/env python3
"""Portraits cut from the artist's sheets.

The sheets are the true look of every person. Where a painted portrait contradicted its sheet, the
portrait is now cut from the sheet itself: the head and shoulders are lifted off the paper, the sheet's
title is painted out, and the figure is set on a dark, lamp-lit ground and graded warm, so that it sits
beside the painted portraits that remain. (Decided 15 November 2026: docs/Repaint_Brief.md.)

  python3 tools/portraits/cut_portrait.py <sheets> <out> [--install] [--only id,id] [--look]

<sheets>   a folder holding index.json ({"files": {sheet name: path}}) and the sheets themselves
           (3000 by 1688). A path is read from that folder, or from the folder above it. The sheets
           are not in this repo.
<out>      where the 480 by 640 PNGs go (p_<id>.png).
--install  also writes art/p_<id>.webp, the files the game shows.
--look     also writes <out>/look.jpg: every old portrait beside the new one, with the round face the
           game shows.

Needs Pillow, numpy and scipy. JOBS below is the whole list; add a line to give another person a face.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# id -> (sheet, settings). tol: how far from the paper's colour still counts as paper (lower where white cloth lies on the paper).
JOBS = {
    "arjuna": ("arjuna_grown_court", {"erase": [(0, 0, 299, 116)]}),          # the title's second line ends against the wing of his diadem
    "bhima": ("bhima_grown_court", {}),
    "yudhishthira": ("yudhishthira_grown_court", {"gaps": [(240, 577)]}),
    "karna": ("karna_grown_court", {"gaps": [(226, 575)]}),
    "duryodhana": ("duryodhana_grown_court", {"erase": [(0, 0, 760, 56)]}),   # the title's last letter stands on the tip of his crown
    "bhishma": ("bhishma_old_court", {}),
    "drona": ("drona_old_teacher", {}),
    "kripa": ("kripa_old_court", {}),
    "vidura": ("vidura_old_court", {}),
    "ashwatthama": ("ashwatthama_grown_war", {}),
    "dhrishtadyumna": ("dhrishtadyumna_grown_war", {}),
    "satyaki": ("satyaki_grown_war", {}),
    "abhimanyu": ("abhimanyu_youth_war", {}),
    "ghatotkacha": ("ghatotkacha_grown_war", {"gaps": [(568, 655), (190, 640)]}),
    "mauni": ("mauni_old_forest", {}),
    "charu": ("charu_grown_smith", {"redline": (186, 210)}),
    "ugra_adult": ("ugra_grown_home", {"gaps": [(243, 335)], "redline": (186, 210)}),
    "ugra_young": ("ugra_grown_home", {"gaps": [(243, 335)], "redline": (186, 210)}),   # there is no sheet of him young
}
REGION = (170, 0, 930, 1300)     # the front figure down to the hands on every sheet (so the paper between arm and body joins the paper outside)
W, H, AIR = 340, 453, 34         # the cut, in sheet pixels (3 wide to 4 high), and the air left above the crown: head and
                                 # shoulders, so that the face is as large in the game's round frame as on the painted portraits


def cut(sheet_path, tol=10, air=AIR, dx=0, gaps=(), erase=(), redline=None, islands=False, debug=None):
    """Returns the 480 by 640 portrait.
    gaps:    points (x, y) in REGION, each inside a patch of bare paper that an arm or a lock of hair shuts in.
             (Paper and white cloth are too alike to tell apart safely, so such a patch is named by hand.)
    erase:   boxes (x0, y0, x1, y1) in REGION wiped to paper first: lettering that touches the figure.
    redline: rows (y0, y1) in REGION where the sheet's red dashed height line runs into the hair: its red is wiped.
    islands: keep pieces that only the white glow joined to the figure (a jewel hung by a thread). Off: they are dropped."""
    im = Image.open(sheet_path).convert("RGB").crop(REGION)
    a = np.asarray(im).astype(np.int16)
    bg = np.median(a[:40, -40:].reshape(-1, 3), axis=0)                     # the paper, from the top right corner
    for x0, y0, x1, y1 in erase: a[y0:y1, x0:x1] = bg
    mx, mn = a.max(axis=2), a.min(axis=2)
    if redline:
        band = np.zeros(mx.shape, bool); band[redline[0]:redline[1]] = True
        red = band & (a[..., 0] - np.maximum(a[..., 1], a[..., 2]) >= 60)
        a[red | (ndi.binary_dilation(red, iterations=3) & band & (mn > 150))] = bg
        mx, mn = a.max(axis=2), a.min(axis=2)
    # 1. The sheet's lettering and height marks: dark strokes, black or maroon, that touch no colour and have paper all
    #    round them. Paint them out. (Strict on purpose: a looser test took grey strands of hair for letters.)
    colour = (mx - mn >= 55); light = mn > 150
    ink = (mx < 120) & ((mx - mn < 40) | ((mx - mn < 80) & (a[..., 0] > a[..., 1] + 12) & (a[..., 0] > a[..., 2] + 12)))
    dl, dn = ndi.label(ink)
    if dn:
        touch = ndi.maximum(ndi.binary_dilation(colour & (mx >= 120), iterations=2), dl, range(1, dn + 1)).astype(bool)
        HH, WW = ink.shape; text = np.zeros_like(ink)
        for i, sl in enumerate(ndi.find_objects(dl), 1):                    # (a letter has paper all round it; a shadow on dark skin has not)
            if sl is None or touch[i - 1]: continue
            y0, y1, x0, x1 = max(0, sl[0].start - 5), min(HH, sl[0].stop + 5), max(0, sl[1].start - 5), min(WW, sl[1].stop + 5)
            comp = dl[y0:y1, x0:x1] == i; ring = ndi.binary_dilation(comp, iterations=4) & ~comp
            if ring.any() and light[y0:y1, x0:x1][ring].mean() > 0.8: text[y0:y1, x0:x1] |= comp
        a[ndi.binary_dilation(text, iterations=3)] = bg
        mx, mn = a.max(axis=2), a.min(axis=2)
    # 2. The paper: flat cream that reaches the top or a side. What is left is the figure; its largest piece is the person.
    diff = np.abs(a - bg).max(axis=2)
    near = diff <= tol
    lab, n = ndi.label(near)
    edge = set(np.unique(np.concatenate([lab[0, :], lab[:, 0], lab[:, -1]]))) - {0}
    paper = np.isin(lab, list(edge))
    if gaps:                                                               # a named gap: the light patch round the point, as far as the drawn lines that shut it in
        lightish = (mn >= bg.min() - 12) & (mx - mn <= 30); ll, _ = ndi.label(lightish)
        for gx_, gy_ in gaps:
            if not ll[gy_, gx_]: sys.exit("gap (%d, %d) is not on a light patch" % (gx_, gy_))
            patch = ll == ll[gy_, gx_]; win = np.zeros_like(patch); win[max(0, gy_ - 260):gy_ + 260, max(0, gx_ - 160):gx_ + 160] = True
            paper |= patch & win
    if debug is not None:                                                   # every shut-in light patch, for choosing the gaps
        debug["lab"] = lab; debug["paper"] = paper.copy(); debug["rgb"] = a.astype(np.uint8)
    fig = ~paper
    lab2, n2 = ndi.label(fig)
    mask = lab2 == 1 + int(np.argmax(ndi.sum(fig, lab2, range(1, n2 + 1))))
    # 3. The sheets draw a white glow round every figure, a few pixels wide. Peel it: from the rim inward, only what is
    #    as light as the paper, and stop at the first drawn line. Then one pixel more, and tint the new rim from inside.
    #    Black hair is drawn with loose grey strands over that glow: thin, colourless, beside the hair. They go too,
    #    or they would stand out pale against the dark ground.
    white = mn >= bg.min() - 2
    grey = (mn >= 120) & (mx - mn <= 12); strand = grey & ~ndi.binary_opening(grey, structure=np.ones((5, 5), bool))
    strand &= ndi.binary_dilation(ndi.binary_opening(mx < 60, iterations=3), iterations=10)
    for _ in range(8):
        rim = mask & ~ndi.binary_erosion(mask, border_value=1)
        peel = rim & (white | strand)
        if not peel.any(): break
        mask &= ~peel
    lab3, n3 = ndi.label(mask)                                              # what the glow alone held on to the figure
    if n3 > 1:
        sizes = ndi.sum(mask, lab3, range(1, n3 + 1)); main = 1 + int(np.argmax(sizes)); close = ndi.binary_dilation(lab3 == main, iterations=9)
        near_by = [k for k in range(1, n3 + 1) if k != main and sizes[k - 1] >= 40 and close[lab3 == k].any()]
        if debug is not None: debug["islands"] = [(int(sizes[k - 1]),) + tuple(int(v) for v in ndi.center_of_mass(lab3 == k))[::-1] for k in near_by]
        mask = np.isin(lab3, [main] + (near_by if islands else []))
    inner = ndi.binary_erosion(mask, border_value=1)
    idx = ndi.distance_transform_edt(~ndi.binary_erosion(inner, border_value=1), return_distances=False, return_indices=True)
    rgb = a.astype(np.uint8).copy(); rim = inner & ~ndi.binary_erosion(inner, border_value=1)
    rgb[rim] = rgb[idx[0][rim], idx[1][rim]]
    # 4. Lamp light: warmer and deeper.
    f = (rgb.astype(np.float32) / 255.0) ** 1.18 * np.array([0.97, 0.83, 0.64], np.float32)
    # 5. Frame it: air above the crown (more ground is added above where the sheet has none), the head in the middle.
    PAD = 80; f = np.pad(f, ((PAD, 0), (0, 0), (0, 0))); inner = np.pad(inner, ((PAD, 0), (0, 0)))
    hh, ww = inner.shape
    rows = np.flatnonzero(inner[:, ww // 2 - 150: ww // 2 + 150].any(axis=1)); y_top = int(rows[0]) if len(rows) else PAD + 60
    head = inner[y_top: y_top + 230]; x_mid = int(round(np.average(np.arange(ww), weights=head.sum(axis=0)))) if head.any() else ww // 2
    x0 = int(np.clip(x_mid - W // 2 + dx, 0, ww - W)); y0 = int(np.clip(y_top - air, 0, hh - H))
    if debug is not None: debug["box"] = (x0, y0 - PAD, x0 + W, y0 - PAD + H)
    f = f[y0:y0 + H, x0:x0 + W]
    m = Image.fromarray((inner[y0:y0 + H, x0:x0 + W] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    gx = np.linspace(0, 1, W)[None, :, None]; gy = np.linspace(0, 1, H)[:, None, None]
    f *= (1.10 - 0.42 * gx) * (1.0 - 0.30 * np.clip((gy - 0.55) / 0.45, 0, 1))          # lit from the left, falling away toward the foot
    fg = Image.fromarray((np.clip(f, 0, 1) * 255).astype(np.uint8))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); d = np.sqrt(((xx / W - 0.10) / 0.75) ** 2 + ((yy / H - 0.62) / 0.75) ** 2)
    wall = np.array([26, 17, 10], np.float32) + (np.clip(1 - d, 0, 1)[..., None] ** 1.6) * np.array([118, 74, 28], np.float32)
    wall += np.random.default_rng(7).normal(0, 2.2, wall.shape)
    ground = Image.fromarray(np.clip(wall, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    return Image.composite(fg, ground, m).resize((480, 640), Image.LANCZOS)


def face(im, d=128):
    """The round face as the game shows it: the picture's full width, a fifth of the way down."""
    w, h = im.size; top = round((h - w) * 0.2); sq = im.crop((0, top, w, top + w)).resize((d, d), Image.LANCZOS)
    m = Image.new("L", (d * 4, d * 4), 0); ImageDraw.Draw(m).ellipse((0, 0, d * 4 - 1, d * 4 - 1), fill=255); m = m.resize((d, d), Image.LANCZOS)
    out = Image.new("RGB", (d + 12, d + 12), (24, 20, 16)); r = Image.new("L", ((d + 8) * 4, (d + 8) * 4), 0); ImageDraw.Draw(r).ellipse((0, 0, (d + 8) * 4 - 1, (d + 8) * 4 - 1), fill=255); r = r.resize((d + 8, d + 8), Image.LANCZOS)
    out.paste(Image.new("RGB", (d + 8, d + 8), (201, 158, 74)), (2, 2), r); out.paste(sq, (6, 6), m); return out


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]; flags = [x for x in sys.argv[1:] if x.startswith("--")]
    if len(args) < 2: sys.exit(__doc__)
    sheets, out = args[0], args[1]; os.makedirs(out, exist_ok=True)
    only = next((x.split("=", 1)[1].split(",") for x in flags if x.startswith("--only=")), None)
    files = json.load(open(os.path.join(sheets, "index.json"))); files = files.get("files", files)
    done = []
    for pid, (sheet, opt) in JOBS.items():
        if only and pid not in only: continue
        path = next((q for q in (os.path.join(sheets, files[sheet]), os.path.join(os.path.dirname(os.path.abspath(sheets)), files[sheet])) if os.path.exists(q)), None)
        if not path: sys.exit("no sheet for %s: %s" % (pid, files[sheet]))
        new = cut(path, **opt); new.save(os.path.join(out, "p_%s.png" % pid)); done.append(pid)
        if "--install" in flags: new.save(os.path.join(ROOT, "art", "p_%s.webp" % pid), "WEBP", quality=86, method=6)
    if "--look" in flags:
        try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
        except Exception: font = ImageFont.load_default()
        PW, PH, G, M, COLS = 210, 280, 6, 18, 3; CW = PW * 2 + G; RH = 30 + PH + 150
        rows = (len(done) + COLS - 1) // COLS; sheet = Image.new("RGB", (COLS * CW + (COLS + 1) * M, rows * RH + M), (24, 20, 16)); dr = ImageDraw.Draw(sheet)
        for i, pid in enumerate(done):
            x = M + (i % COLS) * (CW + M); y = M + (i // COLS) * RH; new = Image.open(os.path.join(out, "p_%s.png" % pid))
            old_p = os.path.join(out, "old", "p_%s.webp" % pid); old = Image.open(old_p if os.path.exists(old_p) else os.path.join(ROOT, "art", "p_%s.webp" % pid)).convert("RGB").resize((480, 640), Image.LANCZOS)
            dr.text((x, y), pid, fill=(240, 222, 180), font=font)
            sheet.paste(old.resize((PW, PH), Image.LANCZOS), (x, y + 30)); sheet.paste(new.resize((PW, PH), Image.LANCZOS), (x + PW + G, y + 30))
            sheet.paste(face(old), (x + (PW - 140) // 2, y + 30 + PH + 6)); sheet.paste(face(new), (x + PW + G + (PW - 140) // 2, y + 30 + PH + 6))
        sheet.save(os.path.join(out, "look.jpg"), quality=88)
    print("cut", len(done), "portraits" + (" and installed them in art/" if "--install" in flags else ""))


if __name__ == "__main__":
    main()
