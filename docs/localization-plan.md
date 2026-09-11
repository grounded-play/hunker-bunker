# Localization Plan

Status as of 2026-09-11. Companion to
[`steam-item-tag-localization.md`](steam-item-tag-localization.md) (English tag
values) and [`steam-item-tags-translation-matrix.md`](steam-item-tags-translation-matrix.md)
(7-language tag matrix).

This is the plan the "next steps" hand-off pointed at. Note that
`docs/implementation_plan.md` is the **Act 2 multi-ending narrative plan** and
contains nothing about localization — the two are unrelated.

## Shipping locales

| Locale | Steam code | Rationale |
| --- | --- | --- |
| English | `english` | Source language |
| Simplified Chinese | `schinese` | Largest Steam account share; rewards good localization, punishes machine output |
| Russian | `russian` | Highest per-capita affinity for post-apocalyptic/bunker survival |
| Spanish (LATAM) | `latam` | Fast Steam + Steam Deck growth |
| German | `german` | Premium EU revenue |
| Japanese | `japanese` | Strong handheld/indie sci-fi engagement |
| Portuguese (Brazil) | `brazilian` | Largest co-op community in South America |

**Also fill the `spanish` (Spain) tab** with the `es-419` strings. Steam ships
Spain and Latin America as separate tabs; filling only one leaves the other
rendering English. The tag vocabulary has no Iberian/LATAM divergence, so the
same strings serve both until there is regional VO.

## What already exists

`b139d99` landed the runtime engine:

- `src/i18n.js` — `t()`, `setLocale()`, `getLocale()`, `detectInitialLocale()`,
  `interpolate()`, `SUPPORTED_LOCALES`.
- `src/locales/{en,zh-CN,ru,es-419,de,ja,pt-BR}.json` — 62 keys each, full key
  parity across all seven, verified.
- `src/i18n.test.js` — 18 tests, passing.
- Settings language selector in `index.html` + `main.js`, persisted to
  `hb_locale`.

Detection order is correct for a Steam title: saved preference →
`electronAPI.steam.getCurrentGameLanguage()` → `navigator.language` → `en`.

### Wiring (landed)

The engine was initially inert — no `t()` call sites, no `locale-changed`
listeners — so switching language changed no visible text. That is now closed
for the static UI:

- `applyStaticTranslations(root)` in `src/i18n.js` translates every element
  carrying `data-i18n` (textContent) or `data-i18n-<attr>`
  (`title`/`aria-label`/`placeholder`). Unknown keys are **skipped**, so the
  authored English in markup survives rather than being replaced by a raw key.
- The module self-wires: it translates on `DOMContentLoaded` and re-runs on
  every `locale-changed`. Switching language never needs a reload.
- 55 elements in `index.html` are annotated — the title menu, the hub launch
  buttons, and the whole Settings modal including its category headers and
  action buttons.
- The catalog grew from 62 to **111 keys**, all seven locales key-identical.

Verified in a real browser against the production build: all seven locales
swap live, both through `window.i18n.setLocale()` and through the Settings
`<select>`, and the choice persists to `hb_locale`.

### Narrative extraction (landed)

Tier 2 narrative is now **extracted but not translated** — the mechanical half
is done, the native pass is not.

`src/i18nCatalog.js` registers a narrative data module and returns a live
structure that is rebuilt *in place* on `locale-changed`. In-place mutation is
the point: consumers routinely hold a reference (`const pool =
DIALOGUE_LINES.lowO2`), and reassigning the export would leave them on stale
English. Keys derive from the data's own shape, so writers keep authoring in
the `src/data/*.js` modules exactly as before:

    narrative.dialogue.corporate.lowO2.0

Wrapped — **399 strings, 100% translated in all seven locales**:

| Catalog | Strings |
| --- | ---: |
| `narrative.leaderDialogue` | 120 |
| `narrative.dialogue.{corporate,glitched,reverent}` | 118 |
| `narrative.codexEntries` | 38 |
| `narrative.missionBriefings` | 22 |
| `narrative.campQuests` | 18 |
| `narrative.directorAmbient` | 17 |
| `narrative.strains` | 15 |
| `narrative.leaderDeathBeats` | 15 |
| `narrative.mothershipReactive` | 14 |
| `narrative.terminalEvents` | 13 |
| `narrative.classWreckageLogs` | 6 |
| `narrative.loreClassLogs` | 3 |

Identifier fields (`id`, `category`, `image`, `icon`, `next`) are excluded via
each catalog's `skip` list so lookup keys and asset paths are never translated.

`node scripts/extract-narrative.js` re-syncs `narrative.*` in `en.json` from
the source modules and prints per-locale coverage; `--handoff` writes
`docs/localization/handoff/<locale>.json` containing only that locale's missing
keys with English source text — the file to hand a translator and paste back.
Both are idempotent, so re-run after any content edit.

### The remaining gap

- **Narrative: none.** All 399 extracted strings are translated in all six
  non-English locales.
- **Not extracted, by design**: `src/data/steamItemCatalog.js` and the cosmetic
  name lists. Those are Steam item definitions — Steam localizes them from the
  partner site's own item-name fields, so translating them here would fork the
  names from what the store and inventory show.
- **Not extracted, still open**: prose inline in `src/dialogue.js` (~302),
  `src/npcDialogueTrees.js` (~165), `src/act2.js` (~144) and
  `src/sideStorySystem.js` (~96). These interleave prose with logic rather than
  being pure data modules, so each needs per-site work, not a catalog wrapper.
- **Runtime-written chrome**: HUD readouts, notifications and objective labels
  written from JS still need `t()` at each write site; `data-i18n` cannot reach
  them. Objective labels in particular arrive from callers, so the fix belongs
  at the call site, not in `objectiveRegistry`.
- **Level-generation data is correctly excluded**: `roomBuilds.js` and
  `hallwayBuilds.js` scan as string-heavy but contain no player-facing prose.

### Steamworks (needs a human)

`docs/steam-item-tags-translation-matrix.md` is paste-ready but has to be
entered by hand in **Steamworks → Inventory Service → Item Tags**, one language
tab at a time. Fill the `spanish` (Spain) tab with the `es-419` strings too.
