import { describe, expect, it, vi } from 'vitest';
import {
    BIOMECH_SYNERGY_TUNING,
    findNearestInteractableProp,
    handleCustomPropDestruction,
    interactWithCustomProp,
    PROP_INTERACTION_SPECS
} from './propInteractions.js';

describe('propInteractions', () => {
    it('defines interaction specs for the new biomechanical & cathedral props', () => {
        expect(PROP_INTERACTION_SPECS.prop_oxygen_bottle_cascade_rack).toBeDefined();
        expect(PROP_INTERACTION_SPECS.prop_oxygen_bottle_cascade_rack.canInteract).toBe(true);
        expect(PROP_INTERACTION_SPECS.prop_coolant_drum_leaking_pool).toBeDefined();
        expect(PROP_INTERACTION_SPECS.prop_decon_eyewash_shower_station).toBeDefined();
        expect(PROP_INTERACTION_SPECS.prop_corporate_saint_reliquary).toBeDefined();
    });

    it('handles oxygen rack destruction: adjusts O2 and damages nearby enemies', () => {
        const nearUmbilical = { isAlive: true, x: 12, z: 10, stun: vi.fn() };
        const farUmbilical = { isAlive: true, x: 30, z: 30, stun: vi.fn() };
        const mockGame = {
            adjustOxygen: vi.fn(),
            showBunkerLine: vi.fn(),
            triggerCameraShake: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            applyPlayerDamageToEnemy: vi.fn(),
            snails: [
                { isAlive: true, x: 10, z: 10 },
                { isAlive: true, x: 100, z: 100 }
            ],
            umbilicalAttackers: [nearUmbilical, farUmbilical]
        };

        const handled = handleCustomPropDestruction(
            mockGame,
            'prop_oxygen_bottle_cascade_rack',
            { x: 10.5, z: 10.5 }
        );

        expect(handled).toBe(true);
        expect(mockGame.adjustOxygen).toHaveBeenCalledWith(35);
        expect(mockGame.applyPlayerDamageToEnemy).toHaveBeenCalledTimes(1);
        expect(mockGame.applyPlayerDamageToEnemy).toHaveBeenCalledWith(
            mockGame.snails[0],
            45,
            expect.objectContaining({ element: 'cryo' })
        );
        expect(nearUmbilical.stun).toHaveBeenCalledWith(BIOMECH_SYNERGY_TUNING.cryoStunSeconds);
        expect(farUmbilical.stun).not.toHaveBeenCalled();
    });

    it('applies bounded bile damage and deduplicated chitin vulnerability in radius', () => {
        const near = { isAlive: true, x: 1, z: 1, userData: {} };
        const far = { isAlive: true, x: 20, z: 20, userData: {} };
        const game = {
            showBunkerLine: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            applyPlayerDamageToEnemy: vi.fn(),
            snails: [near, far]
        };
        const prop = { x: 0, z: 0 };
        const propObject = { userData: { scatterKey: 'room:7:hatch' } };

        handleCustomPropDestruction(game, 'prop_biomech_sphincter_hatch_vent', prop, propObject);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledTimes(1);
        expect(game.applyPlayerDamageToEnemy).toHaveBeenCalledWith(near, 35, { element: 'bile' });
        expect(near.userData.statusEffects.chitinVulnerabilityTimer).toBe(6);
        expect(near.userData.statusEffects.chitinDamageMultiplier).toBe(1.25);
        expect(far.userData.statusEffects).toBeUndefined();

        near.userData.statusEffects.chitinVulnerabilityTimer = 3;
        handleCustomPropDestruction(game, 'prop_biomech_sphincter_hatch_vent', prop, propObject);
        expect(near.userData.statusEffects.chitinVulnerabilityTimer).toBe(3);
    });

    it('handles decon eyewash destruction: cleanses infection and restores O2', () => {
        const mockGame = {
            adjustOxygen: vi.fn(),
            showBunkerLine: vi.fn(),
            triggerCameraShake: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            playerVitals: {
                infection: 45
            }
        };

        const handled = handleCustomPropDestruction(
            mockGame,
            'prop_decon_eyewash_shower_station',
            { x: 5, z: 5 }
        );

        expect(handled).toBe(true);
        expect(mockGame.playerVitals.infection).toBe(0);
        expect(mockGame.adjustOxygen).toHaveBeenCalledWith(20);
    });

    it('finds nearest interactable prop and ignores non-interactable props', () => {
        const mockGame = {
            player: { position: { x: 0, z: 0 } },
            scatterSprites: [
                {
                    position: { x: 1.5, z: 0 },
                    userData: { type: 'prop_oxygen_bottle_cascade_rack' }
                },
                {
                    position: { x: 0.5, z: 0 },
                    userData: { type: 'prop_non_interactive_stone' }
                }
            ]
        };

        const nearest = findNearestInteractableProp(mockGame, 3.0);
        expect(nearest).not.toBeNull();
        expect(nearest.propKey).toBe('prop_oxygen_bottle_cascade_rack');
        expect(nearest.distance).toBeCloseTo(1.5);
    });

    it('interacts with custom prop successfully and flags hasBeenInteracted', () => {
        const mockGame = {
            adjustOxygen: vi.fn(),
            showBunkerLine: vi.fn(),
            spawnPhysicalBurst: vi.fn()
        };

        const nearestInfo = {
            sprite: {
                position: { x: 1, z: 1 },
                userData: {}
            },
            spec: PROP_INTERACTION_SPECS.prop_oxygen_bottle_cascade_rack
        };

        const success = interactWithCustomProp(mockGame, nearestInfo);
        expect(success).toBe(true);
        expect(mockGame.adjustOxygen).toHaveBeenCalledWith(15);
        expect(nearestInfo.sprite.userData.hasBeenInteracted).toBe(true);
    });
});
