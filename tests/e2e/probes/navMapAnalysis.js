// Scoring for the controller navigation map (controller-nav-map.spec.js).
// Pure functions over the recorded graph, so the summary can be rebuilt from
// nav-map.json without a browser:
//   node tests/e2e/probes/navMapAnalysis.js [docs/reports/controller-nav-map]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const OPPOSITE = Object.freeze({ up: 'down', down: 'up', left: 'right', right: 'left' });

// A control "shows focus" when at least this share of its box visibly changes
// on focus (see measureRings in the spec). A 2 px ring around a 120x40 button
// changes ~10%; a thin outline on a small toggle inside a wide row, ~1-2%.
export const WEAK_RING_FRACTION = 0.04;

/**
 * Classify one recorded move. The angle between the move and the pressed
 * direction decides: within 45 degrees is right; 45-110 is off-axis; beyond
 * that it went the other way -- a wrap when it crossed most of the stage
 * along that axis, otherwise backwards.
 */
export function flagEdge(e, stage) {
    if (e.rootChanged !== undefined) return ['changes-surface'];
    if (e.to === 'body') return ['focus-lost'];
    if (typeof e.to !== 'number') return ['escapes-surface'];
    if (e.to === e.from) return ['dead-end'];
    const flags = [];
    const a = e.fromRectAfter;
    const b = e.toRect;
    const dx = (b[0] + b[2] / 2) - (a[0] + a[2] / 2);
    const dy = (b[1] + b[3] / 2) - (a[1] + a[3] / 2);
    const dist = Math.hypot(dx, dy) || 1;
    const along = { up: -dy, down: dy, left: -dx, right: dx }[e.dir];
    const cos = along / dist;
    const axisSpan = (e.dir === 'up' || e.dir === 'down') ? stage.height : stage.width;
    if (cos < -0.34) flags.push(-along > axisSpan * 0.4 ? 'wrap' : 'backwards');
    else if (cos < 0.707) flags.push('off-axis');
    if (dist > Math.max(stage.width, stage.height) * 0.5 && !flags.includes('wrap')) flags.push('long-jump');
    if (!e.toOnStage) flags.push('off-screen');
    if (e.sideEffect) flags.push('side-effect');
    return flags;
}

// Whether an aligned control lies fully past `from` in `dir` (same row for
// left / right, same column for up / down). A press that stays put with such
// a control waiting is a real dead end; with none, it is the screen's edge.
function hasAlignedControlAhead(from, dir, rects) {
    const vertical = dir === 'up' || dir === 'down';
    const [fx, fy, fw, fh] = from;
    return rects.some((r) => {
        if (!r || r === from || r[2] < 1 || r[3] < 1) return false;
        const [x, y, w, h] = r;
        const overlap = vertical ? Math.min(fx + fw, x + w) - Math.max(fx, x) : Math.min(fy + fh, y + h) - Math.max(fy, y);
        if (overlap <= 0) return false;
        if (dir === 'down') return y >= fy + fh;
        if (dir === 'up') return y + h <= fy;
        if (dir === 'right') return x >= fx + fw;
        return x + w <= fx;
    });
}

export function analyse(name, data, stage) {
    const rects = data.items.map((it) => it.rect);
    const edges = data.edges.map((e) => {
        const flags = flagEdge(e, stage);
        const dead = flags.indexOf('dead-end');
        if (dead >= 0 && !hasAlignedControlAhead(e.fromRectAfter ?? rects[e.from], e.dir, rects.filter((_, i) => i !== e.from))) {
            flags[dead] = 'edge-stop';
        }
        return { ...e, flags };
    });
    const byKey = new Map(edges.map((e) => [`${e.from}:${e.dir}`, e]));
    for (const e of edges) {
        if (typeof e.to !== 'number' || e.to === e.from || e.flags.includes('wrap')) continue;
        const back = byKey.get(`${e.to}:${OPPOSITE[e.dir]}`);
        if (back && back.to !== e.from) e.flags.push('not-reciprocal');
    }
    const entryIndex = data.items.findIndex((it) => it.label === data.entry);
    const reach = new Map();
    if (entryIndex >= 0) {
        reach.set(entryIndex, 0);
        const queue = [entryIndex];
        while (queue.length) {
            const at = queue.shift();
            for (const e of edges) {
                if (e.from === at && typeof e.to === 'number' && !reach.has(e.to)) {
                    reach.set(e.to, reach.get(at) + 1);
                    queue.push(e.to);
                }
            }
        }
    }
    const count = (flag) => edges.filter((e) => e.flags.includes(flag)).length;
    const measured = data.items.filter((it) => typeof it.ringFraction === 'number');
    const summary = {
        name,
        root: data.root,
        entry: data.entry,
        focusables: data.items.length,
        moves: edges.length,
        backwards: count('backwards'),
        offAxis: count('off-axis'),
        wrap: count('wrap'),
        longJump: count('long-jump'),
        deadEnd: count('dead-end'),
        edgeStops: count('edge-stop'),
        notReciprocal: count('not-reciprocal'),
        offScreen: count('off-screen'),
        escapes: count('escapes-surface') + count('focus-lost'),
        sideEffects: count('side-effect'),
        surfaceChanges: count('changes-surface'),
        weakRing: measured.filter((it) => it.ringFraction < WEAK_RING_FRACTION).length,
        ringMeasured: measured.length,
        noFocusVisible: data.items.filter((it) => it.focusVisible === false).length,
        unreachableFromEntry: entryIndex >= 0 ? data.items.length - reach.size : null,
        maxPressesFromEntry: reach.size ? Math.max(...reach.values()) : null,
        locked: data.locked.length
    };
    return { summary, edges, reach: Object.fromEntries(reach) };
}

