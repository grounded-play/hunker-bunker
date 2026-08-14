/**
 * Side Story Progression, Prerequisite Gates, Lockouts, Skips & Rewards Engine
 *
 * Preserves the main extraction run path while providing deep, multi-stage
 * opt-in companion storylines for:
 * - Sister Val ("Warmth of the Suture" // Camp Tallow)
 * - Commander Briggs ("Blood & Vanguard" // Camp Vesper)
 * - Overseer Kaelen ("Synaptic Overclock" // Camp Meridian)
 * - Specimen 0047-B / Aria ("The Queen's Siren Song" // The Hive Brood)
 */

export const SIDE_STORY_STATUS = Object.freeze({
    LOCKED: 'locked',
    AVAILABLE: 'available',
    IN_PROGRESS: 'in_progress',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    LOCKED_OUT: 'locked_out'
});

export const SIDE_STORIES_CONFIG = Object.freeze({
    sister_val: {
        id: 'sister_val',
        title: 'Warmth of the Suture',
        npcName: 'Sister Val',
        faction: 'CAMP TALLOW // SUTURE SANCTUARY',
        icon: '🩸',
        themeColor: '#ff4f64',
        stages: [
            {
                index: 1,
                title: 'The Shivering Shelter',
                objective: 'Survive subzero exposure or reach Camp Tallow with low O2.',
                unlockCondition: (ctx) => Boolean(ctx.visitedCampTallow || ctx.lowO2Exposures >= 1 || ctx.depthTier >= 1),
                skipCost: { shells: 25 },
                rewards: {
                    shells: 50,
                    med: 4,
                    perk: { id: 'tallow_suture_salve', name: 'Tallow Suture Salve', desc: '+10 Max HP' }
                },
                dialogueNode: 'val_greeting'
            },
            {
                index: 2,
                title: 'Spore Oil Communion',
                objective: 'Deliver 5 Medical Supplies or defeat a Sporesnail in the caves.',
                unlockCondition: (ctx) => Boolean(ctx.medInventory >= 5 || ctx.sporesnailsKilled >= 1 || ctx.skipBribed),
                skipCost: { shells: 50, tech: 5 },
                rewards: {
                    shells: 100,
                    med: 8,
                    schematic: { id: 'tallow_thermal_wrap', name: 'Tallow Thermal Wrap', desc: 'Fabricator schematic for freezing resistance suit liner' },
                    perk: { id: 'tallows_seductive_warmth', name: "Tallow's Seductive Warmth", desc: '+15 Max HP & Freezing Resistance' }
                },
                dialogueNode: 'val_massage_response'
            },
            {
                index: 3,
                title: 'The Eternal Hearth',
                objective: 'Reach Ring 2 depth and attain Warm Trust (Bond Level 1+).',
                unlockCondition: (ctx) => Boolean((ctx.depthTier >= 2 || ctx.ringIndex >= 2) && (ctx.bondScore >= 35 || ctx.skipBribed)),
                skipCost: { shells: 100, tech: 10 },
                rewards: {
                    shells: 200,
                    med: 15,
                    titleBadge: 'SUTURE BOUND',
                    perk: { id: 'flesh_communion_blessing', name: 'Flesh Communion Blessing', desc: '+25% HP regen near safe zones' }
                },
                dialogueNode: 'val_embrace_response',
                frictionFactions: [{ faction: 'meridian', suspicionDelta: 15, message: 'Meridian Tech-Purists note your devotion to the Flesh Cult.' }]
            }
        ]
    },

    commander_briggs: {
        id: 'commander_briggs',
        name: 'Commander Briggs',
        title: 'Blood & Vanguard',
        npcName: 'Commander Briggs',
        faction: 'CAMP VESPER // VANGUARD BARRACKS',
        icon: '🛡️',
        themeColor: '#ffaa00',
        stages: [
            {
                index: 1,
                title: 'The Scorched Rig',
                objective: 'Survive a combat breach encounter or reach Depth Tier 2.',
                unlockCondition: (ctx) => Boolean(ctx.combatBreachesCleared >= 1 || ctx.depthTier >= 2 || ctx.sentinelsKilled >= 3),
                skipCost: { shells: 30 },
                rewards: {
                    shells: 50,
                    ammo: 30,
                    perk: { id: 'vesper_field_armor', name: 'Vesper Field Armor', desc: '+10% Damage Resistance' }
                },
                dialogueNode: 'briggs_greeting'
            },
            {
                index: 2,
                title: 'Scar Tissue',
                objective: 'Bank 40+ Ammo or eliminate 5 Sentinel drones.',
                unlockCondition: (ctx) => Boolean(ctx.ammoInventory >= 40 || ctx.sentinelsKilled >= 5 || ctx.skipBribed),
                skipCost: { shells: 60, tech: 10 },
                rewards: {
                    shells: 100,
                    ammo: 60,
                    schematic: { id: 'vesper_vanguard_rig', name: 'Vesper Vanguard Rig', desc: 'Fabricator schematic for high-durability chest harness' },
                    perk: { id: 'vesper_vanguard_adrenaline', name: 'Vesper Vanguard Adrenaline', desc: '+10% Speed & +15% Melee Knockback' }
                },
                dialogueNode: 'briggs_clasps_response'
            },
            {
                index: 3,
                title: 'Vanguard Fire',
                objective: 'Reach Ring 3 depth and achieve Devoted Link (Bond Level 2+).',
                unlockCondition: (ctx) => Boolean((ctx.depthTier >= 3 || ctx.ringIndex >= 3) && (ctx.bondScore >= 50 || ctx.skipBribed)),
                skipCost: { shells: 120, tech: 15 },
                rewards: {
                    shells: 200,
                    ammo: 100,
                    titleBadge: 'VANGUARD BELOVED',
                    perk: { id: 'vesper_unyielding_might', name: 'Vesper Unyielding Might', desc: '+25% Crit Chance when below 40% HP' }
                },
                dialogueNode: 'briggs_intimate_climax',
                lockoutConditions: [
                    { storyId: 'aria_queen_mimic', minStage: 3, reason: 'Commander Briggs refuses to embrace a contractor branded by the Brood Queen.' }
                ]
            }
        ]
    },

    overseer_kaelen: {
        id: 'overseer_kaelen',
        title: 'Synaptic Overclock',
        npcName: 'Overseer Kaelen',
        faction: 'CAMP MERIDIAN // POWER GRID SUBSTATION',
        icon: '⚡',
        themeColor: '#00e5ff',
        stages: [
            {
                index: 1,
                title: 'Diagnostic Cradle',
                objective: 'Visit Camp Meridian or gather 15+ Tech scrap.',
                unlockCondition: (ctx) => Boolean(ctx.visitedCampMeridian || ctx.techInventory >= 15 || ctx.depthTier >= 1),
                skipCost: { shells: 25 },
                rewards: {
                    shells: 50,
                    tech: 5,
                    perk: { id: 'meridian_sensor_pulse', name: 'Meridian Sensor Pulse', desc: '+10m Radar Reach' }
                },
                dialogueNode: 'kaelen_greeting'
            },
            {
                index: 2,
                title: 'Frequency Overclock',
                objective: 'Restore 1 Substation terminal or hold 25+ Tech scrap.',
                unlockCondition: (ctx) => Boolean(ctx.terminalsHacked >= 1 || ctx.techInventory >= 25 || ctx.skipBribed),
                skipCost: { shells: 50, coin: 8 },
                rewards: {
                    shells: 100,
                    tech: 10,
                    schematic: { id: 'meridian_frequency_scanner', name: 'Meridian Frequency Scanner', desc: 'Fabricator schematic for sector radar amplifier' },
                    perk: { id: 'meridian_neural_overclock', name: 'Meridian Neural Overclock', desc: '+20m Radar & +10% Sprint Recharge' }
                },
                dialogueNode: 'kaelen_biolink_response'
            },
            {
                index: 3,
                title: 'Voltage & Vulnerability',
                objective: 'Reach Ring 2 depth with 35+ Tech and achieve High Bond.',
                unlockCondition: (ctx) => Boolean((ctx.depthTier >= 2 || ctx.ringIndex >= 2) && (ctx.bondScore >= 50 || ctx.skipBribed)),
                skipCost: { shells: 100, coin: 15 },
                rewards: {
                    shells: 200,
                    tech: 20,
                    titleBadge: 'GRID SYNCHRONIZED',
                    perk: { id: 'meridian_supercharged_matrix', name: 'Supercharged Matrix', desc: '-20% Fabricator Schematics cost' }
                },
                dialogueNode: 'kaelen_intimate_climax'
            }
        ]
    },

    aria_queen_mimic: {
        id: 'aria_queen_mimic',
        title: "The Queen's Siren Song",
        npcName: 'Specimen 0047-B ("Aria")',
        faction: 'THE HIVE BROOD // NEURAL TELEPATH',
        icon: '👑',
        themeColor: '#ff00aa',
        stages: [
            {
                index: 1,
                title: 'Whispers in the Void',
                objective: 'Descend to Ring 3/4 deep caves or touch a Hive Relay.',
                unlockCondition: (ctx) => Boolean(ctx.depthTier >= 3 || ctx.ringIndex >= 3 || ctx.touchedHiveRelay),
                skipCost: { shells: 40 },
                rewards: {
                    shells: 50,
                    med: 5,
                    perk: { id: 'mind_shimmer', name: 'Mind Shimmer', desc: '+5% Evasion' }
                },
                dialogueNode: 'aria_whisper'
            },
            {
                index: 2,
                title: 'The Silk Trance',
                objective: 'Carry a Spore Strain sample or allow Humanity < 80.',
                unlockCondition: (ctx) => Boolean(ctx.hasSporeStrain || ctx.humanityScore < 80 || ctx.skipBribed),
                skipCost: { shells: 80, med: 5 },
                rewards: {
                    shells: 120,
                    med: 10,
                    schematic: { id: 'brood_chitin_plating', name: 'Brood Chitin Plating', desc: 'Fabricator schematic for biological acid-reflect armor' },
                    perk: { id: 'arias_psychic_mind_caress', name: "Aria's Psychic Mind-Caress", desc: 'Dread immunity & +20% Bio Resistance' }
                },
                dialogueNode: 'aria_surrender_response'
            },
            {
                index: 3,
                title: "The Queen's Mark",
                objective: 'Achieve Brood Devotion (Bond Level 2+).',
                unlockCondition: (ctx) => Boolean(ctx.bondScore >= 60 || ctx.skipBribed),
                skipCost: { shells: 150, med: 10 },
                rewards: {
                    shells: 250,
                    med: 20,
                    titleBadge: 'BROOD MARKED',
                    perk: { id: 'hive_symbiosis_mastery', name: 'Hive Symbiosis Mastery', desc: '+30% Damage vs Mechanical & Turrets' }
                },
                dialogueNode: 'aria_intimate_climax',
                lockoutConditions: [
                    { storyId: 'commander_briggs', minStage: 3, reason: 'Communing fully with the Queen locks out Commander Briggs Vanguard alliance.' }
                ]
            }
        ]
    }
});

