# Copies the few MakeHuman/MPFB data files the cast's bodies are made from into tools/blender/mpfb_data (CC0; see the
# LICENSE file there). Only data is taken: the base mesh, the shape targets a man or a woman of any age and build needs,
# and the skin weights of MPFB's default skeleton, folded into the nine parts a body is refitted by (mpfb_body.py).
#   python3 mpfb_vendor.py <mpfb2 checkout>
import sys, os, shutil, json, gzip
SRC = os.path.join(sys.argv[1], "src", "mpfb", "data")
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mpfb_data")
os.makedirs(DST, exist_ok=True)
shutil.copy(os.path.join(sys.argv[1], "LICENSE.ASSETS.md"), os.path.join(DST, "LICENSE.md"))

# the base mesh: only points, faces and groups (no normals or texture coordinates are used)
with open(os.path.join(SRC, "3dobjs", "base.obj")) as f, gzip.open(os.path.join(DST, "base.obj.gz"), "wt") as g:
    for ln in f:
        if ln.startswith(("v ", "g ")): g.write(ln)
        elif ln.startswith("f "): g.write("f " + " ".join(t.split("/")[0] for t in ln.split()[1:]) + "\n")

T = os.path.join(SRC, "targets"); n = 0
PACK = gzip.open(os.path.join(DST, "targets.txt.gz"), "wt")   # every target in one file: "## name" and then its lines
TAKEN = set()
def take(rel):
    global n
    if rel in TAKEN: return
    TAKEN.add(rel)
    PACK.write("## " + rel.replace(".target.gz", "") + "\n")
    with gzip.open(os.path.join(T, rel), "rt") as f:
        for ln in f:
            if ln.strip() and not ln.startswith("#"): PACK.write(ln if ln.endswith("\n") else ln + "\n")
    n += 1
for fn in os.listdir(os.path.join(T, "macrodetails")):
    if fn.endswith(".target.gz") and "baby" not in fn and "old" not in fn: take("macrodetails/" + fn)
for sub in ("height", "proportions"):
    for fn in os.listdir(os.path.join(T, "macrodetails", sub)):
        if "baby" not in fn and "old" not in fn: take(f"macrodetails/{sub}/{fn}")
for rel in ["torso/" + x for x in ("torso-vshape-incr", "torso-vshape-decr", "torso-muscle-pectoral-incr", "torso-muscle-dorsi-incr", "torso-scale-depth-decr", "torso-scale-depth-incr", "measure-waist-circ-decr", "measure-waist-circ-incr", "measure-hips-circ-incr", "measure-hips-circ-decr", "measure-shoulder-dist-incr", "measure-shoulder-dist-decr", "measure-bust-circ-incr")] + \
           ["stomach/stomach-pregnant-decr", "stomach/stomach-pregnant-incr", "stomach/stomach-navel-in", "neck/neck-scale-horiz-incr", "neck/neck-scale-horiz-decr", "neck/neck-scale-depth-incr", "neck/measure-neck-circ-incr", "neck/measure-neck-circ-decr"] + \
           [f"{p}/{s}-{m}-{d}" for s in "lr" for p, m in (("arms", "upperarm-muscle"), ("arms", "lowerarm-muscle"), ("arms", "upperarm-shoulder-muscle"), ("arms", "upperarm-scale-horiz"), ("legs", "upperleg-muscle"), ("legs", "lowerleg-muscle"), ("legs", "upperleg-scale-horiz"), ("eyes", "eye-height2"), ("eyes", "eye-height1"), ("eyes", "eye-scale")) for d in ("incr", "decr")]:
    take(rel + ".target.gz")
for sub in ("chin", "cheek", "nose", "mouth", "eyebrows", "head", "forehead", "eyes"):   # every control of the face's shape, for each person's likeness
    for fn in sorted(os.listdir(os.path.join(T, sub))):
        if fn.endswith(".target.gz") and not os.path.exists(os.path.join(DST, "_none")) and ("##" not in fn):
            take(f"{sub}/{fn}") if f"{sub}/{fn}" not in TAKEN else None
PACK.close()

# the skin weights, folded into the parts a body is refitted by
W = json.load(open(os.path.join(SRC, "rigs", "standard", "weights.default.json")))["weights"]
def seg(bone):
    s = bone[-1] if bone[-2:] in (".L", ".R") else ""
    b = bone[:-2] if s else bone
    if b.startswith(("upperarm",)): return "a" + s
    if b.startswith(("lowerarm",)): return "e" + s
    if b.startswith("finger"): n, k = b[6:].split("-"); return "F" + n + k + s     # each finger's three bones: F<finger><bone><side> (finger 1 the thumb)
    if b.startswith(("wrist", "metacarpal")): return "w" + s
    if b.startswith("upperleg"): return "l" + s
    if b.startswith("lowerleg"): return "k" + s
    if b.startswith(("foot", "toe")): return "f" + s
    if b.startswith("clavicle") or b.startswith("shoulder01"): return "c" + s
    if b.startswith(("neck",)): return "N"
    if b in ("root", "spine05", "spine04") or b.startswith("pelvis"): return "P"
    if b.startswith(("spine", "breast")): return "T"     # (the breast's bone moves with the chest, not the head)
    if b == "jaw": return "J"
    if b.startswith("orbicularis03"): return "E"            # the upper lids: they turn about the eye
    if b.startswith("oris"): return "Hm"                    # the mouth's ring (the lips are found by it)
    return "H"   # the head, the face's other muscles, the eyes, the tongue
out = {}
for bone, lst in W.items():
    sg = seg(bone)
    for i, w in lst:
        d = out.setdefault(str(i), {}); d[sg] = round(d.get(sg, 0) + w, 4)
json.dump(out, gzip.open(os.path.join(DST, "weights.json.gz"), "wt"), separators=(",", ":"))
print("targets", n, "weighted points", len(out))
