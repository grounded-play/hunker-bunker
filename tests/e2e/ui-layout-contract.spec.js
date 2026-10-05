import { expect, test } from '@playwright/test';
import { bootToOperatorMenu, startRunAndSkipIntro, stubOfflineElectronAPI } from './helpers.js';

// docs/planning/ui-overhaul-plan-2026-10-05.md: layout contracts the
// ui-surface-audit could not see. Paint order (what is really on top of a
// control), painted frame alpha, decoration inside the corner slot, sibling
// overlap and the HUD safe frame. One boot walks the menu, the HUD and the
// pause menu at the Deck stage; expect.soft reports every broken contract in
// one run. Modals (terminal, settings) cover the corner slot by design.

// HB_CONTRACT_SIZE=1920x1080 checks another window size (the stage letterboxes).
const [W, H] = (process.env.HB_CONTRACT_SIZE || '1280x800').split('x').map(Number);
const STAGE = { width: W, height: H };

// Elements covering a box, by paint order. Pointer events are forced on so
// decorative layers (pointer-events: none) are hit-tested too; layers that
// cover most of the stage (bezel, scanlines, strain vignette) are tints, not
// occluders, and are skipped.
async function occluders(page, selector) {
    await page.addStyleTag({ content: '*, *::before, *::after { pointer-events: auto !important; }' })
        .then((h) => h.evaluate((n) => n.setAttribute('data-ui-contract', '1')));
    const result = await page.evaluate((selector) => {
        const W = innerWidth;
        const H = innerHeight;
        const label = (n) => (n.id ? `#${n.id}` : `${n.tagName.toLowerCase()}.${[...n.classList].slice(0, 2).join('.')}`);
        const out = [];
        for (const el of document.querySelectorAll(selector)) {
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2 || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
            const ix = Math.min(3, r.width / 4);
            const iy = Math.min(3, r.height / 4);
            const points = [[r.left + ix, r.top + iy], [r.right - ix, r.top + iy], [r.left + ix, r.bottom - iy],
                [r.right - ix, r.bottom - iy], [(r.left + r.right) / 2, (r.top + r.bottom) / 2]];
            for (const [x, y] of points) {
                const top = document.elementsFromPoint(x, y).find((n) => {
                    const nr = n.getBoundingClientRect();
                    return n === el || n.contains(el) || el.contains(n) || nr.width * nr.height < 0.6 * W * H;
                });
                if (top && top !== el && !el.contains(top) && !top.contains(el)) {
                    out.push(`${label(el)} under ${label(top)} at ${Math.round(x)},${Math.round(y)}`);
                    break;
                }
            }
        }
        return out;
    }, selector);
    await page.evaluate(() => document.querySelectorAll('style[data-ui-contract]').forEach((n) => n.remove()));
    return result;
}

// Text that sits where a painted frame image is opaque. The frame is
// sampled at the corners of every text box inside `scopeSelector`.
async function textUnderFrame(page, frameSelector, scopeSelector) {
    return page.evaluate(async ({ frameSelector, scopeSelector }) => {
        const frame = document.querySelector(frameSelector);
        if (!frame) return ['frame missing'];
        const url = getComputedStyle(frame).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
        const img = new Image();
        img.src = url;
        await img.decode();
        const fr = frame.getBoundingClientRect();
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(fr.width);
        canvas.height = Math.round(fr.height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const alpha = (x, y) => ctx.getImageData(Math.round(x - fr.left), Math.round(y - fr.top), 1, 1).data[3];
        const out = [];
        const leaves = [...document.querySelectorAll(`${scopeSelector} *`)].filter((el) =>
            [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
            && el.checkVisibility({ visibilityProperty: true, opacityProperty: true }));
        for (const el of leaves) {
            const range = document.createRange();
            range.selectNodeContents(el);
            const r = range.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) continue;
            const corners = [[r.left + 1, r.top + 1], [r.right - 1, r.top + 1], [r.left + 1, r.bottom - 1], [r.right - 1, r.bottom - 1]];
            const hidden = corners.filter(([x, y]) => alpha(x, y) > 60).length;
            if (hidden) out.push(`"${el.textContent.trim().slice(0, 24)}" ${hidden}/4 corners under frame at ${Math.round(r.left)},${Math.round(r.top)}`);
        }
        return out;
    }, { frameSelector, scopeSelector });
}

// Boxes of `selector` that intersect each other, outline included.
async function siblingOverlaps(page, selector) {
    return page.evaluate((selector) => {
        const boxes = [...document.querySelectorAll(selector)].filter((el) => el.checkVisibility()).map((el) => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            const o = cs.outlineStyle === 'none' ? 0 : Math.max(0, parseFloat(cs.outlineWidth) + parseFloat(cs.outlineOffset));
            return { el, l: r.left - o, t: r.top - o, r: r.right + o, b: r.bottom + o };
        });
        const out = [];
        for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
                const a = boxes[i];
                const b = boxes[j];
                const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
                const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
                if (w > 1 && h > 1) out.push(`${a.el.dataset.type || a.el.id || i} x ${b.el.dataset.type || b.el.id || j}: ${Math.round(w)}x${Math.round(h)}`);
            }
        }
        return out;
    }, selector);
}

