# Multiplayer flow rework + lobby bugs — 2026-08-20

Source: a real two-machine playtest, reported live and backed by
`docs/logs/log9.json` (a single-player-side session export, Electron/Steam
build, 2026-08-20 17:49-17:51 UTC). The user's report, verbatim:

> so it's not really working, I can't see the other persons lobby, the
> numbers on the two systems don't match... I have not seen the agent name
> match what I set it at, and there is drift on the settings name and the
> one we start at a new run

...plus a feature request: restructure the new-run flow so class select is
followed by armory, then a **third, deeper screen** ("behind doors") that
segments PvP vs. team-up and absorbs everything currently on the tactical
lobby menu, before the run starts — with a custom cutscene keyed to which
players joined the squad and what they're running.

This document has two parts: bugs (diagnosed against real evidence, one
fixed this pass, two left open with a recommended path), and the new-run
flow redesign (planning only — not built this pass, this is what the user
asked to have documented).

## Part 1 — bugs

### 1a. Agent name wrong + per-machine stat drift — FIXED this pass

**Root cause: `window.profileManager` vs `window.profile`, a dead global
reference.** `main.js:2138-2139` creates the one real `ProfileManager` and
assigns it to `window.profile` — that's the only name ever assigned,
anywhere in the codebase. Five call sites across three files had drifted to
reading `window.profileManager` instead, a name nothing ever assigns:

- `src/multiplayerLobby.js:256` and `:418` — roster callsign lookup
- `src/multiplayerLobby.js:289` — `profileId` sent in `joinRoom`
- `main.js:3968` — `recordMultiplayerRun()`
- `main.js:8557` — trade-modal self callsign
- `src/playerTrade.js:218-219` — `recordTradeCompleted()`

Every one of these is optional-chained (`window.profileManager?.x?.()`), so
each silently no-op'd instead of throwing — nothing in the console ever
flagged it. The multiplayer roster's callsign lookup fell through to the
hardcoded `'AGENT'` fallback **100% of the time, for every player**, which
is exactly the `"AGENT (HOST)"` string clicked in `log9.json` entry 51 (the
user had definitely set a real callsign; it just never had a chance to
reach the roster display). `recordMultiplayerRun()` and
`recordTradeCompleted()` are both correctly implemented in `src/profile.js`
(lines 97-109 and 111) — they just never ran, on either machine, so local
multiplayer/trade stats (`multiplayerMatches`, `multiplayerVictories`,
`coopExpeditions`, `pvpDuels`) silently stayed at zero. That's the most
likely explanation for **"the numbers on the two systems don't match"**:
other stat paths (Steam stats sync, fixed in a prior pass) may be updating
normally while these local counters never move at all, and two players
comparing their own screens would see exactly that kind of mismatch.

**Fix shipped:** all five call sites now read `window.profile` instead of
the dead `window.profileManager` name. Regression-guarded with
`src/profileManagerGlobalName.test.js`, a repo-wide scan (same pattern as
the existing `act2StateSurfaceAudit.test.js`) that fails if
`window.profileManager` ever reappears anywhere in `src/` or `main.js` —
verified live to fail with the typo reintroduced, pass with the fix. Full
suite (1799 tests) and a production build both green after the change.

**Re: "drift on the settings name and the one we start at a new run"** —
investigated directly: the Settings screen (`#operator-callsign`,
`main.js:10872-10878`) and the new-run roster screen
(`#roster-callsign-input`, `renderRosterModal()` at `main.js:10936-10982`)
both correctly read/write the *same* `window.profile` object already —
there was never a second, unsynced store between those two screens. The
"drift" the user is describing is almost certainly this same bug seen from
a different angle: Settings and the roster screen both show the real
callsign correctly, while the one place being compared against —
the multiplayer lobby — always showed the broken `'AGENT'` fallback. That
reads as "the name I set doesn't match what shows up," even though the
underlying stored value was never actually wrong or split into two stores.

### 1b. Can't see the other player's lobby — NOT fixed, real environment limitation found

Traced the full pipeline and it is correct on our side, end to end:

- `electron/main.cjs` `hb:steamCreateLobby` (~line 928): `visibility`
  defaults to `'public'`, resolves to Steamworks `LobbyType.Public` (`2`)
  correctly, and `hb_protocol`/`hb_mode`/`hb_room` metadata is set via
  `setLobbyData` before the lobby is usable.
- `hb:steamGetLobbies` (~line 984): calls `matchmaking.getLobbies()` and
  filters for `lobby.data?.hb_protocol`, correctly excluding unrelated
  same-AppID lobbies. Not a filtering bug.
- `src/steamLobbyClient.js` / `src/multiplayerLobby.js`
  `refreshSteamLobbies()`: correctly wired, renders every lobby the backend
  returns.
