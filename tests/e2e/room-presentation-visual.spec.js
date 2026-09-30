import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

test('procedural bunker rooms mount practical lights and foreground cutaways', async ({ page }) => {
    test.setTimeout(300_000);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForFunction(() => (
        window.game?.performanceProfile === 'gameplay'
        && window.game?.wfcMetadataCache instanceof Map
    ), null, { timeout: 30_000 });

    const target = await page.evaluate(() => {
        const game = window.game;
        const findRoom = ({ includeCrashSite = false } = {}) => {
            for (const [chunkKey, metadata] of game.wfcMetadataCache.entries()) {
                if (!includeCrashSite && chunkKey === '0,0') continue;
                const room = metadata?.roomInstances?.find((candidate) => candidate.interior?.length);
                if (room) return { chunkKey, room };
            }
            return null;
        };
        let selected = findRoom();
        if (!selected) {
            for (const [chunkX, chunkY] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]) {
                const chunkKey = `${chunkX},${chunkY}`;
                game.getOrCreateChunk(chunkX, chunkY);
                if (!game.chunkMeshes.has(chunkKey)) game.mountChunk(chunkX, chunkY);
                selected = findRoom();
                if (selected) break;
            }
        }
        if (!selected) selected = findRoom({ includeCrashSite: true });
        if (!selected) return null;
        const [chunkX, chunkY] = selected.chunkKey.split(',').map(Number);
        const center = selected.room.interior[Math.floor(selected.room.interior.length / 2)];
        const x = chunkX * game.chunkSize + center.x;
        const z = chunkY * game.chunkSize + center.y;
        game.setGodMode?.(true);
        game.teleportPlayerTo(x, z, { safeFloor: false });
        game.snapCameraToPlayer?.();
        return { x, z, chunkKey: selected.chunkKey, roomId: selected.room.id };
    });
    expect(target).not.toBeNull();
    await page.waitForTimeout(2_000);
    const closeLore = page.locator('#close-lore-modal');
    if (await closeLore.isVisible().catch(() => false)) await closeLore.click();

    const presentation = await page.evaluate(() => {
        const game = window.game;
        let fixtureCount = 0;
        let capCount = 0;
        let sourceCount = 0;
        for (const group of game.chunkMeshes.values()) {
            if (!group.visible) continue;
            group.traverse((object) => {
                if (object.userData?.isRoomPracticalLightFixturePool) {
                    fixtureCount += object.userData.fixtureCount ?? object.count ?? 0;
                }
                if (object.userData?.isRoomCutawayCapPool) {
                    capCount += object.userData.capCount ?? object.count ?? 0;
                }
                if (object.userData?.isRoomPracticalLightSource) sourceCount += 1;
            });
        }
        const directVisibleRoomSources = game.envDynamicLights.filter((light) => (
            light.userData?.isRoomPracticalLightSource && light.visible
        )).length;
        const ui = document.getElementById('ui');
        if (ui) ui.style.visibility = 'hidden';
        document.querySelectorAll('[id*="hud"], [class*="hud"], [id*="prompt"]').forEach((element) => {
            element.style.visibility = 'hidden';
        });
        for (const id of ['tilt-shift-overlay', 'damage-vignette', 'cinematic-overlay']) {
            const element = document.getElementById(id);
            if (element) element.style.visibility = 'hidden';
        }
        return { fixtureCount, capCount, sourceCount, directVisibleRoomSources };
    });

    expect(presentation.fixtureCount).toBeGreaterThan(0);
    expect(presentation.capCount).toBeGreaterThan(0);
    expect(presentation.sourceCount).toBeGreaterThan(0);
    expect(presentation.directVisibleRoomSources).toBe(0);
    await page.screenshot({
        path: 'docs/reports/assets/gameplay-room-presentation-2026-09-29.png'
    });
});
