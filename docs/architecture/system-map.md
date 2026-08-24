# Hunker Bunker Runtime System Map

**Status:** Current architecture reference  
**Last verified:** 2026-08-24  
**Purpose:** define stable responsibility boundaries so contributors can find the authoritative producer/consumer path before adding another parallel implementation.

## Why this exists

Hunker Bunker has reached the point where repo navigation itself is an engineering risk. Several mature systems cross `main.js`, `src/threeGame.js`, `index.html`, `style.css`, Electron IPC, Steamworks, and the relay. Recent sprints repeatedly found features that were **coded and tested but not consumed by the live runtime**.

This map is not a rewrite plan. It is an ownership contract:

> **Before adding a system, identify its state owner, runtime producer, runtime consumer, persistence boundary, presentation surface, multiplayer authority, and acceptance route.**

If two modules both believe they own the same durable state, resolve that before adding a third path.

## System contract template

Every major subsystem should be describable with these fields:

| Field | Question |
|---|---|
| State owner | Where is canonical state stored during a run/session? |
| Producer | What code is allowed to mutate or emit the state? |
| Consumer | What live runtime path actually reads/acts on it? |
| Presentation | What UI/render/audio surface communicates it? |
| Persistence | What survives process/run/machine boundaries and how? |
| Network authority | Solo-local, host-authoritative, relay-authoritative, or Steam-owned? |
| Verification | Unit/integration/E2E/package/hardware/account route required? |

A module with no real consumer is **Coded**, not **Connected**.

---

## 1. Application lifecycle & navigation

### Primary ownership

- `main.js` — current high-level browser/runtime orchestration, menus, app phases, many UI integrations and global event bridges.
- `src/gameController.js` — newer game/session lifecycle seam intended to reduce direct global/DOM coupling.
- `index.html` — current large static UI surface and DOM contract.
- `style.css` — current global presentation stylesheet.

### Risks

- `main.js`, `index.html`, and `style.css` have become cross-lane collision surfaces.
- Old code has historically reached through `window.game` / globals rather than a single lifecycle owner.
- E2E startup has had readiness races, so DOM-visible state is not always equivalent to app-ready state.

### Direction

Do not rewrite. Gradually extract stable controllers by responsibility:

1. app phase/navigation;
2. menu/modal ownership;
3. input routing;
4. progression/reward presentation;
5. diagnostics/telemetry.

Each extraction must have focused tests and delete/disable the old path once adopted.

---

## 2. Core 3D simulation / world runtime

### Primary ownership

- `src/threeGame.js` — current central Three.js runtime: world/chunk mounting, actors, combat integration, rendering, effects, environment interaction, much gameplay orchestration.
- authored/procedural world helpers such as ring/world-plan/manifests and related generation modules.

### Risks

- `ThreeGame` remains a high-coupling god-object even after many useful helper modules were extracted.
- synchronous world/chunk work has produced real packaged frame-pacing issues historically.
- helper modules can exist without a runtime call site; every extraction needs consumer proof.

### Direction

Use a strangler pattern around `ThreeGame`, not replacement:

- pure data generation;
- simulation state;
- world streaming scheduler;
- entity/actor registry;
- presentation/effects;
- interaction/collision;
- network adapters.

Keep Three.js object creation/rendering on the main thread; move only measured data-only work off-thread when justified.

---

## 3. Expedition / depth / oxygen loop

### Primary ownership

- `src/depthContract.js` — depth-tier risk/reward contract data and pure calculations.
- `src/threeGame.js` and current HUD/event paths — runtime ring crossing, O2 and world consequences.
- director system — aggression consumption.

### Current state

Connected today:

- deeper O2 pressure;
- crossing deltas/ritual inputs;
- salvage multiplier;
- director aggression.

Known gap:

- `eliteSpawnChance` remains data/test/design only at the current audit; no live promotion consumer was found.

### Acceptance

The system is not fully accepted until a player can explain that deeper descent is a deliberate reward/risk bet without being taught the design document.

---

## 4. Combat, weapons & run buildcraft

### Primary ownership

- `src/threeGame.js` — live projectile/hit/damage/reload integration.
- `src/bossPhases.js` — phase/armor/weakpoint boss grammar.
- `src/runDrops.js` and related drop/relic modules — run modifiers and item definitions/effects.
- Sprint 29 presentation modules (`weaponCalibration`, reticle/weapon telemetry/audio helpers) — presentation and feedback, not damage authority.

