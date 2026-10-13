import { getBaseModuleDefinition } from './data/baseModules.js';
import { createWorld3dModel } from './world3dOverlay.js';

export const VISIBLE_INSTALLED_BASE_MODULES = Object.freeze(new Set([
    'hull_patch_panel',
    'door_seal_kit',
    'ship_navigation_core',
    'ship_comms_array',
    'ship_engine_manifold',
    'ship_life_support_core'
]));
export const FIRST_NIGHT_VISIBLE_MODULES = VISIBLE_INSTALLED_BASE_MODULES;

export async function createInstalledBaseModuleVisual(module) {
    const definition = getBaseModuleDefinition(module?.definitionId);
    if (!definition?.modelType || !VISIBLE_INSTALLED_BASE_MODULES.has(module.definitionId)) return null;
    const damageState = module.isDestroyed ? 'breached' : (module.damageState ?? 'intact');
    const modelType = damageState === 'breached'
        ? (definition.breachedModelType ?? definition.damagedModelType ?? definition.modelType)
        : damageState === 'damaged'
            ? (definition.damagedModelType ?? definition.modelType)
            : definition.modelType;
    const root = await createWorld3dModel(modelType);
    if (!root) return null;
    root.name = `InstalledBaseModule:${module.instanceId}`;
    root.userData.isInstalledBaseModuleVisual = true;
    root.userData.instanceId = module.instanceId;
    root.userData.definitionId = module.definitionId;
    root.userData.damageState = damageState;
    root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
    });
    return root;
}

export function updateInstalledBaseModuleVisual(root, module, terrainHeight = 0, visible = true, delta = 0) {
    if (!root?.userData?.isInstalledBaseModuleVisual || !module) return false;
    const transform = module.transform ?? module;
    const edgeOffset = {
        north: { x: 0, z: -0.5 }, south: { x: 0, z: 0.5 },
        east: { x: 0.5, z: 0 }, west: { x: -0.5, z: 0 }
    }[module.side] ?? { x: 0, z: 0 };
    root.position.set(
        (Number(transform.x) || 0) + edgeOffset.x,
        Number(terrainHeight) || 0,
        (Number(transform.z) || 0) + edgeOffset.z
    );
    root.rotation.y = Number(transform.yaw) || 0;
    root.visible = Boolean(visible);
    if (module.definitionId === 'door_seal_kit') {
        const nextState = module.isOpen ? 'open' : 'closed';
        if (root.userData.doorState !== nextState) {
            root.userData.propExperience?.setState?.(nextState);
            root.userData.doorState = nextState;
        }
    }
    root.userData.propExperience?.update?.(delta);
    return true;
}

export function disposeInstalledBaseModuleVisual(root) {
    if (!root) return;
    root.userData?.dispose?.();
    root.removeFromParent?.();
}
