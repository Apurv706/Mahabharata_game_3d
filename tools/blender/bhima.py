# Bhima, built in Blender by script, in the game's own rest pose and units (see js/g3/figure.js):
#   up = Blender Z (game Y), front = Blender -Y (game +Z), his left = Blender +X. Hips 0.92, shoulders 1.41, head joint 1.47.
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "."
STAGE = argv[1] if len(argv) > 1 else "all"
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
WIDE = 1.2; SHX = 0.255 * WIDE; HPX = 0.1 * WIDE

def mat(name, col, rough=0.6, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m
def hexc(h): return tuple(((h >> s) & 255) / 255 for s in (16, 8, 0))
def lin(c): return tuple(x ** 2.2 for x in c)
M = { "skin": mat("skin", lin(hexc(0x8f5126)), 0.5), "cloth": mat("cloth", lin(hexc(0xefe6cf)), 0.85), "red": mat("red", lin(hexc(0x9a2a1e)), 0.8),
      "gold": mat("gold", lin(hexc(0xd9a53a)), 0.32, 1.0), "hair": mat("hair", lin(hexc(0x14100c)), 0.5), "white": mat("white", (0.9, 0.88, 0.82), 0.3),
      "iris": mat("iris", (0.03, 0.02, 0.015), 0.2), "lip": mat("lip", lin(hexc(0x7a3a26)), 0.5), "iron": mat("iron", lin(hexc(0x4a4a50)), 0.4, 0.9) }

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
E = 2.0
body = sym([
  ((0, 0.0, 1.30), (0.20, 0.135, 0.17)),                    # ribcage
  ((0.10, -0.075, 1.335), (0.115, 0.075, 0.085), 1.6),      # pectorals
  ((0, 0.06, 1.33), (0.21, 0.09, 0.16), 1.6),               # upper back, lats
  ((0.15, 0.03, 1.22), (0.085, 0.09, 0.14), 1.4),           # lats down the side
  ((0, -0.01, 1.12), (0.165, 0.118, 0.13)),                 # belly, upper
  ((0, -0.03, 1.03), (0.17, 0.12, 0.11)),                   # belly, lower
  ((0, 0.01, 0.94), (0.185, 0.125, 0.12)),                  # pelvis
  ((0.085, 0.075, 0.90), (0.105, 0.09, 0.105), 1.5),        # glutes
  ((0.11, 0.03, 1.425), (0.11, 0.075, 0.04), 1.6, rot(0, 0.45, 0)),  # trapezius slope
  ((0, 0.015, 1.52), (0.06, 0.064, 0.10)),                  # neck
  ((SHX - 0.012, 0.0, 1.375), (0.082, 0.09, 0.085)),        # deltoid
  ((0.19, 0.01, 1.405), (0.115, 0.085, 0.06), 1.6),         # collar and shoulder girdle: neck to arm in one slope
  ((SHX + 0.005, 0.0, 1.25), (0.074, 0.08, 0.15)),          # upper arm
  ((SHX + 0.005, -0.03, 1.265), (0.056, 0.055, 0.10), 1.4),  # biceps
  ((SHX + 0.012, 0.0, 1.12), (0.05, 0.052, 0.05)),          # elbow
  ((SHX + 0.012, -0.005, 1.02), (0.062, 0.065, 0.115)),     # forearm, the thick of it
  ((SHX + 0.012, 0.0, 0.88), (0.04, 0.042, 0.09)),          # forearm to wrist
  ((HPX + 0.012, 0.0, 0.72), (0.108, 0.115, 0.21)),         # thigh
  ((HPX + 0.012, -0.035, 0.70), (0.075, 0.07, 0.16), 1.4),  # quadriceps
  ((HPX + 0.005, 0.0, 0.47), (0.064, 0.068, 0.07)),         # knee
  ((HPX + 0.005, 0.03, 0.33), (0.068, 0.075, 0.14)),        # calf
  ((HPX + 0.005, 0.005, 0.14), (0.045, 0.05, 0.11)),        # shin to ankle
  ((HPX + 0.008, -0.045, 0.035), (0.052, 0.105, 0.036)),    # foot
  ((HPX + 0.008, -0.12, 0.028), (0.05, 0.05, 0.026)),       # toes
  ((HPX + 0.005, 0.035, 0.045), (0.04, 0.045, 0.04)),       # heel
  ((SHX + 0.012, -0.005, 0.775), (0.036, 0.05, 0.055)),     # the hand: palm
  ((SHX + 0.012, -0.012, 0.715), (0.03, 0.045, 0.045)),     # fingers, curled a little
  ((SHX - 0.012, -0.045, 0.775), (0.02, 0.024, 0.04), 1.6), # thumb
])
B = metaballs("body", body, 0.022, 0.62)
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
for o in (B, Hd):
    o.data.materials.append(M["skin"])
    m = o.modifiers.new("sm", "SMOOTH"); m.iterations = 6 if o is B else 2; m.factor = 0.6
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="sm")
    for p in o.data.polygons: p.use_smooth = True
