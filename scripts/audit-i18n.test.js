import { describe, expect, it } from 'vitest';
import {
    DEBUG_ALLOWLIST,
    LOCALE_NATIVE_CONTAINERS,
    auditMarkup,
    auditRuntimeStrings,
    findOrphanKeys,
    flattenKeys,
    isPlayerFacingText,
    readBaseline,
    runAudit
} from './audit-i18n.js';

describe('player-facing text classification', () => {
    it('accepts words a player reads', () => {
        expect(isPlayerFacingText('NEW RUN')).toBe(true);
        expect(isPlayerFacingText('Abort current mission')).toBe(true);
        expect(isPlayerFacingText('UPGRADE O₂ GENERATOR')).toBe(true);
    });

    it('rejects code identifiers, selectors and asset paths', () => {
        expect(isPlayerFacingText('camelCaseName')).toBe(false);
        expect(isPlayerFacingText('vault-store-layout')).toBe(false);
        expect(isPlayerFacingText('MAX_DEPTH_TIER')).toBe(false);
        expect(isPlayerFacingText('public/economy/charm.png')).toBe(false);
        expect(isPlayerFacingText('#1a2b3c')).toBe(false);
        expect(isPlayerFacingText('display: none;')).toBe(false);
    });

    it('rejects a catalog key, which is an address rather than display text', () => {
        expect(isPlayerFacingText('ui.boss.elite_threat')).toBe(false);
        expect(isPlayerFacingText('common.ok')).toBe(false);
    });

    it('rejects pure numeric readouts, which carry no words to translate', () => {
        expect(isPlayerFacingText('0 / 27')).toBe(false);
        expect(isPlayerFacingText('12.5')).toBe(false);
    });

    it('holds trademarks and platform names invariant across locales', () => {
        expect(isPlayerFacingText('Steam')).toBe(false);
        expect(isPlayerFacingText('Three.js')).toBe(false);
    });
});

describe('markup audit', () => {
    it('counts an annotated element as covered', () => {
        const { findings, annotated } = auditMarkup('<div id="m"><button data-i18n="ui.go">GO NOW</button></div>');
        expect(annotated.text).toBe(1);
        expect(findings).toHaveLength(0);
    });

    it('reports an unannotated button against the screen that owns it', () => {
        const { findings } = auditMarkup('<div id="pause-modal"><div class="row"><button>ABORT MISSION</button></div></div>');
        expect(findings).toHaveLength(1);
        expect(findings[0].screen).toBe('pause-modal');
        expect(findings[0].text).toBe('ABORT MISSION');
    });

    it('attributes to the named screen rather than an inner styling id', () => {
        const html = '<div id="steam-vault-modal"><div id="inner-row-wrap"><span>OPEN CACHE</span></div></div>';
        const { findings } = auditMarkup(html);
        expect(findings[0].screen).toBe('steam-vault-modal');
    });

    it('flags user-facing attributes and honours their annotation', () => {
        const bare = auditMarkup('<div id="hud"><button title="Open the codex">X</button></div>');
        expect(bare.findings.some((f) => f.kind === 'attr' && f.attr === 'title')).toBe(true);

        const wired = auditMarkup('<div id="hud"><button data-i18n-title="ui.codex" title="Open the codex">X</button></div>');
        expect(wired.findings.some((f) => f.kind === 'attr')).toBe(false);
        expect(wired.annotated.attrs).toBe(1);
    });

    it('reads the attribute value, not the annotation that names it', () => {
        // \btitle= also matches inside data-i18n-title=, so the scan used to
        // pick up the key "ui.codex" as if it were the displayed tooltip.
        const { findings } = auditMarkup('<div id="hud"><button data-i18n-title="ui.codex" title="Open the codex">X</button></div>');
        expect(findings).toHaveLength(0);
        const bare = auditMarkup('<div id="hud"><button title="Open the codex">X</button></div>');
        expect(bare.findings[0].text).toBe('Open the codex');
    });

    it('ignores script and style bodies', () => {
        const { findings } = auditMarkup('<div id="s"><script>const label = "HIDDEN TEXT";</script></div>');
        expect(findings).toHaveLength(0);
    });

    it('excludes developer-only surfaces by id and by prefix', () => {
        expect(auditMarkup('<div id="dev-console-modal"><button>GOD MODE</button></div>').findings).toHaveLength(0);
        expect(auditMarkup('<div id="dev-res-select"><option>Native resolution</option></div>').findings).toHaveLength(0);
    });

    it('leaves the language picker in its native scripts', () => {
        const { findings } = auditMarkup('<div id="language-select-grid"><span>Deutsch (German)</span></div>');
        expect(findings).toHaveLength(0);
        expect(LOCALE_NATIVE_CONTAINERS).toContain('language-select-grid');
    });
});

