# Steam commerce enablement — 2026-10-05

Status: production Microtransactions enabled; real checkout acceptance pending.

## Verified and changed

- Production previously ran `7783278f` with both Store flags off. This hid the
  Store tab, explaining the installed-build reports. A catalog containing SKUs
  was not proof that purchases were enabled.
- Production GetReport/v5 accepted the existing publisher credentials (HTTP 200,
  result OK). Local ledger had zero purchases. No transaction was initiated.
- Built `hunker-bunker-backend:candidate-cf9f4967` from the clean candidate tree;
  isolated health/catalog smoke passed with dummy credentials. Server and volume
  tests: 38 files, 356 tests passed.
- Preserved the prior environment privately at
  `/home/caveman/server/backups/backend.env.pre-commerce-20261005-1430` (0600).
- Authoritative stopped-service backup:
  `/home/caveman/server/backups/hunker-bunker-data-20261005-1431-stopped.tar.gz`.
  Restore into `hb-commerce-restore-20261005-1431` passed SQLite integrity_check.
  The earlier `1430` archive is not the designated rollback backup because the
  service restarted while that attempt was underway.
- Deployed `cf9f49671ed4` to the existing durable volume; public health HTTP 200.
- Set production Store and Microtransactions flags to 1; mock and sandbox flags
  to 0; reconciliation start boundary to `2026-01-01T00:00:00Z`.
- Worker completed reconciliation: zero orders, zero mismatches. This is a
  readiness check, **not** Valve's required real-transaction evidence.
- Public catalog now reports `purchaseMode: live`, `purchasesEnabled: true`.
  USD Microtransactions prices are $1 / $4 / $10 for 1 / 5 / 15 keys.
- Hosted Item Store remains disabled: publication/checkout has not been verified.

## CI investigation

On candidate `cf9f49671ed4`, Linux packaging and generated Presubmit passed.
Windows packaging, lint/test, Lighthouse and security CodeQL failed because
GitHub reported: "The job was not acquired by Runner of type hosted even after
multiple attempts." These jobs had no executed steps; this was not a test failure.
Failed jobs were rerun in runs 37366298963, 37366298964, 37366298982 and 37366298965.
The separate generated Code Quality run 37366296630 had the same runner failure
for Python (JavaScript passed); Actions rerun was refused and check-suite
rerequest returned 404. Do not disable this check to claim a green build.

## Next operator / handoff

1. Restart the installed game, open Steam Vault / Foundry and verify STORE appears.
2. With an authorized test account, verify cancel, then one real Wallet purchase
   and exact key delivery. No purchase has been performed by this operation.
3. Export GetReport covering that purchase using the private backend runbook;
   attach actual responses and account identity privately to Valve.
4. Verify hosted Item Store publication separately before enabling that route.
5. Confirm rerun conclusions. A fresh branch check or GitHub administrator action
   may be needed for the generated Code Quality check.
6. Keep the last verified backup before each deployment; follow the daily/weekly/
   monthly retention policy in the backend runbook. Do not restore the pre-sale
   database over any payments accepted after enablement.

Emergency rollback: disable commerce first in the private environment and recreate
the backend. Restore the prior environment as well as the prior image
`candidate-7783278f` if reverting the deployment: the deployment script rolls back
images only, not environment flags. Preserve the current ledger and report evidence.
Do not declare Steam clearance until real purchase and remaining review evidence exist.
