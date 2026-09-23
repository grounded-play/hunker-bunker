// Weapon-local charm attachment contract. Sockets are keyed by weapon
// archetype, never by charm, so a charm cannot hide a bad weapon transform.

const SOCKETS = Object.freeze({
    gg1: Object.freeze({ position: Object.freeze([0.18, -0.05, 0.06]), rotation: Object.freeze([0, 0, 0]), scale: 1, anchor: 'receiver-underbarrel', cordDrop: 0.045 }),
    talon: Object.freeze({ position: Object.freeze([0.15, -0.06, 0.055]), rotation: Object.freeze([0, 0, 0]), scale: 0.96, anchor: 'receiver-underbarrel', cordDrop: 0.04 }),
    talon_c: Object.freeze({ position: Object.freeze([0.19, -0.07, 0.07]), rotation: Object.freeze([0, 0, 0]), scale: 1.02, anchor: 'receiver-underbarrel', cordDrop: 0.045 }),
    siege_breaker: Object.freeze({ position: Object.freeze([0.22, -0.11, 0.10]), rotation: Object.freeze([0, 0, 0]), scale: 1.05, anchor: 'lower-receiver-loop', cordDrop: 0.055 }),
    tesla_lock: Object.freeze({ position: Object.freeze([0.17, -0.075, 0.075]), rotation: Object.freeze([0, 0, 0]), scale: 1.0, anchor: 'power-cell-rail', cordDrop: 0.045 })
});

const FALLBACK_ARCHETYPE = 'gg1';

export function normalizeCharmSocketArchetype(archetypeId) {
    const value = String(archetypeId || '').trim().toLowerCase();
    return SOCKETS[value] ? value : FALLBACK_ARCHETYPE;
}

export function getCharmSocketTransform(archetypeId) {
    const archetype = normalizeCharmSocketArchetype(archetypeId);
    const socket = SOCKETS[archetype];
    return {
        archetype,
        position: [...socket.position],
        rotation: [...socket.rotation],
        scale: socket.scale,
        anchor: socket.anchor,
        cordDrop: socket.cordDrop ?? 0.045,
        usedFallback: archetype !== String(archetypeId || '').trim().toLowerCase()
    };
}

export function getCharmSocketRegistry() {
    return Object.fromEntries(Object.keys(SOCKETS).map((key) => [key, getCharmSocketTransform(key)]));
}

export { SOCKETS };

/**
 * The charm's own model-local offset, derived from its geometry.
 *
 * Charms were all shifted by the same hardcoded `(0, -0.05, 0)`. A blanket
 * constant is the same mistake as the single shared weapon socket it replaced:
 * it is not normalization, it is one charm's correction applied to ten. A charm
 * hangs from its top edge, centred on the socket, so a tall charm drops further
 * than a squat one -- which is what makes it read as attached rather than
 * intersecting.
 */
export function resolveCharmModelOffset(bounds) {
    const min = bounds?.min;
    const max = bounds?.max;
    if (!min || !max) return [0, 0, 0];
    const centreX = (min.x + max.x) / 2;
    const centreZ = (min.z + max.z) / 2;
    return [-centreX, -max.y, -centreZ];
}

/**
 * A closed, authored hanging loop in socket-local coordinates. The weapon
 * anchor owns this path; the charm is mounted at its lowest point instead of
 * scaling a straight cylinder as part of the charm mesh.
 */
export function getCharmCordLoopPoints(cordDrop = 0.045, loopWidth = null) {
    const drop = Math.max(0.02, Number(cordDrop) || 0.045);
    const width = Math.max(0.006, Number(loopWidth) || drop * 0.24);
    return [
        [-width, 0, 0],
        [-width * 1.15, -drop * 0.48, 0.002],
        [0, -drop, 0.004],
        [width * 1.15, -drop * 0.48, -0.002],
        [width, 0, 0],
        [0, -drop * 0.12, 0.003]
    ];
}
