# Sprint 31 PvP log 18 and release readiness

Status: evidence report · Owner: repository maintainers · Updated: 2026-08-27 · Review: Sprint 31 integration and release-PR gate

## Outcome

The packaged Steam PvP session in `docs/logs/log18.json` successfully joined a relay room, synchronized both players, and entered gameplay without a multiplayer disconnect or timeout. It also exposed a critical damage-scale mismatch: the server reported a standard PvP hit as `10` on its 100-point health scale, while the local client applied that value to a three-heart health pool. The Engineer therefore went from 3/3 hearts to 0/3 from one shot.

The current `dev/sprint-31` branch converts server-scale PvP damage into local hearts. A standard 10-point hit now removes one heart. The branch also contains the remote chassis skin and walk-animation synchronization needed for the Tank opponent observed in this session. Automated regression coverage protects the exact logged damage case, but a new two-account packaged Steam session remains mandatory before release promotion.

Oxygen depletion did occur in this log (99% at 88.447 seconds and continued depletion after respawn), so the logged build does not reproduce a permanently frozen oxygen meter. The branch still includes regression coverage for oxygen drain, enemy damage, and cliff-edge falling because those failures were reported together and shared gameplay-state/collision risk.

## Source and baseline

- Evidence: local `docs/logs/log18.json`, a 45 MB ignored runtime artifact. The raw log remains outside version control; this report records its release-relevant evidence.
- Runtime: Steam-installed packaged Electron build on Windows 10, Steam app 4957040.
- Session: 238.889 seconds, local Engineer versus remote Tank in PvP.
- Integration branch: `dev/sprint-31`.
- Comparison base: `origin/mothership`, merge base `e66ef286` (Sprint 30 base).
- Current package version: `2.3.1-beta`. No version bump, tag, GitHub release, or Steam upload is part of this integration PR.

## PvP evidence timeline

| Session time | Evidence | Interpretation |
| --- | --- | --- |
| 35.372s | Relay join sent | Matchmaking transport started normally. |
| ~64.4s | Both peers ready; match start | Lobby readiness completed. |
| 67.404s | Remote Tank created at `(47, 47)` with sprite fallback | Remote identity and spawn arrived. |
| 67.430s | Remote 3D avatar ready | The fallback lasted about 26 ms; model loading completed. |
| 68.308s | Gameplay phase entered | Both clients reached the playable match. |
| 88.447s | Oxygen logged at 99% | Oxygen was draining in the packaged session. |
| 90.5-94.3s | Three local weapon shots | Local firing events were active. |
| 94.662s | `player damaged`, amount 3, HP 0/3, reason `pvp-rival` | A server damage value of 10 was interpreted on the local heart scale and caused a one-hit death. |
| ~100.2s | Game over, rival kills 0 | Death handling completed, but the damage balance was invalid. |

No multiplayer error, relay timeout, or disconnect entry appears in the captured session.

## Root cause and branch fix

| Area | Root cause or observed risk | Branch behavior |
| --- | --- | --- |
| PvP damage | Server damage uses a 100-point scale; local vitals use 3-4 hearts. | `handleRemotePlayerDamaged` converts server-scale values to local hearts; 10 becomes one heart on a three-heart player. |
| Remote presentation | The opponent initially used a sprite fallback and needed chassis/polish synchronization plus rigged locomotion. | Lobby/server payloads synchronize chassis state and the remote 3D avatar updates its walk animation. |
| Enemy contact | Contact pursuit could pin the player without producing useful separation. | Stalker contact applies damage and snail-style recoil before pursuit resumes. |
| Cliff edges | Fall detection waited too far past the rendered lip, producing a sticky shelf at the void boundary. | Cliff/canyon fall detection begins as the player crosses the rendered half-tile lip. |
| Oxygen | A gameplay-state regression could suppress normal drain. | Oxygen drain runs outside the safe bubble and is covered with an inactive-mission regression test. |