export function badness(s) {
    return s.backwards * 3 + s.offAxis * 2 + s.longJump + s.deadEnd + s.notReciprocal
        + s.escapes * 3 + s.weakRing * 2 + (s.unreachableFromEntry ?? 0) * 2;
}

export function renderSummary({ view, generated, surfaces, transitions }) {
    const rows = surfaces.filter((r) => r.summary).map((r) => r.summary);
    const lines = [
        '# Controller navigation map — generated summary',
        '',
        `Captured ${generated} at ${view.width}×${view.height} by \`tests/e2e/probes/controller-nav-map.spec.js\`.`,
        'Reading guide and per-screen findings: `docs/design/controller-navigation-map.md`.',
        '',
        'Move columns count D-pad presses (4 per focusable control):',
        '- **Backwards**: focus went the opposite way. **Off-axis**: 45–110° away from the pressed direction',
        '  (e.g. ▶ stepping down a list). **Wrap**: jumped to the far edge. **Jump**: more than half the stage.',
        '- **Dead**: the press did nothing although an aligned control lay that way (a stop at the',
        '  screen\'s edge is correct and not counted). **Non-recip**: the opposite press does not come back.',
        '- **Escapes**: focus left the surface or was lost.',
        `- **Weak focus**: controls where less than ${WEAK_RING_FRACTION * 100}% of the box visibly changes on focus.`,
        '- **Unreach**: controls the entry target cannot reach by D-pad at all.',
        '',
        '| Surface | Entry focus | Ctrl | Back | Off-axis | Wrap | Jump | Dead | Non-recip | Escapes | Weak focus | Unreach | Max presses | Locked |',
        '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
    ];
    for (const s of [...rows].sort((a, b) => badness(b) - badness(a))) {
        lines.push(`| ${s.name} | ${String(s.entry).replace(/\|/g, '/').slice(0, 44)} | ${s.focusables} | ${s.backwards} | ${s.offAxis} | ${s.wrap} | ${s.longJump} | ${s.deadEnd} | ${s.notReciprocal} | ${s.escapes} | ${s.weakRing}/${s.ringMeasured} | ${s.unreachableFromEntry ?? '–'} | ${s.maxPressesFromEntry ?? '–'} | ${s.locked} |`);
    }
    lines.push('', '## Open / back / tab transitions', '', '| Surface | Button | Detail |', '|---|---|---|');
    for (const t of transitions) {
        let detail;
        if (t.button === 'A') {
            detail = t.skipped
                ? `skipped: ${t.skipped}`
                : `${t.opener}: ${t.from} → ${t.to}${t.opened ? '' : ' (**did not open**)'}; entry focus ${t.entry}`;
        } else if (t.button === 'B') {
            detail = `${t.from} → ${t.to ?? 'gameplay'}${t.closed ? '' : ' (**did not close**)'}; focus ${t.focusAfter}${t.focusRestoredToOpener === false ? ' (**not the opener**)' : ''}`;
        } else {
            detail = `${t.from} → ${t.to}${t.changed ? '' : ' (**no change**)'}; focus ${t.focusAfter}`;
        }
        lines.push(`| ${t.surface} | ${t.button} | ${detail.replace(/\|/g, '/')} |`);
    }
    const skipped = surfaces.filter((r) => r.skipped);
    if (skipped.length) lines.push('', '## Skipped', '', ...skipped.map((r) => `- ${r.name}: ${r.skipped}`));
    return `${lines.join('\n')}\n`;
}

// CLI: re-score an existing capture and rewrite its summary.md.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const dir = process.argv[2] || 'docs/reports/controller-nav-map';
    const report = JSON.parse(fs.readFileSync(path.join(dir, 'nav-map.json'), 'utf8'));
    for (const surface of report.surfaces) {
        if (!surface.items) continue;
        const { summary, edges, reach } = analyse(surface.name, surface, report.view);
        Object.assign(surface, { summary, edges, reach });
    }
    fs.writeFileSync(path.join(dir, 'nav-map.json'), `${JSON.stringify(report, null, 1)}\n`);
    fs.writeFileSync(path.join(dir, 'summary.md'), renderSummary(report));
    console.log(`re-scored ${report.surfaces.length} surfaces -> ${dir}/summary.md`);
}
