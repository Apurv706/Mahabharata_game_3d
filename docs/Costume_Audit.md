# Costume audit: what the epic says each person wears

Every named figure in the game was checked against the text of the Mahabharata itself (K. M. Ganguli's
translation, read section by section; links at the end). Where the game differed from the text, the game was
changed. Where the text is silent, the game's choice is kept and marked as the game's own.

The looks live in one place: `K.PUPPETS` in `js/ui/puppet.js`, read by both the 2D shadow puppets and the 3D
figures, plus `EXTRAS` in `js/g3/figure.js` for people who only appear in 3D. Standards, steeds and umbrellas are in
`js/ui/battle/view.js` (`STANDARD`, `STEEDS`, `UMBRELLA`, `CAR`).

## What changed

| Who | What the text says | What the game showed | Now |
|---|---|---|---|
| **Arjuna** | "his black-skinned boy"; "Kiritin from a diadem, resplendent like the sun"; "white horses decked in golden armour are always yoked unto my car" (Virata XLIV). Standard: "the ape of fierce face" (Drona CIV). | Mid-brown skin, a crown with a blue stone, brown horses in red trappings, a blue canopy. | Dark skin, a golden diadem, four white horses in gold trappings, no canopy, the ape on a gold field. |
| **Krishna** | "Robed in yellow silk", "dark as the lapis lazuli", driving "whip in hand" (Bhishma CVII). | Blue skin, yellow cloth, a peacock feather, empty hands. | Lapis-dark skin, yellow silk, a diadem (the peacock feather is later devotional art, not this text), a whip when he drives. |
| **Yudhishthira** | "a complexion like that of pure gold, possessed of a prominent nose and large eyes, and endued with a slender make" (Vana CCLXVIII). Steeds "of ivory hue and having black manes"; standard "a golden moon with planets around it" (Drona XXIII). | Brown skin; a plain crescent. | Golden skin; ivory steeds; the moon with five planets. |
| **Bhima** | "with long arms and tall as the full-grown Sala tree" (Vana CCLXVIII). Steeds "of dappled hue"; standard a "gigantic lion in silver" with lapis eyes (Drona XXIII). | Already the tallest and broadest; a gold lion. | Silver lion; grey dappled steeds. |
| **Karna** | Found as a child "furnished with golden mail"; at the tournament "with his natural mail and face brightened with ear-rings", "tall in stature like a golden palm tree" (Adi CXXXVIII). Indra comes for both while the Pandavas are in the forest (Vana CCCVII–CCCVIII). Standard: "an elephant-rope made of gold" (Drona CIV). | Golden mail and ear-rings at every age, including the war. | Golden mail and ear-rings until the war; from the war on, an ordinary cuirass and no ear-rings. Golden elephant-rope on dark red. |
| **Bhishma** | "with a white umbrella held over his head", "with a white headgear, with a white banner (on his car), and with white steeds", "looking like a white mountain" (Bhishma XX). "Palmyra-standard decked with five stars" (Bhishma XVII). | White crown, robe and beard; white horses; a cream canopy; a palm with no stars. | The same, with a white umbrella, a white banner and the five stars above the palm. |
| **Drona** | "dressed in white, with a white sacred thread, white locks, white beard, white garlands" (Adi, the tournament). "On a golden car unto which were yoked red steeds" (Bhishma XX). Standard: "a golden altar decked with a water-pot", with a black deer-skin (Bhishma XVII, Drona XXIII). | Cream cloth, grey forked beard, no thread or garland; brown car and horses. | White cloth, white locks and beard, white sacred thread and garland; a golden car, red steeds, the dark pot and altar on gold. |
| **Kripa** | Standard: "an excellent bovine bull" (Drona CIV). | A wheel. | A bull. He also wears the sacred thread. |
| **Duryodhana** | Standard: "an elephant adorned with gems" on a standard decked with gold (Drona CIV; "an elephant worked in gems", Bhishma XVII). A white umbrella (Bhishma XX). | A serpent. | A jewelled elephant on gold; a white umbrella. (The Sanskrit word is *naga*, which can also mean serpent; popular art uses the serpent. The game now follows the translation it cites.) |
| **Abhimanyu** | Steeds "of a tawny hue"; standard a "golden peacock" (Drona XXIII). | A tree. | A golden peacock; tawny steeds. |
| **Ashwatthama** | "The lion-tail ... decked with gold" (Drona CIV, Bhishma XVII). | A whole lion. | A lion's tail in gold. |
| **Jayadratha** | "A silver boar ... decked with golden chains" (Drona CIV). | A silver boar. | Unchanged. |
| **Dhrishtadyumna** | Out of the fire "with a crown on his head and his body encased in excellent armour, sword in hand, and bearing a bow and arrows" (Adi CLXIX). Steeds "of the hue of pigeons". | A small headdress, no armour. | A crown and a cuirass; pigeon-grey steeds. |
| **Draupadi** | "Her eyes were black, and large as lotus-petals, her complexion was dark, and her locks were blue and curly" (Adi CLXIX). In Virata's house she binds her hair "into a knotted braid" hidden under her cloth and wears "a single piece of a black and dirty though costly cloth" (Virata IX). | Brown skin, dark hair. | Darker skin, long blue-black hair; a second look for the year in hiding (one black cloth, hair hidden). |
| **Ekalavya** | "The Nishada of dark hue, of body besmeared with filth, dressed in black and bearing matted locks on head" (Adi CXXXIV). | Green cloth, a feather in his hair. | Dark skin, black dress, matted locks, no feather. |
| **Ghatotkacha** | "Arrow-like ears and high cheek-bones", "stiff hair rising upwards", "sunken belly", a "diadem on his head", eyes "red as copper"; his car "made of black iron covered with bear-skins"; a vulture on his standard (Drona CLV, XXIII). | A headband and a club. | A diadem, hair standing stiff, a black car, the vulture standard. |
| **The Pandavas in exile** | They "cast off their royal robes, attired themselves in deer-skins" (Sabha LXXVI). | Crowns and court dress at every age. | In the forest years (act 5) all five wear matted hair, a deer-skin over the shoulder and tawny cloth; the crowns return with the war. |
| **Arjuna in hiding (Brihannala)** | "Decked in the ornaments of women, and wearing large ear-rings and beautiful conch-bracelets overlaid with gold", "a braid to hang down from my head" (Virata II, XI). | Drawn as Arjuna the prince. | A woman's dress, ear-rings, conch bangles banded with gold, a long braid. Used for "Brihannala's chariot" in the cattle raid, under the ape standard with white horses. |
| **Bhima at the bride-choice** | The Pandavas come disguised as brahmins. | "The huge brahmin" was drawn as a soldier. | A huge brahmin: matted hair, sacred thread, deer-skin, a club. |
| **Gandhari, Dhritarashtra** | She bandages her own eyes; he is blind. | An eye-patch; ordinary eyes. | A white bandage across both eyes; eyes without pupils. |
| **Nakula, Sahadeva** | Nakula "the handsomest person in the whole world", who "fighteth with the sword". Nakula's standard a "Sarabha with its back made of gold", his steeds Kamboja horses "decked with the feathers of the green parrot"; Sahadeva's a "silver swan with bells" (Drona XXIII). | Swords (correct); no standards. | Standards and steeds as the text has them, on the cars that wait for them. |
| **Others on cars** | Satyaki "steeds of a silvery hue"; Shalya "an image like the presiding goddess of corn"; Somadatta's son "the sacrificial stake"; Vrishasena "a peacock made of gold" (Drona XXIII, CIV). | None. | Added. |
| **The player** | — | A peacock feather for those born in Mathura and a bird's feather for forest-born. | A plain band or top knot. The epic gives neither feather. |

