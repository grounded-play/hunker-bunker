# Alt-Radio Voice Banks — take segmentation, labelling and wiring

2026-09-13. Covers the VO delivery (3 session WAVs), how the takes were cut up,
how to label them, and the game-side options added for the two banks.

## 1. What was delivered

Three raw session files, scp'd into `public/`:

| file | duration | rate |
|---|---|---|
| `voice aura V take 1.wav` | 140.21s | 44100 / 2ch |
| `voice commander V take 1.wav` | 127.39s | 44100 / 2ch |
| `voice commander V take 2.wav` | 142.69s | 44100 / 2ch |

These are **raw session takes, not individual cues** — 6 lines per bank, roughly
6 freestyle takes of each, recorded continuously.

They also put `public/` 72MB over the Steam payload budget (2,908,655,801 vs
2,836,398,080), so they were moved out of the shipping tree into the gitignored
source tree (`.gitignore:67 art/source/`):

```
art/source/audio/vo/raw/voice_aura_V_take_1.wav
art/source/audio/vo/raw/voice_commander_V_take_1.wav
art/source/audio/vo/raw/voice_commander_V_take_2.wav
```

After installing two compressed takes per production cue, `public/` is
2,835,757,511 bytes — **640,569 bytes under budget**. That is
tight: do not add uncompressed audio to `public/` without re-checking.

## 2. Segmentation — `scripts/segment-vo-takes.mjs`

```
node scripts/segment-vo-takes.mjs            # all banks
node scripts/segment-vo-takes.mjs --bank aura
```

Splits each session file on silence (`-42dB`, `0.7s`), then groups the takes
into lines. Output: `art/source/audio/vo/segments/<stem>/…` plus a manifest at
`art/source/audio/vo/segments/vo-takes.json`. 113 clips currently.

Two things worth knowing, both learned the hard way:

- **Grouping is by the longest pauses, in recording order** — not by duration
  similarity. The artist records all takes of one line back to back then pauses
  longer before the next line, so the pause is the signal. Duration clustering
  was tried first and fails outright: the callouts are all short and similar,
  so "Reloading" and "Shield low" are indistinguishable by length, and picking
  the largest duration gaps just peels outliers off as singleton "lines".
- **Spans over 4s are classified as `chatter`, not takes.** Both commander
  sessions open with a 21s / 27.6s block of slating before the first real pause.
  Chatter is still exported (nothing from the session is lost) but is kept out
  of the line grouping.

Current split — `commander_V_take_1` lands 6/6/15/1/6/5, four of six lines
exactly on the expected 6 takes:

| source | takes | chatter | lines |
|---|---|---|---|
| `voice_aura_V_take_1` | 32 | 1 | 14/5/4/4/4/1 |
| `voice_commander_V_take_1` | 39 | 4 | 6/6/15/1/6/5 |
| `voice_commander_V_take_2` | 29 | 8 | 8/3/6/5/4/3 |

## 3. What the lines are

**This did not need guessing.** `src/audio.js`'s `playVoiceCallout` cueMap
already pins exactly which cues each bank must fill, and all 12 slots already
exist as placeholder audio in `public/audio/generated/`. 6 aura + 6 commander —
matching the artist's "6 lines each" exactly.

That list is now a single source of truth in **`src/data/voiceBanks.js`**, read
by both the game and the tooling, with a test asserting every slot key is
reachable from `audio.js` and backed by a real file.

**4148 — Soviet Sub-Commander Radio** (heavy static, Russian-accented jargon):

| slot key | when it fires |
|---|---|
| `voice_commander_reloading` | Weapon reload — replaces "Reloading" |
| `voice_commander_low_health` | Player near death — replaces "Shield low" |
| `voice_commander_boss_spotted` | Boss enters the field — replaces "Heavy incoming" |
| `voice_commander_killstreak` | Kill streak / overdrive ready |
| `voice_commander_breached` | A wall is breached |
| `voice_commander_victory` | Extraction / run won |

**4149 — Synthesized AI Unit 'AURA'** (smooth synth female, sub-harmonic chimes):

