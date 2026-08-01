# ADR-20260801: Sandbox Cloud Data Residency And Recovery

Status: proposed

Requirement: [REQ-2026-0026](../../product/requirements/REQ-2026-0026-sandbox-cloud-data-residency-and-recovery.md)

Owner: SDKWork Runtime Platform

Date: 2026-08-01

Deciders: Product, Sandbox, Agents, Kernel, IAM, Drive/Storage, Database, Security/Privacy, Reliability and Operations owners

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `APPLICATION_LAYERED_ARCHITECTURE_SPEC.md`, `REGION_SPEC.md`, `DEPLOYMENT_SPEC.md`, `DATABASE_SPEC.md`, `DRIVE_SPEC.md`, `SECURITY_SPEC.md`, `PRIVACY_SPEC.md`, `OBSERVABILITY_SPEC.md`, `PERFORMANCE_SPEC.md`, `TEST_SPEC.md`

## Context

Cloud runtime isolation is not a data-residency or recovery guarantee. Workspace bytes may be in Drive, Checkpoints in a Volume Authority, control state in PostgreSQL, outputs in temporary object storage, logs in an operations region, and backups in a separate disaster-recovery account. A VM can be correctly isolated while the overall SaaS data contract remains false or unrecoverable.

## Decision

1. Introduce a Cloud-only data-residency and recovery Gate. It is a cross-authority evidence composition, not a new Sandbox storage owner.
2. Keep the region layers distinct: `regionCode` for SDKWork market/compliance, `providerRegion` for infrastructure, `storageRegion` for Drive/storage and `availabilityZone` for failure domain. A residency tuple records all applicable layers and policy revisions.
3. Agents owns Workspace business state, Revision authorization and promotion. Drive or an approved Volume Authority owns Workspace/Checkpoint bytes and versioned grants. Sandbox owns lifecycle/control facts and runtime attachments. IAM owns Tenant and residency policy. Database/Drive operators own backup/recovery mechanisms.
4. Every data class declares one write authority, location tuple, encryption/key authority, retention, legal hold, export/delete, backup and recovery policy. Unknown metadata blocks readiness.
5. Primary and disaster-recovery copies are separate resources. Cross-region replication requires an explicit policy/grant, destination allowlist, encryption context, retention, deletion linkage and audit. There is no implicit region, Provider, storage or Local fallback.
6. Recovery promotes only an integrity-verified, policy-approved Workspace/Revision/Checkpoint copy. Sandbox runtime is recreated with fresh Kernel/Sandbox placement generation, fencing, mounts and Secret grants; persisted runtime bindings are not blindly resumed.
7. Restore occurs in an isolated target and remains non-destructive until an owner-authorized cutover. Checkpoint/Revision consistency and tenant boundaries are verified before capacity is allocated.
8. Output, logs, audit/events, cache/temp, usage and backup data have separate retention and deletion paths. Sensitive content is encrypted when retained and excluded from ordinary telemetry/support bundles.
9. Secret projection roots are excluded from all persistent and replicated data. Cloud recovery requires a newly authorized Secret grant under REQ-2026-0025.
10. Export and purge cover primary, derived, replica and backup copies, with legal hold and failure visibility. A successful backup is not recovery evidence without a verified restore; a purge request is not completion while required classes remain unknown.
11. Product claims are scoped to the exact region, storage, processing, retention, RPO/RTO and recovery evidence. Exact values remain owner decisions.

## Alternatives

### Treat Provider Region As Residency

Rejected because Workspace, Checkpoint, logs, cache, backups and processing may use different locations.

### Let Sandbox Own All Cloud Bytes

Rejected because it duplicates Drive/Agents authority and couples execution lifecycle to durable Workspace semantics.

### Replicate Everything To A Global Backup Region

Rejected because it silently changes data residency, retention and deletion obligations.

### Resume A Runtime From A Restored Binding

Rejected because the binding may carry stale fencing, mounts, Secret grants, node identity or revision state.

### Claim Zero RPO Or Fixed RTO Before Drills

Rejected because availability and recovery targets require measured, profile-specific evidence.

## Consequences

- Cloud commercial claims become data-class and region specific rather than VM-centric.
- Drive/Volume, PostgreSQL, IAM, Sandbox and Kernel retain cohesive ownership.
- Cross-region disaster recovery requires explicit policy and can increase cost and recovery latency.
- Recovery is safer but may quarantine capacity until integrity, fencing and residency checks complete.
- Backup, export, purge and support operations become release-critical rather than incidental infrastructure tasks.

## Verification

- Static tests validate region layers, data inventory, ownership, recovery order, retention/delete policy, tenant isolation, Secret exclusion and no-implementation gates.
- Future real multi-region evidence runs PostgreSQL/Drive backup and restore, replica lag, region outage, PITR, corruption, tenant isolation, export/purge and runtime rebuild drills.
- Cross-repository tests prove Agents/Drive remain Workspace/Checkpoint authorities and Sandbox never resumes a stale or unauthorized data copy.

## Implementation Boundary

This proposed ADR does not authorize a region choice, storage/Drive adapter, replication, backup/PITR, restore/purge implementation, API/SDK, config, deployment, Provider, Service Host, Kernel, Agents, BirdCoder or cross-repository source change.
