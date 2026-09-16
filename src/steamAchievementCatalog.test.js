import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFS } from './achievements.js';

const require = createRequire(import.meta.url);
const { PUBLISHED_ACHIEVEMENT_KEYS } = require('../electron/steam-achievement-catalog.cjs');

describe('Steam achievement catalog parity', () => {
    it('matches every live local definition and excludes coming-soon entries', () => {
        const local = ACHIEVEMENT_DEFS.filter((def) => !def.comingSoon).map((def) => def.key).sort();
        expect([...PUBLISHED_ACHIEVEMENT_KEYS].sort()).toEqual(local);
        expect(PUBLISHED_ACHIEVEMENT_KEYS).not.toContain('slay_the_queen');
    });
});
