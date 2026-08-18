import { describe, expect, it } from 'vitest';
import { getDebugZone, listDebugZones, registerDebugZone } from './debugZoneRegistry.js';

describe('debugZoneRegistry', () => {
    it('loads all pre-registered zones from this session without throwing', () => {
        // The module-level registrations at import time already ran; if any two overlapped,
        // importing this file would have thrown. Just assert they're all present.
        const names = listDebugZones().map((z) => z.name);
        expect(names).toEqual(expect.arrayContaining([
            'debugShowroom', 'debugMuseum', 'wing5-progression', 'wing2-roomgrid', 'qa-nexus'
        ]));
    });

    it('throws when a new zone overlaps an existing one', () => {
        expect(() => registerDebugZone('collider-test', { originX: 9660, originZ: 9660, width: 10, depth: 10 }))
            .toThrow(/overlaps already-registered zone "debugShowroom"/);
    });

    it('does not throw for a genuinely clear zone', () => {
        expect(() => registerDebugZone('clear-test-zone', { originX: -5000, originZ: -5000, width: 10, depth: 10 })).not.toThrow();
        expect(getDebugZone('clear-test-zone')).toMatchObject({ originX: -5000, originZ: -5000 });
    });

    it('re-registering the same zone name is idempotent, not a self-collision', () => {
        expect(() => registerDebugZone('debugShowroom', getDebugZone('debugShowroom'))).not.toThrow();
    });
});
