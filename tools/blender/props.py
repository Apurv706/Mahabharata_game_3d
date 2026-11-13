# The beasts of the field, built in Blender by script after the artist's sheets (machine_horse, machine_elephant):
# a war horse in harness, a war elephant in its trappings. Each goes out as one set of points with named parts; the
# neck, head, tail, legs (in their lengths), trunk and ears are parts of their own, each written about the joint it turns on.
#   python3 props.py -- <out dir> <horse|elephant> [render] [qa]      (qa: the mesh checks of tools/blender/skills)
# Built with up = Blender Z and the head toward Blender -Y; written in the game's axes (y up, head toward +z).
import bpy, bmesh, math, sys, os, json, base64, struct
from mathutils import Vector, Euler
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT, NAME, RENDER, QA = argv[0], argv[1], "render" in argv[2:], "qa" in argv[2:]
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
def hexc(h): return tuple(((h >> s) & 255) / 255 for s in (16, 8, 0))
def lin(c): return tuple(x ** 2.2 for x in c)
ROLE0 = { "coat": 0x7a4a2a if NAME == "horse" else 0x7d7a76, "dark": 0x1c1612 if NAME == "horse" else 0x5e5b58, "hoof": 0x2a2018, "pale": 0xe8dcc0, "pink": 0xa89088, "eye": 0x100a08,
          "tack": 0x8a1f24, "gold": 0xd9a53a, "leather": 0x4a3020 }
M = {}
for k, v in ROLE0.items():
    m = bpy.data.materials.new(k); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*lin(hexc(v)), 1); b.inputs["Roughness"].default_value = 0.4 if k == "gold" else 0.75; b.inputs["Metallic"].default_value = 1.0 if k == "gold" else 0.0; M[k] = m
def rot(rx, ry, rz): return tuple(Euler((rx, ry, rz)).to_quaternion())
def sym(balls):
    out = []
    for b in balls:
        out.append(b)
        if abs(b[0][0]) > 1e-4:
            m = [(-b[0][0], b[0][1], b[0][2]), b[1]] + list(b[2:3])
            if len(b) > 3: q = b[3]; m.append((q[0], q[1], -q[2], -q[3]) if q else None)
            out.append(tuple(m))
    return out
def lead(balls, k=0.95):   # a length's first ball is its parent's last, made a little smaller: two surfaces in one place flicker (found by the mesh check)
    b = balls[0]; return [(b[0], tuple(v * k for v in b[1])) + tuple(b[2:])] + list(balls[1:])
OBJS = []
def keep(o, role, part, pivot=None):
    o.data.materials.clear(); o.data.materials.append(M[role]); o["part"] = part
    if pivot: o["pivot"] = list(pivot)
    for p in o.data.polygons: p.use_smooth = True
    o.select_set(False); OBJS.append(o); return o
LOD = 0.5   # (a team of four and its shadows is drawn many times over on a battlefield: half the points, the same outline)
def blob(name, balls, role, part, res, ratio, pivot=None, thr=0.6):
    mb = bpy.data.metaballs.new(name); mb.resolution = res; mb.render_resolution = res; mb.threshold = thr
    ob = bpy.data.objects.new(name, mb); S.collection.objects.link(ob)
    for b in balls:
        (x, y, z), (sx, sy, sz) = b[0], b[1]; e = mb.elements.new(type="ELLIPSOID"); e.co = (x, y, z); e.radius = 1.0; e.stiffness = b[2] if len(b) > 2 else 2.0
        k = 0.93 / math.sqrt(1 - (thr / e.stiffness) ** (1 / 3)); e.size_x, e.size_y, e.size_z = sx * k, sy * k, sz * k
        if len(b) > 3 and b[3]: e.rotation = b[3]
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.context.view_layer.update(); bpy.ops.object.convert(target="MESH"); o = bpy.context.object; o.name = name
    d = o.modifiers.new("dec", "DECIMATE"); d.ratio = ratio * LOD; bpy.ops.object.modifier_apply(modifier="dec")
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.dissolve_degenerate(bm, dist=1e-5, edges=bm.edges[:]); bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5); bm.to_mesh(o.data); bm.free()   # (thinning leaves the odd collapsed face and doubled point: the mesh check of tools/blender/skills finds them)
    return keep(o, role, part, pivot)
