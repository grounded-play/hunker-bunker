import { describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame containment frame snapshot', () => {
    it('reuses one immutable collision snapshot throughout a scatter frame', () => {
        const snapshot = {
            containmentZones: [{ id: 'safe-room' }],
            doors: [{ id: 'door' }]
        };
        const fakeThis = {
            _frameContainmentOptions: snapshot,
            getActiveContainmentZones: vi.fn(() => { throw new Error('should not rebuild zones'); }),
            getActiveDoors: vi.fn(() => { throw new Error('should not rebuild doors'); })
        };

        expect(ThreeGame.prototype.getCurrentContainmentOptions.call(fakeThis)).toBe(snapshot);
        expect(ThreeGame.prototype.getCurrentContainmentOptions.call(fakeThis)).toBe(snapshot);
        expect(fakeThis.getActiveContainmentZones).not.toHaveBeenCalled();
        expect(fakeThis.getActiveDoors).not.toHaveBeenCalled();
    });

    it('builds a fresh snapshot when called outside the scatter update', () => {
        const zones = [{ id: 'safe-room' }];
        const doors = [{ id: 'door' }];
        const fakeThis = {
            _frameContainmentOptions: null,
            getActiveContainmentZones: vi.fn(() => zones),
            getActiveDoors: vi.fn(() => doors)
        };

        expect(ThreeGame.prototype.getCurrentContainmentOptions.call(fakeThis)).toEqual({
            containmentZones: zones,
            doors
        });
    });
});
