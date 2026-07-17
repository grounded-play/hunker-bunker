# The Player Teardown: What Gamers Will Rip Apart, and the Next-Level Plan

Whole-game review, 2026-07-11. Method: fresh-eyes screenshot tour of the
current build (menu → first minute → camp → terminal), plus feel-math read
from source (TTK, movement, O2 leash, feedback systems). This is the
Steam-review simulator: not what's wrong with the code — what a paying
player will say in their first, second, and tenth hour.

Companion docs: [lore-coherence-and-secret-sauce-review.md](lore-coherence-and-secret-sauce-review.md)
(narrative; being implemented now by waves 3), [game-wide-review-and-solution-plan.md](game-wide-review-and-solution-plan.md)
(systems northstar). This doc feeds the **wave-4 queue** — it does not
reassign anything the running wave-3 briefs
([gemini](sprint-19-wave3-gemini.md), [codex](sprint-19-wave3-codex.md)) own.

---

## Part 1 — The teardown (in the order players will hit it)

### 1. The front door is a black screen *(first 10 seconds)*

The title screen is a dark panel, an orange bar, and "CLICK ANYWHERE TO
INITIALIZE." No key art, no title treatment, no motion, no mood. Players
judge art direction before the first click, and this screen says
"template." Screenshot evidence: `tour_01_menu.png`. The game HAS an
identity (amber-on-black industrial, the queen, the ice) — the menu shows
none of it.

### 2. The gauntlet before gameplay *(first 3 minutes)*

Click → fullscreen prompt → class select → INITIALIZE → class intro video
→ mothership dialogue typing seven lines → tutorial choice → drop.
There is **no "skip everything" path** — only per-beat skips a new player
won't know. Estimated time-to-first-input for a first-timer: 90–150
seconds. Speedrunners of the refund button will not wait. And on arrival,
**three stacked right-edge prompts fire in the first minute** (radio card
+ PRESS E + RETRIEVE mission, `tour_04_first_minute.png`) while the
compass is already glowing alarm-red.

### 3. Full-screen modal takeovers for minor events *(the whole game)*

Hard evidence: this review's own screenshot tour teleported to a camp and
opened the skill tree — **both frames were eaten by the discovery radio
modal**, which owns the entire screen and types at reading-pace through
four cards (`tour_06`, `tour_07`). Discovering a camp — a happy 2-second
beat — takes a ~15-second screen lock. Players will spam-click, miss the
content Gemini's wave 3 is lovingly writing, and clip it for the review.
**Rule to adopt: modals are for choices; everything else is a toast.**

### 4. Combat is one verb against sponges *(hours 1–10)*

The math from source: fodder dies in 1–2 hits (fine), but bosses are
20–75 HP against 1–2 damage shots with **one movement pattern (walk at
you) and one boss attack (spread shot)** — that's 20–40 seconds of
walking backward while left-clicking. There is no hitstop, no damage
feedback beyond a tint, no dodge for two of three classes, no reload
drama, no enemy that flanks, feints, or forces a position change (the
new proto "spitter" is melee — the name writes a check the AI doesn't
cash). Camera shake exists and is the only juice verb. Combat is the
minute-to-minute activity, and it is the least-designed system in the
game. This is the #1 "mixed reviews" driver.

### 5. The leash and the walk *(hours 1–5)*

O2 drains full-to-empty in ~5 minutes base (×1.25 Scout, ×biome, ×1.5
in danger). Camps sit 70–120 units out; a Tank walks 2.6 u/s through
maze pathing — a far camp is a one-way third of your air. That's the
intended pressure, but with no mid-route decisions the *feel* is
"errand under a timer." Landforms and pressure cards help; death still
means a full walk-back with no stakes framing. Players will write:
"the oxygen bar is the real boss."

### 6. Two art games in one frame *(screenshots, store page)*

Hand-modeled dark-industrial 3D blocks + AI-generated sprites at visibly
different pixel densities (painterly leaders at one scale, pixel-art
protos at another, photographic portrait in the radio modal). Near the
ship it coheres (`tour_04` genuinely looks good); in mixed scenes it
reads as asset-pack seams. One re-generation pass with a locked pixel
grid + palette is cheaper than the reputation cost of "AI slop" accusations
— which WILL be the top axe in 2026 reviews if densities stay mixed.

### 7. No pause, no options surface, no difficulty choice

ESC doesn't pause (modals soft-pause vitals, but there's no pause menu).
Settings are scattered (audio mixer exists, remapping exists) with no
text-speed, shake toggle, or colorblind option. Hardened mode unlocks
silently after five deaths — difficulty as a secret instead of a choice.
These are 2026 table-stakes; their absence is an automatic "early access
jank" tag.

### 8. The name hazard

"PregAlien" as player-facing vocabulary will be memed, misread, and
screenshotted out of context. The fiction already has better words: the
Brood, the Queen, the Mother Below. Keep PregAlien as internal code;
audit player-visible strings once. (Flagging, not deciding — this is a
taste call for the owner.)

### 9. Death teaches nothing yet

Wave 2's run summary explains the ending; death mid-run still just
resets. What persists (bank? loadout? act2? suspicion?) is learned by
trial. One death screen line — "BANKED SALVAGE SAFE · SUIT LOADOUT LOST ·
THE WORLD REMEMBERS" — converts confusion into doctrine.

