// Body variants for chassis skins that ship more than one body under one item.
//
// 5001 Ghost Runner Recon Rig was delivered as a female and a male body
// (art/raw/incoming_3d_20261001). Both are the same Steam item, so ownership,
// saved loadouts and the network summary keep the bare item id; the body is a
// separate choice. The picker encodes the choice as `<id>:<body>` for any body
// after the first, so the default body is still just the item id.

export const CHASSIS_BODY_VARIANTS = Object.freeze({
    '5001': Object.freeze([
        Object.freeze({ body: 'female', url: '/3d/runtime/new3ds/chassis_scout_ghost_runner.glb' }),
        Object.freeze({ body: 'male', url: '/3d/runtime/new3ds/chassis_scout_ghost_runner_male.glb' })
    ])
});

function variantFor(id, body) {
    const variants = CHASSIS_BODY_VARIANTS[String(id)];
    if (!variants || !body) return null;
    const index = variants.findIndex((v) => v.body === body);
    return index > 0 ? variants[index] : null;
}

export function encodeChassisChoice(id, body) {
    if (id === null || id === undefined || id === '') return '';
    return variantFor(id, body) ? `${id}:${body}` : String(id);
}

export function decodeChassisChoice(value) {
    const text = value === null || value === undefined ? '' : String(value);
    if (!text) return { id: null, body: null };
    // Only a variant item's id is split, so other colon ids (`frame:talon`)
    // pass through whole.
    const [id, body] = text.split(':');
    if (!CHASSIS_BODY_VARIANTS[id]) return { id: text, body: null };
    return { id, body: variantFor(id, body) ? body : null };
}

export function resolveChassisModelUrl(id, body, baseModels) {
    if (id === null || id === undefined || id === '') return null;
    return variantFor(id, body)?.url ?? baseModels?.[String(id)] ?? null;
}

// One picker option per body for variant items. `labelFor(body)` supplies the
// localized body name; selection is recomputed against the encoded choice.
export function expandChassisBodyOptions(options, selectedChoice, labelFor) {
    const selected = selectedChoice ? String(selectedChoice) : '';
    const out = [];
    for (const option of options ?? []) {
        const variants = CHASSIS_BODY_VARIANTS[String(option.id)];
        if (!variants) {
            out.push(option);
            continue;
        }
        for (const { body } of variants) {
            const id = encodeChassisChoice(option.id, body);
            const isSelected = id === selected;
            const name = `${option.name} — ${labelFor(body)}`;
            out.push({ ...option, id, name, label: String(option.label ?? option.name).replace(option.name, name), selected: isSelected, disabled: Boolean(option.disabled) && !isSelected });
        }
    }
    return out;
}
