import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { generateRadialMazeExpedition } from './mazeExpedition.js';
import { buildWorldPlan } from './ringManifest.js';
import {
    MILESTONE_BOSS_STATES,
    createMilestoneBossLifecycleState
} from './milestoneBossLifecycle.js';

function topologyEdgeOpening(worldPlan, axis, edgeX, edgeY) {
    const left = axis === 'horizontal'
        ? `${edgeX},${edgeY - 1}`
        : `${edgeX - 1},${edgeY}`;
    const right = `${edgeX},${edgeY}`;
    return {
        open: worldPlan.topology.routeEdges.includes([left, right].sort().join('|')),
        offset: 12
    };
}

function authoredBuildFixture(worldPlan) {
    return {
        chunkSize: 49,
        chunkCellCount: 24,
        performanceProfile: 'gameplay',
        createSeededRandom: ThreeGame.prototype.createSeededRandom,
        getEdgeOpening: (axis, edgeX, edgeY) => topologyEdgeOpening(worldPlan, axis, edgeX, edgeY),
        ensureChunkPortals: ThreeGame.prototype.ensureChunkPortals,
        widenChunkCorridors: ThreeGame.prototype.widenChunkCorridors,
        runMazeDetailPass: ThreeGame.prototype.runMazeDetailPass,
        clearSpawnArea: ThreeGame.prototype.clearSpawnArea,
        getDepthTier: () => 1,
        isInTutorialRing: () => false,
        getChunkLandform: () => 'maze',
        getLandformType: () => 'maze',
        getWallKey: (x, z) => `${x},${z}`,
        hashTile: ThreeGame.prototype.hashTile,
        runEntropy: 42,
        chunkCache: new Map(),
        wfcMetadataCache: new Map(),
        authoredWorldTiles: true,
        worldPlan,
        getRadialMazePlan: () => ({ topology: worldPlan.topology, blockers: [], nodes: [], roomClusters: [], radii: [] }),
        ensureAuthoredWorldPlan: () => worldPlan,
        getActiveAuthoredReservationIds: () => new Set(),
        getBiomeKeyForWorldPosition: () => 'ACTIVE',
        bank: { getState: () => ({ unlocks: {} }) },
        mazeAccessState: { completedObjectives: new Set() },
        completedRingCrossingMissionIds: new Set(),
        milestoneBossLifecycleState: createMilestoneBossLifecycleState(),
        ringCrossingState: null,
        proceduralDoorStates: new Map(),
        getBuiltGoalKeys: ThreeGame.prototype.getBuiltGoalKeys,
        reconcileAuthoredWorldProgression: ThreeGame.prototype.reconcileAuthoredWorldProgression
    };
}

