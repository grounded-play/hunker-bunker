# Log2 Follow-Ups: Transition Layering, Menu Isolation, Shoot Glitch

Date: 2026-08-19
Source: `docs/logs/log2.json` (real session, TANK, 94.6s, ended in a
second pit-fall death), reviewed against `dev/sprit-25`, plus direct
player-reported UI issues from the same play session.

This doc covers five asks from one review pass. One is already fixed
(commit `52ab8d9`); the shoot-glitch is explained by an already-shipped fix
(commit `83a74ba`) with log2 as corroborating evidence; the remaining three
are planned here for a follow-up implementation pass.

## 1. Doors rendering under modals (character-name HUD, game-over) — FIXED

**Confirmed:** `.modal` (used by `#game-over-modal` and everything else
built on the shared modal pattern) is `z-index: 100000`. The door-transition
curtain system (`#transition-overlay`, `.door`, smoke particles, the
over-door loading text) was clustered at `z-index: 15000-15250` — nearly 7x
lower. Anything revealed by `triggerDoorTransition`'s `onClosed` callback
while the doors were still visually closing/opening — most visibly the
game-over modal appearing the instant death resolves — rendered on top of
the still-animating doors instead of staying hidden behind them.

**Fixed:** moved the whole door-system z-index cluster to
`250000-250250` (`style.css`), clearing every other z-index in the
stylesheet (`200000`, a cursor-trail effect, was the previous high point)
with headroom, while leaving unrelated rules that happened to share the old
`15000`-range (the RGB minigame, debug diagnostic overlays) untouched.
Verified live: `#game-over-modal`'s computed z-index (100000) is now
correctly below `#transition-overlay`/`.door` (250000/250001).

**Status: closed.** See commit `52ab8d9`.

## 2. "Click to shoot" glitch — explained by the already-shipped shader-error fix

**From log2.json:** a 5-click burst (`id 194-198`, elapsedMs
67242-67266, ~24ms apart — far faster than deliberate single clicks,
consistent with rapid-fire spam) is immediately followed by a logged
**4609ms long task** (`id 200`, elapsedMs 67312). This is the exact
pattern already root-caused and fixed in
`docs/log1-perf-and-telemetry-followups-2026-08-18.md` #1: three.js's
`renderer.debug.checkShaderErrors` defaulting to `true` meant every
*newly*-compiled shader program (i.e. every material/light combination
being rendered for the first time — new wall-hit decals, muzzle flash,
projectile materials, freshly-revealed props in an area the player hadn't
reached yet) synchronously queried its compile/link log, a real driver
round-trip cost. Rapid-fire in a freshly-explored area is exactly the
scenario that would trigger several of these compiles back-to-back, adding
up to a multi-second freeze right as the player is trying to shoot.

That fix (`this.renderer.debug.checkShaderErrors = false;`,
`src/threeGame.js`) is already shipped (commit `83a74ba`) and verified live
to eliminate ~19,000ms of this exact cost from a ~30s real-exploration CPU
profile. Log2.json predates that fix (captured before this session's
`checkShaderErrors` change), so this 4609ms freeze is additional real-world
corroborating evidence for the diagnosis, not a still-open bug.

**Status: closed** — covered by the existing #1 fix. Per that doc: "not yet
re-verified against a real player session" is still the one open item —
worth confirming with a fresh log capture that this exact pattern (burst of
clicks → multi-second freeze) doesn't recur.

## 3. Mouse reactive to the game world while a menu is open

**The ask:** while a menu/modal is open over live gameplay, moving the
mouse shouldn't aim, hover-highlight walls, or otherwise interact with the
3D world underneath — only the menu UI should respond.

**Investigated, partially already correct:** `handleCanvasPointerMove`
(`src/threeGame.js:4587-4604`, the function driving `updateAimFromClient`'s
world raycast and `checkHoverInteractable`) already gates on
`this.isGameplayInputActive()` at its first line, which in turn checks
`hasBlockingGameplayOverlay()` (`src/threeGame.js:5080-5106`) — a fairly
comprehensive list of ~20 known modal IDs plus a generic
`.modal:not(.hidden)` catch-all, `.class-intro-overlay`,
`.cinematic-still-overlay`, `#cutscene-overlay.is-active`,
`.rgb-cinematic--visible`, and `mission-intro-active`. On paper, any modal
built on the shared `.modal` class (which includes `#game-over-modal` and
most others per `index.html`) should already block world-reactive mouse
input.

**Both original hypotheses checked — narrower than expected.**
- **Modal-ID coverage: ruled out.** Enumerated every `id="...-modal"` and
  every element carrying `class="modal"` in `index.html` (49 distinct
  modals). All but a handful of non-modal popups (`close-*` buttons, not
  containers) carry the shared `modal` class, which
  `hasBlockingGameplayOverlay()`'s generic `.modal:not(.hidden)` selector
  already catches regardless of ID. There is no modal in this codebase
  today that both (a) can appear during live gameplay and (b) isn't already
  covered by that catch-all.
- **Splash-screen parallax: ruled out.** `main.js:12946` attaches the
  hero-parallax listener directly to `#splash` via
  `splashHero.addEventListener('pointermove', ...)`, not `window`. It only
  ever fires while the pointer is physically over the `#splash` element,
  which is only present/visible during the title screen — it cannot receive
  events while a gameplay-time modal has the live 3D game underneath it,
  since `#splash` isn't part of that DOM subtree at all then.

