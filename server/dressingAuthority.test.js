import { describe, expect, it } from 'vitest';
import { createDressingAuthority } from './dressingAuthority.js';
import { roomDressingIdentity } from '../src/roomDressingIdentity.js';

describe('relay dressing HP authority', () => {
    it('orders guest/host hits, rejects replay and publishes partial HP to late registrants', () => {
        const authority = createDressingAuthority(), sent = [];
        const send = (peer, state) => sent.push({ peer, ...state });
        const id = roomDressingIdentity('room', { type: 'prop_cart', layer: 'clutter', x: 9, y: 9 });
        const host = { id: 'host', roomCode: 'A', isHost: true, x: 9, z: 9 };
        const guest = { ...host, id: 'guest', isHost: false };
        const registration = { version: 1, items: [{ id, x: 9, z: 9, hp: 3 }] };
        authority.handle(guest, 'dressing-register', registration, send);
        expect(sent).toHaveLength(0);
        authority.handle(host, 'dressing-register', registration, send);
        authority.handle(guest, 'dressing-hit', { version: 1, id, damage: 1, sequence: 1 }, send);
        expect(sent.at(-1)).toMatchObject({ hp: 2, revision: 1 });
        const length = sent.length;
        authority.handle(guest, 'dressing-hit', { version: 1, id, damage: 1, sequence: 1 }, send);
        expect(sent).toHaveLength(length);
        authority.handle({ ...guest, id: 'late' }, 'dressing-register', registration, send);
        expect(sent.at(-1)).toMatchObject({ peer: 'late', hp: 2 });
        authority.handle(host, 'dressing-hit', { version: 1, id, damage: 2, sequence: 1 }, send);
        expect(sent.at(-1).hp).toBe(0);
        authority.handle(host, 'dressing-register', registration, send);
        expect(sent.at(-1).hp).toBe(0);
        authority.clear('A');
        authority.handle(host, 'dressing-register', registration, send);
        expect(sent.at(-1).hp).toBe(3);
    });

    it('processes dressing registration and hits during PvP mode with parity', () => {
        const authority = createDressingAuthority(), sent = [];
        const send = (peer, state) => sent.push({ peer, ...state });
        const id = roomDressingIdentity('room_pvp', { type: 'prop_crate', layer: 'clutter', x: 5, y: 5 });
        const p1 = { id: 'p1', roomCode: 'PVP_SECTOR', mode: 'pvp', isHost: true, x: 5, z: 5 };
        const p2 = { id: 'p2', roomCode: 'PVP_SECTOR', mode: 'pvp', isHost: false, x: 5, z: 5 };
        const registration = { version: 1, items: [{ id, x: 5, z: 5, hp: 3 }] };

        authority.handle(p1, 'dressing-register', registration, send);
        authority.handle(p2, 'dressing-register', registration, send);
        authority.handle(p2, 'dressing-hit', { version: 1, id, damage: 1, sequence: 1 }, send);

        expect(sent.at(-1)).toMatchObject({ hp: 2, revision: 1 });
    });

    it('tracks and replicates dressing-transform updates when items are moved', () => {
        const authority = createDressingAuthority(), sent = [];
        const send = (peer, state) => sent.push({ peer, ...state });
        const id = roomDressingIdentity('room_move', { type: 'prop_cart', layer: 'clutter', x: 2, y: 3 });
        const host = { id: 'h', roomCode: 'ROOM_MOVE', isHost: true, x: 2, z: 3 };
        const guest = { id: 'g', roomCode: 'ROOM_MOVE', isHost: false, x: 2, z: 3 };
        const registration = { version: 1, items: [{ id, x: 2, z: 3, hp: 3 }] };

        authority.handle(host, 'dressing-register', registration, send);
        authority.handle(guest, 'dressing-register', registration, send);

        // Guest moves the prop to x: 7, z: 8
        authority.handle(guest, 'dressing-transform', { version: 1, id, x: 7, z: 8, rotY: 1.57, sequence: 1 }, send);
        expect(sent.at(-1)).toMatchObject({ id, x: 7, z: 8, rotY: 1.57, revision: 1 });

        // Late registrant receives the updated position
        authority.handle({ id: 'late', roomCode: 'ROOM_MOVE', isHost: false, x: 0, z: 0 }, 'dressing-register', registration, send);
        expect(sent.at(-1)).toMatchObject({ peer: 'late', id, x: 7, z: 8, rotY: 1.57 });
    });
});
