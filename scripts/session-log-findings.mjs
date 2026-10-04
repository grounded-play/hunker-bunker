// Evidence, not acceptance: missing entries do not prove missing behavior.
export function sessionLogFindings(capture) {
    const entries = Array.isArray(capture.entries) ? capture.entries : [];
    const events = entries.map((entry) => {
        const message = String(entry?.message ?? '');
        const start = message.indexOf('{');
        let detail = null;
        if (start >= 0) {
            try { detail = JSON.parse(message.slice(start)); } catch { /* malformed diagnostic */ }
        }
        return { name: message.split(/\s/)[0], detail };
    });
    const count = (name) => events.filter((event) => event.name === name).length;
    const joins = count('relay-join-sent');
    const rosters = events.filter((event) => event.name === 'relay-roster-received' && Array.isArray(event.detail?.players));
    const latestRosterSize = rosters.at(-1)?.detail.players.length ?? null;
    const samples = Array.isArray(capture.performanceTimeline?.samples) ? capture.performanceTimeline.samples : [];
    const finalRemotePlayers = samples.at(-1)?.activity?.remotePlayers ?? null;
    const frame = capture.state?.performance?.frameIntervals?.profiles?.gameplay;
    const damageReasons = {};
    for (const event of events.filter((event) => event.name === 'player-damaged')) {
        const reason = event.detail?.reason;
        if (typeof reason === 'string' && !['__proto__', 'constructor', 'prototype'].includes(reason)) {
            damageReasons[reason] = (damageReasons[reason] ?? 0) + 1;
        }
    }
    return {
        joins,
        repeatedJoins: joins > 1,
        latestRosterSize,
        finalRemotePlayers,
        // Only compare available evidence; no invented two-player assumption.
        possibleStaleAvatars: Number.isInteger(latestRosterSize) && Number.isInteger(finalRemotePlayers)
            && finalRemotePlayers > Math.max(0, latestRosterSize - 1),
        hitReports: count('pvp-hit-dealt'),
        hitConfirmations: count('pvp-hit-confirmed'),
        damageReasons,
        gameplayAverageMs: frame?.averageMs ?? null,
        gameplayP95Ms: frame?.p95Ms ?? null,
        approximateFps: frame?.averageMs > 0 ? Math.round(10000 / frame.averageMs) / 10 : null
    };
}
