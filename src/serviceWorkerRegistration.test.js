import { describe, expect, it, vi } from 'vitest';
import { shouldRegisterServiceWorker, registerServiceWorker } from './serviceWorkerRegistration.js';

// Lighthouse PWA (2026-10-06): "Does not register a service worker that
// controls page and start_url". Only the deployed web build registers one: the
// Steam build runs from file:// under Electron, and the Vite dev server must
// stay worker-free so HMR and the e2e suite see live files.
describe('service worker registration', () => {
    const env = (overrides = {}) => ({
        production: true,
        protocol: 'https:',
        hasServiceWorker: true,
        electron: false,
        ...overrides
    });

    it('registers on the deployed web build only', () => {
        expect(shouldRegisterServiceWorker(env())).toBe(true);
        expect(shouldRegisterServiceWorker(env({ production: false }))).toBe(false);
        expect(shouldRegisterServiceWorker(env({ protocol: 'file:' }))).toBe(false);
        expect(shouldRegisterServiceWorker(env({ electron: true }))).toBe(false);
        expect(shouldRegisterServiceWorker(env({ hasServiceWorker: false }))).toBe(false);
        expect(shouldRegisterServiceWorker(env({ protocol: 'http:' }))).toBe(true);
    });

    it('registers /sw.js at the site root and never throws', async () => {
        const register = vi.fn(async () => ({ scope: '/' }));
        await expect(registerServiceWorker({ register }, env())).resolves.toEqual({ scope: '/' });
        expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });

        const failing = vi.fn(async () => { throw new Error('blocked'); });
        await expect(registerServiceWorker({ register: failing }, env())).resolves.toBeNull();
        await expect(registerServiceWorker({ register }, env({ electron: true }))).resolves.toBeNull();
    });
});
