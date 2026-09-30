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
    // Consume and grant in one write (trade-ups, dispensary redemptions).
    // Inputs are taken by itemdefid across every stack, so several stacks of
    // one item cannot be charged against the same stack twice. Nothing is
    // written unless every input is covered.
    exchange({ consumed = [], granted = [], receiptId } = {}) {
        if (!receiptId) return { ok: false, reason: 'missing_receipt' };
        const next = this.read();
        if (next.receipts[receiptId]) return { ok: true, duplicate: true, receipt: next.receipts[receiptId], items: next.items };
        const items = next.items.map((item) => ({ ...item, quantity: Number(item.quantity) || 0 }));
        for (const input of consumed) {
            let remaining = Number(input.quantity) || 0;
            for (const item of items) {
                if (remaining <= 0) break;
                if (Number(item.itemdefid) !== Number(input.itemdefid)) continue;
                const used = Math.min(remaining, item.quantity);
                item.quantity -= used;
                remaining -= used;
            }
            if (remaining > 0) return { ok: false, reason: 'insufficient_items' };
        }
        next.items = items.filter((item) => item.quantity > 0);
        for (const output of granted) {
            const itemdefid = Number(output.itemdefid);
            const quantity = Number(output.quantity) || 1;
            const stack = next.items.find((item) => Number(item.itemdefid) === itemdefid);
            if (stack) stack.quantity += quantity;
            else next.items.push({ itemId: `local:${receiptId}:${itemdefid}`, itemdefid, quantity });
        }
        const receipt = { consumed, granted, status: 'confirmed' };
        next.receipts[receiptId] = receipt;
        this.save(next);
        return { ok: true, receipt, items: next.items };
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
