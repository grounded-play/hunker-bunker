export function crossingGuidance({ o2 = 100, maxO2 = 100 } = {}) {
    const reserve = o2 / Math.max(1, maxO2);
    if (reserve <= 0.25) return 'Your suit is running on reserve. Find oxygen or retrace your route before committing deeper.';
    if (reserve <= 0.5) return 'The bunker offers more. Your suit has less to spend. Check your return route before the next descent.';
    return 'Better salvage, stronger resistance. Explore for a build advantage, then choose whether another ring is worth the oxygen.';
}

export function expeditionDebrief({ victory = false, reason = '', buildCount = 0 } = {}) {
    const retained = 'Banked resources, unlocks and companion contract progress remain.';
    const build = buildCount > 0 ? ' Run relics and overclocks expire with this expedition.' : '';
    const next = victory ? 'Review your loadout before the next descent.'
        : /o2|oxygen/i.test(reason) ? 'Next attempt: establish oxygen security and turn back before reserve becomes an emergency.'
            : 'Next attempt: use cover, build around your relics, and leave room for the return trip.';
    return `${retained}${build}\n${next}`;
}
