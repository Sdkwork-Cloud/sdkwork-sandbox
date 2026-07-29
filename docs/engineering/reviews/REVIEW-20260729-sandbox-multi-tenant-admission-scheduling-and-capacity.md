# REVIEW-20260729: Sandbox Multi-tenant Admission, Scheduling And Capacity

Status: pending-human-review

Requirement: [REQ-2026-0016](../../product/requirements/REQ-2026-0016-sandbox-multi-tenant-admission-scheduling-and-capacity.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-sandbox-multi-tenant-admission-scheduling-and-capacity-reservation.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: critical - tenant admission, entitlement input, quota race, node trust, placement isolation, capacity oversubscription, fairness, PostgreSQL concurrency, Firecracker readiness, and SaaS availability.

## Scope

本 Review 请求人工评审 `SandboxAdmissionPolicyPort`、`SandboxNodeInventoryPort`、`SandboxSchedulerPort`、`SandboxCapacityReservationPort`、`SandboxAdmissionGrant`、`SandboxCapacityReservation`、`SandboxPlacementDecision`、PostgreSQL 原子 Reservation、Fairness、Fencing、typed Denial、Orphan Recovery 与 Resource Grant Binding。

本 Review 不批准 Rust Port/Crate、Scheduler/Admission Runtime、Database Schema/Migration、Node Agent/Enrollment、Warm Pool、Provider、API/SDK、Config、Deployment Profile、Commerce Runtime、Autoscaling、Preemption、Snapshot、GPU、Docker、gVisor、Kubernetes 或 Remote VM。

## Candidate Contract Evidence

| Evidence | Result |
| --- | --- |
| `specs/sandbox-multi-tenant-scheduling.contract.json` | Draft Admission/Inventory/Scheduler/Capacity/Placement boundary; all runtime, scheduler, database, node-agent, pool, and Commerce implementations are explicitly unauthorized. |
| `specs/sandbox-node-trust-and-inventory.contract.json` | REQ-2026-0017 draft Gate binds Machine Identity, Attestation and Inventory revisions into the only verified projection this Scheduler contract may consume; all Node Trust runtime remains unauthorized. |
| `specs/sandbox-quota-and-capacity-persistence.contract.json` | REQ-2026-0018 draft Gate defines four PostgreSQL State/Reservation aggregates, SQL subject migration, global lock/CAS/fencing, fail-closed expiry, RLS/roles and recovery objectives; no table or repository is authorized. |
| `node --test tests/contract/sandbox-multi-tenant-scheduling.contract.test.mjs` | PASS (10/10); static checks cover authority, atomic admission, hard filters, node eligibility, durable capacity reservation, resource binding, fencing/recovery, errors/bounds, event/metric and privacy. |
| `node --test tests/contract/*.test.mjs` | PASS (107/107); complete repository contract suite includes Provider, Command Execution/Cancel, Broker, Workspace, Network, Resource/Usage, Observability, Multi-tenant Scheduling/Capacity, Node Trust/Verified Inventory, and PostgreSQL Quota/Capacity Persistence boundaries. |
| `specs/sandbox-firecracker-resource-isolation.contract.json` | Resource Limit Grant consumes Admission Grant and Capacity Reservation identity/fingerprint and cannot exceed the reservation. |
| `specs/sandbox-provider-delivery-gates.contract.json` | Firecracker cloud delivery consumes the draft scheduling/capacity boundary before Provider selection/allocation. |
| `cargo fmt --all -- --check` / `cargo check --workspace --offline` / `cargo clippy --workspace --all-targets --offline -- -D warnings` | PASS; formatting, compilation and all-target linting are clean. |
| `cargo test --workspace --offline` | PASS (41 passed, 1 PostgreSQL external-integration test ignored by its declared environment gate). |
| SDKWork repository validators | PASS: documentation standard, packages layout, strict component ports, application layering, Rust backend composition, identity naming, documentation debt and repository baseline. |
| `git diff --check` | PASS; no whitespace errors. |
| Real PostgreSQL, multi-replica, Node Inventory, KVM and scale evidence | Absent by design; no Scheduler, admission engine, reservation store, Node Agent, Firecracker placement, or production topology exists. |

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| SCHED-01 | Admission、Inventory、Scheduler 与 Capacity Reservation 使用四个独立 provider-neutral L3 Port。 | 固定高内聚所有权并阻止 Provider Policy 漂移。 | 重新划分并评审后才能导出 Port。 |
| SCHED-02 | Admission 必须原子预留 Tenant 并发 Quota，签发短期 signed `SandboxAdmissionGrant`。 | 消除并发 Quota TOCTOU。 | 不允许任何 SaaS Provider Selection。 |
| SCHED-03 | Node Snapshot 只从 REQ-2026-0017 `SandboxVerifiedNodeInventoryRecord` 投影，版本化且短期；Stale/Drain/Quarantine/Revoked/Expired/Unknown 不可调度。 | 只使用经过 Control-plane 验证且可恢复的 Capacity Evidence。 | Node 不能进入候选集合。 |
| SCHED-04 | Capability/OS/Architecture/Assurance/Locality/Residency/Policy/Health/Capacity 先硬过滤，禁止弱 Provider 回退。 | 保持安全与合规 Placement。 | 提交更严格算法并重审。 |
| SCHED-05 | PostgreSQL 原子 Capacity Reservation 发生在 Provider Allocate 前，第一版禁止 Overcommit。 | 防止负 Capacity、超卖和 Double Placement。 | Firecracker Cloud Runtime 保持阻塞。 |
| SCHED-06 | Resource Limit Grant 绑定 Admission/Reservation 且不得超过预留 Resource Vector。 | Placement Capacity 与 Host Enforcement 保持一致。 | REQ-2026-0015 不能进入实现。 |
| SCHED-07 | Priority 来自 Admission Grant；Tenant-aware Fairness、Queue Deadline 与 Starvation Detection 必须可验证。 | 限制 Noisy Tenant 和未授权优先级提升。 | 需要新的公平性模型和容量评审。 |
| SCHED-08 | Fencing、Operation Fingerprint、CAS/Lock、Deadlock Retry、Expiry、Release 与 Orphan Reconciliation 关闭失败。 | 多副本和 Restart 后不产生泄漏 Reservation。 | SaaS 多副本部署保持阻塞。 |
| SCHED-09 | Error/Retry-after/Event/Metric 有界且不泄露 Tenant、Node、Topology、Entitlement 或 Capacity。 | 支持安全运营与客户重试。 | 必须修订 Public/Telemetry Contract。 |
| SCHED-10 | Node Trust/Enrollment 已拆分到 REQ-2026-0017；Warm Pool、Autoscaling、Preemption、GPU 和跨 Region 调度继续拆分。 | 保持本 Requirement 为可审查的 Admission-to-Placement Workflow。 | 扩展范围需要新 REQ/ADR。 |

## Pre-review Blocking Findings

1. IAM Typed Context、Commerce Entitlement Snapshot、Quota Policy Issuer/Signature/Revocation/Clock 与 Override Owner 未获批。
2. Node Enrollment/Identity、Inventory Publisher、mTLS/Signature、Attestation、Health/Drain/Quarantine、Region/Residency/Fault-domain 已形成 REQ-2026-0017 draft Gate，但尚未人工批准或物化 Node Agent、PKI/CA/HSM、Verifier、Database Projection 和真实 KVM Evidence。
3. PostgreSQL Schema/Transaction 候选已由 REQ-2026-0018 收敛为四对象 Gate 0，但表名、SQL Subject `TEXT -> BIGINT` Migration、完整 DDL/RLS/Role/Index、Repository、PITR/RPO/RTO 与 Query-plan 尚未人工批准、实现或真实验证。
4. Fairness、Priority、Starvation、Queue、No-capacity Retry、Anti-affinity 与 Placement Scoring 没有生产基准和 Owner。
5. Service Host/Config/Deployment Topology、Scheduler HA、Leaderless/Leader Model、Backpressure、Drain 和 Incident Runbook 未定义。
6. 没有真实 Multi-replica Race、Large Node/Tenant Matrix、Fault Injection、Firecracker Placement 或 Cross-tenant Negative Evidence。

## Required Evidence Before Ready

- 接受 SCHED-01..SCHED-10 的 Architecture/Security/Privacy/Capacity/Commerce/Database/Reliability/Operations/KVM Human Review。
- 固定 IAM/Commerce/Quota 输入 Contract；接受 REQ-2026-0017 NODE-TRUST-01..NODE-TRUST-10 与 REQ-2026-0018 QCAP-01..QCAP-09，并物化 Verified Inventory 和 PostgreSQL Authority 后再接入 Scheduler。
- PostgreSQL Migration/Repository/Concurrency/Isolation/Query-plan/Role/PITR Evidence；Cloud 禁止 Memory/SQLite Authority。
- Multi-replica Quota/Capacity Race、Deadlock/Restart/Expiry/Orphan、Stale/Drain/Quarantine、Fairness/Starvation/Deadline 与 Cross-tenant Denial Test。
- 真实 Linux KVM Firecracker Reservation-before-Allocate、Limit-not-above-Reservation、Provider/Node Failure、Cleanup/Recovery Evidence。
- Capacity SLO、Dashboard、Alert、Runbook、Load/Soak/Chaos、Rollout/Rollback 和商业运营 Owner。

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`. `Approved with follow-up` cannot defer Tenant Quota Atomicity、Node Trust、Capacity Reservation、Assurance/Residency Filter、Fairness、Fencing、PostgreSQL Concurrency、Cross-tenant Denial 或真实规模/故障证据。

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | SCHED-01..SCHED-10 |
| Security/privacy owner | pending | pending | pending | SCHED-02..SCHED-04, SCHED-08..SCHED-09 |
| Capacity/quota owner | pending | pending | pending | SCHED-02, SCHED-04..SCHED-08 |
| Commerce entitlement owner | pending | pending | pending | SCHED-02, SCHED-06..SCHED-07 |
| Database/reliability owner | pending | pending | pending | SCHED-02, SCHED-05, SCHED-08 |
| Observability/operations owner | pending | pending | pending | SCHED-03, SCHED-07..SCHED-10 |
| Firecracker/KVM owner | pending | pending | pending | SCHED-03..SCHED-06, SCHED-08 |

## Implementation Gate

REQ-2026-0016 remains `draft`, ADR remains `proposed`, and this Review remains `pending-human-review`. Until every required reviewer records `Approved` and blocking authorities are resolved, do not create public Ports/Crates, Scheduler/Admission Runtime, PostgreSQL Tables/Migrations, Node Agent/Enrollment, Pool, Provider Placement, API/SDK, Config, Service Unit, Deployment Profile or Commerce Adapter.

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
