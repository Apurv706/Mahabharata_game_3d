# Everything that moves, and every model: a review (13 November)

The owner asked for "a review of all blender assets and other moving components of the game", and for the moving components to be improved "to make game feel more realistic". This is what was looked at, what was found, what was changed, and what is left.

## 1. How the models were checked

Three scripts from the blender-skills pack (github.com/EL4CTEO/blender-skills, MIT licence) now live in `tools/blender/skills/`, unchanged: `qa_check.py`, `mesh_stats.py` and their helper `_bpyx.py`. Only these three were read in full and brought in; nothing else from that pack runs here.

They look for the faults that are easy to miss by eye:

- a part hanging in the air, joined to nothing;
- faces turned inside out;
- two surfaces in the same place, which flicker as the view moves;
- a point pulled by more than four joints (a game keeps only four);
- size against a budget for a web page.

To run them:

- a person: `python3 tools/blender/cast.py -- <out dir> qa <key>` (one line of results per costume)
- a beast: `python3 tools/blender/props.py -- <out dir> <horse|elephant|cow|deer|tiger|dog> qa`

### What they found in the 79 people (154 costumes)

| Finding | Before | Now | What it was |
|---|---|---|---|
| Hip cloth and the armour skirt in one place | 4,826 pairs of triangles | 0 | The ragged patches at the hips of every war costume. The skirt now stands off the cloth. |
| A thumb's end apart from its hand | 10 costumes (Bhima, Ghatotkacha) | 0 | The broadest hands pulled the thumb in two. It has a knuckle now. |
| Daylight through a closed hand | every hand | none | Four fingers in a row left rows of small windows at each crease. A thin bar now lies inside each crease. |
| Other pairs of surfaces in one place | about 400 pairs over all costumes | the same | Two or three triangles a costume, where a hem meets its cloth or hair meets hair. Not seen in play. Left. |
| Parts "hanging in the air" | 189 | 184 | Almost all are pleats, greaves and breastplates, which stand off the body on purpose. The check cannot tell that from a fault. Left. |
| Points pulled by more than four joints | every costume | every costume | True in Blender; the export keeps the strongest four. Not a fault in the game. |

No costume passes the pack's strict "game" profile, for the last two reasons. Triangles for each costume: 11,437 least, 14,685 in the middle, 20,899 most (Bhima at war).

### The beasts

All six pass the checks: horse, elephant, cow, deer, tiger, dog.

### Rules kept from the pack

1. Every model is checked before it ships. A new fault is fixed in the script that builds the model, never by hand in the file.
2. A thing that lies on another (a stripe on a coat, a border on a cloth) either stands off it by more than the check's tolerance, or has its edge turned in to meet it. The tiger's stripes are made the second way.
3. The pack's budget for a phone is 100,000 to 300,000 triangles and under 200 draws in view. A war fight here is about 940,000 and 540. See section 4.

## 2. The models

| Model | Points | Triangles | State |
|---|---|---|---|
| Horse | 4,648 | about 8,800 | Rebuilt in parts: neck, head, tail, and each leg in three lengths. |
| Elephant | 5,096 | about 9,600 | Rebuilt in parts: trunk in three, two ears, tail, each leg in two. |
| Humped cow | 2,223 | 4,322 | New. Hump, dewlap, swept horns, tufted tail. Any coat colour. |
| Spotted deer | 3,717 | 6,972 | New. A stag with three-tined antlers, white spots, pale belly. |
| Tiger | 5,470 | 8,566 | New. Barred coat, white cheeks, heavy paws, long tail. |
| Village dog | 2,522 | 4,944 | New. Prick ears, curled tail. |
| People (79) | 11,400 to 20,900 triangles | | Rebuilt twice this session: the hip cloth, then the hands. |

The cow, deer, tiger and dog are built on the horse's plan with the same part names, so the game moves all of them with the horse's gaits. Before this, cattle were scaled-down horses in the herding test and balls on sticks in the pasture; the deer and tiger were recoloured horses; the dog was a box.

## 3. What moves: before and now

