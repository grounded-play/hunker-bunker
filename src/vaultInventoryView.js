/**
 * What the Vault / Foundry Stash draws, derived from the raw inventory.
 *
 * Steam returns one row per item instance (or per partially-stacked
 * instance), so five copies of a cosmetic used to draw five cards
 * (docs/planning/foundry-vault-settings-ui-remediation-2026-10-13.md, P0).
 * This module groups those rows into display stacks. It is a projection
 * only: the raw rows stay the ledger that exchanges, cache/key selection and
 * ownership reconciliation read, and every stack keeps its source rows in
 * `instances` so an action can still resolve exact Steam instance IDs.
 *
 * Pure and DOM-free; the catalog lookup is injected so tests (and the
 * renderer) decide how an itemdefid becomes a name, rarity and kind.
 */

export const VAULT_RARITY_ORDER = Object.freeze(['common', 'uncommon', 'rare', 'epic', 'legendary']);

// Player-facing filter groups, built from catalog kinds rather than from item
// names. Anything with an unrecognized kind still shows under ALL.
export const VAULT_KIND_GROUPS = Object.freeze({
    all: null,
    cosmetic: Object.freeze(['skin', 'decal', 'chassis', 'charm', 'audio', 'hud', 'vfx', 'frame', 'weapon_profile']),
    mod: Object.freeze(['mod']),
    material: Object.freeze(['material', 'reagent', 'shard']),
    cache: Object.freeze(['container', 'key', 'key_bundle'])
});

export const VAULT_SORTS = Object.freeze(['recent', 'name', 'rarity', 'quantity']);

export const DEFAULT_VAULT_VIEW_STATE = Object.freeze({ query: '', group: 'all', rarity: 'all', sort: 'recent' });

const KIND_TO_GROUP = new Map(
    Object.entries(VAULT_KIND_GROUPS)
        .filter(([, kinds]) => kinds)
        .flatMap(([group, kinds]) => kinds.map((kind) => [kind, group]))
);

export function kindGroupOf(kind) {
    return KIND_TO_GROUP.get(String(kind ?? '').toLowerCase()) ?? null;
}

/** "4100", 4100 and " 4100 " are one definition; non-numeric ids keep their text. */
export function normalizeItemdefid(value) {
    if (value == null) return null;
    const text = String(value).trim();
    if (!text) return null;
    const numeric = Number(text);
    return Number.isFinite(numeric) && /^-?\d+(\.\d+)?$/.test(text) ? String(numeric) : text;
}

function rowQuantity(row) {
    if (row?.quantity == null || row.quantity === '') return 1;
    const quantity = Number(row.quantity);
    return Number.isFinite(quantity) ? Math.floor(quantity) : 0;
}

// Rows whose visible/actionable state differs must never merge. Steam does
// not supply such state today; if it does, it lands in `state` and splits the
// stack instead of being silently discarded.
function stackKeyOf(itemdefid, row) {
    const state = row?.state == null || row.state === '' ? '' : String(row.state);
    return state ? `${itemdefid}|${state}` : itemdefid;
}

function rarityRank(rarity) {
    const index = VAULT_RARITY_ORDER.indexOf(String(rarity ?? '').toLowerCase());
    return index < 0 ? -1 : index;
}

/**
 * Raw rows -> display stacks, in first-seen (service) order.
 * @param {Array} rows raw inventory rows `{ itemId, itemdefid, quantity }`
 * @param {(itemdefid) => object|null} lookup catalog entry with name/rarity/kind
 */
