import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createArmoryUi, CATALOG_ITEMS } from './armoryUi.js';
import { LoadoutManager } from './loadout.js';
import { createOwnershipStore } from './itemOwnership.js';

// The Armory now gates equipping on ownership
// (docs/armory-vault-progression-audit-2026-08-23.md A1/A2), so every
// construction needs a store. These specs are about layout and class
// switching, so they own everything unless a test says otherwise.
function ownAll() {
    const store = createOwnershipStore({ storage: null });
    store.setUnlockAll(true);
    return store;
}

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
    let onOpenSettings;

    beforeEach(() => {
        container = createMockElement('div');
        storage = makeStorage();
        loadoutManager = new LoadoutManager({ storage });
        fakeScene = {
            setClass: vi.fn(),
            setWeapon: vi.fn(),
            setChassisSkin: vi.fn(),
            setCharm: vi.fn(),
            setRigModule: vi.fn(),
            updateFromLoadout: vi.fn(),
            resize: vi.fn()
        };
        onEmbark = vi.fn();
        onBack = vi.fn();
        onOpenVault = vi.fn();
        onOpenSettings = vi.fn();
    });

    it('throws when container is missing', () => {
        expect(() => createArmoryUi({ container: null, loadoutManager, ownership: ownAll() })).toThrow(/requires a container/);
    });

    it('renders the Armory HUD workbench structure and active operator', () => {
        const ui = createArmoryUi({
            container,
            loadoutManager,
            armoryScene: fakeScene,
            onEmbark,
            onBack,
            onOpenVault,
            onOpenSettings,
            ownership: ownAll()
        });

        ui.setClass('SCOUT');
        expect(container.innerHTML).toContain('SECTOR ZERO TACTICAL BENCH');
        expect(container.innerHTML).toContain('class="class-tab active" data-class="scout"');
        expect(container.innerHTML).toContain('id="armory-settings-btn"');
        expect(container.innerHTML).toContain('id="armory-archetype-select"');
        expect(container.innerHTML).toContain('id="armory-chassis-select"');
        expect(container.innerHTML).toContain('WEAPON SHEEN / TACTICAL FINISH');
        expect(container.innerHTML).toContain('id="armory-polish-btn"');
        expect(container.innerHTML).toContain('Cryo-Vanguard Scout');
        expect(container.innerHTML).toContain('id="armory-charm-select"');
        expect(container.innerHTML).toContain('id="armory-mod1-select"');
        expect(container.innerHTML).toContain('id="armory-mod2-select"');

        const settingsBtn = container.querySelector('#armory-settings-btn');
        settingsBtn.click();
        expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('updates loadout and triggers scene updates when selecting equipment', () => {
        const ui = createArmoryUi({
            container,
            loadoutManager,
            armoryScene: fakeScene,
            onEmbark,
            onBack,
            onOpenVault,
            ownership: ownAll()
        });

        ui.setClass('SCOUT');

        const charmSelect = container.querySelector('#armory-charm-select');
        charmSelect.value = '4130';
        charmSelect.dispatchEvent({ type: 'change', target: { value: '4130' } });

        expect(loadoutManager.getEquippedCharmId('scout')).toBe('4130');
        expect(fakeScene.updateFromLoadout).toHaveBeenCalledWith(loadoutManager, 'scout');

        const chassisSelect = container.querySelector('#armory-chassis-select');
        chassisSelect.dispatchEvent({ type: 'change', target: { value: '4113' } });

        expect(loadoutManager.getEquippedChassisSkinId()).toBe('4113');
        expect(fakeScene.setChassisSkin).toHaveBeenCalledWith('4113', 'scout');

        const mod1Select = container.querySelector('#armory-mod1-select');
        mod1Select.value = '4141';
        mod1Select.dispatchEvent({ type: 'change', target: { value: '4141' } });

        expect(loadoutManager.getEquippedRigModule(1, 'scout')).toBe('4141');
        const modifiers = loadoutManager.getActiveModifiers('scout');
        expect(modifiers.scrapMagnetRadiusBonus).toBeCloseTo(0.20);

        const skinSelect = container.querySelector('#armory-skin-select');
        skinSelect.dispatchEvent({ type: 'change', target: { value: '4100' } });
        expect(loadoutManager.getClassLoadout('scout').weaponSkinId).toBe('4100');
        expect(fakeScene.updateFromLoadout).toHaveBeenCalledWith(loadoutManager, 'scout');
    });

    it('handles navigation button clicks', () => {
        const ui = createArmoryUi({
            container,
            loadoutManager,
            armoryScene: fakeScene,
            onEmbark,
            onBack,
            onOpenVault,
            ownership: ownAll()
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
            onOpenVault,
            ownership: ownAll()
        });

        ui.setClass('ENGINEER');
        expect(container.innerHTML).toContain('ENGINEER');
        // armoryUi.js's setClass() normalizes to lowercase before forwarding (matching
        // LoadoutManager's normalizeClassId convention used everywhere else in this codebase);
        // armoryScene.js's real setClass() then normalizes to uppercase internally regardless
        // of input case, so this is a case-convention detail, not a functional bug.
        expect(fakeScene.setClass).toHaveBeenCalledWith('engineer', null);
        expect(container.innerHTML).toContain('Sub-Terran Drill Engineer');
        expect(container.innerHTML).not.toContain('Cryo-Vanguard Scout');

        const tankTab = container.querySelectorAll('.class-tab')
            .find((tab) => tab.dataset.class === 'tank');
        tankTab.click();
        expect(fakeScene.setClass).toHaveBeenLastCalledWith('tank', null);
        expect(container.innerHTML).toContain('Trench Warden Heavy');
        expect(container.innerHTML).not.toContain('Sub-Terran Drill Engineer');
        expect(container.innerHTML).toContain('class="class-tab active" data-class="tank"');
    });

    it('exports complete catalog metadata', () => {
        expect(CATALOG_ITEMS['4130'].name).toBe('Mini Cryo-Core');
        expect(CATALOG_ITEMS['4140'].perk).toBe('+8% Cryo Freeze Duration');
        expect(CATALOG_ITEMS['4147'].perk).toBe('5 Kills Refunds Dash Charge');
    });
});

