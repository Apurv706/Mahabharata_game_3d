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

Faults found on the way, all fixed:
- The fight's HUD layer swallowed every tap and click meant for the field: on a phone the thumb stick never moved the
  fighter, and a click never struck. (Found when the opening shots would not move on at a tap.)
- On a device without WebGL nine kinds of test crashed: the 3D test frame had replaced the 2D game's own frame, and
  the fallback called itself for ever. (Found by the 2D suite's content check.)
- Archers aimed some fifty degrees off their mark: the bow arm followed the turned chest, not the target.

## Checked, and not
Checked: the quick tier of `tests/run.js` on this build, all passing: the 2D game's rules (530 checks), 500 random
lives, 16 golden lives exactly as the 2D game recorded them, its balance bands, content, bug and save checks; the 3D
fights' rules (27 checks); all 72 fights by the bot on seven paths, 14 runs each, no errors; and in headless Chromium
with software WebGL a battle played from its opening shots to its outcome on a desktop and, with real touches, on a
phone; the dream; all 23 kinds of test opening in 3D and ending; and the 2D screens with 3D switched off.

Not checked: real devices and GPUs; a person playing a fight by hand to its end in any view; frame rate with the line
on a phone; gamepad; sound; the full test tier (playthroughs, layout on every device, visual baselines), whose
baselines will show the puppets' corrected colours. The moves were checked against written technique from still
frames, not against film or by a fighter. Several 3D tests are simpler than their 2D versions (escape, herd,
formation, array; the board and dice games are a board drawn over the 3D hall).
Known leftovers: the 2D menu's "Fights: turn-based" switch no longer changes anything while 3D is on.
