from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak, KeepTogether, Flowable
INK = colors.HexColor("#2a1a12"); ACC = colors.HexColor("#9a3a1e"); SOFT = colors.HexColor("#f4ead8"); LINE = colors.HexColor("#c9b490"); MUTE = colors.HexColor("#6a5a48")
W = A4[0] - 36 * mm
st = lambda n, **k: ParagraphStyle(n, fontName=k.pop("font", "Helvetica"), textColor=k.pop("color", INK), **k)
H0 = st("h0", font="Helvetica-Bold", fontSize=26, leading=30, spaceAfter=4)
SUB = st("sub", fontSize=12, leading=16, color=MUTE, spaceAfter=10)
H1 = st("h1", font="Helvetica-Bold", fontSize=15, leading=19, color=ACC, spaceBefore=14, spaceAfter=6)
H2 = st("h2", font="Helvetica-Bold", fontSize=11, leading=14, spaceBefore=8, spaceAfter=3)
P = st("p", fontSize=10, leading=14.5, spaceAfter=6)
B = st("b", fontSize=10, leading=14.5, leftIndent=12, bulletIndent=2, spaceAfter=2)
CAP = st("cap", fontSize=8.5, leading=11, color=MUTE, spaceAfter=8)
CELL = st("cell", fontSize=8.8, leading=11.5)
CELLB = st("cellb", font="Helvetica-Bold", fontSize=8.8, leading=11.5)
HEAD = st("head", font="Helvetica-Bold", fontSize=8.8, leading=11.5, color=colors.white)
def bullets(items): return [Paragraph(x, B, bulletText="•") for x in items]
def table(rows, widths, head=True):
    data = [[Paragraph(str(c), HEAD if (head and r == 0) else (CELLB if ci == 0 else CELL)) for ci, c in enumerate(row)] for r, row in enumerate(rows)]
    t = Table(data, colWidths=[w * W for w in widths], repeatRows=1 if head else 0)
    s = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.5, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
    if head: s += [("BACKGROUND", (0, 0), (-1, 0), ACC)]
    s += [("ROWBACKGROUNDS", (0, 1 if head else 0), (-1, -1), [colors.white, SOFT])]
    t.setStyle(TableStyle(s)); return t
def img(path, width=W):
    from PIL import Image as PI
    w, h = PI.open(path).size; return Image(path, width=width, height=width * h / w)
class Skeleton(Flowable):   # the game's rest pose and joints, drawn to scale
    def __init__(self, h=84 * mm): super().__init__(); self.width = W; self.height = h
    def draw(self):
        c = self.canv; s = self.height / 1.95; ox = self.width * 0.24; oy = 4
        X = lambda x: ox + x * s; Y = lambda y: oy + y * s
        J = {"P / T": (0, 0.92), "H": (0, 1.47), "aL": (0.2295, 1.41), "aR": (-0.2295, 1.41), "eL": (0.2295, 1.12), "eR": (-0.2295, 1.12), "wL": (0.2295, 0.82), "wR": (-0.2295, 0.82), "lL": (0.10, 0.92), "lR": (-0.10, 0.92), "kL": (0.10, 0.47), "kR": (-0.10, 0.47)}
        c.setStrokeColor(LINE); c.setLineWidth(0.6); c.line(X(-0.6), Y(0), X(0.6), Y(0)); c.setFont("Helvetica", 7); c.setFillColor(MUTE); c.drawString(X(0.62), Y(0) - 2, "ground, y = 0")
        c.line(X(-0.6), Y(1.78), X(0.6), Y(1.78)); c.drawString(X(0.36), Y(1.78) + 3, "top of skull, y = 1.78")
        c.setStrokeColor(INK); c.setLineWidth(1.6)
        for a, b in (("P / T", "H"), ("aL", "eL"), ("eL", "wL"), ("aR", "eR"), ("eR", "wR"), ("lL", "kL"), ("lR", "kR"), ("aL", "aR"), ("lL", "lR")): c.line(X(J[a][0]), Y(J[a][1]), X(J[b][0]), Y(J[b][1]))
        for x in (0.10, -0.10): c.line(X(x), Y(0.47), X(x), Y(0.02))
        for x in (0.2295, -0.2295): c.line(X(x), Y(0.82), X(x), Y(0.69))
        c.circle(X(0), Y(1.64), 0.115 * s, stroke=1, fill=0)
        for n, (x, y) in J.items():
            c.setFillColor(ACC); c.circle(X(x), Y(y), 2.6, stroke=0, fill=1); c.setFillColor(INK); c.setFont("Helvetica-Bold", 7.5)
            c.drawString(X(x) + (5 if x >= 0 else -5 - c.stringWidth(n, "Helvetica-Bold", 7.5)) - (14 if n == "P / T" else 0), Y(y) + (10 if n == "P / T" else -10 if n in ("lL", "lR") else 3), n)
        c.setFont("Helvetica", 7.5); c.setFillColor(MUTE); c.drawString(X(0.45), Y(1.41) - 2, "his LEFT is +X"); c.drawString(X(-0.45) - 60, Y(1.41) - 2, "his right is −X")
        tx = self.width * 0.6; c.setFillColor(INK); c.setFont("Helvetica-Bold", 9); c.drawString(tx, self.height - 12, "Joint positions at rest (x, y, z)")
        rows = [("P hips, T torso", "0, 0.92, 0   (same point)"), ("H head", "0, 1.47, 0"), ("aL / aR shoulder", "±0.2295, 1.41, 0"), ("eL / eR elbow", "0.29 below the shoulder"), ("wL / wR wrist", "0.30 below the elbow"), ("lL / lR hip", "±0.10, 0.92, 0"), ("kL / kR knee", "0.45 below the hip"), ("feet, fingers", "no joints: rigid on shin and wrist")]
        c.setFont("Helvetica", 8.5)
        for i, (a, b) in enumerate(rows):
            y = self.height - 28 - i * 13; c.setFillColor(INK); c.setFont("Helvetica-Bold", 8.5); c.drawString(tx, y, a); c.setFont("Helvetica", 8.5); c.setFillColor(MUTE); c.drawString(tx + 88, y, b)
        y = self.height - 28 - len(rows) * 13 - 8; c.setFillColor(INK); c.setFont("Helvetica", 8.5)
        for i, line in enumerate(("Bhima only: a wider frame.", "Shoulders at ±0.2754, hips at ±0.12.", "Up is +Y. He faces +Z. Units are metres.", "Arms hang straight down (an I-pose),", "palms toward the thighs.")): c.drawString(tx, y - i * 12, line)
