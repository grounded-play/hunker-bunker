# Sprint 53 — A world that varies, names itself, goes dark, and sleeps

Status: **approved 2026-10-07** ("all correct proceed"), in progress. Branch: `dev/sprint-51` (local only).

Implementation audit and remaining work: [`sprint-53-continuation-plan-2026-10-07.md`](sprint-53-continuation-plan-2026-10-07.md).

## The owner, 2026-10-07

- "Re-skin the walls per biome."
- "Provide a list of assets and prompts for them in the key art style to add more to the world. Right now too much of the same is placed too close, sometimes facing the wrong way."
- "We need filler and mystery boxes and things connected to quests, and more, all outlined."
- "The rooms and hallways are all named now, right? Not seeing that text popping up. There should be one for the crash site too."
- "Give me cutscene prompts for a few different styles of sleep, for a cutscene to play and reset."
- "We should go dark at night and have better steam vents and things shooting up. Look at the key art."
- "Plan all this first."

---

## 0. The key art, as a rule book

Read from `public/title_key_art_v2.webp`, the four door key arts (`door_*_keyart_v2.webp`) and the song interstitials (`public/interstitials/int_*_key_v1.webp`):

- **Scale.** Monumental biomechanical architecture: ivory-bone ribs, vertebral pipework, symmetrical arches. A lone operator stands small against it.
- **Darkness first.** Most of the frame is near-black. Light comes from a few sources only:
  - one cold portal glow;
  - amber floor pinpoints;
  - a single work lamp;
  - one emissive accent per object.
- **Atmosphere.** Fog and steam spill along the floor and out of openings; the floors are wet and reflective.
- **Surfaces.** Grimy riveted gunmetal, cracked enamel, aged ivory, black latex, ribbed cartilage. Worn and lived-in, never clean.
- **One accent colour per biome:**
  - cyan: cryo;
  - green: bio, hive;
  - amber: human machinery, nuclear;
  - red: warning;
  - violet: only the Queen.

  This is the existing palette rule in `docs/planning/3d-gap-generation-prompts-2026-10-05.md`.

Every prompt below and every lighting change is checked against this list.

---

## W. Walls re-skinned per biome

**Today.** Tile walls are instanced boxes with one custom shader. It blends three texture sets (active, cryo, bio) by distance from your ship, the biome rings (`createBiomeTerrainTextures`, `wallMaterial.onBeforeCompile`). Eight full PBR sets made for the modular kit (`public/3d/runtime/kits/textures/`: colour, normal and roughness, some with emissive) never reach these walls:
- cave
- space
- cathedral
- bunker
- biomech
- giger
- reliquary
- cryo_deck

**Plan.**

- [x] **W1. Ring skins.** The wall shader samples the kit PBR sets in place of today's single texture per ring, keeping the smooth blend between rings:

  | Biome ring | Wall skin | Accent |
  |---|---|---|
  | Active (bunker) | `bunker`: rivets, conduits | amber |
  | Cryo | `cryo_deck` | cyan |
  | Bio | `biomech`, shading into `giger` deeper in | green |

  Normal and roughness maps come along, so walls get real relief and wet sheen instead of a flat print.
- [x] **W2. Place overrides.** Some places wear their own skin over the ring:

  | Place | Skin |
  |---|---|
  | Cathedral rooms (`giger-cathedral` theme) | `cathedral` |
  | Reliquary and shrine rooms | `reliquary` |
  | Cave and canyon landforms | `cave` |
  | Corporate Horizon rooms (security, armory) | `space` |

  Done per chunk: the wall batch of a chunk whose rooms are mostly one style gets that skin's material variant. This needs no texture arrays, and costs one extra material per skin in view.
- [x] **W3. Wall tops and trims.** Today the tops reuse the floor plates. They get the skin's own top (`*_floor_*` where the set has one), plus a darker band where wall meets floor, so blocks stop reading as cubes.
- [x] **W4. Two new texture sets** (prompts in A6): geothermal basalt plating for the geothermal expedition condition, and hive resin for the deepest bio ring. Generated masters replaced the first procedural stand-ins on 2026-10-07; runtime maps are rebuilt with `scripts/build_sprint53_generated_wall_maps.py`.
- **Verify:** screenshots of each ring and override at 1280×800; the long-walk benchmark for GPU cost (normal maps add texture reads, so watch Deck GPU time).

---

## V. Variety and placement

**Today's causes.**
- **Signature props repeat:** each room theme has only 1–4 (e.g. `bunker-standard` has one), and every room of that theme shows it.
- **Short lists:** the dense room-dressing kits (`src/roomDressingKits.js`) pick from 4–6 items each, and nothing stops the same item from landing in neighbouring cells or rooms.
- **Still 2D:** 72 of the 185 prop types the themes place have no 3D model.
- **Facing.** Only wall-backed props face away from their wall. Every other prop uses one default angle, so a console against a wall can face into it.

