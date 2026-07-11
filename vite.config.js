import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the same dist/ serves both the web (Netlify) and the
  // Electron shell's file:// loads (docs/steam-build-pipeline.md).
  base: './',
  server: {
    allowedHosts: true
  }
});
