# RGB: Chapter Flow, Narrative Pacing, and Wiring Repair

**Date:** 2026-07-26
**Status:** Approved for implementation
**Scope:** `src/minigames/rgb/*`, `style.css` (rgb block), RGB docs, placeholder art

## Problem

Chapter 1 of the RGB mini-game reads as clean and deliberate. Chapters 2-6 do
not. Investigation shows three separate causes that have been mistaken for one:

1. **Simultaneous-choice clutter.** Chapters 3 and 4 present 11 and 8 hotspots
   at once with no ordering cue. The player cannot tell what is essential, what
   is optional flavour, or what order preserves the story's sense. Chapter 1
   only *reads* clean because it has two buttons — it is not richer, it is
   emptier.

2. **Authored content that never reaches the screen.** A large amount of
   finished work — hints, voice-over, item art, ending art, speaker labels,
   and two state variables carrying the game's central theme — is present in
   the repo but not wired to anything. The story feels fast and unclear partly
   because a third of what was written is invisible at runtime.

3. **Missing beats.** `scene-flow.md` and `narrative-script.md` specify
   required beats that were never authored as hotspots, including every
   Chapter 1 beat except the final fork.

Total hotspot count is 35 against `game-design.md`'s stated scope of ~25. That
figure is worth restating rather than defending: it was written when every
hotspot in a chapter was visible at once, so total count *was* the measure of
on-screen complexity. Under a staged funnel the meaningful metric changes to
**simultaneous** choices, and the two numbers stop tracking each other. This
design raises the total to 44 while lowering the maximum visible at any moment
from 11 to 3. The added beats are all beats the design documents already
require and that the story currently skips; the reduction the player actually
feels comes from gating, not from deletion.

## Non-goals

- No new UI framework, no engine rewrite, no free-roam navigation.
- No new timing/QTE pressure. The finale's difficulty is expressed as an extra
  step, not a timer, so it stays within the accessibility rules already in
  `game-design.md`.
- No re-cutting of existing cinematics. All 24 produced clips keep their
  meaning; only their trigger points are corrected.

## Section 1: Engine mechanism

The content schema already supports sequential gating via `requiresAllOf`, and
Chapter 2 already uses it well (diagram → joint → pressure → tap). The staged
funnel generalises that pattern. Three additions to `runtime.js` /
`isHotspotAvailable` support it:

### 1.1 `excludesAllOf`

Mirrors `requiresAllOf`. A hotspot listing a sibling id becomes unavailable
once that sibling is visited. Required because nothing currently prevents
selecting both `keep_notebook` and `surrender_notebook`, or both
`brace_for_impact` and `take_the_hit` — either/or choices that the state
machine treats as exclusive but the UI does not.

### 1.2 `requires.minVisitedOf: { ids: [...], count: N }`

Unlocks a hotspot only after at least N of the listed ids have been visited.
Applied to chapter exits. This closes the worst pacing hole: `give_up` in
Chapter 4 is currently clickable the instant the scene loads, letting a player
reach a game-over having skipped the chapter's entire argument (that no
legitimate path works). `scene-flow.md` requires exactly this — "the
transaction times out only after an explicit set of attempts."

### 1.3 Voice-over precedence

`audio.js` exports `hasAuthoredVoice()`; `runtime.js` never calls it, so
browser TTS fires over every line including those with produced recordings.
`speakLines` becomes a fallback gated on `!hasAuthoredVoice(hotspotId)`, and
`HOTSPOT_AUDIO` gains the nine currently-orphaned voice entries so they play
on their matching beats.

## Section 2: Reconnecting authored content

Each item below is finished work already in the repo that no code path reaches.

| Asset | Current state | Fix |
| --- | --- | --- |
| 18 chapter hints | in `content.js`, unused | Hint ladder UI, `H` key / footer button, progressive 1→2→3 |
| `settings.hints` | persisted in `save.js`, unread | Drives hint availability (`standard` vs `off`) |
| `calibrationQuality`, `trust4A` | computed, unread | Drives the Chapter 6 rescue (see 3.6) |
| `kioskAttempts` | initialised, never touched | Counts Chapter 4 kiosk denials, gates the exit |
| `getDialogueSpeaker` | TTS-internal only | Speaker label rendered on dialogue lines |
| `CHAPTER_ORDER` | tests only | "CHAPTER n OF 6" in the header |
| `badge_in` cinematic branch | branch exists, hotspot does not | Author the hotspot (see 3.1) |
| 9 voice clips | in manifest, never played | Mapped in `HOTSPOT_AUDIO` |
| 3 item icons | on disk | Inventory renders art, not a text list |
| `bg_desert_epilogue{,_ashes}` | on disk | Ending cards get their epilogue art |
| `bg_employee_intake` | on disk | Backs the new `badge_in` beat |
| `sprites/elias`, `sprites/robot_4a` | on disk | Character plate on relevant beats |