## Branch scope understood

The 37 commits currently unique to `dev/sprint-31` form these integration groups:

- Third-person shoulder camera and related aiming/presentation work.
- Procedural sky layers, cloud/transient rendering, and their supporting assets.
- Voice, foley, and audio orchestration with new packaged audio assets.
- Armory, menu, settings, input, controller, touch, and Steam Deck refinements.
- Universal class-door transitions, variants, and skip behavior.
- Debug console grants, unlimited resources/shells, and unlimited ammo support.
- Gameplay corrections for damage, oxygen, cliff falling, enemy contact, chassis loading, remote PvP models/animation, and PvP damage scaling.

This is a large integration branch (over 200 changed paths relative to `mothership`) and includes binary audio and visual assets. It should merge through an integration PR first; release metadata and distribution actions should follow on a separate release branch after acceptance.

## Performance and polish findings

The session produced 2,366 log entries: 1,720 were `PERF` warnings. Forty-five long tasks exceeded 100 ms; boot-time long tasks totaled about 1.338 seconds, with a 475 ms maximum. Adaptive quality engaged at 5.5 FPS. The final GPU average was 25.26 ms per frame (about 39.6 FPS), with a 393.3 ms maximum and 39 dropped frames.

Estimated GPU memory reached about 1.10 GiB, dominated by approximately 1.00 GiB of textures, with 226 programs and 1,352 geometries reported. These figures came from an RTX 2070 SUPER at a 1714x1071 render buffer. They make packaged performance and telemetry volume release gates, not evidence that the current branch is release-ready.

Additional lower-priority observations:

- Menu click/confirm audio identifiers were missing in places, although fallback UI sounds played.
- The death cutscene used a hazard-oriented presentation for `pvp-rival` death.
- The brief sprite fallback before the remote 3D avatar is acceptable only if it remains transient under slower packaged-load conditions.

## Verification and release-PR plan

This branch PR is the Sprint 31 integration review. After it is approved and merged, prepare a separate `release/<next-version>-beta` branch from the accepted `mothership` head. Choose the exact next version only after scope lock; do not tag or upload this development branch.

Release promotion requires:

1. Update the package version/lockfile, product state, release roadmap, and tagged release notes together on the release branch.
2. Run lint, the full test suite, presubmit, dependency audit, documentation audit, production build, and coverage.
3. Build the Electron package and run the repository's package/depot content audits.
4. Run a two-account packaged Steam PvP acceptance session. Confirm a standard hit removes one heart, both chassis skins and walk animations synchronize, reconnect works, and kill attribution is correct.
5. Run packaged performance acceptance on the target Windows PC and physical Steam Deck. Review FPS/frame pacing, GPU memory, texture residency, long tasks, and whether `PERF` logging itself is flooding the log.
6. Exercise enemy contact/recoil, oxygen drain outside the safe bubble, cliff/canyon falls at the visible lip, door skips, gamepad controls, and armory chassis selection.
7. Open the release PR from the release branch to `mothership`. Only after approval and merge should maintainers tag the version, publish the GitHub release, and upload the selected Steam beta depot.

Current release blockers are the packaged two-account PvP rerun, packaged performance acceptance, physical Steam Deck validation, and final Electron/depot audits. The old packaged log is evidence for the defect; it is not validation of the current source fix.

## Source validation completed

Validation on 2026-08-27 completed successfully for ESLint, the documentation audit, dependency-usage audit, production build, build-media audit, and all 2,459 tests. Coverage completed at 98.57% statements, 96.96% branches, 100% functions, and 100% lines for the repository's currently instrumented coverage target.

The generated-file presubmit command exited successfully, but its retail-asset check reported stale `steam/referenced-assets.json` and `steam/retail-asset-report.json`, a public payload above 2,831,155,200 bytes, and more than 160 unknown assets. Those warnings must be resolved or explicitly dispositioned during release packaging; a successful command exit alone is not release acceptance.
