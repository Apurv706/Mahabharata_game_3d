# Stack one line-up's views under each other and write each figure's name over its column.
import sys, json
from PIL import Image, ImageDraw, ImageFont
out, meta, files = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3:]
ims = [Image.open(f).convert("RGB") for f in files]
w, h = ims[0].size; top = 26 + (22 if meta.get("title") else 0)
sheet = Image.new("RGB", (w, top + h * len(ims)), (28, 28, 30)); d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15); small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
except Exception: font = small = ImageFont.load_default()
if meta.get("title"): d.text((8, 3), meta["title"], fill=(255, 255, 255), font=font)
for i, lab in enumerate(meta["labels"]): d.text((i * meta["tw"] + 6, top - 21), lab[:30], fill=(255, 221, 130), font=small)
for k, im in enumerate(ims):
    sheet.paste(im, (0, top + k * h)); d.text((6, top + k * h + 4), meta["views"][k], fill=(255, 255, 255), font=small)
sheet.save(out, quality=88); print(out, sheet.size)
