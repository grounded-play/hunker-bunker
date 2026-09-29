// ── Fabrication Bay ───────────────────────────────────────────
// Port of mothership's 3D-printer pipeline, adapted to Hunker Bunker's
// client-only architecture (see .claude_work/01-feature-port-from-mothership.md
// and 05-asset-reuse-from-mothership.md).
//
// Faithful to the printer metaphor: spend banked salvage to QUEUE a print, which
// runs on a real-time timer (queued -> printing -> fabricated), persisted to
// localStorage so it survives reloads. Fabricated schematics are recorded
// permanently. The Bay is gated by the arc: it unlocks once the base is powered.

import { getItem, getItemView } from './data/itemCatalog.js';

const STORAGE_KEY = 'hb_fabricator_v1';

// Recipes. Each prints one item from the shared catalog (src/data/itemCatalog.js)
// and takes its name and rarity from it, so the Foundry shows the item the
// Armory, hero screen and Vault show. Until Sprint 48 recipes carried their own
// names, rarities and numbered schematic cards (public/schematics/), which
// disagreed with the items they granted. Costs draw on the same salvage
// currencies the loot HUD tracks (tech / coin / med).
function recipe(id, item, klass, output, cost, printSeconds, blurb) {
    const entry = getItem(item);
    if (!entry) throw new Error(`fabricator recipe ${id} prints unknown catalog item ${item}`);
    return Object.freeze({ id, item: entry.id, name: entry.name, klass, output, rarity: entry.rarity.toUpperCase(), cost, printSeconds, blurb });
}

export const FAB_RECIPES = Object.freeze([
    recipe('mk1_sidearm', 'mk1_sidearm', 'WEAPON', { kind: 'weapon' }, { tech: 8, coin: 4, med: 0 }, 6, 'Stable, efficient sidearm profile for the current expedition.'),
    recipe('pulse_carbine', 'pulse_carbine', 'WEAPON', { kind: 'weapon' }, { tech: 14, coin: 8, med: 0 }, 10, 'Fast mid-range pulse profile with reduced impact.'),
    recipe('scatter_rep', 'scatter_rep', 'WEAPON', { kind: 'weapon' }, { tech: 12, coin: 6, med: 0 }, 9, 'Three close-range projectiles per shot.'),
    recipe('rail_marksman', 'rail_marksman', 'WEAPON', { kind: 'weapon' }, { tech: 20, coin: 12, med: 0 }, 16, 'Slow heavy penetrator with extended reach.'),
    recipe('neon_smg', 'neon_smg', 'WEAPON', { kind: 'weapon' }, { tech: 16, coin: 10, med: 0 }, 12, 'High fire-rate profile with lighter rounds.'),
    recipe('cryo_lance', 'cryo_lance', 'WEAPON', { kind: 'weapon' }, { tech: 18, coin: 10, med: 4 }, 14, 'Precise long-life cryogenic projectile profile.'),
    recipe('salvage_drill', 4135, 'CHARM', { kind: 'charm', itemdefid: 4135 }, { tech: 10, coin: 14, med: 0 }, 11, 'A real weapon-mounted Geodetic Compass charm.'),
    recipe('exo_plating', 4144, 'MODULE', { kind: 'mod', itemdefid: 4144 }, { tech: 22, coin: 16, med: 6 }, 20, 'Shortens the live shield recharge delay.'),
    recipe('tallow_thermal_wrap', 4140, 'MODULE', { kind: 'mod', itemdefid: 4140 }, { tech: 12, coin: 6, med: 6 }, 12, 'Extends cryogenic freeze duration.'),
    recipe('vesper_vanguard_rig', 4143, 'MODULE', { kind: 'mod', itemdefid: 4143 }, { tech: 18, coin: 10, med: 4 }, 15, 'Adds one live projectile penetration.'),
    recipe('meridian_frequency_scanner', 4145, 'MODULE', { kind: 'mod', itemdefid: 4145 }, { tech: 20, coin: 8, med: 0 }, 14, 'Detects hidden rooms within fifteen metres.'),
    recipe('brood_chitin_plating', 4142, 'MODULE', { kind: 'mod', itemdefid: 4142 }, { tech: 16, coin: 6, med: 10 }, 16, 'Reduces live spore and gas damage.'),
    recipe('nahl_resonant_chitin', 4132, 'CHARM', { kind: 'charm', itemdefid: 4132 }, { tech: 24, coin: 14, med: 12 }, 18, 'A real animated weapon-mounted pearl charm.')
]);

