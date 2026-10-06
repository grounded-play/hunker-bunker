// Page entry (index.html). Loads the player's language before any game module
// evaluates, then starts the game modules in their original order. Without
// this step src/i18n.js would have to bundle all seven languages up front
// (issue #106), because several modules translate text as they load.
import { ensureLocaleReady } from './i18n.js';

await ensureLocaleReady();
await import('./hudInformationArchitecture.js');
await import('./hudGameplayState.js');
await import('./suitConditionController.js');
await import('../main.js');
