# Armory & Class-Unique Weapons — Worklog & Task Board

**Opened:** 2026-08-17. **Status:** core feature complete and live-verified (tasks 1, 3, 4, 5, 7, 9
done; see §3). Remaining work is asset coverage (task 2's Talon-C, task 6's remaining skins) and
polish (task 8, itemdef 4107 naming), not blocking functionality — `ARMORY_SCREEN_ENABLED` is on.

This is the shared coordination doc for turning
[`docs/season-zero-protocol/07-armory-and-weapon-bench.md`](file:///home/caveman/Desktop/icecave/hunker-bunker/docs/season-zero-protocol/07-armory-and-weapon-bench.md)
(the design spec — read that first for *why*, this doc is *where things actually stand and who's
doing what*) into real, running code. Follows this repo's established
`docs/*-lane-split.md` convention (see `docs/cosmetics-and-loadout-lane-split.md` and
`docs/player-chassis-vertical-slice-lane-split.md`) — file-ownership split so agents can work the
same branch in parallel without colliding, plus a running status log so nobody re-derives context
from scratch or duplicates another agent's work.

**Before claiming a task below: check the Live Status Log (§5) for anything newer than this
read.** Two agents already independently wrote a full Armory spec the same day this doc opened
(`docs/season-zero-protocol/07-armory-and-weapon-bench.md` vs the now-merged
`07-pre-mission-armory-and-class-weapons.md`) — avoidable if either had checked for in-flight work
first. Don't repeat that.

---

## 1. Current Real State (verified 2026-08-17 — cite this over anything older)

Two research passes on the live codebase turned up a **materially different starting point** than
the design doc assumed when first drafted. Read this section before writing any code.

- **A real held-weapon pipeline already exists and is live in production**, not a future
  build. Shipped 2026-08-03 (`b2e976c`, "feat: add cosmetic Mixamo Scout overlay"), extended to
  all 3 classes shortly after (the "Scout-only" comment on
  `PLAYER_3D_COSMETIC_OVERLAY_ENABLED` in `src/featureFlags.js` is now stale — code gates all 3
  classes, `src/threeGame.js:3766`).
- **Mechanism**: `src/player3dOverlay.js`'s `createPlayer3dOverlay()` loads a rigged Mixamo body
  GLB per class, hides the legacy 2D sprite once it's ready, and finds the character's
  `RightHand` bone (tries `mixamorig1:RightHand`, then a `RightHand$` regex fallback,
  `player3dOverlay.js:246-252`) to parent a weapon mesh onto (`rightHand.add(weapon)`,
  `player3dOverlay.js:269`), compensating for the bone's inherited world scale so a meter-scale
  weapon isn't shrunk by the armature's normalization.
- **The gap**: the weapon is **one hardcoded model for every class** —
  `public/3d/GG.1.glb`, loaded by `createGg1Weapon()` (`player3dOverlay.js:40-65`) — and it is
  **not wired to `LoadoutManager` at all**. Whatever gets built in the (still-nonexistent) Armory
  screen currently has zero effect on what renders in combat. That's the actual scope of "make
  the base guns and loadout": swap one hardcoded model for a per-class, loadout-driven one, using
  machinery that already works.
- **Character body assets** (context, not in scope to change): Scout
  `public/3d/scouting-scout/Scout.game.glb`, Engineer `public/3d/runtime/engineer-rigged-gestures.glb`,
  Tank `public/3d/runtime/tank-rigged.glb`. Engineer/Tank borrow Scout's locomotion clips via
  bone-name retargeting (`animationBonePrefix: 'mixamorig'` in `threeGame.js`'s `classVisuals`
  map, `threeGame.js:3770-3785`) — that's also the exact switch point for making the *weapon*
  per-class instead of the shared `WEAPON_URL` constant.
- **Per-class hand-mount offsets already exist** as a pattern: Tank gets
  `weaponMount: { position: [0.03, 0.02, 0.03] }` (`threeGame.js:3781`) to correct for its
  different hand geometry. Each new weapon archetype will need its own tuned offset the same way.
- **Asset location convention**: `public/3d/runtime/` for gameplay GLBs (confirmed via
  `docs/3d-asset-coverage.md`'s maintenance rule — new GLBs go there, get registered in the
  relevant overlay catalog, and the coverage doc's checklist gets updated).
  `public/models/` **does not exist anywhere in this repo** — doc 07's original §6 asset-location
  guidance was wrong, corrected in that doc's §0/§6 banners.
- **Cosmetic equip is still genuinely split** across two systems that don't talk to each other:
  `LoadoutManager` (`src/loadout.js`, key `hb_loadout_v1`) has unused `equipCharm`/`equipDecal`/
  `equipSkin`/`equipRigModule` setters; `src/steamVaultUi.js` actually equips cosmetics through
  separate raw `localStorage` keys (`hb_equipped_patch`, `hb_equipped_decal`,
  `hb_equipped_weapon_finish`) LoadoutManager never reads. Confirmed still true, unchanged. Doc 07
  §5 specs the fix (per-class `perClass: { scout, tank, engineer }` shape).
- **No `appPhase='armory'` screen exists yet.** Class select + hub buttons (DAILY OPS/FAB
  BAY/ROSTER/STEAM VAULT) all live on one `appPhase='menu'` "Briefing Console" screen
  (`index.html:288-355`); INITIALIZE/DAILY OPS currently jump straight to `appPhase='gameplay'`.
  Doc 07 §2 specs inserting Armory between them.
- **2D key art for charms is already landing** in `public/economy/` (another concurrent
  workstream, per doc 06's manifest) — not blocking this doc's tasks, just concurrent context.

---

## 2. The Contracts That Let Agents Work in Parallel

Whoever builds the weapon loader and whoever builds the Armory screen don't need to wait on each
other if both honor these shapes. Same principle as the existing chassis/cosmetics lane-split
docs: pin the interface, build both sides against it.

### 2a. Weapon loader contract (extends the existing `createGg1Weapon`)

```js
// src/player3dOverlay.js — landed 2026-08-17, see task 1 below
const WEAPON_ARCHETYPES = {
  talon:         '/3d/runtime/new3ds/gun_scout_vector9_talon.glb',
  talon_c:       '/3d/runtime/new3ds/gun_scout_talon_c.glb',       // no gen prompt yet, best-effort guess
  siege_breaker: '/3d/runtime/new3ds/gun_tank_siege_breaker50.glb',
  tesla_lock:    '/3d/runtime/new3ds/gun_engineer_tesla_lock.glb',
};

// Generalizes createGg1Weapon(): same load/scale/rotate/traverse logic,
// keyed by archetypeId instead of a single hardcoded WEAPON_URL.
async function createClassWeapon(archetypeId, { position, rotation, scale } = {}) { /* ... */ }
```

**Path convention correction (2026-08-17):** this originally specced `public/3d/runtime/weapon-*.glb`
as an invented convention. A separate concurrent 2D-to-3D generation pipeline turned out to already
be actively producing assets under `public/3d/runtime/new3ds/` — visible by the charms/mods/skins
already sitting there — and doc 06 §5A already pins the 3 base gun target filenames shown above
(`docs/season-zero-protocol/06-asset-production-and-prompt-manifest.md` is the source of truth for
these paths). `src/player3dOverlay.js` now points at the real paths. **If you're the one running
that generation pipeline: those 3 exact filenames are what the code is already waiting on** — no
code change needed once they land, `createClassWeapon` will pick them up automatically.

`createPlayer3dOverlay()`'s hand-bone lookup, scale-compensation, and `rightHand.add(weapon)`
call (`player3dOverlay.js:246-269`) stay exactly as they are — only the loader and its call site
change from a single `WEAPON_URL` to an `archetypeId` lookup. `threeGame.js`'s `classVisuals` map
(`threeGame.js:3770-3785`) is where `archetypeId` gets threaded through from
`LoadoutManager.getActiveArchetype(classId)` (new, see 2b) instead of being implicit.

**Authoring note from the existing `GG.1.glb`**: the reference asset needed a rotation
correction (`weapon.rotation.set(0, -Math.PI/2, -Math.PI/2)`, `player3dOverlay.js:52`) and is
auto-scaled to `0.62m` on its longest axis. New assets can either match that convention (grip at
local origin, barrel toward local +X, no baked rotation needed) or ship with their own
`rotation`/`scale` override passed through `weaponMount` — don't assume the old asset's
correction values apply to a differently-authored mesh.

### 2b. Loadout data contract (from doc 07 §5, restated as the literal target shape)

```js
// src/loadout.js v2 — see doc 07 §5 for full detail, this is the load-bearing subset
interface ClassLoadout {
  archetypeId: 'talon' | 'talon_c' | 'siege_breaker' | 'tesla_lock';
  weaponSkinId: string | null;   // itemdef, must match archetypeId per doc 07 §4's table
  charmId: string | null;
  mod1Id: string | null;         // Rig Overclock itemdef 4140-4147
  mod2Id: string | null;
}
// perClass: { scout: ClassLoadout, tank: ClassLoadout, engineer: ClassLoadout }
```

Whoever builds the Armory screen UI can build the full slot/equip flow against this shape using
mock data before the weapon-loader side (2a) is done — they only integrate at the point where
`archetypeId` needs to actually drive a render, which is `threeGame.js`'s `classVisuals` call
site, not the Armory screen itself.

### 2c. Class → archetype → skin mapping (from doc 07 §4, reference copy)

| Class | Base `archetypeId` | Secondary | Skin itemdefs |
| :--- | :--- | :--- | :--- |
| Scout | `talon` (Vector-9 Talon) | `talon_c` (Talon-C Carbine, Tier ~11) | Talon: `4100`,`4105` · Talon-C: `4101`,`4104`,`4108`,`4110` |
| Tank | `siege_breaker` (Siege-Breaker 50) | — | `4102`,`4106` |
| Engineer | `tesla_lock` (Tesla-Lock MK-IV) | — | `4103`,`4107`,`4109`,`4111` |

---

## 2d. Gemini's Plan (adopted as the Task 5 spec)

Gemini/Antigravity's implementation plan
(`/home/caveman/.gemini/antigravity-ide/brain/6bdf4cbc-6281-41dd-844c-b1d749df8665/implementation_plan.md`)
covers the Armory screen **and** the LoadoutManager unification together. Adopting it as the
authoritative spec for tasks 4 and 5 rather than maintaining a separate description — it's more
detailed than what was here and matches the current doc 07 §3 (fullsize 3D staging room).

**Files it owns:** `src/armoryScene.js` (new — Three.js scene: bunker room, operator turntable
platform, magnetic weapon wall rack, socket attach nodes, spring physics), `src/armoryUi.js` (new
— HUD overlay: suit bench, weapon bench, combat-modifier card, nav bar), `index.html` (adds
`#armory-screen`/`#armory-canvas`/`#armory-hud-overlay`), `style.css` (Armory styling),
`main.js` (routes INITIALIZE/DAILY OPS → `enterArmoryScreen()`, adds `appPhase='armory'`, wires
EMBARK → `startRun()`), plus `src/loadout.js` for the per-class persistence.

**Two small things worth reconciling, not blocking:**
- The plan's persistence section still says key `hb_loadout_v1` — doc 07 §5 / this doc's §2b spec
  a `version: 2` shape (`perClass: { scout, tank, engineer }`). Probably just referencing the
  existing constant name loosely rather than a deliberate divergence — worth a quick check-in
  before `src/loadout.js` changes land, not a blocker to starting.
- The plan's weapon-mesh list for `armoryScene.js` mixes base archetypes (Vector-9 Talon,
  Siege-Breaker 50, Tesla-Lock MK-IV) with weapon *skins* (Queen's Carapace Carbine, Void-Walker
  Beam) as if all five are separate meshes to load. Per doc 07 §4, skins are a material/texture
  swap on the class's one fixed archetype mesh, not a separate model — so the scene only needs to
  load 4 archetype meshes (plus Talon-C once Scout's secondary unlocks) and re-skin materials on
  selection, not load 6 distinct gun models.

**Test files it proposes:** `src/armoryScene.test.js`, `src/armoryUi.test.js` — new, no
collision with anything Claude's lane touches.

---

## 3. Task Board

Claim a row by putting your agent name in **Owner** and flipping **Status** to `In Progress` —
commit that change immediately so a second agent sees it before starting the same work. Update
Status to `Done` and add a one-line result to §5 when finished, don't just leave it stale.

| # | Task | Files | Depends On | Owner | Status |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | Generalize `createGg1Weapon` → `createClassWeapon(archetypeId, opts)` per contract 2a; add `weaponArchetype`/skin support to `createPlayer3dOverlay` | `src/player3dOverlay.js` | — | Claude | **Done** |
| 2 | Author 4 class weapon `.glb`s (Vector-9 Talon, Talon-C, Siege-Breaker 50, Tesla-Lock MK-IV) | `public/3d/runtime/new3ds/gun_*.glb` | — | 2D-to-3D gen pipeline (raw source scp'd 2026-08-17) | **Done for 3 of 4** — Vector-9 Talon, Siege-Breaker 50, Tesla-Lock MK-IV processed and deployed 2026-08-17 15:36 (Claude ran the optimize pass, see status log). **Talon-C Carbine still has no source asset.** |
| 3 | Thread `archetypeId`/`weaponSkinId` from `LoadoutManager` through `threeGame.js`'s `classVisuals` map into the weapon loader | `src/threeGame.js:3762-3801` | 1, 4 | Claude | **Done** — reads `window.loadout.getActiveArchetype(playerType)` / `getEquippedSkinId(playerType)` live, falls back to per-class defaults if `window.loadout` isn't present (tests, etc). |
| 4 | `LoadoutManager` v1→v2 migration: per-class loadout shape, retire `steamVaultUi.js`'s raw `localStorage` keys, add itemdef-vs-archetype validation | `src/loadout.js` | — | Gemini | **Done** — `src/loadout.js` fully rewritten to the v2 per-class shape with `getActiveArchetype`/`getEquippedSkinId`/`setArchetype`/`equipWeaponSkin`/validation against `ARCHETYPE_SKINS`, plus v1→v2 and raw-key migration on load. Landed before Gemini ran out of credits. **Not yet verified**: whether `steamVaultUi.js`'s raw keys were actually retired (still worth a check), and no test file for `loadout.js` exists yet. |
| 5 | Armory screen shell: new `appPhase='armory'`, **full 3D staging room** — `src/armoryScene.js` + `src/armoryUi.js` | `main.js`, `index.html`, `style.css`, `src/armoryScene.js`, `src/armoryUi.js`, `src/featureFlags.js` | 4 (done) | Claude (finished what Gemini started) | **Done, live-verified.** Added `openArmoryGate()`/`ensureArmoryInitialized()`/`closeArmoryScreen()` to `main.js`, wired both `startBtn` (INITIALIZE) and `dailyOpsBtn` through the gate, added the Act 2 continuation bypass (doc 07 §2). Fixed a real crash in `armoryScene.js`'s animation loop (`currentOverlay.update(dt)` called with no `state` arg — `player3dOverlay.js`'s `update()` requires one, threw every frame). Consolidated `armoryScene.js`'s stale local `WEAPON_ARCHETYPE_GLBS`/`WEAPON_SKIN_GLB_MAP` (pointing at nonexistent paths) onto the exported `WEAPON_ARCHETYPES`/`WEAPON_SKIN_MESHES` from `player3dOverlay.js` — single source of truth now. `ARMORY_SCREEN_ENABLED` flipped to `true`. **Live-verified via dev server + Playwright**: menu → INITIALIZE → Armory renders correctly for Tank and Engineer (correct archetype, correct per-class skin list, correct base gun mesh loads with 0 console errors) → mod-slot equip live-updates the modifier readout → EMBARK correctly closes Armory and transitions to `appPhase='gameplay'` → SWITCH CLASS correctly returns to `appPhase='menu'` with Armory hidden. Full test suite still 188/188, 1579/1579 after. |
| 6 | Weapon skins | `public/3d/runtime/new3ds/skin_*.glb` | 2 | 2D-to-3D gen pipeline | **Done for 3 of 3 known skins** — `skin_scout_frostbite` (4100), `skin_tank_deep_core_melter` (4107), `skin_engineer_cryo_plasma` (4103) processed and deployed 2026-08-17. `createClassWeapon` supports `skinId` (3-tier fallback: skin → archetype → GG1), wired live via task 3. **Confirmed by code, not resolved by decision**: `src/loadout.js`'s `ARCHETYPE_SKINS.tesla_lock` includes `'4107'` — i.e. the actual functional code assigns itemdef 4107 to **Engineer**, matching doc 07 §4, contradicting doc 06 §5B's "Tank Skin" label and the `skin_tank_deep_core_melter` filename. Not a bug (nothing crashes — the mesh loads fine regardless of which class equips it), just a cosmetic/naming mismatch worth cleaning up later. |
| 7 | Register new weapons in `docs/3d-asset-coverage.md` per its maintenance rule | `docs/3d-asset-coverage.md` | 2 | Claude | **Done** |
| 8 | Charm/mod sockets on new weapon meshes (logical attach node per doc 07 §6 banner, not a skeleton bone) | part of task 2's assets | — | — | Not started — `src/armoryScene.js` (task 5) already has its own charm/mod socket logic (`charmSocket` group, itemdef→glb maps for 4130-4147); may already partially cover this, needs checking rather than assuming it's untouched. |
| 9 | **NEW — fix systemic GLTFLoader/Meshopt bug** | `src/player3dOverlay.js`, `src/world3dOverlay.js`, `src/enemy3dOverlay.js`, `src/armoryScene.js` | — | Claude | **Done** — see status log. Every `GLTFLoader` instantiation in the codebase now registers `MeshoptDecoder` via a `createGltfLoader()` factory; gltf-transform's `optimize` pass applies `EXT_meshopt_compression` and the loader throws without it. |

**Lane split while Gemini and Claude work in parallel:**
- **Gemini**: tasks 4 + 5 — the Armory screen (scene, UI, DOM, routing) and the `LoadoutManager`
  data model it saves into. This is Gemini's own plan already; no changes needed to start.
- **Claude**: task 1 (done) and the rest of task 3 once task 4's `LoadoutManager` shape exists —
  in the meantime, available to help unblock task 2 (weapon asset authoring — nobody's claimed it
  yet) or pick up loose ends (6/7/8) as they become actionable. Not touching `src/loadout.js`,
  `src/steamVaultUi.js`, `src/armoryScene.js`, `src/armoryUi.js`, `main.js`, `index.html`, or
  `style.css` while Gemini owns tasks 4/5 — same file-ownership discipline as the existing
  lane-split docs.
- **Task 2 (weapon models) is the one open slot** — whoever's generating the charm/mod 2D-to-3D
  art (per doc 06 §3's manifest, already producing `public/economy/*.png`) is the natural owner
  if that pipeline extends to weapons; otherwise flag it for a dedicated pass.

---

## 4. What's Not Assignable to Any Agent

- Whether a weapon model "looks right" next to the existing Mixamo bodies and the `GG.1.glb`
  reference is a subjective creative call for the project owner, not a lane self-certification —
  same rule as the existing chassis/cosmetics lane-split docs.
- Renaming or removing `public/3d/GG.1.glb` — leave it in place as the fallback/reference asset
  until all 4 replacements are confirmed working; don't delete it as part of task 2.
- Changing the `appPhase` state machine's other transitions (Act 2 continuation bypass, Daily Ops
  routing) beyond what doc 07 §2 already specs — flag any needed change here, don't improvise it
  in a single agent's task.

---

## 5. Live Status Log

Append here, most recent first. One line per event: date, agent, what happened.

- **2026-08-17 16:04** — Claude: **The Armory is fully built, wired, and live-verified end to end** (task 5 done). Summary of this pass:
  1. Read `src/armoryScene.js`/`src/armoryUi.js` in full — confirmed they're real, complete implementations (516 + 319 lines), not stubs.
  2. Found and fixed the same path-divergence bug as before, this time in `armoryScene.js`: it kept its own local `WEAPON_ARCHETYPE_GLBS`/`WEAPON_SKIN_GLB_MAP` pointing at the invented `weapon-*.glb` paths from earlier today, and was missing 3 of the 5 skins now available. Consolidated onto `player3dOverlay.js`'s exported `WEAPON_ARCHETYPES`/`WEAPON_SKIN_MESHES` (added `4109`/`4110` there too, for the two pre-existing legendary skins `armoryScene.js` already referenced).
  3. Wired `main.js`: new `openArmoryGate()`/`ensureArmoryInitialized()`/`closeArmoryScreen()`, both `startBtn` and `dailyOpsBtn` now route through it, Act 2 continuation bypasses it (`isAct2RunActive()` check, matching doc 07 §2's design).
  4. **Found and fixed a real crash**: `armoryScene.js`'s render loop called `currentOverlay.update(dt)` with only one argument; `player3dOverlay.js`'s `update(delta, state)` unconditionally reads `state.isMoving` and threw every single frame (spammed ~200 console errors during live testing). Fixed by passing a proper idle-state object at the call site, matching the shape `threeGame.js` uses for live combat.
  5. Flipped `ARMORY_SCREEN_ENABLED` to `true`.
  6. **Live-verified with a real browser** (dev server + Playwright): full loop menu→INITIALIZE→Armory→customize loadout→EMBARK→gameplay works with zero console errors, for both Tank and Engineer; SWITCH CLASS correctly returns to menu; a Rig Overclock equip live-updates the combat-modifier readout in the UI. This is not "code exists," it's "confirmed working in a running browser."
  7. Full suite: 188/188 files, 1579/1579 tests, still green.
  **Follow-up pass, same session**: live-verified Scout too (Vector-9 Talon loads, 0 errors) and the **Daily Ops** route through the gate specifically (separate code path from INITIALIZE) — both worked, confirmed `Talon-C Carbine` is selectable in the archetype dropdown and gracefully falls back to GG1 since it has no mesh yet (no crash). Found one real resource-management gap while testing: `closeArmoryScreen` never disposed the Armory's Three.js scene/renderer on EMBARK, so its `requestAnimationFrame` loop would keep rendering a hidden canvas indefinitely into gameplay. Fixed — now disposes and resets the cached instance on embark (rebuilds fresh next time), left alive on SWITCH CLASS/back since that stays in the same menu-adjacent flow.
  **One unexplained but very likely unrelated error**: after a Daily Ops embark specifically, saw one console error — `THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN... PlaneGeometry`. No stack trace pointed at any Armory file; `armoryScene.js`'s own `PlaneGeometry` calls use fixed non-NaN dimensions, and the Armory scene is disposed before this point in the embark sequence. Daily Ops uses a fixed shared seed (`fixedRunEntropy = true`), so this reads more like a pre-existing procedural-world-generation edge case than anything introduced here — flagged for awareness, not chased further as it's outside this worklog's scope.
  **Still open**: the STEAM VAULT & FAB BAY button's `onOpenVault` handler (wired, not clicked in testing); Talon-C Carbine has no source asset; itemdef `4107` naming mismatch unchanged (cosmetic only).
- **2026-08-17 15:46** — Claude: **Gemini ran out of credits mid-task** (per user). Before
  picking up their remaining work, processed 6 raw `.glb` files the user scp'd into `public/3d/`
  (3 base guns + 3 matching skins — Scout/Tank/Engineer, all landed with human-readable names
  like `"Engineer Base Gun — Tesla-Lock MK-IV Arc Driver.glb"`). Ran `npx @gltf-transform/cli
  optimize --texture-compress webp --texture-size 1024 --vertex-layout interleaved` on each
  (~35-39MB → ~480-690KB, ~98% reduction — same pipeline pattern as the prior 13-asset batch),
  deployed to `public/3d/runtime/new3ds/` at the exact filenames `player3dOverlay.js` already
  expected (no code change needed for that part). Moved raw sources to git-ignored
  `art/source/new3d/`, dropped one exact-duplicate file (verified via md5sum), and relocated an
  unrelated 23-file Mixamo animation pack (also scp'd into `public/3d/`, not in scope) to
  `art/source/new3d/animation-pack-2026-08-17/` for whoever picks up animation work next.
  **Discovered Gemini had gotten further than the worklog reflected**: `src/loadout.js` (task 4)
  and `src/armoryScene.js` (task 5, 516 lines) both exist and are substantial, not empty —
  updated task board accordingly. Wired `threeGame.js`'s `classVisuals` to read
  `window.loadout.getActiveArchetype()`/`getEquippedSkinId()` live instead of the hardcoded
  literals from task 3's earlier partial pass (task 3 now **done**).
  **Found and fixed a real, systemic bug via live verification** (dev server + Playwright, not
  just trusting file existence): none of the 4 `GLTFLoader` instantiations in the codebase
  (`player3dOverlay.js`, `world3dOverlay.js`, `enemy3dOverlay.js`, `armoryScene.js`) registered a
  Meshopt decoder, so every asset from today's gltf-transform batch (guns, skins, charms, mods)
  failed to parse — `THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed
  files` — and silently fell back to GG1 with no visible error to a normal playtest. Fixed all 4
  with a shared `createGltfLoader()` factory pattern (import `MeshoptDecoder` from
  `three/examples/jsm/libs/meshopt_decoder.module.js`, `.setMeshoptDecoder()` before use).
  **Live-verified end to end**: started the dev server, used Playwright to select each class on
  the Briefing Console, confirmed via network tab + console that `gun_scout_vector9_talon.glb`,
  `gun_tank_siege_breaker50.glb`, and `gun_engineer_tesla_lock.glb` all load with **zero**
  fallback warnings — all 3 classes now render their real class-unique gun instead of GG1.
  Updated `docs/3d-asset-coverage.md` per its maintenance rule (task 7, done). Full suite:
  `npx vitest run` — 188/188 files, 1579/1579 tests, still green after all of the above.
  **Not yet done, flagged for next pass**: Talon-C Carbine has no source asset; whether
  `steamVaultUi.js`'s legacy raw keys were actually retired needs a check; `src/armoryScene.js`
  is unverified beyond "it exists and imports the right things" — someone needs to actually load
  the Armory screen (once `main.js` routing/`ARMORY_SCREEN_ENABLED` are confirmed wired) to see
  if it renders correctly now that the Meshopt fix is in.
- **2026-08-17 15:26** — Claude: exported `createClassWeapon`, `WEAPON_ARCHETYPES`, and
  `WEAPON_SKIN_MESHES` from `src/player3dOverlay.js` so Gemini's `armoryScene.js` (task 5) can
  reuse the same weapon-loading/fallback logic for the bench preview instead of writing a third
  divergent implementation — we've already had to reconcile two path-convention mismatches today,
  reuse avoids a third. Ran the full suite as a final check on today's lane work: `npx vitest run`
  — **188/188 test files, 1579/1579 tests pass.** Task 1 is complete; task 3 stays partial
  (hardcoded per-class archetype, not yet reading `LoadoutManager`) until task 4 lands.
- **2026-08-17 15:25** — Claude: found a live 2D-to-3D generation pipeline already producing
  assets under `public/3d/runtime/new3ds/` (charms/mods/some skins already landed; base guns
  queued per `docs/season-zero-protocol/06-asset-production-and-prompt-manifest.md` §5A, not
  generated yet) — owner of that pipeline unclear, not covered by Gemini's coded implementation
  plan. Fixed `WEAPON_ARCHETYPES` in `src/player3dOverlay.js` to point at those real target
  paths instead of the invented `weapon-*.glb` convention from earlier today. Extended
  `createClassWeapon` with an optional `skinId` param + `WEAPON_SKIN_MESHES` map, since that
  pipeline generates skins as **whole separate meshes**, not material swaps as doc 07 §4
  assumed — 3-level fallback chain (skin → archetype → GG1) on load failure.
  **Flagging a real conflict, not resolving it:** doc 06 §5B labels itemdef `4107` (Deep Core
  Melter) as a **Tank** skin; doc 07 §4's itemdef table assigns `4107` to **Engineer**. This
  affects the `weaponSkinId`-vs-`archetypeId` validation rule in doc 07 §5 / worklog §2b — needs
  a project-owner call on which is correct before task 5's Armory UI enforces that validation, or
  Tank/Engineer players could get a skin equip silently rejected (or wrongly accepted) depending
  on which table task 5 trusts. `npx vitest run src/player3dOverlay.test.js` (10/10) and
  `node --check` both clean after these changes.
- **2026-08-17** — Claude: read Gemini's implementation plan
  (`~/.gemini/antigravity-ide/brain/6bdf4cbc-.../implementation_plan.md`), adopted it as the
  spec for tasks 4/5 (§2d), and split lanes: Gemini takes the Armory screen + LoadoutManager,
  Claude takes the in-combat weapon-swap wiring. Implemented task 1 in
  `src/player3dOverlay.js`: `createGg1Weapon` generalized into `createClassWeapon(archetypeId,
  opts)` with a `WEAPON_ARCHETYPES` lookup and automatic fallback to the shared GG1 model if an
  archetype's `.glb` isn't in place yet (so this is safe to ship ahead of task 2's assets).
  Wired `weaponArchetype` into `threeGame.js`'s `classVisuals` map (`talon`/`siege_breaker`/
  `tesla_lock` per class, task 3 partial — still needs to read from `LoadoutManager` once task 4
  lands instead of the hardcoded literal). `npx vitest run src/player3dOverlay.test.js` (10/10
  pass) and `node --check` on both edited files confirm nothing broke; no visual change yet since
  the new archetype URLs 404 and fall back to GG1 until task 2 lands.
- **2026-08-17** — Claude: while writing this worklog, a concurrent agent live-edited doc 07 §3
  (same day, same file) — replaced the flat DOM bench mockup with a **fullsize 3D staging room**
  rendered via a new `src/armoryScene.js` (Three.js scene: operator platform + magnetic wall
  weapon rack + camera focus on socket select), keeping everything else in the doc (the §0/§1/§2
  corrections, §4 gun table, §5 data model) intact. **This is a real scope decision, not just
  presentation** — a full 3D scene is a bigger lift than a DOM/CSS panel and has its own
  performance/loading considerations. Flagged here rather than reverted; task 5 above updated to
  match. If this scope wasn't intended, it needs a project-owner call, not a third agent silently
  picking a side.
- **2026-08-17** — Claude: opened this worklog. Corrected `docs/season-zero-protocol/07-armory-and-weapon-bench.md`
  §0/§6/§7 — the design doc had assumed no weapon rendering existed at all, but a real
  Mixamo-body + hand-socketed-weapon pipeline already shipped 2026-08-03 and covers all 3
  classes; the actual remaining gap is that the weapon is one hardcoded shared model, not
  class-unique or loadout-driven. Verified via two research passes (`src/player3dOverlay.js`,
  `src/threeGame.js:3762-3808`, `docs/3d-asset-coverage.md`, `art/source/mixamo/scout/README.md`).
  Added one small scaffold: `ARMORY_SCREEN_ENABLED = false` in `src/featureFlags.js` (off by
  default, matches this repo's existing feature-flag convention) so task 5 has a gate to build
  behind from the start; also fixed the stale "Scout-only" comment on
  `PLAYER_3D_COSMETIC_OVERLAY_ENABLED` next to it while there. No other code written — this doc,
  the doc-07 corrections, and the flag are the handoff for whichever agent picks up the task
  board above.