**Still unconfirmed — needs a live reproduction, not more static reading.**
Both leads that looked most likely on paper check out clean, which means
either: the gate has a real but subtler timing gap (e.g. one render frame
between a modal's `.hidden` class toggling off and `isGameplayInputActive()`
next being read, if `updateAimFromClient` reads stale state mid-frame), or
the reported behavior is something else the player is perceiving as "the
world reacting" that isn't actually the aim/hover system at all (worth
asking directly which menu and what specifically moved/highlighted, next
time this comes up, rather than guessing further from code alone).

**Priority:** medium — a real immersion/polish issue if reproducible, not a
crash or data bug. **Risk:** n/a until a concrete repro narrows the actual
gap; nothing to safely change yet without one.

## 4. Increase background blur while a menu is open

**The ask:** when a menu is open, the live game scene behind it should be
harder to read — more blur — reinforcing that input has moved to "menu
land" and isn't going to the game.

**Current state:** `.modal` (`style.css:3404-3420`) already sets
`backdrop-filter: blur(5px)`. `#settings-popup` explicitly *disables* blur
(`backdrop-filter: none`, `style.css` near line 3441) for its own reasons
(probably legibility over a specific background). 5px is fairly subtle at
the resolutions this game targets (Steam Deck native output per this
repo's UI-scale/safe-frame tokens, `--stage-px` etc.) — likely why it
doesn't read as "menu land" strongly enough.

**Proposed fix:** raise `.modal`'s `backdrop-filter: blur(5px)` to
something more assertive (e.g. `blur(12-16px)` — needs a visual pass to
pick the right value, not just a number chosen blind) and decide
per-modal whether `#settings-popup`'s explicit blur-disable is still
intentional or should be reconsidered as part of the same pass, given it's
inconsistent with every other modal. Combine with item 3's fix so that once
blur increases, the now-more-obviously-backgrounded scene also
correctly stops responding to mouse input underneath it.

**Priority:** low — pure polish. **Risk:** low; a CSS value change, easy to
preview and revert.

## 5. Game-over should stay black through the door transition, not show the live scene

**The ask:** after death, the screen should go/stay black through the
game-over sequence and door transition — not show the (now-irrelevant)
live 3D world at any point before the game-over menu is fully up.

**Traced the actual sequence** (`main.js`, `runDeathSequence` and
`playCinematicBeat`):
1. On `player-death`: input disabled, `player-dead-flash` CSS class added
   (a red flash), `playPlayerDeathCue` plays. This holds for **900ms**
   (`window.setTimeout(..., 900)`) — during this window nothing covers the
   3D canvas except the red flash overlay; the live (now-frozen, since
   input is disabled, but still rendering) scene is fully visible under it.
2. After 900ms: `playCinematicBeat({ videoBase: deathCinematic.id, ... })`
   plays the death cutscene video (`death-abyss` etc.) inside
   `#cutscene-overlay` (`style.css:6505-6522`). That overlay's own
   background *is* solid black (`background: #000`) — but it starts at
   `opacity: 0` and only reaches `opacity: 1` after a 220ms fade-in
   (`.is-visible` class). Whatever gap exists between the 900ms timeout
   firing and the overlay actually reaching full opacity — video load time,
   the fade-in itself — is another window where the live scene can show
   through.
3. Only *after* the cinematic resolves does `triggerDoorTransition` run,
   closing the doors and then (per item 1's fix) correctly revealing
   `#game-over-modal` only once the doors are actually covering the screen.

**Proposed fix:** the gap is steps 1 and the fade-in portion of step 2, not
step 3 (already correctly ordered, and now correctly layered per item 1).
Two independent, combinable options:
1. **Cut renders instead of just disabling input.** On `player-death`,
   stop the render loop (or hold the last frame) rather than leaving
   `requestAnimationFrame` running with input merely disabled — nothing to
   see is nothing rendered, not a frozen frame the player can still fully
   read. Needs checking whether anything else (HUD elements, vitals) relies
   on the loop continuing to run post-death before doing this.
2. **Make the black cover instant, not faded.** For the specific
   post-death path only (not cutscenes generally, which may want the fade
   for pacing elsewhere), either start `#cutscene-overlay` already at
   `opacity: 1` for the death case, or add a dedicated instant full-black
   layer that snaps in the moment `player-dead-flash` is added, so there's
   no gap between "died" and "screen is black" at all.

Given item 1 (doors) is fixed and step 3 is already correctly sequenced,
the actual remaining work is narrow: close the two gaps in steps 1-2 above,
not redesign the sequence.

**Priority:** medium — a real, reproducible "seeing something you
shouldn't" issue on every single death, high-frequency exposure. **Risk:**
low for option 2 (CSS/timing only); option 1 needs a quick check that nothing
depends on the render loop continuing post-death before cutting it.

## Summary / execution order

1. **#1 doors-under-modals — DONE.** Commit `52ab8d9`.
2. **#2 shoot glitch — DONE**, covered by the existing checkShaderErrors fix
   (commit `83a74ba`); log2 is corroborating evidence, not a new bug.
3. **#5 game-over shows live scene** — next most valuable: narrow, well-
   understood gap (two specific timing windows), every death is affected.
4. **#3 mouse reactive during menus** — needs one more investigation pass
   (audit modal IDs against `hasBlockingGameplayOverlay()`, or find the
   parallax-effect gate if that's the real cause) before it's a "just fix
   it" task rather than a "find it" task.
5. **#4 increase menu blur** — pure polish, do alongside #3 since both touch
   the same "menu should visually and functionally isolate from gameplay"
   goal; needs a visual value pass, not just a number picked blind.
