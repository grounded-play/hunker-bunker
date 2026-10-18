import { t } from './i18n.js';
import {
    generateRecalibrationChoices,
    checkRecalibrationAffordability,
    RECALIBRATION_REROLL_COST
} from './fieldRecalibration.js';
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

    let activeTab = 'supplies';
    const tabSuppliesBtn = doc.getElementById('workbench-tab-supplies');
    const tabRecalibrationBtn = doc.getElementById('workbench-tab-recalibration');
    const suppliesSection = doc.getElementById('field-workbench-supplies-section');
    const recalibrationSection = doc.getElementById('field-workbench-recalibration-section');
    const recalibrationHeaderEl = doc.getElementById('field-workbench-recalibration-header');
    const recalibrationGridEl = doc.getElementById('field-workbench-recalibration-grid');

    function setTab(tab) {
        activeTab = tab;
        if (tab === 'supplies') {
            tabSuppliesBtn?.classList?.add('is-active');
            tabRecalibrationBtn?.classList?.remove('is-active');
            tabSuppliesBtn?.setAttribute('aria-selected', 'true');
            tabRecalibrationBtn?.setAttribute('aria-selected', 'false');
        } else {
            tabSuppliesBtn?.classList?.remove('is-active');
            tabRecalibrationBtn?.classList?.add('is-active');
            tabSuppliesBtn?.setAttribute('aria-selected', 'false');
            tabRecalibrationBtn?.setAttribute('aria-selected', 'true');
        }
        if (suppliesSection) {
            if (tab === 'supplies') {
                suppliesSection.classList.remove('hidden');
            } else {
                suppliesSection.classList.add('hidden');
            }
        }
        if (recalibrationSection) {
            if (tab === 'recalibration') {
                recalibrationSection.classList.remove('hidden');
                renderRecalibration();
            } else {
                recalibrationSection.classList.add('hidden');
            }
        }
    }

    tabSuppliesBtn?.addEventListener('click', () => setTab('supplies'));
    tabRecalibrationBtn?.addEventListener('click', () => setTab('recalibration'));

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

    function renderRecalibration() {
        if (!recalibrationGridEl) return;
        const game = getGame();
        const campId = currentCamp?.campId || 'camp-default';
        const isRecalibrated = currentCamp?.recalibrated || game?.isCampRecalibrated?.(campId) || false;
        const bank = (typeof getBank === 'function' ? getBank() : getBank) ?? game?.bank?.getState?.() ?? {};
        const availableTech = Number(bank.tech ?? bank.scrap) || 0;

        if (recalibrationHeaderEl) {
            const statusBadgeText = isRecalibrated
                ? t('ui.workbench.recalibration_consumed', {}, 'RECALIBRATION CONSUMED (1/1 USED)')
                : t('ui.workbench.recalibration_ready', {}, 'RECALIBRATION PROTOCOL READY (1 PER CAMP)');
            const canReroll = !isRecalibrated && availableTech >= RECALIBRATION_REROLL_COST.tech;

            recalibrationHeaderEl.innerHTML = `
                <div class="field-workbench-camp-badge ${isRecalibrated ? 'is-consumed' : ''}">
                    ${statusBadgeText}
                </div>
                <button type="button" class="field-workbench-reroll-btn" id="workbench-reroll-btn" ${canReroll ? '' : 'disabled'}>
                    ${t('ui.workbench.reroll_matrix', { cost: RECALIBRATION_REROLL_COST.tech }, `REROLL MATRIX (${RECALIBRATION_REROLL_COST.tech} TECH)`)}
                </button>
            `;

            const rerollBtn = recalibrationHeaderEl.querySelector('#workbench-reroll-btn');
            rerollBtn?.addEventListener('click', () => {
                if (!canReroll) return;
                const newChoices = game?.rerollFieldRecalibration?.(campId);
                if (newChoices) {
                    if (currentCamp) currentCamp.recalibrationChoices = newChoices;
                    renderStats();
                    renderRecalibration();
                }
            });
        }

        let choices = currentCamp?.recalibrationChoices;
        if (!choices || !choices.length) {
            choices = game?.getRecalibrationChoices?.(campId) || generateRecalibrationChoices({
                campId,
                equippedOverclocks: game?.equippedOverclocks || [],
                equippedRelics: game?.equippedRelics || [],
                rerollCount: 0,
                runEntropy: game?.runEntropy || 0
            });
            if (currentCamp) currentCamp.recalibrationChoices = choices;
        }

        recalibrationGridEl.innerHTML = '';

        for (const choice of choices) {
            const { affordable, missing } = checkRecalibrationAffordability(choice.cost, bank);
            const card = doc.createElement('div');
            card.className = `field-workbench-card ${choice.isFusion ? 'field-workbench-card--fusion' : ''} ${affordable && !isRecalibrated ? '' : 'is-unaffordable'}`;

            let costBadgesHtml = '';
            for (const [res, amount] of Object.entries(choice.cost || {})) {
                const available = Number(bank[res] ?? (res === 'tech' ? bank.scrap : 0)) || 0;
                const met = available >= amount;
                costBadgesHtml += `<span class="field-workbench-cost-tag ${met ? 'is-met' : 'is-missing'}">${amount} ${res.toUpperCase()}</span>`;
            }

            const fusionBadgeHtml = choice.isFusion
                ? `<div class="field-workbench-fusion-tag">${t('ui.workbench.fusion_tag', {}, 'CRYO + BIO FUSION')}</div>`
                : '';

            const diffRows = (choice.preview?.afterStats || []).map((row) => `
                <div class="field-workbench-diff-row ${row.highlight ? 'is-highlight' : ''}">
                    <span class="field-workbench-diff-label">${row.label}</span>
                    <span class="field-workbench-diff-val ${row.diff ? 'diff--positive' : ''}">${row.value}</span>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="field-workbench-card__header">
                    ${fusionBadgeHtml}
                    <h3 class="field-workbench-card__title">${t(choice.nameKey, {}, choice.name)}</h3>
                    <div class="field-workbench-card__effect">${choice.element
                        ? t('ui.workbench.element_overclock', { element: choice.element.toUpperCase() }, `${choice.element.toUpperCase()} OVERCLOCK`)
                        : t('ui.workbench.weapon_overclock', {}, 'WEAPON OVERCLOCK')}</div>
                    <p class="field-workbench-card__desc">${choice.description}</p>
                    <div class="field-workbench-diff-box">
                        ${diffRows}
                    </div>
                </div>
                <div class="field-workbench-card__actions">
                    <div class="field-workbench-card__cost-container">
                        ${costBadgesHtml}
                    </div>
                </div>
            `;

            const btn = doc.createElement('button');
            btn.type = 'button';
            btn.className = 'field-workbench-craft-btn field-workbench-recalibrate-btn';
            btn.setAttribute('data-choice-id', choice.id);

            if (isRecalibrated) {
                btn.disabled = true;
                btn.textContent = t('ui.workbench.calibration_used', {}, 'CAMP CALIBRATION USED');
            } else if (!affordable) {
                btn.disabled = true;
                btn.textContent = missing[0]
                    ? t('ui.workbench.need_resource', { need: missing[0].need, resource: missing[0].resource.toUpperCase() })
                    : (t('ui.workbench.deficit') || 'DEFICIT');
            } else {
                btn.textContent = choice.isFusion
                    ? t('ui.workbench.synthesize_fusion', {}, 'SYNTHESIZE FUSION')
                    : t('ui.workbench.install_recalibration', {}, 'INSTALL RECALIBRATION');
            }

            btn.addEventListener('click', () => {
                if (!affordable || isRecalibrated) return;
                const result = game?.recalibrateFieldWeapon?.(choice.id, campId);
                if (result) {
                    if (currentCamp) currentCamp.recalibrated = true;
                    renderStats();
                    renderRecalibration();
                }
            });

            const actionsDiv = card.querySelector?.('.field-workbench-card__actions') || card;
            actionsDiv.appendChild(btn);
            recalibrationGridEl.appendChild(card);
        }
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

        setTab('supplies');
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
        } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight')
            && (e.target === tabSuppliesBtn || e.target === tabRecalibrationBtn)) {
            // Preserve normal Tab focus traversal; arrow keys switch an active tab.
            if (e.target?.tagName !== 'INPUT') {
                e.preventDefault();
                setTab(activeTab === 'supplies' ? 'recalibration' : 'supplies');
                (activeTab === 'supplies' ? tabSuppliesBtn : tabRecalibrationBtn)?.focus?.();
            }
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
        getActiveTab: () => activeTab,
        setTab,
        render: () => {
            if (isOpen) {
                renderStats();
                if (activeTab === 'supplies') {
                    renderRecipes();
                } else {
                    renderRecalibration();
                }
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
