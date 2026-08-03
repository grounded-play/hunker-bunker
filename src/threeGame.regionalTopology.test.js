import { describe, expect, it } from 'vitest';
import { generateRegionalRouteTopology, topologyHasChunk, topologyHasEdge } from './mazeExpedition.js';
import { ThreeGame } from './threeGame.js';

function fakeGame(topology) {
    return {
        chunkSize: 19,
        chunkCellCount: 9,
        getRegionalRouteTopology: () => topology,
        getEdgeOpening: ThreeGame.prototype.getEdgeOpening,
        hashTile: ThreeGame.prototype.hashTile
    };
}

function edgeCoordinates(aKey, bKey) {
    const [ax, ay] = aKey.split(',').map(Number);
    const [bx, by] = bKey.split(',').map(Number);
    if (ax === bx) {
        return { axis: 'horizontal', edgeX: ax, edgeY: Math.max(ay, by) };
    }
    return { axis: 'vertical', edgeX: Math.max(ax, bx), edgeY: ay };
}

describe('ThreeGame regional topology projection', () => {
    it('opens every authored regional edge as a matching streamed chunk portal', () => {
        const topology = generateRegionalRouteTopology(9182, { phase: 1.2 });
        const game = fakeGame(topology);
        for (const edge of topology.routeEdges) {
            const [a, b] = edge.split('|');
            const { axis, edgeX, edgeY } = edgeCoordinates(a, b);
            expect(
                ThreeGame.prototype.getEdgeOpening.call(game, axis, edgeX, edgeY).open,
                edge
            ).toBe(true);
        }
    });

    it('does not punch a fallback portal into a sealed canyon chunk', () => {
        const topology = generateRegionalRouteTopology(1776, { phase: 0.8 });
        let sealed = null;
        for (let y = -topology.boundsRadius; y <= topology.boundsRadius && !sealed; y += 1) {
            for (let x = -topology.boundsRadius; x <= topology.boundsRadius; x += 1) {
                if (
                    Math.max(Math.abs(x), Math.abs(y)) < topology.boundsRadius
                    && !topologyHasChunk(topology, x, y)
                ) {
                    sealed = { x, y };
                    break;
                }
            }
        }
        expect(sealed).not.toBeNull();
        const game = fakeGame(topology);
        const grid = Array.from({ length: 19 }, () => Array(19).fill('#'));
        ThreeGame.prototype.ensureChunkPortals.call(game, grid, sealed.x, sealed.y);
        const border = [
            ...grid[0],
            ...grid[18],
            ...grid.map((row) => row[0]),
            ...grid.map((row) => row[18])
        ];
        expect(border.every((tile) => tile === '#')).toBe(true);
    });

    it('keeps non-route neighboring chunks disconnected inside expedition bounds', () => {
        const topology = generateRegionalRouteTopology(7331, { phase: 2.1 });
        let boundary = null;
        for (const chunk of topology.routeChunks) {
            const neighbor = [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1]
            ].map(([dx, dy]) => {
                const nx = chunk.chunkX + dx;
                const ny = chunk.chunkY + dy;
                return { nx, ny, dx, dy };
            }).find(({ nx, ny }) => (
                Math.max(Math.abs(nx), Math.abs(ny)) <= topology.boundsRadius
                    && !topologyHasChunk(topology, nx, ny)
                    && !topologyHasEdge(topology, chunk.chunkX, chunk.chunkY, nx, ny)
            ));
            if (neighbor) {
                boundary = { chunk, neighbor };
                break;
            }
        }
        expect(boundary).toBeTruthy();
        const a = `${boundary.chunk.chunkX},${boundary.chunk.chunkY}`;
        const b = `${boundary.neighbor.nx},${boundary.neighbor.ny}`;
        const { axis, edgeX, edgeY } = edgeCoordinates(a, b);
        expect(ThreeGame.prototype.getEdgeOpening.call(
            fakeGame(topology),
            axis,
            edgeX,
            edgeY
        ).open).toBe(false);
    });
});
