import { test, expect } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from './helpers.js';

// Owner, 2026-10-16: first contact should go doors shut over play -> the
// camp's video -> doors open on play with the leader's conversation window on
// top (docs/planning/camp-interaction-and-cinematics-audit-2026-10-16.md
// §13.1). Owner, 2026-10-26: one door system. The card plays above the stage
// doors (#transition-overlay, hero/area art), never its own grey panels, and
// the window must never appear over the video or before the doors shut.
test.describe.configure({ timeout: 300_000 });

test('camp first contact plays the card over the stage doors and opens the conversation over play', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForTimeout(3000);

    await page.evaluate(() => {
        const root = document.getElementById('song-interstitial');
        const doors = document.getElementById('transition-overlay');
        const modal = document.getElementById('leader-conversation-modal');
        const log = [];
        window.__doorLog = log;
        const sample = () => {
            const entry = {
                t: Math.round(performance.now()),
                root: [...root.classList].filter((c) => c !== 'song-interstitial').sort().join(' '),
                doors: [...doors.classList].sort().join(' '),
                modal: !modal.classList.contains('hidden')
            };
            const last = log[log.length - 1];
            if (!last || last.root !== entry.root || last.doors !== entry.doors || last.modal !== entry.modal) log.push(entry);
            if (log.length < 300) requestAnimationFrame(sample);
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

    // Stage doors shutting over play, before the card mounts.
    await page.waitForFunction(() => document.getElementById('transition-overlay').classList.contains('active'), null, { timeout: 10_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'playwright-report/screenshots/first-contact-1-stage-doors.png' });

    // Video on screen above the shut stage doors.
    await page.waitForFunction(() => document.getElementById('song-interstitial').classList.contains('is-open'), null, { timeout: 15_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'playwright-report/screenshots/first-contact-2-video.png' });

    // Skip: the card lifts off the still-shut doors, which then open on the window.
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.getElementById('song-interstitial').classList.contains('hidden'), null, { timeout: 10_000 });
    await page.screenshot({ path: 'playwright-report/screenshots/first-contact-3-doors-shut.png' });
    await page.waitForFunction(() => !document.getElementById('transition-overlay').classList.contains('visible'), null, { timeout: 10_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'playwright-report/screenshots/first-contact-4-conversation.png' });

    const log = await page.evaluate(() => window.__doorLog);
    console.log('DOOR LOG', JSON.stringify(log));
    // Classes are sorted: shut = closing-v landed (active), or opening-h not yet moving.
    const doorClasses = (entry) => new Set(entry.doors.split(' '));
    const doorsShut = (entry) => {
        const doors = doorClasses(entry);
        return (doors.has('closing-v') && doors.has('active')) || (doors.has('opening-h') && !doors.has('active'));
    };
    // The card only ever played as the stage-door film layer, over shut doors.
    const cardFrames = log.filter((entry) => !entry.root.includes('hidden'));
    expect(cardFrames.length).toBeGreaterThan(0);
    expect(cardFrames.every((entry) => entry.root.includes('uses-stage-doors'))).toBe(true);
    expect(cardFrames.some((entry) => entry.root.includes('is-open') && doorsShut(entry))).toBe(true);
    // The window mounted behind the shut doors, after the card had gone.
    const firstModal = log.findIndex((entry) => entry.modal);
    expect(firstModal).toBeGreaterThan(0);
    expect(doorsShut(log[firstModal])).toBe(true);
    expect(log[firstModal].root).toContain('hidden');
    expect(log.some((entry) => entry.modal && entry.root.includes('is-open'))).toBe(false);

    expect(await page.evaluate(() => !document.getElementById('leader-conversation-modal').classList.contains('hidden'))).toBe(true);
    // The camp shows through the window's backdrop.
    const backdrop = await page.evaluate(() => getComputedStyle(document.getElementById('leader-conversation-modal')).backgroundColor);
    expect(backdrop).toBe('rgba(2, 6, 10, 0.38)');
});
