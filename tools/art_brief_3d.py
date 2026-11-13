import base64, io, sys, html
from PIL import Image
ART = "/home/claude/mahabharata_game_3d/art/"
OUT = sys.argv[1]
DATE = "12 November 2026"

def thumb(name):
    try:
        im = Image.open(ART + name + ".webp").convert("RGB")
    except Exception:
        return ""
    im.thumbnail((360, 300)); b = io.BytesIO(); im.save(b, "JPEG", quality=78)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()

S = "Scene · 2560×1440"; P = "Portrait · 900×1200"; E = "Ending scene · 2560×1440"; M = "Moment · 2560×1440"
# (file, kind, used, paint, note, match)
SECTIONS = [
 ("PRIORITY 1 · 6 IMAGES · IN THE GAME TODAY ON BORROWED PAINTINGS", "Two new story lines, built",
  "Both are playable now (Act VI). Each is a short choice scene and a 3D fight. Today the scenes borrow the day-14 sky and the muster painting; these give them their own. They can go in the day they arrive.",
  [("scene_bhima_down", S, "Over Bhima (Pandava side, day 14): the scene that offers the fight. Karna has beaten Bhima down and ridden on.",
    "A broken war-car on its side in churned ground, one wheel off, the horses gone. Beside it a very large man in a wrestler's build lies on his back, one hand still on a great mace, eyes open to the sky. Far off, small, a single car driving away under a red-gold banner. A company of foot soldiers with axes and spears has just turned toward the fallen man. Late afternoon, dust, low gold light.",
    "Bhima as in p_bhima and moment_friend_bhima. No blood. The man driving away is not shown close.", "scene_kings_fall"),
   ("scene_bhima_rises", S, "Over Bhima, won: he gets up behind you.",
    "The same ground, seen from low down between two lines of men. In the middle distance the large man is on one knee with the mace planted like a staff, head lifting. The foot soldiers who came for him have stopped and are leaning back. Nobody is striking anybody.",
    "Same place and light as scene_bhima_down, a few minutes later.", "war_day17"),
   ("scene_banner_falls", S, "The banner-bearer (either side, day 15): the scene that offers the fight.",
    "Inside a line of infantry at noon, seen at shoulder height. A banner-bearer has sunk to a sitting position with the staff still upright in both hands, the long cloth streaming above. The men either side have half turned to look. The staff has just begun to lean. Beyond them, dust and the enemy line.",
    "The banner cloth plain, one colour with a simple border: the game uses this for both armies, so no device on it. The arrow is implied, not shown in him.", "scene_command_banner"),
   ("scene_banner_dusk", S, "The banner-bearer, won: dusk, and a camp boy comes to take the staff.",
    "The field at dusk, the lines gone back. One tired soldier seen from behind, still holding a tall banner staff upright; a boy of ten or twelve reaching up to take it. Long shadows, the cloth hanging almost still.",
    "The soldier is the player: from behind, no face, plain armour.", "war_day18"),
   ("scene_banner_down", S, "The banner-bearer, lost.",
    "A banner cloth lying across trampled ground, the staff cut through, a ring of feet and spear butts moving away from it in every direction. Close and low. No bodies.",
    "", "scene_line_broken"),
   ("p_kalinga", P, "Over Bhima: the Kalinga captain who charges, and calls you out to single combat.",
    "A heavy-shouldered warrior of the eastern coast in his forties: dark skin, a short thick beard, a bronze-banded leather cap, a broad gold collar, a long-handled axe on his shoulder. Confident, a little amused.",
    "Not a named man of the epic: a face for the game to show on the challenge card.", "p_bhurishravas")]),
 ("PRIORITY 2 · 9 IMAGES · NEXT TO BE BUILT", "In Arjuna's place, the king's wheel-guard, and the message",
  "The next story lines, in the order planned. In Arjuna's place needs the player riding a moving car in 3D, which is the next piece of building; its paintings can be started now.",
  [("scene_arjuna_struck", S, "In Arjuna's place (archer): the scene that begins it. Arjuna has been struck senseless in his car.",
    "The white-horsed car at a standstill in the press. The archer has sunk back against the car's rail, bow slipped from his hand, eyes closed; the charioteer has turned on his bench, one hand still on the reins, the other reaching back to steady him. Above them the ape banner still flies. Arrows stand in the car's woodwork.",
    "Arjuna and Krishna exactly as in war_wheel_open. No blood; he is stunned, not dying.", "war_wheel_open"),
   ("scene_under_the_ape", S, "In Arjuna's place: you stand in his car so the enemy does not know he is down.",
    "The same car at full gallop seen from the front quarter, four white horses stretched out. On the fighting platform a soldier in plain armour, seen small and mostly hidden by the car's rail and the dust, draws a bow. The ape banner is the largest thing in the picture. The charioteer leans into the turn.",
    "The soldier is the player: no clear face, no fine armour. Arjuna himself is not visible (he lies in the car's bed).", "war_wheel_open"),
   ("scene_arjuna_wakes", S, "In Arjuna's place, the end of the day: he wakes.",
    "The car stopped behind the lines at sunset. The archer sits up on the car's floor with a hand to his head, the charioteer crouched beside him with a water skin. A third figure, seen from behind, is climbing down from the car with a borrowed bow.",
    "", "war_day16"),
   ("scene_kings_wheel", S, "The king's wheel-guard (days 11 and 12): you are posted at Yudhishthira's wheel.",
    "A great car under a white parasol and a banner with a golden moon, standing behind the line. A handful of picked men stand at each wheel, facing outward. Seen from beside one wheel, looking past its rim at a single enemy car coming on fast through the dust under a golden banner.",
    "The king a calm seated figure, small, under the parasol. The oncoming car is Drona's (banner: an altar with a water-pot): far enough that he is a shape.", "war_capture"),
   ("scene_wheel_shut", S, "The message through the wheel (day 13): the gate of the Chakravyuha has closed behind Abhimanyu.",
    "The mouth of the great circular array seen from outside and a little above: curved ranks of cars and shields closing like a door, and through the last gap a single young warrior's car going in under a peacock banner. In the foreground, backs of the men who did not get through.",
    "Same array as scene_day13, seen from ground level at its edge.", "scene_day13"),
   ("scene_message_run", S, "The message through the wheel: the run to find Bhima.",
    "A lone runner crossing open ground between two masses of fighting men, bent low, a strip of red cloth tied round one arm. Arrows in the ground around him. Late afternoon.",
    "The runner is the player: from behind or far off.", "scene_line_broken"),
   ("scene_message_late", S, "The message through the wheel, the end: it arrives too late, whatever you do.",
    "A very large warrior standing in his car with his mace lowered, looking toward a distant ring of dust where the fighting has stopped. A runner on his knees at the car's wheel. Sunset.",
    "Bhima as in p_bhima. No sight of what is inside the ring.", "war_day14"),
   ("scene_sun_race", S, "The race against the sun (day 14): Jayadratha must fall before sunset.",
    "Looking west along a lane cut through the Kaurava host, the sun very low and red at the far end of it, a single white-horsed car driving down the lane toward the sun. Long shadows reach toward the viewer.",
    "The game puts the sun's height on screen as the clock, so keep the sky around the sun plain.", "war_day14"),
   ("scene_decoy_armour", S, "The decoy: you put on a great man's armour to draw their champion away.",
    "Inside a tent before dawn: a suit of fine armour and a crested helmet laid out on a low cot, one lamp, an old armourer holding up the breastplate toward the viewer.",
    "Nobody wears it yet: the player is the one being armed.", "scene_armour")]),
 ("PRIORITY 3 · 7 IMAGES · STORY FIGHTS GIVEN A NEW SHAPE", "The known days, played the way the epic tells them",
  "These fights exist as timed stands. In 3D they become the epic's own sequence (the bow cut, the charioteer down, the wheel-guards gone). Each needs one picture for the turn the fight now has.",
  [("scene_abhimanyu_wheel", S, "The heart of the wheel (day 13): Abhimanyu on foot, his car gone, a wheel in his hands.",
    "A young warrior alone in a ring of standing cars, holding a chariot wheel above his head as a shield. His own car lies broken behind him. The men in the ring are shapes in the dust.",
    "Abhimanyu as in p_abhimanyu. No blow shown landing. Dignity: he is not shown falling.", "war_wheel"),
   ("scene_gate_jayadratha", S, "Holding the gate (day 13): Jayadratha's men are a wall across the gap.",
    "A wall of locked shields and levelled spears across a gap between two wings of cars, a single car behind it under a boar banner. Seen from the front, low.",
    "Jayadratha's banner: a silver boar.", "scene_day13"),
   ("scene_supratika", S, "Supratika's charge (day 12): Bhagadatta's elephant.",
    "A huge war elephant coming straight down a lane through infantry, an old king in the howdah with a goad raised, a mahout on the neck. Men throwing themselves aside. Seen from in front and to one side so the lane is clear.",
    "The game's task is to reach the mahout, so he must be plainly visible.", "war_capture"),
   ("p_bhagadatta", P, "Supratika's charge: the old king of Pragjyotisha.",
    "A very old, straight-backed king: white hair bound up with a silk band (the epic says he tied his eyelids open with one), a long white moustache, heavy gold earrings, an elephant goad across his shoulder.",
    "", "p_bhishma"),
   ("scene_night_host", S, "Ghatotkacha's night host (night of day 14): your own side's spirit breaking in the dark.",
    "The field by torchlight. Soldiers in the foreground looking up and back, some already turning to run; above the far line, huge indistinct shapes in the smoke and a rain of sparks. One enemy car stands firm with a single bright spear raised.",
    "The shapes are smoke and firelight, not painted monsters. Ghatotkacha as in p_ghatotkacha if shown at all.", "stage_battlefield_night"),
   ("scene_karna_reins", S, "Kaurava side, day 17: Shalya will not drive, and you take Karna's reins.",
    "Karna's car from the charioteer's bench: a pair of hands on four reins in the foreground, the backs of the horses, and beyond them the white-horsed car under the ape banner coming on.",
    "The hands are the player's. Karna is behind the viewer, not seen.", "war_day17"),
   ("scene_lake_banner", S, "Kaurava side, day 18: Duryodhana's banner at the lake.",
    "A torn banner with a jewelled elephant planted in reeds at the edge of a still lake at dawn, a few exhausted men sitting round it.",
    "Same lake as scene_lake.", "scene_lake")]),
 ("PRIORITY 4 · 8 IMAGES · PARKED WORK, FOR WHEN IT STARTS", "Earning the divine weapons, side quests, and the wheel's mouth",
  "Planned, not started. The weapon quests will be spread through the whole life and played in 3D; each then needs one picture of arriving and one of the gift. Paint these last.",
  [("scene_fire_altar_vigil", S, "The fire altar (the Agneya weapon): arriving for the vigil.",
    "The brick altar in its grove at dusk before the fire is lit: stacked wood, ladles and ghee pots set out, an old priest sweeping the ground. Stars just showing.",
    "Same altar and grove as stage_fire_altar.", "stage_fire_altar"),
   ("moment_fire_gift", M, "The fire altar, won: a voice in the coals.",
    "The same altar near dawn, the fire burnt down to a bed of coals that glow in a shape almost like an open hand. One kneeling figure seen from behind.",
    "No god shown: light only, as in moment_astra.", "moment_astra"),
   ("scene_lake_sage", S, "The dive (the Varuna weapon): the sage at the lake.",
    "A thin old sage seated on a rock at the edge of a deep mountain lake, pointing down into the water. The water clear enough to see the bed falling away into blue.",
    "Same lake as stage_deep_lake.", "stage_deep_lake"),
   ("moment_water_gift", M, "The dive, won: you come up with the golden vessel.",
    "Seen from under water looking up: a swimmer's arm breaking the bright surface, holding a small golden vessel, sunlight coming down in shafts.",
    "", "stage_deep_lake"),
   ("scene_cattle_night", S, "Side quest: the cattle escape.",
    "A stockade of thorn and timber at night, a herd of humped cattle packed inside, two drowsy guards by a fire, the gate bar in shadow.",
    "The 3D game plays the escape itself; this is the scene before it.", "scene_cattle"),
   ("scene_floor_trap", S, "Side quest: the floor escape.",
    "A palace hall of polished stone seen from the doorway, lamps along the walls, a floor of large square slabs, one of them a hair's breadth lower than the rest.",
    "No people.", "stage_palace_corridor"),
   ("scene_wheel_mouth", S, "The Chakravyuha entry: the mouth of the wheel, with real cars.",
    "Ground level, a few paces in front of the array's mouth: three war-cars abreast in the gap with their teams standing, banners above, shields of the foot packed between the wheels, and the curve of the array running away on both sides.",
    "The 3D game will draw the cars; this is the scene before the entry, and the look to match.", "scene_day13"),
   ("end_banner", E, "A new ending for a life that carried the banner and lived.",
    "An old man's hands resting on a banner staff grown dark with handling, the faded cloth rolled and tied; a village doorway behind, evening.",
    "", "end_elder")]),
]

