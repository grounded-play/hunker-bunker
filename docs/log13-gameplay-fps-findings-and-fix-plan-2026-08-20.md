# Log 13 Gameplay FPS Findings and Fix Plan

Date: 2026-08-20
Source: `docs/logs/log13.json`
Client: packaged Steam/Electron build on Windows, TANK, two-player PvP

This document records the evidence and implementation plan before changing
runtime performance behavior. It follows Sprint 28 Lane F's rule: use the
packaged log to choose a bounded fix, preserve gameplay visibility, and leave
diagnostics in place for the next packaged comparison.

## What the session proves

The multiplayer session itself progressed further than earlier tests: both
players synchronized ready state, entered gameplay, exchanged shots, and the
TANK died from an authoritative `pvp-rival` hit. The low FPS is therefore a
real gameplay problem, not a lobby animation or disconnected relay.

The active gameplay phase ran from elapsed 95,280ms to 127,692ms (32.4s).
Within that window the log recorded:

- 178 long tasks totaling 14,189ms — about 43.8% of the gameplay window.
- 21 tasks at or above 100ms, six at or above 200ms, and one at 624ms.
- Six startup/streaming tasks attributed to chunk mounting. The remaining
  172 report `frame:render` as the last completed tagged phase.
- During first-use staging, renderer programs rose from 9 to 98, textures
  from 10 to 105, and geometries from 32 to roughly 150. Render spans reached
  208–592ms while those resources and shader variants first appeared.
- Once programs plateaued at 97–98, the visible world still contained 16
  active chunks, 3,178 wall instances, and 222 wall meshes. In the final
  ten seconds before death, sampled render spans averaged 15.5ms but still
  included four 59–78ms spikes. Long tasks continued around that rendering,
  proving the steady problem is the combined frame (updates plus rendering),
  not chunk mounting alone.

`renderer.info.render` falling to one call / one triangle after the composer
warms is diagnostic evidence of the final full-screen shader pass, not proof
that the scene has one draw call. `EffectComposer` resets/overwrites those
counters as it executes its passes, so current telemetry understates the
real scene work during gameplay.

## Current runtime cost that can be removed safely

At the time of log13, gameplay enabled all of the following together:

1. A shadow-casting 2048×2048 directional light.
2. A moving player spotlight with a 1024×1024 shadow map.
3. A full scene render through `EffectComposer`.
4. Two additional full-frame, seven-tap tilt-shift shader passes.
5. Up to a 3.6-million-pixel gameplay framebuffer.

The current branch has already reduced the directional shadow map to
1024×1024, stopped the moving player spotlight from casting a shadow, and
bounded the normal gameplay framebuffer to 2.2 million pixels. Those are
useful baseline reductions, but they do not remove the remaining directional
shadow redraw or the two full-frame blur passes. The adaptive fix below is the
next bounded step, not a duplicate of those changes.

With 222 wall meshes plus instanced terrain and animated models, the two
shadow maps redraw a large portion of the scene from extra viewpoints. The
tilt-shift composer then processes the entire framebuffer twice more. These
are cosmetic multipliers: disabling them does not change collision, world
radius, enemy AI, projectiles, multiplayer avatars, aim, loot, or UI.

The existing `_lowFpsTimer` detects sustained frame pressure but currently
does nothing except repeatedly restore the normal chunk radius. It is the
right seam for a conservative quality fallback.

## Fix to implement

Add an adaptive gameplay performance mode in `src/threeGame.js`:

- Engage immediately when the Steam hardware status identifies a Steam Deck.
- On other hardware, engage only after roughly 1.5 seconds of sustained
  frame rate below 45 FPS.
- Once engaged for a run, do not oscillate back to high quality mid-combat;
  this avoids shader recompilation and visual flicker.
- Render directly with `WebGLRenderer`, bypassing the two tilt-shift passes.
- Disable gameplay shadow maps.
- Cap gameplay pixel ratio at 0.85 while degraded.
- Keep the default visible chunk radius and every gameplay/model system.
- Restore the configured menu profile when leaving gameplay; a new run may
  evaluate quality again.
- Emit one structured `PERF` session event with the reason,
  measured frame pressure, pixel ratio, and renderer counters.

Also extend the existing diagnostic snapshot with:

- whether adaptive performance mode is active;
- whether shadows and postprocessing are active.
- whether the opt-in per-subsystem frame profiler is enabled. Its detailed
  snapshot remains available through `game.frameProfiler.snapshot()` so the
  normal per-frame render context does not allocate and sort profiler rows.

This corrects the current attribution gap: the next log can distinguish a
slow simulation/update subsystem from a slow GPU render without adding another
allocation-heavy per-frame phase-history stream. The profiler remains inert in
normal shipping play and is enabled only during a deliberate diagnostic
capture.

The companion root-cause analysis in
`docs/log13-gameplay-fps-plan-2026-08-20.md` additionally ties the startup
208–592ms stalls to environmental-light count changes in Three.js shader cache
keys. Its fixed eight-slot light pool and composer-aware shader warm-up are the
direct startup-stutter fix; adaptive quality is the bounded Steam Deck and
sustained-low-FPS fallback for the remaining frame cost.

## Non-goals and risk controls

- Do not reduce the visible chunk radius; that previously made neighboring
  rooms disappear.
- Do not remove remote-player models, enemies, terrain, weather logic, or
  projectiles.
- Do not alter relay, lobby, damage, or authoritative multiplayer behavior.
- Do not claim first-use shader/texture stalls are fully solved. The adaptive
  mode reduces their render multiplier, while the existing loader/compile
  staging remains responsible for warm-up.
- Do not auto-restore shadows/postprocessing during the same run.

## Done criteria

1. Unit tests prove Steam Deck engages immediately, ordinary hardware waits
   for sustained low FPS, and one isolated slow frame does not degrade.
2. Unit tests prove degraded rendering bypasses the composer, disables
   shadows, lowers pixel ratio, and leaves chunk radius untouched.
3. Existing performance diagnostics expose the new state and profiler status.
4. Full `npx vitest run` and `npm run build` pass.
5. The next packaged two-player log should contain
   `adaptive-gameplay-quality-engaged`; compare long-task count/time, render
   maxima, and update/render timings directly against log13's 178 / 14,189ms
   / 624ms baseline.
