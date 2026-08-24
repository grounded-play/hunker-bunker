# Sprint 29 Visual Feedback, Season Rewards, and Presentation Fix Plan

**Date:** 2026-08-24  
**Scope:** In-game reticle and menus, world lighting, season-reward presentation, 2D/3D asset cleanup, weapon and charm placement, and player locomotion  
**Source:** Playtest feedback from the current build  
**Goal:** Make the game readable, reactive, and rewarding during the first minute of play and during every season-pass interaction.

## Executive summary

The current build has several presentation failures that make otherwise good systems feel unfinished:

- The expected crosshair / NIO menu UI is invisible or missing.
- The reactive world crosshair that should identify what the player is looking at is not reliably visible.
- Lighting looks strong at game start, then appears to switch off or lose its authored quality as the player moves.
- Season animations resolve to the same ending state instead of finishing with distinct reward-specific beats.
- Some 2D art still contains chroma-green backgrounds.
- Reward bursts render behind the objects they are meant to celebrate.
- The green XP information box is always visible, silent, and visually flat.
- Collecting a season-pass reward does not produce a strong reward reveal with a 3D idle/spin preview.
- Charms are misaligned on several guns.
- Guns are not consistently scaled to fit their gameplay presentation.
- Walking reads as gliding instead of grounded locomotion.

This plan treats these as one presentation sprint because they share a common problem: the game often has the underlying data or asset, but the player does not receive a clear, correctly layered, correctly timed, and sufficiently expressive visual/audio response.

## Sprint outcome

At the end of the sprint:

1. A player can always locate the primary reticle and understand when it is reacting to a valid target or interactable.
2. Menus and crosshair-adjacent UI are visible at the intended resolution and cannot be hidden behind the canvas, overlays, or blend effects.
3. Lighting remains intentional while traversing the world, with no unexplained loss of key, fill, emissive, or ambient contribution.
4. Each season/reward animation has a distinct, correctly layered finish.
5. Season-pass collection produces an unmistakable reward ceremony: burst, readable item card, sound, and a 3D idle/spin preview when a model exists.
6. All shipped 2D presentation assets are transparent or intentionally backed; no accidental chroma-green pixels remain.
7. Weapon and charm presentation uses calibrated per-archetype attachment points and gameplay-safe scale limits.
8. Walking has visible planted contact and believable weight at normal and sprint speeds.

## Priority and severity

| Priority | Area | Severity | Why it matters |
|---|---|---:|---|
| P0 | Player cannot fire; every shot attempt silently degrades to melee (see §20 Finding 2) | Blocker | Eight minutes of live play with zero clip and zero reserve ammo; refusals emit no sound, no reticle change, no HUD response |
| P0 | Primary reticle / reactive look crosshair invisible | Blocker | Removes aiming, targeting, and interaction feedback |
| P0 | Lighting drops or changes during movement | Blocker | Makes the game look broken and undermines navigation/readability |
| P0 | Season-pass reward collection lacks a proper reveal | Blocker for reward UX | The main progression payoff does not feel earned or understood |
| P1 | Reward burst behind content | High | The effect is technically present but visually ineffective |
| P1 | Season animations share the same ending | High | Repetition makes rewards feel generic and possibly broken |
| P1 | Walking glide | High | Constantly visible character-quality issue |
| P1 | Gun scale and charm placement | High | Damages first-person readability and cosmetic credibility |
| P1 | Chroma-green 2D assets | High | Visible production artifact in released presentation |
| P2 | XP green box always visible / no sound / uncool | Medium | Feedback is noisy and lacks impact after repeated pickups |
| P2 | Menu visibility and NIO menu diagnosis | Medium to high | Must be resolved alongside reticle layering and input routing |

The first P0 row was added after the second-pass log review. It is a gameplay blocker rather than a presentation defect, and it is admitted to this sprint because its visible symptom — the player acts and the game answers with nothing — is the exact failure mode the rest of this plan exists to correct. Scope is limited to instrumenting the fire path, surfacing the refusal reason, and giving the refusal a visible and audible response. If the root cause proves to be ammo economy balance rather than wiring, it is handed off; a balance pass is out of scope here.

## 1. Reticle, reactive crosshair, and NIO menu visibility

### Player-facing problem

The expected crosshair / NIO menus are not visible. The reactive crosshair that should tell the player what they are looking at is also invisible or unreliable. The player cannot tell whether the system is absent, transparent, behind the canvas, hidden by a state class, or being rendered in a color that disappears against the scene.

The term “NIO menu” should be reconciled with the current implementation during investigation. Treat the reported NIO menus as the expected named UI surface, not as a reason to assume a particular DOM ID.

### Investigation checklist

- Locate every reticle, crosshair, aim marker, world-hover marker, and NIO-menu element in `index.html`, `style.css`, `main.js`, and `src/threeGame.js`.
- Build a visibility matrix for each element:
  - Exists in the DOM.
  - Has expected dimensions.
  - Is not `display: none`, `visibility: hidden`, `opacity: 0`, or clipped.
  - Is above the canvas and below intentional blocking modals.
  - Is not hidden by a stale `hidden`, `is-hidden`, `active`, or gameplay-state class.
  - Uses a color, outline, glow, or contrast treatment visible in dark caves and bright rooms.
