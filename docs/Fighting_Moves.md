# Fighting moves: how they were checked, and what changed

The request was to compare the game's fighting actions with real people and improve them. Video cannot be watched
from here, so each move was checked the other way round: the game's figure was frozen at seven moments of each move
(the start, the wind-up, the moment before the blow, the landing, the follow-through and the recovery), seen from two
sides, and each strip was read against a written description of how the move is really done. Where the figure
differed, the move was rebuilt.

All of it is in `js/g3/figure.js` (`POSES`, `ACTS`); the fight view chooses the move in `js/ui/battle/view.js`
(`actFor`).

## What the references say, and what the game did

| Move | What the reference says | What the game did before | Now |
|---|---|---|---|
| **Sword cut** | A cut has four parts: the body starts while the blade barely moves, the blade accelerates, travels at speed to the target, then is stopped. The hips power it. "Every cut needs to be done with a matching step", cut and step together. A full cut takes about 0.6 s; a snapped one 0.25–0.35 s. | The arm swung at one even speed from a standing figure. No step, no hip turn, no stop. | Every blow has five phases: coil (hips and shoulders wound back, weight on the rear leg), a held moment, an accelerating snap that lands exactly when the rules land the blow, a follow-through, and a recovery to guard. The lead foot steps into a lunge with the cut and the hips shift forward. A forehand and a backhand alternate. |
| **Two-handed blow** | The same, from above the head, with the body dropping into it. | One hand. | Both hands above the head; the knees sink as it falls. |
| **Spear thrust** | The point goes first, the body follows, the feet last; the rear hand drives. | The whole body moved at once. | The spear is drawn back level at the hip, the point leads, then the lunge. |
| **Mace (gada)** | Both hands close together near the end of the haft. In the swing the head "swings behind your back" and comes over the shoulder; the overhead blow is "splitting wood". | A one-handed swipe. | Rests on the shoulder at guard. The smash comes from behind the back over the head with both hands and the knees sinking. The sweep is level, thrown round by the hips. |
| **The shot** | Stand side-on to the target. Nock. Raise the bow arm from the shoulder. Draw "by rotating your hips and shoulders" until the drawing elbow is in line with the arrow. Anchor. Release by relaxing the fingers; the drawing hand "moves back along the face and under the ear"; the bow arm stays up, then lowers. | The archer faced the target square-on with a short bow, and the bow arm pointed some fifty degrees off the target. The string was drawn by a number, not by the body. | The whole cycle: hand to the quiver, nock, turn side-on, raise, draw with the elbow high, hold, loose, the string hand carried back, the bow arm kept up. The head is turned to the target and the bow arm points at it. An arrow lies on the string while it is drawn. |
| **The bow itself** | The Indian bow was "about as long as the archer". | A short bow. | A long bow, as tall as the archer, drawn back to the ear. |
| **Guard** | Lead foot forward, knees bent, weight between the feet. | Standing upright. | A guard stance for each weapon, the left foot leading, knees bent; a shield is carried across the front and stays there through one-handed blows. |
| **Walking** | Feet land where the body goes. | The legs cycled at a fixed rate, so feet slid. | Cadence follows speed and stride length. |
| **Rolling, falling** | — | The body spun rigid; a fall tipped it over like a post. | The roll tucks and goes the way you roll. In a fall the knees give and the body folds before it goes over. |

## Timing is the rules' own

The fight's rules decide when a blow lands (`land` seconds after it begins) and how long the whole blow takes. The
figure's snap is fitted to that: it reaches the landing pose exactly at the rules' landing time, never before or
after. A foe's wind-up is the same move stretched to the rules' wind-up time, so what you see winding up is what
lands. Nothing about the fights' fairness changed with the moves.

## How to look at a move

`tests/smoke3d.js` checks that fights and tests run in a browser; the strips used for this review were made with a
small bench that freezes one move at its key moments from two sides. Each `ACTS` entry names its landing point and
its phases, so a new move can be added the same way.

## Limits

These are checks against written technique, read off still frames. Nobody has watched the moves against film, and
no fighter has reviewed them. The figures are jointed wooden-doll shapes with one elbow and one knee axis, so wrists
and shoulders are simpler than a person's.

## Sources

- Sword-cut mechanics and timings: https://science-and-fiction.org/swordfighting/cuts.html
- The eleven steps of the shot (NASP): https://www.naspschools.org/11-steps-to-archery-success/?ver=1.20
- The gada and how it is swung: https://www.artofmanliness.com/health-fitness/fitness/train-like-an-ancient-hindu-warrior-the-steel-mace-workout/
- The Indian bow and the dress of soldiers: https://www.worldhistory.org/Indian_Warfare/
