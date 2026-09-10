import { describe, it, expect } from 'vitest';
import { getArmoryIcon, getArmoryModel, getArmoryOfferedIds } from './armoryAssets.js';
import { getCatalogEntry, ITEM_TYPE } from './itemOwnership.js';
import { ARMORY_PREVIEWS } from './data/armoryPreviews.js';

describe('Armory item presentation', () => {
    it('uses unique model pictures for community operators, including legacy ID prefixes', () => {
        const ids = getArmoryOfferedIds().chassis.filter((id) => id.startsWith('comm_'));
        const icons = ids.map(getArmoryIcon);
        expect(new Set(icons).size).toBe(ids.length);
        for (const id of ids) {
            expect(ARMORY_PREVIEWS[id].model).toBe(getArmoryModel(id));
            expect(ARMORY_PREVIEWS[id].source).toBe('model-render');
        }
    });
    it('replaces green source art and describes unauthored rewards honestly', () => {
        for (const id of ['4138', '4142', '4143', '4144']) {
            expect(getArmoryIcon(id, '/economy/green-source.png')).toBe(`/economy/armory/${id}.png`);
        }
        expect(getCatalogEntry('2003').name).toBe('Queen Slayer Emblem');
        expect(getCatalogEntry('5002').type).toBe(ITEM_TYPE.SKIN);
        expect(getCatalogEntry('5002').name).toBe('QUICK STUDY Carbine');
        expect(ARMORY_PREVIEWS['5002'].source).toBe('achievement-emblem');
        expect(getArmoryModel('5002')).toBeNull();
        expect(getArmoryOfferedIds()['weapon frame']).not.toContain('frame:gg1');
    });
});
