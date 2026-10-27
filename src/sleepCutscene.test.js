import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { SHIPPED_SLEEP_CUTSCENES, SLEEP_CUTSCENE_STYLES, pickSleepCutsceneStyle, sleepCutsceneBase } from './sleepCutscene.js';

// Sprint 53 S1-S2 (owner, 2026-10-07: "cut scene prompts for a few different
// styles of sleep for a cut scene to play and reset").
describe('which sleep cutscene plays', () => {
    it('picks by where and how you sleep', () => {
        expect(pickSleepCutsceneStyle({ campId: 'bunker_cot' })).toBe('bunker');
        expect(pickSleepCutsceneStyle({ campId: 'camp_meridian' })).toBe('camp');
        expect(pickSleepCutsceneStyle({ campId: 'camp_meridian', biome: 'cryo' })).toBe('cryo');
        expect(pickSleepCutsceneStyle({ campId: 'bunker_cot', infected: true })).toBe('cryo');
        expect(pickSleepCutsceneStyle({ campId: 'camp_tallow', biome: 'bio', hiveBonded: true })).toBe('hive');
        expect(pickSleepCutsceneStyle({ campId: 'camp_tallow', biome: 'active', hiveBonded: true })).toBe('camp');
        expect(pickSleepCutsceneStyle({ campId: 'bunker_cot', coopPlayers: 1, biome: 'bio', hiveBonded: true })).toBe('squad');
    });

    it('names each style\'s video', () => {
        expect(SLEEP_CUTSCENE_STYLES).toEqual(['bunker', 'camp', 'cryo', 'hive', 'squad']);
        expect(sleepCutsceneBase('camp')).toBe('sleep-camp');
        expect(sleepCutsceneBase('nonsense')).toBe('sleep-bunker');
        // A class cut is used only once it has shipped.
        expect(sleepCutsceneBase('camp', 'TANK')).toBe(SHIPPED_SLEEP_CUTSCENES.has('sleep-camp-tank') ? 'sleep-camp-tank' : 'sleep-camp');
        expect(sleepCutsceneBase('bunker', 'SCOUT')).toBe('sleep-bunker');
    });

    it('lists only videos that are really in public/cutscenes', () => {
        expect(SHIPPED_SLEEP_CUTSCENES.has('sleep-bunker')).toBe(true);
        for (const base of SHIPPED_SLEEP_CUTSCENES) {
            const webm = new URL(`../public/cutscenes/${base}.webm`, import.meta.url);
            const mp4 = new URL(`../public/cutscenes/${base}.mp4`, import.meta.url);
            const poster = new URL(`../public/cutscenes/${base}-poster.jpg`, import.meta.url);
            expect(fs.existsSync(webm), base).toBe(true);
            expect(fs.existsSync(mp4), base).toBe(true);
            expect(fs.existsSync(poster), base).toBe(true);
        }
    });
});
