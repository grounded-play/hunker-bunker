# Song-Driven Choice Interstitial Image Plan

## Purpose

Each authored soundtrack cue can enter through a short illustrated interstitial. The interaction freezes behind it, the new song begins on the first flash, and a surreal late-1990s-RPG transition rapidly changes palette and silhouette before resolving into readable choices.

This should borrow the rhythm and emotional surprise of classic surreal RPG transitions without reproducing any specific game's patterns, characters, typography, or compositions.

## Shared Visual System

- **Master format:** 1920×1080, composed to crop safely to 16:10 and Steam Deck.
- **Art format:** one clean key illustration plus 3–5 derived flash variants. Do not generate every flash as unrelated art.
- **Choice-safe area:** lower 28% remains low-detail and dark enough for two to four choice cards. Never bake choice text into the image.
- **Transition length:** 0.75–1.4 seconds for ordinary interactions; 1.8–2.4 seconds for irreversible choices and endings.
- **Flash rhythm:** 6–10 changes at 8–12 fps, then a 180 ms luminance settle. Avoid full-white frames and prolonged high-frequency strobing; provide a reduced-flash accessibility mode using two crossfades.
- **Derived frames:** silhouette inversion, two-color posterization, channel offset, halftone/noise, one symbolic insert, then the full illustration.
- **World continuity:** retain one recognizable object from gameplay—helmet, camp lamp, turret, terminal, shell, or ship seat—so the card feels like the player's present moment rather than disconnected concept art.
- **Choice reveal:** options appear only after the image settles. The dangerous or irreversible option may pulse once, but the art must not secretly mark one answer as “correct.”
- **Exit:** the selected card color floods the image for 120 ms; gameplay returns through the chosen subject (door, eye, screen, wound, or horizon).

## Asset Naming

Use `public/interstitials/int_<track-number>_<slug>_key_v1.webp` for the master illustration and `_flash_01` through `_flash_04` only when a derived frame cannot be produced in the shader. Prefer shader-derived palette changes to reduce download size.

## Conversations and Characters

### 01 — Someone Is Still Alive

- **Trigger:** first survivor conversation; interactive introduction.
- **Key image:** the player's helmet rim in foreground, a lone survivor under a failing amber lamp, enormous black bunker space between them. A thin radio waveform joins the two figures.
- **Flash sequence:** black/ice-blue silhouette → amber face fragment → cyan waveform → full image.
- **Choice moment:** `LOWER WEAPON / ASK WHO THEY ARE / BACK AWAY`.
- **Return portal:** zoom through the radio waveform into the dialogue UI.

### 02 — Kaelen's Sleeping Machine

- **Trigger:** routine Kaelen conversation.
- **Key image:** Kaelen in profile beside a transformer shrine, cables forming a precise circuit halo; human hands remain dirty and tired.
- **Flash sequence:** blueprint line art → relay-red blocks → cyan diagnostic grid → full image.
- **Choice moment:** `ASK ABOUT THE GRID / OFFER TECH / LEAVE HIM WORKING`.
- **Choice bias to avoid:** do not make machine worship look obviously evil yet.

### 03 — The Math Is Beautiful Now

- **Trigger:** Kaelen detects infection or hears the Director.
- **Key image:** Kaelen's face divided by a translucent equation; one eye reflects the player, the other a vast electrical organism.
- **Flash sequence:** normal portrait → equation burn-in → facial halves swap colors → one-frame cable “crown” → settle.
- **Choice moment:** `TELL HIM THE TRUTH / DENY THE SIGNAL / ASK WHAT IT SAID`.
- **Irreversible tell:** a small infection glyph appears beside truth-sensitive choices, supplied by UI rather than baked art.

### 04 — Warmth Beneath the Ice

- **Trigger:** peaceful Martha conversation.
- **Key image:** Martha tending a steaming planter beneath fractured ice, orange condensation around her hands, player's cold glove entering frame.
- **Flash sequence:** frost negative → orange steam silhouette → green seedling close-up → full image.
- **Choice moment:** `REST / ASK ABOUT TALLOW / SHARE MEDICINE`.

### 05 — The Pipes Are Singing

