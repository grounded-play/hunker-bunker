# Sprint 24 — Steam Multiplayer & Economy Review and Plan

Date: 2026-08-19
Status: planning document — no implementation yet. This captures an external
review of the repo's Steam-facing claims and the resulting Sprint 24 plan for
landing real Steam-native multiplayer, PvE, PvP, and a working marketplace.

## Overall assessment

The repo has moved well beyond "prototype game" territory: Three.js + Vite +
Electron, an Express/Socket.IO backend, Steamworks integration, Vitest,
Playwright, coverage, dependency auditing, asset auditing, Steam-claims
verification, inventory/catalog tooling, Lighthouse, Electron packaging, and
Steam-specific build/upload scripts — plus real unit tests across world
generation, AI, vitals, loot, camera, boss phases, and run entropy.

The core concern is not code quality. It's **release truth** — some
Steam-facing documentation claims more than can currently be verified in the
runtime.

## Findings

### 1. Multiplayer is the thing to investigate before another Steam submission

The July canonical feature matrix (`docs/current-feature-status.md`) says
multiplayer/co-op/PvP is "Deferred, server relay only, not connected to
renderer, do not claim." The August 14 Sprint 23 doc describes a complete
2-4 player co-op/PvP implementation instead.

`src/multiplayerLobby.js` has genuine networking code — Socket.IO connection,
room joining, remote player events, match deployment, shared seed/crash-plan
info, remote match-start handling. It is not purely fake UI. But it sets
`window.activeMultiplayerSession` and then clicks the existing single-player
start button. A repo-wide search for `activeMultiplayerSession` found no
consumer of it in the actual gameplay simulation — no evidence player
transforms, damage/health, weapons/projectiles, enemies, pickups, objectives,
revives, deaths, PvP scoring, or match completion are synchronized.

**What's verified: a networked lobby + shared match bootstrap. Not verified:
networked gameplay.**

Additionally, `fallbackLocalSession()` sets `connected = true` and inserts a
simulated opponent (e.g. SPECTRE-9/VULCAN-X) when the relay is unreachable.
The UI discloses "LOCAL // RELAY UNREACHABLE," but the deploy button stays
usable, so a local simulated opponent can look superficially like real
multiplayer.

**Acceptance bar before Steam sees this again**: two clean PCs, each launches
the Steam build, joins the same room, both see one another, deploy, physically
see one another in-game, player A moves and B sees it, A shoots B and B takes
damage, disconnect/reconnect, finish a match together. If any of that fails,
temporarily remove the Steam PvP/Online Co-op claims rather than explain
around it.

### 2. Two competing sources of truth in documentation

`docs/current-feature-status.md` calls itself canonical but was last verified
July 28 and wasn't reverified after later work. Sprint 23 then makes stronger
completion claims. The hierarchy should be:

```
code → automated acceptance → manual acceptance result → generated feature matrix → Steam claims
```

not `sprint plan/dev notes → Steam claims`. A feature becomes
Implemented/Connected/Claimable because a test/evidence artifact changed
state, not because a sprint doc says so. This would make `steam:claims:check`
far more useful.

### 3. CI setup is legitimately good

`npm run presubmit` mostly runs generated-data/Steam validation, but the
actual GitHub PR workflow does the right thing: `npm ci`, `npm run lint`,
`npm run audit:dependencies`, `npm run coverage` on PRs and pushes to
main/mothership, plus separate CodeQL, Lighthouse, PR-check, presubmit, Steam
backend deploy, and Steam build workflows. One of the strongest parts of the
repo — keep this direction.

### 4. Move a small amount of E2E testing into the normal PR gate

180 Vitest suites / 1,526 tests, with Playwright reserved for milestone
testing (slower). Reasonable for full playthroughs, but the highest-risk
failures now are integration failures, not unit failures — every lobby
utility can pass unit tests while nobody ever appears in another player's
bunker. Add a tiny PR smoke suite separate from the long Playwright suite:
launch → title → start run → spawn → move → open menu → save/load, and
ideally start relay → client A joins → client B joins → deploy → verify both
clients receive game state. Keep the full playthrough suite for releases.

### 5. Architectural coupling worth cleaning up gradually

Current pattern: `Lobby → window.activeMultiplayerSession → DOM
button.click() → ordinary game startup`. Global `window.*` bridges and DOM
events triggering core lifecycle behavior make integration harder to reason
about. Target:

```
MultiplayerLobby → GameSessionConfig → GameController.startRun(config)
                                              ├── SinglePlayerSession
                                              └── MultiplayerSession → NetReplication
```

This also makes it nearly impossible to accidentally ship a lobby that isn't
connected to the gameplay simulation.

### What's good

