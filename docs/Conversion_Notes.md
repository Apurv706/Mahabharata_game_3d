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
frames, not against film or by a fighter. Several 3D tests are simpler than their 2D versions (escape, herd,
formation, array; the board and dice games are a board drawn over the 3D hall).
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
