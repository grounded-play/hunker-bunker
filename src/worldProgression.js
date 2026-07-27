// Ordered world-depth plan. Landmarks share one outward (+Z) expedition
// spine while lateral offsets create readable side branches.
export const WORLD_PROGRESSION_SLOTS = Object.freeze({
    camp: Object.freeze([
        Object.freeze({ distance: 38, lateral: -5, role: 'foothold' }),
        Object.freeze({ distance: 72, lateral: 7, role: 'crossroads' }),
        Object.freeze({ distance: 108, lateral: -4, role: 'last_shelter' })
    ]),
    hive: Object.freeze([
        Object.freeze({ distance: 92, lateral: -18, role: 'branch' }),
        Object.freeze({ distance: 128, lateral: 17, role: 'deep_branch' }),
        Object.freeze({ distance: 146, lateral: -15, role: 'deep_branch' })
    ]),
    mothershipCave: Object.freeze({ distance: 182, lateral: 8, role: 'mothership_cave' }),
    finalCave: Object.freeze({ distance: 224, lateral: -3, role: 'final_cave' })
});

export function getProgressionSlot(kind, index = 0) {
    const slots = WORLD_PROGRESSION_SLOTS[kind];
    if (Array.isArray(slots)) return slots[index % slots.length];
    return slots ?? null;
}

export function progressionWorldTarget(anchor, slot) {
    return {
        x: Math.round((anchor?.x ?? 0) + slot.lateral),
        z: Math.round((anchor?.z ?? 0) + slot.distance)
    };
}

export function getDepthThreatScale(distance) {
    const normalized = Math.max(0, Number(distance) || 0);
    return {
        hp: 1 + Math.min(0.75, normalized / 320),
        speed: 1 + Math.min(0.22, normalized / 900)
    };
}
