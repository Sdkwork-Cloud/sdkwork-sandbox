# REQ-2026-0023: Sandbox Internal Control Plane

Status: draft

Owner: SDKWork Runtime Platform

Source: customer

Priority: P0

Updated: 2026-07-31

Specs: REQUIREMENTS_SPEC.md, ARCHITECTURE_DECISION_SPEC.md, APPLICATION_LAYERED_ARCHITECTURE_SPEC.md, INTERNAL_API_SPEC.md, RPC_SPEC.md, RPC_SDK_WORKSPACE_SPEC.md, RPC_RESILIENCE_SPEC.md, RUST_RPC_SPEC.md, SECURITY_SPEC.md, OBSERVABILITY_SPEC.md, PERFORMANCE_SPEC.md, DEPLOYMENT_SPEC.md, TEST_SPEC.md, QUALITY_GATE_SPEC.md

Related: REQ-2026-0002, REQ-2026-0005, REQ-2026-0007, REQ-2026-0009, REQ-2026-0010, REQ-2026-0016, REQ-2026-0019, REQ-2026-0021

## Problem

The Sandbox lifecycle candidate is currently an in-process Rust service. The target cloud topology requires Kernel to request admission, Workspace Runtime allocation, command execution, checkpoint, release, and reconciliation across process and node boundaries, but no reviewed Kernel-to-Sandbox service contract exists. REQ-2026-0021 deliberately excludes API, SDK, and transport implementation.

Without one control-plane authority, a cloud implementation could expose Provider-specific operations, reuse Kernel leases as Sandbox fencing, accept caller-selected nodes or paths, invent handwritten HTTP, or implement different semantics for standalone and cloud deployments. A transport outage could then create duplicate allocations, stale cleanup, lost Checkpoints, or optimistic readiness.

## Goals

- Define one Sandbox-owned application port for Kernel-to-Sandbox orchestration.
- Preserve the same lifecycle, transaction, idempotency, error, and readiness semantics for in-process standalone and cross-process cloud composition.
- Select internal RPC over gRPC as the candidate cloud adapter while keeping the transport outside domain and application services.
- Require service identity, least-privilege authorization, typed trusted context, contract versioning, deadlines, cancellation, backpressure, and safe errors.
- Keep Kernel execution placement and Sandbox capacity placement as independent fenced authorities.
- Generate any future RPC client from Proto and an RPC manifest; forbid raw HTTP, raw gRPC stubs, and hand-edited generated output.
- Define compatibility, discovery, health, observability, drain, rollout, and failure evidence before runtime materialization.

## Non-Goals

- Exposing Sandbox directly to BirdCoder, Agents, browsers, or public application ingress.
- Creating an HTTP app-api, backend-api, open-api, or application-local HTTP internal-api.
- Letting Kernel select a concrete Provider, node, pool slot, host path, device, network namespace, cgroup, or Secret value.
- Sharing Kernel placement records, leases, fencing generations, or idempotency keys as Sandbox ownership authority.
- Defining interactive PTY/stdin/resize/reconnect streaming, which requires a separate ready contract.
- Implementing Provider, Scheduler, Pool, Workspace storage, Secret/KMS, Node Agent, Host Broker, Proto, SDK, discovery, service host, or deployment code.
- Treating a successful RPC response as readiness before the Workspace Runtime Transaction has durable effective evidence.

## Acceptance Criteria

