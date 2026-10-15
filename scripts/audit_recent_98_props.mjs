import fs from 'node:fs';
import {
    RECENT_WORLD_PROP_IDS,
    RECENT_PROP_FX_EXCEPTIONS,
    RECENT_PROP_INTERACTION_EXCEPTIONS
} from '../src/data/recentWorldProps.js';
import { PROP_FX_PROFILES } from '../src/propFx.js';
import { PROP_INTERACTION_SPECS } from '../src/propInteractions.js';
import { getPropSockets } from '../src/data/propSockets.js';
import { DRESSING_TRIANGLES } from '../src/data/dressingTriangles.js';
import { WORLD_3D_MODELS } from '../src/world3dOverlay.js';

let md = '# 98-Prop World-Story Audit Artifact (2026-10-12)\n\n';
md += 'Comprehensive audit of the 98 recent world-story GLB models covering FX profiles, interaction specs, triangle counts, sockets, and classifications.\n\n';
md += '| # | Prop ID | FX Profile / Exception | Interaction / Exception | Triangles | Sockets | Model Path |\n';
md += '|---|---|---|---|---:|---:|---|\n';

RECENT_WORLD_PROP_IDS.forEach((id, idx) => {
    const fx = PROP_FX_PROFILES[id] ? 'Active FX Profile' : ('Exception: ' + (RECENT_PROP_FX_EXCEPTIONS[id] || 'none'));
    const interact = PROP_INTERACTION_SPECS[id] ? 'Active Interaction' : ('Exception: ' + (RECENT_PROP_INTERACTION_EXCEPTIONS[id] || 'none'));
    const tris = DRESSING_TRIANGLES[id] ?? 'N/A';
    const sockets = getPropSockets(id)?.length ?? 0;
    const url = WORLD_3D_MODELS[id]?.url ?? (`/3d/runtime/new3ds/${id}.glb`);
    md += `| ${idx + 1} | \`${id}\` | ${fx} | ${interact} | ${tris} | ${sockets} | \`${url}\` |\n`;
});

fs.mkdirSync('docs/audit', { recursive: true });
fs.writeFileSync('docs/audit/recent-98-prop-audit-2026-10-12.md', md);
console.log(`Successfully wrote docs/audit/recent-98-prop-audit-2026-10-12.md with ${RECENT_WORLD_PROP_IDS.length} props.`);
