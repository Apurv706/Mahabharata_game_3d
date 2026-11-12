# Bhima, built in Blender by script, in the game's own rest pose and units (see js/g3/figure.js):
#   up = Blender Z (game Y), front = Blender -Y (game +Z), his left = Blender +X. Hips 0.92, shoulders 1.41, head joint 1.47.
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "."
STAGE = argv[1] if len(argv) > 1 else "all"
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
WIDE = 1.2; SHX = 0.255 * WIDE * 0.9; HPX = 0.1 * WIDE   # (a modelled hero's shoulder joints stand a little closer: js/g3/figure.js)

def mat(name, col, rough=0.6, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m
def hexc(h): return tuple(((h >> s) & 255) / 255 for s in (16, 8, 0))
def lin(c): return tuple(x ** 2.2 for x in c)
M = { "skin": mat("skin", lin(hexc(0xb97a42)), 0.5), "cloth": mat("cloth", lin(hexc(0xe0a92e)), 0.85), "red": mat("red", lin(hexc(0xc22a1a)), 0.8),
      "gold": mat("gold", lin(hexc(0xd9a53a)), 0.32, 1.0), "hair": mat("hair", lin(hexc(0x14100c)), 0.5), "white": mat("white", (0.9, 0.88, 0.82), 0.3),
      "iris": mat("iris", (0.03, 0.02, 0.015), 0.2), "hide": mat("hide", lin(hexc(0xc79a5a)), 0.8), "armour": mat("armour", lin(hexc(0xc9a24e)), 0.35, 0.9), "lip": mat("lip", lin(hexc(0x7a3a26)), 0.5), "iron": mat("iron", lin(hexc(0x4a4a50)), 0.4, 0.9) }

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
def lean(balls, k=0.84):   # a youth's build: the same frame, less on it, and none of the cut lines
    out = []
    for b in balls:
        if len(b) > 4 and b[4]: continue
        st = b[2] if len(b) > 2 else 2.0; kk = k * (0.8 if st < 1.55 else 1.0)
        out.append(((b[0][0], b[0][1] * (0.8 if st < 1.55 else 1), b[0][2]), (b[1][0] * kk, b[1][1] * kk, b[1][2])) + tuple(b[2:]))
    return out
def mk_body(name, t, a):
    Bt = metaballs(name + "t", t, 0.0125, 0.62); Ba = metaballs(name + "a", a, 0.0115, 0.62)
    bpy.ops.object.select_all(action="DESELECT"); Bt.select_set(True); Ba.select_set(True); bpy.context.view_layer.objects.active = Bt; bpy.ops.object.join(); o = bpy.context.object; o.name = name; o.select_set(False); return o
B = mk_body("body", torso, arms); BL = mk_body("bodylean", lean(torso), lean(arms, 0.8))
HANDS = [metaballs("handL", hand(1), 0.0055, 0.62), metaballs("handR", hand(-1), 0.0055, 0.62)]
# ---- The head: broad, heavy-jawed. Built at the head joint (z 1.47) with the skull's centre about 0.16 above it.
HZ = 1.47 + 0.19
head = sym([
  ((0, 0.015, HZ + 0.03), (0.098, 0.115, 0.108)),           # cranium
  ((0, -0.03, HZ - 0.04), (0.088, 0.092, 0.09)),            # face
  ((0, -0.04, HZ - 0.1), (0.074, 0.07, 0.05)),              # jaw
  ((0, -0.088, HZ - 0.128), (0.036, 0.03, 0.026), 1.6),     # chin
  ((0.06, -0.02, HZ - 0.088), (0.034, 0.045, 0.04), 1.5),   # the jaw's corners
  ((0.052, -0.082, HZ - 0.035), (0.03, 0.024, 0.024), 1.5), # cheekbones
  ((0, -0.112, HZ - 0.025), (0.016, 0.026, 0.045), 1.8),    # nose, bridge
  ((0, -0.134, HZ - 0.052), (0.022, 0.024, 0.018), 1.8),    # nose, tip
  ((0.02, -0.12, HZ - 0.058), (0.013, 0.015, 0.011), 1.8),  # nostrils
  ((0.038, -0.104, HZ + 0.024), (0.036, 0.018, 0.013), 1.7),# brow ridge
  ((0, -0.095, HZ + 0.062), (0.066, 0.028, 0.036), 1.5),    # forehead
  ((0.098, 0.005, HZ - 0.02), (0.012, 0.022, 0.034), 1.8),  # ears
  ((0.037, -0.118, HZ - 0.002), (0.022, 0.02, 0.012), 1.6, None, True),   # eye sockets (cut in)
  ((0, -0.128, HZ - 0.092), (0.03, 0.014, 0.005), 1.6, None, True),       # the mouth's line (cut in)
])
Hd = metaballs("head", head, 0.0085, 0.62)
for o in [B, BL, Hd] + HANDS:
    o.data.materials.append(M["skin"])
    m = o.modifiers.new("sm", "SMOOTH"); m.iterations = 2; m.factor = 0.5
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="sm")
    for p in o.data.polygons: p.use_smooth = True
