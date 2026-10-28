import { t } from './i18n.js';

const ELEMENT_COLORS = Object.freeze({ cryo: '#7df2ff', bio: '#b9ff78', fusion: '#a7ffeb', kinetic: '#ffe082', corrupted: '#ff8a80' });

// Statically visible key references for scripts/audit-i18n.js
export const RECALIBRATION_FEEDBACK_KEYS = Object.freeze({
    cryo_rime: { action: 'recalibration_feedback.mods.cryo_rime.action', tradeoff: 'recalibration_feedback.mods.cryo_rime.tradeoff' },
    caustic_payload: { action: 'recalibration_feedback.mods.caustic_payload.action', tradeoff: 'recalibration_feedback.mods.caustic_payload.tradeoff' },
    subzero_necrosis: { action: 'recalibration_feedback.mods.subzero_necrosis.action', tradeoff: 'recalibration_feedback.mods.subzero_necrosis.tradeoff' },
    kinetic_hollow_point: { action: 'recalibration_feedback.mods.kinetic_hollow_point.action', tradeoff: 'recalibration_feedback.mods.kinetic_hollow_point.tradeoff' },
    hyper_split_core: { action: 'recalibration_feedback.mods.hyper_split_core.action', tradeoff: 'recalibration_feedback.mods.hyper_split_core.tradeoff' },
    corrupted_overcharge: { action: 'recalibration_feedback.mods.corrupted_overcharge.action', tradeoff: 'recalibration_feedback.mods.corrupted_overcharge.tradeoff' },
    o2_siphon_chamber: { action: 'recalibration_feedback.mods.o2_siphon_chamber.action', tradeoff: 'recalibration_feedback.mods.o2_siphon_chamber.tradeoff' }
});

/** Read-only presentation of an already committed recalibration. */
export function getRecalibrationFeedback(choice, translate = t) {
    if (!choice?.id) return null;
    const mapped = RECALIBRATION_FEEDBACK_KEYS[choice.id];
    const key = `recalibration_feedback.mods.${choice.id}`;
    return {
        name: translate(choice.nameKey, {}, choice.name ?? choice.id),
        action: translate(mapped?.action ?? `${key}.action`, {}, choice.description ?? ''),
        tradeoff: translate(mapped?.tradeoff ?? `${key}.tradeoff`, {}, ''),
        color: ELEMENT_COLORS[choice.element] ?? ELEMENT_COLORS.kinetic
    };
}

export function createRecalibrationInstallSequence({ campId, choice } = {}) {
    if (!campId || !choice?.id) return null;
    const feedback = getRecalibrationFeedback(choice);
    return {
        id: `field_recalibration_install:${campId}:${choice.id}`,
        campId,
        remember: false,
        anchors: { socket: 'field_recalibration_socket' },
        actors: { player: true },
        steps: [
            { do: 'lockInput' },
            { do: 'camera', shot: 'medium', target: 'socket', ms: 400 },
            { do: 'fx', anchor: 'socket', effect: 'recalibration_pulse', color: feedback.color },
            { do: 'line', speaker: 'WORKBENCH', key: 'recalibration_feedback.installed', params: { name: feedback.name }, holdMs: 1800 },
            { do: 'camera', shot: 'gameplay', ms: 350 },
            { do: 'unlockInput' }
        ],
        // No rewards, payment, or gameplay mutations. Skipping restores
        // control to precisely the state committed by the workbench.
        endState: {},
        skip: 'applyEndStateAndResume'
    };
}
