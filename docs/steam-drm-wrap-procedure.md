# Steam DRM Wrap Procedure

This document details the step-by-step procedure to wrap the Windows packaged executable of **Hunker Bunker** using the official Steamworks DRM tool, protecting the game against unauthorized distribution and enforcing initialization through the Steam Client.

---

## 1. Prerequisites

Before wrapping the executable, ensure you have:
1.  Access to the **Steamworks Partner Portal** for Hunker Bunker (App ID: `4957040`).
2.  The **Steamworks SDK** downloaded and extracted to your local system.
    *   The DRM tool is located in the SDK folder at: `sdk/tools/ContentPrep/steamworks_drm.exe`.
3.  A packaged Windows build of the game (the unpacked folder).
    *   Generate this by running `npm run electron:build` in the project root.
    *   This will yield the unpacked output at: `dist_electron/win-unpacked/Hunker Bunker.exe`.
4.  Your developer-specific **DRM wrapper key** (if requested by the portal/SDK config).

---

## 2. Automated Wrapping (Recommended)

A helper script has been provided at `scripts/steam-drm-wrap.js` to automate resolving parameters and replacing the original executable.

Run the script by passing the path to the Steamworks wrapper tool:

```bash
node scripts/steam-drm-wrap.js --tool "/path/to/steamworks_drm.exe"
```

If you have a DRM wrapper key configured:

```bash
node scripts/steam-drm-wrap.js --tool "/path/to/steamworks_drm.exe" --key "YOUR_DRM_KEY_HEX"
```

### Script Execution Flow
1.  **Validates App ID:** Reads the local App ID from `electron/steam-config.json` (defaults to `4957040` if missing).
2.  **Validates Binary:** Verifies `dist_electron/win-unpacked/Hunker Bunker.exe` exists.
3.  **Applies Wrapping:** Invokes the DRM tool with the correct arguments.
4.  **Verifies Output:** Replaces the original `Hunker Bunker.exe` with the newly wrapped version in-place, ready for depot staging.

---

## 3. Manual Wrapping (Alternate)

If you prefer to run the command manually or in a custom batch script:

1.  Open a command line terminal (Command Prompt/PowerShell on Windows, or standard shell with Wine on Linux).
2.  Navigate to the directory containing `steamworks_drm.exe`.
3.  Execute the tool specifying the input, output, and Hunker Bunker App ID:

```cmd
steamworks_drm.exe -inputfile "C:\path\to\hunker-bunker\dist_electron\win-unpacked\Hunker Bunker.exe" -outputfile "C:\path\to\hunker-bunker\dist_electron\win-unpacked\Hunker Bunker.exe" -appid 4957040
```

*Note: You can overwrite the input file directly by using the same path for both `-inputfile` and `-outputfile`.*

---

## 4. Platform Considerations

### Windows
- Windows is the native platform for `steamworks_drm.exe`. No additional setup is required.

### Linux & Steam Deck
- **Linux Executable (.x86_64):** Steamworks does **not** support DRM wrapping for native Linux/macOS binaries. 
- **Compatibility Layer (Proton/Wine):** Since Hunker Bunker runs perfectly under Proton on the Steam Deck, you can distribute the wrapped Windows build as your default payload. 
- If you build a native Linux target, it will run without DRM wrapping but will still require Steamworks authentication at runtime via the `steamworks.js` API shell initialization.
- **Cross-Wrapping on Linux:** If you package Windows builds on a Linux build server, the `scripts/steam-drm-wrap.js` script will automatically detect the platform and attempt to execute `steamworks_drm.exe` through **Wine** (`wine steamworks_drm.exe ...`).

---

## 5. Verification

To verify that the wrapper succeeded:
1.  Try running the wrapped `Hunker Bunker.exe` directly **without** running the Steam Client.
2.  The executable should intercept the launch, trigger Steam to start, and automatically launch Hunker Bunker through Steam (redirecting to the Steam game link).
3.  If Steam fails to start, the game will exit cleanly.
