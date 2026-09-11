# Steam Review Resubmission Status and Copy Packet

**Game:** Hunker Bunker  
**Steam App ID:** `4957040`  
**Depot:** `4957041`  
**Reviewer SteamID shown in feedback:** `24582927`  
**Prepared:** September 11, 2026

**September 11 operator update:** Steamworks store-art and Content Survey
changes were reported complete by the publisher. They remain pending Valve
re-review. The retail build now also hides the priced Vault Store surface when
Steam purchases are disabled; browser/offline fallback can no longer grant mock
purchases.

This is the current working document for the next Steam review. It combines the
Store Presence feedback supplied in the request with the Game Build feedback in
the attached Valve review report.

Do not mark the page or build ready for re-review until every retained claim is
either verified in the uploaded Steam build or removed from the store page.

## Status key

- **Repo ready:** a replacement or implementation exists locally.
- **In progress / verification required:** work exists, but the exact uploaded
  asset, Steamworks setting, or Steam-delivered build has not been accepted.
- **Decision required:** choose whether to ship and prove the feature/content or
  remove its store claim.
- **Complete:** use only after the Steamworks change is saved, published, and
  checked against the live review build.

## Executive checklist

| Valve feedback | Current status | Required action before re-review | Completion evidence |
|---|---|---|---|
| English title missing from Library Capsule and Library Header | **Publisher reports complete; awaiting Valve re-review** | No further repo change. Preserve the uploaded English-localized assets. | Screenshot of both English asset slots after publish. |
| Library Capsule does not fill the canvas | **Publisher reports complete; awaiting Valve re-review** | No further repo change. | Steamworks preview screenshot. |
| Library Logo contains extra text/logos | **Publisher reports complete; awaiting Valve re-review** | No further repo change. | Steamworks preview screenshot. |
| AI description contains unrelated marketing copy | **Publisher reports complete; awaiting Valve re-review** | Keep the disclosure aligned with the exact submitted asset set. | Saved Content Survey screenshot plus final asset manifest. |
| Online PvP / Co-op could not be found | **Implemented; acceptance still open** | Retain the tags only after a two-real-account test of the Steam-uploaded build and production relay. State the exact variants and menu route in reviewer notes. Otherwise remove the affected tags. | Two-account test log/video and build ID. |
| Steam Cloud is developer-only | **Steamworks action required** | Disable **Cloud support for developers only**, publish, then perform a two-machine round trip. | Dashboard screenshot and Machine A → B → A test record. |
| Mature-content selections could not be verified | **Publisher reports survey corrected; awaiting Valve re-review** | Keep the submitted build and reviewer routes aligned with the corrected selections. | Final survey screenshot and per-category route tested in uploaded build. |
| Vault Store showed `Store Catalog Unavailable`; Wallet could not be verified | **Repo remediated for deferred IAP** | Production purchase flags remain disabled; the priced Store tab is hidden and offline/browser fallback cannot perform mock purchases. Keep the Steam in-app-purchase claim removed. | Uploaded-build check that no purchase surface is exposed. |
| Full Controller Support failures | **Code remediation exists; hardware acceptance open** | Test the entire uploaded build without keyboard/mouse, including all five items Valve named. Retain **Full Controller Support** only after it passes. | Controller-only route record with device and build ID. |
| Linux / SteamOS was not reviewed | **Fresh-install test open** | If Linux/SteamOS is offered, install the Steam-delivered build on a clean machine/Deck and complete a representative play session. | Device/OS/build test record. |

## Store library assets to upload

Upload these from **Store Page Admin → Graphical Assets**. For the Capsule,
Header, and Logo, select **English** in the language dropdown before uploading.

| Asset | Required result | Repository file | Local dimensions/status |
|---|---|---|---|
| Library Capsule | Full-bleed artwork with the English title `HUNKER BUNKER`; no unrelated copy | `steam/store/steam_library_capsule_en.png` | 600×900 RGB; replacement exists |
| Library Header | English title `HUNKER BUNKER`; no unrelated copy | `steam/store/steam_library_header_en.png` | 920×430 RGB; replacement exists |
| Library Hero | Artwork only; no text or logo overlay | `steam/store/steam_library_hero_en.png` | 3840×1240 RGB; replacement exists |
| Library Logo | Transparent title treatment only: `HUNKER BUNKER` | `steam/store/steam_library_logo_en.png` | 1280×720 RGBA; replacement exists |

Final visual check before upload:

- The title is readable at Steam's small preview size.
- Artwork reaches every edge of the Library Capsule.
- The Logo contains only the game title.
- The Hero contains no title, tagline, studio logo, awards, ratings, or other
  overlay text.
- The English files are actually assigned to **English**, not the language-neutral
  slot or another localization.
- Click **Save**, publish the store changes, and reopen the page to confirm the
  published selection.

## Replacement AI Content Survey text

The earlier AI field should not contain a game pitch, feature list, lore, or
general development commentary. Use a factual disclosure derived from the exact
content in the submitted build.

### Pre-generated AI content — working draft