story = []
HS = ["yudhishthira", "bhima", "arjuna", "nakula", "sahadeva"]
story += [Paragraph("Character reference brief", H0), Paragraph("Kurukshetra: A Life — the pictures we need to build every character in 3D", SUB)]
story += [Paragraph("What this is", H1),
  Paragraph("Kurukshetra: A Life is a story game set in the Mahabharata. You live one life from childhood to old age beside the epic's people. The story is told in 2D paintings; the fights are played in real-time 3D, mostly on phones.", P),
  Paragraph("We are building every character as a 3D model. To do that well we need <b>reference pictures drawn by you</b>: each character, at each age the story shows them, in each kind of dress the story puts them in, drawn so that a modeller can build from them. This brief says exactly which pictures, how they should be drawn, and in what order.", P),
  Paragraph("We already have rough 3D placeholders of the five Pandavas, built without proper reference. They are shown throughout this brief so you can see the proportions, the dress logic and where we got it wrong. <b>They are a starting point to correct, not a style to match.</b>", P),
  img("line.jpg"), Paragraph("Our placeholders today: Sahadeva, Nakula, Arjuna, Bhima, Yudhishthira, in court dress.", CAP)]
story += [Paragraph("What we need from you, in short", H1)] + bullets([
  "<b>A character sheet for each look of each character</b>: the full figure from front, side and back, plus the head from front and side. One look per sheet.",
  "<b>Each character at each age</b> the story shows them: child, youth, grown, and old where the story reaches it.",
  "<b>Each kind of dress by scene</b>: at home, at court, in training, in the forest, in disguise, at war, in mourning.",
  "<b>Detail drawings</b> of crowns, jewellery, weapons and how each cloth is wound.",
  "<b>Flat colours</b>: a small row of swatches on every sheet."])
story += [Paragraph("Art direction", H1),
  Paragraph("Stylised, not photographic. The reference point is the classic Indian print tradition of the epics: strong clear figures, heroes bare-chested in unstitched cloth, a great deal of gold, saturated colour. Faces must have character and be told apart at a glance.", P)] + bullets([
  "<b>It must read small.</b> In a fight the camera is overhead and a hero is about 80 to 120 pixels tall on a phone. Silhouette, colour blocking and one signature feature per character matter more than fine detail.",
  "<b>It must also hold up close.</b> Every fight opens on a close shot of the face and chest.",
  "<b>Period dress.</b> Nothing is cut or sewn. A lower cloth (antariya) wound round the hips, drawn between the legs and tucked behind so it folds round each leg; an upper cloth or strap (uttariya); a sash (kayabandha). No trousers, no tailored shirts, no footwear for most.",
  "<b>Original faces.</b> Please invent every face. Do not base one on an actor or any real person.",
  "<b>Dignity.</b> These are revered figures for many players. Krishna, Draupadi, Kunti and Gandhari in particular should be drawn with care."])
