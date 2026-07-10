import assert from 'node:assert/strict';
import {
    ACHIEVEMENT_STORAGE_KEY,
    AchievementEngine,
    hasAnyUnlock
} from '../src/achievements.js';

function makeStorage() {
    const map = new Map();
    return {
        get length() { return map.size; },
        key(index) { return [...map.keys()][index] ?? null; },
        getItem(key) { return map.has(key) ? map.get(key) : null; },
        setItem(key, value) { map.set(key, String(value)); },
        removeItem(key) { map.delete(key); }
    };
}

const storage = makeStorage();
const engine = new AchievementEngine({ storage, now: () => 1000 });

assert.equal(hasAnyUnlock(engine.getState()), false, 'fresh profile keeps achievements button gated');

const result = engine.recordRunEnd({
    outcome: 'death',
    runMs: 3200,
    classType: 'SCOUT',
    snailsKilled: 0,
    depthTier: 0
});

assert.deepEqual(result.newUnlocks.map((unlock) => unlock.key), ['quick_study']);
assert.equal(hasAnyUnlock(result.state), true, 'first unlock opens achievements page gate');

const stored = JSON.parse(storage.getItem(ACHIEVEMENT_STORAGE_KEY));
assert.equal(stored.unlocked.quick_study.unlockedAt, 1000);

console.log(JSON.stringify({
    buttonVisibleBefore: false,
    unlocked: result.newUnlocks.map(({ key, title, blurb }) => ({ key, title, blurb })),
    buttonVisibleAfter: hasAnyUnlock(stored)
}, null, 2));
