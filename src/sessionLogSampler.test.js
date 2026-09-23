import { describe, expect, it } from 'vitest';
import { createSessionLogSampler } from './sessionLogSampler.js';

const fire = (source) => ({ category: 'WEAPON', message: `fire-input {\n  "source": "${source}"\n}` });
const blocked = (reason) => ({ category: 'WEAPON', message: `shot-blocked {\n  "reason": "${reason}"\n}` });

describe('session log sampling (GAP-TS-04)', () => {
    it('keeps a few examples per window and counts the rest by the field that matters', () => {
        const sampler = createSessionLogSampler({ windowMs: 10_000, keepPerWindow: 2 });
        const kept = [];
        for (let i = 0; i < 10; i += 1) if (sampler.retain(fire(i < 7 ? 'pointer' : 'controller'), 1_000 + i)) kept.push(i);
        for (let i = 0; i < 4; i += 1) sampler.retain(blocked('fire_cooldown'), 1_100);
        expect(kept).toEqual([0, 1]);
        expect(sampler.flush(5_000)).toBeNull();
        const summary = sampler.flush(11_500);
        expect(summary.events['WEAPON fire-input']).toEqual({ total: 10, retained: 2, by: { pointer: 7, controller: 3 } });
        expect(summary.events['WEAPON shot-blocked']).toEqual({ total: 4, retained: 2, by: { fire_cooldown: 4 } });
        expect(sampler.retain(fire('pointer'), 12_000)).toBe(true);
    });

    it('never samples anything else, and an export can flush a partial window', () => {
        const sampler = createSessionLogSampler();
        for (let i = 0; i < 50; i += 1) expect(sampler.retain({ category: 'EVENT', message: 'player-damaged {}' }, i)).toBe(true);
        expect(sampler.retain({ category: 'WEAPON', message: 'pvp-hit-dealt {}' }, 1)).toBe(true);
        expect(sampler.flush(2)).toBeNull();
        sampler.retain(fire('pointer'), 3);
        expect(sampler.flush(4, { force: true }).events['WEAPON fire-input'].total).toBe(1);
    });

    it('breaks down shot-accepted by source (GAP-GP-13)', () => {
        const sampler = createSessionLogSampler({ windowMs: 5_000, keepPerWindow: 1 });
        const accepted = (source) => ({ category: 'WEAPON', message: `shot-accepted {\n  "source": "${source}"\n}` });
        sampler.retain(accepted('controller'), 100);
        sampler.retain(accepted('controller'), 200);
        sampler.retain(accepted('pointer'), 300);
        const summary = sampler.flush(6_000);
        expect(summary.events['WEAPON shot-accepted']).toEqual({
            total: 3,
            retained: 1,
            by: { controller: 2, pointer: 1 }
        });
    });
});