**Plan.**

- [x] **V1. Spacing rule.** The same model never sits within 6 tiles of itself in a room or its hallway, unless a set piece places it deliberately as a cluster (a crate stack, a row of beds). The rule tracks recently placed models per chunk and lowers their weight, so variety rotates instead of repeating.
- [x] **V2. Facing rule, by placement:**

  | Placed | Faces |
  |---|---|
  | Against a wall | away from the wall, into the room (every prop, not only wall-backed ones) |
  | In a corner | along the corner's diagonal |
  | Free-standing | toward the room centre or the nearest door, with ±15° jitter |
  | Beds, benches | long side to the wall |

  This goes in `src/propBehavior.js` as a `facing` field (wall, corner, center, free), so each style says how it stands. A test checks no prop faces within 60° of the wall it is against.
- [ ] **V3. Composition.** Rooms are dressed as small scenes, not scatter. A cluster is one anchor plus 2–3 satellites from a related set:
  - a workbench with a stool, a tool cart and loose cables;
  - a bed with a footlocker and a lamp;
  - a crate with spilled cans and a torn tarp.
- [ ] **V4. More signature props per theme:** at least 4 per theme, from the new assets in A1–A5.
- [ ] **V5. Filler layer.** Low, cheap, non-blocking floor clutter (cables, debris, papers, cans, bones, frost shards, resin drips), placed along walls and in corners at a density each biome sets. Filler never blocks movement (`propBehavior` floor style) and is drawn as instanced batches.
- [ ] **V6. Mystery boxes.** A new interactable container family. Hold E to open (Engineers open faster; some need a keycard). What's inside is rolled when opened, from a table by biome and depth:

  | Roll | Share | What happens |
  |---|---|---|
  | Supplies | 40% | ammo, medkits, shells |
  | Salvage | 25% | tech, coin, a Foundry input |
  | Lore | 15% | a log or a relic, unlocking an archive entry |
  | Ambush | 10% | something was nesting inside |
  | Hazard | 5% | spore or cryo burst |
  | Quest hook | 5% | a map mark to a hidden cache or survivor |

  - **Kinds** (A2): four visually distinct boxes, from common courier cases to rare biomech reliquary pods, plus a sealed quarantine crate that always holds the riskier rolls, and a keycard-locked black-site lockbox.
  - **Co-op:** opened once for the squad, synced like broken props; the loot is shared at full value (Sprint 51 rule).
  - **Owner decision 2:** whether ambush and hazard rolls are in.
- [ ] **V7. Quest objects.** Today every camp quest target is the same generic `quest_objective_node`. Each quest gets its own object (A3), so you know what you're looking for at a glance:

  | Quest | Object |
  |---|---|
  | `reactor_venting` | a cluster of red-hot pressure valves on a vent manifold (three to close) |
  | `lost_probe` | a Horizon metric probe half-buried in frost, beacon blinking |
  | `hive_archive_ch1–3` | a biomechanical archive node, tinted by chapter |
  | `spore_cleansing` | a red invasive mould bloom over a hydro channel (three to purge) |
  | `lost_cultist` | the cultist's bedroll shrine in the vent tunnel (where to find them) |
  | `armory_breach` | an infested weapons cabinet, cyber-snail shells in the racks |
  | `bunker_holdout` | a barricade gate with sandbags and a manned spotlight |
  | Signature quests (`grid_covenant`, `warm_pipes`, `iron_ledger`) | their camp's own centrepiece (Kaelen's ledger desk, Martha's warm-pipe junction, Briggs' memorial wall) |

  Objectives also get a world-space beacon (a thin light pillar plus the objective glyph) while the quest is active.
- [ ] **V8. Scale.** Every new model goes through the museum walk (`tests/e2e/probes/museum-walk.spec.js`) and gets a `maxSpan` if needed before it is placed.

---

## N. Names that announce themselves

**Today.** Every room and most hallways have a name, learned by radar scan (Sprint 50, `src/locationNames.js`). The name appears only in the small sector line at top left ("??? · SCAN TO IDENTIFY" until scanned). Only camp and hive compound rooms raise a title card (`announceTerritoryLocation` → `location-discovered`). The crash site has no name.

**Plan.**

- [x] **N1. Title card on entry.** Walking into a named, scanned place for the first time in the run shows a title card, using the existing compound card style:
  - **Rooms:** larger card, with the room's role or theme as subtitle ("PUMP HOUSE B-07" / "UTILITY").
  - **Hallways:** a smaller, quieter card.
  - **Scanned with you already inside:** the card shows when the scan reveals it.
  - **Repeat visits:** only the corner line updates, so a card never spams.
