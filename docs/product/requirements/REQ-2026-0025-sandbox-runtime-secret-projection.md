# REQ-2026-0025: Sandbox Runtime Secret Projection

Status: draft

Owner: SDKWork Runtime Platform

Source: customer

Priority: P0

Updated: 2026-08-01

Specs: REQUIREMENTS_SPEC.md, ARCHITECTURE_DECISION_SPEC.md, APPLICATION_LAYERED_ARCHITECTURE_SPEC.md, CONFIG_SPEC.md, RUNTIME_DIRECTORY_SPEC.md, SECURITY_SPEC.md, PRIVACY_SPEC.md, OBSERVABILITY_SPEC.md, PERFORMANCE_SPEC.md, EVENT_SPEC.md, TEST_SPEC.md, QUALITY_GATE_SPEC.md

Related: REQ-2026-0007, REQ-2026-0008, REQ-2026-0009, REQ-2026-0010, REQ-2026-0012, REQ-2026-0014, REQ-2026-0019, REQ-2026-0021, REQ-2026-0022, REQ-2026-0023, REQ-2026-0024

## Problem

Commercial IDE builds need package-registry tokens, source-control credentials, signing material, and other workload Secrets. Current Sandbox Provider, Command, Terminal, Service Host, and Workspace contracts deliberately reject Secret values. Passing raw values through BirdCoder, Agents, Kernel, Sandbox control-plane records, command requests, environment config, or Workspace storage would create cross-tenant disclosure, replay, retention, and recovery risks.

Local and Cloud execution also have different custody. A Local workflow must consume a device-local approved Secret Authority without silently uploading values. A Cloud workflow must consume a region-bound approved Secret Authority through workload identity and an attested projection mechanism. Neither lane may make Sandbox a Secret store or copy Local values to Cloud.

## Goals

- Define a provider-neutral Runtime Secret Projection port that consumes an opaque short-lived grant and never accepts a Secret value in its public contract.
- Preserve the authority chain: Agents owns business use intent, IAM owns principal and Tenant authorization, the approved Secret Authority owns values, versions and grant decisions, Kernel transports only opaque grants, and Sandbox owns bounded projection, revocation response and cleanup.
- Bind every grant to Tenant, Workspace Revision, Runtime Binding, execution audience, Provider assurance, region, target and current fencing.
- Keep projection storage separate from Workspace, Runtime image, Checkpoint, Snapshot, cache, logs, events, ordinary persistence, and shared Runtime Pool templates.
- Support explicit process handle/file projection and a separately approved process-environment exception without ambient inheritance.
- Define rotation, revocation, authority outage, freeze, teardown, zeroization, residue, quarantine, audit, and real-environment evidence.
- State the security claim honestly: the platform prevents unauthorized platform persistence and cross-tenant reuse; it cannot stop authorized tenant code from copying or transforming a Secret after delivery.

## Non-Goals

- Implementing a Secret Manager, Vault, KMS, OS keychain, credential UI, Secret synchronization service, or business Secret-binding model in this repository.
- Sending raw Secret values through BirdCoder, Agents, Kernel, the Sandbox control plane, public API/SDK, database, ordinary configuration, CLI arguments, logs, metrics, traces, audit payloads, Workspace, Checkpoint, Snapshot, cache, or Runtime Pool image.
- Treating a Secret reference, opaque grant, encrypted payload, environment variable, mounted host path, or Provider credential as safe merely because it is not plaintext.
- Automatically synchronizing Local Secrets to Cloud, falling back between Local and Cloud Authorities, or resolving across regions.
- Guaranteeing that authorized tenant code cannot print, encode, copy, persist, or exfiltrate a value it is allowed to consume. Network and output controls remain independent defense-in-depth gates.
- Authorizing a Rust port/type, guest-agent method, Host Broker operation, RPC/API/SDK, persistence, Secret adapter, process projection, config, Service Host, Provider, deployment, or cross-repository implementation.

## Acceptance Criteria

