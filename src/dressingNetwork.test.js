import { describe, expect, it, vi } from 'vitest';
import { applyDressingNetworkEvent, registerDressingNetwork } from './dressingNetwork.js';
import { roomDressingIdentity } from './roomDressingIdentity.js';
import { ThreeGame } from './threeGame.js';

describe('dressing HP reconciliation', () => {
    const id = roomDressingIdentity('room', { type: 'prop_cart', layer: 'clutter', x: 2, y: 3 });
    it('only accepts relay state, ignores older revisions and does not break twice', () => {
        const target = { userData: { dressingStableId: id, propHp: 3 } };
        const game = { scatterSprites: [target], breakScatterProp: vi.fn() };
        const event = (hp, revision, originId = 'relay') => ({ event: 'dressing-state', originId, detail: { version: 1, id, hp, revision } });
        expect(applyDressingNetworkEvent(game, event(0, 99, 'guest'))).toBe(false);
        expect(applyDressingNetworkEvent(game, event(2, 1))).toBe(true);
        expect(target.userData.propHp).toBe(2);
        expect(applyDressingNetworkEvent(game, event(3, 0))).toBe(false);
        applyDressingNetworkEvent(game, event(0, 2));
        applyDressingNetworkEvent(game, event(0, 2));
        expect(game.breakScatterProp).toHaveBeenCalledTimes(1);
        expect(game.brokenPropScatterKeys.has(id)).toBe(true);
    });
    it('routes negotiated hits without local HP mutation and registers stable identity', () => {
        const target = { userData: { dressingStableId: id, isDestructibleProp: true, propHp: 3 } };
        const game = { isMultiplayer: true, _dressingProtocolEnabled: true, broadcastSharedWorldEvent: vi.fn(), scatterSprites: [target] };
        registerDressingNetwork(game, [{ stableId: id, id: 'legacy', x: 2, y: 3, destructible: true }]);
        expect(game.broadcastSharedWorldEvent).toHaveBeenCalledWith('dressing-register', { version: 1, items: [{ id, x: 2, z: 3, hp: 3 }] });
        ThreeGame.prototype.damageScatterProp.call(game, target, 1);
        expect(target.userData.propHp).toBe(3);
        expect(game.broadcastSharedWorldEvent).toHaveBeenLastCalledWith('dressing-hit', { version: 1, id, damage: 1, sequence: 1 });
    });
});
