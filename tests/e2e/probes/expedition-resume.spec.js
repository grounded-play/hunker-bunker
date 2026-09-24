import { expect, test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Automated state-restoration evidence only. Physical Deck sleep, process
// termination, Steam Cloud conflicts, and player experience remain open.
test('solo expedition survives a full page reload without advancing', async ({ page }) => {
    test.setTimeout(360_000);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);

    const before = await page.evaluate(() => {
        const game = window.game;
        const x = game.player.position.x;
        const z = game.player.position.z;
        game.playerVitals.hp = Math.max(1, game.playerVitals.maxHp - 1);
        game.playerVitals.o2 = 47;
        window.pickupCounterState.health = 2;
        window.pickupCounterState.ammo = 7;
        window.pickupCounterState.weapon = 4;
        window.pickupCounterState.coin = 3;
        game.missionState = { type: 'elimination', label: 'PROBE', status: 'active', killCount: 4, targetKills: 8 };
        game.killedEnemyScatterKeys.add('probe:defeated');
        const enemy = game.spawnEnemyInstance('cryosnail', x + 2, z + 1);
        enemy.userData.scatterKey = 'resume-probe:enemy';
        enemy.userData.hp = 2;
        const saved = game.saveExpeditionSuspend();
        return {
            resumeId: saved.resumeId,
            generation: saved.generation,
            expeditionIndex: game.activeExpedition.expeditionIndex,
            expeditionSeed: game.activeExpedition.expeditionSeed,
            x, z
        };
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('title-continue-btn')?.textContent?.includes('RESUME'), null, { timeout: 180_000 });
    await page.locator('#title-continue-btn').click();
    await page.waitForFunction(() => window.isGameplayReady?.() === true, null, { timeout: 180_000 });

    const after = await page.evaluate(() => {
        const game = window.game;
        const enemy = game.scatterSprites.find((sprite) => sprite.userData?.scatterKey === 'resume-probe:enemy');
        const stored = JSON.parse(localStorage.getItem('hb_expedition_suspend_v1') ?? 'null');
        return {
            resumeId: stored?.resumeId,
            generation: stored?.generation,
            claimRemaining: localStorage.getItem('hb_expedition_resume_claim_v1') !== null,
            expeditionIndex: game.activeExpedition.expeditionIndex,
            expeditionSeed: game.activeExpedition.expeditionSeed,
            position: { x: game.player.position.x, z: game.player.position.z },
            vitals: { hp: game.playerVitals.hp, o2: game.playerVitals.o2 },
            inventory: window.getPickupCounterState(),
            mission: game.missionState,
            killedKey: game.killedEnemyScatterKeys.has('probe:defeated'),
            enemy: enemy ? { hp: enemy.userData.hp, x: enemy.position.x, z: enemy.position.z } : null
        };
    });

    expect(after.resumeId).toBe(before.resumeId);
    expect(after.generation).toBeGreaterThan(before.generation);
    expect(after.claimRemaining).toBe(false);
    expect(after.expeditionIndex).toBe(before.expeditionIndex);
    expect(after.expeditionSeed).toBe(before.expeditionSeed);
    expect(after.position.x).toBeCloseTo(before.x, 3);
    expect(after.position.z).toBeCloseTo(before.z, 3);
    expect(after.vitals).toMatchObject({ o2: 47 });
    expect(after.inventory).toMatchObject({ health: 2, ammo: 7, weapon: 4, coin: 3 });
    expect(after.mission).toMatchObject({ status: 'active', killCount: 4, targetKills: 8 });
    expect(after.killedKey).toBe(true);
    expect(after.enemy).toMatchObject({ hp: 2 });

    console.log('EXPEDITION_RESUME ' + JSON.stringify({ before, after }));
});