- Check whether the crosshair is drawn by DOM, canvas, CSS pseudo-element, or three.js. There must be one authoritative gameplay reticle path rather than competing invisible implementations.
- Check pointer-lock and viewport-coordinate conversion. A correct raycast with a missing or mispositioned marker still reads as a broken crosshair.
- Check whether menus are rendered behind the WebGL canvas, behind a fullscreen transparent layer, or inside an element with a lower stacking context.
- Check safe-frame and Steam Deck UI scaling. Test the native 1280x800 viewport and at least one 16:9 desktop viewport.

### Implementation requirements

- Create one explicit reticle root with a documented z-index and lifecycle.
- Give the default reticle a high-contrast center point and four directional marks; do not rely on color alone.
- Give the reactive state a distinct but restrained treatment:
  - Neutral: thin white/cyan reticle.
  - Look-at interactable: expanded brackets or corner lock with a short pulse.
  - Enemy/hostile: amber/red state, only when the target is valid and actionable.
  - Pickup/season object: emerald state with icon or short label where appropriate.
  - Blocked/unavailable: muted state, never invisible.
- Keep the reticle centered on the actual aim ray, not on a stale mouse position after pointer lock.
- Ensure menus receive pointer and keyboard focus while open and suppress world-reactive look feedback underneath them.
- Add a debug toggle that exposes the reticle state, target ID, raycast hit, and computed screen position without changing release visuals.

### Acceptance criteria

- The reticle is visible immediately after entering gameplay and remains visible while moving, turning, aiming, and shooting.
- The reactive state changes when looking at a known interactable, enemy, pickup, and empty surface.
- Opening each supported NIO/menu surface keeps the menu visible and prevents the world reticle from reacting through it.
- No state leaves the reticle permanently hidden after closing a menu, respawning, dying, changing weapons, or returning from a cinematic.
- Automated smoke coverage asserts computed visibility and state changes; a live browser check confirms the actual pixels.

## 2. Lighting drops or loses quality after movement

### Player-facing problem

Lighting looks excellent when the game starts, then appears to turn off or become less authored after the player moves. This may be a renderer state leak, a dynamic-light lifecycle issue, a scene/room transition issue, shader compilation hitch, exposure change, or a legitimate performance fallback being applied too aggressively.

### Investigation checklist

- Capture a before/after lighting snapshot at boot, after the first move, after crossing a room boundary, after opening a door, and after returning to the starting room.
- Record:
  - Active lights and their enabled state.
  - Intensity, color, distance, decay, shadow-map state, and parent scene.
  - Renderer exposure, tone mapping, output color space, fog, and environment intensity.
  - Number of visible lights and any quality-tier or Steam Deck fallback decisions.
  - Material shader compile errors and texture/normal-map load failures.
- Check for lights being disposed, detached, pooled incorrectly, or disabled when a room/prop unloads.
- Check whether moving causes the active scene to replace the boot scene without copying ambient/environment lighting.
- Check whether a “performance mode” or distance culling threshold disables lights at a player distance of zero or near zero due to coordinate-space confusion.
- Check whether the initial lighting is only a loading/showroom treatment and gameplay is unintentionally falling back to a weaker default.
- Check whether shader compilation or asset streaming causes emissive materials to appear unlit until a later frame.

### Implementation requirements

- Define an authoritative gameplay lighting baseline for each biome/room family.
- Separate critical readability lights from optional decoration lights. Critical lights must not be removed by ordinary streaming or budget pressure.
- Add a light-budget fallback that degrades decoration first, then shadow quality, while preserving the key/fill/rim relationship.
- Preserve environment/fog/exposure settings when replacing or streaming room content.
- Add a development-only lighting health report available from the debug console.
- If the quality fallback is intentional, expose its reason and make the transition gradual rather than an abrupt “lights off” event.

### Acceptance criteria

- The opening room and the next two traversed rooms retain intentional key, fill, ambient, and emissive readability.
- Moving across room boundaries does not change exposure or remove critical lights unexpectedly.
- Lighting remains stable after door transitions, enemy spawns, prop streaming, weapon swaps, death/revive, and menu open/close.
- Steam Deck and desktop profiles each have a documented expected lighting tier.
- A repeatable movement route and debug report can identify any future lighting regression.

## 3. Season animation endings are all the same

### Player-facing problem

Season animations begin with some variation but end on the same final state. The result feels like a single reused animation with different labels, and the final reward moment lacks identity.

### Required design direction

Every reward reveal should have a shared timing skeleton but a distinct final beat. Reuse of common entry motion is acceptable; reuse of the same ending pose, burst, camera settle, and audio sting is not.

### Implementation requirements

- Audit the season animation registry and identify where all entries converge on one final frame, callback, or CSS class.
- Split animation phases into explicit states:
  1. Anticipation.
  2. Reveal.
  3. Reward-specific hero beat.
  4. Hold/read time.
  5. Dismissal or continue.
- Add reward-family endings, for example:
  - Weapon skin: weapon sweep, material shimmer, muzzle-line accent.
  - Chassis skin: silhouette turn or shoulder/torso reveal.
  - Charm: attachment snap-in and small swing settling under gravity.
  - Rig module: mechanical deploy/fold motion with energy pulse.
  - Decal/emblem: 2D stamp or badge lock-in, not a fake 3D spin.
  - Voice pack: waveform/radio pulse and a short voice sting.
  - HUD theme: UI frame recolor and radar/grid activation.
- Make the final pose/data-driven so it is selected from the item definition, not inferred from a generic animation completion callback.
- Keep the animation deterministic enough for tests while allowing controlled particle/audio variation.

