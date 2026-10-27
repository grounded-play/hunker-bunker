#!/usr/bin/env node

// Reports why operator continuity should be captured from the equipped runtime
// state instead of pre-rendering every cosmetic combination.
import { CLASS_ARCHETYPES, ARCHETYPE_SKINS, CLASS_CHASSIS_SKINS } from '../../src/data/classArsenal.js';
import { CHASSIS_BODY_VARIANTS } from '../../src/chassisBodies.js';
import { WEAPON_SHEENS } from '../../src/weaponSheens.js';
import { OPERATOR_POLISHES } from '../../src/operatorPolishes.js';
import { getCatalogIdsByType, ITEM_TYPE } from '../../src/itemOwnership.js';

const classes = ['scout', 'tank', 'engineer'];
const shared = {
    weaponSheens: WEAPON_SHEENS.length,
    operatorPolishes: OPERATOR_POLISHES.length,
    charmsIncludingNone: getCatalogIdsByType(ITEM_TYPE.CHARM).length + 1,
    decalsIncludingNone: getCatalogIdsByType(ITEM_TYPE.DECAL).length + 1,
    modulesPerBayIncludingEmpty: getCatalogIdsByType(ITEM_TYPE.MOD).length + 1
};

const byClass = classes.map((classId) => {
    const weapons = CLASS_ARCHETYPES[classId]
        .reduce((total, archetype) => total + 1 + ARCHETYPE_SKINS[archetype].length, 0);
    const chassis = 1 + CLASS_CHASSIS_SKINS[classId]
        .reduce((total, id) => total + (CHASSIS_BODY_VARIANTS[String(id)]?.length ?? 1), 0);
    const coreAppearances = BigInt(chassis * weapons * shared.weaponSheens * shared.operatorPolishes);
    const fullLoadouts = coreAppearances
        * BigInt(shared.charmsIncludingNone)
        * BigInt(shared.decalsIncludingNone)
        * BigInt(shared.modulesPerBayIncludingEmpty) ** 2n;
    return { classId, chassis, weapons, coreAppearances, fullLoadouts };
});

const coreAppearances = byClass.reduce((total, row) => total + row.coreAppearances, 0n);
const fullLoadouts = byClass.reduce((total, row) => total + row.fullLoadouts, 0n);
const report = {
    generatedFrom: 'live Armory catalogs',
    shared,
    byClass: byClass.map((row) => ({
        ...row,
        coreAppearances: row.coreAppearances.toString(),
        fullLoadouts: row.fullLoadouts.toString()
    })),
    totals: {
        coreAppearances: coreAppearances.toString(),
        fullLoadouts: fullLoadouts.toString(),
        nineViewCoreImages: (coreAppearances * 9n).toString(),
        nineViewFullImages: (fullLoadouts * 9n).toString(),
        recommendedRuntimeCapturesPerEquippedLoadout: 9
    }
};

console.log(JSON.stringify(report, null, 2));

