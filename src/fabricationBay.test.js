import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAB_RECIPES } from './fabricator.js';
import { createFabricationBay, fabCostMarkup, fabCostText, fabMissingResourceText } from './fabricationBay.js';

class FakeElement {
    constructor(tag, id = '') {
        this.tagName = tag.toUpperCase();
        this.id = id;
        this.children = [];
        this.parent = null;
        this.dataset = {};
        this.attributes = {};
        this.listeners = {};
        this.style = {};
        this.textContent = '';
        this.disabled = false;
        this._html = '';
        const classes = new Set();
        this.classList = {
            add: (...c) => c.forEach((x) => classes.add(x)),
            remove: (...c) => c.forEach((x) => classes.delete(x)),
            contains: (c) => classes.has(c),
            toggle: (c, on) => { if (on ?? !classes.has(c)) classes.add(c); else classes.delete(c); }
        };
        Object.defineProperty(this, 'className', {
            get: () => [...classes].join(' '),
            set: (v) => { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((x) => classes.add(x)); }
        });
    }
    get innerHTML() { return this._html; }
    set innerHTML(v) { this._html = String(v); this.children = []; }
    insertAdjacentHTML(_where, html) { this._html += html; }
    append(...nodes) { for (const n of nodes) { n.parent = this; this.children.push(n); } }
    appendChild(n) { this.append(n); return n; }
    setAttribute(k, v) { this.attributes[k] = String(v); }
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
    removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== fn); }
    click() { for (const fn of this.listeners.click ?? []) fn({ preventDefault() {} }); }
    get firstElementChild() { return this.children[0] ?? null; }
    get offsetWidth() { return 0; }
    get clientWidth() { return 320; }
    getBoundingClientRect() { return { width: 92 }; }
}

const IDS = ['fab-recipe-grid', 'fab-roll-panel', 'fab-roll-btn', 'fab-odds', 'fab-summary', 'fabrication-modal',
    'fab-bank-tech', 'fab-bank-coin', 'fab-bank-med', 'fab-bank-shells', 'fab-reveal', 'fab-reveal-strip',
    'fab-reveal-card', 'fab-reveal-strip-wrap'];

function setup({ activated = true, canRoll = true, hub = false } = {}) {
    vi.useFakeTimers();
    const els = new Map(IDS.map((id) => [id, new FakeElement('div', id)]));
    els.get('fabrication-modal').classList.add('hidden');
    const doc = { createElement: (tag) => new FakeElement(tag), getElementById: (id) => els.get(id) ?? null };
    const printing = new Set();
    const fabricated = new Set();
    const fabricator = {
        isFabricated: (id) => fabricated.has(id),
        isPrinting: (id) => printing.has(id),
        getPrintProgress: () => 0.5,
        getEffectiveCost: (r) => r.cost ?? { tech: 1 },
        canFabricate: () => true,
        startPrint: vi.fn((id) => { printing.add(id); return true; }),
        tickPrints: vi.fn(() => { for (const id of printing) { printing.delete(id); fabricated.add(id); } }),
        canRoll: () => canRoll,
        getObjectiveState: () => ({ siteUsesRemaining: 3, chance: 0.5, complete: false, targetRecipe: FAB_RECIPES[0] }),
        getFabricatedCount: () => fabricated.size,
        rollFabrication: vi.fn(() => ({ rarity: 'RARE', recipe: FAB_RECIPES[0], duplicate: false, objectiveHit: false, broken: false }))
    };
    const bank = { tech: 50, coin: 50, med: 50, shells: 3 };
    const bankManager = {
        getState: () => bank,
        canAfford: () => true,
        isFoundryActivated: () => activated,
        canActivateFoundry: () => true,
        activateFoundry: vi.fn(() => { activated = true; return true; })
    };
    const loadout = {
        activeClassId: 'scout',
        getEquippedId: () => null,
        getClassLoadout: () => ({ archetypeId: 'talon', charmId: null, mod1Id: null, mod2Id: null }),
        equip: vi.fn()
    };
    const deps = {
        doc,
        t: (key) => key,
        fabricator,
        bankManager,
        loadout,
        getGame: () => ({ finishCampRest: finishCampRest, revealFoundry: vi.fn() }),
        playSound: vi.fn(),
        log: vi.fn(),
        focus: vi.fn(),
        getPreferredFocus: () => null,
        updateMenuStatuses: vi.fn(),
        syncEquippedWeaponLabel: vi.fn(),
        syncOutputOwnership: vi.fn(),
        showPrompt: vi.fn(),
        onFoundryActivated: vi.fn(),
        isHubEnabled: () => hub,
        openHub: vi.fn(),
        requestFrame: (fn) => fn(),
        getComputedStyle: () => ({ gap: '0', paddingLeft: '0' }),
        eventTarget: new FakeElement('window')
    };
    const finishCampRest = vi.fn();
    const bay = createFabricationBay(deps);
    return { bay, els, deps, fabricator, bankManager, printing, finishCampRest };
}

