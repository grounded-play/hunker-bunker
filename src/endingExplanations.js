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

export function explainLinchpinResolution(linchpinId, resolution) {
    const key = `${linchpinId}:${resolution}`;
    switch (key) {
        case 'mayor_tina:killed':
            return 'You executed the Teacup Siren in her bath, asserting human sovereignty and closing hive diplomacy.';
        case 'mayor_tina:joined':
            return 'You shed your human chassis and embraced the roach swarm, binding your fate to the hives.';
        case 'scientist_specimen:proved':
            return 'You stood unarmed before the hive specimen without firing, proving human restraint to the chorus.';
        case 'scientist_specimen:dismissed':
            return 'You exterminated the specimen Okonkwo-Vass asked you to spare, burning all credibility with alien allies.';
        case 'queen_offer:accepted':
            return 'You yielded two escape seats to the Queen, sealing the fate of human survivor factions.';
        case 'queen_offer:refused':
            return 'You defied the Queen to her face, choosing human solidarity over alien domination.';
        case 'briggs_oath:honored':
            return 'You stood shoulder-to-shoulder with Commander Briggs, reinforcing the garrison perimeter.';
        case 'briggs_oath:broken':
            return 'You abandoned the Vesper defense line, leaving Briggs and his soldiers to the dark.';
        case 'martha_beacon:broadcast':
            return 'You amplified Sister Martha’s distress broadcast, gathering the faithful into the light.';
        case 'martha_beacon:silenced':
            return 'You cut Tallow’s transmission cables, plunging Martha’s congregation into silence.';
        case 'kaelen_manifest:disclosed':
            return 'You submitted full cargo inventories to Overseer Kaelen, operating in open truth.';
        case 'kaelen_manifest:falsified':
            return 'You tampered with Kaelen’s manifest records, concealing contaminated freight.';
        case 'suture_host_mercy:cured_human':
            return 'You underwent Nahl’s radical resection surgery, purging the spore infection from your blood.';
        case 'suture_host_mercy:symbiotic_carrier':
            return 'You sealed a symbiotic pact with the Suture Hive, cultivating living alien resin in your organs.';
        case 'relay_chorus:jammed_camps':
            return 'You jammed camp communication repeaters, blinding survivor outposts to prevent discovery.';
        case 'relay_chorus:bridge_synapse':
            return 'You opened a direct neural bridge between the survivor network and the hive mind.';
        case 'carapace_oath:shield_queen':
            return 'You directed Rhun’s living armor to protect the Queen’s royal retinue above all.';
        case 'carapace_oath:shield_operator':
            return 'You rallied Rhun to shield the operator and human evacuees against the hive swarm.';
        default:
            return `You resolved ${linchpinId} with ${resolution}, altering the future course of the expedition.`;
    }
}

