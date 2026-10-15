/**
 * Deterministic two-stage utility network planner.
 *
 * Assigns producers, consumers, junctions, wall trunks, and room boundary ports
 * for power, coolant, air, data, fuel, and organic trachea. Computes dynamic
 * network state so severing or repairing a branch visibly impacts only downstream consumers.
 */

export const UTILITY_TYPES = Object.freeze({
    POWER: 'power',
    COOLANT: 'coolant',
    AIR: 'air',
    DATA: 'data',
    FUEL: 'fuel',
    TRACHEA: 'trachea'
});

export const UTILITY_NODE_ROLES = Object.freeze({
    PRODUCER: 'producer',
    CONSUMER: 'consumer',
    JUNCTION: 'junction',
    WALL_TRUNK: 'wall_trunk',
    RISER: 'riser',
    BOUNDARY_PORT: 'boundary_port'
});

export const DEFAULT_PRODUCER_PROPS = Object.freeze({
    prop_fusion_generator: UTILITY_TYPES.POWER,
    life_transformer_bank: UTILITY_TYPES.POWER,
    engineer_wave_relay_dynamo: UTILITY_TYPES.POWER,
    hive_assimilated_generator: UTILITY_TYPES.TRACHEA,
    ind_fuel_rod_cask: UTILITY_TYPES.FUEL,
    cryo_heater_station: UTILITY_TYPES.POWER,
    decon_exosuit_scrubber_station: UTILITY_TYPES.AIR
});

export const DEFAULT_CONSUMER_PROPS = Object.freeze({
    prop_diagnostic_console: UTILITY_TYPES.DATA,
    prop_overhead_cage_fluorescent: UTILITY_TYPES.POWER,
    life_server_racks: UTILITY_TYPES.DATA,
    meridian_mainframe_altar: UTILITY_TYPES.DATA,
    meridian_servitor_dock: UTILITY_TYPES.POWER,
    corp_debt_severing_kiosk: UTILITY_TYPES.DATA,
    prop_icey_frost_manifold: UTILITY_TYPES.COOLANT,
    prop_coolant_drum_leaking_pool: UTILITY_TYPES.COOLANT,
    hive_amniotic_feeder_trough: UTILITY_TYPES.TRACHEA,
    hive_gestation_sac: UTILITY_TYPES.TRACHEA,
    door_motor: UTILITY_TYPES.POWER,
    prop_fabricator_station: UTILITY_TYPES.POWER
});

const HEAD_CLEARANCE = 2.15; // Clearance in meters above floor for door crossing

export function createBoundaryPortId(chunkX, chunkY, side, utilityType) {
    return `port:${chunkX},${chunkY}:${side}:${utilityType}`;
}

/**
 * Plans the utility network graph for a room or chunk.
 */
