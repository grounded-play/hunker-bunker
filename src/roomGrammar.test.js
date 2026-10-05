import { describe, expect, it } from 'vitest';
import { planInterior } from './roomGrammar.js';

const sides = ['n', 'e', 's', 'w'];
const socketsFor = mask => sides.filter((_, i) => mask & (1 << i)).map(side => ({ side, offset: 7, width: 3 }));

describe('industrial interior pilot', () => {
    it('is deterministic, input-order independent and isolated by expedition identity', () => {
        const input = { seed: 42, roomId: '3,2', sockets: socketsFor(15) };
        const a = planInterior(input);
        expect(planInterior(input)).toEqual(a);
        expect(planInterior({ ...input, sockets: [...input.sockets].reverse() })).toEqual(a);
        expect(input.sockets).toEqual(socketsFor(15));
        expect(planInterior({ ...input, seed: 43 }).modules.map(m => m.id)).not.toEqual(a.modules.map(m => m.id));
    });

    it('preserves exact entrances and wide approach routes for all 15 doorway masks', () => {
        const motifs = new Set();
        for (const tier of ['standard', 'major']) for (let seed = 0; seed < 32; seed += 1) {
            for (let mask = 1; mask < 16; mask += 1) {
                const plan = planInterior({ seed, tier, sockets: socketsFor(mask) });
                motifs.add(plan.diagnostics.motif);
                expect(plan.metrics.floorArea).toBeGreaterThan(169);
                expect(plan.diagnostics.attempts).toBeLessThanOrEqual(7);
                const floor = (x, y) => ['.', 'D'].includes(plan.grid[y]?.[x]);
                // Independent traversal on the eroded floor verifies 3x3 clearance.
                const clear = (x, y) => [-1, 0, 1].every(dy => [-1, 0, 1].every(dx => floor(x + dx, y + dy)));
                const queue = [plan.anchors[0]], seen = new Set();
                while (queue.length) {
                    const p = queue.pop(), k = `${p.x},${p.y}`;
                    if (seen.has(k) || !clear(p.x, p.y)) continue;
                    seen.add(k);
                    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push({ x: p.x + dx, y: p.y + dy });
                }
                for (const p of [...plan.anchors, ...plan.doors.map(d => d.approach)]) expect(seen.has(`${p.x},${p.y}`)).toBe(true);
                const entrances = new Set(plan.doors.flatMap(d => d.cells.map(p => `${p.x},${p.y}`)));
                for (let y = 0; y < plan.height; y += 1) for (let x = 0; x < plan.width; x += 1) {
                    if (x === 0 || y === 0 || x === plan.width - 1 || y === plan.height - 1) {
                        expect(plan.grid[y][x]).toBe(entrances.has(`${x},${y}`) ? 'D' : '#');
                    }
                }
            }
        }
        expect(motifs).toContain('machine-island');
        expect(motifs).toContain('paired-work-bays');
        expect(motifs).toContain('offset-service-spine');
    });

    it('uses a bounded, explicit fallback when required access excludes all setpieces', () => {
        const reservations = Array.from({ length: 8 }, (_, i) => ({ x: 6 + i, y: 7 }));
        const plan = planInterior({ seed: 4, sockets: socketsFor(15), reservations });
        expect(plan.diagnostics.fallback).toBe(true);
        expect(plan.diagnostics.attempts).toBe(7);
        expect(plan.modules).toEqual([]);
        for (const p of reservations) expect(plan.grid[p.y][p.x]).toBe('.');
    });

    it('supports offset corner approaches without changing boundary sockets', () => {
        for (let seed = 0; seed < 20; seed += 1) {
            const envelope = planInterior({ seed, sockets: socketsFor(15) });
            const sockets = sides.map((side, index) => ({ side, width: 3,
                offset: index % 2 ? envelope.height - 4 : 3 }));
            const plan = planInterior({ seed, sockets });
            expect(plan.doors.map(d => ({ side: d.side, width: d.width, offset: d.offset }))).toEqual(sockets);
            expect(plan.diagnostics.fallback).toBe(false);
        }
    });

    it('rejects unsupported versions and malformed sockets rather than silently moving them', () => {
        for (const override of [
            { generatorVersion: 2 }, { seed: NaN }, { tier: 'unknown' },
            { sockets: [] }, { sockets: [{ side: 'n', width: 3, offset: 0 }] },
            { sockets: [{ side: 'n', width: 1, offset: 7 }] },
            { sockets: [socketsFor(1)[0], socketsFor(1)[0]] },
            { reservations: [{ x: 0, y: 7 }] }
        ]) expect(() => planInterior({ seed: 1, sockets: socketsFor(1), ...override })).toThrow();
    });
});
