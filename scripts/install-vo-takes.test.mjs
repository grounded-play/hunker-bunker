import { describe, it, expect } from 'vitest';
import { applySelections, planInstall, allSlotKeys } from './install-vo-takes.mjs';

const SLOTS = allSlotKeys();

describe('applySelections', () => {
    it('merges durable reviewed selections into a regenerated manifest', () => {
        const manifest = { takes: [
            { clip: 'a.wav', label: null },
            { clip: 'b.wav', label: 'existing_slot' }
        ] };
        expect(applySelections(manifest, { 4149: { selected_slot: 'a.wav' } }).takes).toEqual([
            { clip: 'a.wav', label: 'selected_slot' },
            { clip: 'b.wav', label: 'existing_slot' }
        ]);
    });
});

describe('allSlotKeys', () => {
    it('is the 12 cue slots across both banks', () => {
        expect(SLOTS).toHaveLength(12);
        expect(new Set(SLOTS).size).toBe(12);
    });
});

describe('planInstall', () => {
    it('installs nothing and reports every slot missing for an unlabelled manifest', () => {
        const { install, missing } = planInstall({ takes: [{ clip: 'a.wav', label: null }] });
        expect(install).toEqual([]);
        expect(missing).toEqual(SLOTS);
    });

    it('maps a labelled take onto its cue slot', () => {
        const { install, missing } = planInstall({
            takes: [{ clip: 'a.wav', source: 's.wav', label: 'voice_aura_reloading' }]
        });
        expect(install).toEqual([{ slot: 'voice_aura_reloading', take: expect.objectContaining({ clip: 'a.wav' }) }]);
        expect(missing).not.toContain('voice_aura_reloading');
        expect(missing).toHaveLength(11);
    });

    it('lets a later take override an earlier one for the same slot', () => {
        const { install } = planInstall({
            takes: [
                { clip: 'first.wav', label: 'voice_aura_reloading' },
                { clip: 'better.wav', label: 'voice_aura_reloading' }
            ]
        });
        expect(install).toHaveLength(1);
        expect(install[0].take.clip).toBe('better.wav');
    });

    it('quarantines labels that are not real cue slots instead of installing them', () => {
        const { install, unknown } = planInstall({
            takes: [{ clip: 'typo.wav', label: 'voice_aura_reloadingg' }]
        });
        expect(install).toEqual([]);
        expect(unknown).toEqual([{ clip: 'typo.wav', label: 'voice_aura_reloadingg' }]);
    });

    it('survives a malformed manifest rather than throwing mid-install', () => {
        expect(planInstall(null).install).toEqual([]);
        expect(planInstall({}).install).toEqual([]);
        expect(planInstall({ takes: 'nope' }).install).toEqual([]);
    });
});
