import { describe, expect, it } from 'vitest';
import { ArcStateManager } from './arcState.js';
import { CaveRevealController, TEASE_OBJECTIVE } from './caveReveal.js';

function memoryStorage() {
    const map = new Map();
    return {
        getItem(key) { return map.has(key) ? map.get(key) : null; },
        setItem(key, value) { map.set(key, String(value)); },
        key(index) { return [...map.keys()][index] ?? null; },
        get length() { return map.size; }
    };
}

describe('CaveRevealController', () => {
    it('drives the one-shot reveal ladder and persists inheritance', async () => {
        const arcManager = new ArcStateManager({ storage: memoryStorage() });
        arcManager.forceState('cave_signal');
        const locks = [];
        const objectives = [];
        const titleReturns = [];
        const controller = new CaveRevealController({
            arcManager,
            dialogueManager: { openBriefTransmission: async () => {} },
            audioManager: { playProceduralBreathing: () => {}, playProceduralScrape: () => {} },
            setCinematicLock: (locked) => locks.push(locked),
            setObjectiveText: (text) => objectives.push(text),
            triggerFade: async (onClosed) => onClosed(),
            returnToTitle: (payload) => titleReturns.push(payload),
            timing: { lineDelayMs: 0, blackoutMs: 0, teaseMs: 0 }
        });

        await expect(controller.start({ classId: 'TANK', snailsKilled: 4 })).resolves.toBe(true);
        expect(arcManager.getState().arcState).toBe('hive_awakened_tease');
        expect(arcManager.getState().inheritance.strainId).toBe('CARAPACE');
        expect(objectives).toContain(TEASE_OBJECTIVE);
        expect(locks).toEqual([true, false]);
        expect(titleReturns[0]).toMatchObject({ corruptedTitleSting: true });
    });

    it('does not replay after the tease terminal state', async () => {
        const arcManager = new ArcStateManager({ storage: memoryStorage() });
        arcManager.forceState('hive_awakened_tease');
        const controller = new CaveRevealController({ arcManager, timing: { lineDelayMs: 0, blackoutMs: 0, teaseMs: 0 } });
        await expect(controller.start()).resolves.toBe(false);
    });
});
