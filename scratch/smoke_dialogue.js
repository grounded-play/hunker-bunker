// Verifies the Elden Ring dialogue grammar + hive kinship:
//  A) Act 1 — TALK prompt takes priority, beats play, loop line holds until
//     camp level progress, then the stage advances.
//  B) Act 2 — wild snails ignore the carrier, killing one upsets the queen,
//     human finals gate on the turn and cost humanity/obedience.
import puppeteer from 'puppeteer-core';

const CHROME = '/home/caveman/Desktop/icecave/hunker-bunker/chrome/linux-149.0.7827.54/chrome-linux64/chrome';
const PORT = process.argv[2] ?? '5200';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => {
    results.push(ok);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
};

async function bootToGameplay(page) {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
    await sleep(1200);
    await page.mouse.click(480, 300);
    await sleep(2000);
    await page.evaluate(() => document.getElementById('enter-fullscreen')?.click());
    await sleep(3000);
    await page.evaluate(() => document.getElementById('start-game')?.click());
    for (let i = 0; i < 260; i += 1) {
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

// Dismiss any open transmission (the talk lines).
async function dismissTransmissions(page) {
    for (let i = 0; i < 40; i += 1) {
        const state = await page.evaluate(() => {
            const dialog = document.getElementById('mothership-dialogue');
            if (!dialog || dialog.classList.contains('hidden')) return 'closed';
            const btn = document.getElementById('mothership-choice-skip');
            const choices = document.getElementById('mothership-dialogue-choices');
            if (btn && choices && !choices.classList.contains('hidden')) {
                btn.click();
                return 'clicked';
            }
            return 'typing';
        });
        if (state === 'closed') return;
        await sleep(state === 'clicked' ? 700 : 500);
    }
}

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required']
});

