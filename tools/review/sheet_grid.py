# Lay close-ups out on a sheet. files come figure by figure, view by view. byColumn=N: each figure is a column of N views (figures across), else a plain grid of `cols`.
import sys, json
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]; cols = int(sys.argv[2]); w = int(sys.argv[3]); meta = json.load(open(sys.argv[4])); nv = int(sys.argv[5]); fs = sys.argv[6:]
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13); big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17)
except Exception: font = big = ImageFont.load_default()
ims = [Image.open(f).convert("RGB") for f in fs]; h = ims[0].height; top = 26 if meta.get("title") else 0
if nv:
    nfig = len(ims) // nv; per = cols; blocks = (nfig + per - 1) // per
    o = Image.new("RGB", (per * w, top + blocks * (nv * h + 4)), (24, 22, 20)); d = ImageDraw.Draw(o)
    for n, im in enumerate(ims):
        fig, v = divmod(n, nv); b, c = divmod(fig, per); x, y = c * w, top + b * (nv * h + 4) + v * h; o.paste(im, (x, y)); t = meta["labels"][n]
        if v == 0: d.rectangle((x, y, x + d.textlength(t, font=font) + 8, y + 18), fill=(24, 22, 20)); d.text((x + 4, y + 2), t, fill=(255, 221, 130), font=font)
else:
    rows = (len(ims) + cols - 1) // cols; o = Image.new("RGB", (cols * w, top + rows * h), (24, 22, 20)); d = ImageDraw.Draw(o)
    for n, im in enumerate(ims):
        x, y = (n % cols) * w, top + (n // cols) * h; o.paste(im, (x, y)); t = meta["labels"][n]
        d.rectangle((x, y, x + d.textlength(t, font=font) + 8, y + 18), fill=(24, 22, 20)); d.text((x + 4, y + 2), t, fill=(255, 221, 130), font=font)
if top: d.text((8, 3), meta["title"], fill=(255, 255, 255), font=big)
o.save(out, quality=90); print(out, o.size)
