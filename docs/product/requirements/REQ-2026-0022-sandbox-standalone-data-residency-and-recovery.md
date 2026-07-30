# REQ-2026-0022: Sandbox Standalone Data Residency And Recovery

Status: draft

Owner: SDKWork Runtime Platform

Source: customer

Priority: P0

Updated: 2026-07-30

Specs: REQUIREMENTS_SPEC.md, ARCHITECTURE_DECISION_SPEC.md, APPLICATION_LAYERED_ARCHITECTURE_SPEC.md, CONFIG_SPEC.md, RUNTIME_DIRECTORY_SPEC.md, DATABASE_SPEC.md, DATABASE_FRAMEWORK_SPEC.md, DEPLOYMENT_SPEC.md, SECURITY_SPEC.md, PRIVACY_SPEC.md, OBSERVABILITY_SPEC.md, RELIABILITY_SPEC.md, TEST_SPEC.md, QUALITY_GATE_SPEC.md

Related: REQ-2026-0003, REQ-2026-0005, REQ-2026-0009, REQ-2026-0010, REQ-2026-0020, REQ-2026-0021

## Problem

BirdCoder must offer a Local coding lane in which Workspace bytes and all SDKWork-owned persisted coding data remain on the developer device by default. `deploymentProfile=standalone` does not prove this claim: the profile also covers customer-private gateways, appliances, single containers and server installs. The end-to-end Workspace Runtime Transaction currently prevents implicit Workspace upload, but it does not inventory or govern every other persisted copy created by BirdCoder, Agents, Kernel and Sandbox.

The four repositories have different authorities and storage roles. BirdCoder owns only bounded device preferences and opaque mount identity; Agents owns Workspace/Project/Session/Revision business records; Kernel owns transient execution state; Sandbox owns lifecycle, binding, operation and cleanup facts; the user-authorized local folder or approved Drive local adapter owns Workspace bytes. Agents and Sandbox server authorities require PostgreSQL, while an embedded native Kernel or BirdCoder client-local store may use SQLite only through a separately declared `client-local` contract. Runtime roots, build caches, logs, secrets, temporary files and Checkpoint candidates also need explicit locality, retention, backup, purge and recovery behavior.

Without one release gate, a build could truthfully keep the Workspace folder local while silently using a remote database, uploading diagnostics, retaining source-derived caches, backing up secrets, confusing uninstall with privacy deletion, or falling back to Cloud after local corruption. That is not an acceptable all-data-local commercial claim.

## Goals

- Define two candidate Local claims: device-local persistence, and strict device-local processing with no content egress.
- Inventory every Local coding data class and assign exactly one authority, persistence role, locality and lifecycle policy.
- Preserve `BirdCoder -> Agents -> Kernel -> Sandbox` without creating a BirdCoder business database or a Sandbox copy of Agents state.
- Keep Workspace, service data, runtime root, cache, logs, secrets and temporary data behind distinct capabilities and lifecycle rules.
- Require explicit user authorization and disclosure for optional synchronization or external model/tool processing.
- Define bounded backup, restore, export, purge, uninstall, corruption, disk-full and crash behavior.
- Make Local Service Host readiness fail closed until the complete cross-repository evidence bundle is approved and present.

## Non-Goals

- Treating every `standalone` deployment as a desktop or device-local deployment.
- Replacing Agents or Sandbox PostgreSQL server authority with SQLite.
- Copying Workspace bytes into Sandbox lifecycle tables, BirdCoder preferences or Kernel runtime tables.
- Deleting a user-selected Workspace as part of Sandbox cleanup, application uninstall or a default reset.
- Authorizing an external model provider, telemetry exporter, Drive synchronization target, backup destination or Cloud failover.
- Defining public API/SDK names, production config, packaging, installer behavior or a deployment manifest.
- Claiming that static contracts prove local storage, no egress, backup recovery or privacy deletion at runtime.

## Acceptance Criteria

