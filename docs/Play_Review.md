# Play review: where the game can be more compelling (16 November, Version 66)

Asked for: a full review of the game, to find the areas that would make it more compelling and interesting to play. This is a review only. Nothing in the game was changed.

## How it was done

- **1,600 whole lives by script**, through the game's own rules with no page (`tools/review/play_metrics.js`). Choices were taken at random among those open, and each fight was won at the rate the game's own fighter wins it. In 800 lives the tests were passed at a middling rate (55% win, 20% close, 25% lose) and in 800 at a better one; the figures quoted are the middling run's, and the better run's are within a few points of them.
- **Every one of the 79 fights played by five kinds of player**, seven times each (`tools/review/fight_depth.js`): a careful one, the same without aids, one who never guards or rolls, one who only walks up and strikes, and one who does nothing.
- **The real screens at phone size** (390 by 844): a new life played from the title through most of Act I, then about seventy screens staged one by one: the title, the making of a life, story pages, every menu, all 23 kinds of test, a war fight from its opening to the field, a death and an ending.
- **The story's data read as data**: what every choice changes, and where the story reads it back.

Not done, and it limits what can be said: nobody's hands were on a phone, so nothing here judges touch, frame rate or sound. The pictures came from a desktop browser drawing in software. No new player was watched. The Hindi was not read. The fighters were scripts, so the fight figures are comparisons between kinds of player, not a forecast of how a person will do.

## The short answer

1. The game looks and reads well, and its pace is right. That is not where the gain is.
2. **The fights are rarely in doubt, and guarding and rolling are hardly needed.** This is the largest gap, and it is in the part the 3D work was for.
3. **The meters the player watches most are the ones the story reads least.** Two of the four duties and three of the six reputations change nothing at all.
4. **The epic's turning point, the dice game, is the thinnest stretch of the life**: about five pages and two minutes of an hour.
5. Three things break the flow: a fall in the war sends you back to its first morning, the life stops for a copied code between the two links, and the Book of Lives is two separate books.

## The game part by part

| Part | State | In a line |
|---|---|---|
| The first ten minutes | Strong | A fight, a waking, a choice and a test that does not count, all inside the first few minutes. |
| Story pages | Strong | A painting, about fifty words and two to four ways on. Never long without something to do. |
| Choices | Mixed | The story branches for real. Two of the families of meters shown after a choice, duty and reputation, mostly lead nowhere (area 2). |
| Tests | Good | 23 kinds, each its own scene. About six are a single button pressed or held in time (the bone, the bow, the dive, the fuse, the post, the beat). |
| Fights | Look strong, play thin | Openings, fields and figures are the best-made part. The outcome is rarely in doubt (areas 1, 6, 7). |
| The war | Good | A third of the life, seven fights, the commander's orders each day. Costly to fall in (area 4). |
| Growth | Thin | Given by the story, not chosen (area 8). |
| Endings and other lives | Good design, broken on the links | Seventeen endings and a Book of Lives, split in two by the two-link build (areas 5, 10). |
| The page on a phone | Good | Clean and readable at 390 points wide. Two small faults below. |
| The first load | Not measured on a phone | About 40 MB before the title (area 9). |

## What already works: keep it

| What | The measure |
|---|---|
| The hook | The game opens inside a fight, in a dream of the war. The first real choice comes after about 20 seconds of reading, the first test after under a minute more of it, and that first test does not count. |
| The pace | Something to play every 3.3 pages. Half of all reading stretches are under 40 seconds, nine in ten under two minutes. About half of the time is play and half is reading. |
| The length | About 105 pages, 5,400 words, 19 tests and 10 fights. Roughly an hour by a rough clock (40 to 75 minutes); a first life on a phone will run longer. |
| Variety in a life | 23 kinds of test, about 11 of them met in one life. Each has its own 3D stage and its own way of playing. |
| Variety between lives | One life sees 43% of the 241 scenes. Two lives share 59% of their pages: 66% on the same side of the war, 55% on opposite sides. |
| Fair warning | A choice carries a small mark when it can cost your life, leads to a fight, or takes or breaks a vow. A dice test's roll is shown after it is made. |
| Fight openings | The field, the leader against you, what his men do, how they stand, then your plan. They show the modelled figures well. |
| Care for the player | Story mode, three levels, blows met for you, larger text, calm motion, a practice ground, a fights-only mode. |

