# Who is built, and how: one entry per character and age, read off the artist's sheets (docs/brief). See cast.py.
# A look is a list of parts to show and the colours of the cloth roles for that dress.
BLACK, GREY, WHITE = 0x15120f, 0x8f8b85, 0xe4e0d8
CREAM, MADDER, BARK, BARKD, HIDE = 0xf2e6cc, 0xb2533b, 0x8c633f, 0x6c482b, 0xcfa678
SC = {"child": 0.62, "youth": 0.9, "adult": 1.0, "elder": 0.97}   # js/g3/figure.js STAGE
HEADK = {"child": 1.2, "youth": 0.98, "adult": 0.88, "elder": 0.88}   # and the head's scale on a modelled figure (same file)
BUILD = {
  "heavy":   dict(mu=1.0, wide=1.2,  girth=1.0,  arm=1.0,  leg=1.0,  soft=True,  abs=False, shape=dict(chest=1.0,  trap=1.0,  neck=1.0,  waist=1.0,  lat=1.0)),
  "strong":  dict(mu=1.0, wide=1.1,  girth=1.0,  arm=1.0,  leg=1.0,  soft=False, abs=True,  shape=dict(chest=1.05, trap=1.0,  neck=1.0,  waist=0.94, lat=1.06)),
  "hero":    dict(mu=0.95, wide=1.02, girth=0.98, arm=0.96, leg=0.98, soft=False, abs=True,  shape=dict(chest=1.06, trap=0.95, neck=0.95, waist=0.86, lat=1.12)),
  "fit":     dict(mu=0.72, wide=1.0,  girth=0.92, arm=0.88, leg=0.92, soft=False, abs=True,  shape=dict(chest=0.98, trap=0.88, neck=0.9,  waist=0.88, lat=1.0)),
  "slim":    dict(mu=0.6, wide=0.97, girth=0.86, arm=0.76, leg=0.86, soft=False, abs=True,  shape=dict(chest=0.9,  trap=0.8,  neck=0.85, waist=0.9,  lat=0.9)),
  "plain":   dict(mu=0.45, wide=0.98, girth=0.9,  arm=0.8,  leg=0.88, soft=True,  abs=False, shape=dict(chest=0.9,  trap=0.8,  neck=0.88, waist=1.0,  lat=0.85)),
  "old":     dict(mu=0.5, wide=0.97, girth=0.85, arm=0.72, leg=0.82, soft=False, abs=False, shape=dict(chest=0.85, trap=0.75, neck=0.82, waist=0.98, lat=0.8)),
  "oldking": dict(mu=0.6, wide=1.08, girth=1.0,  arm=0.92, leg=0.94, soft=True,  abs=False, shape=dict(chest=1.0,  trap=0.9,  neck=0.95, waist=1.04, lat=0.95)),
  "youth":   dict(mu=0.55, wide=0.96, girth=0.84, arm=0.7,  leg=0.82, soft=False, abs=True,  shape=dict(chest=0.9,  trap=0.78, neck=0.82, waist=0.88, lat=0.92)),
  "youthB":  dict(mu=0.75, wide=1.08, girth=0.95, arm=0.92, leg=0.94, soft=False, abs=True,  shape=dict(chest=1.0,  trap=0.9,  neck=0.92, waist=0.95, lat=1.0)),
  "child":   dict(mu=0.2, wide=0.92, girth=0.84, arm=0.66, leg=0.8,  soft=True,  abs=False, shape=dict(chest=0.86, trap=0.6,  neck=0.8,  waist=1.06, lat=0.7)),
  "childB":  dict(mu=0.35, wide=1.04, girth=1.0,  arm=0.95, leg=1.0,  soft=True,  abs=False, shape=dict(chest=0.95, trap=0.7,  neck=0.9,  waist=1.1,  lat=0.8)),
  "woman":   dict(mu=0.15, wide=0.88, girth=0.82, arm=0.6,  leg=0.84, soft=True,  abs=False, shape=dict(chest=0.8,  trap=0.6,  neck=0.8, waist=0.84, lat=0.7), sex="f"),
  "womanO":  dict(mu=0.15, wide=0.88, girth=0.86, arm=0.6,  leg=0.84, soft=True,  abs=False, shape=dict(chest=0.82, trap=0.6,  neck=0.8, waist=0.96, lat=0.72), sex="f"),
  "girl":    dict(mu=0.1, wide=0.84, girth=0.8,  arm=0.58, leg=0.78, soft=True,  abs=False, shape=dict(chest=0.8,  trap=0.55, neck=0.74, waist=1.0,  lat=0.65), sex="f", flat=True),
}
# ---- Faces. Each person has measures of his or her own (what the measures are: face.py). They were set from the painted
# portraits where a person has one, and from who the person is where not. A woman's face, a child's, a youth's and an old
# face are changes made to those measures, so a person stays the same person through a life.
WOMAN = dict(brow=0.0, fores=-0.6, jaww=0.9, chinw=0.82, jawsq=0.2, nosel=0.95, nosep=0.9, nosew=0.9, bridgew=0.85, eye=1.1, open=1.06, browth=0.6, browarch=0.7, lipu=1.2, lipl=1.15, lipw=0.95, full=0.2, lash=1.6, hw=0.97, cheekw=0.97)
OLD = dict(fold=0.8, bag=0.6, temple=0.4, jowl=0.3, hood=0.4, recede=0.5, hairline=0.006)
CHILD = dict(brow=0.0, fores=-1.0, eyez=-0.008, nosel=0.8, nosep=0.72, tip=0.5, bridgeh=0.6, nosew=0.9, lowh=0.84, jaww=0.9, chinw=0.86, jawsq=0.1, full=0.8, eye=1.2, open=1.1, browth=0.6, lipw=0.86, hw=1.02, cheekp=0.2)
YOUTH = dict(brow=0.5, jaww=0.96, chinw=0.95, nosel=0.95, nosep=0.93, eye=1.07, browth=0.85, lowh=0.96, jawsq=0.8)
AGED = ("fold", "bag", "jowl", "temple", "hood", "recede", "hairline", "hump")
MULT = set("hw hh hl eye gap open browth browlen browgap nosel nosep nosew bridgew bridgeh tipw cheekw jaww chinw lowh lipw lipu lipl ear flare lobe hairth lash".split())
def child_of(f):   # a child: the big skull, the small low face, the full cheek; a trace of who the child will be
    g = {}
    for k in set(f) | set(CHILD):
        a = f.get(k, 1.0 if k in MULT else 0.0)
        if k in AGED: continue
        g[k] = CHILD.get(k, 1.0) * a ** 0.35 if k in MULT else CHILD.get(k, 0.0) + 0.3 * a
    g["brow"] = 0.0; g["cheekp"] = 0.2; g["fores"] = -1.0; g["jawsq"] = 0.1; return g
def youth_of(f):   # a youth: most of the way to the grown face, the bone not yet heavy
    g = {}
    for k in set(f) | set(YOUTH):
        a = f.get(k, 1.0 if k in MULT else 0.0)
        if k in AGED: continue
        g[k] = YOUTH.get(k, 1.0) * a ** 0.75 if k in MULT else (a * YOUTH[k] if k in YOUTH else 0.75 * a)
    g["full"] = g.get("full", 0.0) + 0.15; return g
def elder_of(f):   # the same face grown old
    g = dict(f)
    for k, v in OLD.items(): g[k] = g.get(k, 0.0) + v
    for k, v in dict(nosel=1.05, lipu=0.78, lipl=0.84, open=0.9, ear=1.06, browth=1.1).items(): g[k] = g.get(k, 1.0) * v
    g["full"] = g.get("full", 0.0) - 0.3; g["tip"] = g.get("tip", 0.0) - 0.2; return g
