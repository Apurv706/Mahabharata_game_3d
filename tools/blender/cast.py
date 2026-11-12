# The whole cast, built in Blender by script from the artist's reference sheets (docs/brief): one run builds one character
# at one age, with every attire on his sheets as a "look" the game can switch between. Specs are in cast_specs.py.
#   python3 cast.py -- <out dir> export <key>      -> m_<key>.js for the game
#   python3 cast.py -- <out dir> looks  <key>      -> a front render of each look, to set beside the sheet
# Rest pose and units are the game's (js/g3/figure.js): up = Blender Z, front = Blender -Y, his left = Blender +X.
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "."
STAGE = argv[1] if len(argv) > 1 else "export"
HERO = argv[2]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cast_specs import resolve
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
H = resolve(HERO); F = H["face"]; SHE = H["sex"] == "f"
WIDE = H["wide"]; SHX = 0.255 * WIDE * 0.9; HPX = 0.1 * WIDE
FX = SHX / (0.255 * 1.2 * 0.9); GI = H["girth"]; WX = FX * (0.55 + 0.45 * GI) if WIDE < 1.1 else 1.0

def mat(name, col, rough=0.6, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m
def hexc(h): return tuple(((h >> s) & 255) / 255 for s in (16, 8, 0))
def lin(c): return tuple(x ** 2.2 for x in c)
ROLE0 = { "skin": H["skin"], "cloth": 0xf2ecdc, "red": 0xb0402a, "cloth2": 0xf2ecdc, "band": 0xa8452f, "hem": 0xb0402a, "gold": 0xd9a53a, "hair": H["hair"], "white": 0xe8e4d8, "iris": 0x1a120c, "hide": 0xc79a5a,
          "armour": 0x6a6258, "iron": 0x77736c, "leather": 0x5a3a22, "lip": 0x7a3a26 if not SHE else 0x9a3a30, "gem": 0xb0202a, "beads": 0x5a2e1a, "stubble": 0 }
M = { k: mat(k, lin(hexc(v)), 0.35 if k in ("gold", "armour", "iron") else 0.7, 1.0 if k == "gold" else 0.0) for k, v in ROLE0.items() }
M["stubble"] = mat("stubble", tuple(a * 0.62 + b * 0.38 for a, b in zip(lin(hexc(H["skin"])), lin(hexc(H["hair"])))), 0.7)
def metaballs(name, balls, res=0.035, thr=0.6):
    mb = bpy.data.metaballs.new(name); mb.resolution = res; mb.render_resolution = res; mb.threshold = thr
    ob = bpy.data.objects.new(name, mb); S.collection.objects.link(ob)
    for b in balls:
        (x, y, z), (sx, sy, sz) = b[0], b[1]; e = mb.elements.new(type="ELLIPSOID"); e.co = (x, y, z); e.radius = 1.0
        e.stiffness = b[2] if len(b) > 2 else 2.0
        k = 0.93 / math.sqrt(1 - (thr / e.stiffness) ** (1 / 3))   # (so a ball alone shows at about the size written; where balls meet they swell and join)
        e.size_x, e.size_y, e.size_z = sx * k, sy * k, sz * k
        if len(b) > 3 and b[3]: e.rotation = b[3]
        if len(b) > 4 and b[4]: e.use_negative = True
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.context.view_layer.update()
    bpy.ops.object.convert(target="MESH"); o = bpy.context.object; o.name = name; o.select_set(False); return o
def sym(balls):
    out = []
    for b in balls:
        out.append(b)
        if abs(b[0][0]) > 1e-4:
            m = [(-b[0][0], b[0][1], b[0][2]), b[1]] + list(b[2:3])
            if len(b) > 3:
                q = b[3]; m.append((q[0], q[1], -q[2], -q[3]) if q else None)
            if len(b) > 4: m.append(b[4])
            out.append(tuple(m))
    return out
from mathutils import Euler
def rot(rx, ry, rz): return tuple(Euler((rx, ry, rz)).to_quaternion())

# ---- The body: a wrestler's build. Heavy chest and shoulders, thick arms and thighs, a solid waist.
AX = SHX + 0.03   # the arm's own line: it hangs a little out from the joint, pushed there by the lats
# Anatomy, after a heavyweight's: wide shoulders over a narrow waist (the lats make the V), pectorals that tie in under the
# deltoids, a trapezius sloping from a thick neck, the belly's wall in rows, thighs with their outer sweep and the
# teardrop over the knee, calves in two heads. z is height: collar 1.44, nipples 1.30, ribs' end 1.14, navel 1.05, crotch 0.86.
torso = sym([
  ((0, 0.005, 1.33), (0.182, 0.128, 0.13)),                 # ribcage, upper
  ((0, -0.005, 1.2), (0.165, 0.12, 0.1)),                   # ribcage, lower
  ((0, -0.012, 1.09), (0.152, 0.118, 0.1)),                 # waist: thick, a wrestler's
  ((0, -0.022, 1.0), (0.158, 0.122, 0.085)),                # lower belly, full
  ((0, 0.01, 0.93), (0.17, 0.125, 0.095)),                  # pelvis
  ((0.125, 0.015, 0.94), (0.055, 0.08, 0.07), 1.5),         # hips: the muscle over the hip bone
  ((0.095, -0.1, 1.31), (0.108, 0.082, 0.082), 1.5),       # pectorals: broad, deep, squared below
  ((0.085, -0.082, 1.375), (0.085, 0.05, 0.04), 1.5),       # their upper part, under the collar bone
  ((0.185, -0.06, 1.345), (0.06, 0.05, 0.055), 1.5),        # and the tie-in under the deltoid
  ((0, -0.155, 1.32), (0.011, 0.03, 0.095), 1.4, None, True),     # the groove between them
  ((0.095, -0.158, 1.228), (0.085, 0.022, 0.011), 1.4, None, True), # the line under each
  ((0, 0.075, 1.36), (0.185, 0.075, 0.11), 1.6),            # upper back
  ((0.105, 0.09, 1.31), (0.07, 0.045, 0.1), 1.4),           # the muscle over the blades
  ((0.175, 0.04, 1.285), (0.07, 0.085, 0.115), 1.5),        # latissimus: the flare under the arm
  ((0.14, 0.035, 1.17), (0.055, 0.075, 0.09), 1.5),         # and its taper to the waist
  ((0.045, 0.1, 1.1), (0.034, 0.03, 0.15), 1.5),            # the columns either side of the spine
  ((0, 0.15, 1.2), (0.011, 0.022, 0.24), 1.4, None, True),  # the spine's furrow
  ((0.112, -0.045, 1.07), (0.034, 0.058, 0.06), 1.5),       # obliques
  ((0.09, 0.085, 0.9), (0.098, 0.085, 0.095), 1.5),         # glutes
  ((0.07, 0.035, 1.475), (0.08, 0.058, 0.055), 1.6, rot(0, 0.55, 0)),   # trapezius: from the neck
  ((0.135, 0.035, 1.42), (0.07, 0.055, 0.028), 1.6),        # down to the shoulder's point
  ((0, 0.012, 1.53), (0.068, 0.072, 0.09)),                 # neck: a bull's
  ((0.034, -0.035, 1.505), (0.017, 0.02, 0.07), 1.5, rot(0.25, 0.2, 0)),   # its cords
  ((0.075, -0.088, 1.428), (0.06, 0.011, 0.009), 1.7),      # collar bones
  ((SHX, 0.0, 1.372), (0.068, 0.072, 0.068)),               # deltoid: the core over the joint
  ((SHX - 0.012, -0.048, 1.365), (0.052, 0.05, 0.066), 1.5),# front head
  ((SHX + 0.04, 0.0, 1.355), (0.048, 0.062, 0.075), 1.5),   # side head: the width of him
  ((SHX - 0.005, 0.052, 1.365), (0.05, 0.048, 0.064), 1.5), # rear head
  ((HPX + 0.02, 0.0, 0.72), (0.098, 0.108, 0.2)),           # thigh
  ((HPX + 0.068, -0.03, 0.7), (0.048, 0.06, 0.155), 1.5),   # the outer sweep
  ((HPX + 0.02, -0.078, 0.72), (0.05, 0.04, 0.165), 1.5),   # the long muscle down the front
  ((HPX - 0.022, -0.055, 0.585), (0.042, 0.04, 0.065), 1.5),# the teardrop over the knee
  ((HPX - 0.048, 0.0, 0.77), (0.05, 0.07, 0.115), 1.5),     # inner thigh
  ((HPX + 0.02, 0.078, 0.68), (0.07, 0.05, 0.16), 1.5),     # hamstrings
  ((HPX + 0.008, -0.01, 0.47), (0.056, 0.062, 0.062)),      # knee
  ((HPX + 0.008, -0.052, 0.47), (0.03, 0.024, 0.034), 1.6), # kneecap
  ((HPX + 0.008, -0.005, 0.3), (0.046, 0.05, 0.15)),        # shin
  ((HPX - 0.02, 0.05, 0.345), (0.04, 0.048, 0.1), 1.5),     # calf: inner head, the lower and fuller
  ((HPX + 0.036, 0.05, 0.36), (0.037, 0.045, 0.088), 1.5),  # calf: outer head
  ((HPX + 0.008, 0.005, 0.13), (0.038, 0.044, 0.1)),        # shin to ankle
  ((HPX + 0.04, 0.005, 0.07), (0.015, 0.017, 0.019), 1.7), ((HPX - 0.022, 0.0, 0.078), (0.015, 0.017, 0.019), 1.7),   # ankle bones
  ((HPX + 0.01, -0.045, 0.035), (0.05, 0.105, 0.034)),      # foot
  ((HPX + 0.01, -0.125, 0.026), (0.05, 0.045, 0.024)),      # toes
  ((HPX + 0.008, 0.035, 0.045), (0.038, 0.045, 0.04)),      # heel
])
arms = sym([
  ((SHX + 0.012, 0.0, 1.345), (0.06, 0.064, 0.07)),         # the arm's head, inside the deltoid
  ((AX, 0.0, 1.25), (0.07, 0.074, 0.13)),                   # upper arm: heavy
  ((AX - 0.006, -0.05, 1.25), (0.054, 0.046, 0.085), 1.5),  # biceps
  ((AX + 0.022, 0.04, 1.275), (0.04, 0.04, 0.078), 1.5),    # triceps: outer head
  ((AX - 0.016, 0.05, 1.245), (0.04, 0.04, 0.098), 1.5),    # triceps: long head
  ((AX, 0.006, 1.125), (0.042, 0.046, 0.045)),              # elbow
  ((AX + 0.004, 0.045, 1.125), (0.02, 0.02, 0.022), 1.7),   # its point
  ((AX + 0.016, -0.012, 1.055), (0.05, 0.05, 0.08), 1.5),   # forearm: the mass on the thumb side
  ((AX - 0.012, 0.0, 1.04), (0.046, 0.05, 0.09), 1.5),      # and on the other
  ((AX, 0.0, 0.94), (0.046, 0.05, 0.09)),                   # forearm, tapering
  ((AX, 0.0, 0.86), (0.032, 0.038, 0.045)),                 # wrist
])
def hand(sx):
    px = sx * (AX + 0.016)                                   # the palm stands a little out, so what is held lies against it
    balls = [((px, -0.004, 0.778), (0.016, 0.042, 0.046)),                              # palm
             ((px - sx * 0.002, -0.004, 0.815), (0.02, 0.034, 0.03)),                   # heel of the hand, into the wrist
             ((px - sx * 0.018, -0.046, 0.795), (0.012, 0.014, 0.026), 1.8, rot(0.5, 0, 0)),   # thumb, base
             ((px - sx * 0.03, -0.058, 0.775), (0.0105, 0.012, 0.02), 1.8, rot(0.2, sx * 0.5, 0))]  # thumb, end, closing over
    for i, fy in enumerate((-0.034, -0.012, 0.01, 0.031)):       # four fingers, loosely closed round a haft
        k = (0.95, 1.0, 0.95, 0.82)[i]
        balls.append(((px - sx * 0.002, fy, 0.728), (0.0105, 0.0108, 0.026 * k), 1.8))                          # first joint, down from the knuckle
        balls.append(((px - sx * 0.017, fy, 0.7 + (1 - k) * 0.02), (0.0098, 0.0102, 0.02 * k), 1.8, rot(0, -sx * 0.9, 0)))   # second, turning in
        balls.append(((px - sx * 0.032, fy, 0.712 + (1 - k) * 0.02), (0.009, 0.0095, 0.016 * k), 1.8, rot(0, -sx * 1.9, 0)))  # the tip, coming back up
    return balls
def lean(balls, k=0.86):   # a youth's build: the same frame with less on it; nothing is moved, and none of the cut lines
    return [((b[0]), (b[1][0] * k, b[1][1] * k, b[1][2])) + tuple(b[2:]) for b in balls if not (len(b) > 4 and b[4])]
def mk_body(name, t, a):
    Bt = metaballs(name + "t", t, 0.0125, 0.62); Ba = metaballs(name + "a", a, 0.0115, 0.62)
    bpy.ops.object.select_all(action="DESELECT"); Bt.select_set(True); Ba.select_set(True); bpy.context.view_layer.objects.active = Bt; bpy.ops.object.join(); o = bpy.context.object; o.name = name; o.select_set(False); return o
def frame(balls):   # Bhima's own lists, refitted to this hero's frame and build
    out = []
    for b in balls:
        (x, y, z), (sx, sy, sz) = b[0], b[1]; ax = abs(x); sg = 1 if x >= 0 else -1
        if z < 0.88 and ax > 0.03: k = H["leg"]; nb = ((x, y, z), (sx * k, sy * k, sz))                                 # legs: placed by the hip joint already
        elif ax >= SHX - 0.02: k = H["arm"]; nb = ((x, y, z), (sx * k, sy * k, sz))                                      # shoulders: placed by the shoulder joint
        else:
            SH = H["shape"]; st = b[2] if len(b) > 2 else 2.0
            m = SH["waist"] if (0.95 < z < 1.16 and ax < 0.01) else SH["chest"] if (y < -0.055 and 1.25 < z < 1.4 and st == 1.5) else SH["neck"] if (ax < 0.05 and z > 1.49) else SH["trap"] if (z > 1.41 and y > 0.02 and ax > 0.05) else SH["lat"] if (y > 0.02 and 1.15 < z < 1.3 and ax > 0.12) else 1.0
            w = GI * m; nb = ((x * FX, y * (0.5 + 0.5 * w), z), (sx * FX * w, sy * w, sz))
        out.append(nb + tuple(b[2:]))
    return out
ABS = sym([((0.036, -0.1, 1.2), (0.03, 0.014, 0.024), 1.7), ((0.036, -0.103, 1.14), (0.03, 0.014, 0.024), 1.7), ((0.035, -0.103, 1.08), (0.029, 0.014, 0.025), 1.7), ((0, -0.14, 1.13), (0.005, 0.02, 0.12), 1.4, None, True)])
MU = H.get("mu", 1.0)
def soften(b):   # less muscle on the same frame: what lies over the bone shrinks toward it, and the cut lines go
    if MU >= 0.99: return b
    if len(b) > 4 and b[4]: return b if MU >= 0.7 else None
    st = b[2] if len(b) > 2 else 2.0
    if st < 1.45 or st > 1.65: return b
    (x, y, z), (sx, sy, sz) = b[0], b[1]; k = 0.5 + 0.5 * MU
    return ((x, y * (0.6 + 0.4 * MU) if (abs(y) > 0.03 and 1.0 < z < 1.45) else y, z), (sx * k, sy * k, sz * (0.75 + 0.25 * MU))) + tuple(b[2:])
torso = [b for b in map(soften, torso) if b]; arms = [b for b in map(soften, arms) if b]
if SHE:   # a woman's frame: breasts (not a girl), fuller hips and seat
    if not H.get("flat"): torso += sym([((0.07, -0.088, 1.285), (0.06, 0.055, 0.056), 1.7)])
    torso += sym([((0.125, 0.02, 0.93), (0.075, 0.095, 0.09), 1.7), ((0.08, 0.085, 0.9), (0.085, 0.08, 0.09), 1.7)])
if H.get("belly"): torso += [((0, -0.07, 1.06), (0.13 * H["belly"], 0.1 * H["belly"], 0.11), 1.7)]
B = mk_body("body", frame(torso + (ABS if (H["abs"] and MU >= 0.7) else [])), [(b[0], (b[1][0] * H["arm"], b[1][1] * H["arm"], b[1][2])) + tuple(b[2:]) for b in arms])
HANDS = [metaballs("handL", hand(1), 0.0055, 0.62), metaballs("handR", hand(-1), 0.0055, 0.62)]
# ---- The head: broad, heavy-jawed. Built at the head joint (z 1.47) with the skull's centre about 0.16 above it.
HZ = 1.47 + 0.19
JW, CH, LG, CK, NS, BR = F["jaw"], F["chin"], F["long"], F["cheek"], F["nose"], F["brow"]
head = sym([
  ((0, 0.015, HZ + 0.03), (0.098 * F['hw'], 0.115, 0.108)),                    # cranium
  ((0, -0.03, HZ - 0.04), (0.088 * (0.5 + 0.5 * JW) * F['hw'], 0.092, 0.09 + LG)),   # face
  ((0, -0.04, HZ - 0.1 - LG), (0.074 * JW, 0.07, 0.05)),                       # jaw
  ((0, -0.088, HZ - 0.128 - LG * 1.6), (0.036 * JW, 0.03, 0.026 * CH), 1.6),   # chin
  ((0.06 * JW, -0.02, HZ - 0.088 - LG), (0.034 * JW, 0.045, 0.04), 1.5),       # the jaw's corners
  ((0.052, -0.082, HZ - 0.035), (0.03 * CK, 0.024 * CK, 0.024), 1.5),          # cheekbones
  ((0, -0.112, HZ - 0.025 - (F['nosel'] - 1) * 0.02), (0.016, 0.026 * NS, 0.045 * F['nosel']), 1.8),   # nose, bridge
  ((0, -0.134 * (0.9 + 0.1 * NS), HZ - 0.052 - (F['nosel'] - 1) * 0.05), (0.022 * NS, 0.024 * NS, 0.018), 1.8),   # nose, tip
  ((0.02 * NS, -0.12, HZ - 0.058 - (F['nosel'] - 1) * 0.05), (0.013, 0.015, 0.011), 1.8),   # nostrils
  ((0.038, -0.104 + (1 - BR) * 0.006, HZ + 0.024), (0.036, 0.018 * (0.6 + 0.4 * BR), 0.013), 1.7),   # brow ridge
  ((0, -0.095, HZ + 0.062), (0.066, 0.028, 0.036), 1.5),                       # forehead
  ((0.098, 0.005, HZ - 0.02), (0.012, 0.022, 0.034), 1.8),                     # ears
  ((0.037 * F['gap'], -0.118, HZ - 0.002), (0.022 * F['eye'], 0.02, 0.012 * F['eye']), 1.6, None, True),   # eye sockets (cut in)
  ((0, -0.128, HZ - 0.092 - LG), (0.03, 0.014, 0.005), 1.6, None, True),       # the mouth's line (cut in)
])
Hd = metaballs("head", head, 0.0085, 0.62)
for o in [B, Hd] + HANDS:
    o.data.materials.append(M["skin"])
    m = o.modifiers.new("sm", "SMOOTH"); m.iterations = 2; m.factor = 0.5
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="sm")
    for p in o.data.polygons: p.use_smooth = True