- [x] **N2. The crash site is named.** A seeded name per run, from the operator's ship and a site code, e.g. "IMPACT SITE K-7 · SCOUT WRECK", shown as the run's first title card after the intro. It's also on the map, and is where the black box and "return to ship" guidance point.
- [x] **N3. Other places get names too:** camps (already), hives, the Foundry, the O2 generator site, cave mouths and landmark set pieces, all scan-gated.
- [x] **N4. Seven languages:** new name parts and the card subtitles go through the i18n audit, like Sprint 50's names.

---

## L. Night, steam and things shooting up

**Today.**
- **Night is barely darker:** ambient light drops only to 72% and the sun to 55% (`updateDayNightCycle`).
- **No ambient vents:** there is no steam or vent system; only event effects (`src/expeditionVfx.js`, weather, combat).

**Plan.**

- [x] **L1. Real night.** At night the world goes dark, the way the key art does:

  | Light | Night level |
  |---|---|
  | Ambient | ~20% |
  | Sun | ~10%, cold blue moonlight |
  | Fog | denser and darker |

  - **What carries the scene:** your suit light, room practical lights (lamps, consoles, emissive props), squadmates' lights, muzzle flash, and the new vents.
  - **Dawn and dusk** ramp over the day cycle; nights in the bio ring get a faint green bioluminescent floor glow.
  - **Readability:** the suit light gets a wider, warmer night profile, enemies keep a rim light, and the Settings brightness slider sets a floor so night is never unplayable.
  - **Not a quality cut:** darker is a look, not lower quality.
- [x] **L2. Ambient vents.** A new pooled effect system (instanced soft particles, one draw call per vent type, capped per screen):

  | Biome | Vent | Behaviour |
  |---|---|---|
  | Active | steam from floor grates and wall vents | a low rolling hiss, then every 6–12 s a burst that shoots 2–3 m up with a pressure whistle and a warm under-light |
  | Cryo | cryo frost jets | white plumes that freeze into falling crystals; a cold cyan flash on burst |
  | Bio | spore chimneys | slow green-glowing spore columns that drift and settle |
  | Geothermal expedition | fissure geysers | an amber glow, a rumble, then a column of steam and sparks; brief heat damage if you stand in it, telegraphed by the rumble |

  - **Placement:** vents sit on floor grates, the new vent props (A4) and near pipes. A few per room, more in utility, engineering and reactor rooms.
  - **Night:** vents carry their own light, so a dark room is lit in pulses.
- [x] **L3. Floor fog.** A thin animated fog layer hugging the floor in large rooms and caves, thicker at night and near vents, like the portal fog in the title art.
- **Perf:** vents and fog are pooled and instanced, only update in visible chunks (Sprint 52 rule), and are measured on the long-walk benchmark before and after.

---

## S. Sleep cutscenes

**Today.** Resting at a bed or camp opens the rest dialog, warns about what is left undone, then advances the day (`day-rest-open`, `day-rest-warning`). No cutscene plays.

**Plan.**

- [ ] **S1. Play a sleep cutscene on rest, then reset.** The video plays through `playCutsceneVideo` like the death and event cutscenes. On its last frame the world resets to morning:
  - the day advances;
  - the O2 bubble recharges;
  - camps restock;
  - lighting snaps to dawn.

  Skippable (any key or button), and short: 6–8 s.
- [ ] **S2. Five styles, picked by where you sleep:**

  | Where | Style |
  |---|---|
  | The bunker cot at your ship | Bunker cot |
  | A camp | Camp bedroll by the fire |
  | Infected, or out in the cryo ring | Cryo pod drift |
  | Bonded with a hive | Hive cocoon |
  | Co-op, both resting | Squad watch |
- [ ] **S3. Morning card.** After the video: "DAY 4 · 06:00", the crash-site name and the day's objective.

Prompts are in section C.

---

## A. Asset list and prompts

**How to use.** Same pipeline as `docs/planning/3d-gap-generation-prompts-2026-10-05.md`:
1. Generate the image from the block.
2. Run image-to-3D.
3. Drop the GLB in `art/raw/`.
4. It gets optimized into `public/3d/runtime/new3ds/`, registered in `WORLD_3D_MODELS`, given its `propBehavior` and checked on the museum walk.

Put the negative block in the negative field.

### Negative block (3D props)

```text
concept art, illustration, drawing, sketch, ink lines, cross-hatching, painterly, cel shading, cartoon, anime, low detail, blurry, flat lighting, harsh shadows, ground shadow, floor, horizon, scenery, background objects, gradient background, vignette, depth of field, lens flare, multiple objects, turnaround sheet, split panels, collage, people, human nudity, human genitals, text, logos, watermark, signature, clean sterile sci-fi, medieval fantasy, church, crosses, altars, runes, pastel colors
```

### A1. Filler (low, non-blocking, seen constantly) — 9