print("body verts", len(B.data.vertices), "head verts", len(Hd.data.vertices))

# ---- The skeleton: the game's own joints, by the game's own names, where the game has them -----------------------
JOINTS = ["P", "T", "H", "aL", "eL", "wL", "aR", "eR", "wR", "lL", "kL", "lR", "kR"]
for o, r in ((B, 0.42), (BL, 0.36), (Hd, 0.6), (HANDS[0], 0.5), (HANDS[1], 0.5)):
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
for o in (B, BL):
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
both(lambda sx: prim("uv_sphere", "eye", "white", (sx * 0.037, -0.103, HZ - 0.002), (0.0165, 0.012, 0.0105), segments=14, ring_count=8))
both(lambda sx: prim("uv_sphere", "iris", "iris", (sx * 0.037, -0.1135, HZ - 0.002), (0.0075, 0.004, 0.0078), segments=10, ring_count=6))
both(lambda sx: prim("uv_sphere", "lid", "skin", (sx * 0.037, -0.1045, HZ + 0.0065), (0.0185, 0.0125, 0.0085), (0.25, 0, 0), segments=12, ring_count=6))
both(lambda sx: prim("uv_sphere", "browhair", "hair", (sx * 0.04, -0.121, HZ + 0.024), (0.027, 0.008, 0.007), (0, -sx * 0.22, 0), segments=10, ring_count=6))
parts.append(prim("uv_sphere", "lip", "lip", (0, -0.126, HZ - 0.098), (0.028, 0.012, 0.0085), segments=12, ring_count=6))
# The moustache of a wrestler: thick over the lip, swept out and up at the ends
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
    for j in range(4):
        w = math.sin(j * 1.9 + k) * 0.012; parts.append(prim("uv_sphere", "locks", "hair", (x * (1 + j * 0.07) + w, y + j * 0.008, HZ - 0.06 - j * 0.058), (0.026, 0.026, 0.04), segments=8, ring_count=6))
# The lower cloth, drawn up to the knee as a fighting man wears it: taken from the body's own surface and stood off it
DHOTI_AT = len(parts)   # (made further down, once shells can be cut by the skin's weights)
both(lambda sx: prim("torus", "hem", "red", (sx * (HPX + 0.01), 0.005, 0.235), (1, 1.1, 1.8), major_radius=0.082, minor_radius=0.012, major_segments=20, minor_segments=6))
both(lambda sx: prim("torus", "hem", "gold", (sx * (HPX + 0.01), 0.005, 0.262), (1, 1.1, 1), major_radius=0.083, minor_radius=0.006, major_segments=20, minor_segments=6))
parts.append(prim("torus", "sash", "red", (0, -0.005, 0.995), (1, 0.8, 2.1), major_radius=0.168, minor_radius=0.024, major_segments=28, minor_segments=8))
parts.append(prim("uv_sphere", "knotsash", "red", (0.035, -0.165, 0.985), (0.06, 0.04, 0.05), segments=12, ring_count=8))
for dx, zz, ln, wd, ry in ((0.0, 0.76, 0.2, 0.07, 0.04), (0.075, 0.8, 0.16, 0.055, -0.1)):   # the two ends, one over the other
    parts.append(prim("cube", "sashend", "red", (dx, -0.172, zz), (wd, 0.01, ln), (0, ry, 0), size=2))
    parts.append(prim("cube", "sashend", "gold", (dx - ry * ln, -0.174, zz - ln + 0.012), (wd * 1.02, 0.011, 0.012), (0, ry, 0), size=2))