print("body verts", len(B.data.vertices), "head verts", len(Hd.data.vertices))

# ---- The skeleton: the game's own joints, by the game's own names, where the game has them -----------------------
JOINTS = ["P", "T", "H", "aL", "eL", "wL", "aR", "eR", "wR", "lL", "kL", "lR", "kR"]
LOD = H.get("lod", 1.0)
for o, r in ((B, 0.24 * LOD), (Hd, 0.42 * LOD), (HANDS[0], 0.28 * LOD), (HANDS[1], 0.28 * LOD)):
    d = o.modifiers.new("dec", "DECIMATE"); d.ratio = r; bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="dec")
    for p in o.data.polygons: p.use_smooth = True
arm = bpy.data.armatures.new("rig"); A = bpy.data.objects.new("rig", arm); S.collection.objects.link(A); bpy.context.view_layer.objects.active = A; bpy.ops.object.mode_set(mode="EDIT")
def bone(n, h, t, parent=None):
    b = arm.edit_bones.new(n); b.head = h; b.tail = t
    if parent: b.parent = arm.edit_bones[parent]
bone("P", (0, 0, 0.93), (0, 0, 0.80)); bone("T", (0, 0, 0.98), (0, 0, 1.42), "P"); bone("H", (0, 0, 1.47), (0, 0, 1.78), "T")
for sd, sx in (("L", 1), ("R", -1)):
    ax = sx * (SHX + 0.008)
    bone("a" + sd, (sx * SHX, 0, 1.41), (ax, 0, 1.12), "T"); bone("e" + sd, (ax, 0, 1.12), (ax, 0, 0.82), "a" + sd); bone("w" + sd, (ax, 0, 0.82), (ax, -0.01, 0.69), "e" + sd)
    bone("l" + sd, (sx * (HPX + 0.008), 0, 0.92), (sx * (HPX + 0.006), 0, 0.47), "P"); bone("k" + sd, (sx * (HPX + 0.006), 0, 0.47), (sx * (HPX + 0.006), 0, 0.04), "l" + sd)
