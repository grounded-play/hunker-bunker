# Cosmetics & Loadout System — Lane Split (Codex / Gemini / Claude)

Date: 2026-07-26.

Implements `docs/superpowers/specs/2026-07-26-cosmetics-and-loadout-system-design.md`
(read that first). Extends, rather than replaces,
`docs/player-chassis-vertical-slice-lane-split.md` — that doc's Codex/Gemini/
Claude assignments for the Scout chassis are unchanged and still apply; this
doc adds the cosmetics/loadout/weapon work on top, following the same
`docs/sprint-19-wave*-lane-split.md` file-ownership convention.

## What's not assignable to any agent

- Same as the chassis lane-split doc: final visual/creative approval is the
  project owner's call, not any lane's self-certification.
- Whether the flat-material weapon "looks right" without any reference
  photo to check against is a subjective call more than usual here, since
  Sub-project 3 has no existing art to match — flag it for review rather
  than iterating alone to a personal satisfaction bar.

## Sequencing (this matters more than in the chassis-only doc)

Sub-project 1 (data model) is small and has no rendering dependency —
it should land **first**, before the other three lanes need it:

1. **Land Sub-project 1 first** (data model + loadout state). Small,
   foundational, testable in complete isolation from rendering.
2. **Then, in parallel:** Sub-project 2 (player skin) and Sub-project 3
   (weapon render + skin) — different files, only sharing Sub-project 1's
   already-landed contract.
3. **Sub-project 4 (loadout UI)** can start as soon as 1 lands, using
   catalog data directly; it doesn't need 2 or 3's rendering to exist to
   build the equip/unequip list, only to eventually show a live preview
   (explicitly deferred per the design doc).
4. The Scout chassis work from the prior lane-split doc is a prerequisite
   for Sub-project 2 specifically (skin rendering has nothing to render
   onto without it) — if that work hasn't landed yet, Sub-project 2 waits;
   Sub-projects 1, 3, and 4 do not need it.

## Codex lane — asset pipelines

Unchanged from the prior doc for the Scout chassis; **adds** the weapon
model as a second, parallel asset-pipeline task, plus the chassis rig
amendment the weapon needs.

**Primary files (new, on top of the prior doc's):**
- `scripts/blender/build_weapon_sidearm.py` (new)
- `public/models/weapons/sidearm/Sidearm.glb`,
  `Sidearm.uv-template.png` (generated outputs, committed)
- `scripts/blender/build_player_chassis.py` (amend — add the
  `WeaponSocket_R` bone; this is a small, additive change to a script
  Codex already owns, not a new file)

**Tasks:**
1. Add `WeaponSocket_R` to the chassis rig: child of the right hand bone,
   at the grip point, oriented so a weapon authored facing local +X sits
   correctly at identity transform when parented.
2. Build the sidearm from primitives — no reference photo exists (checked;
   only weapon *audio* is in the repo), so match the established visual
   language by convention: cream/dark-grey body, orange/cyan accent,
   consistent with `Scout.front-idle-master.png`'s palette, rather than
   projecting a photo that doesn't exist.
3. Grip origin at local (0,0,0), barrel/muzzle toward local +X.
4. Optional stretch goal, not a blocker: a `"Fire"` animation clip, a
   small recoil kick — static mesh with no clip is an acceptable v1.
5. Export `.glb`. Also render `Sidearm.uv-template.png` the same way as
   the chassis's — a second, alternate flat-material texture (Chrome
   Plated Sidearm) is then just a differently-colored paint of the same
   template, no photo-wrap complexity at all since there was never a
   photo.
