import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createArmoryUi, CATALOG_ITEMS } from './armoryUi.js';
import { LoadoutManager } from './loadout.js';

function createMockElement(tagName = 'div') {
    let _innerHTML = '';
    const listeners = {};
    let children = {};
    let classTabs = [];
    const element = {
        tagName: tagName.toUpperCase(),
        dataset: {},
        get innerHTML() { return _innerHTML; },
        set innerHTML(val) {
            _innerHTML = val;
            children = {};
            classTabs = [];

            for (const match of String(val).matchAll(/id="([^"]+)"/g)) {
                const child = createMockElement('div');
                child.id = match[1];
                children[match[1]] = child;
            }

            for (const match of String(val).matchAll(/class="[^"]*\bclass-tab\b[^"]*" data-class="([^"]+)"/g)) {
                const child = createMockElement('button');
                child.dataset.class = match[1];
                classTabs.push(child);
            }
        },
        textContent: '',
        value: '',
        classList: {
            classes: new Set(),
            add: (c) => element.classList.classes.add(c),
            remove: (c) => element.classList.classes.delete(c),
            contains: (c) => element.classList.classes.has(c)
        },
        addEventListener: (event, handler) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(handler);
        },
        dispatchEvent: (event) => {
            const handlers = [...(listeners[event.type || event] || [])];
            for (const h of handlers) h({ target: event.target || element, ...event });
        },
        click: () => {
            element.dispatchEvent({ type: 'click' });
        },
        querySelector: (sel) => {
            if (sel.startsWith('#')) {
                const id = sel.slice(1);
                return children[id] || null;
            }
            if (sel.startsWith('.')) {
                const child = createMockElement('div');
                child.textContent = 'SCOUT';
                return child;
            }
            return null;
        },
        querySelectorAll: (sel) => {
            if (sel === '.class-tab') return classTabs;
            return [];
        }
    };
    return element;
}

function makeStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k)
    };
}

describe('createArmoryUi', () => {
    let container;
    let storage;
    let loadoutManager;
    let fakeScene;
    let onEmbark;
    let onBack;
    let onOpenVault;

    beforeEach(() => {
        container = createMockElement('div');
        storage = makeStorage();
        loadoutManager = new LoadoutManager({ storage });
        fakeScene = {
            setClass: vi.fn(),
            setWeapon: vi.fn(),
            setCharm: vi.fn(),
            setRigModule: vi.fn(),
            updateFromLoadout: vi.fn(),
            resize: vi.fn()
        };
        onEmbark = vi.fn();
        onBack = vi.fn();
        onOpenVault = vi.fn();
    });

    it('throws when container is missing', () => {
        expect(() => createArmoryUi({ container: null, loadoutManager })).toThrow(/requires a container/);
    });

    it('renders the Armory HUD workbench structure and active operator', () => {
        const ui = createArmoryUi({
            container,
            loadoutManager,
            armoryScene: fakeScene,
            onEmbark,
            onBack,
            onOpenVault
        });

        ui.setClass('SCOUT');
        expect(container.innerHTML).toContain('SECTOR ZERO TACTICAL BENCH');
        expect(container.innerHTML).toContain('class="class-tab active" data-class="scout"');
        expect(container.innerHTML).toContain('id="armory-archetype-select"');
        expect(container.innerHTML).toContain('id="armory-charm-select"');
        expect(container.innerHTML).toContain('id="armory-mod1-select"');
        expect(container.innerHTML).toContain('id="armory-mod2-select"');
    });

    it('updates loadout and triggers scene updates when selecting equipment', () => {
        const ui = createArmoryUi({
            container,
            loadoutManager,
            armoryScene: fakeScene,
            onEmbark,
            onBack,
            onOpenVault
        });

        ui.setClass('SCOUT');

        const charmSelect = container.querySelector('#armory-charm-select');
        charmSelect.value = '4130';
        charmSelect.dispatchEvent({ type: 'change', target: { value: '4130' } });

        expect(loadoutManager.getEquippedCharmId('scout')).toBe('4130');
        expect(fakeScene.updateFromLoadout).toHaveBeenCalledWith(loadoutManager, 'scout');

        const mod1Select = container.querySelector('#armory-mod1-select');
        mod1Select.value = '4141';
        mod1Select.dispatchEvent({ type: 'change', target: { value: '4141' } });

        expect(loadoutManager.getEquippedRigModule(1, 'scout')).toBe('4141');
        const modifiers = loadoutManager.getActiveModifiers('scout');
        expect(modifiers.scrapMagnetRadiusBonus).toBeCloseTo(0.20);
    });

    it('handles navigation button clicks', () => {
        const ui = createArmoryUi({
            container,
            loadoutManager,
            armoryScene: fakeScene,
            onEmbark,
            onBack,
            onOpenVault
        });

        ui.setClass('TANK');

        const btnBack = container.querySelector('#armory-btn-back');
        const btnVault = container.querySelector('#armory-btn-vault');
        const btnEmbark = container.querySelector('#armory-btn-embark');

        btnBack.click();
        expect(onBack).toHaveBeenCalled();

        btnVault.click();
        expect(onOpenVault).toHaveBeenCalled();

        btnEmbark.click();
        expect(onEmbark).toHaveBeenCalled();
    });

    it('switches classes properly and re-renders allowed equipment', () => {
        const ui = createArmoryUi({
            container,
            loadoutManager,
            armoryScene: fakeScene,
            onEmbark,
            onBack,
            onOpenVault
        });

        ui.setClass('ENGINEER');
        expect(container.innerHTML).toContain('ENGINEER');
        // armoryUi.js's setClass() normalizes to lowercase before forwarding (matching
        // LoadoutManager's normalizeClassId convention used everywhere else in this codebase);
        // armoryScene.js's real setClass() then normalizes to uppercase internally regardless
        // of input case, so this is a case-convention detail, not a functional bug.
        expect(fakeScene.setClass).toHaveBeenCalledWith('engineer');

        const tankTab = container.querySelectorAll('.class-tab')
            .find((tab) => tab.dataset.class === 'tank');
        tankTab.click();
        expect(fakeScene.setClass).toHaveBeenLastCalledWith('tank');
        expect(container.innerHTML).toContain('class="class-tab active" data-class="tank"');
    });

    it('exports complete catalog metadata', () => {
        expect(CATALOG_ITEMS['4130'].name).toBe('Mini Cryo-Core');
        expect(CATALOG_ITEMS['4140'].perk).toBe('+8% Cryo Freeze Duration');
        expect(CATALOG_ITEMS['4147'].perk).toBe('5 Kills Refunds Dash Charge');
    });
});
