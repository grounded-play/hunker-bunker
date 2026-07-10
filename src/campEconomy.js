export function getCampTrades(campRecord, playerType) {
    const campId = campRecord.id;
    const level = campRecord.level || 0;
    const bond = campRecord.bond || 0;

    // Class affinity modifier (20% bonus)
    let discount = 1.0;
    let bonus = 1.0;
    if (campId === 'camp_meridian' && playerType === 'ENGINEER') {
        discount = 0.8;
        bonus = 1.2;
    } else if (campId === 'camp_tallow' && playerType === 'SCOUT') {
        discount = 0.8;
        bonus = 1.2;
    } else if (campId === 'camp_vesper' && playerType === 'TANK') {
        discount = 0.8;
        bonus = 1.2;
    }

    // Level and bond modifier
    // Every level / bond improves rates
    const levelFactor = 1.0 + level * 0.1;
    const bondFactor = 1.0 + bond * 0.05;
    const totalAffinity = bonus * levelFactor * bondFactor;
    const totalDiscount = discount / (levelFactor * bondFactor);

    if (campId === 'camp_meridian') {
        return [
            {
                id: 'sell_tech',
                label: 'SELL TECH MODULE',
                give: { tech: 1 },
                receive: { shells: Math.max(1, Math.round(30 * totalAffinity)) }
            },
            {
                id: 'buy_coin',
                label: 'BUY COIN RESERVES',
                give: { shells: Math.max(1, Math.round(40 * totalDiscount)) },
                receive: { coin: 5 }
            }
        ];
    } else if (campId === 'camp_tallow') {
        return [
            {
                id: 'sell_med',
                label: 'SELL BIO-VACCINES',
                give: { med: 1 },
                receive: { shells: Math.max(1, Math.round(30 * totalAffinity)) }
            },
            {
                id: 'buy_med',
                label: 'BUY STABILIZING MEDS',
                give: { shells: Math.max(1, Math.round(40 * totalDiscount)) },
                receive: { med: 1 }
            }
        ];
    } else { // camp_vesper
        return [
            {
                id: 'sell_coin',
                label: 'SELL AMMO CRATE (COINS)',
                give: { coin: 1 },
                receive: { shells: Math.max(1, Math.round(25 * totalAffinity)) }
            },
            {
                id: 'buy_tech',
                label: 'BUY SPARE TECH PARTS',
                give: { shells: Math.max(1, Math.round(50 * totalDiscount)) },
                receive: { tech: 1 }
            }
        ];
    }
}

export function canApplyTrade(trade, bankState) {
    if (!trade || !bankState) return false;
    for (const [key, amt] of Object.entries(trade.give)) {
        if (key === 'shells') {
            if ((bankState.shells ?? 0) < amt) return false;
        } else {
            if ((bankState[key] ?? 0) < amt) return false;
        }
    }
    return true;
}

export function applyTrade(trade, bankManager) {
    if (!trade || !bankManager) return false;
    const state = bankManager.getState();
    if (!canApplyTrade(trade, state)) return false;

    // Deduct
    for (const [key, amt] of Object.entries(trade.give)) {
        if (key === 'shells') {
            bankManager.spendShells(amt);
        } else {
            bankManager.state[key] -= amt;
        }
    }
    // Add
    for (const [key, amt] of Object.entries(trade.receive)) {
        if (key === 'shells') {
            bankManager.addShells(amt);
        } else {
            bankManager.state[key] = (bankManager.state[key] ?? 0) + amt;
        }
    }
    bankManager.save();
    return true;
}
