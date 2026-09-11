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

### The gap

**The engine is inert.** There are zero `t()` call sites outside
`i18n.js`/`i18n.test.js`, and zero `locale-changed` listeners. Changing the
language in Settings updates a variable, writes localStorage, and fires an
event nobody handles. No visible text changes.

62 keys are translated against roughly **3,300 candidate user-facing strings**.
Extraction is ~2% done, and it is the bulk of the remaining work.

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

1. **`index.html` first.** Static markup, no render-loop coupling. Add
   `data-i18n="key"` attributes and a single `applyStaticTranslations()` pass
   run on load and on `locale-changed`. This alone proves the switcher visibly
   works.
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

- **No `locale-changed` listeners.** Until step 1 above lands, the setting is a
  no-op. Either wire the static pass or hide the selector — shipping a language
  picker that does nothing is worse than not shipping one.
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

1. Key parity across all seven locale files (no missing, no extra).
2. Every `data-i18n` attribute in `index.html` resolves to a real key.
3. `setLocale()` on an unsupported code returns `false` and leaves the locale
   unchanged.

Manual:

- Switch to `de` in Settings; confirm menus re-render without a reload.
- Switch to `zh-CN`; confirm CJK glyphs render and no HUD row overflows.
- Reload; confirm `hb_locale` restored the choice.
- Steam build: confirm `getCurrentGameLanguage()` seeds the locale on a fresh
  profile with no `hb_locale` record.
