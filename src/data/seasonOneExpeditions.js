// Existing interactions only. Containment uses elimination as its solo route;
// recovery uses a reachable survey instead of requiring a legendary random drop.
export const SEASON_EXPEDITIONS = Object.freeze([
    { id: 'recovery', name: 'Salvage / Recovery', type: 'survey', targetDepth: 65,
        label: 'RECOVERY: SURVEY THE SALVAGE PERIMETER',
        decision: 'Bank supplies near the wreck; pursue a black box only if one is active.',
        relics: ['Scrap Cycler', 'Last Breath'] },
    { id: 'relay', name: 'Survey / Relay', type: 'mapping', targetDepth: 0,
        label: 'SURVEY: SCAN A ROUTE TO THE RELAY',
        decision: 'Map a safe return route or cross forward for more Dossier XP.',
        relics: ['Cryo Breach', 'Last Breath'] },
    { id: 'containment', name: 'Containment / Rescue', type: 'elimination', targetKills: 6,
        label: 'CONTAINMENT: CLEAR SIX HOSTILES',
        decision: 'Clear the route solo; visit an available companion or camp between encounters.',
        relics: ['Cryo Breach', 'Scrap Cycler'] }
]);

export function nextSeasonExpedition(history = [], random = Math.random) {
    const lastTwo = history.slice(-2);
    const candidates = SEASON_EXPEDITIONS.filter(entry => !(lastTwo.length === 2 && lastTwo.every(id => id === entry.id)));
    const selected = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))];
    return { ...selected, targetKills: selected.targetKills ?? 0, targetDepth: selected.targetDepth ?? 0 };
}