bpy.ops.object.mode_set(mode="OBJECT")
for o in (B,):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); A.select_set(True); bpy.context.view_layer.objects.active = A
    try: bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    except Exception as e: print("AUTO WEIGHTS FAILED", e)
    o.select_set(False); A.select_set(False)
    lost = [v for v in o.data.vertices if not v.groups]
    if lost:   # (what the automatic weights missed goes to the bone it lies nearest)
        segs = [(b.name, A.matrix_world @ b.head_local, A.matrix_world @ b.tail_local) for b in arm.bones]
        def near(p):
            best = None
            for n, h, t in segs:
                d = t - h; k = max(0, min(1, (p - h).dot(d) / d.dot(d))); dist = (p - (h + d * k)).length
                if best is None or dist < best[0]: best = (dist, n)
            return best[1]
        for v in lost: (o.vertex_groups.get(near(v.co)) or o.vertex_groups.new(name=near(v.co))).add([v.index], 1.0, "REPLACE")
    print(o.name, "unweighted", len(lost), "verts", len(o.data.vertices))
def rigid(o, bone_name):
    g = o.vertex_groups.new(name=bone_name); g.add(range(len(o.data.vertices)), 1.0, "REPLACE")
rigid(Hd, "H"); rigid(HANDS[0], "wL"); rigid(HANDS[1], "wR")

# ---- What he wears and carries on him ---------------------------------------------------------------------------
def prim(kind, name, m, loc=(0, 0, 0), scale=(1, 1, 1), rotv=(0, 0, 0), **kw):
    getattr(bpy.ops.mesh, "primitive_" + kind + "_add")(location=loc, rotation=rotv, **kw); o = bpy.context.object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); o.data.materials.append(M[m])
    for p in o.data.polygons: p.use_smooth = True
    o.select_set(False); return o
parts = []
def both(fn):
    for sx in (1, -1): parts.append(fn(sx))
# Eyes, lips
both(lambda sx: prim("uv_sphere", "eye", "white", (sx * 0.037 * F["gap"], -0.103, HZ - 0.002), (0.0165 * F["eye"], 0.012, 0.0105 * F["eye"]), segments=14, ring_count=8))
both(lambda sx: prim("uv_sphere", "iris", "iris", (sx * 0.037 * F["gap"], -0.1135, HZ - 0.002), (0.0075 * F["eye"], 0.004, 0.0078 * F["eye"]), segments=10, ring_count=6))
both(lambda sx: prim("uv_sphere", "lid", "skin", (sx * 0.037 * F["gap"], -0.1045, HZ + 0.0065 * F["eye"] + (1 - BR) * 0.0028), (0.0185 * F["eye"], 0.0125, 0.0085 * F["eye"]), (0.25, 0, 0), segments=12, ring_count=6))
both(lambda sx: prim("uv_sphere", "browhair", "hair", (sx * 0.04, -0.121 + (1 - BR) * 0.004, HZ + 0.024 + (1 - BR) * 0.004), (0.027, 0.008, (0.0055 + 0.0015 * BR) * F["browth"]), (0, -sx * 0.22 * BR, 0), segments=10, ring_count=6))
parts.append(prim("uv_sphere", "lip", "lip", (0, -0.126, HZ - 0.098 - LG), (0.028 * (0.6 + 0.4 * JW) * F["lipw"], 0.012, 0.0085), segments=12, ring_count=6))
# The moustache of a wrestler: thick over the lip, swept out and up at the ends
if True:
    both(lambda sx: prim("uv_sphere", "stache", "hair", (sx * 0.03, -0.128, HZ - 0.078), (0.036, 0.017, 0.015), (0, sx * 0.2, sx * 0.2), segments=12, ring_count=6))
    both(lambda sx: prim("uv_sphere", "stache2", "hair", (sx * 0.072, -0.108, HZ - 0.062), (0.026, 0.012, 0.012), (0, -sx * 0.8, sx * 0.6), segments=10, ring_count=6))
    both(lambda sx: prim("uv_sphere", "stache2", "hair", (sx * 0.09, -0.094, HZ - 0.04), (0.012, 0.009, 0.014), segments=8, ring_count=6))
