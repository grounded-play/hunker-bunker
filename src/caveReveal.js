import { ARC_TRANSITION_EVENTS } from './arcState.js';
import { deriveInheritance } from './data/strains.js';

export const CAVE_REVEAL_LINES = Object.freeze([
    'SIGNAL SOURCE CONFIRMED.',
    'RECOVER SAMPLE.',
    'HEART RATE ELEVATED.',
    'UNKNOWN: ...'
]);

export const TEASE_OBJECTIVE = 'NEW INSTINCT: PROTECT THE QUEEN';

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

export class CaveRevealController {
    constructor({
        arcManager,
        dialogueManager = null,
        audioManager = null,
        setCinematicLock = null,
        setObjectiveText = null,
        triggerFade = null,
        returnToTitle = null,
        timing = {}
    } = {}) {
        this.arcManager = arcManager;
        this.dialogueManager = dialogueManager;
        this.audioManager = audioManager;
        this.setCinematicLock = setCinematicLock;
        this.setObjectiveText = setObjectiveText;
        this.triggerFade = triggerFade;
        this.returnToTitle = returnToTitle;
        this.timing = {
            lineDelayMs: 650,
            blackoutMs: 900,
            teaseMs: 1400,
            ...timing
        };
        this.running = false;
    }

    canStart() {
        const state = this.arcManager?.getState?.().arcState;
        return !this.running && state !== 'infected_blackout' && state !== 'hive_awakened_tease';
    }

    async start(preludeSummary = {}) {
        if (!this.canStart()) return false;
        this.running = true;
        try {
            this.setCinematicLock?.(true);
            this.arcManager?.evaluate?.(ARC_TRANSITION_EVENTS.CAVE_INTERACTION);
            this.arcManager?.forceState?.('cave_discovered');
            this.audioManager?.playProceduralBreathing?.({ volume: 0.07, duration: 3.4 });

            for (const text of CAVE_REVEAL_LINES) {
                await this.showLine(text);
                await wait(this.timing.lineDelayMs);
            }

            await this.fadeBlackout(async () => {
                this.audioManager?.playProceduralScrape?.({ volume: 0.24 });
                await wait(this.timing.blackoutMs);
                this.arcManager?.evaluate?.(ARC_TRANSITION_EVENTS.REVEAL_BLACKOUT);
                this.arcManager?.forceState?.('infected_blackout');
            });

            const inheritance = deriveInheritance(preludeSummary);
            this.arcManager?.recordInheritance?.(inheritance);
            this.setObjectiveText?.(TEASE_OBJECTIVE);
            this.audioManager?.playProceduralBreathing?.({ volume: 0.045, duration: 4.5 });
            await wait(this.timing.teaseMs);
            this.arcManager?.evaluate?.(ARC_TRANSITION_EVENTS.BLACKOUT_COMPLETE);
            this.arcManager?.forceState?.('hive_awakened_tease');
            await this.returnToTitle?.({ corruptedTitleSting: true, inheritance });
            return true;
        } finally {
            this.setCinematicLock?.(false);
            this.running = false;
        }
    }

    async showLine(text) {
        if (typeof this.dialogueManager?.openBriefTransmission === 'function') {
            await this.dialogueManager.openBriefTransmission({ lines: [{ text }] });
            return;
        }
        if (typeof this.dialogueManager?.showLine === 'function') {
            await this.dialogueManager.showLine(text);
        }
    }

    async fadeBlackout(onClosed) {
        if (typeof this.triggerFade === 'function') {
            await this.triggerFade(onClosed);
            return;
        }
        await onClosed?.();
    }
}
