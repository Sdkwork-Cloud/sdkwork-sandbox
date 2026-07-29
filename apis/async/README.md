# Sandbox Async Contracts

Purpose: author-owned, versioned Sandbox event and asynchronous contract sources.

Current status: the event package is a candidate only. `REQ-2026-0010` is `draft` and the corresponding ADR is `proposed`; these files do not authorize an Event Worker, Outbox migration, exporter, webhook, API, SDK, or deployment profile.

Authorities:

- `sandbox-events.asyncapi.json`: AsyncAPI channel and message authority.
- `sandbox-event-envelope.schema.json`: CloudEvents-compatible Sandbox envelope and safe payload boundary.
- `sandbox-event-catalog.json`: exact event types, including resource limit/usage facts, retention, ordering, replay, idempotency, and independent audit-fact metadata.
- `sandbox-outbox.contract.json`: transactional publication, at-least-once delivery, bounded retry, dead-letter, replay, ordering, retention, and redaction candidate authority.
- `sandbox-audit-record.schema.json`: bounded `SandboxAuditRecord` actor/action/resource/tenant/result/time/trace schema using hashed actor and resource references.
- `sandbox-observability-catalog.json`: structured log, low-cardinality lifecycle/provider/resource metric, trace, audit, backpressure, and fact-separation candidate authority; metrics are not billing truth.

Related specs: `../../sdkwork-specs/EVENT_SPEC.md`, `../../sdkwork-specs/OBSERVABILITY_SPEC.md`, `../../sdkwork-specs/SECURITY_SPEC.md`, `../../sdkwork-specs/TEST_SPEC.md`.

Generated SDK transports, runtime state, credentials, provider-private data, and handler implementations are forbidden here.
