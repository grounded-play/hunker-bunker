# Steam review: build 25475189 — root causes and fix plan

Status: active · Owner: Claude (code), publisher (Steamworks) · Written: 2026-09-30
Reviewed build: 25475189 (older than 25596041, uploaded 2026-09-28) · App 4957040

Valve failed the build on seven points. Four repeat the 2026-09-11 review
([status](../steam-review-resubmission-status-2026-09-11.md)); three are new. Each
section says why it failed (checked in code), what changes in the game, what changes in
Steamworks, and what the reviewer note says.

**Rule for the resubmission:** every store category and survey answer must be
reachable by a reviewer in minutes, with directions in the notes. Anything we can't
make reachable this week comes off the page and goes back on when it is.

## Status (2026-09-30)

**Code: done in `ddff1018`.** The probe `tests/e2e/probes/steam-review-2026-09.spec.js`
passes 4/4 in a browser:
- MULTIPLAYER on the title menu leads to the co-op / PvP console;
- a controller reaches the last achievement, with the list scrolling;
- commentary shows on enable, and READ ALL lists every entry above Settings;
- the Content Guide transcript opens from the title screen, above the gallery.

The Inventory schema file has the prices removed.

| Item | Code | Still needed |
| :--- | :--- | :--- |
| 1 Online | Done | Two-account tests of co-op and PvP on the uploaded build; drop any tag that fails |
| 2 Commentary | Done | Check on the uploaded build, or remove the category |
| 3–4 IAP | Schema file done | Upload the schema in Steamworks; make sure IAP isn't declared; use the reviewer note |
| 5 Controller | Done | Deck + PC pad pass with the keyboard unplugged |
| 6 Mature | Done | Survey: keep non-explicit sexual content only, untick nudity; paste the access text |
| 7 Chat | — | Survey: untick in-game chat |

Not changed: the LB+RB+R3 gallery shortcut still reads only the browser gamepad API.
The Settings button covers controller access instead.

## Summary

| # | Failure | Root cause | Fix | Who |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Online PvP / Co-op not found | Multiplayer exists, but only at the end of New Run → hero → Armory → Embark, labelled "deploy". Nothing on the title menu says multiplayer. PvP has no two-account test yet. | A **MULTIPLAYER** title-menu entry that opens the Tactical Net console (CO-OP / PVP, Steam lobbies, invite). Two-account tests of both modes. Notes state the variant: **Online** (Steam lobbies + relay). | Code: Claude. Test: publisher + a second account. |
| 2 | "Commentary available" found nothing | Commentary only shows during active gameplay: the run-start entry fires during the intro (not yet "gameplay"), and the Vault and Armory entries fire in menus, so all are skipped. There are 11 short text entries in total. | Show commentary in menus too; fire run-start once gameplay is live; add a **Developer Commentary** list under Settings / About with every entry. Or remove the category. | Code: Claude. Category: publisher. |
| 3 | `GetReport` for MicroTxn | Three itemdefs carry prices (Relic Decryption Key $1, 5-key pack $4, 15-key pack $10). No MicroTxn purchase is live (`HB_STEAM_MICROTXN_ENABLED=0`). | **Remove the prices** (recommended, below). Tell Valve there are no in-app purchases; `GetReport` doesn't apply. | Publisher (schema + store page). |
| 4 | Steam Wallet not verifiable | Same prices, while the Vault's Store tab is hidden, so there is nothing to buy. | Same as 3. | Publisher. |
| 5 | Achievements can't be scrolled by controller | Achievement cards are non-focusable `div`s; the controller can only reach Close and Copy Save. The Vault's inventory cards have the same flaw. | Make cards focusable; right stick scrolls any scrollable panel; a controller-only probe over every menu. | Code: Claude. Hardware pass: publisher. |
| 6 | "Some nudity or sexual content" not found | The sexual content is real: Sister Val's dialogue at Camp Tallow (`[SENSUAL / EMBRACE]`, `[DEEPEN INTIMACY]`). But the reviewer shortcut can't show it: the F9 gallery's romance buttons call `openNpcDialogueTree`, which refuses outside gameplay. Two gallery items (the veiled-nudity log and the Tallow ledger) exist **only** in the gallery, not in the game. | The gallery opens dialogue in a reader mode from any screen; gallery-only items removed; the survey answers only what's in the game; notes give F9 and the in-game route. | Code: Claude. Survey: publisher. |
| 7 | "Filtered in-game chat" not found | There is no in-game chat. | Remove it from the Content Survey. | Publisher. |

## 1. Online PvP and Co-op

