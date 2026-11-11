# Kurukshetra: A Life · Game Development Document

Status: living document. Version 2.1 (2D story; 3D battles and tests, three views, the line, the epic's dress). Last updated 10 November 2026.

## 1. Vision
You cannot change the Mahabharata; you decide who you were inside it. One unnamed life, from a childhood beside the
princes to the eighteen days at Kurukshetra and what is left after. The epic's events are fixed ("Written"); your part
in them is not ("Unwritten").

**Pillars**
1. *Fidelity to the epic.* People, places, standards, weapons and the order of events follow the Mahabharata. Where the
   game invents (your character, Ugra, Charu, Vasu), it never contradicts what is written.
2. *Choices with weight.* No good-or-evil bar: duties pull against each other (teacher, king, family, conscience).
3. *Battles you fight yourself.* A fight is skill plus the life you built: your path, your vows, who stands beside you.
4. *One sitting, many lives.* Sixteen endings, a Book of Lives, rebirth with karma.

## 2. Structure
Seven acts, 229 scenes: Childhood, Training, Young adult, The fracture (the dice game), The exile years, The war, Aftermath.
A scene is a painting, a witness line of what the epic says, your story text, and choices. A choice may apply effects,
roll a check, open a test (23 kinds), or lead to a fight (72 encounters).

## 3. Systems (rules live in `js/engine`, data in `js/content`)
- **Character:** homeland (8), temperament, heirloom; attributes, skills; a path chosen in Act II (archer, mace,
  charioteer, strategist, healer, spy, bard), each with a weapon and a battle skill.
- **Standing:** duties, bonds with named people, reputation with factions, up to three vows (kept: a gift; broken: a
  price), boons, curses, injuries, tapas, divine weapons with conditions.
- **Tests:** action minigames whose difficulty comes from your stats; win, close or lose picks the branch.
- **Saving:** autosave per scene, a manual copy, save codes, act checkpoints. English and Hindi.

## 4. Battles (3D)
**Loop:** read the marks on the ground, move, strike in chains, answer blows (roll, guard, parry), spend your skill
and aids at the right moment.
- *Field:* a 13 m round arena on the fight's own ground.
- *Views:* three, changed at any time (eye button, R) and remembered. **From above**: the field laid out, steeper on
  upright phones. **From behind**: the camera at your fighter's back. **Through your eyes**: first person, your own
  head not drawn. The two close views turn to keep the foe you face ahead (the goal, in a breakthrough), move you
  relative to where you look, keep your face to the foe as you step round him, close a ring on a blow you can see,
  and mark the screen's edge for a blow from out of sight. Nearby figures are not drawn when the camera would look
  through them.
- *Opening:* every fight opens close on you, reads the story's lines as captions, crosses the field to the one who
  leads against you, shows who stands with you, then pulls back to the view you chose and waits for "Fight". A tap or
  a key moves it on; Skip goes to the field; a second try of a lost fight starts at once.
- *The line:* in war and raid battles (not duels, sparring, or the special kinds) four soldiers of each host (two in
  a raid) fight inside the field, man against man down both flanks, and up to four more a side come on from the
  ranks as they fall. They are the engine's own units, so every blow is the engine's blow; but only the named decide
  the fight (when they fall, the line breaks), a soldier of the line is the one you face only when he is on you, and
  the line is taken off the roll before the fight is settled, so the story reads the fight it always did. A soldier
  with no man of your line left to face turns on you. Beyond the ring, pairs trade blows at the ranks' edge and
  flights of arrows go over.
- *The dream:* the opening fight is meant to be lost. Your three soldiers are weak and fall; theirs come faster and
  stronger the longer you stand, and from 20 s three, from 38 s four blows may be wound up at you at once. Standing
  for 56 s holds it. Either way the dream breaks, and the story goes on the same.
- *You:* weapon chains (sword 3, mace smash and sweep, spear, dagger 5, bow double shots, fists); roll with a moment of
  safety; shield with perfect block and breaking; parry on the last moment; breath as stamina.
- *Foes:* at most two wind up at once; melee circles and closes; archers keep 8.5 m; champions feint and parry.
- *Aids:* path skill on a recharge, herbs, a call for help, divine weapons (one mantra a battle), orders (with me,
  attack, fall back), mercy.
- *Fight kinds:* defeat, hold for a time, escort (keep the cart whole), breakthrough (reach the far side), weather
  (no striking: survive), the unwinnable stand against Abhimanyu (withdraw or fall).
- *Difficulty:* Easy, Normal (rises by act), Hard; Story mode cannot die; "Meet blows for me" guards and rolls for you.
- *Balance target:* a careful player wins about 90% overall, 60-85% in the hard fights, and next to never in the two
  that are meant to be lost (the dream; the ring round Abhimanyu, which you may leave). Where the 2D game has a
  recorded win rate for a fight, the 3D rate is kept near it. Measured with a bot that reads blows late and misses
  some; the recorded rates are in `tests/baselines/fights3d.json` and `docs/Balance_3D.md`.
- *Moves:* every blow has a coil, a held moment, an accelerating snap that lands when the rules land it, a
  follow-through and a recovery, with a step; see `docs/Fighting_Moves.md`.

## 5. Setting and authenticity guide
Use this when adding or changing anything a player sees.
- **The rule:** what a named person wears, carries, rides behind and flies is what the epic's text says, with the
  passage on record in `docs/Costume_Audit.md`. Where the text is silent the game may choose, and says so there.
- **Heroes and their standards:** Arjuna: dark, a diadem like the sun, the ape, four white horses in gold, Krishna
  (lapis-dark, yellow silk, a diadem, a whip) driving. Bhishma: white headgear, white banner, white steeds, white
  umbrella, the palmyra with five stars. Karna: the elephant-rope in gold; golden mail and ear-rings until the war,
  neither after. Drona: all in white with thread and garland, a golden car, red steeds, the altar and water-pot.
  Duryodhana: an elephant in gems on gold, a white umbrella; mace. Bhima: a silver lion, dappled steeds; mace.
  Abhimanyu: a golden peacock, tawny steeds. Jayadratha: a silver boar. Yudhishthira: golden skin, a golden moon
  with planets, ivory steeds; spear. Kripa: a bull. Ashwatthama: a lion's tail. Nakula: a sarabha; Sahadeva: a silver
  swan. Ghatotkacha: a vulture, a black iron car.
- **By period:** the Pandavas wear deer-skins and matted hair in the forest years; Arjuna in the year of hiding is
  Brihannala (women's ornaments, conch bangles, a braid); Draupadi there wears one black cloth.
- **How they fight:** the great archers fight from chariots; mace and sword fighters fight on foot, their cars
  waiting at the field's edge under their standards; elephants carry howdahs. Foot soldiers are bare to the waist
  under crossed bands, in coiled turbans, with hide shields; some wear helmet and cuirass. Bows are as tall as the
  archer and drawn to the ear. No stirrups, no plate armour, no crossbows, no cavalry charges with lances.
- **Sides:** Pandava host in blue with the moon; Kaurava host in red with the sun (a game convention, kept
  consistent so friend and foe read at a glance).
- **Places:** Kurukshetra is a dry open plain; Hastinapura sandstone on the upper Ganga; Indraprastha white on the
  Yamuna; Gandhara mountain country; Matsya lakes and pasture; Panchala between Ganga and Yamuna; the house of lac at
  Varnavata. Fights use the ground the scene is set on.
- **Conduct of war:** fighting stops at sunset (the night raid is the exception the epic condemns); conches open a
  day; a foe who lays down arms is not struck by one who keeps the vow.
- **Tone:** no gore; the fallen lie where they fell. Names and terms follow the glossary.

## 6. Technology
Plain JavaScript, no build step, static hosting (a two-part build exists for a host that holds at most 512 files). 2D UI in DOM and SVG; 3D battles in three.js r187 (vendored) with all
3D assets made in code (merged low-poly geometry, canvas textures, jointed figures from the same look data as the 2D
puppets). Deterministic fixed-step battle simulation, separate from drawing, so it can be tested without a screen. Figures have
faces, coiled turbans, armour in rows, the sacred thread, garlands and deer-skins, a soft shadow underfoot and a
streak behind a weapon in its blow; the ground is trodden earth fine enough for the close views. Quality scales with
the device. 3D can be switched off (`?2d=1`, or the `no3d` preference), which shows the 2D game's own screens, as a
device without WebGL does.

**Tests.** `npm test` runs the 2D game's regression suite (brought over: rules, random lives, golden lives, balance
bands, content, bugs, saves) and the 3D layer's own checks (the 3D rules, every fight by a bot against its band, and
fights and tests in a real browser with software WebGL). CI runs the quick tier on every push. See `tests/README.md`.

