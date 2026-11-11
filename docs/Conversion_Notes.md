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

## Checked, and not
Checked: `npm test` (72 fights, 0 errors, bot win rate 94%); fights opened from the 2D game in headless Chrome,
desktop and phone size, to a settled outcome. Not checked: real devices and GPUs, a person playing fights by hand at
length, gamepad, sound. The 2D game's own regression tests were not carried over or re-run against this build.
Tests in 3D (`js/ui/tests3d`): all 23 kinds open and take input without errors in headless Chrome; none has been
played to its end by a person, and several are simpler than their 2D versions (escape, herd, formation, array; the
board and dice games are a board drawn over the 3D hall). The 2D tests remain as the fallback without WebGL.
Known leftovers: the 2D menu's "Fights: turn-based" switch no longer changes anything while WebGL is available.