## How everyone is dressed

The epic's people wear lengths of cloth, not cut and sewn clothes, and the 3D figures are now dressed that way (the
first build gave everyone trouser-like legs, and the women sleeves):

- **The lower cloth** (antariya) is wound round the hips with its pleats gathered in front. Fighting and working men
  draw it up between the legs so its border sits at the knee; kings, elders, brahmins and ascetics let it fall to the
  calf; women wear it to the ankle under a girdle of gold beads.
- **The chest is bare.** Men wear the upper cloth (uttariya) across from the left shoulder with its end down the back;
  women a breast-band and the upper cloth over the shoulder, and elder women draw it over the head.
- **A sash** is knotted at the left hip, its ends hanging.
- **Ornaments** in place of sleeves and shoes: armlets, bracelets or bangles, ear-rings for the crowned, anklets for
  the wealthy. Feet are bare.

**The look is taken from the 2D game's own paintings** (`art/p_*.webp`), so the 3D figures and the portraits agree:

- Cloth is cream handwoven cotton. Each person's own colour is the border of the cloth and the broad sash at the waist,
  which is clasped with a round gold boss, as in the portraits of Arjuna, Bhima and Bhishma.
- The upper cloth is broad, worn across the chest from the left shoulder; a teacher's is folded over the shoulder with
  the chest bare (Drona); an elder's or a king's is pinned with a gold brooch (Bhishma).
