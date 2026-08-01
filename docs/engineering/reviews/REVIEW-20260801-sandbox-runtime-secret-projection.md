# REVIEW-20260801: Sandbox Runtime Secret Projection

Status: pending-human-review

Outcome: No-Go

Requirement: [REQ-2026-0025](../../product/requirements/REQ-2026-0025-sandbox-runtime-secret-projection.md)

Decision: [ADR-20260801](../../architecture/decisions/ADR-20260801-sandbox-runtime-secret-projection.md)

Owner: SDKWork Runtime Platform

Date: 2026-08-01

Risk: critical - raw credential propagation, grant replay, cross-Tenant/lane/region reuse, process inheritance, Checkpoint capture, pool residue, slow revocation, misleading exfiltration claims, and incomplete cleanup.

## Scope

This review requests approval of authority ownership, opaque-grant binding, Local/Cloud separation, target modes, workload identity, lifecycle/fencing, atomic materialization, rotation/revocation/outage, Checkpoint/pool ordering, audit/redaction and evidence.

It does not approve public names, a Secret Manager/KMS/Keychain, value transport, process injection, Host Broker/guest-agent operations, persistence, RPC/API/SDK, Service Host, config, Provider, deployment, or cross-repository implementation.

## Findings

| ID | Severity | Finding | Required closure |
| --- | --- | --- | --- |
| RSP-ISSUE-01 | P0 | No named owner currently authorizes and mints an execution-scoped Secret grant. | Approve Agents/IAM/Secret Authority/Kernel/Sandbox ownership and selected Local/Cloud Authorities. |
| RSP-ISSUE-02 | P0 | Raw values or opaque grants could enter cross-repository requests and durable records. | Approve value-free public contracts and non-persistent credential-grade grant handling. |
| RSP-ISSUE-03 | P0 | Target path/name and environment inheritance can widen access outside the intended process. | Approve immutable logical target registry, target modes and environment exception policy. |
| RSP-ISSUE-04 | P0 | Rotation, revocation, expiry and Authority outage have no bounded execution response. | Approve immutable versions, generations, TTL/detection/drain/cleanup budgets and fail-closed outage behavior. |
| RSP-ISSUE-05 | P0 | Workspace Checkpoint, Snapshot and Runtime Pool may retain Secret material. | Approve projection-root exclusion, teardown-before-checkpoint and no Secret-exposed Warm reuse. |
| RSP-ISSUE-06 | P0 | Local values could be silently transferred to Cloud or Cloud values resolved cross-region. | Approve strict lane/device/region binding with no synchronization or fallback. |
| RSP-ISSUE-07 | P0 | Logs/output redaction can be overstated as exfiltration prevention. | Approve the scoped claim and require defense-in-depth output/network policy without an absolute guarantee. |
| RSP-ISSUE-08 | P1 | Exact grant, operation, overlap, concurrency, cache, revocation and cleanup budgets are unset. | Assign Security, Secret Authority, Privacy, Capacity, Reliability and Operations values. |

## Decision Matrix

| ID | Candidate decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| RSP-01 | Use an opaque post-placement grant; no public Secret value. | Higher layers and durable control-plane state remain value-free. | Credentialed execution stays disabled. |
| RSP-02 | Split Secret custody from Sandbox projection. | Each component remains cohesive and replaceable. | Redesign authority ownership. |
| RSP-03 | Use immutable logical targets and explicit modes. | Callers cannot select Host/Workspace paths or ambient scope. | No safe projection target. |
| RSP-04 | Bind grant to exact Runtime/fence/audience/lane/region. | Replay and cross-scope use fail closed. | No projection. |
| RSP-05 | Teardown before Checkpoint and destroy exposed microVMs. | Shared-pool and snapshot residue risk is bounded. | Disable Secret use in pooled Cloud Runtimes. |
| RSP-06 | No Local/Cloud synchronization or cross-region fallback. | Residency claims remain honest. | Publish no Local or region-bound Secret claim. |
| RSP-07 | Scope the security claim to platform-managed handling. | Product evidence remains defensible. | Secret projection cannot be commercially claimed. |

## Required Evidence Before Ready

- Named approved Local and Cloud Secret Authorities, custody/key model, workload identity, grant verification and regional availability design.
- Approved public/non-public naming and exact grant/operation/rotation/revocation/cleanup/concurrency budgets.
- Accepted Local Host, Firecracker, Node Trust, Workspace Runtime Transaction, Runtime Pool, control-plane, Command/Terminal, observability and data-residency dependencies.
- Real Windows/Linux/macOS Local and Linux KVM/Firecracker projection, permissions, identity, rotation, revocation, expiry, outage and crash evidence.
- Checkpoint/Snapshot exclusion, core/crash/support exclusion, Secret-exposed microVM destruction, lower-level sanitization, residue and quarantine evidence.
- Cross-Tenant, Workspace, Binding, fence, device, lane, region, audience, target and grant replay negative tests.
- Audit correlation, known-value redaction, terminal/command output privacy, support diagnostics and incident drill evidence.
- Cross-repository proof that BirdCoder, Agents, Kernel and Sandbox durable control-plane records never observe values or persist raw grants.

## Current Outcome

No-Go. The Gate 0 candidate is reviewable, but no approved Secret Authority, exact budget, projection implementation, real environment, revocation drill or cross-repository evidence exists. Static contract tests only prove that implementation remains disabled and the candidate boundaries are internally consistent.

## Human Approval Required

- SDKWork Product/BirdCoder and Agents execution-intent owners
- SDKWork IAM and Secret/KMS Authority owners
- SDKWork Sandbox and Kernel architecture owners
- SDKWork Local Platform, Firecracker, Node/Guest Agent and Runtime Pool owners
- SDKWork Security, Privacy, Reliability, Capacity and Operations owners
