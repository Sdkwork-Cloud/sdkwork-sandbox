# ADR-20260729: Sandbox Observability, Event, Audit And Outbox Boundary

Status: proposed

Requirement: REQ-2026-0010

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `OBSERVABILITY_SPEC.md`, `EVENT_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `DATABASE_SPEC.md`, `PERFORMANCE_SPEC.md`, `TEST_SPEC.md`, `RELEASE_SPEC.md`

## Context

Sandbox 已有 `SandboxSession` Lifecycle、Provider Readiness、Lease/Fencing、恢复元数据和候选 Command Contract，但事件、日志、指标、Trace、Audit 与未来 Outbox 没有统一的机器权威。若各个 Provider、Repository 或 Service 自行定义事件、Trace 或指标，会导致租户边界、Redaction、Retention、Ordering、Replay 和商业运维含义不一致；若把 Metric 或 Console Log 当作事实源，又会污染审计与计费边界。

## Decision

1. 事件与可观测性契约的作者权威固定在 `apis/async/`，由 `sandbox-events.asyncapi.json`、`sandbox-event-envelope.schema.json`、`sandbox-event-catalog.json`、`sandbox-outbox.contract.json`、`sandbox-audit-record.schema.json` 和 `sandbox-observability-catalog.json` 组成候选契约包；生成 SDK、Transport、Exporter 和 Runtime state 不属于该目录。
2. 事件使用 CloudEvents-compatible `SandboxEventEnvelope`：`id`、`type`、`source`、`specversion`、UTC `time`、`dataSchemaVersion`、Tenant context、Server-owned `traceId`、`redactionClassification` 与 schema-defined `data`。Sandbox identity 只通过 `sandbox*` 字段表达；Agents-owned `agent.*` event 不由 Sandbox 定义。
3. Event Catalog 是事件类型、Payload Schema、Retention、Redaction、Ordering、Replay、Consumer Idempotency 与 Audit 关系的唯一候选清单。Unknown event type 必须可被安全忽略；已发布 Schema 只能向后兼容或提升 Event Version。
4. `sandbox-outbox.contract.json` 固定未来 Cross-service business event 的 PostgreSQL-authoritative Outbox 候选语义：业务事实与 Outbox row 在同一事务边界提交，Publisher 执行 at-least-once 与有界指数重试，失败进入 dead-letter，Replay 通过原 Event ID、Schema Version、授权审计和 consumer idempotency 防止重复副作用。Outbox table、worker、queue 和 migration 由后续 Ready Requirement 拥有。
5. `sandbox-audit-record.schema.json` 和 `sandbox-observability-catalog.json` 固定 Audit/Security Event 与 Operational Log、Metric、Trace、Terminal Stream、Dashboard Projection 的分离；Audit 事实不能依赖 Console Log，Metric 不能作为 Billing Truth，Dashboard Projection 必须可从事实重建。
6. `sandbox-observability-catalog.json` 固定标准低基数标签和安全关联：`service`、`environment`、`deployment_profile`、`runtime_target`，以及有界的 `sandbox_*` 维度。禁止 Raw ID、Tenant name、Trace ID/Request ID、Raw Path、Command、Argv、Output、Secret、Host Path、Provider-private Allocation Reference 和 SQL 进入 Metric label 或普通日志。
7. REQ-2026-0015 的 Resource Limit Applied/Exceeded 与 Usage Recorded 进入同一 Event Catalog；Resource Metric 只使用 Provider Kind/Resource Kind/Operation/Outcome 等低基数维度。`SandboxResourceUsageFact` 是独立 immutable durable fact，Metric 不得升级为 Billing Truth。
8. REQ-2026-0016 的 Admission Denied、Placement Selected/Failed 与 Capacity Reserved/Released 进入同一 Event Catalog；Admission/Placement/Queue/Reservation/Saturation Metric 只使用低基数维度。Event/Metric 不得成为 Quota、Capacity、Placement 或 Billing Authority，也不得暴露 Raw Tenant、Node、Topology、Entitlement 或 Capacity。
9. REQ-2026-0017 的 Node Enrollment、Identity Rotation、Trust Change、Inventory Update、Drain 与 Quarantine 进入同一 Event Catalog；Node Enrollment/Rotation/Attestation/Inventory/Scheduling State Metric 只使用低基数 Trust Profile、State 与 Outcome。Event/Metric 不得成为 Machine Identity、Attestation 或 Inventory Authority，也不得暴露 Node Reference、Certificate、Serial、Key Thumbprint、Raw Evidence、Measurement、Host Address、Topology、Raw Locality/Residency/Fault Domain 或 Capacity。
10. REQ-2026-0007 的 Command Accepted/Completed/Failed 使用同一 Event Catalog；Execution Count/Duration、Captured Output Bytes 与 Descendant Cleanup Duration 使用固定低基数 Provider Kind、Outcome、Exit Class、Stream 与 Cleanup Status。Raw Command、Argv、Path、Output、Operation/Trace/Raw Tenant ID 不得成为 Label，Metric 也不得成为 Command Result、Audit 或 Billing Authority。
10. Telemetry Exporter 不可用时，安全 Audit 与必要的业务事实仍必须保留；非关键 telemetry 可按显式 retention/backpressure policy 降级，但不能改变 Sandbox Lifecycle 或安全决策。

## Alternatives

### 每个 Provider 自定义事件和指标

拒绝。Provider-specific vocabulary 会破坏 Kernel-facing Contract、跨 Provider Conformance、租户隔离和统一运维；差异必须通过 catalog metadata 和 adapter mapping 表达。

### 只写结构化 Log，不建立 Event/Outbox

拒绝。Log 不提供事务性发布、稳定 Schema、Consumer Idempotency、Replay 或审计事实保证；安全操作不能只依赖 Console/Log 输出。

### 让 Metrics 或 Dashboard Snapshot 作为事实源

拒绝。Metrics 是低基数聚合，Dashboard 是可重建投影；两者不能替代 Lifecycle、Quota、Billing 或 Audit 的权威事实。

### 先实现 Kafka/Redis/OTLP，再补契约

拒绝。基础设施选择会过早冻结可靠性、成本、部署和数据驻留边界；先固定 provider-neutral contract，再由后续 Composition Requirement 选择适配器。

## Consequences

收益：事件、审计、日志、指标、Trace 和 Outbox 的所有权与安全边界可机器验证；Standalone、Cloud、Local、Firecracker 可复用相同的 Event Contract；未来 SDK/Consumer 可通过 Schema Version 和 Idempotency 演进。

成本：需要维护 AsyncAPI、JSON Schema、Event Catalog、Retention/Replay Policy、Outbox migration、Publisher Worker、Consumer Contract 和运维演练；每个新事件类型都需要版本与 Redaction 评审。

## Verification

- `tests/contract/sandbox-observability-contract.contract.test.mjs` 验证 AsyncAPI 引用、事件类型前缀、Envelope 必填字段、Schema Version、Redaction、Retention、Ordering、Replay、Outbox 原子性/重试/死信、Audit Schema、Metric 命名/标签、Trace、Backpressure、事实分离和禁止泄露字段。
- SDKWork `OBSERVABILITY_SPEC.md`、`EVENT_SPEC.md`、`SECURITY_SPEC.md`、`PRIVACY_SPEC.md` 和 `TEST_SPEC.md` 验证结果必须在实现 Requirement 中继续通过；本 ADR 不宣称已有 Runtime Exporter/Outbox。
- Component Port、Layering、Identity Naming、Repository Docs 和 Baseline validators 必须通过；该 ADR 在人工 Owner/Security/Database/Operations 评审前保持 `proposed`。

## Supersedes / Superseded By

Supersedes: none.

Superseded by: none.
