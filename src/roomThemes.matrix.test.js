import { describe, expect, it } from 'vitest';
import { chooseRoomTheme } from './roomThemes.js';

describe('room theme biome/role matrix', () => {
    const cases = [
        ['bio', 'medical', 'bio-medical'],
        ['bio', 'security', 'bio-security'],
        ['bio', 'engineering', 'bio-engineering'],
        ['active', 'storage', 'bunker-storage']
    ];

    it.each(cases)('routes %s/%s without a generic fallback', (biome, family, expectedTheme) => {
        const selection = chooseRoomTheme({ family }, { biome, random: () => 0 });
        expect(selection.role).toBe(family);
        expect(selection.theme.id).toBe(expectedTheme);
    });
});