// The card the Foundry draws for a recipe: the item it prints, as every other
// surface shows it. `classId`/`frameId` pick the gun a weapon profile fits.
export function describeRecipe(recipe, options = {}) {
    return recipe ? getItemView(recipe.item, options) : null;
}

export function getFabricatedOutputIds(fabricator) {
    return FAB_RECIPES.filter((recipe) => fabricator?.isFabricated?.(recipe.id))
        .map((recipe) => recipe.output?.itemdefid)
        .filter((id) => id != null);
}

export function applyFabricatedRecipeOutput(recipe, { fabricator, loadout, game = null, classId = null, replaceSlot = null } = {}) {
    if (!recipe || !fabricator?.isFabricated?.(recipe.id) || !loadout) return { ok: false, reason: 'not_fabricated' };
    const targetClass = classId ?? loadout.activeClassId;
    const output = recipe.output ?? (recipe.klass === 'WEAPON' ? { kind: 'weapon' } : null);
    if (output?.kind === 'weapon') {
        if (!loadout.equip(recipe.id, fabricator, targetClass)) return { ok: false, reason: 'equip_rejected' };
        game?.applyWeaponUpgrades?.();
        return { ok: true, kind: 'weapon', id: recipe.id };
    }
    if (output?.kind === 'charm') {
        loadout.equipCharm(targetClass, output.itemdefid);
        void game?.setupPlayer3dCosmeticOverlay?.();
        return { ok: true, kind: 'charm', itemdefid: output.itemdefid };
    }
    if (output?.kind === 'mod') {
        const current = loadout.getClassLoadout(targetClass);
        const openSlot = !current.mod1Id ? 1 : (!current.mod2Id ? 2 : null);
        const slot = openSlot ?? Number(replaceSlot);
        if (![1, 2].includes(slot)) return { ok: false, reason: 'slot_conflict', occupied: [current.mod1Id, current.mod2Id] };
        loadout.equipRigModule(targetClass, slot, output.itemdefid);
        if (game) game.loadoutMods = loadout.getActiveModifiers(
            targetClass,
            game.multiplayerMode === 'pvp' ? 'pvp' : (game.multiplayerMode === 'coop' ? 'coop' : 'solo')
        );
        return { ok: true, kind: 'mod', itemdefid: output.itemdefid, slot };
    }
    return { ok: false, reason: 'unsupported_output' };
}

// Flat "spin" cost for a fabricator roll (mothership's gamba metaphor, in HB
// salvage). Rolling gambles this cost for a rarity-weighted schematic reveal.
export const FAB_SPIN_COST = Object.freeze({ tech: 10, coin: 8, med: 0 });
export const FABRICATOR_SITE_MAX_USES = 3;
export const FABRICATOR_OBJECTIVE_BASE_CHANCE = 0.25;
export const FABRICATOR_OBJECTIVE_CHANCE_STEP = 0.18;
export const FABRICATOR_OBJECTIVE_TARGETS = Object.freeze(['mk1_sidearm', 'pulse_carbine', 'exo_plating']);

// Rarity weights began as mothership's gamba table (api/gamba rollRarity,
// 40/40/17/3). Recipes now take the rarity of the item they print, and two
// of those items are uncommon, so UNCOMMON takes 15 of COMMON's 40.
export const RARITY_WEIGHTS = Object.freeze([
    { rarity: 'COMMON',    weight: 0.25 },
    { rarity: 'UNCOMMON',  weight: 0.15 },
    { rarity: 'RARE',      weight: 0.40 },
    { rarity: 'EPIC',      weight: 0.17 },
    { rarity: 'LEGENDARY', weight: 0.03 }
]);

// Roll a rarity tier from the weighted table. `random` is injectable for tests.
export function rollRarity(random = Math.random) {
    let roll = random() * RARITY_WEIGHTS.reduce((s, r) => s + r.weight, 0);
    for (const { rarity, weight } of RARITY_WEIGHTS) {
        if (roll < weight) return rarity;
        roll -= weight;
    }
    return RARITY_WEIGHTS[RARITY_WEIGHTS.length - 1].rarity;
}

export function getRecipesByRarity(rarity) {
    return FAB_RECIPES.filter((r) => r.rarity === rarity);
}

export function getRecipe(id) {
    return FAB_RECIPES.find((r) => r.id === id) ?? null;
}

