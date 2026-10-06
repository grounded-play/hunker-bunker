import { describe, expect, it, vi } from 'vitest';
import { createVoiceLineLibrary, normalizeVoiceText, voiceLineUrl } from './voiceLines.js';

const STRINGS = {
    en: {
        'narrative.leaderDialogue.briggs.stages.0.loop': 'BRIGGS: PROVE YOU CAN HOLD A LINE. FORTIFY THIS POSITION, THEN WE TALK.',
        'narrative.mothershipReactive.0.text': '> MOTHERSHIP: AGENT — FIRST THREAT NEUTRALIZED. PROCEED.',
        'narrative.commentary.run_start.body': 'Every run starts at the crash.'
    },
    de: {
        'narrative.leaderDialogue.briggs.stages.0.loop': 'BRIGGS: BEWEISE, DASS DU EINE LINIE HALTEN KANNST.'
    }
};

function setup(manifest = { locales: { en: Object.keys(STRINGS.en), de: Object.keys(STRINGS.de) } }) {
    let locale = 'en';
    const fetchJson = vi.fn(async () => manifest);
    const library = createVoiceLineLibrary({
        fetchJson,
        getLocale: () => locale,
        translate: (key) => STRINGS[locale]?.[key] ?? key
    });
    return { library, fetchJson, setLocale: (l) => { locale = l; } };
}

describe('voice lines', () => {
    it('normalizes away markers, speaker prefixes, case and punctuation', () => {
        expect(normalizeVoiceText('> MOTHERSHIP: Agent — first threat neutralized.')).toBe('agent first threat neutralized');
        expect(normalizeVoiceText('БРИГГС: Докажи!')).toBe('докажи');
        expect(normalizeVoiceText('布里格斯：证明你守得住。')).toBe('证明你守得住');
    });

    it('builds the file path for a line in a language', () => {
        expect(voiceLineUrl('pt-BR', 'narrative.commentary.run_start.body')).toBe('/audio/voice/lines/pt-BR/narrative.commentary.run_start.body.mp3');
    });

    it('resolves a displayed line, however the UI dressed it, to its key and file', async () => {
        const { library } = setup();
        await library.load();
        expect(library.resolve('PROVE YOU CAN HOLD A LINE. FORTIFY THIS POSITION, THEN WE TALK.')).toEqual({
            key: 'narrative.leaderDialogue.briggs.stages.0.loop',
            url: '/audio/voice/lines/en/narrative.leaderDialogue.briggs.stages.0.loop.mp3'
        });
        expect(library.resolve('MOTHERSHIP: Agent — first threat neutralized. Proceed.')?.key).toBe('narrative.mothershipReactive.0.text');
        expect(library.resolve('A line nobody recorded.')).toBeNull();
    });

    it('follows the current language and only offers lines recorded in it', async () => {
        const { library, setLocale } = setup();
        await library.load();
        setLocale('de');
        expect(library.resolve('BRIGGS: Beweise, dass du eine Linie halten kannst.')?.url).toBe('/audio/voice/lines/de/narrative.leaderDialogue.briggs.stages.0.loop.mp3');
        expect(library.urlFor('narrative.commentary.run_start.body')).toBeNull();
        setLocale('en');
        expect(library.urlFor('narrative.commentary.run_start.body')).toBe('/audio/voice/lines/en/narrative.commentary.run_start.body.mp3');
    });

    it('stays silent, not broken, when no voice lines have shipped yet', async () => {
        const library = createVoiceLineLibrary({ fetchJson: async () => { throw new Error('404'); }, getLocale: () => 'en', translate: (k) => k });
        await library.load();
        expect(library.resolve('anything')).toBeNull();
        expect(library.urlFor('narrative.commentary.run_start.body')).toBeNull();
    });

    it('loads the manifest once, lazily, and resolves nothing until it has', async () => {
        const { library, fetchJson } = setup();
        expect(library.resolve('PROVE YOU CAN HOLD A LINE. FORTIFY THIS POSITION, THEN WE TALK.')).toBeNull();
        await library.load();
        await library.load();
        expect(fetchJson).toHaveBeenCalledTimes(1);
    });
});
