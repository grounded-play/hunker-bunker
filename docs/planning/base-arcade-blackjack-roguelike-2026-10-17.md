# Base Arcade Expansion: "BLACK-ICE 21" (Blackjack Roguelike)

**Date:** 2026-10-17  
**Module:** `src/blackjackArcade.js`, `src/data/baseModules.js`, `src/data/crashSiteBuild.js`, `src/installedBasePresentation.js`, `src/propInteractions.js`, `src/bank.js`, `src/threeGame.js`

---

## 1. Overview & Vision

Hunker Bunker now supports multiple distinct arcade cabinet experiences across the subterranean world:
1. **Field Cabinets ("SUB-CRUST PROTOCOL: 1984"):**
   * Spawns procedurally in bunker recreation bays and outpost ruins (`roomDressingKits.js`).
   * Playable vector-shmup minigame (`arcadeCabinetMinigame.js`) with persistent high score leaderboard, Tina's score challenge, and cosmetic decals/sheens.
2. **Base Recreation Cabinet ("BLACK-ICE 21"):**
   * A craftable/purchasable furniture module (`arcade_blackjack_cabinet`) built for the crash site home bunker.
   * A high-stakes, subterranean **Blackjack Roguelike** played against automated dealer **C.H.I.P.-0** (Debt Compliance Automaton).
   * Takes real in-game `coin` wagers and pays out winnings directly into the player's bank balance.
   * Features cybernetic hack chips (Cryo Lock, Thermal Ace, EMP Shield) and tier win streaks with metagame buffs.

---

## 2. Construction & Unlocks

### Supplies Required
To construct the Black-Ice 21 cabinet at the base:
* **Tech:** `25 TECH` (Display raster board, microprocessors)
* **Coin:** `30 COIN` (Coin-op firmware hopper & licensed ROM)
* **Med / Bio:** `5 MED` (Biometric verification pad)
* **Scrap:** `15 SCRAP` (Chassis framing)

### Construction Socket
* Authored in `CRASH_SITE_BUILD.constructionSockets`:
  ```javascript
  { id: 'base-arcade', kind: 'arcade', x: 4.5, z: 12.5, yaw: 0 }
  ```
* Placed in the base living quarters / recreation corner next to the cot and console.
* Persisted in `hb_bank` unlocks as `unlocks.baseArcadeBlackjack`.

---

## 3. Minigame Mechanics: "BLACK-ICE 21"

### Rules
* **Deck:** Standard 52-card shoe (Spades, Clubs, Diamonds, Hearts).
* **Dealer AI:** Dealer hits on soft 16, stands on 17+.
* **Natural Blackjack:** Pays 3:2.
* **Standard Win:** Pays 1:1 (2× bet).
* **Push:** Wager returned.

### In-Game Betting System
* Wager tiers: `[2, 5, 10, 25, 50] COIN`.
* Deducted on deal via `game.bank.spend({ coin: bet })`.
* Winnings deposited on round resolution via `game.bank.deposit({ coin: payout })`.

### Cybernetic Hack Chips (Roguelike Mechanics)
Each session grants 3 tactical hack chips:
1. **CRYO LOCK:** Freezes the dealer's card processor; forces dealer to stand immediately on their current visible total.
2. **THERMAL ACE:** Modulates card totals by ±2 to prevent a bust or reach 21.
3. **EMP SHIELD:** If the player busts, burns the bust card and replaces it with a safe draw.

### Win Streaks & Tier Progression
* Consecutive wins advance the player along depth tiers (Tier 1: Crust, Tier 2: Mantle, Tier 3: Core).
* Reaching 3-win streaks unlocks bonus coin jackpots and in-run buffs.

---

## 4. Interaction & Controls

* Approaching the base cabinet displays: `[E] PLAY BLACK-ICE 21 (BLACKJACK)`.
* In-cabinet controls:
  * `[↑ / ↓]` Adjust Bet
  * `[SPACE / ENTER]` Deal / Next Round
  * `[1 / H]` Hit
  * `[2 / S]` Stand
  * `[3 / D]` Double Down
  * `[4 / K]` Deploy Cybernetic Hack Chip
  * `[ESC]` Exit Cabinet
