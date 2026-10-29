import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.agents/**', 'chrome/**', 'scratch/**', 'scripts/**', '!scripts/generate-world-expansion-80-prompts.mjs', 'dist_soundtrack/**', 'playwright-report/**', 'test-results/**', 'public/basis/**', 'trailer/**'],
  },
  js.configs.recommended,
  {
    files: ['*.js', 'src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-useless-assignment': 'error',
    },
  },
  {
    files: ['scripts/generate-world-expansion-80-prompts.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-useless-assignment': 'error',
    },
  },
  {
    // The web build's service worker (src/serviceWorkerRegistration.js).
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['electron/**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    // playwright.config.js runs under Node (reads process.env for CI).
    files: ['playwright.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // Playwright specs run in Node but their page.evaluate/addInitScript
    // callback bodies execute in the browser — both global sets apply in
    // the same file.
    files: ['tests/e2e/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
