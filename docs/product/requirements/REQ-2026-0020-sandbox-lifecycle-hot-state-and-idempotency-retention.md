# REQ-2026-0020: Sandbox Lifecycle Hot State And Idempotency Retention

id: REQ-2026-0020

title: 交付有界 Sandbox 生命周期热状态与持久幂等保留

owner: SDKWork Runtime Platform

status: draft

priority: P1

source: reliability

## Problem

当前 PostgreSQL Repository 会在读取一个 `SandboxSession` 时按 `sandbox_operation_sequence` 加载并重放该 Session 的全部 Lifecycle Operation；按 Operation 查询也会继续完整 hydrate Aggregate，Reconciler 在分页取得 Session Identity 后逐项执行同样的完整 hydrate。该实现保持了现有状态机和幂等语义，但其查询行数、内存和恢复成本会随 Session Operation 数量持续增长，并形成 Reconciliation 候选页后的预 Lease N+1 读取。

仓库尚未定义最大 Session Operation 数、最大活动生命周期、终态幂等保留期、结果载荷上限或归档/删除语义。直接截断历史、按猜测 TTL 删除 Operation 或把 Audit/Event 当成幂等账本会破坏重放、冲突检测和恢复安全。本 Requirement 建立独立评审边界；当前不授权数据库或 Rust 实现变更。

## Goals

- 将 `SandboxSession` 当前状态、当前 Runtime Binding、当前 In-progress Operation、最后 Failure 和 CAS Version 收敛为与历史 Operation 数量无关的有界热状态投影。
- 将 Tenant-scoped Operation 幂等事实建模为可点查的持久账本，保存版本化 Request Fingerprint、Operation Kind、Owner Session、Outcome 和足以执行确定性重放的结果描述。
- 让普通 Session hydrate 至多读取当前 In-progress Operation；Reconciler 的候选页不完整 hydrate 每个 Aggregate，取得 Lease 后的权威重读也保持固定上界。
- 在任何实现前由 Product、Reliability、Database、Security/Privacy、Operations、API/Kernel Owner 批准最大 Operation 数、最大活动 Session 生命周期、终态保留窗口和窗口结束后的调用语义。
- 使用 Tenant-scoped Keyset、固定 Batch、数据库时钟、Lease/Fencing 和可恢复 Watermark 执行归档或清理，禁止无界扫描和 Process-local Authority。

## Non-goals

- 本 Requirement 不批准修改现有 PostgreSQL Schema、Migration、Repository Port、Domain Model、公开 Error、API、SDK、Kernel Adapter、Config 或 Deployment Profile。
- 本 Requirement 不选择具体保留时长、Operation 上限或 Session 生命周期；这些值不得由实现者猜测。
- 幂等账本不替代 `SandboxAuditRecord`、Domain Event、Operational Log、Trace、Usage Fact 或 Billing Truth。
- 本 Requirement 不引入 Event Sourcing，也不要求通过完整历史重建当前 `SandboxSession`。
- 本 Requirement 不允许通过静默截断、仅内存缓存、按 Offset 扫描、TTL 猜测或跨 Tenant 批量读取获得性能改善。

## Acceptance Criteria

