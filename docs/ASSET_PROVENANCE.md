# Asset Provenance & Production-Rights Tracking

**Status:** Canonical asset-governance policy / incomplete coverage ledger
**Last verified:** 2026-08-24

**Derivative update:** 2026-09-08 — the two overclock texture derivatives below were recorded; this is not a full-ledger rights re-verification.

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
| `Mayor.Tina.glb`, `Teacup.Roach.glb`, `Cockroach_transform.mp4` and optimized runtime derivatives | Mayor Tina Secret Encounter | Sources: `art/source/3d/uploads-mayor-tina/*.glb`; runtime: `public/3d/runtime/secrets/*.glb`, `public/Cockroach_transform.{mp4,webm}` | User-supplied source assets integrated on 2026-09-03. Runtime GLBs are decimated/texture-bounded derivatives; `mayor-tina-rigged.glb` is additionally skinned to the existing Scout/Mixamo locomotion skeleton; WebM is a format-only transcode of the supplied MP4 for Linux/Electron playback. Creator/tool/license details were not supplied with the files. | `needs-review` — confirm creator, generation method, commercial redistribution rights, and any AI disclosure before retail approval. |

---

## Known current asset classes requiring Sprint 30 reconciliation

These are **coverage gaps**, not accusations that the assets lack commercial rights.

### 3D runtime / Armory / community chassis

#### September 8 texture-only derivatives

| Runtime asset | Retained input | Transformation and verification | Rights state |
| --- | --- | --- | --- |
| `public/3d/runtime/new3ds/mod_symbiotic_adrenaline_pump.glb` | `art/source/3d/astra-texture-budget-2026-09-08/mod_symbiotic_adrenaline_pump.glb` | Existing runtime input retained byte-for-byte; embedded PNG textures resized from 4096 to 1024 pixels with glTF Transform CLI 4.5.0 `resize`. Geometry/accessor content unchanged; 40,393,748 → 5,478,680 bytes. | `needs-review` — original creator, method, and redistribution basis remain unresolved. |
| `public/3d/runtime/new3ds/mod_echo_location_transceiver.glb` | `art/source/3d/astra-texture-budget-2026-09-08/mod_echo_location_transceiver.glb` | Same texture-only process; 30,854,568 → 4,479,148 bytes. Geometry/accessor content unchanged. | `needs-review` — original creator, method, and redistribution basis remain unresolved. |

Codex performed this derivative operation at the project owner's request. The retained inputs are pre-optimization runtime copies, not newly discovered original artist masters. No new generative content or rights clearance is asserted. Visual comparison, validation, byte totals, and reproduction instructions are in [the first implementation report](reports/astra-first-implementation-2026-09-08.md).

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

#### September 9 lore and survivor portraits

| Runtime asset | Production method | Source date | Rights / disclosure state | Purpose / notes |
| --- | --- | --- | --- | --- |
| `public/lore_portraits/mayor_tina.webp` | Generative-AI + pixelation/format conversion via ffmpeg | 2026-09-09 | `generated-disclosed` | Mayor Tina (cockroach in teacup) radio transmission and bunker dialogue portrait. |
| `public/lore_portraits/bunker_announcer.webp` | Generative-AI + pixelation/format conversion via ffmpeg | 2026-09-09 | `generated-disclosed` | Bunker AI central broadcast terminal transmission portrait. |
| `public/lore_portraits/survivor_foxhole.webp` | Generative-AI + pixelation/format conversion via ffmpeg | 2026-09-09 | `generated-disclosed` | Foxhole buddy wanderer encounter modal & dialogue portrait. |
| `public/lore_portraits/survivor_hacker.webp` | Generative-AI + pixelation/format conversion via ffmpeg | 2026-09-09 | `generated-disclosed` | Glitch / hacker wanderer encounter modal & dialogue portrait. |
| `public/lore_portraits/survivor_corpo.webp` | Generative-AI + pixelation/format conversion via ffmpeg | 2026-09-09 | `generated-disclosed` | Corpo runner wanderer encounter modal & dialogue portrait. |
| `public/lore_portraits/survivor_crash_queen.webp` | Generative-AI + pixelation/format conversion via ffmpeg | 2026-09-09 | `generated-disclosed` | Crash queen wanderer encounter modal & dialogue portrait. |
| `public/lore_portraits/survivor_abg.webp` | Generative-AI + pixelation/format conversion via ffmpeg | 2026-09-09 | `generated-disclosed` | Armored battle grunt wanderer encounter modal & dialogue portrait. |
| `public/lore_portraits/survivor_hybrid.webp` | Generative-AI + pixelation/format conversion via ffmpeg | 2026-09-09 | `generated-disclosed` | Cybernetic chimera wanderer encounter modal & dialogue portrait. |

