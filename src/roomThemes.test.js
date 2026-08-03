import { describe, expect, it } from 'vitest';
import { assignRoomThemes, chooseRoomTheme, ROOM_THEME_CATALOG } from './roomThemes.js';

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

    it('defines a signature prop for every theme', () => {
        for (const theme of ROOM_THEME_CATALOG) {
            expect(theme.signatureProps.length, theme.id).toBeGreaterThan(0);
        }
    });
});