## The areas, biggest first

### 1. Fights are rarely in doubt, and defence is hardly needed

What was measured, over all 79 fights:

| Player | Fights won | Health left at the end | Fights never lost |
|---|---|---|---|
| Careful: reads blows, guards, rolls, uses everything | 92% | 59% | 58 |
| Careful, but no path skill, herbs, help or divine weapon | 72% | 39% | 34 |
| Never guards or rolls, uses skill and aids | 81% | 45% | 37 |
| Only walks up and strikes | 52% | 26% | 18 |
| Does nothing | 13% | 8% | 0 |

- **Guarding and rolling are worth 11 points.** A player who never defends still wins four fights in five, and in 44 of the 79 wins at least as often as the careful one. The aids (skill, herbs, help, weapons) are worth 20 points, nearly twice as much as defence.
- **47 of the 79 fights end on a count** ("hold for six rounds"). A player who does not touch the screen wins 22% of those. Standing still wins "Three at the water" 86% of the time, and "Through the Kaurava army", "Through Drona's division" and "A man down" 71%.
- **The 27 fights marked hard are the easiest group**: a careful player wins 96% of them, against 92% over all.
- In the game's own record (28 tries each), 51 of 79 fights were never lost.
- A fight is 41 seconds of play on average. Its opening runs about 20 seconds if not tapped through (from the shot lengths in the code, not timed on a phone).

A caution: the scripts press at the right moment every time, so a person on a phone will win fewer than the striker here. The finding is the gap between the kinds of player, not the levels.

Why it matters: a fight whose outcome is not in doubt is watched, not played. The owner's own note after playing ("fights seem similar... make them harder with each battle") describes the feeling these numbers explain.

What to do:
- **Make a blow you ignore cost more than health.** A heavy blow taken unguarded should knock you down or break your chain, so that reading blows is how you keep striking. Aim for the never-defends player to win about half, with the careful one still near 90%.
- **Give every count fight something to do each round.** Five were already rebuilt this way (the king's chariot, Bhima's charge, the three against Arjuna): the champion comes for the gap and you bar his way three times. Do the same for the rest, starting with the ones that can be won standing still.
- **Make "hard" mean hard**: the design document's own target is 60 to 85% in the hard fights.

Size: medium. It is tuning plus the pattern already built, and the fight bands will show what moved.

### 2. The meters the player watches most are read least

The Standing sheet says of the four duties: "Choices pull these against each other." What the data says:

| Meter | Choices that move it in a life | Where the story reads it |
|---|---|---|
| Duty (four) | 25 | Teacher's debt: one requirement and one line of the ending. Conscience: one branch in the war, and rebirth. **Loyalty to your king: nowhere. Family duty: nowhere.** |
| Reputation (six) | 21 | Kuru court: Kripa as a teacher. Sages: three gifts. Pandavas: the wise elder's ending. **Common people, Panchala, Yadavas: nowhere.** |

- Of 267 places that change a duty, only 33 raise one while lowering another. The rest only add.
- So the meters fill up and stop telling lives apart. With random choices, family duty ends at 9.6 of 10 and standing with the common people at 9.9 of 10.
- The same happens to attributes. Wisdom is raised in 40 places, might, grace and command in 14 each, and **aim in one**. With random choices almost every life ends wise (7.4 of 8).

Why it matters: the game's second pillar is "choices with weight". The story does remember what you did (through its flags, your vows, your bonds and a hundred past deeds that help or hurt later tests), but the numbers it shows you after nearly every choice are mostly decoration.