print("body verts", len(B.data.vertices), "head verts", len(Hd.data.vertices))

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
both(lambda sx: prim("uv_sphere", "stache", "hair", (sx * 0.026, -0.128, HZ - 0.078), (0.03, 0.014, 0.011), (0, sx * 0.25, sx * 0.2), segments=12, ring_count=6))
both(lambda sx: prim("uv_sphere", "stache2", "hair", (sx * 0.06, -0.112, HZ - 0.07), (0.018, 0.01, 0.009), (0, -sx * 0.7, sx * 0.5), segments=10, ring_count=6))
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
# The lower cloth, drawn up to the knee as a fighting man wears it: taken from the body's own surface and stood off it
dh = B.copy(); dh.data = B.data.copy(); S.collection.objects.link(dh); dh.name = "dhoti"
bm = bmesh.new(); bm.from_mesh(dh.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (0.5 < v.co.z < 1.0 and abs(v.co.x) < 0.243)], context="VERTS")
for v in bm.verts: v.co += v.normal * (0.014 + 0.004 * math.sin(v.co.z * 90 + v.co.x * 40))   # (a little fold in it)
bm.to_mesh(dh.data); bm.free(); dh.data.materials.clear(); dh.data.materials.append(M["cloth"]); parts.append(dh)
both(lambda sx: prim("torus", "hem", "red", (sx * (HPX + 0.008), 0.0, 0.505), (1, 1.06, 1), major_radius=0.083, minor_radius=0.012, major_segments=20, minor_segments=6))
parts.append(prim("torus", "sash", "red", (0, 0.0, 0.995), (1, 0.7, 1), major_radius=0.183, minor_radius=0.024, major_segments=28, minor_segments=8))
parts.append(prim("cube", "pleats", "cloth", (0, -0.135, 0.8), (0.05, 0.012, 0.17), size=2))
parts.append(prim("cube", "pleatend", "red", (0, -0.137, 0.635), (0.052, 0.013, 0.02), size=2))
parts.append(prim("uv_sphere", "knotsash", "red", (0.1, -0.12, 0.99), (0.035, 0.03, 0.03), segments=10, ring_count=6))
parts.append(prim("cube", "sashend", "red", (0.105, -0.13, 0.86), (0.028, 0.008, 0.11), size=2))
# Gold: a broad necklace, armlets, wristbands, anklets, earrings, a clasp on the sash
parts.append(prim("torus", "necklace", "gold", (0, -0.03, 1.455), (1, 0.9, 1), (0.5, 0, 0), major_radius=0.105, minor_radius=0.013, major_segments=28, minor_segments=8))
parts.append(prim("uv_sphere", "pendant", "gold", (0, -0.118, 1.395), (0.022, 0.012, 0.026), segments=10, ring_count=6))
both(lambda sx: prim("torus", "armlet", "gold", (sx * (SHX + 0.012), 0, 1.285), (1, 1.05, 1), major_radius=0.078, minor_radius=0.012, major_segments=20, minor_segments=6))
both(lambda sx: prim("torus", "wrist", "gold", (sx * (SHX + 0.012), 0, 0.845), (1, 1.05, 1), major_radius=0.043, minor_radius=0.011, major_segments=16, minor_segments=6))
both(lambda sx: prim("torus", "anklet", "gold", (sx * (HPX + 0.005), 0.005, 0.1), (1, 1.05, 1), major_radius=0.05, minor_radius=0.009, major_segments=16, minor_segments=6))
both(lambda sx: prim("uv_sphere", "earring", "gold", (sx * 0.104, 0.0, HZ - 0.062), (0.014, 0.014, 0.018), segments=8, ring_count=6))
parts.append(prim("cylinder", "clasp", "gold", (0, -0.128, 0.995), (0.03, 0.03, 0.008), (math.pi / 2, 0, 0), vertices=12))
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
    lights(); render("body", [("front", (0, -5.2, 1.05), (0, 0, 0.95), 70), ("three", (2.6, -4.4, 1.5), (0, 0, 0.95), 70), ("face", (0.35, -1.25, 1.68), (0, 0, 1.62), 70), ("back", (-2.2, 4.6, 1.5), (0, 0, 0.95), 70)])