- **Today:** Title → NEW RUN → hero screen → ENTER ARMORY → EMBARK opens the Tactical
  Net console. That console has the SOLO / CO-OP / PVP cards, public Steam lobbies,
  invite-friend, room codes and the relay. Co-op passed with two Steam accounts on
  2026-09-24 (Deck host, PC guest). PvP has not had a two-account test.
- **Game change:** a **MULTIPLAYER** button on the title menu. It runs the same hero
  and Armory steps, then opens Tactical Net at mode select with the lobby list
  showing. Its label is localized in all 7 languages, and a controller can reach it.
- **Tests:** two real accounts on the uploaded build and the production relay:
  - co-op: host, invite, join from the lobby list, deploy, play 5 minutes, extract;
  - PvP: the same, plus one kill.

  Keep a tag only if its mode passes.
- **Steamworks:** keep **Online PvP** and **Online Co-op** (and the Steam lobby feature)
  only for passing modes. No LAN tag: the game has no LAN mode.
- **Reviewer note:**

  ```text
  ONLINE MULTIPLAYER (Online co-op and online PvP, 2 players, via Steam lobbies and our relay server)
  Title menu → MULTIPLAYER → ENTER ARMORY → EMBARK → the deployment console opens on CO-OP (PVP is beside it).
  Host: choose HOST, then INVITE FRIEND (Steam overlay) or leave the lobby public.
  Join: the second account opens the same screen and selects the lobby from PUBLIC STEAM LOBBIES, or accepts the Steam invite.
  Both players press READY; the host presses DEPLOY SQUAD.
  ```

## 2. Developer commentary

- **Cause:** `showDeveloperCommentary` requires the gameplay phase and the gameplay
  HUD. Of the 11 entries:
  - `run_start` fires during the intro, before those are true, so it never shows;
  - `steam_vault` and the Armory entries fire in menus, so they never show;
  - the rest need specific events (the Queen, black boxes, room types).
- **Game change:**
  1. Commentary cards can show over menus, not only the gameplay HUD.
  2. `run_start` is re-fired when gameplay becomes ready, not during the intro.
  3. A **Developer Commentary** screen (Settings → Developer Commentary) lists every
     entry, so the feature is readable at any time.
  4. When the toggle is switched on, the first entry shows right away as confirmation.
- **Steamworks:** keep **Commentary available** once 1–4 pass in the uploaded build.
  Otherwise remove it now and add it back later.
- **Reviewer note:**

  ```text
  DEVELOPER COMMENTARY
  Settings → COMMENTARY MODE: ON. A commentary card appears immediately, and more appear during play (run start, first black box, special rooms, Queen fight, the Vault).
  All commentary can also be read at any time from Settings → DEVELOPER COMMENTARY → READ ALL.
  ```

## 3–4. In-app purchases, Steam Wallet and GetReport

- **Cause:** itemdefs 4001, 4005 and 4015 have prices, so Valve treats the app as
  selling items. The Vault's Store tab is hidden because purchases are off
  (`HB_STEAM_STORE_ENABLED=0`, `HB_STEAM_MICROTXN_ENABLED=0`), so the reviewer finds
  nothing to buy.
- **Recommended decision: no in-app purchases at launch; remove the prices.**
  - Paid keys that open random caches are paid loot boxes. They carry player backlash
    and legal risk (odds disclosure; Belgium and the Netherlands).
  - They need Wallet and `GetReport` verification, which blocks this review.
  - They contradict the 2026-09-11 decision to keep the IAP claim removed.
  - Keys stay earnable in play (boss-kill milestone grant), so no feature is lost.
  - Monetization can come back later as direct-purchase cosmetics with no randomness.
- **Steamworks (publisher):**
  1. Inventory Service schema: remove `price` / `price_category` from 4001, 4005 and
     4015, and mark 4005 and 4015 `store_hidden: true`.
  2. Upload and publish the schema.
  3. Store page: make sure **In-App Purchases** is not declared.
- **Repo:** update `steam/inventory_schema_hunker_bunker.json` to match, and keep the
  `purchases` claim unaccepted. The Vault already hides purchasing when the backend
  reports purchases off.
- **Reviewer note:**

  ```text
  IN-APP PURCHASES
  This build has no in-app purchases. We removed the prices from the three Steam Inventory item definitions that had them (4001, 4005, 4015); those items can only be earned in play. We do not use the Microtransactions API, so GetReport does not apply.
  ```

- **If you'd rather sell keys now:** it is a separate, longer path, and not ASAP:
  - enable the Steam-hosted item store and link it from the Vault;
  - answer that only Steam Inventory items are sold, so `GetReport` doesn't apply to
    MicroTxn;
  - add a purchasable-item route to the notes;
  - disclose cache odds.

## 5. Full Controller Support

