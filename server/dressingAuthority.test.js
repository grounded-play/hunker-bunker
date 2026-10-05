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
});