### Acceptance criteria

- At least three different reward categories visibly end differently.
- The final reward identity is held long enough to read the name and category.
- Replaying the same reward does not stack stale animation classes, particles, or audio.
- A test can assert the selected reward-family ending and completion callback.

## 4. Chroma-green contamination in 2D assets

### Player-facing problem

Some 2D images still show chroma green around or behind the subject. This reads as an unfinished extraction and is especially damaging during reward reveals and menus.

### Audit and cleanup

- Scan season, achievement, community, decal, and reward-presentation image directories for green-background assets.
- Identify whether the green is baked into the source image, introduced during processing, or caused by a missing alpha channel / incorrect blend mode.
- Prefer clean alpha-transparent exports for isolated objects.
- Use premultiplied-alpha-safe edges to prevent green halos around antialiased pixels.
- If an asset intentionally needs a green screen for an authoring workflow, keep that source outside the shipped runtime tree and process it before packaging.
- Add a build audit that rejects unexpected chroma-green pixels in runtime presentation assets, with an allowlist for intentionally green UI art.

### Acceptance criteria

- No accidental green background or halo is visible in the season pass, armory, reward reveal, or gameplay HUD.
- Transparent assets render correctly over dark, bright, and animated backgrounds.
- The build audit identifies the offending filename and fails loudly if a regression is introduced.

## 5. Burst animation layering and depth order

### Player-facing problem

The burst animation is present but appears far behind the objects it should celebrate. It loses energy because the burst is occluded or sits in a background layer.

### Implementation requirements

- Define the reward-reveal layer stack explicitly:

  1. Dimmed gameplay/background.
  2. Backdrop atmosphere and distant particles.
  3. Reward object / 3D preview.
  4. Main burst ring, shards, and radial rays.
  5. Item card and readable reward text.
  6. Foreground sparkles and edge accents.
  7. Input prompt / continue control.

- If the burst is DOM/CSS, fix stacking contexts and z-index rather than only increasing a local z-index. Check transforms, opacity, filters, and positioned ancestors because each can create a new stacking context.
- If the burst is three.js, place it in a dedicated reveal scene or camera layer with a known depth policy. Do not let it be occluded by the gameplay scene or the reward model unless that occlusion is intentional.
- If the burst is a particle system, confirm its render order, depth test, depth write, transparency mode, and camera-relative placement.
- Tie burst timing to the reward reveal state so it fires after the object becomes visible and before the card settles.
- Add a reduced-motion path that preserves the layer order and information hierarchy.

### Acceptance criteria

- The burst visibly reads in front of the reward object and behind the item card.
- It is centered on the reward object, not on an unrelated world coordinate.
- It cannot disappear behind a menu, modal backdrop, or fullscreen canvas layer.
- Screenshots at 1280x800 and desktop 16:9 show the same intended hierarchy.

## 6. XP feedback box: visibility, sound, and style

### Player-facing problem

The green XP information box is always visible instead of appearing only when relevant. It makes no sound and feels visually flat or “uncool,” so repeated XP gains become persistent UI noise rather than satisfying feedback.

### Implementation requirements

- Change the XP box to event-driven visibility. It should be hidden at rest and appear only for XP gain, level progress change, bonus, or a related meaningful event.
- Aggregate rapid XP gains into a short rolling burst instead of spawning or keeping a permanent box for every event.
- Add a clear enter/hold/exit lifecycle with cancellation and reset when the player dies, opens a blocking menu, or leaves gameplay.
- Replace the static green rectangle with a compact reward treatment consistent with the game’s visual language:
  - Small XP icon or rank mark.
  - Numeric gain with a brief count-up or tick.
  - Progress-bar or bar-fill response only when progress changes.
  - Accent pulse tied to the amount or bonus type.
- Add a short, non-fatiguing XP tick sound, with a stronger level-up or bonus sting. Respect mute, volume, and accessibility settings.
- Prevent the sound from firing on hidden/duplicate state updates.
- Avoid covering the reticle or important combat information.

### Acceptance criteria

- The XP box is absent during quiet gameplay.
- A normal XP gain produces one readable visual event and one appropriately mixed sound.
- Rapid pickups coalesce cleanly and do not leave stale boxes or overlapping audio.
- Level-up / bonus feedback is clearly stronger than ordinary XP.
- Menu, death, pause, and scene-transition states clean up the XP presentation.

## 7. Season-pass collection reward reveal

### Player-facing problem

Collecting a season-pass item does not feel like receiving a reward. The game needs a celebratory UI box that bursts up, names the item, and renders the 3D object or skin in an idle or spin state.

### Required flow

1. Player activates Collect.
2. Button enters a pending/disabled state to prevent duplicate grants.
3. Reward grant is confirmed by the inventory/economy layer.
4. Gameplay is dimmed or paused according to the existing modal policy.
5. Reward reveal container bursts in with the reward-specific animation ending.
6. Item name, category, rarity, and “Added to inventory” state appear.
7. A 3D preview loads or reuses the cached model.
8. The model idles or slowly spins in a presentation-safe turntable.
9. A category-specific audio sting plays once.
10. Continue/Close returns the player to the season pass with the item marked collected.

### 3D preview rules

