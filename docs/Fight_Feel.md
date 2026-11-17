# The feel of a fight: faces, weight, coil and recoil, hits (16 November, Versions 69 and 70)

Asked for: "Improve the physics of the fights", and four things by name:

1. "improving facial expressions - attack, defense, getting hit, win, lose - surprise should reflect different"
2. "Bodies, animals and chariots should have weight and colliding should lead to a fall based on mechanics"
3. "Incorporate coil and recoil between strikes"
4. "Make hits feel more strong. As player health decreases, their strikes should feel sluggish"

And after Version 69 was played: "Collision should also lead to damage. Fix remaining steps too." The remaining steps were read as the two things Version 69 said it had not done: foes did not tire, and a chariot meeting a chariot only stalled. All three are in Version 70 and are marked so below.

The rules are in `js/ui/battle/sim.js` ("How bodies move"), the figure's movement in `js/g3/figure.js`, the face in `js/g3/model.js`, and what is shown and heard in `js/ui/battle/view.js`.

## 1. Faces

A face had four things it could do (jaw, mouth open, lids, the slant of the brows) and three states (set, shouting, in pain). It now has six (the brows' height and the mouth's width are new) and eleven states, and it picks its own from what the body is doing:

| Moment | Face | When |
|---|---|---|
| Winding up a blow | Strain: teeth set, eyes narrowed, brows hard down | From the start of a blow to the moment it is thrown |
| The blow | Shout: mouth wide open | From the throw until just after it lands |
| Defence | Guard: jaw shut, eyes narrowed, brows low and level | While a shield is up, or braced |
| Hit | Pain: eyes screwed shut, mouth pulled wide, brows up at the middle | 0.4 seconds for a light blow, 0.6 for a heavy one; while staggered |
| Surprise | Eyes wide, brows high, mouth round | You, when a great blow is called at you. A foe, when you parry him or catch his blow on a clean guard. Anyone a thrown body or a chariot strikes without taking him down |
| Fear | Eyes wide, brows up and drawn together | A beaten man pleading |
| Won | Triumph: a broad smile, eyes creased, head thrown back | The side that has the field when the fight ends |
| Lost | Grief: eyes cast down and half shut, brows up at the middle | The side that lost it |
| Worn out | Spent: mouth hanging open, lids heavy | You, below about a quarter of your health |

A wound and a start come onto the face at once; the others settle over a tenth of a second. `G.feel(figure, mood, seconds)` sets a face for a moment; `figure.mood` holds one.

Limit: the mouth can open, widen and narrow, but its corners cannot turn up or down. A smile is a wide mouth with easy eyes, not a curve.

## 2. Weight

- **A blow moves a body by its weight.** A man is 1, one of the named 2, three men together 3, a chariot 14, a cart 20, an elephant 40. The same blow that throws a man back 5.8 m/s moves a chariot 0.8.
- **A body thrown back strikes what it meets.** The two share the meeting by their weights. A change of speed of 1.5 m/s staggers a man; 2.8 takes him off his feet; he goes on with what he was given and can strike the next. Against a chariot or an elephant it is the one thrown who stops and drops.
- **A chariot or an elephant under way takes a man off his feet** when it gives him 2.8 m/s or more, which a chariot does from about 2 m/s. That includes you: you are thrown down as by a great blow, and cannot guard or roll until you are up. It is hardly slowed.
- **An elephant that runs into a chariot** stops it dead: its man is thrown down on the deck, and it leans on its wheels for three seconds.
- **A chariot that runs into a chariot** of the other side (Version 70): each is given its share by how fast the two were closing. From about 3.5 m/s of closing both stop dead, both men are thrown down on the deck, and the teams rear in the traces. Below that each is slowed. A car you are riding in is left out: its charioteer keeps it clear.
- **A meeting costs health** (Version 70). Nothing below a change of speed of 2 m/s. Above it, 3.5% of the body's full health for each m/s more, and never more than 16% at one meeting. Both pay, each by what he was given: a man thrown hard into another costs each about 6%; a chariot that runs you down costs about 6% at a canter and up to 15% at a gallop. The number shows over each head. A champion who is only being held is not brought below a tenth by it, nor Bhishma before the tenth day. A roll carries you through it untouched.
- Shields locked in a wall are half again as hard to throw down. A roll still passes through.

