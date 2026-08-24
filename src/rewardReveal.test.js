import { describe, expect, it } from 'vitest';
import { mountRewardPreview } from './rewardReveal.js';

describe('mountRewardPreview (Lane B contract stub)', () => {
    it('resolves an explicit failure so the shell renders its unavailable state', async () => {
        const handle = mountRewardPreview({ container: null, itemId: 4130, category: 'charm' });
        const result = await handle.ready;

        expect(result.ok).toBe(false);
        expect(result.reason).toBeTruthy();
    });

    it('exposes a dispose() that is safe to call twice', async () => {
        const handle = mountRewardPreview({ container: null, itemId: 4130, category: 'charm' });
        await handle.ready;

        expect(() => { handle.dispose(); handle.dispose(); }).not.toThrow();
    });
});