## Part 2 — What already survives contact with reviewers (protect)

- The near-ship composition (`tour_04`) — HUD frame, lighting, prop
  density genuinely look like a real game.
- The consequence engine + 10 endings, the reveal, camps/hives — depth
  no one will accuse of being shallow.
- Run variety machinery (landforms, pressure cards, seeds on HUD).
- The writing (see the lore review — protect the log arc and leader
  voices; wave 3 is amplifying them correctly).
- 270+ tests and headless probes — velocity insurance nothing visible
  to players, everything visible to us.

---

## Part 3 — The next-level plan (wave 4 queue)

Wave 3 (running) owns narrative content + lore systems. Wave 4 is **FEEL
and FIRST IMPRESSION**. Lanes below are scoped to not touch wave-3-owned
files until those lanes land; merge order: wave 3 → wave 4.

### Gemini — Wave 4: "The First Five Minutes & The Juice" (presentation)

1. **Title screen that sells the game**: key art (nano-banana hero image —
   exosuit silhouette against the amber cave mouth), animated title
   treatment, settings/achievements/continue laid out. One screen, half
   the first impression.
2. **Intro gauntlet compression**: press-any-key start, a persistent
   SKIP ALL during intro flow, click-to-complete typing everywhere, and a
   global text-speed setting. Target: **time-to-first-input < 30s** on a
   second run, < 75s on the first.
3. **Modal → toast conversion**: discovery/milestone events become
   notification-deck cards (the deck already exists); full-screen radio
   modal reserved for choices and act transitions only. Budget: **max 2
   concurrent HUD cards**, everything else queues.
4. **Combat juice visual kit**: 50–70ms hitstop flash on enemy hit, impact
   frames (scale pop), damage pips, kill-confirm pulse, low-ammo tint on
   the sidearm panel, boss hit-direction flashes. Pure presentation —
   reads from existing damage events; pairs with Codex's feel-math lane.
5. **Darkness floor + suit lamp**: minimum ambient far from the ship and
   a soft player lamp radius so deep-map screenshots (`landform_canyon`)
   stop reading as void. Night should be dark, not blank.
6. **Pause & settings surface (ESC)**: pause menu wrapping the existing
   mixer + remapping, adding text speed, shake toggle, colorblind assist,
   and difficulty display. One modal, table stakes cleared.
7. **Sprite-density unification pass**: pick the pixel grid (recommend the
   walk-sheet density), re-generate the outliers (radio portraits and any
   painterly-scale props) to match, and lock the rule into the asset
   contract in [sprint-19-wave2-gemini.md](sprint-19-wave2-gemini.md).

### Codex — Wave 4: "Feel Math & Fight Design" (systems)

1. **Universal mobility verb, class-flavored**: Scout keeps sprint-burst;
   Tank gets a shoulder-slam (short lunge, knockback, 1-shock armor —
   merges with its wave-3 zap perk); Engineer gets an overclock slide.
   Shared cooldown discipline; no stamina bar (O2 is already the meter).
2. **Boss phase framework**: data-driven phases in the boss update
   (thresholds → pattern swaps, add waves, weakpoint windows where damage
   triples). Convert the three biome bosses from HP walls into 60–90s
   fights with two decisions each. This is the single biggest review-score
   lever in the plan.
3. **Ranged proto AI**: make the spitter actually spit (projectile,
   preferred range band, reposition when closed on) — the flanker/ranged
   pressure that breaks the walk-backward-and-shoot dominant strategy.
4. **Difficulty selects at class select**: Story / Standard / Hardened
   (surface the hidden unlock), tuning multipliers routed through the
   existing run-modifier effects plumbing.
5. **Death loop economics**: instant-retry path (< 5s from death to
   control), the persistence-doctrine death line, and black-box stakes
   messaging on the death screen.
6. **O2 grace + travel QoL**: one 5s emergency-reserve pulse per run at
   0% O2 (with klaxon), and a camp-level-2 unlock: BEACON RECALL — one-way
   return-to-ship signal per visit (roguelite-safe fast travel that makes
   camp investment pay in time, the currency players actually feel).
7. **Performance hardening**: keyed-texture cache by path (per-sprite
   1024² canvases are multiplying), shadow-caster audit, and a frame
   budget probe in `scratch/`.

### Claude — Wave 4 (reserved, on return)

The two structural promises stay mine: **the queen fight** (staged in
Sector Zero on the boss-phase framework Codex builds — sequencing note:
framework first) and **the boarding vessel object**. Plus playtest
telemetry hooks (time-to-first-input, deaths by cause, run length) so
wave 5 argues from data instead of taste.

## Part 4 — Measurable targets (so "better" is checkable)

| Metric | Today (est.) | Target |
| --- | --- | --- |
| Time to first input (2nd run) | 90–150s | < 30s |
| Full-screen modals per hour outside choices | ~8–12 | 0 |
| Concurrent HUD cards | 3+ | ≤ 2 |
| Boss fight shape | HP wall, 1 pattern | 2 phases, 2 decisions |
| Classes with a mobility verb | 1 of 3 | 3 of 3 |
| Death → retry | full flow | < 5s |
| Settings: pause/text-speed/shake/colorblind | 0 of 4 | 4 of 4 |

The one-sentence version: **wave 3 is making the game mean something;
wave 4 must make it feel like something — starting with the first five
minutes, the modal budget, and the fight design.**
