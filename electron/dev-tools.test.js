import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { enableDevTooling, parseExtensionIds } = require('./dev-tools.cjs');

const REACT = 'fmkadmapgofadopljbjfkapdkoienihi';

describe('dev-only Electron debugging aids', () => {
    it('loads neither package outside ELECTRON_DEV', async () => {
        const loadDebug = vi.fn();
        const loadInstaller = vi.fn();
        expect(await enableDevTooling({ dev: false, loadDebug, loadInstaller })).toEqual({ debug: false, extensions: null });
        expect(loadDebug).not.toHaveBeenCalled();
        expect(loadInstaller).not.toHaveBeenCalled();
    });

    it('turns on shortcuts with DevTools detached, closed on request', async () => {
        const debug = vi.fn();
        await enableDevTooling({ dev: true, env: { HB_DEVTOOLS_OPEN: '0' }, loadDebug: async () => ({ default: debug }) });
        expect(debug).toHaveBeenCalledWith({ isEnabled: true, showDevTools: false, devToolsMode: 'detach' });
    });

    it('downloads nothing unless extension IDs are listed', async () => {
        const loadInstaller = vi.fn();
        const result = await enableDevTooling({ dev: true, env: {}, loadDebug: async () => ({ default: vi.fn() }), loadInstaller });
        expect(result.extensions).toBeNull();
        expect(loadInstaller).not.toHaveBeenCalled();
    });

    it('installs listed extensions without failing the launch when the install fails', async () => {
        const installExtension = vi.fn().mockRejectedValue(new Error('offline'));
        const log = { warn: vi.fn() };
        const result = await enableDevTooling({
            dev: true,
            env: { HB_DEVTOOLS_EXTENSIONS: `${REACT}, ${REACT}` },
            log,
            loadDebug: async () => ({ default: vi.fn() }),
            loadInstaller: () => ({ installExtension })
        });
        expect(installExtension).toHaveBeenCalledWith([REACT], { loadExtensionOptions: { allowFileAccess: true } });
        expect(await result.extensions).toEqual([]);
        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('offline'));
    });

    it('keeps only well-formed Chrome Web Store IDs', () => {
        expect(parseExtensionIds(` ${REACT},not-an-id,,${REACT.toUpperCase()}`)).toEqual([REACT]);
        expect(parseExtensionIds(undefined)).toEqual([]);
    });
});
