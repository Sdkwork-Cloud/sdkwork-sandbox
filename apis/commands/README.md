# Sandbox Command Contracts

Purpose: author-owned, versioned provider-neutral command execution contracts.

Current status: candidate only. `REQ-2026-0007` is `draft`, the corresponding ADR is `proposed`, and the architecture/security review is `pending-human-review`. These files do not authorize a Rust public port, Local Provider, Firecracker Provider, host process, shell, PTY, network, Secret injection, API route, SDK, or deployment profile.

Authorities:

- `sandbox-command-execution-request.schema.json`: bounded executable, Argv, logical working directory, environment, identity, fencing, idempotency, and limits.
- `sandbox-command-execution-result.schema.json`: bounded binary-safe output, truncation, exit outcome, timing, and resource usage.
- `sandbox-command-execution-error.schema.json`: safe error taxonomy and retryability.
- `sandbox-command-contract.json`: catalog, forbidden execution modes, error code ownership, and common conformance scenarios.

Related specs: `../../sdkwork-specs/SECURITY_SPEC.md`, `../../sdkwork-specs/OBSERVABILITY_SPEC.md`, `../../sdkwork-specs/PERFORMANCE_SPEC.md`, `../../sdkwork-specs/TEST_SPEC.md`.

Generated SDK transports, runtime state, credentials, provider-private data, host paths, host process identifiers, and handler implementations are forbidden here.
