# Steam DRM Wrap Procedure

Date: 2026-07-25
Status: Operational Procedure

This runbook documents how to apply Valve's Steamworks DRM protection to packaged Windows Electron executables for **Hunker Bunker** (App ID `4957040`).

---

## 1. Prerequisites

1. Build the packaged Windows Electron directory payload:
   ```bash
   npm run electron:build
   ```
   This creates `dist_electron/win-unpacked/Hunker Bunker.exe`.

2. Obtain the Steamworks SDK:
   Download the latest SDK from the Steamworks Partner portal. Locate `drmwrap.exe` in:
   `steam/sdk/tools/ContentBuilder/builder/drmwrap.exe`

3. Alternatively, set an environment variable to point to `drmwrap.exe`:
   ```bash
   export STEAM_DRM_TOOL_PATH="/path/to/drmwrap.exe"
   ```

---

## 2. Running Automated Wrap Helper

Run the helper script from the repository root:

```bash
npm run steam:drm-wrap
```

### Script Behaviors
- Validates the presence of `dist_electron/win-unpacked/Hunker Bunker.exe`.
- Checks for `drmwrap.exe`.
- Invokes Valve's wrapper CLI targeting App ID `4957040`.
- Outputs status logging and returns non-zero code on wrapper failure.

---

## 3. Manual Wrapper Invocation

If executing `drmwrap.exe` directly on Windows:

```cmd
cd steam\sdk\tools\ContentBuilder\builder
drmwrap.exe -appid 4957040 -input "path\to\dist_electron\win-unpacked\Hunker Bunker.exe" -output "path\to\dist_electron\win-unpacked\Hunker Bunker.exe" -tool 0
```

> **Note on Steamworks Web Wrapper Option**:
> Steamworks also provides an online DRM wrapper tool on the Steamworks Partner Dashboard (`App Admin -> SteamPipe -> DRM`). You may upload `Hunker Bunker.exe`, download the wrapped binary, and replace `dist_electron/win-unpacked/Hunker Bunker.exe` before building the depot.

---

## 4. Verification

1. Verify the wrapped binary launches cleanly via Steam client on a test machine.
2. Confirm `npm run steam:audit-depot` passes on `dist_electron/win-unpacked/` before uploading with SteamPipe.
