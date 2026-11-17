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
def mixc(a, b, k): return sum(round(((a >> s_) & 255) * (1 - k) + ((b >> s_) & 255) * k) << s_ for s_ in (16, 8, 0))
ROLE0 = { "mouth": 0x2a0c08, "skin": H["skin"], "cloth": 0xf2ecdc, "red": 0xb0402a, "cloth2": 0xf2ecdc, "band": 0xa8452f, "hem": 0xb0402a, "gold": 0xd9a53a, "hair": H["hair"], "white": 0xe8e4d8, "iris": 0x4a2c14, "hide": 0xc79a5a,
          "armour": 0x6a6258, "iron": 0x77736c, "leather": 0x5a3a22, "lip": mixc(mixc(H["skin"], 0x000000, 0.22), 0x8c332b, 0.42 if not SHE else 0.56), "pupil": 0x0b0807, "lash": 0x17110d, "sclera": 0xd8d2c6, "gem": 0xb0202a, "beads": 0x5a2e1a, "stubble": 0, "mark": 0xb3241c }
M = { k: mat(k, lin(hexc(v)), 0.35 if k in ("gold", "armour", "iron") else 0.7, 1.0 if k == "gold" else 0.0) for k, v in ROLE0.items() }
_sk = H.get("stubblek", 0.38)   # (how dark a day's growth is: the sheets draw Arjuna's light)
M["stubble"] = mat("stubble", tuple(a * (1 - _sk) + b * _sk for a, b in zip(lin(hexc(H["skin"])), lin(hexc(H["hair"])))), 0.7)
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
def sm(a, b, x): k = max(0.0, min(1.0, (x - a) / (b - a))); return k * k * (3 - 2 * k)

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
  ((0.075, -0.088, 1.428), (0.06, 0.014, 0.012), 1.45),     # collar bones (a soft ridge; on a slight frame they lie back with the chest: see frame)
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
HAFT = 0.024   # the hollow of the closed hand: a haft of this radius lies in it (hands are grown by HANDK afterwards)
def grip_at(sx): return (sx * (AX + 0.016) - sx * (0.002 + HAFT + 0.0100), -0.002, 0.706)
def hand(sx):
    # A hand closed round a haft, as a fist on a mace or a sword's grip: the haft runs front to back under the palm's
    # lower edge; each finger goes down its outer side, under it and up the inner side, three joints laid on a circle
    # about the haft's line; the thumb closes over the top from the front.
    px = sx * (AX + 0.016)                                   # the palm stands a little out, so what is held lies against it
    cx, _, cz = grip_at(sx); R = HAFT + 0.0100
    balls = [((px, -0.004, 0.778), (0.016, 0.042, 0.046)),                              # palm
             ((px - sx * 0.002, -0.004, 0.815), (0.02, 0.034, 0.03)),                   # heel of the hand, into the wrist
             ((px - sx * 0.018, -0.046, 0.795), (0.012, 0.014, 0.026), 1.8, rot(0.5, 0, 0)),   # thumb, base
             ((px - sx * 0.027, -0.049, 0.777), (0.0105, 0.012, 0.016), 1.8, rot(0.3, sx * 0.35, 0)),  # (its knuckle: the end no longer parts from the base on the broadest hands)
             ((px - sx * 0.036, -0.052, 0.757), (0.0105, 0.012, 0.021), 1.8, rot(0.15, sx * 0.7, 0))]  # thumb, end, closing over the haft
    for i, fy in enumerate((-0.034, -0.012, 0.01, 0.031)):       # four fingers
        k = (0.95, 1.0, 0.95, 0.84)[i]; up = (1 - k) * 0.03
        balls.append(((px - sx * 0.002, fy, cz + 0.008 + up * 0.3), (0.0105, 0.0116, 0.026), 1.8))                # first joint, down from the knuckle (broad enough to lie against its neighbours: no daylight between the fingers)
        for ph, half, th in ((-64 - 0 * k, 0.021 * k, 0.0098), (-64 - 35.4 * k - 28.6 * k * 0.95, 0.017 * k, 0.009)):   # second, turning under; the tip, coming back up
            a = math.radians(ph)
            balls.append(((cx + sx * R * math.cos(a), fy, cz + R * math.sin(a)), (th, th + 0.0016, half), 1.8, rot(0, -sx * a, 0)))
    # (where one joint of a finger ends and the next begins each tapers, and four in a row left a line of small windows
    # through the closed hand: a thin bar lies across the fingers inside each crease, and at the knuckles)
    balls.append(((px - sx * 0.0035, -0.002, cz + 0.03), (0.0068, 0.036, 0.0068), 1.8))
    for ph in (-27, -99): a = math.radians(ph); balls.append(((cx + sx * (R - 0.002) * math.cos(a), -0.002, cz + (R - 0.002) * math.sin(a)), (0.0068, 0.036, 0.0068), 1.8))   # (toward the hollow of the hand: the creases still show outside)
    return balls
def lean(balls, k=0.86):   # a youth's build: the same frame with less on it; nothing is moved, and none of the cut lines
    return [((b[0]), (b[1][0] * k, b[1][1] * k, b[1][2])) + tuple(b[2:]) for b in balls if not (len(b) > 4 and b[4])]
# The trunk and the arms are shaped apart (an arm hangs against the flank, and clay that close would run together all the
# way down), and then made one skin at the shoulder, as a body is: the arm's length is swung out from under the armpit, the
# two solids are joined where they still meet (the shoulder and the armpit's top, nowhere else), the arm is hung back
# where it was, and the line where the two skins met is worked smooth. One skin there means no line to see, no notch
# between the shoulder and the neck, and joints' shares that run on from the chest into the arm with no break.
JZ = 1.41   # the shoulder joint's height
def fuse_shoulders(Bt, Ba, swing=math.radians(24), z0=1.15, z1=1.255, R=0.034, passes=12):
    from mathutils.kdtree import KDTree
    orig = [v.co.copy() for v in Ba.data.vertices]
    for v in Ba.data.vertices:
        k = 1 - sm(z0, z1, v.co.z)
        if k <= 0: continue
        sx = 1 if v.co.x > 0 else -1; an = sx * swing * k; c, s_ = math.cos(an), math.sin(an); dx, dz = v.co.x - sx * SHX, v.co.z - JZ
        v.co.x = sx * SHX + dx * c - dz * s_; v.co.z = JZ + dx * s_ + dz * c
    Ba.data.update()
    kt = KDTree(len(Bt.data.vertices)); ka = KDTree(len(Ba.data.vertices))
    for i, v in enumerate(Bt.data.vertices): kt.insert(v.co, i)
    for i, v in enumerate(Ba.data.vertices): ka.insert(v.co, i)
    kt.balance(); ka.balance()
    md = Bt.modifiers.new("fuse", "BOOLEAN"); md.operation = "UNION"; md.object = Ba; md.solver = "EXACT"
    bpy.ops.object.select_all(action="DESELECT"); bpy.context.view_layer.objects.active = Bt; Bt.select_set(True); bpy.ops.object.modifier_apply(modifier="fuse"); Bt.select_set(False)
    bpy.data.objects.remove(Ba, do_unlink=True)
    bm = bmesh.new(); bm.from_mesh(Bt.data); seam = []
    for v in bm.verts:
        _, i, d = ka.find(v.co)
        if d < 2e-5: v.co = orig[i]; continue
        _, i, d = kt.find(v.co)
        if d >= 2e-5: seam.append(v.co.copy())
    if not seam: print("FUSE: the arms do not meet the trunk"); bm.free(); return Bt
    ks = KDTree(len(seam))
    for i, c in enumerate(seam): ks.insert(c, i)
    ks.balance()
    dist = lambda v: ks.find(v.co)[2]
    # the join leaves splinters along the line: the faces round it are cut to triangles and points a hair apart become one
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if any(dist(v) < R for v in f.verts)])
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if dist(v) < R], dist=0.0016)   # (a hair: wider, and the two sides of a crease were pinched together along an edge)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges[:], dist=1e-5)
    for _ in range(4):   # (points made one can leave a fin: a face standing on the skin by one edge, its other edges in the air. A closed skin has none: they are cut off, and any hole is closed)
        fins = [f for f in bm.faces if any(len(e.link_faces) == 1 for e in f.edges) and any(len(e.link_faces) > 2 for e in f.edges)]
        if not fins: break
        bmesh.ops.delete(bm, geom=fins, context="FACES")
    rim = [e for e in bm.edges if len(e.link_faces) == 1]
    if rim: bmesh.ops.holes_fill(bm, edges=rim, sides=12); bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    band = [(v, 1 - sm(R * 0.45, R, dist(v))) for v in bm.verts if dist(v) < R]
    for _ in range(passes):   # each point of the band moves toward the middle of its neighbours: the crease fills, the lip sinks, and it is one slope
        new = []
        for v, w in band:
            nb = [e.other_vert(v).co for e in v.link_edges]
            if nb: new.append((v, v.co.lerp(sum(nb, Vector()) / len(nb), 0.5 * w)))
        for v, c in new: v.co = c
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    zs = [c.z for c in seam]; bm.to_mesh(Bt.data); bm.free(); Bt.data.materials.clear(); Bt.data.update()   # (the join leaves an empty material slot)
    print("FUSE seam points", len(seam), "between", round(min(zs), 3), "and", round(max(zs), 3), "band", len(band))
    return Bt
def pieces(o, say=False):   # how many separate skins a mesh is made of
    seen = set(); n = 0; adj = {}
    for e in o.data.edges: a_, b_ = e.vertices; adj.setdefault(a_, []).append(b_); adj.setdefault(b_, []).append(a_)
    for v in range(len(o.data.vertices)):
        if v in seen: continue
        n += 1; st = [v]; seen.add(v); mine = [v]
        while st:
            for u in adj.get(st.pop(), []):
                if u not in seen: seen.add(u); st.append(u); mine.append(u)
        if say:
            cs = [o.data.vertices[i].co for i in mine]; print("   piece of", len(mine), "points: x", round(min(c.x for c in cs), 3), round(max(c.x for c in cs), 3), "y", round(min(c.y for c in cs), 3), round(max(c.y for c in cs), 3), "z", round(min(c.z for c in cs), 3), round(max(c.z for c in cs), 3))
    return n
def specks(o, least=200):   # crumbs of clay that hang in the air, joined to nothing (a neck's cords on a neck too thin for them): taken away
    bm = bmesh.new(); bm.from_mesh(o.data); seen = set(); gone = []
    for v in bm.verts:
        if v in seen: continue
        st = [v]; seen.add(v); mine = [v]
        while st:
            cur = st.pop()
            for e in cur.link_edges:
                u = e.other_vert(cur)
                if u not in seen: seen.add(u); st.append(u); mine.append(u)
        if len(mine) < least: gone += mine
    if gone: bmesh.ops.delete(bm, geom=gone, context="VERTS"); bm.to_mesh(o.data); o.data.update()
    bm.free(); return len(gone)
def mk_body(name, t, a):
    Bt = metaballs(name + "t", t, 0.0125, 0.62); Ba = metaballs(name + "a", a, 0.0115, 0.62)
    if not os.environ.get("CAST_NOFUSE"):
        n_ = specks(Bt)
        if n_: print("FUSE crumbs taken from the trunk:", n_, "points")
    if os.environ.get("CAST_NOFUSE"):
        bpy.ops.object.select_all(action="DESELECT"); Bt.select_set(True); Ba.select_set(True); bpy.context.view_layer.objects.active = Bt; bpy.ops.object.join(); o = bpy.context.object; o.name = name; o.select_set(False); return o
    print("FUSE before: trunk in", pieces(Bt, bool(os.environ.get("CAST_SAY"))), "arms in", pieces(Ba, bool(os.environ.get("CAST_SAY"))))
    o = fuse_shoulders(Bt, Ba); o.name = name; print("FUSE body in", pieces(o, bool(os.environ.get("CAST_SAY"))), "piece(s)"); return o
def frame(balls):   # Bhima's own lists, refitted to this hero's frame and build
    out = []
    for b in balls:
        (x, y, z), (sx, sy, sz) = b[0], b[1]; ax = abs(x); sg = 1 if x >= 0 else -1
        if z < 0.88 and ax > 0.03: k = H["leg"]; nb = ((x, y, z), (sx * k, sy * k, sz))                                 # legs: placed by the hip joint already
        elif ax >= SHX - 0.02: k = H["arm"] * H.get("delt", 0.86); nb = ((x, y, z), (sx * k, sy * k, sz))                                      # shoulders: placed by the shoulder joint
        else:
            SH = H["shape"]; st = b[2] if len(b) > 2 else 2.0
            m = SH.get("hip", 1.0) if (0.86 < z < 0.96) else SH["waist"] if (0.95 < z < 1.19 and ax < 0.15 and y < 0.04) else SH["chest"] if (y < -0.055 and 1.25 < z < 1.4 and st == 1.5) else SH["neck"] if (ax < 0.05 and z > 1.49) else SH["trap"] if (z > 1.41 and y > 0.02 and ax > 0.05) else SH["lat"] if (y > 0.02 and 1.15 < z < 1.3 and ax > 0.12) else 1.0
            w = GI * m; nb = ((x * FX, y * (0.5 + 0.5 * w), z), (sx * FX * w, sy * w, sz))
            if st == 1.45 and 1.42 < z < 1.44: nb = ((x * FX, y * (0.5 + 0.5 * w) * (0.74 + 0.26 * min(1.0, H["mu"])), z), nb[1])   # the collar bone: no prouder than the chest under it
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
    torso += sym([((0.14, 0.02, 0.93), (0.092, 0.105, 0.1), 1.7), ((0.085, 0.09, 0.9), (0.095, 0.09, 0.1), 1.7)])   # (wider: her hips were 0.81 of a measured woman's)
