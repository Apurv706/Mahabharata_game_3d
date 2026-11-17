# A real physics engine in the fights (16 and 17 November, Versions 71 and 72)

Asked for: "Let's add a real physics library" (Version 71), then "Lets build the rest" (Version 72), read as the three things Version 71 said it had left out: riders who fall out of their chariots, horses and elephants as bodies of their own, and the limit of six bodies at once.

The fights carry **cannon-es 0.20.0**, a rigid-body physics engine (MIT licence; `js/vendor/cannon-es.min.js`, 121 KB, built from the npm package into one file that defines `CANNON`, as three.js is). The game's use of it is in `js/g3/ragdoll.js`; the figure hands its body over and takes it back in `js/g3/figure.js`; the fight decides when in `js/ui/battle/view.js`.

## What the engine does, and what it does not

The fight's rules (`js/ui/battle/sim.js`) still decide who is struck, how hard, who is thrown down and for how long, and who dies. That reckoning comes out the same on every machine, and the tests and the difficulty rest on it. **Nothing in the rules reads a body's place back from the engine, so no fight is harder or easier than it was.**

What a body does once the rules have struck it is the engine's:

| | Before the engine | Now |
|---|---|---|
| A man killed | Went over by a pose and slid | Eleven rigid parts joined at his joints, thrown by the blow that killed him. He strikes the ground, slides, rolls, folds as his joints allow, and lies as that leaves him |
| A man thrown down but alive (you, or a foe) | The same pose, then up again | The engine has him while he is down, and gives him back to his poses in time to be on his feet when the rules say he is |
| A man killed in a chariot (72) | Went down on the deck by a pose | Falls on the deck, against a rail, or over it and out, by how he was struck |
| A rider thrown down alive, you included (72) | Went down on the deck by a pose | Tumbles on the deck of his car as it runs, turns or stops, stays in it, and gets up in it |
| An elephant killed (72) | Turned onto its side like a statue | A body of 3.6 tonnes: its legs give, it comes down on them, and may go over onto its side. The ground shakes |
| A chariot wrecked (72) | Its horses were laid on their sides at once; a wheel flew off on a set path | Each horse is a body of 400 kg that comes down on its own legs and goes over. The wheel is a wheel: it rolls on some paces, leans and falls flat. The driver falls from the rail |
| A body thrown at a standing man | Passed through him | Strikes him and stops or turns aside |
| A chariot or an elephant | Passed through the fallen | Throws aside a body in its way that is still falling. Its wheels and hooves go over one lying on the ground |
| One body falling where another lies | Lay inside it | Lies on it or beside it. A man who falls where an elephant lies does not lie inside the elephant |
| A dropped mace, sword, spear, bow or shield | Fell on a set path to a set angle | A rigid box of its own size and weight, turning about its own middle |
| A blow on a man who is down | Nothing seen | Moves his body |

## A man

Eleven parts: hips, trunk, head, two upper arms, two forearms (with the hand), two thighs, two shins (with the foot). Each is a few balls along its bone, which meet the ground and each other cheaply and never catch on an edge. A man of ordinary size weighs 75 kg (hips 11, trunk 24, head 5, upper arm 3, forearm 2.2, thigh 8, shin 4.5); a taller figure weighs more by the cube of his height.

The body is built from where the figure's joints are at that moment, so the fall begins from the pose he was in. Ten joints:

| Joint | How it turns |
|---|---|
| Knee | On one line, backward only: straight to 138 degrees |
| Elbow | On one line, forward only: straight to 144 degrees |
| Hip | Inside a cone of 58 degrees about a line a little forward and outward of straight down |
| Shoulder | Inside a cone of 84 degrees about a line out, down and a little forward |
| Spine (hips to trunk) | 32 degrees, further forward than back; 30 degrees of twist |
| Neck | 40 degrees; 48 degrees of twist |

A man's own parts strike each other. What the engine works out is written back into the figure's skeleton every frame, so the modelled skin, the armour and what is still held move with it.

**Version 72 moved every part's own place to the middle of its weight.** The engine takes a body's place to be where its weight is. Version 71 had each part's place at its joint, so a thigh swung as if all its weight were at the hip. For a man that was a small fault. For a horse it was not: the barrel's weight was at its hooves, and it could not be knocked over.

### Each figure's own build (17 November, Version 78; owner: "redo the physics on human forms")

The figures are sculpted people now and differ in build, but the engine still gave every man the same body, only taller or shorter. It now reads each figure's build (`P.BUILDS` in `js/g3/ragdoll.js`, written from the cast's specs by `tools/blender/phys_table.py`): how thick the limbs and the trunk are against the foot soldier's.

