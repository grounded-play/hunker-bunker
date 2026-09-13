# Blender Ending Scene Blocks and Shot List

Status: production brief | Owner: cinematic/animation + narrative | Updated: 2026-09-12 | Review: animatic approval before final lighting or full-resolution rendering

## Purpose

This brief defines the staging, reusable sets, asset assignments, camera plan,
timing, and shot-by-shot action for the five mechanically live Act 2 endings
that do not yet have bespoke videos:

- `MOTHERSHIP_INFECTION`;
- `ALIEN_EXODUS`;
- `OUTED_ESCAPE`;
- `FAILED_CARRIER`;
- `EMPTY_HUSK`.

It expands Phase 5 of the
[Blender pre-rendered animation production plan](blender-prerendered-animation-plan-2026-09-12.md).
The scene design follows the current four-seat manifest, ending conditions,
departure lines, and linchpin consequences in `src/act2.js` rather than treating
the endings as interchangeable escape montages.

## Creative and technical constraints

- Target **6.5-8.0 seconds at 24 fps**. The five existing endings run about
  6.2-6.8 seconds, so these should feel like members of the same family.
- Use 1920x1080 PNG sequences as masters and encode delivery WebM files.
- Do not bake titles, subtitles, or UI into the render. Runtime owns text and
  accessibility presentation.
- Favor 3-4 strong compositions over rapid coverage. Every shot must read on a
  Steam Deck without relying on small monitor text.
- Keep camera motion restrained: slow dolly, short track, or controlled rack
  focus. Avoid handheld motion except the containment breach.
- Use a new headless Blender process and a scene-specific `.blend`. Never reset
  or reuse an artist's open interactive Blender scene.
- Render greybox animatics at 960x540/24 fps before materials, simulation, or
  final lighting.
- The three departure lines already play before the cutscene. The video should
  reveal and deepen their meaning, not repeat them as literal captions.
- Final-quality frames use **Cycles**, not Eevee. Eevee remains allowed for
  greybox animatics and fast blocking reviews only.
- The locked visual direction is **neo-Gothic cyber-biohorror post-punk**:
  cathedral mass and ritual symmetry violated by wet organic systems, presented
  with the abrasive restraint of an underground late-1970s/early-1980s record
  sleeve rather than glossy space opera.

## Visual thesis: the ship as a desecrated cathedral

Every location should feel engineered by people who converted religious
architecture into survival machinery:

- structural ribs become nave columns and pointed arches;
- pressure doors read as iron rood screens;
- cable bundles hang like flayed tendons or votive cords;
- medical beds align like funerary slabs;
- passenger restraints resemble choir stalls;
- diagnostic panels become cold stained glass made from telemetry;
- conduits and resin growths occupy the architecture like invasive organs;
- the shuttle aisle is a processional path whose three seats are the story's
  secular altar.

The post-punk layer prevents the Gothic treatment becoming ornate fantasy:
surfaces are hard, cheap, repainted, scratched, photocopied, bolted, and
institutional. Use black negative space, dirty white strip light, oxidized
metal, hazard typography in runtime overlays, exposed fasteners, taped cable,
and one confrontational accent color per outcome. Avoid polished chrome,
luxury spaceship curves, steampunk filigree, and decorative skulls.

The biohorror layer is most effective when architecture and anatomy almost—but
not quite—share a design language. Resin should mimic weld seams, veins should
follow wire routes, breathing membranes should move at machinery cadence, and
mechanical locks should close like jaw joints. Do not cover every surface in
flesh. One anatomically suggestive violation in a severe human space is more
unsettling than undifferentiated gore.

## Composition grammar

### Shape language

- Use pointed arches, converging ribs, and strong central vanishing points for
  institutional power, fate, and the Queen's influence.
- Break symmetry with a single organic diagonal when infection or containment
  enters the frame.
- Frame people through doors, chair backs, hanging cable, and glass so they
  appear confined even in wide shots.
- Reserve circles for biological agency: eyes, eggs, scanner apertures, hive
  mouths, and infection pulses. Human machinery stays rectilinear.
- Keep the three passenger positions visible whenever possible. Empty space or
  altered occupancy must read before facial acting.

### Camera behavior

- Human systems use locked-off frames, straight tracks, and rectilinear
  compositions.
- Alien alliance uses slow, buoyant arcs and gentle parallax.
- Hidden infection uses an almost imperceptible creeping push that the audience
  feels before noticing.
- Containment failure is the only sequence allowed handheld translation,
  rolling-shutter-like skew, or a broken horizon.
- Isolation uses delayed reframing: let the subject almost leave the shot
  before the camera reluctantly follows.

### Lens and focus language

- 24-32 mm: architecture dominates the characters; use for nave/hangar and
  exterior fate shots.
- 35-50 mm: truthful cabin geography and ensemble blocking.
- 65-100 mm: surveillance, suspicion, skin, frost fractures, and mechanical
  details.
- Use shallow depth of field only to reveal information through a deliberate
  rack focus. Passenger occupancy, major silhouettes, and action geography
  should not disappear into fashionable blur.
- Use foreground occlusion as an editorial device: ribs, beds, restraints, and
  glass can create in-camera wipes that join spaces without frantic cutting.

### Aspect and safe composition

Render 1920x1080 but compose against a 2.39:1 center matte during layout. Keep
critical faces, seat occupancy, infection tells, and poster subjects within a
16:9 safe region so the runtime can display the uncropped master. The wider
guide creates severe horizontal negative space while retaining delivery
flexibility. Do not bake letterbox bars into the video.

## Cycles final-render and compositing recipe

### Render baseline

- Blender 5.2.1 LTS, `--background --factory-startup`, Cycles path tracing.
- Render 1920x1080 at 24 fps to 16-bit half-float OpenEXR multilayer masters;
  derive review PNGs and final video from the EXRs. PNG remains acceptable for
  the first pipeline proof, but EXR is the final cinematic source of truth.
- Use GPU compute when the render host is pinned and verified; keep a CPU
  compatibility preset for reproducibility and farm fallback.
- Start at 256 samples, adaptive sampling enabled at a conservative threshold,
  and raise only shots with unresolved volumetrics, glass, or emissive noise.
- Use OpenImageDenoise on diffuse/specular component passes, not as a substitute
  for adequate sampling. Inspect faces, fine cables, frost, and film grain for
  temporal boiling.
- Clamp indirect fireflies conservatively; never flatten the sharp practical
  highlights that define the post-punk lighting.
- Use motion blur sparingly: 180-degree shutter as a ceiling, reduced for
  diagnostic inserts and the containment crack so evidence remains readable.
- Pin seed, bounces, transparent-film behavior, color management, and denoising
  settings in each scene manifest.

