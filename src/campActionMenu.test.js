import { describe, expect, it } from 'vitest';
import { CAMP_PROMPT_LIMIT, trimCampPromptActions } from './campActionMenu.js';

// Owner, 2026-10-08: "too many options are showing on one". Up to twelve
// camp actions shared one prompt. docs/planning/qa-2026-10-08-camp-interaction-audit.md
const camp = { id: 'camp_meridian' };
const a = (action) => ({ camp, action, label: action.toUpperCase() });
const label = (count) => `CAMP SERVICES (${count})`;

describe('camp prompt: talk, the one that matters, and services', () => {
    it('leaves a short list alone', () => {
        const list = [a('talk'), a('support'), a('rest')];
        expect(trimCampPromptActions(list, { servicesLabel: label })).toEqual(list);
    });

    it('shows TALK, the most relevant action, and CAMP SERVICES holding the rest', () => {
        const list = ['talk-resident', 'talk', 'support', 'quest-offer', 'bond', 'field-workbench', 'rest'].map(a);
        const shown = trimCampPromptActions(list, { servicesLabel: label });
        expect(shown).toHaveLength(CAMP_PROMPT_LIMIT);
        expect(shown.map((entry) => entry.action)).toEqual(['talk', 'talk-resident', 'services']);
        expect(shown[2].label).toBe('CAMP SERVICES (5)');
        expect(shown[2].services.map((entry) => entry.action)).toEqual(['quest-offer', 'support', 'bond', 'rest', 'field-workbench']);
    });

    it('puts a quest offer ahead of support when no resident is near', () => {
        const list = ['talk', 'support', 'quest-offer', 'bond', 'rest'].map(a);
        expect(trimCampPromptActions(list, { servicesLabel: label }).map((entry) => entry.action)).toEqual(['talk', 'quest-offer', 'services']);
    });

    it('shows the two most relevant when there is no one to talk to', () => {
        const list = ['support', 'rest', 'shore-up', 'field-workbench'].map(a);
        expect(trimCampPromptActions(list, { servicesLabel: label }).map((entry) => entry.action)).toEqual(['shore-up', 'support', 'services']);
    });

    it('passes an exclusive state (a decision, a lockdown) through untouched', () => {
        const list = [a('choice')];
        expect(trimCampPromptActions(list, { servicesLabel: label })).toEqual(list);
    });
});
