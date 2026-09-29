# Alternate Radio Voice Banks — Wave 2 Recording Script

Status: complete generated Wave 2 coverage; actor replacement pass remains optional
Banks: Soviet Sub-Commander (`4148`) and AURA (`4149`)  
Runtime owner: `src/data/voiceBanks.js`

## Purpose and scope

The first delivery contains six short calls per bank. It works as a combat
sampler, but it does not cover most of the generic suit, mission, bunker, and
Mothership notices heard during an expedition. Those uncovered notices use the
temporary generated voice/procedural vocalizer today. This sheet provides the
remaining recording script so either equipped radio bank can own the complete
generic comms layer.

This is **not** a recast of named characters. Briggs, Martha, Kaelen,
Okonkwo-Vass, the Queen, Nahl, Vey, Rhun, and other speaking NPCs keep their own
voices. Only anonymous tactical/system announcements are replaced by the
equipped cosmetic bank.

## Performance and delivery

Record every line clean and dry, with **two usable takes**. Leave radio static,
compression, down-sampling, chimes, glitches, and reverb for post-production.
Do not speak the cue ID or direction notes.

- Deliver mono WAV, 48 kHz / 24-bit preferred. Keep the untouched masters.
- Final game cuts will be mono 16 kHz and loudness-matched near `-16 LUFS`,
  true peak no higher than `-1.5 dBTP`.
- Leave roughly 100 ms clean room tone before and 180 ms after each take.
- Keep short calls short. Most combat lines should land below 1.5 seconds.
- Read acronyms naturally: `O2` is “oxygen”; `IFF` is “eye-eff-eff”.
- File convention: `<key>_take_01.wav` and `<key>_take_02.wav`.

### Soviet Sub-Commander direction

Weathered military commander over field radio: forceful, clipped, useful, and
human. The Russian accent may be present naturally, but do not parody it and do
not imitate a real person or an existing film/game character. Commands lead;
emotion stays restrained. No fake static in the performance.

### AURA direction

Calm feminine tactical intelligence: exact, intimate, and fast enough for
combat. Smooth authority rather than customer-service warmth. Danger makes her
more precise, not louder. Avoid singsong phrasing and exaggerated robot
staccato. Sub-harmonic chimes are added in post.

## A. Missing counterparts for the delivered combat set

These six semantic events currently exist for only one bank. Recording the
counterparts makes both cosmetics function consistently.

| Cue ID / output key suffix | Trigger | Soviet Sub-Commander | AURA |
|---|---|---|---|
| `shield_critical` | Shield crosses below 25% | **Shield failing. Take cover.** | Already delivered: **Shield critical.** |
| `low_health` | Health crosses below 25% | Already delivered: **Vitals critical.** | **Operator vitals critical.** |
| `target_down` | Boss is killed | **Heavy target destroyed.** | Already delivered: **Target down.** |
| `killstreak` | New rapid-kill tier | Already delivered: **Keep firing.** | **Combat efficiency rising.** |
| `overdrive_ready` | Dash overdrive becomes ready | **Overdrive charged. Move.** | Already delivered: **Overdrive ready.** |
| `breached` | Player breaks a wall | Already delivered: **Wall breached.** | **Structural breach confirmed.** |
| `sector_cleared` | Mission objective completes | **Sector secure. Return to ship.** | Already delivered: **Sector cleared.** |
| `victory` | Successful extraction | Already delivered: **Extraction secured.** | **Extraction confirmed. Mission complete.** |

Output examples:

- `voice_commander_shield_critical_take_01.wav`
- `voice_aura_low_health_take_02.wav`

### 2026-09-15 generated Wave 2 pass

Every missing line in this sheet now has two distinct Eleven v3 takes in
`public/audio/generated/`. Commander uses the Adam premade voice with clipped,
restrained Russian-accent direction; AURA uses the Sarah premade voice with
calm, precise tactical-intelligence direction. Source MP3 masters are retained
under the ignored `art/source/audio/vo/elevenlabs-wave2/` directory. Game cuts
are mono 16 kHz PCM, filtered by bank, compressed, and loudness-normalized.

