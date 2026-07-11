# Steam Build Pipeline: From Netlify Toy to Demoable Steam Build

Plan of record, 2026-07-11. The store page exists; the goal is a repeatable
path from `git push` to a build a stranger can install from Steam. This doc
adopts Gemini's Antigravity Electron plan (electron main/preload,
steamworks.js, localStorage→save.json bridge, achievement forwarding,
electron-builder) as **Phase A**, then adds everything between "runs in
Electron on my machine" and "demo on Steam": overlay/cloud plumbing, the
steamcmd depot pipeline, CI, and the demo-surface strategy.

One correction to that plan: the game is **Three.js**, not Phaser (Phaser is
a stale dependency — see cleanup note in Phase A). Nothing else changes.

Netlify stays: it remains the instant-preview channel for agents and the
PWA/web demo. Steam is a parallel artifact of the same `dist/`.

---

## Architecture decisions (made, with reasons)

- **Electron over Tauri.** Tauri uses the OS webview (WebView2/WebKitGTK) —
  WebGL2 and codec behavior varies per machine, and Steam Deck's WebKitGTK
  is exactly where a Three.js game breaks. Electron ships the Chromium the
  game is developed against. Precedent: Vampire Survivors shipped v1 on it.
- **steamworks.js over greenworks.** Maintained, prebuilt N-API binaries,
  works with current Electron, and ships `electronEnableSteamOverlay()`
  which applies the overlay-required switches (`in-process-gpu`,
  `disable-direct-composition`) so we don't cargo-cult flags.
- **Defensive Steam init.** The wrapper must run with no Steam client
  present (dev boxes, itch later): `steamworks.js` loads via dynamic import
  behind a try/catch; absence of Steam = silent no-op, the game never knows.
- **Windows + Linux depots; macOS deferred.** Windows is the audience;
  the Linux native build doubles as the Steam Deck build (no Proton
  dependency). macOS needs signing + notarization — park it until the demo
  is proven.
- **Playtest before Demo.** Steam **Playtest** (free sub-app, one click on
  the store page, keyless, wipeable) is the right first public surface.
  A **Demo** appid (separate build with a `DEMO_BUILD` content gate) comes
  when the wave-4 first-five-minutes work lands — a demo ships the exact
  part of the game the teardown doc says is weakest today.

## The phases

### Phase A — Desktop wrapper (Gemini's plan, adopted) ✦ in repo now

`electron/main.cjs` + `electron/preload.cjs` (this repo is
`"type": "module"`, so the Electron entry uses `.cjs`), `base: './'` in
Vite, electron-builder config, `electron:dev` / `electron:build` scripts.
Save bridge: hb_* localStorage writes mirror to `save.json` under
`app.getPath('userData')` via IPC; boot restores before the game reads.
Achievements: the existing `achievement-unlocked` window event forwards to
`steamworks.js` — the event contract from wave 2 was built for this.

