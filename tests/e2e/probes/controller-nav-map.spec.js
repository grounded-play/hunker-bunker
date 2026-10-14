import { test } from '@playwright/test';
import fs from 'node:fs';
import { MENU_FOCUS_ROOT_IDS } from '../../../src/inputActions.js';
import { bootToTitleSplash, startRunAndSkipIntro, stubOfflineElectronAPI } from '../helpers.js';
import { analyse, renderSummary } from './navMapAnalysis.js';

// Controller navigation map (docs/planning/controller-navigation-remap-plan-2026-10-14.md,
// Phase A). Walks the menus the way a pad player does -- focus the opener,
// press A on a browser gamepad, read the surface, press B -- and, on every
// surface and tab, records where each D-pad direction actually sends focus
// from every focusable control. Writes docs/reports/controller-nav-map/:
// clean and annotated screenshots, nav-map.json and summary.md.
//
// Read-only apart from opening menus: A is pressed only on the openers listed
// below, and a move that switches a tab is put back before the next one.
// Run with HB_PROBES=1 against a no-HMR dev server (see the plan doc).
const OUT = process.env.HB_NAV_MAP_OUT || 'docs/reports/controller-nav-map';
const VIEW = { width: Number(process.env.HB_NAV_MAP_W || 1280), height: Number(process.env.HB_NAV_MAP_H || 800) };
const PRESS_MS = Number(process.env.HB_NAV_MAP_PRESS_MS || 300);
const BUTTON = { A: 0, B: 1, LB: 4, RB: 5, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

// Settings openers, keyed by the panel they live in (switched before opening).
const SETTINGS_CHILDREN = [
    '#open-audio-mixer', '#open-commentary-list', '#open-language-select', '#open-crosshair-color',
    '#open-mature-audit-btn', '#open-controls', '#open-save-data', '#open-reset-save', '#open-quit-confirm',
    // A dropdown opens the select picker; a text field opens the on-screen keyboard.
    '#setting-text-speed', '#operator-callsign'
];

// ── In-page measurement library ──────────────────────────────────────────
// Installed once per page load. Mirrors getVisibleControllerFocusables and
// getControllerFocusRoot in main.js (neither is exported to window).
function installNavMap(rootIds) {
    if (window.__navmap) return;
    const isVisible = (el) => (typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.getClientRects().length > 0);
    const topRoot = () => {
        for (const id of rootIds) {
            const el = document.getElementById(id);
            if (el && !el.classList.contains('hidden') && isVisible(el)) return el;
        }
        return document.body.classList.contains('mission-intro-active') ? document.body : null;
    };
    const SELECTOR = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], .char-card, [tabindex]:not([tabindex="-1"])';
    const focusables = (root) => {
        if (!root) return [];
        const els = [...root.querySelectorAll(SELECTOR)];
        if (root.id === 'menu') {
            for (const sel of ['.menu-corner-settings [data-player-chat-open]', '.menu-corner-settings .open-settings-btn', '#start-game']) {
                const el = document.querySelector(sel);
                if (el && !els.includes(el)) els.push(el);
            }
        }
        return els.filter((el) => {
            if (!isVisible(el) || el.disabled) return false;
            if (el.getAttribute('aria-disabled') === 'true' && !el.hasAttribute('data-controller-focusable')) return false;
            if (el.closest('.hidden, [hidden], [inert], [aria-hidden="true"]')) return false;
            const cs = getComputedStyle(el);
            return cs.display !== 'none' && cs.visibility !== 'hidden';
        });
    };
    // Visible controls a pad can never land on: disabled or aria-disabled.
    const lockedControls = (root) => [...(root?.querySelectorAll('button, [role="button"], .char-card, [tabindex]') ?? [])]
        .filter((el) => isVisible(el) && (el.disabled || el.getAttribute('aria-disabled') === 'true')
            && !el.hasAttribute('data-controller-focusable') && !el.closest('.hidden, [hidden], [aria-hidden="true"]'))
        .map((el) => label(el));
    const text = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '')
        .replace(/\s+/g, ' ').trim().slice(0, 32);
    const label = (el) => {
        if (!el || el === document.body) return 'body';
        const t = text(el);
        if (el.id) return `#${el.id}${t ? ` "${t}"` : ''}`;
        return `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')}${t ? ` "${t}"` : ''}`;
    };
    const TAB_SEL = '[role="tab"], .tab-btn, .vault-tab-btn, .terminal-tab-btn, .season-pass-tab-btn, .category-btn, .sub-tab-btn, .class-tab, [data-settings-tab]';
    const isActiveTab = (el) => el.classList.contains('active') || el.classList.contains('is-active') || el.classList.contains('selected')
        || el.getAttribute('aria-selected') === 'true';
    const tabs = (root) => [...(root?.querySelectorAll(TAB_SEL) ?? [])].filter(isVisible);
    const stateSig = (root) => {
        const sel = [...(root?.querySelectorAll('.selected, [aria-selected="true"], .is-selected, .active, .is-active') ?? [])]
            .filter(isVisible).map((el) => label(el)).join('|');
        const values = [...(root?.querySelectorAll('input, select') ?? [])].map((el) => (el.type === 'checkbox' ? el.checked : el.value)).join('|');
        return `${sel}#${values}`;
    };
    const rect = (el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
    };
    const onStage = (r) => r[2] > 0 && r[3] > 0 && r[0] + r[2] > 0 && r[1] + r[3] > 0 && r[0] < innerWidth && r[1] < innerHeight;
    const scrollers = (root) => [root, ...root.querySelectorAll('*')].filter((el) => el.scrollHeight > el.clientHeight + 4 || el.scrollWidth > el.clientWidth + 4);
    const nav = (action) => window.dispatchEvent(new CustomEvent('gamepad-menu-nav', { detail: { action } }));

    function measure() {
        const root = topRoot();
        if (!root) return { root: null };
        const entryEl = document.activeElement;
        const entry = label(entryEl);
        let fs = focusables(root);
        // Tags from an earlier surface would make [data-navmap="i"] match a
        // hidden control from that surface instead of this one.
        const retag = () => {
            document.querySelectorAll('[data-navmap]').forEach((el) => el.removeAttribute('data-navmap'));
            fs.forEach((el, i) => { if (el) el.dataset.navmap = String(i); });
        };
        retag();
        const scrollState = scrollers(root).map((el) => [el, el.scrollTop, el.scrollLeft]);
        const restoreScroll = () => scrollState.forEach(([el, top, left]) => { if (el.isConnected) { el.scrollTop = top; el.scrollLeft = left; } });
        const tabList = tabs(root).map((el) => ({ label: label(el), active: isActiveTab(el) }));
        // Identity that survives a state change (label() includes classes
        // such as .is-active, which flip when a tab is selected).
        const key = (el) => (el.id ? `#${el.id}` : `${el.tagName}|${text(el)}`);
        const activeTabKeys = tabs(root).filter(isActiveTab).map((el) => key(el));
        const items = fs.map((el, i) => ({ i, key: key(el), label: label(el), tag: el.tagName.toLowerCase(), role: el.getAttribute('role'), rect: rect(el) }));
        // Several surfaces rebuild their lists when a tab changes (Dossier,
        // Archive), which disconnects the nodes recorded above. Match the
        // current controls back to the recorded ones by label and position.
        const rebuild = () => {
            restoreScroll();
            const now = focusables(root);
            const used = new Set();
            const near = (el, it) => { const r = rect(el); return Math.abs(r[0] - it.rect[0]) < 8 && Math.abs(r[1] - it.rect[1]) < 8; };
            fs = items.map((it) => {
                const hit = now.find((el) => !used.has(el) && key(el) === it.key && near(el, it))
                    ?? now.find((el) => !used.has(el) && key(el) === it.key);
                if (hit) used.add(hit);
                return hit ?? null;
            });
            retag();
        };
        const restoreTabs = () => {
            for (const tabKey of activeTabKeys) {
                const el = tabs(root).find((t) => key(t) === tabKey);
                if (el && !isActiveTab(el)) el.click();
            }
            rebuild();
        };
        const indexOf = (el) => {
            const idx = Number(el?.dataset?.navmap);
            if (Number.isInteger(idx) && fs[idx] === el) return idx;
            const r = rect(el);
            const found = items.findIndex((it) => it.key === key(el) && Math.abs(it.rect[0] - r[0]) < 8 && Math.abs(it.rect[1] - r[1]) < 8);
            return found >= 0 ? found : items.findIndex((it) => it.key === key(el));
        };
        const baseState = stateSig(root);

        // Whether Chromium treats script focus as :focus-visible, in controller
        // mode (body.controller-mode, set by the nav event). Pixel check: measureRings.
        nav('menu_noop');
        for (const [i, el] of fs.entries()) {
            document.activeElement?.blur?.();
            el.focus({ preventScroll: true });
            items[i].focusVisible = el.matches(':focus-visible');
            if (document.activeElement !== el) items[i].focusRefused = true;
        }
        if (stateSig(root) !== baseState) restoreTabs();

        // Settings selects a tab as focus moves onto it (◀ ▶ on the bar), so
        // the pad can only rest on the selected tab there: measure an
        // unselected Settings tab as the player meets it, selected. Spatial
        // roots (Foundry, Archive, Dossier) can rest ▲ ▼ focus on an
        // unselected role="tab", so those are measured as they are.
        const followsFocus = (el) => el.matches('[data-settings-tab]');

        const edges = [];
        const notes = [];
        outer: for (let i = 0; i < items.length; i += 1) {
            let selectedForMeasure = false;
            for (const dir of DIRS_IN) {
                let from = fs[i];
                if (!from || !from.isConnected || !isVisible(from)) { rebuild(); from = fs[i]; }
                if (!from || !isVisible(from)) { notes.push(`#${i} ${items[i].label} not visible before ${dir}`); continue; }
                if (followsFocus(from) && !isActiveTab(from)) {
                    from.click();
                    selectedForMeasure = true;
                    rebuild();
                    from = fs[i] ?? from;
                }
                from.focus();
                const before = stateSig(root);
                nav(`menu_${dir}`);
                const to = document.activeElement;
                const nowRoot = topRoot();
                const edge = { from: i, dir, fromRect: rect(from) };
                if (selectedForMeasure) edge.selectedFirst = true;
                if (nowRoot !== root) {
                    edge.rootChanged = nowRoot?.id ?? null;
                    edges.push(edge);
                    notes.push(`#${i} ${dir} opened/closed a surface (${edge.rootChanged}); stopped`);
                    break outer;
                }
                if (!to || to === document.body) edge.to = 'body';
                else {
                    const idx = indexOf(to);
                    edge.to = idx >= 0 && (root.contains(to) || fs[idx] === to) ? idx : label(to);
                }
                if (to && to !== document.body) edge.toRect = rect(to);
                edge.fromRectAfter = from.isConnected ? rect(from) : edge.fromRect;
                edge.toOnStage = edge.toRect ? onStage(edge.toRect) : false;
                if (stateSig(root) !== before) {
                    edge.sideEffect = true;
                    if (!selectedForMeasure) restoreTabs();
                }
                edges.push(edge);
            }
            if (selectedForMeasure || stateSig(root) !== baseState) restoreTabs();
        }
        restoreScroll();
        // Put focus back on the entry target: the clean screenshot shows what
        // a pad player sees when the surface opens.
        const entryNow = entryEl?.isConnected ? entryEl : fs[items.findIndex((it) => it.label === entry)] ?? null;
        if (entryNow?.isConnected && root.contains(entryNow)) entryNow.focus({ preventScroll: true });
        else document.activeElement?.blur?.();
        restoreScroll();
        fs.forEach((el, i) => { if (el?.isConnected) items[i].rectFinal = rect(el); });
        return {
            root: root.id || 'body', entry, tabs: tabList, items, edges, notes,
            locked: lockedControls(root), stateRestored: stateSig(root) === baseState
        };
    }
    const DIRS_IN = ['up', 'down', 'left', 'right'];

    // Badges on every focusable, a ring on the entry target, arrows for every
    // flagged move. Drawn in a fixed overlay so it never shifts layout.
    function annotate(data, flagged) {
        clearAnnotation();
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = '__navmap-overlay';
        svg.setAttribute('width', innerWidth);
        svg.setAttribute('height', innerHeight);
        svg.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;font:bold 11px monospace';
        svg.innerHTML = '<defs><marker id="__nm-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#ff2d55"/></marker></defs>';
        const centre = (r) => [r[0] + r[2] / 2, r[1] + r[3] / 2];
        const rects = data.items.map((it) => it.rectFinal ?? it.rect);
        for (const e of flagged) {
            const a = rects[e.from];
            const b = typeof e.to === 'number' ? rects[e.to] : null;
            if (!a || !b) continue;
            const [x1, y1] = centre(a);
            const [x2, y2] = centre(b);
            const line = document.createElementNS(svg.namespaceURI, 'line');
            Object.entries({ x1, y1, x2, y2, stroke: '#ff2d55', 'stroke-width': 2, 'stroke-opacity': 0.85, 'marker-end': 'url(#__nm-ah)' })
                .forEach(([k, v]) => line.setAttribute(k, v));
            svg.appendChild(line);
            const t = document.createElementNS(svg.namespaceURI, 'text');
            Object.entries({ x: (x1 + x2) / 2 + 3, y: (y1 + y2) / 2 - 3, fill: '#ff2d55', stroke: '#000', 'stroke-width': 0.6 })
                .forEach(([k, v]) => t.setAttribute(k, v));
            t.textContent = `${e.from}${{ up: '▲', down: '▼', left: '◀', right: '▶' }[e.dir]}`;
            svg.appendChild(t);
        }
        data.items.forEach((it, i) => {
            const r = rects[i];
            if (!onStage(r)) return;
            const box = document.createElementNS(svg.namespaceURI, 'rect');
            const isEntry = data.entry === it.label;
            const weak = typeof it.ringFraction === 'number' && it.ringFraction < 0.04;
            Object.entries({ x: r[0], y: r[1], width: r[2], height: r[3], fill: 'none', stroke: isEntry ? '#34c759' : (weak ? '#ff9f0a' : '#0a84ff'), 'stroke-width': isEntry ? 3 : 1.5, 'stroke-dasharray': weak ? '4 3' : '' })
                .forEach(([k, v]) => box.setAttribute(k, v));
            svg.appendChild(box);
            const tag = document.createElementNS(svg.namespaceURI, 'g');
            const w = String(i).length * 7 + 6;
            tag.innerHTML = `<rect x="${r[0]}" y="${r[1]}" width="${w}" height="14" fill="#000" fill-opacity="0.8"/><text x="${r[0] + 3}" y="${r[1] + 11}" fill="#fff">${i}</text>`;
            svg.appendChild(tag);
        });
        document.body.appendChild(svg);
    }
    function clearAnnotation() { document.getElementById('__navmap-overlay')?.remove(); }

    // A persistent browser gamepad, all buttons released. press() goes through
    // the real poll path (browserGamepad.js -> menu actions), which is the one
    // that handles LB / RB, A, B and Start.
    const pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), timestamp: 0 };
    navigator.getGamepads = () => [pad];
    const reattachPad = () => { navigator.getGamepads = () => [pad]; };
    const setButton = (index, down) => {
        pad.buttons = pad.buttons.map((b, i) => (i === index ? { pressed: down, value: down ? 1 : 0 } : b));
        pad.timestamp = performance.now();
    };

    window.__navmap = {
        measure, annotate, clearAnnotation, setButton, nav, reattachPad, labelOf: (el) => label(el),
        topRootId: () => topRoot()?.id ?? null,
        activeLabel: () => label(document.activeElement),
        tabsState: () => tabs(topRoot()).map((el) => ({ label: label(el), active: isActiveTab(el) }))
    };
}

