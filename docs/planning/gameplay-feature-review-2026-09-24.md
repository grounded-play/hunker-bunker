# Gameplay Feature Review — Ten Standards and Three Priorities

Status: proposal · Owner: design & repository maintainers · Updated: 2026-09-24 · Review basis: `v2.4.11-beta` · Current branch: `dev/sprint-46`

The ten features below are what Hunker Bunker should be judged against. The review was written against `v2.4.11-beta`; the **Current state** notes reconcile it with the code on `dev/sprint-46` and the [master gaps register](../reports/master-known-gaps-and-debt-register-2026-09-23.md). Where a note says *unmeasured*, nobody has verified it in play.

> **The standard:** within the first ten minutes, a player has fought an interesting enemy, made a meaningful choice, found a rewarding surprise and wants to discover what happens next.

---

## Priority 1

### 1. Combat — enemies that make you change tactics
Encounters need more than larger groups: shield carriers, flankers, ranged suppressors, healers, ambushers and enemies that manipulate the environment. Example: a Hive Guardian protecting a spore-artillery unit while smaller creatures push the player out of cover — the player identifies and breaks the formation instead of retreating while shooting.

**Current state.** Enemy variety and boss systems exist (18 hostile types, elites, stagger); coordinated behaviour — roles that depend on each other — is not established. Needs a current-build encounter audit. Sprint 46's arrival incident gives every deployment an early fight whose make-up follows the condition, but its packs are single-role.

### 2. Replayability — ridiculous, run-defining equipment combinations
Occasionally a combination should change the whole combat strategy: a rifle that chains lightning, a freezing shotgun that shatters groups, Engineer turrets that inherit the carrier's elemental effects. The goal is **interactions** between equipment, abilities, status effects and enemies, not more equipment.

**Current state.** Transformative relics exist; 9 catalogue relics/overclocks are still `implemented: false` and excluded from live reward tables (`src/runDrops.js`, GAP-GP-06). Build diversity is unproven by extended play. Sprint 46 gave each class a distinct melee (`CLASS_MELEE_PROFILES`); whether classes *play* differently is unmeasured.

### 3. Exploration — unexpected events that interrupt the expedition
Layouts alone don't surprise. A controlled pool of events: a distress signal that may be a trap, a moving salvage convoy, a camp under attack, a wounded survivor with information, a dormant hive that wakes when machinery starts. Events offer different responses and combine with the expedition's condition — a rescue in a blackout plays differently from one in a spore bloom.

**Current state.** Ship-goal objective packages vary per campaign; optional camp quests and destinations remain comparatively templated. The arrival incident is the only condition-aware event so far. Probe data (Sprint 46) also shows consecutive deployments often repeat conditions.

---

## Priority 2

### 4. Traversal — tools that let players solve the environment
Some routes should open through player abilities rather than generated openings: Scout reaches elevated paths, Engineer deploys a limited-use bridge or bypasses machinery, Tank breaks reinforced barriers. Gives players authorship of their route and strengthens class identity, especially in co-op.

**Current state.** Destructibility and the constructible Ring 2 canyon bridge exist; class-specific traversal does not. Tank's Seismic Slam breaches frontal walls (Sprint 46), which is a start.

### 5. Rewards — high-stakes rewards worth a detour
Visible, calculated risks: an optional mini-boss guarding a powerful upgrade, an unstable vault with rare materials, a dangerous shortcut that saves oxygen. Rewards must change the rest of the expedition — a new combat ability, not +8% damage.

**Current state.** *Resolved since the review:* expedition bounties now track progress, show on the HUD and pay their full `rewardBonus` in shells on extraction (Sprint 46, `src/expeditionBounties.js`). Optional high-stakes detours do not yet exist.

### 6. Boss design — fights with unforgettable mechanics
Bosses should change the rules: a hive boss claims parts of the arena, a Cryo boss freezes pathways until thermal vents are destroyed, a mechanical boss loses weapons as its armour breaks. More health is not more decisions.

**Current state.** Phases, weak points, stagger and destruction effects exist, but only the Queen and the Sporesnail have phase-driven fight definitions (`src/bossPhases.js`); the other milestone bosses do not. Needs a player-facing review of choreography, readability and arena use.

### 7. Presentation — environments that feel like actual places
Every major destination needs its own architecture, lighting, audio, props and recognizable entrance. Camps look lived in, hives feel organically hostile, abandoned facilities hint at what happened there.

**Current state.** The register lists 24 architecture GLBs not routed into the world (GAP-RN-03) and 21 faction props room definitions cannot use (GAP-RN-04) — making existing assets reachable may do more than new models. Camps and hives became six-room compounds in Sprint 45.

### 8. Game feel — every weapon and movement action feels exceptional
Distinct recoil, sound, impact reactions and damage confirmation; satisfying sprint, landing, dash and smash; surfaces that sound different; big impacts that feel powerful without hiding threats.

**Current state.** Hitstop and combat VFX exist; the task is a coherent audit and tune. Effects stay tightly budgeted: the September 23 Deck session hit 3,277 live effects before the Sprint 45.1 cap, and Deck frame pacing is still an open blocker (GAP-RN-10/11/12).

### 9. Progression — a satisfying reason to start the next run
On returning to the ship: what was discovered, which permanent unlocks are new, which faction relationships changed, what is now available. Progression should open choices, not only raise numbers; Archives, Dossier, fabrication and the campaign ledger should read as one journey.

**Current state.** *Partly addressed:* the results screen opens with an expedition report — condition, bounty met or missed, completions, and the next ship goal with its exact shortfall (Sprint 46, `src/expeditionReport.js`). New unlocks and faction changes are not yet summarized there.

### 10. Story and cooperation — a world that responds clearly
Major choices change dialogue, opportunities, routes and later encounters; in co-op those changes are synchronized. Downed/revive and class systems should encourage cooperation, not two independent shooters.

**Current state.** Concrete gaps: the Tina-joined route is unimplemented (GAP-ST-01, #66) and irreversible ending locks are not communicated (GAP-ST-02). Co-op irreversible beats (boss phases, milestone defeats, Act 2 descent) became host-authoritative in Sprint 45.2; paired-client hardware proof is still open (#85).

---

## What to prioritize

Three improvements that could transform the experience:

| # | Focus | Scope |
| --- | --- | --- |
| 01 | **Smarter fights** | Enemy roles, coordinated attacks, interactive arenas |
| 02 | **Wild builds** | Powerful synergies, meaningful upgrade choices, different combat styles |
| 03 | **Living expeditions** | Dynamic events, secrets and optional encounters worth exploring |

They reinforce one another: dynamic encounters create reasons to experiment with builds, powerful builds make optional dangers attractive, and surprising events make revisiting familiar campaign geography worthwhile.

### Recommended next goal
A **combat-and-discovery overhaul of one complete expedition**, not ten parallel feature projects. A Ring 1 slice containing:
- several coordinated enemy encounters,
- a handful of dramatic build combinations,
- two or three genuinely surprising optional events,
- a rewarding return to the ship.

Proof: recorded gameplay with different classes and seeds, and observations from players who have not seen the game — not scripted probes alone.

### What this does not need
AAA quality does not require AAA feature count. No 100 additional weapons, no open world, no PvP expansion, no live-service economy. The existing combat, exploration and progression systems need to consistently produce moments players remember.
