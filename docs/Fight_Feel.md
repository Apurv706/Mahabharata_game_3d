# The feel of a fight: faces, weight, coil and recoil, hits (16 and 17 November, Versions 69, 70 and 73)

Asked for: "Improve the physics of the fights", and four things by name:

1. "improving facial expressions - attack, defense, getting hit, win, lose - surprise should reflect different"
2. "Bodies, animals and chariots should have weight and colliding should lead to a fall based on mechanics"
3. "Incorporate coil and recoil between strikes"
4. "Make hits feel more strong. As player health decreases, their strikes should feel sluggish"

And after Version 69 was played: "Collision should also lead to damage. Fix remaining steps too." The remaining steps were read as the two things Version 69 said it had not done: foes did not tire, and a chariot meeting a chariot only stalled. All three are in Version 70 and are marked so below.

And on 17 November, after Version 72 was played: "Player was still able to walk through horses with no stopping and damage. Can you check". That is section 5, Version 73.

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

## 5. A chariot's team is in the way (Version 73)

Checked, and it was so. In the rules a chariot was one circle of 1.25 m about its deck. Its horses stand from two to four and a half metres ahead of that, and they were drawn and nothing more: you walked through them, and a chariot coming at you struck you only when its deck arrived, after its team had gone through you. An elephant was one circle about its barrel, and its head and tusks were the same.

**What a body is now.** A man, a squad or a cart is a circle, as before. A chariot is its deck and the team before it, and an elephant its barrel and its head, as one closed shape: a circle at its middle, a second ahead of it the way it points, and everything between the two.

| | Its middle | Ahead of it | In all |
|---|---|---|---|
| A chariot with a pair | 1.25 m about the deck and wheels | 1.05 m about the horses, 3.4 m ahead | 5.7 m long, 2.5 m across at the wheels |
| A great man's chariot, with four | 1.25 m | 1.9 m about the horses, 3.1 m ahead | 6.25 m long, 3.8 m across at the horses |
| An elephant | 1.9 m about the barrel | 0.95 m about the head, 2.45 m ahead | 5.3 m long |

Every chariot of a hero or a named man has four horses, and so has yours when you ride in Arjuna's place; the others have a pair. The game now draws the four on every graphics setting (the lowest drew two), because what stops you has to be what you see.

**What happens when you meet it.**

| | What happens |
|---|---|
| You walk into a team that stands, or into an elephant's head | You are stopped a hand's breadth from it, as from any foe. It costs nothing. Walked at from any side, you never come inside it |
| A team comes on at a walk (under 1.6 m/s), or turns into you where it stands | It puts you out of its way. It costs nothing |
| A team comes at you faster than that | It throws you, forward and to the side you were on, before the deck is anywhere near you. At 4.5 m/s you are off your feet with the deck's middle still 5.7 m away, and it costs 14% of your health. The cost goes by speed, as in section 2: about 3% at 2 m/s, 8% at 3, never more than 16% |
| A chariot turns hard at speed and its team swings into you | The same. What counts is how fast the part that meets you is coming at you, and a team swings wide of its deck |
| A chariot passes close and you only brush along its side | You are eased a hand's breadth aside. You are not thrown |
| You lie where it threw you | It pushes you on and does not throw you again, nor for two and a half seconds after you are up |
| A body is thrown against a team | It stops there, drops, and pays for it, as against the car |

This holds for every man on the field, not only for you. The one exception is the car you ride in: it throws no one, as before, but a man who stands where its team is going is now put out of their way.

**A car whose man is killed stays in the way.** It stands where it stopped. If its team still stands, the team is in the way with it. If it was wrecked (brought down by a heavy blow or a meeting: `docs/Physics_Engine.md`), its horses are down and only the car itself is in the way. Whether a car is wrecked is now the rules' to say and not the picture's, since it decides what you can walk through. Karna's car, fast in the earth on the seventeenth day, is in the way with its four horses. A man the story takes out of his car is set down beside the wreck, not inside it.

**What the others do about it.**

- Men do not lean on the side of a chariot to get to the far side of it. They go round by whichever end they will be clear of sooner, which is the tail of a car that is coming on.
- A champion who charges you in his chariot (the plan called the charge) pulls up short of you. It is a challenge, not a riding-down. Left as it was, with the team in the rules, the charge ran the fighter down two to four times a fight.
- The game's own fighter was taught three things a person does without thinking: to go round, to go for a car's man from behind its wheels and not through its horses, and to throw itself aside when a team is on it before it could run clear.

