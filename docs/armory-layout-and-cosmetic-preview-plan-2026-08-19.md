# Armory Layout & Cosmetic Preview Plan

Date: 2026-08-19
Scope: `src/armoryScene.js`, `src/armoryUi.js`, `style.css` (`.armory-*` rules).
Screenshots taken live at 1920x1080 (the non-narrow, 3-column layout —
`@container (max-width: 900px)` only kicks in below that, see #1) confirm
both reported bugs precisely; referenced inline below.

## 1. Gun hidden by the weapon panel, dead space to the right

**Confirmed via live screenshot.** At the intended desktop layout
(`.armory-main-layout`'s 3-column grid: suit panel | open 3D lane | weapon
panel), the weapon-bench-panel's own top edge slices right through the
gun's body — only the barrel/stock pokes out above the panel. Directly
above and around that point is a large, genuinely empty dark region (no UI,
no 3D content) — exactly the "space up to the right it could occupy" from
the report.

**Root cause, two compounding factors:**
- `.weapon-bench-panel` (`style.css:18201`) is sized
  `grid-template-columns: ... minmax(0, calc(var(--vu) * 60))` — 60vu wide,
  vs. the suit panel's 38vu. It's also bottom-anchored
  (`.armory-main-layout { align-items: end; }`) and grows upward with its
  five dropdown fields plus the overclock-badges block, so its top edge
  lands almost exactly where the weapon bench's 3D content is framed.
- The weapon bench group (`weaponBenchGroup`, `src/armoryScene.js:243`) sits
  at world position `(1.1, 1.25, -0.45)` — camera-height Y, not raised into
  the open space above the panel — with the gun scaled to a 1.15-unit
  "prominent" size (`loadWeaponAsset`, `src/armoryScene.js:312`) that's
  large enough to need real clearance it isn't given.

**Plan:**
- Raise `weaponBenchGroup`'s Y position (from 1.25 toward ~1.75-1.9) and
  nudge X right slightly, moving the gun's on-screen projection up into the
  confirmed-empty region above the panel rather than behind its top edge.
  Iterate with live screenshots (the establishing shot above already gives
  exact target coordinates) rather than guessing blind.
- Narrow `.weapon-bench-panel` back toward something closer to the suit
  panel's 38vu — 60vu is nearly double for a panel with the same shape of
  content (labeled dropdowns), and freeing that width gives the repositioned
  gun more room to breathe without crowding the panel again as its content
  changes (e.g. a future chassis-skin dropdown from #3 below).
- Re-screenshot after each change; this is a visual-composition problem,
  not one solvable from CSS/coordinates alone.

## 2. Gun clipping into the wall/rack panel behind it

**Confirmed via the same screenshot** — the gun's silhouette sits directly
against the grey `rackPanel` mesh (`src/armoryScene.js:149`, the "Magnetic
Weapon Wall Mounting Panel" prop mounted on `backWall`). `rackPanel` sits at
world Z `-0.6`, only `0.15` units behind `weaponBenchGroup`'s own Z (`-0.45`)
— for a gun scaled to a 1.15-unit bounding dimension (up to ~0.575 half-
extent from its pivot in the longest axis), that's not real clearance, and
the pivot auto-rotates continuously (`weaponPivot.rotation.y += dt * 0.15`,
`src/armoryScene.js:507`), so different guns/rotation angles will clip by
different amounts at different moments — explains why it reads as
inconsistent ("hitting the wall") rather than a fixed, obviously-wrong pose.

**Plan:**
- Move `weaponBenchGroup` forward (toward the camera, larger Z) and/or move
  `rackPanel`/`backWall` further back, restoining a real clearance margin
  (at least the gun's own half-extent plus a buffer, not a fixed number
  chosen blind — verify against the actual largest weapon archetype's
  bounding size once repositioned).
- Do this in the same pass as #1's Y/X reposition so the two don't fight
  each other across iterations.

## 3. Equipped cosmetics (colorway, badges) don't render on the armory preview

**The ask:** shoulder patches/decals and suit colorway ("shines") should be
visible on the 3D operator model while shopping for them, not just saved
silently to the loadout.

**Confirmed via code — two separate, already-real systems, neither wired
into the armory scene:**

- **Colorway ("Operator Polish"):** a complete, working system already
  exists — `OPERATOR_POLISHES`/`getSelectedPolish()`
  (`src/operatorPolishes.js`), its own modal (`#operator-polish-modal`,
  opened via `#hero-polish-btn`), and a real apply hook,
  `overlay.setOperatorPolish(color)`
  (`src/player3dOverlay.js:426-436`, recolors/relights the operator's suit
  materials). It's already wired to the *in-run* player
  (`window.game?.setOperatorPolish?.(...)`, `main.js:12362`) and the
  *title-screen* hero preview (`scoutHeroPreview?.setOperatorPolish?.(...)`,
  `main.js:3632`) — just never to `armorySceneInstance`. The armory's
  operator preview always renders in the default/unpolished color
  regardless of what's equipped (confirmed in the screenshot: plain white
  suit, no tint).
- **Shoulder patch / decal:** also real, but much newer and narrower in
  scope — a flat billboard icon sprite (`this.playerDecalSprite`,
  `src/threeGame.js:3762-3767`), chest-mounted, showing the equipped
  decal's 2D catalog icon. Its own comment confirms the gap directly:
  *"previously equippable via the Armory but never actually rendered
  anywhere"* — meaning even the real in-run player only recently started
  rendering it; the armory preview was never given the same treatment.

**Plan:**
1. **Colorway — small, low-risk, matches an established pattern exactly.**
   `armoryScene.js`'s `createArmoryScene()` return object needs a
   `setOperatorPolish(color)` passthrough that forwards to
   `currentOverlay.setOperatorPolish(color)` (guarding for the overlay not
   being loaded yet — store the pending color and apply it once
   `loadOperatorModel` resolves, same as the weapon/charm/mod loaders
   already handle their own race). Call it once on initial load and again
   inside `setClass()` (since `loadOperatorModel` rebuilds `currentOverlay`
   per class switch, dropping any previously-applied tint). Wire the call
   site in `main.js`/`armoryUi.js`: read `getSelectedPolish().color` the
   same way the title-screen preview already does, apply on armory init,
   and re-apply if the player opens the polish modal while the armory is
   showing (check whether that's even reachable — if the polish modal isn't
   openable from inside the armory screen today, this may just be an
   init-time read, no live-update path needed).
2. **Shoulder patch — reuse the exact sprite pattern from `threeGame.js`.**
   Add a small billboard icon sprite to `currentOverlay.root` (or a fixed
   offset from `operatorGroup`) in `armoryScene.js`, positioned to roughly
   match `playerDecalSprite`'s chest-mounted placement, showing
   `getItemCatalogEntry(decalId)`'s icon exactly like
   `updatePlayerDecalSprite()` already does. Update it from the existing
   `armory-decal-select` change handler in `armoryUi.js` (currently that
   handler only calls `loadoutManager.equipDecal(...)` and re-renders the
   HTML — add a call into the armory scene's new `setDecal(decalId)`
   method, mirroring `setCharm`/`setRigModule`'s existing pattern) and once
   on initial load/class switch (decals aren't class-specific, but the
   sprite attaches to the per-class `currentOverlay.root`, which gets
   rebuilt on every class switch same as the polish tint above).

**Priority:** medium — real, reproducible "what you configure isn't what
you see" gap for two whole cosmetic categories the game already sells/gates
progression around. **Risk:** low for both — colorway reuses a proven,
already-shipped apply function; decal reuses a proven, already-shipped
sprite pattern. Neither touches gameplay-critical code, both are purely
additive to the armory preview.

## Execution order

1. **#3 colorway** — smallest, safest, reuses existing working code
   end-to-end. Do first to bank a clean win before the layout work, which
   needs iteration.
2. **#3 shoulder patch** — same shape of fix, slightly more new code (a new
   sprite + positioning versus wiring an existing function call).
3. **#1 + #2 layout/clipping** — do together (repositioning fights between
   them otherwise); needs live-screenshot iteration, not a one-shot
   coordinate guess.
