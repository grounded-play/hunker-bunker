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

export const CORPO_CONTRACT = Object.freeze({
    id: 'corpo_severance_v1', title: 'Severance Package', familyId: 'corpo_runner',
    desc: 'With Corpo at your side, decrypt 2 distinct terminals, then complete a camp assistance job to put the stolen intelligence to work. Progress carries between expeditions.',
    targetCount: 3, rewardText: '16 shells, banked permanently',
    stages: [{ type: 'terminal-decrypted', count: 2, label: 'Recover clearance data' }, { type: 'camp-complete', count: 1, label: 'Help a camp use the intelligence' }],
    reunionLine: 'The severance contract is closed. That intelligence still belongs to the survivors. Ready for another run?',
    completionLine: 'CORPO: Severance paid. That intelligence belongs to the survivors now. 16 SHELLS BANKED.'
});
export const CRASH_QUEEN_CONTRACT = Object.freeze({
    id: 'crash_beacon_v1', title: 'Beacon in the Dark', familyId: 'crash_queen',
    desc: 'With Crash Queen at your side, complete 2 distinct camp assistance jobs to establish safe havens. Progress carries between expeditions.',
    targetCount: 2, rewardText: '16 shells, banked permanently',
    stages: [{ type: 'camp-complete', count: 2, label: 'Establish safe havens through camp jobs' }],
    reunionLine: 'Those safe havens still matter. Let us bring more people home.',
    completionLine: 'CRASH QUEEN: Two lights remain in the dark. We gave the lost somewhere to return. 16 SHELLS BANKED.'
});
export const TRIPPER_CONTRACT = Object.freeze({
    id: 'tripper_signal_route_v1', title: 'VIP Access', familyId: 'abg_tripper',
    desc: 'With Tripper at your side, cross 2 distinct depth tiers, then decrypt a terminal to relay the route. Progress carries between expeditions.',
    targetCount: 3, rewardText: '14 shells, banked permanently',
    stages: [{ type: 'depth-crossed', count: 2, label: 'Chart distinct depth tiers' }, { type: 'terminal-decrypted', count: 1, label: 'Relay the route through a terminal' }],
    reunionLine: 'Our route is on the air. No more disappearing without a signal. Let us go!',
    completionLine: 'TRIPPER: Signal is live! Someone down here will know they are not alone. 14 SHELLS BANKED.'
});
export const SURVIVOR_CONTRACTS = Object.freeze(Object.fromEntries([
    FOXHOLE_CONTRACT, HACKER_CONTRACT, HYBRID_CONTRACT, CORPO_CONTRACT, CRASH_QUEEN_CONTRACT, TRIPPER_CONTRACT
].map((contract) => [contract.id, contract])));
export const CONTRACT_BY_FAMILY = Object.freeze(Object.fromEntries(Object.values(SURVIVOR_CONTRACTS).map((contract) => [contract.familyId, contract])));

export const SURVIVOR_REWARDS = Object.freeze({
    [CORPO_CONTRACT.id]: Object.freeze({ shells: 16 }),
    [CRASH_QUEEN_CONTRACT.id]: Object.freeze({ shells: 16 }),
    [TRIPPER_CONTRACT.id]: Object.freeze({ shells: 14 }),
    [FOXHOLE_CONTRACT.id]: Object.freeze({ shells: 12 }),
    [HACKER_CONTRACT.id]: Object.freeze({ shells: 15, skinId: 'comm_scout_soft_manic_infiltrator_gf' }),
    [HYBRID_CONTRACT.id]: Object.freeze({ shells: 18, skinId: 'comm_scount_sil' })
});

export function getSurvivorContractSteps(contractIdOrProgress = 0, maybeProgress = null) {
    const contractId = typeof contractIdOrProgress === 'string' ? contractIdOrProgress : null;
    const progress = typeof contractIdOrProgress === 'string' ? (maybeProgress ?? 0) : contractIdOrProgress;

    const stages = SURVIVOR_CONTRACTS[contractId]?.stages;
    if (stages) {
        let consumed = 0;
        return stages.map((stage) => {
            const current = Math.min(stage.count, Math.max(0, progress - consumed));
            consumed += stage.count;
            return { label: `${stage.label}: ${current}/${stage.count}`, done: current >= stage.count };
        });
    }
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


