import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatLocationName, hallwayLocationName, locationNameKeys, roomLocationName } from './locationNames.js';

const LOCALES = ['en', 'de', 'es-419', 'ja', 'pt-BR', 'ru', 'zh-CN'];
const lookup = (dict, key) => key.split('.').reduce((node, part) => node?.[part], dict);

describe('room and hallway names', () => {
    it('names every room after its role, the same way every time', () => {
        const room = { id: '2,-1:room:7', role: 'medical' };
        const first = roomLocationName(room, '2,-1');
        expect(first.nounKey).toMatch(/^ui\.location\.room\.(med_bay|triage_ward|quarantine_cell)$/);
        expect(first.designator).toMatch(/^[A-Z]-\d{2}$/);
        expect(roomLocationName(room, '2,-1')).toEqual(first);
        expect(roomLocationName({ id: 'x', role: 'something-new' }, '0,0').nounKey).toMatch(/^ui\.location\.room\./);
    });

    it('names most hallways and leaves the rest unmarked', () => {
        const halls = Array.from({ length: 400 }, (_, i) => hallwayLocationName(`${i % 20},${Math.floor(i / 20)}`));
        const unmarked = halls.filter((hall) => hall.nounKey === 'ui.location.hall.unmarked').length;
        expect(unmarked).toBeGreaterThan(20);
        expect(unmarked).toBeLessThan(100);
        expect(halls.find((hall) => hall.designator)?.designator).toMatch(/^C-\d{2}$/);
    });

    it('keeps an authored territory room under its own title', () => {
        const name = roomLocationName({ id: 'r', siteId: 'camp_meridian', territoryBeatKey: 'central' }, '1,1');
        if (name.label) expect(formatLocationName(name, (key) => key)).toBe(name.label.toUpperCase());
    });

    it('formats a name with its designator', () => {
        expect(formatLocationName({ nounKey: 'k', designator: 'B-07' }, () => 'PUMP HOUSE')).toBe('PUMP HOUSE B-07');
        expect(formatLocationName({ nounKey: 'k', designator: '' }, () => 'UNMARKED PASSAGE')).toBe('UNMARKED PASSAGE');
    });

    it.each(LOCALES)('has every name in %s', (locale) => {
        const dict = JSON.parse(readFileSync(new URL(`./locales/${locale}.json`, import.meta.url), 'utf8'));
        const missing = [...locationNameKeys(), 'ui.location.unscanned'].filter((key) => typeof lookup(dict, key) !== 'string');
        expect(missing).toEqual([]);
    });
});
