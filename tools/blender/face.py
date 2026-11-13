# A head built from the anatomy of a human face, not from lumps of clay: the skull's two outlines (front and side)
# lofted through level sections, the features set on it where a face has them, and a mesh whose lines run the way a
# face's own lines run (round the eye, round the mouth, down the nose). Every measure below is a real one, scaled to
# the model's head (about 1.28 of life in model units; the game then draws a grown head at 0.88).
#   thirds of the face: hairline - brow - nose base - chin, each about a third; the eyes at half the head's height;
#   an eye's width between the eyes; the nose as wide as that gap; the mouth as wide as the pupils are apart, a third
#   of the way from nose to chin; the ear from brow to nose base, behind the jaw; the jaw's angle at the mouth's level.
# One set of numbers (FACE in cast_specs.py) makes one person: each number is a thing a face differs by.
import math, bisect

def clamp(x, a, b): return a if x < a else (b if x > b else x)
def lerp(a, b, t): return a + (b - a) * t
def sstep(a, b, x):
    t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)
def gs(d, s): return math.exp(-(d / s) ** 2)
def vadd(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def vsub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def vmul(a, k): return (a[0] * k, a[1] * k, a[2] * k)
def vdot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def vcross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def vlen(a): return math.sqrt(vdot(a, a))
def vnorm(a):
    l = vlen(a) or 1.0; return (a[0] / l, a[1] / l, a[2] / l)
def vlerp(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)

class Curve:   # a smooth line through given points that never overshoots them (monotone cubic)
    def __init__(self, pts):
        pts = sorted(pts); self.x = [p[0] for p in pts]; self.y = [p[1] for p in pts]; n = len(pts)
        h = [self.x[i + 1] - self.x[i] for i in range(n - 1)]; d = [(self.y[i + 1] - self.y[i]) / h[i] for i in range(n - 1)]
        m = [0.0] * n; m[0] = d[0]; m[-1] = d[-1]
        for i in range(1, n - 1):
            if d[i - 1] * d[i] > 0:
                w1 = 2 * h[i] + h[i - 1]; w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
        self.m = m
    def __call__(self, x):
        X = self.x
        if x <= X[0]: return self.y[0]
        if x >= X[-1]: return self.y[-1]
        i = bisect.bisect_right(X, x) - 1; h = X[i + 1] - X[i]; t = (x - X[i]) / h; t2 = t * t; t3 = t2 * t
        return (2 * t3 - 3 * t2 + 1) * self.y[i] + (t3 - 2 * t2 + t) * h * self.m[i] + (-2 * t3 + 3 * t2) * self.y[i + 1] + (t3 - t2) * h * self.m[i + 1]

# What one face differs from another by. 1 or 0 is the plain grown man; see cast_specs.py for who has what.
DEF = dict(
  hw=1.0, hh=1.0, hl=1.0,                      # the skull: breadth, height of the vault, length to the back
  fores=0.0,                                   # the forehead: +1 slopes back, -1 stands upright and full
  brow=0.5,                                    # the ridge of bone over the eyes (0 smooth .. 1.2 heavy)
  eye=1.0, gap=1.0, eyez=0.0, tilt=0.07, open=1.0, deep=0.0, hood=0.0, bag=0.0,   # eyes: size, how far apart, height, the outer corner's lift, how wide open, how deep set, the lid's fold, the pouch below
  browth=1.0, browarch=0.35, browtilt=0.0, browz=0.0, browlen=1.0, browgap=1.0,   # the eyebrows' hair
  nosel=1.0, nosep=1.0, nosew=1.0, bridgew=1.0, bridgeh=1.0, hump=0.0, tip=0.0, tipw=1.0,   # nose: length, how far it stands out, width at the wings, the bridge's width and height, a hump (+) or a scoop (-), the tip turned up (+) or down (-), the tip's breadth
  cheekw=1.0, cheekp=0.5, full=0.0,            # cheekbones: width across, how proud; the cheek's flesh: full (+) or hollow (-)
  jaww=1.0, jawh=0.0, jawsq=0.5, chinw=1.0, lowh=1.0, chinp=0.0, jowl=0.0,   # jaw: width at the angles, the angle's height, square or round; chin: width, the lower face's length, forward (+) or back (-); jowls
  lipw=1.0, lipu=1.0, lipl=1.0, mouthz=0.0, lipp=0.0, corner=0.0,   # mouth: width, the upper lip's fullness, the lower's, height, how far forward, corners up (+) or down (-)
  ear=1.0, flare=1.0, lobe=1.0, fold=0.0, temple=0.0,   # ears; the fold from nose to mouth's corner; hollow temples
  hairline=0.0, recede=0.0, sideburn=0.0, hairth=1.0, lash=1.0)   # the hairline's height, how far it has gone back at the temples, the sideburn's length; the hair's thickness; the lashes' weight

JF = 9          # the last column set by the face's own features (the eye's outer corner)
JB = 22         # the column down the back of the head
NU = 2 * JB

class Face:
    def __init__(s, P, she=False):
        for k in P:
            if k not in DEF: raise KeyError("face: no such measure: " + k)
        s.P = P = dict(DEF, **P); s.she = she
        # ---- levels (z, from the head's centre line HZ): the thirds of the face
        s.ze = -0.006 + P["eyez"]; s.zbr = s.ze + 0.028; s.zna = s.ze + 0.009
        s.zsn = s.ze - 0.052 * P["nosel"]; s.LF = 0.088 * P["lowh"]
        s.zst = s.zsn - 0.31 * s.LF + P["mouthz"]; s.zsul = s.zst - 0.255 * s.LF; s.zpog = s.zsn - 0.80 * s.LF; s.zmen = s.zsn - s.LF
        s.zgon = s.zst - 0.024 + P["jawh"]; s.ztop = 0.138 * P["hh"]; s.zeq = 0.045; s.zzy = s.ze - 0.028
        s.ztip = s.zsn + 0.0085 + 0.004 * P["tip"]; s.zc3 = s.zmen + 0.012; s.z0 = s.zbr - 0.003; s.ytop = 0.018
        # ---- half-widths of the front outline
        s.Wc = 0.098 * P["hw"]; s.Wz = 0.0905 * P["cheekw"]; s.Wg = 0.072 * P["jaww"]; s.Wch = 0.030 * P["chinw"]
        kj = 0.85 - 0.3 * P["full"]; zj = lambda u: s.zc3 + (s.zgon - s.zc3) * u; wj = lambda u: s.Wch + (s.Wg - s.Wch) * u ** kj
        s._w = Curve([(s.zmen, 0.0), (s.zmen + 0.0016, 0.48 * s.Wch), (s.zmen + 0.0055, 0.84 * s.Wch), (s.zc3, s.Wch), (zj(0.25), wj(0.25)), (zj(0.5), wj(0.5)), (zj(0.75), wj(0.75)), (s.zgon, s.Wg),
                      (s.zst + 0.006, lerp(s.Wg, s.Wz, 0.5)), (s.zsn, lerp(s.Wg, s.Wz, 0.64)), (s.zzy, s.Wz), (s.ze, max(0.957 * s.Wc, 0.99 * s.Wz)), (s.zbr, 0.992 * s.Wc), (s.zeq, s.Wc)])
        # ---- the side outline: the face's plane in front (the nose, lips and brow stand on it), the skull behind
        cp = P["chinp"]; lp = P["lipp"]; s.Fg = 0.117; s.pf = 2.25 - 0.35 * P["fores"]
        s._F = Curve([(s.zmen, 0.101 + 0.005 * cp), (s.zmen + 0.0016, 0.107 + 0.006 * cp), (s.zmen + 0.0055, 0.1125 + 0.007 * cp), (s.zpog, 0.1155 + 0.007 * cp), (s.zsul, 0.112 + 0.003 * lp + 0.003 * cp),
                      (s.zst, 0.1165 + 0.004 * lp), (s.zsn, 0.113 + 0.002 * lp), (s.zzy, 0.105), (s.ze - 0.016, 0.097), (s.ze, 0.092), (s.zna, 0.097), (s.z0 - 0.004, s.Fg - 0.0012), (s.z0, s.Fg)])
        s.Yb = 0.132 * P["hl"]
        ywg = 0.014
        s._yw = Curve([(s.zmen, -(s._F(s.zmen) - 0.006)), (s.zc3, -(s._F(s.zc3) - 0.030)), (s.zgon, ywg), (s.zst + 0.004, 0.012), (s.zsn, 0.006), (s.zzy, -0.004), (s.ze, 0.020), (s.zbr, 0.027), (s.zeq, 0.030), (0.1, 0.027), (s.ztop, s.ytop)])
        s._ybs = Curve([(s.zgon + 0.012, 0.045), (-0.066, 0.086), (-0.045, s.Yb - 0.026), (-0.02, s.Yb - 0.008), (0.016, s.Yb - 0.0003), (0.02, s.Yb)])
        s.zj1 = s.zgon + 0.012
        s._db = Curve([(s.zmen, 0.003), (s.zc3, 0.006), (s.zgon, 0.012), (s.zj1, s._ybs(s.zj1) - s._yw(s.zj1))])
        s._nf = Curve([(s.zmen, 2.0), (s.zc3, 2.0), (s.zgon, 1.9 + 0.35 * P["jawsq"]), (s.zst, 2.3), (s.zsn, 2.33), (s.zzy, 2.3 + 0.25 * P["cheekp"]), (s.ze, 2.25), (s.zbr, 2.15), (s.zeq, 2.05), (s.ztop, 2.0)])
        s._nb = Curve([(s.zmen, 3.0), (s.zgon, 3.0), (-0.066, 2.4), (-0.02, 2.3), (s.zeq, 2.25), (s.ztop, 2.0)])
        s.eyes_setup(); s.mouth_setup(); s.grid_setup()

    # ---- the loft ------------------------------------------------------------------------------------------------
    def w(s, z):
        if z >= s.zeq:
            t = min(1.0, (z - s.zeq) / (s.ztop - s.zeq)); return s.Wc * max(0.0, 1 - t ** 2.2) ** (1 / 2.2)
        return max(0.0, s._w(z))
    def F(s, z):
        if z >= s.z0:
            t = min(1.0, (z - s.z0) / (s.ztop - s.z0)); return -s.ytop + (s.Fg + s.ytop) * max(0.0, 1 - t ** s.pf) ** (1 / s.pf)
        return s._F(z)
    def yw(s, z): return s._yw(z)
    def yb(s, z):
        if z >= 0.02:
            t = min(1.0, (z - 0.02) / (s.ztop - 0.02)); return s.ytop + (s.Yb - s.ytop) * max(0.0, 1 - t ** 2.3) ** (1 / 2.3)
        if z >= s.zj1: return s._ybs(z)
        return s._yw(z) + s._db(z)
    def base(s, z, t):
        z = clamp(z, s.zmen, s.ztop); w = s.w(z); yw = s._yw(z)
        if t <= math.pi / 2:
            n = s._nf(z); return (w * math.sin(t) ** (2 / n), yw - (yw + s.F(z)) * max(0.0, math.cos(t)) ** (2 / n), z)
        n = s._nb(z); return (w * math.sin(t) ** (2 / n), yw + (s.yb(z) - yw) * max(0.0, -math.cos(t)) ** (2 / n), z)
    def tof(s, x, z):   # the ring's own parameter where the front of the head is x across, at height z
        w = s.w(z)
        if w < 1e-6: return 0.0
        return math.asin(min(1.0, max(0.0, x / w)) ** (s._nf(z) / 2))
    def normal(s, z, t):
        z = clamp(z, s.zmen + 4e-4, s.ztop - 4e-4); dt = 2e-3; dz = 3e-4
        a = vsub(s.base(z, min(math.pi, t + dt)), s.base(z, max(0.0, t - dt))); b = vsub(s.base(z + dz, t), s.base(z - dz, t))
        n = vcross(a, b)
        if vlen(n) < 1e-12: return (0.0, -1.0, 0.0)
        return vnorm(n)
    def out(s, z, t):   # the way a feature stands out from the skull: level (so a feature's height is the height it was given)
        n = s.normal(z, t); l = math.hypot(n[0], n[1]); return (n[0] / l, n[1] / l, 0.0) if l > 0.3 else n
    def surf(s, x, z, extra=0.0, feat=True):   # a point of the face's skin, x across and z high (front of the head)
        t = s.tof(abs(x), z); b = s.base(z, t); n = s.out(z, t); h = (s.disp(b[0], b[1], b[2]) if feat else 0.0) + extra
        p = vadd(b, vmul(n, h)); return (p[0] if x >= 0 else -p[0], p[1], p[2])
    def at(s, z, t, extra=0.0):
        b = s.base(z, t); n = s.out(z, t); return vadd(b, vmul(n, s.disp(b[0], b[1], b[2]) + extra))

    # ---- what stands on the loft: brow, nose, cheekbone, the mound of the mouth, chin ----------------------------------
    def nose(s, ax, z):   # the bridge of the nose, from the root between the eyes down to just above the tip (the tip, the wings and the nostrils are set point by point: nosept)
        P = s.P; zn, zt = s.zna, s.ztip; nw = 0.0225 * P["nosew"]; bw = P["bridgew"]; hn = 0.017 * P["bridgeh"]; ht = 0.041 * P["nosep"]
        if z < zt + 0.002: return 0.0
        sr = (zn - z) / (zn - zt); fade = sstep(zn + 0.016, zn - 0.002, z)
        hd = hn if sr < 0 else lerp(hn, ht, sr) + P["hump"] * 0.0065 * gs(sr - 0.38, 0.26) * (1 - sr ** 3)
        sc = clamp(sr, 0.0, 1.0); wb = lerp(0.0085 * bw, nw * 0.9, sstep(0.1, 1.0, sc) ** 1.3); wc = lerp(0.003 * bw, 0.0055 * P["tipw"], sc)
        u = (ax - wc) / max(1e-5, wb - wc); p = 1.0 if u <= 0 else (0.5 + 0.5 * math.cos(math.pi * min(u, 1.0))) ** 0.85
        return hd * p * fade
    NOSE = ("tipu", "tipl", "col", "sn")
    def nosept(s, name, j):   # the base of the nose: the tip, the column under it, the two wings and the hollows of the nostrils between
        P = s.P; nw = 0.0225 * P["nosew"]; ht = 0.041 * P["nosep"]; zt, zs = s.ztip, s.zsn; tw = P["tipw"]; zc = min(zs + 0.0035, zt - 0.0025)
        X = {"tipu": (0, 0.28 * nw * tw, 0.60 * nw, 0.90 * nw, nw + 0.0045), "tipl": (0, 0.30 * nw * tw, 0.66 * nw, nw, nw + 0.0045), "col": (0, 0.22 * nw, 0.56 * nw, 0.96 * nw, nw + 0.004), "sn": (0, 0.2 * nw, 0.52 * nw, 0.86 * nw, nw + 0.003)}[name]
        Zr = {"tipu": (zt + 0.0058, zt + 0.005, zt + 0.0045, zt + 0.006, zt + 0.006), "tipl": (zt + 0.0006, zt, zt - 0.0005, zs + 0.007, zs + 0.007), "col": (zc - 0.0006, zc, zc - 0.0005, zs + 0.0015, zs + 0.0015), "sn": (zs - 0.003,) * 5}[name]
        Hh = {"tipu": (0.93, 0.84, 0.42, 0.10, 0.0), "tipl": (1.0, 0.92, 0.56, 0.40, 0.02), "col": (0.76, 0.50, 0.26, 0.26, 0.0), "sn": (0.16, 0.10, 0.05, 0.0, 0.0)}[name]
        return s.surf(X[j], Zr[j], Hh[j] * ht, feat=False)
    def disp(s, x, y, z):
        P = s.P; ax = abs(x); f = -y; front = sstep(0.015, 0.06, f)
        if front <= 0: 
            return -0.004 * P["temple"] * gs(y + 0.05, 0.03) * gs(z - 0.03, 0.03) if ax > 0.05 else 0.0
        h = 0.0042 * P["brow"] * gs(z - s.zbr, 0.0085) * gs(ax - 0.034, 0.032) + 0.0025 * P["brow"] * gs(z - (s.zbr - 0.005), 0.009) * gs(ax, 0.014)
        h += s.nose(ax, z)
        h += 0.0036 * P["cheekp"] * gs(ax - 0.062 * P["cheekw"], 0.022) * gs(z - s.zzy, 0.016)
        h += (0.0018 + 0.006 * P["full"]) * gs(ax - 0.05, 0.026) * gs(z - (s.zst + 0.014), 0.028)
        h += 0.0025 * gs(ax, 0.03) * gs(z - s.zst, 0.02)
        h -= 0.004 * gs(ax, 0.022) * gs(z - s.zsul, 0.0075)
        h += (0.003 + 0.002 * max(0.0, P["chinp"])) * gs(ax, 0.017 * P["chinw"]) * gs(z - s.zpog, 0.012)
        h += 0.005 * P["jowl"] * gs(ax - 0.044, 0.02) * gs(z - (s.zpog + 0.012), 0.015)
        if P["fold"]:   # the fold from the nose's wing to beyond the mouth's corner
            a = (0.0225 * P["nosew"] + 0.004, s.zsn + 0.007); b = (s.mw + 0.007, s.zst - 0.005); ux, uz = b[0] - a[0], b[1] - a[1]; l2 = ux * ux + uz * uz
            k = clamp(((ax - a[0]) * ux + (z - a[1]) * uz) / l2, 0.0, 1.0); d = math.hypot(ax - a[0] - ux * k, z - a[1] - uz * k); side = 1 if (ax - a[0] - ux * k) > 0 else -1
            h += P["fold"] * (-0.0028 * gs(d, 0.0045) + (0.0022 * gs(d - 0.009, 0.007) if side > 0 else 0.0))
        if P["bag"]: h += P["bag"] * (0.0022 * gs(ax - s.cx, 0.017) * gs(z - (s.ze - 0.0215), 0.0055) - 0.002 * gs(ax - s.cx, 0.02) * gs(z - (s.ze - 0.03), 0.005))
        h -= 0.003 * P["temple"] * gs(ax - 0.074, 0.02) * gs(z - (s.zbr + 0.012), 0.022)
        return h * front

    # ---- the eye: a ball in its socket, and lids that lie on the ball and meet at two corners -------------------------
    def eyes_setup(s):
        P = s.P; s.cx = 0.0395 * P["gap"]; s.rl = 0.0205 * P["eye"]; s.rb = s.rl - 0.0016
        psi = 0.15; tau = P["tilt"]
        a = vnorm((math.cos(psi) * math.cos(tau), math.sin(psi) * math.cos(tau), math.sin(tau)))   # the line through the two corners, outward: the outer corner lies further back, and higher by the tilt
        n = (math.sin(psi), -math.cos(psi), 0.0); n = vnorm(vsub(n, vmul(a, vdot(n, a)))); s.ea, s.en, s.eu = a, n, vcross(n, a)
        s.fe = 0.0985 - 0.004 * P["deep"] - s.rl; s.ec = (s.cx, -s.fe, s.ze)
        s.TU = 0.43 * P["open"]; s.TL = 0.28 * P["open"]; s.EU = [-1.0, -0.68, -0.38, 0.0, 0.40, 0.72, 1.0]
    def lidpt(s, u, th, r=None):
        r = r or s.rl; b = math.asin(clamp(u, -1.0, 1.0)); cb = math.cos(b)
        d = vadd(vmul(s.ea, math.sin(b)), vadd(vmul(s.en, cb * math.cos(th)), vmul(s.eu, cb * math.sin(th)))); return vadd(s.ec, vmul(d, r))
    def thU(s, u): return s.TU * (1 - 0.10 * u)
    def thL(s, u): return -s.TL * (1 + 0.12 * u)

    # ---- the mouth: two lips with a line between them that opens ---------------------------------------------------
    def mouth_setup(s):
        P = s.P; s.mw = 0.032 * P["lipw"]; s.MS = [0.0, 0.21, 0.42, 0.63, 0.83, 1.0]; s.Hu = 0.0088 * P["lipu"]; s.Hl = 0.0118 * P["lipl"]
    def zstom(s, q): return s.zst - 0.0008 * (1 - q * q) ** 2 + 0.004 * s.P["corner"] * q * q
    def bow(s, q): return (0.80 + 0.20 * math.sin(math.pi / 2 * q / 0.3)) if q < 0.3 else 1 - 0.86 * ((q - 0.3) / 0.7) ** 1.5
    def zub(s, q): return s.zstom(q) + s.Hu * s.bow(q)
    def zlb(s, q): return s.zstom(q) - s.Hl * (0.12 + 0.88 * max(0.0, 1 - q ** 2.4) ** 0.85)

    # ---- the mesh: rings round the head, columns down it; round the eye and the mouth the lines follow the lids and lips ---
    def grid_setup(s):
        P = s.P; zs, zt = s.zsn, s.ztip; tipu = zt + 0.0035; io = s.ze - 0.021; snr = zs - 0.003; ub = s.zst + 0.0095
        R = [("men", s.zmen), ("c1", s.zmen + 0.0016), ("c2", s.zmen + 0.0058), ("c3", s.zc3), ("pog", s.zpog), ("c5", (s.zpog + s.zsul) / 2), ("sul", s.zsul),
             ("lb", s.zst - 0.0105), ("lm", s.zst - 0.006), ("le", s.zst - 0.0006), ("ue", s.zst + 0.0006), ("um", s.zst + 0.0045), ("ub", ub),
             ("ph", (ub + snr) / 2), ("sn", snr), ("col", zs + 0.0015), ("tipl", zt - 0.003), ("tipu", tipu), ("n1", tipu + (io - tipu) / 3), ("zy", tipu + 2 * (io - tipu) / 3), ("io", io),
             ("lc", s.ze - 0.012), ("lmg", s.ze - 0.0003), ("umg", s.ze + 0.0003), ("uc", s.ze + 0.012), ("sb", s.ze + 0.0195), ("br", s.zbr)]
        for k, fr in enumerate((0.086, 0.2, 0.33, 0.47, 0.6, 0.73, 0.845, 0.93, 0.98)): R.append(("f%d" % k, s.zbr + (s.ztop - s.zbr) * fr))
        R.append(("top", s.ztop)); s.ROWS = [r[0] for r in R]; s.Z = dict(R); s.RI = {n: i for i, n in enumerate(s.ROWS)}
        zz = [r[1] for r in R]; assert all(b > a for a, b in zip(zz, zz[1:])), ("rows out of order", R)
        Xn = [0, .0055, .012, .0205, .0265, .032, .0395, .047, .053, .058]
        rc = s.rl * s.ea[0]; xci = s.cx - rc
        xe = [0, min(.0055, (xci - .005) * .46), min(.012, xci - .005)] + [s.cx + u * rc for u in s.EU]
        nw = 0.0225 * P["nosew"]; xnz = [0, .26 * nw, .58 * nw, .93 * nw, nw + .0045, nw + .0115] + [lerp(nw + .019, .058, k / 3) for k in range(4)]
        xm = [q * s.mw for q in s.MS] + [s.mw + d for d in (.007, .014, .021, .028)]
        s.GUIDE = [(s.zpog, Xn), (s.zst, xm), (s.ztip, xnz), (s.ze, xe), (s.zbr + 0.004, Xn)]
    def colx(s, j, z):
        G = s.GUIDE
        if z <= G[0][0]: x = G[0][1][j]
        elif z >= G[-1][0]: x = G[-1][1][j]
        else:
            for (za, A), (zb, B) in zip(G, G[1:]):
                if z <= zb: x = lerp(A[j], B[j], sstep(za, zb, z)); break
        x9 = s.colx(JF, z) if j != JF else x
        return x * min(1.0, 0.80 * s.w(z) / max(1e-6, x9)) if j != JF else x
    def tcol(s, j, z):
        x9 = s.colx(JF, z); k = min(1.0, 0.80 * s.w(z) / max(1e-6, x9)); t9 = s.tof(x9 * k, z)
        if j <= JF: return s.tof(s.colx(j, z) * (k if j == JF else 1.0), z)
        return t9 + (math.pi - t9) * ((j - JF) / (JB - JF)) ** 1.25
    LIPS = ("lb", "lm", "le", "ue", "um", "ub")
    def rowz(s, name, j):   # a ring's height at a column: rings that part round the eye, the nose and the mouth run together again beside them
        z = s.Z[name]
        if name in ("lmg", "umg"): z = s.ze
        if name in s.LIPS and j >= 6:
            zm = lerp(s.zstom(1.0), s.zst, 0.5) if j == 6 else s.zst
            z = zm + {"lb": (-0.0065, -0.009, -0.0105), "ub": (0.006, 0.008, 0.0095)}.get(name, (0, 0, 0))[min(j - 6, 2)]
        if j >= 13:   # at the sides and the back fewer rings are needed: these run into their neighbours
            if name in s.LIPS: z = s.zst
            elif name in ("lc", "uc"): z = s.ze
            elif name == "col": z = s.Z["sn"]
            elif name == "tipl": z = s.Z["tipu"]
            elif name == "c1": z = s.Z["c2"]
        return z
    def pos(s, name, j):   # the point of ring `name` at column j (0 the middle of the face .. JB the middle of the back), on the figure's left
        P = s.P
        if name == "men": return (0.0, (-s.F(s.zmen) + s.yb(s.zmen)) / 2, s.zmen)
        if name == "top": return (0.0, s.ytop, s.ztop)
        if 3 <= j <= 9 and name in ("lc", "lmg", "umg", "uc"):
            u = s.EU[j - 3]
            if name == "lmg": return s.lidpt(u, s.thL(u))
            if name == "umg": return s.lidpt(u, s.thU(u))
            if j in (3, 9):   # beside a corner: the skin just above or below it
                c = s.lidpt(u, 0.0); sg = 1 if name == "uc" else -1
                return vlerp(vadd(c, vmul(s.eu, sg * 0.008)), s.surf(c[0] + (0.002 if j == 9 else -0.001), s.ze + sg * 0.011), 0.5)
            return s.lidpt(u, s.thU(u) + 0.40 * (1 - 0.5 * P["hood"]) if name == "uc" else s.thL(u) - 0.36)
        if j <= 4 and name in s.NOSE: return s.nosept(name, j)
        if j <= 5 and name in s.LIPS:
            q = s.MS[j]; x = q * s.mw; zs_ = s.zstom(q); k = 1 - q * q
            if j == 5:
                dz = {"lb": -0.0024, "ub": 0.0024}.get(name, 0.0); return s.surf(x + (0.0012 if dz else 0.0), zs_ + dz, -0.0004 if dz else -0.0012)
            zu, zl = s.zub(q), s.zlb(q)
            if name == "ub": return s.surf(x, zu, 0.0012 * k)
            if name == "um": return s.surf(x, zs_ + 0.48 * (zu - zs_), 0.0026 * P["lipu"] * k + 0.0008 * gs(q, 0.22))
            if name == "ue": return s.surf(x, zs_ + 0.0006 * k, -0.0008 * k)
            if name == "le": return s.surf(x, zs_ - 0.0006 * k, -0.0010 * k)
            if name == "lm": return s.surf(x, zs_ - 0.5 * (zs_ - zl), 0.0036 * P["lipl"] * k)
            return s.surf(x, zl, 0.0006 * k)
        z = s.rowz(name, j); return s.at(z, s.tcol(j, z))
    def wts(s, name, j, p):   # how much of a point goes with the eyelids' joint and with the jaw
        wE = 0.0
        if 3 <= j <= 9 and name in ("umg", "uc"):
            u = s.EU[j - 3]; wE = min(1.0, math.sqrt(max(0.0, 1 - u * u)) / 0.5) * (1.0 if name == "umg" else 0.5)
        i = s.RI[name]; a = sstep(s.zst + 0.004, s.zst - 0.016, p[2])
        if name in s.LIPS and j <= 5:
            if j == 5: a = 0.55 if name == "lb" else 0.25 if name == "ub" else 0.4
            else: a = 1.0 if i <= s.RI["le"] else 0.0
        return wE, a * sstep(0.05, -0.01, p[1])
    def cat(s, i, j):   # what the cell between rings i, i+1 and columns j, j+1 belongs to
        a, b = s.ROWS[i], s.ROWS[i + 1]
        if a == "lmg" and 3 <= j <= 8: return None
        if j <= 4:
            if a == "le": return None
            if a in ("lb", "lm"): return "lipL"
            if a in ("ue", "um"): return "lipU"
        return "skin"

class Mesh:   # points welded where they are the same point; faces; and each point's share of each joint
    def __init__(s): s.v = []; s.f = []; s.wt = []; s.ix = {}
    def add(s, p, w=None):
        k = (round(p[0] * 1e6), round(p[1] * 1e6), round(p[2] * 1e6)); i = s.ix.get(k)
        if i is None: i = s.ix[k] = len(s.v); s.v.append(tuple(p)); s.wt.append(dict(w or {}))
        return i
    def face(s, *ids):
        q = [i for k, i in enumerate(ids) if i != ids[k - 1]]
        if len(set(q)) >= 3: s.f.append(tuple(q))
    def quad(s, a, b, c, d, flip=False):   # split along the shorter way across (the mirrored side splits the mirrored way)
        la = vlen(vsub(s.v[a], s.v[c])); lb = vlen(vsub(s.v[b], s.v[d]))
        if la < lb - 1e-9 or (abs(la - lb) <= 1e-9 and not flip): s.face(a, b, c); s.face(a, c, d)
        else: s.face(a, b, d); s.face(b, c, d)

def mirror(p): return (-p[0], p[1], p[2])
def wdict(wE, wJ):
    d = {}
    if wE > 0.005: d["E"] = wE
    if wJ > 0.005: d["J"] = wJ
    if 1 - wE - wJ > 0.005: d["H"] = 1 - wE - wJ
    return d

def build_head(F):   # -> {"head": Mesh, "lipU": Mesh, "lipL": Mesh}
    nr = len(F.ROWS); PT = {}; WT = {}
    for i, name in enumerate(F.ROWS):
        for j in range(JB + 1):
            p = F.pos(name, j)
            if j in (0, JB): p = (0.0, p[1], p[2])
            PT[i, j] = p; WT[i, j] = wdict(*F.wts(name, j, p))
    def P(i, jj): jj %= NU; return (PT[i, jj], WT[i, jj]) if jj <= JB else (mirror(PT[i, NU - jj]), WT[i, NU - jj])
    out = {"head": Mesh(), "lipU": Mesh(), "lipL": Mesh()}
    for i in range(nr - 1):
        for jj in range(NU):
            jm = jj if jj < JB else NU - 1 - jj; c = F.cat(i, jm)
            if not c: continue
            M = out[c if c != "skin" else "head"]; ids = [M.add(*P(i, jj)), M.add(*P(i, jj + 1)), M.add(*P(i + 1, jj + 1)), M.add(*P(i + 1, jj))]
            M.quad(*ids, flip=jj >= JB)
    # the lower lid's edge, turned in to the ball (the upper lid's is the lash line: see lashes)
    H = out["head"]; il = F.RI["lmg"]
    for sd in (1, -1):
        for k in range(6):
            u0, u1 = F.EU[k], F.EU[k + 1]; m0, m1 = F.lidpt(u0, F.thL(u0)), F.lidpt(u1, F.thL(u1)); r = F.rb - 0.0007; i0, i1 = F.lidpt(u0, F.thL(u0), r), F.lidpt(u1, F.thL(u1), r)
            q = [m0, m1, i1, i0] if sd > 0 else [mirror(m1), mirror(m0), mirror(i0), mirror(i1)]
            H.quad(*[H.add(p, {"H": 1.0}) for p in q])
    return out

def build_lashes(F):   # the upper lid's edge and its lashes: a dark line that goes down with the lid
    M = Mesh()
    for sd in (1, -1):
        for k in range(6):
            pts = []
            for u in (F.EU[k], F.EU[k + 1]):
                th = F.thU(u); wE = min(1.0, math.sqrt(max(0.0, 1 - u * u)) / 0.5); L = 0.0017 * F.P["lash"] * math.sqrt(max(0.0, 1 - u * u)) ** 0.5
                pts.append(([F.lidpt(u, th, F.rb - 0.0007), F.lidpt(u, th), F.lidpt(u, th - 0.09, F.rl + L)], wdict(wE, 0.0)))
            (a, wa), (b, wb) = pts
            for r in (0, 1):
                q = [(a[r], wa), (b[r], wb), (b[r + 1], wb), (a[r + 1], wa)]
                if sd < 0: q = [(mirror(p), w) for p, w in (q[1], q[0], q[3], q[2])]
                M.quad(*[M.add(p, w) for p, w in q])
    return M

def cap(c, axis, r, ang, rings, segs):   # a cap of a ball: centre, the way it faces, radius, half-angle
    ax = vnorm(axis); t1 = vnorm(vcross(ax, (0, 0, 1) if abs(ax[2]) < 0.9 else (1, 0, 0))); t2 = vcross(ax, t1); M = Mesh(); top = M.add(vadd(c, vmul(ax, r))); ring = []
    for i in range(1, rings + 1):
        a = ang * i / rings; ring.append([M.add(vadd(c, vmul(vadd(vmul(ax, math.cos(a)), vadd(vmul(t1, math.sin(a) * math.cos(2 * math.pi * k / segs)), vmul(t2, math.sin(a) * math.sin(2 * math.pi * k / segs)))), r))) for k in range(segs)])
    for k in range(segs): M.face(top, ring[0][k], ring[0][(k + 1) % segs])
    for i in range(1, rings):
        for k in range(segs): M.face(ring[i - 1][k], ring[i][k], ring[i][(k + 1) % segs], ring[i - 1][(k + 1) % segs])
    return M
def join(*ms):
    M = Mesh()
    for m in ms:
        ids = [M.add(p, w) for p, w in zip(m.v, m.wt)]
        for f in m.f: M.face(*[ids[i] for i in f])
    return M
def flip_x(m):
    M = Mesh(); ids = [M.add(mirror(p), w) for p, w in zip(m.v, m.wt)]
    for f in m.f: M.face(*[ids[i] for i in reversed(f)])
    return M

def build_eyes(F):   # -> the white, the iris, the pupil, and a point of light in it
    c = F.ec; g = vnorm(vadd((0.0, -1.0, 0.05), vmul(F.en, 0.3))); ri = 0.0088 * F.P["eye"] ** 0.5; out = {}
    out["eye"] = cap(c, F.en, F.rb, 1.5, 5, 12)
    out["iris"] = cap(c, g, F.rb + 0.00035, math.asin(ri / F.rb), 2, 12)
    out["pupil"] = cap(c, g, F.rb + 0.0007, math.asin(0.0033 / F.rb), 1, 8)
    out["glint"] = cap(c, vnorm((0.16, -1.0, 0.2)), F.rb + 0.001, 0.07, 1, 5)
    return {k: join(m, flip_x(m)) if k != "glint" else join(m, cap(mirror(c), vnorm((0.16, -1.0, 0.2)), F.rb + 0.001, 0.07, 1, 5)) for k, m in out.items()}

def build_mouth(F):   # the dark inside of the mouth: a pocket from lip to lip, which opens as the jaw drops
    M = Mesh(); cols = []
    for jj in list(range(-5, 6)):
        j = abs(jj); u = F.pos("ue", j); l = F.pos("le", j)
        if jj < 0: u, l = mirror(u), mirror(l)
        wl = F.wts("le", j, F.pos("le", j))[1]; wu = F.wts("ue", j, F.pos("ue", j))[1]
        b = (0.5 * (u[0] + l[0]) * 0.92, 0.5 * (u[1] + l[1]) + (0.02 if j < 5 else 0.0), 0.5 * (u[2] + l[2]) - (0.003 if j < 5 else 0.0))
        cols.append((M.add(l, wdict(0, wl)), M.add(b, wdict(0, 0.5 * (wl + wu))), M.add(u, wdict(0, wu))))
    for a, b in zip(cols, cols[1:]):
        M.face(a[0], b[0], b[1], a[1]); M.face(a[1], b[1], b[2], a[2])
    return M

def build_brows(F):   # the eyebrows: hair lying on the ridge over each eye. -> (his left's, his right's, the middle of the left one)
    P = F.P; N = 8; rc = F.rl * F.ea[0]; x0 = 0.0125 * P["browgap"] + 0.002; x1 = F.cx + rc + 0.004 + 0.024 * (P["browlen"] - 1); zb = F.ze + 0.0228 + P["browz"]
    def line(u):
        x = lerp(x0, x1, u); z = zb + 0.0062 * P["browarch"] * math.sin(math.pi * u ** 1.25) - 0.0035 * u ** 3 + 0.007 * P["browtilt"] * (u - 0.4)
        hb = 0.005 * P["browth"] * (1 - 0.62 * u ** 1.4) * (0.35 + 0.65 * sstep(0.0, 0.14, u)) * (0.3 + 0.7 * sstep(1.0, 0.9, u)); return x, z, hb
    rows = []
    for k in range(N + 1):
        x, z, hb = line(k / N); rows.append([F.surf(x, z - hb, 0.0005), F.surf(x, z, 0.0012 + 0.0019 * P["browth"] ** 0.5), F.surf(x, z + hb, 0.0005)])
    out = []
    for sd in (1, -1):
        M = Mesh()
        for a, b in zip(rows, rows[1:]):
            for r in (0, 1):
                q = [a[r], b[r], b[r + 1], a[r + 1]]
                if sd < 0: q = [mirror(p) for p in (q[1], q[0], q[3], q[2])]
                M.quad(*[M.add(p) for p in q])
        out.append(M)
    x, z, hb = line(0.5); return out[0], out[1], F.surf(x, z)

def side_at(F, y, z):   # the point of the head's side that lies at depth y, height z
    lo, hi = 0.0, math.pi
    for _ in range(40):
        t = (lo + hi) / 2
        if F.base(z, t)[1] < y: lo = t
        else: hi = t
    t = (lo + hi) / 2; return F.at(z, t), F.normal(z, t)

def build_ears(F):   # an ear: a shallow dish of skin behind the jaw's joint, from the brow's level to the base of the nose, its rim turned forward
    P = F.P; top = F.zbr - 0.004; bot = F.zsn + 0.003; He = (top - bot) * P["ear"]; zc = (top + bot) / 2; We = 0.036 * P["ear"]; phi = 0.52 * P["flare"]
    d = (math.sin(phi), math.cos(phi), 0.0); ne = (math.cos(phi), -math.sin(phi), 0.0); V = [-1.0, -0.82, -0.6, -0.35, -0.08, 0.22, 0.5, 0.74, 0.92, 1.0]; U = [0.0, 0.32, 0.66, 1.0, 1.1]
    def rho(v):
        r = max(0.0, 1 - ((v - 0.45) / 0.55) ** 2) ** 0.5 if v >= 0.45 else 1 - 0.40 * ((0.45 - v) / 1.45) ** 1.3
        if v < -0.55: r *= (0.25 + 0.75 * max(0.0, 1 - ((-0.55 - v) / 0.45) ** 2) ** 0.5) * (1 + 0.25 * (P["lobe"] - 1))
        return r
    M = Mesh(); G = []
    for v in V:
        z = zc + v * He / 2; y = 0.013 + 0.11 * v * He / 2; a, n = side_at(F, y, clamp(z, F.zmen + 0.01, F.ztop - 0.01)); a = vsub(a, vmul(n, 0.002)); R = We * rho(v); row = []
        for u in U:
            bowl = -0.0062 * math.sin(math.pi * min(u, 1.0)) ** 1.2 * sstep(-0.75, -0.3, v) * sstep(1.0, 0.8, v)
            p = vadd(a, vadd(vmul(d, min(u, 1.0) * R), vmul(ne, bowl)))
            if u > 1.0: p = vadd(p, vadd(vmul(ne, 0.0042 * sstep(-0.7, -0.2, v)), vmul(d, -0.004 * rho(v))))
            row.append(p)
        G.append(row)
    for a, b in zip(G, G[1:]):
        for k in range(len(U) - 1): M.quad(M.add(a[k], {"H": 1.0}), M.add(a[k + 1], {"H": 1.0}), M.add(b[k + 1], {"H": 1.0}), M.add(b[k], {"H": 1.0}))
    lobe = vlerp(G[0][0], G[1][2], 0.5); return join(M, flip_x(M)), lobe

def build_hair(F, cover_ears=False, NC=24, K=8):   # the hair on the skull: a cap that follows it, ending at the hairline
    P = F.P; th = 0.0075 * P["hairth"]; ztr = 0.097 + P["hairline"]; rec = P["recede"]; sb = P["sideburn"]
    pts = [(0, ztr), (20, ztr + 0.001), (36, ztr - 0.003 + 0.012 * rec), (45, ztr - 0.008 + 0.012 * rec), (57, ztr - 0.024 + 0.012 * rec), (64, 0.045), (69, 0.018), (74, 0.002 - 0.03 * sb), (80, 0.0 - 0.03 * sb)]
    pts += [(90, -0.02), (104, -0.042), (120, -0.05), (140, -0.06), (180, -0.066)] if cover_ears else [(87, 0.02), (100, 0.034), (115, 0.030), (125, 0.012), (135, -0.025), (150, -0.058), (180, -0.066)]
    Zh = Curve(pts); M = Mesh(); cols = []
    for k in range(NC + 1):
        t = math.pi * k / NC; z = 0.05
        for _ in range(8):
            p = F.base(z, t); z = Zh(math.degrees(math.atan2(p[0], -p[1])))
        col = []
        for r in range(K + 1):
            if r == 0: zz, off = z, -0.002
            elif r == 1: zz, off = z + 0.0015, 0.003
            elif r == 2: zz, off = z + 0.008, th * 0.85
            else: zz, off = z + 0.008 + (F.ztop - 0.002 - z - 0.008) * math.sin((r - 2) / (K - 2) * math.pi / 2) ** 1.25, th
            zz = min(zz, F.ztop - 0.002); b = F.base(zz, t); n = F.normal(zz, t); p = vadd(b, vmul(n, F.disp(*b) + off)); col.append((0.0, p[1], p[2]) if k in (0, NC) else p)
        cols.append(col)
    top = (0.0, F.ytop, F.ztop + th)
    def Pt(k, r): k %= 2 * NC; return cols[k][r] if k <= NC else mirror(cols[2 * NC - k][r])
    for k in range(2 * NC):
        for r in range(K): M.quad(M.add(Pt(k, r)), M.add(Pt(k + 1, r)), M.add(Pt(k + 1, r + 1)), M.add(Pt(k, r + 1)), flip=k >= NC)
        M.face(M.add(Pt(k, K)), M.add(Pt(k + 1, K)), M.add(top))
    return M


def build_beard(F, kind="short", off=0.0045):   # hair on the jaw, taken from the face's own mesh so its edge is clean: the chin, the jaw and the cheek below a line from the mouth's corner to the ear
    RI = F.RI; nr = len(F.ROWS); M = Mesh(); cells = []
    def lim(j): return RI["um"] + max(0.0, j - 5) * 1.25          # the cheek line: higher towards the ear
    def want(i, j):
        a = F.ROWS[i]
        if F.cat(i, j) != "skin": return False
        if kind == "chin": return i < RI["sul"] and j <= 3 and i >= RI["c1"]
        if j <= 4 and RI["ub"] <= i < RI["sn"]: return kind == "stubble" and i >= RI["ub"]    # the upper lip: the moustache's place (stubble covers it)
        if j <= 4: return i < RI["lb"]
        return i < lim(j + 1) and j <= 11
    PT = {}
    def P(i, jj):
        jj %= NU; k = (i, jj)
        if k not in PT:
            j = jj if jj <= JB else NU - jj; p = F.pos(F.ROWS[i], j)
            if j in (0, JB): p = (0.0, p[1], p[2])
            PT[k] = (p if jj <= JB else mirror(p), wdict(*F.wts(F.ROWS[i], j, p)))
        return PT[k]
    for i in range(nr - 1):
        for jj in range(NU):
            jm = jj if jj < JB else NU - 1 - jj
            if not want(i, jm): continue
            q = [P(i, jj), P(i, jj + 1), P(i + 1, jj + 1), P(i + 1, jj)]
            if max(p[1] for p, w in q) > 0.016: continue           # (not behind the ear)
            if kind != "chin" and jm >= 5 and i + 1 > lim(jm):     # the cheek line crosses this cell: keep the half below it (the edge runs on the slant)
                if i + 1 > lim(jm + 1): continue
                t3 = [q[0], q[1], q[2]] if jj < JB else [q[0], q[1], q[3]]
                M.face(*[M.add(p, w) for p, w in t3]); continue
            M.quad(*[M.add(p, w) for p, w in q], flip=jj >= JB)
    nrm = [(0.0, 0.0, 0.0)] * len(M.v)
    for f in M.f:
        n = vcross(vsub(M.v[f[1]], M.v[f[0]]), vsub(M.v[f[2]], M.v[f[0]]))
        for i in f: nrm[i] = vadd(nrm[i], n)
    M.v = [vadd(p, vmul(vnorm(n), off)) for p, n in zip(M.v, nrm)]; return M
def nostrils(F):   # where the nostrils open, under the nose: (centre, half-sizes) on his left
    nw = 0.0225 * F.P["nosew"]; ht = 0.041 * F.P["nosep"]; zc = min(F.zsn + 0.0035, F.ztip - 0.0025)
    p = F.surf(0.46 * nw, zc - 0.0004, 0.26 * ht, feat=False); return (p[0], p[1] + 0.0016, p[2] + 0.0004), (0.22 * nw, 0.0062, 0.0026)