### Rules

- item description and runtime behavior must share an explicit tested hook;
- do not add catalog-only gameplay effects;
- presentation telemetry does not substitute for combat-feel acceptance;
- PvP damage authority belongs to relay/server rules, not cosmetic/presentation modules.

### Acceptance

Representative Scout/Tank/Engineer human passes plus package performance under combat load.

---

## 5. Narrative, camps, hives, Act 2 & endings

### Primary ownership

- Act/faction/camp/hive modules hold narrative state and choice logic.
- `src/threeGame.js` / UI controllers surface encounters and consequences.
- ending/manifest systems consume accumulated state.

### Rule

Narrative flags should be consequences of game events/choices, not duplicated UI-only state.

### Acceptance

At least one complete branch must be exercised in a normal run without debug-only triggers before a narrative path is called accepted.

---

## 6. Wanderers & companions

### Primary ownership

- `src/wandererSystem.js` — archetype/quest state and progression functions.
- current encounter/companion runtime — discovery, follow AI, buffs and assists.

### Current disconnect

`advanceQuest()` currently has no non-test runtime caller. That means the quest system is **Designed/Coded/Tested but not Connected** even though Wanderer encounters and companions themselves are live.

### Required connection pattern

Gameplay event → objective-specific adapter → `advanceQuest()` → persisted quest state → reward/event → UI/audio feedback.

Do not call `advanceQuest()` from arbitrary UI clicks or introduce a second quest counter in `main.js`.

---

## 7. Progression, rewards & Season/Vault presentation

### Primary ownership

- progression/reward data modules;
- Sprint 29 `rewardPreview.js` / XP feedback / weapon-charm presentation modules;
- Steam Vault/Inventory UI for Steam-owned item surfaces.

### Rule

Separate:

1. gameplay progression;
2. cosmetic ownership/equip state;
3. Steam Inventory ownership;
4. real-money store capability.

These are related product surfaces, not one state machine.

Real-money purchase support must never be implied by the presence of a catalog UI or mock/dev purchase path.

---

## 8. Multiplayer session & game-state synchronization

### Primary ownership

- `src/multiplayerLobby.js` — renderer multiplayer flow and relay session lifecycle.
- `src/steamLobbyClient.js` — Steam lobby discovery/party wrapper only.
- `src/gameController.js` — game/session handoff seam.
- `server/relay.js` — trusted multiplayer relay and server-side validation/room state.

### Authority split

**Steam owns:** identity source, lobby membership, friends/invites, rich presence.  
**Relay owns:** authenticated room/session rules, server-validated multiplayer state/results where implemented.  
**Game client owns:** local simulation/presentation and client intents.  
**Steam lobby metadata never owns:** damage, grants, results, or canonical player progression.

### Current risk

Steam lobby public browse remains subject to the installed native binding's behavior; Friends/Invite should be treated separately from worldwide public matchmaking.

### Acceptance

Two real Steam accounts, packaged clients, production service, full run through extraction plus reconnect/host-loss scenario where supported.

---

## 9. Steamworks client integration

### Primary ownership

- `electron/main.cjs` — native Steamworks process boundary and IPC handlers.
- `electron/preload.cjs` — constrained renderer bridge.
- renderer Steam helper modules — UI/game-facing wrappers.

### Rules

- publisher/server secrets never enter renderer/package.
- Steam callbacks should be normalized in Electron before renderer consumption.
- feature claims requiring Steam must be package-tested through Steam, not inferred from browser mocks.

---

## 10. Persistence, checkpoints, Cloud & stats

### Primary ownership

- local save/profile modules and Electron save bridge;
- `src/runCheckpoint.js` — mid-run process restart recovery;
- `src/steamCloudSaveBridge.js` — game-side Cloud bridge;
- `src/steamStats.js` — Steam stat forwarding.

### Boundaries

- local save correctness;
- crash/checkpoint recovery;
- Steam Cloud transport;
- save migration/conflict handling;
- Steam stats/results.

Do not treat one as proof of another.

### Acceptance

- crash/restart route;
- Machine A → Steam Cloud → clean Machine B → modify → Machine A round trip;
- results/stat verification on a real Steam account.

---

## 11. Input, controller, Deck & accessibility

### Primary ownership

- input routing in current `main.js`/game runtime;
- Steam Input manifests/configs under `steam/`;
- settings/accessibility state and CSS/presentation consumers.

