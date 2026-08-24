# Steam Review Current Status Ledger

**Status:** Current operational review ledger
**Last verified:** 2026-08-24
**Steam App:** Hunker Bunker (`4957040`)
**Purpose:** one current place to reconcile Valve's review feedback against the actual repo and acceptance evidence.

> This document supersedes the older Steam review remediation plans **for current status only**. The older files remain historical evidence of what was planned at the time.

## Evidence rule

Steam review readiness follows the same project-wide ladder:

**Designed → Coded → Connected → Tested → Live-verified → Packaged-verified → Accepted**

A feature can be code-complete and still be unready for the store claim Valve sees.

The repo already contains a useful claim-hold mechanism in `steam/claim-evidence.json`. At this audit it still marks multiplayer, Timeline, Deck Verified, full audio, Steam Cloud, Steam Achievements and purchases as **held** rather than accepted. Preserve that conservative default until the corresponding proof exists.

---

## Last known Valve review feedback and current disposition

### Store presence: Library Capsule / Header English title

**Valve feedback:** English is supported, but Library Capsule/Header did not show the product name in English.

**Current repo:** updated store/library assets exist, but repository presence is not Valve acceptance.

**Status:** **Repo remediation exists; Valve re-review acceptance open.**

**Required before resubmission:** visually inspect the exact English-localized assets selected in Steamworks and confirm `HUNKER BUNKER` is the only required title treatment where Valve requires it.

### Store presence: Library Capsule full-bleed artwork

**Valve feedback:** capsule artwork did not fill the available space.

**Status:** **Human/Steamworks verification required.**

The final check must be against the image currently published in the English Steamworks slot, not only a similarly named repo file.

### Store presence: Library Logo extra text/logo

**Valve feedback:** Library Logo contained additional text/logo treatment.

**Status:** **Repo remediation exists; Steamworks re-review open.**

Verify the selected Library Logo contains only the product title treatment Valve permits.

### AI Content Survey description

**Valve feedback:** AI description contained unrelated information and the reviewer also noted a discrepancy between in-game images / coding-agent usage and the disclosure.

**Current repo:** player-facing/generated asset provenance is explicitly incomplete and Sprint 30 is establishing a better evidence ledger. Coding-agent use and AI-generated visual content have both been part of development history.

**Status:** **Human Steamworks action + provenance reconciliation.**

**Rule:** Steam AI copy should be literal and limited to how generative AI was used in the app/store/community/marketing surfaces; do not mix normal game description into this field. Derive the final text from `ASSET_PROVENANCE.md` and the actual shipped/store asset set.

### Online Co-op / PvP categories

**Valve feedback:** reviewer could not find/access the online functionality claimed on the store page.

**Current repo:** multiplayer is now materially real: Tactical Net, Steam lobby wrapper, relay session, synchronized gameplay paths, ready/loadout flow, co-op enemy sync/revive and PvP damage validation exist. The production backend path is live in current project documentation.

**But:** no current repository acceptance report proves the complete **two-real-Steam-account packaged production expedition** through extraction/results. Cross-region public browse also has a known native-binding limitation in earlier real-machine investigation; current Steam lobby client still delegates list discovery directly to the native Steam API.

**Status:** **Connected/Tested; store claim acceptance still open.**

**Sprint 30 gate:** two real accounts, packaged clients, launched through Steam, invite/join/ready/deploy, meaningful synchronized combat, reconnect/host case, extraction/end state, stats/save observations.

### Steam Cloud developer-only / syncing

**Valve feedback:** Cloud was configured as developers-only in Steamworks.

**Current repo:** game-side Steam Cloud save bridge is wired and test-covered. `PRODUCT_STATE.md` correctly keeps real installed-build round-trip acceptance open.

**Status:** **Code connected; dashboard state must be rechecked; real Cloud round trip open.**

Before resubmission verify the Steamworks developer-only checkbox is disabled for the intended audience and run Machine A → Cloud → clean Machine B → modify → Machine A.

### Mature-content categories could not be verified

**Valve feedback:** reviewer could not find several selected survey categories, including suicide/self-harm-related material and multiple sexual/nudity categories.

**Current repo:** a reviewer gallery/debug path exists and old remediation work added direct routes/logs. However, the earlier remediation strategy sometimes tried to **add content to justify previously selected survey boxes**. That is not a good ongoing product policy.

**Status:** **Survey/content reconciliation required before next submission.**

For each mature-content checkbox:

