// Room Content Binder
// Binds loot, lore, field fabrication, quest props, and rewards to authored room anchors.

import { CHUNK_SIZE } from './tileCatalog.js';

export const ROOM_FAMILY_DEFAULT_REWARDS = Object.freeze({
    medical: Object.freeze([
        { type: 'med', min: 2, max: 5 },
        { type: 'pickup_medkit', count: 1 }
    ]),
    armory: Object.freeze([
        { type: 'tech', min: 2, max: 4 },
        { type: 'ammo', min: 10, max: 25 },
        { type: 'schematic_weapon', chance: 0.5 }
    ]),
    o2: Object.freeze([
        { type: 'tech', min: 2, max: 5 },
        { type: 'ship_component_o2', count: 1 }
    ]),
    fabricator: Object.freeze([
        // The terminal is already represented by an interaction anchor. The
        // room's reward anchor is the authored schematic cache beside it.
        { type: 'schematic_weapon', chance: 1 }
    ]),
    puzzle: Object.freeze([
        { type: 'coin', min: 3, max: 8 },
        { type: 'tech', min: 2, max: 4 }
    ]),
    trap_reward: Object.freeze([
        { type: 'vault_salvage', tech: 4, coin: 5, med: 3 }
    ]),
    lore: Object.freeze([
        { type: 'lore_terminal', codexId: null, techReward: 1 }
    ]),
    cache: Object.freeze([
        { type: 'salvage_cache', min: 1, max: 3 }
    ]),
    camp: Object.freeze([]),
    hive: Object.freeze([
        { type: 'biological_resin', count: 2 }
    ]),
    gate: Object.freeze([])
});

/**
 * Resolves local room anchor coordinates (within a chunk or room) to exact world (x, z) coordinates.
 * @param {number} chunkX - Chunk grid X
 * @param {number} chunkY - Chunk grid Y
 * @param {{x: number, y: number}|{x: number, z: number}} localAnchor - Local cell position
 * @param {number} [chunkSize=CHUNK_SIZE] - Size of chunk in cells
 * @param {{x: number, z?: number, y?: number}} [worldOffset={x:0,z:0}] - Additive world-space offset
 * @param {{offsetMode?: 'add'|'subtract'}} [options] - `subtract` is an explicit compatibility mode for legacy biome anchors
 * @returns {{x: number, z: number, worldX: number, worldZ: number}|null}
 */
export function resolveAnchorWorldPosition(
    chunkX,
    chunkY,
    localAnchor,
    chunkSize = CHUNK_SIZE,
    worldOffset = { x: 0, z: 0 },
    { offsetMode = 'add' } = {}
) {
    const localX = localAnchor?.x;
    const localZ = localAnchor?.z ?? localAnchor?.y;
    if (!Number.isFinite(localX) || !Number.isFinite(localZ)) return null;

    const resolvedChunkX = Number(chunkX);
    const resolvedChunkY = Number(chunkY);
    const resolvedChunkSize = Number(chunkSize);
    if (!Number.isFinite(resolvedChunkX) || !Number.isFinite(resolvedChunkY) || !Number.isFinite(resolvedChunkSize)) return null;

    const offsetX = Number.isFinite(worldOffset?.x) ? worldOffset.x : 0;
    const offsetZValue = worldOffset?.z ?? worldOffset?.y;
    const offsetZ = Number.isFinite(offsetZValue) ? offsetZValue : 0;
    const offsetDirection = offsetMode === 'subtract' ? -1 : 1;
    const worldX = resolvedChunkX * resolvedChunkSize + localX + offsetDirection * offsetX;
    const worldZ = resolvedChunkY * resolvedChunkSize + localZ + offsetDirection * offsetZ;
    return {
        x: worldX,
        z: worldZ,
        worldX,
        worldZ,
        localX,
        localZ,
        chunkX,
        chunkY
    };
}

/**
 * Binds content (loot, lore, fabrication, quest props) to a room instance based on its authored build and state.
 * @param {Object} roomInstance - The room instance from chunk generation
 * @param {Object} [roomBuild={}] - The authored room build definition (if available)
 * @param {Object} [context={}] - Seed, active quests, state variants, etc.
 * @returns {Object} Room content plan with bound anchors and items
 */