What to do:
- **Read them.** Open or close choices on a duty or a reputation at the moments that are about them: the dice hall on conscience and loyalty, the exile on family, the choosing of sides on loyalty, the forest years on the common people.
- **Make them pull.** Where a choice honours one duty, it should usually cost another.
- **Say so when it happens**: "Because you kept faith with your king..." on the page. The owner chose on 5 November not to show a choice's effects beforehand; this keeps that, and shows the cause afterwards.
- **Let the highest duty colour the ending**, as the teacher's debt already does in one line.

Size: medium, and it is writing, not machinery. The requirement for it exists; for duty it is used once.

### 3. The epic's turning point is the thinnest stretch

| Act | Pages | Minutes | Tests | Fights |
|---|---|---|---|---|
| I Childhood | 15 | 8 | 2.6 | 1.3 |
| II Training | 12 | 5 | 3.0 | 0.6 |
| III Young adult | 12 | 7 | 3.0 | 0.7 |
| **IV The fracture** | **5** | **2** | **1.2** | **0** |
| V The exile years | 17 | 9 | 3.9 | 0.7 |
| VI The war | 31 | 19 | 3.2 | 6.8 |
| VII Aftermath | 10 | 4 | 1.7 | 0 |

The dice game is told in one sentence ("Yudhishthira loses everything, then Draupadi"), then a timed choice, then the cloth that does not end, then the exile. The timed choice under a burning lamp is one of the best moments in the game. But a player who does not know the epic is given no time to feel what was lost, and one who does is past it in two minutes.

What to do: stage the match. Each stake is a page (the pearls, the army, the brothers, himself, her), with the hall changing around you and something small for you to do or fail to do at each. The scene before already lets you catch Shakuni's swap, say so and be ignored; carry that through the stakes, so that you sit knowing while each one is lost.

Size: medium. Six to eight pages of text in two languages. The paintings of the hall exist.

### 4. A fall in the war sends you back to its first morning

The game keeps the life at the start of each act, and one copy if you save it yourself from the menu. A deadly fight lost gives one more try; lose that and the page offers the start of the act. Lives that fell in a war fight had, on average, 20 pages, 5 fights and about 14 minutes of the war behind them (by the same rough clock).

What to do: keep the life at the dawn of each day of the war. The days are already chapters, with the commander's orders opening each one.

Size: small. The keeping exists; it is asked for once an act.

### 5. The life breaks in the middle, and the Book of Lives is two books

On the two play links, Act IV ends with "copy this save code, open Part Two". Each link keeps its own storage (read from the code and from how the play pages are hosted; not tried on the links themselves), so:
- a life that ends in Part Two is written in Part Two's book only;
- a new life begins in Part One, which has never heard of it, so "Remember a past life?" is never offered for a life that reached the war;
- "Endings found: n of 17" can never be completed in either book.

The fourth pillar ("many lives, a Book of Lives, rebirth with karma") therefore does not work as built on the links most people will use.

