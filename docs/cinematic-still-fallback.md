# Cinematic Still Fallback

Hunker Bunker cinematic beats now follow this presentation order:

1. Play the authored WebM or MP4 when available.
2. If video is absent or unplayable, show one or two authored images.
3. Crossfade first frame to last frame when both exist.
4. Hold cinematic title/body copy over the image treatment.
5. Continue automatically or on player input.

The death and major-event still sequences also ship as real 1280×800 VP8 WebM
files under `public/cutscenes`. Each uses a slow pan and 7.5% push-in; paired
images crossfade at the midpoint. Rebuild them from the current artwork with:

```bash
npm run cinematics:stills
```

The renderer uses ImageMagick plus ffmpeg. Set `HB_FFMPEG` when ffmpeg is not
available on `PATH`. The browser still-image treatment remains the fail-safe if
a generated file is removed or cannot be decoded.

## Wired beats

- Player deaths: oxygen, abyss, Queen, ship destruction, biohazard, combat,
  mission abort, and generic hazard.
- First foundry discovery.
- First black-box recovery in a session.
- First Queen encounter in a session.
- All Act 2 endings when their ending video is missing.

## Authoring a new event

Dispatch a `cinematic-event` with an optional video basename and fallback:

```js
window.dispatchEvent(new CustomEvent('cinematic-event', {
    detail: {
        videoBase: 'my-event',
        fallback: {
            id: 'my-event',
            kicker: 'SECTOR B-4 // EVENT',
            title: 'THE LIGHTS ANSWER',
            body: 'Something on the other side noticed the reroute.',
            images: ['/event-first.png', '/event-last.png'],
            durationMs: 3800,
            frameMs: 1700,
            tone: 'event'
        }
    }
}));
```

Use one image for a held tableau. Use two only when the first/last change adds
meaning. Event images are contained inside the canonical stage, so square
illustrations remain uncropped.

## Content rules

- Keep the title short enough to read once on Steam Deck.
- Body copy should be one or two sentences.
- Do not repeat routine pickups or combat events.
- Reserve cutaways for death, irreversible choices, first discoveries, major
  state changes, bosses, and endings.
- A missing asset must never stall gameplay.
- All overlays must remain skippable unless the authored event specifically
  requires a fixed hold.
