import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame Accessibility & Comfort Controls (Phase 2)', () => {
    let originalWindow;

    beforeEach(() => {
        originalWindow = globalThis.window;
        globalThis.window = {
            dispatchEvent: vi.fn(),
            AudioManager: { play: vi.fn() }
        };
    });

    afterEach(() => {
        globalThis.window = originalWindow;
    });

    function createTestGame(overrides = {}) {
        const game = {
            player: { position: { x: 10, y: 0, z: 10 } },
            aimDirX: 1,
            aimDirZ: 0,
            facingYaw: Math.PI / 2,
            scatterSprites: [],
            cameraShakeScale: 1.0,
            aimAssistSetting: 'standard',
            reducedPressure: false,
            _cameraShakeIntensity: 0,
            _cameraShakeTimer: 0,
            traumaManager: {
                trauma: 0,
                addTrauma: vi.fn((amt) => { game.traumaManager.trauma += amt; })
            },
            isEnemyType: (type) => Boolean(type && (type.startsWith('enemy_') || type === 'crawler')),
            getWorldAimPoint: vi.fn((cx, cy) => ({ x: cx, y: 0, z: cy })),
            fireWeaponAtCurrentAim: vi.fn(({ source }) => ({ fired: true, source })),
            ...overrides
        };

        // Attach prototype methods under test
        game.triggerCameraShake = ThreeGame.prototype.triggerCameraShake.bind(game);
        game.setCameraShakeScale = ThreeGame.prototype.setCameraShakeScale.bind(game);
        game.setAimAssist = ThreeGame.prototype.setAimAssist.bind(game);
        game.setReducedPressure = ThreeGame.prototype.setReducedPressure.bind(game);
        game.getAimAssistTarget = ThreeGame.prototype.getAimAssistTarget.bind(game);
        game.getControllerAimFriction = ThreeGame.prototype.getControllerAimFriction.bind(game);
        game.triggerControllerFire = ThreeGame.prototype.triggerControllerFire.bind(game);
        game.telegraphBiomeBossAttack = ThreeGame.prototype.telegraphBiomeBossAttack.bind(game);

        return game;
    }

    describe('Camera Shake Intensity Scaling', () => {
        it('applies unscaled camera shake when set to normal (1.0)', () => {
            const game = createTestGame({ cameraShakeScale: 1.0 });
            game.triggerCameraShake(0.2, 0.4);
            expect(game._cameraShakeIntensity).toBeCloseTo(0.2);
            expect(game._cameraShakeTimer).toBe(0.4);
            expect(game.traumaManager.addTrauma).toHaveBeenCalledWith(Math.min(1.0, 0.2 * 2.2));
        });

        it('scales down intensity and trauma when set to reduced (0.5)', () => {
            const game = createTestGame({ cameraShakeScale: 0.5 });
            game.triggerCameraShake(0.2, 0.4);
            expect(game._cameraShakeIntensity).toBeCloseTo(0.1);
            expect(game._cameraShakeTimer).toBe(0.4);
            expect(game.traumaManager.addTrauma).toHaveBeenCalledWith(Math.min(1.0, 0.1 * 2.2));
        });

        it('completely silences camera shake and trauma when set to off (0.0)', () => {
            const game = createTestGame({ cameraShakeScale: 0.0 });
            game.triggerCameraShake(0.2, 0.4);
            expect(game._cameraShakeIntensity).toBe(0);
            expect(game._cameraShakeTimer).toBe(0);
            expect(game.traumaManager.addTrauma).not.toHaveBeenCalled();
        });

        it('clamps valid ranges through setCameraShakeScale', () => {
            const game = createTestGame();
            game.setCameraShakeScale(0.25);
            expect(game.cameraShakeScale).toBe(0.25);
            game.setCameraShakeScale('invalid');
            expect(game.cameraShakeScale).toBe(1.0);
        });
    });

    describe('Controller Aim Assistance (Cone Snap & Magnetism)', () => {
        it('finds enemy within ±15° cone and 9.0m range', () => {
            const enemy = {
                parent: {},
                position: { x: 15, y: 0, z: 10.5 }, // dx = 5, dz = 0.5, dist = ~5.02m, angle = ~5.7 deg
                userData: { type: 'crawler' }
            };
            const game = createTestGame({ scatterSprites: [enemy] });

            const target = game.getAimAssistTarget({
                originX: 10,
                originZ: 10,
                aimDirX: 1,
                aimDirZ: 0,
                maxDistance: 9.0,
                maxAngle: 15 * (Math.PI / 180)
            });

            expect(target).not.toBeNull();
            expect(target.sprite).toBe(enemy);
            expect(target.angle).toBeLessThan(15 * (Math.PI / 180));
        });

        it('ignores enemies outside the ±15° cone', () => {
            const enemy = {
                parent: {},
                position: { x: 10, y: 0, z: 16 }, // dx = 0, dz = 6 (90° from forward aim)
                userData: { type: 'crawler' }
            };
            const game = createTestGame({ scatterSprites: [enemy] });

            const target = game.getAimAssistTarget({
                originX: 10,
                originZ: 10,
                aimDirX: 1,
                aimDirZ: 0,
                maxDistance: 9.0,
                maxAngle: 15 * (Math.PI / 180)
            });

            expect(target).toBeNull();
        });

        it('ignores enemies beyond the 9.0m range', () => {
            const enemy = {
                parent: {},
                position: { x: 21, y: 0, z: 10 }, // dx = 11m (ahead, but >9m)
                userData: { type: 'crawler' }
            };
            const game = createTestGame({ scatterSprites: [enemy] });

            const target = game.getAimAssistTarget({
                originX: 10,
                originZ: 10,
                aimDirX: 1,
                aimDirZ: 0,
                maxDistance: 9.0,
                maxAngle: 15 * (Math.PI / 180)
            });

            expect(target).toBeNull();
        });

        it('soft-snaps aim vector on triggerControllerFire when assist is enabled', () => {
            const enemy = {
                parent: {},
                position: { x: 14, y: 0, z: 10.4 }, // slightly offset
                userData: { type: 'crawler' }
            };
            const game = createTestGame({
                scatterSprites: [enemy],
                aimAssistSetting: 'standard'
            });

            game.triggerControllerFire({ source: 'controller' });

            // Expect aim direction to snap toward the enemy center
            expect(game.aimDirZ).toBeGreaterThan(0);
            expect(game.fireWeaponAtCurrentAim).toHaveBeenCalledWith({ source: 'controller' });
        });

        it('does not snap aim vector when aimAssist is off', () => {
            const enemy = {
                parent: {},
                position: { x: 14, y: 0, z: 10.4 },
                userData: { type: 'crawler' }
            };
            const game = createTestGame({
                scatterSprites: [enemy],
                aimAssistSetting: 'off',
                aimDirX: 1,
                aimDirZ: 0
            });

            game.triggerControllerFire({ source: 'controller' });

            expect(game.aimDirX).toBe(1);
            expect(game.aimDirZ).toBe(0);
        });
    });

    describe('Controller Sticky Friction', () => {
        it('slows sensitivity by 35% (0.65x multiplier) when hovering over enemy hit-box', () => {
            const enemy = {
                parent: {},
                position: { x: 12, y: 0, z: 10 },
                userData: { type: 'crawler' }
            };
            const game = createTestGame({
                scatterSprites: [enemy],
                aimAssistSetting: 'standard',
                getWorldAimPoint: vi.fn(() => ({ x: 12.2, y: 0, z: 10.1 })) // within 1.25m
            });

            const friction = game.getControllerAimFriction(100, 100);
            expect(friction).toBe(0.65);
        });

        it('returns normal 1.0 friction when not hovering over an enemy', () => {
            const enemy = {
                parent: {},
                position: { x: 12, y: 0, z: 10 },
                userData: { type: 'crawler' }
            };
            const game = createTestGame({
                scatterSprites: [enemy],
                aimAssistSetting: 'standard',
                getWorldAimPoint: vi.fn(() => ({ x: 20, y: 0, z: 20 })) // far away
            });

            const friction = game.getControllerAimFriction(100, 100);
            expect(friction).toBe(1.0);
        });

        it('returns normal 1.0 friction when aimAssist is off even if hovering over enemy', () => {
            const enemy = {
                parent: {},
                position: { x: 12, y: 0, z: 10 },
                userData: { type: 'crawler' }
            };
            const game = createTestGame({
                scatterSprites: [enemy],
                aimAssistSetting: 'off',
                getWorldAimPoint: vi.fn(() => ({ x: 12.2, y: 0, z: 10.1 }))
            });

            const friction = game.getControllerAimFriction(100, 100);
            expect(friction).toBe(1.0);
        });
    });

    describe('Pacing & Reduced Pressure Mode', () => {
        it('lengthens boss attack telegraph windup by +20% when reducedPressure is enabled', () => {
            const sprite = { position: { x: 5, y: 0, z: 5 }, userData: { type: 'boss_cybersnail' } };
            const event = { attack: 'mortar_volley', duration: 1.0 };

            const standardGame = createTestGame({ reducedPressure: false });
            standardGame.telegraphBiomeBossAttack(sprite, event);

            expect(globalThis.window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: expect.objectContaining({ windupMs: 1000 })
                })
            );

            globalThis.window.dispatchEvent.mockClear();

            const assistedGame = createTestGame({ reducedPressure: true });
            assistedGame.telegraphBiomeBossAttack(sprite, event);

            expect(globalThis.window.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: expect.objectContaining({ windupMs: 1200 })
                })
            );
        });
    });
});
