export function isReportTime(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
        && Number.isFinite(Date.parse(value))
        && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19);
}

function orderKey(order) {
    if (!order || typeof order !== 'object' || Array.isArray(order)) return null;
    const id = (value) => typeof value === 'string' && /^\d{1,20}$/.test(value) && value !== '0';
    if (id(order.transid)) return `trans:${order.transid}`;
    if (id(order.orderid)) return `order:${order.orderid}`;
    return null;
}

/** Enumerate by Steam's update time, not row count or creation time. */
export async function scanMicroTxnReport({
    fetchPage, time, orders = [], onPage = async () => {}, maxPages = 100, maxOrders = 100_000
}) {
    const pages = [];
    let cursor = time;
    const evidence = new Map();
    const result = (ok, reason = null) => ({
        ok, complete: ok, reason, cursor, orders: [...evidence.values()], pages,
        request: pages[0]?.request ?? null, response: pages.at(-1)?.response ?? null
    });
    if (!isReportTime(time) || !Number.isSafeInteger(maxPages) || maxPages < 1
        || !Number.isSafeInteger(maxOrders) || maxOrders < 1 || !Array.isArray(orders)) return result(false, 'invalid_report_scan');
    for (const order of orders) {
        const key = orderKey(order);
        if (!key || !isReportTime(order.time)) return result(false, 'invalid_checkpoint_evidence');
        evidence.set(key, order);
    }
    if (evidence.size > maxOrders) return result(false, 'report_evidence_limit');
    let stalled = 0;
    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
        let page;
        try { page = await fetchPage(cursor); }
        catch { return result(false, 'report_fetch_failed'); }
        pages.push({ request: page?.request ?? null, response: page?.response ?? null, ok: Boolean(page?.ok), reason: page?.reason ?? null });
        if (!page?.ok) return result(false, page?.reason ?? 'report_fetch_failed');
        if (!Array.isArray(page.orders)) return result(false, 'invalid_report_response');
        if (!page.orders.length) return result(true); // Only an empty batch ends enumeration.
        let latest = cursor;
        let changed = false;
        for (const order of page.orders) {
            const key = orderKey(order);
            if (!key || !isReportTime(order.time)) return result(false, 'invalid_report_order');
            const previous = evidence.get(key);
            if (!previous && evidence.size >= maxOrders) return result(false, 'report_evidence_limit');
            const timestamp = Date.parse(order.time);
            if (timestamp > Date.parse(latest)) latest = order.time;
            // Overlap rows must not replace a more recent refund with an old sale.
            if (previous && timestamp < Date.parse(previous.time)) continue;
            const next = { ...order };
            if (previous && timestamp === Date.parse(previous.time) && (
                previous.reportConflict || previous.status !== order.status
                || previous.steamid !== order.steamid || previous.orderid !== order.orderid
            )) next.reportConflict = true;
            if (JSON.stringify(previous) !== JSON.stringify(next)) {
                evidence.set(key, next);
                changed = true;
            }
        }
        stalled = !changed && Date.parse(latest) === Date.parse(cursor) ? stalled + 1 : 0;
        // Never add a second to an ambiguous boundary: that could skip paid
        // orders with the same timestamp. A repeated non-progressing API batch
        // is visibly unhealthy and will be retried from this exact cursor.
        if (stalled >= 3) return result(false, 'report_cursor_stalled');
        try { await onPage({ cursor: latest, orders: [...evidence.values()] }); }
        catch { return result(false, 'report_checkpoint_failed'); }
        cursor = latest; // Advance only after its evidence has been persisted.
    }
    return result(false, 'report_page_limit');
}
