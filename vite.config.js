import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const readGit = (args, fallback) => {
  try {
    return execFileSync('git', args, {
      cwd: import.meta.dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim() || fallback;
  } catch {
    return fallback;
  }
};

const packageVersion = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
).version;
const buildEnv = globalThis.process?.env ?? {};
const commit = buildEnv.HB_BUILD_COMMIT
  || readGit(['rev-parse', '--short=12', 'HEAD'], 'unknown');
const branch = buildEnv.HB_BUILD_BRANCH
  || readGit(['rev-parse', '--abbrev-ref', 'HEAD'], 'unknown');
const dirty = buildEnv.HB_BUILD_DIRTY != null
  ? buildEnv.HB_BUILD_DIRTY === '1'
  : Boolean(readGit(['status', '--porcelain'], ''));
const buildInfo = Object.freeze({
  version: buildEnv.HB_BUILD_VERSION || packageVersion,
  commit: commit.slice(0, 12),
  branch,
  dirty,
  steamBuild: buildEnv.HB_STEAM_BUILD_ID || '',
  builtAt: buildEnv.HB_BUILD_TIMESTAMP || new Date().toISOString()
});

export default defineConfig({
  // Relative base so the same dist/ serves both the web (Netlify) and the
  // Electron shell's file:// loads (docs/steam-build-pipeline.md).
  base: './',
  define: {
    __HB_BUILD_INFO__: JSON.stringify(buildInfo)
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
        }
      }
    }
  },
  plugins: [{
    name: 'hunker-bunker-build-info',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: `${JSON.stringify(buildInfo, null, 2)}\n`
      });
    }
  }],
  server: {
    allowedHosts: true,
    // scratch/ holds ad-hoc Python venvs and generator scripts (not source);
    // watching them exhausts the OS inotify budget on dev machines.
    watch: {
      ignored: ['**/scratch/**']
    }
  }
});
