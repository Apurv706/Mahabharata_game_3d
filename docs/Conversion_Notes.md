# Conversion notes

## Where it landed
Version 1 rebuilt the whole game in 3D (story scenes, map, tests, menus). A review found the 3D story pages static
next to the 2D paintings, and the owner's direction was: keep 2D where it works better, put the effort into battles.
Version 2 is therefore the 2D game unchanged, with a 3D layer that opens only for fights. The full-3D screens remain
in git history (commit e2fd6e0).

## How a fight is wired
`js/ui/battle/bridge.js` keeps the 2D `U.startBattle` as a fallback and lets `view.js` replace it. A fight shows
`#b3d` (a canvas and HUD above the page), starts the renderer on first use, and puts it to sleep afterwards. The rules
(`sim.js`) ride on the 2D combat engine: `K.Combat.start` builds the fight, every blow is an ability's own `use()`,
and the end is `K.Combat.settle`, so story consequences are exactly the 2D game's.

## Liberties taken in battles
Free movement on a round field; everyone can roll; foes come two at a time and turn slowly while winding up; a mace
sweep cleaves; archer heroes ride chariots; the 2D "live" fight kinds (chariot, range, mace, carry) are fought on the
same field as holds.

## Fixed after the review
Rolls tumble the way you roll; walking feet keep pace with the ground; allies no longer stand inside you and use their
own weapon's blow; arrows rise and fall; slow devices skip frames (down to 10 a second) instead of slowing time;
lighter crowds on phones.

## Version 2.1 (10 November)
Asked for: better graphics; more foes and teammates in battles; a harder opening; every battle to open on a closeup
and show its setup; the moves compared with real fighting; the costumes checked against the epic; three views of a
fight; the 2D game's tests brought over; every battle tuned.

- **Views.** From above, from behind, through your eyes (`view.js`: `camera`, `setView`). The close views needed one
  new input to the rules, `strafe`, so that you keep your face to the foe as you step sideways.
- **Opening shots** replace the card that used to cover the field (`brief`, `introNext`, `ready`).
- **The line** (`sim.js`: `R3.lineFor`, `addLine`, `lineStep`, `settle`). Soldiers are engine units marked `line`.
  Choosing them over a separate, rules-free crowd means the player's blows, astras and allies work on them with no
  special cases; the cost was to teach five places to tell the named from the line (who you face, the turn-taking
  against you, the win, the count, the settle).
- **The dream** is the line with its own numbers.
- **Moves** rebuilt (`figure.js`); **costumes** corrected in the shared look data (`puppet.js`), so the 2D puppets
  changed colour and headgear too.
- **Tests.** The 2D suite runs here. Its two-part build was taught to fold the 3D scripts into one file.
- **Tuning.** Every fight was played by the bot 28 times and its numbers moved until its win rate sat where the 2D
  game's does (`docs/Balance_3D.md`; the baseline is `tests/baselines/fights3d.json`).
- **Sneak tests** were one button (hold to walk a line, stop on a tell). They are now a yard to cross any way you can:
  guards walk beats with their sight drawn on the ground, crates hide you, running is heard and creeping is not, a
  meter shows how sure they are of you, and two pebbles draw their eyes away. `SETUP.sneak`/`PLAY.sneak`.
- **Divine-weapon tests** (`divine: true` on the trial) are harder by method, not only by number: stillness is three
  watches in a row (the band drifts, then leaps, then your hand is knocked too); the dive's glow rides up and down and
  must be met at its depth, three times of four; every riddle must be right, on a shorter lamp; the climb is faster,
  thicker, and forgives one stumble fewer.
- **Divine weapons in a fight** each arrive and end their own way: forked lightning man by man; a burning arrow and
  fire that walks to them and burns on (no one can set his feet to strike in it); a wall of water that carries a rank
  off together; a whirlwind that scatters them; a hush that puts them to sleep; serpents that run to each and wind round.
- **Dress.** The figures wear wound cloth, not trousers and sleeves (see `Costume_Audit.md`, "How everyone is dressed").
- **Kept in step with the 2D game.** The 2D repo's changes after the copy are carried over as patches (11 Nov: its
  change 104, then 105 to 113; the path screen asks "Which path do you choose?" and each tile names what the path fights with; 2D
  commit c6a8ef5). To do it again: `git diff <last carried commit> origin/main -- game` in the 2D repo, applied here with `-p2`.
- **The figures are one skin over the skeleton** (11 Nov; they were jointed dolls of separate rigid pieces and read as
  boxy). The joints the poses turn are unchanged, so every move is as tuned. Over them `Skin` in `js/g3/figure.js`
  builds one smooth surface (trunk, arms, legs, and the cloth wound on them), each point held by the joints near it:
  elbows and knees bend, and a lower cloth let fall is one length round both legs that stretches with a stride. The
  pleats, the sash ends, the end of the upper cloth and hanging hair are on joints of their own that sway (`f.j.sF`,
  `sS`, `sB`, `sH`). Hands have a palm and thumb, feet a heel and toes, faces a jaw, nose, lips and ears; builds differ
  (`big`, `strong`, `slim` in `K.PUPPETS`). The rank and file and far-off figures are built plainer (`opt.lite`).
  Cost: a war battle draws about a quarter more triangles (about 460k, was 365k) in the same number of draw calls.
- **The field's edge** was a ring of dark bars on the ground. `buildEdge` in `js/ui/battle/view.js` now makes what
  would be there: on a war field, churned ground, arrows standing in the earth, dropped shields, wheels, planted spears
  and the two hosts' standards; in a yard or hall, a bank of earth with a limed line, posts and a sagging rope; in the
  open, stones, tufts and fallen boughs. The limit itself shows as a curve of light only when you come within a few steps.
- **Sway** is a damped pendulum driven by how the body moved that frame (run, turn, sudden stop), with stops so cloth
  cannot pass through the body; it was a clock-driven wobble.
- **Faces:** long eyes with lids, and hair on the face per person (`whiskers`: clean, thin, stache, heavy, stubble;
  `beard`: goatee, short, full, forked, long), matched to the 2D portraits where there is one.
- **Heads** are one shaped surface from chin to crown (they were two balls, and the join showed as torn patches). The
  shape is the person's: `FACES` in `js/g3/figure.js` (oval, square, long, round, heart, broad, gaunt, hawk) sets jaw,
  chin, cheek, the length of the lower face, the brows and the nose; `face:` in the look data names one, and the rest
  are told apart by build. Hair, stubble and a short beard are colour on that surface; longer beards hang from the chin;
  Gandhari's bandage and an elder woman's head-cloth are fitted to it. To see them: the close-up sheets.
- **Caught up with the 2D game to its commit b1216f5 (11 Nov; its changes 105 to 113).** The shared files came over as
  patches. What the 2D game does in its own real-time rules is mirrored in `js/ui/battle/sim.js` ("The 2D game's Build D"):
  the champions' traits (Drona and Kripa read a repeated combo; Duryodhana and Satyaki parry more; Karna's wheel;
  Ghatotkacha's two false figures, which cast no shadow; Bhima's war cry; Abhimanyu's sweep; Bhurishravas's knock-down;
  Supratika's charge), the tier you have climbed to (only your tier or above staggers you), boons (Bala, the charmed
  shield, healing hands, sanjivani, Antardhana as a Vanish button, key G), and each divine weapon's lasting gift. Blow
  weights, the climb itself, archers among the packs and Bhadra's three scenes are in the shared engine and needed nothing.
  Field events are not drawn over a painting here: `fieldEvent` in `view.js` makes them happen on the field (riders,
  a chariot or an elephant crossing beyond the edge, arrows falling, fire, dark, dust, a serpent of light, rings from a
  conch). Three fights are tuned apart for 3D, where being surrounded is harder: Bhadra's bout, the border road, the crossing.