# Gold: a broad necklace, armlets, wristbands, anklets, earrings, a clasp on the sash
for k in range(15):
    a = (k - 7) / 7 * 1.25; parts.append(prim("uv_sphere", "necklace", "gold", (math.sin(a) * 0.105, -0.058 - math.cos(a) * 0.06, 1.47 - math.cos(a) * 0.075), (0.0125, 0.0125, 0.0125), segments=8, ring_count=6))
parts.append(prim("uv_sphere", "pendant", "gold", (0, -0.128, 1.375), (0.024, 0.012, 0.028), segments=10, ring_count=6))
parts.append(prim("uv_sphere", "pendantgem", "red", (0, -0.138, 1.375), (0.011, 0.006, 0.013), segments=8, ring_count=6))
both(lambda sx: prim("torus", "armlet", "gold", (sx * AX, 0, 1.2), (1, 1.05, 2.6), major_radius=0.077, minor_radius=0.011, major_segments=20, minor_segments=6))
both(lambda sx: prim("uv_sphere", "armletgem", "red", (sx * (AX + 0.02), -0.085, 1.2), (0.016, 0.008, 0.02), segments=8, ring_count=6))
both(lambda sx: prim("torus", "wrist", "gold", (sx * AX, 0, 0.875), (1, 1.1, 3.2), major_radius=0.041, minor_radius=0.009, major_segments=16, minor_segments=6))
both(lambda sx: prim("uv_sphere", "earring", "gold", (sx * 0.104, 0.0, HZ - 0.062), (0.014, 0.014, 0.018), segments=8, ring_count=6))
parts.append(prim("cylinder", "clasp", "gold", (0, -0.128, 0.995), (0.03, 0.03, 0.008), (math.pi / 2, 0, 0), vertices=12))
# ---- What changes with the years and the acts: each is a part the game shows or leaves out ---------------------
def shell(name, role, keep, off, src=None):   # a garment taken from the body's own surface and stood off it; it keeps the body's weights
    src = src or B; o = src.copy(); o.data = src.data.copy(); S.collection.objects.link(o); o.name = name
    bm = bmesh.new(); bm.from_mesh(o.data); dl = bm.verts.layers.deform.active; ai = {i for i, g in enumerate(src.vertex_groups) if g.name[0] in "aew"}
    armw = lambda v: sum(w for i, w in v[dl].items() if i in ai)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co) or armw(v) > 0.3], context="VERTS")
    for v in bm.verts: v.co += v.normal * off
    bm.to_mesh(o.data); bm.free(); o.data.materials.clear(); o.data.materials.append(M[role]); parts.append(o); return o
trunk = lambda c: not (c.z > 1.4 and abs(c.x) < 0.085)
def band(c, w):   # a strip from the left shoulder down to the right hip, front and back
    ux, uz = -0.3, -0.44; l = math.hypot(ux, uz); d = abs((c.x - 0.14) * uz - (c.z - 1.44) * ux) / l; return d < w and 0.99 < c.z < 1.47 and trunk(c)
dh = shell("dhoti", "cloth", lambda c: 0.235 < c.z < 1.0, 0.012)
for v in dh.data.vertices:   # it hangs looser the lower it goes, and falls in folds
    a = math.atan2(v.co.y, v.co.x - (HPX if v.co.x > 0 else -HPX)); t = max(0, min(1, (0.9 - v.co.z) / 0.6)); d = Vector((math.cos(a), math.sin(a), 0))
    v.co += d * (t * 0.022 + t * 0.011 * math.sin(a * 7 + v.co.z * 9))