export function buildVaultStacks(rows = [], lookup = () => null) {
    const byKey = new Map();
    const unknown = new Map();
    let skippedRows = 0;
    (Array.isArray(rows) ? rows : []).forEach((row, index) => {
        const itemdefid = normalizeItemdefid(row?.itemdefid);
        const quantity = rowQuantity(row);
        if (!itemdefid || quantity <= 0) {
            skippedRows += 1;
            return;
        }
        const catalog = lookup(row.itemdefid) ?? null;
        if (!catalog) {
            unknown.set(itemdefid, (unknown.get(itemdefid) ?? 0) + quantity);
            return;
        }
        const key = stackKeyOf(itemdefid, row);
        let stack = byKey.get(key);
        if (!stack) {
            stack = {
                key,
                itemdefid,
                quantity: 0,
                instances: [],
                catalog,
                order: index,
                group: kindGroupOf(catalog.kind ?? catalog.type)
            };
            byKey.set(key, stack);
        }
        stack.quantity += quantity;
        stack.instances.push(row);
    });
    return {
        stacks: [...byKey.values()],
        unknown: [...unknown.entries()].map(([itemdefid, quantity]) => ({ itemdefid, quantity })),
        skippedRows
    };
}

export function filterVaultStacks(stacks = [], { query = '', group = 'all', rarity = 'all' } = {}) {
    const needle = String(query ?? '').trim().toLowerCase();
    return stacks.filter((stack) => {
        if (group && group !== 'all' && stack.group !== group) return false;
        if (rarity && rarity !== 'all' && String(stack.catalog?.rarity ?? '').toLowerCase() !== rarity) return false;
        if (!needle) return true;
        const name = String(stack.catalog?.name ?? '').toLowerCase();
        return name.includes(needle) || stack.itemdefid.toLowerCase().includes(needle);
    });
}

const byName = (a, b) => String(a.catalog?.name ?? '').localeCompare(String(b.catalog?.name ?? ''), undefined, { sensitivity: 'base', numeric: true })
    || a.order - b.order;

export function sortVaultStacks(stacks = [], sort = 'recent') {
    const sorted = [...stacks];
    if (sort === 'name') return sorted.sort(byName);
    if (sort === 'rarity') return sorted.sort((a, b) => rarityRank(b.catalog?.rarity) - rarityRank(a.catalog?.rarity) || byName(a, b));
    if (sort === 'quantity') return sorted.sort((a, b) => b.quantity - a.quantity || byName(a, b));
    return sorted.sort((a, b) => a.order - b.order);
}

export function normalizeVaultViewState(state = {}) {
    const group = Object.hasOwn(VAULT_KIND_GROUPS, state.group) ? state.group : 'all';
    const rarity = state.rarity === 'all' || VAULT_RARITY_ORDER.includes(state.rarity) ? state.rarity : 'all';
    const sort = VAULT_SORTS.includes(state.sort) ? state.sort : 'recent';
    return { query: String(state.query ?? '').slice(0, 64), group, rarity, sort };
}

export function isVaultViewFiltered(state = {}) {
    const normalized = normalizeVaultViewState(state);
    return Boolean(normalized.query.trim()) || normalized.group !== 'all' || normalized.rarity !== 'all';
}

/** Everything the grid, its count line and its empty states need. */
export function projectVaultInventory(rows, state, lookup) {
    const view = normalizeVaultViewState(state);
    const { stacks, unknown, skippedRows } = buildVaultStacks(rows, lookup);
    const visible = sortVaultStacks(filterVaultStacks(stacks, view), view.sort);
    return {
        view,
        stacks,
        visible,
        unknown,
        skippedRows,
        totalTypes: stacks.length,
        totalItems: stacks.reduce((sum, stack) => sum + stack.quantity, 0),
        visibleItems: visible.reduce((sum, stack) => sum + stack.quantity, 0),
        filtered: isVaultViewFiltered(view)
    };
}

/**
 * Selection survives a refresh by stack key (item definition), never by a
 * transient instance id. Falls back to the first visible stack, or null.
 */
export function reconcileVaultSelection(selectedKey, visible = []) {
    if (selectedKey != null && visible.some((stack) => stack.key === selectedKey)) return selectedKey;
    return visible[0]?.key ?? null;
}
