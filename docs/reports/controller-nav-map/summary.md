# Controller navigation map — generated summary

Captured 2026-10-14T20:53:25.004Z at 1280×800 by `tests/e2e/probes/controller-nav-map.spec.js`.
Reading guide and per-screen findings: `docs/design/controller-navigation-map.md`.

Move columns count D-pad presses (4 per focusable control):
- **Backwards**: focus went the opposite way. **Off-axis**: 45–110° away from the pressed direction
  (e.g. ▶ stepping down a list). **Wrap**: jumped to the far edge. **Jump**: more than half the stage.
- **Dead**: the press did nothing. **Non-recip**: the opposite press does not come back.
- **Escapes**: focus left the surface or was lost.
- **Weak focus**: controls where less than 4% of the box visibly changes on focus.
- **Unreach**: controls the entry target cannot reach by D-pad at all.

| Surface | Entry focus | Ctrl | Back | Off-axis | Wrap | Jump | Dead | Non-recip | Escapes | Weak focus | Unreach | Max presses | Locked |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| settings--commentary-list | #close-commentary-list "Close developer comm | 45 | 44 | 88 | 4 | 2 | 0 | 0 | 0 | 1/15 | 0 | 22 | 0 |
| settings--controls | #close-controls "×" | 25 | 22 | 48 | 4 | 2 | 0 | 0 | 0 | 4/25 | 0 | 12 | 0 |
| archive--tab-ACHIEVEMENTS | #archive-tab-achievements "ACHIEVEMENTS" | 30 | 0 | 44 | 4 | 1 | 1 | 54 | 3 | 0/24 | 0 | 11 | 0 |
| ship-terminal--tab-◇ CLASS SKILLS SKL 0 | #terminal-tab-skills "◇ CLASS SKILLS SKL 0/6 | 24 | 1 | 39 | 9 | 2 | 0 | 53 | 0 | 2/13 | 0 | 5 | 0 |
| armory | #armory-btn-embark "CONTINUE TO DEPLOYMENT > | 20 | 0 | 45 | 4 | 2 | 1 | 31 | 0 | 0/20 | 1 | 4 | 0 |
| operator-menu | div.char-card.selected "BULWARK FRAME BREACH | 20 | 1 | 30 | 1 | 9 | 9 | 38 | 0 | 0/20 | 1 | 9 | 0 |
| settings--tab-ACCESSIBILITY | #settings-tab-accessibility "ACCESSIBILITY" | 20 | 2 | 34 | 14 | 2 | 0 | 8 | 6 | 0/17 | 0 | 8 | 0 |
| settings--tab-CONTROLS | #settings-tab-controls "CONTROLS" | 17 | 2 | 27 | 8 | 3 | 0 | 8 | 6 | 0/16 | 0 | 6 | 0 |
| dossier | button.season-pass-claim-btn "Track" | 13 | 1 | 20 | 3 | 0 | 2 | 25 | 6 | 0/7 | 0 | 5 | 0 |
| settings--tab-GRAPHICS | #settings-tab-graphics "GRAPHICS" | 16 | 2 | 26 | 10 | 2 | 0 | 8 | 6 | 0/15 | 0 | 6 | 1 |
| foundry-hub-from-vault | button.foundry-hub__tab.is-active "STASH" | 10 | 4 | 18 | 1 | 5 | 0 | 20 | 1 | 0/10 | 2 | 4 | 0 |
| settings--tab-CAMERA & HUD | #settings-tab-camera "CAMERA & HUD" | 12 | 2 | 18 | 6 | 7 | 0 | 8 | 6 | 0/12 | 0 | 4 | 0 |
| foundry-hub-from-vault--tab-LOADOUT | button.foundry-hub__tab.is-active "LOADOUT" | 10 | 4 | 15 | 1 | 6 | 0 | 18 | 1 | 0/9 | 1 | 5 | 0 |
| settings--tab-AUDIO | #settings-tab-audio "AUDIO" | 11 | 2 | 14 | 6 | 6 | 0 | 8 | 6 | 0/10 | 0 | 3 | 0 |
| settings | #main-nightvision-toggle | 12 | 0 | 16 | 9 | 5 | 0 | 9 | 6 | 0/10 | 0 | 5 | 0 |
| settings--tab-PROFILE & SAVES | #settings-tab-profile "PROFILE & SAVES" | 11 | 0 | 14 | 8 | 4 | 0 | 6 | 6 | 0/11 | 0 | 3 | 0 |
| tactical-net | button.calibrate-btn "CHAT" | 10 | 0 | 20 | 5 | 2 | 0 | 13 | 0 | 0/10 | 0 | 3 | 0 |
| settings--language-select | button.language-choice-btn "English" | 9 | 6 | 16 | 4 | 4 | 0 | 0 | 0 | 0/9 | 0 | 4 | 0 |
| settings--crosshair-color | button.crosshair-color-swatch "Orange crossh | 10 | 6 | 16 | 2 | 2 | 0 | 0 | 0 | 0/10 | 0 | 5 | 0 |
| archive--tab-RECORDS | #archive-tab-records "RECORDS" | 8 | 2 | 9 | 3 | 2 | 1 | 13 | 3 | 0/8 | 1 | 2 | 0 |
| dossier--tab-Directives | button.season-pass-tab-btn.active "Directive | 4 | 1 | 2 | 1 | 1 | 4 | 4 | 7 | 0/4 | 3 | 0 | 0 |
| dossier--tab-Fragment Workshop | button.season-pass-tab-btn.active "Fragment  | 4 | 2 | 4 | 1 | 1 | 1 | 3 | 7 | 0/1 | 1 | 2 | 2 |
| archive | #archive-tab-lore "LORE LOGS" | 7 | 2 | 7 | 3 | 2 | 1 | 9 | 3 | 0/7 | 0 | 2 | 0 |
| foundry-hub-from-vault--tab-🔒 FABRICATE | button.foundry-hub__tab.is-locked "🔒 FABRIC | 5 | 2 | 8 | 1 | 5 | 0 | 5 | 2 | 0/5 | 0 | 2 | 2 |
| foundry-hub-from-fab | button.foundry-hub__tab.is-locked "🔒 FABRIC | 5 | 2 | 8 | 1 | 5 | 0 | 5 | 2 | 0/5 | 0 | 2 | 2 |
| settings--mature-audit-btn | #close-mature-audit-modal "Close audit suite | 11 | 0 | 12 | 10 | 1 | 0 | 10 | 0 | 1/6 | 0 | 3 | 0 |
| settings--audio-mixer | #close-audio-mixer "×" | 7 | 4 | 12 | 2 | 0 | 0 | 0 | 0 | 0/6 | 0 | 3 | 0 |
| foundry-hub-from-vault--tab-🔒 TRADE-UP | button.foundry-hub__tab.is-locked "🔒 TRADE- | 5 | 2 | 8 | 1 | 5 | 0 | 3 | 2 | 0/5 | 0 | 2 | 23 |
| archive--tab-◈ DOSSIER | #archive-tab-dossier "◈ DOSSIER" | 7 | 0 | 8 | 5 | 1 | 1 | 9 | 3 | 0/7 | 0 | 2 | 0 |
| tactical-map | #close-tactical-map-modal "Close Tactical Ma | 7 | 0 | 14 | 4 | 8 | 0 | 0 | 0 | 0/7 | 0 | 3 | 0 |
| archive--tab-STORY ENDINGS | #archive-tab-endings "STORY ENDINGS" | 6 | 1 | 5 | 3 | 1 | 2 | 7 | 4 | 0/6 | 0 | 2 | 0 |
| title | #title-newrun-btn "NEW RUN" | 7 | 0 | 14 | 2 | 2 | 0 | 0 | 0 | 0/7 | 0 | 3 | 0 |
| achievements | div.achievement-card.achievement-card--locke | 25 | 0 | 4 | 16 | 2 | 5 | 3 | 0 | 6/22 | 0 | 5 | 0 |
| ship-terminal--tab-◇ OBJECTIVE / NIGHT  | #terminal-tab-objectives "◇ OBJECTIVE / NIGH | 7 | 0 | 10 | 6 | 3 | 0 | 6 | 0 | 0/7 | 0 | 2 | 4 |
| about | #close-about "Close Credits" | 4 | 4 | 6 | 0 | 0 | 0 | 0 | 0 | 2/4 | 0 | 2 | 0 |
| ship-terminal | #terminal-tab-base "◇ BASE SYSTEM" | 4 | 0 | 8 | 2 | 4 | 0 | 4 | 0 | 0/4 | 0 | 2 | 2 |
| settings--setting-text-speed | button.select-picker-option.is-current "NORM | 4 | 2 | 8 | 0 | 0 | 0 | 0 | 0 | 0/4 | 0 | 2 | 0 |
| armory--slot-picker | button.armory-tile.is-selected "Tesla-Lock M | 9 | 0 | 6 | 8 | 0 | 0 | 4 | 0 | 1/9 | 0 | 3 | 0 |
| settings--save-data | #save-data-code "EXPORT OR PASTE SAVE CODE" | 4 | 2 | 4 | 4 | 0 | 0 | 0 | 0 | 1/4 | 0 | 2 | 0 |
| settings--reset-save | #reset-save-confirm "RESET SAVE" | 2 | 2 | 4 | 0 | 0 | 0 | 0 | 0 | 0/2 | 0 | 1 | 0 |
| settings--quit-confirm | #quit-confirm-btn "CONFIRM QUIT" | 2 | 2 | 4 | 0 | 0 | 0 | 0 | 0 | 0/2 | 0 | 1 | 0 |
| quit-confirm | #quit-confirm-btn "CONFIRM QUIT" | 2 | 2 | 4 | 0 | 0 | 0 | 0 | 0 | 0/2 | 0 | 1 | 0 |
| operator-polish | button.operator-polish-chip.is-selected "STA | 2 | 0 | 4 | 2 | 6 | 0 | 0 | 0 | 0/2 | 0 | 1 | 15 |
| codex | #close-codex-modal "Close Field Codex" | 1 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0/1 | 0 | 0 | 0 |

