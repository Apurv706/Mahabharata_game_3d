# Builds every model in cast_specs.py (or those named) into js/g3/models/, two at a time, and lists them in index.html.
#   python3 tools/blender/build_cast.py [key ...]
import os, sys, subprocess, re
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", ".."); OUT = os.path.join(ROOT, "js", "g3", "models")
sys.path.insert(0, HERE)
from cast_specs import CAST
keys = sys.argv[1:] or list(CAST); os.makedirs(OUT, exist_ok=True)
def one(k):
    r = subprocess.run([sys.executable, os.path.join(HERE, "cast.py"), "--", OUT, "export", k], capture_output=True, text=True)
    ok = "exported" in r.stdout; print(("ok   " if ok else "FAIL ") + k + ("" if ok else "\n" + (r.stdout + r.stderr)[-1500:]), flush=True); return ok
with ThreadPoolExecutor(2) as ex: res = list(ex.map(one, keys))
p = os.path.join(ROOT, "index.html"); s = open(p).read()
import json
files = ["js/g3/models/" + f for f in sorted(os.listdir(OUT)) if f[:2] in ("m_", "p_") and f.endswith(".js")]
s2 = re.sub(r"(<!-- models -->\n<script>window\.K_MODELS = )\[[^\]]*\](;</script>)", lambda m: m.group(1) + json.dumps(files) + m.group(2), s)
if s2 != s: open(p, "w").write(s2)
print(sum(res), "of", len(res), "built;", len(files), "listed")
