import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { carryStoryToNewMap } from './campaignWorld.js';
import { serializeBrokenRoomDressing, restoreBrokenRoomDressing } from './roomDressingPersistence.js';

const id = 'grammar:1:42:3,2:dressing:clutter:7';

describe('map-local room dressing destruction', () => {
    it('round-trips valid unique IDs and rejects malformed/ordinary scatter keys', () => {
        const saved = serializeBrokenRoomDressing([id, id, 'ordinary-prop', null, 'room:dressing:floorDecal:2']);
        expect(saved).toEqual([id]);
        expect([...restoreBrokenRoomDressing(JSON.parse(JSON.stringify(saved)))]).toEqual([id]);
        expect(restoreBrokenRoomDressing({ id })).toEqual(new Set());
    });

    it('includes breaks in maze snapshots and replaces stale state on restore', () => {
        const game = { brokenPropScatterKeys: new Set([id]) };
        const snapshot = ThreeGame.prototype.getMazePersistenceState.call(game);
        const restored = { brokenPropScatterKeys: new Set(['old:dressing:corner:1']) };
        expect(ThreeGame.prototype.restoreMazePersistenceState.call(restored, JSON.parse(JSON.stringify(snapshot)))).toBe(true);
        expect(restored.brokenPropScatterKeys).toEqual(new Set([id]));
        ThreeGame.prototype.restoreMazePersistenceState.call(restored, { generationVersion: 2 });
        expect(restored.brokenPropScatterKeys.size).toBe(0);
    });

    it('clears breaks on a new map without deleting story progress', () => {
        const source = { generationVersion: 2, worldChanges: { brokenRoomDressing: [id] }, access: { flags: ['gate-open'] } };
        expect(carryStoryToNewMap(source)).toMatchObject({ worldChanges: { brokenRoomDressing: [] }, access: source.access });
        expect(source.worldChanges.brokenRoomDressing).toEqual([id]);
    });

    it('retains an unloaded remote break and ignores replay without breaking a nearby object', () => {
        const nearby = { position: { x: 2, z: 2 }, userData: { propHp: 3, scatterKey: 'other' } };
        const game = { scatterSprites: [nearby], breakScatterProp: vi.fn() };
        const apply = detail => ThreeGame.prototype.applyRemotePropBroken.call(game, detail);
        expect(apply({ scatterKey: id, x: 2, z: 2 })).toBe(true);
        expect(game.brokenPropScatterKeys.has(id)).toBe(true);
        expect(apply({ scatterKey: id, x: 2, z: 2 })).toBe(false);
        expect(game.breakScatterProp).not.toHaveBeenCalled();
    });

    it('applies a loaded remote break exactly once with the supplied drop plan', () => {
        const target = { userData: { isRoomDressingCollider: true, scatterKey: id, propHp: 3 } };
        const game = { scatterSprites: [target], breakScatterProp: vi.fn(() => true) };
        const drops = [{ type: 'ammo', x: 2, z: 2 }];
        ThreeGame.prototype.applyRemotePropBroken.call(game, { scatterKey: id, drops });
        ThreeGame.prototype.applyRemotePropBroken.call(game, { scatterKey: id, drops });
        expect(game.breakScatterProp).toHaveBeenCalledExactlyOnceWith(target, { plannedDrops: drops, fromRemote: true });
        expect(target.userData.propHp).toBe(0);
    });
});