- Men's hair falls to the shoulders, with gold ear-rings; armlets and broad gold cuffs for the wealthy.
- Armour is bronze with a boss on the breast (Karna, Dhrishtadyumna). Crowns are rounded gold diadems, not tall cones.
- Dyed cloth is kept for those the text or the paintings give it to: Krishna's yellow silk, Balarama's blue,
  Ekalavya's black, Duryodhana's maroon, Draupadi's black cloth in hiding, bark-brown in exile.
- Soldiers wear the cream lower cloth with their host's colour in the turban, the upper cloth or crossed bands, and
  the sash, so the two hosts can still be told apart.

This follows the text's own words for dress (cloth, upper garment, ear-rings, armlets, garlands, girdle) and the general
account of early Indian dress in the history cited below; no single passage describes the drape, so the cut of it is
the game's reading.

## Marks that belong to one person

Read again for what sets each of the great ones apart (11 Nov), and what the figures now carry:

| Who | The mark | In the game |
|---|---|---|
| Krishna, Arjuna, Bhima, Yudhishthira, Nakula, Sahadeva | Each has his own conch: Panchajanya, Devadatta, "the huge conch" Paundra, Anantavijaya, Sughosha, Manipushpaka (Bhishma XXV). | A white conch hangs at each one's right hip. (Dhrishtadyumna carries one too, as his portrait has it.) |
| Balarama | "Clad in blue robes and possessed of a fair complexion", "whose banner bore the device of the palmyra palm, and who owns the plough for his weapon" (Shalya XXXIV). | Fair, in blue, the plough slung across his back; he still teaches with the mace. |
| Draupadi | Dragged "by her locks, so long and blue and wavy", "with hair dishevelled"; she leaves for exile "covering her face with her dishevelled hair" (Sabha LXVI, LXXVIII). | From the exile on her hair hangs loose and she wears no diadem. |
| Ghatotkacha | Born "bald-headed", his head like a water-pot, which is his name; "straight arrowy ears", "lips brown as copper" (Adi CLVII). In the war the text gives him stiff hair standing upward (Drona CLV). | The grown figure follows the war's description. The two passages differ. |
| Ekalavya | Gives his right thumb to Drona (Adi CXXXIV). | Not shown: the figures' hands have no fingers. |
| Already in place | Arjuna's diadem, dark skin and two quivers; Bhima the tallest and broadest, with the mace; Yudhishthira's spear; the twins' swords; Karna's mail and ear-rings until he gives them away; Bhishma all in white; Drona in white with the water-pot and thread; Ashwatthama's brow gem; Shakuni's dice; Gandhari's bandage; Dhritarashtra's blind eyes. | |

## Soldiers

The epic names the heroes' gear and says little about the rank and file, so the line's foot soldiers follow a
history of ancient Indian warfare instead: men "bare to the waist or [in] quilted cotton jackets", "thick coiled
turbans, sometimes tied under the chin", "cloth bands across the waist and chest", shields "often of hide", metal
armour for the elite. Two in three of the line now wear the coiled turban and crossed bands and carry a hide shield
painted with their host's colour; the rest keep the helmet and cuirass.

The long bow is from the same history: a bow "about as long as the archer", one end "rested on the ground". The
game's bows are now as tall as the men who draw them, and are drawn to the ear.

Archers fight from their cars. A hero who fights on foot (Bhima, Duryodhana and the other mace and sword fighters)
has left his car at the edge of the field in a war battle: it stands there under his standard, with his steeds and,
for a king, his umbrella.

## Kept, though not from the epic

- **White umbrellas for all the kings.** The passages read give the white umbrella to Bhishma and to Duryodhana. The
  game also holds one over Yudhishthira, Karna, Jayadratha and Shalya, as kings.