Two faults found on the way, both fixed. In the fights where a champion crosses your line, standing beside his car counted as reaching his charioteer even if you lay where the car had thrown you, or were carried along in front of it doing nothing.

## 3. Coil and recoil

- **Coil.** While a blow is held before the throw, the spring is wound further: the trunk and hips turn further from the mark, the weight goes back onto the rear foot, the head stays on the mark. It shows on any blow with a wind-up longer than a quarter of a second, which is every foe's and your heavy ones.
- **Recoil, the striker's.** A blow that meets something comes back up the arm: the elbow and wrist give, the trunk checks, the body gives a hand's breadth. One caught on a shield comes back twice as far, and sets the striker back on the ground (yours on his shield, his on yours).
- **Recoil, the struck.** The trunk rocks away from the blow and springs back, the head a beat behind it. It goes the way the blow came from, and is added to whatever the body was doing.

## 4. Hits, and weariness

- A hit holds the fight still a little longer (a light blow of yours 0.05 s from 0.035, a heavy one 0.1 from 0.07; a heavy blow on you 0.06, being thrown down 0.08). A heavy hit lifts a ring of dust and is heard twice. The screen shakes by how much of your health the blow took. Where the phone allows it, it shakes in the hand.
- **Weariness.** With half your health or more, your blows are as they were. Below that each takes longer to land and to recover from: 15% longer at a quarter of your health, 30% with almost nothing left (`P.tireFrom`, `P.tireMost`). The body shows it: the shoulders sag and heave and the head hangs.
- **Foes tire the same way** (Version 70): a foe's wind-up and his rest between blows lengthen by the health he has lost, on the same scale. Not the four who fight harder when hurt (Ashwatthama, Ugra, Bhadra, Kanaka). In the fights that are only held, a champion never loses half his health, so there it changes nothing.

## What it did to the fights

The game's own fighter, 28 runs of each of the 79 fights (`tests/fights.js`): 92 wins in 100 (93 before), 41 seconds a fight (42), no fight failing or running out the clock, every fight inside its recorded band. Two moved by ten points or more: Duryodhana's mace 96 to 86, the escort in the skirmish 64 to 75. The bands were recorded again.

After Version 70 (harm from meetings, chariot against chariot, foes that tire): 92 wins in 100 and 41 seconds again, every fight inside its band. Three fights had grown harder, or swung widely, over the last three versions and were eased back: Duryodhana's mace (plain blows 0.84 from 0.92; 79 wins in 100), Ghatotkacha by night (0.88; 82) and Bhishma's ninth day (0.6 from 0.66; 86, though it still swings between 67 and 89 from one set of fights to the next). The bands were recorded again.

The fighter was taught one thing: to step out of the path of a chariot or an elephant bearing down on it. A player who stands in a chariot's way will be thrown down more often than the figures show.

## Checks added

`tests/rules3d.js` (116 from 107; the last five in Version 70: both bodies pay for a meeting, a chariot's ram costs health, a chariot that runs into another stops both dead, a foe's blows slow with his health, and the same first blow of the same fight is 15% longer from a foe at a quarter of his health): the same blow throws a man and a chariot by their weights; a man thrown into another takes him off his feet and between them they keep the speed he had; a chariot under way takes a man in its path off his feet and is hardly slowed; your blows are slower by the health you have lost. Three older checks that had depended on a thin test life outlasting Bhishma now give that life more health, and the checks of the three battle plans look at the first of three fights in which the task was done: they test the rule, and the fight bands test the difficulty.

## Not done, or only looked at in stills

- The coil, the recoil and the rock of a struck body are motion. They were checked for faults by the automated fights in a real browser, and the faces were looked at in stills (`tools/review/lineup.js` now takes a `mood`). None of it has been watched at speed on a phone.
- Horses are part of their chariot. They rear when it is stopped dead, but a horse is not a body of its own that can be hurt or brought down.
- A body thrown against the edge of the field stops there unharmed: the fights have no walls or rocks to be thrown against.