story += [Paragraph("How to draw each sheet", H1),
  Paragraph("These rules are what make a drawing usable for 3D. A beautiful painting in a dramatic pose is much less useful to us than a plain, accurate one.", P),
  table([["On every sheet", "Why"],
    ["Full figure from the <b>front, the side and the back</b>, all at the same height, feet on one ground line", "The model is built by tracing these three views"],
    ["Standing straight, <b>arms hanging a little away from the body</b>, palms toward the thighs, feet slightly apart, face neutral", "This is the pose the model is built in. Arms pressed to the sides hide the waist and the cloth"],
    ["<b>No perspective, no foreshortening</b>, even flat light", "Perspective distorts proportions"],
    ["The <b>head again, larger</b>: front and side, and three-quarter if you can", "Faces carry the characters"],
    ["Hair drawn clearly <b>from the back</b>", "It is the most often guessed part"],
    ["<b>Cloth</b>: where it starts, how it winds, where it is tucked, where the ends fall. A small diagram is welcome", "Our placeholder cloth is the weakest part"],
    ["A row of <b>flat colour swatches</b>: skin, hair, main cloth, second cloth, gold, any gem colours", "The game colours each part from these"],
    ["The character's <b>height against a 180 cm line</b>", "So the cast is in scale with each other"],
    ["Weapons and anything held drawn <b>separately beside the figure</b>, not in the hand", "They are separate models"]],
    [0.56, 0.44])]
story += [Paragraph("Ages", H1),
  table([["Age group", "In the story", "Who needs it"],
    ["Child (about 6 to 12)", "Act I: childhood at Hastinapura and in the villages", "The player; the five Pandavas; Duryodhana and Dushasana; Karna; Ashwatthama"],
    ["Youth (about 13 to 17)", "Act II: training under the teachers, the tournament", "The same, plus Draupadi, Dhrishtadyumna, Ekalavya, Abhimanyu (who is never older)"],
    ["Grown (about 18 to 40)", "Acts III to V: court, the dice hall, exile", "Everyone"],
    ["At the war (mid-forties and older)", "Act VI: eighteen days at Kurukshetra", "Everyone who fights: the same person, harder and more worn"],
    ["Old", "Act VII and the elders throughout", "The player; Bhishma, Drona, Kripa, Vidura, Dhritarashtra, Gandhari, Kunti, Shakuni, Drupada, Virata"]],
    [0.2, 0.36, 0.44]),
  Paragraph("For each age we need the body's proportions (a child is not a small adult), the face, and how the hair is worn. A child or youth sheet can be simpler: front and side only.", P)]
story += [Paragraph("Dress by scene", H1),
  table([["Look", "Where in the story", "What it is"],
    ["At home", "Private scenes, any act", "At ease: lower cloth, sash or girdle, a necklace and armlets, hair loose. No crown"],
    ["Court", "Assemblies, the swayamvara, the Rajasuya, the dice hall", "Full dress: crown, all gold, upper cloth or shawl, the best cloth"],
    ["Student", "Act II, under the teachers", "Plain white or undyed cloth drawn up to the knee, sacred thread, hair tied up, no gold"],
    ["Forest", "After the house of lac; the thirteen years of exile", "Bark-dyed cloth, an animal hide over one shoulder, matted hair coiled on the head, a beard, no gold"],
    ["Disguise", "The year hidden at Virata's court (see the table of characters)", "Each of the six as someone else entirely"],
    ["War", "Act VI", "Armour over the chest and shoulders, crown or helmet, arm guards, full weapons; the cloth drawn up for fighting"],
    ["Mourning", "Act VII, after the war", "Plain white, no ornament, hair unbound"]],
    [0.13, 0.35, 0.52])]
