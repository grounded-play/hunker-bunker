import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const debugConsole = readFileSync(new URL('./debugConsole.js', import.meta.url), 'utf8');

describe('non-Armory QA unlock parity', () => {
    it('unlocks both standalone tint catalogs alongside the catalog equip override', () => {
        const body = source.match(/function devSetCosmeticUnlockAll\(arg\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
        expect(body).toContain('store.setUnlockAll(next)');
        expect(body).toContain('unlockAllPolishes()');
        expect(body).toContain('unlockAllSheens()');
        expect(body).toContain('store.auditEquippableCatalog()');
    });

    it('exposes an explicitly named Armory unlock button in both debug consoles', () => {
        expect(index).toMatch(/id="dev-btn-unlock-all-skins"[^>]*>UNLOCK ALL ARMORY<\/button>/);
        expect(debugConsole).toMatch(/id="hb-main-skins-all"[^>]*>ARMORY ALL<\/button>/);
        expect(debugConsole).toContain("runMainCommand('armory_all 1')");
        expect(source).toContain("case 'armory_all':");
        expect(source).toContain("devSetCosmeticUnlockAll('1')");
    });
});
