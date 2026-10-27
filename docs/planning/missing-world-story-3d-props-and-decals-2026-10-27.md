# 50 Missing 3D World-Story Props & Companion Decals — Generation Specification

**Document ID:** `HB-PROPS-50-WORLD-STORY-2026-10-27`  
**Status:** Production Ready | Verified 100% Unique against all 563 existing runtime GLBs  
**Target Directory:** `public/3d/runtime/new3ds/` (Props) and `public/` / `src/data/` (Decals)  
**Companion TSV:** [missing-world-story-3d-props-and-decals-2026-10-27.tsv](./missing-world-story-3d-props-and-decals-2026-10-27.tsv)

---

## 1. Executive Summary & Verification Audit

This document authors **50 brand-new, non-duplicate 3D prop models** and **50 matching companion decals** (spills, breaks, leaks, scorches, and aftermath evidence).
Every item addresses a verified gap in the active game codebase:
1. **Resolves Quest Stand-Ins:** Replaces `standIn` proxy models in [`src/questObjects.js`](../../src/questObjects.js).
2. **Materializes Lore Collectibles:** Converts flat 2D sprite cards from [`src/loreDrops.js`](../../src/loreDrops.js) into inspectable 3D physical artifacts.
3. **Replaces Camp & Cave Sprites:** Upgrades high-frequency 2D billboards identified in [`docs/reports/2d-to-3d-gap-audit-2026-10-05.md`](../reports/2d-to-3d-gap-audit-2026-10-05.md) into full GLB models.
4. **Implements Act 2 Endings:** Builds the authored physical setpieces required by the 5-ending launch matrix in [`docs/expanded-universe-narrative-design.md`](../expanded-universe-narrative-design.md).

### Uniqueness Guarantee
All 50 proposed model IDs were verified against `public/3d/runtime/new3ds/` (563 shipped GLBs) and `WORLD_3D_MODELS` with **zero collisions**.

---

## 2. Shared House Aesthetic & Technical Specifications

### Art Direction
> **Nordic Jugendstil and National Romantic monumentality meets H.R. Giger biomechanical body horror.**
> Monumental round arches, blackened iron bindings, carved bone ivory reliefs, wet maroon muscle tissue, and glossy chitin seams.
> Restraint over gore; solemn sacramental dread over novelty or comedy. Exactly one emissive practical accent per prop.

### Negative Prompt (Exclusions)
```text
concept art, illustration, drawing, sketch, ink lines, cross-hatching, painterly, cel shading, cartoon, anime, low detail, blurry, flat lighting, harsh shadows, ground shadow, floor, horizon, scenery, background objects, gradient background, vignette, depth of field, lens flare, multiple objects, turnaround sheet, split panels, collage, people, human nudity, human genitals, text, logos, watermark, signature, clean sterile sci-fi, medieval fantasy, church, crosses, altars, runes, pastel colors
```

---

## 3. The 50 Props & Companion Decals Manifest

### Camp Quest Targets & Landmarks

