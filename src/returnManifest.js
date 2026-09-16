import { BANK_CURRENCY_KEYS, bankAmounts } from './economyReceipt.js';
import { t } from './i18n.js';

const LABELS = Object.freeze({ tech: 'TECH', coin: 'COIN', med: 'MED', shells: 'SHELLS', ammo: 'AMMO' });

export function renderReturnManifest(element, receipt, bank, { victory = false, classType = 'SCOUT', nextAction = null, season = null } = {}) {
    if (!element) return;
    const balance = bankAmounts(bank);
    const earned = bankAmounts(receipt?.earned);
    const spent = bankAmounts(receipt?.spent);
    element.dataset.class = ['SCOUT', 'TANK', 'ENGINEER'].includes(classType) ? classType : 'SCOUT';
    element.innerHTML = `
        <div class="return-manifest__heading"><span>${t('ui.manifest.title')}</span><span>${victory ? t('ui.manifest.extracted') : t('ui.manifest.bank_secured')}</span></div>
        <div class="return-manifest__columns" aria-hidden="true"><span>${t('ui.manifest.col_resource')}</span><span>${t('ui.manifest.col_earned')}</span><span>${t('ui.manifest.col_spent')}</span><span>${t('ui.manifest.col_bank_now')}</span></div>
        ${BANK_CURRENCY_KEYS.filter(key => key !== 'ammo' || balance[key] || earned[key] || spent[key]).map(key => `
            <div class="return-manifest__row" aria-label="${LABELS[key]}: ${receipt ? `${earned[key]} earned, ${spent[key]} spent,` : 'run receipt unavailable,'} ${balance[key]} banked">
                <span>${LABELS[key]}</span><span class="return-manifest__gain">${receipt ? '+' + earned[key] : '—'}</span><span>${receipt ? '−' + spent[key] : '—'}</span><strong>${balance[key]}</strong>
            </div>`).join('')}
        <div class="return-manifest__footnote">${receipt ? t('ui.manifest.consolidated') : t('ui.manifest.receipt_unavailable')} ${victory ? t('ui.manifest.ready_next') : t('ui.manifest.preserved_on_failure')}</div>`;
    if (season && Number.isSafeInteger(season.xpBefore)) {
        const progress = document.createElement('div');
        progress.className = 'return-manifest__next return-manifest__next--dossier';
        const gain = season.xpAfter - season.xpBefore;
        progress.innerHTML = `<div class="return-manifest__dossier-pills">
            <span class="manifest-pill manifest-pill--tag">${t('ui.manifest.dossier')}</span>
            <span class="manifest-pill manifest-pill--xp">+${gain >= 0 ? gain : 0} XP (${season.xpBefore} → ${season.xpAfter})</span>
            ${season.extractionBonus ? `<span class="manifest-pill manifest-pill--bonus">+${season.extractionBonus} BONUS</span>` : ''}
            <span class="manifest-pill manifest-pill--sync">${season.pending ? t('ui.manifest.pending', { count: season.pending }) : t('ui.manifest.synced')}</span>
        </div>`;
        element.appendChild(progress);
    }
    if (nextAction) {
        const suggestion = document.createElement('div');
        suggestion.className = 'return-manifest__next';
        suggestion.textContent = nextAction;
        element.appendChild(suggestion);
    }
}
