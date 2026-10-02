import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    checkRecipeAffordability,
    createFieldWorkbenchUi,
    FIELD_WORKBENCH_RECIPES
} from './fieldWorkbenchUi.js';

class MockElement {
    constructor(tagName, id = '') {
        this.tagName = (tagName || 'DIV').toUpperCase();
        this.id = id;
        this.className = '';
        this.attributes = new Map();
        this.listeners = new Map();
        this.children = [];
        this.parentElement = null;
        this.innerHTML = '';
        this.textContent = '';
        this.disabled = false;
        this.type = 'button';
    }

    get classList() {
        return {
            contains: (c) => this.className.split(/\s+/).filter(Boolean).includes(c),
            add: (c) => {
                if (!this.classList.contains(c)) {
                    this.className = (this.className + ' ' + c).trim();
                }
            },
            remove: (c) => {
                this.className = this.className.split(/\s+/).filter((cls) => cls && cls !== c).join(' ');
            }
        };
    }

    setAttribute(k, v) {
        this.attributes.set(k, String(v));
        if (k === 'id') this.id = String(v);
    }

    getAttribute(k) {
        return this.attributes.get(k) ?? null;
    }

    addEventListener(event, fn) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(fn);
    }

    removeEventListener(event, fn) {
        const list = this.listeners.get(event);
        if (list) {
            const idx = list.indexOf(fn);
            if (idx >= 0) list.splice(idx, 1);
        }
    }

    dispatchEvent(evt) {
        evt.target = evt.target || this;
        const list = this.listeners.get(evt.type) || [];
        for (const fn of list) fn(evt);
        return !evt.defaultPrevented;
    }

    click() {
        if (this.disabled) return;
        this.dispatchEvent({
            type: 'click',
            target: this,
            preventDefault() {},
            stopPropagation() {}
        });
    }

    focus() {
        if (this.ownerDocument) {
            this.ownerDocument.activeElement = this;
        }
    }

    appendChild(child) {
        this.children.push(child);
        child.parentElement = this;
        child.ownerDocument = this.ownerDocument;
        return child;
    }

    querySelector(selector) {
        for (const child of this.children) {
            if (selector.startsWith('.') && child.classList.contains(selector.slice(1))) {
                return child;
            }
            if (selector.startsWith('#') && child.id === selector.slice(1)) {
                return child;
            }
            const found = child.querySelector?.(selector);
            if (found) return found;
        }
        return null;
    }
}

class MockDocument {
    constructor() {
        this.elements = new Map();
        this.activeElement = null;
    }

    createElement(tagName) {
        const el = new MockElement(tagName);
        el.ownerDocument = this;
        return el;
    }

    getElementById(id) {
        return this.elements.get(id) || null;
    }

    register(id, el) {
        el.id = id;
        el.ownerDocument = this;
        this.elements.set(id, el);
        return el;
    }
}

