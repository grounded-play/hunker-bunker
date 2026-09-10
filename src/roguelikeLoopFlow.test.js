import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('Roguelike Loop Flow and Telemetry Debrief', () => {
    let originalWindow;

    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: { play: vi.fn() },
            CustomEvent: globalThis.CustomEvent ?? class {
                constructor(type, init) {
                    this.type = type;
                    this.detail = init?.detail;
                }
            }
        };
    });

    afterEach(() => {
        globalThis.window = originalWindow;
    });

    describe('Depth Tier Ring Crossing Ceremony', () => {
        it('triggers tactile camera shake and atmospheric particle burst on genuine crossing', () => {
            const spawnTextureBurstEffect = vi.fn();
            const player = new THREE.Object3D();
            player.position.set(10, 0, 15);

            const fake = {
                player,
                cameraShakeIntensity: 0,
                cameraShakeDuration: 0,
                maxDepthTierReached: 1,
                getDepthTierName: (tier) => ['SURFACE', 'SHALLOW', 'DEEP', 'ABYSS'][tier] ?? 'SURFACE',
                spawnTextureBurstEffect,
                emitDepthTierChanged: ThreeGame.prototype.emitDepthTierChanged
            };

            fake.emitDepthTierChanged(2, { isCrossing: true });

            expect(fake.cameraShakeIntensity).toBeGreaterThanOrEqual(0.45);
            expect(fake.cameraShakeDuration).toBeGreaterThanOrEqual(0.55);
            expect(spawnTextureBurstEffect).toHaveBeenCalledWith(
                10,
                15,
                expect.objectContaining({
                    textureKey: 'fx_steam_puff',
                    color: 0x6ee7b7
                })
            );
            expect(globalThis.window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: expect.objectContaining({
                        tier: 2,
                        crossing: expect.objectContaining({
                            label: 'RING III'
                        })
                    })
                })
            );
        });

        it('does not trigger camera shake on non-crossing emit', () => {
            const spawnTextureBurstEffect = vi.fn();
            const fake = {
                cameraShakeIntensity: 0,
                cameraShakeDuration: 0,
                maxDepthTierReached: 1,
                getDepthTierName: (tier) => ['SURFACE', 'SHALLOW', 'DEEP', 'ABYSS'][tier] ?? 'SURFACE',
                spawnTextureBurstEffect,
                emitDepthTierChanged: ThreeGame.prototype.emitDepthTierChanged
            };

            fake.emitDepthTierChanged(1, { isCrossing: false });

            expect(fake.cameraShakeIntensity).toBe(0);
            expect(spawnTextureBurstEffect).not.toHaveBeenCalled();
        });
    });
});
