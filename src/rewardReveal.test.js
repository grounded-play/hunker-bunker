import { describe, expect, it } from 'vitest';
import { mountRewardPreview, selectRewardEnding, createRewardRevealFlow, resolveCeremonyKeyAction } from './rewardReveal.js';

describe('mountRewardPreview (Lane B contract)', () => {
    it('resolves an explicit failure so the shell renders its unavailable state', async () => {
        const handle = mountRewardPreview({ container: null, itemId: 4130, category: 'charm' });
        const result = await handle.ready;

        expect(result.ok).toBe(false);
        expect(result.reason).toBe('container-missing');
    });

    it('exposes a dispose() that is safe to call twice', async () => {
        const handle = mountRewardPreview({ container: null, itemId: 4130, category: 'charm' });
        await handle.ready;

        expect(() => { handle.dispose(); handle.dispose(); }).not.toThrow();
    });
});

describe('selectRewardEnding', () => {
    // Season-pass rewards are { kind, itemdefid, qty, label } -- there is no
    // `category` field on them; the equip type comes from the item catalog.
    it('reads a charm reward from its itemdefid', () => {
        const ending = selectRewardEnding({ kind: 'item', itemdefid: 4130 });

        expect(ending).toMatchObject({ family: 'charm', ending: 'charm-snap', sound: 'reward_reveal_charm', preview: '3d' });
    });

    it('reads a chassis reward from its itemdefid', () => {
        const ending = selectRewardEnding({ kind: 'item', itemdefid: 4112 });

        expect(ending).toMatchObject({ family: 'chassis', sound: 'reward_reveal_chassis' });
    });

    it('gives a chassis a different ending from a charm', () => {
        expect(selectRewardEnding({ kind: 'item', itemdefid: 4112 }).ending)
            .not.toBe(selectRewardEnding({ kind: 'item', itemdefid: 4130 }).ending);
    });

    it('previews a decal as 2D art rather than a fake 3D spin', () => {
        const ending = selectRewardEnding({ kind: 'item', itemdefid: 2000 });

        expect(ending).toMatchObject({ family: 'decal', preview: '2d', sound: 'reward_reveal_decal' });
    });

    it('reads a rig module from its itemdefid', () => {
        expect(selectRewardEnding({ kind: 'item', itemdefid: 4140 }))
            .toMatchObject({ family: 'module', sound: 'reward_reveal_module', preview: '3d' });
    });

    it('reads a weapon skin from its itemdefid', () => {
        expect(selectRewardEnding({ kind: 'item', itemdefid: 4100 }))
            .toMatchObject({ family: 'weapon', sound: 'reward_reveal_weapon', preview: '3d' });
    });

    it('treats a currency reward as generic with no 3D preview', () => {
        const ending = selectRewardEnding({ kind: 'currency', currency: 'scrap', qty: 50 });

        expect(ending).toMatchObject({ family: 'generic', preview: '2d', sound: 'reward_reveal_generic' });
    });

    it('falls back to generic for an itemdefid the catalog does not classify', () => {
        expect(selectRewardEnding({ kind: 'item', itemdefid: 999999 }).family).toBe('generic');
    });

    it('falls back to generic when there is no reward at all', () => {
        expect(selectRewardEnding(undefined).family).toBe('generic');
    });
});

function flowHarness(overrides = {}) {
    const calls = [];
    const flow = createRewardRevealFlow({
        telemetry: { emitOnce: (_c, event) => { calls.push(`telemetry:${event}`); return true; } },
        grant: () => { calls.push('grant'); return { ok: true }; },
        mountPreview: () => { calls.push('preview'); return { ready: Promise.resolve({ ok: true }), dispose() {} }; },
        playSound: (name) => calls.push(`sound:${name}`),
        present: (stage) => calls.push(`present:${stage}`),
        ...overrides
    });
    return { flow, calls };
}

describe('createRewardRevealFlow', () => {
    it('confirms the grant before anything is revealed', async () => {
        const { flow, calls } = flowHarness();

        await flow.run({ actionKey: 'reward:3:free', item: { kind: 'item', itemdefid: 4130 } });

        expect(calls.indexOf('grant')).toBeLessThan(calls.indexOf('present:reveal'));
        expect(calls).toContain('telemetry:grant-confirmed');
    });

    it('plays the sting for the reward family, once', async () => {
        const { flow, calls } = flowHarness();

        await flow.run({ actionKey: 'reward:3:free', item: { kind: 'item', itemdefid: 4130 } });

        expect(calls.filter((c) => c === 'sound:reward_reveal_charm')).toHaveLength(1);
    });

    it('does not grant twice when the player double-clicks Claim', async () => {
        const { flow, calls } = flowHarness();
        const args = { actionKey: 'reward:3:free', item: { kind: 'item', itemdefid: 4130 } };

        await Promise.all([flow.run(args), flow.run(args)]);

        expect(calls.filter((c) => c === 'grant')).toHaveLength(1);
    });

    it('still completes the reveal when the 3D preview fails', async () => {
        const { flow, calls } = flowHarness({
            mountPreview: () => ({ ready: Promise.resolve({ ok: false, reason: 'no-model' }), dispose() {} })
        });

        const result = await flow.run({ actionKey: 'reward:9:free', item: { kind: 'item', itemdefid: 4100 } });

        expect(result.previewOk).toBe(false);
        expect(calls).toContain('telemetry:preview-failed');
        expect(calls).toContain('present:reveal');
    });

    it('abandons the reveal when the grant is refused', async () => {
        const { flow, calls } = flowHarness({ grant: () => ({ ok: false, reason: 'already-claimed' }) });

        const result = await flow.run({ actionKey: 'reward:3:free', item: { kind: 'item', itemdefid: 4130 } });

        expect(result.ok).toBe(false);
        expect(calls).not.toContain('present:reveal');
    });
});

describe('resolveCeremonyKeyAction', () => {
    it('claims on Enter while the reward is still unclaimed', () => {
        expect(resolveCeremonyKeyAction({ code: 'Enter', revealStage: null })).toBe('claim');
    });

    it('continues on Enter once the reveal is up, instead of claiming again', () => {
        expect(resolveCeremonyKeyAction({ code: 'Enter', revealStage: 'burst' })).toBe('continue');
    });

    it('refuses to let Escape discard an unclaimed reward', () => {
        expect(resolveCeremonyKeyAction({ code: 'Escape', revealStage: null })).toBe('block');
    });

    it('lets Escape dismiss the reveal once the grant has happened', () => {
        expect(resolveCeremonyKeyAction({ code: 'Escape', revealStage: 'reveal' })).toBe('continue');
    });

    it('ignores keys it has no opinion about', () => {
        expect(resolveCeremonyKeyAction({ code: 'KeyQ', revealStage: null })).toBe(null);
    });
});
