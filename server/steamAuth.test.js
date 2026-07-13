import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSteamAuthConfig, verifySteamSessionTicket } from './steamAuth.js';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

function restoreEnv() {
    for (const key of Object.keys(process.env)) {
        delete process.env[key];
    }
    Object.assign(process.env, ORIGINAL_ENV);
}

afterEach(() => {
    restoreEnv();
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
});

describe('steam auth backend helpers', () => {
    it('reports auth as disabled until a publisher key is configured', () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_WEB_API_KEY;

        expect(getSteamAuthConfig()).toMatchObject({
            appId: 1247290,
            configured: false,
            defaultIdentity: 'hunker-bunker-backend'
        });
    });

    it('rejects malformed tickets before requiring Steam configuration', async () => {
        const result = await verifySteamSessionTicket({ ticketHex: 'bad' });

        expect(result).toMatchObject({
            ok: false,
            status: 400,
            reason: 'invalid_ticket'
        });
    });

    it('reports disabled auth for valid-looking tickets when no publisher key exists', async () => {
        delete process.env.HB_STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_PUBLISHER_KEY;
        delete process.env.STEAM_WEB_API_KEY;

        const result = await verifySteamSessionTicket({
            ticketHex: '00112233445566778899aabbccddeeff'
        });

        expect(result).toMatchObject({
            ok: false,
            status: 503,
            reason: 'steam_auth_not_configured'
        });
    });

    it('normalizes a successful Steam ticket verification response', async () => {
        process.env.HB_STEAM_PUBLISHER_KEY = 'publisher-key';
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                response: {
                    params: {
                        result: 'OK',
                        steamid: '76561198000000000',
                        ownersteamid: '76561198000000000',
                        vacbanned: false,
                        publisherbanned: false
                    }
                }
            })
        });

        const result = await verifySteamSessionTicket({
            ticketHex: '00112233445566778899aabbccddeeff',
            identity: 'custom-identity'
        });

        expect(result).toMatchObject({
            ok: true,
            status: 200,
            appId: 1247290,
            identity: 'custom-identity',
            steamId64: '76561198000000000',
            ownerSteamId64: '76561198000000000',
            vacBanned: false,
            publisherBanned: false
        });
        expect(globalThis.fetch).toHaveBeenCalledOnce();
    });
});
