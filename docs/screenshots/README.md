# In-game kiosk screenshots

Status: current | Owner: UI | Updated: 2026-10-27 | Review: when a kiosk or overlay changes

Real captures from a running game, not mock-ups: `scripts/capture-kiosk-screenshots.mjs` plays into an actual run (title, new run, Armory, embark, deploy, gameplay) and opens each machine the way a player does, on Steam Deck (1280 × 800) and PC (1920 × 1080).

| Machine | Steam Deck | PC |
| :--- | :--- | :--- |
| Armory (loadout) | `deck_armory.jpg` | `pc_armory.jpg` |
| Fabrication Auto-Mart | `deck_fabrication_automart.jpg` | `pc_fabrication_automart.jpg` |
| Meridian service terminal | `deck_console_kiosk.jpg` | `pc_console_kiosk.jpg` |
| Black-Ice 21 cabinet | `deck_blackice_arcade.jpg` | `pc_blackice_arcade.jpg` |

`kiosks_deck_vs_pc.jpg` puts each Deck shot beside its PC shot.

To refresh them, start the dev server (`npm run dev`) and run `node scripts/capture-kiosk-screenshots.mjs`. How the kiosks are built: [diegetic-terminal-interactivity-plan.md](../planning/diegetic-terminal-interactivity-plan.md).