def prim(kind, role, part, loc=(0, 0, 0), scale=(1, 1, 1), rotv=(0, 0, 0), pivot=None, **kw):
    getattr(bpy.ops.mesh, "primitive_" + kind + "_add")(location=loc, rotation=rotv, **kw); o = bpy.context.object; o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); return keep(o, role, part, pivot)
def rod(p0, p1, r0, r1, role, part, pivot=None, seg=8):   # a tapering length between two points
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r0, radius2=r1, depth=d.length, location=(p0 + p1) / 2)
    o = bpy.context.object; o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); return keep(o, role, part, pivot)
def shell(src, role, part, off, planes, pick=None):   # a cloth lying on a body: its surface, cut clean along the planes given [(point, normal pointing to what is cut away)], stood off
    o = src.copy(); o.data = src.data.copy(); S.collection.objects.link(o); bm = bmesh.new(); bm.from_mesh(o.data)
    for co, no in planes: bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=True)
    if pick: bmesh.ops.delete(bm, geom=[v for v in bm.verts if not pick(v.co)], context="VERTS")
    for v in bm.verts: v.co += v.normal * off
    bm.to_mesh(o.data); bm.free(); return keep(o, role, part)

# The beasts are written in parts, each about the joint it turns on (its pivot), so that the game can bind every part
# whole to a bone and move it (js/g3/kit.js `skinned`): a horse's neck, head and tail, and each leg in three (from the
# shoulder or hip to the knee or hock, the cannon below it, the pastern and hoof); an elephant's trunk in three, its ears,
# its tail, and each leg in two at the knee. A part's first ball is its parent's last, so a bent joint stays closed.
if NAME == "horse":
    NB, PL, DK = (0, -0.6, 1.5), (0, -1.04, 2.03), (0, 0.9, 1.4)   # where the neck leaves the shoulders; the poll, where the head hangs; the dock of the tail
    body = blob("body", sym([
      ((0, 0.0, 1.27), (0.34, 0.66, 0.36)), ((0, 0.05, 1.12), (0.29, 0.55, 0.22)),                       # barrel and belly
      ((0, -0.5, 1.3), (0.31, 0.34, 0.4)), ((0.17, -0.5, 1.2), (0.16, 0.26, 0.3), 1.6), ((0, -0.72, 1.26), (0.2, 0.16, 0.24), 1.6),   # chest, shoulders, breast
      ((0, 0.5, 1.33), (0.34, 0.38, 0.38)), ((0.16, 0.58, 1.33), (0.2, 0.3, 0.3), 1.6), ((0, 0.86, 1.4), (0.12, 0.12, 0.14), 1.6),    # quarters, croup, dock
      ((0, -0.38, 1.6), (0.12, 0.3, 0.1), 1.6),                                                           # withers
      ((0, -0.66, 1.5), (0.17, 0.21, 0.27)) ]), "coat", "body", 0.035, 0.3)                              # the root of the neck
    blob("neck", sym([((0, -0.64, 1.49), (0.17, 0.2, 0.26)), ((0, -0.72, 1.56), (0.19, 0.24, 0.3)), ((0, -0.86, 1.74), (0.16, 0.2, 0.27)), ((0, -0.97, 1.91), (0.135, 0.17, 0.22)),
                      ((0, -1.05, 2.03), (0.12, 0.145, 0.145))]), "coat", "neck", 0.035, 0.3, NB)       # the neck, arched, to the poll
    blob("head", sym([((0, -1.06, 2.04), (0.125, 0.15, 0.15)), ((0.055, -1.1, 1.98), (0.075, 0.11, 0.12), 1.6),          # poll, cheeks
      ((0, -1.24, 1.93), (0.095, 0.2, 0.105), 2.0, rot(-0.62, 0, 0)), ((0, -1.38, 1.8), (0.08, 0.1, 0.09)), ((0.04, -1.42, 1.77), (0.04, 0.05, 0.045), 1.7) ]), "coat", "head", 0.03, 0.36, PL)
    for sx in (1, -1):
        prim("cone", "coat", "head", (sx * 0.075, -1.03, 2.2), (0.045, 0.03, 0.1), (0.2, sx * 0.25, 0), pivot=PL, vertices=6)
        prim("uv_sphere", "eye", "head", (sx * 0.108, -1.13, 2.03), (0.022, 0.024, 0.022), pivot=PL, segments=8, ring_count=6)
    for i in range(9):   # the mane, lying along the crest; a lock over the brow
        t = i / 8; prim("uv_sphere", "dark", "neck", (0.02, -0.62 - 0.42 * t, 1.84 + 0.3 * t + 0.03 * math.sin(t * 3.14)), (0.045, 0.085, 0.12), (0.75 - 0.5 * t, 0, 0), pivot=NB, segments=8, ring_count=6)
    prim("uv_sphere", "dark", "head", (0, -1.12, 2.16), (0.05, 0.07, 0.08), (0.6, 0, 0), pivot=PL, segments=8, ring_count=6)
    blob("tail", [((0, 0.93, 1.36), (0.07, 0.09, 0.14)), ((0, 1.02, 1.12), (0.085, 0.1, 0.2)), ((0, 1.06, 0.82), (0.08, 0.09, 0.22)), ((0, 1.05, 0.55), (0.055, 0.06, 0.18))], "dark", "tail", 0.03, 0.4, DK)
    for nm, sx, fy in (("FL", -1, -0.56), ("FR", 1, -0.56), ("HL", -1, 0.56), ("HR", 1, 0.56)):
        px = sx * 0.19; hip = (px, fy, 1.12)
        if fy < 0: B_ = [((px, fy, 1.0), (0.1, 0.13, 0.2)), ((px, fy, 0.78), (0.075, 0.09, 0.2)), ((px, fy, 0.57), (0.06, 0.065, 0.06)), ((px, fy + 0.005, 0.38), (0.042, 0.048, 0.17)), ((px, fy, 0.2), (0.052, 0.058, 0.05)), ((px, fy - 0.02, 0.13), (0.045, 0.05, 0.06))]; hy = fy - 0.035
        else: B_ = [((px, fy, 1.02), (0.12, 0.17, 0.24)), ((px, fy + 0.06, 0.78), (0.08, 0.1, 0.2), 2.0, rot(0.35, 0, 0)), ((px, fy + 0.12, 0.58), (0.058, 0.07, 0.065)), ((px, fy + 0.1, 0.38), (0.042, 0.05, 0.17)), ((px, fy + 0.09, 0.2), (0.052, 0.058, 0.05)), ((px, fy + 0.07, 0.13), (0.045, 0.05, 0.06))]; hy = fy + 0.055
        knee, fet = B_[2][0], B_[4][0]
        blob("leg" + nm, B_[:3], "coat", "leg" + nm, 0.022, 0.3, hip)                 # shoulder to knee; hip to hock
        blob("shin" + nm, lead(B_[2:5]), "coat", "shin" + nm, 0.022, 0.3, knee)       # the cannon, to the fetlock
        blob("hoof" + nm, lead(B_[4:]), "coat", "hoof" + nm, 0.022, 0.5, fet)         # the pastern
        prim("cone", "hoof", "hoof" + nm, (px, hy, 0.055), (0.07, 0.085, 0.055), pivot=fet, vertices=10, radius1=1, radius2=0.72, depth=2)
        prim("torus", "gold", "shin" + nm + "t", (px, hy + 0.02, 0.2), (1, 1.1, 1.6), pivot=knee, major_radius=0.061, minor_radius=0.012, major_segments=12, minor_segments=5)   # an anklet, with the harness
    # ---- Harness: a saddle cloth with a gold border, a girth, a collar hung with bosses and tassels; on the head (and moving with it) the bridle and a plume.
    Y0, Y1, Z0 = -0.36, 0.4, 1.2
    shell(body, "gold", "tack", 0.016, [((0, Y0, 0), (0, -1, 0)), ((0, Y1, 0), (0, 1, 0)), ((0, 0, Z0), (0, 0, -1))])
    shell(body, "tack", "tack", 0.022, [((0, Y0 + 0.035, 0), (0, -1, 0)), ((0, Y1 - 0.035, 0), (0, 1, 0)), ((0, 0, Z0 + 0.035), (0, 0, -1))])
    prim("torus", "leather", "tack", (0, 0.02, 1.25), (0.37 / 0.36, 1, 0.4 / 0.36), (math.pi / 2, 0, 0), major_radius=0.36, minor_radius=0.02, major_segments=20, minor_segments=5)
    prim("torus", "tack", "tack", (0, -0.5, 1.4), (1.0, 1, 1.05), (1.05, 0, 0), major_radius=0.34, minor_radius=0.03, major_segments=20, minor_segments=6)
    for k in range(-3, 4):
        a = k * 0.36; x, y, z = math.sin(a) * 0.3, -0.83 + abs(k) * 0.035, 1.3 - math.cos(a) * 0.14
        prim("uv_sphere", "gold", "tack", (x, y, z), (0.032, 0.032, 0.032), segments=8, ring_count=6); prim("cone", "tack", "tack", (x, y, z - 0.08), (0.026, 0.026, 0.06), (math.pi, 0, 0), vertices=6)
    prim("torus", "leather", "headt", (0, -1.33, 1.86), (1, 1, 1), (0.95, 0, 0), pivot=PL, major_radius=0.1, minor_radius=0.012, major_segments=12, minor_segments=5)                      # noseband
    prim("torus", "leather", "headt", (0, -1.08, 2.02), (1, 1, 1.25), (0.25, 0, 0), pivot=PL, major_radius=0.14, minor_radius=0.012, major_segments=14, minor_segments=5)                    # headstall
    for sx in (1, -1): rod((sx * 0.1, -1.3, 1.9), (sx * 0.125, -1.1, 2.06), 0.01, 0.01, "leather", "headt", PL, seg=5)
    prim("cube", "gold", "headt", (0, -1.22, 2.04), (0.03, 0.01, 0.1), (-0.62, 0, 0), pivot=PL, size=2); prim("uv_sphere", "tack", "headt", (0, -1.16, 2.1), (0.024, 0.024, 0.024), pivot=PL, segments=8, ring_count=6)
    prim("cone", "tack", "headt", (0, -1.04, 2.28), (0.04, 0.04, 0.1), pivot=PL, vertices=7); prim("uv_sphere", "gold", "headt", (0, -1.04, 2.19), (0.03, 0.03, 0.03), pivot=PL, segments=8, ring_count=6)
    prim("torus", "tack", "tailt", (0, 1.0, 1.2), (1, 1, 1), (math.pi / 2, 0, 0), pivot=DK, major_radius=0.085, minor_radius=0.02, major_segments=10, minor_segments=5)                       # a ribbon in the tail
