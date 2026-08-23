// ── Season 0 Bounty & Directive System ──────────────────────────────
// Implements docs/season-zero-protocol/04-battle-pass-and-progression-tiers.md §2.
// Provides deterministic daily and weekly contracts, progress tracking,
// and automatic XP award distribution into SeasonPassManager.

export const STORAGE_KEY_BOUNTIES = 'hb_bounties_v1';
export const DAILY_BOUNTY_XP = 1500;
export const WEEKLY_OPERATION_XP = 7500;

export const DAILY_TEMPLATES = Object.freeze([
    {
        id: 'daily_kills',
        title: 'Pest Control',
        desc: 'Eliminate 25 subterranean hostiles.',
        target: 25,
        type: 'kills',
        xp: DAILY_BOUNTY_XP
    },
    {
        id: 'daily_dashes',
        title: 'Tactical Evasion',
        desc: 'Perform 15 combat dashes in subterranean encounters.',
        target: 15,
        type: 'dashes',
        xp: DAILY_BOUNTY_XP
    },
    {
        id: 'daily_objectives',
        title: 'Sector Survey',
        desc: 'Complete 3 mission objectives in any biome.',
        target: 3,
        type: 'objectives',
        xp: DAILY_BOUNTY_XP
    },
    {
        id: 'daily_bosses',
        title: 'Apex Hunt',
        desc: 'Terminate 1 sector world boss or brood queen.',
        target: 1,
        type: 'bosses',
        xp: DAILY_BOUNTY_XP
    },
    {
        id: 'daily_scrap',
        title: 'Scavenger Protocol',
        desc: 'Collect 50 scrap or salvage materials in combat.',
        target: 50,
        type: 'scrap',
        xp: DAILY_BOUNTY_XP
    },
    {
        id: 'daily_elites',
        title: 'Elite Purge',
        desc: 'Purge 2 enraged hostiles or elite sentinel nodes.',
        target: 2,
        type: 'elites',
        xp: DAILY_BOUNTY_XP
    },
    {
        id: 'daily_depth',
        title: 'Deep Descent',
        desc: 'Descend to Depth Tier 2 or deeper in an expedition.',
        target: 1,
        type: 'depth',
        xp: DAILY_BOUNTY_XP
    }
]);

export const WEEKLY_TEMPLATES = Object.freeze([
    {
        id: 'weekly_kills_120',
        title: 'Subterranean Exterminator',
        desc: 'Eliminate 120 hostiles across all sectors.',
        target: 120,
        type: 'kills',
        xp: WEEKLY_OPERATION_XP
    },
    {
        id: 'weekly_bosses_3',
        title: 'Brood Decimation',
        desc: 'Defeat 3 sector bosses (Sporesnail or Hive Queen).',
        target: 3,
        type: 'bosses',
        xp: WEEKLY_OPERATION_XP
    },
    {
        id: 'weekly_objectives_12',
        title: 'Expedition Commander',
        desc: 'Complete 12 mission objectives across all expeditions.',
        target: 12,
        type: 'objectives',
        xp: WEEKLY_OPERATION_XP
    },
    {
        id: 'weekly_scrap_300',
        title: 'Industrial Salvage',
        desc: 'Collect 300 total scrap from defeated enemies and caches.',
        target: 300,
        type: 'scrap',
        xp: WEEKLY_OPERATION_XP
    },
    {
        id: 'weekly_elites_8',
        title: 'Sentinel Neutralization',
        desc: 'Destroy 8 elite sentinels or enraged hive defenders.',
        target: 8,
        type: 'elites',
        xp: WEEKLY_OPERATION_XP
    },
    {
        id: 'weekly_dashes_60',
        title: 'High-Mobility Warfare',
        desc: 'Perform 60 combat dashes during live operations.',
        target: 60,
        type: 'dashes',
        xp: WEEKLY_OPERATION_XP
    },
    {
        id: 'weekly_depth_4',
        title: 'Stratum Zero Veteran',
        desc: 'Successfully reach deep sub-levels (Depth 2+) 4 times.',
        target: 4,
        type: 'depth',
        xp: WEEKLY_OPERATION_XP
    }
]);

