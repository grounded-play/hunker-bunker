# Season 0: Economy Asset Generation & Full In-Game Wiring Plan

**Document ID:** `DOC-S0-09-PLAN`  
**Status:** Approved Implementation Plan  
**Target Completion:** Full 60-Item Season 0 Asset Coverage (Itemdefs 4100–4159)  
**Related Documents:**
- [`02-steam-vault-catalog-and-itemdefs.md`](02-steam-vault-catalog-and-itemdefs.md)
- [`04-battle-pass-and-progression-tiers.md`](04-battle-pass-and-progression-tiers.md)
- [`06-asset-production-and-prompt-manifest.md`](06-asset-production-and-prompt-manifest.md)
- [`08-asset-audit-and-gaps.md`](08-asset-audit-and-gaps.md)

---

## 1. Executive Summary & Objective

A comprehensive audit of the Season 0 / Deep Crust Protocol economy (`docs/season-zero-protocol/08-asset-audit-and-gaps.md`) reveals that while **23 of the 60 planned seasonal itemdefs** (`4100–4159`) are currently registered and compliant with production art, **37 itemdefs still lack production-ready artwork** and are therefore missing from the publishable Steam catalog, Steam Vault inventory grid, Battle Pass UI, and Armory Workbench. (`4154` landed since this plan was first drafted — see doc 08 §4 item 3, resolved as a real F2P-earned key distinct from `4001`, reusing its art.)

This plan details the end-to-end generation, conversion into standard 4-file compliance sets, registration in the Steam inventory schema, and full in-game wiring across all economy UI surfaces.

---

## 2. Current Asset & Catalog Status Matrix

| Category | Total Items | Live / Compliant Art | Missing / To Generate | Itemdef IDs To Complete |
| :--- | :--- | :--- | :--- | :--- |
| **A. Weapon Skins** | 12 | 5 (`4100, 4103, 4107, 4109, 4110`) | **7** | `4101, 4102, 4104, 4105, 4106, 4108, 4111` |
| **B. Chassis Armors** | 8 | 0 | **8** | `4112, 4113, 4114, 4115, 4116` (renamed "Bio-Synthesizer Harness", class-agnostic — see doc 08 §4 item 4), `4117, 4118, 4119` |
| **C. Player Decals & Insignia** | 10 | 1 (`4126`) | **9** | `4120, 4121, 4122, 4123, 4124, 4125, 4127, 4128, 4129` |
| **D. Tactical Weapon Charms** | 10 | 10 (`4130–4139`) | **0** (Complete!) | — |
| **E. Rig Overclock Modules** | 8 | 6 (`4140, 4141, 4142, 4143, 4144, 4147`) | **2** | `4145, 4146` |
| **F. Audio / HUD / VFX Mutators** | 6 | 0 | **6** | `4148, 4149, 4150, 4151, 4152, 4153` |
| **G. Crafting Reagents & Keys** | 6 | 1 (`4154`, resolved & registered — see above) | **5** | `4155, 4156, 4157, 4158, 4159` |
| **TOTAL** | **60** | **23** | **37 items** | **100% full Season 0 coverage** |

---

## 3. Asset Compliance Pipeline & Target Formats

Per `scripts/audit-steam-inventory-assets.js`, every registered itemdef must have exactly 4 validated image files on disk:
1. `public/economy/<slug>.png`: $256 \times 256$ RGBA PNG (square, colorType 6).
2. `public/economy/<slug>_large.png`: $512 \times 512$ RGBA PNG (square, colorType 6).
3. `steam/store/item_icons/<slug>_master.png`: $1254 \times 1254$ RGBA PNG (square, colorType 6).
4. `steam/store/item_icons/chroma/<slug>_chroma.png`: $1254 \times 1254$ PNG (square, monochrome silhouette).

---

## 4. Proposed Asset Generation & Production Batches

We will generate pure isolated assets via `generate_image` using the established Deep Crust Protocol prompt design language:

### Batch 1: Capstone Legendary & Priority Weapon Skins
1. **`skin_solar_flare_antimatter` (`Itemdef 4111` - Tier 50 Premium Capstone):**
   *Prompt:* `"High-end 3D game asset render of an ultra-legendary sci-fi sniper rifle floating in empty dark space. Polished white ceramic and pure gold filigree frame, exposed miniature sun plasma chamber radiating golden solar flares and light rays, holographic digital optics, clean isolated asset, studio lighting, octane render, 1:1 aspect ratio."`
2. **`skin_hazard_stripe_smg` (`Itemdef 4101`):** Industrial hazard yellow/black diagonal warning stripes on tactical SMG.
3. **`skin_tectonic_driller` (`Itemdef 4102`):** Heavy ribbed tungsten rotary shotgun with thermal vents.
4. **`skin_rust_bone_trench` (`Itemdef 4104`):** Weathered bunker carbine with bioluminescent bone inlays.
5. **`skin_obsidian_shard` (`Itemdef 4105`):** Polished volcanic black glass revolver with Damascus cylinder.
6. **`skin_biolume_spore_sprayer` (`Itemdef 4106`):** Heavy biomechanical sprayer with pulsing green fungal canisters.
7. **`skin_glitched_circuit_bolter` (`Itemdef 4108`):** Holographic error-coded circuit board emitter.

