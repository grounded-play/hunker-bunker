const AUTHORED_TARGET_NAMES = Object.freeze({
    cybersnail: 'CYBER SNAIL',
    cryosnail: 'CRYO SNAIL',
    sporesnail: 'SLIME SNAIL',
    boss_cybersnail: 'IRON-SHELL CYBER SNAIL',
    boss_cryosnail: 'ABSOLUTE-ZERO CRYO SNAIL',
    boss_sporesnail: 'PLAGUESHELL SLIME SNAIL',
    fungal_spore_vent: 'FUNGAL SPORE VENT',
    spore_mortar: 'SPORE MORTAR',
    mycelium_stalker: 'MYCELIUM STALKER',
    bio_charger: 'BIO CHARGER',
    prop_specimen_tank: 'SPECIMEN TANK',
    prop_broken_specimen_tank: 'RUPTURED SPECIMEN TANK',
    prop_bunker_supplies: 'BUNKER SUPPLY CACHE',
    prop_security_barricade: 'SECURITY BARRICADE',
    prop_security_locker: 'SECURITY LOCKER',
    bunker_junk_rare: 'RARE BUNKER SALVAGE',
    bunker_junk_uncommon: 'BUNKER SALVAGE'
});

const TECHNICAL_PREFIX = /^(?:prop|scatter|state|arch|fixture|body|npc)_/;

export function formatTacticalTargetName(type, authoredName = '') {
    const explicit = String(authoredName ?? '').trim();
    if (explicit) return explicit.toUpperCase();
    const key = String(type ?? '').trim().toLowerCase();
    if (!key) return 'UNKNOWN OBJECT';
    if (AUTHORED_TARGET_NAMES[key]) return AUTHORED_TARGET_NAMES[key];
    return key
        .replace(/^boss_/, '')
        .replace(TECHNICAL_PREFIX, '')
        .replace(/_/g, ' ')
        .replace(/\bo2\b/g, 'O₂')
        .replace(/\b0([1-9])\b/g, 'MARK $1')
        .toUpperCase();
}

export function tacticalNameForObject(object) {
    const data = object?.userData ?? object ?? {};
    return formatTacticalTargetName(
        data.type ?? data.world3dModelType,
        data.displayName ?? data.label ?? data.authoredName
    );
}

export function hasVisibleTacticalRepresentation(object) {
    if (!object?.parent) return false;
    if (object.visible !== false) return true;
    if (object.userData?.world3dRoot?.parent && object.userData.world3dRoot.visible !== false) return true;
    if (object.userData?.enemy3dVisual?.root?.parent
        && object.userData.enemy3dVisual.root.visible !== false) return true;
    return false;
}