describe('Field Workbench UI & Affordability (S49-13)', () => {
    describe('checkRecipeAffordability', () => {
        it('identifies when player has sufficient resources for all standard recipes', () => {
            const bankState = { tech: 50, med: 50, coin: 100, shells: 5 };
            for (const recipe of FIELD_WORKBENCH_RECIPES) {
                const result = checkRecipeAffordability(recipe, bankState);
                expect(result.affordable).toBe(true);
                expect(result.missing).toHaveLength(0);
            }
        });

        it('detects missing tech/scrap for ammo pack recipe', () => {
            const bankState = { tech: 5, med: 30 };
            const ammoRecipe = FIELD_WORKBENCH_RECIPES.find((r) => r.id === 'ammo_pack');
            const result = checkRecipeAffordability(ammoRecipe, bankState);
            expect(result.affordable).toBe(false);
            expect(result.missing).toEqual([
                { resource: 'tech', need: 15, have: 5 }
            ]);
        });

        it('detects missing med for emergency bio-suture', () => {
            const bankState = { tech: 100, med: 10 };
            const medRecipe = FIELD_WORKBENCH_RECIPES.find((r) => r.id === 'med_patch');
            const result = checkRecipeAffordability(medRecipe, bankState);
            expect(result.affordable).toBe(false);
            expect(result.missing).toEqual([
                { resource: 'med', need: 20, have: 10 }
            ]);
        });

        it('detects missing tech for suit armor plating', () => {
            const bankState = { tech: 20, med: 50 };
            const armorRecipe = FIELD_WORKBENCH_RECIPES.find((r) => r.id === 'suit_armor_plate');
            const result = checkRecipeAffordability(armorRecipe, bankState);
            expect(result.affordable).toBe(false);
            expect(result.missing).toContainEqual(
                expect.objectContaining({ resource: 'tech', need: 25, have: 20 })
            );
        });

        it('supports legacy mock bank with scrap alias', () => {
            const bankState = { scrap: 30, med: 25 };
            const ammoRecipe = FIELD_WORKBENCH_RECIPES.find((r) => r.id === 'ammo_pack');
            const result = checkRecipeAffordability(ammoRecipe, bankState);
            expect(result.affordable).toBe(true);
        });
    });

    describe('createFieldWorkbenchUi Controller', () => {
        let mockDoc;
        let modalEl;
        let titleEl;
        let kickerEl;
        let statsStripEl;
        let recipesGridEl;
        let closeBtn;
        let footerCloseBtn;
        let mockGame;
        let windowListeners;

        beforeEach(() => {
            windowListeners = new Map();
            vi.stubGlobal('window', {
                addEventListener: (event, fn) => {
                    if (!windowListeners.has(event)) windowListeners.set(event, []);
                    windowListeners.get(event).push(fn);
                },
                removeEventListener: (event, fn) => {
                    const list = windowListeners.get(event);
                    if (list) {
                        const idx = list.indexOf(fn);
                        if (idx >= 0) list.splice(idx, 1);
                    }
                },
                dispatchEvent: (evt) => {
                    const list = windowListeners.get(evt.type) || [];
                    for (const fn of list) fn(evt);
                }
            });

            mockDoc = new MockDocument();
            modalEl = mockDoc.register('field-workbench-modal', new MockElement('div', 'field-workbench-modal'));
            modalEl.classList.add('hidden');
            modalEl.setAttribute('aria-hidden', 'true');

            titleEl = mockDoc.register('field-workbench-title', new MockElement('h2', 'field-workbench-title'));
            kickerEl = mockDoc.register('field-workbench-kicker', new MockElement('div', 'field-workbench-kicker'));
            statsStripEl = mockDoc.register('field-workbench-stats-strip', new MockElement('div', 'field-workbench-stats-strip'));
            recipesGridEl = mockDoc.register('field-workbench-recipes-grid', new MockElement('div', 'field-workbench-recipes-grid'));
            closeBtn = mockDoc.register('close-field-workbench', new MockElement('button', 'close-field-workbench'));
            footerCloseBtn = mockDoc.register('field-workbench-footer-close', new MockElement('button', 'field-workbench-footer-close'));

            modalEl.appendChild(closeBtn);
            modalEl.appendChild(kickerEl);
            modalEl.appendChild(titleEl);
            modalEl.appendChild(statsStripEl);
            modalEl.appendChild(recipesGridEl);
            modalEl.appendChild(footerCloseBtn);

            mockGame = {
                currentClip: 12,
                maxClip: 24,
                totalAmmo: 48,
                playerHp: 80,
                playerMaxHp: 100,
                playerShieldHp: 15,
                playerShieldMax: 50,
                bank: {
                    state: { tech: 40, med: 25, coin: 88, shells: 3 },
                    getState() { return this.state; },
                    spend(costs) {
                        for (const [k, v] of Object.entries(costs)) {
                            this.state[k] = (this.state[k] || 0) - v;
                        }
                        return true;
                    }
                },
                setInputEnabled: vi.fn(),
                craftFieldRecipe: vi.fn((recipeId) => {
                    if (recipeId === 'ammo_pack') {
                        mockGame.bank.spend({ tech: 15 });
                        mockGame.currentClip = 24;
                        mockGame.totalAmmo = 78;
                        return true;
                    }
                    if (recipeId === 'med_patch') {
                        mockGame.bank.spend({ med: 20 });
                        mockGame.playerHp = 100;
                        return true;
                    }
                    return false;
                })
            };
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        it('returns null when document is undefined', () => {
            const ui = createFieldWorkbenchUi({ document: null });
            expect(ui).toBeNull();
        });

        it('opens modal on open() call, disables game input, and updates title/kicker', () => {
            const ui = createFieldWorkbenchUi({
                document: mockDoc,
                getGame: () => mockGame
            });

            ui.open({ campId: 'camp_haven', campLabel: 'Haven Depot' });

            expect(ui.isOpen()).toBe(true);
            expect(modalEl.classList.contains('hidden')).toBe(false);
            expect(modalEl.getAttribute('aria-hidden')).toBe('false');
            expect(titleEl.textContent).toContain('Haven Depot');
            expect(kickerEl.textContent).toContain('CAMP_HAVEN');
            expect(mockGame.setInputEnabled).toHaveBeenCalledWith(false);
            expect(statsStripEl.innerHTML).toContain('40'); // tech
            expect(statsStripEl.innerHTML).toContain('25'); // med
            expect(recipesGridEl.children.length).toBe(3);
        });

        it('responds to window "open-field-workbench" custom event', () => {
            const ui = createFieldWorkbenchUi({
                document: mockDoc,
                getGame: () => mockGame
            });

            window.dispatchEvent({
                type: 'open-field-workbench',
                detail: { campId: 'camp_ironclad', campLabel: 'Ironclad Outpost' }
            });

            expect(ui.isOpen()).toBe(true);
            expect(titleEl.textContent).toContain('Ironclad Outpost');
        });

        it('closes modal on close button click and re-enables game input', () => {
            const ui = createFieldWorkbenchUi({
                document: mockDoc,
                getGame: () => mockGame
            });

            ui.open({ campId: 'camp_haven', campLabel: 'Haven Depot' });
            expect(ui.isOpen()).toBe(true);

            closeBtn.click();

            expect(ui.isOpen()).toBe(false);
            expect(modalEl.classList.contains('hidden')).toBe(true);
            expect(modalEl.getAttribute('aria-hidden')).toBe('true');
            expect(mockGame.setInputEnabled).toHaveBeenCalledWith(true);
        });

        it('closes modal on footer close button click', () => {
            const ui = createFieldWorkbenchUi({
                document: mockDoc,
                getGame: () => mockGame
            });

            ui.open();
            expect(ui.isOpen()).toBe(true);

            footerCloseBtn.click();
            expect(ui.isOpen()).toBe(false);
        });

        it('closes modal on Escape keydown', () => {
            const ui = createFieldWorkbenchUi({
                document: mockDoc,
                getGame: () => mockGame
            });

            ui.open();
            expect(ui.isOpen()).toBe(true);

            const preventDefault = vi.fn();
            const stopPropagation = vi.fn();
            const escEvent = {
                type: 'keydown',
                key: 'Escape',
                preventDefault,
                stopPropagation
            };

            const keydownListeners = windowListeners.get('keydown') || [];
            for (const fn of keydownListeners) fn(escEvent);

            expect(ui.isOpen()).toBe(false);
            expect(preventDefault).toHaveBeenCalled();
            expect(stopPropagation).toHaveBeenCalled();
        });

        it('executes crafting when affordable recipe button is clicked', () => {
            const ui = createFieldWorkbenchUi({
                document: mockDoc,
                getGame: () => mockGame
            });

            ui.open();

            // Find ammo craft button (first recipe card)
            const ammoCard = recipesGridEl.children[0];
            const craftBtn = ammoCard.querySelector('.field-workbench-craft-btn');
            expect(craftBtn).not.toBeNull();
            expect(craftBtn.disabled).toBe(false);

            craftBtn.click();

            expect(mockGame.craftFieldRecipe).toHaveBeenCalledWith('ammo_pack');
            // Check that bank was debited and stats refreshed
            expect(mockGame.bank.state.tech).toBe(25);
            expect(statsStripEl.innerHTML).toContain('25'); // updated tech
        });

        it('disables craft button when resources are insufficient', () => {
            mockGame.bank.state = { tech: 0, med: 0, coin: 0, shells: 0 };
            const ui = createFieldWorkbenchUi({
                document: mockDoc,
                getGame: () => mockGame
            });

            ui.open();

            for (const card of recipesGridEl.children) {
                const btn = card.querySelector('.field-workbench-craft-btn');
                expect(btn.disabled).toBe(true);
            }
        });

        it('cleans up window listeners on destroy()', () => {
            const ui = createFieldWorkbenchUi({
                document: mockDoc,
                getGame: () => mockGame
            });

            expect(windowListeners.get('open-field-workbench')?.length).toBe(1);
            expect(windowListeners.get('keydown')?.length).toBe(1);

            ui.destroy();

            expect(windowListeners.get('open-field-workbench')?.length).toBe(0);
            expect(windowListeners.get('keydown')?.length).toBe(0);
        });
    });
});
