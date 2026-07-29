// Pure causal-explanation text for Act 2 endings and manifest boarding
// blockers, split out of main.js (which has DOM side effects at module
// scope and can't be imported by Vitest) so master-implementation-plan-2026-07-28.md
// Phase 9.3 ("a player can explain why the ending occurred") has automated
// coverage, not just hand-verification.
import { ACT2_ENDINGS } from './act2.js';

export function explainEnding(ending) {
    switch (ending) {
        case ACT2_ENDINGS.FULL_BROOD:
            return "You delivered the Queen and her clutch to a crowded new world, executing her will flawlessly.";
        case ACT2_ENDINGS.CLEAN_ESCAPE:
            return "You broke the hive link, purged the eggs, and successfully escaped with all human survivors.";
        case ACT2_ENDINGS.MIXED_CREW:
            return "You maintained a fragile compromise between human survivors and infected hybrids under the Queen's watch.";
        case ACT2_ENDINGS.CARRIERS_BARGAIN:
            return "You saved the survivors but carried the infection silently in your own flesh.";
        case ACT2_ENDINGS.SCORCHED_SKY:
            return "You incinerated every survivor camp and purged the eggs, leaving the sector a dead wasteland.";
        case ACT2_ENDINGS.MOTHERSHIP_INFECTION:
            return "You stealthily smuggled the infection onto the Mother Ship disguised as a clean rescue flight.";
        case ACT2_ENDINGS.ALIEN_EXODUS:
            return "You rejected the Queen but brought the allied beings off-world into safety.";
        case ACT2_ENDINGS.OUTED_ESCAPE:
            return "The survivors boarded knowing what you are, setting course for quarantine in deep suspicion.";
        case ACT2_ENDINGS.FAILED_CARRIER:
            return "You hid the future in a cargo pod but the containment failed, consuming your passengers.";
        case ACT2_ENDINGS.EMPTY_HUSK:
            return "You fled alone, leaving both human camps and alien hives to die in the freezing dark.";
        default:
            return "You navigated the freezing dark, leaving a complex legacy in sector 9.";
    }
}

export function formatManifestBlocker(reason, manifest = {}) {
    if (reason === 'seat_capacity_exceeded') {
        return `OVER CAPACITY (${manifest.seatsUsed ?? '?'}/${manifest.seatsMax ?? '?'} SEATS)`;
    }
    if (reason === 'egg_requires_nahl') return 'EGG INSTABILITY: NAHL MUST BE ABOARD';
    if (reason === 'egg_unstable') return 'EGG NEEDS THE QUEEN OR NAHL ABOARD';
    return String(reason).replace(/_/g, ' ').toUpperCase();
}
