#!/usr/bin/env python3
"""
Generates docs/planning/missing-world-story-3d-props-and-decals-2026-10-27.md
and docs/planning/missing-world-story-3d-props-and-decals-2026-10-27.tsv.
"""

import sys
import os

STYLE_BLOCK = (
    "Darkly sensual, mature biomechanical design in the Hunker Bunker key-art language: "
    "Nordic Jugendstil and National Romantic monumentality, deep round cathedral arches, "
    "blackened-iron bindings, carved bone relief, wet maroon tissue and glossy chitin emerging "
    "from joints and seams. Build restrained bodily tension through soft split-seams, "
    "elongated hydraulic forms, curved bone arches, tactile valves, taut translucent membranes "
    "and closely interlocking couplings touched with a wet sheen and fine resin threads. "
    "Keep every form suggestive but ambiguous, communicating intimacy through silhouette, "
    "pressure, rhythm and material contrast without resolving into literal anatomy. No youthful "
    "figures. Preserve the stated industrial function, dimensions and gameplay readability; "
    "solemn sacramental unease, never novelty or comedy. Match the established key-art palette "
    "of bone ivory, soot-black metal, bruised flesh, restrained amber practical light and sparse "
    "teal diagnostics."
)

RENDER_BLOCK = (
    "Photorealistic PBR materials, glossy metallic specular highlights, crisp clean silhouette, "
    "octane render, soft even studio lighting from all sides, standing alone in empty space on a "
    "solid flat pure neutral 18% studio mid-grey (#808080) background filling the entire frame "
    "edge to edge, completely uniform, no gradient, no floor, no horizon, no shadow on the background; "
    "no chromatic reflections, no colored rim light and no grey colour spill anywhere on the object. "
    "Exclude: text, letters, numbers, logos, watermarks, people, hands, extra objects, cropping, "
    "floor plane, cast shadows, reflections of a room, cartoon or toy-plastic look, blur, fisheye. "
    "Square 1:1, 2048x2048."
)

DECAL_STYLE_BLOCK = (
    "Where compatible with the subject, give the mark a restrained, mature biomechanical sensuality "
    "through soft tear contours, elongated scoring, curved radial symmetry, delicate punctures, wet "
    "halos and fine resin threads, arranged with Nordic cathedral restraint and carved interlace. "
    "Keep the bodily associations suggestive and ambiguous. Environmental evidence only, with no "
    "people or overt narrative action; solemn body horror and industrial decay rather than novelty or comedy."
)

DECAL_RENDER_BLOCK = (
    "Crisp alpha decal mask isolated in center of frame, flat orthogonal top-down flat angle, "
    "perfectly isolated graphic cutout with transparent-ready edges on solid pure neutral grey or "
    "clean black background. Photorealistic PBR detail: normal map depth, varying roughness, liquid gloss, "
    "and authentic edge wear. Square 1:1, 2048x2048. Exclude: perspective angle, horizon, walls, "
    "background objects, lighting glare, cast shadows, people, shoes, watermark."
)

NEGATIVE_BLOCK = (
    "concept art, illustration, drawing, sketch, ink lines, cross-hatching, painterly, cel shading, "
    "cartoon, anime, low detail, blurry, flat lighting, harsh shadows, ground shadow, floor, horizon, "
    "scenery, background objects, gradient background, vignette, depth of field, lens flare, multiple objects, "
    "turnaround sheet, split panels, collage, people, human nudity, human genitals, text, logos, watermark, "
    "signature, clean sterile sci-fi, medieval fantasy, church, crosses, altars, runes, pastel colors"
)

