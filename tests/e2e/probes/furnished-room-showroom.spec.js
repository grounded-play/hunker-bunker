import { test, expect } from '@playwright/test';
import { ALL_ROOM_BUILDS } from '../../../src/roomBuilds.js';

// Furnished-room showroom: every authored prefab room, themed, populated and
// dressed with the game's real textures, kit shells, gateways, props, decals
// and the signature practical. Writes docs/reports/assets/furnished-rooms/.
// Run with HB_PROBES=1 (needs the dev server).
const BIOME_FOR = (build) => {
    const eligible = build.biomeEligibility ?? [];
    return ['bio', 'cryo', 'active', 'cave'].find((biome) => eligible.includes(biome)) ?? 'active';
};

for (const build of ALL_ROOM_BUILDS) {
    const biome = BIOME_FOR(build);
    test(`furnished room — ${build.id} (${biome})`, async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await page.goto(`/tests/e2e/fixtures/furnished-room-showroom.html?build=${build.id}&biome=${biome}`);
        await page.waitForFunction(() => window.__showroom?.ready === true, null, { timeout: 90_000 });
        const result = await page.evaluate(() => window.__showroom);
        expect(result.props + result.decals).toBeGreaterThan(0);
        if (result.missing.length) console.log(`${build.id}: no asset for ${result.missing.join(', ')}`);
        await page.screenshot({ path: `docs/reports/assets/furnished-rooms/${build.id}-${biome}.png` });
    });
}