export function bindRoomContent(roomInstance, roomBuild = {}, context = {}) {
    const roomId = roomInstance?.id ?? 'room_unknown';
    const chunkX = roomInstance?.chunkX ?? (Number(roomInstance?.chunkKey?.split(',')[0]) || 0);
    const chunkY = roomInstance?.chunkY ?? (Number(roomInstance?.chunkKey?.split(',')[1]) || 0);
    const chunkSize = context.chunkSize ?? CHUNK_SIZE;
    const usesLegacyBiomeAnchor = context.legacyBiomeAnchorOffset === true;
    const worldOffset = usesLegacyBiomeAnchor
        ? (context.biomeAnchor ?? { x: 0, z: 0 })
        : (context.worldOffset ?? { x: 0, z: 0 });
    const offsetMode = usesLegacyBiomeAnchor ? 'subtract' : (context.offsetMode ?? 'add');
    const family = roomBuild.family ?? roomInstance.family ?? roomInstance.role ?? 'generic';
    const stateVariant = context.stateVariant
        ?? roomInstance.stateVariant
        ?? roomBuild.defaultState
        ?? 'intact';

    const structuralAnchors = roomBuild.structuralAnchors ?? roomInstance.structuralAnchors ?? [];
    const interactionAnchors = roomBuild.interactionAnchors ?? roomInstance.interactionAnchors ?? [];
    const rewardAnchors = roomBuild.rewardAnchors ?? roomInstance.rewardAnchors ?? [];
    const loreAnchors = roomBuild.loreAnchors ?? roomInstance.loreAnchors ?? [];

    const boundContent = {
        roomId,
        family,
        stateVariant,
        structural: [],
        interactions: [],
        rewards: [],
        lore: [],
        questProps: []
    };

    const resolveAnchor = (anchor) => resolveAnchorWorldPosition(
        chunkX,
        chunkY,
        anchor,
        chunkSize,
        worldOffset,
        { offsetMode }
    );

    // 1. Structural anchors (islands, heavy machinery, partitions)
    for (let i = 0; i < structuralAnchors.length; i += 1) {
        const anchor = structuralAnchors[i];
        const worldPos = resolveAnchor(anchor);
        if (!worldPos) continue;
        boundContent.structural.push({
            id: `${roomId}:structural:${i}`,
            anchorId: anchor.id ?? `struct_${i}`,
            type: anchor.type ?? (family === 'medical' ? 'decon_frame' : 'structural_pillar'),
            state: stateVariant,
            ...worldPos
        });
    }

    // 2. Interaction anchors (terminals, fabricators, valve handles, power sequence)
    for (let i = 0; i < interactionAnchors.length; i += 1) {
        const anchor = interactionAnchors[i];
        const worldPos = resolveAnchor(anchor);
        if (!worldPos) continue;
        let interactionType = anchor.type;
        if (!interactionType) {
            if (family === 'fabricator') interactionType = 'field_fabricator_terminal';
            else if (family === 'o2') interactionType = 'o2_scrubber_control';
            else if (family === 'puzzle') interactionType = 'power_routing_node';
            else interactionType = 'generic_terminal';
        }
        boundContent.interactions.push({
            id: `${roomId}:interaction:${i}`,
            anchorId: anchor.id ?? `interact_${i}`,
            type: interactionType,
            active: stateVariant !== 'looted' && stateVariant !== 'destroyed',
            state: stateVariant,
            ...worldPos
        });
    }

    // 3. Reward anchors (loot caches, weapon cages, resource crates)
    const defaultRewards = ROOM_FAMILY_DEFAULT_REWARDS[family] ?? [];
    for (let i = 0; i < rewardAnchors.length; i += 1) {
        const anchor = rewardAnchors[i];
        const worldPos = resolveAnchor(anchor);
        if (!worldPos) continue;
        const rewardDef = defaultRewards[i % Math.max(1, defaultRewards.length)] ?? { type: 'salvage', amount: 1 };
        boundContent.rewards.push({
            id: `${roomId}:reward:${i}`,
            anchorId: anchor.id ?? `reward_${i}`,
            reward: { ...rewardDef },
            opened: stateVariant === 'looted',
            ...worldPos
        });
    }

    // 4. Lore anchors (data pads, audio logs, wall stencils)
    for (let i = 0; i < loreAnchors.length; i += 1) {
        const anchor = loreAnchors[i];
        const worldPos = resolveAnchor(anchor);
        if (!worldPos) continue;
        boundContent.lore.push({
            id: `${roomId}:lore:${i}`,
            anchorId: anchor.id ?? `lore_${i}`,
            loreKey: anchor.loreKey ?? `${family}_log_${chunkX}_${chunkY}`,
            collected: false,
            ...worldPos
        });
    }

    // 5. Active Camp / Hive Quest Binding
    if (Array.isArray(context.activeQuests) && context.activeQuests.length > 0) {
        for (const quest of context.activeQuests) {
            if (quest.targetRoomId === roomId || quest.targetFamily === family || (quest.reservationId && quest.reservationId === roomInstance.reservationId)) {
                const candidates = [...interactionAnchors, ...rewardAnchors, ...structuralAnchors, ...loreAnchors];
                const matchingAnchor = quest.objectiveAnchorId
                    ? candidates.find((anchor) => (anchor.id === quest.objectiveAnchorId || anchor.anchorId === quest.objectiveAnchorId) && resolveAnchor(anchor))
                    : null;
                const targetAnchor = matchingAnchor
                    ?? candidates.find((anchor) => resolveAnchor(anchor))
                    ?? { x: 24, z: 24 };
                const worldPos = resolveAnchor(targetAnchor);
                if (!worldPos) continue;
                boundContent.questProps.push({
                    id: `${roomId}:quest:${quest.id}`,
                    questId: quest.id,
                    targetProp: quest.targetProp ?? 'quest_objective_node',
                    status: 'active',
                    ...worldPos
                });
            }
        }
    }

    return boundContent;
}
