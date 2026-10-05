import { isRoomDressingId } from '../src/roomDressingPersistence.js';

// Per-session authority for physical dressing only; the host supplies the seeded
// placement manifest, while the relay orders hits and retains HP for late mounts.
export function createDressingAuthority() {
    const rooms = new Map();
    return {
        clear: room => rooms.delete(room),
        handle(player, event, detail, send) {
            if (!['dressing-register', 'dressing-hit', 'dressing-state'].includes(event)) return false;
            if (!player?.roomCode || player.mode === 'pvp' || !detail || detail.version !== 1) return true;
            if (event === 'dressing-state') return true; // Only the relay emits state.
            let room = rooms.get(player.roomCode);
            if (!room) rooms.set(player.roomCode, room = { props: new Map(), peers: new Map(), sequence: new Map() });
            const publish = (id, record) => {
                for (const [peerId, known] of room.peers) if (known.has(id)) send(peerId, {
                    version: 1, id, hp: record.hp, revision: record.revision
                });
            };
            if (event === 'dressing-register') {
                if (!Array.isArray(detail.items) || detail.items.length > 128) return true;
                let known = room.peers.get(player.id);
                if (!known) room.peers.set(player.id, known = new Set());
                for (const item of detail.items) {
                    if (!isRoomDressingId(item?.id) || !item.id.includes(':dressing:v2:')
                        || !Number.isFinite(item.x) || !Number.isFinite(item.z)) continue;
                    if (known.size >= 8192 && !known.has(item.id)) continue;
                    known.add(item.id);
                    if (!room.props.has(item.id) && player.isHost && room.props.size < 8192) {
                        room.props.set(item.id, { x: item.x, z: item.z,
                            hp: Number.isInteger(item.hp) && item.hp >= 0 && item.hp <= 3 ? item.hp : 3, revision: 0 });
                    }
                    const record = room.props.get(item.id);
                    if (record) publish(item.id, record);
                }
                return true;
            }
            const record = room.props.get(detail.id);
            if (!record || !room.peers.get(player.id)?.has(detail.id)
                || !Number.isSafeInteger(detail.sequence) || detail.sequence <= (room.sequence.get(player.id) ?? 0)
                || !Number.isInteger(detail.damage) || detail.damage < 1 || detail.damage > 32
                || (Number.isFinite(player.x) && Number.isFinite(player.z) && Math.hypot(player.x - record.x, player.z - record.z) > 64)) return true;
            room.sequence.set(player.id, detail.sequence);
            record.hp = Math.max(0, record.hp - detail.damage);
            record.revision += 1;
            publish(detail.id, record);
            return true;
        }
    };
}
