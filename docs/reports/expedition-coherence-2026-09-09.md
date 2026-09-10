# Expedition coherence implementation report

Date: 2026-09-09. Baseline `93ff756`, working branch `dev/sprint-33`, version 2.3.2-beta.

## Review and plan

Inventoried 380 tracked Markdown documents and 75,200 lines. The inventory records titles, open checklist counts and relevant gap signals; canonical plans and recent reports were then checked against live consumers. Historical open checklists were not treated as current bugs. The detailed execution plan is saved in the repository at `docs/planning/expedition-coherence-plan-2026-09-09.md`.

Confirmed that patches are already completed and merged. Corrected two stale Product State claims: depth elites and three companion contracts have runtime consumers. Preserved the completed Armory and patch work.

## Implemented in this pass

| Package | Result |
| --- | --- |
| E1: run boundaries and rewards | Run equipment clears before vitals reconstruction; uncollected world gear is removed and disposed. Continuation respawns preserve equipment. Duplicate/inactive equips are rejected, reward rolls avoid equipped and pending gear, and unsupported elemental synergy bonuses are no longer advertised. |
| E2: pacing and story | Director oxygen uses modified capacity and suppresses extra harassment at critical reserve. Existing enemies/drain remain. Depth crossings give contextual return-route guidance; debriefs distinguish persistent banked progress from temporary builds and suggest a practical next attempt. |
| E3: focus and lighting | Seven-tap blur is normalized; two passes preserve constant brightness. A protected band includes operator/aim lead, with smooth edge blur and axis-correct pixel offsets. Existing adaptive/loading guards remain. |
| E4: procedural effects | Flat world gear becomes distinct overclock/relic 3D cores with orbit ring and rarity beacon. Four flat impact discs become six directional spark shards and a contact ring. Resources are owned and cleaned; no new point lights or media files. |
| E5: verification and records | Focused and full tests, lint, build/media, presubmit and documentation checks; real-browser deployment, gear lifecycle and pixel-level blur verification; gameplay captures after doors finish opening. |

## Measured evidence

- Latest integrated suite: **2,645 tests across 297 files pass**. Includes eight new coherence regressions. Lint passes.
- Production build and 50-item required-media audit pass. Generated presubmit passes.
- Documentation audit and whitespace check pass.
- Browser: Armory → solo deployment → active gameplay; both camera views captured without page errors.
- Live capacity check: **100 → 60 → duplicate remains 60 → reset restores 100**. Pending gear after reset: **0**.
- World loot: three depth-tested components, with independently owned geometry.
- Actual two-pass shader readback: input RGBA **[64,128,192,255]**, output **[64,128,192,255]**.
- The initial screenshot route captured transition doors. It was corrected to wait for gameplay input and the transition overlay to clear, then rerun successfully.

## Scope of visual evidence and concurrent changes

Other editors were simultaneously changing the same branch, including focus policy, CSS blur removal, ambient/key lighting, moving shadows and other presentation work. Those changes were preserved; their authorship and broader acceptance belong to their own reports. The full-suite count is a timestamped result for the combined working tree, not a guarantee about edits arriving afterward.

The browser gameplay route used the production preview to avoid development hot reload. The shader readback and isolated effect gallery imported source modules from the development preview. Captures show readable operator/environment/HUD in both views. Software-rendered browser results do not establish real-GPU frame pacing, final artistic lighting acceptance, or that a full expedition is fun and balanced.

## Remaining work

1. Recorded 35–45 minute fresh-player Proof Run: purpose, oxygen, crossing choice, three builds, enemy counterplay, and retention comprehension.
2. Corpo, Crash Queen and Tripper contracts with real interactions and persistent consequences.
3. Nine withheld reward effects, implemented individually before returning them to the pool; real synergy consumers before re-enabling combo claims.
4. Elite audio, clearer enemy attack/armor/death feedback and comparative weapon feel.
5. Five reward models, finished Talon-C, and environment/ending art review. Procedural VFX do not replace those model-production tasks.
6. Physical Deck/desktop lighting and performance acceptance, two-account co-op, Cloud and packaged recovery.

No commit, push, release or Steam deployment was performed by this pass.
