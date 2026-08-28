import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { CLIFF_TILE, EXTERIOR_CANYON_TILE, ThreeGame } from './threeGame.js';

describe('Gameplay regressions: damage, oxygen, and cliff falling', () => {
    let originalWindow;
    let originalDocument;

    beforeEach(() => {
        originalWindow = globalThis.window;
        originalDocument = globalThis.document;
        globalThis.window = {
            dispatchEvent: vi.fn(),
            CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
        };
        globalThis.document = {
            getElementById: vi.fn().mockReturnValue(null)
        };
    });

    afterEach(() => {
        globalThis.window = originalWindow;
        globalThis.document = originalDocument;
    });

    describe('takeDamage with inactive mission', () => {
        it('applies damage when missionState is inactive', () => {
            const fakeGame = {
                isPlayerDead: false,
                isPlayerDowned: false,
                performanceProfile: 'gameplay',
                godMode: false,
                noclip: false,
                cinematicLock: false,
                isInPocket: false,
                iFrameTimer: 0,
                missionState: { type: null, label: '', status: 'inactive' },
                playerVitals: { hp: 100, maxHp: 100 },
                loadoutMods: {},
                healPlayer: vi.fn(),
                emitPlayerDamaged: vi.fn(),
                emitHealthState: vi.fn(),
                updatePlayerVitalsUI: vi.fn()
            };

            const damaged = ThreeGame.prototype.takeDamage.call(fakeGame, 10, 'hazard');
            expect(damaged).toBe(true);
            expect(fakeGame.playerVitals.hp).toBe(90);
        });
    });

    describe('PvP damage scale conversion', () => {
        it('converts a standard 10-point server hit to one local heart', () => {
            const fakeGame = {
                netSocket: { id: 'local-player' },
                playerVitals: { hp: 3, maxHp: 3 },
                takeDamage: vi.fn()
            };

            ThreeGame.prototype.handleRemotePlayerDamaged.call(fakeGame, {
                targetId: 'local-player',
                damage: 10
            });

            expect(fakeGame.takeDamage).toHaveBeenCalledWith(1, 'pvp-rival');
        });

        it('preserves legacy damage values already expressed in hearts', () => {
            const fakeGame = {
                netSocket: { id: 'local-player' },
                playerVitals: { hp: 3, maxHp: 3 },
                takeDamage: vi.fn()
            };

            ThreeGame.prototype.handleRemotePlayerDamaged.call(fakeGame, {
                targetId: 'local-player',
                damage: 2
            });

            expect(fakeGame.takeDamage).toHaveBeenCalledWith(2, 'pvp-rival');
        });
    });

    describe('updateVitals oxygen drain with inactive mission', () => {
        it('depletes oxygen over time when outside safe bubble even if missionState is inactive', () => {
            const fakeGame = {
                player: new THREE.Object3D(),
                isPlayerDead: false,
                falseTelemetryTimer: 0,
                cinematicLock: false,
                godMode: false,
                missionState: { type: null, label: '', status: 'inactive' },
                playerVitals: { o2: 100, maxO2: 100, o2HealthTimer: 0 },
                getO2GeneratorState: () => ({ isOnline: true, radius: 5, refillRate: 5 }),
                getActiveO2GeneratorDistance: () => 20, // Outside bubble
                hasUpgrade: () => false,
                bank: { getState: () => ({ tier2Unlocks: {} }), isSkillUnlocked: () => false },
                getRunCardEffects: () => ({}),
                emitO2State: vi.fn(),
                o2DispatchTimer: 0
            };

            ThreeGame.prototype.updateVitals.call(fakeGame, 1.0);
            expect(fakeGame.playerVitals.o2).toBeLessThan(100);
            expect(fakeGame.emitO2State).toHaveBeenCalled();
        });
    });

    describe('canOccupyPosition and cliff falling', () => {
        it('allows movement onto CLIFF_TILE and EXTERIOR_CANYON_TILE so fall detection can trigger', () => {
            const tiles = new Map([
                ['0,0', '.'],
                ['1,0', CLIFF_TILE],
                ['2,0', EXTERIOR_CANYON_TILE]
            ]);

            const fakeGame = {
                crashedShips: [],
                scatterSprites: [],
                isInPocket: false,
                playerRadius: 0.3,
                wallCollisionHalfSize: 0.3,
                wallCollisionPadding: 0.3,
                getTileType: (x, z) => tiles.get(`${x},${z}`) ?? '.',
                isHoleTile: () => false,
                isFilledHoleTile: () => false,
                overlapsWall: ThreeGame.prototype.overlapsWall
            };

            // Player can occupy the cliff/canyon tile positions
            expect(ThreeGame.prototype.canOccupyPosition.call(fakeGame, 1.0, 0.0)).toBe(true);
            expect(ThreeGame.prototype.canOccupyPosition.call(fakeGame, 2.0, 0.0)).toBe(true);
        });

        it('triggers isPlayerOverAnyHole when player steps onto cliff or canyon tile', () => {
            const tiles = new Map([
                ['0,0', '.'],
                ['1,0', CLIFF_TILE],
                ['2,0', EXTERIOR_CANYON_TILE]
            ]);

            const fakeGame = {
                getTileType: (x, z) => tiles.get(`${x},${z}`) ?? '.',
                getCachedTileType: (x, z) => tiles.get(`${x},${z}`) ?? '.',
                getWallKey: (x, z) => `${x},${z}`,
                filledHoleKeys: new Set(),
                isCliffSecretPath: () => false,
                getHoleVisualInfo: ThreeGame.prototype.getHoleVisualInfo,
                isPlayerOverAnyHole: ThreeGame.prototype.isPlayerOverAnyHole
            };

            // Standing safely on floor (0, 0)
            expect(fakeGame.isPlayerOverAnyHole(0.0, 0.0)).toBe(false);

            // Stepped over cliff at (1, 0)
            expect(fakeGame.isPlayerOverAnyHole(1.0, 0.0)).toBe(true);

            // Crossing the rendered lip must start the fall immediately;
            // waiting until the tile center makes the edge feel like an
            // invisible wall or leaves a narrow walkable shelf over the void.
            expect(fakeGame.isPlayerOverAnyHole(0.51, 0.0)).toBe(true);
            expect(fakeGame.isPlayerOverAnyHole(0.47, 0.0)).toBe(false);

            // Stepped over canyon at (2, 0)
            expect(fakeGame.isPlayerOverAnyHole(2.0, 0.0)).toBe(true);
        });
    });
});