# Hair: a cap over the skull, cut away from the face; a knot on the crown; the rest falling to the shoulders behind
bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0.018, HZ + 0.032), segments=28, ring_count=18); hc = bpy.context.object; hc.name = "haircap"; hc.scale = (0.104, 0.121, 0.114); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(hc.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if (v.co.y < -0.035 and v.co.z < HZ + 0.075) or (v.co.z < HZ - 0.06 and v.co.y < 0.06) or v.co.z < HZ - 0.1], context="VERTS"); bm.to_mesh(hc.data); bm.free()
so = hc.modifiers.new("so", "SOLIDIFY"); so.thickness = 0.008; bpy.context.view_layer.objects.active = hc; bpy.ops.object.modifier_apply(modifier="so"); hc.data.materials.append(M["hair"])
for p in hc.data.polygons: p.use_smooth = True
hc.select_set(False); parts.append(hc)
parts.append(prim("uv_sphere", "knot", "hair", (0, 0.03, HZ + 0.155), (0.05, 0.052, 0.042), segments=14, ring_count=8))
parts.append(prim("torus", "knotband", "gold", (0, 0.03, HZ + 0.128), (1, 1, 1), major_radius=0.04, minor_radius=0.008, major_segments=16, minor_segments=6))
parts.append(prim("uv_sphere", "backhair", "hair", (0, 0.085, HZ - 0.1), (0.085, 0.045, 0.1), segments=14, ring_count=8))
for k, (x, y) in enumerate(((-0.105, 0.03), (-0.092, 0.07), (-0.06, 0.1), (-0.02, 0.112), (0.02, 0.112), (0.06, 0.1), (0.092, 0.07), (0.105, 0.03))):   # locks, each a wave of three
    for j in range(H["locks"]):
        w = math.sin(j * 1.9 + k) * 0.012; parts.append(prim("uv_sphere", "locks", "hair", (x * (1 + j * 0.07) + w, y + j * 0.008, HZ - 0.06 - j * 0.058), (0.026, 0.026, 0.04), segments=8, ring_count=6))
def sm(a, b, x): k = max(0.0, min(1.0, (x - a) / (b - a))); return k * k * (3 - 2 * k)
def clothw(o, top="P", side=None):   # the wrap's own holding: the hips above (or the trunk), each thigh and then each shin below, shared across the middle
    G_ = {n: o.vertex_groups.new(name=n) for n in ("P", "T", "lL", "lR", "kL", "kR")}
    for v in o.data.vertices:
        x, z = v.co.x, v.co.z; wl = sm(-0.09, 0.09, x) if side is None else side; hp = sm(0.74, 0.93, z); kn = sm(0.5, 0.36, z); tt = sm(1.0, 1.12, z) if top == "T" else 0.0
        w = {"T": tt, "P": hp * (1 - tt), "lL": (1 - hp) * (1 - kn) * wl, "lR": (1 - hp) * (1 - kn) * (1 - wl), "kL": (1 - hp) * kn * wl, "kR": (1 - hp) * kn * (1 - wl)}
        for n, val in w.items():
            if val > 0.02: G_[n].add([v.index], val, "REPLACE")
def fall(name, role, x, y, z_top, ln, wd, lean_=0.0, top="P", edge=True, side=0.5, border=False, brole="red", gather=0.82, deep=1.0):   # a hanging length of cloth, a little waved, with a gold edge at its foot
    me = bpy.data.meshes.new(name); rows = 10; vs = []; fs = []; C_ = 3 if wd < 0.02 else 8; fwd = 1 if y < 0 else -1
    for r in range(rows + 1):
        t = r / rows
        for c in range(C_):
            u = c / (C_ - 1) - 0.5; fold = (1 if c % 2 else -1) * (0.0015 + 0.009 * t) * deep * (0 if C_ == 3 else 1)       # gathered above, opening into pleats below
            z = z_top - ln * t - (0.012 * (c % 2) * t if C_ > 3 else 0)                                               # and the foot of each pleat a little lower than the next
            vs.append((x + u * wd * 2 * (gather + (1 - gather) * t ** 0.7) + lean_ * ln * t, y - fwd * (fold + 0.012 * math.sin(t * 3.0)), z))
    for r in range(rows):
        for c in range(C_ - 1): a = r * C_ + c; fs.append((a, a + 1, a + C_ + 1, a + C_))
    me.from_pydata(vs, [], fs); me.update(); o = bpy.data.objects.new(name, me); S.collection.objects.link(o); o.data.materials.append(M[role])
    for p in o.data.polygons: p.use_smooth = True
    clothw(o, top, side); parts.append(o)
    if edge:
        e = prim("cube", name + "edge", "gold", (x + lean_ * ln, y - (0.003 if y < 0 else -0.003), z_top - ln + 0.012), (wd * 1.02, 0.004, 0.012), size=2); clothw(e, top, side); parts.append(e)
    if border:   # the cloth's own woven border, down both edges and across the foot
        for sx_ in (-1, 1): fall(name + "b", brole, x + sx_ * wd * 0.86 * (1 - 0.06), y - (0.004 if y < 0 else -0.004), z_top, ln, 0.007, lean_, top, False, side)
        e = prim("cube", name + "b", brole, (x + lean_ * ln, y - (0.005 if y < 0 else -0.005), z_top - ln + 0.016), (wd * 0.86, 0.003, 0.008), size=2); clothw(e, top, side); parts.append(e)
    return o
def shell(name, role, keep, off, src=None, cut=None):   # a garment taken from the body's own surface and stood off it; it keeps the body's weights. cut: (low, high) edges, cut clean
    src = src or B; o = src.copy(); o.data = src.data.copy(); S.collection.objects.link(o); o.name = name
    bm = bmesh.new(); bm.from_mesh(o.data)
    if cut:
        for z_, up in ((cut[0], -1), (cut[1], 1)):
            if z_ is not None: bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z_), plane_no=(0, 0, up), clear_outer=True)
    dl = bm.verts.layers.deform.active; ai = {i for i, g in enumerate(src.vertex_groups) if g.name[0] in "aew"}
    armw = lambda v: sum(w for i, w in v[dl].items() if i in ai)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co) or armw(v) > 0.3], context="VERTS")
    for v in bm.verts: v.co += v.normal * off
    bm.to_mesh(o.data); bm.free(); o.data.materials.clear(); o.data.materials.append(M[role]); parts.append(o); return o
trunk = lambda c: not (c.z > 1.4 and abs(c.x) < 0.085)
def band(c, w):   # a strip from the left shoulder down to the right hip, front and back
    ux, uz = -0.3, -0.44; l = math.hypot(ux, uz); d = abs((c.x - 0.14) * uz - (c.z - 1.44) * ux) / l; return d < w and 0.99 < c.z < 1.47 and trunk(c)
def sm(a, b, x): k = max(0.0, min(1.0, (x - a) / (b - a))); return k * k * (3 - 2 * k)

def tag(objs, part):
    for o in (objs if isinstance(objs, (list, tuple)) else [objs]): o["part"] = part
def since(n0, part): tag(parts[n0:], part)
# ---- Lower cloth: wound round the hips and drawn between the legs, so it folds round each leg; three lengths.
def dhoti(name, zlow, flare=1.0, role="cloth", plain=False):   # (plain: a skirt of armour over the cloth: no hem band, no pleats)
    n0 = len(parts); o = shell(name, role, lambda c: zlow - 0.001 < c.z < 1.001, 0.012, cut=(zlow, 1.0)); LEG = 0.8 + 0.2 * H["leg"]; hemv = []
    for v in o.data.vertices:
        v.co.z = max(v.co.z, zlow)                                                                 # a straight hem: what hung below the line is gathered up to it
        x, y, z = v.co; sd = 1 if x > 0 else -1; cx = sd * HPX; a = math.atan2(y, x - cx); r0 = math.hypot(x - cx, y)
        t = sm(0.95, zlow, z); inner = max(0.0, -sd * math.cos(a)); below = sm(0.92, 0.78, z)     # t: 0 at the hips, 1 at the hem; inner: 1 facing the other leg
        R = (0.13 - 0.014 * t) * LEG * flare * (1.0 + 0.12 * abs(math.sin(a)))                    # it hangs from the hip, nearly straight: it does not follow the knee and calf
        R = R * (1 - inner) + min(R, HPX * 0.97) * inner                                          # between the legs the cloth is one: never past the middle
        r = r0 * (1 - below) + max(r0 + 0.006, R) * below
        r += ((0.004 + 0.009 * t) * math.sin(a * 6 * sd + z * 22) + 0.004 * t * math.sin(a * 13 - z * 35)) * below * (1 - 0.7 * inner)
        if z < zlow + 0.045: hemv.append(v.index)
        v.co.x = cx + math.cos(a) * r; v.co.y = math.sin(a) * r
        v.co.z += inner * 0.09 * sm(zlow + 0.24, zlow, z) * below                                 # the hem rises between the legs, where the cloth is drawn through
    if plain: since(n0, name); return
    hb = o.copy(); hb.data = o.data.copy(); S.collection.objects.link(hb); hb.name = name + "hem"; bm = bmesh.new(); bm.from_mesh(hb.data); bm.verts.ensure_lookup_table(); keep = set(hemv)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in keep], context="VERTS")
    for v in bm.verts:
        sd = 1 if v.co.x > 0 else -1; cx = sd * HPX; rr = math.hypot(v.co.x - cx, v.co.y) or 1; k = (rr + 0.003) / rr; v.co.x = cx + (v.co.x - cx) * k; v.co.y *= k
    bm.to_mesh(hb.data); bm.free(); hb.data.materials.clear(); hb.data.materials.append(M["hem"]); parts.append(hb)
    fall("pleat", "cloth", 0.0, min(front(0.95), -0.13 * LEG * flare * 1.1) - 0.016, 0.97, min(0.56, 0.97 - zlow - 0.02), 0.045, edge=False, border=True, brole="hem")
    fall("pleat", "cloth", 0.0, max(backy(0.9), 0.13 * LEG * flare * 1.1) + 0.014, 0.95, min(0.36, 0.95 - zlow - 0.1), 0.04, edge=False)
    since(n0, name)