### Rules

- no critical action should require mouse/keyboard when Full Controller Support is claimed;
- accessibility toggle existence is not acceptance; verify visual/audio effect in a live scene;
- Deck 1280×800 is a first-class acceptance route, not only a CSS media query.

---

## 12. Audio

### Primary ownership

- central audio manager/runtime audio modules;
- generated/original SFX source pipeline under scripts/assets;
- presentation modules may request cues but should not each construct their own audio lifecycle.

### Risks

- packaged media pathing differs from browser pathing;
- first-use audio creation/decoding can interact with frame pacing;
- synthesized/generated source provenance needs to be tracked with the same rigor as visual assets.

### Acceptance

Browser plus packaged Electron path, real output device, relevant volume/accessibility settings.

---

## 13. Rendering, presentation & UI feedback

### Primary ownership

- Three.js runtime and dedicated 3D presentation modules;
- `index.html` + `style.css` legacy global surfaces;
- Sprint 29 presentation modules for reticle, XP, reward preview, weapon/charm framing and lighting telemetry.

### Rule

Presentation state should consume canonical gameplay state/events. Avoid presentation-only shadow copies of HP, O2, ammo, progression or network identity.

### Acceptance

Desktop 16:9 + Deck 1280×800 human visual route and repeat open/close/disposal cycles for GPU-owned previews.

---

## 14. Assets, provenance & packaging

### Primary ownership

- `public/` / runtime asset locations;
- `art/source/` for retained source masters;
- asset build/audit scripts;
- Electron `asarUnpack` policy in `package.json`;
- `ASSET_PROVENANCE.md` / future structured ledger for rights and production history.

### Rules

Every production asset class should have:

- canonical source/master;
- runtime derivative path;
- creator/source/method;
- commercial rights/license status;
- AI-assisted/generated disclosure status where applicable;
- packaging status;
- budget metadata where meaningful.

`tmp/` is not a durable source-master location.

---

## 15. Backend / production service

### Primary ownership

- `server/` — Express/Socket.IO/auth/store/stat/inventory server code.
- `docker-compose.yml` + `Caddyfile` — current documented self-hosted production path.

### Repository risk

Legacy alternate deploy files can look equally authoritative. Deployment documentation must explicitly mark Active vs Legacy and state how secrets/config are restored.

---

## 16. QA, telemetry & acceptance evidence

### Primary ownership

- Vitest for pure/unit/integration regression safety;
- Playwright for browser/E2E flows;
- package/Steam/hardware tests for environment-specific truth;
- presentation/performance telemetry modules for diagnosis;
- `docs/reports/` for dated acceptance artifacts.

### Rule

Automated coverage is **regression safety**, not a universal readiness score.

Recent high-value bugs have existed across boundaries despite a large green suite: package asset placement, Cloud calls, multiplayer handoffs, identity globals, and presentation producer/consumer gaps.

---

## 17. Release / store / compliance

### Primary ownership

- `docs/versioning-and-release-roadmap.md` — release policy/history;
- `docs/releases/` — promoted release notes;
- Steam audit/build scripts under `scripts/` and `steam/`;
- a current Steam review/status ledger should supersede old point-in-time remediation plans for present submission truth.

### Rule

Store claims must match the exact submitted build and acceptance evidence. Historical Steam remediation docs are not current product policy by default.

---

# Dependency direction target

Prefer this conceptual flow:

```text
Input / Steam / Network
        ↓
Commands & canonical session/game state
        ↓
Simulation / progression / narrative
        ↓
Game events / snapshots
        ↓
Render • UI • Audio • Telemetry • Network serialization
```

Avoid this pattern:

```text
DOM click → mutate window global → ThreeGame side effect → UI guesses state →
network module reads DOM → persistence mirrors whichever copy it finds
```

The project does not need an ECS rewrite to improve this. It needs one authoritative owner per important state and explicit adapters between domains.

# Sprint 30 architecture rule

Before a new feature PR is accepted, its description should answer:

1. What system owns the state?
2. What runtime event/command produces the change?
3. What consumes it?
4. How is it persisted, if at all?
5. Who is authoritative in multiplayer?
6. What evidence level was reached?
7. Which existing path was removed/replaced so the repo does not gain a second owner?

This is the minimum governance needed to keep Hunker Bunker fast-moving without making each future sprint harder to integrate.