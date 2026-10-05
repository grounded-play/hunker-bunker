// Which weapon frames, weapon finishes and chassis each class can wear.
// Plain data, split out of src/loadout.js so the item catalog
// (src/data/itemCatalog.js) can read it without importing the loadout, which
// imports the fabricator, which reads the catalog.
import { COMMUNITY_CLASS_MAP } from './communitySkins.js';

export const DEFAULT_ARCHETYPES = Object.freeze({
    scout: 'talon',
    tank: 'siege_breaker',
    engineer: 'tesla_lock'
});

export const CLASS_ARCHETYPES = Object.freeze({
    scout: ['talon', 'talon_c'],
    tank: ['siege_breaker'],
    engineer: ['tesla_lock']
});

// Chassis skins with authored runtime meshes. Keep this list class-specific:
// loading a Scout chassis as a Tank would replace the operator silhouette, not
// merely recolor it. Additional catalog chassis can be added here when their
// corresponding runtime GLBs land.
export const CLASS_CHASSIS_SKINS = Object.freeze({
    // 4200/4207/4214/4228/4235 are static meshes with no skin binding;
    // 5001 uses the rigged Corpo Shadow Runner body until its own model lands.
    scout: ['4113', '4115', '4118', '4221', '5001', '5003', '5004', 'skin_scout_mayor_tina', ...(COMMUNITY_CLASS_MAP?.scout || [])],
    tank: ['4114', '4117', '4119', '5005', '5007', '5008', ...(COMMUNITY_CLASS_MAP?.tank || [])],
    engineer: ['4112', '4116', '5011', '5012', ...(COMMUNITY_CLASS_MAP?.engineer || [])]
});

export const ARCHETYPE_SKINS = Object.freeze({
    talon: ['2200', '4100', '4105', '4201', '4222'],
    // Achievement weapons 5002/5006/5009/5010 are equippable now and share
    // their frame's (or 4110's) model until dedicated art lands.
    talon_c: ['4101', '4104', '4108', '4110', '5002'],
    siege_breaker: ['4102', '4106', '4107', '4208', '4229', '5006'],
    tesla_lock: ['4103', '4109', '4111', '4215', '4236', '5009', '5010']
});
