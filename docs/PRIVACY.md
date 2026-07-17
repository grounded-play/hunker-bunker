# Hunker Bunker — Privacy Policy

This Privacy Policy explains how **Hunker Bunker** (developed by the **Tuesday Cinema Club**) handles data when you play the game or interact with its Steam integration.

## 1. Information Collected via Steam

**Hunker Bunker** uses the Steamworks SDK and is integrated with the Steam platform. When you play the game, the following information is processed:
- **Steam ID (SteamID64):** A unique, non-personally identifiable numeric identifier associated with your Steam profile. This is used to load your Steam Vault inventory, unlock Steam achievements, and submit scores to the Steam Leaderboards.
- **Steam Inventory Metadata:** Information about cosmetic items (skins, caches, keys) owned by your Steam profile to display them in the game's Vault.

All transactions, inventory grants, and wallet processing happen entirely through the **Steam Client and Steam Wallet**. Hunker Bunker does not collect, store, or have access to your payment information, real name, email address, or billing details.

## 2. Local Data Storage

The game saves your local progress, statistics, settings, and unlock states in your local browser storage or local Electron application sandbox:
- **localStorage Keys:** `hb_achievements_v1`, `hb_world_memory_v1`, etc.
- This data is stored locally on your device and is not uploaded to our servers.

## 3. Server Integration

The optional inventory and leaderboard server components only handle verification tokens signed by Steam (Steam Session Tickets).
- We do not run tracking cookies, third-party marketing trackers, or telemetry analytics engines.
- Connection logs to the server are used strictly for service reliability, rates limiting, and security compliance.

## 4. Updates to this Policy

We may update this Privacy Policy from time to time. Any changes will be committed to the public repository.

For questions or suggestions, please open an issue on the [Hunker Bunker GitHub repository](https://github.com/grounded-play/hunker-bunker).
