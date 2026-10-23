# Fresh-environment schema baseline (recovery plan)

## Purpose and safety

The live Invest Broker project records 19 applied migrations. The repository does not currently contain verified original SQL for the full recorded history. This directory is reserved for a **fresh-environment-only** baseline; it must not be used to rewrite, fake, or reset production migration history.

No production SQL has been applied during this recovery work. Keep production migration/deploy jobs disabled and `financial_operations_enabled = false`.

## Verified live migration ledger

Read from the linked Supabase project during this recovery:

1. `20261010055354` — `invest_broker_shared_platform_foundation`
2. `20261010055614` — `invest_broker_user_portal_support_features`
3. `20261010055730` — `invest_broker_notification_read_state`
4. `20261010060308` — `invest_broker_double_entry_ledger`
5. `20261010060317` — `invest_broker_ledger_posting_guard`
6. `20261010133726` — `invest_broker_account_approval_gate`
7. `20261010133851` — `invest_broker_single_admin_control`
8. `20261010133958` — `invest_broker_atomic_account_review`
9. `20261010201831` — `bootstrap_single_primary_admin`
10. `20261011171226` — `phase_2_realtime_admin_customer_updates`
11. `20261011221255` — `platform_control_deny_client_access`
12. `20261011221826` — `ledger_posting_requires_all_pending_lines`
13. `20261012104812` — `payment_provider_test_scaffold`
14. `20261012155617` — `deny_browser_access_payment_provider_tables`
15. `20261015002132` — `revoke_api_access_from_foreign_table`
16. `20261016072153` — `index_foreign_keys_and_optimize_audit_policy`
17. `20261019163350` — `backend_webhook_safety_foundation`
18. `20261019172543` — `invest_broker_primary_admin_and_ledger_lockdown`
19. `20261019175117` — `invest_broker_financial_safety_gate`

The workflow's older integrity list includes only versions 1–15; that list is not the complete live ledger. A migration recorded as applied is not evidence that its original SQL file is available.

## Original SQL recovery results

Three originals have been recovered from `feature/platform-foundation` with exact version and filename and matching recorded blob hashes:

- `20261010055354_invest_broker_shared_platform_foundation.sql`
- `20261010060308_invest_broker_double_entry_ledger.sql`
- `20261010060317_invest_broker_ledger_posting_guard.sql`

The original `20261015002132_revoke_api_access_from_foreign_table.sql` is also present. Similar-named files with different version timestamps are not accepted as substitutes. Exact originals for the other ledger versions have not yet been verified from accessible GitHub history.

## How to produce the baseline

1. **Search trusted sources first.** Inspect all reachable branches, tags, releases, backups and CI artifacts for exact original SQL. Record the source commit and blob hash for each file. Never infer the historical version from a similar name.
2. **Export schema only.** Use the manual workflow `.github/workflows/supabase-schema-snapshot.yml` to create a temporary review artifact. In repository Settings → Secrets and variables → Actions, set `SUPABASE_DB_URL` to the direct Postgres connection string yourself. Do not paste credentials into chat or commit them.
3. Open Actions → **Export read-only Supabase schema snapshot** and run it. The workflow is manual-only, exports the public schema, and does not apply SQL. Download the short-lived artifact for review.
4. Review coverage for tables, views, sequences, types, constraints, indexes, functions, triggers, grants, RLS enablement and policies, extensions, realtime publication membership, and dependencies across schemas. The public-schema export alone may not capture managed schemas, roles, extension setup, or external foreign-server credentials.
5. Construct a clearly named baseline under this directory from the reviewed schema export. Include a provenance note, export timestamp, source project reference, and hash. Do not include application rows, auth users, secrets, payment data, or customer documents.
6. Replay it in an isolated empty local database. Run schema lint and security checks, then compare catalog inventories against the live project. A passing replay is necessary but not sufficient; manually review security-definer functions, grants, RLS, audit/ledger immutability and the single-admin guard.
7. Only after review, add a separate fresh-environment CI path. Keep it distinct from historical integrity validation. Do not insert a fake historical migration version or mark unrecovered migrations as restored.

## Current gate

**No complete baseline SQL has been created yet.** The actual schema-only artifact is needed to construct it faithfully; generating SQL from names or the partial catalog summary would be guesswork. The repository has the manual export workflow, but a user-configured `SUPABASE_DB_URL` secret is required before that workflow can produce an artifact.

- Full historical replay remains blocked until exact originals are recovered or a separately reviewed baseline route is established.
- The three-file isolated replay only tests that subset, not the complete schema.
- Production migration/deployment must remain disabled until review and explicit authorization.
- No production SQL or migration history was changed during this recovery.