## Open / back / tab transitions

| Surface | Button | Detail |
|---|---|---|
| settings | A | #title-settings-btn: splash → settings-popup; entry focus #main-nightvision-toggle |
| settings | RB | #settings-tab-session "SESSION" → #settings-tab-audio "AUDIO"; focus #settings-tab-audio "AUDIO" |
| settings | RB | #settings-tab-audio "AUDIO" → #settings-tab-controls "CONTROLS"; focus #settings-tab-controls "CONTROLS" |
| settings | RB | #settings-tab-controls "CONTROLS" → #settings-tab-camera "CAMERA & HUD"; focus #settings-tab-camera "CAMERA & HUD" |
| settings | RB | #settings-tab-camera "CAMERA & HUD" → #settings-tab-graphics "GRAPHICS"; focus #settings-tab-graphics "GRAPHICS" |
| settings | RB | #settings-tab-graphics "GRAPHICS" → #settings-tab-accessibility "ACCESSIBILITY"; focus #settings-tab-accessibility "ACCESSIBILITY" |
| settings | RB | #settings-tab-accessibility "ACCESSIBILITY" → #settings-tab-profile "PROFILE & SAVES"; focus #settings-tab-profile "PROFILE & SAVES" |
| settings | RB | #settings-tab-profile "PROFILE & SAVES" → #settings-tab-session "SESSION"; focus #settings-tab-session "SESSION" |
| settings--audio-mixer | A | #open-audio-mixer: settings-popup → audio-mixer-popup; entry focus #close-audio-mixer "×" |
| settings--audio-mixer | B | audio-mixer-popup → settings-popup; focus #open-audio-mixer "OPEN" |
| settings--commentary-list | A | #open-commentary-list: settings-popup → commentary-list-modal; entry focus #close-commentary-list "Close developer commentary" |
| settings--commentary-list | B | commentary-list-modal → settings-popup; focus #open-audio-mixer "OPEN" (**not the opener**) |
| settings--language-select | A | #open-language-select: settings-popup → language-select-popup; entry focus button.language-choice-btn "English" |
| settings--language-select | B | language-select-popup → settings-popup; focus #open-language-select "OPEN" |
| settings--crosshair-color | A | #open-crosshair-color: settings-popup → crosshair-color-popup; entry focus button.crosshair-color-swatch "Orange crosshair" |
| settings--crosshair-color | B | crosshair-color-popup → settings-popup; focus #open-crosshair-color "OPEN" |
| settings--mature-audit-btn | A | #open-mature-audit-btn: settings-popup → mature-content-audit-modal; entry focus #close-mature-audit-modal "Close audit suite" |
| settings--mature-audit-btn | B | mature-content-audit-modal → settings-popup; focus #open-language-select "OPEN" (**not the opener**) |
| settings--controls | A | #open-controls: settings-popup → controls-popup; entry focus #close-controls "×" |
| settings--controls | B | controls-popup → settings-popup; focus button. "50%" (**not the opener**) |
| settings--save-data | A | #open-save-data: settings-popup → save-data-popup; entry focus #save-data-code "EXPORT OR PASTE SAVE CODE" |
| settings--save-data | B | save-data-popup → settings-popup; focus #operator-callsign "Operator callsign" (**not the opener**) |
| settings--reset-save | A | #open-reset-save: settings-popup → reset-save-confirm-modal; entry focus #reset-save-confirm "RESET SAVE" |
| settings--reset-save | B | reset-save-confirm-modal → settings-popup; focus #operator-callsign "Operator callsign" (**not the opener**) |
| settings--quit-confirm | A | #open-quit-confirm: settings-popup → quit-confirm-modal; entry focus #quit-confirm-btn "CONFIRM QUIT" |
| settings--quit-confirm | B | quit-confirm-modal → settings-popup; focus #main-nightvision-toggle (**not the opener**) |
| settings--setting-text-speed | A | #setting-text-speed: settings-popup → select-picker-overlay; entry focus button.select-picker-option.is-current "NORMAL" |
| settings--setting-text-speed | B | select-picker-overlay → settings-popup; focus #setting-text-speed "NORMAL FAST INSTANT" |
| settings--operator-callsign | A | #operator-callsign: settings-popup → settings-popup (**did not open**); entry focus #operator-callsign "Operator callsign" |
| settings | B | settings-popup → splash; focus #title-newrun-btn "NEW RUN" (**not the opener**) |
| achievements | A | #title-achievements-btn: splash → achievements-modal; entry focus div.achievement-card.achievement-card--locked "QUICK STUDY. Lose a run within f" |
| achievements | B | achievements-modal → splash; focus #title-achievements-btn "ACHIEVEMENTS" |
| about | A | #title-about-btn: splash → about-modal; entry focus #close-about "Close Credits" |
| about | B | about-modal → splash; focus #title-about-btn "ABOUT" |
| quit-confirm | A | #title-quit-btn: splash → quit-confirm-modal; entry focus #quit-confirm-btn "CONFIRM QUIT" |
| quit-confirm | B | quit-confirm-modal → splash; focus #title-newrun-btn "NEW RUN" (**not the opener**) |
| operator-menu | A | #title-newrun-btn: splash → menu; entry focus div.char-card.selected "BULWARK FRAME BREACHER TANK ACTI" |
| operator-polish | A | #hero-polish-btn: menu → operator-polish-modal; entry focus button.operator-polish-chip.is-selected "STANDARD ISSUE" |
| operator-polish | B | operator-polish-modal → menu; focus div.char-card.selected "BULWARK FRAME BREACHER TANK ACTI" (**not the opener**) |
| foundry-hub-from-vault | A | #steam-vault-btn: menu → foundry-hub-modal; entry focus button.foundry-hub__tab.is-active "STASH" |
| foundry-hub-from-vault | RB | button.foundry-hub__tab.is-active "STASH" → button.foundry-hub__tab.is-active "LOADOUT"; focus button.foundry-hub__tab.is-active "LOADOUT" |
| foundry-hub-from-vault | RB | button.foundry-hub__tab.is-active "LOADOUT" → button.foundry-hub__tab.is-locked "🔒 FABRICATE"; focus button.foundry-hub__tab.is-locked "🔒 FABRICATE" |
| foundry-hub-from-vault | RB | button.foundry-hub__tab.is-locked "🔒 FABRICATE" → button.foundry-hub__tab.is-locked "🔒 TRADE-UP"; focus button.foundry-hub__tab.is-locked "🔒 TRADE-UP" |
| foundry-hub-from-vault | RB | button.foundry-hub__tab.is-locked "🔒 TRADE-UP" → button.foundry-hub__tab.is-active "STASH"; focus button.foundry-hub__tab.is-active "STASH" |
| foundry-hub-from-vault | B | foundry-hub-modal → menu; focus #steam-vault-btn "◈ STEAM VAULT" |
| foundry-hub-from-fab | A | #fabrication-btn: menu → foundry-hub-modal; entry focus button.foundry-hub__tab.is-locked "🔒 FABRICATE" |
| foundry-hub-from-fab | B | foundry-hub-modal → menu; focus #fabrication-btn "◇ FAB BAY" |
| archive | A | #archive-btn: menu → archive-modal; entry focus #archive-tab-lore "LORE LOGS" |
| archive | RB | #archive-tab-lore "LORE LOGS" → #archive-tab-dossier "◈ DOSSIER"; focus #archive-tab-dossier "◈ DOSSIER" |
| archive | RB | #archive-tab-dossier "◈ DOSSIER" → #archive-tab-endings "STORY ENDINGS"; focus #archive-tab-endings "STORY ENDINGS" |
| archive | RB | #archive-tab-endings "STORY ENDINGS" → #archive-tab-achievements "ACHIEVEMENTS"; focus #archive-tab-achievements "ACHIEVEMENTS" |
| archive | RB | #archive-tab-achievements "ACHIEVEMENTS" → #archive-tab-records "RECORDS"; focus #archive-tab-records "RECORDS" |
| archive | RB | #archive-tab-records "RECORDS" → #archive-tab-lore "LORE LOGS"; focus #archive-tab-lore "LORE LOGS" |
| archive | B | archive-modal → menu; focus #archive-btn "◈ ARCHIVE" |
| codex | A | #codex-btn: menu → codex-modal; entry focus #close-codex-modal "Close Field Codex" |
| codex-detail | A | skipped: opener not visible |
| codex | B | codex-modal → menu; focus div.char-card.selected "BULWARK FRAME BREACHER TANK ACTI" (**not the opener**) |
| dossier | A | #season-pass-btn: menu → season-pass-modal; entry focus button.season-pass-claim-btn "Track" |
| dossier | RB | button.season-pass-tab-btn.active "Dossier" → button.season-pass-tab-btn.active "Directives"; focus button.season-pass-tab-btn.active "Directives" |
| dossier | RB | button.season-pass-tab-btn.active "Directives" → button.season-pass-tab-btn.active "Fragment Workshop"; focus button.season-pass-tab-btn.active "Fragment Workshop" |
| dossier | RB | button.season-pass-tab-btn.active "Fragment Workshop" → button.season-pass-tab-btn.active "Fragment Workshop" (**no change**); focus button.season-pass-tab-btn.active "Fragment Workshop" |
| dossier | B | season-pass-modal → menu; focus #season-pass-btn "◈ DOSSIER" |
| achievements-from-menu | A | skipped: opener not visible |
| archive-sims | A | skipped: opener not visible |
| chat | A | skipped: opener not visible |
| armory | A | #start-game: menu → armory-screen; entry focus #armory-btn-embark "CONTINUE TO DEPLOYMENT >> [ENTER" |
| armory | RB | button.class-tab.active "▰ TANK" → button.class-tab.active "◆ ENGINEER"; focus #armory-btn-embark "CONTINUE TO DEPLOYMENT >> [ENTER" |
| armory--slot-picker | A | #armory-slot-weapon: armory-screen → armory-picker-modal; entry focus button.armory-tile.is-selected "Tesla-Lock MK-IV Arc Driver — FA" |
| armory--slot-picker | B | armory-picker-modal → armory-screen; focus #armory-slot-weapon "Tesla-Lock MK-IV Arc Driver — FA" |
| armory--select-picker | A | skipped: opener not visible |
| tactical-net | A | #armory-btn-embark: armory-screen → multiplayer-modal; entry focus button.calibrate-btn "CHAT" |
| ship-terminal | RB | #terminal-tab-base "◇ BASE SYSTEM" → #terminal-tab-skills "◇ CLASS SKILLS SKL 0/6 · SYS 0/4"; focus #terminal-tab-skills "◇ CLASS SKILLS SKL 0/6 · SYS 0/4" |
| ship-terminal | RB | #terminal-tab-skills "◇ CLASS SKILLS SKL 0/6 · SYS 0/4" → #terminal-tab-objectives "◇ OBJECTIVE / NIGHT LOG"; focus #terminal-tab-objectives "◇ OBJECTIVE / NIGHT LOG" |
| ship-terminal | RB | #terminal-tab-objectives "◇ OBJECTIVE / NIGHT LOG" → #terminal-tab-base "◇ BASE SYSTEM"; focus #terminal-tab-base "◇ BASE SYSTEM" |
| ship-terminal | B | console-terminal-modal → gameplay; focus body |
| tactical-map | B | tactical-map-modal → gameplay; focus body |
| pause | START | undefined → null (**no change**); focus body |