1. confirm the category describes content the team actually wants in the shipping game;
2. if yes, provide a direct reviewer route and keep the disclosure;
3. if no, remove the category/claim rather than manufacturing content solely to satisfy the checkbox;
4. ensure the customer-facing mature-content description matches the final survey choices.

The old `steam-review-failures-and-action-plan.md` and `steam-review-remediation-master-guide.md` should be treated as historical/reference material, not current policy.

### In-app purchases / Steam Wallet

**Valve feedback:** Vault → Store showed `Store Catalog Unavailable`, so Valve could not verify Steam Wallet integration.

**Current technical configuration:** both `fly.toml` and `docker-compose.yml` default `HB_STEAM_STORE_ENABLED=0` and `HB_STEAM_MICROTXN_ENABLED=0`; `steam/claim-evidence.json` keeps purchases held. Older July/August product/remediation docs, however, describe real-money Cache Keys / Item Store / Community Market as mandatory launch features.

**Status:** **Product-policy conflict, not merely a code bug.**

Sprint 30 must choose one canonical launch policy:

- **Defer IAP for premium launch:** remove/disable the retail Store purchase surface and remove the Steam in-app-purchase claim until a later accepted Wallet implementation; or
- **Ship IAP:** enable only after installed-build Steam Wallet sandbox/production acceptance, catalog schema verification, purchase/finalize flow, failure/refund behavior, disclosure and chance-purchase compliance are all proven.

Do not let old docs make this decision by inertia.

### Full Controller Support

**Valve feedback:** Stage Resolution, UI Accessibility Scale, Text Speed, Operator Callsign virtual keyboard and Achievements scrolling were not fully controller-operable.

**Current repo:** remediation code exists for these areas and Sprint 28/29 added further Steam Deck/twin-stick/right-stick pointer work.

**Status:** **Connected/Tested; full packaged controller-only acceptance still required.**

Acceptance route starts the Steam-installed game without touching mouse/keyboard and reaches every Settings function, callsign editing, Achievements scrolling, gameplay, pause, multiplayer where claimed, and quit.

### Linux / SteamOS

**Valve note:** Windows was reviewed; Valve did not confirm Linux/SteamOS.

**Current repo:** Linux packaging/depot support exists and 1280×800/Deck is an explicit target.

**Status:** **Physical/fresh-install acceptance open.**

Run the Steam-delivered Linux/Deck build, not only an unpacked local binary.

---

## Current claim-control contradiction to fix

`steam/claim-evidence.json` is conservative and good, but `scripts/audit-steam-claims.js` currently scans only two copy files:

- `docs/steam-deck-compatibility-announcement.md`
- `docs/steam-portal-copy.md`

That means stronger claims can still appear in README, release notes, Product State, or old docs without being governed by the claims audit.

**Sprint 30 action:** decide which **current/public** copy surfaces belong under claims enforcement. Do not include historical/archive docs as if they were current marketing copy; classify them instead.

---

## Documents to classify as historical/reference for Steam review

- `docs/steam-review-failures-and-action-plan.md` — original August 14 plan; explicitly contains unbuilt/superseded assumptions.
- `docs/steam-review-remediation-master-guide.md` — useful implementation history but retains a "full feature retention" policy, old LAN/IAP assumptions, and reviewer-content choices that should no longer govern the product automatically.
- `docs/steam-v1-product-brief.md` — July scope lock says co-op is out of scope while real-money Cache Keys / Community Market and Fly.io are mandatory; current product/repo has materially diverged.

Preserve them as history. Create current decisions elsewhere.

---

## Pre-resubmission gate

Do not mark Store Presence / Game Build ready again until the following are either passed or the corresponding Steam claim is removed:

1. exact Steamworks English library assets visually verified;
2. AI Content Survey reconciled to actual shipped/store/community content;
3. mature-content survey reconciled to content actually intended to ship, with direct reviewer instructions;
4. two-account packaged Online Co-op/PvP route accepted for every online tag retained;
5. Steam Cloud developer-only setting rechecked and real two-machine sync passed;
6. IAP policy decided; Wallet route accepted if retained, otherwise Store purchase surface/claim removed;
7. controller-only packaged route accepted if Full Controller Support retained;
8. Linux/SteamOS fresh-install route tested for the platforms claimed;
9. reviewer Notes updated with exact menu paths, branch/build/version, and any reviewer hotkeys required.

## Sprint 30 desired outcome

At closeout, every Valve review item should be one of:

- **Accepted / ready for re-review**;
- **Repo-complete but awaiting human Steamworks action**;
- **Blocked with one precise failure layer**;
- **Claim removed/deferred intentionally**.

There should be no category whose status is simply "we think the code probably supports it now."