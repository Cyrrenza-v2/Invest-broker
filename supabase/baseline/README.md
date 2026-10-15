# Fresh-environment schema baseline (recovery plan)

## Why this exists

The live Invest Broker database records 15 applied migrations, but Git currently contains only a subset of the exact historical SQL files. The missing files must not be recreated from guesses or by renaming migrations from other branches. The live database must not be reset or replayed to repair this repository gap.

## Required baseline procedure

1. Preserve the recorded production migration history and keep production migration/deploy jobs disabled.
2. Recover the exact original SQL from repository history/backups if possible. Exact originals remain preferred.
3. If originals cannot be recovered, export a **schema-only** snapshot from the live project using the Supabase CLI/database tooling into a separately named fresh-environment baseline. Do not export customer rows, auth users, secrets, or payment data.
4. Review the snapshot for tables, views, sequences, constraints, indexes, triggers, functions, grants, RLS enablement and policies, extensions, and realtime publication membership. Verify that it includes the protections added by the later recorded migrations.
5. Replay the baseline from an empty isolated local database, run schema lint/security checks, and compare the resulting catalog against a read-only schema inventory of the live project.
6. Keep the baseline separate from the historical migration directory and label it **fresh-environment-only**. Do not insert a fake historical migration version or mark the missing migrations as recovered.
7. Only after review, change CI to use the baseline path for fresh environments. Keep any production database mutation/deployment disabled until separately reviewed and explicitly authorized.

## Current gate

The workflow intentionally fails the historical-integrity check while original SQL is missing. The three exact-version recovered migrations pass isolated replay, but that is not evidence that the entire schema can be recreated. This gate must not be weakened to make CI green.

## Current verification

The live migration ledger lists these 15 versions: 20261010055354, 20261010055614, 20261010055730, 20261010060308, 20261010060317, 20261010133726, 20261010133851, 20261010133958, 20261010201831, 20261011171226, 20261011221255, 20261011221826, 20261012104812, 20261012155617, 20261015002132.

No production SQL was applied as part of this recovery work.
