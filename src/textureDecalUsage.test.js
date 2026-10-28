import { describe, expect, it } from 'vitest';

import { LEGACY_DECAL_LAYERS } from './data/legacyDecalLayers.js';
import { WORLD_EXPANSION_80_SPECS } from './data/worldExpansion80.js';
import { MISSING_WORLD_STORY_50_SPECS } from './data/missingWorldStory50.js';
import { DECAL_WORLD_SCALES, DRESSING_KITS, ROLE_DRESSING, dressingKitFor } from './roomDressingKits.js';
import { getSurfaceAssetProfile } from './surfaceAssetRegistry.js';

const familyOf = (name) => name.replace(/_[abcd]$/, '');

describe('total room decal usage', () => {
    it('assigns every PBR decal family a placement, support plane, and physical scale', () => {
        const used = new Set();
        for (const kit of [...Object.values(DRESSING_KITS), ...Object.values(ROLE_DRESSING)]) {
            for (const type of [...(kit.wallDecals ?? []), ...(kit.floorDecals ?? [])]) used.add(type);
        }
        for (const spec of [...WORLD_EXPANSION_80_SPECS, ...MISSING_WORLD_STORY_50_SPECS]) {
            const kit = dressingKitFor(spec.theme, spec.role);
            for (const type of [...kit.wallDecals, ...kit.floorDecals]) used.add(type);
        }

        for (const family of new Set(LEGACY_DECAL_LAYERS.map(({ name }) => familyOf(name)))) {
            expect(used, `${family} placement`).toContain(family);
            expect(getSurfaceAssetProfile(family), `${family} support plane`).not.toBeNull();
            expect(DECAL_WORLD_SCALES[family]?.min, `${family} minimum scale`).toBeGreaterThan(0);
            expect(DECAL_WORLD_SCALES[family]?.max, `${family} maximum scale`).toBeGreaterThanOrEqual(DECAL_WORLD_SCALES[family]?.min);
            expect(DECAL_WORLD_SCALES[family]?.max, `${family} maximum scale`).toBeLessThanOrEqual(4);
        }
    });
});