// Decorative pseudo-elements of the cabinet bezel that reach into a corner button.
async function bezelBracketHits(page) {
    return page.evaluate(() => {
        const bezel = document.getElementById('cabinet-bezel');
        if (!bezel) return [];
        const br = bezel.getBoundingClientRect();
        const out = [];
        for (const pseudo of ['::before', '::after']) {
            const cs = getComputedStyle(bezel, pseudo);
            if (cs.content === 'none' || cs.display === 'none') continue;
            const w = parseFloat(cs.width) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
            const h = parseFloat(cs.height) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
            const left = cs.left !== 'auto' ? br.left + parseFloat(cs.left) : br.right - parseFloat(cs.right) - w;
            const top = cs.top !== 'auto' ? br.top + parseFloat(cs.top) : br.bottom - parseFloat(cs.bottom) - h;
            for (const btn of document.querySelectorAll('.open-settings-btn, [data-player-chat-open]')) {
                if (!btn.checkVisibility()) continue;
                const r = btn.getBoundingClientRect();
                const pad = 4;
                if (left < r.right + pad && left + w > r.left - pad && top < r.bottom + pad && top + h > r.top - pad) {
                    out.push(`#cabinet-bezel${pseudo} touches ${btn.id || btn.className}`);
                }
            }
        }
        return out;
    });
}