# ---- Fitting things to this body: where its surface is, at any height.
from mathutils.bvhtree import BVHTree
BVB = BVHTree.FromObject(B, bpy.context.evaluated_depsgraph_get())
# The shoulder joint, bulked: a ball of the arm's own girth set on each joint and carried by the arm, so the shoulder
# stays whole whichever way the arm is raised (the skin alone pinched there and left a hollow at the joint).
for sx in (1, -1):
    h = BVB.ray_cast(Vector((sx * (SHX + 0.3), 0, 1.385)), Vector((-sx, 0, 0)), 0.6)
    r = max(0.045, min(0.082, (abs(h[0].x) - SHX) if h[0] is not None else 0.065))
    o = prim("uv_sphere", "joint", "skin", (sx * (SHX + 0.003), 0.0, 1.386), (r, r * 1.02, r * 0.94), segments=14, ring_count=9); rigid(o, "aL" if sx > 0 else "aR"); o["part"] = "body"; parts.append(o)
def front(z, x=0.0):
    h = BVB.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)), 2.0); return h[0].y if h[0] is not None else -0.12
def backy(z, x=0.0):
    h = BVB.ray_cast(Vector((x, 1.0, z)), Vector((0, -1, 0)), 2.0); return h[0].y if h[0] is not None else 0.12
def hang(z0, z1, x=0.0, side=-1):   # where a cloth hanging between these heights lies: off the part of the body that stands furthest out
    ys = [front(z0 + (z1 - z0) * i / 8, x) if side < 0 else backy(z0 + (z1 - z0) * i / 8, x) for i in range(9)]; return (min(ys) - 0.01) if side < 0 else (max(ys) + 0.01)
def ring(name, role, z, minor, zs=1.0, grow=0.008, cx=0.0, cy=None, capx=None, N=32, bone=None):   # a band round the trunk or a limb, following its own outline
    if cy is None: cy = (front(z, cx) + backy(z, cx)) / 2
    c = Vector((cx, cy, z)); me = bpy.data.meshes.new(name); vs = []; fs = []; M_ = 6
    for i in range(N):
        a = i / N * math.tau; d = Vector((math.cos(a), math.sin(a), 0)); h = BVB.ray_cast(c, d, 0.6); p = (h[0] if h[0] is not None else c + d * 0.15) + d * grow
        if capx is not None and abs(p.x - cx) > capx: p = c + d * (capx / max(1e-4, abs(d.x)))
        for j in range(M_):
            b_ = j / M_ * math.tau; q = p + d * (minor * math.cos(b_)) + Vector((0, 0, minor * zs * math.sin(b_))); vs.append(tuple(q))
    for i in range(N):
        for j in range(M_): p0 = i * M_ + j; p1 = i * M_ + (j + 1) % M_; q0 = ((i + 1) % N) * M_ + j; q1 = ((i + 1) % N) * M_ + (j + 1) % M_; fs.append((p0, q0, q1, p1))
    me.from_pydata(vs, [], fs); me.update(); o = bpy.data.objects.new(name, me); S.collection.objects.link(o); o.data.materials.append(M[role])
    for pl in o.data.polygons: pl.use_smooth = True
    if bone: rigid(o, bone)
    parts.append(o); return o
WY = front(0.99) - 0.014      # just clear of the belly, at the waist
dhoti("dhoti", 0.27); dhoti("dhotiS", 0.46, 0.96); dhoti("dhotiL", 0.1, 0.98)
# ---- Waist: a cloth sash knotted in front with two ends; a gold girdle with a pleated panel; a plain leather belt.
n0 = len(parts)
ring("sash", "red", 0.995, 0.022, 2.0, 0.014)
parts.append(prim("uv_sphere", "knotsash", "red", (0.02, WY - 0.012, 0.985), (0.05, 0.03, 0.045), segments=12, ring_count=8))
for dx, zz, ln, wd, ry in ((0.0, 0.74, 0.22, 0.062, 0.03), (0.05, 0.8, 0.17, 0.05, -0.06)): fall("sashend", "red", dx, min(WY, hang(zz, zz + ln)) - 0.022 - dx * 0.1, zz + ln, ln * 2, wd, -ry, edge=bool(H.get("rich")))
since(n0, "sash"); n0 = len(parts)
ring("girdle", "gold", 0.99, 0.019, 1.7, 0.012)
parts.append(prim("uv_sphere", "girdle", "gold", (0, WY - 0.012, 0.99), (0.04, 0.014, 0.045), segments=10, ring_count=6))
parts.append(prim("uv_sphere", "girdlegem", "gem", (0, WY - 0.024, 0.99), (0.018, 0.008, 0.02), segments=8, ring_count=6))
since(n0, "girdle"); n0 = len(parts)
for dx, zz, ln, wd in ((0.0, 0.68, 0.3, 0.075), (0.0, 0.8, 0.17, 0.1)): fall("panel", "red", dx, min(WY, hang(zz, zz + ln)) - 0.03 - (0.012 if wd > 0.09 else 0), zz + ln, ln * 2, wd)
since(n0, "panel"); n0 = len(parts)
ring("belt", "leather", 1.0, 0.015, 2.4, 0.012); since(n0, "belt"); n0 = len(parts)
# ---- Gold
for k in range(15):
    a = (k - 7) / 7 * 1.25; x_, z_ = math.sin(a) * 0.105 * FX, 1.47 - math.cos(a) * 0.075; parts.append(prim("uv_sphere", "necklace", "gold", (x_, front(z_, x_) - 0.006, z_), (0.0125, 0.0125, 0.0125), segments=8, ring_count=6))
parts.append(prim("uv_sphere", "pendant", "gold", (0, front(1.375) - 0.006, 1.375), (0.024, 0.012, 0.028), segments=10, ring_count=6))
parts.append(prim("uv_sphere", "pendantgem", "gem", (0, front(1.375) - 0.016, 1.375), (0.011, 0.006, 0.013), segments=8, ring_count=6))
for o in parts[n0:]: rigid(o, "T")
since(n0, "gold"); n0 = len(parts)
both(lambda sx: prim("uv_sphere", "earring", "gold", (sx * 0.104 * F["hw"], 0.0, HZ - 0.062), (0.014, 0.014, 0.018), segments=8, ring_count=6))
for o in parts[n0:]: rigid(o, "H")
since(n0, "ear"); n0 = len(parts)
for sx, sd in ((1, "L"), (-1, "R")):
    ring("armlet", "gold", 1.2, 0.01, 2.4, 0.004, cx=sx * AX, cy=0.0, N=20, bone="a" + sd)
    parts.append(prim("uv_sphere", "armletgem", "gem", (sx * (AX + 0.01), front(1.2, sx * (AX + 0.01)) - 0.008, 1.2), (0.016, 0.008, 0.02), segments=8, ring_count=6)); rigid(parts[-1], "a" + sd)
    ring("wrist", "gold", 0.875, 0.008, 3.0, 0.004, cx=sx * AX, cy=0.0, N=16, bone="e" + sd)
since(n0, "bands"); n0 = len(parts)
for sx, sd in ((1, "L"), (-1, "R")): ring("anklet", "gold", 0.1, 0.008, 2.0, 0.004, cx=sx * (HPX + 0.008), cy=0.005, N=16, bone="k" + sd)
since(n0, "anklets"); n0 = len(parts)
# a string of dark beads, long on the chest (teachers, forest folk, village people)
for k in range(22):
    a = (k - 10.5) / 10.5 * 1.45; x_, z_ = math.sin(a) * 0.1 * FX, 1.47 - math.cos(a) * 0.17; parts.append(prim("uv_sphere", "beads", "beads", (x_, front(z_, x_) - 0.006, z_), (0.011, 0.011, 0.011), segments=6, ring_count=5)); rigid(parts[-1], "T")
since(n0, "beads"); n0 = len(parts)
# ---- Armour: a cuirass taken from the trunk, shoulder plates, forearm guards, shin guards
shell("cuirass", "armour", lambda c: 1.029 < c.z < 1.44 and trunk(c), 0.013, cut=(1.03, None))
ring("cuirassbelt", "leather", 1.045, 0.016, 1.6, 0.016, bone="T")
since(n0, "cuirass"); n0 = len(parts)
for (dx_, z_, sc_, tilt) in ((0.0, 1.425, (0.098, 0.108, 0.046), 0.28), (0.052, 1.39, (0.088, 0.104, 0.04), 0.62), (0.092, 1.342, (0.074, 0.096, 0.036), 0.95)):   # three lapped plates down the shoulder, each tipped further over the arm
    both(lambda sx: prim("uv_sphere", "pauldron", "armour", (sx * (SHX + dx_ * H["arm"]), 0, z_), tuple(k * H["arm"] for k in sc_), (0, sx * tilt, 0), segments=12, ring_count=6))
