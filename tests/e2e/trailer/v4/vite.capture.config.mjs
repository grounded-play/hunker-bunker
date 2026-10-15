// No-HMR dev server for trailer capture. HMR reloads (and the watcher's
// inotify ENOSPC on this repo's asset tree) restart the page mid-take; a
// capture only needs the source served, not watched.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import base from '../../../../vite.config.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const resolved = typeof base === 'function' ? await base({ command: 'serve', mode: 'development' }) : base;
const port = Number(process.env.TRAILER_PORT ?? 5241);

export default {
    ...resolved,
    root,
    // Own optimizer cache: node_modules may be a symlink shared with other
    // checkouts whose dev servers use the default cache.
    cacheDir: path.join(root, 'trailer/raw/.vite-cache'),
    server: {
        ...(resolved.server || {}),
        hmr: false,
        watch: { ignored: (p) => /[\/](art|public|scratch|docs|tests|dist|trailer|\.git|node_modules|electron|steam|test-results|playwright-report|\.remember)([\/]|$)/.test(p) },
        port,
        strictPort: true
    }
};
