# Diegetic Terminal Interactivity & Secret Mechanics Plan

## 1. Overview & Vision
Transform the 2D terminal bezel overlays from passive frames into **fully reactive, tactile, diegetic physical consoles**. Every button, screw, coin slot, and dial will respond with sound, physics, and mechanical animation. Players can interact with secondary elements, type codes into keypads, jiggle coin returns for spare change, and unscrew the chassis bolts to reveal a secret maintenance bay with toggleable DIP switches, overclock fuses, and hidden Meridian whistleblower lore.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [⬡ Screw TL]      MERIDIAN AUTO-MART // VENDING & FAB       [⬡ Screw TR]    │
│  ┌─────────────────────────────────────────────────────────┐  ┌──────────┐  │
│  │ CRT GLASS APERTURE                                      │  │ CARD     │  │
│  │ • Phosphor text bloom & scanline raster                 │  │ SWIPE    │  │
│  │ • Curved glass glare & CRT vignette                     │  │ [SWIPE]  │  │
│  │ • 3D tactile recipe & aisle buttons with physical drop  │  └──────────┘  │
│  │                                                         │  ┌──────────┐  │
│  │                                                         │  │ COIN     │  │
│  │                                                         │  │ RETURN   │  │
│  │                                                         │  │ [JIGGLE] │  │
│  └─────────────────────────────────────────────────────────┘  └──────────┘  │
│                                                                             │
│  [STATUS LEDS]    [KEYPAD 0-9, CLR, ENT]    [ANALOG GAUGE]    [SECRET HATCH]│
│  • Flickers       • Beeps & types on aux    • Needle wiggles  • Opens when  │
│  • Diagnostic     • Secret PIN codes        • Glass tap click   screws out  │
│ [⬡ Screw BL]                                                [⬡ Screw BR]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Interactive Systems

### A. Subtle CRT Screen & Glass Effects
- **Phosphor Persistence & Bloom:** High-contrast text glows with subtle multi-layer drop shadows (`0 0 6px currentColor, 0 0 16px rgba(0, 229, 255, 0.35)`).
- **Aperture Scanline Raster:** Micro-scanline mask placed specifically across the screen cutout (not the metal chassis):
  ```css
  .crt-screen-raster {
    background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.22) 0 1px, transparent 1px 2px);
    pointer-events: none;
  }
  ```
- **Curved Glass Vignette & Specular Glare:** Radial edge drop-off and faint diagonal gloss reflection across the monitor glass simulating a 1980s curved vacuum tube.
- **Faint CRT Thermal Breathing / Jitter:** Microscopic subtle chromatic flicker ($0.1\%$ amplitude) when high-power actions occur (e.g. rolling the lotto-print lever or building heavy structures).

---

### B. Tactile 3D Buttons & Key Switches
- **Physical Keyswitch Travel:** All interactive buttons (Aisle selectors `[1]`, `[2]`, `[3]`, `[4]`, recipe build cards, keypad buttons, and modal close) receive authentic physical travel:
  - **Resting:** `box-shadow: 0 5px 0 #0d1419, 0 8px 16px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.2)`.
  - **Hover:** Border illumination, cursor beacon highlight, subtle `ui_hover` sound with pitch variance.
  - **Active / Pressed:** `transform: translateY(3px)`, shadow compresses to `0 2px 0 #0d1419`, playing crisp relay click (`ui_click` / `ui_click_confirm1`).

---

### C. Reactive Bezel Elements (Even if "Nothing Happens")
1. **12-Key Numeric Keypad:**
   - Keys `[0]–[9]`, `[*]`, `[#]`, `[CLEAR]`, `[ENTER]`.
   - Clicking a key plays a DTMF dual-tone / electronic chirp (via Web Audio synthesizer) and flashes an auxiliary LED display (`#terminal-aux-display`).
   - Entering secret codes (e.g., `1984`, `0451`, `8008`, `7734`, `0000`, `9999`) triggers hidden feedback:
     - `0451`: "OVERRIDE ACCEPTED: MERIDIAN EMPLOYEE COMPONENT STASH DISPENSED" (+50 Coins).
     - `1984`: "MINISTRY OF TRUTH ONLINE: COIN VALUE SET TO DOUBLE TODAY".
     - `7734`: "HELLO DOWN THERE: SYNTH BEAT EASTER EGG PLAYS".
