# Heroes built in Blender (a trial)

`bhima.py` builds Bhima by script in Blender's Python module (`pip install bpy`, Blender 5.3), in the game's own rest pose and
units (hips 0.92, shoulders 1.41, head joint 1.47; front is Blender -Y, his left is +X), so the model can later be skinned
to the same joints the fight poses turn.

    python3 tools/blender/bhima.py -- <out dir> dress     # builds him and renders front, three-quarter, back and face

State: body, head, hair, moustache, lower cloth and gold are modelled and rendered. Not done yet: the skeleton and skin
weights, the export, and loading him into a fight in place of the code-built figure.