story += [PageBreak(), Paragraph("The characters", H1),
  Paragraph("Three batches, in the order we would like them. \"Looks\" lists the dress each one needs; ages are in the table above.", P),
  Paragraph("Batch 1: the heart of the story", H2),
  table([["Character", "Who they are, and what must be unmistakable", "Looks needed"],
    ["Yudhishthira", "Eldest Pandava, the just king. Tall, slim, calm; a long face. Tall tiered crown. Spear", "Home, court, student, forest, disguise (Kanka, a courtier who plays dice), war, mourning"],
    ["Bhima", "The strongest man alive. Huge: deep chest, thick waist and neck. Broad stern face, great moustache. Mace with a lobed head", "Home, court, student, forest, disguise (Ballava, a cook and wrestler), war, mourning"],
    ["Arjuna", "The great archer. Athletic, wide back, narrow waist. Firm jaw. A diadem. The long bow Gandiva, two quivers", "Home, court, student, forest, disguise (Brihannala, a dance teacher in women's dress), war, mourning"],
    ["Nakula", "The handsome twin, master of horses. Slight, elegant, fine-featured. Sword", "Home, court, student, forest, disguise (Granthika, a horse-keeper), war, mourning"],
    ["Sahadeva", "The younger twin, wise and quiet. The slightest, youngest face. Sword", "Home, court, student, forest, disguise (Tantripala, a cowherd), war, mourning"],
    ["Draupadi", "Queen of the five. Dark-skinned, proud. From the dice hall until the war ends her hair is unbound", "Home, court (bride; queen), forest, disguise (Sairindhri, a queen's maid), mourning"],
    ["Krishna", "Dark blue-black skin, yellow silk, a peacock feather in the crown. Arjuna's charioteer; unarmed in the war", "Home, court, as charioteer at war"],
    ["Karna", "Born with golden armour and earrings; raised a charioteer's son. Proud, generous, wronged. Bow", "Youth at the tournament, court (as king of Anga), war (after giving the armour away)"],
    ["Duryodhana", "Eldest Kaurava, the rival king. Heavy-built mace fighter, rich in dress", "Court, student, war"],
    ["Bhishma", "The grandsire. Very old, tall, white hair and long white beard, white dress, pale armour", "Court, war"],
    ["Drona", "Brahmin teacher of arms. White beard, top-knot, sacred thread. Bow", "As teacher, war"]],
    [0.14, 0.5, 0.36])]
story += [Paragraph("Batch 2: the wider cast", H2),
  table([["Character", "Notes", "Looks"],
    ["Dushasana", "Duryodhana's brother; coarse, strong", "Court, war"], ["Shakuni", "The uncle from Gandhara; lean, sly, the dice in his hand", "Court, war"],
    ["Ashwatthama", "Drona's son; a jewel set in his forehead", "Student, war"], ["Kripa, Vidura", "Elders of the court: a teacher of arms; the wise minister, plainly dressed", "Court"],
    ["Dhritarashtra, Gandhari", "The blind king; the queen who binds her own eyes with cloth", "Court, mourning"], ["Kunti", "Mother of the Pandavas; a widow, in white", "Home, forest"],
    ["Balarama", "Krishna's elder brother: fair, blue cloth, a plough", "Court"], ["Abhimanyu", "Arjuna's son, sixteen, killed in the wheel formation", "Youth, war"],
    ["Ghatotkacha", "Bhima's son by Hidimbi: a giant, bald, fierce", "War"], ["Drupada, Dhrishtadyumna, Shikhandi", "King of Panchala and his children", "Court, war"],
    ["Satyaki, Jayadratha, Shalya, Virata, Uttara", "Kings and champions of the two sides", "Court, war"], ["Ekalavya", "The forest archer, dark, in black hide; later without his right thumb", "Youth, grown"]],
    [0.3, 0.52, 0.18]),
  Paragraph("Batch 3: the player and the people of the world", H2),
  table([["Who", "Notes"],
    ["The player", "A man and a woman version, each as child, youth, grown and old; each in home, student, forest and war dress. The player can be born in a palace, a village, among charioteers or among forest people, so the dress should be plain enough to belong anywhere"],
    ["The game's own people", "Charu (a lifelong friend, later a smith), Ugra (the miller's son, a rival), Mauni (a silent hermit teacher), a healer, a bard, a village child"],
    ["Rank and file", "Foot soldier, archer, chariot-warrior and charioteer of each army (Pandava and Kaurava, told apart by colour); palace guard; raider; brahmin; villagers, men and women"],
    ["Mounts and machines", "War chariot with a team of four, a king's umbrella and standard; a horse in war harness; a war elephant with its howdah"]],
    [0.22, 0.78])]
