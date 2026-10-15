const WALKABLE = new Set(['.', 'D', 'R', 'B', 'L']);

const LIGHTING_RHYTHMS = Object.freeze({
    even: Object.freeze({ color: 0x71cddf, signals: 2 }),
    pulsing: Object.freeze({ color: 0xffa23a, signals: 2 }),
    dim: Object.freeze({ color: 0x3d8290, signals: 1 }),
    sparse: Object.freeze({ color: 0x8ab9d2, signals: 1 }),
    warning: Object.freeze({ color: 0xff493d, signals: 3 }),
    warm: Object.freeze({ color: 0xffc166, signals: 2 })
});

const DRESSING_KITS = Object.freeze({
    bunker_utility: Object.freeze({ structure: 'frame', cables: 1, floorGuides: 1 }),
    airlock_threshold: Object.freeze({ structure: 'double-frame', cables: 0, floorGuides: 2 }),
    pipes_and_cable_trays: Object.freeze({ structure: 'service-rib', cables: 2, floorGuides: 1 }),
    canyon_railing: Object.freeze({ structure: 'rail', cables: 0, floorGuides: 1 }),
    barricade_staging: Object.freeze({ structure: 'braced-frame', cables: 0, floorGuides: 2 }),
    camp_signage: Object.freeze({ structure: 'camp-arch', cables: 1, floorGuides: 1 }),
    maintenance_hatch: Object.freeze({ structure: 'low-rib', cables: 2, floorGuides: 1 }),
    gate_staging: Object.freeze({ structure: 'monumental-arch', cables: 0, floorGuides: 3 }),
    biome_transition: Object.freeze({ structure: 'transition-arch', cables: 1, floorGuides: 2 }),
    hive_warning: Object.freeze({ structure: 'organic-arch', cables: 0, floorGuides: 2 })
});

function isWalkable(grid, x, y) {
    return WALKABLE.has(grid?.[y]?.[x]);
}

function reach(grid, x, y, dx, dy, limit = 5) {
    let distance = 0;
    for (let step = 1; step <= limit; step += 1) {
        if (!isWalkable(grid, x + dx * step, y + dy * step)) break;
        distance = step;
    }
    return distance;
}

/** Resolve the corridor's long axis and open width around a route marker. */
export function hallwayMarkerGeometry(grid, marker) {
    const x = marker?.x;
    const y = marker?.y;
    if (!Number.isInteger(x) || !Number.isInteger(y) || !isWalkable(grid, x, y)) return null;
    const xReach = reach(grid, x, y, -1, 0) + reach(grid, x, y, 1, 0);
    const zReach = reach(grid, x, y, 0, -1) + reach(grid, x, y, 0, 1);
    const axis = xReach > zReach ? 'x' : 'z';
    const negativeWidth = axis === 'x' ? reach(grid, x, y, 0, -1, 3) : reach(grid, x, y, -1, 0, 3);
    const positiveWidth = axis === 'x' ? reach(grid, x, y, 0, 1, 3) : reach(grid, x, y, 1, 0, 3);
    return {
        axis,
        rotationY: axis === 'x' ? Math.PI / 2 : 0,
        width: Math.min(5, 1 + negativeWidth + positiveWidth)
    };
}

/**
 * Turn generator-authored wayfinding metadata into navigation-safe dressing.
 * No random source is needed: route markers and their catalog choices are
 * already deterministic for a deployment seed.
 */
export function planHallwayRouteDressing(metadata, grid) {
    const plans = [];
    for (const marker of metadata?.wayfindingMarkers ?? []) {
        const geometry = hallwayMarkerGeometry(grid, marker);
        if (!geometry) continue;
        const kit = DRESSING_KITS[marker.dressingKit] ?? DRESSING_KITS.bunker_utility;
        const rhythm = LIGHTING_RHYTHMS[marker.lightingRhythm] ?? LIGHTING_RHYTHMS.even;
        plans.push({
            x: marker.x,
            z: marker.y,
            dressingKit: marker.dressingKit ?? 'bunker_utility',
            lightingRhythm: marker.lightingRhythm ?? 'even',
            structure: kit.structure,
            cableCount: kit.cables,
            floorGuideCount: kit.floorGuides ?? 0,
            signalCount: rhythm.signals,
            signalColor: rhythm.color,
            landmark: Boolean(marker.landmark),
            cadence: Number.isInteger(marker.cadence) ? marker.cadence : 0,
            archetypeId: marker.archetypeId ?? null,
            ...geometry
        });
    }
    return plans;
}
