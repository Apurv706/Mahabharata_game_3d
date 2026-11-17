# A human body from MakeHuman's base mesh and shape targets (CC0, in mpfb_data; see mpfb_vendor.py), refitted to the
# game's own skeleton, for cast.py. The mesh is sculpted anatomy: a waist, hips, knees, a collar bone and a neck that are
# a person's, where the clay bodies were blended balls.
#
# How: (1) the base mesh is shaped by MakeHuman's macro targets (sex, age, muscle, weight, height, proportions) and by a
# few of its local targets for a hero's build (a V of the back, the chest, the shoulders and the arms); (2) it is moved,
# part by part, from MakeHuman's A pose and joint places to the game's rest pose and joints: each limb's points turn and
# stretch with that limb's bone, the trunk's points are scaled between hips and shoulders, and where two parts share a
# point it goes by both, by their weights; (3) the head and the hands are cut away (the game's own head, with its face
# rig, and its own gripping hands are used) and the cuts are closed.
#
#   build(spec, joints) -> (points, faces, each point's shares of the game's joints)  in the game's units: up = Z, front = -Y, his left = +X
import os, gzip, json, math
from mathutils import Vector, Matrix

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mpfb_data")
_cache = {}

def _load():
    if "obj" in _cache: return _cache["obj"]
    vs, faces, groups, grp = [], [], {}, None
    with gzip.open(os.path.join(DATA, "base.obj.gz"), "rt") as f:
        for ln in f:
            if ln[0] == "v": x, y, z = map(float, ln.split()[1:4]); vs.append(Vector((x, -z, y)) * 0.1)   # decimetres, y up, facing +z -> metres, z up, facing -y
            elif ln[0] == "g": grp = ln.split()[1]
            elif ln[0] == "f":
                fc = [int(t) - 1 for t in ln.split()[1:]]; groups.setdefault(grp, set()).update(fc)
                if grp == "body": faces.append(fc)
    W = {int(k): v for k, v in json.load(gzip.open(os.path.join(DATA, "weights.json.gz"), "rt")).items()}
    T = {}; cur = None
    with gzip.open(os.path.join(DATA, "targets.txt.gz"), "rt") as f:
        for ln in f:
            if ln.startswith("## "): cur = T.setdefault(ln[3:].strip(), [])
            else: p = ln.split(); cur.append((int(p[0]), float(p[1]), -float(p[3]), float(p[2])))
    _cache["obj"] = (vs, faces, groups, W, T); return _cache["obj"]

def _split(v, lo, mid, hi): return {lo: max(0.0, 1 - 2 * v), mid: 1 - abs(2 * v - 1), hi: max(0.0, 2 * v - 1)}

def shape(spec):
    """The base mesh's points under MakeHuman's targets, for spec: sex (0 woman .. 1 man), age (years), muscle, weight,
    height, proportions (0..1, 0.5 the average), eth {caucasian, african, asian}, and local targets {name: weight}."""
    vs0, faces, groups, W, T = _load(); vs = [v.copy() for v in vs0]
    def tg(name, w):
        if abs(w) < 1e-4 or name not in T: return   # (the old's and the very young's shapes by height and by proportions were not taken: mpfb_vendor.py)
        for i, dx, dy, dz in T[name]: vs[i] += Vector((dx, dy, dz)) * (0.1 * w)
    sex = spec.get("sex", 1.0); age = spec.get("age", 25)
    # MakeHuman's ages: a baby of 1, a child of 11, the young of 25, the old of 90; between them by years. (17 November:
    # the baby and the old were added for the whole cast. A grown figure of 25 is as it was.)
    if age <= 11: a = max(0.0, (age - 1) / 10.0); ages = {"baby": 1 - a, "child": a}
    elif age <= 25: a = (age - 11) / 14.0; ages = {"child": 1 - a, "young": a}
    else: a = min(1.0, (age - 25) / 65.0); ages = {"young": 1 - a, "old": a}
    sexes = {"female": 1 - sex, "male": sex}
    mus = _split(spec.get("muscle", 0.5), "minmuscle", "averagemuscle", "maxmuscle"); wgt = _split(spec.get("weight", 0.5), "minweight", "averageweight", "maxweight")
    hg = spec.get("height", 0.5); pr = spec.get("proportions", 0.5)
    eth = spec.get("eth", {"caucasian": 0.5, "african": 0.25, "asian": 0.25})
    for s, ws in sexes.items():
        for g, wa in ages.items():
            if ws * wa < 1e-4: continue
            for e, we in eth.items(): tg(f"macrodetails/{e}-{s}-{g}", ws * wa * we)
            for m, wm in mus.items():
                for w, ww in wgt.items():
                    k = ws * wa * wm * ww
                    if k < 1e-4: continue
                    tg(f"macrodetails/universal-{s}-{g}-{m}-{w}", k)
                    if hg > 0.5: tg(f"macrodetails/height/{s}-{g}-{m}-{w}-maxheight", k * (2 * hg - 1))
                    elif hg < 0.5: tg(f"macrodetails/height/{s}-{g}-{m}-{w}-minheight", k * (1 - 2 * hg))
                    if pr > 0.5: tg(f"macrodetails/proportions/{s}-{g}-{m}-{w}-idealproportions", k * (2 * pr - 1))
                    elif pr < 0.5: tg(f"macrodetails/proportions/{s}-{g}-{m}-{w}-uncommonproportions", k * (1 - 2 * pr))
    for name, w in spec.get("targets", {}).items():
        if name in T: tg(name, w)
        else:
            for s in "lr": tg(name.replace("*", s), w)
    return vs

