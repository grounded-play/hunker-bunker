// Context-scored arbiter for ambient/reactive HUD commentary. Given a pool
// of tagged lines and a live context snapshot, picks the single best-fitting
// eligible line (or nothing) instead of a Math.random() pick with no
// awareness of what's actually happening. Also owns cross-source cooldown
// bookkeeping so independently-firing trigger sources stop overlapping.

function inRange(value, range) {
    if (!range) return true;
    const { min = -Infinity, max = Infinity } = range;
    return value >= min && value <= max;
}

function registerEligible(line, context) {
    if (!line.register) return true;
    return line.register === (context.register ?? 'corporate');
}

function eventEligible(line, trigger) {
    const wanted = line.tags?.eventTrigger ?? null;
    if (wanted === null) return trigger === 'ambient';
    return wanted === trigger;
}

function objectiveEligible(line, context) {
    const sources = line.tags?.objectiveSources ?? null;
    if (!sources) return true;
    return sources.includes(context.objectiveSource ?? null);
}

function isLineEligible(line, trigger, context, { classLastFiredAt, lineHistory, nowSeconds, globalMinGapSeconds, lastAnyFiredAt }) {
    if (!registerEligible(line, context)) return false;
    if (!eventEligible(line, trigger)) return false;
    if (!objectiveEligible(line, context)) return false;
    if (!inRange(context.depthTier ?? 0, line.tags?.depthTier)) return false;
    if (!inRange(context.danger ?? 0, line.tags?.danger)) return false;

    const seenBefore = lineHistory.get(line.id);
    if (line.tags?.once && seenBefore) return false;

    const cooldownClass = line.tags?.cooldownClass ?? 'default';
    const cooldownSeconds = line.tags?.cooldownSeconds ?? 0;
    if (!line.tags?.bypassSharedCooldown && cooldownSeconds > 0) {
        const lastFired = classLastFiredAt.get(cooldownClass) ?? -Infinity;
        if (nowSeconds - lastFired < cooldownSeconds) return false;
    }

    if (!line.tags?.bypassSharedCooldown && globalMinGapSeconds > 0) {
        if (nowSeconds - lastAnyFiredAt < globalMinGapSeconds) return false;
    }

    const minRepeatSeconds = line.tags?.minRepeatSeconds ?? 0;
    if (seenBefore && minRepeatSeconds > 0 && nowSeconds - seenBefore.lastFiredAt < minRepeatSeconds) {
        return false;
    }

    return true;
}

function scoreLine(line, context) {
    let score = line.weight ?? 1;
    const sources = line.tags?.objectiveSources ?? null;
    if (sources && sources.includes(context.objectiveSource ?? null)) score += 2;
    if (line.tags?.depthTier) score += 1;
    if (line.tags?.danger) score += 1;
    return score;
}

export class LineDirector {
    constructor({ globalMinGapSeconds = 0 } = {}) {
        this.lineHistory = new Map();      // lineId -> { lastFiredAt, timesFired }
        this.classLastFiredAt = new Map(); // cooldownClass -> seconds
        this._nowSeconds = 0;
        this._globalMinGapSeconds = globalMinGapSeconds;
        this._lastAnyFiredAt = -Infinity;
    }

    // Advance the arbiter's internal clock. Call once per frame with delta seconds.
    tick(deltaSeconds = 0) {
        this._nowSeconds += deltaSeconds;
    }

    // Pick the best-fitting eligible line for `trigger` given `context`, or null
    // if nothing is eligible. `random` is injectable for deterministic tests.
    requestLine(trigger, context = {}, pool = [], random = Math.random) {
        const state = {
            classLastFiredAt: this.classLastFiredAt,
            lineHistory: this.lineHistory,
            nowSeconds: this._nowSeconds,
            globalMinGapSeconds: this._globalMinGapSeconds,
            lastAnyFiredAt: this._lastAnyFiredAt
        };
        const eligible = pool.filter((line) => isLineEligible(line, trigger, context, state));
        if (!eligible.length) return null;

        let best = -Infinity;
        let candidates = [];
        for (const line of eligible) {
            const score = scoreLine(line, context);
            if (score > best) {
                best = score;
                candidates = [line];
            } else if (score === best) {
                candidates.push(line);
            }
        }

        const winner = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
        this._recordFired(winner);

        const text = typeof winner.template === 'function' ? winner.template(context) : winner.text;
        return { id: winner.id, text };
    }

    _recordFired(line) {
        const cooldownClass = line.tags?.cooldownClass ?? 'default';
        this.classLastFiredAt.set(cooldownClass, this._nowSeconds);
        const prev = this.lineHistory.get(line.id);
        this.lineHistory.set(line.id, { lastFiredAt: this._nowSeconds, timesFired: (prev?.timesFired ?? 0) + 1 });
        this._lastAnyFiredAt = this._nowSeconds;
    }

    reset() {
        this.lineHistory.clear();
        this.classLastFiredAt.clear();
        this._nowSeconds = 0;
    }
}
