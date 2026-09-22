import { describe, expect, it } from 'vitest';
import { remoteEquipmentSignature, resolveRemoteEquipmentVisuals } from './remoteLoadout.js';

describe('remote equipment visuals', () => {
    it('accepts class-compatible cosmetics and operator-worn modules', () => {
        const result = resolveRemoteEquipmentVisuals('TANK', {
            schemaVersion: 2,
            weaponArchetypeId: 'siege_breaker',
            weaponSkinId: '4102',
            charmId: '4131',
            overclockIds: ['4160', '4144'],
            chassisSkinId: '4114'
        });
        expect(result).toMatchObject({
            weaponArchetypeId: 'siege_breaker', weaponSkinId: '4102', charmId: '4131', chassisSkinId: '4114'
        });
        expect(result.overclockIds).toEqual(['4160', '4144']);
    });

    it('rejects cross-class, pending, and wrong-family identifiers', () => {
        const result = resolveRemoteEquipmentVisuals('SCOUT', {
            schemaVersion: 2,
            weaponArchetypeId: 'tesla_lock',
            weaponSkinId: '5002',
            charmId: '4160',
            overclockIds: ['4130', '4160', '4161'],
            chassisSkinId: '4114'
        });
        expect(result.weaponArchetypeId).toBe('talon');
        expect(result.weaponSkinId).toBeNull();
        expect(result.charmId).toBeNull();
        expect(result.overclockIds).toEqual(['4160', null]);
        expect(result.chassisSkinId).toBeNull();
        expect(remoteEquipmentSignature(result)).toContain('4160');
    });
});