- **Cause:** `renderAchievementCards` builds plain `div`s. Controller navigation
  moves between focusable elements, so it can reach only Close and Copy Save, and
  the grid never scrolls. The Vault's inventory cards (`vault-item-card`) are also
  clickable but unfocusable.
- **Game change:**
  1. Achievement cards become focusable list items (with an accessible label). Moving
     focus scrolls them into view.
  2. Vault item cards become focusable buttons.
  3. The right stick scrolls the nearest scrollable panel in any menu: achievements,
     codex, archive logs, settings, lore text, store odds.
  4. A controller-only probe walks every title-menu screen and every modal from first
     to last item with gamepad input alone, and fails on any control it can't reach.
     This covers the 9-11 route: resolution, UI scale, text speed, callsign keyboard,
     achievements, pause/settings/quit, multiplayer, Vault/Foundry.
- **Hardware:** the owner runs the same route on the Deck and a pad on PC with the
  keyboard unplugged.
- **Steamworks:** keep **Full Controller Support** only after the hardware pass.
  Otherwise switch to Partial Controller Support for this submission.

## 6. Mature content: nudity or sexual content

- **What's really in the game:**
  - Camp Tallow → talk to the leader → Sister Val's branching dialogue: non-explicit
    sensual and sexual scenes in text, with interstitial art. Other NPC trees
    (Kaelen, Aria, Dr. Nahl) have intimacy branches of the same kind.
  - Suicide/self-sacrifice: the EMPTY HUSK and SCORCHED SKY endings, Reyes's C11
    letter and Chen's B03 terminal are all real.
- **Gallery-only (not in the game):** "Maintenance Log 04 — Bio-Incubation Wing"
  (veiled nudity) and "Unofficial Ledger — Camp Tallow".
- **Game change:**
  1. The F9 / LB+RB+R3 gallery shows NPC dialogue as a read-only transcript from
     any screen, including the title menu.
  2. The two gallery-only items are removed, and each gallery entry names where the
     same content is found in play.
  3. The gallery gets a visible button, **Settings → Content Guide (Mature Themes) →
     OPEN**, so reviewers don't rely on a hotkey.
- **Survey (publisher):**
  - Keep **Some Nudity or Sexual Content** only as *non-explicit sexual content*
    (dialogue).
  - Untick any **nudity** sub-option, since none is depicted.
  - Keep suicide/self-harm.
- **"How do we access the mature content?" text:**

  ```text
  Fastest: open Settings → CONTENT GUIDE (MATURE THEMES) → OPEN (works with keyboard, mouse or controller; F9 also opens it). Under "Sensual Storylines", select SISTER VAL to read the full dialogue, including the [INTIMATE TOUCH], [SENSUAL / EMBRACE] and [DEEPEN INTIMACY] branches. In play, the same dialogue is reached at Camp Tallow by talking to Sister Val.
  Self-sacrifice/suicide themes: in the same screen, select EMPTY HUSK or SCORCHED SKY, or the Reyes C11 / Chen B03 logs (found in play as recoverable logs).
  Content is text dialogue and still artwork; there is no depicted nudity or sexual act.
  ```

## 7. Filtered in-game chat

- **Cause:** the game has no player chat of any kind. Co-op and PvP use no text or
  voice channel.
- **Survey (publisher):** untick **In-game chat**. (If player communication is added
  later, use preset quick-chat and pings, which need no filter, and re-answer then.)

## Order of work

| When | Work | Owner |
| :--- | :--- | :--- |
| Today | Steamworks: remove prices from 4001/4005/4015 and publish the schema; untick in-game chat; fix the nudity sub-answers; make sure IAP isn't declared. | Publisher |
| Today | Code: achievement and Vault cards focusable; right-stick scrolling; controller-only probe. | Claude |
| Today | Code: commentary in menus, run-start re-fire, the Developer Commentary screen, confirmation on enable. | Claude |
| Today | Code: MULTIPLAYER title entry; mature gallery reader mode; gallery-only items removed; Content Review button; schema file prices removed. | Claude |
| Day 2 | Build from a clean worktree, bump the version, upload to `beta`. | Publisher (steamcmd) |
| Day 2 | Two-account co-op and PvP test on the uploaded build; controller-only hardware pass on the Deck and PC. | Publisher + second account |
| Day 2 | Set the tested build live on default, paste the reviewer notes (only the verified sections), mark ready for review. | Publisher |

## Evidence to keep

- The build ID and branch of the resubmitted build.
- A two-account test record per multiplayer mode (session logs from both machines).
- The controller-only probe result, plus the Deck/PC hardware route record.
- Screenshots of the saved Inventory schema, Content Survey and store-page features.