1. The candidate `SandboxRuntimeSecretProjectionPort` is owned by the Sandbox application-service boundary and is independent from Provider lifecycle, Command, Interactive Terminal, Workspace storage, and Secret/KMS mechanisms.
2. Agents owns the authorized business use intent and logical Secret binding; IAM owns principal/Tenant authorization; an approved Secret Authority owns Secret bytes, immutable versions, access policy, grant minting, validation, rotation and revocation; Kernel forwards only opaque grants; Sandbox owns capacity-bound projection lifecycle and cleanup.
3. BirdCoder and Agents never call Sandbox directly. BirdCoder, Agents, Kernel, and the Sandbox control plane never receive a Secret value. The private opaque grant is credential-grade sensitive, is audience-bound, and is not logged, returned, placed in ordinary persistence, or exposed as a public identifier.
4. The grant is minted after Runtime placement facts exist and is bound to Tenant, organization when applicable, Workspace Revision, Workspace Runtime Transaction, Sandbox Session/Binding, Kernel placement generation, Sandbox fencing token, Provider/assurance, attested node or device, deployment lane, region, execution audience, logical target, Secret version policy, purpose, not-before, expiry, nonce, and authority audience.
5. Sandbox trusts only claims validated by the Secret Authority. Caller-supplied target paths, environment keys, Secret references, versions, regions, identities, nodes, Provider allocations, or scopes cannot widen the grant.
6. Local grants are valid only for the approved device-local Secret Authority and opened local capability. Cloud grants are valid only for the approved region-bound Cloud Secret Authority and workload identity. Cross-lane, cross-region, cross-device, cross-Tenant, cross-Binding, and stale-fence reuse fail closed with no fallback or implicit synchronization.
7. Projection targets are resolved from an immutable Runtime-Binding registry. Candidate modes are process-scoped descriptor/handle, protected Runtime tmpfs file, and an explicit process-environment exception. Host paths, Workspace paths, Runtime-image paths, CLI arguments, command strings, ambient environment, login profiles, arbitrary target names, and global process environment are forbidden.
8. Process-environment projection is disabled by default, requires an explicit grant target and platform conformance, applies only to the launched process tree, cannot modify the Sandbox/Provider/Host environment, and cannot be added to an already running process. Rotation requires a new process generation or reviewed restart policy.
9. Terminal and Command requests carry only a logical projection-set reference. Secret projection is independently authorized before process launch. A Terminal does not inherit Command Secrets, a Command does not inherit Terminal Secrets, and reconnect does not replay or remint a grant.
10. Projection lifecycle is explicit: requested, validating, materializing, active, rotating, revoking, released, failed, or quarantined. Every transition validates current Sandbox fencing and grant generation; unknown, expired, revoked, replayed, partially applied, or illegal transitions fail closed.
11. Secret material is fetched only by the approved node/device/guest projection adapter over an authenticated private channel using workload identity or an opened protected handle. The Sandbox control-plane process, database, cache, event worker, and ordinary telemetry never receive the value.
12. Material exists only in bounded zeroizing memory or the protected ephemeral target. It is excluded from Workspace mounts, Checkpoint/Snapshot capture, core dumps, crash reports, support bundles, swap where the platform can enforce it, Runtime templates, shared caches, and persistent volumes.
13. New materialization is atomic: a process observes either no target or one validated complete version. Partial files, mixed versions, permissive ownership/mode, link/mount substitution, target aliasing, and check-then-open races fail closed and trigger cleanup.
14. Rotation uses immutable Secret versions and a monotonic projection generation. Overlap is bounded and explicitly approved. File/handle targets use atomic generation replacement; environment targets require process replacement. The predecessor is revoked and zeroized only after the successor is effective or the operation rolls back safely.
15. Revocation and grant expiry stop new launches immediately, freeze new Secret-consuming actions, terminate or isolate affected processes within an approved bound, remove projection targets, zeroize handles/buffers, run residue verification, and then allow Workspace Checkpoint policy and Runtime release. Revocation cannot claim to erase tenant-created copies.
16. Authority outage never permits a new grant, refresh, rotation, or fallback Authority. An already active projection may live only until its current approved lease expiry; no offline extension is inferred. Expiry response is deterministic, fenced, bounded, and operator-visible.
17. Freeze/checkpoint ordering stops Secret-consuming processes, revokes access, releases and verifies all platform-owned projection targets, and only then permits Checkpoint capture. Cleanup uncertainty quarantines the Runtime Binding and capacity.
18. A Runtime that has observed Secret material never returns to a tenant-neutral Warm/Prepared Pool. Cloud microVMs are destroyed after release; any reusable lower-level host resource passes provider-specific sanitization and residue evidence before re-entry.
19. Audit is split: the Secret Authority records grant/value access, version, rotation and revocation decisions; Sandbox records value-free projection lifecycle, outcome and cleanup facts. Correlation uses a bounded non-secret digest/reference. Raw grant, Secret reference, logical target, path, value, executable arguments, output and high-cardinality Tenant/Workspace identifiers are excluded.
20. Logs, metrics, traces, events, readiness, errors and Debug output are value-free. Known-value exact redaction is defense in depth, not an exfiltration guarantee. Command/Terminal output remains sensitive tenant content and is never copied into ordinary telemetry.
21. Exact grant TTL, authority timeout, cache, overlap, revocation detection, process drain, cleanup, residue, concurrency and retry bounds require Security, Secret Authority, Product, Privacy, Capacity, Reliability and Operations approval; unbounded values are forbidden.
22. Real Local Windows/Linux/macOS and Cloud Firecracker evidence proves authority isolation, attested delivery, target permissions, race resistance, rotation, revocation, expiry, outage, crash/restart, freeze/checkpoint exclusion, pool non-reuse, residue/quarantine, output/telemetry redaction, and cross-Tenant/lane/region/device negative behavior.