### Path-traced lighting

- Motivate nearly every light from a visible practical: fluorescent coffers,
  surgical bars, warning cages, console glass, launch flame, or hive organs.
- Build Gothic volume through narrow top light and long pools of darkness, not
  uniform ambient fill.
- Give skin and resin distinct subsurface profiles. Human skin remains cool and
  restrained; alien membranes scatter color deeper and appear faintly alive.
- Use micro-wetness selectively on resin, lips, hoses, and fresh condensation.
  Keep uniforms, dust, and painted steel dry so material contrast survives.
- Use light linking or carefully flagged blockers where necessary to keep rim
  light off unrelated set walls and preserve silhouette separation.
- Volumetrics are localized: scanner haze, coolant vapor, airborne ice, and
  spore bloom. The entire ship should not sit in generic fog.

### Recommended render passes

Output Combined, Diffuse Direct/Indirect/Color, Glossy Direct/Indirect/Color,
Transmission, Volume Direct, Emission, Shadow, Ambient Occlusion, Mist, Z,
Vector, Normal, Cryptomatte Object, Cryptomatte Material, and named light-group
passes for:

- `human_cold`;
- `warning_amber_red`;
- `infection_green`;
- `alien_alliance`;
- `exterior_environment`.

Cryptomattes must isolate operator, each passenger, glass/partition, pod/egg,
resin, atmosphere, shuttle, and background. This allows precise final shaping
without rerendering a full sequence to correct one story accent.

### Compositor treatment

- Work scene-referred through AgX and lock the approved contrast/look transform
  across the five-film family.
- Grade toward crushed charcoal rather than absolute clipped black; retain just
  enough toe detail to read Gothic structure.
- Use restrained halation only around hard practicals and biological emission.
- Add subtle gate weave, exposure breathing, chromatic misregistration at the
  extreme frame edge, and monochrome grain to evoke post-punk optical texture.
  These effects must be temporally coherent and barely visible in motion.
- Use lens distortion asymmetrically and sparingly. Infection shots may carry a
  one- or two-pixel green-channel drift; clean human shots remain registered.
- Bloom/glare should produce narrow streaks or dirty bloom from practicals, not
  a global video-game glow.
- Use a very soft vignette shaped by set architecture rather than an obvious
  circular overlay.
- Build atmosphere from the Volume and Mist passes; do not reduce contrast by
  laying uniform smoke over the Combined pass.
- Final output receives controlled 35 mm-style grain after resizing. Posters
  use the same grade but may increase local contrast for thumbnail clarity.

### Advanced techniques to use with narrative purpose

| Technique | Approved use |
| --- | --- |
| Split diopter composition | `OUTED_ESCAPE`: operator and armed survivors both sharp across the partition |
| Cathedralesque one-point perspective | Mothership dock and cabin masters; turns the aisle into judgment/procession |
| Motivated in-camera wipes | Beds, ribs, seats, and hatch edges bridge shots while preserving geography |
| Rack-focus reveal | Hidden collar infection, failing coolant crack, Nahl's hull-song response |
| Negative-space hold | `EMPTY_HUSK`: empty seats and the shrinking shuttle become the subject |
| Dolly zoom, extremely restrained | Final `MOTHERSHIP_INFECTION` airlock shot only, to make the mothership appear to inhale |
| Dutch roll / horizon fracture | `FAILED_CARRIER` after the pod moves; nowhere else |
| Reflection staging | Scratched quarantine glass and pod reflections reveal reactions without extra coverage |
| Match cuts by shape | Hive apertures to alien eyes/faces; coolant crack to branching resin; three exterior signals to three seats |
| Light-driven cut | Scanner sweep, lock spark, warning rotation, and dying beacon motivate edits without music-video cutting |

Avoid drone-like fly-throughs, speed ramps, excessive anamorphic flares,
unmotivated orbiting, constant shallow focus, glitch overlays, and generic
digital chromatic aberration. The style should feel authored in camera and
light before compositing effects are added.

## Reusable set package

Build these four sets once. Each ending changes lighting, dressing, occupants,
and camera placement rather than inventing a new ship interior.

### SET-A — escape shuttle cabin

```text
                         FORWARD / COCKPIT
                 +---------------------------+
                 |  PILOT     CONSOLE        |
                 |   P1          C1           |
                 |                           |
 PORT / HUMAN    | S1   S2   AISLE   S3      | STARBOARD / ALIEN
                 |                           |
                 |---- optional partition ---|
                 | CARGO HATCH        S4      |
                 +---------------------------+
                         AFT / CAMERA BAY
```

- `P1` is always the operator.
- `S1-S3` are the three available passenger seats; their occupancy is the
  visual statement of the ending.
- `S4` is a low jump seat or empty restraint visible in deep compositions.
- The optional partition crosses behind the cockpit and can become ballistic
  glass, an energy field, or an open frame.
- Use chunky foreground ribs to hide the modest environment kit and create
  motivated wipes between compositions.

### SET-B — shuttle cargo compartment four

```text
                 +---------------------------+
                 | COOLANT | containment POD |
                 | MANIFOLD|       E1         |
                 |---------+-----------------|
                 | narrow service aisle      |
                 | PASSENGER DOOR      CAMERA|
                 +---------------------------+
```

Compartment four is intentionally cramped. `E1` is the egg/container hero
position. Coolant vapor travels from the upper port manifold down across the
pod so gravity and failure direction remain legible.

### SET-C — mothership medical dock

```text
       DEEP HANGAR / MOTHERSHIP INTERIOR
 +------------------------------------------------+
 | scanner arch     BED 1    BED 2    BED 3       |
 |                                                |
 | shuttle ramp ===== clean transfer lane =====>  |
 |                  OPERATOR                       |
 | CAMERA TRACK                         AIRLOCK    |
 +------------------------------------------------+
```

The dock begins clinically symmetrical. Infection introduces the only organic
asymmetry: a faint green pulse hidden under the operator's collar and, in the
last shot, a nearly subliminal pulse entering a wall conduit.

### SET-D — exterior ice launch

One reusable launch tableau contains a glacier chasm, a small landing cradle,
three camp beacon positions, distant hive apertures, blowing ice, and a dark
sky dome. The shuttle travels on the same spline for every ending. Change which
beacons answer, what follows the shuttle, and the final color temperature.

## Asset assignment and build gaps

### Existing repository assets to use directly or as kitbash sources

