const DEFAULT_MIN_PIXEL_RATIO = 0.65;

/**
 * Cap the total framebuffer area as well as DPR. Packaged Electron runs
 * fullscreen, so a DPR-only cap can still turn a 4K display into a framebuffer
 * several times larger than the window used by the browser dev server.
 */
export function cappedPixelRatio({
    width,
    height,
    devicePixelRatio = 1,
    maxPixelRatio = 1.5,
    maxFramebufferPixels = 5_000_000,
    minPixelRatio = DEFAULT_MIN_PIXEL_RATIO
}) {
    const cssPixels = Math.max(1, Number(width) || 1) * Math.max(1, Number(height) || 1);
    const dpr = Math.max(0.1, Number(devicePixelRatio) || 1);
    const ratioForBudget = Math.sqrt(Math.max(1, maxFramebufferPixels) / cssPixels);
    return Math.max(
        minPixelRatio,
        Math.min(dpr, maxPixelRatio, ratioForBudget)
    );
}
