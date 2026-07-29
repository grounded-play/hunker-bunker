/* global URL, process, console */
import { fileURLToPath } from 'node:url';
import {
    auditSteamBackendEnv,
    formatBackendEnvIssue,
    isBackendEnvEnabled
} from '../server/backendEnvAudit.js';

export { auditSteamBackendEnv } from '../server/backendEnvAudit.js';

async function main() {
    const strict = process.argv.includes('--strict')
        || isBackendEnvEnabled(process.env.HB_BACKEND_AUDIT_STRICT)
        || process.env.NODE_ENV === 'production';
    const result = auditSteamBackendEnv(process.env, { strict });

    for (const warning of result.warnings) {
        console.warn(`[backend-audit] warning: ${formatBackendEnvIssue(warning)}`);
    }

    if (!result.ok) {
        console.error(`[backend-audit] failed (${result.failures.length} issue(s), strict=${result.strict}):`);
        for (const failure of result.failures) {
            console.error(`- ${formatBackendEnvIssue(failure)}`);
        }
        process.exitCode = 1;
        return;
    }

    console.log(`[backend-audit] ok (strict=${result.strict}, appid=${result.appId}, leaderboards=${result.configuredLeaderboardCount}/${result.leaderboardCount})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((err) => {
        console.error(`[backend-audit] ${err?.message ?? err}`);
        process.exitCode = 1;
    });
}