| Role | Candidate assets |
| --- | --- |
| Operator | base Scout/Tank/Engineer runtime rig or the selected canonical class rig |
| Human passengers | `npc_civilian_miner.glb`, `npc_civilian_researcher.glb`; use a restrained material/helmet variation for the third body |
| Allied aliens | `npc_nahl.glb`, `npc_alien_vey.glb`, `npc_alien_rhun.glb` |
| Infection authority/silhouette | `npc_queen.glb` or `queen.glb` |
| Medical dock | `prop_medical_bed.glb`, `prop_vital_monitor.glb`, `prop_diagnostic_console.glb`, `prop_surgical_cart.glb` |
| Cargo containment | `prop_icey_thermal_pod.glb`, `prop_hive_resin_sac.glb`, `prop_biomech_incubator.glb`, `prop_o2_filter_vat.glb` |
| Cabin/cargo dressing | `prop_chair_operator_wrecked.glb`, `prop_conduit_hub.glb`, `prop_conduit_junction_box.glb`, `prop_light_cluster_dripping.glb`, `prop_security_barricade.glb` |
| Empty-world evidence | `body_empty_exosuit.glb`, `body_frozen_human.glb`, cave bones, tents/camp props, broken class ships |
| Animation sources | Mixamo locomotion, idle, injured, gesture, and creature packs already cataloged in `docs/animation-actions-master-catalog.md` |

### Required kitbash/build work before final animation

1. **Intact shuttle exterior:** no clearly named intact escape-shuttle GLB was
   found. Build a low/medium-detail hero hull by repairing or combining the
   broken Scout/Tank/Engineer ship assets. It only needs to hold up in wide and
   medium exterior shots.
2. **Modular cabin shell:** build walls, ribs, ceiling strips, three passenger
   restraints, one pilot station, partition rails, and an aft cargo hatch.
3. **Mothership hangar shell:** a floor, airlock, scanner arch, luminous ceiling
   strips, and deep-background geometry. Medical props provide the detail.
4. **Contained egg:** combine the thermal pod/incubator with the hive resin sac;
   do not model a new creature unless the silhouette fails the animatic.
5. **Planet/exterior matte:** simple glacier geometry, volumetric snow, beacon
   cards, and a star field are sufficient because shots remain wide.

These are production dependencies, not reasons to postpone blocking. Greybox
all five endings with cubes, chairs, and proxy characters first.

## Shared visual grammar

| Meaning | Light/motion treatment |
| --- | --- |
| Human systems / apparent safety | cold white and cyan; stable horizontal movement |
| Queen/infection | restrained organic green; subcutaneous pulse rather than a large glow |
| Containment warning | amber moving toward red only after failure becomes certain |
| Alien alliance | cyan, amber, and green accents coexisting without contamination flicker |
| Isolation/death of possibility | desaturated blue-black, failed practicals, large negative space |

Use the same operator costume and shuttle architecture in all five scenes.
Continuity makes the changed passenger arrangement and outcome more meaningful.

### Outcome-specific palette and texture

| Ending | Dominant palette | Accent | Surface/optical character |
| --- | --- | --- | --- |
| Mothership Infection | surgical dirty white, blue-black | concealed bile green | clean symmetry with one organic misregistration |
| Alien Exodus | deep indigo, oxidized silver | three-part cyan/amber/green harmony | widest latitude, gentle halation, breathable shadows |
| Outed Escape | gunmetal, nicotine grey | rotating quarantine red | scratched glass, doubled reflections, hard divisions |
| Failed Carrier | cold iron and frost blue | amber decaying into arterial red/green | wet highlights, unstable vapor, fractured horizon |
| Empty Husk | blue-black, ash grey | one exhausted tungsten point | coarse grain, near-static frame, maximal negative space |

## Sequence 01 — Mothership Infection

**Narrative job:** the rescue appears clean, but the operator silently carries
the infection onto a populated mothership. The reveal belongs to the audience,
not the human passengers.

**Duration:** 7.5 seconds / 180 frames.
**Primary sets:** SET-C, with the SET-A ramp edge visible.
**Scene file:** `art/source/blender-prerenders/scenes/ending_mothership_infection.blend`
**Performance:** medical orderlies/passengers remain calm; the operator never
reacts to the hidden pulse.

### Blocking

- Three sleeping human passengers lie parallel on medical beds, heads toward
  the airlock and faces readable in profile.
- The operator walks down the transfer lane between beds and camera, creating
  foreground occlusion for the collar reveal.
- The scanner arch sits just beyond the shuttle ramp. It shows a clean cyan
  sweep as the operator passes.
- The final infection pulse exits behind the operator into a wall conduit in
  deep background; nobody is looking at it.

### Shot list

| Shot | Time / frames | Camera rig & optics | Action and composition | Assets / animation | Transition |
| --- | --- | --- | --- | --- | --- |
| MI-01 | 0:00-1:18 / 0-42 | `CAM_MI_01` · 28 mm f/2.0 wide, low track right; exact one-point perspective | Shuttle ramp opens beneath ribbed hangar arches like a chapel door. Three medical slabs cross frame in ritual symmetry while the operator enters through the scanner. The cyan scan reads clean; a foreground IV standard creates a thin cruciform silhouette without religious ornament. | cabin ramp, hangar shell, three beds/monitors, operator walk; `human_cold` dominant | Hard cut on scanner sweep completion |
| MI-02 | 1:18-3:06 / 43-78 | `CAM_MI_02` · 50 mm f/1.8 lateral dolly, practical-lit profile | Beds wipe through foreground: sleeping survivors, stable vitals, no panic. Overhead surgical bars strobe slowly across the operator like passing nave bays. Human faces receive soft cold light; the operator intermittently vanishes into black. | civilian breathing, monitors, operator walk; bed-edge in-camera wipes | Final bed frame wipes lens into macro close-up |
| MI-03 | 3:06-5:12 / 79-132 | `CAM_MI_03` · 85 mm f/1.4 collar macro, shallow focus, creeping 3% push | Camera settles behind the operator's neck. Focus leaves the clean scanner and finds a hair-thin subcutaneous green branch that pulses once along a cable-like route. Add a one-pixel green-channel misregistration only at pulse maximum. Operator remains composed. | operator rig, subsurface infection mask, restrained emission/light group | Rack focus through collar reflection to background conduit |
| MI-04 | 5:12-7:12 / 133-180 | `CAM_MI_04` · 35 mm f/2.4 deep locked frame with an extremely restrained dolly zoom | Operator and beds pass through the pointed airlock. As iron-jaw doors close, the mothership architecture seems to inhale: background arches expand almost imperceptibly while one green pulse enters the wall and propagates beyond sight. | airlock, conduit hub, emissive pulse, localized haze | Cut to charcoal-black one beat after pulse extinction |

**Poster frame:** MI-03 at the first visible collar pulse, with the clean scanner
behind it.
**Sound handoff:** sterile air, gurney wheels, scanner chirp, then one almost
inaudible wet electrical pulse. No Queen body or overt monster sting.

