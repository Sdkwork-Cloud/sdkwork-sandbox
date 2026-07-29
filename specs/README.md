# Repository Contracts

Purpose: repository-wide machine contracts spanning more than one Sandbox component.

Owner: SDKWork Runtime Platform maintainers.

`sandbox-provider-delivery-gates.contract.json` is the draft cross-component Gate 0 authority for the Local/Command/Firecracker delivery sequence. It fixes provider-neutral conformance, Local `HostUser` limits, Firecracker `MicroVm` preflight requirements, forbidden fallbacks, and required human review evidence; `implementationAuthorized` remains `false`.

`sandbox-host-isolation-broker.contract.json` is the draft cross-component privileged-host boundary for fixed typed operations, local IPC, short-lived grants, privilege constraints, fencing/idempotency, readiness, safe results, audit, and bounded cleanup. It does not authorize a Broker component, daemon, socket, service unit, privileged operation, or deployment profile.

`sandbox-firecracker-artifact-compatibility.contract.json` is the draft Firecracker Artifact Gate 0 authority for the immutable architecture-specific `SandboxFirecrackerArtifactManifest`, exact artifact roles, release evidence, fail-closed node materialization, revocation, rollback, readiness, and ownership. It does not publish artifacts, authorize runtime downloads or builders, create a Provider/Broker component, or prove `MicroVm` assurance.

`sandbox-workspace-block-device-attachment.contract.json` is the draft Workspace Data-plane Gate 0 authority for Agents/Kernel/Sandbox/Drive-or-storage ownership, the candidate `SandboxWorkspaceBlockDevicePort`, short-lived grants, fencing, encrypted guest-device projection, readiness, bounded sanitization, residue scans, and quarantine. It does not create a Port/Adapter, storage backend, KMS, host device, mount, or `MicroVm` evidence.

`sandbox-firecracker-network-isolation.contract.json` is the draft Firecracker Network Gate 0 authority for provider-neutral `SandboxNetworkPolicyPort` ownership, the L4 `SandboxNetworkIsolationPort` mechanism, `DenyAll`, explicit DNS/egress grants, permanent metadata/host-control-plane/tenant-lateral denial, per-binding namespace/Tap isolation, atomic apply/verify, bounded cleanup, quarantine, and durable audit. It does not create a Port/Adapter, netns, Tap, firewall, DNS proxy, route, runtime configuration, or `MicroVm` evidence.

`sandbox-firecracker-resource-isolation.contract.json` is the draft Firecracker Resource Gate 0 authority for provider-neutral `SandboxResourcePolicyPort` ownership, L4 `SandboxResourceIsolationPort`, exact Firecracker guest shape, per-binding cgroup v2 CPU/memory/PID/IO enforcement, effective-state verification, immutable `SandboxResourceUsageFact`, Commerce ownership separation, bounded release, residue scans, and quarantine. It does not create a Port/Adapter, quota engine, cgroup, Machine Config runtime, usage collector/aggregator, Commerce adapter, or `MicroVm` evidence.

`sandbox-multi-tenant-scheduling.contract.json` is the draft SaaS Admission/Scheduling Gate 0 authority for provider-neutral `SandboxAdmissionPolicyPort`, `SandboxNodeInventoryPort`, `SandboxSchedulerPort`, and `SandboxCapacityReservationPort`; atomic tenant quota and PostgreSQL node-capacity reservation, hard placement filters, tenant-aware fairness, fencing/idempotency, resource-grant binding, bounded recovery, safe telemetry, and privacy boundaries are machine-reviewable. It does not create a Port/Crate, Scheduler, admission engine, database schema, Node Agent/Enrollment, Warm Pool, Provider placement, API/SDK, deployment profile, or Commerce runtime.

`sandbox-node-trust-and-inventory.contract.json` is the draft cloud Node Trust Gate 0 authority for provider-neutral `SandboxNodeEnrollmentPort`, `SandboxNodeAttestationVerificationPort`, `SandboxNodeInventoryPublicationPort`, and `SandboxNodeLifecycleControlPort`; single-use bootstrap, short-lived key-bound mutual identity, authentication/attestation separation, verified inventory, rotation/revocation, drain/quarantine, clone/compromise recovery, scheduler binding, safe telemetry, and privacy boundaries are machine-reviewable. It does not create a Port/Crate, Node Agent, PKI/CA/HSM, attestation verifier, database schema, scheduler/provider integration, API/SDK, service unit, or deployment profile.

`sandbox-quota-and-capacity-persistence.contract.json` is the draft PostgreSQL Quota/Capacity Gate 0 authority for `SandboxTenantQuotaState`, `SandboxAdmissionReservation`, `SandboxNodeCapacityState`, and `SandboxCapacityReservation`; SQL subject alignment, explicit resource columns, global lock order, constraints/CAS/fencing, database time, fail-closed expiry/quarantine, RLS/roles, query plans, PITR/RPO/RTO, and real evidence gates are machine-reviewable. It does not register or create a table, migration, Repository Port/Adapter, Scheduler, API/SDK, runtime, or deployment profile.

Component contracts live beside each crate at `crates/<crate>/specs/component.spec.json`. Future topology, deployment, or composition manifests may be added here only when they are the machine source of truth.

Global standards remain at `../../sdkwork-specs/`; do not copy their bodies into this directory.
