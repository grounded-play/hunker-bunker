import { describe, expect, it } from 'vitest';
import { EQUIPMENT_DEFINITIONS, composeEquipmentModifiers, getEquipmentStatus } from './data/equipmentDefinitions.js';

describe('equipment definitions', () => {
    it('keeps every charm weapon-mounted and every overclock operator-mounted', () => {
        const definitions = Object.values(EQUIPMENT_DEFINITIONS);
        expect(definitions.filter((entry) => entry.family === 'charm')).toHaveLength(10);
        expect(definitions.filter((entry) => entry.family === 'overclock')).toHaveLength(16);
        for (const definition of definitions) {
            expect(definition.mount.startsWith(definition.family === 'charm' ? 'weapon.' : 'operator.')).toBe(true);
            expect(definition.summary.length).toBeGreaterThan(8);
        }
    });

    it('composes charm and suit effects without losing trade-offs', () => {
        const modifiers = composeEquipmentModifiers(['4130', '4140', '4160']);
        expect(modifiers.cryoDurationMultiplier).toBeCloseTo(1.05 * 1.08);
        expect(modifiers.maxHealthBonus).toBe(2);
        expect(modifiers.moveSpeedMultiplier).toBeCloseTo(0.85);
    });

    it('reports player-facing mount and effect status', () => {
        expect(getEquipmentStatus('4160')).toMatchObject({
            name: 'Ballast Plating', mount: 'CHEST CENTER', family: 'overclock'
        });
        expect(getEquipmentStatus('4135')).toMatchObject({
            name: 'Geodetic Compass', mount: 'CHARM', family: 'charm', attunement: true
        });
    });

    it('disables every equipment power in competitive play while retaining status copy', () => {
        expect(composeEquipmentModifiers(['4130', '4160'], { mode: 'pvp' })).toEqual({});
        expect(getEquipmentStatus('4160', { mode: 'pvp' })).toMatchObject({
            active: false, modeStatus: 'DISABLED IN PVP'
        });
    });

    it('gates charm power behind earnable attunement without hiding the cosmetic', () => {
        expect(composeEquipmentModifiers(['4130', '4160'], {
            isAttuned: (definition) => definition.family !== 'charm'
        })).toMatchObject({ maxHealthBonus: 2, moveSpeedMultiplier: 0.85 });
        expect(composeEquipmentModifiers(['4130', '4160'], {
            isAttuned: () => false
        }).cryoDurationMultiplier).toBeUndefined();
        expect(getEquipmentStatus('4130', { attuned: false })).toMatchObject({
            active: false, modeStatus: 'ATTUNEMENT UNLOCKS AT RANK 3'
        });
    });
});
