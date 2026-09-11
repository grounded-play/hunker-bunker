import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

describe('ThreeGame multiplayer spawn separation & synchronization', () => {
    let mockWindow;

    beforeEach(() => {
        mockWindow = {
            dispatchEvent: vi.fn(),
            AudioManager: {
                play: vi.fn(),
                playMetalStress: vi.fn()
            },
            CustomEvent
        };
        vi.stubGlobal('window', mockWindow);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('getSpawnTile() separation', () => {
        it('uses crash plan assigned spawn when crash plan exists', () => {
            const crashPlan = {
                players: [
                    { id: 'host-socket', isHost: true, spawnX: 12, spawnZ: 14 },
                    { id: 'guest-socket', isHost: false, spawnX: 44, spawnZ: 18 }
                ]
            };

            const hostGame = {
                chunkCellCount: 8,
                chunkSize: 16,
                isMultiplayer: true,
                isMultiplayerHost: true,
                multiplayerLocalPlayerId: 'host-socket',
                multiplayerCrashPlan: crashPlan
            };

            const guestGame = {
                chunkCellCount: 8,
                chunkSize: 16,
                isMultiplayer: true,
                isMultiplayerHost: false,
                multiplayerLocalPlayerId: 'guest-socket',
                multiplayerCrashPlan: crashPlan
            };

            const hostSpawn = ThreeGame.prototype.getSpawnTile.call(hostGame);
            const guestSpawn = ThreeGame.prototype.getSpawnTile.call(guestGame);

            expect(hostSpawn).toEqual({ x: 12, y: 14 });
            expect(guestSpawn).toEqual({ x: 44, y: 18 });
            expect(Math.hypot(hostSpawn.x - guestSpawn.x, hostSpawn.y - guestSpawn.y)).toBeGreaterThan(10);
        });

        it('separates players with squad formation offset when falling back to base spawn', () => {
            const hostGame = {
                chunkCellCount: 8,
                chunkSize: 16,
                isMultiplayer: true,
                isMultiplayerHost: true,
                multiplayerLocalPlayerId: 'host-socket',
                remotePlayers: new Map([['guest-socket', {}]])
            };

            const guestGame = {
                chunkCellCount: 8,
                chunkSize: 16,
                isMultiplayer: true,
                isMultiplayerHost: false,
                multiplayerLocalPlayerId: 'guest-socket',
                remotePlayers: new Map([['host-socket', {}]])
            };

            const hostSpawn = ThreeGame.prototype.getSpawnTile.call(hostGame);
            const guestSpawn = ThreeGame.prototype.getSpawnTile.call(guestGame);

            const distance = Math.hypot(hostSpawn.x - guestSpawn.x, hostSpawn.y - guestSpawn.y);
            expect(distance).toBeGreaterThanOrEqual(2.0);
        });
    });

    describe('Blast door synchronization', () => {
        it('emits network worldEvent on toggleBunkerBlastDoor in multiplayer', () => {
            const emit = vi.fn();
            const fakeGame = {
                isMultiplayer: true,
                netSocket: { emit },
                bunkerBlastDoorState: { open: false, destroyed: false, targetY: 1.4, doorCenterX: 9, doorZ: 9 },
                spawnTextureBurstEffect: vi.fn(),
                broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent
            };

            ThreeGame.prototype.toggleBunkerBlastDoor.call(fakeGame);

            expect(fakeGame.bunkerBlastDoorState.open).toBe(true);
            expect(emit).toHaveBeenCalledWith('worldEvent', {
                event: 'bunker-door-toggled',
                detail: { open: true }
            });
        });

        it('does not re-emit when toggleBunkerBlastDoor is triggered from remote', () => {
            const emit = vi.fn();
            const fakeGame = {
                isMultiplayer: true,
                netSocket: { emit },
                bunkerBlastDoorState: { open: false, destroyed: false, targetY: 1.4, doorCenterX: 9, doorZ: 9 },
                spawnTextureBurstEffect: vi.fn(),
                broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent
            };

            ThreeGame.prototype.toggleBunkerBlastDoor.call(fakeGame, { fromRemote: true });

            expect(fakeGame.bunkerBlastDoorState.open).toBe(true);
            expect(emit).not.toHaveBeenCalled();
        });

        it('opens blast door when a remote squadmate is nearby even if local player is distant', () => {
            const toggleBunkerBlastDoor = vi.fn();
            const fakeGame = {
                bunkerBlastDoorGroup: new THREE.Group(),
                bunkerBlastDoorState: { open: false, destroyed: false, doorCenterX: 9, doorZ: 9, speed: 5, targetY: 1.4, y: 1.4 },
                player: { position: new THREE.Vector3(100, 0, 100) }, // Local player is far away
                remotePlayers: new Map([
                    ['guest-1', { mesh: { position: new THREE.Vector3(9.5, 0, 9.2) } }] // Remote player is next to door
                ]),
                isGameplayInputActive: () => true,
                toggleBunkerBlastDoor
            };

            ThreeGame.prototype.updateBunkerBlastDoor.call(fakeGame, 0.016);

            expect(toggleBunkerBlastDoor).toHaveBeenCalled();
        });
    });

    describe('Destructible wall replication', () => {
        it('emits wall-destroyed worldEvent in multiplayer', () => {
            const emit = vi.fn();
            const fakeWall = {
                userData: { isWall: true, destroyed: false, worldX: 10, worldZ: 12, wallKey: '10,12' },
                position: new THREE.Vector3(10, 0, 12)
            };
            const fakeGame = {
                isMultiplayer: true,
                netSocket: { emit },
                wallMeshes: [fakeWall],
                markWallTileDestroyed: vi.fn(() => ({ tileX: 10, tileZ: 12 })),
                clearWallDecalsForWall: vi.fn(),
                spawnPhysicalBurst: vi.fn(),
                spawnTextureBurstEffect: vi.fn(),
                broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent
            };

            ThreeGame.prototype.destroyWall.call(fakeGame, fakeWall, { source: 'player' });

            expect(emit).toHaveBeenCalledWith('worldEvent', {
                event: 'wall-destroyed',
                detail: {
                    worldX: 10,
                    worldZ: 12,
                    wallKey: '10,12',
                    source: 'player'
                }
            });
        });

        it('handles remote wall-destroyed by finding and destroying the wall mesh with fromRemote', () => {
            const fakeWall = {
                userData: { isWall: true, destroyed: false, worldX: 20, worldZ: 22, wallKey: '20,22' },
                position: new THREE.Vector3(20, 0, 22)
            };
            const destroyWall = vi.fn();
            const fakeGame = {
                multiplayerLocalPlayerId: 'me',
                findWallMeshAt: vi.fn((x, z) => (x === 20 && z === 22 ? fakeWall : null)),
                destroyWall,
                markWallTileDestroyed: vi.fn()
            };

            ThreeGame.prototype.handleSharedWorldEvent.call(fakeGame, {
                event: 'wall-destroyed',
                detail: { worldX: 20, worldZ: 22, wallKey: '20,22', source: 'remote' },
                originId: 'other-player'
            });

            expect(destroyWall).toHaveBeenCalledWith(fakeWall, {
                source: 'remote',
                fromRemote: true,
                force: true
            });
        });
    });

    describe('Procedural door synchronization', () => {
        it('emits procedural-door-toggled in multiplayer', () => {
            const emit = vi.fn();
            const doorState = {
                id: 'door-1',
                chunkKey: '0,0',
                localX: 4,
                localY: 4,
                state: 'closed',
                lock: null
            };
            const fakeGame = {
                isMultiplayer: true,
                netSocket: { emit },
                player: { position: new THREE.Vector3(4, 0, 4) },
                isGameplayInputActive: () => true,
                proceduralDoorStates: new Map([['door-1', doorState]]),
                proceduralDoorMeshes: new Map([['door-1', { userData: {} }]]),
                chunkSize: 16,
                refreshMazeAccessState: vi.fn(),
                mazeAccessState: { credentials: new Set(), defeatedBosses: new Set(), poweredSystems: new Set(), completedObjectives: new Set() },
                broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent
            };

            ThreeGame.prototype.interactWithProceduralDoor.call(fakeGame);

            expect(emit).toHaveBeenCalledWith('worldEvent', expect.objectContaining({
                event: 'procedural-door-toggled',
                detail: expect.objectContaining({
                    doorId: 'door-1',
                    state: 'open'
                })
            }));
        });

        it('replicates remote procedural door state transition in handleSharedWorldEvent', () => {
            const doorState = { id: 'door-2', state: 'closed' };
            const mesh = { userData: { indestructible: true } };
            const fakeGame = {
                multiplayerLocalPlayerId: 'me',
                proceduralDoorStates: new Map([['door-2', doorState]]),
                proceduralDoorMeshes: new Map([['door-2', mesh]])
            };

            ThreeGame.prototype.handleSharedWorldEvent.call(fakeGame, {
                event: 'procedural-door-toggled',
                detail: { doorId: 'door-2', state: 'open', unlocked: true },
                originId: 'remote-socket'
            });

            expect(fakeGame.proceduralDoorStates.get('door-2').state).toBe('open');
            expect(mesh.userData.indestructible).toBe(false);
        });
    });

    describe('Deterministic chunk scatter across operatives', () => {
        it('produces identical candidates and placements regardless of player type', () => {
            const grid = Array.from({ length: 19 }, () => Array.from({ length: 19 }, () => '.'));
            const buildGame = (playerType) => Object.assign(Object.create(ThreeGame.prototype), {
                chunkSize: 19,
                globalSeedOffset: 12345,
                runEntropy: 0,
                playerType,
                crashedShips: [
                    { type: 'TANK', tileX: 9, tileZ: 9, consoleOffset: { x: 0, z: 0 } },
                    { type: 'ENGINEER', tileX: 37, tileZ: 9, consoleOffset: { x: 0, z: 0 } }
                ],
                getRoomTypeGrid: () => Array.from({ length: 19 }, () => Array.from({ length: 19 }, () => null)),
                getBiomeKeyForWorldPosition: () => 'active',
                getChunkLandform: () => null,
                wfcMetadataCache: new Map(),
                _chunkTemplateCache: new Map(),
                getDepthTier: () => 0,
                hashTile: ThreeGame.prototype.hashTile,
                createSeededRandom: ThreeGame.prototype.createSeededRandom
            });

            const gameTank = buildGame('TANK');
            const gameEngineer = buildGame('ENGINEER');

            const placementsTank = gameTank.createChunkScatterPlacements(1, 1, grid);
            const placementsEngineer = gameEngineer.createChunkScatterPlacements(1, 1, grid);

            expect(placementsTank).toEqual(placementsEngineer);
            expect(placementsTank.length).toBeGreaterThan(0);
        });
    });

    describe('Enemy targeting and movement synchronization', () => {
        it('targets closest remote squadmate in selectSnailTarget when closer than host', () => {
            const sprite = {
                position: new THREE.Vector3(20, 0, 20),
                userData: {}
            };
            const hostGame = {
                player: { position: new THREE.Vector3(100, 0, 100) }, // Host is far
                isPlayerDead: false,
                isHiveKinPassive: () => false,
                isMultiplayer: true,
                remotePlayers: new Map([
                    ['guest-socket', {
                        mesh: { position: new THREE.Vector3(22, 0, 20) } // Remote guest is 2 units away
                    }]
                ]),
                selectSnailTarget: ThreeGame.prototype.selectSnailTarget
            };

            const target = hostGame.selectSnailTarget(sprite, null);
            expect(target).not.toBeNull();
            expect(target.type).toBe('player');
            expect(target.id).toBe('guest-socket');
            expect(target.x).toBe(22);
            expect(target.z).toBe(20);
        });

        it('lerps enemy position on non-host client without running autonomous pathfinding', () => {
            const sprite = {
                position: new THREE.Vector3(10, 0, 10),
                userData: {
                    netTargetX: 12,
                    netTargetZ: 10,
                    frozenTimer: 0,
                    knockbackTimer: 0
                }
            };
            const guestGame = {
                isMultiplayer: true,
                isMultiplayerHost: false,
                findSnailPath: vi.fn(),
                selectSnailTarget: vi.fn(),
                updateSnailBehavior: ThreeGame.prototype.updateSnailBehavior
            };

            guestGame.updateSnailBehavior(sprite, 0.05, null);

            // Sprite position should have moved towards netTargetX (12)
            expect(sprite.position.x).toBeGreaterThan(10);
            expect(sprite.position.x).toBeLessThanOrEqual(12);
            // Autonomous pathfinding should not be invoked on guest
            expect(guestGame.findSnailPath).not.toHaveBeenCalled();
            expect(guestGame.selectSnailTarget).not.toHaveBeenCalled();
        });
    });

    describe('Enemy projectile network synchronization', () => {
        it('broadcasts enemy-projectile-spawned from host', () => {
            const emit = vi.fn();
            const hostGame = {
                isMultiplayer: true,
                isMultiplayerHost: true,
                netSocket: { emit },
                broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent,
                scene: new THREE.Group(),
                projectiles: [],
                activeProjectiles: [],
                playerType: 'TANK',
                spawnProjectile: ThreeGame.prototype.spawnProjectile
            };

            hostGame.spawnProjectile({
                x: 15,
                z: 15,
                vx: 1,
                vz: 0,
                damage: 2,
                radius: 0.2,
                isEnemy: true,
                options: { color: 0xff0000 }
            });

            expect(emit).toHaveBeenCalledWith('worldEvent', expect.objectContaining({
                event: 'enemy-projectile-spawned',
                detail: expect.objectContaining({
                    x: 15,
                    z: 15,
                    damage: 2
                })
            }));
        });

        it('suppresses uncoordinated local enemy projectile spawn on non-host client', () => {
            const guestGame = {
                isMultiplayer: true,
                isMultiplayerHost: false,
                projectiles: [],
                activeProjectiles: [],
                scene: new THREE.Group(),
                spawnProjectile: ThreeGame.prototype.spawnProjectile
            };

            guestGame.spawnProjectile({
                x: 15,
                z: 15,
                vx: 1,
                vz: 0,
                isEnemy: true
            });

            expect(guestGame.activeProjectiles.length).toBe(0);
        });

        it('allows guest to spawn enemy projectile when event is received with fromRemote: true', () => {
            const guestGame = {
                isMultiplayer: true,
                isMultiplayerHost: false,
                projectiles: [],
                activeProjectiles: [],
                scene: new THREE.Group(),
                playerType: 'TANK',
                spawnProjectile: ThreeGame.prototype.spawnProjectile
            };

            guestGame.spawnProjectile({
                x: 15,
                z: 15,
                vx: 1,
                vz: 0,
                isEnemy: true,
                options: { fromRemote: true }
            });

            expect(guestGame.activeProjectiles.length).toBe(1);
        });
    });

    describe('Announcement synchronization', () => {
        it('broadcasts bunker-line worldEvent when locally called in multiplayer', () => {
            const emit = vi.fn();
            const fakeGame = {
                isMultiplayer: true,
                netSocket: { emit },
                broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent,
                showBunkerLine: ThreeGame.prototype.showBunkerLine
            };

            fakeGame.showBunkerLine('MOTHERSHIP: CAUTION.');

            expect(emit).toHaveBeenCalledWith('worldEvent', {
                event: 'bunker-line',
                detail: { text: 'MOTHERSHIP: CAUTION.' }
            });
            expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
                type: 'bunker-line',
                detail: { text: 'MOTHERSHIP: CAUTION.', fromRemote: false }
            }));
        });

        it('receives bunker-line via handleSharedWorldEvent and displays without re-broadcasting', () => {
            const emit = vi.fn();
            const fakeGame = {
                isMultiplayer: true,
                netSocket: { emit },
                broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent,
                showBunkerLine: ThreeGame.prototype.showBunkerLine,
                handleSharedWorldEvent: ThreeGame.prototype.handleSharedWorldEvent
            };

            fakeGame.handleSharedWorldEvent({
                event: 'bunker-line',
                detail: { text: 'TRANSMISSION RECEIVED' }
            });

            expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
                type: 'bunker-line',
                detail: { text: 'TRANSMISSION RECEIVED', fromRemote: true }
            }));
            expect(emit).not.toHaveBeenCalled();
        });
    });

    describe('Pickup collection replication', () => {
        it('broadcasts pickup-collected in updatePickups during multiplayer', () => {
            const emit = vi.fn();
            const pickupMesh = {
                position: new THREE.Vector3(5, 0, 5),
                userData: {
                    body: { rotation: { y: 0 }, scale: { setScalar: vi.fn() } },
                    state: 'collecting',
                    collectTimer: 1.0, // Finish collection
                    scale: 1,
                    baseY: 0,
                    type: 'ammo',
                    rarity: { key: 'rare' },
                    pickupId: 'pickup-99'
                }
            };
            const fakeGame = {
                isMultiplayer: true,
                netSocket: { emit },
                player: { position: new THREE.Vector3(5, 0, 5) },
                playerRadius: 0.4,
                playerVitals: { hp: 5, maxHp: 5 },
                pickupMeshes: [pickupMesh],
                resetPickupCoreOpacityForFog: vi.fn(),
                applyFogOfWarOpacity: vi.fn(),
                getFogOfWarVisibility: () => 1,
                broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent,
                updatePickups: ThreeGame.prototype.updatePickups
            };

            fakeGame.updatePickups(0.1, 1000);

            expect(emit).toHaveBeenCalledWith('worldEvent', {
                event: 'pickup-collected',
                detail: expect.objectContaining({
                    x: 5,
                    z: 5,
                    pickupId: 'pickup-99',
                    type: 'ammo',
                    rarity: 'rare'
                })
            });
        });

        it('disposes pickup when remote pickup-collected is received in handleSharedWorldEvent', () => {
            const disposePickup = vi.fn();
            const pickupMesh = {
                position: new THREE.Vector3(7, 0, 7),
                userData: {
                    pickupId: 'pickup-abc',
                    state: 'idle'
                }
            };
            const fakeGame = {
                pickupMeshes: [pickupMesh],
                disposePickup,
                handleSharedWorldEvent: ThreeGame.prototype.handleSharedWorldEvent
            };

            fakeGame.handleSharedWorldEvent({
                event: 'pickup-collected',
                detail: { x: 7, z: 7, pickupId: 'pickup-abc' }
            });

            expect(disposePickup).toHaveBeenCalledWith(pickupMesh);
        });
    });

    describe('Biomechanical door replication', () => {
        it('broadcasts wall-destroyed when biomechanical door is opened', () => {
            const emit = vi.fn();
            const fakeGame = {
                isMultiplayer: true,
                netSocket: { emit },
                player: { position: new THREE.Vector3(10, 0, 10) },
                isPlayerDead: false,
                getTileType: (x, z) => (x === 10 && z === 11 ? 'D' : '.'),
                getWallKey: (x, z) => `${x},${z}`,
                destroyedWallKeys: new Set(),
                markWallTileDestroyed: vi.fn(),
                spawnGearPoofEffect: vi.fn(),
                broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent,
                interactWithBiomechanicalDoor: ThreeGame.prototype.interactWithBiomechanicalDoor
            };

            const opened = fakeGame.interactWithBiomechanicalDoor();
            expect(opened).toBe(true);
            expect(emit).toHaveBeenCalledWith('worldEvent', {
                event: 'wall-destroyed',
                detail: {
                    worldX: 10,
                    worldZ: 11,
                    wallKey: '10,11',
                    source: 'biomechanical_door'
                }
            });
        });
    });
});
