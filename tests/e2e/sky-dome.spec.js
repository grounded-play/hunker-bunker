import { expect, test } from '@playwright/test';

// startRunAndSkipIntro's 75s deadline is not enough for this spec on a cold
// dev server -- the run reaches gameplay, just later than that gate allows.
// This waits on the same conditions with a longer budget, and additionally
// requires the sky rig to be mounted before the assertions begin.
async function bootToSkyReady(page) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => typeof window.HunkerTriggerBoot === 'function', { timeout: 30_000 });
    await page.evaluate(() => { window.skipAllIntro = true; }).catch(() => {});
    await page.locator('body').click({ force: true }).catch(() => {});

    const selectors = [
        '#title-newrun-btn', '#roster-confirm-btn', '#start-game',
        '#armory-btn-embark', '#net-deploy-btn',
        '#global-skip-intro-btn', '#mothership-choice-skip'
    ];
    const deadline = Date.now() + 150_000;
    let ready = false;
    while (Date.now() < deadline) {
        ready = await page.evaluate(() => {
            window.skipAllIntro = true;
            const game = window.game;
            return Boolean(game?.skyRig?.group?.parent)
                && game.performanceProfile === 'gameplay'
                && game.inputEnabled === true
                && !game.hasBlockingGameplayOverlay?.();
        }).catch(() => false);
        if (ready) break;
        for (const selector of selectors) {
            const button = page.locator(selector);
            if (await button.isVisible().catch(() => false)
                && await button.isEnabled().catch(() => false)) {
                await button.click({ timeout: 2_000 }).catch(() => {});
            }
        }
        await page.waitForTimeout(600);
    }
    expect(ready, 'run should reach gameplay with the sky rig mounted').toBe(true);
}

// Proves the sky rig actually mounts and draws in a real WebGL context.
// The unit suites cover the state model and the layer selection; only a real
// browser can show that the textures load and the dome ends up on screen.
test.describe('procedural sky dome', () => {
    test('mounts a camera-locked rig with every layer textured', async ({ page }) => {
        await bootToSkyReady(page);

        const rig = await page.evaluate(() => {
            const game = window.game;
            const group = game?.skyRig?.group;
            if (!group) return null;
            return {
                childCount: group.children.length,
                visibleLayers: group.children
                    .filter((c) => c.userData?.layerId && c.visible)
                    .map((c) => ({
                        id: c.userData.layerId,
                        hasTexture: Boolean(c.material?.map),
                        // A texture that failed to load stays 0x0.
                        width: c.material?.map?.image?.width ?? 0,
                        opacity: c.material?.opacity ?? 0
                    })),
                weatherState: game.skyState?.weatherState ?? null,
                inScene: Boolean(group.parent)
            };
        });

        expect(rig, 'sky rig should exist on the live game').not.toBeNull();
        expect(rig.inScene).toBe(true);
        expect(rig.visibleLayers.length).toBeGreaterThan(0);

        for (const layer of rig.visibleLayers) {
            expect(layer.hasTexture, `${layer.id} should have a texture`).toBe(true);
            expect(layer.width, `${layer.id} texture should have decoded`).toBeGreaterThan(0);
        }

        // The three horizon bands are always present -- they meet the terrain
        // edge, so a missing one is a visible seam, not a subtler sky.
        const ids = rig.visibleLayers.map((l) => l.id);
        expect(ids).toContain('horizon.far');
        expect(ids).toContain('horizon.mid');
        expect(ids).toContain('horizon.near');
    });

    test('keeps the rig centred on the camera as the player moves', async ({ page }) => {
        await bootToSkyReady(page);

        const drift = await page.evaluate(async () => {
            const game = window.game;
            const sample = () => {
                const g = game.skyRig.group.position;
                const c = game.camera.position;
                return Math.hypot(g.x - c.x, g.y - c.y, g.z - c.z);
            };
            const before = sample();
            game.player.position.x += 40;
            game.player.position.z += 40;
            await new Promise((resolve) => setTimeout(resolve, 600));
            return { before, after: sample() };
        });

        // Any real separation means the 160-unit far plane could clip the sky.
        expect(drift.before).toBeLessThan(0.001);
        expect(drift.after).toBeLessThan(0.001);
    });

    test('renders a lit sky at noon and a starfield at midnight', async ({ page }) => {
        await bootToSkyReady(page);

        const sample = async (timeOfDay) => {
            await page.evaluate((t) => { window.game.timeOfDay = t; }, timeOfDay);
            await page.waitForTimeout(700);
            return page.evaluate(() => ({
                dayFactor: window.game.skyState.dayFactor,
                starOpacity: window.game.skyState.starOpacity,
                sunY: window.game.skyState.sunDirection.y
            }));
        };

        const noon = await sample(0.5);
        await page.screenshot({ path: 'test-results/sky-noon.png' });
        const midnight = await sample(0.0);
        await page.screenshot({ path: 'test-results/sky-midnight.png' });

        expect(noon.dayFactor).toBeGreaterThan(0.9);
        expect(midnight.dayFactor).toBeLessThan(0.1);
        // Thin-atmosphere fiction: deep space never fully washes out.
        expect(noon.starOpacity).toBeGreaterThan(0);
        expect(midnight.starOpacity).toBeGreaterThan(noon.starOpacity);
    });
});
