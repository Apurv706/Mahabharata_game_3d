# Review tools for the human figures

Made for the review of 15 November (`docs/Human_Asset_Review.md`). They change nothing in the game. Each opens the game in a headless browser (Playwright), so run them one at a time on a small machine.

| Tool | What it does |
|---|---|
| `lineup.js <job.json> <outdir>` | Figures side by side in a grey studio, turned for each view (front, side, back, three-quarters). Stacks the views into one sheet with names. |
| `closeup.js <job.json> <outdir>` | One figure at a time with the camera on a spot: `head`, `hand`, `feet`, `bust`, `legs` or `full`. |
| `measure.js <out.json>` | Every model measured standing: heads tall, breadths, and girths taken by cutting the skin with a plane, as a tape lies. |
| `measure_summary.py <measure.json>` | Those measures beside the US Army survey of 2010-12 (`survey.json`: 4,082 men, 1,986 women, each measure as a share of height). |
| `scan.js <out.json> [regex]` | Every costume in 47 poses from six sides, drawn in flat part colours with depth. Counts skin in front of the cloth meant to cover it, the inside of the body or of armour showing, and the lowest point. About 6 seconds a costume. `DBG=<file.json>` keeps a picture of what was counted for chosen poses and views. |
| `scan_summary.py <scan.json>` | The worst costumes for each fault, and the poses that sink into the ground. |
| `falls.js <job.json> <outdir>` | Falls under the physics engine (`js/g3/ragdoll.js`) as a strip of stills: figures in the studio, each struck its own way at time 0 (`v`, `push`, `low`, `spin`), thrown down alive and given back to their poses (`alive`, `rise`), or with a car's or an elephant's collider driven through them (`by`), photographed at the `times` asked for. A man can ride a chariot (`car`, with `horses`, `driver`, `drive` and `wreck`), and an item can be a beast with no man (`beast`: `horse` or `elephant`, with `roll`). The tool steps the engine itself, so a slow machine photographs the same fall. |
| `footprint.js <outdir> <fight> <stand\|side\|run\|ele>` | What stops you, against what is drawn: a real fight with one car or elephant set down on open ground and you sent at it (or it driven at you), photographed from straight above with the rules' own shape drawn on the earth (red its middle, yellow its team or head, blue you). The log gives, for each shot, your place, your health, whether you are down, and how far your middle is from the body's edge. `hold_arjuna` has a team of four, `fs_sk_chariot` a pair, `fs_d12_elephant` the elephant. |

## Jobs

A line-up job:

```json
{ "slots": 8, "tile": [240, 470], "cam": { "fov": 12, "y": 1.16, "span": 1.28 }, "faceCam": true,
  "groups": [ { "name": "heroes", "title": "War dress", "views": ["front", "side", "back"],
    "items": [ { "key": "arjuna_adult", "look": "war", "item": "bow", "pose": "readyBow" },
               { "key": "bhima_adult", "look": "war", "act": "heavy", "dur": 0.8, "at": 0.3 },
               { "id": "vasu" }, { "id": "footman", "lite": true } ] } ] }
```

- `key` is a model and its age (`player_m_child`), `look` one of its costumes. `id` takes a story person as the game dresses him (`G.lookOf`); `lite` gives the plain figure used far off.
- `pose` is a standing pose; `act` a one-shot move with its length `dur` and how far through it to stop (`at`, 0 to 1); `speed` walks or runs (metres a second).
- `faceCam` turns each figure square to the camera (needed when shapes are compared); `mask` draws black shapes on white.

A close-up job is the same with `focus` on each group and `cols` / `byColumn` for the sheet.

## Reading the scan

Areas are square centimetres as seen in one view. Skin counts as "through" when a garment meant to cover that part of the body lies within 5 cm behind it. Some is always counted where an arm leaves a shoulder plate; look at a `DBG` picture before calling a count a fault. The pose `down` is an upright sprawl (the fall is done by `f.drop`) and says nothing.

## openings.js: every fight's opening cards

`node tools/review/openings.js <out.json> [only]` opens each fight in a real page twice (first battles, and later) and writes the cards in order, the question card, the HUD's text and the names. Use it after changing `brief()` in `js/ui/battle/view.js`. About 12 minutes for all 79.
