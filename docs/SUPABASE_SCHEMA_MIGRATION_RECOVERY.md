# Supabase schema and migration reconciliation report

Project: `rjgzvpkyccfpnpzlbcuc` (Invest Broker)

## Scope and safety

This report separates the live migration ledger from SQL files available in Git. A version recorded as applied by Supabase is not proof that its original SQL is present in the repository. No production SQL was applied and no production migration history was changed during this recovery work.

## Live migration history

The latest reported live Supabase ledger contains 19 applied versions:

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

The workflow's historical-integrity list currently covers only the first 15 versions. It must not be treated as a complete inventory of the 19-version live ledger.

## Live schema snapshot (catalog metadata)

A previous read-only catalog inspection found 20 ordinary public tables and one public foreign table. The ordinary tables are:

- `profiles`, `wallets`, `investment_plans`, `investments`
- `ledger_accounts`, `ledger_entries`, `ledger_transactions`
- `deposits`, `withdrawals`, `treasury_accounts`, `audit_logs`
- `support_messages`, `compliance_cases`
- `user_bank_accounts`, `user_notifications`, `user_documents`, `user_complaints`
- `platform_control`, `payment_provider_registry`, `payment_intents`

The foreign table is `public."Invest-broker c"`. The prior inspection reported RLS enabled on the inspected ordinary public tables, append-only triggers for audit logs and ledger records, policies restricting client access to platform-control and payment-provider tables, and the `review_customer_account` security-definer function. A focused permission query reported that `anon` and `authenticated` lack SELECT privilege on the foreign table, consistent with the intent of migration `20261015002132`.

This catalog snapshot is not a portable database dump. It does not recreate historical SQL, customer data, Auth users, secrets, or foreign-server credentials.

## Recovery findings

Three original migration files were recovered from branch `feature/platform-foundation` with exact matching version and filename, and their SQL was not rewritten:

- `20261010055354_invest_broker_shared_platform_foundation.sql` — blob `aa5b2fa825abda67f9800a657c207cd9408d885f`
- `20261010060308_invest_broker_double_entry_ledger.sql` — blob `0e4ac76def957250413f6939292f9a0791f5707e`
- `20261010060317_invest_broker_ledger_posting_guard.sql` — blob `b3e85bfea3c004aa6db35bdafc8604dd482bf4c8`

The exact-version SQL for `20261015002132_revoke_api_access_from_foreign_table.sql` is also present. These are four verified original files among the first 15 ledger versions. This is not a claim that all later migrations are absent; check each filename and blob in the current branch before concluding.

The following nearby source files exist on `feature/platform-foundation`, but their timestamps do not match the applied versions. They have not been renamed or represented as exact historical migrations:

- `20261010062000_invest_broker_user_portal_support_features.sql` (ledger: `20261010055614`)
- `20261010_bootstrap_primary_admin.sql` (ledger: `20261010201831`)
- `20261011221200_platform_control_deny_client_access.sql` (ledger: `20261011221255`)
- `20261011222000_ledger_posting_requires_all_pending_lines.sql` (ledger: `20261011221826`)
- `20261012115000_payment_provider_test_scaffold.sql` (ledger: `20261012104812`)
- `20261012161000_deny_browser_access_payment_provider_tables.sql` (ledger: `20261012155617`)

Prior exact-path history searches did not locate the originals for these five versions:

- `20261010055730_invest_broker_notification_read_state`
- `20261010133726_invest_broker_account_approval_gate`
- `20261010133851_invest_broker_single_admin_control`
- `20261010133958_invest_broker_atomic_account_review`
- `20261011171226_phase_2_realtime_admin_customer_updates`

The other six first-15 migrations listed above have similarly timestamp-mismatched candidates, not verified original SQL. Do not infer equivalence from a similar filename or contents alone. The exact SQL for the four later ledger versions must also be verified against the repository before a complete-history claim is made.

## Validation and diagnostics

The migration-integrity workflow intentionally blocks a full replay when the expected historical files are missing. The isolated subset job tests only the three exact-version recovered files; even a passing subset replay cannot prove the entire live history is reproducible.

The workflow diagnostics change adds command tracing, captured CLI output, environment and Docker status in the GitHub Actions step summary, and a short-retention artifact for replay logs. Each replay command must preserve a failing exit code so the job remains red when a command fails.

## Safe next steps

1. Search every reachable branch, tag, commit, release artifact, and trusted backup for the exact original SQL; record provenance and blob hashes.
2. Compare any candidate migration against the live catalog and other trusted copies. Do not rename timestamp-mismatched files to satisfy integrity checks.
3. If originals cannot be recovered, prepare a separately named, reviewed fresh-environment schema baseline from a schema-only export. Validate objects, grants, RLS, functions, triggers, constraints, indexes, extensions and realtime settings in an isolated database.
4. Keep production migration history unchanged and do not run a production migration deployment until the full chain or an explicitly reviewed baseline plan is approved.
5. Keep financial operations disabled throughout recovery and testing.