```text
Generative AI tools were used during development to create or assist some pre-generated visual assets, including selected character and survivor portraits, collectible and insignia artwork, and certain source artwork later edited, pixelated, formatted, or integrated by the development team. AI-assisted coding tools were also used to help write and revise portions of the game's code. All such content is pre-generated; the game does not generate this content in response to players during gameplay.
```

### Live-generated AI content — use only if true for the submitted build

```text
The game does not use generative AI to create content live during gameplay or in response to player input.
```

**Do not paste the working draft unchanged until the retail asset audit is
complete.** The current provenance ledger explicitly says its coverage is
incomplete. Add any other shipped AI-generated asset families that the audit
finds, and delete any example that is not in the submitted build. Do not claim
that every asset is rights-cleared merely because it is in the repository.

## Mature-content survey correction

Valve could not locate six selected categories. The safest correction is to
answer the survey based on what the shipping game actually contains—not what an
older design document planned to contain.

### Recommended survey policy

- Keep **Depiction of suicide/self-harm** only if the submitted build retains a
  scene or text that clearly meets Valve's category and the reviewer route below
  works.
- Reassess and normally remove selections for **revealing outfits**, **sexual
  stimulation**, **masturbation**, **veiled nudity**, **some nudity**, and
  **explicit/graphic adult sexual content** unless the actual shipped audiovisual
  content clearly meets those definitions.
- A recovered log that only references intimacy is not evidence of graphic sex
  or visible nudity. Do not describe mind control or biological horror as
  explicit sexual content unless it genuinely is sexual content.
- If non-explicit sexual language remains and is intentionally part of the
  product, select only the narrow category that accurately covers it and give the
  exact gallery/log route.

### Customer-facing mature-content description — conservative draft

Use this only if it matches the final retained scenes and survey answers:

```text
This game contains science-fiction horror, violence, death, disturbing biological imagery, and written references to self-sacrifice and suicide. It also contains occasional mature dialogue and non-explicit sexual references. It does not depict sexual acts or explicit nudity.
```

If the build does contain visible nudity or explicit sexual content, do not use
that last sentence; disclose the content precisely and retain a direct reviewer
route to it.

### Reviewer route for retained mature content

Verify all labels and shortcuts in the exact uploaded build before pasting:

```text
Mature-content review access:
1. At the title menu, press F9 to open the Mature Content Verification Gallery.
2. For self-sacrifice/suicide-related material, select EMPTY HUSK, SCORCHED SKY, or the Pvt. Reyes farewell log.
3. For any retained mature-language or non-explicit sexual-reference category, select the matching named log in the gallery.

These shortcuts are provided so the relevant material can be reviewed without more than one hour of progression.
```

If F9 or a listed item does not work in the uploaded branch, do not send these
instructions. Fix the build or correct the survey first.

## Recommended launch decisions

### In-app purchases

The current production configuration defaults `HB_STEAM_STORE_ENABLED=0` and
`HB_STEAM_MICROTXN_ENABLED=0`, while the claim evidence keeps purchases
unaccepted. Therefore the recommended near-term path is:

1. **Implemented:** Vault → Store real-money purchasing is hidden when the
   backend reports that purchases are disabled.
2. Keep the **In-App Purchases** store feature/claim removed.
3. Do not tell Valve that a mock checkout or fallback catalog is Steam Wallet
   integration.
4. Add the feature later only after the real Steam Wallet initiation,
   authorization callback, finalization, grant, cancellation, failure, and
   restart/reconciliation paths pass in a Steam-uploaded build.

### Online multiplayer

Keep **Online Co-op** and **Online PvP** only if both modes pass with two real
Steam accounts against the production service. Do not call a local fallback or
AI teammate an online connection. If only one mode passes, remove the other tag.
If the product supports LAN independently, select and describe the LAN variant
separately and accurately.

### Full Controller Support

Retain **Full Controller Support** only after this no-keyboard/no-mouse route
passes in the uploaded build:

1. Install, launch, and dismiss first-run screens.
2. Change Stage Resolution.
3. Change UI Accessibility Scale.
4. Change Text Speed.
5. Edit and save Operator Callsign using the virtual keyboard.
6. Open Achievements and scroll from first to last entry.
7. Start gameplay, pause, change settings, resume, return to menu, and quit.
8. Exercise multiplayer and Vault screens too if those features remain visible.

## Steamworks actions

### Steam Cloud

- [ ] Open **App Admin → Application → Steam Cloud**.
- [ ] Uncheck **Cloud support for developers only**.
- [ ] Confirm the Auto-Cloud path and `save.json` pattern match the packaged app.
- [ ] Save and publish.
- [ ] On Machine A, create a recognizable save and exit cleanly.
- [ ] On a clean Machine B install/account environment, download and verify it.
- [ ] Modify the save on B, exit, return to A, and verify the updated state.
- [ ] Record conflict/offline behavior and the exact Steam build ID.

### Store presence — publisher reports complete September 11