| Thing | Before | Now |
|---|---|---|
| **Horses** | Four stiff legs swinging together. | A walk (one foot at a time), a trot (diagonal pairs), a gallop (hind feet, fore feet, then all four off the ground). Knees, hocks and fetlocks fold. Standing, a horse rests a hind foot, swishes its tail and now and then tosses its head. It changes gait with its speed, never in one frame. |
| **Elephants** | Stiff legs. | A walk on the same side's legs in turn, the body rolling, the trunk swaying in three lengths, ears fanning, tail swinging. |
| **Chariots** | Turned like a car. No give. | The team swings round first and the car follows. The car jolts and rocks on its axle. Those riding it ride the jolts. Dust from the wheels at a run. |
| **Cattle** | Small horses; balls on sticks. | Real cattle. Standing, they graze with their heads down, lift them, swish at flies. They walk and trot. |
| **Deer** (archery) | A small horse. | A stag that bounds, head up, tail up. Standing, it grazes briefly, then lifts its head and looks about. |
| **Tiger** (archery) | An orange horse. | A tiger, head low, tail out behind. |
| **Dog** (stealth) | A box. | A dog asleep with its head on its paws. Woken, it gets up, faces you and barks, then settles again. |
| **Bird** (archery) | A ball with a plank. | A green parrot with beating wings, flying the way it is going. |
| **People walking** | Legs and arms swung; the shoulders turned the wrong way. | The hips go with the legs and the shoulders against them. The hip of the leg in the air drops, the body rides over the foot that carries it, the head stays on its line. |
| **People running** | A faster walk. | Knees higher, the body lowest over the landing foot, the arms bent and working. Men fleeing a divine weapon really run now (they used to slide at a walk). |
| **People standing** | Breathing only. | Weight goes slowly from one foot to the other and the eyes wander. A fighting stance is never quite still. |
| **Hands** | Windows between the fingers. | Closed. |
| **Arrows** | Flew straight and vanished. | Turn on their own line as they fly. One that misses drops and stands in the ground, shaking. One that strikes stays in the man or his shield for a few seconds. Never in you. Fourteen at most at one time. |
| **A tossed pebble** (stealth) | Was drawn as an arrow. | A pebble, tumbling. |
| **Trees, reeds, grass** | Still. | Lean with a wind and come back; leaves stir. The shadows move with them. Palms give most, banyans least. |
| **The ranks, and crowds** | Still. | Each man sways a little from the feet in his own time. |
| **Banners** | One even ripple. | Gusts, a second ripple, the fly end sagging. |
| **The sky** | Empty. | Birds wheeling far off over open country by day: seven over a battlefield, two to four elsewhere. |
| **Dark cloth edges** | Black shards on hanging cloth. | Clean. |

Nothing here changes a rule of play. Calm motion (the setting) stops the wind, the swaying ranks and the birds.

## 4. What it costs

Measured in a desktop browser at phone size, one moment in each fight:

| Fight | Draws before | Draws now | Triangles before | Triangles now |
|---|---|---|---|---|
| Day one (`e_day1`) | 628 | 536 | 919,934 | 942,124 |
| Supratika (`fs_d12_elephant`) | 314 | 230 | 721,350 | 742,148 |

Each horse and elephant was five separate pieces to draw and is now one, which is where the saving comes from. The jointed beasts have a few more triangles. Wind, the swaying ranks and the birds are worked out on the graphics chip and add one draw (the birds).

The four new beasts add about 390 KB to the download before compression.

Not measured on a phone. The owner reported the game as sluggish in the published pages; this change lowers the number of draws by about a seventh in a war fight and does not lower the triangle count.

## 5. Not done

- **Lighter beasts far off.** A horse is 8,800 triangles at any distance. A plainer horse beyond thirty metres would take about a tenth off a war fight's triangles. Worth doing if the phone is still slow.
- **Karna's wheel in the mud** as a fight. It is a story scene with choices today; making it a fight rewires a death the epic fixes. Waiting for a ruling.
- **Riders in the howdahs.** War elephants carry an empty howdah, except where the story puts a mahout in reach.
- **Tents and awnings** do not move in the wind. Lotus pads do not bob.
- **Feet are not planted** by measurement: a foot can slide a little on a turn.
- The remaining notes of the checks in section 1.
- None of this has been played on a phone. It was checked by pictures taken through a stride, by the rules tests, the fight bands and the smoke tests.
