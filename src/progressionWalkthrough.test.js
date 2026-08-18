import { describe, it, expect, beforeEach } from 'vitest';
import { PROGRESSION_MANIFEST, ProgressionWalkthrough } from './progressionWalkthrough.js';

describe('Wing 5: Gameplay Progression Walkthrough', () => {
    beforeEach(() => {
        globalThis.document = {
            createElement: () => ({
                id: '',
                className: '',
                innerHTML: '',
                classList: { add: () => {}, remove: () => {} },
                addEventListener: () => {},
                appendChild: () => {},
                querySelectorAll: () => []
            }),
            body: { appendChild: () => {} }
        };
    });

    it('contains all 8 progression categories in chronological campaign order', () => {
        expect(PROGRESSION_MANIFEST.length).toBe(8);
        const ids = PROGRESSION_MANIFEST.map(m => m.id);
        expect(ids).toEqual([
            'boot_tutorial',
            'depth_tiers',
            'camp_hive_discovery',
            'milestone_bosses',
            'queen_and_endings',
            'battle_pass',
            'achievements',
            'extraction'
        ]);
    });

    it('creates progression walkthrough modal and mounts to DOM', () => {
        const pw = new ProgressionWalkthrough();
        expect(pw).toBeTruthy();
        expect(pw.manifest.length).toBe(8);
    });
});