Release engineering is ahead of where expected: media audits, retail-asset
checks, world-seed sweeps, combat encounter reports, navigation reports,
Steam inventory catalogs, Steam claims, backend audits, soundtrack
validation, input configs, depot auditing, packaging. Continue this
direction.

### Priority order from the review

- P0 — prove or disprove actual two-client multiplayer gameplay.
- P0 — align Steam store claims with what that test proves.
- P1 — replace the stale feature-status document with one current acceptance matrix.
- P1 — add a very short browser/integration smoke test to every PR.
- P2 — gradually replace window.*/DOM lifecycle coupling with explicit game-session APIs.
- P2 — audit the ~2GB repo size and make sure binary/history growth is intentional.

## The Steam-native target

Goal: "Hunker Bunker is a Steam-native multiplayer/economy game," not merely
"a game launched through Steam." Hard gaps exist between the current repo
and safely claiming Online Co-op, PvE, PvP, Steam Inventory, Steam Trading,
Community Market, and real purchases.

```
                     STEAM (Identity/Ownership, Friends/Invites,
                     Lobbies/Presence, Inventory, Trading/Market,
                     Wallet/Item Store, Achievements/Stats,
                     Leaderboards/Cloud, Input/Overlay)
                              │  SteamID64 + auth
                              ▼
  Electron Game (Three.js, Steamworks.js,      Hunker Backend
  GameSession, Net replication)  ◄──────────►  (Steam auth, Match sessions,
                                                 Economy grants, Leaderboards,
                                                 Durable DB)
                              │
                              ▼
  GAME SESSION: Single Player | Co-op PvE (2-4) | PvP (+ PvE hazards)
  — authoritative movement/combat/world state
```

Steam's lobby system is deliberately separate from actual game networking,
so the existing Socket.IO backend can stay while hand-rolled room discovery
is replaced with real Steam lobbies/friends/invites. `steamworks.js` already
exposes lobby creation/joining and rich-presence — no need to abandon
Electron for this.

### P0 — Fix multiplayer reality first

The relay understands movement/fire/damage/revive/trade messages server-side
(`playerMoved` etc. exist in server/docs), but no evidence the gameplay
client actually consumes them. Need an actual multiplayer runtime, not just
a lobby.

Replace:
```
window.activeMultiplayerSession → button.click() → normal single-player run
```
with:
```
GameController.startRun({ mode: "coop", session: MultiplayerSession })
```
The session owns: local input transmission, remote player entity creation,
position/yaw/velocity snapshots + interpolation, weapon fire replication,
projectile replication, hit/damage resolution, death/downed state, revives,
disconnects/reconnects, world-state sync, objective sync, boss sync, loot
sync, extraction/match completion.

**Definition of done**: two Steam clients enter one run. A walks, B sees it.
A fires, B sees the shot. A damages an enemy, both see identical HP/death. B
goes down, A revives B. They kill the Queen. Both receive the same
completion state. Until this works, do not resubmit the Online Co-op claim.

### P0 — Steam-authenticate multiplayer

Currently players are identified by Socket.IO socket ID + room code. Need:
`Steam client → Steam auth ticket → Hunker backend → AuthenticateUserTicket →
SteamID64 → short-lived Hunker session token → Socket.IO handshake`. Every
connected player then carries `socket.id`, `steamId64`, `callsign`, `class`,
`lobbyId`, `matchId`. No anonymous production multiplayer sockets.

### P0 — Stop trusting clients for PvP damage

The relay currently accepts client-sent `targetId`/`damage`/`isFatal` and
clamps/broadcasts it — fine for a prototype, not acceptable authoritative
PvP (a modified client could claim any damage/fatal result). Server must
instead: know the weapon, fire rate, origin; validate trajectory/range;
determine the hit; calculate damage; apply HP; announce the result. Clients
send actions, not outcomes — especially once match wins can grant
Steam items with market value.

Initial split: **co-op = host-authoritative**; **casual PvP = authoritative
Hunker session/server**; **ranked PvP / economy rewards = fully
trusted-server-authoritative**.

### P1 — Replace room codes with Steam Lobbies

Keep room codes as a secondary/debug option. Land `SteamLobbyService`: create
lobby (public/private/friends-only), owner, max 4, mode/difficulty/seed/build
metadata, joinable/ready state, Steam friend invite, overlay invite, launch
directly into an invited lobby, quick-match search. This is one of the
biggest things needed for multiplayer to feel like a real Steam game.

### P1 — Steam Rich Presence

Strings like "Co-op Expedition — 2/4 Operatives" or "PvP — Sector Skirmish —
3/4", with friends grouped when in the same party. Hook into menu, lobby,
solo run, co-op, PvP, boss, extraction.

### P1 — Proper co-op PvE (not just two players on the same map)

