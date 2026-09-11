import { planDeterministicCraft } from './craftingMatrix.js';
import { SEASON_ONE } from './data/seasonOneConfig.js';

export const LOCAL_VAULT_KEY = 'hb_dev_vault_inventory_v1';

// Local browser inventory only. Items, input consumption and receipts commit in
// one storage write; this record is never sent to the Steam service.
export class LocalVaultLedger {
    constructor(storage) { this.storage = storage; }
    read() {
        const parsed = JSON.parse(this.storage.getItem(LOCAL_VAULT_KEY) ?? 'null');
        if (Array.isArray(parsed)) return { items: parsed, receipts: {} };
        return parsed ?? { items: [], receipts: {} };
    }
    save(record) { this.storage.setItem(LOCAL_VAULT_KEY, JSON.stringify(record)); }
    grant(itemdefid, quantity, receiptId) {
        if (!Number.isSafeInteger(itemdefid) || !Number.isSafeInteger(quantity) || quantity < 1 || !receiptId) return { ok: false };
        const next = this.read();
        if (next.receipts[receiptId]) return { ok: true, duplicate: true, items: next.items };
        next.items.push({ itemId: `local:${receiptId}`, itemdefid, quantity });
        next.receipts[receiptId] = { itemdefid, quantity, status: 'confirmed' };
        this.save(next);
        return { ok: true, items: next.items };
    }
    craft(recipeId, { confirmOwned = false } = {}) {
        const next = this.read();
        const key = `${SEASON_ONE.id}:craft:${recipeId}`;
        if (next.receipts[key]) return { ok: true, duplicate: true, receipt: next.receipts[key], items: next.items };
        const plan = planDeterministicCraft(recipeId, next.items);
        if (!plan.ok) return plan;
        if (plan.alreadyOwned && !confirmOwned) return { ok: false, reason: 'already_owned' };
        for (const ingredient of plan.ingredients) {
            let remaining = ingredient.quantity;
            for (const item of next.items) {
                if (Number(item.itemdefid) !== ingredient.itemdefid) continue;
                const used = Math.min(remaining, item.quantity);
                item.quantity -= used;
                remaining -= used;
            }
        }
        next.items = next.items.filter(item => item.quantity > 0);
        next.items.push({ itemId: `local:${key}`, itemdefid: plan.outputItemdefid, quantity: 1 });
        const receipt = { consumed: plan.ingredients, itemdefid: plan.outputItemdefid, quantity: 1, status: 'confirmed' };
        next.receipts[key] = receipt;
        this.save(next);
        return { ok: true, receipt, items: next.items };
    }
}
