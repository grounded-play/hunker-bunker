import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CASTING_DOC, ROLE_IDS, buildVoiceCast, cleanPerformanceText } from './build-voice-cast.mjs';

const cast = buildVoiceCast(fs.readFileSync(CASTING_DOC, 'utf8'));

describe('voice cast from the casting bible', () => {
    it('extracts all eleven speaking roles with their stable ids and prompt revisions', () => {
        expect(cast.roles.map((r) => r.id)).toEqual(Object.values(ROLE_IDS));
        for (const role of cast.roles) {
            expect(role.promptRevision, role.id).toBe(`VD-${role.id.toUpperCase()}-01`);
        }
    });

    it('keeps the full identity description for VoiceDesign and never an effect term in it', () => {
        for (const role of cast.roles) {
            expect(role.description.length, role.id).toBeGreaterThan(300);
            // The casting rules forbid world effects in the identity prompt.
            expect(role.description, role.id).not.toMatch(/\b(reverb|vocoder|telephone|echo)\b/i);
        }
        expect(cast.roles.find((r) => r.id === 'mothership').description).toContain('orbital operations controller');
    });

    it('turns the ElevenLabs preview into clean speakable reference text', () => {
        for (const role of cast.roles) {
            expect(role.referenceText, role.id).not.toMatch(/\[|\]/);
            expect(role.referenceText.split(/\s+/).length, role.id).toBeGreaterThanOrEqual(25);
        }
        expect(cast.roles.find((r) => r.id === 'mothership').referenceText.startsWith('Agent.')).toBe(true);
    });

    it('records direction, rejection criteria and the allowed post chain per role', () => {
        const mothership = cast.roles.find((r) => r.id === 'mothership');
        expect(mothership.direction.some((d) => /dry master/i.test(d))).toBe(true);
        expect(mothership.reject.length).toBeGreaterThan(2);
        expect(mothership.postChain).toMatch(/band-pass/i);
        expect(cast.roles.find((r) => r.id === 'briggs').postChain).toMatch(/cleanup/i);
    });

    it('applies the script preparation rules to spoken text', () => {
        expect(cleanPerformanceText('> MOTHERSHIP: [coldly] O₂ critical.')).toBe('Oxygen critical.');
        expect(cleanPerformanceText('KAELEN: YOU DIED OUT THERE. SIT DOWN.')).toBe('You died out there. Sit down.');
    });
});
