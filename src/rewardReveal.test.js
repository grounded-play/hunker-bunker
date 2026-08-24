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
    it('gives a weapon skin its own ending and sting', () => {
        const ending = selectRewardEnding({ category: 'weapon_skin' });

        expect(ending).toMatchObject({ family: 'weapon', sound: 'reward_reveal_weapon', preview: '3d' });
        expect(ending.ending).toBe('weapon-sweep');
    });

    it('gives a chassis skin a different ending from a weapon skin', () => {
        const weapon = selectRewardEnding({ category: 'weapon_skin' });
        const chassis = selectRewardEnding({ category: 'chassis_skin' });

        expect(chassis.ending).not.toBe(weapon.ending);
        expect(chassis.sound).toBe('reward_reveal_chassis');
    });

    it('previews a decal as 2D art rather than a fake 3D spin', () => {
        expect(selectRewardEnding({ category: 'decal' })).toMatchObject({ family: 'decal', preview: '2d' });
    });

    it('snaps a charm in rather than floating it', () => {
        expect(selectRewardEnding({ category: 'charm' })).toMatchObject({ ending: 'charm-snap', sound: 'reward_reveal_charm' });
    });

    it('falls back to a generic ending for an unknown category without throwing', () => {
        expect(selectRewardEnding({ category: 'something_new' })).toMatchObject({ family: 'generic', sound: 'reward_reveal_generic' });
    });

    it('falls back to generic when the item carries no category at all', () => {
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

        await flow.run({ actionKey: 'reward:3:free', item: { category: 'charm' } });

        expect(calls.indexOf('grant')).toBeLessThan(calls.indexOf('present:reveal'));
        expect(calls).toContain('telemetry:grant-confirmed');
    });

    it('plays the sting for the reward family, once', async () => {
        const { flow, calls } = flowHarness();

        await flow.run({ actionKey: 'reward:3:free', item: { category: 'charm' } });

        expect(calls.filter((c) => c === 'sound:reward_reveal_charm')).toHaveLength(1);
    });

    it('does not grant twice when the player double-clicks Claim', async () => {
        const { flow, calls } = flowHarness();
        const args = { actionKey: 'reward:3:free', item: { category: 'charm' } };

        await Promise.all([flow.run(args), flow.run(args)]);

        expect(calls.filter((c) => c === 'grant')).toHaveLength(1);
    });

    it('still completes the reveal when the 3D preview fails', async () => {
        const { flow, calls } = flowHarness({
            mountPreview: () => ({ ready: Promise.resolve({ ok: false, reason: 'no-model' }), dispose() {} })
        });

        const result = await flow.run({ actionKey: 'reward:9:free', item: { category: 'weapon_skin' } });

        expect(result.previewOk).toBe(false);
        expect(calls).toContain('telemetry:preview-failed');
        expect(calls).toContain('present:reveal');
    });

    it('abandons the reveal when the grant is refused', async () => {
        const { flow, calls } = flowHarness({ grant: () => ({ ok: false, reason: 'already-claimed' }) });

        const result = await flow.run({ actionKey: 'reward:3:free', item: { category: 'charm' } });

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