- Weapon skins render on a neutral weapon turntable with a consistent grip/origin and a camera framing that fits the largest supported gun.
- Chassis skins render on the correct class rig or a validated mannequin, with animation retargeting disabled if it creates visible deformation.
- Charms render attached to the correct gun anchor, not as an independently floating object.
- Rig modules render on their intended mount.
- 2D-only rewards render as 2D artwork with a deliberate card treatment; do not force a low-quality fake 3D preview.
- Missing model assets must show an honest “preview unavailable” state while still identifying the reward and confirming the grant.
- Preview assets must be cached and disposed according to the existing asset-loading policy so repeatedly opening rewards does not retain every model forever.

### Acceptance criteria

- Every collectable reward produces a visible completion state and inventory confirmation.
- 3D-capable rewards show a correctly framed idle/spin preview before the reveal can be dismissed, unless loading fails.
- The reward card, burst, object, and audio are synchronized and play once.
- Double-clicking or repeated input cannot grant or reveal the same reward twice.
- Reopening a collected reward shows its collected state without replaying the grant.
- Keyboard, controller, and mouse flows all support Collect, Continue, and Close.

## 8. Weapon scale calibration

### Player-facing problem

Several guns are too large, too small, or inconsistent relative to the player’s hands, camera, and gameplay space. The issue is visible both in active gameplay and in reward/armory previews.

### Implementation requirements

- Establish one gameplay weapon-space contract:
  - Muzzle points down the weapon’s forward axis.
  - Grip and support-hand anchors match the player rig.
  - Weapon origin and pivot are documented.
  - World units and expected real-world length are recorded per archetype.
- Audit every weapon archetype and skin against the base weapon, not only against its source asset.
- Add per-archetype calibration metadata for position, rotation, and scale; avoid ad hoc mutations scattered through render code.
- Apply a safe scale clamp or validation warning for assets outside the expected range.
- Use separate framing profiles for first-person gameplay, armory, and reward reveal; do not solve all contexts with one camera distance.
- Validate muzzle flash, projectile origin, shell ejection, charm anchor, and hand placement after scaling.

### Acceptance criteria

- All shipped guns fit the gameplay camera and do not clip through the player or dominate the screen unexpectedly.
- Muzzle, projectile, hand, and charm positions remain correct after skin changes.
- Armory and season-pass previews frame every gun within the reveal bounds.
- A calibration/debug view can display the weapon axes, grip anchor, muzzle anchor, and charm anchor.

## 9. Charm attachment placement

### Player-facing problem

Many charms are placed incorrectly across different guns. They float, clip into the receiver, hang in the wrong orientation, or attach to a shared coordinate that is not valid for the weapon.

### Implementation requirements

- Define a named charm socket contract for each weapon archetype or validated weapon family.
- Store socket transforms with the weapon definition or a dedicated attachment-calibration registry.
- Use the weapon’s local coordinate space and inherit the weapon’s scale and rotation.
- Add per-charm offset only when the charm geometry requires it; do not hide weapon-socket errors in charm-specific offsets.
- Apply a small controlled swing/settle animation only after the static placement is correct.
- Include occlusion and collision checks in the armory/reward preview.
- Test charms on the smallest and largest guns, plus every special weapon family.

### Acceptance criteria

- Each charm sits on the intended attachment location for every supported gun.
- No charm is visibly buried, detached, mirrored, or intersecting the player’s hands during normal use.
- Switching weapon skins preserves the attachment point unless the skin explicitly defines a compatible alternate socket.
- The debug attachment view makes incorrect transforms easy to identify.

## 10. Walking animation and grounded locomotion

### Player-facing problem

The walking animation glides. The feet do not read as planted, the body translation is not synchronized with the step cycle, or the locomotion blend is using the wrong clip/speed. This makes the player character feel disconnected from the floor.

### Investigation checklist

- Compare root-motion behavior with code-driven player translation. Double-applied or missing root motion can both create sliding.
- Measure horizontal movement speed against the authored walk-cycle stride length and frames per step.
- Check foot contact timing, ankle/ground offset, and character capsule height.
- Check walk-to-idle, walk-to-run, strafe, backwards, slope, and stop transitions.
- Confirm animation mixer time scale is driven by actual movement speed and not a fixed value.
- Check camera bob and weapon sway timing; excessive camera smoothing can make correct feet look like glide, while missing body motion can make glide worse.
- Validate retargeting for each chassis skin, especially non-base silhouettes with different leg proportions.

### Implementation requirements

- Tune walk animation playback to the actual grounded speed.
- Add a planted-foot or stride-phase correction where supported by the rig.
- Blend acceleration and deceleration instead of switching abruptly between idle and walk.
- Add subtle vertical pelvis motion and controlled body weight shift.
- Keep foot placement stable on ordinary slopes and room thresholds.
- Ensure sprint has a distinct cadence and does not simply multiply the walk clip until it slips.
- Validate that chassis skins use compatible proportions or receive a dedicated retarget correction.

### Acceptance criteria

- A slow walk, normal walk, strafe, stop, and direction reversal all read as grounded.
- Foot sliding is not obvious in a 10-second fixed-camera capture on flat ground.
- The character remains planted when crossing a doorway or small floor transition.
- Sprint and walk have distinct cadence and body weight.
- The fix does not introduce foot penetration, capsule jitter, or weapon-camera desynchronization.

## 11. Shared technical architecture and ownership lanes

### UI / interaction lane

- Reticle root, reactive states, menu visibility, input gating, XP event lifecycle, and season-pass reveal shell.
- Owns DOM/CSS stacking contexts, safe-frame behavior, focus handling, and keyboard/controller parity.

