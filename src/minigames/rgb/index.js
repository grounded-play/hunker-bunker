// Public entry point for RGB: Riverside Global 'Botics. main.js imports
// from here rather than reaching into individual rgb/* modules directly.
export { mountRgb } from './runtime.js';
export {
    RGB_SAVE_KEY,
    loadRgbSave,
    saveRgbSave,
    markUnlocked,
    saveCheckpoint,
    recordEnding,
    recordGameOver,
    shouldUnlockRgb
} from './save.js';
