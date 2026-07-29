---
id: REQ-2026-0018
title: Define Sandbox PostgreSQL quota and capacity reservation persistence
owner: SDKWork Runtime Platform
status: draft
priority: critical
source: platform
problem: REQ-2026-0016 requires atomic tenant quota and node capacity reservation, but the authoritative PostgreSQL tables, transaction boundaries, lock order, subject scope, expiry safety, recovery objectives, and release evidence are not yet reviewable.
goals:
  - Define Sandbox-owned PostgreSQL state and reservation aggregates without copying IAM, Commerce, or Node Trust authority.
  - Prevent quota and capacity oversubscription across replicas with explicit locks, constraints, CAS, fencing, idempotency, database time, and bounded whole-transaction retries.
  - Define fail-closed expiry, release, quarantine, reconciliation, retention, PITR, RPO/RTO, query-plan, role, RLS, and operational evidence.
  - Stop the existing opaque TEXT tenant scope from spreading into new authoritative tables and require pre-launch SQL subject alignment.
non_goals:
  - Implement or register a PostgreSQL table, migration, Repository Port/Adapter, Scheduler, admission engine, Service Host, API/SDK, deployment profile, or Firecracker Provider.
  - Author IAM identity, Commerce entitlement/plan/price/invoice/payment, Node Enrollment, Machine Identity, Platform Attestation, or Verified Inventory.
  - Add Redis, SQLite, process-memory authority, overcommit, preemption, autoscaling, Warm Pool, GPU, Docker, Kubernetes, gVisor, or Remote VM behavior.
users:
  - Sandbox admission, scheduling, lifecycle, database, reliability, and operations maintainers
  - IAM subject, Commerce entitlement, capacity, security, privacy, and Firecracker reviewers
affected_surfaces:
  - cross-component-contract
  - database
  - multi-tenant
  - scheduling
  - capacity
  - security
  - privacy
  - reliability
  - performance
  - observability
  - operations
---

# REQ-2026-0018: Sandbox PostgreSQL Quota 与 Capacity Reservation Persistence

## Readiness Blockers

- 人工接受四个候选持久化对象及物理表名：`SandboxTenantQuotaState` / `sandbox_tenant_quota_state`、`SandboxAdmissionReservation` / `sandbox_admission_reservation`、`SandboxNodeCapacityState` / `sandbox_node_capacity_state`、`SandboxCapacityReservation` / `sandbox_capacity_reservation`。
- 现有 `TenantId` 可接受 Opaque String，四张 Lifecycle 表使用 `tenant_id TEXT`；当前 `SUBJECT_ID_SPEC.md` 要求 SQL Subject `tenant_id` 为正数 Snowflake `BIGINT`。在新增 Quota/Capacity Table 前，必须通过独立 Migration Plan 与人工 IAM/Database/Cross-repository Review 统一 Domain Projection、Kernel/Agents Mapping、现有 Schema、Fixtures 和 Repository Bind，不得继续扩散 TEXT Tenant Authority。
- 人工确定 Commerce 或 Tenant Policy Authority 的 Snapshot Issuer、Signature、Revision、Fingerprint、Revocation、Clock、Refresh、Override 与审计契约；Sandbox 只能记录已验证 Reference 与实际 Reservation，不成为 Entitlement 或价格权威。
- 人工接受 REQ-2026-0017 的 `SandboxVerifiedNodeInventoryRecord`、Node Lifecycle/Trust/Capacity Revision 与失效行为；`SandboxNodeCapacityState` 只拥有 Reserved Counter/CAS，不得签发 Node Trust 或扩张 Verified Capacity。
- 人工接受 PostgreSQL Transaction Boundary、全局 Lock Order、Isolation、Unique/Check/RLS、Version CAS、Fencing、SQLSTATE Mapping、TTL、Quarantine、Reconciler、Retention、PITR、RPO/RTO、Role、Pool、Query Plan 和 Capacity Forecast。
- 在实现前同步 `database/database.manifest.json` Contract Version、`database/contract/schema.yaml`、Table/Prefix Registry、Migration Plan、Migration、Repository Component Contract、Drift Policy、Test Fixture 与 Runbook；本需求当前不授权这些修改。

## Candidate Acceptance Criteria

