---
name: umami
description: Self-hosted Umami analytics. Use when upgrading an Umami instance or debugging one whose tracking stopped after a Prisma migration, adding or changing its tracker script on a site, putting it behind a reverse proxy, or querying its data or hunting bots in it.
---

# Umami

Umami runs as a Docker container against PostgreSQL. Its failures are quiet: after a bad upgrade the container boots, the dashboard renders and the logs read clean while no events are recorded. Treat nothing as working until a query against the data shows it.

Checked against Umami 3.4.0. Agent access needs 3.4.0 or later; everything else applies to any 3.x.

Read the file for the task at hand:

- Adding or changing the tracker on a site: [tracker.md](tracker.md)
- Reverse proxy, ingest gate, health checks: [hosting.md](hosting.md)
- Querying an instance through MCP, or reading its data for bots: [agent-access.md](agent-access.md)

Commands assume Umami's stock `docker-compose.yml`: services `umami` and `db`, with Postgres user and database both `umami`. Read the project's compose file and substitute its names.

## Upgrade procedure

Run this whenever the image tag changes.

1. Back up: `docker compose exec -T db pg_dump -U umami umami | gzip > umami-$(date +%F).sql.gz`
2. List the migrations the target adds. Compare what the new image ships against what the database has run:
   ```sh
   docker run --rm --entrypoint ls ghcr.io/umami-software/umami:<target> prisma/migrations
   docker compose exec db psql -U umami -d umami -c "SELECT migration_name FROM _prisma_migrations;"
   ```
   Read each new migration's SQL (`--entrypoint cat ... prisma/migrations/<name>/migration.sql`) and the GitHub release notes for every version crossed. Check each against **Upgrade footguns** and run any data checks they call for before going on.
3. Bump the tag in the compose file, then `docker compose up -d --force-recreate umami`.
4. Watch the boot with `docker compose logs -f umami` and confirm "X migrations found" naming the ones from step 2, "All migrations have been successfully applied", and "Ready in Xms" with no Prisma error. A `PrismaClientKnownRequestError` or `ColumnNotFound` means a migration failed; go to **Baselined migrations**.
5. Query the live schema for every table, column and rename the new migrations create. The log can report a migration as applied when it never ran, and renames are the most likely to be skipped:
   ```sh
   docker compose exec db psql -U umami -d umami -c \
     "SELECT column_name FROM information_schema.columns WHERE table_name = 'website';"
   ```
6. Run `ANALYZE session; ANALYZE website_event;` after any migration that touched a large table. Bulk DML leaves planner stats stale, and queries that were fast stay slow until autovacuum catches up.
7. Confirm events are arriving: `SELECT count(*) FROM website_event WHERE created_at > '<boot time>';` climbs at the instance's usual rate, and the user sees realtime data in the dashboard.

The upgrade is done when steps 5 and 7 both pass. A dashboard that loads is not evidence; in the v2 to v3 case below it loaded normally while every event was dropped.

## Upgrade footguns

Three kinds of change pass every boot check and still break an instance. Look for them in the release notes and migration SQL.

- **A behaviour change with no data migration.** When a release changes how stored data is interpreted (casing, trimming, enum values), rows written under the old rule stop matching. 3.2.0 lowercased login input but kept an exact-match lookup, locking out every mixed-case username until a later migration fixed the rows.
- **A new required setting.** A check added in a release can refuse users who never needed the setting before. 3.3.1 answers 503 to any 2FA user while `TWO_FACTOR_ENCRYPTION_KEY` is unset.
- **A query-time change.** A release can change how a metric is computed with no schema change, so historical numbers shift the moment it deploys (3.3.0 and bounce rate). Only the release notes say so.

## Baselined migrations

Prisma can mark a migration applied without running it. In one v2 to v3 upgrade, `09_update_hostname_region` was recorded as applied while `session` still lacked its `region` column, and all tracking failed.

Diagnose:

- Read the container logs for Prisma errors, `ColumnNotFound` above all.
- Compare the live schema against the migration SQL: `docker compose exec db psql -U umami -d umami -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'session';"`
- List what Prisma believes it ran: `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;` Several migrations finishing in the same second were baselined, not run.

Fix:

1. Back up again with the step 1 command.
2. Read the real migration: `docker compose exec umami cat prisma/migrations/<name>/migration.sql`
3. Run the missing statements against the database by hand.
4. Restart Umami, then repeat steps 5 and 7 of the upgrade procedure.
