import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WORLD_3D_MODELS } from './world3dOverlay.js';
import { ROOM_THEME_CATALOG } from './roomThemes.js';

// 3D asset audit 2026-10-01: seven world props were registered (and loaded by
// the debug showroom) but placed nowhere in the game. Every registered prop
// must be placed by a room theme or by a named placement module.
const PROP_PREFIXES = ['prop_', 'state_', 'arch_', 'fixture_', 'scatter_', 'body_'];
const PLACEMENT_SOURCES = [
    'camp.js', 'hiveSite.js', 'threeGame.js', 'data/roomBuilds.js', 'roomPopulation.js',
    'territoryStructures.js', 'caveEntrance.js', 'foundry.js', 'mazeExpedition.js'
];

describe('world prop placement', () => {
    it('places every registered prop somewhere in the game', () => {
        const themed = new Set();
        for (const theme of ROOM_THEME_CATALOG) {
            for (const key of ['signatureProps', 'largeProps', 'smallProps', 'rareProps']) {
                for (const id of theme[key] ?? []) themed.add(id);
            }
        }
        const sources = PLACEMENT_SOURCES
            .map((rel) => fileURLToPath(new URL(`./${rel}`, import.meta.url)))
            .filter((file) => fs.existsSync(file))
            .map((file) => fs.readFileSync(file, 'utf8'))
            .join('\n');
        const unplaced = Object.keys(WORLD_3D_MODELS)
            .filter((id) => PROP_PREFIXES.some((prefix) => id.startsWith(prefix)))
            .filter((id) => !themed.has(id) && !new RegExp(`\\b${id}\\b`).test(sources));
        expect(unplaced).toEqual([]);
    });
});