- **Blue for the Pandava host, red for the Kaurava host.** The text gives the hosts no colours. This is so that friend
  and foe can be told apart at a glance.
- **Two horses on an ordinary car, four on a hero's.** The text mostly gives heroes four.
- **The leather-puppet style** of the 2D figures (tall crowns, punched hems) is the art of tholu bommalata, not a
  description from the text.

## What was checked but could not be changed here

The painted portraits and scenes (`art/`) were looked at against the same passages. Most agree. These differ, and
need repainting rather than code:

- **Arjuna's portrait** has no diadem and a lighter skin than "black-skinned".
- **Karna's portrait** shows the golden mail and ear-rings, and is used in the war as well, after he has given them away.
- **Dhrishtadyumna's portrait** has no crown.
- **Ghatotkacha's portrait** has long hair where the text has it standing stiff. (His diadem, ear-rings and bear-skin are right.)

The 2D puppets take every change of colour, headgear, crown and weapon above. The sacred thread, garlands,
deer-skin, bangles and blindfold are drawn on the 3D figures only.

## Not verified

These are widely told, but the passage could not be fetched while this audit was made, so nothing was changed on
their account: the colour of Karna's horses; Balarama's blue robes (the game already has them); the gem on
Ashwatthama's brow (already there); Duryodhana's dress at the mace duel.

## Sources

The Mahabharata of Krishna-Dwaipayana Vyasa, translated by Kisari Mohan Ganguli:

- Virata Parva XLIV (Arjuna's names): https://mahabharataonline.com/translation/mahabharata_04044.php
- Virata Parva II, III, IX, XI (the disguises): https://mahabharataonline.com/translation/mahabharata_04002.php · https://mahabharataonline.com/translation/mahabharata_04003.php · https://mahabharataonline.com/translation/mahabharata_04009.php · https://mahabharataonline.com/translation/mahabharata_04011.php
- Vana Parva CCLXVIII (Draupadi describes her husbands): https://sacred-texts.com/hin/m03/m03268.htm
- Vana Parva CCCVII (Karna's mail and ear-rings): https://www.wisdomlib.org/hinduism/book/the-mahabharata-mohan/d/doc7590.html
- Adi Parva, the tournament (Drona in white): https://sacred-texts.com/hin/m01/m01137.htm
- Adi Parva CXXXVIII (Karna enters): https://mahabharataonline.com/translation/mahabharata_01139.php
- Adi Parva CXXXIV (Ekalavya): https://mahabharataonline.com/translation/mahabharata_01135.php
- Adi Parva CLXIX (Dhrishtadyumna and Draupadi from the fire): https://mahabharataonline.com/translation/mahabharata_01170.php
- Sabha Parva LXXVI (deer-skins): https://sacred-texts.com/book/the-mahabharata-book-2-sabha-parva/shell/section-lxxvi
- Bhishma Parva XVII, XX, CVII (the standards; Bhishma in white; Krishna): https://mahabharataonline.com/translation/mahabharata_06017.php · https://mahabharataonline.com/translation/mahabharata_06020.php · https://mahabharataonline.com/translation/mahabharata_06107.php
- Drona Parva XXIII (steeds and standards): https://www.ibiblio.org/sripedia/ebooks/mb/m07/m07023.htm
- Drona Parva CIV (standards): https://mahabharataonline.com/translation/mahabharata_07101.php
- Drona Parva CLV (Ghatotkacha): https://www.wisdomlib.org/hinduism/book/the-mahabharata-mohan/d/doc493143.html

- Bhishma Parva XXV (the conches): https://mahabharataonline.com/translation/mahabharata_06025.php
- Shalya Parva XXXIV (Balarama): https://mahabharataonline.com/translation/mahabharata_09034.php
- Sabha Parva LXVI, LXXVIII (Draupadi's hair): https://mahabharataonline.com/translation/mahabharata_02066.php · https://mahabharataonline.com/translation/mahabharata_02078.php
- Adi Parva CLVII (Ghatotkacha's birth): https://www.wisdomlib.org/hinduism/book/the-mahabharata-mohan/d/doc4152.html

Soldiers and the bow: World History Encyclopedia, "Ancient Indian Warfare": https://www.worldhistory.org/Indian_Warfare/
