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

// docs/planning/armory-ui-overhaul-2026-09-09.md Phase 1: the Armory's
// <select> dropdowns became tile grids, so equipment is chosen by clicking a
// tile rather than by a change event. This builds the event a real tile click
// produces, including the locked case the grid must refuse.
function tileClick(value, { locked = false } = {}) {
    const tile = {
        classList: { contains: (c) => locked && c === 'is-locked' },
        dataset: { value }
    };
    tile.closest = (selector) => (selector === '.armory-tile' ? tile : null);
    return { type: 'click', target: tile };
}

// The bench controls are now slot buttons that open a shared tile modal
// (docs/planning/armory-ui-overhaul-2026-09-09.md Phase 1/2), so a test that
// wants to see or click an item has to open that slot's modal first.
function openSlot(container, fieldKey) {
    container.querySelector(`#armory-slot-${fieldKey}`).click();
    return container.querySelector('#armory-picker-grid');
}

// The tile markup lives in the modal body's innerHTML, not the container's.
function openSlotHtml(container, fieldKey) {
    container.querySelector(`#armory-slot-${fieldKey}`).click();
    return container.querySelector('#armory-picker-body').innerHTML;
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
                if (children[id]) return children[id];
                // A real querySelector searches all descendants. The Armory's
                // picker modal renders its grid into a child's innerHTML, so a
                // shallow lookup would never find it.
                for (const child of Object.values(children)) {
                    const found = child.querySelector?.(sel);
                    if (found) return found;
                }
                return null;
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
        // Every control is a slot button that opens the shared tile modal.
        expect(container.innerHTML).toContain('id="armory-slot-weapon"');
        expect(container.innerHTML).toContain('id="armory-slot-charm"');
        expect(container.innerHTML).toContain('id="armory-slot-mod1"');
        expect(container.innerHTML).toContain('id="armory-slot-mod2"');
        expect(container.innerHTML).toContain('id="armory-slot-chassis"');
        expect(container.innerHTML).toContain('id="armory-slot-decal"');
        expect(container.innerHTML).toContain('id="armory-picker-modal"');
        // Frame and fielded model are one control now, and nothing is a "finish".
        expect(container.innerHTML).toContain('PRIMARY WEAPON');
        expect(container.innerHTML).not.toMatch(/TACTICAL FINISH/);
        expect(container.innerHTML).not.toContain('armory-slot-archetype');
        expect(container.innerHTML).toContain('id="armory-polish-btn"');
        // No dropdown survives anywhere on the bench.
        expect(container.innerHTML).not.toContain('<select');

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

        openSlot(container, 'charm').dispatchEvent(tileClick('4130'));
        expect(loadoutManager.getEquippedCharmId('scout')).toBe('4130');
        expect(fakeScene.updateFromLoadout).toHaveBeenCalledWith(loadoutManager, 'scout');

        openSlot(container, 'chassis').dispatchEvent(tileClick('4113'));
        expect(loadoutManager.getEquippedChassisSkinId()).toBe('4113');
        expect(fakeScene.setChassisSkin).toHaveBeenCalledWith('4113', 'scout');

        openSlot(container, 'mod1').dispatchEvent(tileClick('4141'));
        expect(loadoutManager.getEquippedRigModule(1, 'scout')).toBe('4141');
        const modifiers = loadoutManager.getActiveModifiers('scout');
        expect(modifiers.scrapMagnetRadiusBonus).toBeCloseTo(0.20);

        // One weapon control: picking a skin-weapon also sets its frame.
        openSlot(container, 'weapon').dispatchEvent(tileClick('4100'));
        expect(loadoutManager.getClassLoadout('scout').weaponSkinId).toBe('4100');
        expect(loadoutManager.getClassLoadout('scout').archetypeId).toBe('talon');
        expect(fakeScene.updateFromLoadout).toHaveBeenCalledWith(loadoutManager, 'scout');

        // ...and picking a factory frame clears the skin back off.
        openSlot(container, 'weapon').dispatchEvent(tileClick('frame:talon_c'));
        expect(loadoutManager.getClassLoadout('scout').archetypeId).toBe('talon_c');
        expect(loadoutManager.getClassLoadout('scout').weaponSkinId).toBeFalsy();
    });

    it('handles navigation button clicks', () => {
        const onDailyOps = vi.fn();
        const ui = createArmoryUi({
            container,
            loadoutManager,
            armoryScene: fakeScene,
            onEmbark,
            onBack,
            onOpenVault,
            onDailyOps,
            getDailyOpsStatus: () => ({ label: 'READY', disabled: false }),
            ownership: ownAll()
        });

        ui.setClass('TANK');

        const btnBack = container.querySelector('#armory-btn-back');
        const btnVault = container.querySelector('#armory-btn-vault');
        const btnEmbark = container.querySelector('#armory-btn-embark');
        const btnDaily = container.querySelector('#armory-btn-daily');

        btnBack.click();
        expect(onBack).toHaveBeenCalled();

        btnVault.click();
        expect(onOpenVault).toHaveBeenCalled();

        btnEmbark.click();
        expect(onEmbark).toHaveBeenCalled();

        btnDaily.click();
        expect(onDailyOps).toHaveBeenCalled();
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
        // The chassis list is per-class, and now lives in the slot's modal.
        const engineerHtml = openSlotHtml(container, 'chassis');
        expect(engineerHtml).toContain('Sub-Terran Drill Engineer');
        expect(engineerHtml).not.toContain('Cryo-Vanguard Scout');

        const tankTab = container.querySelectorAll('.class-tab')
            .find((tab) => tab.dataset.class === 'tank');
        tankTab.click();
        expect(fakeScene.setClass).toHaveBeenLastCalledWith('tank', null);
        const tankHtml = openSlotHtml(container, 'chassis');
        expect(tankHtml).toContain('Trench Warden Heavy');
        expect(tankHtml).not.toContain('Sub-Terran Drill Engineer');
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
            ownership,
            qaToolsEnabled: true
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

    it('renders an unowned item as a locked tile that withholds its name', () => {
        mount();
        const html = openSlotHtml(container, 'chassis');
        // Cryo-Vanguard Scout (4113) is a scout chassis skin nobody owns here.
        expect(html).toContain('data-value="4113"');
        expect(html).toMatch(/data-value="4113"[^>]*aria-disabled/);
        // Present but unnamed: the tile is there, the name is not.
        const tile = html.slice(html.indexOf('data-value="4113"'));
        expect(tile.slice(0, 400)).toContain('Locked');
        expect(tile.slice(0, 400)).not.toContain('Cryo-Vanguard Scout');
    });

    it('still offers community chassis skins, which live outside the Steam catalog', () => {
        mount();
        // All 30 comm_* skins ship unlocked, so they must render enabled --
        // a catalog-only lookup would have dropped them from the list entirely.
        const html = openSlotHtml(container, 'chassis');
        expect(html).toContain('comm_scout_foxhole_shadow');
        expect(html).not.toMatch(/data-value="comm_scout_foxhole_shadow"[^>]*aria-disabled/);
    });

    it('names achievement reward chassis instead of showing a bare id', () => {
        ownership.grantDev(5001, 1);
        mount();
        const html = openSlotHtml(container, 'chassis');
        expect(html).toContain('data-value="5001"');
        expect(html).toMatch(/GHOST/i);
    });

    it('renders an owned item enabled and without a locked label', () => {
        ownership.grantDev(4113, 1);
        mount();
        const html = openSlotHtml(container, 'chassis');
        const tag = html.slice(html.indexOf('data-value="4113"'), html.indexOf('data-value="4113"') + 400);
        expect(tag).not.toContain('aria-disabled');
        expect(tag).toContain('Cryo-Vanguard Scout');
    });

    it('lists catalog items the old hardcoded arrays omitted', () => {
        ownership.setUnlockAll(true);
        mount();
        // Charms stopped at 4137, so 4138/4139 could never be selected.
        const html = openSlotHtml(container, 'charm');
        expect(html).toContain('data-value="4138"');
        expect(html).toContain('data-value="4139"');
    });

    it('refuses to equip a locked item even if a click on it is forced', () => {
        mount();
        // Two layers: the grid ignores a tile carrying is-locked, and equipGuard
        // refuses the id even when the class has been stripped from the DOM.
        const picker = openSlot(container, 'charm');
        picker.dispatchEvent(tileClick('4130', { locked: true }));
        expect(loadoutManager.getClassLoadout('scout').charmId).toBeFalsy();
        picker.dispatchEvent(tileClick('4130'));
        expect(loadoutManager.getClassLoadout('scout').charmId).toBeFalsy();
    });

    it('equips a locked item once it is granted', () => {
        mount();
        ownership.grantDev(4130, 1);
        openSlot(container, 'charm').dispatchEvent(tileClick('4130'));
        expect(String(loadoutManager.getClassLoadout('scout').charmId)).toBe('4130');
    });

    it('re-renders when a grant lands while the Armory is open', () => {
        mount();
        // 4113 Cryo-Vanguard Scout — a scout-class chassis, so it is actually
        // offered on this bench (4114 is tank-only).
        expect(openSlotHtml(container, 'chassis')).toMatch(/data-value="4113"[^>]*aria-disabled/);
        ownership.grantDev(4113, 1);
        // The grant re-renders, and a re-render reopens the modal that was up.
        expect(container.querySelector('#armory-picker-body').innerHTML)
            .not.toMatch(/data-value="4113"[^>]*aria-disabled/);
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
        const html = openSlotHtml(container, 'chassis');
        expect(html).not.toContain('aria-disabled');
        expect(html).toContain('DEV UNLOCK');
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

    it('grants a synthetic marketplace kit and test keys without a purchase path', () => {
        mount();
        const button = container.querySelector('#armory-debug-grant-kit-btn');
        expect(button).not.toBeNull();
        button.click();
        expect(ownership.getQuantity(4100)).toBeGreaterThan(0);
        expect(ownership.getQuantity(4001)).toBeGreaterThanOrEqual(5);
    });

    it('does not render QA controls without the trusted capability', () => {
        const ui = createArmoryUi({
            container,
            loadoutManager,
            armoryScene: fakeScene,
            ownership,
            qaToolsEnabled: false
        });
        ui.setClass('SCOUT');
        expect(container.querySelector('#armory-debug-unlock-skins-btn')).toBeNull();
        expect(container.querySelector('#armory-debug-grant-kit-btn')).toBeNull();
    });

    it('previews the selected voice bank with its signature line', () => {
        ownership.setUnlockAll(true);
        const previousWindow = globalThis.window;
        globalThis.window = {
            AudioManager: { playVoiceCallout: vi.fn() },
            addEventListener: vi.fn()
        };
        mount();

        openSlot(container, 'voicebank').dispatchEvent(tileClick('4148'));
        expect(loadoutManager.state.voicePackId).toBe('4148');
        expect(globalThis.window.AudioManager.playVoiceCallout)
            .toHaveBeenCalledWith('boss_spotted', { volume: 0.9, audition: true });

        globalThis.window = previousWindow;
    });
});
