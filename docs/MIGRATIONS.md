# Database migrations (PINFO-195)

Up to PINFO-195, every Quarkus service ran with `quarkus.hibernate-orm.database.generation=update` in production. Hibernate would mutate the schema at boot to match whatever the entity classes looked like that day. The audit (LOW-04) flagged this as an ops risk: a developer changing a Java type on a column would silently drop or rewrite data, and there was no way to roll back.

## What changed

In production (`%prod` profile in `application.properties`):

- `quarkus.hibernate-orm.database.generation=validate` — Hibernate now refuses to start if the live schema doesn't match the entities.
- `quarkus.flyway.migrate-at-start=true` — Flyway runs all pending migrations from `src/main/resources/db/migration/` before the app accepts traffic.
- `quarkus.flyway.baseline-on-migrate=true` — on a Postgres that already carries the pre-Flyway schema (every existing prod DB), Flyway records the baseline version without re-executing the SQL.

Local dev / test still use `update` — contributors don't need to write a migration for every entity tweak during iteration.

## Adding a new migration

1. Create a file in the service's `src/main/resources/db/migration/` named `V<N>__<short_description>.sql`. The version number must be strictly higher than every existing one (gaps are fine, duplicates fail).
2. Write the DDL or DML you need. Use `IF NOT EXISTS` / `IF EXISTS` for safety, but Flyway never replays a migration that already ran (tracked in `flyway_schema_history`).
3. Update the matching JPA entity in the same PR. The validate-at-boot will catch a mismatch immediately on the next deploy.
4. Test locally:
   ```bash
   ./mvnw -pl <service> --also-make verify
   ```
5. Commit and merge. CD applies the new migration on the next deploy; the rollout pauses until Flyway finishes.

## Rolling back a bad migration

Flyway does not auto-rollback. The accepted pattern is forward-only:

1. Write a new migration `V<N+1>__revert_<bad_migration>.sql` that undoes the change (e.g. `DROP COLUMN`, `ALTER COLUMN ... TYPE ...`).
2. Push and deploy.

If you absolutely need to revert immediately and the change is destructive (data loss), restore from the nightly GPG-encrypted backup (see `k8s/README.md > Postgres backups runbook`) into a temporary database, hand-craft the recovery, then push the corrective migration.

## Common pitfalls

- **Never edit a migration after it has run on any environment.** Flyway records a checksum; mutating the file makes the next boot fail with `MigrationVersion already applied but with different checksum`. Always add a new `V<N+1>__fix_<thing>.sql`.
- **Postgres folds unquoted identifiers to lowercase.** Hibernate writes `auth0Id` in entities; on disk the column is `auth0id`. Use lowercase in your migrations to match.
- **Baseline interaction.** The very first migration (`V1__…`) is what Flyway considers "the baseline schema" on existing DBs. Any DDL above the baseline version is executed only on fresh DBs. If you need a migration that targets *every* DB regardless of baseline, that's not what Flyway does — write a `R__repeatable.sql` script (less common, see Flyway docs).
