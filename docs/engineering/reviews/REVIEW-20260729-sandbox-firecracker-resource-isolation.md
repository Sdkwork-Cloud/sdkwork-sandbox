# REVIEW-20260729: Sandbox Firecracker Resource Isolation Architecture And Security

Status: pending-human-review

Requirement: [REQ-2026-0015](../../product/requirements/REQ-2026-0015-sandbox-firecracker-resource-isolation-and-usage.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-sandbox-firecracker-resource-isolation-and-usage-facts.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: critical - tenant quota authority, host resource isolation, OOM/PID/IO behavior, privileged cgroup operations, usage accuracy, Commerce handoff and MicroVm readiness.

## Scope

本 Review 请求人工评审 provider-neutral `SandboxResourcePolicyPort`、L4 `SandboxResourceIsolationPort`、`SandboxResourceLimitGrant`、`SandboxResourceUsageFact`、Firecracker Machine Config/cgroup v2 双重执行、Fencing/Readback、typed Limit Outcome、Final Usage、Cleanup/Quarantine 和 Commerce Ownership。

本 Review 不批准 Rust Port/Crate、Quota/Admission/Scheduler Engine、Host Broker Runtime、cgroup、Machine Config、Usage Collector/Aggregator、Commerce Adapter、Config、Service Unit、Deployment Profile、Live Resize、Overcommit、GPU 或 Docker Provider。

## Candidate Contract Evidence

| Evidence | Result |
| --- | --- |
| `specs/sandbox-firecracker-resource-isolation.contract.json` | Draft Policy/Mechanism/Usage boundary; implementation and cgroup/quota/billing runtimes are explicitly unauthorized. |
| `node --test tests/contract/sandbox-firecracker-resource-isolation.contract.test.mjs` | PASS (10/10); static candidate checks cover ownership, finite limits, cgroup v2, machine shape, controllers, fencing, usage facts, cleanup, telemetry/audit and bounds; not runtime evidence. |
| `specs/sandbox-multi-tenant-scheduling.contract.json` | Draft Admission/Capacity authority supplies the Admission Grant and confirmed PostgreSQL Capacity Reservation identity/fingerprint required by the Resource Limit Grant; no runtime exists. |
| `node --test tests/contract/*.test.mjs` | PASS (104/104) for the complete repository contract suite, including the integrated Provider, Broker, Workspace, Network, Observability, Resource/Usage, Multi-tenant Scheduling/Capacity, Node Trust/Verified Inventory, and PostgreSQL Quota/Capacity Persistence boundaries. |
| `cargo fmt --all -- --check` / `cargo check --workspace --offline` / `cargo clippy --workspace --all-targets --offline -- -D warnings` | PASS; formatting, compilation and all-target linting are clean. |
| `cargo test --workspace --offline` | PASS (37 passed, 1 PostgreSQL external-integration test ignored by its declared environment gate). |
| SDKWork repository validators | PASS: documentation standard, packages layout, strict component ports, application layering, Rust backend composition, identity naming, documentation debt and repository baseline. |
| `git diff --check` | PASS; no whitespace errors. |
| `specs/sandbox-provider-delivery-gates.contract.json` | Firecracker Preflight consumes this contract and cannot report Resource/MicroVm readiness while it remains draft or unverified. |
| `specs/sandbox-host-isolation-broker.contract.json` | `sandbox_apply_resource_limits` consumes this boundary; Broker remains a non-authoring typed privileged mechanism. |
| Real Linux KVM/cgroup and Commerce evidence | Absent by design; no cgroup, quota, measurement, durable usage or billing behavior exists. |

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| RESOURCE-01 | `SandboxResourcePolicyPort` owns provider-neutral Policy; L4 `SandboxResourceIsolationPort` owns mechanism/measurement only. | Prevents Provider/Broker quota drift. | Rename/repartition before any export or runtime. |
| RESOURCE-02 | Grant is signed, fenced, revision-bound, finite, ceiling-checked and capacity-reserved. | Removes ambient/unbounded authority. | No resource side effect until equivalent authorization exists. |
| RESOURCE-03 | Firecracker Guest Shape and per-binding cgroup v2 CPU/Memory/PID/IO are jointly verified. | Provides Guest/Host effective isolation evidence. | Define a stronger mechanism and repeat KVM review. |
| RESOURCE-04 | No cgroup v1/hybrid/path/process escape; workload starts only after membership and Effective Value verification. | Prevents transient or persistent unbounded execution. | Runtime remains blocked. |
| RESOURCE-05 | Limit Breach maps to typed Outcome; Host OOM, silent semantic change and retry storms are forbidden. | Preserves predictable runtime semantics. | Provide equivalent failure contract. |
| RESOURCE-06 | `SandboxResourceUsageFact` is immutable, sequenced, final-sampled and durably handed off. | Supports auditable aggregation and correction. | Usage cannot feed commercial metering. |
| RESOURCE-07 | Sandbox/metrics do not own Price/Invoice/Payment; approved Commerce consumer owns billing interpretation. | Avoids duplicate commerce authority. | Cross-domain ownership must be redesigned and re-reviewed. |
| RESOURCE-08 | Cleanup verifies empty scope and final usage; uncertainty quarantines Binding/Node. | Prevents tenant residue and usage contamination. | Node reuse remains blocked. |

## Pre-review Blocking Findings

1. REQ-2026-0016 已形成 draft Admission/Scheduler/Capacity Gate；Quota/Entitlement Policy Issuer、signature、revocation、clock、override、PostgreSQL Reservation Schema/Transaction 和真实并发 authority 仍未获批或物化。
2. Supported vCPU/Memory shapes, VMM overhead, Controller parameter bounds, Swap/OOM and Device Role resolution are unresolved.
3. Broker cgroup capability/delegation, Scope creation, process attachment, journal atomicity, upgrade/rollback and Node Drain are unresolved.
4. Usage sampling, counter reset/correction, durable handoff, retention, aggregation and Commerce consumer contract are unresolved.
5. No real Linux KVM CPU/Memory/PID/IO stress, escape, restart, cleanup, performance or cross-tenant residue evidence exists.
6. No end-to-end Usage Fact reconciliation against a Commerce metering test consumer exists.

## Required Evidence Before Ready

- Architecture/Security/Capacity-Quota/Commerce-Metering/Observability-Audit/KVM Operations owners accept RESOURCE-01..RESOURCE-08.
- 接受 REQ-2026-0016 SCHED-01..SCHED-10，并以真实 PostgreSQL、多副本与 Node Inventory 证据证明 Admission/Reservation-before-Allocate、Limit-not-above-Reservation、Fairness、Fencing 和 Recovery。
- Threat and capacity model defines Tenant/Platform Ceiling, Node Reservation, VMM Overhead, Host Stability and denial behavior.
- Grant/Policy schemas pass signature, expiry, replay, revocation, fencing, revision, ceiling, reservation-race and bounded-input tests.
- Real Host mechanism proves cgroup v2 Controller/Delegation, per-binding Membership, CPU/Memory/PID/IO Effective Value, Partial Apply rollback and bounded release.
- Usage pipeline proves monotonic Sequence, no same-binding reset, Final Fact, idempotent durable handoff, retention/correction and Commerce reconciliation without using metrics as truth.
- Fault injection proves OOM/PID/IO/Restart/Cleanup failures produce typed outcomes and Quarantine uncertain resources.

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`. `Approved with follow-up` cannot defer Policy/Ceiling/Reservation, cgroup/Machine Config, Fencing, typed outcomes, Usage Fact durability, Commerce ownership, cleanup/quarantine or real KVM evidence.

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | RESOURCE-01, RESOURCE-03, RESOURCE-07 |
| Security owner | pending | pending | pending | RESOURCE-02..RESOURCE-05, RESOURCE-08 |
| Capacity/quota owner | pending | pending | pending | RESOURCE-02, RESOURCE-03, RESOURCE-05 |
| Commerce metering owner | pending | pending | pending | RESOURCE-06, RESOURCE-07 |
| Observability/audit owner | pending | pending | pending | RESOURCE-05, RESOURCE-06, RESOURCE-08 |
| KVM operations owner | pending | pending | pending | RESOURCE-03..RESOURCE-05, RESOURCE-08 |

## Implementation Gate

REQ-2026-0015 remains `draft`, ADR remains `proposed`, and this Review remains `pending-human-review`. Until every required reviewer records `Approved` and blocking authorities are resolved, do not create a public Port/Crate, Quota/Admission Engine, Provider/Broker Resource Runtime, cgroup Scope, Machine Config integration, Usage Collector/Aggregator, Commerce Adapter, runtime path, config, service unit or deployment profile.
