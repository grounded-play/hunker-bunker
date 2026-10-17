/**
 * Interaction Sequence Runner
 * Choreographs in-engine interactive beats between the player, NPCs, and world props.
 * Built according to docs/planning/camp-interaction-and-cinematics-audit-2026-10-16.md §8.
 */

import { CINEMATIC_STORAGE_KEY, readCinematicsRecord, writeCinematicsField } from './cinematicBeats.js';

export const INTERACTION_SEQUENCES = Object.freeze({
    meridian_first_meeting: Object.freeze({
        id: 'meridian_first_meeting',
        campId: 'camp_meridian',
        trigger: { event: 'act2-milestone', key: 'campDiscovered', campId: 'camp_meridian', on: 'firstTalk' },
        anchors: { core: 'meridian_logic_core_drum' },
        actors: { leader: 'campLeader', player: true },
        steps: [
            { do: 'lockInput' },
            { do: 'camera', shot: 'two-shot', target: 'leader', ms: 600 },
            { do: 'walk', actor: 'leader', to: { anchor: 'core', offset: [0.9, 0, 0] } },
            { do: 'walk', actor: 'player', to: { anchor: 'core', offset: [-0.9, 0, 0] } },
            { do: 'gesture', actor: 'leader', clip: 'pointingForward' },
            { do: 'fx', anchor: 'core', effect: 'grid_steady', color: '#22d3ee' },
            { do: 'line', speaker: 'leader', key: 'narrative.sequences.meridian_first_meeting.0', text: 'The core is holding, but Sector 4 is starved. Find the lost probe.' },
            { do: 'camera', shot: 'conversation', ms: 500 },
            { do: 'resumeConversation', offer: 'lost_probe' },
            { do: 'unlockInput' }
        ],
        endState: {
            propStates: { meridian_logic_core_drum: 'active' },
            questOffer: 'lost_probe'
        },
        skip: 'applyEndStateAndResume'
    }),

    meridian_grid_covenant: Object.freeze({
        id: 'meridian_grid_covenant',
        campId: 'camp_meridian',
        trigger: { quest: 'grid_covenant', when: 'accepted' },
        anchors: { seal: 'meridian_grid_covenant_seal' },
        actors: { leader: 'campLeader', player: true },
        steps: [
            { do: 'lockInput' },
            { do: 'camera', shot: 'two-shot', target: 'seal', ms: 800 },
            { do: 'walk', actor: 'leader', to: { anchor: 'seal', offset: [0.8, 0, 0] } },
            { do: 'walk', actor: 'player', to: { anchor: 'seal', offset: [-0.8, 0, 0] } },
            { do: 'prop', anchor: 'seal', node: 'HB_KNIFE_SWITCH', action: 'close', duration: 1.0 },
            { do: 'fx', anchor: 'seal', effect: 'electrical_arc', color: '#22d3ee' },
            { do: 'line', speaker: 'leader', key: 'narrative.sequences.meridian_grid_covenant.0', text: 'The circuit is closed, contractor. Meridian recognizes your pulse.' },
            { do: 'grantReward', bondDelta: 2, perk: 'meridian_neural_overclock', toast: true },
            { do: 'prop', anchor: 'seal', state: 'signed' },
            { do: 'camera', shot: 'conversation', ms: 500 },
            { do: 'unlockInput' }
        ],
        endState: {
            propStates: { meridian_grid_covenant_seal: 'signed' },
            bondDelta: 2,
            perk: 'meridian_neural_overclock'
        },
        skip: 'applyEndStateAndResume'
    }),

    base_cot_first_night: Object.freeze({
        id: 'base_cot_first_night',
        trigger: { event: 'base-module-installed', module: 'cot_bed' },
        anchors: { cot: 'base_cot_installed' },
        actors: { player: true },
        steps: [
            { do: 'lockInput' },
            { do: 'camera', shot: 'medium', target: 'cot', ms: 600 },
            { do: 'walk', actor: 'player', to: { anchor: 'cot', offset: [0, 0, 0.4] } },
            { do: 'fx', anchor: 'cot', effect: 'lamp_warm', color: '#f59e0b' },
            { do: 'line', speaker: 'mothership', key: 'narrative.sequences.base_cot.0', text: 'Rest infrastructure verified, contractor. Black box data synchronized.' },
            { do: 'camera', shot: 'gameplay', ms: 500 },
            { do: 'unlockInput' }
        ],
        endState: {
            propStates: { base_cot_installed: 'ready' },
            firstNightPrompt: true
        },
        skip: 'applyEndStateAndResume'
    })
});

