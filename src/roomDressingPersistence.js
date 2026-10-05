// Map-local tombstones only. Decals, live HP and ordinary scatter keys are not
// part of this format. Keep legacy saves valid and reject malformed IDs.
export function isRoomDressingId(value) {
    return typeof value === 'string' && value.length <= 1024
        && /^.+:dressing:(wallProp|clutter|corner|vignette):\d+$/.test(value);
}

export function serializeBrokenRoomDressing(keys) {
    return [...new Set(Array.from(keys ?? []).filter(isRoomDressingId))].sort();
}

export function restoreBrokenRoomDressing(values) {
    return new Set(Array.isArray(values) ? values.filter(isRoomDressingId) : []);
}
