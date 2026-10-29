import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROLE_IDS } from './build-voice-cast.mjs';
import { buildManifest, filterChainFor } from './encode-voice-lines.mjs';

describe('voice line encoding', () => {
    it('gives every cast role and the developer a post chain, all loudness-normalized', () => {
        for (const role of [...Object.values(ROLE_IDS), 'developer']) {
            const chain = filterChainFor(role);
            expect(chain, role).toContain('loudnorm');
        }
    });

    // Casting bible section 17: world placement is a post chain, per role.
    it('follows the casting bible post chains', () => {
        expect(filterChainFor('mothership')).toMatch(/highpass.*lowpass/); // communications band
        expect(filterChainFor('queen')).toContain('chorus'); // quiet double
        expect(filterChainFor('briggs')).not.toMatch(/asetrate|rubberband|chorus/); // no character-defining pitch shift
        expect(filterChainFor('system', 'glitched')).toContain('acrusher'); // controlled digital breakup
        expect(filterChainFor('system', 'corporate')).not.toContain('acrusher');
        expect(filterChainFor('nahl')).not.toBe(filterChainFor('vey')); // no shared alien preset
    });

    it('lists only the lines that exist, per locale', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-voice-'));
        fs.mkdirSync(path.join(dir, 'en'));
        fs.mkdirSync(path.join(dir, 'de'));
        fs.writeFileSync(path.join(dir, 'en', 'narrative.a.0.mp3'), '');
        fs.writeFileSync(path.join(dir, 'en', 'narrative.b.0.mp3'), '');
        fs.writeFileSync(path.join(dir, 'en', 'notes.txt'), '');
        expect(buildManifest(dir, []).locales).toEqual({ en: ['narrative.a.0', 'narrative.b.0'] });
    });

    it('carries the displayed text of recorded code lines, which have no i18n key', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hb-voice-'));
        fs.mkdirSync(path.join(dir, 'en'));
        fs.writeFileSync(path.join(dir, 'en', 'code.tina.abc.mp3'), '');
        fs.writeFileSync(path.join(dir, 'en', 'narrative.a.0.mp3'), '');
        const manifest = buildManifest(dir, [
            { key: 'code.tina.abc', locale: 'en', role: 'tina', source: 'code', display: 'MAYOR TINA: PUT THAT DOWN.' },
            { key: 'code.tina.unrecorded', locale: 'en', role: 'tina', source: 'code', display: 'MAYOR TINA: LATER.' },
            { key: 'narrative.a.0', locale: 'en', role: 'system', display: 'Catalog line' }
        ]);
        expect(manifest.texts).toEqual({ 'code.tina.abc': 'MAYOR TINA: PUT THAT DOWN.' });
    });

    it('gives the supporting cast their own chains and wanderers the human-cast cleanup', () => {
        expect(filterChainFor('aria')).toContain('chorus');
        expect(filterChainFor('tina')).not.toMatch(/asetrate|rubberband|chorus/);
        expect(filterChainFor('wanderer_hacker')).toBe(filterChainFor('briggs'));
    });
});
