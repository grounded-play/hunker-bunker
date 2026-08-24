import { describe, expect, it, vi } from 'vitest';
import { createPresentationTelemetry, PRESENTATION_EVENTS } from './presentationTelemetry.js';

function fakeLogger() {
    return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('createPresentationTelemetry', () => {
    it('routes a known event to the logger under its own category', () => {
        const logger = fakeLogger();
        const telemetry = createPresentationTelemetry({ logger });

        telemetry.emit('RETICLE', PRESENTATION_EVENTS.RETICLE.STATE, { state: 'hostile' });

        expect(logger.info).toHaveBeenCalledTimes(1);
        const [category, message, detail] = logger.info.mock.calls[0];
        expect(category).toBe('RETICLE');
        expect(message).toContain('state');
        expect(detail).toEqual({ state: 'hostile' });
    });

    it('refuses an event name that is not in the contract', () => {
        const logger = fakeLogger();
        const telemetry = createPresentationTelemetry({ logger });

        expect(() => telemetry.emit('RETICLE', 'invented-event')).toThrow(/invented-event/);
        expect(logger.info).not.toHaveBeenCalled();
    });

    it('refuses a category that is not in the contract', () => {
        const logger = fakeLogger();
        const telemetry = createPresentationTelemetry({ logger });

        expect(() => telemetry.emit('NOPE', 'state')).toThrow(/NOPE/);
        expect(logger.info).not.toHaveBeenCalled();
    });

    it('emitOnce suppresses a repeat of the same event for the same action', () => {
        const logger = fakeLogger();
        const telemetry = createPresentationTelemetry({ logger });
        const E = PRESENTATION_EVENTS.REWARD;

        telemetry.emitOnce('REWARD', E.GRANT_CONFIRMED, { tier: 3 }, 'reward:3:free');
        telemetry.emitOnce('REWARD', E.GRANT_CONFIRMED, { tier: 3 }, 'reward:3:free');

        expect(logger.info).toHaveBeenCalledTimes(1);
    });

    it('emitOnce still emits the same event for a different action', () => {
        const logger = fakeLogger();
        const telemetry = createPresentationTelemetry({ logger });
        const E = PRESENTATION_EVENTS.REWARD;

        telemetry.emitOnce('REWARD', E.GRANT_CONFIRMED, { tier: 3 }, 'reward:3:free');
        telemetry.emitOnce('REWARD', E.GRANT_CONFIRMED, { tier: 4 }, 'reward:4:free');

        expect(logger.info).toHaveBeenCalledTimes(2);
    });

    it('clearAction lets a genuinely new attempt emit again', () => {
        const logger = fakeLogger();
        const telemetry = createPresentationTelemetry({ logger });
        const E = PRESENTATION_EVENTS.XP;

        telemetry.emitOnce('XP', E.SOUND, {}, 'xp-burst-1');
        telemetry.clearAction('xp-burst-1');
        telemetry.emitOnce('XP', E.SOUND, {}, 'xp-burst-1');

        expect(logger.info).toHaveBeenCalledTimes(2);
    });

    it('accepts audio load and playback diagnostics through the shared contract', () => {
        const logger = fakeLogger();
        const telemetry = createPresentationTelemetry({ logger });

        telemetry.emit('AUDIO', PRESENTATION_EVENTS.AUDIO.LOAD_FAILED, { key: 'missing-track' });
        telemetry.emit('AUDIO', PRESENTATION_EVENTS.AUDIO.PLAY_MISSING, { key: 'missing-track' });

        expect(logger.info).toHaveBeenCalledTimes(2);
    });

    it('defaults to info level', () => {
        const logger = fakeLogger();
        createPresentationTelemetry({ logger }).emit('WEAPON', 'shot-blocked', {});

        expect(logger.info).toHaveBeenCalledTimes(1);
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it('honours an explicit level so severity survives the contract', () => {
        const logger = fakeLogger();
        createPresentationTelemetry({ logger }).emit('WEAPON', 'shot-blocked', { reason: 'out_of_ammo' }, { level: 'warn' });

        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.info).not.toHaveBeenCalled();
    });

    it('falls back to info for a level the logger does not have', () => {
        const logger = fakeLogger();
        createPresentationTelemetry({ logger }).emit('WEAPON', 'shot-blocked', {}, { level: 'nonsense' });

        expect(logger.info).toHaveBeenCalledTimes(1);
    });
});