def old(**k): return dict(OLD, **k)
PEOPLE = {
  # the player: a face that could be anyone's
  "player_m": dict(jawsq=0.6, cheekp=0.55), "player_f": dict(eye=1.1, tilt=0.1, browarch=0.6, cheekp=0.55),
  # the five brothers
  "yudhishthira": dict(hw=0.96, lowh=1.08, nosel=1.1, jaww=0.92, chinw=0.95, cheekw=0.96, full=-0.15, brow=0.35, browtilt=-0.45, browarch=0.2, browth=0.9, tilt=-0.02, open=0.9, hood=0.35, eye=0.98, nosew=0.95, bridgeh=1.05, lipw=0.95, lipu=0.9, corner=-0.15, fold=0.35, hairline=0.006, recede=0.3),
  "bhima": dict(hw=1.05, cheekw=1.07, jaww=1.2, chinw=1.3, jawsq=0.7, full=0.9, jowl=0.5, lowh=0.98, nosel=0.95, nosew=1.28, tipw=1.3, nosep=0.95, bridgew=1.2, brow=0.8, browth=1.5, browarch=0.5, eye=0.9, open=0.92, gap=1.03, lipw=1.12, lipu=1.15, lipl=1.2, corner=0.5, cheekp=0.2, fores=0.2),
  "arjuna": dict(hw=0.98, cheekp=1.0, full=-0.45, jaww=0.97, jawsq=0.85, chinw=0.95, chinp=0.2, lowh=1.02, nosel=1.04, nosew=0.92, bridgew=0.85, bridgeh=1.15, tipw=0.9, nosep=1.08, brow=0.75, browth=1.1, browtilt=0.3, browarch=0.25, deep=0.6, tilt=0.1, lipw=0.95, lipu=0.9, lipl=0.95, temple=0.2),
  "nakula": dict(hw=0.97, cheekw=0.98, jaww=0.93, chinw=0.9, lowh=0.98, nosel=0.98, nosew=0.88, bridgew=0.8, tipw=0.88, brow=0.25, browth=0.85, browarch=0.6, eye=1.1, open=1.05, tilt=0.12, lipu=1.15, lipl=1.1, lipw=0.97, corner=0.25, cheekp=0.6, fores=-0.2),
  "sahadeva": dict(hw=0.99, cheekw=0.99, jaww=0.95, jawsq=0.35, chinw=0.94, lowh=0.96, nosel=0.96, nosew=0.92, bridgew=0.85, nosep=0.96, tip=0.3, brow=0.2, browth=0.9, browarch=0.4, browtilt=-0.2, eye=1.08, tilt=0.06, lipu=1.1, lipl=1.05, full=0.25, cheekp=0.4, fores=-0.3),
  "krishna": dict(hw=0.99, jaww=0.95, jawsq=0.35, chinw=0.92, nosew=0.9, bridgew=0.85, bridgeh=1.1, nosep=1.02, tipw=0.92, brow=0.2, browth=0.9, browarch=0.75, eye=1.14, tilt=0.14, lipw=1.02, lipu=1.2, lipl=1.2, corner=0.6, full=0.2, fores=-0.2, lash=1.4),
  "draupadi": dict(eye=1.16, tilt=0.15, open=1.02, browth=0.8, browarch=0.8, browtilt=0.25, cheekp=0.9, cheekw=1.0, jaww=0.9, chinw=0.84, nosel=0.97, nosew=0.92, bridgeh=1.1, lipu=1.3, lipl=1.3, lipw=1.0, full=0.05, lash=1.9, chinp=0.15),
  "kunti": old(nosel=1.05, bridgeh=1.1, cheekp=0.7, jaww=0.96, chinw=0.9, browarch=0.5, eye=1.0, lipu=0.8, lipl=0.9, corner=-0.1, lash=1.1),
  "gandhari": old(full=0.3, jaww=0.98, chinw=0.95, nosew=1.0, lipu=0.95, jowl=0.5, cheekw=1.02, eye=1.0, lash=1.1),
  "healer": old(full=-0.2, cheekp=0.8, nosew=1.08, tipw=1.15, fold=1.0, bag=0.8, lipu=0.7, lipl=0.8, corner=0.3, temple=0.5, eye=0.96, hood=0.6, browarch=0.3, lash=1.0),
  "villager_f": dict(full=0.4, jaww=0.98, nosew=1.05, tipw=1.1, nosel=0.94, eye=1.06, lipu=1.1, corner=0.2, cheekw=1.02),
  # the Kuru court
  "duryodhana": dict(hw=1.04, cheekw=1.04, jaww=1.16, jawsq=1.0, chinw=1.25, chinp=0.3, lowh=1.02, brow=1.25, browth=1.5, browtilt=0.7, browarch=0.1, deep=0.7, hood=0.4, eye=0.94, open=0.92, nosel=1.04, nosew=1.1, bridgew=1.15, bridgeh=1.1, hump=0.6, tip=-0.3, tipw=1.1, lipu=0.85, corner=-0.55, full=0.1, fold=0.4, fores=0.4),
  "dushasana": dict(hw=1.03, cheekw=1.06, jaww=1.18, jawsq=0.8, chinw=1.15, lowh=1.05, full=0.5, jowl=0.4, brow=1.2, browth=1.6, browtilt=0.5, browgap=0.6, eye=0.88, gap=0.96, open=0.9, hood=0.5, nosel=0.94, nosew=1.25, tipw=1.25, bridgew=1.2, bridgeh=0.85, lipw=1.08, lipu=1.3, lipl=1.35, corner=-0.3, hairline=-0.01, fores=0.6),
  "karna": dict(cheekw=1.03, cheekp=0.75, jaww=1.1, jawsq=0.95, chinw=1.15, chinp=0.25, lowh=1.04, brow=0.6, browth=1.1, browtilt=-0.3, browarch=0.3, eye=1.04, open=0.88, hood=0.45, tilt=0.03, deep=0.3, nosel=1.05, nosew=1.02, bridgeh=1.12, tipw=1.1, nosep=1.05, lipw=1.02, lipu=1.15, lipl=1.2, corner=-0.2, full=-0.05),
  "shakuni": old(hw=0.95, cheekw=0.94, cheekp=0.9, full=-0.75, temple=0.6, jaww=0.86, jawsq=0.3, chinw=0.78, chinp=0.35, lowh=1.08, nosel=1.15, nosep=1.15, nosew=0.92, bridgew=0.85, bridgeh=1.2, hump=1.1, tip=-0.9, tipw=0.85, eye=0.9, gap=0.94, open=0.82, tilt=0.16, hood=0.3, brow=0.5, browth=0.8, browarch=0.9, browtilt=0.45, lipw=0.95, lipu=0.6, lipl=0.7, corner=0.35, fold=0.9, bag=0.4, recede=0.7, hairline=0.008, jowl=0.0),
  "ashwatthama": dict(cheekw=1.02, cheekp=0.8, jaww=1.06, jawsq=0.8, chinw=1.05, lowh=1.03, brow=1.1, browth=1.5, browtilt=0.8, browgap=0.75, deep=0.9, eye=0.96, open=0.9, nosew=1.15, tipw=1.15, bridgew=1.1, hump=0.3, lipl=1.05, corner=-0.45, full=-0.2, fold=0.5, temple=0.2),
  "jayadratha": dict(hw=1.02, cheekw=1.05, jaww=1.04, jawsq=0.3, chinw=0.95, chinp=-0.3, full=0.6, jowl=0.5, lowh=0.97, brow=0.4, browarch=0.8, browtilt=0.1, eye=0.95, open=0.9, hood=0.3, gap=1.02, nosel=0.98, nosew=1.08, tipw=1.2, tip=0.2, lipw=0.9, lipu=1.2, lipl=1.25, corner=0.15),
  "shalya": dict(hw=1.03, cheekw=1.03, jaww=1.1, jawsq=0.8, chinw=1.1, lowh=1.03, brow=0.9, browth=1.3, browtilt=0.2, deep=0.5, nosel=1.06, nosew=1.08, bridgeh=1.15, hump=0.5, eye=0.97, open=0.92, hood=0.4, lipw=1.02, lipu=0.9, corner=-0.2, fold=0.7, bag=0.4, full=-0.1, jowl=0.25, recede=0.4),
  "bhishma": old(hw=0.99, hh=1.02, lowh=1.1, cheekw=0.98, cheekp=1.0, full=-0.55, temple=0.6, jawsq=0.7, brow=1.0, browth=1.5, browtilt=0.15, browarch=0.2, deep=1.0, eye=0.96, open=0.9, hood=0.5, nosel=1.12, nosep=1.12, bridgeh=1.25, hump=0.9, tip=-0.4, nosew=0.98, lipw=0.98, lipu=0.75, lipl=0.85, corner=-0.15, fold=0.9, bag=0.5, recede=0.8, hairline=0.01, jowl=0.1),
  "drona": old(hw=0.96, cheekw=0.95, cheekp=1.1, full=-0.8, temple=0.8, jaww=0.9, jawsq=0.55, chinw=0.88, lowh=1.02, brow=0.8, browth=1.2, browtilt=0.6, deep=0.8, eye=0.94, open=0.86, tilt=0.08, nosel=1.08, nosep=1.1, nosew=0.9, bridgew=0.85, bridgeh=1.2, hump=0.4, tip=-0.2, tipw=0.88, lipw=0.94, lipu=0.65, lipl=0.75, corner=-0.35, fold=1.0, bag=0.5, recede=0.9, hairline=0.012, jowl=0.0),
  "kripa": old(hw=0.95, hh=1.01, lowh=1.12, cheekw=0.94, cheekp=0.8, full=-0.6, temple=0.5, jaww=0.88, jawsq=0.4, chinw=0.92, brow=0.5, browth=0.9, browtilt=-0.2, browarch=0.3, eye=0.98, open=0.92, hood=0.5, nosel=1.14, nosew=0.95, bridgeh=1.1, tip=-0.3, lipw=0.92, lipu=0.6, lipl=0.7, bag=0.5, hairline=0.004, jowl=0.0),
  "vidura": old(hw=0.98, lowh=1.04, cheekw=0.98, cheekp=0.7, full=-0.2, jaww=0.95, chinw=0.95, brow=0.5, browth=1.1, browtilt=-0.4, browarch=0.4, eye=1.02, open=0.95, tilt=0.0, nosel=1.1, nosew=1.05, hump=0.6, tip=-0.5, tipw=1.05, lipw=1.02, lipu=0.85, lipl=0.95, corner=0.45, fold=1.0),
  "dhritarashtra": old(hw=1.05, cheekw=1.06, jaww=1.14, jawsq=0.5, chinw=1.15, full=0.5, jowl=0.8, lowh=1.04, brow=0.7, browth=1.4, browtilt=-0.3, eye=0.95, open=0.5, hood=0.8, nosel=1.06, nosew=1.15, tipw=1.2, lipw=1.02, lipu=0.9, lipl=1.05, corner=-0.4, fold=1.0, bag=0.9),
  "drupada": old(hw=1.03, cheekw=1.03, jaww=1.1, jawsq=0.8, chinw=1.1, brow=1.1, browth=1.5, browtilt=0.7, deep=0.7, eye=0.95, open=0.88, hood=0.5, nosel=1.02, nosew=1.15, bridgew=1.15, tipw=1.15, lipu=0.8, corner=-0.5, fold=0.9, jowl=0.5),
  "virata": old(hw=1.04, cheekw=1.06, jaww=1.1, jawsq=0.3, chinw=1.1, lowh=0.96, full=0.7, jowl=0.6, brow=0.4, browth=1.2, browtilt=-0.4, browarch=0.5, eye=1.02, open=0.95, nosel=0.97, nosew=1.2, tipw=1.25, bridgeh=0.9, lipw=1.05, lipu=0.95, lipl=1.1, corner=0.5, recede=0.3),
  # allies and others
  "dhrishtadyumna": dict(hw=0.99, cheekp=0.9, full=-0.3, jaww=1.02, jawsq=0.9, chinp=0.2, brow=0.8, browth=1.2, browtilt=0.75, browarch=0.2, eye=1.02, tilt=0.12, deep=0.4, nosew=0.95, bridgeh=1.15, nosep=1.06, lipw=0.97, lipu=0.9, corner=-0.2),
  "satyaki": dict(hw=1.02, cheekw=1.05, cheekp=0.6, jaww=1.12, jawsq=0.75, chinw=1.12, lowh=0.98, full=0.15, brow=0.95, browth=1.35, browtilt=0.35, gap=1.03, nosel=0.97, nosew=1.18, bridgew=1.1, tipw=1.15, lipw=1.06, lipu=1.15, lipl=1.2, corner=0.1),
  "shikhandi": dict(hw=0.96, cheekw=0.96, jaww=0.88, jawsq=0.25, chinw=0.84, brow=0.05, browth=0.75, browarch=0.8, eye=1.1, tilt=0.12, open=1.02, nosel=0.97, nosew=0.88, bridgew=0.82, nosep=0.95, lipw=0.95, lipu=1.2, lipl=1.15, cheekp=0.7, fores=-0.4, lash=1.4),
  "uttara": dict(jaww=0.94, jawsq=0.2, chinw=0.9, chinp=-0.2, full=0.45, brow=0.15, browth=0.85, browarch=0.6, browtilt=-0.3, eye=1.12, open=1.1, nosel=0.93, nosep=0.9, tip=0.5, nosew=0.98, lipw=0.92, lipu=1.15, lipl=1.15, fores=-0.4),
  "abhimanyu": dict(jaww=0.93, jawsq=0.3, chinw=0.9, full=0.35, brow=0.2, browth=0.9, browarch=0.5, eye=1.14, open=1.08, tilt=0.1, nosel=0.94, nosep=0.93, nosew=0.92, tip=0.2, lipu=1.1, lipl=1.1, corner=0.5, fores=-0.4, lowh=0.96),
  "ghatotkacha": dict(hw=1.06, cheekw=1.08, cheekp=0.6, jaww=1.22, jawsq=0.9, chinw=1.35, lowh=1.06, full=0.3, brow=1.3, browth=1.6, browtilt=0.2, deep=0.6, eye=0.94, gap=1.06, nosel=0.92, nosew=1.32, bridgew=1.3, bridgeh=0.75, tipw=1.35, nosep=0.9, lipw=1.15, lipu=1.3, lipl=1.4, corner=0.5, ear=1.15, flare=1.3, fores=0.6),
  "balarama": dict(hw=1.05, cheekw=1.06, jaww=1.15, jawsq=0.6, chinw=1.2, full=0.45, brow=0.7, browth=1.3, browarch=0.4, gap=1.04, nosel=1.02, nosew=1.12, bridgew=1.15, tipw=1.2, lipw=1.08, lipu=1.1, lipl=1.15, corner=0.2, jowl=0.25),
  "ekalavya": dict(cheekw=1.06, cheekp=1.0, full=-0.3, jawsq=0.7, brow=0.7, browth=1.2, gap=1.05, tilt=0.1, nosel=0.95, nosew=1.2, bridgew=1.15, bridgeh=0.85, tipw=1.2, lipw=1.05, lipu=1.2, lipl=1.25),
  "charu": dict(jaww=0.98, jawsq=0.4, chinw=0.95, full=0.15, brow=0.4, browarch=0.5, browtilt=-0.2, eye=1.08, open=1.05, nosel=0.95, nosew=1.05, tip=0.4, tipw=1.1, lipw=1.12, lipu=1.05, lipl=1.1, corner=0.6),
  "ugra": dict(hw=1.05, cheekw=1.07, jaww=1.18, jawsq=0.6, chinw=1.2, full=0.8, jowl=0.7, brow=0.9, browth=1.2, browtilt=0.3, eye=0.86, open=0.78, hood=0.6, gap=1.02, nosel=0.96, nosew=1.25, tipw=1.3, bridgew=1.2, lipw=1.05, lipu=1.1, lipl=1.2, corner=0.35, fores=0.3),
  "mauni": old(hw=0.96, cheekw=0.98, cheekp=1.2, full=-0.9, temple=0.9, jaww=0.9, jawsq=0.5, chinw=0.9, lowh=1.06, brow=0.9, browth=1.3, browtilt=0.1, deep=1.1, eye=1.04, open=1.08, hood=0.0, nosel=1.1, bridgeh=1.15, hump=0.5, lipw=0.95, lipu=0.7, lipl=0.8, fold=0.9, bag=0.7, recede=0.2, jowl=0.0),
  "bard": dict(hw=0.96, lowh=1.06, cheekw=0.96, jaww=0.9, jawsq=0.3, chinw=0.88, full=-0.2, brow=0.3, browth=0.9, browarch=0.9, browtilt=-0.3, eye=1.08, open=1.05, nosel=1.06, nosew=0.92, bridgeh=1.1, tip=0.2, lipw=1.05, corner=0.5),
  "brahmin": dict(hw=1.03, cheekw=1.05, jaww=1.1, jawsq=0.2, chinw=1.05, chinp=-0.3, full=1.0, jowl=0.9, lowh=0.97, brow=0.3, browth=0.9, browarch=0.6, eye=0.96, open=0.92, nosel=0.96, nosew=1.1, tipw=1.2, lipw=0.95, lipu=1.1, lipl=1.15, corner=0.3),
  "villager_m": dict(cheekp=0.8, full=-0.35, jaww=0.98, brow=0.6, browth=1.1, nosew=1.1, tipw=1.1, fold=0.6, eye=0.98, lipu=0.95, temple=0.3),
  "guard": dict(jaww=1.1, jawsq=0.9, chinw=1.1, brow=0.8, browth=1.2, browtilt=0.2, nosew=1.05, lipu=0.95, corner=-0.15),
  "raider": dict(cheekw=1.03, jaww=1.06, jawsq=0.7, brow=1.1, browth=1.5, browtilt=0.8, deep=0.6, eye=0.92, open=0.85, nosew=1.2, hump=0.8, tip=-0.2, bridgew=1.2, lipu=0.9, corner=-0.5, full=-0.25, fold=0.5),
  "soldier_foot": dict(jaww=1.04, jawsq=0.7, brow=0.7, browth=1.2, nosew=1.08),
  "soldier_archer": dict(hw=0.97, jaww=0.94, full=-0.3, cheekp=0.8, nosel=1.05, eye=1.03, tilt=0.1),
  "soldier_charioteer": dict(hw=1.02, full=0.35, jaww=1.06, nosew=1.15, tipw=1.15, browth=1.2, corner=0.1),
  "soldier_cw": dict(jaww=1.08, jawsq=0.9, chinw=1.1, cheekp=0.8, brow=0.8, bridgeh=1.15, nosel=1.04, browtilt=0.3),
}
YOUNGEST = {"abhimanyu": "youth"}   # (these measures are of the person at this age, not grown)
def face_of(key, sex, fix):
    who, st = key.rsplit("_", 1); f = dict(WOMAN) if sex == "f" else {}; f.update(PEOPLE.get(who, {})); f.update(fix or {}); at = YOUNGEST.get(who)
    if st == "child": f = child_of(f)
    elif st == "youth" and at != "youth": f = youth_of(f)
    elif st == "elder" and who in ("player_m", "player_f"): f = elder_of(f)
    return {k: round(v, 4) for k, v in f.items()}
