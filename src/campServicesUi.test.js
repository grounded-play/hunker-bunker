import { describe, expect, it, vi } from 'vitest';
import { createCampServicesUi } from './campServicesUi.js';

// A minimal DOM, as in fieldWorkbenchUi.test.js (the repo runs tests in node).
class El {
    constructor(id = '') {
        this.id = id;
        this.classes = new Set();
        this.attributes = {};
        this.children = [];
        this.listeners = {};
        this.dataset = {};
        this._text = '';
        this.classList = {
            add: (c) => this.classes.add(c),
            remove: (c) => this.classes.delete(c),
            contains: (c) => this.classes.has(c)
        };
    }
    set className(value) { this.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
    get textContent() { return this._text || this.children.map((child) => child.textContent).join(''); }
    set textContent(value) { this._text = String(value); this.children = []; }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    append(child) { this.children.push(child); }
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
    dispatch(type, event = {}) { for (const fn of this.listeners[type] ?? []) fn(event); }
    click() { this.dispatch('click'); }
    focus() {}
    querySelector() { return this.children[0] ?? null; }
}

function mount() {
    const els = Object.fromEntries(['camp-services-modal', 'camp-services-title', 'camp-services-list', 'close-camp-services']
        .map((id) => [id, new El(id)]));
    els['camp-services-modal'].classList.add('hidden');
    const doc = Object.assign(new El('document'), {
        getElementById: (id) => els[id] ?? null,
        createElement: () => new El()
    });
    const target = new El('window');
    const game = { setInputEnabled: vi.fn(), performCampService: vi.fn() };
    const ui = createCampServicesUi({ document: doc, getGame: () => game, target });
    return { ui, game, doc, target, modal: els['camp-services-modal'], list: els['camp-services-list'] };
}

describe('CAMP SERVICES menu', () => {
    it('lists the services, blocks gameplay input, and hands a pick back to the game', () => {
        const { game, target, modal, list } = mount();
        target.dispatch('camp-services-open', { detail: {
            campLabel: 'CAMP MERIDIAN',
            actions: [{ index: 0, action: 'support', label: 'SUPPORT CAMP — 5 SHELLS' }, { index: 1, action: 'rest', label: 'SLEEP UNTIL DAY 4' }]
        } });
        expect(modal.classList.contains('hidden')).toBe(false);
        expect(game.setInputEnabled).toHaveBeenLastCalledWith(false);
        expect(list.children.map((button) => button.textContent)).toEqual(['SUPPORT CAMP — 5 SHELLS', 'SLEEP UNTIL DAY 4']);
        list.children[1].click();
        expect(modal.classList.contains('hidden')).toBe(true);
        expect(game.setInputEnabled).toHaveBeenLastCalledWith(true);
        expect(game.performCampService).toHaveBeenCalledWith(1);
    });

    it('closes on Escape without running anything', () => {
        const { game, doc, modal, ui } = mount();
        ui.open({ campLabel: 'X', actions: [{ index: 0, action: 'rest', label: 'SLEEP' }] });
        doc.dispatch('keydown', { key: 'Escape', preventDefault: () => {} });
        expect(modal.classList.contains('hidden')).toBe(true);
        expect(game.performCampService).not.toHaveBeenCalled();
    });
});
