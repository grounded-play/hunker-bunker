import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreeGame } from './threeGame.js';
import { COOP_TRANSITION_EVENTS } from './coopTransitions.js';

beforeEach(() => {
    vi.stubGlobal('window', {
        dispatchEvent: vi.fn(),
        addEventListener: vi.fn(),
        objectiveRegistry: {
            resolveObjective: vi.fn(),
            trackObjective: vi.fn()
        },
        AudioManager: { play: vi.fn() }
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function createMockGame({ isHost = false } = {}) {
    const emitted = [];
    const game = {
        isMultiplayer: true,
        isMultiplayerHost: isHost,
        multiplayerMode: 'coop',
        netSocket: {
            emit: (event, payload) => emitted.push({ event, payload })
        },
        player: { position: { x: 0, z: 0 } },
        isPlayerDead: false,
        performanceProfile: 'gameplay',
        loadingPaused: false,
        activeExpedition: {
            condition: { id: 'spore_bloom' },
            expeditionSeed: 42
        },
        scatterSprites: [],
        showBunkerLine: vi.fn()
    };

    for (const method of [
        'armExpeditionEvent',
        'disposeExpeditionEvent',
        'listenForExpeditionReportItems',
        'respondToExpeditionEvent',
        'applyExpeditionEventAction',
        'runExpeditionEventEffect',
        'syncExpeditionEventRoute',
        'getExpeditionEventSitePosition',
        'broadcastSharedWorldEvent',
        'handleSharedWorldEvent',
        'applyRemoteWorldEventResolved',
        'armArrivalIncident',
        'clearCrashSiteDebris'
    ]) {
        game[method] = ThreeGame.prototype[method];
    }

    return { game, emitted };
}

describe('Host-authoritative Ring 1 expedition events in co-op', () => {
    it('arms expedition event in co-op mode for both host and guest', () => {
        const { game: host } = createMockGame({ isHost: true });
        const { game: guest } = createMockGame({ isHost: false });

        expect(host.armExpeditionEvent()).not.toBeNull();
        expect(guest.armExpeditionEvent()).not.toBeNull();
    });

    it('guest delegates choice response to host via WORLD_EVENT_TRIGGER', () => {
        const { game: guest, emitted } = createMockGame({ isHost: false });
        guest.armExpeditionEvent();
        guest._expeditionEvent.plan = {
            eventId: 'false_distress',
            responses: ['scan', 'open', 'leave']
        };
        guest._expeditionEvent.state = { phase: 'signalled' };

        const handled = guest.respondToExpeditionEvent('scan');
        expect(handled).toBe(true);
        expect(emitted).toHaveLength(1);
        expect(emitted[0].event).toBe('worldEvent');
        expect(emitted[0].payload.event).toBe(COOP_TRANSITION_EVENTS.WORLD_EVENT_TRIGGER);
        expect(emitted[0].payload.detail).toEqual({
            action: 'scan',
            eventId: 'false_distress'
        });
    });

    it('host executes trigger and broadcasts WORLD_EVENT_RESOLVED to room', () => {
        const { game: host, emitted } = createMockGame({ isHost: true });
        host.armExpeditionEvent();
        host._expeditionEvent.plan = {
            eventId: 'false_distress',
            conditionId: 'spore_bloom',
            truth: 'contaminated',
            site: { chunkX: 1, chunkY: 1 },
            responses: ['scan', 'open', 'leave'],
            rewardDrop: 'relic_spore_filter'
        };
        host._expeditionEvent.state = { phase: 'signalled', scanned: false, outcome: null };

        host.handleSharedWorldEvent({
            event: COOP_TRANSITION_EVENTS.WORLD_EVENT_TRIGGER,
            detail: { action: 'scan', eventId: 'false_distress' }
        });

        const resolved = emitted.find((e) => e.payload?.event === COOP_TRANSITION_EVENTS.WORLD_EVENT_RESOLVED);
        expect(resolved).toBeTruthy();
        expect(resolved.payload.detail.eventId).toBe('false_distress');
        expect(resolved.payload.detail.action).toBe('scan');
        expect(resolved.payload.detail.scanned).toBe(true);
    });

    it('guest applies WORLD_EVENT_RESOLVED and synchronizes event state', () => {
        const { game: guest } = createMockGame({ isHost: false });
        guest.armExpeditionEvent();
        guest._expeditionEvent.plan = {
            eventId: 'false_distress',
            responses: ['scan', 'open', 'leave']
        };
        guest._expeditionEvent.state = { phase: 'signalled', scanned: false, outcome: null };

        guest.handleSharedWorldEvent({
            event: COOP_TRANSITION_EVENTS.WORLD_EVENT_RESOLVED,
            detail: {
                eventId: 'false_distress',
                action: 'open',
                phase: 'resolved',
                outcome: 'rescued',
                scanned: true,
                effects: [{ kind: 'announce', lineKey: 'ui.events.false_distress.rescued' }]
            }
        });

        expect(guest._expeditionEvent.state.phase).toBe('resolved');
        expect(guest._expeditionEvent.state.outcome).toBe('rescued');
        expect(guest._expeditionEvent.state.scanned).toBe(true);
        expect(guest.showBunkerLine).toHaveBeenCalled();
        expect(window.objectiveRegistry.resolveObjective).toHaveBeenCalledWith('expedition-event', 'complete');
    });

    it('arrival incident is armed for host and suppressed for guest', () => {
        const { game: host } = createMockGame({ isHost: true });
        const { game: guest } = createMockGame({ isHost: false });

        expect(host.armArrivalIncident()).not.toBeNull();
        expect(guest.armArrivalIncident()).toBeNull();
    });
});