def L(parts, **cols):
    if "hem" not in cols and "red" in cols: cols["hem"] = cols["red"]
    return dict(parts=parts.split(), cols=cols)
CAST = {}
def add(key, build, face, skin, hair=BLACK, cm=None, looks=None, **kw):
    st = key.rsplit("_", 1)[1]; CAST[key] = dict(build=build, face=face, skin=skin, hair=hair, looks=looks or {}, size=round(cm / (100 * (1.47 + 0.33 * HEADK[st]) * SC[st]), 3) if cm else 1, **kw)
def resolve(key):
    c = CAST[key]; H = dict(sex="m", stache=False, stubble=False, crown=None, locks=4, rich=False, belly=0); H.update({k: (dict(v) if isinstance(v, dict) else v) for k, v in BUILD[c["build"]].items()})
    for k, v in c.items():
        if k not in ("build", "face", "facefix"): H[k] = v
    H["face"] = face_of(key, H["sex"], c.get("facefix")); return H

# ---- The player: plain enough to belong anywhere. Undyed cotton with a madder border; bark-dyed in the forest; leather and iron at war.
PM = 0xa86d40; PF = 0xbe7f4c
def player_m(st, cm, build, face, hair=BLACK, beard=""):
    plain = dict(cloth=CREAM, red=MADDER, cloth2=CREAM); wood = dict(cloth=BARK, red=BARKD, hide=HIDE)
    war = dict(cloth=CREAM, red=MADDER, armour=0x6b4a32, leather=0x5a3a24, gold=0x8a8478)
    b = (" " + beard) if beard else ""
    add("player_m_" + st, build, face, PM, hair, cm, looks={
      "home":    L("hair knot dhoti tuck drape" + b, **plain),
      "student": L("hair knot dhotiS tuck thread" + b, **plain),
      "forest":  L("hair knot dhoti tuck hide" + (b or (" beardS stache" if st == "adult" else "")), **wood),
      "war":     L("hair helmet cuirass pauldron vambrace dhotiS tuck" + (" greave" if st != "adult" else "") + b, **war) })
