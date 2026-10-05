/**
 * Critical-Service Recovery and Accessible Wreck Engine (Sprint 49 G3/G4)
 * Guarantees that critical service/setpiece housings can break under fire,
 * but their required gameplay interaction survives as an accessible,
 * traversable wreck rather than deleting quest, progression, or camp services.
 */

export const CRITICAL_SERVICE_TYPES = Object.freeze({
    CAMP_SALVAGE_CONSOLE: 'camp_salvage_console',
    CAMP_COOKFIRE: 'camp_cookfire',
    LORE_TERMINAL: 'lore_terminal',
    POWER_CONDUIT: 'power_conduit',
    OBJECTIVE_BEACON: 'objective_beacon',
    EXTRACTION_UPLINK: 'extraction_uplink',
    QUARANTINE_SEAL: 'quarantine_seal'
});

export const CRITICAL_SERVICE_WRECK_MODELS = Object.freeze({
    camp_salvage_console: 'prop_terminal_ruptured',
    lore_terminal: 'prop_terminal_ruptured',
    camp_cookfire: 'prop_camp_cookfire_doused',
    power_conduit: 'prop_chair_operator_wrecked',
    objective_beacon: 'prop_terminal_ruptured',
    extraction_uplink: 'prop_terminal_ruptured',
    quarantine_seal: 'prop_terminal_ruptured',
    default: 'prop_terminal_ruptured'
});

/**
 * Checks whether a prop/setpiece hosts a critical service that must survive destruction.
 */
export function isCriticalService(sprite) {
    if (!sprite?.userData) return false;
    const data = sprite.userData;
    if (data.isCriticalService === true || Boolean(data.criticalService)) return true;
    const type = data.type || data.modelKey || data.propKey;
    if (type && Object.values(CRITICAL_SERVICE_TYPES).includes(type)) return true;
    if (data.isCampService || data.isQuestCritical || data.isProgressionCritical) return true;
    return false;
}

/**
 * Extracts normalized service descriptor from a prop.
 */
export function getCriticalServiceDescriptor(sprite) {
    if (!sprite?.userData) return null;
    const data = sprite.userData;
    const custom = data.criticalService || {};
    const type = custom.serviceType || data.serviceType || data.type || 'generic_critical_service';
    const serviceId = custom.serviceId || data.serviceId || data.dressingId || data.scatterKey || `service:${type}`;
    const prompt = custom.prompt || data.interactPrompt || '[E] ACCESS EMERGENCY INTERFACE';
    const wreckPrompt = custom.wreckPrompt
        || (prompt.startsWith('[E]') ? `[E] SALVAGE DAMAGED ${prompt.slice(4).trim()}` : `[E] ACCESS DAMAGED ${prompt}`);
    const wreckModelKey = custom.wreckModelKey || CRITICAL_SERVICE_WRECK_MODELS[type] || CRITICAL_SERVICE_WRECK_MODELS.default;
    const onInteract = typeof custom.onInteract === 'function' ? custom.onInteract : (data.onInteract || null);

    return {
        serviceType: type,
        serviceId,
        label: custom.label || data.label || 'CRITICAL SERVICE',
        prompt,
        wreckPrompt,
        wreckModelKey,
        onInteract,
        questKey: custom.questKey || data.questKey || null,
        metadata: { ...(custom.metadata || {}), ...(data.criticalServiceMetadata || {}) }
    };
}

/**
 * Creates an accessible, traversable wreck that preserves the critical service interaction.
 */
export function createCriticalServiceWreck(game, originalProp) {
    const descriptor = getCriticalServiceDescriptor(originalProp);
    if (!descriptor) return null;

    const px = originalProp.position?.x ?? 0;
    const pz = originalProp.position?.z ?? 0;
    const originalKey = originalProp.userData?.scatterKey
        ?? originalProp.userData?.dressingId
        ?? `service:${descriptor.serviceType}`;
    const wreckKey = `${originalKey}:wreck`;

    const wreck = {
        position: { x: px, y: 0.08, z: pz },
        userData: {
            isScatter: true,
            isCriticalServiceWreck: true,
            isDestructibleProp: false,
            isSolidProp: false,
            type: descriptor.wreckModelKey,
            modelKey: descriptor.wreckModelKey,
            scatterKey: wreckKey,
            originalScatterKey: originalKey,
            serviceType: descriptor.serviceType,
            serviceId: descriptor.serviceId,
            questKey: descriptor.questKey,
            hp: Infinity,
            interactionSpec: {
                canInteract: true,
                interactPrompt: descriptor.wreckPrompt,
                onInteract: (g, targetWreck) => {
                    if (typeof descriptor.onInteract === 'function') {
                        return descriptor.onInteract(g, targetWreck);
                    }
                    g?.showBunkerLine?.(`EMERGENCY UPLINK: RESTORED ACCESS TO ${descriptor.label.toUpperCase()}.`);
                    return true;
                }
            }
        }
    };

    return wreck;
}

/**
 * Registers an accessible wreck into the game world and persistence cache.
 */
export function registerCriticalServiceWreck(game, wreck) {
    if (!game || !wreck) return false;
    game.scatterSprites = game.scatterSprites || [];
    game.scatterSprites.push(wreck);

    game.criticalServiceWrecks = game.criticalServiceWrecks || new Map();
    const key = wreck.userData?.scatterKey;
    if (key) {
        game.criticalServiceWrecks.set(key, {
            scatterKey: key,
            originalScatterKey: wreck.userData?.originalScatterKey,
            serviceType: wreck.userData?.serviceType,
            serviceId: wreck.userData?.serviceId,
            x: wreck.position.x,
            z: wreck.position.z,
            interacted: Boolean(wreck.userData?.hasBeenInteracted)
        });
    }

    if (game.scene && typeof game.scene.add === 'function' && wreck.isObject3D) {
        game.scene.add(wreck);
    }
    return true;
}

/**
 * Handles destruction of a critical service prop by spawning and registering an accessible wreck.
 */
export function handleCriticalServiceDestruction(game, sprite) {
    if (!isCriticalService(sprite)) return null;
    const wreck = createCriticalServiceWreck(game, sprite);
    if (wreck) {
        registerCriticalServiceWreck(game, wreck);
        game?.showBunkerLine?.('SERVICE DAMAGED: EMERGENCY INTERFACE ACTIVE IN WRECKAGE.');
    }
    return wreck;
}

/**
 * Serializes current critical service wreck states for persistence snapshots.
 */
export function serializeCriticalServiceWrecks(game) {
    if (!game?.criticalServiceWrecks) return [];
    return Array.from(game.criticalServiceWrecks.values());
}

/**
 * Restores surviving critical service wrecks from saved snapshots.
 */
export function restoreCriticalServiceWrecks(game, records = []) {
    if (!game || !Array.isArray(records)) return [];
    const restored = [];
    for (const record of records) {
        if (!record?.scatterKey) continue;
        const fakeProp = {
            position: { x: record.x ?? 0, y: 0.08, z: record.z ?? 0 },
            userData: {
                scatterKey: record.originalScatterKey || record.scatterKey.replace(/:wreck$/, ''),
                serviceType: record.serviceType,
                serviceId: record.serviceId,
                isCriticalService: true
            }
        };
        const wreck = createCriticalServiceWreck(game, fakeProp);
        if (wreck) {
            if (record.interacted) wreck.userData.hasBeenInteracted = true;
            registerCriticalServiceWreck(game, wreck);
            restored.push(wreck);
        }
    }
    return restored;
}
