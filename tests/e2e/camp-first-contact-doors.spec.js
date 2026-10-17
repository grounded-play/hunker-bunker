import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Owner, 2026-10-16: first contact should go doors shut over play -> the
// camp's video -> doors shut again -> doors open on play with the leader's
// conversation window on top (docs/planning/camp-interaction-and-cinematics-
// audit-2026-10-16.md §13.1). The window must never appear over the video
// without the doors closing first.
test.describe.configure({ timeout: 300_000 });

test('camp first contact bookends the video with doors and opens the conversation over play', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
        const root = document.getElementById('song-interstitial');
        const modal = document.getElementById('leader-conversation-modal');
        const log = [];
        window.__doorLog = log;
        const sample = () => {
            const entry = {
                t: Math.round(performance.now()),
                root: [...root.classList].filter((c) => c !== 'song-interstitial').sort().join(' '),
                modal: !modal.classList.contains('hidden')
            };
            const last = log[log.length - 1];
            if (!last || last.root !== entry.root || last.modal !== entry.modal) log.push(entry);
            if (log.length < 200) requestAnimationFrame(sample);
        };
        sample();
        const g = window.game;
        const camp = g.getCampById('camp_meridian');
        // Meridian's first meeting (S-1) plays between the doors and the
        // window when its anchor is placed; this spec covers the bookend
        // itself, so S-1 is spent here (S-1 order: threeGame.campConversation
        // and interactionSequenceRunner unit tests).
        g.interactionSequenceRunner?.markSequenceCompleted?.('meridian_first_meeting');
        window.dispatchEvent(new CustomEvent('camp-first-contact', {
            detail: {
                campId: camp.id,
                campLabel: camp.label,
                campState: g.getCampRecord(camp.id),
                onComplete: () => g.talkToLeader('camp', camp)
            }
        }));
    });

    // Video on screen (doors open on the card).
    await page.waitForFunction(() => document.getElementById('song-interstitial').classList.contains('is-open'), null, { timeout: 15_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'playwright-report/screenshots/first-contact-1-video.png' });

    // Skip the video: the doors must shut again, not cut to the window.
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.getElementById('song-interstitial').classList.contains('is-closing-out'), null, { timeout: 5_000 });
    await page.waitForTimeout(450);
    await page.screenshot({ path: 'playwright-report/screenshots/first-contact-2-doors-shut.png' });

    await page.waitForFunction(() => document.getElementById('song-interstitial').classList.contains('hidden'), null, { timeout: 10_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'playwright-report/screenshots/first-contact-3-conversation.png' });

    const log = await page.evaluate(() => window.__doorLog);
    console.log('DOOR LOG', JSON.stringify(log));
    const firstModal = log.findIndex((entry) => entry.modal);
    expect(firstModal).toBeGreaterThan(0);
    // The window mounted behind closed doors: the frame before it appears had
    // the doors shut (the reveal starts in the same task as the mount, so the
    // first frame showing the window already reads is-revealing).
    expect(log[firstModal - 1].root).toContain('is-closing-out');
    expect(log[firstModal].root).toMatch(/is-closing-out|is-revealing|hidden/);
    // ...and was never visible while the video showed without doors.
    expect(log.slice(0, firstModal).some((entry) => entry.root.includes('is-open'))).toBe(true);
    expect(log.some((entry) => entry.modal && entry.root.includes('is-open') && !entry.root.includes('is-closing-out') && !entry.root.includes('is-revealing'))).toBe(false);
    expect(log.some((entry) => entry.root.includes('is-revealing'))).toBe(true);

    expect(await page.evaluate(() => !document.getElementById('leader-conversation-modal').classList.contains('hidden'))).toBe(true);
    // The camp shows through the window's backdrop.
    const backdrop = await page.evaluate(() => getComputedStyle(document.getElementById('leader-conversation-modal')).backgroundColor);
    expect(backdrop).toBe('rgba(2, 6, 10, 0.38)');
});