## Sequence 02 — Alien Exodus

**Narrative job:** all three hives leave as allies; the Queen is rejected and
her control fades behind them. This should be the warmest and most expansive
of the five sequences.

**Duration:** 8.0 seconds / 192 frames.
**Primary sets:** SET-D then SET-A.
**Scene file:** `art/source/blender-prerenders/scenes/ending_alien_exodus.blend`
**Performance:** the aliens are distinct passengers, not a monster crowd:
Nahl is gentle and resonant, Vey attentive, Rhun physically protective.

### Blocking

- Operator pilots at P1.
- Nahl occupies S1 near the hull, Vey S2 centered behind the pilot, and Rhun S3
  nearest the cargo hatch as a protective rear guard.
- The Queen remains planetside as a distant signal/silhouette only. She never
  shares frame space with the allied passengers.
- Three hive apertures answer the launch with separate restrained light pulses.

### Shot list

| Shot | Time / frames | Camera rig & optics | Action and composition | Assets / animation | Transition |
| --- | --- | --- | --- | --- | --- |
| AE-01 | 0:00-1:20 / 0-44 | `CAM_AE_01` · 32 mm f/2.2 exterior three-quarter wide, slow crane through foreground ice pinnacles | Shuttle rises from a cradle shaped by ruined buttresses. Three circular hive apertures pulse cyan, green, and amber; a harsher Queen-green signal claws upward and breaks against the ship's cold rectilinear silhouette. Ice foreground produces cathedral-scale parallax. | shuttle, ice set, hive lights, distant Queen silhouette, volumetric snow | Match cut three apertures to three passenger silhouettes |
| AE-02 | 1:20-4:00 / 45-96 | `CAM_AE_02` · 40 mm f/1.8 symmetrical aisle dolly, gentle floating head | Track through the shuttle's iron choir stalls: Rhun braces aft like a living shield, Vey watches the stars, Nahl touches the hull. The move ends on the operator. All three non-human occupants remain readable in layered depth, with distinct color accents that never merge into infection green. | Nahl, Vey, Rhun, operator; breathing/look/brace gestures; `alien_alliance` groups | Nahl's curved hand and a circular window motivate shape cut |
| AE-03 | 4:00-5:20 / 97-140 | `CAM_AE_03` · 70 mm f/1.4 profile close-up with controlled rack focus | Nahl's fingers settle into a riveted seam. The wall answers with a low bioluminescent waveform, turning industrial fasteners into a momentary musical staff. Focus travels from hand to operator's calm reflected eyes. | Nahl subtle gesture, subsurface fingertip, emissive hull ripple, operator head turn | Hull ripple stretches into a star streak |
| AE-04 | 5:20-8:00 / 141-192 | `CAM_AE_04` · 24 mm f/2.8 exterior rear wide, slow arcing pull-away | Shuttle clears atmosphere into open negative space. Below, the Queen's jagged signal collapses between black ice spires while three warm cabin apertures remain. The camera arc is the only openly graceful move in the five endings. | shuttle, planet matte, stars, signal VFX, clean motion blur | Long silver-to-black fade |

**Poster frame:** AE-02 with all three allied silhouettes readable around the
operator.
**Sound handoff:** launch rumble resolves into three tonal hull resonances; no
triumphal brass and no creature roar.

## Sequence 03 — Outed Escape

**Narrative job:** the survivors know the operator is infected and board anyway.
The flight is cooperation without trust, aimed at quarantine rather than home.

**Duration:** 7.0 seconds / 168 frames.
**Primary set:** SET-A with ballistic partition installed.
**Scene file:** `art/source/blender-prerenders/scenes/ending_outed_escape.blend`
**Performance:** weapons remain controlled and pointed down. The threat is the
absence of trust, not an imminent firefight.

### Blocking

- Operator alone at P1 on the forward side of the partition.
- Three human passengers occupy S1-S3 aft, forming a shallow triangle so every
  face and lowered weapon is readable.
- Partition controls are on the passenger side. Briggs/civilian proxy closes
  the lock deliberately after everyone is aboard.
- A red quarantine beacon sweeps across both groups but the glass prevents them
  from sharing the same uninterrupted light.

### Shot list

| Shot | Time / frames | Camera rig & optics | Action and composition | Assets / animation | Transition |
| --- | --- | --- | --- | --- | --- |
| OE-01 | 0:00-1:16 / 0-40 | `CAM_OE_01` · 35 mm f/2.0 severe symmetrical master, center partition rail splitting frame | Operator faces forward beyond the open iron screen. Three survivors sit aft like a hostile tribunal, rifles low. Empty vertical space above them forms a dark apse; nobody moves when engines engage. | operator, three civilians/leader proxy, cabin, weapons, dirty-white practicals | Partition descends through exact frame center |
| OE-02 | 1:16-3:08 / 41-80 | `CAM_OE_02` · 55 mm f/1.8 passenger-side medium, oblique rail foreground | A survivor presses the lock. Scratched ballistic glass seals like a secular rood screen; jaw-shaped mechanical dogs engage sequentially. Each lock briefly interrupts the rotating red light. Weapons remain down. | civilian hand gesture, partition rig, warning cage | Final lock impact creates light-driven cut |
| OE-03 | 3:08-5:02 / 81-122 | `CAM_OE_03` · 65 mm f/1.4 split-diopter composition through glass | Operator's infected collar and survivors' unblinking faces remain sharp on opposite depth planes. A red sweep crosses the operator; a muted green pulse answers, doubled in scratched reflections. The eye contact lands without cutting to coverage. | split-diopter approximation/compositor depth masks, restrained idles, infection light group | Let beacon reflection wipe focus toward navigation side |
| OE-04 | 5:02-7:00 / 123-168 | `CAM_OE_04` · 40 mm f/2.0 locked two-plane tableau, very slow lateral drift | Survivors remain awake behind the screen; operator turns toward a cold quarantine vector. Passing star light creates prison-bar bands across both compartments, but never aligns across the glass. | cabin, passenger idles, console route glow, reflection pass | Cut to black inside a red rotation, before resolution |

**Poster frame:** OE-03, operator and survivor reflections divided by scratched
glass.
**Sound handoff:** partition locks, steady engines, leather/armor shifts, no
dialogue and no weapon-ready sound.

## Sequence 04 — Failed Carrier

**Narrative job:** the concealed egg/container fails because the cold box cannot
hold it. The operator's secrecy converts a rescue into a disaster.

