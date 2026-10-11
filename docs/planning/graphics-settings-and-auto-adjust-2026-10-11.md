# Graphics settings and auto-adjust — 2026-10-11

**Status:** shipped on `dev/sprint-51` (local). **Code:** `src/graphicsSettings.js` (model),
`ThreeGame.applyGraphicsSettings` / `autoLowerGraphics` (engine), the Graphics tab in
`index.html` + `main.js`, `src/propFx.js` (effects levels).

## The owner's ask

> Make it so things are turned off automatically, and if it all stalls then we turn it down in the
> settings and document why, rather than start at the lowest setting. Have a graphics settings page,
> and make graphics settings and levels in Settings a clearer tab: turning things up, down or off.

## What the player sees

Settings now has a **GRAPHICS** tab (between Camera & HUD and Accessibility).

| Control | Levels | What it changes |
|---|---|---|
| Quality preset | High · Medium · Low (Custom when values differ) | Sets all six below at once. |
| Auto-adjust when the game stalls | On (default) / Off | Whether the game may lower settings by itself. |
| Render resolution | 100% · 85% · 70% | Share of the device's gameplay pixel ratio. |
| Shadows | Full · Reduced · Off | Reduced redraws shadow maps every other frame; Off drops them by intensity. |
| Post-processing | On · Off | Bloom, depth-of-field focus and grading. |
| World detail | High · Low | Wall-top pipes and hatches, wall-foot drifts and rubble, icicles. Walls themselves are unaffected. |
| Chasm landmarks | On · Off | The masts, spires and arches in the void. They stay on the tactical map either way. |
| Effects | Full · Reduced · Off | Prop steam, sparks, spores and bubbles. Reduced drops only the dust motes. Off drops all particles but keeps flames and water, which are part of the prop. |

Below the controls, **Automatic changes** lists every step auto-adjust took, in words. For
example: "09:34 — Render resolution: 100% → 85%. 31 FPS for 1.5 s in the bunker; the graphics card
was the limit."

**Restore** puts each of those settings back where the player had it. A manual change always wins
and clears that setting's note.

When auto-adjust acts during play, a one-line notice appears in the HUD feed, pointing to Settings ›
Graphics.

The tab is translated into all seven locales, and the i18n audit is unchanged.

## How auto-adjust decides

1. **Start at High.** Every machine starts at High, the Steam Deck included (owner, 2026-09-25:
   full quality first). Nothing is lowered pre-emptively.
2. **Ignore the deploy period.** For the first 12 s after deploy, streaming and shader compiles
   say nothing about the run.
3. **Only act on a sustained stall:** below 45 FPS for about 1.5 s of accumulated slow frames. A
   single hitch, tab switch or compile caps its contribution at 0.25 s.
4. **Find the bottleneck.** The GPU frame timer decides it. If the GPU fills less than 60% of the
   slow frame, the main thread (CPU) is the limit.
5. **Lower one setting, by bottleneck:**
   - *GPU-bound:* render resolution 100 → 85, then shadows full → reduced, then resolution 85 → 70.
   - *CPU-bound:* world detail high → low, then chasm landmarks off, then effects full → reduced,
     then shadows full → reduced. Each of these removes draw calls, which is where main-thread
     frame time goes.
6. **Wait 10 s** before judging again, so the frame rate can show whether that step helped.
7. **Write it down.** The step is saved in the settings (`localStorage.hb_graphics`), listed in the
   tab with frame rate, bottleneck, area and time, announced once in the HUD, and logged to the
   debug log (`PERF graphics-auto-lowered`).
8. **Never raise anything back on its own.** The player decides in the tab. The old resolution
   mode flapped between full and reduced resolution.

### What auto-adjust never does, and why

- **It never turns shadows off, and never turns post-processing off.** The owner ruled twice
  (2026-08-26, 2026-09-25) that bypassing the composer and freezing shadows made the game look
  unloaded, and the QA logs showed those frames were main-thread bound, so the cuts bought nothing.
  Both remain available as manual choices.
- **It never swaps 3D models for sprites,** and never shrinks the visible world radius.
- **It never toggles `renderer.shadowMap.enabled` or a light's visibility.** Both recompile every
  lit shader, which means multi-second stalls on the Deck (see the point-light count trap).
  "Off" shadows use the per-light shadow intensity uniform; "Reduced" turns off auto-update and
  redraws on alternate frames.

### Manual choices that cost a stutter

Switching post-processing on or off changes the render path (composer vs. direct), so some
shader variants may compile once at the moment of switching. That is acceptable for a deliberate
menu choice, and it is the reason auto-adjust does not do it.

## What changed from before

The previous adaptive mode lowered resolution only, kept full resolution when the stall was
CPU-bound (doing nothing for those stalls), restored resolution automatically after sustained high
FPS, and was invisible to the player. The new system:
- keeps its grace period, sustained-stall trigger and GPU/CPU test;
- gives CPU-bound stalls their own ladder;
- records every step where the player can see and undo it.

`setAdaptiveGameplayPerformanceMode` remains for its existing callers, but auto-adjust no longer
uses it. Tests: `src/graphicsSettings.test.js`, `src/threeGame.graphicsSettings.test.js`,
`src/threeGame.adaptiveGameplayQuality.test.js` (updated to the new rule), and
`src/propFx.test.js` (effects levels).

## Open

- **Deck measurement.** The ladders' order and the 45 FPS floor are reasoned from the earlier
  Deck and PC logs (CPU-bound frames, ~8 ms GPU in ~48 ms frames), not yet measured with this
  system on the Deck. A session log with `graphics-auto-lowered` entries will show whether the
  first CPU step (world detail) is enough there.
- **A "recommended" preset per device.** Currently every device starts at High and lets
  auto-adjust find the level. That matches the owner's "rather than start at the lowest setting",
  but a remembered per-device result could save the first stall on later sessions. The settings
  already persist, so this happens naturally on the same machine.
