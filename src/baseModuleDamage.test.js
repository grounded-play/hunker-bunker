import { describe, expect, it } from 'vitest';
import { baseModuleRepairCost, damageBaseModule, repairBaseModule } from './baseModuleDamage.js';

describe('installed base module damage', () => {
    it('moves a hull patch through damaged and breached seal states', () => {
        let modules = [{ instanceId: 'wall-1', definitionId: 'hull_patch_panel', condition: 1 }];
        let result = damageBaseModule(modules, 'wall-1', 50);
        expect(result.module).toMatchObject({ durability: 40, maxDurability: 90, damageState: 'damaged', isDestroyed: false });
        modules = result.modules;
        result = damageBaseModule(modules, 'wall-1', 40);
        expect(result).toMatchObject({ ok: true, destroyed: true });
        expect(result.module).toMatchObject({ durability: 0, condition: 0, damageState: 'breached', isDestroyed: true });
    });

    it('repairs the same persistent module identity for a bounded shell cost', () => {
        const breached = damageBaseModule([
            { instanceId: 'door-1', definitionId: 'door_seal_kit', condition: 1 }
        ], 'door-1', 999).modules;
        expect(baseModuleRepairCost(breached[0])).toBe(12);
        const result = repairBaseModule(breached, 'door-1');
        expect(result).toMatchObject({ ok: true, cost: 12 });
        expect(result.module).toMatchObject({
            instanceId: 'door-1', durability: 120, condition: 1, isDestroyed: false, damageState: 'intact'
        });
    });

    it('rejects starter shell and already-intact records', () => {
        expect(damageBaseModule([
            { instanceId: 'floor', definitionId: 'floor_plate_1x1' }
        ], 'floor', 10)).toMatchObject({ ok: false, reason: 'not-damageable' });
        expect(repairBaseModule([
            { instanceId: 'wall-1', definitionId: 'hull_patch_panel' }
        ], 'wall-1')).toMatchObject({ ok: false, reason: 'not-damaged' });
    });
});
