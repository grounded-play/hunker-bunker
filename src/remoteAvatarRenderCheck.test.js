import { describe, expect, it } from 'vitest';
import { remoteAvatarRenderProblems } from './remoteAvatarRenderCheck.js';

const healthy = { drawn: true, meshes: 3, programs: [true, true, true], height: 1.6, offset: 0.1 };

describe('remote avatar render check (QA 2026-10-28: only their shadow showed)', () => {
    it('passes a body that drew, linked and stands on its player', () => {
        expect(remoteAvatarRenderProblems(healthy)).toEqual([]);
    });

    it('names a body the colour pass never drew', () => {
        expect(remoteAvatarRenderProblems({ ...healthy, drawn: false })).toContain('not-drawn');
    });

    it('names a material whose program failed to link', () => {
        expect(remoteAvatarRenderProblems({ ...healthy, programs: [true, false] })).toContain('program-not-linked');
    });

    it('names a body far too small, too large or away from its player', () => {
        expect(remoteAvatarRenderProblems({ ...healthy, height: 0.01 })).toContain('bad-size');
        expect(remoteAvatarRenderProblems({ ...healthy, height: 240 })).toContain('bad-size');
        expect(remoteAvatarRenderProblems({ ...healthy, offset: 12 })).toContain('off-body');
    });

    it('names an empty overlay', () => {
        expect(remoteAvatarRenderProblems({ ...healthy, meshes: 0, programs: [] })).toContain('no-meshes');
    });
});