if H.get("belly"): torso += [((0, -0.07, 1.06), (0.13 * H["belly"], 0.1 * H["belly"], 0.11), 1.7)]
# The shoulder girdle. The collar bone, the shoulder blade and the point of the shoulder are bone: they span from the neck
# to the joint however little muscle a frame carries. The clay above is all muscle, and on a slight frame (a woman, a
# child, an old man) it shrank until the chest and the back no longer reached the shoulder, which then hung in the air
# beside the body. So a slight frame is given the bone: a shelf from the root of the neck to the joint, and the two
# folds that close the armpit in front and behind. A heavy frame has all this inside its muscle already, and gets none.
FAK = H["arm"] ** 0.5   # (the forearm thins less than the upper arm on a slight frame: it was half a soldier's on women and children)
UPK = H.get("upper", 0.74)   # (the upper arm against the forearm: it was a strongman's on everyone, 1.6 times a soldier's girth)
QG = 1 - sm(0.70, 0.90, H["arm"]); GK = 0.55 + 0.45 * QG
girdle = [] if QG < 0.05 else sym([
  ((0.60 * SHX, 0.012, 1.412), (0.45 * SHX, (0.030 + 0.022 * GI) * GK, (0.024 + 0.010 * GI) * GK)),    # the shelf: collar bone in front, the blade's ridge behind, the shoulder's point at its end
  ((0.76 * SHX, -0.030, 1.345), (0.26 * SHX, 0.026 * GK, 0.050 * GK)),                                 # the armpit's front fold: the breast muscle's cord to the arm
  ((0.76 * SHX, 0.040, 1.335), (0.26 * SHX, 0.028 * GK, 0.060 * GK)),                                  # and its back fold
])
B = mk_body("body", frame(torso + (ABS if (H["abs"] and MU >= 0.7) else [])) + girdle, [(b[0], (b[1][0] * (H["arm"] * UPK if b[0][2] > 1.12 else FAK), b[1][1] * (H["arm"] * UPK if b[0][2] > 1.12 else FAK), b[1][2])) + tuple(b[2:]) for b in arms])
MPFB = None if os.environ.get("CAST_CLAY") else H.get("mpfb")   # (CAST_CLAY=1: the clay body, to compare)
if MPFB and not MPFB.get("full"):   # a sculpted body (MakeHuman's, CC0: mpfb_body.py) in place of the clay one, refitted to this figure's joints
    import mpfb_body
    _J = dict(shoulder=(SHX, 1.41), elbow=(SHX + 0.008, 1.12), wrist=(SHX + 0.008, 0.82), hip=(HPX + 0.008, 0.92), knee=(HPX + 0.006, 0.47),
              ankle=(HPX + 0.006, 0.085), toe=(HPX + 0.012, -0.15, 0.02), head=1.47, neck_top=MPFB.get("neck_top", 1.63), neck_tuck=MPFB.get("neck_tuck", (1.55, 1.66)), neck_y=MPFB.get("neck_y", 0.0), girth=MPFB.get("girth", 1.0))
    _pts, _fs, _ws = mpfb_body.build(MPFB, _J)
    _me = bpy.data.meshes.new("body"); _me.from_pydata([tuple(p) for p in _pts], [], _fs); _me.update()
    _bm = bmesh.new(); _bm.from_mesh(_me); _rim = [e for e in _bm.edges if e.is_boundary]
    if _rim: bmesh.ops.holes_fill(_bm, edges=_rim, sides=64); bmesh.ops.triangulate(_bm, faces=[f for f in _bm.faces if len(f.verts) > 4])
    bmesh.ops.recalc_face_normals(_bm, faces=_bm.faces[:]); _bm.to_mesh(_me); _bm.free()
    _old = B; B = bpy.data.objects.new("body", _me); S.collection.objects.link(B); bpy.data.objects.remove(_old)
    for _i, _w in enumerate(_ws):   # (the points the closing of the cuts added have none: they go to the nearest bone, below)
        for _j, _v in _w.items():
            if _v > 0.003: (B.vertex_groups.get(_j) or B.vertex_groups.new(name=_j)).add([_i], _v, "REPLACE")
    print("MPFB body", len(_me.vertices), "points", len(_me.polygons), "faces, cuts closed:", len(_rim), "edges")
HANDS = [metaballs("handL", hand(1), 0.0055, 0.62), metaballs("handR", hand(-1), 0.0055, 0.62)]
for o_ in HANDS:   # (a closed hand is all creases: every face is turned outward again, so none is lit from the wrong side; found by the mesh check)
    bm_ = bmesh.new(); bm_.from_mesh(o_.data); bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces[:]); bm_.to_mesh(o_.data); bm_.free()
# Hands a little larger than life, as game figures have them: they are what holds the weapon, and they must read from
# across a field. Grown about the wrist. GRIP is the hollow of each closed hand, where a haft lies (the game sets the
# weapon there: js/g3/figure.js).
HANDK = 1.14
RIG = {}        # joints beyond the thirteen the poses turn: name -> (parent, where it is) or (parent, the joint whose place it shares)
def fing(sx, deg): cx, _, cz = grip_at(sx); R = HAFT + 0.0100; a = math.radians(deg); return (cx + sx * R * math.cos(a), -0.002, cz + R * math.sin(a))
for o_, sx_, sd_ in zip(HANDS, (1, -1), "LR"):
    # The fingers open: two joints across the four of them (g at the knuckles, h at the second joint), the thumb stays.
    cx_, _, cz_ = grip_at(sx_); gw, gg, gh = (o_.vertex_groups.new(name=n + sd_) for n in "wgh")
    for v in o_.data.vertices:
        u = sx_ * (v.co.x - cx_); a = math.degrees(math.atan2(v.co.z - cz_, u)); along = -a if a <= 60 else 360 - a      # how far round the haft, from the knuckle
        if (v.co.y < -0.041 and v.co.z > cz_ + 0.028) or v.co.z > cz_ + 0.046: kn = 0.0                                  # the thumb, the palm
        else: kn = sm(cz_ + 0.046, cz_ + 0.024, v.co.z) if (u > 0 and along < 20) else 1.0
        sec = sm(22, 44, along) * kn
        for g_, w_v in ((gw, 1 - kn), (gg, kn - sec), (gh, sec)):
            if w_v > 0.01: g_.add([v.index], w_v, "REPLACE")
    w_ = Vector((sx_ * (SHX + 0.008), 0, 0.82))
    for v in o_.data.vertices: v.co = w_ + (v.co - w_) * HANDK
    RIG["g" + sd_] = ("w" + sd_, tuple(w_ + (Vector((sx_ * (AX + 0.016) - sx_ * 0.002, -0.002, cz_ + 0.036)) - w_) * HANDK))
    RIG["h" + sd_] = ("g" + sd_, tuple(w_ + (Vector(fing(sx_, -32)) - w_) * HANDK))
GRIP = [tuple(Vector((sx_ * (SHX + 0.008), 0, 0.82)) + (Vector(grip_at(sx_)) - Vector((sx_ * (SHX + 0.008), 0, 0.82))) * HANDK) for sx_ in (1, -1)]
# ---- The head: a human head, from the anatomy of the face (face.py). Built at the head joint (z 1.47) with the eyes' line about 0.18 above it.
HZ = 1.47 + 0.19
import face as FACEM
FC = FACEM.Face(F, she=SHE)
def mesh_obj(name, m, role):   # a mesh from face.py (heights from the head's centre line), with its points' shares of the joints
    me = bpy.data.meshes.new(name); me.from_pydata([(x, y, z + HZ) for x, y, z in m.v], [], [list(f) for f in m.f]); me.update()
    o = bpy.data.objects.new(name, me); S.collection.objects.link(o); me.materials.append(M[role])
    for p_ in me.polygons: p_.use_smooth = True
    for i_, w_ in enumerate(m.wt):
        for g_, val_ in (w_ or {"H": 1.0}).items(): (o.vertex_groups.get(g_) or o.vertex_groups.new(name=g_)).add([i_], val_, "REPLACE")
    return o
HEADM = FACEM.build_head(FC); EARS, LOBE = FACEM.build_ears(FC)
Hd = mesh_obj("head", FACEM.join(HEADM["head"], EARS), "skin")
MHI = None
if MPFB and MPFB.get("full"):   # the whole person, MakeHuman's (mpfb_body.build_full): its own head, face and hands in place of the game's
    import mpfb_body
    _J = dict(shoulder=(SHX, 1.41), elbow=(SHX + 0.008, 1.12), wrist=(SHX + 0.008, 0.82), hip=(HPX + 0.008, 0.92), knee=(HPX + 0.006, 0.47),
              ankle=(HPX + 0.006, 0.085), toe=(HPX + 0.012, -0.15, 0.02), girth=MPFB.get("girth", 1.0), hand=MPFB.get("hand", 1.08),
              eye_c=(FC.cx, -FC.fe, HZ + FC.ze), neck_lift=MPFB.get("neck", 0.035), crown=max(v.co.z for v in Hd.data.vertices) + MPFB.get("crown_dz", 0.0))
    MHI = mpfb_body.build_full(MPFB, _J)
    _HS = mpfb_body.HEADSEG
    def _outward(bm_):   # turn a skin outward if it came out turned in (asked of each face: does it look away from the bone it lies round?)
        out_ = 0
        for f_ in bm_.faces:
            c_ = f_.calc_center_median(); out_ += 1 if f_.normal.dot(c_ - MHI["axis"](c_)) > 0 else -1
        if out_ < 0: bmesh.ops.reverse_faces(bm_, faces=bm_.faces[:]); bm_.normal_update()
        return out_
    def _piece(name, keep):   # a mesh of the faces chosen, with their points' shares of the joints
        ids = sorted({i for fc in keep for i in fc}); rm = {i: k for k, i in enumerate(ids)}
        me = bpy.data.meshes.new(name); me.from_pydata([tuple(MHI["pts"][i]) for i in ids], [], [[rm[i] for i in fc] for fc in keep]); me.update()
        bm_ = bmesh.new(); bm_.from_mesh(me); bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces[:]); bm_.normal_update()
        # (outward, as the garments taken from it expect. A piece open at the neck or the wrists can come out turned in:
        #  each face is asked whether it looks away from the limb's or the trunk's middle line it lies around.)
        _outward(bm_); bm_.to_mesh(me); bm_.free(); me.update()
        o = bpy.data.objects.new(name, me); S.collection.objects.link(o); me.materials.append(M["skin"])
        for p_ in me.polygons: p_.use_smooth = True
        for i in ids:
            for j_, v_ in MHI["w"][i].items():
                if v_ > 0.003: (o.vertex_groups.get(j_) or o.vertex_groups.new(name=j_)).add([rm[i]], v_, "REPLACE")
        o["src_ids"] = ids; return o
    def _kind(fc):
        ds = [MHI["seg"][i] for i in fc]
        if sum(d in _HS for d in ds) * 2 > len(ds): return "head"
        hl = [d for d in ds if d[0] == "F" or d[0] == "w"]
        if len(hl) * 2 > len(ds): return "hand" + hl[0][-1]
        return "body"
    _sets = {}
    for fc in MHI["faces"]: _sets.setdefault(_kind(fc), []).append(fc)
    for _o in [B, Hd] + HANDS: bpy.data.objects.remove(_o)
    B = _piece("body", _sets["body"]); Hd = _piece("head", _sets["head"]); HANDS = [_piece("handL", _sets["handL"]), _piece("handR", _sets["handR"])]
    GRIP = [tuple(MHI["grip"]["L"]), tuple(MHI["grip"]["R"])]
    for sd_ in "LR": RIG["g" + sd_] = ("w" + sd_, tuple(MHI["g"][sd_])); RIG["h" + sd_] = ("g" + sd_, tuple(MHI["h"][sd_]))
    print("MPFB whole: body", len(B.data.vertices), "head", len(Hd.data.vertices), "hands", len(HANDS[0].data.vertices), "points")
for o in [B] + HANDS:
    o.data.materials.append(M["skin"])
    if MPFB and (o is B or MPFB.get("full")):
        for p in o.data.polygons: p.use_smooth = True
        continue
    m = o.modifiers.new("sm", "SMOOTH"); m.iterations = 2; m.factor = 0.5
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="sm")
    for p in o.data.polygons: p.use_smooth = True
print("body verts", len(B.data.vertices), "head verts", len(Hd.data.vertices))
def odd_edges(o, say=""):   # edges of a closed skin that are not shared by exactly two faces: a pinch, a tear or a doubled face
    bm_ = bmesh.new(); bm_.from_mesh(o.data); bad = [e for e in bm_.edges if len(e.link_faces) != 2]
    if bad: print("ODD", say, len(bad), "edges not shared by two faces, at", [tuple(round(c, 3) for c in (e.verts[0].co + e.verts[1].co) / 2) for e in bad[:6]], [len(e.link_faces) for e in bad[:6]])
    bm_.free(); return len(bad)
odd_edges(B, "body before thinning:")

# ---- The skeleton: the game's own joints, by the game's own names, where the game has them -----------------------
JOINTS = ["P", "T", "H", "aL", "eL", "wL", "aR", "eR", "wR", "lL", "kL", "lR", "kR",        # the thirteen the poses turn
          "T1", "N", "cL", "cR", "uL", "uR", "xL", "xR", "vL", "vR", "yL", "yR",            # the waist and neck between; collars; and a joint that turns half as far at each shoulder, elbow, hip and knee, so a bend keeps its girth
          "fL", "fR", "gL", "hL", "gR", "hR", "J", "M", "E", "bL", "bR",                    # feet; fingers; jaw, mouth, eyelids, brows
          "sB", "sF", "sS", "sH", "sC"]                                                     # what hangs and swings: cloth down the back, pleats, sash ends, hair, cloth down the chest
RIG["T1"] = ("P", "T"); RIG["N"] = ("T", "H")
for sd_, sx_ in (("L", 1), ("R", -1)):
    RIG["c" + sd_] = ("T", (sx_ * 0.02, 0, 1.43)); RIG["u" + sd_] = ("c" + sd_, "a" + sd_); RIG["x" + sd_] = ("a" + sd_, "e" + sd_)
    RIG["v" + sd_] = ("P", "l" + sd_); RIG["y" + sd_] = ("l" + sd_, "k" + sd_); RIG["f" + sd_] = ("k" + sd_, (sx_ * (HPX + 0.006), 0, 0.085))
REPARENT = {"aL": "cL", "aR": "cR"}
# (blends of two joints that become the half-way joint between them, when the model is written out)
PAIRS = [("P", "T", "T1"), ("T", "H", "N")] + [q for sd_ in "LR" for q in (("c" + sd_, "a" + sd_, "u" + sd_), ("T", "a" + sd_, "u" + sd_), ("a" + sd_, "e" + sd_, "x" + sd_), ("P", "l" + sd_, "v" + sd_), ("l" + sd_, "k" + sd_, "y" + sd_))]
LOD = H.get("lod", 1.0)
# (A figure in a fight is seen from above at seventy to ninety pixels tall, and a field holds dozens of them with their
#  shadows: the meshes are a third of what they were. Smooth normals and the shaded hollows keep the forms.)
_HR = MPFB.get("hand_dec", 0.8) if (MPFB and MPFB.get("full")) else (0.2 if LOD >= 1 else 0.13)
for o, r in ((B, MPFB.get("dec", 0.6) if MPFB else 0.115 * LOD), (HANDS[0], _HR), (HANDS[1], _HR)) + (((Hd, MPFB.get("head_dec", 1.0)),) if MHI and MPFB.get("head_dec", 1.0) < 1 else ()):   # (the rank and file, lod 0.7, are lighter still: a field holds dozens)
    d = o.modifiers.new("dec", "DECIMATE"); d.ratio = r; bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="dec")
    for p in o.data.polygons: p.use_smooth = True
def no_fins(o):   # thinning a skin can leave a fin where two folds lay close (inside an armpit): cut off, and any hole closed
    bm_ = bmesh.new(); bm_.from_mesh(o.data); n_ = 0
    for _ in range(4):
        fins = [f for f in bm_.faces if any(len(e.link_faces) == 1 for e in f.edges) and any(len(e.link_faces) > 2 for e in f.edges)]
        if not fins: break
        n_ += len(fins); bmesh.ops.delete(bm_, geom=fins, context="FACES")
    rim = [e for e in bm_.edges if len(e.link_faces) == 1]
    if rim: bmesh.ops.holes_fill(bm_, edges=rim, sides=12); bmesh.ops.triangulate(bm_, faces=[f for f in bm_.faces if len(f.verts) > 4])
    if n_ or rim: bmesh.ops.recalc_face_normals(bm_, faces=bm_.faces[:]); bm_.to_mesh(o.data); o.data.update()
    bm_.free(); return n_
