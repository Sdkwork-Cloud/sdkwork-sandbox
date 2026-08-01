# ADR-20260731: Sandbox Internal Control Plane

Status: proposed

Requirement: [REQ-2026-0023](../../product/requirements/REQ-2026-0023-sandbox-internal-control-plane.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-31

Deciders: Sandbox, Kernel, API/RPC, Security, Reliability, Operations and Release owners

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `RPC_SPEC.md`, `RPC_SDK_WORKSPACE_SPEC.md`, `RPC_RESILIENCE_SPEC.md`, `RUST_RPC_SPEC.md`, `SECURITY_SPEC.md`, `DEPLOYMENT_SPEC.md`

## Context

Sandbox has an in-process lifecycle application service but no cloud service boundary. Kernel needs the same provider-neutral orchestration in standalone and cloud topologies. An application HTTP internal-api is intended for first-party application ingress, while SDKWork internal RPC is the preferred service-to-service boundary. A transport must not create a second lifecycle implementation or expose Provider mechanisms.

## Decision

1. Sandbox owns one candidate `SandboxControlPlanePort` in its application-service boundary. Lifecycle and Workspace Runtime Transaction semantics remain below this port.
2. Standalone uses a direct in-process adapter. Cross-process cloud composition uses generated internal RPC over gRPC/HTTP2. Both adapters run the same conformance suite.
3. The candidate RPC surface targets L3 and remains private service-to-service. It is not HTTP internal-api, app-api, backend-api, open-api, or public ingress.
4. Future Proto and RPC manifest are transport authority; generated clients are consumed by Kernel. Adapters call the application port and never a SQLx repository, Provider, Host Broker, or storage adapter directly.
5. Mutations return durable operation identity or a bounded result. Provider and storage side effects never hold a database transaction or transport handler open.
6. Authenticated service identity resolves typed caller context. Per-operation authorization and request validation occur before body-driven side effects. User tokens and caller-overridable tenant metadata are not the trust boundary.
7. Kernel placement and Sandbox allocation remain independent fenced state machines. The request carries an opaque Kernel placement reference/generation for correlation and stale-call rejection, never as the Sandbox lease or fencing token.
8. Every mutation uses Sandbox-scoped idempotency and canonical fingerprinting. Ambiguous RPC results are reconciled through operation lookup before retry.
9. RPC deadlines, cancellation, retry, circuit breaking, concurrency, waiters, streams, replay, and shutdown are bounded. Retry is allowed only for declared retry-safe outcomes.
10. Server streaming is limited to bounded operation events. Interactive PTY traffic uses a separately reviewed Terminal Session contract and cannot be smuggled through generic event payloads.
11. Contract-version negotiation fails closed on incompatibility. There is no raw HTTP, handwritten stub, weaker Provider, weaker assurance, or semantic-version fallback.
12. Cloud uses discovery and mTLS/workload identity; standalone uses an explicit in-process or approved loopback trust boundary. Both expose standard health while readiness remains dependent on the underlying runtime gates.

## Alternatives

### Expose An Application HTTP Internal API

Rejected as the primary cloud service boundary because SDKWork HTTP internal-api is application-ingress oriented. Kernel-to-Sandbox is service orchestration and fits internal RPC. An HTTP bridge may exist only through a separately reviewed compatibility need and cannot become a second semantic authority.

### Let Kernel Link Sandbox Rust Crates In Every Topology

Rejected because cloud placement must cross process/node boundaries and independently deploy. In-process composition remains valid only for the standalone adapter.

### Let Agents Or BirdCoder Call Sandbox

Rejected because it bypasses Agents authorization and Kernel execution placement, routing, cancellation, and recovery.

### Expose Provider Or Host Broker Operations

Rejected because it moves capacity and privileged mechanism decisions above Sandbox and breaks the open-closed Provider boundary.

### Use One Shared Placement Lease

Rejected because Kernel execution ownership and Sandbox capacity ownership have different resources, failure domains, expiry, cleanup, and reconciliation.

## Consequences

- Sandbox gains a stable service boundary without coupling domain logic to gRPC.
- Standalone remains lightweight while cloud can deploy independently through generated clients and discovery.
- RPC contract/version governance, SDK generation, workload identity, resilience, deployment, and real multi-process evidence become mandatory work after approval.
- Interactive Terminal and Secret projection remain independent requirements rather than generic transport fields.
- No runtime progress is authorized until upstream Provider, transaction, security, and review gates are approved.

## Verification

- Static tests validate authority, adapter parity, request minimization, independent fencing, idempotency, error, version, deployment, and no-implementation rules.
- Future Proto lint/breaking checks, RPC manifest checks, generated Rust plus non-Rust client verification, server/client smoke, resilience, security, and topology tests follow the RPC standards.
- Real standalone and cloud evidence must cover duplication, ambiguity, cancellation, stale generation, restart, drain, version skew, discovery, certificate rotation, saturation, and dependency loss.

## Implementation Boundary

This proposed ADR does not authorize public/internal names, a Rust Port, Proto, SDK, RPC framework, service discovery, authentication mechanism, route, config, package, deployment, Kernel integration, or Provider implementation.

## Supersedes / Superseded By

This decision extends the runtime and Service Host boundaries without superseding their lifecycle or composition authority.