6. **Also for the chassis** (Sub-project 2's dependency): reserve and
   document a fixed UV rectangle on `Scout.uv-template.png` for the decal
   slot (shoulder patch area) — one region, one convention, reused by
   every `playerDecal` cosmetic (three Victory Patches, two emblems).

**Definition of done:** same headless self-check pattern as the chassis
doc — `blender --background --python scripts/blender/build_weapon_sidearm.py`
exits 0 and produces both outputs; hand off to Gemini's generalized
contract checker as the actual pass/fail gate.

## Gemini lane (Antigravity, Flash) — verification, docs, loadout UI

**Adds** the weapon contract to the existing checker (one generalized tool,
not two), extends the skin-authoring guide to cover decals and weapon
skins, and **takes ownership of Sub-project 4** (loadout UI) — bounded DOM/
CSS work against a data contract Claude defines in Sub-project 1, which
fits this lane's existing "UI work against an already-specified contract"
pattern from the chassis doc.

**Primary files:**
- `scripts/verify-player-chassis-asset.mjs` (extend — add weapon-glb
  contract checks and a check that the chassis glb contains
  `WeaponSocket_R`; still one script, one command, both assets)
- `docs/player-chassis-skin-authoring-guide.md` (extend — decal region,
  weapon skin authoring)
- `tests/e2e/player-chassis-visual.spec.js` (extend — equip a skin/decal/
  weapon in the harness and assert each renders where expected)
- `main.js` (Sub-project 4: roster modal, additive rendering for the
  cosmetic slots alongside the existing weapon list — not a rewrite of
  the weapon-list rendering Codex/Claude/prior-Gemini work already
  touched)
- `style.css` (additive: slot-grouped cosmetic layout in the roster modal)

**Tasks:**
1. Generalize the asset checker to take an asset *kind* (`chassis` |
   `weapon`) and validate the matching contract from the design doc.
   Zero dependency on Claude's runtime code, same as before.
2. Extend the skin-authoring guide: how the decal region works (composited
   on top of the base skin, not a replacement), and that weapon skins are
   simpler than player skins (flat materials, no photo-wrap limitation to
   explain).
3. Build the loadout UI: list owned cosmetics grouped by slot
   (`playerSkin`/`playerDecal`/`weaponSkin`), filtered by the active
   class's `appliesTo`, equip/unequip per slot, using
   `STEAM_ITEM_CATALOG`'s existing `name`/`rarity`/`img` — no new display
   data needed. Static catalog icons only; no live 3D preview (explicitly
   deferred in the design doc).
4. Extend the visual Playwright spec: with a skin/decal/weapon equipped
   via the loadout state directly (bypass the UI for this assertion — UI
   interaction is a separate, simpler assertion), screenshot and confirm
   each renders at its expected location.

**Definition of done:** generalized checker passes on both real assets and
fails legibly on a deliberately broken fixture for each kind; loadout UI
equip/unequip round-trips through `LoadoutManager` and reflects
ownership-gating refusals in the UI (an unowned item's equip control is
disabled or absent, not silently clickable-but-failing); visual spec
extension passes once Claude's rendering lands (skip with a comment
pointing at this doc until then, same pattern as the chassis doc).

## Claude lane (this session) — data model, runtime integration, aim-yaw

**Adds** Sub-project 1 in full (own it end to end — it's the connective
tissue every other lane's contract depends on, and splitting the state
shape across two agents risks exactly the kind of subtle mismatch that
caused real bugs in this project before), plus the Sub-project 2/3
runtime wiring, plus the aim-yaw work Sub-project 3 surfaced as newly
required.

**Primary files:**
- `src/steamVaultUi.js` (catalog `equip` descriptors)
- `src/loadout.js` + `src/loadout.test.js` (state extension, ownership
  gating, extend the existing 8-test suite)
- `src/playerChassisRenderer.js` (contract amendment: `skinTextureUrl`,
  `decalTextureUrl`, `weaponGlbUrl`/`weaponSkinUrl`; chest-bone aim-yaw
  driving)
- `src/threeGame.js` (read loadout state when constructing the chassis
  sprite source; wire `aimDirX/aimDirZ` — already computed today,
  `updatePlayerSpriteAnimation`, line ~13053 — into chest-bone yaw)

**Tasks:**
1. Sub-project 1's data model and `LoadoutManager.equipCosmetic`, per the
   design doc — ownership-gated via an injected `ownsItem` check, same
   pattern as the existing fabrication check, never trusted from
   client-only state.
2. Amend `createChassisSpriteSource`'s contract with the new optional
   parameters; when unset, behavior is bit-for-bit identical to the
   original chassis-doc spec — prove this, don't assume it.
3. Implement chest-bone yaw driven by aim angle, reusing the existing
   `axisX/axisZ` (movement) vs. `aimDirX/aimDirZ` (aim) split the 2D
   system already computes — this is the piece that makes a rendered
   weapon actually point where the player is aiming instead of where
   they're walking.
4. Load and parent the weapon glb under `WeaponSocket_R` once Codex's rig
   amendment lands; it rides in the same offscreen render pass as the
   chassis — no second render target.
5. Wire loadout state into both the skin/decal texture selection and the
   weapon/weapon-skin selection when constructing the player's chassis
   sprite source in `threeGame.js`.

**Definition of done:** `vitest` green including extended
`loadout.test.js`; `eslint` clean; build succeeds; with a skin/decal/
weapon equipped via loadout state, the player visibly shows the correct
skin, the decal at its reserved region, and the weapon at the hand
**pointing at the aim reticle while strafing perpendicular to it** — that
specific check is what proves the aim-yaw coupling actually landed, not
just that a weapon-shaped mesh appears somewhere near the hand.

## Coordination note

Same as every prior lane-split doc in this repo: proposal, not a lock. If
an agent is already mid-task on something listed here, keep that work and
treat this doc as descriptive. Run `git status`/`git diff` before editing
any file another lane claims above — this doc and the prior chassis
lane-split doc between them now claim `src/threeGame.js`,
`scripts/blender/build_player_chassis.py`, and
`scripts/verify-player-chassis-asset.mjs` for **the same lane** across
both docs (Claude, Claude, Gemini respectively) specifically so amending
them doesn't create a second lane touching a file another lane already
owns.
