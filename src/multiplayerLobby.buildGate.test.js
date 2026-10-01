import { describe, expect, it } from 'vitest';
import { describeJoinRejection, getLocalBuildVersion } from './multiplayerLobby.js';

// QA 2026-09-30: the relay now refuses a guest whose build differs from the
// host's. The player has to be told which builds, or they cannot fix it.
describe('lobby build gate', () => {
    it('names both builds when the relay rejects a build mismatch', () => {
        const message = describeJoinRejection({
            reason: 'build_mismatch', hostBuild: '2.4.13-beta', clientBuild: '2.4.9-beta'
        });
        expect(message).toContain('2.4.13-beta');
        expect(message).toContain('2.4.9-beta');
    });

    it('keeps the password message for a wrong password', () => {
        expect(describeJoinRejection({ reason: 'incorrect_password' })).toBe('INCORRECT LOBBY PASSWORD');
    });

    it('reads the local build from the injected build info', () => {
        expect(getLocalBuildVersion({ version: '2.4.14-beta' })).toBe('2.4.14-beta');
        expect(getLocalBuildVersion(null)).toBeNull();
    });
});