## Section 3: Per-chapter restructure

Every chapter becomes 2-5 waves of 1-3 simultaneous choices, escalating to a
decision. Per-chapter totals rise (35 → 44) while the maximum visible at once
falls to 3, per the Problem section. Existing dead-end flavour hotspots are
not deleted but promoted: each is given a state effect or a gating role, so
nothing on screen is inert.

Running total: 8 + 7 + 11 + 8 + 5 + 5 = 44.

### 3.1 Chapter 1 — Parking Lot (2 hotspots → 8, max 3 visible)

The chapter currently skips every beat `scene-flow.md` marks required. All are
authored now, with the existing two-way fork preserved as the climax.

- **Wave A:** `inspect_bottle`, `check_balance` ($286.40 refill vs $19.12
  balance), `listen_voicemail` (VO: `rgb_voice_lucia`, speaker LUCIA)
- **Wave B** (requires all of A): `inspect_drawing` — grants
  `item_lucia_drawing` + `item_calibration_notebook`
- **Wave C** (requires B): `speak_with_marisol` — optional, VO
  `rgb_voice_marisol_ch1`, **sets `noticedMarisolPressure`**
- **Wave D** (requires B): `reply_to_lucia` XOR `enter_now` — the existing
  fork, now a real choice rather than the chapter exit
- **Wave E** (requires D): `badge_in` — advances; bg `bg_employee_intake`

`noticedMarisolPressure` is currently set by **no hotspot in the game**, which
silently disables `release_marisol_from_request` in Chapter 3 and removes
Marisol's witness statement from the `canExpose` evidence math — meaning the
"Open Hand" ending is harder to reach than designed, for reasons invisible to
the player. Wave C repairs this.

Item grants move from the fork to the beats that earn them, so picking up the
bottle is what puts the bottle in the inventory.

**Cinematic correction:** `reply_to_lucia` → `C1-A`, `enter_now` → `C1-B`,
`badge_in` → `R1`. Currently the fork plays both its branch clip *and* `R1`,
and the `badge_in` branch is unreachable; this plays each clip exactly once at
its scripted moment.

### 3.2 Chapter 2 — Warehouse (6 → 7)

Already the best-staged chapter; it becomes the template rather than the
patient. One missing beat is added ahead of the existing chain:

- **Wave A:** `observe_4a` — the $4.8M arm, the $16.50/hr operator, the
  crushed box. The script's clearest statement of the game's thesis, currently
  absent.
- Waves B-D unchanged: `read_diagram` → `select_joint` → `apply_pressure` →
  `double_tap_honest` XOR `double_tap_falsify`.

### 3.3 Chapter 3 — Incident Review (11 at once → 11 in 4 waves)

- **Wave A:** `brace_for_impact` XOR `take_the_hit` (`excludesAllOf`)
- **Wave B** (requires pain set): `demand_footage`, `complete_swab`,
  `call_marisol`
- **Wave C:** `photograph_result` (requires `complete_swab`);
  `request_marisol_witness` XOR `release_marisol_from_request` (requires
  `call_marisol`); `keep_notebook` XOR `surrender_notebook`
- **Wave D:** `proceed_to_kiosk` — requires pain set **and**
  `minVisitedOf 2` of Wave B/C

### 3.4 Chapter 4 — Medi-Kiosk (8 → 8, gated)

- **Wave A:** `scan_bottle` alone. The kiosk states the situation before the
  player is asked to respond to it.
- **Wave B** (requires A): `view_paycheck`, `document_bag`, `call_hr`,
  `call_lucia`, `request_billing_agent` — each increments `kioskAttempts`
- **Wave C:** `follow_utility_map` XOR `give_up`, requiring
  `minVisitedOf 3` of Wave B

### 3.5 Chapter 5 — Server Room (4 → 5)

- **Wave A:** `read_terminal`
- **Wave B:** `attempt_delete` — "ADMIN LOCK. ACCESS DENIED." The script's
  emotional pivot ("they will not even let him take his own ghost back") is
  currently only a line inside another hotspot; it becomes its own beat.
