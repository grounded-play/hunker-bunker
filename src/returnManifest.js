import { BANK_CURRENCY_KEYS, bankAmounts } from './economyReceipt.js';

const LABELS = Object.freeze({ tech: 'TECH', coin: 'COIN', med: 'MED', shells: 'SHELLS', ammo: 'AMMO' });

export function renderReturnManifest(element, receipt, bank, { victory = false, classType = 'SCOUT', nextAction = null, season = null } = {}) {
    if (!element) return;
    const balance = bankAmounts(bank);
    const earned = bankAmounts(receipt?.earned);
    const spent = bankAmounts(receipt?.spent);
    element.dataset.class = ['SCOUT', 'TANK', 'ENGINEER'].includes(classType) ? classType : 'SCOUT';
    element.innerHTML = `
        <div class="return-manifest__heading"><span>RETURN MANIFEST</span><span>${victory ? 'EXTRACTED' : 'BANK SECURED'}</span></div>
        <div class="return-manifest__columns" aria-hidden="true"><span>RESOURCE</span><span>EARNED</span><span>SPENT</span><span>BANK NOW</span></div>
        ${BANK_CURRENCY_KEYS.filter(key => key !== 'ammo' || balance[key] || earned[key] || spent[key]).map(key => `
            <div class="return-manifest__row" aria-label="${LABELS[key]}: ${receipt ? `${earned[key]} earned, ${spent[key]} spent,` : 'run receipt unavailable,'} ${balance[key]} banked">
                <span>${LABELS[key]}</span><span class="return-manifest__gain">${receipt ? '+' + earned[key] : '—'}</span><span>${receipt ? '−' + spent[key] : '—'}</span><strong>${balance[key]}</strong>
            </div>`).join('')}
        <div class="return-manifest__footnote">${receipt ? 'Earned and spent during this expedition. Bank now includes previous savings.' : 'Run receipt unavailable. Your saved bank is shown.'} ${victory ? 'Ready for your next deployment.' : 'Failure does not remove banked resources.'}</div>`;
    if (season && Number.isSafeInteger(season.xpBefore)) {
        const progress = document.createElement('div');
        progress.className = 'return-manifest__next';
        progress.textContent = `DOSSIER: ${season.xpBefore} → ${season.xpAfter} XP retained. ${season.extractionBonus ? `Extraction bonus: +${season.extractionBonus} XP.` : 'Extraction bonus not earned.'} ${season.pending ? `${season.pending} deliveries pending — retry in Dossier.` : 'No pending deliveries.'}`;
        element.appendChild(progress);
    }
    if (nextAction) {
        const suggestion = document.createElement('div');
        suggestion.className = 'return-manifest__next';
        suggestion.textContent = nextAction;
        element.appendChild(suggestion);
    }
}