1. `standalone` and `local` are topology/provider facts only. A device-local claim requires a separately selected and proven data-residency claim mode; unknown or missing evidence fails closed.
2. The release inventory covers Workspace source, Agents business state, Kernel transient execution state, Sandbox control state, Runtime Root, build/cache data, logs/audit, secrets, temporary/output data, Checkpoint candidates and BirdCoder device preferences/mount identity.
3. Every data class declares classification, owner, persistence role, authoritative status, local root/capability, retention owner, backup inclusion and purge behavior. No class has two write authorities.
4. BirdCoder owns no Workspace/Project/Session/Turn/Task/Revision/Runtime Binding/Pool Claim business table. Its optional local persistence is limited to a declared `client-local` store for bounded device facts.
5. Agents business state and Sandbox authoritative control state use separate local PostgreSQL server authorities for a desktop-local composition; absence or non-local resolution fails closed and never falls back to SQLite or Cloud.
6. Kernel transient state uses either an embedded, device/profile/account-scoped `client-local` SQLite module with an independent manifest and lifecycle, or a local PostgreSQL server authority when composed as a service. Runtime selection cannot silently change the data role.
7. Workspace bytes remain in the user-authorized local folder or approved local Drive capability. Workspace ID never becomes a path, and Sandbox cleanup, reset or uninstall never deletes the Workspace by default.
8. Workspace, service data, Runtime Root, cache, logs, secrets and temp are distinct opened capabilities. No mutable runtime data is written under the source-controlled repository `.sdkwork/` directory.
9. `device-local-persistence` forbids remote durable copies. External model/tool processing or synchronization requires an independent user-authorized grant, declared data categories, destination, retention and revocation; it cannot be inferred from Local mode.
10. `strict-device-local-processing` additionally denies source, prompt, transcript, artifact, secret and diagnostic content egress. Any required external provider makes that claim unavailable rather than weakening it.
11. Backup is local and opt-in by default, integrity-manifested and encrypted when it contains tenant/personal data. Live PostgreSQL uses database-aware backup, SQLite uses its supported online backup/snapshot mechanism, and Workspace plus secrets are excluded unless separately selected. A backup job without a verified restore is not evidence.
12. Export and purge enumerate primary data, checkpoints, logs, caches, temp, derived indexes and backups. Purge is scoped, confirmed, resumable and auditable; failures remain visible. Uninstall is not a privacy purge and preserves Workspace unless the user separately authorizes deletion.
13. Corruption, disk full, missing capability, unavailable local database, failed restore and uncertain purge fail closed without Cloud fallback or silent data loss. Recovery preserves ownership and requires reauthorization of non-transferable Workspace and secret capabilities.
14. Logs, metrics, traces, errors and support bundles exclude source content, prompts, transcripts, raw paths, mount handles, database URLs, credentials and private Provider metadata. Standalone telemetry is disabled by default or uses an explicitly approved privacy-safe opt-in.
15. Real Windows, macOS and Linux evidence proves OS-user/profile/account isolation, no implicit network transfer, local database endpoint/path resolution, restart recovery, backup/restore, purge, uninstall preservation, disk-full/corruption handling and residue absence across all four repositories.

## Non-Functional Requirements

| Area | Required outcome |
| --- | --- |
| Security | Opened capabilities, least privilege, OS-user/profile isolation, protected secrets, encrypted sensitive backup and no local-to-cloud fallback. |
| Privacy | Complete data inventory, explicit purpose/retention/export/delete/residency, no implicit synchronization or telemetry, and honest claim modes. |
| Performance | Local data lifecycle operations are bounded; cleanup and backup do not block command execution without an approved budget. |
| Reliability | Crash, corruption, disk full, restore and partial purge are recoverable or fail closed without lost authoritative data. |
| Operability | Readiness identifies a bounded safe reason category while paths, credentials, source content and private dependency details remain hidden. |

## Affected Surfaces

- `sdkwork-birdcoder` desktop composition, device mount identity, preferences, terminal and release claims
- `sdkwork-agents` standalone business persistence, Workspace/Revision authority, export/purge and optional synchronization
- `sdkwork-kernel` embedded/service runtime persistence, retention and processing egress
- `sdkwork-sandbox` Service Host, Local Provider, lifecycle persistence, Runtime directories, Checkpoint and cleanup
- Drive/local-folder authority, local PostgreSQL, OS secure storage, backup/restore and operator evidence

## Traceability

- [ADR-20260730](../../architecture/decisions/ADR-20260730-sandbox-standalone-data-residency-and-recovery.md)
- [Architecture and privacy review](../../engineering/reviews/REVIEW-20260730-sandbox-standalone-data-residency-and-recovery.md)
- [Machine contract](../../../specs/sandbox-standalone-data-residency.contract.json)
- [Workspace Runtime Transaction](REQ-2026-0021-sandbox-workspace-runtime-transaction-and-checkpoint.md)
- `sdkwork-birdcoder/docs/product/requirements/REQ-2026-0006-hybrid-local-cloud-agent-execution.md` (current candidate, cross-repository owner review required)
- `sdkwork-agents/docs/product/requirements/REQ-2026-0730-hybrid-agent-execution-orchestration.md` (current candidate, cross-repository owner review required)
- `sdkwork-kernel/docs/product/requirements/REQ-2026-0002-distributed-execution-placement-control-plane.md` (current candidate, cross-repository owner review required)

## Implementation Gate

This requirement remains `draft`. It does not authorize a database, migration, Port, runtime directory, backup, purge, telemetry, sync, API/SDK, config, package, installer or cross-repository source change. Implementation starts only after the ADR and review are accepted, every data authority and claim name is approved, affected repository requirements are ready, and `implementationAuthorized` changes through the reviewed Gate process.
