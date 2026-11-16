# The named opponents: each man's own fight (16 November, Version 67)

Asked for: "Lets begin with the fights. Make them more interesting. Make the opponent name hero's stronger and unique." Then, the same day: "the fights open with a card with no engagement and urgency from 3D characters. Can we think of improvements in that aspect? Especially for critical battle fights", and "Add a 3 sec counter to decide otherwise game opens in default mode."

This follows area 1 of `Play_Review.md` (fights rarely in doubt, defence hardly needed). The rules are in `js/ui/battle/sim.js` under "The named: each man's own fight"; what is drawn is in `js/ui/battle/view.js`.

## What was wrong

Measured before the change (79 fights, 7 runs each, `tools/review/fight_depth.js`):

- In the fights that are won by standing a count, a named opponent had thousands of health and blows lighter than his own soldiers'. Bhima struck for 8.3 beside an archer's 9.7.
- A named man fought like any soldier with a bigger number: the same blow, the same mark on the ground.
- A player who never guarded or rolled won 79 fights in 100 against the named. One who also used no skill, herb or help won 60. One who did nothing at all won 10.

## What a named opponent is now

1. **Stronger than the men about him.** His plain blow is never lighter than the heaviest common man's in the fight, times a share of his own (Bhima 1.3, Duryodhana 1.25, the other great ones 1.15 to 1.2). A fight can set its own share (`R3.TUNE[id].over`; 0 for none).
2. **He comes for you.** One of the named picks you for his mark 85 times in 100, a soldier 65.
3. **A great blow of his own.** No two men share one. It is called over his head as he begins it, has its own mark on the ground and its own answer, and he stands open for about a second after it ("Open!"). A violet mark means no shield holds it. Each comes every six to ten seconds, the first within three to five; with three or more of the named on the field they come further apart.
4. **Hurt, he fights harder.** In a fight to the end, a man brought to half his strength shows it, and his great blow comes sooner and oftener (Ashwatthama, Ugra, Bhadra, Kanaka).

| Who | Great blow | What you see | The answer |
|---|---|---|---|
| Bhima | Earth-shaker | A violet ring round him as the mace goes up | Get out of the ring. No shield holds it; it throws you down |
| Bhima | Bhima charges | A wide violet lane; he runs down it | Roll aside, then strike him while he recovers |
| Duryodhana | Balarama's form | Three blows: a smash, a sweep, a violet last blow | Guard the first two, roll away from the third |
| Ghatotkacha | From the sky | He leaps; a violet ring follows you and fixes half a second before he lands | Move out at the last moment |
| Bhurishravas | The veteran's feint | The mark fills, blinks, and falls a moment later | Do not roll early; hold your guard until it falls |
| Kripa | Kripa waits | He stands in his guard for two and a half seconds | Do not strike his front: he turns the blow and answers it. Step round him, or wait |
| Kritavarma | Together! | A cry; his men come in at once | For four and a half seconds one more blow comes at a time. Give ground |
| Ashwatthama (sword) | Without rest | Five quick blows, the last heavy | One guard raised just as a blow lands breaks the chain; or back out of reach |
| Ashwatthama (bow) | Without rest | Four arrows one after another | Shield up to the last, or keep moving across his aim |
| Ugra | A wrestler's hold | A short, wide violet fan | Step back out of his arms. A shield is no use |
| Bhadra | Shield, then point | A quick blow of the shield, then a long narrow thrust | Guard the shield's blow, or it holds you for the thrust |
| Kanaka | The long thrust | A lane from beyond a sword's reach; he steps down it | Guard it or step aside |
| Ketan | One, two | Two blows, one on the other's heels | Keep your guard up for both |
| Arjuna | Five arrows at once | A wide wedge | A step aside does not clear it: shield, or roll well out |
| Karna | The serpent arrow | A violet lane that follows you through a long draw | Roll across its line as he looses. No shield stops it |
| Bhishma | A storm of arrows | Four rings, one after another, where you stand | Keep moving; each ring fixes before it lands |
| Drona | The teacher's lesson | Two rings: where you stand, and where your last roll would take you | Go a different way this time |
| Abhimanyu | Arrows all round | A great ring round his car | Get back out of it, or behind your shield |
| Supratika | The elephant charges | A very wide violet lane | Get out of its path |

Ghatotkacha's illusions now also come by the clock (first at nine seconds, then every seventeen), because in a fight that is only held his health never fell far enough to bring them.

Not given a great blow: the warrior of the opening dream (the dream is meant to overwhelm), Karna at his sunken wheel (he does not fight there), Jayadratha's guard (common men under his name).

## What ignoring a blow costs now