function defaultState() {
    return {
        fabricated: {},
        prints: {},
        objective: {
            targetIndex: 0,
            attempts: 0,
            siteUsesRemaining: FABRICATOR_SITE_MAX_USES,
            sitesBroken: 0
        }
    };
}

function normalizeObjective(objective = {}) {
    return {
        targetIndex: Math.max(0, Math.floor(Number(objective.targetIndex) || 0)),
        attempts: Math.max(0, Math.floor(Number(objective.attempts) || 0)),
        siteUsesRemaining: Math.max(0, Math.min(FABRICATOR_SITE_MAX_USES, Math.floor(Number(objective.siteUsesRemaining ?? FABRICATOR_SITE_MAX_USES) || 0))),
        sitesBroken: Math.max(0, Math.floor(Number(objective.sitesBroken) || 0))
    };
}

export class FabricatorManager {
    constructor({ storage = null, storageKey = STORAGE_KEY, now = () => Date.now(), bank = null } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.storageKey = storageKey;
        this.now = now;
        this.bank = bank;
        this.state = this.load();
        this.committedState = JSON.parse(JSON.stringify(this.state));
        this.recoverPrints(bank);
    }

    load() {
        try {
            const raw = this.storage?.getItem(this.storageKey);
            if (!raw) return defaultState();
            const parsed = JSON.parse(raw);
            return {
                fabricated: parsed?.fabricated && typeof parsed.fabricated === 'object' ? parsed.fabricated : {},
                prints: parsed?.prints && typeof parsed.prints === 'object' ? parsed.prints : {},
                objective: normalizeObjective(parsed?.objective)
            };
        } catch {
            return defaultState();
        }
    }

    save() {
        try {
            this.storage?.setItem(this.storageKey, JSON.stringify(this.state));
            this.committedState = JSON.parse(JSON.stringify(this.state));
        } catch (error) {
            this.state = JSON.parse(JSON.stringify(this.committedState));
            throw error;
        }
    }

