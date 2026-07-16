import { steamAuthMiddleware } from './steamAuth.js';
import {
    getMockInventory,
    setMockInventory,
    checkIdempotency,
    saveIdempotency
} from './db.js';
import {
    OPEN_CACHE_RECIPE_ID,
    DEEP_RELIC_CACHE_ITEMDEFID,
    CACHE_KEY_ITEMDEFID,
    rollDeepRelicCache
} from './lootTables.js';
import { grantItemToPlayer } from './steamGrant.js';

const STEAM_INVENTORY_URL = 'https://partner.steam-api.com/IInventoryService/';
const STEAM_ECON_MARKET_URL = 'https://partner.steam-api.com/IEconMarketService/';
const DEFAULT_PLAYTIME_DROP_COOLDOWN_MS = 60 * 1000;

function getSteamPublisherKey() {
    return process.env.HB_STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_PUBLISHER_KEY
        ?? process.env.STEAM_WEB_API_KEY
        ?? '';
}

function getSteamAppId() {
    return Number(process.env.HB_STEAM_APPID ?? 4957040);
}

function getPlaytimeDropCooldownMs() {
    const raw = Number(process.env.HB_STEAM_DROP_COOLDOWN_SECONDS);
    if (!Number.isFinite(raw)) return DEFAULT_PLAYTIME_DROP_COOLDOWN_MS;
    return Math.min(3600, Math.max(0, raw)) * 1000;
}

function getPlaytimeDropCooldownKey(steamId) {
    return `playtime-drop-cooldown-${steamId}`;
}

function getPlaytimeDropCooldownResponse(steamId, now = Date.now()) {
    const cooldownMs = getPlaytimeDropCooldownMs();
    if (cooldownMs <= 0) return null;

    const marker = checkIdempotency(getPlaytimeDropCooldownKey(steamId));
    const lastGrantedAt = Number(marker?.timestamp);
    if (!Number.isFinite(lastGrantedAt) || now - lastGrantedAt >= cooldownMs) return null;

    return {
        status: 200,
        body: {
            ok: true,
            granted: [],
            reason: 'drop_cooldown',
            retryAfterSeconds: Math.max(1, Math.ceil((cooldownMs - (now - lastGrantedAt)) / 1000))
        }
    };
}

