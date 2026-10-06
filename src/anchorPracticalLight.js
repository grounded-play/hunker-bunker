/**
 * Key-art practical light on a room's signature anchor (lived-in world M4,
 * docs/planning/sprint-49-lived-in-world-continuation.md).
 *
 * The key art lights the functional anchor, not the room: cryogenic cyan on
 * racks and coolant, liturgical amber on lecterns and shrines, bioluminescent
 * green on biomech growth. None of the anchor GLBs ship an emissive map yet
 * (audit 2026-10-04), so the light is a single pooled source: it is registered
 * with ThreeGame's environment light pool (ENV_LIGHT_BUDGET), which keeps the
 * number of lit point lights constant and lights only the nearest sources, so
 * this adds no shader variants and no extra per-pixel lights.
 */
export const ANCHOR_LIGHT_PALETTE = Object.freeze({
    cyan: Object.freeze({ color: 0x5fe3ff, intensity: 1.6, distance: 4.5, decay: 2 }),
    amber: Object.freeze({ color: 0xffa648, intensity: 1.7, distance: 4.5, decay: 2 }),
    green: Object.freeze({ color: 0x7dff6a, intensity: 1.4, distance: 4.0, decay: 2 })
});

// First match wins; cyan before green so a "biomech oxygen" piece reads cold.
const PALETTE_RULES = Object.freeze([
    { palette: 'cyan', match: /oxygen|coolant|cryo|o2_|frost|icey|thermal/ },
    { palette: 'amber', match: /lectern|votive|shrine|reliquary|saint|liturgical|candle/ },
    { palette: 'green', match: /biomech|spore|fungal|hive|flesh|umbilical|alien|incubator|mycelium/ }
]);

/** Palette name for an anchor prop type, or null when it carries no practical. */
export function anchorPaletteFor(type) {
    const name = String(type ?? '');
    return PALETTE_RULES.find((rule) => rule.match.test(name))?.palette ?? null;
}

/** The light spec for an anchor type, or null. */
export function anchorLightFor(type) {
    const palette = anchorPaletteFor(type);
    return palette ? { palette, ...ANCHOR_LIGHT_PALETTE[palette] } : null;
}

/**
 * The one placement in a room plan that gets the practical light: its
 * signature anchor, when that anchor has a palette. Never more than one per room.
 */
export function roomPracticalLightPlacement(placements = []) {
    const signature = placements.find((placement) => placement?.kind === 'signature');
    const light = signature ? anchorLightFor(signature.type) : null;
    return light ? { placementId: signature.id, light } : null;
}
