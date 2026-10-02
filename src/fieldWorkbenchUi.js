import { t } from './i18n.js';
import './styles/fieldWorkbench.css';

export const FIELD_WORKBENCH_RECIPES = Object.freeze([
    {
        id: 'ammo_pack',
        nameKey: 'ui.workbench.ammo_pack_name',
        fallbackName: 'Standard Munitions Pack',
        descKey: 'ui.workbench.ammo_pack_desc',
        fallbackDesc: 'Refills 30 kinetic ammunition and reloads active weapon clip.',
        cost: Object.freeze({ tech: 15, scrap: 15 }),
        effect: 'Refills 30 Ammo (Clip + Reserve)'
    },
    {
        id: 'med_patch',
        nameKey: 'ui.workbench.med_patch_name',
        fallbackName: 'Emergency Bio-Suture',
        descKey: 'ui.workbench.med_patch_desc',
        fallbackDesc: 'Synthesizes antiseptic bio-tissue sealant, restoring 40 HP.',
        cost: Object.freeze({ med: 20 }),
        effect: 'Restores 40 HP'
    },
    {
        id: 'suit_armor_plate',
        nameKey: 'ui.workbench.suit_armor_plate_name',
        fallbackName: 'Reinforced Suit Plating',
        descKey: 'ui.workbench.suit_armor_plate_desc',
        fallbackDesc: 'Installs ablative composite plating, repairing armor and adding +25 shield.',
        cost: Object.freeze({ tech: 25, scrap: 25, tech_sub: 10 }),
        effect: 'Repairs Armor & +25 Shield'
    }
]);

export const WORKBENCH_KEYS = Object.freeze({
    'title': 'ui.workbench.title',
    'kicker': 'ui.workbench.kicker',
    'copy': 'ui.workbench.copy',
    'craft': 'ui.workbench.craft',
    'close': 'ui.workbench.close',
    'aria_close': 'ui.workbench.aria_close',
    'ammo_pack_name': 'ui.workbench.ammo_pack_name',
    'ammo_pack_desc': 'ui.workbench.ammo_pack_desc',
    'med_patch_name': 'ui.workbench.med_patch_name',
    'med_patch_desc': 'ui.workbench.med_patch_desc',
    'suit_armor_plate_name': 'ui.workbench.suit_armor_plate_name',
    'suit_armor_plate_desc': 'ui.workbench.suit_armor_plate_desc',
    'stat_tech': 'ui.workbench.stat_tech',
    'stat_med': 'ui.workbench.stat_med',
    'stat_coin': 'ui.workbench.stat_coin',
    'stat_shells': 'ui.workbench.stat_shells',
    'stat_health': 'ui.workbench.stat_health',
    'stat_shield': 'ui.workbench.stat_shield',
    'stat_ammo': 'ui.workbench.stat_ammo',
    'need_resource': 'ui.workbench.need_resource',
    'deficit': 'ui.workbench.deficit'
});

export function checkRecipeAffordability(recipe, bankState = {}) {
    const missing = [];
    const availableTech = Number(bankState.tech ?? bankState.scrap) || 0;
    const availableMed = Number(bankState.med) || 0;

    if (recipe.id === 'ammo_pack') {
        const required = 15;
        if (availableTech < required) {
            missing.push({ resource: 'tech', need: required, have: availableTech });
        }
    } else if (recipe.id === 'med_patch') {
        const required = 20;
        if (availableMed < required) {
            missing.push({ resource: 'med', need: required, have: availableMed });
        }
    } else if (recipe.id === 'suit_armor_plate') {
        const requiredTech = 25;
        if (availableTech < requiredTech) {
            missing.push({ resource: 'tech', need: requiredTech, have: availableTech });
        }
        // In legacy mock banks with both scrap and tech, require 10 tech; in real banks check tech >= 25
        if (bankState.scrap !== undefined && (Number(bankState.tech) || 0) < 10) {
            missing.push({ resource: 'tech', need: 10, have: Number(bankState.tech) || 0 });
        }
    }

    return {
        affordable: missing.length === 0,
        missing
    };
}

