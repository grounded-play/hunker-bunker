import { expect, test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Sprint 48 HUD recovery R0.
//
// This is an executable audit of the known-bad painted dock, not a release gate yet.
// test.fail() keeps the suite green only while at least one documented R0 defect is
// present. Once R1 fixes the geometry/readability failures, Playwright will report an
// "unexpected pass" and this annotation must be removed.
// Set HB_HUD_SCREENSHOTS=1 for the named 12-image matrix; normal CI records metrics
// without forcing twelve large WebGL readbacks through SwiftShader.

const TARGETS = [
    { name: 'deck', width: 1280, height: 800, coverageBudget: 0.07 },
    { name: 'desktop', width: 1920, height: 1080, coverageBudget: 0.06 },
    { name: 'owner-pc', width: 2304, height: 1440, coverageBudget: 0.06 },
    { name: 'ultrawide', width: 3440, height: 1440, coverageBudget: 0.06 }
];

const CLASSES = ['scout', 'tank', 'engineer'];
const PANELS = ['map', 'status', 'arms'];
const CAPTURE_SCREENSHOTS = process.env.HB_HUD_SCREENSHOTS === '1';
const CONTENT_IDS = [
    'desktop-compass',
    'vitals-panel',
    'ship-status-panel',
    'pickup-counter-panel',
    'weapon-status-panel',
    'class-ability-panel',
    'radar-scan-panel'
];

const CRITICAL_SELECTORS = [
    '#desktop-compass .desktop-compass__readout',
    '#vitals-panel',
    '#ship-status-panel',
    '#pickup-counter-panel',
    '#weapon-status-panel',
    '#class-ability-panel',
    '#radar-scan-panel'
];

async function ensureHudAuditSession(page) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        const auditAlive = await page.evaluate(() => (
            window.__hbHudAuditSession === true
            && Boolean(window.game)
            && !document.getElementById('ui')?.classList.contains('hidden')
        )).catch(() => false);
        if (auditAlive) return;

        const ready = await page.evaluate(() => window.isGameplayReady?.() ?? false).catch(() => false);
        if (!ready) {
            await bootToOperatorMenu(page);
            await startRunAndSkipIntro(page);
        }
        const installed = await page.evaluate(() => {
            if (!window.game) return false;
            window.game.setGodMode?.(true);
            // Freeze simulation-driven prompts and encounters while preserving the
            // rendered gameplay HUD. The audit then changes only viewport and skin.
            window.game.setLoadingPaused?.(true);
            window.__hbHudAuditSession = true;
            return true;
        }).catch(() => false);
        if (installed) return;
    }
    throw new Error('HUD audit could not restore its frozen gameplay session after a page reload');
}

