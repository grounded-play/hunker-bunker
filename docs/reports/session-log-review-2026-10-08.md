# Session-log review, 2026-10-05 → 2026-10-08

Evidence for [Sprint 49](../planning/sprint-49.md).

**Source:** the in-game session-log uploads at `steam.tuesdaycinema.club/logs/session` (28 uploads from 10-05 to 10-07), plus one desktop dev-server log the owner pasted on 10-08. Several uploads are repeated exports of one session; they are merged below.

**Setup:** every build is an installed Steam beta build (`steamBuild v2.4.x-beta-<commit>`), Steam client active.

| Device | GPU | Input |
|---|---|---|
| Steam Deck | AMD Custom GPU 0405 | Steam Deck controller |
| Desktop PC | NVIDIA RTX 2070 SUPER (ANGLE/D3D11) | keyboard and mouse |

These are owner playtests, not a publisher review run. They count as evidence toward the acceptance gates below, not as the gates' sign-off.

## Sessions

| Upload | Build | Device | Mode | Class | Min | Gameplay frame p50 / p95 / max (ms) |
|---|---|---|---|---|---|---|
| `2026-10-05T20-15-37` | 2.4.14-beta `cf9f4967` | PC (RTX 2070 S) | coop guest | TANK | 6.9 | 21 / 57 / 6802 |
| `2026-10-05T20-16-19` | 2.4.14-beta `cf9f4967` | Deck | coop host | ENGINEER | 8.3 | 54 / 78 / 440 |
| `2026-10-05T20-38-59` | 2.4.14-beta `cf9f4967` | Deck | solo | ENGINEER | 18.9 | 60 / 88 / 4090 |
| `2026-10-05T21-25-20` | 2.4.14-beta `cf9f4967` | Deck | pvp host | TANK | 3.5 | 46 / 77 / 1796 |
| `2026-10-05T21-25-28` | 2.4.14-beta `cf9f4967` | PC (RTX 2070 S) | pvp guest | ENGINEER | 4.5 | 27 / 40 / 4024 |
| `2026-10-05T21-40-29` | 2.4.14-beta `89b5c81a` | Deck | solo (store) | TANK | 1.7 | — |
| `2026-10-06T05-33-08` | 2.4.14-beta `d2e7b149` | Deck | pvp host | ENGINEER | 8.6 | 49 / 73 / 466 |
| `2026-10-06T05-34-27` | 2.4.14-beta `d2e7b149` | PC (RTX 2070 S) | pvp guest | TANK | 6.4 | 22 / 29 / 1381 |
| `2026-10-06T06-19-34` | 2.4.14-beta `f76dde08` | Deck | solo (store) | ENGINEER | 1.6 | — |
| `2026-10-06T15-46-00` | 2.4.14-beta `9e89d8a4` | Deck | solo | ENGINEER | 10.8 | 55 / 81 / 4118 |
| `2026-10-06T16-51-29` | 2.4.14-beta `f9093289` | Deck | solo | SCOUT | 7.6 | 74 / 124 / 4169 |
| `2026-10-06T18-57-17` | 2.4.15-beta `58a0f732` | PC (RTX 2070 S) | coop host | ENGINEER | 15.2 | 28 / 44 / 6556 |
| `2026-10-06T18-57-06` | 2.4.15-beta `58a0f732` | Deck | coop guest | SCOUT | 14.9 | 60 / 85 / 4087 |
| `2026-10-06T22-02-01` | 2.4.16-beta `c2e1619a` | PC (RTX 2070 S) | coop host | ENGINEER | 6.8 | 30 / 41 / 4004 |
| `2026-10-06T22-02-08` | 2.4.16-beta `c2e1619a` | Deck | coop guest | SCOUT | 6.8 | 52 / 86 / 9150 |
| `2026-10-06T22-52-30` | 2.4.16-beta `b8b3f3bc` | Deck | solo | ENGINEER | 27.3 | 78 / 175 / 4136 |
| `2026-10-07T16-10-02` | 2.4.16-beta `02710831` | Deck | solo | ENGINEER | 11.7 | 64 / 142 / 1526 |
| `2026-10-07T20-04-50` | 2.4.16-beta `6d5fc7ed` | Deck | solo (Act 2) | ENGINEER | 17.3 | 63 / 177 / 917 |
| `2026-10-07T20-09-49` | 2.4.16-beta `6d5fc7ed` | PC (RTX 2070 S) | pvp guest | SCOUT | 1.8 | 28 / 50 / 575 |
| `2026-10-07T20-10-01` | 2.4.16-beta `6d5fc7ed` | Deck | pvp host | TANK | 5.1 | 48 / 97 / 4136 |
| pasted, 2026-10-08 00:18 | 2.4.16-beta `ca80d122` (dirty, dev server) | PC (RTX 2070 S) | solo | TANK | 3.4 | 23 / 41 / 4521 (10.6 s stalls) |

