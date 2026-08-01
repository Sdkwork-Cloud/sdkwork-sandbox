# REQ-2026-0026: Sandbox Cloud Data Residency And Recovery

Status: draft

Owner: SDKWork Runtime Platform

Source: customer

Priority: P0

Updated: 2026-08-01

Specs: REQUIREMENTS_SPEC.md, ARCHITECTURE_DECISION_SPEC.md, APPLICATION_LAYERED_ARCHITECTURE_SPEC.md, REGION_SPEC.md, CONFIG_SPEC.md, DEPLOYMENT_SPEC.md, DATABASE_SPEC.md, DATABASE_FRAMEWORK_SPEC.md, DRIVE_SPEC.md, SECURITY_SPEC.md, PRIVACY_SPEC.md, OBSERVABILITY_SPEC.md, PERFORMANCE_SPEC.md, RELIABILITY_SPEC.md, TEST_SPEC.md, QUALITY_GATE_SPEC.md

Related: REQ-2026-0008, REQ-2026-0010, REQ-2026-0012, REQ-2026-0013, REQ-2026-0016, REQ-2026-0017, REQ-2026-0018, REQ-2026-0019, REQ-2026-0021, REQ-2026-0022, REQ-2026-0023, REQ-2026-0025

## Problem

Cloud coding needs durable Workspace Revisions, Checkpoints, outputs, logs, caches, backups and recovery across failures. Current Sandbox contracts separate runtime images from mounted data and preserve Agents/Drive ownership, but they do not form one approved Cloud data-residency and recovery claim. A service can keep a VM in one region while storing Checkpoints, logs, backups or support exports elsewhere, or it can fail over to another region without proving authorization, deletion, encryption, tenant isolation or revision consistency.

Cloud geography has several independent dimensions. `regionCode` is the SDKWork market/compliance partition, `providerRegion` is infrastructure placement, `storageRegion` is Drive/object storage geography, and `availabilityZone` is a failure domain. Collapsing them into one field makes residency and disaster-recovery claims unverifiable.

## Goals

- Define an evidence-backed Cloud residency and recovery gate separate from Local device residency.
- Inventory Workspace bytes, Revisions, Checkpoints, outputs/artifacts, logs/audit/events, caches/temp, control state, usage facts and backups/PITR copies.
- Keep ownership cohesive: Agents owns Workspace business state and Revision promotion; Drive or an approved Volume Authority owns bytes; Sandbox owns runtime/control facts; IAM owns Tenant and residency policy; Database/Drive operators own backup and restore mechanisms; Commerce owns billing truth.
- Bind each data class to `regionCode`, `providerRegion`, `storageRegion`, failure domain, encryption/key authority, retention owner, export/delete behavior and recovery objective.
- Make cross-region replication and failover explicit, policy-authorized, auditable and reversible. No region or provider fallback is inferred from availability.
- Define tenant isolation for shared PostgreSQL, Drive, object storage, logs, caches, backups and restore workspaces.
- Require ordered Checkpoint, Revision and runtime recovery so no Sandbox runtime is resumed against an unverified or unauthorized data copy.
- Define export, deletion, legal hold, retention expiry, purge verification, corruption, operator access, incident and support-bundle behavior.
- Preserve value-free Secret handling from REQ-2026-0025 and prevent Secret projection roots from entering Checkpoint, Snapshot or backup data.

## Non-Goals

- Replacing Drive, Volume, PostgreSQL, KMS, backup, replication, IAM, Commerce or regional platform authorities.
- Treating `cloud`, a provider region, an availability zone, a VM placement or a storage bucket label as a residency claim by itself.
- Automatically replicating every Workspace, Checkpoint, log, cache, Secret, output or backup across regions.
- Restoring a Runtime image or Sandbox binding before Workspace/Checkpoint authorization, data integrity, fencing and Secret projection readiness are proven.
- Claiming zero data loss, a fixed RPO/RTO, deletion within an unapproved time, or customer-visible cross-region failover before owner approval and real drills.
- Authorizing an API/SDK, database migration, Drive adapter, backup worker, replication controller, deployment profile, production region, or cross-repository source change.

## Acceptance Criteria

