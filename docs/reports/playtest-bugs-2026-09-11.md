# Playtest bug findings — 2026-09-11

Five defects reported from a live session, diagnosed against
`logs/hunker-bunker-session-2026-09-11T22-58-*.json` and the source. Root cause
for each was identified before any fix was written.

---

## 1. Settings sub-menus render behind the Settings modal

**Severity:** high — the language picker is unusable.

`style.css:3784` lifts sub-menus above Settings, but the rule is keyed by
**element ID**:

```css
#audio-mixer-popup,
#save-data-popup,
#controls-popup {
  z-index: 100020;      /* #settings-popup is 100010 */
}
```

`a077c8e` added `#language-select-popup` with `class="modal audio-mixer-modal"`.
It picked up the *visual* class but not the ID list, so it inherits `.modal`'s
base `z-index: 100000` and renders **below** Settings at 100010.

**Root cause:** stacking is expressed per-ID rather than per-role, so every new
sub-menu silently defaults to "behind" and the bug ships again each time.

**Fix:** introduce a role class (`.settings-subpanel`) carrying the 100020, and
apply it to all four. New sub-menus then get correct stacking by construction.

---

## 2. Armory column too tall — INITIALIZE pushed out of view

**Severity:** high — blocks starting a run at some viewport heights.

The Armory layout grows with content and overflows the viewport, carrying the
deploy control past the bottom edge with no scroll affordance.

**Fix:** constrain the layout to the viewport and keep the deploy action
reachable, rather than letting content height dictate the column.

---

## 3. Game-over screen exceeds Steam Deck bounds

**Severity:** high on the primary hardware target.

The Deck renders 1280×800. The reworked game-over layout is taller than 800px,
so buttons fall outside the screen.

**Fix:** bound the panel to the viewport with internal scrolling, verified at
1280×800 specifically.

---

## 4. Multiplayer spawn drops a player into a pit — CONFIRMED IN LOGS

**Severity:** critical — deterministic, repeating death loop.

Both clients agree on the plan:

```
host  (TANK)      localSpawn { x: 47, z: 47 }
peer  (ENGINEER)  localSpawn { x:  9, z:  9 }

player-death { reason: "pit-fall", x: 47, z: 47 }
player-death { reason: "pit-fall", x: 47, z: 47 }   <- again, after respawn
```

The TANK fell, respawned **at the same coordinates**, and fell again. Nothing
breaks the loop.

**Root cause:** `threeGame.js:4537` assigns the server's spawn directly:

```js
this.player.position.x = myInfo.spawnX;
this.player.position.z = myInfo.spawnZ;
```

No floor test. The game already has one — `isPlayerOverAnyHole(x, z)`, used every
frame at `threeGame.js:18580` to decide whether the player falls — but the spawn
path never calls it. `planMultiplayerCrashSites` picks coordinates from fixed
offset tables with no knowledge of the generated terrain, so any offset can land
over a void.

**Secondary finding:** `(47,47)` is `baseSpawn(9,9) + (38,38)`, which is the
**PvP** offset for index 1. The session log shows the player clicking
`net-mode-coop-btn` ("PVE SQUAD CO-OP EXPEDITION"); the co-op offset would have
been `(37,9)`. Co-op sessions appear to be laying out spawns with the PvP table.
Worth tracking separately — but it is not the cause here, since the co-op
coordinate is equally unvalidated.

**Fix:** validate every spawn against the floor and search outward for the
nearest safe tile. Applied on initial spawn *and* respawn, so a bad point cannot
produce a loop.

---

## 5. Multiplayer players spawn stuck inside the ship

**Severity:** high.

Players materialize inside the crashed-ship collider rather than beside it, and
separately can overlap one another.

**Root cause:** shares its origin with #4 — spawn points are fixed offsets with
no awareness of world geometry, so a point can fall inside a prop as easily as
over a pit.

**Fix:** the same safe-spawn resolver, additionally rejecting points inside
blocking geometry and separating players that resolve too close together.

---

## Cross-cutting note

#4 and #5 are one bug wearing two hats: **spawn coordinates are chosen without
consulting the world they land in.** Fixing the validator fixes both, and the
per-frame floor test the game already runs is the correct authority to reuse —
a spawn point should have to pass the same test that keeps a walking player
alive.
