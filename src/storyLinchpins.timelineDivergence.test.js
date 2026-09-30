import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyLinchpinResolution } from './storyLinchpins.js';
import { Act2Manager } from './act2.js';
import { ThreeGame } from './threeGame.js';

beforeEach(() => {
    vi.stubGlobal('window', {
        dispatchEvent: vi.fn(),
        AudioManager: { play: vi.fn() }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('Hive Queen Communion & Timeline Divergence Warnings', () => {
    it('dispatches timeline-divergence event when linchpin locks endings', () => {
        const act2 = new Act2Manager();
        act2.begin();

        const resolved = applyLinchpinResolution(act2, 'mayor_tina', 'joined');
        expect(resolved).toBe(true);

        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'story-linchpin-resolved',
            detail: expect.objectContaining({ id: 'mayor_tina', resolution: 'joined' })
        }));

        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'timeline-divergence',
            detail: expect.objectContaining({
                linchpinId: 'mayor_tina',
                resolution: 'joined',
                title: expect.stringContaining('HIVE TRANSCENDENCE'),
                locksEndings: expect.arrayContaining(['clean_escape', 'scorched_sky'])
            })
        }));
    });

    it('triggers Queen communion when player is transformed or high infection', () => {
        const act2 = new Act2Manager();
        act2.begin();
        act2.adjustInfectionLoad(45);

        const game = {
            act2,
            isAct2Active: () => true,
            player: { position: { x: 50, z: 50 } },
            mayorTinaEncounter: { phase: 'transformed' },
            showBunkerLine: vi.fn(),
            triggerCameraShake: vi.fn(),
            interactWithQueenCommunion: ThreeGame.prototype.interactWithQueenCommunion
        };

        const success = game.interactWithQueenCommunion();
        expect(success).toBe(true);
        expect(act2.getState().linchpins.queen_offer).toBe('accepted');
        expect(act2.getState().queenStatus).toBe('aboard');
        expect(act2.getState().eggsStatus).toBe('aboard');
        expect(game.showBunkerLine).toHaveBeenCalledWith(expect.stringContaining('HIVE CONSCIOUSNESS'));
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'timeline-divergence',
            detail: expect.objectContaining({
                linchpinId: 'queen_offer',
                resolution: 'accepted',
                title: expect.stringContaining('QUEEN COMMUNION ACCEPTED')
            })
        }));

        // Subsequent call does nothing because linchpin is write-once
        expect(game.interactWithQueenCommunion()).toBe(false);
    });

    it('rejects Queen communion if player is human with low infection and not transformed', () => {
        const act2 = new Act2Manager();
        act2.begin();

        const game = {
            act2,
            isAct2Active: () => true,
            player: { position: { x: 50, z: 50 } },
            mayorTinaEncounter: { phase: 'idle' },
            interactWithQueenCommunion: ThreeGame.prototype.interactWithQueenCommunion
        };

        expect(game.interactWithQueenCommunion()).toBe(false);
        expect(act2.getState().linchpins?.queen_offer).toBeUndefined();
    });
});