export function planUtilityNetwork(room, {
    placements = [],
    doors = [],
    chunkX = 0,
    chunkY = 0,
    _existingPorts = []
} = {}) {
    const roomId = room?.id ?? `room:${chunkX},${chunkY}`;
    const nodes = new Map();
    const edges = [];

    // Helper to register node
    const addNode = (node) => {
        nodes.set(node.id, {
            ...node,
            active: node.role === UTILITY_NODE_ROLES.PRODUCER
        });
        return node.id;
    };

    // Helper to register edge
    const addEdge = (fromId, toId, utilityType, { cuttable = true, isTrunk = false } = {}) => {
        const edgeId = `edge:${fromId}->${toId}`;
        const edge = {
            id: edgeId,
            from: fromId,
            to: toId,
            utilityType,
            cuttable,
            isTrunk,
            severed: false
        };
        edges.push(edge);
        return edge;
    };

    // 1. Discover producers and consumers from prop placements
    const producers = [];
    const consumers = [];

    placements.forEach((prop, index) => {
        const type = prop.type ?? prop.propType ?? prop.id;
        const x = Number(prop.x ?? prop.worldX) || 0;
        const y = Number(prop.y ?? prop.worldY) || 0;
        const z = Number(prop.z ?? prop.worldZ) || 0;

        if (DEFAULT_PRODUCER_PROPS[type]) {
            const utype = DEFAULT_PRODUCER_PROPS[type];
            const nodeId = `producer:${roomId}:${type}:${index}`;
            addNode({
                id: nodeId,
                role: UTILITY_NODE_ROLES.PRODUCER,
                utilityType: utype,
                position: { x, y, z },
                sourcePropId: type,
                placementIndex: index
            });
            producers.push({ nodeId, utilityType: utype, position: { x, y, z } });
        } else if (DEFAULT_CONSUMER_PROPS[type]) {
            const utype = DEFAULT_CONSUMER_PROPS[type];
            const nodeId = `consumer:${roomId}:${type}:${index}`;
            addNode({
                id: nodeId,
                role: UTILITY_NODE_ROLES.CONSUMER,
                utilityType: utype,
                position: { x, y, z },
                sourcePropId: type,
                placementIndex: index
            });
            consumers.push({ nodeId, utilityType: utype, position: { x, y, z } });
        }
    });

    // 2. Identify boundary ports from doors
    const boundaryPorts = [];
    doors.forEach((door, dIdx) => {
        const doorX = Number(door.x ?? door.worldX ?? door.tileX) || 0;
        const doorZ = Number(door.z ?? door.worldZ ?? door.tileZ) || 0;
        const side = door.side ?? `door_${dIdx}`;

        // Create power boundary port above door threshold
        const portId = createBoundaryPortId(chunkX, chunkY, side, UTILITY_TYPES.POWER);
        addNode({
            id: portId,
            role: UTILITY_NODE_ROLES.BOUNDARY_PORT,
            utilityType: UTILITY_TYPES.POWER,
            position: { x: doorX, y: HEAD_CLEARANCE + 0.1, z: doorZ },
            doorSide: side,
            clearance: HEAD_CLEARANCE
        });
        boundaryPorts.push({ portId, utilityType: UTILITY_TYPES.POWER, position: { x: doorX, y: HEAD_CLEARANCE + 0.1, z: doorZ } });
    });

    // 3. Connect producers through wall risers and overhead trays to consumers
    producers.forEach((producer, pIdx) => {
        const riserId = `riser:${roomId}:${producer.nodeId}`;
        addNode({
            id: riserId,
            role: UTILITY_NODE_ROLES.RISER,
            utilityType: producer.utilityType,
            position: { x: producer.position.x, y: HEAD_CLEARANCE, z: producer.position.z }
        });
        addEdge(producer.nodeId, riserId, producer.utilityType, { cuttable: false });

        const trunkId = `trunk:${roomId}:${pIdx}`;
        addNode({
            id: trunkId,
            role: UTILITY_NODE_ROLES.WALL_TRUNK,
            utilityType: producer.utilityType,
            position: { x: producer.position.x, y: HEAD_CLEARANCE + 0.2, z: producer.position.z }
        });
        addEdge(riserId, trunkId, producer.utilityType, { cuttable: false, isTrunk: true });

        // Connect trunk to matching consumers via junction
        const matchingConsumers = consumers.filter((c) => c.utilityType === producer.utilityType);
        if (matchingConsumers.length > 0) {
            const junctionId = `junction:${roomId}:${pIdx}`;
            addNode({
                id: junctionId,
                role: UTILITY_NODE_ROLES.JUNCTION,
                utilityType: producer.utilityType,
                position: { x: producer.position.x, y: HEAD_CLEARANCE, z: producer.position.z }
            });
            addEdge(trunkId, junctionId, producer.utilityType, { cuttable: false });

            matchingConsumers.forEach((consumer) => {
                addEdge(junctionId, consumer.nodeId, producer.utilityType, { cuttable: true });
            });
        }

        // Connect trunk to boundary ports for cross-room continuation
        const matchingPorts = boundaryPorts.filter((p) => p.utilityType === producer.utilityType);
        matchingPorts.forEach((port) => {
            addEdge(trunkId, port.portId, producer.utilityType, { cuttable: false, isTrunk: true });
        });
    });

    const network = {
        roomId,
        chunkKey: `${chunkX},${chunkY}`,
        nodes: Object.fromEntries(nodes),
        edges,
        poweredConsumers: new Set(),
        unpoweredConsumers: new Set()
    };

    recalculatePowerState(network);
    return network;
}

