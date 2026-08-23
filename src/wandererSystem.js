// ── Post-Level Crash Site Wanderer & Companion System ──────────────────
// Gated to appear ONLY after the O2 Generator is built (o2Bubble unlocked)
// AND the first milestone boss is defeated.

import { COMMUNITY_SKINS } from './data/communitySkins.js';

export const WANDERER_STORAGE_KEY = 'hb_wanderer_state_v1';

export const WANDERER_ARCHETYPES = Object.freeze({
    manic_hacker: {
        familyId: 'manic_hacker',
        title: 'Manic Hacker GF',
        skins: ['comm_scout_soft_manic_infiltrator_gf', 'comm_tank_chubby_protective_hacker_gf', 'comm_eng_soft_manic_architect_gf'],
        greeting: "Whoa, hold fire! Your base terminal was screaming an unencrypted handshake from three strata away. Mind if I set up my rig by your fire?",
        question: "I can bypass the deep-core security grids for you, but are you gonna treat me like a squadmate or just another battery to burn?",
        dialogueBefriend: "Hell yeah! Hand me a soldering iron and let's overclock your whole armory. I've got your six!",
        dialogueChase: "Tch! Paranoic rust-bucket! Enjoy getting fried by the first laser barrier you trip!",
        passiveBuff: { name: 'Cyber Overclock', desc: '+15% Hack Speed & Laser Trap Radar' },
        assistAbility: { name: 'EMP Glitch Burst', cooldown: 18, desc: 'Stuns robotic enemies and disables traps for 4s.' },
        chaseLoot: { scrap: 35, tech: 3 },
        quest: {
            id: 'quest_hacker_core',
            title: 'Override the Core',
            desc: 'Decrypt 3 corrupted mainframe terminals in Stratum 2.',
            targetCount: 3,
            rewardSkinId: 'comm_scout_soft_manic_infiltrator_gf'
        }
    },
    corpo_runner: {
        familyId: 'corpo_runner',
        title: 'Corpo Shadow Runner',
        skins: ['comm_scout_corpo_shadow_runner', 'comm_tank_corpo_shadow_runner', 'comm_eng_corpo_shadow_runner'],
        greeting: "Lower the muzzle. Horizon Corp left me for dead when the lower bulkheads collapsed. I see you survived the crash too.",
        question: "I have high-clearance telemetry on every high-value target in this sector. Do we have a contract, or are you operating pro-bono?",
        dialogueBefriend: "Contract ratified. Keep me alive, and I will ensure every bullet you fire finds its highest-yield dividend.",
        dialogueChase: "Amateur. When the clean-up squads descend, don't say I didn't offer a buyout!",
        passiveBuff: { name: 'Bounty Ledger', desc: '+20% Scrap & Relic Fragment Yield' },
        assistAbility: { name: 'Precision Mark', cooldown: 20, desc: 'Marks the strongest target, increasing critical damage taken by +35% for 6s.' },
        chaseLoot: { scrap: 45, coin: 4 },
        quest: {
            id: 'quest_corpo_severance',
            title: 'Severance Package',
            desc: 'Recover the executive data-slate from the Horizon sub-vault.',
            targetCount: 1,
            rewardSkinId: 'comm_tank_corpo_shadow_runner'
        }
    },
    foxhole_buddy: {
        familyId: 'foxhole_buddy',
        title: 'Foxhole Shadow',
        skins: ['comm_scout_foxhole_shadow', 'comm_tank_foxhole_shadow', 'comm_eng_foxhole_shadow'],
        greeting: "Heads up, soldier! Vasquez-squad reporting in. Heard your O2 generator roar to life from the trench line. Good to see friendly armor.",
        question: "Ammo is low and the nest is boiling over. Are we digging in together, or am I humping this frontline solo?",
        dialogueBefriend: "That's what I'm talking about! Lock and load, partner. Nothing breaches this perimeter while we draw breath.",
        dialogueChase: "Understood, Commander. Watch your flanks—the deep crust doesn't take prisoners!",
        passiveBuff: { name: 'Foxhole Discipline', desc: '+10% Max Health & +20% Knockback Resistance' },
        assistAbility: { name: 'Covering Fire', cooldown: 15, desc: 'Unleashes suppressing kinetic fire, staggering swarms in a wide cone.' },
        chaseLoot: { scrap: 30, med: 3 },
        quest: {
            id: 'quest_foxhole_tags',
            title: 'Leave No One Behind',
            desc: 'Recover 4 fallen soldier dog tags from overrun forward bunkers.',
            targetCount: 4,
            rewardSkinId: 'comm_scout_foxhole_shadow'
        }
    },
    crash_queen: {
        familyId: 'crash_queen',
        title: 'Crash Survivor Queen',
        skins: ['comm_scout_tank_crash', 'comm_tank_afro_crash', 'comm_eng_afro_crash'],
        greeting: "Peace, operator. My drop-pod sheared in half through the upper mantle. I saw your beacon pierce the ash.",
        question: "I carry the solar harmonics of our flagship. If I march with you, will you help me guide the lost souls to safety?",
        dialogueBefriend: "Then let our light burn through this darkness. My kinetic shields are yours.",
        dialogueChase: "May the ancestors shield you, operator. The dark will not stay quiet for long.",
        passiveBuff: { name: 'Regal Resonance', desc: '+15% Shield Recharge Rate & +10% Max Shield' },
        assistAbility: { name: 'Supercharged Barrier', cooldown: 25, desc: 'Projects an invulnerable 3m kinetic barrier dome for 4s when HP drops low.' },
        chaseLoot: { scrap: 40, tech: 4 },
        quest: {
            id: 'quest_crash_beacon',
            title: 'Beacon in the Dark',
            desc: 'Repair the 2 crashed drop-ship solar arrays in the deep sector.',
            targetCount: 2,
            rewardSkinId: 'comm_tank_afro_crash'
        }
    },
    abg_tripper: {
        familyId: 'abg_tripper',
        title: 'Space ABG Tripper',
        skins: ['comm_scout_abg', 'comm_tank_abg', 'comm_eng_abg'],
        greeting: "Yo! That bass drop from your generator was wild! Been cruising these tunnels with no signal for days. Got any extra fuel?",
        question: "I've got the sickest rave-mod flares in the sector. You ready to turn this grim bunker into a party or what?",
        dialogueBefriend: "Vibes confirmed! Turn up the tempo, let's show these subterranean creepers how we roll!",
        dialogueChase: "Ugh, total buzzkill. Have fun being miserable in your tin can!",
        passiveBuff: { name: 'Neon Rush', desc: '+12% Movement Speed & +1 Dash Charge' },
        assistAbility: { name: 'Flash-Vibe Flare', cooldown: 16, desc: 'Fires a strobe flare that blinds and slows all nearby enemies by 50% for 5s.' },
        chaseLoot: { scrap: 35, coin: 5 },
        quest: {
            id: 'quest_abg_vinyl',
            title: 'VIP Access',
            desc: 'Find the secret subterranean lounge room and retrieve the Golden Vinyl.',
            targetCount: 1,
            rewardSkinId: 'comm_scout_abg'
        }
    },
    species_hybrid: {
        familyId: 'species_hybrid',
        title: 'Species Chrysalis',
        skins: ['comm_scout_xeno_stalker', 'comm_tank_brood_matron', 'comm_eng_neural_weaver', 'comm_scount_sil', 'comm_tank_sil', 'comm_eng_sil'],
        greeting: "...We feel the vibration of your warm air generator. The hive queen is dead... we seek a new shepherd.",
        question: "Our blood is changed, but our consciousness remains human. Do you fear our evolution, or will you embrace the metamorphosis?",
        dialogueBefriend: "...We are bound. Our bio-tendrils will weave defense around your armor.",
        dialogueChase: "...We retreat into the bio-mist. Do not tread where the spores bloom thickest...",
        passiveBuff: { name: 'Symbiotic Adaptation', desc: '+25% Toxin & Acid Resistance, Regenerates 1 HP every 30s' },
        assistAbility: { name: 'Bio-Silk Entangle', cooldown: 22, desc: 'Shoots living silk webbing that roots and suffocates the target for 4s.' },
        chaseLoot: { scrap: 50, med: 5 },
        quest: {
            id: 'quest_species_genesis',
            title: 'Symbiotic Genesis',
            desc: 'Harvest 5 intact bio-spore pods from hive chambers without damaging hive nodes.',
            targetCount: 5,
            rewardSkinId: 'comm_scount_sil'
        }
    }
});

