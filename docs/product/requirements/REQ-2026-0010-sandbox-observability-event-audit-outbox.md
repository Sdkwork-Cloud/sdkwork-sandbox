---
id: REQ-2026-0010
title: Define the Sandbox observability, event, audit, and outbox contract
owner: SDKWork Runtime Platform
status: draft
priority: high
source: reliability
problem: Sandbox has lifecycle and recovery candidates but no machine-governed contract for trace correlation, structured operational telemetry, security audit records, or transactional event publication. Without that boundary, commercial operators cannot distinguish lifecycle facts from logs, metrics, audit records, billing facts, or provider-private diagnostics.
goals:
  - Define one versioned Sandbox-owned event envelope and exact event catalog for lifecycle, attachment, command, provider, quota/resource usage, snapshot, security, and telemetry outcomes.
  - Make tenant context, Server-owned Trace, redaction classification, retention class, ordering, replay, and idempotency explicit.
  - Define an Outbox boundary that preserves transactional business facts without making telemetry the billing or audit source of truth.
  - Make safe structured logs, bounded metrics, traces, and audit/security events machine-reviewable before runtime implementation.
non_goals:
  - Implement an exporter, queue, worker, Outbox table, database migration, dashboard, webhook, API route, SDK, or event consumer.
  - Publish Provider-private Allocation Reference, Host Path, command/argv, raw terminal output, Secret Material, credentials, signed URLs, SQL, or unbounded tenant/user data.
  - Define Agents-owned `agent.session.*` or `agent.workspace.*` events.
  - Declare billing, metering, quota charging, or a dashboard projection as the source of truth.
users:
  - Sandbox lifecycle and provider maintainers
  - Sandbox security and privacy reviewers
  - SaaS reliability and incident operators
  - SDKWork Kernel and future API/SDK integrators
affected_surfaces:
  - observability
  - events
  - audit
  - persistence
  - composition
  - security
  - reliability
---

# REQ-2026-0010: Sandbox Observability、Event、Audit 与 Outbox 契约

## Readiness Blockers

本需求在以下事项完成人工评审前保持 `draft`，不进入运行时实现：

- 明确 Sandbox Event/Outbox Owner、Consumer Owner、Retention Owner、Incident Owner 与跨仓库 Trace Authority。
- 接受 `SandboxEventEnvelope` 的公共命名、精确事件类型、Schema 版本和兼容窗口。
- 接受 Tenant/Organization 上下文、Redaction Classification、Retention Class、Ordering、Replay、Dead-letter 与 Idempotency 语义。
- 接受 PostgreSQL Outbox 数据所有权、事务边界、失败恢复和未来 Event Worker 的 L5/L6 归属；本需求不创建迁移。
- 完成 Security、Privacy、Observability、Event、Database、Performance 与 Release 评审，确认哪些指标可进入商业运维、哪些事实只能进入审计或计量系统。

## Candidate Acceptance Criteria

- `apis/async/sandbox-events.asyncapi.json`、`sandbox-event-envelope.schema.json`、`sandbox-event-catalog.json`、`sandbox-outbox.contract.json`、`sandbox-audit-record.schema.json` 与 `sandbox-observability-catalog.json` 形成一个相互引用且状态为 `draft` 的机器契约包；所有事件类型必须是稳定的 `sandbox.*` dotted name，并且不出现 Agents-owned event family。
- Envelope 必须包含全局去重所需的 `id`、稳定 `type`、`source`、`specversion`、UTC `time`、`dataSchemaVersion`、`tenantId`、`traceId`、`redactionClassification` 与 schema-defined `data`；Sandbox-owned identity 使用 `sandboxSessionId`、`sandboxWorkspaceId`、`sandboxId`、`sandboxRuntimeBindingId`、`sandboxOperationId` 和 `sandboxProviderId`。
- Event Catalog 必须逐类型声明 schema version、category、retention class、redaction class、ordering scope、replay policy、consumer idempotency requirement 与是否产生 audit fact；`sandbox.metrics.updated` 只能表示遥测投影，不得成为计费或审计事实源。
- REQ-2026-0015 的 `sandbox.quota.resource.limit.applied`、`sandbox.quota.resource.limit.exceeded` 与 `sandbox.resource.usage.recorded` 必须注册在同一 Event Catalog；Usage Event 只承载对 immutable `SandboxResourceUsageFact` 的受治理事实，不得把 Metric 转换为 Billing Truth。
- REQ-2026-0016 的 `sandbox.scheduler.placement.selected`、`sandbox.scheduler.placement.failed`、`sandbox.scheduler.capacity.reserved` 与 `sandbox.scheduler.capacity.released` 必须注册在同一 Event Catalog；Admission、Placement、Queue Wait、Reservation 与 Saturation Metric 只承载低基数运营信号，不得成为 Quota、Capacity、Placement 或 Billing Authority。
- REQ-2026-0017 的 Node Enrollment、Identity Rotation、Trust Change、Inventory Update、Drain 与 Quarantine Event，以及 Enrollment/Rotation/Attestation/Inventory/Node Scheduling State Metric 必须注册在同一 Catalog；它们不得成为 Machine Identity、Attestation 或 Inventory Authority，且禁止暴露 Node Reference、Certificate、Serial、Key Thumbprint、Raw Evidence、Measurement、Host Address、Topology、Raw Locality/Residency/Fault Domain 或 Capacity。
- `sandbox-outbox.contract.json` 必须要求业务事实与待发布事件在同一 PostgreSQL 权威事务边界内写入；Publisher 使用 at-least-once、bounded exponential retry、dead-letter、授权且审计的 replay、consumer idempotency 与明确 ordering，不能静默丢失安全事件或执行无界回放。
- `sandbox-audit-record.schema.json` 必须以 `SandboxAuditRecord` 捕获 actor/action/resource/tenant/result/time/traceId，并使用哈希引用代替原始主体或资源身份；普通 Log、Metric、Trace、Event 与 Audit 均禁止 Secret、Token、Credential、Private Key、Host Path、Raw Command、Argv、Raw Output、Provider-private Allocation Reference、SQL、Signed URL 与无界 PII。
- `sandbox-observability-catalog.json` 的 Metric contract 必须使用 lowercase snake case、明确 `_total`/`_duration_seconds`/`_bytes` 单位、`service`/`environment`/`deployment_profile`/`runtime_target` 等标准低基数标签；不得把租户名、用户 ID、Trace ID、Request ID、原始 URL 或模型/Provider 显示名作为标签。
- REQ-2026-0007 Command Metric 必须覆盖 Execution Count/Duration、Captured Output Bytes 与 Descendant Cleanup Duration；只允许有界 Provider Kind、Outcome、Exit Class、stdout/stderr Stream 与和 Command Result 同源的 Cleanup Status，禁止 Command、Argv、Path、Output、Operation/Trace/Raw Tenant ID 成为 Label。
- Trace correlation 必须使用 Server-owned `traceId`，跨 Sandbox、Kernel、Agents 和 Provider Adapter 时保持关联；不得在 Service、Repository 或 Provider 内创建竞争性的 request identity。
- Event replay、unknown event tolerance、schema compatibility、redaction deny-list、idempotent consumer、bounded retention 和 metric-label checks 必须由 Contract Test 或静态检查证明；没有 Runtime implementation 也必须能够验证契约自身。