if not os.environ.get("CAST_NOFUSE"):
    nf_ = no_fins(B)
    if nf_:
        print("body: fins cut off after thinning:", nf_)
        nc_ = specks(B, 60)   # (a fin's root can be a bubble shut inside the skin: with the fin gone it hangs free, and goes too)
        if nc_: print("body: a bubble inside the skin taken out:", nc_, "points")
        for p in B.data.polygons: p.use_smooth = True
    if MHI:   # (closing the cuts can turn an open skin inward again: the neck and the wrists stay open here, so it is asked again)
        _bm = bmesh.new(); _bm.from_mesh(B.data); _bm.normal_update(); _o = _outward(_bm); _bm.to_mesh(B.data); _bm.free(); B.data.update(); print("body turned outward again" if _o < 0 else "body faces outward")
    odd_edges(B, "body after thinning:")
    print("FUSE body after thinning in", pieces(B), "piece(s)")
arm = bpy.data.armatures.new("rig"); A = bpy.data.objects.new("rig", arm); S.collection.objects.link(A); bpy.context.view_layer.objects.active = A; bpy.ops.object.mode_set(mode="EDIT")
def bone(n, h, t, parent=None):
    b = arm.edit_bones.new(n); b.head = h; b.tail = t
    if parent: b.parent = arm.edit_bones[parent]
bone("P", (0, 0, 0.93), (0, 0, 0.80)); bone("T", (0, 0, 0.98), (0, 0, 1.42), "P"); bone("H", (0, 0, 1.47), (0, 0, 1.78), "T")
for sd, sx in (("L", 1), ("R", -1)):
    ax = sx * (SHX + 0.008)
    bone("c" + sd, (sx * 0.02, 0, 1.43), (sx * (SHX - 0.02), 0, 1.415), "T")       # the collar bone: it lifts the shoulder when the arm goes up
    bone("a" + sd, (sx * SHX, 0, 1.41), (ax, 0, 1.12), "c" + sd); bone("e" + sd, (ax, 0, 1.12), (ax, 0, 0.82), "a" + sd); bone("w" + sd, (ax, 0, 0.82), (ax, -0.01, 0.69), "e" + sd)
    bone("l" + sd, (sx * (HPX + 0.008), 0, 0.92), (sx * (HPX + 0.006), 0, 0.47), "P"); bone("k" + sd, (sx * (HPX + 0.006), 0, 0.47), (sx * (HPX + 0.006), 0, 0.085), "l" + sd)
    bone("f" + sd, (sx * (HPX + 0.006), 0, 0.085), (sx * (HPX + 0.012), -0.15, 0.02), "k" + sd)   # the foot: it stays flat on the ground when the shin leans
bpy.ops.object.mode_set(mode="OBJECT")
for o in (B,):
    bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); A.select_set(True); bpy.context.view_layer.objects.active = A
    try: bpy.ops.object.parent_set(type="ARMATURE_NAME" if MPFB else "ARMATURE_AUTO")   # (a sculpted body comes with its own weights)
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
    # A hand hangs beside the thigh, and the automatic weights let each pull a little on the other's skin: a thigh
    # (and the cloth taken from it) then follows the hand up in a spike. Skin is held by its own limb only.
    nm_ = [g.name for g in o.vertex_groups]; fixed = 0
    for v in o.data.vertices:
        ws = {nm_[g.group]: g.weight for g in v.groups if g.weight > 0}
        if not ws: continue
        top = max(ws, key=ws.get); drop = [n for n in ws if (n[0] in "lkfP" if top[0] in "ew" else n[0] in "ew" if top[0] not in "aew" else False) or (top[0] in "lkf" and n[0] == "a")]
        if not drop: continue
        fixed += 1; t = sum(w for n, w in ws.items() if n not in drop)
        for n in drop: o.vertex_groups[n].remove([v.index])
        for n, w in ws.items():
            if n not in drop: o.vertex_groups[n].add([v.index], w / t, "REPLACE")
    # The shoulder is one skin with the chest and the back, and the automatic weights would let a raised arm pull the
    # breast and the shoulder blade far in toward the breastbone (through whatever cloth lies there). An arm's hold on the
    # trunk's skin fades out a hand's breadth in from the joint, as it did when the arm was a separate skin.
    held = 0
    if not os.environ.get("CAST_NOFUSE") and not MPFB:   # (a sculpted body's own weights already let go of the trunk as they should)
        nm_ = [g.name for g in o.vertex_groups]; SK_ = SHX / 0.2295   # (the distances were set on a frame of that half-width)
        for v in o.data.vertices:
            if v.co.z < 1.1 or abs(v.co.x) > SHX - 0.03 * SK_: continue
            g_ = 1 - sm(0.03 * SK_, 0.13 * SK_, SHX - abs(v.co.x)); ws = {nm_[g.group]: g.weight for g in v.groups if g.weight > 0}; arm_ = [n for n in ws if n[0] in "aew"]
            if not arm_ or g_ >= 0.999: continue
            rest = sum(w for n, w in ws.items() if n not in arm_); cut = sum(ws[n] for n in arm_) * (1 - g_); held += 1
            for n in arm_: o.vertex_groups[n].add([v.index], ws[n] * g_, "REPLACE")
            if rest > 1e-4:
                for n, w in ws.items():
                    if n not in arm_: o.vertex_groups[n].add([v.index], w * (rest + cut) / rest, "REPLACE")
            else: (o.vertex_groups.get("T") or o.vertex_groups.new(name="T")).add([v.index], cut, "REPLACE")
    print(o.name, "unweighted", len(lost), "verts", len(o.data.vertices), "limb weights cleaned", fixed, "arm's hold on the trunk eased at", held)
def rigid(o, bone_name):
    g = o.vertex_groups.new(name=bone_name); g.add(range(len(o.data.vertices)), 1.0, "REPLACE")
# The head goes with the head joint, and what lies below the mouth's line with the jaw, which opens.
MZ = HZ + FC.zst   # (the head's points came with their shares: the head, the jaw below the mouth's line, and the upper lids with their own joint)
RIG["J"] = ("H", (0, -0.012, HZ - 0.062)); RIG["M"] = ("H", (0, -FC.F(FC.zst), MZ))
RIG["sS"] = ("P", (0.03, -0.13, 0.95)); RIG["sC"] = ("T", (0.17 * FX, -0.1, 1.38))

# ---- What he wears and carries on him ---------------------------------------------------------------------------
def prim(kind, name, m, loc=(0, 0, 0), scale=(1, 1, 1), rotv=(0, 0, 0), **kw):
    if "segments" in kw: kw["segments"] = max(5, round(kw["segments"] * 0.72))            # (beads, bands, eyes: fewer faces round each)
    if "ring_count" in kw: kw["ring_count"] = max(3, round(kw["ring_count"] * 0.72))
    getattr(bpy.ops.mesh, "primitive_" + kind + "_add")(location=loc, rotation=rotv, **kw); o = bpy.context.object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); o.data.materials.append(M[m])
    for p in o.data.polygons: p.use_smooth = True
    o.select_set(False); return o
parts = []
def both(fn):
    for sx in (1, -1): parts.append(fn(sx))
# The face's own parts: the eyes in their sockets (the white, the iris, the pupil and a point of light), the lash line on the
# upper lid's edge, two lips, the dark of the mouth behind them, and the eyebrows.
EY = FACEM.build_eyes(FC)
for nm_, role_ in (("eye", "sclera"), ("iris", "iris"), ("pupil", "pupil"), ("glint", "white")): parts.append(mesh_obj(nm_, EY[nm_], role_))
_nc, _nr = FACEM.nostrils(FC)
if FC.P["nosep"] > 0.8: both(lambda sx: prim("uv_sphere", "nostril", "mouth", (sx * _nc[0], _nc[1], HZ + _nc[2]), _nr, segments=8, ring_count=5))
parts.append(mesh_obj("lash", FACEM.build_lashes(FC), "lash"))
parts.append(mesh_obj("lipU", HEADM["lipU"], "lip")); parts.append(mesh_obj("lipL", HEADM["lipL"], "lip")); parts.append(mesh_obj("mouth", FACEM.build_mouth(FC), "mouth"))
BRL, BRR, BRC = FACEM.build_brows(FC)
for m_, j_ in ((BRL, "bL"), (BRR, "bR")):
    o_ = mesh_obj("browhair", m_, "hair"); o_.vertex_groups.clear(); rigid(o_, j_); parts.append(o_)
RIG["E"] = ("H", (0, -FC.fe, HZ + FC.ze)); RIG["bL"] = ("H", (BRC[0], BRC[1], HZ + BRC[2])); RIG["bR"] = ("H", (-BRC[0], BRC[1], HZ + BRC[2]))
FACE = { "lid": 0.0085, "mouth": 0.0012, "lidr": round(FC.TU + FC.TL + 0.05, 4) }   # lidr: the angle the upper lids turn through, about the line through both eyes, to close
# The moustache of a wrestler: thick over the lip, swept out and up at the ends
_sz = FC.zub(0.3) + 0.0038; _sp = FC.surf(0.5 * FC.mw, _sz); _sy = _sp[1] - 0.002; _sx = 0.56 * FC.mw
if not H.get("handle"):   # most men: a moustache that lies along the lip and turns down a little at its ends, as the portraits have it
    both(lambda sx: prim("uv_sphere", "stache", "hair", (sx * _sx, _sy, HZ + _sz), (0.56 * FC.mw + 0.004, 0.0075, 0.0048), (0, -sx * 0.30, sx * 0.16), segments=12, ring_count=6))
else:
    both(lambda sx: prim("uv_sphere", "stache", "hair", (sx * (_sx + 0.003), _sy - 0.001, HZ + _sz + 0.002), (0.7 * FC.mw + 0.009, 0.013, 0.0105), (0, -sx * 0.30, sx * 0.2), segments=12, ring_count=6))
    both(lambda sx: prim("uv_sphere", "stache2", "hair", (sx * (FC.mw + 0.026), _sy + 0.024, HZ + _sz + 0.014), (0.022, 0.0095, 0.0095), (0, -sx * 0.8, sx * 0.6), segments=10, ring_count=6))
    both(lambda sx: prim("uv_sphere", "stache2", "hair", (sx * (FC.mw + 0.042), _sy + 0.036, HZ + _sz + 0.034), (0.0095, 0.008, 0.012), segments=8, ring_count=6))
# Hair: a cap over the skull, cut away from the face; a knot on the crown; the rest falling to the shoulders behind
hc = mesh_obj("haircap", FACEM.build_hair(FC, cover_ears=bool(H.get("earhair", SHE))), "hair"); parts.append(hc); HAIRCAP = hc
parts.append(mesh_obj("fringe", FACEM.build_fringe(FC), "hair"))   # a bald man's: worn in place of "hair"
parts.append(prim("uv_sphere", "knot", "hair", (0, 0.03, HZ + 0.155), (0.05, 0.052, 0.042), segments=14, ring_count=8))
parts.append(prim("torus", "knotband", "gold", (0, 0.03, HZ + 0.128), (1, 1, 1), major_radius=0.04, minor_radius=0.008, major_segments=16, minor_segments=6))
parts.append(prim("uv_sphere", "backhair", "hair", (0, 0.085, HZ - 0.1), (0.085, 0.045, 0.1), segments=14, ring_count=8))
for k, (x, y) in enumerate(((-0.105, 0.03), (-0.092, 0.07), (-0.06, 0.1), (-0.02, 0.112), (0.02, 0.112), (0.06, 0.1), (0.092, 0.07), (0.105, 0.03))):   # locks, each a wave of three
    for j in range(H["locks"]):
        w = math.sin(j * 1.9 + k) * 0.012; parts.append(prim("uv_sphere", "locks", "hair", (x * (1 + j * 0.07) + w, y + j * 0.008, HZ - 0.06 - j * 0.058), (0.026, 0.026, 0.04), segments=8, ring_count=6))
        if j: rigid(parts[-1], "sH") if j > 1 else [parts[-1].vertex_groups.new(name=n).add(range(len(parts[-1].data.vertices)), 0.5, "REPLACE") for n in ("H", "sH")]
def sm(a, b, x): k = max(0.0, min(1.0, (x - a) / (b - a))); return k * k * (3 - 2 * k)
def clothw(o, top="P", side=None, sway=None, z_top=1.0, ln=0.3):   # the wrap's own holding: the hips above (or the trunk), each thigh and then each shin below, shared across the middle
    if sway:   # a hanging end: held where it is tucked, and below that carried by a joint the game swings (it trails, is flung by a turn, and is carried forward by a rising thigh)
        gt, gs = o.vertex_groups.new(name=top), o.vertex_groups.new(name=sway)
        for v in o.data.vertices:
            k = sm(z_top - 0.03, z_top - 0.03 - max(0.1, 0.3 * ln), v.co.z)
            if k < 0.99: gt.add([v.index], 1 - k, "REPLACE")
            if k > 0.01: gs.add([v.index], k, "REPLACE")
        return
    G_ = {n: o.vertex_groups.new(name=n) for n in ("P", "T", "lL", "lR", "kL", "kR")}
    for v in o.data.vertices:
        x, z = v.co.x, v.co.z; wl = sm(-0.09, 0.09, x) if side is None else side; hp = sm(0.74, 0.93, z); kn = sm(0.5, 0.36, z); tt = sm(1.0, 1.12, z) if top == "T" else 0.0
        w = {"T": tt, "P": hp * (1 - tt), "lL": (1 - hp) * (1 - kn) * wl, "lR": (1 - hp) * (1 - kn) * (1 - wl), "kL": (1 - hp) * kn * wl, "kR": (1 - hp) * kn * (1 - wl)}
        for n, val in w.items():
            if val > 0.02: G_[n].add([v.index], val, "REPLACE")
# What a hanging length must clear: the body, and the clothes already on it (the waist cloth, its sash and pleats). The
# upper cloth used to be set off the bare body only, so its ends hung through the lower cloth and merged with it.
_WORN = None
def over(z, x, wd, fwd):
    global _WORN
    if _WORN is None:
        dg = bpy.context.evaluated_depsgraph_get(); dg.update()
        _WORN = [BVHTree.FromObject(o_, dg) for o_ in parts if o_.type == "MESH" and o_.name.startswith(("dhoti", "sash", "girdle", "pleat", "panel", "belt"))]
    best = None
    for dx in (-wd, 0.0, wd):
        o0 = Vector((x + dx, -1.0 * fwd, z)); d_ = Vector((0, fwd, 0))
        for t_ in [BVB] + (_WORN if z < 1.08 else []):
            h = t_.ray_cast(o0, d_, 2.0)
            if h[0] is not None: best = h[0].y if best is None else (min(best, h[0].y) if fwd > 0 else max(best, h[0].y))
    return best if best is not None else (-0.12 if fwd > 0 else 0.12)
