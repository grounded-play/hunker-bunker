// Weapon-local charm attachment contract. Sockets are keyed by weapon
// archetype, never by charm, so a charm cannot hide a bad weapon transform.

const SOCKETS = Object.freeze({
    gg1: Object.freeze({ position: Object.freeze([0.18, -0.05, 0.06]), rotation: Object.freeze([0, 0, 0]), scale: 1, anchor: 'receiver-underbarrel' }),
    talon: Object.freeze({ position: Object.freeze([0.15, -0.045, 0.055]), rotation: Object.freeze([0, 0, 0]), scale: 0.96, anchor: 'receiver-underbarrel' }),
    talon_c: Object.freeze({ position: Object.freeze([0.19, -0.055, 0.07]), rotation: Object.freeze([0, 0, 0]), scale: 1.02, anchor: 'receiver-underbarrel' }),
    siege_breaker: Object.freeze({ position: Object.freeze([0.24, -0.08, 0.08]), rotation: Object.freeze([0, 0, 0]), scale: 1.08, anchor: 'lower-receiver' }),
    tesla_lock: Object.freeze({ position: Object.freeze([0.17, -0.06, 0.075]), rotation: Object.freeze([0, 0, 0]), scale: 1.0, anchor: 'power-cell-rail' })
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
        usedFallback: archetype !== String(archetypeId || '').trim().toLowerCase()
    };
}

export function getCharmSocketRegistry() {
    return Object.fromEntries(Object.keys(SOCKETS).map((key) => [key, getCharmSocketTransform(key)]));
}

export { SOCKETS };
