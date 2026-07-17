# Sprint 19 Wave 2 Brief — Claude: Unified Skill Tree & Lore Drops

Derived from [sprint-19-wave2-work.md](sprint-19-wave2-work.md). Siblings:
[Gemini — Assets](sprint-19-wave2-gemini.md),
[Codex — Achievements](sprint-19-wave2-codex.md).

## Status

Implemented 2026-07-10 (commit `76a27fc`):

- **The Bunker Tree**: `src/skillTree.js` adapter (structure-only node
  graph; purchases delegate to existing BankManager paths; storage keys
  untouched) + a three-branch tree render on the console SKILLS tab with
  geometry-derived connectors. Old tier2/weapons card sections retired;
  Base-tab goal cards kept as the story-facing mirror.
- **Lore drops**: `src/loreDrops.js` — 14 site-keyed collectibles; seeded
  spawns (ruins/crater chunks 30% at mount, one per camp/hive/cave);
  touch-collect → `lore-drop-collected` + existing reader/codex;
  persistence in `hb_world_memory_v1.logsFound`, no respawn after reload.
- 16 unit tests; headless probe `scratch/verify_wave2_claude.js` (run it
  against a **static build** — `HB_PORT=5233` after `npm run build` +
  `vite preview` — sibling HMR reloads kill dev-server boots).
- Runtime verified: tree renders 3 branches, purchases land per branch,
  drops spawn/collect/read/persist/never-respawn (first run 11/12; the
  one FAIL was a probe assertion reading a nonexistent bank field —
  skills live in `state.unlockedSkills`).

Placeholder art note: drops use the tinted lore-terminal sprite until a
Gemini drop-sprite batch lands.

## Mission

Progression currently lives in three disconnected surfaces; merge them into
one legible tree. And give the world's lore a body: findable, collectible
drops rather than terminals alone.

## Part 1 — One tree ("THE BUNKER TREE")

### The three systems today (all data in `bank.js`)

1. **CLASS_SKILL_TREES** — per-class nodes with real tree topology
   (row/col/prereqs), rendered with connector lines in the console modal.
2. **COMBAT MATRIX** — WEAPON_UPGRADE_ORDER/CONFIGS, leveled cards
   (LV 0/3) in the ship terminal.
3. **Ship systems** — O2_GENERATOR_UPGRADES + GOAL_ORDER/GOAL_COSTS +
   TIER2_UPGRADE_CONFIGS, flat card sections in the terminal.

### Deliverables

1. **Adapter layer, not a rewrite** (`src/skillTree.js`, new, pure, tested):
   normalize all three systems into one node graph
   `{ id, branch: 'class'|'combat'|'ship', label, desc, cost, prereqs,
   level?/maxLevel?, position }`. Source data and **storage keys stay
   untouched** — the `bank.js` save-compat comments are load-bearing;
   unlock/purchase calls delegate to the existing BankManager methods.
2. **One UI surface**: a three-branch tree in the console terminal modal —
   class branch left, combat center, ship right, sharing one header
   (resources, class, O2 gen level). Reuse the existing connector-line
   grid renderer (generalize `getConnectorLine` off its hardcoded
   row/col cases). Cross-branch prereqs become *possible* (e.g. a future
   node needing `o2Bubble` + `scout_speed_1`) but ship none this wave —
   topology first.
3. **Retire the old sections** behind the new tabs once parity is proven:
   COMBAT MATRIX and TIER2/goal cards become branches, not separate
   scroll sections. Keep the fab bay separate — it's crafting, not
   progression.
4. **Legibility rules carry over**: every locked node states its blocker in
   plain language ("REQUIRES: O₂ BUBBLE"), same as wave-1 refusals.

## Part 2 — Findable lore drops

Terminals stay; drops are the physical counterpart — the "carry it home"
verb this game is about.

1. **`src/loreDrops.js`** (new, pure, tested): drop table
   `{ key, title, text, rarity, site: 'camp'|'cave'|'ruins'|'crater'|
   'hive'|'anywhere' }`. Write ~14 entries from the wiki lore
   (`docs/wiki/Lore-Overview.md`) — crew dog tags, contractor ledgers,
   PregAlien research shards, queen-cult scraps.
2. **World spawning**: site-keyed scatter placement — ruins/crater chunks
   via the landform hook (my wave-1 spawner pattern), camps/hives via
   placement near sites, cave interior fixed picks. Seeded, max 1–2 per
   chunk, sparkle idle so they read as findable. Use Gemini's
   `prop_*`/drop sprites when the batch lands; ship with a placeholder
   (existing `bunker_junk_rare` texture) so the system doesn't wait on art.
3. **Collect flow**: touch-collect (corpse-pattern: dedicated array, NOT
   scatter registries), dispatches `lore-drop-collected { key, rarity }`
   (Codex counts it), feeds `codex-discover`, shows the text as a readable
   card (reuse the lore-terminal reader UI).
4. **Persistence**: found keys in `hb_world_memory_v1.logsFound` (already
   exists) so drops don't respawn across runs.

## Files owned

`src/skillTree.js` (+test), `src/loreDrops.js` (+test), console terminal
modal markup region in `index.html`, tree render/purchase code in
`threeGame.js` (terminal regions) — plus spawn/update hunks in `threeGame.js`
world regions and `data/` additions.

**Off-limits:** achievements page/menu regions (Codex's), `public/` asset
generation and `KeyedVideoSprite` (Gemini's — consume only), `camp.js`/
`hiveSite.js` prop-placement hunks (Gemini's this wave — I announce any
adjacent edits in commit messages).

## Done when

- One terminal surface shows all three progression branches with working
  purchases, old sections retired, saves from before the change load with
  every unlock intact (test this explicitly).
- A run can find a lore drop in a ruins chunk, read it, see it in the
  codex, and never find that key again on the next run.
- Codex's ARCHIVIST achievement increments from my event without either of
  us touching the other's files.
- Unit tests for the adapter graph (every legacy node present exactly once,
  prereqs preserved) and the drop table; headless probe drives a
  purchase-per-branch and a drop collect.