for h in HS:
    story += [PageBreak() if h in ("yudhishthira", "arjuna") else Spacer(1, 6), KeepTogether([Paragraph("Placeholder: " + h.capitalize(), H1), img("sheet_%s.jpg" % h),
      Paragraph("Left to right: at home, at court, at war, in the forest, as a youth, and court dress from behind. " + {
        "yudhishthira": "To correct: the shawl should be a full drape, not a band; the crown wants real ornament; in the forest and at war he should still read as the eldest.",
        "bhima": "To correct: he should be visibly the largest of the five; the armour is a plain shell and needs a design; the youth shown is the adult body.",
        "arjuna": "To correct: the stubble is a hard-edged shadow; the chains on the chest are plain bands; his bow and quivers are not shown here.",
        "nakula": "To correct: he reads too much like his brothers in body; he should be the handsome one.",
        "sahadeva": "To correct: he should look clearly the youngest and slightest."}[h], CAP)])]
story += [PageBreak(), Paragraph("Where our placeholders are weakest", H1)] + bullets([
  "<b>Bodies:</b> the four brothers other than Bhima are one body made thinner or thicker. We need each man's real proportions.",
  "<b>Faces:</b> built from simple shapes. We need real, distinct faces from the front and the side.",
  "<b>Cloth:</b> we have guessed how every cloth is wound. Please show it.",
  "<b>Armour, crowns and jewellery:</b> ours are plain shapes. We need designs.",
  "<b>Children and youths:</b> we have none; a youth today is a grown man with a top-knot.",
  "<b>Women:</b> none are built yet."]) + [
  img("faces.jpg", W * 0.9), Paragraph("Placeholder faces: Sahadeva, Nakula, Arjuna, Bhima, Yudhishthira.", CAP),
  img("act.jpg", W * 0.78), Paragraph("How the models are used: a sword cut, a bow drawn, the mace overhead, a spear thrust. Arms go fully overhead and legs lunge wide, so dress has to work in motion.", CAP)]
story += [Paragraph("Files", H1)] + bullets([
  "<b>Format:</b> PNG, at least 3000 pixels on the long side, on a plain light background. Layered source files as well if you can.",
  "<b>One look per sheet.</b> Name each file character_age_look, for example <i>bhima_grown_court.png</i>, <i>arjuna_youth_student.png</i>, <i>draupadi_grown_forest.png</i>.",
  "<b>Detail sheets:</b> character_detail, for example <i>bhima_mace.png</i>, <i>yudhishthira_crown.png</i>.",
  "<b>Line-ups:</b> one sheet showing the five Pandavas together in scale, and later one for each batch."]) + [
  KeepTogether([Paragraph("How much, and in what order", H1),
  table([["Step", "What", "Roughly"],
    ["1. A test", "Bhima, grown, court dress: one full sheet with head studies, mace and colour swatches", "1 sheet"],
    ["2. The five Pandavas, grown", "Court, war and forest for each, plus a line-up", "about 15 sheets"],
    ["3. The rest of batch 1, grown", "Draupadi, Krishna, Karna, Duryodhana, Bhishma, Drona in the looks listed", "about 15 sheets"],
    ["4. Ages and the other looks for batch 1", "Child and youth; home, student, disguise, mourning", "about 40 simpler sheets"],
    ["5. Batch 2, then batch 3", "As listed", "to be scoped after step 3"]],
    [0.26, 0.56, 0.18])]),
  Paragraph("We would like to see step 1 before anything else is drawn, so we can agree the style and the level of detail on one sheet.", P),
  KeepTogether([Paragraph("To agree before work starts", H1),
  table([["Item", "Status"], ["Fee, schedule and number of revision rounds", "To be agreed"], ["Rights to the delivered pictures and source files", "To be agreed"], ["Whether the pictures may also be used in the game's 2D screens", "To be agreed"], ["Reference pictures we like (sent separately)", "To be attached"], ["Contact for questions", "To be filled in"]], [0.62, 0.38])])]
def foot(c, d):
    c.saveState(); c.setFont("Helvetica", 8); c.setFillColor(MUTE); c.drawString(18 * mm, 10 * mm, "Kurukshetra: A Life — character art brief"); c.drawRightString(A4[0] - 18 * mm, 10 * mm, "Page %d" % d.page); c.restoreState()
doc = SimpleDocTemplate("Kurukshetra_Character_Art_Brief.pdf", pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=18 * mm, title="Kurukshetra: A Life - Character art brief", author="Kurukshetra: A Life")
doc.build(story, onFirstPage=foot, onLaterPages=foot)
