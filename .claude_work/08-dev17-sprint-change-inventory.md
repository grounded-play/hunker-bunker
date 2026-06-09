# dev17-sprint — Full Change Inventory & Re-implementation Playbook

**Generated:** 2026-06-07
**Branch:** `dev17-sprint`
**Base:** `mothership` @ `9fcc033` (clean linear fork — `merge-base == mothership HEAD`)
**Scope:** 35 commits ahead + uncommitted working tree
**Diff vs mothership (committed):** 65 files, +8,488 / −1,023
**Uncommitted working tree:** 9 files, +665 / −246
**Test status:** ✅ 115/115 passing (17 files) even WITH uncommitted changes

## ⚠️ Reality check before any reset
This branch is **not structurally broken**. The history is clean, themed, and fully
tested. A literal "reset to mothership and reimplement all 35 commits" would discard
a large amount of tested, working work and is almost certainly the wrong move. The
reported problem is **visual UI regression**, which is concentrated in the UI-heavy
commits + the uncommitted layer — not in the logic/data/server/perf commits.

Recommended framing: keep the safe non-UI work, surgically redo only the UI layer.
See **§Re-implementation strategy** at the bottom.

## 🛟 Safety backups created (2026-06-07 19:03)
- Branch: `backup/dev17-sprint-20260607-190313` — full committed state of dev17-sprint
- Stash: `stash@{0}` "dev17-sprint-uncommitted-backup-…" — the 665 lines of uncommitted work
- Restore committed work: `git checkout backup/dev17-sprint-20260607-190313`
- Restore uncommitted work onto any base: `git stash apply stash@{0}`

---

## A. Committed changes by theme (oldest → newest)

### A1. World / rendering / atmosphere  *(UI-risk: MED — visual but mostly in-canvas)*
- `a6a287e` class-specific + victory/defeat-specific doors
- `1988860` canvas-based darkness, flashlight carving, easy-tier cybersnail, baselight improvements
- `b7ef78f` dynamic class-themed ring-edge base lights (invisible bulbs)
- `f0bfe88` scalable pit holes, bottomless black chasm centers, cooling-shader bullet decals
- `7d1d8e8` snail trails, off-screen patrol/boss spawning, aggro AI targeting, shoot-inside-O2,
  rain occlusion fix, radar scan Q ability, wall structural variations
- `72eec12` perf: pre-allocate hazard wall geometries/materials (anti-stutter)
- `ee59409` perf: eliminate chunk-load frame dips (merged floor plane + drop per-wall lights)

### A2. HUD / on-screen UI  *(UI-risk: HIGH — primary suspects for "fucked UI")*
- `436b3f1` reposition interactive HUD prompts to top-right, O2 upgrade timing, codebase link,
  remove manual deposit button, immersive loading screen w/ preloaded doors
- `573c013` persistent loop-state HUD cue — top-center `#loop-step-hud` (EXPLORE/BANK → REPAIR O2 →
  DEFEND → FOLLOW FOUNDRY → ACTIVATE FAB → EXTRACT)
- `cdf0504` reposition updates/transmissions sidebar → left, pickup panel → right, hide all HUD
  overlays during cutscene, remove O2 drain penalty from standard sprint
- `15c6a42` fix menu prompt leaks and mission dialogue
- `73f9994` polish HUD prompts and sprint flow
- `a374b8e` fix door loader flow and touch HUD visibility
- `c8c5c80` custom abyss death cause on game-over screen
- `b677e29` **UI enhancements and snail bounce-back physics fixes** ← newest, broad UI touch

### A3. Menus / character select / tabs  *(UI-risk: HIGH)*
- `b439a85` tactical tabs, visual skill trees, standard sprint, ability gating, corpse heaps, sonar radar pings

### A4. Doors / screen transitions  *(UI-risk: HIGH — overlay positioning)*
- `c40100f` fix door transitions by moving transition overlay outside `#ui`
- `fd8cf9e` prevent game UI/HUD flash during door opening transition

### A5. Dialogue / radio HUD  *(UI-risk: MED-HIGH)*
- `a138f17` reroute radio dialogue panel → top-right; hide on game load
- `6b50d25` Banjo-Kazooie typing sound; sync input states with viewport orientation locks
- `d809847` dialogue head/avatar UI support, fix tutorial card stacking order (tutorial priority 0,
  radio prompt priority 10)

### A6. Class abilities  *(UI-risk: LOW)*
- `b6d2a3a` Scout SPRINT / Tank BRACE / Engineer REROUTE differentiation; server port doc fix
- `1b813cc` in-game O2 startup sequence, class-specific fabricator dialogue, delayed boss spawn
- `0c8550d` mothership-style fabricator gamba reveal (rarity tiers 40/40/17/3, spin-strip UI)

### A7. Cohesion systems (doc 11)  *(UI-risk: LOW — logic + small UI hooks, all tested)*  ⭐ KEEP
- `64e2b83` **Bunker Director** + run-modifier effects — `src/director.js` (9 tests)
- `291feaf` wire remaining run modifiers (bad_map_data, unstable_doors)
- `b82e6e9` prior contractor's black box surfaced at base — `src/blackBox.js`
- `6fabe61` **Field Codex** discover-by-encounter — `src/codex.js` + `src/data/codex.js` (modal UI)
- `db54f99` mimic terminals + Engineer verify-to-disarm
- `26150ff` depth-scaled extraction retention protocol
- `7496c39` lights-out downside holds full duration