## 7. Known gaps and roadmap
| Priority | Item |
|---|---|
| 1 | Play every fight by hand (the two private play pages are the place to do it) on real phones and desktops in all three views; tune feel and frame rate |
| 1 | Run the full test tier (playthroughs, layout, visual baselines) on this build and accept the puppets' new colours |
| 2 | Repaint the four portraits that differ from the text (Arjuna's diadem and skin, Karna in the war, Dhrishtadyumna's crown, Ghatotkacha's hair) |
| 2 | The five board and dice tests and the five button-answered tests are a 3D scene with flat controls: make them fully 3D |
| 2 | Chariot combat for the player on the charioteer path; mounted elephant riders |
| 2 | A free look in the close views (drag to turn), and a setting for 3D on or off in the menu |
| 2 | Formation-specific fields: the wheel's rings as walls, Bhishma's bed of arrows |
| 3 | Retire or rewire the 2D "turn-based fights" switch |
| 3 | Self-host fonts; offline support |
| 3 | Review of story text by scholars, of the moves by someone who fights, and of Hindi by a native speaker |

## 8. Glossary of the build
*Encounter:* a fight's data. *Trial:* a test's data. *Witness:* the line of what the epic records. *Mark:* the shape
on the ground that shows where a blow will land. *Standard:* a hero's banner. *The line:* the soldiers of both hosts
who fight inside the field in a war battle. *The named:* the foes the story's fight is about.