/**
 * Validates whether wanderers are allowed to spawn.
 * GATED: Requires O2 generator built (o2Bubble unlocked in bank) AND at least 1 milestone boss defeated.
 * @param {object} param0
 * @param {object} param0.bank - Bank or state object containing unlocks
 * @param {Set|Array} param0.defeatedBosses - Defeated milestone boss keys
 * @returns {boolean}
 */
export function isWandererEligible({ bank = null, defeatedBosses = null, unlocks = null } = {}) {
    const bankUnlocks = bank?.getState?.()?.unlocks || bank?.unlocks || unlocks || {};
    const o2Built = Boolean(bankUnlocks.o2Bubble);
    if (!o2Built) return false;

    let hasDefeatedBoss = false;
    if (defeatedBosses instanceof Set) {
        hasDefeatedBoss = defeatedBosses.size > 0;
    } else if (Array.isArray(defeatedBosses)) {
        hasDefeatedBoss = defeatedBosses.length > 0;
    } else if (typeof defeatedBosses === 'object' && defeatedBosses !== null) {
        hasDefeatedBoss = Object.keys(defeatedBosses).length > 0;
    }

    return o2Built && hasDefeatedBoss;
}

export function createDefaultWandererState() {
    return {
        version: 1,
        activeCompanion: null,
        metWandererIds: [],
        completedQuests: {},
        activeQuest: null,
        questProgress: 0,
        history: []
    };
}