- PostgreSQL `authoritative-server` 是 Cloud Quota/Capacity 的唯一权威。Process Memory 只可用于测试，SQLite/Redis/Metric/Log/Cache 不得成为 Server Quota、Capacity、Reservation 或 Recovery Authority，也不得提供生产降级路径。
- `SandboxTenantQuotaState` 只保存 Tenant-scoped Effective Quota Occupancy：Policy Revision/Fingerprint、Reference-only Entitlement Snapshot、有限的 Concurrent Unit/vCPU/Memory Limit 与 Reserved Counter、Database-clock Validity 和 Version。Identity、Entitlement、Plan、Price、Invoice、Payment 仍由 IAM/Commerce 权威拥有。
- `SandboxAdmissionReservation` 绑定 Tenant、Admission Request/Grant、Session、Quota State/Policy Revision/Fingerprint、Resource Vector、Request Fingerprint、Fencing Token、Expiry、Trace 与 Version；同一 Request+Fingerprint Replay 原结果，不同 Fingerprint 冲突，同一 Session 不能有两个 Active Admission Reservation。
- `SandboxNodeCapacityState` 绑定 REQ-2026-0017 Verified Inventory Record、Opaque Node Reference、Provider、Inventory/Capacity Revision/Fingerprint、有限的 Runtime Unit/vCPU/Memory Total 与 Reserved Counter、Expiry 和 Version。它不是 Enrollment、Machine Identity、Attestation、Health 或 Inventory Authority；Stale/Revoked/Unverified/Draining/Quarantined Node 不接受新 Reservation。
- `SandboxCapacityReservation` 绑定 Admission Reservation/Grant、Placement Request、Session、Runtime Binding、Opaque Node、Provider、Inventory/Capacity Revision、Resource Vector、Fencing、Fingerprint、State、Expiry、Trace 与 Version；同一 Placement Request 或 Runtime Binding 不得形成两个 Active Reservation。
- 第一版 `SandboxResourceVector` 使用显式 Runtime Unit、Guest vCPU、Guest Memory 与 VMM Overhead Memory Column，数量必须有限且非负；禁止 Core Quota/Capacity/Reservation 数量只存在 Untyped JSON。Workspace Storage 继续由 REQ-2026-0013 管理，PID/IO Limit Enforcement 继续由 REQ-2026-0015 管理。
- Admission Transaction 在任何远程调用前锁定并 CAS `SandboxTenantQuotaState`，原子增加 Counter 与插入 `SandboxAdmissionReservation`。Capacity Transaction 验证当前 Session Lease/Fencing、Runtime Binding、Admission Reservation 与 Verified Inventory 后，按全局顺序锁定 Quota/Admission/Node/Capacity Row，原子增加 Node Counter、绑定 Admission 与插入 `SandboxCapacityReservation`；Commit 后才允许 Provider Allocate。
- 全局 Lock Order 固定为 `SandboxSessionLease -> SandboxSession -> SandboxRuntimeBinding -> SandboxTenantQuotaState -> SandboxAdmissionReservation -> SandboxNodeCapacityState -> SandboxCapacityReservation`；多 Row Key 递增排序。事务持锁期间禁止 HTTP/RPC/KMS/Provider 调用、用户交互、长计算或无界遍历。
- `READ COMMITTED` 只能与显式 Row Lock、Unique/Check Constraint 和 Conditional Update 组合。SQLSTATE `40001`/`40P01` 只重试完整幂等事务，最多 4 次并使用有界 Jitter Backoff；禁止在 Aborted Transaction 内重试单条 Statement。
- 每次 Counter/State Mutation 使用 `WHERE ... version = expected` 原子 CAS，并在 Mutation 前验证最新 Fencing Token、Policy/Inventory Revision、Fingerprint、Database Clock 和 Resource Bounds。Application Clock 不得决定 Expiry；Constraint/SQLSTATE Mapping 不匹配本地化数据库错误文本。
- Admission `reserved` 可进入 `bound/released/expired/quarantined`；Capacity `prepared` 可进入 `confirmed/released/expired/quarantined`。`prepared` 且 Provider Allocate 尚未获准时可在 TTL 后释放；`confirmed` 或 `bound` 到期但缺少 Terminal Lifecycle 与 Provider Cleanup Proof 时必须 Quarantine 并继续占用 Counter，禁止猜测释放造成 Oversubscription。
- Release 在一个 PostgreSQL Transaction 内按同一 Lock Order 把 Quota/Node Counter 精确递减一次并 CAS Reservation State；同一 Release Replay 成功，不同 Fingerprint/Fencing 冲突。Provider、Node 或 Recovery 状态不确定时保留占用并 Quarantine，不得把可用容量调大。
- Reconciler 使用 Primary PostgreSQL、Tenant-leading Keyset 或经过声明的 `FOR UPDATE SKIP LOCKED` Claim，Batch 不超过 100，具备 At-least-once Idempotency、Lease、Poison/Retry、Fairness 与 Drift Detection；禁止 `find_all`、Full Collect、Offset Scan 或跨 Tenant 无授权修复。
- Tenant Table 使用 `tenant_id BIGINT`、Tenant-leading Index 和 RLS Defense-in-depth；Runtime Role 不拥有表、不具备 `BYPASSRLS`。Cross-tenant Node Capacity 只由 Dedicated Scheduler Service Role 访问并审计；Owner/Migrator/Runtime/Read-only/Backup Role、Fixed Safe `search_path`、TLS 与 Pool Budget 必须分离。
- Event/Audit 使用 REQ-2026-0010 已登记的 `sandbox.scheduler.capacity.reserved` / `released` 与 Transactional Outbox；Policy Override、Quarantine、Manual Release、Cross-tenant Operation 产生 Audit Fact。Metric/Log 不携带 Tenant/Session/Node/Reservation/Capacity/Entitlement/SQL 高基数字段，也不成为 Quota、Capacity 或 Billing Truth。
- Released Reservation 热数据保留期候选为 30 天；Quarantined Record 至 Incident 关闭前不得删除。生产候选目标为加密 Backup、至少 7 天 PITR、RPO 不高于 5 分钟、RTO 不高于 30 分钟、至少每 90 天 Restore Exercise；目标值必须由 Database/Reliability/Privacy/Operations 人工批准，Backup Job 成功不能替代 Restore/PITR Evidence。
- P0/P1 Query 在代表性数据量上提供 PostgreSQL 16/17 `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`、Lock Wait、Deadlock、Timeout、Retry、Autovacuum/Analyze、Bloat、XID、WAL 与 Connection Budget 证据；未测量前禁止 Partition、Fillfactor 或 Overcommit 优化。
- 测试覆盖 Subject Mapping、Tenant/RLS Denial、Quota/Capacity Race、Idempotency Conflict、Version CAS、Fencing、Policy/Inventory Revision Race、TTL/Quarantine、Release Replay、Counter Drift、Deadlock/Serialization Retry、Restart/Failover、Query Plan、Role/Search Path、Migration/Drift、Backup/Restore/PITR 和 Cross-tenant Negative Case。

