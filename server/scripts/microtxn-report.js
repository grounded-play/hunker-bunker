#!/usr/bin/env node
// Calls ISteamMicroTxn/GetReport and reconciles it with this backend's
// purchases. Run inside the backend container, where the publisher key is:
//
//   docker exec hunker-bunker-backend node server/scripts/microtxn-report.js --since 2026-09-30T00:00:00Z
//   (options: --type GAMESALES|STEAMSTORESALES|SETTLEMENT)
//
// Prints the request (without the key), Steam's raw response and the
// reconciliation, and saves the same JSON under server/data/microtxn-reports/.
// That JSON is what Valve asks for with the test account's name.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from '../db.js';
import { runMicroTxnReconciliation } from '../steamMicroTxnReport.js';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const since = arg('since', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
const type = arg('type', 'GAMESALES');

await initDb();
const { report, reconciliation } = await runMicroTxnReconciliation({ since, type });
const output = {
    generatedAt: new Date().toISOString(),
    request: report.request ?? null,
    ok: report.ok,
    reason: report.reason ?? null,
    steamResponse: report.response ?? null,
    reconciliation
};
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'microtxn-reports');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `getreport-${type.toLowerCase()}-${output.generatedAt.replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.error(`[microtxn-report] saved ${file}`);
process.exit(report.ok && reconciliation?.ok !== false ? 0 : 1);
