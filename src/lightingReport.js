// Lighting health reporting (Sprint 29 plan §2), completing Lane B's telemetry.
//
// The lighting snapshot recorded renderer settings but never the lights
// themselves, so "lighting turns off after I move" could not be confirmed or
// ruled out from a session log. Counting the lights that are actually
// contributing -- present, visible, and above zero intensity -- and reporting
// when that count falls is the general way to catch a drop without
// instrumenting every place a light might be removed.

export function summarizeSceneLights(scene) {
    const byType = {};
    let total = 0;
    const children = [];
    if (typeof scene?.traverse === 'function') {
        scene.traverse((child) => children.push(child));
    } else {
        children.push(...(scene?.children ?? []));
    }
    for (const child of children) {
        if (!child?.isLight) continue;
        // A light left in the graph but switched off or dimmed to nothing is
        // not lighting anything, and counting it would hide exactly the
        // regression this exists to catch.
        if (child.visible === false) continue;
        if (Number.isFinite(child.intensity) && child.intensity <= 0) continue;
        const type = child.type ?? 'Light';
        byType[type] = (byType[type] ?? 0) + 1;
        total += 1;
    }
    return { total, byType };
}

export function diffLightCounts(previous, next) {
    if (!previous?.byType) return [];
    const dropped = [];
    for (const [type, before] of Object.entries(previous.byType)) {
        const after = next?.byType?.[type] ?? 0;
        if (after < before) dropped.push({ type, before, after });
    }
    return dropped;
}
