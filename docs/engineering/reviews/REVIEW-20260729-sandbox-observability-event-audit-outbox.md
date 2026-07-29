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
| `node --test tests/contract/*.test.mjs` | PASS (104/104), including the integrated Multi-tenant Admission/Scheduling/Capacity, Node Trust/Verified Inventory, and PostgreSQL Quota/Capacity Persistence boundaries. |
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
- Metric names, types, units, histogram buckets and labels are machine-checked; Log, Metric and Dashboard semantics are explicitly separated from Billing and Audit facts.
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