player_m("child", 125, "child", "child"); player_m("youth", 170, "youth", "young"); player_m("adult", 178, "fit", "plain")
player_m("elder", 176, "old", "old", WHITE, "beardS stache")
def player_f(st, cm, build, face, hair=BLACK):
    plain = dict(cloth=CREAM, red=MADDER, cloth2=CREAM, band=0x9f4530); stud = dict(cloth=CREAM, red=MADDER, cloth2=CREAM, band=CREAM); wood = dict(cloth=BARK, red=BARKD, band=BARK, hide=HIDE)
    war = dict(cloth=CREAM, red=MADDER, armour=0x6b4a32, leather=0x5a3a24, gold=0x8a8478, band=0x7a3a2a)
    add("player_f_" + st, build, face, PF, hair, cm, looks={
      "home":    L("hair braid dhotiL tuck bandeau shawl beads tilak", **plain),
      "student": L("hair bun dhotiL tuck bandeau shawl tilak", **stud),
      "forest":  L("hair bun dhotiL tuck bandeau hide tilak", **wood),
      "war":     L("hair bun helmet cuirass pauldron vambrace dhotiS tuck tilak", **war) })
player_f("child", 122, "girl", "child"); player_f("youth", 160, "woman", "young"); player_f("adult", 165, "woman", "woman"); player_f("elder", 162, "womanO", "womanO", GREY)

# ---- The rank and file: one man in each trade; the game dyes his sash and border in his army's colour (sided).
SOL = 0xbd773e
def soldier(kind, cm, build, parts, beard="", crown=None, **kw):
    add("soldier_" + kind + "_adult", build, "plain", SOL, BLACK, cm, sided=True, lod=0.7, crown=crown, looks={"war": L(parts + (" " + beard if beard else ""), cloth=CREAM, red=0x2e4993, armour=0x6a4a30, leather=0x5a3a24, iron=0x7a6a52, gold=0xb08a4a, **kw)})