// docs/armory-vault-progression-audit-2026-08-23.md, requirements A1/A2/A4.
// Before this, src/armoryUi.js rendered every dropdown from static allow-lists
// (insignia was a literal ['4120'...'4129'] inline) and consulted no inventory,
// so anything listed was equippable.
describe('createArmoryUi ownership gating', () => {
    let container;
    let loadoutManager;
    let fakeScene;
    let ownership;

    function mount() {
        const ui = createArmoryUi({
            container,
            loadoutManager,
            armoryScene: fakeScene,
            onEmbark: vi.fn(),
            onBack: vi.fn(),
            onOpenVault: vi.fn(),
            ownership
        });
        // The factory wires listeners; setClass is what paints the bench.
        ui.setClass('SCOUT');
        return ui;
    }

    beforeEach(() => {
        container = createMockElement('div');
        loadoutManager = new LoadoutManager({ storage: makeStorage() });
        fakeScene = {
            setClass: vi.fn(),
            setWeapon: vi.fn(),
            setChassisSkin: vi.fn(),
            updateFromLoadout: vi.fn(),
            dispose: vi.fn()
        };
        ownership = createOwnershipStore({ storage: null });
    });

    it('requires an ownership store', () => {
        expect(() => createArmoryUi({ container, loadoutManager }))
            .toThrow(/requires an ownership store/);
    });

    it('renders unowned items as disabled and labelled, not hidden', () => {
        mount();
        const html = container.innerHTML;
        // Cryo-Vanguard Scout (4113) is a scout chassis skin nobody owns here.
        expect(html).toContain('value="4113"');
        expect(html).toMatch(/value="4113"[^>]*disabled/);
        expect(html).toContain('LOCKED');
    });

    it('still offers community chassis skins, which live outside the Steam catalog', () => {
        mount();
        // All 30 comm_* skins ship unlocked, so they must render enabled --
        // a catalog-only lookup would have dropped them from the list entirely.
        expect(container.innerHTML).toContain('comm_scout_foxhole_shadow');
        expect(container.innerHTML).not.toMatch(/value="comm_scout_foxhole_shadow"[^>]*disabled/);
    });

    it('names achievement reward chassis instead of showing a bare id', () => {
        mount();
        expect(container.innerHTML).toContain('value="5001"');
        expect(container.innerHTML).toMatch(/GHOST/i);
    });

    it('renders an owned item enabled and without a locked label', () => {
        ownership.grantDev(4113, 1);
        mount();
        const html = container.innerHTML;
        const tag = html.match(/<option value="4113"[^>]*>/)[0];
        expect(tag).not.toContain('disabled');
        expect(tag).toContain('data-owned="true"');
    });

    it('lists catalog items the old hardcoded arrays omitted', () => {
        ownership.setUnlockAll(true);
        mount();
        // Charms stopped at 4137, so 4138/4139 could never be selected.
        expect(container.innerHTML).toContain('value="4138"');
        expect(container.innerHTML).toContain('value="4139"');
    });

    it('refuses to equip a locked item even if the change event fires anyway', () => {
        mount();
        const select = container.querySelector('#armory-charm-select');
        select.value = '4130';
        select.dispatchEvent({ type: 'change', target: { value: '4130' } });
        expect(loadoutManager.getClassLoadout('scout').charmId).toBeFalsy();
    });

    it('equips a locked item once it is granted', () => {
        mount();
        ownership.grantDev(4130, 1);
        const select = container.querySelector('#armory-charm-select');
        select.dispatchEvent({ type: 'change', target: { value: '4130' } });
        expect(String(loadoutManager.getClassLoadout('scout').charmId)).toBe('4130');
    });

    it('re-renders when a grant lands while the Armory is open', () => {
        mount();
        // 4113 Cryo-Vanguard Scout — a scout-class chassis, so it is actually
        // offered on this bench (4114 is tank-only).
        expect(container.innerHTML).toMatch(/value="4113"[^>]*disabled/);
        ownership.grantDev(4113, 1);
        expect(container.innerHTML).not.toMatch(/value="4113"[^>]*disabled/);
    });

    it('stops re-rendering after destroy', () => {
        const ui = mount();
        ui.destroy();
        const before = container.innerHTML;
        ownership.grantDev(4113, 1);
        expect(container.innerHTML).toBe(before);
    });

    it('enables everything under the dev UNLOCK ALL flag', () => {
        ownership.setUnlockAll(true);
        mount();
        expect(container.innerHTML).not.toContain('disabled');
        expect(container.innerHTML).toContain('DEV UNLOCK');
    });

    it('toggles unlock all when clicking the debug unlock skins button', () => {
        mount();
        expect(ownership.isUnlockAll()).toBe(false);
        const btn = container.querySelector('#armory-debug-unlock-skins-btn');
        expect(btn).not.toBeNull();
        btn.click();
        expect(ownership.isUnlockAll()).toBe(true);
        expect(container.innerHTML).not.toContain('disabled');
    });
});