// Saved per campaign (src/profile.js CAMPAIGN_SPECIFIC_STORAGE_KEYS): a
// sequence plays once per save, not once per page load (audit §8.3). The
// record is shared with the cinematic beats (src/cinematicBeats.js).
export const INTERACTION_SEQUENCE_STORAGE_KEY = CINEMATIC_STORAGE_KEY;

function defaultStorage() {
    try {
        return typeof window !== 'undefined' ? window.localStorage ?? null : null;
    } catch {
        return null;
    }
}

export class InteractionSequenceRunner {
    constructor(game = null, { storage = defaultStorage() } = {}) {
        this.game = game;
        this.storage = storage;
        this.activeSequence = null;
        this.currentStepIndex = -1;
        this.isSkipped = false;
        this.completedSequences = new Set(this.loadCompleted());
    }

    loadCompleted() {
        const { sequences } = readCinematicsRecord(this.storage);
        return Array.isArray(sequences) ? sequences : [];
    }

    isSequenceCompleted(id) {
        return this.completedSequences.has(id);
    }

    markSequenceCompleted(id) {
        this.completedSequences.add(id);
        writeCinematicsField(this.storage, 'sequences', this.completedSequences);
    }

    // Every anchor resolved to a world position, or null when one is missing.
    resolveAnchors(spec) {
        const anchors = {};
        for (const [key, anchorName] of Object.entries(spec.anchors ?? {})) {
            const position = this.game?.resolveSequenceAnchor?.(anchorName, spec) ?? null;
            if (!position) return null;
            anchors[key] = { name: anchorName, ...position };
        }
        return anchors;
    }

    canRun(specOrId) {
        const spec = typeof specOrId === 'string' ? INTERACTION_SEQUENCES[specOrId] : specOrId;
        return Boolean(spec && !this.isSequenceCompleted(spec.id) && this.resolveAnchors(spec));
    }

    async runSequence(specOrId, context = {}) {
        const spec = typeof specOrId === 'string' ? INTERACTION_SEQUENCES[specOrId] : specOrId;
        if (!spec) {
            return { ok: false, reason: 'Sequence not found' };
        }

        if (this.isSequenceCompleted(spec.id) || this.activeSequence) {
            return { ok: false, reason: this.activeSequence ? 'Another sequence is playing' : 'Sequence already completed' };
        }
        // Spent before anything runs: an end state that reopens a conversation
        // can call back into the trigger, which must not start it again.
        this.markSequenceCompleted(spec.id);
        this._rewardGranted = false;

        // A missing anchor applies the end state. A sequence may name its own
        // placeholder card, never another beat's song card: those play at
        // their own beats (audit 2026-10-16 §13.2), and borrowing one here
        // doubled the first-contact card at Meridian.
        const anchors = this.resolveAnchors(spec);
        if (!anchors) {
            if (spec.placeholder?.card && this.game?.playInterstitialCard) {
                this.game.playInterstitialCard(spec.placeholder.card);
            }
            this.applyEndState(spec, context);
            return { ok: true, fallback: true };
        }

        this.activeSequence = spec;
        this.currentStepIndex = 0;
        this.isSkipped = false;
        const stepContext = { ...context, anchors };
        // Never under a card, window or cutscene: wait for the stage to clear.
        await this.game?.waitForClearStage?.();
        this.bindSkip();

        try {
            for (let i = 0; i < spec.steps.length; i++) {
                if (this.isSkipped) break;
                this.currentStepIndex = i;
                await this.executeStep(spec.steps[i], spec, stepContext);
            }

            if (!this.isSkipped) {
                this.applyEndState(spec, context);
            }
        } catch (error) {
            this.applyEndState(spec, context);
            return { ok: false, error: error.message };
        } finally {
            this.unbindSkip();
            this.activeSequence = null;
            this.currentStepIndex = -1;
            this.isSkipped = false;
        }

        return { ok: true, completed: true };
    }

