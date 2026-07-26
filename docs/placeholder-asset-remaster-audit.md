# Visual Remaster Asset Audit & Queue

A comprehensive inventory of basic, vector SVG, and legacy placeholder assets in `public/` queued for visual remastering to match the dark, sensual, biomechanical Gigeresque key art style ([title_key_art_v2.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/title_key_art_v2.png)).

---

## 1. Vector SVG Placeholders (High Priority for 2.5D Key Art Upgrade)
*These basic flat vector drawings lack depth, lighting, and texture detail.*

- **`public/prop_camp_cot.svg`** (1.4 KB) — Flat vector camp cot frame.
- **`public/prop_camp_crate.svg`** (1.2 KB) — Flat vector wooden supply box.
- **`public/prop_hive_resin_sac.svg`** (1.5 KB) — Flat vector bio-resin pod.
- **`public/scatter_bolts.svg`** (1.7 KB) — Flat vector metallic scrap bolts.
- **`public/scatter_cable_coil.svg`** (1.4 KB) — Flat vector industrial cable loop.
- **`public/fx_spark_burst.svg`** (0.9 KB) — Basic vector electrical spark.
- **`public/fx_steam_puff.svg`** (1.0 KB) — Basic vector steam cloud puff.

---

## 2. Low-Resolution Survivor Camp Props (Needs Dark Key-Art Style Remaster)
*Legacy low-poly or small-scale PNG props used in survivor refugee camps.*

- **`public/prop_camp_cookfire_lit.png`** (92 KB) — Lit campfire set piece with glowing embers.
- **`public/prop_camp_cookfire_doused.png`** (32 KB) — Extinguished campfire ash mound.
- **`public/prop_camp_bedrolls.png`** (38 KB) — Survivor sleeping bag roll.
- **`public/prop_camp_crates.png`** (24 KB) — Small stacked wooden crates.
- **`public/prop_camp_crates_chained.png`** (75 KB) — Chained military crate stack.
- **`public/prop_camp_sandbags.png`** (29 KB) — Low-res sandbag barricade.
- **`public/prop_camp_grave_fresh.png`** (32 KB) — Fresh survivor grave mound with marker.
- **`public/prop_camp_grave_old.png`** (45 KB) — Weathered survivor grave marker.
- **`public/prop_camp_laundry.png`** (35 KB) — Survivor clothing drying line.
- **`public/prop_camp_shutter_lockdown.png`** (111 KB) — Blast shutter lockdown door.
- **`public/prop_camp_warning_placard.png`** (122 KB) — Bio-hazard warning sign.

---

## 3. Early Cave & Bio-Organism Props (Needs Gigeresque Remaster)
*Early prototype cave textures that predate the remastered key art style.*

- **`public/prop_cave_lichen.png`** (227 KB) — Prototype bioluminescent cave lichen moss.
- **`public/prop_cave_bones.png`** (34 KB) — Prototype skeletal bone pile scatter.
- **`public/prop_cave_eggs_intact.png`** (131 KB) — Prototype intact alien egg sac cluster.
- **`public/prop_cave_eggs_hatched.png`** (33 KB) — Prototype hatched egg shell fragments.
- **`public/prop_cave_spores.png`** (111 KB) — Prototype spore pod emitter.
- **`public/prop_cave_webs.png`** (467 KB) — Prototype organic web canopy.
- **`public/prop_cave_hive_wounded.png`** (115 KB) — Prototype damaged hive wall organ.
- **`public/prop_cave_queen_throne.png`** (788 KB) — Early alien queen throne structure.

---

## 4. Low-Resolution Floor Scatter Decals
*Small flat ground decals.*

- **`public/scatter_coolant_puddle.png`** (2.8 KB) — Low-resolution coolant spill decal.
- **`public/scatter_gravel.png`** (2.2 KB) — Low-resolution gravel rock scatter.
- **`public/scatter_slime_puddle.png`** (2.6 KB) — Low-resolution alien slime spill decal.

---

## 5. Ship & Structure Models (Candidates for Act 1/2 Ship Upgrades)
- **`public/scout_ship.png`**, **`scout_ship_broken.png`**, **`scout_ship_healed.png`**
- **`public/tank_ship.png`**, **`tank_ship_broken.png`**, **`tank_ship_healed.png`**
- **`public/engineer_ship.png`**, **`engineer_ship_healed.png`**
- **`public/ship_wreckage.png`** — Distressed escape pod hull wreckage.

---

## Completed Remasters (13 HD Assets Already Active In-Game)
- `prop_biomech_pillar_left.png` & `prop_biomech_pillar_right.png` (Walkable Archway Legs)
- `prop_biomech_arch.png` (Biomechanical Ribcage Archway)
- `prop_cyber_junction.png` (Corrupted Power Terminal)
- `prop_specimen_tank.png` (Bio-Resin Specimen Capsule)
- `prop_bunker_supplies.png` (Survivor Ammo Crate Stack)
- `prop_spore_colony.png` (Alien Spore Egg Cluster)
- `prop_conduit_hub.png` (Hydraulic Cable Relay Hub)
- `fungal_spore_vent.png` (Stage 1 Vent Nest)
- `mycelium_stalker.png` (Stage 2 Mycelium Stalker)
- `bio_charger.png` (Apex Bio-Charger Beast)
- `spore_mortar.png` (Bio-Artillery Spore Launcher)
- `door_biomechanical.png` (Sphincter Blast Gate Door)

---

## Remaster Work in Review

### Accepted isolated prop pass

Seven formerly weak cave/camp placeholders were regenerated individually
against `title_key_art_v2.png`, keyed to transparent RGBA, visually checked as
isolated silhouettes, and promoted to their existing live paths:

- `prop_cave_lichen.png`
- `prop_cave_bones.png`
- `prop_cave_eggs_intact.png`
- `prop_cave_spores.png`
- `prop_cave_webs.png`
- `prop_camp_sandbags.png`
- `prop_camp_crates.png`

The non-destructive production copies, removable-key sources, and comparison
sheet live under `public/art-remaster/placeholder-v2/isolated-props/`. Unlike
the earlier survival atlas, each prop was generated separately, eliminating
cross-cell fragments. These assets retain their existing runtime identifiers,
so no placement or material routing changes were required.

### Survival / maintenance pack

The first coordinated placeholder replacement pack is available under
`public/art-remaster/placeholder-v2/survival-pack/`:

- `prop_camp_cot_v2.png`;
- `prop_camp_crate_v2.png`;
- `prop_hive_resin_sac_v2.png`;
- `scatter_bolts_v2.png`;
- `scatter_cable_coil_v2.png`;
- `prop_camp_cookfire_lit_v2.png`;
- `prop_camp_cookfire_doused_v2.png`;
- `prop_camp_bedrolls_v2.png`.

These are versioned review assets and do not overwrite the live files yet.
They share one top-down three-quarter camera, worn bone-metal construction,
charcoal pressure materials, functional amber/cyan accents, and a restrained
violet living seam on the resin sac.

The first atlas split also exposed cross-cell fragments around the crate/cot
boundaries. The pack remains rejected for live routing until each prop is
generated or isolated separately; the contact sheet is for material-language
review only.

Review them together in
`public/art-remaster/placeholder-v2/survival-pack/contact-sheet.png`.

### Remaining queue order

1. survivor camp structures and grave/laundry set;
2. cave organism set;
3. floor scatter and liquid decals;
4. ship intact/broken/healed families;
5. effects that require animation rather than static repainting.

No review asset becomes live until its silhouette, scale, transparency,
collision read, and gameplay capture have been checked.
