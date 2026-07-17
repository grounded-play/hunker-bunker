# Steamworks Achievement Audit Checklist

This document serves as the canonical audit checklist for migrating, verifying, and maintaining parity between the local `src/achievements.js` definitions and the live Steamworks developer dashboard.

## 1. Core Parity Verification

Before any Steam release or major update, audit the following fields for every achievement:

- [ ] **API Name (Key):** Matches the `key` string in `src/achievements.js` exactly.
- [ ] **Display Name:** Matches the `title` string.
- [ ] **Description:** Matches the `blurb` string.
- [ ] **Hidden (Secret) Status:** If `secret: true` in the codebase, the achievement MUST be marked as "Hidden" in Steamworks.
- [ ] **Icons:** Both unlocked and locked icon assets uploaded to Steamworks match the game's internal `icon` keys/assets.

## 2. 'Coming Soon' and Excluded Achievements

Some achievements are shipped in code but cannot be unlocked yet (e.g., `slay_the_queen`).

- [ ] Verify that any achievement marked `comingSoon: true` in `src/achievements.js` is **NOT** published as an active achievement in Steamworks. 
- [ ] If it must be in Steamworks for testing, ensure it is strictly confined to the internal development branch and invisible to public users.
- [ ] Confirm the UI denominator properly excludes these `comingSoon` achievements.

## 3. Migration and Requirement Changes

If an achievement's unlock requirements change (e.g., changing from "survive 20 minutes" to "survive 30 minutes"):

- [ ] Existing users who have already unlocked the achievement locally will retain it, and Steamworks will not revoke it.
- [ ] For progress-based achievements (e.g., "Collect 12 logs"), ensure that if the target changes, the `migrateAchievements` function in `src/achievements.js` smoothly maps legacy progress to the new threshold.
- [ ] If an achievement is entirely removed, ensure the local storage loader safely drops it without crashing the UI, and mark it as "Archived" or remove it from Steamworks.

## 4. Specific Achievement Audits

Check off each as verified against Steamworks:
- [ ] `quick_study`
- [ ] `hunkered`
- [ ] `scouts_honor`
- [ ] `tank_commander`
- [ ] `chief_engineer`
- [ ] `ending_full_brood` (Secret)
- [ ] `ending_clean_escape` (Secret)
- [ ] `ending_mixed_crew` (Secret)
- [ ] `ending_carriers_bargain` (Secret)
- [ ] `ending_scorched_sky` (Secret)
- [ ] `ending_mothership_infection` (Secret)
- [ ] `ending_alien_exodus` (Secret)
- [ ] `ending_outed_escape` (Secret)
- [ ] `ending_failed_carrier` (Secret)
- [ ] `ending_empty_husk` (Secret)
- [ ] `cartographer`
- [ ] `archivist`
- [ ] `kin`
- [ ] `ghost` (Secret)
- [ ] `gentle_drill` (Secret)
- [ ] `chen_thirteenth` (Secret)
- [ ] `reyes_courier` (Secret)
- [ ] `hardened`
- [ ] `slay_the_queen` (Secret, Coming Soon)
