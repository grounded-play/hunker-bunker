// ── Post-Level Crash Site Wanderer & Companion System ──────────────────
// Gated to appear ONLY after the O2 Generator is built (o2Bubble unlocked)
// AND the first milestone boss is defeated.

import { COMMUNITY_SKINS } from './data/communitySkins.js';
import { FOXHOLE_CONTRACT, HACKER_CONTRACT, HYBRID_CONTRACT, SURVIVOR_REWARDS, SURVIVOR_CONTRACTS, CONTRACT_BY_FAMILY } from './survivorContract.js';

export const WANDERER_STORAGE_KEY = 'hb_wanderer_state_v1';

export const WANDERER_ARCHETYPES = Object.freeze({
    manic_hacker: {
        familyId: 'manic_hacker',
        title: 'Manic Hacker GF',
        portrait: '/lore_portraits/survivor_hacker.webp',
        skins: ['comm_scout_soft_manic_infiltrator_gf', 'comm_tank_chubby_protective_hacker_gf', 'comm_eng_soft_manic_architect_gf'],
        greeting: "Whoa, hold fire! Your base terminal was screaming an unencrypted handshake from three strata away. Mind if I set up my rig by your fire?",
        question: "I can bypass the deep-core security grids for you, but are you gonna treat me like a squadmate or just another battery to burn?",
        dialogueBefriend: "Hell yeah! Hand me a soldering iron and let's overclock your whole armory. I've got your six!",
        dialogueChase: "Tch! Paranoic rust-bucket! Enjoy getting fried by the first laser barrier you trip!",
        passiveBuff: { name: 'Cyber Overclock', desc: '+15% Hack Speed & Laser Trap Radar' },
        assistAbility: { name: 'EMP Glitch Burst', cooldown: 18, desc: 'Stuns robotic enemies and disables traps for 4s.' },
        chaseLoot: { scrap: 35, tech: 3 },
        quest: CONTRACT_BY_FAMILY.manic_hacker
    },
    corpo_runner: {
        familyId: 'corpo_runner',
        title: 'Corpo Shadow Runner',
        portrait: '/lore_portraits/survivor_corpo.webp',
        skins: ['comm_scout_corpo_shadow_runner', 'comm_tank_corpo_shadow_runner', 'comm_eng_corpo_shadow_runner'],
        greeting: "Lower the muzzle. Horizon Corp left me for dead when the lower bulkheads collapsed. I see you survived the crash too.",
        question: "I have high-clearance telemetry on every high-value target in this sector. Do we have a contract, or are you operating pro-bono?",
        dialogueBefriend: "Contract ratified. Keep me alive, and I will ensure every bullet you fire finds its highest-yield dividend.",
        dialogueChase: "Amateur. When the clean-up squads descend, don't say I didn't offer a buyout!",
        passiveBuff: { name: 'Bounty Ledger', desc: '+20% Scrap & Relic Fragment Yield' },
        assistAbility: { name: 'Precision Mark', cooldown: 20, desc: 'Marks the strongest target, increasing critical damage taken by +35% for 6s.' },
        chaseLoot: { scrap: 45, coin: 4 },
        quest: CONTRACT_BY_FAMILY.corpo_runner
    },
    foxhole_buddy: {
        familyId: 'foxhole_buddy',
        title: 'Foxhole Shadow',
        portrait: '/lore_portraits/survivor_foxhole.webp',
        skins: ['comm_scout_foxhole_shadow', 'comm_tank_foxhole_shadow', 'comm_eng_foxhole_shadow'],
        greeting: "Heads up, soldier! Vasquez-squad reporting in. Heard your O2 generator roar to life from the trench line. Good to see friendly armor.",
        question: "Ammo is low and the nest is boiling over. Are we digging in together, or am I humping this frontline solo?",
        dialogueBefriend: "That's what I'm talking about! Lock and load, partner. Nothing breaches this perimeter while we draw breath.",
        dialogueChase: "Understood, Commander. Watch your flanks—the deep crust doesn't take prisoners!",
        passiveBuff: { name: 'Foxhole Discipline', desc: '+10% Max Health & +20% Knockback Resistance' },
        assistAbility: { name: 'Covering Fire', cooldown: 15, desc: 'Unleashes suppressing kinetic fire, staggering swarms in a wide cone.' },
        chaseLoot: { scrap: 30, med: 3 },
        quest: CONTRACT_BY_FAMILY.foxhole_buddy
    },
    crash_queen: {
        familyId: 'crash_queen',
        title: 'Crash Survivor Queen',
        portrait: '/lore_portraits/survivor_crash_queen.webp',
        skins: ['comm_scout_tank_crash', 'comm_tank_afro_crash', 'comm_eng_afro_crash'],
        greeting: "Peace, operator. My drop-pod sheared in half through the upper mantle. I saw your beacon pierce the ash.",
        question: "I carry the solar harmonics of our flagship. If I march with you, will you help me guide the lost souls to safety?",
        dialogueBefriend: "Then let our light burn through this darkness. My kinetic shields are yours.",
        dialogueChase: "May the ancestors shield you, operator. The dark will not stay quiet for long.",
        passiveBuff: { name: 'Regal Resonance', desc: '+15% Shield Recharge Rate & +10% Max Shield' },
        assistAbility: { name: 'Supercharged Barrier', cooldown: 25, desc: 'Projects an invulnerable 3m kinetic barrier dome for 4s when HP drops low.' },
        chaseLoot: { scrap: 40, tech: 4 },
        quest: CONTRACT_BY_FAMILY.crash_queen
    },
    abg_tripper: {
        familyId: 'abg_tripper',
        title: 'Space ABG Tripper',
        portrait: '/lore_portraits/survivor_abg.webp',
        skins: ['comm_scout_abg', 'comm_tank_abg', 'comm_eng_abg'],
        greeting: "Yo! That bass drop from your generator was wild! Been cruising these tunnels with no signal for days. Got any extra fuel?",
        question: "I've got the sickest rave-mod flares in the sector. You ready to turn this grim bunker into a party or what?",
        dialogueBefriend: "Vibes confirmed! Turn up the tempo, let's show these subterranean creepers how we roll!",
        dialogueChase: "Ugh, total buzzkill. Have fun being miserable in your tin can!",
        passiveBuff: { name: 'Neon Rush', desc: '+12% Movement Speed & +1 Dash Charge' },
        assistAbility: { name: 'Flash-Vibe Flare', cooldown: 16, desc: 'Fires a strobe flare that blinds and slows all nearby enemies by 50% for 5s.' },
        chaseLoot: { scrap: 35, coin: 5 },
        quest: CONTRACT_BY_FAMILY.abg_tripper
    },
    species_hybrid: {
        familyId: 'species_hybrid',
        title: 'Species Chrysalis',
        portrait: '/lore_portraits/survivor_hybrid.webp',
        skins: ['comm_scout_xeno_stalker', 'comm_tank_brood_matron', 'comm_eng_neural_weaver', 'comm_scount_sil', 'comm_tank_sil', 'comm_eng_sil'],
        greeting: "...We feel the vibration of your warm air generator. The hive queen is dead... we seek a new shepherd.",
        question: "Our blood is changed, but our consciousness remains human. Do you fear our evolution, or will you embrace the metamorphosis?",
        dialogueBefriend: "...We are bound. Our bio-tendrils will weave defense around your armor.",
        dialogueChase: "...We retreat into the bio-mist. Do not tread where the spores bloom thickest...",
        passiveBuff: { name: 'Symbiotic Adaptation', desc: '+25% Toxin & Acid Resistance, Regenerates 1 HP every 30s' },
        assistAbility: { name: 'Bio-Silk Entangle', cooldown: 22, desc: 'Shoots living silk webbing that roots and suffocates the target for 4s.' },
        chaseLoot: { scrap: 50, med: 5 },
        quest: CONTRACT_BY_FAMILY.species_hybrid
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
        questEventIds: [],
        contractProgress: {},
        pendingRewards: [],
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
                    const state = {
                        ...createDefaultWandererState(),
                        ...parsed
                    };
                    for (const key of ['metWandererIds', 'questEventIds', 'pendingRewards', 'history']) {
                        if (!Array.isArray(state[key])) state[key] = [];
                    }
                    if (!state.completedQuests || typeof state.completedQuests !== 'object') state.completedQuests = {};
                    if (!WANDERER_ARCHETYPES[state.activeCompanion?.familyId]) state.activeCompanion = null;
                    const progress = state.contractProgress;
                    state.contractProgress = {};
                    for (const [id, template] of Object.entries(SURVIVOR_CONTRACTS)) {
                        const saved = progress?.[id];
                        if (!saved || typeof saved !== 'object') continue;
                        state.contractProgress[id] = {
                            progress: Math.min(template.targetCount, Math.max(0, Math.floor(Number(saved.progress) || 0))),
                            eventIds: Array.isArray(saved.eventIds) ? saved.eventIds.filter((id) => typeof id === 'string' && id.length <= 200).slice(-16) : []
                        };
                    }
                    const legacy = {
                        quest_foxhole_tags: FOXHOLE_CONTRACT.id, quest_hacker_core: HACKER_CONTRACT.id,
                        quest_species_genesis: HYBRID_CONTRACT.id, quest_corpo_severance: CONTRACT_BY_FAMILY.corpo_runner.id,
                        quest_crash_beacon: CONTRACT_BY_FAMILY.crash_queen.id, quest_abg_vinyl: CONTRACT_BY_FAMILY.abg_tripper.id
                    };
                    const oldId = state.activeQuest?.id;
                    const template = SURVIVOR_CONTRACTS[legacy[oldId] || oldId];
                    if (template) {
                        const amount = legacy[oldId] ? 0 : Math.min(template.targetCount, Math.max(0, Math.floor(Number(state.activeQuest.progress) || 0)));
                        state.activeQuest = { ...template, progress: amount };
                        state.questProgress = amount;
                        if (legacy[oldId]) state.questEventIds = [];
                        state.contractProgress[template.id] = { progress: amount, eventIds: [...state.questEventIds] };
                    } else {
                        state.activeQuest = null;
                        state.questProgress = 0;
                        state.questEventIds = [];
                    }
                    return state;
                }
            }
        } catch {
            // fall back
        }
        return createDefaultWandererState();
    }

    save() {
        const quest = this.state.activeQuest;
        if (quest && SURVIVOR_CONTRACTS[quest.id]) {
            this.state.contractProgress[quest.id] = { progress: quest.progress || 0, eventIds: [...this.state.questEventIds] };
        }
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
    rollWanderer(eligibilityParams = {}, random = Math.random) {
        if (!isWandererEligible(eligibilityParams)) {
            return null;
        }

        const keys = Object.keys(WANDERER_ARCHETYPES);
        const randomKey = this.state.metWandererIds.length === 0
            ? 'foxhole_buddy'
            : keys[Math.min(keys.length - 1, Math.floor(random() * keys.length))];
        const archetype = WANDERER_ARCHETYPES[randomKey];

        const randomSkinId = archetype.skins[Math.min(archetype.skins.length - 1, Math.floor(random() * archetype.skins.length))];
        const skinMeta = COMMUNITY_SKINS.find((s) => s.id === randomSkinId);

        return {
            familyId: archetype.familyId,
            title: archetype.title,
            portrait: archetype.portrait || '/lore_portraits/survivor_foxhole.webp',
            skinId: randomSkinId,
            name: skinMeta ? skinMeta.name : archetype.title,
            glbUrl: skinMeta ? skinMeta.glbUrl : '/3d/runtime/community/scout_foxhole_shadow.glb',
            actionKey: skinMeta ? skinMeta.actionKey : 'salute',
            greeting: archetype.greeting,
            question: archetype.question,
            dialogueBefriend: this.state.completedQuests[CONTRACT_BY_FAMILY[archetype.familyId].id]
                ? (CONTRACT_BY_FAMILY[archetype.familyId].reunionLine || archetype.dialogueBefriend)
                : archetype.dialogueBefriend,
            dialogueChase: archetype.dialogueChase,
            passiveBuff: archetype.passiveBuff,
            assistAbility: archetype.assistAbility,
            chaseLoot: archetype.chaseLoot,
            // Only offer contracts with live objectives and a delivered reward.
            quest: this.state.completedQuests[CONTRACT_BY_FAMILY[archetype.familyId].id]
                ? null : { ...CONTRACT_BY_FAMILY[archetype.familyId] }
        };
    }

    /**
     * Befriend action: sets active companion and starts quest.
     */
    befriend(wanderer) {
        if (!wanderer) return null;
        this.state.activeCompanion = {
            familyId: wanderer.familyId,
            title: wanderer.title,
            portrait: wanderer.portrait || '/lore_portraits/survivor_foxhole.webp',
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

        // Save the outgoing contract before selecting the incoming one.
        this.save();
        const contract = CONTRACT_BY_FAMILY[wanderer.familyId];
        if (contract && !this.state.completedQuests[contract.id]) {
            const saved = this.state.contractProgress[contract.id];
            this.state.activeQuest = { ...contract, progress: saved?.progress ?? 0 };
            this.state.questProgress = this.state.activeQuest.progress;
            this.state.questEventIds = [...(saved?.eventIds ?? [])];
        } else {
            this.state.activeQuest = null;
            this.state.questProgress = 0;
            this.state.questEventIds = [];
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
        if (!Number.isFinite(count) || count <= 0) return null;
        this.state.activeQuest.progress = Math.min(
            this.state.activeQuest.targetCount,
            (this.state.activeQuest.progress || 0) + count
        );
        this.state.questProgress = this.state.activeQuest.progress;

        const isComplete = this.state.activeQuest.progress >= this.state.activeQuest.targetCount;
        if (isComplete) {
            this.state.completedQuests[this.state.activeQuest.id] = true;
            if (Object.hasOwn(SURVIVOR_REWARDS, this.state.activeQuest.id)) {
                this.state.pendingRewards = [...new Set([...(this.state.pendingRewards ?? []), this.state.activeQuest.id])];
            }
            this.state.contractProgress[this.state.activeQuest.id] = {
                progress: this.state.activeQuest.progress, eventIds: [...this.state.questEventIds]
            };
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

    recordQuestEvent({ id, type } = {}) {
        const quest = this.state.activeQuest;
        if (!quest || !this.state.activeCompanion) return null;
        if (typeof id !== 'string' || !id || id.length > 200) return null;

        const stages = SURVIVOR_CONTRACTS[quest.id]?.stages;
        if (stages) {
            if (this.state.activeCompanion.familyId !== quest.familyId || this.state.questEventIds.includes(id)) return null;
            let threshold = 0;
            const stage = stages.find((entry) => { threshold += entry.count; return (quest.progress || 0) < threshold; });
            if (!stage || stage.type !== type) return null;
            this.state.questEventIds = [...this.state.questEventIds, id].slice(-16);
            return this.advanceQuest(1);
        }

        if (quest.id === FOXHOLE_CONTRACT.id && this.state.activeCompanion.familyId === 'foxhole_buddy') {
            const progress = quest.progress || 0;
            const expected = progress < 8 ? 'enemy-killed' : 'camp-complete';
            if (type !== expected || this.state.questEventIds?.includes(id)) return null;
            this.state.questEventIds = [...(this.state.questEventIds ?? []), id].slice(-16);
            return this.advanceQuest(1);
        }

        if (quest.id === HACKER_CONTRACT.id && this.state.activeCompanion.familyId === 'manic_hacker') {
            if (type !== 'terminal-decrypted' || this.state.questEventIds?.includes(id)) return null;
            this.state.questEventIds = [...(this.state.questEventIds ?? []), id].slice(-16);
            return this.advanceQuest(1);
        }

        if (quest.id === HYBRID_CONTRACT.id && this.state.activeCompanion.familyId === 'species_hybrid') {
            if (type !== 'hive-harvested' || this.state.questEventIds?.includes(id)) return null;
            this.state.questEventIds = [...(this.state.questEventIds ?? []), id].slice(-16);
            return this.advanceQuest(1);
        }

        return null;
    }

    deliverPendingRewards(bank) {
        if (typeof bank?.claimSurvivorReward !== 'function') return [];
        const delivered = [];
        for (const id of this.state.pendingRewards ?? []) {
            if (!Object.hasOwn(SURVIVOR_REWARDS, id)) continue;
            bank.claimSurvivorReward(id);
            delivered.push(id);
        }
        if (delivered.length) {
            this.state.pendingRewards = this.state.pendingRewards.filter((id) => !delivered.includes(id));
            this.save();
        }
        return delivered;
    }

    dismissCompanion() {
        this.state.activeCompanion = null;
        this.save();
    }
}
