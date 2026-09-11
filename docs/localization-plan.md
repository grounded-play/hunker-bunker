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

Wrapped so far — **606 strings**:

| Catalog | Strings |
| --- | ---: |
| `narrative.loreMetadata` | 129 |
| `narrative.leaderDialogue` | 120 |
| `narrative.directorAmbient` | 85 |
| `narrative.mothershipReactive` | 56 |
| `narrative.dialogue.{corporate,glitched,reverent}` | 118 |
| `narrative.codexEntries` | 38 |
| `narrative.campQuests` | 21 |
| `narrative.classWreckageLogs` | 21 |
| `narrative.leaderDeathBeats` | 15 |
| `narrative.loreClassLogs` | 3 |

Identifier fields (`id`, `category`, `image`, `icon`, `next`) are excluded via
each catalog's `skip` list so lookup keys and asset paths are never translated.

`node scripts/extract-narrative.js` re-syncs `narrative.*` in `en.json` from
the source modules and prints per-locale coverage; `--handoff` writes
`docs/localization/handoff/<locale>.json` containing only that locale's missing
keys with English source text — the file to hand a translator and paste back.
Both are idempotent, so re-run after any content edit.

### The remaining gap

- **Narrative translation: 0/606 in all six non-English locales.** This is the
  native-pass job, deliberately not machine-translated.
- **Not yet extracted**: prose still inline in `src/dialogue.js` (~302),
  `src/npcDialogueTrees.js` (~165), `src/act2.js` (~144) and
  `src/sideStorySystem.js` (~96). These interleave prose with logic rather than
  being pure data modules, so each needs per-site work, not a catalog wrapper.
- **Runtime-written chrome**: HUD readouts, notifications and objective lines
  still need `t()` at each write site; `data-i18n` cannot reach them.

## Tiering

Ship the cheap, low-risk surface first; gate narrative on real conversion data.

### Tier 1 — UI chrome and store presence (do now)

- Steam store page + item tag localization (**already done**, matrix is
  paste-ready).
- Menus, Settings, Armory/Vault, HUD labels, objective text, notifications,
  error and confirmation copy.
- Roughly 600–800 strings. Mechanical, low translation risk, no VO coupling.

### Tier 2 — Narrative (defer)

- `dialogueLines.js`, `campDialogue.js`, `npcDialogueTrees.js`, `codex.js`,
  `sideStorySystem.js`, `lineDirectorPools.js`, Act 2 camp/ending copy.
- Roughly 450+ authored lines, and the actual cost driver.
- Couples to the voice work (see
  [`voice-cast-prompts-and-game-integration-2026-08-25.md`](voice-cast-prompts-and-game-integration-2026-08-25.md))
  and to the `voice_pack` cosmetics. Subtitled VO across seven languages is a
  different budget from UI chrome.

**Half-translated narrative is worse than English narrative with a translated
UI.** If a locale ships Tier 1 only, keep its narrative in English rather than
mixing.

### Never localize

`src/debugConsole.js` (~104 strings), dev overlays, `scratch/` harnesses, and
telemetry event names. Leave them English; exclude them from extraction sweeps.

## Extraction strategy

String concentration, measured:

| File | Approx. strings | Tier |
| --- | ---: | --- |
| `src/threeGame.js` | 417 | Mixed — HUD/objective copy is T1, camp dialogue is T2 |
| `main.js` | 405 | Mostly T1 |
| `src/npcDialogueTrees.js` | 125 | T2 |
| `src/data/dialogueLines.js` | 119 | T2 |
| `src/data/campDialogue.js` | 105 | T2 |
| `src/debugConsole.js` | 104 | Excluded |
| `src/dialogue.js` | 100 | T1 (chrome) + T2 (content) |
| `index.html` | 95 | T1 |
| `src/armoryUi.js` | 94 | T1 |
| `src/act2.js` | 86 | T2 |

Order of work:

1. ~~**`index.html` first.**~~ **Done.** `data-i18n` attributes plus a single
   `applyStaticTranslations()` pass on load and on `locale-changed`. Remaining
   in this file: `<option>` values inside the Settings selects (camera, text
   speed, UI scale), and the Armory/Vault/game-over panels.
2. **`main.js` menu/settings/modal copy.** Mostly one-shot renders.
3. **`armoryUi.js`, `multiplayerLobby.js`, `songInterstitials.js`.** Panel
   renders that already re-run on open.
4. **`threeGame.js` HUD/objective strings.** Care needed: this file writes text
   via `textContent =` inside update loops. Call `t()` at write time, never
   cache the resolved string in a module constant, or a mid-session language
   change will leave stale text.
5. **Tier 2 narrative** — only after a locale decision.

### Key naming

Follow the existing `en.json` shape: `common.*`, `menu.*`, `classes.*`,
`rarity.*`. Add `hud.*`, `armory.*`, `settings.*`, `objectives.*`,
`notifications.*`, `dialogue.*`. One namespace per screen, not per file.

## Known risks

- **Placeholder keys that match no shipped string.** The original `menu.*` and
  `dialogue.*` namespaces were authored against UI text that does not exist in
  `index.html` (`menu.play` = "DEPLOY OPERATIVE"; the real button is "NEW RUN").
  They are translated but unused. The `ui.*` namespace is keyed against actual
  markup. Do not add call sites for the placeholder keys without first checking
  the string is real.
- **String caching in render loops.** Any `const LABEL = '...'` at module scope
  becomes untranslatable at runtime. Convert to a `t()` call at use site.
- **Layout overflow.** German and Russian run 25–35% longer than English; the
  HUD is tight. Japanese and Chinese need a font that covers CJK — confirm the
  current pixel font does, or set a CJK fallback stack.
- **Missing-key silence.** `t()` falls back to English, then to the key string.
  Add a dev-mode warning on fallback so gaps surface during playtest.
- **Untranslated-by-design values.** Three `de`, two `es-419`/`pt-BR`, one `ja`
  key are identical to English (e.g. "OK", "HUD"). Correct — do not let a key
  parity check flag them as missing.

## Verification

```bash
npx vitest run src/i18n.test.js
npm run build
```

Add to `src/i18n.test.js` as extraction proceeds:

1. ~~Key parity across all seven locale files.~~ Covered — scoped to chrome
   keys, since `narrative.*` is intentionally English-only until translated.
   A separate check reports narrative coverage per locale, and orphan
   narrative keys (present in a locale but not in English) fail.
2. ~~Every `data-i18n` attribute in `index.html` resolves to a real key~~ —
   covered, and asserted against **all seven** locales, so a key added to
   markup without a translation fails the suite.
3. ~~`setLocale()` on an unsupported code returns `false`.~~ Covered.
4. New: as `t()` call sites land in JS, assert the keys they use exist.

Manual:

- Switch to `de` in Settings; confirm menus re-render without a reload.
  (Automated equivalent covered by the markup-coverage test.)
- Switch to `zh-CN`; confirm CJK glyphs render and no HUD row overflows.
- Reload; confirm `hb_locale` restored the choice.
- Steam build: confirm `getCurrentGameLanguage()` seeds the locale on a fresh
  profile with no `hb_locale` record.
