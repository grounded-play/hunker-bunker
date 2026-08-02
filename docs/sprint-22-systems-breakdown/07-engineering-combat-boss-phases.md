# Engineering Deep Dive: Combat & Boss Phases

## The Current State of Combat
Currently, combat is defined in `src/data/enemies.js` and instantiated in `src/threeGame.js`.
Enemies act as basic objects with a `maxHp` and `speed` property. 
For example, the primary boss is defined as:
```javascript
boss_cybersnail: { maxHp: 15, speed: 1.5 },
```
*Note: A recent commit dropped this from 20 HP to 15 HP, but the test `src/data/enemies.test.js` still asserts 20 HP, causing a pipeline failure.*

## The Boss Phase Framework (Sprint 22)
To fix the "sponge" problem (where bosses just walk at the player), we must implement a finite state machine for boss encounters.

### Architecture Plan
1. **Create `src/bossPhases.js`**: A new module that exports state definitions for each boss.
2. **Phase Thresholds**: 
   - Phase 1 (100% - 50% HP): Standard pattern (e.g., walk and shoot).
   - Phase 2 (50% - 0% HP): Enraged pattern (e.g., spawn adds, increase speed, unlock secondary attack).
3. **Weak-Point Windows**:
   - Expose a boolean `isStaggered` on the enemy mesh user data.
   - Modify the damage calculation in `src/threeGame.js` to multiply damage by `3.0` if `isStaggered === true`.

## Mobility Verbs
Currently, only the Scout has a mobility verb (Sprint Burst). Sprint 22 requires standardizing this across classes.

### Implementation inside `src/threeGame.js`
- **Tank (Shoulder Slam):** Requires applying a forward velocity vector, triggering a short `knockback` impulse on colliding enemy meshes, and granting `invulnerable = true` for exactly `1-shock` duration (approx. 300ms).
- **Engineer (Overclock Slide):** Requires temporarily dropping the friction coefficient on the player controller and applying a high-speed vector for 500ms, consuming 5% of the O2 bar.
