# SDKWork Sandbox Database Lifecycle

Purpose: PostgreSQL authoritative-server contracts and lifecycle assets for durable `SandboxSession`, Operation, `SandboxRuntimeBinding`, and recovery Lease/Fencing state.

Owner: SDKWork Runtime Platform.

Database role: `authoritative-server`.

Supported engine: PostgreSQL 16 and 17, UTF-8, UTC, no required extension. Production connections require a fixed trusted `search_path`, TLS, bounded connection/acquire/statement/lock/idle-in-transaction timeouts, and separate owner/migrator/runtime/backup roles. SQLite is not a supported Server Authority or fallback.

The `sandbox_allocation_ciphertext` column contains encrypted Provider-private recovery metadata. Key material is injected by the Service Host Secret Port and is never stored in this directory, ordinary configuration, logs, events, fixtures, or Wire contracts. Allocation Key IDs are limited to 1..=128-byte printable ASCII by both Domain constructors and `ck_sandbox_runtime_binding_allocation_metadata`; the database rejects bypass writes containing whitespace, control characters, or non-ASCII values. Workspace files, Agent records, Provider snapshot bytes, credentials, production rows, and runtime database files are forbidden here.

`sandbox_session_operation.sandbox_operation_sequence` is the authoritative zero-based Aggregate order, protected by a Tenant+Session unique constraint and continuity checks during restore. Timestamps remain audit metadata and must not determine lifecycle replay order. Snapshot restore validates State, Failure, Operation, Binding, and protected Allocation combinations before decryption.

## Bootstrap And Lifecycle

```bash
pnpm run db:validate
pnpm run db:plan
pnpm run db:migrate
pnpm run db:status
pnpm run db:drift:check
```

Production `autoMigrate` is disabled. A dedicated migrator applies reviewed PostgreSQL migrations before application readiness. The standard SDKWork Database Framework owns history tables, checksums, planning, execution, seed history, and drift state; this repository does not implement a second lifecycle engine.

## Recovery And Operations

Live PostgreSQL migration, concurrency, key re-encryption, CAS, restart, query-plan, and backup/restore candidate evidence is archived in the linked Engineering Reviews. Production PITR, RPO/RTO, privilege, multi-replica, load/SLO, monitoring, and restore-drill evidence remain release gates rather than assumptions of this schema; REQ-2026-0005 and REQ-2026-0006 remain `in-progress` until their human and production operations gates close.

REQ-2026-0018 defines only a draft Gate 0 for future PostgreSQL-backed `SandboxTenantQuotaState`, `SandboxAdmissionReservation`, `SandboxNodeCapacityState`, and `SandboxCapacityReservation` authorities. The active database registry remains limited to the four lifecycle tables; no quota/capacity table, migration, repository, RLS policy, runtime role, or scheduler integration is authorized. Before any such table is added, a separate human-reviewed pre-release migration plan must align the Domain projection, all existing `tenant_id TEXT` columns, repository bind types, fixtures, and Kernel/Agents mappings with `SUBJECT_ID_SPEC.md` positive `BIGINT` SQL subject semantics.

## Verification

```bash
node ../sdkwork-specs/tools/check-database-framework-standard.mjs --root .
node --test tests/contract/database-framework.contract.test.mjs
cargo test -p sdkwork-intelligence-sandbox-repository-sqlx
```

Related: `../docs/product/requirements/REQ-2026-0005-durable-sandbox-session-repository-and-reconciliation.md`, `../docs/product/requirements/REQ-2026-0006-sandbox-provider-allocation-key-rotation.md`, `../docs/product/requirements/REQ-2026-0018-sandbox-postgresql-quota-and-capacity-reservation-persistence.md`, `../docs/architecture/decisions/ADR-20260728-postgresql-sandbox-lifecycle-persistence-and-reconciliation.md`, `../docs/architecture/decisions/ADR-20260729-sandbox-postgresql-quota-and-capacity-reservation-persistence.md`, `../docs/engineering/reviews/REVIEW-20260729-sandbox-provider-allocation-key-rotation-verification.md`, `../../sdkwork-specs/DATABASE_SPEC.md`, `../../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md`, `../../sdkwork-specs/MIGRATION_SPEC.md`, `../../sdkwork-specs/SECURITY_SPEC.md`, `../../sdkwork-specs/SUBJECT_ID_SPEC.md`.

## Initialization state

This module is in **initialization state** for greenfield deployments:

1. **Baseline** — `database/ddl/baseline/{engine}/0001_sandbox_baseline.sql` contains the full DDL snapshot.
2. **Migrations** — `database/migrations/{engine}/` is reserved for post-GA incremental schema changes only. It is intentionally empty at initialization.
3. **Drift** — run `pnpm db:drift:check` before release.

## Commands

```bash
pnpm run db:validate
pnpm run db:materialize:contract
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:status
pnpm run db:drift:check
```