Synchronize: **players** (position, animation, HP/O2, class, weapons,
downed/revived, buffs); **world** (seed, generated rooms, doors, gates,
switches, camps, environmental destruction, discovered zones); **PvE**
(enemy IDs, spawn state, target selection, health, status effects, deaths,
boss phases); **objectives** (mission state, camp state, Queen state,
extraction, endings); **loot** (chest opened, item picked up, resource
ownership, boss rewards).

First version: **host owns the PvE simulation** (AI, enemy HP, world state,
objectives, loot events) → relay → clients render canonical state. Move
authoritative simulation off-host later.

### P1 — Finish PvP as its own game mode

Not "friendly fire on in co-op." Build a mode layer:
`GameMode: SoloExpedition | CoopExpedition | SectorSkirmish`. PvP needs:
opposing spawns, teams/FFA decision, spawn protection, kill/death tracking,
assists, score, timer, win conditions, respawn/elimination rules, PvE hazard
rules, disconnect handling, match result, rematch, leaderboards, PvP
achievements, anti-farming safeguards. Then Steam can legitimately advertise
Online PvP and Online Co-op as genuinely separate systems, not one
networking layer pretending to be both.

### P1 — Steam Networking vs. the existing relay

Don't rewrite game networking just to say "Steam networking." Valve's modern
APIs are `ISteamNetworkingMessages`/`ISteamNetworkingSockets` (relay network
for Steam P2P); the old `ISteamNetworking` is deprecated. The current
`steamworks.js` binding exposes the older P2P surface but its lobby APIs are
usable today. Plan: **now** = Steam Lobbies → Hunker Socket.IO networking;
**later** = Steam Lobbies → `ISteamNetworkingSockets`/SDR if/when the native
binding is extended.

### P1 — Separate three Steam economy concepts

1. **Steam Item Store** — developer → player purchase (priced ItemDefs,
   cart, Steam Wallet checkout).
2. **Steam Trading** — player → player direct exchange of Steam-owned items.
3. **Steam Community Market** — player lists item → another player buys it.

ItemDefs carry separate `tradable`/`marketable` flags for #2/#3. Treat these
as three separate features, not one blurred concept.

### P1 — The current "trade" feature is NOT the Steam marketplace

`playerTrade.js` is a reasonable co-op resource barter system (shells, ammo,
medkits, O2 between run inventories) — keep it, rename to something like
"Field Transfer"/"Operative Barter," but never use it to move persistent
Steam Inventory items. Ammo/medkits/O2 stay Hunker field barter; skins/
charms/patches must go through Steam Inventory → Steam Trading/Community
Market. Persistent ownership must be Steam-owned.

### P1 — Make Steam Inventory real

A 71-item schema/Vault design exists, but "JSON contains `marketable:true`"
isn't enough. Steam Inventory Service must be enabled and ItemDefs
uploaded/published in Steamworks; a real account must retrieve inventory via
the real Inventory APIs. Acceptance chain: upload ItemDefs → publish schema →
account receives item → `GetAllItems` sees it → Hunker Vault sees it → equip
→ restart → ownership still reconciles. Then: tradable item → Steam trade →
ownership moves → Hunker refreshes → old owner loses equip permission, new
owner gains it. Same shape for a Community Market sale. That's when the
marketplace is "working."

### 🚨 P0 economy correctness issue

The newer economy guide marks Rig Overclock Mods as tradable/marketable, and
separately says the armory uses those same items for combat modifiers
(+20% Scrap Magnet, +8% Cryo Duration, etc.) — **do not ship marketable
gameplay-power items into PvP.** Steam-economy items should be cosmetic only:
skins, decals, charms, patches, banners, HUD themes, audio themes, VFX
cosmetics, armor appearance. Never +damage/+health/+fire-rate/+armor/
+movement/+status-duration, especially once buyable/resellable. Competitive
stats must derive entirely from game state/class/loadout everyone can earn
under the same rules.

### P1 — Real Steam purchases

Two sensible paths: Steam Inventory ItemDef pricing + `RequestPrices`/
`StartPurchase` for normal cosmetics, or the broader Microtransaction APIs
(`ISteamMicroTxn`) for unusual transactions/currency — pick one canonical
path per item category rather than maintaining two competing purchase
architectures. The repo currently has mock/sandbox purchase infra, not a
proven live-money path.

### P1 — Defer paid random crates

Crates aren't needed to prove Inventory/Trading/Market/Wallet. Land free
gameplay drops + direct-purchase cosmetics + Trading + Community Market
first; add cache+key+random-reward as a separate milestone after the base
economy is live and audited.

### P1 — Prove Steam Cloud, don't just configure it

Acceptance: PC A plays → saves → quits → Steam uploads → PC B (or Steam
Deck) installs → launches → same save appears → plays → saves → quits → PC A
receives new state. Also test conflicting saves and offline use.