def fall(name, role, x, y, z_top, ln, wd, lean_=0.0, top="P", edge=True, side=0.5, border=False, brole="red", gather=0.82, deep=1.0, sway=None, hold=None):   # a hanging length of cloth, a little waved, with a gold edge at its foot
    me = bpy.data.meshes.new(name); rows = 7 if wd < 0.02 else (18 if top == "T" and ln > 0.7 else 10); vs = []; fs = []; C_ = 3 if wd < 0.02 else 8; fwd = 1 if y < 0 else -1; y_plane = y; zt_ = hold if hold else z_top   # (hold: it lies on the body down to this height, and swings only below it)
    # A length hung from the shoulder lies on the body as far as its most forward point and hangs plumb from there. (It
    # was a flat sheet set at that point from the top down, and stood off the shoulder like a board.)
    lie = top == "T" and C_ > 3 and name != "apron" and name != "veilfall"; yrun = None; ylie = []
    for r in range(rows + 1):
        zr = z_top - ln * r / rows; yb = (over(zr, x, wd, 1) - 0.016) if fwd > 0 else (over(zr, x, wd, -1) + 0.016)
        yrun = yb if yrun is None else (min(yrun, yb) if fwd > 0 else max(yrun, yb)); ylie.append(yrun)
    for r in range(rows + 1):
        t = r / rows
        if lie: y = ylie[r]   # (it was held back to the flat sheet's place wherever the clothes under it stood further out, and so was cut into strips by them)
        for c in range(C_):
            u = c / (C_ - 1) - 0.5; fold = ((c % 2) if lie else (1 if c % 2 else -1)) * (0.0015 + 0.009 * t) * deep * (0 if C_ == 3 else 1)   # (a length lying on the body folds outward only: a fold inward went into what it lay on)       # gathered above, opening into pleats below
            z = z_top - ln * t - (0.012 * (c % 2) * t if C_ > 3 else 0)                                               # and the foot of each pleat a little lower than the next
            vs.append((x + u * wd * 2 * (gather + (1 - gather) * t ** 0.7) + lean_ * ln * t, y - fwd * (fold + 0.012 * math.sin(t * 3.0)), z))
    for r in range(rows):
        for c in range(C_ - 1): a = r * C_ + c; fs.append((a, a + 1, a + C_ + 1, a + C_))
    me.from_pydata(vs, [], fs); me.update(); o = bpy.data.objects.new(name, me); S.collection.objects.link(o); o.data.materials.append(M[role])
    for p in o.data.polygons: p.use_smooth = True
    clothw(o, top, side, sway, zt_, ln); parts.append(o)
    if edge:
        e = prim("cube", name + "edge", "gold", (x + lean_ * ln, y - (0.003 if y < 0 else -0.003), z_top - ln + 0.012), (wd * 1.02, 0.004, 0.012), size=2); clothw(e, top, side, sway, zt_, ln); parts.append(e)
    if border and lie:   # the cloth's own woven border, woven into it: a band along each edge and across the foot, made from the cloth's own points (as separate strips hung straight they stood away from a gathered, lying cloth like a frame)
        bv, bf = [], []; lift = lambda p_, k_=0.003: (p_[0], p_[1] - fwd * k_, p_[2]); mix = lambda a_, b_, k_: tuple(a_[i_] + (b_[i_] - a_[i_]) * k_ for i_ in range(3))
        for c0, c1 in ((0, 1), (C_ - 1, C_ - 2)):
            n_ = len(bv)
            for r in range(rows + 1): bv += [lift(vs[r * C_ + c0]), lift(mix(vs[r * C_ + c0], vs[r * C_ + c1], 0.45))]
            for r in range(rows): bf.append((n_ + 2 * r, n_ + 2 * r + 1, n_ + 2 * r + 3, n_ + 2 * r + 2))
        n_ = len(bv)
        for c in range(C_): bv += [lift(vs[rows * C_ + c], 0.004), lift(mix(vs[rows * C_ + c], vs[(rows - 1) * C_ + c], 0.28), 0.004)]
        for c in range(C_ - 1): bf.append((n_ + 2 * c, n_ + 2 * c + 2, n_ + 2 * c + 3, n_ + 2 * c + 1))
        bm_ = bpy.data.meshes.new(name + "b"); bm_.from_pydata(bv, [], bf); bm_.update(); bo = bpy.data.objects.new(name + "b", bm_); S.collection.objects.link(bo); bo.data.materials.append(M[brole])
        for p_ in bo.data.polygons: p_.use_smooth = True
        clothw(bo, top, side, sway, zt_, ln); parts.append(bo)
    elif border:
        for sx_ in (-1, 1): fall(name + "b", brole, x + sx_ * wd * 0.86 * (1 - 0.06), y - (0.004 if y < 0 else -0.004), z_top, ln, 0.007, lean_, top, False, side, sway=sway, hold=hold)
        e = prim("cube", name + "b", brole, (x + lean_ * ln, y - (0.005 if y < 0 else -0.005), z_top - ln + 0.016), (wd * 0.86, 0.003, 0.008), size=2); clothw(e, top, side, sway, zt_, ln); parts.append(e)
    return o
def shell(name, role, keep, off, src=None, cut=None, sides=None, neck=None, stiff=False, top=None):   # a garment taken from the body's own surface and stood off it; it keeps the body's weights. cut: (low, high) edges, cut clean; sides: cut clean at the arm-holes too
    src = src or B; o = src.copy(); o.data = src.data.copy(); S.collection.objects.link(o); o.name = name
    bm = bmesh.new(); bm.from_mesh(o.data)
    if cut:
        for z_, up in ((cut[0], -1), (cut[1], 1)):
            if z_ is not None: bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z_), plane_no=(0, 0, up), clear_outer=True)
    if sides:
        for sx_ in (-1, 1): bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(sx_ * sides, 0, 0), plane_no=(sx_, 0, 0), clear_outer=True)
    if neck:   # a neck opening (half-width, lower edge) cut clean: straight edges, where leaving out whole faces left a saw's edge of bright shards
        xh, zl = neck; near = lambda e: all(v.co.z > zl - 0.035 and abs(v.co.x) < xh + 0.05 for v in (e.verts if hasattr(e, "verts") else [e]))
        for co, no in (((-xh, 0, 0), (1, 0, 0)), ((xh, 0, 0), (1, 0, 0)), ((0, 0, zl), (0, 0, 1))):
            bmesh.ops.bisect_plane(bm, geom=[e for e in bm.verts[:] + bm.edges[:] + bm.faces[:] if near(e)], plane_co=co, plane_no=no)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.calc_center_median().x) < xh and f.calc_center_median().z > zl], context="FACES")
    if top:   # an upper edge along a curve, top(x) -> its height (a scooped neckline running out over the shoulders): the faces
        # above it go, and the points left along it are set on it, so the edge runs smooth and not in steps
        bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z > top(f.calc_center_median().x)], context="FACES")
        for v in bm.verts:
            if v.is_boundary and v.co.z > top(v.co.x) - 0.04 and abs(v.co.z - top(v.co.x)) < 0.04: v.co.z = top(v.co.x)
    dl = bm.verts.layers.deform.active; ai = {i for i, g in enumerate(src.vertex_groups) if g.name[0] in "aew"}
    armw = lambda v: sum(w for i, w in v[dl].items() if i in ai)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not keep(v.co) or armw(v) > (0.66 if stiff else 0.3)], context="VERTS")   # (skin the arm has a real hold on is left bare: under armour that does not move it would be hidden at rest and missing when the arm rose)
    if top:   # (the edges where whole faces were dropped run in steps: each edge point is drawn toward the middle of its two
        #  neighbours along the edge, a few times over, so the edges run smooth)
        for _ in range(8):
            mv = {}
            for v in bm.verts:
                if not v.is_boundary: continue
                nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
                if len(nb) == 2: mv[v] = v.co * 0.5 + (nb[0].co + nb[1].co) * 0.25
            for v, c in mv.items(): v.co = c
        bm.normal_update()
    for v in bm.verts: v.co += v.normal * off
    bm.to_mesh(o.data); bm.free(); o.data.materials.clear(); o.data.materials.append(M[role]); parts.append(o)
    if stiff:   # armour does not go up with a raised arm as skin does: the arm moves in its arm-hole (its edge rose in spikes otherwise)
        nm_ = [g.name for g in o.vertex_groups]
        for v in o.data.vertices:
            ws = {nm_[g.group]: g.weight for g in v.groups if g.weight > 0}; arm_ = [n for n in ws if n[0] in "aew"]
            if not arm_: continue
            # (all of the arm's hold taken off, the skin under the plates went up with a raised arm and the plates did not: the
            # back and the shoulder showed through them. So the plates keep the arm's hold where it is slight, as the skin under
            # them does, and lose it only toward the arm-hole's edge, where the spikes were.)
            aw = sum(ws[n] for n in arm_); t = min(1.0, max(0.0, (aw - 0.12) / 0.5)); keep_ = 1.0 - t * t * (3 - 2 * t)
            rest = sum(w for n, w in ws.items() if n not in arm_); tot = rest + aw * keep_
            if tot < 1e-4: (o.vertex_groups.get("T") or o.vertex_groups.new(name="T")).add([v.index], 1.0, "REPLACE"); continue
            for n, w in ws.items():
                w2 = (w * keep_ if n in arm_ else w) / tot
                if w2 > 1e-4: o.vertex_groups[n].add([v.index], w2, "REPLACE")
                else: o.vertex_groups[n].remove([v.index])
    return o
trunk = lambda c: not (c.z > 1.4 and abs(c.x) < 0.085)
def band(c, w):   # a strip from the left shoulder down to the right hip, front and back
    ux, uz = -0.3, -0.44; l = math.hypot(ux, uz); d = abs((c.x - 0.14) * uz - (c.z - 1.44) * ux) / l; return d < w and 0.99 < c.z < 1.47 and trunk(c)
def sm(a, b, x): k = max(0.0, min(1.0, (x - a) / (b - a))); return k * k * (3 - 2 * k)

def tag(objs, part):
    for o in (objs if isinstance(objs, (list, tuple)) else [objs]): o["part"] = part
def since(n0, part): tag(parts[n0:], part)
# ---- Lower cloth: wound round the hips and drawn between the legs, so it folds round each leg; three lengths.
def dhoti(name, zlow, flare=1.0, role="cloth", plain=False):   # (plain: a skirt of armour over the cloth: no hem band, no pleats)
    # The lower cloth is woven here as cloth, on its own even grid: a length round each leg from the waist to the hem,
    # the two meeting down the middle as far as the fork. (It used to be the body's own thinned skin pushed outward: too
    # coarse to carry folds, one tube from hip to hem with no legs in it, and lumped behind the knee. On the artist's
    # sheets it is full over the thigh, drawn in to each leg below, and hangs in deep folds.)
    n0 = len(parts); LEG = 0.8 + 0.2 * H["leg"]; NA = 32 if plain else 56; ztop = 1.0; rows = max(6, int(round((ztop - zlow) / 0.03))); off = 0.02 if plain else 0.012
    long_ = zlow < 0.2; short = zlow > 0.4; drawn = 0.0 if plain else (0.46 if long_ else 0.3 if not short else 0.1)
    def reach(sd, a, z):   # how far the body stands out from this leg's own line, at this height and in this direction
        c = Vector((sd * HPX, 0, z)); d = Vector((math.cos(a), math.sin(a), 0)); h = BVB.ray_cast(c, d, 0.5)
        if h[0] is None: return 0.1
        return (h[0] - c).dot(d)
    vs, fs, hemv = [], [], []
    for sd in (1, -1):
        b0 = len(vs)
        for r_ in range(rows + 1):
            z = ztop - (ztop - zlow) * r_ / rows; t = r_ / rows; below = sm(0.92, 0.78, z)
            for k in range(NA):
                a = k / NA * math.tau; inner = max(0.0, -sd * math.cos(a)); rb = reach(sd, a, z) + off
                R = 0.132 * LEG * flare * (1.0 + 0.12 * abs(math.sin(a))) * (1.0 + (0.16 if not plain else 0.0) * (0.35 + 0.65 * abs(math.sin(a))) * math.sin(min(1.0, max(0.0, t - 0.12) * 1.5) * math.pi)) * (1 - drawn * sm(0.5, 1.0, t))   # full over the thigh, drawn in toward the hem
                if not plain and sd * math.cos(a) > 0: R = min(R, (AX - 0.07 - HPX) / max(0.3, sd * math.cos(a)))   # (never out into the hands that hang beside it)
                r = rb * (1 - below) + max(rb + 0.006, R) * below
                sweep = sd * a + (0.95 - z) * 3.0                                             # the folds run aslant, from the outer hip down toward the middle
                fo_ = math.sin(sweep * 9 + 1.1 * math.sin(sweep * 3)); fo_ = math.copysign(abs(fo_) ** 0.6, fo_)   # many narrow folds, a little uneven, each with a crisp ridge (four broad waves read as a lumpy balloon)
                if not plain: r += ((0.007 + 0.015 * t) * fo_ + (0.002 + 0.008 * t) * math.sin(sweep * 3 + 0.7)) * below * (1 - 0.8 * inner)
                r = max(r, rb + 0.004)                                                          # a fold never dips into the leg under it
                x = sd * HPX + math.cos(a) * r; y = math.sin(a) * r
                # Between the legs: one cloth as far as the fork, then each leg's own, drawn through between them.
                g = 0.0 if plain else sm(0.76, 0.34, z); mid = 0.004 * (1 - g) + max(0.0, HPX - (reach(sd, math.pi if sd > 0 else 0.0, z) + 0.022)) * g
                if x * sd < mid: x = sd * mid
                zz = z + (inner * (0.05 if zlow > 0.2 and not plain else 0.0) * sm(zlow + 0.24, zlow, z) * below)   # the hem rises between the legs, where the cloth is drawn through
                vs.append((x, y, zz))
        for r_ in range(rows):
            for k in range(NA):
                a_ = b0 + r_ * NA + k; b_ = b0 + r_ * NA + (k + 1) % NA; fs.append((a_, b_, b_ + NA, a_ + NA) if sd > 0 else (b_, a_, a_ + NA, b_ + NA))
        hemv += list(range(b0 + (rows - 1) * NA, b0 + (rows + 1) * NA))
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update(); o = bpy.data.objects.new(name, me); S.collection.objects.link(o); o.data.materials.append(M[role])
    c0 = me.polygons[NA // 4].center; nrm = me.polygons[NA // 4].normal
    if nrm.y * c0.y + nrm.x * (c0.x - HPX) < 0: me.flip_normals(); me.update()
    for p_ in me.polygons: p_.use_smooth = True
    G_ = {n: o.vertex_groups.new(name=n) for n in ("P", "lL", "lR", "kL", "kR")}
    for v in me.vertices:
        sdn = "L" if v.index < len(vs) // 2 else "R"; z = v.co.z; hp = sm(0.74, 0.93, z); kn = sm(0.5, 0.36, z)
        for n, val in (("P", hp), ("l" + sdn, (1 - hp) * (1 - kn)), ("k" + sdn, (1 - hp) * kn)):
            if val > 0.02: G_[n].add([v.index], val, "REPLACE")
    parts.append(o)
    if plain: since(n0, name); return
    hb = o.copy(); hb.data = o.data.copy(); S.collection.objects.link(hb); hb.name = name + "hem"; bm = bmesh.new(); bm.from_mesh(hb.data); bm.verts.ensure_lookup_table(); keep = set(hemv)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in keep], context="VERTS")
    for v in bm.verts:
        sd = 1 if v.co.x > 0 else -1; cx = sd * HPX; rr = math.hypot(v.co.x - cx, v.co.y) or 1; k = (rr + 0.003) / rr; v.co.x = cx + (v.co.x - cx) * k; v.co.y *= k
    bm.to_mesh(hb.data); bm.free(); hb.data.materials.clear(); hb.data.materials.append(M["hem"]); parts.append(hb)
    fall("pleat", "cloth", 0.0, min(front(0.95), -0.13 * LEG * flare * 1.1) - 0.016, 0.97, min(0.56, 0.97 - zlow - 0.02), 0.07, edge=False, border=True, brole="hem", gather=0.3, deep=2.6, sway="sF")   # the pleats, gathered at the waist and fanning out below
    fall("pleat", "cloth", 0.0, max(backy(0.9), 0.13 * LEG * flare * 1.1) + 0.014, 0.95, min(0.36, 0.95 - zlow - 0.1), 0.055, edge=False, border=True, brole="hem", gather=0.22, deep=2.6)   # the tail: the cloth's end drawn through, pleated and tucked in at the small of the back
    since(n0, name)
