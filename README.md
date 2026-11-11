# Kurukshetra: A Life · 3D

The 3D version of [Kurukshetra: A Life](https://github.com/Apurv706/Mahabharata-game): you live one whole life inside
the Mahabharata, from a childhood beside the princes to the eighteen days of the war and what is left after.

The story, the rules, the saves and the Hindi translation are the 2D game's own, carried over unchanged. What is new is
everything you see and everything your hands do: every place is built in 3D, the people a scene names stand in it with
you, and every fight is fought in real time on open ground.

**Play:** open `index.html` from any static server (`npm start`, then the address it prints), or turn on GitHub Pages
for this repository. There is no build step and no art to download: the world is made in code.

## The battles

All 72 fights of the game are played live in a round field built on the fight's own ground.

- You run free, and strike with your weapon's own chain of blows: sword, mace (its sweep carries through three men),
  spear, dagger, bow, bare hands.
- Every blow coming at you is painted on the ground before it lands: a fan for a blade, a ring for a ground-shaker, a
  lane for an arrow. Step or roll out of it, raise your shield, or strike at the last moment to parry.
- Foes circle and come in two at a time; archers keep their distance; champions feint and parry back.
- Your path's skill, herbs, a call for help, the divine weapons, orders to those beside you, and sparing a foe who
  kneels all work as they do in the story's rules.
- Holding fights, escorts, breakthroughs and the days you can only survive each have their own goal on the field.

| | Keyboard and mouse | Touch | Gamepad |
|---|---|---|---|
| Move | WASD / arrows | left thumb | left stick |
| Strike | J / left click | Strike | A |
| Roll | Space | Roll | B |
| Guard | K / Shift / right button | Block (hold) | RB / triggers |
| Skill | L | skill button | X |
| Next foe | Q (or click a foe) | tap a foe | LB |
| Herbs · Help · Divine weapon · Spare | H · C · 1–3 · F | side buttons | Y (herbs) |
| Orders · Withdraw · Pause | O · X · Esc | side buttons · ❚❚ | Start |

"Meet blows for me" (Menu) guards and rolls for you; Story mode cannot die in battle; Difficulty is Easy, Normal or Hard.
**Just the fights** on the title screen is a ladder of sixteen battles with a fighter of the path you choose.

## What changed from the 2D game

| 2D | 3D |
|---|---|
| A painting per scene, shadow puppets | A place built in code per scene (field, camp, halls, gardens, rivers, forests, the eight homelands, the house of lac...), jointed figures of everyone named |
| Fights on a line, turn-based or 1-D real time | Free movement on a round field, telegraphed blows, rolls, shields, parries, arrows in flight |
| 23 kinds of test on painted stages | The same 23, with the same rules and stakes, played in 3D |
| An SVG map | A relief map: tap a homeland to be born there; walk your road between scenes |
| Paintings and clips (150 MB) | No art files: about 8 MB in all, most of it music and the Hindi text |

Kept exactly: the seven acts and 229 scenes, the sixteen endings, vows, bonds, curses, divine weapons, the Book of
Lives and rebirth, act checkpoints, save codes (a 2D save code loads here), English and Hindi.

## Code

```
js/engine/    the rules: state, flow, combat, abilities            (unchanged from 2D)
js/content/   the story as plain data                              (unchanged from 2D)
js/i18n/      hi.js (2D's Hindi), hi3d.js (the new interface)
js/world/     how people look, and the map, as data
js/rules/     rule kernels of the race and the wheel
js/g3/        the 3D kit: renderer, textures, builder and props, figures, effects, places
js/ui/        the page over the 3D view: story director, screens, windows, map, tests, games
js/ui/battle/ sim.js (the fight's rules on open ground, no drawing) and view.js (what you see)
tools/        serve.js, shot.js, play.js (plays the real game in headless Chrome)
tests/        fights.js (every fight, played by a bot on every path)
```

`npm test` plays every fight headlessly and prints win rates; `npm run smoke` lives a whole life in headless Chrome.
More in [docs/Conversion_Notes.md](docs/Conversion_Notes.md).

## Credits

Story, rules, music and Hindi text: the original 2D game. 3D: [three.js](https://threejs.org) r187 (MIT, see
`js/vendor/three.LICENSE.txt`). Coastline: Natural Earth (public domain). All story text is a working draft and still
needs review by scholars and community advisors; the Hindi is a draft that needs a native speaker's review.
