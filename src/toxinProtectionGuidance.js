export const BIO_HAZARD_FILTER_RECIPE_ID = 'brood_chitin_plating';
export const BIO_HAZARD_FILTER_ITEM_ID = '4142';

/** Player-facing toxin guidance for each step of the acquire/install loop. */
export function toxinProtectionGuidance({ gasDamageReduction = 0, fabricated = false } = {}) {
    const reduction = Math.max(0, Number(gasDamageReduction) || 0);
    if (reduction > 0) {
        return Object.freeze({
            state: 'active',
            detail: `BIO-HAZARD FILTER ACTIVE · ${Math.round(reduction * 100)}% DAMAGE REDUCTION · LEAVE THE CLOUD`,
            prompt: '> SUIT: BIO-HAZARD FILTER ACTIVE — TOXIN DAMAGE REDUCED. EXIT THE CLOUD TO CLEAR EXPOSURE.'
        });
    }
    if (fabricated) {
        return Object.freeze({
            state: 'ready',
            detail: 'FILTER READY · FOUNDRY → WEAPONS → INSTALL IN SUIT BAY',
            prompt: '> TOXIN DEFENSE READY: FOUNDRY → WEAPONS → BIO-HAZARD FILTER VENT → INSTALL IN OPEN SUIT BAY.'
        });
    }
    return Object.freeze({
        state: 'missing',
        detail: 'LEAVE CLOUD · FOUNDRY → WEAPONS → PRINT BIO-HAZARD FILTER',
        prompt: '> TOXIN DEFENSE: AT THE FOUNDRY, OPEN WEAPONS → PRINT BIO-HAZARD FILTER VENT → INSTALL IN SUIT BAY A OR B.'
    });
}