**Duration:** 7.0 seconds / 168 frames.
**Primary sets:** SET-B and the aft edge of SET-A.
**Scene file:** `art/source/blender-prerenders/scenes/ending_failed_carrier.blend`
**Performance:** realization travels from machine to operator to passengers;
the actual final fate can remain just beyond the cut.

### Blocking

- Containment pod E1 dominates screen right; coolant manifold is upper left.
- Operator kneels at the pod controls with back partly to the passenger door.
- Two passengers appear at the door only after the amber light leaks into the
  cabin.
- Vapor and spores always move from pod toward the passenger door, making the
  danger's path unmistakable.

### Shot list

| Shot | Time / frames | Camera rig & optics | Action and composition | Assets / animation | Transition |
| --- | --- | --- | --- | --- | --- |
| FC-01 | 0:00-1:14 / 0-38 | `CAM_FC_01` · 50 mm f/1.4 probe macro opening into reveal | A frosted coolant line resembles a translucent bone beneath hard top light. A branching crack races through it like black Gothic tracery; amber fluid wells under the ice. Rack focus reveals the coffin-like containment pod. | coolant manifold, thermal pod/incubator, frost displacement/transmission | Amber alarm cage coughs to life |
| FC-02 | 1:14-3:12 / 39-84 | `CAM_FC_02` · 35 mm f/1.8 cramped creeping push, horizon initially level | Operator works controls as diagnostic glass falls cyan→amber→red. The pod's round internal silhouette moves once against rectilinear restraints. On impact, introduce the first two-degree Dutch roll and a short shutter smear. | operator kneel/console gesture, pod, egg/resin, diagnostic reflections | Organic impact fractures composition and cuts |
| FC-03 | 3:12-5:02 / 85-122 | `CAM_FC_03` · 45 mm f/1.8 reverse, reflection-led staging | Amber light spills beneath the passenger door like a darkroom safelight. It opens; two survivors stare past camera. The pod is visible only as a warped reflection across their eyes and wet metal as its glass branches with green-amber cracks. | civilians surprise/back-step, cargo door, reflection/cryptomatte control | Crack pattern match-cuts to spreading resin |
| FC-04 | 5:02-7:00 / 123-168 | `CAM_FC_04` · 28 mm f/2.0 cargo master, broken horizon and rising translational shake | Coolant falls like inverted incense, the coffin seal opens, and spore fog rolls low toward the aisle. Operator turns between pod and passengers. Jaw-like hatch dogs attempt closure but living resin holds the mouth open. Preserve one clean silhouette beat before chaos. | localized volume simulation, resin growth, operator turn, hatch rig, warning groups | Abrupt black on second impact; no lingering gore reveal |

**Poster frame:** FC-03 with the amber breach reflected on the passengers.
**Sound handoff:** coolant tick, pressure alarm, one muffled organic impact,
seal tear, hard cut before a scream becomes explicit.

## Sequence 05 — Empty Husk

**Narrative job:** the operator escapes alone after abandoning both camps and
hives. Unlike `SCORCHED_SKY`, this is not active annihilation; it is absence,
failure, and everything left uncarried.

**Duration:** 7.5 seconds / 180 frames.
**Primary sets:** SET-A and SET-D.
**Scene file:** `art/source/blender-prerenders/scenes/ending_empty_husk.blend`
**Performance:** the operator is small, still, and never celebrated by the
camera.

### Blocking

- Operator at P1, framed off-center and partly obscured by the pilot chair.
- S1-S3 remain fully visible and empty throughout the cabin shots. Do not fill
  them with cargo; emptiness is the subject.
- All three camp beacons and three hive apertures are dark on the exterior.
- One dead practical flickers behind the departing shuttle, then does not return.

### Shot list

| Shot | Time / frames | Camera rig & optics | Action and composition | Assets / animation | Transition |
| --- | --- | --- | --- | --- | --- |
| EH-01 | 0:00-1:22 / 0-46 | `CAM_EH_01` · 32 mm f/2.0 aft cabin wide, funereal one-point perspective | Three empty restraints dominate foreground like abandoned choir stalls; operator is a small silhouette at the far pilot altar. Loose harnesses sway where bodies should be. A single exhausted tungsten practical breaks the blue-black nave. | cabin, operator near-static idle, strap bones, coarse shadow detail | Nearly invisible dissolve keyed to engine vibration |
| EH-02 | 1:22-3:12 / 47-84 | `CAM_EH_02` · 55 mm f/1.6 slow lateral track, shallow focus used sequentially | Focus visits S1, S2, S3: a stamped human tag, a cloth prayer wrap, a shed shell fragment. Each token catches light then returns to black. Operator remains an anonymous defocused shape ahead. | camp/hive tokens, seat set, controlled focus pulls | Last token highlight becomes window ice glint |
| EH-03 | 3:12-5:06 / 85-126 | `CAM_EH_03` · 28 mm f/2.8 exterior locked wide through ruined arch foreground | Shuttle rises through black Gothic ice. Six landmarks—three camp beacons and three circular hive mouths—remain dead. One distant tungsten point fails. Camera refuses to follow until the shuttle nearly escapes composition. | shuttle, ice set, dark landmarks, sparse snow volume | Delayed pan becomes cut on empty landscape |
| EH-04 | 5:06-7:12 / 127-180 | `CAM_EH_04` · 24 mm f/4.0 extreme orbital wide, static until imperceptible final pullback | Tiny shuttle crosses an enormous blue-black planet. No signal answers. Its one cabin light resembles a damaged film perforation before grain and distance swallow it. Hold longer than comfort permits. | shuttle, planet matte, minimal stars, `exterior_environment` only | Charcoal crush into full black, then silence |

## Programmatic Scene Generation & Tooling

The entire ending scene suite is backed by an automated headless Blender script:
[build_ending_scenes.py](../../scripts/blender/build_ending_scenes.py).

### CLI Usage

1. **Build or update all five production `.blend` scenes:**
   ```bash
   blender --background --factory-startup \
     --python scripts/blender/build_ending_scenes.py -- \
     --scene all \
     --output-dir art/source/blender-prerenders/scenes
   ```

2. **Render a 960x540 animatic preview frame for any specific camera:**
   ```bash
   blender --background --factory-startup \
     --python scripts/blender/build_ending_scenes.py -- \
     --scene alien_exodus \
     --render-shot CAM_AE_02 \
     --shot-frame 60 \
     --render-out scratch/animatics/CAM_AE_02.png
   ```

