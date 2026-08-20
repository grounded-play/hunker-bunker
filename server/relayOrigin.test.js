import { describe, expect, it } from 'vitest';
import { isAllowedRelayOrigin } from './relay.js';

// docs/steamstorestatus.log Part A CORS fix: a packaged Electron renderer's
// Socket.IO handshake Origin is 'file://...' or absent -- neither is ever a
// real https:// web origin, so a strict HB_ALLOWED_ORIGINS allowlist
// (server/backendEnvAudit.js requires https-only, no wildcard, no
// localhost) would lock out every legitimate packaged-game connection
// alongside the browser tabs it's meant to restrict. isAllowedRelayOrigin
// is the pure predicate behind attachRelay's cors.origin function.
describe('isAllowedRelayOrigin', () => {
    it('allows everything when no allowlist is configured (dev/local)', () => {
        expect(isAllowedRelayOrigin('https://evil.example', [])).toBe(true);
        expect(isAllowedRelayOrigin(undefined, [])).toBe(true);
    });

    it('allows an origin present in the configured allowlist', () => {
        const allowed = ['https://hunkerbunker.netlify.app'];
        expect(isAllowedRelayOrigin('https://hunkerbunker.netlify.app', allowed)).toBe(true);
    });

    it('rejects a web origin not present in the configured allowlist', () => {
        const allowed = ['https://hunkerbunker.netlify.app'];
        expect(isAllowedRelayOrigin('https://evil.example', allowed)).toBe(false);
    });

    it('allows a missing Origin header (packaged Electron often sends none) even with an allowlist configured', () => {
        const allowed = ['https://hunkerbunker.netlify.app'];
        expect(isAllowedRelayOrigin(undefined, allowed)).toBe(true);
        expect(isAllowedRelayOrigin(null, allowed)).toBe(true);
    });

    it('allows the literal string "null" Origin (some contexts send this instead of omitting it)', () => {
        const allowed = ['https://hunkerbunker.netlify.app'];
        expect(isAllowedRelayOrigin('null', allowed)).toBe(true);
    });

    it('allows a file:// origin (packaged Electron) even with an allowlist configured', () => {
        const allowed = ['https://hunkerbunker.netlify.app'];
        expect(isAllowedRelayOrigin('file:///opt/HunkerBunker/index.html', allowed)).toBe(true);
    });

    it('still rejects a spoofed-looking origin that merely contains "file://" without starting with it', () => {
        const allowed = ['https://hunkerbunker.netlify.app'];
        expect(isAllowedRelayOrigin('https://evil.example/file://', allowed)).toBe(false);
    });
});
