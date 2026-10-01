// Adapt the public backend contract once, before any store card or purchase
// action uses it. A missing quote never becomes an invented local price.
export function adaptStoreCatalogResponse(response) {
    if (!response?.ok || !Array.isArray(response.catalog) || response.catalog.length === 0) return null;
    const seen = new Set();
    const catalog = [];
    const keysRestricted = Boolean(response.keysRestricted);
    for (const row of response.catalog) {
        if (!row || typeof row.sku !== 'string' || !/^[a-z0-9_]+$/.test(row.sku)
            || seen.has(row.sku) || !Number.isSafeInteger(row.keyCount) || row.keyCount < 1
            || typeof row.label !== 'string' || !row.label.trim()) return null;
        // The current server explicitly charges USD. Future account-currency
        // quotes must supply their own minor-unit amount, never relabel USD cents.
        const currency = row.currency ?? response.currency ?? 'USD';
        const priceMinor = row.priceMinor ?? (currency === 'USD' ? row.priceUsdCents : null);
        if (!/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(priceMinor) || priceMinor < 0) return null;
        if (currency !== 'USD' && row.priceMinor == null) return null;
        seen.add(row.sku);
        const item = { sku: row.sku, label: row.label, keyCount: row.keyCount, priceMinor, currency };
        if (row.priceCategory) item.priceCategory = row.priceCategory;
        if (row.restricted || keysRestricted) item.restricted = true;
        catalog.push(item);
    }
    const odds = response.deepRelicCacheOdds;
    if (!Array.isArray(odds) || odds.length === 0 || odds.some((row) => !row
        || typeof row.label !== 'string' || typeof row.rarity !== 'string'
        || !Number.isFinite(row.percent) || row.percent < 0 || row.percent > 100)
        || Math.abs(odds.reduce((sum, row) => sum + row.percent, 0) - 100) > 0.1) return null;
    return {
        catalog,
        odds,
        keysRestricted,
        restrictedRegionReason: response.restrictedRegionReason ?? null,
        restrictedRegionNotice: response.restrictedRegionNotice ?? null,
        legalTerms: response.legalTerms ?? null
    };
}

export function formatStorePrice({ priceMinor, currency }, locale = 'en') {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' });
    const fractionDigits = formatter.resolvedOptions().maximumFractionDigits;
    return formatter.format(priceMinor / (10 ** fractionDigits));
}