else:
    TP, TL = (0, -2.72, 2.72), (0, 1.92, 2.75)   # the root of the trunk; the root of the tail
    body = blob("body", sym([
      ((0, 0, 2.5), (1.1, 1.72, 1.18)), ((0, 0.1, 2.12), (0.95, 1.4, 0.75)), ((0, 1.2, 2.55), (0.98, 0.9, 1.05)), ((0, -1.3, 2.6), (0.95, 0.8, 1.05)),      # barrel, belly, rump, shoulders
      ((0, -0.2, 3.28), (0.5, 1.3, 0.42), 1.6),                                                                                                           # the back's arch
      ((0, -2.0, 3.0), (0.76, 0.75, 0.9)), ((0.3, -1.98, 3.62), (0.36, 0.4, 0.34), 1.6),                                                                  # the head and its two domes
      ((0, -2.52, 2.78), (0.42, 0.4, 0.55)), ((0.3, -2.42, 2.42), (0.2, 0.22, 0.3), 1.6) ]), "coat", "body", 0.09, 0.3)
    for sx in (1, -1):
        er = "earL" if sx < 0 else "earR"; EP = (sx * 0.74, -2.12, 3.05)   # (an ear hangs from its front edge, and fans about it)
        prim("uv_sphere", "coat", er, (sx * 0.98, -1.68, 3.0), (0.09, 0.62, 0.85), (0, 0, sx * 0.5), pivot=EP, segments=14, ring_count=8)              # the ears
        prim("uv_sphere", "pink", er, (sx * 1.02, -1.74, 2.9), (0.07, 0.42, 0.6), (0, 0, sx * 0.5), pivot=EP, segments=10, ring_count=6)
        rod((sx * 0.32, -2.6, 2.42), (sx * 0.42, -3.1, 2.08), 0.085, 0.06, "pale", "body"); rod((sx * 0.42, -3.1, 2.08), (sx * 0.46, -3.45, 2.06), 0.06, 0.02, "pale", "body")   # the tusks
        prim("torus", "gold", "body", (sx * 0.4, -3.0, 2.14), (1, 1, 1), (0.6, 0, 0), major_radius=0.075, minor_radius=0.018, major_segments=10, minor_segments=5)
        prim("uv_sphere", "eye", "body", (sx * 0.52, -2.5, 3.1), (0.05, 0.05, 0.05), segments=8, ring_count=6)
    rod((0, 1.92, 2.75), (0, 2.2, 1.7), 0.07, 0.03, "dark", "tail", TL); prim("uv_sphere", "dark", "tail", (0, 2.21, 1.62), (0.07, 0.07, 0.12), pivot=TL, segments=8, ring_count=6)
    T0 = [((0, -2.8, 2.5), (0.3, 0.3, 0.42)), ((0, -2.94, 2.02), (0.25, 0.25, 0.4)), ((0, -3.08, 1.55), (0.2, 0.2, 0.38)), ((0, -3.26, 1.15), (0.15, 0.16, 0.3), 2.0, rot(-0.5, 0, 0)), ((0, -3.44, 0.98), (0.1, 0.13, 0.1))]
    blob("trunk", T0[:2], "coat", "trunk", 0.06, 0.35, TP)                       # the trunk, in three lengths
    blob("trunkb", lead(T0[1:3]), "coat", "trunkb", 0.06, 0.35, T0[1][0])
    blob("trunkc", lead(T0[2:]), "coat", "trunkc", 0.06, 0.35, T0[2][0])
    for nm, sx, fy in (("FL", -1, -1.2), ("FR", 1, -1.2), ("HL", -1, 1.2), ("HR", 1, 1.2)):
        px = sx * 0.68; hip = (px, fy, 1.95); knee = (px, fy, 0.98)
        blob("leg" + nm, [((px, fy, 1.5), (0.42, 0.46, 0.62)), ((px, fy, 0.98), (0.365, 0.385, 0.4))], "coat", "leg" + nm, 0.07, 0.3, hip)
        blob("shin" + nm, [((px, fy, 0.98), (0.36, 0.38, 0.4)), ((px, fy, 0.7), (0.35, 0.37, 0.42)), ((px, fy - 0.02, 0.32), (0.39, 0.42, 0.32))], "coat", "shin" + nm, 0.07, 0.3, knee)
        for k in (-1, 0, 1): prim("uv_sphere", "pale", "shin" + nm, (px + k * 0.17, fy - 0.36 + abs(k) * 0.06, 0.1), (0.085, 0.06, 0.09), pivot=knee, segments=8, ring_count=6)   # the nails
        prim("torus", "gold", "shin" + nm, (px, fy - 0.01, 0.5), (1, 1.06, 1.6), pivot=knee, major_radius=0.375, minor_radius=0.03, major_segments=16, minor_segments=5)
    # ---- Trappings: the great cloth over the back with its gold border and tassels, a frontlet on the brow, a girth with a bell.
    Y0, Y1, Z0 = -1.5, 1.45, 2.05
    hem = shell(body, "gold", "cloth", 0.03, [((0, Y0, 0), (0, -1, 0)), ((0, Y1, 0), (0, 1, 0)), ((0, 0, Z0), (0, 0, -1))])
    on = lambda ob, p: ob.closest_point_on_mesh(Vector(p))[1]   # (an ornament is hung where the cloth really is: the mesh check found tassels, a pearl and the bell hanging in the air)
    shell(body, "tack", "cloth", 0.045, [((0, Y0 + 0.12, 0), (0, -1, 0)), ((0, Y1 - 0.12, 0), (0, 1, 0)), ((0, 0, Z0 + 0.12), (0, 0, -1))])
    for sx in (1, -1):
        for k in range(7): q = on(hem, (sx * 1.3, -1.3 + k * 0.44, Z0)); prim("cone", "gold" if k % 2 else "pale", "cloth", (q.x, q.y, q.z - 0.06), (0.05, 0.05, 0.1), (math.pi, 0, 0), vertices=6)
    fr = shell(body, "tack", "cloth", 0.03, [((0, -2.2, 0), (0, 1, 0)), ((0, 0, 3.05), (0, 0, -1)), ((0.5, 0, 0), (1, 0, 0)), ((-0.5, 0, 0), (-1, 0, 0))])                  # the frontlet
    q1, q2 = on(fr, (0, -3.2, 3.3)), on(fr, (0, -3.2, 3.05)); prim("uv_sphere", "gold", "cloth", (0, q1.y - 0.02, q1.z), (0.13, 0.06, 0.13), segments=10, ring_count=6); prim("uv_sphere", "pale", "cloth", (0, q2.y - 0.01, q2.z), (0.07, 0.04, 0.07), segments=8, ring_count=6)
    prim("torus", "leather", "cloth", (0, -0.75, 2.52), (1.03 / 1.1, 1, 1.2 / 1.1), (math.pi / 2, 0, 0), major_radius=1.13, minor_radius=0.045, major_segments=24, minor_segments=5)
    prim("uv_sphere", "gold", "cloth", (0, -0.75, 1.27), (0.11, 0.11, 0.14), segments=8, ring_count=6)   # the bell, on the girth

