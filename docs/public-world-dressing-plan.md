# Public World Dressing Asset Plan

This is a review of the current `public/` asset set, focused on the small
sprites, props, body states, and environmental details that make the world feel
alive.

The current library is already strong in the big-ticket areas:

- hero textures and materials
- camp leaders and enemy sheets
- ending and cutscene art
- core bunker / cryo / bio / hive textures
- UI icons and a few key interactive props

What the game still needs most is not more big art pieces. It needs more
micro-dressing: the little things that make a room look lived in, damaged,
infested, frozen, abandoned, or recently fought over.

## What The Existing Assets Already Do Well

| Area | Strong examples already in `public/` | Why it works |
| --- | --- | --- |
| Base environment | `bunker_*`, `cryo_*`, `bio_*`, `ice_*`, `door_*` | Gives the game a clear material language |
| Major props | `console.png`, `module_*`, `cave_mouth.png`, `survivor_vessel.png`, `ship_wreckage.png` | Lets key locations read quickly |
| Camp / faction identity | `martha_camp_walk*.png`, `briggs_camp_walk*.png`, `kaelen_camp_walk*.png`, `lore_portraits/*` | Gives each camp a face and voice |
| Hive / enemy identity | `alien_*_walk.png`, `boss_*`, `hive_*_site.png`, `queen_silhouette.png` | Supports the alien mirror fantasy |
| Consequence states | `cryosnail_dead.png`, `sporesnail_dead.png`, `cybersnail_dead.png`, boss dead variants | Good example of physical aftermath |
| Cutscene language | `ending_*`, `public/cutscenes/*` | Lets the finale feel authored |
| UI readability | `icon_steal.png`, `icon_cull.png`, `icon_recruit.png`, `icon_turn.png` | Gives the player clear action language |

## What The Game Is Missing Most

The gap is density.

Right now, many spaces rely on a handful of major props and textures. That is
enough to communicate the world, but not enough to make it feel occupied. The
best next assets are small, repeatable, and stateful.

The highest-value additions are:

1. Dead and destroyed states for more enemies and survivors.
2. Tiny scatter sprites for floors, ledges, shelves, and camp corners.
3. Camp-specific clutter that makes Meridian, Tallow, and Vesper feel
   different.
4. Hive-specific organic clutter that makes the alien spaces feel grown, not
   placed.
5. Ambient VFX sprites that add motion without adding systems.
6. State variants for existing props so the world can show damage, infection,
   repair, and abandonment.

## Recommended Asset Naming

Keep the naming simple and functional:

- `scatter_*` for tiny ground clutter and debris
- `prop_*` for standalone world props
- `body_*` for remains and corpse states
- `decal_*` for flat overlays on floors and walls
- `fx_*` for short-lived visual effects
- `variant_*` for alternate states of existing props

This keeps the library readable and makes it easier to grow without chaos.

## Priority List

### P0: Highest ROI

These are the best "make the world feel better immediately" assets.

| Asset family | Current example in `public/` | Add next | Why it matters |
| --- | --- | --- | --- |
| Enemy remains | `cryosnail_dead.png`, `sporesnail_dead.png`, `cybersnail_dead.png` | More dead-state variants for every major enemy line, plus shell piles and broken pieces | Combat should leave physical evidence behind |
| Survivor remains | None as a clear set | Frozen suit remains, collapsed exosuit, empty helmet, sealed body bag, fallen worker pose | Makes the bunker feel dangerous and human |
| Small floor clutter | `scatter_gravel.png`, `scatter_cryo_shards.png`, `scatter_ice_stalagmite.png`, `scatter_slime_puddle.png` | Cable coils, loose bolts, pipe clamps, wire bundles, panel shards, tape rolls, hose knots | Makes rooms stop looking repeated |
| Ambient effects | A few texture elements already exist | Steam puff, spark burst, dust mote cloud, spore puff, drip drop, frost breath | Adds motion and atmosphere cheaply |
| Damage decals | `decal_scars.png`, `hex_decal_cracks.png`, `hex_decal_infestation.png` | Scorch ring, slime streak, rust bloom, ice fracture, bootprint trail | Helps the player read what happened here |

### P1: World-Specific Dressing

These assets define each zone's personality.

| Asset family | Current example in `public/` | Add next | Why it matters |
| --- | --- | --- | --- |
| Camp clutter | `bunker_junk*.png`, `bunker_wall_metal.png`, `module_o2_generator.png` | Crates, cots, ration tins, med boxes, lanterns, chairs, tool benches, water barrels, ammo racks | Makes camps feel inhabited instead of staged |
| Meridian tech dressing | `console.png`, `module_radar_dish.png`, `module_hull_matrix.png`, `module_reactor_compressor.png` | Broken monitors, cable loops, breaker panels, diagnostic towers, exposed circuit strips, spare coils | Makes the tech camp feel engineered |
| Tallow bio dressing | `bio_wall_veins.png`, `bio_base_growth.png`, `bio_spores.png`, `bio_spores_amber.png`, `bio_spores_blue.png` | Resin sacs, membrane drips, fungus clusters, moss pads, seed trays, bio-lamps, wet growth tendrils | Makes the hydro-cult camp feel cultivated |
| Vesper security dressing | `door.png`, `door_rust.png`, `door_alien.png`, `door_cryo.png`, `door_nuclear.png` | Barricade parts, turret base plates, ammo crates, armor racks, red warning strips, blast locks | Makes the security camp feel militarized |
| Hive dressing | `hive_suture_site.png`, `hive_relay_site.png`, `hive_carapace_site.png`, `egg_cluster.png` | Resin globs, chitin ribs, tendon cables, husk fragments, spore towers, amber nodules, membrane curtains | Makes the hive spaces feel grown and alive |
| Ship dressing | `engineer_ship*.png`, `scout_ship*.png`, `tank_ship*.png`, `survivor_vessel.png` | Seat straps, floor panels, coolant pipes, cargo crates, handholds, emergency lights, loose wiring | Makes the escape vessel feel cramped and functional |