**1. Loose conduit spill** — `filler_conduit_spill.glb` · bunker · ~0.25 m tall, 1.2 m across · 3k tris · accent: amber
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE low tangle of loose industrial conduit lying on its own: three thick ribbed black rubber cable hoses and one cracked gunmetal pipe section spilling from a torn junction collar, the hoses coiling and overlapping, frayed copper strands and a snapped ceramic insulator at one end, grime and oil film on every surface, one tiny amber (#f59e0b) status bead still glowing on the collar. Worn, heavy, abandoned. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**2. Toppled filing cabinet** — `filler_filing_cabinet_toppled.glb` · bunker · 0.5 m tall, 1.3 m long · 4k tris · no glow
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE dented steel filing cabinet lying on its side, two drawers sprung half open, a fan of water-stained paper folders and punched data cards spilling out and frozen mid-slide, chipped olive-grey enamel over rusted gunmetal, a corporate stencil band scraped illegible, one drawer runner bent like a broken finger. Heavy, abandoned. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, cracked enamel, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**3. Ration crate and empty cans** — `filler_ration_spill.glb` · bunker / camp · 0.45 m tall · 3k tris · no glow
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE small scene-piece: a pried-open military ration crate of scuffed olive composite with its lid leaning against it, and a spill of eight crushed and empty ration cans, a torn foil meal pouch and a bent spoon around its base, all one connected object on a shared footprint. Grime, finger-smudged dust, dented metal. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, scuffed composite, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**4. Frozen pipe stub** — `filler_cryo_pipe_icicles.glb` · cryo · 0.6 m tall · 4k tris · accent: cyan
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE sheared-off coolant pipe stub rising from a riveted floor flange, its broken mouth choked with a thick frozen spill: a cascade of clear blue-white ice that has run down one side and pooled into a glassy frozen puddle at the base, long icicles hanging from the lip, frost feathers on the gunmetal, a faint cyan (#22d3ee) glow inside the ice where coolant still trickles. Cold, crystalline, heavy. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, translucent ice, ribbed pipe collars, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, subsurface scattering in the ice, glossy specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**5. Frost-locked tool cart** — `filler_cryo_tool_cart.glb` · cryo · 0.9 m tall · 5k tris · accent: cyan
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE abandoned two-tier maintenance tool cart frozen solid: its gunmetal frame furred with frost, a toolbox fused shut by ice, wrenches and a cutting torch stuck to the top tray under a clear glaze, icicles hanging from the handle, one caster wheel cracked and splayed, a small cyan (#22d3ee) diagnostic screen still lit through the frost. Cold, still, heavy. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, translucent ice, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, subsurface scattering in the ice, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**6. Cryo canister rack** — `filler_cryo_canister_rack.glb` · cryo · 1.1 m tall · 6k tris · accent: cyan
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE low floor rack of six cylindrical cryo canisters, two missing, one fallen and cracked open with a frozen white vapour plume solidified mid-escape, the rest frosted, ribbed chrome bands and brass valve caps, cyan (#22d3ee) fill gauges glowing on the intact ones. Industrial, cold, worn. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, frost, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**7. Resin-wrapped debris knot** — `filler_resin_knot.glb` · bio · 0.5 m tall · 4k tris · accent: emerald
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE knot of human debris swallowed by hive resin: a helmet, a bent rifle stock and a coil of cable fused into a glossy amber-black resin mass that has dripped and hardened like candle wax, ribbed cartilage strands threaded through it, wet mucosal sheen, faint emerald (#10b981) veins glowing deep inside the resin. Organic consuming industrial. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering in the resin, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**8. Shed chitin husk** — `filler_chitin_husk.glb` · bio · 0.4 m tall, 1.4 m long · 5k tris · no glow
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE empty moulted exoskeleton of a large alien crawler lying on its side: a hollow translucent amber-grey chitin shell split open along the spine, jointed leg sheaths still attached and curled under, the inside glossy and veined, flakes of shed skin peeling at the edges. Light, papery, eerie. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: polished translucent chitin, ribbed cartilage, ivory bone, every surface glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, subsurface scattering through the shell, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**9. Spore bulb cluster (crushable)** — `filler_spore_bulbs.glb` · bio · 0.3 m tall · 3k tris · accent: emerald
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE low cluster of nine soft fungal spore bulbs growing from a mat of wet mycelium threads: translucent pale sacs on short ribbed stalks, each swollen with glowing emerald (#10b981) spore fluid, two bulbs already burst and deflated with powdery green dust around them. Fragile, wet, alive. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet membranes, ribbed cartilage stalks, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, subsurface scattering in the bulbs, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### A2. Mystery boxes — 4

**10. Horizon courier case (common)** — `mystery_courier_case.glb` · any · 0.5 m tall · 4k tris · accent: amber
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE sealed corporate courier case: a hard-shell armoured case of scuffed off-white enamel over gunmetal ribs, rounded corners, a recessed carry handle, two heavy latches and a palm-lock panel with one amber (#f59e0b) light pulsing, a faded Horizon Corp hazard band, dents and claw scrapes on one side, a cracked transit tag zip-tied to the handle. Mysterious, sealed, valuable. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, cracked enamel, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**11. Biomech reliquary pod (rare)** — `mystery_reliquary_pod.glb` · bio / cathedral · 1.0 m tall · 7k tris · accent: emerald
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE upright biomechanical reliquary pod: an ovoid capsule of ivory bone plates and black latex hide held in a cradle of ribbed vertebral struts, its front a tightly closed four-lipped sphincteric seal, a crown of thin chrome tubes feeding into the top, a faint emerald (#10b981) glow leaking from the seam as if something inside breathes. Sacred, sealed, alive. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**12. Quarantine specimen crate (risky)** — `mystery_quarantine_crate.glb` · any · 0.9 m tall · 6k tris · accent: red
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE heavy quarantine specimen crate: a riveted gunmetal box wrapped in red-and-black hazard tape and two chained steel straps, a small thick viewing port of fogged glass on the front with something dark pressed against it from inside, frost and condensation weeping from the seams, deep gouges in the lid from the inside, one red (#ef4444) warning lamp blinking. Ominous, contained, dangerous. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, glossy wet surfaces, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**13. Black-site lockbox (keycard)** — `mystery_blacksite_lockbox.glb` · bunker / security · 0.7 m tall · 5k tris · accent: amber
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE wall-mountable black-site security lockbox standing on four short feet: a squat blast-resistant safe of dark gunmetal with heavy bevelled edges, a recessed keycard slot and a vertical bar of amber (#f59e0b) lock lights, a stencilled black-site code scratched over, pry marks and a failed cutting-torch scar across the hinge, one lock light flickering. Locked, valuable, defended. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### A3. Quest objects — 8

**14. Reactor pressure valves** — `quest_reactor_valves.glb` · `reactor_venting` · 1.3 m tall · 7k tris · accent: red
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE reactor vent manifold: a thick ribbed gunmetal pipe trunk rising from a floor flange and branching into three valve heads, each with a large spoked wheel, the pipe glowing dull red-hot (#ef4444) at the joints, heat shimmer scorch marks, a cracked analog pressure gauge with its needle pinned in the red, a jet of steam escaping from one seal, bolts sheared off and lying at the base. Urgent, dangerous, industrial. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, ribbed vertebral pipework, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**15. Lost Horizon metric probe** — `quest_lost_probe.glb` · `lost_probe` · 0.8 m tall · 6k tris · accent: cyan
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE crashed corporate survey probe half-buried in a mound of frost and ice: a spherical white-enamel instrument body with two snapped sensor fins and a bent antenna mast, its lens array cracked, a cyan (#22d3ee) homing beacon still blinking on top, scorch streaks from re-entry, frost crystals growing over the lower half. Lost, still calling. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, cracked enamel, translucent ice, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, subsurface scattering in the ice, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**16. Hive archive node** — `quest_hive_archive_node.glb` · `hive_archive_ch1–3` · 1.6 m tall · 8k tris · accent: emerald (tinted per chapter in-engine)
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE biomechanical data-archive node: a tall organic pillar of black latex and ivory vertebrae coiled around a core of stacked translucent chitin data plates, each plate etched with fine circuit-like veins, thick ribbed cables rooting into the base, a cradle at chest height where a hand-held drive could be inserted, emerald (#10b981) light pulsing slowly up through the plates. Ancient, intelligent, waiting. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, subsurface scattering in the chitin, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**17. Invasive red mould bloom** — `quest_red_mould_bloom.glb` · `spore_cleansing` · 0.5 m tall, 1.2 m across · 5k tris · accent: red
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE invasive mould bloom smothering a short section of open hydroponic channel: a cracked gunmetal trough with murky water, overgrown by a dense rash of blood-red (#ef4444) fungal cups and velvety ribbed caps spilling over the edges, fine red hyphae crawling up the trough walls, wilted pale crop stems choking underneath. Sickly, spreading, wrong. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet membranes, ribbed cartilage, cold cast gunmetal, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, subsurface scattering in the caps, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**18. Lost cultist's tunnel shrine** — `quest_cultist_shrine.glb` · `lost_cultist` · 0.7 m tall · 5k tris · accent: amber
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE makeshift survivor's nest from a ventilation tunnel: a rolled grimy bedroll, a tin cup, a ring of melted candle stubs around a small cairn of machine parts topped by a cracked circuit board worshipped like an icon, a frayed cable tied with scraps of cloth and bone charms, one candle still burning amber (#f59e0b). Human, devotional, lonely. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal, grime, worn cloth, ivory bone, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**19. Infested weapons cabinet** — `quest_infested_armory_cabinet.glb` · `armory_breach` · 1.8 m tall · 7k tris · accent: cyan
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE tall double-door weapons cabinet forced half open: dented gunmetal doors bent outward, rifle racks inside overgrown with glossy cyber-snail shell clusters and glistening slime trails, two rifles still clipped in place, an ammunition drawer hanging open, faint cyan (#22d3ee) bioluminescence from the shells, scratch marks on the inside of the doors. Infested, dangerous, worth retaking. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet slime, polished chitin, cold cast gunmetal and chrome, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**20. Holdout barricade gate** — `quest_holdout_barricade.glb` · `bunker_holdout` · 2.0 m tall, 3.0 m wide · 9k tris · accent: amber
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE defensive barricade gate: a welded wall of scavenged bulkhead plates and steel beams across a doorway frame, a narrow firing slit, stacked sandbags at its foot, a pole-mounted work spotlight on top casting an amber (#f59e0b) glow, spent shell casings scattered on the sandbags, claw gouges and scorch marks on the outer face. Defiant, battle-worn, human. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, burlap, grime, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**21. Objective beacon** — `quest_objective_beacon.glb` · all quests · 1.2 m tall · 2k tris · accent: amber
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE portable field beacon spike: a slim gunmetal tripod with a ribbed vertebral mast, a ring of amber (#f59e0b) indicator lights near the top and a small upward-facing lamp, a coil of cable at the base and a magnetic clamp foot. Functional, clean silhouette, readable from above. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, ribbed cartilage detailing, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### A4. Vent hardware (where steam shoots from) — 3

**22. Floor steam grate** — `vent_floor_steam_grate.glb` · active · 0.15 m tall, 1.0 m across · 3k tris · accent: amber
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE square floor steam vent: a heavy cast gunmetal grate with radial ribbed slots set in a riveted collar, the collar stained with mineral crust and rust streaks, a ring of small amber (#f59e0b) pressure lights at the corners, condensation beading on the bars, the dark shaft below glowing faintly warm. Industrial, about to blow. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, ribbed vertebral detailing, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, glossy wet specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**23. Geothermal fissure vent** — `vent_geothermal_fissure.glb` · geothermal · 0.6 m tall, 1.6 m across · 6k tris · accent: amber
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE geothermal fissure vent: a split mound of black basalt and slag with a jagged glowing crack down its centre, molten amber-orange (#f59e0b) light inside, mineral crust in sulphur-yellow and white around the rim, a broken steel sensor pylon half-melted into one side, heat shimmer. Volcanic, violent, alive. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: dry pitted rock, glossy obsidian glass, cold cast gunmetal, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, emissive molten core, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**24. Bio spore chimney** — `vent_spore_chimney.glb` · bio · 1.4 m tall · 6k tris · accent: emerald
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE biomechanical spore chimney: a tall tapering organic flue of ribbed black latex and ivory cartilage rings rising from a root-mass of resin, its mouth a soft puckered opening fringed with fine cilia, emerald (#10b981) light glowing inside the throat, a crust of dried green spore dust down one side. Breathing, alive, exhaling. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: glistening wet black latex, polished translucent chitin, ribbed cartilage, ivory bone, every surface slick, glossy and sculpted with razor-sharp micro detail. Photorealistic PBR materials, subsurface scattering on membranes, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### A5. Landmarks (the key art's scale) — 3

**25. Fallen rib arch** — `landmark_fallen_rib_arch.glb` · bio / cave · 3.5 m tall, 6 m long · 14k tris · walk-under · accent: none
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE colossal fallen rib bone from a dead biomechanical leviathan, arching up from the ground and back down to form a walk-under archway: aged ivory bone fused with ribbed black cartilage and vertebral pipework, cracked and weathered, thick cables trailing from its root, mineral crust and moss at its feet. Monumental, ancient, awe-inspiring. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: polished ivory bone, glistening black latex, ribbed cartilage, cold cast gunmetal, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**26. Dead colossus machine head** — `landmark_colossus_head.glb` · active / cathedral · 3 m tall · 16k tris · accent: amber
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE enormous severed head of a dead biomechanical construction colossus lying on its side: a symmetrical skull of riveted gunmetal and ivory bone plates, a dark cyclopean optic socket with one dim amber (#f59e0b) light still alive deep inside, jaw hinges of ribbed pistons, a crown of snapped cables and pipes, rust tears running down its cheeks. Monumental, tragic, haunting. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, polished ivory bone, ribbed cartilage, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

**27. Crash-site marker beacon** — `landmark_crash_site_beacon.glb` · crash site · 2.2 m tall · 6k tris · accent: amber
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE emergency crash-site marker beacon: a tall collapsible mast of gunmetal tubing planted in a weighted base of salvaged hull plates, a rotating amber (#f59e0b) strobe at the top, a hand-painted impact-site code plate bolted to the mast (blank, no readable text), a torn orange survival flag and a coil of cable, scorch and frost on the base. Hopeful, human, a place to come back to. H.R. Giger biomechanical eroticism fused with brutal deep-space corporate industrial horror: cold cast gunmetal and chrome, scorched hull plate, every surface sculpted with razor-sharp micro detail. Photorealistic PBR materials, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat neutral grey (#808080) background, centered with margin on all sides, three-quarter view, no ground shadow, no floor, no gradient, no vignette, no other objects, no text, 1:1 aspect ratio.
```

### A6. Wall texture sets (seamless PBR) — 2

These are flat tiling textures, not props: generate colour at 2048×2048, then derive normal and roughness maps (Materialize or the Blender bake in `scripts/blender/`). Files: `public/3d/runtime/kits/textures/<skin>_wall_{color,normal,rough}.webp`.

**28. Geothermal basalt plating** — skin `geothermal`
```text
Seamless tileable top-down orthographic texture of heavy industrial wall plating over volcanic rock: interlocking dark gunmetal panels bolted onto rough black basalt, sulphur-yellow and white mineral crust in the seams, faint molten amber cracks glowing between some plates, rust and heat discoloration, rivets and conduit clamps. Flat even lighting, no shadows, no perspective, no vignette, physically based albedo, highly detailed, 2048x2048, perfectly tileable on all edges.
```

**29. Hive resin wall** — skin `hive_resin`
```text
Seamless tileable top-down orthographic texture of a wall grown over by alien hive resin: glossy amber-black resin flowing in thick vertical drips and ribbed ridges, cartilage-like rings and embedded fragments of human machinery (bolts, cable, plate edges) half swallowed, faint emerald bioluminescent veins beneath the surface. Flat even lighting, no shadows, no perspective, no vignette, physically based albedo, highly detailed, 2048x2048, perfectly tileable on all edges.
```

---

## C. Sleep cutscene prompts

**Shared direction.**
- **Length:** 6–8 s; 16:9; 1920×1080 source; WebM plus an MP4 fallback and a poster JPG, named `public/cutscenes/sleep-<style>.webm`.
- **Style:** the key art. Near-black frames, one warm light source, fog on the floor, wet reflections, monumental biomechanical surroundings, the operator small in frame.
- **Ending:** every video ends on a slow fade to black. The game holds black for a beat, then cuts to dawn and the morning card (S3).
- **Avoid:** readable text, logos, UI, faces in close-up (the operator's helmet stays on, visor reflecting), gore, bright clean lighting, extra characters except where stated.

Each style has three keyframe stills (for image-to-video, or for `npm run cinematics:stills` Ken Burns pans) and one motion prompt.

### 1. Bunker cot — `sleep-bunker`

- **Still A:**
  ```text
  Cinematic still, wide shot inside a dark cramped crash-site bunker built from a broken ship's hull, a lone armoured operator in a scuffed suit lowering themself onto a narrow steel cot, one hanging work lamp casting a warm amber pool, everything else near black, cold fog drifting across a wet riveted floor, ribbed biomechanical pipes along the walls, the crashed ship's bulk looming in the dark behind. Moody, lonely, film grain, H.R. Giger industrial horror atmosphere, 16:9.
  ```
- **Still B:**
  ```text
  Cinematic still, close on the operator lying on the cot, helmet still on, visor reflecting the single amber lamp, one gloved hand resting on a rifle at their side, breath fogging inside the visor, condensation dripping from a pipe above. Intimate, exhausted, near-black, film grain, 16:9.
  ```
- **Still C:**
  ```text
  Cinematic still, the lamp flickers and dims, the bunker sinking into darkness, only the faint amber standby light of the ship's console glowing in the distance, fog settling. Quiet, still, film grain, 16:9.
  ```
- **Motion:** slow push-in from A to B; the lamp sways gently; steam drifts; the lamp flickers and fades out on C; fade to black.

### 2. Camp bedroll by the fire — `sleep-camp`

- **Still A:**
  ```text
  Cinematic still, a survivors' camp in a vast dark bunker hall, a small oil-drum fire throwing flickering orange light over a ring of bedrolls, crates and sandbag walls, the operator sitting on a bedroll, helmet off and set beside them (face hidden in shadow, back to camera), two survivors silhouetted across the fire, monumental ribbed biomechanical architecture fading into black above. Warm, fragile, human, film grain, 16:9.
  ```
- **Still B:**
  ```text
  Cinematic still, low angle over the fire, sparks rising into the darkness, the operator lying down on the bedroll in the background, a survivor feeding a broken chair leg into the flames. Warm amber light against near-black, film grain, 16:9.
  ```
- **Still C:**
  ```text
  Cinematic still, the fire burned down to embers, the camp asleep, a single sentry silhouette at the barricade looking out into the dark, a faint cold glow on the horizon of the hall. Hushed, film grain, 16:9.
  ```
- **Motion:** a slow orbit around the fire; sparks rise; the fire dims to embers by C; the sentry turns their head toward the dark; fade to black.

### 3. Cryo pod drift — `sleep-cryo`

- **Still A:**
  ```text
  Cinematic still, an emergency cryo pod in a frozen chamber, frost-furred ribbed glass lid half closed, the operator inside in their suit, cyan instrument light washing over the frost, icicles hanging from biomechanical conduits above, cold white fog rolling out of the pod's base. Clinical, cold, beautiful, near-black surroundings, film grain, 16:9.
  ```
- **Still B:**
  ```text
  Cinematic still, close on the pod lid as frost blooms across the glass in fractal ferns, the operator's visor barely visible beneath, a slow cyan pulse from a heartbeat monitor. Dreamlike, film grain, 16:9.
  ```
- **Still C:**
  ```text
  Cinematic still, the frost covers the glass completely, the cyan light fading to a dim standby glow, the chamber silent and dark. Film grain, 16:9.
  ```
- **Motion:** the lid seals; frost grows across the glass; the heartbeat pulse slows; the light fades; fade to black.

### 4. Hive cocoon (bonded) — `sleep-hive`

- **Still A:**
  ```text
  Cinematic still, deep in a biomechanical hive chamber, the operator lying back into a cradle of glossy black latex and ivory ribs that is slowly closing around them like a cocoon, emerald bioluminescent veins pulsing in the walls, thin ribbed tendrils settling gently over the armour, warm wet mist. Unsettling but tender, near-black, H.R. Giger atmosphere, film grain, 16:9.
  ```
- **Still B:**
  ```text
  Cinematic still, close on the cocoon's translucent membrane, the operator's visor glowing faintly emerald from within, the membrane breathing in slow rhythm. Intimate, alien, film grain, 16:9.
  ```
- **Still C:**
  ```text
  Cinematic still, the hive chamber at rest, rows of closed cocoons glowing softly emerald along the ribbed walls, one of them the operator's, everything breathing together. Film grain, 16:9.
  ```
- **Motion:** the cradle closes; tendrils settle; the membrane breathes; pull back to reveal the rows of cocoons; fade to black.

### 5. Squad watch (co-op) — `sleep-squad`

- **Still A:**
  ```text
  Cinematic still, two armoured operators at the crash-site bunker at night, one lying on the cot, the other sitting on an ammo crate by the doorway with a rifle across their knees, keeping watch, one amber lamp between them, fog drifting in from the dark beyond the door, the ship's ribbed hull looming. Loyal, quiet, film grain, 16:9.
  ```
- **Still B:**
  ```text
  Cinematic still, over the shoulder of the watching operator, looking out of the bunker door into the dark, a distant cold glow of something moving far away, their visor reflecting it. Tense, film grain, 16:9.
  ```
- **Still C:**
  ```text
  Cinematic still, the watcher's head finally nods, both operators still, the lamp guttering low, first faint grey light at the very edge of the doorway. Film grain, 16:9.
  ```
- **Motion:** a slow dolly from the sleeper to the watcher; the distant glow moves and vanishes; the watcher's head nods; the lamp gutters; fade to black.

---

## Order

1. **N, names.** Small, and fixes "not seeing that text" now.
2. **V1–V2, spacing and facing.** Fixes what you already see, with no new art.
3. **L1, real night.** A tuning change, verified with screenshots.
4. **W, walls.** The textures exist.
5. **L2–L3, vents and floor fog**, with placeholder geometry until A4 arrives.
6. **V5–V7, filler, mystery boxes, quest objects.** Systems first, wired to existing models; each model is swapped in as it arrives from the A list.
7. **S, sleep cutscenes.** Wiring and reset first, with a black-fade placeholder until the videos arrive.

## Decisions (owner, 2026-10-07: "all correct proceed")

The plan as written:
1. Night is about 20% ambient.
2. Mystery boxes include ambush (10%) and hazard (5%) rolls.
3. Geysers deal brief, telegraphed heat damage.
4. Hallways get a small card; rooms get the larger one.
5. The full 6–8 s sleep cutscene plays on every rest, and is skippable.

## Verification

- **Screenshots at 1280×800 for:** every wall skin and override; a room before and after V1–V2; night in each ring; vents at night; the title cards.
- **Museum walk** for every new model.
- **Long-walk benchmark** before and after W and L, so no sprint undoes Sprint 52's frame times.
- **Tests:**
  - facing (no prop faces within 60° of its wall);
  - spacing (the same model never within 6 tiles);
  - mystery-box roll table and its co-op sync;
  - title cards fire once per place;
  - sleep reset advances the day.
