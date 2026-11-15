# Portraits cut from the artist's sheets

`cut_portrait.py` makes the round faces of the people you know (`art/p_<id>.webp`) from the artist's
character sheets, with no painter. It was written on 15 November 2026, when the sheets became the true
look and the owner chose to make do without repainting (see `docs/Repaint_Brief.md`).

```
python3 tools/portraits/cut_portrait.py <sheets> <out> [--install] [--only=id,id] [--look]
```

- `<sheets>`: a folder with `index.json` (`{"files": {sheet name: path}}`) and the sheets (3000 by 1688).
  The sheets are not in this repo.
- `<out>`: where the 480 by 640 PNGs go. `--install` also writes `art/p_<id>.webp`.
- `--look` writes `<out>/look.jpg`: each portrait as it was beside the new one, with the round face the
  game shows. Put the old files in `<out>/old/` first, or it compares the new ones with themselves.

Needs Pillow, numpy and scipy.

## What it does to a sheet

1. Takes the front figure, head to hands (`REGION`).
2. Paints out the sheet's lettering: dark strokes, black or maroon, with paper all round them.
3. Finds the paper (flat cream that reaches the top or a side). The largest thing left is the person.
4. Peels the white glow the sheets draw round every figure, and the loose grey strands drawn over it
   beside black hair. They would stand out pale on a dark ground.
5. Frames head and shoulders (340 sheet pixels wide, a little air above the crown), so that the face is
   as large in the game's round frame as on the painted portraits.
6. Grades it toward lamp light and sets it on a dark wall with a lamp's glow low on the left.

## Tuning by hand

`JOBS` lists every portrait: its sheet and, where the sheet needs it, one of these:

| Setting | For | Used on |
|---|---|---|
| `erase` | lettering that touches the figure, wiped by a box | Duryodhana (the title stands on the tip of his crown), Arjuna (it runs into the wing of his diadem) |
| `redline` | the red dashed height line where it runs into hair | Charu, Ugra |
| `gaps` | bare paper shut in by an arm or a lock of hair, named by a point inside it | Yudhishthira, Karna, Ghatotkacha, Ugra |
| `tol` | how far from the paper's colour still counts as paper | none now (10) |

Paper and white cloth are too alike to tell apart safely, which is why a shut-in gap is named by hand
and not guessed. A looser test for lettering took grey strands of hair for letters, so that test is
strict and the two awkward titles are wiped by a box.

## To give another person a face

Add a line to `JOBS`, run with `--only=<id> --look`, look at the picture, tune, then `--install`. Add
the id to `PORTRAITS` in `js/ui/dom.js` if the person had no portrait before.