### Temporary working assets

`art/lore-drop-chroma/` holds these working PNGs. They previously sat in a root-level `tmp/`, which was neither a durable provenance namespace nor something that belonged in the repository root.

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


## Armory preview derivatives — 2026-09-09

- Runtime derivatives: `public/economy/armory/*.png`, 79 transparent 320×320 model renders, 4,213,332 bytes total.
- Sources: the existing weapon, chassis, community operator, charm and overclock GLBs mapped in `src/data/armoryPreviews.js`. Original model files and source artwork are retained unchanged.
- Method: deterministic Three.js lighting/camera render through `scripts/render-armory-previews.mjs`; no new image-generation service, stock art or external art source was used for these derivatives. They inherit the provenance and AI-disclosure status of their source models.
- Five rewards without unique models use existing achievement emblem PNGs. The manifest identifies those entries as `achievement-emblem`; it does not imply a finished model.
- Evidence: `docs/reports/armory-asset-gaps.md` and `docs/reports/armory-implementation-2026-09-09.md`. The Armory now uses model renders in place of four chroma-green-backed icons. The factory Talon-C blockout and five unauthored reward models remain explicit art backlog.
- State: integrated and browser-tested derivatives; no change to the underlying source assets' retail/provenance status.


## September 10, 2026 — replacement operator insignia

Five original images generated with OpenAI ImageGen for this repository: Bunker 404 Lost Squad (4123), Queen Slayer Gold Seal (4126), Void Horizon Sigil (4127), Ancient Core Glyphs (4128), Grand Marshal Relic Crest (4129). Prompts requested single transparent sci-fi fabric/metal badges; no third-party source artwork used. Runtime files are 256px and 512px PNG derivatives, retaining generated alpha. Queen Slayer Gold Seal has its own new file pair and no longer aliases the red Queen Slayer Emblem. No external marketplace rights or publication approval is inferred from generation.

The legacy `chroma/` source slot for these five replacements also stores the original transparent master; no green-screen derivative is required or used.

## September 13, 2026 — CC0 cinematic/gameplay audio derivatives

- Source: Kenney, “Sci-Fi Sounds,” downloaded from OpenGameArt. The retained pack license declares
  CC0; source page and `License.txt` are stored under
  `art/source/audio/cinematic-source/opengameart/kenney-sci-fi-sounds/`.
- Runtime derivatives: six Vorbis files under `public/audio/cc0-derived/`, approximately 156 KiB
  total. They are shared by ending-picture cue manifests and the door/hive gameplay soundsets.
- Mechanical sources: `doorClose_000.ogg` (SHA-256
  `c9134651ebbd7c016f90393aee495ff8120bd343bb7569b689a7506987ebd6c2`),
  `doorClose_001.ogg` (`2153e83ff9880c78f9539aa5dcce80fc9e3b39c6fa0f8dec9325ec6d7ea2c9d5`),
  and `impactMetal_000.ogg` (`956c6612a256aa1a67a2327fffe2454f6b1d82e4c1c2be28fd66916335d5b1d6`).
- Biological sources: `slime_000.ogg`
  (`480ee82b690136ea9db6966a3c3033356b8274752795c4e37afd6b6defcfacff`) and
  `slime_001.ogg` (`822ca475d71e18ef6bba707dbe6bff2bd493d3457b2552f7473d23022c1257ca`).
- Engine source: `spaceEngineLow_000.ogg`
  (`d7deee8d7217ce63aab802ad7365a59cacfd243392dc1bd03b0a9d454aa494df`).
- Processing: FFmpeg resample to 48 kHz, level normalization with true-peak margin, family-specific
  filtering, and restrained pitch/time transformation. No voice, music, or trademark callout is
  present. Output hashes are recorded in the source-intake report.
- State: integrated under CC0; attribution optional. Raw sources remain ignored and retained for
  reproducibility rather than being packaged.
