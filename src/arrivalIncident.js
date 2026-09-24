// The arrival incident: the first fight of every deployment.
//
// A deployment used to open on the same crash site with nothing nearby -- the
// nearest hostile 80+ units away -- so the first minutes were a walk. Now,
// shortly after landing, a small pack closes on the wreck. Who comes is set
// by the deployment's condition (the gale brings cryosnails, stillness brings
// one elite stalker), where they come from is rolled from the expedition
// seed, and clearing them leaves a salvage cache worth walking to. The crash
// site itself is untouched: campaign geography stays put, the arrival varies.
import { mixRunEntropy } from './runEntropy.js';

export const ARRIVAL_PACKS = Object.freeze({
    glacial_gale: Object.freeze(['cryosnail', 'cryosnail', 'cryosnail']),
    spore_bloom: Object.freeze(['sporesnail', 'sporesnail', 'cybersnail']),
    bio_resin_surge: Object.freeze(['crawler', 'crawler', 'crawler']),
    geothermal_arc: Object.freeze(['cybersnail', 'cybersnail', 'cybersnail']),
    subzero_stillness: Object.freeze(['mycelium_stalker'])
});

// Literal keys so the i18n audit credits them.
export const ARRIVAL_LINE_KEYS = Object.freeze({
    glacial_gale: 'ui.expedition.arrival.glacial_gale',
    spore_bloom: 'ui.expedition.arrival.spore_bloom',
    bio_resin_surge: 'ui.expedition.arrival.bio_resin_surge',
    geothermal_arc: 'ui.expedition.arrival.geothermal_arc',
    subzero_stillness: 'ui.expedition.arrival.subzero_stillness'
});

export const ARRIVAL_TUNING = Object.freeze({
    delaySeconds: 20,
    minDistance: 14,
    maxDistance: 19,
    cacheSize: 3,
    firstDeploymentPackSize: 2
});

/**
 * @param {object} args
 * @param {string} args.conditionId
 * @param {number} args.expeditionSeed
 * @param {number} args.expeditionIndex - a campaign's first deployment is 1
 *   (beginExpedition advances the index as the player deploys); 0 is treated
 *   the same
 * @returns {null | { pack: Array<{ type: string, elite: boolean }>, angle: number, distance: number, delaySeconds: number, cacheSize: number, lineKey: string }}
 */
export function planArrivalIncident({ conditionId, expeditionSeed = 0, expeditionIndex = 0 } = {}) {
    const pack = ARRIVAL_PACKS[conditionId];
    if (!pack) return null;
    const firstDeployment = (expeditionIndex | 0) <= 1;
    const roll = mixRunEntropy(Number(expeditionSeed) >>> 0, 0x41525256, 1);
    const angle = ((roll % 3600) / 3600) * Math.PI * 2;
    const distance = ARRIVAL_TUNING.minDistance
        + ((roll >>> 12) % 1000) / 1000 * (ARRIVAL_TUNING.maxDistance - ARRIVAL_TUNING.minDistance);
    // A campaign's first deployment is an introduction: smaller, never elite.
    const members = firstDeployment
        ? (pack.length === 1 ? ['cybersnail', 'cybersnail'] : pack.slice(0, ARRIVAL_TUNING.firstDeploymentPackSize))
        : pack;
    return {
        pack: members.map((type) => ({ type, elite: !firstDeployment && pack.length === 1 })),
        angle,
        distance,
        delaySeconds: ARRIVAL_TUNING.delaySeconds,
        cacheSize: ARRIVAL_TUNING.cacheSize,
        lineKey: ARRIVAL_LINE_KEYS[conditionId]
    };
}
