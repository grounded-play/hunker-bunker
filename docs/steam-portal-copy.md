# Steam Portal Copy

Use this as the fill-in guide for Steamworks. It only includes claims the
current repo can support.

## Supported Platforms

Check:

- Windows
- Linux + SteamOS

Leave unchecked for now:

- macOS
- Android

Why:

- The current release matrix only has Windows and Linux depots in
  `steam/app_build.vdf`.
- The Electron build config in `package.json` only targets `win` and `linux`.

## Steam Deck Compatibility Info

Suggested note:

> We are testing Hunker Bunker on Steam Deck now. The current shipping build
> runs as a native Linux/SteamOS Electron build and supports keyboard/mouse
> plus touch controls. Native controller/Steam Input polish is still in
> progress, so we are not claiming Steam Deck Verified yet.

Shorter version:

> Steam Deck support is in progress. The native Linux build runs on SteamOS,
> but controller mapping and UI polish are still being tuned.

If you want a longer public update, Steam also supports posting an event and
linking it from the Deck compatibility note.

## Minimum System Requirements

### Windows

| Field | Suggested value |
| --- | --- |
| OS Version | Windows 10 64-bit |
| Processor | Intel Core i3 or AMD Ryzen 3 |
| Memory | 4 GB RAM |
| Graphics | WebGL-capable GPU with current drivers |
| Network | None required for single-player |
| DirectX Version | N/A |
| Disk Space | 512 MB available space |
| Sound Card | Any standard audio device |
| Additional Notes | Requires a modern GPU that can run Chromium/WebGL reliably. |

### Recommended Windows

| Field | Suggested value |
| --- | --- |
| OS Version | Windows 11 64-bit |
| Processor | Intel Core i5 or AMD Ryzen 5 |
| Memory | 8 GB RAM |
| Graphics | Recent integrated or discrete GPU |
| Network | None required for single-player |
| DirectX Version | N/A |
| Disk Space | 1 GB available space |
| Sound Card | Any standard audio device |
| Additional Notes | SSD recommended. |

### Linux + SteamOS

| Field | Suggested value |
| --- | --- |
| OS Version | SteamOS 3.x or Ubuntu 22.04 LTS |
| Processor | 64-bit CPU |
| Memory | 4 GB RAM |
| Graphics | OpenGL/Vulkan-capable GPU with current drivers |
| Network | None required for single-player |
| Disk Space | 512 MB available space |
| Sound Card | Any standard audio device |
| VR Devices and Support | N/A |
| Additional Notes | Steam Deck is the primary Linux target. |

### Recommended Linux + SteamOS

| Field | Suggested value |
| --- | --- |
| OS Version | SteamOS 3.x or Ubuntu 24.04 LTS |
| Processor | Modern 64-bit CPU |
| Memory | 8 GB RAM |
| Graphics | Recent integrated or discrete GPU |
| Network | None required for single-player |
| Disk Space | 1 GB available space |
| Sound Card | Any standard audio device |
| VR Devices and Support | N/A |
| Additional Notes | SSD recommended; 1280x800 is the target Steam Deck UI size. |

## macOS

Do not check this box on the current store page.

If you later ship macOS, fill the fields only after you have a tested and
notarized build.

Future-only template:

| Field | Suggested value |
| --- | --- |
| OS Version | macOS 11.0 or newer |
| Processor | Apple Silicon or Intel |
| Memory | 4 GB RAM |
| Graphics | Metal-capable GPU |
| Network | None required for single-player |
| Disk Space | 512 MB available space |
| Sound Card | Any standard audio device |
| Additional Notes | 64-bit and notarized build required. |

## Release Dates

- Use `Coming Soon` until the Windows and Linux depots have been uploaded and
  smoke-tested.
- Once you have a real launch date, set the public date only after you can
  launch successfully on every checked platform.
- If you want external testing first, keep the main app unreleased and use
  Playtest or beta branches.

## Do Not Overclaim

- Do not mark controller support as implemented unless you have a tested
  controller pass.
- Do not mark macOS as supported until you have a shipped mac build.
- Do not mark Steam Deck Verified yet unless you have actually completed the
  Deck review pass.

