# 04. Developer Runbook & Demo Verification

A step-by-step checklist to launch, connect, and verify all Steam, multiplayer, and economy systems.

---

## 1. Quick Verification Checklist

### A. Testing in Native Steam (App ID 4957040)
1. **Ensure Steam Client is running** and logged in to an authorized developer/tester account.
2. Launch the desktop build in dev mode:
   ```bash
   npm run electron:dev
   ```
3. Open the in-game dev console (`~` or click the bottom-right terminal icon) and verify:
   - Type `steam`: Returns persona name, Steam ID, and account status.
   - Type `steamlog`: Displays timestamps of `steamworks.js` module load and Steam Input action set bindings.
4. Press `Shift+Tab` $\rightarrow$ Confirm the native Steam Community Overlay opens smoothly over the WebGL canvas.

---

### B. Testing Multiplayer Relays & Co-Op
1. **Start the Local Relay Server** (if testing offline / on LAN):
   ```bash
   npm run server:dev
   ```
   *(Or verify the remote backend at `https://steam.tuesdaycinema.club/health`)*
2. In the game main menu:
   - Click **MULTIPLAYER / CO-OP**.
   - Confirm the status pill transitions from `CONNECTING...` $\rightarrow$ `ONLINE [HOST]`.
3. Open a second client instance (or browser window at `http://localhost:5173`):
   - Enter the same Room Code (`SECTOR-7`).
   - Click **CONNECT** $\rightarrow$ Confirm both operatives appear in the squad lobby roster with live ping.
   - Click **DEPLOY EXPEDITION** $\rightarrow$ Confirm simultaneous drop-pod descent into coordinated crash coordinates.

---

### C. Testing Steam Vault & Economy Unboxing
1. Press `[V]` on the keyboard or click **STEAM VAULT**.
2. Confirm the 5 sandbox items are populated in the inventory grid.
3. Click **OPEN CACHE**:
   - Verify the decryption modal opens.
   - Click **DECRYPT WITH KEY** $\rightarrow$ Verify the 3D spinning item reel sequence and item unlock fanfare.
4. Open the **PRE-MISSION ARMORY BENCH**:
   - Verify the newly unlocked skin, charm, and rig module appear in the dropdowns.
   - Click to mount attachments $\rightarrow$ Confirm real-time 3D visual updates on the weapon workbench rack and audio clicks (`sfx_overclock_socket.wav`).

---

### D. Testing Debug Showroom & Museum
1. Open the in-game dev console (`~`).
2. Type `museum` $\rightarrow$ Teleports operative to the continuous hallway museum at `(9000, 9000)` showcasing all 9 asset categories.
3. Type `showroom` $\rightarrow$ Teleports operative to the 4-wall orientation stalls at chunk `(500, 500)` to test angle alignment.
4. Type `tp crash` $\rightarrow$ Returns operative to the standard bunker spawn point.

---

## 2. Handy Dev Console Cheats

| Command | Action |
| :--- | :--- |
| **`steam`** | Inspect Steam connection info and persona snapshot |
| **`steamlog`** | View Steam startup diagnostics and timing log |
| **`museum`** | Open continuous asset gallery corridor |
| **`showroom`** | Open 4-wall orientation showroom stalls |
| **`closemuseum`** | Teardown and clean up museum scene from memory |
| **`tp <crash|showroom|camp|hive|queen>`** | Teleport directly to landmark points of interest |
| **`god`** | Toggle invincible god mode |
| **`heal`** | Fully restore Health and Oxygen |
| **`nuke`** | Clear all hostile cybersnails in active sector |
| **`salvage` / `+$`** | Grant +500 scrap and crafting shells |
| **`unlock_all`** | Unlock all local achievements |
