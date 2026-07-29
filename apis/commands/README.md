# Sandbox Command Contracts

Purpose: author-owned, versioned provider-neutral command execution contracts.

Current status: candidate only. `REQ-2026-0007` is `draft`, the corresponding ADR is `proposed`, and the architecture/security review is `pending-human-review`. These files do not authorize a Rust public port, Local Provider, Firecracker Provider, host process, shell, PTY, network, Secret injection, API route, SDK, or deployment profile.

Authorities:

- `sandbox-command-execution-request.schema.json`: bounded executable, Argv, logical working directory, environment, identity, fencing, idempotency, and limits.
- `sandbox-command-cancellation-request.schema.json`: separately idempotent, tenant-scoped and fenced cancellation of one command operation.
- `sandbox-command-execution-result.schema.json`: bounded binary-safe output, outcome-consistent exit/truncation state, command-result replay, timing, cleanup status, and resource usage.
- `sandbox-command-execution-error.schema.json`: safe pre-start/result-unavailable error taxonomy with code-bound retryability and same-operation retry rules.
- `sandbox-command-contract.json`: fingerprint authority, idempotency, durable first-terminal arbitration, cleanup/quarantine policy, terminal result/error partition, forbidden execution modes, error ownership, and common conformance scenarios.

An accepted execution always converges to `SandboxCommandExecutionResult`; timeout, cancellation, output limit, resource exhaustion and fencing loss are terminal outcomes, not generic retry instructions. The Executor durably arbitrates competing exit, timeout, cancellation, output, resource and fencing signals with a first-terminal compare-and-swap, then records bounded cleanup before publishing the terminal result. Cleanup failure is explicit, preserves the primary outcome, and requires the Runtime Binding to be quarantined and the Provider to remain unavailable. Request fingerprints are derived by Sandbox Service and independently recomputed by the Executor from the versioned canonical field set. Callers cannot override them or create a new operation automatically after an uncertain or terminal outcome; `result-unavailable` may only query or replay the same Operation and fingerprint.

Related specs: `../../sdkwork-specs/SECURITY_SPEC.md`, `../../sdkwork-specs/OBSERVABILITY_SPEC.md`, `../../sdkwork-specs/PERFORMANCE_SPEC.md`, `../../sdkwork-specs/TEST_SPEC.md`.

Generated SDK transports, runtime state, credentials, provider-private data, host paths, host process identifiers, and handler implementations are forbidden here.
