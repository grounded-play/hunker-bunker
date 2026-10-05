// Identity v2 depends on the physical placement, not its index in an instance
// buffer or in the combined decoration list. Layout generation remains v1.
export function roomDressingIdentity(roomId, item) {
    const placement = [item.type, item.x, item.y, item.mountY ?? 0];
    if (typeof roomId !== 'string' || !roomId || typeof item.type !== 'string'
        || !placement.slice(1).every(Number.isFinite)) throw new Error('Invalid dressing identity');
    return `${roomId}:dressing:v2:${item.layer}:${encodeURIComponent(JSON.stringify(placement))}`;
}

// Migrate legacy ordinal tombstones only while mounting the unchanged v1 plan.
// Co-op retains ordinal wire keys until peers negotiate identity versions.
export function resolveRoomDressingIdentity(item, brokenKeys, { multiplayer = false } = {}) {
    if (multiplayer) return item.legacyId ?? item.id;
    if (item.legacyId && brokenKeys.has(item.legacyId)) {
        brokenKeys.add(item.id);
        brokenKeys.delete(item.legacyId);
    }
    return item.id;
}
