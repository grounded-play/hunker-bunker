// ── Community 3D Models & Animations Roster ───────────────────────────
// Maps the 30 community chassis skins and animation actions across Scout, Tank,
// and Engineer classes for loadouts, Armory previews, gestures, and survivor camp NPCs.

export const COMMUNITY_SKINS = Object.freeze([
    // ── SCOUT SKINS ──────────────────────────────────────────
    {
        id: 'comm_scout_foxhole_shadow',
        classId: 'scout',
        name: 'Scout: Foxhole Shadow',
        theme: 'Foxhole Buddies',
        desc: 'Battle-hardened, loyal reconnaissance scout in tactical fatigues.',
        glbUrl: '/3d/runtime/community/scout_foxhole_shadow.glb',
        actionKey: 'acknowledging',
        actionLabel: 'Acknowledging',
        rarity: 'epic',
        isUnlockedDefault: true
    },
    {
        id: 'comm_scout_abg',
        classId: 'scout',
        name: 'Scout: Space ABG',
        theme: 'ABG Trippers',
        desc: 'Stylish and fearless void-drifter in neon street gear.',
        glbUrl: '/3d/runtime/community/scout_abg.glb',
        actionKey: 'catwalkWalking',
        actionLabel: 'Catwalk Walking',
        rarity: 'rare',
        isUnlockedDefault: true
    },
    {
        id: 'comm_scout_corpo_shadow_runner',
        classId: 'scout',
        name: 'Scout: Corpo Shadow Runner',
        theme: 'Corpo Shadows',
        desc: 'Cynical, razor-sharp corporate infiltrator in high-tech trench wear.',
        glbUrl: '/3d/runtime/community/scout_corpo_shadow_runner.glb',
        actionKey: 'femaleWalk',
        actionLabel: 'Female Walk',
        rarity: 'rare',
        isUnlockedDefault: true
    },
    {
        id: 'comm_scout_xeno_stalker',
        classId: 'scout',
        name: 'Scout: Xeno-Stalker',
        theme: 'Biomechanical',
        desc: 'Giger-esque biomechanical scout with ribbed obsidian carapace.',
        glbUrl: '/3d/runtime/community/scout_xeno_stalker.glb',
        actionKey: 'hangingIdle',
        actionLabel: 'Hanging Idle',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_scout_swim',
        classId: 'scout',
        name: 'Scout: Zero-G Swimsuit',
        theme: 'Space Swim',
        desc: 'Hydrodynamic zero-gravity tactical swimwear with LED conduits.',
        glbUrl: '/3d/runtime/community/scout_swim.glb',
        actionKey: 'injuredWalkBackwards',
        actionLabel: 'Injured Walk Backwards',
        rarity: 'rare',
        isUnlockedDefault: true
    },
    {
        id: 'comm_scout_toxic_apex_chrysalis',
        classId: 'scout',
        name: 'Scout: Toxic Apex Chrysalis',
        theme: 'Toxic Chrysalis',
        desc: 'Corrupted hive-symbiote scout glowing with toxic spore bioluminescence.',
        glbUrl: '/3d/runtime/community/scout_toxic_apex_chrysalis.glb',
        actionKey: 'joyfulJump',
        actionLabel: 'Joyful Jump',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_scount_sil',
        classId: 'scout',
        name: 'Scout: Species Sil',
        theme: 'Species Chrysalis',
        desc: 'Predatory alien-humanoid hybrid in pearlescent bone armor.',
        glbUrl: '/3d/runtime/community/scount_sil.glb',
        actionKey: 'salute',
        actionLabel: 'Salute',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_scout_apex',
        classId: 'scout',
        name: 'Scout: Apex Chrysalis',
        theme: 'Species Chrysalis',
        desc: 'Regal crystalline hybrid scout with bio-luminescent tendrils.',
        glbUrl: '/3d/runtime/community/scout_apex.glb',
        actionKey: 'surprised',
        actionLabel: 'Surprised',
        rarity: 'epic',
        isUnlockedDefault: true
    },
    {
        id: 'comm_scout_soft_manic_infiltrator_gf',
        classId: 'scout',
        name: 'Scout: Soft Manic Hacker GF',
        theme: 'Manic Hacker GFs',
        desc: 'Pink-haired space-punk hacker scout with an anarchist attitude.',
        glbUrl: '/3d/runtime/community/scout_soft_manic_infiltrator_gf.glb',
        actionKey: 'usingAFaxMachine',
        actionLabel: 'Using A Fax Machine',
        rarity: 'epic',
        isUnlockedDefault: true
    },

    // ── TANK SKINS ───────────────────────────────────────────
    {
        id: 'comm_tank_abg',
        classId: 'tank',
        name: 'Tank: Space ABG',
        theme: 'ABG Trippers',
        desc: 'Heavyweight party vanguard equipped for high-impact bunker defense.',
        glbUrl: '/3d/runtime/community/tank_abg.glb',
        actionKey: 'bartending',
        actionLabel: 'Bartending',
        rarity: 'rare',
        isUnlockedDefault: true
    },
    {
        id: 'comm_tank_chubby_protective_hacker_gf',
        classId: 'tank',
        name: 'Tank: Protective Hacker GF',
        theme: 'Manic Hacker GFs',
        desc: 'Curvy, heavily armored space-punk brawler who protects her squad fiercely.',
        glbUrl: '/3d/runtime/community/tank_chubby_protective_hacker_gf.glb',
        actionKey: 'brutalAssassination',
        actionLabel: 'Brutal Assassination',
        rarity: 'epic',
        isUnlockedDefault: true
    },
    {
        id: 'comm_tank_sil',
        classId: 'tank',
        name: 'Tank: Species Sil',
        theme: 'Species Chrysalis',
        desc: 'Heavy metamorphic alien juggernaut in calcified chitin armor.',
        glbUrl: '/3d/runtime/community/tank_sil.glb',
        actionKey: 'catwalkWalkForwardHighknees',
        actionLabel: 'Catwalk Walk HighKnees',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_scout_tank_crash',
        classId: 'tank',
        name: 'Tank: Crash Survivor Queen',
        theme: 'Crash Survivors',
        desc: 'Unapologetically regal starship crash survivor with sparking cybernetics.',
        glbUrl: '/3d/runtime/community/scout_tank_crash.glb',
        actionKey: 'dancingTwerk',
        actionLabel: 'Dancing Twerk',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_tank_corpo_shadow_runner',
        classId: 'tank',
        name: 'Tank: Corpo Executive Warden',
        theme: 'Corpo Shadows',
        desc: 'Imposing corporate director in a heavy draped overcoat and chrome limbs.',
        glbUrl: '/3d/runtime/community/tank_corpo_shadow_runner.glb',
        actionKey: 'drunkIdleVariation',
        actionLabel: 'Drunk Idle Variation',
        rarity: 'rare',
        isUnlockedDefault: true
    },
    {
        id: 'comm_tank_swim',
        classId: 'tank',
        name: 'Tank: Zero-G Heavy Diver',
        theme: 'Space Swim',
        desc: 'Reinforced deep-sea zero-g dive suit with buoyancy ballast plates.',
        glbUrl: '/3d/runtime/community/tank_swim.glb',
        actionKey: 'jump',
        actionLabel: 'Jump',
        rarity: 'rare',
        isUnlockedDefault: true
    },
    {
        id: 'comm_tank_brood_matron',
        classId: 'tank',
        name: 'Tank: Brood Matron',
        theme: 'Biomechanical',
        desc: 'Massive Giger-inspired armored bio-carapace fortress.',
        glbUrl: '/3d/runtime/community/tank_brood_matron.glb',
        actionKey: 'jumpAttack',
        actionLabel: 'Jump Attack',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_tank_foxhole_shadow',
        classId: 'tank',
        name: 'Tank: Foxhole Shadow',
        theme: 'Foxhole Buddies',
        desc: 'Tough, loyal Vasquez-coded frontline heavy ready for any trench brawl.',
        glbUrl: '/3d/runtime/community/tank_foxhole_shadow.glb',
        actionKey: 'kickToTheGroin',
        actionLabel: 'Kick To The Groin',
        rarity: 'epic',
        isUnlockedDefault: true
    },
    {
        id: 'comm_tank_afro_crash',
        classId: 'tank',
        name: 'Tank: Afro Crash Survivor',
        theme: 'Crash Survivors',
        desc: 'Powerful deep-core survivor armored in salvaged spaceship hull plating.',
        glbUrl: '/3d/runtime/community/tank_afro_crash.glb',
        actionKey: 'talking',
        actionLabel: 'Talking',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_tank_apex',
        classId: 'tank',
        name: 'Tank: Apex Chrysalis',
        theme: 'Species Chrysalis',
        desc: 'Statuesque hybrid juggernaut with glowing amber vascular lines.',
        glbUrl: '/3d/runtime/community/tank_apex.glb',
        actionKey: 'tellingASecret',
        actionLabel: 'Telling A Secret',
        rarity: 'epic',
        isUnlockedDefault: true
    },
    {
        id: 'comm_tank_toxic_apex_chrysalis',
        classId: 'tank',
        name: 'Tank: Toxic Apex Chrysalis',
        theme: 'Toxic Chrysalis',
        desc: 'Toxic spore-infused heavy bio-carapace with corrosive acid vents.',
        glbUrl: '/3d/runtime/community/tank_toxic_apex_chrysalis.glb',
        actionKey: 'walkStrafeLeft',
        actionLabel: 'Walk Strafe Left',
        rarity: 'legendary',
        isUnlockedDefault: true
    },

    // ── ENGINEER SKINS ───────────────────────────────────────
    {
        id: 'comm_eng_toxic_apex_chrysalis',
        classId: 'engineer',
        name: 'Engineer: Toxic Apex Chrysalis',
        theme: 'Toxic Chrysalis',
        desc: 'Bio-plasma engineer mutated by deep-strata toxic spore hives.',
        glbUrl: '/3d/runtime/community/eng_toxic_apex_chrysalis.glb',
        actionKey: 'angry',
        actionLabel: 'Angry',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_eng_abg',
        classId: 'engineer',
        name: 'Engineer: Space ABG',
        theme: 'ABG Trippers',
        desc: 'Futuristic gearhead technician rocking streetwear and holographic tools.',
        glbUrl: '/3d/runtime/community/eng_abg.glb',
        actionKey: 'burpeeEnd',
        actionLabel: 'Burpee End',
        rarity: 'rare',
        isUnlockedDefault: true
    },
    {
        id: 'comm_eng_sil',
        classId: 'engineer',
        name: 'Engineer: Species Sil',
        theme: 'Species Chrysalis',
        desc: 'Neural-hybrid constructor with living plasma conduits and tentacle cables.',
        glbUrl: '/3d/runtime/community/eng_sil.glb',
        actionKey: 'crouchToStand',
        actionLabel: 'Crouch To Stand',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_eng_corpo_shadow_runner',
        classId: 'engineer',
        name: 'Engineer: Chief Architect',
        theme: 'Corpo Shadows',
        desc: 'High-fashion tech-syndicate director with floating micro-drones.',
        glbUrl: '/3d/runtime/community/eng_corpo_shadow_runner.glb',
        actionKey: 'drunkWalk',
        actionLabel: 'Drunk Walk',
        rarity: 'rare',
        isUnlockedDefault: true
    },
    {
        id: 'comm_eng_soft_manic_architect_gf',
        classId: 'engineer',
        name: 'Engineer: Soft Manic Architect GF',
        theme: 'Manic Hacker GFs',
        desc: 'Hyper-creative manic engineer with pink cyber-hair and custom plasma welders.',
        glbUrl: '/3d/runtime/community/eng_soft_manic_architect_gf.glb',
        actionKey: 'kettlebellSwing',
        actionLabel: 'Kettlebell Swing',
        rarity: 'epic',
        isUnlockedDefault: true
    },
    {
        id: 'comm_eng_afro_crash',
        classId: 'engineer',
        name: 'Engineer: Afro Crash Survivor',
        theme: 'Crash Survivors',
        desc: 'Ingenious starship survivor retrofitting wrecked engines into bunker tech.',
        glbUrl: '/3d/runtime/community/eng_afro_crash.glb',
        actionKey: 'lookAround',
        actionLabel: 'Look Around',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_eng_swim',
        classId: 'engineer',
        name: 'Engineer: Zero-G Hydro-Rig',
        theme: 'Space Swim',
        desc: 'Thermal-regulating swim gear with waterproof magnetic ballast clamps.',
        glbUrl: '/3d/runtime/community/eng_swim.glb',
        actionKey: 'orcIdle',
        actionLabel: 'Orc Idle',
        rarity: 'rare',
        isUnlockedDefault: true
    },
    {
        id: 'comm_eng_foxhole_shadow',
        classId: 'engineer',
        name: 'Engineer: Foxhole Shadow',
        theme: 'Foxhole Buddies',
        desc: 'Grit-and-grease combat engineer who fixes rifts and turrets under fire.',
        glbUrl: '/3d/runtime/community/eng_foxhole_shadow.glb',
        actionKey: 'sittingAngry',
        actionLabel: 'Sitting Angry',
        rarity: 'epic',
        isUnlockedDefault: true
    },
    {
        id: 'comm_eng_neural_weaver',
        classId: 'engineer',
        name: 'Engineer: Neural Weaver',
        theme: 'Biomechanical',
        desc: 'Giger-inspired biomechanical constructor with spine-mounted bio-tools.',
        glbUrl: '/3d/runtime/community/eng_neural_weaver.glb',
        actionKey: 'startPlank',
        actionLabel: 'Start Plank',
        rarity: 'legendary',
        isUnlockedDefault: true
    },
    {
        id: 'comm_eng_apex',
        classId: 'engineer',
        name: 'Engineer: Apex Chrysalis',
        theme: 'Species Chrysalis',
        desc: 'Bio-synthetic architect with crystalline thoracic power conduits.',
        glbUrl: '/3d/runtime/community/eng_apex.glb',
        actionKey: 'thankful',
        actionLabel: 'Thankful',
        rarity: 'epic',
        isUnlockedDefault: true
    }
]);

