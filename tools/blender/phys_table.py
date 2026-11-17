"""phys_table.py: each figure's build for the physics (js/g3/ragdoll.js P.BUILDS), from the cast's specs. Run after changing a build:
    python3 tools/blender/phys_table.py      (rewrites the table in place)
[limbs, trunk]: how thick against the foot soldier's (1)."""
import os, sys, json, re
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import cast_specs as C
out = {}
for k, c in C.CAST.items():
    m = c["mpfb"]; H = C.resolve(k); she = m["sex"] < 0.5
    limb = (1 + 0.5 * (m["weight"] - 0.5) + 0.25 * (m["muscle"] - 0.6)) * (0.93 if she else 1.0)
    trunk = 0.5 * (H["wide"] / 0.92) + 0.5 * (1 + 0.9 * (m["weight"] - 0.5) + 0.2 * (m["muscle"] - 0.6)) + 0.25 * H.get("belly", 0)
    out[k] = [limb, trunk]
l0, t0 = out["soldier_foot_adult"]; out = {k: [round(v[0] / l0, 2), round(v[1] / t0, 2)] for k, v in out.items()}
p = os.path.join(HERE, "..", "..", "js", "g3", "ragdoll.js"); s = open(p).read(); assert "/*BUILDS*/" in s
s = re.sub(r"/\*BUILDS\*/.*?/\*END\*/", lambda _: "/*BUILDS*/" + json.dumps(out, separators=(",", ":")) + "/*END*/", s, count=1)
open(p, "w").write(s); print(len(out), "figures")