for o in parts[n0:]: rigid(o, "aL" if sum(v.co.x for v in o.data.vertices) > 0 else "aR")
since(n0, "pauldron"); n0 = len(parts)
def limbshell(name, role, z0, z1, bones, off):
    o = B.copy(); o.data = B.data.copy(); S.collection.objects.link(o); o.name = name; bm = bmesh.new(); bm.from_mesh(o.data)
    for z_, up in ((z0, -1), (z1, 1)): bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z_), plane_no=(0, 0, up), clear_outer=True)
    dl = bm.verts.layers.deform.active; bi = {i for i, g in enumerate(B.vertex_groups) if g.name[0] in bones}
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (z0 - 0.001 < v.co.z < z1 + 0.001 and sum(w for i, w in v[dl].items() if i in bi) > 0.5)], context="VERTS")
    for v in bm.verts: v.co += v.normal * off
    bm.to_mesh(o.data); bm.free(); o.data.materials.clear(); o.data.materials.append(M[role]); parts.append(o); return o
limbshell("vambrace", "leather", 0.885, 1.075, "ew", 0.009); since(n0, "vambrace"); n0 = len(parts)
limbshell("greave", "leather", 0.1, 0.41, "k", 0.009); since(n0, "greave"); n0 = len(parts)
# bands of trim round a cuirass, and a boss on the breast
for zz in (1.12, 1.27): ring("lames", "gold", zz, 0.0045, 1.3, 0.016, capx=SHX - 0.03, bone="T")
since(n0, "lames"); n0 = len(parts)
dhoti("tasset", 0.79, 1.13, role="armour", plain=True); n0 = len(parts)   # the skirt of scales that hangs from the belt, over the cloth
parts.append(prim("uv_sphere", "boss", "gold", (0, front(1.3) - 0.016, 1.3), (0.05, 0.016, 0.05), segments=12, ring_count=6)); rigid(parts[-1], "T")
parts.append(prim("uv_sphere", "bossgem", "gem", (0, front(1.3) - 0.03, 1.3), (0.02, 0.008, 0.02), segments=8, ring_count=6)); rigid(parts[-1], "T"); since(n0, "boss"); n0 = len(parts)
# the lower cloth's own rolled top, knotted in front (plain people: no sash over it)
ring("tuck", "cloth", 0.995, 0.019, 1.8, 0.013); ring("tuckline", "red", 0.978, 0.0055, 1.0, 0.03)
parts.append(prim("uv_sphere", "tuckknot", "cloth", (0.0, WY - 0.01, 0.99), (0.04, 0.028, 0.036), segments=10, ring_count=6)); since(n0, "tuck"); n0 = len(parts)
# ---- Across the chest
shell("hide", "hide", lambda c: band(c, 0.11), 0.017); since(n0, "hide"); n0 = len(parts)
shell("bandeau", "band", lambda c: 1.214 < c.z < 1.371 and trunk(c), 0.01, cut=(1.215, 1.37)); since(n0, "bandeau"); n0 = len(parts)
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
def ribbon(src, suffix, P0=(0.125, 1.455), P1=(-0.16, 1.0), mid="red", half=0.02, names=("strap", "strapedge", "strapstud"), stud=3, edge="gold", off=0.011):
    dg = bpy.context.evaluated_depsgraph_get(); bvh = BVHTree.FromObject(src, dg); kd = KDTree(len(src.data.vertices))
    for v in src.data.vertices: kd.insert(v.co, v.index)
    kd.balance(); gn = [g.name for g in src.vertex_groups]
    p0, p1 = Vector((P0[0] * FX, 0, P0[1])), Vector((P1[0] * WX, 0, P1[1])); u = (p1 - p0).normalized(); yh = Vector((0, 1, 0)); n = u.cross(yh).normalized(); c = (p0 + p1) / 2
    N = 72; ring = []
    for i in range(N):
        a = i / N * math.tau; d = (u * math.cos(a) + yh * math.sin(a)).normalized(); hit = None; o_ = c + d * 0.6
        h = bvh.ray_cast(o_, -d, 0.6)                                    # from outside in... but only the trunk counts, not an arm in the way
        while h[0] is not None:
            vi = kd.find(h[0])[1]; aw = sum(g.weight * (0.5 if gn[g.group][0] == "a" else 1.0) for g in src.data.vertices[vi].groups if gn[g.group][0] in "aew")   # (an upper arm hanging by the hip is not the trunk either)
            if aw < 0.3: hit = h[0]; break
            h = bvh.ray_cast(h[0] - d * 0.002, -d, 0.6)
        ring.append((hit if hit is not None else c + d * 0.15, d))
    def strip(name, role, w0, w1, off):
        me = bpy.data.meshes.new(name); vs = []; fs = []
        for p, d in ring: vs += [tuple(p + d * off + n * w0), tuple(p + d * off + n * w1)]
        for i in range(N): a, b = i * 2, ((i + 1) % N) * 2; fs.append((a, b, b + 1, a + 1))
        me.from_pydata(vs, [], fs); me.update(); o = bpy.data.objects.new(name, me); S.collection.objects.link(o); o.data.materials.append(M[role])
        for pl in o.data.polygons: pl.use_smooth = True
        for v in o.data.vertices:   # a band round the trunk is carried by the trunk and the hips alone: an arm that swings must not drag it
            sv = src.data.vertices[kd.find(v.co)[1]]; gs = [g for g in sorted(sv.groups, key=lambda g: -g.weight) if gn[g.group][0] not in "aew"][:2]; tot = sum(g.weight for g in gs)
            if tot < 0.05: (o.vertex_groups.get("T") or o.vertex_groups.new(name="T")).add([v.index], 1.0, "REPLACE")
            else:
                for g in gs: (o.vertex_groups.get(gn[g.group]) or o.vertex_groups.new(name=gn[g.group])).add([v.index], g.weight / tot, "REPLACE")
        parts.append(o); return o
    strip(names[0] + suffix, mid, -half, half, off)
    if edge: strip(names[1] + suffix, edge, -half - 0.01, -half, off + 0.0015); strip(names[1] + suffix, edge, half, half + 0.01, off + 0.0015)
    for i in range(0, N, stud):
        p, d = ring[i]; s_ = prim("uv_sphere", names[2] + suffix, "gold", tuple(p + d * 0.014), (0.0075, 0.0075, 0.0075), segments=6, ring_count=5)
        sv = src.data.vertices[kd.find(p)[1]]
        for g in sorted(sv.groups, key=lambda g: -g.weight)[:2]: (s_.vertex_groups.get(gn[g.group]) or s_.vertex_groups.new(name=gn[g.group])).add(range(len(s_.data.vertices)), g.weight, "REPLACE")
        parts.append(s_)