### Rendering / lighting lane

- Crosshair screen placement if canvas-driven, reward reveal scene, burst depth order, lighting lifecycle, renderer quality fallback, and debug reports.
- Owns render order, depth test/write, scene transitions, exposure, tone mapping, and asset cache behavior.

### Season / economy lane

- Collection confirmation, duplicate protection, item-definition source of truth, reward-family animation selection, and inventory state.
- Owns grant-before-reveal ordering and honest missing-asset states.

### Asset / art lane

- Chroma-green cleanup, transparent export rules, reward-specific ending art, weapon scale calibration, charm sockets, and preview framing.

### Animation / character lane

- Walk cycle, retargeting, stride speed, planted feet, body weight, and sprint transitions.

### Audio lane

- XP tick, level-up/bonus sting, reward-family stings, menu/reveal mix, and duplicate-event suppression.

## 12. Suggested implementation order

### Phase 1: Restore readability and prevent regressions

- Make the primary reticle and reactive crosshair visible.
- Resolve menu/crosshair stacking and gameplay-input suppression.
- Capture and diagnose lighting loss with a movement-route report.
- Make XP feedback event-driven and hidden at rest.

### Phase 2: Make the reward loop land

- Implement the season-pass reward reveal shell.
- Fix reward object/card/burst layer order.
- Add category-specific animation endings.
- Add reward and XP audio with settings compliance.

### Phase 3: Correct the assets and models

- Remove chroma-green runtime artifacts.
- Calibrate gun scale and preview framing.
- Correct charm sockets and validate every weapon family.
- Add missing-model fallback states where the catalog is ahead of source art.

### Phase 4: Character polish and full validation

- Fix grounded walking and sprint cadence.
- Run the complete visual test matrix on desktop and Steam Deck-sized output.
- Capture before/after clips for reticle, lighting, XP, reward reveal, weapon/charm fit, and locomotion.

## 13. Validation matrix

| Test | Desktop 16:9 | 1280x800 / Steam Deck | Keyboard/mouse | Controller | Reduced motion |
|---|---:|---:|---:|---:|---:|
| Reticle visible at gameplay entry | Required | Required | Required | Required | Required |
| Reactive crosshair target states | Required | Required | Required | Required | Required |
| NIO/menu visibility and input isolation | Required | Required | Required | Required | Required |
| Lighting across movement route | Required | Required | Required | Required | N/A |
| Season reward collect/reveal/close | Required | Required | Required | Required | Required |
| Burst depth order | Required | Required | N/A | N/A | Required |
| XP visual and audio lifecycle | Required | Required | Required | Required | Required |
| 2D alpha/chroma-green audit | Required | Required | N/A | N/A | N/A |
| Weapon scale and charm attachment | Required | Required | Required | Required | N/A |
| Walk/stop/strafe/sprint grounding | Required | Required | Required | Required | N/A |

## 14. Test and tooling requirements

- Add or extend unit tests for:
  - Reticle state selection and reset.
  - Menu input gating.
  - Reward grant idempotency.
  - Reward-family animation selection.
  - XP event aggregation and cleanup.
  - Weapon/charm transform lookup.
- Add a browser smoke route or debug command that can:
  - Open the reward reveal with a known weapon, chassis, charm, decal, and 2D-only item.
  - Toggle reticle states.
  - Print active lights and renderer settings.
  - Show weapon/charm anchor axes.
  - Cycle locomotion states at a fixed camera.
- Add image/build audits for accidental chroma-green pixels and missing alpha.
- Run the existing build, media, season, and inventory audits after changes.
- Record any known unrelated failures separately from this sprint’s regressions.

## 15. Definition of done

This sprint is complete when all of the following are true:

- [ ] Reticle is visible and reactive in live gameplay.
- [ ] NIO/menu surfaces are visible, correctly layered, and isolate world input.
- [ ] Lighting remains stable through the defined movement route and scene transitions.
- [ ] Season animations use distinct reward-family endings.
- [ ] Burst effects render in front of the reward object and behind the readable card.
- [ ] Chroma-green artifacts are removed from runtime 2D presentation assets.
- [ ] XP feedback is hidden at rest, event-driven, styled, and audible.
- [ ] Season-pass collection shows the item, confirmation, audio, and correct 3D/2D preview.
- [ ] Weapon scale is calibrated for gameplay and preview contexts.
- [ ] Charms use correct per-weapon attachment transforms.
- [ ] Walking is grounded at walk, strafe, stop, and sprint speeds.
- [ ] Desktop and Steam Deck-sized visual checks pass.
- [ ] Tests and audits pass, with unrelated failures documented.

## 16. Log16 findings and evidence update

The 2026-08-24 gameplay session in `docs/logs/log16.json` provides useful runtime evidence. It does not contain enough UI-specific telemetry to prove every visual symptom directly, but it identifies several confirmed gaps and likely contributors.

### Confirmed from the session

