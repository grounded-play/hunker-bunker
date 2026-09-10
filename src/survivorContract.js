export const FOXHOLE_CONTRACT = Object.freeze({
    id: 'foxhole_field_alliance_v1',
    title: 'Leave No One Behind',
    desc: 'With Foxhole at your side, defeat 8 hostiles, then complete a camp assistance job. Progress carries between expeditions.',
    targetCount: 9,
    rewardText: '12 shells, banked permanently',
    familyId: 'foxhole_buddy'
});

export const HACKER_CONTRACT = Object.freeze({
    id: 'hacker_core_override_v1',
    title: 'Override the Core',
    desc: 'With Hacker GF at your side, decrypt 3 mainframe terminals. Progress carries between expeditions.',
    targetCount: 3,
    rewardText: '15 shells, banked permanently',
    familyId: 'manic_hacker',
    rewardSkinId: 'comm_scout_soft_manic_infiltrator_gf'
});

export const HYBRID_CONTRACT = Object.freeze({
    id: 'species_symbiosis_v1',
    title: 'Symbiotic Genesis',
    desc: 'With Chrysalis at your side, extract bio-spores from 3 hive thresholds. Progress carries between expeditions.',
    targetCount: 3,
    rewardText: '18 shells, banked permanently',
    familyId: 'species_hybrid',
    rewardSkinId: 'comm_scount_sil'
});

export const SURVIVOR_REWARDS = Object.freeze({
    [FOXHOLE_CONTRACT.id]: Object.freeze({ shells: 12 }),
    [HACKER_CONTRACT.id]: Object.freeze({ shells: 15, skinId: 'comm_scout_soft_manic_infiltrator_gf' }),
    [HYBRID_CONTRACT.id]: Object.freeze({ shells: 18, skinId: 'comm_scount_sil' })
});

export function getSurvivorContractSteps(contractIdOrProgress = 0, maybeProgress = null) {
    const contractId = typeof contractIdOrProgress === 'string' ? contractIdOrProgress : null;
    const progress = typeof contractIdOrProgress === 'string' ? (maybeProgress ?? 0) : contractIdOrProgress;

    if (contractId === HACKER_CONTRACT.id) {
        return [
            { label: `Decrypt terminals: ${Math.min(3, progress)}/3`, done: progress >= 3 }
        ];
    }
    if (contractId === HYBRID_CONTRACT.id) {
        return [
            { label: `Extract hive bio-spores: ${Math.min(3, progress)}/3`, done: progress >= 3 }
        ];
    }
    return [
        { label: `Protect the route: ${Math.min(8, progress)}/8 hostiles`, done: progress >= 8 },
        { label: 'Complete a camp assistance job', done: progress >= 9 }
    ];
}