def esc(s): return html.escape(s)
tot = sum(len(s[3]) for s in SECTIONS)
rows = "".join("<tr><td>%d</td><td>%s</td><td>%d</td><td>%s</td></tr>" % (i + 1, esc(s[1]), len(s[3]), esc(w)) for i, (s, w) in enumerate(zip(SECTIONS, [
  "5 scenes, 1 portrait. For two story lines already playable.", "9 scenes. In Arjuna's place, the king's wheel-guard, the message, the race against the sun, the decoy.",
  "6 scenes, 1 portrait. Abhimanyu, the gate, the elephant, the night host, two Kaurava mirrors.", "5 scenes, 2 moments, 1 ending. Weapon quests, side quests, the wheel's mouth."])))
foot = "Kurukshetra: A Life · Art brief: 3D story lines · " + DATE
H = ["""<meta charset="utf-8"><style>
@page { size: Letter; margin: 0.55in 0.6in 0.7in; @bottom-left { content: "%s"; font: 8pt 'Noto Sans', sans-serif; color: #7a6f5f; } @bottom-right { content: counter(page); font: 8pt 'Noto Sans', sans-serif; color: #7a6f5f; } }
body { font: 9.6pt/1.42 'Noto Sans', 'DejaVu Sans', sans-serif; color: #2a2118; margin: 0; }
.k { font-size: 7.6pt; letter-spacing: .12em; color: #9a5a22; font-weight: 700; margin: 0 0 6pt; }
h1 { font: 700 22pt/1.15 'Noto Serif', 'DejaVu Serif', serif; margin: 0 0 8pt; } h2 { font: 700 15pt/1.2 'Noto Serif', 'DejaVu Serif', serif; margin: 0 0 6pt; }
p { margin: 0 0 8pt; } table { border-collapse: collapse; width: 100%%; margin: 8pt 0 10pt; font-size: 8.8pt; } th { text-align: left; font-size: 7.6pt; letter-spacing: .06em; color: #7a6f5f; border-bottom: 1px solid #b9a98c; padding: 4pt 6pt 4pt 0; }
td { vertical-align: top; padding: 5pt 8pt 5pt 0; border-bottom: 1px solid #e6dcc8; } tr.t td { font-weight: 700; border-bottom: none; }
.sec { break-before: page; } .e { display: grid; grid-template-columns: 1.55in 1fr; gap: 12pt; margin: 0 0 13pt; break-inside: avoid; }
.e img { width: 100%%; border-radius: 3px; display: block; } .e .cap { font-size: 7pt; color: #7a6f5f; margin-top: 2pt; }
.e b.n { font: 700 10.5pt 'Noto Sans Mono', 'DejaVu Sans Mono', monospace; color: #6b2f14; } .e .kd { font-size: 8.2pt; color: #7a6f5f; margin: 1pt 0 3pt; } .e div p { margin: 0 0 2.5pt; } .e i { font-style: normal; font-weight: 700; }
.note { font-size: 8.6pt; color: #5a4f40; }
</style>""" % foot]
H.append('<div class="k">KURUKSHETRA: A LIFE · %s</div><h1>Art brief: 3D story lines</h1>' % DATE.upper())
H.append("<p>The game now plays its fights in 3D, and that has opened new story lines: moments inside the war where you take a great man's place, stand over him, or carry what he carried. This brief lists the new paintings those story lines need. The 3D game draws its own fields, soldiers, cars and banners, so <b>no fight backgrounds or test stages are asked for here</b>: only story scenes, a few portraits, two moments and one ending. Each entry names an existing painting to match for place, light and style, shown beside it.</p>")
H.append("<table><tr><th>PRIORITY</th><th>WHAT IT IS FOR</th><th>IMAGES</th><th>WHAT</th></tr>%s<tr class='t'><td></td><td>Total</td><td>%d</td><td></td></tr></table>" % (rows, tot))
H.append("<p class='note'>Priority 1 is for story lines already in the game; those pictures can go in as soon as they arrive. Priority 2 is being built next. Priorities 3 and 4 are planned and not yet built, so their entries may change a little; paint them last.</p>")
H.append('<div class="k" style="margin-top:14pt">RULES</div><h2>Rules and shapes</h2><p>Everything in the main art brief applies: the game\'s warm, painterly early-historic India; no text or lettering; timber, brick and stone, no domes, spires, colonnades, Greek or East Asian forms; no European swords; violence implied, no blood, no blow shown landing; Draupadi always shown with dignity; made or licensed for this project, AI use noted.</p>')
H.append("<table><tr><th>KIND</th><th>SIZE</th><th>NOTES</th></tr>"
 "<tr><td>Scene, ending, moment</td><td>2560×1440 (16:9)</td><td>One file. The game cuts its 3:1 banner from the middle band, so keep the subject in the centre 40% of the width and the middle third of the height; a calm lower half.</td></tr>"
 "<tr><td>Portrait</td><td>900×1200 (3:4)</td><td>Head and shoulders; face in the upper third (the game crops a circle from the centre, 20% down).</td></tr></table>")
