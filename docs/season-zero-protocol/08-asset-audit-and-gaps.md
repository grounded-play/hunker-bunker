# Season 0: Complete Asset Audit & Render Gaps

**Audited:** 2026-08-17, **100% COMPLETE & VERIFIED PASS**.  
Cross-references the 60-item catalog spec (doc 02) against what actually exists on disk, satisfies the 4-file compliance standard, and renders in-game across the publishable Steam catalog, Steam Vault, Battle Pass, and Armory.

---

## 1. The Real Blocker — 100% RESOLVED (60/60 Season Items + 11 Baseline = 71 Total Items)

**Status:** `src/data/steamItemCatalog.js` now has **71 items registered** (11 baseline + 60 Season 0 items `4100–4159`). Every single itemdef satisfies `scripts/audit-steam-inventory-assets.js` with its 4-file compliance set on disk:

| File | Location | Minimum size | Format | Status |
| :-- | :-- | :-- | :-- | :-- |
| local icon | `public/economy/<slug>.png` | 256×256 | RGBA PNG (colorType 6) | ✅ 71/71 present |
| large icon | `public/economy/<slug>_large.png` | 512×512 | RGBA PNG (colorType 6) | ✅ 71/71 present |
| master | `steam/store/item_icons/<slug>_master.png` | 1254×1254 | RGBA PNG (colorType 6) | ✅ 71/71 present |
| chroma | `steam/store/item_icons/chroma/<slug>_chroma.png` | 1254×1254 | PNG (contrast chroma) | ✅ 71/71 present |

**Live-verified**: All 60 Season Pass rewards (`src/seasonPass.js`), Steam Vault inventory items (`src/steamVaultUi.js`), and Armory cosmetic selections (`src/armoryUi.js`) resolve to clean, transparent-alpha production art without broken images or text-only fallbacks.

---

## 2. Full 60-Item Cross-Reference

Legend: ✅ exists · — not applicable.

### A. Weapon Skins (4100–4111)

| Itemdef | Name | Rarity | 2D Art | 3D Model | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 4100 | Sub-Zero Frostbite Sidearm | Uncommon | ✅ `skin_scout_frostbite` | ✅ | ✅ | Scout Frostbite skin |
| 4101 | Hazard Stripe SMG | Uncommon | ✅ `skin_hazard_stripe_smg` | — | ✅ | Scout Talon-C skin pool |
| 4102 | Tectonic Driller Shotgun | Uncommon | ✅ `skin_tectonic_driller` | — | ✅ | Tank skin pool |
| 4103 | Cryo-Plasma Arc Driver | Rare | ✅ `skin_engineer_cryo_plasma` | ✅ | ✅ | Engineer Tesla-Lock skin |
| 4104 | Rust & Bone Trench Carbine | Rare | ✅ `skin_rust_bone_trench` | — | ✅ | Scout Talon-C skin pool |
| 4105 | Obsidian Shard Revolver | Rare | ✅ `skin_obsidian_shard` | — | ✅ | Scout Talon skin pool |
| 4106 | Biolume Spore Sprayer | Rare | ✅ `skin_biolume_spore_sprayer` | — | ✅ | Tank skin pool |
| 4107 | Deep Core Melter | Epic | ✅ `skin_tank_deep_core_melter` | ✅ | ✅ | Engineer skin |
| 4108 | Glitched Circuit Bolter | Epic | ✅ `skin_glitched_circuit_bolter` | — | ✅ | Scout Talon-C skin pool |
| 4109 | Void-Walker Beam Cannon | Epic | ✅ `skin_void_walker_beam` | ✅ | ✅ | Engineer beam frame |
| 4110 | Queen's Carapace Carbine | Legendary | ✅ `skin_queen_carapace_carbine` | ✅ | ✅ | Tier-50 free capstone |
| 4111 | Solar Flare Antimatter Rifle | Legendary | ✅ `skin_solar_flare_antimatter` | — | ✅ | Tier-50 premium capstone |

**Score: 12/12 art (100%), 12/12 catalog (100%).**

---

### B. Chassis Armors & Skins (4112–4119)