export function getDailyDateKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function getWeeklyDateKey(date = new Date()) {
    const d = new Date(date);
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function stringToSeed(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function pseudoRandomShuffle(array, seed) {
    const copy = [...array];
    let s = seed;
    for (let i = copy.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const rnd = s / 233280;
        const j = Math.floor(rnd * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export class BountyManager {
    constructor({ storage = null, onAwardXp = null } = {}) {
        this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
        this.onAwardXp = onAwardXp;
        this.state = this.load();
    }

    load() {
        const todayDaily = getDailyDateKey();
        const currentWeekly = getWeeklyDateKey();

        try {
            const raw = this.storage?.getItem(STORAGE_KEY_BOUNTIES);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    let dailies = parsed.dailies;
                    let weeklies = parsed.weeklies;

                    if (parsed.dailyKey !== todayDaily || !Array.isArray(dailies) || dailies.length === 0) {
                        dailies = this.generateDailies(todayDaily);
                    }
                    if (parsed.weeklyKey !== currentWeekly || !Array.isArray(weeklies) || weeklies.length === 0) {
                        weeklies = this.generateWeeklies(currentWeekly);
                    }

                    const state = {
                        dailyKey: todayDaily,
                        weeklyKey: currentWeekly,
                        dailies,
                        weeklies
                    };
                    this.save(state);
                    return state;
                }
            }
        } catch {
            // fallback to fresh generation
        }

        const freshState = {
            dailyKey: todayDaily,
            weeklyKey: currentWeekly,
            dailies: this.generateDailies(todayDaily),
            weeklies: this.generateWeeklies(currentWeekly)
        };
        this.save(freshState);
        return freshState;
    }

    save(state = this.state) {
        if (!state) return;
        try {
            this.storage?.setItem(STORAGE_KEY_BOUNTIES, JSON.stringify(state));
        } catch {
            // ignore quota errors
        }
    }

    generateDailies(dateKey) {
        const seed = stringToSeed(`daily_${dateKey}`);
        const shuffled = pseudoRandomShuffle(DAILY_TEMPLATES, seed);
        return shuffled.slice(0, 3).map((tpl) => ({
            id: `${dateKey}_${tpl.id}`,
            templateId: tpl.id,
            title: tpl.title,
            desc: tpl.desc,
            target: tpl.target,
            type: tpl.type,
            xp: tpl.xp,
            progress: 0,
            completed: false,
            claimed: false
        }));
    }

    generateWeeklies(weekKey) {
        const seed = stringToSeed(`weekly_${weekKey}`);
        const shuffled = pseudoRandomShuffle(WEEKLY_TEMPLATES, seed);
        return shuffled.slice(0, 5).map((tpl) => ({
            id: `${weekKey}_${tpl.id}`,
            templateId: tpl.id,
            title: tpl.title,
            desc: tpl.desc,
            target: tpl.target,
            type: tpl.type,
            xp: tpl.xp,
            progress: 0,
            completed: false,
            claimed: false
        }));
    }

    getActiveDailies() {
        this.checkRotation();
        return this.state.dailies;
    }

    getActiveWeeklies() {
        this.checkRotation();
        return this.state.weeklies;
    }

    checkRotation() {
        const todayDaily = getDailyDateKey();
        const currentWeekly = getWeeklyDateKey();
        let changed = false;

        if (this.state.dailyKey !== todayDaily) {
            this.state.dailyKey = todayDaily;
            this.state.dailies = this.generateDailies(todayDaily);
            changed = true;
        }

        if (this.state.weeklyKey !== currentWeekly) {
            this.state.weeklyKey = currentWeekly;
            this.state.weeklies = this.generateWeeklies(currentWeekly);
            changed = true;
        }

        if (changed) {
            this.save();
        }
    }

    recordProgress(type, amount = 1) {
        if (!type || amount <= 0) return [];
        this.checkRotation();
        const completedBounties = [];

        let progressChanged = false;
        const allBounties = [...this.state.dailies, ...this.state.weeklies];
        for (const bounty of allBounties) {
            if (bounty.completed || bounty.type !== type) continue;
            const prev = bounty.progress;
            bounty.progress = Math.min(bounty.target, bounty.progress + amount);
            if (bounty.progress !== prev) progressChanged = true;
            if (bounty.progress >= bounty.target && !bounty.completed) {
                bounty.completed = true;
                // Completion makes the directive eligible; the player must
                // explicitly collect its XP from the Season screen.
                bounty.claimed = false;
                completedBounties.push(bounty);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('bounty-completed', { detail: { bounty } }));
                }
            }
        }

        if (progressChanged) {
            this.save();
        }
        return completedBounties;
    }

    claim(id) {
        const bounty = [...this.state.dailies, ...this.state.weeklies].find((entry) => entry.id === id);
        if (!bounty || !bounty.completed || bounty.claimed) return null;
        bounty.claimed = true;
        this.save();
        return bounty;
    }

    wireGameEvents() {
        if (typeof window === 'undefined') return;

        window.addEventListener('enemy-killed', (event) => {
            const detail = event.detail || {};
            this.recordProgress('kills', 1);
            if (detail.isBoss) {
                this.recordProgress('bosses', 1);
            }
            if (detail.enraged || detail.isSentinel || detail.isMilestone) {
                this.recordProgress('elites', 1);
            }
        });

        window.addEventListener('player-dashed', () => {
            this.recordProgress('dashes', 1);
        });

        window.addEventListener('mission-objective-complete', () => {
            this.recordProgress('objectives', 1);
        });

        window.addEventListener('depth-tier-changed', () => {
            this.recordProgress('depth', 1);
        });

        window.addEventListener('scrap-collected', (event) => {
            const amount = Number(event.detail?.amount) || 1;
            this.recordProgress('scrap', amount);
        });
    }
}