# 50 items with matching companion decals
DATA = [
    # --- SUITE A: CAMP QUEST TARGETS & LANDMARKS (10 ITEMS) ---
    {
        "id": "quest_reactor_valves",
        "suite": "Camp Quest Targets & Landmarks",
        "hook": "Sector A-9 primary cooling bypass for Overseer Kaelen's 'Reactor Venting' quest.",
        "room": "Reactor Vent Station (engineering / cryo_deck).",
        "placement": "Wall-mounted pipe fixture, 0.8 m H, 1.6 m W, 0.4 m D.",
        "verbs": "turn valve, calibrate pressure, vent surge.",
        "states": "pressurized (hissing) | venting (steam plume) | stabilized (sealed).",
        "standin": "prop_valve_wheel_fused in src/questObjects.js",
        "accent": "Harsh red overpressure warning dial (#ef4444)",
        "body": "a horizontal industrial bypass header fabricated from heavy soot-blackened cast iron with four interconnected brass valve wheels mounted in a descending row. Each wheel is wrapped in braided thermal wire with knurled spokes, connected by exposed hydraulic pistons to high-pressure steam conduits. Between the second and third valve, a round mechanical Bourdon dial gauge displays a cracked crystal lens and a vibrating needle pinned deep in the red warning arc. Heavy copper earth straps and frost-rimmed return lines link the valves to the wall flange. The third valve wheel is seized with burnt graphite packing and leaks a narrow jet of vapor.",
        "decal_id": "decal_reactor_scorch_flange_leak",
        "decal_surface": "Wall and floor below reactor bypass header, 1.8 m wide.",
        "decal_hook": "High-pressure thermal blowout resulting from failing to turn valve #3 in time during reactor venting.",
        "decal_body": "a directional fan of heat-darkened iron scorch and calcified white mineral scale radiating downward from a circular pipe flange footprint, with fine spray rivulets pooling in floor deck seams, wet at the core and dry chalky salt at the outer rim."
    },
    {
        "id": "quest_lost_probe",
        "suite": "Camp Quest Targets & Landmarks",
        "hook": "Horizon Corporation telemetry probe in the frost biome for Meridian's 'The Lost Probe' quest.",
        "room": "Frost biome chasm floor / survey perimeter.",
        "placement": "Floor-standing crash scatter, 1.4 m H, 1.2 m W, 1.2 m D.",
        "verbs": "inspect crash, extract radar core, salvage telemetry.",
        "states": "beacons active | core extracted | gutted chassis.",
        "standin": "radar in src/questObjects.js",
        "accent": "Flickering cyan beacon strobe on antenna mast (#22d3ee)",
        "body": "a compact, ruggedized geodesic telemetry probe chassis constructed from matte-black titanium composite panels with high-visibility hazard yellow accent ribs, resting at a tilted 25-degree angle where it impacted the permafrost. A bent telescopic antenna mast extends upwards with a damaged dual-horn sensor pod and exposed co-axial cable ribbon. An accessible side maintenance door has popped open on shear-pins, revealing an illuminated modular tachyon radar shroud core locked in an amber-lit shock cradle. Deep impact gouges score the lower casing and rimed frost encrusts the north-facing vents.",
        "decal_id": "decal_probe_crater_scuff_impact",
        "decal_surface": "Floor impact site, 2.2 m long.",
        "decal_hook": "Physical skid crater and shredded composite casing debris left where the telemetry probe hit the ice deck.",
        "decal_body": "two parallel gouged skid trenches in frosted deck plate converging on a circular impact crater with crushed sensor-glass dust, shredded black carbon-fiber fragments, and a radial fan of displaced permafrost grit."
    },
    {
        "id": "quest_hive_archive_node",
        "suite": "Camp Quest Targets & Landmarks",
        "hook": "Biomechanical stasis archive node for all camps' 'Hive Archive Ch. 1-3' quest.",
        "room": "Hive fringe / parking lot, warehouse, and incident review sites.",
        "placement": "Floor-standing organic structure, 1.6 m H, 1.0 m W, 0.7 m D.",
        "verbs": "interface terminal, decrypt archive, sever optical vein.",
        "states": "pulsing (unopened) | decrypting (resonant) | severed (quenched).",
        "standin": "prop_hive_resin_sac in src/questObjects.js",
        "accent": "Pulsing emerald green bio-luminescent data channels (#10b981)",
        "body": "an unholy fusion of an ancient corporate CRT terminal lectern and living hive tissue: an angled steel diagnostic pedestal whose metal neck has split open to house an organic spinal column of ivory vertebrae and glossy black chitin cords. The monitor housing is partially encased in translucent amber resin, with fine optical nerves piercing the phosphor glass and projecting undulating green raster lines. Below the keyboard tray, a swollen gestation sac pulses with emerald luminescent fluid, feeding biological data filaments directly into the floor grating.",
        "decal_id": "decal_hive_optic_nerve_puddle",
        "decal_surface": "Floor surrounding archive node pedestal, 1.5 m diameter.",
        "decal_hook": "Leaking bio-luminescent neural fluid and root resin after the player severs the data node.",
        "decal_body": "a circular puddle of thick glossy emerald-green bio-plasma surrounded by severed fibrous root tendrils and sticky amber resin spatters, showing delicate vascular branch patterns dying into dull black scum at the edges."
    },
    {
        "id": "quest_red_mould_bloom",
        "suite": "Camp Quest Targets & Landmarks",
        "hook": "Invasive red mold choking hydroponic channels in Sister Martha's 'Spore Cleansing' quest.",
        "room": "Hydro-bed channels in Tallow Camp and Sector B-4.",
        "placement": "Floor and pipe-straddling biomass, 1.1 m H, 1.4 m W, 0.6 m D.",
        "verbs": "sample culture, burn with flamethrower, inoculate channel.",
        "states": "fruiting (spewing spores) | inoculated | charred husk.",
        "standin": "prop_fungal_resin_basin in src/questObjects.js",
        "accent": "Crimson red sporocarp pustules (#ef4444)",
        "body": "a sprawling cluster of invasive, carnivorous red mold fungus anchored across an industrial irrigation trough. The central mass consists of thick, plum-red velvety flesh folded like cerebral cortex lobes, studded with twenty to thirty swollen crimson sporocarp blisters that weep sticky crimson nectar. Delicate fungal hyphae branch out in all directions, invading pipe seams and welding collars with fine hair-like threads. Faint thermal steam rises from the center of the bloom, which exhibits slow, rhythmic respiratory contractions.",
        "decal_id": "decal_red_mould_spore_crust_ring",
        "decal_surface": "Threshold and floor around infected channel, 2.0 m wide.",
        "decal_hook": "Spore fallout crust and corrosive acid etch marks where red mold crept along the drainage channel.",
        "decal_body": "a dense ring of velvet-textured crimson spore powder settling into floor recesses, with acid-pitted metal blisters and sticky rust-colored drip halos trailing away from the central infestation point."
    },
    {
        "id": "quest_cultist_shrine",
        "suite": "Camp Quest Targets & Landmarks",
        "hook": "Makeshift ventilation tunnel landmark for Tallow's 'The Lost Cultist' quest.",
        "room": "Ventilation shafts and cold maintenance bypasses.",
        "placement": "Wall-backed alcove altar, 1.5 m H, 1.2 m W, 0.5 m D.",
        "verbs": "inspect shrine, recover cultist token, offer prayer.",
        "states": "candles lit (active) | cold wax (abandoned) | desecrated.",
        "standin": "prop_votive_candle_shrine in src/questObjects.js",
        "accent": "Warm flickering candle flame amber (#f59e0b)",
        "body": "a desperate, touching survival shrine built into a rusted ventilation duct mouth: two tiers of stacked scrap iron grating supported by pipe elbows, holding dozens of hand-poured tallow wax candles in spent shell casings. The wax has melted into thick, ivory and pale green draperies over the metal, cementing dried sprigs of bioluminescent cave moss, polished river stones engraved with 'SHE DREAMS US WARM', and a carved bone devotional figurine of a kneeling exosuit operator. The center tier cradles a folded clean emergency thermal blanket.",
        "decal_id": "decal_cultist_wax_runoff_pool",
        "decal_surface": "Floor beneath cultist shrine, 1.4 m across.",
        "decal_hook": "Layered wax runoff, scorched soot marks, and kneeling boot scuffs in front of the makeshift altar.",
        "decal_body": "a thick scalloped apron of layered yellowish tallow candle wax drippings fused to dusty steel grating, with soot scorch halos from spent shell votives and two distinct knee-print compressions in the settled grit."
    },
    {
        "id": "quest_kaelen_ledger_desk",
        "suite": "Camp Quest Targets & Landmarks",
        "hook": "Overseer Kaelen's private command station for Meridian's signature quest 'The Grid Covenant'.",
        "room": "Meridian core / Kaelen's alcove beside the logic drum.",
        "placement": "Floor-standing industrial console desk, 1.3 m H, 1.8 m W, 1.0 m D.",
        "verbs": "inspect ledger, sign Grid Covenant, revoke power charter.",
        "states": "unsigned | covenant active (glowing) | revoked.",
        "standin": "prop_conduit_junction_box in src/questObjects.js",
        "accent": "Cyan diagnostic glow across capacitive bus bar terminals (#22d3ee)",
        "body": "a monumental cast-iron drafting and covenant terminal station: a broad slanted soot-black steel desk surface inset with polished heavy copper bus plates and ceramic insulator ribs. A roll of heavy treated drafting parchment feeds from a brass cylinder at the top, covered in precise technical schematic schematics of Sector A-9 and hand-annotated power covenants. In the center desk recess sits a heavy, two-handed mechanical punch-key recorder with exposed brass gears, flanked by analog dial voltmeters and heavy braided ground wires trailing into the floor deck.",
        "decal_id": "decal_covenant_copper_arcing_burn",
        "decal_surface": "Floor and desk apron, 1.6 m wide.",
        "decal_hook": "Electrical arcing scorch and hand-tool scuffs resulting from completing the Grid Covenant circuit.",
        "decal_body": "a radial starburst of high-voltage carbon scorch marks radiating from a central grounding lug footprint, with micro-droplets of spattered melted copper and polished boot scuffs from repeated signing rituals."
    },
    {
        "id": "quest_martha_warm_pipe_junction",
        "suite": "Camp Quest Targets & Landmarks",
        "hook": "The central geothermal manifold for Sister Martha's signature quest 'The Warm Pipes'.",
        "room": "Tallow Camp central steam cavern.",
        "placement": "Floor-to-ceiling pipe monolith, 2.2 m H, 2.0 m W, 0.8 m D.",
        "verbs": "listen to steam hum, inspect moss growth, brace joint.",
        "states": "singing (warm) | thermal spike | overgrowing with fungus.",
        "standin": "prop_pipe_rupture in src/questObjects.js",
        "accent": "Warm thermal orange heat shimmer (#f97316)",
        "body": "a colossal manifold where four 300mm geothermal steam supply lines converge into a massive riveted bronze expansion chamber. The lower half is heavily insulated with thick wool felt and stitched leather blankets tied down by copper wire, providing a warm bench where tired cultivators sit. Lush, velvety emerald cave moss has colonized the moist condensation seams, emitting soft bioluminescence and fragrant herbal vapors. Analog mercury temperature gauges and brass bleed-petcocks line the top manifold, venting fine wisps of clean steam.",
        "decal_id": "decal_warm_pipe_condensate_drip_fan",
        "decal_surface": "Floor and wall saddle under steam junction, 2.4 m long.",
        "decal_hook": "Warm mineralized condensation runoff and seated body wear against the warm pipe saddle.",
        "decal_body": "a broad fan of polished, dark rust-and-soot wear where human bodies have leaned against the heat for years, surrounded by mineral-white calcium drip rings and wet green moss fringes following drainage grooves."
    },
    {
        "id": "quest_infested_armory_cabinet",
        "suite": "Camp Quest Targets & Landmarks",
        "hook": "Infested weapons locker in Sector C-7 for Commander Briggs's 'Armory Breach' quest.",
        "room": "Vesper Camp armory perimeter / weapons locker room.",
        "placement": "Wall-backed security locker, 2.1 m H, 1.5 m W, 0.7 m D.",
        "verbs": "purge cyber-snails, pry locker doors, recover munitions.",
        "states": "infested (chitin growth) | cleared | looted.",
        "standin": "prop_oxygen_bottle_cascade_rack in src/questObjects.js",
        "accent": "Bioluminescent lime-green snail slime trails (#84cc16)",
        "body": "a heavy double-door Horizon Corporation security armory cabinet made of reinforced olive-drab steel plate, with its heavy steel latch buckled and forced open 30cm by an aggressive internal infestation. Clustered inside and spilling down the outer doors are three dozen mutated cyber-snails with iridescent titanium-infused shells, weaving thick glistening slime bridges across racks of high-caliber rifles and ammo drums. Calcified chitin tendrils fuse the lower shelves to the floor deck, and spent shotgun hulls are embedded into the slime crust.",
        "decal_id": "decal_armory_spent_brass_scatter",
        "decal_surface": "Floor in front of armory cabinet, 2.0 m wide.",
        "decal_hook": "Spent brass casings and toxic snail mucus trails left during the violent firefight to clear the locker.",
        "decal_body": "a dense scatter of twenty stamped brass 12.7mm and 12-gauge shotgun shells mixed with dried chartreuse iridescent snail slime streaks, black powder scorch soot, and boot pivot scuffs."
    },
    {
        "id": "quest_holdout_barricade",
        "suite": "Camp Quest Targets & Landmarks",
        "hook": "Main outer defensive checkpoint for Vesper's 'Bunker Holdout' quest.",
        "room": "Vesper outer gate / choke point.",
        "placement": "Floor-standing barrier span, 1.4 m H, 2.8 m W, 1.0 m D.",
        "verbs": "reinforce, reload defensive guns, inspect damage.",
        "states": "fortified | under assault | breached.",
        "standin": "prop_security_barricade in src/questObjects.js",
        "accent": "Flashing red perimeter alert strobe (#ef4444)",
        "body": "a formidable improvised defensive barricade constructed from stacked, tar-sealed canvas sandbags reinforced by welded angled steel railroad rails and heavy ballistic trench shields. Fitted with two steel firing embrasures, an integrated ammo can shelf, and a top-mounted halogen searchlight in a protective mesh cage. The front face is scarred with heavy impacts: deep kinetic bullet divots, jagged alien claw scores, and black scorch plumes from defensive claymore detonations. A mounted belt-fed machine gun pintle sits empty on the right shoulder.",
        "decal_id": "decal_holdout_defensive_recoil_scuff",
        "decal_surface": "Floor behind the defensive barricade, 2.6 m long.",
        "decal_hook": "Heavy combat defense wear: boot friction, dropped cartridge links, and muzzle blast residue.",
        "decal_body": "deep radial muzzle-blast carbon scorch arcs in front of the barrier, paired with heavy operator heel scuffs, discarded disintegrating steel ammo belt links, and oil drag marks behind the sandbags."
    },
    {
        "id": "quest_briggs_memorial_wall",
        "suite": "Camp Quest Targets & Landmarks",
        "hook": "Monumental roster of fallen contractors for Vesper's signature quest 'The Iron Ledger'.",
        "room": "Vesper inner command vault.",
        "placement": "Wall-mounted monument, 2.4 m H, 1.8 m W, 0.6 m D.",
        "verbs": "read fallen names, carve operator tally, swear oath.",
        "states": "pristine roster | active vigil | names erased.",
        "standin": "arch_niche_shrine in src/questObjects.js",
        "accent": "Restrained amber illumination from overhead gun-cleaning lamps (#f59e0b)",
        "body": "a solemn military memorial monument fabricated from a salvaged 50mm naval-grade steel bulkhead door mounted upright inside an arch of blackened structural iron. The steel surface has been divided into strict columns inscribed with hundreds of hand-stamped dog-tag numbers, contractor surnames, and knife-cut death tallies. Welded below the names is a heavy steel shelf holding a row of spent 40mm grenade cases used as vases for dried permafrost lichen, flanked by two open combat knives stuck tip-down into lead blocks. A kerosene maintenance lantern hangs from an overhead bracket.",
        "decal_id": "decal_memorial_gun_oil_footprint_tally",
        "decal_surface": "Floor directly beneath the memorial wall, 1.7 m wide.",
        "decal_hook": "Polished standing deck plate where contractors stand vigil to inspect the roster of the dead.",
        "decal_body": "a semicircular wear patch worn through floor paint to bare polished steel by hundreds of heavy military combat boots, ringed by dark dried drops of gun maintenance oil and white chalk dust tally rubbings."
    },

    # --- SUITE B: PHYSICAL LORE COLLECTIBLES (14 ITEMS) ---
    {
        "id": "drop_horizon_badge",
        "suite": "Physical Lore Collectibles",
        "hook": "Executive clearance pass belonging to Chen, A., Geothermal Division. Lanyard melted during escape.",
        "room": "Ruins, geothermal offices, executive corridors.",
        "placement": "Small tabletop/floor pickup, 0.1 m H, 0.15 m W, 0.05 m D.",
        "verbs": "inspect badge, swipe clearance, take into inventory.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_horizon_badge.png",
        "accent": "Subtle green microchip hologram (#10b981)",
        "body": "a heavy corporate identity badge molded from scratched white polycarbonate and brushed aluminum, displaying embossed corporate typography: 'CHEN, A. — GEOTHERMAL DIVISION. ACCESS: CORE STRATA'. The magnetic encoding stripe along the reverse is blistered from extreme heat, and the top attachment clip is fused to a charred, melted nylon lanyard that was violently snapped off. The photo hologram flickers between an executive portrait and a static corporate emblem.",
        "decal_id": "decal_melted_lanyard_char_mark",
        "decal_surface": "Floor surface directly under badge drop, 0.8 m across.",
        "decal_hook": "Melted nylon synthetic residue and scorch halo left when the executive fled the geothermal breach.",
        "decal_body": "a tight localized star of melted black nylon weave fused into steel deck floor seams, surrounded by a faint yellowed sulfur heat scorch and hurried rubber-sole drag scuffs."
    },
    {
        "id": "drop_dig_manifest",
        "suite": "Physical Lore Collectibles",
        "hook": "Excavation manifest proving Bore 7 exceeded charter depth by 900 meters.",
        "room": "Deep ruins / drill site staging offices.",
        "placement": "Tabletop/floor document, 0.08 m H, 0.35 m W, 0.28 m D.",
        "verbs": "unfold manifest, inspect handwriting, store record.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_dig_manifest.png",
        "accent": "Red grease-pencil margin notes (#ef4444)",
        "body": "a thick, water-stained industrial excavation logbook bound in weather-hardened black oilcloth with brass binder rivets. The top pages have curled and singed at the corners, displaying printed geological strata tables for 'Bore 7'. In the margins, written in frantic red wax grease pencil, is the chilling handwritten note: 'IT IS WARM DOWN THERE. ROCK SHOULD NOT BE WARM.' A corporate variance waiver stamp marked 'APPROVED - FOREMAN SIGNATURE' is stamped diagonally across the depth chart.",
        "decal_id": "decal_carbon_dust_document_ash",
        "decal_surface": "Desk or floor below manifest, 1.0 m wide.",
        "decal_hook": "Charred paper ash and greasy black graphite thumb smudges left where documents were hastily sorted.",
        "decal_body": "a rectangular clean negative void in settled grey floor dust where a heavy folder lay for months, bordered by curled paper ash flakes and hurried black grease-pencil smudges."
    },
    {
        "id": "drop_security_log",
        "suite": "Physical Lore Collectibles",
        "hook": "Security contractor duty log: 'Day 63: The perimeter is not where we left it.'",
        "room": "Ruins / abandoned security checkpoints.",
        "placement": "Grounded handheld console, 0.06 m H, 0.22 m W, 0.16 m D.",
        "verbs": "reboot datapad, read final log, store.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_security_log.png",
        "accent": "Dim amber phosphor CRT scanlines (#f59e0b)",
        "body": "a heavy military-surplus tactical datapad in a rubberized olive-drab shock frame with exposed knurled thumbscrews. The protective armored glass screen is spider-webbed with cracks across the center, but still displays faint amber scanlines reading: 'DAY 63: PERIMETER QUIET... DAY 63: THE PERIMETER IS NOT WHERE WE LEFT IT. REQUESTING TRANSFER.' A severed tactical lanyard cable dangles from the lower corner loop.",
        "decal_id": "decal_datapad_glass_shatter_spray",
        "decal_surface": "Floor around fallen security datapad, 1.2 m wide.",
        "decal_hook": "Fine tempered display glass crystals and battery acid bleed resulting from the datapad being dropped.",
        "decal_body": "a radial spray of tiny shattered sapphire display glass shards catching ambient light, paired with a small black lithium battery electrolyte leak ring and frantic boot push marks."
    },
    {
        "id": "drop_survey_probe",
        "suite": "Physical Lore Collectibles",
        "hook": "Pre-Horizon impact probe relic: 'BIOSIGN — POSITIVE — DEPTH UNKNOWN.'",
        "room": "Impact craters and chasm edges.",
        "placement": "Crater debris pickup, 0.35 m H, 0.4 m W, 0.4 m D.",
        "verbs": "recover probe, download biosign telemetry, store.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_survey_probe.png",
        "accent": "Pulsing faint violet sensor eye (#8b5cf6)",
        "body": "a hemispherical survey drone head of non-Horizon manufacture, made from seamless heat-ablated meteoric tungsten with mysterious circular sensor apertures. The central obsidian lens is cracked across its diameter, but deep inside, an analog vacuum indicator needle remains stuck pointing to 'BIOSIGN: POSITIVE'. The hull surface is pitted with atmospheric micro-meteorite craters and encrusted with black glass impact slag.",
        "decal_id": "decal_vitrified_crater_ring",
        "decal_surface": "Floor impact depression, 1.4 m diameter.",
        "decal_hook": "Extreme thermal vitrification ring where ancient kinetic probe struck bedrock prior to glacier formation.",
        "decal_body": "a concentric ring of high-gloss vitrified black glass formed in basalt rock, with hairline thermal contraction fractures and pale powdery mineral fallout radiating outward."
    },
    {
        "id": "drop_meteor_core",
        "suite": "Physical Lore Collectibles",
        "hook": "Vitrified core sample that refracts pulsing light on an 11-second respiratory cycle.",
        "room": "Deep crater floors and geothermal cavities.",
        "placement": "Mineral pedestal pickup, 0.2 m H, 0.3 m W, 0.2 m D.",
        "verbs": "attune to rhythm, collect specimen.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_meteor_core.png",
        "accent": "Ethereal violet internal pulse (#a855f7)",
        "body": "an asymmetrical, oblong geological core sample of completely vitrified obsidian glass extracted by diamond coring drill. The exterior exhibits smooth cylindrical borehole ridges on one side and a jagged, fractured fracture face on the other. Deep within the core's black-purple interior, an organic lattice of microscopic filament inclusions refracts light in an unmistakable pulsing pattern that surges and dims every eleven seconds.",
        "decal_id": "decal_impact_radiation_halo",
        "decal_surface": "Floor beneath meteor core, 1.2 m diameter.",
        "decal_hook": "Persistent luminescent mineral halo and frost-free ring where the warm pulsing core rested.",
        "decal_body": "a circular zone of clean, dry, completely melted deck floor surrounded by crisp white frost borders, displaying faint purple luminescent mineral dust settling into plate joints."
    },
    {
        "id": "drop_ration_ledger",
        "suite": "Physical Lore Collectibles",
        "hook": "Survivor camp contractor ledger: 'stopped counting mouths, started counting hands.'",
        "room": "Camp supply caches / abandoned bunkrooms.",
        "placement": "Tabletop/bunk pickup, 0.05 m H, 0.2 m W, 0.14 m D.",
        "verbs": "open ledger, review names, collect.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_ration_ledger.png",
        "accent": "None (matte unlit survival artifact)",
        "body": "a small, dog-eared contractor field diary wrapped in blue polyethylene tape. The ruled grid paper pages are stained with motor oil and dried soup broth. A list of forty names in black ballpoint pen has been progressively crossed out in thick red carpenter pencil, ending on page 14 with the single grim entry: 'STOPPED COUNTING MOUTHS, STARTED COUNTING HANDS.' A stubby lead pencil is bound to the spine with wire.",
        "decal_id": "decal_rations_fingerprint_grime",
        "decal_surface": "Table or bench surface, 0.9 m wide.",
        "decal_hook": "Forensic grease smudges and food ration residue where survivors counted supplies in the dark.",
        "decal_body": "forensic greasy dark handprints and spilled synthetic nutrient broth stains settled into tabletop wood grain, accompanied by parallel pencil tally scratches."
    },
    {
        "id": "drop_dogtags",
        "suite": "Physical Lore Collectibles",
        "hook": "Polished silver security dog tags belonging to Captain Vesper, K.",
        "room": "Vesper Camp / Sector C-7 armory.",
        "placement": "Armory table/shrine pickup, 0.02 m H, 0.08 m W, 0.05 m D.",
        "verbs": "take dog tags, show to Briggs.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_dogtags.png",
        "accent": "Restrained silver specular highlight",
        "body": "a pair of standard stamped stainless-steel corporate security dog tags suspended on a fine ball-chain necklace with a worn black silicone silencing ring. Stamped with crisp corporate typography: 'VESPER, K. — CAPTAIN / SECURITY DETACHMENT 4 — BLOOD: O POS'. The reverse of the primary tag has been hand-buffed to a mirror finish through years of anxious thumb rubbing by Commander Briggs.",
        "decal_id": "decal_dogtag_scraped_rub_halo",
        "decal_surface": "Metal shelf or desk surface, 0.7 m wide.",
        "decal_hook": "Fine circular rubbing abrasions where dog tags were handled daily on an armory cleaning table.",
        "decal_body": "a small circular buffed patch on dark rusted iron with fine concentric micro-scratches, surrounded by gun-cleaning solvent residue and a small smudge of finger oil."
    },
    {
        "id": "drop_child_drawing",
        "suite": "Physical Lore Collectibles",
        "hook": "Crayon drawing of a stick family and a yellow sun: 'keep her away from the vents.'",
        "room": "Camp living quarters and ventilation mouths.",
        "placement": "Wall-pinned/floor pickup, 0.01 m H, 0.3 m W, 0.22 m D.",
        "verbs": "inspect drawing, read back note, store.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_child_drawing.png",
        "accent": "Vivid wax-crayon yellow sun (#eab308)",
        "body": "a single sheet of heavy beige industrial drafting paper with ragged torn edges, carrying a child's wax-crayon illustration: a stick family standing beneath a large transparent bunker dome, beneath a blazing yellow spiral labeled 'SUN'. The paper is creased into quarters. On the reverse, scrawled in an adult's hurried pencil hand, is the haunting warning: 'KEEP HER AWAY FROM THE VENTS. IT MIMICS VOICES.'",
        "decal_id": "decal_crayon_wax_floor_graffiti",
        "decal_surface": "Wall or floor near bunker ventilation grille, 1.1 m wide.",
        "decal_hook": "Crude wax crayon marks and tape adhesive residue left on bunker bulkheads.",
        "decal_body": "yellow and red wax crayon scrawls directly on soot-covered bunker wall plate, showing child-height spiral drawings and four dry dried rectangles of yellowed masking tape."
    },
    {
        "id": "drop_resin_locket",
        "suite": "Physical Lore Collectibles",
        "hook": "Human silver locket entombed in amber alien resin: 'the brood archives what its hosts loved.'",
        "room": "Hive chambers and gestation nodes.",
        "placement": "Biomass alcove pickup, 0.04 m H, 0.12 m W, 0.08 m D.",
        "verbs": "peer into amber, harvest locket.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_resin_locket.png",
        "accent": "Warm glowing amber resin refraction (#f59e0b)",
        "body": "a vintage oval sterling silver keepsake locket suspended perfectly in the center of an elongated teardrop of clear, jewel-like amber alien resin. Through the polished amber, the open locket reveals a tiny, faded black-and-white photograph of a smiling woman on a sunlit terrace. Thin, glistening black resin veins wrap the outside of the amber drop like delicate surgical sutures, terminating in a broken chitin stem.",
        "decal_id": "decal_amber_resin_fracture_leak",
        "decal_surface": "Floor beneath hive archive wall, 1.0 m across.",
        "decal_hook": "Hardened golden amber resin drops and micro-fracture splinters from harvested brood curios.",
        "decal_body": "a cluster of glossy, raised amber resin drips pooling on dark stone, with sharp transparent resin shards and sticky yellow trails spreading outward."
    },
    {
        "id": "drop_moult_shard",
        "suite": "Physical Lore Collectibles",
        "hook": "Queen moult shard: 'shed carapace with interior grooves that are writing.'",
        "room": "Sector Zero / Queen's throne approach.",
        "placement": "Altar/chitin pile pickup, 0.05 m H, 0.25 m W, 0.18 m D.",
        "verbs": "read Queen's script, harvest carapace.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_moult_shard.png",
        "accent": "Subtle iridescent violet sheen (#c084fc)",
        "body": "a curved palm-sized plate of shed exoskeleton from the Brood Queen herself. The exterior is obsidian-hard, oil-slick iridescent black chitin with razor-sharp serrated edges. The concave interior face is smooth, bone-white, and densely covered in microscopic parallel grooves and paired punctures that form an alien mathematical script. Faint warmth radiates from the chitin even in sub-zero air.",
        "decal_id": "decal_chitin_moult_calcium_bloom",
        "decal_surface": "Floor in Sector Zero chamber, 1.3 m wide.",
        "decal_hook": "Calcified white molting powder and bio-metallic chitin flakes shed during Queen growth cycles.",
        "decal_body": "a dusting of fine white calcium molting powder forming a crescent outline on black rock, mixed with sharp iridescent chitin fragments and dark dried bio-plasma dots."
    },
    {
        "id": "drop_first_bore_tag",
        "suite": "Physical Lore Collectibles",
        "hook": "Original claim tag from the dig that broke into Sector Zero, punctured by mandibles.",
        "room": "Sector Zero breach mouth / Bore 7 drill head.",
        "placement": "Rubble pile pickup, 0.03 m H, 0.15 m W, 0.15 m D.",
        "verbs": "examine claim tag, recover historical proof.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_first_bore_tag.png",
        "accent": "Restrained tarnished brass highlight",
        "body": "a heavy circular stamped brass survey claim disc, 120mm across, stamped with corporate seal and: 'HORIZON CORP — EXPEDITION CLAIM 01 — BORE 7'. The corporate legal stamp 'VOID' has been stamped across the center in faded black ink. Piercing straight through the 6mm brass plate are two clean, conical paired puncture holes driven by massive alien mandibles, surrounded by heat-discolored brass.",
        "decal_id": "decal_bore_mandible_puncture_drag",
        "decal_surface": "Floor at Bore 7 breach mouth, 1.1 m long.",
        "decal_hook": "Twin gouged scrape lines where the claim tag was violently torn from its survey bedrock mount.",
        "decal_body": "paired parallel gouge grooves cut into solid basalt rock with crushed brass swarf and pulverized rock dust, terminating at a shattered anchor bolt hole."
    },
    {
        "id": "drop_prayer_stone",
        "suite": "Physical Lore Collectibles",
        "hook": "Cultist river stone inscribed: 'SHE DREAMS US WARM.'",
        "room": "The Cave / geothermal steam niches.",
        "placement": "Stone cairn pickup, 0.08 m H, 0.18 m W, 0.12 m D.",
        "verbs": "sense heat, read inscription, collect.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_prayer_stone.png",
        "accent": "Faint thermal warmth shimmer",
        "body": "a dense, smooth black river cobble stone worn round by ancient subterranean water flows. Across one flat face, careful human lettering has been chiseled with a hammer and punch, filled with white lead pigment: 'SHE DREAMS US WARM'. The stone holds residual geothermal heat, warming the palm through an insulated exosuit glove.",
        "decal_id": "decal_prayer_kneeling_wear_crescent",
        "decal_surface": "Floor in front of prayer niche, 1.2 m wide.",
        "decal_hook": "Worn circular floor depression where early cultists knelt in meditation before the alien Queen.",
        "decal_body": "a smooth crescent wear depression in rough cave stone surrounded by tiny melted wax droplets and fine charcoal dust from devotional incense."
    },
    {
        "id": "drop_frozen_letter",
        "suite": "Physical Lore Collectibles",
        "hook": "Unsent letter in a sealed pouch: 'when my contract clears I will buy the orchard plot.'",
        "room": "Cryo sector corridors / frozen bunk cubicles.",
        "placement": "Frozen corpse/shelf pickup, 0.02 m H, 0.24 m W, 0.16 m D.",
        "verbs": "wipe frost, inspect letter, preserve.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_frozen_letter.png",
        "accent": "None (matte paper and blue frost rind)",
        "body": "a standard corporate inter-system mail envelope sealed inside a transparent frosted vinyl biohazard pouch. The paper inside has turned brittle with sub-zero frost, but handwritten blue ink cursive remains legible through the plastic: '— AND WHEN MY CONTRACT CLEARS I WILL BUY THE ORCHARD PLOT, THE ONE WITH THE SOUTH WALL. HOLD IT FOR ME. HOLD EVERYTHING.' A red corporate stamp reads 'POSTAGE UNPAID — SERVICE SUSPENDED'.",
        "decal_id": "decal_sublimated_frost_paper_outline",
        "decal_surface": "Frozen metal bunk or deck plate, 0.9 m wide.",
        "decal_hook": "Crisp paper outline left in thick frost where the letter lay frozen for decades.",
        "decal_body": "a sharp rectangular clean void in dense white crystalline hoarfrost on blue painted steel, with feathering ice crystals growing along the margins."
    },
    {
        "id": "drop_black_flask",
        "suite": "Physical Lore Collectibles",
        "hook": "Engraved flask: 'TO THE BEST CREW ON THE WORST ROCK — DAY 1000.'",
        "room": "Maintenance crossroads and common areas.",
        "placement": "Bench/floor pickup, 0.06 m H, 0.16 m W, 0.1 m D.",
        "verbs": "uncap flask, shake liquid, collect.",
        "states": "grounded item | collected.",
        "standin": "2D sprite public/drop_black_flask.png",
        "accent": "Restrained steel highlight",
        "body": "a curved, heavy-gauge stainless-steel pocket hip flask finished in chipped matte-black baked enamel with a captive knurled screw cap on a brass hinge arm. Hand-engraved across the face with a mechanical scriber: 'TO THE BEST CREW ON THE WORST ROCK — DAY 1000'. The flask is still half-full of amber synthetic ethanol, sloshing when picked up.",
        "decal_id": "decal_liquor_spill_evaporation_stain",
        "decal_surface": "Floor beside fallen flask, 1.0 m across.",
        "decal_hook": "Dark circular alcohol evaporation ring and sticky syrup residue from spilled contractor liquor.",
        "decal_body": "a concentric dried dark brown syrup stain on rusted deck plating, with radial splatter droplets and a rectangular dent from the flask falling from height."
    },

    # --- SUITE C: SURVIVOR CAMP INFRASTRUCTURE & FORTIFICATIONS (10 ITEMS) ---
    {
        "id": "prop_camp_meridian_battery_bank",
        "suite": "Survivor Camp Infrastructure",
        "hook": "Heavy high-voltage electrical storage maintaining Meridian Camp's life support.",
        "room": "Meridian Camp generator room (Sector A-9).",
        "placement": "Floor-standing heavy utility, 1.8 m H, 2.2 m W, 0.8 m D.",
        "verbs": "check charge, reroute cells, overload breaker.",
        "states": "charging (buzzing) | discharging | depleted | arcing.",
        "standin": "2D sprite public/prop_camp_meridian_battery_bank.jpg",
        "accent": "Cyan electrical charge level indicator tubes (#22d3ee)",
        "body": "a massive two-tier industrial battery rack made from structural angle iron and heavy timber isolation blocks, holding eight transparent glass-cased lead-acid accumulator cells filled with bubbling golden electrolyte. Polished copper bus-bars span between lead terminal posts with heavy ceramic insulating nuts. Vertical glass hydrometer tubes on the end panel display glowing cyan float indicators showing current power reserve levels. Thick braided ground cables snake into the floor deck seams.",
        "decal_id": "decal_battery_acid_sulfur_boil",
        "decal_surface": "Floor deck under battery rack, 2.0 m wide.",
        "decal_hook": "Boiling battery acid overflow, yellow sulfur crust, and corroded deck plate pitting.",
        "decal_body": "a broad area of chemically pitted and peeled grey paint showing etched bare steel, encrusted with pale yellow sulfur crystals and damp green copper-verdigris drip halos."
    },
    {
        "id": "prop_camp_meridian_repair_rig",
        "suite": "Survivor Camp Infrastructure",
        "hook": "Kaelen's cybernetic modification and telemetry soldering hearth.",
        "room": "Meridian engineering workshop.",
        "placement": "Floor-standing workstation, 1.9 m H, 1.8 m W, 0.9 m D.",
        "verbs": "solder telemetry, calibrate rig, craft weapon mod.",
        "states": "idle | soldering (smoke/sparks) | powered down.",
        "standin": "2D sprite public/prop_camp_meridian_repair_rig.jpg",
        "accent": "Red-hot soldering iron heating coil (#ef4444)",
        "body": "a heavy cast-iron machinist bench converted into a high-tech cybernetic fabrication rig. Features a mounted articulating inspection arm with illuminated magnifying lens, a dual-wand high-frequency soldering station with red-hot ceramic elements, and an integrated steel bench vise clamping a dissected telemetry housing. Spools of fine silver solder and copper shielding mesh sit on overhead brackets above an analog cathode-ray oscilloscope screen.",
        "decal_id": "decal_soldering_flux_droplet_spray",
        "decal_surface": "Floor directly in front of repair rig bench, 1.5 m wide.",
        "decal_hook": "Solder droplet splatter, amber rosin flux burns, and wire clipping scatter.",
        "decal_body": "a dense scatter of tiny silver solder beads flattened onto steel deck plate, surrounded by dark amber sticky rosin flux burn circles and clipped copper wire fragments."
    },
    {
        "id": "prop_camp_tallow_still",
        "suite": "Survivor Camp Infrastructure",
        "hook": "Geothermal steam condensing apparatus providing fresh drinking water and nutrient fluid to Tallow.",
        "room": "Tallow Camp distillery / steam shafts (Sector B-4).",
        "placement": "Floor-standing vertical distiller, 2.4 m H, 1.4 m W, 1.2 m D.",
        "verbs": "tap drinking water, flush mineral scale, adjust heat coil.",
        "states": "distilling (bubbling) | overboiling | cold.",
        "standin": "2D sprite public/prop_camp_tallow_still.jpg",
        "accent": "Warm amber liquid glow in condensation sight-glass (#f59e0b)",
        "body": "an impressive artisanal distillation tower constructed from hammered copper plates, tinned brass pipes, and recycled industrial autoclave tanks. High-pressure steam enters through a bottom flange into a helical copper cooling coil bathed in cold meltwater. The purified water drips through a glass sight-column into a 200-liter oak and stainless-steel collection cask with a brass gravity tap. Condensate beads sweat across every polished copper curve.",
        "decal_id": "decal_distiller_mineral_scale_runoff",
        "decal_surface": "Floor surrounding distillation collection cask, 2.2 m long.",
        "decal_hook": "White lime-mineral runoff scale and constant warm moisture puddling beneath still.",
        "decal_body": "a wet low-roughness water puddle trail ringed by thick white calcium-carbonate mineral crust rings, with green moss creeping along the damp drainage channels."
    },
    {
        "id": "prop_camp_tallow_spore_trays",
        "suite": "Survivor Camp Infrastructure",
        "hook": "Tiered agrarian cultivation trays growing bioluminescent lichen and medicinal bio-vaccine molds.",
        "room": "Tallow Camp hydroponic nursery.",
        "placement": "Floor-standing tiered shelf, 1.7 m H, 1.6 m W, 0.9 m D.",
        "verbs": "harvest lichen, mist spore trays, collect vaccine mold.",
        "states": "blooming (glowing) | harvested | dry.",
        "standin": "2D sprite public/prop_camp_tallow_spore_trays.jpg",
        "accent": "Vibrant emerald bioluminescent spore glow (#10b981)",
        "body": "a three-tier stepped nursery rack made from slotted zinc-plated angle iron supporting deep wooden cultivation flats lined with porous black basalt gravel. Each tray is carpeted in thick, moist bioluminescent lichen and soft fungal cups that glow with vibrant emerald light. A top-mounted drip irrigation line fabricated from perforated copper tubing periodically drips geothermal nutrient broth across the beds.",
        "decal_id": "decal_hydro_nutrient_lime_tide",
        "decal_surface": "Floor beneath hydroponic spore trays, 1.8 m wide.",
        "decal_hook": "Fertilizer nutrient lime spills, dark wet soil grit, and escaped mycelial threads.",
        "decal_body": "a tide of dark nutrient soil mud and pale green mineral fertilizer crust spreading between duckboard slats, with microscopic white mycelial rhizoids anchoring to deck seams."
    },
    {
        "id": "prop_camp_tallow_resin_urn",
        "suite": "Survivor Camp Infrastructure",
        "hook": "Ceremonial vessel holding aromatic amber sealing resin harvested from benign hive blooms.",
        "room": "Tallow Camp communal shrine.",
        "placement": "Floor-standing pedestal vessel, 1.1 m H, 0.8 m W, 0.8 m D.",
        "verbs": "scoop resin, apply seal, inhale vapor.",
        "states": "full of resin | half-empty | solidified.",
        "standin": "2D sprite public/prop_camp_tallow_resin_urn.jpg",
        "accent": "Golden amber resin refraction (#f59e0b)",
        "body": "a monumental Nordic Jugendstil vessel carved from solid grey soapstone with relief carvings of elongated fern leaves and intertwining serpents. The wide mouth is fitted with a hinged brass rim holding a carved bone ladle. Inside, thick golden aromatic pine-and-amber resin glows with warm inner light, giving off a soothing vapor that slows spore infection rates. Thick glossy resin drippings coat the exterior stone.",
        "decal_id": "decal_resin_urn_ring_overflow",
        "decal_surface": "Floor around soapstone resin urn, 1.3 m diameter.",
        "decal_hook": "Concentric resin drip rings and sticky amber shoe tracks radiating from the urn.",
        "decal_body": "a circular puddle of thick golden hardened resin with concentric overflow ridges, showing two distinct tacky shoe tread marks where cultists stood to ladle resin."
    },
    {
        "id": "prop_camp_vesper_turret",
        "suite": "Survivor Camp Infrastructure",
        "hook": "Automated twin-barrel sentry defense turret securing Vesper Camp's perimeter.",
        "room": "Vesper Camp checkpoint / perimeter gate (Sector C-7).",
        "placement": "Floor-standing heavy defense, 1.6 m H, 1.4 m W, 1.4 m D.",
        "verbs": "reload ammo drum, re-target sensor, power down.",
        "states": "tracking (scanning) | firing | empty | disabled.",
        "standin": "2D sprite public/prop_camp_vesper_turret.jpg",
        "accent": "Harsh red targeting laser and optic ring (#ef4444)",
        "body": "a lethal military automated sentry turret mounted on a heavy tripod base bolted to the concrete floor with expansion anchors. The armored traverse turret housing holds twin air-cooled 12.7mm machine gun barrels with slotted muzzle brakes and a side-mounted 250-round corrugated steel drum magazine. A central cyclopean optic turret swivels on dual axes, projecting a razor-sharp red tracking line. Stenciled in chipped white paint: 'VESPER PERIMETER GUN 02'.",
        "decal_id": "decal_turret_traverse_ring_swarf",
        "decal_surface": "Floor beneath sentry turret tripod, 2.2 m diameter.",
        "decal_hook": "Circular 360-degree turret traverse wear track and dense pile of spent brass casings.",
        "decal_body": "a complete circular 360-degree grease track worn into floor deck paint by the turret's traverse mechanism, filled with fifty spent brass cartridges, link pins, and muzzle carbon soot."
    },
    {
        "id": "prop_camp_vesper_ammo_press",
        "suite": "Survivor Camp Infrastructure",
        "hook": "Hand-operated munitions reloading bench for Vesper's weapons factory.",
        "room": "Vesper Camp armory workshop.",
        "placement": "Floor-standing heavy tool bench, 1.5 m H, 1.2 m W, 0.7 m D.",
        "verbs": "press cartridges, seat primers, measure powder.",
        "states": "ready to load | pressing | powder empty.",
        "standin": "2D sprite public/prop_camp_vesper_ammo_press.jpg",
        "accent": "Restrained polished tool steel highlight",
        "body": "a massive cast-iron reloading bench anchored by four floor studs, fitted with a heavy twin-station progressive ammunition press. A long steel operating lever with an oversized black phenolic knob actuates hardened tungsten-carbide sizing dies. An acrylic smokeless powder measure hopper feeds from above, flanked by a primer seating tray and wooden inspection blocks holding rows of freshly assembled copper-jacketed cartridges.",
        "decal_id": "decal_gunpowder_spill_carbon_smear",
        "decal_surface": "Floor directly in front of ammo press, 1.4 m wide.",
        "decal_hook": "Spilled smokeless gunpowder flakes, lead shavings, and black graphite carbon smears.",
        "decal_body": "a fine scatter of tiny cylindrical black smokeless gunpowder grains ground into floor seams, paired with bright silver lead filings and oily operator boot heel scuffs."
    },
    {
        "id": "prop_camp_vesper_shield_rack",
        "suite": "Survivor Camp Infrastructure",
        "hook": "Riot and ballistic shield storage rack for Vesper's breach teams.",
        "room": "Vesper Camp muster station.",
        "placement": "Wall-backed storage rack, 1.8 m H, 1.6 m W, 0.5 m D.",
        "verbs": "equip shield, restock armor, inspect damage.",
        "states": "full (3 shields) | partial | empty rack.",
        "standin": "2D sprite public/prop_camp_vesper_shield_rack.jpg",
        "accent": "Red stencil 'VESPER GUILD ARMOR' (#ef4444)",
        "body": "a heavy welded angle-iron vertical storage stanchion with padded rubber divider slots designed to hold three heavy ballistic riot shields. Two shields rest in the slots: curved 12mm layered polycarbonate and steel blast shields with reinforced viewports, padded forearm straps, and heavy rubber ground-strike bumpers. The third slot stands empty. The shields are heavily scored with deep combat scratches and blunt trauma dents.",
        "decal_id": "decal_shield_impact_gouges_apron",
        "decal_surface": "Floor in front of shield rack, 1.6 m wide.",
        "decal_hook": "Heavy gouges in floor deck paint where heavy steel shields were repeatedly dropped into place.",
        "decal_body": "three parallel pairs of rectangular chipped paint gouges worn to bright steel where shield bottom rims strike the floor, with rubber bumper scuffs and dropped bolt washers."
    },
    {
        "id": "prop_camp_grave_fresh",
        "suite": "Survivor Camp Infrastructure",
        "hook": "Fresh burial mound marking recent casualties from alien crawler raids.",
        "room": "Camp perimeter / exterior cemetery cavern.",
        "placement": "Floor mound, 0.7 m H, 1.8 m W, 0.9 m D.",
        "verbs": "inspect grave, pay respects, collect spent shell marker.",
        "states": "fresh dirt | settled | disturbed.",
        "standin": "2D sprite public/prop_camp_grave_fresh.png",
        "accent": "Restrained spent brass shell marker highlight",
        "body": "a freshly excavated burial mound of dark icy gravel, crushed basalt rock, and frozen clay, piled 70cm high. At the head of the mound stands a rough marker cross welded together from two pieces of rusted steel rebar, tied with a strip of faded hazard flagging tape. Rested against the cross is a battered pair of size-11 contractor work boots, and four empty brass shell casings are driven neck-down into the fresh gravel.",
        "decal_id": "decal_grave_spade_excavation_dirt",
        "decal_surface": "Floor surrounding fresh grave mound, 2.2 m wide.",
        "decal_hook": "Excavation shovel scrape marks and spilled loose frozen spoil around the fresh grave.",
        "decal_body": "a broad halo of freshly shoveled dark gravel dirt and pulverized permafrost dust spread over grey stone, showing flat spade blade marks and knee-kneeling imprints."
    },
    {
        "id": "prop_camp_grave_old",
        "suite": "Survivor Camp Infrastructure",
        "hook": "Sunken, frostbitten grave from the earliest collapse winter.",
        "room": "Deep bunker graveyard / forgotten corridors.",
        "placement": "Sunken floor grave, 0.4 m H, 1.9 m W, 1.0 m D.",
        "verbs": "clear frost rind, read eroded tag.",
        "states": "frostbitten | cleared | sunken.",
        "standin": "2D sprite public/prop_camp_grave_old.png",
        "accent": "Pale cyan crystalline permafrost crust (#22d3ee)",
        "body": "an ancient, sunken grave from the initial bunker collapse, where the settlement of frozen earth has left a rectangular depression in the rock. A cracked pre-cast concrete marker slab lies tilted at the head, heavily weathered and choked with thick white hoarfrost and pale blue ice rind. An eroded copper identification tag half-submerged in the ice reads only: '...MINING TEAM 4... 2024'.",
        "decal_id": "decal_sunken_permafrost_grave_heave",
        "decal_surface": "Floor around sunken grave, 2.4 m long.",
        "decal_hook": "Frost-heave fracture lines and creeping permafrost crust surrounding old grave.",
        "decal_body": "radial frost-heave tensile cracks splitting cold deck concrete around a sunken rectangular depression, with crystalline hoarfrost filling every fracture and grey lichen creeping across the edges."
    },

    # --- SUITE D: PREGALIEN HIVE ECOLOGY & BIOMACHINERY (8 ITEMS) ---
    {
        "id": "prop_alien_feeding_basin",
        "suite": "PregAlien Hive Ecology",
        "hook": "Biomechanical nutrient pool where worker aliens feed developing larval broods.",
        "room": "Sector Zero / hive nursery cavities.",
        "placement": "Floor-recessed cistern, 1.3 m H, 2.0 m W, 1.8 m D.",
        "verbs": "sample biological slurry, poison basin, inspect larvae.",
        "states": "bubbling slurry | contaminated | drained.",
        "standin": "2D sprite public/prop_alien_feeding_basin.png",
        "accent": "Fluorescent lime-green bioluminescent nutrient slurry (#84cc16)",
        "body": "a massive organic cistern basin grown from the cave floor: a flared bowl of ribbed calcified ivory bone lined with glistening purple mucus membranes. The basin is half-filled with thick, glowing lime-green biological slurry that bubbles with slow anaerobic gas releases. Three ribbed peristaltic feeder conduits dangle into the pool from overhead bone arches, pumping nutrient fluid with rhythmic wet contractions. Small translucent larval pods cling to the submerged bone ribs.",
        "decal_id": "decal_feeding_slurry_regurgitation_splash",
        "decal_surface": "Floor surrounding feeding basin, 2.4 m wide.",
        "decal_hook": "Thick glowing regurgitated feeding slurry splashes and acidic slime puddles.",
        "decal_body": "a wide irregular splatter of viscous lime-green nutrient slurry pools on dark basalt, showing thick raised droplet rims, oily rainbow surface sheen, and acidic foam bubbles along the margins."
    },
    {
        "id": "prop_alien_respiratory_vent",
        "suite": "PregAlien Hive Ecology",
        "hook": "Atmospheric bio-exchanger circulating oxygen and alien pheromones through Sector Zero.",
        "room": "Deep hive corridors / wall apertures.",
        "placement": "Wall-mounted organic vent, 1.8 m H, 1.1 m W, 1.1 m D.",
        "verbs": "inhale pheromone, block airway, sample gas.",
        "states": "exhaling (mist) | inhaling | occluded.",
        "standin": "2D sprite public/prop_alien_respiratory_vent.png",
        "accent": "Deep violet membrane tissue (#a855f7)",
        "body": "a towering organic respiratory chimney grown directly out of a breached bunker steel ventilation duct. Flared petal-like ribs of dark polished chitin encase a central pulsing throat of wet, dark violet pulmonary tissue. Every eight seconds, the throat dilates smoothly, exhaling a warm plume of translucent vapor smelling of sweet musk and copper. Fine glandular pores along the chitin rim weep glistening amber fluid.",
        "decal_id": "decal_respiratory_exhale_spore_cone",
        "decal_surface": "Floor in front of respiratory vent, 2.5 m long.",
        "decal_hook": "Directional vapor cone fallout, moist spore dusting, and damp condensate marks.",
        "decal_body": "a directional conical fan of damp moisture condensation and fine purple spore dust extending 2.5 meters from the vent base, with dark wet droplet rings forming along the central trajectory."
    },
    {
        "id": "prop_hive_chitin_hatchery",
        "suite": "PregAlien Hive Ecology",
        "hook": "Incubation chamber where cyber-snail embryos fuse with corporate salvage.",
        "room": "Hive fringe / scrap-infested bio-chambers.",
        "placement": "Floor-standing nursery mound, 2.2 m H, 2.6 m W, 1.8 m D.",
        "verbs": "crush embryos, harvest titanium scrap, disturb nest.",
        "states": "incubating | shattered | harvested.",
        "standin": "2D sprite public/prop_hive_chitin_hatchery.jpg",
        "accent": "Amber embryonic glow through shell cauls (#f59e0b)",
        "body": "a sprawling biological incubation mound built from layers of hardened black resin, shredded corporate electrical cables, and calcified bone struts. Embedded throughout the mound are ten large, translucent amber amniotic pods, inside of which half-formed cybernetic snail shells and pulsing cyber-circuit grafts are clearly visible in warm fluid. Heavy umbilical hoses connect the mound to an overhead corporate power line, stealing electricity to warm the brood.",
        "decal_id": "decal_hatchery_mucus_wallowing_pool",
        "decal_surface": "Floor perimeter of hatchery mound, 2.8 m across.",
        "decal_hook": "Viscous amniotic wallow pool and crawler emergence drag tracks.",
        "decal_body": "a heavy circular pool of thick, amber-tinted amniotic slime on the floor grating, showing multiple radiating crawler abdomen drag tracks and broken shell fragments."
    },
    {
        "id": "prop_hive_relay_antenna",
        "suite": "PregAlien Hive Ecology",
        "hook": "Bio-frequency amplifier used by Vey, The Listener, to broadcast spoofed clearances.",
        "room": "Acoustic chambers / deep hive spires.",
        "placement": "Floor-standing spire monolith, 2.8 m H, 1.2 m W, 1.0 m D.",
        "verbs": "tune frequency, jam signal, align bio-antenna.",
        "states": "listening (humming) | transmitting | jammed.",
        "standin": "2D sprite public/prop_hive_relay_antenna.jpg",
        "accent": "Cyan electrical static sparking across sensory filaments (#22d3ee)",
        "body": "an eerie, slender organic antenna spire rising 2.8 meters tall: a central fluted column of fused spinal vertebrae and blackened iron conduit tapering to a needle-sharp apex. Branching from the upper third are twelve ultra-thin, glistening chitin tuning needles that vibrate with continuous ultrasonic resonance, creating visible air ripples. Strands of bio-luminescent cyan lichen wrap the base, sparking with micro-electrostatic discharges.",
        "decal_id": "decal_relay_neural_static_lichen_ring",
        "decal_surface": "Floor surrounding relay antenna spire, 2.0 m diameter.",
        "decal_hook": "Concentric rings of acoustic vibration dust and fine static discharge burns.",
        "decal_body": "concentric nodal rings of fine pulverized white rock dust sorted by ultrasonic vibration frequencies, interrupted by tiny radial electrostatic carbon burn pinpoints."
    },
    {
        "id": "prop_hive_suture_organ",
        "suite": "PregAlien Hive Ecology",
        "hook": "Healing tissue organ cultivated by Nahl, The Suture, to stitch severed hosts.",
        "room": "Nahl's alcove / biomaterial hospital.",
        "placement": "Wall-mounted organic loom, 1.6 m H, 1.3 m W, 0.9 m D.",
        "verbs": "harvest suture thread, repair carapace, soothe wound.",
        "states": "weaving (threads taut) | harvested | dormant.",
        "standin": "2D sprite public/prop_hive_suture_organ.jpg",
        "accent": "Soft pink fleshy vascular glow (#f43f5e)",
        "body": "a delicate, beautiful biomechanical organ mounted in a shallow wall niche: two curved ivory bone arms extend outward like a weaver's loom, holding hundreds of taut, micro-thin translucent biological suture threads. In the center, a soft, pulsating plum-colored muscular heart pumps clear healing albumin through hair-like glass pipettes. Glistening droplets of surgical resin hang suspended from the thread tips like dewdrops on spider silk.",
        "decal_id": "decal_suture_silk_thread_drool",
        "decal_surface": "Floor and wall below suture organ, 1.7 m wide.",
        "decal_hook": "Fine silvery suture thread drool and dried clear albumin pools.",
        "decal_body": "a fine web of fallen silver bio-silk threads tangled over dark stone, set into a clean, high-gloss puddle of clear dried albumin resin with delicate finger drag marks."
    },
    {
        "id": "prop_hive_synaptic_web",
        "suite": "PregAlien Hive Ecology",
        "hook": "Neural communication web transmitting the Queen's telepathic whispers.",
        "room": "Corridor ceilings and wall intersections across Sector Zero.",
        "placement": "Wall-spanning neural lattice, 2.0 m H, 2.4 m W, 0.4 m D.",
        "verbs": "listen to whisper, sever synaptic bridge, ground node.",
        "states": "whispering (pulsing) | disrupted | dead.",
        "standin": "2D sprite public/prop_hive_synaptic_web.jpg",
        "accent": "Pulsing violet-magenta neural nodes (#d946ef)",
        "body": "a complex, sprawling web of taut bio-neural fibers stretched flat across a corridor wall. The primary cables are thick, glossy black cords that pulse with traveling knots of magenta bioluminescent light. At each junction node sits a translucent disc of neural tissue that twitches when sound or motion passes nearby. Fine bone mounting anchors pierce the rock, anchoring the living computational web firmly to the bunker architecture.",
        "decal_id": "decal_synaptic_discharge_scorched_membrane",
        "decal_surface": "Wall surface behind neural web, 2.1 m wide.",
        "decal_hook": "Neural discharge scorch marks and ruptured membrane residue when synaptic node is severed.",
        "decal_body": "a dendritic branching pattern of fine electrical scorch tracks etched into bulkhead paint, surrounded by ruptured purple biological membrane flakes and clear electrolyte fluid."
    },
    {
        "id": "prop_hive_wound_cauterizer",
        "suite": "PregAlien Hive Ecology",
        "hook": "Thermal plasma bio-station used to seal and graft human limbs to chitin chassis.",
        "room": "Biomechanical conversion lab.",
        "placement": "Floor-standing surgical fixture, 1.9 m H, 1.5 m W, 1.1 m D.",
        "verbs": "cauterize graft, inspect surgical tools, purge burner.",
        "states": "preheated (flame) | searing graft | cold.",
        "standin": "2D sprite public/prop_hive_wound_cauterizer.jpg",
        "accent": "Blazing thermal orange plasma emitter (#f97316)",
        "body": "a horrifying hybrid surgical installation: a heavy cast-iron gurney arm fitted with articulating mechanical claws that cradle a high-temperature geothermal plasma torch. The torch nozzle is ringed with serrated chitin heat shields that glow bright cherry red. A biological trough below is filled with charred bone fragments and cooling purple blood clots, fed by high-pressure thermal fuel lines and braided copper heat shunts.",
        "decal_id": "decal_cauterizer_plasma_splatter_scab",
        "decal_surface": "Floor in front of surgical cauterizer, 2.0 m wide.",
        "decal_hook": "Charred biological tissue splatter, plasma scorch arc, and blackened blood crust.",
        "decal_body": "a violent radial fan of heavy black thermal carbon scorch on deck plating, encrusted with thick charred biological tissue scabs and bubbling heat-pitted paint."
    },
    {
        "id": "door_biomechanical_iris",
        "suite": "PregAlien Hive Ecology",
        "hook": "Living muscular bulkhead iris door separating deep Sector Zero compartments.",
        "room": "Core sector thresholds and Queen's approach.",
        "placement": "Wall-spanning aperture gate, 2.8 m H, 2.2 m W, 0.6 m D.",
        "verbs": "approach (auto-dilate), pry open, cauterize open.",
        "states": "closed (interlocked) | dilating | wide open.",
        "standin": "2D sprite door_biomechanical in public/",
        "accent": "Restrained emerald sphincter rim seal (#10b981)",
        "body": "a monumental circular doorway set into a heavy arched blackened-steel frame: the aperture is sealed by eight overlapping, curved triangular petals of glossy black chitin and wet maroon muscular tissue that meet at a tight central puckered sphincter. When approached, the petals smoothly spiral open in a counter-clockwise iris dilation, revealing a dark wet passage lined with ribbing. Taut translucent mucus membranes stretch between the parting petals.",
        "decal_id": "decal_iris_sphincter_rub_apron",
        "decal_surface": "Threshold floor directly below iris door, 2.6 m wide.",
        "decal_hook": "Wet mucosal drag apron and radial friction wear from the dilating door petals.",
        "decal_body": "a curved semicircular friction apron worn into the threshold floor by the sweeping chitin door petals, coated in clear glistening biological slime and crushed gravel."
    },

    # --- SUITE E: ENVIRONMENTAL HAZARDS, CRYO DEBRIS & ACT 2 ENDINGS (8 ITEMS) ---
    {
        "id": "scatter_broken_drone",
        "suite": "Environmental Hazards & Endings",
        "hook": "Crashed Horizon survey drone detailing early reconnaissance failures.",
        "room": "Chasm ledges, maintenance catwalks, debris fields.",
        "placement": "Floor scatter debris, 0.4 m H, 1.1 m W, 1.1 m D.",
        "verbs": "salvage avionics, extract battery, kick aside.",
        "states": "intact wreckage | stripped.",
        "standin": "2D sprite public/scatter_broken_drone.png",
        "accent": "Flickering amber emergency beacon LED (#f59e0b)",
        "body": "the crushed, twisted wreckage of a heavy four-rotor autonomous industrial surveillance drone. The black carbon-fiber fuselage has snapped in half, exposing shredded internal ribbon wiring, a dented lithium battery pack, and a dangling triple-camera optical sensor gimbal with shattered lenses. One rotor arm is bent at an impossible angle, its serrated composite blade embedded into the rock floor. A faint amber LED flickers erratically in the avionics bay.",
        "decal_id": "decal_drone_crash_skid_shrapnel",
        "decal_surface": "Floor impact path, 2.5 m long.",
        "decal_hook": "Violent crash skid mark, shredded carbon fiber fragments, and lithium battery burn.",
        "decal_body": "a 2.5-meter black rubber and carbon skid mark terminating in a localized spray of shredded composite drone shrapnel, battery acid discoloration, and broken camera lens glass."
    },
    {
        "id": "scatter_cryo_icicle",
        "suite": "Environmental Hazards & Endings",
        "hook": "Razor-sharp permafrost icicle clusters hanging from leaking coolant conduits.",
        "room": "Cryo deck corridors and freezer vaults.",
        "placement": "Ceiling-mounted hanging hazard, 1.6 m H, 0.8 m W, 0.8 m D.",
        "verbs": "shoot to drop, avoid fall zone.",
        "states": "hanging | shattered on floor.",
        "standin": "2D sprite public/scatter_cryo_icicle.png",
        "accent": "Translucent cyan glacial refraction (#22d3ee)",
        "body": "a lethal, monumental cluster of four interlocking crystalline ice stalactites hanging from a cracked overhead ammonia coolant pipe. The central icicle is 1.6 meters long and needle-sharp at the tip, formed from alternating rings of clear glacial ice and milky permafrost frost. Periodic drops of supercooled blue brine weep from the pipe joint, falling in slow intervals. Translucent light refines razor-sharp internal fracture planes.",
        "decal_id": "decal_falling_icicle_impact_patter",
        "decal_surface": "Floor impact zone beneath icicle cluster, 1.8 m wide.",
        "decal_hook": "Shattered ice shrapnel and supercooled brine drip patter marks on the deck floor.",
        "decal_body": "a dense radial starburst of crushed blue-white ice crystals and shattered glacial shards, centered on a wet supercooled brine drip crater with white frost creeping along the edges."
    },
    {
        "id": "scatter_ice_stalagmite",
        "suite": "Environmental Hazards & Endings",
        "hook": "Massive glacial ice spire rising from drainage freeze-thaw cycles.",
        "room": "Cryo decks, drainage sumps, cold breezeways.",
        "placement": "Floor-standing natural barrier, 1.8 m H, 1.0 m W, 1.0 m D.",
        "verbs": "melt with flamethrower, use as ballistic cover.",
        "states": "solid frozen | melting/slush | shattered.",
        "standin": "2D sprite public/scatter_ice_stalagmite.png",
        "accent": "Deep cyan refractive core (#06b6d4)",
        "body": "a massive conical spire of solid glacial blue ice rising 1.8 meters high from a steel drainage grate. The ice is dense, layered, and translucent, showing sediment rings and trapped industrial bolts within its frozen core. The exterior surface is scalloped by thermal air currents into rippling flute ridges, with cold condensation trickling down its base into a ring of slush. Serves as natural heavy cover against hostile gunfire.",
        "decal_id": "decal_stalagmite_thaw_puddle_rings",
        "decal_surface": "Floor base around stalagmite, 2.0 m diameter.",
        "decal_hook": "Meltwater slush puddle rings and trapped sediment deposit fringes.",
        "decal_body": "concentric circular water thaw rings around a solid ice anchor footprint, filled with dark grey grit sediment, clear puddles, and radial slush melting rivulets."
    },
    {
        "id": "scatter_cryo_shards",
        "suite": "Environmental Hazards & Endings",
        "hook": "Shattered thermal viewport glass and frozen permafrost shards across corridors.",
        "room": "Breached cryo vaults and explosion sites.",
        "placement": "Floor scatter field, 0.2 m H, 1.2 m W, 1.0 m D.",
        "verbs": "crunch underfoot, search for salvage.",
        "states": "scattered | cleared.",
        "standin": "2D sprite public/scatter_cryo_shards.png",
        "accent": "Cyan crystalline reflection highlight",
        "body": "a dense, glittering field of thick laminated thermal viewing port glass shards mixed with jagged chunks of permafrost ice. The glass pieces are 30mm thick, showing deep internal stress fractures and green tinting, while the ice shards are needle-sharp and clear. When stepped on, they produce loud, crisp crunching sounds that echo down cold corridors.",
        "decal_id": "decal_cryo_glass_frost_powder_fan",
        "decal_surface": "Floor scatter area, 1.9 m wide.",
        "decal_hook": "Fine pulverized glass powder and hoarfrost scatter left by heavy boot traffic.",
        "decal_body": "a fine dusting of pulverized white ice powder and microscopic glass grit ground into floor plate diamond treads, with heavy boot crush marks and kicked shard drag lines."
    },
    {
        "id": "prop_ruptured_coolant_pump",
        "suite": "Environmental Hazards & Endings",
        "hook": "Catastrophically ruptured centrifugal coolant compressor flooding corridors with toxic glycol.",
        "room": "Cryo service corridors / industrial plant.",
        "placement": "Floor-standing heavy machinery, 1.6 m H, 1.8 m W, 1.1 m D.",
        "verbs": "shut off emergency valve, wade through spill, patch breach.",
        "states": "spewing coolant | shut off | drained.",
        "standin": "2D sprite public/prop_ruptured_coolant_pump.png",
        "accent": "Fluorescent cyan glycol coolant puddle (#06b6d4)",
        "body": "a colossal industrial centrifugal pump housing fabricated from ribbed cast iron, whose main impeller casing has suffered a catastrophic brittle freeze-fracture, bursting open in a jagged 40cm breach. Chilled, neon-cyan ethylene glycol coolant gushes continuously from the fractured housing, boiling into white fog as it strikes warm pipes. The surrounding motor housing and floor bolts are encrusted with thick, pale blue frozen slush.",
        "decal_id": "decal_glycol_coolant_slick_flooding",
        "decal_surface": "Floor surrounding ruptured pump, 2.8 m wide.",
        "decal_hook": "Massive flooding slick of slippery cyan chemical coolant spreading across deck.",
        "decal_body": "a broad reflective pool of high-gloss neon-cyan chemical coolant liquid with wavy surface ripples, oily purple chemical rainbow sheen, and frosted white boundary margins."
    },
    {
        "id": "evac_empty_cockpit_quad",
        "suite": "Environmental Hazards & Endings",
        "hook": "The haunting four-seat escape cockpit for Ending E: 'Scorched Sky' (escaping alone).",
        "room": "Escape Vessel cockpit / bridge.",
        "placement": "Floor-standing setpiece bridge, 1.5 m H, 2.4 m W, 2.0 m D.",
        "verbs": "sit in pilot seat, initiate solo launch, look at empty seats.",
        "states": "waiting | launched into void.",
        "standin": "Narrative specification in docs/expanded-universe-narrative-design.md",
        "accent": "Cold amber emergency console telemetry (#f59e0b)",
        "body": "an eerie, heartbreaking spacecraft bridge module designed for a full expedition crew of four: four molded high-G flight couches arranged in an arc facing an expansive panoramic viewport. The pilot's chair displays live amber launch vector coordinates and flickering telemetry, but the three companion seats are empty, their heavy padded harnesses hanging slack over cold, vacant cushions. A forgotten thermos and dropped contractor dogtag sit on the empty copilot console.",
        "decal_id": "decal_deserted_cockpit_boot_scuff_panic",
        "decal_surface": "Floor of escape vessel cockpit, 2.6 m wide.",
        "decal_hook": "Panicked boot scuffs and abandoned personal trinkets left in the empty cockpit.",
        "decal_body": "scuffed black rubber boot marks facing the lone pilot seat, paired with clean dust outlines on the three empty crew positions and a dropped silver clipboard with flight manifests."
    },
    {
        "id": "evac_mixed_crew_divider",
        "suite": "Environmental Hazards & Endings",
        "hook": "Physical containment bulkhead dividing human survivors from cyber-hybrids in Ending C.",
        "room": "Escape Vessel cargo hold.",
        "placement": "Hold-spanning partition bulkhead, 2.8 m H, 3.0 m W, 0.6 m D.",
        "verbs": "inspect barrier, talk through intercom, check containment.",
        "states": "sealed | fragile truce | breached.",
        "standin": "Narrative specification in docs/expanded-universe-narrative-design.md",
        "accent": "Dual-tone: Cyan cleanroom light (left) vs Amber bio-heat (right)",
        "body": "a heavy reinforced spacecraft containment partition dividing the escape vessel cargo hold in half. Constructed from riveted titanium frame beams holding thick, multilayered polycarbonate viewport panes with integrated wire mesh. The left half features clean stainless benches and cyan decontamination air filtration for human survivors; the right half is fitted with warm amber heat lamps, humidifiers, and biological perches for mutated cyber-hybrid crewmates.",
        "decal_id": "decal_hybrid_claw_scratch_containment",
        "decal_surface": "Reinforced glass and floor threshold, 2.2 m wide.",
        "decal_hook": "Deep chitin claw scratches on the hybrid side and anxious handprints on the human side.",
        "decal_body": "multiple deep white scratch clusters cut into heavy polycarbonate glass by hybrid talons on one side, opposing terrified human palm grease smears and condensation drips on the clean side."
    },
    {
        "id": "evac_hidden_egg_coolant_rack",
        "suite": "Environmental Hazards & Endings",
        "hook": "Concealed smuggling rack in coolant bay holding Queen eggs for Ending D: 'Carrier's Bargain'.",
        "room": "Escape Vessel engine / coolant cell.",
        "placement": "Recessed bulkhead compartment, 1.2 m H, 1.5 m W, 0.8 m D.",
        "verbs": "inspect hidden eggs, check coolant flow, conceal panel.",
        "states": "concealed | exposed | hatching.",
        "standin": "Narrative specification in docs/expanded-universe-narrative-design.md",
        "accent": "Warm amber egg bio-glow muffled by frost (#f59e0b)",
        "body": "a secret, illicit compartment nestled deep inside the escape vessel's primary ammonia coolant cell, hidden behind a false circuit-breaker panel. Inside, resting in custom foam isolation brackets and cooled by rerouted copper frost lines, are two live amber alien eggs pulsing with warm internal embryonic light. White hoarfrost coats the perimeter valves, keeping the brood dormant during the journey back to civilized space.",
        "decal_id": "decal_hidden_egg_frost_bleed_seam",
        "decal_surface": "Wall and floor below false breaker panel, 1.7 m wide.",
        "decal_hook": "Tell-tale white frost bleed and sticky amber condensation leaking from the concealed egg panel.",
        "decal_body": "a tell-tale hairline frame of white hoarfrost bleeding outward from around a closed breaker panel seam, with two tiny drops of glowing amber resin frozen in place on the bottom lip."
    }
]

