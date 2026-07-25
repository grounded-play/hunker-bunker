// Canonical 1280x800 (16:10) logical stage per
// docs/steam-deck-first-display-and-input-spec.md. The whole composition
// scales uniformly inside the host window (aspect-preserving contain);
// leftover host area is matte, never reflow.

export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 800;

// Safe-frame margins in logical pixels: essential HUD/prompts vs
// subtitles/interactive menu text.
export const SAFE_FRAME_HUD = 32;
export const SAFE_FRAME_TEXT = 48;

// Working floor for default body text on the physical Deck display.
export const TEXT_FLOOR_PX = 18;

const IDENTITY = Object.freeze({
    scale: 1,
    stageWidth: STAGE_WIDTH,
    stageHeight: STAGE_HEIGHT,
    offsetX: 0,
    offsetY: 0
});

export function computeStageTransform(hostWidth, hostHeight) {
    const w = Number(hostWidth);
    const h = Number(hostHeight);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        return { ...IDENTITY };
    }

    const scale = Math.min(w / STAGE_WIDTH, h / STAGE_HEIGHT);
    const stageWidth = STAGE_WIDTH * scale;
    const stageHeight = STAGE_HEIGHT * scale;
    return {
        scale,
        stageWidth,
        stageHeight,
        offsetX: (w - stageWidth) / 2,
        offsetY: (h - stageHeight) / 2
    };
}

export function toStagePoint(hostX, hostY, transform = IDENTITY) {
    const scale = transform?.scale || 1;
    const x = (Number(hostX) - (transform?.offsetX ?? 0)) / scale;
    const y = (Number(hostY) - (transform?.offsetY ?? 0)) / scale;
    const inside = x >= 0 && x <= STAGE_WIDTH && y >= 0 && y <= STAGE_HEIGHT;
    return { x, y, inside };
}

export function isInsideSafeFrame(x, y, margin = SAFE_FRAME_HUD) {
    return x >= margin
        && x <= STAGE_WIDTH - margin
        && y >= margin
        && y <= STAGE_HEIGHT - margin;
}
