# Asset Provenance & Production-Rights Tracking

**Status:** Canonical asset-governance policy / incomplete coverage ledger
**Last verified:** 2026-08-24

This file records the current provenance policy and the asset classes that have actually been reconciled. It must **not** be interpreted as proof that every asset currently in the repository has complete creator/license/AI-disclosure metadata.

Sprint 30 identified a real coverage gap: Hunker Bunker now contains a much larger 3D, audio, UI, store/marketing, community-skin, and generated-art footprint than the earlier version of this document tracked.

> **Runtime-final is not the same as rights-cleared.** An asset can be integrated and visually final while its provenance record is still incomplete.

This is an operational tracking document, not a grant of rights or a substitute for legal review.

---

## Provenance states

Use separate lifecycle and rights states rather than one ambiguous `final` label.

### Runtime lifecycle

- `source` — retained source/master input, not shipped directly.
- `placeholder` — temporary runtime asset intended to be replaced.
- `integrated` — connected to the live runtime.
- `retail-candidate` — intended for a release build and passed relevant asset/package audits.
- `retired` — retained only for history/source recovery.

### Provenance / rights status

- `verified` — creator/source/method and commercial-use basis are recorded.
- `needs-review` — asset exists and may be integrated, but one or more required provenance fields are missing.
- `third-party-license` — governed by an explicit third-party license/attribution requirement.
- `generated-disclosed` — generative-AI origin/assistance is recorded for disclosure purposes.
- `procedural-original` — produced by project-authored procedural/code synthesis rather than an external content generator.
- `blocked` — do not ship until provenance/rights question is resolved.

Do not infer `verified` merely because a file is committed to the repository.

---

## Required record fields

Every production asset or clearly defined asset family should eventually record:

| Field | Required information |
|---|---|
| Asset ID / family | Stable identifier or bounded family/glob. |
| Runtime path | File(s) actually shipped/consumed. |
| Source/master path | Canonical editable/source input, if retained. |
| Creator / contributor | Human/project/external source responsible for the asset. |
| Source date | When the source entered the project. |
| Production method | Hand-authored, photographed, procedural, generative-AI, AI-assisted, external licensed asset, commissioned, etc. |
| Tool/model/source | Relevant tool/model/vendor/source when disclosure or rights depend on it. |
| Human modifications | Material editing/cleanup/retopology/mix/mastering steps where applicable. |
| Commercial-use basis | Project-owned, contributor grant, explicit license, commissioned rights, etc. |
| Attribution requirement | Exact attribution or `none recorded`. |
| AI disclosure status | Whether it belongs in current Steam/store AI disclosure. |
| Runtime lifecycle | `source`, `placeholder`, `integrated`, `retail-candidate`, `retired`. |
| Provenance status | `verified`, `needs-review`, `third-party-license`, `generated-disclosed`, `procedural-original`, or `blocked`. |
| Last verified | Date + reviewer/commit where practical. |

For large generated or procedural families, a family-level record is acceptable only when every file in the family genuinely shares the same source/method/rights basis.

---

## Currently itemized / previously tracked assets

The following entries were already explicitly tracked before Sprint 30. Their presence here does **not** imply that unlisted asset families are clear.

| Asset ID / family | Component | Runtime location | Known production note | Current provenance status |
|---|---|---|---|---|
| `item_albuterol_bottle` | RGB Mini-Game | `public/minigames/rgb/items/item_albuterol_bottle.png` | Halftone comic illustration. | `needs-review` — older ledger recorded runtime status but not creator/method/license fields. |
| `item_lucia_drawing` | RGB Mini-Game | `public/minigames/rgb/items/item_lucia_drawing.png` | Crayon-style drawing. | `needs-review` |
| `item_calibration_notebook` | RGB Mini-Game | `public/minigames/rgb/items/item_calibration_notebook.png` | Halftone/graphic-novel object illustration. | `needs-review` |
| `item_temp_badge` | RGB Mini-Game | `public/minigames/rgb/items/item_temp_badge.png` | Worn badge/lanyard illustration. | `needs-review` |
| `item_phone` | RGB Mini-Game | `public/minigames/rgb/items/item_phone.png` | Cracked phone illustration. | `needs-review` |
| `item_wire_cutters` | RGB Mini-Game | `public/minigames/rgb/items/item_wire_cutters.png` | Insulated tool illustration. | `needs-review` |
| `drop_*` (14 lore collectibles) | World Lore Drops | `public/drop_*.png` | Earlier ledger explicitly records generative image creation followed by chroma-green extraction/matte/despill into 512px alpha PNG runtime assets. | `generated-disclosed`; itemized source/model/tool metadata still needs reconciliation. |