- The engine's balls for the hips, trunk and limbs are that much wider, so a broad man lies on his own chest and a slight woman's limbs don't hover off the ground.
- A part's weight goes by the square of its thickness. Bhima is about 155 kg (he was 109 by height alone), Draupadi about 52 (she was 69), Dhritarashtra heavier in the trunk, a child lighter. A heavy man is harder to throw far and falls harder; a light one flies further from the same blow.
- The head, the joints and their limits are as before. The fight's rules (who is hit, who is thrown, how much hurt) are unchanged; this is how a thrown or fallen body moves.
- Limbs range 0.83 to 1.16 of the soldier's, trunks 0.87 to 1.31. Run `python3 tools/blender/phys_table.py` after changing a build.

## A horse, an elephant (Version 72)

A beast is its barrel, which has nearly all the weight, and what hangs from it.

| | Parts | Weight |
|---|---|---|
| Horse | Barrel; neck and head; four legs; four shins with their hooves (10) | 400 kg: barrel 230, neck and head 45, foreleg 18, hind leg 26, shin 9 |
| Elephant | Barrel with head and howdah; trunk in three lengths; four legs; four shins (12) | 3.6 tonnes: barrel 2,600, trunk 60, 30 and 15, leg 140, shin 90 |

A leg swings far forward and back from the shoulder or hip (80 degrees for a horse, 55 for an elephant) and a little out to the side (55 and 34), and folds back at one joint. A horse's neck and each length of an elephant's trunk turn inside a cone. Dead, nothing holds the legs: the beast comes down on them, and the push it is given takes it over toward its side.

A beast meets the ground, what already lies there, and other beasts. It does not meet a falling man or a standing one: a horse of 400 kg landing on a man's 3 kg forearm breaks the engine's sums, not the man.

## A rider (Version 72)

The first time a rider of a car is given to the engine, the car gets an inside: a floor and four rails (high in front, low behind), as it is drawn.

- **Killed**, he meets the floor, the rails, the ground and other bodies. An arrow from more than four and a half metres off leaves him on the deck or over the low rail behind. A blade sends him over the side. A heavy blow throws him clear. He belongs to the field from then on, not to the car.
- **Only thrown down**, he also meets four walls no one sees, just outside the rails. He stays in the car while it runs, turns or stops under him, and gets up in it.
- A dead rider does not meet what moves (men, cars, teams). In a press another car's team can be standing through his car: the rules keep cars two and a half metres apart and a car with its team is five long. That held a dead man up on his feet.

## A wreck (Version 72)

A car is lost with its team when:

- the story takes it from under its man (he fights on, on foot), as before; or
- its man is killed by a heavy blow, or within a moment of a meeting with a car or an elephant, or while it stands stopped dead by one.

Then each horse is given to the engine and goes over to its own side, a wheel comes off and runs on, and the driver falls from the rail. A horse the engine has no room for is laid down as before. A man killed any other way falls from his car; the car and its team stand.

Krishna's car is never wrecked and he is never thrown from it.

**Since Version 73 the rules say whether a car is wrecked** (`carDown` in `js/ui/battle/sim.js`, by the same three tests), and the picture follows. It had been the picture's own judgement. It became the rules' because a car's team is now part of its body there: a team left standing is in the way of everyone on the field, and one that has gone down is not (`docs/Fight_Feel.md`, section 5). The engine itself was not changed. A great man's four horses are drawn on every graphics setting now (the lowest drew two), so that what stops you is what you see.

## How a body is thrown

The rules already give a killed man a speed (1.2 m/s from an arrow, 1.9 from a blade, 4.4 from a heavy blow) and a man thrown down the speed of the blow that threw him. The engine is given two thirds of that for the whole body, and more above the hips than below, away from whoever struck him, so a blow high on the body sends him over. A heavy blow lifts him. A small turn about the upright is added by chance.

A man who is only down is drawn toward where the rules have him, as by a wind, harder the further he has gone from it. 0.45 seconds before he is due up, the engine lets go and the figure goes from how it lay to its standing pose.

## How much it carries

Counted in parts: a man is eleven, a horse ten, an elephant twelve.

- Version 71 carried six men at once, fixed. **Version 72 begins with room for six (66 parts) and then finds its own number** from what a step costs on the machine it is running on, aiming at two milliseconds a step with a full load: down to three men (33 parts) on a slow machine, up to twelve (132) on a fast one. On the lowest drawing setting it begins at three and goes up to six.
- One body more than there is room for, and the dead who have lain longest are left as they lie. A living man thrown down always comes before the dead. If there is still no room, the man falls by his poses, and the horse is laid down, as before the engine.
- A body is left as it lies once every part has been slower than 0.3 m/s for half a second, or after seven seconds (eight for a horse, nine for an elephant). The last twelve left lying stay in the way of what falls after them.
- A body that goes wrong (a part faster than 60 m/s, or far above or below the ground) is left at once. This has not happened in any test.
- Nothing is reckoned while nothing is loose. Sixty steps a second, at most six in one frame.