The original delivered actor takes remain authoritative where the table says
"Already delivered." Generated Wave 2 files provide full recording coverage;
runtime event wiring can be enabled cue-by-cue as each trigger is validated.

## B. Deployment, weapon, and movement calls

| Cue ID | Trigger | Soviet Sub-Commander script | AURA script |
|---|---|---|---|
| `comms_online` | Gameplay begins with this bank equipped | **Command channel open. Stay sharp.** | **AURA online. Tactical link established.** |
| `mission_active` | Mission objective is assigned | **Orders received. Move out.** | **Mission parameters acquired.** |
| `ammo_empty` | Trigger pulled on an empty weapon | **Weapon empty. Find ammunition.** | **Ammunition depleted.** |
| `reload_complete` | Magazine refill finishes | **Weapon ready.** | **Reload complete.** |
| `radar_ready` | Radar cooldown finishes | **Scanner ready. Use it.** | **Radar scan available.** |
| `radar_contact` | Scan reveals a high-value contact | **Contact marked. Advance.** | **Priority contact identified.** |
| `turret_ready` | Engineer turret becomes buildable | **Turret package ready.** | **Sentry deployment available.** |
| `turret_deployed` | Player deploys a turret | **Gun is live. Hold the line.** | **Sentry online. Firing solution active.** |

## C. Vitals and environmental hazards

| Cue ID | Trigger | Soviet Sub-Commander script | AURA script |
|---|---|---|---|
| `oxygen_low` | Oxygen crosses below 35% | **Oxygen low. Return to pressure.** | **Oxygen reserve low. Seek life support.** |
| `oxygen_critical` | Oxygen crosses below 15% | **You are suffocating. Move now.** | **Critical oxygen loss. Respiration failing.** |
| `oxygen_restored` | Player re-enters a safe oxygen field | **Air restored. Keep moving.** | **Oxygen supply stabilized.** |
| `freeze_warning` | Cold exposure begins damaging player | **Cold is killing you. Find heat.** | **Lethal thermal exposure detected.** |
| `toxin_warning` | Toxin/infection exposure begins | **Contamination. Clear the zone.** | **Bio-toxin exposure detected.** |
| `hull_damaged` | Ship hull crosses below 55% | **The ship is taking damage. Defend it.** | **Ship integrity compromised.** |
| `hull_critical` | Ship hull crosses below 25% | **Hull critical. Get back to the ship.** | **Critical hull failure imminent.** |
| `cover_degrading` | Humanity/cover reaches warning threshold | **They are watching you. Control yourself.** | **Behavioral cover degradation detected.** |

## D. Objective and discovery calls

| Cue ID | Trigger | Soviet Sub-Commander script | AURA script |
|---|---|---|---|
| `first_kill` | First ordinary kill of the run | **First contact down. Continue.** | **First threat neutralized.** |
| `crawler_detected` | First crawler encounter | **Fast contact. Keep your distance.** | **Rapid bio-entity detected.** |
| `sentinel_detected` | First sentinel encounter | **Automated gun ahead. Find cover.** | **Hostile defense system active.** |
| `objective_found` | Primary mission target is revealed | **Objective located. Marking route.** | **Primary objective confirmed.** |
| `black_box_found` | Black box is revealed | **Black box located. Recover it.** | **Operator black box signal acquired.** |
| `foundry_found` | Foundry is revealed | **Foundry located. Put it to work.** | **Fabrication facility identified.** |
| `armory_found` | Armory cache is revealed | **Weapons cache located. Expect resistance.** | **High-value armory cache detected.** |
| `camp_found` | A survivor camp is revealed | **Human position ahead. Hold your fire.** | **Survivor enclave located.** |
| `hive_found` | A hive/nest is revealed | **Hive ahead. Weapons free.** | **Dense biological structure detected.** |
| `data_recovered` | Lore or archive fragment collected | **Data secured. Archive it later.** | **Bunker record recovered.** |
| `salvage_banked` | First successful ship deposit | **Salvage secure. Get back out there.** | **Salvage transfer confirmed.** |

