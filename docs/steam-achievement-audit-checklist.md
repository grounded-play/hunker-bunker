# Steamworks Achievement Audit Checklist

This document serves as the canonical audit checklist for migrating, verifying, and maintaining parity between the local `src/achievements.js` definitions and the live Steamworks developer dashboard.

## 1. Core Parity Verification

Before any Steam release or major update, audit the following fields for every achievement:

- [x] [MIGRATED] **API Name (Key):** Matches the `key` string in `src/achievements.js` exactly. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] **Display Name:** Matches the `title` string. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] **Description:** Matches the `blurb` string. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] **Hidden (Secret) Status:** If `secret: true` in the codebase, the achievement MUST be marked as "Hidden" in Steamworks. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] **Icons:** Both unlocked and locked icon assets uploaded to Steamworks match the game's internal `icon` keys/assets. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->

## 2. 'Coming Soon' and Excluded Achievements

Some achievements are shipped in code but cannot be unlocked yet (e.g., `slay_the_queen`).

- [x] [MIGRATED] Verify that any achievement marked `comingSoon: true` in `src/achievements.js` is **NOT** published as an active achievement in Steamworks.  <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] If it must be in Steamworks for testing, ensure it is strictly confined to the internal development branch and invisible to public users. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] Confirm the UI denominator properly excludes these `comingSoon` achievements. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->

## 3. Migration and Requirement Changes

If an achievement's unlock requirements change (e.g., changing from "survive 20 minutes" to "survive 30 minutes"):

- [x] [MIGRATED] Existing users who have already unlocked the achievement locally will retain it, and Steamworks will not revoke it. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] For progress-based achievements (e.g., "Collect 12 logs"), ensure that if the target changes, the `migrateAchievements` function in `src/achievements.js` smoothly maps legacy progress to the new threshold. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] If an achievement is entirely removed, ensure the local storage loader safely drops it without crashing the UI, and mark it as "Archived" or remove it from Steamworks. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->

## 4. Specific Achievement Audits

Check off each as verified against Steamworks:
- [x] [MIGRATED] `quick_study` <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `hunkered` <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `scouts_honor` <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `tank_commander` <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `chief_engineer` <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ending_full_brood` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ending_clean_escape` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ending_mixed_crew` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ending_carriers_bargain` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ending_scorched_sky` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ending_mothership_infection` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ending_alien_exodus` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ending_outed_escape` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ending_failed_carrier` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ending_empty_husk` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `cartographer` <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `archivist` <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `kin` <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `ghost` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `gentle_drill` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `chen_thirteenth` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `reyes_courier` (Secret) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `hardened` <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] `slay_the_queen` (Secret, Coming Soon) <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
