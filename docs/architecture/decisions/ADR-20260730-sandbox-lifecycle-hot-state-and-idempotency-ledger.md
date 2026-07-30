# ADR-20260730: Sandbox Lifecycle Hot State And Idempotency Ledger

Status: proposed

Requirement: REQ-2026-0020

Owner: SDKWork Runtime Platform

Date: 2026-07-30

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `DATABASE_SPEC.md`, `DATABASE_FRAMEWORK_SPEC.md`, `MIGRATION_SPEC.md`, `PERFORMANCE_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `OBSERVABILITY_SPEC.md`, `EVENT_SPEC.md`, `TEST_SPEC.md`

## Context

The accepted lifecycle persistence candidate stores current `SandboxSession` state and an ordered `sandbox_session_operation` history. SQLx hydrates every Operation for each Session and replays the complete sequence before restoring the Aggregate. Point lookup by Operation first resolves the Session and then performs the same full hydrate. Reconciliation pages select Session IDs and then repeat full hydrate per candidate before a later post-Lease authoritative read.

That design is defensible for initial state-machine proof, but it is not commercially bounded. A long-lived Session can accumulate unlimited Start/Stop retries, making interactive reads and recovery proportional to history. There is no approved maximum operation count, Session lifetime, terminal idempotency window or deletion behavior. Deleting old rows without a replacement authority would allow unsafe retries or erase conflict evidence.

## Decision

1. Lifecycle current state uses a bounded `SandboxSessionHotState` projection. It owns current Session State, current Runtime Binding, last typed Failure, current In-progress Operation reference when required, optimistic Version and the applied Lifecycle Policy Revision. It is not an event-sourced projection and is never reconstructed by scanning complete Operation history.
2. Operation replay/conflict facts use a separate durable `SandboxLifecycleIdempotencyRecord` ledger keyed by `(tenant_id, sandbox_operation_id)`. Each record binds Owner Session, Operation Kind, versioned canonical Request Fingerprint, terminal/in-progress Outcome, minimal replay descriptor, policy revision and CAS timestamps/version.
3. The ledger is an L4 persistence concern behind Service-owned ports. Domain and Service semantics remain provider-neutral; no Provider, API, SDK, Kernel or Agent dependency enters the Repository adapter.
4. Normal Session hydrate reads bounded hot state, current Runtime Binding and at most one current In-progress Operation. `find_by_sandbox_operation` performs a point lookup and returns a replay decision without loading a Session's historical Operation collection. The exact Repository Port evolution remains blocked until naming and migration review.
5. Reconciliation candidate listing returns bounded Tenant-scoped identities/current-operation references in one keyset page. It does not pre-hydrate N complete Aggregates. After Lease acquisition, each candidate receives an explicit bounded authoritative read and state/fencing recheck before any side effect.
6. Canonical fingerprinting is versioned and covers Operation Kind plus every immutable caller-controlled field relevant to the lifecycle command. Same Operation and Fingerprint replays the persisted business-equivalent result; a different Fingerprint, Kind or Owner conflicts before Provider/Host work.
7. Active, transient, recoverable or retry-eligible Session records never expire. Each Session pins an approved policy revision. Maximum operations and maximum active lifetime are enforced before side effects so active-ledger cardinality cannot grow without a product boundary.
8. Terminal ledger retention is finite only after Product, API/Kernel, Security/Privacy, Database, Reliability and Operations approve the exact window and late-retry semantics. Absence after retention must never silently authorize re-execution. The implementation may not guess values or use TTL alone as deletion authority.
9. Retention/archival is a bounded P3 workflow: Tenant/partition scoped keyset batches, maximum batch 100, database time, worker Lease/Fencing, durable checkpoint, rate limit, idempotent retry and fail-closed preservation on uncertainty. Audit, Event, Trace, Log and Usage storage remain separate authorities.
10. Persistence evolution uses Expand/Backfill/Verify/Cutover/Retire under a dedicated Migration record. The applied baseline migration is immutable. Cutover requires real PostgreSQL concurrency, representative plans/buffers, least-privilege roles, restart, rollback/forward recovery and PITR evidence.
11. Exact physical table names, retention values, error names, result representation and public/Kernel behavior are review decisions, not implementation details that an agent may infer.

## Alternatives

- Keep complete history hydrate: rejected for production because P0/P1 cost grows with Session age and Reconciliation performs repeated aggregate reads.
- Truncate to the last N rows: rejected because it can erase idempotency conflict and recovery facts without defining late retry behavior.
- Use Event/Audit/Log storage as the ledger: rejected because those streams have different delivery, redaction, retention and consistency authorities.
- Store the entire history in a cache: rejected because cache loss or eviction cannot change authoritative lifecycle semantics.
- Full event sourcing with periodic snapshots: rejected for this lifecycle because current state is already authoritative and event-sourcing complexity does not remove the independent idempotency-retention decision.
- Retain every record forever: safe for replay but rejected as the default commercial posture because storage and privacy obligations remain unbounded.

## Consequences

- Interactive lifecycle reads and post-Lease recovery can have fixed database and memory bounds independent of historical operation count.
- The Service/Repository contract and PostgreSQL schema require a reviewed migration rather than a local query optimization.
- Product must publish finite Session and idempotency behavior; some clients may need a typed limit/lifetime outcome and a new Session workflow.
- A terminal retention window has an explicit compatibility cost and cannot be introduced without API/Kernel review.
- Audit evidence remains independently retainable even when idempotency result detail is minimized or retired.

## Verification

- Static machine contract proves separation, fixed query bounds, replay/conflict rules, retention decision gates, migration stages and forbidden coupling.
- PostgreSQL plans prove point lookup and current-operation hydrate are indexed and bounded at the approved maximum cardinality.
- Concurrency tests prove same-key replay/conflict, CAS, dual-write cutover, cleanup versus retry, controller restart and Lease/Fencing behavior.
- Long-session tests prove normal hydrate and Reconciliation memory/row counts do not grow with historical Operation count.
- Migration evidence proves expand/backfill/verify/cutover/recovery without modifying the applied baseline.

## Review

Required human owners: Product/API, Architecture, Security/Privacy, Database, Reliability/Operations, Performance, lifecycle Service and `sdkwork-kernel` integration. This ADR remains `proposed` and authorizes no implementation.

## Supersedes / Superseded By

If accepted, this ADR narrows the unbounded full-history restore choice in ADR-20260728 without changing its PostgreSQL authority, Tenant isolation, CAS, Lease/Fencing, encryption or recovery ordering. ADR-20260728 remains historical authority for the accepted candidate until the migration and cutover are approved.
