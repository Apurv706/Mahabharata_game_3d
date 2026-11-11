# Kurukshetra: A Life · 3D battles

[Kurukshetra: A Life](https://github.com/Apurv706/Mahabharata-game) with every battle fought in real-time 3D.

Reading is 2D; playing is 3D. The story pages, the map, the menus, the saves and the Hindi are the 2D game's own,
unchanged: its paintings and shadow puppets tell the story better than a 3D stage did. Wherever the game asks you to
act, the page gives way to a 3D scene: every fight, every practice bout, and all 23 kinds of test.

**Play:** serve the folder (`npm start`) or turn on GitHub Pages. No build step.

For a host that holds at most 512 files a page, `tools/split/build.js` writes the game as two linked parts (Acts I–IV,
Acts V–VII); a life crosses from one to the other with its save code.

## The battles
- All 72 fights, on a round field: the Kurukshetra plain between the two hosts, the camps, the fair's ring, the
  forest road, the swayamvara hall, the wheel formation.
- **Three views**, changed at any time with the eye button or R, and offered on the card before each fight: from
  above, from just behind your fighter, and through your fighter's eyes. The close views keep the foe you face ahead
  of you, move you relative to where you look, close a ring on a blow you can see and mark the edge of the screen for
  one you cannot.
- **Every fight opens** close on you, reads the story's lines, crosses the field to the one who leads against you,
  shows who stands with you, then pulls back and waits for your word. A tap moves it on; Skip goes to the field.
- **War and raid battles are fought in a line.** A few soldiers of each host fight inside the field, each with his own
  man, and more come on from the ranks as they fall. The fight is still decided by those the story names. Beyond the
  ring pairs trade blows at the ranks' edge and flights of arrows go over. Duels and sparring stay one against one.
- **The opening dream overwhelms.** Your own line is cut down round you and more come out of the dust the longer you
  stand. Most players fall; either way the dream breaks.
- You run free and strike with your weapon's own chain of blows; roll, guard, parry, your path's skill, herbs, a call
  for help, divine weapons, orders to your company, mercy to a foe who kneels.
- Every blow is painted on the ground before it lands: a fan for a blade, a ring for a ground-shaker, a lane for an arrow.
- **Dress, standards and steeds follow the epic's own words** ([docs/Costume_Audit.md](docs/Costume_Audit.md)). The
  great archers fight from their cars: Arjuna dark, in a diadem like the sun, behind four white horses in gold with
  Krishna in yellow silk at the reins under the ape; Bhishma all in white under a white umbrella and the palm with five
  stars; Drona in white on a golden car behind red steeds. Mace and sword fighters fight on foot and leave their cars
  at the field's edge under their standards. Karna's golden mail and ear-rings are gone by the war. The two hosts'
  colours (blue and red) are the game's own, so friend and foe can be told apart.
- **The moves were rebuilt against written technique** ([docs/Fighting_Moves.md](docs/Fighting_Moves.md)): blows wind
  up, snap and follow through with a step; the mace comes over from behind the back; archers stand side-on with a long
  bow drawn to the ear.
- Without WebGL the 2D game's own fight screens are used.

| | Keyboard and mouse | Touch | Gamepad |
|---|---|---|---|
| Move | WASD / arrows | left thumb | left stick |
| Strike · Roll · Guard | J or click · Space · K, Shift or right button | buttons | A · B · RB |
| Skill · Next foe | L · Q or click a foe | button · tap a foe | X · LB |
| Herbs · Help · Divine weapon · Spare | H · C · 1–3 · F | side buttons | Y (herbs) |
| Change the view | R | the eye button | |
| Orders · Withdraw · Pause | O · X · Esc | side buttons | Start |

## Code
```
index.html, css/, js/engine, js/content, js/i18n, js/ui, art/, video/, music/   the 2D game, as it is
js/vendor/three.min.js      three.js r187
js/g3/                      the 3D kit: renderer, textures, builder and props, figures, effects, places
js/ui/battle/sim.js         the fight's rules on open ground (no drawing; rides on the 2D combat engine)
js/ui/battle/view.js        what you see and what your hands do
js/ui/battle/bridge.js      opens the 3D layer for a fight or a test and hands back to the 2D page
js/ui/tests3d/              the 23 kinds of test in 3D: frame.js (card, HUD, outcome), games.js (each kind's play)
css/battle3d.css            the fight's HUD
tests/                      the 2D game's regression suite, brought over, and the 3D layer's checks (tests/README.md)
tools/split/                the two-part build for a host that holds at most 512 files
```
`npm test` runs the quick tier: the 2D game's rules, random lives, golden lives, balance bands, content and bug
checks, then the 3D fights' rules, every 3D fight played by a bot against its recorded band, and a fight and the 2D
fallback in a real browser. 3D can be switched off with `?2d=1` on the address.
See [docs/Game_Development_Document.md](docs/Game_Development_Document.md), [docs/Conversion_Notes.md](docs/Conversion_Notes.md),
[docs/Costume_Audit.md](docs/Costume_Audit.md), [docs/Fighting_Moves.md](docs/Fighting_Moves.md) and [docs/Balance_3D.md](docs/Balance_3D.md).

## Credits
Story, rules, art, music and Hindi: the original 2D game. 3D: [three.js](https://threejs.org) (MIT). Story text and
Hindi are drafts that still need review by scholars, community advisors and a native speaker.
