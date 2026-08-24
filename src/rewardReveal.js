// Season-pass reward reveal (Sprint 29 plan §7), Lane A.
//
// The 3D preview itself belongs to Lane B. This module owns the shell around
// it and declares the interface between them, so the reveal can ship and be
// tested against an honest "preview unavailable" state before any turntable
// exists.

import { PRESENTATION_EVENTS } from './presentationTelemetry.js';
import { mountRewardPreview as mountRewardPreview3d } from './rewardPreview.js';

/**
 * Mount a 3D preview of a reward into `container`.
 *
 * Lane B replaces this stub with the real turntable. The contract it must keep:
 *   - `ready` always resolves, never rejects -- a failed preview is a state the
 *     shell renders, not an exception it has to catch.
 *   - resolves `{ ok: true }` or `{ ok: false, reason }`.
 *   - `dispose()` releases GPU resources and is safe to call more than once.
 */
export function mountRewardPreview(options) {
    return mountRewardPreview3d(options);
}

// §3: reward reveals may share their entry motion, but they must not share
// their ending. The final beat is selected from the item definition rather
// than inferred from a generic animation-completion callback, so adding a
// reward category is a data change here and not new branching in the player.
const REWARD_FAMILIES = Object.freeze({
    weapon_skin: { family: 'weapon', ending: 'weapon-sweep', sound: 'reward_reveal_weapon', preview: '3d' },
    chassis_skin: { family: 'chassis', ending: 'chassis-turn', sound: 'reward_reveal_chassis', preview: '3d' },
    charm: { family: 'charm', ending: 'charm-snap', sound: 'reward_reveal_charm', preview: '3d' },
    rig_module: { family: 'module', ending: 'module-deploy', sound: 'reward_reveal_module', preview: '3d' },
    // Deliberately 2D: §7 forbids forcing a low-quality fake 3D preview onto
    // artwork that was never modelled.
    decal: { family: 'decal', ending: 'decal-stamp', sound: 'reward_reveal_decal', preview: '2d' },
    emblem: { family: 'decal', ending: 'decal-stamp', sound: 'reward_reveal_decal', preview: '2d' }
});

const GENERIC_FAMILY = Object.freeze({
    family: 'generic',
    ending: 'generic-settle',
    sound: 'reward_reveal_generic',
    preview: '2d'
});

export function selectRewardEnding(item) {
    return REWARD_FAMILIES[item?.category] ?? GENERIC_FAMILY;
}

/**
 * The claim -> grant -> reveal sequence (§7).
 *
 * Before Sprint 29 this was a single synchronous step: claim, grant, hide the
 * overlay. The player saw the panel disappear and nothing else -- no reveal, no
 * preview, no sting, no confirmation, and log16 recorded nothing after the
 * click. The ordering here is deliberate: the grant is confirmed by the
 * economy layer *first*, so a reveal is never shown for a reward the player
 * did not actually receive.
 */
export function createRewardRevealFlow({ telemetry, grant, mountPreview, playSound, present }) {
    const inFlight = new Set();

    async function run({ actionKey, item }) {
        // Repeated input must not grant, reveal, or sting twice (§7).
        if (inFlight.has(actionKey)) return { ok: false, reason: 'in-flight' };
        inFlight.add(actionKey);
        try {
            const E = PRESENTATION_EVENTS.REWARD;
            telemetry.emitOnce('REWARD', E.CLAIM_START, { actionKey }, actionKey);

            const granted = grant();
            if (!granted?.ok) {
                return { ok: false, reason: granted?.reason ?? 'grant-refused' };
            }
            telemetry.emitOnce('REWARD', E.GRANT_CONFIRMED, { actionKey }, actionKey);

            const ending = selectRewardEnding(item);
            present('reveal', ending);
            telemetry.emitOnce('REWARD', E.REVEAL_OPEN, { ending: ending.ending }, actionKey);

            const preview = mountPreview({ item, ending });
            const previewResult = await preview.ready;
            telemetry.emitOnce(
                'REWARD',
                previewResult.ok ? E.PREVIEW_READY : E.PREVIEW_FAILED,
                { reason: previewResult.reason ?? null },
                actionKey
            );

            present('burst', ending);
            telemetry.emitOnce('REWARD', E.BURST_FIRED, { ending: ending.ending }, actionKey);

            playSound(ending.sound);
            telemetry.emitOnce('REWARD', E.AUDIO_FIRED, { sound: ending.sound }, actionKey);

            return { ok: true, previewOk: previewResult.ok, ending, dispose: preview.dispose };
        } finally {
            inFlight.delete(actionKey);
        }
    }

    return { run };
}

/**
 * What a key should do while the reward ceremony is on screen.
 *
 * Escape must not be able to discard a reward the player has earned but not
 * yet claimed. Once the grant has happened, though, the reward is safely in
 * the inventory and dismissing the panel costs nothing -- so Escape becomes an
 * ordinary continue rather than staying trapped.
 */
export function resolveCeremonyKeyAction({ code, revealStage } = {}) {
    const revealed = Boolean(revealStage);
    if (code === 'Enter' || code === 'Space') return revealed ? 'continue' : 'claim';
    if (code === 'Escape') return revealed ? 'continue' : 'block';
    return null;
}
