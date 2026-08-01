# ADR-20260801: Sandbox Cross-Repository Version Compatibility And Release Set

Status: proposed

Requirement: [REQ-2026-0027](../../product/requirements/REQ-2026-0027-sandbox-cross-repository-version-compatibility.md)

Owner: SDKWork Runtime Platform

Date: 2026-08-01

Deciders: Product, BirdCoder, Agents, Kernel, Sandbox, Drive/Storage, RPC/SDK, Release, Security, Reliability and Operations owners

Specs: `ARCHITECTURE_DECISION_SPEC.md`, `RELEASE_SPEC.md`, `MIGRATION_SPEC.md`, `SDK_SPEC.md`, `SDK_WORKSPACE_GENERATION_SPEC.md`, `RPC_SPEC.md`, `RPC_RESILIENCE_SPEC.md`, `DISCOVERY_SPEC.md`, `DEPLOYMENT_SPEC.md`, `SUPPLY_CHAIN_SECURITY_SPEC.md`, `TEST_SPEC.md`

## Context

Four repositories and several generated/artifact authorities must evolve together. SemVer, a Git tag or a container label cannot express whether a particular BirdCoder client is safe with an Agents execution intent, Kernel placement adapter, Sandbox control plane, Workspace/Checkpoint schema, Secret grant policy, Cloud residency policy and Firecracker guest tuple. Rolling changes also need drain and rollback semantics that respect active runtime transactions and data migrations.

## Decision

1. Introduce a candidate immutable `SandboxCrossRepositoryReleaseSet` as the release correlation authority. It references, but does not replace, canonical source, RPC/Proto, SDK, Workspace/Storage, artifact and deployment authorities.
2. Pin immutable commit/digest identities for BirdCoder, Agents, Kernel, Sandbox, Workspace/Storage, generated SDK/proto inputs and outputs, runtime config schema, and Local/Firecracker artifacts. Branches, mutable tags, latest aliases and local patches are not release identity.
3. Maintain a compatibility matrix across semantic domain, wire/RPC, SDK client, data/schema, artifact/guest protocol, config, residency, Secret and assurance versions. Unknown, expired or revoked edges fail closed.
4. Require peer advertisement and verification before placement, mount, Secret projection, Command/Terminal attach, stream, checkpoint or recovery. Release-set correlation does not merge Kernel/Sandbox records, leases, fencing, idempotency scopes or reconcilers.
5. Publish through preflight, signed/integrity-protected metadata, staged rollout, bounded overlap and drain. Incompatible changes stop new placement, drain active transactions through freeze/checkpoint/cancel policy, and quarantine uncertain capacity.
6. Rollback chooses a previous approved immutable set and checks data/schema, Workspace/Checkpoint, Secret, residency, RPC/SDK, artifact and active-transaction compatibility. Downgrade is denied unless an explicit migration/recovery plan proves safe consumption.
7. Hotfixes are immutable child sets with scope, evidence and replacement relations; no published set is mutated.
8. Support windows define minimum supported peers, deprecation, security-fix overlap, migration deadline, rollback horizon and expiry outcome. No silent weaker assurance or protocol downgrade.

## Alternatives

### Use One Shared SemVer

Rejected because independent domain, wire, data, artifact, residency and Secret compatibility do not move in lockstep.

### Trust Git Tags Or Container Tags

Rejected because tags and aliases can move and do not bind generated SDK/proto, storage schema or artifact evidence.

### Allow Runtime Negotiation To The Newest Common Subset

Rejected because “common” can silently weaken assurance, Secret policy, fencing or residency.

### Roll Back Only The Sandbox Binary

Rejected because Workspace/Checkpoint data, migrations, SDK/RPC skew and artifact tuples may remain newer.

### Keep Old Peers Forever

Rejected because unbounded support multiplies test/security/operations surface and prevents safe schema evolution.

## Consequences

- Commercial release identity is auditable across all participating repositories and artifacts.
- Release engineering must maintain a compatibility matrix and signed evidence bundle.
- Rollouts may pause or quarantine capacity during drain, migration or unknown skew.
- Some upgrades require forward-fix rather than binary rollback; downgrade remains exceptional.
- Standalone and Cloud can share semantics without sharing deployment or artifact claims.

## Verification

- Static tests validate immutable identities, canonical authority references, matrix closure, no downgrade/fallback, lane separation, support windows and no-implementation gates.
- Future mixed-version conformance runs standalone and Cloud control/node lanes with real RPC/SDK, Workspace/Checkpoint, Secret, residency, artifact, migration, drain, rollback and high-concurrency evidence.

## Implementation Boundary

This proposed ADR does not authorize a release set registry, version/tag, generated SDK/proto, discovery metadata, migration, deployment, artifact publication, rollout/drain worker, API/SDK, Provider, Service Host, Kernel, Agents, BirdCoder or cross-repository source change.