1. 热状态投影对每个 Session 最多包含一个当前 In-progress Lifecycle Operation；稳定状态不保留伪造的 In-progress Operation，瞬态状态必须具有 Kind/Identity/Fencing 一致的当前 Operation。
2. 普通 Session hydrate 的查询数、Operation 行数和内存与历史 Operation 总数无关；不得 `fetch_all` 完整历史或通过全历史重放证明当前状态。
3. Reconciliation 候选使用 Tenant-leading Keyset 和 `1..=200` Page；候选查询不逐 Session hydrate Aggregate。取得 Lease 后显式执行的权威重读至多读取当前 Operation，且 Side Effect 前仍重新校验状态与 Fencing。
4. 幂等账本以 `(tenant_id, sandbox_operation_id)` 点查，绑定 `sandbox_session_id`、Operation Kind、Fingerprint Version、Canonical Fingerprint、Outcome、Result Descriptor、Policy Revision、创建/终态时间和 CAS Version；查询不得扫描 Session 历史。
5. 同 Operation + 同 Fingerprint 返回已持久化的业务等价结果；同 Operation + 不同 Fingerprint 或不同 Owner/Kind 返回稳定冲突，且在冲突判定前不得调用 Provider。
6. Active、瞬态、仍可恢复或仍可能接受同 Operation 重试的 Session，其幂等记录不得过期。终态记录只能在已批准的保留窗口、引用检查和可恢复清理流程后处理。
7. 窗口结束后的 Late Retry 行为必须由 API/Kernel Owner 明确为安全的 Typed Outcome；禁止因记录缺失而静默把旧 Operation 当成新请求执行。
8. 每个 Session 在创建时固定适用的 Lifecycle Limit/Retention Policy Revision。Operation 上限和 Session 生命周期在任何 Provider/Host Side Effect 前执行；超过边界返回候选 Typed Outcome，不得部分推进状态。
9. 归档/清理按 Tenant/Partition 和 Keyset 有界运行，Batch 最大 100，具备 Job Lease/Fencing、数据库时钟、Checkpoint/Watermark、速率限制、失败可见性和幂等恢复；不确定时保留记录而不是删除。
10. Audit/Event Authority 与幂等账本物理和语义分离。归档账本不得从可变日志、Telemetry 或异步 Event 反向重建。
11. 数据迁移采用 Expand -> Backfill -> Verify -> Dual-read/write or shadow-compare -> Cutover -> Retire；必须有独立 `MIG-*`、前滚/恢复策略、实时 PostgreSQL 并发/查询计划/Role/PITR 证据，且不能原地重写已应用的 `0001` Migration。
12. 性能证据覆盖长生命周期 Session、最大批准 Operation 数、并发点查、200 条 Reconciliation Page、清理背压和控制面重启；P0/P1 Query Plan 不得出现全历史扫描或隐藏 N+1 hydrate。

## Non-functional Requirements

| Area | Requirement |
| --- | --- |
| Security | Fingerprint 和结果描述只保存最小安全字段；不得包含 Secret、Raw Host Path、Provider-private Allocation 明文或 Workspace 内容。缺失/损坏记录关闭失败。 |
| Privacy | 保留期与数据最小化由明确 Owner 批准；Tenant-scoped 删除/归档不能跨 Tenant 暴露存在性或基数。 |
| Performance | P0/P1 hydrate、幂等点查和 post-Lease reread 具有固定行数上界；清理是有界 P3 Job，不阻塞交互生命周期。 |
| Reliability | Active/Recoverable 幂等事实不失效；Migration、Dual-write、Cleanup 和 Restart 可恢复，记录不确定时宁可保留并告警。 |

## Affected Surfaces

- backend
- database
- composition
- observability
- internal API/Kernel semantics (future, human review required)

## Dependencies

- REQ-2026-0002 provider-neutral lifecycle core
- REQ-2026-0005 durable lifecycle persistence and reconciliation
- REQ-2026-0007 command execution contract, for shared idempotency terminology only
- REQ-2026-0010 observability, event, audit and outbox ownership separation
- `../../../../sdkwork-specs/PERFORMANCE_SPEC.md`
- `../../../../sdkwork-specs/DATABASE_SPEC.md`
- `../../../../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md`
- `../../../../sdkwork-specs/MIGRATION_SPEC.md`

## Decision

[ADR-20260730: Sandbox Lifecycle Hot State And Idempotency Ledger](../../architecture/decisions/ADR-20260730-sandbox-lifecycle-hot-state-and-idempotency-ledger.md).

## Verification

- Static contract tests for bounded hydrate, point lookup, fingerprint conflict, retention gates, migration and forbidden audit coupling.
- Real PostgreSQL 16/17 migration, dual-write, backfill, concurrency, RLS/role, query-plan, restart, cleanup and PITR evidence after approval.
- Rust Domain/Memory/SQLx parity tests for limits, current Operation invariants, replay, conflict and fail-closed corruption behavior after approval.
- Kernel/Internal API contract tests for Late Retry and Typed Outcome behavior before any public transport is exposed.

## Implementation Gate

This Requirement remains `draft`. Exact limit/retention values, post-retention retry semantics, physical schema/table naming, migration strategy, public errors and Kernel mapping require the linked human review. It creates no Rust type, table, migration, cleanup worker, API, SDK, config key or deployment profile and does not change the accepted REQ-2026-0005 runtime behavior.
