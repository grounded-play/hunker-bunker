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

The key prices are kept (in-app purchases are intended). The Vault sells through both the Item Store and Microtransactions, and `GetReport` reconciliation is built.

| Item | Code | Still needed |
| :--- | :--- | :--- |
| 1 Online | Done | Two-account tests of co-op and PvP on the uploaded build; drop any tag that fails |
| 2 Commentary | Done | Check on the uploaded build, or remove the category |
| 3–4 IAP | Done: Item Store + MicroTxn in the Vault, `GetReport` reconciliation (`a001b823`) | Turn on production flags; real test purchase; run the `GetReport` CLI and send the output; declare IAP |
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
| 3 | `GetReport` for MicroTxn | Microtransactions were off in production, and no `GetReport` reconciliation existed. | `GetReport` reconciliation + CLI; a real test purchase; send the output. | Code: Claude (done). Test: publisher. |
| 4 | Steam Wallet not verifiable | Purchases were off in production, so the Vault hid its Store tab. | Store tab with Item Store + MicroTxn checkout; production flags on. | Code: Claude (done). Flags: publisher. |
| 5 | Achievements can't be scrolled by controller | Achievement cards are non-focusable `div`s; the controller can only reach Close and Copy Save. The Vault's inventory cards have the same flaw. | Make cards focusable; D-pad up/down scrolls any panel with nothing focusable in it; a controller probe for Achievements. | Code: Claude. Hardware pass: publisher. |
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

**Owner decision (2026-09-30): in-app purchases stay, through both the Steam Item Store
and Microtransactions.** An earlier draft of this plan recommended removing the prices;
that was reverted in `20b7162e`. The economy direction is in the
[economy master plan](economy-master-plan-2026-09-30.md).

- **Cause:** the priced keys (4001, 4005, 4015) exist, but production had purchases off
  (`HB_STEAM_STORE_ENABLED`, `HB_STEAM_MICROTXN_ENABLED` and `HB_STEAM_ITEM_STORE_ENABLED`
  all off). So the Vault hid its Store tab, and the reviewer found nothing to buy. No
  `GetReport` reconciliation existed.
- **Game change (done, `a001b823`):**
  - the Vault's Store tab appears whenever either path is on;
  - with the Item Store on, each key card opens its own Item Store page in the Steam
    overlay, and the inventory refreshes afterwards;
  - buying no longer requires Community Market eligibility;
  - `server/steamMicroTxnReport.js` reconciles `GetReport` against recorded purchases
    every 6 h. `server/scripts/microtxn-report.js` prints and saves the report for
    Valve.
- **Publisher steps:**
  1. Steamworks → Inventory Service: make sure the Item Store is enabled and the three
     priced items are published. Confirm the `VLV` price categories match the Vault's
     $0.99 / $3.99 / $9.99 (see the economy plan, P3).
  2. Steamworks → Microtransactions: make sure the app is enabled for the
     Microtransactions API with the publisher key.
  3. Production `~/server/backend.env`: set `HB_STEAM_STORE_ENABLED=1`,
     `HB_STEAM_MICROTXN_ENABLED=1`, `HB_STEAM_ITEM_STORE_ENABLED=1`, then redeploy the
     backend.
  4. On a real (non-sandbox) account, buy one key through the in-game Store
     (Microtransactions) and one through the Item Store.
  5. Run
     `docker exec hunker-bunker-backend node server/scripts/microtxn-report.js --since <time before the test>`
     and send Valve the output plus the test account name. If it's too long, reply to
     the review ticket with it.
  6. Store page: declare in-app purchases.
- **Reviewer note:**

  ```text
  IN-APP PURCHASES
  Purchases use both Steam Inventory items sold in the Steam Item Store and the Microtransactions API.
  Route: Title menu → NEW RUN → ◈ STEAM VAULT → STORE tab. Each key card has BUY VIA STEAM (Microtransactions checkout in the Steam overlay, paid from the Steam Wallet). OPEN IN STEAM ↗ on the same tab opens our Steam Item Store.
  GetReport: we reconcile our in-game economy against settled transactions with ISteamMicroTxn/GetReport automatically every 6 hours. The response for our test transaction is attached (test account: [ACCOUNT NAME]).
  ```

## 5. Full Controller Support

- **Cause:** `renderAchievementCards` builds plain `div`s. Controller navigation
  moves between focusable elements, so it can reach only Close and Copy Save, and
  the grid never scrolls. The Vault's inventory cards (`vault-item-card`) are also
  clickable but unfocusable.
- **Game change:**
  1. Achievement cards become focusable list items (with an accessible label). Moving
     focus scrolls them into view.
  2. Vault item cards become focusable buttons.
  3. **Done instead:** D-pad up/down scrolls any panel that has nothing focusable
     in it (lore, logs, transcripts, the commentary list). The right stick stays the
     menu cursor.
  4. **Done:** the probe drives Achievements by D-pad to the last card.
     **Not done:** a probe that walks every menu. The 9-11 route (resolution, UI
     scale, text speed, callsign keyboard, achievements, pause/settings/quit,
     multiplayer, Vault/Foundry) is covered by the hardware pass below.
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
| Today | Steamworks: Item Store and Microtransactions enabled; untick in-game chat; fix the nudity sub-answers; declare IAP. | Publisher |
| Today | Code: achievement and Vault cards focusable; right-stick scrolling; controller-only probe. | Claude |
| Today | Code: commentary in menus, run-start re-fire, the Developer Commentary screen, confirmation on enable. | Claude |
| Today | Code: MULTIPLAYER title entry; mature gallery reader mode; gallery-only items removed; Content Review button; Item Store + MicroTxn Vault; `GetReport`. | Claude |
| Day 2 | Build from a clean worktree, bump the version, upload to `beta`. | Publisher (steamcmd) |
| Day 2 | Two-account co-op and PvP test on the uploaded build; controller-only hardware pass on the Deck and PC. | Publisher + second account |
| Day 2 | Set the tested build live on default, paste the reviewer notes (only the verified sections), mark ready for review. | Publisher |

## Evidence to keep

- The build ID and branch of the resubmitted build.
- A two-account test record per multiplayer mode (session logs from both machines).
- The controller-only probe result, plus the Deck/PC hardware route record.
- Screenshots of the saved Inventory schema, Content Survey and store-page features.
