# Engineering Requirements

Implementable `REQ-*` records governed by `REQUIREMENTS_SPEC.md`.

## Active Records

- [REQ-2026-0001: Initialize the SDKWork Sandbox foundation](REQ-2026-0001-sandbox-foundation.md) - Phase 0 repository, Canon documentation, and component boundary initialization.
- [REQ-2026-0002: Deliver the provider-neutral Sandbox lifecycle core](REQ-2026-0002-sandbox-lifecycle-core.md) - `SandboxSession`, Provider SPI, idempotency, and repository candidate contracts.
- [REQ-2026-0003: Deliver a constrained Local Sandbox Provider](REQ-2026-0003-secure-local-provider.md) - HostUser assurance and path/process security gates.
- [REQ-2026-0004: Integrate Agents-owned Workspace with Sandbox attachment](REQ-2026-0004-agents-workspace-attachment.md) - Agents ownership, Kernel ID mapping, and Sandbox attachment boundary.
- [REQ-2026-0005: Deliver durable Sandbox Session persistence and crash reconciliation](REQ-2026-0005-durable-sandbox-session-repository-and-reconciliation.md) - PostgreSQL authority, encrypted Runtime Binding recovery metadata, Lease/Fencing, and transient-state reconciliation.
- [REQ-2026-0006: Deliver Sandbox Provider allocation key rotation and bounded re-encryption](REQ-2026-0006-sandbox-provider-allocation-key-rotation.md) - versioned Key Source, Tenant-scoped re-encryption, ciphertext CAS, and old-key retirement gates.
- [REQ-2026-0007: Deliver the provider-neutral Sandbox command execution contract](REQ-2026-0007-sandbox-command-execution-contract.md) - shared Executable/Argv, limits, fencing, results, errors, and conformance for Local and Firecracker.
- [REQ-2026-0008: Deliver the Firecracker Sandbox Provider](REQ-2026-0008-firecracker-sandbox-provider.md) - Linux KVM, Jailer, artifact integrity, cgroup, network/workspace boundaries, cleanup, and MicroVm assurance.

See `DOCUMENTATION_SPEC.md` section 2.
