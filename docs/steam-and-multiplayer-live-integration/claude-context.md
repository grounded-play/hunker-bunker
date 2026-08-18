# Claude Pair-Programming Context: Steam, Relay & Economy

Counterpart to [`gemini-context.md`](gemini-context.md) — same directory, same topic, written
from Claude's side after independently verifying this doc suite's claims against real code
(2026-08-17). Read both; they agree on the ground rules and only diverge on live coordination
notes below.

---

## 1. Verification status of this doc suite (as of 2026-08-17)

Cross-checked docs 01/02 against real code via 3 parallel research passes (Electron/Steamworks,
multiplayer/socket.io, full docs/ survey) plus a live network probe. Findings:

- **01 (Steamworks architecture) and 02 (multiplayer/relay)**: accurate. Every code snippet
  quoted matches the real file (`resolveRelayUrl()` in `src/multiplayerLobby.js`, App ID
  `4957040` in `electron/steam-config.json`, etc.).
- **The backend is genuinely live right now**: `curl https://steam.tuesdaycinema.club/health`
  returned `{"ok":true,"service":"hunker-bunker-relay","uptimeSeconds":~15000,...}` and the
  socket.io endpoint (`/socket.io/?EIO=4&transport=polling`) handshakes correctly. If a real
  Steam build still shows "nothing connected," the server is not the cause — check whether the
  installed Steam depot actually contains a build packaged *after* the 2026-08-14 multiplayer
  fix (`src/multiplayerLobby.js`'s `socket.io-client` wiring landed that day per
  `docs/steam-review-remediation-master-guide.md`'s verification log) — a stale/pre-fix
  packaged build is the most likely explanation for the symptom, not a missing feature.
- **03 (economy/inventory) had two real inaccuracies, both fixed 2026-08-17**:
  1. The itemdef catalog table's 1000-3001 range was fabricated (described "Base Guns,"
     "Weapon Charms," "Rig Modules" that don't exist under those IDs) — corrected against the
     real schema (`steam/inventory_schema_hunker_bunker.json`). Real items in that range are
     Relic Fragments (crafting material), Victory Patches, a decal, a weapon finish, and an
     internal loot-bundle resolver.
  2. Its "Recipe 4100" description conflated three separate, independently-real systems (Cache+
     Key unboxing, the 5:1 Trade-Up Smelter in `src/craftingMatrix.js`, and the base-weapon
     `FabricatorManager` in `src/fabricator.js`) into one fictional composite. Split back into
     three in the doc.
- **04 (runbook) had one stale section**: described a single unified `museum`/`showroom`
  system with specific claims (9 categories, position (9000,9000)) that didn't match the code
  at read time — see the duplication note below for why. Corrected to describe both real
  systems as they currently exist.

## 2. Resolved: debug showroom/museum duplication (2026-08-17, later pass)

Two QA-gallery dev tools exist side by side, built independently by two agents converging on
the same design in the same session — kept as two *presentations* rather than merged into one,
since they serve different QA purposes and the hallway specifically matches the user's literal
original request ("drop all in a long series of lines in an uninterrupted hallway museum"):

- `src/debugShowroom.js` — 4-wall stall grid at chunk (500,500), reached via
  `showroom`/`gallery`/`tp museum`. Good for inspecting one item at a time from multiple angles.
- `src/debugMuseum.js` — continuous hallway at (9000,9000), reached via `museum`/`closemuseum`.
  Good for a fast linear scan of everything.

**What was actually consolidated**: the Season 0 economy catalogs (weapon archetypes/skins,
charms, mods, chassis skins, cosmetic decals) that both files had independently hand-duplicated
— extracted into `src/debugAssetCatalogs.js`, which both now import. `debugMuseum.js` also
re-exports `SHOWROOM_CATEGORIES` from `debugShowroom.js` for its enemy/wall-decal/prop lists
rather than hand-duplicating those too. One update point now instead of two.

**Real bug found and fixed during consolidation**: after the enemy/prop lists got unified,
`debugMuseum.js`'s "PROPS & GROUND OVERLAYS" category silently broke — it inherited
`debugShowroom.js`'s `TACTICAL_PROPS`/`BIOMECH_PROPS`/`SETPIECES` type strings (which need
`createWorld3dModel()`) but only ever called `game.createScatterInstance()` (a different
loader, silently returns `null` for those types). The defensive skip-on-null design meant this
never crashed, just silently under-rendered ~36 of ~49 items in that category with no visible
error. Fixed by splitting into two categories (`WORLD PROPS & SETPIECES` via
`createWorld3dModel`, `GROUND OVERLAYS & FLOOR DECALS` via `createScatterInstance`).
Live-verified: `[debug-museum] opened: 117 objects spawned, 0 skipped` (was silently dropping
objects before the fix).

## 3. Everything else

Follow `gemini-context.md`'s ground rules (Steamworks isolation, socket.io sanitization,
inventory schema pipeline, test-before-commit) — they're accurate and don't need Claude-side
amendment.
