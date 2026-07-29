---
id: REQ-2026-0015
title: Define the Sandbox Firecracker resource isolation and usage fact boundary
owner: SDKWork Runtime Platform
status: draft
priority: critical
source: security
problem: Firecracker cannot claim tenant resource isolation or enforce commercial quotas when guest shape, host cgroup limits, process membership, node reservation, limit outcomes, and usage measurements have no single reviewed contract.
goals:
  - Define a provider-neutral SandboxResourcePolicyPort authority separated from the Firecracker L4 SandboxResourceIsolationPort mechanism.
  - Require exact Firecracker vCPU/memory shape plus cgroup v2 CPU, memory, PID, and IO enforcement before readiness.
  - Produce immutable SandboxResourceUsageFact records without making metrics or Sandbox the price, invoice, or payment authority.
  - Define fenced application, effective-state verification, typed limit outcomes, bounded cleanup, residue quarantine, safe telemetry, and durable audit.
non_goals:
  - Implement a Rust port, quota engine, admission scheduler, cgroup, Firecracker machine configuration, usage collector, billing adapter, runtime path, config, service unit, or deployment profile.
  - Define prices, currencies, plans, entitlements, invoices, payments, credits, refunds, tax, or Commerce ledger behavior.
  - Implement disk-capacity storage, Workspace quota, network egress quota, log retention, wall-time scheduling, GPU, autoscaling, overcommit, live vCPU/memory resize, or Docker Provider.
users:
  - Sandbox and Firecracker Provider maintainers
  - Capacity, quota, and KVM node operators
  - Security, observability, audit, and Commerce metering reviewers
affected_surfaces:
  - cross-component-contract
  - security
  - performance
  - composition
  - observability
  - events
  - operations
  - commerce-integration
---

# REQ-2026-0015: Sandbox Firecracker Resource Isolation 与 Usage Fact 边界

## Readiness Blockers

- 人工接受 `SandboxResourcePolicyPort`、`SandboxResourcePolicyRequest/Error`、`SandboxResourceLimitGrant`、`SandboxResourceIsolationPort`、`SandboxResourceIsolationRequest/Result/Error/Readiness` 与 `SandboxResourceUsageFact` 候选命名及 L3 Policy/L4 Mechanism 分离。
- REQ-2026-0016 已定义 draft Admission/Node Inventory/Scheduler/PostgreSQL Capacity Reservation Gate；仍需人工接受 Tenant/Platform Quota Policy、Plan/Entitlement 输入、Reservation Transaction、Overcommit 禁止、Policy Issuer/Signature/Revocation/Clock、Override 和 Operator Change Control Authority。
- 确定支持的 Firecracker Guest vCPU/Memory Shape、VMM Overhead Budget、cgroup v2 CPU/Memory/PID/IO 参数范围、Swap、OOM、Device Role 和 Limit Outcome 语义。
- 确定 Host Isolation Broker 的 cgroup delegation/capability、Scope Ownership、Process Membership、Persistent Fencing Journal、Crash Recovery、Upgrade/Rollback 和 Node Drain Owner。
- 确定 Usage Fact 的采样周期、计数器语义、Durable Handoff、去重、聚合、Retention、Late/Correction 和 Commerce Consumption Contract；Metric 不得成为 Billing Truth。
- 提供真实 Linux KVM/cgroup v2 Node，覆盖 CPU Throttle、Memory High/OOM、PID Exhaustion、IO Throttle、Stale Fencing、Partial Apply、VMM/Broker Restart、Final Usage 和 Cross-tenant Residue。

## Candidate Acceptance Criteria