afterEach(() => vi.useRealTimers());

describe('fabrication cost text', () => {
    it('formats costs, have/need, missing resources and chips', () => {
        expect(fabCostText({ tech: 12, coin: 6 }, { tech: 3, coin: 9 })).toBe('12 TECH / 6 COIN');
        expect(fabCostText({ tech: 12, coin: 6 }, { tech: 3, coin: 9 }, { showHaveNeed: true })).toBe('TECH 3/12 / COIN 9/6');
        expect(fabCostText({}, {})).toBe('NO COST');
        expect(fabMissingResourceText({ tech: 12, coin: 6 }, { tech: 3, coin: 9 })).toBe('NEED 9 TECH');
        expect(fabMissingResourceText({ tech: 1 }, { tech: 5 })).toBe('');
        expect(fabCostMarkup({ tech: 2, med: 1 })).toContain('fab-cost-chip');
    });
});

describe('fabrication bay', () => {
    it('shows the Foundry activation panel and hides the roll until the bay is online', () => {
        const { bay, els } = setup({ activated: false });
        bay.render();
        expect(els.get('fab-roll-panel').classList.contains('hidden')).toBe(true);
        const grid = els.get('fab-recipe-grid');
        expect(grid.children.some((c) => c.children.some((b) => b.id === 'fab-activate-btn'))).toBe(true);
        expect(els.get('fab-summary').textContent).toContain('FOUNDRY ACTIVATION');
    });

    it('activating the Foundry re-renders into the online bay and tells the menu', () => {
        const { bay, els, deps, bankManager } = setup({ activated: false });
        bay.render();
        const button = els.get('fab-recipe-grid').children.flatMap((c) => c.children).find((b) => b.id === 'fab-activate-btn');
        button.click();
        expect(bankManager.activateFoundry).toHaveBeenCalled();
        expect(deps.onFoundryActivated).toHaveBeenCalled();
        expect(els.get('fab-roll-panel').classList.contains('hidden')).toBe(false);
    });

    it('lists one card per recipe with the odds shown before spending once online', () => {
        const { bay, els } = setup();
        bay.render();
        expect(els.get('fab-recipe-grid').children.filter((c) => c.className.includes('fab-card'))).toHaveLength(FAB_RECIPES.length);
        expect(els.get('fab-odds').innerHTML).toContain('ui.fab.odds');
        expect(els.get('fab-bank-tech').textContent).toBe(50);
    });

    it('ticks prints every half second and stops the ticker when nothing is printing', () => {
        const { bay, fabricator, printing } = setup();
        printing.add(FAB_RECIPES[0].id);
        bay.startTicker();
        vi.advanceTimersByTime(500);
        expect(fabricator.tickPrints).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(2000);
        expect(fabricator.tickPrints).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('opens through the Foundry hub when the hub is on', () => {
        const { bay, deps, els } = setup({ hub: true });
        bay.open();
        expect(deps.openHub).toHaveBeenCalledWith('fabricate');
        expect(els.get('fabrication-modal').classList.contains('hidden')).toBe(true);
    });

    it('closing the bay ends an open camp rest exactly once', () => {
        const { bay, els, finishCampRest } = setup();
        bay.beginCampRest();
        bay.open();
        expect(els.get('fabrication-modal').classList.contains('hidden')).toBe(false);
        bay.close();
        bay.close();
        expect(els.get('fabrication-modal').classList.contains('hidden')).toBe(true);
        expect(finishCampRest).toHaveBeenCalledTimes(1);
    });

    it('reveals a roll after the spin and blocks a second roll meanwhile', () => {
        const { bay, fabricator, els } = setup();
        bay.render();
        bay.roll();
        bay.roll();
        expect(fabricator.rollFabrication).toHaveBeenCalledTimes(1);
        expect(bay.isRolling()).toBe(true);
        expect(els.get('fab-reveal').dataset.state).toBe('spinning');
        vi.advanceTimersByTime(3300);
        expect(bay.isRolling()).toBe(false);
        expect(els.get('fab-reveal').dataset.state).toBe('revealed');
    });

    // S49-38: the bay owns its listeners and timers and releases them.
    it('wires the roll button and fabrication logs on attach and releases everything on dispose', () => {
        const { bay, els, fabricator, deps, printing } = setup();
        bay.attach();
        els.get('fab-roll-btn').click();
        expect(fabricator.rollFabrication).toHaveBeenCalledTimes(1);
        deps.eventTarget.listeners['fabrication-started'][0]({ detail: { recipe: FAB_RECIPES[0] } });
        expect(deps.log).toHaveBeenCalledWith('print-started', expect.objectContaining({ recipeId: FAB_RECIPES[0].id }));
        printing.add(FAB_RECIPES[1].id);
        bay.startTicker();
        bay.dispose();
        expect(vi.getTimerCount()).toBe(0);
        expect(els.get('fab-roll-btn').listeners.click).toHaveLength(0);
        expect(deps.eventTarget.listeners['fabrication-started']).toHaveLength(0);
    });
});