soldier("foot", 176, "fit", "hair helmet cuirass vambrace greave dhotiS sash", "beardS stache")
soldier("archer", 174, "fit", "hair knot cuirass strap vambrace dhotiS sash tilak")
soldier("charioteer", 172, "fit", "hair turban cuirass vambrace dhotiS sash")
soldier("cw", 184, "strong", "hair locks knot crown cuirass pauldron lames tasset baldric vambrace girdle dhotiS sash ear", "beardS stache", crown="circlet")
CAST["soldier_cw_adult"]["looks"]["war"]["cols"].update(armour=0x8a8780, leather=0x8a8780, gold=0xc9a040, gem=0x2e4993)

# ---- The five Pandavas, each in his own colours: child (home), youth (student), grown (home, court, forest, disguise, war, mourning).
GOLD_A = 0xc9a045
def pandava(name, skin, build, face, cms, crown, gem, c1, c2, shawl, forest, disguise, youthb="youth", childb="child", stache=False, stubble=False, **kw):
    white = dict(cloth=0xf8f3e6, red=0xe6d6b8, cloth2=0xf8f3e6)
    add(name + "_child", childb, "child", skin, BLACK, cms[0], crown=None, rich=True, looks={"home": L("hair knot dhoti sash gold bands tilak", cloth=c1, red=c2, hem=0xd9a53a)})
    add(name + "_youth", youthb, "young" if face in ("young", "fine") else face, skin, BLACK, cms[1], looks={"student": L("hair knot dhotiS tuck thread", cloth=0xf6efe2, red=0x7c4e2c, hem=0xf6efe2)})
    st = " stache" if stache else ""
    add(name + "_adult", build, face, skin, BLACK, cms[2], crown=crown, rich=True, stache=stache, stubble=stubble, looks={
      "home":     L("hair locks dhoti sash gold bands" + st, cloth=c1, red=c2, hem=c2),
      "court":    L("hair locks crown gold ear bands anklets girdle panel shawl dhoti" + st, cloth=c1, red=c2, cloth2=shawl, hem=0xd9a53a, gem=gem),
      "forest":   L("hair jata beardF stache hide dhoti tuck beads", cloth=forest, red=BARKD, hem=forest, hide=HIDE),
      "disguise": disguise,
      "war":      L("hair locks crown cuirass pauldron lames tasset boss vambrace greave dhotiS sash" + st, cloth=c1, red=c2, hem=0xd9a53a, **dict(dict(armour=GOLD_A, leather=0xb08a3a, gem=gem), **kw)),
      "mourning": L("hair locks longhair dhoti tuck shawl" + st, **white) })
pandava("yudhishthira", 0x9b643f, "slim", "long", (135, 172, 188), "mukuta", 0xc82036, 0x672c85, 0xd32c57, 0xf4ecd8, 0xad7036,
        L("hair locks dhoti tuck shawl stache", cloth=0xb6b2b1, red=0x8a7f75, cloth2=0xdbd2c7), stache=True)
CAST["yudhishthira_adult"].update(wide=1.0, mu=0.7); CAST["yudhishthira_adult"]["looks"]["home"] = L("hair locks dhoti sash gold bands shawl stache", cloth=0x6c3f90, red=0xf0e8d8, cloth2=0xf4ecd8)
pandava("bhima", 0xa25f39, "heavy", "broad", (142, 178, 195), "mukuta", 0xc71f25, 0xf7bd3d, 0xbe2f2c, 0xbe2f2c, 0x9d4f2a,
        L("hair knot dhotiS tuck drape stache", cloth=0xb23f28, red=0x8a2a1c, cloth2=0xf3e2c5), youthb="youthB", childb="childB", stache=True)
pandava("arjuna", 0x99613a, "hero", "firm", (133, 171, 185), "circlet", 0x0662fc, 0xfdf9ee, 0x1846a5, 0x1846a5, 0x83402b,
        L("hair braid dhotiL tuck bandeau shawl ear bands tilak", cloth=0x0f656c, red=0xae7729, cloth2=0x0f656c, band=0x0f656c, hem=0xae7729), stubble=True, armour=0xb58a3c)
CAST["arjuna_adult"]["looks"]["forest"]["parts"].append("strap")
pandava("nakula", 0xe1a972, "slim", "fine", (137, 168, 181), "mukuta", 0x058e4e, 0x1d5f30, 0xf5831b, 0xf5831b, 0xa86428,
        L("hair knot dhotiS tuck drape", cloth=0x80643b, red=0x5a4426, cloth2=0xd7be9e))
pandava("sahadeva", 0xe1a773, "slim", "young", (132, 166, 178), "mukuta", 0x943597, 0xec6b1e, 0x6a2c6f, 0x6a2c6f, 0xba7b2e,
        L("hair locks dhoti tuck shawl", cloth=0xd5ccc0, red=0xa89a86, cloth2=0x7f5d40))
CAST["sahadeva_adult"].update(wide=0.95, girth=0.84, arm=0.72)
for n_ in ("nakula", "sahadeva"): CAST[n_ + "_adult"]["looks"]["forest"] = L("hair jata beardS hide dhoti tuck beads", cloth=CAST[n_ + "_adult"]["looks"]["forest"]["cols"]["cloth"], red=BARKD, hide=HIDE)

# ---- Draupadi: dark, proud. Plaited as bride and queen; unbound from the dice hall on (forest, disguise, mourning).
DR = 0x7d4c30
add("draupadi_youth", "woman", "young", DR, BLACK, 158, looks={"home": L("hair braid dhotiL tuck bandeau shawl gold ear bands tilak", cloth=0xc3393b, red=0xd9a53a, cloth2=0xe8a0a0, band=0xa72a2e)})
add("draupadi_adult", "woman", "woman", DR, BLACK, 168, crown="circlet", rich=True, looks={
  "home":     L("hair braid dhotiL sash bandeau shawl gold ear bands tilak", cloth=0x96262f, red=0xd9a53a, cloth2=0x96262f, band=0x802123),
  "court":    L("hair braid crown dhotiL girdle bandeau shawl gold ear bands anklets tilak", cloth=0xb82c33, red=0xd9a53a, cloth2=0xe5ba70, band=0x9f3222, gem=0xc0202a),
  "bride":    L("hair braid crown veil dhotiL girdle bandeau shawl gold ear bands anklets tilak", cloth=0xb11623, red=0xd9a53a, cloth2=0xc02a2a, band=0xb03622, gem=0xc0202a),
  "forest":   L("hair longhair dhotiL tuck bandeau shawl beads tilak", cloth=0x986030, red=0x7a4a25, cloth2=0x986030, band=0x7a4a25),
  "disguise": L("hair longhair dhotiL tuck bandeau shawl bands tilak", cloth=0x27376d, red=0x857983, cloth2=0x27376d, band=0x1e2b58, gold=0x4a6ab0),
  "mourning": L("hair longhair dhotiL tuck bandeau shawl", cloth=0xf8f5ec, red=0xe6dcc8, cloth2=0xf8f5ec, band=0xf0ebe0) })

# ---- Krishna, Karna, Duryodhana, Bhishma, Drona
KR = 0x415073
add("krishna_adult", "hero", "fine", KR, BLACK, 183, crown="mukuta", rich=True, looks={
  "home":  L("hair locks knot featherlow dhoti sash gold ear bands", cloth=0xfec83b, red=0xb92827, band=0x028982, gem=0x1a3a9a),
  "court": L("hair locks crown feather gold ear bands anklets girdle panel shawl dhoti", cloth=0xfec535, red=0xbc2326, cloth2=0xfec535, hem=0xbc2326, band=0x038079, gem=0x1a3a9a),
  "war":   L("hair locks crown feather cuirass vambrace gold ear bands dhotiS sash", cloth=0xfec639, red=0xbe2327, armour=0x523b2f, leather=0x523b2f, band=0x038079, gem=0x1a3a9a) })