## What it costs

- With no page (`tests/ragdoll.js`, this machine): a step with six men thrown into each other takes about 0.5 ms.
- In the game in a headless browser with software drawing, which is much slower than a phone: one man about 1 ms a step; a whole wreck (four horses, the rider and the driver, 62 parts) ran with the engine at its smallest allowance by the end, which is the engine doing what it should on a slow machine.
- The download grew by 150 KB in Version 71 and by about 20 KB more in Version 72.
- Not measured on a phone.

## Checks

- `tests/ragdoll.js` (114 checks, no page; in `tests/run.js` and `npm run test:ragdoll`). Version 71's 88: a standing man struck five ways never goes wrong, lies still in time, keeps every joint whole and bending the right way; six bodies at once; a body stopped by a standing man; a car over a man on the ground; a man run down; a man thrown down alive; dropped weapons. Version 72's 26: a rider killed with no blow goes down on the deck; struck by a blade from his left he lies on the ground beside the car; struck by a heavy blow from in front he is thrown clear behind it; another car's team standing through his car does not hold him up; a rider only thrown down has the car's speed and stays in it while it runs, turns and stops, and is let go when killed; a horse is ten parts and 400 kg with its weight in its barrel, comes to rest down and toward its side with its joints whole; an elephant the same at 3.6 tonnes, onto its side; a man who falls where it lies does not lie inside it; a team of four goes down together; the engine finds room for more where a step costs little and for fewer where it costs much; a wheel runs on some paces, leans, goes over and lies flat.
- The fights' own tests were as they were through Versions 71 and 72: `tests/rules3d.js` 116 (126 since Version 73, which changed the rules and not the engine), the fight bands all inside their bands, `tests/smoke3d.js` 3 cases with the engine running.
- Looked at in the studio (`tools/review/falls.js`, which now takes chariots and beasts): five kills, three men thrown down and getting up, an elephant, a horse, a wrecked car with four horses, and four riders struck four ways.
- Looked at in real fights, held still at the moment the engine took a body and photographed a few frames at a time: a bandit thrown down and getting up; a kill in the first day's line; you thrown down; and in Version 72 a chariot wrecked on the sixteenth day (rider over one rail, driver over the other, the wheel gone, the car down on its axle), Drona's car wrecked in the last stand, Supratika killed, a chariot-warrior thrown down on his deck and getting up as the car ran on, and you thrown down while riding in Arjuna's place.

## Found on the way (Version 72)

- **No chariot had its driver.** Since the edit of 10 November that gave each hero his standard and his steeds, the three calls that set the charioteer in the car had stood on the same line as a note, behind it, and so were never run. Krishna was not in Arjuna's car. They are back.
- A dead rider was held up on his feet by the horses of the next car, standing through his own.
- A wheel running free stood up on its rim for ever. It now leans as it slows.
- In a fight's opening, the shot that shows "their men" looked at a chariot-warrior's belt from beside his wheel: it was set for a man on foot. For a man in a car the camera now goes up with him and stands off.

## Not done

- **A horse cannot be hurt or killed by itself.** A team goes down only when its car is wrecked. Aiming at a team to stop a car would be a change to the rules. (Version 73 made the team part of the car's body in the rules: it stops you, and under way it throws you. That is `docs/Fight_Feel.md`, section 5.)
- **The fallen are not in the way.** A dead elephant, a dead horse, a dead man can be walked through: the rules do not read back where the engine laid them. A dead man's car is in the way, and its team if they still stand, because the rules know where those are.
- A team stopped dead by a meeting still rears by a pose; the horses do not fall and get up.
- An elephant's howdah has no one in it to fall out.
- **Arrows** fly as the rules have them. An arrow already in a body goes with that body.
- The engine does not make a thrown body's fall cost health or knock a standing man down: the rules do that by their own reckoning (Version 70).
- All of this was looked at in stills and in a slow headless browser. None of it has been watched at speed on a phone.

## Tuning

`K.G3.phys.TUNE` in `js/g3/ragdoll.js`: steps a second, solver passes (14), friction (0.85), bounce (0.04), what the air and a body's stiffness take from its speed and spin, how many parts it begins with and may go to (`parts`, `partsMin`, `partsMost`), what a step should cost (`aim`), how long a body is carried, and when it counts as still. A man's joints are in `P.rag`, a beast's in `BEASTS`, a car's inside in `deckOf`. How hard a body is thrown is `thrown3` and `rider3` in `js/ui/battle/view.js`; when a car is wrecked, `wreck3`.
