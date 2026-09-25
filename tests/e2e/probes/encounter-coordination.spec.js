import { expect, test } from '@playwright/test';

// Sprint 47 Lane 2 deterministic browser probe. This holds aim, damage and
// cadence constant and varies target priority only; results are modeled
// combat timings, not human playtest observations.
test('coordinated formation target priority changes modeled clear time', async ({ page }) => {
    await page.goto('/');

    const probe = await page.evaluate(async () => {
        const {
            encounterRoleCoverage,
            simulateEncounterPriority
        } = await import('/src/encounterRecipes.js');

        const rows = [];
        for (const playerClass of ['SCOUT', 'TANK', 'ENGINEER']) {
            for (const priorityRole of ['anchor', 'suppressor']) {
                rows.push(simulateEncounterPriority('locked_crossfire', priorityRole, { playerClass }));
            }
        }
        return { coverage: encounterRoleCoverage(), rows };
    });

    for (const role of ['anchor', 'suppressor', 'flanker', 'controller', 'support']) {
        expect(probe.coverage[role].length, `${role} recipe coverage`).toBeGreaterThan(0);
    }
    for (const playerClass of ['SCOUT', 'TANK', 'ENGINEER']) {
        const anchor = probe.rows.find((row) => row.playerClass === playerClass && row.priorityRole === 'anchor');
        const suppressor = probe.rows.find((row) => row.playerClass === playerClass && row.priorityRole === 'suppressor');
        expect(anchor.cleared).toBe(true);
        expect(suppressor.cleared).toBe(true);
        expect(anchor.clearTimeSeconds).toBeLessThan(suppressor.clearTimeSeconds);
    }

    console.log('ENCOUNTER_PRIORITY ' + JSON.stringify(probe));
});
