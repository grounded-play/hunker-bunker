import { describe, expect, it } from 'vitest';
import { calculatePickerLayout, scrambleName, buildPickerTiles, deriveIconFromModelUrl, resolveItemIcon } from './armoryPicker.js';

// docs/planning/armory-ui-overhaul-2026-09-09.md Phase 1.
describe('scrambleName', () => {
    it('keeps length and word shape so the grid cannot reflow', () => {
        const out = scrambleName('Sub-Zero Frostbite Talon SMG', '4100');
        expect(out).toHaveLength('Sub-Zero Frostbite Talon SMG'.length);
        expect(out.split(' ').map((w) => w.length))
            .toEqual('Sub-Zero Frostbite Talon SMG'.split(' ').map((w) => w.length));
    });

    it('is deterministic for the same id, so it does not jitter between renders', () => {
        expect(scrambleName('Tectonic Driller', '4102')).toBe(scrambleName('Tectonic Driller', '4102'));
    });

    it('differs between items, so two locked tiles do not look identical', () => {
        expect(scrambleName('Tectonic Driller', '4102')).not.toBe(scrambleName('Tectonic Driller', '4103'));
    });

    it('does not leak the real name', () => {
        const real = 'Void-Walker Beam Cannon';
        expect(scrambleName(real, '4109')).not.toBe(real);
    });

    it('preserves separators rather than scrambling them into letters', () => {
        const out = scrambleName('Rust & Bone', '4104');
        expect(out[5]).toBe('&');
        expect(out).toMatch(/^\S{4} & \S{4}$/);
    });

    it('survives empty or missing input', () => {
        expect(scrambleName('', '1')).toBe('');
        expect(scrambleName(undefined, '1')).toBe('');
    });
});

describe('buildPickerTiles', () => {
    const options = [
        { id: '4100', name: 'Frostbite Talon', label: 'Frostbite Talon (RARE)', owned: true, disabled: false, selected: true },
        { id: '4105', name: 'Obsidian Shard', label: 'Obsidian Shard (RARE) — LOCKED', owned: false, disabled: true, selected: false }
    ];

    it('shows the real name and art for an owned item', () => {
        const [tile] = buildPickerTiles(options, { iconFor: (id) => `/icon/${id}.png` });
        expect(tile.name).toBe('Frostbite Talon');
        expect(tile.locked).toBe(false);
        expect(tile.icon).toBe('/icon/4100.png');
        expect(tile.selected).toBe(true);
    });

    it('hides the name and marks a locked item', () => {
        const [, tile] = buildPickerTiles(options, { iconFor: (id) => `/icon/${id}.png` });
        expect(tile.locked).toBe(true);
        expect(tile.name).not.toBe('Obsidian Shard');
        expect(tile.name).toHaveLength('Obsidian Shard'.length);
        // Art is still referenced -- the CSS blurs it rather than hiding it, so
        // the player sees a shape without learning what it is.
        expect(tile.icon).toBe('/icon/4105.png');
        expect(tile.glyph).toBe('?');
    });

    it('keeps an honest accessible label for locked tiles', () => {
        const [, tile] = buildPickerTiles(options, { iconFor: () => null });
        expect(tile.ariaLabel.toLowerCase()).toContain('locked');
        expect(tile.ariaLabel).not.toContain('Obsidian Shard');
    });

    it('tolerates a missing icon resolver', () => {
        const tiles = buildPickerTiles(options);
        expect(tiles).toHaveLength(2);
        expect(tiles[0].icon).toBeNull();
    });

    it('treats a dev-unlocked item as pickable, not locked', () => {
        // UNLOCK ALL leaves `owned: false` but `disabled: false`. Such an item
        // is clickable, so it must show its real name.
        const [tile] = buildPickerTiles([
            { id: '4113', name: 'Cryo-Vanguard Scout', owned: false, disabled: false, selected: false }
        ]);
        expect(tile.locked).toBe(false);
        expect(tile.name).toBe('Cryo-Vanguard Scout');
        expect(tile.devUnlocked).toBe(true);
    });

    it('does not badge a genuinely owned item as dev-unlocked', () => {
        const [tile] = buildPickerTiles([
            { id: '1', name: 'Owned', owned: true, disabled: false }
        ]);
        expect(tile.devUnlocked).toBe(false);
    });

    it('prefers the clean catalog name over the decorated label', () => {
        const [tile] = buildPickerTiles([
            { id: '1', name: 'Clean Name', label: 'Clean Name (RARE) — 🔓 DEV UNLOCK', owned: true, disabled: false }
        ]);
        expect(tile.name).toBe('Clean Name');
    });

    it('returns an empty list for no options', () => {
        expect(buildPickerTiles([])).toEqual([]);
        expect(buildPickerTiles(undefined)).toEqual([]);
    });
});

describe('icon resolution', () => {
    it('derives an economy icon from the item model it renders', () => {
        expect(deriveIconFromModelUrl('/3d/runtime/new3ds/skin_scout_frostbite.glb'))
            .toBe('/economy/skin_scout_frostbite.png');
    });

    it('ignores anything that is not a glb path', () => {
        expect(deriveIconFromModelUrl('/economy/foo.png')).toBeNull();
        expect(deriveIconFromModelUrl('')).toBeNull();
        expect(deriveIconFromModelUrl(null)).toBeNull();
        expect(deriveIconFromModelUrl(undefined)).toBeNull();
    });

    it('prefers an explicit catalog icon over the derived one', () => {
        expect(resolveItemIcon('4100', {
            explicitIcon: '/economy/custom.png',
            modelUrlFor: () => '/3d/runtime/new3ds/skin_scout_frostbite.glb'
        })).toBe('/economy/custom.png');
    });

    it('falls back to the model-derived icon', () => {
        expect(resolveItemIcon('4100', {
            modelUrlFor: (id) => (id === '4100' ? '/3d/runtime/new3ds/skin_scout_frostbite.glb' : null)
        })).toBe('/economy/skin_scout_frostbite.png');
    });

    it('returns null when neither source knows the item', () => {
        expect(resolveItemIcon('nope')).toBeNull();
    });
});


describe('single-screen equipment grids', () => {
    it('fits every offered list at desktop and handheld landscape sizes', () => {
        for (const [width, height] of [[1280, 720], [1280, 800], [1431, 781], [1920, 1080]]) {
            for (let count = 1; count <= 40; count++) {
                const layout = calculatePickerLayout(count, width, height);
                const totalHeight = layout.rows * (layout.art + 48) + (layout.rows - 1) * 8 + 160;
                expect(layout.width).toBeLessThanOrEqual(width - 64);
                expect(totalHeight).toBeLessThanOrEqual(height - 48);
                expect(layout.columns * layout.rows).toBeGreaterThanOrEqual(count);
                expect(layout.art).toBeGreaterThanOrEqual(60);
            }
        }
    });
});
