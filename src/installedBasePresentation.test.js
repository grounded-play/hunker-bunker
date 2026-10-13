import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createWorld3dModel } = vi.hoisted(() => ({ createWorld3dModel: vi.fn() }));
vi.mock('./world3dOverlay.js', () => ({ createWorld3dModel }));

const {
    createInstalledBaseModuleVisual,
    disposeInstalledBaseModuleVisual,
    updateInstalledBaseModuleVisual
} = await import('./installedBasePresentation.js');

function rootStub() {
    return {
        name: '', userData: {}, visible: true,
        position: { set: vi.fn() }, rotation: { y: 0 },
        traverse: (visit) => visit({ isMesh: true, castShadow: false, receiveShadow: false }),
        removeFromParent: vi.fn()
    };
}

describe('installed base module presentation', () => {
    beforeEach(() => createWorld3dModel.mockReset());

    it('loads and places recovered seal modules using their installed transform', async () => {
        const root = rootStub();
        root.userData.dispose = vi.fn();
        createWorld3dModel.mockResolvedValue(root);
        const module = {
            instanceId: 'patch-1', definitionId: 'hull_patch_panel',
            side: 'west', transform: { x: 4, z: 7, yaw: 1.2 }
        };
        expect(await createInstalledBaseModuleVisual(module)).toBe(root);
        expect(createWorld3dModel).toHaveBeenCalledWith('crash_hull_panels');
        expect(updateInstalledBaseModuleVisual(root, module, 0.3, true)).toBe(true);
        expect(root.position.set).toHaveBeenCalledWith(3.5, 0.3, 7);
        expect(root.rotation.y).toBe(1.2);
        disposeInstalledBaseModuleVisual(root);
        expect(root.userData.dispose).toHaveBeenCalled();
        expect(root.removeFromParent).toHaveBeenCalled();
    });

    it('does not create visuals for data-only starter shell pieces', async () => {
        expect(await createInstalledBaseModuleVisual({
            instanceId: 'floor', definitionId: 'floor_plate_1x1'
        })).toBeNull();
        expect(createWorld3dModel).not.toHaveBeenCalled();
    });

    it('swaps a breached module to authored damaged-state art', async () => {
        createWorld3dModel.mockResolvedValue(rootStub());
        const root = await createInstalledBaseModuleVisual({
            instanceId: 'door-1', definitionId: 'door_seal_kit', isDestroyed: true
        });
        expect(createWorld3dModel).toHaveBeenCalledWith('state_wall_breached_03');
        expect(root.userData.damageState).toBe('breached');
    });

    it('uses the intermediate damaged model before full breach', async () => {
        createWorld3dModel.mockResolvedValue(rootStub());
        const root = await createInstalledBaseModuleVisual({
            instanceId: 'wall-1', definitionId: 'hull_patch_panel', damageState: 'damaged'
        });
        expect(createWorld3dModel).toHaveBeenCalledWith('state_wall_breached_01');
        expect(root.userData.damageState).toBe('damaged');
    });
});
