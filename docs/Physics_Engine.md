# A real physics engine in the fights (16 November, Version 71)

Asked for: "Let's add a real physics library".

The fights now carry **cannon-es 0.20.0**, a rigid-body physics engine (MIT licence; `js/vendor/cannon-es.min.js`, 121 KB, built from the npm package into one file that defines `CANNON`, as three.js is). The game's use of it is in `js/g3/ragdoll.js`; the figure hands its body over and takes it back in `js/g3/figure.js`; the fight decides when in `js/ui/battle/view.js`.

## What the engine does, and what it does not

The fight's rules (`js/ui/battle/sim.js`) still decide who is struck, how hard, who is thrown down and for how long, and who dies. That reckoning comes out the same on every machine, and the tests and the difficulty rest on it. **Nothing in the rules reads a body's place back from the engine, so no fight is harder or easier than it was.**

What a body does once the rules have struck it is now the engine's:

| | Before | Now |
|---|---|---|
| A man killed | Went over by a pose: onto his back, his face or his side, and slid | His body is eleven rigid parts joined at his joints. It is thrown by the blow that killed it, strikes the ground, slides, rolls, folds as its joints allow, and lies as that leaves it. No two falls are the same |
| A man thrown down but alive (you, or a foe) | The same pose, then up again | The engine has him while he is down, and gives him back to his poses in time to be on his feet when the rules say he is |
| A body thrown at a standing man | Passed through him | Strikes him and stops or turns aside |
| A chariot or an elephant | Passed through the fallen | Throws aside a body in its way that is still falling. Its wheels and hooves go over one lying on the ground. A man it runs down goes under it and is left behind it |
| One body falling where another lies | Lay inside it | Lies on it or beside it |
| A dropped mace, sword, spear, bow or shield | Fell on a set path and came to rest at a set angle | Is a rigid box of its own size and weight: it turns in the air, strikes the ground and the fallen, and rests as its shape leaves it |
| A blow on a man who is down | Nothing seen | Moves his body |

## The body

Eleven parts: hips, trunk, head, two upper arms, two forearms (with the hand), two thighs, two shins (with the foot). Each is a few balls along its bone, which meet the ground and each other cheaply and never catch on an edge. A man of ordinary size weighs 75 kg (hips 11, trunk 24, head 5, upper arm 3, forearm 2.2, thigh 8, shin 4.5); a taller figure weighs more by the cube of his height.

The body is built from where the figure's joints are at that moment, so the fall begins from the pose he was in. Ten joints:

| Joint | How it turns |
|---|---|
| Knee | On one line, backward only: straight to 138 degrees |
| Elbow | On one line, forward only: straight to 144 degrees |
| Hip | Inside a cone of 58 degrees about a line a little forward and outward of straight down: further forward than back |
| Shoulder | Inside a cone of 84 degrees about a line out, down and a little forward |
| Spine (hips to trunk) | 32 degrees, further forward than back; 30 degrees of twist |
| Neck | 40 degrees; 48 degrees of twist |

A body's own parts strike each other (an arm does not pass through the chest). What the engine works out is written back into the figure's skeleton every frame, so the modelled skin, the armour and what is still held move with it. Cloth ends and hair lie along a fallen body.

## How a body is thrown

The rules already give a killed man a speed (1.2 m/s from an arrow, 1.9 from a blade, 4.4 from a heavy blow) and a man thrown down the speed of the blow that threw him. The engine is given two thirds of that for the whole body, and more above the hips than below, away from whoever struck him (0.9, 1.5 or 2.3 m/s), so a blow high on the body sends him over. A heavy blow lifts him. A small turn about the upright is added by chance, so two men killed the same way do not fall the same way.

A man who is only down is drawn toward where the rules have him, as by a wind, harder the further he has gone from it. The rules slide him over the ground; the engine throws him; the two end within about half a metre. 0.45 seconds before he is due up, the engine lets go and the figure goes from how it lay to its standing pose.

## Limits kept on it

- The engine carries **six bodies at once** (three on the lowest drawing setting). A seventh makes it leave the one that has lain longest as it lies. A living man thrown down always comes before the dead. If there is no room, the man falls by his poses, as before.
- A body is left as it lies once every part has been slower than 0.3 m/s for half a second, or after seven seconds. The last twelve left lying stay in the way of what falls after them.
- A body that goes wrong (a part faster than 60 m/s, or far above or below the ground) is left at once. This has not happened in any test.
- Nothing is reckoned while nothing is loose: a fight with everyone on their feet costs nothing more than before.
- Sixty steps a second, at most six in one frame.

## What it costs

- With no page (`tests/ragdoll.js`, this machine): a step with six bodies thrown into each other takes 0.5 to 0.6 ms.
- In the game in a headless browser with software drawing, which is much slower than a phone: one body about 1 ms a step; four bodies and nine dropped weapons 1.5 ms a step, the worst frame 22 ms.
- The download grows by 150 KB (the engine 121, the game's use of it 29).
- Not measured on a phone.

## Checks

- `tests/ragdoll.js` (new, 88 checks, no page; in `tests/run.js` and `npm run test:ragdoll`). A standing man is built and struck five ways (no blow, light and heavy from in front, heavy from the side, legs swept). For each: the body never goes wrong; lies still within seven seconds; no joint is ever under the ground; no joint comes apart by more than 8 cm in the fall and all are whole at rest; knees bend only backward and elbows only forward; no part is faster than 16 m/s. Also: a heavy blow throws further than a light one and the right way; the same blow gives the same fall; six bodies thrown into each other all come to rest; a seventh is taken only by leaving the oldest; a body thrown at a standing man is stopped; a car driven over a man on the ground does not carry him off; a man run down is left behind the car; a man thrown down alive is drawn to where the rules have him and can be killed where he lies; a body that falls where another lies does not lie inside it; a dropped mace and shield come to rest on the ground and are cleared away.
- The fights' own tests are as they were: `tests/rules3d.js` 116, the fight bands (`tests/fights.js --check`) all inside their bands, `tests/smoke3d.js` 3 cases with the engine running.
- Looked at: `tools/review/falls.js` (new) photographs falls as strips of stills in the studio. Five kills, three men thrown down and getting up, and a car's collider through a standing man were looked at. Three real fights were held still at the moment the engine took a body and photographed a few frames at a time: a bandit thrown down and getting up, a kill in the first day's line, and you thrown down, seen from behind.

## Not done

- **Riders.** A man killed or thrown down in a chariot still goes down on the deck by a pose. He does not fall out of the car.
- **Horses and elephants** are not bodies of their own. An elephant still goes over by a turn; a team rears but cannot fall.
- **Arrows** fly as the rules have them. An arrow already in a body goes with that body.
- The engine does not make a thrown body's fall cost health or knock a standing man down: the rules do that by their own reckoning (Version 70), and the two are close but not the same body-for-body.
- All of this was looked at in stills and in a slow headless browser. None of it has been watched at speed on a phone.

## Tuning

`K.G3.phys.TUNE` in `js/g3/ragdoll.js`: steps a second, solver passes (14), friction (0.85), bounce (0.04), what the air and a body's stiffness take from its speed and spin, how many bodies at once, how long one is carried, and when it counts as still. The joints' angles are where the joints are made in `P.rag`. How hard a body is thrown is `thrown3` in `js/ui/battle/view.js`.