3. **Generated scene files:**
   - [ending_mothership_infection.blend](../../art/source/blender-prerenders/scenes/ending_mothership_infection.blend) (SET-C Medical Dock & Transfer Lane)
   - [ending_alien_exodus.blend](../../art/source/blender-prerenders/scenes/ending_alien_exodus.blend) (SET-A Cabin & SET-D Exterior Ice)
   - [ending_outed_escape.blend](../../art/source/blender-prerenders/scenes/ending_outed_escape.blend) (SET-A Cabin with Ballistic Screen)
   - [ending_failed_carrier.blend](../../art/source/blender-prerenders/scenes/ending_failed_carrier.blend) (SET-B Cargo Compartment 4 & Thermal Pod)
   - [ending_empty_husk.blend](../../art/source/blender-prerenders/scenes/ending_empty_husk.blend) (SET-A Desolate Cabin & Negative Space Orbit)

**Poster frame:** EH-01 with the three empty restraints dominating the operator.
**Sound handoff:** loose harness taps, solitary breathing, engines muffled by
vacuum, then near-silence. No destruction sounds; that would confuse it with
`SCORCHED_SKY`.

## Production order

The recommended order minimizes throwaway work:

1. Greybox SET-A and SET-D.
2. Produce the `ALIEN_EXODUS` animatic because it proves the most characters,
   exterior launch, cabin geography, and the three-seat story rule.
3. Produce `EMPTY_HUSK` from the same sets; it proves that the shared blocking
   remains emotionally distinct with no passengers.
4. Add the partition and produce `OUTED_ESCAPE`.
5. Build SET-B and produce `FAILED_CARRIER`.
6. Build SET-C from the cabin/industrial kit and produce
   `MOTHERSHIP_INFECTION`.
7. Approve all five animatics as a set before final materials and lighting, so
   continuity issues are fixed once.

This revises the parent plan's recommendation to render `ALIEN_EXODUS` first:
the detailed blocking confirms it is also the best reusable-set proof.

## Sound sourcing and final-mix plan

### Audio direction

The sound world follows the same neo-Gothic cyber-biohorror post-punk rule as
the images. Machinery supplies the rhythm section: contactors, relays, straps,
fans, pressure lines, hull knocks, and alarm cages form a sparse industrial
pulse. Biological sound is close, soft, and intimate—membrane tension, fluid
movement, breath, tendon-like creaks—not a library monster roar. Architectural
reverb implies nave-scale spaces, but the mix remains dry enough to preserve
the cheap, oppressive materiality of the shuttle.

Do not wallpaper the scenes with a continuous cinematic drone. Silence,
electrical noise, and a few sync points should carry more weight than a generic
trailer bed. If music is used, derive it from existing score stems or newly
cleared material and keep it subordinate to the physical story.

### License rule

Only use audio that is one of the following:

1. already shipped in the repository with traceable provenance;
2. explicitly dedicated under CC0;
3. United States government material documented as generally not subject to
   US copyright and used within the publisher's media/identity restrictions;
4. newly recorded or synthesized for the project with a source session kept.

“Royalty-free,” “free download,” and “free with attribution” do not mean public
domain. Do not import a source on that language alone. CC-BY material is out of
scope for this public-domain/CC0 sourcing pass unless production deliberately
approves an attribution obligation.

For every downloaded file, save the original unedited file outside `public/`
under `art/source/audio/cinematic-source/<provider>/<asset>/`, plus:

- source page URL and direct-download URL;
- page title, creator/uploader, exact filename, and retrieval date;
- license name and a local PDF/text capture of the license statement;
- SHA-256 of the original and every derived master;
- edits performed, scene/shot usage, and whether attribution is optional or
  required;
- confirmation that no third-party music, voice, trademark callout, or
  identifiable person remains embedded.

Only edited, approved 48 kHz/24-bit WAV assets or final mixes enter the delivery
tree. Update `docs/ASSET_PROVENANCE.md` in the same promotion change.

### Initial public-domain/CC0 source shortlist

These are sourcing candidates, not approved shipped assets. Audition the exact
download and capture its license before use.

The first OpenGameArt intake was completed on 2026-09-12 and is recorded in
[`../reports/blender-ending-audio-source-intake-2026-09-12.md`](../reports/blender-ending-audio-source-intake-2026-09-12.md).
Downloaded originals remain ignored under
`art/source/audio/cinematic-source/opengameart/`; none are promoted runtime
assets yet.

Reuse of these sources outside the films is governed by the
[`CC0 game audio integration plan`](cc0-game-audio-integration-plan-2026-09-12.md),
including its derivative, loading, soundset, provenance, and rollback rules.

