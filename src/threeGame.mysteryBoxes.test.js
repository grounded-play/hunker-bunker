import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';

// Sprint 53 V6: mystery boxes placed per room, opened by standing at them.
function makeGame(over = {}) {
    const game = Object.create(ThreeGame.prototype);
    const grid = Array.from({ length: 12 }, (_, y) => Array.from({ length: 12 }, (_, x) => (x === 0 || y === 0 || x === 11 || y === 11 ? '#' : '.')));
    const interior = [];
    for (let y = 1; y < 11; y++) for (let x = 1; x < 11; x++) interior.push({ x, y });
    const rooms = Array.from({ length: 40 }, (_, i) => ({ id: `r${i}`, interior, populationPlan: { placements: [{ x: 1, y: 1 }] } }));
    const group = new THREE.Group();
    Object.assign(game, {
        chunkSize: 12,
        seed: 42,
        runEntropy: 7,
        wfcMetadataCache: new Map([['3,2', { roomInstances: rooms }]]),
        chunkCache: new Map([['3,2', grid]]),
        chunkMeshes: new Map([['3,2', group]]),
        scatterSprites: [],
        playerType: 'TANK',
        player: { position: new THREE.Vector3(0, 0, 0) },
        isPlayerDead: false,
        getDepthTier: () => 0,
        getBiomeKeyForWorldPosition: () => 'active',
        hashTile: (x, z) => ((x * 73856093) ^ (z * 19349663)) >>> 0,
        createScatterInstance: (p) => {
            const s = new THREE.Sprite(new THREE.SpriteMaterial());
            s.position.set(p.x, 0, p.z);
            s.userData = { type: p.type, scatterKey: p.scatterKey, isDestructibleProp: true, isSolidProp: true };
            return s;
        },
        isGameplayInputActive: () => true,
        spawnDestructiblePropDrops: vi.fn(() => 1),
        maybeSpawnSiteLoreDrop: vi.fn(),
        spawnEnemyInstance: vi.fn(),
        spawnToxicSporePuddle: vi.fn(),
        applyPlayerSlow: vi.fn(),
        spawnPhysicalBurst: vi.fn(),
        showBunkerLine: vi.fn(),
        broadcastSharedWorldEvent: vi.fn(),
        hasCampQuestReward: () => false,
        ...over
    });
    return { game, group };
}

describe('mystery boxes in the world', () => {
    it('places a seeded box in some rooms, never in the crash chunk, never on a planned prop cell', () => {
        const { game, group } = makeGame();
        const placed = game.placeMysteryBoxes(group, 3, 2);
        expect(placed).toBeGreaterThan(2);
        expect(placed).toBeLessThan(16);
        const again = makeGame();
        expect(again.game.placeMysteryBoxes(again.group, 3, 2)).toBe(placed);
        for (const box of game.mysteryBoxes) {
            expect(box.sprite.userData.isDestructibleProp).toBe(false);
            expect(box.sprite.userData.specialVariant).toMatch(/^mystery_/);
            expect(box.sprite.position.x === 3 * 12 + 1 && box.sprite.position.z === 2 * 12 + 1).toBe(false);
        }
        expect(game.placeMysteryBoxes(new THREE.Group(), 0, 0)).toBe(0);
    });

    it('opens by standing at it; walking away cancels', () => {
        const { game, group } = makeGame();
        game.placeMysteryBoxes(group, 3, 2);
        const box = game.mysteryBoxes.find((b) => b.kind !== 'blacksite');
        game.player.position.copy(box.sprite.position).add(new THREE.Vector3(0.2, 0, 0));
        expect(game.interactWithMysteryBox()).toBe(true);
        game.updateMysteryBoxes(0.5);
        expect(box.opened).toBe(false);
        game.player.position.set(-50, 0, -50);
        game.updateMysteryBoxes(0.1);
        expect(game._mysteryOpening).toBeNull();
        game.player.position.copy(box.sprite.position).add(new THREE.Vector3(0.2, 0, 0));
        game.interactWithMysteryBox();
        game.updateMysteryBoxes(5);
        expect(box.opened).toBe(true);
        expect(game.openedMysteryBoxes.has(box.id)).toBe(true);
        expect(game.broadcastSharedWorldEvent).toHaveBeenCalledWith('mystery-box-opened', expect.objectContaining({ id: box.id, outcome: box.outcome }));
        // Opened once: pressing again never starts this box over (a
        // neighbouring box within reach may start instead).
        game.interactWithMysteryBox();
        expect(game._mysteryOpening?.box).not.toBe(box);
        game.mysteryBoxes = [box];
        expect(game.interactWithMysteryBox()).toBe(false);
    });

    it('keeps a black-site lockbox shut without a keycard, unless you are an Engineer', () => {
        const { game, group } = makeGame();
        game.placeMysteryBoxes(group, 3, 2);
        const locked = { id: 'x', kind: 'blacksite', sprite: new THREE.Sprite(), opened: false };
        game.mysteryBoxes.push(locked);
        expect(game.canOpenMysteryBox(locked)).toBe(false);
        game.playerType = 'ENGINEER';
        expect(game.canOpenMysteryBox(locked)).toBe(true);
        game.playerType = 'TANK';
        game.hasCampQuestReward = (id) => id === 'substation_keycard';
        expect(game.canOpenMysteryBox(locked)).toBe(true);
    });

    it("applies a squadmate's open: same box, same roll, no broadcast back", () => {
        const host = makeGame();
        host.game.placeMysteryBoxes(host.group, 3, 2);
        const guest = makeGame();
        guest.game.placeMysteryBoxes(guest.group, 3, 2);
        const target = host.game.mysteryBoxes[0];
        host.game.openMysteryBox(target);
        const sent = host.game.broadcastSharedWorldEvent.mock.calls[0][1];
        guest.game.applyRemoteMysteryBoxOpened(sent);
        const mirror = guest.game.mysteryBoxes.find((b) => b.id === target.id);
        expect(mirror.opened).toBe(true);
        expect(mirror.outcome).toBe(target.outcome);
        expect(guest.game.broadcastSharedWorldEvent).not.toHaveBeenCalled();
    });

    it('a squadmate who joins late learns which boxes are already open, without re-rolling them', () => {
        const host = makeGame({ isMultiplayer: true });
        host.game.placeMysteryBoxes(host.group, 3, 2);
        host.game.openMysteryBox(host.game.mysteryBoxes[0]);
        host.game.broadcastSharedWorldEvent.mockClear();
        expect(host.game.syncMysteryBoxes()).toBe(true);
        const [event, detail] = host.game.broadcastSharedWorldEvent.mock.calls[0];
        expect(event).toBe('mystery-boxes-sync');

        const late = makeGame();
        late.game.applyRemoteMysteryBoxSync(detail);
        late.game.placeMysteryBoxes(late.group, 3, 2);
        expect(late.game.mysteryBoxes.some((b) => b.id === host.game.mysteryBoxes[0].id)).toBe(false);
        expect(late.game.spawnDestructiblePropDrops).not.toHaveBeenCalled();
        expect(late.game.showBunkerLine).not.toHaveBeenCalled();
    });

    it('takes the sync every time a player joins, not just the first', () => {
        const { game } = makeGame();
        game.handleSharedWorldEvent({ event: 'mystery-boxes-sync', detail: { ids: ['a'] } });
        game.handleSharedWorldEvent({ event: 'mystery-boxes-sync', detail: { ids: ['b'] } });
        expect([...game.openedMysteryBoxes]).toEqual(['a', 'b']);
    });
});
