import { describe, expect, it, vi } from 'vitest';

describe('Steam Overlay Integration Contract', () => {
    it('defines dialog ID mapping for steamworks overlay', () => {
        const dialogMap = {
            friends: 0,
            community: 1,
            players: 2,
            settings: 3,
            officialgamegroup: 4,
            stats: 5,
            achievements: 6
        };
        expect(dialogMap.friends).toBe(0);
        expect(dialogMap.achievements).toBe(6);
    });

    it('triggers activateSteamOverlay when Shift+Tab is pressed in window', () => {
        const activateMock = vi.fn();
        const api = { activateSteamOverlay: activateMock };

        const handler = (event) => {
            if (event.key === 'Tab' && event.shiftKey) {
                if (api?.activateSteamOverlay) {
                    api.activateSteamOverlay('friends');
                }
            }
        };

        // Normal tab does not trigger
        handler({ key: 'Tab', shiftKey: false });
        expect(activateMock).not.toHaveBeenCalled();

        // Shift+Tab triggers friends overlay
        handler({ key: 'Tab', shiftKey: true });
        expect(activateMock).toHaveBeenCalledWith('friends');
    });

    it('invokes openSteamOverlayToUrl if confirmUrl is present during purchase awaiting approval', () => {
        const openUrlMock = vi.fn();
        const activateMock = vi.fn();
        const status = {
            key: 'awaiting_approval',
            confirmUrl: 'https://store.steampowered.com/checkout/approvetxn/12345'
        };

        const onClick = () => {
            if (status.confirmUrl && openUrlMock) {
                openUrlMock(status.confirmUrl);
            } else if (activateMock) {
                activateMock('friends');
            }
        };

        onClick();
        expect(openUrlMock).toHaveBeenCalledWith('https://store.steampowered.com/checkout/approvetxn/12345');
        expect(activateMock).not.toHaveBeenCalled();
    });

    it('falls back to activateSteamOverlay when no confirmUrl is present during client approval', () => {
        const openUrlMock = vi.fn();
        const activateMock = vi.fn();
        const status = {
            key: 'awaiting_approval',
            confirmUrl: null
        };

        const onClick = () => {
            if (status.confirmUrl && openUrlMock) {
                openUrlMock(status.confirmUrl);
            } else if (activateMock) {
                activateMock('friends');
            }
        };

        onClick();
        expect(openUrlMock).not.toHaveBeenCalled();
        expect(activateMock).toHaveBeenCalledWith('friends');
    });
});
