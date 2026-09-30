import { expect, test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

const CLASSES = ['scout', 'tank', 'engineer'];
const STATES = ['idle', 'bloodied', 'frozen', 'toxic', 'critical', 'dead'];
const CAPTURE_SCREENSHOTS = process.env.HB_HUD_SCREENSHOTS === '1';

async function bootWearSession(page) {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
            await bootToOperatorMenu(page);
            await startRunAndSkipIntro(page);
            await page.waitForFunction(() => Boolean(window.suitCondition && window.hudGameplayState && window.game));
            return;
        } catch (error) {
            lastError = error;
            if (attempt < 2) await page.goto('/');
        }
    }
    throw lastError;
}

test.describe('HUD suit-condition visual states', () => {
    test.describe.configure({ timeout: 300_000 });

    test('keeps all condition paint on class-invariant housings', async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.addInitScript(() => localStorage.setItem('hb_hud_layout', 'dock'));
        await bootWearSession(page);
        await page.evaluate(() => {
            document.documentElement.dataset.hudLayout = 'dock';
            document.documentElement.classList.remove('phase-menu');
            document.documentElement.classList.add('phase-gameplay');
            document.getElementById('ui').classList.remove('hidden');
            window.game.setGodMode?.(true);
            window.game.setLoadingPaused?.(true);
        });

        let baseline = null;
        const screenshots = [];
        for (const operatorClass of CLASSES) {
            for (const state of STATES) {
                const metrics = await page.evaluate(({ operatorClass: className, state: condition }) => {
                    const root = document.documentElement;
                    root.dataset.operatorClass = className;
                    document.body.classList.remove('player-cold-exposed', 'player-poisoned');
                    window.suitCondition.apply({ type: 'new-life' });
                    window.hudGameplayState.snapshot = {};
                    window.hudGameplayState.update({});

                    if (condition === 'bloodied') {
                        window.suitCondition.apply({ type: 'combat', active: true });
                        window.suitCondition.apply({
                            type: 'damage', hp: 2, maxHp: 3, inCombat: true,
                            goreEnabled: true, reason: 'crawler', direction: 'center'
                        });
                    } else if (condition === 'frozen') {
                        document.body.classList.add('player-cold-exposed');
                        window.suitCondition.readConditions();
                    } else if (condition === 'toxic') {
                        document.body.classList.add('player-poisoned');
                        window.suitCondition.readConditions();
                    } else if (condition === 'critical') {
                        window.suitCondition.apply({ type: 'damage', hp: 1, maxHp: 3, inCombat: false, goreEnabled: true });
                        window.hudGameplayState.update({ hp: 1, maxHp: 3 });
                    } else if (condition === 'dead') {
                        window.suitCondition.apply({ type: 'death' });
                        window.hudGameplayState.update({ dead: true });
                    }

                    const rect = (selector) => {
                        const box = document.querySelector(selector).getBoundingClientRect();
                        return [box.x, box.y, box.width, box.height].map((value) => Math.round(value * 10) / 10);
                    };
                    return {
                        housings: ['map', 'status', 'arms'].map((panel) => rect(`.dock-housing--${panel}`)),
                        damageTier: root.dataset.suitDamageTier,
                        gameplayState: root.dataset.hudGameplayState,
                        blood: root.style.getPropertyValue('--suit-blood'),
                        frost: root.style.getPropertyValue('--suit-frost'),
                        toxin: root.style.getPropertyValue('--suit-toxin')
                    };
                }, { operatorClass, state });

                baseline ??= metrics.housings;
                expect(metrics.housings, `${operatorClass}/${state} housing geometry`).toEqual(baseline);
                if (state === 'bloodied') expect(Number(metrics.blood)).toBeGreaterThan(0);
                if (state === 'frozen') expect(Number(metrics.frost)).toBe(1);
                if (state === 'toxic') expect(Number(metrics.toxin)).toBe(1);
                if (state === 'critical') {
                    expect(Number(metrics.damageTier)).toBeGreaterThanOrEqual(2);
                    expect(metrics.gameplayState).toBe('critical');
                }
                if (state === 'dead') {
                    expect(metrics.damageTier).toBe('3');
                    expect(metrics.gameplayState).toBe('dead');
                }
                if (CAPTURE_SCREENSHOTS) {
                    screenshots.push({
                        name: `hud-wear-deck-${operatorClass}-${state}.png`,
                        body: await page.screenshot()
                    });
                }
            }
        }

        for (const screenshot of screenshots) {
            await testInfo.attach(screenshot.name, { body: screenshot.body, contentType: 'image/png' });
        }
    });
});
