# REVIEW-20260729: Sandbox Observability, Event, Audit And Outbox Contract

Status: pending-human-review

Requirement: [REQ-2026-0010](../../product/requirements/REQ-2026-0010-sandbox-observability-event-audit-outbox.md)

Decision: [ADR-20260729: Sandbox Observability, Event, Audit And Outbox Boundary](../../architecture/decisions/ADR-20260729-sandbox-observability-event-audit-outbox-boundary.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

## Scope

本 Review 只检查 Sandbox-owned AsyncAPI、Event Envelope、Event Catalog 与 Outbox 语义候选契约。它不批准 Runtime Exporter、PostgreSQL Migration、Event Worker、Queue、Webhook、API/SDK、Metering、Dashboard、Secret/KMS、Local Provider、Firecracker Provider 或 Deployment Profile。

## Contract Evidence

| Evidence | Result |
| --- | --- |
| `apis/async/sandbox-events.asyncapi.json` | Candidate AsyncAPI 3.0 authority exists; status remains `draft`. |
| `apis/async/sandbox-event-envelope.schema.json` | Candidate JSON Schema fixes required correlation, tenant, identity, redaction and bounded payload fields. |
| `apis/async/sandbox-event-catalog.json` | Candidate catalog fixes 33 exact dotted event types, including resource limit/usage, Admission/Placement/Capacity and Node Enrollment/Identity/Trust/Inventory/Drain/Quarantine facts, retention, ordering, replay, idempotency and audit metadata. |
| `apis/async/sandbox-outbox.contract.json` | Candidate contract fixes PostgreSQL transaction authority, at-least-once delivery, bounded retry, dead-letter, authorized replay, ordering, retention and forbidden record fields; implementation remains unauthorized. |
| `apis/async/sandbox-audit-record.schema.json` | Candidate `SandboxAuditRecord` captures actor/action/resource/tenant/result/time/trace with bounded, hashed actor and resource references. |
| `apis/async/sandbox-observability-catalog.json` | Candidate catalog fixes structured logs, 28 canonical metrics including low-cardinality resource enforcement/saturation, Admission/Placement/Capacity and Node Enrollment/Rotation/Attestation/Inventory/Scheduling-state operations, histogram buckets, safe labels, Trace propagation, audit durability, backpressure and billing/audit/dashboard fact separation. |
| `node --test tests/contract/sandbox-observability-contract.contract.test.mjs` | PASS (10/10); this validates the draft contract only and does not replace human ownership review. |
| `node --test tests/contract/*.test.mjs` | PASS (107/107), including Command Execution/Cancel and the integrated Multi-tenant Admission/Scheduling/Capacity, Node Trust/Verified Inventory, and PostgreSQL Quota/Capacity Persistence boundaries. |
| SDKWork component/layering/naming/docs/baseline validators | PASS on 2026-07-29; no runtime component or public port is added by this candidate. |

## Review Questions

- Does the Event/Outbox Owner own tenant retention, replay, dead-letter and incident response across Standalone and Cloud?
- Are `traceId`, tenant context, authorized actor context and `redactionClassification` sufficient for cross-repository Kernel/Agents correlation without leaking raw IDs or private paths?
- Which events are security/audit facts, which are operational telemetry, and which are rebuildable dashboard projections?
- Which PostgreSQL transaction boundary and migration owner will make Lifecycle facts and Outbox rows atomic without coupling L2 Service to an Event Worker?
- Do Operations/Database owners accept the proposed 12-attempt retry limit, 1-300 second exponential delay, 200-record publish/replay batches, 60-second claim lease, required dead-letter, and authorized audited replay?
- Do Security/Privacy/Release owners accept the proposed maximum retention windows: operational 90 days, terminal metadata 30 days, audit 2555 days, and telemetry 30 days, including the approval rule for shortening audit retention?

## Findings

- Candidate contract intentionally contains no Runtime implementation, provider-specific adapter, secret source, queue dependency or deployment claim.
- Exact event names, payload fields, Outbox records and Audit records are machine-checked for `sandbox.*`/`sandbox_*` ownership, bounds, idempotency and forbidden sensitive field names.
- Metric names, types, units, duration/byte histogram buckets and labels are machine-checked；Command Execution/Output/Cleanup 只使用有界 Provider/Outcome/Exit Class/Stream/Cleanup Status，且 Cleanup Status 与 Command Result Schema 交叉校验；Log、Metric 与 Dashboard 语义明确与 Billing/Audit Fact 分离。
- Human ownership, retention, transaction, replay and release decisions remain open; status must remain `pending-human-review`.

## Verification Commands

```bash
node --test tests/contract/sandbox-observability-contract.contract.test.mjs
node ../sdkwork-specs/tools/check-repository-docs-standard.mjs --root .
node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root . --strict
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
node ../sdkwork-specs/tools/check-rust-backend-composition.mjs --root .
node ../sdkwork-specs/tools/check-identity-naming.mjs --root .
node ../sdkwork-specs/tools/audit-repository-baseline.mjs --root .
```

## Conclusion

`conditional-pass` 仅表示候选契约结构可审查且静态 Contract Test 已通过；REQ 保持 `draft`、ADR 保持 `proposed`，在 Owner、Security/Privacy、Database、Operations、Retention 与商业 Release 评审通过前禁止实现 Event Outbox、Exporter、Worker 或任何对外事件消费接口。

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