- The game reached gameplay twice, so boot and deployment are functioning. The first run used Engineer and ended in oxygen-related death; the second used Tank and remained active through export.
- The season reward panel was opened at approximately `62.585s`, and `CLAIM REWARD` was activated at approximately `63.106s`.
- After the claim, there is no logged reward-granted event, reward-reveal event, 3D preview-ready event, burst event, or reward audio event. The claim path therefore has a missing or uninstrumented presentation sequence, not only a weak animation.
- Menu interactions are logged, but no menu visibility/render snapshot is emitted. `menuRenderSnapshot` is `null`, so the log cannot distinguish a hidden DOM element, incorrect z-index, transparent styling, or a missing menu implementation.
- The session records many canvas clicks but almost no weapon-fire events; explicit combat events are primarily melee attacks. Shooting needs its own event instrumentation and a live verification pass.
- One audio fetch failed: `Kaelens Sleeping Machine.mp3`. This is not proof of the missing XP sound, but it confirms that failed audio loads need to be visible and tested.

### Performance evidence that can affect the visual symptoms

The final gameplay snapshot reports approximately 4 million triangles, 900+ draw calls, 1.16 GB estimated GPU memory, adaptive gameplay performance mode enabled, post-processing disabled, and shadows enabled. Across the session:

- 2,105 long-task records were emitted.
- 25 long tasks exceeded 100ms.
- 11 long tasks exceeded 250ms.
- The worst recorded tasks were approximately 1.34s, 1.31s, 846ms, and 552ms.
- GPU telemetry recorded 970 dropped frames and a 409ms maximum GPU frame.

This does not prove that lighting is being disabled, but it makes performance degradation a credible contributor to lighting changes, animation hitching, delayed bursts, missing-feeling feedback, and poor locomotion readability. The lighting investigation must therefore compare visual state with adaptive-performance state rather than treating lighting as an isolated art bug.

### Instrumentation gaps to close

- Reticle state, target ID, visibility, screen position, and menu-blocking state.
- Menu open/close, computed visibility, and render-layer snapshot.
- Reward claim start, grant confirmation, reveal open, preview ready/failure, burst fired, audio fired/failure, and reveal close.
- Weapon-fire input and successful shot/projectile events separately from melee.
- Lighting snapshot before and after room transitions and adaptive-quality changes.
- XP event, XP aggregation, XP UI show/hide, XP sound play/failure, and cleanup.

## 17. Three-agent execution plan

The sprint can be worked in three lanes. Agents should keep their changes within their lane, avoid editing the same central presentation functions at the same time, and merge instrumentation contracts before relying on one another’s telemetry.

### Lane A — UI, reticle, menus, XP, and reward reveal shell

**Agent A ownership:** DOM/CSS/UI state, gameplay input gating, reticle presentation, XP feedback, season-pass reveal container, accessibility, and UI telemetry.

**Primary tasks**

- Trace and fix the invisible primary/reactive reticle.
- Establish one authoritative reticle root with explicit visibility, state, contrast, and stacking rules.
- Add reticle telemetry: state, target ID, visible/hidden reason, screen position, and blocking overlay.
- Audit NIO/menu surfaces for stale classes, opacity, clipping, safe-frame issues, and stacking contexts.
- Ensure menus suppress world-reactive pointer input while open and restore it correctly on close.
- Convert the XP box to an event-driven show/hold/hide lifecycle.
- Add XP aggregation, cleanup, and UI/audio event hooks.
- Build the season-pass reward reveal shell: dimmer, reward card, item metadata, claim confirmation, continue/close states, duplicate-input protection, and reduced-motion path.
- Add reward UI telemetry events defined in the log16 findings.

**Deliverables**

- Visible reticle and reactive states in gameplay.
- Reliable menu visibility and input isolation.
- XP box hidden at rest and shown only for valid XP events.
- Reward reveal shell that can accept a 2D fallback or a 3D preview supplied by Lane B.
- UI test coverage for reticle reset, menu blocking, XP cleanup, and claim idempotency.

**Dependencies**

- Lane B supplies preview-ready/preview-failure callbacks and reward-family presentation metadata.
- Lane C supplies audio event names and performance-state hooks.

**Do not change without coordination**

- Core three.js scene graph ownership.
- Weapon/charm transform registries.
- Global adaptive-performance thresholds.

### Lane B — Rendering, lighting, FX depth, assets, weapons, and charms

**Agent B ownership:** three.js rendering, lighting lifecycle, adaptive quality, reward 3D preview, burst depth order, asset cleanup, weapon calibration, and charm attachment transforms.

**Primary tasks**

- Capture and compare lighting state at boot, first movement, room transition, door transition, biome change, and adaptive-performance changes.
- Identify whether critical lights are disabled, detached, culled, replaced, or visually weakened.
- Add lighting snapshots and a debug report with active lights, exposure, tone mapping, environment intensity, shadows, and quality tier.
- Define critical-vs-decoration light budgeting so performance degradation preserves gameplay readability.
- Reduce the performance pressure identified by log16: investigate the 4M triangles, 900+ draw calls, 1.16GB GPU estimate, and dropped-frame spikes.
- Fix reward burst depth/order so it renders in front of the 3D object and behind the readable item card.
- Implement the 3D reward turntable and preview-ready/preview-failure callbacks for weapons, chassis, charms, and modules.
- Audit gun scale and create per-archetype gameplay, armory, and reward framing profiles.
- Add named charm sockets and calibrate placement across supported weapon families.
- Audit runtime 2D assets for chroma-green backgrounds/halos and correct alpha handling.

**Deliverables**

- Stable lighting through the documented movement route.
- Debug lighting/performance report tied to adaptive-quality changes.
- Correctly layered burst and working 3D reward previews.
- Weapon scale and charm calibration registry with debug anchor view.
- Clean runtime 2D exports or explicit missing-art fallbacks.
- Rendering tests for reward layer order, preview framing, and attachment transforms.

