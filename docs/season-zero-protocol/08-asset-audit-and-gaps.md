# Season 0: Complete Asset Audit & Render Gaps

**Audited:** 2026-08-17. Cross-references the 60-item catalog spec (doc 02) against what
actually exists on disk and what actually renders in-game, file by file — not doc-to-doc.
Verify against current disk state before trusting this if it's been more than a few days;
this session had multiple agents landing new assets every few minutes.

---

## 1. The Real Blocker (read this before anything else)

**Every asset audit below is secondary to this:** `src/data/steamItemCatalog.js` is the
*generated* catalog `src/steamVaultUi.js`'s inventory grid actually reads from
(`renderInventoryGrid()`, `if (!catalog) return;` — silently skips any item whose
`itemdefid` isn't registered there). As of this audit, it contains **11 items total**, and
of those, only `4000`/`4001` (Deep Relic Cache / Key) fall in the season range. **Zero of
the 60 itemdefs 4100-4159 are registered**, regardless of whether their art/models exist.

This means: even a fully-arted, fully-modeled, fully-animated item is currently invisible
in the Steam Vault's inventory browser. It can still work everywhere else — the Armory
(`src/armoryUi.js`/`armoryScene.js`) and the Season Pass (`src/seasonPassUi.js`) both use
their *own* local itemdef→asset maps that don't depend on this file — but the player-facing
"here's what you own" screen won't show it. Fixing this is a **content-authoring task**
(each entry needs a real Steam-schema shape: `name`, `rarity`, `desc`, `tradable`,
`marketable`, `img`/`localImg`/`localImgLarge` hosted URLs — see any existing `4000`-series
entry for the shape), driven by `scripts/build-steam-item-catalog.js` from "the publishable
Steam schema" per that generated file's own header comment. Not something to hand-edit.

**Practical effect on prioritization below:** don't chase 3D models for items that aren't
even catalog-registered yet — registration unlocks visibility for everything at once and
should happen before or alongside the remaining art/model work, not after.

---

## 2. Full 60-Item Cross-Reference

Legend: ✅ exists · ⬜ missing · — not applicable for this category.
"2D Art" = a real key-art PNG in `public/economy/` (not just referenced in a doc).
"3D Model" = a real `.glb` in `public/3d/runtime/new3ds/`.
"Catalog" = registered in `src/data/steamItemCatalog.js` (see §1 — currently always ⬜ for this range).

### A. Weapon Skins (4100–4111)

| Itemdef | Name | Rarity | 2D Art | 3D Model | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 4100 | Sub-Zero Frostbite Sidearm | Uncommon | ✅ `skin_scout_frostbite` | ✅ | ⬜ | |
| 4101 | Hazard Stripe SMG | Uncommon | ⬜ | ⬜ | ⬜ | Scout Talon-C skin pool (doc 07 §4) |
| 4102 | Tectonic Driller Shotgun | Uncommon | ⬜ | ⬜ | ⬜ | Tank skin pool |
| 4103 | Cryo-Plasma Railgun | Rare | ✅ `skin_engineer_cryo_plasma` | ✅ | ⬜ | Name/asset mismatch — art is Engineer's Tesla-Lock skin, not a railgun; see §4 |
| 4104 | Rust & Bone Trench Carbine | Rare | ⬜ | ⬜ | ⬜ | Scout Talon-C skin pool |
| 4105 | Obsidian Shard Revolver | Rare | ⬜ | ⬜ | ⬜ | Scout Talon skin pool |
| 4106 | Biolume Spore Sprayer | Rare | ⬜ | ⬜ | ⬜ | Tank skin pool |
| 4107 | Deep Core Melter | Epic | ✅ `skin_tank_deep_core_melter` | ✅ | ⬜ | Name/class mismatch — `loadout.js` assigns this to Engineer, filename says tank; see §4 |
| 4108 | Glitched Circuit Bolter | Epic | ⬜ | ⬜ | ⬜ | Scout Talon-C skin pool |
| 4109 | Void-Walker Beam Cannon | Epic | ✅ `skin_void_walker_beam` | ✅ | ⬜ | |
| 4110 | Queen's Carapace Carbine | Legendary | ✅ `skin_queen_carapace_carbine` | ✅ | ⬜ | Tier-50 free capstone (doc 04) |
| 4111 | Solar Flare Antimatter Rifle | Legendary | ⬜ | ⬜ | ⬜ | Tier-50 premium capstone (doc 04) — **highest-visibility gap in this category** |

**Score: 5/12 art, 5/12 models, 0/12 catalog.**

### B. Chassis Armors & Skins (4112–4119)

| Itemdef | Name | Rarity | 2D Art | 3D Model | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 4112 | Sub-Terran Drill Engineer | Uncommon | ⬜ | ⬜ | ⬜ | |
| 4113 | Cryo-Vanguard Scout | Uncommon | ⬜ | ⬜ | ⬜ | |
| 4114 | Trench Warden Heavy | Rare | ⬜ | ⬜ | ⬜ | |
| 4115 | Void Commando Recon | Rare | ⬜ | ⬜ | ⬜ | |
| 4116 | Bio-Synthesizer Medic | Rare | ⬜ | ⬜ | ⬜ | No "Medic" class ships (doc07 §1 roster lock) — reassign or drop |
| 4117 | Dreadnought Exo-Juggernaut | Epic | ⬜ | ⬜ | ⬜ | |
| 4118 | Cyber-Spectre Infiltrator | Epic | ⬜ | ⬜ | ⬜ | |
| 4119 | Hive-Lord Symbiote Exosuit | Legendary | ⬜ | ⬜ | ⬜ | Tier-50 premium capstone (doc 04) |

**Score: 0/8 art, 0/8 models, 0/8 catalog — the single most complete gap in the whole catalog.**
Nothing in this category exists anywhere. Note this is a *full-suit reskin* concept, which per
`docs/superpowers/specs/2026-07-26-cosmetics-and-loadout-system-design.md` needs the Scout
chassis pipeline's texture-swap contract before it can render at all even once art exists —
larger lift than any other category here.

### C. Player Decals & Insignia (4120–4129)

| Itemdef | Name | Rarity | 2D Art | 3D Model | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 4120 | Sub-Zero Pioneer Patch | Uncommon | ⬜ | — | ⬜ | Tier 3 free reward (doc 04) |
| 4121 | Radiation Trefoil Emblem | Uncommon | ⬜ | — | ⬜ | |
| 4122 | Sporesnail Hunter Crest | Uncommon | ⬜ | — | ⬜ | |
| 4123 | Bunker 404 Lost Squad Decal | Rare | ⬜ | — | ⬜ | Tier 19 free reward (doc 04) |
| 4124 | Cyber-Skull Tactical Pin | Rare | ⬜ | — | ⬜ | |
| 4125 | Cryo-Phoenix Insignia | Rare | ⬜ | — | ⬜ | |
| 4126 | Queen Slayer Gold Seal | Epic | ✅ `emblem_queen_slayer` | — | ⬜ | Only decal with art |
| 4127 | Void Horizon Sigil | Epic | ⬜ | — | ⬜ | |
| 4128 | Ancient Core Glyphs | Epic | ⬜ | — | ⬜ | |
| 4129 | Grand Marshal Relic Crest | Legendary | ⬜ | — | ⬜ | |

**Score: 1/10 art (decals are flat UV-composited badges, no 3D model needed — see doc 03 §2's
`ChassisSocket_Patch_L/R` UV-region contract), 0/10 catalog.**

### D. Tactical Weapon Charms (4130–4139)

| Itemdef | Name | Rarity | 2D Art | 3D Model | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 4130 | Mini Cryo-Core Charm | Uncommon | ✅ | ✅ | ⬜ | |
| 4131 | Spent 50-Cal Casing | Uncommon | ✅ | ✅ | ⬜ | |
| 4132 | Sporesnail Pearl | Uncommon | ✅ | ✅ | ⬜ | |
| 4133 | Trench Whistle | Rare | ✅ | ✅ | ⬜ | |
| 4134 | Glitched RAM Card | Rare | ✅ | ✅ | ⬜ | |
| 4135 | Geodetic Compass | Rare | ✅ | ✅ | ⬜ | |
| 4136 | Miniaturized Drone Bobble | Epic | ✅ | ✅ | ⬜ | |
| 4137 | Amber Bio-Flask | Epic | ✅ | ⬜ | ⬜ | 2D landed, 3D not yet converted |
| 4138 | Dark Matter Micro-Singularity | Epic | ✅ | ⬜ | ⬜ | 2D landed, 3D not yet converted |
| 4139 | Golden Sub-Bunker Key | Legendary | ✅ | ✅ | ⬜ | |

**Score: 10/10 art (only fully-complete art category in the whole catalog), 8/10 models,
0/10 catalog. Closest category to done — just needs 4137/4138's 2D→3D conversion pass
(same pipeline already used for the other 8) and catalog registration.**

### E. Rig Overclock Modules (4140–4147)

| Itemdef | Name | Rarity | 2D Art | 3D Model | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 4140 | Cryo-Capacitor Overclock | Uncommon | ✅ | ✅ | ⬜ | |
| 4141 | Magnetic Scavenger Coil | Uncommon | ✅ | ✅ | ⬜ | |
| 4142 | Bio-Hazard Filter Vent | Rare | ✅ | ⬜ | ⬜ | 2D landed, 3D not yet converted |
| 4143 | Kinetic Impact Bushing | Rare | ✅ | ⬜ | ⬜ | 2D landed, 3D not yet converted |
| 4144 | Thermal Heat Exchanger | Rare | ✅ | ⬜ | ⬜ | 2D landed, 3D not yet converted |
| 4145 | Echo-Location Transceiver | Epic | ⬜ | ⬜ | ⬜ | |
| 4146 | Symbiotic Adrenaline Pump | Epic | ⬜ | ⬜ | ⬜ | |
| 4147 | Zero-Point Flux Overdrive | Legendary | ✅ | ✅ | ⬜ | Tier 48 premium reward (doc 04) |

**Score: 6/8 art, 3/8 models, 0/8 catalog.**

### F. Audio Callout Packs & HUD Mutators (4148–4153)

| Itemdef | Name | Rarity | Asset | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 4148 | Soviet Sub-Commander Radio | Rare | ✅ `voice_commander_breached.wav` | ⬜ | Audio landed; needs more than 1 line for a full "pack" per doc 01's benchmark framing |
| 4149 | Synthesized AI Unit 'AURA' | Rare | ✅ `voice_aura_target_down.wav` | ⬜ | Same — 1 line landed, not a full pack |
| 4150 | Amber CRT Monitor Theme | Rare | — (CSS-only) | ⬜ | Exact custom-property values already spec'd in doc 03 §5 ("Amber CRT Mutators") — this is a code/CSS task, not an asset gap |
| 4151 | Emerald Radar Phosphor HUD | Rare | — (CSS-only) | ⬜ | Same, doc 03 §5 already has the values |
| 4152 | Emerald Void Tracer Rounds | Epic | ⬜ | ⬜ | Projectile/particle shader work, not a static image — verify against `src/threeGame.js`'s `spawnProjectile()` color logic before treating as "missing art" |
| 4153 | Cryo Shockwave Muzzle Flare | Epic | ⬜ | ⬜ | Same — VFX/shader task |

**This category isn't really "asset production" for 4150-4153 — it's implementation work
against specs that already exist. Only 4148/4149 (audio) are asset-production gaps, and
those are partially landed (one line each; doc 01's "callout pack" framing implies more).**

### G. Crafting Reagents & Keys (4154–4159)

| Itemdef | Name | Rarity | 2D Art | Catalog | Notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 4154 | Relic Decryption Key | Rare | ⬜ | ⬜ | **Naming collision**: itemdef `4001` ("key") already exists, registered, and has art (`cache_key.png`) for the exact same cache-opening concept. Reconcile before building `4154` as a separate item — likely doc 02 duplicating what already shipped under a different id, not a real second item. |
| 4155 | 5x Relic Key Master Pack | Rare | ⬜ | ⬜ | Bundle SKU, may not need its own key art if it's just "5x" of 4154/4001 |
| 4156 | Cryo-Alloy Ingot | Uncommon | ⬜ | ⬜ | Used as a Season Pass free-track reward (`src/seasonPass.js`) — currently displays as text-only, no icon |
| 4157 | Deep Sub-Core Matrix | Rare | ⬜ | ⬜ | |
| 4158 | Refined Ambergris Catalyst | Epic | ⬜ | ⬜ | |
| 4159 | Deep Core Shard (Token) | Uncommon | ⬜ | ⬜ | Used as a Season Pass free-track reward — same text-only gap as 4156 |

**Score: 0/6 art, 0/6 catalog, plus one likely-duplicate item (4154 vs. existing 4001).**

---

## 3. Non-Itemdef Assets (staging/environment, not tied to a Steam SKU)

| Asset | Status | Notes |
| :-- | :-- | :-- |
| Scout/Tank/Engineer base guns (Vector-9 Talon, Siege-Breaker 50, Tesla-Lock MK-IV) | ✅ 2D + 3D done | See `docs/armory-and-class-weapons-worklog.md` task 2 |
| Scout's Talon-C Carbine (secondary archetype) | 2D ✅ (`gun_scout_talon_c`), **3D ⬜** | Only remaining base-weapon 3D gap; 2D key art already exists, just needs the 2D→3D conversion pass |
| Armory workbench/staging-room environment geometry | ✅ built directly in Three.js primitives | `src/armoryScene.js` — floor/walls/rack/platform are procedural, not authored `.glb`s; not a gap |
| Class exosuit T-pose character models (doc 06 §5D) | ⬜ not found on disk | Referenced in doc 06 as a planned batch (`char_scout_exosuit.glb` etc.) — distinct from the already-shipped rigged Mixamo bodies (`Scout.game.glb`, `tank-rigged.glb`, `engineer-rigged-gestures.glb`); unclear if still needed given the rigged bodies already work, flag for a scope decision rather than treating as a hard gap |
| Sfx: overclock socket/hum, charm clink, smelt, shard dispense | ✅ all landed | `public/audio/generated/` — matches doc 03/05's SFX needs for Armory + crafting interactions |

---

## 4. Discovered Data Conflicts (fix before doing more art)

These aren't asset gaps — they're inconsistencies between docs and/or between docs and code
that will make correctly-produced art *look* wrong once it's wired in. Cheaper to resolve now
than after more assets land on top of them.

1. **Itemdef `4107` class assignment**: doc 02/04 describe it generically; the actual
   generated asset is named `skin_tank_deep_core_melter` (implies Tank), but
   `src/loadout.js`'s `ARCHETYPE_SKINS.tesla_lock` includes `'4107'` — the *functional code*
   assigns it to Engineer. Filename and code disagree. (First flagged in
   `docs/armory-and-class-weapons-worklog.md` task 6 — still unresolved.)
2. **Itemdef `4103` name vs. asset**: doc 02 calls it "Cryo-Plasma Railgun," but the actual
   art/model (`skin_engineer_cryo_plasma`) and `loadout.js`'s archetype mapping both treat it
   as Engineer's Tesla-Lock Arc Driver skin, not a railgun. The *name* in doc 02 is stale
   relative to what actually shipped as the Engineer's base archetype (doc 07 §4 renamed the
   archetype family after doc 02 was written).
3. **Itemdef `4154` vs `4001`**: two different ids for what reads as the same "cache key"
   concept — one already shipped and registered, one only in the doc 02 plan. Decide whether
   `4154` is meant to be a *distinct* item (e.g., a season-exclusive key with different flavor)
   or whether doc 02 should be corrected to just reference `4001`.
4. **Chassis-skin roster (category B)**: itemdef `4116` "Bio-Synthesizer Medic" assumes a
   Medic class that was never shipped (doc 07 §1 already locked the roster to Scout/Tank/
   Engineer for weapons — this document's category B was written before that lock and never
   updated to match).

---

## 5. Priority Order (highest-leverage next steps)

1. **Register itemdefs 4100-4159 in the real Steam catalog** (§1). Nothing else in this audit
   becomes player-visible in the Vault until this happens — it's a one-time, high-leverage
   unblock, not per-item busywork exactly, but it does need real hosted icon URLs per entry,
   which is why it's listed after nothing rather than done already.
2. **Finish charm category D** (§2.D) — 2 items short of 100% art, 8 items short of 100% 3D
   conversion of already-landed art. This is the cheapest remaining category to close out.
3. **Fix the 3 discovered conflicts** (§4) before producing more Tank/Engineer skin art, so
   new assets land with correct naming instead of inheriting the same drift.
4. **4111 Solar Flare Antimatter Rifle** — the single highest-visibility individual gap
   (Tier-50 premium capstone reward, currently has zero art or model).
5. Everything else in priority-by-category order: mods (E) → weapon skins (A, the 7 pool
   skins) → decals (C) → chassis armors (B, biggest lift, lowest urgency since no UI surfaces
   it yet).

---

*Cross-referenced against: `docs/season-zero-protocol/02-steam-vault-catalog-and-itemdefs.md`
(spec), `public/economy/` (2D), `public/3d/runtime/new3ds/` (3D), `public/audio/generated/`
(audio), `src/data/steamItemCatalog.js` (real catalog registration), `src/armoryUi.js`
(Armory's local display catalog), `src/loadout.js` (functional archetype/skin assignment),
`docs/3d-asset-coverage.md` (existing 3D tracking doc — extend that one for future
non-itemdef world/prop assets; this doc owns the itemdef-catalog side specifically).*
