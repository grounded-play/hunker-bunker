// Map-local tombstones only. Decals, live HP and ordinary scatter keys are not
// part of this format. Keep legacy saves valid and reject malformed IDs.
export function isRoomDressingId(value) {
    if (typeof value !== 'string' || value.length > 1024) return false;
    if (/^.+:dressing:(wallProp|clutter|corner|vignette):\d+$/.test(value)) return true;
    const match = /^.+:dressing:v2:(wallProp|clutter|corner|vignette):([^:]+)$/.exec(value);
    if (!match) return false;
    try {
        const placement = JSON.parse(decodeURIComponent(match[2]));
        return Array.isArray(placement) && placement.length === 4
            && typeof placement[0] === 'string' && placement[0].length > 0
            && placement.slice(1).every(Number.isFinite);
    } catch { return false; }
}

export function serializeBrokenRoomDressing(keys) {
    return [...new Set(Array.from(keys ?? []).filter(isRoomDressingId))].sort();
}

export function restoreBrokenRoomDressing(values) {
    return new Set(Array.isArray(values) ? values.filter(isRoomDressingId) : []);
}