# ---- Fitting things to this body: where its surface is, at any height.
from mathutils.bvhtree import BVHTree
BVB = BVHTree.FromObject(B, bpy.context.evaluated_depsgraph_get())
# The shoulder joint, bulked: a ball of the arm's own girth set on each joint and carried by the arm, so the shoulder
# stays whole whichever way the arm is raised (the skin alone pinched there and left a hollow at the joint).
for sx in ((1, -1) if os.environ.get("CAST_NOFUSE") else ()):   # (not needed since the shoulder became one skin: see fuse_shoulders)
    h = BVB.ray_cast(Vector((sx * (SHX + 0.3), 0, 1.385)), Vector((-sx, 0, 0)), 0.6)
    r = max(0.045, min(0.082, (abs(h[0].x) - SHX) if h[0] is not None else 0.065))
    o = prim("uv_sphere", "joint", "skin", (sx * (SHX + 0.003), 0.0, 1.386), (r, r * 1.02, r * 0.94), segments=14, ring_count=9); rigid(o, "aL" if sx > 0 else "aR"); o["part"] = "body"; parts.append(o)
def front(z, x=0.0):
    h = BVB.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)), 2.0); return h[0].y if h[0] is not None else -0.12
def backy(z, x=0.0):
    h = BVB.ray_cast(Vector((x, 1.0, z)), Vector((0, -1, 0)), 2.0); return h[0].y if h[0] is not None else 0.12
def hang(z0, z1, x=0.0, side=-1):   # where a cloth hanging between these heights lies: off the part of the body that stands furthest out
    ys = [front(z0 + (z1 - z0) * i / 8, x) if side < 0 else backy(z0 + (z1 - z0) * i / 8, x) for i in range(9)]; return (min(ys) - 0.01) if side < 0 else (max(ys) + 0.01)
def ring(name, role, z, minor, zs=1.0, grow=0.008, cx=0.0, cy=None, capx=None, N=22, bone=None):   # a band round the trunk or a limb, following its own outline
    if cy is None: cy = (front(z, cx) + backy(z, cx)) / 2
    c = Vector((cx, cy, z)); me = bpy.data.meshes.new(name); vs = []; fs = []; M_ = 5
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
dhoti("dhoti", 0.14 if H.get("rich") and not SHE else 0.27); dhoti("dhotiS", 0.46, 0.96); dhoti("dhotiL", 0.1, 0.98)
# ---- Waist: a cloth sash knotted in front with two ends; a gold girdle with a pleated panel; a plain leather belt.
n0 = len(parts)
ring("sash", "red", 0.995, 0.022, 2.0, 0.014)
parts.append(prim("uv_sphere", "knotsash", "red", (0.02, WY - 0.012, 0.985), (0.05, 0.03, 0.045), segments=12, ring_count=8))
for dx, zz, ln, wd, ry in ((0.0, 0.74, 0.22, 0.062, 0.03), (0.05, 0.8, 0.17, 0.05, -0.06)): fall("sashend", "red", dx, min(WY, hang(zz, zz + ln)) - 0.022 - dx * 0.1, zz + ln, ln * 2, wd, -ry, edge=bool(H.get("rich")), sway="sS")
since(n0, "sash"); n0 = len(parts)
ring("girdle", "red", 0.972, 0.024, 2.3, 0.012)   # the broad waist cloth of the sheets, wound over the lower cloth; a gold chain on it, and a jewelled clasp
ring("girdle", "gold", 0.99, 0.011, 1.5, 0.03)
parts.append(prim("uv_sphere", "girdle", "gold", (0, WY - 0.03, 0.982), (0.05, 0.016, 0.052), segments=12, ring_count=6))
parts.append(prim("uv_sphere", "girdlegem", "gem", (0, WY - 0.044, 0.982), (0.022, 0.009, 0.024), segments=8, ring_count=6))
since(n0, "girdle"); n0 = len(parts)
for dx, zz, ln, wd in ((0.0, 0.68, 0.3, 0.075), (0.0, 0.8, 0.17, 0.1)): fall("panel", "red", dx, min(WY, hang(zz, zz + ln)) - 0.03 - (0.012 if wd > 0.09 else 0), zz + ln, ln * 2, wd, sway="sF")
since(n0, "panel"); n0 = len(parts)
ring("belt", "leather", 1.0, 0.015, 2.4, 0.012); since(n0, "belt"); n0 = len(parts)
# ---- Gold
# (the sheets: three strands on a prince's chest, the longest carrying a great pendant; one strand on others)
NECK = ((0.075, 0.0125, 15), (0.118, 0.0105, 19), (0.172, 0.0115, 23)) if H.get("rich") and not SHE else ((0.075, 0.0125, 15), (0.12, 0.0105, 19)) if H.get("rich") else ((0.075, 0.0125, 15),)
for drop_, rad_, cnt_ in NECK:
    for k in range(cnt_):
        a = (k - (cnt_ - 1) / 2) / ((cnt_ - 1) / 2) * 1.25; x_, z_ = math.sin(a) * 0.105 * FX, 1.47 - math.cos(a) * drop_; parts.append(prim("uv_sphere", "necklace", "gold", (x_, front(z_, x_) - 0.006, z_), (rad_, rad_, rad_), segments=8, ring_count=5))
PZ = 1.47 - NECK[-1][0] - 0.026 if len(NECK) > 1 else 1.375; PK = 1.3 if len(NECK) > 2 else 1.0
parts.append(prim("uv_sphere", "pendant", "gold", (0, front(PZ) - 0.006, PZ), (0.024 * PK, 0.012, 0.028 * PK), segments=10, ring_count=6))
parts.append(prim("uv_sphere", "pendantgem", "gem", (0, front(PZ) - 0.016, PZ), (0.011 * PK, 0.006, 0.013 * PK), segments=8, ring_count=6))
for o in parts[n0:]: rigid(o, "T")
since(n0, "gold"); n0 = len(parts)
both(lambda sx: prim("uv_sphere", "earring", "gold", (sx * (LOBE[0] + 0.002), LOBE[1], HZ + LOBE[2] - (0.03 if H.get("earsun") else 0.022 if H.get("rich") else 0.016)), (0.008, 0.026, 0.026) if H.get("earsun") else (0.015, 0.015, 0.024) if H.get("rich") else (0.012, 0.012, 0.016), segments=8, ring_count=6))   # (hung from the ear's lobe)
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
for nm_, dy_ in (("beads", 0.006), ("beadsA", 0.03)):   # (beadsA: worn over a war coat, clear of it)
    for k in range(24):
        a = (k - 11.5) / 11.5 * 1.45; x_, z_ = math.sin(a) * 0.1 * FX, 1.47 - math.cos(a) * 0.21; parts.append(prim("uv_sphere", "beads", "beads", (x_, front(z_, x_) - dy_, z_), (0.013, 0.013, 0.013), segments=6, ring_count=5)); rigid(parts[-1], "T")
    since(n0, nm_); n0 = len(parts)
# ---- Armour: a cuirass taken from the trunk, shoulder plates, forearm guards, shin guards
if MHI:   # (on a sculpted body: close on it, as leather is, and its neck scooped in one smooth curve out over the shoulders)
    AOFF = MPFB.get("armour_off", 0.009); _nt = lambda x: min(1.475, 1.388 + 7.0 * x * x)
    shell("cuirass", "armour", lambda c: 1.029 < c.z < 1.49, AOFF, cut=(1.03, 1.475), sides=SHX + 0.01, stiff=True, top=_nt)
else:
    AOFF = 0.021
    shell("cuirass", "armour", lambda c: 1.029 < c.z < 1.451, 0.021, cut=(1.03, 1.45), sides=SHX + 0.01, neck=(0.085, 1.4), stiff=True)
ring("cuirassbelt", "leather", 1.045, 0.016, 1.6, 0.016, bone="T")
since(n0, "cuirass"); n0 = len(parts)
PK_ = H.get("pauldronk")   # (the sheets: Bhima's and Duryodhana's are great round domes with a boss; others three lapped plates)
if PK_ == "dome":
    both(lambda sx: prim("uv_sphere", "pauldron", "armour", (sx * (SHX + 0.05 * H["arm"]), 0, 1.4), tuple(k * H["arm"] for k in (0.108, 0.12, 0.085)), (0, sx * 0.5, 0), segments=14, ring_count=8))
    both(lambda sx: prim("torus", "pauldron", "gold", (sx * (SHX + 0.05 * H["arm"]), 0, 1.4), tuple(k * H["arm"] for k in (1, 1.05, 1)), (0, sx * (0.5 + math.pi / 2), 0), major_radius=0.09, minor_radius=0.007, major_segments=18, minor_segments=5))
else:
    for (dx_, z_, sc_, tilt) in ((0.0, 1.425, (0.098, 0.108, 0.046), 0.28), (0.052, 1.39, (0.088, 0.104, 0.04), 0.62), (0.092, 1.342, (0.074, 0.096, 0.036), 0.95)):   # three lapped plates down the shoulder, each tipped further over the arm
        both(lambda sx: prim("uv_sphere", "pauldron", "armour", (sx * (SHX + dx_ * H["arm"]), 0, z_), tuple(k * H["arm"] for k in sc_), (0, sx * tilt, 0), segments=12, ring_count=6))
if H.get("sign") and PK_ != "none":   # his sign again on each shoulder, as a gold boss
    both(lambda sx: prim("uv_sphere", "pauldron", "gold", (sx * (SHX + (0.105 if PK_ == "dome" else 0.085) * H["arm"]), -0.012, 1.375 if PK_ == "dome" else 1.36), (0.02, 0.034, 0.034), (0, sx * 0.45, 0), segments=10, ring_count=6))
    both(lambda sx: prim("uv_sphere", "pauldron", "gem", (sx * (SHX + (0.12 if PK_ == "dome" else 0.1) * H["arm"]), -0.012, 1.37 if PK_ == "dome" else 1.355), (0.012, 0.014, 0.014), segments=8, ring_count=5))
# Each plate goes with the arm of its own side: told by where the plate stands (o.location; its points are kept about its own
# middle, so their x says nothing of the side). Version 66 asked the points, got the same answer for both, and put the
# left plate on the right arm: it stood in the air whenever that arm moved (owner, 16 November).
for o in parts[n0:]: rigid(o, "aL" if o.location.x > 0 else "aR")
since(n0, "pauldron"); n0 = len(parts)
def limbshell(name, role, z0, z1, bones, off):
    o = B.copy(); o.data = B.data.copy(); S.collection.objects.link(o); o.name = name; bm = bmesh.new(); bm.from_mesh(o.data)
    for z_, up in ((z0, -1), (z1, 1)): bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z_), plane_no=(0, 0, up), clear_outer=True)
    dl = bm.verts.layers.deform.active; bi = {i for i, g in enumerate(B.vertex_groups) if g.name[0] in bones}
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (z0 - 0.001 < v.co.z < z1 + 0.001 and sum(w for i, w in v[dl].items() if i in bi) > 0.5)], context="VERTS")
    if top:   # (the edges where whole faces were dropped run in steps: each edge point is drawn toward the middle of its two
        #  neighbours along the edge, a few times over, so the edges run smooth)
        for _ in range(8):
            mv = {}
            for v in bm.verts:
                if not v.is_boundary: continue
                nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
                if len(nb) == 2: mv[v] = v.co * 0.5 + (nb[0].co + nb[1].co) * 0.25
            for v, c in mv.items(): v.co = c
        bm.normal_update()
    for v in bm.verts: v.co += v.normal * off
    bm.to_mesh(o.data); bm.free(); o.data.materials.clear(); o.data.materials.append(M[role]); parts.append(o); return o
limbshell("vambrace", "leather", 0.885, 1.075, "ew", 0.009)
if H.get("rich"):   # (the sheets: a hero's guards are rimmed in gold, and his shin guards carry a boss at the knee)
    for sx, sd in ((1, "L"), (-1, "R")):
        for z_ in (0.892, 1.068): ring("vambrace", "gold", z_, 0.006, 1.6, 0.012, cx=sx * AX, cy=0.0, N=16, bone="e" + sd)
since(n0, "vambrace"); n0 = len(parts)
limbshell("greave", "leather", 0.1, 0.41, "kf", 0.009)
if H.get("rich"):
    for sx, sd in ((1, "L"), (-1, "R")):
        for z_ in (0.108, 0.402): ring("greave", "gold", z_, 0.006, 1.6, 0.013, cx=sx * (HPX + 0.008), cy=0.005, N=16, bone="k" + sd)
        kx_ = sx * (HPX + 0.004); parts.append(prim("uv_sphere", "greave", "gold", (kx_, front(0.39, kx_) - 0.014, 0.39), (0.034, 0.016, 0.04), segments=10, ring_count=6)); rigid(parts[-1], "k" + sd)
        parts.append(prim("uv_sphere", "greave", "gem", (kx_, front(0.39, kx_) - 0.028, 0.39), (0.013, 0.007, 0.015), segments=8, ring_count=5)); rigid(parts[-1], "k" + sd)
since(n0, "greave"); n0 = len(parts)
# sandals: a sole under each foot, a strap over the instep and one behind the heel (the sheets give them to some heroes at war)
for sx, sd in ((1, "L"), (-1, "R")):
    fv = [v.co for v in B.data.vertices if v.co.z < 0.03 and v.co.x * sx > 0]
    if not fv: continue
    x0_, x1_ = min(q.x for q in fv), max(q.x for q in fv); y0_, y1_ = min(q.y for q in fv), max(q.y for q in fv); cx_, cy_ = (x0_ + x1_) / 2, (y0_ + y1_) / 2
    parts.append(prim("cube", "sandal", "leather", (cx_, cy_, 0.003), ((x1_ - x0_) / 2 + 0.006, (y1_ - y0_) / 2 + 0.006, 0.006), size=2)); rigid(parts[-1], "f" + sd)
    for yk_, zh_ in ((0.3, 0.036), (0.56, 0.05)):
        parts.append(prim("torus", "sandal", "leather", (cx_, y0_ + (y1_ - y0_) * yk_, 0.012), (1, 1, zh_ / ((x1_ - x0_) / 2 + 0.008)), (math.pi / 2, 0, 0), major_radius=(x1_ - x0_) / 2 + 0.008, minor_radius=0.006, major_segments=12, minor_segments=4)); rigid(parts[-1], "f" + sd)
    ring("sandal", "leather", 0.072, 0.005, 1.6, 0.006, cx=sx * (HPX + 0.008), cy=0.005, N=12, bone="k" + sd)
