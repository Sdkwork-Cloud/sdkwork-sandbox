---
id: REQ-2026-0016
title: Define Sandbox multi-tenant admission, scheduling, placement, and capacity reservation
owner: SDKWork Runtime Platform
status: draft
priority: critical
source: platform
problem: SaaS Sandbox cannot enforce concurrent tenant quota or place Firecracker sessions safely when admission, node inventory, placement policy, and capacity reservation have no reviewed authority or atomic contract.
goals:
  - Define separate provider-neutral authorities for tenant admission, node inventory, placement policy, and capacity reservation.
  - Require atomic tenant quota and node capacity reservation before Provider allocation or resource-limit application.
  - Enforce capability, OS, architecture, assurance, locality, residency, policy, health, and capacity as hard placement constraints without weaker fallback.
  - Define fenced idempotency, tenant-aware fairness, bounded retries, typed denials, orphan reconciliation, safe telemetry, and durable facts.
non_goals:
  - Implement a Rust port, Scheduler, admission engine, database schema, Node Agent, Node Enrollment, Warm Pool, Provider, API/SDK, deployment profile, or runtime wiring.
  - Define IAM authentication, Commerce prices, plans, invoices, payments, credits, tax, or entitlement ledger behavior.
  - Implement Snapshot/Restore, Cluster autoscaling, overcommit, preemption, migration, GPU placement, Kubernetes, gVisor, Remote VM, or Docker Provider.
users:
  - SaaS platform and capacity operators
  - Sandbox lifecycle, Firecracker, and resource-policy maintainers
  - Security, privacy, database, reliability, and Commerce entitlement reviewers
affected_surfaces:
  - cross-component-contract
  - multi-tenant
  - scheduling
  - capacity
  - security
  - performance
  - observability
  - events
  - operations
---

# REQ-2026-0016: Sandbox 多租户 Admission、Scheduler、Placement 与 Capacity Reservation

## Readiness Blockers

- 人工接受 `SandboxAdmissionPolicyPort`、`SandboxNodeInventoryPort`、`SandboxSchedulerPort`、`SandboxCapacityReservationPort`、`SandboxAdmissionGrant`、`SandboxNodeCandidateSnapshot`、`SandboxCapacityReservation` 与 `SandboxPlacementDecision` 候选命名和所有权。
- 确定 IAM Typed Verified Context、Tenant/Organization Policy、Commerce Entitlement Snapshot、Quota Revision/Signature/Revocation/Clock、Priority Class、Override 与审计权威；Sandbox 不拥有身份、价格、账单或支付。
- 人工接受并物化 REQ-2026-0017 定义的 Node Enrollment/Identity、Inventory Publisher、TLS 1.3 Mutual Authentication、Attestation Verification、Health、Drain、Quarantine、Locality、Region/Residency、Fault Domain 与 Capacity Revision Authority。
- 人工接受 REQ-2026-0018 已形成的 `SandboxTenantQuotaState`、`SandboxAdmissionReservation`、`SandboxNodeCapacityState`、`SandboxCapacityReservation`、SQL Subject `BIGINT` Migration Gate、原子事务、稳定锁顺序、Version/CAS、Fencing、TTL/Quarantine、RLS/Role、Retention、PITR/RPO/RTO 与恢复 Owner；其 Gate 0 契约不等于已实现数据库。
- 确定 Fairness、Priority、Starvation、Queue Deadline、Placement Scoring、Anti-affinity、Fault-domain Spread、No Capacity Retry、Admission Override 和 Operator Drain Policy。
- 提供真实多副本 PostgreSQL、并发 Tenant/Session、Firecracker Node Inventory 与故障注入证据，覆盖 Quota Race、Capacity Oversubscription、Stale Inventory、Drain/Quarantine、Scheduler Restart、Provider Failure、Orphan Reservation 和 Cross-tenant Denial。

## Candidate Acceptance Criteria