shell("cuirass", "armour", lambda c: 1.03 < c.z < 1.44 and trunk(c), 0.013)
parts.append(prim("torus", "cuirassbelt", "gold", (0, 0.0, 1.04), (1, 0.8, 1), major_radius=0.145, minor_radius=0.02, major_segments=28, minor_segments=8))
both(lambda sx: prim("uv_sphere", "pauldron", "armour", (sx * (SHX + 0.02), 0, 1.395), (0.105, 0.105, 0.09), segments=14, ring_count=8))
shell("hide", "hide", lambda c: band(c, 0.085), 0.017)
shell("uttariya", "red", lambda c: band(c, 0.03), 0.014)
shell("uttariyalean", "cloth", lambda c: band(c, 0.06), 0.013, BL)

# A prince's crown: a gold band, a tall plate in front with a red stone, points round it
parts.append(prim("torus", "crown", "gold", (0, 0.012, HZ + 0.072), (1, 1.14, 2.4), (0.12, 0, 0), major_radius=0.103, minor_radius=0.009, major_segments=28, minor_segments=8))
for k in range(7):
    a = (k - 3) * 0.3; parts.append(prim("uv_sphere", "crowngem", "red", (math.sin(a) * 0.105, 0.012 - math.cos(a) * 0.122, HZ + 0.062 + abs(k - 3) * 0.004), (0.009, 0.006, 0.011), segments=6, ring_count=6))
parts.append(prim("uv_sphere", "crownboss", "gold", (0, -0.112, HZ + 0.1), (0.022, 0.012, 0.028), segments=10, ring_count=6))
for k, (dx, hh, lean_) in enumerate(((0, 0.13, 0), (-0.035, 0.105, 0.35), (0.035, 0.105, -0.35))):   # the plumes: dark, each with a gold eye
    parts.append(prim("uv_sphere", "crownplume", "hair", (dx, -0.085, HZ + 0.12 + hh / 2), (0.022, 0.008, hh / 2), (-0.2, lean_, 0), segments=8, ring_count=8))
    parts.append(prim("uv_sphere", "crowneye", "gold", (dx - lean_ * 0.035, -0.097, HZ + 0.12 + hh * 0.78), (0.011, 0.005, 0.014), segments=8, ring_count=6))
# The matted hair of the forest years: a heavy coil on the crown, locks down the back and over the shoulders
parts.append(prim("torus", "jata", "hair", (0, 0.03, HZ + 0.13), (1, 1, 1.3), major_radius=0.05, minor_radius=0.03, major_segments=16, minor_segments=8))
parts.append(prim("torus", "jata", "hair", (0, 0.03, HZ + 0.175), (1, 1, 1.3), major_radius=0.034, minor_radius=0.026, major_segments=14, minor_segments=8))
parts.append(prim("uv_sphere", "jata", "hair", (0, 0.03, HZ + 0.215), (0.03, 0.03, 0.026), segments=10, ring_count=6))
for i, (x, y, l) in enumerate(((-0.07, 0.085, 0.3), (-0.035, 0.105, 0.34), (0, 0.11, 0.36), (0.035, 0.105, 0.34), (0.07, 0.085, 0.3), (0.1, 0.03, 0.22), (-0.1, 0.03, 0.22))):
    parts.append(prim("uv_sphere", "jata", "hair", (x, y + 0.02, HZ - 0.02 - l / 2), (0.017, 0.017, l / 2), segments=8, ring_count=8))
# A beard for the forest years, to go with it
parts.append(prim("uv_sphere", "beard", "hair", (0, -0.075, HZ - 0.125), (0.062, 0.05, 0.05), segments=14, ring_count=8))

