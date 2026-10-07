// One item card for every surface that shows an item (Sprint 48 P2): the
// hero screen's equipped strip today; the Foundry hub's tabs as they move
// over. Drawn only from the shared catalog's view (src/data/itemCatalog.js),
// so a card here matches the Armory tile, the Foundry card and the Vault
// entry for the same id.
import { getItemView, FRAME_PREFIX } from './data/itemCatalog.js';
import { assetUrl } from './assetUrl.js';
import { t } from './i18n.js';
import { itemAffectsPlay, itemEffectText } from './itemEffects.js';

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

// `compact`: art only, for tight panels (the hero screen). The slot, name and
// effect move into the tooltip and the accessible label instead.
// `interactive`: the card is a button that opens its slot's picker (Sprint 51:
// the Foundry LOADOUT tab and the hero screen), empty slots included.
export function itemCardHtml(view, { slot = '', emptyLabel = '', compact = false, interactive = false } = {}) {
    const slotLabel = SLOT_KEYS[slot] ? t(SLOT_KEYS[slot]) : '';
    const tag = interactive ? 'button' : 'div';
    const open = (classes, attrs) => (interactive
        ? `<button type="button" class="${classes}" data-slot="${escape(slot)}"${attrs}>`
        : `<div class="${classes}" data-slot="${escape(slot)}"${attrs}>`);
    const effect = itemEffectText(view);
    if (compact) {
        const name = view?.name ?? (emptyLabel || t('ui.item_card.empty'));
        const label = [slotLabel ? `${slotLabel}: ${name}` : name, effect].filter(Boolean).join(' — ');
        const art = view?.icon ? `<img src="${escape(assetUrl(view.icon))}" alt="" loading="lazy" decoding="async">` : '';
        const rarity = view ? `item-card--${escape(view.rarity)}` : 'item-card--empty';
        const itemAttr = view ? ` data-item-id="${escape(view.id)}"` : '';
        const role = interactive ? '' : ' role="img"';
        return `${open(`item-card item-card--compact ${rarity}`, `${itemAttr}${role} aria-label="${escape(label)}" title="${escape(label)}"`)}`
            + `<span class="item-card__art">${art}</span></${tag}>`;
    }
    if (!view) {
        return open('item-card item-card--empty', '')
            + `<span class="item-card__art"></span>`
            + `<span class="item-card__slot">${escape(slotLabel)}</span>`
            + `<span class="item-card__name">${escape(emptyLabel || t('ui.item_card.empty'))}</span></${tag}>`;
    }
    const art = view.icon
        ? `<img src="${escape(assetUrl(view.icon))}" alt="" loading="lazy" decoding="async">`
        : '';
    return open(`item-card item-card--${escape(view.rarity)}`, ` data-item-id="${escape(view.id)}" title="${escape([view.name, effect].filter(Boolean).join(' — '))}"`)
        + `<span class="item-card__art">${art}</span>`
        + `<span class="item-card__slot">${escape(slotLabel)}</span>`
        + `<span class="item-card__name">${escape(view.name)}</span>`
        + (effect ? `<span class="item-card__effect">${escape(effect)}</span>` : '')
        + `</${tag}>`;
}

/**
 * "What this loadout does": one line per equipped item that changes play
 * (the weapon frame or profile, charm, Rig Modules), cosmetics left out.
 */
export function loadoutEffectSummaryHtml(cardViews = []) {
    const lines = cardViews
        .filter(({ view }) => view && itemAffectsPlay(view))
        .map(({ slot, view }) => `<li><b>${escape(SLOT_KEYS[slot] ? t(SLOT_KEYS[slot]) : slot)}</b> <span>${escape(itemEffectText(view))}</span></li>`);
    return `<section class="loadout-effects" aria-label="${escape(t('ui.equipment.summary'))}">`
        + `<h3 class="loadout-effects__title">${escape(t('ui.equipment.summary'))}</h3>`
        + (lines.length ? `<ul class="loadout-effects__list">${lines.join('')}</ul>` : `<p class="loadout-effects__none">${escape(t('ui.equipment.none'))}</p>`)
        + '</section>';
}

export function renderLoadoutStrip(container, classLoadout, options = {}) {
    if (!container) return;
    const compact = container.classList?.contains('item-card-strip--compact') ?? false;
    const interactive = Boolean(options.interactive);
    container.innerHTML = loadoutCardViews(classLoadout, options)
        .map(({ slot, view }) => itemCardHtml(view, { slot, compact, interactive }))
        .join('');
    for (const img of container.querySelectorAll?.('.item-card__art img') ?? []) {
        img.addEventListener?.('error', () => img.remove(), { once: true });
    }
}
