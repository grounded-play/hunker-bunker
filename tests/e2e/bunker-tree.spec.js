import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Phase 13: "Use Bunker Tree" (docs/steam-launch-readiness-master-plan.md).
// Exercises the unified skill tree end to end: opening it, switching
// between BASE SYSTEM / CLASS SKILLS tabs, and actually purchasing a node
// (not just rendering it) so a real state transition is asserted, not just
// a screenshot. `window.bankManager` is exposed globally (main.js:989) —
// used here to grant shells directly rather than grinding a run for them.

test.describe('Bunker Tree (console skill tree)', () => {
    test('renders nodes, switches tabs, and purchasing a node updates its state', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        await bootToOperatorMenu(page);
        // Skips the class-intro/cutscene/dialogue sequence — otherwise
        // still in flight when we force the console modal open below, and
        // it explicitly hides that modal as one of its own first steps.
        await startRunAndSkipIntro(page);

        // Grant shells so at least one no-prereq node becomes purchasable —
        // "available" (vs. "locked") requires affordability, not just
        // prereqs met (src/threeGame.js buildTreeNodeCard), so a fresh run
        // at 0 shells has zero .skill-node-btn buttons to click.
        await page.evaluate(() => {
            window.bankManager.addShells(999);
            window.game.openConsoleModal({ type: 'SCOUT' });
        });

        await expect(page.locator('#console-terminal-modal')).toBeVisible();

        // BASE SYSTEM is the default tab.
        await expect(page.locator('#terminal-tab-base-content')).toBeVisible();
        await expect(page.locator('#terminal-tab-skills-content')).toBeHidden();

        await page.locator('#terminal-tab-skills').click();
        await expect(page.locator('#terminal-tab-skills-content')).toBeVisible();
        await expect(page.locator('#terminal-tab-base-content')).toBeHidden();

        const nodeCount = await page.locator('.skill-node-card').count();
        expect(nodeCount).toBeGreaterThan(0);

        // Switch back to BASE SYSTEM and confirm it un-hides correctly,
        // then back to CLASS SKILLS for the purchase flow below.
        await page.locator('#terminal-tab-base').click();
        await expect(page.locator('#terminal-tab-base-content')).toBeVisible();
        await page.locator('#terminal-tab-skills').click();
        await expect(page.locator('#terminal-tab-skills-content')).toBeVisible();

        const availableNode = page.locator('.skill-node-card.node-state--available').first();
        await expect(availableNode).toBeVisible({ timeout: 5_000 });
        const nodeId = await availableNode.getAttribute('data-node-id');
        const statusBefore = await availableNode.locator('.skill-node-status').textContent();

        await availableNode.locator('.skill-node-btn').click();
        await page.waitForTimeout(300);

        // buildTreeNodeCard re-renders the whole tree on purchase, so
        // re-query by the node id rather than reusing the old locator/
        // handle. Multi-level nodes (e.g. ammoCapacity, LV 0/3 -> LV 1/3)
        // stay in the "available" class as long as they can still be
        // upgraded further — the reliable signal that a purchase actually
        // happened is the status text changing, not a specific final class.
        const purchasedNode = page.locator(`.skill-node-card[data-node-id="${nodeId}"]`);
        await expect(purchasedNode).toBeVisible();
        const statusAfter = await purchasedNode.locator('.skill-node-status').textContent();
        expect(statusAfter, 'purchase should change the node status/level text').not.toBe(statusBefore);

        expect(consoleErrors, `unexpected console errors: ${consoleErrors.join('\n')}`).toEqual([]);

        await page.screenshot({ path: 'playwright-report/screenshots/bunker-tree-purchased-1280x800.png' });
    });
});
