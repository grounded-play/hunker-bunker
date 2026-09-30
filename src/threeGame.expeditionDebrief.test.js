import { describe, expect, it } from 'vitest';
import { ThreeGame } from './threeGame.js';

describe('Expanded Expedition Debrief (Blueprint unlocks, Factions, Leads)', () => {
    it('synthesizes relic unlocks, camp faction bonds, and story leads into report items', () => {
        const game = {
            activeExpedition: { condition: { id: 'acid_rain' } },
            expeditionBounty: null,
            _deploymentStartedAt: 1000,
            _expeditionReportItems: [],
            runRelics: [{ id: 'cryo_rime', name: 'Cryo Rime Core' }],
            act2: {
                getState: () => ({
                    camps: [{ id: 'camp_meridian', label: 'Camp Meridian', bond: 2 }],
                    linchpins: { mayor_tina: 'joined' }
                })
            },
            getExpeditionReportData: ThreeGame.prototype.getExpeditionReportData
        };

        const data = game.getExpeditionReportData();
        expect(data.conditionNameKey).toBe('ui.expedition.conditions.acid_rain.name');

        const kinds = data.items.map((it) => it.kind);
        expect(kinds).toContain('unlock');
        expect(kinds).toContain('faction');
        expect(kinds).toContain('lead');

        const unlockItem = data.items.find((it) => it.kind === 'unlock');
        expect(unlockItem.params.name).toBe('Cryo Rime Core');

        const factionItem = data.items.find((it) => it.kind === 'faction');
        expect(factionItem.params.faction).toBe('Camp Meridian');
        expect(factionItem.params.bond).toBe(2);

        const leadItem = data.items.find((it) => it.kind === 'lead');
        expect(leadItem.params.linchpinId).toBe('mayor_tina');
        expect(leadItem.params.resolution).toBe('JOINED');
    });
});