describe('threeGame authored expedition runtime integration', () => {
    describe('milestone boss lifecycle reconciliation', () => {
        it('reconciles not_ready, ready_to_stage, active, and defeated states', () => {
            const fakeThis = {
                bank: {
                    getState: () => ({
                        unlocks: {
                            o2Bubble: true,
                            hullExpansion: true,
                            radarNode: false,
                            reactorCompressor: false
                        }
                    })
                },
                defeatedMilestoneBosses: new Set(['o2Bubble']),
                activeBoss: {
                    parent: {},
                    userData: {
                        sourceGoalKey: 'hullExpansion'
                    }
                }
            };

            const report = ThreeGame.prototype.reconcileMilestoneBossLifecycle.call(fakeThis);
            expect(report.o2Bubble.status).toBe('defeated');
            expect(report.hullExpansion.status).toBe('active');
            expect(report.radarNode.status).toBe('not_ready');
            expect(report.reactorCompressor.status).toBe('not_ready');
        });

        it('does not treat a detached stale boss sprite as a live milestone encounter', () => {
            const fakeThis = {
                bank: { getState: () => ({ unlocks: { o2Bubble: true } }) },
                defeatedMilestoneBosses: new Set(),
                scatterSprites: [],
                activeBoss: {
                    parent: null,
                    userData: { sourceGoalKey: 'o2Bubble' }
                }
            };

            const report = ThreeGame.prototype.reconcileMilestoneBossLifecycle.call(fakeThis);
            expect(report.o2Bubble.status).toBe('ready_to_stage');
        });

        it('shows ready_to_stage when goal is unlocked but boss is not active and not defeated', () => {
            const fakeThis = {
                bank: {
                    getState: () => ({
                        unlocks: {
                            o2Bubble: true
                        }
                    })
                },
                defeatedMilestoneBosses: new Set(),
                activeBoss: null
            };

            const report = ThreeGame.prototype.reconcileMilestoneBossLifecycle.call(fakeThis);
            expect(report.o2Bubble.status).toBe('ready_to_stage');
        });
    });

    describe('containment zones and safe havens', () => {
        it('identifies position inside camp safe haven', () => {
            const fakeThis = {
                camps: [
                    {
                        id: 'camp_meridian',
                        position: { x: 50, z: 100 }
                    }
                ],
                wfcMetadataCache: new Map(),
                getActiveContainmentZones: ThreeGame.prototype.getActiveContainmentZones
            };

            expect(ThreeGame.prototype.isPositionInSafeZone.call(fakeThis, 53, 103)).toBe(true);
            expect(ThreeGame.prototype.isPositionInSafeZone.call(fakeThis, 200, 200)).toBe(false);
        });

        it('does not grant safe-haven immunity to hostile Act 2 camps', () => {
            const fakeThis = {
                camps: [{ id: 'camp_meridian', position: { x: 50, z: 100 } }],
                wfcMetadataCache: new Map(),
                isAct2Active: () => true,
                getCampRecord: () => ({ status: 'alive' })
            };

            const zones = ThreeGame.prototype.getActiveContainmentZones.call(fakeThis);
            expect(zones).toEqual([]);
        });

        it('prevents hostile enemy aggro when player is in safe haven', () => {
            const fakeThis = {
                player: { position: { x: 50, z: 100 } }, // inside camp
                camps: [
                    { id: 'camp_meridian', position: { x: 50, z: 100 } }
                ],
                wfcMetadataCache: new Map(),
                proceduralDoorStates: new Map(),
                getActiveContainmentZones: ThreeGame.prototype.getActiveContainmentZones,
                getActiveDoors: ThreeGame.prototype.getActiveDoors
            };

            const enemy = { position: { x: 80, z: 120 } }; // outside camp
            expect(ThreeGame.prototype.canEnemyTargetPlayer.call(fakeThis, enemy)).toBe(false);
        });
    });

    describe('objective registry compass arbitration', () => {
        it('allows priority-50 lore through after bespoke critical objectives', () => {
            const previousWindow = globalThis.window;
            globalThis.window = {
                objectiveRegistry: {
                    getCompassTarget: () => ({
                        x: 12,
                        z: 5,
                        priority: 50,
                        source: 'lore',
                        label: 'ARCHIVE SIGNAL'
                    })
                }
            };
            const fakeThis = {
                player: { position: { x: 2, z: 5 } },
                _compassCorruptUntil: 0,
                _blackBoxMarkerActive: false,
                caveEntrance: null,
                foundry: null,
                syncActiveCampQuestObjectiveTarget: () => null,
                planarAngleTo: () => 90
            };
            try {
                expect(ThreeGame.prototype.getRadarCompassState.call(fakeThis)).toEqual({
                    active: true,
                    mode: 'lore',
                    label: 'ARCHIVE SIGNAL',
                    angle: 90,
                    distance: 10
                });
            } finally {
                globalThis.window = previousWindow;
            }
        });
    });

    describe('authored-world persistence rollback policy', () => {
        it('does not let an enabled save override a currently disabled runtime flag', () => {
            const fakeThis = {
                authoredWorldTiles: false,
                worldPlan: { seed: 7, version: 1 },
                getBuiltGoalKeys: () => new Set(),
                applyMilestoneBossRuntimeEvent: () => null,
                reconcileAuthoredWorldProgression: () => null
            };

            expect(ThreeGame.prototype.restoreMazePersistenceState.call(fakeThis, {
                generationVersion: 2,
                access: {},
                doors: [],
                authoredWorld: {
                    enabled: true,
                    seed: 7,
                    version: 1,
                    completedMissionIds: ['restore_ring_power']
                }
            })).toBe(true);
            expect(fakeThis.authoredWorldTiles).toBe(false);
            expect(fakeThis.worldPlan).toBeNull();
            expect(fakeThis.completedRingCrossingMissionIds).toEqual(new Set(['restore_ring_power']));
        });

        it('fails closed when a restored authored plan identity does not match', () => {
            const fakeThis = {
                authoredWorldTiles: true,
                worldPlan: { seed: 8, version: 1 },
                _worldPlanInjected: true,
                _restoredAuthoredWorldIdentity: { seed: 7, version: 1 }
            };

            expect(ThreeGame.prototype.ensureAuthoredWorldPlan.call(fakeThis)).toBeNull();
            expect(fakeThis.authoredWorldTiles).toBe(false);
            expect(fakeThis.worldPlan).toBeNull();
        });
    });

    describe('takeDamage containment clamping', () => {
        it('absorbs damage when attack origin is outside and player is in safe haven', () => {
            const fakeThis = {
                isPlayerDead: false,
                godMode: false,
                cinematicLock: false,
                isInPocket: false,
                iFrameTimer: 0,
                missionState: { status: 'active' },
                player: { position: { x: 10, z: 10 } },
                playerVitals: { hp: 5, maxHp: 5 },
                camps: [{ id: 'camp_meridian', position: { x: 10, z: 10 } }],
                wfcMetadataCache: new Map(),
                proceduralDoorStates: new Map(),
                getActiveContainmentZones: ThreeGame.prototype.getActiveContainmentZones,
                getActiveDoors: ThreeGame.prototype.getActiveDoors
            };

            // Attack from outside safe zone (x: 100, z: 100) toward safe zone (x: 10, z: 10)
            ThreeGame.prototype.takeDamage.call(fakeThis, 2, 'shockwave', 100, 100);
            expect(fakeThis.playerVitals.hp).toBe(5); // Undamaged
        });

        it('translates chunk-local room containment bounds into world space', () => {
            const cache = new Map();
            cache.set('2,3', {
                roomInstances: [
                    {
                        id: 'medical_safe_room',
                        isSafe: true,
                        bounds: { minX: 5, maxX: 20, minZ: 10, maxZ: 25 }
                    }
                ]
            });
            const fakeThis = {
                chunkSize: 49,
                camps: [],
                wfcMetadataCache: cache
            };
            const zones = ThreeGame.prototype.getActiveContainmentZones.call(fakeThis);
            expect(zones).toHaveLength(1);
            expect(zones[0].bounds).toEqual({
                minX: 2 * 49 + 5,
                maxX: 2 * 49 + 20,
                minZ: 3 * 49 + 10,
                maxZ: 3 * 49 + 25
            });
        });

        it('only protects an authored safe room while its runtime doors are sealed', () => {
            const room = {
                id: 'medical_safe_room',
                isSafe: true,
                bounds: { minX: 5, maxX: 20, minZ: 10, maxZ: 25 },
                doors: [{ id: '2,3:door:0:n' }]
            };
            const fakeThis = {
                chunkSize: 49,
                camps: [],
                wfcMetadataCache: new Map([['2,3', { roomInstances: [room] }]]),
                proceduralDoorStates: new Map([['2,3:door:0:n', { state: 'closed' }]])
            };

            expect(ThreeGame.prototype.getActiveContainmentZones.call(fakeThis)).toHaveLength(1);
            fakeThis.proceduralDoorStates.set('2,3:door:0:n', { state: 'open', open: true });
            expect(ThreeGame.prototype.getActiveContainmentZones.call(fakeThis)).toEqual([]);
        });
    });

    describe('authored room reservation resolution in buildChunk', () => {
        it('activates a persisted camp-quest destination before runtime quest restoration', () => {
            const fakeThis = {
                act2: {
                    getState: () => ({
                        camps: [{
                            id: 'camp_vesper',
                            status: 'alive',
                            questFlags: { armory_breach: 'active', bunker_holdout: 'done' }
                        }],
                        hives: []
                    })
                },
                _activeCampQuest: null
            };

            expect(ThreeGame.prototype.getActiveAuthoredReservationIds.call(fakeThis)).toContain(
                'quest:camp_vesper:armory_breach:destination'
            );
            expect(ThreeGame.prototype.getActiveAuthoredReservationIds.call(fakeThis)).toContain(
                'quest:camp_vesper:bunker_holdout:destination'
            );
        });

        it('uses authored room structure when a worldPlan reservation matches the chunk', () => {
            const fakeThis = {
                chunkSize: 49,
                chunkCellCount: 24,
                createSeededRandom: ThreeGame.prototype.createSeededRandom,
                // One real topology socket lets the single-entry O2 build
                // rotate to fit. Multi-socket incompatibility is covered by
                // authoredWorldRuntime's explicit legacy-fallback tests.
                getEdgeOpening: (axis, _edgeX, edgeY) => ({
                    open: axis === 'horizontal' && edgeY === -1,
                    offset: 12
                }),
                ensureChunkPortals: ThreeGame.prototype.ensureChunkPortals,
                widenChunkCorridors: ThreeGame.prototype.widenChunkCorridors,
                runMazeDetailPass: ThreeGame.prototype.runMazeDetailPass,
                clearSpawnArea: ThreeGame.prototype.clearSpawnArea,
                getDepthTier: () => 1,
                isInTutorialRing: () => false,
                getChunkLandform: () => 'maze',
                getLandformType: () => 'maze',
                getWallKey: (x, z) => `${x},${z}`,
                hashTile: ThreeGame.prototype.hashTile,
                runEntropy: 42,
                chunkCache: new Map(),
                wfcMetadataCache: new Map(),
                authoredWorldTiles: true,
                worldPlan: {
                    reservations: [
                        {
                            id: 'goal:o2Bubble:objective',
                            chunkX: 2,
                            chunkY: -1,
                            chunkKey: '2,-1',
                            roomFamily: 'o2',
                            ring: 1
                        }
                    ]
                }
            };

            const grid = ThreeGame.prototype.buildChunk.call(fakeThis, 2, -1);
            expect(grid).toHaveLength(49);
            const metadata = fakeThis.wfcMetadataCache.get('2,-1');
            expect(metadata).toBeTruthy();
            expect(metadata.structureResult?.generatorId).toBe('authored-room');
            expect(metadata.rooms?.[0]?.family).toBe('o2');
        });

        it('enriches an active camp quest from its reservation before binding exact room content', () => {
            const worldPlan = {
                reservations: [
                    {
                        id: 'quest:camp_vesper:armory_breach:destination',
                        role: 'campObjective',
                        campId: 'camp_vesper',
                        questId: 'armory_breach',
                        chunkX: 2,
                        chunkY: -1,
                        chunkKey: '2,-1',
                        roomFamily: 'armory',
                        objectiveAnchorId: 'armory_lock',
                        ring: 3
                    }
                ]
            };
            const fakeThis = authoredBuildFixture(worldPlan);
            fakeThis.getEdgeOpening = (axis, _edgeX, edgeY) => ({
                open: axis === 'horizontal' && edgeY === -1,
                offset: 12
            });
            fakeThis.getRadialMazePlan = () => null;
            fakeThis._activeCampQuest = {
                campId: 'camp_vesper',
                quest: { id: 'armory_breach', label: 'ARMORY BREACH' }
            };

            ThreeGame.prototype.buildChunk.call(fakeThis, 2, -1);
            const room = fakeThis.wfcMetadataCache.get('2,-1').roomInstances[0];
            expect(room.contentPlan.questProps).toContainEqual(expect.objectContaining({
                questId: 'armory_breach'
            }));
            const armoryControl = room.contentPlan.interactions
                .find((interaction) => interaction.anchorId === 'armory_lock');
            expect(armoryControl).toBeTruthy();
            expect(room.contentPlan.questProps[0]).toMatchObject({
                x: armoryControl.x,
                z: armoryControl.z
            });
        });

        it('stamps the real crossing far-side door and only opens it after all canonical requirements', () => {
            const worldPlan = buildWorldPlan(generateRadialMazeExpedition(200));
            const crossing = worldPlan.ringCrossings[0];
            const fakeThis = authoredBuildFixture(worldPlan);

            const grid = ThreeGame.prototype.buildChunk.call(fakeThis, crossing.chunkX, crossing.chunkY);
            fakeThis.chunkCache.set(crossing.chunkKey, grid);
            const metadata = fakeThis.wfcMetadataCache.get(crossing.chunkKey);
            const crossingDoors = metadata.doors.filter((door) => door.ringCrossingId === crossing.id);
            expect(metadata.generatorId).toBe('authored-room');
            expect(crossingDoors).toHaveLength(1);
            expect(crossingDoors[0]).toMatchObject({ side: 's', state: 'locked' });
            expect(metadata.accessSources).toContainEqual(expect.objectContaining({
                id: `${crossing.id}:mission-control`,
                requirement: expect.objectContaining({ id: crossing.requirements.missionId })
            }));
            expect(fakeThis.proceduralDoorStates.get(crossingDoors[0].id)?.state).toBe('locked');

            fakeThis.bank = { getState: () => ({ unlocks: { [crossing.requirements.goalKey]: true } }) };
            fakeThis.completedRingCrossingMissionIds.add(crossing.requirements.missionId);
            fakeThis.milestoneBossLifecycleState = createMilestoneBossLifecycleState({
                builtGoalKeys: [crossing.requirements.goalKey]
            });
            fakeThis.milestoneBossLifecycleState.milestones[crossing.requirements.milestoneId].status
                = MILESTONE_BOSS_STATES.DEFEATED;

            const opened = ThreeGame.prototype.reconcileAuthoredWorldProgression.call(fakeThis);
            expect(opened.maxUnlockedRing).toBe(2);
            expect(opened.openCrossingIds).toEqual(new Set([crossing.id]));
            expect(fakeThis.proceduralDoorStates.get(crossingDoors[0].id)?.state).toBe('open');
        });
    });
});