#### 1. `quest_reactor_valves`
- **Suite:** Camp Quest Targets & Landmarks
- **Story & Worldbuilding:** Sector A-9 primary cooling bypass for Overseer Kaelen's 'Reactor Venting' quest.
- **Room Placement:** Reactor Vent Station (engineering / cryo_deck).
- **Placement Class & Dims:** Wall-mounted pipe fixture, 0.8 m H, 1.6 m W, 0.4 m D.
- **Verbs & Interaction:** `turn valve, calibrate pressure, vent surge.`
- **Persisted States:** `pressurized (hissing) | venting (steam plume) | stabilized (sealed).`
- **Resolves Gap:** Replaces `prop_valve_wheel_fused in src/questObjects.js`
- **Emissive Accent:** Harsh red overpressure warning dial (#ef4444)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE quest reactor valves (about 0.4 m D.): a horizontal industrial bypass header fabricated from heavy soot-blackened cast iron with four interconnected brass valve wheels mounted in a descending row. Each wheel is wrapped in braided thermal wire with knurled spokes, connected by exposed hydraulic pistons to high-pressure steam conduits. Between the second and third valve, a round mechanical Bourdon dial gauge displays a cracked crystal lens and a vibrating needle pinned deep in the red warning arc. Heavy copper earth straps and frost-rimmed return lines link the valves to the wall flange. The third valve wheel is seized with burnt graphite packing and leaks a narrow jet of vapor. Story it tells: Sector A-9 primary cooling bypass for Overseer Kaelen's 'Reactor Venting' quest. Exactly one accent light: Harsh red overpressure warning dial (#ef4444); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_reactor_scorch_flange_leak`
- **Decal Surface & Size:** Wall and floor below reactor bypass header, 1.8 m wide.
- **Decal Story & Context:** High-pressure thermal blowout resulting from failing to turn valve #3 in time during reactor venting.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a directional fan of heat-darkened iron scorch and calcified white mineral scale radiating downward from a circular pipe flange footprint, with fine spray rivulets pooling in floor deck seams, wet at the core and dry chalky salt at the outer rim. Context: High-pressure thermal blowout resulting from failing to turn valve #3 in time during reactor venting. Placement: Wall and floor below reactor bypass header, 1.8 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 2. `quest_lost_probe`
- **Suite:** Camp Quest Targets & Landmarks
- **Story & Worldbuilding:** Horizon Corporation telemetry probe in the frost biome for Meridian's 'The Lost Probe' quest.
- **Room Placement:** Frost biome chasm floor / survey perimeter.
- **Placement Class & Dims:** Floor-standing crash scatter, 1.4 m H, 1.2 m W, 1.2 m D.
- **Verbs & Interaction:** `inspect crash, extract radar core, salvage telemetry.`
- **Persisted States:** `beacons active | core extracted | gutted chassis.`
- **Resolves Gap:** Replaces `radar in src/questObjects.js`
- **Emissive Accent:** Flickering cyan beacon strobe on antenna mast (#22d3ee)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE quest lost probe (about 1.2 m D.): a compact, ruggedized geodesic telemetry probe chassis constructed from matte-black titanium composite panels with high-visibility hazard yellow accent ribs, resting at a tilted 25-degree angle where it impacted the permafrost. A bent telescopic antenna mast extends upwards with a damaged dual-horn sensor pod and exposed co-axial cable ribbon. An accessible side maintenance door has popped open on shear-pins, revealing an illuminated modular tachyon radar shroud core locked in an amber-lit shock cradle. Deep impact gouges score the lower casing and rimed frost encrusts the north-facing vents. Story it tells: Horizon Corporation telemetry probe in the frost biome for Meridian's 'The Lost Probe' quest. Exactly one accent light: Flickering cyan beacon strobe on antenna mast (#22d3ee); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_probe_crater_scuff_impact`
- **Decal Surface & Size:** Floor impact site, 2.2 m long.
- **Decal Story & Context:** Physical skid crater and shredded composite casing debris left where the telemetry probe hit the ice deck.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of two parallel gouged skid trenches in frosted deck plate converging on a circular impact crater with crushed sensor-glass dust, shredded black carbon-fiber fragments, and a radial fan of displaced permafrost grit. Context: Physical skid crater and shredded composite casing debris left where the telemetry probe hit the ice deck. Placement: Floor impact site, 2.2 m long.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 3. `quest_hive_archive_node`
- **Suite:** Camp Quest Targets & Landmarks
- **Story & Worldbuilding:** Biomechanical stasis archive node for all camps' 'Hive Archive Ch. 1-3' quest.
- **Room Placement:** Hive fringe / parking lot, warehouse, and incident review sites.
- **Placement Class & Dims:** Floor-standing organic structure, 1.6 m H, 1.0 m W, 0.7 m D.
- **Verbs & Interaction:** `interface terminal, decrypt archive, sever optical vein.`
- **Persisted States:** `pulsing (unopened) | decrypting (resonant) | severed (quenched).`
- **Resolves Gap:** Replaces `prop_hive_resin_sac in src/questObjects.js`
- **Emissive Accent:** Pulsing emerald green bio-luminescent data channels (#10b981)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE quest hive archive node (about 0.7 m D.): an unholy fusion of an ancient corporate CRT terminal lectern and living hive tissue: an angled steel diagnostic pedestal whose metal neck has split open to house an organic spinal column of ivory vertebrae and glossy black chitin cords. The monitor housing is partially encased in translucent amber resin, with fine optical nerves piercing the phosphor glass and projecting undulating green raster lines. Below the keyboard tray, a swollen gestation sac pulses with emerald luminescent fluid, feeding biological data filaments directly into the floor grating. Story it tells: Biomechanical stasis archive node for all camps' 'Hive Archive Ch. 1-3' quest. Exactly one accent light: Pulsing emerald green bio-luminescent data channels (#10b981); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_hive_optic_nerve_puddle`
- **Decal Surface & Size:** Floor surrounding archive node pedestal, 1.5 m diameter.
- **Decal Story & Context:** Leaking bio-luminescent neural fluid and root resin after the player severs the data node.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a circular puddle of thick glossy emerald-green bio-plasma surrounded by severed fibrous root tendrils and sticky amber resin spatters, showing delicate vascular branch patterns dying into dull black scum at the edges. Context: Leaking bio-luminescent neural fluid and root resin after the player severs the data node. Placement: Floor surrounding archive node pedestal, 1.5 m diameter.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 4. `quest_red_mould_bloom`
- **Suite:** Camp Quest Targets & Landmarks
- **Story & Worldbuilding:** Invasive red mold choking hydroponic channels in Sister Martha's 'Spore Cleansing' quest.
- **Room Placement:** Hydro-bed channels in Tallow Camp and Sector B-4.
- **Placement Class & Dims:** Floor and pipe-straddling biomass, 1.1 m H, 1.4 m W, 0.6 m D.
- **Verbs & Interaction:** `sample culture, burn with flamethrower, inoculate channel.`
- **Persisted States:** `fruiting (spewing spores) | inoculated | charred husk.`
- **Resolves Gap:** Replaces `prop_fungal_resin_basin in src/questObjects.js`
- **Emissive Accent:** Crimson red sporocarp pustules (#ef4444)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE quest red mould bloom (about 0.6 m D.): a sprawling cluster of invasive, carnivorous red mold fungus anchored across an industrial irrigation trough. The central mass consists of thick, plum-red velvety flesh folded like cerebral cortex lobes, studded with twenty to thirty swollen crimson sporocarp blisters that weep sticky crimson nectar. Delicate fungal hyphae branch out in all directions, invading pipe seams and welding collars with fine hair-like threads. Faint thermal steam rises from the center of the bloom, which exhibits slow, rhythmic respiratory contractions. Story it tells: Invasive red mold choking hydroponic channels in Sister Martha's 'Spore Cleansing' quest. Exactly one accent light: Crimson red sporocarp pustules (#ef4444); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_red_mould_spore_crust_ring`
- **Decal Surface & Size:** Threshold and floor around infected channel, 2.0 m wide.
- **Decal Story & Context:** Spore fallout crust and corrosive acid etch marks where red mold crept along the drainage channel.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a dense ring of velvet-textured crimson spore powder settling into floor recesses, with acid-pitted metal blisters and sticky rust-colored drip halos trailing away from the central infestation point. Context: Spore fallout crust and corrosive acid etch marks where red mold crept along the drainage channel. Placement: Threshold and floor around infected channel, 2.0 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 5. `quest_cultist_shrine`
- **Suite:** Camp Quest Targets & Landmarks
- **Story & Worldbuilding:** Makeshift ventilation tunnel landmark for Tallow's 'The Lost Cultist' quest.
- **Room Placement:** Ventilation shafts and cold maintenance bypasses.
- **Placement Class & Dims:** Wall-backed alcove altar, 1.5 m H, 1.2 m W, 0.5 m D.
- **Verbs & Interaction:** `inspect shrine, recover cultist token, offer prayer.`
- **Persisted States:** `candles lit (active) | cold wax (abandoned) | desecrated.`
- **Resolves Gap:** Replaces `prop_votive_candle_shrine in src/questObjects.js`
- **Emissive Accent:** Warm flickering candle flame amber (#f59e0b)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE quest cultist shrine (about 0.5 m D.): a desperate, touching survival shrine built into a rusted ventilation duct mouth: two tiers of stacked scrap iron grating supported by pipe elbows, holding dozens of hand-poured tallow wax candles in spent shell casings. The wax has melted into thick, ivory and pale green draperies over the metal, cementing dried sprigs of bioluminescent cave moss, polished river stones engraved with 'SHE DREAMS US WARM', and a carved bone devotional figurine of a kneeling exosuit operator. The center tier cradles a folded clean emergency thermal blanket. Story it tells: Makeshift ventilation tunnel landmark for Tallow's 'The Lost Cultist' quest. Exactly one accent light: Warm flickering candle flame amber (#f59e0b); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_cultist_wax_runoff_pool`
- **Decal Surface & Size:** Floor beneath cultist shrine, 1.4 m across.
- **Decal Story & Context:** Layered wax runoff, scorched soot marks, and kneeling boot scuffs in front of the makeshift altar.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a thick scalloped apron of layered yellowish tallow candle wax drippings fused to dusty steel grating, with soot scorch halos from spent shell votives and two distinct knee-print compressions in the settled grit. Context: Layered wax runoff, scorched soot marks, and kneeling boot scuffs in front of the makeshift altar. Placement: Floor beneath cultist shrine, 1.4 m across.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 6. `quest_kaelen_ledger_desk`
- **Suite:** Camp Quest Targets & Landmarks
- **Story & Worldbuilding:** Overseer Kaelen's private command station for Meridian's signature quest 'The Grid Covenant'.
- **Room Placement:** Meridian core / Kaelen's alcove beside the logic drum.
- **Placement Class & Dims:** Floor-standing industrial console desk, 1.3 m H, 1.8 m W, 1.0 m D.
- **Verbs & Interaction:** `inspect ledger, sign Grid Covenant, revoke power charter.`
- **Persisted States:** `unsigned | covenant active (glowing) | revoked.`
- **Resolves Gap:** Replaces `prop_conduit_junction_box in src/questObjects.js`
- **Emissive Accent:** Cyan diagnostic glow across capacitive bus bar terminals (#22d3ee)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE quest kaelen ledger desk (about 1.0 m D.): a monumental cast-iron drafting and covenant terminal station: a broad slanted soot-black steel desk surface inset with polished heavy copper bus plates and ceramic insulator ribs. A roll of heavy treated drafting parchment feeds from a brass cylinder at the top, covered in precise technical schematic schematics of Sector A-9 and hand-annotated power covenants. In the center desk recess sits a heavy, two-handed mechanical punch-key recorder with exposed brass gears, flanked by analog dial voltmeters and heavy braided ground wires trailing into the floor deck. Story it tells: Overseer Kaelen's private command station for Meridian's signature quest 'The Grid Covenant'. Exactly one accent light: Cyan diagnostic glow across capacitive bus bar terminals (#22d3ee); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_covenant_copper_arcing_burn`
- **Decal Surface & Size:** Floor and desk apron, 1.6 m wide.
- **Decal Story & Context:** Electrical arcing scorch and hand-tool scuffs resulting from completing the Grid Covenant circuit.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a radial starburst of high-voltage carbon scorch marks radiating from a central grounding lug footprint, with micro-droplets of spattered melted copper and polished boot scuffs from repeated signing rituals. Context: Electrical arcing scorch and hand-tool scuffs resulting from completing the Grid Covenant circuit. Placement: Floor and desk apron, 1.6 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 7. `quest_martha_warm_pipe_junction`
- **Suite:** Camp Quest Targets & Landmarks
- **Story & Worldbuilding:** The central geothermal manifold for Sister Martha's signature quest 'The Warm Pipes'.
- **Room Placement:** Tallow Camp central steam cavern.
- **Placement Class & Dims:** Floor-to-ceiling pipe monolith, 2.2 m H, 2.0 m W, 0.8 m D.
- **Verbs & Interaction:** `listen to steam hum, inspect moss growth, brace joint.`
- **Persisted States:** `singing (warm) | thermal spike | overgrowing with fungus.`
- **Resolves Gap:** Replaces `prop_pipe_rupture in src/questObjects.js`
- **Emissive Accent:** Warm thermal orange heat shimmer (#f97316)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE quest martha warm pipe junction (about 0.8 m D.): a colossal manifold where four 300mm geothermal steam supply lines converge into a massive riveted bronze expansion chamber. The lower half is heavily insulated with thick wool felt and stitched leather blankets tied down by copper wire, providing a warm bench where tired cultivators sit. Lush, velvety emerald cave moss has colonized the moist condensation seams, emitting soft bioluminescence and fragrant herbal vapors. Analog mercury temperature gauges and brass bleed-petcocks line the top manifold, venting fine wisps of clean steam. Story it tells: The central geothermal manifold for Sister Martha's signature quest 'The Warm Pipes'. Exactly one accent light: Warm thermal orange heat shimmer (#f97316); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_warm_pipe_condensate_drip_fan`
- **Decal Surface & Size:** Floor and wall saddle under steam junction, 2.4 m long.
- **Decal Story & Context:** Warm mineralized condensation runoff and seated body wear against the warm pipe saddle.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a broad fan of polished, dark rust-and-soot wear where human bodies have leaned against the heat for years, surrounded by mineral-white calcium drip rings and wet green moss fringes following drainage grooves. Context: Warm mineralized condensation runoff and seated body wear against the warm pipe saddle. Placement: Floor and wall saddle under steam junction, 2.4 m long.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 8. `quest_infested_armory_cabinet`
- **Suite:** Camp Quest Targets & Landmarks
- **Story & Worldbuilding:** Infested weapons locker in Sector C-7 for Commander Briggs's 'Armory Breach' quest.
- **Room Placement:** Vesper Camp armory perimeter / weapons locker room.
- **Placement Class & Dims:** Wall-backed security locker, 2.1 m H, 1.5 m W, 0.7 m D.
- **Verbs & Interaction:** `purge cyber-snails, pry locker doors, recover munitions.`
- **Persisted States:** `infested (chitin growth) | cleared | looted.`
- **Resolves Gap:** Replaces `prop_oxygen_bottle_cascade_rack in src/questObjects.js`
- **Emissive Accent:** Bioluminescent lime-green snail slime trails (#84cc16)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE quest infested armory cabinet (about 0.7 m D.): a heavy double-door Horizon Corporation security armory cabinet made of reinforced olive-drab steel plate, with its heavy steel latch buckled and forced open 30cm by an aggressive internal infestation. Clustered inside and spilling down the outer doors are three dozen mutated cyber-snails with iridescent titanium-infused shells, weaving thick glistening slime bridges across racks of high-caliber rifles and ammo drums. Calcified chitin tendrils fuse the lower shelves to the floor deck, and spent shotgun hulls are embedded into the slime crust. Story it tells: Infested weapons locker in Sector C-7 for Commander Briggs's 'Armory Breach' quest. Exactly one accent light: Bioluminescent lime-green snail slime trails (#84cc16); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_armory_spent_brass_scatter`
- **Decal Surface & Size:** Floor in front of armory cabinet, 2.0 m wide.
- **Decal Story & Context:** Spent brass casings and toxic snail mucus trails left during the violent firefight to clear the locker.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a dense scatter of twenty stamped brass 12.7mm and 12-gauge shotgun shells mixed with dried chartreuse iridescent snail slime streaks, black powder scorch soot, and boot pivot scuffs. Context: Spent brass casings and toxic snail mucus trails left during the violent firefight to clear the locker. Placement: Floor in front of armory cabinet, 2.0 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 9. `quest_holdout_barricade`
- **Suite:** Camp Quest Targets & Landmarks
- **Story & Worldbuilding:** Main outer defensive checkpoint for Vesper's 'Bunker Holdout' quest.
- **Room Placement:** Vesper outer gate / choke point.
- **Placement Class & Dims:** Floor-standing barrier span, 1.4 m H, 2.8 m W, 1.0 m D.
- **Verbs & Interaction:** `reinforce, reload defensive guns, inspect damage.`
- **Persisted States:** `fortified | under assault | breached.`
- **Resolves Gap:** Replaces `prop_security_barricade in src/questObjects.js`
- **Emissive Accent:** Flashing red perimeter alert strobe (#ef4444)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE quest holdout barricade (about 1.0 m D.): a formidable improvised defensive barricade constructed from stacked, tar-sealed canvas sandbags reinforced by welded angled steel railroad rails and heavy ballistic trench shields. Fitted with two steel firing embrasures, an integrated ammo can shelf, and a top-mounted halogen searchlight in a protective mesh cage. The front face is scarred with heavy impacts: deep kinetic bullet divots, jagged alien claw scores, and black scorch plumes from defensive claymore detonations. A mounted belt-fed machine gun pintle sits empty on the right shoulder. Story it tells: Main outer defensive checkpoint for Vesper's 'Bunker Holdout' quest. Exactly one accent light: Flashing red perimeter alert strobe (#ef4444); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_holdout_defensive_recoil_scuff`
- **Decal Surface & Size:** Floor behind the defensive barricade, 2.6 m long.
- **Decal Story & Context:** Heavy combat defense wear: boot friction, dropped cartridge links, and muzzle blast residue.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of deep radial muzzle-blast carbon scorch arcs in front of the barrier, paired with heavy operator heel scuffs, discarded disintegrating steel ammo belt links, and oil drag marks behind the sandbags. Context: Heavy combat defense wear: boot friction, dropped cartridge links, and muzzle blast residue. Placement: Floor behind the defensive barricade, 2.6 m long.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 10. `quest_briggs_memorial_wall`
- **Suite:** Camp Quest Targets & Landmarks
- **Story & Worldbuilding:** Monumental roster of fallen contractors for Vesper's signature quest 'The Iron Ledger'.
- **Room Placement:** Vesper inner command vault.
- **Placement Class & Dims:** Wall-mounted monument, 2.4 m H, 1.8 m W, 0.6 m D.
- **Verbs & Interaction:** `read fallen names, carve operator tally, swear oath.`
- **Persisted States:** `pristine roster | active vigil | names erased.`
- **Resolves Gap:** Replaces `arch_niche_shrine in src/questObjects.js`
- **Emissive Accent:** Restrained amber illumination from overhead gun-cleaning lamps (#f59e0b)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE quest briggs memorial wall (about 0.6 m D.): a solemn military memorial monument fabricated from a salvaged 50mm naval-grade steel bulkhead door mounted upright inside an arch of blackened structural iron. The steel surface has been divided into strict columns inscribed with hundreds of hand-stamped dog-tag numbers, contractor surnames, and knife-cut death tallies. Welded below the names is a heavy steel shelf holding a row of spent 40mm grenade cases used as vases for dried permafrost lichen, flanked by two open combat knives stuck tip-down into lead blocks. A kerosene maintenance lantern hangs from an overhead bracket. Story it tells: Monumental roster of fallen contractors for Vesper's signature quest 'The Iron Ledger'. Exactly one accent light: Restrained amber illumination from overhead gun-cleaning lamps (#f59e0b); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_memorial_gun_oil_footprint_tally`
- **Decal Surface & Size:** Floor directly beneath the memorial wall, 1.7 m wide.
- **Decal Story & Context:** Polished standing deck plate where contractors stand vigil to inspect the roster of the dead.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a semicircular wear patch worn through floor paint to bare polished steel by hundreds of heavy military combat boots, ringed by dark dried drops of gun maintenance oil and white chalk dust tally rubbings. Context: Polished standing deck plate where contractors stand vigil to inspect the roster of the dead. Placement: Floor directly beneath the memorial wall, 1.7 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

### Physical Lore Collectibles

#### 11. `drop_horizon_badge`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Executive clearance pass belonging to Chen, A., Geothermal Division. Lanyard melted during escape.
- **Room Placement:** Ruins, geothermal offices, executive corridors.
- **Placement Class & Dims:** Small tabletop/floor pickup, 0.1 m H, 0.15 m W, 0.05 m D.
- **Verbs & Interaction:** `inspect badge, swipe clearance, take into inventory.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_horizon_badge.png`
- **Emissive Accent:** Subtle green microchip hologram (#10b981)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop horizon badge (about 0.05 m D.): a heavy corporate identity badge molded from scratched white polycarbonate and brushed aluminum, displaying embossed corporate typography: 'CHEN, A. — GEOTHERMAL DIVISION. ACCESS: CORE STRATA'. The magnetic encoding stripe along the reverse is blistered from extreme heat, and the top attachment clip is fused to a charred, melted nylon lanyard that was violently snapped off. The photo hologram flickers between an executive portrait and a static corporate emblem. Story it tells: Executive clearance pass belonging to Chen, A., Geothermal Division. Lanyard melted during escape. Exactly one accent light: Subtle green microchip hologram (#10b981); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_melted_lanyard_char_mark`
- **Decal Surface & Size:** Floor surface directly under badge drop, 0.8 m across.
- **Decal Story & Context:** Melted nylon synthetic residue and scorch halo left when the executive fled the geothermal breach.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a tight localized star of melted black nylon weave fused into steel deck floor seams, surrounded by a faint yellowed sulfur heat scorch and hurried rubber-sole drag scuffs. Context: Melted nylon synthetic residue and scorch halo left when the executive fled the geothermal breach. Placement: Floor surface directly under badge drop, 0.8 m across.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 12. `drop_dig_manifest`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Excavation manifest proving Bore 7 exceeded charter depth by 900 meters.
- **Room Placement:** Deep ruins / drill site staging offices.
- **Placement Class & Dims:** Tabletop/floor document, 0.08 m H, 0.35 m W, 0.28 m D.
- **Verbs & Interaction:** `unfold manifest, inspect handwriting, store record.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_dig_manifest.png`
- **Emissive Accent:** Red grease-pencil margin notes (#ef4444)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop dig manifest (about 0.28 m D.): a thick, water-stained industrial excavation logbook bound in weather-hardened black oilcloth with brass binder rivets. The top pages have curled and singed at the corners, displaying printed geological strata tables for 'Bore 7'. In the margins, written in frantic red wax grease pencil, is the chilling handwritten note: 'IT IS WARM DOWN THERE. ROCK SHOULD NOT BE WARM.' A corporate variance waiver stamp marked 'APPROVED - FOREMAN SIGNATURE' is stamped diagonally across the depth chart. Story it tells: Excavation manifest proving Bore 7 exceeded charter depth by 900 meters. Exactly one accent light: Red grease-pencil margin notes (#ef4444); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_carbon_dust_document_ash`
- **Decal Surface & Size:** Desk or floor below manifest, 1.0 m wide.
- **Decal Story & Context:** Charred paper ash and greasy black graphite thumb smudges left where documents were hastily sorted.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a rectangular clean negative void in settled grey floor dust where a heavy folder lay for months, bordered by curled paper ash flakes and hurried black grease-pencil smudges. Context: Charred paper ash and greasy black graphite thumb smudges left where documents were hastily sorted. Placement: Desk or floor below manifest, 1.0 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 13. `drop_security_log`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Security contractor duty log: 'Day 63: The perimeter is not where we left it.'
- **Room Placement:** Ruins / abandoned security checkpoints.
- **Placement Class & Dims:** Grounded handheld console, 0.06 m H, 0.22 m W, 0.16 m D.
- **Verbs & Interaction:** `reboot datapad, read final log, store.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_security_log.png`
- **Emissive Accent:** Dim amber phosphor CRT scanlines (#f59e0b)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop security log (about 0.16 m D.): a heavy military-surplus tactical datapad in a rubberized olive-drab shock frame with exposed knurled thumbscrews. The protective armored glass screen is spider-webbed with cracks across the center, but still displays faint amber scanlines reading: 'DAY 63: PERIMETER QUIET... DAY 63: THE PERIMETER IS NOT WHERE WE LEFT IT. REQUESTING TRANSFER.' A severed tactical lanyard cable dangles from the lower corner loop. Story it tells: Security contractor duty log: 'Day 63: The perimeter is not where we left it.' Exactly one accent light: Dim amber phosphor CRT scanlines (#f59e0b); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_datapad_glass_shatter_spray`
- **Decal Surface & Size:** Floor around fallen security datapad, 1.2 m wide.
- **Decal Story & Context:** Fine tempered display glass crystals and battery acid bleed resulting from the datapad being dropped.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a radial spray of tiny shattered sapphire display glass shards catching ambient light, paired with a small black lithium battery electrolyte leak ring and frantic boot push marks. Context: Fine tempered display glass crystals and battery acid bleed resulting from the datapad being dropped. Placement: Floor around fallen security datapad, 1.2 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 14. `drop_survey_probe`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Pre-Horizon impact probe relic: 'BIOSIGN — POSITIVE — DEPTH UNKNOWN.'
- **Room Placement:** Impact craters and chasm edges.
- **Placement Class & Dims:** Crater debris pickup, 0.35 m H, 0.4 m W, 0.4 m D.
- **Verbs & Interaction:** `recover probe, download biosign telemetry, store.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_survey_probe.png`
- **Emissive Accent:** Pulsing faint violet sensor eye (#8b5cf6)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop survey probe (about 0.4 m D.): a hemispherical survey drone head of non-Horizon manufacture, made from seamless heat-ablated meteoric tungsten with mysterious circular sensor apertures. The central obsidian lens is cracked across its diameter, but deep inside, an analog vacuum indicator needle remains stuck pointing to 'BIOSIGN: POSITIVE'. The hull surface is pitted with atmospheric micro-meteorite craters and encrusted with black glass impact slag. Story it tells: Pre-Horizon impact probe relic: 'BIOSIGN — POSITIVE — DEPTH UNKNOWN.' Exactly one accent light: Pulsing faint violet sensor eye (#8b5cf6); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_vitrified_crater_ring`
- **Decal Surface & Size:** Floor impact depression, 1.4 m diameter.
- **Decal Story & Context:** Extreme thermal vitrification ring where ancient kinetic probe struck bedrock prior to glacier formation.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a concentric ring of high-gloss vitrified black glass formed in basalt rock, with hairline thermal contraction fractures and pale powdery mineral fallout radiating outward. Context: Extreme thermal vitrification ring where ancient kinetic probe struck bedrock prior to glacier formation. Placement: Floor impact depression, 1.4 m diameter.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 15. `drop_meteor_core`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Vitrified core sample that refracts pulsing light on an 11-second respiratory cycle.
- **Room Placement:** Deep crater floors and geothermal cavities.
- **Placement Class & Dims:** Mineral pedestal pickup, 0.2 m H, 0.3 m W, 0.2 m D.
- **Verbs & Interaction:** `attune to rhythm, collect specimen.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_meteor_core.png`
- **Emissive Accent:** Ethereal violet internal pulse (#a855f7)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop meteor core (about 0.2 m D.): an asymmetrical, oblong geological core sample of completely vitrified obsidian glass extracted by diamond coring drill. The exterior exhibits smooth cylindrical borehole ridges on one side and a jagged, fractured fracture face on the other. Deep within the core's black-purple interior, an organic lattice of microscopic filament inclusions refracts light in an unmistakable pulsing pattern that surges and dims every eleven seconds. Story it tells: Vitrified core sample that refracts pulsing light on an 11-second respiratory cycle. Exactly one accent light: Ethereal violet internal pulse (#a855f7); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_impact_radiation_halo`
- **Decal Surface & Size:** Floor beneath meteor core, 1.2 m diameter.
- **Decal Story & Context:** Persistent luminescent mineral halo and frost-free ring where the warm pulsing core rested.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a circular zone of clean, dry, completely melted deck floor surrounded by crisp white frost borders, displaying faint purple luminescent mineral dust settling into plate joints. Context: Persistent luminescent mineral halo and frost-free ring where the warm pulsing core rested. Placement: Floor beneath meteor core, 1.2 m diameter.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 16. `drop_ration_ledger`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Survivor camp contractor ledger: 'stopped counting mouths, started counting hands.'
- **Room Placement:** Camp supply caches / abandoned bunkrooms.
- **Placement Class & Dims:** Tabletop/bunk pickup, 0.05 m H, 0.2 m W, 0.14 m D.
- **Verbs & Interaction:** `open ledger, review names, collect.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_ration_ledger.png`
- **Emissive Accent:** None (matte unlit survival artifact)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop ration ledger (about 0.14 m D.): a small, dog-eared contractor field diary wrapped in blue polyethylene tape. The ruled grid paper pages are stained with motor oil and dried soup broth. A list of forty names in black ballpoint pen has been progressively crossed out in thick red carpenter pencil, ending on page 14 with the single grim entry: 'STOPPED COUNTING MOUTHS, STARTED COUNTING HANDS.' A stubby lead pencil is bound to the spine with wire. Story it tells: Survivor camp contractor ledger: 'stopped counting mouths, started counting hands.' Exactly one accent light: None (matte unlit survival artifact); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_rations_fingerprint_grime`
- **Decal Surface & Size:** Table or bench surface, 0.9 m wide.
- **Decal Story & Context:** Forensic grease smudges and food ration residue where survivors counted supplies in the dark.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of forensic greasy dark handprints and spilled synthetic nutrient broth stains settled into tabletop wood grain, accompanied by parallel pencil tally scratches. Context: Forensic grease smudges and food ration residue where survivors counted supplies in the dark. Placement: Table or bench surface, 0.9 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 17. `drop_dogtags`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Polished silver security dog tags belonging to Captain Vesper, K.
- **Room Placement:** Vesper Camp / Sector C-7 armory.
- **Placement Class & Dims:** Armory table/shrine pickup, 0.02 m H, 0.08 m W, 0.05 m D.
- **Verbs & Interaction:** `take dog tags, show to Briggs.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_dogtags.png`
- **Emissive Accent:** Restrained silver specular highlight

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop dogtags (about 0.05 m D.): a pair of standard stamped stainless-steel corporate security dog tags suspended on a fine ball-chain necklace with a worn black silicone silencing ring. Stamped with crisp corporate typography: 'VESPER, K. — CAPTAIN / SECURITY DETACHMENT 4 — BLOOD: O POS'. The reverse of the primary tag has been hand-buffed to a mirror finish through years of anxious thumb rubbing by Commander Briggs. Story it tells: Polished silver security dog tags belonging to Captain Vesper, K. Exactly one accent light: Restrained silver specular highlight; every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_dogtag_scraped_rub_halo`
- **Decal Surface & Size:** Metal shelf or desk surface, 0.7 m wide.
- **Decal Story & Context:** Fine circular rubbing abrasions where dog tags were handled daily on an armory cleaning table.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a small circular buffed patch on dark rusted iron with fine concentric micro-scratches, surrounded by gun-cleaning solvent residue and a small smudge of finger oil. Context: Fine circular rubbing abrasions where dog tags were handled daily on an armory cleaning table. Placement: Metal shelf or desk surface, 0.7 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 18. `drop_child_drawing`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Crayon drawing of a stick family and a yellow sun: 'keep her away from the vents.'
- **Room Placement:** Camp living quarters and ventilation mouths.
- **Placement Class & Dims:** Wall-pinned/floor pickup, 0.01 m H, 0.3 m W, 0.22 m D.
- **Verbs & Interaction:** `inspect drawing, read back note, store.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_child_drawing.png`
- **Emissive Accent:** Vivid wax-crayon yellow sun (#eab308)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop child drawing (about 0.22 m D.): a single sheet of heavy beige industrial drafting paper with ragged torn edges, carrying a child's wax-crayon illustration: a stick family standing beneath a large transparent bunker dome, beneath a blazing yellow spiral labeled 'SUN'. The paper is creased into quarters. On the reverse, scrawled in an adult's hurried pencil hand, is the haunting warning: 'KEEP HER AWAY FROM THE VENTS. IT MIMICS VOICES.' Story it tells: Crayon drawing of a stick family and a yellow sun: 'keep her away from the vents.' Exactly one accent light: Vivid wax-crayon yellow sun (#eab308); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_crayon_wax_floor_graffiti`
- **Decal Surface & Size:** Wall or floor near bunker ventilation grille, 1.1 m wide.
- **Decal Story & Context:** Crude wax crayon marks and tape adhesive residue left on bunker bulkheads.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of yellow and red wax crayon scrawls directly on soot-covered bunker wall plate, showing child-height spiral drawings and four dry dried rectangles of yellowed masking tape. Context: Crude wax crayon marks and tape adhesive residue left on bunker bulkheads. Placement: Wall or floor near bunker ventilation grille, 1.1 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 19. `drop_resin_locket`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Human silver locket entombed in amber alien resin: 'the brood archives what its hosts loved.'
- **Room Placement:** Hive chambers and gestation nodes.
- **Placement Class & Dims:** Biomass alcove pickup, 0.04 m H, 0.12 m W, 0.08 m D.
- **Verbs & Interaction:** `peer into amber, harvest locket.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_resin_locket.png`
- **Emissive Accent:** Warm glowing amber resin refraction (#f59e0b)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop resin locket (about 0.08 m D.): a vintage oval sterling silver keepsake locket suspended perfectly in the center of an elongated teardrop of clear, jewel-like amber alien resin. Through the polished amber, the open locket reveals a tiny, faded black-and-white photograph of a smiling woman on a sunlit terrace. Thin, glistening black resin veins wrap the outside of the amber drop like delicate surgical sutures, terminating in a broken chitin stem. Story it tells: Human silver locket entombed in amber alien resin: 'the brood archives what its hosts loved.' Exactly one accent light: Warm glowing amber resin refraction (#f59e0b); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_amber_resin_fracture_leak`
- **Decal Surface & Size:** Floor beneath hive archive wall, 1.0 m across.
- **Decal Story & Context:** Hardened golden amber resin drops and micro-fracture splinters from harvested brood curios.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a cluster of glossy, raised amber resin drips pooling on dark stone, with sharp transparent resin shards and sticky yellow trails spreading outward. Context: Hardened golden amber resin drops and micro-fracture splinters from harvested brood curios. Placement: Floor beneath hive archive wall, 1.0 m across.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 20. `drop_moult_shard`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Queen moult shard: 'shed carapace with interior grooves that are writing.'
- **Room Placement:** Sector Zero / Queen's throne approach.
- **Placement Class & Dims:** Altar/chitin pile pickup, 0.05 m H, 0.25 m W, 0.18 m D.
- **Verbs & Interaction:** `read Queen's script, harvest carapace.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_moult_shard.png`
- **Emissive Accent:** Subtle iridescent violet sheen (#c084fc)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop moult shard (about 0.18 m D.): a curved palm-sized plate of shed exoskeleton from the Brood Queen herself. The exterior is obsidian-hard, oil-slick iridescent black chitin with razor-sharp serrated edges. The concave interior face is smooth, bone-white, and densely covered in microscopic parallel grooves and paired punctures that form an alien mathematical script. Faint warmth radiates from the chitin even in sub-zero air. Story it tells: Queen moult shard: 'shed carapace with interior grooves that are writing.' Exactly one accent light: Subtle iridescent violet sheen (#c084fc); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_chitin_moult_calcium_bloom`
- **Decal Surface & Size:** Floor in Sector Zero chamber, 1.3 m wide.
- **Decal Story & Context:** Calcified white molting powder and bio-metallic chitin flakes shed during Queen growth cycles.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a dusting of fine white calcium molting powder forming a crescent outline on black rock, mixed with sharp iridescent chitin fragments and dark dried bio-plasma dots. Context: Calcified white molting powder and bio-metallic chitin flakes shed during Queen growth cycles. Placement: Floor in Sector Zero chamber, 1.3 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 21. `drop_first_bore_tag`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Original claim tag from the dig that broke into Sector Zero, punctured by mandibles.
- **Room Placement:** Sector Zero breach mouth / Bore 7 drill head.
- **Placement Class & Dims:** Rubble pile pickup, 0.03 m H, 0.15 m W, 0.15 m D.
- **Verbs & Interaction:** `examine claim tag, recover historical proof.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_first_bore_tag.png`
- **Emissive Accent:** Restrained tarnished brass highlight

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop first bore tag (about 0.15 m D.): a heavy circular stamped brass survey claim disc, 120mm across, stamped with corporate seal and: 'HORIZON CORP — EXPEDITION CLAIM 01 — BORE 7'. The corporate legal stamp 'VOID' has been stamped across the center in faded black ink. Piercing straight through the 6mm brass plate are two clean, conical paired puncture holes driven by massive alien mandibles, surrounded by heat-discolored brass. Story it tells: Original claim tag from the dig that broke into Sector Zero, punctured by mandibles. Exactly one accent light: Restrained tarnished brass highlight; every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_bore_mandible_puncture_drag`
- **Decal Surface & Size:** Floor at Bore 7 breach mouth, 1.1 m long.
- **Decal Story & Context:** Twin gouged scrape lines where the claim tag was violently torn from its survey bedrock mount.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of paired parallel gouge grooves cut into solid basalt rock with crushed brass swarf and pulverized rock dust, terminating at a shattered anchor bolt hole. Context: Twin gouged scrape lines where the claim tag was violently torn from its survey bedrock mount. Placement: Floor at Bore 7 breach mouth, 1.1 m long.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 22. `drop_prayer_stone`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Cultist river stone inscribed: 'SHE DREAMS US WARM.'
- **Room Placement:** The Cave / geothermal steam niches.
- **Placement Class & Dims:** Stone cairn pickup, 0.08 m H, 0.18 m W, 0.12 m D.
- **Verbs & Interaction:** `sense heat, read inscription, collect.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_prayer_stone.png`
- **Emissive Accent:** Faint thermal warmth shimmer

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop prayer stone (about 0.12 m D.): a dense, smooth black river cobble stone worn round by ancient subterranean water flows. Across one flat face, careful human lettering has been chiseled with a hammer and punch, filled with white lead pigment: 'SHE DREAMS US WARM'. The stone holds residual geothermal heat, warming the palm through an insulated exosuit glove. Story it tells: Cultist river stone inscribed: 'SHE DREAMS US WARM.' Exactly one accent light: Faint thermal warmth shimmer; every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_prayer_kneeling_wear_crescent`
- **Decal Surface & Size:** Floor in front of prayer niche, 1.2 m wide.
- **Decal Story & Context:** Worn circular floor depression where early cultists knelt in meditation before the alien Queen.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a smooth crescent wear depression in rough cave stone surrounded by tiny melted wax droplets and fine charcoal dust from devotional incense. Context: Worn circular floor depression where early cultists knelt in meditation before the alien Queen. Placement: Floor in front of prayer niche, 1.2 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 23. `drop_frozen_letter`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Unsent letter in a sealed pouch: 'when my contract clears I will buy the orchard plot.'
- **Room Placement:** Cryo sector corridors / frozen bunk cubicles.
- **Placement Class & Dims:** Frozen corpse/shelf pickup, 0.02 m H, 0.24 m W, 0.16 m D.
- **Verbs & Interaction:** `wipe frost, inspect letter, preserve.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_frozen_letter.png`
- **Emissive Accent:** None (matte paper and blue frost rind)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop frozen letter (about 0.16 m D.): a standard corporate inter-system mail envelope sealed inside a transparent frosted vinyl biohazard pouch. The paper inside has turned brittle with sub-zero frost, but handwritten blue ink cursive remains legible through the plastic: '— AND WHEN MY CONTRACT CLEARS I WILL BUY THE ORCHARD PLOT, THE ONE WITH THE SOUTH WALL. HOLD IT FOR ME. HOLD EVERYTHING.' A red corporate stamp reads 'POSTAGE UNPAID — SERVICE SUSPENDED'. Story it tells: Unsent letter in a sealed pouch: 'when my contract clears I will buy the orchard plot.' Exactly one accent light: None (matte paper and blue frost rind); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_sublimated_frost_paper_outline`
- **Decal Surface & Size:** Frozen metal bunk or deck plate, 0.9 m wide.
- **Decal Story & Context:** Crisp paper outline left in thick frost where the letter lay frozen for decades.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a sharp rectangular clean void in dense white crystalline hoarfrost on blue painted steel, with feathering ice crystals growing along the margins. Context: Crisp paper outline left in thick frost where the letter lay frozen for decades. Placement: Frozen metal bunk or deck plate, 0.9 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 24. `drop_black_flask`
- **Suite:** Physical Lore Collectibles
- **Story & Worldbuilding:** Engraved flask: 'TO THE BEST CREW ON THE WORST ROCK — DAY 1000.'
- **Room Placement:** Maintenance crossroads and common areas.
- **Placement Class & Dims:** Bench/floor pickup, 0.06 m H, 0.16 m W, 0.1 m D.
- **Verbs & Interaction:** `uncap flask, shake liquid, collect.`
- **Persisted States:** `grounded item | collected.`
- **Resolves Gap:** Replaces `2D sprite public/drop_black_flask.png`
- **Emissive Accent:** Restrained steel highlight

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE drop black flask (about 0.1 m D.): a curved, heavy-gauge stainless-steel pocket hip flask finished in chipped matte-black baked enamel with a captive knurled screw cap on a brass hinge arm. Hand-engraved across the face with a mechanical scriber: 'TO THE BEST CREW ON THE WORST ROCK — DAY 1000'. The flask is still half-full of amber synthetic ethanol, sloshing when picked up. Story it tells: Engraved flask: 'TO THE BEST CREW ON THE WORST ROCK — DAY 1000.' Exactly one accent light: Restrained steel highlight; every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_liquor_spill_evaporation_stain`
- **Decal Surface & Size:** Floor beside fallen flask, 1.0 m across.
- **Decal Story & Context:** Dark circular alcohol evaporation ring and sticky syrup residue from spilled contractor liquor.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a concentric dried dark brown syrup stain on rusted deck plating, with radial splatter droplets and a rectangular dent from the flask falling from height. Context: Dark circular alcohol evaporation ring and sticky syrup residue from spilled contractor liquor. Placement: Floor beside fallen flask, 1.0 m across.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

### Survivor Camp Infrastructure

#### 25. `prop_camp_meridian_battery_bank`
- **Suite:** Survivor Camp Infrastructure
- **Story & Worldbuilding:** Heavy high-voltage electrical storage maintaining Meridian Camp's life support.
- **Room Placement:** Meridian Camp generator room (Sector A-9).
- **Placement Class & Dims:** Floor-standing heavy utility, 1.8 m H, 2.2 m W, 0.8 m D.
- **Verbs & Interaction:** `check charge, reroute cells, overload breaker.`
- **Persisted States:** `charging (buzzing) | discharging | depleted | arcing.`
- **Resolves Gap:** Replaces `2D sprite public/prop_camp_meridian_battery_bank.jpg`
- **Emissive Accent:** Cyan electrical charge level indicator tubes (#22d3ee)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop camp meridian battery bank (about 0.8 m D.): a massive two-tier industrial battery rack made from structural angle iron and heavy timber isolation blocks, holding eight transparent glass-cased lead-acid accumulator cells filled with bubbling golden electrolyte. Polished copper bus-bars span between lead terminal posts with heavy ceramic insulating nuts. Vertical glass hydrometer tubes on the end panel display glowing cyan float indicators showing current power reserve levels. Thick braided ground cables snake into the floor deck seams. Story it tells: Heavy high-voltage electrical storage maintaining Meridian Camp's life support. Exactly one accent light: Cyan electrical charge level indicator tubes (#22d3ee); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_battery_acid_sulfur_boil`
- **Decal Surface & Size:** Floor deck under battery rack, 2.0 m wide.
- **Decal Story & Context:** Boiling battery acid overflow, yellow sulfur crust, and corroded deck plate pitting.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a broad area of chemically pitted and peeled grey paint showing etched bare steel, encrusted with pale yellow sulfur crystals and damp green copper-verdigris drip halos. Context: Boiling battery acid overflow, yellow sulfur crust, and corroded deck plate pitting. Placement: Floor deck under battery rack, 2.0 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 26. `prop_camp_meridian_repair_rig`
- **Suite:** Survivor Camp Infrastructure
- **Story & Worldbuilding:** Kaelen's cybernetic modification and telemetry soldering hearth.
- **Room Placement:** Meridian engineering workshop.
- **Placement Class & Dims:** Floor-standing workstation, 1.9 m H, 1.8 m W, 0.9 m D.
- **Verbs & Interaction:** `solder telemetry, calibrate rig, craft weapon mod.`
- **Persisted States:** `idle | soldering (smoke/sparks) | powered down.`
- **Resolves Gap:** Replaces `2D sprite public/prop_camp_meridian_repair_rig.jpg`
- **Emissive Accent:** Red-hot soldering iron heating coil (#ef4444)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop camp meridian repair rig (about 0.9 m D.): a heavy cast-iron machinist bench converted into a high-tech cybernetic fabrication rig. Features a mounted articulating inspection arm with illuminated magnifying lens, a dual-wand high-frequency soldering station with red-hot ceramic elements, and an integrated steel bench vise clamping a dissected telemetry housing. Spools of fine silver solder and copper shielding mesh sit on overhead brackets above an analog cathode-ray oscilloscope screen. Story it tells: Kaelen's cybernetic modification and telemetry soldering hearth. Exactly one accent light: Red-hot soldering iron heating coil (#ef4444); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_soldering_flux_droplet_spray`
- **Decal Surface & Size:** Floor directly in front of repair rig bench, 1.5 m wide.
- **Decal Story & Context:** Solder droplet splatter, amber rosin flux burns, and wire clipping scatter.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a dense scatter of tiny silver solder beads flattened onto steel deck plate, surrounded by dark amber sticky rosin flux burn circles and clipped copper wire fragments. Context: Solder droplet splatter, amber rosin flux burns, and wire clipping scatter. Placement: Floor directly in front of repair rig bench, 1.5 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 27. `prop_camp_tallow_still`
- **Suite:** Survivor Camp Infrastructure
- **Story & Worldbuilding:** Geothermal steam condensing apparatus providing fresh drinking water and nutrient fluid to Tallow.
- **Room Placement:** Tallow Camp distillery / steam shafts (Sector B-4).
- **Placement Class & Dims:** Floor-standing vertical distiller, 2.4 m H, 1.4 m W, 1.2 m D.
- **Verbs & Interaction:** `tap drinking water, flush mineral scale, adjust heat coil.`
- **Persisted States:** `distilling (bubbling) | overboiling | cold.`
- **Resolves Gap:** Replaces `2D sprite public/prop_camp_tallow_still.jpg`
- **Emissive Accent:** Warm amber liquid glow in condensation sight-glass (#f59e0b)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop camp tallow still (about 1.2 m D.): an impressive artisanal distillation tower constructed from hammered copper plates, tinned brass pipes, and recycled industrial autoclave tanks. High-pressure steam enters through a bottom flange into a helical copper cooling coil bathed in cold meltwater. The purified water drips through a glass sight-column into a 200-liter oak and stainless-steel collection cask with a brass gravity tap. Condensate beads sweat across every polished copper curve. Story it tells: Geothermal steam condensing apparatus providing fresh drinking water and nutrient fluid to Tallow. Exactly one accent light: Warm amber liquid glow in condensation sight-glass (#f59e0b); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_distiller_mineral_scale_runoff`
- **Decal Surface & Size:** Floor surrounding distillation collection cask, 2.2 m long.
- **Decal Story & Context:** White lime-mineral runoff scale and constant warm moisture puddling beneath still.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a wet low-roughness water puddle trail ringed by thick white calcium-carbonate mineral crust rings, with green moss creeping along the damp drainage channels. Context: White lime-mineral runoff scale and constant warm moisture puddling beneath still. Placement: Floor surrounding distillation collection cask, 2.2 m long.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 28. `prop_camp_tallow_spore_trays`
- **Suite:** Survivor Camp Infrastructure
- **Story & Worldbuilding:** Tiered agrarian cultivation trays growing bioluminescent lichen and medicinal bio-vaccine molds.
- **Room Placement:** Tallow Camp hydroponic nursery.
- **Placement Class & Dims:** Floor-standing tiered shelf, 1.7 m H, 1.6 m W, 0.9 m D.
- **Verbs & Interaction:** `harvest lichen, mist spore trays, collect vaccine mold.`
- **Persisted States:** `blooming (glowing) | harvested | dry.`
- **Resolves Gap:** Replaces `2D sprite public/prop_camp_tallow_spore_trays.jpg`
- **Emissive Accent:** Vibrant emerald bioluminescent spore glow (#10b981)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop camp tallow spore trays (about 0.9 m D.): a three-tier stepped nursery rack made from slotted zinc-plated angle iron supporting deep wooden cultivation flats lined with porous black basalt gravel. Each tray is carpeted in thick, moist bioluminescent lichen and soft fungal cups that glow with vibrant emerald light. A top-mounted drip irrigation line fabricated from perforated copper tubing periodically drips geothermal nutrient broth across the beds. Story it tells: Tiered agrarian cultivation trays growing bioluminescent lichen and medicinal bio-vaccine molds. Exactly one accent light: Vibrant emerald bioluminescent spore glow (#10b981); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_hydro_nutrient_lime_tide`
- **Decal Surface & Size:** Floor beneath hydroponic spore trays, 1.8 m wide.
- **Decal Story & Context:** Fertilizer nutrient lime spills, dark wet soil grit, and escaped mycelial threads.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a tide of dark nutrient soil mud and pale green mineral fertilizer crust spreading between duckboard slats, with microscopic white mycelial rhizoids anchoring to deck seams. Context: Fertilizer nutrient lime spills, dark wet soil grit, and escaped mycelial threads. Placement: Floor beneath hydroponic spore trays, 1.8 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 29. `prop_camp_tallow_resin_urn`
- **Suite:** Survivor Camp Infrastructure
- **Story & Worldbuilding:** Ceremonial vessel holding aromatic amber sealing resin harvested from benign hive blooms.
- **Room Placement:** Tallow Camp communal shrine.
- **Placement Class & Dims:** Floor-standing pedestal vessel, 1.1 m H, 0.8 m W, 0.8 m D.
- **Verbs & Interaction:** `scoop resin, apply seal, inhale vapor.`
- **Persisted States:** `full of resin | half-empty | solidified.`
- **Resolves Gap:** Replaces `2D sprite public/prop_camp_tallow_resin_urn.jpg`
- **Emissive Accent:** Golden amber resin refraction (#f59e0b)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop camp tallow resin urn (about 0.8 m D.): a monumental Nordic Jugendstil vessel carved from solid grey soapstone with relief carvings of elongated fern leaves and intertwining serpents. The wide mouth is fitted with a hinged brass rim holding a carved bone ladle. Inside, thick golden aromatic pine-and-amber resin glows with warm inner light, giving off a soothing vapor that slows spore infection rates. Thick glossy resin drippings coat the exterior stone. Story it tells: Ceremonial vessel holding aromatic amber sealing resin harvested from benign hive blooms. Exactly one accent light: Golden amber resin refraction (#f59e0b); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_resin_urn_ring_overflow`
- **Decal Surface & Size:** Floor around soapstone resin urn, 1.3 m diameter.
- **Decal Story & Context:** Concentric resin drip rings and sticky amber shoe tracks radiating from the urn.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a circular puddle of thick golden hardened resin with concentric overflow ridges, showing two distinct tacky shoe tread marks where cultists stood to ladle resin. Context: Concentric resin drip rings and sticky amber shoe tracks radiating from the urn. Placement: Floor around soapstone resin urn, 1.3 m diameter.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 30. `prop_camp_vesper_turret`
- **Suite:** Survivor Camp Infrastructure
- **Story & Worldbuilding:** Automated twin-barrel sentry defense turret securing Vesper Camp's perimeter.
- **Room Placement:** Vesper Camp checkpoint / perimeter gate (Sector C-7).
- **Placement Class & Dims:** Floor-standing heavy defense, 1.6 m H, 1.4 m W, 1.4 m D.
- **Verbs & Interaction:** `reload ammo drum, re-target sensor, power down.`
- **Persisted States:** `tracking (scanning) | firing | empty | disabled.`
- **Resolves Gap:** Replaces `2D sprite public/prop_camp_vesper_turret.jpg`
- **Emissive Accent:** Harsh red targeting laser and optic ring (#ef4444)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop camp vesper turret (about 1.4 m D.): a lethal military automated sentry turret mounted on a heavy tripod base bolted to the concrete floor with expansion anchors. The armored traverse turret housing holds twin air-cooled 12.7mm machine gun barrels with slotted muzzle brakes and a side-mounted 250-round corrugated steel drum magazine. A central cyclopean optic turret swivels on dual axes, projecting a razor-sharp red tracking line. Stenciled in chipped white paint: 'VESPER PERIMETER GUN 02'. Story it tells: Automated twin-barrel sentry defense turret securing Vesper Camp's perimeter. Exactly one accent light: Harsh red targeting laser and optic ring (#ef4444); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_turret_traverse_ring_swarf`
- **Decal Surface & Size:** Floor beneath sentry turret tripod, 2.2 m diameter.
- **Decal Story & Context:** Circular 360-degree turret traverse wear track and dense pile of spent brass casings.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a complete circular 360-degree grease track worn into floor deck paint by the turret's traverse mechanism, filled with fifty spent brass cartridges, link pins, and muzzle carbon soot. Context: Circular 360-degree turret traverse wear track and dense pile of spent brass casings. Placement: Floor beneath sentry turret tripod, 2.2 m diameter.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 31. `prop_camp_vesper_ammo_press`
- **Suite:** Survivor Camp Infrastructure
- **Story & Worldbuilding:** Hand-operated munitions reloading bench for Vesper's weapons factory.
- **Room Placement:** Vesper Camp armory workshop.
- **Placement Class & Dims:** Floor-standing heavy tool bench, 1.5 m H, 1.2 m W, 0.7 m D.
- **Verbs & Interaction:** `press cartridges, seat primers, measure powder.`
- **Persisted States:** `ready to load | pressing | powder empty.`
- **Resolves Gap:** Replaces `2D sprite public/prop_camp_vesper_ammo_press.jpg`
- **Emissive Accent:** Restrained polished tool steel highlight

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop camp vesper ammo press (about 0.7 m D.): a massive cast-iron reloading bench anchored by four floor studs, fitted with a heavy twin-station progressive ammunition press. A long steel operating lever with an oversized black phenolic knob actuates hardened tungsten-carbide sizing dies. An acrylic smokeless powder measure hopper feeds from above, flanked by a primer seating tray and wooden inspection blocks holding rows of freshly assembled copper-jacketed cartridges. Story it tells: Hand-operated munitions reloading bench for Vesper's weapons factory. Exactly one accent light: Restrained polished tool steel highlight; every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_gunpowder_spill_carbon_smear`
- **Decal Surface & Size:** Floor directly in front of ammo press, 1.4 m wide.
- **Decal Story & Context:** Spilled smokeless gunpowder flakes, lead shavings, and black graphite carbon smears.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a fine scatter of tiny cylindrical black smokeless gunpowder grains ground into floor seams, paired with bright silver lead filings and oily operator boot heel scuffs. Context: Spilled smokeless gunpowder flakes, lead shavings, and black graphite carbon smears. Placement: Floor directly in front of ammo press, 1.4 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 32. `prop_camp_vesper_shield_rack`
- **Suite:** Survivor Camp Infrastructure
- **Story & Worldbuilding:** Riot and ballistic shield storage rack for Vesper's breach teams.
- **Room Placement:** Vesper Camp muster station.
- **Placement Class & Dims:** Wall-backed storage rack, 1.8 m H, 1.6 m W, 0.5 m D.
- **Verbs & Interaction:** `equip shield, restock armor, inspect damage.`
- **Persisted States:** `full (3 shields) | partial | empty rack.`
- **Resolves Gap:** Replaces `2D sprite public/prop_camp_vesper_shield_rack.jpg`
- **Emissive Accent:** Red stencil 'VESPER GUILD ARMOR' (#ef4444)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop camp vesper shield rack (about 0.5 m D.): a heavy welded angle-iron vertical storage stanchion with padded rubber divider slots designed to hold three heavy ballistic riot shields. Two shields rest in the slots: curved 12mm layered polycarbonate and steel blast shields with reinforced viewports, padded forearm straps, and heavy rubber ground-strike bumpers. The third slot stands empty. The shields are heavily scored with deep combat scratches and blunt trauma dents. Story it tells: Riot and ballistic shield storage rack for Vesper's breach teams. Exactly one accent light: Red stencil 'VESPER GUILD ARMOR' (#ef4444); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_shield_impact_gouges_apron`
- **Decal Surface & Size:** Floor in front of shield rack, 1.6 m wide.
- **Decal Story & Context:** Heavy gouges in floor deck paint where heavy steel shields were repeatedly dropped into place.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of three parallel pairs of rectangular chipped paint gouges worn to bright steel where shield bottom rims strike the floor, with rubber bumper scuffs and dropped bolt washers. Context: Heavy gouges in floor deck paint where heavy steel shields were repeatedly dropped into place. Placement: Floor in front of shield rack, 1.6 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 33. `prop_camp_grave_fresh`
- **Suite:** Survivor Camp Infrastructure
- **Story & Worldbuilding:** Fresh burial mound marking recent casualties from alien crawler raids.
- **Room Placement:** Camp perimeter / exterior cemetery cavern.
- **Placement Class & Dims:** Floor mound, 0.7 m H, 1.8 m W, 0.9 m D.
- **Verbs & Interaction:** `inspect grave, pay respects, collect spent shell marker.`
- **Persisted States:** `fresh dirt | settled | disturbed.`
- **Resolves Gap:** Replaces `2D sprite public/prop_camp_grave_fresh.png`
- **Emissive Accent:** Restrained spent brass shell marker highlight

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop camp grave fresh (about 0.9 m D.): a freshly excavated burial mound of dark icy gravel, crushed basalt rock, and frozen clay, piled 70cm high. At the head of the mound stands a rough marker cross welded together from two pieces of rusted steel rebar, tied with a strip of faded hazard flagging tape. Rested against the cross is a battered pair of size-11 contractor work boots, and four empty brass shell casings are driven neck-down into the fresh gravel. Story it tells: Fresh burial mound marking recent casualties from alien crawler raids. Exactly one accent light: Restrained spent brass shell marker highlight; every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_grave_spade_excavation_dirt`
- **Decal Surface & Size:** Floor surrounding fresh grave mound, 2.2 m wide.
- **Decal Story & Context:** Excavation shovel scrape marks and spilled loose frozen spoil around the fresh grave.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a broad halo of freshly shoveled dark gravel dirt and pulverized permafrost dust spread over grey stone, showing flat spade blade marks and knee-kneeling imprints. Context: Excavation shovel scrape marks and spilled loose frozen spoil around the fresh grave. Placement: Floor surrounding fresh grave mound, 2.2 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 34. `prop_camp_grave_old`
- **Suite:** Survivor Camp Infrastructure
- **Story & Worldbuilding:** Sunken, frostbitten grave from the earliest collapse winter.
- **Room Placement:** Deep bunker graveyard / forgotten corridors.
- **Placement Class & Dims:** Sunken floor grave, 0.4 m H, 1.9 m W, 1.0 m D.
- **Verbs & Interaction:** `clear frost rind, read eroded tag.`
- **Persisted States:** `frostbitten | cleared | sunken.`
- **Resolves Gap:** Replaces `2D sprite public/prop_camp_grave_old.png`
- **Emissive Accent:** Pale cyan crystalline permafrost crust (#22d3ee)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop camp grave old (about 1.0 m D.): an ancient, sunken grave from the initial bunker collapse, where the settlement of frozen earth has left a rectangular depression in the rock. A cracked pre-cast concrete marker slab lies tilted at the head, heavily weathered and choked with thick white hoarfrost and pale blue ice rind. An eroded copper identification tag half-submerged in the ice reads only: '...MINING TEAM 4... 2024'. Story it tells: Sunken, frostbitten grave from the earliest collapse winter. Exactly one accent light: Pale cyan crystalline permafrost crust (#22d3ee); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_sunken_permafrost_grave_heave`
- **Decal Surface & Size:** Floor around sunken grave, 2.4 m long.
- **Decal Story & Context:** Frost-heave fracture lines and creeping permafrost crust surrounding old grave.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of radial frost-heave tensile cracks splitting cold deck concrete around a sunken rectangular depression, with crystalline hoarfrost filling every fracture and grey lichen creeping across the edges. Context: Frost-heave fracture lines and creeping permafrost crust surrounding old grave. Placement: Floor around sunken grave, 2.4 m long.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

### PregAlien Hive Ecology

#### 35. `prop_alien_feeding_basin`
- **Suite:** PregAlien Hive Ecology
- **Story & Worldbuilding:** Biomechanical nutrient pool where worker aliens feed developing larval broods.
- **Room Placement:** Sector Zero / hive nursery cavities.
- **Placement Class & Dims:** Floor-recessed cistern, 1.3 m H, 2.0 m W, 1.8 m D.
- **Verbs & Interaction:** `sample biological slurry, poison basin, inspect larvae.`
- **Persisted States:** `bubbling slurry | contaminated | drained.`
- **Resolves Gap:** Replaces `2D sprite public/prop_alien_feeding_basin.png`
- **Emissive Accent:** Fluorescent lime-green bioluminescent nutrient slurry (#84cc16)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop alien feeding basin (about 1.8 m D.): a massive organic cistern basin grown from the cave floor: a flared bowl of ribbed calcified ivory bone lined with glistening purple mucus membranes. The basin is half-filled with thick, glowing lime-green biological slurry that bubbles with slow anaerobic gas releases. Three ribbed peristaltic feeder conduits dangle into the pool from overhead bone arches, pumping nutrient fluid with rhythmic wet contractions. Small translucent larval pods cling to the submerged bone ribs. Story it tells: Biomechanical nutrient pool where worker aliens feed developing larval broods. Exactly one accent light: Fluorescent lime-green bioluminescent nutrient slurry (#84cc16); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_feeding_slurry_regurgitation_splash`
- **Decal Surface & Size:** Floor surrounding feeding basin, 2.4 m wide.
- **Decal Story & Context:** Thick glowing regurgitated feeding slurry splashes and acidic slime puddles.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a wide irregular splatter of viscous lime-green nutrient slurry pools on dark basalt, showing thick raised droplet rims, oily rainbow surface sheen, and acidic foam bubbles along the margins. Context: Thick glowing regurgitated feeding slurry splashes and acidic slime puddles. Placement: Floor surrounding feeding basin, 2.4 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 36. `prop_alien_respiratory_vent`
- **Suite:** PregAlien Hive Ecology
- **Story & Worldbuilding:** Atmospheric bio-exchanger circulating oxygen and alien pheromones through Sector Zero.
- **Room Placement:** Deep hive corridors / wall apertures.
- **Placement Class & Dims:** Wall-mounted organic vent, 1.8 m H, 1.1 m W, 1.1 m D.
- **Verbs & Interaction:** `inhale pheromone, block airway, sample gas.`
- **Persisted States:** `exhaling (mist) | inhaling | occluded.`
- **Resolves Gap:** Replaces `2D sprite public/prop_alien_respiratory_vent.png`
- **Emissive Accent:** Deep violet membrane tissue (#a855f7)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop alien respiratory vent (about 1.1 m D.): a towering organic respiratory chimney grown directly out of a breached bunker steel ventilation duct. Flared petal-like ribs of dark polished chitin encase a central pulsing throat of wet, dark violet pulmonary tissue. Every eight seconds, the throat dilates smoothly, exhaling a warm plume of translucent vapor smelling of sweet musk and copper. Fine glandular pores along the chitin rim weep glistening amber fluid. Story it tells: Atmospheric bio-exchanger circulating oxygen and alien pheromones through Sector Zero. Exactly one accent light: Deep violet membrane tissue (#a855f7); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_respiratory_exhale_spore_cone`
- **Decal Surface & Size:** Floor in front of respiratory vent, 2.5 m long.
- **Decal Story & Context:** Directional vapor cone fallout, moist spore dusting, and damp condensate marks.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a directional conical fan of damp moisture condensation and fine purple spore dust extending 2.5 meters from the vent base, with dark wet droplet rings forming along the central trajectory. Context: Directional vapor cone fallout, moist spore dusting, and damp condensate marks. Placement: Floor in front of respiratory vent, 2.5 m long.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 37. `prop_hive_chitin_hatchery`
- **Suite:** PregAlien Hive Ecology
- **Story & Worldbuilding:** Incubation chamber where cyber-snail embryos fuse with corporate salvage.
- **Room Placement:** Hive fringe / scrap-infested bio-chambers.
- **Placement Class & Dims:** Floor-standing nursery mound, 2.2 m H, 2.6 m W, 1.8 m D.
- **Verbs & Interaction:** `crush embryos, harvest titanium scrap, disturb nest.`
- **Persisted States:** `incubating | shattered | harvested.`
- **Resolves Gap:** Replaces `2D sprite public/prop_hive_chitin_hatchery.jpg`
- **Emissive Accent:** Amber embryonic glow through shell cauls (#f59e0b)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop hive chitin hatchery (about 1.8 m D.): a sprawling biological incubation mound built from layers of hardened black resin, shredded corporate electrical cables, and calcified bone struts. Embedded throughout the mound are ten large, translucent amber amniotic pods, inside of which half-formed cybernetic snail shells and pulsing cyber-circuit grafts are clearly visible in warm fluid. Heavy umbilical hoses connect the mound to an overhead corporate power line, stealing electricity to warm the brood. Story it tells: Incubation chamber where cyber-snail embryos fuse with corporate salvage. Exactly one accent light: Amber embryonic glow through shell cauls (#f59e0b); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_hatchery_mucus_wallowing_pool`
- **Decal Surface & Size:** Floor perimeter of hatchery mound, 2.8 m across.
- **Decal Story & Context:** Viscous amniotic wallow pool and crawler emergence drag tracks.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a heavy circular pool of thick, amber-tinted amniotic slime on the floor grating, showing multiple radiating crawler abdomen drag tracks and broken shell fragments. Context: Viscous amniotic wallow pool and crawler emergence drag tracks. Placement: Floor perimeter of hatchery mound, 2.8 m across.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 38. `prop_hive_relay_antenna`
- **Suite:** PregAlien Hive Ecology
- **Story & Worldbuilding:** Bio-frequency amplifier used by Vey, The Listener, to broadcast spoofed clearances.
- **Room Placement:** Acoustic chambers / deep hive spires.
- **Placement Class & Dims:** Floor-standing spire monolith, 2.8 m H, 1.2 m W, 1.0 m D.
- **Verbs & Interaction:** `tune frequency, jam signal, align bio-antenna.`
- **Persisted States:** `listening (humming) | transmitting | jammed.`
- **Resolves Gap:** Replaces `2D sprite public/prop_hive_relay_antenna.jpg`
- **Emissive Accent:** Cyan electrical static sparking across sensory filaments (#22d3ee)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop hive relay antenna (about 1.0 m D.): an eerie, slender organic antenna spire rising 2.8 meters tall: a central fluted column of fused spinal vertebrae and blackened iron conduit tapering to a needle-sharp apex. Branching from the upper third are twelve ultra-thin, glistening chitin tuning needles that vibrate with continuous ultrasonic resonance, creating visible air ripples. Strands of bio-luminescent cyan lichen wrap the base, sparking with micro-electrostatic discharges. Story it tells: Bio-frequency amplifier used by Vey, The Listener, to broadcast spoofed clearances. Exactly one accent light: Cyan electrical static sparking across sensory filaments (#22d3ee); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_relay_neural_static_lichen_ring`
- **Decal Surface & Size:** Floor surrounding relay antenna spire, 2.0 m diameter.
- **Decal Story & Context:** Concentric rings of acoustic vibration dust and fine static discharge burns.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of concentric nodal rings of fine pulverized white rock dust sorted by ultrasonic vibration frequencies, interrupted by tiny radial electrostatic carbon burn pinpoints. Context: Concentric rings of acoustic vibration dust and fine static discharge burns. Placement: Floor surrounding relay antenna spire, 2.0 m diameter.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 39. `prop_hive_suture_organ`
- **Suite:** PregAlien Hive Ecology
- **Story & Worldbuilding:** Healing tissue organ cultivated by Nahl, The Suture, to stitch severed hosts.
- **Room Placement:** Nahl's alcove / biomaterial hospital.
- **Placement Class & Dims:** Wall-mounted organic loom, 1.6 m H, 1.3 m W, 0.9 m D.
- **Verbs & Interaction:** `harvest suture thread, repair carapace, soothe wound.`
- **Persisted States:** `weaving (threads taut) | harvested | dormant.`
- **Resolves Gap:** Replaces `2D sprite public/prop_hive_suture_organ.jpg`
- **Emissive Accent:** Soft pink fleshy vascular glow (#f43f5e)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop hive suture organ (about 0.9 m D.): a delicate, beautiful biomechanical organ mounted in a shallow wall niche: two curved ivory bone arms extend outward like a weaver's loom, holding hundreds of taut, micro-thin translucent biological suture threads. In the center, a soft, pulsating plum-colored muscular heart pumps clear healing albumin through hair-like glass pipettes. Glistening droplets of surgical resin hang suspended from the thread tips like dewdrops on spider silk. Story it tells: Healing tissue organ cultivated by Nahl, The Suture, to stitch severed hosts. Exactly one accent light: Soft pink fleshy vascular glow (#f43f5e); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_suture_silk_thread_drool`
- **Decal Surface & Size:** Floor and wall below suture organ, 1.7 m wide.
- **Decal Story & Context:** Fine silvery suture thread drool and dried clear albumin pools.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a fine web of fallen silver bio-silk threads tangled over dark stone, set into a clean, high-gloss puddle of clear dried albumin resin with delicate finger drag marks. Context: Fine silvery suture thread drool and dried clear albumin pools. Placement: Floor and wall below suture organ, 1.7 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 40. `prop_hive_synaptic_web`
- **Suite:** PregAlien Hive Ecology
- **Story & Worldbuilding:** Neural communication web transmitting the Queen's telepathic whispers.
- **Room Placement:** Corridor ceilings and wall intersections across Sector Zero.
- **Placement Class & Dims:** Wall-spanning neural lattice, 2.0 m H, 2.4 m W, 0.4 m D.
- **Verbs & Interaction:** `listen to whisper, sever synaptic bridge, ground node.`
- **Persisted States:** `whispering (pulsing) | disrupted | dead.`
- **Resolves Gap:** Replaces `2D sprite public/prop_hive_synaptic_web.jpg`
- **Emissive Accent:** Pulsing violet-magenta neural nodes (#d946ef)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop hive synaptic web (about 0.4 m D.): a complex, sprawling web of taut bio-neural fibers stretched flat across a corridor wall. The primary cables are thick, glossy black cords that pulse with traveling knots of magenta bioluminescent light. At each junction node sits a translucent disc of neural tissue that twitches when sound or motion passes nearby. Fine bone mounting anchors pierce the rock, anchoring the living computational web firmly to the bunker architecture. Story it tells: Neural communication web transmitting the Queen's telepathic whispers. Exactly one accent light: Pulsing violet-magenta neural nodes (#d946ef); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_synaptic_discharge_scorched_membrane`
- **Decal Surface & Size:** Wall surface behind neural web, 2.1 m wide.
- **Decal Story & Context:** Neural discharge scorch marks and ruptured membrane residue when synaptic node is severed.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a dendritic branching pattern of fine electrical scorch tracks etched into bulkhead paint, surrounded by ruptured purple biological membrane flakes and clear electrolyte fluid. Context: Neural discharge scorch marks and ruptured membrane residue when synaptic node is severed. Placement: Wall surface behind neural web, 2.1 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 41. `prop_hive_wound_cauterizer`
- **Suite:** PregAlien Hive Ecology
- **Story & Worldbuilding:** Thermal plasma bio-station used to seal and graft human limbs to chitin chassis.
- **Room Placement:** Biomechanical conversion lab.
- **Placement Class & Dims:** Floor-standing surgical fixture, 1.9 m H, 1.5 m W, 1.1 m D.
- **Verbs & Interaction:** `cauterize graft, inspect surgical tools, purge burner.`
- **Persisted States:** `preheated (flame) | searing graft | cold.`
- **Resolves Gap:** Replaces `2D sprite public/prop_hive_wound_cauterizer.jpg`
- **Emissive Accent:** Blazing thermal orange plasma emitter (#f97316)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop hive wound cauterizer (about 1.1 m D.): a horrifying hybrid surgical installation: a heavy cast-iron gurney arm fitted with articulating mechanical claws that cradle a high-temperature geothermal plasma torch. The torch nozzle is ringed with serrated chitin heat shields that glow bright cherry red. A biological trough below is filled with charred bone fragments and cooling purple blood clots, fed by high-pressure thermal fuel lines and braided copper heat shunts. Story it tells: Thermal plasma bio-station used to seal and graft human limbs to chitin chassis. Exactly one accent light: Blazing thermal orange plasma emitter (#f97316); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_cauterizer_plasma_splatter_scab`
- **Decal Surface & Size:** Floor in front of surgical cauterizer, 2.0 m wide.
- **Decal Story & Context:** Charred biological tissue splatter, plasma scorch arc, and blackened blood crust.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a violent radial fan of heavy black thermal carbon scorch on deck plating, encrusted with thick charred biological tissue scabs and bubbling heat-pitted paint. Context: Charred biological tissue splatter, plasma scorch arc, and blackened blood crust. Placement: Floor in front of surgical cauterizer, 2.0 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 42. `door_biomechanical_iris`
- **Suite:** PregAlien Hive Ecology
- **Story & Worldbuilding:** Living muscular bulkhead iris door separating deep Sector Zero compartments.
- **Room Placement:** Core sector thresholds and Queen's approach.
- **Placement Class & Dims:** Wall-spanning aperture gate, 2.8 m H, 2.2 m W, 0.6 m D.
- **Verbs & Interaction:** `approach (auto-dilate), pry open, cauterize open.`
- **Persisted States:** `closed (interlocked) | dilating | wide open.`
- **Resolves Gap:** Replaces `2D sprite door_biomechanical in public/`
- **Emissive Accent:** Restrained emerald sphincter rim seal (#10b981)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE door biomechanical iris (about 0.6 m D.): a monumental circular doorway set into a heavy arched blackened-steel frame: the aperture is sealed by eight overlapping, curved triangular petals of glossy black chitin and wet maroon muscular tissue that meet at a tight central puckered sphincter. When approached, the petals smoothly spiral open in a counter-clockwise iris dilation, revealing a dark wet passage lined with ribbing. Taut translucent mucus membranes stretch between the parting petals. Story it tells: Living muscular bulkhead iris door separating deep Sector Zero compartments. Exactly one accent light: Restrained emerald sphincter rim seal (#10b981); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_iris_sphincter_rub_apron`
- **Decal Surface & Size:** Threshold floor directly below iris door, 2.6 m wide.
- **Decal Story & Context:** Wet mucosal drag apron and radial friction wear from the dilating door petals.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a curved semicircular friction apron worn into the threshold floor by the sweeping chitin door petals, coated in clear glistening biological slime and crushed gravel. Context: Wet mucosal drag apron and radial friction wear from the dilating door petals. Placement: Threshold floor directly below iris door, 2.6 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

### Environmental Hazards & Endings

#### 43. `scatter_broken_drone`
- **Suite:** Environmental Hazards & Endings
- **Story & Worldbuilding:** Crashed Horizon survey drone detailing early reconnaissance failures.
- **Room Placement:** Chasm ledges, maintenance catwalks, debris fields.
- **Placement Class & Dims:** Floor scatter debris, 0.4 m H, 1.1 m W, 1.1 m D.
- **Verbs & Interaction:** `salvage avionics, extract battery, kick aside.`
- **Persisted States:** `intact wreckage | stripped.`
- **Resolves Gap:** Replaces `2D sprite public/scatter_broken_drone.png`
- **Emissive Accent:** Flickering amber emergency beacon LED (#f59e0b)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE scatter broken drone (about 1.1 m D.): the crushed, twisted wreckage of a heavy four-rotor autonomous industrial surveillance drone. The black carbon-fiber fuselage has snapped in half, exposing shredded internal ribbon wiring, a dented lithium battery pack, and a dangling triple-camera optical sensor gimbal with shattered lenses. One rotor arm is bent at an impossible angle, its serrated composite blade embedded into the rock floor. A faint amber LED flickers erratically in the avionics bay. Story it tells: Crashed Horizon survey drone detailing early reconnaissance failures. Exactly one accent light: Flickering amber emergency beacon LED (#f59e0b); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_drone_crash_skid_shrapnel`
- **Decal Surface & Size:** Floor impact path, 2.5 m long.
- **Decal Story & Context:** Violent crash skid mark, shredded carbon fiber fragments, and lithium battery burn.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a 2.5-meter black rubber and carbon skid mark terminating in a localized spray of shredded composite drone shrapnel, battery acid discoloration, and broken camera lens glass. Context: Violent crash skid mark, shredded carbon fiber fragments, and lithium battery burn. Placement: Floor impact path, 2.5 m long.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 44. `scatter_cryo_icicle`
- **Suite:** Environmental Hazards & Endings
- **Story & Worldbuilding:** Razor-sharp permafrost icicle clusters hanging from leaking coolant conduits.
- **Room Placement:** Cryo deck corridors and freezer vaults.
- **Placement Class & Dims:** Ceiling-mounted hanging hazard, 1.6 m H, 0.8 m W, 0.8 m D.
- **Verbs & Interaction:** `shoot to drop, avoid fall zone.`
- **Persisted States:** `hanging | shattered on floor.`
- **Resolves Gap:** Replaces `2D sprite public/scatter_cryo_icicle.png`
- **Emissive Accent:** Translucent cyan glacial refraction (#22d3ee)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE scatter cryo icicle (about 0.8 m D.): a lethal, monumental cluster of four interlocking crystalline ice stalactites hanging from a cracked overhead ammonia coolant pipe. The central icicle is 1.6 meters long and needle-sharp at the tip, formed from alternating rings of clear glacial ice and milky permafrost frost. Periodic drops of supercooled blue brine weep from the pipe joint, falling in slow intervals. Translucent light refines razor-sharp internal fracture planes. Story it tells: Razor-sharp permafrost icicle clusters hanging from leaking coolant conduits. Exactly one accent light: Translucent cyan glacial refraction (#22d3ee); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_falling_icicle_impact_patter`
- **Decal Surface & Size:** Floor impact zone beneath icicle cluster, 1.8 m wide.
- **Decal Story & Context:** Shattered ice shrapnel and supercooled brine drip patter marks on the deck floor.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a dense radial starburst of crushed blue-white ice crystals and shattered glacial shards, centered on a wet supercooled brine drip crater with white frost creeping along the edges. Context: Shattered ice shrapnel and supercooled brine drip patter marks on the deck floor. Placement: Floor impact zone beneath icicle cluster, 1.8 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 45. `scatter_ice_stalagmite`
- **Suite:** Environmental Hazards & Endings
- **Story & Worldbuilding:** Massive glacial ice spire rising from drainage freeze-thaw cycles.
- **Room Placement:** Cryo decks, drainage sumps, cold breezeways.
- **Placement Class & Dims:** Floor-standing natural barrier, 1.8 m H, 1.0 m W, 1.0 m D.
- **Verbs & Interaction:** `melt with flamethrower, use as ballistic cover.`
- **Persisted States:** `solid frozen | melting/slush | shattered.`
- **Resolves Gap:** Replaces `2D sprite public/scatter_ice_stalagmite.png`
- **Emissive Accent:** Deep cyan refractive core (#06b6d4)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE scatter ice stalagmite (about 1.0 m D.): a massive conical spire of solid glacial blue ice rising 1.8 meters high from a steel drainage grate. The ice is dense, layered, and translucent, showing sediment rings and trapped industrial bolts within its frozen core. The exterior surface is scalloped by thermal air currents into rippling flute ridges, with cold condensation trickling down its base into a ring of slush. Serves as natural heavy cover against hostile gunfire. Story it tells: Massive glacial ice spire rising from drainage freeze-thaw cycles. Exactly one accent light: Deep cyan refractive core (#06b6d4); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_stalagmite_thaw_puddle_rings`
- **Decal Surface & Size:** Floor base around stalagmite, 2.0 m diameter.
- **Decal Story & Context:** Meltwater slush puddle rings and trapped sediment deposit fringes.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of concentric circular water thaw rings around a solid ice anchor footprint, filled with dark grey grit sediment, clear puddles, and radial slush melting rivulets. Context: Meltwater slush puddle rings and trapped sediment deposit fringes. Placement: Floor base around stalagmite, 2.0 m diameter.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 46. `scatter_cryo_shards`
- **Suite:** Environmental Hazards & Endings
- **Story & Worldbuilding:** Shattered thermal viewport glass and frozen permafrost shards across corridors.
- **Room Placement:** Breached cryo vaults and explosion sites.
- **Placement Class & Dims:** Floor scatter field, 0.2 m H, 1.2 m W, 1.0 m D.
- **Verbs & Interaction:** `crunch underfoot, search for salvage.`
- **Persisted States:** `scattered | cleared.`
- **Resolves Gap:** Replaces `2D sprite public/scatter_cryo_shards.png`
- **Emissive Accent:** Cyan crystalline reflection highlight

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE scatter cryo shards (about 1.0 m D.): a dense, glittering field of thick laminated thermal viewing port glass shards mixed with jagged chunks of permafrost ice. The glass pieces are 30mm thick, showing deep internal stress fractures and green tinting, while the ice shards are needle-sharp and clear. When stepped on, they produce loud, crisp crunching sounds that echo down cold corridors. Story it tells: Shattered thermal viewport glass and frozen permafrost shards across corridors. Exactly one accent light: Cyan crystalline reflection highlight; every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_cryo_glass_frost_powder_fan`
- **Decal Surface & Size:** Floor scatter area, 1.9 m wide.
- **Decal Story & Context:** Fine pulverized glass powder and hoarfrost scatter left by heavy boot traffic.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a fine dusting of pulverized white ice powder and microscopic glass grit ground into floor plate diamond treads, with heavy boot crush marks and kicked shard drag lines. Context: Fine pulverized glass powder and hoarfrost scatter left by heavy boot traffic. Placement: Floor scatter area, 1.9 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 47. `prop_ruptured_coolant_pump`
- **Suite:** Environmental Hazards & Endings
- **Story & Worldbuilding:** Catastrophically ruptured centrifugal coolant compressor flooding corridors with toxic glycol.
- **Room Placement:** Cryo service corridors / industrial plant.
- **Placement Class & Dims:** Floor-standing heavy machinery, 1.6 m H, 1.8 m W, 1.1 m D.
- **Verbs & Interaction:** `shut off emergency valve, wade through spill, patch breach.`
- **Persisted States:** `spewing coolant | shut off | drained.`
- **Resolves Gap:** Replaces `2D sprite public/prop_ruptured_coolant_pump.png`
- **Emissive Accent:** Fluorescent cyan glycol coolant puddle (#06b6d4)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE prop ruptured coolant pump (about 1.1 m D.): a colossal industrial centrifugal pump housing fabricated from ribbed cast iron, whose main impeller casing has suffered a catastrophic brittle freeze-fracture, bursting open in a jagged 40cm breach. Chilled, neon-cyan ethylene glycol coolant gushes continuously from the fractured housing, boiling into white fog as it strikes warm pipes. The surrounding motor housing and floor bolts are encrusted with thick, pale blue frozen slush. Story it tells: Catastrophically ruptured centrifugal coolant compressor flooding corridors with toxic glycol. Exactly one accent light: Fluorescent cyan glycol coolant puddle (#06b6d4); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_glycol_coolant_slick_flooding`
- **Decal Surface & Size:** Floor surrounding ruptured pump, 2.8 m wide.
- **Decal Story & Context:** Massive flooding slick of slippery cyan chemical coolant spreading across deck.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a broad reflective pool of high-gloss neon-cyan chemical coolant liquid with wavy surface ripples, oily purple chemical rainbow sheen, and frosted white boundary margins. Context: Massive flooding slick of slippery cyan chemical coolant spreading across deck. Placement: Floor surrounding ruptured pump, 2.8 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 48. `evac_empty_cockpit_quad`
- **Suite:** Environmental Hazards & Endings
- **Story & Worldbuilding:** The haunting four-seat escape cockpit for Ending E: 'Scorched Sky' (escaping alone).
- **Room Placement:** Escape Vessel cockpit / bridge.
- **Placement Class & Dims:** Floor-standing setpiece bridge, 1.5 m H, 2.4 m W, 2.0 m D.
- **Verbs & Interaction:** `sit in pilot seat, initiate solo launch, look at empty seats.`
- **Persisted States:** `waiting | launched into void.`
- **Resolves Gap:** Replaces `Narrative specification in docs/expanded-universe-narrative-design.md`
- **Emissive Accent:** Cold amber emergency console telemetry (#f59e0b)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE evac empty cockpit quad (about 2.0 m D.): an eerie, heartbreaking spacecraft bridge module designed for a full expedition crew of four: four molded high-G flight couches arranged in an arc facing an expansive panoramic viewport. The pilot's chair displays live amber launch vector coordinates and flickering telemetry, but the three companion seats are empty, their heavy padded harnesses hanging slack over cold, vacant cushions. A forgotten thermos and dropped contractor dogtag sit on the empty copilot console. Story it tells: The haunting four-seat escape cockpit for Ending E: 'Scorched Sky' (escaping alone). Exactly one accent light: Cold amber emergency console telemetry (#f59e0b); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_deserted_cockpit_boot_scuff_panic`
- **Decal Surface & Size:** Floor of escape vessel cockpit, 2.6 m wide.
- **Decal Story & Context:** Panicked boot scuffs and abandoned personal trinkets left in the empty cockpit.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of scuffed black rubber boot marks facing the lone pilot seat, paired with clean dust outlines on the three empty crew positions and a dropped silver clipboard with flight manifests. Context: Panicked boot scuffs and abandoned personal trinkets left in the empty cockpit. Placement: Floor of escape vessel cockpit, 2.6 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 49. `evac_mixed_crew_divider`
- **Suite:** Environmental Hazards & Endings
- **Story & Worldbuilding:** Physical containment bulkhead dividing human survivors from cyber-hybrids in Ending C.
- **Room Placement:** Escape Vessel cargo hold.
- **Placement Class & Dims:** Hold-spanning partition bulkhead, 2.8 m H, 3.0 m W, 0.6 m D.
- **Verbs & Interaction:** `inspect barrier, talk through intercom, check containment.`
- **Persisted States:** `sealed | fragile truce | breached.`
- **Resolves Gap:** Replaces `Narrative specification in docs/expanded-universe-narrative-design.md`
- **Emissive Accent:** Dual-tone: Cyan cleanroom light (left) vs Amber bio-heat (right)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE evac mixed crew divider (about 0.6 m D.): a heavy reinforced spacecraft containment partition dividing the escape vessel cargo hold in half. Constructed from riveted titanium frame beams holding thick, multilayered polycarbonate viewport panes with integrated wire mesh. The left half features clean stainless benches and cyan decontamination air filtration for human survivors; the right half is fitted with warm amber heat lamps, humidifiers, and biological perches for mutated cyber-hybrid crewmates. Story it tells: Physical containment bulkhead dividing human survivors from cyber-hybrids in Ending C. Exactly one accent light: Dual-tone: Cyan cleanroom light (left) vs Amber bio-heat (right); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_hybrid_claw_scratch_containment`
- **Decal Surface & Size:** Reinforced glass and floor threshold, 2.2 m wide.
- **Decal Story & Context:** Deep chitin claw scratches on the hybrid side and anxious handprints on the human side.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of multiple deep white scratch clusters cut into heavy polycarbonate glass by hybrid talons on one side, opposing terrified human palm grease smears and condensation drips on the clean side. Context: Deep chitin claw scratches on the hybrid side and anxious handprints on the human side. Placement: Reinforced glass and floor threshold, 2.2 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---

#### 50. `evac_hidden_egg_coolant_rack`
- **Suite:** Environmental Hazards & Endings
- **Story & Worldbuilding:** Concealed smuggling rack in coolant bay holding Queen eggs for Ending D: 'Carrier's Bargain'.
- **Room Placement:** Escape Vessel engine / coolant cell.
- **Placement Class & Dims:** Recessed bulkhead compartment, 1.2 m H, 1.5 m W, 0.8 m D.
- **Verbs & Interaction:** `inspect hidden eggs, check coolant flow, conceal panel.`
- **Persisted States:** `concealed | exposed | hatching.`
- **Resolves Gap:** Replaces `Narrative specification in docs/expanded-universe-narrative-design.md`
- **Emissive Accent:** Warm amber egg bio-glow muffled by frost (#f59e0b)

**3D Generation Prompt:**
```text
Hyper-detailed photorealistic 3D game asset render of a SINGLE evac hidden egg coolant rack (about 0.8 m D.): a secret, illicit compartment nestled deep inside the escape vessel's primary ammonia coolant cell, hidden behind a false circuit-breaker panel. Inside, resting in custom foam isolation brackets and cooled by rerouted copper frost lines, are two live amber alien eggs pulsing with warm internal embryonic light. White hoarfrost coats the perimeter valves, keeping the brood dormant during the journey back to civilized space. Story it tells: Concealed smuggling rack in coolant bay holding Queen eggs for Ending D: 'Carrier's Bargain'. Exactly one accent light: Warm amber egg bio-glow muffled by frost (#f59e0b); every other surface is unlit material colour. Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging from joints and seams. Build restrained bodily tension through soft split-seams, elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes and closely interlocking couplings touched with a wet sheen and fine resin threads. Keep every form suggestive but ambiguous, communicating intimacy through silhouette, pressure, rhythm and material contrast without resolving into literal anatomy. No youthful figures. Preserve the stated industrial function, dimensions and gameplay readability; solemn sacramental unease, never novelty or comedy. Match the established key-art palette of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse teal diagnostics. Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, octane render, soft even studio lighting from all sides, standing alone in empty space on a solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. Square 1:1, 2048x2048.
```

**Companion Decal:** `decal_hidden_egg_frost_bleed_seam`
- **Decal Surface & Size:** Wall and floor below false breaker panel, 1.7 m wide.
- **Decal Story & Context:** Tell-tale white frost bleed and sticky amber condensation leaking from the concealed egg panel.
**Decal Generation Prompt:**
```text
Hyper-detailed photorealistic 2D game decal asset render of a tell-tale hairline frame of white hoarfrost bleeding outward from around a closed breaker panel seam, with two tiny drops of glowing amber resin frozen in place on the bottom lip. Context: Tell-tale white frost bleed and sticky amber condensation leaking from the concealed egg panel. Placement: Wall and floor below false breaker panel, 1.7 m wide.. Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy. Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, background objects, lighting glare, cast shadows, people, shoes, watermark.
```

---