- **Trigger:** spores, missing children, or Queen influence enters Martha's dialogue.
- **Key image:** Martha listening to a wall pipe as rootlike veins inside it form the suggestion of a child's profile.
- **Flash sequence:** pipe diagram → wet green veins → child silhouette for two frames → corrupted warm portrait.
- **Choice moment:** `LISTEN WITH HER / WARN HER / CUT THE PIPE OPEN`.

### 06 — Briggs Keeps the Ledger

- **Trigger:** routine Briggs conversation.
- **Key image:** Briggs at a steel table, casualty ledger open, turret shadows crossing the page like prison bars.
- **Flash sequence:** red alarm silhouette → white ledger lines → brass dog-tag insert → full image.
- **Choice moment:** `REPORT CONDITIONS / ASK FOR AMMO / ASK ABOUT THE NAMES`.

### 07 — Your Name Was Written Twice

- **Trigger:** Briggs suspects the player's infection.
- **Key image:** Briggs aiming low but ready; the ledger shows two blacked-out entries shaped like the player's silhouette.
- **Flash sequence:** muzzle-red block → duplicated player outline → black censorship bars → full image.
- **Choice moment:** `SUBMIT TO INSPECTION / LIE / REACH FOR YOUR WEAPON`.
- **Timing:** hold 400 ms longer before revealing choices so the gun registers.

### 08 — Dr. Nahl Remembers the Tissue

- **Trigger:** Nahl conversation.
- **Key image:** Nahl behind a scratched specimen screen; a preserved tissue sample mirrors the branching vessels visible in the player's wrist.
- **Flash sequence:** clinical white scan → magenta tissue map → X-ray hand → full cold-blue image.
- **Choice moment:** `ALLOW A SAMPLE / ASK FOR A CURE / HIDE THE SYMPTOMS`.

### 09 — Mothership Customer Support

- **Trigger:** routine system conversation.
- **Key image:** cheerful obsolete help-terminal mascot on a cracked CRT, surrounded by a catastrophic cockpit.
- **Flash sequence:** corporate cyan/yellow cards → smiling icon → error-red inversion → full image.
- **Choice moment:** `REQUEST HELP / REQUEST MISSION DATA / INSULT THE SYSTEM`.
- **Motion:** deliberately cheap horizontal wipe and one dropped frame.

### 10 — Mothership Is Not Feeling Well

- **Trigger:** glitched suit dialogue or infection increase.
- **Key image:** helmet HUD reflected inside itself recursively; the customer-service face is missing one eye and several pixels.
- **Flash sequence:** clean corporate screen → missing-note black frames → RGB separation → organic amber corruption → settle.
- **Choice moment:** `RUN DIAGNOSTIC / DISCONNECT IT / ASK WHO IS SPEAKING`.

### 11 — Her Voice Inside Your Helmet

- **Trigger:** first Queen contact.
- **Key image:** extreme close-up of the helmet visor; behind the player's reflected eyes is a vast amber maternal silhouette made of tendrils.
- **Flash sequence:** pupil close-up → amber womb circle → ice-blue helmet outline → Queen silhouette → full image.
- **Choice moment:** `ANSWER / STAY SILENT / INCREASE THE STATIC`.

### 12 — The Queen Makes a Reasonable Offer

- **Trigger:** assimilation or camp-culling offer.
- **Key image:** Queen and player seated across an impossible lounge table; one half is warm organic velvet, the other bunker steel, with a camp model between them.
- **Flash sequence:** elegant amber posterization → camp turns red → player/Queen silhouettes exchange sides → full image.
- **Choice moment:** `ACCEPT HER TERMS / BARGAIN / REFUSE`.
- **UI requirement:** show explicit projected consequences beneath each option.

## Enemy Encounters and Diplomacy

### 13 — A Snail Blocks the Hallway

- **Trigger:** standard Cybersnail encounter; interactive encounter card.
- **Key image:** low-angle corridor view, absurdly imposing snail centered beneath a tiny maintenance sign, shell hardware sparking.
- **Flash sequence:** comic yellow silhouette → threatening red shell close-up → radar rings → full image.
- **Choice moment:** `ATTACK / OBSERVE / ATTEMPT CONTACT / RETREAT`.

