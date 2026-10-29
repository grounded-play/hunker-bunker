import { describe, expect, it } from 'vitest';
import {
    MAX_LINE_CHARS,
    choiceToneLabel,
    pageConversationLines,
    splitConversationLine
} from './conversationGrammar.js';
import { LEADER_DEATH_BEATS, LEADER_DIALOGUE } from './data/campDialogue.js';

describe('conversation grammar', () => {
    it('shows choice intents as words, not bracketed tags', () => {
        expect(choiceToneLabel('[ASK]')).toBe('Ask');
        expect(choiceToneLabel('[LEAVE]')).toBe('Leave');
        expect(choiceToneLabel('')).toBe('');
    });

    it('splits a long line at the sentence nearest its middle and keeps the speaker on each part', () => {
        const line = 'Briggs: The Iron Guild named this outpost for Captain Vesper, K. We remember our dead. You would do well to remember our barrel cores.';
        const parts = splitConversationLine(line, 80);
        expect(parts).toEqual([
            'Briggs: The Iron Guild named this outpost for Captain Vesper, K. We remember our dead.',
            'Briggs: You would do well to remember our barrel cores.'
        ]);
        expect(splitConversationLine('Kaelen: Short line.')).toEqual(['Kaelen: Short line.']);
    });

    it('keeps a single long sentence whole rather than cutting a thought', () => {
        const line = `Martha: ${'warm '.repeat(40).trim()}`;
        expect(splitConversationLine(line, 60)).toEqual([line]);
    });

    it('voices the whole line on its first part only', () => {
        const long = 'Kaelen: One sentence here that runs on for a while. Another that also runs on for a while to pass the limit.';
        const paged = pageConversationLines([long, 'Kaelen: Next.'], 70);
        expect(paged.map(({ voice }) => voice)).toEqual([long, '', 'Kaelen: Next.']);
    });

    it('leaves no shipped leader line longer than the limit once paged, unless it is one sentence', () => {
        const lines = [
            ...Object.values(LEADER_DEATH_BEATS).flat(),
            ...Object.values(LEADER_DIALOGUE).flatMap(({ stages }) => stages.flatMap((stage) => [...stage.beats.flat(), stage.loop]))
        ];
        for (const { text } of pageConversationLines(lines)) {
            const body = text.split(': ').slice(1).join(': ');
            if (body.length > MAX_LINE_CHARS) expect(body.match(/[.!?…—]\s+\S/g), text).toBeNull();
        }
    });
});