| Source | Declared terms | Candidate material | Best use | Disposition |
| --- | --- | --- | --- | --- |
| [OpenGameArt: Space Flight Sound Effects](https://opengameart.org/content/space-flight-sound-effects) | CC0; page states public-domain use without attribution | deep engines, wind, hull rattle/groan | shuttle launch, orbital tail, stressed cabin | `spaceflight3.wav` gathered; audition pending |
| [OpenGameArt: 60 CC0 Sci-Fi SFX](https://opengameart.org/content/60-cc0-sci-fi-sfx) | CC0 | terminal tones, beeps, metallic/electronic events | scanner, monitor, lock, navigation cues | 60-file archive gathered; labeling pending |
| [OpenGameArt: Sci-Fi Sounds by Kenney](https://opengameart.org/content/sci-fi-sounds) | CC0; credit optional | engines, sci-fi mechanisms, impacts | engine layers and mechanical sweeteners | 70-file pack gathered; audition pending |
| [OpenGameArt: Sirens and Alarm Noise](https://opengameart.org/content/sirens-and-alarm-noise) | CC0 | alarm/siren textures | destructive processing for `FAILED_CARRIER` | Use only if it survives pitch/formant redesign |
| [OpenGameArt: Alarm](https://opengameart.org/content/alarm-1) | CC0 | short sci-fi alarm | containment diagnostic pulse | Gathered; audition pending |
| [OpenGameArt: Short Alarm](https://opengameart.org/content/short-alarm) | CC0 | compact warning beep | pod threshold states and quarantine lock | Gathered; audition pending |
| [OpenGameArt: Metal Impact Sounds](https://opengameart.org/content/metal-impact-sounds) | CC0; credit optional | clinks, thuds, resonant hits | partition dogs, pod impacts, loose restraints | Seven WAVs gathered; audition pending |
| [OpenGameArt: Bubble Sound Effects](https://opengameart.org/content/bubble-sound-effects) | CC0; credit optional | isolated bubbles | pitch-stretched resin/egg interior detail | Five WAVs gathered; processing/audition pending |
| [NASA Artemis Audio Library](https://www.nasa.gov/artemisaudio/) | downloadable and cleared under NASA media guidelines | authentic launch/mission transients | low-level launch authenticity and radio texture | Legal/media-guideline review before use |
| [NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) | NASA content is generally not subject to US copyright, subject to stated restrictions | governing terms for NASA candidates | license record | Mandatory review; remove identifiers/voices unless specifically approved |

Exclude the otherwise useful OpenGameArt “Sci-Fi Sound Effects Library” from
this pass because its page declares CC-BY 3.0, not CC0.

### Existing repository material to audition first

| Sound family | Existing candidates | Intended reuse |
| --- | --- | --- |
| Mothership bed | `foley_mothership_room_loop.wav`, `foley_mothership_carrier_term.wav` | MI dock tone; filtered high-air layer elsewhere |
| Launch | `foley_mothership_orbital_launch.wav` | exterior engine transient under a new CC0 low engine |
| Link/pulse | `foley_mothership_link_acquire_1.wav`, `foley_mothership_link_acquire_2.wav` | scanner and hull-song source transformations |
| Scanner | `foley_exosuit_scanner_anomaly.wav` | MI scan and OE infection answer, redesigned differently |
| Queen biology | `foley_queen_neural_bond.wav`, `foley_queen_membrane_close.wav`, `foley_queen_cable_tear.wav` | infection pulse, resin seal, containment tear |
| Hive interior | `foley_queen_hive_room_loop.wav`, `hive_eggs_hum.wav`, `hive_eggs_hatch.wav`, `hive_spores_puff.wav` | FC pod interior and restrained AE signal texture |
| Mechanical doors | `door_slide_horiz*.wav`, `door_slam_vertical*.wav`, `door_gears_spin*.wav` | OE partition and FC hatch, edited into unique mechanisms |
| Warning | `camp_lockdown_alarm.wav`, `foley_bunker_nav_corruption.wav` | OE quarantine and FC failure, never reused unchanged in both |
| Empty cabin | `foley_exosuit_room_loop.wav`, `amb_metal_stress*.wav` | EH cabin/hull; aggressively stripped down |
| Score candidates | `Mothership Is Not Feeling Well.mp3`, `Four Seats, One Survivor.mp3`, `Nobody Says Goodbye.mp3`, `The Ice Gets Smaller.mp3` | audition as source-score beds only after provenance and stem suitability review |

### Cue map by shot

The cue IDs become named VSE strips and appear in the sequence mix manifest.

| Shot | Required sync cues | Continuous bed / spatial treatment | Silence and emphasis |
| --- | --- | --- | --- |
| MI-01 | `MI_SCAN_PASS`, ramp servo, soft bed-wheel contacts | sterile filtered mothership room tone; scanner travels L→R with picture | Pull room tone down 3 dB for the false-clean chirp |
| MI-02 | three restrained wheel/rail contacts, distant airlock relay | cold fluorescent buzz and close cloth/respiration; bed wipes cross stereo field | No music; maintain calm documentary surface |
| MI-03 | `MI_VEIN_PULSE` built from neural bond + wet electrical tick | near-silent collar cloth and operator breath; dry/close center image | Drop ambience 6 dB for 8 frames before pulse |
| MI-04 | airlock jaw sequence, conduit propagation | nave tail grows as door closes; pulse moves center→rear surrounds/headphones | Cut biological tail before black, leaving one electrical overtone |
| AE-01 | ignition, cradle release, three hive replies, Queen signal break | wide icy wind to engine low end; signals occupy three distinct pitches/positions | Engine ducks briefly for failed Queen signal |
| AE-02 | Rhun brace creak, Vey antenna movement, Nahl hand contact | cabin engine and three individualized breathing/material signatures | Do not add creature vocals |
| AE-03 | `AE_HULL_SONG` three-tone resonance | contact conduction starts mono at hull, blooms stereo without becoming score | Operator head turn lands in a small tonal clearing |
| AE-04 | atmosphere break and Queen signal collapse | engine loses air component as exterior reaches vacuum; restrained score tail allowed | End with hull resonance, not a triumphant hit |
| OE-01 | engine engage, harness strain, one rifle sling shift | dry cabin ventilation; red beacon supplies a slow electrical rhythm | Uncomfortable stillness is the lead element |
| OE-02 | control press and three distinct lock dogs | partition motor travels center; each lock has different metal/body ratio | Half-beat gap before final heavy lock |
| OE-03 | quarantine sweep, muted infection answer | glass filters passenger side; operator breath remains isolated foreground | No sting on infection—audience already understands it |
| OE-04 | navigation accept tone, passing hull ticks | two subtly different room responses on either side of glass | Finish unresolved with beacon motor continuing into cut |
| FC-01 | pipe tremor, ice crack, first liquid tick, alarm cough | coolant line resonance and sub-bass pod hum | Silence a few frames immediately after crack |
| FC-02 | diagnostic threshold steps, egg impact | irregular compressor rhythm; alarm gains distortion at red | Impact should feel internal and padded, not explosive |
| FC-03 | door release, survivor armor shift, reflected glass crack | breach heard offscreen and filtered behind camera | Withhold full alarm while reactions register |
| FC-04 | coolant blast, seal peel, spore exhale, hatch struggle, second impact | only sequence with escalating dense layering; automate spectral crowding intentionally | Hard cut every stem on impact; no reverb tail after black |
| EH-01 | loose harness taps and ignition relay | sparse hull/ventilation tone with audible solitary breathing | Leave large gaps between strap contacts |
| EH-02 | tag tick, cloth brush, shell scrape | nearly anechoic cabin close-detail; focus pulls mirrored by spectral focus | Each token receives one sound only |
| EH-03 | launch low end and one beacon failure | external wind falls away as shuttle rises; no camp or hive reply | Hold dead landscape for several frames after departure |
| EH-04 | faint hull harmonic only | near-silence; optional sub-audible room-tone floor prevents digital deadness | Fade below perception rather than resolving musically |

### Blender VSE session layout

Blender's VSE supports layered sound strips, per-strip volume animation,
waveform display, crossfades, synchronization, and audio rendering. Use it as
the authoritative picture-sync and final assembly session. Because it is not a
full bus-oriented DAW, perform destructive cleanup, restoration, spectral
repair, and complex dynamics on source-derived stems before import; retain
those processes as reproducible source-session notes or scripts.

Use the same channels in every ending `.blend`:

| VSE channels | Stem | Contents |
| --- | --- | --- |
| 1-9 | picture/reference | animatic/final image sequence and guides |
| 10-19 | `AMB` | cabin, dock, wind, engine, electrical room tone |
| 20-29 | `MECH` | doors, locks, relays, seats, restraints, hull contacts |
| 30-39 | `BIO` | pulse, membrane, resin, egg, breath, spores |
| 40-49 | `SYNC` | scanner, alarms, diagnostics, navigation, impact accents |
| 50-59 | `MUS` | optional score/stem material |
| 60-69 | `VO_REF` | muted/reference departure lines only; not baked unless runtime contract changes |
| 70-79 | `PRINTS` | stem prints and final mix reference |

Name strips `<ENDING>_<SHOT>_<STEM>_<CUE>_vNN`. Use relative paths. Set
timeline sync to audio while editing. Keyframe gain rather than hard-splitting
room tone where possible, and use equal-power-style crossfades for ambience
transitions.

### Mix architecture and processing

1. Edit and clean sources at 48 kHz/24-bit. Remove DC, accidental clicks,
   unwanted voices, metadata, and unusable background music before design.
2. Build mono sync effects from 2-5 layers: mechanism/body, resonance, air,
   contact detail, and optional biological violation.
3. Print `AMB`, `MECH`, `BIO`, `SYNC`, and `MUS` stems with identical start/end
   time and import them into the VSE. Retain individual hero cues above the
   stem prints until picture lock.
4. Use convolution or algorithmic reverb on designed stems before VSE import:
   short metallic cabin, medium cargo chamber, and long filtered mothership
   nave. Never put the same large reverb on every element.
5. High-pass only where it creates room for story-critical low-frequency
   events. Preserve engine/body weight on small speakers with controlled upper
   harmonics rather than inaudible sub-bass alone.
6. Center crucial mechanisms and biological tells; keep low frequencies mono.
   Stereo width belongs to architecture, wind, signal travel, and selected
   transitions.
7. Automate perspective: occlusion behind glass/doors, high-frequency loss with
   distance, early-reflection changes at thresholds, and exterior air loss as
   the shuttle reaches vacuum.
8. Reserve limiting for the print stage. Fix masking and transient balance in
   stems rather than crushing the full mix.

### Loudness and delivery targets

- Match the perceived level of the five existing ending videos before final
  promotion; measure them and record the baseline rather than guessing.
- Initial working target: **-18 LUFS integrated**, **-1 dBTP maximum**, stereo
  48 kHz. Because these clips are short and sparse, also inspect momentary
  loudness, peak-to-loudness ratio, and subjective transitions from the spoken
  departure lines.
- Maintain at least 6 dB of useful crest factor for locks, pod impacts, and
  ignition. `FAILED_CARRIER` may be the densest ending but must not simply be
  the loudest.
- Check mono fold-down, left/right polarity, headphones, laptop speakers,
  Steam Deck speakers, and a modest stereo system.
- Deliver `ending-<name>-mix.wav`, the five aligned stems, and an audio-bearing
  VP9/Opus WebM. Keep the lossless mix/stems as source assets, not runtime files.

### Chromatic aberration correction and intentional reintroduction

Correct accidental chromatic aberration before adding the authored optical
effect. In the compositor:

1. inspect high-contrast edges in the undistorted Combined pass at 200%;
2. use vector/normal/depth evidence and per-channel transform or lens-distortion
   correction to register unintended red/green/blue edge separation;
3. verify the correction does not create colored alpha fringes around
   Cryptomatte-isolated subjects, glass, frost, cables, or emissive practicals;
4. composite, grade, bloom, and resize the clean registered image;
5. add the approved story-driven misregistration last, at delivery resolution,
   using masks and a maximum offset recorded in the shot manifest;
6. disable the authored effect and compare A/B contact sheets as part of QC.

Intentional aberration is limited to hidden infection, failing optics, glass
edges, and the extreme frame periphery. Faces, passenger occupancy, subtitles,
and the clean scanner result remain registered. This preserves the aesthetic
without allowing a global RGB split to masquerade as cinematography.

### Audio sourcing and mix milestones

| ID | Work item | Exit evidence |
| --- | --- | --- |
| AUD-01 | Measure audio streams/loudness of the five existing ending WebMs | ffprobe and loudness report committed under ending reports |
| AUD-02 | Audit provenance and suitability of existing repository candidates | source ledger with keep/reject reasons |
| AUD-03 | Download and license-capture the shortlisted CC0 candidates | originals, hashes, page captures, and provenance entries |
| AUD-04 | Create a ten-second sound palette test | approved engine, mechanism, biological, alarm, and nave-space palette |
| AUD-05 | Build `ALIEN_EXODUS` cue sheet and temp mix against greybox | VSE session, aligned stems, and review video |
| AUD-06 | Build remaining four temp mixes | all cue IDs present and synchronized |
| AUD-07 | Final design, cleanup, perspective, and reverb stem prints | 48 kHz/24-bit aligned stems plus processing notes |
| AUD-08 | Blender VSE final automation and mix print | mix WAV, waveform/peak inspection, no clipping |
| AUD-09 | Loudness match, mono/device checks, and Opus encode | QC report and packaged-playback capture |

No candidate becomes “sourced” merely because its URL is in this document.
`AUD-03` is complete only when the exact downloaded file and license evidence
are locally recorded and reviewed.

## Per-sequence deliverables

Each ending must produce:

- scene manifest with exact asset paths and checksums;
- greybox contact sheet containing every shot's first, middle, and last frame;
- 960x540 animatic with temporary sound and no final simulation;
- approved camera/character blocking `.blend`;
- final 1920x1080 PNG sequence;
- aligned 48 kHz/24-bit `AMB`, `MECH`, `BIO`, `SYNC`, and optional `MUS` stems;
- lossless final mix, loudness/true-peak report, and chromatic-registration QC;
- WebM and poster JPEG using the exact runtime basename;
- render log, encode command, duration, file size, and checksum;
- packaged-build playback capture and fallback test.

## Animatic acceptance checklist

- A viewer unfamiliar with the ending can identify who occupied the three
  passenger seats.
- The five sequences remain distinguishable with audio muted and without text.
- No shot depends on reading tiny monitor typography.
- The operator class can change without breaking framing or intersecting the
  cabin.
- Character eyelines, screen direction, and cabin geography remain consistent.
- Infection is readable but does not become a generic bright-green glow.
- `ALIEN_EXODUS` reads as alliance, not abduction.
- `OUTED_ESCAPE` reads as distrustful cooperation, not execution.
- `FAILED_CARRIER` reads as containment failure caused by concealment.
- `EMPTY_HUSK` reads as abandonment, not the already-shipped scorched ending.
- First and poster frames remain valid while video loads.
- Every sequence can be skipped and always hands control back through the
  existing cutscene lifecycle.

## Evidence and completion

Store animatic reviews under
`art/source/blender-prerenders/reports/endings/<ending-basename>/`. A sequence
is complete only when its unique WebM and poster exist in `public/cutscenes/`,
the bespoke path is enabled in the ending-cutscene resolver, tests no longer
classify it as a fallback, the build-media audit passes, and packaged playback
has been observed.
