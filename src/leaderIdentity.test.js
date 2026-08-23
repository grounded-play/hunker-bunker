import { describe, expect, it, vi } from 'vitest';
import { dialogueReactionForLine, preloadLeaderMedia, resolveLeaderIdentity } from './leaderIdentity.js';

describe('leader conversation identity', () => {
    it('resolves the person by leader name rather than a fixed camp id', () => {
        const identity = resolveLeaderIdentity({ id: 'camp_meridian', leaderName: 'Commander Briggs', leaderClassId: 'TANK' });
        expect(identity.id).toBe('briggs');
        expect(identity.portrait).toContain('vesper_briggs');
        expect(identity.model.modelUrl).toMatch(/chassis_trench_warden_heavy|tank-rigged/);
    });

    it('selects readable reactions from dialogue content', () => {
        expect(dialogueReactionForLine('I trust you. Thank you.').mood).toBe('warm');
        expect(dialogueReactionForLine('No. I refuse.').mood).toBe('refusal');
        expect(dialogueReactionForLine('The dark is coming.').mood).toBe('uneasy');
    });

    it('preloads the resolved fallback portrait', () => {
        const image = { src: '' };
        const ImageCtor = vi.fn(function ImageStub() { return image; });
        preloadLeaderMedia(resolveLeaderIdentity({ leaderName: 'Sister Martha' }), ImageCtor);
        expect(image.src).toContain('tallow_martha');
    });
});
