# REVIEW-20260730: Sandbox Standalone Data Residency And Recovery

Status: pending-human-review

Requirement: [REQ-2026-0022](../../product/requirements/REQ-2026-0022-sandbox-standalone-data-residency-and-recovery.md)

Decision: [ADR-20260730](../../architecture/decisions/ADR-20260730-sandbox-standalone-data-residency-and-recovery.md)

Owner: SDKWork Runtime Platform

Date: 2026-07-30

Risk: critical - false local-data claim, implicit transfer, authority duplication, unsafe deletion, unrecoverable local data, secret leakage and cross-profile contamination.

## Scope

This review requests approval of the four-repository Local data inventory, candidate residency claim modes, database-role boundaries, runtime-directory separation, outbound transfer controls, backup/restore, export/purge, failure behavior and Local-only Service Host dependency.

It does not approve a database, migration, runtime path, backup target, external model/tool provider, synchronization service, telemetry exporter, API/SDK, installer, production profile or source change outside this repository.

## Current Findings

| ID | Severity | Finding | Required closure |
| --- | --- | --- | --- |
| SDR-ISSUE-01 | P0 | `standalone` is currently used as topology language but does not prove device locality. | Approve a separate evidence-backed claim mode and fail-closed readiness. |
| SDR-ISSUE-02 | P0 | REQ-0021 prevents implicit Workspace upload but does not inventory Agents, Kernel, Sandbox, cache, logs, secrets, temp, Checkpoints or backups. | Approve the complete data-class matrix. |
| SDR-ISSUE-03 | P0 | Agents and Sandbox require PostgreSQL server authority; Kernel also supports SQLite transient persistence. | Approve role-correct local composition without SQLite server fallback. |
| SDR-ISSUE-04 | P0 | No cross-repository release evidence proves local database endpoints, no transfer, OS-user/profile isolation, backup/restore or purge. | Assign real Windows/macOS/Linux environments and evidence owners. |
| SDR-ISSUE-05 | P0 | Local model/tool processing and optional sync could send content off-device while persistence stays local. | Approve separate persistence and strict-processing claims plus explicit grants. |
| SDR-ISSUE-06 | P0 | Uninstall/reset/purge and Workspace ownership are not one operation. | Approve preservation-by-default and scoped confirmed purge behavior. |
| SDR-ISSUE-07 | P1 | Backup inclusion, key handling, restore and derived-copy deletion are not jointly specified. | Approve role-correct encrypted backup and verified restore rules. |
| SDR-ISSUE-08 | P1 | Disk-full/corruption behavior could otherwise trigger data loss or Cloud fallback. | Approve fail-closed local recovery semantics. |

## Decision Matrix

| ID | Proposed decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| SDR-01 | Add a Local-only data-residency Gate. | Local readiness cannot overclaim four-repository locality. | Local commercial claim remains blocked. |
| SDR-02 | Separate persistence and strict-processing claims. | External processing cannot hide behind local storage wording. | Publish no all-data-local claim. |
| SDR-03 | Keep existing data authorities; BirdCoder owns no business tables. | High cohesion and no duplicated truth. | Redesign owners before implementation. |
| SDR-04 | Keep server PostgreSQL and separately declared embedded client-local SQLite. | Standards-compliant physical locality. | Local persistence topology remains unresolved. |
| SDR-05 | Use distinct opened capabilities for every mutable class. | Prevents path derivation and cleanup overlap. | Local Service Host remains blocked. |
| SDR-06 | Deny implicit sync, remote backup and telemetry. | Transfer is user/operator visible and revocable. | No local privacy claim. |
| SDR-07 | Preserve Workspace during cleanup, reset and uninstall by default. | Sandbox cannot erase user-owned source. | Local launch remains blocked. |
| SDR-08 | Require scoped export/purge including derived copies and backups. | Privacy lifecycle is complete and testable. | No deletion-complete claim. |
| SDR-09 | Require local, encrypted, role-correct backup and verified restore. | Recovery evidence is meaningful. | Publish no recovery claim. |
| SDR-10 | Fail closed on locality, capability, corruption, disk-full or purge uncertainty. | No silent Cloud fallback or data loss. | Disable the affected Local capability. |
| SDR-11 | Keep telemetry content-free and opt-in/privacy-safe. | Supportability does not create a hidden copy. | Disable telemetry for Local. |
| SDR-12 | Require real OS and network-capture evidence across all four repositories. | Static contracts cannot masquerade as release evidence. | Commercial Local release remains No-Go. |

## Required Evidence Before Ready

- Approved BirdCoder device-fact inventory showing zero business tables and a reviewed local mount identity lifecycle.
- Approved Agents standalone PostgreSQL topology, local endpoint enforcement, backup/restore, export/purge and no remote dependency evidence.
- Approved Kernel embedded/client-local or service/PostgreSQL role selection, retention, corruption/disk-full and purge evidence.
- Approved Sandbox local PostgreSQL, runtime directory, secret, checkpoint, cleanup and Workspace-preservation evidence.
- Workspace/Drive local-folder authorization, non-transferable capability, Revision and optional synchronization evidence.
- Windows/macOS/Linux OS-user/profile/account negative tests and source-controlled `.sdkwork/` residue scan.
- Network capture proving no implicit Cloud storage, sync, telemetry or strict-mode content egress.
- Role-correct backup/restore exercises and scoped purge/uninstall tests including derived copies and backups.
- Updated capability/assurance/residency product documentation with no claim based only on `standalone` or `local`.

The current BirdCoder REQ-2026-0006, Agents REQ-2026-0730 and Kernel REQ-2026-0002 records remain blocked/draft and pending human review. Their existence is traceability evidence only; none closes the runtime, database, data-residency or release rows above.

## Candidate Static Evidence

`specs/sandbox-standalone-data-residency.contract.json` and its focused tests make the proposed decisions machine-reviewable. They deliberately keep `implementationAuthorized: false` and are not runtime, residency, recovery or deletion evidence.

## Human Outcome

Allowed outcome: `Approved`, `Changes requested`, or `Rejected`. No approval may defer authority ownership, database role, no implicit transfer, Workspace preservation, secret exclusion, restore evidence, purge completeness or fail-closed recovery.

| Reviewer role | Reviewer | Outcome | Date | Decisions |
| --- | --- | --- | --- | --- |
| Product/privacy claim owner | pending | pending | pending | SDR-01, SDR-02, SDR-12 |
| Security/privacy owner | pending | pending | pending | SDR-02, SDR-05..SDR-12 |
| BirdCoder owner | pending | pending | pending | SDR-03, SDR-05..SDR-08, SDR-11 |
| Agents/database owner | pending | pending | pending | SDR-03, SDR-04, SDR-08..SDR-10 |
| Kernel owner | pending | pending | pending | SDR-03, SDR-04, SDR-08..SDR-10 |
| Sandbox owner | pending | pending | pending | SDR-03..SDR-11 |
| Workspace/Drive owner | pending | pending | pending | SDR-03, SDR-05..SDR-09 |
| Local operations/reliability owner | pending | pending | pending | SDR-04..SDR-12 |

No row is approved. Local commercial data-residency and recovery remain **No-Go**.
