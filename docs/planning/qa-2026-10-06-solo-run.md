# QA — 27-minute solo run, 2026-10-06

**Capture:** `hunker-bunker-session-2026-10-06T22-52-30-009Z-mux9xn5p-uzr.json` in the session-log drop box.
- Build `2.4.16-beta` (`b8b3f3bc`), Steam Deck, controller plus touch.
- Engineer; died at 27 min (cryo hazard).
- Banked: 80 tech, 30 med, 5 coin. Carried at death: 31 tech, 11 coin, 18 med.

What the owner said:
- "We need to make tech easier to gather; it was too hard to get the coins and tech needed for the Foundry to open."
- "The hallways were better flowing."
- "I liked the rooms with names, but more should be like that; near the start there are always none."
- "I should be able to talk to the camp members. I tried to drop the companion off, but they didn't stay, and I couldn't talk to people at the camp either."

## Fixed

### 1. Settling a survivor at a camp could not happen — fixed

**What the log shows:**
- Camp Meridian was found at 19.6 min.
- The HUD offered "PRESS E · SETTLE SURVIVOR AT CAMP MERIDIAN", which pays 25 med and 15 coin (enough to open the Foundry).
- No `camp-settler-delivered` event appears anywhere in the run.

**Two causes:**
- **A lore terminal shadowed the camp.** Interact ran lore terminals before camps. The first press opened the ration-ledger terminal beside the camp, and its modal took input, so the camp check refused. Every later press near that terminal re-opened it.
- **Tapping the prompt did nothing.** The prompt was tapped twice on the touchscreen (1190 s, 1192 s), and the prompts were not interactive.

**Fix:**
- A terminal already read no longer shadows anything; it stays re-readable when nothing else claims the press (`interactWithLoreTerminal({ unreadOnly })`).
- Tapping any on-screen action prompt performs it.
- Tests: `src/threeGame.interactionCycling.test.js`.

### 2. Foundry inputs too scarce — tuned

**What the log shows:**
- About half of all pickups were ammo, most collected at a full mag (48/48) and simply lost.
- Coin was 9% of drops at 1 each. Only 5 coin was ever banked; the Foundry needed 10.

**Fix:**
- **Surplus ammo becomes tech salvage:** one tech per four rounds that don't fit, at least one per pickup (`src/ammoSurplus.js`, with a test).
- **Coin's share of drops** rises from 9% to 13%, taken from ammo. The room and junk tables rise likewise.
- **Foundry activation** drops from 25 tech / 10 coin / 5 med to **20 / 8 / 5**.
- Settling a survivor (+15 coin) now works too (item 1).

### 3. The coolant siphon was a one-shot kill — fixed

"SIPHON CRYO CHEMICAL" dealt 10 damage, a leftover from the old 100-HP scale; health is three hearts. It now costs one heart. A test keeps any prop interaction at one heart or less.

## Planned (design needed)

- [ ] **Named rooms near the start.** The rooms with title cards ("MERIDIAN · WORKSHOP") are authored compound rooms. They only exist around camps and sites, and the nearest camp here was 19 min out. Options:
  - (a) place one authored compound (a supply depot or outpost) in the spawn ring of every run;
  - (b) give ordinary rooms with a non-generic role a title card from role and theme ("CRYO ENGINEERING BAY"), and make `generic` rarer in `chooseRoomRole`. Today `generic` is a third of shallow rooms.

  Either needs names in all seven languages.
- [ ] **Talk to camp members.** A camp has one interaction slot, filled in priority order: settle survivor, workbench, lockdown, talk (only when the leader has a new story beat), support, quest, favor. So "talk" disappears behind other actions and after the story beats run out.
  - Proposal: a camp menu, or interaction cycling (C / right-stick click) across the camp's actions.
  - Then add a TALK that always works: ambient lines once the beats are used.
  - Individual camp members are not interactable at all yet.
- [ ] **Companion stuck.** From 8 min on, the companion logged `companion-repath`/`companion-relocated` every 5–10 s (with `id: null`) for the rest of the run: it couldn't path and kept teleporting. Investigate the follow pathing in maze chunks, and why the id is null in the log.
- [ ] **Verify on hardware:**
  - settle a survivor at a camp with a lore terminal nearby, by button and by tap;
  - confirm a Foundry is affordable within one ~25-minute run.
