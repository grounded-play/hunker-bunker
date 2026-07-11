# Steam Truth Check

This is the reality check before you fill in Steamworks. It separates what the
current repo already supports from what is still planned.

## Confirmed Today

- Build/runtime: Vite web build plus Electron wrapper. See `package.json`,
  `electron/main.cjs`, and `electron/preload.cjs`.
- Current Steam depots: Windows `1247291` and Linux `1247292` in
  `steam/app_build.vdf`.
- Save path: `hb_*` localStorage values mirror to `save.json` under Electron
  `userData`, which is the right shape for Steam Auto-Cloud.
- Input: keyboard/mouse plus touch UI. Keyboard bindings are remappable.
  There is no native gamepad/controller layer in the runtime yet.
- Accessibility: text speed selector, difficulty selector, shake toggle,
  colorblind assist, and key remapping exist in `main.js` / `index.html`.
- Steam hooks: optional Steam overlay, achievements, and stats forwarding
  exist in `electron/main.cjs`.

## Do Not Claim Yet

- Steam Deck Verified.
- Native controller support.
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