**Dependencies**

- Lane A consumes the preview callbacks and reward reveal container.
- Lane C supplies audio timing hooks and performance targets.

**Do not change without coordination**

- Reward grant/economy ownership.
- DOM reticle/menu markup unless required to expose a rendering state.
- Locomotion mixer code owned by Lane C.

### Lane C — Audio, combat telemetry, locomotion, and integration verification

**Agent C ownership:** audio event routing, sound-load diagnostics, weapon-fire instrumentation, walking/locomotion, cross-lane integration, and end-to-end verification.

**Primary tasks**

- Add XP tick, bonus, level-up, reward-category, menu, and reveal audio events with settings/mute compliance.
- Add audio load/play/failure telemetry and investigate the failed `Kaelens Sleeping Machine.mp3` path.
- Add explicit weapon-fire input, accepted-shot, projectile, and blocked-shot events separately from melee events.
- Verify whether the many canvas clicks in log16 are producing shots; document whether the issue is input, weapon state, aim state, or missing logging.
- Diagnose and improve walking glide: root motion, code-driven movement, stride speed, foot contact, blend transitions, body weight, slopes, and sprint cadence.
- Verify animation state transitions for walk, strafe, stop, reverse, dash, and sprint.
- Integrate Lane A/B telemetry contracts and run end-to-end flows:
  - gameplay entry → reticle state;
  - menu open → world input blocked;
  - XP event → UI + sound;
  - claim → grant → reveal → preview → audio → close;
  - movement → lighting/performance snapshot;
  - weapon fire → projectile and FX.
- Produce before/after capture notes at desktop 16:9 and 1280x800.

**Deliverables**

- Working and correctly mixed feedback audio.
- Evidence for the weapon-fire path, not just canvas clicks.
- Grounded walk and sprint transitions.
- Cross-lane integration report with reproducible pass/fail results.
- Final regression log separating new failures from existing unrelated warnings.

**Dependencies**

- Lane A supplies UI event hooks for XP and reward states.
- Lane B supplies preview, burst, lighting, and performance events.

**Do not change without coordination**

- Reticle layout and menu z-index ownership.
- Reward model transforms and light-budget thresholds.

## 18. Lane sequencing and handoff protocol

### Parallel start

All three agents begin with read-only reproduction and instrumentation review. Each agent records the exact files/functions they intend to own before making overlapping changes.

### First handoff

Lane A publishes the UI event names and reward reveal interface. Lane B publishes the preview and burst interface. Lane C publishes audio and locomotion event names. Interfaces should use stable item IDs and explicit success/failure states.

### Integration pass

Run the reward flow with a known weapon skin, chassis skin, charm, and 2D-only reward. Confirm that every stage emits one event and that repeated input does not duplicate grants, models, bursts, or sounds.

### Final verification route

1. Boot into gameplay and confirm reticle visibility.
2. Look at empty space, an interactable, an enemy, and a pickup.
3. Open and close the relevant NIO/menu surfaces.
4. Move across two room/biome boundaries and compare lighting snapshots.
5. Trigger XP gains and confirm visual/audio aggregation.
6. Claim a season reward and verify grant, burst, card, 3D/2D preview, audio, and close.
7. Fire the equipped weapon and confirm weapon-fire telemetry and projectile behavior.
8. Walk, strafe, stop, reverse, dash, and sprint under a fixed camera.
9. Inspect gun scale and charm anchors in gameplay and preview contexts.
10. Repeat at 1280x800 and desktop 16:9.

## 19. Agent completion criteria

An agent lane is not complete when its local code path works in isolation. It is complete when:

- Its events are emitted exactly once per user-visible action.
- Its failure states are visible in telemetry and do not leave stale UI, audio, models, or animation classes.
- Its changes pass the lane tests and the shared final verification route.
- Its performance impact is recorded, especially for rendering and reward previews.
- Any remaining art or source-asset blocker is named by item ID and does not silently appear complete.

## 20. Log16 second-pass forensics (verified 2026-08-24)

Section 16 was written from a partial read. This section records what was re-verified directly against `docs/logs/log16.json` (2,875 entries, 491,148ms). Where it contradicts §16, this section is authoritative.

### Build provenance — read this before trusting any symptom

The session ran a **packaged Electron build, `HunkerBunker/2.2.0`, Electron 43.4.1**, launched from `file:///C:/Program Files (x86)/Steam/steamapps/common/Hunker Bunker/resources/app.asar/dist/index.html`.

`package.json` on `dev/sprint-29` is at **2.3.1-beta**. The log therefore predates the v2.3.0-beta (Sprint 28) release entirely. **Every symptom below must be reproduced on the current branch before being fixed.** Some may already be closed; treating the log as a description of current `dev/sprint-29` behaviour will burn time on phantom bugs.

### Corrected numbers

| Claim | Verified value |
|---|---|
| Long tasks | 2,106 records; **26** over 100ms, **12** over 250ms |
| Worst long tasks | 1,340ms, 1,306ms, 846ms, 808ms, 552ms, 505ms, 461ms |
| Dash triggers | **141** across the session |
| Logged melee attacks | **8** |
| Canvas clicks | **194** |
| Phase transitions | 7 (`loading→splash→menu→armory→gameplay→gameover→armory→gameplay`) |

