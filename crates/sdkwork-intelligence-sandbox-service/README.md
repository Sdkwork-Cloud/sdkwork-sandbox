# SDKWork Intelligence Sandbox Service

Domain: `intelligence`

Capability: `sandbox`

Package type: Rust service crate

Status: `0.1` lifecycle service candidate under `REQ-2026-0002`

## Public API

The crate exports Provider-neutral Create/Start/Stop/Destroy use cases, `SandboxSession` state and operation records, typed lifecycle errors, the `SandboxSessionLifecyclePort`, and the tenant-scoped optimistic `SandboxSessionRepository` port. `SandboxSessionId` and `SandboxWorkspaceId` are caller-supplied, opaque references to the Agents-owned identities; this crate does not create an Agent Session or Workspace registry. Workspace attachment, quota, snapshot, and recovery use cases remain future scope.

## Required SDK Surface

None.

## Configuration

No runtime configuration keys are active.

## Deployment Profile And Runtime Target Behavior

Business lifecycle rules must remain identical across local, private, and SaaS composition; deployment differences enter through provider and infrastructure ports.

## Security

The service validates state transitions, idempotency, capability/assurance selection, readiness, and cleanup independently of provider mechanics. Repository restore replays stable Sandbox Operation order and rejects invalid State/Failure/Binding/Allocation combinations before Provider Allocation decryption. Reconciliation validates page size and returns a continuation only after a bounded successor probe. Authentication, permission resolution, and quota policy are not introduced by this slice.

## Extension Points

Composition injects `SandboxProvider` implementations and one `SandboxSessionRepository`. The service never imports `sdkwork-agents`, a concrete provider, or a persistence adapter.

## Verification

`cargo test -p sdkwork-intelligence-sandbox-service`