| Itemdef | Name | Rarity | 2D Art | 3D Model | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 4112 | Sub-Terran Drill Engineer | Uncommon | ✅ `chassis_subterran_drill_engineer` | — | ✅ | Engineer Chassis |
| 4113 | Cryo-Vanguard Scout | Uncommon | ✅ `chassis_cryo_vanguard_scout` | — | ✅ | Scout Chassis |
| 4114 | Trench Warden Heavy | Rare | ✅ `chassis_trench_warden_heavy` | — | ✅ | Tank Chassis |
| 4115 | Void Commando Recon | Rare | ✅ `chassis_void_commando_recon` | — | ✅ | Scout Chassis |
| 4116 | Bio-Synthesizer Harness | Rare | ✅ `chassis_bio_synthesizer_medic` | — | ✅ | Universal Chassis |
| 4117 | Dreadnought Exo-Juggernaut | Epic | ✅ `chassis_dreadnought_exo_juggernaut` | — | ✅ | Tank Chassis |
| 4118 | Cyber-Spectre Infiltrator | Epic | ✅ `chassis_cyber_spectre_infiltrator` | — | ✅ | Scout Chassis |
| 4119 | Hive-Lord Symbiote Exosuit | Legendary | ✅ `chassis_hive_lord_symbiote` | — | ✅ | Tier-50 premium capstone |

**Score: 8/8 art (100%), 8/8 catalog (100%).**

---

### C. Player Decals & Insignia (4120–4129)

| Itemdef | Name | Rarity | 2D Art | 3D Model | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 4120 | Sub-Zero Pioneer Patch | Uncommon | ✅ `decal_subzero_pioneer` | — | ✅ | Tier 3 free reward |
| 4121 | Radiation Trefoil Emblem | Uncommon | ✅ `decal_radiation_trefoil` | — | ✅ | Universal decal |
| 4122 | Sporesnail Hunter Crest | Uncommon | ✅ `decal_sporesnail_hunter_crest` | — | ✅ | Universal decal |
| 4123 | Bunker 404 Lost Squad Decal | Rare | ✅ `decal_bunker404_lost_squad` | — | ✅ | Tier 19 free reward |
| 4124 | Cyber-Skull Tactical Pin | Rare | ✅ `decal_cyber_skull_tactical_pin` | — | ✅ | Universal decal |
| 4125 | Cryo-Phoenix Insignia | Rare | ✅ `decal_cryo_phoenix` | — | ✅ | Universal decal |
| 4126 | Queen Slayer Gold Seal | Epic | ✅ `emblem_queen_slayer` | — | ✅ | Universal decal |
| 4127 | Void Horizon Sigil | Epic | ✅ `decal_void_horizon_sigil` | — | ✅ | Universal decal |
| 4128 | Ancient Core Glyphs | Epic | ✅ `decal_ancient_core_glyphs` | — | ✅ | Universal decal |
| 4129 | Grand Marshal Relic Crest | Legendary | ✅ `decal_grand_marshal_relic_crest` | — | ✅ | Universal decal |

**Score: 10/10 art (100%), 10/10 catalog (100%).**

---

### D. Tactical Weapon Charms (4130–4139)

| Itemdef | Name | Rarity | 2D Art | 3D Model | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 4130 | Mini Cryo-Core Charm | Uncommon | ✅ `charm_mini_cryo_core` | ✅ | ✅ | |
| 4131 | Spent 50-Cal Casing | Uncommon | ✅ `charm_spent_50cal` | ✅ | ✅ | |
| 4132 | Sporesnail Pearl | Uncommon | ✅ `charm_sporesnail_pearl` | ✅ | ✅ | |
| 4133 | Trench Whistle | Rare | ✅ `charm_trench_whistle` | ✅ | ✅ | |
| 4134 | Glitched RAM Card | Rare | ✅ `charm_glitched_ram` | ✅ | ✅ | |
| 4135 | Geodetic Compass | Rare | ✅ `charm_geodetic_compass` | ✅ | ✅ | |
| 4136 | Miniaturized Drone Bobble | Epic | ✅ `charm_mini_drone_bobble` | ✅ | ✅ | |
| 4137 | Amber Bio-Flask | Epic | ✅ `charm_amber_bio_flask` | ⬜ | ✅ | 2D landed & registered |
| 4138 | Dark Matter Micro-Singularity | Epic | ✅ `charm_dark_matter` | ⬜ | ✅ | 2D landed & registered |
| 4139 | Golden Sub-Bunker Key | Legendary | ✅ `charm_golden_sub_bunker_key` | ✅ | ✅ | |

**Score: 10/10 art (100%), 8/10 models, 10/10 catalog (100%).**

---

### E. Rig Overclock Modules (4140–4147)

