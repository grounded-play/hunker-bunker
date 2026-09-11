# Steam store-page localization

Upload payloads for **Steamworks → Store Page → (language tab) → Import/Export**.

| File | Steam language | Source |
| --- | --- | --- |
| `storepage_1247290_english.json` | English | **Exported from Steamworks. Source of truth — do not regenerate.** |
| `storepage_1247290_sc_schinese.json` | Simplified Chinese | generated |
| `storepage_1247290_russian.json` | Russian | generated |
| `storepage_1247290_spanish.json` | Spanish - Spain | generated |
| `storepage_1247290_latam.json` | Spanish - Latin America | generated |
| `storepage_1247290_german.json` | German | generated |
| `storepage_1247290_japanese.json` | Japanese | generated |
| `storepage_1247290_brazilian.json` | Portuguese - Brazil | generated |

Regenerate with:

```bash
node scripts/build-steam-store-localization.mjs
```

## Why these are generated, not hand-written

The store body is BBCode with `{STEAM_APP_IMAGE}` tokens in it. Writing seven
translations by hand invites exactly one dropped `[/p]` in exactly one language,
which nobody notices until the Russian store page renders raw markup at a
customer. One template is filled from translated text fragments instead, so the
markup is identical everywhere and only the words differ.

## Decisions baked in

- **The MIT licence is not translated.** A localized licence is a different
  licence; the English text is the authoritative one and round-trips unchanged.
- **Spain and Latin America get the same copy.** The text has no regional
  divergence worth forking, and leaving the Spain tab empty renders that store
  page in English.
- **English is never regenerated.** It is the live store copy as exported.

## Do not move these into `public/`

They arrived there and were moved out. `public/` is served to the web and bundled
into the build — store marketing copy does not belong in the game payload.
