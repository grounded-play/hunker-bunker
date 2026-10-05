// Pilot envelopes are local room bounds including the outer wall. They do not
// alter CHUNK_SIZE. Motif rectangles are normalized into the available interior.
export const INDUSTRIAL_ROOM_PROFILE = Object.freeze({
    id: 'industrial',
    tiers: Object.freeze({
        standard: Object.freeze([[19, 15], [21, 17], [23, 19]].map(Object.freeze)),
        major: Object.freeze([[27, 19], [29, 23], [31, 25]].map(Object.freeze))
    }),
    motifs: Object.freeze([
        Object.freeze({ id: 'machine-island', blocks: Object.freeze([
            Object.freeze({ role: 'exchanger', x: 0.35, y: 0.3, w: 0.3, h: 0.4 })
        ]) }),
        Object.freeze({ id: 'paired-work-bays', blocks: Object.freeze([
            Object.freeze({ role: 'repair-bay', x: 0.28, y: 0.25, w: 0.16, h: 0.45 }),
            Object.freeze({ role: 'supply-bay', x: 0.64, y: 0.35, w: 0.13, h: 0.3 })
        ]) }),
        Object.freeze({ id: 'offset-service-spine', blocks: Object.freeze([
            Object.freeze({ role: 'service-spine', x: 0.25, y: 0.35, w: 0.5, h: 0.14 }),
            Object.freeze({ role: 'tool-store', x: 0.6, y: 0.64, w: 0.15, h: 0.14 })
        ]) })
    ])
});