KA = 0x9a5b31
add("karna_child", "child", "child", KA, BLACK, 134, looks={"home": L("hair knot dhoti tuck cuirass ear", cloth=0xefd8b0, red=0xd47e35, armour=0xf0c060)})
add("karna_youth", "youthB", "firm", KA, BLACK, 180, rich=True, looks={"tournament": L("hair locks knot cuirass boss ear bands dhoti sash girdle", cloth=0xfebd35, red=0x1a4420, armour=0xecad3e, gem=0xfdd739, hem=0xd9a53a)})
add("karna_adult", "strong", "stern", KA, BLACK, 190, crown="mukuta", rich=True, stache=True, looks={
  "court": L("hair locks crown gold ear bands anklets girdle panel shawl dhoti stache beardS", cloth=0xfab834, red=0x1a451d, cloth2=0x1a451d, hem=0xd9a53a, gem=0xfdd341),
  "war":   L("hair locks crown cuirass pauldron lames tasset vambrace greave dhotiS sash stache beardS", cloth=0xfebe3b, red=0x1a4e24, hem=0xd9a53a, armour=0xb89a5a, leather=0xa08040, gem=0xfdd93d) })
DU = 0xa96845
add("duryodhana_child", "childB", "child", DU, BLACK, 138, rich=True, looks={"home": L("hair knot dhoti sash gold bands tilak", cloth=0x6d1c43, red=0x2a1420, hem=0xdea347)})
add("duryodhana_youth", "youthB", "stern", DU, BLACK, 176, looks={"student": L("hair knot dhotiS tuck thread", cloth=0xf4ecdc, red=0x5b3823, hem=0xf4ecdc)})
add("duryodhana_adult", "strong", "stern", DU, BLACK, 192, crown="mukuta", rich=True, stache=True, wide=1.14, looks={
  "court":   L("hair locks crown gold ear bands anklets girdle panel shawl dhoti stache goatee", cloth=0x6e1c48, red=0x1c1c1b, cloth2=0xdaa850, hem=0xd9a53a, gem=0x304695),
  "student": L("hair knot dhotiS tuck thread stache goatee", cloth=0xf2e8da, red=0x64442a, hem=0xf2e8da),
  "war":     L("hair locks crown cuirass pauldron lames tasset boss vambrace greave dhotiS sash stache goatee", cloth=0x74204e, red=0x232322, hem=0xd9a53a, armour=0x262422, leather=0x2c2a28, gem=0x2d479a) })
add("bhishma_elder", "oldking", "old", 0xc68b58, WHITE, 192, crown="circlet", wide=1.06, mu=0.7, belly=0, stache=True, looks={
  "court": L("hair locks longhair crown beardF beardL stache dhoti sash shawl beads gold bands", cloth=0xf4efe4, red=0xb5ac9f, cloth2=0xf4efe4, gem=0xd9d9d9),
  "war":   L("hair locks longhair crown beardF beardL stache cuirass pauldron lames tasset vambrace greave dhotiS sash beads", cloth=0xf4efe4, red=0xb5ac9f, armour=0xbab7ae, leather=0xa9a69e, gold=0xcfc8b0, gem=0xd9d9d9) })
add("drona_elder", "old", "old", 0xac744a, 0xdcd6cd, 178, mu=0.6, stache=True, looks={
  "teacher": L("hair knot beardF stache dhoti tuck thread beads tilak", cloth=0xf4e2c5, red=0xb76c58),
  "war":     L("hair knot beardF stache cuirass pauldron vambrace dhotiS tuck thread beads", cloth=0xf0dcc0, red=0xab6a4d, armour=0x827d77, leather=0x5a4636) })

# ---- The wider cast
add("dushasana_child", "childB", "child", 0xab6742, BLACK, 132, rich=True, looks={"home": L("hair knot dhoti sash gold bands", cloth=0x7a1c3a, red=0x282828, hem=0xd9b74c)})
add("dushasana_youth", "youthB", "stern", 0xb87048, BLACK, 174, looks={"student": L("hair knot dhotiS tuck thread", cloth=0xf8f3e7, red=0x8a6a4a, hem=0xf8f3e7)})
add("dushasana_adult", "strong", "stern", 0xa96541, BLACK, 188, crown="mukuta", rich=True, stache=True, looks={
  "court": L("hair locks crown gold ear bands anklets girdle panel shawl dhoti stache goatee", cloth=0x791f3d, red=0x282828, cloth2=0x434446, hem=0xd9a53a, gem=0x9d1126),
  "war":   L("hair locks crown cuirass pauldron lames tasset boss vambrace greave dhotiS sash stache goatee", cloth=0x7e203c, red=0x282828, hem=0xd9a53a, armour=0x6a5238, leather=0x5a4630, gem=0x7d0918) })
add("shakuni_elder", "slim", "lean", 0xc48e66, 0x4a4642, 176, crown="circlet", rich=True, mu=0.5, stache=True, looks={
  "court": L("hair locks crown gold ear bands girdle shawl dhoti stache goatee", cloth=0x115770, red=0x0a3a4c, cloth2=0xa9a39c, hem=0xbdb6aa, gem=0x1a3a9a),
  "war":   L("hair locks crown cuirass pauldron lames tasset vambrace dhotiS sash stache goatee", cloth=0x0b4a5e, red=0x01205c, hem=0xbdb6aa, armour=0x8e8a88, leather=0x3b291f, gem=0x1a3a9a) })
AS = 0xbc7a50
add("ashwatthama_child", "child", "child", AS, BLACK, 128, looks={"home": L("hair knot dhoti tuck thread tilak", cloth=0xf2e6d2, red=0xd8c8b0, gem=0xc0202a)})
add("ashwatthama_youth", "youth", "stern", AS, BLACK, 170, looks={"student": L("hair knot longhair dhotiS tuck thread tilak", cloth=0xf2e6d2, red=0xd8c8b0, gem=0xc0202a)})
add("ashwatthama_adult", "strong", "stern", AS, BLACK, 186, crown="circlet", rich=True, stache=True, looks={
  "war": L("hair locks knot crown cuirass pauldron lames tasset boss vambrace greave dhoti sash stache beardS tilak", cloth=0xaa232d, red=0xd46627, hem=0xd9a53a, armour=0x4b4f4f, leather=0x3c4040, gem=0xb80624) })
add("kripa_elder", "old", "old", 0xc48a58, 0xd2cdc4, 179, stache=True, looks={"court": L("hair knot beardS stache dhoti tuck shawl thread beads", cloth=0xf2e8d4, red=0xd9c8a8, cloth2=0xf2e8d4)})
add("vidura_elder", "old", "old", 0x74503a, 0x9a958c, 172, girth=0.8, arm=0.66, looks={"court": L("hair beardS stache dhoti tuck shawl", cloth=0xf3e6cc, red=0xd8c8a8, cloth2=0xf6f0e0)})
add("dhritarashtra_elder", "oldking", "old", 0xd9a070, WHITE, 185, crown="mukuta", rich=True, belly=0.8, stache=True, looks={
  "court":    L("hair locks longhair crown beardF beardL stache gold ear bands girdle shawl dhoti", cloth=0x083ba3, red=0x051f60, cloth2=0x0a3aa0, hem=0xddb256, gem=0xb0202a),
  "mourning": L("hair locks longhair beardF beardL stache dhoti tuck shawl", cloth=0xf6f2e8, red=0xe2d8c4, cloth2=0xf6f2e8) })
add("gandhari_elder", "womanO", "womanO", 0xd9a87c, 0xbdb8b0, 165, rich=True, looks={
  "court":    L("hair bun veil blindfold dhotiL sash bandeau shawl gold ear bands", cloth=0x21626a, red=0xada9a2, cloth2=0x1c5860, band=0xe8e0d0, hem=0xc8c4bc),
  "mourning": L("hair bun veil blindfold dhotiL tuck bandeau shawl", cloth=0xf4f0e6, red=0xe0d8c8, cloth2=0xf4f0e6, band=0xf0ebe0) })