- [x] Upload the English Library Capsule.
- [x] Upload the English Library Header.
- [x] Upload the title-only English Library Logo.
- [x] Confirm the Hero has no overlay text/logo.
- [x] Save and publish all store changes.
- [x] Check the public/preview page after publishing.

### Content Survey — publisher reports complete September 11

- [x] Reconcile AI-generated/AI-assisted content against the submitted asset set.
- [x] Replace the AI description with factual AI-use-only copy.
- [x] Re-answer every mature-content checkbox against actual shipped content.
- [x] Make the customer-facing mature-content description match those answers.
- [x] Save and publish.

## Notes to Reviewer — conservative template

Replace every bracketed field. Delete any section for a feature removed from the
store page. Do not say “all issues fixed” unless the evidence checklist is
complete.

```text
HUNKER BUNKER — STORE PAGE AND BUILD RESUBMISSION
App ID: 4957040
Build ID / branch: [BUILD ID AND BRANCH]

Thank you for the prior review. We made the following changes:

STORE LIBRARY ART
- Replaced the English Library Capsule and Library Header with assets that display the English product title, HUNKER BUNKER.
- Replaced the Library Capsule with full-bleed artwork.
- Replaced the Library Logo with a transparent title-only logo and removed all additional text and logos.
- Confirmed the Library Hero contains no text or logo overlay.

AI DISCLOSURE
- Rewrote the Content Survey AI description so it only explains how generative AI and AI-assisted development were used in content/code included with the app or its store materials.
- Confirmed that [NO LIVE-GENERATED AI IS USED / DESCRIBE LIVE-GENERATED AI PRECISELY].

[ONLINE MULTIPLAYER — INCLUDE ONLY AFTER TWO-ACCOUNT ACCEPTANCE]
- Supported variants: [ONLINE CO-OP / ONLINE PVP / LAN — LIST ONLY VERIFIED VARIANTS].
- Access: Title Menu → TACTICAL NET (MULTIPLAYER) → select [MODE] → host or join using [EXACT CONTROL] → ready/deploy.
- Test setup: [ACCOUNT/CLIENT INSTRUCTIONS OR BETA BRANCH DETAILS].

[STEAM CLOUD — INCLUDE ONLY AFTER PUBLISH AND ROUND-TRIP TEST]
- Disabled “Cloud support for developers only,” published the setting, and verified save synchronization using build [BUILD ID] between [TEST ENVIRONMENTS].

[MATURE CONTENT — INCLUDE ONLY FOR CATEGORIES STILL SELECTED]
- Direct review access: press F9 at the title menu to open the Mature Content Verification Gallery.
- [CATEGORY]: select [EXACT BUTTON/SCENE].
- We removed survey selections that did not describe content in the submitted build.

[IN-APP PURCHASES — CHOOSE EXACTLY ONE]
- The in-app-purchase claim and purchase surface have been removed from this build.
OR
- Steam Wallet test route: Title Menu → [EXACT ROUTE]. Use [VALVE TEST ITEM]. The checkout opens the Steam authorization overlay and completes through our Steam backend. [INCLUDE TEST ACCOUNT/BRANCH NOTES IF REQUIRED].

[FULL CONTROLLER SUPPORT — INCLUDE ONLY AFTER HARDWARE PASS]
- Verified the entire build without keyboard or mouse using [CONTROLLER MODEL].
- Stage Resolution, UI Accessibility Scale, Text Speed, Callsign virtual-keyboard entry, and Achievements scrolling are controller-operable.

[LINUX/STEAMOS — INCLUDE IF OFFERED AND TESTED]
- Fresh-installed and tested the Steam-delivered build on [DISTRO/STEAMOS VERSION AND DEVICE].

Please let us know if you need any additional access instructions.
```

## Final go/no-go checklist

- [ ] Exact English library replacements are published, not merely present in the repo.
- [ ] AI disclosure matches every AI-assisted/generated family in the actual build and store art.
- [ ] Unsupported mature-content selections are removed; retained ones have tested direct routes.
- [ ] Every retained online tag passed with real accounts in the uploaded build.
- [ ] Steam Cloud developer-only is off and a two-machine round trip passed.
- [ ] IAP is removed, or real Steam Wallet—not a mock—passed end to end.
- [ ] Full Controller Support passed the complete controller-only route.
- [ ] Any offered Linux/SteamOS build passed a fresh Steam install.
- [ ] Reviewer notes contain the exact build ID, branch, menu paths, and only verified claims.
- [ ] Store page and build are saved, published, and then marked ready for re-review.

## Source-of-truth notes

- `docs/reports/steam-review-current-status-2026-08-24.md` is the most useful
  prior conservative audit.
- `steam/claim-evidence.json` currently keeps multiplayer, Cloud, purchases,
  achievements, and other claims unaccepted.
- `docs/ASSET_PROVENANCE.md` is the AI/provenance policy and remains explicitly
  incomplete.
- `docs/steam-review-failures-and-action-plan.md` and
  `docs/steam-review-remediation-master-guide.md` contain historical plans and
  overconfident readiness statements. They should not be copied into a new
  Valve submission without re-verification.
