import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ThreeGame } from './threeGame.js';
import { ROOM_BUILD_CATALOG, stampRoomBuild, buildRoomInstanceFromBuild } from './roomBuilds.js';
import { assignRoomThemes } from './roomThemes.js';
import { bindRoomContent } from './roomContent.js';
import { planRoomPopulation } from './roomPopulation.js';
import { planRoomDressing } from './roomDressing.js';

function chunkRoom() {
    const build = ROOM_BUILD_CATALOG.find((b) => b.id === 'medical_triage');
    let state = 5;
    const random = () => (state = (state * 16807) % 2147483647) / 2147483647;
    const stamp = stampRoomBuild(build, random, { openings: { south: { open: true, offset: 8 } } });
    const [themed] = assignRoomThemes([buildRoomInstanceFromBuild(build, stamp, { chunkX: 2, chunkY: -1 })], { biome: 'bio', depthTier: 1, random });
    const room = { ...themed, contentPlan: bindRoomContent(themed, build, { chunkSize: stamp.grid.length, activeQuests: [] }) };
    room.populationPlan = planRoomPopulation(room, stamp.grid, random);
    return { room, grid: stamp.grid };
}

describe('ThreeGame room dressing (lived-in rooms)', () => {
    it('dresses each authored room and gives vignette furniture colliders in world space', () => {
        const { room, grid } = chunkRoom();
        const game = { chunkSize: grid.length, scatterSprites: [], scatterTextures: {} };
        const group = new THREE.Group();
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            const token = ThreeGame.prototype.addRoomDressing.call(game, group, 2, -1, { roomInstances: [room] }, grid);
            expect(token).toBeTruthy();
        } finally {
            warn.mockRestore();
        }

        const allItems = planRoomDressing(room, grid, { reserved: room.populationPlan.reserved, occupied: room.populationPlan.placements }).items;
        const expectedBlocking = allItems.filter((item) => item.blocking);
        const expectedTotal = allItems.filter((item) => item.blocking || item.destructible);
        expect(expectedBlocking.length).toBeGreaterThan(0);
        expect(game.scatterSprites).toHaveLength(expectedTotal.length);
        const blockingSprites = game.scatterSprites.filter((s) => s.userData.isSolidProp);
        expect(blockingSprites).toHaveLength(expectedBlocking.length);
        const first = blockingSprites[0];
        expect(first.parent).toBe(group);
        expect(first.userData).toMatchObject({ isSolidProp: true, isDestructibleProp: true, isRoomDressingCollider: true });
        expect(first.position.x).toBeCloseTo(expectedBlocking[0].x + 2 * grid.length);
        expect(first.position.z).toBeCloseTo(expectedBlocking[0].y - grid.length);
    });

    it('does nothing for a chunk without authored rooms', () => {
        const game = { chunkSize: 48, scatterSprites: [], scatterTextures: {} };
        expect(ThreeGame.prototype.addRoomDressing.call(game, new THREE.Group(), 0, 0, { roomInstances: [] }, [])).toBeNull();
        expect(game.scatterSprites).toEqual([]);
    });

    it('keeps physical identities stable when the live grid has a wall breach', () => {
        const { room, grid } = chunkRoom();
        const metadata = { roomInstances: [room], dressingGrid: grid.map(row => row.join('')) };
        const mount = liveGrid => {
            const game = { chunkSize: grid.length, scatterSprites: [], scatterTextures: {} };
            ThreeGame.prototype.addRoomDressing.call(game, new THREE.Group(), 2, -1, metadata, liveGrid);
            return game.scatterSprites.map(s => s.userData.scatterKey);
        };
        const before = mount(grid);
        const damaged = grid.map(row => row.map(c => c === '#' ? '.' : c));
        expect(mount(damaged)).toEqual(before);
    });
});
