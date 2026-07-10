// Verifies this session's two features:
//  A) Seamless infection — cave reveal continues the run (no menu), Act 2
//     begins in place with the cover HUD live.
//  B) Camp turrets — level 2 builds one, it's hostile post-reveal, and the
//     interact offers smash (no Vey bond) with a suspicion penalty.
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

const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required']
});

try {
    // ── A: seamless infection from a live Act 1 run ──
    const page = await browser.newPage();
    await page.setViewport({ width: 960, height: 600 });
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    await page.evaluateOnNewDocument(() => localStorage.clear());
    check('booted to Act 1', await bootToGameplay(page));

    // Level a camp to 2 first so a turret exists on both sides of the reveal.
    const turretBuilt = await page.evaluate(() => {
        const g = window.game;
        g.bank.addShells(60);
        const camp = g.camps[0];
        g.player.position.set(camp.pos.x + 1, 0, camp.pos.z + 1);
        g.interactWithAct2Camp(); // level 1
        g.interactWithAct2Camp(); // level 2 → turret
        return { level: camp.level, turrets: camp.turrets?.length ?? 0 };
    });
    check('level 2 camp builds a turret', turretBuilt.level === 2 && turretBuilt.turrets === 1, JSON.stringify(turretBuilt));

    // Trigger the cave reveal in place.
    await page.evaluate(() => {
        const g = window.game;
        g.revealCaveEntrance({ instant: true });
        const pos = g.caveEntrance.getPosition();
        g.player.position.set(pos.x, 0, pos.z);
        window.dispatchEvent(new CustomEvent('cave-entrance-interact'));
    });

    // Ride the cinematic: skip video, dismiss transmissions, until act2 begins.
    let infected = null;
    for (let i = 0; i < 180; i += 1) {
        await sleep(1000);
        infected = await page.evaluate(() => {
            if (document.querySelector('.class-intro-overlay')) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
            }
            const choices = document.getElementById('mothership-dialogue-choices');
            const skip = document.getElementById('mothership-choice-skip');
            if (skip && choices && !choices.classList.contains('hidden')) skip.click();
            const menuVisible = !document.getElementById('menu')?.classList.contains('hidden');
            const g = window.game;
            return {
                menuVisible,
                begun: g?.act2?.getState?.().begun === true,
                phase: g?.act2?.getPhase?.(),
                active: g?.isGameplayInputActive?.() === true,
                coverVisible: !document.getElementById('vitals-cover-row')?.classList.contains('hidden'),
                title: document.title
            };
        });
        if (infected.begun && infected.active) break;
        if (infected.menuVisible) break;
    }
    check('reveal did NOT return to the menu', infected && !infected.menuVisible, JSON.stringify(infected));
    check('Act 2 began in place (gestation)', infected?.begun === true && infected?.phase === 'gestation', `phase=${infected?.phase}`);
    check('gameplay input live after transmission', infected?.active === true);
    check('cover HUD appeared', infected?.coverVisible === true);
    check('title corrupted to PREGALIEN', /PREGALIEN/.test(infected?.title ?? ''), infected?.title);

    // ── B: the turret you funded now hunts you ──
    const hostile = await page.evaluate(async () => {
        const g = window.game;
        const camp = g.camps[0];
        const turret = camp.turrets[0];
        const pos = camp.turretWorldPos(turret);
        g.player.position.set(pos.x + 1, 0, pos.z);
        const heartsBefore = g.playerVitals.health ?? g.playerVitals.hearts;
        const suspicionBefore = g.getCampRecord(camp.id).suspicion;
        let zapped = false;
        window.addEventListener('camp-turret-zap', () => { zapped = true; }, { once: true });
        // Drive the turret loop directly (headless runs ~2fps).
        turret.cooldown = 0;
        g.updateCampTurrets(0.01, g.act2.getPhase());
        await new Promise((r) => setTimeout(r, 300));
        return {
            zapped,
            heartsBefore,
            heartsAfter: g.playerVitals.health ?? g.playerVitals.hearts,
            suspicionBefore,
            suspicionAfter: g.getCampRecord(camp.id).suspicion
        };
    });
    check('turret zaps the carrier', hostile.zapped === true, JSON.stringify(hostile));
    check('zap raises camp suspicion', hostile.suspicionAfter > hostile.suspicionBefore,
        `${hostile.suspicionBefore}→${hostile.suspicionAfter}`);

    // Interact offers SMASH (no Vey bond yet) and smashing alerts the camp.
    const smash = await page.evaluate(() => {
        const g = window.game;
        const camp = g.camps[0];
        const pos = camp.turretWorldPos(camp.turrets[0]);
        g.player.position.set(pos.x + 0.5, 0, pos.z);
        const actionable = g.getActionableCampAt(g.player.position.x, g.player.position.z);
        const label = actionable?.label ?? '';
        const suspicionBefore = g.getCampRecord(camp.id).suspicion;
        g.interactWithAct2Camp();
        return {
            label,
            destroyed: camp.turrets[0].destroyed,
            suspicionBefore,
            suspicionAfter: g.getCampRecord(camp.id).suspicion
        };
    });
    check('interact offers SMASH without Vey bond', /SMASH TURRET/.test(smash.label), smash.label);
    check('smashing destroys the turret and alerts the camp',
        smash.destroyed === true && smash.suspicionAfter >= smash.suspicionBefore + 20,
        JSON.stringify(smash));

    // With Vey bond, a fresh turret would be spoofable.
    const spoofLabel = await page.evaluate(() => {
        const g = window.game;
        g.act2.adjustHiveBond('hive_relay', 1);
        const camp = g.camps[0];
        // build the second turret via level 3
        g.bank.addShells(30);
        g.act2.upgradeCamp(camp.id);
        camp.setLevel(3);
        const pos = camp.turretWorldPos(camp.turrets[1]);
        g.player.position.set(pos.x + 0.5, 0, pos.z);
        return g.getActionableCampAt(g.player.position.x, g.player.position.z)?.label ?? '';
    });
    check('with Vey bond the interact offers the spoof', /SPOOF TURRET/.test(spoofLabel), spoofLabel);
} finally {
    await browser.close();
}
console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