describe('runtime string audit', () => {
    it('flags a literal assigned straight to the DOM', () => {
        const findings = auditRuntimeStrings('el.textContent = "STEAM ITEM ACQUIRED";');
        expect(findings).toHaveLength(1);
        expect(findings[0].text).toBe('STEAM ITEM ACQUIRED');
    });

    it('treats a t() call as wired', () => {
        expect(auditRuntimeStrings('el.textContent = t("ui.vault.acquired");')).toHaveLength(0);
    });

    it('treats an annotated template as wired', () => {
        expect(auditRuntimeStrings('el.innerHTML = `<span data-i18n="ui.vault.title">VAULT</span>`;')).toHaveLength(0);
    });

    it('reaches text inside a multi-line innerHTML template', () => {
        const source = [
            'panel.innerHTML = `',
            '    <div class="row">',
            '        <span>OPERATIVES READY</span>',
            '    </div>',
            '`;'
        ].join('\n');
        const findings = auditRuntimeStrings(source);
        expect(findings.some((f) => f.text === 'OPERATIVES READY')).toBe(true);
    });

    it('keeps a real string whose interpolation contains code punctuation', () => {
        // `DIST: ${target.distance.toFixed(1)}m` is player text. An earlier
        // filter rejected any backtick run containing (){}; and silently hid 23
        // real strings, which made the coverage number a lie.
        const findings = auditRuntimeStrings('el.textContent = `DIST: ${target.distance.toFixed(1)}m`;');
        expect(findings).toHaveLength(1);
    });

    it('drops a template fragment that is bookkeeping rather than words', () => {
        expect(auditRuntimeStrings("body.innerHTML = `${rows.join('')}</div>`;")).toHaveLength(0);
    });

    it('ignores class names and pure interpolation', () => {
        expect(auditRuntimeStrings('el.innerHTML = `${count}`;')).toHaveLength(0);
        expect(auditRuntimeStrings('el.className = "vault-row active";')).toHaveLength(0);
    });

    it('ignores comment lines', () => {
        expect(auditRuntimeStrings('// el.textContent = "OLD LABEL";')).toHaveLength(0);
    });
});

describe('orphan keys', () => {
    it('flattens nested catalogs to dotted paths', () => {
        expect(flattenKeys({ ui: { hub: { codex: 'CODEX' } } })).toEqual({ 'ui.hub.codex': 'CODEX' });
    });

    it('reports a key no source file references', () => {
        const catalog = { ui: { used: 'A', unused: 'B' } };
        expect(findOrphanKeys(catalog, 'const key = "ui.used";')).toEqual(['ui.unused']);
    });

    it('never reports narrative keys, which are addressed by derived path', () => {
        expect(findOrphanKeys({ narrative: { codex: { a: 'x' } } }, '')).toHaveLength(0);
    });

    it('refuses to walk prototype keys out of a catalog', () => {
        const hostile = JSON.parse('{"__proto__": {"polluted": "yes"}, "ui": {"ok": "OK"}}');
        expect(Object.keys(flattenKeys(hostile))).toEqual(['ui.ok']);
        expect({}.polluted).toBeUndefined();
    });
});

/**
 * The ratchet. The previous coverage test asserted only that at least one
 * annotation existed anywhere, so it passed no matter how much unlocalized UI
 * was added. These assertions fail the build when coverage regresses, and the
 * baseline is rewritten downward as each phase lands.
 */
describe('coverage ratchet', () => {
    const baseline = readBaseline();
    const report = runAudit();

    it('has a committed baseline to ratchet against', () => {
        expect(baseline).not.toBeNull();
    });

    it('adds no unannotated markup beyond the baseline', () => {
        expect(report.markup.unannotated).toBeLessThanOrEqual(baseline.markup.total);
    });

    it('adds no unlocalized runtime strings beyond the baseline', () => {
        expect(report.runtime.unlocalized).toBeLessThanOrEqual(baseline.runtime.total);
    });

    it('adds no orphaned keys beyond the baseline', () => {
        expect(report.orphanKeys).toBeLessThanOrEqual(baseline.orphanKeys);
    });

    it('regresses no individual screen', () => {
        const regressed = Object.entries(report.markup.screens)
            .filter(([screen, count]) => count > (baseline.markup.screens[screen] ?? 0))
            .map(([screen, count]) => `#${screen}: ${baseline.markup.screens[screen] ?? 0} -> ${count}`);
        expect(regressed).toEqual([]);
    });

    it('regresses no individual module', () => {
        const regressed = Object.entries(report.runtime.modules)
            .filter(([mod, count]) => count > (baseline.runtime.modules[mod] ?? 0))
            .map(([mod, count]) => `${mod}: ${baseline.runtime.modules[mod] ?? 0} -> ${count}`);
        expect(regressed).toEqual([]);
    });

    it('keeps developer surfaces out of the translated budget', () => {
        expect(DEBUG_ALLOWLIST.modules).toContain('debugConsole.js');
        expect(report.runtime.modules['src/debugConsole.js']).toBeUndefined();
    });
});