// ── Node-side helpers ────────────────────────────────────────────────────
const install = (page) => page.evaluate(installNavMap, MENU_FOCUS_ROOT_IDS);
const topRootId = (page) => page.evaluate(() => window.__navmap.topRootId());
const activeLabel = (page) => page.evaluate(() => window.__navmap.activeLabel());

// Start (button 9) as controller-journey.spec.js presses it: a fresh pad
// object per state, connected released first. Pressed twice when the first is
// swallowed (a headless run has no real gesture to unlock audio).
async function pressStart(page) {
    for (const down of [false, true, false]) {
        await page.evaluate((d) => {
            const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
            buttons[9] = { pressed: d, value: d ? 1 : 0 };
            const p = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, timestamp: performance.now() };
            navigator.getGamepads = () => [p];
        }, down);
        await page.waitForTimeout(250);
    }
}

// Hold a button until `changed()` reports the screen reacted (or maxMs),
// then release. The headless browser polls the pad once per rendered frame
// and can drop below 5 fps while the 3D scene loads, so a fixed short tap is
// sometimes never seen -- which read as "B does not close" and, once, let the
// walk press A on a dialog it thought was closed. Returns the hold time, so a
// press that needed a long hold still shows up in the report.
async function hold(page, button, changed, maxMs = 1_200) {
    await page.evaluate(() => window.__navmap.reattachPad());
    await page.evaluate((b) => window.__navmap.setButton(b, true), button);
    const start = Date.now();
    let reacted = false;
    while (Date.now() - start < maxMs) {
        await page.waitForTimeout(60);
        if (await changed()) { reacted = true; break; }
    }
    const held = Date.now() - start;
    await page.evaluate((b) => window.__navmap.setButton(b, false), button);
    await page.waitForTimeout(PRESS_MS);
    return { reacted, held };
}

