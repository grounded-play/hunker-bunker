# Steam Portal Copy

Use this as the fill-in guide for Steamworks. It only includes claims the
current repo can support.

For the exact asset plan, see [steam-store-asset-checklist.md](steam-store-asset-checklist.md).

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
> runs as a native Linux/SteamOS Electron build with native Steam Input API
> support, controller-aware prompts, and touch controls. We are not claiming
> Steam Deck Verified yet until the hardware pass is complete.

Shorter version:

> Steam Deck support is in progress. The native Linux build runs on SteamOS
> with Steam Input API support and touch controls, but we are still doing the
> hardware pass before claiming Verified.

If you want a longer public update, Steam also supports posting an event and
linking it from the Deck compatibility note.

## Steam Input Settings

Use Steam Input as the native controller layer for this build.

Recommended settings:

- Opt Controllers into Steam Input: check `Xbox`, `PlayStation`, `Nintendo Switch`, `Generic (DirectInput)`, and `Any Future Devices`.
- Steam Input Default Controller Configuration: `Custom Configuration (Bundled with Game)`.
- Action Manifest Path: `steam_input_manifest.vdf`.
- Steam Input Default Touch Configuration: `Mouse point and click`.
- Steam Deck Touchscreen Mode: `Left Mouse Click Emulation`.

Why:

- The runtime now includes native Steam Input API polling in Electron and
  controller-aware HUD prompts.
- The bundled action manifest keeps the Steamworks configuration aligned with
  the codebase and lets Steam generate the official default layout.

If you later change the action list or controller flow, revisit these settings
so the manifest and Steamworks template stay in sync.

## About This Game

Steam store descriptions use BBCode-style tags, not GitHub Markdown. Paste the
block below into the Steamworks "About This Game" field:

```text
[b]HUNKER BUNKER[/b] is a retro-futuristic tactical survival game about leading
a squad through a shifting underground bunker, scavenging salvage, and keeping
the lights on when the dark starts moving back.

You command three specialist operators:
[list]
[*][b]Scout[/b] for fast recon and wide salvage coverage.
[*][b]Tank[/b] for heavy defense and frontline survival.
[*][b]Engineer[/b] for rerouting systems, terminal work, and tactical utility.
[/list]

Every run pushes you deeper into procedural bunker corridors, hostile biomes,
and broken infrastructure. Manage oxygen, recover resources, repair critical
systems, and decide which threats are worth fighting when supplies run thin.

[b]Features[/b]
[list]
[*]Procedurally generated bunker runs with shifting layouts and escalating pressure.
[*]Distinct operator classes with different movement, abilities, and combat roles.
[*]Oxygen and salvage management that rewards careful route planning.
[*]Discoverable terminals, lore logs, codex entries, camps, and faction secrets.
[*]Multiple endings that reflect the choices and survival of your crew.
[*]Keyboard/mouse support, touch-friendly UI, and remappable controls.
[/list]

Some secrets in Hunker Bunker are not hidden behind keys. They are hidden
behind the cost of surviving long enough to ask the right questions.
```

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
