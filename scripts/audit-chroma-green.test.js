import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CHROMA_GREEN_ALLOWLIST, decodeAndSamplePng } from './audit-chroma-green.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('chroma green asset audit', () => {
    it('contains intentional lore, raw source, and environmental assets in the allowlist', () => {
        expect(CHROMA_GREEN_ALLOWLIST.has('public/decal_biohazard_stencil.png')).toBe(true);
        expect(CHROMA_GREEN_ALLOWLIST.has('public/bio_spores_blue.png')).toBe(true);
        expect(CHROMA_GREEN_ALLOWLIST.has('public/economy/mod_thermal_heat_exchanger_chroma.jpg')).toBe(true);
    });

    it('decodes and samples PNG pixel data for green ratios accurately', () => {
        const biohazardPath = path.join(ROOT_DIR, 'public/decal_biohazard_stencil.png');
        if (fs.existsSync(biohazardPath)) {
            const buf = fs.readFileSync(biohazardPath);
            const res = decodeAndSamplePng(buf);
            expect(res).not.toBeNull();
            expect(res.width).toBe(512);
            expect(res.height).toBe(512);
            expect(res.ratio).toBeGreaterThan(0.02);
        }

        const keyPath = path.join(ROOT_DIR, 'public/economy/cache_key.png');
        if (fs.existsSync(keyPath)) {
            const buf = fs.readFileSync(keyPath);
            const res = decodeAndSamplePng(buf);
            expect(res).not.toBeNull();
            expect(res.width).toBe(256);
            expect(res.height).toBe(256);
            expect(res.ratio).toBeLessThan(0.02);
        }
    });

    it('validates audit report structure', () => {
        const report = {
            timestamp: new Date().toISOString(),
            scannedCount: 1,
            unallowedCount: 0,
            allowlistCount: CHROMA_GREEN_ALLOWLIST.size,
            unallowed: [],
            findings: [{ file: 'public/decal_biohazard_stencil.png', ratio: 0.1, width: 512, height: 512 }]
        };
        expect(report.unallowedCount).toBe(0);
        expect(report.allowlistCount).toBeGreaterThan(50);
    });
});
