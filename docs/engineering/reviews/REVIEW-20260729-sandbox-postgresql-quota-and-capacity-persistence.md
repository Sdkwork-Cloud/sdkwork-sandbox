# REVIEW-20260729: Sandbox PostgreSQL Quota And Capacity Persistence

Status: pending-human-review

Requirement: [REQ-2026-0018](../../product/requirements/REQ-2026-0018-sandbox-postgresql-quota-and-capacity-reservation-persistence.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-sandbox-postgresql-quota-and-capacity-reservation-persistence.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: critical - SQL subject compatibility, tenant isolation, quota oversubscription, node capacity oversubscription, double release, stale fencing, PostgreSQL lock contention, recovery, PITR, and SaaS availability.

## Scope

本 Review 请求人工评审 `SandboxTenantQuotaState`、`SandboxAdmissionReservation`、`SandboxNodeCapacityState`、`SandboxCapacityReservation`、SQL Subject `BIGINT` 对齐、Resource Vector、事务/锁序、Constraint/CAS/Fencing、TTL/Quarantine、Reconciler、RLS/Role、Query Plan、Retention/PITR/RPO/RTO 与 Outbox/Audit 边界。

本 Review 不批准 Table Registry、Schema、Migration、Rust Port/Crate/Repository、Scheduler/Admission Runtime、Subject ID Cross-repository Migration、IAM/Commerce/Node Trust Adapter、API/SDK、Config、Service Host、Deployment Profile、Firecracker Provider、Docker 或商业发布。

## Candidate Contract Evidence

| Evidence | Result |
| --- | --- |
| `specs/sandbox-quota-and-capacity-persistence.contract.json` | Draft four-aggregate PostgreSQL authority, explicit subject blocker, transaction/lock/CAS/fencing, fail-closed expiry, security, recovery, and no-implementation gate. |
| `node --test tests/contract/sandbox-quota-and-capacity-persistence.contract.test.mjs` | PASS (13/13). |
| `node --test tests/contract/*.test.mjs` | PASS (107/107) for the complete repository contract suite. |
| `cargo fmt --all -- --check` / `cargo check --workspace --offline` / `cargo clippy --workspace --all-targets --offline -- -D warnings` | PASS; formatting, compilation, and all-target linting are clean. |
| `cargo test --workspace --offline` | PASS (41 passed, 1 PostgreSQL external-integration test ignored by its declared `SDKWORK_DATABASE_TEST_POSTGRES_URL` environment gate). The ignored test is not counted as real PostgreSQL evidence. |
| SDKWork repository documentation, package layout, component port, application layering, Rust composition, identity naming, Provider Session identity, pagination, API operation/envelope, database framework, and strict import-closure validators | PASS. |
| SDKWork documentation-debt and repository-baseline audits | PASS; zero documentation-debt repositories and all baseline checks passed. |
| Kernel `cargo check -p sdkwork-agent-kernel --offline` and exact `maps_invalid_sandbox_page_request_to_non_retryable_runtime_validation_error` regression | PASS; `InvalidPageRequest` is exhaustively mapped to a non-retryable Runtime `ValidationError` (1/1 exact test). |
| Agents `cargo check --workspace --offline` and `cargo tree -p sdkwork-agents-kernel-bridge --offline` | PASS; dependency evidence remains `sdkwork-agents-kernel-bridge -> sdkwork-agent-kernel -> sdkwork-intelligence-sandbox-service -> sdkwork-sandbox-provider-spi`. |
| `specs/sandbox-multi-tenant-scheduling.contract.json` | REQ-2026-0016 Admission/Placement workflow consumes this persistence contract before database implementation. |
| `specs/sandbox-node-trust-and-inventory.contract.json` | Node Capacity State may consume only REQ-2026-0017 Verified Inventory revision/fingerprint and cannot author trust. |
| `database/contract/table-registry.json` | Remains the exact four active Lifecycle tables; no proposed table is falsely registered. |
| `database/migrations/postgres/0001_create_sandbox_lifecycle.up.sql` | Remains unchanged; no unauthorized migration was created or edited. |
| Real PostgreSQL 16/17 multi-replica, RLS/role, quota/capacity race, PITR and Firecracker evidence | Absent by design; implementation is not authorized. |

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| QCAP-01 | Use four responsibility-specific State/Reservation aggregates and tables. | Fixed O(1) lock/CAS state plus auditable Reservation facts without authority duplication. | Submit another reviewed physical model before migration. |
| QCAP-02 | IAM/Commerce Snapshot and Verified Node Inventory remain external authorities; Sandbox owns only occupancy and Reservation. | Prevents identity, billing, entitlement, and Node Trust forks. | Persistence implementation remains blocked. |
| QCAP-03 | Align SQL `tenant_id` to positive `BIGINT` before adding new tables. | Stops current TEXT/Opaque deviation from spreading before launch. | Requires an approved exception or replacement subject contract; no new tables. |
| QCAP-04 | First resource vector uses explicit Runtime Unit/vCPU/Guest Memory/VMM Overhead columns. | Gives constraints, predictable plans, and additive evolution. | Propose another typed schema; untyped JSON is not accepted. |
| QCAP-05 | Use global Lock Order plus Row Lock/Constraint/CAS/Fencing and bounded whole-transaction retry. | Prevents oversubscription, stale writes, and avoidable deadlocks. | Multi-replica implementation remains blocked. |
| QCAP-06 | Confirmed/Bound uncertainty quarantines and retains counters; TTL alone cannot free capacity. | Prevents still-running resources from being resold after controller failure. | Provide stronger cleanup proof protocol and re-review. |
| QCAP-07 | Tenant RLS, least-privilege roles, primary reads, safe errors, low-cardinality telemetry, and audit are mandatory. | Preserves tenant isolation and operational privacy. | Cloud persistence remains blocked. |
| QCAP-08 | Candidate recovery target is 7-day PITR, RPO <= 5m, RTO <= 30m, restore exercise <= 90d. | Gives a concrete production review baseline. | Database/Reliability/Operations owners must provide replacement targets. |
| QCAP-09 | Schema/Registry/Migration/Repository remain unauthorized until all reviews close. | Keeps Gate 0 evidence honest and migrations governed. | Requirement stays draft and no implementation begins. |

## Pre-review Blocking Findings

1. Existing `TenantId` and four PostgreSQL Lifecycle tables use Opaque String/TEXT while `SUBJECT_ID_SPEC.md` requires positive Snowflake `BIGINT`; affected Kernel/Agents mappings, fixtures, API boundaries and migration semantics are not yet approved.
2. IAM/Commerce Snapshot Issuer/Signature/Revocation/Clock/Override and Node Verified Inventory storage/refresh authorities remain draft or absent.
3. Proposed table IDs, full DDL, Foreign Key/RLS Policy, Unique/Partial Index, Constraint names, online migration sequence, compatibility window and rollback/forward-fix plan are not materialized.
4. Cross-aggregate Repository Transaction Context and global Lock Order integration with current `SandboxSessionLease`/Session/Runtime Binding writes are not implemented or race-tested.
5. No real multi-replica Quota/Capacity Race, Deadlock, Serialization, Failover, Counter Drift, Load/Soak, Query-plan, Role/Search-path, PITR or restore evidence exists.
6. Transactional Outbox Migration/Worker, Audit Store, Dashboard/Alert, Quota Incident Runbook and commercial Capacity Owner are not implemented.
7. No real Linux KVM Firecracker Reservation-before-Allocate, Limit-not-above-Reservation, Node Loss or Cleanup/Quarantine evidence exists.

## Required Evidence Before Ready

- Architecture/Database/Reliability/Security/Privacy/IAM/Commerce/Capacity/Operations/Firecracker approval for QCAP-01..QCAP-09.
- Approved pre-launch Subject ID Migration Plan covering Domain Types, `tenant_id BIGINT`, current tables, Repository binds, fixtures, Kernel/Agents mapping, compatibility and rollback/forward-fix.
- Contract Version bump plus synchronized Schema/Table/Prefix Registry, Migration Metadata, Drift Policy, Component Port and Runbook review before any migration is authored.
- Real PostgreSQL 16/17 migration/repository/RLS/role/concurrency/query-plan/drift/backup/restore/PITR evidence and multi-replica failure injection.
- Real Firecracker reservation/resource/cleanup evidence plus Capacity SLO, alert, incident, rollout and rollback evidence.

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`. `Approved with follow-up` cannot defer SQL Subject Alignment、Tenant Isolation、Quota/Capacity Atomicity、Lock/CAS/Fencing、Confirmed Reservation Quarantine、RLS/Role、PITR/Restore 或真实 PostgreSQL/Firecracker Evidence。

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | QCAP-01..QCAP-09 |
| Database/reliability owner | pending | pending | pending | QCAP-01, QCAP-03..QCAP-09 |
| Security/privacy owner | pending | pending | pending | QCAP-02..QCAP-07 |
| IAM subject owner | pending | pending | pending | QCAP-02..QCAP-03 |
| Commerce entitlement owner | pending | pending | pending | QCAP-02, QCAP-06..QCAP-08 |
| Capacity/quota owner | pending | pending | pending | QCAP-01, QCAP-04..QCAP-08 |
| Observability/operations owner | pending | pending | pending | QCAP-06..QCAP-09 |
| Firecracker/KVM owner | pending | pending | pending | QCAP-04..QCAP-07, QCAP-09 |

## Implementation Gate

REQ-2026-0018 remains `draft`, ADR remains `proposed`, and this Review remains `pending-human-review`. Until every required reviewer records `Approved` and the Subject/IAM/Commerce/Node Trust authorities are resolved, do not register or create PostgreSQL Tables/Migrations, Rust Ports/Crates/Repositories, Scheduler/Admission Runtime, Outbox Worker, API/SDK, Config, Service Unit, Deployment Profile or Provider integration.

## Close-Out Checklist (Reviewer 执行项)

Review Approved 前必须逐项核验：

- [ ] REQ-STATUS: 对应 REQ 处于 `ready` 或 `accepted`
- [ ] ADR-STATUS: 对应 ADR 处于 `accepted`
- [ ] ARCH-REVIEW: 接口契约、命名、Port 边界、L0-L6 分层符合 COMPONENT_SPEC
- [ ] SEC-REVIEW: 数据分类、红字规则、零化清理、Secret 流、并发控制符合 SECURITY_SPEC
- [ ] PERF-REVIEW: 有界 Page/Buffer、低 Cardinality Metric 符合 PERFORMANCE_SPEC
- [ ] OBS-REVIEW: Trace/Audit/Event/Outbox/Meter 符合 OBSERVABILITY_SPEC
- [ ] TEST-EVIDENCE: Unit Test 全量通过；Contract Test 通过
- [ ] DEPENDENCY-DIRECTION: cargo tree 方向正确
- [ ] EVIDENCE-SIGN-OFF: 对应 Verification Review 接受状态非 pending
- [ ] HUMAN-DECISION: Decision Matrix 每条均 Approved 或 Changes + 替代方案

## Exit Gate

1. 全部 Checklist 勾选
2. 所有 Reviewer Role 表决 Approved
3. REQ 进入 `ready`，ADR 进入 `accepted`
4. Gate 0 `implementationAuthorized` 最后一个 Review 通过后可置 true

未经上述门禁，禁止进入 V1 实现阶段。
