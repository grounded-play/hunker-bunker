# Sprint 19 Wave 2: Assets, One Tree, Lore Drops, Achievements

Master assignment doc, 2026-07-10 (evening). Wave 1
([sprint-19-next-work.md](sprint-19-next-work.md)) landed all three lanes:
legibility (`bbc286f`), run director (`9638feb`), physicality (`f2f97de`).
Wave 2 is the meta-and-content pass: make the world denser, the progression
coherent, and the replay loop visible.

Per-agent briefs:

- [sprint-19-wave2-gemini.md](sprint-19-wave2-gemini.md) — **Gemini:**
  Asset Factory & World Dressing (nano-banana prop sets, class FX webms,
  placement passes, achievement icons)
- [sprint-19-wave2-codex.md](sprint-19-wave2-codex.md) — **Codex:**
  Achievements engine + home-screen page
- [sprint-19-wave2-claude.md](sprint-19-wave2-claude.md) — **Claude:**
  Unified skill tree + findable lore drops

## The four asks, mapped

| Ask | State today | Lane |
| --- | --- | --- |
| Props for camps/cave, chroma-keyed; class webms | `loadKeyedSpriteTexture` keys black out of PNGs already; cutscene webms play full-frame only — no keyed-video path yet | Gemini |
| One skill tree instead of three | Three disconnected surfaces: CLASS_SKILL_TREES (grid + connector lines in the console modal), COMBAT MATRIX (weapon cards), ship systems (O2 generator levels + GOAL_ORDER + TIER2 cards) — all in `bank.js` data, three UIs | Claude |
| Findable lore drops | Lore *terminals* exist (dead-end scatter, feed `codexStore` + `hb_world_memory_v1`); no physical collectible drops | Claude |
| Achievements page, gated unlock | A stub exists: `hb_achievements_v1` in `main.js` tracks 5 stats, fires only on death, two hardcoded unlock strings, **no page** | Codex |

## Gap analysis — what you're missing (requested)

Ranked by how hard they'll bite later:

1. **The queen boss fight and boarding vessel are still the loudest absent
   promises.** Wave 2 deliberately doesn't take them — schedule as wave 3
   headliners; achievements ("SLAY THE QUEEN") will dangle them until then.
2. **Victory never runs the achievements path.** `checkAchievements` fires
   only on death — beating the game currently records nothing. Codex's engine
   must hook endings (`act2-milestone` / ending picker) too.
3. **Act 2 has no tutorialization.** The tutorial covers Act 1 survival;
   cover/suspicion/manifest arrive with no onboarding. The wave-1 legibility
   HUD softens this, but a first-reveal "new instincts" card sequence is
   cheap and missing.
4. **Audio debt.** Lockdown strobes, signal flares, proto enemies, and card
   draws all ship silent or reuse `ui_error`. A generated-SFX pass
   (`scratch/generate_sfx.py` exists!) should ride behind Gemini's art lane.
5. **New HUD on mobile is unverified.** Ledger/forecast/cards landed after
   the mobile passes (PRs 8/15). One viewport audit needed.
6. **Colorblind risk is compounding.** State language leans red/green
   (lockdown vs bonded, suspicion vs kin). Add shape/pattern redundancy to
   Gemini's asset specs now, not as a retrofit.
7. **Performance budget for per-sprite textures.** Walk-sheet enemies and
   civilians each own a 1024² keyed canvas. Fine at current counts; a texture
   cache keyed by path is a one-hour hardening task if wave 2 multiplies
   sheet users (it will — lore drops, props).
8. **Three run-director cards are still contract-only** (spore_bloom
   economy, ice_collapse sealing, egg_instability manifest) — cheapest
   "make seeds matter more" win available; Codex should sweep these if
   achievements land early.
9. **No demo/packaging story.** Netlify config exists; no itch.io page,
   no press kit, no build size audit. Flag for the humans, not an agent lane.
10. **Save-code UX.** `exportSaveCode` exists but is buried; an achievements
    page is a natural home for a "COPY SAVE CODE" button — folded into
    Codex's brief.

## Shared contracts (the seams)

- **Asset contract (Gemini → everyone):** 1024×1024, pure-black background
  (#000, no gradients into content), PNG-named-as-shipped (`.png` even when
  JPEG-encoded, matching current pipeline), chroma threshold ≤16 clean.
  Filenames: `prop_<site>_<name>.png`, `fx_<class>_<name>.webm`,
  `ach_<key>.png`. A manifest markdown per batch listing filename → intended
  placement.
- **Keyed-video seam (Gemini owns):** black-background webms play through a
  new `KeyedVideoSprite` helper (video texture + discard-dark shader) — the
  video equivalent of `applyBlackChromaKey`. Claude/Codex consume, never
  implement video keying themselves.
- **Events:** `achievement-unlocked { key, title, blurb }` (Codex dispatches,
  Gemini's toast/page renders); `lore-drop-collected { key, rarity }`
  (Claude dispatches; Codex counts it; feeds existing `codex-discover`).
- **Storage:** achievements stay in `hb_achievements_v1` (migrate the stub's
  five fields — do not orphan existing players' counts). Skill-tree
  unification must NOT change storage keys (`bank.js` save compatibility
  comment is load-bearing).
- **Shared files:** same wave-1 protocol — pull-rebase before work blocks,
  `npm test` green before commits, own your regions. `index.html`/`style.css`
  /`main.js` menu regions are Codex's this wave (achievements page); Gemini
  is mostly in `public/` + placement code; Claude is in `bank.js`, terminal
  modal markup, and world spawn code.

## Merge order

Gemini's asset batches land continuously (pure additions). Codex's
achievements engine lands before its page polish. Claude's tree unification
is the riskiest diff (touches the terminal modal) — lands last, rebased.