## E. Construction, terminal, and facility calls

| Cue ID | Trigger | Soviet Sub-Commander script | AURA script |
|---|---|---|---|
| `build_started` | Base-module construction begins | **Construction started. Cover the site.** | **Construction sequence initiated.** |
| `build_complete` | Module finishes rising/activating | **System built and operational.** | **Module deployment complete.** |
| `upgrade_installed` | Weapon or base upgrade applies | **Upgrade fitted. Test it in combat.** | **Upgrade installed and calibrated.** |
| `terminal_accepted` | Terminal choice succeeds | **Override accepted. Watch for consequences.** | **Terminal transaction confirmed.** |
| `terminal_denied` | Terminal action is unavailable | **Access denied. Find another way.** | **Terminal request denied.** |
| `lights_failed` | Director disables local lighting | **Lights out. Switch to tactical lamp.** | **Local illumination offline.** |
| `navigation_corrupt` | Compass/map interference begins | **Navigation is compromised. Trust your eyes.** | **Navigation telemetry corrupted.** |
| `uplink_lost` | Mothership link is severed | **Uplink lost. You are on your own.** | **Mothership telemetry disconnected.** |
| `uplink_restored` | Mothership link returns | **Command link restored. Report in.** | **Orbital uplink re-established.** |

## F. Extraction and failure calls

| Cue ID | Trigger | Soviet Sub-Commander script | AURA script |
|---|---|---|---|
| `return_to_ship` | Objective complete; extraction not yet active | **Objective complete. Return to the ship.** | **Objective complete. Return route marked.** |
| `extraction_ready` | Extraction becomes available | **Extraction window open. Move.** | **Extraction authorization received.** |
| `elevator_inbound` | Elevator defense countdown starts | **Elevator inbound. Defend the wreck.** | **Elevator inbound. Defensive interval active.** |
| `launch_blocked` | Player attempts launch with unmet conditions | **Launch blocked. Finish the mission.** | **Launch authorization denied.** |
| `operator_down` | Player reaches death/downed state | **Operator down. Signal lost.** | **Operator signal terminated.** |
| `black_box_recovered` | Prior-run black box is collected | **Previous salvage recovered.** | **Black box recovery complete.** |

## Runtime mapping contract

Each semantic cue gets one key per bank and two numbered takes:

```text
voice_commander_<cue>.wav
voice_commander_<cue>2.wav
voice_aura_<cue>.wav
voice_aura_<cue>2.wav
```

The ingest step removes `_take_01` / `_take_02` from artist filenames when it
installs the game-ready assets. Runtime selection must:

1. resolve by semantic event, never by matching arbitrary subtitle text;
2. choose only decoded files from the equipped bank;
3. avoid the immediately previous take;
4. apply a per-cue cooldown so common warnings do not spam;
5. never interrupt priority-one named-character dialogue;
6. show the exact short subtitle when the selected take begins;
7. remain silent when a cue has no correctly matching recording.

Recommended cooldowns are 45 seconds for reload/radar/combat utility, 60
seconds for repeated hazards, once per encounter for bosses, and once per
expedition for discoveries, milestones, extraction, and failure.

## Recording checklist

- [x] 42 new paired cues generated for Commander and AURA.
- [x] Eight missing counterparts have two generated takes wired for rotation.
- [x] Two clean generated takes for every missing line.
- [x] Cue IDs and take numbers present in filenames.
- [x] [MIGRATED] No spoken slates inside delivery files. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] No baked music, reverb, radio static, or game sound effects. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] Pronunciation and subtitle wording match this sheet exactly. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] Source masters archived before the comms processing pass.
- [x] Processed assets loudness-matched by the generation pipeline.
- [x] [MIGRATED] Processed assets auditioned under combat mix. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
- [x] [MIGRATED] Armory preview and a ten-minute expedition checked for each bank. <!-- Migrated to master backlog: docs/planning/todo-audit-backlog-and-conflicts-2026-09-24.md#true-todos -->
