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

        it('resolves terminal_hack preset for consoles, terminals, biometric safes, and podiums', () => {
            expect(resolveInteractionVignettePreset('corp_biometric_wall_safe')).toBe(INTERACTION_VIGNETTE_PRESETS.terminal_hack);
            expect(resolveInteractionVignettePreset('chen_sealed_confession_console')).toBe(INTERACTION_VIGNETTE_PRESETS.terminal_hack);
            expect(resolveInteractionVignettePreset('base_console')).toBe(INTERACTION_VIGNETTE_PRESETS.terminal_hack);
            expect(resolveInteractionVignettePreset('lore_terminal')).toBe(INTERACTION_VIGNETTE_PRESETS.terminal_hack);
            expect(resolveInteractionVignettePreset('corp_quantum_ledger_podium')).toBe(INTERACTION_VIGNETTE_PRESETS.terminal_hack);
            expect(resolveInteractionVignettePreset('custom_screen', { generic: 'terminal' })).toBe(INTERACTION_VIGNETTE_PRESETS.terminal_hack);
        });

        it('resolves case_unlatch preset for weapon cases and hardcases', () => {
            expect(resolveInteractionVignettePreset('weapon_flamethrower_case')).toBe(INTERACTION_VIGNETTE_PRESETS.case_unlatch);
            expect(resolveInteractionVignettePreset('heavy_hardcase')).toBe(INTERACTION_VIGNETTE_PRESETS.case_unlatch);
        });

        it('resolves rest_recovery preset for cots, beds, bunks, and stretchers', () => {
            expect(resolveInteractionVignettePreset('base_cot_installed')).toBe(INTERACTION_VIGNETTE_PRESETS.rest_recovery);
            expect(resolveInteractionVignettePreset('carry_field_cot_folded')).toBe(INTERACTION_VIGNETTE_PRESETS.rest_recovery);
            expect(resolveInteractionVignettePreset('bunker_bunk')).toBe(INTERACTION_VIGNETTE_PRESETS.rest_recovery);
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
                acknowledgePropExperience: vi.fn(),
                spawnPhysicalBurst: vi.fn(),
                triggerCameraShake: vi.fn(),
                tintPlayerSprites: vi.fn(),
                playSound: vi.fn()
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
            expect(game.acknowledgePropExperience).toHaveBeenCalledWith(sprite, { toggleArticulation: false });

            // Update partway (alignment phase)
            controller.update(0.2);
            expect(controller.isActive()).toBe(true);
            expect(onComplete).not.toHaveBeenCalled();

            // Finish duration (1.4s)
            controller.update(1.3);
            expect(controller.isActive()).toBe(false);
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        it('restores logical facing and clears stale movement when completing', () => {
            const game = mockGame();
            game.facingYaw = 1.1;
            game.player.rotation.y = 0.2;
            game.updateFacingYaw = vi.fn((yaw) => { game.facingYaw = yaw; });
            game.clearGameplayInputState = vi.fn();
            game.player3dOverlay.root = new THREE.Group();
            game.player3dOverlay.root.rotation.y = 0.9;
            game.player.position.set(0, 0, 0);
            const controller = createInteractionVignetteController(game);
            const sprite = new THREE.Sprite();
            sprite.position.set(0, 0, 1);
            sprite.userData = { type: 'storage_locker' };

            controller.startVignette({ sprite });
            controller.update(2);

            expect(game.updateFacingYaw).toHaveBeenCalledWith(1.1);
            expect(game.player.rotation.y).toBeCloseTo(0.2);
            expect(game.player3dOverlay.root.rotation.y).toBeCloseTo(0.9);
            expect(game.clearGameplayInputState).toHaveBeenCalledTimes(1);
        });

        it('fires timed milestones (surges, camera shakes, and sound) during exosuit_dock vignette', () => {
            const game = mockGame();
            game.player.position.set(10, 0, 8);
            const controller = createInteractionVignetteController(game);

            const sprite = new THREE.Sprite();
            sprite.position.set(10, 0, 10);
            sprite.userData = {
                type: 'prop_exosuit_docking_gantry',
                wallNormal: { x: 0, z: -1 }
            };

            const onComplete = vi.fn();
            controller.startVignette({
                sprite,
                onComplete
            });

            expect(controller.isActive()).toBe(true);
            expect(game.player3dOverlay.trigger).toHaveBeenCalledWith('exosuit_dock', 1.8);

            // Step to 0.2s: before milestone 1 (0.35s)
            controller.update(0.2);
            expect(game.spawnPhysicalBurst).not.toHaveBeenCalled();
            expect(game.triggerCameraShake).not.toHaveBeenCalled();
            expect(game.playSound).not.toHaveBeenCalled();

            // Step past 0.35s: milestone 1 should fire
            controller.update(0.2); // total elapsed: 0.4s
            expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(10, 10, expect.objectContaining({
                color: 0xffcc00,
                count: 18
            }));
            expect(game.triggerCameraShake).toHaveBeenCalledWith(0.04, 0.15);
            expect(game.tintPlayerSprites).toHaveBeenCalledWith(0xffea60);
            expect(game.playSound).toHaveBeenCalledWith('exosuit_charge', { volume: 0.7 });

            // Step slightly further to 0.6s: milestone 1 must NOT fire again
            controller.update(0.2);
            expect(game.playSound).toHaveBeenCalledTimes(1);

            // Step past 1.0s: milestone 2 should fire
            controller.update(0.5); // total elapsed: 1.1s
            expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(10, 10, expect.objectContaining({
                color: 0xffffff,
                count: 12
            }));
            expect(game.triggerCameraShake).toHaveBeenCalledWith(0.06, 0.2);

            // Complete vignette (duration: 1.8s)
            controller.update(0.8);
            expect(controller.isActive()).toBe(false);
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        it('fires terminal_hack scan and decrypt milestones for biometric wall safe', () => {
            const game = mockGame();
            game.player.position.set(4, 0, 4);
            const controller = createInteractionVignetteController(game);

            const sprite = new THREE.Sprite();
            sprite.position.set(4, 0, 5);
            sprite.userData = {
                type: 'corp_biometric_wall_safe',
                wallNormal: { x: 0, z: -1 }
            };

            const onComplete = vi.fn();
            controller.startVignette({
                sprite,
                onComplete
            });

            expect(controller.isActive()).toBe(true);
            expect(game.player3dOverlay.trigger).toHaveBeenCalledWith('terminal_hack', 1.25);
            expect(game.acknowledgePropExperience).toHaveBeenCalledWith(sprite, { toggleArticulation: false });

            // Milestone 1 at 0.20s: amber scan spark
            controller.update(0.20);
            expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(4, 5, expect.objectContaining({
                color: 0xf59e0b,
                count: 8
            }));
            expect(game.playSound).toHaveBeenCalledWith('terminal_beep', { volume: 0.5 });

            // Milestone 2 at 0.75s: emerald authorization success & safe unlatch
            controller.update(0.60); // total elapsed: 0.80s
            expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(4, 5, expect.objectContaining({
                color: 0x22c55e,
                count: 10
            }));
            expect(game.playSound).toHaveBeenCalledWith('vault_open', expect.objectContaining({ volume: 0.6 }));

            // Finish at 1.25s
            controller.update(0.50);
            expect(controller.isActive()).toBe(false);
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        it('fires case_unlatch dual cam latch release and lid opening milestones', () => {
            const game = mockGame();
            game.player.position.set(2, 0, 1);
            const controller = createInteractionVignetteController(game);

            const sprite = new THREE.Sprite();
            sprite.position.set(2, 0, 2);
            sprite.userData = { type: 'weapon_flamethrower_case' };

            const onComplete = vi.fn();
            controller.startVignette({
                sprite,
                onComplete
            });

            expect(controller.isActive()).toBe(true);
            expect(game.player3dOverlay.trigger).toHaveBeenCalledWith('case_unlatch', 1.3);

            // Milestone 1 at 0.25s: cam latch snap
            controller.update(0.25);
            expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(2, 2, expect.objectContaining({ color: 0xaaaaaa, count: 8 }));
            expect(game.playSound).toHaveBeenCalledWith('metal_stress', expect.objectContaining({ playbackRate: 2.0 }));

            // Milestone 2 at 0.70s: seal pop, golden glint, lid open
            controller.update(0.50); // total elapsed: 0.75s
            expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(2, 2, expect.objectContaining({ color: 0xf59e0b, count: 12 }));
            expect(game.playSound).toHaveBeenCalledWith('ambient_steam_hiss', expect.anything());
            expect(game.playSound).toHaveBeenCalledWith('vault_open', expect.anything());
            expect(game.acknowledgePropExperience).toHaveBeenCalledWith(sprite, { toggleArticulation: true });

            // Complete at 1.30s
            controller.update(0.60);
            expect(controller.isActive()).toBe(false);
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        it('fires rest_recovery healing surge milestones on field cot', () => {
            const game = mockGame();
            game.healPlayer = vi.fn();
            game.player.position.set(6, 0, 6);
            const controller = createInteractionVignetteController(game);

            const sprite = new THREE.Sprite();
            sprite.position.set(6, 0, 7);
            sprite.userData = { type: 'base_cot_installed' };

            const onComplete = vi.fn();
            controller.startVignette({
                sprite,
                onComplete
            });

            expect(controller.isActive()).toBe(true);
            expect(game.player3dOverlay.trigger).toHaveBeenCalledWith('rest_recovery', 1.5);

            // Milestone 1 at 0.30s: green healing aura & blessing
            controller.update(0.30);
            expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(6, 7, expect.objectContaining({ color: 0x22c55e, count: 14 }));
            expect(game.tintPlayerSprites).toHaveBeenCalledWith(0x86efac);
            expect(game.playSound).toHaveBeenCalledWith('shrine_blessing', expect.anything());

            // Milestone 2 at 0.90s: cellular recovery burst & heal
            controller.update(0.65); // total elapsed: 0.95s
            expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(6, 7, expect.objectContaining({ color: 0xffffff, count: 10 }));
            expect(game.healPlayer).toHaveBeenCalledWith(20);

            // Complete at 1.50s
            controller.update(0.60);
            expect(controller.isActive()).toBe(false);
            expect(onComplete).toHaveBeenCalledTimes(1);
        });

        it('aborts on damage interrupt, triggers hit reaction, and invokes onCancel', () => {
            const game = mockGame();
            game.clearGameplayInputState = vi.fn();
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
            expect(game.clearGameplayInputState).toHaveBeenCalledTimes(1);
        });
    });
});
