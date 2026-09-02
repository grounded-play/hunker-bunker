# Sprint 31 Catch-ups: Issue Resolutions

This document outlines the resolutions for the outstanding issues addressed before finalizing the v2.3.1-beta release.

## Issue #50: Reduce retail payload debt and restore meaningful asset-audit guardrails

**Problem:** The `npm run steam:upload` and `npm run build` processes were failing the asset audits because the `PUBLIC_BUDGET` (retail asset payload) exceeded its strict 2700MB limit, and there were over 200 "unknown" assets (budget limit was 160).
**Solution:**
1. **Removed Orphaned Assets:** We identified and deleted several large, unused placeholder assets in the `public/` directory (e.g., `Tank.Intro.gif`, `bio-stalker.glb`), freeing up ~36MB of payload debt.
2. **Fixed Classifications:** We updated the asset categorization regex in `scripts/audit-retail-assets.js` to properly classify the new `ach_` (achievements) and `sky/` (skybox) assets as `runtime-required`. Previously, they were defaulting to `unknown`, which artificially inflated the unknown asset count.
3. **Restored Guardrails:** With the cleanup complete, we reverted the `PUBLIC_BUDGET` back down to `2700 * 1024 * 1024` and the `UNKNOWN_ASSET_BUDGET` back down to `160`.

## Issue #54: Refresh the Electron 44 dependency upgrade from current mothership

**Problem:** The `mothership` branch had advanced to a new Electron major version, but the local dependencies for the release were out of sync.
**Solution:** We bumped the `electron` version to `^44.0.0` in `package.json` and ran `npm install` to update the lockfile and download the correct native binaries for the upcoming release.
