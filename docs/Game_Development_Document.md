# Kurukshetra: A Life · Game Development Document

Status: living document. Version 2 (2D story, 3D battles). Last updated 10 November 2026.

## 1. Vision
You cannot change the Mahabharata; you decide who you were inside it. One unnamed life, from a childhood beside the
princes to the eighteen days at Kurukshetra and what is left after. The epic's events are fixed ("Written"); your part
in them is not ("Unwritten").

**Pillars**
1. *Fidelity to the epic.* People, places, standards, weapons and the order of events follow the Mahabharata. Where the
   game invents (your character, Ugra, Charu, Vasu), it never contradicts what is written.
2. *Choices with weight.* No good-or-evil bar: duties pull against each other (teacher, king, family, conscience).
3. *Battles you fight yourself.* A fight is skill plus the life you built: your path, your vows, who stands beside you.
4. *One sitting, many lives.* Sixteen endings, a Book of Lives, rebirth with karma.

## 2. Structure
Seven acts, 229 scenes: Childhood, Training, Young adult, The fracture (the dice game), The exile years, The war, Aftermath.
A scene is a painting, a witness line of what the epic says, your story text, and choices. A choice may apply effects,
roll a check, open a test (23 kinds), or lead to a fight (72 encounters).

## 3. Systems (rules live in `js/engine`, data in `js/content`)
- **Character:** homeland (8), temperament, heirloom; attributes, skills; a path chosen in Act II (archer, mace,
  charioteer, strategist, healer, spy, bard), each with a weapon and a battle skill.
- **Standing:** duties, bonds with named people, reputation with factions, up to three vows (kept: a gift; broken: a
  price), boons, curses, injuries, tapas, divine weapons with conditions.
- **Tests:** action minigames whose difficulty comes from your stats; win, close or lose picks the branch.
- **Saving:** autosave per scene, a manual copy, save codes, act checkpoints. English and Hindi.

## 4. Battles (3D)
**Loop:** read the marks on the ground, move, strike in chains, answer blows (roll, guard, parry), spend your skill
and aids at the right moment.
- *Field:* a 13 m round arena on the fight's own ground. Camera behind your side; steeper on upright phones.
- *You:* weapon chains (sword 3, mace smash and sweep, spear, dagger 5, bow double shots, fists); roll with a moment of
  safety; shield with perfect block and breaking; parry on the last moment; breath as stamina.
- *Foes:* at most two wind up at once; melee circles and closes; archers keep 8.5 m; champions feint and parry.
- *Aids:* path skill on a recharge, herbs, a call for help, divine weapons (one mantra a battle), orders (with me,
  attack, fall back), mercy.
- *Fight kinds:* defeat, hold for a time, escort (keep the cart whole), breakthrough (reach the far side), weather
  (no striking: survive), the unwinnable stand against Abhimanyu (withdraw or fall).
- *Difficulty:* Easy, Normal (rises by act), Hard; Story mode cannot die; "Meet blows for me" guards and rolls for you.
- *Balance target:* a careful player wins about 90% overall, 60-85% in the hard fights. Measured with a bot that reads
  blows late and misses some (`npm test`).

## 5. Setting and authenticity guide
Use this when adding or changing anything a player sees.
- **Heroes and their standards:** Arjuna, ape (Hanuman) banner, white horses, Krishna as charioteer, bow Gandiva.
  Bhishma, palm tree, white beard, silver-white. Karna, elephant-girth, golden armour and earrings. Drona, water-pot
  on an altar. Duryodhana, serpent; mace. Bhima, lion; mace. Abhimanyu, karnikara tree. Jayadratha, boar.
  Yudhishthira, moon; spear.
- **How they fight:** the great archers fight from chariots; mace duels are on foot; elephants carry howdahs; common
  soldiers carry spear and round shield. No stirrups, no plate armour, no crossbows, no cavalry charges with lances.
- **Sides:** Pandava host in blue with the moon; Kaurava host in red with the sun (a game convention, kept
  consistent so friend and foe read at a glance).
- **Places:** Kurukshetra is a dry open plain; Hastinapura sandstone on the upper Ganga; Indraprastha white on the
  Yamuna; Gandhara mountain country; Matsya lakes and pasture; Panchala between Ganga and Yamuna; the house of lac at
  Varnavata. Fights use the ground the scene is set on.
- **Conduct of war:** fighting stops at sunset (the night raid is the exception the epic condemns); conches open a
  day; a foe who lays down arms is not struck by one who keeps the vow.
- **Tone:** no gore; the fallen lie where they fell. Names and terms follow the glossary.

## 6. Technology
Plain JavaScript, no build step, static hosting. 2D UI in DOM and SVG; 3D battles in three.js r187 (vendored) with all
3D assets made in code (merged low-poly geometry, canvas textures, jointed figures from the same look data as the 2D
puppets). Deterministic fixed-step battle simulation, separate from drawing, so it can be tested without a screen.

## 7. Known gaps and roadmap
| Priority | Item |
|---|---|
| 1 | Play every fight by hand on real phones and desktops; tune feel and frame rate |
| 1 | Re-run the 2D game's regression tests against this build; add a browser smoke test and CI |
| 2 | Chariot combat for the player on the charioteer path; mounted elephant riders |
| 2 | Hit reactions during wind-ups, weapon trails, distinct idle stances per weapon |
| 2 | Formation-specific fields: the wheel's rings as walls, Bhishma's bed of arrows |
| 3 | Retire or rewire the 2D "turn-based fights" switch; move practice bouts to 3D |
| 3 | Self-host fonts; offline support |
| 3 | Review of story text by scholars and of Hindi by a native speaker |

## 8. Glossary of the build
*Encounter:* a fight's data. *Trial:* a test's data. *Witness:* the line of what the epic records. *Mark:* the shape
on the ground that shows where a blow will land. *Standard:* a hero's banner.