add("kunti_elder", "womanO", "womanO", 0xdea878, 0xa9a49c, 162, looks={
  "home":   L("hair bun veil dhotiL tuck bandeau shawl", cloth=0xf2ead8, red=0xe0d4bc, cloth2=0xf2ead8, band=0xf0e8d8),
  "forest": L("hair bun dhotiL tuck bandeau shawl", cloth=0xe4d2b0, red=0xb79976, cloth2=0xd9c29c, band=0xd9c29c) })
add("balarama_adult", "strong", "broad", 0xf0c896, BLACK, 192, crown="circlet", rich=True, wide=1.14, looks={
  "court": L("hair locks knot crown gold ear bands anklets girdle shawl dhoti", cloth=0x1a4a9d, red=0x0c2558, cloth2=0xe8e8ea, hem=0xc8c8cc, gem=0x1a4a9d) })
AB = 0xc98850
add("abhimanyu_youth", "youth", "young", AB, BLACK, 172, crown="circlet", rich=True, mu=0.75, arm=0.8, looks={
  "home": L("hair locks crown gold ear bands girdle shawl dhoti", cloth=0xf6f0e2, red=0x1a3774, cloth2=0x66a7f3, hem=0x1a3774, gem=0x004efe),
  "war":  L("hair locks helmet cuirass pauldron lames tasset vambrace greave baldric dhotiS sash", cloth=0xf6f0e2, red=0x2567e8, hem=0x1a3774, armour=0xb9b4a8, leather=0x9a968c, iron=0xb0aca0, gem=0x004efe) })
add("ghatotkacha_adult", "heavy", "broad", 0xa46037, BLACK, 215, rich=True, facefix=dict(), looks={
  "war": L("ear bands anklets harness girdle shawl dhoti", cloth=0x29211e, red=0xa1241a, cloth2=0xbe2825, hem=0xcc6635, gold=0x8a6a3a, gem=0xa1241a) })
add("drupada_elder", "oldking", "old", 0xcf9a68, 0xa9a39a, 180, crown="mukuta", rich=True, stache=True, looks={
  "court": L("hair locks longhair crown beardF stache gold ear bands girdle panel shawl dhoti", cloth=0xa3371e, red=0x671c0f, cloth2=0xa3371e, hem=0xd9a53a, gem=0xb0202a),
  "war":   L("hair locks longhair crown beardF stache cuirass pauldron lames tasset vambrace greave baldric dhotiS sash", cloth=0x9e361c, red=0x8a2a16, hem=0xd9a53a, armour=0x9a968e, leather=0x86827a, gem=0xb0202a) })
DH = 0x8c5736
add("dhrishtadyumna_youth", "youth", "firm", DH, BLACK, 170, looks={"student": L("hair knot dhotiS tuck thread", cloth=0xf2e8d8, red=0xd8c6b2, hem=0xf2e8d8)})
add("dhrishtadyumna_adult", "strong", "firm", DH, BLACK, 186, crown="mukuta", rich=True, stache=True, looks={
  "court": L("hair locks crown gold ear bands anklets girdle panel shawl dhoti stache beardS", cloth=0x771628, red=0xfc6013, cloth2=0x8d2125, hem=0xd9a53a, gem=0xf43015),
  "war":   L("hair locks crown cuirass pauldron lames tasset vambrace greave baldric dhotiS sash stache beardS", cloth=0x861b27, red=0xfb671b, hem=0xd9a53a, armour=0xa9a59c, leather=0x96928a, gem=0xf43015) })
add("shikhandi_adult", "slim", "fine", 0xd19563, BLACK, 176, crown="circlet", rich=True, looks={
  "court": L("hair locks knot crown gold ear bands anklets girdle shawl dhoti", cloth=0x822434, red=0x5a1420, cloth2=0x8a2a3a, hem=0xdca342, gem=0xd92d3b),
  "war":   L("hair locks knot crown cuirass pauldron vambrace greave baldric dhotiS sash", cloth=0x8f2533, red=0x6a1826, hem=0xe3a740, armour=0xacacac, leather=0x9a9a98, gem=0xd92d3b) })
add("satyaki_adult", "strong", "firm", 0x573928, BLACK, 188, crown="circlet", rich=True, stache=True, looks={
  "court": L("hair locks knot crown gold ear bands anklets girdle shawl dhoti stache beardS", cloth=0x285ca0, red=0xfea128, cloth2=0xfea128, hem=0xd9a53a, gem=0x285ca0),
  "war":   L("hair locks knot crown cuirass pauldron lames tasset vambrace greave baldric dhotiS sash stache beardS", cloth=0x22528e, red=0xf5a930, hem=0xd9a53a, armour=0x9b9b99, leather=0x8a8a88, gem=0x285ca0) })
add("jayadratha_adult", "strong", "stern", 0xc98850, BLACK, 184, crown="mukuta", rich=True, stache=True, looks={
  "court": L("hair locks crown gold ear bands anklets girdle panel shawl dhoti stache goatee", cloth=0xe8a02d, red=0x7a1d16, cloth2=0x3c2011, hem=0x864c1b, gem=0x7a1d16),
  "war":   L("hair locks crown cuirass pauldron lames tasset vambrace greave dhotiS sash stache goatee", cloth=0xe49a2d, red=0x3b2212, hem=0x864c1b, armour=0x62452f, leather=0x4a3424, gem=0x7a1d16) })
add("shalya_adult", "strong", "firm", 0xe4ab74, 0x55524e, 186, crown="mukuta", rich=True, stache=True, looks={
  "court": L("hair locks crown gold ear bands anklets girdle panel shawl dhoti stache beardS", cloth=0x542376, red=0x2c1240, cloth2=0xbfbbb7, hem=0xc8c4c8, gold=0xc8c8cc, gem=0x7a3ab0),
  "war":   L("hair locks crown cuirass pauldron lames tasset vambrace greave baldric dhotiS sash stache beardS", cloth=0x581f86, red=0x8a84a0, hem=0xc8c4c8, armour=0xc5c1bc, leather=0xb0aca8, gold=0xc8c8cc, gem=0x7a3ab0) })
add("virata_elder", "oldking", "old", 0xd99c68, 0xc9c4ba, 178, crown="mukuta", rich=True, belly=0.7, stache=True, looks={
  "court": L("hair locks longhair crown beardF stache gold ear bands girdle panel shawl dhoti", cloth=0x964b23, red=0x642a12, cloth2=0xe9d8a8, hem=0xd9a53a, gem=0xb0202a),
  "war":   L("hair locks longhair crown beardF stache cuirass pauldron lames tasset vambrace greave dhotiS sash shawl", cloth=0x96471c, red=0x5f240c, cloth2=0xe9d8a8, hem=0xd9a53a, armour=0xb9873a, leather=0xa07030, gem=0xb0202a) })
add("uttara_adult", "youth", "young", 0xc4824f, BLACK, 179, crown="circlet", rich=True, mu=0.7, looks={
  "court": L("hair locks knot crown gold ear bands girdle shawl dhoti", cloth=0xf0e4c9, red=0xc9223d, cloth2=0xc9223d, hem=0xd9a53a, gem=0xc9223d),
  "war":   L("hair locks knot crown cuirass pauldron lames tasset vambrace baldric dhotiS sash", cloth=0xf0e2c7, red=0xc7213b, hem=0xd9a53a, armour=0x7a7876, leather=0x6a6866, gem=0xc9223d) })
