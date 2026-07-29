# Cross-Component Tests

Purpose: contract, integration, end-to-end, fixture, and static checks that cross crate boundaries.

Owner: SDKWork Sandbox quality maintainers.

Allowed: cross-component tests and synthetic, non-secret fixtures. Forbidden: crate-local unit tests, real customer data, credentials, runtime state, and unbounded external integration tests.

Related specs: `../../sdkwork-specs/TEST_SPEC.md`, `../../sdkwork-specs/SECURITY_SPEC.md`.

Verification: Phase 0 uses Cargo workspace tests and SDKWork static validators; cross-component fixtures are added only with implementing requirements.