| slot key | when it fires |
|---|---|
| `voice_aura_reloading` | Weapon reload — replaces "Reloading" |
| `voice_aura_shield_critical` | Player near death — replaces "Shield low" |
| `voice_aura_threat_high` | Boss enters the field — replaces "Heavy incoming" |
| `voice_aura_target_down` | Target eliminated |
| `voice_aura_overdrive_ready` | Dash overdrive charged |
| `voice_aura_sector_cleared` | Objective complete / sector cleared |

The two event aliases without dedicated recordings no longer resolve to silent
files: Commander `target_down` reuses its kill-streak acknowledgement, and AURA
`breached` reuses its sector-cleared acknowledgement.

## 4. Reviewed selections

The reviewed choices live in `scripts/audio/vo-take-selections.json`, separate
from the generated and gitignored segmentation manifest. A local Whisper pass
identified the phrases and timestamps. For Commander, take 2 explicitly marks
the sequence beginning at 108.76s as "one actual real one"; that complete final
sequence is the primary take, with its earlier regular sequence as the alternate.
AURA selections use two clean, full-length takes from each spoken phrase group.
Runtime selection avoids immediately repeating the same take. Regenerating the
segments therefore cannot erase the choices.

## 5. Installing — `scripts/install-vo-takes.mjs`

```
node scripts/install-vo-takes.mjs --dry-run   # show the plan
node scripts/install-vo-takes.mjs             # faithful copy
node scripts/install-vo-takes.mjs --comms      # apply the radio treatment
```

Overlays the tracked selections on the generated manifest, then copies them to
`public/audio/generated/<slot>.wav` — the exact filenames the cueMap looks up.
It reports missing slots and quarantines labels that are not real slot keys
rather than installing them.

`--comms` (mono / 16 kHz / 300–3400 Hz band / light compression) is **off by
default**, since the artist said they would engineer the downsample and comms
FX themselves. It is there for a quick in-engine preview only.

## 6. Game-side options added

- **New Armory slot: ALT RADIO VOICE BANK** (`src/armoryUi.js`), under the
  Tactical HUD Theme field, offering both banks via `ITEM_TYPE.AUDIO` and
  equipping through the existing `loadoutManager.equipVoicePack`. Picking a
  bank plays its reload callout immediately — it is the one cosmetic slot where
  the turntable preview tells you nothing.
- i18n key `ui.armory.f_voicebank` added across all 7 locales.

## 7. Debug unlock — what was actually broken

The debug toggle sets `ownership.setUnlockAll`, and `canEquip` already honoured
it for every item type. The failure was downstream, in
`LoadoutManager.reconcileOwnership`, which is called on every inventory refresh
and on sign-out (`steamVaultUi.js:463` passes an empty inventory). Three bugs,
all fixed with tests:

1. **It ignored the unlock-all override entirely.** You could equip a locked
   chassis under debug and have the next refresh silently strip it back off.
   This is what "debug doesn't unlock everything" looked like from the outside.
2. **It only checked the raw Steam inventory array.** Items that ship unlocked —
   earned rig modules (4160–4167) and the 30 community chassis skins — appear in
   no Steam inventory response, so they were stripped too. It now prefers
   `window.itemOwnership.isOwned`, which knows about default, achievement and
   dev-granted ownership, falling back to the array.
3. **Community skin ids are strings** (`comm_scout_abg`), and the check did
   `Number(id)` → `NaN`, so they could never match and were stripped
   unconditionally.

It also never reconciled `hudThemeId`, `tracerFxId` or `voicePackId` at all —
the mirror-image bug, where an unowned UI overlay stayed equipped forever.
Those three are now covered by the same rule.

The toggle is relabelled **UNLOCK ALL COSMETICS** (was "UNLOCK ALL SKINS"),
which is what it has always done and now reliably does: weapon and chassis
skins, charms, decals, rig modules, tracers, HUD themes and voice banks.

## 8. Tests

`scripts/segment-vo-takes.test.mjs` (11), `scripts/install-vo-takes.test.mjs`
(6), `src/data/voiceBanks.test.js` (10), plus 6 new `reconcileOwnership` cases
in `src/loadout.test.js`. Full suite green: 370 files / 3384 tests.

## 9. Next

- [x] Label and install the twelve delivered cue slots (§4).
- [x] Remap the two runtime aliases that lack dedicated recordings (§3).
- [ ] Replace the temporary `--comms` treatment if the artist delivers a final
  engineered pass.
