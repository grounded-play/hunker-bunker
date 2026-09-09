// Armory tile pickers — docs/planning/armory-ui-overhaul-2026-09-09.md Phase 1.
//
// Replaces the Armory's <select> dropdowns with the tile grid the operator
// sheen picker already uses (renderOperatorPolishUi in main.js). A dropdown
// cannot show what an item looks like, and it names every locked item outright,
// which spoils the unlock. A tile can show the art and withhold the name.
//
// Ownership is NOT decided here: these functions consume whatever
// buildEquipOptions() already returned, so there is exactly one authority for
// what the player owns.

const SCRAMBLE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Separators are preserved rather than scrambled: keeping spaces, hyphens and
// ampersands in place holds the word shape, so a locked tile occupies the same
// space as its unlocked self and the grid never reflows on unlock.
function isSeparator(char) {
    return !/[A-Za-z0-9]/.test(char);
}

// Deterministic per (name, id) so a locked tile shows the same nonsense on every
// render -- a fresh random each frame reads as a glitch, and worse, a player
// could average several renders to recover the real letters.
function hashSeed(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function scrambleName(name, id = '') {
    const source = String(name ?? '');
    if (!source) return '';
    let state = hashSeed(`${source}::${id}`) || 1;
    const next = () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
    let out = '';
    for (const char of source) {
        out += isSeparator(char)
            ? char
            : SCRAMBLE_ALPHABET[Math.floor(next() * SCRAMBLE_ALPHABET.length)];
    }
    // A scramble that happens to reproduce the name would leak it. Vanishingly
    // unlikely, but the guard is one line and the failure is silent otherwise.
    return out === source ? scrambleName(`${source} `, id).trim() : out;
}

// Maps buildEquipOptions() output to what the DOM renderer needs. Locked tiles
// keep their artwork -- the CSS blurs and desaturates it -- so the player sees
// that something exists and roughly what shape it is, without being told what.
// `locked` follows `disabled`, not `owned`. Those differ: the dev UNLOCK ALL
// flag leaves items un-owned but fully equippable, and a tile the player can
// click must show its real name. Locked means "cannot be equipped", which is
// exactly what buildEquipOptions already decided.
export function buildPickerTiles(options = [], { iconFor = null } = {}) {
    if (!Array.isArray(options)) return [];
    return options.map((option) => {
        const id = String(option?.id ?? '');
        // Prefer the clean catalog name; `label` carries rarity and unlock
        // suffixes that belong on the tile's badge, not in its title.
        const label = String(option?.name ?? option?.label ?? '');
        const locked = Boolean(option?.disabled);
        return {
            id,
            locked,
            // Equippable but not actually earned -- the dev UNLOCK ALL flag.
            // Surfaced as a badge so a dev build never looks like real progress.
            devUnlocked: !locked && !option?.owned,
            selected: Boolean(option?.selected),
            disabled: Boolean(option?.disabled),
            name: locked ? scrambleName(label, id) : label,
            realName: label,
            icon: typeof iconFor === 'function' ? (iconFor(id) ?? null) : null,
            glyph: locked ? '?' : null,
            ariaLabel: locked ? 'Locked item. Unlock to reveal.' : label
        };
    });
}

// Icons for the tiles. Only a quarter of the catalog entries carry an explicit
// `icon`, but 159 economy PNGs ship and their basenames match the GLB the item
// actually renders (skin_scout_frostbite.glb <-> skin_scout_frostbite.png).
// Deriving from the model map means a tile shows the real item art without
// hand-maintaining a second list that silently drifts.
export function deriveIconFromModelUrl(modelUrl) {
    if (typeof modelUrl !== 'string' || !modelUrl) return null;
    const base = modelUrl.split('/').pop();
    if (!base || !base.endsWith('.glb')) return null;
    return `/economy/${base.slice(0, -4)}.png`;
}

// Resolution order: an explicit catalog icon wins, then the item's own model,
// then nothing (the tile falls back to initials).
export function resolveItemIcon(id, { explicitIcon = null, modelUrlFor = null } = {}) {
    if (explicitIcon) return explicitIcon;
    const modelUrl = typeof modelUrlFor === 'function' ? modelUrlFor(id) : null;
    return deriveIconFromModelUrl(modelUrl);
}
