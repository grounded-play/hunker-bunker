import { describe, expect, it, vi } from 'vitest';
import { loadGltfTemplate } from './gltfTemplateCache.js';

describe('shared glTF template cache', () => {
    it('parses a URL once however many overlays ask for it', async () => {
        const loadAsync = vi.fn(async (url) => ({ scene: { url } }));
        const createLoader = () => ({ loadAsync });
        const [a, b] = await Promise.all([
            loadGltfTemplate('/3d/test/shared.glb', { createLoader }),
            loadGltfTemplate('/3d/test/shared.glb', { createLoader })
        ]);
        expect(a).toBe(b);
        expect(loadAsync).toHaveBeenCalledTimes(1);
    });

    it('forgets a failed load so the next request retries', async () => {
        let calls = 0;
        const createLoader = () => ({ loadAsync: vi.fn(async () => { calls += 1; if (calls === 1) throw new Error('offline'); return { scene: {} }; }) });
        await expect(loadGltfTemplate('/3d/test/flaky.glb', { createLoader })).rejects.toThrow('offline');
        await expect(loadGltfTemplate('/3d/test/flaky.glb', { createLoader })).resolves.toEqual({ scene: {} });
    });
});