ribbon(B, "", mid="white", half=0.0045, stud=99, edge=None, off=0.006); since(n0, "thread"); n0 = len(parts)                  # the sacred thread
ribbon(B, "", mid="red", half=0.03, stud=99, edge="red" if not H.get("rich") else "gold"); since(n0, "baldric"); n0 = len(parts)   # a sash of the side's colour, over the armour
ribbon(B, "", mid="leather", half=0.014, stud=99, edge="leather"); since(n0, "strap"); n0 = len(parts)            # a quiver's or a bag's strap
ribbon(B, "", mid="gold", half=0.011, names=("harness", "harness", "harness"), stud=2)
ribbon(B, "", P0=(-0.125, 1.455), P1=(0.16, 1.0), mid="gold", half=0.011, names=("harness", "harness", "harness"), stud=2); since(n0, "harness"); n0 = len(parts)
# the upper cloth: over the left shoulder, an end falling in front and one behind
ribbon(B, "", P0=(0.15, 1.455), P1=(-0.12, 1.02), mid="cloth2", half=0.085, names=("shawl", "shawledge", "shawledge"), stud=99, edge="red", off=0.015)
fall("shawlend", "cloth2", 0.17 * FX, hang(0.6, 1.36, 0.17 * FX), 1.36, 0.9, 0.08, top="T", side=0.85, edge=False, border=True)
fall("shawlend", "cloth2", 0.16 * FX, hang(0.6, 1.4, 0.16 * FX, 1), 1.4, 0.85, 0.08, top="T", side=0.85, edge=False, border=True); since(n0, "shawl"); n0 = len(parts)
# a plain man's upper cloth: a folded length over the left shoulder and across the chest to the right hip, its end hanging behind
ribbon(B, "", P0=(0.15, 1.455), P1=(-0.13, 1.03), mid="cloth2", half=0.06, names=("drape", "drapeedge", "drapeedge"), stud=99, edge="red", off=0.017)
fall("drape", "cloth2", 0.16 * FX, hang(0.6, 1.4, 0.16 * FX, 1), 1.4, 0.62, 0.065, top="T", side=0.85, edge=False, gather=0.6, deep=1.6); since(n0, "drape"); n0 = len(parts)
fall("apron", "leather", 0.0, hang(0.6, 1.3), 1.3, 0.75, 0.15, top="T", edge=False); since(n0, "apron"); n0 = len(parts)
# ---- Head: crowns, a helmet, a turban, matted hair, beards, a veil, a blindfold
CR = H.get("crown")
if CR:
    parts.append(prim("torus", "crown", "gold", (0, 0.012, HZ + 0.072), (1, 1.14, 2.4), (0.12, 0, 0), major_radius=0.103, minor_radius=0.009, major_segments=28, minor_segments=8))
    parts.append(prim("uv_sphere", "crowngem", "gem", (0, -0.112, HZ + 0.08), (0.014, 0.008, 0.018), segments=8, ring_count=6))
    if CR == "mukuta":
        for r_, z_, h_ in ((0.108, 0.13, 0.05), (0.094, 0.19, 0.045), (0.075, 0.245, 0.04), (0.052, 0.29, 0.035)):
            parts.append(prim("uv_sphere", "crowntier", "gold", (0, 0.015, HZ + z_), (r_, r_ * 1.1, h_), segments=14, ring_count=8))
        parts.append(prim("cone", "crownspire", "gold", (0, 0.015, HZ + 0.36), (0.028, 0.028, 0.05), vertices=10))
        for k in range(8):
            a = k / 8 * math.tau; parts.append(prim("uv_sphere", "crowngem", "gem", (math.sin(a) * 0.106, 0.015 - math.cos(a) * 0.117, HZ + 0.135), (0.01, 0.01, 0.013), segments=6, ring_count=6))
    elif CR == "kirita":
        parts.append(prim("cone", "crownpeak", "gold", (0, -0.085, HZ + 0.16), (0.05, 0.016, 0.075), vertices=8))
        both(lambda sx: prim("cone", "crownpeak", "gold", (sx * 0.06, -0.085, HZ + 0.125), (0.026, 0.012, 0.045), vertices=6))
    else:   # a diadem: a band with a leaf over the brow
        parts.append(prim("cone", "crownpeak", "gold", (0, -0.1, HZ + 0.115), (0.03, 0.012, 0.045), vertices=8))
for o in parts[n0:]: rigid(o, "H")
since(n0, "crown"); n0 = len(parts)
bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0.014, HZ + 0.03), segments=24, ring_count=14); hm = bpy.context.object; hm.name = "helmet"; hm.scale = (0.116, 0.132, 0.14); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(hm.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < HZ + 0.022 - (0.0 if v.co.y < -0.045 else 0.125)], context="VERTS"); bm.to_mesh(hm.data); bm.free(); hm.data.materials.append(M["iron"])
for p in hm.data.polygons: p.use_smooth = True
hm.select_set(False); parts.append(hm)
parts.append(prim("torus", "helmetrim", "gold", (0, 0.014, HZ + 0.03), (1, 1.14, 1.8), major_radius=0.117, minor_radius=0.008, major_segments=24, minor_segments=6))
parts.append(prim("cone", "helmetknob", "gold", (0, 0.014, HZ + 0.19), (0.022, 0.022, 0.035), vertices=10))
parts.append(prim("cube", "helmetnose", "iron", (0, -0.118, HZ + 0.0), (0.009, 0.006, 0.04), size=2))
for o in parts[n0:]: rigid(o, "H")
since(n0, "helmet"); n0 = len(parts)
for r_, z_, mr, tl in ((0.1, 0.07, 0.036, 0.25), (0.092, 0.105, 0.034, -0.2), (0.075, 0.14, 0.032, 0.15)):
    parts.append(prim("torus", "turban", "red", (0, 0.02, HZ + z_), (1, 1.12, 1.25), (tl * 0.4, tl * 0.3, 0), major_radius=r_, minor_radius=mr, major_segments=20, minor_segments=8))
parts.append(prim("uv_sphere", "turban", "red", (0, 0.02, HZ + 0.13), (0.08, 0.09, 0.05), segments=12, ring_count=6))
for o in parts[n0:]: rigid(o, "H")
since(n0, "turban"); n0 = len(parts)
parts.append(prim("torus", "jata", "hair", (0, 0.03, HZ + 0.13), (1, 1, 1.3), major_radius=0.05, minor_radius=0.03, major_segments=16, minor_segments=8))
parts.append(prim("torus", "jata", "hair", (0, 0.03, HZ + 0.175), (1, 1, 1.3), major_radius=0.034, minor_radius=0.026, major_segments=14, minor_segments=8))
parts.append(prim("uv_sphere", "jata", "hair", (0, 0.03, HZ + 0.215), (0.03, 0.03, 0.026), segments=10, ring_count=6))
for o in parts[n0:]: rigid(o, "H")
since(n0, "jata"); n0 = len(parts)
# a woman's hair: drawn back to a knot low behind, and a long plait down the back
parts.append(prim("uv_sphere", "bun", "hair", (0, 0.115, HZ - 0.03), (0.055, 0.045, 0.055), segments=12, ring_count=8)); rigid(parts[-1], "H"); since(n0, "bun"); n0 = len(parts)
for j in range(9): parts.append(prim("uv_sphere", "braid", "hair", (0, 0.125 + (0.02 if j > 1 else 0), HZ - 0.1 - j * 0.058), (0.028 - j * 0.0012, 0.026, 0.04), segments=8, ring_count=6)); rigid(parts[-1], "H" if j < 2 else "T")
since(n0, "braid"); n0 = len(parts)
def hairfall(name, ln, wd):
    me = bpy.data.meshes.new(name); rows = 12; vs = []; fs = []; C_ = 7
    for r in range(rows + 1):
        t = r / rows; z = HZ + 0.06 - ln * t
        for c in range(C_):
            u = c / (C_ - 1) - 0.5; back = 0.118 + 0.03 * math.sin(t * 2.2) - 0.045 * (2 * u) ** 2 + (0.035 if z < 1.52 else 0) * sm(1.52, 1.4, z); vs.append((u * wd * (1 + 0.25 * sm(0, 0.5, t)) + 0.006 * math.sin(c * 2.1 + r), back + 0.004 * (c % 2), z))
    for r in range(rows):
        for c in range(C_ - 1): a = r * C_ + c; fs.append((a, a + 1, a + C_ + 1, a + C_))
    me.from_pydata(vs, [], fs); me.update(); o = bpy.data.objects.new(name, me); S.collection.objects.link(o); o.data.materials.append(M["hair"])
    for p in o.data.polygons: p.use_smooth = True
    gh, gt = o.vertex_groups.new(name="H"), o.vertex_groups.new(name="T")
    for v in o.data.vertices:
        k = sm(1.4, 1.56, v.co.z)
        if k > 0.02: gh.add([v.index], k, "REPLACE")
        if k < 0.98: gt.add([v.index], 1 - k, "REPLACE")
    parts.append(o); return o
hairfall("longhair", 0.62 if SHE else 0.42, 0.2); since(n0, "longhair"); n0 = len(parts)
for nm, fz, fy in (("feather", 0.36, -0.07), ("featherlow", 0.2, -0.03)):   # a peacock's eye-feather: over the crown, or in the knot when he wears none
    parts.append(prim("uv_sphere", nm, "band", (0.02, fy, HZ + fz), (0.035, 0.008, 0.075), (-0.25, 0.1, 0), segments=10, ring_count=8)); rigid(parts[-1], "H")
    parts.append(prim("uv_sphere", nm + "eye", "gem", (0.02, fy - 0.01, HZ + fz + 0.025), (0.016, 0.006, 0.024), (-0.25, 0.1, 0), segments=8, ring_count=6)); rigid(parts[-1], "H"); since(n0, nm); n0 = len(parts)