- Provider-neutral `SandboxResourcePolicyPort` 是 Resource/Quota Policy Authority并签发短期 `SandboxResourceLimitGrant`；Firecracker L4 `SandboxResourceIsolationPort` 只执行机制。Provider、Broker、Guest 和 Caller 不能自行扩大 Limit，Sandbox Usage Fact 不包含 Price/Invoice/Payment。
- 所有 Sandbox-owned Type 使用 `Sandbox` 前缀，字段使用 `sandbox_` 前缀，未知字段关闭失败。固定 Operation 为 Prepare Scope、Apply Limits、Verify Limits、Sample Usage、Release Scope。
- Grant 绑定 Tenant Scope Hash、Session、Runtime Binding、Provider、Fencing Token、Policy Revision/Fingerprint、Guest vCPU/Memory、VMM Overhead、CPU Quota/Period/Weight、Memory High/Max/Swap、PID Max、IO Limit、Issued/Expiry、Nonce、Audience 与 Signature，并携带 `sandbox_admission_grant_id`、`sandbox_capacity_reservation_id`、`sandbox_capacity_reservation_fingerprint`；Limit 不得超过 REQ-2026-0016 已确认 Reservation Resource Vector 或 Tenant/Platform Ceiling。
- 所有 Limit 显式、有限、正值；禁止 CPU/Memory/PID/IO Unlimited、静默降级和超过 Tenant/Node Ceiling。第一版不支持运行中修改 Guest vCPU/Memory，Shape 变化创建新 Runtime Binding。
- Linux Host 必须使用单一 cgroup v2 Unified Hierarchy，启用并验证 `cpu`、`memory`、`pids`、`io` Controller；禁止 cgroup v1/hybrid fallback、任意 Path 和活动 Binding 共享 Scope。
- 每个 Runtime Binding 使用独立 Leaf Scope。Jailer、VMM 和全部 Descendant 在 Guest 执行不可信工作前进入 Scope；Readiness 回读完整 Membership，禁止 Foreign Process 和 Descendant Escape。
- Firecracker Machine Config 的 vCPU/Memory 精确匹配 Grant；Host `memory.max` 覆盖 Guest Memory + VMM Overhead。Machine Config 和 cgroup Effective Value 都必须读回，单独生成配置或只验证 Machine Config 不构成 Resource Isolation Evidence。
- CPU 使用 finite `cpu.max` Quota/Period 与 `cpu.weight`；Memory 使用 `memory.high`、`memory.max`、`memory.oom.group`，Swap 默认 0；PID 使用 finite `pids.max`；IO 按 RootFS/Workspace/Ephemeral Logical Device Role 设置 bytes/IOPS Bound，Host Device/major:minor 在 Port 下方解析并保持私有。
- Disk/Workspace Capacity 不冒充 cgroup IO Enforcement，继续由 REQ-2026-0013 Workspace/Storage Authority 拥有；Wall Time、Log Size、Network Egress、Port Count 与 GPU 使用各自 Capability/Policy Contract。
- 每个副作用前验证 Grant、最高 Fencing Token、Policy Revision 和 Node Reservation；同 Operation+Fingerprint 重放同一 Result，不同 Fingerprint 冲突。Partial Apply 回滚或 Quarantine，不得 Ready。
- Resource Readiness 同时证明 Grant、Fencing、Node Reservation、cgroup v2/Controller、Machine Config、CPU/Memory/PID/IO、Process Membership 与 Prior Residue Clear；任何 Degraded/Unknown 均不得设置 Resource Ready 或构成 `MicroVm` Evidence。
- CPU Throttle、Memory High、OOM、PID Exhaustion、IO Throttle 与 Node Capacity Lost 使用 typed Outcome；Hard Limit 不能通过改变 Tool Semantics 的静默 Throttle、无限 Retry 或 Host OOM 表达。
- Provider Boundary 输出 immutable `SandboxResourceUsageFact`，包含 Binding-scoped monotonic Sequence、Interval、CPU Usage/Throttle、Memory Peak/OOM、PID Peak、IO Bytes/Operations、Outcome 和 Trace。Counter 在同一 Binding 内不能重置，Release 前必须输出 Final Fact。
- Usage Fact 通过 Durable Handoff 交给 Sandbox 聚合和批准的 Commerce Consumer；Sandbox 不拥有 Price、Invoice、Payment。Metric 只用于低基数运营观测，不是 Billing Truth。
- Release 先停止全部 Process、采集 Final Usage、验证 Scope Empty、移除 Scope并执行 Residue Scan。Cleanup/Measurement Unknown 或 Failure 时 Binding/Node Quarantine，禁止跨 Tenant 重用并由有界 Reconciler 处理。

## Candidate Non-functional Requirements

