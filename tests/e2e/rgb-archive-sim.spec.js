import { test, expect } from '@playwright/test';
import { bootToOperatorMenu } from './helpers.js';

const RGB_SAVE_KEY = 'hb_minigame_rgb_v1';

function unlockedSave() {
    return {
        version: 1,
        unlocked: true,
        checkpoint: 'parking_lot',
        endingsSeen: [],
        gameOversSeen: [],
        settings: { hints: 'standard' },
        run: { timeBand: 0, pain: 'stable', evidence: [], inventory: [], flags: {} }
    };
}

async function completeObjectCutaway(page, label) {
    await page.locator('.rgb-hotspot', { hasText: label }).click();
    const action = page.locator('.rgb-dialogue__take');
    for (let step = 0; step < 2; step += 1) {
        if (!await action.isVisible().catch(() => false)) break;
        await action.click();
    }
    await expect(page.locator('.rgb-stage-layer--cutaway')).toHaveCount(0);
}

async function dispatchArchiveControllerActions(page, overrides = {}) {
    await page.evaluate((detail) => {
        window.dispatchEvent(new CustomEvent('hb-archive-controller-actions', {
            detail: {
                focus: { x: 0, y: 0 },
                confirm: false,
                inventory: false,
                back: false,
                reveal: false,
                pause: false,
                ...detail
            }
        }));
    }, overrides);
}

test.describe('RGB archive simulation', () => {
    test('unlocked save shows the menu entry, launches, and completes chapter 1 into a persisted checkpoint', async ({ page }) => {
        await page.goto('/');
        await page.evaluate((key) => {
            localStorage.removeItem(key);
        }, RGB_SAVE_KEY);

        await bootToOperatorMenu(page);

        const archiveBtn = page.locator('#archive-sims-btn');
        await expect(archiveBtn).toBeHidden();

        await page.evaluate(({ key, save }) => {
            localStorage.setItem(key, JSON.stringify(save));
        }, { key: RGB_SAVE_KEY, save: unlockedSave() });
        await page.reload();
        await bootToOperatorMenu(page);
        if (await page.locator('#roster-modal').isVisible()) {
            await page.locator('#close-roster-modal').click();
        }

        await expect(archiveBtn).toBeVisible();
        await archiveBtn.click();

        const modal = page.locator('#archive-sims-modal');
        await expect(modal).toBeVisible();
        await expect(page.locator('#archive-sim-rgb-status')).toHaveText('NOT STARTED');

        await page.locator('#archive-sim-rgb-launch').click();
        await page.locator('#rgb-root').waitFor({ state: 'visible' });

        await dispatchArchiveControllerActions(page, { confirm: true });
        await page.locator('.rgb-cinematic__skip').click();
        await expect(page.locator('.rgb-chapter-card__continue')).toBeVisible();
        await dispatchArchiveControllerActions(page, { confirm: true });
        await expect(page.locator('.rgb-header__title')).toHaveText(/Chapter 1/);

        await expect(page.locator('.rgb-stage-bg')).toHaveAttribute('src', /bg_sedan_interior/);
        await completeObjectCutaway(page, 'Empty Albuterol Bottle');
        await completeObjectCutaway(page, 'Check the Balance');
        await completeObjectCutaway(page, "Lucia's Message");
        await completeObjectCutaway(page, 'The Drawing and the Notebook');
        await page.locator('.rgb-hotspot', { hasText: 'Answer Lucia' }).click();
        await page.locator('.rgb-cinematic__skip').click();
        await page.waitForTimeout(400);
        await page.locator('.rgb-cinematic__skip').click();
        await page.locator('.rgb-chapter-card__continue').click();
        await expect(page.locator('.rgb-header__title')).toHaveText(/Chapter 2/);

        const savedCheckpoint = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key)).checkpoint;
        }, RGB_SAVE_KEY);
        expect(savedCheckpoint).toBe('warehouse');

        await dispatchArchiveControllerActions(page, { inventory: true });
        await expect(page.locator('.rgb-inventory')).toBeVisible();
        await expect(page.locator('.rgb-inventory__item')).toHaveCount(5);
        await dispatchArchiveControllerActions(page, { inventory: true });
        await expect(page.locator('.rgb-inventory')).toHaveCount(0);

        await completeObjectCutaway(page, 'Sorting Arm 4A');
        await page.locator('.rgb-hotspot', { hasText: 'Notebook Diagram' }).click();
    });
});