- **Thrown down.** A great blow that throws you leaves you on the ground for 0.6 to 1 second. You can neither guard nor roll until you are up. It cannot happen again for two and a half seconds after you rise.
- **A heavy blow taken unguarded**, from anyone, knocks 12 breath out of you and breaks your chain of blows.
- **Standing idle.** Five seconds with no step, blow, guard or roll, and every foe on the field turns on you and one more blow comes at a time. Said once ("You stand idle: every foe turns on you").

## The opening

- Both sides come onto the field while the opening plays: every man and car begins five to twelve metres behind his place and comes up to it. Only what is drawn moves; the fight's own places are untouched.
- A named opponent has one more shot after "Against you": "His great blow", with its name and one line. He makes the blow once, with its real mark on the ground, and no one is struck.
- The card before the fight counts three seconds, with a drum to each and the men of both sides shouting. Choosing a plan begins the fight at once. With no word it begins as it stands: "Hold the line" where a plan is asked, the view last used.
- As it begins, a war cry: every man on the field, and the ground shakes.

## What it did to the fights

Win rates, 7 runs each, before and after (to be read as a comparison, not as exact rates).

| Player | Against the named (25 fights) | The other 54 fights |
|---|---|---|
| Careful: reads most blows, guards and rolls, uses skill, herbs and help | 91 to 90 | 93 to 94 |
| The same hands, with no skill, herb, help or divine weapon | 72 to 62 | 72 to 70 |
| Never guards or rolls | 79 to 62 | 81 to 78 |
| Never guards or rolls, and uses nothing | 60 to 27 | 48 to 47 |
| Does nothing at all | 10 to 2 | 15 to 5 |

Health the careful player has left at the end: 59% to 52% against the named, 59% to 60% elsewhere.

How to read it. Defence now matters against the named: the player who does not answer their blows wins far less often, and with no aids hardly at all. The careful player wins as often as before, with less left. That is short of the aim set at the start (65 to 85 wins in 100 for the careful player against the named). The careful bot reads three called blows in four and answers within half a second, which is better than a new player will; a real player should fall somewhere between the first and third rows. Whether the named now feel hard enough on a phone is for play to say; the dials are `pct` and `every` in the two tables.

Fight by fight (careful, then never guards or rolls and uses nothing): Bhima's charge 100 to 100, 100 to 57. Duryodhana 100 to 100, 29 to 14. Arjuna's chariot 100 to 100, 100 to 14. Karna 100 to 86, 100 to 0. Drona and the king 100 to 86, 86 to 14. Bhishma on the ninth day 100 to 86, 43 to 0. Ghatotkacha 100 to 86, 14 to 0. Bhurishravas 100 to 100, 71 to 14. The three at the lake 100 to 100, 86 to 43. The night raid 71 to 86, 14 to 29. Bhadra 86 to 100, 14 to 14. Ugra, the first fight of the game, 100 to 100, 100 to 86.

The game's own fighter over 28 runs a fight (`tests/fights.js`): 79 fights, no fight failing or running out the clock, 93 wins in 100 on average (93 before), 42 seconds a fight (41). Moved ten points or more: Ghatotkacha 100 to 79, Bhishma's ninth day 96 to 79, the storm of the third day 96 to 79; and, with no named man in them and within what 28 runs can tell apart, the first day 86 to 96, the road 68 to 82, Karna's guard 79 to 89. Bhima's charge now lasts 30 seconds, from 23. The recorded bands (`tests/baselines/fights3d.json`) were written again from this run.

Fights eased so that a great blow now does what the plain blows did (`R3.TUNE`): the night raid (plain blows 0.9 from 1.03) and the ash field (0.9), Bhadra (1.25 from 1.5), the last stand beside Abhimanyu (0.44 from 0.53), the ninth day under Bhishma (0.66 from 0.82, and his floor at the common men's own), the storm of the third day (0.9, and no floor).

## Checks added

`tests/rules3d.js` (107 from 100): every named man has a blow of his own and no two share one; he strikes at least as hard as the common men about him; Bhima's blow is called once, marks a ring no shield holds, and leaves him open; a raised shield does not hold it and thrown down you can neither guard nor roll; rolled at the moment it lands it costs nothing; five idle seconds turn every foe on you; Kripa waiting turns a blow from the front and answers it.

## Not done

- Nothing says how well you fought when a fight ends (area 6 of the review).
- The named have no new bodies or moves of their own: a great blow is played with the moves the figures already have (smash, thrust, grab, shoot).
- No spoken challenge from the named man in the opening.
- The opening and the great blows were looked at in stills on this machine, which draws slowly. They have not been seen on a phone.
