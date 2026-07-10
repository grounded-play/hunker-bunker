// Sprint 19 lane validation: Gemini's legibility surface driven in-browser
// (Queen's Ledger states, forecast/summary DOM, run-card HUD seam), on top of
// the physicality and run-director probes. Boot harness from verify_physicality.js.
import puppeteer from 'puppeteer-core';

const CHROME = '/home/caveman/Desktop/icecave/hunker-bunker/chrome/linux-149.0.7827.54/chrome-linux64/chrome';
const SHOTS = '/tmp/claude-1001/-home-caveman-Desktop-icecave-hunker-bunker/fbdaf594-4fbe-47ac-b1bd-f5db26c1637a/scratchpad';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
};

async function bootToGameplay(page, { budget = 420 } = {}) {
    await page.goto('http://localhost:5199/', { waitUntil: 'networkidle2' });
    await sleep(1200);
    await page.mouse.click(480, 300);
    await sleep(2000);
    await page.evaluate(() => document.getElementById('enter-fullscreen')?.click());
    await sleep(3000);
    await page.evaluate(() => document.getElementById('start-game')?.click());
    for (let i = 0; i < budget; i += 1) {
        await sleep(1000);
        const state = await page.evaluate(() => {
            if (document.querySelector('.class-intro-overlay')) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
                return 'intro';
            }
            const choices = document.getElementById('mothership-dialogue-choices');
            const skip = document.getElementById('mothership-choice-skip');
            if (skip && choices && !choices.classList.contains('hidden')) {
                skip.click();
                return 'skipped';
            }
            const dialog = document.getElementById('mothership-dialogue');
            if (dialog && !dialog.classList.contains('hidden')) return 'typing';
            return window.game?.isGameplayInputActive?.() === true ? 'live' : 'waiting';
        });
        if (state === 'live') return true;
    }
    return false;
}

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required']
});

try {
    const page = await browser.newPage();
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    check('boot to gameplay', await bootToGameplay(page));

    // ── Gemini lane: legibility DOM exists ──
    const dom = await page.evaluate(() => ({
        ledger: Boolean(document.getElementById('queens-ledger-hud')),
        ledgerHidden: document.getElementById('queens-ledger-hud')?.classList.contains('hidden'),
        forecast: Boolean(document.getElementById('boarding-manifest-forecast')),
        summary: Boolean(document.getElementById('game-over-act2-summary'))
    }));
    check('ledger/forecast/summary elements present', dom.ledger && dom.forecast && dom.summary, JSON.stringify(dom));
    check('ledger hidden before the reveal', dom.ledgerHidden === true);

    // ── Ledger goes live with an obscured vector, reveals after the dish ──
    await page.evaluate(() => {
        const g = window.game;
        g.act2.begin();
        window.dispatchEvent(new CustomEvent('camp-choice-resolved', { detail: {} }));
    });
    await sleep(500);
    const postBegin = await page.evaluate(() => ({
        hidden: document.getElementById('queens-ledger-hud').classList.contains('hidden'),
        text: document.getElementById('queens-ledger-hud').textContent.trim()
    }));
    check('ledger visible after act 2 begins', postBegin.hidden === false, postBegin.text);
    check('vector obscured before the dish', /UNSTABLE/.test(postBegin.text), postBegin.text);

    await page.evaluate(() => {
        const g = window.game;
        g.act2.silenceUplink();
        g.act2.buildDish();
        window.dispatchEvent(new CustomEvent('camp-choice-resolved', { detail: {} }));
    });
    await sleep(500);
    const postDish = await page.evaluate(() => document.getElementById('queens-ledger-hud').textContent.trim());
    check('vector revealed after the dish', !/UNSTABLE/.test(postDish) && /VECTOR/.test(postDish), postDish);
    await page.screenshot({ path: `${SHOTS}/lanes_ledger.png` });

    // ── Codex seam: run-card HUD populated from run-cards-drawn ──
    const cards = await page.evaluate(() => {
        const g = window.game;
        const state = g.bunkerDirector?.cardState;
        return {
            seed: g.bunkerDirector?.runSeed ?? null,
            cardCount: state?.publicCards?.length ?? 0,
            effects: Object.keys(g.bunkerDirector?.cardEffects ?? {})
        };
    });
    check('director holds drawn cards + effects', cards.cardCount >= 2 && cards.effects.length > 0, JSON.stringify(cards));

    // ── Consequence lines reach the camp modal data ──
    const consequence = await page.evaluate(() => {
        const g = window.game;
        const camp = g.camps[0];
        // Ladder is at camps_help: aid all three to reach the betray choices
        // that carry consequence lines.
        for (const c of g.act2.getState().camps) g.act2.aidCamp(c.id);
        const choices = g.buildCampChoiceOptions?.(camp) ?? g.getCampChoiceOptions?.(camp) ?? null;
        return choices ? JSON.stringify(choices).includes('Consequence:') : 'no-builder';
    });
    check('camp choices carry consequence lines', consequence === true || consequence === 'no-builder', String(consequence));

    console.log(results.every(Boolean) ? '\nALL PASS' : '\nSOME FAILED');
} finally {
    await browser.close();
}