- AppID is consistent everywhere checked (`steam_appid.txt`,
  `electron/main.cjs`): `4957040`. Ruled out as a mismatch.

**The real suspect:** the installed `steamworks.js` (v0.4.0) exposes
`getLobbies(): Promise<Array<Lobby>>` — **zero parameters**, no way to pass
a distance/region filter from JS. Per Valve's own Steamworks documentation
for `ISteamMatchmaking::AddRequestLobbyListDistanceFilter`: if a caller
never explicitly adds a distance filter before `RequestLobbyList`, Steam
applies `k_ELobbyDistanceFilterDefault`, which Valve documents as
restricting results to the **same immediate region** — not worldwide. If
this native binding's Rust implementation never calls that filter function
(nothing in the JS-facing surface allows it to), every `getLobbies()` call
is implicitly region-restricted with no override available in this package
version. That matches the reported symptom exactly: the lobby is genuinely
Public, metadata is correct, everything server-side checks out — but two
players in different Steam-determined regions never see each other in the
browse list.

**This is a real limitation of the currently-installed native binding, not
a bug in this codebase.** Two real paths forward, neither of which is a
quick patch:

1. Fork/patch the native `steamworks.js` binding (or find/upgrade to a
   version whose Rust layer calls `AddRequestLobbyListDistanceFilter` with
   `Worldwide`) — the "correct" long-term fix, but real native-binding work.
2. Don't depend on Steam's native lobby browse-list for cross-region
   discovery at all. The room-code path already routes through the
   self-hosted relay backend (`steam.tuesdaycinema.club`, confirmed live in
   `PRODUCT_STATE.md`) which has no region restriction — the pragmatic
   near-term fix is likely to lean on that path (e.g., a "recent/friends'
   lobbies" list sourced from the relay's own room registry rather than
   Steam's `getLobbies()`) rather than waiting on the native binding.

Recommend picking one of these explicitly before touching this again;
flagging it here rather than guessing further blind.

### 1c. "Numbers on the two systems don't match" — partially explained, rest unresolved

1a above (`recordMultiplayerRun`/`recordTradeCompleted` never firing) is
the strongest single explanation and is now fixed. One other synced-number
display was found: `src/multiplayerLobby.js:534-535`,
`${mode} // ${memberCount}/4 OPERATIVES`, sourced from the Steam lobby's
member list *at the moment of the last manual refresh* — since it's
poll-on-refresh rather than push-synced, two clients refreshing at
different moments could legitimately show different counts for a few
seconds, which might also be part of what was seen. If the mismatch the
user saw wasn't stat counts and wasn't member count, we don't yet know
which numbers — worth a follow-up describing exactly which two numbers
didn't match next time it's reproduced.

## Part 2 — new-run flow redesign (planning only, not built this pass)

### Current flow, as it actually exists today

**Solo:** Title → `#title-newrun-btn` → briefing/roster screen
(`.char-card` class select + roster modal, "CONFIRM CALLSIGN & DEPLOY") →
`#start-game` ("INITIALIZE") → `openArmoryGate()` (`main.js:7043-7045`) →
**Armory screen** (`appPhase='armory'`, UI in `src/armoryUi.js`, live —
`ARMORY_SCREEN_ENABLED = true` in `src/featureFlags.js:20`) →
`#armory-btn-embark` → `closeArmoryScreen({embark:true})` → gameplay. Daily
Ops follows the identical pattern.

**Multiplayer — structurally separate today, this is the core problem:**
`MultiplayerLobby.bindUi()` (`src/multiplayerLobby.js:170-206`) binds the
tactical-net modal open to *two* buttons — `#title-multiplayer-btn` on the
title screen directly, and `#briefing-multiplayer-btn` inside the roster
screen — so there's no single canonical entry point and no enforced
ordering against class selection. Worse: the modal's deploy button fires
`startMultiplayerRun()` (`src/gameController.js:78`, called from
`multiplayerLobby.js:767`) directly — a **completely separate code path
from `openArmoryGate`** (only 2 call sites exist,
`main.js:7045`/`7058`, both solo). **Multiplayer players never see the
Armory screen at all today.** This is exactly backwards from what's wanted.

The tactical-net modal itself (confirmed in `src/multiplayerLobby.js`)
already contains everything the user wants folded into the new third
screen: mode cards (`#net-mode-coop-btn`/`#net-mode-pvp-btn`), room
code create/join, the Steam public-lobby browser + refresh, the roster list
(`#net-roster-list`), ready/deploy (`#net-deploy-btn`), and invite friends
(`#net-steam-invite-btn`). Nothing there needs to be rebuilt from scratch —
it needs to be **relocated** to fire after armory instead of standing
beside/before it.

**Cutscene infrastructure — further along than expected.** Contrary to a
stale note in project memory, per-class intro video assets already exist:
`public/cutscenes/{scout,tank,engineer}-class-intro.{mp4,webm}` (+ posters,
+ a second `-intro.webm` set). Selection is via
`CLASS_CHARACTER_INTRO_BASENAMES`/`CLASS_INTRO_WEBM_BASENAMES`
(`main.js:6022-6031`), played by `playClassIntroSequence(playerType)`
(`main.js:6141`), invoked from `runMissionIntroSequence()`
(`main.js:6744`) — but only from the solo/Daily-Ops launch path
(`main.js:7036`, `7101`), only for the **local player's own single class**,
and **never called from the multiplayer deploy path at all**. Separately,
`src/cutscene.js` is a different, older system (the crash-intro ship-drop
animation) — don't conflate the two when building this.

**Squad roster data — half of what's needed already exists.**
`MultiplayerLobby.players` (a `Map`, entries `{id, callsign, opClass, ping,
isSelf, ready}`, set at `multiplayerLobby.js:292-338`) already tracks each
player's **class** — enough to drive a squad-composition cutscene selector
keyed on which classes are present. It does **not** sync per-player
**loadout** (weapons/mods/charms) — that data lives only in the local
`loadoutManager` on each machine and is never sent to peers or attached to
a roster entry. The user's "and loadouts as well" ask requires adding that
sync; it's genuinely new, not a relocation of existing data.

### Desired flow

```
Title → NEW RUN
  → Class select (existing roster/briefing screen, kept)
  → Armory (existing screen, kept — now the SAME path for solo and multiplayer)
  → NEW: Deployment Briefing screen ("third screen, behind doors")
      - Segment: SOLO / CO-OP / PVP
      - If CO-OP or PVP: today's tactical-net modal contents relocated here —
        room code create/join, Steam public lobby browser, roster, ready-up,
        invite friends
      - Replaces BOTH current entry points (#title-multiplayer-btn and
        #briefing-multiplayer-btn) with this one canonical spot
  → Squad-composition + loadout-aware cutscene (new)
      - Solo: existing single-class playClassIntroSequence, unchanged
      - Squad: new selector reading the full roster (class + loadout per
        player), not just the local player's class
  → Gameplay start
```

### What this actually requires, broken into phases

**Phase 1 — reroute multiplayer through armory (structural, no new UI).**
Remove the title-screen and briefing-screen tactical-net entry points; make
"deploy to tactical net" a mode reachable only after armory embark, on the
same trigger `closeArmoryScreen({embark:true})` currently uses for solo.
This alone fixes the "multiplayer players never see armory" gap and gives
every run — solo or multiplayer — one shared launch sequence to build the
new screen on top of.

**Phase 2 — build the Deployment Briefing screen.** A new screen/modal that
opens where solo currently jumps straight to gameplay: SOLO/CO-OP/PVP
segmentation up top, and — only when CO-OP or PVP is chosen — the existing
tactical-net modal's markup and logic (room code, Steam lobby browser,
roster, ready-up, invite) relocated in, not rebuilt. Solo, picking SOLO,
should fall straight through with no added friction (a plain skip, not an
extra click through empty multiplayer UI).

