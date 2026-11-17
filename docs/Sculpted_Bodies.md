# Sculpted bodies (17 November)

Arjuna (`arjuna_adult`) is built as a **whole MakeHuman person**: MakeHuman's own body, head, face and hands, reshaped to the game's skeleton and dressed in the game's costumes. The other 78 figures are unchanged.

(An earlier try the same night kept the game's own head and hands on a MakeHuman body. The owner asked to start from the full MakeHuman person instead, and that's what's live now.)

## What it is

- **Source:** MakeHuman / MPFB 2 base mesh, shape targets and skin weights. All CC0 (free for commercial and closed-source use). Only MPFB's *data* is used; none of its code runs. Copied into `tools/blender/mpfb_data/` by `tools/blender/mpfb_vendor.py` (≈19 MB, 4 files). The data includes every face-shape control: chin, cheeks, nose, mouth, brows, head, forehead, eyes.
- **Body:** `tools/blender/mpfb_body.py` → `build_full()`.
  - Shaped by sex, age, muscle, weight, height, proportions, and a hero's V, chest, shoulders and arms.
  - Arms are swung down from the A pose by rotation.
  - Each part is refitted to the game's joints (shoulders 1.41, hips 0.92, knees 0.47…).
- **Head:** kept whole at one scale, set so the eyes sit where the game's did and the skull is as tall, then raised on a real neck (spec `neck`, default 0.035 m). Everything made for the old head (hair, crowns, earrings, tilak, beards) is raised with it.
- **Neck (owner's request):** the clay figures had almost no neck: the chin sat 8 cm above the collar notch, at the height of the shoulders' tops. It is now 13 cm, about a man's of his height. He stands about 3.5 cm taller.
- **Hands:** MakeHuman's hands, curled into a fist round a haft. Each finger is turned the way that wraps its tip round the haft. The fist's hollow is the game's grip point, and the finger bones drive the game's knuckle (g) and middle (h) joints, so empty hands open.
- **Face:** `tools/blender/mpfb_face.py`. It removes the old face features and makes new ones:
  - eyes (white, iris, pupil);
  - brows on the game's brow joints (they move with mood);
  - lips cut from the skin (they move with the jaw);
  - a moustache;
  - optionally a short beard.
  It then sets all head wear on the new skull: nothing sinks in, and hair caps, beards and marks are drawn in to the skin.
- **Face set to his sheet (owner's request).** The sheets aren't in the repo; his portrait `art/p_arjuna.webp` is cut from his sheet and was used as the reference.
  - **Bones of the face** (MakeHuman targets in his spec): leaner and a little narrower, high cheekbones over hollow cheeks, a firm chin with a cleft, a long straight narrow nose, a lower brow ridge.
  - **Brows:** thick, dark, nearly straight and low (they were thin high arches).
  - **Moustache:** fuller, drawn down at the corners.
  - **A close beard** on the jaw and chin. It thins to nothing at its edges, its edge runs smooth, and it stops short of the ear. It is coloured dark hair over skin (`stubblek` 0.58), not black. Worn at home, at court, at war and in mourning; the forest look keeps its full beard, and the disguise is clean-shaven.
  - All of these are per-person settings: `mpfb=dict(face=dict(brow_h, brow_arch, brow_w, brow_w_out, brow_slant, stache_w, stache_h, stache_droop, stache_off, beard, beard_cheek, beard_low, beard_back))`.
- **War coat (owner's request: "armour protrudes"):**
  - On a sculpted body the coat stands 9 mm off the skin (spec `armour_off`), not the clay body's 21 mm.
  - Its top follows one smooth curve: a scooped neckline running out over the shoulders (`shell(..., top=)`).
  - Its cut edges are smoothed along their line, so no saw-teeth show.
  - The gold trim rows (`lames`) and the sun badge are set on the coat's face. The trims had always been sunk inside the old, thicker coat.
- **Weights:** MakeHuman's own: jaw → J, upper lids → E. The lid angle comes from MakeHuman's lid markers (×0.8).
- **Switch:** `mpfb=dict(full=True, ...)` in a figure's spec (`cast_specs.py`, end of file). `CAST_CLAY=1` builds the old body to compare.

## Measured (Arjuna, all six looks, 47 poses × 6 views)

| | Old figure | Whole MakeHuman person |
|---|---|---|
| Skin through cloth (cm²) | 3,900–6,700 a look | 495–1,330 a look |
| Inside of the war coat showing | 15,252 | 5,990 |
| Inside of head showing (neck/head gap) | 630–1,980 a look | 17–29 a look |
| Collar notch to chin | 8 cm | 13 cm |
| Triangles a look | 20–25k | 35–40k |
| File | 0.98 MB | about 1.3 MB |

All 3D tests pass (`npm run test:3d`). Model QA: no floating parts; eye, lip and beard faults fixed.

## Still open

- Small spots inside the elbow fold in hard bends.
- The forest beard is the old beard shape drawn onto the new chin, so it reads a little blocky.
- The game shades the short beard with its hair streaks, so in play it reads a little heavier than in Blender.
- The sheet's eyes are deeper-set with heavier lids than the model's.
- The upper cloths still hang like boards (older issue).
- The head still turns about the game's head joint at the neck's base (1.47), which the game sets for every figure.
- **To roll out:** add `mpfb=dict(full=True, …)` per figure, with its own face targets and `face=` settings from its sheet. Women and children use the same data (sex, age) but are untested.
