# REVIEW-20260729: Sandbox Host Isolation Broker Architecture And Security

Status: pending-human-review

Requirement: [REQ-2026-0011](../../product/requirements/REQ-2026-0011-sandbox-host-isolation-broker.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-sandbox-host-isolation-broker-boundary.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: critical - privileged host operations, local IPC authentication, grant authority, fencing, Jailer/cgroup/netns/device ownership, audit, packaging, upgrade and rollback.

## Scope

本 Review 请求人工评审 `SandboxHostIsolationBroker` 的公共候选命名、固定 Operation、Unix Domain Socket、Peer Identity、短期 Grant、Privilege Profile、Fencing/Idempotency、Opaque Reference、Readiness、Audit、Cleanup 与 Supply-chain/Operations 边界。Workspace、Network 和 Resource 操作分别只执行 REQ-2026-0013/0014/0015 已授权的 L4 机制。Broker 不拥有 Workspace/Storage/KMS、Network Policy、Quota/Capacity Policy、Usage Aggregation 或 Commerce Billing。

本 Review 不批准 Broker crate/daemon、特权 Host IO、Firecracker/Jailer/cgroup/netns/Device 实现、service unit、Config、Secret/KMS、API/SDK、Node Enrollment、Scheduler 或 Deployment Profile。

## Candidate Contract Evidence

| Evidence | Result |
| --- | --- |
| `specs/sandbox-host-isolation-broker.contract.json` | Draft typed boundary fixes eight operations, Grant/transport/privilege/fencing/readiness/audit/bounds and forbidden input/output contracts; `implementationAuthorized` is `false`. |
| `tests/contract/sandbox-host-isolation-broker.contract.test.mjs` | PASS (6/6); static candidate verification only, not runtime or privilege evidence. |
| Complete repository contract suite | `node --test tests/contract/*.test.mjs` PASS (104/104), including Provider, Command, Artifact, Workspace, Network, Resource/Usage, Scheduling/Capacity, Node Trust/Verified Inventory, PostgreSQL Quota/Capacity Persistence, Observability, Service Host, and lifecycle persistence boundaries. |
| Cargo and SDKWORK repository gates | Workspace Format/Check/Test/Clippy plus Documentation, Packages Layout, strict Component Ports, Layering, Rust Composition, Naming, Docs-debt, Baseline and Diff checks PASS. |
| Firecracker Provider Review | FC-03/FC-04/FC-05/FC-08/FC-09 consume this candidate boundary but remain pending. |
| REQ-2026-0013 Workspace Block Device Review | Defines the draft authorized opaque Attachment Reference, encryption/fencing/sanitization/residue boundary consumed by `sandbox_attach_workspace_device`; it remains unimplemented and pending. |
| REQ-2026-0014 Firecracker Network Isolation Review | Defines the draft signed Policy Grant, DenyAll/permanent denial, fencing/revision, atomic verification, cleanup/residue boundary consumed by `sandbox_prepare_network`; it remains unimplemented and pending. |
| REQ-2026-0015 Firecracker Resource Isolation Review | Defines the draft signed Limit Grant, Machine Config/cgroup v2, fencing/readback, usage fact, cleanup/residue boundary consumed by `sandbox_apply_resource_limits`; it remains unimplemented and pending. |
| Runtime implementation evidence | Absent by design; no Broker crate, daemon, socket, service unit or privileged operation exists. |

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| BROKER-01 | Public candidate names are `SandboxHostIsolationBroker`, `SandboxHostIsolationRequest/Result/Error/Grant`; future component candidate is `sdkwork-sandbox-host-isolation-broker`. | Enables one reviewable typed boundary. | Rename REQ/ADR/contract before creating a crate or export. |
| BROKER-02 | Exactly eight fixed operations; no arbitrary Shell/Executable/Host Path/Device/Environment. | Broker remains capability-specific. | Provide an equally restrictive operation model and repeat threat review. |
| BROKER-03 | Linux Unix Domain Socket only, with ACL, peer credential, client executable identity and protocol negotiation; no TCP/HTTP/RPC. | Keeps privilege Node-local and strongly authenticated. | Define and approve a stricter local transport. |
| BROKER-04 | Short-lived signed Grant binds audience, binding, provider, action, policy, fingerprint, nonce and expiry with revocation/replay checks. | Each privileged action has explicit authority. | No privileged implementation until equivalent authorization is approved. |
| BROKER-05 | Dedicated Host Service with declared capability allowlist/hardening; Adapter/VMM non-root; no ambient capability, Docker socket or cloud credential. | Limits blast radius and false MicroVm assurance. | Submit a new privilege model and security evidence. |
| BROKER-06 | Broker enforces highest fencing token and idempotency at the side-effect boundary while Provider remains business Fencing Authority. | Stale/replayed controllers cannot mutate Host state. | Define an equivalent execution-point concurrency control. |
| BROKER-07 | Host Path/Socket/Tap/cgroup/Device/microVM identities stay private; public result uses protected opaque reference only. | Preserves tenant and Host metadata isolation. | Provide equivalent redaction and capability proof. |
| BROKER-08 | Readiness requires Protocol/Peer/Grant/Privilege/Runtime/Fencing/Audit/Cleanup; Degraded never authorizes effects. | Missing controls fail closed. | Define a stricter readiness authority. |
| BROKER-09 | Every side effect emits durable audit, every denial emits security fact, all with Server-owned Trace. | Privileged operations are attributable and incident-ready. | No implementation until durable equivalent exists. |
| BROKER-10 | Broker owns no business policy, API/SDK, Scheduler, Node Enrollment, Secret/KMS, billing or deployment profile. | Keeps high cohesion and narrow privilege. | Update ownership ADRs and repeat cross-component review. |

## Pre-review Blocking Findings

1. Grant Issuer/Key/Revocation/Clock Authority and exact cryptographic algorithm are unresolved; Secret/KMS implementation cannot be hidden inside Broker.
2. Exact Linux capability allowlist, systemd/service hardening, Runtime Directory ACL, Jailer UID/GID and `/dev/kvm` permission model are unresolved; Workspace, Network and Resource privilege must derive from approved REQ-2026-0013/0014/0015 operations rather than broad device/path/interface/firewall/cgroup access.
3. Fencing Journal storage, crash consistency, corruption recovery and cleanup reconciliation authority are unresolved.
4. Protocol serialization/versioning crate, maximum compatible versions, client binary identity verification and rolling upgrade sequence are unresolved.
5. Package signing, SBOM, provenance, checksum, vulnerability response, install/upgrade/rollback and Node Drain owners are unresolved.
6. No real Linux KVM node or security fault-injection evidence exists in the current Windows workspace.

## Required Evidence Before Ready

- Architecture/Security/Platform Operations/Workspace/Audit/Supply-chain/Release owners accept BROKER-01..BROKER-10.
- Threat Model and privilege/capability diff identify every syscall, file, device, namespace and credential the Broker can access.
- Typed protocol and Grant schema have compatibility, spoofing, expiry, replay, revocation, tamper and bounded-message tests.
- Durable fencing/idempotency journal has atomicity, restart, corruption and stale-controller evidence.
- Package/service hardening, install/upgrade/rollback, SBOM/provenance/checksum/advisory and Node Drain runbooks exist.
- Real Linux KVM integration proves non-root VMM, Jailer/cgroup/netns/workspace-device setup, cleanup and cross-tenant residue isolation.

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`. `Approved with follow-up` cannot defer authentication, Grant, privilege, Fencing, Audit, Cleanup, Supply-chain or real KVM evidence.

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | BROKER-01, BROKER-02, BROKER-06, BROKER-10 |
| Security owner | pending | pending | pending | BROKER-02..BROKER-09 |
| Platform/KVM operations owner | pending | pending | pending | BROKER-03, BROKER-05, BROKER-08, package/service ownership |
| Workspace/data owner | pending | pending | pending | BROKER-07, workspace device and residue |
| Audit/privacy owner | pending | pending | pending | BROKER-07, BROKER-09 |
| Supply-chain/release owner | pending | pending | pending | binary identity, artifacts, install/upgrade/rollback |

## Implementation Gate

REQ-2026-0011 remains `draft`, ADR remains `proposed`, and this Review remains `pending-human-review`. Until every required reviewer records `Approved` and the blocking authorities are resolved, do not create the Broker component, public port, daemon, socket, config key, service unit, privileged Host operation or deployment profile.
