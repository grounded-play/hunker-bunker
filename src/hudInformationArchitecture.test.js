import { describe, expect, it } from 'vitest';
import { buildObjectiveSummary, selectPromptCandidate } from './hudInformationArchitecture.js';

describe('HUD information architecture', () => {
    it('selects one prompt by interaction, urgent, context, then guidance priority', () => {
        const selected = selectPromptCandidate([
            { id: 'loop', kind: 'guidance', visible: true },
            { id: 'zone', kind: 'context', visible: true },
            { id: 'tutorial', kind: 'urgent', visible: true },
            { id: 'console', kind: 'interaction', visible: true }
        ]);
        expect(selected.id).toBe('console');
    });

    it('keeps stable DOM order when prompts share priority', () => {
        const selected = selectPromptCandidate([
            { id: 'lore', kind: 'interaction', visible: true },
            { id: 'console', kind: 'interaction', visible: true }
        ]);
        expect(selected.id).toBe('lore');
    });

    it('builds a one-line primary objective and +n count', () => {
        expect(buildObjectiveSummary([
            { label: 'RECOVER BLACK BOX', progress: '0/1' },
            { label: 'RESTORE O₂', progress: 'ACTIVE' },
            { label: 'FIND THE CAMP', progress: 'ACTIVE' }
        ])).toEqual({
            label: 'RECOVER BLACK BOX',
            progress: '0/1',
            additionalCount: 2,
            total: 3
        });
    });
});