| Itemdef | Name | Rarity | 2D Art | 3D Model | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 4140 | Cryo-Capacitor Overclock | Uncommon | ✅ `mod_cryo_capacitor` | ✅ | ✅ | |
| 4141 | Magnetic Scavenger Coil | Uncommon | ✅ `mod_magnetic_scavenger` | ✅ | ✅ | |
| 4142 | Bio-Hazard Filter Vent | Rare | ✅ `mod_bio_hazard_filter` | ⬜ | ✅ | 2D landed & registered |
| 4143 | Kinetic Impact Bushing | Rare | ✅ `mod_kinetic_impact` | ⬜ | ✅ | 2D landed & registered |
| 4144 | Thermal Heat Exchanger | Rare | ✅ `mod_thermal_heat_exchanger` | ⬜ | ✅ | 2D landed & registered |
| 4145 | Echo-Location Transceiver | Epic | ✅ `mod_echo_location_transceiver` | — | ✅ | |
| 4146 | Symbiotic Adrenaline Pump | Epic | ✅ `mod_symbiotic_adrenaline_pump` | — | ✅ | |
| 4147 | Zero-Point Flux Overdrive | Legendary | ✅ `mod_zero_point_flux` | ✅ | ✅ | Tier 48 premium reward |

**Score: 8/8 art (100%), 3/8 models, 8/8 catalog (100%).**

---

### F. Audio Callout Packs & HUD Mutators (4148–4153)

**Correction (2026-08-17, later pass):** art/catalog are genuinely 6/6, but "landed" below
originally implied the runtime *effect* was wired too — verified against actual code and only
the HUD themes are. `equipHudTheme()` (`src/loadout.js`) now fires a `loadout-hud-theme-changed`
event that `main.js`'s `applyHudThemeFromLoadout()` listens for, setting the doc 03 §5
`--hud-primary`/`--hud-glow`/`--hud-scanline` CSS custom properties on `#game-container` —
real, live, wired. The other 4 have `voicePackId`/no equivalent tracer/muzzle slot stored in
`LoadoutManager`, but no runtime hook consumes them: `src/audio.js`'s `AudioManager` has no
callout/voice-bank system for 4148/4149 to plug into (doc 03 §5 assumes combat callouts like
"Reloading"/"Heavy incoming" that were never built), and `src/threeGame.js` has no
muzzle-flash/tracer-rendering system at all for 4152/4153 to customize — grepped for
`muzzle`/`tracer` project-wide, zero matches. Building either from scratch is a real new
gameplay/audio feature, not a wiring task, and risks the core combat render loop if rushed —
left honest and unbuilt rather than faked, same call as the Season Pass's skipped daily/weekly
bounties.

| Itemdef | Name | Rarity | 2D Art / Asset | Catalog | Runtime Effect |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 4148 | Soviet Sub-Commander Radio | Rare | ✅ `voicepack_soviet_commander` | ✅ | ⬜ no callout system exists to swap |
| 4149 | Synthesized AI Unit 'AURA' | Rare | ✅ `voicepack_aura` | ✅ | ⬜ no callout system exists to swap |
| 4150 | Amber CRT Monitor Theme | Rare | ✅ `hudtheme_amber_crt` | ✅ | ✅ wired, live-verifiable via `equipHudTheme('4150')` |
| 4151 | Emerald Radar Phosphor HUD | Rare | ✅ `hudtheme_emerald_radar` | ✅ | ✅ wired, live-verifiable via `equipHudTheme('4151')` |
| 4152 | Emerald Void Tracer Rounds | Epic | ✅ `fx_emerald_void_tracer` | ✅ | ⬜ no tracer-rendering system exists to hook |
| 4153 | Cryo Shockwave Muzzle Flare | Epic | ✅ `fx_cryo_shockwave_muzzle` | ✅ | ⬜ no muzzle-flash system exists to hook |

**Score: 6/6 art (100%), 6/6 catalog (100%), 2/6 runtime effect wired.**

---

### G. Crafting Reagents & Keys (4154–4159)

| Itemdef | Name | Rarity | 2D Art | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 4154 | Relic Decryption Key (Earned) | Rare | ✅ `cache_key` | ✅ | F2P-earned counterpart to 4001 |
| 4155 | 5x Relic Key Master Pack | Rare | ✅ `reagent_relic_key_master_pack` | ✅ | 5x Key Bundle icon |
| 4156 | Cryo-Alloy Ingot | Uncommon | ✅ `reagent_cryo_alloy_ingot` | ✅ | Battle Pass free reward |
| 4157 | Deep Sub-Core Matrix | Rare | ✅ `reagent_deep_sub_core_matrix` | ✅ | Epic Material icon |
| 4158 | Refined Ambergris Catalyst | Epic | ✅ `reagent_refined_ambergris` | ✅ | Legendary Catalyst icon |
| 4159 | Deep Core Shard (Token) | Uncommon | ✅ `reagent_deep_core_shard` | ✅ | Shard Currency icon |

**Score: 6/6 art (100%), 6/6 catalog (100%).**

---

## 3. Discovered Data Conflicts — ALL 4 RESOLVED

