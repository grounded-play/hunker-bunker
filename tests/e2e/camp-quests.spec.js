import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Camp Bonding Quests (docs/expanded-universe-narrative-design.md) — the
// six named quests (CAMP_QUESTS) wired into real gameplay: a walk-up
// quest-offer prompt, a spawned in-level objective, a HUD sub-objective
// tracker, and a reward hook. Vitest (threeGame.campQuests.test.js) covers
// the state-machine logic in isolation; this spec is the one thing that
// needs a real browser: the actual #camp-quest-hud DOM element updating
// from the real camp-quest-progress/camp-quest-complete events.

test.describe('Camp Bonding Quests HUD', () => {
    test('accepting and completing a quest drives the sub-objective HUD and persists the reward', async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', (err) => consoleErrors.push(err.message));

        await bootToOperatorMenu(page);
        await startRunAndSkipIntro(page);

        // Force a Meridian camp straight to "quest offerable" — max support
        // level (so getActionableCampAt's support branch stops winning) and
        // bond 1 (Reactor Venting's prerequisite) — rather than grinding a
        // real run for shells. Mirrors bunker-tree.spec.js's use of debug
        // hooks (window.bankManager) to reach a state directly.
        const setup = await page.evaluate(() => {
            const game = window.game;
            const camp = game.camps.find((c) => c.id === 'camp_meridian');
            if (!camp) return { ok: false, reason: 'no camp_meridian' };
            game.act2.upgradeCamp(camp.id);
            game.act2.upgradeCamp(camp.id);
            game.act2.upgradeCamp(camp.id);
            game.act2.adjustCampBond(camp.id, 1);
            const record = game.getCampRecord(camp.id);
            camp.setLevel(record.level);
            camp.setStatus(record.status);
            // The 'talk' branch outranks quest-offer in getActionableCampAt
            // (matches the plan's ordering) whenever a dialogue beat is
            // still pending — drain it first, same as a real player would
            // by walking up and pressing E repeatedly.
            for (let i = 0; i < 10; i += 1) {
                const check = game.getActionableCampAt(camp.pos.x, camp.pos.z, 'dormant');
                if (check?.action !== 'talk') break;
                game.talkToLeader('camp', camp);
            }
            const actionable = game.getActionableCampAt(camp.pos.x, camp.pos.z, 'dormant');
            return { ok: true, action: actionable?.action, questId: actionable?.quest?.id, campPos: camp.pos };
        });
        expect(setup.ok, setup.reason).toBe(true);
        expect(setup.action).toBe('quest-offer');
        expect(setup.questId).toBe('reactor_venting');

        // Accept it and confirm the HUD comes up with the right label/counts.
        await page.evaluate(() => {
            const game = window.game;
            const camp = game.camps.find((c) => c.id === 'camp_meridian');
            const actionable = game.getActionableCampAt(camp.pos.x, camp.pos.z, 'dormant');
            game.acceptCampQuest(camp, actionable.quest);
        });

        const hud = page.locator('#camp-quest-hud');
        await expect(hud).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('#camp-quest-text')).toHaveText(/REACTOR VENTING.*0\s*\/\s*3/i);

        // Complete it directly (three interact-counter ticks) and confirm
        // the HUD hides, the reward flag is set, and the bond bonus landed.
        const result = await page.evaluate(() => {
            const game = window.game;
            game.advanceCampQuestProgress(1);
            game.advanceCampQuestProgress(1);
            game.advanceCampQuestProgress(1);
            const record = game.getCampRecord('camp_meridian');
            return {
                activeQuest: game._activeCampQuest,
                questDone: record?.questFlags?.reactor_venting,
                bond: record?.bond,
                hasReward: game.hasCampQuestReward('substation_keycard')
            };
        });
        expect(result.activeQuest).toBeNull();
        expect(result.questDone).toBe('done');
        expect(result.bond).toBeGreaterThanOrEqual(2);
        expect(result.hasReward).toBe(true);

        await expect(hud).toBeHidden({ timeout: 5_000 });

        expect(consoleErrors, `unexpected console errors: ${consoleErrors.join('\n')}`).toEqual([]);
    });
});