export const COMMUNITY_GESTURES = Object.freeze(
    COMMUNITY_SKINS.map((s) => s.actionKey).filter((v, i, a) => a.indexOf(v) === i)
);

export const COMMUNITY_GLB_MAP = Object.freeze(
    Object.fromEntries(COMMUNITY_SKINS.map((s) => [s.id, s.glbUrl]))
);

export const COMMUNITY_CLASS_MAP = Object.freeze({
    scout: COMMUNITY_SKINS.filter((s) => s.classId === 'scout').map((s) => s.id),
    tank: COMMUNITY_SKINS.filter((s) => s.classId === 'tank').map((s) => s.id),
    engineer: COMMUNITY_SKINS.filter((s) => s.classId === 'engineer').map((s) => s.id)
});

/**
 * Returns a random community skin definition for a survivor camp or hive site.
 * @param {string} locationType - 'camp' | 'hive' | 'crash'
 * @returns {object}
 */
export function getRandomSurvivorNpc(locationType = 'camp') {
    let pool = COMMUNITY_SKINS;
    if (locationType === 'hive') {
        pool = COMMUNITY_SKINS.filter((s) => ['Biomechanical', 'Toxic Chrysalis', 'Species Chrysalis'].includes(s.theme));
    } else if (locationType === 'crash') {
        pool = COMMUNITY_SKINS.filter((s) => ['Crash Survivors', 'Manic Hacker GFs'].includes(s.theme));
    } else if (locationType === 'camp') {
        pool = COMMUNITY_SKINS.filter((s) => ['Foxhole Buddies', 'Corpo Shadows', 'ABG Trippers'].includes(s.theme));
    }
    if (pool.length === 0) pool = COMMUNITY_SKINS;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return {
        ...picked,
        dialogueSeed: `${picked.name} in ${picked.theme}`,
        questHook: `task_${picked.id}`
    };
}
