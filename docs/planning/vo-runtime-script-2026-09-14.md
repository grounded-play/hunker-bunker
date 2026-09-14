# Runtime VO script and trigger contract — 2026-09-14

This is the runtime source of truth for the two alternate-radio banks. Each
semantic line has two installed takes (`key.wav`, `key2.wav`). Gameplay chooses
one available take, avoids the immediately previous take during Armory audition,
and speaks the semantic line at most once per expedition. A new expedition
clears that history. Unsupported situations remain silent instead of borrowing
a recording whose meaning is wrong.

| Bank | Cue / exact subtitle | Trigger | Never trigger for | Priority | Installed takes |
|---|---|---|---|---:|---|
| Commander 4148 | Reload / `RELOADING.` | Non-full weapon begins reload | Menu, full magazine | 4 | `voice_commander_reloading{,2}` |
| Commander 4148 | Low health / `VITALS CRITICAL.` | HP crosses downward through 25% | Shield loss, max-HP change, healing | 3 | `voice_commander_low_health{,2}` |
| Commander 4148 | Boss spotted / `HEAVY INCOMING.` | First boss-entry callout of expedition | Ordinary enemy, duplicate event alias | 3 | `voice_commander_boss_spotted{,2}` |
| Commander 4148 | Kill streak / `KEEP FIRING.` | New kill-streak tier | Target death, overdrive ready | 4 | `voice_commander_killstreak{,2}` |
| Commander 4148 | Breach / `WALL BREACHED.` | First wall breach | Door open | 4 | `voice_commander_breached{,2}` |
| Commander 4148 | Victory / `EXTRACTION SECURED.` | Successful extraction | Ordinary objective completion | 2 | `voice_commander_victory{,2}` |
| AURA 4149 | Reload / `RELOADING.` | Non-full weapon begins reload | Menu, full magazine | 4 | `voice_aura_reloading{,2}` |
| AURA 4149 | Shield critical / `SHIELD CRITICAL.` | Shield crosses downward through 25% | HP loss, no shield equipped | 3 | `voice_aura_shield_critical{,2}` |
| AURA 4149 | Threat high / `THREAT LEVEL HIGH.` | First boss-entry callout of expedition | Ordinary enemy, duplicate event alias | 3 | `voice_aura_threat_high{,2}` |
| AURA 4149 | Target down / `TARGET DOWN.` | First boss death of expedition | Ordinary enemy, kill streak | 4 | `voice_aura_target_down{,2}` |
| AURA 4149 | Overdrive / `OVERDRIVE READY.` | Overdrive first becomes ready | Kill streak | 4 | `voice_aura_overdrive_ready{,2}` |
| AURA 4149 | Sector clear / `SECTOR CLEARED.` | First objective completion | Extraction victory | 3 | `voice_aura_sector_cleared{,2}` |

Runtime details live in `src/data/voiceBanks.js`; tests require two real files,
complete subtitle/trigger/exclusion metadata, and strict (non-borrowing) cue
routing. Authored story clips use their audio key as the semantic identity and
are likewise limited to one playback per expedition. An authored voice owns the
speech channel until it ends; only a strictly higher-priority line may
preempt it. The Armory passes `audition: true`, so switching a radio bank always
samples its appropriate preview without consuming gameplay history.

The raw artist sessions were freestyle recordings and are preserved outside the
shipping payload. These installed cuts still require a human listening/sign-off
pass against the exact subtitle wording before release localization is locked;
the code deliberately does not claim speech-to-text validation.