test.describe('HUD dock readability audit', () => {
    test.describe.configure({ timeout: 300_000 });

    test('captures the R0 matrix and exposes the known geometry/readability failures', async ({ page }, testInfo) => {
        await page.addInitScript(() => localStorage.setItem('hb_hud_layout', 'dock'));
        await page.setViewportSize({ width: 1920, height: 1080 });
        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);
        await page.evaluate(() => window.game?.setGodMode?.(true));
        // A cold Vite run may discover a late dynamic import and perform one final
        // optimize-deps reload after gameplay appears. Let that settle, then restore
        // the run if needed so the matrix is not truncated by infrastructure churn.
        await page.waitForTimeout(2_000);
        await ensureHudAuditSession(page);

        const originalClass = await page.evaluate(() => document.documentElement.dataset.operatorClass || 'scout');
        // Apply expected-failure semantics only after a real gameplay HUD exists.
        // Boot/infrastructure failures must remain ordinary failures rather than being
        // mistaken for proof that the known dock defects were reproduced.
        test.fail(true, 'R0 baseline: the current painted dock is intentionally expected to miss the Sprint 48 targets');
        const matrix = {};
        const screenshots = [];

        for (const target of TARGETS) {
            await page.setViewportSize({ width: target.width, height: target.height });
            await page.waitForTimeout(500);
            matrix[target.name] = {};

            for (const operatorClass of CLASSES) {
                let metrics = null;
                let screenshot = null;
                for (let attempt = 0; attempt < 3; attempt += 1) {
                    await ensureHudAuditSession(page);
                    try {
                        await page.evaluate((value) => {
                            document.documentElement.dataset.operatorClass = value;
                        }, operatorClass);
                        await page.waitForTimeout(100);

                        metrics = await page.evaluate(({ panels, contentIds, criticalSelectors }) => {
                    const stage = document.getElementById('game-viewport')?.getBoundingClientRect();
                    const rect = (element) => element?.getBoundingClientRect() || null;
                    const visible = (element) => {
                        if (!element) return false;
                        const box = rect(element);
                        const style = getComputedStyle(element);
                        return style.display !== 'none'
                            && style.visibility !== 'hidden'
                            && Number(style.opacity) !== 0
                            && box.width > 0
                            && box.height > 0
                            && !element.classList.contains('hidden');
                    };
                    const relativeRect = (element) => {
                        const box = rect(element);
                        if (!box || !stage) return null;
                        return {
                            x: +(box.x - stage.x).toFixed(1),
                            y: +(box.y - stage.y).toFixed(1),
                            width: +box.width.toFixed(1),
                            height: +box.height.toFixed(1),
                            right: +(box.right - stage.x).toFixed(1),
                            bottom: +(box.bottom - stage.y).toFixed(1)
                        };
                    };

                    const unitProbe = document.createElement('div');
                    unitProbe.style.cssText = 'position:absolute;width:calc(100 * var(--u));height:0;pointer-events:none';
                    document.body.appendChild(unitProbe);
                    const hudUnit = unitProbe.getBoundingClientRect().width / 100;
                    unitProbe.remove();

                    const housings = Object.fromEntries(panels.map((panel) => {
                        const element = document.querySelector(`.dock-housing--${panel}`);
                        return [panel, relativeRect(element)];
                    }));
                    const content = Object.fromEntries(contentIds.map((id) => {
                        const element = document.getElementById(id);
                        return [id, relativeRect(element)];
                    }));

                    const criticalText = [];
                    for (const selector of criticalSelectors) {
                        const root = document.querySelector(selector);
                        if (!root) continue;
                        for (const element of [root, ...root.querySelectorAll('*')]) {
                            if (!visible(element) || !element.textContent?.trim()) continue;
                            const style = getComputedStyle(element);
                            criticalText.push({
                                selector,
                                tag: element.tagName.toLowerCase(),
                                className: typeof element.className === 'string' ? element.className : '',
                                text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
                                fontSize: parseFloat(style.fontSize)
                            });
                        }
                    }

                    const clippedText = [...document.querySelectorAll('#ui *')]
                        .filter((element) => visible(element) && element.children.length === 0 && element.textContent?.trim())
                        .filter((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
                        .map((element) => ({
                            id: element.id,
                            className: typeof element.className === 'string' ? element.className : '',
                            text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
                            client: [element.clientWidth, element.clientHeight],
                            scroll: [element.scrollWidth, element.scrollHeight]
                        }));

                    const housingArea = Object.values(housings).reduce((sum, box) => (
                        sum + (box ? box.width * box.height : 0)
                    ), 0);
                    const stageArea = stage ? stage.width * stage.height : 0;
                    const bandHeight = Math.max(...Object.values(housings).map((box) => box?.height || 0));

                            return {
                        hudUnit: +hudUnit.toFixed(3),
                        stage: stage ? { width: +stage.width.toFixed(1), height: +stage.height.toFixed(1) } : null,
                        housings,
                        content,
                        minimumCriticalTextPx: criticalText.length
                            ? Math.min(...criticalText.map((item) => item.fontSize))
                            : null,
                        criticalText,
                        clippedText,
                        bandHeightPx: +bandHeight.toFixed(1),
                        bandHeightU: hudUnit ? +(bandHeight / hudUnit).toFixed(1) : null,
                        opaqueHousingCoverage: stageArea ? +(housingArea / stageArea).toFixed(4) : null
                            };
                        }, { panels: PANELS, contentIds: CONTENT_IDS, criticalSelectors: CRITICAL_SELECTORS });
                        if (CAPTURE_SCREENSHOTS) screenshot = await page.screenshot();
                        break;
                    } catch (error) {
                        const navigationInterrupted = /Execution context was destroyed|Target page, context or browser has been closed/.test(String(error));
                        if (!navigationInterrupted || attempt === 2) throw error;
                    }
                }

                expect(metrics, `${target.name}/${operatorClass}: metrics collected`).not.toBeNull();

                matrix[target.name][operatorClass] = metrics;
                if (screenshot) {
                    // Attaching writes into test-results/. Vite watches the repo root
                    // and reloads the page when those files appear, so retain buffers
                    // until every live-page measurement is complete.
                    screenshots.push({ name: `hud-${target.name}-${operatorClass}.png`, body: screenshot });
                }

                expect.soft(metrics.bandHeightU, `${target.name}/${operatorClass}: lower band height in HUD units`)
                    .toBeLessThanOrEqual(64.5);
                expect.soft(metrics.opaqueHousingCoverage, `${target.name}/${operatorClass}: opaque housing coverage`)
                    .toBeLessThanOrEqual(target.coverageBudget);

                if (target.name === 'deck') {
                    expect.soft(metrics.minimumCriticalTextPx, `${operatorClass}: minimum critical text on Deck`)
                        .toBeGreaterThanOrEqual(11);
                    expect.soft(metrics.clippedText, `${operatorClass}: clipped leaf text on Deck`).toEqual([]);
                }
            }

            const baseline = matrix[target.name].scout.content;
            for (const operatorClass of ['tank', 'engineer']) {
                for (const id of CONTENT_IDS) {
                    expect.soft(
                        matrix[target.name][operatorClass].content[id],
                        `${target.name}: ${id} must keep the Scout rect for ${operatorClass}`
                    ).toEqual(baseline[id]);
                }
            }
        }

        await page.evaluate((value) => {
            document.documentElement.dataset.operatorClass = value;
        }, originalClass);

        for (const screenshot of screenshots) {
            await testInfo.attach(screenshot.name, {
                body: screenshot.body,
                contentType: 'image/png'
            });
        }
        await testInfo.attach('hud-r0-metrics.json', {
            body: Buffer.from(JSON.stringify(matrix, null, 2)),
            contentType: 'application/json'
        });

        // Keep a small direct assertion after the soft audit so a missing stage cannot
        // accidentally count as the expected R0 failure.
        const stage = await page.locator('#game-viewport').boundingBox();
        expect(stage).not.toBeNull();
    });
});