Cleanup rider: `phaser` is in `dependencies` but unused — remove it when
convenient (it's dead weight in every audit, not in the bundle).

### Phase B — Steam plumbing

1. **Overlay**: call `steamworks.electronEnableSteamOverlay()` in main;
   verify Shift+Tab in a packaged build launched from Steam.
2. **Cloud saves**: Steamworks dashboard → Auto-Cloud on the userData
   `save.json` path (`WinAppDataRoaming`/`LinuxXdgDataHome` roots). No
   code needed beyond the Phase A file bridge; document byte quota (1 MB is
   plenty — save codes are ~KBs).
3. **Achievements**: register API names on the dashboard exactly matching
   `ACHIEVEMENT_DEFS` keys (Gemini's plan has the full mapping table —
   use it verbatim) and **Publish**. `SLAY THE QUEEN` registers now,
   ships achievable in wave 4+.
4. **Launch options**: single launch config per OS; `steam_appid.txt` is
   dev-only and must NOT ship in depots (retail launches through the
   client). The packaged app refuses `steam_appid.txt` outside dev mode.
5. **Relay server**: the socket.io relay (`server/`) is not wired into the
   client today — Steam builds ship fully offline. If multiplayer ghosts
   land later, gate behind a flag defaulting off on Steam until a hosted
   relay exists.

### Phase C — Depot pipeline (this repo now carries the templates)

```
steam/
  app_build.vdf          # appid, branch (default→none, sets 'beta'), depots
  depot_build_windows.vdf  # dist_electron/win-unpacked → depot 1001
  depot_build_linux.vdf    # dist_electron/linux-unpacked → depot 1002
```

- electron-builder targets: `--dir` (win-unpacked / linux-unpacked) — Steam
  wants a loose directory, not an installer. NSIS/AppImage are for
  non-Steam distribution later.
- Upload: `steamcmd +login <builder> +run_app_build .../app_build.vdf`.
  Use a **dedicated builder account** with only "Edit App Metadata +
  Publish" on this app, never the owner login.
- **CI**: `.github/workflows/steam-build.yml` — on tag `v*` or manual
  dispatch: matrix build (windows-latest, ubuntu-latest) → `npm ci`,
  `npm test`, `vite build`, `electron-builder --dir` → artifacts; upload
  job runs only when `STEAM_BUILD_ACCOUNT`/`STEAM_CONFIG_VDF` secrets
  exist (steamcmd login via cached config.vdf; never store the password).
  Until secrets are set, CI still proves every commit packages cleanly.

### Phase D — The demo surface

1. **Now → wave 4 lands**: private testing via the `beta` branch
   (password-protected) + Steam Playtest for the first external hands.
2. **Demo appid**: `DEMO_BUILD` feature flag (in `featureFlags.js`) gates
   content to Act 1 through the cave reveal + a "the story continues"
   card — the reveal is the hook; ending the demo ON it is the wishlist
   converter. Demo builds are the same pipeline with a second app_build
   VDF pointing at the demo appid.
3. **Deck pass**: the Linux depot on real hardware; the blockers are
   already in the wave-4 plan (gamepad support is the honest gap — the
   game is KB/M/touch; Steam Input template mapping is the stopgap,
   native pad support is wave-5 work).

## Human checklist (only you can do these — Steamworks dashboard)

1. Confirm appid; note it in `steam/app_build.vdf` (currently `480`
   placeholder = Spacewar for local testing).
2. Create two depots (Windows, Linux) and put their ids in the VDFs.
3. Create the builder account, grant minimal perms, run `steamcmd +login`
   once locally to mint `config.vdf`, store as the CI secret.
4. Register + publish achievements from the mapping table.
5. Enable Auto-Cloud with the documented paths.
6. Create the Playtest sub-app when ready for outsiders; Demo appid later.
7. Store assets (capsules/trailer) — pairs with wave-4 Gemini key art.

## Agent lanes

- **Claude (this session)**: Phase A scaffold + Phase C templates + CI —
  done with this commit; see verification below.
- **Gemini (after wave 3)**: window/branding polish (icon set, splash,
  about box, fullscreen default + windowed toggle), demo end-card art,
  store capsule art (reuses wave-4 title key art lane).
- **Codex (after wave 3)**: `DEMO_BUILD` content gating, Steam Input
  gamepad mapping stopgap, `save.json` migration tests (localStorage ↔
  file round-trip), relay flag hygiene.

## Verification (repeatable)

- `npm run build` → web bundle unchanged (Netlify path intact).
- `npm run electron:dev` → window opens against the dev server; console
  logs `[steam] not available (dev)` without Steam running.
- `npm run electron:build` → `dist_electron/linux-unpacked/` launches the
  game from `file://` with saves persisting across restarts.
- CI: the workflow's package job is the gate — a PR that breaks packaging
  fails visibly before any Steam upload is attempted.
