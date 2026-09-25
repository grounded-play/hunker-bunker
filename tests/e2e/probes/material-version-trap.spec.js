import fs from 'node:fs';
import { test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro } from '../helpers.js';

// Who bumps these materials' version (forcing a program re-check) every frame?
const OUT = process.env.HB_PROBE_OUT || '/tmp';

test('material version trap', async ({ page }) => {
    test.setTimeout(900_000);
    await bootToOperatorMenu(page);
    await startRunAndSkipIntro(page);
    await page.waitForTimeout(3000);
    const stacks = await page.evaluate(() => new Promise((resolve) => {
        const g = window.game;
        const seen = new Map();
        const where = (o) => { let p = o; while (p) { const t = p.userData?.type || p.userData?.world3dModelType || p.name; if (t) return String(t); p = p.parent; } return '?'; };
        let trapped = 0;
        g.scene.traverse((o) => {
            if (trapped >= 100000 || !o.material || Array.isArray(o.material)) return;
            const m = o.material;
            if (Object.getOwnPropertyDescriptor(m, 'version')?.get) return;
            let v = m.version;
            const bb = (o.geometry?.boundingBox ?? (o.geometry?.computeBoundingBox?.(), o.geometry?.boundingBox));
            const size = bb ? [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].map((n) => n.toFixed(3)).join('x') : '?';
            const chain = []; for (let p = o; p && chain.length < 5; p = p.parent) chain.push(p.name || p.type);
            const label = `${m.type}:${where(o)}:${o.geometry?.type}:${size}:${chain.join('<')}:side${m.side}:t${m.transparent}:fsp${m.forceSinglePass}`;
            Object.defineProperty(m, 'version', {
                configurable: true,
                get: () => v,
                set: (next) => {
                    v = next;
                    const stack = new Error().stack.split('\n').slice(2, 9).map((l) => l.trim().replace(/https?:\/\/[^/]+\/assets\//, '')).join(' <- ');
                    const key = `${label} :: ${stack}`;
                    seen.set(key, (seen.get(key) ?? 0) + 1);
                }
            });
            trapped += 1;
        });
        setTimeout(() => resolve([...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)), 8000);
    }));
    fs.writeFileSync(`${OUT}/material-version-trap.json`, JSON.stringify(stacks, null, 1));
});
