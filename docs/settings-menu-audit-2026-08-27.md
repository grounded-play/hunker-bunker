# Settings Menu Runtime Audit — 2026-08-27

This audit traces every player-visible Settings control through its DOM event,
persisted value, and runtime consumer. A control remains visible only when that
chain is complete. Reviewer and developer utilities are not player settings.

## Corrected controls

| Control | Finding | Resolution |
| --- | --- | --- |
| Night Vision | Loaded at boot but had no change listener. | The toggle now updates the live game and persists `hunker_nightvision_enabled`. |
| Commentary Mode | Loaded at boot but had no change listener. | The toggle now updates commentary gating and persists `hunker_commentary_enabled`. |
| UI Accessibility Scale | Changed the current session and wrote storage, but storage was never restored. | Valid persisted values are restored before layout initialization. |
| Minimum Text Floor | Changed the current session and wrote storage, but storage was never restored. | Valid persisted values are restored before layout initialization. |
| Turn / Aim Speed | Third-person turning consumed it, but isometric controller aiming did not. | Isometric right-stick aim deltas now use the selected sensitivity. |
| Invert Aim Y-Axis | Menu cursor input consumed it, but isometric gameplay aiming did not. | Isometric right-stick aim now applies the persisted inversion. |
| Steam Cloud Sync | The UI always claimed `SYNCED`, even in a web build or when Steam was offline. | The readout now reports Ready, disabled, unavailable, Steam offline, or web-build unavailable from the real bridge snapshot. |

## Intentionally hidden controls

| Removed row | Reason |
| --- | --- |
| Stage Resolution | The game uses a fixed 1280×800 logical stage fitted to the host viewport. The preset was developer metadata and did not alter renderer output. The internal dev-console diagnostic remains. |
| Camera Shake | No camera-shake effect or runtime consumer exists. Its stale storage key is removed at boot. |
| Run Difficulty | This was a hardcoded `STANDARD` readout; no difficulty selection or gameplay system consumes it. Its stale storage key is removed at boot. |
| Mature Content Audit | Steam reviewer/QA workflow available through its F9 path, not a player preference. |

## Controls verified as already functional

Audio Mixer, Gameplay Camera, Camera Distance, Camera Follow, Crosshair Color,
Text Speed, Colorblind Assist, Desktop Control Remapping, Operator Callsign,
Save Data, New Game Reset, Exit Application, and Abort Mission all have a live
handler and runtime or platform consumer. Debug Overlay is also functional in
the current QA-authorized build via the listener added in `62f72f1`; its row is
revealed only when developer-tool authorization allows it. The Run Difficulty
item is excluded for the reason above.

Browser regression coverage lives in `tests/e2e/settings-audit.spec.js`.
