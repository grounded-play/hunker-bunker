#!/usr/bin/env node
// Calls ISteamMicroTxn/GetReport and reconciles it with this backend's
// purchases. Run inside the backend container, where the publisher key is:
//
//   docker exec hunker-bunker-backend node server/scripts/microtxn-report.js --since 2026-09-30T00:00:00Z
//   (options: --type GAMESALES|STEAMSTORESALES|SETTLEMENT, --resume)
// --resume uses the durable worker cursor; --since initializes it only when
// absent. Without --resume, this is an independent read-only report window.
//
// Prints the request (without the key), Steam's raw response and the
// reconciliation, and saves the same JSON under server/data/microtxn-reports/.
// That JSON is what Valve asks for with the test account's name.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from '../db.js';
import { runMicroTxnReconciliation, REPORT_TYPES } from '../steamMicroTxnReport.js';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const durable = args.includes('--resume');
const since = arg('since', durable ? undefined : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
const type = arg('type', 'GAMESALES');
if (!REPORT_TYPES.includes(type)) {
    console.error(`[microtxn-report] invalid type; choose ${REPORT_TYPES.join(', ')}`);
    process.exit(2);
}

await initDb();
const { ok, report, reconciliation, checkpoint } = await runMicroTxnReconciliation({ since, type, durable });
const output = {
    generatedAt: new Date().toISOString(),
    request: report.request ?? null,
    ok,
    scanComplete: report.complete ?? false,
    reason: report.reason ?? reconciliation?.reason ?? (ok ? null : 'unresolved_orders'),
    steamResponse: report.response ?? null,
    // The last response may be the terminating empty batch; preserve every
    // redacted-request/raw-response pair for reviewer evidence.
    pages: report.pages ?? [],
    reconciliation,
    checkpoint
};
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'microtxn-reports');
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const file = path.join(dir, `getreport-${type.toLowerCase()}-${output.generatedAt.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, `${JSON.stringify(output, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify(output, null, 2));
console.error(`[microtxn-report] saved ${file}`);
process.exit(ok ? 0 : 1);
