# The figures beside those of popular games (12 November)

Asked for: compare the game's 3D figures with the characters of popular games and find where to improve.

How this was done: from what the makers of those games have published about how their characters are built (Hades, Raji: An Ancient Epic, Shadow Fight 3, Brawl Stars, Team Fortress 2 and Overwatch, Unity's guidance for characters), set against measurements of our own models. Other games' models were not opened or looked at here, and no reliable published triangle or bone counts were found for Genshin Impact or Fortnite, so none are quoted.

## Our figures, measured

- 79 models, 154 looks. Built in Blender from blended balls, then thinned (`tools/blender/cast.py`).
- 13 joints: hips, trunk, head, and three each for arms and legs. No collar bones, no second spine joint, no neck, no feet, no fingers, no twist joints. Two joint influences per point.
- 28,500 to 49,900 triangles drawn per dressed figure, 38,300 on average. No lighter version for distance.
- No painted textures: colour per point, with pattern, border, metal and skin drawn by a shader.
- One head, varied a little in jaw and brow. Eyes do not blink; no expressions.
- Hands are one fixed open shape. They do not close on a weapon.
- 37 poses and 18 one-shot moves, written as joint angles in code. Cloth and hair on the modelled figures do not sway.
- About six heads tall as adults. In a fight seen from above on a phone a figure is roughly 70 to 90 pixels tall.

## Side by side

| | Popular games | Ours | Gap |
|---|---|---|---|
| How a body is made | A few clean base bodies, reshaped per character and re-meshed so joints bend well (Hades: most characters start from one of two bases, "retopologized" to deform well) | Each body from blended balls, thinned by machine; no rings of edges at the joints | Large. This is why the shoulder needed a ball set into it, and why elbows, hips and knees pinch |
| Skeleton | Around thirty joints is an ordinary rig (Unity's own example); up to four influences per point | 13 joints, two influences | Large. No collar bone, neck, feet or hands to move |
| Weight | One write-up budgets about 50,000 triangles for a whole mobile scene | 38,000 for one figure | Large. One hero is most of that scene |
| Telling people apart | Each role has its own outline; a faction reads "at first glance" (Shadow Fight 3); one clear idea per character (Brawl Stars) | One build, scaled; people differ by crown, beard and colour | Large at fight distance, where crowns and beards are a few pixels |
| Faces | Sculpted against the 2D portrait, laid over it to match (Hades) | One head for all; our 2D portraits and 3D heads disagree | Large in close shots |
| Surface | Baked hollows and edges under hand-painted colour, with painted line work on top (Hades, Raji) | Shader patterns, shaded hollows, an edge light. No line work | Medium. Closer after today's work |
| Hands and weapons | Hands grip; the weapon carries the strongest contrast on the figure (TF2/Overwatch) | Open hands beside the haft | Medium, and cheap to close |
| Movement | Hand-keyed strikes built on wind-up, brake, strike, recovery, the body counter-turning (Shadow Fight 3 and its animators' notes) | Joint angles in tables; body and arm move together | Medium. Blows read light |
| Cloth and hair | Follow through after the body stops | Rigid on the modelled figures | Medium |
| Draw cost per figure | One skinned mesh, few materials (Unity) | One mesh, one material | None. Already right |
| Dress | Sets of gear per faction | 154 looks, and the player's own from the story | None. Ahead for a game this size |

## Where to improve, in order

1. **A proper base body and skeleton.** Three clean bodies (man, woman, child) with edge rings at every joint, four influences, and about 26 joints: add collar bones, a second spine joint, a neck, feet, a closing hand, a forearm twist. Every character is then reshaped from a base, as Hades does. This removes joint hollows for good rather than patching each one, and it is what lets hands grip and feet plant. Largest piece of work: the body builder, the armature, the game's pose tables and every garment's fit all change.
2. **A light figure for the fight.** A second model of each person at about 8,000 triangles for the view from above, the full one kept for the opening close shots. Roughly four to five times fewer triangles in a battle. Small work: the builder already thins meshes.
3. **Outlines that tell people apart.** Push each hero's build away from the others (Bhima square and huge, Arjuna a lean wedge, Duryodhana a barrel, Karna tall and narrow), and give each host a mark that reads from above: helmet crest, shield shape, a sash worn the same way.
4. **Faces from the portraits.** Shape each named head against its painted portrait; add painted brows, kohl and lips; a blink and three expressions (set, pained, shouting).
5. **Quick wins for the fight camera.** Fists closed on the haft; hands and weapons a little larger in fights; a dark painted outline round each figure so it lifts off the ground and sits with the paintings.
6. **Weight in the blows, and things that swing.** Re-time strikes as wind-up, brake, strike, recovery with hips and shoulders counter-turning; three or four spring joints for a hair tail, a cloth end and a sash.

Items 2 and 5 can be done on the present models. Items 1, 3 and 4 are one rebuild of the cast if done together. Item 6 is best after 1, since it needs the new joints.

## Sources

- Supergiant on Hades' characters: https://gamedeveloper.com/art/learn-how-supergiant-brought-i-hades-i-hand-painted-characters-to-life
- Raji: An Ancient Epic: https://www.adobe.com/products/substance3d/magazine/raji-an-ancient-epic-enter-the-realm-of-indian-mythology.html
- The making of Shadow Fight 3: https://www.pocketgamer.biz/the-making-of-shadow-fight-3/
- Separation and compensation in strike animation: https://80.lv/articles/separation-compensation-principle-in-strikes-animation?amp=1
- Brawl Stars' five pillars: https://www.pocketgamer.biz/5-creative-pillars-for-designing-brawlers-in-supercells-brawl-stars
- Character readability in Team Fortress 2 and Overwatch: https://medium.com/@xavierck/character-readability-in-team-fortress-2-and-overwatch-68c41d454465
- Shape language in character design: https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent
- Unity, modelling characters for performance: https://docs.unity.com/en-us/engine/6000.6/manual/assets-and-media/asset-types/models/creating-dccassets/modeling-optimized-characters
- Hand-painted workflow and a mobile scene budget: https://80.lv/articles/studying-hand-painted-texturing-workflow-for-stylized-art
- Anatomy for stylised characters at Supercell: https://scott-eaton.com/2019/essential-anatomy-at-supercell
