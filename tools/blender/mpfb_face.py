# The face of a whole MakeHuman person (mpfb_body.build_full), for cast.py: the game's old face features (made for its
# own head) are taken away and the MakeHuman face is given its own (eyes, brows, lips, a moustache); then everything that
# sits on the head (hair, crowns, the tilak, beards) is set on this head: nothing sinks into it, and what lies close on
# the skin (hair's cap, beards, marks) is drawn in to it.
import math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

OLD_FACE = {"eye", "iris", "pupil", "glint", "lash", "lipU", "lipL", "nostril", "browhair", "mouth", "stache", "stache2", "stubble"}
HUG = {"haircap": 0.007, "beardF": 0.014, "beardL": 0.02, "beardS": 0.01, "goatee": 0.012, "urdhva": 0.0015, "mark": 0.0015, "tikka": 0.003, "tilak": 0.0015, "stubble": 0.002}

def dress(bpy, S, M, MHI, Hd, parts, part_of, rigid, H, RIG):
    # what was made for the old head (hair, crowns, the tilak, earrings, beards) goes up with the head, onto the longer neck
    lift = MHI.get("neck_lift", 0.0)
    if lift:
        for o in parts:
            names = {g.name for g in o.vertex_groups}
            if names and names <= {"H", "sH", "J", "E", "bL", "bR"}: o.location.z += lift
        bpy.context.view_layer.update()
    keep = []
    for o in parts:
        if o.name.split(".")[0] in OLD_FACE: bpy.data.objects.remove(o)
        else: keep.append(o)
    parts = keep
    hv = [v.co.copy() for v in Hd.data.vertices]; hn = [v.normal.copy() for v in Hd.data.vertices]
    raw = [MHI["raw"][i] for i in Hd["src_ids"]]
    sH = MHI["head_scale"]; mo = MHI["mouth"]

    def new(name, role, part, verts, faces):
        me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
        o = bpy.data.objects.new(name, me); S.collection.objects.link(o); me.materials.append(M[role])
        for p in me.polygons: p.use_smooth = True
        o["part"] = part; o["mh"] = 1; rigid(o, "H"); parts.append(o); return o

    def shell(name, role, part, pick, off, taper=None):   # the head's own faces where pick() holds, stood off the skin
        fs = [p for p in Hd.data.polygons if (p.index in pick) ] if isinstance(pick, set) else [p for p in Hd.data.polygons if pick(Vector(p.center))]   # (a face is taken by its middle, or the faces are named)
        ids = sorted({i for p in fs for i in p.vertices}); rm = {i: k for k, i in enumerate(ids)}
        vs = [tuple(hv[i] + hn[i] * (off * (taper(hv[i]) if taper else 1.0))) for i in ids]
        if not fs: print("FACE: nothing picked for", name); return None
        o = new(name, role, part, vs, [[rm[i] for i in p.vertices] for p in fs])
        # (a shell has two sides: its edge is closed with a band back to the skin, so it shows no gap from the side)
        return o

    tree0 = BVHTree.FromPolygons(hv, [list(p.vertices) for p in Hd.data.polygons])
    def strip(name, role, part, centre, half, off, NU=18, NV=4):   # a smooth band laid on the face: centre(u) -> (x, z), half(u) -> its half-height; u from 0 to 1
        vs, fs = [], []
        for a in range(NU + 1):
            u = a / NU; x, z = centre(u); h = half(u)
            for b in range(NV + 1):
                zz = z + h * (2 * b / NV - 1); hit = tree0.ray_cast(Vector((x, -0.4, zz)), Vector((0, 1, 0)))
                loc, nor = (hit[0], hit[1]) if hit[0] is not None else (Vector((x, -0.1, zz)), Vector((0, -1, 0)))
                if nor.y > 0: nor = -nor
                vs.append(tuple(loc + nor * off * (0.45 + 0.55 * math.sin(math.pi * b / NV))))   # (thickest along its middle)
        for a in range(NU):
            for b in range(NV):
                i = a * (NV + 1) + b; fs.append([i, i + 1, i + NV + 2, i + NV + 1])
        return new(name, role, part, vs, fs)

    # the eyes: a white ball, with the iris and the pupil as caps of it, looking ahead and a little down
    ev, ef = {"eye": [], "iris": [], "pupil": []}, {"eye": [], "iris": [], "pupil": []}
    for s in "LR":
        c, r = MHI["eyes"][s]; r *= 0.97
        g = Vector((0.0, -1.0, -0.06)).normalized(); q = Vector((0, 0, 1)).rotation_difference(g)
        ri, rp = math.asin(0.47), math.asin(0.19)   # (the iris about half the eye's breadth seen from the front)
        NR, NS = 14, 20
        rings = [k * math.pi / NR for k in range(NR + 1)]
        rings = sorted(set(rings + [ri, rp]))
        P = lambda a, b, off: tuple(c + q @ Vector((math.sin(a) * math.cos(b), math.sin(a) * math.sin(b), math.cos(a))) * off)
        for nm, lo, hi in (("pupil", 0, rp), ("iris", rp, ri), ("eye", ri, math.pi)):
            rs = [a for a in rings if lo - 1e-9 <= a <= hi + 1e-9 and 1e-6 < a < math.pi - 1e-6]; off = r * (1.004 if nm == "pupil" else 1.002 if nm == "iris" else 1.0)
            base = len(ev[nm])
            for a in rs:
                for j in range(NS): ev[nm].append(P(a, 2 * math.pi * j / NS, off))
            for k in range(len(rs) - 1):
                for j in range(NS):
                    a0 = base + k * NS + j; a1 = base + k * NS + (j + 1) % NS; ef[nm].append([a0, a0 + NS, a1 + NS, a1])
            for pole, ring in ((0.0, 0), (math.pi, len(rs) - 1)):   # (a ball's ends close on one point, not a ring of points in one place)
                if (pole == 0.0 and lo == 0) or (pole == math.pi and hi == math.pi):
                    pi_ = len(ev[nm]); ev[nm].append(P(pole, 0.0, off)); r0 = base + ring * NS
                    for j in range(NS):
                        a0 = r0 + j; a1 = r0 + (j + 1) % NS; ef[nm].append([pi_, a1, a0])
    for nm, role in (("eye", "sclera"), ("iris", "iris"), ("pupil", "pupil")): new(nm, role, "face", ev[nm], ef[nm])

    F = (H.get("mpfb") or {}).get("face", {})   # this person's face: brows, moustache, beard (cast_specs: mpfb=dict(face=...))
    # brows: over each eye, full at the inner end and thinning to the temple; how high, how arched, how thick, and their slant
    BH, BA, BW, BWO, BS = F.get("brow_h", 1.42), F.get("brow_arch", 0.32), F.get("brow_w", 0.2), F.get("brow_w_out", 0.09), F.get("brow_slant", -0.25)
    for sd in "LR":
        c, _ = MHI["eyes"][sd]; r = 0.0115 * sH; sg = 1 if sd == "L" else -1; bk = H.get("browk", 1.0)
        AUTO = bool((H.get("mpfb") or {}).get("auto")); hc = H.get("hair", 0); pale = AUTO and ((hc >> 16) & 255) + ((hc >> 8) & 255) + (hc & 255) > 330   # (a grey or white head has brows of its own colour)
        X0, X1 = (-1.05, 2.95) if AUTO else (-0.95, 2.55)   # (the cast's brows run longer, from beside the nose out past the eye's corner)
        bo = strip("browhair", "hair" if pale else "lash", "face", lambda u, c=c, r=r, sg=sg: (c.x + sg * r * (X0 + X1 * u), c.z + r * (BH + BA * math.sin(math.pi * min(1.0, u * 1.25)) + BS * u * u)),
              lambda u, r=r: r * (BW - (BW - BWO) * u) * bk, F.get("brow_off", 0.0013), NU=14, NV=3)
        for g in list(bo.vertex_groups): bo.vertex_groups.remove(g)
        rigid(bo, "b" + sd)   # (each brow on the game's brow joint: it rises, knits and falls with the face's mood)
        bc = sum((Vector(v.co) for v in bo.data.vertices), Vector()) / len(bo.data.vertices); RIG["b" + sd] = ("H", (c.x + sg * r * 0.3, bc.y, bc.z))
        if AUTO and MHI.get("lids"):   # the lash line: a dark edge along the upper lid, from corner to corner (it closes with the lid)
            up = MHI["lids"][sd][0]; er = MHI["eyes"][sd][1]; lk = F.get("lash", 1.0)
            lo = strip("lash", "lash", "face", lambda u, c=c, er=er, sg=sg, up=up: (c.x + sg * er * (-0.78 + 1.62 * u), c.z - 0.10 * er + (up.z - c.z + 0.10 * er + 0.0012) * math.sin(math.pi * (0.08 + 0.84 * u)) ** 0.8 + 0.12 * er * u),
                       lambda u, er=er, lk=lk: er * (0.035 + 0.06 * math.sin(math.pi * u)) * lk, 0.0011, NU=12, NV=2)
            for g in list(lo.vertex_groups): lo.vertex_groups.remove(g)
            rigid(lo, "E")
    # lips: the red of the mouth. (MakeHuman's mouth joint is at the jaw's hinge, so the lips are found by their shape:
    # the face's most forward points in the middle between the nose and the chin.)
    mid = [i for i in range(len(hv)) if abs(hv[i].x) < 0.004 and abs(hv[i].z - MHI["mouth"].z) < 0.035]
    nt = min(mid, key=lambda i: hv[i].y)                                                        # the nose's tip
    low = [i for i in range(len(hv)) if abs(hv[i].x) < 0.004 and hv[nt].z - 0.05 < hv[i].z < hv[nt].z - 0.018]
    f_ = min(low, key=lambda i: hv[i].y); mo = Vector((0.0, hv[f_].y, hv[f_].z - 0.002)); MHI["lips"] = mo   # the lips' fullest point
    print("FACE: nose tip", tuple(round(c, 4) for c in hv[nt]), "lips", tuple(round(c, 4) for c in mo))
    LW, LH = 0.0245 * H.get("lipw", 1.0), 0.0088
    if (H.get("mpfb") or {}).get("auto"):
        # (the whole cast: heads of other sizes than the one this was set on, a child's among them. The lips' size goes by
        #  the head's; their middle is the line where they meet, found as the hollow next to their fullest point.)
        ks = sH / 1.15; LW *= ks; LH *= ks
        near = [i for i in range(len(hv)) if abs(hv[i].x) < 0.004 and abs(hv[i].z - hv[f_].z) < 0.011 * ks and i != f_]
        slit = max(near, key=lambda i: hv[i].y) if near else f_
        mo = Vector((0.0, hv[f_].y, hv[slit].z)); MHI["lips"] = mo
    def lip(p):
        return (p.x / LW) ** 2 + ((p.z - mo.z) / LH) ** 2 < 1.0 and p.y < mo.y + 0.011
    # (the lips' faces are taken out of the head's skin and given their own colour: nothing lies on the skin to flicker)
    import bmesh
    lf = [p.index for p in Hd.data.polygons if lip(Vector(p.center))]
    if (H.get("mpfb") or {}).get("auto") and lf:
        # (the lips' edge ran in steps, face by face: the points on the edge are drawn onto the lips' outline)
        inl = set(lf); cnt = {}
        for p_ in Hd.data.polygons:
            for i in p_.vertices: c_ = cnt.setdefault(i, [0, 0]); c_[0 if p_.index in inl else 1] += 1
        for i, (a_, b_) in cnt.items():
            if a_ and b_:
                r_ = math.sqrt((hv[i].x / LW) ** 2 + ((hv[i].z - mo.z) / LH) ** 2)
                if 0.55 < r_ < 1.6:
                    nx, nz = hv[i].x / r_, mo.z + (hv[i].z - mo.z) / r_
                    if abs(nx - hv[i].x) < 0.004 and abs(nz - hv[i].z) < 0.004: hv[i].x = nx; hv[i].z = nz; Hd.data.vertices[i].co = hv[i]
        Hd.data.update()
    o = shell("lipU", "lip", "face", set(lf) if (H.get("mpfb") or {}).get("auto") else lip, 0.0)
    if o:
        for g in list(o.vertex_groups): o.vertex_groups.remove(g)
        ids = sorted({i for k in lf for i in Hd.data.polygons[k].vertices}); hg = {g.index: g.name for g in Hd.vertex_groups}
        for k_, i in enumerate(ids):
            for g in Hd.data.vertices[i].groups: (o.vertex_groups.get(hg[g.group]) or o.vertex_groups.new(name=hg[g.group])).add([k_], g.weight, "REPLACE")
        bm = bmesh.new(); bm.from_mesh(Hd.data); bm.faces.ensure_lookup_table(); bmesh.ops.delete(bm, geom=[bm.faces[k] for k in lf], context="FACES_ONLY"); bm.to_mesh(Hd.data); bm.free(); Hd.data.update()
    # a moustache: along the upper lip, thick in the middle, its ends drawn down toward (or past) the mouth's corners
    sk = H.get("stachek", 1.0); SW, SH_, SD, SDR = F.get("stache_w", 0.0285), F.get("stache_h", 0.0042), F.get("stache_off", 0.0022), F.get("stache_droop", 0.0045)
    worn = {p for L_ in H["looks"].values() for p in L_["parts"]}
    if "stache" in worn:
        if H.get("handle"):   # the wrestler's (Bhima's): heavy over the lip, swept out past the mouth's corners and up at its ends
            SW, SH_, SD = SW * 1.25, SH_ * 1.45, SD * 1.5
            strip("stache", "hair", "stache", lambda u: (SW * (2 * u - 1), mo.z + 0.0125 - 0.005 * (2 * u - 1) ** 2 + 0.019 * max(0.0, abs(2 * u - 1) - 0.52) ** 1.5 / 0.48 ** 1.5),
                  lambda u: (SH_ - SH_ * 0.62 * (2 * u - 1) ** 2) * sk, SD, NU=28, NV=4)
        else:
            CU = F.get("stache_curl", 0.0)
            strip("stache", "hair", "stache", lambda u: (SW * (2 * u - 1), mo.z + 0.0105 - SDR * (2 * u - 1) ** 2 + CU * max(0.0, abs(2 * u - 1) - 0.55) ** 1.5 / 0.45 ** 1.5),
                  lambda u: (SH_ - SH_ * 0.5 * (2 * u - 1) ** 2) * sk, SD, NU=24, NV=4)
    # a short beard (F["beard"]: how thick): the jaw, the chin and under it, the cheeks up to a line from the mouth's corner to
    # the ear's lobe, and the sideburns; thinning to nothing at its edges so it does not end in a cut line; not on the lips
    BEARDS = [("beardS", F.get("beard"), F)] if F.get("beard") else []
    if F.get("beardF"): BEARDS.append(("beardF", F["beardF"].get("beard", 0.016), F["beardF"]))   # (a full beard: the same ground, thick, and lower under the chin)
    for BN, BD, F in BEARDS:
        top = lambda x: mo.z + 0.011 + F.get("beard_cheek", 0.6) * max(0.0, abs(x) - 0.024)   # its upper edge across the cheek
        lipm = lambda p: (p.x / (LW * 1.15)) ** 2 + ((p.z - mo.z) / (LH * 1.3)) ** 2 < 1.0
        earY = MHI["eyes"]["L"][0].y + F.get("beard_back", 0.075)
        def margin(p):   # how far inside the beard's ground a point is (m; below 0, outside)
            if lipm(p): return -1.0
            m_ = min(top(p.x) - p.z, p.z - (mo.z - F.get("beard_low", 0.085)), earY - p.y)
            if BN == "beardF": m_ = min(m_, (math.sqrt((p.x / (LW * 1.15)) ** 2 + ((p.z - mo.z) / (LH * 1.3)) ** 2) - 1.0) * 0.02)   # (a full beard thins toward the lips, so the mouth's opening is a soft edge, not a cut one)
            return m_
        fs = [p for p in Hd.data.polygons if margin(Vector(p.center)) > 0]
        ids = sorted({i for p in fs for i in p.vertices}); rm = {i: k for k, i in enumerate(ids)}
        vs = []
        for i in ids:
            m_ = margin(hv[i]); t = max(0.0, min(1.0, m_ / 0.009)); t = t * t * (3 - 2 * t)
            dn = F.get("beard_drop", 0.0) * max(0.0, min(1.0, (mo.z - 0.02 - hv[i].z) / 0.05)) * t   # (a full beard hangs: its lower part comes down and forward off the chin)
            vs.append(tuple(hv[i] + hn[i] * (0.0016 + BD * t) + Vector((0.0, -0.25 * dn, -dn))))
        for o in [o for o in parts if o.name.split(".")[0] == BN]: parts.remove(o); bpy.data.objects.remove(o)   # (the old face's beard)
        bo = new(BN, F.get("beard_role", "stubble"), BN, vs, [[rm[i] for i in p.vertices] for p in fs])
        # (its edge, picked face by face, runs in steps: the edge points are drawn along the edge toward their neighbours'
        #  middle and laid back on the skin, a few times over, so it ends in a smooth line)
        import bmesh
        bm = bmesh.new(); bm.from_mesh(bo.data)
        for _ in range(F.get("beard_smooth", 10)):
            mv = {}
            for v in bm.verts:
                if not v.is_boundary: continue
                nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
                if len(nb) == 2: mv[v] = v.co * 0.4 + (nb[0].co + nb[1].co) * 0.3
            for v, c in mv.items():
                loc, nor, _, _ = tree0.find_nearest(c); v.co = loc + (nor if nor.y < 0.5 else -nor) * 0.0016 if loc is not None else c
        bm.to_mesh(bo.data); bm.free(); bo.data.update()
        for g in list(bo.vertex_groups): bo.vertex_groups.remove(g)
        hg = {g.index: g.name for g in Hd.vertex_groups}
        for k_, i in enumerate(ids):   # (it goes with the skin under it: the chin's part with the jaw)
            for g in Hd.data.vertices[i].groups: (bo.vertex_groups.get(hg[g.group]) or bo.vertex_groups.new(name=hg[g.group])).add([k_], g.weight, "REPLACE")
        print("FACE:", BN + ",", len(fs), "faces")
    F = (H.get("mpfb") or {}).get("face", {})
    # what sits on the head: nothing inside the skin; what lies on the skin drawn in to it
    tree = BVHTree.FromPolygons(hv, [list(p.vertices) for p in Hd.data.polygons])
    moved = {}
    for o in parts:
        names = {g.name for g in o.vertex_groups}
        if not names or not names <= {"H", "sH", "J", "E"} or part_of(o) in ("face",) or o.name.split(".")[0] in ("eye", "iris", "pupil", "browhair", "lipU", "stache") or o.get("mh"): continue
        base = o.name.split(".")[0]; hug = HUG.get(base, HUG.get(part_of(o)))
        mw = o.matrix_world; inv = mw.inverted(); n_ = 0
        for v in o.data.vertices:
            p = mw @ v.co; loc, nor, _, d = tree.find_nearest(p)
            if loc is None or d > 0.06: continue
            side = (p - loc).dot(nor)
            if side < 0.0015: q = loc + nor * 0.0015
            elif hug is not None and side > hug: q = loc + nor * hug
            else: continue
            v.co = inv @ q; n_ += 1
        if n_: moved[base] = moved.get(base, 0) + n_
        o.data.update()
    print("FACE: head wear set on the new head, points moved:", moved)
    eL, eR = MHI["eyes"]["L"][0], MHI["eyes"]["R"][0]
    RIG["J"] = ("H", tuple(MHI["jaw"])); RIG["M"] = ("H", tuple(MHI["lips"])); RIG["E"] = ("H", tuple((eL + eR) / 2))
    return parts