## Non-functional Requirements

| Domain | Requirement |
| --- | --- |
| Correctness | Counter 与 Reservation 在同一事务中变化；Constraint、CAS、Fencing、Revision 和 Database Clock 共同关闭 Oversubscription、Double Release、Replay Conflict 与 Stale Controller。 |
| Security/Privacy | SQL Subject 从 Trusted IAM Context 解析为 `BIGINT`；Tenant Table 具备应用 Predicate 与 RLS；Reference-only Policy/Node Metadata 最小化持久化，公共错误/事件/指标不泄露原始身份、拓扑或容量。 |
| Performance | Online Point Query/Mutation 使用有界 B-tree Query，Reconciler 使用 Keyset/Claim Batch；无 Full Scan、Full Collect 或跨远程调用持锁。 |
| Reliability | PostgreSQL Primary、Bounded Whole-transaction Retry、Quarantine-on-uncertainty、Counter Drift Reconciliation、Encrypted Backup、PITR 与定期 Restore Exercise 共同提供恢复证据。 |
| Coupling | IAM/Commerce/Node Trust/Lifecycle/Scheduler/Provider/Observability 通过 Snapshot Reference、Revision、Grant、Reservation 与 Outbox Fact 组合，不共享表写权限或复制商业权威。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `DATABASE_SPEC.md`, `DATABASE_FRAMEWORK_SPEC.md`, `SUBJECT_ID_SPEC.md`, `MIGRATION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `OBSERVABILITY_SPEC.md`, `EVENT_SPEC.md`, `PERFORMANCE_SPEC.md`, `TEST_SPEC.md`, `QUALITY_GATE_SPEC.md`.

Contracts: `specs/sandbox-quota-and-capacity-persistence.contract.json`, `specs/sandbox-multi-tenant-scheduling.contract.json`, `specs/sandbox-node-trust-and-inventory.contract.json`, `specs/sandbox-firecracker-resource-isolation.contract.json`, `apis/async/sandbox-outbox.contract.json`.

Components: existing `crates/sdkwork-intelligence-sandbox-service`, `crates/sdkwork-intelligence-sandbox-repository-sqlx`, `database/`; future reviewed Admission/Scheduler persistence components only after Ready Gate.

Decision: [ADR-20260729: Sandbox PostgreSQL Quota And Capacity Reservation Persistence](../../architecture/decisions/ADR-20260729-sandbox-postgresql-quota-and-capacity-reservation-persistence.md).

## Verification Plan

- `tests/contract/sandbox-quota-and-capacity-persistence.contract.test.mjs` 验证 Authority、四表职责、Subject Migration Blocker、Resource Vector、Transaction/Lock/CAS/Fencing、State/TTL/Quarantine、Query/Index、RLS/Role、Error、Event/Metric、PITR/RPO/RTO 与 No-implementation Gate。
- 实现阶段必须增加真实 PostgreSQL 16/17 Empty/Upgrade Migration、Repository、RLS、Role、Multi-replica Race、Deadlock/Serialization、Crash/Failover、Query-plan、Backup/Restore/PITR、Load/Soak 与 Counter Drift Test。
- Firecracker 阶段必须证明 `Confirmed SandboxCapacityReservation -> Provider Allocate -> SandboxResourceLimitGrant <= Reservation`，并覆盖 Controller Crash、Provider Timeout、Node Loss、Cleanup Failure、Cross-tenant Denial 与 Quarantine。

## Release Boundary

本 Requirement 只形成 Gate 0 候选数据和事务契约。它不修改当前四张已注册 Lifecycle Table，不创建新 Table/Migration/Rust Port/Repository/Scheduler/API/SDK/Config/Deployment，也不把 `REQ-2026-0016` 或 `REQ-2026-0017` 升级为 Ready。SQL Subject Migration、四表命名、数据所有权、RLS/Role、Transaction/Lock、Retention/PITR/RPO/RTO、IAM/Commerce/Node Trust Integration 与真实多副本/Firecracker Evidence 全部批准并完成前保持 `draft`，静态 Contract Test 不构成 PostgreSQL、SaaS、生产或商业发布能力。
