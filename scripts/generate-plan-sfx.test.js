import { describe, expect, it } from 'vitest';
import { PLAN_SFX, encodeMonoWav, renderPlanSfx } from './generate-plan-sfx.js';

describe('plan SFX generator', () => {
    it('defines every plan-required camp cue', () => {
        expect(Object.keys(PLAN_SFX).sort()).toEqual([
            'camp_verb_meridian',
            'camp_verb_tallow',
            'camp_verb_vesper',
            'camp_worker_alerted',
            'camp_worker_armed',
            'camp_worker_fleeing',
            'camp_worker_infected',
            'camp_worker_panicked',
            'sfx_charm_clink_heavy',
            'sfx_charm_clink_light',
            'sfx_overclock_hum_cryo',
            'sfx_overclock_hum_magnetic',
            'sfx_overclock_socket',
            'sfx_smelt_forge_burst',
            'sfx_trade_shard_dispense'
        ]);
    });

    it('writes valid mono 16-bit PCM WAV headers', () => {
        const wav = encodeMonoWav([0, 0.25, -0.25], 22050);
        expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
        expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
        expect(wav.readUInt16LE(22)).toBe(1);
        expect(wav.readUInt32LE(24)).toBe(22050);
        expect(wav.readUInt16LE(34)).toBe(16);
        expect(wav.readUInt32LE(40)).toBe(6);
    });

    it('renders assets deterministically with non-silent sample data', () => {
        const first = renderPlanSfx('camp_worker_alerted', PLAN_SFX.camp_worker_alerted);
        const second = renderPlanSfx('camp_worker_alerted', PLAN_SFX.camp_worker_alerted);
        expect(first.equals(second)).toBe(true);
        expect(first.length).toBeGreaterThan(1000);
        expect(new Set(first.subarray(44))).not.toEqual(new Set([0]));
    });
});