### Batch 2: Crafting Reagents, Currencies & Rig Overclocks
8. **`reagent_cryo_alloy_ingot` (`Itemdef 4156` - Core Battle Pass Reward):** Frost-coated metallic bismuth/titanium ingot stamped with bunker seal.
9. **`reagent_deep_core_shard` (`Itemdef 4159` - Token Currency):** Radiant cyan hexagonal crystal shard floating in space.
10. **`reagent_deep_sub_core_matrix` (`Itemdef 4157` - Epic Material):** Encased spherical fusion core with glowing magenta lattice.
11. **`reagent_refined_ambergris` (`Itemdef 4158` - Legendary Material):** Glowing golden biological catalyst resin in glass sphere.
12. **`reagent_relic_key_master_pack` (`Itemdef 4155` - 5x Bundle):** Military key case containing 5 glowing holographic keys.
13. **`mod_echo_location_transceiver` (`Itemdef 4145`):** Sonar antenna module with pulsing concentric cyan rings.
14. **`mod_symbiotic_adrenaline_pump` (`Itemdef 4146`):** Biomechanical bio-injector vial pulsing with crimson/amber fluid.

### Batch 3: Audio, HUD Themes & Weapon FX Mutators
15. **`voicepack_soviet_commander` (`Itemdef 4148`):** Military tactical radio headset with glowing vacuum tubes and Russian cyrillic markings.
16. **`voicepack_aura` (`Itemdef 4149`):** Sleek crystalline AI voice orb with cyan soundwave waveforms.
17. **`hudtheme_amber_crt` (`Itemdef 4150`):** Retro 1980s amber phosphor CRT terminal icon with scanlines.
18. **`hudtheme_emerald_radar` (`Itemdef 4151`):** Military night-vision emerald green radar display icon.
19. **`fx_emerald_void_tracer` (`Itemdef 4152`):** High-energy emerald green laser beam round tracer canister.
20. **`fx_cryo_shockwave_muzzle` (`Itemdef 4153`):** Cryogenic flash suppressor with bursting crystalline frost ring.

### Batch 4: Chassis Armors & Tactical Decals
21. **`chassis_hive_lord_symbiote` (`Itemdef 4119` - Tier 50 Legendary Chassis):** Chitinous alien bio-armor fused with heavy steel plating.
22. **`chassis_subterran_drill_engineer` (`Itemdef 4112`):** Heavy yellow industrial engineering suit with searchlight visor.
23. **`chassis_cryo_vanguard_scout` (`Itemdef 4113`):** Thermal white/cyan stealth exosuit with optic sensors.
24. **`chassis_trench_warden_heavy` (`Itemdef 4114`):** Riveted steel blast-shield heavy armor with gas respirator.
25. **`chassis_void_commando_recon` (`Itemdef 4115`):** Matte-black carbon nano-weave recon armor with violet HUD.
26. **`chassis_bio_synthesizer_medic` (`Itemdef 4116`):** Bio-injector harness suit with glowing fluid tubes.
27. **`chassis_dreadnought_exo_juggernaut` (`Itemdef 4117`):** Massive hydraulic power armor with magma furnace chest core.
28. **`chassis_cyber_spectre_infiltrator` (`Itemdef 4118`):** Holographic shimmer cybernetic stealth suit.
29. **`decal_subzero_pioneer` (`Itemdef 4120`):** Embroidered frost-mountain expedition patch.
30. **`decal_radiation_trefoil` (`Itemdef 4121`):** Fluorescent yellow/black hazard trefoil seal.
31. **`decal_sporesnail_hunter_crest` (`Itemdef 4122`):** Stylized iridescent snail shell crest.
32. **`decal_bunker404_lost_squad` (`Itemdef 4123`):** Subterranean surveyor squad memorial pin.
33. **`decal_cyber_skull_tactical_pin` (`Itemdef 4124`):** Holographic chrome skull pin with cyan oculars.
34. **`decal_cryo_phoenix` (`Itemdef 4125`):** Rising ice phoenix badge.
35. **`decal_void_horizon_sigil` (`Itemdef 4127`):** Distorted violet gravitational circle sigil.
36. **`decal_ancient_core_glyphs` (`Itemdef 4128`):** Alien stratum-zero hieroglyphic tablet.
37. **`decal_grand_marshal_relic_crest` (`Itemdef 4129`):** Solid gold crowned double-headed eagle emblem.

---

## 5. Technical Implementation Workflow

1. **Automated Conversion Pipeline (`scripts/process-season-assets.py`):**
   - Helper script using PIL and ImageMagick to take generated raw images and format them into the exact 4-file compliant set (`256px local`, `512px large`, `1254px master`, `1254px chroma`).
2. **Schema Update:**
   - Update `scripts/gen-season-schema-entries.py` to include all 60 itemdefs in `COMPLIANT_ITEMDEFS`.
   - Run `python3 scripts/gen-season-schema-entries.py` to splice all entries into `steam/inventory_schema_hunker_bunker.json`.
3. **Catalog Build & Test Synchronization:**
   - Run `node scripts/build-steam-item-catalog.js` to regenerate `src/data/steamItemCatalog.js`.
   - Update `scripts/build-steam-item-catalog.test.js` and `scripts/audit-steam-inventory-assets.test.js` to validate the full 71-item catalog ($11 \text{ base} + 60 \text{ season}$).
4. **Documentation Update:**
   - Update `docs/season-zero-protocol/08-asset-audit-and-gaps.md` and `docs/season-zero-protocol/02-steam-vault-catalog-and-itemdefs.md` to record 100% asset coverage and resolution of all gaps.

---

## 6. Verification Plan

### Automated Tests
- Run inventory asset audit:
  ```bash
  npx vitest run scripts/audit-steam-inventory-assets.test.js scripts/build-steam-item-catalog.test.js
  ```
- Run full unit test suite:
  ```bash
  npm test
  ```
- Run linting:
  ```bash
  npm run lint
  ```

### Manual UI Verification
- Verify that opening the Steam Vault (`steamVaultUi.js`) displays real icons for all claimed Battle Pass items.
- Verify Battle Pass reward tracks (`seasonPassUi.js`) show real artwork icons across all 50 tiers.