    recoverPrints(bank = this.bank) {
        for (const [id, completeAt] of Object.entries(bank?.getState?.().fabricationOrders ?? {})) {
            if (getRecipe(id) && !this.isFabricated(id)) this.state.prints[id] = completeAt;
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
    getObjectiveState() {
        const objective = normalizeObjective(this.state.objective);
        const targetId = FABRICATOR_OBJECTIVE_TARGETS[Math.min(objective.targetIndex, FABRICATOR_OBJECTIVE_TARGETS.length - 1)] ?? null;
        const complete = objective.targetIndex >= FABRICATOR_OBJECTIVE_TARGETS.length;
        const chance = complete ? 1 : Math.min(0.95, FABRICATOR_OBJECTIVE_BASE_CHANCE + objective.attempts * FABRICATOR_OBJECTIVE_CHANCE_STEP);
        return { ...objective, targetId, targetRecipe: targetId ? getRecipe(targetId) : null, complete, chance };
    }

    resetSiteUses() {
        this.state.objective = { ...normalizeObjective(this.state.objective), siteUsesRemaining: FABRICATOR_SITE_MAX_USES };
        this.save();
        emit('fabricator-site-reset', { objective: this.getObjectiveState() });
        return this.getObjectiveState();
    }

    breakCurrentSite(bank = null) {
        const objective = normalizeObjective(this.state.objective);
        objective.siteUsesRemaining = 0;
        objective.sitesBroken += 1;
        this.state.objective = objective;
        const refund = { tech: 4 + objective.sitesBroken * 2, coin: 3 + objective.sitesBroken, med: 0 };
        bank?.deposit?.(refund);
        this.save();
        emit('fabricator-site-broken', { refund, objective: this.getObjectiveState() });
        return { refund, objective: this.getObjectiveState() };
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

    getEffectiveCost(recipe) {
        if (!recipe?.cost) return null;
        let cost = { ...recipe.cost };
        if (typeof window !== 'undefined' && window.npcDialogueTreeManager?.activePerks?.has?.('meridian_supercharged_matrix')) {
            cost = {
                tech: Math.max(0, Math.floor(cost.tech * 0.8)),
                coin: Math.max(0, Math.floor(cost.coin * 0.8)),
                med: Math.max(0, Math.floor(cost.med * 0.8))
            };
        }
        return cost;
    }

    canFabricate(id, bank) {
        const recipe = getRecipe(id);
        if (!recipe) return false;
        if (this.isFabricated(id) || this.isPrinting(id)) return false;
        const cost = this.getEffectiveCost(recipe);
        return bank ? bank.canAfford(cost) : true;
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

    // True when the player can afford a fabricator roll.
    canRoll(bank) {
        const objective = this.getObjectiveState();
        if (!objective.complete && objective.siteUsesRemaining <= 0) return false;
        return bank ? bank.canAfford(FAB_SPIN_COST) : false;
    }

    // The gamba: spend the flat spin cost, roll a rarity, and reveal a schematic
    // from that tier (preferring ones not yet owned). Marks it fabricated instantly
    // — the spin animation IS the wait. Returns { rarity, recipe, duplicate } or null.
    rollFabrication(bank, random = Math.random) {
        if (!this.canRoll(bank)) return null;

        const objectiveBefore = this.getObjectiveState();
        if (!objectiveBefore.complete && objectiveBefore.siteUsesRemaining <= 0) {
            return null;
        }

        if (!bank.spend(FAB_SPIN_COST)) return null;

        let rarity = rollRarity(random);
        let pool = getRecipesByRarity(rarity).filter((r) => !this.isFabricated(r.id));
        if (!pool.length) {
            pool = FAB_RECIPES.filter((r) => !this.isFabricated(r.id));
        }

        const objectiveRoll = !objectiveBefore.complete
            && objectiveBefore.targetRecipe
            && !this.isFabricated(objectiveBefore.targetId)
            && random() < objectiveBefore.chance;

        if (objectiveRoll) {
            pool = [objectiveBefore.targetRecipe];
            rarity = objectiveBefore.targetRecipe.rarity;
        }

        let duplicate = false;
        if (!pool.length) {
            pool = getRecipesByRarity(rarity);
            duplicate = true;
        }
        const recipe = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
        rarity = recipe.rarity;

        const objective = normalizeObjective(this.state.objective);
        objective.siteUsesRemaining = Math.max(0, objective.siteUsesRemaining - 1);
        let objectiveHit = false;
        if (!duplicate) {
            delete this.state.prints[recipe.id];
            this.state.fabricated[recipe.id] = true;
            objectiveHit = recipe.id === objectiveBefore.targetId;
            if (objectiveHit) {
                objective.targetIndex += 1;
                objective.attempts = 0;
                objective.siteUsesRemaining = FABRICATOR_SITE_MAX_USES;
            } else if (!objectiveBefore.complete) {
                objective.attempts += 1;
            }
            this.state.objective = objective;
            this.save();
            emit('fabrication-complete', { id: recipe.id, recipe, rarity, objectiveHit, objective: this.getObjectiveState() });
        } else {
            if (!objectiveBefore.complete) objective.attempts += 1;
            this.state.objective = objective;
            this.save();
        }

        const afterObjective = this.getObjectiveState();
        const broken = !afterObjective.complete && afterObjective.siteUsesRemaining <= 0 && !objectiveHit;
        let breakage = null;
        if (broken) {
            breakage = this.breakCurrentSite(bank);
        }

        emit('fabrication-rolled', { id: recipe.id, recipe, rarity, duplicate, objectiveHit, objective: this.getObjectiveState(), broken, breakage });
        return { rarity, recipe, duplicate, objectiveHit, objective: this.getObjectiveState(), broken, breakage };
    }

    // Spend salvage and queue the print. Returns the recipe on success, else null.
    startPrint(id, bank) {
        const recipe = getRecipe(id);
        if (!recipe) return null;
        if (this.isFabricated(id) || this.isPrinting(id)) return null;
        const cost = this.getEffectiveCost(recipe);
        const completeAt = bank?.queueFabrication
            ? bank.queueFabrication(id, cost, this.now() + recipe.printSeconds * 1000)
            : bank?.spend(cost) ? this.now() + recipe.printSeconds * 1000 : null;
        if (!completeAt) return null;
        this.bank = bank;
        this.state.prints[id] = completeAt;
        this.save();
        emit('fabrication-started', { id, recipe });
        return recipe;
    }

    // Advance all in-flight prints; completed ones become fabricated.
    // Returns the list of ids that finished on this tick.
    tickPrints() {
        this.recoverPrints();
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
        return { fabricated: { ...this.state.fabricated }, prints: { ...this.state.prints }, objective: this.getObjectiveState() };
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