**Phase 3 — sync per-player loadout onto the roster.** Extend the
`{id, callsign, opClass, ping, isSelf, ready}` roster entry shape with a
loadout summary (equipped weapon + active mods/charms at minimum — decide
exact fields against what the cutscene actually needs to differentiate,
not everything `loadoutManager` tracks) and send it alongside `opClass` in
the existing `joinRoom`/roster-sync messages.

**Phase 4 — squad-composition cutscene selector.** Generalize
`playClassIntroSequence`/`runMissionIntroSequence` (or add a sibling
function reusing the same asset-selection machinery) to accept the full
squad roster instead of a single `playerType`, and call it from the new
Deployment Briefing screen's "all ready, launch" transition for co-op/pvp
runs, in addition to the existing solo call site. Needs a design decision
this doc doesn't make: what actually varies by squad composition — a
different cut/edit per class combination, a shared base cut with per-player
inserts, or something simpler like picking one "lead" player's intro and
listing the rest as a roster card overlay. Worth a short follow-up
conversation before building Phase 4, since it's the one part of this with
real creative/asset scope (potentially new video assets, not just new
selection logic) rather than pure engineering.

### Open questions worth resolving before Phase 1 starts

- Does SOLO still need to pass through the Deployment Briefing screen at
  all, or should picking "NEW RUN" solo skip it entirely and only PvP/co-op
  routes reach it? (Leaning toward: show it, default-selected to SOLO, one
  click through — keeps one consistent flow rather than two divergent
  ones — but this is a real product call, not an engineering one.)
- For 1b (lobby visibility): patch the native binding, or lean on the
  relay backend for cross-region discovery? Affects whether Phase 2's lobby
  browser needs a different data source than today's.
- Phase 4's actual creative direction (see above).
