export const BANK_CURRENCY_KEYS = Object.freeze(['tech', 'coin', 'med', 'shells', 'ammo']);

export function bankAmounts(bank = {}) {
    return Object.fromEntries(BANK_CURRENCY_KEYS.map(key => [key,
        Number.isSafeInteger(bank[key]) && bank[key] >= 0 ? bank[key] : 0
    ]));
}

export function describeBankTransaction(before, after) {
    const previous = bankAmounts(before);
    const current = bankAmounts(after);
    return {
        before: previous,
        after: current,
        earned: Object.fromEntries(BANK_CURRENCY_KEYS.map(key => [key, Math.max(0, current[key] - previous[key])])),
        spent: Object.fromEntries(BANK_CURRENCY_KEYS.map(key => [key, Math.max(0, previous[key] - current[key])]))
    };
}

// Presentation receipt only: never used to grant currency or Steam inventory.
// An interrupted session is shown as unavailable until a new expedition begins.
export class ExpeditionReceipt {
    constructor() { this.receipt = null; }

    begin(runId, bank) {
        this.receipt = { runId, active: true, opening: bankAmounts(bank), balance: bankAmounts(bank), earned: bankAmounts(), spent: bankAmounts() };
        return this.snapshot();
    }

    record(transaction) {
        if (!this.receipt?.active || !transaction?.after) return;
        const delta = describeBankTransaction(this.receipt.balance, transaction.after);
        for (const key of BANK_CURRENCY_KEYS) {
            this.receipt.earned[key] += delta.earned[key];
            this.receipt.spent[key] += delta.spent[key];
        }
        this.receipt.balance = delta.after;
    }

    finish() {
        if (this.receipt) this.receipt.active = false;
        return this.snapshot();
    }

    snapshot() {
        if (!this.receipt) return null;
        return { ...this.receipt, opening: { ...this.receipt.opening }, balance: { ...this.receipt.balance }, earned: { ...this.receipt.earned }, spent: { ...this.receipt.spent } };
    }
}
