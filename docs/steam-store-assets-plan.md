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

Target length: ~49 seconds (action-first, per Steam's own guidance: reach
gameplay before any logo/title beat). Superseded the original 75s cut, which
opened on 5s of silent title card before any gameplay — see
`docs/superpowers/specs/2026-08-07-steam-trailer-capture-and-assembly-design.md`
for the capture/assembly design this beat sheet maps to.

v3 source footage is hand-recorded only, no automated captures: two
full-quality 1920x1080/60fps screen recordings
(`trailer/raw/clips/user-long.mp4`, ~6 min of real play across two runs;
`user-short.mp4`, ~12s covering boot + the real title screen) referenced by
absolute `start`/`duration` in `scripts/trailer-edl.json`. Neither the
Playwright-automated clips (`tests/e2e/trailer/`) nor the door-transition
wipe from earlier cuts are used here — cuts are driven entirely by
interstitial image cards instead.

Structure: six feature-callout cards (`public/interstitials/*.webp`, a large
bold **yellow** line in the lower third naming a real in-game mechanic —
"EVERY DOOR COSTS OXYGEN", "BANK WHAT YOU CAN CARRY", "RETRIEVE: TECH CACHE",
etc., not generic marketing copy) alternate with real gameplay chunks pulled
from confirmed non-boss windows in `user-long.mp4`. Both card duration and
gameplay-chunk duration shrink on every pair (3.5s->1.2s cards, 7s->3s
chunks) so the cut accelerates through the trailer, timed against the actual
build in the last ~50s of "Hunker Bunker Main Theme.mp3" (used as a
continuous background bed, not delayed SFX stabs). The trailer closes on
`user-short.mp4` trimmed to its cinematic archway-run + real title-screen
reveal, with the wishlist CTA drawn directly over its final held frame in
the same yellow lower-third style as the interstitial cards.

Two boss encounters (Cyber-Shell Titan, Cryo-Goliath Snail) recorded in
`user-long.mp4` were identified and cut entirely per direction — every
gameplay chunk in the current EDL sources from confirmed non-boss windows.

0-3.5s: Card 1 -- "EVERY DOOR COSTS OXYGEN" over key art.

3.5-38s: Five more card/gameplay pairs, each shorter than the last --
exploration, the Mothership dialogue hook, banking, combat -- cutting faster
as the OST build climbs.

38-48.7s: The short clip's cinematic reveal into the real title screen, CTA
drawn over the held final frame.

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