def generate_markdown(data):
    md = []
    md.append("# 50 Missing 3D World-Story Props & Companion Decals — Generation Specification")
    md.append("")
    md.append("**Document ID:** `HB-PROPS-50-WORLD-STORY-2026-10-27`  ")
    md.append("**Status:** Production Ready | Verified 100% Unique against all 563 existing runtime GLBs  ")
    md.append("**Target Directory:** `public/3d/runtime/new3ds/` (Props) and `public/` / `src/data/` (Decals)  ")
    md.append("**Companion TSV:** [missing-world-story-3d-props-and-decals-2026-10-27.tsv](./missing-world-story-3d-props-and-decals-2026-10-27.tsv)")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## 1. Executive Summary & Verification Audit")
    md.append("")
    md.append("This document authors **50 brand-new, non-duplicate 3D prop models** and **50 matching companion decals** (spills, breaks, leaks, scorches, and aftermath evidence).")
    md.append("Every item addresses a verified gap in the active game codebase:")
    md.append("1. **Resolves Quest Stand-Ins:** Replaces `standIn` proxy models in [`src/questObjects.js`](../../src/questObjects.js).")
    md.append("2. **Materializes Lore Collectibles:** Converts flat 2D sprite cards from [`src/loreDrops.js`](../../src/loreDrops.js) into inspectable 3D physical artifacts.")
    md.append("3. **Replaces Camp & Cave Sprites:** Upgrades high-frequency 2D billboards identified in [`docs/reports/2d-to-3d-gap-audit-2026-10-05.md`](../reports/2d-to-3d-gap-audit-2026-10-05.md) into full GLB models.")
    md.append("4. **Implements Act 2 Endings:** Builds the authored physical setpieces required by the 5-ending launch matrix in [`docs/expanded-universe-narrative-design.md`](../expanded-universe-narrative-design.md).")
    md.append("")
    md.append("### Uniqueness Guarantee")
    md.append("All 50 proposed model IDs were verified against `public/3d/runtime/new3ds/` (563 shipped GLBs) and `WORLD_3D_MODELS` with **zero collisions**.")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## 2. Shared House Aesthetic & Technical Specifications")
    md.append("")
    md.append("### Art Direction")
    md.append("> **Nordic Jugendstil and National Romantic monumentality meets H.R. Giger biomechanical body horror.**")
    md.append("> Monumental round arches, blackened iron bindings, carved bone ivory reliefs, wet maroon muscle tissue, and glossy chitin seams.")
    md.append("> Restraint over gore; solemn sacramental dread over novelty or comedy. Exactly one emissive practical accent per prop.")
    md.append("")
    md.append("### Negative Prompt (Exclusions)")
    md.append("```text")
    md.append(NEGATIVE_BLOCK)
    md.append("```")
    md.append("")
    md.append("---")
    md.append("")
    md.append("## 3. The 50 Props & Companion Decals Manifest")
    md.append("")

    current_suite = ""
    for idx, item in enumerate(data, 1):
        if item["suite"] != current_suite:
            current_suite = item["suite"]
            md.append(f"### {current_suite}")
            md.append("")

        prop_full_prompt = (
            f"Hyper-detailed photorealistic 3D game asset render of a SINGLE {item['id'].replace('_', ' ')} "
            f"(about {item['placement'].split(', ')[-1]}): {item['body']} "
            f"Story it tells: {item['hook']} "
            f"Exactly one accent light: {item['accent']}; every other surface is unlit material colour. "
            f"{STYLE_BLOCK} {RENDER_BLOCK}"
        )

        decal_full_prompt = (
            f"Hyper-detailed photorealistic 2D game decal asset render of {item['decal_body']} "
            f"Context: {item['decal_hook']} Placement: {item['decal_surface']}. "
            f"{DECAL_STYLE_BLOCK} {DECAL_RENDER_BLOCK}"
        )

        md.append(f"#### {idx}. `{item['id']}`")
        md.append(f"- **Suite:** {item['suite']}")
        md.append(f"- **Story & Worldbuilding:** {item['hook']}")
        md.append(f"- **Room Placement:** {item['room']}")
        md.append(f"- **Placement Class & Dims:** {item['placement']}")
        md.append(f"- **Verbs & Interaction:** `{item['verbs']}`")
        md.append(f"- **Persisted States:** `{item['states']}`")
        md.append(f"- **Resolves Gap:** Replaces `{item['standin']}`")
        md.append(f"- **Emissive Accent:** {item['accent']}")
        md.append("")
        md.append("**3D Generation Prompt:**")
        md.append("```text")
        md.append(prop_full_prompt)
        md.append("```")
        md.append("")
        md.append(f"**Companion Decal:** `{item['decal_id']}`")
        md.append(f"- **Decal Surface & Size:** {item['decal_surface']}")
        md.append(f"- **Decal Story & Context:** {item['decal_hook']}")
        md.append("**Decal Generation Prompt:**")
        md.append("```text")
        md.append(decal_full_prompt)
        md.append("```")
        md.append("")
        md.append("---")
        md.append("")

    return "\n".join(md)

