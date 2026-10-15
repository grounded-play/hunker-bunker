import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createInteractionVignetteController } from './interactionVignette.js';
import { interactWithCustomProp } from './propInteractions.js';

describe('threeGame interaction vignette gameplay integration', () => {
    function createMockGame() {
        const game = {
            performanceProfile: 'gameplay',
            inputEnabled: true,
            isPlayerDead: false,
            loadingPaused: false,
            hasBlockingGameplayOverlay: () => false,
            player: new THREE.Group(),
            playerVitals: { hp: 100, maxHp: 100 },
            player3dOverlay: {
                trigger: vi.fn(),
                clearTrigger: vi.fn(),
                update: vi.fn()
            },
            acknowledgePropExperience: vi.fn(),
            spawnPhysicalBurst: vi.fn(),
            triggerCameraShake: vi.fn(),
            tintPlayerSprites: vi.fn(),
            playSound: vi.fn(),
            isPlayerInjured: () => false,
            hasActiveAim: false,
            isMoving: false,
            addScrap: vi.fn(),
            showBunkerLine: vi.fn(),
            weaponClipAmmo: 10,
            weaponClipSize: 30,
            emitWeaponClipState: vi.fn()
        };
        game.interactionVignette = createInteractionVignetteController(game);
        game.isGameplayInputActive = function () {
            return this.performanceProfile === 'gameplay'
                && this.inputEnabled
                && !this.isPlayerDead
                && !this.loadingPaused
                && !this.hasBlockingGameplayOverlay()
                && !this.interactionVignette?.isActive();
        };
        game.updatePlayer = function (delta) {
            if (this.isPlayerDead) return;
            if (this.interactionVignette?.isActive()) {
                this.isMoving = false;
                this.interactionVignette.update(delta);
                this.player3dOverlay?.update(delta, {
                    isFalling: false,
                    isMoving: false,
                    idleActionName: 'idle',
                    isInjured: this.isPlayerInjured(),
                    hasAim: false,
                    moveX: 0,
                    moveZ: 0,
                    aimX: 0,
                    aimZ: 0
                });
            }
        };
        game.onPlayerDamaged = function () {
            if (this.interactionVignette?.isActive()) {
                this.interactionVignette.interrupt('damage');
            }
            this.player3dOverlay?.trigger('hit');
        };
        return game;
    }

    it('locks input, animates character rummaging, and awards scrap upon completion', () => {
        const game = createMockGame();
        game.player.position.set(10, 0, 10);

        const cartSprite = new THREE.Sprite();
        cartSprite.position.set(10, 0, 11);
        cartSprite.userData = { type: 'prop_maintenance_tool_cart' };

        const nearestInfo = {
            sprite: cartSprite,
            spec: {
                canInteract: true,
                onInteract: (g) => {
                    g.addScrap(15);
                    return true;
                }
            }
        };

        expect(game.isGameplayInputActive()).toBe(true);

        // Player interacts with tool cart
        const started = interactWithCustomProp(game, nearestInfo);
        expect(started).toBe(true);

        // Input is locked during vignette
        expect(game.interactionVignette.isActive()).toBe(true);
        expect(game.isGameplayInputActive()).toBe(false);
        expect(game.player3dOverlay.trigger).toHaveBeenCalledWith('rummaging', 1.4);
        expect(game.acknowledgePropExperience).toHaveBeenCalledWith(cartSprite);

        // Advance 0.5 seconds (halfway through)
        game.updatePlayer(0.5);
        expect(game.interactionVignette.isActive()).toBe(true);
        expect(game.isGameplayInputActive()).toBe(false);
        expect(game.addScrap).not.toHaveBeenCalled();

        // Advance past duration (1.4s total)
        game.updatePlayer(1.0);
        expect(game.interactionVignette.isActive()).toBe(false);
        expect(game.isGameplayInputActive()).toBe(true);
        expect(game.addScrap).toHaveBeenCalledWith(15);
    });

    it('interrupts vignette on enemy damage and restores input immediately', () => {
        const game = createMockGame();
        game.player.position.set(5, 0, 5);

        const chestSprite = new THREE.Sprite();
        chestSprite.position.set(5, 0, 6);
        chestSprite.userData = { type: 'storage_locker' };

        const nearestInfo = {
            sprite: chestSprite,
            spec: {
                canInteract: true,
                onInteract: vi.fn()
            }
        };

        interactWithCustomProp(game, nearestInfo);
        expect(game.interactionVignette.isActive()).toBe(true);
        expect(game.isGameplayInputActive()).toBe(false);

        // Enemy hits the player
        game.onPlayerDamaged();

        // Vignette is interrupted immediately
        expect(game.interactionVignette.isActive()).toBe(false);
        expect(game.isGameplayInputActive()).toBe(true);
        expect(game.player3dOverlay.clearTrigger).toHaveBeenCalledWith('rummaging');
        expect(game.player3dOverlay.trigger).toHaveBeenCalledWith('hit', 0.4);
        expect(nearestInfo.spec.onInteract).not.toHaveBeenCalled();
    });

    it('executes exosuit docking gantry vignette: steps inside cage facing out, surges power, and overcharges armor', () => {
        const game = createMockGame();
        game.player.position.set(10, 0, 8);
        game.player.rotation.y = 0;

        const gantrySprite = new THREE.Sprite();
        gantrySprite.position.set(10, 0, 10);
        gantrySprite.userData = {
            type: 'prop_exosuit_docking_gantry',
            wallNormal: { x: 0, z: -1 }
        };

        const nearestInfo = {
            sprite: gantrySprite,
            spec: {
                canInteract: true,
                onInteract: (g) => {
                    if (g.playerVitals) {
                        g.playerVitals.hp = Math.min(g.playerVitals.maxHp * 1.5, g.playerVitals.hp + 50);
                    }
                    g.showBunkerLine('EXOSUIT DOCKED: ARMOR INTEGRITY OVERCHARGED TO 150%.');
                    return true;
                }
            }
        };

        // Interact
        const started = interactWithCustomProp(game, nearestInfo);
        expect(started).toBe(true);
        expect(game.interactionVignette.isActive()).toBe(true);
        expect(game.isGameplayInputActive()).toBe(false);
        expect(game.player3dOverlay.trigger).toHaveBeenCalledWith('exosuit_dock', 1.8);

        // Advance 0.35s (docking socket reached)
        game.updatePlayer(0.35);
        expect(game.player.position.x).toBeCloseTo(10, 1);
        expect(game.player.position.z).toBeCloseTo(9.8, 1);
        // Player should be facing outward (-Z, away from wall)
        expect(Math.abs(game.player.rotation.y)).toBeCloseTo(Math.PI, 1);
        expect(game.spawnPhysicalBurst).toHaveBeenCalledWith(10, 10, expect.objectContaining({ color: 0xffcc00 }));
        expect(game.triggerCameraShake).toHaveBeenCalledWith(0.04, 0.15);

        // Advance past 1.0s (secondary surge)
        game.updatePlayer(0.7);
        expect(game.triggerCameraShake).toHaveBeenCalledWith(0.06, 0.2);

        // Complete vignette (1.8s)
        game.updatePlayer(0.8);
        expect(game.interactionVignette.isActive()).toBe(false);
        expect(game.isGameplayInputActive()).toBe(true);
        expect(game.playerVitals.hp).toBe(150);
        expect(game.showBunkerLine).toHaveBeenCalledWith(expect.stringContaining('OVERCHARGED TO 150%'));
    });
});
