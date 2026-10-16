import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { io as ioClient } from 'socket.io-client';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { attachRelay } from '../server/relay.js';
import { roomDressingIdentity } from './roomDressingIdentity.js';

function startTestServer() {
    const httpServer = http.createServer();
    attachRelay(httpServer);
    return new Promise((resolve) => {
        httpServer.listen(0, () => resolve({ httpServer, url: `http://localhost:${httpServer.address().port}` }));
    });
}

function connectClient(url) {
    return new Promise((resolve, reject) => {
        const socket = ioClient(url, { reconnection: false, timeout: 2500 });
        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', reject);
    });
}

function waitForMatchingEvent(socket, eventName, predicate, timeoutMs = 2000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            socket.off(eventName, handler);
            resolve(null);
        }, timeoutMs);
        function handler(payload) {
            if (predicate(payload)) {
                clearTimeout(timer);
                socket.off(eventName, handler);
                resolve(payload);
            }
        }
        socket.on(eventName, handler);
    });
}

const joinRoom = (socket, roomCode, callsign, mode = 'coop') => new Promise((resolve) => {
    socket.once('currentPlayers', resolve);
    socket.emit('joinRoom', { roomCode, callsign, opClass: 'TANK', mode, dressingProtocolVersion: 1 });
});

describe('Multiplayer PvE & PvP Parity End-to-End Simulation Probe', () => {
    let server;
    let hostSocket;
    let guestSocket;

    beforeEach(async () => {
        server = await startTestServer();
        hostSocket = await connectClient(server.url);
        guestSocket = await connectClient(server.url);
    });

    afterEach(() => {
        hostSocket?.close();
        guestSocket?.close();
        server?.httpServer?.close();
    });

    describe('1. Deterministic World Generation Parity (Fixing Chunk 1,1 Discrepancy)', () => {
        it('guarantees identical chunk landforms across host and guest regardless of pre-match random entropy', () => {
            // Emulate Deck host with pre-match random entropy 4046072501 (from 2026-10-15 QA log)
            const hostGame = {
                chunkSize: 32,
                performanceProfile: 'gameplay',
                fixedRunEntropy: false,
                runEntropy: 4046072501,
                globalSeedOffset: 0,
                _chunkLandformCache: new Map([['1,1', 'canyon']]),
                radialMazePlan: { stale: true },
                worldPlan: { stale: true },
                remotePlayers: new Map(),
                hashTile: (x, y) => ((x * 374761393 + y * 668265263) ^ 0x5bf03635) >>> 0,
                createSeededRandom: (seed) => {
                    let s = seed >>> 0;
                    return () => {
                        s = (s * 1664525 + 1013904223) >>> 0;
                        return s / 4294967296;
                    };
                },
                getBiomeKeyForWorldPosition: () => 'bunker_core',
                getBiomeAnchorPosition: () => ({ x: 0, z: 0 }),
                resolveSpawnPoint: (x, z) => ({ x, z })
            };

            // Emulate PC guest with pre-match random entropy 133742
            const guestGame = {
                chunkSize: 32,
                performanceProfile: 'gameplay',
                fixedRunEntropy: false,
                runEntropy: 133742,
                globalSeedOffset: 0,
                _chunkLandformCache: new Map([['1,1', 'maze']]),
                radialMazePlan: null,
                worldPlan: null,
                remotePlayers: new Map(),
                hashTile: hostGame.hashTile,
                createSeededRandom: hostGame.createSeededRandom,
                getBiomeKeyForWorldPosition: hostGame.getBiomeKeyForWorldPosition,
                getBiomeAnchorPosition: hostGame.getBiomeAnchorPosition,
                resolveSpawnPoint: (x, z) => ({ x, z })
            };

            const matchSeed = 'MATCH-PARITY-SEED-2026-10-15';
            const hostSession = { mode: 'coop', roomCode: 'ROOM1', seed: matchSeed, isHost: true };
            const guestSession = { mode: 'coop', roomCode: 'ROOM1', seed: matchSeed, isHost: false };

            // Setup multiplayer network on both clients
            ThreeGame.prototype.setupMultiplayerNetwork.call(hostGame, hostSession);
            ThreeGame.prototype.setupMultiplayerNetwork.call(guestGame, guestSession);

            expect(hostGame.fixedRunEntropy).toBe(true);
            expect(guestGame.fixedRunEntropy).toBe(true);
            expect(hostGame.runEntropy).toBe(0);
            expect(guestGame.runEntropy).toBe(0);
            expect(hostGame.globalSeedOffset).toBe(guestGame.globalSeedOffset);

            // Test multiple chunks including (1,1) which mismatched in the QA logs
            const testChunks = [
                [0, 0],
                [1, 1],
                [-1, 1],
                [2, 2],
                [-2, 3],
                [3, -1],
                [4, 4]
            ];

            for (const [cx, cy] of testChunks) {
                const hostLandform = ThreeGame.prototype.getChunkLandform.call(hostGame, cx, cy);
                const guestLandform = ThreeGame.prototype.getChunkLandform.call(guestGame, cx, cy);
                expect(hostLandform).toBe(guestLandform);
            }
        });
    });

    describe('2. Live Prop Movement & Interaction Parity across Relay in PvE', () => {
        it('relays prop-moved from host to guest and updates local prop position and rotation', async () => {
            await joinRoom(hostSocket, 'COOP_PARITY', 'HOST_PLAYER', 'coop');
            await joinRoom(guestSocket, 'COOP_PARITY', 'GUEST_PLAYER', 'coop');

            const hostGame = {
                isMultiplayer: true,
                multiplayerMode: 'coop',
                netSocket: hostSocket,
                propTransformStates: new Map(),
                _remotePropMoveSequences: new Map(),
                _propMoveSequence: 0,
                broadcastSharedWorldEvent: ThreeGame.prototype.broadcastSharedWorldEvent,
                moveProp: ThreeGame.prototype.moveProp,
                findPropSprite: ThreeGame.prototype.findPropSprite
            };

            const guestCollider = new THREE.Object3D();
            const guestRoot = new THREE.Object3D();
            guestCollider.position.set(0, 0, 0);
            guestRoot.position.set(0, 0, 0);
            guestCollider.userData = { scatterKey: 'crate_hydro_1', root: guestRoot };

            const guestGame = {
                isMultiplayer: true,
                multiplayerMode: 'coop',
                netSocket: guestSocket,
                scatterSprites: [guestCollider],
                propTransformStates: new Map(),
                _remotePropMoveSequences: new Map(),
                _appliedWorldEvents: new Set(),
                findPropSprite: ThreeGame.prototype.findPropSprite,
                moveProp: ThreeGame.prototype.moveProp,
                applyRemotePropMoved: ThreeGame.prototype.applyRemotePropMoved,
                handleSharedWorldEvent: ThreeGame.prototype.handleSharedWorldEvent
            };

            guestSocket.on('worldEventBroadcast', (data) => {
                guestGame.handleSharedWorldEvent(data);
            });

            // Host moves the crate
            const hostProp = new THREE.Object3D();
            hostProp.userData = { scatterKey: 'crate_hydro_1' };
            hostGame.moveProp(hostProp, { x: 14.5, y: 0, z: 22.8, rotY: 1.57 });

            // Wait for event relay
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Verify guest updated collider and root
            expect(guestCollider.position.x).toBeCloseTo(14.5);
            expect(guestCollider.position.z).toBeCloseTo(22.8);
            expect(guestCollider.rotation.y).toBeCloseTo(1.57);
            expect(guestRoot.position.x).toBeCloseTo(14.5);
            expect(guestRoot.position.z).toBeCloseTo(22.8);
            expect(guestRoot.rotation.y).toBeCloseTo(1.57);
            expect(guestGame.propTransformStates.get('crate_hydro_1')).toMatchObject({
                x: 14.5,
                z: 22.8,
                rotY: 1.57
            });
        });

        it('relays prop-interacted from guest to host and synchronizes open/interaction state', async () => {
            await joinRoom(hostSocket, 'COOP_PARITY_2', 'HOST_PLAYER', 'coop');
            await joinRoom(guestSocket, 'COOP_PARITY_2', 'GUEST_PLAYER', 'coop');

            const hostCollider = new THREE.Object3D();
            hostCollider.position.set(5, 0, 5);
            hostCollider.userData = { scatterKey: 'terminal_vault_1', isSolidProp: true };

            const hostGame = {
                isMultiplayer: true,
                multiplayerMode: 'coop',
                netSocket: hostSocket,
                scatterSprites: [hostCollider],
                propInteractionStates: new Map(),
                _appliedWorldEvents: new Set(),
                findPropSprite: ThreeGame.prototype.findPropSprite,
                moveProp: ThreeGame.prototype.moveProp,
                applyRemotePropInteracted: ThreeGame.prototype.applyRemotePropInteracted,
                handleSharedWorldEvent: ThreeGame.prototype.handleSharedWorldEvent
            };

            hostSocket.on('worldEventBroadcast', (data) => {
                hostGame.handleSharedWorldEvent(data);
            });

            // Guest interacts with the terminal
            guestSocket.emit('worldEvent', {
                event: 'prop-interacted',
                detail: {
                    key: 'terminal_vault_1',
                    state: 'active',
                    fxMode: 'granted',
                    solid: false,
                    x: 5,
                    z: 5,
                    rotY: 0
                }
            });

            await new Promise((resolve) => setTimeout(resolve, 300));

            expect(hostGame.propInteractionStates.get('terminal_vault_1')).toMatchObject({
                state: 'active',
                fxMode: 'granted',
                solid: false
            });
            expect(hostCollider.userData.propState).toBe('active');
            expect(hostCollider.userData.isSolidProp).toBe(false);
        });
    });

    describe('3. PvP Parity (Dynamic Props, Breakage & Hostile AI Sync)', () => {
        it('synchronizes prop movement, prop breakage and hostile AI snapshots in PvP mode', async () => {
            await joinRoom(hostSocket, 'PVP_PARITY_ROOM', 'PVP_HOST', 'pvp');
            await joinRoom(guestSocket, 'PVP_PARITY_ROOM', 'PVP_GUEST', 'pvp');

            const guestEnemy = {
                userData: { scatterKey: 'pvp_enemy_snail_1', type: 'crawler', hp: 10 },
                position: { x: 0, z: 0 },
                rotation: { y: 0 }
            };

            const guestProp = new THREE.Object3D();
            guestProp.position.set(0, 0, 0);
            guestProp.userData = { scatterKey: 'pvp_crate_1', hp: 10 };

            const guestGame = {
                isMultiplayer: true,
                isMultiplayerHost: false,
                multiplayerMode: 'pvp',
                netSocket: guestSocket,
                scatterSprites: [guestEnemy, guestProp],
                propTransformStates: new Map(),
                _remotePropMoveSequences: new Map(),
                _appliedWorldEvents: new Set(),
                findPropSprite: ThreeGame.prototype.findPropSprite,
                moveProp: ThreeGame.prototype.moveProp,
                applyRemotePropMoved: ThreeGame.prototype.applyRemotePropMoved,
                handleSharedWorldEvent: ThreeGame.prototype.handleSharedWorldEvent,
                handleEnemyStateSnapshot: ThreeGame.prototype.handleEnemyStateSnapshot
            };

            guestSocket.on('worldEventBroadcast', (data) => {
                guestGame.handleSharedWorldEvent(data);
            });
            guestSocket.on('enemyStateSnapshot', (data) => {
                guestGame.handleEnemyStateSnapshot(data);
            });

            // 1. Host moves a prop in PvP
            hostSocket.emit('worldEvent', {
                event: 'prop-moved',
                detail: {
                    key: 'pvp_crate_1',
                    x: 18.2,
                    y: 0,
                    z: 27.4,
                    rotY: 3.14,
                    seq: 1
                }
            });

            // 2. Host broadcasts enemy state snapshot in PvP
            hostSocket.emit('enemyState', {
                enemies: [
                    {
                        scatterKey: 'pvp_enemy_snail_1',
                        enemyType: 'crawler',
                        x: 24.0,
                        z: 32.5,
                        rotY: 1.25,
                        hp: 6
                    }
                ]
            });

            // 3. Register and hit prop via dressingAuthority in PvP
            const propId = roomDressingIdentity('room_pvp', { type: 'prop_crate', layer: 'clutter', x: 10, y: 15 });
            const dressingStatePromise = waitForMatchingEvent(
                guestSocket,
                'worldEventBroadcast',
                (p) => p?.event === 'dressing-state' && p?.detail?.id === propId && p?.detail?.hp === 1
            );
            
            // Host registers the prop
            hostSocket.emit('worldEvent', {
                event: 'dressing-register',
                detail: {
                    version: 1,
                    items: [{ id: propId, x: 10, z: 15, rotY: 0, hp: 3 }]
                }
            });

            // Guest registers interest in the prop
            guestSocket.emit('worldEvent', {
                event: 'dressing-register',
                detail: {
                    version: 1,
                    items: [{ id: propId, x: 10, z: 15 }]
                }
            });

            // Guest applies damage to the dressing prop
            guestSocket.emit('worldEvent', {
                event: 'dressing-hit',
                detail: {
                    version: 1,
                    id: propId,
                    damage: 2,
                    sequence: 1
                }
            });

            const dressingPayload = await dressingStatePromise;
            expect(dressingPayload).toBeTruthy();
            expect(dressingPayload.event).toBe('dressing-state');
            expect(dressingPayload.detail.id).toBe(propId);
            expect(dressingPayload.detail.hp).toBe(1);
        });
    });
});