- `SandboxAdmissionPolicyPort` 只消费 IAM 验证上下文和批准的 Entitlement/Quota Policy，原子预留 Tenant 并发配额后签发短期 `SandboxAdmissionGrant`；检查但不预留不能构成 Admission。
- `SandboxNodeInventoryPort` 只从 REQ-2026-0017 的 `SandboxVerifiedNodeInventoryRecord` 投影版本化、短期、Opaque `SandboxNodeCandidateSnapshot`。Scheduler 不得直接消费 Node Agent Publication；Stale、Draining、Quarantined、Unhealthy、Revoked、Expired 或 Unknown Node 不可参与 Placement，Host Address/Path/Raw Topology 不进入公共契约。
- `SandboxSchedulerPort` 先按 Capability、OS、Architecture、Minimum Assurance、Locality/Residency、Policy、Anti-affinity、Health 和 Capacity 硬过滤，再在有界 Candidate Set 内执行确定性、Tenant-aware Placement Policy。禁止先打分后过滤、弱 Provider 回退和 Caller 指定 Node/Provider。
- `SandboxCapacityReservationPort` 在 PostgreSQL 权威边界原子预留 finite Node Resource Vector；Reservation 绑定 Admission Grant、Session、Runtime Binding、Provider、Opaque Node、Capacity Revision、Fencing、Request Fingerprint、Version 和 TTL。
- `SandboxPlacementDecision` 只有在 Admission Grant 与 Capacity Reservation 均有效且 Reservation 已 Confirm 后生成。Provider Allocate、Firecracker Resource Grant 和任何 Host Side Effect 都必须发生在确认 Reservation 之后。
- REQ-2026-0015 的 `SandboxResourceLimitGrant` 必须绑定 `sandbox_admission_grant_id`、`sandbox_capacity_reservation_id` 与 Reservation Fingerprint，且不能超过预留 Resource Vector。
- Cloud 禁止 Process-local Memory 作为 Quota/Capacity Authority；并发预留必须使用原子扣减、CAS 或更强事务语义，防止负 Capacity、Double Placement、Lost Update 和跨 Tenant 共享 Reservation。第一版禁止 Overcommit。
- Admission、Reservation 与 Placement 的 Operation + Fingerprint 重放原结果，不同 Fingerprint 冲突；Stale Fencing 在副作用前拒绝。Serialization/Deadlock 只重试完整幂等事务并有界退避。
- Allocate/Start 失败、Stop/Destroy、Grant/Reservation Expiry 与 Recovery 必须释放、替换或 Quarantine Reservation；Prepared Expiry 和 Confirmed Orphan 由有界 Reconciler 处理，不允许无界全表或全 Node Scan。
- Admission Denial 和 Scheduling Failure 使用关闭的安全 Taxonomy、显式 Retryability 和有界 Retry-after；错误不能泄露其他 Tenant、Raw Capacity、Node Identity、Topology 或 Entitlement Payload。
- Priority 只能来自 Admission Grant；Scheduler 必须提供 Tenant-aware Fairness、Queue Deadline 和 Starvation Detection。Caller、Provider、Node Agent 或 Host Broker 不能提升 Priority、配额或 Assurance。
- `sandbox.quota.admission.denied`、Placement Selected/Failed、Capacity Reserved/Released 必须进入现有 Event Catalog；Admission、Placement、Queue Wait、Reservation 和 Saturation Metric 只能使用低基数维度，Metric 不是 Quota/Capacity Authority。
- Standalone 可在后续 Ready Requirement 下用同一 Contract 的 Single-node Adapter，但不能声明多租户隔离；Cloud 必须使用持久共享 Authority。Pool 已拆分到 REQ-2026-0019/ADR-20260730，仍不是本 Requirement 的实现范围。

## Candidate Non-functional Requirements