1. `SandboxControlPlanePort` is the candidate Sandbox-owned application boundary. Kernel is its only cross-repository runtime consumer; BirdCoder and Agents cannot call it.
2. Standalone composition invokes the port in process. Cloud composition uses a generated internal RPC client over gRPC. Both adapters pass one shared conformance suite and expose identical domain semantics and safe error categories.
3. Candidate RPC identity is internal-only, targets SDKWork RPC L3, is never mounted on `application.public-ingress`, and uses a private service network or approved loopback boundary.
4. Proto and the RPC manifest become the source of truth before transport implementation. Generated clients are never hand-edited, and a missing operation cannot be filled with raw HTTP or a handwritten gRPC stub.
5. Every call carries typed SDKWork caller/request metadata. Tenant, organization, and service actor context is resolved from authenticated service identity or a reviewed signed orchestration context; arbitrary caller metadata cannot override it.
6. Production and private cloud use mutually authenticated workload identity and per-operation authorization. Standalone trust is explicit, loopback or in-process only, and never inferred from an unauthenticated bind address.
7. Requests contain opaque Kernel placement reference/generation, authorized Workspace Revision context, required capability/assurance/policy references, operation/idempotency identity, canonical payload hash, and deadline. They contain no Provider, node, slot, host path, device, mount, network, cgroup, raw lease token, Sandbox fencing token, allocation reference, credential, or Secret value.
8. Candidate operations cover capability/readiness query, Workspace Runtime acquisition, operation lookup, bounded Command execution/cancellation, Checkpoint request, Workspace Runtime release, and bounded operation-event observation. Provider-private and privileged Host operations are not exposed.
9. Every mutating operation is durable and idempotent. Same key and canonical fingerprint replays the accepted result; a different fingerprint conflicts; an ambiguous transport result is resolved by operation lookup before retrying a side effect.
10. Kernel execution ownership and Sandbox allocation ownership use different records, lease owners, fencing generations, idempotency scopes, and reconcilers. A request binds current opaque Kernel generation without converting it into Sandbox authority.
11. Long operations return a durable operation reference or a bounded result. No database transaction or RPC handler remains open while waiting on Provider, Workspace, or KMS side effects.
12. Clients set deadlines; servers enforce smaller remaining budgets for dependencies, observe cancellation, and record reconciliation obligations when cancellation cannot prove the downstream outcome.
13. Server streaming is limited to bounded operation events with sequence, resume cursor, replay window, authorization, backpressure, cancellation, and slow-consumer policy. Interactive Terminal streams remain unavailable.
14. Safe errors distinguish validation, authentication, authorization, unsupported capability, policy denial, quota, capacity, rate limit, deadline, cancellation, invalid state, idempotency conflict, lease loss, fencing conflict, provider unavailable, storage failure, dependency degradation, and unknown outcome without exposing infrastructure details.
15. Contract negotiation includes protocol/contract version, server capabilities, expiry/freshness, and stable incompatibility reasons. Unsupported versions fail closed; there is no silent downgrade to HTTP, Local Provider, weaker assurance, or an older semantic contract.
16. Cloud discovery, health, readiness, reflection, mTLS, certificate rotation, drain, rollout, rollback, and topology are explicit. Reflection is disabled or restricted in production, and health never claims serving when required runtime gates are closed.
17. Logs, metrics, traces, and audit use bounded RPC identity and correlation. Tenant, organization, Workspace, Session, Operation, command, path, credential, allocation, and Secret values are not metric labels or unsafe logs.
18. Real standalone and multi-process cloud evidence proves duplicate delivery, ambiguous response recovery, deadline/cancellation, stale generation rejection, restart, dependency loss, drain, version skew, backpressure, authorization denial, and no direct Provider or repository access from the adapter.

## Non-Functional Requirements

| Area | Required outcome |
| --- | --- |
| Security | L3 internal RPC, mTLS/workload identity, per-operation authorization, trusted context, no public ingress, and no physical or secret-bearing fields. |
| Privacy | Data minimization, bounded diagnostics, no content-bearing telemetry, and no transport-owned Workspace copy. |
| Performance | Explicit request, message, active call, waiter, stream, replay, deadline, and shutdown bounds with saturation metrics. |
| Reliability | Durable idempotency, operation lookup after ambiguity, cancellation reconciliation, version fail-close, drain, and no semantic difference between in-process and RPC adapters. |
| Operability | Standard health, discovery, tracing, audit, version diagnostics, rollout, rollback, and safe stable error categories. |

## Affected Surfaces

- `sdkwork-intelligence-sandbox-service` application port and shared conformance
- future Sandbox internal RPC authority, manifest, generated RPC SDK, and Rust adapter
- `sdkwork-sandbox-service-host` standalone/cloud composition and readiness
- `sdkwork-kernel` generated RPC consumer and execution-placement adapter
- deployment topology, discovery, workload identity, observability, compatibility, and release evidence

## Traceability

- [ADR-20260731](../../architecture/decisions/ADR-20260731-sandbox-internal-control-plane.md)
- [Architecture and security review](../../engineering/reviews/REVIEW-20260731-sandbox-internal-control-plane.md)
- [Machine contract](../../../specs/sandbox-internal-control-plane.contract.json)
- [Workspace Runtime Transaction](REQ-2026-0021-sandbox-workspace-runtime-transaction-and-checkpoint.md)
- `sdkwork-kernel/docs/product/requirements/REQ-2026-0002-distributed-execution-placement-control-plane.md` (blocked cross-repository owner requirement)

## Implementation Gate

This requirement remains `draft`. Candidate type, service, method, operation, package, metadata, error, and version names are non-public review inputs. It does not authorize a Rust Port, Proto, RPC manifest, generated SDK, server/client, HTTP route, service discovery registration, credential, configuration, runtime profile, package, deployment, Kernel source change, or Provider operation. Implementation begins only after the requirement is ready, the ADR and review are accepted, the dependent runtime gates authorize implementation, and the selected transport receives API/RPC, security, operations, and cross-repository human approval.