    // Esc / Space / Enter skip a playing sequence (its end state still lands).
    bindSkip() {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
        this._onSkipKey ??= (event) => {
            if (!this.activeSequence || !['Escape', 'Space', 'Enter'].includes(event.code)) return;
            event.preventDefault?.();
            event.stopImmediatePropagation?.();
            this.skip();
        };
        window.addEventListener('keydown', this._onSkipKey, { capture: true });
    }

    unbindSkip() {
        if (!this._onSkipKey || typeof window === 'undefined' || typeof window.removeEventListener !== 'function') return;
        window.removeEventListener('keydown', this._onSkipKey, { capture: true });
    }

    // A step's target: an anchor key, 'leader' or 'player'.
    resolveTarget(target, spec, anchors = {}) {
        if (anchors[target]) return { x: anchors[target].x, z: anchors[target].z };
        return this.game?.getSequenceActorPosition?.(target, spec) ?? null;
    }

    async executeStep(step, spec, context) {
        if (!step || typeof step !== 'object') return;
        const anchors = context.anchors ?? {};

        switch (step.do) {
            case 'lockInput':
                this.game?.setInputEnabled?.(false);
                this.game?.setCinematicLock?.(true);
                break;

            case 'unlockInput':
                this.game?.setCinematicLock?.(false);
                this.game?.setInputEnabled?.(true);
                break;

            case 'camera': {
                const position = step.shot === 'gameplay' || step.shot === 'conversation'
                    ? null
                    : this.resolveTarget(step.target, spec, anchors);
                await this.game?.transitionCamera?.(step.shot, position, step.ms ?? 500);
                break;
            }

            case 'walk': {
                const anchor = anchors[step.to?.anchor];
                if (!anchor) break;
                const [dx = 0, , dz = 0] = step.to?.offset ?? [];
                await this.game?.walkActorTo?.(step.actor, { x: anchor.x + dx, z: anchor.z + dz }, spec);
                break;
            }

            case 'face':
                this.game?.faceActorToward?.(step.actor, this.resolveTarget(step.toward, spec, anchors), spec);
                break;

            case 'gesture':
                this.game?.playActorGesture?.(step.actor, step.clip, spec);
                break;

            case 'prop':
                this.game?.setWorldPropState?.(anchors[step.anchor]?.name ?? step.anchor, step.state ?? 'active', anchors[step.anchor] ?? null);
                break;

            case 'fx':
                this.game?.spawnPropFx?.(anchors[step.anchor] ?? null, step.effect, step.color);
                break;

            case 'line':
                await this.game?.displaySequenceSubtitle?.(step.speaker, step.key, step.text, { campId: spec.campId });
                break;

            case 'grantReward': {
                this._rewardGranted = true;
                const reward = { ...step, campId: spec.campId };
                if (context.grantReward) context.grantReward(reward);
                else this.game?.grantSequenceReward?.(reward);
                break;
            }

            case 'resumeConversation':
                this.game?.resumeConversationAfterSequence?.(step.offer, spec);
                break;

            default:
                break;
        }
    }

    skip() {
        if (!this.activeSequence || this.isSkipped) return false;
        this.isSkipped = true;
        this.applyEndState(this.activeSequence);
        return true;
    }

    applyEndState(spec, context = {}) {
        if (!spec) return;

        if (spec.endState?.propStates && this.game?.setWorldPropState) {
            for (const [prop, state] of Object.entries(spec.endState.propStates)) {
                this.game.setWorldPropState(prop, state, null);
            }
        }

        // The end state pays only what a grantReward step has not already paid
        // (Grid Covenant listed its +2 bond and perk in both).
        if ((spec.endState?.perk || spec.endState?.bondDelta) && !this._rewardGranted) {
            const reward = {
                perk: spec.endState.perk,
                bondDelta: spec.endState.bondDelta,
                campId: spec.campId,
                toast: true
            };
            if (context.grantReward) {
                context.grantReward(reward);
            } else {
                this.game?.grantSequenceReward?.(reward);
            }
        }

        this.game?.clearCinematicCameraFocus?.();
        this.game?.setCinematicLock?.(false);
        this.game?.setInputEnabled?.(true);

        if (spec.endState?.questOffer) {
            this.game?.resumeConversationAfterSequence?.(spec.endState.questOffer, spec);
        }
    }
}