## Non-Functional Requirements

| Area | Required outcome |
| --- | --- |
| Security | Opaque audience-bound grants, workload identity, attested target, current fencing, no ambient credentials, atomic projection, bounded revocation, zeroization, and quarantine on uncertainty. |
| Privacy | Secret values and sensitive references never enter ordinary persistence/telemetry; residency follows the selected Authority with no implicit Local/Cloud or cross-region transfer. |
| Performance | Grant validation, materialization, rotation, revocation, cleanup, concurrent projection and Authority outage budgets are finite, owner-approved, load-tested and capacity-accounted. |
| Reliability | Monotonic projection generations, atomic replacement, deterministic expiry/outage behavior, crash reconciliation without persisted grants/values, and cleanup before Checkpoint/reuse. |
| Operability | Value-free health/reason codes, split Authority/Sandbox audit, revocation drills, quarantine workflow, support-safe diagnostics and region/lane readiness. |

## Affected Surfaces

- future Sandbox Runtime Secret Projection application port
- approved Local device Secret Authority and opened capability adapter
- approved Cloud Secret Authority, workload identity, node/guest projection adapter and Firecracker teardown
- Kernel-to-Sandbox opaque-grant handoff and Runtime placement fencing
- Command/Interactive Terminal logical projection-set references
- Workspace Runtime freeze/checkpoint, Runtime Pool eligibility, observability, audit, operations and release evidence

## Traceability

- [ADR-20260801](../../architecture/decisions/ADR-20260801-sandbox-runtime-secret-projection.md)
- [Architecture and security review](../../engineering/reviews/REVIEW-20260801-sandbox-runtime-secret-projection.md)
- [Machine contract](../../../specs/sandbox-runtime-secret-projection.contract.json)
- [Workspace Runtime Transaction](REQ-2026-0021-sandbox-workspace-runtime-transaction-and-checkpoint.md)
- [Standalone data residency](REQ-2026-0022-sandbox-standalone-data-residency-and-recovery.md)

## Implementation Gate

This requirement remains `draft`. Port, grant, projection, mode, state, error, event and audit names are non-public candidates. It does not authorize Secret/KMS/Keychain ownership, a Rust Port/type, Host Broker or guest-agent operation, value transport, process environment/file/handle projection, persistence, cache, RPC/API/SDK, config, Service Host, Provider, deployment, Kernel, Agents, or BirdCoder change. Implementation begins only after the requirement is ready; the ADR and security/privacy/Secret Authority/operations review are approved; exact budgets and supported modes are approved; Local and Cloud Authorities are named; dependent Command/Terminal/Workspace/Provider gates authorize implementation; and real evidence environments are assigned.