try {
    // ── A: Act 1 talk grammar ──
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 600 });
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    await page.evaluateOnNewDocument(() => localStorage.clear());
    check('booted to Act 1', await bootToGameplay(page));

    const talk = async () => {
        const detail = await page.evaluate(() => {
            const g = window.game;
            const camp = g.camps[0];
            g.player.position.set(camp.pos.x + 1, 0, camp.pos.z + 1);
            let d = null;
            window.addEventListener('leader-dialogue', (e) => { d = e.detail; }, { once: true });
            const actionable = g.getActionableCampAt(g.player.position.x, g.player.position.z);
            const label = actionable?.label ?? '';
            g.interactWithAct2Camp();
            return { label, beat: d };
        });
        await dismissTransmissions(page);
        return detail;
    };

    const t1 = await talk();
    check('first contact: TALK prompt takes priority', /^TALK — /.test(t1.label), t1.label);
    check('first contact plays a beat', t1.beat?.beatType === 'beat' && t1.beat?.lines?.length >= 1);

    const t2 = await talk();
    check('second visit plays the next beat', t2.beat?.beatType === 'beat');

    // Beats exhausted, no level yet → E falls back to SUPPORT; loop line only via modal talk
    const t3 = await page.evaluate(() => {
        const g = window.game;
        const camp = g.camps[0];
        const actionable = g.getActionableCampAt(g.player.position.x, g.player.position.z);
        const record = g.getCampRecord(camp.id);
        const beat = g.peekDialogueBeat('camp', camp, record);
        return { label: actionable?.label ?? '', beatType: beat?.type };
    });
    check('exhausted stage falls back to SUPPORT with loop pending', /SUPPORT CAMP/.test(t3.label) && t3.beatType === 'loop', JSON.stringify(t3));

    // Level the camp → talking now advances the stage
    await page.evaluate(() => {
        const g = window.game;
        g.bank.addShells(20);
        g.interactWithAct2Camp(); // SUPPORT → level 1
    });
    const t4 = await talk();
    check('after leveling, the talk advances the stage', t4.beat?.beatType === 'advance' && t4.beat?.stage === 1, JSON.stringify(t4.beat));
    const persistedStage = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('hb_act2_v1') ?? '{}')?.camps?.[0]?.dialogueStage ?? -1);
    check('stage persists in the save', persistedStage === 1, `stage=${persistedStage}`);
    await page.close();

    // ── B: Act 2 kinship + finals ──
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 960, height: 600 });
    page2.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    await page2.evaluateOnNewDocument(() => {
        localStorage.clear();
        localStorage.setItem('hb_arc_v1', JSON.stringify({ arcState: 'hive_awakened_tease', version: 1 }));
        localStorage.setItem('hb_act2_v1', JSON.stringify({
            begun: true,
            uplinkSilenced: true,
            dishBuilt: true,
            camps: [
                { id: 'camp_meridian', aided: true, status: 'alive', bond: 2, dialogueStage: 3 },
                { id: 'camp_tallow', aided: true, status: 'alive', bond: 2 },
                { id: 'camp_vesper', aided: true, status: 'alive', bond: 2 }
            ],
            version: 3
        }));
    });
    check('booted to Act 2', await bootToGameplay(page2));

    // Snail passivity: spawn a patrol, verify no snail targets the player.
    const passive = await page2.evaluate(async () => {
        const g = window.game;
        g.spawnPatrolNearPlayer();
        await new Promise((r) => setTimeout(r, 800));
        const snail = g.scatterSprites.find((s) => g.isEnemyType(s.userData?.type) && !s.userData.burstTriggered);
        if (!snail) return null;
        const target = g.selectSnailTarget(snail, g.getActiveShip());
        return { passiveFlag: g.isHiveKinPassive(snail), targetType: target?.type ?? 'none' };
    });
    check('wild snails ignore the carrier', passive?.passiveFlag === true && passive?.targetType !== 'player', JSON.stringify(passive));

    // Kill guilt: first kill drops obedience.
    const guilt = await page2.evaluate(() => {
        const g = window.game;
        const before = g.act2.getState().queenObedience;
        const snail = g.scatterSprites.find((s) => g.isEnemyType(s.userData?.type) && !s.userData.burstTriggered);
        g.damageSnail(snail, 9999);
        return { before, after: g.act2.getState().queenObedience };
    });
    check('killing hive kin upsets the queen', guilt.after === guilt.before - 1, JSON.stringify(guilt));

    // Camp defenders remain hostile.
    const defenderHostile = await page2.evaluate(() => {
        const g = window.game;
        const fake = { userData: { type: 'cybersnail', campDefenderId: 'camp_meridian' } };
        return g.isHiveKinPassive(fake) === false;
    });
    check('camp defenders stay hostile', defenderHostile);

    // Finals: fight the urge on the stage-3 camp; cost 15 humanity, bond→5.
    const final1 = await page2.evaluate(() => {
        const g = window.game;
        const before = g.act2.getState();
        g.resolveCampChoice('final-urge', { campId: 'camp_meridian' });
        const after = g.act2.getState();
        return {
            done: after.camps[0].questFlags.final_vigil === 'done',
            bond: after.camps[0].bond,
            humanity: { before: before.humanity, after: after.humanity }
        };
    });
    check('fight the urge: final done, bond maxed, 15 humanity spent',
        final1.done && final1.bond === 5 && final1.humanity.after === final1.humanity.before - 15,
        JSON.stringify(final1));

    // Second camp not at stage 3 → final blocked.
    const gated = await page2.evaluate(() => {
        const g = window.game;
        g.resolveCampChoice('final-urge', { campId: 'camp_tallow' });
        return g.act2.getState().camps[1].questFlags.final_vigil;
    });
    check('finals gate on reaching the final dialogue stage', gated !== 'done');

    // Betray path on a raised camp: escalated obedience hit (second final = -2).
    const betray = await page2.evaluate(() => {
        const g = window.game;
        for (let i = 0; i < 3; i += 1) g.act2.advanceDialogueStage('camp', 'camp_tallow');
        const before = g.act2.getState().queenObedience;
        g.resolveCampChoice('final-betray', { campId: 'camp_tallow' });
        const after = g.act2.getState();
        return {
            before,
            after: after.queenObedience,
            knows: after.camps[1].knowsPlayerInfected,
            done: after.camps[1].questFlags.final_vigil === 'done'
        };
    });
    check('betray the queen: escalated wrath and the camp learns the truth',
        betray.done && betray.knows && betray.after === betray.before - 2, JSON.stringify(betray));
    await page2.close();
} finally {
    await browser.close();
}
console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