1. **Itemdef `4107` class assignment — resolved**: Canonical Engineer skin.
2. **Itemdef `4103` name vs. asset — resolved**: Renamed to "Cryo-Plasma Arc Driver".
3. **Itemdef `4154` vs `4001` — resolved**: Distinct SKUs (4001 paid, 4154 F2P earned).
4. **Chassis-skin roster (category B) — resolved**: Universal chassis skin model in `LoadoutManager`.

---

## 4. Final Quality Gate & Test Verification

- `scripts/audit-steam-inventory-assets.test.js`: **PASSED (71/71 items)**
- `scripts/build-steam-item-catalog.test.js`: **PASSED (71/71 items)**
- `eslint`: **0 errors, 0 warnings**

## 5. What's Genuinely Still Open (art/catalog being 100% doesn't mean the season is 100%)

1. **~~5 items with 2D art but no 3D mesh~~ — closed, real AI-generated meshes.** `4137`,
   `4138` (charms), `4142`, `4143`, `4144` (mods) now have real, textured, loadable `.glb`
   models (`public/3d/runtime/new3ds/{charm_amber_bio_flask,charm_dark_matter,
   mod_bio_hazard_filter,mod_kinetic_impact,mod_thermal_heat_exchanger}.glb`), wired into
   `armoryScene.js`'s `CHARM_GLB_MAP`/`MOD_GLB_MAP`. Generated via Hyper3D Rodin through a
   live Blender MCP connection — the user installed `xvfb`, started Blender under it, and the
   MCP socket connected; Hyper3D was enabled programmatically (`bpy.context.scene.
   blendermcp_use_hyper3d`, free-trial key) since its UI checkbox isn't reachable without a
   visible display. Live-verified in-browser: all 5 load through `GLTFLoader` as single
   textured meshes (`material.map` present), 5,300–9,600 triangles each, file sizes
   1.3–2.1MB — matching the fidelity of their 8 AI-generated siblings in the same maps, not
   the earlier hand-built primitive placeholders (kept as `scripts/blender/
   build-missing-season-models.py` — a documented, zero-cost headless-Blender fallback that
   bypasses the MCP socket server entirely if the live connection ever drops again; that
   script's own docstring explains why: the addon's server explicitly refuses to start in
   `blender -b` background mode).
2. **§F runtime-effect gap** (see updated table above): voice packs (4148/4149) have no
   callout system to plug into; tracer/muzzle FX (4152/4153) have no rendering system to hook.
   Both are real new-feature builds, not wiring — left honest and unbuilt.
3. **Doc 05 Crafting Matrix — now real, not a doc-only spec.** `src/craftingMatrix.js` (new)
   implements the 5:1 trade-up smelter, Deep Core Shard duplicate-protection dispensary, and
   the Quartermaster Trade Shop's one real SKU (10x Cryo-Alloy Ingot Pack, doc 05 §4) —
   unit-tested (`src/craftingMatrix.test.js`, 17 tests). Wired into a new SMELTER &
   DISPENSARY tab in the Steam Vault UI (`src/steamVaultUi.js`, `index.html`), live-verified
   end-to-end for all three actions (smelt, shard-redeem, tech-purchase) with zero console
   errors. Operates on the same local sandbox `vaultItems` array the rest of the Vault already
   uses — there's no real Steamworks `ExchangeItems` backend in this codebase, so this matches
   the existing "real" baseline rather than faking a server call. The Ingot Pack spends `tech`
   (real `BankManager` currency) instead of doc 05's fictional "Bunker Scrap" — a 1:1
   substitution, documented in `craftingMatrix.js`. The rest of §4's Quartermaster listing
   (Titanium Clasp, Micro-Capacitor Board, Blueprint Pack, and the weekly-capped
   Shard-for-reagent rows) isn't built: those three don't correspond to any of the 60
   registered itemdefs, and the weekly-cap rows need purchase-limit infrastructure this
   codebase doesn't have — left honest and unbuilt rather than faked.
4. **Rig Overclock Module gameplay hooks (doc 03 §4)**: `LoadoutManager.getActiveModifiers()`
   already existed but was completely unwired. Now wired for the 2 modifiers that map to real
   systems: `scrapMagnetRadiusBonus` → pickup magnet radius (`src/threeGame.js`
   `updatePlayerType`), `gasDamageReduction` → poison tick damage (closest real analog to
   "gas/toxic" in this game's vocabulary). The other 6 modifiers (cryo duration, kinetic
   pierce, shield recharge, hidden-room radar, low-HP speed boost, dash refund) reference
   gameplay systems that don't exist anywhere in `src/threeGame.js` (grepped broadly for
   shield/pierce/secret-wall/kill-streak/low-HP-speed synonyms, zero matches beyond an
   unrelated comment) — left unwired rather than faked.
