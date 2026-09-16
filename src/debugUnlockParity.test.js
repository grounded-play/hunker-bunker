import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../main.js', import.meta.url), 'utf8');

describe('non-Armory QA unlock parity', () => {
    it('unlocks both standalone tint catalogs alongside the catalog equip override', () => {
        const body = source.match(/function devSetCosmeticUnlockAll\(arg\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
        expect(body).toContain('store.setUnlockAll(next)');
        expect(body).toContain('unlockAllPolishes()');
        expect(body).toContain('unlockAllSheens()');
        expect(body).toContain('store.auditEquippableCatalog()');
    });
});
