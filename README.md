# Kurukshetra: A Life · 3D battles

[Kurukshetra: A Life](https://github.com/Apurv706/Mahabharata-game) with every battle fought in real-time 3D.

The story pages, the map, the tests, the menus, the saves and the Hindi are the 2D game's own, unchanged: its paintings
and shadow puppets tell the story better than a 3D stage did. A fight is different. When a choice leads to one, the
page gives way to a 3D field built on that fight's own ground, and you fight it yourself.

**Play:** serve the folder (`npm start`) or turn on GitHub Pages. No build step.

## The battles
- All 72 fights, on a round field: the Kurukshetra plain between the two hosts, the camps, the fair's ring, the
  forest road, the swayamvara hall, the wheel formation.
- You run free and strike with your weapon's own chain of blows; roll, guard, parry, your path's skill, herbs, a call
  for help, divine weapons, orders to your company, mercy to a foe who kneels.
- Every blow is painted on the ground before it lands: a fan for a blade, a ring for a ground-shaker, a lane for an arrow.
- The great archers (Karna, Arjuna, Bhishma, Drona, Abhimanyu...) fight from their chariots under their own standards:
  Arjuna's ape with Krishna at the reins and white horses, Bhishma's palm, Karna's elephant-girth, Drona's water-pot,
  Duryodhana's serpent. Mace fighters (Bhima, Duryodhana) fight on foot. The two hosts wear their colours.
- Without WebGL the 2D game's own fight screens are used.

| | Keyboard and mouse | Touch | Gamepad |
|---|---|---|---|
| Move | WASD / arrows | left thumb | left stick |
| Strike · Roll · Guard | J or click · Space · K, Shift or right button | buttons | A · B · RB |
| Skill · Next foe | L · Q or click a foe | button · tap a foe | X · LB |
| Herbs · Help · Divine weapon · Spare | H · C · 1–3 · F | side buttons | Y (herbs) |
| Orders · Withdraw · Pause | O · X · Esc | side buttons | Start |

## Code
```
index.html, css/, js/engine, js/content, js/i18n, js/ui, art/, video/, music/   the 2D game, as it is
js/vendor/three.min.js      three.js r187
js/g3/                      the 3D kit: renderer, textures, builder and props, figures, effects, places
js/ui/battle/sim.js         the fight's rules on open ground (no drawing; rides on the 2D combat engine)
js/ui/battle/view.js        what you see and what your hands do
js/ui/battle/bridge.js      opens the 3D layer for a fight and hands back to the 2D page
css/battle3d.css            the fight's HUD
tests/fights.js             every fight, played by a bot on every path (npm test)
```
See [docs/Game_Development_Document.md](docs/Game_Development_Document.md) and [docs/Conversion_Notes.md](docs/Conversion_Notes.md).

## Credits
Story, rules, art, music and Hindi: the original 2D game. 3D: [three.js](https://threejs.org) (MIT). Story text and
Hindi are drafts that still need review by scholars, community advisors and a native speaker.
