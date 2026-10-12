import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { RESIDENT_ROLES, campResidents, residentLineKey, residentRoleKey } from './campResidents.js';

const LOCALES = ['en', 'de', 'es-419', 'ja', 'pt-BR', 'ru', 'zh-CN'];
const lookup = (dict, key) => key.split('.').reduce((node, part) => node?.[part], dict);

describe('camp residents', () => {
    it('gives every camp two named residents with jobs, the same every time', () => {
        expect(campResidents('camp_meridian').map((r) => r.name)).toEqual(['Rook', 'Ilse']);
        const generated = campResidents('camp_somewhere_new');
        expect(generated).toHaveLength(2);
        expect(generated.every((r) => r.name && RESIDENT_ROLES.includes(r.role))).toBe(true);
        expect(campResidents('camp_somewhere_new')).toEqual(generated);
    });

    it('moves through a resident’s lines, and worries while the camp is breached', () => {
        const rook = { name: 'Rook', role: 'mechanic' };
        expect(residentLineKey(rook, { talks: 0 })).toBe('ui.camp_resident.mechanic.1');
        expect(residentLineKey(rook, { talks: 1 })).toBe('ui.camp_resident.mechanic.2');
        expect(residentLineKey(rook, { talks: 3 })).toBe('ui.camp_resident.mechanic.1');
        expect(residentLineKey(rook, { condition: 'breached' })).toMatch(/^ui\.camp_resident\.worried\./);
        expect(residentLineKey({ name: 'Ada', role: 'settler' })).toMatch(/^ui\.camp_resident\.settler\./);
    });

    it.each(LOCALES)('has every line and job name in %s', (locale) => {
        const dict = JSON.parse(readFileSync(new URL(`../locales/${locale}.json`, import.meta.url), 'utf8'));
        const keys = [...RESIDENT_ROLES, 'settler'].map(residentRoleKey);
        for (const role of [...RESIDENT_ROLES, 'settler']) {
            for (let talks = 0; talks < 3; talks += 1) keys.push(residentLineKey({ role }, { talks }));
        }
        keys.push(residentLineKey({ role: 'cook' }, { condition: 'overrun', talks: 1 }));
        expect(keys.filter((key) => typeof lookup(dict, key) !== 'string')).toEqual([]);
    });
});
