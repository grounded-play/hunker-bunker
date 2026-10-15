import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
    INTERACTION_VIGNETTE_PRESETS,
    resolveInteractionVignettePreset,
    calculateVignetteSocket,
    createInteractionVignetteController
} from './interactionVignette.js';

describe('interactionVignette', () => {
    describe('resolveInteractionVignettePreset', () => {
        it('resolves rummage preset for searchable containers and supply lockers', () => {
            expect(resolveInteractionVignettePreset('prop_maintenance_tool_cart')).toBe(INTERACTION_VIGNETTE_PRESETS.rummage);
            expect(resolveInteractionVignettePreset('storage_locker')).toBe(INTERACTION_VIGNETTE_PRESETS.rummage);
            expect(resolveInteractionVignettePreset('tina_covert_nursery_chest')).toBe(INTERACTION_VIGNETTE_PRESETS.rummage);
            expect(resolveInteractionVignettePreset('prop_bunker_supplies')).toBe(INTERACTION_VIGNETTE_PRESETS.rummage);
            expect(resolveInteractionVignettePreset('custom_case', { generic: 'search' })).toBe(INTERACTION_VIGNETTE_PRESETS.rummage);
        });

        it('resolves exosuit_dock preset for docking gantry and scrubber station', () => {
            expect(resolveInteractionVignettePreset('prop_exosuit_docking_gantry')).toBe(INTERACTION_VIGNETTE_PRESETS.exosuit_dock);
            expect(resolveInteractionVignettePreset('decon_exosuit_scrubber_station')).toBe(INTERACTION_VIGNETTE_PRESETS.exosuit_dock);
        });

        it('resolves terminal_hack preset for consoles and biometric safes', () => {
            expect(resolveInteractionVignettePreset('corp_biometric_wall_safe')).toBe(INTERACTION_VIGNETTE_PRESETS.terminal_hack);
            expect(resolveInteractionVignettePreset('base_console')).toBe(INTERACTION_VIGNETTE_PRESETS.terminal_hack);
            expect(resolveInteractionVignettePreset('lore_terminal')).toBe(INTERACTION_VIGNETTE_PRESETS.terminal_hack);
        });

        it('honors explicit spec vignettePreset override', () => {
            const spec = { vignettePreset: 'rummage' };
            expect(resolveInteractionVignettePreset('anything', spec)).toBe(INTERACTION_VIGNETTE_PRESETS.rummage);
        });

        it('returns null for props with no matching vignette', () => {
            expect(resolveInteractionVignettePreset('prop_rock_spire')).toBeNull();
            expect(resolveInteractionVignettePreset(null)).toBeNull();
        });
    });

    describe('calculateVignetteSocket', () => {
        it('calculates position and facing towards a wall-backed prop', () => {
            const playerPos = new THREE.Vector3(5, 0, 8);
            const propPos = new THREE.Vector3(5, 0, 10);
            const wallNormal = { x: 0, z: -1 }; // Wall behind prop at +Z, facing South into -Z
            const socket = calculateVignetteSocket(playerPos, propPos, wallNormal, 0.65, true);

            // standoff along wallNormal: z = 10 + (-1 * 0.65) = 9.35
            expect(socket.position.x).toBeCloseTo(5);
            expect(socket.position.z).toBeCloseTo(9.35);
            // Face prop: looks along -wallNormal = +Z
            expect(socket.yaw).toBeCloseTo(0);
        });

        it('calculates forward facing for props where player enters and faces away', () => {
            const playerPos = new THREE.Vector3(5, 0, 8);
            const propPos = new THREE.Vector3(5, 0, 10);
            const wallNormal = { x: 0, z: -1 };
            const socket = calculateVignetteSocket(playerPos, propPos, wallNormal, 0.15, false);

            expect(socket.position.x).toBeCloseTo(5);
            expect(socket.position.z).toBeCloseTo(9.85);
            // Face outward: looks along wallNormal = -Z
            expect(socket.yaw).toBeCloseTo(Math.PI);
        });
    });

    describe('createInteractionVignetteController', () => {
        function mockGame() {
            return {
                player: new THREE.Group(),
                player3dOverlay: {
                    trigger: vi.fn(),
                    clearTrigger: vi.fn()
                },
                acknowledgePropExperience: vi.fn()
            };
        }

        it('starts vignette, triggers animation and prop experience, and completes payload', () => {
            const game = mockGame();
            game.player.position.set(5, 0, 5);
            const controller = createInteractionVignetteController(game);

            const sprite = new THREE.Sprite();
            sprite.position.set(5, 0, 6);
            sprite.userData = { type: 'prop_maintenance_tool_cart' };

            const onComplete = vi.fn();
            const started = controller.startVignette({
                sprite,
                onComplete
            });

            expect(started).toBe(true);
            expect(controller.isActive()).toBe(true);
            expect(game.player3dOverlay.trigger).toHaveBeenCalledWith('rummaging', 1.4);
            expect(game.acknowledgePropExperience).toHaveBeenCalledWith(sprite);

            // Update partway (alignment phase)
            controller.update(0.2);
            expect(controller.isActive()).toBe(true);
            expect(onComplete).not.toHaveBeenCalled();

            // Finish duration (1.4s)
            controller.update(1.3);
            expect(controller.isActive()).toBe(false);
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        it('aborts on damage interrupt, triggers hit reaction, and invokes onCancel', () => {
            const game = mockGame();
            const controller = createInteractionVignetteController(game);

            const sprite = new THREE.Sprite();
            sprite.position.set(2, 0, 3);
            sprite.userData = { type: 'storage_locker' };

            const onComplete = vi.fn();
            const onCancel = vi.fn();
            controller.startVignette({
                sprite,
                onComplete,
                onCancel
            });

            expect(controller.isActive()).toBe(true);

            // Take damage halfway through
            controller.interrupt('damage');

            expect(controller.isActive()).toBe(false);
            expect(game.player3dOverlay.clearTrigger).toHaveBeenCalledWith('rummaging');
            expect(game.player3dOverlay.trigger).toHaveBeenCalledWith('hit', 0.4);
            expect(onCancel).toHaveBeenCalledWith('damage');
            expect(onComplete).not.toHaveBeenCalled();
        });
    });
});
