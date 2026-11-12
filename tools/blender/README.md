# Heroes built in Blender

**Now five: the Pandavas.** `heroes.py` builds one hero a run from a table of parameters (`HEROES`: frame, girth of trunk, arms and legs, the cast of the face, crown, dress, colours) and writes `hero_<name>.js`:

    python3 tools/blender/heroes.py -- <out dir> dress prince <hero> quick    # front and face renders
    python3 tools/blender/heroes.py -- <out dir> export <hero>                # <out dir>/hero_<hero>.js -> js/g3/models/

Bhima follows an old print the user sent (strap, sash, plumed band, moustache); the other four follow a still of the five in court dress (girdle, a pleated fall of a second colour, gold chains crossed on the chest, the eldest's shawl and tall crown). Builds and the cast of each face are taken from it in general terms only (heavier or slighter, longer or rounder, sterner or gentler); no one's likeness is copied. What follows describes the first, single-hero version and still holds for parts and roles.

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
