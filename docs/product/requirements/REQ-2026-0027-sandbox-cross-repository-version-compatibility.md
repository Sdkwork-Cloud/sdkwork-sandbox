# REQ-2026-0027: Sandbox Cross-Repository Version Compatibility And Release Set

Status: draft

Owner: SDKWork Runtime Platform

Source: customer

Priority: P0

Updated: 2026-08-01

Specs: REQUIREMENTS_SPEC.md, ARCHITECTURE_DECISION_SPEC.md, RELEASE_SPEC.md, MIGRATION_SPEC.md, SDK_SPEC.md, SDK_WORKSPACE_GENERATION_SPEC.md, RPC_SPEC.md, RPC_RESILIENCE_SPEC.md, DISCOVERY_SPEC.md, DEPLOYMENT_SPEC.md, SUPPLY_CHAIN_SECURITY_SPEC.md, SECURITY_SPEC.md, PERFORMANCE_SPEC.md, TEST_SPEC.md, QUALITY_GATE_SPEC.md

Related: REQ-2026-0008, REQ-2026-0009, REQ-2026-0012, REQ-2026-0017, REQ-2026-0019, REQ-2026-0023, REQ-2026-0024, REQ-2026-0025, REQ-2026-0026

## Problem

The commercial coding path spans `sdkwork-birdcoder`, `sdkwork-agents`, `sdkwork-kernel`, `sdkwork-sandbox`, generated App/Backend/RPC SDKs, Workspace/Drive or Volume contracts, and immutable Local/Firecracker artifacts. Independent repository releases can compile while disagreeing on Execution Intent, Workspace Revision, Runtime Capability, fencing, Secret grant, Cloud data residency, RPC wire version, or artifact tuple. A mutable branch, tag, image label or generated SDK cache is not a safe release authority.

Without one immutable revision set, rolling upgrades can create dual placement authorities, stale clients, incompatible Checkpoint data, unsafe retries, Secret audience mismatch, or a Provider assurance downgrade. Rollback also cannot be treated as a binary swap when database/Drive migrations, Workspace revisions, generated SDKs, runtime artifacts and data residency policy have different compatibility windows.

## Goals

- Define one release-owned immutable revision set binding BirdCoder, Agents, Kernel, Sandbox, Workspace/Storage, internal RPC/Proto, generated SDKs, runtime config schema, and Local/Firecracker artifact tuples.
- Separate semantic contract versions, wire/API/SDK versions, persistence/data versions, artifact versions, and deployment profile versions while recording the compatibility matrix between them.
- Require source revision, dependency lock, generated SDK/proto inputs, artifact digests, SBOM, provenance, signature, migration and evidence references for every published set.
- Define preflight compatibility, rollout, drain, upgrade, rollback, downgrade, hotfix, deprecation and support-window behavior for standalone and cloud lanes.
- Preserve forward/backward compatibility only where explicitly approved; unknown versions, stale manifests and silent protocol/assurance downgrades fail closed.
- Keep Local and Cloud lanes independently verifiable while sharing domain semantics; a Cloud artifact or generated SDK cannot silently become a Local fallback.
- Make release claims traceable to the exact four-repository revisions and real evidence bundle used to validate them.

## Non-Goals

- Publishing a production version, choosing a SemVer, creating a tag, changing sibling repositories, generating SDK output, or creating deployment artifacts in this Gate 0 task.
- Treating Git branches, mutable tags, package latest aliases, container tags, unpinned dependency ranges or local build output as release identity.
- Allowing a runtime to negotiate a weaker Isolation Assurance, Secret policy, residency policy, authentication mode, fencing generation or data contract to remain available.
- Defining business API/SDK endpoints, Provider mechanisms, database migrations, deployment profiles, support SLAs or customer pricing.
- Claiming that source compatibility alone proves runtime compatibility, recovery, security, performance or commercial readiness.

## Acceptance Criteria