2. **Coin Return Lever & Rejection Cup:**
   - Clicking the coin return causes the lever to depress with a heavy spring clank.
   - Jiggling the coin cup has a $15\%$ chance to produce a loose coin sound and grant $+1$ to $+3$ Coins ("VENDING TRAY COIN FOUND").
3. **Card Reader / Barcode Slot:**
   - Clicking or dragging across the swipe slot plays a motorized card reader buzz, displaying `CARD READ ERROR: DEMO BADGE DETECTED`.
4. **Analog Pressure Gauge:**
   - Clicking the circular dial causes the needle to vibrate and plays an audible glass "tap" sound (`shell_drop_wood` pitch-shifted).
5. **Diagnostic Status LEDs:**
   - Clicking status lamps causes them to rapid-flicker and reset cycle.

---

### D. Secret Maintenance Hatch & Hex Screw Puzzle
- **4 Corner Hex Screws:** Located at top-left, top-right, bottom-left, and bottom-right of the bezel.
- **Unscrewing Mechanic:**
  - Clicking a screw rotates it $90^\circ$ with a metallic ratchet sound (`door_gears_spin`).
  - After 3 clicks, the screw loosens and springs outward.
  - Unscrewing them in a specific sequence (e.g., **Top-Left $\rightarrow$ Bottom-Right $\rightarrow$ Top-Right $\rightarrow$ Bottom-Left**) unlocks the hatch immediately without jamming.
- **The Secret Maintenance Hatch:**
  - When all 4 bolts are free, the bottom maintenance plate drops open with a mechanical clatter (`door_slam_vertical`).
  - **Inside the Hatch:**
    1. **4 Toggleable DIP Switches:**
       - **DIP 1 (CRT OVERCLOCK):** Intensifies phosphor glow and scanline brightness.
       - **DIP 2 (INVERT PALETTE):** Flips CRT amber/cyan to retro green phosphors.
       - **DIP 3 (AUDIO SYNTH BASS):** Adds low-end 808 sub bass to UI clicks.
       - **DIP 4 (FREE PLAY):** Cosmetic joke switch that displays "NICE TRY, EMPLOYEE #402".
    2. **Blown Capacitor / Overclock Fuse:**
       - Clicking the fuse sparks and rewards $+10$ Tech salvage components once per run.
    3. **Whistleblower Micro-Cassette:**
       - Clicking the cassette tape plays an audio log from an engineer who sabotaged the mothership extraction protocol.

---

## 3. Implementation Steps

### Phase 1: CRT Glass & 3D Tactile Styling
1. Add `.crt-screen-raster` scanlines and `.crt-glass-glare` to `.fab-modal-content`, `.console-terminal-content`, and `#arcade-blackjack-overlay`.
2. Upgrade `.fab-aisle-btn`, `.fab-card`, `.fab-roll-btn`, and keypad buttons with 3D mechanical bevels, active translation, and phosphor glow.

### Phase 2: Interactive Bezel Hotspot Overlay
1. Construct an SVG / CSS hotspot layer positioned directly over the bezel's physical controls (keypad, coin return, card slot, pressure gauge).
2. Wire clicks to `AudioManager.play()` with pitch-shifted relay beeps and tactile mechanical feedback.
3. Add auxiliary 7-segment / CRT text display for keypad input and PIN code verification.

### Phase 3: Corner Hex Screws & Secret Maintenance Hatch
1. Add 4 interactive hex bolt elements (`.bezel-hex-screw`) with rotational CSS state (`data-turns="0"..."3"`).
2. Add drop-down maintenance door element (`#bezel-maintenance-hatch`) behind the lower plate.
3. Implement DIP switch toggles (CRT overclock, green phosphor mode, sub-bass clicks) and the secret capacitor salvage reward.

---

## 4. Verification & Contracts
- Ensure all clicks on decorative bezel hotspots do not block or interfere with core game actions (`#fab-roll-btn`, `#fab-activate-btn`, recipe grid buttons).
- Verify all unit and E2E tests pass (`src/fabricationBay.test.js`, `src/crashSiteBuild.test.js`, `src/blackjackPerks.test.js`).
- Ensure all interactive elements remain accessible via keyboard shortcuts (`1-4`, Arrow keys, `ESC`).