**Found on the way.**

- The first try gave the team a circle of its own. A man could be caught between it and the deck, on the pole, and was carried off with the car. The shape now has no hollow in it.
- **A pincer never shut if one of its two wings was cut down on its way round, and the fight never turned.** It had always been possible. A chariot's team in a wing's way made it happen in a test. The fight now turns after fourteen and a half seconds whatever has become of the wings.
- Bodies that have ended up inside each other are eased apart. That still used the old circles, so a team swung round into a man standing by it stayed in him. It uses the whole shapes now.
- Twice the first rule for going round sent the fighter back and forth at the horses' heads, and a fight never ended (one in 28 of the first days' battles, then one in 28 on the road to Jayadratha). A man now keeps to the end he chose for half a second and then chooses again, and one who is already getting along the car's side is left alone.

## What it did to the fights

The game's own fighter, 28 runs of each of the 79 fights (`tests/fights.js`): 92 wins in 100 (93 before), 41 seconds a fight (42), no fight failing or running out the clock, every fight inside its recorded band. Two moved by ten points or more: Duryodhana's mace 96 to 86, the escort in the skirmish 64 to 75. The bands were recorded again.

After Version 70 (harm from meetings, chariot against chariot, foes that tire): 92 wins in 100 and 41 seconds again, every fight inside its band. Three fights had grown harder, or swung widely, over the last three versions and were eased back: Duryodhana's mace (plain blows 0.84 from 0.92; 79 wins in 100), Ghatotkacha by night (0.88; 82) and Bhishma's ninth day (0.6 from 0.66; 86, though it still swings between 67 and 89 from one set of fights to the next). The bands were recorded again.

The fighter was taught one thing: to step out of the path of a chariot or an elephant bearing down on it. A player who stands in a chariot's way will be thrown down more often than the figures show.

After Version 73 (the team in the rules): 92 wins in 100 and 41 seconds, as before. No fight failed or ran out the clock, every fight is inside its recorded band, and the bands were not recorded again. Fifty-five of the 79 fights give the same figures as before to the last digit: with no chariot or elephant in them, and no pincer that lost a wing, they play exactly as they did, blow for blow. Of the other twenty-four, one moved by ten points.

Seventeen of the twenty-four were measured more closely. Across them the fighter wins 92 in 100 (93 before) in 43 seconds (43). It is met by a car or an elephant about once in three fights (0.37 times a fight; 0.63 before, because it now goes round and throws itself clear), and that costs it 2% of its health a fight (3%). The fight in which you ride in Arjuna's place ("Under the ape banner") moved most, to 89 wins in 100 from 100, which is three fights in 28; "The heart of the wheel" read 46 from 54. Neither is more than one set of 28 fights differs from the next. `docs/Balance_3D.md` has each fight.

The first try was much harder, before the charge was pulled up and the fighter taught to go round: "The road to Jayadratha" fell from 82 wins in 100 to 46, with four meetings a fight that cost the fighter 42% of its health between them. None of that went out.

## Checks added

`tests/rules3d.js` (116 from 107; the last five in Version 70: both bodies pay for a meeting, a chariot's ram costs health, a chariot that runs into another stops both dead, a foe's blows slow with his health, and the same first blow of the same fight is 15% longer from a foe at a quarter of his health): the same blow throws a man and a chariot by their weights; a man thrown into another takes him off his feet and between them they keep the speed he had; a chariot under way takes a man in its path off his feet and is hardly slowed; your blows are slower by the health you have lost. Three older checks that had depended on a thin test life outlasting Bhishma now give that life more health, and the checks of the three battle plans look at the first of three fights in which the task was done: they test the rule, and the fight bands test the difficulty.

(Versions 71 and 72 gave the bodies of the killed and the thrown, riders, horses and elephants to a physics engine: `docs/Physics_Engine.md`. The rules on this page are unchanged by it.)

Version 73 (126 checks from 116): their champion's charge, in a car, is pulled up short of you (three fights, standing still); you never come inside an elephant's head, and from in front you are stopped at it and not at its shoulder; it is the team that strikes a man in a chariot's path, with the deck's middle still 5.7 m short of him; the car that threw him does not throw him again while he lies there; you cannot walk through a standing team, and it costs nothing; from no side do you come inside the team or the car; a car that passes close does not throw the man it only brushes; a man thrown against a team stops there, drops and pays for it; a man whose way lies through a car and its team goes round by the nearer end, or by its tail when it is coming on; a car whose man is killed stays in the way, with its team only if they still stand.