A secondary review characterised gameplay CPU as "occasional 83ms spikes." That understates it — the 1.3s tasks are real and are in the record. Both readings can hold: GPU frame time was healthy on the reporter's RTX 2070 SUPER while the CPU still stalled for over a second at specific moments. Diagnose against the timestamps, not the averages.

### Finding 1 — Shadow map is re-initialised on every armory entry (lighting lead)

```
[18515ms] WARN THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.
[368388ms] WARN THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.
```

This warning fires **twice**, and each firing lands within ~80ms of a phase transition into armory (`menu→armory` at 18,467ms; `gameover→armory` at 368,310ms). Two consequences, both relevant to §2:

1. The configured soft-shadow mode is being **silently downgraded** to hard `PCFShadowMap`. Authored lighting is not what ships to the screen.
2. Reassigning `shadowMap.type` invalidates every shadow-dependent material and forces a recompile. That is a credible mechanism for both the "lighting turns off after I move" report *and* the multi-hundred-millisecond long tasks clustered near transitions.

This is the strongest single lead in the log for §2 and should be Lane B's first check.

### Finding 2 — The player had no ammunition, and every shot attempt was silent

All 8 logged melee events carry `"source": "empty-fire-fallback"`. That string comes from exactly one place:

```js
// src/threeGame.js:5613-5617
if (this.weaponClipAmmo <= 0) {
    const availableAmmo = this.getAvailableAmmo();
    if (availableAmmo < 1) {
        return this.triggerGameplayMelee({ source: 'empty-fire-fallback' });
    }
```

So fire input **was** reaching `fireWeaponAtCurrentAim()`, and from 243s onward the player had zero clip **and** zero reserve, degrading every attack to a 4-damage melee — which missed on 6 of 8 swings. This partly answers §16's "are the canvas clicks producing shots?": they reach the fire path, and the fire path refuses.

What the log cannot settle, precisely because fire events are uninstrumented, is *why* the reserve was empty. `getAvailableAmmo()` reads `window.pickupCounterState?.ammo` (`src/threeGame.js:19114`), which is populated in `main.js:2767` from `STARTING_RUN_AMMO + ammoReserve` and exported at `main.js:3084`. The wiring exists, so this is either ordinary ammo starvation (an economy/balance problem) or a run-start grant that did not fire. Instrument first; do not assume.

The compounding problem is **silence**. `fireWeaponAtCurrentAim()` returns `false` with no cue on `weaponFireCooldown > 0`; `triggerGameplayMelee()` returns `false` with no cue on melee cooldown or inside a no-fire zone. An out-of-ammo player clicking in a no-fire zone gets *nothing* — no sound, no reticle change, no HUD response. That is the same class of failure as the rest of this sprint: the state exists, the feedback does not.

### Finding 3 — Dash-spam traversal corroborates the locomotion complaint

141 dash triggers is heavy — roughly one every 3.5 seconds of gameplay. Combined with Finding 2 (no offensive option available), it reads as a player avoiding traversal on foot. Treat it as supporting evidence for §10, not as proof on its own.

### Finding 4 — Packaged-build asset path resolution

```
[144481ms] FETCH error GET file:///.../resources/app.asar/dist/audio/ost/Kaelens%20Sleeping%20Machine.mp3 FAILED: Failed to fetch
```

The request targets a path **inside** `app.asar`. Assets listed under `asarUnpack` resolve at `app.asar.unpacked/...`; requesting them through the `app.asar` path fails. This is the only FETCH error in the session — 3D assets loaded correctly — so it is an audio-path issue, not a general packaging break. Route the request through `src/assetUrl.js` and confirm the `asarUnpack` globs in `package.json` cover the OST directory.

### Finding 5 — Deprecated Three.js APIs

```
[9ms] WARN THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.
```

`THREE.Clock` is deprecated in favour of `THREE.Timer`, which clamps delta spikes across tab-switch and window-blur. Given this build's long tasks, a delta spike after a stall is a plausible contributor to animation and locomotion hitching. Low-risk cleanup, but it belongs to the lighting/renderer lane.

### Finding 6 — Reward claim confirmed silent, with exact selectors

```
[62585ms] INPUT Click -> <div.progression-reward-panel>            "◈ TACTICAL DOSSIER // PROMOTIO"
[63106ms] INPUT Click -> <button#progression-claim-btn.start-btn.progression-claim-btn>  "◈ CLAIM REWARD"
```

Nothing follows. No grant, reveal, preview, burst, or audio event — the session returns straight to baseline render frames. `#progression-claim-btn` and `.progression-reward-panel` are the concrete entry points for the §7 reveal shell.

### Revised priority note

Finding 2 is a gameplay blocker, not a presentation defect: a player who cannot shoot for eight minutes is a more severe problem than any item in the P0 table above. It is admitted into this sprint because its *visible* symptom — clicking and getting no response — is the same feedback failure the sprint exists to fix. If the root cause turns out to be economy balance rather than wiring, hand it off rather than absorbing a balance pass into a presentation sprint.

## Related documents

- `docs/latest-asset-loading-and-season-audit-2026-08-21.md`
- `docs/asset-loading-and-season-completion-plan-2026-08-21.md`
- `docs/log2-ui-transitions-and-menu-isolation-plan-2026-08-19.md`
- `docs/3d-skin-and-weapon-reference-bible.md`
- `docs/animation-actions-master-catalog.md`
- `docs/sfx-design-manifest.md`