1. The candidate Cloud claim applies only to an explicitly selected Cloud data-residency policy. `cloud`, `providerRegion`, `storageRegion`, availability zone and Sandbox Provider identity are topology facts, not proof of residency or recovery.
2. The inventory contains at least: Workspace source bytes; Agents Workspace/Project/Session/Revision business state; durable Checkpoint/Candidate/Handoff bytes; Sandbox lifecycle/binding/operation/control state; Runtime image and immutable artifacts; command/terminal output and generated artifacts; logs, audit, events and support diagnostics; cache/temp/scratch; usage facts; database backups/WAL/PITR; Drive/object-store versions; and disaster-recovery copies.
3. Each class has exactly one write authority, data classification, tenant scope, `regionCode`, `providerRegion`, `storageRegion`, failure domain, encryption/key authority, retention policy, legal-hold behavior, export behavior, delete/purge behavior, backup inclusion, restore owner and recovery objective. Unknown or conflicting metadata fails closed.
4. Agents remains the authority for Workspace business state, Revision authorization and promotion. Drive or the approved Volume Authority remains the authority for Workspace/Checkpoint bytes. Sandbox stores only its lifecycle/control facts and runtime binding references; it does not copy Workspace or become a Checkpoint repository.
5. Kernel Execution Placement and Sandbox Capacity Placement remain separate. A recovered placement is not valid until the current Kernel generation, Sandbox fencing, Tenant policy, Workspace Revision and data-region bindings are revalidated.
6. The residency tuple is explicit and immutable for a transaction: `regionCode`, allowed `providerRegion` set, allowed `storageRegion` set, failure-domain policy, processing-region set, replication policy and residency revision. A caller cannot widen it through a mount, Provider, log, cache, backup or support request.
7. Primary Workspace/Checkpoint bytes, authoritative PostgreSQL state and required logs reside only in approved regions and storage classes for the Tenant policy. Cross-region copies require an explicit disaster-recovery grant, destination allowlist, purpose, retention, encryption/key policy, audit and deletion linkage.
8. Cross-region replication is asynchronous or synchronous only when the approved policy says so. Replication must preserve Tenant/Workspace/Revision identity, encryption context, region metadata, deletion tombstones and legal holds. A stale or partial replica is never promoted as current without integrity, revision, fencing and authorization checks.
9. Runtime images and immutable artifacts are separate from persistent data. A runtime image may be replicated only through the signed Artifact contract; it cannot carry Workspace, Checkpoint, Secret, tenant cache or log content.
10. Output/artifact, log/audit/event, cache/temp and usage data have independent retention and export/delete policy. Sensitive terminal/command content is encrypted when retained, excluded from ordinary telemetry, and never copied into low-cardinality metrics or support bundles. Rebuildable cache is not authoritative recovery data.
11. Secret projection roots and Secret values are excluded from Workspace, Checkpoint, Snapshot, backup, replication, cache, logs, support bundles and Runtime Pool templates. Recovery requires a new authorized Secret grant under REQ-2026-0025; persisted raw grants or values cannot be replayed.
12. PostgreSQL backups use approved database-aware base/WAL/PITR procedures, protected credentials and encrypted storage. Drive/Volume backups use their owner’s immutable version and retention semantics. Backup metadata does not expose provider object keys, signed URLs, credentials, raw Workspace content or Secret material.
13. Restore is isolated from production, integrity-verified, region-policy checked, tenant-scoped and non-destructive until an owner-authorized cutover. A restore drill must prove Workspace/Revision/Checkpoint consistency, Sandbox state rebuild or quarantine, Kernel/Sandbox fencing renewal, Secret exclusion and no cross-Tenant residue.
14. Recovery order is fixed: establish approved region and control-plane authority; restore IAM/residency policy; restore Agents/Drive Workspace metadata and bytes; verify Revision/Checkpoint integrity; restore Sandbox control facts or rebuild them; create fresh Kernel and Sandbox placement/fencing; attach fresh data grants; then start Provider runtime. No runtime resumes from a stale or unknown copy.
15. Export is Tenant-authorized, scope-bounded, region-aware, time-limited and auditable. It includes declared primary and derived data classes but excludes Secret values and infrastructure/provider credentials. Download grants are short-lived and Drive-owned.
16. Delete/purge enumerates primary data, Checkpoints, outputs, logs, caches, temporary copies, backups, replicas, search/index projections, export bundles and tombstones. Deletion honors legal holds and retention, is resumable, records failures, and cannot claim completion while any required class is unknown or unreachable.
17. Tenant isolation uses independent authorization, encryption context/key scope, namespaces, database roles/RLS or equivalent, bounded backup/restore access, and residue verification. Shared physical infrastructure does not imply shared logical data. Cross-Tenant reads, restore selection, cache keys, export bundles and support diagnostics fail closed.
18. Operator and support access is least privilege, time-bound, region-scoped and audited. Support bundles contain value-free diagnostics only; raw Workspace, output, Secret, signed grant, object key, database URL and infrastructure identity are excluded by default.
19. Region or storage authority outage, replication lag, backup failure, PITR gap, checksum mismatch, corruption, deletion uncertainty, policy mismatch or unknown location fails closed. The system does not silently switch region, storage authority, Provider, Local lane or weaker retention.
20. Exact retention, replication lag, backup frequency, PITR window, RPO, RTO, export expiry, purge completion, support access, cache lifetime and recovery concurrency bounds require Product, Privacy, Storage/Drive, Database, Reliability, Security and Operations approval. Unbounded values are forbidden.
21. Real evidence proves primary and replica region binding, cross-region policy enforcement, tenant isolation, revision/checkpoint recovery, PITR restore, corruption and lag handling, export/delete including derived copies, legal hold, operator audit, support-bundle redaction, region outage, control-plane restart, node loss, runtime rebuild, Secret exclusion and high-concurrency recovery.

