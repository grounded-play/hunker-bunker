/**
 * Interaction Sequence Runner
 * Choreographs in-engine interactive beats between the player, NPCs, and world props.
 * Built according to docs/planning/camp-interaction-and-cinematics-audit-2026-10-16.md §8.
 */

export const INTERACTION_SEQUENCES = Object.freeze({
    meridian_first_meeting: Object.freeze({
        id: 'meridian_first_meeting',
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
        skip: 'applyEndStateAndResume',
        placeholder: { card: '19' }
    }),

    meridian_grid_covenant: Object.freeze({
        id: 'meridian_grid_covenant',
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
        skip: 'applyEndStateAndResume',
        placeholder: { card: '30' }
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
        skip: 'applyEndStateAndResume',
        placeholder: { card: '01' }
    })
});

export class InteractionSequenceRunner {
    constructor(game = null) {
        this.game = game;
        this.activeSequence = null;
        this.currentStepIndex = -1;
        this.isSkipped = false;
        this.completedSequences = new Set();
    }

    isSequenceCompleted(id) {
        return this.completedSequences.has(id);
    }

    markSequenceCompleted(id) {
        this.completedSequences.add(id);
    }

    async runSequence(specOrId, context = {}) {
        const spec = typeof specOrId === 'string' ? INTERACTION_SEQUENCES[specOrId] : specOrId;
        if (!spec) {
            return { ok: false, reason: 'Sequence not found' };
        }

        if (this.isSequenceCompleted(spec.id)) {
            return { ok: false, reason: 'Sequence already completed' };
        }

        // Check anchor availability; fallback to placeholder card if missing
        if (spec.anchors && this.game?.findPropAnchor) {
            for (const [key, anchorName] of Object.entries(spec.anchors)) {
                const anchorExists = this.game.findPropAnchor(anchorName);
                if (!anchorExists) {
                    if (spec.placeholder?.card && this.game.playInterstitialCard) {
                        this.game.playInterstitialCard(spec.placeholder.card);
                    }
                    this.applyEndState(spec, context);
                    this.markSequenceCompleted(spec.id);
                    return { ok: true, fallback: true };
                }
            }
        }

        this.activeSequence = spec;
        this.currentStepIndex = 0;
        this.isSkipped = false;

        try {
            for (let i = 0; i < spec.steps.length; i++) {
                if (this.isSkipped) break;
                this.currentStepIndex = i;
                await this.executeStep(spec.steps[i], spec, context);
            }

            if (!this.isSkipped) {
                this.applyEndState(spec, context);
            }
        } catch (error) {
            this.applyEndState(spec, context);
            return { ok: false, error: error.message };
        } finally {
            this.markSequenceCompleted(spec.id);
            this.activeSequence = null;
            this.currentStepIndex = -1;
            this.isSkipped = false;
        }

        return { ok: true, completed: true };
    }

    async executeStep(step, spec, context) {
        if (!step || typeof step !== 'object') return;

        switch (step.do) {
            case 'lockInput':
                this.game?.setInputEnabled?.(false);
                this.game?.setCinematicLock?.(true);
                break;

            case 'unlockInput':
                this.game?.setCinematicLock?.(false);
                this.game?.setInputEnabled?.(true);
                break;

            case 'camera':
                if (this.game?.transitionCamera) {
                    await this.game.transitionCamera(step.shot, step.target, step.ms ?? 500);
                }
                break;

            case 'walk':
                if (this.game?.walkActorToAnchor) {
                    await this.game.walkActorToAnchor(step.actor, step.to?.anchor, step.to?.offset);
                }
                break;

            case 'face':
                this.game?.faceActorToward?.(step.actor, step.toward);
                break;

            case 'gesture':
                this.game?.playActorGesture?.(step.actor, step.clip);
                break;

            case 'prop':
                if (this.game?.setWorldPropState) {
                    this.game.setWorldPropState(step.anchor, step.state ?? 'active', step);
                }
                break;

            case 'fx':
                this.game?.spawnPropFx?.(step.anchor, step.effect, step.color);
                break;

            case 'line':
                if (this.game?.displaySequenceSubtitle) {
                    await this.game.displaySequenceSubtitle(step.speaker, step.key, step.text);
                }
                break;

            case 'grantReward':
                if (context.grantReward) {
                    context.grantReward(step);
                } else if (this.game?.grantSequenceReward) {
                    this.game.grantSequenceReward(step);
                }
                break;

            case 'resumeConversation':
                if (this.game?.resumeConversationAfterSequence) {
                    this.game.resumeConversationAfterSequence(step.offer);
                }
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

        // Apply world prop states
        if (spec.endState?.propStates && this.game?.setWorldPropState) {
            for (const [prop, state] of Object.entries(spec.endState.propStates)) {
                this.game.setWorldPropState(prop, state);
            }
        }

        // Apply rewards
        if (spec.endState?.perk || spec.endState?.bondDelta) {
            const reward = {
                perk: spec.endState.perk,
                bondDelta: spec.endState.bondDelta,
                toast: true
            };
            if (context.grantReward) {
                context.grantReward(reward);
            } else {
                this.game?.grantSequenceReward?.(reward);
            }
        }

        // Restore camera and input
        this.game?.clearCinematicCameraFocus?.();
        this.game?.setCinematicLock?.(false);
        this.game?.setInputEnabled?.(true);

        // Resume conversation if pending
        if (spec.endState?.questOffer) {
            this.game?.resumeConversationAfterSequence?.(spec.endState.questOffer);
        }
    }
}
