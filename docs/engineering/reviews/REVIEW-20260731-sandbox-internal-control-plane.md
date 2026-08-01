# REVIEW-20260731: Sandbox Internal Control Plane

Status: pending-human-review

Outcome: No-Go

Requirement: [REQ-2026-0023](../../product/requirements/REQ-2026-0023-sandbox-internal-control-plane.md)

Decision: [ADR-20260731](../../architecture/decisions/ADR-20260731-sandbox-internal-control-plane.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-31

Risk: critical - cross-service authorization, duplicate allocation, stale fencing, protocol compatibility, cancellation ambiguity, private topology exposure, and control-plane availability.

## Scope

This review requests approval of the Sandbox-owned control-plane port, in-process/internal-RPC adapter parity, candidate RPC identity, trusted request context, operation/idempotency semantics, independent Kernel/Sandbox fencing, deadlines/cancellation, bounded event observation, safe errors, version compatibility, discovery, health, resilience, and release evidence.

It does not approve a Proto, SDK, Rust adapter, HTTP route, Provider, Host Broker, Scheduler, Pool, Workspace/Secret mechanism, service identity implementation, configuration, package, deployment, or Kernel source change.

## Findings

| ID | Severity | Finding | Required closure |
| --- | --- | --- | --- |
| SCP-ISSUE-01 | P0 | Kernel has no reviewed cross-process Sandbox service boundary. | Approve one Sandbox-owned port and internal RPC adapter. |
| SCP-ISSUE-02 | P0 | REQ-0021 excludes API/SDK/transport implementation. | Approve a separate requirement without weakening the Workspace Runtime Transaction. |
| SCP-ISSUE-03 | P0 | No service identity, method authorization, trusted context, or credential-rotation contract exists. | Select and prove the internal trust model. |
| SCP-ISSUE-04 | P0 | Transport retry can duplicate allocation or cleanup after an ambiguous result. | Approve durable operation lookup, Sandbox idempotency, fingerprinting, and retry rules. |
| SCP-ISSUE-05 | P0 | Kernel and Sandbox placement records could be conflated at a wire boundary. | Approve opaque correlation with independent leases, fences, and reconcilers. |
| SCP-ISSUE-06 | P0 | No protocol/version compatibility, drain, or rolling-upgrade policy exists. | Approve version negotiation, support window, skew tests, and rollback. |
| SCP-ISSUE-07 | P1 | Streaming needs are not separated. | Limit this contract to bounded operation events and require a separate Terminal Session contract. |
| SCP-ISSUE-08 | P1 | Discovery, health, saturation, deadline, and dependency-loss SLOs are unset. | Assign target values, environments, and operations owners. |

## Decision Matrix

| ID | Candidate decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| SCP-01 | One Sandbox-owned application port. | Transport cannot become a second lifecycle implementation. | Redesign ownership before cloud work. |
| SCP-02 | In-process standalone plus generated internal RPC cloud adapters. | Same semantics across deployment profiles. | Select another reviewed parity model. |
| SCP-03 | L3 internal RPC, private ingress, mTLS/workload identity. | Service-to-service security is explicit. | Cloud control plane remains blocked. |
| SCP-04 | Durable operations and lookup after ambiguous results. | Transport retries cannot blindly repeat side effects. | No retryable cloud mutation. |
| SCP-05 | Independent Kernel and Sandbox placement fences. | Stale authority at either layer fails closed. | Cross-plane composition remains unsafe. |
| SCP-06 | Generated Proto/RPC SDK authority. | Kernel consumes a governed client. | No handwritten fallback is allowed. |
| SCP-07 | Operation-event stream only. | Terminal concerns remain cohesive and separately reviewed. | Define an alternative bounded observation mechanism. |
| SCP-08 | Version fail-close, discovery, drain, rollout, rollback. | Independent deployment becomes supportable. | Keep Sandbox in-process only. |

## Required Evidence Before Ready

- Approved operation vocabulary, messages, metadata, errors, contract version, compatibility window, and package/service identity.
- Accepted Kernel consumer port and credential-handling review with no raw lease or fencing exposure.
- Accepted Sandbox lifecycle, Workspace Runtime Transaction, Service Host, observability, persistence, and required Provider gates.
- Workload identity, mTLS, authorization matrix, certificate rotation/revocation, audit, and threat-model evidence.
- RPC resilience budgets for deadlines, retries, hedging prohibition on mutations, circuit breaking, concurrency, waiters, streams, replay, drain, and shutdown.
- Proto lint/breaking checks, RPC manifest, generated-client evidence, shared in-process/RPC conformance, and no adapter-to-repository/Provider dependency proof.
- Real multi-process tests for duplicate delivery, ambiguous result, stale generation, cancellation, restart, discovery loss, certificate rotation, version skew, slow consumer, saturation, drain, rollback, and safe diagnostics.

## Candidate Static Evidence

`specs/sandbox-internal-control-plane.contract.json` and its focused tests make the candidate boundary reviewable. They keep `implementationAuthorized: false`, forbid Proto/SDK/runtime materialization, and are not transport, security, availability, or commercial evidence.

## Human Outcome

| Reviewer role | Reviewer | Outcome | Date | Decisions |
| --- | --- | --- | --- | --- |
| Sandbox architecture owner | pending | pending | pending | SCP-01..SCP-08 |
| Kernel architecture/runtime owner | pending | pending | pending | SCP-01, SCP-02, SCP-04..SCP-08 |
| API/RPC and SDK owner | pending | pending | pending | SCP-02, SCP-03, SCP-06..SCP-08 |
| Security/privacy owner | pending | pending | pending | SCP-03..SCP-05, SCP-08 |
| Reliability/operations owner | pending | pending | pending | SCP-04, SCP-07, SCP-08 |
| Release/compatibility owner | pending | pending | pending | SCP-06, SCP-08 |

No row is approved. Internal control-plane implementation and cloud Sandbox integration remain **No-Go**.