## Non-Functional Requirements

| Area | Required outcome |
| --- | --- |
| Security | Region-bound authorization, tenant isolation, encryption/key separation, least-privilege restore/export, fresh fencing and no fallback on uncertainty. |
| Privacy | Complete Cloud data inventory, explicit residency/processing/retention/export/delete, cross-region disclosure and no Secret or raw content in diagnostics. |
| Reliability | Ordered restore, immutable revisions/checkpoints, PITR and replica integrity, deterministic quarantine, bounded replay and no stale runtime resume. |
| Performance | Recovery, replication, export, purge and checkpoint operations have finite owner-approved budgets and do not consume unbounded Sandbox capacity. |
| Operability | Region/replica/backup/restore health, lag, policy mismatch and deletion state are observable with low-cardinality, value-free labels and actionable runbooks. |

## Affected Surfaces

- Agents Workspace/Revision/Checkpoint authorization and promotion
- Drive or approved Volume Authority Workspace/Checkpoint bytes, versions, grants and deletion
- Sandbox Runtime Transaction, lifecycle/control state, attachments, output/log/cache boundaries and pool eligibility
- Kernel Execution Placement generation and recovery handoff
- IAM Tenant/residency policy and region registry
- PostgreSQL backup/PITR, Drive/object backup, replication, restore and purge operations
- Cloud control plane, Node/Provider placement, observability, support and release evidence

## Traceability

- [ADR-20260801](../../architecture/decisions/ADR-20260801-sandbox-cloud-data-residency-and-recovery.md)
- [Architecture and recovery review](../../engineering/reviews/REVIEW-20260801-sandbox-cloud-data-residency-and-recovery.md)
- [Machine contract](../../../specs/sandbox-cloud-data-residency.contract.json)
- [Workspace Runtime Transaction](REQ-2026-0021-sandbox-workspace-runtime-transaction-and-checkpoint.md)
- [Standalone data residency](REQ-2026-0022-sandbox-standalone-data-residency-and-recovery.md)
- [Runtime Secret Projection](REQ-2026-0025-sandbox-runtime-secret-projection.md)

## Implementation Gate

This requirement remains `draft`. It does not authorize a region, storage/Drive adapter, replication, backup/PITR worker, restore controller, purge worker, database migration, API/SDK, config, deployment, Provider, Service Host, Kernel, Agents or BirdCoder source change. Implementation begins only after this requirement and ADR/review are ready, region/storage authorities are named, exact data inventory/retention/RPO/RTO/replication/delete values are approved, dependent Workspace/Control Plane/Secret/Provider gates authorize implementation, and real multi-region recovery environments are assigned.
