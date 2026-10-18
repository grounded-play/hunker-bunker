# PC Build UI Defects & Layout Feedback Audit — 2026-10-15

> [!NOTE]
> **Consolidation Notice (2026-10-17):** Defects DEF-01 through DEF-06 analyzed in this audit have been implemented in `style.css` and `src/audio.js`. Physical visual verification across 1080p, 1440p, 4K, and 1280×800 Deck displays is consolidated into the canonical [Sprint 53 Master Verification & Execution Plan (2026-10-17)](sprint-53-master-verification-and-execution-plan-2026-10-17.md#4-hardware-display--pc-ui-visual-verification-matrix).

**Document Status:** Remediation Implemented / Consolidated into Sprint 53 Master Plan  
**Target Environment:** PC Desktop Build (1080p, 1440p, 4K) & Steam Deck Cross-Platform Scaling  
**References:** Playtest capture annotations, [`style.css`](../../style.css), [`index.html`](../../index.html), [`src/audio.js`](../../src/audio.js), [`main.js`](../../main.js)

---

## 1. Executive Summary

A review of the latest PC build surfaced four distinct presentation defects and user experience asks spanning:
1. **System Settings Modal:** Control value text collision and spillover in the 2-column layout (`GAMEPLAY CAMERA` vs `CAMERA DISTANCE`).
2. **Main Menu OST Rotation:** The main menu audio unexpectedly changing tracks rather than retaining the dedicated main menu theme.
3. **Mothership Uplink Briefing (PC Resolution Scaling):** The modal dialog fails to scale to PC monitor aspect ratios (excessive pillarboxing/black borders) and truncates channel status text (`COVERT RADIO COMMS [124.4 MHZ / SCOUT]`).
4. **Armory & Operator Selection Screen (Left Module Layout & Legibility):** The gameplay demonstration container is overly narrow, the "Return to Main Menu" button suffers from severe micro-text illegibility, the left module has uneven vertical spacing, and there is no enforced global minimum font size floor.

This document extracts each issue, identifies the exact codebase sources, and defines the technical remedy.

### Review notes (2026-10-15, before Sprint 53)

- Each cited line was checked against `dev/sprint-52`:
  - DEF-02: the menu calls `setMusicContext('safe_ship')`, and `safe_ship` is the 5-track rotation added by `634c6883`;
  - DEF-03: the panel is capped at `1150px`;
  - DEF-04: the preview is `max-height: 75px` at 16:9;
  - DEF-05: the button clamps to `9.5px`.
- DEF-04 and DEF-05 are on the **Operator Select** screen (`#menu .map-box`, `.hero-select-back-btn`), not the Armory. The Armory has its own `#armory-btn-back`; check it against the same font floor.
- The briefing video behind the Mothership dialogue loads only when the dialogue opens since `56f74c81`. DEF-03's resize should be checked with the video playing.
- Tracked as Sprint 53 items S53-06 to S53-11 in [the Sprint 53 plan](sprint-53-plan-2026-10-15.md).

---

## 2. Issues & Asks Matrix

| ID | Screen / System | User Ask / Defect Description | Impacted Code / Assets | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | System Settings (`#settings-modal`) | **Overrun on camera gameplay select:** `"THIRD-PERSON — SHOULDER"` text spills over and collides with `"CAMERA DISTANCE"` in adjacent column. Settings modal should expand more on PC. | [`style.css:24037-24045`](../../style.css#L24037-L24045), [`index.html:2520`](../../index.html#L2520) | High |
| **DEF-02** | Main Menu Audio / OST | **Music changed on main menu:** Main menu switches to random interstitial/exploration OST tracks instead of staying on the dedicated menu theme. | [`src/audio.js:2116-2123`](../../src/audio.js#L2116-L2123), [`src/audio.js:2459-2467`](../../src/audio.js#L2459-L2467), [`main.js:7680`](../../main.js#L7680) | Medium |
| **DEF-03** | Mothership Uplink Modal (`#mothership-dialogue`) | **Not filling screen & truncating text on PC:** Fixed `1150px` width leaves massive black void on 1080p/1440p; radio comms header frequency badge is cut off at right edge. | [`style.css:8521-8530`](../../style.css#L8521-L8530), [`index.html:3080-3082`](../../index.html#L3080-L3082) | High |
| **DEF-04** | Armory Screen — Left Panel | **Gameplay example window:** Currently a tiny 16:9 slot (max 75px). Needs to be larger and square (1:1). Left panel space needs better vertical filling. | [`style.css:24200-24207`](../../style.css#L24200-L24207), [`style.css:24192-24198`](../../style.css#L24192-L24198) | High |
| **DEF-05** | Armory Screen — Return Button | **Return Main Menu button illegibility:** Button text is washed out, dark, and shrinks to `9.5px`, making it hard to find and read. | [`style.css:24756-24768`](../../style.css#L24756-L24768), [`style.css:22223-22238`](../../style.css#L22223-L22238) | High |
| **DEF-06** | Global Design Standard | **Minimum Font Size Floor:** Requirement that text must never scale smaller than a defined floor (minimum `11px` / `12px`) across the entire game. | [`style.css`](../../style.css) typography variables | Medium |

---

## 3. Detailed Issue Breakdown & Root Cause Analysis

### Issue 1: System Settings — Camera Gameplay Select Overrun & Panel Size

```
┌────────────────────────────────────────────────────────┐
│ SYSTEM SETTINGS                                    [X] │
├────────────────────────────────────────────────────────┤
│ [CAMERA & HUD]                                         │
│                                                        │
│  GAMEPLAY CAMERA             CAMERA DISTANCE           │
│ [THIRD-PERSON — SHOULDER]───►[CLOSE]    <-- OVERRUN!   │
│                                                        │
│  CAMERA FOLLOW               CROSSHAIR COLOR           │
│ [TIGHT]                     [OPEN]                     │
└────────────────────────────────────────────────────────┘
```

- **Visual Evidence:**
  In the top-left capture, under `SYSTEM SETTINGS -> CAMERA & HUD`, the setting dropdown for `GAMEPLAY CAMERA` contains the string `"THIRD-PERSON — SHOULDER"`. The control button overflows its allocated column bounds and collides directly with the `CAMERA DISTANCE` column on the right.
- **Root Cause:**
  1. `.settings-modal-content > .settings-category-group:not(.hidden)` specifies `grid-template-columns: repeat(2, minmax(0, 1fr))`.
  2. The individual `.setting-item` uses flex layout with a fixed or unbounded select element without `min-width: 0`, causing long option labels to burst past the 50% grid column boundary.
  3. The `.settings-modal-panel` is constrained to `width: calc(100% - 24px) !important; max-width: 1680px;`, but on typical desktop viewports padding and gaps leave inadequate breathing room for dual-column long-name dropdown options.
- **Remediation:**
  - Increase the responsive desktop expansion of `.settings-modal-panel` so settings fill the screen comfortably.
  - Apply `min-width: 0`, `overflow: hidden`, and `text-overflow: ellipsis` on option selectors.
  - Adjust the column balance or allow responsive flex wrapping within `.setting-item` so value selectors never invade adjacent columns.

---

### Issue 2: Main Menu — Unexpected OST Track Mutation

- **User Ask:**
  *"Music changed on the main menu in the PC run, why, it should just be the menu music?"*
- **Root Cause:**
  1. In [`src/audio.js`](../../src/audio.js#L2459-L2467), `startMenuMusic()` invokes:
     ```javascript
     this.setMusicTension('safe');
     this.setMusicContext('safe_ship');
     ```
  2. Under `MUSIC_CONTEXT_PLAYLISTS.safe_ship` ([`src/audio.js:2117-2123`](../../src/audio.js#L2117-L2123)), `safe_ship` is registered as a rotating 5-song playlist:
     ```javascript
     safe_ship: Object.freeze([
         'music_safe_ship',
         'music_interstitial_01', // Someone Is Still Alive
         'music_interstitial_09', // Mothership Customer Support
         'music_interstitial_34', // Four Seats, One Survivor
         'music_interstitial_36'  // We Escaped Together, Technically
     ])
     ```
  3. `advancePlaylistIndex('safe_ship')` triggers after atmospheric breathing cycles or re-entry, causing the music system to pick Interstitial 01 or 09 rather than the iconic bunker theme.
  4. In [`main.js:7680-7682`](../../main.js#L7680-L7682), an active polling interval executes `updateMusicTension()` every second once unlocked, resetting or advancing tracks while idling on the menu.
- **Remediation:**
  - Establish a dedicated `menu` music context in `AudioManager` that binds exclusively to `mainbg_music` / `music_safe_ship` without playlist rotation.
  - Guard `startMenuMusic()` against playlist cycling so the main menu consistently plays only the dedicated theme music.

---

### Issue 3: Mothership Uplink Modal — PC Screen Fill & Text Truncation

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ MOTHERSHIP UPLINK CHANNEL 7   COVERT RADIO COMMS [124.4 MHZ..│<--CLIPPED
│   │ ──────────────────────────────────────────────────────────── │     │
│   │ [PORTRAIT] > CONFIRM READINESS, OPERATOR.                    │     │
│   │                                                              │     │
│   │ [A] UNDERSTOOD. MOVING OUT.    [B] RUN ME THROUGH PROTOCOLS  │     │
│   │     SKIP TUTORIAL                  START TUTORIAL            │     │
│   └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│                  (Excessive black empty space on PC)                   │
└────────────────────────────────────────────────────────────────────────┘
```

- **Visual Evidence:**
  1. On desktop PC viewports, the modal dialog (`.mothership-dialogue-panel`) is rendered as a relatively small box centered within a vast field of black screen.
  2. The top status/frequency text (`SCOUT LINK [ENCRYPTED]` / `COVERT RADIO COMMS [124.4 MHZ / SCOUT]`) in `.terminal-class-badge` and header elements clips against the right edge because the panel width is capped at `1150px`.
  3. Inside the transmission dialog, text blocks are squeezed and the briefing backdrop video does not achieve cinematic desktop immersion.
- **Root Cause:**
  - [`style.css:8521-8524`](../../style.css#L8521-L8524):
    ```css
    .mothership-dialogue-panel {
      width: min(calc(var(--vu) * 140), 94vw, 1150px);
      min-height: min(calc(var(--vu) * 88), 84vh, 700px);
      max-height: 94vh;
      ...
    }
    ```
  - Capping `width` at `1150px` was tailored for 1280×800 handheld displays. On 1920×1080 and 2560×1440 desktop screens, `1150px` represents only ~60% of viewport width, causing severe letterboxing/pillarboxing while forcing transmission strings into clipped containers.
- **Remediation:**
  - For desktop viewports (`@media (min-width: 1200px)`), increase max-width to `min(92vw, 1580px)` and scale the dialogue viewport so it fills the screen with proper cinematic presence.
  - Set `white-space: nowrap`, `flex-shrink: 0`, and give `.terminal-header` proper padding and flex distribution so radio frequency badges never get truncated.

---

### Issue 4: Armory / Operator Select — Gameplay Window, Back Button & Minimum Font Floor

- **Visual Evidence & User Asks:**
  1. *"Make the gameplay exampel window bigger and square"*: The `#game-container` in Module 1 (`.map-box`) is constrained to a thin 16:9 rectangle with a maximum height of 75px.
  2. *"Make the return main menu button more legible, it's hard to see"*: The back button (`.hero-select-back-btn`) is buried at the bottom with dark muted styling and diminutive text.
  3. *"There should be a smallest text gets and never text get's smaller than that"*: Enforce an unbreakable global minimum font size floor (e.g., `11px` / `12px`).
  4. *"Make the Display selection not cropped and fill the space better moving it up and also fill the first left panel better"*: The left column layout (`.map-box`) suffers from awkward spacing and vertical under-utilization.
- **Root Cause:**
  - **Gameplay Window Size:**
    [`style.css:24200-24207`](../../style.css#L24200-L24207):
    ```css
    #menu .map-box #game-container {
      flex: 0 0 auto;
      width: 100%;
      height: calc(var(--vu) * 7.2);
      min-height: 50px;
      max-height: 75px;
      aspect-ratio: 16 / 9;
    }
    ```
    This restricts the preview to a tiny horizontal sliver rather than a square aspect ratio (`1 / 1`).
  - **Back Button Illegibility:**
    [`style.css:24756-24768`](../../style.css#L24756-L24768):
    ```css
    #menu .hero-select-back-btn {
      flex: 0 0 auto;
      width: 100%;
      margin-top: calc(var(--vu) * 0.1);
      min-height: 28px;
      padding: calc(var(--vu) * 0.3) calc(var(--vu) * 0.5);
      font-size: clamp(9.5px, calc(var(--vu) * 1.05), 12px);
      font-weight: 800;
      ...
    }
    ```
    The font size clamps down to `9.5px`, text color is `--text-muted`, and background is murky dark gray (`rgba(7, 13, 21, 0.82)`), rendering it virtually invisible.
  - **Absence of Minimum Font Size Floor:**
    Multiple micro-labels use raw `calc(var(--vu) * ...)` or `clamp(8px, ...)` without a safe minimum bound, degrading readability on high-DPI displays.
  - **Left Panel Spacing:**
    `.map-box` uses `justify-content: space-between` with very little gap control, creating large awkward gaps between telemetry and command buttons while squeezing the preview box.

---

## 4. Technical Remediation Plan

### Phase 1: Global Font Floor & Typography Rule
- Update base typography variables in `style.css`:
  ```css
  :root {
    --font-floor-min: 11px;
    --font-floor-btn: 12px;
  }
  ```
- Audit and adjust all `clamp()` rules so the minimum boundary never drops below `var(--font-floor-min)` (or `12px` for interactive buttons).

### Phase 2: System Settings Layout Overrun (DEF-01)
- In `style.css`:
  - Broaden `.modal-content.settings-modal-panel` on PC screens up to `min(94vw, 1720px)`.
  - Update `.settings-modal-content .setting-item`:
    - Ensure `min-width: 0` on children.
    - Add flex wrapping or intelligent grid distribution so the control label and the select dropdown do not overflow adjacent columns.
    - Set `white-space: nowrap` and `text-overflow: ellipsis` on button text inside setting selectors.

### Phase 3: Main Menu OST Dedication (DEF-02)
- In `src/audio.js`:
  - Add a dedicated non-cycling context:
    ```javascript
    MUSIC_CONTEXT_PLAYLISTS: Object.freeze({
      menu: Object.freeze(['mainbg_music']),
      ...
    })
    ```
  - In `startMenuMusic()`, set context explicitly to `'menu'` (or bypass playlist advancement for `'safe_ship'` when on the title/main menu).

### Phase 4: Mothership Uplink Screen Fill & Header Text (DEF-03)
- In `style.css`:
  - Increase `.mothership-dialogue-panel` desktop dimensions:
    ```css
    @media (min-width: 1024px) {
      .mothership-dialogue-panel {
        width: min(calc(var(--vu) * 160), 92vw, 1600px);
        min-height: min(calc(var(--vu) * 92), 88vh, 850px);
      }
    }
    ```
  - Ensure `.terminal-header` uses `flex-wrap: wrap` or proper `gap` so `.terminal-class-badge` and frequency indicators never clip or truncate.

### Phase 5: Armory Left Module & Back Button (DEF-04 & DEF-05)
- In `style.css`:
  - Change `#menu .map-box #game-container`:
    - Set `aspect-ratio: 1 / 1`.
    - Increase `height: auto` and scale `width: clamp(100px, calc(var(--vu) * 14), 160px)`.
  - Restructure `#menu .map-box`:
    - Group preview and telemetry with consistent top-aligned spacing (`gap: calc(var(--vu) * 0.8)`).
  - Redesign `#menu .hero-select-back-btn`:
    - Set `min-height: 38px`.
    - Set font size to `clamp(12px, calc(var(--vu) * 1.35), 14px)`.
    - Increase contrast: brighter border (`rgba(255, 159, 28, 0.4)`), solid text color (`#e2e8f0`), and clear hover/focus illumination.

---

## 5. Verification Checklist

- [x] **Settings Modal Test:** Implemented in S53-06 (commit `4faf9b31`); visual verification consolidated into [Sprint 53 Master Verification Plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md#4-pc-ui-readability--visual-verification).
- [x] **Main Menu Music Test:** Implemented in S53-07 (`src/audio.js` dedicated menu playlist, guarded by `src/audio.roomTone.test.js`); verification consolidated into [Sprint 53 Master Verification Plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md#4-pc-ui-readability--visual-verification).
- [x] **Mothership Uplink Test:** Implemented in S53-08 (`style.css` wide-screen scaling rule); verification consolidated into [Sprint 53 Master Verification Plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md#4-pc-ui-readability--visual-verification).
- [x] **Armory Preview & Back Button Test:** Implemented in S53-09, S53-10, S53-11 (`style.css` square aspect ratio, 38px min-height back button, 11px/12px font floor tokens); verification consolidated into [Sprint 53 Master Verification Plan](sprint-53-master-verification-and-execution-plan-2026-10-17.md#4-pc-ui-readability--visual-verification).
