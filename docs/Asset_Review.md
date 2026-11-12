# Asset review (12 November)

Every asset family in the game, what state it is in, and what was done about it in the three rounds that followed. Judged on a phone-sized screen (390 × 844), against the artist's reference sheets and against the game's own paintings.

## The yardstick

The 2D game's 452 paintings set the look: warm, late-afternoon light, earth and amber, cream cotton, madder red, bronze. Anything in the 3D fights that reads as a paint-box primary, as plastic, or as a toy breaks from that. The artist's 181 reference sheets set who wears what.

## Inventory

| Family | Count | Where | State |
|---|---|---|---|
| Paintings (scenes, places, portraits, endings, stage backdrops) | 452 webp, 16 png | `art/` | Good. One consistent hand. |
| Film clips | 26 | `video/` | Good. Not reviewed frame by frame. |
| Music | 8 tracks | `music/` | Not judged here (no way to hear it in this workspace). |
| Modelled cast | 79 models, 47 people, 154 looks | `js/g3/models/m_*.js` | Fair. See below. |
| Code-built figures | 4 beings (gandharva, rakshasa, naga, yaksha), squad followers, crowds | `js/g3/figure.js`, `G.crowd` | Weak. |
| Beasts | horse, elephant | `js/g3/models/p_*.js` | Fair. |
| Machines | chariot, cart, wreck | `G.chariot`, `G.cartStatic` | Chariot good after rebuild; cart plain. |
| Weapons and things held | 15 kinds, bow, 2 shields, arrows, quivers | `js/g3/figure.js` | Fair after the surfaces pass. |
| Places | 16 kinds × 11 lights (village, garden, hall, room, river, forest, yard, field, camp, city, lac house, mountain, sea, deep lake, shrine, void) | `js/g3/sets.js` | Fair. Flat colour. |
| Building kit | 40 pieces (trees, rocks, huts, pillars, arches, tents, thrones, altars...) | `js/g3/kit.js` | Fair shapes, flat colour. |
| Effects | bursts, trails, weather, divine weapons | `js/g3/fx.js` | Good. |
| Interface | panels, buttons, icons, fonts | `css/`, `icons/` | Good. |

## Findings

### Cast (the largest gap)
1. **Bodies are inflated.** Limbs and trunks come from blended balls; shoulders are too wide, arms stand off the body, muscles read as balloons. Close shots show it most.
2. **Faces are alike.** One head, small differences in jaw and brow. People are told apart by crown and beard, not by face.
3. **Shoulder plates were dark balls** on the player and soldiers (the "boxing glove" look). The steel hoops round Bhishma's coat read as a barrel; his sheet has a skirt of scales instead.
4. **A man's upper cloth hung like a board** (a narrow flat strip down the chest).
5. **Cloth, metal and skin were one flat colour each.** Fixed by the surfaces pass (see Conversion Notes).
6. **The player ignored the story.** Everyone wore the same undyed cloth whatever home was chosen. Fixed.
7. **Painted portraits and models disagree.** The portraits (painted for the 2D game) show bronze cuirasses and bare heads; the models follow the artist's sheets (scale coats, tall crowns). Bhishma, Karna and Duryodhana differ most.
8. Hands do not close on a haft. Squad followers behind a leader are the older plain figures.

### Crowds
9. **Watchers at the ring were pegs**: a cylinder and a ball, the whole figure tinted one colour, so heads came out red or green.

### Beasts and machines
10. Horse and elephant were heavy (12,500 and 15,000 triangles each; a team of four with shadows is drawn many times). Halved with no visible loss.
11. The elephant reads as a toy (smooth, no wrinkles, round feet). The horse's head is blunt.
12. Bhishma's chariot: parasol at face height, camera behind him. Fixed.

### Weapons
13. Maces, swords, bows and spears were plain shapes in one colour with no shine at all (the material had no highlights). Fixed in the surfaces pass.
14. Arrows and quivers are still plain.

### Places
15. Built things are flat colour: no wood grain, stone, thatch, plaster or weave. The painted backdrop behind them is rich, so the join shows.
16. Tents, awnings and hangings are plain cloth.
17. Night tests (lamp, leaf, river) are very dark on a phone in daylight.

### Performance
18. A war field is about 500,000 triangles a frame before shadows. Fine on a recent iPhone; heavy on a modest phone. The game lowers only the drawing size when frames are slow; it never drops shadows or thins the ranks.
19. A model file that reached the phone before the 3D engine had started was thrown away (most likely on a second visit, from cache), and its people fell back to the plain figures. Fixed.

### Paintings, film, sound
20. No faults found in the paintings on contact sheets. Clips and music were not judged.

## What was done about each

| Finding | State after three rounds |
|---|---|
| 1 Inflated bodies | Eased, not cured: hollows are shaded and the forms read better, but the bodies are the same shapes. A rework of the body presets is the next step. |
| 2 Faces alike | Open. |
| 3 Shoulder balls, barrel hoops | Fixed: lapped plates; a skirt of scales; two slim bands. |
| 4 Upper cloth like a board | Fixed: it crosses the chest. |
| 5 Flat colour on cloth, metal, skin | Fixed: surfaces. |
| 6 Player ignored the story | Fixed: skin, home colours, gender, age, and the amulet, manuscript, purse and eye patch. |
| 7 Portraits and models disagree | Open: needs new portraits or a decision on which is right. |
| 8 Hands, squad followers | Hands fixed (the fist closes on the haft; see the end of Conversion Notes). Squad followers still the plain figures. |
| 9 Crowd pegs | Fixed. |
| 10 Heavy beasts | Fixed: halved. |
| 11 Toy elephant, blunt horse | Partly: hide, harness and cloth have surfaces; the howdah has its pennon and quiver. Shapes unchanged. |
| 12 Bhishma's chariot | Fixed. |
| 13 Weapons | Fixed. |
| 14 Arrows | Fixed (bound reed shaft, iron head). Quivers still plain. |
| 15, 16 Flat built things, plain tents | Fixed for huts, houses, walls, towers, gates, pavilions, temples, steps, pillars, tents, stalls, thrones, pots. Halls' floors and the ground are unchanged. |
| 17 Dark night tests | Open. |
| 18 Performance | Shadows now drop on a phone that stays slow. Figures are 40% lighter and the far ranks under half. Not measured on a real phone. |
| 19 Models thrown away on a cached visit | Fixed. |

## Order of work

Round 1: surfaces, chariot, the player's colours, crowds, shoulder plates.
Round 2: remodel in Blender (shoulder plates, the scale skirt, the upper cloth), surfaces for built things.
Round 3: whatever the third pair of lives shows, and performance.

What each round found and changed is recorded at the end of `docs/Conversion_Notes.md`.