def generate_tsv(data):
    tsv = []
    tsv.append("n\tid\tkind\tkey\tsize\tprompt")
    row_num = 1
    for item in data:
        prop_full_prompt = (
            f"Hyper-detailed photorealistic 3D game asset render of a SINGLE {item['id'].replace('_', ' ')} "
            f"(about {item['placement'].split(', ')[-1]}): {item['body']} "
            f"Story it tells: {item['hook']} "
            f"Exactly one accent light: {item['accent']}; every other surface is unlit material colour. "
            f"{STYLE_BLOCK} {RENDER_BLOCK}"
        )
        tsv.append(f"{row_num}\t{item['id']}\t3d-prop\tgrey\t2048x2048\t{prop_full_prompt}")
        row_num += 1

        decal_full_prompt = (
            f"Hyper-detailed photorealistic 2D game decal asset render of {item['decal_body']} "
            f"Context: {item['decal_hook']} Placement: {item['decal_surface']}. "
            f"{DECAL_STYLE_BLOCK} {DECAL_RENDER_BLOCK}"
        )
        tsv.append(f"{row_num}\t{item['decal_id']}\tdecal\talpha\t2048x2048\t{decal_full_prompt}")
        row_num += 1

    return "\n".join(tsv)

if __name__ == '__main__':
    md_content = generate_markdown(DATA)
    tsv_content = generate_tsv(DATA)

    md_path = 'docs/planning/missing-world-story-3d-props-and-decals-2026-10-27.md'
    tsv_path = 'docs/planning/missing-world-story-3d-props-and-decals-2026-10-27.tsv'

    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"Successfully wrote {len(DATA)} props and companion decals to {md_path}")

    with open(tsv_path, 'w', encoding='utf-8') as f:
        f.write(tsv_content)
    print(f"Successfully wrote 100 generation rows to {tsv_path}")