### P2: State Variants For Existing Props

This is one of the best ways to get more mileage from the assets already in the
game.

| Existing object | Useful variants to add | Why it helps |
| --- | --- | --- |
| Doors | clean, rusted, frozen, bio-grown, breached, sealed, chained | Reads security and world history instantly |
| Consoles | active, dead, sparking, infected, hacked, half-lit | Shows that the world is changing under the player |
| Camp structures | healthy, fortified, robbed, turned, culled aftermath | Makes Act 2 consequences visible |
| Hive sites | dormant, mined, wounded, bonded, rescued, consumed | Makes the alien side feel like a living state machine |
| Ship hull sections | patched, scorched, frost-cracked, bio-veined, stripped | Makes the final escape vehicle feel earned |
| Floor surfaces | clean, icy, muddy, resin-coated, scorch-marked, bloodless stain equivalent | Helps rooms tell stories without extra geometry |

### P3: Small Story Sprites

These are little sprites that do not need new systems, but they make the world
feel less empty.

| Asset family | Examples | Best use |
| --- | --- | --- |
| Maintenance clutter | wrench, screwdriver, wrench roll, cable spool, breaker fuse, data chip | Workshops, foundry rooms, camp repair corners |
| Survival clutter | canteen, ration tin, med syringe, bandage roll, blanket bundle, boot print | Camps, med bays, storage rooms |
| Industrial clutter | pipe elbow, valve wheel, warning cone, vent grill, floor grate fragment, bolt pile | Bunker corridors, power rooms, maintenance shafts |
| Bio clutter | resin drop, chitin shard, spore puff, membrane scrap, egg husk, growth nub | Hive sites, infested halls, queen-adjacent areas |
| Cryo clutter | ice chips, frost drift, icicle shard, snow streak, cold breath puff | Exterior access areas, glacier cuts, frozen tunnels |
| Cargo clutter | crate, strap bundle, pallet shard, coil of hose, wrapped package, cargo tag | Ship interiors, storage rooms, landing zones |

## Starter Pack: 20 Small Assets That Would Help Fast

If we want a tight first pass, these are the most valuable additions:

1. `body_human_frozen_suit.png`
2. `body_human_collapsed.png`
3. `body_empty_exosuit.png`
4. `body_snail_shell_pile.png`
5. `body_snail_crushed.png`
6. `body_boss_remains.png`
7. `scatter_cable_coil.png`
8. `scatter_bolts.png`
9. `scatter_pipe_clamp.png`
10. `scatter_panel_shard.png`
11. `scatter_wire_bundle.png`
12. `scatter_ration_tin.png`
13. `prop_camp_crate.png`
14. `prop_camp_cot.png`
15. `prop_camp_toolbench.png`
16. `prop_hive_resin_sac.png`
17. `prop_hive_husk.png`
18. `prop_ship_cargo_box.png`
19. `fx_steam_puff.png`
20. `fx_spark_burst.png`

That pack alone would make the game feel more physically present.

## Best-Value Asset Themes By Faction

| Faction / biome | Best small assets | What they communicate |
| --- | --- | --- |
| Meridian | monitors, coils, breaker boxes, terminals, cable spools, sparks | Technology, improvisation, electricity |
| Tallow | cots, lamps, seed trays, bio-lamps, spores, moss, med kits | Care, cultivation, ritual |
| Vesper | ammo crates, barricade pieces, armor racks, lockboxes, blast doors | Security, threat, discipline |
| Hive | resin sacs, husks, tendrils, egg shells, membrane curtains, amber drips | Growth, hunger, memory, infestation |
| Cryo / cave | ice chunks, frost trails, steam vents, cracked seals, frozen bodies | Exposure, cold, isolation |
| Ship / finale | seat straps, cargo boxes, handholds, coolant pipes, warning lights | Escape, pressure, confinement |

## What To Avoid For Now

- Do not spend the next art pass on another large hero asset if a small prop can
  do the same job.
- Do not make one-off decorative objects that only appear in a single room.
- Do not add more ending backdrops before the world dressing layer is fuller.
- Do not make every prop unique if a state variant can reuse the same shape.
- Do not add new nouns unless the current spaces are already dense enough to
  support them.

## Recommended Order Of Attack

1. Finish corpse and remain states for all major enemies and survivors.
2. Add a compact scatter pack for bunker, cryo, and hive floors.
3. Add camp-specific clutter for the three survivor camps.
4. Add hive organic dressing and corpse/husk states.
5. Add ambient VFX sprites for steam, sparks, spores, frost, and drips.
6. Add state variants for doors, consoles, modules, and ship parts.

## Short Version

The public asset set already covers the important landmarks.
What it needs now is texture density, aftermath, and variation.

The fastest way to improve the game visually is to add:

- more dead-state sprites
- more tiny clutter
- more damage decals
- more ambient effects
- more alternate states for props that already exist

That will make the world feel busier, harsher, and more lived in without
requiring a new system for every improvement.