export class WandererManager {
    constructor({ storage = null } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.state = this.load();
    }

    load() {
        try {
            const raw = this.storage?.getItem(WANDERER_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    return {
                        ...createDefaultWandererState(),
                        ...parsed
                    };
                }
            }
        } catch {
            // fall back
        }
        return createDefaultWandererState();
    }

    save() {
        try {
            this.storage?.setItem(WANDERER_STORAGE_KEY, JSON.stringify(this.state));
        } catch {
            // best-effort
        }
    }

    /**
     * Rolls a random wanderer if eligible.
     * @param {object} eligibilityParams
     * @returns {object|null}
     */
    rollWanderer(eligibilityParams = {}) {
        if (!isWandererEligible(eligibilityParams)) {
            return null;
        }

        const keys = Object.keys(WANDERER_ARCHETYPES);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const archetype = WANDERER_ARCHETYPES[randomKey];

        const randomSkinId = archetype.skins[Math.floor(Math.random() * archetype.skins.length)];
        const skinMeta = COMMUNITY_SKINS.find((s) => s.id === randomSkinId);

        return {
            familyId: archetype.familyId,
            title: archetype.title,
            skinId: randomSkinId,
            name: skinMeta ? skinMeta.name : archetype.title,
            glbUrl: skinMeta ? skinMeta.glbUrl : '/3d/runtime/community/scout_foxhole_shadow.glb',
            actionKey: skinMeta ? skinMeta.actionKey : 'salute',
            greeting: archetype.greeting,
            question: archetype.question,
            dialogueBefriend: archetype.dialogueBefriend,
            dialogueChase: archetype.dialogueChase,
            passiveBuff: archetype.passiveBuff,
            assistAbility: archetype.assistAbility,
            chaseLoot: archetype.chaseLoot,
            quest: archetype.quest
        };
    }

    /**
     * Befriend action: sets active companion and starts quest.
     */
    befriend(wanderer) {
        if (!wanderer) return null;
        this.state.activeCompanion = {
            familyId: wanderer.familyId,
            skinId: wanderer.skinId,
            name: wanderer.name,
            glbUrl: wanderer.glbUrl,
            actionKey: wanderer.actionKey,
            passiveBuff: wanderer.passiveBuff,
            assistAbility: wanderer.assistAbility,
            assistCooldownRemaining: 0,
            currentHp: 100,
            maxHp: 100
        };

        if (wanderer.quest && !this.state.completedQuests[wanderer.quest.id]) {
            this.state.activeQuest = {
                ...wanderer.quest,
                progress: 0
            };
            this.state.questProgress = 0;
        }

        if (!this.state.metWandererIds.includes(wanderer.skinId)) {
            this.state.metWandererIds.push(wanderer.skinId);
        }

        this.state.history.push({
            action: 'befriend',
            wandererId: wanderer.skinId,
            timestamp: Date.now()
        });

        this.save();
        return {
            success: true,
            dialogue: wanderer.dialogueBefriend,
            companion: this.state.activeCompanion,
            quest: this.state.activeQuest
        };
    }

    /**
     * Chase off action: yields loot cache and closes encounter.
     */
    chaseOff(wanderer) {
        if (!wanderer) return null;
        if (!this.state.metWandererIds.includes(wanderer.skinId)) {
            this.state.metWandererIds.push(wanderer.skinId);
        }

        this.state.history.push({
            action: 'chase_off',
            wandererId: wanderer.skinId,
            timestamp: Date.now()
        });

        this.save();
        return {
            success: true,
            dialogue: wanderer.dialogueChase,
            lootGranted: wanderer.chaseLoot
        };
    }

    advanceQuest(count = 1) {
        if (!this.state.activeQuest) return null;
        this.state.activeQuest.progress = Math.min(
            this.state.activeQuest.targetCount,
            (this.state.activeQuest.progress || 0) + count
        );
        this.state.questProgress = this.state.activeQuest.progress;

        const isComplete = this.state.activeQuest.progress >= this.state.activeQuest.targetCount;
        if (isComplete) {
            this.state.completedQuests[this.state.activeQuest.id] = true;
            const completed = { ...this.state.activeQuest };
            this.state.activeQuest = null;
            this.state.questProgress = 0;
            this.save();
            return { completed: true, quest: completed };
        }

        this.save();
        return { completed: false, quest: this.state.activeQuest };
    }

    getActiveCompanion() {
        return this.state.activeCompanion;
    }

    dismissCompanion() {
        this.state.activeCompanion = null;
        this.save();
    }
}
