// Thick module edges are interior even when only one neighboring cell is floor.
export function grammarWallExterior(metadata, x, y) {
    if (metadata?.generatorId !== 'grammar-room') return null;
    for (const room of metadata.roomInstances ?? metadata.rooms ?? []) {
        if (room.grammar?.modules?.some(m => x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h)) return false;
        const b = room.bounds;
        if (b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom
            && (x === b.left || x === b.right || y === b.top || y === b.bottom)) return true;
    }
    return null;
}
