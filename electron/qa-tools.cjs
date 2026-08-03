function normalizeBetaName(value) {
    const name = typeof value === 'string' ? value.trim() : '';
    if (!name || name.toLowerCase() === 'default' || name.toLowerCase() === 'public') return null;
    return name;
}

function isQaToolsEnabled({ override, betaName } = {}) {
    return override === '1' || Boolean(normalizeBetaName(betaName));
}

module.exports = { isQaToolsEnabled, normalizeBetaName };