| 领域 | 要求 |
| --- | --- |
| Security | Grant、Ceiling、Reservation、Fencing、Controller、Membership、OOM/PID/IO、Partial Apply、Cleanup 和 Residue 必须有负向证据并关闭失败。 |
| Privacy | Usage Fact 是 Tenant-sensitive Operational/Commerce Input；只含 Opaque/Hashed Identity 和数值，不含 Command、Path、Host PID、Device、Prompt、Workspace Content 或 Secret。 |
| Performance | Apply、Verify、Sample、Release 分别记录 p50/p95/p99；采样有上下界且自身 CPU/IO 开销必须在真实 KVM 基准中证明。 |
| Reliability | Restart/Stale Controller/Partial Apply 不产生无界或双重 Scope；Final Usage、Counter Continuity、Durable Handoff 和 Quarantine 可恢复。 |
| Coupling | Policy、Service、Broker、Firecracker、Observability、Usage Aggregation 与 Commerce 通过 Grant/Result/Fact 组合；Provider-private 和 Billing 模型不跨层泄露。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `PERFORMANCE_SPEC.md`, `OBSERVABILITY_SPEC.md`, `EVENT_SPEC.md`, `RUNTIME_DIRECTORY_SPEC.md`, `TEST_SPEC.md`.

Components: `crates/sdkwork-sandbox-provider-spi`, `crates/sdkwork-intelligence-sandbox-service`, future reviewed Resource Policy capability, future reviewed `sdkwork-sandbox-host-isolation-broker`, future reviewed `sdkwork-sandbox-provider-firecracker`, Sandbox event/outbox boundary, and approved SDKWork Commerce metering consumer.

Decisions: [ADR-20260729: Sandbox Firecracker Resource Isolation And Usage Facts](../../architecture/decisions/ADR-20260729-sandbox-firecracker-resource-isolation-and-usage-facts.md), [ADR-20260729: Sandbox Multi-tenant Admission, Scheduling And Capacity Reservation](../../architecture/decisions/ADR-20260729-sandbox-multi-tenant-admission-scheduling-and-capacity-reservation.md), [ADR-20260729: Firecracker Provider Isolation And Node Boundaries](../../architecture/decisions/ADR-20260729-firecracker-provider-isolation-and-node-boundaries.md), [ADR-20260729: Sandbox Host Isolation Broker Boundary](../../architecture/decisions/ADR-20260729-sandbox-host-isolation-broker-boundary.md), [ADR-20260729: Sandbox Observability, Event, Audit And Outbox Boundary](../../architecture/decisions/ADR-20260729-sandbox-observability-event-audit-outbox-boundary.md), and [ADR-20260729: Sandbox Workspace Block Device Attachment And Sanitization](../../architecture/decisions/ADR-20260729-sandbox-workspace-block-device-attachment-and-sanitization.md).

## Verification Plan

- `tests/contract/sandbox-firecracker-resource-isolation.contract.test.mjs` 验证 Draft Gate、Sandbox 命名、Policy/Mechanism/Commerce Ownership、finite Limit、cgroup v2、Machine Config、CPU/Memory/PID/IO、Fencing/Readback、Usage Fact、Cleanup/Quarantine、Telemetry/Audit 和 Bounds。
- Runtime 阶段增加 Grant Signature/Expiry/Replay/Revocation、Ceiling/Reservation Race、Controller Missing、CPU Throttle、Memory High/OOM/Swap、PID Fork Bomb、IO Saturation、Process Escape/Foreign Membership、Stale Fencing、Partial Apply、Restart、Final Usage、Counter Continuity、Durable Handoff 和 Residue Test。
- 真实 Linux KVM Matrix 必须证明 Machine Config/cgroup 双重限制、Guest/VMM Overhead、Host Stability、typed Limit Outcome、低开销采样、Final Fact 和 Cross-tenant Node Reuse Gate。

## Release Boundary

本需求只定义 Gate 0 候选边界，不创建 Rust Port/Crate、Quota/Admission Engine、cgroup、Machine Config Runtime、Usage Collector/Aggregator、Commerce Adapter、Config、Service Unit 或 Deployment Profile。人工 Policy/Capacity/Security/Commerce/Observability/KVM 评审和真实 Evidence 完成前保持 `draft`，不得把静态 Contract Test 解释为 Resource Isolation、Quota Enforcement、Billing Accuracy、`MicroVm` Assurance 或商业发布能力。