export class SideStoryManager {
    constructor({ storage = null, onStateChanged = null } = {}) {
        this.storage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
        this.onStateChanged = onStateChanged;

        // Map: storyId -> { stageIndex: 1..3, status: SIDE_STORY_STATUS, completedStages: [], perks: [], badges: [] }
        this.state = this.load();
    }

    load() {
        try {
            const raw = this.storage?.getItem?.('hb_side_stories_v1');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch {
            // fallback
        }

        const initial = {};
        for (const key of Object.keys(SIDE_STORIES_CONFIG)) {
            initial[key] = {
                stageIndex: 1,
                status: SIDE_STORY_STATUS.LOCKED,
                completedStages: [],
                perks: [],
                badges: [],
                bondScore: 0
            };
        }
        return initial;
    }

    save() {
        try {
            this.storage?.setItem?.('hb_side_stories_v1', JSON.stringify(this.state));
        } catch {
            // best-effort
        }
        this.notifyChange();
    }

    getStoryState(storyId) {
        if (!this.state[storyId]) {
            this.state[storyId] = {
                stageIndex: 1,
                status: SIDE_STORY_STATUS.LOCKED,
                completedStages: [],
                perks: [],
                badges: [],
                bondScore: 0
            };
        }
        return this.state[storyId];
    }

    getCurrentStage(storyId) {
        const config = SIDE_STORIES_CONFIG[storyId];
        if (!config) return null;
        const storyState = this.getStoryState(storyId);
        return config.stages.find((s) => s.index === storyState.stageIndex) || null;
    }

    isLockedOut(storyId) {
        const config = SIDE_STORIES_CONFIG[storyId];
        if (!config) return { locked: false };

        const currentStage = this.getCurrentStage(storyId);
        if (!currentStage?.lockoutConditions) return { locked: false };

        for (const cond of currentStage.lockoutConditions) {
            const otherStory = this.getStoryState(cond.storyId);
            if (otherStory && otherStory.completedStages.includes(cond.minStage)) {
                return {
                    locked: true,
                    reason: cond.reason,
                    conflictingStory: cond.storyId
                };
            }
        }
        return { locked: false };
    }

    evaluateTriggers(context = {}) {
        let updated = false;

        for (const [storyId, config] of Object.entries(SIDE_STORIES_CONFIG)) {
            const storyState = this.getStoryState(storyId);
            if (storyState.status === SIDE_STORY_STATUS.COMPLETED) continue;

            const lockout = this.isLockedOut(storyId);
            if (lockout.locked) {
                if (storyState.status !== SIDE_STORY_STATUS.LOCKED_OUT) {
                    storyState.status = SIDE_STORY_STATUS.LOCKED_OUT;
                    storyState.lockoutReason = lockout.reason;
                    updated = true;
                }
                continue;
            } else if (storyState.status === SIDE_STORY_STATUS.LOCKED_OUT) {
                storyState.status = SIDE_STORY_STATUS.AVAILABLE;
                storyState.lockoutReason = null;
                updated = true;
            }

            const currentStage = config.stages.find((s) => s.index === storyState.stageIndex);
            if (!currentStage) continue;

            const evalCtx = { ...context, bondScore: storyState.bondScore };
            if (currentStage.unlockCondition(evalCtx)) {
                if (storyState.status === SIDE_STORY_STATUS.LOCKED) {
                    storyState.status = SIDE_STORY_STATUS.AVAILABLE;
                    updated = true;
                }
            }
        }

        if (updated) this.save();
        return this.state;
    }

    startStory(storyId) {
        const storyState = this.getStoryState(storyId);
        if (storyState.status === SIDE_STORY_STATUS.LOCKED_OUT) return false;

        storyState.status = SIDE_STORY_STATUS.IN_PROGRESS;
        this.save();
        return true;
    }

    pauseStory(storyId) {
        const storyState = this.getStoryState(storyId);
        if (storyState.status !== SIDE_STORY_STATUS.IN_PROGRESS) return false;

        storyState.status = SIDE_STORY_STATUS.PAUSED;
        this.save();
        return true;
    }

    resumeStory(storyId) {
        const storyState = this.getStoryState(storyId);
        if (storyState.status !== SIDE_STORY_STATUS.PAUSED) return false;

        storyState.status = SIDE_STORY_STATUS.IN_PROGRESS;
        this.save();
        return true;
    }

    skipCurrentStageWithCost(storyId, playerInventory = {}) {
        const currentStage = this.getCurrentStage(storyId);
        if (!currentStage || !currentStage.skipCost) return { success: false, reason: 'no_skip_cost' };

        const cost = currentStage.skipCost;
        if (cost.shells && (playerInventory.shells || 0) < cost.shells) return { success: false, reason: 'insufficient_shells' };
        if (cost.tech && (playerInventory.tech || 0) < cost.tech) return { success: false, reason: 'insufficient_tech' };
        if (cost.med && (playerInventory.med || 0) < cost.med) return { success: false, reason: 'insufficient_med' };
        if (cost.coin && (playerInventory.coin || 0) < cost.coin) return { success: false, reason: 'insufficient_coin' };

        return this.completeCurrentStage(storyId, { skipped: true });
    }

    completeCurrentStage(storyId, { skipped = false } = {}) {
        const config = SIDE_STORIES_CONFIG[storyId];
        if (!config) return { success: false };

        const storyState = this.getStoryState(storyId);
        const stageIndex = storyState.stageIndex;
        const currentStage = config.stages.find((s) => s.index === stageIndex);
        if (!currentStage) return { success: false };

        if (!storyState.completedStages.includes(stageIndex)) {
            storyState.completedStages.push(stageIndex);
        }

        const rewards = currentStage.rewards || {};
        if (rewards.perk && !storyState.perks.includes(rewards.perk.id)) {
            storyState.perks.push(rewards.perk.id);
        }
        if (rewards.titleBadge && !storyState.badges.includes(rewards.titleBadge)) {
            storyState.badges.push(rewards.titleBadge);
        }

        // Advance to next stage or complete whole arc
        if (stageIndex >= config.stages.length) {
            storyState.status = SIDE_STORY_STATUS.COMPLETED;
        } else {
            storyState.stageIndex += 1;
            storyState.status = SIDE_STORY_STATUS.AVAILABLE;
        }

        this.save();

        if (typeof window !== 'undefined') {
            if (rewards.shells && window.game?.bank?.depositShells) {
                window.game.bank.depositShells(rewards.shells);
            }
            if (window.game?.bank?.deposit && (rewards.tech || rewards.med || rewards.coin)) {
                window.game.bank.deposit({
                    tech: rewards.tech || 0,
                    med: rewards.med || 0,
                    coin: rewards.coin || 0
                });
            }
            if (rewards.ammo && typeof window.game?.addAmmo === 'function') {
                window.game.addAmmo(rewards.ammo);
            } else if (rewards.ammo && typeof window.game?.playerAmmo === 'number') {
                window.game.playerAmmo += rewards.ammo;
            }

            if (rewards.perk && window.showSteamDropToast) {
                window.showSteamDropToast({
                    name: rewards.perk.name,
                    icon: '❤️',
                    category: 'SIDE STORY PERK'
                });
            }
            if (rewards.schematic && window.showSteamDropToast) {
                window.showSteamDropToast({
                    name: rewards.schematic.name,
                    icon: '📜',
                    category: 'SCHEMATIC UNLOCKED'
                });
            }
        }

        return {
            success: true,
            stageCompleted: stageIndex,
            rewards,
            nextStage: storyState.stageIndex,
            isAllCompleted: storyState.status === SIDE_STORY_STATUS.COMPLETED,
            skipped
        };
    }

    notifyChange() {
        if (typeof this.onStateChanged === 'function') {
            this.onStateChanged(this.state);
        }
    }
}

export const sideStoryManager = new SideStoryManager();