1. The candidate `SandboxCrossRepositoryReleaseSet` is owned by the release authority and references immutable commit/digest identities for BirdCoder, Agents, Kernel, Sandbox, Workspace/Storage, RPC/Proto contracts, generated SDK inputs/outputs, runtime config schema, and each Local/Firecracker artifact tuple.
2. A release set has a unique non-secret identity, parent/replaces relation, release lane (`standalone-local`, `cloud-control-plane`, `cloud-node`, `client-runtime-configurable`), target architecture, contract versions, schema/migration versions, artifact manifest versions, evidence bundle, publication state and support window.
3. Source commits, generated SDKs, RPC/proto descriptors, Workspace/Checkpoint contract, Secret Projection contract, Cloud Data Residency contract, artifact digests, SBOM/provenance and deployment config schema are all resolved from their canonical authorities. Hand-edited generated SDK output, mutable aliases and undeclared local patches are rejected.
4. Compatibility is evaluated across semantic domain contract, RPC wire, SDK client, database/Drive schema, artifact/guest protocol, config, residency policy and assurance level. Each edge declares `same`, `forward`, `backward`, `migration-required` or `incompatible`; unknown edges fail closed.
5. A client or node must advertise its release-set identity, contract versions, capability versions, supported profile, architecture and minimum/maximum compatible peer before accepting work. Runtime compatibility checks occur before placement, mount, Secret projection, Command/Terminal attach or data recovery.
6. Unsupported or expired release sets, stale discovery metadata, mismatched generation, revoked artifact digest, missing generated SDK provenance, schema drift or unknown compatibility state reject traffic without silent downgrade.
7. The immutable set pins both Kernel Execution Placement and Sandbox Capacity Placement semantics while keeping their records, leases, fencing, idempotency and reconcilers independent. Cross-repository correlation does not merge authorities.
8. Rollout uses staged publication, preflight conformance, drain and bounded overlap. New nodes stop receiving work before incompatible control-plane/schema/artifact changes; active Workspace Runtime Transactions either finish within approved bounds or follow explicit freeze/checkpoint/cancel compensation.
9. Upgrade compatibility windows are explicit per lane and component. An old client may continue only when the matrix proves safe read/write/stream/retry/Secret/residency behavior. Terminal/Command, Secret Projection, Checkpoint and recovery contracts cannot be assumed compatible from a shared version number.
10. Rollback selects a previously approved immutable release set and artifact digest, never a mutable alias. Rollback preflight checks database/Drive migration reversibility or an approved forward-fix, Workspace/Checkpoint compatibility, Secret grant version, RPC/SDK skew, residency policy, node/artifact health and active transaction drain.
11. Downgrade is denied by default. It requires a reviewed migration/recovery plan, supported data/schema window, explicit operator approval and evidence that no newer-only Workspace/Checkpoint/Secret/Runtime state can be consumed by the target set.
12. Hotfixes create a new immutable child set with narrowed scope, security/release evidence and explicit replacement/rollback relation. They cannot mutate a published set or bypass compatibility checks.
13. Discovery and rollout metadata are signed or integrity-protected, bounded, region/profile scoped and free of secrets, raw tokens, host paths, Provider-private details and tenant content. Static endpoint or package fallback is forbidden in Cloud.
14. Support windows define minimum supported client/node/control-plane/SDK versions, deprecation notice, security-fix overlap, migration deadline, rollback horizon and end-of-support behavior. Expired peers fail with a safe upgrade-required outcome rather than negotiating weaker assurance.
15. Release evidence includes reproducible commands, source/dependency lock, generated SDK/proto provenance, artifact signatures/digests/SBOM, migration/rollback plan, conformance/load/recovery/security results, region/residency/Secret/Pool gates, rollout/drain logs and human approvals.
16. Real evidence proves mixed-version standalone and Cloud matrices, RPC/SDK skew, duplicate/reordered/cancelled delivery, Terminal/Command streams, Secret grants, Checkpoint/recovery, data residency, artifact revocation, node drain, control-plane restart, rollback/downgrade denial, support-window expiry and high-concurrency upgrade.

## Non-Functional Requirements

| Area | Required outcome |
| --- | --- |
| Security | Immutable signed identity, no silent downgrade, peer/auth/fence checks before work, artifact revocation, least-privilege rollout and auditable approvals. |
| Reliability | Bounded drain/overlap, deterministic retry and reconciliation, migration-safe rollback/forward-fix and no stale transaction or data resume. |
| Compatibility | Explicit matrix across domain, RPC, SDK, data, artifacts, config, residency, Secret and assurance; unknown edges fail closed. |
| Operability | Release-set inventory, skew dashboards, drain/quarantine controls, upgrade-required outcomes, support window alerts and rollback runbooks. |
| Performance | Preflight, drain, migration, recovery and skew checks have finite owner-approved budgets and do not overload the Sandbox capacity plane. |

## Affected Surfaces

- BirdCoder client/runtime-configurable release and generated Agents App SDK
- Agents execution intent, Workspace Revision/Checkpoint and orchestration contracts
- Kernel placement, RPC client, fencing, retry and compatibility adapter
- Sandbox control plane, Provider/Node/Pool artifact tuples, Service Host and runtime config
- Workspace/Drive/Volume schema and generated SDK/proto authorities
- Release, discovery, migration, rollout/drain, support and rollback operations

## Traceability

- [ADR-20260801](../../architecture/decisions/ADR-20260801-sandbox-cross-repository-version-compatibility.md)
- [Compatibility and release review](../../engineering/reviews/REVIEW-20260801-sandbox-cross-repository-version-compatibility.md)
- [Machine contract](../../../specs/sandbox-cross-repository-version-compatibility.contract.json)
- [Internal control plane](REQ-2026-0023-sandbox-internal-control-plane.md)
- [Runtime Secret Projection](REQ-2026-0025-sandbox-runtime-secret-projection.md)
- [Cloud Data Residency/Recovery](REQ-2026-0026-sandbox-cloud-data-residency-and-recovery.md)

## Implementation Gate

This requirement remains `draft`. It does not authorize a release version/tag, generated SDK/proto output, compatibility registry, discovery metadata, migration, deployment, runtime config, artifact publication, rollout worker, drain controller, API/SDK, Provider, Service Host, Kernel, Agents, BirdCoder or cross-repository source change. Implementation starts only after the requirement and ADR/review are ready, release authority and component owners approve the matrix/support windows, canonical authorities and real evidence environments are assigned, and `implementationAuthorized` changes through the reviewed Gate process.