# beards: close-cut (the skin of the jaw itself, darkened and stood off), full, long; and a tuft on the chin alone
shell("beardS", "hair", lambda c: c.z < HZ - 0.066 and c.y < 0.02 and not (abs(c.x) < 0.032 and HZ - 0.108 < c.z < HZ - 0.084 and c.y < -0.1), 0.004, Hd); since(n0, "beardS"); n0 = len(parts)
parts.append(prim("uv_sphere", "beardF", "hair", (0, -0.072, HZ - 0.135), (0.066, 0.052, 0.055), segments=14, ring_count=8)); rigid(parts[-1], "H"); since(n0, "beardF"); n0 = len(parts)
parts.append(prim("uv_sphere", "beardL", "hair", (0, -0.085, HZ - 0.2), (0.06, 0.04, 0.12), segments=14, ring_count=10)); rigid(parts[-1], "H"); since(n0, "beardL"); n0 = len(parts)
parts.append(prim("uv_sphere", "goatee", "hair", (0, -0.092, HZ - 0.15), (0.024, 0.022, 0.04), segments=10, ring_count=6)); rigid(parts[-1], "H"); since(n0, "goatee"); n0 = len(parts)
if H.get("stubble"): shell("stubble", "stubble", lambda c: c.z < HZ - 0.062 and c.y < -0.005 and not (abs(c.x) < 0.03 and HZ - 0.106 < c.z < HZ - 0.086 and c.y < -0.1), 0.0012, Hd); since(n0, "face"); n0 = len(parts)
# the head-cloth of an elder woman, over the hair and down the back; a band over the eyes
bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0.03, HZ + 0.03), segments=24, ring_count=14); vl = bpy.context.object; vl.name = "veil"; vl.scale = (0.122, 0.14, 0.13); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(vl.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.045 and v.co.z < HZ + 0.1 or v.co.z < HZ - 0.11], context="VERTS"); bm.to_mesh(vl.data); bm.free(); vl.data.materials.append(M["cloth2"])
for p in vl.data.polygons: p.use_smooth = True
vl.select_set(False); rigid(vl, "H"); parts.append(vl)
fall("veilfall", "cloth2", 0.0, 0.15, HZ - 0.08, 0.75, 0.15, top="T", edge=False); since(n0, "veil"); n0 = len(parts)
parts.append(prim("torus", "blindfold", "white", (0, 0.012, HZ + 0.0), (1, 1.15, 3.2), major_radius=0.1 * F["hw"], minor_radius=0.008, major_segments=24, minor_segments=6)); rigid(parts[-1], "H"); since(n0, "blindfold"); n0 = len(parts)
# a mark on the brow
parts.append(prim("uv_sphere", "tilak", "gem", (0, -0.119, HZ + 0.045), (0.006, 0.004, 0.014), segments=6, ring_count=5)); rigid(parts[-1], "H"); since(n0, "tilak"); n0 = len(parts)

PART = { "eye": "face", "iris": "face", "lid": "face", "browhair": "face", "lip": "face", "stache": "stache", "stache2": "stache", "haircap": "hair", "backhair": "hair", "knot": "knot", "knotband": "knot", "locks": "locks" }
def part_of(o):
    return o.get("part") or PART.get(o.name.split(".")[0], o.name.split(".")[0])
for o in parts:
    if not o.vertex_groups: rigid(o, "H" if part_of(o) in ("face", "stache", "hair", "knot", "locks") else "P")
for o in parts:
    if part_of(o) == "knot" and o.name.startswith("knotband"): o.data.materials.clear(); o.data.materials.append(M["red"])
print("parts", len(parts), sorted({part_of(o) for o in parts}))
LOOKS = H["looks"]; BASE = ["body", "head", "hands", "face"]
def setcol(m, h): M[m].node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*lin(hexc(h)), 1)
def look(name, loc, at, lens=60):
    cam = bpy.data.cameras.new(name); cam.lens = lens; co = bpy.data.objects.new(name, cam); S.collection.objects.link(co); co.location = loc
    d = Vector(at) - Vector(loc); co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); return co
def lights():
    for n, loc, e, sz in (("key", (2.2, -3.2, 3.2), 230, 2.5), ("fill", (-3, -2, 1.6), 90, 4), ("rim", (0.5, 3.2, 2.6), 160, 2)):
        l = bpy.data.lights.new(n, "AREA"); l.energy = e; l.size = sz; o = bpy.data.objects.new(n, l); S.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector((0, 0, 1.1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    w = bpy.data.worlds.new("w"); S.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.16, 0.15, 0.15, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0)); g = bpy.context.object; g.data.materials.append(mat("floor", (0.12, 0.1, 0.09), 0.9))
def render(tag, shots, res=(560, 800), samples=24):
    S.render.engine = "CYCLES"; S.view_settings.view_transform = "Standard"; S.cycles.samples = samples; S.cycles.use_denoising = True; S.cycles.device = "CPU"
    S.render.resolution_x, S.render.resolution_y = res; S.render.film_transparent = False
    for n, loc, at, lens in shots:
        S.camera = look(n, loc, at, lens); S.render.filepath = f"{OUT}/{tag}_{n}.png"; bpy.ops.render.render(write_still=True)
if STAGE == "looks":
    lights()
    for lk, L in LOOKS.items():
        for r, v in ROLE0.items():
            if r != "stubble": setcol(r, L.get("cols", {}).get(r, v))
        show = set(BASE + L["parts"])
        for o in [B, Hd] + HANDS + parts: o.hide_render = (part_of(o) if o in parts else {B: "body", Hd: "head"}.get(o, "hands")) not in show
        render(HERO + "_" + lk, [("front", (0, -5.2, 1.05), (0, 0, 0.95), 70)] + ([("face", (0.25, -1.6, 1.72), (0, 0, 1.66), 70), ("side", (5.2, 0, 1.05), (0, 0, 0.95), 70), ("back", (0, 5.2, 1.05), (0, 0, 0.95), 70)] if len(argv) > 3 else []), res=(420, 640), samples=16)

if STAGE == "export":
    import json, base64, struct
    B["part"] = "body"; Hd["part"] = "head"
    for o in HANDS: o["part"] = "hands"
    used = set(BASE); [used.update(L["parts"]) for L in LOOKS.values()]
    objs = sorted([o for o in [B, Hd] + HANDS + parts if part_of(o) in used], key=lambda o: part_of(o)); P_, N_, C_, J_, W_, I_ = [], [], [], [], [], []; roles = []; cols = []; base = 0; ranges = {}; HIDDEN = []
    for o in objs:
        me = o.data; me.calc_loop_triangles(); mt = o.data.materials[0]; names = [g.name for g in o.vertex_groups]
        if mt.name not in roles: roles.append(mt.name); c = mt.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value; cols.append([round(255 * (x ** (1 / 2.2))) for x in c[:3]])
        ci = roles.index(mt.name); i0 = len(I_)
        for v in me.vertices:
            x, y, z = o.matrix_world @ v.co; nx, ny, nz = (o.matrix_world.to_3x3() @ v.normal).normalized()
            P_ += [x, z, -y]; N_ += [nx, nz, -ny]; C_.append(ci)
            ws = sorted(((g.weight, JOINTS.index(names[g.group])) for g in v.groups if names[g.group] in JOINTS and g.weight > 0.01), reverse=True)[:2]
            if not ws: ws = [(1.0, 0)]
            if len(ws) == 1: ws.append((0.0, ws[0][1]))
            t = ws[0][0] + ws[1][0]; J_ += [ws[0][1], ws[1][1]]; W_.append(round(255 * ws[0][0] / t))
        for t in me.loop_triangles:
            tri = [base + t.vertices[0], base + t.vertices[1], base + t.vertices[2]]
            if o is B and all(0.47 < me.vertices[i].co.z < 0.9 and abs(me.vertices[i].co.x) > 0.015 for i in t.vertices) and all(sum(g.weight for g in me.vertices[i].groups if names[g.group][0] in "lk") > 0.5 for i in t.vertices): HIDDEN.extend(tri)
            else: I_ += tri
        base += len(me.vertices); r = ranges.setdefault(part_of(o), [i0, 0]); r[1] = len(I_) - r[0]
    ranges["thighs"] = [len(I_), len(HIDDEN)]; I_ += HIDDEN
    n = base; assert n < 65536, n
    b64 = lambda fmt, a: base64.b64encode(struct.pack("<%d%s" % (len(a), fmt), *a)).decode()
    looks = { lk: { "parts": BASE + L["parts"], "cols": { r: "#%06x" % v for r, v in L.get("cols", {}).items() } } for lk, L in LOOKS.items() }
    data = { "n": n, "joints": JOINTS, "scale": 8192, "wide": WIDE, "size": H.get("size", 1), "sided": bool(H.get("sided")), "roles": roles, "cols": cols, "parts": ranges, "looks": looks,
             "pos": b64("h", [max(-32767, min(32767, round(v * 8192))) for v in P_]), "nor": b64("b", [max(-127, min(127, round(v * 127))) for v in N_]),
             "col": b64("B", C_), "jnt": b64("B", J_), "wgt": b64("B", W_), "idx": b64("H", I_) }
    open(OUT + "/m_" + HERO + ".js", "w").write("/* " + HERO + ": modelled in Blender by tools/blender/cast.py from the artist's sheets. Do not edit by hand. */\n(function (K) { const G = (K.G3 = K.G3 || {}); (G.MODELS = G.MODELS || {})." + HERO + " = " + json.dumps(data, separators=(",", ":")) + "; })(window.K = window.K || {});\n")
    print("exported", HERO, "verts", n, "tris", len(I_) // 3)
