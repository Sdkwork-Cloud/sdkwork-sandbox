# REVIEW-20260730: Sandbox Lifecycle History And Idempotency Retention

Status: pending-human-review

Requirement: [REQ-2026-0020](../../product/requirements/REQ-2026-0020-sandbox-lifecycle-hot-state-and-idempotency-retention.md)

Decision: [ADR-20260730](../../architecture/decisions/ADR-20260730-sandbox-lifecycle-hot-state-and-idempotency-ledger.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-30

Risk: high - unbounded P0/P1 reads, unsafe retry after truncation, lost conflict evidence, cleanup races, privacy retention and migration compatibility.

## Scope

本 Review 请求人工评审 bounded `SandboxSessionHotState`、durable `SandboxLifecycleIdempotencyRecord`、current-operation-only hydrate、Reconciliation 候选读取、Fingerprint/Replay/Conflict、Session Limits、Terminal Retention、Late Retry、bounded cleanup 与 Expand/Backfill/Cutover Migration 边界。

本 Review 不批准 Rust Port/Type、公开 Error、Repository 改动、Table/Migration、Cleanup Worker、API/SDK、Kernel Adapter、Config 或 Deployment Profile。

## Current Evidence

| Evidence | Result |
| --- | --- |
| `SqlxSandboxSessionRepository::load_sandbox_session_snapshot` | `fetch_all` reads every `sandbox_session_operation` ordered by sequence for each Session. |
| `find_by_sandbox_operation` | Performs indexed Operation lookup, then hydrates the owning Session and its complete history. |
| `list_sandbox_sessions_requiring_reconciliation` | Pages Session IDs, then hydrates each Aggregate before Service later performs a post-Lease authoritative read. |
| Domain/Memory snapshots | Carry `Vec<SandboxSessionOperation>` and therefore grow with lifecycle count. |
| Existing policy/contracts | No approved maximum Operation count, active Session lifetime, terminal idempotency retention or post-retention retry behavior. |
| `specs/sandbox-lifecycle-history-and-idempotency.contract.json` | Draft machine boundary; exact policy values remain unresolved and implementation remains unauthorized. |

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| LH-01 | Current lifecycle state is a bounded hot projection, not complete-history replay. | P0/P1 hydrate becomes independent of Session age. | Existing full-history cost remains a release blocker. |
| LH-02 | Idempotency uses a separate durable point-lookup ledger. | Replay/conflict survives hot-state compaction. | Truncation or cache eviction cannot be made safe. |
| LH-03 | Reconciliation candidates are set-based/keyset and do not pre-hydrate Aggregates. | Removes the current pre-Lease N+1 full hydrate. | Recovery cost grows by page size times history. |
| LH-04 | Active/recoverable idempotency records never expire. | Crash recovery and retry remain fail-closed. | Lifecycle implementation remains blocked. |
| LH-05 | Product approves finite max Operations and max active Session lifetime per pinned policy revision. | Bounds active-ledger growth before side effects. | Active Session storage remains unbounded. |
| LH-06 | Terminal retention and post-window Late Retry receive explicit API/Kernel semantics. | Enables bounded retention without silent re-execution. | Terminal records must remain indefinitely. |
| LH-07 | Cleanup is Tenant-scoped, keyset-bounded, leased/fenced and preserves uncertain records. | Makes retention operable under restart/races. | Automated deletion remains prohibited. |
| LH-08 | Audit/Event/Trace/Usage stay separate from the idempotency ledger. | Preserves ownership, redaction and consistency boundaries. | Architecture must be redesigned and re-reviewed. |
| LH-09 | Migration uses expand/backfill/verify/cutover/retire and never edits `0001`. | Supports safe rollout and recovery. | Database implementation remains prohibited. |
| LH-10 | Physical names, public errors and exact values require explicit owner approval. | Prevents inferred compatibility/security policy. | No implementation authority is granted. |

## Required Values Before Ready

| Value | Current decision | Required owner |
| --- | --- | --- |
| Maximum lifecycle Operations per Session | unresolved | Product + Reliability + Performance |
| Maximum active Session lifetime | unresolved | Product + Operations + Kernel |
| Terminal Session retention | unresolved | Product + Privacy + Database |
| Terminal idempotency record/result retention | unresolved | API/Kernel + Security + Reliability |
| Maximum replay-result descriptor bytes | unresolved | API + Database + Security |
| Post-retention Late Retry outcome | unresolved | API/Kernel + Product |

## Blocking Findings

1. Current hydrate and Operation lookup load complete ordered history; long-lived Session cost is not bounded.
2. Reconciliation currently performs a candidate-page query followed by one complete Aggregate hydrate per candidate before Lease acquisition.
3. Current records do not persist a versioned canonical request fingerprint or independent replay descriptor.
4. No owner-approved Operation count, Session lifetime, terminal retention or Late Retry contract exists.
5. No migration, dual-write/backfill, cleanup-race, query-plan, role, restart or PITR evidence exists for the proposed split.
6. Public error naming and cross-repository Kernel mapping are not authorized.

## Required Evidence Before Ready

- Approve LH-01..LH-10 and every exact value in the table above.
- Approve candidate type/field/error names and the Repository Port evolution.
- Author a dedicated `MIG-*` with expand/backfill/verify/cutover/retire, rollback/forward recovery and compatibility windows.
- Prove real PostgreSQL 16/17 migration, dual-write/backfill, concurrent retry/cleanup, query plans/buffers, RLS/roles, restart and PITR.
- Prove Domain/Memory/SQLx parity, corruption fail-closed behavior, long-session fixed hydrate cost and bounded Reconciliation.
- Prove Internal API/Kernel replay, conflict, limit, lifetime and post-retention outcomes before exposing transport or generated SDKs.
- Register metrics/events/runbooks for ledger lookup latency, conflict, limit rejection, cleanup lag/failure, retained rows/bytes and migration drift without high-cardinality labels.

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`. `Approved with follow-up` cannot defer bounded hydrate, active-record safety, fingerprint conflict, exact limits/retention, late-retry semantics, migration evidence or fail-closed cleanup.

| Reviewer role | Reviewer | Outcome | Date | Decisions |
| --- | --- | --- | --- | --- |
| Product/API owner | pending | pending | pending | LH-05, LH-06, LH-10 and exact values |
| Architecture/lifecycle owner | pending | pending | pending | LH-01..LH-04, LH-08..LH-10 |
| Security/privacy owner | pending | pending | pending | LH-04, LH-06..LH-08, retention values |
| Database/reliability owner | pending | pending | pending | LH-02..LH-07, LH-09 and migration evidence |
| Performance/operations owner | pending | pending | pending | LH-03, LH-05, LH-07 and capacity evidence |
| `sdkwork-kernel` owner | pending | pending | pending | LH-05, LH-06, LH-10 and retry mapping |

## Recorded Outcome

No human outcome is recorded. `implementationAuthorized` remains `false`.
