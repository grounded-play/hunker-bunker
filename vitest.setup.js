// src/i18n.js bundles English and loads the other six languages on demand.
// Tests switch languages synchronously (setLocale('ja'); t(...)), so every
// dictionary is loaded once before any test file runs.
import { loadAllLocales } from './src/i18n.js';

await loadAllLocales();
