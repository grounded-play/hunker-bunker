# Sprint 19 Wave 2 Brief — Gemini: Asset Factory & World Dressing

Derived from [sprint-19-wave2-work.md](sprint-19-wave2-work.md). Siblings:
[Codex — Achievements](sprint-19-wave2-codex.md),
[Claude — Tree & Lore](sprint-19-wave2-claude.md).

## Mission

Densify the world with generated art. Use nano-banana image generation for
sprite/prop batches and video generation for class FX webms — everything on
pure black so the existing chroma-key pipeline (and a new keyed-video helper
you own) lifts it clean.

## Asset contract (binding for every batch)

- 1024×1024, background pure #000 to the edges, no glow bleeding into black.
- Ship as `.png` in `public/` (JPEG-encoded is fine — matches current files).
- Keyable at threshold ≤16 via `loadKeyedSpriteTexture` / `applyBlackChromaKey`.
- Walk/anim sheets: 4×4 grid, camp-leader layout (rows S/N/E/W from top,
  4 frames per row) — `updateSheetSpriteFrame` in `threeGame.js` plays these.
- Each batch ships with a manifest section appended to
  `docs/wave2-asset-manifest.md`: filename → what it is → where it goes.
- Colorblind rule: state variants must differ in **shape or pattern**, not
  color alone (a lockdown prop gets bars/angles, not just a red tint).

## Batch 1 — Camp prop families (state-variant aware)

`prop_camp_*.png`. Prefer families with variants over one-offs, per the
review doc ("reuse prop families with state variants"):

- cookfire (lit / doused), laundry line, bedrolls, crate stacks, water
  still, antenna mast, tool rack, latrine screen, grave markers (fresh /
  old), sandbag segment
- lockdown variants: shuttered window panel, chained crate, warning placard
  (readable silhouette, not just red)

Placement pass: extend the camp build in `src/camp.js` (or a placement table
it reads) to scatter 3–6 props per camp, seeded, denser at higher `level`.
Culled camps swap to damaged variants where they exist.

## Batch 2 — Cave & hive dressing

`prop_cave_*.png`: egg clusters (intact / hatched), membrane growths, spore
stacks, bone piles, resin webs, the queen's throne mound (hero prop —
one-off allowed, it stages the future queen fight), glow lichen strips.

Placement: cave reveal interior (`caveReveal.js` scene) and hive surrounds
(`hiveSite.js`), 2–4 props per hive keyed to status (wounded hives get
cracked/leaking variants).

## Batch 3 — Class FX webms + the keyed-video helper

`fx_<class>_<name>.webm`, black background, 1–2s loops or one-shots:

- SCOUT: sprint-burst afterimage streak
- TANK: shockwave stomp ring
- ENGINEER: turret-reprogram arc / build sparks
- shared: level-up flourish, achievement-unlock burst (Codex's toast uses it)

**You own the runtime seam:** a `KeyedVideoSprite` helper (THREE video
texture + fragment shader discarding near-black, the video analog of
`applyBlackChromaKey`), with play/loop/dispose and a fallback to nothing on
codec failure. Siblings consume this API and never key video themselves.
Wire one proof: sprint-burst FX on the Scout ability.

## Batch 4 — Achievement icons

`ach_<key>.png`, 512×512 acceptable, black bg, strong silhouettes readable
at 64px. Key list comes from Codex's `ACHIEVEMENT_DEFS` (coordinate early;
~16 icons: speed-death, longevity, per-class victories, ending families,
all-camps, all-lore, hive-kin, pacifist, etc.).

## Verification

- Every batch: load in-game headless, screenshot, confirm keying leaves no
  black halo (the `scratch/shot_menu.mjs` / probe pattern).
- Placement passes get unit tests where pure (placement tables) and a
  headless screenshot probe otherwise.
- `npm test` green before every commit; batches are additive commits.

## Files owned

`public/prop_*`, `public/fx_*`, `public/ach_*`, `docs/wave2-asset-manifest.md`,
`scratch/generate_*` extensions, `KeyedVideoSprite` helper module, placement
hunks in `camp.js` / `hiveSite.js` / `caveReveal.js` (coordinate with Claude
— he owns other regions of `camp.js`/`hiveSite.js` this wave; announce hunks
in commit messages).

**Off-limits:** `bank.js`, terminal modal markup (Claude's tree),
achievements engine/page (Codex's — you supply icons and the toast FX only).
