/**
 * Fabrication Bay presentation: the field print, Foundry activation, the
 * recipe grid, the print ticker, the roll reveal, and opening/closing the bay
 * (which ends a camp rest when one is open).
 *
 * Extracted from main.js (S49-38). main.js keeps the menu buttons, the Foundry
 * hub and the game events that open the bay; this module owns the bay's DOM,
 * timers and listeners, and dispose() releases all of them. Environmental
 * pieces are injected, so it is testable without a browser.
 */
import { assetUrl } from './assetUrl.js';
import { FOUNDRY_ACTIVATION_COST } from './bank.js';
import { describeFieldWeapon } from './fieldWeapon.js';
import {
    FAB_RECIPES, FAB_SPIN_COST, FABRICATOR_SITE_MAX_USES,
    applyFabricatedRecipeOutput, describeRecipe, getFabricationOdds
} from './fabricator.js';

const RESOURCES = [['tech', 'TECH'], ['coin', 'COIN'], ['med', 'MED']];
const TICK_MS = 500;
const REVEAL_MS = 3300;
const RARITY_TILES = ['COMMON', 'UNCOMMON', 'RARE', 'COMMON', 'RARE', 'EPIC', 'RARE', 'UNCOMMON', 'EPIC', 'LEGENDARY'];

function bankAmount(bank, key) {
    const value = Number(bank?.[key]);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function fabCostMarkup(cost) {
    const parts = [];
    if (cost.tech) parts.push(`<span class="fab-cost-chip">⬢ ${cost.tech}</span>`);
    if (cost.coin) parts.push(`<span class="fab-cost-chip">◎ ${cost.coin}</span>`);
    if (cost.med) parts.push(`<span class="fab-cost-chip">✚ ${cost.med}</span>`);
    return parts.join('');
}

export function fabCostText(cost, bank, { showHaveNeed = false } = {}) {
    const parts = [];
    for (const [key, label] of RESOURCES) {
        const need = Number(cost?.[key] ?? 0);
        if (!Number.isFinite(need) || need <= 0) continue;
        const normalizedNeed = Math.floor(need);
        const have = bankAmount(bank, key);
        parts.push(showHaveNeed ? `${label} ${have}/${normalizedNeed}` : `${normalizedNeed} ${label}`);
    }
    return parts.length ? parts.join(' / ') : 'NO COST';
}

export function fabMissingResourceText(cost, bank) {
    const missing = [];
    for (const [key, label] of RESOURCES) {
        const need = Number(cost?.[key] ?? 0);
        if (!Number.isFinite(need) || need <= 0) continue;
        const delta = Math.max(0, Math.floor(need) - bankAmount(bank, key));
        if (delta > 0) missing.push(`${delta} ${label}`);
    }
    return missing.length ? `NEED ${missing.join(' / ')}` : '';
}

/**
 * @param {object} deps
 * @param {Document} [deps.doc]
 * @param {(key: string, vars?: object) => string} deps.t
 * @param {object} deps.fabricator      FabricatorManager
 * @param {object} deps.bankManager     BankManager
 * @param {object} deps.loadout         LoadoutManager
 * @param {() => object|null} deps.getGame
 * @param {(sound: string, options?: object) => void} deps.playSound
 * @param {(event: string, detail: object) => void} deps.log
 * @param {(el: Element|null) => void} deps.focus
 * @param {(modal: Element|null) => Element|null} deps.getPreferredFocus
 * @param {() => void} deps.updateMenuStatuses
 * @param {() => void} deps.syncEquippedWeaponLabel
 * @param {() => void} deps.syncOutputOwnership
 * @param {(text: string) => void} deps.showPrompt
 * @param {() => void} deps.onFoundryActivated
 * @param {() => boolean} deps.isHubEnabled
 * @param {(tab: string) => void} deps.openHub
 * @param {(fn: () => void) => void} [deps.requestFrame]
 * @param {(el: Element) => CSSStyleDeclaration} [deps.getComputedStyle]
 * @param {EventTarget} [deps.eventTarget]  where fabrication-* events arrive
 * @param {(sound: string, rarity: string) => void} [deps.playLoot]
 */
export function createFabricationBay({
    doc = globalThis.document,
    t,
    fabricator,
    bankManager,
    loadout,
    getGame = () => null,
    playSound = () => {},
    playLoot = () => {},
    log = () => {},
    focus = () => {},
    getPreferredFocus = () => null,
    updateMenuStatuses = () => {},
    syncEquippedWeaponLabel = () => {},
    syncOutputOwnership = () => {},
    showPrompt = () => {},
    onFoundryActivated = () => {},
    isHubEnabled = () => false,
    openHub = () => {},
    requestFrame = (fn) => globalThis.requestAnimationFrame(fn),
    getComputedStyle = (el) => globalThis.getComputedStyle(el),
    eventTarget = globalThis.window
}) {
    let ticker = null;
    let rolling = false;
    let revealTimer = null;
    let campRestOpen = false;
    const attached = [];
    const byId = (id) => doc.getElementById(id);
    const costText = (cost, bank = bankManager.getState(), options) => fabCostText(cost, bank, options);
    const missingText = (cost, bank = bankManager.getState()) => fabMissingResourceText(cost, bank);

    // What a recipe prints, as the shared item catalog shows it. A fabricated
    // weapon is a firing profile fitted to the active class's gun, so it wears
    // that gun's picture.
    function itemView(recipe) {
        const classId = loadout.activeClassId;
        const options = { classId, frameId: `frame:${loadout.getClassLoadout(classId)?.archetypeId ?? ''}` };
        const view = describeRecipe(recipe, options);
        return { id: view?.id ?? null, name: view?.name ?? recipe?.name ?? '', icon: view?.icon ?? '/favicon.png' };
    }

    // A Foundry weapon's effect on the class gun, as chips: the multipliers
    // combat applies (src/fieldWeapon.js), so every weapon card reads differently
    // even though they all fit the same gun.
    function weaponStatsMarkup(recipe) {
        const stats = recipe?.output?.kind === 'weapon' ? describeFieldWeapon(recipe.id) : null;
        if (!stats) return '';
        const mult = (value) => (Math.round(value * 100) / 100).toFixed(2).replace(/0$/, '');
        const tone = (value) => (value > 1.001 ? 'up' : value < 0.999 ? 'down' : 'flat');
        const chip = (key, value, vars) => `<span class="fab-stat fab-stat--${tone(value)}">${t(key, vars)}</span>`;
        return `<div class="fab-stats">${[
            chip('ui.fab.stat_damage', stats.damage, { value: mult(stats.damage) }),
            chip('ui.fab.stat_rate', stats.fireRate, { value: mult(stats.fireRate) }),
            chip('ui.fab.stat_range', stats.range, { value: mult(stats.range) }),
            stats.projectiles > 1 ? chip('ui.fab.stat_shots', 2, { count: stats.projectiles }) : ''
        ].join('')}</div>`;
    }

    function logRecipe(event, recipe, extra = {}) {
        const view = recipe ? itemView(recipe) : null;
        log(event, { recipeId: recipe?.id ?? null, item: view?.id ?? null, itemName: view?.name ?? null, rarity: recipe?.rarity ?? null, icon: view?.icon ?? null, classId: loadout.activeClassId, ...extra });
    }

    function renderFieldPrint(grid, bank) {
        const recipe = FAB_RECIPES.find((entry) => entry.id === 'scatter_rep');
        if (!recipe) return;
        const cost = fabricator.getEffectiveCost(recipe);
        const fabricated = fabricator.isFabricated(recipe.id);
        const printing = fabricator.isPrinting(recipe.id);
        const equipped = loadout.getEquippedId() === recipe.id;
        const panel = doc.createElement('div');
        panel.className = 'fab-activation-panel';
        panel.innerHTML = `<div class="fab-activation-panel__kicker">GUARANTEED FIELD PRINT · ALL CLASSES</div>
        <div class="fab-activation-panel__title">${t('ui.fab.scatter_repeater')}</div>
        <p>Three close-range projectiles per shot; shorter reach. Equip for your next deployment. No Foundry activation needed for this field schematic.</p>
        <div class="fab-activation-panel__cost">${costText(cost, bank, { showHaveNeed: !bankManager.canAfford(cost) })}</div>`;
        const button = doc.createElement('button');
        button.id = 'season-field-print';
        button.className = 'fab-card__btn';
        button.textContent = fabricated ? (equipped ? t('ui.fab.equipped_next_run') : t('ui.fab.equip_scatter')) : printing ? t('ui.fab.printing') : bankManager.canAfford(cost) ? 'PRINT SCATTER REPEATER' : missingText(cost, bank);
        button.disabled = printing || equipped || (!fabricated && !bankManager.canAfford(cost));
        button.addEventListener('click', () => {
            try {
                if (fabricated) { loadout.equip(recipe.id, fabricator); syncEquippedWeaponLabel(); } else { fabricator.startPrint(recipe.id, bankManager); startTicker(); }
                render();
            } catch { button.textContent = t('ui.fab.save_pending'); }
        });
        panel.appendChild(button);
        grid.appendChild(panel);
    }

    function renderFoundryActivationPanel(grid, bank) {
        if (bankManager.isFoundryActivated()) return false;
        const canActivate = bankManager.canActivateFoundry();
        const missing = missingText(FOUNDRY_ACTIVATION_COST, bank);
        const panel = doc.createElement('div');
        panel.className = 'fab-activation-panel';
        panel.innerHTML = `
        <div class="fab-activation-panel__kicker">${t('ui.fab.foundry_required')}</div>
        <div class="fab-activation-panel__title">${t('ui.fab.activate_bay')}</div>
        <div class="fab-activation-panel__desc">${t('ui.fab.bring_online')}</div>
        <div class="fab-activation-panel__cost">${costText(FOUNDRY_ACTIVATION_COST, bank, { showHaveNeed: !canActivate })}</div>
        <div class="fab-activation-panel__hint">${canActivate ? 'READY TO ACTIVATE' : missing}</div>
    `;
        const btn = doc.createElement('button');
        btn.id = 'fab-activate-btn';
        btn.className = 'fab-card__btn';
        btn.disabled = !canActivate;
        btn.textContent = canActivate ? t('ui.fab.activate_foundry') : missing;
        if (!canActivate) btn.classList.add('fab-card__btn--locked');
        btn.addEventListener('click', () => {
            if (bankManager.activateFoundry()) {
                playSound('class_lock', { volume: 0.55 });
                render();
                onFoundryActivated();
                requestFrame(() => focus(byId('fab-roll-btn')));
            } else {
                playSound('ui_error', { volume: 0.5 });
                render();
            }
        });
        panel.appendChild(btn);
        grid.appendChild(panel);
        return true;
    }

    function renderRecipeCard(grid, recipe, bank) {
        const fabricated = fabricator.isFabricated(recipe.id);
        // These are real current-run outputs, not concept collection cards.
        const rarity = (recipe.rarity ?? 'COMMON').toLowerCase();
        const card = doc.createElement('div');
        card.className = ['fab-card', `fab-card--${rarity}`, fabricated ? 'fab-card--done' : 'fab-card--locked'].join(' ');

        const art = doc.createElement('div');
        art.className = 'fab-card__art';
        const img = doc.createElement('img');
        const view = itemView(recipe);
        img.loading = 'lazy'; img.decoding = 'async'; img.alt = view.name; img.src = assetUrl(view.icon);
        img.addEventListener('error', () => { img.src = assetUrl('/bunker_junk_rare.png'); }, { once: true });
        art.appendChild(img);
        const rarityTag = doc.createElement('span');
        rarityTag.className = 'fab-card__rarity';
        rarityTag.textContent = recipe.rarity ?? t('ui.fab.common');
        art.appendChild(rarityTag);
        card.appendChild(art);

        const name = doc.createElement('div');
        name.className = 'fab-card__name';
        name.innerHTML = `<span class="fab-card__klass">${recipe.klass}</span>${view.name}`;
        card.appendChild(name);

        const description = doc.createElement('div');
        description.className = 'fab-card__description';
        description.textContent = recipe.blurb;
        card.appendChild(description);
        const stats = weaponStatsMarkup(recipe);
        if (stats) card.insertAdjacentHTML('beforeend', stats);

        const status = doc.createElement('div');
        status.className = 'fab-card__status';
        status.textContent = fabricated ? t('ui.fab.ready_to_apply') : fabricator.isPrinting(recipe.id)
            ? `PRINTING ${Math.round(fabricator.getPrintProgress(recipe.id) * 100)}%`
            : `PRINT COST · ${costText(fabricator.getEffectiveCost(recipe), bank)}`;
        card.appendChild(status);

        const addApplyButton = (label, replaceSlot = null) => {
            const button = doc.createElement('button');
            button.className = 'fab-card__btn';
            button.textContent = label;
            button.addEventListener('click', () => {
                syncOutputOwnership();
                const result = applyFabricatedRecipeOutput(recipe, {
                    fabricator,
                    loadout,
                    game: getGame(),
                    classId: loadout.activeClassId,
                    replaceSlot
                });
                logRecipe(result.ok ? 'output-applied' : 'output-rejected', recipe, { granted: result.id ?? result.itemdefid ?? null, slot: result.slot ?? null, reason: result.reason ?? null });
                if (result.ok) {
                    playSound('class_lock', { volume: 0.55 });
                    syncEquippedWeaponLabel();
                    render();
                } else {
                    button.textContent = result.reason === 'slot_conflict' ? t('ui.fab.choose_bay') : t('ui.fab.apply_failed');
                    playSound('ui_error', { volume: 0.5 });
                }
            });
            card.appendChild(button);
        };

        if (fabricated) {
            const output = recipe.output ?? { kind: 'weapon' };
            const current = loadout.getClassLoadout(loadout.activeClassId);
            if (output.kind === 'weapon') {
                const equipped = loadout.getEquippedId(loadout.activeClassId) === recipe.id;
                if (!equipped) addApplyButton('EQUIP NOW');
                else status.textContent = t('ui.fab.equipped_current');
            } else if (output.kind === 'charm') {
                const equipped = String(current.charmId ?? '') === String(output.itemdefid);
                if (!equipped) addApplyButton(current.charmId ? `REPLACE CHARM ${current.charmId}` : 'MOUNT CHARM NOW');
                else status.textContent = t('ui.fab.mounted_current');
            } else if (output.kind === 'mod') {
                const equippedSlot = [current.mod1Id, current.mod2Id].findIndex((id) => String(id ?? '') === String(output.itemdefid));
                if (equippedSlot >= 0) status.textContent = t('ui.fab.active_in_bay', { bay: equippedSlot === 0 ? 'A' : 'B' });
                else if (!current.mod1Id || !current.mod2Id) addApplyButton('INSTALL IN OPEN BAY');
                else {
                    addApplyButton(`REPLACE BAY A · ${current.mod1Id}`, 1);
                    addApplyButton(`REPLACE BAY B · ${current.mod2Id}`, 2);
                }
            }
        } else {
            const cost = fabricator.getEffectiveCost(recipe);
            const printing = fabricator.isPrinting(recipe.id);
            const button = doc.createElement('button');
            button.className = 'fab-card__btn';
            button.disabled = printing || !fabricator.canFabricate(recipe.id, bankManager);
            button.textContent = printing ? t('ui.fab.printing') : bankManager.canAfford(cost) ? t('ui.fab.print_output') : missingText(cost, bank);
            button.addEventListener('click', () => {
                if (!fabricator.startPrint(recipe.id, bankManager)) return;
                startTicker();
                render();
            });
            card.appendChild(button);
        }
        grid.appendChild(card);
    }

    function render() {
        const grid = byId('fab-recipe-grid');
        if (!grid) return;
        const bank = bankManager.getState();
        updateMenuStatuses();
        const setTxt = (id, v) => { const el = byId(id); if (el) el.textContent = v; };
        setTxt('fab-bank-tech', bank.tech ?? 0);
        setTxt('fab-bank-coin', bank.coin ?? 0);
        setTxt('fab-bank-med', bank.med ?? 0);
        setTxt('fab-bank-shells', bank.shells ?? 0);

        const rollPanel = byId('fab-roll-panel');
        grid.innerHTML = '';
        if (!bankManager.isFoundryActivated()) renderFieldPrint(grid, bank);
        if (renderFoundryActivationPanel(grid, bank)) {
            rollPanel?.classList.add('hidden');
            setTxt('fab-summary', `FOUNDRY ACTIVATION: ${costText(FOUNDRY_ACTIVATION_COST, bank, { showHaveNeed: !bankManager.canActivateFoundry() })}`);
            return;
        }

        // Bay is online: show the roll panel and sync the roll button.
        rollPanel?.classList.remove('hidden');
        const rollBtn = byId('fab-roll-btn');
        if (rollBtn && !rolling) {
            const canRoll = fabricator.canRoll(bankManager);
            const objective = fabricator.getObjectiveState();
            rollBtn.disabled = !canRoll;
            rollBtn.classList.toggle('fab-roll-btn--locked', !canRoll);
            rollBtn.innerHTML = canRoll
                ? `FABRICATE TARGET &nbsp;·&nbsp; ${fabCostMarkup(FAB_SPIN_COST)}`
                : objective.siteUsesRemaining <= 0
                    ? 'FABRICATOR BROKEN — FOLLOW NEXT SIGNAL'
                    : `INSUFFICIENT SALVAGE &nbsp;·&nbsp; ${costText(FAB_SPIN_COST, bank, { showHaveNeed: true })}`;
        }

        // The odds the roll uses, shown before the player spends (decision 10).
        const oddsEl = byId('fab-odds');
        if (oddsEl) {
            oddsEl.innerHTML = `<span class="fab-odds__label">${t('ui.fab.odds')}</span>`
                + getFabricationOdds().map(({ rarity, chance }) => `<span class="fab-odds__tier fab-odds__tier--${rarity.toLowerCase()}">${t(`rarity.${rarity.toLowerCase()}`)} ${Math.round(chance * 100)}%</span>`).join('');
        }

        for (const recipe of FAB_RECIPES) renderRecipeCard(grid, recipe, bank);

        const objective = fabricator.getObjectiveState();
        const targetName = objective.targetRecipe ? itemView(objective.targetRecipe).name : 'ALL TARGETS COMPLETE';
        const pct = Math.round((objective.chance ?? 1) * 100);
        setTxt('fab-summary', objective.complete
            ? `SCHEMATICS FABRICATED: ${fabricator.getFabricatedCount()} / ${FAB_RECIPES.length}`
            : `TARGET: ${targetName} · ODDS ${pct}% · USES ${objective.siteUsesRemaining}/${FABRICATOR_SITE_MAX_USES}`);
    }

    function anyPrinting() {
        return FAB_RECIPES.some((recipe) => fabricator.isPrinting(recipe.id));
    }

    function startTicker() {
        if (ticker) return;
        ticker = setInterval(() => {
            fabricator.tickPrints();
            render();
            if (!anyPrinting()) stopTicker();
        }, TICK_MS);
    }

    function stopTicker() {
        if (ticker) { clearInterval(ticker); ticker = null; }
    }

    // Fabricator gamba reveal (T7): a strip of rarity tiles spins and the
    // winner lands under the marker.
    function roll() {
        if (rolling) return;
        const result = fabricator.rollFabrication(bankManager);
        if (!result) { playSound('ui_error', { volume: 0.5 }); return; }

        rolling = true;
        const reveal = byId('fab-reveal');
        const strip = byId('fab-reveal-strip');
        const cardEl = byId('fab-reveal-card');
        const rollBtn = byId('fab-roll-btn');
        if (rollBtn) { rollBtn.disabled = true; rollBtn.textContent = t('ui.fab.fabricating'); }
        playSound('door_gears_spin', { volume: 0.4 });

        const WIN_INDEX = 42;
        const tiles = [];
        for (let i = 0; i < 58; i++) {
            tiles.push(i === WIN_INDEX ? result.rarity : RARITY_TILES[Math.floor(Math.random() * RARITY_TILES.length)]);
        }
        if (strip) {
            strip.innerHTML = tiles.map((r) => `<div class="fab-tile fab-tile--${r.toLowerCase()}">${r}</div>`).join('');
            strip.style.transition = 'none';
            strip.style.transform = 'translateX(0)';
            void strip.offsetWidth; // Force a layout so the next transition applies.
        }
        if (reveal) reveal.dataset.state = 'spinning';
        if (cardEl) cardEl.innerHTML = '';

        requestFrame(() => {
            if (!strip) return;
            const wrap = byId('fab-reveal-strip-wrap');
            const tileRect = strip.firstElementChild?.getBoundingClientRect?.();
            const computedStyle = getComputedStyle(strip);
            const tileWidth = tileRect?.width ?? 92;
            const tileGap = parseFloat(computedStyle.columnGap || computedStyle.gap || '0') || 0;
            const paddingLeft = parseFloat(computedStyle.paddingLeft || '0') || 0;
            const center = (wrap?.clientWidth ?? 320) / 2;
            const step = tileWidth + tileGap;
            const target = center - (paddingLeft + (WIN_INDEX * step) + (tileWidth / 2));
            strip.style.transition = 'transform 3.2s cubic-bezier(0.12, 0.8, 0.18, 1)';
            strip.style.transform = `translateX(${target}px)`;
        });

        revealTimer = setTimeout(() => {
            revealTimer = null;
            const r = result.rarity;
            const rec = result.recipe;
            const view = itemView(rec);
            if (reveal) reveal.dataset.state = 'revealed';
            if (cardEl) {
                cardEl.className = `fab-reveal__card fab-reveal__card--${r.toLowerCase()}`;
                cardEl.innerHTML =
                    `<img class="fab-reveal__art" src="${assetUrl(view.icon)}" alt="${view.name}" onerror="this.src='/bunker_junk_rare.png'">`
                    + `<div class="fab-reveal__rarity">${r}${result.duplicate ? ' · DUPLICATE' : ''}</div>`
                    + `<div class="fab-reveal__name">${view.name}</div>`
                    + weaponStatsMarkup(rec)
                    + `<div class="fab-reveal__klass">${rec.klass}${result.objectiveHit ? ' · OBJECTIVE FABRICATED' : result.duplicate ? ' · ALREADY OWNED' : ' · SCHEMATIC UNLOCKED'}${result.broken ? ' · FABRICATOR BROKE' : ''}</div>`;
            }
            playLoot('weapon', r.toLowerCase());
            if (result.objectiveHit) showPrompt(`> FABRICATOR: ${view.name} OBJECTIVE PRINT COMPLETE.`);
            if (result.broken) {
                showPrompt('> FABRICATOR: PRINT HEAD FAILURE. PARTIAL REFUND ISSUED. FOLLOW NEW SIGNAL.');
                getGame()?.revealFoundry?.({ randomEdge: true });
            }
            rolling = false;
            render();
        }, REVEAL_MS);
    }

    function open() {
        if (isHubEnabled()) {
            openHub('fabricate');
            return;
        }
        fabricator.tickPrints();
        render();
        const modal = byId('fabrication-modal');
        if (modal) { modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false'); }
        requestFrame(() => focus(getPreferredFocus(modal)));
        if (anyPrinting()) startTicker();
    }

    // Leaving the Fab Bay, or the Foundry hub that shows it, ends a camp rest.
    function finishSession() {
        stopTicker();
        if (campRestOpen) {
            campRestOpen = false;
            getGame()?.finishCampRest?.();
        }
    }

    function close() {
        const modal = byId('fabrication-modal');
        if (modal) { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
        finishSession();
    }

    function beginCampRest() {
        campRestOpen = true;
    }

    function listen(target, type, handler) {
        if (!target?.addEventListener) return;
        target.addEventListener(type, handler);
        attached.push([target, type, handler]);
    }

    // The roll button and the fabrication telemetry events.
    function attach() {
        listen(byId('fab-roll-btn'), 'click', roll);
        listen(eventTarget, 'fabrication-started', (event) => logRecipe('print-started', event.detail?.recipe));
        listen(eventTarget, 'fabrication-complete', (event) => logRecipe('print-complete', event.detail?.recipe));
        listen(eventTarget, 'fabrication-rolled', (event) => logRecipe('roll-revealed', event.detail?.recipe, {
            duplicate: Boolean(event.detail?.duplicate),
            objectiveHit: Boolean(event.detail?.objectiveHit),
            broken: Boolean(event.detail?.broken)
        }));
    }

    function dispose() {
        stopTicker();
        if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
        rolling = false;
        for (const [target, type, handler] of attached) target.removeEventListener(type, handler);
        attached.length = 0;
    }

    return {
        render, open, close, finishSession, beginCampRest, roll,
        isRolling: () => rolling, startTicker, stopTicker, attach, dispose
    };
}