// Wait until the topmost focus root differs from `before` (or a deadline).
async function waitForRootChange(page, before, ms = 4_000) {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
        const now = await topRootId(page);
        if (now !== before) return now;
        await page.waitForTimeout(150);
    }
    return before;
}

// How visibly each control changes when it takes focus, in controller mode:
// crop the control (plus a margin for outer rings) unfocused and focused, and
// count the pixels that change clearly. Compared in the page on a canvas.
async function measureRings(page, data) {
    for (const [i, it] of data.items.entries()) {
        const r = it.rectFinal ?? it.rect;
        if (!r || r[2] < 2 || r[3] < 2 || r[0] + r[2] < 0 || r[1] + r[3] < 0 || r[0] > VIEW.width || r[1] > VIEW.height) continue;
        const pad = 6;
        const x = Math.max(0, r[0] - pad);
        const y = Math.max(0, r[1] - pad);
        const clip = { x, y, width: Math.min(VIEW.width - x, r[2] + pad * 2), height: Math.min(VIEW.height - y, r[3] + pad * 2) };
        if (clip.width < 2 || clip.height < 2) continue;
        const ok = await page.evaluate((idx) => {
            const el = document.querySelector(`[data-navmap="${idx}"]`);
            if (!el) return false;
            document.activeElement?.blur?.();
            return true;
        }, i);
        if (!ok) continue;
        await page.waitForTimeout(40);
        const off = (await page.screenshot({ clip, animations: 'disabled' })).toString('base64');
        await page.evaluate((idx) => document.querySelector(`[data-navmap="${idx}"]`)?.focus({ preventScroll: true }), i);
        await page.waitForTimeout(40);
        const on = (await page.screenshot({ clip, animations: 'disabled' })).toString('base64');
        const diff = await page.evaluate(async ({ a, b }) => {
            const load = async (b64) => createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
            const [ia, ib] = await Promise.all([load(a), load(b)]);
            const c = new OffscreenCanvas(ia.width, ia.height);
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(ia, 0, 0);
            const pa = ctx.getImageData(0, 0, ia.width, ia.height).data;
            ctx.clearRect(0, 0, ia.width, ia.height);
            ctx.drawImage(ib, 0, 0);
            const pb = ctx.getImageData(0, 0, ia.width, ia.height).data;
            let changed = 0;
            for (let k = 0; k < pa.length; k += 4) {
                const d = Math.max(Math.abs(pa[k] - pb[k]), Math.abs(pa[k + 1] - pb[k + 1]), Math.abs(pa[k + 2] - pb[k + 2]));
                if (d > 40) changed += 1;
            }
            return { changed, total: pa.length / 4 };
        }, { a: off, b: on });
        it.ringPx = diff.changed;
        it.ringFraction = Number((diff.changed / Math.max(1, diff.total)).toFixed(4));
    }
    // Leave the entry target focused again for the clean screenshot.
    await page.evaluate((entry) => {
        const el = [...document.querySelectorAll('[data-navmap]')].find((n) => window.__navmap.labelOf(n) === entry);
        if (el) el.focus({ preventScroll: true }); else document.activeElement?.blur?.();
    }, data.entry);
}

