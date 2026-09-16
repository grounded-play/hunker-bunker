# Localization coverage audit and completion plan — 2026-09-16

**Branch:** `dev/sprint-40` · package `2.4.4-beta` · suite green (390 files / 3505 tests)
**Question asked:** do all words and buttons actually change language, in every menu and place?
**Answer:** no. The translation *engine* and *dictionaries* are healthy and complete. The
*wiring* reaches roughly one and a half screens. Everything else renders English in all
seven locales.

This document is the audit and the execution plan. No code was changed to produce it.

---

## 1. What is actually healthy

Do not rebuild these. They work.

| Asset | State |
|---|---|
| Locale files | 7 (`en`, `zh-CN`, `ru`, `es-419`, `de`, `ja`, `pt-BR`) in `src/locales/` |
| Key parity | **654 keys, perfect** — 0 missing, 0 extra in every locale |
| Untranslated values | 1–10 per locale (identical-to-English strings, mostly proper nouns) |
| Engine | `src/i18n.js` — `t()`, `setLocale()`, `applyStaticTranslations()`, locale detection, interpolation, English fallback |
| Narrative layer | `src/i18nCatalog.js` — `localizeCatalog()` rebuilds 8 `src/data/*.js` catalogs in place on `locale-changed`; 417 narrative keys |
| Language picker | All 7 locales exposed, flags + region labels, `#language-select-popup` |
| Settings screen | `#settings-popup` — **80 annotations across 95 text nodes.** The one screen that is genuinely done. |

The catalog is not the problem. The problem is that almost nothing calls it.

---

## 2. The three structural gaps

### Gap A — `t()` has effectively no runtime call sites

```
files importing src/i18n.js (non-test) : 2   (armoryUi.js, i18nCatalog.js)
t() call sites in all of src/ (non-test): 7
occurrences of "i18n" in threeGame.js   : 0
```

`src/threeGame.js` is **34,400 lines** and owns the HUD, the terminal, the base shop, the
O2 generator panel, turret controls, notifications, objective text and the tactical map.
It does not import the localization engine at all. Same for `steamVaultUi.js`,
`multiplayerLobby.js`, `seasonPassUi.js`, `wandererModal.js`, `storyArchive.js`,
`achievements.js`, `bank.js`, and the RGB minigame.

### Gap B — static markup is annotated on one screen out of forty

`index.html` scan (script/style stripped):

```
annotated text elements   :  65
UNANNOTATED text elements : 454   (70 <button>, 177 <span>, 109 <div>, 33 <option>, 30 <p>, 12 <h2>)
UNANNOTATED user-facing attributes (title/aria-label/placeholder/alt) : 97
```

Per-screen, annotations vs. translatable text nodes:

| Screen | Annotated | Text nodes | Verdict |
|---|---:|---:|---|
| `#settings-popup` | 80 | 95 | done |
| `#title-profile-hud` | 7 | 14 | half |
| `#multiplayer-modal` | 0 | 61 | **none** |
| `#steam-vault-modal` | 0 | 48 | **none** |
| `#about-modal` | 0 | 20 | **none** |
| `#terminal-bank-panel` | 0 | 12 | **none** |
| `#game-over-modal` | 0 | 12 | **none** |
| `#npc-dialogue-modal` | 0 | 9 | **none** |
| `#base-turret-modal` | 0 | 9 | **none** |
| `#tactical-map-modal` | 0 | 8 | **none** |
| `#o2-generator-modal` | 0 | 8 | **none** |
| `#console-terminal-modal` | 0 | 7 | **none** |
| `#elevator-choice-modal` | 0 | 6 | **none** |
| `#vault-reveal-overlay` | 0 | 6 | **none** |
| `#codex-modal`, `#achievements-modal`, `#season-pass-modal`, `#roster-modal`, `#archive-sims-modal`, `#quit-confirm-modal`, `#reset-save-confirm-modal`, `#confirm-modal`, `#demo-end-modal`, `#day-rest-warning-modal`, `#operator-polish-modal`, `#progression-walkthrough-modal`, `#mature-content-audit-modal`, `#snail-encounter-modal`, `#codex-detail-modal`, `#select-picker-overlay`, HUD prompt strips | 0 | 2–5 each | **none** |
| `#dev-console-modal` + dev toolbar | 0 | 55 | **out of scope — do not translate** |

### Gap C — nothing re-renders when the locale changes

Only two `locale-changed` listeners exist in the whole codebase: `i18n.js` (re-applies
`data-i18n` to static markup) and `i18nCatalog.js` (rebuilds narrative data). **No runtime
UI module subscribes.** Any panel already built into the DOM by JS keeps its English text
until something independently rebuilds it. Switching language mid-session will visibly
half-update the screen.

---

## 3. Two traps confirmed still live

**Trap 1 — orphaned namespaces.** 68 of the 237 non-narrative keys are translated into all
7 languages and referenced by nothing:

```
common.*   12 keys   menu.*     8   classes.* 4   rarity.*  7
hud.*       9 keys   dialogue.* 7   settings.*10   vault.*  5   ui.*  8
```

These were authored against UI text that does not exist (`menu.play` = "DEPLOY OPERATIVE";
the real button says "NEW RUN"). Every one is a paid translation of a string no player will
ever see, and worse, a tempting wrong key for the next person wiring a call site.
**Decision needed:** re-point them at real markup, or delete them. Do not leave them.

**Trap 2 — unlocalized data catalogs.** Eight `src/data/*.js` files are wrapped by
`localizeCatalog`. These are not, and they are all player-facing:

| File | Lines | Content |
|---|---:|---|
| `data/steamItemCatalog.js` | 1338 | cosmetic item names + descriptions (Armory, Steam Vault, store) |
| `data/armoryPreviews.js` | 423 | preview captions |
| `data/communitySkins.js` | 408 | skin names |
| `data/voiceBanks.js` | 94 | radio bank names/descriptions (shipped Sept 15) |
| `data/enemies.js` | 99 | enemy display names |
| `data/roomBuilds.js`, `data/runModifiers.js`, `data/seasonOne*.js` | — | modifier + expedition labels |

### Side finding — RETRACTED 2026-09-16
An earlier draft of this document claimed `index.html:341` showed a stale `SYS VER:
2.4.2-BETA` because nothing wrote to `#about-modal-sys-ver`. **That was wrong.** The
original grep covered `src/` only and missed the entry point: `main.js:291` overwrites the
element at boot with `canonicalVersionText`, built from the vite `__HB_BUILD_INFO__`
define. The markup literal is only a placeholder. The readout is build diagnostics
(`BUILD <version> // <sha> // <branch> // <timestamp>`), not translatable prose, so it is
deliberately left unkeyed.

---

## 4. Why the test suite did not catch any of this

`src/i18n.test.js` → `describe('markup coverage')` asserts only:

```js
it('annotates the shipped UI', () => {
    expect(keys.length).toBeGreaterThan(0);
});
```

It scans exactly two files (`index.html`, `armoryUi.js`) and passes if a single annotation
exists anywhere. It cannot detect a new unlocalized screen, and it will never fail as
coverage regresses. The parity tests are good; the *coverage* test is decorative.

---

## 5. Execution plan

Ordered so that each phase is independently shippable and the guardrail lands before the
bulk work, not after.

### Phase 0 — Make coverage measurable and enforceable *(do this first)*
1. Promote the audit scanners into `scripts/audit-i18n.mjs` — reports unannotated markup
   per screen, unlocalized DOM-sink literals per module, and orphaned keys.
2. Replace the decorative coverage test with a **ratchet**: a committed baseline count per
   screen that the test asserts never increases. New unlocalized UI then fails CI.
3. Add `npm run i18n:audit`.
   *Exit gate:* the numbers in §2 reproduce from a command, and a deliberately added raw
   button makes the suite fail.

### Phase 1 — Resolve the orphans *(cheap, unblocks everything)*
4. For each of the 68 orphaned keys: re-point to real markup where a real string matches,
   delete where it does not. Expect mostly deletion — `menu.*` and `dialogue.*` were
   authored blind.
5. Re-run the parity test; key count drops and all 7 locales stay identical.
   *Exit gate:* zero orphans reported by the Phase 0 audit.

### Phase 2 — Static markup sweep (`index.html`)
6. Annotate all 454 text nodes and 97 attributes **except** the dev toolbar and
   `#dev-console-modal` (55 nodes, developer-only, explicitly out of scope and recorded as
   such in the audit's allowlist).
7. Work screen by screen in the §2 table order (biggest first: multiplayer → vault →
   about → terminal → game-over → the small modals).
8. Add the new keys to `en.json`, then run `node scripts/extract-narrative.js --handoff`
   equivalent for chrome keys and produce translator files for the other 6 locales.
   *Exit gate:* every non-debug screen reports 100% annotation; parity test green.

### Phase 3 — Runtime-generated UI
9. Import `t()` into the runtime UI modules and convert literals at the write site.
   Priority by player exposure:
   `threeGame.js` HUD/terminal/shop/objectives → `steamVaultUi.js` →
   `multiplayerLobby.js` → `seasonPassUi.js` → `wandererModal.js` →
   `storyArchive.js` / `achievements.js` / `bank.js` → RGB minigame.
10. **Never cache a resolved string at module scope** — mid-session switching breaks.
11. Where a module assigns `innerHTML` from a template, follow the `armoryUi.js` pattern:
    annotate inside the template and call `applyStaticTranslations()` immediately after the
    assignment, so a panel opened in a non-English locale renders translated on first paint.
    *Exit gate:* the DOM-sink scanner reports zero unlocalized literals outside `debug*`.

### Phase 4 — Data catalogs
12. Wrap `steamItemCatalog.js`, `communitySkins.js`, `armoryPreviews.js`, `voiceBanks.js`,
    `enemies.js` and the season/modifier data with `localizeCatalog`, each with a `skip`
    list for identifier fields (ids, asset paths, Steam defIDs). Getting the skip list wrong
    is how the earlier 606-string count was inflated by 257 identifiers.
    *Exit gate:* narrative extraction round-trips; no identifier appears in a translator file.

### Phase 5 — Live locale switching
13. Give each runtime UI module a `locale-changed` handler that re-renders if mounted.
14. Test: open every screen, switch language, assert no English remains.
    *Exit gate:* switching language with the Armory, Vault, lobby and terminal open updates
    all of them without a reload.

### Phase 6 — Visual acceptance
15. Build, serve `dist/` statically, drive with Playwright using
    `executablePath: '/usr/bin/google-chrome'` (the ms-playwright cache is stale).
16. Screenshot every screen in all 7 locales. Check specifically for: CJK glyph coverage in
    the pixel/display fonts, German compound words overflowing fixed-width buttons, and
    Russian string length in the HUD rails.
    *Exit gate:* a reviewed screenshot matrix, and an explicit list of any string that must
    stay English (trademarks, Steam product names).

---

## 6. Honest sizing

Phase 0–1 are small and high-leverage. Phase 2 is mechanical volume (~550 annotations).
Phase 3 is the real work and it lands in `threeGame.js`, which everyone touches — sequence
it against other sprint-40 work rather than running it concurrently. Phase 6 will find
layout bugs that are not localization bugs; budget for them separately.

No part of this is blocked. Phase 0 can start immediately.
