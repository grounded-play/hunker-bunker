import { describe, expect, it } from 'vitest';
import { LOCALES, VOICE_LINE_RULES, extractVoiceLines, speakChineseNumbers } from './extract-voice-lines.mjs';
import { ROLE_IDS } from './build-voice-cast.mjs';

const lines = extractVoiceLines();
const en = lines.filter((l) => l.locale === 'en');

describe('voice line extraction', () => {
    it('covers all seven game languages with the same line keys', () => {
        expect(LOCALES).toEqual(['en', 'de', 'es-419', 'ja', 'pt-BR', 'ru', 'zh-CN']);
        const enKeys = new Set(en.map((l) => l.key));
        for (const locale of LOCALES) {
            const keys = new Set(lines.filter((l) => l.locale === locale).map((l) => l.key));
            expect(keys.size, locale).toBeGreaterThan(250);
            for (const key of keys) expect(enKeys.has(key), `${locale} ${key}`).toBe(true);
        }
    });

    it('assigns every line to a cast role, or to the developer for commentary', () => {
        const roles = new Set([...Object.values(ROLE_IDS), 'developer']);
        for (const line of en) expect(roles.has(line.role), line.key).toBe(true);
        expect(en.find((l) => l.key === 'narrative.leaderDialogue.briggs.stages.0.loop').role).toBe('briggs');
        expect(en.find((l) => l.key.startsWith('narrative.leaderDialogue.scientist.')).role).toBe('okonkwo');
        expect(en.find((l) => l.key === 'narrative.mothershipReactive.0.text').role).toBe('mothership');
        expect(en.find((l) => l.key === 'narrative.commentary.commentary_on.body').role).toBe('developer');
        expect(en.find((l) => l.key === 'narrative.devHistory.day_one.body').role).toBe('developer');
    });

    it('keeps the suit register for System lines so glitched and reverent reads can differ', () => {
        const glitched = en.find((l) => l.key.startsWith('narrative.dialogue.glitched.'));
        expect(glitched).toMatchObject({ role: 'system', register: 'glitched' });
    });

    it('voices speech only: no labels, choice buttons, objective banners or titles', () => {
        for (const line of en) {
            expect(line.key, line.key).not.toMatch(/\.(label|title|choices)(\.|$)/);
            expect(line.key.startsWith('narrative.missionBriefings.'), line.key).toBe(false);
        }
    });

    it('speaks clean text: no speaker prefixes or terminal markers, oxygen not O₂, no shouting caps', () => {
        const briggs = en.find((l) => l.key === 'narrative.leaderDialogue.briggs.stages.0.loop');
        expect(briggs.display.startsWith('BRIGGS:')).toBe(true);
        expect(briggs.spoken).toBe('Prove you can hold a line. Fortify this position, then we talk.');
        const mothership = en.find((l) => l.key === 'narrative.mothershipReactive.0.text');
        expect(mothership.spoken.startsWith('>')).toBe(false);
        expect(mothership.spoken).not.toMatch(/MOTHERSHIP:/);
    });

    it('lists its rules, so a new catalog is a deliberate addition', () => {
        expect(VOICE_LINE_RULES.map((r) => r.catalog)).toContain('leaderDialogue');
    });

    it('speaks Chinese numbers as Chinese numerals, never Arabic digits', () => {
        expect(speakChineseNumbers('黑匣子在 2026 年 6 月第一周加入')).toBe('黑匣子在二〇二六年六月第一周加入');
        expect(speakChineseNumbers('2026年5月14日')).toBe('二〇二六年五月十四日');
        expect(speakChineseNumbers('正因如此，0047')).toBe('正因如此，〇〇四七');
        expect(speakChineseNumbers('第 29 天，有 105 个')).toBe('第二十九天，有一百零五个');
        const zh = extractVoiceLines().filter((line) => line.locale === 'zh-CN');
        expect(zh.filter((line) => /\d/.test(line.spoken)).map((line) => line.key)).toEqual([]);
    });
});
