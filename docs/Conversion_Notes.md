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