H.append("<p><b>Three rules particular to this brief.</b> <b>The player is never given a face.</b> Where an entry says the soldier is the player, show them from behind, far off, or hidden by a rail or dust, in plain armour that could belong to either army. <b>Named men must match their portraits</b> and the war paintings already delivered: Arjuna and Krishna as in war_wheel_open, Bhima as in p_bhima, Karna as in war_day17. <b>Banners carry the epic's own devices</b>, and the 3D game draws the same ones: Arjuna the ape, Bhishma the palm, Drona the altar and water-pot, Karna the elephant-rope, Abhimanyu the peacock, Yudhishthira the golden moon, Duryodhana the jewelled elephant, Jayadratha the silver boar.</p>")
for (k, title, intro, es) in SECTIONS:
    H.append('<div class="sec"><div class="k">%s</div><h2>%s</h2><p>%s</p>' % (esc(k), esc(title), esc(intro)))
    for (f, kind, used, paint, note, match) in es:
        t = thumb(match)
        H.append('<div class="e"><div>%s<div class="cap">Match: %s</div></div><div><b class="n">%s</b><div class="kd">%s</div><p><i>Used for:</i> %s</p><p><i>Paint:</i> %s</p>%s</div></div>' % (
            ('<img src="%s">' % t) if t else "", esc(match), esc(f), esc(kind), esc(used), esc(paint), ('<p><i>Note:</i> %s</p>' % esc(note)) if note else ""))
    H.append("</div>")
open(OUT, "w").write("\n".join(H))
print(tot)
