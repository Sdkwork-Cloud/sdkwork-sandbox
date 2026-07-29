# PostgreSQL Baseline Snapshots

The current `migrations-only` strategy bootstraps PostgreSQL from `database/migrations/postgres/`. Optional generated/reviewed baseline snapshots may be introduced by a later migration requirement; they are not a second production bootstrap authority.