### P1 — Achievements, Stats, Leaderboards on a real account

No mock data in a retail Steam session: perform achievement on a real Steam
account → Steam notification appears → Steam profile shows it. Leaderboards:
complete a real run → backend validates → submit → Steam leaderboard → read
back → show rank in-game.

### P1 — Full Steam Input + Deck

Use Steam Input semantic actions, not hardcoded Xbox-button assumptions.
Acceptance across Steam Deck, Xbox/PlayStation/Switch Pro controllers, and
keyboard/mouse: navigate boot → title → settings → lobby → inventory →
store → gameplay → death → results → quit with no mouse requirement (Full
Controller Support).

### P2 — Steam Voice, Workshop, Timeline; P2/P3 — Remote Play Together, Community/Profile features

Voice (team/squad, push-to-talk, mute, per-user volume, PvP channels) after
multiplayer fundamentals work. Workshop (custom bunker layouts, WFC tile
sets, challenge seeds, PvP arenas, cosmetics, missions) only after
multiplayer/world-gen stabilize. Timeline (mark boss encounters, Queen
kills, deaths, rare drops, multikills, extraction, endings) may need
extending the native Electron binding. Remote Play Together only if local/
shared-screen co-op is built. Trading Cards/badges/profile backgrounds/
Points Shop depend on reaching sufficient engagement — not simply
switchable pre-launch.

## The "must achieve" board

| Steam capability | Today | Required state |
|---|---|---|
| Steam launch | 🟢 | Installed Steam build |
| Overlay | 🟢 code | Live acceptance |
| Steam identity | 🟢 code | Live ticket verified |
| Ownership auth | 🟡 | Backend acceptance |
| Steam Lobbies | 🔴 | Build |
| Steam Friends invites | 🔴 | Build |
| Join Game | 🔴 | Build |
| Rich Presence | 🔴 | Build |
| Online Co-op | 🟠 relay | Gameplay integration |
| Co-op PvE | 🟠 | Shared authoritative world |
| PvP | 🟠 relay | Authoritative combat |
| Reconnect | 🔴 | Build |
| Match results | 🟠 | Server-authoritative |
| Steam Voice | 🔴 | Later |
| Achievements | 🟢 code | Live test |
| Stats | 🟢 code | Live test |
| Leaderboards | 🟢 backend | Live Steam test |
| Steam Cloud | 🟢/🟡 | Two-machine test |
| Steam Input | 🟢 code | Hardware test |
| Steam Deck | 🟡 | Full acceptance |
| Steam Inventory | 🟡 | Publish + real account test |
| Gameplay drops | 🟡 | Real Inventory grant |
| Crafting/exchange | 🟡 | Steam-backed acceptance |
| Steam Item Store | 🔴/🟠 | Enable + real flow |
| Steam Wallet | 🟠 mock | Live sandbox → production |
| Steam Trading | 🔴 | Real persistent-item trade |
| Community Market | 🔴 | Real listing + sale |
| In-game field barter | 🟢 | Keep for resources only |
| Workshop | 🔴 | Post-launch |
| Steam Timeline | 🔴 | Post-core |
| Remote Play Together | — | Only if local co-op |
| Cards/profile items | — | Later/eligibility |

## Five landing milestones

- **Milestone A — Steam Multiplayer Foundation**: Steam auth → Steam lobby →
  invite friend → both connect to relay → authenticated SteamIDs → both
  spawn in same world. Nothing else matters until this works.
- **Milestone B — Real Co-op PvE**: full run together — spawn → explore →
  fight → loot → objectives → boss → revive → extraction → rewards. Then
  Online Co-op is a legitimate claim.
- **Milestone C — Real PvP**: server-authoritative combat, kill tracking,
  win state, rematch, disconnect protection, PvP leaderboards. Then Online
  PvP is a legitimate claim.
- **Milestone D — Steam Economy**: real Inventory Service → drops → Vault →
  cosmetics → direct purchases → Trading → Community Market. Then a working
  Steam economy/marketplace is a legitimate claim.
- **Milestone E — Steam-native polish**: Rich Presence, friends/Join Game,
  Cloud acceptance, achievements, leaderboards, Input/Deck, voice, Timeline,
  eventually Workshop.

## Sprint 24 definition

The next branch should not add more content or more economy items. Single
success criterion:

> Two real Steam accounts can join through a Steam lobby and complete a
> synchronized Hunker Bunker combat encounter together.

This forces solving the actual foundational gaps — Steam lobby/auth, real
remote-player entities, replication, authoritative damage, shared PvE —
before stacking marketplace, ranked PvP, seasons, or further Steam claims on
top. Once this foundation lands, the rest of the Steam roadmap (Milestones
C-E) becomes straightforward incremental work.
