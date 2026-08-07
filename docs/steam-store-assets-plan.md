# Steam Store Assets Plan

Date: 2026-07-13.

This is the player-facing Steam store kit for Hunker Bunker. It pairs exact-size
capsule exports with a trailer structure, screenshot capture plan, and store
copy that sells the tone without promising unapproved economy features.

## Capsule Exports

Source art:

- `public/title_key_art.png`

Generated exports:

- `steam/store/steam_header_capsule_en.png` — 920 x 430
- `steam/store/steam_small_capsule_en.png` — 462 x 174
- `steam/store/steam_main_capsule_en.png` — 1232 x 706
- `steam/store/steam_vertical_capsule_en.png` — 748 x 896
- `steam/store/steam_library_capsule_en.png` — 600 x 900

Export rules:

- Crop from the title key art rather than stretching.
- Keep the title area legible after resize.
- Verify dimensions with `identify` or `file` before upload.
- Treat these as first-pass production placeholders until final painted key art
  exists.

## Trailer Beat Sheet

Target length: ~57 seconds (action-first, per Steam's own guidance: reach
gameplay before any logo/title beat). Superseded the original 75s cut, which
opened on 5s of silent title card before any gameplay — see
`docs/superpowers/specs/2026-08-07-steam-trailer-capture-and-assembly-design.md`
for the full capture/assembly design this beat sheet maps to.

Built end-to-end from this repo: Playwright drives real WASD movement +
mouse aim/fire against the live game (`tests/e2e/trailer/`) to capture raw
footage into `trailer/raw/clips/`, and `scripts/build-trailer.js` (data-driven
from `scripts/trailer-edl.json`) assembles it into
`dist/trailer/hunker-bunker-trailer.mp4` — Ken Burns pans, a reused
door-transition wipe (`#transition-overlay`, cropped/zoomed differently each
reuse so it doesn't read as a repeated clip), OST tail + rotated SFX one-shots,
final 1920x1080/30fps H.264/AAC encode at 5,000+ Kbps.

0-5s: Cold open, mid-action — hard cut straight into real played gameplay
(weapon drawn, enemies on screen). No logo, no fade.

5-19s: The loop, fast — real movement/exploration cut on the door-transition
wipe between beats.

19-28s: Pressure — real gameplay continues, oxygen/HUD pressure readable.

28-34s: Escalation — real combat, reload under fire.

34-44s: Final approach — real movement building toward the reveal.

44-51s: The cave reveal (`public/cutscenes/cave-reveal.webm`) — tone shift,
no Act 2 spoilers.

51-57s: Title card, then the lull, then the wishlist/CTA card.

Known limitation: a captured Queen-fight take was dropped from this cut —
the run's console-terminal modal reopened unpredictably during that specific
take and never produced a clean stretch of footage; worth a dedicated
re-capture rather than reusing the current `capture-playthrough-boss.spec.js`
take as-is.

## Screenshot Plan

Capture at 1920 x 1080 unless a specific Steam capsule/screenshot slot requires
another size.

1. Title/menu with operator selection and class identity visible.
2. Early bunker exploration with HUD, oxygen, resources, and threat readable.
3. Generator/interactive objective moment with controller prompt visible.
4. Combat pressure shot with enemies, projectiles, and clear player silhouette.
5. Archive or fabrication UI showing the run-management layer.
6. Game-over results screen with leaderboard widget.
7. Cave reveal shot with the new tone visible but not overexplained.

Capture notes:

- Use the existing shot-tour harness when possible.
- Hide debug overlays.
- Prefer readable game-state screenshots over cinematic empty scenes.
- Include at least one 1280 x 800 Steam Deck audit screenshot for internal QA.

## Store Copy

Short description:

Hunker Bunker is a tense sci-fi extraction roguelite about diving into a frozen
industrial bunker, banking what you can, and deciding how much deeper your suit
can afford to go before the dark starts answering back.

Long description:

You are a contractor in a failing exosuit, dropped into an ice-locked bunker
where every door costs oxygen, every resource asks to be banked, and every
successful run makes the next descent feel less like salvage and more like a
signal being returned.

Choose a suit, raid the underground facility, repair systems, recover logs, and
decide when to extract. Push too far and your black box may be all that makes it
home. Push far enough and the bunker stops being a job site.

Feature copy:

- Fast extraction runs built around oxygen pressure, banking, and escalating
  bunker routes.
- Three operator frames with distinct survivability, tempo, and utility.
- Steam leaderboards for trusted run scores.
- Controller-first prompts and Steam Deck-focused layout checks.
- A story arc that begins as industrial salvage and turns into something alive
  beneath the ice.

Do not include in store copy yet:

- Paid crates, keys, random economy rewards, or marketplace promises.
- Unreviewed Steam Inventory grants.
- Act 2 ending specifics.
