#!/usr/bin/env node

// Build the local-GPU microclip queue directly from the live Armory catalog.
// The output is additive: one class-correct clip per visible choice, never one
// pre-render per complete loadout combination.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCatalogEntry, getCatalogIdsByType, ITEM_TYPE } from '../../src/itemOwnership.js';
import { getItem } from '../../src/data/itemCatalog.js';
import { ARMORY_PREVIEWS } from '../../src/data/armoryPreviews.js';
import { ARCHETYPE_SKINS, CLASS_ARCHETYPES } from '../../src/data/classArsenal.js';
import { getArmoryModel } from '../../src/armoryAssets.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputPath = path.join(root, 'scripts/cinematics/loadout-clip-jobs.json');
const opening = JSON.parse(fs.readFileSync(path.join(root, 'scripts/cinematics/opening-shots.json'), 'utf8'));

const classes = {
    scout: {
        label: 'Scout',
        character: 'art/source/art-remaster/sprite-v4/scout/identity/Scout.front-idle-master.png',
        defaultWeapon: 'public/economy/gun_scout_vector9_talon_large.png',
        body: 'slim sealed Scout armour, glossy bone-white plates, black undersuit, asymmetric amber and cyan knee lights',
        handling: 'fast, exact hand movement with almost no wasted motion'
    },
    tank: {
        label: 'Tank',
        character: 'art/source/art-remaster/sprite-v4/tank/identity/Tank.front-idle-master.png',
        defaultWeapon: 'public/economy/gun_tank_siege_breaker50_large.png',
        body: 'massive sealed Tank armour, olive-brown plates, huge rounded pauldrons and narrow amber visor',
        handling: 'deliberate heavy movement with convincing mass and mechanical resistance'
    },
    engineer: {
        label: 'Engineer',
        character: 'art/source/art-remaster/sprite-v4/engineer/identity/Engineer.front-idle-master.png',
        defaultWeapon: 'public/economy/gun_engineer_tesla_lock_large.png',
        body: 'sealed Engineer utility armour, tan and gunmetal plates, cyan visor and forearm tool braces',
        handling: 'practised technical movement, checking every latch and contact'
    }
};

function repoPath(url) {
    if (!url) return null;
    return url.startsWith('/') ? `public${url}` : url;
}

