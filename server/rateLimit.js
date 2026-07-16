function readPositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
}

function defaultKey(req) {
    const forwarded = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim();
    const ip = forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
    const method = req.method ?? 'GET';
    const path = req.originalUrl?.split('?')[0] ?? req.path ?? '/';
    return `${ip}:${method}:${path}`;
}

export function createRateLimitMiddleware({
    windowMs = readPositiveInt(process.env.HB_RATE_LIMIT_WINDOW_MS, 60_000),
    max = readPositiveInt(process.env.HB_RATE_LIMIT_MAX, 180),
    keyFn = defaultKey,
    now = () => Date.now()
} = {}) {
    const buckets = new Map();
    const safeWindowMs = Math.max(1000, Number(windowMs) || 60_000);
    const safeMax = Math.max(1, Number(max) || 180);

    return function rateLimitMiddleware(req, res, next) {
        if (req.method === 'OPTIONS') {
            next();
            return;
        }

        const currentTime = Number(now());
        const key = keyFn(req);
        const existing = buckets.get(key);
        const bucket = existing && existing.resetAt > currentTime
            ? existing
            : { count: 0, resetAt: currentTime + safeWindowMs };

        bucket.count += 1;
        buckets.set(key, bucket);

        const remaining = Math.max(0, safeMax - bucket.count);
        res.setHeader('X-RateLimit-Limit', String(safeMax));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

        if (bucket.count > safeMax) {
            const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));
            res.setHeader('Retry-After', String(retryAfterSeconds));
            res.status(429).json({
                ok: false,
                reason: 'rate_limited',
                retryAfterSeconds
            });
            return;
        }

        if (buckets.size > 4096) {
            for (const [bucketKey, value] of buckets) {
                if (value.resetAt <= currentTime) buckets.delete(bucketKey);
            }
        }

        next();
    };
}
