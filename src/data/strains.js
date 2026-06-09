const CLASS_IDS = Object.freeze(['SCOUT', 'TANK', 'ENGINEER']);

export const STRAIN_BY_CLASS = Object.freeze({
    SCOUT: Object.freeze({
        strainId: 'RUNNER',
        displayName: 'Runner/Stalker Strain',
        instinctTagline: 'Velocity becomes hunger; routes become ambush paths.',
        startingMutationBranch: 'hunter',
        skillRenames: Object.freeze({
            'SPRINT BURST': 'POUNCE',
            'MAGNETIZED GLOVES': 'SCENT LURE',
            'LIGHT STEP': 'SILENT TALONS'
        })
    }),
    TANK: Object.freeze({
        strainId: 'CARAPACE',
        displayName: 'Guardian Strain',
        instinctTagline: 'Armor remembers every impact and grows around it.',
        startingMutationBranch: 'guardian',
        skillRenames: Object.freeze({
            'BRACE': 'CARAPACE LOCK',
            'REINFORCED PLATING': 'SHELL BLOOM',
            'HEAVY IMPACT': 'BROODWARD SHOVE'
        })
    }),
    ENGINEER: Object.freeze({
        strainId: 'WEAVER',
        displayName: 'Technomorph Strain',
        instinctTagline: 'Tools become instincts; wires become nerves.',
        startingMutationBranch: 'weaver',
        skillRenames: Object.freeze({
            'REROUTE': 'NEURAL HIJACK',
            'CONSOLE DISCOUNT': 'TERMINAL SPORE',
            'FIELD REPAIR': 'RESIN PATCH'
        })
    })
});

function clampCount(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
}

function normalizeClassId(classId) {
    return CLASS_IDS.includes(classId) ? classId : 'ENGINEER';
}

function normalizeSkills(skillsUsed) {
    if (!Array.isArray(skillsUsed)) return [];
    return [...new Set(skillsUsed.map((skill) => String(skill ?? '').trim().toUpperCase()).filter(Boolean))].sort();
}

export function deriveInheritance(preludeSummary = {}) {
    const classId = normalizeClassId(preludeSummary.classId ?? preludeSummary.classType ?? preludeSummary.playerType);
    const strain = STRAIN_BY_CLASS[classId];
    const skillsUsed = normalizeSkills(preludeSummary.skillsUsed);
    const blackBoxesRecovered = clampCount(preludeSummary.blackBoxesRecovered);
    const snailsKilled = clampCount(preludeSummary.snailsKilled ?? preludeSummary.killCount);
    const salvageBanked = clampCount(preludeSummary.salvageBanked ?? preludeSummary.salvage);
    const deepestDepthTier = clampCount(preludeSummary.deepestDepthTier ?? preludeSummary.depthTier ?? preludeSummary.depth);

    const seedMutations = skillsUsed
        .map((skill) => strain.skillRenames[skill])
        .filter(Boolean);

    return Object.freeze({
        sourceClass: classId,
        strainId: strain.strainId,
        displayName: strain.displayName,
        startingMutationBranch: strain.startingMutationBranch,
        seedMutations: Object.freeze(seedMutations),
        chitin: Math.min(999, snailsKilled * 2 + deepestDepthTier * 3),
        geneticMemory: Math.min(999, blackBoxesRecovered * 25 + salvageBanked + skillsUsed.length * 5),
        preludeEcho: Object.freeze({
            blackBoxesRecovered,
            snailsKilled,
            salvageBanked,
            deepestDepthTier
        })
    });
}

export function getStrainForClass(classId) {
    return STRAIN_BY_CLASS[normalizeClassId(classId)];
}