// Dock text that reaches into a housing's painted frame. The housing box is
// transparent in the middle; only its border-image band hides what is under it.
async function textUnderHousingFrame(page) {
    return page.evaluate(() => {
        const housings = [...document.querySelectorAll('.dock-housing')].filter((el) => el.checkVisibility()).map((el) => {
            const r = el.getBoundingClientRect();
            const w = getComputedStyle(el).borderImageWidth.split(' ').map((v) => parseFloat(v) || 0);
            const [t, rt = t, b = t, l = rt] = w;
            return { l: r.left + l, t: r.top + t, r: r.right - rt, b: r.bottom - b, outer: r };
        });
        const out = [];
        const leaves = [...document.querySelectorAll('#ui *')].filter((el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true })
            && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
        for (const el of leaves) {
            const range = document.createRange();
            range.selectNodeContents(el);
            const box = range.getBoundingClientRect();
            // A glyph box carries the font's internal leading; uppercase HUD
            // ink sits in roughly its middle 70 %.
            const lead = box.height * 0.15;
            const r = { left: box.left, right: box.right, top: box.top + lead, bottom: box.bottom - lead, width: box.width, height: box.height - 2 * lead };
            const cx = (r.left + r.right) / 2;
            const cy = (r.top + r.bottom) / 2;
            const h = housings.find((x) => cx >= x.outer.left && cx <= x.outer.right && cy >= x.outer.top && cy <= x.outer.bottom);
            if (!h) continue;
            if (r.left < h.l - 1 || r.top < h.t - 1 || r.right > h.r + 1 || r.bottom > h.b + 1) {
                out.push(`"${el.textContent.trim().slice(0, 16)}" ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
            }
        }
        return out;
    });
}

const CORNER = ':is(.menu-corner-settings, .armory-corner-settings, .net-corner-settings, .hud-corner-settings) :is(.open-settings-btn, [data-player-chat-open])';

test('UI layout contract at the Deck stage', async ({ page }) => {
    test.setTimeout(600_000);
    await page.setViewportSize(STAGE);
    await stubOfflineElectronAPI(page);
    await bootToOperatorMenu(page);
    await page.waitForTimeout(1200);

    await test.step('operator menu: class cards clear of the frame and of each other', async () => {
        // Focus a card that is not the selected one: both states draw outward.
        await page.locator('#menu .char-card[data-type="ENGINEER"]').focus();
        await page.waitForTimeout(400);
        await page.screenshot({ path: test.info().outputPath('menu.png') });
        expect.soft(await textUnderFrame(page, '.homebase-plate-overlay', '#menu .char-selection'), 'class card text under the menu frame').toEqual([]);
        expect.soft(await siblingOverlaps(page, '#menu .char-selection .char-card'), 'class cards overlapping').toEqual([]);
    });

    await test.step('corner slot: no bezel bracket, nothing on top of CHAT or the gear (menu)', async () => {
        expect.soft(await bezelBracketHits(page), 'bezel bracket in the corner slot').toEqual([]);
        expect.soft(await occluders(page, CORNER), 'corner slot covered on the menu').toEqual([]);
    });

    await startRunAndSkipIntro(page);
    await page.waitForTimeout(3000);

    await test.step('HUD: corner slot clear, tiles in the dock, vitals legible, safe frame', async () => {
        await page.screenshot({ path: test.info().outputPath('hud.png') });
        expect.soft(await occluders(page, CORNER), 'corner slot covered in play').toEqual([]);
        expect.soft(await textUnderHousingFrame(page), 'dock text under its painted housing frame').toEqual([]);
        const spill = await page.evaluate(() => [...document.querySelectorAll(':is(#weapon-status-panel, #class-ability-panel, #radar-scan-panel, #dash-cooldown-panel, #melee-cooldown-panel, #pickup-counter-panel, #vitals-panel, #ship-status-panel) *')]
            .filter((el) => el.checkVisibility() && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
            .flatMap((el) => {
                const panel = el.closest('[id$="-panel"]');
                const range = document.createRange();
                range.selectNodeContents(el);
                const r = range.getBoundingClientRect();
                const p = panel.getBoundingClientRect();
                return r.left < p.left - 1 || r.right > p.right + 1 ? [`"${el.textContent.trim().slice(0, 16)}" spills out of #${panel.id}`] : [];
            }));
        expect.soft(spill, 'dock text wider than its panel').toEqual([]);
        const hud = await page.evaluate(() => {
            const rect = (sel) => {
                const el = document.querySelector(sel);
                if (!el || !el.checkVisibility()) return null;
                const r = el.getBoundingClientRect();
                return { l: r.left, t: r.top, r: r.right, b: r.bottom };
            };
            const housings = [...document.querySelectorAll('.dock-housing')].filter((el) => el.checkVisibility())
                .map((el) => el.getBoundingClientRect());
            const inside = (r) => r && housings.some((h) => r.l >= h.left - 1 && r.t >= h.top - 1 && r.r <= h.right + 1 && r.b <= h.bottom + 1);
            const tiles = ['#class-ability-panel', '#radar-scan-panel', '#dash-cooldown-panel', '#melee-cooldown-panel'].map((s) => [s, rect(s)])
                .filter(([, r]) => r).filter(([, r]) => !inside(r)).map(([s, r]) => `${s} at ${Math.round(r.l)},${Math.round(r.t)}`);
            const o2 = rect('.vitals-panel__o2-row');
            const ship = rect('.ship-status-panel');
            const vitalsOverlap = o2 && ship && Math.min(o2.b, ship.b) - Math.max(o2.t, ship.t) > 1
                && Math.min(o2.r, ship.r) - Math.max(o2.l, ship.l) > 1;
            // 32 logical px from the stage edge, scaled with the letterboxed stage.
            const stage = document.getElementById('game-viewport').getBoundingClientRect();
            const safe = 32 * (stage.width / 1280) - 1;
            const unsafe = housings.filter((h) => h.left - stage.left < safe || stage.right - h.right < safe || stage.bottom - h.bottom < safe)
                .map((h) => `housing at ${Math.round(h.left)},${Math.round(h.top)} ${Math.round(h.width)}x${Math.round(h.height)}`);
            const brackets = [...document.querySelectorAll('.hud-visor-bracket')].filter((el) => el.checkVisibility())
                .map((el) => el.getBoundingClientRect())
                .filter((b) => housings.some((h) => Math.min(b.right, h.right) - Math.max(b.left, h.left) > 1 && Math.min(b.bottom, h.bottom) - Math.max(b.top, h.top) > 1))
                .map((b) => `bracket at ${Math.round(b.left)},${Math.round(b.top)}`);
            return { tiles, vitalsOverlap, unsafe, brackets };
        });
        expect.soft(hud.tiles, 'cooldown tiles outside the dock housings').toEqual([]);
        expect.soft(hud.vitalsOverlap, 'O2 row overlaps ship integrity').toBeFalsy();
        expect.soft(hud.unsafe, 'dock housings inside the 32 px safe frame').toEqual([]);
        expect.soft(hud.brackets, 'visor brackets crossing dock housings').toEqual([]);
    });

    await test.step('pause: labels never touch their action buttons', async () => {
        await page.keyboard.press('Escape');
        await page.locator('#settings-popup').waitFor({ state: 'visible', timeout: 10_000 });
        await page.waitForTimeout(500);
        const tight = await page.evaluate(() => [...document.querySelectorAll('#settings-popup .setting-item')]
            .filter((row) => row.checkVisibility())
            .flatMap((row) => {
                const label = [...row.children].find((c) => !c.matches('button, input, select, label:has(input)') && c.textContent.trim());
                const action = [...row.querySelectorAll('button, select, input')].find((c) => c.checkVisibility());
                if (!label || !action || label.contains(action)) return [];
                const range = document.createRange();
                range.selectNodeContents(label);
                const t = range.getBoundingClientRect();
                const a = action.getBoundingClientRect();
                const gap = a.left - t.right;
                return gap < 8 && Math.min(t.bottom, a.bottom) > Math.max(t.top, a.top) ? [`"${label.textContent.trim().slice(0, 30)}" gap ${Math.round(gap)} px`] : [];
            }));
        expect.soft(tight, 'setting labels touching their buttons').toEqual([]);
    });
});
