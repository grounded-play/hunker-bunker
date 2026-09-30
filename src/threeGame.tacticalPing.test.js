import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { mapBrowserGamepad } from './browserGamepad.js';

beforeEach(() => {
    vi.stubGlobal('THREE', THREE);
    vi.stubGlobal('window', {
        dispatchEvent: vi.fn(),
        objectiveRegistry: {
            trackObjective: vi.fn(),
            resolveObjective: vi.fn()
        },
        AudioManager: { play: vi.fn() }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function createMockGame({ isMultiplayer = false } = {}) {
    const emitted = [];
    const game = {
        isMultiplayer,
        netSocket: {
            emit: (event, payload) => emitted.push({ event, payload })
        },
        player: { position: { x: 10, y: 0, z: 10 } },
        isGameplayInputActive: () => true,
        scene: new THREE.Scene(),
        scatterSprites: [],
        pickupMeshes: [],
        aimDirX: 1,
        aimDirZ: 0,
        transientEffects: [],
        addTransientEffect(effect) {
            this.transientEffects.push(effect);
        },
        isEnemyType: (type) => ['crawler', 'spitter', 'boss'].includes(type),
        getTerrainHeightAt: () => 0
    };

    for (const method of [
        'triggerTacticalPing',
        'spawnTacticalPingMarker',
        'broadcastSharedWorldEvent',
        'handleSharedWorldEvent'
    ]) {
        game[method] = ThreeGame.prototype[method];
    }

    return { game, emitted };
}

describe('Tactical Context Pings v1', () => {
    it('pings terrain point when aiming at open ground', () => {
        const { game } = createMockGame();
        const success = game.triggerTacticalPing();
        expect(success).toBe(true);
        expect(game.transientEffects).toHaveLength(1);
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'tactical-ping-alert',
            detail: expect.objectContaining({ kind: 'point', label: 'TACTICAL PING' })
        }));
        expect(window.objectiveRegistry.trackObjective).toHaveBeenCalledWith(expect.objectContaining({
            source: 'tactical-ping',
            label: 'TACTICAL PING'
        }));
        expect(window.AudioManager.play).toHaveBeenCalledWith('ui_scan_ping', expect.objectContaining({ volume: 0.45 }));
    });

    it('contextually tags enemies and snaps ping location', () => {
        const { game } = createMockGame();
        const enemy = {
            position: { x: 15, y: 0, z: 10 },
            userData: { type: 'crawler', scatterKey: 'enemy_42', hp: 10 }
        };
        game.scatterSprites = [enemy];

        game.triggerTacticalPing();
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'tactical-ping-alert',
            detail: expect.objectContaining({
                kind: 'enemy',
                targetId: 'enemy_42',
                label: 'TARGET: CRAWLER',
                x: 15,
                z: 10
            })
        }));
        expect(window.AudioManager.play).toHaveBeenCalledWith('ui_scan_ping', expect.objectContaining({ playbackRate: 1.3 }));
    });

    it('contextually tags supply items and snaps ping location', () => {
        const { game } = createMockGame();
        // Point aim at z = 5
        game.aimDirX = 0;
        game.aimDirZ = -1;
        const pickup = {
            position: { x: 10, y: 0, z: 5 },
            userData: { item: { name: 'Titanium Scrap' } }
        };
        game.pickupMeshes = [pickup];

        game.triggerTacticalPing();
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'tactical-ping-alert',
            detail: expect.objectContaining({
                kind: 'item',
                label: 'SUPPLIES: TITANIUM SCRAP',
                x: 10,
                z: 5
            })
        }));
    });

    it('broadcasts tactical ping over network in multiplayer', () => {
        const { game, emitted } = createMockGame({ isMultiplayer: true });
        game.multiplayerLocalPlayerId = 'peer_alpha';
        game.triggerTacticalPing();

        expect(emitted).toHaveLength(1);
        expect(emitted[0].event).toBe('worldEvent');
        expect(emitted[0].payload.event).toBe('tactical-ping');
        expect(emitted[0].payload.detail).toEqual(expect.objectContaining({
            kind: 'point',
            peerId: 'peer_alpha'
        }));
    });

    it('receiving remote tactical ping spawns beacon marker and audio chime', () => {
        const { game } = createMockGame({ isMultiplayer: true });
        game.handleSharedWorldEvent({
            event: 'tactical-ping',
            detail: { x: 25, z: 30, kind: 'enemy', label: 'TARGET: BOSS' }
        });

        expect(game.transientEffects).toHaveLength(1);
        expect(window.AudioManager.play).toHaveBeenCalledWith('ui_scan_ping', expect.objectContaining({ playbackRate: 1.3 }));
    });

    it('browser gamepad maps tacticalPing to stick click or D-pad', () => {
        const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
        buttons[10] = { pressed: true, value: 1 }; // Left stick click
        const mapped = mapBrowserGamepad({ id: 'Xbox Controller', buttons, axes: [0, 0, 0, 0] });
        expect(mapped.tacticalPing).toBe(true);
    });
});
