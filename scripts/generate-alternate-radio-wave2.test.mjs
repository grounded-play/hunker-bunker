import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { RECORDING_JOBS } from './audio/alternate-radio-wave2-jobs.js';
import { parseRecordingJobs } from './generate-alternate-radio-wave2.mjs';

const sheet = readFileSync(resolve(import.meta.dirname, '../docs/planning/alternate-radio-wave-2-recording-script-2026-09-15.md'), 'utf8');

describe('Wave 2 generator', () => {
    it('produces two takes for every missing bank line', () => {
        const jobs = parseRecordingJobs(sheet);
        expect(jobs).toHaveLength(184);
        expect(new Set(jobs.map((job) => job.outputKey)).size).toBe(184);

        const shield = jobs.filter((job) => job.cue === 'shield_critical');
        expect(shield.map((job) => `${job.bank}:${job.take}`)).toEqual(['commander:1', 'commander:2']);

        const deployment = jobs.filter((job) => job.cue === 'comms_online');
        expect(deployment.map((job) => `${job.bank}:${job.take}`)).toEqual([
            'commander:1', 'commander:2', 'aura:1', 'aura:2'
        ]);
    });

    it('carries bank direction without changing spoken script text', () => {
        const jobs = parseRecordingJobs(sheet);
        const commander = jobs.find((job) => job.outputKey === 'voice_commander_oxygen_low');
        const aura = jobs.find((job) => job.outputKey === 'voice_aura_oxygen_low');
        expect(commander.prompt).toMatch(/^\[Russian accent, clipped, restrained\]/);
        expect(commander.text).toBe('Oxygen low. Return to pressure.');
        expect(aura.prompt).toMatch(/^\[calm, precise, smooth authority\]/);
        expect(aura.text).toBe('Oxygen reserve low. Seek life support.');
    });

    it('manifest matches parsed recording jobs sheet', () => {
        expect(RECORDING_JOBS).toEqual(parseRecordingJobs(sheet));
    });
});