const results = [];
const transitions = [];
let shot = 0;

async function capture(page, name) {
    await install(page);
    await page.waitForTimeout(300);
    const data = await page.evaluate(() => window.__navmap.measure());
    if (!data.root) {
        console.log(`[nav-map] ${name}: no open focus root, skipped`);
        results.push({ name, skipped: 'no open focus root' });
        return null;
    }
    await measureRings(page, data);
    const { summary, edges, reach } = analyse(name, data, VIEW);
    shot += 1;
    const base = `${String(shot).padStart(2, '0')}-${name.replace(/[^a-z0-9-]+/gi, '_')}`;
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${base}.png` });
    const flagged = edges.filter((e) => e.flags.some((f) => ['backwards', 'off-axis', 'wrap', 'long-jump', 'not-reciprocal'].includes(f)));
    await page.evaluate(({ d, f }) => window.__navmap.annotate(d, f), { d: data, f: flagged });
    await page.screenshot({ path: `${OUT}/${base}--map.png` });
    await page.evaluate(() => window.__navmap.clearAnnotation());
    results.push({ name, screenshot: `${base}.png`, annotated: `${base}--map.png`, ...data, edges, reach, summary });
    console.log(`[nav-map] ${name.padEnd(44)} root=${summary.root} ctrl=${summary.focusables} back=${summary.backwards} off=${summary.offAxis} wrap=${summary.wrap} jump=${summary.longJump} dead=${summary.deadEnd} nonrecip=${summary.notReciprocal} weakFocus=${summary.weakRing}/${summary.ringMeasured} unreach=${summary.unreachableFromEntry}`);
    flush();
    return data;
}

// Capture the surface, then step through its tabs with RB until the first tab
// comes back, recording what RB did each time.
async function captureWithTabs(page, name) {
    const first = await capture(page, name);
    if (!first?.tabs?.length || first.tabs.length < 2) return;
    const seen = new Set([first.tabs.findIndex((t) => t.active)]);
    for (let step = 0; step < 8; step += 1) {
        const rootBefore = await topRootId(page);
        const before = await page.evaluate(() => window.__navmap.tabsState());
        await hold(page, BUTTON.RB, async () => JSON.stringify(await page.evaluate(() => window.__navmap.tabsState())) !== JSON.stringify(before), 900);
        await page.waitForTimeout(250);
        const after = await page.evaluate(() => window.__navmap.tabsState());
        const activeIdx = after.findIndex((t) => t.active);
        const changed = JSON.stringify(before) !== JSON.stringify(after);
        transitions.push({ surface: name, button: 'RB', from: before.find((t) => t.active)?.label ?? null, to: after[activeIdx]?.label ?? null, changed, focusAfter: await activeLabel(page), rootAfter: await topRootId(page) });
        if ((await topRootId(page)) !== rootBefore) break;
        if (!changed || activeIdx < 0 || seen.has(activeIdx)) break;
        seen.add(activeIdx);
        await capture(page, `${name}--tab-${after[activeIdx].label.replace(/^[^"]*"|"$/g, '').slice(0, 20)}`);
    }
}

// Open a surface the way a pad player does: put focus on the opener, press A.
async function openByPad(page, selector, name, expectedRoot = null) {
    await install(page);
    if (expectedRoot && (await topRootId(page)) !== expectedRoot) {
        transitions.push({ surface: name, button: 'A', opener: selector, skipped: `walk is on ${await topRootId(page)}, not ${expectedRoot}` });
        return null;
    }
    const opener = page.locator(selector).first();
    if (!(await opener.isVisible().catch(() => false))) {
        transitions.push({ surface: name, button: 'A', opener: selector, skipped: 'opener not visible' });
        return null;
    }
    const before = await topRootId(page);
    await opener.evaluate((el) => el.focus());
    const { held } = await hold(page, BUTTON.A, async () => (await topRootId(page)) !== before);
    const after = await waitForRootChange(page, before, 2_500);
    await page.waitForTimeout(700);
    const entry = await activeLabel(page);
    transitions.push({ surface: name, button: 'A', opener: selector, from: before, to: after, entry, opened: after !== before, held });
    return after !== before ? after : null;
}

// Back out with B; record which surface is on top and where focus landed.
async function backByPad(page, name, openerSelector, expectRoot) {
    const before = await topRootId(page);
    const { held } = await hold(page, BUTTON.B, async () => (await topRootId(page)) !== before);
    const after = await waitForRootChange(page, before, 1_500);
    await page.waitForTimeout(400);
    const focus = await activeLabel(page);
    const restored = openerSelector
        ? await page.evaluate((sel) => Boolean(document.activeElement?.matches?.(sel)), openerSelector)
        : null;
    transitions.push({ surface: name, button: 'B', from: before, to: after, focusAfter: focus, focusRestoredToOpener: restored, closed: after !== before, held });
    if (after === before) {
        // B did not close it: fall back to the surface's own close control so the walk can continue.
        await page.locator(`#${before} :is(.close-modal, [data-menu-back], #reset-save-cancel, #quit-cancel-btn, #confirm-no, [data-close], .modal-close, .close-btn)`).first()
            .click({ timeout: 2_000 }).catch(() => {});
        await page.waitForTimeout(500);
    }
    if (expectRoot && (await topRootId(page)) !== expectRoot) {
        console.log(`[nav-map] after backing out of ${name}: top is ${await topRootId(page)}, expected ${expectRoot}`);
    }
}

async function visit(page, opener, name, { tabs = true, children = [], parentRoot = null } = {}) {
    const root = await openByPad(page, opener, name, parentRoot);
    if (!root) {
        console.log(`[nav-map] ${name}: A on ${opener} opened nothing`);
        return;
    }
    if (tabs) await captureWithTabs(page, name); else await capture(page, name);
    for (const child of children) await child(page, root);
    await backByPad(page, name, opener, parentRoot);
}

const generated = new Date().toISOString();
function flush() {
    fs.writeFileSync(`${OUT}/nav-map.json`, `${JSON.stringify({ view: VIEW, generated, transitions, surfaces: results }, null, 1)}\n`);
}

function writeSummary() {
    fs.writeFileSync(`${OUT}/summary.md`, renderSummary({ view: VIEW, generated, surfaces: results, transitions }));
}


const settingsChildren = SETTINGS_CHILDREN.map((sel) => async (page) => {
    // Show the panel that holds this opener first (setup, not measured).
    await page.evaluate((s) => {
        const panel = document.querySelector(s)?.closest('[data-settings-panel]');
        if (panel) document.querySelector(`[data-settings-tab="${panel.dataset.settingsPanel}"]`)?.click();
    }, sel);
    await page.waitForTimeout(300);
    await visit(page, sel, `settings--${sel.replace(/^#(open-)?/, '')}`, { parentRoot: 'settings-popup' });
});

test.setTimeout(3_600_000);
test('controller navigation map', async ({ page }) => {
    fs.mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(VIEW);
    await stubOfflineElectronAPI(page);

    // ── Title ──
    await bootToTitleSplash(page);
    await install(page);
    await page.evaluate(() => window.__navmap.nav('menu_noop'));
    await page.waitForTimeout(500);
    await capture(page, 'title');
    await visit(page, '#title-settings-btn', 'settings', { children: settingsChildren, parentRoot: 'splash' });
    await visit(page, '#title-achievements-btn', 'achievements', { parentRoot: 'splash' });
    await visit(page, '#title-about-btn', 'about', { parentRoot: 'splash' });
    await visit(page, '#title-quit-btn', 'quit-confirm', { parentRoot: 'splash' });

    // ── Operator menu ──
    const menuRoot = await openByPad(page, '#title-newrun-btn', 'operator-menu', 'splash');
    if (!menuRoot) throw new Error('NEW RUN did not leave the title');
    if (await page.locator('#roster-confirm-btn').isVisible().catch(() => false)) {
        await capture(page, 'roster');
        await visit(page, '#roster-callsign-input', 'roster--keyboard', { tabs: false });
        await page.locator('#roster-confirm-btn').click();
    }
    await page.locator('#start-game').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForTimeout(800);
    await capture(page, 'operator-menu');
    await visit(page, '#hero-polish-btn', 'operator-polish', { parentRoot: 'menu' });
    await visit(page, '#steam-vault-btn', 'foundry-hub-from-vault', { parentRoot: 'menu' });
    await visit(page, '#fabrication-btn', 'foundry-hub-from-fab', { tabs: false, parentRoot: 'menu' });
    await visit(page, '#archive-btn', 'archive', { parentRoot: 'menu' });
    await visit(page, '#codex-btn', 'codex', {
        parentRoot: 'menu',
        children: [async (page) => visit(page, '#codex-modal .codex-card--unlocked', 'codex-detail', { tabs: false, parentRoot: 'codex-modal' })]
    });
    await visit(page, '#season-pass-btn', 'dossier', { parentRoot: 'menu' });
    await visit(page, '#achievements-btn', 'achievements-from-menu', { tabs: false, parentRoot: 'menu' });
    await visit(page, '#archive-sims-btn', 'archive-sims', { tabs: false, parentRoot: 'menu' });
    await visit(page, '.menu-corner-settings [data-player-chat-open]', 'chat', { tabs: false, parentRoot: 'menu' });

    // ── Armory ──
    const armory = await openByPad(page, '#start-game', 'armory', 'menu');
    if (armory) {
        await page.waitForTimeout(1500);
        await capture(page, 'armory');
        // Armory switches class on Q / E; record what LB / RB do there.
        const before = await page.evaluate(() => window.__navmap.tabsState());
        await hold(page, BUTTON.RB, async () => JSON.stringify(await page.evaluate(() => window.__navmap.tabsState())) !== JSON.stringify(before), 900);
        await page.waitForTimeout(400);
        const after = await page.evaluate(() => window.__navmap.tabsState());
        transitions.push({ surface: 'armory', button: 'RB', from: before.find((t) => t.active)?.label ?? null, to: after.find((t) => t.active)?.label ?? null, changed: JSON.stringify(before) !== JSON.stringify(after), focusAfter: await activeLabel(page), rootAfter: await topRootId(page) });
        await visit(page, '#armory-slot-weapon', 'armory--slot-picker', { tabs: false, parentRoot: 'armory-screen' });
        await visit(page, '#armory-screen select >> visible=true', 'armory--select-picker', { tabs: false, parentRoot: 'armory-screen' });

        // ── Deployment console ──
        const net = await openByPad(page, '#armory-btn-embark', 'tactical-net', 'armory-screen');
        if (net) {
            await page.waitForTimeout(1200);
            await capture(page, 'tactical-net');
        }
    }

    // ── In run ──
    await startRunAndSkipIntro(page);
    await install(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
        const g = window.game;
        if (!g?.interactWithConsole?.()) g?.openConsoleModal?.(g.activeInteractiveConsole ?? g.getActiveShip?.());
    });
    await page.waitForTimeout(1200);
    if ((await topRootId(page)) === 'console-terminal-modal') {
        await captureWithTabs(page, 'ship-terminal');
        await backByPad(page, 'ship-terminal', null, null);
    }
    await page.waitForTimeout(600);
    await hold(page, BUTTON.UP, async () => (await topRootId(page)) === 'tactical-map-modal', 900);
    await page.waitForTimeout(600);
    if ((await topRootId(page)) === 'tactical-map-modal') {
        await capture(page, 'tactical-map');
        await backByPad(page, 'tactical-map', null, null);
    }

    await pressStart(page);
    await page.waitForTimeout(900);
    if ((await topRootId(page)) !== 'settings-popup') await pressStart(page);
    await page.waitForTimeout(900);
    if ((await topRootId(page)) === 'settings-popup') {
        await capture(page, 'pause-settings');
        // Abort -> confirm -> results, by pad (the run is throwaway).
        const confirm = await openByPad(page, '#abort-mission', 'abort-confirm', 'settings-popup');
        if (confirm) {
            await capture(page, 'abort-confirm');
            const over = await openByPad(page, '#confirm-yes', 'game-over', 'confirm-modal');
            if (over) {
                await page.waitForTimeout(2500);
                await capture(page, 'game-over');
            }
        }
        if ((await topRootId(page)) === 'settings-popup') await backByPad(page, 'pause-settings', null, null);
    } else {
        transitions.push({ surface: 'pause', button: 'START', to: await topRootId(page), changed: false, focusAfter: await activeLabel(page) });
    }
    flush();
    writeSummary();
});
