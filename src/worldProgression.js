import { getMazeLandmark } from './mazeExpedition.js';

// Ordered world-depth plan. Landmarks share one outward (+Z) expedition
// spine while lateral offsets create readable side branches.
function slotFor(id, role) {
    const landmark = getMazeLandmark(id);
    return Object.freeze({
        distance: landmark.depth,
        lateral: landmark.lateral,
        level: landmark.level,
        landmarkId: id,
        role
    });
}

export const WORLD_PROGRESSION_SLOTS = Object.freeze({
    camp: Object.freeze([
        slotFor('camp_meridian', 'foothold'),
        slotFor('camp_tallow', 'crossroads'),
        slotFor('camp_vesper', 'last_shelter')
    ]),
    hive: Object.freeze([
        slotFor('hive_suture', 'branch'),
        slotFor('hive_relay', 'deep_branch'),
        slotFor('hive_carapace', 'deep_branch')
    ]),
    mothershipCave: slotFor('final_shelter', 'mothership_cave'),
    finalCave: slotFor('queen_chamber', 'final_cave')
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
