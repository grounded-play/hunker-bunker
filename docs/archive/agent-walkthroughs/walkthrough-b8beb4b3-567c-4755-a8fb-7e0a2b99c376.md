# Walkthrough - Symmetric Door Customization & Dynamic Cycling

We have successfully generated 5 new symmetric bunker door assets matching the dark sci-fi aesthetic of the original door. We then implemented dynamic background cycling in CSS and JS to cycle through the doors sequentially whenever transition animations occur (level loading and character selection swaps).

## Generated Door Assets

Here is a carousel showing the 5 newly designed doors, each crafted with perfect center-line symmetry matching the original:

```carousel
![Biohazard Acid Green Glow](/home/caveman/.gemini/antigravity-ide/brain/b8beb4b3-567c-4755-a8fb-7e0a2b99c376/door_bio_1780442017257.png)
<!-- slide -->
![Cryo Frosted Blue Glow](/home/caveman/.gemini/antigravity-ide/brain/b8beb4b3-567c-4755-a8fb-7e0a2b99c376/door_cryo_1780442030373.png)
<!-- slide -->
![Industrial Rust Red Glow](/home/caveman/.gemini/antigravity-ide/brain/b8beb4b3-567c-4755-a8fb-7e0a2b99c376/door_rust_1780442045395.png)
<!-- slide -->
![Alien Obsidian Purple Glow](/home/caveman/.gemini/antigravity-ide/brain/b8beb4b3-567c-4755-a8fb-7e0a2b99c376/door_alien_1780442059427.png)
<!-- slide -->
![Nuclear Titanium Yellow Glow](/home/caveman/.gemini/antigravity-ide/brain/b8beb4b3-567c-4755-a8fb-7e0a2b99c376/door_nuclear_1780442072033.png)
```

## Changes Made

### Assets
- Copied the generated images to the public folder as:
  - [door_bio.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/door_bio.png)
  - [door_cryo.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/door_cryo.png)
  - [door_rust.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/door_rust.png)
  - [door_alien.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/door_alien.png)
  - [door_nuclear.png](file:///home/caveman/Desktop/icecave/hunker-bunker/public/door_nuclear.png)

### Styles
- Modified [style.css](file:///home/caveman/Desktop/icecave/hunker-bunker/style.css) to support dynamic background images using a CSS custom property:
  - `.door`: updated `background-image` to `var(--door-bg-image, url('/door.webp'))`
  - `.char-preview-door__panel`: updated `background-image` to `var(--door-bg-image, url('/door.webp'))`

### JavaScript Logic
- Modified [main.js](file:///home/caveman/Desktop/icecave/hunker-bunker/main.js):
  - Added a global `DOOR_IMAGES` array and a `getNextDoorImage()` helper.
  - In `triggerDoorTransition()`, we call `getNextDoorImage()` and update `#transition-overlay`'s `--door-bg-image` property.
  - In `triggerHeroPreviewSwap()`, we call `getNextDoorImage()` and update `#char-preview-door`'s `--door-bg-image` property.

## Verification & Testing

### Automated Tests
- Ran `npm test -- --run`. All **66 unit tests** passed successfully without any regressions.

### Manual Verification
- Re-launched the Vite development server (`npm run dev`) successfully.
- Verified that switching between characters cycles the character-preview doors.
- Verified that starting a level cycles the full transition overlay doors.