- **Behind the field is the 2D game's own painting of the place** (`backdrop` in `view.js`): the top of the fight's
  stage painting wrapped round the horizon, mirrored so it has no seam, fading up into a sky set from its colours, with
  the ground and haze tinted toward it. Only the empty stage paintings (`fight_*`, `stage_*`) are used; halls keep their
  walls; if the file is not there the built sky stays. No new art was needed.
- **The opening shot of the one against you** ends in front of his face (from where his head is turned, to one side,
  and from below the rim if he stands under an umbrella); it used to end where his standard or umbrella could cover him.
- **More to look at on everything that moves:** horses (chest, quarters, mane, tail, bridle, saddle cloth, plume);
  chariots (curved panelled breastwork with gold bosses, rails, twelve-spoked iron-shod wheels, yoke, reins, arrow
  case, a fringed and ribbed umbrella, the standard at the rear corner); elephants (ears, ringed tusks, a bordered
  cloth with tassels, frontlet, girth and bell, a railed howdah, anklets); fighting men (bronze helmets with brow band,
  nose guard, cheek pieces and neck guard, horsehair crests, greaves, a dagger at the belt, a quiver on every archer);
  charioteers turbaned and bare-chested. After the 2D game's own chariot paintings.
- **Play pages.** The game is published as two private claude.ai pages, as the 2D game is: Part One (Acts I–IV) at
  https://claude.ai/artifact/TXBcsF2GVrtdw1dHKmDPiJ and Part Two (Acts V–VII) at
  https://claude.ai/artifact/2k4v9FbvnRxXk7TY25UQ5H. `tools/split/build.js` makes them (each within the host's 512
  files; the 3D scripts folded into `k3d.js`, the 3D stylesheet into the page, both Hindi files into one). A part is
  uploaded in three goes, since one upload carries at most 255 files and 64 MB; to update a part, publish its page
  again to the same address with only the files that changed.

Faults found on the way, all fixed:
- The fight's HUD layer swallowed every tap and click meant for the field: on a phone the thumb stick never moved the
  fighter, and a click never struck. (Found when the opening shots would not move on at a tap.)
