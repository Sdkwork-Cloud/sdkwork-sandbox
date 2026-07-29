# REVIEW-20260729: Sandbox Workspace Block Device Attachment And Sanitization

Status: pending-human-review

Requirement: [REQ-2026-0013](../../product/requirements/REQ-2026-0013-sandbox-workspace-block-device-attachment-and-sanitization.md)

Decision: [ADR-20260729](../../architecture/decisions/ADR-20260729-sandbox-workspace-block-device-attachment-and-sanitization.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-29

Risk: critical - tenant Workspace data, storage ownership, encryption keys, privileged device attachment, destructive cleanup, residue isolation and MicroVm readiness.

## Scope

本 Review 请求人工评审 provider-neutral `SandboxWorkspaceAttachmentPort` Composition 边界、L4 `SandboxWorkspaceBlockDevicePort` 机制候选命名、Agents/Kernel/Sandbox/Drive-or-Storage/Host Broker/Firecracker Ownership、Grant、Revision、Fencing、Guest Device、At-rest Protection、Readiness、Detach/Sanitization、Residue Scan、Quarantine、Audit 和 Recovery。

本 Review 不批准真实 Storage/Drive/Volume Adapter、Device/Mapper/Mount、Filesystem、KMS/Key、Host Privilege、Firecracker Runtime、Config、Service Unit、API/SDK、Snapshot/Restore 或 Deployment Profile。

## Candidate Contract Evidence

| Evidence | Result |
| --- | --- |
| `specs/sandbox-workspace-block-device-attachment.contract.json` | Draft typed operations, ownership, grant, fencing, device, encryption, readiness, sanitization, quarantine, audit and bounds; `implementationAuthorized` is `false`. |
| `node --test tests/contract/sandbox-workspace-block-device-attachment.contract.test.mjs` | PASS (7/7); static candidate verification only, not Storage, KMS, Device, Sanitization, Residue or KVM evidence. |
| REQ-2026-0004 Workspace boundary | Opaque identity, Kernel mapping, Provider request propagation, fail-closed attached readiness and dependency direction already have candidate evidence. |
| Host Isolation Broker / Firecracker gates | Consume only an authorized opaque Attachment Reference; both remain draft and unimplemented. |
| Service Host integration | Gate 0 machine contract continues to inject only provider-neutral `SandboxWorkspaceAttachmentPort`; L4 Block Device mechanism remains behind that port. |
| Complete repository contract suite | `node --test tests/contract/*.test.mjs` PASS (104/104), including Firecracker Network/Resource Isolation, Multi-tenant Scheduling/Capacity, Node Trust/Verified Inventory, and PostgreSQL Quota/Capacity Persistence boundaries. |
| Cargo and SDKWORK repository gates | Workspace Format/Check/Test/Clippy plus Documentation, Packages Layout, strict Component Ports, Layering, Rust Composition, Naming, Docs-debt, Baseline and Diff checks PASS after final Workspace integration; 37 Rust tests pass and the one explicitly external PostgreSQL fixture remains ignored without its test database variable. |
| Runtime evidence | Absent by design; no Attachment Port/Adapter, Storage Backend, KMS, Device, Guest Mount or Sanitization exists. |

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| WORKSPACE-01 | Service Host only injects provider-neutral `SandboxWorkspaceAttachmentPort`; the L4 mechanism candidate uses `SandboxWorkspaceBlockDevice*` and five typed operations. | Preserves provider-neutral composition and one reviewable Firecracker mechanism. | Rename/restructure REQ/ADR/contract before implementation. |
| WORKSPACE-02 | Agents owns Workspace business lifecycle; Drive owns applicable file/object storage; Sandbox owns only Runtime Projection; future Block-volume needs independent authority. | Prevents duplicate Workspace and storage systems. | Update cross-repository/data ADRs before implementation. |
| WORKSPACE-03 | Short-lived Grant binds Tenant, Workspace Revision, Session/Binding, Provider, Fencing, Mode, Capacity, Fingerprint and Expiry. | Makes each attachment explicitly authorized. | No real attach until equivalent authority is approved. |
| WORKSPACE-04 | Firecracker consumes a distinct Guest Block Device; direct Host Directory and cross-tenant active sharing are forbidden. | Narrows Host/Mount/TOCTOU exposure. | Provide a stricter reviewed mechanism. |
| WORKSPACE-05 | Mount Mode, Filesystem Options, Capacity and Guest Acknowledgement are allowlisted and verified before Attached. | Prevents capability escalation and false readiness. | No Workspace readiness claim. |
| WORKSPACE-06 | At-rest Encryption uses external scoped Key Reference; raw key is never public/persisted/logged and memory is zeroized. | Separates KMS from Sandbox and protects tenant data. | No production attachment until equivalent protection is approved. |
| WORKSPACE-07 | Fencing/Idempotency execute at every side-effect boundary and survive restart. | Prevents stale or duplicate device mutation. | No real Provider lifecycle. |
| WORKSPACE-08 | Detach/Sanitize clears only Runtime Projection/Ephemeral Data and never deletes Persistent Agents Workspace. | Preserves data ownership and prevents destructive coupling. | Update ownership model and repeat data review. |
| WORKSPACE-09 | Residue failure/unknown quarantines Attachment/Device/Node and blocks reuse. | Prevents cross-tenant residual exposure. | No pool or commercial multi-tenant use. |
| WORKSPACE-10 | Workspace Readiness is necessary but not sufficient for `MicroVm`; real KVM and isolation evidence remains mandatory. | Prevents false assurance. | Firecracker cannot be released. |

## Pre-review Blocking Findings

1. Agents Authorization/Revision Proof and exact Grant Issuer/Signature/Revocation/Clock Authority are unresolved.
2. Actual Workspace backing model and owner are unresolved. Drive is mandatory for SDKWork file/object storage; no independent Block-volume Requirement/ADR exists.
3. Filesystem, Guest Driver, ReadOnly/ReadWrite Policy, Capacity/IO Limits, Integrity/Repair and Crash Consistency are unresolved.
4. Encryption algorithm/mode, Key Scope, KMS/Key Reference, Unwrap, Rotation, Revocation, Memory Lock/Zeroization and Cryptographic Erase owner are unresolved.
5. Host Isolation Broker Device Operation, Runtime Directory ACL, Device Mapper/Loop/Volume permission and safe file-descriptor handoff are unresolved.
6. Persistent Workspace Retention/Deletion, Ephemeral Overlay/Cache/Temp cleanup, Residue definition, Scan method, Quarantine capacity and reconciliation owner are unresolved.
7. No real Storage, Key, Linux KVM Guest Device, Crash/Restart, Sanitization fault-injection or cross-tenant residue evidence exists.

## Required Evidence Before Ready

- Architecture/Security/Privacy/Agents/Kernel/Drive-or-Storage/KMS/KVM Operations owners accept WORKSPACE-01..WORKSPACE-10.
- Agents Authorization/Revision Proof and Attachment Grant schema pass spoofing, expiry, replay, revocation, stale revision and wrong Tenant/Session/Provider tests.
- Drive or approved Block-volume authority, retention/deletion, capacity/IO, filesystem/integrity and error ownership are explicit and machine verifiable.
- Encryption/Key lifecycle and zeroization tests pass without raw key, credential, Host Path, Device Path, Bucket/Object or Presigned URL leakage.
- Host/Guest Attach/Detach and Sanitization pass crash/restart/stale-fencing, ReadOnly escalation, Mount/Path/Link/TOCTOU and cleanup fault injection.
- Real Linux KVM evidence proves Guest IO, Residue Scan, failed-cleanup Quarantine and no cross-tenant Device/Node reuse.

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`. `Approved with follow-up` cannot defer Workspace/Storage ownership, authorization, Revision, Fencing, Encryption/Key protection, Persistent Data preservation, Residue, Quarantine or real KVM evidence.

| Reviewer role | Reviewer | Outcome | Date | Decision IDs / findings |
| --- | --- | --- | --- | --- |
| Architecture owner | pending | pending | pending | WORKSPACE-01..WORKSPACE-10 |
| Agents/Kernel owner | pending | pending | pending | WORKSPACE-02, WORKSPACE-03, WORKSPACE-07, WORKSPACE-08 |
| Security/KMS owner | pending | pending | pending | WORKSPACE-03..WORKSPACE-09 |
| Privacy/data owner | pending | pending | pending | WORKSPACE-02, WORKSPACE-06, WORKSPACE-08, WORKSPACE-09 |
| Drive/storage owner | pending | pending | pending | WORKSPACE-02, WORKSPACE-04..WORKSPACE-09 |
| Linux KVM operations owner | pending | pending | pending | WORKSPACE-04..WORKSPACE-10, real node evidence |

## Implementation Gate

REQ-2026-0013 remains `draft`, ADR remains `proposed`, and this Review remains `pending-human-review`. Until every required reviewer records `Approved` and blocking authorities are resolved, do not create the Port/Adapter/Storage Backend, resolve a real Workspace path/device, add KMS/Key code, perform privileged mount/device operations, create runtime config, or claim Workspace Attached, Sanitized, residue-free or `MicroVm` ready.
