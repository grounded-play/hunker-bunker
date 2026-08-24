import { describe, expect, it } from 'vitest';
import { CHROMA_GREEN_ALLOWLIST, auditChromaGreen } from './audit-chroma-green.js';

describe('chroma green asset audit', () => {
    it('contains intentional lore, raw source, and environmental assets in the allowlist', () => {
        expect(CHROMA_GREEN_ALLOWLIST.has('public/decal_biohazard_stencil.png')).toBe(true);
        expect(CHROMA_GREEN_ALLOWLIST.has('public/bio_spores_blue.png')).toBe(true);
        expect(CHROMA_GREEN_ALLOWLIST.has('public/economy/mod_thermal_heat_exchanger_chroma.jpg')).toBe(true);
    });

    it('passes audit validation on current repository assets with check=true', () => {
        const { ok, report } = auditChromaGreen({ check: true, writeReport: false });
        expect(ok).toBe(true);
        expect(report.unallowedCount).toBe(0);
        expect(report.scannedCount).toBeGreaterThan(0);
    }, 60000);
});
