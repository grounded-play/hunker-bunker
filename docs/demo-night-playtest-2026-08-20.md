# Demo Night Playtest Checklist — 2026-08-20

This is the smallest repeatable test for tonight's friend sessions. The goal
is useful player feedback plus enough runtime evidence to distinguish a design
problem from a Steam/Deck/build problem.

## Before the first player

1. Launch the packaged build from Steam, not the Vite dev server.
2. On Steam Deck, confirm the window is fullscreen, the stage is legible, and
   the Steam Input status identifies the controller.
3. Open the in-game console with `~` only if QA tools are enabled. Run:

   ```text
   demo start
   steam
   demo mark menu-ready
   ```

4. Export logs after each player or at the end with `exportlogs json`.

The exported JSON contains Deck/controller state, stage metrics, renderer
counters, Steam/backend health, and the named demo markers. It intentionally
does not include SteamID64.

## Player path

Mark these checkpoints when they happen:

```text
demo mark briefing
demo mark armory-ready
demo mark deployed
demo mark first-room
demo mark first-combat
demo mark first-depth-crossing
demo mark relic-choice
demo mark extraction-or-death
demo stop
exportlogs json
```

Do not coach the player unless they are blocked. Ask afterward:

- What were you trying to do, and what did you think O2 was for?
- Did going deeper feel like a choice with a reward and a cost?
- Which weapon, class action, enemy, or relic changed your behavior?
- Where did you feel lost, overloaded, or unable to tell what happened?
- On Deck: did every menu work with sticks/buttons only, including back,
  settings, text entry, map, pause, and extraction?

## Steam Deck smoke path

- Boot and dismiss the title screen with controller input.
- Navigate class select, Armory, Deployment Briefing, and settings without
  touching the screen.
- Confirm glyphs change to controller prompts and focus remains visible.
- In a run: move, aim, fire, reload, sprint, scan, interact, open/close map,
  pause, and extract using the documented actions.
- Test the Steam overlay once, then return to the game and confirm input is
  still active.
- If anything fails, mark the nearest checkpoint before exporting.

## Evidence rule

Record the build version, device (desktop or Deck), controller layout, and
whether the issue was reproducible. A short screen recording is preferred for
input/focus failures. The log is supporting evidence, not a substitute for
the player's description.