def _centre(vs, groups, g): ids = groups[g]; return sum((vs[i] for i in ids), Vector()) / len(ids)

def build(spec, J):
    """J: the game's joints for this figure: shoulder (x, z), elbow (x, z), wrist (x, z), hip (x, z), knee (x, z),
    ankle (x, z), toe (x, y, z), neck z, head z, and 'girth' (how much flesh, against MakeHuman's, a limb carries)."""
    _, faces, groups, W, _ = _load(); vs = shape(spec)
    jc = lambda g: _centre(vs, groups, g)
    # First the arms come down from the A pose, each point turning about the shoulder by its share of the arm (the
    # collar's points by half of it): turned by an angle, not blended between two places, the shoulder keeps its round.
    for s, k, sx in (("L", "l", 1), ("R", "r", -1)):
        piv = jc(f"joint-{k}-shoulder"); d0 = (jc(f"joint-{k}-elbow") - piv).normalized()
        d1 = Vector((sx * (J["elbow"][0] - J["shoulder"][0]), 0.0, J["elbow"][1] - J["shoulder"][1])).normalized()
        q = d0.rotation_difference(d1); axis, ang = q.axis, q.angle
        for i, v in enumerate(vs):
            ws = W.get(i)
            if not ws: continue
            w = ws.get("a" + s, 0) + ws.get("e" + s, 0) + ws.get("w" + s, 0) + 0.5 * ws.get("c" + s, 0)
            if w > 1e-4: vs[i] = piv + Matrix.Rotation(ang * min(1.0, w), 3, axis) @ (v - piv)
    src = {}
    for s, sx in (("L", 1), ("R", -1)):
        k = "l" if s == "L" else "r"
        src["a" + s] = (jc(f"joint-{k}-shoulder"), jc(f"joint-{k}-elbow")); src["e" + s] = (jc(f"joint-{k}-elbow"), jc(f"joint-{k}-hand"))
        src["w" + s] = (jc(f"joint-{k}-hand"), jc(f"joint-{k}-hand-3")); src["l" + s] = (jc(f"joint-{k}-upper-leg"), jc(f"joint-{k}-knee"))
        src["k" + s] = (jc(f"joint-{k}-knee"), jc(f"joint-{k}-ankle")); src["f" + s] = (jc(f"joint-{k}-ankle"), jc(f"joint-{k}-foot-2"))
        assert src["a" + s][0].x * sx > 0, "the base mesh's left is not +x"
    # the game's joints
    dst = {}
    for s, sx in (("L", 1), ("R", -1)):
        V = lambda p: Vector((sx * p[0], p[1] if len(p) == 3 else 0.0, p[-1]))
        dst["a" + s] = (V(J["shoulder"]), V(J["elbow"])); dst["e" + s] = (V(J["elbow"]), V(J["wrist"]))
        d_ = (dst["e" + s][1] - dst["e" + s][0]).normalized(); dst["w" + s] = (V(J["wrist"]), V(J["wrist"]) + d_ * (src["w" + s][1] - src["w" + s][0]).length)
        dst["l" + s] = (V(J["hip"]), V(J["knee"])); dst["k" + s] = (V(J["knee"]), V(J["ankle"])); dst["f" + s] = (V(J["ankle"]), V(J["toe"]))
    # the trunk: heights from the hips' joint line to the shoulders' (and on up the neck), widths between the hips' and shoulders'
    sP = (src["lL"][0].z + src["lR"][0].z) / 2; sS = (src["aL"][0].z + src["aR"][0].z) / 2
    dP = J["hip"][1]; dS = J["shoulder"][1]
    sHx = (src["lL"][0].x - src["lR"][0].x) / 2; sSx = (src["aL"][0].x - src["aR"][0].x) / 2
    dHx = J["hip"][0]; dSx = J["shoulder"][0]
    zk = (dS - dP) / (sS - sP)
    sNeck = jc("joint-neck").z; sHead = jc("joint-head").z
    gk = J.get("girth", 1.0)
    print("MPFB joints: shoulder", tuple(round(c, 3) for c in src["aL"][0]), "elbow", tuple(round(c, 3) for c in src["aL"][1]), "hip", tuple(round(c, 3) for c in src["lL"][0]),
          "knee", tuple(round(c, 3) for c in src["lL"][1]), "ankle", tuple(round(c, 3) for c in src["kL"][1]), "neck", round(sNeck, 3), "head", round(sHead, 3))
    # Across: the spine's column and the neck (within RN of the middle) keep the body's own scale; outside it the width
    # grows so the hips' and the shoulders' joints land on the game's (a soft knee between, so no crease shows).
    RN, RW = 0.05, 0.04
    def g(u): return 0.0 if u <= RN else (u - RN) ** 2 / (2 * RW) if u < RN + RW else u - RN - RW / 2
    mH = zk + (dHx - zk * sHx) / g(sHx); mS = zk + (dSx - zk * sSx) / g(sSx)
    def trunk(v):
        t = max(0.0, min(1.0, (v.z - sP) / (sS - sP))); m = mH * (1 - t) + mS * t
        u = abs(v.x); x = (zk * u + (m - zk) * g(u)) * (1 if v.x >= 0 else -1)
        if v.z <= sS: z = dP + (v.z - sP) * zk
        else: z = dS + (v.z - sS) * ((J["neck_top"] - dS) / (sHead - sS))   # the neck: from the shoulders' line up under the game's skull
        return Vector((x * gk, (v.y - SY0) * zk * gk + J.get("trunk_y", 0.0), z))
    SY0 = (src["lL"][0].y + src["lR"][0].y) / 2   # (the trunk is set so the hips' joints lie on the game's line front to back)
    def limb(v, seg):
        h0, t0 = src[seg]; h1, t1 = dst[seg]; d0 = t0 - h0; d1 = t1 - h1
        R = d0.normalized().rotation_difference(d1.normalized()).to_matrix(); ax = d0.normalized()
        r = v - h0; along = r.dot(ax); across = r - ax * along
        k = d1.length / d0.length; rk = gk * (0.5 + 0.5 * k) if seg[0] not in "wf" else (0.5 + 0.5 * k)
        return h1 + R @ (ax * (along * k) + across * rk)
    # the trunk's own map, applied to the limbs' roots so a limb and the trunk agree where they meet
    out = [None] * len(vs)
    used = sorted({i for fc in faces for i in fc})
    for i in used:
        ws = W.get(i, {"P": 1.0}); t = sum(ws.values()) or 1.0
        p = Vector()
        for seg, w in ws.items():
            if seg in src: p += limb(vs[i], seg) * (w / t)
            else: p += trunk(vs[i]) * (w / t)
        out[i] = p
    # what is cut away: the head (the game's own is set on the neck), the hands (the game's hands grip)
    def dom(i):
        ws = W.get(i, {"P": 1.0}); return max(ws, key=ws.get)
    keep = []
    for fc in faces:
        ds = [dom(i) for i in fc]
        if any(d == "H" for d in ds): continue
        if all(d[0] == "w" for d in ds): continue
        keep.append(fc)
    used = sorted({i for fc in keep for i in fc}); remap = {i: k for k, i in enumerate(used)}
    pts = [out[i] for i in used]; fs = [[remap[i] for i in fc] for fc in keep]
    # the neck goes on up into the game's head, narrowing, so its top lies hidden inside the skull
    nz0, nz1 = J["neck_tuck"]
    cy = J.get("neck_y", 0.0)
    for p in pts:
        if p.z > nz0:
            u = min(1.0, (p.z - nz0) / (nz1 - nz0)); k = 1 - 0.45 * u * u
            p.x *= k; p.y = cy + (p.y - cy) * k
    # MakeHuman's own skin weights, folded onto the game's joints (the neck shares the trunk's and the head's)
    def game_w(i):
        out = {}
        for seg, w in W.get(i, {"P": 1.0}).items():
            for j, k in ((("T", 0.5), ("H", 0.5)) if seg == "N" else ((seg, 1.0),)):
                j = j if len(j) == 1 else j[0] + j[1]
                out[j] = out.get(j, 0) + w * k
        t = sum(out.values()) or 1.0; return {j: w / t for j, w in out.items()}
    return pts, fs, [game_w(i) for i in used]


