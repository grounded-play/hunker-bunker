import { describe, expect, it } from 'vitest';
import {
    commitShipModuleActionCooldown,
    getShipModuleAction,
    shipModuleActionCooldownRemaining
} from './shipModuleActions.js';

describe('installed ship module actions', () => {
    it('gives every recovered ship system a distinct action and source color', () => {
        expect(getShipModuleAction('ship_life_support_core')).toMatchObject({ id: 'oxygen-purge', color: 0x38bdf8 });
        expect(getShipModuleAction('ship_navigation_core')).toMatchObject({ id: 'route-lock' });
        expect(getShipModuleAction('ship_comms_array')).toMatchObject({ id: 'deep-scan', color: 0x22c55e });
        expect(getShipModuleAction('ship_engine_manifold')).toMatchObject({ id: 'field-service', color: 0xf97316 });
    });

    it('tracks cooldown by stable installed instance without mutating the module', () => {
        const cooldowns = new Map();
        const module = { instanceId: 'engine-1', definitionId: 'ship_engine_manifold' };
        expect(commitShipModuleActionCooldown(cooldowns, module, 10)).toBe(true);
        expect(shipModuleActionCooldownRemaining(cooldowns, module.instanceId, 20)).toBe(20);
        expect(shipModuleActionCooldownRemaining(cooldowns, module.instanceId, 40)).toBe(0);
    });
});