## Findings by ticket

### S49-02 / S49-04 — text chat on the deployed relay

- **Chat crossed between two real accounts:**
  - 10-05 co-op on 2.4.14: Deck sent;
  - 10-06 PvP on `d2e7b149`: the Deck's chat log shows "ZERO-9 · 10:27 PM Need help!";
  - 10-06 co-op on 2.4.16: Deck sent, and the PC host's log registered the message.
- **Typing on the Deck:** chat was opened and typed on the Deck with the controller in all three of those sessions. The text field entered menu text-editing mode (`player-chat-input.is-menu-text-editing`).
- **Unread badge:** the "CHAT (1)" badge appeared.
- **Relay connections:** every multiplayer session shows exactly **one** relay connection (`relay-connected` ×1, no reconnects). The 10-04 reconnect churn (about every 10 s) did not recur on 2.4.14–2.4.16.
- **Not shown:**
  - channel isolation (lobby versus mission);
  - a deliberate reconnect with history restored;
  - mute/report on a live message;
  - filter rejections.

### S49-05 — online co-op and PvP

Six paired real-account sessions on uploaded Steam builds, all Deck plus PC:

| Mode | Build | Rooms | Roles |
|---|---|---|---|
| co-op | 2.4.14 | `…244097971963` | Deck host, PC guest |
| co-op | 2.4.15 | `…244199283619` | PC host, Deck guest |
| co-op | 2.4.16 | `…244214633440` | PC host, Deck guest |
| PvP | 2.4.14 | `…244103804638` | Deck host, PC guest |
| PvP | 2.4.14 | `…244133098039` | Deck host, PC guest |
| PvP | 2.4.16 | `…244319726950` | Deck host, PC guest |

- **Host/guest reversal** happened in co-op.
- **Every session completed the relay handshake:** join, roster, ready, remote avatar, 3D avatar ready.
- **Co-op death and redeploy replicate.** `remote-player-died` and `remote-player-redeployed` appear on the other machine, for example 10-06 at 18:57 with 2/2.
- **PvP round results agree.** The 10-07 round `5ce05ec8…` ended `reason: combat`, PC `isLocalWinner: true` and Deck `isLocalLoser: true`.
- **Not shown:**
  - rematch;
  - invites and lobby listing;
  - host loss mid-match;
  - a recording;
  - cross-region discovery.

### S49-06 — developer commentary

- **10-05, 2.4.14 `cf9f4967`, installed on the PC:** Settings → Commentary → READ ALL. Voiced lines played (`narrative.commentary.commentary_on`, `run_start`) in **English and German** (READ ALL / ALLE LESEN, PLAY / ABSPIELEN).
- **Not shown:** the Deck path and an in-run commentary trigger.

### S49-09 — purchase, cancel, delivery, reversal (Steam sandbox)

All on the Deck, 2.4.14, through the beta MicroTxn sandbox ("Beta test purchase: approve it…").

| Session | Event |
|---|---|
| `9e89d8a4` | `key_1` **declined** (cancel), then **completed** on retry; `key_15` completed |
| `6d5fc7ed` (10-07) | `key_1` completed |
| several | `cache-opened` grants delivered (itemdefs 1000 ×3, 1100, 2100, 2200, 4159), all once |

- **Settlement hold:** on 10-05 (`89b5c81a`) a cache open returned `409 exchange_outcome_requires_review`. That is the S49-08 ambiguity hold working; later builds opened caches normally.
- **PC key_15 never finished:** the PC's `key_15` purchase (2.4.15) reached `purchase-pending` and did not complete within the session.
- **Not shown:**
  - a non-sandbox charge;
  - the hosted-store route;
  - refund or reversal;
  - the GetReport response.

