// One item card for every surface that shows an item (Sprint 48 P2): the
// hero screen's equipped strip today; the Foundry hub's tabs as they move
// over. Drawn only from the shared catalog's view (src/data/itemCatalog.js),
// so a card here matches the Armory tile, the Foundry card and the Vault
// entry for the same id.
import { getItemView, FRAME_PREFIX } from './data/itemCatalog.js';
import { assetUrl } from './assetUrl.js';
import { t } from './i18n.js';

const SLOT_KEYS = Object.freeze({
    weapon: 'ui.item_card.slot_weapon',
    charm: 'ui.item_card.slot_charm',
    bay_a: 'ui.item_card.slot_bay_a',
    bay_b: 'ui.item_card.slot_bay_b',
    chassis: 'ui.item_card.slot_chassis'
});

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/**
 * The equipped items of one class, in slot order. The weapon slot shows a
 * fitted Foundry profile if there is one, else the finish, else the factory
 * frame. `chassisId` is the suit-wide chassis (the loadout keeps one).
 */
export function loadoutCardViews(classLoadout = {}, { classId = 'scout', chassisId = null } = {}) {
    const frameId = classLoadout.archetypeId ? `${FRAME_PREFIX}${classLoadout.archetypeId}` : null;
    const weaponId = classLoadout.craftedWeaponId ?? classLoadout.weaponSkinId ?? frameId;
    return [
        { slot: 'weapon', view: weaponId ? getItemView(weaponId, { classId, frameId }) : null },
        { slot: 'charm', view: classLoadout.charmId ? getItemView(classLoadout.charmId) : null },
        { slot: 'bay_a', view: classLoadout.mod1Id ? getItemView(classLoadout.mod1Id) : null },
        { slot: 'bay_b', view: classLoadout.mod2Id ? getItemView(classLoadout.mod2Id) : null },
        { slot: 'chassis', view: chassisId ? getItemView(chassisId) : null }
    ];
}

// `compact`: art only, for tight panels (the hero screen). The slot and name
// move into the tooltip and the accessible label instead of the card face.
export function itemCardHtml(view, { slot = '', emptyLabel = '', compact = false } = {}) {
    const slotLabel = SLOT_KEYS[slot] ? t(SLOT_KEYS[slot]) : '';
    if (compact) {
        const name = view?.name ?? (emptyLabel || t('ui.item_card.empty'));
        const label = slotLabel ? `${slotLabel}: ${name}` : name;
        const art = view?.icon ? `<img src="${escape(assetUrl(view.icon))}" alt="" loading="lazy" decoding="async">` : '';
        const rarity = view ? `item-card--${escape(view.rarity)}` : 'item-card--empty';
        const itemAttr = view ? ` data-item-id="${escape(view.id)}"` : '';
        return `<div class="item-card item-card--compact ${rarity}" data-slot="${escape(slot)}"${itemAttr} role="img" aria-label="${escape(label)}" title="${escape(label)}">`
            + `<span class="item-card__art">${art}</span></div>`;
    }
    if (!view) {
        return `<div class="item-card item-card--empty" data-slot="${escape(slot)}">`
            + `<span class="item-card__art"></span>`
            + `<span class="item-card__slot">${escape(slotLabel)}</span>`
            + `<span class="item-card__name">${escape(emptyLabel || t('ui.item_card.empty'))}</span></div>`;
    }
    const art = view.icon
        ? `<img src="${escape(assetUrl(view.icon))}" alt="" loading="lazy" decoding="async">`
        : '';
    return `<div class="item-card item-card--${escape(view.rarity)}" data-slot="${escape(slot)}" data-item-id="${escape(view.id)}" title="${escape(view.name)}">`
        + `<span class="item-card__art">${art}</span>`
        + `<span class="item-card__slot">${escape(slotLabel)}</span>`
        + `<span class="item-card__name">${escape(view.name)}</span></div>`;
}

export function renderLoadoutStrip(container, classLoadout, options = {}) {
    if (!container) return;
    const compact = container.classList?.contains('item-card-strip--compact') ?? false;
    container.innerHTML = loadoutCardViews(classLoadout, options)
        .map(({ slot, view }) => itemCardHtml(view, { slot, compact }))
        .join('');
    for (const img of container.querySelectorAll?.('.item-card__art img') ?? []) {
        img.addEventListener?.('error', () => img.remove(), { once: true });
    }
}