- **Wave C:** `walk_away` / `expose_profile` / `sever_trunk`

### 3.6 Chapter 6 — Sector 4 (4 → 5, and the theme finally lands)

`scene-flow.md` specifies that calibration quality changes the rescue: "Strong
calibration gives generous timing and an audio cue. Weak calibration still
permits success but requires one additional recenter." Nothing implements this
— `calibrationQuality` and `trust4A` are written and never read, so Chapter
2's honesty currently has no consequence anywhere in the game.

Expressed as steps rather than timing, keeping the finale untimed:

- **Wave A:** `pull_alarm` → **Wave B:** `cross_to_rack`
- **Wave C:** `rescue_recenter` XOR `rescue_fumble`
  - `trust4A >= 2` (honest log in ch.2): `rescue_recenter` succeeds outright,
    with the `rgb_sfx_4a_servo` recognition cue.
  - `trust4A < 2`: `rescue_recenter` leaves 4A gripping short, and unlocks
    **Wave D** `rescue_recenter_again` to complete the lift.
  - `rescue_fumble` → `crushed` game over, unchanged.

Failure remains retryable and reachable regardless of calibration; weak
calibration costs an extra action, never the ending. This satisfies "resources
create pressure, not moral judgment."

## Section 4: Presentation and pacing

Addresses "too fast / unclear" directly.

1. **Chapter opening card** — on `transitionToChapter`, a brief card showing
   "CHAPTER n OF 6", the title, and the goal, dismissed by any input. Chapters
   currently slam-cut from a cinematic straight into a live hotspot grid.
2. **Speaker labels** — dialogue lines render `LUCIA:` / `HR:` / `KIOSK:` /
   `SYSTEM:` / `ELIAS:` via `getDialogueSpeaker`, styled distinctly for machine
   voices. Required by `game-design.md`; currently every voice is anonymous.
3. **Hint ladder** — `H` reveals hint 1, then 2, then 3 for the current
   chapter. Resets per chapter, respects `settings.hints`, never affects
   endings (per `scene-flow.md`).
4. **Richer recap** — the recap overlay lists consequential choices made so
   far (notebook kept/surrendered, log honest/falsified, Marisol's status)
   alongside the existing goal/pain/evidence, as `game-design.md` specifies.
5. **Inventory art** — item icons instead of a text list.
6. **Ending art** — the three ending cards use their epilogue backgrounds.
7. **Progress affordance** — "CHAPTER n OF 6" persists in the header.

## Section 5: Placeholders for missing assets

Three inventory items have no icon: `item_temp_badge`, `item_phone`,
`item_wire_cutters`. Rather than block on art, add generated placeholder
icons matching the existing item art's black/white/red treatment, recorded in
`ASSET_PROVENANCE.md` as placeholder-pending-final so they are trivially
greppable when real art arrives.

Any new beat without dedicated art reuses its chapter background; no beat is
authored that depends on art that does not exist.

## Testing

Existing suites (`content.test.js`, `state.test.js`, `save.test.js`,
`audio.test.js`) must stay green. New coverage:

- `excludesAllOf` hides a sibling once its counterpart is visited.
- `minVisitedOf` keeps chapter exits locked below the threshold and unlocks at
  it — specifically, `give_up` is unreachable from a fresh Chapter 4.
- Every chapter is completable: a path exists from first hotspot to `advances`.
- No hotspot is permanently unreachable (every `requiresAllOf` /
  `excludesAllOf` id resolves to a real hotspot in the same chapter).
- Every `applyChoice` id used in content is handled by `state.js`, and every
  flag read by a gate is set by at least one hotspot — the regression that let
  `noticedMarisolPressure` die.
- `trust4A >= 2` yields single-step rescue; `< 2` requires the extra recenter;
  both reach `ashes_survival`.
- Voice-over precedence: TTS does not fire for a hotspot with authored voice.

## Risks

- **Save compatibility.** Restructured chapters change hotspot ids, so an
  in-progress save's `visited` set may reference removed ids. `visited` is not
  persisted (it resets per chapter on load), and checkpoints are chapter-level,
  so existing saves resume at a chapter boundary safely. Verify explicitly.
- **Cinematic double-play.** The Chapter 1 trigger correction must be checked
  against `content.test.js`'s existing cinematic assertions.
- **Scope.** Six chapters plus seven presentation changes is large; implement
  chapter-by-chapter with the suite green between each.
