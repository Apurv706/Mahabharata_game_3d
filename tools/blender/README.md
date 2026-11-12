# Heroes built in Blender

`bhima.py` builds a hero by script in Blender's Python module (`pip install bpy`, Blender 5.3), in the game's own rest pose and
units (hips 0.92, shoulders 1.41, head joint 1.47; front is Blender -Y, his left is +X), on a skeleton with the game's own
joint names, and writes `js/g3/models/hero.js`.

    python3 tools/blender/bhima.py -- <out dir> dress prince|exile|war|youth    # renders that look
    python3 tools/blender/bhima.py -- <out dir> export                          # writes <out dir>/hero.js; copy it to js/g3/models/

The model is one set of points with named **parts** and colour **roles**:

- parts: body, bodylean (a youth), head, hands, face, hair, knot, crown, jata, beard, stache, dhoti, sash, gold, bands,
  uttariya(lean), hide, cuirass
- roles: skin, cloth, red (the wearer's accent), gold, hair, hide, armour, white, iris, lip

`js/g3/model.js` picks the parts from a figure's look (`G.modelParts`: crown or top-knot or matted hair, forest hide or a
prince's upper cloth or armour, a lean body for child and youth) and colours the roles from the look's palette, then skins
the mesh to the figure's own joints. So dress follows the acts and the build follows the years with no new data, and the
game's stage scaling (a child is smaller with a larger head) applies as it does to code-built figures.

A look uses the model when its spec has `model: "hero"` (Bhima and his forest disguise, so far). Rank-and-file (`lite`)
figures never do.

Known: the face is Bhima's for every wearer; the head cannot be hidden for the through-your-eyes view; hero.js is ~0.8 MB.
