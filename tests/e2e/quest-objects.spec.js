import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Sprint 53 V7: each camp quest's targets wear their own object and a beacon.
test.describe.configure({ timeout: 300_000 });

for (const [campId, questId] of [['camp_meridian', 'reactor_venting'], ['camp_vesper', 'armory_breach']]) {
    test(`${questId} shows its own object with a beacon`, async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        // The run's start sequence can still place the operator at the ship.
        await page.waitForTimeout(4000);
        const info = await page.evaluate(async ({ campId, questId }) => {
            const game = window.game;
            const real = game.getCampById(campId);
            if (!real) return { error: 'no camp' };
            // Outer camps sit past the ring lock, which returns the operator
            // to the ship, so stage the quest around where they stand: this
            // checks how its objects look, not where the camp is.
            const camp = { ...real, pos: { x: game.player.position.x, z: game.player.position.z } };
            game.acceptCampQuest(camp, { id: questId, label: questId });
            const aq = game._activeCampQuest;
            const all = [...(aq?.props ?? []), ...(aq?.landmarks ?? [])];
            return {
                kind: aq?.kind,
                models: all.map((s) => s.userData.world3dModelType ?? null),
                beacons: all.filter((s) => s.userData.questBeacon?.parent).length,
                landmarks: aq?.landmarks?.length ?? 0
            };
        }, { campId, questId });
        expect(info.error).toBeUndefined();
        expect(info.beacons).toBeGreaterThan(0);
        // Stand by the first quest object (a far camp's teleport can be undone
        // while its chunks stream in), then let the stand-in model load.
        const probe = await page.evaluate(async () => {
            const game = window.game;
            const aq = game._activeCampQuest;
            const all = [...(aq?.props ?? []), ...(aq?.landmarks ?? [])];
            const focus = aq?.landmarks?.[0] ?? all[0];
            const fx = Math.round(focus.position.x);
            const fz = Math.round(focus.position.z);
            let stand = [focus.position.x, focus.position.z];
            search: for (let r = 1; r <= 3; r++) {
                for (let ox = -r; ox <= r; ox++) {
                    for (let oz = -r; oz <= r; oz++) {
                        if (game.isSnailTileWalkable(fx + ox, fz + oz) && game.canOccupyPosition(fx + ox, fz + oz)) {
                            stand = [fx + ox, fz + oz];
                            break search;
                        }
                    }
                }
            }
            for (let i = 0; i < 6; i++) {
                game.player.position.set(stand[0], 0, stand[1]);
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            return {
                count: all.filter((s) => s.userData.world3dRoot).length,
                stand, player: [game.player.position.x, game.player.position.z], focus: [focus.position.x, focus.position.z]
            };
        });
        if (!probe.count) console.log('QUEST-DBG', JSON.stringify(probe));
        const loaded = probe.count;
        // Landing on a lore drop opens its log and pauses the world: close it.
        if (await page.locator('#lore-modal:not(.hidden)').count()) await page.keyboard.press('Escape');
        await page.waitForTimeout(2500);
        const loadedAfter = await page.evaluate(() => {
            const aq = window.game._activeCampQuest;
            return [...(aq?.props ?? []), ...(aq?.landmarks ?? [])].filter((s) => s.userData.world3dRoot).length;
        });
        expect(Math.max(loaded, loadedAfter)).toBeGreaterThan(0);
        console.log(questId, JSON.stringify(info), 'models loaded', loaded, loadedAfter);
        await page.screenshot({ path: `playwright-report/screenshots/quest-object-${questId}.png` });
        await page.evaluate(() => window.game.clearActiveCampQuestEntities());
        const leftovers = await page.evaluate(() => {
            let count = 0;
            window.game.scene.traverse((node) => { if (node.userData?.isQuestBeacon) count += 1; });
            return count;
        });
        expect(leftovers).toBe(0);
    });
}
