# Steam Truth Check

This is the reality check before you fill in Steamworks. It separates what the
current repo already supports from what is still planned.

## Confirmed Today

- Build/runtime: Vite web build plus Electron wrapper. See `package.json`,
  `electron/main.cjs`, and `electron/preload.cjs`.
- Current Steam app/depot: app `4957040` with content depot `4957041` in
  `steam/app_build.vdf`. The depot currently carries both `win-unpacked/`
  and `linux-unpacked/` payloads until a separate Linux depot is added in
  Steamworks.
- Save path: `hb_*` localStorage values mirror to `save.json` under Electron
  `userData`, which is the right shape for Steam Auto-Cloud.
- Input: keyboard/mouse plus touch UI, remappable keyboard bindings, and
  native Steam Input API support for controller input.
- Steam Input: wired through the Electron shell with the bundled action
  manifest at `steam_input_manifest.vdf`.
- Accessibility: text speed selector, difficulty selector, shake toggle,
  colorblind assist, and key remapping exist in `main.js` / `index.html`.
- Steam hooks: optional Steam overlay, achievements, and stats forwarding
  exist in `electron/main.cjs`.

## Do Not Claim Yet

- Steam Deck Verified.
- macOS shipping support.
- "All OSes" in the Steam platform checkboxes.

## If macOS Is Required Later

- Add a macOS build target to `package.json` / electron-builder.
- Build and smoke-test on both Intel and Apple Silicon.
- Sign and notarize the app before shipping.

## Publication Stance

- Ship Windows + Linux/SteamOS first.
- Treat Steam Deck as "in progress" unless you have actually tested the
  controller layout on real hardware.