EK = 0x8a5a36
add("ekalavya_youth", "youth", "young", EK, BLACK, 168, looks={"forest": L("hair knot hide strap dhoti tuck", cloth=0x8f6543, red=0x6a4426, hide=0x2a2420)})
add("ekalavya_adult", "fit", "plain", EK, BLACK, 180, stache=True, looks={"forest": L("hair knot beardS stache hide strap dhoti tuck", cloth=0x8f5e38, red=0x6a4426, hide=0x2a2420)})

# ---- The game's own people, and the people of the world
add("charu_adult", "fit", "plain", 0xb67847, BLACK, 176, mu=0.85, arm=0.95, looks={"smith": L("hair knot apron dhotiS tuck", cloth=0xf0dcb8, red=0x9a4a2e, leather=0x80502e)})
add("ugra_adult", "strong", "broad", 0xb7703b, BLACK, 182, mu=0.7, soft=True, abs=False, looks={"home": L("hair knot dhoti tuck drape", cloth=0xf4e4c6, red=0xbe622c, cloth2=0xf4e4c6)})
add("mauni_elder", "old", "old", 0x9a6238, WHITE, 172, stache=True, looks={"forest": L("hair jata beardF stache hide dhoti tuck beads", cloth=0xb4743e, red=0x8c5325, hide=0xd9c6a0)})
add("healer_elder", "womanO", "womanO", 0xc88248, 0x8a857c, 160, looks={"home": L("hair braid dhotiL tuck bandeau shawl beads tilak", cloth=0xecdab1, red=0x6a7a4a, cloth2=0xecdab1, band=0xe2d4b1)})
add("bard_adult", "plain", "fine", 0xb9773f, BLACK, 174, stache=True, looks={"home": L("hair knot beardS stache dhoti tuck drape", cloth=0xf4e6c8, red=0x264d86, cloth2=0xf4e6c8)})
add("village_child_child", "child", "child", 0xc8843f, BLACK, 115, looks={"home": L("hair knot dhotiS tuck shawl", cloth=0xf4e8d0, red=0xb8502e, cloth2=0xf4e8d0)})
add("villager_m_adult", "plain", "plain", 0x9c6439, BLACK, 172, stache=True, mu=0.6, sided=True, looks={"home": L("hair knot beardS stache dhoti sash drape beads", cloth=0xf2e2c0, red=0x7a5030, cloth2=0xf2e2c0, hem=0xe0cca0)})
add("villager_f_adult", "womanO", "woman", 0xc07a48, BLACK, 158, sided=True, looks={"home": L("hair bun dhotiL tuck bandeau shawl beads tilak", cloth=0xf2ddb8, red=0xb8553a, cloth2=0xf2ddb8, band=0xa74d32)})
add("guard_adult", "fit", "plain", 0xc2793d, BLACK, 182, mu=0.85, stache=True, looks={"war": L("hair helmet cuirass pauldron vambrace greave dhotiS sash stache", cloth=0x15438a, red=0x0f1f43, hem=0xbcb4aa, armour=0x8a8478, leather=0x6a4a30, iron=0x8a8680)})
add("raider_adult", "strong", "stern", 0xa15f33, BLACK, 176, mu=0.85, stache=True, looks={"war": L("hair turban beardS stache cuirass vambrace dhotiS sash", cloth=0x8a4e2c, red=0x7a1d16, hem=0x6a3a20, armour=0x5c3f28, leather=0x4a3220)})
add("brahmin_adult", "plain", "plain", 0xac7142, BLACK, 172, belly=0.6, looks={"home": L("dhoti tuck drape thread beads tilak", cloth=0xf6ecd6, red=0xc8643a, cloth2=0xf6ecd6, gem=0xc8643a)})

# (Not on the sheets: Charu and Ugra as the children and youths the story first shows, taken down from their grown sheets.)
add("charu_child", "child", "child", 0xb67847, BLACK, 122, looks={"home": L("hair knot dhotiS tuck", cloth=0xf0dcb8, red=0x9a4a2e)})
add("charu_youth", "youth", "young", 0xb67847, BLACK, 166, looks={"home": L("hair knot dhotiS tuck drape", cloth=0xf0dcb8, red=0x9a4a2e, cloth2=0xf0dcb8)})
add("ugra_child", "childB", "child", 0xb7703b, BLACK, 132, looks={"home": L("hair knot dhotiS tuck", cloth=0xf4e4c6, red=0xbe622c)})
add("ugra_youth", "youthB", "broad", 0xb7703b, BLACK, 176, mu=0.6, looks={"home": L("hair knot dhoti tuck drape", cloth=0xf4e4c6, red=0xbe622c, cloth2=0xf4e4c6)})

# ---- Builds pushed apart, so a hero is known by his outline before his crown (docs/Figure_Comparison.md, item 3).
def shp(**k): d = dict(chest=1.0, trap=1.0, neck=1.0, waist=1.0, lat=1.0); d.update(k); return d
for st_ in ("child", "youth", "adult"): CAST["bhima_" + st_]["handle"] = True          # his moustache is the wrestler's, swept up (the owner's print)
CAST["bhima_adult"].update(wide=1.27, girth=1.07, arm=1.1, leg=1.04, shape=shp(chest=1.06, trap=1.12, neck=1.1, waist=1.05, lat=1.04))                       # square and huge
CAST["arjuna_adult"].update(wide=1.07, girth=0.94, arm=0.93, shape=shp(chest=1.06, trap=0.92, neck=0.93, waist=0.8, lat=1.18))                              # a lean wedge
CAST["yudhishthira_adult"].update(wide=0.97, girth=0.83, arm=0.7, leg=0.84)                                                                                   # slight, upright
CAST["karna_adult"].update(wide=1.03, girth=0.92, arm=0.94, leg=0.96, shape=shp(chest=1.03, trap=0.9, neck=0.9, waist=0.83, lat=1.1))                        # tall and narrow
CAST["duryodhana_adult"].update(wide=1.17, girth=1.1, belly=0.45, soft=True, abs=False, shape=shp(chest=1.06, trap=1.06, neck=1.06, waist=1.1))              # a barrel
CAST["dushasana_adult"].update(wide=1.12, girth=1.07, belly=0.35, soft=True, abs=False)
CAST["ashwatthama_adult"].update(mu=0.9, girth=0.92, arm=0.92, wide=1.05)
CAST["satyaki_adult"].update(wide=1.15, girth=1.04)
CAST["krishna_adult"].update(girth=0.9, arm=0.86, mu=0.8)
CAST["balarama_adult"].update(girth=1.08, belly=0.3)
CAST["jayadratha_adult"].update(belly=0.3, soft=True, abs=False)

# ---- Heads set against the painted portraits (art/p_*.webp): who is bearded, who is shaven, how the hair is worn.
def wears(key, add_="", drop="", looks=None):
    for lk, v in CAST[key]["looks"].items():
        if looks and lk not in looks: continue
        v["parts"] = [p for p in v["parts"] if p not in drop.split()] + [p for p in add_.split() if p not in v["parts"]]
wears("arjuna_adult", "stache", looks=("home", "court", "war", "mourning"))
wears("yudhishthira_adult", "beardS", looks=("home", "court", "war", "mourning", "disguise"))
wears("karna_adult", drop="stache beardS")
wears("duryodhana_adult", drop="stache goatee")
wears("dhrishtadyumna_adult", "knot")
wears("kripa_elder", drop="knot beardS stache")
wears("vidura_elder", "bun"); CAST["vidura_elder"]["skin"] = 0x9c6c4a
wears("abhimanyu_youth", drop="locks")
wears("mauni_elder", "longhair"); CAST["mauni_elder"]["hair"] = 0x4a4038
wears("ugra_adult", drop="hair")
# ---- The rank and file wear their army's crest (it is dyed with the sash).
for k_ in ("soldier_foot_adult", "soldier_archer_adult", "soldier_charioteer_adult", "soldier_cw_adult"): wears(k_, "crest")