since(n0, "sandal"); n0 = len(parts)
# bands of trim round a cuirass, and a boss on the breast
for zz in (1.12, 1.27): ring("lames", "gold", zz, 0.0045, 1.3, AOFF + 0.004 if MHI else 0.016, capx=SHX - 0.03, bone="T")   # (gold rows on the coat's face)
since(n0, "lames"); n0 = len(parts)
dhoti("tasset", 0.79, 1.13, role="armour", plain=True); n0 = len(parts)   # the skirt of scales that hangs from the belt, over the cloth
parts.append(prim("uv_sphere", "boss", "gold", (0, front(1.3) - 0.016, 1.3), (0.05, 0.016, 0.05), segments=12, ring_count=6)); rigid(parts[-1], "T")
parts.append(prim("uv_sphere", "bossgem", "gem", (0, front(1.3) - 0.03, 1.3), (0.02, 0.008, 0.02), segments=8, ring_count=6)); rigid(parts[-1], "T"); since(n0, "boss"); n0 = len(parts)
# The sign a hero wears on the chest of his war coat, from his sheet: a rayed sun, a lion's face, a horse's head, a bull's,
# a fan of golden rays, a jewel in flames. (H["sign"]; gold, standing a little off the coat.)
SG = H.get("sign")
if SG:
    sk = H.get("signk", 1.3); SZ_ = 1.3; SY_ = front(SZ_) - (0.05 if AOFF > 0.015 else AOFF + 0.016)   # (clear of the coat, which stands off the body)
    def sp_(nm, role, x, dy, z, sc, rv=(0, 0, 0), kind="uv_sphere", **kw):
        if kind == "uv_sphere": kw.setdefault("segments", 10); kw.setdefault("ring_count", 6)
        parts.append(prim(kind, nm, role, (x * sk, SY_ - dy, SZ_ + z * sk), tuple(c * sk for c in sc), rv, **kw))
    if SG == "sun":
        sp_("sign", "gold", 0, 0, 0, (0.042, 0.012, 0.042)); sp_("signgem", "gem", 0, 0.01, 0, (0.02, 0.007, 0.02))
        for k in range(12): a = k / 12 * math.tau; sp_("sign", "gold", math.sin(a) * 0.06, -0.002, math.cos(a) * 0.06, (0.011, 0.006, 0.024), (0, a, 0), kind="cone", vertices=5)
    elif SG == "lion":
        for k in range(16): a = k / 16 * math.tau; sp_("sign", "gold", math.sin(a) * 0.052, -0.004, 0.004 + math.cos(a) * 0.052, (0.012, 0.007, 0.022), (0, a, 0), kind="cone", vertices=5)   # the mane, in points
        sp_("sign", "gold", 0, 0.003, 0.004, (0.043, 0.014, 0.045)); sp_("sign", "gold", 0, 0.016, -0.016, (0.021, 0.014, 0.018))               # the face, the muzzle
        sp_("signgem", "mouth", 0, 0.03, -0.012, (0.007, 0.004, 0.005)); sp_("signgem", "mouth", 0, 0.024, -0.028, (0.012, 0.004, 0.0035))   # the nose, the mouth
        for sx in (1, -1): sp_("sign", "gold", sx * 0.032, 0.006, 0.04, (0.013, 0.008, 0.013)); sp_("signgem", "gem", sx * 0.017, 0.016, 0.014, (0.0075, 0.004, 0.006))   # ears, eyes
    elif SG == "horse":
        sp_("sign", "gold", 0.004, 0.004, 0.012, (0.022, 0.015, 0.04), (0, 0.3, 0)); sp_("sign", "gold", -0.012, 0.01, -0.036, (0.015, 0.012, 0.024), (0, 0.3, 0))   # the head and the long muzzle
        for sx in (1, -1): sp_("sign", "gold", 0.018 + sx * 0.012, 0.002, 0.058, (0.006, 0.005, 0.016), kind="cone", vertices=5)                    # ears
        for k in range(5): sp_("sign", "gold", 0.03 + 0.004 * k, -0.002, 0.04 - 0.02 * k, (0.012, 0.007, 0.014))                                   # the mane down the neck
    elif SG == "bull":
        sp_("sign", "gold", 0, 0.004, 0.006, (0.034, 0.015, 0.036)); sp_("sign", "gold", 0, 0.012, -0.03, (0.022, 0.012, 0.016))
        for sx in (1, -1): sp_("sign", "gold", sx * 0.05, 0, 0.04, (0.009, 0.008, 0.03), (0, sx * 0.9, 0), kind="cone", vertices=6); sp_("sign", "gold", sx * 0.07, 0, 0.066, (0.006, 0.006, 0.02), (0, sx * 0.2, 0), kind="cone", vertices=6)   # horns, out and up
    elif SG == "burst":
        sp_("sign", "gold", 0, 0.004, -0.03, (0.018, 0.01, 0.018))
        for k in range(-4, 5): a = k * 0.36; sp_("sign", "gold", math.sin(a) * 0.05, 0, -0.03 + math.cos(a) * 0.05, (0.011, 0.006, 0.042), (0, a, 0))
    else:   # a jewel, in flames if he is the fire-born
        sp_("sign", "gold", 0, 0, 0, (0.034, 0.012, 0.044)); sp_("signgem", "gem", 0, 0.01, 0, (0.018, 0.008, 0.026))
        if SG == "flame":
            for k in range(10): a = k / 10 * math.tau; sp_("sign", "gold", math.sin(a) * 0.045, -0.002, math.cos(a) * 0.055, (0.01, 0.006, 0.022 + 0.01 * (k % 2)), (0, a + 0.3, 0), kind="cone", vertices=5)
    for o in parts[n0:]: rigid(o, "T")
since(n0, "sign"); n0 = len(parts)
# the lower cloth's own rolled top, knotted in front (plain people: no sash over it)
ring("tuck", "cloth", 0.995, 0.019, 1.8, 0.013); ring("tuckline", "red", 0.978, 0.0055, 1.0, 0.03)
parts.append(prim("uv_sphere", "tuckknot", "cloth", (0.0, WY - 0.01, 0.99), (0.04, 0.028, 0.036), segments=10, ring_count=6)); since(n0, "tuck"); n0 = len(parts)
# ---- Across the chest
shell("hide", "hide", lambda c: band(c, 0.11), 0.017); since(n0, "hide"); n0 = len(parts)
shell("bandeau", "band", lambda c: 1.214 < c.z < 1.371 and trunk(c), 0.01, cut=(1.215, 1.37)); since(n0, "bandeau"); n0 = len(parts)
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
def skin_shares(src, bvh, co, gn):   # the joints' shares of the skin at the place nearest a point: taken across the face it falls on
    loc, _, fi, _ = bvh.find_nearest(co)
    if loc is None: return {"T": 1.0}
    pl = src.data.polygons[fi]; vs = list(pl.vertices); out = {}
    if len(vs) == 3:
        from mathutils.geometry import barycentric_transform
        a_, b_, c_ = (src.data.vertices[i].co for i in vs)
        wv = barycentric_transform(loc, a_, b_, c_, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))); bw = [max(0.0, wv.x), max(0.0, wv.y), max(0.0, wv.z)]
    else:
        ds = [1 / max(1e-6, (src.data.vertices[i].co - loc).length) for i in vs]; bw = ds
    t_ = sum(bw) or 1.0
    for i, w_ in zip(vs, bw):
        for g in src.data.vertices[i].groups: out[gn[g.group]] = out.get(gn[g.group], 0) + g.weight * w_ / t_
    t_ = sum(out.values()) or 1.0; return {n_: w_ / t_ for n_, w_ in out.items()}
def ribbon(src, suffix, P0=(0.125, 1.455), P1=(-0.16, 1.0), mid="red", half=0.02, names=("strap", "strapedge", "strapstud"), stud=3, edge="gold", off=0.011, loose=False):
    dg = bpy.context.evaluated_depsgraph_get(); bvh = BVHTree.FromObject(src, dg); kd = KDTree(len(src.data.vertices))
    for v in src.data.vertices: kd.insert(v.co, v.index)
    kd.balance(); gn = [g.name for g in src.vertex_groups]
    p0, p1 = Vector((P0[0] * FX, 0, P0[1])), Vector((P1[0] * WX, 0, P1[1])); u = (p1 - p0).normalized(); yh = Vector((0, 1, 0)); n = u.cross(yh).normalized(); c = (p0 + p1) / 2
    N = 48; ring = []
    for i in range(N):
        a = i / N * math.tau; d = (u * math.cos(a) + yh * math.sin(a)).normalized(); hit = None; o_ = c + d * 0.6
        h = bvh.ray_cast(o_, -d, 0.6)                                    # from outside in... but only the trunk counts, not an arm in the way
        while h[0] is not None:
            vi = kd.find(h[0])[1]; aw = sum(g.weight * (0.5 if gn[g.group][0] == "a" else 1.0) for g in src.data.vertices[vi].groups if gn[g.group][0] in "aew")   # (an upper arm hanging by the hip is not the trunk either)
            if aw < 0.3: hit = h[0]; break
            h = bvh.ray_cast(h[0] - d * 0.002, -d, 0.6)
        ring.append((hit if hit is not None else c + d * 0.15, d))
    if loose:
        # A wide cloth tied loosely: it clears the whole of what lies under its width, the body and what is worn on it, and
        # spans the hollows between; it does not cling to the line under its middle. (Fitted to that one line, the chest,
        # the breast-band, the beads and the sash's roll came through it wherever they stood out to either side.)
        worn = [BVHTree.FromObject(o_, dg) for o_ in parts if o_.type == "MESH" and o_.name.startswith(("bandeau", "sash", "girdle", "tuck", "beads", "dhoti", "pleat", "belt", "necklace", "torque"))]
        rad = []
        for (p_, d) in ring:
            r_ = (p_ - c).dot(d)
            for w_ in (-1.0, -0.6, -0.3, 0.3, 0.6, 1.0, 0.0):
                o_ = c + n * (half * w_) + d * 0.6
                h = bvh.ray_cast(o_, -d, 0.6)
                while h[0] is not None:
                    vi = kd.find(h[0])[1]; aw = sum(g.weight * (0.5 if gn[g.group][0] == "a" else 1.0) for g in src.data.vertices[vi].groups if gn[g.group][0] in "aew")
                    if aw < 0.3: r_ = max(r_, (h[0] - c).dot(d)); break
                    h = bvh.ray_cast(h[0] - d * 0.002, -d, 0.6)
                for t_ in worn:
                    h = t_.ray_cast(o_, -d, 0.6)
                    if h[0] is not None and abs(h[0].x) < SHX + 0.02: r_ = max(r_, (h[0] - c).dot(d))
            rad.append(r_)
        rad = [max(rad[(i + k) % N] for k in (-2, -1, 0, 1, 2)) for i in range(N)]                       # it bridges from one high place to the next
        for _ in range(2): rad = [0.25 * rad[i - 1] + 0.5 * rad[i] + 0.25 * rad[(i + 1) % N] for i in range(N)]
        ring = [(c + d * max(rad[i], (ring[i][0] - c).dot(d)), d) for i, (p_, d) in enumerate(ring)]
    def strip(name, role, w0, w1, off):
        me = bpy.data.meshes.new(name); vs = []; fs = []
        for p, d in ring: vs += [tuple(p + d * off + n * w0), tuple(p + d * off + n * w1)]
        for i in range(N): a, b = i * 2, ((i + 1) % N) * 2; fs.append((a, b, b + 1, a + 1))
        me.from_pydata(vs, [], fs); me.update(); o = bpy.data.objects.new(name, me); S.collection.objects.link(o); o.data.materials.append(M[role])
        for pl in o.data.polygons: pl.use_smooth = True
        for v in o.data.vertices:
            # A band round the trunk is carried by the trunk and the hips alone: an arm that swings by the hip must not drag it.
            # But where the cloth lies on the shoulder it is the shoulder that carries it: there it takes the very shares of
            # the skin under it (found on the skin's own face, not at its nearest point), so a raised arm lifts the cloth
            # with the shoulder and never comes through it.
            sv = src.data.vertices[kd.find(v.co)[1]]; gs = [g for g in sorted(sv.groups, key=lambda g: -g.weight) if gn[g.group][0] not in "aew"][:2]; tot = sum(g.weight for g in gs)
            low = {"T": 1.0} if tot < 0.05 else {gn[g.group]: g.weight / tot for g in gs}
            k_ = sm(1.24, 1.33, v.co.z); ws = {n_: w_ * (1 - k_) for n_, w_ in low.items()}
            if k_ > 0:
                for n_, w_ in skin_shares(src, bvh, v.co, gn).items(): ws[n_] = ws.get(n_, 0) + w_ * k_
            for n_, w_ in ws.items():
                if w_ > 0.004: (o.vertex_groups.get(n_) or o.vertex_groups.new(name=n_)).add([v.index], w_, "REPLACE")
        parts.append(o); return o
    strip(names[0] + suffix, mid, -half, half, off)
    if edge: strip(names[1] + suffix, edge, -half - 0.01, -half, off + 0.0015); strip(names[1] + suffix, edge, half, half + 0.01, off + 0.0015)
    for i in range(0, N, stud):
        p, d = ring[i]; s_ = prim("uv_sphere", names[2] + suffix, "gold", tuple(p + d * 0.014), (0.0075, 0.0075, 0.0075), segments=6, ring_count=5)
        sv = src.data.vertices[kd.find(p)[1]]
        for g in sorted(sv.groups, key=lambda g: -g.weight)[:2]: (s_.vertex_groups.get(gn[g.group]) or s_.vertex_groups.new(name=gn[g.group])).add(range(len(s_.data.vertices)), g.weight, "REPLACE")
        parts.append(s_)
ribbon(B, "", mid="white", half=0.0045, stud=99, edge=None, off=0.006); since(n0, "thread"); n0 = len(parts)                  # the sacred thread
ribbon(B, "", mid="red", half=0.042, stud=99, edge="red" if not H.get("rich") else "gold", off=0.036); since(n0, "baldric"); n0 = len(parts)   # a sash of the side's colour, over the armour
ribbon(B, "", mid="leather", half=0.014, stud=99, edge="leather"); since(n0, "strap"); n0 = len(parts)            # a quiver's or a bag's strap
ribbon(B, "", mid="gold", half=0.011, names=("harness", "harness", "harness"), stud=2)
ribbon(B, "", P0=(-0.125, 1.455), P1=(0.16, 1.0), mid="gold", half=0.011, names=("harness", "harness", "harness"), stud=2); since(n0, "harness"); n0 = len(parts)
# The upper cloth, as every sheet draws it: a folded length laid over the left shoulder, one end hanging straight down in
# front to the knee and one behind, the chest left open. (It was a wide band from the shoulder across to the far hip: it
# hid the chest and the necklaces, and read as a pageant's sash.) The band is kept as its own part, for an elder woman's
# cloth drawn across her.
ribbon(B, "", P0=(0.15, 1.455), P1=(-0.12, 1.02), mid="cloth2", half=0.085, names=("pallu", "pallu", "pallu"), stud=99, edge="red", off=0.02, loose=True); since(n0, "pallu"); n0 = len(parts)
def crest(x):   # the top of the shoulder on this line: its height, and how far back it lies
    best = None
    for i_ in range(13):
        y_ = -0.09 + 0.015 * i_; h = BVB.ray_cast(Vector((x, y_, 2.0)), Vector((0, 0, -1)), 2.0)
        if h[0] is not None and (best is None or h[0].z > best[0]): best = (h[0].z, y_)
    return best or (1.45, 0.0)
def laid(name, xk, wd, zf, zb, gather=0.74, deep=1.7):
    x = xk * FX; zc, yc = crest(x)
    fall(name, "cloth2", x, -0.1, zc - 0.004, zc - 0.004 - zf, wd, top="T", side=0.85, edge=False, border=True, gather=gather, deep=deep, sway="sC", hold=1.2)
    fall(name, "cloth2", x, 0.1, zc - 0.004, zc - 0.004 - zb, wd, top="T", side=0.85, edge=False, border=True, gather=gather, deep=deep, sway="sB", hold=1.26)
    parts.append(prim("uv_sphere", name, "cloth2", (x, yc, zc + 0.006), (wd * gather * 1.04, 0.036, 0.013), segments=12, ring_count=6)); rigid(parts[-1], "T")   # the fold where it lies over the shoulder