## Candidate Non-functional Requirements

| 领域 | 要求 |
| --- | --- |
| Security | 安全事件不得因 Telemetry Exporter 不可用而丢失；任何敏感字段进入普通 Log/Metric/Event 时必须拒绝或升级 Redaction。 |
| Privacy | 只保留最小 Tenant/Organization/授权 Actor 上下文；Provider-private、Host、Secret、Command 与完整 Payload 使用 deny-by-default。 |
| Performance | Event、Metric、Audit、Outbox Payload 与 Label 数量、字段长度、重试次数、Retention 扫描和 Replay Batch 必须有界；禁止无界历史下载或内存 `slice`。 |
| Reliability | Outbox 事务、Publisher 重试、Dead-letter、Replay、Consumer Idempotency、Ordering 与故障恢复必须可观测且可演练。 |
| Operations | 事件、日志、指标、Trace、Audit 和 Dashboard Projection 分离存储与保留策略；Dashboard Projection 可从事实重建，不能反向成为事实源。 |

## Trace

Specs: `REQUIREMENTS_SPEC.md`, `ARCHITECTURE_DECISION_SPEC.md`, `OBSERVABILITY_SPEC.md`, `EVENT_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `DATABASE_SPEC.md`, `PERFORMANCE_SPEC.md`, `TEST_SPEC.md`, `RELEASE_SPEC.md`.

Components: `apis/async/`, `crates/sdkwork-intelligence-sandbox-service`, `crates/sdkwork-sandbox-service-host`, future approved Event/Outbox Composition and Telemetry adapters. Agents-owned `agent.*` events remain outside this requirement.

Decision: [ADR-20260729: Sandbox Observability, Event, Audit And Outbox Boundary](../../architecture/decisions/ADR-20260729-sandbox-observability-event-audit-outbox-boundary.md).

## Verification Plan

```bash
node --test tests/contract/sandbox-observability-contract.contract.test.mjs
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root . --strict
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
node ../sdkwork-specs/tools/check-rust-backend-composition.mjs --root .
node ../sdkwork-specs/tools/check-identity-naming.mjs --root .
node ../sdkwork-specs/tools/audit-repository-baseline.mjs --root .
```

Runtime exporter, PostgreSQL Outbox migration, Event Worker, API/SDK, Scheduler, Metering, Dashboard, Deployment Profile、Local Provider 与 Firecracker Provider 需要各自 `ready` Requirement、必要 ADR、实现、故障演练和 Release Evidence；本需求的契约测试不能替代这些证据。

## Current Boundary

2026-07-29：已形成由 AsyncAPI、Envelope Schema、Event Catalog、Outbox Contract、Audit Record Schema 与 Observability Catalog 组成的候选机器契约包；当前目录包含 33 个 Event Type 与 32 个 canonical Metric，Outbox 原子性/投递边界、审计安全身份、结构化日志、Trace 传播、backpressure、Command Execution/Output/Cleanup（含固定 `sandbox_cleanup_status`）、Resource Limit/Usage、Admission/Placement/Capacity、Node Enrollment/Identity/Attestation/Verified Inventory、PostgreSQL Quota/Capacity Reservation 事件和事实分离均可静态验证。`node --test tests/contract/sandbox-observability-contract.contract.test.mjs` 通过（10/10），完整 Contract Suite 通过（107/107）。所有新增契约均保持 `draft`/`implementationAuthorized: false`，REQ 继续等待 Owner、Security/Privacy、Database、Operations、PKI/Attestation、Capacity/Commerce、Retention、Release 与跨仓库 Trace Authority 人工评审。