/**
 * Re-evaluates graph connectivity and sets active/powered status on consumers.
 */
export function recalculatePowerState(network) {
    if (!network || !network.nodes || !network.edges) return;

    const adjacency = new Map();
    for (const nodeKey of Object.keys(network.nodes)) {
        adjacency.set(nodeKey, []);
    }

    for (const edge of network.edges) {
        if (!edge.severed) {
            adjacency.get(edge.from)?.push({ to: edge.to, utilityType: edge.utilityType, edgeId: edge.id });
            adjacency.get(edge.to)?.push({ to: edge.from, utilityType: edge.utilityType, edgeId: edge.id });
        }
    }

    // Find all active producers
    const activeProducers = Object.values(network.nodes).filter(
        (n) => n.role === UTILITY_NODE_ROLES.PRODUCER && n.active
    );

    // Run BFS reachability from active producers per utility type
    const reachable = new Set();
    activeProducers.forEach((producer) => {
        const queue = [producer.id];
        reachable.add(producer.id);

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = adjacency.get(current) ?? [];
            for (const { to, utilityType } of neighbors) {
                if (utilityType === producer.utilityType && !reachable.has(to)) {
                    reachable.add(to);
                    queue.push(to);
                }
            }
        }
    });

    const powered = new Set();
    const unpowered = new Set();

    for (const node of Object.values(network.nodes)) {
        if (node.role === UTILITY_NODE_ROLES.CONSUMER) {
            const isPowered = reachable.has(node.id);
            node.active = isPowered;
            if (isPowered) {
                powered.add(node.id);
            } else {
                unpowered.add(node.id);
            }
        }
    }

    network.poweredConsumers = powered;
    network.unpoweredConsumers = unpowered;
    return network;
}

/**
 * Severs a branch/edge in the network, updating connectivity.
 */
export function severBranch(network, edgeId) {
    if (!network || !Array.isArray(network.edges)) return { ok: false, reason: 'invalid-network' };
    const edge = network.edges.find((e) => e.id === edgeId);
    if (!edge) return { ok: false, reason: 'edge-not-found' };
    if (!edge.cuttable) return { ok: false, reason: 'uncuttable-edge' };

    edge.severed = true;
    recalculatePowerState(network);

    return {
        ok: true,
        severedEdgeId: edgeId,
        poweredConsumers: [...network.poweredConsumers],
        unpoweredConsumers: [...network.unpoweredConsumers]
    };
}

/**
 * Restores a severed branch in the network.
 */
export function restoreBranch(network, edgeId) {
    if (!network || !Array.isArray(network.edges)) return { ok: false, reason: 'invalid-network' };
    const edge = network.edges.find((e) => e.id === edgeId);
    if (!edge) return { ok: false, reason: 'edge-not-found' };

    edge.severed = false;
    recalculatePowerState(network);

    return {
        ok: true,
        restoredEdgeId: edgeId,
        poweredConsumers: [...network.poweredConsumers],
        unpoweredConsumers: [...network.unpoweredConsumers]
    };
}

/**
 * Matches boundary ports between adjacent chunk networks.
 */
export function matchBoundaryPorts(networkA, networkB) {
    if (!networkA || !networkB) return [];
    const matched = [];
    const portsA = Object.values(networkA.nodes).filter((n) => n.role === UTILITY_NODE_ROLES.BOUNDARY_PORT);
    const portsB = Object.values(networkB.nodes).filter((n) => n.role === UTILITY_NODE_ROLES.BOUNDARY_PORT);

    for (const portA of portsA) {
        for (const portB of portsB) {
            if (portA.utilityType === portB.utilityType) {
                const dx = Math.abs(portA.position.x - portB.position.x);
                const dz = Math.abs(portA.position.z - portB.position.z);
                if (dx <= 1.5 && dz <= 1.5) {
                    matched.push({ portA: portA.id, portB: portB.id, utilityType: portA.utilityType });
                }
            }
        }
    }
    return matched;
}