function isAllowedMarketEligibility(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizeMarketEligibilityResponse(data) {
    const eligibility = data?.response ?? null;
    return {
        ok: true,
        allowed: isAllowedMarketEligibility(eligibility?.allowed),
        eligibility
    };
}

export { steamAuthMiddleware };

export function attachSteamInventoryRoutes(app) {
    // 1. Get Inventory
    app.get('/steam/inventory', steamAuthMiddleware, async (req, res) => {
        if (req.isDevMode) {
            return res.json({
                ok: true,
                inventory: getMockInventory(req.steamId)
            });
        }

        try {
            const params = new URLSearchParams({
                key: getSteamPublisherKey(),
                appid: String(getSteamAppId()),
                steamid: req.steamId
            });
            const response = await fetch(`${STEAM_INVENTORY_URL}GetInventory/v1/?${params.toString()}`);
            if (!response.ok) {
                return res.status(response.status).json({ ok: false, reason: 'steam_api_error' });
            }

            const data = await response.json();
            const items = (data?.response?.item_list ?? []).map((item) => ({
                itemId: String(item.itemid),
                itemdefid: Number(item.itemdefid),
                quantity: Number(item.quantity) || 1,
                acquiredAt: item.acquired ? Date.parse(item.acquired) : Date.now()
            }));

            res.json({ ok: true, inventory: items });
        } catch (err) {
            res.status(502).json({ ok: false, reason: 'steam_request_failed', message: err.message });
        }
    });

    // 2. Playtime Drops (TriggerItemDrop)
    app.post('/steam/inventory/trigger-drop', steamAuthMiddleware, async (req, res) => {
        const requestId = req.body?.requestId;
        const cached = checkIdempotency(requestId);
        if (cached) {
            return res.status(cached.status).json(cached.body);
        }
        const cooldown = getPlaytimeDropCooldownResponse(req.steamId);
        if (cooldown) {
            await saveIdempotency(requestId, cooldown);
            return res.status(cooldown.status).json(cooldown.body);
        }

        let result;

        if (req.isDevMode) {
            const roll = Math.random() * 100;
            let itemdefid = 1000; // Common Relic Fragment
            if (roll > 99) itemdefid = 2200; // Chrome Weapon Finish (1%)
            else if (roll > 98) itemdefid = DEEP_RELIC_CACHE_ITEMDEFID; // Deep Relic Cache (1%), free drop — opening it still needs a purchased Key
            else if (roll > 94) itemdefid = 2100; // Carbon Fiber Decal (4%)
            else if (roll > 79) itemdefid = 1100; // Rare Relic Fragment (15%)

            const grant = await grantItemToPlayer({
                steamId: req.steamId,
                itemdefid,
                isDevMode: true,
                source: 'playtime_drop',
                mode: 'stack'
            });
            result = {
                status: 200,
                body: { ok: true, granted: grant.granted }
            };
        } else {
            try {
                const params = new URLSearchParams({
                    key: getSteamPublisherKey(),
                    appid: String(getSteamAppId()),
                    steamid: req.steamId,
                    itemdefid: '3000' // playtime drop generator
                });
                const response = await fetch(`${STEAM_INVENTORY_URL}TriggerItemDrop/v1/`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded' },
                    body: params
                });

                if (!response.ok) {
                    result = {
                        status: response.status,
                        body: { ok: false, reason: 'steam_api_error' }
                    };
                } else {
                    const data = await response.json();
                    const items = (data?.response?.item_list ?? []).map((item) => ({
                        itemId: String(item.itemid),
                        itemdefid: Number(item.itemdefid),
                        quantity: Number(item.quantity) || 1,
                        acquiredAt: Date.now()
                    }));
                    result = {
                        status: 200,
                        body: { ok: true, granted: items }
                    };
                }
            } catch (err) {
                result = {
                    status: 502,
                    body: { ok: false, reason: 'steam_request_failed', message: err.message }
                };
            }
        }

        await saveIdempotency(requestId, result);
        if (result.status === 200 && getPlaytimeDropCooldownMs() > 0) {
            await saveIdempotency(getPlaytimeDropCooldownKey(req.steamId), {
                status: 200,
                body: { ok: true, reason: 'drop_window' }
            });
        }
        res.status(result.status).json(result.body);
    });

    // 3. Promo Item Grant (Scout, Tank, Engineer victory patches)
    app.post('/steam/inventory/grant-promo', steamAuthMiddleware, async (req, res) => {
        const requestId = req.body?.requestId;
        const classType = String(req.body?.classType ?? '').toUpperCase();
        const outcome = req.body?.outcome;

        const cached = checkIdempotency(requestId);
        if (cached) {
            return res.status(cached.status).json(cached.body);
        }

        if (outcome !== 'victory') {
            return res.status(400).json({ ok: false, reason: 'promo_requires_victory' });
        }

        let itemdefid = 2000; // default Scout
        if (classType === 'TANK') itemdefid = 2001;
        else if (classType === 'ENGINEER') itemdefid = 2002;

        const grant = await grantItemToPlayer({
            steamId: req.steamId,
            itemdefid,
            isDevMode: req.isDevMode,
            source: 'victory_promo',
            mode: 'once',
            requestId
        });
        const result = {
            status: grant.ok ? 200 : (grant.status ?? 502),
            body: grant
        };

        await saveIdempotency(requestId, result);
        res.status(result.status).json(result.body);
    });

    // 4. Crafting/Exchange
    app.post('/steam/inventory/exchange', steamAuthMiddleware, async (req, res) => {
        const requestId = req.body?.requestId;
        const recipeId = Number(req.body?.recipeId);
        const materials = req.body?.materials; // array of itemId strings

        const cached = checkIdempotency(requestId);
        if (cached) {
            return res.status(cached.status).json(cached.body);
        }

        if (!recipeId || !Array.isArray(materials)) {
            return res.status(400).json({ ok: false, reason: 'invalid_exchange_parameters' });
        }

        let result;

        if (req.isDevMode) {
            const inv = getMockInventory(req.steamId);
            const materialItems = inv.filter((item) => materials.includes(item.itemId));

            // Verify they have all specified materials
            if (materialItems.length !== materials.length) {
                return res.status(400).json({ ok: false, reason: 'missing_material_instances' });
            }

            // Recipe requirement validation
            if (recipeId === OPEN_CACHE_RECIPE_ID) {
                // Open Deep Relic Cache (requires 1x Cache + 1x Key). The reward
                // is rolled from lootTables.js so disclosed odds always match
                // the actual roll — do not special-case this recipe's output.
                const hasCache = materialItems.some((i) => i.itemdefid === DEEP_RELIC_CACHE_ITEMDEFID);
                const hasKey = materialItems.some((i) => i.itemdefid === CACHE_KEY_ITEMDEFID);
                if (!hasCache || !hasKey || materialItems.length !== 2) {
                    return res.status(400).json({ ok: false, reason: 'cache_open_requires_one_cache_and_one_key' });
                }
            } else if (recipeId === 2100) {
                // Carbon Fiber Decal (requires 5x Common Relic Fragment)
                const commonCount = materialItems.filter((i) => i.itemdefid === 1000)
                    .reduce((sum, item) => sum + item.quantity, 0);
                if (commonCount < 5) {
                    return res.status(400).json({ ok: false, reason: 'insufficient_relics_for_decal' });
                }
            } else if (recipeId === 2200) {
                // Chrome weapon finish (requires 10x Common, 2x Rare)
                const commonCount = materialItems.filter((i) => i.itemdefid === 1000)
                    .reduce((sum, item) => sum + item.quantity, 0);
                const rareCount = materialItems.filter((i) => i.itemdefid === 1100)
                    .reduce((sum, item) => sum + item.quantity, 0);
                if (commonCount < 10 || rareCount < 2) {
                    return res.status(400).json({ ok: false, reason: 'insufficient_relics_for_chrome' });
                }
            } else {
                return res.status(400).json({ ok: false, reason: 'invalid_recipe_id' });
            }

            // Consume materials
            // Note: For mock simplicity, we assume we consume the whole instance or decrease its quantity
            const remaining = inv.map((item) => {
                if (materials.includes(item.itemId)) {
                    return { ...item, quantity: item.quantity - 1 };
                }
                return item;
            }).filter((item) => item.quantity > 0);

            await setMockInventory(req.steamId, remaining);

            // Fixed recipes (2100/2200) grant the recipe id itself; the
            // cache-open recipe rolls a random reward instead. Each craft/
            // open is always its own new tradable instance (mode: 'unique')
            // — never merged into an existing stack of the same itemdefid.
            const isCacheOpen = recipeId === OPEN_CACHE_RECIPE_ID;
            const roll = isCacheOpen ? rollDeepRelicCache() : null;
            const grant = await grantItemToPlayer({
                steamId: req.steamId,
                itemdefid: isCacheOpen ? roll.itemdefid : recipeId,
                quantity: isCacheOpen ? roll.quantity : 1,
                isDevMode: true,
                source: isCacheOpen ? 'cache_open' : 'crafting_exchange',
                mode: 'unique'
            });
            result = {
                status: 200,
                body: { ok: true, consumed: materials, granted: grant.granted }
            };
        } else {
            try {
                // recipeId doubles as the Steam-side outputitemdefid for fixed
                // recipes (2100/2200 are both recipe id and reward id). The
                // cache-open recipe has no reward itemdefid of its own — it
                // targets a hidden Steamworks bundle/generator item (4002)
                // configured to resolve the same weights as lootTables.js.
                // Verify this mapping against live Steamworks Inventory admin
                // before shipping; the exact generator item type/behavior is
                // configured on Valve's side, not in this code.
                const outputItemdefid = recipeId === OPEN_CACHE_RECIPE_ID ? 4002 : recipeId;
                const params = new URLSearchParams();
                params.append('key', getSteamPublisherKey());
                params.append('appid', String(getSteamAppId()));
                params.append('steamid', req.steamId);
                params.append('outputitemdefid', String(outputItemdefid));

                materials.forEach((matId, index) => {
                    params.append(`materialsitemid[${index}]`, String(matId));
                    params.append(`materialsquantity[${index}]`, '1');
                });

                const response = await fetch(`${STEAM_INVENTORY_URL}ExchangeItem/v1/`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded' },
                    body: params
                });

                if (!response.ok) {
                    result = {
                        status: response.status,
                        body: { ok: false, reason: 'steam_api_error' }
                    };
                } else {
                    const data = await response.json();
                    const items = (data?.response?.item_list ?? []).map((item) => ({
                        itemId: String(item.itemid),
                        itemdefid: Number(item.itemdefid),
                        quantity: Number(item.quantity) || 1,
                        acquiredAt: Date.now()
                    }));
                    result = {
                        status: 200,
                        body: { ok: true, granted: items }
                    };
                }
            } catch (err) {
                result = {
                    status: 502,
                    body: { ok: false, reason: 'steam_request_failed', message: err.message }
                };
            }
        }

        await saveIdempotency(requestId, result);
        res.status(result.status).json(result.body);
    });

    // 5. Milestone Grant (Tier B: client-triggered, mid-run milestones that
    // can't piggyback on the trusted submit-run flow because they happen
    // before a runId/final payload exists). The client sends a milestone
    // TYPE, never an itemdefid — the server owns this lookup table so a
    // modified client can't request arbitrary items. The idempotency key is
    // derived here from steamId + milestone (+ runKey where relevant), not
    // from a client-supplied nonce, so a retry can't double-grant.
    app.post('/steam/inventory/grant-milestone', steamAuthMiddleware, async (req, res) => {
        const milestone = String(req.body?.milestone ?? '');
        const runKey = String(req.body?.runKey ?? '');

        let itemdefid;
        let mode;
        let idempotencyKey;

        if (milestone === 'boss_kill') {
            if (!runKey) {
                return res.status(400).json({ ok: false, reason: 'missing_run_key' });
            }
            itemdefid = DEEP_RELIC_CACHE_ITEMDEFID;
            mode = 'stack';
            idempotencyKey = `boss-kill-${req.steamId}-${runKey}`;
        } else if (milestone === 'achievement:slay_the_queen') {
            itemdefid = 2003; // Queen Slayer Emblem
            mode = 'once';
            idempotencyKey = `ach-slay_the_queen-${req.steamId}`;
        } else if (milestone === 'achievement:archivist') {
            itemdefid = 2004; // Archivist Emblem
            mode = 'once';
            idempotencyKey = `ach-archivist-${req.steamId}`;
        } else {
            return res.status(400).json({ ok: false, reason: 'invalid_milestone' });
        }

        const cached = checkIdempotency(idempotencyKey);
        if (cached) {
            return res.status(cached.status).json(cached.body);
        }

        const grant = await grantItemToPlayer({
            steamId: req.steamId,
            itemdefid,
            isDevMode: req.isDevMode,
            source: `milestone:${milestone}`,
            mode
        });
        const result = { status: grant.ok ? 200 : (grant.status ?? 502), body: grant };

        await saveIdempotency(idempotencyKey, result);
        res.status(result.status).json(result.body);
    });

    // 6. Market Eligibility
    app.get('/steam/market/eligibility', steamAuthMiddleware, async (req, res) => {
        if (req.isDevMode) {
            return res.json({ ok: true, allowed: true, reason: 'dev_mock' });
        }

        try {
            const params = new URLSearchParams({
                key: getSteamPublisherKey(),
                appid: String(getSteamAppId()),
                steamid: req.steamId
            });
            const response = await fetch(`${STEAM_ECON_MARKET_URL}GetMarketEligibility/v1/?${params.toString()}`);
            if (!response.ok) {
                return res.status(response.status).json({ ok: false, reason: 'steam_api_error' });
            }

            const data = await response.json();
            res.json(normalizeMarketEligibilityResponse(data));
        } catch (err) {
            res.status(502).json({ ok: false, reason: 'steam_request_failed', message: err.message });
        }
    });
}
