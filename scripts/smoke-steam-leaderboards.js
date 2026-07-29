#!/usr/bin/env node
/* global process, console, fetch */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STEAM_LEADERBOARD_DEFS } from '../server/leaderboardScoring.js';

const BOARD_NAMES = Object.freeze(Object.keys(STEAM_LEADERBOARD_DEFS));

export function validateSmokeConfig({
    backendUrl,
    sessionToken,
    allowHttp = false
}) {
    if (!backendUrl) throw new Error('HB_STEAM_BACKEND_URL or --backend-url is required.');
    if (!sessionToken) throw new Error('HB_STEAM_SESSION_TOKEN or --session-token-file is required.');
    let url;
    try {
        url = new URL(backendUrl);
    } catch {
        throw new Error('backend URL is invalid.');
    }
    if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
        throw new Error('leaderboard smoke tests require HTTPS; use --allow-http only for local development.');
    }
    return {
        backendUrl: url.toString().replace(/\/$/, ''),
        sessionToken: String(sessionToken).trim()
    };
}

async function fetchJson(fetchImpl, url, options = {}) {
    const response = await fetchImpl(url, options);
    const text = await response.text();
    let body;
    try {
        body = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`${options.method ?? 'GET'} ${url} returned non-JSON status ${response.status}.`);
    }
    if (!response.ok || body.ok !== true) {
        throw new Error(`${options.method ?? 'GET'} ${url} failed (${response.status}, ${body.reason ?? 'unknown_reason'}).`);
    }
    return body;
}

export async function runLeaderboardSmoke({
    backendUrl,
    sessionToken,
    steamId64 = '',
    submitPayload = null,
    allowHttp = false,
    fetchImpl = fetch
}) {
    const config = validateSmokeConfig({ backendUrl, sessionToken, allowHttp });
    const headers = { authorization: `Bearer ${config.sessionToken}` };
    const reads = [];
    let submission = null;

    if (submitPayload) {
        submission = await fetchJson(
            fetchImpl,
            `${config.backendUrl}/steam/leaderboards/submit-run`,
            {
                method: 'POST',
                headers: { ...headers, 'content-type': 'application/json' },
                body: JSON.stringify({ payload: submitPayload })
            }
        );
        if (!Array.isArray(submission.submitted) || submission.submitted.some((entry) => entry.ok !== true)) {
            throw new Error('leaderboard submission did not confirm every canonical target.');
        }
    }

    for (const board of BOARD_NAMES) {
        for (const dataRequest of ['RequestGlobal', 'RequestAroundUser']) {
            const query = new URLSearchParams({ dataRequest, count: '10' });
            const body = await fetchJson(
                fetchImpl,
                `${config.backendUrl}/steam/leaderboards/${encodeURIComponent(board)}?${query}`,
                { headers }
            );
            if (body.mock === true) throw new Error(`${board} returned mock data from a production smoke target.`);
            if (!Array.isArray(body.entries)) throw new Error(`${board} ${dataRequest} response is missing entries.`);
            reads.push({ board, dataRequest, entryCount: body.entries.length });
            if (steamId64 && dataRequest === 'RequestAroundUser'
                && !body.entries.some((entry) => String(entry.steamId64) === String(steamId64))) {
                throw new Error(`${board} around-user results do not contain expected Steam account ${steamId64}.`);
            }
        }
    }

    return {
        ok: true,
        boardCount: BOARD_NAMES.length,
        readCount: reads.length,
        reads,
        submittedTargets: submission?.submitted?.map((entry) => entry.target) ?? []
    };
}

function parseArgs(argv) {
    const options = { allowHttp: false };
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--allow-http') {
            options.allowHttp = true;
            continue;
        }
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) throw new Error(`${token} requires a value.`);
        if (token === '--backend-url') options.backendUrl = value;
        else if (token === '--session-token-file') options.sessionTokenFile = value;
        else if (token === '--steam-id') options.steamId64 = value;
        else if (token === '--submit-payload') options.submitPayloadFile = value;
        else throw new Error(`unknown option: ${token}`);
        index += 1;
    }
    return options;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const sessionToken = options.sessionTokenFile
        ? fs.readFileSync(options.sessionTokenFile, 'utf8').trim()
        : String(process.env.HB_STEAM_SESSION_TOKEN ?? '').trim();
    const submitPayload = options.submitPayloadFile
        ? JSON.parse(fs.readFileSync(options.submitPayloadFile, 'utf8'))
        : null;
    const result = await runLeaderboardSmoke({
        backendUrl: options.backendUrl ?? process.env.HB_STEAM_BACKEND_URL,
        sessionToken,
        steamId64: options.steamId64,
        submitPayload,
        allowHttp: options.allowHttp
    });
    console.log(`[leaderboard-smoke] ok: ${result.readCount} reads across ${result.boardCount} boards; submitted=${result.submittedTargets.join(',') || 'no'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(`[leaderboard-smoke] ${error?.message ?? error}`);
        process.exitCode = 1;
    });
}