### 14 — Cold Enough to Think

- **Trigger:** Cryosnail encounter.
- **Key image:** frozen shell emerging from blue darkness, player's breath forming a question mark between them.
- **Flash sequence:** white thermal negative → crystalline facets → single black eye → full image.
- **Choice moment:** `BREAK THE ICE / WAIT / OFFER HEAT / RETREAT`.

### 15 — The Spores Know Your Name

- **Trigger:** Sporesnail encounter.
- **Key image:** bioluminescent snail surrounded by spores that spell an almost-readable version of the player's callsign.
- **Flash sequence:** green/purple liquid shapes → callsign fragments → mushroom-eye pattern → full image.
- **Choice moment:** `INHALE AND LISTEN / BURN THE CLOUD / SPEAK YOUR NAME / RETREAT`.

### 16 — We Could Avoid Doing This

- **Trigger:** negotiation layer for an intelligent enemy.
- **Key image:** weapon barrel and creature limb both lowered halfway, separated by a narrow strip of floor light.
- **Flash sequence:** alternating player/creature silhouettes → two waveform answers → neutral gray settle.
- **Choice moment:** context-specific `OFFER / THREATEN / OBSERVE / ATTACK`.

### 17 — It Understands the Gun

- **Trigger:** failed negotiation; non-choice escalation splash.
- **Key image:** creature eye reflecting the player's weapon as its body shifts into attack posture.
- **Flash sequence:** warning red → weapon reflection → crushed black frame → combat palette.
- **Choice moment:** none; show `NEGOTIATION FAILED` briefly and return directly to combat.

### 18 — The Creature Lets You Pass

- **Trigger:** successful diplomacy; result card.
- **Key image:** creature folded into an alcove while a thin warm-lit path opens behind it.
- **Flash sequence:** hostile palette drains away → gold path line → full image.
- **Choice moment:** `PASS QUIETLY / LEAVE A GIFT`; the second option may deepen future affinity.

## Camps Changing State

### 19 — Meridian Remembers You

- **Trigger:** entering upgraded friendly Meridian.
- **Key image:** busy repair silhouettes beneath cyan transformers; Kaelen recognizes the player from a raised catwalk.
- **Flash sequence:** dark grid → powered circuit paths → camp lights switch on sequentially → full image.
- **Choice moment:** no forced menu; optional `VISIT KAELEN / OPEN SERVICES / CONTINUE` navigation card.

### 20 — Tallow Keeps the Steam

- **Trigger:** entering upgraded friendly Tallow.
- **Key image:** warm communal table, steam hiding and revealing survivor faces, living plants overhead.
- **Flash sequence:** frost → steam-white mask → warm orange figures → full image.
- **Choice moment:** `REST / VISIT MARTHA / OPEN SERVICES / CONTINUE`.

### 21 — Vesper Sleeps in Shifts

- **Trigger:** entering upgraded friendly Vesper.
- **Key image:** one guard asleep beneath the turret while another watches the corridor; Briggs stands between both duties.
- **Flash sequence:** alarm red → black guard silhouettes → dim warm bunk light → full image.
- **Choice moment:** `REPORT TO BRIGGS / OPEN SERVICES / CONTINUE`.

### 22 — You Robbed the Only People Left

- **Trigger:** returning to a robbed camp.
- **Key image:** familiar camp composition now empty in the foreground, armed survivors watching from deep shadow.
- **Flash sequence:** friendly memory frame → inventory items vanish → weapon silhouettes snap in → cold full image.
- **Choice moment:** `APOLOGIZE / OFFER RESTITUTION / THREATEN THEM / LEAVE`.

### 23 — They Still Have Their Faces

- **Trigger:** first conversation with a turned camp.
- **Key image:** three familiar survivor faces under warm camp light, but all shadows connect into one organism.
- **Flash sequence:** individual portraits → shadows merge → fungal color intrusion → full image.
- **Choice moment:** `CALL THEIR NAMES / JOIN THE CHORUS / RAISE YOUR WEAPON / FLEE`.

