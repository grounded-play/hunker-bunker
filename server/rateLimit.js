import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

function readPositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
}

function defaultKey(req) {
    const forwarded = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim();
    const rawIp = forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
    // Normalize through express-rate-limit's own helper so distinct textual
    // forms of the same IPv6 address (or an IPv6-mapped IPv4 address) can't
    // be used to dodge the bucket keyed on this string.
    const ip = ipKeyGenerator(rawIp);
    const method = req.method ?? 'GET';
    const path = req.originalUrl?.split('?')[0] ?? req.path ?? '/';
    return `${ip}:${method}:${path}`;
}

function rateLimitHandler(_req, res, _next, options) {
    const retryAfterHeader = Number(res.getHeader('Retry-After'));
    const retryAfterSeconds = Number.isFinite(retryAfterHeader)
        ? retryAfterHeader
        : Math.max(1, Math.ceil(Number(options.windowMs) / 1000));
    res.status(options.statusCode).json({
        ok: false,
        reason: 'rate_limited',
        retryAfterSeconds
    });
}

export function createRateLimitOptions({
    windowMs = readPositiveInt(process.env.HB_RATE_LIMIT_WINDOW_MS, 60_000),
    max = readPositiveInt(process.env.HB_RATE_LIMIT_MAX, 180),
    keyFn = defaultKey
} = {}) {
    const safeWindowMs = Math.max(1000, Number(windowMs) || 60_000);
    const safeMax = Math.max(1, Number(max) || 180);

    return {
        windowMs: safeWindowMs,
        limit: safeMax,
        keyGenerator: keyFn,
        skip: (req) => req.method === 'OPTIONS',
        standardHeaders: 'draft-7',
        legacyHeaders: true,
        handler: rateLimitHandler
    };
}

export function createRateLimitMiddleware(options = {}) {
    return rateLimit(createRateLimitOptions(options));
}
