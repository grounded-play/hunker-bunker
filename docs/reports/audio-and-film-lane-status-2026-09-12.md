# Audio and film lane — status

**Date:** 2026-09-12 · verification pass, no assets authored

---

## Film lane — coverage is complete and exactly complementary

Ending cutscene coverage across all 10 `ACT2_ENDINGS`:

| Shipped as video (`public/cutscenes/`) | Built by the Blender pipeline |
|---|---|
| `ending-fullbrood.webm` | `mothership_infection` |
| `ending-cleanescape.webm` | `alien_exodus` |
| `ending-mixedcrew.webm` | `outed_escape` |
| `ending-carriersbargain.webm` | `failed_carrier` |
| `ending-scorchedsky.webm` | `empty_husk` |

**5 + 5 = 10, with no overlap and no gap.** `scripts/blender/build_ending_scenes.py`
targets precisely the five endings that have no shipped video — the exact set
previously recorded as "5 of 10 endings have no cutscene". The film lane is
correctly scoped; nothing is missing from the plan and nothing is duplicated.

Also on disk: 11 death cinematics, 8 event cinematics, 4 class intros, plus
`act3-departure` and `cave-reveal` — 29 `.webm` with posters (63 files total).

**What remains** is production, not planning: render the five Blender scenes
through the optics/audio pipeline and encode them to `.webm` alongside the
existing five. The naming convention to match is `ending-<lowercasenospaces>.webm`.

---

## Audio lane — two findings

### 1. The soundset module has zero callers

`src/data/gameSoundsets.js` exports `GAME_SOUNDSETS`, `validateSoundset` and a
deterministic no-immediate-repeat selector, with tests. **Nothing imports it** —
a grep across `src/` and `main.js` excluding its own test returns nothing.

This is the repo's recurring failure mode (see `src/accessibilitySettings.js`,
fixed this session in `8afac60`, which was inert for the same reason). Worth
flagging early here, because the module is new and the wiring is cheap now and
expensive after the registry fills.

**Not a defect yet** — see below — but it must be wired in the same pass that
populates the registry, or the audio work will ship inert.

### 2. The empty registry is deliberate, and should stay empty for now

```js
/**
 * Runtime soundset definitions live here once edited assets pass audition and
 * provenance review. Keeping the initial registry empty prevents source-pack
 * files from becoming accidental shipping dependencies.
 */
export const GAME_SOUNDSETS = Object.freeze({});
```

That is a licensing control, not an oversight. **Do not populate it with
plausible-looking entries to make the system "work"** — doing so would create
exactly the accidental shipping dependency the comment exists to prevent, and
for CC0-sourced audio the provenance record is the thing that makes the
licence defensible.

226 audio files exist under `public/`, so the raw material is present. The
blocker is audition and derivative-provenance review, which is a human gate.

### Suggested order for the audio lane

1. Wire the selector to one real call site with the registry still empty, and
   assert the empty-registry path is a clean no-op. This proves the integration
   before any licensing decision is made.
2. Run the audition/provenance review on the CC0 intake
   (`docs/reports/blender-ending-audio-source-intake-2026-09-12.md`).
3. Populate `GAME_SOUNDSETS` only with what passes, recording provenance per entry.

Step 1 is safe to do now and removes the risk that the registry gets filled into
a module nothing calls.

---

## Coordination

`src/threeGame.js` was uncommitted in the shared working tree throughout this
pass, so no work was taken that touches it. That still blocks playtest P0-2
(interaction cycling / unstick) and P0-3 (black box as secondary objective),
which are top of the queue in
`docs/reports/playtest-issues-2026-09-12.md`.
