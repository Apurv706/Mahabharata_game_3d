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
- **Karna's wheel in the mud** as a fight: built later the same morning on the owner's ruling (`Gameplay_Ideas.md`, Part 9).
- **Riders in the howdahs.** War elephants carry an empty howdah, except where the story puts a mahout in reach.
- **Tents and awnings** do not move in the wind. Lotus pads do not bob.
- **Feet are not planted** by measurement: a foot can slide a little on a turn.
- The remaining notes of the checks in section 1.
- None of this has been played on a phone. It was checked by pictures taken through a stride, by the rules tests, the fight bands and the smoke tests.

## 6. The physics pass (13 November, later)

The owner: "Game is not sluggish, physics of the game doesnt feel right", and then, to a list of seven faults: "All of these 7 plus animal movements and chariots". This is what was done about each. Numbers are measured in the game's own rules, not judged by eye.

| What was wrong | What it does now |
|---|---|
| **1. No weight in your own body.** Full speed in one frame, a dead stop in one frame, a turn in one frame. | You reach full speed (5.3 m/s) in 0.17 s. Let go, and you stop in 0.15 s over a third of a metre. A full reverse takes 0.35 s. From above you come round at about 860° a second: a half turn in a fifth of a second. Everyone else on the field gathers way and loses it too, a little slower than you. The body leans forward as it gathers way and back as it stops. |
| **2. Bodies never pushed.** | Where two bodies meet, each gives ground by the other's weight. Against a foe on his feet you make about 1.1 m in a second, leaning on him. One of your own men steps out of your way. A man staggered or down gives a lot. A shield wall pushes as one weight. Nobody moves an elephant. A car or an elephant under way throws the other side's men aside and staggers them. One posted to bar your way in a break-through gives almost nothing. |
| **3. A blow moved nothing unless it was heavy, and the push was gone in a tenth of a second.** | Every blow that lands moves the body it lands on: a light one about 15 cm, with no stagger. What throws a body back now runs out over half a second. You give ground when you are struck, and a little even on your shield. A blow of yours turned aside comes back up your arm. The arc a blow lands in is a little narrower: it has to be pointed at the man. |
| **4. Arrows flew flat and steered to their target.** | No arrow steers. Yours is loosed at where your man will be when it arrives. If he keeps his way it finds him; if he turns back once it is in the air, it comes down in the ground where he would have been. It strikes the first of theirs in its path, so a man behind a wall of shields is covered by it. Each arrow rises and falls under true gravity, nose up as it leaves and down as it comes in. Against a walking man the bot's arrows strike 96 times in 100. |
| **5. Everyone fell the same way.** | A man goes down the way he was struck: onto his back from a blow in front, onto his face from one behind, over onto his side from one at his side. A heavy blow drops him faster and throws his body about 0.7 m the way the blow went; it slides as it goes down. No two lie quite alike. |
| **6. Nothing fell under its own weight.** | A falling man's weapon and shield leave his hands, turn in the air, strike the ground, bounce once and lie there. A banner cut down topples as a staff does: slowly at first, then all at once. When a car is lost under its man, a wheel comes off and runs on. Thrown things and arrows from far off (Arjuna's at the wheel, the pebble in the stealth test) fly the arc their flight time gives them. |
| **7. Rolls ran at one flat speed.** | A roll pushes off (5.5 m/s in its first step), is fastest a third of the way through (11.4), slows into the landing (7.5), and you come out of it still moving for a fifth of a metre. It covers the same 4 m in the same 0.42 s as before. |
| **Chariots.** They slid sideways and backwards while pointing at you. | A car goes only the way it points. Over a fight its path is 0.4° off its heading on average (it was whatever the archer's aim was). It gathers way at 4.6 m/s² and brakes at 7, comes round no tighter than its speed allows (at most about 120° a second), wheels round you while its archer shoots instead of stopping for each arrow, and at the end of a pass turns in a loop. Thrown back, it rolls back and its wheels turn back. Its wheel-guards keep to its wheels at whatever pace it drives. |
| **Elephants.** The same sliding. | An elephant goes the way it points (0.1° off), is slow to start and slow to stop, comes round slowly, and strikes only at what is in front of it. Get to its flank and it must come round to you. Brought up against what will not move, it stalls and turns; it does not slide along it. |
| **Horses, elephants and the lesser beasts: feet.** Their legs ran on a clock. | The reach of each leg is set from the speed the beast is really making, so a hoof on the ground stays where it was put down. An elephant takes a longer reach and then a quicker step. |
| **People: feet.** Legs always walked forward, at the speed asked for. | Legs go at the pace and in the direction the body is really going: forward, backward (shorter steps, upright), or to the side, where the legs open and close and do not cross. A man leaning on another walks nearly on the spot. |
| **In the tests.** | Cattle you have gathered are no longer drawn along on a string: each gathers way, goes no faster than a trot, turns the way she is going and keeps off the next. The running marks on the archery range (elephant, chariot, deer, tiger) and the runner and teams in the race keep their feet and wheels at the speed the ground goes by. |

### What was not changed, and why

- **Whether a blow lands is still decided the moment it lands**, by reach and arc, and a foe's blow by whether you are standing in its mark when the mark fills. The whole of dodging is built on that mark. What changed is what the blow does to the body.
- **At fighting range a war arrow shoots nearly flat.** At twelve metres yours rises about 3 cm above the bow, and at seventeen, the longest shot you take, about 15 cm; a foe's slower arrow from fifteen metres rises about 40 cm. That is what gravity and an arrow's speed give. You see the flight in the arrow's nose tipping down as it comes in, and in where a miss lands.
- No body goes limp joint by joint. A fall is still a drawn motion, now chosen by the blow.
- Feet are still not planted by measurement. A step is matched to the ground by its length and its pace, which is close, not exact.
- Cloth, hair and the trunk of an elephant do not collide with anything.

### What it did to the fights

The bot's win rate over all 79 fights rose from 91% to 94% with these changes. I could not pin the rise on one cause; the fights that moved most were break-throughs and the hunt. Seven fights were retuned toward their recorded rates (`R3.TUNE` in `js/ui/battle/sim.js`); the fight bands were then recorded again.

Checked by 82 rules tests (ten of them new, each measuring one of the things above), the fight bands, pictures of a man stepping each way and of two falls with their weapons, and plots of a car's and an elephant's path with the way each was pointing. **Not played on a phone.** Feel is exactly what numbers cannot settle, so this needs the owner's hands.

## 7. Helmets (13 November, later still)

The owner: "Human forms dont look right. Work on correcting heros so that their helmets dont protude through the skin".

**What was wrong.** One size of iron bowl was set on every skull. In front it was about half a centimetre smaller than the forehead under it, so on every helmeted head the brow came through the iron just above the rim: Abhimanyu, the player's own figure at every age, the foot soldiers and the guards. The bar over the nose was buried inside the bridge of the nose and could not be seen.

**What it is now.** The helmet is fitted to the head it sits on (`tools/blender/cast.py`): as wide, as long and as high as that head and its hair above the rim, with a finger's breadth to spare, then grown until no point of head or hair is outside it. It is cut clean at the brow all the way round, its rim and knob are placed from the bowl, the bar stands in front of the brow and the nose, and an army's crest sits on the bowl's top. On the heads in the cast the bowl came out about 3 cm longer front to back and a few millimetres wider than the one size.

**Also put right on the way:** the neck opening of the body armour was made by leaving out whole faces, which left a saw's edge of bright shards at its corners on every hero in armour. It is cut along straight lines now.

Checked by pictures of every helmeted head from the front, three-quarter, side, back and above, before and after. All 79 models were rebuilt.

**Not looked at yet:** the rest of "human forms dont look right". The helmets were the one fault named. Proportions, faces, hair and how joints bend have not been reviewed in this pass.