PART = { "eye": "face", "iris": "face", "lid": "face", "browhair": "face", "lip": "face", "stache": "stache", "stache2": "stache", "haircap": "hair", "backhair": "hair",
  "knot": "knot", "knotband": "knot", "dhoti": "dhoti", "hem": "dhoti", "pleats": "dhoti", "pleatend": "dhoti", "sash": "sash", "knotsash": "sash", "sashend": "sash", "clasp": "sash",
  "necklace": "gold", "pendant": "gold", "pendantgem": "gold", "earring": "gold", "armlet": "bands", "armletgem": "bands", "wrist": "bands", "locks": "locks", "cuirass": "cuirass", "cuirassbelt": "cuirass", "pauldron": "cuirass",
  "hide": "hide", "uttariya": "uttariya", "uttariyaend": "uttariya", "uttariyalean": "uttariyalean", "jata": "jata", "beard": "beard" }
def part_of(o):
    n = o.name.split(".")[0]; return "crown" if n.startswith("crown") else PART.get(n, n)
def bone_for(o):
    n = o.name.split(".")[0]; x = sum((o.matrix_world @ v.co).x for v in o.data.vertices) / max(1, len(o.data.vertices)); sd = "L" if x > 0 else "R"
    if n in ("eye", "iris", "lid", "browhair", "lip", "stache", "stache2", "haircap", "knot", "knotband", "backhair", "earring", "jata", "beard") or n.startswith("crown"): return "H"
    if n in ("necklace", "pendant", "pendantgem", "cuirassbelt", "uttariyaend"): return "T"
    if n == "locks": return "H"
    if n == "armletgem": return "a" + sd
    if n == "pauldron": return "a" + sd
    if n == "armlet": return "a" + sd
    if n == "wrist": return "e" + sd
    if n == "anklet": return "k" + sd
    if n == "hem": return "k" + sd
    return "P"
for o in parts:
    if o.vertex_groups: continue          # (it kept the body's own weights when it was taken from the body)
    rigid(o, bone_for(o))
print("parts", len(parts))

# ---- A look at it
def look(name, loc, at, lens=60):
    cam = bpy.data.cameras.new(name); cam.lens = lens; co = bpy.data.objects.new(name, cam); S.collection.objects.link(co); co.location = loc
    d = Vector(at) - Vector(loc); co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); return co
def lights():
    for n, loc, e, sz in (("key", (2.2, -3.2, 3.2), 550, 2.5), ("fill", (-3, -2, 1.6), 160, 4), ("rim", (0.5, 3.2, 2.6), 380, 2)):
        l = bpy.data.lights.new(n, "AREA"); l.energy = e; l.size = sz; o = bpy.data.objects.new(n, l); S.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector((0, 0, 1.1)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    w = bpy.data.worlds.new("w"); S.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.16, 0.15, 0.15, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0)); g = bpy.context.object; g.data.materials.append(mat("floor", (0.12, 0.1, 0.09), 0.9))
def render(tag, shots, res=(560, 800), samples=24):
    S.render.engine = "CYCLES"; S.cycles.samples = samples; S.cycles.use_denoising = True; S.cycles.device = "CPU"
    S.render.resolution_x, S.render.resolution_y = res; S.render.film_transparent = False
    for n, loc, at, lens in shots:
        S.camera = look(n, loc, at, lens); S.render.filepath = f"{OUT}/{tag}_{n}.png"; bpy.ops.render.render(write_still=True)