export function createFieldWorkbenchUi({
    document: doc = (typeof document !== 'undefined' ? document : null),
    getGame = () => (typeof window !== 'undefined' ? window.game : null),
    getBank = () => (getGame()?.bank?.getState?.() ?? {})
} = {}) {
    if (!doc) return null;

    let isOpen = false;
    let currentCamp = null;
    let previousFocusedElement = null;

    const modal = doc.getElementById('field-workbench-modal');
    const titleEl = doc.getElementById('field-workbench-title');
    const kickerEl = doc.getElementById('field-workbench-kicker');
    const statsStripEl = doc.getElementById('field-workbench-stats-strip');
    const recipesGridEl = doc.getElementById('field-workbench-recipes-grid');
    const closeBtn = doc.getElementById('close-field-workbench');
    const footerCloseBtn = doc.getElementById('field-workbench-footer-close');

    function renderStats() {
        if (!statsStripEl) return;
        const game = getGame();
        const bank = (typeof getBank === 'function' ? getBank() : getBank) ?? game?.bank?.getState?.() ?? {};

        const techVal = bank.tech ?? bank.scrap ?? 0;
        const medVal = bank.med ?? 0;
        const coinVal = bank.coin ?? 0;
        const shellsVal = bank.shells ?? 0;

        const currentClip = game?.currentClip ?? 0;
        const totalAmmo = game?.totalAmmo ?? 0;
        const hp = game?.playerHp ?? 100;
        const maxHp = game?.playerMaxHp ?? 100;
        const shield = game?.playerShieldHp ?? 0;
        const maxShield = game?.playerShieldMax ?? 50;

        statsStripEl.innerHTML = `
            <div class="field-workbench-stat-pill">
                <span class="field-workbench-stat-pill__label">${t('ui.workbench.stat_tech') || 'TECH / SCRAP'}</span>
                <span class="field-workbench-stat-pill__val">${techVal}</span>
            </div>
            <div class="field-workbench-stat-pill">
                <span class="field-workbench-stat-pill__label">${t('ui.workbench.stat_med') || 'MED SUPPLIES'}</span>
                <span class="field-workbench-stat-pill__val">${medVal}</span>
            </div>
            <div class="field-workbench-stat-pill">
                <span class="field-workbench-stat-pill__label">${t('ui.workbench.stat_coin') || 'COIN'}</span>
                <span class="field-workbench-stat-pill__val">${coinVal}</span>
            </div>
            <div class="field-workbench-stat-pill">
                <span class="field-workbench-stat-pill__label">${t('ui.workbench.stat_shells') || 'SHELLS'}</span>
                <span class="field-workbench-stat-pill__val">◈ ${shellsVal}</span>
            </div>
            <div class="field-workbench-stat-pill">
                <span class="field-workbench-stat-pill__label">${t('ui.workbench.stat_health') || 'HEALTH'}</span>
                <span class="field-workbench-stat-pill__val stat--health">${hp} / ${maxHp}</span>
            </div>
            <div class="field-workbench-stat-pill">
                <span class="field-workbench-stat-pill__label">${t('ui.workbench.stat_shield') || 'SHIELD'}</span>
                <span class="field-workbench-stat-pill__val stat--shield">${shield} / ${maxShield}</span>
            </div>
            <div class="field-workbench-stat-pill">
                <span class="field-workbench-stat-pill__label">${t('ui.workbench.stat_ammo') || 'AMMO'}</span>
                <span class="field-workbench-stat-pill__val stat--ammo">${currentClip} [${totalAmmo}]</span>
            </div>
        `;
    }

    function renderRecipes(recipes = FIELD_WORKBENCH_RECIPES) {
        if (!recipesGridEl) return;
        const game = getGame();
        const bank = (typeof getBank === 'function' ? getBank() : getBank) ?? game?.bank?.getState?.() ?? {};

        recipesGridEl.innerHTML = '';

        for (const recipe of recipes) {
            const { affordable, missing } = checkRecipeAffordability(recipe, bank);
            const card = doc.createElement('div');
            card.className = `field-workbench-card ${affordable ? '' : 'is-unaffordable'}`;

            let costBadgesHtml = '';
            if (recipe.id === 'ammo_pack') {
                const hasTech = (bank.tech ?? bank.scrap ?? 0) >= 15;
                costBadgesHtml = `<span class="field-workbench-cost-tag ${hasTech ? 'is-met' : 'is-missing'}">15 ${t('ui.workbench.stat_tech') || 'TECH'}</span>`;
            } else if (recipe.id === 'med_patch') {
                const hasMed = (bank.med ?? 0) >= 20;
                costBadgesHtml = `<span class="field-workbench-cost-tag ${hasMed ? 'is-met' : 'is-missing'}">20 ${t('ui.workbench.stat_med') || 'MED'}</span>`;
            } else if (recipe.id === 'suit_armor_plate') {
                const hasTech = (bank.tech ?? bank.scrap ?? 0) >= 25;
                costBadgesHtml = `<span class="field-workbench-cost-tag ${hasTech ? 'is-met' : 'is-missing'}">25 ${t('ui.workbench.stat_tech') || 'TECH'}</span>`;
            }

            const buttonLabel = affordable
                ? (t('ui.workbench.craft') || 'CRAFT')
                : (missing[0] ? t('ui.workbench.need_resource', { need: missing[0].need, resource: missing[0].resource.toUpperCase() }) : (t('ui.workbench.deficit') || 'DEFICIT'));

            card.innerHTML = `
                <div class="field-workbench-card__header">
                    <h3 class="field-workbench-card__title">${recipe.name || recipe.fallbackName}</h3>
                    <div class="field-workbench-card__effect">${recipe.effect}</div>
                    <p class="field-workbench-card__desc">${recipe.desc || recipe.fallbackDesc}</p>
                </div>
                <div class="field-workbench-card__actions">
                    <div class="field-workbench-card__cost-container">
                        ${costBadgesHtml}
                    </div>
                </div>
            `;

            const btn = doc.createElement('button');
            btn.type = 'button';
            btn.className = 'field-workbench-craft-btn';
            btn.setAttribute('data-recipe-id', recipe.id);
            if (!affordable) {
                btn.disabled = true;
            }
            btn.textContent = buttonLabel;

            btn.addEventListener('click', () => {
                if (!affordable) return;
                const success = game?.craftFieldRecipe?.(recipe.id);
                if (success) {
                    renderStats();
                    renderRecipes(recipes);
                }
            });

            const actionsDiv = card.querySelector?.('.field-workbench-card__actions') || card;
            actionsDiv.appendChild(btn);

            recipesGridEl.appendChild(card);
        }
    }

    function open(detail = {}) {
        currentCamp = detail;
        previousFocusedElement = doc.activeElement;
        isOpen = true;

        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        }

        if (titleEl) {
            titleEl.textContent = detail.campLabel
                ? `${detail.campLabel} // FIELD WORKBENCH`
                : (t?.('ui.workbench.title') || 'FIELD WORKBENCH');
        }

        if (kickerEl) {
            kickerEl.textContent = detail.campId
                ? `SECTOR ${String(detail.campId).toUpperCase()} // SAFE HAVEN FABRICATION`
                : (t?.('ui.workbench.kicker') || 'CAMP WORKBENCH // FIELD FABRICATION');
        }

        const game = getGame();
        game?.setInputEnabled?.(false);

        renderStats();
        renderRecipes(detail.recipes || FIELD_WORKBENCH_RECIPES);

        // Controller focus: give focus to first craftable button or close button
        const firstActiveBtn = modal?.querySelector('.field-workbench-craft-btn:not(:disabled)') || closeBtn;
        firstActiveBtn?.focus?.();
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        currentCamp = null;

        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }

        const game = getGame();
        game?.setInputEnabled?.(true);

        if (previousFocusedElement && typeof previousFocusedElement.focus === 'function') {
            previousFocusedElement.focus();
        }
    }

    closeBtn?.addEventListener('click', () => close());
    footerCloseBtn?.addEventListener('click', () => close());

    function handleWindowWorkbenchEvent(e) {
        open(e?.detail ?? {});
    }

    function handleKeyDown(e) {
        if (!isOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            close();
        }
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('open-field-workbench', handleWindowWorkbenchEvent);
        window.addEventListener('keydown', handleKeyDown);
    }

    return {
        open,
        close,
        isOpen: () => isOpen,
        getCurrentCamp: () => currentCamp,
        render: () => {
            if (isOpen) {
                renderStats();
                renderRecipes();
            }
        },
        destroy() {
            if (typeof window !== 'undefined') {
                window.removeEventListener('open-field-workbench', handleWindowWorkbenchEvent);
                window.removeEventListener('keydown', handleKeyDown);
            }
        }
    };
}