### 24 — Nobody Says Goodbye

- **Trigger:** abandon/cull confirmation or aftermath.
- **Key image:** camp doorway closing while small personal objects remain in the foreground; no bodies and no spectacle.
- **Flash sequence:** portraits as empty outlines → door narrows → one muted red consequence frame → full image.
- **Choice moment:** pre-action `CONFIRM CULL / ABANDON THEM / GO BACK`; aftermath version has only `CONTINUE`.

## Boss Transition Cards

Boss tracks use encounter splashes, not menu choices. Choices occur in the preceding conversation card or the aftermath.

### 25 — Gigawatt Goliath

- **Key image:** colossal electrified shell fills the frame while tiny player silhouette stands inside a radar circle.
- **Flash language:** cyan lightning, yellow radar arcs, black industrial silhouette.
- **Final prompt:** `SURVIVE THE GRID` for 500 ms, then combat.

### 26 — Absolute Zero Has a Shell

- **Key image:** ancient shell visible beneath translucent glacier layers, eye opening below the player.
- **Flash language:** thermal negative, fractured white polygons, deep navy void.
- **Final prompt:** `THE ICE MOVED`.

### 27 — The Bloom That Hunts

- **Key image:** beautiful fungal bloom opens to reveal the predatory shell at its center.
- **Flash language:** saturated green/magenta petals, black bite silhouette, spore halftone.
- **Final prompt:** `DO NOT BREATHE`.

### 28 — Martha Runs Faster Now

- **Key image:** corrupted Martha crossing three positions in one frame, marimba-like pipework trailing from her body.
- **Flash language:** warm portrait fragments overtaken by green afterimages.
- **Final prompt:** `SHE REMEMBERS YOU`.

### 29 — Briggs Became the Barricade

- **Key image:** Briggs fused into a wall of armor and turret parts, still shielding empty bunks behind him.
- **Flash language:** military red blocks, ledger names, hydraulic black silhouettes.
- **Final prompt:** `HE WILL NOT MOVE`.

### 30 — Kaelen Is the Grid

- **Key image:** Kaelen suspended within transformer cables, body repeated at circuit junctions across the frame.
- **Flash language:** cyan schematic, obsessive five-node pulse, white electrical burn.
- **Final prompt:** `DISCONNECT THE MAN`.

### 31 — Mother of the Last World

- **Key image:** Queen curled around a miniature planet-like egg while the player stands at the cathedral-cave threshold.
- **Flash language:** amber womb circle, cold-blue bunker geometry, both palettes colliding into white-gold.
- **Final prompt:** `CHOOSE WHAT SURVIVES`; if a pre-battle bargain is possible, reveal it before combat begins.

## Major Emotional Scenes and Endings

### 32 — Black Box Stain

- **Trigger:** previous-run remains/resource recovery.
- **Key image:** previous suit slumped beside a black box; current player's hand overlaps the dead hand across runs.
- **Flash sequence:** old run monochrome → data fragments → hands align → full image.
- **Choice moment:** `RECOVER SUPPLIES / RECOVER MEMORY / LEAVE IT UNDISTURBED`.

### 33 — The Cave Was Breathing

- **Trigger:** first Sector Zero descent.
- **Key image:** elevator cage descending through rock that subtly resembles ribs and lungs.
- **Flash sequence:** depth numbers → rib silhouettes → one slow amber “breath” → full image.
- **Choice moment:** final threshold `DESCEND / CHECK EQUIPMENT / RETURN`.

### 34 — Four Seats, One Survivor

- **Trigger:** Scorched Sky ending.
- **Key image:** player alone in one lit cockpit seat, three empty seats reflected against the burning ice world.
- **Flash sequence:** four portraits → three extinguish → planet contracts in the window → settle.
- **Choice moment:** none after commitment; `TRANSMIT FINAL LOG / LEAVE IN SILENCE` may personalize credits.

### 35 — Contraband Sunrise

- **Trigger:** Carrier's Bargain ending.
- **Key image:** survivors facing a sunrise through the cockpit while hidden eggs glow beneath the deck plating.
- **Flash sequence:** hopeful gold horizon → amber egg pulse → smiles freeze for one frame → full image.
- **Choice moment:** `TELL THEM / KEEP FLYING`; both remain morally unresolved.

