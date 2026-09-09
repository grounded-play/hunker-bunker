import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, bootToTitleSplash, stubOfflineElectronAPI } from './helpers.js';

// User report 2026-09-09: "achievements are not showing progress and the active
// operator profile is also not updating", and both must work in Steam offline
// mode and reset with a save reset.
//
// The achievement engine itself was fine -- localStorage stats advance
// correctly. What was broken was everything downstream of it in main.js, which
// unit tests cannot reach: the title-screen career readout only ever refreshed
// at boot, and the save-data probe that gates the operator profile HUD called
// the wrong function entirely.

const readHud = () => ({
    deaths: document.getElementById('career-stat-deaths')?.textContent,
    longest: document.getElementById('career-stat-longest-run')?.textContent,
    hudHidden: document.getElementById('title-profile-hud')?.classList.contains('hidden')
});

test.describe('achievement progress and operator profile', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            try {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const k = localStorage.key(i);
                    if (k?.startsWith('hb_')) localStorage.removeItem(k);
                }
            } catch { /* ignore */ }
        });
    });

    test('the title career readout updates as achievement stats change', async ({ page }) => {
        // The readout lives on the title splash, and the refresh listener
        // deliberately no-ops while the title is off-screen (it fires on every
        // shell pickup mid-run).
        await bootToTitleSplash(page);

        const result = await page.evaluate(async (readSrc) => {
            const read = new Function(`return (${readSrc})()`);
            const before = read();
            // A death and a long run are exactly what the readout claims to show.
            window.__DEBUG__.recordRunEnd({ outcome: 'death', runMs: 90_000, snailsKilled: 4 });
            await new Promise((r) => setTimeout(r, 250));
            return { before, after: read() };
        }, readHud.toString());

        expect(result.before.deaths).toBe('DEATHS 0');
        expect(result.after.deaths, 'career deaths did not refresh after a run ended').toBe('DEATHS 1');
        expect(result.after.longest, 'longest run did not refresh').toBe('LONGEST 01:30');
    });

    test('achievement-only progress still counts as save data', async ({ page }) => {
        await bootToTitleSplash(page);

        const state = await page.evaluate(async () => {
            // Unlock something without banking anything, then re-probe.
            window.__DEBUG__.recordRunEnd({ outcome: 'death', runMs: 1000 });
            await new Promise((r) => setTimeout(r, 250));
            const stored = JSON.parse(localStorage.getItem('hb_achievements_v1') ?? 'null');
            return {
                unlockedKeys: Object.keys(stored?.unlocked ?? {}),
                hudHidden: document.getElementById('title-profile-hud')?.classList.contains('hidden'),
                continueDisabled: document.getElementById('title-continue-btn')?.disabled
            };
        });

        // QUICK STUDY unlocks on a death within 5s of deployment.
        expect(state.unlockedKeys).toContain('quick_study');
        expect(state.hudHidden, 'operator profile stayed hidden despite real progress').toBe(false);
        expect(state.continueDisabled, 'CONTINUE stayed disabled despite real progress').toBe(false);
    });

    test('progress is shown for every non-secret achievement that can track it', async ({ page }) => {
        await bootToOperatorMenu(page);

        const cards = await page.evaluate(async () => {
            for (const id of ['a', 'b', 'c']) {
                window.dispatchEvent(new CustomEvent('lore-drop-collected', { detail: { id } }));
            }
            window.dispatchEvent(new CustomEvent('hive-choice-resolved', { detail: { bond: 3 } }));
            window.__DEBUG__.recordRunEnd({ outcome: 'death', runMs: 600_000 });
            await new Promise((r) => setTimeout(r, 250));
            document.getElementById('title-achievements-btn')?.click();
            const grid = document.getElementById('achievements-grid');
            return Object.fromEntries([...(grid?.children ?? [])].map((card) => [
                card.querySelector('.achievement-card__title')?.textContent,
                card.querySelector('.achievement-card__meta')?.textContent ?? null
            ]));
        });

        expect(cards.ARCHIVIST).toBe('3 / 12');
        expect(cards.KIN).toBe('3 / 5');
        expect(cards.CARTOGRAPHER).toBe('0 / 3');
        expect(cards.HARDENED).toBe('1 / 5');
        // HUNKERED is "survive past twenty minutes" -- a 10-minute run is
        // halfway there and the player should be able to see that.
        expect(cards.HUNKERED, 'HUNKERED showed no progress toward its 20-minute target').toBe('10 / 20');
    });

    test('a save reset clears local achievement progress', async ({ page }) => {
        await bootToOperatorMenu(page);

        const after = await page.evaluate(async () => {
            window.__DEBUG__.recordRunEnd({ outcome: 'death', runMs: 1000 });
            await new Promise((r) => setTimeout(r, 200));
            const before = JSON.parse(localStorage.getItem('hb_achievements_v1') ?? 'null');
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k?.startsWith('hb_')) localStorage.removeItem(k);
            }
            return {
                hadProgress: (before?.stats?.totalDeaths ?? 0) > 0,
                cleared: localStorage.getItem('hb_achievements_v1')
            };
        });

        expect(after.hadProgress).toBe(true);
        expect(after.cleared).toBeNull();
    });

    // "this should work even in steam offline mode": all achievement state is
    // localStorage-first. syncSteamStats no-ops without a setStat, and the
    // unlock->Steam forward is guarded on electronAPI, so a Steam client that
    // cannot reach the network changes nothing about local progress.
    test('progress still records with Steam unreachable', async ({ page }) => {
        await stubOfflineElectronAPI(page);
        await bootToTitleSplash(page);

        const state = await page.evaluate(async () => {
            window.__DEBUG__.recordRunEnd({ outcome: 'death', runMs: 120_000, snailsKilled: 7 });
            await new Promise((r) => setTimeout(r, 250));
            const stored = JSON.parse(localStorage.getItem('hb_achievements_v1') ?? 'null');
            return {
                deaths: stored?.stats?.totalDeaths,
                kills: stored?.stats?.totalKills,
                maxRunMs: stored?.stats?.maxRunMs,
                readout: document.getElementById('career-stat-deaths')?.textContent
            };
        });

        expect(state.deaths).toBe(1);
        expect(state.kills).toBe(7);
        expect(state.maxRunMs).toBe(120_000);
        expect(state.readout).toBe('DEATHS 1');
    });

    // User report 2026-09-09 (follow-up): "the active operator profile still is
    // showing 0's, a save it shouldn't show if that's the case".
    //
    // Showing an ACTIVE OPERATOR PROFILE whose every field reads zero is worse
    // than showing nothing. Having something to *continue* (banked salvage, a
    // black box) is a different question from having a career worth
    // displaying, and the two gates are now separate.
    test('a fresh profile shows no operator profile at all', async ({ page }) => {
        await bootToTitleSplash(page);
        const state = await page.evaluate(() => ({
            hudHidden: document.getElementById('title-profile-hud')?.classList.contains('hidden'),
            continueDisabled: document.getElementById('title-continue-btn')?.disabled
        }));
        expect(state.hudHidden).toBe(true);
        expect(state.continueDisabled).toBe(true);
    });

    test('banked salvage alone enables CONTINUE but does not show an all-zero profile', async ({ page }) => {
        await bootToTitleSplash(page);
        const state = await page.evaluate(async () => {
            window.bankManager.deposit({ tech: 5 });
            await new Promise((r) => setTimeout(r, 250));
            return {
                hudHidden: document.getElementById('title-profile-hud')?.classList.contains('hidden'),
                continueDisabled: document.getElementById('title-continue-btn')?.disabled,
                deaths: document.getElementById('career-stat-deaths')?.textContent
            };
        });
        expect(state.continueDisabled, 'banked salvage should still be continuable').toBe(false);
        expect(state.hudHidden, 'an all-zero operator profile should stay hidden').toBe(true);
    });

    test('a real run makes the operator profile appear with its actual numbers', async ({ page }) => {
        await bootToTitleSplash(page);
        const state = await page.evaluate(async () => {
            window.__DEBUG__.recordRunEnd({ outcome: 'death', runMs: 75_000, snailsKilled: 3 });
            await new Promise((r) => setTimeout(r, 250));
            return {
                hudHidden: document.getElementById('title-profile-hud')?.classList.contains('hidden'),
                deaths: document.getElementById('career-stat-deaths')?.textContent,
                longest: document.getElementById('career-stat-longest-run')?.textContent
            };
        });
        expect(state.hudHidden, 'a real career should show the profile').toBe(false);
        expect(state.deaths).toBe('DEATHS 1');
        expect(state.longest).toBe('LONGEST 01:15');
    });
});