if STAGE in ("body", "dress"):
    LOOK = argv[2] if len(argv) > 2 else "prince"
    SHOW = { "prince": {"face", "stache", "hair", "locks", "dhoti", "sash", "gold", "bands", "crown", "uttariya"}, "exile": {"face", "stache", "hair", "dhoti", "jata", "beard", "hide"},
             "war": {"face", "stache", "hair", "locks", "dhoti", "sash", "gold", "bands", "crown", "cuirass"}, "youth": {"face", "hair", "knot", "dhoti", "sash", "gold", "uttariyalean"}, "anatomy": {"face", "stache", "hair", "knot", "dhoti"} }[LOOK]
    for o in parts: o.hide_render = part_of(o) not in SHOW
    B.hide_render = LOOK == "youth"; BL.hide_render = LOOK != "youth"
    lights(); render(LOOK, [("front", (0, -5.2, 1.05), (0, 0, 0.95), 70), ("three", (2.6, -4.4, 1.5), (0, 0, 0.95), 70), ("face", (0.3, -1.7, 1.7), (0, 0, 1.66), 70), ("back", (-2.2, 4.6, 1.5), (0, 0, 0.95), 70)] if LOOK == "prince" else [("front", (0, -5.2, 1.05), (0, 0, 0.95), 70), ("side", (5.2, 0, 1.05), (0, 0, 0.95), 70), ("back", (0, 5.2, 1.05), (0, 0, 0.95), 70), ("three", (2.6, -4.4, 1.5), (0, 0, 0.95), 70), ("torso", (0.9, -2.5, 1.35), (0, 0, 1.2), 70)] if LOOK == "anatomy" else [("three", (2.6, -4.4, 1.5), (0, 0, 0.95), 70)])

if STAGE == "export":
    import json, base64, struct
    for o in (B, BL, Hd): o["part"] = {"body": "body", "bodylean": "bodylean", "head": "head"}[o.name]
    for o in HANDS: o["part"] = "hands"
    for o in parts: o["part"] = part_of(o)
    objs = sorted([B, BL, Hd] + HANDS + parts, key=lambda o: o["part"]); P_, N_, C_, J_, W_, I_ = [], [], [], [], [], []; roles = []; cols = []; base = 0; ranges = {}
    for o in objs:
        me = o.data; me.calc_loop_triangles(); mt = o.data.materials[0]; names = [g.name for g in o.vertex_groups]
        if mt.name not in roles:
            roles.append(mt.name); c = mt.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value; cols.append([round(255 * (x ** (1 / 2.2))) for x in c[:3]])
        ci = roles.index(mt.name); i0 = len(I_)
        for v in me.vertices:
            x, y, z = o.matrix_world @ v.co; nx, ny, nz = (o.matrix_world.to_3x3() @ v.normal).normalized()   # (where it stands in the world, not in its own frame)
            P_ += [x, z, -y]; N_ += [nx, nz, -ny]; C_.append(ci)          # Blender (x, y, z) -> the game's (x, up, front)
            ws = sorted(((g.weight, JOINTS.index(names[g.group])) for g in v.groups if names[g.group] in JOINTS and g.weight > 0.01), reverse=True)[:2]
            if not ws: ws = [(1.0, 0)]
            if len(ws) == 1: ws.append((0.0, ws[0][1]))
            t = ws[0][0] + ws[1][0]; J_ += [ws[0][1], ws[1][1]]; W_.append(round(255 * ws[0][0] / t))
        for t in me.loop_triangles: I_ += [base + t.vertices[0], base + t.vertices[1], base + t.vertices[2]]
        base += len(me.vertices); r = ranges.setdefault(o["part"], [i0, 0]); r[1] = len(I_) - r[0]
    n = base; assert n < 65536, n
    b64 = lambda fmt, a: base64.b64encode(struct.pack("<%d%s" % (len(a), fmt), *a)).decode()
    data = { "n": n, "joints": JOINTS, "scale": 8192, "roles": roles, "cols": cols, "parts": ranges,
             "pos": b64("h", [max(-32767, min(32767, round(v * 8192))) for v in P_]), "nor": b64("b", [max(-127, min(127, round(v * 127))) for v in N_]),
             "col": b64("B", C_), "jnt": b64("B", J_), "wgt": b64("B", W_), "idx": b64("H", I_) }
    open(OUT + "/hero.js", "w").write("/* A hero's body, face, hair, cloth, gold and armour, modelled in Blender by tools/blender/bhima.py (see tools/blender/README.md). Do not edit by hand. */\n(function (K) { const G = (K.G3 = K.G3 || {}); (G.MODELS = G.MODELS || {}).hero = " + json.dumps(data, separators=(",", ":")) + "; })(window.K = window.K || {});\n")
    print("exported verts", n, "tris", len(I_) // 3, "roles", roles, "parts", {k: v[1] // 3 for k, v in ranges.items()})
