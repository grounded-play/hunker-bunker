// ── Fabrication Bay ───────────────────────────────────────────
// Port of mothership's 3D-printer pipeline, adapted to Hunker Bunker's
// client-only architecture (see .claude_work/01-feature-port-from-mothership.md
// and 05-asset-reuse-from-mothership.md). Recipe art reuses mothership's
// generated item cards (public/schematics/*.webp).
//
// Faithful to the printer metaphor: spend banked salvage to QUEUE a print, which
// runs on a real-time timer (queued -> printing -> fabricated), persisted to
// localStorage so it survives reloads. Fabricated schematics are recorded
// permanently. The Bay is gated by the arc: it unlocks once the base is powered.

const STORAGE_KEY = 'hb_fabricator_v1';

// Recipes — each maps to a curated schematic card. Costs draw on the same
// salvage currencies the loot HUD tracks (tech / coin / med).
export const FAB_RECIPES = Object.freeze([
    { id: 'mk1_sidearm',   name: 'MARK-I SIDEARM',    klass: 'WEAPON', art: '/schematics/schematic_00.webp', cost: { tech: 8,  coin: 4,  med: 0 }, printSeconds: 6,  blurb: 'Reliable fallback pistol. First print off the line.' },
    { id: 'pulse_carbine', name: 'PULSE CARBINE',      klass: 'WEAPON', art: '/schematics/schematic_01.webp', cost: { tech: 14, coin: 8,  med: 0 }, printSeconds: 10, blurb: 'Mid-range energy carbine with a tight spread.' },
    { id: 'scatter_rep',   name: 'SCATTER REPEATER',   klass: 'WEAPON', art: '/schematics/schematic_02.webp', cost: { tech: 12, coin: 6,  med: 0 }, printSeconds: 9,  blurb: 'Close-quarters spread weapon. Brutal in corridors.' },
    { id: 'rail_marksman', name: 'RAIL MARKSMAN',      klass: 'WEAPON', art: '/schematics/schematic_03.webp', cost: { tech: 20, coin: 12, med: 0 }, printSeconds: 16, blurb: 'Long-line railgun. Punches through armor.' },
    { id: 'neon_smg',      name: 'NEON SMG',           klass: 'WEAPON', art: '/schematics/schematic_04.webp', cost: { tech: 16, coin: 10, med: 0 }, printSeconds: 12, blurb: 'High fire-rate SMG. Loud, fast, pink.' },
    { id: 'cryo_lance',    name: 'CRYO LANCE',         klass: 'WEAPON', art: '/schematics/schematic_05.webp', cost: { tech: 18, coin: 10, med: 4 }, printSeconds: 14, blurb: 'Freezing lance. Slows whatever it hits.' },
    { id: 'salvage_drill', name: 'SALVAGE DRILL',      klass: 'TOOL',   art: '/schematics/schematic_06.webp', cost: { tech: 10, coin: 14, med: 0 }, printSeconds: 11, blurb: 'Powered drill. Cracks junk piles wide open.' },
    { id: 'exo_plating',   name: 'EXOSUIT PLATING',    klass: 'MODULE', art: '/schematics/schematic_07.webp', cost: { tech: 22, coin: 16, med: 6 }, printSeconds: 20, blurb: 'Layered hull plating. Hardens the exosuit shell.' }
]);

export function getRecipe(id) {
    return FAB_RECIPES.find((r) => r.id === id) ?? null;
}

function defaultState() {
    return { fabricated: {}, prints: {} };
}

export class FabricatorManager {
    constructor({ storage = null, storageKey = STORAGE_KEY, now = () => Date.now() } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.storageKey = storageKey;
        this.now = now;
        this.state = this.load();
    }

    load() {
        try {
            const raw = this.storage?.getItem(this.storageKey);
            if (!raw) return defaultState();
            const parsed = JSON.parse(raw);
            return {
                fabricated: parsed?.fabricated && typeof parsed.fabricated === 'object' ? parsed.fabricated : {},
                prints: parsed?.prints && typeof parsed.prints === 'object' ? parsed.prints : {}
            };
        } catch {
            return defaultState();
        }
    }

    save() {
        try {
            this.storage?.setItem(this.storageKey, JSON.stringify(this.state));
        } catch {
            // best-effort; storage may be unavailable
        }
    }

    isFabricated(id) {
        return Boolean(this.state.fabricated[id]);
    }

    // Returns the in-flight print's completion timestamp, or null.
    getPrintCompleteAt(id) {
        return this.state.prints[id] ?? null;
    }

    isPrinting(id) {
        return this.getPrintCompleteAt(id) != null && !this.isFabricated(id);
    }

    // 0..1 progress of an active print (1 when none/finished).
    getPrintProgress(id) {
        const recipe = getRecipe(id);
        const completeAt = this.getPrintCompleteAt(id);
        if (!recipe || completeAt == null) return this.isFabricated(id) ? 1 : 0;
        const total = recipe.printSeconds * 1000;
        const remaining = completeAt - this.now();
        if (remaining <= 0) return 1;
        return Math.max(0, Math.min(1, 1 - remaining / total));
    }

    canFabricate(id, bank) {
        const recipe = getRecipe(id);
        if (!recipe) return false;
        if (this.isFabricated(id) || this.isPrinting(id)) return false;
        return bank ? bank.canAfford(recipe.cost) : true;
    }

    getRandomFabricationCandidates(bank) {
        return FAB_RECIPES.filter((recipe) => this.canFabricate(recipe.id, bank));
    }

    startRandomPrint(bank, random = Math.random) {
        const candidates = this.getRandomFabricationCandidates(bank);
        if (!candidates.length) return null;
        const index = Math.max(0, Math.min(candidates.length - 1, Math.floor(random() * candidates.length)));
        return this.startPrint(candidates[index].id, bank);
    }

    // Spend salvage and queue the print. Returns the recipe on success, else null.
    startPrint(id, bank) {
        const recipe = getRecipe(id);
        if (!recipe) return null;
        if (this.isFabricated(id) || this.isPrinting(id)) return null;
        if (!bank?.spend(recipe.cost)) return null;

        this.state.prints[id] = this.now() + recipe.printSeconds * 1000;
        this.save();
        emit('fabrication-started', { id, recipe });
        return recipe;
    }

    // Advance all in-flight prints; completed ones become fabricated.
    // Returns the list of ids that finished on this tick.
    tickPrints() {
        const finished = [];
        const now = this.now();
        for (const id of Object.keys(this.state.prints)) {
            if (now >= this.state.prints[id]) {
                delete this.state.prints[id];
                this.state.fabricated[id] = true;
                finished.push(id);
            }
        }
        if (finished.length) {
            this.save();
            for (const id of finished) {
                emit('fabrication-complete', { id, recipe: getRecipe(id) });
            }
        }
        return finished;
    }

    getFabricatedCount() {
        return Object.values(this.state.fabricated).filter(Boolean).length;
    }

    getState() {
        return { fabricated: { ...this.state.fabricated }, prints: { ...this.state.prints } };
    }

    reset() {
        this.state = defaultState();
        this.save();
    }
}

function emit(name, detail) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    window.dispatchEvent(new CustomEvent(name, { detail }));
}