laid("shawlend", 0.16, 0.074, 0.5, 0.62, gather=0.8); since(n0, "shawl"); n0 = len(parts)
# a plain man's upper cloth: the same, narrower and shorter
laid("drape", 0.158, 0.046, 0.72, 0.78, deep=1.4); since(n0, "drape"); n0 = len(parts)
fall("apron", "leather", 0.0, hang(0.6, 1.3), 1.3, 0.75, 0.15, top="T", edge=False); since(n0, "apron"); n0 = len(parts)
# Krishna's garland of forest flowers, from the neck to the thigh, and his flute tucked in at the waist
for k in range(46):
    a = (k - 22.5) / 22.5 * 1.5; x_, z_ = math.sin(a) * 0.12 * FX, 1.47 - math.cos(a) * 0.64
    parts.append(prim("uv_sphere", "garland", ("white", "red", "cloth")[k % 3], (x_, over(z_, x_, 0.0, 1) - 0.022, z_), (0.028, 0.022, 0.028), segments=7, ring_count=5)); rigid(parts[-1], "T" if z_ > 1.1 else "sC")
since(n0, "garland"); n0 = len(parts)
parts.append(prim("cylinder", "flute", "beads", (-0.075, WY - 0.04, 1.0), (0.008, 0.008, 0.16), (0, -0.95, 0), vertices=8)); rigid(parts[-1], "P"); since(n0, "flute"); n0 = len(parts)
# a short cloak from the shoulders down the back (Dhrishtadyumna's sheet)
_cz, _cy = crest(0.0 if False else 0.12 * FX)
fall("cape", "red", 0.0, 0.1, _cz - 0.03, _cz - 0.03 - 0.62, 0.15, top="T", edge=False, border=False, gather=0.8, deep=1.5, sway="sB", hold=1.3); since(n0, "cape"); n0 = len(parts)
# ---- Head: crowns, a helmet, a turban, matted hair, beards, a veil, a blindfold
CR = H.get("crown")
if CR:
    parts.append(prim("torus", "crown", "gold", (0, 0.012, HZ + 0.072), (1, 1.14, 2.4), (0.12, 0, 0), major_radius=0.103, minor_radius=0.009, major_segments=28, minor_segments=8))
    parts.append(prim("uv_sphere", "crowngem", "gem", (0, -0.112, HZ + 0.08), (0.014, 0.008, 0.018), segments=8, ring_count=6))
    if CR == "mukuta":
        # Each crowned head wears the crown on his own sheet: a smooth tiered dome (not a stack of rings), its height,
        # and what stands on its front: a jewelled leaf, Karna's rayed sun, Yudhishthira's ring of leaves,
        # Dhrishtadyumna's flames. (H["crownk"]: kind and height above the brim.)
        CK = dict(kind="dome", h=0.15); CK.update(H.get("crownk") or {}); ch = CK["h"]; R0 = 0.106; CB = (0, 0.012, HZ + 0.078)
        def put(o):   # from the crown's own space (brim at z 0) onto the head, tilted as the brim is
            bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)   # (where it was made, in the crown's space)
            o.rotation_euler = (0.12, 0, 0); o.location = CB; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); o.select_set(False); parts.append(o); return o
        def lathe(name, role, prof, seg=18):
            vs, fs = [], []
            for r_, z_ in prof:
                for k in range(seg): a = k / seg * math.tau; vs.append((math.sin(a) * r_, -math.cos(a) * r_ * 1.12, z_))
            for i_ in range(len(prof) - 1):
                for k in range(seg): fs.append((i_ * seg + k, i_ * seg + (k + 1) % seg, (i_ + 1) * seg + (k + 1) % seg, (i_ + 1) * seg + k))
            vs.append((0, 0, prof[-1][1] + 0.004)); t_ = len(vs) - 1; b_ = (len(prof) - 1) * seg
            for k in range(seg): fs.append((b_ + k, b_ + (k + 1) % seg, t_))
            me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update(); o = bpy.data.objects.new(name, me); S.collection.objects.link(o); o.data.materials.append(M[role])
            for p_ in me.polygons: p_.use_smooth = True
            return put(o)
        def lp(kind, name, role, loc, scale, rotv=(0, 0, 0), **kw):
            o = prim(kind, name, role, loc, scale, rotv, **kw); return put(o)
        if CK["kind"] != "flame":
            tiers = [(0.0, 1.0), (0.1, 1.03), (0.2, 0.97), (0.34, 0.93), (0.4, 0.95), (0.56, 0.74), (0.62, 0.76), (0.78, 0.48), (0.83, 0.5), (0.94, 0.2), (1.0, 0.1)]
            lathe("crowntier", "gold", [(R0 * r_, ch * t_) for t_, r_ in tiers])
            for t_, r_ in ((0.37, 0.955), (0.59, 0.765), (0.805, 0.505)):   # a raised rim at each tier, and a stone set in its front (the sheets: tiered, chased and jewelled; these were smooth domes)
                lp("torus", "crowntier", "gold", (0, 0, ch * t_), (1, 1.12, 1.5), major_radius=R0 * r_, minor_radius=0.0048, major_segments=18, minor_segments=5)
                lp("uv_sphere", "crowngem", "gem", (0, -R0 * r_ * 1.12 - 0.003, ch * t_), (0.008, 0.005, 0.009), segments=6, ring_count=5)
            lp("uv_sphere", "crowntier", "gold", (0, 0, ch + 0.012), (0.016, 0.016, 0.014), segments=8, ring_count=6)
            lp("cone", "crownspire", "gold", (0, 0, ch + 0.04), (0.011, 0.011, 0.022), vertices=8)
            for sx in (1, -1): lp("uv_sphere", "crowntier", "gold", (sx * (R0 + 0.004), 0.01, 0.03), (0.012, 0.03, 0.036), segments=8, ring_count=6)   # the plates over the ears
        FY = -R0 * 1.12
        if CK["kind"] == "sun":       # a sun on the brow: a disc and its rays
            lp("uv_sphere", "crowntier", "gold", (0, FY * 0.97, ch * 0.36), (0.03, 0.012, 0.03), segments=12, ring_count=6)
            lp("uv_sphere", "crowngem", "gem", (0, FY * 0.97 - 0.01, ch * 0.36), (0.017, 0.007, 0.017), segments=8, ring_count=6)
            for k in range(12):
                a = k / 12 * math.tau; lp("cone", "crownpeak", "gold", (math.sin(a) * 0.043, FY * 0.955, ch * 0.36 + math.cos(a) * 0.043), (0.0075, 0.005, 0.016), (0, a, 0), vertices=5)
        elif CK["kind"] == "flame":   # a band, and flames standing all round it, the tallest over the brow
            for k in range(14):
                a = k / 14 * math.tau; f_ = 0.5 + 0.5 * math.cos(a); hh_ = 0.03 + 0.03 * (k % 2) + 0.05 * f_ ** 3
                lp("cone", "crownpeak", "gold", (math.sin(a) * (R0 + 0.004), -math.cos(a) * (R0 + 0.004) * 1.12, 0.02 + hh_), (0.02, 0.008, hh_), (0.12 * math.cos(a), 0.12 * math.sin(a) + (0.25 if k % 2 else -0.2) * 0.4, -a), vertices=6)
            lp("cone", "crownpeak", "gold", (0.006, FY - 0.006, 0.12), (0.014, 0.007, 0.05), (0.1, 0.3, 0), vertices=6)
            lp("uv_sphere", "crowngem", "gem", (0, FY - 0.012, 0.03), (0.013, 0.007, 0.018), segments=8, ring_count=6)
        else:
            if CK["kind"] == "points":   # a ring of upright leaves round the brim
                for k in (-3, -2, -1, 1, 2, 3):
                    a = k * 0.42; lp("cone", "crownpeak", "gold", (math.sin(a) * (R0 + 0.006), -math.cos(a) * (R0 + 0.006) * 1.12, 0.062 - 0.004 * abs(k)), (0.017, 0.006, 0.04 - 0.004 * abs(k)), (0.1, 0, -a), vertices=6)
            lh = 0.06 if CK["kind"] != "points" else 0.075   # the jewelled leaf over the brow
            lp("cone", "crownpeak", "gold", (0, FY - 0.004, 0.012 + lh), (0.03, 0.009, lh), (0.1, 0, 0), vertices=8)
            lp("uv_sphere", "crowngem", "gem", (0, FY - 0.013, 0.052), (0.014, 0.007, 0.022), segments=8, ring_count=6)
        if CK.get("gems", True):
            for k in range(1, 8):
                a = k / 8 * math.tau; lp("uv_sphere", "crowngem", "gem", (math.sin(a) * R0 * 1.0, -math.cos(a) * R0 * 1.12, ch * 0.1 + 0.004), (0.009, 0.009, 0.011), segments=6, ring_count=5)
    elif CR == "kirita":
        parts.append(prim("cone", "crownpeak", "gold", (0, -0.085, HZ + 0.16), (0.05, 0.016, 0.075), vertices=8))
        both(lambda sx: prim("cone", "crownpeak", "gold", (sx * 0.06, -0.085, HZ + 0.125), (0.026, 0.012, 0.045), vertices=6))
    else:   # a diadem: a band with a leaf over the brow
        parts.append(prim("cone", "crownpeak", "gold", (0, -0.1, HZ + 0.115), (0.03, 0.012, 0.045), vertices=8))
        if H.get("wings"):   # wings at the temples (Arjuna's diadem)
            for k in range(3): both(lambda sx: prim("uv_sphere", "crownpeak", "gold", (sx * (0.11 + 0.008 * k), -0.03 + 0.012 * k, HZ + 0.1 + 0.013 * k), (0.007, 0.016, 0.024 + 0.005 * k), (0.35, sx * (0.2 + 0.16 * k), 0), segments=8, ring_count=6))
for o in parts[n0:]: rigid(o, "H")
since(n0, "crown"); n0 = len(parts)
# The helmet is fitted to the head it sits on. (Owner, 13 November: "helmets ... protude through the skin". One size of
# bowl was being set on every skull, and it was smaller in front than the forehead under it: the brow came through the
# iron on every helmeted head.) The bowl is as wide, as long and as high as this head and its hair above the rim, with a
# finger's breadth to spare all round, and then grown until no point of them is outside it. Its rim, its knob and the
# bar over the nose are placed from the bowl; the crest of an army's colour sits on its top.
RIMZ = HZ + 0.022
_hp = [v.co.copy() for o_ in (Hd, HAIRCAP) for v in o_.data.vertices if v.co.z > RIMZ - 0.004]
HY = (min(q.y for q in _hp) + max(q.y for q in _hp)) / 2; HCZ = HZ + 0.03
HA = max(abs(q.x) for q in _hp) + 0.009; HB = max(abs(q.y - HY) for q in _hp) + 0.009; HC_ = max(q.z - HCZ for q in _hp) + 0.012
_k = max(1.0, 1.03 * max(math.sqrt((q.x / HA) ** 2 + ((q.y - HY) / HB) ** 2 + ((q.z - HCZ) / HC_) ** 2) for q in _hp)); HA *= _k; HB *= _k; HC_ *= _k
print("helmet fitted: half-width %.3f, half-length %.3f, height %.3f, set %.3f forward of the neck (the one size was 0.116, 0.132, 0.140 at 0.014)" % (HA, HB, HC_, -HY))
bpy.ops.mesh.primitive_uv_sphere_add(location=(0, HY, HCZ), segments=28, ring_count=16); hm = bpy.context.object; hm.name = "helmet"; hm.scale = (HA, HB, HC_); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(hm.data); bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, RIMZ - 0.004), plane_no=(0, 0, -1), clear_outer=True); bm.to_mesh(hm.data); bm.free(); hm.data.materials.append(M["iron"])   # (cut clean at the brow, all the way round: the rim covers the edge)
for p in hm.data.polygons: p.use_smooth = True
hm.select_set(False); parts.append(hm)
parts.append(prim("torus", "helmetrim", "gold", (0, HY, RIMZ + 0.002), (1, HB / HA, 1.8), major_radius=HA + 0.001, minor_radius=0.008, major_segments=28, minor_segments=6))
parts.append(prim("cone", "helmetknob", "gold", (0, HY, HCZ + HC_ + 0.014), (0.022, 0.022, 0.035), vertices=10))
_ny = min([v.co.y for v in Hd.data.vertices if abs(v.co.x) < 0.014 and HZ - 0.03 < v.co.z < RIMZ] or [HY - HB])   # (the bar stands in front of the brow and the bridge of the nose, not in them)
if not H.get("nonasal"): parts.append(prim("cube", "helmetnose", "iron", (0, min(_ny - 0.009, HY - HB + 0.004), HZ - 0.004), (0.009, 0.005, 0.03), size=2))
else: parts.append(prim("uv_sphere", "helmetrim", "gold", (0, HY - HB - 0.004, RIMZ + 0.034), (0.022, 0.008, 0.022), segments=10, ring_count=6))   # (a hero's cap: no bar over the nose, a gold disc at the brow)
for o in parts[n0:]: rigid(o, "H")
since(n0, "helmet"); n0 = len(parts)
# an army's mark, to be read from above: a crest of dyed horsehair along the top of the head, in the host's colour
parts.append(prim("uv_sphere", "crest", "red", (0, HY + 0.016, HCZ + HC_ + 0.015), (0.04, HB * 0.95, 0.06), (-0.2, 0, 0), segments=12, ring_count=6)); rigid(parts[-1], "H"); since(n0, "crest"); n0 = len(parts)
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
for j in range(9): parts.append(prim("uv_sphere", "braid", "hair", (0, 0.125 + (0.02 if j > 1 else 0), HZ - 0.1 - j * 0.058), (0.028 - j * 0.0012, 0.026, 0.04), segments=8, ring_count=6)); rigid(parts[-1], "H" if j < 2 else "sH")
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
    gh, gt = o.vertex_groups.new(name="H"), o.vertex_groups.new(name="sH")   # (below the nape it hangs from the joint the game swings)
    for v in o.data.vertices:
        k = sm(1.47, 1.58, v.co.z)
        if k > 0.02: gh.add([v.index], k, "REPLACE")
        if k < 0.98: gt.add([v.index], 1 - k, "REPLACE")
    parts.append(o); return o
hairfall("longhair", 0.62 if SHE else 0.42, 0.2); since(n0, "longhair"); n0 = len(parts)
for nm, fz, fy in (("feather", 0.078 + (H.get("crownk") or {}).get("h", 0.15) + 0.03, -0.045), ("featherlow", 0.2, -0.03)):   # (it stands in the crown's top: it floated a hand above it)   # a peacock's eye-feather: over the crown, or in the knot when he wears none
    parts.append(prim("uv_sphere", nm, "band", (0.02, fy, HZ + fz), (0.035, 0.008, 0.075), (-0.25, 0.1, 0), segments=10, ring_count=8)); rigid(parts[-1], "H")
    parts.append(prim("uv_sphere", nm + "eye", "gem", (0.02, fy - 0.01, HZ + fz + 0.025), (0.016, 0.006, 0.024), (-0.25, 0.1, 0), segments=8, ring_count=6)); rigid(parts[-1], "H"); since(n0, nm); n0 = len(parts)
