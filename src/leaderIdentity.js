const LEADER_IDENTITIES = Object.freeze({
    kaelen: Object.freeze({
        id: 'kaelen',
        name: 'Overseer Kaelen',
        portrait: '/lore_portraits/meridian_kaelen.png',
        sprite: '/kaelen_camp_walk_v2.png',
        classId: 'ENGINEER',
        accent: '#52e5ff',
        modelUrl: '/3d/runtime/new3ds/npc_kaelen.glb'
    }),
    martha: Object.freeze({
        id: 'martha',
        name: 'Sister Martha',
        portrait: '/lore_portraits/tallow_martha.png',
        sprite: '/martha_camp_walk_v2.png',
        classId: 'SCOUT',
        accent: '#9cff85',
        modelUrl: '/3d/runtime/new3ds/npc_martha.glb'
    }),
    briggs: Object.freeze({
        id: 'briggs',
        name: 'Commander Briggs',
        portrait: '/lore_portraits/vesper_briggs.png',
        sprite: '/briggs_camp_walk_v2.png',
        classId: 'TANK',
        accent: '#ffb85c',
        modelUrl: '/3d/runtime/new3ds/chassis_trench_warden_heavy.glb'
    }),
    scientist: Object.freeze({
        id: 'scientist',
        name: 'Dr. Nahl',
        portrait: '/lore_portraits/survivor_04.webp',
        sprite: '/civilian_researcher_walk.png',
        classId: 'ENGINEER',
        accent: '#c4a7ff',
        modelUrl: '/3d/runtime/new3ds/npc_nahl.glb'
    }),
    val: Object.freeze({
        id: 'val',
        name: 'Val',
        portrait: '/lore_portraits/survivor_08.webp',
        sprite: '/civilian_researcher_walk.png',
        classId: 'ENGINEER',
        accent: '#ff8800',
        modelUrl: '/3d/runtime/new3ds/npc_val.glb'
    }),
    aria: Object.freeze({
        id: 'aria',
        name: 'Aria',
        portrait: '/lore_portraits/queen_00.webp',
        sprite: '/civilian_researcher_walk.png',
        classId: 'SCOUT',
        accent: '#00f0ff',
        modelUrl: '/3d/runtime/new3ds/npc_aria.glb'
    })
});

const CLASS_MODELS = Object.freeze({
    SCOUT: Object.freeze({ modelUrl: '/3d/scouting-scout/Scout.game.glb' }),
    ENGINEER: Object.freeze({
        modelUrl: '/3d/runtime/engineer-rigged-gestures.glb',
        animationModelUrl: '/3d/scouting-scout/Scout.game.glb',
        animationBonePrefix: 'mixamorig'
    }),
    TANK: Object.freeze({
        modelUrl: '/3d/runtime/tank-rigged.glb',
        animationModelUrl: '/3d/scouting-scout/Scout.game.glb',
        animationBonePrefix: 'mixamorig'
    })
});

export function leaderKeyFromIdentity({ id = '', leaderName = '' } = {}) {
    const haystack = `${id} ${leaderName}`.toLowerCase();
    return Object.keys(LEADER_IDENTITIES).find((key) => haystack.includes(key)) ?? null;
}
export function resolveLeaderIdentity(detail = {}) {
    const key = leaderKeyFromIdentity(detail);
    const known = key ? LEADER_IDENTITIES[key] : null;
    const classId = String(detail.leaderClassId || known?.classId || 'SCOUT').toUpperCase();
    const model = known?.modelUrl
        ? {
            modelUrl: known.modelUrl,
            animationModelUrl: '/3d/scouting-scout/Scout.game.glb',
            animationBonePrefix: 'mixamorig'
        }
        : (CLASS_MODELS[classId] || CLASS_MODELS.SCOUT);

    return {
        id: key ?? detail.id ?? 'unknown',
        name: detail.leaderName || known?.name || 'SURVIVOR',
        title: detail.leaderTitle || '',
        callsign: detail.leaderCallsign || '',
        portrait: detail.portrait || known?.portrait || '/lore_portraits/survivor_00.webp',
        sprite: detail.sprite || known?.sprite || '/civilian_researcher_walk.png',
        classId,
        accent: known?.accent || '#9cff85',
        model
    };
}

export function dialogueReactionForLine(line = '', leaderId = '') {
    const text = String(line).toLowerCase();
    const leader = String(leaderId).toLowerCase();

    // Leader-specific signature reactions
    if (/\b(welcome|greetings|hail|arrive|here)\b/.test(text)) {
        if (leader.includes('kaelen')) return { mood: 'formal', idle: 'idle', gesture: 'standingGreeting' };
        if (leader.includes('briggs')) return { mood: 'commanding', idle: 'idle', gesture: 'beckoning' };
        if (leader.includes('martha')) return { mood: 'warm', idle: 'heroIdle', gesture: 'happyHand' };
        if (leader.includes('val')) return { mood: 'busy', idle: 'idle', gesture: 'pointingForward' };
        if (leader.includes('scientist') || leader.includes('nahl')) return { mood: 'inquiring', idle: 'idle', gesture: 'rummaging' };
    }
    if (/\b(leave|farewell|dismiss|go|move on|hearth)\b/.test(text) && leader.includes('martha')) {
        return { mood: 'dismissal', idle: 'idle', gesture: 'dismissingGesture' };
    }
    if (/\b(no|never|wrong|do not|don't|refuse|hostile|stop)\b/.test(text)) {
        return { mood: 'refusal', idle: 'idle', gesture: 'engineerNo' };
    }
    if (/\b(thank|good|trust|welcome|safe|beautiful|promise|agree)\b/.test(text)) {
        return { mood: 'warm', idle: 'heroIdle', gesture: 'engineerNod' };
    }
    if (/\b(died|dead|blood|hurt|wrong|fear|dark|coming|warning|lost)\b/.test(text)) {
        return { mood: 'uneasy', idle: 'injuredIdle', gesture: 'engineerLookAway' };
    }
    if (/\b(think|maybe|probably|wonder|dream|whisper|analyze|formula)\b/.test(text)) {
        return { mood: 'thoughtful', idle: 'idle', gesture: 'engineerThoughtful' };
    }
    return { mood: 'neutral', idle: 'idle', gesture: 'engineerAcknowledge' };
}

export function preloadLeaderMedia(identity, ImageCtor = globalThis.Image) {
    if (!identity?.portrait || typeof ImageCtor !== 'function') return null;
    const image = new ImageCtor();
    image.src = identity.portrait;
    return image;
}