What to do: either host the game as one page (the repository's own build has no file limit and is one game, one book), or carry the book inside the save code.

Size: small for the code route. The one-page route is a hosting decision.

### 6. Nothing says how well you fought

A fight ends on one word (Victory, Spared, You are beaten) and a gong. The game already counts your blows landed, blows taken, clean rolls and clean guards, and shows none of it.

What to do: an end card with three or four of those facts and a mark for a clean fight, with something small given for one (a bundle of herbs, a word of renown). This is also what would make defence worth learning (area 1) and gives the fights-only mode something to chase.

Size: small.

### 7. Guarding and rolling are never taught

The first fight is the dream: several foes, six buttons and two tips, and it is meant to be lost. After that the practice ground teaches reading a blow, but it is reached from the menu or offered after a loss. The training bouts of Act II (Kripa's wooden swords, Balarama's maces) were once tests of parrying ("three clean parries pass") and are now free bouts, which a player who only strikes usually wins (the measure of 13 November).

What to do: make each training bout a lesson with one thing asked. Kripa wants three clean guards. Balarama wants you to roll clear of the great blow and strike after. The story of Act II is training; let it train.

Size: small to medium.

### 8. Growth is given, not chosen

From the choice of path in Act II to the end, the moves in your hands do not change: one chain of blows, guard or roll, one skill. Your strength does rise (a rank, boons, vows kept), but not by anything you decide to train. Attributes rise where the story hands them out (see area 2). With random choices, half to two thirds of lives end with no divine weapon, and a life gathers about one boon and one vow.

What to do: one deliberate choice of training at the end of each act (a point to place, or one of two techniques). The divine weapons spaced along the life are already on the parked list and would help here.

Size: medium.

### 9. The first wait

Every modelled figure is fetched before the title can be used: about 40 MB (about 17 MB if the host compresses it), 13 files on the play links. A button to begin at once appears after 25 seconds. On mobile data the first thing a new player sees may be a filling bar.

What to do: fetch the dream's handful of figures first, open the game, and bring the rest in during the first minutes of reading. This is the "preloading" item already parked.

### 10. After an ending, little points to the next life

The ending gives a record line (fights, tests, games) and the Book hints at endings not yet found. It does not say that this life saw less than half of the story, or which roads are unlived (seven paths, three sides, eight homelands). What a remembered life gives the next is a point or two of a measure.

What to do:
- On the ending, name three roads not taken, from what this life did not see.
- Let the dream that opens a reborn life be the last fight of the life before it. The game already begins every life in a dream of the war; this makes "many lives" one story.

Size: small for the first, medium for the second. Both need area 5 mended first.

## Small faults seen on the way

- **Cutting the oil lines** (the cellar under the house of lac): at phone width the four buttons are about 17 points wide, and "Cut" is squeezed so its word spills out. Seen in a staged run of the test, not inside a played life.
- **The first test's card** says "Throw as it crosses your line". What you then do is pull back and let go, with dots showing the pebble's flight.

## Already parked or on hold, and not repeated here

The owner has set these aside, and nothing above asks for them again except where named: the divine weapons spaced along the life (it would help area 8), preloading (it is area 9), the side quests, real chariots at the wheel's mouth, the board and button tests made fully 3D, the five new story lines and new tests, and the sneak test.

## Suggested order

1. Areas 1 and 6 together: fights that can be lost by ignoring blows, a card that says how you fought, and the count fights given something to do. This is where "interesting to play" is decided.
2. Areas 4 and 5: the dawn of each war day kept, and one Book of Lives. Small, and they remove the two worst stops.
3. Area 2: the five meters that nothing reads, then real trade-offs.
4. Area 3: the dice match staged.
5. Areas 7 and 8, then 10.

One thing would test all of this better than any script: watch three people who have never seen the game play its first fifteen minutes on a phone, and say nothing.

## More figures

| | |
|---|---|
| Pages with one way on | 17% (32% in the war) |
| Pages with two, three, four or more ways | 33%, 35%, 15% |
| Dice tests in a life, and passed | 5.7, 76% |
| Scenes that every whole life passes | 52, about half of a life |
| Endings among lives that survived | The homecoming 21%, Renunciation 20%, The wise elder 20%, The wanderer 15%, The teller 12%, Broken survivor 7%, Vengeance 3%, The banner-bearer 3% |
| Tests met most in a life | Archery 2.8, stealth 2.1, the race 1.6, riddles 1.5 |
| A life's own skill at the end, against its other skills | 4.9 against 2.1 |
| Fights that end on a count, and the rest | 47 (35 seconds, a striker wins 80%) and 32 (49 seconds, a striker wins 82%) |

## To run the measures again

```
node tools/review/play_metrics.js 800 5            # lives: length, pace, choosing, variety, endings (add --good for a better hand at tests)
node tools/review/fight_depth.js 7 11              # every fight by five kinds of player (about fifteen minutes)
```