# beards: close-cut (the skin of the jaw itself, darkened and stood off), full, long; and a tuft on the chin alone
parts.append(mesh_obj("beardS", FACEM.build_beard(FC, "short", 0.0042), "hair")); since(n0, "beardS"); n0 = len(parts)
parts.append(prim("uv_sphere", "beardF", "hair", (0, -FC.F(FC.zpog) + 0.046, HZ + FC.zpog - 0.007), (FC.Wg * 0.9, 0.052, 0.052), segments=14, ring_count=8)); rigid(parts[-1], "H"); since(n0, "beardF"); n0 = len(parts)
parts.append(prim("uv_sphere", "beardL", "hair", (0, -FC.F(FC.zpog) + 0.033, HZ + FC.zpog - 0.072 * H.get("beardk", 1.0)), (FC.Wg * 0.82, 0.04 * H.get("beardk", 1.0) ** 0.5, 0.12 * H.get("beardk", 1.0)), segments=14, ring_count=10)); rigid(parts[-1], "H"); since(n0, "beardL"); n0 = len(parts)
parts.append(prim("uv_sphere", "goatee", "hair", (0, -FC.F(FC.zpog) + 0.026, HZ + FC.zpog - 0.022 * H.get("goateek", 1.0)), tuple(k_ * H.get("goateek", 1.0) for k_ in (0.024, 0.022, 0.04)), segments=10, ring_count=6)); rigid(parts[-1], "H"); since(n0, "goatee"); n0 = len(parts)
if H.get("stubble"): parts.append(mesh_obj("stubble", FACEM.build_beard(FC, "stubble", 0.0012), "stubble")); since(n0, "face"); n0 = len(parts)
# the head-cloth of an elder woman, over the hair and down the back; a band over the eyes
bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0.03, HZ + 0.03), segments=24, ring_count=14); vl = bpy.context.object; vl.name = "veil"; vl.scale = (0.122, 0.14, 0.13); bpy.ops.object.transform_apply(scale=True)
bm = bmesh.new(); bm.from_mesh(vl.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.045 and v.co.z < HZ + 0.1 or v.co.z < HZ - 0.11], context="VERTS"); bm.to_mesh(vl.data); bm.free(); vl.data.materials.append(M["cloth2"])
for p in vl.data.polygons: p.use_smooth = True
vl.select_set(False); rigid(vl, "H"); parts.append(vl)
fall("veilfall", "cloth2", 0.0, 0.15, HZ - 0.08, 0.75, 0.15, top="T", edge=False, sway="sB"); since(n0, "veil"); n0 = len(parts)
parts.append(prim("torus", "blindfold", "white", (0, 0.012, HZ + FC.ze + 0.004), (1, 1.13, 3.4), major_radius=0.109 * FC.P["hw"], minor_radius=0.008, major_segments=24, minor_segments=6)); rigid(parts[-1], "H"); since(n0, "blindfold"); n0 = len(parts)
# marks on the brow
def brow_strip(name, role, zc, half, x1, lift=0.002, nx=10):   # a painted band lying on the forehead, from -x1 to x1 at height zc
    vs, fs = [], []
    for i in range(nx + 1):
        x = -x1 + 2 * x1 * i / nx
        for z in (zc - half, zc + half): vs.append((x, FC.surf(x, z)[1] - lift, HZ + z))
    for i in range(nx): a_ = 2 * i; fs.append((a_, a_ + 2, a_ + 3, a_ + 1))
    me = bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update(); o = bpy.data.objects.new(name, me); S.collection.objects.link(o); o.data.materials.append(M[role])
    for p_ in me.polygons: p_.use_smooth = True
    rigid(o, "H"); parts.append(o); return o
# the three lines of ash a teacher or a hermit wears across the brow, and the red dot in their middle (Drona, Kripa, Mauni on their sheets)
for i_ in range(3): brow_strip("ash", "white", FC.zbr + 0.017 + 0.0105 * i_, 0.0027, 0.031)
parts.append(prim("uv_sphere", "ash", "mark", (0, FC.surf(0, FC.zbr + 0.0275)[1] - 0.0015, HZ + FC.zbr + 0.0275), (0.0048, 0.003, 0.0048), segments=8, ring_count=6)); rigid(parts[-1], "H"); since(n0, "ash"); n0 = len(parts)
# the upright mark the princes wear on every sheet: a red line between two white ones, from the bridge of the nose up
for sx_ in (-1, 1):
    vs_ = []
    for z_ in (FC.zbr + 0.006, FC.zbr + 0.034):
        for x_ in (sx_ * 0.0032, sx_ * 0.0078): vs_.append((x_, FC.surf(x_, z_)[1] - 0.002, HZ + z_))
    me_ = bpy.data.meshes.new("urdhva"); me_.from_pydata(vs_, [], [(0, 1, 3, 2) if sx_ > 0 else (1, 0, 2, 3)]); me_.update(); o_ = bpy.data.objects.new("urdhva", me_); S.collection.objects.link(o_); o_.data.materials.append(M["white"]); rigid(o_, "H"); parts.append(o_)
parts.append(prim("uv_sphere", "urdhva", "mark", (0, FC.surf(0, FC.zbr + 0.019)[1] - 0.0012, HZ + FC.zbr + 0.019), (0.0026, 0.0026, 0.0135), segments=6, ring_count=5)); rigid(parts[-1], "H"); since(n0, "urdhva"); n0 = len(parts)
# a queen's brow jewel: a gold chain along the parting and a stone hung on the brow
for k in range(6): parts.append(prim("uv_sphere", "tikka", "gold", (0, FC.surf(0, FC.zbr + 0.05 + 0.014 * k)[1] - 0.004, HZ + FC.zbr + 0.05 + 0.014 * k), (0.0045, 0.0045, 0.006), segments=6, ring_count=4)); rigid(parts[-1], "H")
parts.append(prim("uv_sphere", "tikka", "gold", (0, FC.surf(0, FC.zbr + 0.036)[1] - 0.004, HZ + FC.zbr + 0.036), (0.011, 0.005, 0.013), segments=8, ring_count=5)); rigid(parts[-1], "H")
parts.append(prim("uv_sphere", "tikka", "gem", (0, FC.surf(0, FC.zbr + 0.036)[1] - 0.008, HZ + FC.zbr + 0.036), (0.006, 0.003, 0.007), segments=6, ring_count=4)); rigid(parts[-1], "H"); since(n0, "tikka"); n0 = len(parts)
parts.append(prim("uv_sphere", "tilak", "gem", (0, FC.surf(0, FC.zbr + 0.024)[1] - 0.001, HZ + FC.zbr + 0.024), (0.006, 0.004, 0.014), segments=6, ring_count=5)); rigid(parts[-1], "H"); since(n0, "tilak"); n0 = len(parts)

PART = { "eye": "face", "iris": "face", "pupil": "face", "glint": "face", "lash": "face", "lipU": "face", "lipL": "face", "nostril": "face", "browhair": "face", "mouth": "face", "stache": "stache", "stache2": "stache", "haircap": "hair", "backhair": "hair", "knot": "knot", "knotband": "knot", "locks": "locks" }
def part_of(o):
    return o.get("part") or PART.get(o.name.split(".")[0], o.name.split(".")[0])
for o in parts:
    if not o.vertex_groups: rigid(o, "H" if part_of(o) in ("face", "stache", "hair", "knot", "locks") else "P")
for o in parts:
    if part_of(o) == "knot" and o.name.startswith("knotband"): o.data.materials.clear(); o.data.materials.append(M["red"])
print("parts", len(parts), sorted({part_of(o) for o in parts}))
if MHI:   # the whole person: the old face's features go; MakeHuman's face gets its own; what sits on the head is set on it
    import mpfb_face
    parts = mpfb_face.dress(bpy, S, M, MHI, Hd, parts, part_of, rigid, H, RIG)
    FACE["lidr"] = round(MHI["lidr"] * MPFB.get("lidk", 0.95), 4); print("FACE: the lids close through %.3f" % FACE["lidr"])
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

if STAGE == "qa":   # the checks of the blender-skills pack (tools/blender/skills, MIT), on each look in turn: parts floating free, faces inside out, flicker, skin weights; a web game's budget
    import json
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "skills")); import qa_check, mesh_stats
    B["part"] = "body"; Hd["part"] = "head"
    for o in HANDS: o["part"] = "hands"
    for lk, L in LOOKS.items():
        show = set(BASE + L["parts"]); names = [o.name for o in [B, Hd] + HANDS + parts if part_of(o) in show]
        q = qa_check.run(objects=names, profile="game", uv=False, tol=0.006); st = mesh_stats.run(objects=names, budget="web")
        print("QA " + json.dumps({ "name": HERO, "look": lk, "pass": q["pass"], "errors": q["errors"][:10], "warnings": q["warnings"][:5], "floating": len(q["floating"]), "tris": st["total_tris"], "bones": st["bones"], "over_budget": st["budget"]["over"] }))

if STAGE == "export":
    import json, base64, struct
    # A point of the thigh's skin that was given to the wrist hanging beside it (the hand lies close on a narrow frame)
    # went off with the hand when it moved, and drew a fin of skin out of the hip. Such a point belongs to the leg its
    # neighbours belong to.
    _gn = [g.name for g in B.vertex_groups]; _dom = lambda v: max(v.groups, key=lambda g: g.weight) if v.groups else None
    _nb = {}
    for e in B.data.edges: a_, b_ = e.vertices; _nb.setdefault(a_, []).append(b_); _nb.setdefault(b_, []).append(a_)
    _fix = 0
    for v in B.data.vertices:
        d_ = _dom(v)
        if d_ is None or _gn[d_.group][0] not in "ewgh" or v.co.z > 0.95: continue
        legs = [n_ for n_ in _nb.get(v.index, []) if _dom(B.data.vertices[n_]) is not None and _gn[_dom(B.data.vertices[n_]).group][0] in "lkP"]
        if len(legs) * 2 >= len(_nb.get(v.index, [])) and legs:
            src_ = B.data.vertices[legs[0]]
            for g in list(v.groups): B.vertex_groups[g.group].remove([v.index])
            for g in src_.groups: B.vertex_groups[g.group].add([v.index], g.weight, "REPLACE")
            _fix += 1
    if _fix: print("thigh points taken back from the hand:", _fix)
    B["part"] = "body"; Hd["part"] = "head"
    for o in HANDS: o["part"] = "hands"
    # Nothing that is one side's alone may be carried by the other side's limb (tests/models.js checks the same on what is written).
    for o in parts:
        gs_ = [g.name for g in o.vertex_groups]
        if len(gs_) == 1 and gs_[0][-1] in "LR" and gs_[0][0] in "aewghlkf":
            xs_ = [(o.matrix_world @ v.co).x for v in o.data.vertices]; mid_ = (min(xs_) + max(xs_)) / 2
            if mid_ * (1 if gs_[0][-1] == "L" else -1) < -0.035: raise SystemExit("WRONG SIDE: " + o.name + " (" + part_of(o) + ") stands at x %.3f and is carried by " % mid_ + gs_[0])
    used = set(BASE); [used.update(L["parts"]) for L in LOOKS.values()]
    objs = sorted([o for o in [B, Hd] + HANDS + parts if part_of(o) in used], key=lambda o: part_of(o)); P_, N_, C_, J_, W_, I_ = [], [], [], [], [], []; roles = []; cols = []; base = 0; ranges = {}; HIDDEN = []
    for o in objs:
        me = o.data; me.calc_loop_triangles(); mt = o.data.materials[0]; names = [g.name for g in o.vertex_groups]
        if mt.name not in roles: roles.append(mt.name); c = mt.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value; cols.append([round(255 * (x ** (1 / 2.2))) for x in c[:3]])
        ci = roles.index(mt.name); i0 = len(I_)
        for v in me.vertices:
            x, y, z = o.matrix_world @ v.co; nx, ny, nz = (o.matrix_world.to_3x3() @ v.normal).normalized()
            P_ += [x, z, -y]; N_ += [nx, nz, -ny]; C_.append(ci)
            ws = {}
            for g in v.groups:
                if names[g.group] in JOINTS and g.weight > 0.005: ws[names[g.group]] = ws.get(names[g.group], 0) + g.weight
            if not ws: ws = {"P": 1.0}
            t = sum(ws.values()); ws = {k: w / t for k, w in ws.items()}
            for ja, jb, jh in PAIRS:   # where two joints share a point, the share goes to the joint that turns half-way between them: the bend keeps its girth
                m = min(ws.get(ja, 0), ws.get(jb, 0))
                if m > 0.004: ws[jh] = ws.get(jh, 0) + 2 * m; ws[ja] -= m; ws[jb] -= m
            top = sorted(((w, JOINTS.index(k)) for k, w in ws.items() if w > 0.004), reverse=True)[:4]
            t = sum(w for w, _ in top); q = [round(255 * w / t) for w, _ in top]; q[0] += 255 - sum(q)
            while len(top) < 4: top.append((0, top[0][1])); q.append(0)
            J_ += [k for _, k in top]; W_ += q
        for t in me.loop_triangles:
            tri = [base + t.vertices[0], base + t.vertices[1], base + t.vertices[2]]
            if o is B and all(0.47 < me.vertices[i].co.z < 0.9 and abs(me.vertices[i].co.x) > 0.015 for i in t.vertices) and all(sum(g.weight for g in me.vertices[i].groups if names[g.group][0] in "lk") > 0.5 for i in t.vertices): HIDDEN.extend(tri)
            else: I_ += tri
        base += len(me.vertices); r = ranges.setdefault(part_of(o), [i0, 0]); r[1] = len(I_) - r[0]
    ranges["thighs"] = [len(I_), len(HIDDEN)]; I_ += HIDDEN
    n = base; assert n < 65536, n
    b64 = lambda fmt, a: base64.b64encode(struct.pack("<%d%s" % (len(a), fmt), *a)).decode()
    looks = { lk: { "parts": BASE + L["parts"], "cols": { r: "#%06x" % v for r, v in L.get("cols", {}).items() } } for lk, L in LOOKS.items() }
    data = { "n": n, "joints": JOINTS, "scale": 8192, "wide": WIDE, "size": H.get("size", 1), "sided": bool(H.get("sided")), "grip": [[round(g_[0], 4), round(g_[2], 4), round(-g_[1], 4)] for g_ in GRIP], "inf": 4,
             "rig": { k: [v[0], v[1] if isinstance(v[1], str) else [round(v[1][0], 4), round(v[1][2], 4), round(-v[1][1], 4)]] for k, v in RIG.items() }, "reparent": REPARENT, "face": FACE, "roles": roles, "cols": cols, "parts": ranges, "looks": looks,
             "pos": b64("h", [max(-32767, min(32767, round(v * 8192))) for v in P_]), "nor": b64("b", [max(-127, min(127, round(v * 127))) for v in N_]),
             "col": b64("B", C_), "jnt": b64("B", J_), "wgt": b64("B", W_), "idx": b64("H", I_) }
    open(OUT + "/m_" + HERO + ".js", "w").write("/* " + HERO + ": modelled in Blender by tools/blender/cast.py from the artist's sheets. Do not edit by hand. */\n(function (K) { const G = (K.G3 = K.G3 || {}); (G.MODELS = G.MODELS || {})." + HERO + " = " + json.dumps(data, separators=(",", ":")) + "; })(window.K = window.K || {});\n")
    print("exported", HERO, "verts", n, "tris", len(I_) // 3)
