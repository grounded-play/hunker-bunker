import { describe, expect, it } from 'vitest';
import {
    assignRoomThemes,
    chooseRoomTheme,
    LIVED_IN_DECALS,
    PRESENTATION_STATE_MODIFIERS,
    ROOM_THEME_CATALOG
} from './roomThemes.js';

function seededRandom(seed) {
    let state = seed >>> 0 || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}

describe('room themes', () => {
    it('only chooses themes valid for the current biome', () => {
        for (const biome of ['active', 'cryo', 'bio']) {
            for (let seed = 1; seed <= 100; seed += 1) {
                const { theme } = chooseRoomTheme(
                    { role: 'generic', doors: [{}, {}] },
                    { biome, depthTier: 3, random: seededRandom(seed) }
                );
                expect(theme.biomes).toContain(biome);
            }
        }
    });

    it('preserves authored special roles and selects their matching theme', () => {
        const rooms = assignRoomThemes(
            [{ id: 'r', role: 'nest', doors: [{}] }],
            { biome: 'bio', depthTier: 3, random: seededRandom(7) }
        );
        expect(rooms[0].role).toBe('nest');
        expect(rooms[0].theme).toBe('bio-nest');
    });

    it.each([
        ['medical', 'support', 'medical'],
        ['armory', 'reward', 'security'],
        ['o2', 'objective', 'engineering'],
        ['fabricator', 'support', 'engineering'],
        ['puzzle', 'challenge', 'engineering'],
        ['trap_reward', 'challenge', 'security'],
        ['cache', 'reward', 'reward'],
        ['gate', 'ringCrossing', 'security']
    ])('maps Lane B %s/%s rooms to the %s presentation role', (family, semanticRole, expectedRole) => {
        const { role, theme } = chooseRoomTheme(
            { family, role: semanticRole, doors: [{}] },
            { biome: 'active', depthTier: 3, random: () => 0 }
        );

        expect(role).toBe(expectedRole);
        expect(theme.roles).toContain(expectedRole);
    });

    it.each([
        ['support', 'utility'],
        ['objective', 'engineering'],
        ['challenge', 'security'],
        ['ringCrossing', 'security']
    ])('maps family-less semantic role %s to %s', (semanticRole, expectedRole) => {
        const { role, theme } = chooseRoomTheme(
            { role: semanticRole, doors: [{}] },
            { biome: 'active', depthTier: 3, random: () => 0 }
        );
        expect(role).toBe(expectedRole);
        expect(theme.roles).toContain(expectedRole);
    });

    it('normalizes runtime biome keys before theme selection', () => {
        const { theme } = chooseRoomTheme(
            { family: 'armory', role: 'reward' },
            { biome: 'CRYO', depthTier: 3, random: () => 0 }
        );
        expect(theme.biomes).toContain('cryo');
        expect(theme.roles).toContain('security');
    });

    it.each([
        ['dormant', null],
        ['questActive', 'decal_hazard_stripes'],
        ['resolved', 'decal_meridian_stencil']
    ])('carries the authored %s state variant into presentation', (stateVariant, appliedDecal) => {
        const [room] = assignRoomThemes(
            [{ id: stateVariant, family: 'o2', role: 'objective', stateVariant }],
            { biome: 'active', depthTier: 2, random: () => 0 }
        );

        expect(PRESENTATION_STATE_MODIFIERS).toHaveProperty(stateVariant);
        expect(room.themeConfig).toMatchObject({ stateVariant, appliedDecal });
    });

    it('defines a signature prop for every theme', () => {
        for (const theme of ROOM_THEME_CATALOG) {
            expect(theme.signatureProps.length, theme.id).toBeGreaterThan(0);
            expect(theme.ambientProps.length, theme.id).toBeGreaterThan(0);
        }
        expect(new Set(Object.values(LIVED_IN_DECALS).flat()).size).toBe(8);
    });

    it('places every survival-pack prefab through the fortified camp theme', () => {
        const camp = ROOM_THEME_CATALOG.find((theme) => theme.id === 'camp-fortified');
        const placed = new Set([
            ...camp.signatureProps,
            ...camp.largeProps,
            ...camp.smallProps
        ]);
        for (const type of [
            'prop_camp_bedrolls', 'prop_camp_cookfire_doused',
            'prop_camp_cookfire_lit', 'prop_camp_cot', 'prop_camp_crate',
            'scatter_bolts', 'scatter_cable_coil'
        ]) {
            expect(placed.has(type), type).toBe(true);
        }
        expect(ROOM_THEME_CATALOG.some((theme) => theme.largeProps?.includes('prop_hive_resin_sac'))).toBe(true);
    });
});
