// Recognizable site identities over the seeded territory route. Each beat is
// one real chamber; all four optional sockets let the macro planner bend the
// six-room sequence without cutting through the authored fixtures.
export const TERRITORY_SITE_PROFILES = Object.freeze({
    camp_meridian: { label: 'Meridian', family: 'camp', signature: 'prop_camp_meridian_radio', service: 'prop_camp_meridian_repair_rig' },
    camp_tallow: { label: 'Tallow', family: 'camp', signature: 'prop_camp_tallow_still', service: 'prop_camp_tallow_spore_trays' },
    camp_vesper: { label: 'Vesper', family: 'camp', signature: 'prop_camp_vesper_turret', service: 'prop_camp_vesper_ammo_press' },
    hive_suture: { label: 'Suture', family: 'hive', signature: 'prop_hive_suture_organ', service: 'prop_hive_wound_cauterizer' },
    hive_relay: { label: 'Relay', family: 'hive', signature: 'prop_hive_relay_antenna', service: 'prop_hive_synaptic_web' },
    hive_carapace: { label: 'Carapace', family: 'hive', signature: 'prop_hive_chitin_hatchery', service: 'prop_hive_carapace_molt' }
});

const BEATS = Object.freeze({
    camp: {
        approach: { label: 'Signal approach', width: 15, height: 21, safe: false, enemies: 2 },
        perimeter: { label: 'Defensive perimeter', width: 23, height: 15, safe: false, enemies: 3 },
        central: { label: 'Common ground', width: 29, height: 27, safe: true, enemies: 0 },
        service: { label: 'Workshop', width: 23, height: 19, safe: true, enemies: 0 },
        leader_quest: { label: 'Command room', width: 19, height: 23, safe: true, enemies: 0 },
        exit: { label: 'Mission departure', width: 15, height: 19, safe: false, enemies: 1 }
    },
    hive: {
        warning: { label: 'Warning chamber', width: 17, height: 19, safe: false, enemies: 1 },
        approach: { label: 'Contaminated approach', width: 15, height: 23, safe: false, enemies: 3 },
        outer_nest: { label: 'Defended nest', width: 25, height: 21, safe: false, enemies: 5 },
        choice_chamber: { label: 'Communion chamber', width: 29, height: 27, safe: true, enemies: 0 },
        consequence: { label: 'Resin nursery', width: 23, height: 19, safe: false, enemies: 2 },
        escape: { label: 'Escape passage', width: 15, height: 21, safe: false, enemies: 2 }
    }
});

export function createTerritoryRoomBuild(reservation) {
    const profile = TERRITORY_SITE_PROFILES[reservation?.siteId];
    if (!profile || reservation.roomFamily !== profile.family) return null;
    const beatKey = reservation.territoryBeatKey
        ?? (profile.family === 'camp' ? 'central' : 'choice_chamber');
    const beat = BEATS[profile.family][beatKey];
    if (!beat) return null;
    const variant = (Number(reservation.territoryVariant) >>> 0) % 3;
    const { width, height } = beat;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const pattern = Array.from({ length: height }, () => Array(width).fill('.'));
    const heart = beatKey === 'central' || beatKey === 'choice_chamber';
    // A broad clear center accommodates the existing camp/hive entity, NPCs,
    // and interaction radii. Outer rooms vary cover while keeping entrances
    // and the central three-wide cross clear for every possible route turn.
    const fixtures = heart
        ? [{ x: 3, y: 3, w: 3, h: 3 }, { x: width - 6, y: height - 6, w: 3, h: 3 }]
        : [{ x: 3, y: 3, w: 2 + variant, h: 2 }, { x: width - 5, y: height - 6, w: 2, h: 2 + variant }];
    for (const fixture of fixtures) {
        for (let y = fixture.y; y < fixture.y + fixture.h; y += 1) {
            for (let x = fixture.x; x < fixture.x + fixture.w; x += 1) pattern[y][x] = '#';
        }
    }
    const service = beatKey === 'service' || beatKey === 'consequence';
    const structuralAnchors = fixtures.map((fixture, index) => ({
        id: `${reservation.siteId}:${beatKey}:fixture:${index}`,
        type: service ? profile.service : profile.signature,
        x: fixture.x, y: fixture.y
    }));
    return {
        id: `${reservation.siteId}_${beatKey}_v${variant + 1}`,
        family: profile.family,
        label: `${profile.label} — ${beat.label}`,
        territoryBeatKey: beatKey,
        siteId: reservation.siteId,
        pattern: pattern.map((row) => row.join('')),
        sockets: ['n', 'e', 's', 'w'].map((side, index) => ({ id: `threshold_${side}`, side, width: 3, required: index === 0 })),
        rotationPolicy: 'cardinal',
        tierEligibility: [1, 2, 3, 4, 5],
        biomeEligibility: ['active', 'cryo', 'bio'],
        roles: [beat.safe ? 'support' : 'encounter'],
        structuralAnchors,
        // This anchor is consumed by the existing site entity placement. It
        // describes a position, so it deliberately has no duplicate prop.
        interactionAnchors: [],
        compassAnchors: { approach: 'threshold_n', objective: 'territory_center' },
        coverZones: fixtures,
        encounterZones: beat.safe ? [] : [{ id: `${beatKey}_defenders`, x: centerX - 2, y: centerY - 2, w: 5, h: 5 }],
        rewardAnchors: [],
        loreAnchors: [],
        hazardZones: [],
        quietZones: beat.safe ? [{ x: 0, y: 0, w: width, h: height }] : [],
        safeZone: beat.safe,
        containmentBounds: { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 },
        presentationVariants: ['intact'],
        stateVariants: ['dormant', 'resolved'],
        adjacency: { prefers: [], forbids: [] },
        contentBudget: { structuralLarge: 2, activityZones: beat.safe ? 0 : 1, pickupsMin: 0, enemiesMax: beat.enemies },
        centerAnchor: { id: 'territory_center', kind: 'site', x: centerX, y: centerY }
    };
}
