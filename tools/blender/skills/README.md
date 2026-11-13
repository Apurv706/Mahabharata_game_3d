# Checks borrowed from blender-skills

Three scripts, unchanged, from https://github.com/EL4CTEO/blender-skills (MIT licence, see `LICENSE`; commit 389f28a, 7 November 2026):

- `qa_check.py` (skill `blender-asset-qa`): parts floating free of the rest, closed parts turned inside out, faces wound against their
  neighbours, collapsed faces, surfaces lying on one another (flicker), unweighted points and points on more than four bones.
- `mesh_stats.py` (skill `blender-game-optimization`): triangles, materials and bones against a platform's budget.
- `_bpyx.py`: the small helper both import.

They are run inside our own builders, on the objects those have just made:

    python3 tools/blender/props.py -- <out dir> horse qa        # also: elephant
    python3 tools/blender/cast.py  -- <out dir> qa <key>        # one character, each of its looks in turn

Each prints one line beginning `QA`. Read by us before use: they only inspect meshes in Blender's memory (no network, no files written).

What we took from the pack's written rules (they are in `docs/Moving_Parts.md`): a web game's budget for one view (about 100 to 300
thousand triangles and under 200 draw calls on a phone), four bone influences a point at most, rigid props bound whole to one bone,
levels of detail at half the triangles each, and "numbers, not adjectives" when reporting a model.