if RENDER:
    w = bpy.data.worlds.new("w"); S.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.5, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    for n, loc, e in (("key", (4, -6, 6), 900), ("fill", (-6, -3, 3), 300)):
        l = bpy.data.lights.new(n, "AREA"); l.energy = e * (5 if NAME == "elephant" else 1); l.size = 6; o = bpy.data.objects.new(n, l); S.collection.objects.link(o); o.location = loc; o.rotation_euler = (Vector((0, 0, 1.2)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    k = 2.6 if NAME == "elephant" else 1; cam = bpy.data.cameras.new("c"); co = bpy.data.objects.new("c", cam); S.collection.objects.link(co); S.camera = co; cam.lens = 60
    S.render.engine = "CYCLES"; S.view_settings.view_transform = "Standard"; S.cycles.samples = 24; S.cycles.device = "CPU"; S.render.resolution_x, S.render.resolution_y = 640, 480
    for nm, loc in (("side", (7.5 * k, -0.2 * k, 1.4 * k)), ("front", (3.2 * k, -6.5 * k, 2.2 * k))):
        co.location = loc; co.rotation_euler = (Vector((0, -0.1 * k, 1.15 * k)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); S.render.filepath = OUT + "/" + NAME + "_" + nm + ".png"; bpy.ops.render.render(write_still=True)

objs = sorted(OBJS, key=lambda o: o["part"]); P_, N_, C_, I_ = [], [], [], []; roles = []; cols = []; ranges = {}; pivots = {}; base = 0
for o in objs:
    me = o.data; me.calc_loop_triangles(); rn = me.materials[0].name; part = o["part"]; pv = Vector(o["pivot"]) if "pivot" in o else Vector((0, 0, 0))
    if "pivot" in o: pivots[part] = [round(pv.x, 4), round(pv.z, 4), round(-pv.y, 4)]
    if rn not in roles: roles.append(rn); cols.append("#%06x" % ROLE0[rn])
    ci = roles.index(rn); i0 = len(I_)
    for v in me.vertices:
        w = o.matrix_world @ v.co - pv; n = (o.matrix_world.to_3x3() @ v.normal).normalized(); P_ += [w.x, w.z, -w.y]; N_ += [n.x, n.z, -n.y]; C_.append(ci)
    for t in me.loop_triangles: I_ += [base + t.vertices[0], base + t.vertices[1], base + t.vertices[2]]
    base += len(me.vertices); r = ranges.setdefault(part, [i0, 0]); r[1] = len(I_) - r[0]
assert base < 65536, base
SC = 4096
b64 = lambda fmt, a: base64.b64encode(struct.pack("<%d%s" % (len(a), fmt), *a)).decode()
data = { "n": base, "scale": SC, "roles": roles, "cols": cols, "parts": ranges, "pivots": pivots,
         "pos": b64("h", [max(-32767, min(32767, round(v * SC))) for v in P_]), "nor": b64("b", [max(-127, min(127, round(v * 127))) for v in N_]), "col": b64("B", C_), "idx": b64("H", I_) }
open(OUT + "/p_" + NAME + ".js", "w").write("/* " + NAME + ": modelled in Blender by tools/blender/props.py after the artist's sheet. Do not edit by hand. */\n(function (K) { const G = (K.G3 = K.G3 || {}); (G.PROPS = G.PROPS || {})." + NAME + " = " + json.dumps(data, separators=(",", ":")) + "; })(window.K = window.K || {});\n")
print("exported", NAME, "verts", base, "tris", len(I_) // 3, {k: v[1] // 3 for k, v in ranges.items()})
if QA:   # the checks of the blender-skills pack (tools/blender/skills, MIT): parts floating free, faces inside out, flicker; a web game's budget
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "skills")); import qa_check, mesh_stats
    names = [o.name for o in OBJS]; q = qa_check.run(objects=names, profile="game", uv=False, tol=0.004); st = mesh_stats.run(objects=names, budget="web")
    print("QA " + json.dumps({ "name": NAME, "pass": q["pass"], "errors": q["errors"][:14], "warnings": q["warnings"][:8], "ground_z": q["ground_z"], "floating": len(q["floating"]), "tris": st["total_tris"], "over_budget": st["budget"]["over"] }))