| 领域 | 要求 |
| --- | --- |
| Security | Typed verified context、Signed Grant、Fencing、Tenant Isolation、Node Trust、Assurance、Override、Drain/Quarantine 和 Cross-tenant Denial 必须关闭失败并有负向证据。 |
| Privacy | Admission/Placement 为 TenantSensitive，Node Inventory 为 Internal；公共 API/Event/Metric 不暴露 Raw Tenant、Node、Topology、Entitlement 或 Reservation Identity。 |
| Performance | Admission、Candidate Query、Placement、Reservation 与 Reconciliation 分别记录 p50/p95/p99；Candidate、Attempt、Queue、Deadline、Retry 和 Batch 全部有界，内存与 DB 工作量不随全部 Node/Tenant 无界增长。 |
| Reliability | 多副本并发、Restart、Deadlock、Stale Inventory、Partial Failure、Expired Grant、Orphan Reservation 和 Node Loss 可恢复且不会超卖或双重放置。 |
| Fairness | Priority 由策略签发；Tenant-aware Queue、Starvation Detection、Deadline 和容量拒绝行为可观测、可重放、可审计。 |
| Coupling | Admission、Inventory、Scheduler、Capacity、Lifecycle、Provider、Resource Policy、Observability 和 Commerce 通过 Grant/Snapshot/Reservation/Decision 组合，不跨层泄露私有模型。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `DATABASE_SPEC.md`, `PERFORMANCE_SPEC.md`, `OBSERVABILITY_SPEC.md`, `EVENT_SPEC.md`, `DEPLOYMENT_SPEC.md`, `TEST_SPEC.md`, `QUALITY_GATE_SPEC.md`.

Components: future reviewed Admission Policy capability, REQ-2026-0017 Verified Node Inventory projection adapter, Scheduler capability, REQ-2026-0018 Quota/Capacity persistence boundary, `crates/sdkwork-intelligence-sandbox-service`, `crates/sdkwork-sandbox-service-host`, future `sdkwork-sandbox-provider-firecracker`, REQ-2026-0015 Resource Policy/Isolation, and approved IAM/Commerce inputs.

Decision: [ADR-20260729: Sandbox Multi-tenant Admission, Scheduling And Capacity Reservation](../../architecture/decisions/ADR-20260729-sandbox-multi-tenant-admission-scheduling-and-capacity-reservation.md).

## Verification Plan

- `tests/contract/sandbox-multi-tenant-scheduling.contract.test.mjs` 验证 Draft Gate、Sandbox 命名、Authority 分离、Atomic Admission、Hard Placement Filter、Node Eligibility、PostgreSQL Reservation、Resource Grant Binding、Fencing/Idempotency/Recovery、错误/Bounds、Event/Metric 和隐私边界。
- `tests/contract/sandbox-quota-and-capacity-persistence.contract.test.mjs` 验证 REQ-2026-0018 的四对象 Authority、SQL Subject Migration Blocker、Resource Vector、Transaction/Lock/CAS/Fencing、TTL/Quarantine、RLS/Role、PITR/RPO/RTO 和 No-implementation Gate。
- Runtime 阶段增加真实 PostgreSQL Migration/Repository/Transaction/Concurrency/Query-plan/PITR Test，以及 Quota Race、Capacity Race、Deadlock、Multi-replica、Restart、Stale Inventory、Drain、Quarantine、No Capacity、Fairness、Starvation、Timeout 和 Orphan Reconciliation Test。
- Firecracker 阶段增加真实 Linux KVM Node Inventory、Reservation-before-Allocate、Limit-not-above-Reservation、Provider Failure、Node Loss、Cross-tenant Placement/Residue 与 Capacity Recovery Evidence。

## Release Boundary

本需求只定义 Gate 0 候选边界，不创建 Rust Port/Crate、Scheduler、Admission/Quota Engine、PostgreSQL Table/Migration、Node Agent、Node Enrollment、Warm Pool、API/SDK、Config、Service Unit、Deployment Profile 或 Commerce Runtime。人工 Architecture/Security/Privacy/Capacity/Commerce/Database/Reliability/Operations/KVM 评审与真实并发/规模/故障证据完成前保持 `draft`，不得把静态 Contract Test 解释为 Quota Enforcement、Scheduler Correctness、Capacity Safety、SaaS Readiness 或商业发布能力。
