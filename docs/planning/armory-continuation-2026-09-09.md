# Armory continuation: finish the selection experience

Status: implemented and browser-verified | Owner: Codex (Astra) | Updated: 2026-09-09
Review: implementation and browser verification; follows the existing Armory plan, not a new sprint.

## Current baseline

Resume from commit `ea18086` on Mountain. The original Antigravity plan's stage lighting, glass weapon bay, contact shadow, dark backplates and standby telemetry are present. The newer repository plan has combined weapon selection, tile dialogs and a weapon-sheen store. Preserve these changes and the recent gameplay, achievements, museum and narrative work.

The previous “complete” statement has limits: weapon sheen is only applied on the bench; sheen milestone functions are not connected to real events; the sidebar can scroll; community previews repeat class artwork; four icons retain green backdrops. Some achievement rewards are incorrectly called chassis even when offered as weapons. A class-loading race can replace the chosen weapon with the factory model. Cached weapon materials can be recolored across instances.

## User requirements and intended result

1. **One primary weapon control.** Clicking the fitted weapon opens a matching tactical item grid containing factory weapons and alternate weapon models. Choosing an item updates both its frame and model together. The stage describes the actual weapon, never calls it a finish, and displays complete catalog names instead of numeric IDs.
2. **Independent sheens.** Operator sheen continues to affect the suit. Weapon sheen colors the selected gun, survives reload and deployment, and preserves the gun's textures. Connect real achievement/world milestones to the existing sheen unlock map. Previously earned milestones must also grant their matching sheen. Unlock rules remain authoritative.
3. **A fitted charm.** Give the charm an equal place in the compact layout, show its actual preview, mount it on the gun, and make fast selection/removal settle on the last choice.
4. **One visual language.** Keep game typography, borders, class accents and operator-sheen modal styling. Equal item cards; complete selected-name readout; a clear equipped state; no dropdowns. Locked cards are desaturated/blurred, marked `?`, and use scrambled names without leaking the real name through accessible labels or hover text. Unlock hints may explain how to earn an item without revealing its identity.
5. **No scrolling.** Both the sidebar and item dialogs fit a single screen at desktop and handheld landscape sizes. Put weapon sheen/charm side by side, compact redundant telemetry and specifications, and calculate equal grid cells from the available viewport. All items stay reachable; hiding clipped content does not count as fitting. Preserve legible selected-item details.
6. **Visible hero and weapon.** Keep the stage composition left of the sidebar, including the weapon bay and charm. Verify the existing left pan before changing it further; adapt framing to the actual usable stage width if necessary.
7. **Accurate assets.** Render compact previews directly from the shipped 3D models for missing/shared/green-backed art. This produces faithful pictures without chroma backgrounds or invented models. Use existing achievement artwork where a unique reward model has not been authored and clearly record that limitation. Keep original source assets and provenance.
8. **An honest asset inventory.** Share the exact item resolver between UI and audit. Enumerate items actually offered by the class loadout lists, check real files, distinguish 2D decals (no model needed) from missing weapon/chassis models, and list every missing or placeholder preview. Do not treat allowlisting green art as a repair.

## Implementation order

### A — Finish the functional path

- Isolate cloned weapon materials and use the same tint operation in Armory and gameplay; restore original color when standard issue is selected.
- Initialize bench tint from saved selection and carry that selection into gameplay weapon construction, including fallback loads.
- Connect and reconcile milestone unlocks with saved achievements/world flags.
- Remove the default-weapon overwrite after asynchronous class loading; guard charm/module loads against late completion, clearing and disposal.
- Correct achievement reward type/name metadata and all stage/slot name fallbacks.

### B — Fit and operate the menus

- Keep the established composition; make the sidebar fit without scrolling by arranging related slots together and reducing redundant vertical space.
- Size picker grids against viewport width and height, including their title, item details and close control.
- Add dialog semantics, keyboard focus containment, arrow navigation, Escape dismissal and focus return. Prevent class-cycle shortcuts while a picker is open. Verify controller focus roots.
- Recheck current stylesheet delivery; the first browser inspection showed unstyled oversized slot art despite source rules being present.

### C — Replace poor previews and audit assets

- Add a shared item presentation resolver and checked-in preview manifest.
- Produce a distinct transparent model render for every community chassis and authored achievement chassis lacking art, and replace the four green-backed charm/module previews.
- Use the existing achievement images for still-unmodeled rewards, marked as reward emblems in the inventory. Preserve all current item IDs and earned ownership.
- Regenerate Markdown/JSON inventory with file paths, preview source, outstanding model needs and green-screen findings.

### D — Verify and document the result

- Focused tests: material isolation/reset, saved sheen and milestone reconciliation, weapon selection/ownership, late-load cancellation, item presentation and audit accuracy.
- Browser: Scout, Tank, Engineer; every slot; locked refusal; unlocked item previews; weapon/sheens/charm independence; class switches; reload; deployment; keyboard dismissal/focus return.
- Measure sidebar, modal and grid overflow at 1280×800, 1431×781, 1920×1080 and 1280×720. Capture representative screenshots and inspect them visually. Verify long names and the largest chassis collection.
- Run the full unit suite, lint, production build, presubmit and documentation audit. State failures or unverified hardware acceptance honestly.

## Completion criteria

- [x] All seven loadout controls and operator sheen remain visible without scrolling.
- [x] Every selection grid fits with equal cards and matching styling.
- [x] Locked items stay unknown and cannot be equipped; keyboard navigation works.
- [x] Names, current weapon readout and reward categories are consistent.
- [x] Weapon sheen persists, unlocks from real milestones and appears in gameplay.
- [x] Late loads cannot overwrite the last weapon/charm/module selection.
- [x] Missing/shared/green previews are replaced where shipped models exist.
- [x] The asset inventory explicitly lists any remaining unauthored models.
- [x] Screenshots and automated checks support the final report.


## Verified outcome

The continuation is implemented against `ea18086`, preserving the recent changes already on Mountain. The final full suite passes **2,620 tests across 292 files**; lint, production build/media checks and presubmit pass. Browser measurements cover **84 picker layouts** (seven fields × three classes × four viewport sizes). Every measured grid has equal outer card dimensions and fits without scrolling; the sidebar also fits at 1280×800, 1431×781, 1920×1080 and 1280×720. Locked weapon clicks leave the loadout unchanged. Escape restores the originating slot and Tab stays in the picker.

The selected Cryo-Plasma weapon and RESCUE LACQUER sheen were verified on the actual deployed weapon. Gameplay previously created an empty charm socket; the continuation now loads the fitted charm too, with a safe weapon-only fallback if its asset cannot load. The final browser record confirms `ClassWeapon_tesla_lock_skin4103`, `#ff6262`, and `charmMounted: true`. The selected sheen ID remains 7 after a full page reload.

The preview pipeline produced **79 transparent renders (4,213,332 bytes)** from existing models. Five still-unmodeled rewards use existing achievement emblems. The current 100-item inventory has **0 missing names, 0 missing previews and 0 green-backed Armory previews**. Remaining art tasks are explicit: five unique reward models and a finished replacement for the Talon-C blockout. Those assets are not represented as completed models.

A redundant chassis specification row was removed to make room for the actual selectors. The existing stage pan is retained: visual checks confirm the hero, weapon and fitted charm sit to the left of the controls. The original model render sources and source artwork are retained. No commit, push or release publication was performed.

Evidence: the companion implementation report, generated asset inventory and screenshots record this pass. Hardware/Steam service acceptance is separate from the browser and automated checks performed here.