Four older checks were made to stand on their own. The duel and the shaken host are counted over three fights, not one. The weight checks no longer depend on where chance set the bystanders (it had: they walked back into the middle of what was being measured, a different way each time). And "goes the way it points" is measured while the car or the elephant runs free, not while it is against men who stand fast.

`tools/review/footprint.js` (new) photographs a real fight from straight above with the rules' shape drawn on the earth: you walking at a team from in front or from the flank, a car driven at you, an elephant's head.

## Not done, or only looked at in stills

- The coil, the recoil and the rock of a struck body are motion. They were checked for faults by the automated fights in a real browser, and the faces were looked at in stills (`tools/review/lineup.js` now takes a `mood`). None of it has been watched at speed on a phone.
- **A horse cannot be hurt or brought down by itself.** A blow reaches a chariot's man from beside or behind his deck, as before, and a blow at his team does nothing. Aiming at a team to stop a car would be a new rule.
- A dead elephant can still be walked through, and so can every body that lies on the field. The physics engine lays an elephant down where its fall takes it, and the rules do not read that place back.
- The shape is rounded. At the very corners of a team of four the outer horses' heads stand about 0.4 m outside it.
- Version 73 was looked at in stills from above in real fights (Arjuna's four walked at from in front and from the flank, the same car driven at you, Supratika's head) and measured by the game's own fighter. It has not been played on a phone.
- A body thrown against the edge of the field stops there unharmed: the fights have no walls or rocks to be thrown against.

## Postures on the sculpted bodies (17 November, Version 78)

Seven figures of different build (Arjuna, Bhima, Draupadi, a child, a foot soldier, Bhishma, Dhritarashtra) were photographed walking, running, on guard, blocking, in four strikes, parrying, struck, rolling, sneaking and kneeling, front and side. The postures hold on every build. Two were put right:

- **Block:** the guard arm crossed the chest so close that on a broad man (Bhima, Duryodhana) the wrist sank into it. The arm is held further out in front (`POSES.block`).
- **Struck:** the head snapped back 46 degrees, which on the new longer necks read as a broken neck. It now goes back 31 (`ACTS.hit`).

Seen and left: the hip rings of the heavy war dress stand off the waist in a deep crouch; in the sneak the arms are held wide.

## The order of the cards before a fight (17 November, Version 80)

Owner, after playing: "the cards were showing in incorrect order before some battles". Read through `brief()` in `js/ui/battle/view.js`, which builds the opening's shots, and found three faults:

- **Your own side's card came in the middle of the enemy's.** In the first two battles, in dreams and in the quick fights, the shots ran: you, their leader, his great blow, *those with you*, their men. (After two battles a different opening is used, which had them right. So it was "some battles".)
- **In two of the three opening styles the story's lines came after the card that names you**, under the fight's title again, so the title seemed to come twice with your name between.
- **The wrong man could be shown as leading them.** It took the first named man in the list. Where a lesser named man stood before the champion, the champion was only counted in "and with them". It now takes the strongest of the named.

There is one order now, whatever the fight or the style: the fight's name; what the story says; you; who stands with you; who leads them; his great blow; what their men can do; how they stand; and then the question of how you will fight them. The shots are sorted into it after they are made, so a new kind of shot cannot fall out of place.

Checked by reading, and by the three automated fights in a real browser that play their openings through. Not every fight's opening was watched, and none on a phone.

### All 79 openings checked (18 November, Version 81)

`tools/review/openings.js` (new) opens every fight in a real page twice (as one of your first battles, and after several), and records the cards in the order they will be shown, the question card, the HUD's text and every name. 158 openings:

- **Order:** right in all 158. The fight's name first in all; one leader card in each, and it is the strongest named foe.
- **One fight had no opening:** the Narayana weapon has no foe on the field to show, and went straight to the question. It now opens on its name, over you, with what the story says.
- **No empty heading, no page error, no stray code** in any card, question, HUD line or name at the start of a fight.

**"&79" in play.** Found by reading: a named foe's great blow is called out over his head by name as it begins, and that name came made safe for a web page while being shown as plain text, so an apostrophe came out as `&#39;`. The same for the small tag over a foe. Both fixed (`callout` and the bar's tag in `js/ui/battle/view.js`). The rest of the fight screen was read for the same mistake (text made page-safe twice, or page-safe text set as plain text) and none was found.

Not covered: text that only appears mid-fight was read in the code, not watched in play.