---

## Known current asset classes requiring Sprint 30 reconciliation

These are **coverage gaps**, not accusations that the assets lack commercial rights.

### 3D runtime / Armory / community chassis

Sprint 28 integrated dozens of 3D chassis/weapon/cosmetic assets and Sprint 29 added further runtime models and calibration work. The existing asset/backlog docs describe integration and aesthetic intent, but this root ledger does not currently provide complete creator/source/method/rights records for those families.

**Action:** build a bounded 3D ledger keyed to the actual runtime catalog, distinguishing:

- project-authored/generated source;
- user/community-submitted source;
- source GLB versus optimized runtime GLB;
- texture/material provenance;
- retail approval status.

### Audio

Sprint 29 added 12 project-generated 44.1kHz WAV SFX through `scripts/generate-plan-sfx.js` and package-path support for WAV/MP3/OGG.

**Action:** record procedurally synthesized project SFX as `procedural-original` where verified, and separately reconcile music/voice/external audio sources rather than treating all audio as one family.

### Store / library / marketing art

Steam capsules, library art, trailer/media assets, social/promotional art, and other customer-facing imagery are part of the same disclosure/rights surface as in-game assets.

**Action:** itemize current retail/store assets and record whether generative-AI tools were used. Keep this aligned with the Steam Content Survey; do not use marketing prose as the provenance record.

### Generated / AI-assisted visual assets

The Steam review process has explicitly asked for accurate AI disclosure. The project should track generated/AI-assisted assets at source time instead of reconstructing the answer during submission.

**Action:** for every new generated/AI-assisted visual family, record tool/model when known, source prompt/workflow location if retained, human modifications, and final runtime/marketing derivative.

### Temporary working assets

`tmp/lore-drop-chroma/` currently contains large working PNGs. `tmp/` is not an acceptable durable provenance/source-master namespace.

**Action:** compare against runtime finals and source history, then either:

- move retained masters into a deliberate `art/source/...` location with ledger entries; or
- remove redundant temporary derivatives after confirming they are reproducible/not needed.

Do not delete source evidence merely to make the root smaller.

---

## Asset contribution policy

Before merging a new visual/audio/3D/content asset, record enough information to answer:

1. Who or what created the source?
2. Does the contributor/project have the right to ship it commercially?
3. Was generative AI used in the player-facing or marketing content?
4. Is attribution required?
5. Where is the canonical source/master?
6. What runtime derivative is actually packaged?
7. Is the asset merely integrated, or is it approved for retail?

Generated placeholders should be clearly demarcated and should not silently become retail assets without a provenance update.

Contributors should not submit third-party art, audio, models, fonts, or other content unless they can identify the source and the basis on which Hunker Bunker may redistribute it.

---

## Packaging / source separation rules

- Runtime assets belong in runtime-owned locations such as `public/` or the current packaged asset tree.
- Retained masters belong under a deliberate source namespace such as `art/source/`, not `tmp/`.
- Generated reports/audits belong under `docs/reports/` or generated build output, not beside source assets.
- Asset build/audit scripts should validate runtime existence/format/budget, but green package audits are not proof of provenance or legal clearance.
- `asarUnpack`/Electron package correctness is a separate evidence state from asset provenance.

---

## Sprint 30 completion target for provenance

Sprint 30 does not need to hand-document every historical file before any other work can proceed. It does need to leave a trustworthy system behind:

1. enumerate the production asset families that can reach a retail build;
2. give every family a provenance status;
3. flag unknowns as `needs-review` instead of implying completion;
4. resolve any `blocked` retail assets before release promotion;
5. move or classify temporary/source assets deliberately;
6. keep Steam AI disclosure derived from this evidence rather than memory.