### S49-10 — controller journey

- **Controller-only on the Deck:** the Deck played Title → Armory → deploy → gameplay → results with the Steam Deck controller in 14 sessions, including store, chat and commentary surfaces.
- **Native Steam Input:** from `6d5fc7ed` (10-07) the deploy record reads `mode: "controller"`. Earlier builds reported `"keyboard"`, meaning keyboard emulation. The native action sets are now live.
- **Not shown:** a PC run with the keyboard unplugged, and Xbox or PlayStation pads.

### S49-15 — co-op parity

- **Shown:** death and redeploy replicate in both directions. One relay connection per session, so no duplicate join or roster.
- **Fixed this week (local `dev/sprint-51`):**
  - co-op aggro sync (Sprint 51);
  - mystery-box open sync with late-join catch-up (`aa89c5ac`).
- **Not shown:** host loss and rejoin, or camps and companions in co-op.

### S49-18 — combat

- **Act 2 no-damage bug.** The 10-07 Deck run in Act 2 (Engineer, 17 min) took **no hits**: zero `player-damaged` events with 5–13 enemies loaded and a boss telegraphing.
  - **Cause:** hive kinship made every wild enemy passive for all of Act 2.
  - **Fix:** `4a9d7fa6`, local. Act 2 snails still open their talk-or-fight encounter on contact.
- **Not explained: the 10-08 desktop log** (Act 1 Tank, 3.5 min, no damage). It is not reproduced; all Act 1 probes land hits. Details in [qa-2026-10-07-no-damage-and-stalls.md](../planning/qa-2026-10-07-no-damage-and-stalls.md).

### S49-21 — narrative consequences (camps)

- **Double conversation.** Logs from 10-01 and 10-07 show one TALK opening the staged camp conversation **and** a choice-tree modal, with song videos behind them.
- **Fixed in `da3cbaac`, local:**
  - one conversation per camp;
  - the title card on first contact only;
  - choice-tree perks persist;
  - a three-entry prompt with CAMP SERVICES.

  See [qa-2026-10-08-camp-interaction-audit.md](../planning/qa-2026-10-08-camp-interaction-audit.md).

### S49-27 — audio

Missing sound keys across these sessions (plays / sessions):

| Key | Plays | Sessions |
|---|---|---|
| `enemy_idle_boss` | 34 | 12 |
| `terminal_beep` | 13 | 5 |
| `chem_siphon` | 8 | 5 |
| `exosuit_charge` | 5 | 4 |
| `water_shower` | 5 | 3 |
| `ambient_steam_hiss` | 4 | 3 |
| `flesh_squish` | 4 | 1 |
| `water_slosh` | 3 | 2 |
| `toolbox_open` | 3 | 1 |

Once each: `flesh_seal`, `sfx_ui_denied`, `generator_complete`, `fan_wind`, `vault_open`, `neural_tap`.

### S49-30 — saves and Steam Cloud

- **Shown:** every Steam session reports `Cloud Sync: Available (App: true, Account: true)`.
- **Not shown:** a conflict, Deck sleep/wake, or recovery from corruption.

### S49-31 — frame pacing

| Machine | Gameplay p50 | p95 | Target |
|---|---|---|---|
| **Deck** | 46–78 ms (13–22 fps) | 73–177 ms | 33.3 ms (30 fps) |
| **Desktop** (RTX 2070 S) | 21–33 ms | 29–57 ms | 16.7 ms (60 fps) |

- **The Deck misses its 30 fps target in every session**, and it worsens with the denser Sprint 52–53 world. The 2.4.16 `b8b3f3bc` and 10-07 runs reached p95 142–177 ms.
- **The desktop misses its 60 fps target too.**
- **Every session has single stalls of 0.4–13.9 s.**
  - **Cause, desktop 10-08 log:** shader recompiles every time a vent light toggled `.visible`.
  - **Fixed in `4a9d7fa6`** (local), along with the corpse prewarm. Follow-up prewarm commits `1eb220f0`–`bf22ba2d` landed on the branch.
  - **Re-measure** on the Deck and the desktop with the next build.

### Other

- **Errors:** none in gameplay, apart from the 409 settlement hold above and a debug-console `tp queen` typo.
- **Version skew:** none. Every pairing ran the same commit on both machines.
