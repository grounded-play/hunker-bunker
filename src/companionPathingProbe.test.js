import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('Companion Pathing Journey Probe (3-Room Multi-Corridor Traversal)', () => {
    function createThreeRoomWorld() {
        // Room A: [2, 10] x [2, 10]
        // Corridor AB: [10, 18] x [5, 7]
        // Room B: [18, 26] x [2, 10]
        // Corridor BC: [21, 23] x [10, 18]
        // Room C: [18, 26] x [18, 26]
        const isWalkable = (x, z) => {
            const rx = Math.round(x);
            const rz = Math.round(z);
            const inRoomA = rx >= 2 && rx <= 10 && rz >= 2 && rz <= 10;
            const inCorridorAB = rx >= 10 && rx <= 18 && rz >= 5 && rz <= 7;
            const inRoomB = rx >= 18 && rx <= 26 && rz >= 2 && rz <= 10;
            const inCorridorBC = rx >= 21 && rx <= 23 && rz >= 10 && rz <= 18;
            const inRoomC = rx >= 18 && rx <= 26 && rz >= 18 && rz <= 26;
            return inRoomA || inCorridorAB || inRoomB || inCorridorBC || inRoomC;
        };

        return { isWalkable };
    }

    it('navigates through three rooms and two corridors without clipping walls or emergency relocation', () => {
        const { isWalkable } = createThreeRoomWorld();
        let emergencyRelocations = 0;

        const root = {
            position: { x: 4, y: 0, z: 5, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
            rotation: { y: 0 }
        };

        const companion = {
            isWanderer: true,
            wanderer: { id: 'probe_companion' },
            path: null,
            repathTimer: 0,
            stuckTime: 0
        };

        const player = {
            position: { x: 5, y: 0, z: 5 }
        };

        const game = {
            player,
            isSnailTileWalkable: (x, z) => isWalkable(x, z),
            hasCompanionFireLane: (a, b) => isWalkable((a.x + b.x) / 2, (a.z + b.z) / 2),
            getTerrainHeightAt: () => 0,
            stepCompanionAlongPath: ThreeGame.prototype.stepCompanionAlongPath
        };

        // Spy on relocation by replacing root.position.set or checking stuckTime
        const origSet = root.position.set.bind(root.position);
        root.position.set = (x, y, z) => {
            emergencyRelocations += 1;
            origSet(x, y, z);
        };

        // Player waypoints journey through the 3 rooms
        const playerWaypoints = [
            { x: 5, z: 5 },   // Room A center
            { x: 9, z: 6 },   // Room A exit
            { x: 14, z: 6 },  // Corridor AB midpoint
            { x: 18, z: 6 },  // Room B entrance
            { x: 22, z: 6 },  // Room B center
            { x: 22, z: 10 }, // Corridor BC entrance
            { x: 22, z: 14 }, // Corridor BC midpoint
            { x: 22, z: 18 }, // Room C entrance
            { x: 22, z: 22 }  // Room C center
        ];

        const recordedPositions = [];

        // Simulate player progressing through each waypoint
        const dt = 0.05;
        for (const wp of playerWaypoints) {
            // Move player to waypoint
            player.position.x = wp.x;
            player.position.z = wp.z;

            // Run 40 ticks (~2.0 seconds) for companion to trail and catch up
            for (let tick = 0; tick < 40; tick++) {
                const goal = { x: player.position.x - 1.0, z: player.position.z };
                game.stepCompanionAlongPath(companion, root, goal, dt);

                recordedPositions.push({ x: root.position.x, z: root.position.z });

                // Verify companion never occupies an unwalkable (wall/void) tile
                const validTile = isWalkable(root.position.x, root.position.z);
                expect(validTile).toBe(true);
            }
        }

        // Verify zero emergency relocations occurred during normal traversal
        expect(emergencyRelocations).toBe(0);

        // Verify companion reached Room C within follow radius of player
        const finalDist = Math.hypot(root.position.x - player.position.x, root.position.z - player.position.z);
        expect(finalDist).toBeLessThanOrEqual(2.5);
        expect(root.position.x).toBeGreaterThanOrEqual(18);
        expect(root.position.z).toBeGreaterThanOrEqual(18);
    });
});