# ---- The whole person (17 November, second try): MakeHuman's own head, face and hands kept, not the game's. -------------
HEADSEG = ("H", "J", "E", "Hm")
def _rot_about(p, axis, ang):
    R = Matrix.Rotation(ang, 4, axis); return Matrix.Translation(p) @ R @ Matrix.Translation(-p)

def build_full(spec, J):
    """As build(), but the head and the hands are MakeHuman's. J also holds: eye_c (his left eye's centre), crown (the
    top of the skull's height), hand (the hands' size against life). Returns a dict: pts, faces, w (each point's shares
    of the game's joints), seg (each point's strongest MakeHuman part), and the places the game needs: eyes (centre,
    radius) each side, jaw, mouth, the knuckles (g) and middle joints (h) of each hand, and the hollow of each fist (grip)."""
    _, faces, groups, W, _ = _load(); vs = shape(spec)
    jc = lambda g: _centre(vs, groups, g)
    def wsum(ws, keys): return sum(v for k, v in ws.items() if k in keys or any(k.startswith(p) for p in keys if p.endswith("*")))
    # 1. arms down, as build()
    for s, k, sx in (("L", "l", 1), ("R", "r", -1)):
        piv = jc(f"joint-{k}-shoulder"); d0 = (jc(f"joint-{k}-elbow") - piv).normalized()
        d1 = Vector((sx * (J["elbow"][0] - J["shoulder"][0]), 0.0, J["elbow"][1] - J["shoulder"][1])).normalized()
        q = d0.rotation_difference(d1); axis, ang = q.axis, q.angle
        for i, v in enumerate(vs):
            ws = W.get(i)
            if not ws: continue
            w = sum(x for kk, x in ws.items() if kk in ("a" + s, "e" + s, "w" + s) or (kk[0] == "F" and kk[-1] == s)) + 0.5 * ws.get("c" + s, 0)
            if w > 1e-4: vs[i] = piv + Matrix.Rotation(ang * min(1.0, w), 3, axis) @ (v - piv)
    # 2. the hands close: each finger's three bones turn at their joints about the hand's breadth, the thumb comes over
    #    them. A point goes by its bones' shares (MakeHuman's), each bone carried by the ones above it.
    info = {"g": {}, "h": {}, "grip": {}}
    curl = spec.get("curl", (72, 88, 50)); thumb = spec.get("thumb", (30, 25, 35))
    hollow_src = {}
    for s, k, sx in (("L", "l", 1), ("R", "r", -1)):
        P0 = {(n, b): jc(f"joint-{k}-finger-{n}-{b}") for n in range(1, 6) for b in range(1, 5)}   # (the joints before the hand closes)
        W0 = jc(f"joint-{k}-hand"); D = (jc(f"joint-{k}-finger-3-1") - W0).normalized()
        lat = (jc(f"joint-{k}-finger-2-1") - jc(f"joint-{k}-finger-5-1")).normalized()
        Np = D.cross(lat).normalized()
        if Np.dot(Vector((-sx, 0, 0))) < 0: Np = -Np            # the palm's side: toward the thigh
        M = {}                                                  # bone -> its matrix
        K = sum((P0[(n, 1)] for n in range(2, 6)), Vector()) / 4; pk = (P0[(3, 2)] - P0[(3, 1)]).length
        C = K + D * (spec.get("grip_down", 0.0) * pk) + Np * (spec.get("palm", 0.006) + spec.get("haft", 0.017))   # where the haft lies
        for n in range(2, 6):
            best = None
            for sg_ in (1, -1):   # (each finger is turned the way that brings its tip round the haft: tried both ways)
                Mc = Matrix.Identity(4); ms = {}
                for b in range(1, 4):
                    piv = Mc @ P0[(n, b)]; R = _rot_about(piv, lat, sg_ * math.radians(curl[b - 1])); Mc = R @ Mc; ms[f"F{n}{b}{s}"] = Mc.copy()
                d_ = ((Mc @ P0[(n, 4)]) - C).length
                if best is None or d_ < best[0]: best = (d_, ms)
            M.update(best[1])
        Mc = Matrix.Identity(4)
        for b in range(1, 4):   # the thumb: across toward the fingers, then folded
            piv = Mc @ jc(f"joint-{k}-finger-1-{b}"); tip = Mc @ jc(f"joint-{k}-finger-1-{b + 1}")
            ax = ((tip - piv).normalized().cross(Np)).normalized() if b > 1 else D
            a = math.radians(thumb[b - 1]); sg_ = 1 if ((_rot_about(piv, ax, 0.08) @ tip) - piv).dot(Np) > (tip - piv).dot(Np) else -1
            R = _rot_about(piv, ax, sg_ * a)
            Mc = R @ Mc; M[f"F1{b}{s}"] = Mc.copy()
        for i, v in enumerate(vs):
            ws = W.get(i)
            if not ws or not any(kk in M for kk in ws): continue
            t = sum(ws.values()); p = Vector()
            for kk, x in ws.items(): p += ((M[kk] @ v) if kk in M else v) * (x / t)
            vs[i] = p
        def J_(n, b): return M.get(f"F{n}{b - 1}{s}", Matrix.Identity(4)) @ P0[(n, b)] if b > 1 else P0[(n, b)]
        # the fist's hollow: against the palm at the knuckles, one haft's breadth out from the palm's skin; the fingers
        # are turned round it (spec "curl": the three joints' angles)
        hollow_src[s] = C; info.setdefault("hollow_r", {})[s] = spec.get("haft", 0.017)
        info["g"][s] = sum((J_(n, 1) for n in range(2, 6)), Vector()) / 4; info["h"][s] = sum((J_(n, 2) for n in range(2, 6)), Vector()) / 4
    # 3. the maps, as build(), with the head set by its eyes and the top of its skull, and the hands as one piece with the wrist
    src = {}
    for s, sx in (("L", 1), ("R", -1)):
        k = "l" if s == "L" else "r"
        src["a" + s] = (jc(f"joint-{k}-shoulder"), jc(f"joint-{k}-elbow")); src["e" + s] = (jc(f"joint-{k}-elbow"), jc(f"joint-{k}-hand"))
        src["w" + s] = (jc(f"joint-{k}-hand"), jc(f"joint-{k}-hand-3")); src["l" + s] = (jc(f"joint-{k}-upper-leg"), jc(f"joint-{k}-knee"))
        src["k" + s] = (jc(f"joint-{k}-knee"), jc(f"joint-{k}-ankle")); src["f" + s] = (jc(f"joint-{k}-ankle"), jc(f"joint-{k}-foot-2"))
    sP = (src["lL"][0].z + src["lR"][0].z) / 2; sS = (src["aL"][0].z + src["aR"][0].z) / 2
    dP = J["hip"][1]; dS = J["shoulder"][1]; zk = (dS - dP) / (sS - sP)
    # (17 November, the whole cast: a child's body, a woman's, an old man's are smaller than the grown man this was made
    #  on, and all are drawn out to the game's one skeleton. With "rel" (the trunk's scale on that man) a figure's hands
    #  and the thickness of its limbs go by its own scale, so a child keeps a child's hands and legs. Without it, as before.)
    ZR = zk / spec["rel"] if spec.get("rel") else 1.0
    HK = J.get("hand", 1.0) * ZR; dst = {}
    for s, sx in (("L", 1), ("R", -1)):
        V = lambda p: Vector((sx * p[0], p[1] if len(p) == 3 else 0.0, p[-1]))
        dst["a" + s] = (V(J["shoulder"]), V(J["elbow"])); dst["e" + s] = (V(J["elbow"]), V(J["wrist"]))
        d_ = (dst["e" + s][1] - dst["e" + s][0]).normalized(); dst["w" + s] = (V(J["wrist"]), V(J["wrist"]) + d_ * (src["w" + s][1] - src["w" + s][0]).length * HK)
        dst["l" + s] = (V(J["hip"]), V(J["knee"])); dst["k" + s] = (V(J["knee"]), V(J["ankle"])); dst["f" + s] = (V(J["ankle"]), V(J["toe"]))
    sHx = (src["lL"][0].x - src["lR"][0].x) / 2; sSx = (src["aL"][0].x - src["aR"][0].x) / 2
    dHx = J["hip"][0]; dSx = J["shoulder"][0]; gk = J.get("girth", 1.0)
    SY0 = (src["lL"][0].y + src["lR"][0].y) / 2
    # the head: a likeness kept whole (one scale), set so the eyes sit where the game's did and the skull's top as high
    eL, eR = jc("joint-l-eye"), jc("joint-r-eye"); Es = (eL + eR) / 2
    head_ids = [i for i in range(len(vs)) if W.get(i) and max(W[i], key=W[i].get) in HEADSEG]
    crown_s = max(vs[i].z for i in head_ids)
    # (neck_lift: the head stands this much higher than the game's old head did, on a neck that long: the clay figures
    #  had almost none, their chins at the shoulders' height)
    Eg = Vector((0.0, J["eye_c"][1], J["eye_c"][2])); sH = (J["crown"] - Eg.z) / (crown_s - Es.z); Eg.z += J.get("neck_lift", 0.0)
    def head(v): return Eg + (v - Es) * sH
    sHead = jc("joint-head").z; sNk = jc("joint-neck").z; neck_top = head(jc("joint-head")).z
    RN, RW = 0.05, 0.04
    def g(u): return 0.0 if u <= RN else (u - RN) ** 2 / (2 * RW) if u < RN + RW else u - RN - RW / 2
    mH = zk + (dHx - zk * sHx) / g(sHx); mS = zk + (dSx - zk * sSx) / g(sSx)
    def trunk(v):
        t = max(0.0, min(1.0, (v.z - sP) / (sS - sP))); m = mH * (1 - t) + mS * t
        u = abs(v.x); x = (zk * u + (m - zk) * g(u)) * (1 if v.x >= 0 else -1)
        z = dP + (v.z - sP) * zk   # (the shoulders' tops too: only the neck stretches, below, to meet the head)
        return Vector((x * gk, (v.y - SY0) * zk * gk, z))
    def neck(v):   # the neck goes from the trunk's map at the shoulders to the head's at the skull
        u = max(0.0, min(1.0, (v.z - sS) / (sHead - sS))); u = u * u * (3 - 2 * u); return trunk(v).lerp(head(v), u)
    def limb(v, seg):
        h0, t0 = src[seg]; h1, t1 = dst[seg]; d0 = t0 - h0; d1 = t1 - h1
        R = d0.normalized().rotation_difference(d1.normalized()).to_matrix(); ax = d0.normalized()
        r = v - h0; along = r.dot(ax); across = r - ax * along
        k = d1.length / d0.length; rk = (gk if seg[0] not in "wf" else 1.0) * (0.5 * ZR + 0.5 * k)
        return h1 + R @ (ax * (along * k) + across * rk)
    def mapv(v, ws):
        t = sum(ws.values()) or 1.0; p = Vector()
        for seg, w in ws.items():
            if seg[0] == "F": seg = "w" + seg[-1]
            if seg in src: q = limb(v, seg)
            elif seg in HEADSEG: q = head(v)
            elif seg == "N": q = neck(v)
            else: q = trunk(v)
            p += q * (w / t)
        return p
    used = sorted({i for fc in faces for i in fc}); remap = {i: k for k, i in enumerate(used)}
    pts = [mapv(vs[i], W.get(i, {"P": 1.0})) for i in used]; fs = [[remap[i] for i in fc] for fc in faces]
    if spec.get("rel"):   # (on a narrow frame the thighs meet: a leg's skin does not cross the middle into the other leg)
        for n_, i in enumerate(used):
            ws = W.get(i)
            if not ws: continue
            for sd_, sx_ in (("L", 1), ("R", -1)):
                if sum(w for k_, w in ws.items() if k_[0] in "lkf" and k_[-1] == sd_) > 0.5 * sum(ws.values()) and pts[n_].x * sx_ < 0.001: pts[n_].x = 0.001 * sx_
    for s in "LR":
        ws = {"w" + s: 1.0}
        info["g"][s] = mapv(info["g"][s], ws); info["h"][s] = mapv(info["h"][s], ws); info["grip"][s] = mapv(hollow_src[s], ws)
    rad = lambda grp: max((vs[i] - jc(grp.replace("helper", "joint"))).length for i in groups[grp]) * sH
    info["eyes"] = {"L": (head(eL), rad("helper-l-eye")), "R": (head(eR), rad("helper-r-eye"))}
    def lid_ang(k):   # the angle, about the eye, from the upper lid's edge down to the lower's
        c = jc(f"joint-{k}-eye"); u = jc(f"joint-{k}-upperlid") - c; l = jc(f"joint-{k}-lowerlid") - c
        u = Vector((0, u.y, u.z)).normalized(); l = Vector((0, l.y, l.z)).normalized(); return math.acos(max(-1.0, min(1.0, u.dot(l))))
    info["lidr"] = 0.5 * (lid_ang("l") + lid_ang("r"))
    info["lids"] = {"L": (head(jc("joint-l-upperlid")), head(jc("joint-l-lowerlid"))), "R": (head(jc("joint-r-upperlid")), head(jc("joint-r-lowerlid")))}   # (the lids' edges, for the lash line)
    info["neck_lift"] = J.get("neck_lift", 0.0)
    info["jaw"] = head(jc("joint-jaw")); info["mouth"] = head(jc("joint-mouth")); info["head_scale"] = sH
    # the game's joints for each point (the neck shares the trunk's and the head's; the fingers' bones become the
    # game's two finger joints, the knuckles g and the middle joints h; the thumb stays with the hand)
    def game_w(i):
        out = {}
        for seg, w in W.get(i, {"P": 1.0}).items():
            if seg == "N": parts = (("T", 0.5), ("H", 0.5))
            elif seg == "Hm": parts = (("H", 1.0),)
            elif seg[0] == "F": n, b, s = seg[1], seg[2], seg[3]; parts = ((("w" if n == "1" else "g" if b == "1" else "h") + s, 1.0),)
            else: parts = ((seg, 1.0),)
            for j, k in parts: out[j] = out.get(j, 0) + w * k
        t = sum(out.values()) or 1.0; return {j: w / t for j, w in out.items()}
    dom = lambda i: (lambda ws: max(ws, key=ws.get))(W.get(i, {"P": 1.0}))
    # the middle line a point lies around (to tell the skin's outside): the nearest bone's line, or the trunk's axis
    bones = [dst[k] for k in dst] + [(Vector((0, 0, dP)), Vector((0, 0, dS + 0.1))), (Eg + Vector((0, 0.02, -0.08)), Eg + Vector((0, 0.02, 0.06)))]
    def axis(p):
        best = None
        for h, t in bones:
            d = t - h; k = max(0.0, min(1.0, (p - h).dot(d) / d.dot(d))); q = h + d * k; dd = (p - q).length
            if best is None or dd < best[0]: best = (dd, q)
        return best[1]
    info["axis"] = axis
    gw = [game_w(i) for i in used]
    if spec.get("rel"):   # (a hip's skin goes with its own side's leg: on a small frame some of it had the other leg's share, and a step dented the far hip)
        for n_, w_ in enumerate(gw):
            for j_ in list(w_):
                if j_[0] in "lkf" and len(j_) == 2 and pts[n_].x * (1 if j_[1] == "L" else -1) < -0.02:
                    o_ = j_[0] + ("R" if j_[1] == "L" else "L"); w_[o_] = w_.get(o_, 0) + w_.pop(j_)
    info.update(pts=pts, faces=fs, w=gw, seg=[dom(i) for i in used], raw=[W.get(i, {"P": 1.0}) for i in used])
    print("MPFB whole: fist hollow radius %.4f (to the finger bones' line); trunk scale %.3f, hands %.3f" % (info["hollow_r"]["L"], zk, HK))
    print("MPFB whole: head scale %.3f, crown %.3f, eyes at" % (sH, J["crown"]), tuple(round(c, 3) for c in info["eyes"]["L"][0]), "r %.4f" % info["eyes"]["L"][1], "grip L", tuple(round(c, 3) for c in info["grip"]["L"]))
    return info
