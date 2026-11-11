# Conversion notes: 2D to 3D

## Approach
The 2D game keeps its rules (`js/engine`) and story (`js/content`) apart from its screens. The conversion reuses both
unchanged and replaces only the presentation layer with one WebGL canvas (three.js, vendored, no build) and a DOM page
drawn over it. Without WebGL, or under a test harness (`K.headless`), every 3D call is a no-op and the game still runs.

## The world, made in code
- `g3/kit.js`: a Builder that merges vertex-coloured low-poly solids into one mesh per place, plus props (trees, huts,
  halls, gates, chariots, horses, elephants, banners, instanced crowds and hosts).
- `g3/figure.js`: jointed figures built from the 2D game's own look data (`K.PUPPETS`, `K.puppetSpec`): pose tables,
  one-shot actions timed so a weapon comes down exactly when a blow lands, walking, falling, rolling.
- `g3/sets.js`: sixteen place builders; a table maps every art key of the 2D game (scene paintings, test stages, fight
  grounds) to a builder, a sky and options. Each place keeps its middle clear and is seeded, so it is the same each visit.
- `g3/core.js`: renderer, light and sky presets, a camera rig with a movable focus so the scene sits in whatever part
  of the screen the page leaves free, adaptive quality.

## Story
`ui/story.js` follows the 2D scene flow step for step (journey, act and title cards, witness layer, choices, lamp,
test or fight, result, "after" beat). Its director decides who is on stage: speakers, then people named in the scene's
text in order, then a few plain folk of the place.

## Battles (creative liberties)
`ui/battle/sim.js` is a deterministic fixed-step simulation that rides on the turn engine: `K.Combat.start` builds the
fight, every blow is the abilities' own `use()`, and the end is `K.Combat.settle` then `K.combatOutcome`, so vows,
holds, story beats, sparing and consequences behave as before. New: positions in metres, facings, marks on the ground,
weapon chains, roll with i-frames, shield with perfect block and breaking, parry, projectiles, allies with orders, a
human-like bot (tests, and "Meet blows for me"). Liberties taken so the fights play well: everyone can roll; foes
come in two at a time and turn slowly while winding up; the special "live" fight kinds of 2D (chariot, range, mace,
carry) are fought on the same field as holds; a mace sweep cleaves.

Balance (bot, 14 runs per fight, all seven paths): mean win 92%, mean length 41 s; hard fights 57-86%; `e_ring`
(Abhimanyu) cannot be won, by design. Per-fight tuning is `R3.TUNE`.

## Tests
All 23 kinds keep their rules, windows and stakes (`ui/games.js`). The three board games and the dice are played on a
board drawn over the hall rather than as 3D pieces. Simplified against 2D: `escape` is open ground with walls instead
of a 5x5 room grid; `herd` is free movement instead of a grid; `sneak` twists other than "turns" and "dog" are not
modelled; `aim` has no return shot in duels; `formation` and `array` are compact versions.

## Not carried over
Paintings and video clips; the turn-based fight screen; the practice ground (the "Just the fights" ladder stands in);
the war-day tap map (its choices remain); 2D moment effects drawn over paintings (moments are staged in 3D instead).

## Checked
- `tests/fights.js`: all 72 fights, 0 errors.
- `tools/play.js`: a whole life in headless Chrome (software WebGL) from creation to an ending, no page errors;
  every kind of test opened and played a few inputs with no errors; a fight on a phone-sized touch screen; Hindi.
- Not checked: real devices and real GPUs (frame rate), a human playing every test to its end, screen readers.
