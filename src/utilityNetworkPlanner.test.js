import { describe, expect, it } from 'vitest';
import {
    UTILITY_TYPES,
    UTILITY_NODE_ROLES,
    planUtilityNetwork,
    severBranch,
    restoreBranch,
    matchBoundaryPorts
} from './utilityNetworkPlanner.js';

describe('UtilityNetworkPlanner', () => {
    it('creates utility network with producers, risers, trunks, junctions, and consumers', () => {
        const placements = [
            { type: 'prop_fusion_generator', x: 2, y: 0, z: 2 },
            { type: 'door_motor', x: 8, y: 0, z: 8 },
            { type: 'prop_overhead_cage_fluorescent', x: 5, y: 2.2, z: 5 }
        ];
        const doors = [
            { tileX: 10, tileZ: 5, side: 'east' }
        ];

        const network = planUtilityNetwork({ id: 'room_1' }, { placements, doors, chunkX: 0, chunkY: 0 });

        expect(network.roomId).toBe('room_1');
        const nodes = Object.values(network.nodes);
        expect(nodes.some((n) => n.role === UTILITY_NODE_ROLES.PRODUCER)).toBe(true);
        expect(nodes.some((n) => n.role === UTILITY_NODE_ROLES.RISER)).toBe(true);
        expect(nodes.some((n) => n.role === UTILITY_NODE_ROLES.WALL_TRUNK)).toBe(true);
        expect(nodes.some((n) => n.role === UTILITY_NODE_ROLES.JUNCTION)).toBe(true);
        expect(nodes.some((n) => n.role === UTILITY_NODE_ROLES.CONSUMER)).toBe(true);
        expect(nodes.some((n) => n.role === UTILITY_NODE_ROLES.BOUNDARY_PORT)).toBe(true);

        // All power consumers should initially be powered by the fusion generator
        expect(network.poweredConsumers.size).toBe(2);
        expect(network.unpoweredConsumers.size).toBe(0);
    });

    it('places boundary ports at doorway thresholds with head clearance above 2.15m', () => {
        const doors = [{ tileX: 4, tileZ: 18, side: 'south' }];
        const network = planUtilityNetwork({ id: 'room_clearance' }, { doors });
        const port = Object.values(network.nodes).find((n) => n.role === UTILITY_NODE_ROLES.BOUNDARY_PORT);
        expect(port).toBeDefined();
        expect(port.position.y).toBeGreaterThanOrEqual(2.15);
    });

    it('severs a cuttable branch and disables only downstream consumers', () => {
        const placements = [
            { type: 'prop_fusion_generator', x: 0, y: 0, z: 0 },
            { type: 'door_motor', x: 4, y: 0, z: 4 },
            { type: 'prop_overhead_cage_fluorescent', x: 8, y: 0, z: 8 }
        ];

        const network = planUtilityNetwork({ id: 'room_test' }, { placements });
        expect(network.poweredConsumers.size).toBe(2);

        // Find edge to door_motor consumer
        const doorMotorNode = Object.values(network.nodes).find(
            (n) => n.role === UTILITY_NODE_ROLES.CONSUMER && n.sourcePropId === 'door_motor'
        );
        const edgeToMotor = network.edges.find((e) => e.to === doorMotorNode.id);
        expect(edgeToMotor).toBeDefined();
        expect(edgeToMotor.cuttable).toBe(true);

        const severResult = severBranch(network, edgeToMotor.id);
        expect(severResult.ok).toBe(true);
        expect(network.poweredConsumers.has(doorMotorNode.id)).toBe(false);
        expect(network.unpoweredConsumers.has(doorMotorNode.id)).toBe(true);

        // The fluorescent lamp remains powered!
        const lampNode = Object.values(network.nodes).find(
            (n) => n.role === UTILITY_NODE_ROLES.CONSUMER && n.sourcePropId === 'prop_overhead_cage_fluorescent'
        );
        expect(network.poweredConsumers.has(lampNode.id)).toBe(true);

        // Restoring the edge powers the motor back on
        const restoreResult = restoreBranch(network, edgeToMotor.id);
        expect(restoreResult.ok).toBe(true);
        expect(network.poweredConsumers.has(doorMotorNode.id)).toBe(true);
    });

    it('matches boundary ports across adjacent chunk boundaries', () => {
        const networkA = planUtilityNetwork({ id: 'chunk_0_0' }, {
            doors: [{ tileX: 18, tileZ: 9, side: 'east' }],
            chunkX: 0,
            chunkY: 0
        });
        const networkB = planUtilityNetwork({ id: 'chunk_1_0' }, {
            doors: [{ tileX: 19, tileZ: 9, side: 'west' }],
            chunkX: 1,
            chunkY: 0
        });

        const matches = matchBoundaryPorts(networkA, networkB);
        expect(matches.length).toBe(1);
        expect(matches[0].utilityType).toBe(UTILITY_TYPES.POWER);
    });
});
