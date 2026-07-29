# REVIEW-20260729: Sandbox Firecracker Network Isolation Architecture And Security

Status: pending-human-review

Requirement: [REQ-2026-0014](../../product/requirements/REQ-2026-0014-sandbox-firecracker-network-isolation.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-sandbox-firecracker-network-isolation-and-egress-policy.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: critical - tenant network isolation, cloud metadata and host control-plane denial, privileged host networking, policy authority, audit, cleanup residue and MicroVm readiness.

## Scope

本 Review 请求人工评审 provider-neutral `SandboxNetworkPolicyPort` 与 L4 `SandboxNetworkIsolationPort` 候选命名、`DenyAll`、DNS/Egress Grant、永久拒绝、Binding 独立 netns/Tap、Policy Revision/Fencing、Atomic Apply/Verify、Teardown/Quarantine 和 Telemetry/Audit 边界。

本 Review 不批准 Rust Port/Crate、Firecracker Provider、Host Broker Runtime、netns、Tap、nftables/Firewall、Route、DNS Proxy、Host Command、Config、Service Unit、Deployment Profile、Ingress、Port Forward、Browser Network 或 unrestricted internet access。

## Candidate Contract Evidence

| Evidence | Result |
| --- | --- |
| `specs/sandbox-firecracker-network-isolation.contract.json` | Draft Policy/Mechanism boundary; `implementationAuthorized` is `false` and runtime/netns/firewall/Tap are explicitly forbidden. |
| `tests/contract/sandbox-firecracker-network-isolation.contract.test.mjs` | PASS (8/8); static candidate checks cover ownership, DenyAll, permanent denial, binding isolation, grants, atomic verification, cleanup, telemetry/audit and bounds; not runtime evidence. |
| Complete repository contract suite | `node --test tests/contract/*.test.mjs` PASS (107/107), including Command Execution/Cancel, Firecracker Resource Isolation/Usage, Multi-tenant Scheduling/Capacity, Node Trust/Verified Inventory, and PostgreSQL Quota/Capacity Persistence boundaries. |
| Cargo workspace gates | `cargo fmt --all -- --check`, offline Check/Test and all-target Clippy with `-D warnings` PASS; 41 unit tests passed and the external PostgreSQL test remained explicitly ignored without `SDKWORK_SANDBOX_TEST_DATABASE_URL`. |
| SDKWORK repository gates | Documentation, packages layout, strict component ports, application layering, Rust composition, identity naming, docs-debt, repository baseline and `git diff --check` PASS. |
| `specs/sandbox-provider-delivery-gates.contract.json` | Firecracker Preflight consumes this contract and cannot report Network/MicroVm readiness while it remains draft or unverified. |
| `specs/sandbox-host-isolation-broker.contract.json` | `sandbox_prepare_network` consumes this boundary; Broker remains a non-authoring, typed privileged mechanism. |
| Real Linux KVM evidence | Absent by design; no namespace, Tap, firewall, DNS, egress or cleanup behavior exists. |

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| NET-01 | `SandboxNetworkPolicyPort` owns provider-neutral Policy; L4 `SandboxNetworkIsolationPort` owns mechanism only. | Prevents Provider/Broker policy drift. | Rename/repartition contracts before any export or runtime. |
| NET-02 | Default is `DenyAll`; only explicit DNS and Egress grants are candidates. | Missing policy fails closed. | No Network capability until an equally strict default is approved. |
| NET-03 | Metadata, Host Control Plane and Tenant Lateral destinations are permanently denied and cannot be overridden. | Protects core tenant/host boundary. | Requires a new threat model and security approval; runtime remains blocked. |
| NET-04 | One Network Namespace and Tap per Runtime Binding, never Host Namespace or shared active state. | Provides attributable per-binding isolation. | Define a stronger independent mechanism and repeat KVM review. |
| NET-05 | Grant binds Tenant/Session/Binding/Provider/Fencing/Revision/Fingerprint/Rules/Expiry/Nonce/Signature. | Removes ambient authority and supports revocation. | No network side effect until equivalent authorization exists. |
| NET-06 | Apply is fenced, monotonic, idempotent, atomic and readback/probe verified before Ready. | Prevents stale and partial policy claims. | Provide equivalent effective-state proof. |
| NET-07 | Failure restores DenyAll or quarantines; teardown and residue scan are bounded. | Prevents cross-tenant network residue reuse. | Runtime/Node reuse remains blocked. |
| NET-08 | Destination/Rule/Packet/Host identifiers are excluded from normal telemetry; denial and policy changes are durably audited. | Preserves privacy and incident evidence. | Define equivalent minimization and durable audit. |

## Pre-review Blocking Findings

1. Network Policy Issuer, signing key, revocation, clock and operator change-control authorities are unresolved.
2. Exact metadata/host-control-plane/tenant-lateral address classification and dual-stack update authority are unresolved.
3. DNS resolver/domain normalization, rebinding, redirect, connection tracking, fragment and malformed-packet behavior are unresolved.
4. Host Broker capability allowlist, typed network protocol, persistent fencing/policy journal and atomic firewall backend are unresolved.
5. Cleanup order, residue detector, quarantine scope, Node Drain and incident recovery owners are unresolved.
6. No real Linux KVM functional, security, performance, restart or cross-tenant residue evidence exists.

## Required Evidence Before Ready

- Architecture/Security/Network Platform/Privacy-Audit/KVM Operations owners accept NET-01..NET-08.
- Threat model and address-class authority prove Metadata, Host Control Plane and Tenant Lateral permanent denial for IPv4/IPv6, DNS and redirects.
- Grant/Policy schemas have compatibility, signature, expiry, replay, revocation, revision and bounded-input tests.
- Real Host mechanism proves per-binding netns/Tap, Default Deny, explicit DNS/Egress, Atomic Apply/Readback, Fencing, Restart and Bounded Teardown.
- Fault injection proves Partial Apply returns to DenyAll or Quarantine, and Cross-tenant Residue/Node Reuse gates remain closed on uncertainty.
- Durable denial/policy-change audit and low-cardinality telemetry pass backpressure, redaction and retention review.

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`. `Approved with follow-up` cannot defer Default Deny, permanent denial, Policy Authority, Grant, Fencing, atomic verification, cleanup/quarantine, audit or real KVM evidence.

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | NET-01, NET-04, NET-06 |
| Security owner | pending | pending | pending | NET-02..NET-08 |
| Network platform owner | pending | pending | pending | NET-02..NET-07 |
| Privacy/audit owner | pending | pending | pending | NET-08 |
| KVM operations owner | pending | pending | pending | NET-04, NET-06, NET-07, real KVM evidence |

## Implementation Gate

REQ-2026-0014 remains `draft`, ADR remains `proposed`, and this Review remains `pending-human-review`. Until every required reviewer records `Approved` and blocking authorities are resolved, do not create a public Port/Crate, Provider/Broker Network Runtime, netns, Tap, firewall/rule, route, DNS proxy, runtime path, config, service unit or deployment profile.

## Close-Out Checklist (Reviewer 执行项)

Review Approved 前必须逐项核验：

- [ ] REQ-STATUS: 对应 REQ 处于 `ready` 或 `accepted`
- [ ] ADR-STATUS: 对应 ADR 处于 `accepted`
- [ ] ARCH-REVIEW: 接口契约、命名、Port 边界、L0-L6 分层符合 COMPONENT_SPEC
- [ ] SEC-REVIEW: 数据分类、红字规则、零化清理、Secret 流、并发控制符合 SECURITY_SPEC
- [ ] PERF-REVIEW: 有界 Page/Buffer、低 Cardinality Metric 符合 PERFORMANCE_SPEC
- [ ] OBS-REVIEW: Trace/Audit/Event/Outbox/Meter 符合 OBSERVABILITY_SPEC
- [ ] TEST-EVIDENCE: Unit Test 全量通过；Contract Test 通过
- [ ] DEPENDENCY-DIRECTION: cargo tree 方向正确
- [ ] EVIDENCE-SIGN-OFF: 对应 Verification Review 接受状态非 pending
- [ ] HUMAN-DECISION: Decision Matrix 每条均 Approved 或 Changes + 替代方案

## Exit Gate

1. 全部 Checklist 勾选
2. 所有 Reviewer Role 表决 Approved
3. REQ 进入 `ready`，ADR 进入 `accepted`
4. Gate 0 `implementationAuthorized` 最后一个 Review 通过后可置 true

未经上述门禁，禁止进入 V1 实现阶段。