function safeId(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

function physicalTruth(id, fallback = null) {
    const preview = ARMORY_PREVIEWS[String(id)];
    return {
        model: preview?.model ?? getArmoryModel(id) ?? null,
        plate: repoPath(preview?.icon ?? fallback)
    };
}

function target(id) {
    return {
        webm: `/cutscenes/loadout/${id}.webm`,
        mp4: `/cutscenes/loadout/${id}.mp4`,
        poster: `/cutscenes/loadout/${id}-poster.jpg`
    };
}

function commonJob({ id, cls, slot, itemId, itemName, truth, firstPrompt, action, lastFrame, extraReferences = [] }) {
    const operator = classes[cls];
    if (!truth.plate) throw new Error(`${id}: no physical reference plate`);
    return {
        id,
        kind: 'loadout',
        slot,
        class: cls.toUpperCase(),
        itemId: String(itemId),
        itemName,
        physicalTruth: {
            model: truth.model,
            sourcePlate: truth.plate,
            rule: 'The model and source plate define geometry, texture, markings, colour placement and proportions. Prompt text may light and stage the item but may not redesign it.'
        },
        propPass: {
            model: 'flux',
            source: truth.plate,
            prompt: `Isolated production paintover of ${itemName} from reference image 1, exact silhouette, exact materials, exact texture and markings, three-quarter product view on neutral middle-grey, fully visible, no hands, no scenery, no text, no redesign.`
        },
        firstFrame: {
            model: 'flux',
            plate: truth.plate,
            prompt: firstPrompt,
            references: [operator.character, ...extraReferences]
        },
        identityLock: `IDENTITY LOCK: reference image 2 is the ${operator.label}; preserve ${operator.body}. PROP LOCK: reference image 1 is ${itemName}; preserve its exact silhouette, texture, markings, colours, scale and attachment points in every frame.`,
        action,
        lastFrame,
        durationSec: 2.25,
        audio: '/audio/ambient/room_tone_safe_ship.ogg',
        generateSound: false,
        targets: target(id),
        loras: { flux: [], zimage: [], wan: [] }
    };
}

const jobs = [];

// Weapon choices are already class-bound by the Armory data. Each base frame
// and each finish gets one grab; this is 27 clips across the three classes.
for (const [cls, archetypes] of Object.entries(CLASS_ARCHETYPES)) {
    for (const archetype of archetypes) {
        const choices = [`frame:${archetype}`, ...(ARCHETYPE_SKINS[archetype] ?? [])];
        for (const choice of choices) {
            const item = getItem(choice, { classId: cls, frameId: `frame:${archetype}` });
            if (!item) throw new Error(`Unknown weapon choice ${choice}`);
            const id = `loadout-${cls}-weapon-${safeId(choice)}`;
            const truth = physicalTruth(choice, item.iconUrl);
            jobs.push(commonJob({
                id, cls, slot: 'weapon', itemId: choice, itemName: item.name, truth,
                firstPrompt: `Tight waist-level locker shot. ${item.name} from reference image 1 rests alone in a blackened-iron weapon cradle, muzzle pointing safely screen right. The ${classes[cls].label} from reference image 2 stands at screen left, only the class-correct torso, sealed helmet and reaching weapon hand visible. The hand is open and five centimetres from the authored grip; the whole weapon remains readable. One amber locker practical and a restrained class-colour diagnostic reflection.`,
                action: `0–0.55 s: the ${classes[cls].label}'s empty gloved hand crosses the final gap and closes around the real grip of ${item.name}. 0.55–1.45 s: ${classes[cls].handling}; the weapon lifts cleanly from the cradle without bending, changing finish or growing parts. 1.45–2.25 s: the operator draws it into the class-correct ready carry and performs one short mechanical weight check; the empty cradle remains behind.`,
                lastFrame: `The same ${classes[cls].label} holding the exact ${item.name} securely in a class-correct low-ready pose, weapon fully readable, empty cradle behind, same camera and lighting, no duplicate weapon.`
            }));
        }
    }
}

// A badge is shared inventory, but its placement is class-body-specific. A
// clip per class prevents the generator from inventing a generic suit.
for (const rawId of getCatalogIdsByType(ITEM_TYPE.DECAL)) {
    const entry = getCatalogEntry(rawId);
    const truth = physicalTruth(rawId, entry?.localImgLarge ?? entry?.localImg);
    for (const cls of Object.keys(classes)) {
        const id = `loadout-${cls}-badge-${safeId(rawId)}`;
        jobs.push(commonJob({
            id, cls, slot: 'badge', itemId: rawId, itemName: entry.name, truth,
            firstPrompt: `Macro three-quarter view of the ${classes[cls].label}'s class-correct upper torso from reference image 2. ${entry.name} from reference image 1 is held face-on between two gloved fingers, five centimetres from a clean magnetic badge rail on the upper chest; its complete design is readable and correctly oriented. Preserve the actual armour plate seams and materials. Amber work light, thin class-colour edge light, uncluttered dark fitting bay.`,
            action: `0–0.65 s: the ${classes[cls].label} aligns ${entry.name} with the chest badge rail, keeping the face upright and unobscured. 0.65–1.35 s: the badge meets the armour with one firm magnetic click and seats flat; no morphing, stitching or new graphics. 1.35–2.25 s: the gloved thumb presses once across the lower edge, withdraws, and the operator turns a few degrees so the badge catches the amber light.`,
            lastFrame: `${entry.name} mounted flat, upright and fully readable on the correct ${classes[cls].label} chest plate from reference image 2, operator's hand withdrawn, exact same badge design, armour and light direction.`
        }));
    }
}

// Charm shots stay very tight on a standardised class socket. This preserves
// the class glove without multiplying charms by every weapon finish.
for (const rawId of getCatalogIdsByType(ITEM_TYPE.CHARM)) {
    const entry = getCatalogEntry(rawId);
    const truth = physicalTruth(rawId, entry?.localImgLarge ?? entry?.localImg);
    for (const cls of Object.keys(classes)) {
        const id = `loadout-${cls}-charm-${safeId(rawId)}`;
        jobs.push(commonJob({
            id, cls, slot: 'charm', itemId: rawId, itemName: entry.name, truth,
            extraReferences: [classes[cls].defaultWeapon],
            firstPrompt: `Extreme macro fitting shot. ${entry.name} from reference image 1 hangs between the ${classes[cls].label}'s class-correct gloved fingers from reference image 2. Only a small dark section of the class weapon's standard charm socket from reference image 3 is visible at the opposite edge; crop away the weapon body so this insert remains valid for every finish. The charm and clasp are fully readable, separated by two centimetres, amber bench light and restrained class-colour rim.`,
            action: `0–0.7 s: the ${classes[cls].label} guides the clasp of ${entry.name} toward the fixed socket without hiding the charm. 0.7–1.25 s: the clasp closes once around the socket with physically correct fingers and no geometry changes. 1.25–2.25 s: the hand releases; the charm drops under gravity, swings through one small damped arc and settles, while the cropped socket remains rigid.`,
            lastFrame: `The exact ${entry.name} hanging freely from the class-standard weapon socket, clasp closed, one class-correct gloved hand just withdrawn, charm face and material readable, weapon body still cropped out, same camera and lighting.`
        }));
    }
}

const counts = jobs.reduce((result, job) => {
    result[job.slot] = (result[job.slot] ?? 0) + 1;
    return result;
}, {});

const payload = {
    source: 'Generated from the live Armory catalog; visual authority: docs/design/art-style-bible.md (unchanged)',
    generatedBy: 'node scripts/cinematics/build-loadout-clip-jobs.mjs',
    strategy: 'class-correct additive slot clips; runtime plays weapon + badge + charm for the selected loadout',
    counts: { ...counts, total: jobs.length, combinationRendersAvoided: 9936 },
    style: {
        ...opening.style,
        plateLock: 'PROP PLATE LOCK: reference image 1 is physical truth, not inspiration. Preserve its silhouette, proportions, material breaks, textures, markings, colours and attachment points exactly; do not redesign, simplify, decorate or substitute it.'
    },
    jobs
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputPath)}: ${counts.weapon} weapon + ${counts.badge} badge + ${counts.charm} charm = ${jobs.length} clips.`);
