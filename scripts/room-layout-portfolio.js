// Read-only, reproducible structural baseline. This exercises the live pure
// producer, not rendering or complete expedition placement. Prints JSON only.
import { buildMazeChunkStructure } from '../src/chunkStructure.js';
import { measureRoomLayout } from '../src/roomLayoutMetrics.js';

function randomFor(seed) {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

const sides = ['north', 'east', 'south', 'west'];
const samples = [];
for (let seed = 1; seed <= 16; seed += 1) {
    for (let mask = 1; mask <= 15; mask += 1) {
        const openings = Object.fromEntries(sides.map((side, i) => [side, { open: Boolean(mask & (1 << i)), offset: 12 }]));
        const result = buildMazeChunkStructure(randomFor(seed), { roomMode: true, openings });
        const bounds = result.rooms[0].bounds;
        samples.push(measureRoomLayout(result.grid, bounds));
    }
}
const range = key => ({ min: Math.min(...samples.map(s => s[key])), max: Math.max(...samples.map(s => s[key])) });
console.log(JSON.stringify({
    scope: 'legacy architectural room-mode, seeds 1–16, all 15 nonempty entrance masks, fixed offset 12',
    samples: samples.length,
    distinctRoomGeometries: new Set(samples.map(s => s.signature)).size,
    floorArea: range('floorArea'), width: range('width'), height: range('height'),
    limitations: 'Not a world-frequency, route-length, render-cost or hardware measurement.'
}, null, 2));
