# REVIEW-20260801: Sandbox Cloud Data Residency And Recovery

Status: pending-human-review

Outcome: No-Go

Requirement: [REQ-2026-0026](../../product/requirements/REQ-2026-0026-sandbox-cloud-data-residency-and-recovery.md)

Decision: [ADR-20260801](../../architecture/decisions/ADR-20260801-sandbox-cloud-data-residency-and-recovery.md)

Owner: SDKWork Runtime Platform

Date: 2026-08-01

Risk: critical - false residency claims, cross-region disclosure, stale Checkpoint promotion, incomplete deletion, backup without restore, tenant residue, Secret capture and unbounded recovery load.

## Scope

This review requests approval of the Cloud data inventory, region tuple, authority split, replication/failover, retention/export/delete, backup/PITR/restore, tenant isolation, Checkpoint/Revision ordering, Secret exclusion, support access and recovery evidence.

It does not approve a region, storage provider, replication controller, backup worker, restore/purge implementation, database migration, API/SDK, config, deployment, Provider, Service Host, Kernel, Agents or BirdCoder source change.

## Findings

| ID | Severity | Finding | Required closure |
| --- | --- | --- | --- |
| CDR-ISSUE-01 | P0 | Cloud has no single approved data-residency and recovery claim across Workspace, Checkpoint, output, log, cache and backup classes. | Approve the complete inventory and claim scope. |
| CDR-ISSUE-02 | P0 | `regionCode`, `providerRegion`, `storageRegion` and availability zone can be conflated. | Approve the four-layer residency tuple and registry ownership. |
| CDR-ISSUE-03 | P0 | Workspace/Checkpoint authority is separate from Sandbox, but restore ordering and promotion are undefined. | Approve Agents/Drive authority and fresh runtime/fencing recovery order. |
| CDR-ISSUE-04 | P0 | Cross-region replication/failover can bypass Tenant policy and deletion linkage. | Approve explicit DR grants, destination allowlists, encryption context and tombstones. |
| CDR-ISSUE-05 | P0 | Backups, PITR and restore are not evidence without isolated verified drills. | Assign Database/Drive recovery owners and real environments. |
| CDR-ISSUE-06 | P0 | Export/delete may omit derived, replica, cache, log or support copies. | Approve class-complete resumable purge and export inventories. |
| CDR-ISSUE-07 | P0 | Secret projection and runtime images can leak into snapshots or backups. | Enforce REQ-2026-0025 exclusion and fresh grant recovery. |
| CDR-ISSUE-08 | P1 | Exact retention, RPO/RTO, lag, concurrency and recovery budgets are unset. | Assign Product, Privacy, Storage, Database, Reliability and Operations values. |

## Decision Matrix

| ID | Candidate decision | Accept effect | Reject effect |
| --- | --- | --- | --- |
| CDR-01 | Use a complete data-class inventory and four-layer region tuple. | Claims map to actual storage and processing. | Publish no Cloud residency claim. |
| CDR-02 | Keep Agents/Drive Workspace authority and Sandbox runtime authority separate. | Recovery does not duplicate business truth. | Redesign ownership before implementation. |
| CDR-03 | Require explicit cross-region DR policy and deletion linkage. | Failover is auditable and residency-aware. | No cross-region recovery offer. |
| CDR-04 | Restore data before allocating fresh runtime/fencing. | Stale bindings cannot resume unknown data. | Disable automated runtime recovery. |
| CDR-05 | Require backup plus isolated verified restore. | RPO/RTO claims have evidence. | Backups remain operational convenience only. |
| CDR-06 | Purge primary, derived, replica and backup copies with legal hold. | Deletion claims are complete and auditable. | No customer deletion SLA. |

## Required Evidence Before Ready

- Approved region registry, residency tuple, Tenant policy, processing allowlist and cross-region DR policy.
- Complete data-class matrix with owners, classification, storage, key, retention, export/delete, backup and recovery fields.
- Real PostgreSQL base/WAL/PITR and Drive/Volume backup/restore evidence, isolated target, checksum, role and no-plaintext checks.
- Region outage, replica lag, corruption, control-plane restart, node loss, stale revision/checkpoint and fresh fencing recovery drills.
- Cross-Tenant restore/export/cache/log/backup isolation and residue tests.
- Class-complete export/purge with legal hold, failure, retry, tombstone, replica and backup handling.
- Secret projection exclusion, runtime-image separation, no raw grant/value persistence and fresh grant recovery evidence.
- Support bundle, operator access, audit, low-cardinality metrics and incident communication evidence.
- Approved exact retention, backup frequency, lag, RPO/RTO, export expiry, purge, recovery concurrency and capacity budgets.

## Current Outcome

No-Go. The Gate 0 candidate is reviewable, but no Cloud residency policy, region tuple, complete data inventory, production backup/restore, cross-region drill, deletion evidence or recovery implementation exists. Static tests will only prove the candidate remains disabled and internally consistent.

## Human Approval Required

- SDKWork Product, Agents, Kernel and Sandbox architecture owners
- IAM and Region Registry owners
- Drive/Storage and Database owners
- Security/Privacy, Reliability, Capacity and Operations owners