- On a device without WebGL nine kinds of test crashed: the 3D test frame had replaced the 2D game's own frame, and
  the fallback called itself for ever. (Found by the 2D suite's content check.)
- Archers aimed some fifty degrees off their mark: the bow arm followed the turned chest, not the target.

## Checked, and not
Checked: the quick tier of `tests/run.js` on this build, all passing: the 2D game's rules (530 checks), 500 random
lives, 16 golden lives exactly as the 2D game recorded them, its balance bands, content, bug and save checks; the 3D
fights' rules (27 checks); every fight by the bot, 28 runs each, inside its band; and in headless Chromium
with software WebGL a battle played from its opening shots to its outcome on a desktop and, with real touches, on a
phone; the dream; all 23 kinds of test opening in 3D and ending; and the 2D screens with 3D switched off.
The two built parts were walked through as a phone (the opening, a sparring bout, the war's first day, Act V from a
save code) with no missing file, and a 3D fight was fought to its end on each, in English and with Hindi loaded.

Not checked: the frame rate of the new figures on a real phone (on the test machine's software renderer a war battle ran about a quarter slower, which says little about a GPU); whether a person finds the new sneak yard and the three watches fair (they were run for errors and for losing when played badly, not played well by hand); the published pages themselves (they cannot be opened from the build machine; what was tested is the
same files served locally); real devices and GPUs; a person playing a fight by hand to its end in any view; frame rate with the line
on a phone; gamepad; sound; the full test tier (playthroughs, layout on every device, visual baselines), whose
baselines will show the puppets' corrected colours. The moves were checked against written technique from still
frames, not against film or by a fighter. Several 3D tests are simpler than their 2D versions (escape,
formation, array; the board and dice games are a board drawn over the 3D hall). The herd was one of them until
13 November; it, the race, archery and the contests against a person now ask more than the 2D versions do (see the end of this file).
Known leftovers: the 2D menu's "Fights: turn-based" switch no longer changes anything while 3D is on.

## The join between the field and the painting (12 Nov)

The painted horizon and the built field used to meet at a hard line. Now, once a painting loads (`backdrop` in `js/ui/battle/view.js`):

- the built far hills stand down (`G.hills` makes its own mesh, kept in `st.far`), since the painting has its own;
- a band of haze just inside the painting thins the painted ground under its horizon into one plain colour (sampled from that strip);
- the built ground runs out to that same colour with distance and then fades to nothing (RGBA vertex colours, transparent material), and its near tint toward the painting is clamped so a yard does not turn red;
- the sun, sky-light and ground bounce take colour from the painting, the haze is at least 0.0075 dense, and the sky's own sun-glow is off (the painting has its sun).

Known: the painting is mirrored round the horizon, so a painted sun or moon near the picture's edge shows as a close pair in some directions.

## Chariots after the user's reference paintings (12 Nov)

`G.chariot`: lotus wheels and gold panels on the sides, bosses on the rails, a scroll at each rear corner and a prow, a two-tier domed umbrella with a hanging fringe and pot finial, and a taller standard (3.35, or 4.05 with an umbrella) so the cloth flies above heads and umbrella. `G.horse` with tack: face plate, collar of bosses with tassels, girth, crupper, tail ribbon, anklets. The opening shot stands wider of a team of four.

## After two played lives on a phone screen (12 Nov)

A script played two lives through the real buttons on a 390×844 screen, a frame every 30 s (harness kept outside the repo). What changed because of what the frames showed:

- **Fight camera, upright phones:** the overhead view stands closer (fov 58, back 6.4, up 9.4 at the narrowest; wide screens unchanged). The opening shots lose their black bars on upright screens and stand 1.34× further back so heads are not cut. A rider's face shot is framed by the way the car points, clear of the team.
- **Test camera:** `ctx.cam(pos, look, fov, snap, wide)`: with `wide`, a narrow screen stands back until that half-width fits. Used by rings, dive, boards, forge.
- **Cut the oil lines:** the camera stood above the cellar's low roof and saw nothing. It is now under the roof (wider angle on narrow screens), the cellar is lit, the lines are bright oil, the lamp throws a pool, a ring marks the line you chose.
- **Lost child (rings at night):** lit, brighter walls and line.
- **Dive:** a line at your depth and a ring round the vessel that closes as you hold level; you follow the vessel sideways on your own (rate 2.4, was 0.6, which made the catch mostly luck); depth tolerance 0.1 (was 0.075); shorter prompt.
- **Boards:** on upright screens the track is 6 across with 13vw squares and the tiger board has 16.5vw squares. The board's `.track` no longer inherits the 2D race's fixed height (it was clipping rows). Chaupar's track is 24 (was 36) with quicker turns.
- **Forge:** an anvil in front of you and the smith to the side (a shielded soldier used to stand in the way).
- **Path test (shared content, differs from the 2D game):** `a2_pathtest` has no `back`: failing the second chance costs what it costs but no longer strikes the path out and sends you back to choose again. Golden lives re-recorded.
- **Not changed:** fights for an archer in Acts III–V already exist (kings at the swayamvara, Jayadratha, the Gandharvas, the cattle raid, bandits) and are marked on their choices; the scripted life missed them by choosing at random.

## Full-life replays, second round (12 Nov)

Two lives from birth (to the war, and to 42) and two ready-made war lives (to their deaths on day 1 and day 12), a frame every 40 s on a phone screen. Found and fixed:

- **The burning house (escape) drew nothing:** it is looked down on from above but was built under the cellar's roof. Halls take `open: true` (no roof); the escape uses it, is lit, has a tunnel arrow, rings on the tunnel and the sleepers, a camera that follows on narrow screens, and its own how-to (`U.HOWTO3D`), since the story's how-to describes the 2D grid.
- Fight titles wrap to two lines on phones and sit below the status line; the steady-hand test stands back on narrow screens.
- Known and left: the strip above the cellar's roof in "Cut the oil lines" is still black; "Carry earth from the tunnel" plays in a daylight corridor though the story says night.

## A hero modelled in Blender (12 Nov)

Bhima is now a Blender-built model (`tools/blender/bhima.py` -> `js/g3/models/hero.js`, loaded by `js/g3/model.js`), skinned to
the same joints the fight poses turn, so every move works unchanged. Parts and colour roles let one model change dress and
build from the look data: youth (lean, no moustache), prince (crown, upper cloth, gold), forest (matted hair, beard, hide),
war (cuirass). See `tools/blender/README.md`. Everyone else is still code-built.

## Five Pandavas, the dhoti, and a mace-life replay (Nov 12)

- All five Pandavas are now Blender-built (`tools/blender/heroes.py` → `js/g3/models/hero_<name>.js`), each with his own build, face, crown and dress by act. The dhoti is a wrapped cloth with folds round each leg, not a skirt. Mace wind-ups start above the head with a bent elbow.
- An art brief for the reference pictures of every character, age and attire is in `docs/brief/`.
- Replay of a mace life (141 frames, one every 30 s) found: the modelled Pandavas appear in few scenes of an ordinary life (the player and soldiers are still the old puppets); the top view in pillared halls was black on an upright phone (camera above the roof) — the roof is now one-sided; the "With you" opening shot stood inside a spread company — it now stands clear.

## The cast from the artist's sheets, and the surroundings (Nov 12, later)

**The sheets.** The artist delivered 181 reference pictures against `docs/brief/`: all 160 asked for, 20 detail sheets and one extra. The review, and what the brief itself left out, is in `docs/Art_Sheet_Review.md`. The sheets are not in the repository.

**The cast.** `tools/blender/cast.py` builds one character at one age from `tools/blender/cast_specs.py`; `python3 tools/blender/build_cast.py` builds all of them into `js/g3/models/m_<name>_<age>.js` (79 models, about 37 MB) and lists them in `index.html`.
- A spec is a frame (width, girth, limbs, how much muscle shows), a face, skin and hair, and a set of **looks**. A look names the parts shown and the colours of the cloth: home, court, student, forest, disguise, war, mourning, as the sheets have them.
- The parts are fitted to that body by casting onto its surface: three lengths of lower cloth with straight hems and pleated falls, sash, girdle and panel, the rolled waist of plain people, upper cloths (wrapped, hung from one shoulder), hide, breast-band, veil, blindfold, cuirass with trim and boss, shoulder plates, forearm and shin guards, crowns (tiered, diadem), helmet, turban, matted hair, plait, knot, unbound hair, four beards, gold.
- In the game `js/g3/model.js` picks the model by age (the nearest age drawn) and the look by the hour: what the figure asks for (a disguise); `G.lookHint` ("war" on a field where companies meet, and in Act VI); the forest in deer-skins; the student's cloth in Act II; else court or home. Height and frame come from the model; a modelled head is nearer life size (about seven heads tall when grown).
- The player is modelled too (`player_m`, `player_f`, four ages, four looks). The rank and file and the villagers are one model each, dyed in the wearer's colour (`sided`). People the brief left out wear the nearest model; gandharvas, rakshasas, nagas and yakshas are still the code-built figures.
- Differences from the sheets, on purpose: Karna at war has no ear-rings; Draupadi is darker than drawn and her hair is unbound in disguise (both as the brief asked).
- All models are fetched before the game opens (owner, 12 November: a slow start is acceptable; fights must not begin with the plainer figures). `index.html` lists them in `window.K_MODELS` and a small script at the top of the page fetches every one behind a curtain with a progress bar; the game underneath is inert until they are in. A file that fails is tried three times and then let go (its people are drawn by code); after 25 seconds a button offers to begin without waiting, and the files go on arriving. No WebGL: nothing is fetched. The two-part build sends the models as about a dozen files of 3 MB (`m1.js`..) so the bar moves, and the story's files as one `content.js`. Paintings, clips and music still load as each scene needs them.
- Known gaps: faces are simple and alike; cloth has no woven pattern; armour is a plain shell with bands; the squads behind a leader are still the plain code-built figures; hands do not close on a haft.

**The surroundings, all seven.**
- Horses and elephants: `tools/blender/props.py` → `js/g3/models/p_horse.js`, `p_elephant.js`, after the artist's sheets; `G.horse` and `G.elephant` use them (legs and trunk swing as before) and fall back to the code-built beasts until the files arrive. Chariots take the new horses.
- Boundaries (`buildEdge` in `js/ui/battle/view.js`) follow the place: a painted line and lamps in a hall; bank, trodden lime and onlookers round a yard; on a battlefield the two hosts standing off in their colours, wrecks and wheel ruts; a wattle fence, pots, a rick and neighbours in a village; stones, brush and grass in wild country.
- Palaces (`hall` in `js/g3/sets.js`): carved pillars, an arcade of cusped arches, pierced-stone windows with shafts of light, a beamed roof, a great arch and a gold sun behind the dais, a courtyard in the sun past the open end. What hangs overhead is hidden when the view is from above the roof.
- Mountains: two ranges between the built ground and the painted horizon (`G.ridges`), in the distance's own colours, so they move against the picture as the view turns.
- Ground, rocks and trees: stones with broken faces in clusters, trees with forking boles and masses of leaf, grass tufts.

## Surfaces: what things are made of (Nov 12, evening)

Asked for: cloth, skin, chariots, weapons and armour to look of ancient India in colour, pattern and texture; Bhishma's chariot put right; and the story's choices (home's colour, gender, age) carried into the 3D fights.

**How it is drawn.** `js/g3/surf.js` is one shader added to the figures' and the props' materials. Every vertex names a surface, a second colour for its figure, and a border (colour, width, distance from the cloth's edge). The figure is computed in the cloth's own space (a body's rest pose wrapped round its axis; a board's face or a pole's length for built things), so it stays put as the body moves and nothing is fetched: no texture files. Far away each figure fades to its mean colour, so nothing shimmers. `?nosurf=1` on the address shows the old flat colours for comparison.
- Cloth: hand-loomed cotton, silk with a soft sheen, bands, pinstripes, checks, small woven flowers (buti), tie-dye rings (bandhani), ikat chevrons, gold-thread brocade, bark cloth.
- Borders: two dyed lines (working people, soldiers), a broad dyed band with gold lines and flowers (a prince's everyday cloth), gold-thread brocade (court), temple teeth, a gold edge on plate. A narrow piece (a pleat, a sash) gets a border a third of its half-width.
- Armour and metal: overlapping scales edged in gold, lamellar plates with lacing, quilted leather with bronze studs, plate, worked gold (darker, with a coloured highlight), hammered iron, a blade's bright edge.
- The rest: leather with studs, wood grain, cane lattice, hair in strands, spotted deerskin, rudraksha beads, painted rings, a gold sun and a lotus for panels and shields.
- Skin takes a soft edge-light and, where the sun's light ends, the warm red of light passing through it.

**Who wears what** (`js/g3/dress.js`) is read from each model's look, after the artist's sheets: undyed cotton with two madder lines for working people and soldiers; dyed silk with broad gold borders at court, gold tissue with woven flowers for a king's upper cloth; scale coats edged in gold for the heroes, lamellar for the allied kings, quilted and studded leather for the rank and file; bark and deerskin in the forest; plain white with no border in mourning.

**Form.** When a model is first worn, `cavity` in `js/g3/model.js` measures how hollow or proud the surface is at each point and deepens the colour in the hollows (between muscles, in folds, under a rim), as a painter would. `edges` finds each cloth's open edge so borders follow hems and pleats.

**The chariot** (`G.chariot`) is rebuilt to the artist's "War chariot with team of four": a framed timber car, panels in the owner's host colour with a gold sun and gilt edge, cane lattice in the rear bays, gilt caps and bosses, a quiver and a cased bow at the front posts, twelve-spoked wheels shod and studded with iron. The royal parasol is now a white dome on its own gilt staff behind the rider, rim at 3.3 m: clear of Bhishma's head (it used to sit at face height). The "Against you" shot of a chariot warrior is now taken from the flank he is turned toward, never from behind him or among his horses.

**Weapons.** Swords have a broad swelling blade with a bright edge, a gilt guard and a bound grip; the mace is dark flanged iron bound in gold; bows are bound with red lac at every span; spears are bamboo bound at the joints; shields are painted in rings of the bearer's host colour with an iron or gilt boss.

**Beasts.** Coats have a groomed sheen, manes are stranded, harness is studded leather, and saddle-cloths are silk with gold flowers inside a brocade border.

**Your own figure** now wears the story's choices: your skin, your home's colour on the lower cloth and its second colour on borders and sash (the same palette the 2D puppet wears), as a man or a woman, at each of the four ages. In the forest years the cloth is bark and only the sash keeps the colour.

**A fault found on the way.** A model file that arrived before the 3D engine's script had run was thrown away when the engine started (it replaced `K.G3` instead of adding to it), so its people fell back to the plain code-built figures. Most likely on a second visit, when the files come from the phone's cache at once. Fixed in `js/g3/core.js`.

## Three rounds of review (Nov 12, night)

Asked for: a full review of every asset (`docs/Asset_Review.md`), then three rounds of two played lives (archer and mace, a frame every 30 seconds), issues flagged, game-art references consulted, assets improved.

**Round 1** (lives from birth: a woman of Panchala with the mace, a man of Matsya with the bow).
- Seen: shoulder plates were dark balls; a man's upper cloth hung like a board; the watchers round a ring were pegs tinted head to foot; the opening dream showed the man's figure in the test harness. (Corrected 12 Nov: that was the harness, which started the dream without a life made. In the game the land, the name and "she" or "he" are all chosen before the dream opens, and the dream's figure wears them: the owner pointed this out.)
- Reference: write-ups of Raji: An Ancient Epic (motifs as stamps, occlusion and curvature to push form, little micro-detail) and of hand-painted stylised assets (gradients on flat colour, warm light and cool shadow, a rim to lift figures off the ground).
- Changed: hollows deepened and ridges lifted on every model; a top-to-bottom gradient on figures; dyes toned toward vegetable colours; shoulder plates take the coat's scales; crowds redrawn as people (legs, a wrapped cloth, a bare trunk, an upper cloth, arms, a knotted head) and only their cloth takes the dye.

**Round 2** (lives from the eve of the war: a Pandava mace-fighter, a Kaurava archer).
- Remodelled in Blender (`tools/blender/cast.py`, all 79 rebuilt): shoulder plates are three lapped plates; a skirt of scales hangs from the belt over the cloth (as on Bhishma's sheet) and the hoops round the coat are two slim bands; a plain man's upper cloth now crosses the chest from the left shoulder to the right hip with its end behind.
- Built things take surfaces: mud walls and thatch on huts, lime plaster and timber on houses, dressed stone in courses on walls, towers, gates, plinths, steps and wells, carved bands on pillars and lintels, striped canvas on tents and awnings, a brocade seat and a gilt sun on thrones, painted clay pots.
- Reference: accounts of elephants and chariots in the epic and on the Sanchi reliefs (neck ropes and bells, rugs, banners; riders in threes).

**Round 3** (lives from Act V: a mace-fighter and a woman archer, the game's own fighter playing the battles so that each life got further).
- Seen: a night ambush was near black; the kneeling figure at the fire test and the carved pillar beside her read well; the board test is unchanged.
- Reference: notes on readable characters (brightest values at chest and weapon, legs darker, one bold block of colour, fine pattern dropped at a distance; shapes that tell roles apart).
- Changed: a brighter moon and fill at night; an edge of light on every figure; arrows are bound reed with iron heads; the howdah carries a pennon and a quiver and its timber is carved and gilt; your amulet, manuscript, debt purse and eye patch show on your 3D figure; a phone that stays slow at the smallest drawing size now gives up its shadows.

**The play harness** (scratch, not in the repository) now waits for the cast to load, can start from any saved life, can let the game's fighter play the battles at a faster clock, holds the drawing quality fixed and takes each frame sharp. On the software renderer here a war field takes about a second a frame, so a round of two lives covers one act, not a whole life.

**Checked.** rules (34, seven of them the six orders: `tests/rules3d.js`), content and the two-part build (400 lives), fight balance (74 fights within their bands), Hindi strings, the 3D smoke tests (fight, phone, tests), both built parts opened and fought. **Not checked:** anything on a real phone (frame rate, the look of the surfaces on a real GPU, the shadow fallback); Hindi screens were not looked at again; music and film were not judged.

## Orders to those beside you, and the shoulder joint (Nov 12, late)

**Six orders** (asked for by the owner: follow me, guard me, stick together and attack, stick together and defend, spread across and attack, spread across and defend). The Orders button (or O) opens a card of the six with a line on what each does; the fight waits while you choose; 1 to 6 choose from the keys. The button then shows the order in force.
- *Follow me*: they keep at your heels in two files and strike only what comes within their own reach.
- *Guard me*: they ring you and take on whoever comes at you (the old "With me").
- *Stick together and attack*: all of them on the one foe you face (your locked foe, else the nearest to you), from either side of you.
- *Stick together and defend*: a wall of shields, shoulder to shoulder, where you stood when you gave the order, facing where the enemy lay; they do not leave it; archers shoot from it.
- *Spread across and attack*: each takes the nearest foe that no comrade has taken.
- *Spread across and defend*: a line strung across the field through where you stood; each goes to meet what comes into his own ground (about four metres) and returns to his post.
- Rules: `allyAct` in `js/ui/battle/sim.js` (`R.orders.form`: follow, tight, wall, spread, line; guard is the absence of a form), over the older three-way press (`friend`, `soldiers`) which still sets how hard they hit and whether their shields count. A soldier of the line who has his own man in front of him finishes that first. A fight starts as before, with no form, so the balance bands did not move. The card: `cycleOrders` in `js/ui/battle/view.js`, `.b-orders` in `css/battle3d.css`. Hindi for all of it is in `js/i18n/hi3d.js`.
- Not done: the turn-based fallback (no WebGL) keeps the older three orders.

**The shoulder joint** (owner: "bulk up the shoulder joint, there seems to be a hole in that area"). When an arm was raised the skin pinched at the joint and left a hollow. Each model now has a ball of the arm's own girth set on the joint and carried by the arm, so the shoulder is whole in every pose (`tools/blender/cast.py`, all 79 rebuilt). On the same pass a band worn round the trunk (the upper cloth, a shawl, a baldric, the sacred thread) is carried by the trunk and hips alone: a swinging arm had been dragging its near end out into a streak.

**Cloth never under the skin** (owner: "the clothes should never go under the skin; can you ensure that"). Made a rule of the models, not a fix per pose: the skin a garment covers is not drawn while that garment is worn, so no pose can push it through. When a model is first worn, `covers` in `js/g3/model.js` marks each point of the body that is inside a skirt (a lower cloth or the skirt of scales: all of the hips and legs from a little above the hem to the waist, never an arm hanging beside them) or that has a close-fitting piece just outside it along its own normal (a coat, a breast-band, a sash, a girdle, the band of an upper cloth or shawl, a hide, a guard on forearm or shin). `G.modelSkin` then leaves out every triangle of the body whose three points are covered by pieces of the look being worn. Looked at in the fights' poses (ready, cut, overhead blow, bow drawn, guard) from front, back and above, on bare-chested, armoured and draped figures: no skin through cloth. What it does not cover: a free-hanging end (a pleat, a shawl's tail) can still be crossed by a moving arm or knee, which is cloth against a limb rather than skin through cloth; and cloth can still fold into cloth.

## Lighter figures, a fist on the haft, a dark line (Nov 12, the figure plan: first stage)

The owner asked for the figures to be compared with those of popular games (`docs/Figure_Comparison.md`) and then for the plan that came out of it to be carried out. This is its first stage: the two items that needed no new skeleton.

**Lighter figures.** Every model was rebuilt with a thinner body, head and hair and fewer faces round each bead, band and ring (`tools/blender/cast.py`: the thinning after the body is made, `prim`, `ring`, `fall`, the ribbons). A dressed figure is now 10,700 to 19,500 triangles, 14,500 on average; it was 18,000 to 34,200, 24,400 on average. The 79 model files are 23.6 MB, from 40.1 MB. Side by side in close shots the two cannot be told apart. The rank and file (`lod` 0.7 in `cast_specs.py`) are thinner again. The coat's arm-holes are cut clean (`shell(..., sides=)`) so the lighter mesh does not leave them ragged.
- A correction: the comparison first gave 28,500 to 49,900 triangles a figure. That count added the body, head and hands twice. The true figures are the ones above.
- What a war field is made of, measured (`e_day1`, one view, about a million triangles a frame with shadows): the far ranks 296,000, chariots, horses, elephants and camp 270,000, the modelled people 45,000 (four of them), the squads 25,000. So the modelled people were never the weight of a war field; they are the weight of a duel. The far blocks of a host (150 men and more, which throw no shadow) now use a man of 222 triangles in place of 500 (`simple("far")` in `js/g3/kit.js`).

**A fist on the haft.** The hands were modelled half closed but the weapon was hung three centimetres below the wrist, beside the fist. Now each hand is closed round a haft: the fingers go down its outer side, under it and up the inner side, the thumb over the top (`hand` in `cast.py`; `HAFT` is the radius of the hollow). Each model carries the two points where a haft lies (`grip`, left then right), the game turns them into each wrist's own space (`f.gripL`, `f.gripR` in `js/g3/model.js`) and `setItem` in `js/g3/figure.js` sets the weapon there. The bow's bound grip had been modelled seven centimetres off the stave; it is on the stave now, and the stave's middle lies in the bow hand.
- Hands are 14% larger than life (`HANDK`) and a held weapon 12% larger, as game figures have them: they are what must read from above.

**A dark line round each figure** (`G.outline` in `js/g3/model.js`). The same mesh drawn again, back faces only, pushed out along its normals by a width fixed on the screen (a pixel and a half on a phone), in the brown-black of the paintings' line. It lifts a figure off the ground it stands on. It costs one more drawing of each modelled person, so the lowest quality setting goes without it, and a phone that stays slow drops it together with the shadows. `?noline=1` turns it off for comparing. (One trap, noted for whoever touches it: three.js turns the normal round for a material that draws back faces, so the push uses the untouched normal.)

**Not in this stage** (the rest of the plan): the fuller skeleton and base body, builds that tell heroes apart and an army mark, faces from the portraits with a blink and expressions, weight in the blows and things that swing. Known and still open: a bent knee can push the lower cloth through the pleated panel hanging in front of it (cloth against cloth).

## The fuller skeleton (Nov 12, the figure plan: second stage, first half)

The poses still turn thirteen joints. Each model now brings 28 more, and the game drives them from those thirteen every frame (`G.rigDrive` in `js/g3/model.js`; the model's `rig` block says where each joint is and what it hangs from). No pose table was changed.

- **Bends keep their girth.** At the waist, neck, and each shoulder, elbow, hip and knee there is a joint that turns half as far as the joint itself. Skin that used to be shared between two joints (and so caved in at a bend) is held by the half-way joint instead. This is done when a model is written out (`PAIRS` in `tools/blender/cast.py`), for cloth as well as skin. Each point is now held by up to four joints (two before).
- **Collars.** The shoulder lifts as the arm rises past shoulder height and swings forward as it reaches; the arm's own turn is corrected so every pose points the arm where it did.
- **Feet.** A foot stays flat while the shin leans; on a raised heel it tips until the ball of the foot is down; well off the ground it hangs. Before, the foot was one piece with the shin and dug its toes in.
- **Hands open.** Two joints across the four fingers. Closed on a weapon, bow or in a fist stance; eased open when the hand is empty.
- **Faces.** A jaw, a mouth, eyelids and two brows. Everyone blinks. Three faces: set, shouting (through a strike) and pained (hit, down); eyes shut when asleep or fallen. `f.mood` forces one.
- **Cloth and hair swing.** The front pleats and panel, sash ends, the upper cloth's ends front and back, a veil, long hair, braids and locks now hang from the joints the game already swung for the older figures (`sF`, `sS`, `sB`, `sH`, and a new `sC` down the chest). The pleats are carried forward by a rising thigh, so a knee no longer comes through them.
- **Spikes at the hip, found on the way.** The automatic weights let a hand hanging by the thigh pull a little on the thigh's skin and on the cloth taken from it, so raising the arm drew a white spike out of the lower cloth. Skin is now held by its own limb only. A second old slip: shoulder plates and brows were assigned left or right by a sum that came to nothing; they now go by where the piece is.

**Not checked:** anything on a real phone; the swing of cloth and hair was looked at in stills, not judged in motion at speed.

**Play-through photos, all three views** (owner: "when you are running real time play, take photos from all 3 views"). The play harness now photographs every fight frame three times, from above, from behind and from your own eyes, by pressing the game's own view button, and puts the view back. First run on the new figures (a war life, Bhishma's arrows): no fault seen in any of the three.

## Builds, portraits' heads, an army's crest, blows from the ground up (Nov 12, the figure plan: last stage)

- **Builds pushed apart** (`tools/blender/cast_specs.py`, the block at the end): Bhima square and huge, Arjuna a lean wedge, Yudhishthira slight, Karna tall and narrow, Duryodhana a barrel, Dushasana heavy, and smaller changes to Ashwatthama, Satyaki, Krishna, Balarama, Jayadratha.
- **Heads set against the 2D portraits**, each portrait laid beside its 3D head: Karna and Duryodhana are clean-shaven, Yudhishthira bearded, Arjuna has his moustache, Kripa is shaven with short hair, Ugra's head is shaved to its topknot, Mauni's hair is dark and long, Vidura is lighter and wears a bun, Dhrishtadyumna a topknot. Everyone but Bhima has a moustache that lies along the lip; the swept-up wrestler's moustache is his alone. This is hair, beard and colouring; the bones of the faces are still a dozen types, not a likeness.
- **An army's crest.** The rank and file wear a crest of dyed horsehair along the top of the head, in their host's colour, to be read from above.
- **Blows from the ground up** (`js/g3/figure.js`): in the snap of a strike the hips turn first, the trunk follows, and the arm is dragged behind and whips through last; on landing the body takes the weight for a moment. Everything still arrives on the same instant, so when a blow lands, and the balance, did not move.
- **Found by the three-view photos:** from your own eyes, a comrade at your shoulder filled the screen with his helmet. Friends within 1.7 m and foes within 0.9 m are now not drawn in that view.

**Not checked:** a real phone; the new strike timing was not watched in motion at full speed.

## Divine weapons in three beats (Nov 12, late)

**Divine weapons** (owner: show the invocation and ask for a code, a pattern joined on the screen; show the impact and the panic; show a champion's counter. His rulings: men who flee count as beaten, up to a cap; the counter is a contest you play; a poor invocation hits softer, a clean one no harder than before).
- *Invocation.* The weapon's button no longer fires it. The fight runs at a fifth of its speed, the screen darkens, and the weapon's own figure appears: fire a triangle pointing up, water one pointing down, wind a spiral, sleep a five-pointed lotus, the serpent a winding line, Indra's a bolt. Join its numbered points in one stroke (lift the finger and it begins again), or press the numbers. Five seconds. Joined in the first half of that, it lands as it always did; slower, it lands softer, down to half; not joined, "the mantra broke", the weapon rests six seconds and no use is spent. (`yantraOpen`, `invoke` in `js/ui/battle/view.js`; `astraQ`, `astraBreak` in `js/ui/battle/sim.js`.) A setting `easyMantra` speaks it for you at 0.7 force (not yet on the settings screen).
- *Panic.* When a divine weapon lands, up to two common soldiers, never more than half of those standing, never a captain, a named man or a chariot, throw down their shields and run off the field. They count as beaten and are not killed (`panic` in `sim.js`). One caught by the fire as he runs dies like any other.
- *The counter.* A champion's answer now shows: both figures shout, two beams rise and meet above the ground between you, and the figure returns with a white ring closing on it. Join it twice before the ring closes (three seconds) and a part of your weapon comes through: 8% of his health and a long stagger. Otherwise both are spent, as before. The game's own fighter never plays the contest, so the balance bands did not move (74 fights within them).
- Six rules tests cover it (`tests/rules3d.js`, section 10; 40 in all). Hindi for every new line.
- Not done: the story does not yet teach the figure when a teacher gives the weapon; a cursed mantra does not yet scramble its points; the far ranks do not draw back; the camera does not cut to the champion.

**Painted faces: tried and taken back.** The owner asked for a different way of building faces; the features were painted on a canvas worn by the head's skin in place of the modelled eyes, lids, brows and lips. He judged the earlier, modelled faces better and asked for the change to be reverted, and it was the same evening: the heads, the 41-joint skeleton with its lid, brow and mouth joints, and all 79 models are as they were before it. The painted version is in the history at commit 035d689 (`js/g3/face.js`) should it be wanted as a starting point. What is wrong with the faces is still open, and not yet pinned down.

## Their plan, a turn in the fight, and soldiers who obey (Nov 12, night)

The owner: fights are too samey; they should change with the other side's tactics; "let the champion charge for once, and then you get to run and steal something, otherwise the game is lost"; morale, facing and flanks, different goals and duels should all factor in. His rulings: failing a task loses the fight only in the big story fights; the plan is read, not announced, and the opening must show how they stand; start with three plans and three turns on the war days.

- **Three plans** (`planFor`, `roleStep` in `js/ui/battle/sim.js`), one chosen for each war fight that has three or more foot on the other side (their named men and the men of their line): *the wall* (four abreast behind locked shields, coming on at a walk), *the pincer* (one hangs back in front of you, two go wide and come in behind), *the charge* (their champion, on foot or in his car, comes straight for you while his men hold back in two files).
- **The opening shows it.** The last shot before a fight with a plan is the whole field from above and behind your own line ("How they stand"). Nothing names the plan.
- **One turn in each such fight**, never in the first nine seconds, with a horn and a line of text:
  - the wall loses two men (or thirty seconds pass): *their standard stands open behind them.* Reach it and stand there a breath and a half within eighteen seconds and their host breaks and runs; too slow and their common men get a quarter of their strength back.
  - the pincer shuts: *one of them breaks for the comrade beside you.* He is marked for you; strike him within twelve seconds, or your man is cut down.
  - the charge is met: *the champion calls you out.* Take it and both sides stand off in a ring until one of you falls; beat him and his men run. Refuse and your own men hang back six seconds and their spirit rises.
- **Failing a task**: in a fight against one of the epic's named men the fight is lost (with the usual one more try). In any other it costs you: the next war fight is begun at 88% of your health.
- **Morale** ("Their spirit", a bar under the goal): falls as their men fall, more for the champion, when a divine weapon lands and when a task is done; rises when one is failed or a duel refused. At nothing they break and run and count as beaten. Below a third, their common men hesitate before each blow.
- **Facing and flanks** (in fights with a plan): a blow at the front of a standing wall does half unless it is a heavy one; a blow from behind any man does 30% more and cannot be caught on his shield.
- **The game's own fighter** runs for the standard and takes the duel when above half health, so the balance tests exercise all of it: 74 fights still within their bands.
- **Soldiers obey** (owner: "make the soldiers fighting for me respond to the orders correctly; I felt they were not doing that"). He was right. The men of your line, who are most of the soldiers on a war field, ignored every order as long as any man of the enemy line stood, which is nearly always. Now, until you give an order they fight the man in front of them as before; once you have given one, the whole line obeys it: at your heels, in a ring round you, shoulder to shoulder, strung across the field, all on one foe, or each to his own.
- Not done: the far ranks of the host still stand as scenery; only war fights have plans; the three turns are fixed to the three plans; the turn-based fallback has none of this. **Not checked:** on a real phone; the duel card and the standard were looked at in stills from the game's own fighter playing, not played by hand.

**The tasks made the epic's own** (owner: "instead of standard, can we make it something more relevant to Mahabharata"; he chose the banner, the charioteer and the wheel-guards). Where the other side has a great car on the field, as the war days do:
- *The banner (dhvaja).* The wall broken, the task is to cut down the banner that flies over his car: any blow or arrow of yours that lands on the car within eighteen seconds. It falls, and their host breaks.
- *The wheel-guards (chakra-raksha).* Two of his foot stand at his wheels. While either is beside the car, a blow at it from the front or side does 60%. They fight whoever comes within four metres of it.
- *The charioteer (sarathi).* In the pincer it is the wheel-guards who are sent round you, so when it shuts the car is open: get to it and stay beside it for a second within fifteen. The driver is down, the car all but stops, its warrior reels, and their spirit drops by 40. Too slow, and the car rides your comrade down.
- A fight with no car keeps the earlier tasks (a standard on a pole; the man who breaks for your comrade). Single combat is unchanged.

**The line under Bhishma, remade** (owner: "incorporate this in Bhishma's attack, hold the line; let the line fall the first few times and have a battle with Bhishma which he is able to defend or cross through"). The ninth day's fight (`bh_line9`, `plan: "bhishma"`; `bhishmaPlan` in `js/ui/battle/sim.js`) was five rounds of standing under arrows. In 3D it is now:
- *Three passes.* His car drives along your front three times, loosing as it goes. At the end of each pass two men of your line fall, whatever you do. After the third there is no line in front of you.
- *Bar his way.* A horn, and he turns his car at the gap where you stand, two wheel-guards beside him, and drives for the far side. Every blow or arrow of yours that lands on the car is at his banner. The first he turns aside. Each after it (one to a breath) checks the car and throws it back. Three checks and he turns away down the line: you held. Or get beside the car with his wheel-guards down or drawn off and stay a second: your hand is on the charioteer's rein, and he turns away.
- *Or he crosses.* If the car gets past you the line is broken, with the story's own words for that and the usual one more try.
- He is never beaten here: he leaves standing either way, as the epic requires before the tenth day. A divine weapon thrown at him still meets his counter in the air.
- The third day's "Bhishma's arrows" is unchanged: there you can only stand and live.
- The game's own fighter bars him in about half a minute; left alone he crosses at about three quarters. Still inside the fight's balance band. Not played by hand.


## Two played lives, reviewed (12 November, night)

Two lives were played through the real screens by the play script for an hour each, a screenshot every 35 seconds and the two other views photographed in every fight. On the software renderer with two games running the fights ran at about one frame a second, so the hour covered little: the war life reached day 10 (five fights, one test), and the new life stopped at the first test (the mango throw), which the script could not pass.

Found and fixed:
- **Through your eyes showed the inside of your own head.** The view hid the head joint, but a modelled figure's head is skin on a bone, not a child of that joint. The joint is now shrunk to nothing in that view, and your own shield (which stood across the screen like a wall) is hidden with it.
- **"Take their standard"** was still the wording when their host has no car. It is their banner everywhere now.
- **"Their spirit" sat on the bottom edge of the goal card** when the goal ran to three lines. Moved down.
- **Chariots turned like a cart on a pivot** (owner). The pole, yoke and traces now belong to the team, which swings about the pole's root: the horses lead a turn by up to half a radian and the car comes round after them, slowly when standing and faster at the run; the inner wheel all but stands and the horses step while turning on the spot (`G.steer`, kit.js).

Found and not fixed:
- Carrying Iravan to the river: the field is bright green with plain brown boxes though the text says dusk and a moon, and the player carries nobody.
- Under Bhishma, the field looked much darker in the last phase than in the first. Cause not found.
- The mango throw shows no way out for a player who cannot hit.
- Speed: a war fight is about 900,000 triangles and 620 draw calls a frame. On the software renderer a frame of the first war fight costs a quarter more than it did this morning before the figure work (outlines are about half of that), though the triangle count went down.

## Fight mode in 3D, the mango throw, the fair, Iravan's river (12 November, midnight)

- **"Just fight" was still 2D** (owner). Its ladder called the 2D bout directly; it now goes the way every story fight goes, and falls to 2D only where 3D cannot start. A 3D that will not start is asked for again at the next fight (three times) and the player is told once.
- **The mango throw is a sling pull** (owner: "like angry birds"). Five small fruit hang still; drag back anywhere, a line of dots shows the flight, let go to throw. Six pebbles, three fruit. A tap or Space throws at the nearest fruit with a child's aim. Only in 3D: the 2D game and the engine's own lives keep the old test (`trial.sling`).
- **The fair** already had stalls, a crowd and a rope ring, but from above only bare earth showed. The wrestling pit now has a lime ring, marigold, garlanded poles and strings of pennants.
- **Carrying Iravan** is at night now, and a man lies across your shoulders.
- The dark field late in the Bhishma fight was the edge of the arena, where the ground is darker. Not a fault.
- Rulings for what comes next: at Abhimanyu's last stand a Kaurava-side player may hold back (each step a task you may do or refuse); in Arjuna's place Krishna drives and you only shoot.

## Jointed beasts, a wind, arrows that stay, and the mesh checks (13 November, morning)

The owner asked for a review of every model and everything that moves. The review itself is `Moving_Parts.md`; these are the notes for whoever works on the code next.

- **Beasts are one skinned mesh each** (`skinned()` in `js/g3/kit.js`). A prop file lists its parts with a pivot each; `skinned` builds one mesh with a rigid bone for each part (`HORSE_J`, `ELE_J` say which part hangs from which). One draw for a beast instead of five. The old piece-by-piece `beast()` stays as the fallback for a prop file without shins.
- **Gaits** are a table (`GAITS`): for each gait, where each leg is in the stride, the share of the stride on the ground, the swing, the fold, and strides a second. `G.gallop(beast, t, speed)` keeps its own clock on the beast, eases speed, and picks walk, trot or gallop with a little stickiness so it does not flicker between two. `t` only sets one beast out of step with the next.
- **The lesser beasts** (`G.beast4("cow" | "deer" | "tiger" | "dog", colour)`, `G.cow(colour)`) use the horse's part names and so the horse's gaits. `KINDS` holds what differs: size, how much of its standing it grazes, whether it bounds, prowls or wags. `G.lie(beast, 1 | 0, dt)` lays one down and gets it up. Built by `tools/blender/props.py`; the helpers there are `legs4` (four legs from a few heights), `onto` (set an eye or an ear on the real surface), `spots`, and `band` (a stripe cut from a coat by two planes, its edge turned in to meet the coat).
- **Wind.** `Builder.windy(k, lf, fn)` marks what `fn` adds as bending in the wind; `Builder.leafy(fn)` inside it marks leaf, which also flutters. The mesh carries a `wind` value for each point and the shared materials (`G.mat.vc`, `vcFlat`, `vcDouble`, `surf`, `surfD`) move the point in the vertex shader on one clock, `G.windU`. A geometry without the value stands still. `G.mat.windDepth` makes the shadow follow. `G.tree`, `G.reeds` and `G.tuft` do all of this themselves.
- **Ranks and crowds** sway in the same way, in the crowd material's shader, from each man's own place.
- **Arrows.** In a fight, an arrow that arrives is handed to `stick()` in `js/ui/battle/view.js`: into the ground, or parented to the torso of the man it hit. `stuckFrame` shakes and later removes them; fourteen at most. `G.fx.arrow(a, b, secs, arc, done, stick, what)` gained the spin, the shake while stuck, and `what: "stone"`.
- **People.** The walk in `js/g3/figure.js` adds hip and shoulder turn, hip drop, a sideways shift (`f.latT`, eased into `f.latC`, applied to the hips' x), and a run that is not a fast walk. Standing adds a slow shift of weight.
- **Birds** over open country: `G.birds(n, rnd, colour)`, one mesh, added by `G.setStage` by day.
- **Hands.** `hand()` in `tools/blender/cast.py` has a bar inside each crease and a knuckle on the thumb.
- **The checks** are `tools/blender/skills/` (see its README). `cast.py` has a `qa` stage and `props.py` a `qa` word.
- **A rule learned four times over in this stretch:** never put a `//` comment in the middle of one of this code's long lines. It swallows the rest of the line. Use `/* */`.

## The story's cards in a fight, the wheel, a painting at a turn (13 November, morning)

Notes for whoever works on the code next. What the player gets is in `Gameplay_Ideas.md`, Part 9.

- **Cards the story puts in a fight** are `enc.asks3`, a list (`enc.order3`, the older single form, is read as a list of one). Each: when it comes (`round`, and `near` metres from `on`, a person, or `at: "wheel"`), who it is from (`from`: his portrait), `title`, `text`, the two answers `yes` and `no`, and optionally a `task` once taken: `"strike"` (a blow on `on` within `secs`), `"heave"` (stand at the wheel doing nothing else for `need` seconds within `secs`), or `null` (the answer is the whole of it; `end: "win"` ends the fight there). What you did is pushed to the life as `<flag>_obey`, `_miss` or `_refuse`. `cost: { yes: (S) => choice, no: … }` names the story choice whose marks stand under the answer (`K.choiceMarks`, `K.preview`); `peril` and `doom` add "Can cost your life" and a line of your own.
- **The card's event is `"ask"`.** It was `"order"`, which the view already used for a comrade striking at your word: with two cases of one name in a `switch` the second is never reached, so the card never showed in a browser and the question timed out as a refusal. The rules tests answer the question in the simulation and cannot see this. If a card of the story is ever silent again, look for a doubled `case` first.
- **The wheel** (`enc.wheel3: person`): `wheelSetup` in `sim.js` puts him at the wheel, `still` (he takes no turn) and, as a foe, `apart` (no blow is aimed at him) until a strike is taken up. `R.wheel` is where the wheel is and which way the car stands; the view (`wheelProps`) brings his own parked car there, tilted, with Shalya at the rail. `R.finale` holds the sim for 2.4 seconds at the end so that the last arrow is seen (`wheelEnd`).
- **A painting at a turn of a fight:** a beat with `art3` carries the key into its log row (`row.art`), and the view shows `plateCard`: the fight is paused, the painting and the line are shown, "Go on". The line is then not repeated as the banner. The image is fetched when the fight is built.
- **The leader's painted face** is on the intro's "Against you" shot: `enc.face3`, or the portrait of the leader's `person`.
- **`tests/content.js` knows `art3` and `face3`**, so a part that lacks one of those files fails the check.
- **The split build makes six bundles now** (`tools/split/build.js`): `k3d.js`, `content.js`, `engine.js`, `ui.js`, `part.js` and the page, beside the model files. When a part comes near 512 files the clips are the first to be left out, silently for the player; `tests/content.js` reports it ("split part Two lacks a file it shows"). Paintings not yet shown anywhere live in `art_stock/`, which is not published.
- **Publishing the two parts** is now two tools and no hand copying: `tools/split/pubdiff.py <split dir> <mirror dir> --apply` works out what to send, change and remove against a folder that mirrors what the host has, and `tools/split/check_parts.js <split dir> <mirror dir>` runs a fight on each part served from that mirror and checks that the newest Hindi shows in Hindi. Before this the combined Hindi file was being sent as `hi.js` while the page loads `js/i18n/hi.js`: the play links showed everything written after the evening of 12 November in English to a Hindi reader, until Version 43.
- **`tests/rules.js`** (the 2D game's rules) is part of the full check again. It had been left out since the conversion and one check in it had been failing since the loading curtain was added (`prefers-reduced-motion` in `index.html`).

## How bodies move (13 November, later)

Notes for whoever works on the code next. What the player gets, with the measured numbers, is in `Moving_Parts.md`, section 6.

- **Three kinds of motion in the fight rules** (`js/ui/battle/sim.js`, "How bodies move"; constants in `R3.PHYS`):
  - `walk(R, u, vx, vz, dt)`: a body on legs. Its own walking velocity `g.wx, g.wz` goes toward the velocity asked for at a rate its weight allows; `clocks()` runs it down when nothing was asked for that step (`g.walkN`). Every place that used to call `move()` with a step now calls `walk()` with a velocity.
  - `drive(R, u, mx, mz, pace, dt)`: a car or an elephant (`wheeled(u)`). It has a heading `g.ca` and a speed `g.cv`, moves only along the heading, turns no faster than `min(turn, cv / rmin + pivot)`, slows into a turn, looks ahead to the field's edge and turns along it, and stalls against what will not move. `g.a` is still where the archer on the car (or the elephant's head) is turned. `goTo()` picks legs or wheels.
  - `move()` itself now settles two bodies by weight: `weight(u)` times `brace(R, u, by)`, how hard that body is to move just now. `shove()` moves the lighter one; `jostle()` is a car or elephant throwing the other side's men. A pass at the end of `clocks()` eases apart bodies that ended up in each other.
- **Blows.** `knock()` throws and staggers; `nudge()` only moves. `hitFx()` throws the body of a man killed (`g.thrown`: 1, or 2 for a heavy blow). Friction on what was thrown is `PHYS.fric`.
- **The roll** covers its ground by `rollF(u)`, the share covered when the share `u` of its time has gone; the constants are `PHYS.rollTau` (the push-off) and `PHYS.rollEase` (how much it has slowed by the end).
- **Arrows** carry a height and an upward speed (`s.y`, `s.vy`, gravity `R3.FLY.g`). `aimAt()` leads the man by his walking velocity. A shot of your side strikes the first foe whose body it passes through (`topOf(u)` is how tall that is); `sure` widens the allowance on the man it was meant for. A foe's arrow keeps its lane and its old test, and has the height for the eye.
- **What the rules tell the view:** `g.lx, g.lz`, the ground a body's legs really covered in the step (metres a second). The view turns that into `f.vf, f.vs` (forward and leftward speed of each figure) and the figure's walk in `js/g3/figure.js` steps that way. Beasts take real metres a second as a last argument: `G.gallop(horse, t, speed, mps)`, `G.stomp(el, t, speed, mps)`, `G.roll(car, dist, t, speed, mps)`.
- **Falling things:** `G.fx.toss(obj, vel, spin, { r, flat, life })` in `js/g3/fx.js`: gravity, one bounce, friction, rest, then it shrinks away; sixteen at most. `dropArms()` in the view hands a falling man's weapon and shield to it. `F.arrow(a, b, secs, arc, …)` with `arc` left out flies the parabola its time gives it.
- **`f.drop(on, dir, { side, rate, twist })`** chooses how a figure goes down.
- **A warning for the fight bands:** anything that changes how bodies move changes who wins. After such a change run `node tests/fights.js 28 11` on the fights that moved before trusting a 12-run check: twelve runs is too few to tell 75% from 90%.

## Tests that are aimed, steered, fought and herded (13 November)

Four of the 3D game's tests no longer play as their 2D versions do. The 2D game's own tests (`U.games2D`, `js/ui/play.js`) are untouched, and so are the scenes: a scene still names a `game` and a `trial`, and reads back win, close or lose.

- **Archery** (`PLAY.aim` in `js/ui/tests3d/games.js`): a ring is dragged to where the arrow should fall; the arrow flies at 21 m/s, a side wind is drawn for each shot, and a hit is decided when the arrow arrives. `U._aimLead()` looses a led shot for the checks.
- **The race** (`js/ui/tests3d/race.js`): `U.ROAD` holds the road and how each vehicle handles (`HAND.chariot`, `.boat`, `.foot`); `U.raceSetup3(t, power)` is the lane race's setup with the gaps opened for steering; `R = U.raceRules3(o, rng, vehicle)`, `R.step(dt, steer)` with steer from -1 to 1, `R.whip()`, `R.shoot()`. The endings are the lane race's (`U.RACE`). The view hands `U._race = { R, o, steer(v) }` to the checks. `node tests/race3_balance.js` sets the lane race beside it for four skills of driver.
- **A bout** (`sparOf` and `sparBout` in `js/ui/tests3d/frame.js`, `K.sparEncounter` in `js/engine/combat.js`): a `push` or `rhythm` test whose `trial.foe` is a named person (`U.personByName`) and whose `face` is not a post or a gate becomes the encounter `x_spar`. `trial.arm` may name what is fought with; otherwise wooden swords at a drill or where the choice speaks of a sword, practice maces for a rhythm test or where it speaks of a mace, else bare hands. `trial.spar: false` keeps a test a test (the practice ground sets it). The encounter is `bout`, not `lethal`, `quick` (no Fight card: the test's Begin was the word), `once` (no second try, even on a fighter's road) and carries `arm`, which `RT.weaponOf` and the player's abilities obey. The life is copied before the bout and put back in place after it.
- **The herd** (`js/ui/tests3d/herd.js`): `U.HERD` holds the field and the cattle's distances and paces; `R = U.herdRules({ need, lose, secs, calm }, rng)`, `R.step(dt, hx, hz, hv)` takes the herder's place and pace and returns what happened (`across`, `lost`, `spook`, `end`); `U.herdBot(R, hx, hz)` is a herder who knows the work. `PLAY.herd` is the cattle unless `trial.theme` is `"fire"`, where it is the line of families (`lineOut`). Hooks for the checks: `U._herd = { R, go(x, z, v), at() }` and `U._line = { folk, haz, go(x, z), at(), state() }`.
- **What the card says.** `U.HOWTO3D[kind]` may be a function of the trial; it returns the 3D game's own lines, or nothing. A scene's `rules` line is still shown above them unless it tells the 2D game's way of playing (`stale` in `frame.js`: lanes, a line that falls in behind).
- **Checks:** `node tests/tests3d_rules.js` (the race's and the herd's rules, no page), section 15 of `tests/rules3d.js` (the bout). One fault to remember: a 3D test is opened with `U.games[kind](box, done, c)` and reads its options from `c.trial`, not from `c`. A check that passes them as `c` runs the plain test every time and reports as if it had varied them.
