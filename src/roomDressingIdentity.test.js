import { describe, expect, it } from 'vitest';
import { roomDressingIdentity, resolveRoomDressingIdentity } from './roomDressingIdentity.js';
import { isRoomDressingId, serializeBrokenRoomDressing } from './roomDressingPersistence.js';

describe('versioned physical dressing identity', () => {
    const prop = { type: 'prop_tool_cart', layer: 'clutter', x: 2.18, y: 8, mountY: 0 };
    it('ignores list ordering and rendering scale while distinguishing physical placements', () => {
        const id = roomDressingIdentity('room:42', prop);
        expect(id).toContain(':dressing:v2:');
        expect(roomDressingIdentity('room:42', { ...prop, index: 99, scale: 0.5 })).toBe(id);
        expect(roomDressingIdentity('room:42', { ...prop, x: 2.19 })).not.toBe(id);
        expect(roomDressingIdentity('room:43', prop)).not.toBe(id);
        expect(isRoomDressingId(id)).toBe(true);
        expect(serializeBrokenRoomDressing([id])).toEqual([id]);
        expect(isRoomDressingId('room:dressing:v2:clutter:%broken')).toBe(false);
    });
    it('migrates old tombstones for unchanged placements but retains co-op wire identities', () => {
        const item = { ...prop, id: roomDressingIdentity('room', prop), legacyId: 'room:dressing:clutter:7' };
        const broken = new Set([item.legacyId]);
        expect(resolveRoomDressingIdentity(item, broken, { multiplayer: true })).toBe(item.legacyId);
        expect(broken.has(item.legacyId)).toBe(true);
        expect(resolveRoomDressingIdentity(item, broken)).toBe(item.id);
        expect(broken).toEqual(new Set([item.id]));
    });
});
