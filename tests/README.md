# Cross-Component Tests

Purpose: contract, integration, end-to-end, fixture, and static checks that cross crate boundaries.

Owner: SDKWork Sandbox quality maintainers.

Allowed: cross-component tests and synthetic, non-secret fixtures. Forbidden: crate-local unit tests, real customer data, credentials, runtime state, and unbounded external integration tests.

Related specs: `../../sdkwork-specs/TEST_SPEC.md`, `../../sdkwork-specs/SECURITY_SPEC.md`.

Verification: Phase 0 uses Cargo workspace tests, the provider-delivery, Host Isolation Broker, Firecracker Artifact Compatibility, Workspace Block Device/Sanitization, Firecracker Network Isolation, Firecracker Resource Isolation/Usage, Multi-tenant Admission/Scheduling/Capacity, Node Trust/Enrollment/Attestation/Verified Inventory, and PostgreSQL Quota/Capacity Persistence Gate 0 contract tests, the draft Sandbox command, Service Host composition/readiness, and observability contract tests, and SDKWork static validators; cross-component fixtures are added only with implementing requirements.