### 36 — We Escaped Together, Technically

- **Trigger:** Mixed Crew ending.
- **Key image:** human and altered passengers awkwardly sharing the cabin, divided by an aisle but mirroring poses.
- **Flash sequence:** warm human half → wet alien half → halves exchange colors → combined image.
- **Choice moment:** `SET A COURSE TO THE CORE / FIND AN EMPTY WORLD / LET THE CREW VOTE`.

### 37 — The Ice Gets Smaller

- **Trigger:** Clean Escape ending.
- **Key image:** surviving camp leaders at the cockpit window as the glacier shrinks behind them; player seen only as reflection.
- **Flash sequence:** camp motifs/colors arrive one by one → join into sunrise palette → full image.
- **Choice moment:** `GO HOME / ANSWER THE DISTRESS CALL / KEEP SEARCHING` as a postgame tone choice.

### 38 — Destination: Core Worlds

- **Trigger:** Full Brood ending.
- **Key image:** serene player/Queen silhouette in the cockpit, stars ahead, countless small amber egg reflections in the glass.
- **Flash sequence:** Queen lullaby pulse visualized as five rings → route map becomes vascular → beautiful major-color resolution.
- **Choice moment:** `SEND THE ARRIVAL SIGNAL / ARRIVE UNANNOUNCED`; neither choice reverses the ending.

## Production Priority

## Generated Master Status

| Track | Master asset | Status | Style references |
| --- | --- | --- | --- |
| 01 — Someone Is Still Alive | `/interstitials/int_01_someone_is_still_alive_key_v1.webp` | Generated and composition-checked | `title_key_art_v2.png`, Steam library hero |
| 11 — Her Voice Inside Your Helmet | `/interstitials/int_11_her_voice_inside_your_helmet_key_v1.webp` | Generated and composition-checked | `title_key_art_v2.png`, Queen encounter poster |
| 13 — A Snail Blocks the Hallway | `/interstitials/int_13_a_snail_blocks_the_hallway_key_v1.webp` | Generated and composition-checked | `title_key_art_v2.png`, Steam library hero |

All 38 soundtrack entries now have a 1920×1080 WebP first-frame master under
`public/interstitials/`. Tracks 01–31 are new key-art-guided masters or derived
character variants; tracks 32–38 reuse and normalize the approved Black Box,
cave, and ending poster art.

The generated masters intentionally contain no typography or controls. Their
lower 28% is reserved for localized HTML choice cards, while palette flashes
should be derived at runtime from the master rather than stored as additional
full-resolution images.

Optional animator renders use the predictable sibling path
`public/interstitials/motion/int_<track>_<slug>_motion_v1.webm`. The runtime
prefers that motion file when it loads, otherwise it automatically holds the
WebP first frame. No manifest edit is required when an animator adds a render.

### Tier A — Choice-critical masters

Produce first: 03, 05, 07, 10, 11, 12, 16, 22, 23, 24, 31, 32, 33, and 34–38. These cards carry irreversible information or define an ending.

### Tier B — Reusable character and encounter masters

Produce next: 01, 02, 04, 06, 08, 09, 13–15, and 18–21. Their compositions can be recolored and corrupted for later tracks.

### Tier C — Derived boss variants

Produce last: 25–30. Derive these from the corresponding character/enemy masters wherever possible so the transformation is emotionally legible and the art budget stays controlled.

## Minimum Implementation Contract

1. Audio begins during the first transition frame, not after the choice UI appears.
2. Gameplay simulation and combat input pause; ambient particles may continue at 20% speed.
3. Choice text is HTML/UI, localized independently from images.
4. Controller focus lands on a neutral information panel or `BACK`, never an irreversible choice.
5. Reduced-flash mode uses a dark crossfade, symbolic insert, and final art only.
6. Repeated conversations skip the full entrance after the first viewing and use a 250 ms palette wipe.
7. Every irreversible choice displays its concrete state change before confirmation.
8. Every image has a text-only fallback description for accessibility and missing-asset recovery.
