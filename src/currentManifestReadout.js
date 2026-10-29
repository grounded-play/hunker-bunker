import { buildAct2Manifest } from './act2.js';
import { t } from './i18n.js';
import './styles/currentManifestReadout.css';

/**
 * The saved Act 2 defaults already contain the Queen and egg before the
 * reveal. Those are future story state, not claims the operator knows yet.
 * Read the canonical manifest, then expose only discovered claims; never
 * change the save or project an ending to explain current capacity.
 */
export function getCurrentManifestReadout(rawState = {}, options = {}) {
    const manifest = buildAct2Manifest(rawState, options);
    const revealed = Boolean(rawState?.begun);
    const humanSeats = manifest.humans.length;
    const alienSeats = revealed ? manifest.aliens.length : 0;
    const queenSeats = revealed && manifest.queen ? 2 : 0;
    const eggSeats = revealed && manifest.egg ? 1 : 0;
    const used = 1 + humanSeats + alienSeats + queenSeats + eggSeats;
    return {
        revealed,
        used,
        max: manifest.seatsMax,
        free: Math.max(0, manifest.seatsMax - used),
        humanSeats,
        alienSeats,
        queenSeats,
        eggSeats,
        blockers: revealed ? [...manifest.invalidReasons]
            : used > manifest.seatsMax ? ['seat_capacity_exceeded'] : []
    };
}

export function describeCurrentManifestReadout(rawState = {}, options = {}) {
    const view = getCurrentManifestReadout(rawState, options);
    const claims = [t('ui.current_manifest.operator')];
    if (view.humanSeats) claims.push(t('ui.current_manifest.survivors', { count: view.humanSeats }));
    if (view.alienSeats) claims.push(t('ui.current_manifest.allies', { count: view.alienSeats }));
    if (view.queenSeats) claims.push(t('ui.current_manifest.queen'));
    if (view.eggSeats) claims.push(t('ui.current_manifest.egg'));
    if (view.free) claims.push(t('ui.current_manifest.free', { count: view.free }));
    const warnings = view.blockers.map((reason) => {
        if (reason === 'seat_capacity_exceeded') {
            return t('ui.current_manifest.over_capacity', { count: view.used - view.max });
        }
        if (reason === 'egg_requires_nahl') return t('ui.current_manifest.egg_requires_nahl');
        if (reason === 'egg_unstable') return t('ui.current_manifest.egg_unstable');
        return '';
    }).filter(Boolean);
    return {
        ...view,
        title: view.revealed ? t('ui.current_manifest.title') : t('ui.current_manifest.known_title'),
        summary: t('ui.current_manifest.claimed', { used: view.used, max: view.max }),
        allocation: claims.join(' · '),
        warning: warnings.join(' ')
    };
}

/** Compact text in an existing camp surface; no new overlay or modal. */
export function renderCurrentManifestReadout(element, rawState = {}, options = {}) {
    if (!element) return null;
    const view = describeCurrentManifestReadout(rawState, options);
    element.textContent = '';
    element.dataset.manifestState = view.blockers.length ? 'blocked' : 'ready';
    for (const [part, text] of [
        ['title', view.title], ['summary', view.summary],
        ['allocation', view.allocation], ['warning', view.warning]
    ]) {
        if (!text) continue;
        const line = element.ownerDocument.createElement('span');
        line.className = `current-manifest__${part}`;
        line.textContent = text;
        element.append(line);
    }
    return view;
}
