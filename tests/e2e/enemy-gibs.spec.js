import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Browser coverage for enemy dismemberment.
//
// The Vitest suite covers the fracture maths against synthetic geometry; what
// it cannot reach is the part that actually matters here — that a real enemy,
// with a real GLB loaded by enemy3dOverlay, comes apart in the live scene when
// it dies, and that the Settings toggle genuinely suppresses it.
test.describe('enemy dismemberment', () => {
    // A cold boot walks a class intro, cutscene, dialogue and door transition
    // and costs most of the config's 120s per-test budget on its own, leaving
    // nothing for a test that then has to wait on a GLB load. These are
    // gameplay tests; they need a gameplay-sized budget.
    test.describe.configure({ timeout: 300_000 });

    test.beforeEach(async ({ page }) => {
        // startRunAndSkipIntro assumes an already-booted page -- it never
        // navigates. Omitting this left window.game undefined and made the
        // failure look like the shared helper was broken.
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        await page.evaluate(() => window.game?.setGodMode?.(true));
    });

    /** Spawn one enemy next to the player and wait for its 3D model to load. */
    async function spawnEnemy(page) {
        return page.evaluate(async () => {
            const game = window.game;
            const px = game.player?.position?.x ?? 0;
            const pz = game.player?.position?.z ?? 0;
            const sprite = game.spawnEnemyInstance?.('cybersnail', px + 3, pz + 3);
            if (!sprite) return null;
            // The overlay loads the GLB lazily; gibs need it present.
            for (let i = 0; i < 120; i++) {
                if (sprite.userData.enemy3dVisual?.root) break;
                await new Promise((r) => setTimeout(r, 100));
            }
            return Boolean(sprite.userData.enemy3dVisual?.root);
        });
    }

    async function killEnemy(page) {
        return page.evaluate(() => {
            const game = window.game;
            const sprite = game.scatterSprites?.find?.(
                (s) => s?.userData?.type === 'cybersnail' && !s.userData.burstTriggered
            ) ?? game.scene.children.find(
                (c) => c?.userData?.type === 'cybersnail' && !c.userData.burstTriggered
            );
            if (!sprite) return false;
            game.damageSnail(sprite, 999);
            return true;
        });
    }

    const countGibGroups = (page) => page.evaluate(() => {
        let n = 0;
        window.game.scene.traverse((o) => {
            if (o.name === 'enemy-gibs') n += 1;
        });
        return n;
    });

    test('a killed enemy breaks into moving chunks', async ({ page }) => {
        await page.evaluate(() => window.localStorage.setItem('hb_gore', 'on'));
        expect(await spawnEnemy(page)).toBe(true);
        expect(await countGibGroups(page)).toBe(0);

        expect(await killEnemy(page)).toBe(true);
        await expect.poll(() => countGibGroups(page), { timeout: 5_000 }).toBeGreaterThan(0);

        const chunkCount = await page.evaluate(() => {
            let group = null;
            window.game.scene.traverse((o) => {
                if (!group && o.name === 'enemy-gibs') group = o;
            });
            return group ? group.children.length : 0;
        });
        expect(chunkCount).toBeGreaterThan(1);

        // Chunks must actually travel — a pile that never moves is a bug the
        // static scene-graph assertions above would happily pass.
        const before = await page.evaluate(() => {
            let group = null;
            window.game.scene.traverse((o) => {
                if (!group && o.name === 'enemy-gibs') group = o;
            });
            return group.children.map((c) => [c.position.x, c.position.y, c.position.z]);
        });
        await page.waitForTimeout(500);
        const after = await page.evaluate(() => {
            let group = null;
            window.game.scene.traverse((o) => {
                if (!group && o.name === 'enemy-gibs') group = o;
            });
            return group ? group.children.map((c) => [c.position.x, c.position.y, c.position.z]) : [];
        });
        expect(after.length).toBe(before.length);
        const moved = after.filter((p, i) => {
            const q = before[i];
            return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 0.01;
        });
        expect(moved.length).toBeGreaterThan(0);
    });

    test('the corpse still drops so shells stay collectable', async ({ page }) => {
        await page.evaluate(() => window.localStorage.setItem('hb_gore', 'on'));
        const before = await page.evaluate(() => window.game.corpses?.length ?? 0);
        expect(await spawnEnemy(page)).toBe(true);
        expect(await killEnemy(page)).toBe(true);
        await expect.poll(
            () => page.evaluate(() => window.game.corpses?.length ?? 0),
            { timeout: 5_000 }
        ).toBeGreaterThan(before);

        const collectable = await page.evaluate(
            () => window.game.corpses.some((c) => c.userData?.shellValue > 0 && !c.userData.collected)
        );
        expect(collectable).toBe(true);
    });

    test('the Settings toggle suppresses the gibs', async ({ page }) => {
        await page.evaluate(() => {
            window.localStorage.setItem('hb_gore', 'off');
            window.__GORE_ENABLED__ = false;
        });
        expect(await spawnEnemy(page)).toBe(true);
        expect(await killEnemy(page)).toBe(true);
        // Give the death burst the same grace the positive test gets.
        await page.waitForTimeout(1_500);
        expect(await countGibGroups(page)).toBe(0);
    });
});