### A8. Content / data extraction (god-file carve, behaviour-preserving)  *(UI-risk: NONE)*  ⭐ KEEP
- `bd5341f` mission briefing variety — `src/data/missions.js`
- `dd88336` enemy archetype stats — `src/data/enemies.js`
- `32d34e9` depth-tier loot config — `src/data/loot.js`
- (also present: `src/data/dialogueLines.js`, `src/data/runModifiers.js`, `src/data/terminalEvents.js`)

### A9. Server hardening  *(UI-risk: NONE)*  ⭐ KEEP
- `f4bfc1e` validate/clamp movement, rate-limit (~60/s), configurable CORS (`HB_ALLOWED_ORIGINS`)

### A10. Docs  *(UI-risk: NONE)*
- `4946c98` refresh Current Prototype Status

### A11. New assets shipped (binary, in `public/`)
- Audio (`public/audio/vg2/*`): enemy death/hit, player death/hit, sidearm fire, reload, weapon upgrade SFX
- `scratch/generate_sfx.py` — SFX generator
- Doors: `door_alien/bio/cryo/nuclear/rust.png`
- `pit_hole.png`, updated `decal_scars.png`

---

## B. Uncommitted working-tree changes (the freshest layer — top "fucked UI" suspect)
9 files, +665 / −246. **These are NOT yet committed.** Tests still pass.

- **`style.css`** (+158): responsive door-transition split (panel-relative `background-size:100% 200%`
  replacing fixed `--vu` squares that overscanned on non-design aspect ratios/mobile); tall-window
  cabinet top-anchor `@media`; char-select layout/font tweaks; new `class-card-lock` keyframe anim;
  char-preview sprite scale 1.8→1.32.
- **`index.html`** (+204/−…): 4 regions — ~line 226, 742, 779, 864 (markup restructure).
- **`dialogue.js`** (+203): big additions around O2 milestone lines + DialogueManager (avatar/prefix handling).
- **`main.js`** (+101): radio transmission parsing/trim, HUD notification cards, tactical cursor init.
- **`threeGame.js`** (+79): scattered (snail bounce-back physics ~L2283, render tweaks).
- **`bank.js`** (+69) + **`bank.test.js`** (+70): bank state additions (migrate/serialize).
- **`director.js`** (+13) + **`director.test.js`** (+14).

---

## C. Re-implementation strategy (if resetting)

The non-UI work (A7 cohesion, A8 data, A9 server, A10 docs, plus A11 assets) is clean,
tested, and carries **zero UI risk** — there is no good reason to redo it by hand.

**Preferred order to rebuild a clean branch off mothership:**
1. `git checkout mothership && git checkout -b dev17-clean`
2. Cherry-pick the safe layers first (they'll apply cleanly, tests stay green):
   - Server: `f4bfc1e`
   - Data carves: `dd88336 32d34e9 bd5341f`
   - Cohesion: `7496c39 64e2b83 291feaf b82e6e9 6fabe61 db54f99 26150ff`
   - Docs: `4946c98`
3. Re-apply world/render + perf (A1) — verify in-app each step.
4. Re-apply the UI layers (A2–A5) **one commit at a time**, running the app between each,
   so the exact commit that "fucks the UI" is caught the moment it appears.
5. Decide per-commit whether the uncommitted §B polish replaces or supplements it.

**Alternative (lower effort, recommended):** the branch already works + tests pass.
Rather than reset, run the app, identify the specific visual regression, and fix/revert
only the offending commit(s) from A2–A5. Backups above make either path fully reversible.

---

## D. RESOLUTION (2026-06-07) — what we actually did
A "logic-only" subset reset was proven **mechanically impossible**: logic + UI share
`threeGame.js`/`main.js`/`dialogue.js` on a linear interdependent history (the first
"safe" commit `72eec12` conflicts on bare mothership). So we kept all 35 commits and
**fixed the UI forward**.

**Screenshot audit (branch vs mothership) via `scratch/shot.mjs` + local headless Chrome:**
- Splash screen — **identical** to mothership (no change).
- Char-select — **the real regression**: hero render shrank (`char-preview-stage`
  21vu→15.5vu; `#char-preview-sprite` scale 1.8→1.32) and got crowded by the new
  detail-panel + R.O.N.A.L stat rows.
- In-game HUD — mothership HUD **plus kept features** (loop-step banner, console prompt,
  mission-progress). Not a regression. (Open Q: touch controls render in headless —
  verify they're hidden on real desktop-with-mouse.)
- Mothership intro dialogue panel — intentional "dialogue head UI" feature, looks good.

**Fix applied (uncommitted, in `style.css`):**
- `.char-preview-stage` width `15.5vu → 19vu`
- `#char-preview-sprite` transform `scale(1.32)/translateY(0.2) → scale(1.7)/translateY(0.5)`
- Result: hero is prominent/hero-forward again (mothership feel) while keeping the
  branch's loadout + stat features. 115/115 tests pass, app eslint clean.

Tooling left in tree (untracked): `scratch/shot.mjs` — repeatable UI screenshot harness
(`W=.. H=.. CLICKS=.. SEQ='#sel,..' POST=.. OUT=.. node scratch/shot.mjs`).
