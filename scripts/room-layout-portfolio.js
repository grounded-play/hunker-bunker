// Read-only, reproducible structural baseline. This exercises the live pure
// producer, not rendering or complete expedition placement. Prints JSON only.
import { buildMazeChunkStructure } from '../src/chunkStructure.js';
import { measureRoomLayout } from '../src/roomLayoutMetrics.js';
import { planInterior } from '../src/roomGrammar.js';

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
const legacy = {
    scope: 'legacy architectural room-mode, seeds 1–16, all 15 nonempty entrance masks, fixed offset 12',
    samples: samples.length,
    distinctRoomGeometries: new Set(samples.map(s => s.signature)).size,
    floorArea: range('floorArea'), width: range('width'), height: range('height'),
    limitations: 'Not a world-frequency, route-length, render-cost or hardware measurement.'
};
const pilot = [];
const motifs = {};
let fallbacks = 0;
const seedCount = process.argv.includes('--sweep') ? 5000 : 240;
for (let seed = 0; seed < seedCount; seed += 1) {
    const sockets = ['n', 'e', 's', 'w'].filter((_, i) => (1 + seed % 15) & (1 << i))
        .map(side => ({ side, offset: 7, width: 3 }));
    const room = planInterior({ seed, tier: seed % 2 ? 'major' : 'standard', sockets });
    pilot.push(room.metrics);
    motifs[room.diagnostics.motif] = (motifs[room.diagnostics.motif] ?? 0) + 1;
    if (room.diagnostics.fallback) fallbacks += 1;
}
console.log(JSON.stringify({ legacy, pilot: {
    scope: 'alternating standard/major tiers, masks cycling 1–15, offset 7; not distribution-matched to legacy',
    samples: seedCount, motifs, fallbacks,
    distinctRoomGeometries: new Set(pilot.map(p => p.signature)).size,
    floorArea: { min: Math.min(...pilot.map(p => p.floorArea)), max: Math.max(...pilot.map(p => p.floorArea)) },
    limitations: 'Pure motif planner only; no runtime, art or full-world acceptance.'
} }, null, 2));
